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
     고등학교 생물의 유전 · Ⅱ. 유전자의 발현 - 초기 발생과 혹스 유전자 (단원 60, 6차시)
     성취기준 [12유전02-04] 생물의 발생 과정에서 세포 분화가 유전자 발현 조절 과정을 통해 일어남을 추론할 수 있다.
     ① 관찰: 모계 인자  ② 탐구: 분절 유전자  ③ 모형: 혹스 유전자  ④ 탐구: 돌연변이
     (농도 C(x) = C0 × e^(−x/100 µm) 는 교육용으로 단순화한 모형이에요)
     ========================================================= */
  const S = { mode: 'egg', fade: 0, t: 0 };
  let game = null;
  const ease = SciSim.ease;
  const rr = (x, y, w, h, r) => D.roundRect(x, y, w, h, r);
  const col = (c, a) => C.rgba(c, a);
  const fC = (v) => (Math.round(v * 10) / 10).toFixed(1);

  /* ---------- 모형 수식 ---------- */
  const LAMBDA = 100, THR = 20, EMB_LEN = 500;
  const concAt = (x, c0) => c0 * Math.exp(-x / LAMBDA);
  const boundaryOf = (c0) => LAMBDA * Math.log(c0 / THR);          // 100 ln(100/20) = 161, 100 ln(200/20) = 230
  const B1 = boundaryOf(100), B2 = boundaryOf(200);                 // 160.94, 230.26
  const SHIFT = B2 - B1;                                            // 69.3

  /* ---------- 혹스 유전자 8개 (염색체 위 순서 = 몸의 앞 → 뒤 순서) ---------- */
  const HOX = [
    { id: 'lab', n: 'lab', col: '#0ea5e9', region: '머리 ①', seg: [0, 1] },
    { id: 'pb', n: 'pb', col: '#06b6d4', region: '머리 ②', seg: [1, 2] },
    { id: 'Dfd', n: 'Dfd', col: '#10b981', region: '머리 ③', seg: [2, 3] },
    { id: 'Scr', n: 'Scr', col: '#84cc16', region: '첫째 가슴', seg: [3, 4] },
    { id: 'Antp', n: 'Antp', col: '#eab308', region: '둘째 가슴', seg: [4, 5] },
    { id: 'Ubx', n: 'Ubx', col: '#f97316', region: '셋째 가슴', seg: [5, 6] },
    { id: 'abdA', n: 'abd-A', col: '#ef4444', region: '배 앞쪽', seg: [6, 10] },
    { id: 'AbdB', n: 'Abd-B', col: '#a855f7', region: '배 뒤쪽', seg: [10, 14] },
  ];
  const SEG_UM = EMB_LEN / 14;                                     // 체절 1개 = 약 35.7 µm (체절 14개 단위)
  const zoneUm = (k) => [HOX[k].seg[0] * SEG_UM, HOX[k].seg[1] * SEG_UM];

  /* ---------- 화면 배치 ---------- */
  const EG = PHONE
    ? { x0: 44, w: 400, cy: 106, hh: 34, top: { x: 8, y: 8, w: 464, h: 200 }, gr: { x: 8, y: 216, w: 464, h: 232 }, plot: { y: 246, h: 140 }, lv: { x: 8, y: 456, w: 464, h: 176 } }
    : { x0: 60, w: 500, cy: 128, hh: 46, top: { x: 14, y: 14, w: 772, h: 246 }, gr: { x: 14, y: 268, w: 772, h: 278 }, plot: { y: 312, h: 180 }, lv: { x: 590, y: 24, w: 190, h: 226 } };
  const X = (um) => EG.x0 + um / EMB_LEN * EG.w;
  const plotHeight = () => (PHONE && S.mode === 'thr' ? 190 : EG.plot.h);
  const grHeight = () => (PHONE && S.mode === 'thr' ? 396 : EG.gr.h);
  const UM = (px) => clamp((px - EG.x0) / EG.w * EMB_LEN, 0, EMB_LEN);

  /* ---------- 상태 ---------- */
  S.ep = {
    mother: 0, c0: 100, g: 0, run: false, probe: 100, mark: 100,
    viewedMutant: false, ok100: false, ok200: false,        // ① 농도 읽기
    markOk1: false, calcOk: false, predOk: false, twiceSeen: false, markOk2: false, shiftShown: false,   // ②
    parts: [], acc: 0,
  };
  S.hr = { level: 0, sw: [0, 0, 0, 0, 0] };
  S.hx = { sel: 0, seen: [0, 0, 0, 0, 0, 0, 0, 0], line: 0 };
  S.mu = { view: 0, seen: [1, 0, 0], anp: 0, bx: 0, flash: 0 };

  const bicC0 = () => (S.ep.mother ? 0 : S.ep.c0);
  const frontOf = () => S.ep.g * (EMB_LEN + 80);
  const shownC = (x) => bicC0() * Math.exp(-x / LAMBDA) * clamp((frontOf() - x) / 80, 0, 1);

  function epFert() {
    const e = S.ep; if (e.run || e.g >= 1) return;
    e.run = true; Sound.click(); updateCtl();
  }
  function epReset() {
    const e = S.ep; e.g = 0; e.run = false; e.parts.length = 0; e.acc = 0;
    e.mother = 0; e.c0 = 100; e.probe = 100; $('#epProbe').value = 100;
    e.viewedMutant = false; e.ok100 = false; e.ok200 = false; e.gradDone = false;
    ['inC100', 'inC200'].forEach((id) => { const q = $('#' + id); q.value = ''; q.classList.remove('ok'); });
    updateCtl();
  }
  function epMother(v) {
    const e = S.ep; if (e.mother === v) return;
    e.mother = v; if (v === 1) e.viewedMutant = true;
    e.g = 0; e.run = false; e.parts.length = 0; Sound.click(); updateCtl();
  }
  function setProbe(v) {
    v = clamp(Math.round(v / 10) * 10, 0, 500); S.ep.probe = v; const s = $('#epProbe'); if (+s.value !== v) s.value = v; updateCtl();
  }
  function setMark(v) {
    v = clamp(Math.round(v), 0, 500); S.ep.mark = v; const s = $('#epMark'); if (+s.value !== v) s.value = v;
    S.ep.okT = 0;   // 깃발이 경계 근처에 잠시 머물러야 '표시'로 인정해요 (epThrDraw에서 확인)
    updateCtl();
  }
  function setAmount(c0) {
    const e = S.ep; if (e.c0 === c0) return; e.c0 = c0; if (c0 === 200) e.twiceSeen = true; Sound.click(); updateCtl();
  }

  /* ---------- 공통 그리기: 배아 ---------- */
  function drawEmbryoBody(o) {
    o = o || {};
    const e = S.ep, cy = o.cy != null ? o.cy : EG.cy, hh = o.hh != null ? o.hh : EG.hh;
    const x1 = X(0) - 10, x2 = X(EMB_LEN) + 10;
    // 몸통: 농도에 따라 파랗게
    ctx.save();
    D.shadow(() => {
      const g = ctx.createLinearGradient(X(0), 0, X(EMB_LEN), 0);
      for (let k = 0; k <= 20; k++) { const um = EMB_LEN * k / 20, f = clamp((o.conc ? o.conc(um) : 0) / 100, 0, 1); g.addColorStop(k / 20, C.mix('#fff4d1', '#7aa7f7', Math.pow(f, 0.7) * 0.85)); }
      rr(x1, cy - hh, x2 - x1, hh * 2, hh); ctx.fillStyle = g; ctx.fill();
    }, { blur: 8, y: 3 });
    ctx.strokeStyle = '#b7791f'; ctx.lineWidth = 2.4; rr(x1, cy - hh, x2 - x1, hh * 2, hh); ctx.stroke();
    ctx.restore();
    // 핵: 가장자리에 줄지어 있어요 (모두 같은 유전체). 안쪽 파란 점이 클수록 받은 Bicoid가 많아요.
    const n = PHONE ? 22 : 26;
    for (let side = -1; side <= 1; side += 2) {
      for (let i = 0; i < n; i++) {
        const um = (i + 0.5) / n * EMB_LEN, nx = X(um), ny = cy + side * (hh - 11);
        const f = clamp((o.conc ? o.conc(um) : 0) / 100, 0, 1), on = o.hbOn ? o.hbOn(um) : false;
        D.sphere(nx, ny, PHONE ? 4.8 : 6, on ? '#fca5a5' : '#fffdf5', { outline: on ? '#b91c1c' : '#a16207', outlineWidth: 1.2, gloss: false });
        if (f > 0.02) { ctx.fillStyle = '#1d4ed8'; ctx.beginPath(); ctx.arc(nx, ny, (PHONE ? 4.8 : 6) * Math.sqrt(f) * 0.8, 0, TAU); ctx.fill(); }
      }
    }
  }
  function drawParticles(cy, hh) {
    S.ep.parts.forEach((q) => { D.sphere(X(q.um), cy + q.dy * (hh - 18), PHONE ? 2.2 : 2.8, '#2563eb', { gloss: false }); });
  }
  function drawRuler(y) {
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(X(0), y); ctx.lineTo(X(EMB_LEN), y); ctx.stroke();
    for (let u = 0; u <= 500; u += 100) { ctx.beginPath(); ctx.moveTo(X(u), y); ctx.lineTo(X(u), y + 6); ctx.stroke(); T(X(u), y + 22, u === 500 ? '500 µm' : String(u), L(13.5, 12), '#64748b', 'center', 700); }
  }
  function drawProbeLine(x, y1, y2, label) {
    ctx.save(); ctx.strokeStyle = '#e11d48'; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(x, y1); ctx.lineTo(x, y2); ctx.stroke(); ctx.restore();
    if (label) D.label(x, y1 - 2, label, { bg: '#e11d48', size: L(13, 12) });
  }
  /* ---------- 공통 그리기: 농도 그래프 ---------- */
  function drawGraph(o) {
    const gr = Object.assign({}, EG.gr, { h: grHeight() }), pl = { y: EG.plot.y, h: plotHeight() }, ymax = o.ymax || 100, py = (v) => pl.y + pl.h - clamp(v / ymax, 0, 1) * pl.h;
    panel(gr.x, gr.y, gr.w, gr.h, 16, '#fff');
    TF(gr.x + 16, gr.y + 26, o.title || 'Bicoid 농도 C(x)  (앞끝에서의 거리 x)', EG.w + 20, L(16, 13.5), 11, '#14532d', 'left', 800);
    // 축
    ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1;
    const yt = ymax === 200 ? [0, 50, 100, 150, 200] : [0, 25, 50, 75, 100];
    yt.forEach((v) => { ctx.beginPath(); ctx.moveTo(X(0), py(v)); ctx.lineTo(X(EMB_LEN), py(v)); ctx.stroke(); T(X(0) - 8, py(v) + 4, String(v), L(13, 12), '#64748b', 'right', 700); });
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X(0), pl.y); ctx.lineTo(X(0), pl.y + pl.h); ctx.lineTo(X(EMB_LEN), pl.y + pl.h); ctx.stroke();
    for (let u = 0; u <= 500; u += 100) T(X(u), pl.y + pl.h + 20, String(u), L(13, 12), '#64748b', 'center', 700);
    if (!o.noCaption) T(X(250), pl.y + pl.h + L(42, 40), '앞끝에서의 거리 x (µm)', L(13, 12), '#64748b', 'center', 700);
    // 문턱선
    if (o.thr) {
      ctx.save(); ctx.strokeStyle = '#dc2626'; ctx.lineWidth = 2; ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.moveTo(X(0), py(THR)); ctx.lineTo(X(EMB_LEN), py(THR)); ctx.stroke(); ctx.restore();
      T(X(EMB_LEN) - 4, py(THR) - 6, '문턱 C = 20', L(14, 12.5), '#dc2626', 'right', 800);
    }
    // 곡선들
    (o.curves || []).forEach((c) => {
      ctx.save(); ctx.globalAlpha = c.alpha == null ? 1 : c.alpha;
      ctx.beginPath(); for (let x = 0; x <= 500; x += 4) { const v = c.f(x); if (x === 0) ctx.moveTo(X(x), py(v)); else ctx.lineTo(X(x), py(v)); }
      if (c.fill) { ctx.lineTo(X(500), py(0)); ctx.lineTo(X(0), py(0)); ctx.closePath(); ctx.fillStyle = col(c.color, 0.14); ctx.fill(); ctx.beginPath(); for (let x = 0; x <= 500; x += 4) { const v = c.f(x); if (x === 0) ctx.moveTo(X(x), py(v)); else ctx.lineTo(X(x), py(v)); } }
      ctx.strokeStyle = c.color; ctx.lineWidth = c.w || 3.4; ctx.setLineDash(c.dash || []); ctx.stroke(); ctx.restore();
    });
    return { py, pl, gr };
  }

  /* =========================================================
     ① 모계 인자: bicoid mRNA와 Bicoid 농도 기울기
     ========================================================= */
  function epUpdate(dt, t) {
    const e = S.ep;
    if (e.run && e.g < 1) { e.g = Math.min(1, e.g + dt / 3.4); if (e.g >= 1) { e.run = false; if (!e.mother) e.gradDone = true; Sound.success(); updateCtl(); } }
    // 확산하는 Bicoid 단백질 알갱이: 앞끝에서 만들어져 뒤로 퍼지며 사라져요 (퍼진 거리 평균 100 µm → 농도가 지수적으로 줄어요)
    if (bicC0() > 0 && (e.run || e.g >= 1)) {
      e.acc += dt * (e.g >= 1 ? 26 : 36);
      while (e.acc >= 1 && e.parts.length < 150) {
        e.acc -= 1;
        const u = Math.max(0.02, Math.random());
        e.parts.push({ um: Math.random() * 20, dy: Math.random() * 2 - 1, v: 30 + Math.random() * 60, stop: -LAMBDA * Math.log(u), age: 0 });
      }
      if (e.acc > 3) e.acc = 0;
    }
    for (let i = e.parts.length - 1; i >= 0; i--) {
      const q = e.parts[i]; q.age += dt; q.um += q.v * dt * (RM ? 0 : 1); q.dy = clamp(q.dy + (Math.random() - 0.5) * dt * 3, -1, 1);
      if (q.um >= q.stop || q.um > EMB_LEN - 4) e.parts.splice(i, 1);
    }
    if (bicC0() === 0 && e.parts.length) e.parts.length = 0;
  }
  const LARVA = (kind) => {
    // 14개 체절 : 머리 3 · 가슴 3 · 배 8   (kind 'n' 정상, 'b' bicoid 결함 : 머리 · 가슴이 없고 앞쪽에도 꼬리 구조)
    const a = [];
    for (let i = 0; i < 14; i++) a.push(kind === 'n' ? (i < 3 ? 'h' : i < 6 ? 't' : 'a') : 'a');
    return a;
  };
  const SEGCOL = { h: '#38bdf8', t: '#fbbf24', a: '#c4b5fd' };
  function drawLarva(x, y, len, wid, kind, vertical, active) {
    const seg = LARVA(kind), n = seg.length, sl = len / n;
    ctx.save(); ctx.translate(x, y);
    D.shadow(() => {
      if (vertical) rr(-wid / 2, 0, wid, len, wid / 2.4); else rr(0, -wid / 2, len, wid, wid / 2.4);
      ctx.fillStyle = '#fff'; ctx.fill();
    }, { blur: 5, y: 2 });
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = SEGCOL[seg[i]]; ctx.globalAlpha = i % 2 ? 0.8 : 1;
      if (vertical) ctx.fillRect(-wid / 2 + 2, i * sl + 1, wid - 4, sl - 1); else ctx.fillRect(i * sl + 1, -wid / 2 + 2, sl - 1, wid - 4);
    }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = active ? '#15803d' : '#64748b'; ctx.lineWidth = active ? 3 : 1.8;
    if (vertical) rr(-wid / 2, 0, wid, len, wid / 2.4); else rr(0, -wid / 2, len, wid, wid / 2.4);
    ctx.stroke();
    // 끝 구조 : 머리의 입 갈고리 / 꼬리의 숨구멍
    const tipA = kind === 'n' ? '#0369a1' : '#7c3aed', tipP = '#7c3aed';
    const dot = (px, py, c) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(px, py, 3.4, 0, TAU); ctx.fill(); };
    if (vertical) { dot(-5, 5, tipA); dot(5, 5, tipA); dot(-5, len - 5, tipP); dot(5, len - 5, tipP); } else { dot(5, -5, tipA); dot(5, 5, tipA); dot(len - 5, -5, tipP); dot(len - 5, 5, tipP); }
    ctx.restore();
  }
  function epEggDraw(dt, t) {
    epUpdate(dt, t);
    const e = S.ep, top = EG.top, cy = EG.cy, hh = EG.hh;
    panel(top.x, top.y, top.w, top.h, 16, '#fff');
    TF(top.x + 16, top.y + 26, e.g >= 1 ? (e.mother ? '수정 후에도 Bicoid 단백질이 없어서 기울기가 생기지 않았어요' : '수정 후 : Bicoid 단백질의 농도 기울기가 생겼어요') : e.run ? '수정 후 : Bicoid 단백질이 앞에서 뒤로 퍼지는 중이에요…' : e.mother ? 'bicoid 결함 어미의 알 : bicoid mRNA가 없어요' : '수정 전 난자 : 정보가 한쪽에 치우쳐 있어요', top.w - 32, L(16, 13.5), 11, '#14532d', 'left', 800);
    drawEmbryoBody({ conc: shownC });
    // mRNA: 앞끝 bicoid(초록), 뒤끝 nanos(보라)
    const my = cy;
    if (!e.mother) {
      for (let k = 0; k < 7; k++) { const yy = my - hh + 14 + k * ((hh * 2 - 28) / 6), xx = X(8) + (k % 2) * 6; ctx.strokeStyle = '#16a34a'; ctx.lineWidth = 3; ctx.beginPath(); for (let q = 0; q <= 10; q++) { const px = xx + q * 1.8, py = yy + Math.sin(q * 1.2 + k + t * 4) * 2.2; if (q === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); } ctx.stroke(); }
      D.label(X(0) + L(54, 48), cy - hh - 16, 'bicoid mRNA (앞)', { bg: '#16a34a', size: L(13, 12) });
    } else {
      T(X(0) + L(54, 46), cy - hh - 14, 'bicoid mRNA 없음', L(13.5, 12), '#94a3b8', 'center', 800);
    }
    for (let k = 0; k < 7; k++) { const yy = my - hh + 14 + k * ((hh * 2 - 28) / 6), xx = X(EMB_LEN) - 26 + (k % 2) * 6; ctx.strokeStyle = '#7c3aed'; ctx.lineWidth = 3; ctx.beginPath(); for (let q = 0; q <= 10; q++) { const px = xx + q * 1.8, py = yy + Math.sin(q * 1.2 + k + t * 4) * 2.2; if (q === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); } ctx.stroke(); }
    D.label(X(EMB_LEN) - L(50, 40), cy - hh - 16, 'nanos mRNA (뒤)', { bg: '#7c3aed', size: L(13, 12) });
    drawParticles(cy, hh);
    T(X(0) - 4, cy + hh + L(52, 56), '← 앞 (머리 쪽)', L(13.5, 12), '#475569', 'left', 800);
    T(X(EMB_LEN) + 4, cy + hh + L(52, 56), '뒤 (꼬리 쪽) →', L(13.5, 12), '#475569', 'right', 800);
    drawRuler(cy + hh + L(18, 14));
    drawProbeLine(X(e.probe), cy - hh - 4, cy + hh + L(18, 14), null);
    // 그래프
    const ymax = 100;
    const G = drawGraph({ ymax, curves: [{ f: (x) => shownC(x), color: '#2563eb', fill: true }] });
    const pv = shownC(e.probe), pxx = X(e.probe);
    drawProbeLine(pxx, G.pl.y - 4, G.pl.y + G.pl.h, null);
    D.sphere(pxx, G.py(pv), 6, '#e11d48', { outline: '#fff', outlineWidth: 2 });
    D.label(clamp(pxx + 6, X(0) + 70, X(EMB_LEN) - 70), G.py(pv) - 18, 'x = ' + e.probe + ' µm → C = ' + fC(pv), { bg: '#e11d48', size: L(13.5, 12) });
    // 오른쪽: 어미별 유충
    if (!PHONE) {
      const lv = EG.lv, hx = lv.x + 14;
      T(lv.x + lv.w / 2, lv.y + 8, '알에서 자란 유충', 14, '#14532d', 'center', 800);
      drawLarva(lv.x + 48, lv.y + 26, 140, 40, 'n', true, e.mother === 0);
      drawLarva(lv.x + 142, lv.y + 26, 140, 40, 'b', true, e.mother === 1);
      T(lv.x + 48, lv.y + 188, '정상 어미', 13, '#475569', 'center', 800); T(lv.x + 142, lv.y + 188, 'bicoid 결함', 13, '#475569', 'center', 800);
      T(lv.x + 48, lv.y + 206, '머리·가슴·배', 12, '#0369a1', 'center', 700); T(lv.x + 142, lv.y + 206, '머리·가슴 없음', 12, '#7c3aed', 'center', 700);
      // 오른쪽 아래 : 측정 카드
      const q = { x: 590, y: EG.gr.y + 40, w: 190, h: 220 };
      D.roundRect(q.x, q.y, q.w, q.h, 12); ctx.fillStyle = '#f8fafc'; ctx.fill(); ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1.5; ctx.stroke();
      T(q.x + 12, q.y + 26, '측정 결과', 15, '#14532d', 'left', 800);
      T(q.x + 12, q.y + 56, '위치 x = ' + e.probe + ' µm', 15, '#26324a', 'left', 800);
      T(q.x + 12, q.y + 84, '농도 C = ' + fC(pv), 17, '#2563eb', 'left', 800);
      textBlock(q.x + 12, q.y + 118, q.w - 24, '앞끝(x = 0)에서 C = ' + fC(shownC(0)) + ', 뒤로 갈수록 줄어요.', 13.5, '#475569', 18, 700);
      textBlock(q.x + 12, q.y + 172, q.w - 24, e.g >= 1 ? (e.mother ? '단백질이 없으니 모든 핵이 Bicoid를 받지 못해요.' : '모든 핵은 같은 유전체를 가져요. 받은 Bicoid 양만 달라요.') : '▶ 수정 단추를 눌러 단백질을 만들어요.', 13.5, e.g >= 1 ? '#15803d' : '#94a3b8', 18, 800);
    } else {
      const lv = EG.lv; panel(lv.x, lv.y, lv.w, lv.h, 16, '#fff');
      T(lv.x + 16, lv.y + 26, '알에서 자란 유충', 15, '#14532d', 'left', 800);
      drawLarva(lv.x + 40, lv.y + 70, 190, 34, 'n', false, e.mother === 0); drawLarva(lv.x + 40, lv.y + 132, 190, 34, 'b', false, e.mother === 1);
      TF(lv.x + 244, lv.y + 66, '정상 어미', 140, 13.5, 11, '#475569', 'left', 800); TF(lv.x + 244, lv.y + 84, '머리 · 가슴 · 배', 150, 12.5, 10.5, '#0369a1', 'left', 700);
      TF(lv.x + 244, lv.y + 128, 'bicoid 결함 어미', 160, 13.5, 11, '#475569', 'left', 800); TF(lv.x + 244, lv.y + 146, '머리 · 가슴 없음', 150, 12.5, 10.5, '#7c3aed', 'left', 700);
      TF(lv.x + 244, lv.y + 164, '앞쪽에도 꼬리 구조', 150, 12.5, 10.5, '#7c3aed', 'left', 700);
    }
  }

  /* =========================================================
     ② 분절 유전자: 문턱 20에서 hunchback 켜짐, Bicoid 2배, 유전자 계층
     ========================================================= */
  const bDisp = (c0) => Math.round(boundaryOf(c0));          // 161 / 230
  function epThrDraw(dt, t) {
    epUpdate(dt, t);
    const e = S.ep, top = EG.top, cy = EG.cy, hh = EG.hh, c0 = e.c0, mk = e.mark;
    const okNow = Math.abs(mk - boundaryOf(c0)) <= 4;
    e.okT = okNow ? (e.okT || 0) + dt : 0;
    if (okNow && e.okT >= 0.4) {
      if (c0 === 100 && !e.markOk1) { e.markOk1 = true; Sound.success(); updateCtl(); }
      if (c0 === 200 && !e.markOk2) { e.markOk2 = true; Sound.success(); updateCtl(); }
    }
    panel(top.x, top.y, top.w, top.h, 16, '#fff');
    TF(top.x + 16, top.y + 26, 'hunchback이 켜지는 구역 : C가 20 이상인 곳', top.w - 32, L(16, 13.5), 11, '#14532d', 'left', 800);
    const conc = (um) => concAt(um, c0);
    drawEmbryoBody({ conc, hbOn: (um) => um <= mk });
    // 내가 표시한 구역
    ctx.save(); ctx.globalAlpha = 0.28; ctx.fillStyle = '#ef4444'; rr(X(0) - 10, cy - hh, X(mk) - X(0) + 10, hh * 2, hh); ctx.fill(); ctx.restore();
    T(X(0) + 12, cy + 5, 'hunchback 켜짐', L(14, 12.5), '#b91c1c', 'left', 800, { stroke: '#fff', strokeWidth: 3 });
    // 깃발
    const fx = X(mk);
    ctx.strokeStyle = '#be123c'; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(fx, cy + hh + 6); ctx.lineTo(fx, cy - hh - 22); ctx.stroke();
    ctx.fillStyle = okNow ? '#16a34a' : '#e11d48'; ctx.beginPath(); ctx.moveTo(fx, cy - hh - 22); ctx.lineTo(fx + 30, cy - hh - 14); ctx.lineTo(fx, cy - hh - 6); ctx.closePath(); ctx.fill();
    if (okNow) { D.label(clamp(fx + 38, X(0) + 60, X(EMB_LEN) - 40), cy - hh - 14, '경계 ' + bDisp(c0) + ' µm', { bg: '#16a34a', size: L(13.5, 12), align: 'left' }); }
    T(X(0) - 4, cy + hh + L(52, 56), '← 앞 (머리 쪽)', L(13.5, 12), '#475569', 'left', 800);
    T(X(EMB_LEN) + 4, cy + hh + L(52, 56), '뒤 (꼬리 쪽) →', L(13.5, 12), '#475569', 'right', 800);
    drawRuler(cy + hh + L(18, 14));
    // 그래프 (세로 눈금 0~200으로 1배와 2배를 함께 비교)
    const curves = [];
    if (c0 === 200 || e.twiceSeen) curves.push({ f: (x) => concAt(x, 100), color: '#94a3b8', dash: [6, 5], w: 2.4, alpha: c0 === 200 ? 0.9 : 0 });
    curves.push({ f: (x) => concAt(x, c0), color: c0 === 200 ? '#7c3aed' : '#2563eb', fill: true });
    const G = drawGraph({ ymax: 200, thr: true, noCaption: PHONE, curves, title: 'Bicoid 농도 C(x) · Bicoid 양 ' + (c0 === 200 ? '2배 (C0 = 200)' : '1배 (C0 = 100)') });
    const cv = concAt(mk, c0), mx = X(mk);
    drawProbeLine(mx, G.pl.y - 4, G.pl.y + G.pl.h, null);
    D.sphere(mx, G.py(cv), 6, okNow ? '#16a34a' : '#e11d48', { outline: '#fff', outlineWidth: 2 });
    D.label(clamp(mx + 8, X(0) + 80, X(EMB_LEN) - 80), G.py(cv) - 20, 'x = ' + mk + ' µm → C = ' + fC(cv), { bg: okNow ? '#16a34a' : '#e11d48', size: L(13.5, 12) });
    if (c0 === 200) { T(X(150), G.py(concAt(150, 100)) + 20, '1배', L(13, 12), '#64748b', 'center', 800); }
    // 설명 카드 (오른쪽)
    if (!PHONE) {
      const lv = EG.lv;
      D.roundRect(lv.x, lv.y + 10, lv.w, lv.h - 6, 12); ctx.fillStyle = '#fff7f7'; ctx.fill(); ctx.strokeStyle = '#fecaca'; ctx.lineWidth = 1.5; ctx.stroke();
      T(lv.x + 12, lv.y + 36, '간격 유전자 hunchback', 14.5, '#b91c1c', 'left', 800);
      textBlock(lv.x + 12, lv.y + 62, lv.w - 24, 'Bicoid 농도가 문턱 20 이상인 핵에서만 켜져요.', 13.5, '#475569', 18, 700);
      textBlock(lv.x + 12, lv.y + 118, lv.w - 24, okNow ? '경계 ' + bDisp(c0) + ' µm : 배아 길이 500 µm의 약 ' + (c0 === 100 ? '1/3' : '46 %') + ' 지점이에요.' : '깃발을 C = 20 이 되는 곳에 놓아 봐요.', 13.5, okNow ? '#15803d' : '#94a3b8', 18, 800);
      if (e.markOk1 && e.c0 === 200 && e.markOk2) textBlock(lv.x + 12, lv.y + 176, lv.w - 24, '경계가 약 ' + Math.round(SHIFT) + ' µm 뒤로 옮겨졌어요 (' + bDisp(200) + ' − ' + bDisp(100) + ').', 13.5, '#7c3aed', 18, 800);
      const q = { x: 590, y: EG.gr.y + 40, w: 190, h: 220 };
      D.roundRect(q.x, q.y, q.w, q.h, 12); ctx.fillStyle = '#f8fafc'; ctx.fill(); ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1.5; ctx.stroke();
      T(q.x + 12, q.y + 26, '모형 식', 15, '#14532d', 'left', 800);
      textBlock(q.x + 12, q.y + 52, q.w - 24, 'C(x) = C0 × e^(−x/100 µm)', 14, '#26324a', 18, 800);
      textBlock(q.x + 12, q.y + 92, q.w - 24, 'C = 20 이 되는 x = 100 × ln(C0 / 20) µm', 13.5, '#475569', 18, 700);
      T(q.x + 12, q.y + 146, 'C0 = ' + c0, 15, c0 === 200 ? '#7c3aed' : '#2563eb', 'left', 800);
      T(q.x + 12, q.y + 172, '깃발 C = ' + fC(cv), 15, okNow ? '#15803d' : '#e11d48', 'left', 800);
      T(q.x + 12, q.y + 198, '(ln 5 ≈ 1.61 · ln 10 ≈ 2.30)', 12.5, '#94a3b8', 'left', 700);
    } else {
      const gy = G.pl.y + G.pl.h + 52;
      T(G.gr.x + 16, gy, '모형 식', 14.5, '#14532d', 'left', 800);
      TF(G.gr.x + 16, gy + 24, 'C(x) = C0 × e^(−x/100 µm)', G.gr.w - 28, 14, 11, '#26324a', 'left', 800);
      TF(G.gr.x + 16, gy + 48, 'C = 20 이 되는 x = 100 × ln(C0 / 20) µm', G.gr.w - 28, 14, 11, '#475569', 'left', 800);
      TF(G.gr.x + 16, gy + 72, '(ln 5 ≈ 1.61 · ln 10 ≈ 2.30)', G.gr.w - 28, 13, 10.5, '#94a3b8', 'left', 700);
      TF(G.gr.x + 16, gy + 100, okNow ? '경계 ' + bDisp(c0) + ' µm ✔ (hunchback 켜짐 구역의 끝)' : '깃발을 C = 20 이 되는 곳에 놓아요.', G.gr.w - 28, 14, 11, okNow ? '#15803d' : '#94a3b8', 'left', 800);
    }
  }
  function thrPT() {
    let drag = false;
    const inPlot = (p) => p.x >= X(0) - 16 && p.x <= X(EMB_LEN) + 16 && ((p.y >= EG.top.y + 40 && p.y <= EG.cy + EG.hh + 30) || (p.y >= EG.plot.y - 10 && p.y <= EG.plot.y + plotHeight() + 10));
    return {
      down(p) { if (!inPlot(p)) return false; drag = true; setMark(UM(p.x)); return true; },
      move(p) { if (drag) setMark(UM(p.x)); }, up() { drag = false; },
      hover(p) { return inPlot(p) ? 'ew-resize' : 'default'; },
    };
  }
  function eggPT() {
    let drag = false;
    const inPlot = (p) => p.x >= X(0) - 16 && p.x <= X(EMB_LEN) + 16 && ((p.y >= EG.top.y + 40 && p.y <= EG.cy + EG.hh + 30) || (p.y >= EG.plot.y - 10 && p.y <= EG.plot.y + plotHeight() + 10));
    return {
      down(p) { if (!inPlot(p)) return false; drag = true; setProbe(UM(p.x)); return true; },
      move(p) { if (drag) setProbe(UM(p.x)); }, up() { drag = false; },
      hover(p) { return inPlot(p) ? 'ew-resize' : 'default'; },
    };
  }

  /* ---------- 유전자 계층 ---------- */
  const HRN = [
    { t: '① 모계 인자', s: 'bicoid · 농도 기울기', col: '#2563eb' },
    { t: '② 간격 유전자', s: 'hunchback 등 · 큰 구역', col: '#ef4444' },
    { t: '③ 쌍 규칙 유전자', s: '줄무늬 7개', col: '#f59e0b' },
    { t: '④ 체절 극성 유전자', s: '체절 14개 단위', col: '#16a34a' },
    { t: '⑤ 혹스 유전자', s: '체절 정체성 결정', col: '#a855f7' },
  ];
  const HRG = PHONE
    ? { px: 8, py: 8, pw: 464, ph: 624, x0: 24, w: 432, y0: 78, dy: 112, h: 40, lx: 24, labOn: 'above' }
    : { px: 14, py: 14, pw: 772, ph: 532, x0: 214, w: 540, y0: 76, dy: 92, h: 44, lx: 30, labOn: 'left' };
  const hrX = (um) => HRG.x0 + um / EMB_LEN * HRG.w;
  function hrNext() { if (S.hr.level >= 5) return; S.hr.level++; Sound.click(); updateCtl(); }
  function hrReset() { S.hr = { level: 0, sw: [0, 0, 0, 0, 0] }; updateCtl(); }
  function hrDone() { return S.hr.level >= 5 && S.hr.sw.every((v) => v > 0.97); }
  function hrDraw(dt, t) {
    const h = S.hr;
    for (let i = 0; i < 5; i++) h.sw[i] = approach(h.sw[i], i < h.level ? 1 : 0, dt, 2.2);
    panel(HRG.px, HRG.py, HRG.pw, HRG.ph, 16, '#fff');
    TF(HRG.px + 18, HRG.py + 28, '초파리 배아 : 앞 단계의 산물이 다음 단계의 유전자를 켜요', HRG.pw - 36, L(17, 14.5), 11, '#14532d', 'left', 800);
    for (let i = 0; i < 5; i++) {
      const y = HRG.y0 + i * HRG.dy, s = h.sw[i], n = HRN[i];
      // 이름
      if (HRG.labOn === 'left') { T(HRG.lx, y + 17, n.t, 16, i < h.level ? n.col : '#94a3b8', 'left', 800); TF(HRG.lx, y + 38, n.s, 170, 13, 10.5, '#64748b', 'left', 700); }
      else { T(HRG.lx, y - 10, n.t, 14.5, i < h.level ? n.col : '#94a3b8', 'left', 800); T(HRG.lx + 142, y - 10, n.s, 13, '#64748b', 'left', 700); }
      // 배아 띠
      const x1 = hrX(0), x2 = hrX(EMB_LEN);
      rr(x1, y, x2 - x1, HRG.h, HRG.h / 2); ctx.fillStyle = '#f8fafc'; ctx.fill();
      ctx.save(); rr(x1, y, x2 - x1, HRG.h, HRG.h / 2); ctx.clip();
      if (i === 0 && s > 0) {
        const g = ctx.createLinearGradient(hrX(0), 0, hrX(EMB_LEN), 0);
        for (let k = 0; k <= 10; k++) g.addColorStop(k / 10, C.mix('#fff4d1', '#3b82f6', Math.pow(concAt(k * 50, 100) / 100, 0.7)));
        ctx.fillStyle = g; ctx.fillRect(x1, y, (x2 - x1) * s, HRG.h);
      } else if (i === 1 && s > 0) {
        ctx.globalAlpha = s;
        const gaps = [{ a: 0, b: B1, c: '#ef4444', n: 'hunchback' }, { a: 190, b: 320, c: '#22c55e', n: 'Krüppel' }, { a: 350, b: 450, c: '#a855f7', n: 'knirps' }];
        gaps.forEach((q) => { ctx.fillStyle = col(q.c, 0.75); ctx.fillRect(hrX(q.a), y, hrX(q.b) - hrX(q.a), HRG.h); T((hrX(q.a) + hrX(q.b)) / 2, y + HRG.h / 2 + 5, q.n, L(13, 11.5), '#fff', 'center', 800, { stroke: col(q.c, 1), strokeWidth: 3 }); });
        ctx.globalAlpha = 1;
      } else if (i === 2 && s > 0) {
        for (let k = 0; k < 7; k++) { const a = clamp(s * 8 - k, 0, 1); ctx.fillStyle = col('#f59e0b', 0.85 * a); const um = (k + 0.5) * EMB_LEN / 7; ctx.fillRect(hrX(um - 14), y, hrX(28) - hrX(0), HRG.h); }
      } else if (i === 3 && s > 0) {
        for (let k = 0; k < 14; k++) { const a = clamp(s * 15 - k, 0, 1); ctx.fillStyle = k % 2 ? col('#16a34a', 0.55 * a) : col('#bbf7d0', 0.9 * a); ctx.fillRect(hrX(k * SEG_UM), y, hrX(SEG_UM) - hrX(0), HRG.h); ctx.strokeStyle = col('#166534', 0.5 * a); ctx.lineWidth = 1; ctx.strokeRect(hrX(k * SEG_UM), y, hrX(SEG_UM) - hrX(0), HRG.h); }
      } else if (i === 4 && s > 0) {
        HOX.forEach((g, k) => { const a = clamp(s * 9 - k, 0, 1); const [u1, u2] = zoneUm(k); ctx.fillStyle = col(g.col, 0.85 * a); ctx.fillRect(hrX(u1), y, hrX(u2) - hrX(u1), HRG.h); if (a > 0.5) T((hrX(u1) + hrX(u2)) / 2, y + HRG.h / 2 + 5, g.n, L(12.5, 10.5), '#fff', 'center', 800, { stroke: col(g.col, 1), strokeWidth: 3 }); });
      }
      ctx.restore();
      ctx.strokeStyle = i < h.level ? n.col : '#cbd5e1'; ctx.lineWidth = 2.2; if (i >= h.level) ctx.setLineDash([6, 5]); rr(x1, y, x2 - x1, HRG.h, HRG.h / 2); ctx.stroke(); ctx.setLineDash([]);
      // 화살표
      if (i < 4) {
        const ay = y + HRG.h + 6, ay2 = y + HRG.dy - (HRG.labOn === 'above' ? 22 : 8), on = h.level > i + 1 && h.sw[i + 1] > 0.05;
        D.arrow(hrX(250), ay, hrX(250), ay2, { color: on ? '#16a34a' : '#cbd5e1', width: 3, head: 10 });
        if (HRG.labOn === 'left') T(hrX(250) + 12, (ay + ay2) / 2 + 5, '전사 인자가 다음 유전자를 켜요', 13, on ? '#15803d' : '#94a3b8', 'left', 700);
      }
    }
    TF(HRG.px + HRG.pw / 2, HRG.py + HRG.ph - 14, h.level >= 5 ? '모계 인자 → 간격 → 쌍 규칙 → 체절 극성 → 혹스 : 앞 단계의 전사 인자가 다음 단계 유전자를 조절해요' : '▶ 다음 단계 켜기를 눌러 한 단계씩 켜요  (' + h.level + ' / 5)', HRG.pw - 30, L(14, 12.5), 10.5, '#475569', 'center', 800);
  }

  /* =========================================================
     ③ 혹스 유전자: 염색체 위 배열 = 몸의 앞 → 뒤 순서 (공선성)
     ========================================================= */
  const HXG = PHONE
    ? { panel: { x: 8, y: 8, w: 464, h: 624 }, bx0: 12, bw: 50, bgap: 6, by: 110, bh: 40, ex0: 24, ew: 432, ey: 292, eh: 50, info: { x: 20, y: 396, w: 440, h: 214 } }
    : { panel: { x: 14, y: 14, w: 772, h: 532 }, bx0: 60, bw: 78, bgap: 8, by: 104, bh: 44, ex0: 60, ew: 680, ey: 272, eh: 62, info: { x: 40, y: 388, w: 720, h: 146 } };
  const hxBox = (k) => ({ x: HXG.bx0 + k * (HXG.bw + HXG.bgap), y: HXG.by, w: HXG.bw, h: HXG.bh });
  const hxX = (um) => HXG.ex0 + um / EMB_LEN * HXG.ew;
  function hxPick(k) {
    S.hx.sel = k; S.hx.seen[k] = 1; S.hx.line = 0; Sound.click(); updateCtl();
  }
  const hxSeenN = () => S.hx.seen.reduce((a, b) => a + b, 0);
  function hxDraw(dt, t) {
    const h = S.hx, P = HXG.panel;
    h.line = approach(h.line, 1, dt, 3.2);
    panel(P.x, P.y, P.w, P.h, 16, '#fff');
    TF(P.x + 18, P.y + 28, '초파리 혹스 유전자 8개 : 염색체 위 순서 = 몸의 앞 → 뒤 순서', P.w - 36, L(17, 14.5), 11, '#14532d', 'left', 800);
    // 염색체
    const b0 = hxBox(0), b7 = hxBox(7), cyc = HXG.by + HXG.bh / 2;
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(b0.x - 14, cyc); ctx.lineTo(b7.x + b7.w + 14, cyc); ctx.stroke(); ctx.lineCap = 'butt';
    // 복합체 괄호
    [[0, 4, '복합체 1 · 앞쪽 5개 (ANT-C)'], [5, 7, '복합체 2 · 뒤쪽 3개 (BX-C)']].forEach((q) => {
      const x1 = hxBox(q[0]).x, x2 = hxBox(q[1]).x + HXG.bw, y = HXG.by - 14;
      ctx.strokeStyle = '#64748b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x1, y + 7); ctx.lineTo(x1, y); ctx.lineTo(x2, y); ctx.lineTo(x2, y + 7); ctx.stroke();
      TF((x1 + x2) / 2, y - 8, q[2], x2 - x1 + (PHONE ? 4 : 30), L(13.5, 11.5), 9.5, '#475569', 'center', 800);
    });
    // 몸(배아) 띠
    const ey = HXG.ey, eh = HXG.eh, ex1 = hxX(0) - 10, ex2 = hxX(EMB_LEN) + 10;
    ctx.save(); D.shadow(() => { rr(ex1, ey, ex2 - ex1, eh, eh / 2); ctx.fillStyle = '#f8fafc'; ctx.fill(); }, { blur: 6, y: 2 });
    rr(ex1, ey, ex2 - ex1, eh, eh / 2); ctx.clip();
    HOX.forEach((g, k) => {
      const [u1, u2] = zoneUm(k), on = k === h.sel, a = on ? 0.95 : 0.3;
      ctx.fillStyle = col(g.col, a); ctx.fillRect(hxX(u1), ey, hxX(u2) - hxX(u1), eh);
      ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 2; ctx.strokeRect(hxX(u1), ey, hxX(u2) - hxX(u1), eh);
      T((hxX(u1) + hxX(u2)) / 2, ey + eh / 2 + 6, String(k + 1), L(17, 14), on ? '#fff' : 'rgba(31,45,68,.65)', 'center', 800);
    });
    ctx.restore();
    ctx.strokeStyle = '#b7791f'; ctx.lineWidth = 2.2; rr(ex1, ey, ex2 - ex1, eh, eh / 2); ctx.stroke();
    T(ex1 + 2, ey - 8, '← 앞 (머리 쪽)', L(13.5, 12), '#475569', 'left', 800); T(ex2 - 2, ey - 8, '뒤 (꼬리 쪽) →', L(13.5, 12), '#475569', 'right', 800);
    // 머리 · 가슴 · 배 괄호
    [[0, 3, '머리 (3)'], [3, 6, '가슴 (3)'], [6, 14, '배 (8)']].forEach((q) => {
      const x1 = hxX(q[0] * SEG_UM) + 3, x2 = hxX(q[1] * SEG_UM) - 3, y = ey + eh + 10;
      ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x1, y - 5); ctx.lineTo(x1, y); ctx.lineTo(x2, y); ctx.lineTo(x2, y - 5); ctx.stroke();
      TF((x1 + x2) / 2, y + 18, q[2], x2 - x1 + 6, L(14, 12), 10, '#475569', 'center', 800);
    });
    // 유전자 상자 + 대응선
    HOX.forEach((g, k) => {
      const b = hxBox(k), on = k === h.sel;
      D.shadow(() => { rr(b.x, b.y, b.w, b.h, 10); ctx.fillStyle = on ? g.col : col(g.col, 0.2); ctx.fill(); }, { blur: on ? 9 : 4, y: 2 });
      ctx.strokeStyle = g.col; ctx.lineWidth = on ? 3 : 2; rr(b.x, b.y, b.w, b.h, 10); ctx.stroke();
      TF(b.x + b.w / 2, b.y + b.h / 2 + 5, g.n, b.w - 6, L(16, 13), 10, on ? '#fff' : '#26324a', 'center', 800);
      T(b.x + b.w / 2, b.y + b.h + 18, String(k + 1), L(13.5, 12), '#64748b', 'center', 800);
      const [u1, u2] = zoneUm(k), tx = hxX((u1 + u2) / 2), sx = b.x + b.w / 2, sy = b.y + b.h + 26;
      const showAll = hxSeenN() === 8, p = on ? ease.outCubic(clamp(h.line, 0, 1)) : (showAll ? 1 : 0);
      if (p > 0.01) {
        ctx.save(); ctx.strokeStyle = col(g.col, on ? 0.95 : 0.4); ctx.lineWidth = on ? 3 : 1.8;
        const ex = ey - 20, mid = (sy + ex) / 2;
        ctx.beginPath(); ctx.moveTo(sx, sy);
        const n = 24; for (let i = 1; i <= n * p; i++) { const u = i / n, x = sx + (tx - sx) * (u * u * (3 - 2 * u)), y = sy + (ex - sy) * u; ctx.lineTo(x, y); }
        ctx.stroke(); ctx.restore();
      }
    });
    // 정보 카드
    const g = HOX[h.sel], I = HXG.info, [u1, u2] = zoneUm(h.sel);
    D.roundRect(I.x, I.y, I.w, I.h, 14); ctx.fillStyle = col(g.col, 0.1); ctx.fill(); ctx.strokeStyle = col(g.col, 0.6); ctx.lineWidth = 2; ctx.stroke();
    D.label(I.x + 14, I.y + 26, g.n, { bg: g.col, size: L(16, 14), align: 'left' });
    T(I.x + 14 + (PHONE ? 78 : 88), I.y + 31, '→ ' + g.region + ' 체절에서 켜져요', L(16, 14.5), '#26324a', 'left', 800);
    let yy = I.y + 54;
    yy += textBlock(I.x + 14, yy, I.w - 28, '염색체 위에서 ' + (h.sel + 1) + '번째 유전자는 몸에서도 앞에서부터 ' + (h.sel + 1) + '번째 부위에서 켜져요.', L(15, 13.5), '#334155', L(21, 19), 800) + 8;
    yy += textBlock(I.x + 14, yy, I.w - 28, '혹스 유전자는 전사 인자를 만드는 유전자예요. 체절마다 켜진 혹스 유전자가 달라서 체절의 정체성이 정해져요.', L(14, 13), '#475569', L(20, 18), 700) + 8;
    if (hxSeenN() === 8) textBlock(I.x + 14, yy, I.w - 28, '8개를 모두 봤어요: 염색체 위의 배열 순서와 몸의 앞 → 뒤 발현 순서가 같아요 (공선성).', L(14, 13), '#15803d', L(20, 18), 800);
    else T(I.x + 14, I.y + I.h - 14, '살펴본 유전자 ' + hxSeenN() + ' / 8', L(14, 13), '#94a3b8', 'left', 800);
  }
  const hxPT = {
    down(p) { for (let k = 0; k < 8; k++) { const b = hxBox(k); if (inRect(p.x, p.y, b)) { hxPick(k); return true; } } return false; },
    hover(p) { for (let k = 0; k < 8; k++) if (inRect(p.x, p.y, hxBox(k))) return 'pointer'; return 'default'; },
  };

  /* ---------- 연결하기 (유전자 카드 → 몸 부위 칸) ---------- */
  const MTG = PHONE
    ? { boxes: HOX.map((g, k) => ({ id: 'z' + k, x: 8 + (k % 4) * 117, y: 118 + Math.floor(k / 4) * 128, w: 111, h: 118 })), slotY: 34, slotH: 44, tray: { x0: 8, y0: 410, dx: 117, dy: 54, per: 4 }, cw: 111, ch: 44, kh: 42 }
    : { boxes: HOX.map((g, k) => ({ id: 'z' + k, x: 20 + k * 95, y: 150, w: 89, h: 126 })), slotY: 56, slotH: 50, tray: { x0: 40, y0: 336, dx: 184, dy: 66, per: 4 }, cw: 160, ch: 50, kh: 48 };
  let mtS = null;
  function mtInit() {
    const G = MTG;
    mtS = selectable({
      cards: HOX.map((g) => ({ id: g.id, label: g.n, col: g.col })),
      boxes: G.boxes.map((b, k) => Object.assign({}, b, { single: true, slot: { x: b.x + 5, y: b.y + G.slotY, w: b.w - 10, h: G.slotH }, hdr: 0, region: HOX[k].region })),
      tray: (i) => ({ x: G.tray.x0 + (i % G.tray.per) * G.tray.dx, y: G.tray.y0 + Math.floor(i / G.tray.per) * G.tray.dy }),
      cw: G.cw, ch: G.ch, kh: G.kh, onChange: () => updateCtl(),
    });
    mtS.layout(true);
  }
  function mtState() {
    const bad = [], miss = [];
    HOX.forEach((g, k) => { const c = mtS.cards.find((q) => q.id === g.id); if (!c.zone) miss.push(g.id); else if (c.zone !== 'z' + k) bad.push(g.id); });
    return { bad, miss };
  }
  function mtDraw(dt, t) {
    const G = MTG;
    TF(VW / 2, PHONE ? 28 : 40, '유전자 카드를 알맞은 몸 부위 칸에 놓아요', VW - 24, L(19, 16), 12, '#14532d', 'center', 800);
    // 염색체 위 순서
    if (!PHONE) {
      T(24, 78, '염색체 위 순서', 14, '#475569', 'left', 800);
      HOX.forEach((g, k) => { const x = 138 + k * 80; D.label(x, 76, g.n, { bg: g.col, size: 13, align: 'left' }); if (k < 7) T(x + 52, 81, '→', 14, '#94a3b8', 'left', 800); });
      T(24, 112, '몸의 부위 (앞 → 뒤)', 14, '#475569', 'left', 800);
    } else {
      textBlock(12, 54, VW - 24, '염색체 위 순서 : lab → pb → Dfd → Scr → Antp → Ubx → abd-A → Abd-B', 13, '#475569', 17, 800);
      T(12, 108, '몸의 부위 (앞 → 뒤)', 13.5, '#475569', 'left', 800);
    }
    mtS.update(dt);
    // 칸 그리기 (머리·가슴·배 괄호)
    G.boxes.forEach((b, k) => {
      const hot = mtS.hot && mtS.hot.id === b.id;
      D.roundRect(b.x, b.y, b.w, b.h, 12); ctx.fillStyle = hot ? 'rgba(22,163,74,.22)' : (k < 3 ? 'rgba(56,189,248,.12)' : k < 6 ? 'rgba(251,191,36,.14)' : 'rgba(167,139,250,.14)'); ctx.fill();
      ctx.setLineDash([6, 4]); ctx.strokeStyle = hot ? '#16a34a' : '#94a3b8'; ctx.lineWidth = hot ? 3 : 2; ctx.stroke(); ctx.setLineDash([]);
      T(b.x + b.w / 2, b.y + 22, String(k + 1), L(17, 15), '#64748b', 'center', 800);
      TF(b.x + b.w / 2, b.y + G.slotY + G.slotH + L(22, 20), HOX[k].region, b.w - 6, L(14, 13), 10.5, '#26324a', 'center', 800);
      if (!PHONE) T(b.x + b.w / 2, b.y + G.slotY + G.slotH + 42, k < 3 ? '머리' : k < 6 ? '가슴' : '배', L(12.5, 11.5), '#94a3b8', 'center', 700);
    });
    mtS.drawCards();
    T(VW / 2, VH - 12, '카드 8장 : 염색체 위 순서와 몸의 앞 → 뒤 순서를 떠올려 봐요', 13, '#94a3b8', 'center', 700);
  }

  /* ---------- 사람의 혹스 유전자 ---------- */
  const HUM = [
    { n: 'HOXA', set: [1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 13] },
    { n: 'HOXB', set: [1, 2, 3, 4, 5, 6, 7, 8, 9, 13] },
    { n: 'HOXC', set: [4, 5, 6, 8, 9, 10, 11, 12, 13] },
    { n: 'HOXD', set: [1, 3, 4, 8, 9, 10, 11, 12, 13] },
  ];
  S.hm = { p: 0 };
  function humDraw(dt, t) {
    const P = PHONE ? { x: 8, y: 8, w: 464, h: 624 } : { x: 14, y: 14, w: 772, h: 532 };
    S.hm.p = approach(S.hm.p, 1, dt, 0.8);
    panel(P.x, P.y, P.w, P.h, 16, '#fff');
    TF(P.x + 18, P.y + 28, '사람의 혹스 유전자 : 4개의 클러스터에 모두 39개', P.w - 36, L(17, 14.5), 11, '#14532d', 'left', 800);
    // 초파리
    const fy = P.y + L(78, 74), cx0 = P.x + L(150, 100), cw = (P.x + P.w - 120 - cx0) / 13;
    T(P.x + 18, fy + 5, '초파리', L(15, 13.5), '#475569', 'left', 800); T(P.x + 18, fy + 24, '8개 (복합체 2개)', L(12.5, 11), '#94a3b8', 'left', 700);
    ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(cx0, fy); ctx.lineTo(cx0 + cw * 13, fy); ctx.stroke();
    HOX.forEach((g, k) => { const x = cx0 + k * (cw * 13 / 8); D.roundRect(x + 2, fy - 12, cw * 13 / 8 - 4, 24, 6); ctx.fillStyle = g.col; ctx.fill(); TF(x + cw * 13 / 16, fy + 4, g.n, cw * 13 / 8 - 6, L(12.5, 10.5), 8.5, '#fff', 'center', 800); });
    // 사람
    const hy0 = P.y + L(136, 152), rowH = L(56, 58);
    T(P.x + 18, hy0 - L(24, 8), '사람', L(15, 13.5), '#475569', 'left', 800);
    for (let j = 1; j <= 13; j++) { T(cx0 + (j - 0.5) * cw, hy0 - 6, String(j), L(13, 11), '#64748b', 'center', 800); }
    HUM.forEach((c, r) => {
      const y = hy0 + 18 + r * rowH;
      T(P.x + 18, y + 6, c.n, L(15, 13), '#26324a', 'left', 800); T(P.x + 18, y + 26, c.set.length + '개', L(13, 11.5), '#64748b', 'left', 700);
      ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(cx0, y); ctx.lineTo(cx0 + cw * 13, y); ctx.stroke();
      for (let j = 1; j <= 13; j++) {
        const x = cx0 + (j - 1) * cw, present = c.set.indexOf(j) >= 0, a = clamp(S.hm.p * 20 - (r * 13 + j) * 0.25 - 0, 0, 1);
        if (!present) { ctx.setLineDash([3, 3]); ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1.5; D.roundRect(x + 2, y - 11, cw - 4, 22, 5); ctx.stroke(); ctx.setLineDash([]); continue; }
        const hue = C.mix('#0ea5e9', '#a855f7', (j - 1) / 12);
        ctx.save(); ctx.globalAlpha = a; D.roundRect(x + 2, y - 11, cw - 4, 22, 5); ctx.fillStyle = hue; ctx.fill(); ctx.restore();
        if (c.n === 'HOXD' && j === 13 && a > 0.5) { D.ring(x + cw / 2, y, 16, t, { color: '#e11d48', width: 2 }); }
      }
    });
    const by = hy0 + 18 + 4 * rowH + 6;
    T(cx0, by + 4, '← 앞쪽 (머리 쪽)', L(13.5, 12), '#475569', 'left', 800); T(cx0 + cw * 13, by + 4, '뒤쪽 (꼬리 쪽) →', L(13.5, 12), '#475569', 'right', 800);
    let yy = by + 32;
    yy += textBlock(P.x + 18, yy, P.w - 36, '번호가 클수록 몸의 뒤쪽에서 켜져요. 4개의 클러스터 모두 배열 순서와 발현 순서가 대응해요. 초파리 8개와 사람 39개는 서로 닮은 혹스 유전자 집합이에요.', L(14.5, 13), '#334155', L(21, 19), 800) + 10;
    textBlock(P.x + 18, yy, P.w - 36, '붉은 고리 : HOXD13. 이 유전자에 이상이 생기면 손가락 · 발가락 기형이 생긴 사례가 있어요.', L(14, 12.5), '#be123c', L(20, 18), 800);
    const tot = HUM.reduce((a, c) => a + c.set.length, 0);
    D.label(P.x + P.w - 18, P.y + L(52, 54), '합계 ' + tot + '개', { bg: '#15803d', size: L(14, 13), align: 'right' });
  }

  /* =========================================================
     ④ 호메오틱 돌연변이: Antennapedia, bithorax
     ========================================================= */
  const MU = PHONE
    ? { fly: { x: 8, y: 8, w: 464, h: 360 }, hx: { x: 8, y: 376, w: 464, h: 256 }, cx: 140, cy: 196, s: 0.92 }
    : { fly: { x: 14, y: 14, w: 772, h: 330 }, hx: { x: 14, y: 352, w: 772, h: 194 }, cx: 270, cy: 176, s: 1.0 };
  const MU_OPT = ['선택하세요', '더듬이 자리에 다리가 생김', '평균곤이 날개로 바뀌어 날개가 4개가 됨', '손가락 · 발가락 모양이 달라지는 기형이 생김', '날개와 다리가 모두 없어짐', '아무 변화 없음'];
  const MU_KEY = { pdA: 1, pdB: 2, pdC: 3 };
  S.mu.anpSp = new SciSim.Spring(0, { stiffness: 70, damping: 7 });
  S.mu.bxSp = new SciSim.Spring(0, { stiffness: 60, damping: 6.5 });
  S.mu.bad = { pdA: false, pdB: false, pdC: false };
  function muView(v) {
    const m = S.mu; if (m.view === v) return;
    m.view = v; m.seen[v] = 1; m.anpSp.target = v === 1 ? 1 : 0; m.bxSp.target = v === 2 ? 1 : 0; Sound.click(); updateCtl();
  }
  function muReset() {
    const m = S.mu; m.view = 0; m.seen = [1, 0, 0]; m.anpSp.value = 0; m.anpSp.target = 0; m.anpSp.velocity = 0; m.bxSp.value = 0; m.bxSp.target = 0; m.bxSp.velocity = 0;
    ['pdA', 'pdB', 'pdC'].forEach((id) => { const e = $('#' + id); if (e) { e.value = '0'; e.classList.remove('ok', 'bad'); } });
    m.bad = { pdA: false, pdB: false, pdC: false };
    updateCtl();
  }
  function legPath(bx, by, ang, len, bend) {
    // 3마디 다리/더듬이: 마디 길이 len[0..2], 마디마다 bend만큼 꺾여요
    const pts = [[bx, by]]; let a = ang, x = bx, y = by;
    for (let i = 0; i < 3; i++) { x += Math.cos(a) * len[i]; y += Math.sin(a) * len[i]; pts.push([x, y]); a += bend * (i === 0 ? 1 : 0.8); }
    return pts;
  }
  function strokePts(pts, w, c) {
    ctx.strokeStyle = c; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); pts.forEach((p, i) => { if (i === 0) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]); }); ctx.stroke(); ctx.lineCap = 'butt';
  }
  function drawWing(side, bx, by, len, wid, ang, alpha, t) {
    ctx.save(); ctx.translate(bx, by); ctx.rotate(ang * side); ctx.scale(side, 1);
    ctx.globalAlpha = alpha;
    ctx.beginPath(); ctx.ellipse(len / 2, 0, len / 2, wid / 2, 0, 0, TAU);
    const g = ctx.createLinearGradient(0, -wid / 2, 0, wid / 2); g.addColorStop(0, 'rgba(219,234,254,.85)'); g.addColorStop(1, 'rgba(147,197,253,.55)');
    ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = 'rgba(30,64,175,.55)'; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.strokeStyle = 'rgba(30,64,175,.4)'; ctx.lineWidth = 1;
    for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(4, 0); ctx.quadraticCurveTo(len * 0.5, k * wid * 0.25, len * 0.92, k * wid * 0.18); ctx.stroke(); }
    ctx.restore();
  }
  function drawFly(cx, cy, s, anp, bxm, t) {
    ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s);
    const BODY = '#8a5a2b', DARK = '#5b3a17';
    const an = clamp(anp, 0, 1.15), bw = clamp(bxm, 0, 1.15);
    // 날개 (둘째 가슴)
    drawWing(1, 22, -34, 118, 42, 0.5, 0.9, t); drawWing(-1, -22, -34, 118, 42, 0.5, 0.9, t);
    // 평균곤 → 날개 (셋째 가슴)
    const hal = Math.max(0, 1 - bw);
    drawWing(1, 18, 2, 12 + 100 * bw, 8 + 34 * bw, 0.95, clamp(bw * 1.4, 0, 1), t); drawWing(-1, -18, 2, 12 + 100 * bw, 8 + 34 * bw, 0.95, clamp(bw * 1.4, 0, 1), t);
    if (hal > 0.02) { ctx.save(); ctx.globalAlpha = clamp(hal * 1.3, 0, 1); [1, -1].forEach((sd) => { strokePts([[sd * 18, 2], [sd * 34, 10]], 4, DARK); D.sphere(sd * 36, 11, 5.5, '#e9d5a0', { outline: DARK, outlineWidth: 1.4, gloss: false }); }); ctx.restore(); }
    // 다리 3쌍 (가슴)
    [[-54, -0.55], [-26, 0.0], [2, 0.55]].forEach((q, i) => {
      [1, -1].forEach((sd) => {
        const ang = sd > 0 ? q[1] + Math.PI * 0.0 - 0.15 : Math.PI - (q[1] - 0.15);
        const base = [sd * 28, q[0]];
        const pts = legPath(base[0], base[1], sd > 0 ? 0.35 + q[1] * 0.9 : Math.PI - (0.35 + q[1] * 0.9), [24, 26, 20], sd > 0 ? 0.55 : -0.55);
        strokePts(pts, 5, DARK);
      });
    });
    // 몸통
    D.shadow(() => {
      ctx.fillStyle = '#d6a45b'; ctx.beginPath(); ctx.ellipse(0, 64, 33, 66, 0, 0, TAU); ctx.fill();            // 배
      ctx.fillStyle = '#b9833c'; ctx.beginPath(); ctx.ellipse(0, -28, 38, 52, 0, 0, TAU); ctx.fill();           // 가슴
    }, { blur: 8, y: 3 });
    ctx.strokeStyle = DARK; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.ellipse(0, 64, 33, 66, 0, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.ellipse(0, -28, 38, 52, 0, 0, TAU); ctx.stroke();
    ctx.save(); ctx.beginPath(); ctx.ellipse(0, 64, 33, 66, 0, 0, TAU); ctx.clip();
    for (let k = 0; k < 6; k++) { ctx.fillStyle = 'rgba(70,40,10,.55)'; ctx.fillRect(-40, 8 + k * 21, 80, 8); }
    ctx.restore();
    ctx.strokeStyle = 'rgba(70,40,10,.45)'; ctx.lineWidth = 1.5;
    [-52, -26, 0].forEach((y) => { ctx.beginPath(); ctx.moveTo(-34, y); ctx.lineTo(34, y); ctx.stroke(); });
    // 머리
    D.sphere(0, -98, 27, '#c8934a', { outline: DARK, outlineWidth: 1.8 });
    [1, -1].forEach((sd) => { ctx.fillStyle = '#c1121f'; ctx.beginPath(); ctx.ellipse(sd * 17, -100, 9, 13, sd * 0.15, 0, TAU); ctx.fill(); ctx.strokeStyle = '#7f1d1d'; ctx.lineWidth = 1.3; ctx.stroke(); });
    // 더듬이 → 다리 (더듬이 자리)
    [1, -1].forEach((sd) => {
      const lenA = [lerp(13, 24, an), lerp(10, 26, an), lerp(0, 20, an)];
      const ang0 = sd > 0 ? -1.2 + 0.0 : Math.PI + 1.2;
      const ang = lerp(sd > 0 ? -1.15 : Math.PI + 1.15, sd > 0 ? -0.55 : Math.PI + 0.55, clamp(an, 0, 1));
      const pts = legPath(sd * 11, -118, ang, lenA, (sd > 0 ? 1 : -1) * 0.55 * clamp(an, 0, 1));
      strokePts(pts, lerp(4.4, 5, clamp(an, 0, 1)), DARK);
      const end = pts[pts.length - 1];
      if (an < 0.6) { ctx.save(); ctx.globalAlpha = clamp(1 - an * 1.6, 0, 1); ctx.fillStyle = '#e9d5a0'; ctx.strokeStyle = DARK; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.ellipse(pts[2][0], pts[2][1] - 1, 5.6, 8, sd * 0.4, 0, TAU); ctx.fill(); ctx.stroke(); ctx.restore(); }
      else { ctx.save(); ctx.globalAlpha = clamp((an - 0.5) * 2, 0, 1); ctx.strokeStyle = DARK; ctx.lineWidth = 2.6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(end[0], end[1]); ctx.lineTo(end[0] + sd * 6, end[1] - 5); ctx.moveTo(end[0], end[1]); ctx.lineTo(end[0] + sd * 7, end[1] + 3); ctx.stroke(); ctx.restore(); }
    });
    ctx.restore();
  }
  const muCounts = () => {
    const m = S.mu, a = m.anpSp.value > 0.5, b = m.bxSp.value > 0.5;
    return { ant: a ? 0 : 2, leg: a ? 8 : 6, wing: b ? 4 : 2, hal: b ? 0 : 2 };
  };
  function muDraw(dt, t) {
    const m = S.mu;
    m.anpSp.update(dt); m.bxSp.update(dt);
    const F = MU.fly, H = MU.hx;
    panel(F.x, F.y, F.w, F.h, 16, '#fff');
    const names = ['정상 파리', 'Antennapedia 돌연변이 : Antp가 머리에서도 켜짐', 'bithorax 돌연변이 : Ubx가 꺼짐'];
    TF(F.x + 16, F.y + 26, names[m.view], F.w - 32, L(16, 13.5), 11, m.view ? '#b91c1c' : '#14532d', 'left', 800);
    drawFly(MU.cx, MU.cy + (PHONE ? 6 : 14), MU.s, m.anpSp.value, m.bxSp.value, t);
    // 표지선
    const k = muCounts();
    const fx = MU.cx + MU.s * (PHONE ? 100 : 160), ty = F.y + 56;
    if (!PHONE) {
      const rows = [['더듬이', k.ant, m.view === 1], ['다리', k.leg, m.view === 1], ['날개', k.wing, m.view === 2], ['평균곤', k.hal, m.view === 2]];
      rows.forEach((q, i) => {
        const y = ty + i * 40;
        D.roundRect(fx + 44, y, 200, 32, 10); ctx.fillStyle = q[2] ? '#fff1f2' : '#f8fafc'; ctx.fill(); ctx.strokeStyle = q[2] ? '#fb7185' : '#e2e8f0'; ctx.lineWidth = 1.8; ctx.stroke();
        T(fx + 58, y + 22, q[0], 16, '#26324a', 'left', 800); T(fx + 230, y + 22, q[1] + '개', 17, q[2] ? '#be123c' : '#15803d', 'right', 800);
      });
      const msg = m.view === 1 ? '더듬이 자리에 다리가 생겼어요. 다리의 구조는 정상이에요. 달라진 것은 어디에 무엇을 만드느냐(정체성)예요.' : m.view === 2 ? '평균곤 자리에 날개가 생겨 날개가 4개가 됐어요. 셋째 가슴이 둘째 가슴처럼 발달했어요.' : '정상 파리 : 머리에는 더듬이, 둘째 가슴에는 날개, 셋째 가슴에는 평균곤이 있어요.';
      textBlock(fx + 44, ty + 4 * 40 + 14, 232, msg, 14, m.view ? '#be123c' : '#334155', 20, 800);
    } else {
      const rows = [['더듬이', k.ant, m.view === 1], ['다리', k.leg, m.view === 1], ['날개', k.wing, m.view === 2], ['평균곤', k.hal, m.view === 2]];
      rows.forEach((q, i) => {
        const y = F.y + 54 + i * 40;
        D.roundRect(F.x + 262, y, 190, 32, 10); ctx.fillStyle = q[2] ? '#fff1f2' : '#f8fafc'; ctx.fill(); ctx.strokeStyle = q[2] ? '#fb7185' : '#e2e8f0'; ctx.lineWidth = 1.8; ctx.stroke();
        T(F.x + 274, y + 22, q[0], 15, '#26324a', 'left', 800); T(F.x + 440, y + 22, q[1] + '개', 16, q[2] ? '#be123c' : '#15803d', 'right', 800);
      });
      const msg = m.view === 1 ? '더듬이 자리에 다리가 생겼어요. 구조는 정상, 위치만 바뀐 거예요.' : m.view === 2 ? '평균곤 자리에 날개가 생겨 날개가 4개예요.' : '머리 : 더듬이, 둘째 가슴 : 날개, 셋째 가슴 : 평균곤';
      textBlock(F.x + 262, F.y + 228, 196, msg, 13.5, m.view ? '#be123c' : '#334155', 18, 800);
    }
    // 혹스 발현 지도
    panel(H.x, H.y, H.w, H.h, 16, '#fff');
    TF(H.x + 16, H.y + 26, '혹스 유전자가 켜진 부위 (앞 → 뒤)', H.w - 32, L(16, 13.5), 11, '#14532d', 'left', 800);
    const x0 = H.x + 24, w = H.w - 48, zh = L(56, 50), zy = H.y + 52;
    const zx = (um) => x0 + um / EMB_LEN * w;
    HOX.forEach((g, i) => {
      const [u1, u2] = zoneUm(i); let off = false;
      if (m.view === 2 && i === 5) off = true;
      ctx.save();
      ctx.fillStyle = off ? '#e5e7eb' : col(g.col, 0.9); ctx.fillRect(zx(u1), zy, zx(u2) - zx(u1), zh);
      if (off) { ctx.strokeStyle = '#6b7280'; ctx.lineWidth = 1.6; ctx.setLineDash([4, 3]); ctx.strokeRect(zx(u1) + 1, zy + 1, zx(u2) - zx(u1) - 2, zh - 2); ctx.setLineDash([]); }
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeRect(zx(u1), zy, zx(u2) - zx(u1), zh);
      ctx.restore();
      TF((zx(u1) + zx(u2)) / 2, zy + zh / 2 + 5, g.n, zx(u2) - zx(u1) - 4, L(14, 11.5), 8.5, off ? '#6b7280' : '#fff', 'center', 800, off ? undefined : { stroke: g.col, strokeWidth: 3 });
      if (off) T((zx(u1) + zx(u2)) / 2, zy + zh + 16, 'Ubx 꺼짐', L(13, 11), '#6b7280', 'center', 800);
    });
    if (m.view === 1) {   // 머리에서 Antp가 켜진 부분
      const [u1, u2] = zoneUm(0), a = HOX[4];
      ctx.fillStyle = col(a.col, 0.9); ctx.fillRect(zx(u1), zy, zx(u2) - zx(u1), zh * 0.5); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeRect(zx(u1), zy, zx(u2) - zx(u1), zh * 0.5);
      T((zx(u1) + zx(u2)) / 2, zy + zh * 0.5 - 6, 'Antp', L(12, 10), '#fff', 'center', 800, { stroke: a.col, strokeWidth: 3 });
      D.label(zx(u1) + 6, zy + zh + 20, 'Antp가 머리에서 잘못 켜졌어요', { bg: '#be123c', size: L(13, 12), align: 'left' });
    }
    if (m.view === 2) D.label(zx(zoneUm(5)[0]) - 120, zy + zh + 38, '셋째 가슴이 둘째 가슴(날개)처럼 발달', { bg: '#be123c', size: L(13, 12), align: 'left' });
    if (m.view === 0) T(H.x + H.w / 2, H.y + H.h - 12, '각 체절에서 켜진 혹스 유전자에 따라 만들어지는 기관이 정해져요.', L(14, 12.5), '#64748b', 'center', 700);
    if (m.view !== 0) T(H.x + H.w / 2, H.y + H.h - 12, '기관의 구조는 정상이에요. 바뀐 것은 기관이 만들어지는 위치예요.', L(14, 12.5), '#be123c', 'center', 800);
  }

  /* =========================================================
     화면 전환 · 조작 연결
     ========================================================= */
  let eggPTo = null, thrPTo = null, mtPT = null;
  function setMode(m) {
    if (S.mode !== m) S.fade = 1;
    S.mode = m;
    PT = m === 'egg' ? eggPTo : m === 'thr' ? thrPTo : m === 'hox' ? hxPT : m === 'match' ? mtPT : null;
    hideHint(); updateCtl();
  }
  const ctlNodes = $$('#ctrlCard .control');
  function updateCtl() {
    const fr = game ? game.free : false, lvNow = game ? game.level : 0;
    ctlNodes.forEach((n) => { n.hidden = (n.dataset.modes || '').split(' ').indexOf(S.mode) < 0; });
    modeButtons(S.mode, lvNow, fr);
    $('#modeSeg button[data-mode="human"]').classList.toggle('lv-off', !fr && lvNow < 2);
    const e = S.ep;
    chipSet($('#epMother'), e.mother);
    $('#epProbeOut').textContent = 'x = ' + e.probe + ' µm';
    $('#epFert').textContent = e.g >= 1 ? (e.mother ? '✔ 수정 완료 (단백질 없음)' : '✔ 단백질 기울기 완성') : e.run ? '진행 중…' : '▶ 수정 : Bicoid 단백질 만들기';
    $('#epFert').disabled = e.run || e.g >= 1;
    $('#epRead').hidden = e.g < 1 || e.mother === 1;
    $('#epList').innerHTML = '<li class="' + (e.gradDone ? 'on' : '') + '">' + mark(!!e.gradDone) + ' 기울기 만들기</li><li class="' + (e.viewedMutant ? 'on' : '') + '">' + mark(e.viewedMutant) + ' bicoid 결함 어미 보기</li><li class="' + (e.ok100 && e.ok200 ? 'on' : '') + '">' + mark(e.ok100 && e.ok200) + ' 농도 2곳 읽기</li>';
    chipSet($('#thrAmt'), e.c0);
    $('#mkOut').textContent = 'x = ' + e.mark + ' µm';
    $('#thrList').innerHTML = '<li class="' + (e.markOk1 ? 'on' : '') + '">' + mark(e.markOk1) + ' 1배 경계 표시</li><li class="' + (e.calcOk ? 'on' : '') + '">' + mark(e.calcOk) + ' 경계 계산</li><li class="' + (e.predOk ? 'on' : '') + '">' + mark(e.predOk) + ' 이동 거리 예측</li><li class="' + (e.twiceSeen && e.markOk2 ? 'on' : '') + '">' + mark(e.twiceSeen && e.markOk2) + ' 2배일 때 확인</li>';
    const hr = S.hr;
    $('#hrNext').textContent = hr.level >= 5 ? '✔ 모두 켰어요' : '▶ ' + ['모계 인자', '간격 유전자', '쌍 규칙 유전자', '체절 극성 유전자', '혹스 유전자'][hr.level] + ' 켜기';
    $('#hrNext').disabled = hr.level >= 5;
    $('#hrList').innerHTML = '<li class="' + (hr.level >= 5 ? 'on' : '') + '">' + mark(hr.level >= 5) + ' 계층 ' + hr.level + ' / 5단계</li>';
    $$('#hxSel button').forEach((b, k) => { b.classList.toggle('on', S.hx.sel === k); b.classList.toggle('seen', !!S.hx.seen[k]); });
    $('#hxList').innerHTML = '<li class="' + (hxSeenN() === 8 ? 'on' : '') + '">' + mark(hxSeenN() === 8) + ' 살펴본 유전자 ' + hxSeenN() + ' / 8</li>';
    chipSet($('#mtView'), S.mu.view); $$('#mtView button').forEach((b) => b.classList.toggle('seen', !!S.mu.seen[+b.dataset.v]));
    $('#mtList').innerHTML = '<li class="' + (S.mu.seen[1] ? 'on' : '') + '">' + mark(!!S.mu.seen[1]) + ' Antennapedia 확인</li><li class="' + (S.mu.seen[2] ? 'on' : '') + '">' + mark(!!S.mu.seen[2]) + ' bithorax 확인</li>';
  }
  bindModes(setMode);
  $('#epFert').addEventListener('click', epFert);
  $$('#epMother button').forEach((b) => b.addEventListener('click', () => epMother(+b.dataset.v)));
  $('#epProbe').addEventListener('input', () => setProbe(+$('#epProbe').value));
  $('#epMark').addEventListener('input', () => setMark(+$('#epMark').value));
  $$('#thrAmt button').forEach((b) => b.addEventListener('click', () => setAmount(+b.dataset.v)));
  $('#hrNext').addEventListener('click', hrNext);
  $('#hrReset').addEventListener('click', () => { Sound.click(); hrReset(); });
  $('#mtClear').addEventListener('click', () => { Sound.click(); mtS.reset(); mtS.markBad([]); updateCtl(); });
  HOX.forEach((g, k) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = g.n; b.dataset.k = k; b.addEventListener('click', () => hxPick(k)); $('#hxSel').appendChild(b); });
  $$('#mtView button').forEach((b) => b.addEventListener('click', () => muView(+b.dataset.v)));
  ['pdA', 'pdB', 'pdC'].forEach((id) => {
    const s = $('#' + id); MU_OPT.forEach((o, i) => { const op = document.createElement('option'); op.value = String(i); op.textContent = o; s.appendChild(op); });
    s.addEventListener('change', () => { s.classList.remove('bad', 'ok'); S.mu.bad[id] = false; Sound.click(); });
  });
  function inRange(id, lo, hi) { const v = numOf(id); return isFinite(v) && v >= lo && v <= hi; }
  function numHook(id, lo, hi, flag, burst) {
    $('#' + id).addEventListener('input', () => {
      const ok = inRange(id, lo, hi), was = S.ep[flag]; if (ok) S.ep[flag] = true; else if (!was) S.ep[flag] = false;
      $('#' + id).classList.toggle('ok', ok);
      if (ok && !was) { Sound.success(); const q = EG.gr; parts.burst(q.x + q.w / 2, q.y + 120, { count: 12, speed: 150 }); }
      updateCtl();
    });
  }
  numHook('inC100', 35.8, 37.8, 'ok100'); numHook('inC200', 12.5, 14.5, 'ok200');
  numHook('inB', 158, 164, 'calcOk'); numHook('inShift', 66, 72, 'predOk');

  function epResetThr() {
    const e = S.ep; e.c0 = 100; e.mark = 100; $('#epMark').value = 100; e.markOk1 = false; e.calcOk = false; e.predOk = false; e.twiceSeen = false; e.markOk2 = false;
    ['inB', 'inShift'].forEach((id) => { const q = $('#' + id); q.value = ''; q.classList.remove('ok'); });
    updateCtl();
  }

  /* ---------- 단계 · 미션 ---------- */
  const levels = [
    {
      title: '모계 인자와 농도 기울기', short: '모계 인자', icon: '🥚', phase: '관찰',
      intro: '<p class="si-q">❓ 탐구 질문: 수정란 속 물질이 한쪽에 치우쳐 있다는 사실만으로, 어떻게 머리와 꼬리가 구분되고 체절마다 다른 기관이 생길까?</p><p>🔗 <b>앞 차시</b>에서 같은 유전체를 가진 세포도 발현하는 유전자가 다르다는 것을 확인했어요. 이번에는 <b>위치에 따라 발현이 어떻게 다르게 시작되는지</b>를 초파리 초기 배아로 알아봐요.</p><p>초파리 난자 안에서 <b>bicoid mRNA는 앞쪽 끝</b>, <b>nanos mRNA는 뒤쪽 끝</b>에 있어요. 수정 후 bicoid mRNA가 번역되어 만들어진 Bicoid 단백질이 퍼지면 <b>앞이 높고 뒤가 낮은 농도 기울기</b>가 생겨요. (교육용 모형 : C(x) = C0 × e^(−x/100 µm), C0 = 100)</p>',
      features: ['egg'],
      setup() { epReset(); setMode('egg'); },
      recap: 'bicoid mRNA는 알의 앞쪽 끝에 있어서 Bicoid 단백질 농도가 앞이 높고 뒤로 갈수록 낮은 기울기를 이뤄요(100 µm에서 약 37, 200 µm에서 약 14). 모든 핵이 같은 유전체를 가져도 위치에 따라 받는 Bicoid 농도가 달라요.',
      summary: '<ul><li>난자 안의 <b>모계 인자</b> : bicoid mRNA는 앞쪽 끝, nanos mRNA는 뒤쪽 끝에 있어요.</li><li>수정 후 Bicoid 단백질이 앞에서 뒤로 퍼져 <b>농도 기울기</b>가 생겨요. 모형 : C(x) = 100 × e^(−x/100 µm), x = 앞끝에서의 거리 → x = 100 µm에서 약 37, x = 200 µm에서 약 14.</li><li>배아의 핵은 모두 <b>같은 유전체</b>를 가지지만 위치에 따라 <b>받은 Bicoid 농도</b>가 달라요.</li><li>bicoid가 결함인 어미의 배아는 머리와 가슴 구조가 없고 앞쪽에도 꼬리 구조가 생겨요.</li></ul>',
      missions: [
        {
          id: 'grad', title: '농도 기울기 만들고 위치별 농도 읽기',
          goal: '<b>수정</b>시켜 Bicoid 기울기를 만들고, <b>bicoid 결함 어미</b>의 알도 보세요. 그리고 <b>x = 100 µm</b>와 <b>x = 200 µm</b>의 농도를 읽어 입력해요.',
          hint: '▶ 수정 단추 → 기울기가 완성되면 입력칸이 나타나요. 막대(슬라이더)를 100 µm, 200 µm에 맞추면 그래프 위 말풍선에 농도 C가 보여요. 정상 어미로 돌아와 기울기를 완성해야 해요.',
          setup() { epReset(); setMode('egg'); },
          check: () => !!S.ep.gradDone && S.ep.viewedMutant && S.ep.ok100 && S.ep.ok200, hold: 0.8,
          status: () => mark(!!S.ep.gradDone) + ' 기울기 &nbsp; ' + mark(S.ep.viewedMutant) + ' bicoid 결함 어미 &nbsp; ' + mark(S.ep.ok100) + ' 100 µm &nbsp; ' + mark(S.ep.ok200) + ' 200 µm',
          explain: 'Bicoid 농도는 앞끝(x = 0)에서 100이고 x = 100 µm에서 약 <b>37</b>, x = 200 µm에서 약 <b>14</b>로 지수적으로 줄어요. bicoid가 없는 어미의 알에서는 기울기가 생기지 않고, 그 배아는 머리와 가슴이 없어요.',
        },
        {
          type: 'quiz', title: '같은 유전체인데 켜지는 유전자가 다른 까닭',
          goal: '배아의 모든 핵은 같은 유전체를 가지는데, 위치에 따라 켜지는 유전자가 달라지는 까닭은?',
          setup() { setMode('egg'); },
          choices: ['앞쪽 핵만 bicoid 유전자를 가지고 있어서', '핵마다 유전체의 염기 서열이 달라서', '위치에 따라 받는 Bicoid 단백질의 농도가 달라서', '뒤쪽 핵은 유전자를 잃어버려서'],
          answer: 2,
          feedback: ['모든 핵이 같은 유전체를 가져요. bicoid 유전자는 난자를 만든 어미의 것이고, 배아 핵은 모두 가지고 있어요.', '모든 핵은 같은 수정란에서 생긴 같은 유전체를 가져요.', '', '유전자를 잃는 것이 아니에요. 같은 유전체에서 켜지는 유전자가 위치마다 달라져요.'],
          explain: '같은 유전체를 가진 핵이라도 <b>받은 Bicoid 농도가 달라서</b> 농도 문턱이 다른 유전자들이 위치마다 다르게 켜져요. 이것이 몸의 앞뒤 축이 만들어지는 시작이에요.',
        },
      ],
    },
    {
      title: '분절 유전자의 계층', short: '분절 유전자', icon: '📏', phase: '탐구',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> Bicoid가 앞은 높고 뒤는 낮은 농도 기울기를 만든다는 것을 확인했어요.</div><p>이 단백질은 <b>전사 인자</b>예요. 간격 유전자 <b>hunchback</b>은 Bicoid 농도가 <b>문턱 20 이상</b>인 곳에서만 켜져요. 깃발을 C = 20 인 곳에 놓아 경계를 찾고, 식 x = 100 × ln(C0 / 20)으로 계산해요.</p><p>그다음 Bicoid 양(C0)을 <b>2배</b>로 하면 경계가 어디로 갈지 예측해 확인하고, 모계 인자 → 간격 → 쌍 규칙(줄무늬 7개) → 체절 극성(14개 단위) → 혹스 순으로 유전자가 차례로 켜지는 <b>계층</b>을 살펴봐요.</p>',
      features: ['seg'],
      setup() { epResetThr(); hrReset(); setMode('thr'); },
      recap: 'hunchback은 Bicoid 농도 20 이상인 곳에서 켜져 경계가 x = 100 ln(100 / 20) ≈ 161 µm(배아의 약 1/3)예요. Bicoid가 2배면 경계는 약 230 µm로 약 69 µm 뒤로 가요. 앞 단계의 전사 인자가 다음 단계 유전자를 켜는 계층으로 몸이 나뉘어요.',
      summary: '<ul><li><b>간격 유전자 hunchback</b>은 Bicoid 농도가 문턱 <b>20 이상</b>인 곳에서만 켜져요. 경계 x = 100 × ln(C0 / 20).</li><li>C0 = 100 → 경계 약 <b>161 µm</b> (배아 길이 500 µm의 약 1/3). C0 = 200 → 경계 약 <b>230 µm</b>, 즉 약 <b>69 µm</b>(= 100 × ln 2) 뒤로 이동해요.</li><li>유전자 계층 : 모계 인자(농도 기울기) → <b>간격 유전자</b>(큰 구역) → <b>쌍 규칙 유전자</b>(줄무늬 7개) → <b>체절 극성 유전자</b>(체절 14개 단위) → <b>혹스 유전자</b>(체절 정체성).</li><li>앞 단계의 산물(전사 인자)이 다음 단계 유전자의 발현을 조절해서 몸이 점점 정교하게 나뉘어요.</li></ul>',
      missions: [
        {
          id: 'thr', title: '문턱 구역 표시와 경계 계산',
          goal: 'Bicoid 1배에서 깃발을 <b>C = 20</b> 이 되는 곳에 놓고, 경계 위치 <b>x = 100 × ln(100 / 20)</b>(µm)을 계산해 입력하세요.',
          hint: 'ln 5 ≈ 1.61 이므로 x ≈ 161 µm 예요. 깃발은 배아나 그래프를 눌러 끌거나 막대로 옮겨요. 깃발 옆 말풍선의 C 값이 20.0 이 되는 곳을 찾아요.',
          setup() { epResetThr(); setMode('thr'); },
          check: () => S.ep.markOk1 && S.ep.calcOk, hold: 0.8,
          status: () => mark(S.ep.markOk1) + ' 깃발 (C = 20) &nbsp; ' + mark(S.ep.calcOk) + ' 경계 계산',
          explain: 'C(x) = 100 × e^(−x/100) = 20 이면 x = 100 × ln 5 ≈ <b>161 µm</b>예요. hunchback은 이 경계보다 앞쪽(C가 20 이상)에서만 켜져요. 배아 길이 500 µm의 약 1/3 지점이에요.',
        },
        {
          id: 'shift', title: 'Bicoid 2배 : 경계 이동 예측과 확인',
          goal: 'Bicoid 양이 <b>2배</b>(C0 = 200)가 되면 경계가 뒤로 몇 µm 움직일지 <b>예측</b>해 입력하고, <b>2배</b> 단추를 눌러 깃발을 새 경계에 놓아 확인하세요.',
          hint: '2배일 때 x = 100 × ln(200 / 20) ≈ 230 µm 예요. 이동 거리는 230 − 161 = 약 69 µm (= 100 × ln 2)예요.',
          setup() { setMode('thr'); },
          check: () => S.ep.predOk && S.ep.twiceSeen && S.ep.markOk2, hold: 0.8,
          status: () => mark(S.ep.predOk) + ' 예측 &nbsp; ' + mark(S.ep.twiceSeen) + ' 2배 보기 &nbsp; ' + mark(S.ep.markOk2) + ' 새 경계',
          explain: 'C0가 2배면 경계는 x = 100 × ln(200 / 20) ≈ <b>230 µm</b>로, 1배의 161 µm보다 약 <b>69 µm</b>(= 100 ln 2) 뒤로 이동해요. Bicoid가 많으면 문턱 농도에 도달하는 곳이 더 뒤쪽이기 때문이에요.',
        },
        {
          id: 'hier', title: '유전자 계층 켜기',
          goal: '<b>▶ 다음 단계 켜기</b>를 눌러 모계 인자 → 간격 → 쌍 규칙 → 체절 극성 → 혹스를 <b>5단계</b> 모두 켜세요.',
          hint: '단추를 5번 눌러요. 단계가 켜질 때마다 배아 띠가 채워져요.',
          setup() { hrReset(); setMode('hier'); },
          check: () => hrDone(), hold: 0.6,
          status: () => mark(S.hr.level >= 5) + ' 계층 ' + S.hr.level + ' / 5 &nbsp; ' + mark(hrDone()) + ' 모두 표시됨',
          explain: '<b>모계 인자</b>의 농도 기울기가 <b>간격 유전자</b>를 켜 큰 구역을 만들고, 간격 유전자가 <b>쌍 규칙 유전자</b>(줄무늬 7개)를, 그것이 <b>체절 극성 유전자</b>(체절 14개 단위)를 켜요. 마지막으로 체절마다 다른 <b>혹스 유전자</b> 조합이 켜져 정체성이 정해져요.',
        },
        {
          type: 'quiz', title: '몸이 점점 정교하게 나뉘는 까닭',
          goal: 'Bicoid 하나의 농도 기울기에서 시작했는데 체절 14개 단위까지 정교하게 나뉘는 까닭은?',
          setup() { setMode('hier'); },
          choices: ['Bicoid가 모든 체절의 유전자를 직접 하나씩 켜서', '앞 단계 유전자의 산물(전사 인자)이 다음 단계 유전자를 조절하는 계층이 이어져서', '체절마다 유전체가 달라서', '각 단계의 유전자가 서로 관계없이 독립적으로 켜져서'],
          answer: 1,
          feedback: ['Bicoid는 hunchback 같은 간격 유전자 등 일부를 직접 켜고, 그다음 단계는 그 산물이 이어받아요.', '', '모든 체절은 같은 유전체를 가져요.', '독립적이 아니라 앞 단계의 산물이 다음 단계를 조절하는 연쇄예요.'],
          explain: '앞 단계 유전자의 산물인 <b>전사 인자</b>가 다음 단계 유전자의 발현을 조절해요. 이런 <b>계층</b>이 이어지면서 간단한 농도 기울기가 점점 정교한 줄무늬와 체절 구분으로 바뀌어요.',
        },
      ],
    },
    {
      title: '혹스 유전자와 공선성', short: '혹스 유전자', icon: '🧬', phase: '모형',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 모계 인자 → 간격 → 쌍 규칙 → 체절 극성 유전자가 차례로 켜져 체절 14개 단위가 생기는 것을 확인했어요.</div><p>이제 각 체절이 <b>무엇이 될지(정체성)</b>를 정하는 <b>혹스(호메오 박스) 유전자</b>예요. 혹스 유전자는 <b>전사 인자</b> 단백질을 만들어요. 초파리는 8개(복합체 2개)가 있고, <b>염색체 위의 배열 순서가 몸의 앞 → 뒤 발현 부위 순서와 같아요</b>. 이것을 <b>공선성</b>이라고 해요.</p><p>유전자를 눌러 켜지는 부위를 살펴본 뒤 카드를 알맞은 부위에 연결하고, 사람의 혹스 유전자(39개, 클러스터 4개)와 비교해요.</p>',
      features: ['hox'],
      setup() { S.hx = { sel: 0, seen: [1, 0, 0, 0, 0, 0, 0, 0], line: 0 }; mtS.reset(); mtS.markBad([]); setMode('hox'); },
      recap: '초파리 혹스 유전자 8개는 염색체 위 순서(lab → Abd-B)와 몸의 앞 → 뒤 발현 순서(머리 → 배)가 같아요(공선성). 혹스 유전자는 전사 인자를 만들어 체절마다 켜지는 유전자를 달리하게 해요. 사람은 39개(HOXA~D)를 가져요.',
      summary: '<ul><li><b>혹스(호메오 박스) 유전자</b>는 체절의 정체성(어디에 무엇을 만들지)을 정하는 <b>전사 인자</b>를 만드는 유전자예요.</li><li>초파리 8개 : lab, pb, Dfd, Scr, Antp, Ubx, abd-A, Abd-B (복합체 2개). <b>염색체 위 배열 순서 = 몸의 앞 → 뒤 발현 순서</b> (<b>공선성</b>).</li><li>체절마다 켜진 혹스 유전자 조합이 달라서 체절마다 다른 기관이 만들어져요.</li><li>사람은 혹스 유전자가 <b>39개</b>(4개의 클러스터 HOXA~D)이고, 여기서도 배열 순서와 발현 순서가 대응해요. 혹스 유전자는 많은 동물에 있어요.</li></ul>',
      missions: [
        {
          id: 'match', title: '유전자와 체절 연결', manual: true,
          goal: '혹스 유전자 8개를 모두 살펴본 뒤, 카드를 알맞은 <b>몸 부위 칸</b>에 놓고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '염색체 위 순서가 lab → pb → Dfd → Scr → Antp → Ubx → abd-A → Abd-B 예요. 몸의 앞(머리)에서 뒤(배) 순서로 같은 순서가 대응해요.',
          setup() { mtS.reset(); mtS.markBad([]); setMode('match'); },
          check() {
            if (hxSeenN() < 8) return '🧬 혹스 배열 화면에서 8개 유전자를 모두 눌러 켜지는 부위를 살펴봐요 (' + hxSeenN() + ' / 8).';
            const s = mtState();
            if (s.miss.length) { mtS.markBad([]); return '카드 ' + s.miss.length + '장이 아직 보관함에 있어요.'; }
            mtS.markBad(s.bad);
            if (s.bad.length) return '빨간 카드는 자리가 달라요. 염색체 위의 순서와 몸의 앞 → 뒤 순서가 같다는 점을 떠올려요.';
            return true;
          },
          explain: '염색체 위 순서 <b>lab → pb → Dfd → Scr → Antp → Ubx → abd-A → Abd-B</b>가 몸의 <b>머리 ① → ② → ③ → 첫째 가슴 → 둘째 가슴 → 셋째 가슴 → 배 앞쪽 → 배 뒤쪽</b> 순서와 같아요. 이것이 공선성이에요.',
        },
        {
          type: 'quiz', title: '혹스 단백질은 왜 전사 인자일까',
          goal: '혹스 유전자의 산물이 전사 인자라는 사실이 체절의 정체성을 정하는 데 어떻게 도움이 될까요?',
          setup() { setMode('hox'); },
          choices: ['혹스 단백질이 직접 다리와 날개의 재료가 되어서', '여러 유전자를 켜고 끄는 스위치여서, 체절마다 켜지는 유전자 집합을 다르게 조절해서', '혹스 단백질이 DNA를 복제해 체절을 늘려서', '혹스 단백질이 mRNA를 번역해 단백질을 만들어서'],
          answer: 1,
          feedback: ['혹스 단백질은 기관의 재료가 아니라, 어떤 유전자를 켤지 조절하는 전사 인자예요.', '', 'DNA 복제는 다른 효소가 해요. 혹스 단백질의 역할은 유전자 발현 조절이에요.', '번역은 리보솜이 해요. 혹스 단백질은 전사를 조절해요.'],
          explain: '혹스 단백질은 <b>전사 인자</b>라서 여러 유전자를 켜고 끄는 <b>스위치</b> 역할을 해요. 체절마다 켜진 혹스 유전자 조합이 달라 켜지는 유전자 집합도 달라지고, 그 결과 체절마다 다른 기관이 만들어져요.',
        },
      ],
    },
    {
      title: '호메오틱 돌연변이 예측하기', short: '돌연변이', icon: '🪰', phase: '탐구',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 혹스 유전자가 체절의 정체성을 정하고, 염색체 위 순서와 몸의 앞 → 뒤 순서가 같다는 것(공선성)을 확인했어요.</div><p>혹스 유전자가 켜지는 <b>부위가 바뀌거나 기능이 사라지면</b> 어떻게 될까요? <b>Antennapedia</b>는 Antp가 머리에서 잘못 켜진 변이이고, <b>bithorax</b>는 Ubx 기능이 없어진 변이예요. 먼저 <b>결과를 예측</b>한 뒤 실험으로 확인해요. 사람의 HOXD13에 이상이 생기면 어떻게 될지도 예측해 봐요.</p>',
      features: ['mut'],
      setup() { muReset(); setMode('mut'); },
      recap: 'Antp가 머리에서 켜지면 더듬이 자리에 다리가 생기고(Antennapedia), Ubx가 꺼지면 평균곤이 날개가 되어 날개가 4개가 돼요(bithorax). 기관의 구조는 정상이고 정체성(위치)만 바뀐 호메오틱 돌연변이예요. 사람도 혹스 유전자(HOXD13 등)에 이상이 생기면 몸의 형태에 영향이 있을 수 있어요.',
      summary: '<ul><li><b>호메오틱 돌연변이</b> : 한 체절의 정체성이 다른 체절의 것으로 바뀌는 변이예요.</li><li><b>Antennapedia</b> : Antp가 머리에서 잘못 켜져 <b>더듬이 자리에 다리</b>가 생겨요.</li><li><b>bithorax</b> : Ubx 기능이 없어져 셋째 가슴이 둘째 가슴처럼 발달해, <b>평균곤이 날개로 바뀌어 날개가 4개</b>인 파리가 돼요.</li><li>기관의 <b>구조 자체는 정상</b>이고 <b>어디에 무엇을 만들지</b>가 바뀐 거예요.</li><li>사람에서도 HOXD13 이상이 손가락 · 발가락 기형의 원인이 되는 사례가 있어요.</li></ul>',
      missions: [
        {
          id: 'mut', title: '변이 3종 예측하고 확인', manual: true,
          goal: '세 가지 변이의 결과를 <b>예측</b>해 선택하고, 파리 실험 단추로 확인한 뒤 <b>✔ 확인하기</b>를 누르세요.',
          hint: 'Antp(둘째 가슴 유전자)가 머리에서 켜지면 머리 부위가 둘째 가슴처럼 되고, Ubx(셋째 가슴 유전자)가 없으면 셋째 가슴이 둘째 가슴처럼 돼요. 둘째 가슴에는 다리와 날개가 있어요.',
          setup() { muReset(); setMode('mut'); },
          check() {
            const m = S.mu, miss = ['pdA', 'pdB', 'pdC'].filter((id) => $('#' + id).value === '0');
            if (miss.length) return '예측 ' + miss.length + '개가 아직 비어 있어요. 세 가지 모두 골라요.';
            const wrong = ['pdA', 'pdB', 'pdC'].filter((id) => +$('#' + id).value !== MU_KEY[id]);
            ['pdA', 'pdB', 'pdC'].forEach((id) => { const bad = wrong.indexOf(id) >= 0; $('#' + id).classList.toggle('bad', bad); $('#' + id).classList.toggle('ok', !bad); });
            if (wrong.length) return '빨간 칸은 결과가 달라요. 파리 실험 단추로 직접 확인해 보세요.';
            if (!m.seen[1] || !m.seen[2]) return '예측이 맞아요! 위의 두 변이 파리 단추를 눌러 실험으로도 확인해요.';
            return true;
          },
          explain: '<b>Antp가 머리에서 켜지면</b> 더듬이 자리에 다리가, <b>Ubx가 없으면</b> 평균곤이 날개로 바뀌어 날개 4개가 돼요. <b>사람의 HOXD13</b>에 이상이 생기면 손가락 · 발가락 기형이 생긴 사례가 있어요.',
        },
        {
          type: 'quiz', title: '구조는 정상, 위치만 바뀐 까닭',
          goal: 'Antennapedia 파리의 다리는 구조가 정상이에요. 호메오틱 돌연변이에서 기관의 구조가 비정상이 아니라 위치가 바뀐 까닭은?',
          setup() { setMode('mut'); },
          choices: ['기관을 만드는 유전자가 망가져서 구조가 변하기 때문', '혹스 유전자가 체절의 정체성(어디에 무엇을 만들지)을 정해서, 켜지는 위치가 바뀌면 정상 기관이 엉뚱한 곳에 만들어지기 때문', '돌연변이로 체절 수가 늘어나기 때문', '다리 유전자가 사라지기 때문'],
          answer: 1,
          feedback: ['다리를 만드는 유전자는 정상이에요. 달라진 것은 어떤 체절이 다리를 만들게 하는 정체성이에요.', '', '체절 수는 그대로예요. 체절의 정체성이 바뀐 거예요.', '다리를 만드는 프로그램은 그대로 있고, 머리에서도 켜진 거예요.'],
          explain: '혹스 유전자는 <b>"이 체절에 무엇을 만들까"</b>를 정해요. 켜지는 위치가 바뀌면 정상적인 다리가 <b>엉뚱한 곳(더듬이 자리)</b>에 만들어져요. 구조가 비정상이 되는 것이 아니라 위치가 바뀐 거예요.',
        },
        {
          type: 'quiz', title: '사람의 혹스 유전자 이상',
          goal: '사람의 혹스 유전자(예 : HOXD13)에 이상이 생기면 몸의 형태에 영향을 줄 수 있는 이유는?',
          setup() { setMode('human'); },
          choices: ['사람에게는 혹스 유전자가 없어서 영향이 없다', '사람도 혹스 유전자(39개)가 몸의 부위별 발생을 조절하는 전사 인자를 만들어서, 이상이 생기면 몸의 형태가 달라질 수 있다', '혹스 유전자는 혈액형만 정하기 때문이다', '초파리와 사람의 혹스 유전자는 전혀 닮지 않았기 때문이다'],
          answer: 1,
          feedback: ['사람에도 4개의 클러스터에 혹스 유전자가 모두 39개 있어요.', '', '혹스 유전자는 몸 부위의 발생을 조절해요. 혈액형과는 관계가 없어요.', '초파리와 사람의 혹스 유전자는 서로 닮았고, 배열 순서와 발현 순서가 대응하는 점도 같아요.'],
          explain: '사람도 <b>혹스 유전자 39개</b>(HOXA~D)가 몸의 부위별 발생을 조절하는 전사 인자를 만들어요. 이 유전자에 이상이 생기면 몸의 형태에 영향이 있을 수 있어요. 예를 들어 HOXD13 이상은 손가락 · 발가락 기형의 원인이 된 사례가 있어요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hg-embryo-patterning', mount: '#game', badge: '발생 탐험가', homeHref: '../../index.html#hg',
    featureLabels: { egg: '🥚 모계 인자와 농도 기울기', seg: '📏 분절 유전자', hox: '🧬 혹스 유전자 (배열 · 연결 · 사람)', mut: '🪰 호메오틱 돌연변이' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 읽음 칸 ---------- */
  function readouts() {
    const m = S.mode, e = S.ep;
    if (m === 'egg') setReads(['위치 x', e.probe + ' µm', '농도 C', fC(shownC(e.probe)), '어미', e.mother ? 'bicoid 결함' : '정상']);
    else if (m === 'thr') setReads(['Bicoid 양 (C0)', e.c0 + ' (' + (e.c0 === 100 ? '1배' : '2배') + ')', '깃발 x · C', e.mark + ' µm · ' + fC(concAt(e.mark, e.c0)), '경계 위치', Math.abs(e.mark - boundaryOf(e.c0)) <= 4 ? bDisp(e.c0) + ' µm' : '?']);
    else if (m === 'hier') setReads(['켠 단계', S.hr.level + ' / 5', '줄무늬', S.hr.level >= 3 ? '7개' : '—', '체절', S.hr.level >= 4 ? '14개 단위' : '—']);
    else if (m === 'hox') setReads(['고른 유전자', HOX[S.hx.sel].n, '켜지는 부위', HOX[S.hx.sel].region, '살펴본 유전자', hxSeenN() + ' / 8']);
    else if (m === 'match') setReads(['놓은 카드', mtS.cards.filter((c) => c.zone).length + ' / 8', '유전자', '8개', '부위', '8곳']);
    else if (m === 'human') setReads(['사람 혹스', '39개', '클러스터', '4개 (HOXA~D)', '초파리', '8개']);
    else { const k = muCounts(); setReads(['더듬이 · 다리', k.ant + '개 · ' + k.leg + '개', '날개 · 평균곤', k.wing + '개 · ' + k.hal + '개', '변이', ['정상', 'Antennapedia', 'bithorax'][S.mu.view]]); }
  }

  /* ---------- 시작 ---------- */
  mtInit(); mtPT = sorterPT(() => mtS); eggPTo = eggPT(); thrPTo = thrPT();
  setMode('egg');
  let lastFree = false, lastLv = -1;
  function frameFn(dt, t) {
    clock = t; S.t = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (game && game.level !== lastLv) { lastLv = game.level; updateCtl(); }
    view.apply(); ctx.clearRect(0, 0, VW, VH);
    bgFill('#eef4f2', '#e3ece8');
    switch (S.mode) {
      case 'egg': epEggDraw(dt, t); break;
      case 'thr': epThrDraw(dt, t); break;
      case 'hier': hrDraw(dt, t); break;
      case 'hox': hxDraw(dt, t); break;
      case 'match': mtDraw(dt, t); break;
      case 'human': humDraw(dt, t); break;
      case 'mut': muDraw(dt, t); break;
    }
    FX.update(dt); FX.draw();
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(241,246,243,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : approach(S.fade, 0, dt, 9); }
    readouts();
  }
  SciSim.loop(frameFn);

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    frameFn, S, VW, VH, PHONE, get game() { return game; }, levels, setMode, updateCtl, EG, HXG, MTG, MU, HRG, HOX, X, UM, setProbe, setMark, setAmount, epFert, epMother, epReset, hrNext, hrReset, hrDone,
    hxPick, hxSeenN, get mtS() { return mtS; }, mtState, muView, muReset, boundaryOf, concAt, B1, B2, SHIFT, hxBox, MU_KEY,
  };
})();
