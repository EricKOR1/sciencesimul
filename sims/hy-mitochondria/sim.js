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
      if (instant || RM) { c.x = x; c.y = y; c.w = w; c.h = h; SciSim.tween(c, { x, y, w, h }, { duration: 0.0001 }); return; }   // 진행 중인 이동을 끝내요
      SciSim.tween(c, { x, y, w, h }, { duration: 0.35, ease: 'outBack' });
    }
    place(c, zoneId) {
      const was = c.zone; c.zone = zoneId || null; c.bad = false; if (zoneId) c.seq = ++this.seq; c.lift = 0;
      this.layout(); if (was !== c.zone) { Sound.click(); this.o.onChange && this.o.onChange(); }
    }
    reset() { this.cards.forEach((c) => { c.zone = null; c.bad = false; c.sel = false; }); this.drag = null; this.layout(true); this.o.onChange && this.o.onChange(); }
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

  /* ===== 그래프 도우미 ===== */
  const f1 = (v) => { const s = (Math.round(v * 10) / 10).toFixed(1); return s.replace(/\.0$/, ''); };
  const fix1 = (v) => (Math.round(v * 10) / 10).toFixed(1);
  const comma = (v) => String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  function mkPlot(r, o) {
    const m = o.m || { l: 52, t: 34, r: 18, b: 42 };
    const p = { x: r.x + m.l, y: r.y + m.t, w: r.w - m.l - m.r, h: r.h - m.t - m.b, o, r };
    p.X = (v) => p.x + clamp((v - o.x0) / (o.x1 - o.x0), 0, 1) * p.w;
    p.Y = (v) => p.y + p.h - clamp((v - o.y0) / (o.y1 - o.y0), 0, 1) * p.h;
    return p;
  }
  function drawAxes(p) {
    const o = p.o;
    ctx.save();
    (o.yt || []).forEach((v) => {
      const y = p.Y(v);
      ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(p.x, y); ctx.lineTo(p.x + p.w, y); ctx.stroke();
      T(p.x - 7, y + 4.5, o.yfmt ? o.yfmt(v) : String(v), 13, '#64748b', 'right', 700);
    });
    (o.xt || []).forEach((v) => {
      const x = p.X(v);
      ctx.strokeStyle = '#eef2f7'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, p.y); ctx.lineTo(x, p.y + p.h); ctx.stroke();
      T(x, p.y + p.h + 18, o.xfmt ? o.xfmt(v) : String(v), 13, '#64748b', 'center', 700);
    });
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x, p.y + p.h); ctx.lineTo(p.x + p.w, p.y + p.h); ctx.stroke();
    if (o.xl) T(p.x + p.w / 2, p.r.y + p.r.h - 8, o.xl, 13.5, '#475569', 'center', 800);
    if (o.yl) T(p.r.x + 12, p.r.y + 22, o.yl, 14, '#334155', 'left', 800);
    ctx.restore();
  }
  /* 부드럽게 따라가는 숫자 (count-up) */
  class Num {
    constructor(v) { this.v = v || 0; this.t = v || 0; }
    set(t) { this.t = t; }
    snap(t) { this.v = this.t = t; }
    update(dt, rate) { this.v = RM ? this.t : approach(this.v, this.t, dt, rate || 6); if (Math.abs(this.v - this.t) < 1e-4) this.v = this.t; }
  }
  /* 도넛 차트: parts = [{v, col}] */
  function donut(cx, cy, R, r, parts, o) {
    o = o || {};
    const tot = parts.reduce((a, b) => a + Math.max(0, b.v), 0);
    ctx.save();
    if (tot <= 0.0001) { ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = R - r; ctx.beginPath(); ctx.arc(cx, cy, (R + r) / 2, 0, TAU); ctx.stroke(); ctx.restore(); return; }
    let a = -Math.PI / 2;
    parts.forEach((q) => {
      const da = Math.max(0, q.v) / tot * TAU; if (da <= 0.0005) return;
      ctx.beginPath(); ctx.arc(cx, cy, R, a, a + da); ctx.arc(cx, cy, r, a + da, a, true); ctx.closePath();
      ctx.fillStyle = q.col; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
      a += da;
    });
    ctx.restore();
  }
  /* 수 입력: 쉼표 · 단위를 빼고 읽어요 */
  function numIn(id) { return numOf(id); }
  function near(a, b, tol) { return isFinite(a) && Math.abs(a - b) <= (tol == null ? 0.05 : tol); }
  /* 눌러서 쓰는 선택 칸 */
  function selVal(id) { const e = $('#' + id); return e ? e.value : ''; }
  const later = [];
  const after = (sec, fn) => later.push({ t: sec, fn });
  const clearLater = () => { later.length = 0; };
  function updLater(dt) { for (let i = later.length - 1; i >= 0; i--) { const q = later[i]; q.t -= dt; if (q.t <= 0) { later.splice(i, 1); try { q.fn(); } catch (e) { console.error(e); } } } }


  /* =========================================================
     고등학교 세포와 물질대사 · Ⅲ. 세포호흡과 광합성 - 미토콘드리아의 구조 (단원 58, 1차시)
     성취기준 [12세포03-01] 미토콘드리아의 구조를 이해하고 생명체 내에서의 미토콘드리아의 기능을 추론할 수 있다.
     ① 모형: 모형 조립  ② 탐구: 구조와 기능  ③ 분석: 표면적  ④ 적용: 세포 추론
     ========================================================= */
  const S = { mode: 'build', fade: 0 };
  let game = null;
  const f2 = (v) => String(+(Math.round(v * 100) / 100).toFixed(2));
  const fi = (v) => String(Math.round(v));
  const cmix = C.mix;

  /* ---------- 자료 ---------- */
  const MH = 105, MR = 75, MRI = 62;          // 모형 단위: 가운데 선분 절반 길이, 외막 반지름, 내막 반지름
  const CRX = [-72, -36, 0, 36, 72];          // 크리스타 판의 위치(축 방향)
  const PARTS = [
    { id: 'outer', name: '외막', clue: '바깥을 싸는 매끈한 막', col: '#a8561f', anchor: [162, 48, 0] },
    { id: 'ims', name: '막 사이 공간', clue: '두 막 사이의 좁은 틈', col: '#d9822b', anchor: [-158, 44, 0] },
    { id: 'inner', name: '내막', clue: '안으로 접히는 안쪽 막', col: '#c2255c', anchor: [-10, -63, 0] },
    { id: 'crista', name: '크리스타', clue: '내막이 접힌 주름', col: '#e5508a', anchor: [0, 25, 0] },
    { id: 'matrix', name: '기질', clue: '내막 안쪽을 채운 액체', col: '#c9941f', anchor: [62, -22, 0] },
    { id: 'dna', name: 'DNA', clue: '고리 모양 유전 물질', col: '#2563eb', anchor: [-58, -10, 0] },
    { id: 'ribo', name: '리보솜', clue: '작은 단백질 공장 알갱이', col: '#7c3aed', anchor: [112, 6, 0] },
  ];
  const TRAY_ORDER = [3, 0, 4, 6, 2, 5, 1];
  const TAGSLOT = [['top', 2], ['top', 0], ['bot', 1], ['top', 1], ['bot', 2], ['bot', 0], ['bot', 3]];
  const RIBO = (() => { const r = mulberry(11), out = [[112, 6, 0]]; let guard = 0; while (out.length < 14 && guard++ < 400) { const X = -MH - 30 + r() * (2 * MH + 60), Y = (r() - 0.5) * 84, Z = (r() - 0.5) * 70; const dx = Math.max(0, Math.abs(X) - MH), d = Math.hypot(dx, Y, Z); if (d > MRI - 10) continue; if (out.some((q) => Math.hypot(q[0] - X, q[1] - Y, q[2] - Z) < 16)) continue; if (Math.hypot(X + 54, Y + 8, Z) < 19) continue; out.push([X, Y, Z]); } return out; })();

  /* =========================================================
     ① 3D 단면 모형 (조립 · 회전 · 절개)
     ========================================================= */
  S.b = { th: 0.35, s: 0, sT: 0, pitch: 0.32, a: PARTS.map(() => 0), placed: PARTS.map(() => false), tok: [], sel: -1, drag: null, rot: null, hov: -1, nameMode: false, flash: [], cx: 0, cy: 0, sc: 1 };
  const bPlaced = () => S.b.placed.filter(Boolean).length;
  function bLay() {
    return PHONE
      ? { cx: 240, cy: 192, sc: 0.95, topY: 42, botY: 338, topX: [-150, 0, 150], botX: [-171, -57, 57, 171], tx: 10, ty: 372, tcw: 228, tch: 50, tgx: 4, tgy: 6, cols: 2, hintY: 622 }
      : { cx: 400, cy: 212, sc: 1.1, topY: 42, botY: 352, topX: [-230, 0, 230], botX: [-270, -90, 90, 270], tx: 14, ty: 396, tcw: 184, tch: 50, tgx: 12, tgy: 8, cols: 4, hintY: 536 };
  }
  function bTokInit() {
    const g = bLay();
    S.b.tok = TRAY_ORDER.map((pi, k) => {
      const col = k % g.cols, row = Math.floor(k / g.cols), x = g.tx + col * (g.tcw + g.tgx), y = g.ty + row * (g.tch + g.tgy);
      return { pi, x, y, w: g.tcw, h: g.tch, hx: x, hy: y, lift: 0, shake: 0, state: 'tray', alpha: 1 };
    });
  }
  function bReset() {
    const b = S.b; b.placed = PARTS.map(() => false); b.a = PARTS.map(() => 0); b.sel = -1; b.drag = null; b.hov = -1; b.flash.length = 0; bTokInit(); updateCtl();
  }
  function bProj(X, Y, Z) {
    const b = S.b, c = Math.cos(b.th), s = Math.sin(b.th), X1 = X * c + Z * s, Z1 = -X * s + Z * c, cp = Math.cos(b.pitch), sp = Math.sin(b.pitch);
    const Y2 = Y * cp - Z1 * sp, Z2 = Y * sp + Z1 * cp;
    return { x: b.cx + X1 * b.sc, y: b.cy - Y2 * b.sc, z: Z2 };
  }
  const bAnchor = (i) => { const a = PARTS[i].anchor; return bProj(a[0], a[1], a[2]); };
  function stadPath(R) {
    const a = bProj(-MH, 0, 0), e = bProj(MH, 0, 0), r = R * S.b.sc, ang = Math.atan2(e.y - a.y, e.x - a.x);
    ctx.moveTo(a.x + Math.cos(ang + Math.PI / 2) * r, a.y + Math.sin(ang + Math.PI / 2) * r);
    ctx.arc(a.x, a.y, r, ang + Math.PI / 2, ang + Math.PI * 1.5);
    ctx.arc(e.x, e.y, r, ang - Math.PI / 2, ang + Math.PI / 2);
    ctx.closePath();
  }
  function cristaPoly(k) {
    const up = k % 2 === 0, ac = up ? 0 : Math.PI, ro = MRI - 1.5, ri = ro * 0.3, span = Math.PI * 110 / 180, pts = [], n = 14;
    for (let j = 0; j <= n; j++) { const al = ac - span + (2 * span * j) / n; pts.push(bProj(CRX[k], ro * Math.cos(al), ro * Math.sin(al))); }
    for (let j = n; j >= 0; j--) { const al = ac - span + (2 * span * j) / n; pts.push(bProj(CRX[k], ri * Math.cos(al), ri * Math.sin(al))); }
    return pts;
  }
  function dnaPts() {
    const pts = []; for (let j = 0; j <= 40; j++) { const f = (j / 40) * TAU, r = 12 + 2.2 * Math.sin(3 * f); pts.push(bProj(-54 + r * Math.cos(f), -8 + r * Math.sin(f), 0)); } return pts;
  }
  const GHOST = '#8d9bb0';
  function ghostStroke(a, w) { ctx.globalAlpha = a; ctx.strokeStyle = GHOST; ctx.lineWidth = w || 1.8; ctx.setLineDash([6, 5]); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1; }
  function glowStroke(col, w) { const p = 0.55 + 0.35 * Math.sin(clock * 6); ctx.save(); ctx.globalAlpha = p; ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineJoin = 'round'; ctx.stroke(); ctx.restore(); }
  /* 구조 하나를 그려요: mode = 'ghost'(점선) · 'solid'(실선, 투명도 A) · 'glow'(강조) */
  function bBand(A, mode) {   // 막 사이 공간
    ctx.beginPath(); stadPath(MR); stadPath(MRI);
    if (mode === 'ghost') { ctx.save(); ctx.fillStyle = 'rgba(141,155,176,.07)'; ctx.fill('evenodd'); ctx.restore(); }
    else if (mode === 'solid') { ctx.save(); ctx.globalAlpha = A; ctx.fillStyle = 'rgba(251,208,150,.78)'; ctx.fill('evenodd'); ctx.restore(); }
    else { ctx.save(); ctx.fillStyle = 'rgba(245,158,11,.5)'; ctx.globalAlpha = 0.6 + 0.35 * Math.sin(clock * 6); ctx.fill('evenodd'); ctx.restore(); }
  }
  function bMatrix(A, mode) {
    ctx.beginPath(); stadPath(MRI);
    if (mode === 'ghost') { ctx.save(); ctx.fillStyle = 'rgba(141,155,176,.05)'; ctx.fill(); ctx.restore(); }
    else if (mode === 'solid') {
      const a = bProj(0, 0, 0), g = ctx.createRadialGradient(a.x - 30, a.y - 30, 10, a.x, a.y, MRI * S.b.sc * 2.2);
      g.addColorStop(0, '#fff7d9'); g.addColorStop(1, '#f4d58a'); ctx.save(); ctx.globalAlpha = A * 0.9; ctx.fillStyle = g; ctx.fill(); ctx.restore();
    } else { ctx.save(); ctx.fillStyle = 'rgba(234,179,8,.5)'; ctx.globalAlpha = 0.6 + 0.35 * Math.sin(clock * 6); ctx.fill(); ctx.restore(); }
  }
  function bOutline(R, col, A, mode, lw) {   // 외막 · 내막의 선
    ctx.beginPath(); stadPath(R);
    if (mode === 'ghost') ghostStroke(1, 2);
    else if (mode === 'solid') { ctx.save(); ctx.globalAlpha = A; ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.lineJoin = 'round'; ctx.stroke(); ctx.restore(); }
    else glowStroke(col, lw + 7);
  }
  function bItems() {   // 안쪽 구조: 크리스타 판 · DNA · 리보솜 (깊이 순서)
    const b = S.b, items = [];
    for (let k = 0; k < CRX.length; k++) { const pts = cristaPoly(k); items.push({ z: pts.reduce((s, q) => s + q.z, 0) / pts.length, k: 'c', pts, i: 3 }); }
    const dp = dnaPts(); items.push({ z: dp.reduce((s, q) => s + q.z, 0) / dp.length, k: 'd', pts: dp, i: 5 });
    RIBO.forEach((q) => { const p = bProj(q[0], q[1], q[2]); items.push({ z: p.z, k: 'r', p, i: 6 }); });
    items.sort((p, q) => p.z - q.z);
    return items;
  }
  function bItemDraw(it, mode) {
    const b = S.b, A = b.a[it.i], sc = b.sc;
    if (it.k === 'c') {
      ctx.beginPath(); it.pts.forEach((q, j) => (j ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y))); ctx.closePath();
      if (mode === 'ghost') ghostStroke(1, 1.6);
      else if (mode === 'solid') { ctx.save(); ctx.globalAlpha = A; ctx.fillStyle = 'rgba(244,114,182,.55)'; ctx.fill(); ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(244,114,182,.95)'; ctx.lineWidth = 5; ctx.stroke(); ctx.strokeStyle = '#be185d'; ctx.lineWidth = 1.6; ctx.stroke(); ctx.restore(); }
      else { ctx.save(); ctx.fillStyle = 'rgba(244,114,182,.5)'; ctx.fill(); ctx.restore(); glowStroke('#f472b6', 6); }
    } else if (it.k === 'd') {
      ctx.beginPath(); it.pts.forEach((q, j) => (j ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y))); ctx.closePath();
      if (mode === 'ghost') ghostStroke(1, 2);
      else if (mode === 'solid') { ctx.save(); ctx.globalAlpha = A; ctx.strokeStyle = '#1d4ed8'; ctx.lineWidth = 4; ctx.lineJoin = 'round'; ctx.stroke(); ctx.strokeStyle = 'rgba(147,197,253,.9)'; ctx.lineWidth = 1.4; ctx.stroke(); ctx.restore(); }
      else glowStroke('#60a5fa', 9);
    } else {
      const r = 3.6 * sc;
      if (mode === 'ghost') { ctx.beginPath(); ctx.arc(it.p.x, it.p.y, r, 0, TAU); ghostStroke(1, 1.3); }
      else if (mode === 'solid') { ctx.save(); ctx.globalAlpha = A; D.sphere(it.p.x, it.p.y, r, '#7c3aed', { gloss: false }); ctx.restore(); }
      else { ctx.save(); ctx.globalAlpha = 0.6 + 0.35 * Math.sin(clock * 6); D.glow(it.p.x, it.p.y, r * 3.2, '#a78bfa', 0.9); ctx.restore(); }
    }
  }
  function bModel() {
    const b = S.b, A = b.a, fr = (1 - smooth(b.s)) * 0.5;
    // 뒤쪽: 막 사이 공간과 기질
    if (A[1] < 0.99) bBand(0, 'ghost'); if (A[1] > 0.01) bBand(A[1], 'solid');
    if (A[4] < 0.99) bMatrix(0, 'ghost'); if (A[4] > 0.01) bMatrix(A[4], 'solid');
    // 안쪽 구조
    const items = bItems();
    items.forEach((it) => { if (A[it.i] < 0.99) bItemDraw(it, 'ghost'); if (A[it.i] > 0.01) bItemDraw(it, 'solid'); });
    // 앞쪽의 막 (단면을 열면 투명해져요)
    if (fr > 0.01 && (A[0] > 0.02)) {
      const a = bProj(-MH, 0, 0), g = ctx.createLinearGradient(a.x, b.cy - MR * b.sc, a.x, b.cy + MR * b.sc);
      g.addColorStop(0, 'rgba(255,255,255,' + (fr * 0.85) + ')'); g.addColorStop(0.5, 'rgba(255,240,220,' + (fr * 0.35) + ')'); g.addColorStop(1, 'rgba(255,255,255,' + (fr * 0.12) + ')');
      ctx.save(); ctx.globalAlpha = A[0]; ctx.beginPath(); stadPath(MR); ctx.fillStyle = g; ctx.fill(); ctx.restore();
    }
    if (A[2] < 0.99) bOutline(MRI, '', 0, 'ghost'); if (A[2] > 0.01) bOutline(MRI, '#c2255c', A[2], 'solid', 4);
    if (A[0] < 0.99) bOutline(MR, '', 0, 'ghost'); if (A[0] > 0.01) bOutline(MR, '#a8561f', A[0], 'solid', 5);
    // 강조 (표시 위에 끌고 있을 때)
    if (b.hov >= 0 && !b.placed[b.hov]) {
      const i = b.hov;
      if (i === 0) bOutline(MR, '#a8561f', 1, 'glow', 5); else if (i === 1) bBand(1, 'glow'); else if (i === 2) bOutline(MRI, '#c2255c', 1, 'glow', 4); else if (i === 4) bMatrix(1, 'glow');
      else items.filter((it) => it.i === i).forEach((it) => bItemDraw(it, 'glow'));
    }
  }
  /* 모형 바깥의 이름표 */
  function bTags(g) {
    const b = S.b;
    PARTS.forEach((p, i) => {
      if (b.a[i] < 0.05) return;
      const [row, k] = TAGSLOT[i], sx = g.cx + (row === 'top' ? g.topX[k] : g.botX[k]), sy = row === 'top' ? g.topY : g.botY;
      const an = bAnchor(i);
      ctx.save(); ctx.globalAlpha = b.a[i];
      ctx.strokeStyle = 'rgba(71,85,105,.75)'; ctx.lineWidth = 1.4; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(an.x, an.y); ctx.lineTo(sx, sy + (row === 'top' ? 12 : -12)); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = '#334155'; ctx.beginPath(); ctx.arc(an.x, an.y, 3.2, 0, TAU); ctx.fill();
      D.label(sx, sy, p.name, { bg: '#fff', color: C.shade(p.col, -0.25), border: p.col, size: 14 });
      ctx.restore();
    });
  }
  function bPins(g) {
    for (let i = 0; i < 5; i++) {
      const an = bAnchor(NM_PIN[i]), ok = nmOK(i), bad = nmBad(i);
      ctx.save();
      D.shadow(() => { ctx.fillStyle = ok ? '#dcfce7' : bad ? '#fee2e2' : '#fff'; ctx.beginPath(); ctx.arc(an.x, an.y, 14, 0, TAU); ctx.fill(); }, { blur: 5, y: 2 });
      ctx.strokeStyle = ok ? '#16a34a' : bad ? '#e2464b' : '#334155'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(an.x, an.y, 14, 0, TAU); ctx.stroke(); ctx.restore();
      T(an.x, an.y + 5.5, '①②③④⑤'[i], 17, ok ? '#15803d' : bad ? '#b91c1c' : '#1f2d44', 'center', 800);
    }
  }
  const nmVal = (i) => selVal('nm' + i);
  const NM_ANS = ['outer', 'inner', 'ims', 'matrix', 'crista'];
  const NM_PIN = [0, 2, 1, 4, 3];   // 핀 번호 → PARTS 번호  (핀 ①=외막, ②=내막, ③=막 사이 공간, ④=기질, ⑤=크리스타)
  const nmOK = (i) => nmVal(i) === NM_ANS[i];
  const nmBad = (i) => S.nmChk && nmVal(i) !== '' && nmVal(i) !== NM_ANS[i];
  function bTokDraw(t) {
    const p = PARTS[t.pi], done = t.state === 'placed', sel = S.b.sel === t.pi && !done;
    ctx.save();
    const cx = t.x + t.w / 2, cy = t.y + t.h / 2; ctx.translate(cx, cy); const s = 1 + t.lift * 0.06; ctx.scale(s, s);
    if (t.shake > 0 && !RM) ctx.translate(Math.sin(clock * 60) * 3 * t.shake, 0);
    ctx.globalAlpha = done ? 0.5 : 1;
    D.shadow(() => { D.roundRect(-t.w / 2, -t.h / 2, t.w, t.h, 12); ctx.fillStyle = done ? '#eef2f7' : sel ? '#fff8dc' : '#fff'; ctx.fill(); }, { blur: 5 + t.lift * 10, y: 2 + t.lift * 4 });
    D.roundRect(-t.w / 2, -t.h / 2, t.w, t.h, 12); ctx.strokeStyle = sel ? '#f59e0b' : C.shade(p.col, 0.1); ctx.lineWidth = sel ? 3 : 2; ctx.stroke();
    ctx.fillStyle = p.col; D.roundRect(-t.w / 2 + 7, -t.h / 2 + 9, 8, t.h - 18, 4); ctx.fill();
    TF(-t.w / 2 + 24, -3, p.name, t.w - 56, 16, 12.5, '#26324a', 'left', 800);
    TF(-t.w / 2 + 24, 15, p.clue, t.w - 34, 12, 10.5, '#5a6679', 'left', 700);
    if (done) D.check(t.w / 2 - 20, 0, 9, 1);
    ctx.restore();
  }
  function bDraw(dt, t) {
    const b = S.b, g = bLay(); b.cx = g.cx; b.cy = g.cy; b.sc = g.sc;
    b.s = RM ? b.sT : approach(b.s, b.sT, dt, 8); b.pitch = 0.32 * (1 - smooth(b.s));
    PARTS.forEach((p, i) => { b.a[i] = RM ? (b.placed[i] ? 1 : 0) : approach(b.a[i], b.placed[i] ? 1 : 0, dt, 7); if (Math.abs(b.a[i] - (b.placed[i] ? 1 : 0)) < 0.004) b.a[i] = b.placed[i] ? 1 : 0; });
    b.tok.forEach((k) => { k.lift = approach(k.lift, b.drag && b.drag.t === k && b.drag.moved ? 1 : 0, dt, 14); k.shake = Math.max(0, k.shake - dt * 3); });
    // 바닥 접시
    const gy = b.cy + MR * b.sc * 0.98 + 10;
    ctx.save(); const gg = ctx.createRadialGradient(b.cx, gy, 6, b.cx, gy, 250 * g.sc); gg.addColorStop(0, 'rgba(100,116,139,.2)'); gg.addColorStop(1, 'rgba(100,116,139,0)'); ctx.fillStyle = gg; ctx.beginPath(); ctx.ellipse(b.cx, gy, 250 * g.sc, 26 * g.sc, 0, 0, TAU); ctx.fill(); ctx.restore();
    bModel();
    // 표시 · 이름표
    if (b.nameMode) bPins(g); else bTags(g);
    // 아직 못 놓은 부품의 표시
    if (!b.nameMode) PARTS.forEach((p, i) => {
      if (b.placed[i]) return; const an = bAnchor(i), hot = b.hov === i, r = hot ? 17 : 13;
      ctx.save(); D.shadow(() => { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(an.x, an.y, r, 0, TAU); ctx.fill(); }, { blur: 5, y: 2 });
      ctx.strokeStyle = hot ? '#f59e0b' : '#475569'; ctx.lineWidth = hot ? 3 : 2; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.arc(an.x, an.y, r, 0, TAU); ctx.stroke(); ctx.setLineDash([]); ctx.restore();
      T(an.x, an.y + 6, '?', 16, hot ? '#b45309' : '#334155', 'center', 800);
      if (b.drag && b.drag.moved) D.ring(an.x, an.y, 15, t + i * 0.13, { color: '#f59e0b', width: 2 });
    });
    // 안내
    const all = bPlaced() === PARTS.length;
    T(g.cx, g.hintY, b.nameMode ? '핀 ①~⑤가 가리키는 구조의 이름을 오른쪽 목록에서 골라요' : all ? '조립 완료! 화면을 끌어 돌려 보고 단면 슬라이더로 열어 보세요' : '부품 카드를 모형의 물음표(?)로 끌어다 놓아요', 13.5, '#64748b', 'center', 800);
    // 부품 카드
    if (!b.nameMode && !all) { b.tok.forEach((k) => { if (!(b.drag && b.drag.t === k)) bTokDraw(k); }); if (b.drag) bTokDraw(b.drag.t); }
    else if (!b.nameMode) b.tok.forEach(bTokDraw);
    // 배율 표시
    T(g.cx, PHONE ? 366 : 385, '길이 1~2 μm · 지름 약 0.5 μm', 12.5, '#7b8aa0', 'center', 700);
  }
  function bFindMarker(p, rad) {
    let bi = -1, bd = rad || 46;
    PARTS.forEach((q, i) => { if (S.b.placed[i]) return; const a = bAnchor(i), d = Math.hypot(a.x - p.x, a.y - p.y); if (d < bd) { bd = d; bi = i; } });
    return bi;
  }
  function bPlace(t, i) {
    const b = S.b, an = bAnchor(i); b.drag = null; b.sel = -1;
    if (t.pi !== i) { t.shake = 1; Sound.fail(); showHint('그 자리는 ' + PARTS[t.pi].name + josa(PARTS[t.pi].name, '이', '가') + ' 아니에요. 점선 모양과 설명을 잘 맞춰 보세요.', 3200); SciSim.tween(t, { x: t.hx, y: t.hy }, { duration: RM ? 0.01 : 0.35, ease: 'outBack' }); return false; }
    b.placed[i] = true; t.state = 'placed'; Sound.success(); hideHint();
    parts.burst(an.x, an.y, { count: 14, colors: [PARTS[i].col, '#fff', '#fbbf24'], speed: 120, life: 0.7, gravity: 80 });
    FX.add({ kind: 'text', x: an.x, y: an.y - 18, life: 1, text: PARTS[i].name, color: C.shade(PARTS[i].col, -0.2), size: 15 });
    SciSim.tween(t, { x: t.hx, y: t.hy }, { duration: RM ? 0.01 : 0.3, ease: 'outBack' });
    updateCtl(); return true;
  }
  const bPT = {
    down(p) {
      const b = S.b;
      if (!b.nameMode) {
        for (let k = b.tok.length - 1; k >= 0; k--) { const t = b.tok[k]; if (t.state === 'tray' && inRect(p.x, p.y, t)) { SciSim.tween(t, { x: t.x, y: t.y }, { duration: 0.0001 }); b.drag = { t, dx: p.x - t.x, dy: p.y - t.y, sx: p.x, sy: p.y, moved: false }; Sound.tick(); return true; } }
        if (b.sel >= 0) { const i = bFindMarker(p, 40); if (i >= 0) { const t = b.tok.find((q) => q.pi === b.sel); if (t) bPlace(t, i); return false; } }
      }
      b.rot = { sx: p.x, th0: b.th, moved: false }; return true;
    },
    move(p) {
      const b = S.b;
      if (b.drag) { const d = b.drag; if (Math.hypot(p.x - d.sx, p.y - d.sy) > 8) d.moved = true; if (d.moved) { d.t.x = clamp(p.x - d.dx, 0, VW - d.t.w); d.t.y = clamp(p.y - d.dy, 0, VH - d.t.h); b.hov = bFindMarker(p, 46); } }
      else if (b.rot) { if (Math.abs(p.x - b.rot.sx) > 4) b.rot.moved = true; b.th = b.rot.th0 + (p.x - b.rot.sx) * 0.012; }
    },
    up(p) {
      const b = S.b;
      if (b.drag) {
        const d = b.drag, t = d.t; b.hov = -1;
        if (!d.moved) { b.drag = null; b.sel = b.sel === t.pi ? -1 : t.pi; SciSim.tween(t, { x: t.hx, y: t.hy }, { duration: 0.0001 }); return; }
        const i = bFindMarker(p, 46); if (i >= 0) bPlace(t, i); else { b.drag = null; SciSim.tween(t, { x: t.hx, y: t.hy }, { duration: RM ? 0.01 : 0.35, ease: 'outBack' }); }
      }
      b.rot = null;
    },
    hover(p) { const b = S.b; return b.tok.some((t) => t.state === 'tray' && inRect(p.x, p.y, t)) && !b.nameMode ? 'grab' : 'ew-resize'; },
  };
  function bSpin() { const b = S.b; if (RM) { b.th += TAU; return; } SciSim.tween(b, { th: b.th + TAU }, { duration: 1.6, ease: 'inOutCubic' }); }
  function bFront() { const b = S.b; const tg = Math.round(b.th / TAU) * TAU; if (RM) b.th = tg; else SciSim.tween(b, { th: tg }, { duration: 0.6, ease: 'outCubic' }); }
  function bCut(v) { S.b.sT = clamp(v, 0, 1); $('#sCut').value = Math.round(S.b.sT * 100); updateCtl(); }

  /* =========================================================
     ② 위치 지도 (반응 카드 → 구역)  +  내막 확대 (시안화물)
     ========================================================= */
  const MAPC = [
    { id: 'glyc', label: '해당 과정', short: '해당 과정', sub: '포도당 → 피루브산', icon: '🍬', col: '#16a34a', ans: 'cyto', why: '해당 과정은 미토콘드리아가 없는 세포에서도 일어나요. 세포질에서 진행돼요.' },
    { id: 'pyox', label: '피루브산 산화', short: '피루브산 산화', sub: '피루브산 → 아세틸 CoA + CO₂', icon: '✂️', col: '#0ea5e9', ans: 'matrix', why: '피루브산이 미토콘드리아로 들어와 기질에서 산화돼요.' },
    { id: 'tca', label: 'TCA 회로', short: 'TCA 회로', sub: 'CO₂ 방출 · 전자 운반체 충전', icon: '🔄', col: '#8b5cf6', ans: 'matrix', why: 'TCA 회로의 효소는 내막 안쪽 액체인 기질에 있어요.' },
    { id: 'etc', label: '전자 전달과 ATP 합성', short: '전자 전달 · ATP', sub: '전자 이동으로 ATP 만들기', icon: '⚡', col: '#e11d74', ans: 'inner', why: '전자 전달 단백질과 ATP 합성 효소는 내막에 박혀 있어요.' },
    { id: 'hst', label: 'H⁺ 저장', short: 'H⁺ 저장', sub: '화학 삼투의 준비', icon: '💧', col: '#d9822b', ans: 'ims', why: '내막 바깥쪽, 두 막 사이의 좁은 공간에 H⁺ 가 모여요.' },
  ];
  const MAPZ = [['cyto', '세포질', '#16a34a'], ['ims', '막 사이 공간', '#d9822b'], ['inner', '내막', '#c2255c'], ['matrix', '기질', '#c9941f']];
  S.mp = { so: null, pick: null };
  function mpG() {
    if (PHONE) {
      const bw = 226, bh = 212, boxes = MAPZ.map(([id, label, col], k) => ({ id, label, col, x: 10 + (k % 2) * (bw + 8), y: 10 + Math.floor(k / 2) * (bh + 8), w: bw, h: bh, cols: 1, hdr: 68, draw: mpArt }));
      return { boxes, cw: 228, ch: 50, kh: 30, tray: (i) => ({ x: 10 + (i % 2) * 236, y: 456 + Math.floor(i / 2) * 56 }) };
    }
    const bw = 184, boxes = MAPZ.map(([id, label, col], k) => ({ id, label, col, x: 14 + k * (bw + 12), y: 14, w: bw, h: 322, cols: 1, hdr: 86, draw: mpArt }));
    return { boxes, cw: 250, ch: 58, kh: 36, tray: (i) => ({ x: 14 + (i % 3) * 261, y: 356 + Math.floor(i / 3) * 68 }) };
  }
  function mpArt(b) {
    const ax = b.x + 10, aw = b.w - 20, ay = b.y + 30, ah = (b.hdr || 80) - 38, cy = ay + ah / 2;
    ctx.save(); ctx.beginPath(); D.roundRect(ax, ay, aw, ah, 8); ctx.clip();
    if (b.id === 'cyto') {
      ctx.fillStyle = 'rgba(134,239,172,.35)'; ctx.fillRect(ax, ay, aw, ah);
      for (let k = 0; k < 6; k++) { const a = k / 6 * TAU; D.sphere(ax + aw * 0.28 + Math.cos(a) * ah * 0.2, cy + Math.sin(a) * ah * 0.2, ah * 0.1, '#475569', { gloss: false }); }
      T(ax + aw * 0.62, cy + 5, '6C → 3C', 13, '#166534', 'left', 800);
    } else if (b.id === 'ims') {
      ctx.fillStyle = 'rgba(251,208,150,.7)'; ctx.fillRect(ax, ay, aw, ah);
      ctx.strokeStyle = '#a8561f'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(ax, ay + 3); ctx.lineTo(ax + aw, ay + 3); ctx.stroke();
      ctx.strokeStyle = '#c2255c'; ctx.beginPath(); ctx.moveTo(ax, ay + ah - 3); ctx.lineTo(ax + aw, ay + ah - 3); ctx.stroke();
      for (let k = 0; k < 7; k++) { T(ax + 12 + k * (aw - 24) / 6, cy + 4 + Math.sin(clock * 2 + k) * 3, 'H⁺', 11, '#b45309', 'center', 800); }
    } else if (b.id === 'inner') {
      ctx.fillStyle = 'rgba(251,208,150,.55)'; ctx.fillRect(ax, ay, aw, ah / 2); ctx.fillStyle = 'rgba(255,243,207,.9)'; ctx.fillRect(ax, ay + ah / 2, aw, ah / 2);
      ctx.strokeStyle = '#c2255c'; ctx.lineWidth = 4; ctx.beginPath(); for (let x = 0; x <= aw; x += 4) { const y = cy + Math.sin(x / aw * TAU * 2.5) * ah * 0.2; if (x) ctx.lineTo(ax + x, y); else ctx.moveTo(ax + x, y); } ctx.stroke();
      [0.25, 0.5, 0.75].forEach((f) => D.sphere(ax + aw * f, cy + Math.sin(f * TAU * 2.5) * ah * 0.2, ah * 0.13, '#be185d', { gloss: false }));
    } else {
      const g = ctx.createLinearGradient(0, ay, 0, ay + ah); g.addColorStop(0, '#fff7d9'); g.addColorStop(1, '#f4d58a'); ctx.fillStyle = g; ctx.fillRect(ax, ay, aw, ah);
      ctx.strokeStyle = '#1d4ed8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(ax + aw * 0.3, cy, ah * 0.3, ah * 0.28, 0, 0, TAU); ctx.stroke();
      for (let k = 0; k < 5; k++) D.sphere(ax + aw * (0.58 + (k % 3) * 0.12), cy + (k < 3 ? -ah * 0.14 : ah * 0.16), ah * 0.08, '#7c3aed', { gloss: false });
    }
    ctx.restore();
    ctx.strokeStyle = 'rgba(71,85,105,.35)'; ctx.lineWidth = 1.2; D.roundRect(ax, ay, aw, ah, 8); ctx.stroke();
  }
  function mpBuild() {
    const g = mpG();
    S.mp.so = new Sorter({ cards: MAPC, boxes: g.boxes, tray: g.tray, cw: g.cw, ch: g.ch, kh: g.kh, onChange() { S.mp.pick = null; updateCtl(); }, onTap(c) { S.mp.pick = S.mp.pick === c ? null : c; Sound.tick(); }, isSel: (c) => S.mp.pick === c });
    S.mp.so.cards.forEach((c, i) => { c.ans = MAPC[i].ans; });
  }
  const mpPT = {
    down(p) { const so = S.mp.so; if (so.down(p)) return true; if (S.mp.pick) { const bx = so.boxAt(p); if (bx) { const c = S.mp.pick; S.mp.pick = null; so.place(c, bx.id); } } return false; },
    move(p) { S.mp.so.move(p); }, up(p) { S.mp.so.up(p); }, hover(p) { return S.mp.so.hover(p); },
  };
  function mpDraw(dt, t) {
    const so = S.mp.so; so.update(dt);
    so.draw();
    const g = mpG(), unplaced = so.cards.some((c) => !c.zone);
    if (!PHONE) T(400, 534, unplaced ? '카드를 끌어서 반응이 일어나는 곳에 놓아요 (바깥 → 안쪽 순서로 놓인 구역이에요)' : '모두 놓았어요. 아래 "확인하기"를 눌러 보세요', 13.5, '#64748b', 'center', 800);
    else T(240, 636, unplaced ? '카드를 끌어서 알맞은 구역에 놓아요' : '모두 놓았어요! "확인하기"를 눌러요', 13.5, '#64748b', 'center', 800);
  }
  const mpWrong = () => S.mp.so.cards.filter((c) => c.zone && c.zone !== c.ans);

  /* ---------- 내막 확대 ---------- */
  S.zm = { cn: false, o2: new Num(100), atp: new Num(100), run: 1, els: [], hs: [], atpFly: [], spin: 0, atpT: 0, info: '', infoT: 0, spawnT: 0 };
  function znG() {
    const A = PHONE ? { x: 10, y: 10, w: 460, h: 470 } : { x: 14, y: 14, w: 772, h: 408 };
    const memY = A.y + A.h * 0.48, th = 30;
    const cxs = [0.17, 0.37, 0.57].map((f) => A.x + A.w * f);
    return { A, memY, th, cxs, cw: PHONE ? 66 : 84, chh: 58, sx: A.x + A.w * 0.83, ims: { x: A.x + 10, y: A.y + 34, w: A.w - 20, h: memY - th / 2 - 8 - (A.y + 34) }, mat: { x: A.x + 10, y: memY + th / 2 + 8, w: A.w - 20, h: A.y + A.h - 10 - (memY + th / 2 + 8) } };
  }
  function znPath(g) {
    const my = g.memY;
    return [{ x: g.A.x + 44, y: my + 74 }, { x: g.cxs[0], y: my + 8 }, { x: g.cxs[1], y: my + 8 }, { x: g.cxs[2], y: my + 8 }, { x: g.cxs[2], y: my + 62 }];
  }
  function znReset() {
    const z = S.zm; z.cn = false; z.o2.snap(100); z.atp.snap(100); z.run = 1; z.els.length = 0; z.atpFly.length = 0; z.hs.length = 0; z.info = ''; z.infoT = 0; z.spawnT = 0; z.atpT = 0;
    const g = znG(); for (let k = 0; k < 20; k++) z.hs.push({ x: g.ims.x + 14 + Math.random() * (g.ims.w - 28), y: g.ims.y + 8 + Math.random() * (g.ims.h - 16), vx: (Math.random() - 0.5) * 30, vy: (Math.random() - 0.5) * 30, a: 1, die: false });
    updateCtl();
  }
  function znSetDrug(cn) { const z = S.zm; z.cn = cn; if (cn) showHint('시안화물이 전자 전달의 마지막 단백질 복합체를 막았어요.', 3600); Sound.click(); updateCtl(); }
  function znUpdate(dt) {
    const z = S.zm, g = znG(), path = znPath(g);
    z.o2.set(z.cn ? 0 : 100); z.atp.set(z.cn ? 0 : 100); z.o2.update(dt, 4); z.atp.update(dt, 4);
    z.run = approach(z.run, z.cn ? 0 : 1, dt, 3.5);
    if (RM) z.run = z.cn ? 0 : 1;
    // 전자 만들기와 이동
    z.spawnT -= dt * (z.cn ? 0 : 1);
    const stalled = z.els.filter((e) => e.seg >= 2 && e.stuck).length;
    if (z.spawnT <= 0 && z.els.length < 9 && !z.cn) { z.spawnT = 0.55; z.els.push({ seg: 0, p: 0, x: path[0].x, y: path[0].y, stuck: false }); }
    for (let i = z.els.length - 1; i >= 0; i--) {
      const e = z.els[i], a = path[e.seg], b = path[e.seg + 1], len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      const blocked = z.cn && e.seg === 2 && e.p > 0.55;
      e.stuck = blocked;
      if (!blocked) e.p += dt * 150 / len;
      if (e.p >= 1) {
        e.seg++; e.p = 0;
        if (e.seg >= 4) { // 산소에 도착: 물이 되어요
          const q = path[4]; parts.burst(q.x, q.y + 8, { count: 5, colors: ['#38bdf8', '#bae6fd'], speed: 50, life: 0.6, gravity: -20, shape: 'bubble', size: 3 });
          z.els.splice(i, 1); continue;
        }
        if (e.seg <= 3) { z.hs.push({ x: path[e.seg].x, y: g.memY + 6, vx: (Math.random() - 0.5) * 30, vy: -80, a: 0, die: false, born: true }); }
      }
      const a2 = path[e.seg], b2 = path[e.seg + 1]; e.x = a2.x + (b2.x - a2.x) * e.p; e.y = a2.y + (b2.y - a2.y) * e.p;
    }
    // H⁺
    const want = Math.round(8 + 16 * z.run), live = z.hs.filter((q) => !q.die).length;
    if (live > want) { let n = live - want; for (let i = 0; i < z.hs.length && n > 0; i++) if (!z.hs[i].die && !z.hs[i].born) { z.hs[i].die = true; n--; } }
    const im = g.ims;
    for (let i = z.hs.length - 1; i >= 0; i--) {
      const q = z.hs[i]; q.a = q.die ? q.a - dt * 1.5 : Math.min(1, q.a + dt * 3); if (q.a < 0) { z.hs.splice(i, 1); continue; }
      q.vx += (Math.random() - 0.5) * 120 * dt; q.vy += (Math.random() - 0.5) * 120 * dt; const sp = Math.hypot(q.vx, q.vy); if (sp > 55 && !q.born) { q.vx *= 55 / sp; q.vy *= 55 / sp; }
      q.x += q.vx * dt; q.y += q.vy * dt;
      if (q.y < im.y + im.h) q.born = false;
      if (!q.born) { if (q.x < im.x + 8) { q.x = im.x + 8; q.vx = Math.abs(q.vx); } if (q.x > im.x + im.w - 8) { q.x = im.x + im.w - 8; q.vx = -Math.abs(q.vx); } if (q.y < im.y + 6) { q.y = im.y + 6; q.vy = Math.abs(q.vy); } if (q.y > im.y + im.h - 4) { q.y = im.y + im.h - 4; q.vy = -Math.abs(q.vy); } }
    }
    // ATP 합성 효소
    z.spin += dt * 5 * z.run;
    z.atpT -= dt * z.run;
    if (z.atpT <= 0 && z.run > 0.2) { z.atpT = 0.9; z.atpFly.push({ x: g.sx, y: g.memY + g.th / 2 + 52, t: 0 }); }
    for (let i = z.atpFly.length - 1; i >= 0; i--) { const f = z.atpFly[i]; f.t += dt; f.y -= 0; if (f.t > 1.4) z.atpFly.splice(i, 1); }
    z.infoT = Math.max(0, z.infoT - dt);
  }
  function znDraw(dt, t) {
    const z = S.zm, g = znG(), A = g.A, my = g.memY, th = g.th;
    znUpdate(dt);
    panel(A.x, A.y, A.w, A.h, 18, '#fffdf7');
    // 막 사이 공간 · 기질
    D.roundRect(g.ims.x, g.ims.y, g.ims.w, g.ims.h, 12); ctx.fillStyle = 'rgba(251,208,150,.55)'; ctx.fill();
    D.roundRect(g.mat.x, g.mat.y, g.mat.w, g.mat.h, 12); const mg = ctx.createLinearGradient(0, g.mat.y, 0, g.mat.y + g.mat.h); mg.addColorStop(0, '#fff7d9'); mg.addColorStop(1, '#f4d58a'); ctx.fillStyle = mg; ctx.fill();
    T(g.ims.x + 12, g.ims.y + 20, '막 사이 공간', 14.5, '#9a5b12', 'left', 800);
    T(g.mat.x + 12, g.mat.y + 22, '기질 (매트릭스)', 14.5, '#8a6410', 'left', 800);
    // 지질 이중층
    const x0 = A.x + 10, x1 = A.x + A.w - 10;
    ctx.fillStyle = 'rgba(244,114,182,.3)'; ctx.fillRect(x0, my - th / 2, x1 - x0, th);
    for (let x = x0 + 6; x < x1 - 4; x += 12) { D.sphere(x, my - th / 2 + 2, 4.4, '#f472b6', { gloss: false }); D.sphere(x, my + th / 2 - 2, 4.4, '#f472b6', { gloss: false }); ctx.strokeStyle = 'rgba(190,24,93,.4)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x, my - th / 2 + 6); ctx.lineTo(x, my - 1); ctx.moveTo(x, my + 1); ctx.lineTo(x, my + th / 2 - 6); ctx.stroke(); }
    T(x1 - 4, my - th / 2 - 5, '내막', 14, '#be185d', 'right', 800);
    // 전자 전달 단백질 복합체 3개
    g.cxs.forEach((cx, k) => {
      const hot = k === 2 && z.cn;
      D.shadow(() => { D.roundRect(cx - g.cw / 2, my - g.chh / 2, g.cw, g.chh, 20); ctx.fillStyle = hot ? '#fecaca' : '#a5b4fc'; ctx.fill(); }, { blur: 6, y: 2 });
      D.roundRect(cx - g.cw / 2, my - g.chh / 2, g.cw, g.chh, 20); ctx.strokeStyle = hot ? '#dc2626' : '#4f46e5'; ctx.lineWidth = 2.5; ctx.stroke();
      T(cx, my + 5, ['복합체 ①', '복합체 ②', '복합체 ③'][k], PHONE ? 11.5 : 13, hot ? '#991b1b' : '#312e81', 'center', 800);
    });
    if (z.cn) { const cx = g.cxs[2]; D.sphere(cx + g.cw / 2 - 2, my - g.chh / 2 + 2, 14, '#dc2626', { gloss: false, text: '✖' }); }
    // ATP 합성 효소
    const sx = g.sx, hy = my + th / 2 + 40;
    ctx.save(); ctx.fillStyle = '#facc15'; ctx.strokeStyle = '#a16207'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(sx, my, 26, th / 2 + 8, 0, 0, TAU); ctx.fillStyle = '#fde68a'; ctx.fill(); ctx.stroke();
    ctx.save(); ctx.translate(sx, my); ctx.rotate(z.spin); ctx.fillStyle = '#f59e0b'; ctx.fillRect(-4, -12, 8, 24); ctx.restore();
    ctx.fillStyle = '#d97706'; ctx.fillRect(sx - 5, my + th / 2, 10, 22);
    D.sphere(sx, hy + 10, 24, '#fbbf24', { gloss: true, outline: '#a16207' });
    ctx.save(); ctx.translate(sx, hy + 10); ctx.rotate(z.spin * 0.6); ctx.fillStyle = '#b45309'; ctx.fillRect(-2.5, -12, 5, 12); ctx.restore();
    ctx.restore();
    T(sx, hy + 46, 'ATP 합성 효소', PHONE ? 12 : 13.5, '#92400e', 'center', 800);
    // H⁺
    z.hs.forEach((q) => { ctx.save(); ctx.globalAlpha = Math.max(0, q.a); T(q.x, q.y + 4, 'H⁺', 11.5, '#c2410c', 'center', 800); ctx.restore(); });
    // 전자 · 산소 · NADH
    const path = znPath(g);
    D.sphere(path[0].x, path[0].y + 4, 17, '#34d399', { gloss: true, text: 'NADH', textScale: 0.62 });
    D.sphere(path[4].x - 18, path[4].y + 10, 11, '#ef4444', { gloss: true }); D.sphere(path[4].x + 2, path[4].y + 10, 11, '#ef4444', { gloss: true }); T(path[4].x - 8, path[4].y + 36, 'O₂', 13.5, '#b91c1c', 'center', 800);
    z.els.forEach((e) => { D.glow(e.x, e.y, 14, '#facc15', 0.5); D.sphere(e.x, e.y, 7, '#fde047', { gloss: false, text: 'e⁻', textColor: '#713f12', textScale: 1.0 }); });
    // ATP 방울
    z.atpFly.forEach((f) => { const p = f.t / 1.4; ctx.save(); ctx.globalAlpha = 1 - p * p; D.label(f.x + 14 + p * 50, f.y - 6 - p * 70, 'ATP', { bg: '#facc15', color: '#713f12', size: 13 }); ctx.restore(); });
    // 게이지
    znGauges(g, t);
    // 설명
    if (z.infoT > 0 && z.info) { ctx.save(); ctx.globalAlpha = Math.min(1, z.infoT); D.label(A.x + A.w / 2, A.y + A.h - 22, z.info, { bg: 'rgba(31,45,68,.92)', color: '#fff', size: PHONE ? 12 : 13.5 }); ctx.restore(); }
  }
  function znGauges(g, t) {
    const z = S.zm, A = g.A, bx = PHONE ? 10 : 14, by = PHONE ? 514 : 458, bw = PHONE ? 460 : 560;
    const bar = (y, label, v, col) => {
      T(bx + 4, y, label, 14.5, '#334155', 'left', 800);
      const x = bx + (PHONE ? 126 : 150), w = (PHONE ? 220 : 330);
      D.roundRect(x, y - 14, w, 20, 10); ctx.fillStyle = '#e7edf5'; ctx.fill();
      if (v > 0.2) { D.roundRect(x, y - 14, Math.max(20, w * v / 100), 20, 10); ctx.fillStyle = col; ctx.fill(); }
      T(x + w + 10, y + 2, fi(v), 16, '#1f2d44', 'left', 800);
    };
    panel(bx, by - 28, PHONE ? 460 : 772, PHONE ? 110 : 116, 16, '#fff');
    bar(by + 2, '산소 소비 (상대)', z.o2.v, '#ef4444'); bar(by + 44, 'ATP 생산 (상대)', z.atp.v, '#f59e0b');
    const a = clamp(z.atp.v / 100, 0, 1), fx = PHONE ? 430 : 700, fy = by + 22;
    ctx.save(); ctx.globalAlpha = 0.18 + 0.82 * a; E('🔥', fx, fy - 4 + Math.sin(t * 9) * 1.5 * a, 22 + 24 * a); ctx.restore();
    T(fx, fy + 36, '에너지 불꽃', 12.5, '#64748b', 'center', 800);
  }
  const znHits = (p) => {
    const g = znG(); const ks = [];
    g.cxs.forEach((cx, k) => { if (Math.abs(p.x - cx) < g.cw / 2 + 4 && Math.abs(p.y - g.memY) < g.chh / 2 + 4) ks.push('cx'); });
    if (Math.hypot(p.x - g.sx, p.y - (g.memY + g.th / 2 + 50)) < 40) ks.push('syn');
    return ks[0] || '';
  };
  const znPT = {
    down(p) { const k = znHits(p); if (!k) return false; const z = S.zm; z.info = k === 'cx' ? '전자 전달 단백질 복합체: 전자를 차례로 전달해요' : 'ATP 합성 효소: ADP + Pi 로 ATP 를 만들어요'; z.infoT = 3.2; Sound.tick(); return true; },
    move() {}, up() {}, hover(p) { return znHits(p) ? 'pointer' : 'default'; },
  };

  /* =========================================================
     ③ 표면적 (크리스타 판 수 N)
     ========================================================= */
  const AR0 = 3.5;                                  // 외막 겉넓이 (μm²), 원통 모형 π×0.5×2 + 2×π×0.25² ≈ 3.5
  const arArea = (n) => AR0 * (1 + 0.5 * n);        // 내막 표면적 모형
  const arMult = (n) => 1 + 0.5 * n;                // ATP 생산 능력 (N = 0 의 몇 배)
  const arDots = (n) => 10 + 5 * n;                 // ATP 합성 효소 점의 수
  S.ar = { N: 0, cmp: false, pl: Array.from({ length: 12 }, (_, k) => ({ x: 0, g: 0, init: false })), gA: new Num(AR0), gM: new Num(1), pulse: 0 };
  function arG() {
    return PHONE
      ? { P1: { x: 10, y: 10, w: 460, h: 238 }, P2: { x: 10, y: 256, w: 460, h: 150 }, P3: { x: 10, y: 414, w: 460, h: 216 } }
      : { P1: { x: 14, y: 14, w: 540, h: 300 }, P2: { x: 566, y: 14, w: 220, h: 300 }, P3: { x: 14, y: 326, w: 772, h: 220 } };
  }
  function arSetN(n) { n = clamp(Math.round(n), 0, 12); if (n !== S.ar.N) { S.ar.N = n; S.ar.pulse = 1; } $('#sN').value = n; updateCtl(); }
  /* 길쭉한 알약(스타디움) 둘레 위의 점: u 는 0~1 */
  function stadPt(cx, cy, hw, hh, u) {
    const r = hh, sl = 2 * (hw - r), per = 2 * sl + TAU * r, d = ((u % 1) + 1) % 1 * per;
    if (d < sl) return { x: cx - (hw - r) + d, y: cy - r, nx: 0, ny: -1 };
    if (d < sl + Math.PI * r) { const a = -Math.PI / 2 + (d - sl) / r; return { x: cx + (hw - r) + Math.cos(a) * r, y: cy + Math.sin(a) * r, nx: Math.cos(a), ny: Math.sin(a) }; }
    if (d < 2 * sl + Math.PI * r) { return { x: cx + (hw - r) - (d - sl - Math.PI * r), y: cy + r, nx: 0, ny: 1 }; }
    const a = Math.PI / 2 + (d - 2 * sl - Math.PI * r) / r; return { x: cx - (hw - r) + Math.cos(a) * r, y: cy + Math.sin(a) * r, nx: Math.cos(a), ny: Math.sin(a) };
  }
  function stadFill(cx, cy, hw, hh) { ctx.beginPath(); ctx.moveTo(cx - hw + hh, cy - hh); ctx.lineTo(cx + hw - hh, cy - hh); ctx.arc(cx + hw - hh, cy, hh, -Math.PI / 2, Math.PI / 2); ctx.lineTo(cx - hw + hh, cy + hh); ctx.arc(cx - hw + hh, cy, hh, Math.PI / 2, Math.PI * 1.5); ctx.closePath(); }
  /* 단면 그림: rect 안에 크리스타 판 n 개 (pl: 판의 애니메이션 상태, 없으면 정지 상태) */
  function arMito(rc, n, pl, cap) {
    const hw = rc.w / 2 - 12, hh = Math.min(rc.h / 2 - 34, hw * 0.44), cx = rc.x + rc.w / 2, cy = rc.y + rc.h / 2 + 6, gap = Math.max(9, hh * 0.1);
    const ihw = hw - gap, ihh = hh - gap;
    D.shadow(() => { stadFill(cx, cy, hw, hh); ctx.fillStyle = 'rgba(251,208,150,.9)'; ctx.fill(); }, { blur: 8, y: 3 });
    stadFill(cx, cy, hw, hh); ctx.strokeStyle = '#a8561f'; ctx.lineWidth = 3.5; ctx.stroke();
    stadFill(cx, cy, ihw, ihh); const mg = ctx.createLinearGradient(0, cy - ihh, 0, cy + ihh); mg.addColorStop(0, '#fff7d9'); mg.addColorStop(1, '#f4d58a'); ctx.fillStyle = mg; ctx.fill();
    // 크리스타 판
    const x0 = cx - ihw + ihh * 0.9, x1 = cx + ihw - ihh * 0.9, depth = ihh * 1.25;
    const plates = [];
    for (let k = 0; k < 12; k++) {
      const st = pl ? pl[k] : { x: n > 0 && k < n ? x0 + (k + 0.5) / n * (x1 - x0) : 0, g: k < n ? 1 : 0 };
      if (st.g > 0.01) plates.push({ k, x: st.x, g: st.g });
    }
    ctx.save(); stadFill(cx, cy, ihw, ihh); ctx.clip();
    plates.forEach((q) => {
      const up = q.k % 2 === 0, px = q.x, y0 = up ? cy - ihh : cy + ihh, dir = up ? 1 : -1, len = depth * q.g, w = 8;
      ctx.lineCap = 'round'; ctx.strokeStyle = '#c2255c'; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(px, y0); ctx.lineTo(px, y0 + dir * len); ctx.stroke();
      ctx.strokeStyle = '#fbcfe8'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(px, y0 + dir * 2); ctx.lineTo(px, y0 + dir * Math.max(2, len - 3)); ctx.stroke();
    });
    ctx.restore();
    stadFill(cx, cy, ihw, ihh); ctx.strokeStyle = '#c2255c'; ctx.lineWidth = 4; ctx.stroke();
    // ATP 합성 효소 점: 바깥 둘레 10개 + 판마다 5개
    const dotR = 3.7;
    for (let k = 0; k < 10; k++) { const p = stadPt(cx, cy, ihw, ihh, (k + 0.5) / 10); D.sphere(p.x - p.nx * 6.5, p.y - p.ny * 6.5, dotR, '#facc15', { gloss: false, outline: '#a16207', outlineWidth: 1 }); }
    plates.forEach((q) => {
      if (q.g < 0.55) return; const up = q.k % 2 === 0, y0 = up ? cy - ihh : cy + ihh, dir = up ? 1 : -1, len = depth * q.g, al = clamp((q.g - 0.55) / 0.45, 0, 1);
      ctx.save(); ctx.globalAlpha = al;
      for (let j = 0; j < 5; j++) { const t = (j + 0.8) / 5.6, side = j % 2 ? 1 : -1; D.sphere(q.x + side * 8.5, y0 + dir * (len * t * 0.92 + 4), dotR, '#facc15', { gloss: false, outline: '#a16207', outlineWidth: 1 }); }
      ctx.restore();
    });
    if (cap) T(cx, rc.y + 22, cap, 14.5, '#1f2d44', 'center', 800);
    return { cx, cy, hw, hh, ihw, ihh, x0, x1 };
  }
  function arDraw(dt, t) {
    const a = S.ar, g = arG(), N = a.N;
    a.pulse = approach(a.pulse, 0, dt, 3);
    // 판의 위치 · 길이 갱신 (N 이 바뀌면 고르게 다시 퍼져요)
    const P1 = g.P1, cmp = a.cmp;
    const rc = cmp ? { x: P1.x + P1.w / 2, y: P1.y, w: P1.w / 2, h: P1.h } : P1;
    const hw = rc.w / 2 - 12, hh = Math.min(rc.h / 2 - 34, hw * 0.44), cx = rc.x + rc.w / 2, ihw = hw - Math.max(9, hh * 0.1), ihh = hh - Math.max(9, hh * 0.1);
    const x0 = cx - ihw + ihh * 0.9, x1 = cx + ihw - ihh * 0.9;
    a.pl.forEach((q, k) => {
      const tx = N > 0 ? x0 + ((k < N ? k : 0) + 0.5) / N * (x1 - x0) : x0 + (x1 - x0) * 0.5;
      if (!q.init) { q.x = tx; q.init = true; }
      if (k < N) { q.x = RM ? tx : approach(q.x, tx, dt, 8); q.g = RM ? 1 : approach(q.g, 1, dt, 5 + k * 0.2); } else { q.g = RM ? 0 : approach(q.g, 0, dt, 7); if (q.g < 0.01) q.g = 0; }
    });
    a.gA.set(arArea(N)); a.gM.set(arMult(N)); a.gA.update(dt, 7); a.gM.update(dt, 7);
    panel(P1.x, P1.y, P1.w, P1.h, 18, '#fffdf7');
    if (cmp) {
      arMito({ x: P1.x, y: P1.y, w: P1.w / 2, h: P1.h }, 0, null, 'N = 0');
      ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 2; ctx.setLineDash([6, 5]); ctx.beginPath(); ctx.moveTo(P1.x + P1.w / 2, P1.y + 14); ctx.lineTo(P1.x + P1.w / 2, P1.y + P1.h - 14); ctx.stroke(); ctx.setLineDash([]);
      arMito(rc, N, a.pl, 'N = ' + N);
    } else arMito(P1, N, a.pl, '미토콘드리아 세로 단면 · 크리스타 판 N = ' + N + '개');
    T(P1.x + P1.w - 12, P1.y + P1.h - 10, '● ATP 합성 효소', 13, '#a16207', 'right', 800);
    // 계산 패널
    const P2 = g.P2; panel(P2.x, P2.y, P2.w, P2.h, 18, '#fff');
    const tx = P2.x + 14, ty = P2.y + 28;
    T(tx, ty, '내막 표면적', 15, '#334155', 'left', 800);
    T(tx, ty + 24, '= 3.5 × (1 + 0.5 × ' + N + ')', 15.5, '#475569', 'left', 800);
    T(tx, ty + 56, f2(arArea(N)) + ' μm²', PHONE ? 24 : 27, a.pulse > 0.05 ? '#d97706' : '#be185d', 'left', 800);
    // 막대 (0 ~ 24.5 μm²)
    const bw = P2.w - 28, by = ty + 80;
    D.roundRect(tx, by, bw, 16, 8); ctx.fillStyle = '#eef2f7'; ctx.fill();
    D.roundRect(tx, by, Math.max(16, bw * clamp(a.gA.v / 24.5, 0, 1)), 16, 8); ctx.fillStyle = '#e5508a'; ctx.fill();
    const mx = tx + bw * AR0 / 24.5; ctx.strokeStyle = '#334155'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(mx, by - 4); ctx.lineTo(mx, by + 20); ctx.stroke(); T(mx, by + 36, 'N = 0 : 3.5', 12, '#475569', 'center', 800);
    T(tx, by + 62, 'ATP 합성 효소 점', 14, '#334155', 'left', 800); T(tx + bw, by + 62, arDots(N) + '개', 16, '#a16207', 'right', 800);
    const gy = by + 82;
    T(tx, gy, 'ATP 생산 능력', 14, '#334155', 'left', 800); T(tx + bw, gy, '× ' + f2(arMult(N)), 17, '#b45309', 'right', 800);
    D.roundRect(tx, gy + 8, bw, 14, 7); ctx.fillStyle = '#eef2f7'; ctx.fill(); D.roundRect(tx, gy + 8, Math.max(14, bw * clamp(a.gM.v / 7, 0, 1)), 14, 7); ctx.fillStyle = '#f59e0b'; ctx.fill();
    // 그래프
    const P3 = g.P3; panel(P3.x, P3.y, P3.w, P3.h, 18, '#fff');
    T(P3.x + 14, P3.y + 24, '크리스타 판 수에 따른 내막 표면적 (모형)', 14.5, '#1f2d44', 'left', 800);
    const pl = mkPlot(P3, { x0: 0, x1: 12, y0: 0, y1: 25, xt: [0, 2, 4, 6, 8, 10, 12], yt: [0, 5, 10, 15, 20, 25], xl: '크리스타 판 수 N', yl: '', m: PHONE ? { l: 40, t: 40, r: 16, b: 40 } : { l: 48, t: 40, r: 20, b: 42 } });
    drawAxes(pl);
    T(P3.x + P3.w - 14, P3.y + 24, 'μm²', 13, '#64748b', 'right', 800);
    ctx.save(); ctx.strokeStyle = '#e5508a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(pl.X(0), pl.Y(arArea(0))); ctx.lineTo(pl.X(12), pl.Y(arArea(12))); ctx.stroke(); ctx.restore();
    for (let k = 0; k <= 12; k++) D.sphere(pl.X(k), pl.Y(arArea(k)), k === N ? 7.5 : 3.6, k === N ? '#be185d' : '#f9a8d4', { gloss: k === N });
    D.ring(pl.X(N), pl.Y(arArea(N)), 11, t, { color: '#be185d', width: 2 });
    ctx.strokeStyle = 'rgba(190,24,93,.4)'; ctx.setLineDash([4, 4]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(pl.x, pl.Y(arArea(N))); ctx.lineTo(pl.X(N), pl.Y(arArea(N))); ctx.lineTo(pl.X(N), pl.y + pl.h); ctx.stroke(); ctx.setLineDash([]);
    T(clamp(pl.X(N) + 12, pl.x + 30, pl.x + pl.w - 60), clamp(pl.Y(arArea(N)) - 12, pl.y + 14, pl.y + pl.h), f2(arArea(N)), 14, '#9d174d', 'left', 800);
  }

  /* =========================================================
     ④ 세포 추론
     ========================================================= */
  const CE = [
    { id: 'liver', name: '간세포', n: 8, d: 3, fn: 'liver' },
    { id: 'sperm', name: '정자', n: 6, d: 3, fn: 'sperm' },
    { id: 'heart', name: '심장 근육 세포', n: 14, d: 5, fn: 'heart' },
    { id: 'rbc', name: '사람 성숙 적혈구', n: 0, d: 0, fn: 'rbc' },
    { id: 'fat', name: '지방 저장 세포', n: 2, d: 1, fn: 'fat' },
    { id: 'brown', name: '갈색 지방 세포', n: 10, d: 6, fn: 'brown' },
  ];
  const CE_ORDER = ['heart', 'brown', 'liver', 'sperm', 'fat', 'rbc'];   // 그림의 (개수 × 크리스타 촘촘함) 큰 순서
  S.ce = { rank: [], wrong: -1, wrongFn: {}, shake: {} };
  const ceScore = (c) => c.n * c.d;
  function ceG() {
    return PHONE ? { cw: 226, ch: 194, pos: (i) => ({ x: 10 + (i % 2) * 238, y: 10 + Math.floor(i / 2) * 202 }), hint: 634 }
      : { cw: 250, ch: 250, pos: (i) => ({ x: 14 + (i % 3) * 261, y: 14 + Math.floor(i / 3) * 262 }), hint: 546 };
  }
  function miniMito(x, y, ang, len, wid, dens) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    D.roundRect(-len / 2, -wid / 2, len, wid, wid / 2); ctx.fillStyle = '#fed7aa'; ctx.fill(); ctx.strokeStyle = '#a8561f'; ctx.lineWidth = 1.3; ctx.stroke();
    ctx.strokeStyle = '#c2255c'; ctx.lineWidth = 1.2;
    for (let k = 0; k < dens; k++) { const px = -len / 2 + wid * 0.5 + (k + 0.5) / dens * (len - wid), up = k % 2 === 0; ctx.beginPath(); ctx.moveTo(px, up ? -wid / 2 + 1 : wid / 2 - 1); ctx.lineTo(px, up ? wid * 0.14 : -wid * 0.14); ctx.stroke(); }
    ctx.restore();
  }
  function cePlace(c, ell, avoid, seed, len) {
    const r = mulberry(seed), out = []; let guard = 0;
    while (out.length < c.n && guard++ < 1500) {
      const a = r() * TAU, rr = Math.sqrt(r()) * 0.86, x = ell.x + Math.cos(a) * ell.rx * rr, y = ell.y + Math.sin(a) * ell.ry * rr;
      if (avoid && Math.hypot((x - avoid.x) / avoid.rx, (y - avoid.y) / avoid.ry) < 1.15) continue;
      if (out.some((q) => Math.hypot(q.x - x, q.y - y) < len * 0.92)) continue;
      out.push({ x, y, a: (r() - 0.5) * 3 });
    }
    while (out.length < c.n) out.push({ x: ell.x + (out.length % 5 - 2) * len * 0.5, y: ell.y + (Math.floor(out.length / 5) - 1) * len * 0.5, a: 0 });
    return out;
  }
  const ceCache = {};
  function ceArt(c, bx, by, bw, bh) {
    const cx = bx + bw / 2, cy = by + bh / 2, u = Math.min(bw, bh * 1.25) / 250, L2 = 21 * u * (c.n > 11 ? 0.9 : 1), W2 = 10.5 * u * (c.n > 11 ? 0.9 : 1);
    const mine = (pts) => pts.forEach((q) => miniMito(q.x, q.y, q.a, L2, W2, c.d));
    ctx.save();
    if (c.id === 'heart') {
      const w = 220 * u, h = 112 * u; D.roundRect(cx - w / 2, cy - h / 2, w, h, 26 * u); ctx.fillStyle = '#fecaca'; ctx.fill(); ctx.strokeStyle = '#dc2626'; ctx.lineWidth = 2; ctx.stroke();
      ctx.strokeStyle = 'rgba(220,38,38,.18)'; ctx.lineWidth = 3; for (let k = -4; k <= 4; k++) { ctx.beginPath(); ctx.moveTo(cx + k * 22 * u, cy - h / 2 + 4); ctx.lineTo(cx + k * 22 * u, cy + h / 2 - 4); ctx.stroke(); }
      ctx.fillStyle = '#c4b5fd'; ctx.beginPath(); ctx.ellipse(cx - 78 * u, cy, 15 * u, 21 * u, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = '#6d28d9'; ctx.stroke();
      const pts = []; for (let k = 0; k < 14; k++) { const col = k % 7, row = Math.floor(k / 7); pts.push({ x: cx - 46 * u + col * 22 * u + (row ? 10 * u : 0), y: cy + (row ? 22 : -22) * u, a: 0 }); } mine(pts);
    } else if (c.id === 'brown') {
      const R = 92 * u; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fillStyle = '#fde4c8'; ctx.fill(); ctx.strokeStyle = '#b45309'; ctx.lineWidth = 2; ctx.stroke();
      const nuc = { x: cx + 40 * u, y: cy - 30 * u, rx: 20 * u, ry: 18 * u }; ctx.fillStyle = '#c4b5fd'; ctx.beginPath(); ctx.ellipse(nuc.x, nuc.y, nuc.rx, nuc.ry, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = '#6d28d9'; ctx.stroke();
      [[-50, -40], [-62, 8], [58, 40], [0, 58]].forEach(([dx, dy]) => { ctx.fillStyle = '#fffbe6'; ctx.beginPath(); ctx.arc(cx + dx * u, cy + dy * u, 8 * u, 0, TAU); ctx.fill(); ctx.strokeStyle = '#eab308'; ctx.stroke(); });
      const pts = cePlace(c, { x: cx, y: cy, rx: R * 0.92, ry: R * 0.92 }, nuc, 5, L2 * 1.0); mine(pts.map((q) => ({ x: q.x, y: q.y, a: q.a })));
    } else if (c.id === 'liver') {
      ctx.beginPath(); for (let k = 0; k < 8; k++) { const a = k / 8 * TAU + 0.2, r = (92 + (k % 2 ? -8 : 6)) * u; const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r * 0.86; if (k) ctx.lineTo(x, y); else ctx.moveTo(x, y); } ctx.closePath();
      ctx.fillStyle = '#fbd5d5'; ctx.fill(); ctx.strokeStyle = '#be123c'; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.stroke();
      const nuc = { x: cx - 8 * u, y: cy - 8 * u, rx: 24 * u, ry: 22 * u }; ctx.fillStyle = '#c4b5fd'; ctx.beginPath(); ctx.ellipse(nuc.x, nuc.y, nuc.rx, nuc.ry, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = '#6d28d9'; ctx.stroke();
      mine(cePlace(c, { x: cx, y: cy, rx: 76 * u, ry: 66 * u }, nuc, 9, L2));
    } else if (c.id === 'sperm') {
      const hx = cx - 84 * u, hy = cy; ctx.fillStyle = '#c4b5fd'; ctx.beginPath(); ctx.ellipse(hx, hy, 28 * u, 17 * u, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = '#6d28d9'; ctx.lineWidth = 2; ctx.stroke();
      ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 3; ctx.beginPath(); for (let k = 0; k <= 40; k++) { const x = hx + 26 * u + k * 5 * u, y = hy + Math.sin(k * 0.5 - clock * 4) * 6 * u * (k / 40); if (k) ctx.lineTo(x, y); else ctx.moveTo(x, y); } ctx.stroke();
      const pts = []; for (let k = 0; k < 6; k++) pts.push({ x: hx + 40 * u + k * 15 * u, y: hy, a: Math.PI / 2 * 0 + 1.4 }); pts.forEach((q) => miniMito(q.x, q.y, 1.57, 18 * u, 10 * u, c.d)); T(hx + 40 * u + 36 * u, hy - 24 * u, '중편부', 11.5, '#6b7280', 'center', 800);
    } else if (c.id === 'fat') {
      const R = 92 * u; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fillStyle = '#fde68a'; ctx.fill(); ctx.strokeStyle = '#ca8a04'; ctx.lineWidth = 2.5; ctx.stroke();
      ctx.beginPath(); ctx.arc(cx - 6 * u, cy + 2 * u, R * 0.8, 0, TAU); ctx.fillStyle = '#fffbe6'; ctx.fill(); T(cx - 6 * u, cy + 6 * u, '지방 방울', 13, '#a16207', 'center', 800);
      ctx.fillStyle = '#c4b5fd'; ctx.beginPath(); ctx.ellipse(cx + 80 * u, cy - 28 * u, 10 * u, 17 * u, 0.4, 0, TAU); ctx.fill(); ctx.strokeStyle = '#6d28d9'; ctx.lineWidth = 1.5; ctx.stroke();
      miniMito(cx + 70 * u, cy + 30 * u, 0.6, L2, W2, c.d); miniMito(cx - 78 * u, cy - 36 * u, -0.5, L2, W2, c.d);
    } else {
      const R = 74 * u; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); const g = ctx.createRadialGradient(cx, cy, R * 0.15, cx, cy, R); g.addColorStop(0, '#fecaca'); g.addColorStop(0.55, '#f87171'); g.addColorStop(1, '#dc2626'); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = '#991b1b'; ctx.lineWidth = 2; ctx.stroke();
      T(cx, cy + 5, '핵 · 미토콘드리아 없음', 12.5 * Math.max(0.9, u), '#fff', 'center', 800, { stroke: 'rgba(127,29,29,.6)', strokeWidth: 3 });
    }
    ctx.restore();
  }
  function ceDraw(dt, t) {
    const g = ceG(), e = S.ce;
    CE.forEach((c, i) => {
      const p = g.pos(i), ra = e.rank.indexOf(c.id), bad = e.wrong === i;
      if (e.shake[c.id] > 0) e.shake[c.id] = Math.max(0, e.shake[c.id] - dt * 3);
      ctx.save(); if (e.shake[c.id] > 0 && !RM) ctx.translate(Math.sin(clock * 60) * 3 * e.shake[c.id], 0);
      panel(p.x, p.y, g.cw, g.ch, 16, bad ? '#fdeceb' : ra >= 0 ? '#f4fbf6' : '#fff');
      D.roundRect(p.x, p.y, g.cw, g.ch, 16); ctx.strokeStyle = bad ? '#e2464b' : ra >= 0 ? '#16a34a' : '#d6dee9'; ctx.lineWidth = bad || ra >= 0 ? 3 : 1.5; ctx.stroke();
      ceArt(c, p.x + 6, p.y + 28, g.cw - 12, g.ch - 78);
      TF(p.x + g.cw / 2, p.y + 22, c.name, g.cw - 70, 16, 12.5, '#1f2d44', 'center', 800);
      T(p.x + g.cw / 2, p.y + g.ch - 28, '그림 속 미토콘드리아 ' + c.n + '개', 14, '#334155', 'center', 800);
      T(p.x + g.cw / 2, p.y + g.ch - 9, c.n ? '크리스타 촘촘함 ' + '★'.repeat(c.d) : '크리스타 없음', 13, '#b45309', 'center', 800);
      if (ra >= 0) { D.sphere(p.x + 20, p.y + 24, 15, '#16a34a', { gloss: true, text: String(ra + 1), textScale: 1.0 }); }
      ctx.restore();
    });
    T(PHONE ? 240 : 400, g.hint - (PHONE ? 4 : 0), e.rank.length < 6 ? '미토콘드리아가 가장 많은 세포부터 순서대로 눌러요 (' + e.rank.length + ' / 6)' : '순위를 모두 매겼어요. 오른쪽에서 하는 일도 골라요', 13.5, '#64748b', 'center', 800);
  }
  const cePT = {
    down(p) {
      const g = ceG(); for (let i = 0; i < CE.length; i++) { const q = g.pos(i); if (inRect(p.x, p.y, { x: q.x, y: q.y, w: g.cw, h: g.ch })) { return ceTap(CE[i].id), false; } } return false;
    },
    hover(p) { const g = ceG(); return CE.some((c, i) => { const q = g.pos(i); return inRect(p.x, p.y, { x: q.x, y: q.y, w: g.cw, h: g.ch }); }) ? 'pointer' : 'default'; },
  };
  function ceTap(id) {
    const e = S.ce, k = e.rank.indexOf(id); e.wrong = -1;
    if (k < 0) e.rank.push(id); else if (k === e.rank.length - 1) e.rank.pop(); else showHint('순위를 바꾸려면 마지막 순위부터 눌러 취소하거나 "순위 다시"를 눌러요.', 2600);
    Sound.click(); updateCtl();
  }
  function ceReset() { S.ce.rank.length = 0; S.ce.wrong = -1; $$('#ctrlCard select[id^="fn_"]').forEach((s) => { s.value = ''; s.classList.remove('ok', 'bad'); }); updateCtl(); }

  /* =========================================================
     화면 전환 · 조작 연결
     ========================================================= */
  const PTS = { build: bPT, map: mpPT, zoom: znPT, area: null, cells: cePT };
  function setMode(m) { if (S.mode !== m) S.fade = 1; S.mode = m; PT = PTS[m] || null; hideHint(); updateCtl(); }
  const ctlNodes = $$('#ctrlCard .control');
  const fnVal = (id) => selVal('fn_' + id);
  S.nmChk = false; S.ar.calc = true; S.ce.badFn = {};
  function updateCtl() {
    const fr = game ? game.free : false, lvNow = game ? game.level : 0;
    ctlNodes.forEach((n) => { n.hidden = (n.dataset.modes || '').split(' ').indexOf(S.mode) < 0; });
    $$('#ctrlCard [data-grp]').forEach((n) => { const k = n.dataset.grp; n.hidden = k === 'name' ? !S.b.nameMode : k === 'calc' ? !(S.ar.calc || fr) : false; });
    modeButtons(S.mode, lvNow, fr);
    const b = S.b;
    $('#oCut').textContent = Math.round(b.sT * 100) + ' %'; $('#sCut').value = Math.round(b.sT * 100);
    $('#bNote').innerHTML = '조립한 부품 <b>' + bPlaced() + ' / 7</b> · 화면을 <b>끌면</b> 3D 모형이 돌아가요.';
    [0, 1, 2, 3, 4].forEach((i) => { const e = $('#nm' + i); e.classList.toggle('ok', nmOK(i)); e.classList.toggle('bad', S.nmChk && nmBad(i)); });
    const so = S.mp.so;
    if (so) { const cnt = (z) => so.cards.filter((c) => c.zone === z).length; $('#mpNote').innerHTML = '놓은 카드 <b>' + so.placed + ' / 5</b> · 세포질 ' + cnt('cyto') + ' · 막 사이 ' + cnt('ims') + ' · 내막 ' + cnt('inner') + ' · 기질 ' + cnt('matrix'); }
    chipSet($('#znDrug'), S.zm.cn ? 'cn' : 'none');
    $('#znNote').innerHTML = S.zm.cn ? '시안화물이 <b>전자 전달</b>을 막아 산소를 쓰지 못해요 → ATP 생산이 멈춰요. 단백질 복합체나 ATP 합성 효소를 눌러 보세요.' : '전자가 복합체 ①→②→③을 지나 <b>산소</b>에 도착하고, ATP 합성 효소가 ATP를 만들어요.';
    const a = S.ar; $('#oN').textContent = a.N; $('#sN').value = a.N; chipSet($('#arCmp'), a.cmp ? 'on' : 'off');
    $('#inArea').classList.toggle('ok', a.N === 8 && near(numIn('inArea'), arArea(8), 0.15));
    $('#arNote').innerHTML = 'N = <b>' + a.N + '</b> → 표면적 <b>' + f2(arArea(a.N)) + ' μm²</b> · ATP 생산 능력 <b>× ' + f2(arMult(a.N)) + '</b> · 합성 효소 점 ' + arDots(a.N) + '개';
    const e = S.ce;
    CE.forEach((c) => { const s = $('#fn_' + c.id); s.classList.toggle('ok', fnVal(c.id) === c.fn && fnVal(c.id) !== ''); s.classList.toggle('bad', !!e.badFn[c.id] && fnVal(c.id) !== c.fn); });
    $('#ceNote').innerHTML = '순위 <b>' + e.rank.length + ' / 6</b> · 하는 일 고른 세포 <b>' + CE.filter((c) => fnVal(c.id)).length + ' / 6</b>';
  }
  bindModeSeg(setMode);
  $('#sCut').addEventListener('input', (e) => { S.b.sT = +e.target.value / 100; updateCtl(); });
  $('#bSpin').addEventListener('click', () => { Sound.click(); bSpin(); });
  $('#bFront').addEventListener('click', () => { Sound.click(); bFront(); });
  $('#bReset').addEventListener('click', () => { Sound.click(); bReset(); });
  [0, 1, 2, 3, 4].forEach((i) => $('#nm' + i).addEventListener('change', () => { S.nmChk = false; updateCtl(); }));
  $('#mpReset').addEventListener('click', () => { Sound.click(); S.mp.pick = null; S.mp.so.reset(); });
  $$('#znDrug button').forEach((bt) => bt.addEventListener('click', () => znSetDrug(bt.dataset.v === 'cn')));
  $('#sN').addEventListener('input', (e) => { arSetN(+e.target.value); });
  $$('#arCmp button').forEach((bt) => bt.addEventListener('click', () => { S.ar.cmp = bt.dataset.v === 'on'; Sound.click(); updateCtl(); }));
  $('#inArea').addEventListener('input', updateCtl);
  $('#ceReset').addEventListener('click', () => { Sound.click(); ceReset(); });
  CE.forEach((c) => $('#fn_' + c.id).addEventListener('change', () => { S.ce.badFn = {}; updateCtl(); }));

  /* =========================================================
     미션
     ========================================================= */
  const levels = [
    {
      title: '모형 조립', short: '모형 조립', icon: '🧩', phase: '모형',
      intro: '<p class="si-q">❓ 탐구 질문: 미토콘드리아의 겉은 매끈한데 속은 왜 주름져 있을까? 모든 세포에 같은 수가 들어 있을까?</p><p>🔗 <b>앞 단원에서</b> 세포를 분획해 소기관을 분리했어요(미토콘드리아는 10000 g 침전물). 이제 그 <b>안쪽</b>을 살펴봐요. 미토콘드리아는 <b>이중막</b>으로 싸인 소기관으로, 길이 1~2 μm, 지름 약 0.5 μm의 소시지 모양이에요.</p><p>3D 모형의 <b>부품 7개</b>를 끌어다 점선 자리(?)에 맞춰 조립하고, 화면을 끌어 <b>360° 돌려</b> 보고 <b>단면 슬라이더</b>로 열어 봐요. 고리 모양 DNA와 70S 리보솜은 원핵생물과 닮았어요(원핵생물과 진핵생물 차시의 힌트).</p>',
      features: ['build'],
      setup() { setMode('build'); S.b.nameMode = false; },
      recap: '미토콘드리아는 외막과 내막의 이중막으로 싸여 있고, 내막이 안으로 접힌 크리스타가 있어요. 내막 안쪽은 기질, 두 막 사이는 막 사이 공간이에요. 기질에는 고리 모양 DNA와 70S 리보솜이 있어요.',
      summary: '<ul><li><b>이중막</b>: 바깥의 <b>외막</b>(매끈, 작은 분자가 쉽게 통과)과 안쪽의 <b>내막</b>(안으로 접힌 <b>크리스타</b>, 선택적 투과성이 높음). 두 막 사이는 <b>막 사이 공간</b>이에요.</li><li><b>기질(matrix)</b>: 내막 안쪽 공간. 효소, <b>고리 모양 DNA</b>, <b>70S 리보솜</b>이 있어요.</li><li>크기: 길이 1~2 μm, 지름 약 0.5 μm의 소시지 모양(현미경 사진에서는 둥글게 보이기도 해요).</li><li>구조를 보는 방법: 3D 모형을 돌려 보고(입체), 단면으로 잘라 보면(세로 단면) 막이 어떻게 접혀 있는지 알 수 있어요.</li></ul>',
      missions: [
        {
          id: 'build', title: '부품 7개 조립하기',
          goal: '부품 카드 7개를 점선 모형의 <b>?</b> 표시로 끌어다 놓아 미토콘드리아를 조립하세요. 화면을 끌면 모형이 돌아가요.',
          hint: '카드를 가져가면 표시가 가리키는 구조가 반짝여요. 카드의 설명과 점선 모양을 맞춰 보세요. 카드를 눌러 고른 뒤 ? 표시를 눌러도 돼요.',
          setup() { setMode('build'); S.b.nameMode = false; bReset(); },
          check: () => bPlaced() === 7, hold: 0.6,
          status: () => mark(bPlaced() === 7) + ' 조립한 부품 ' + bPlaced() + ' / 7',
          explain: '<b>외막 · 막 사이 공간 · 내막 · 크리스타 · 기질 · DNA · 리보솜</b> 7가지를 모두 맞췄어요. 외막과 내막 두 겹의 막이 있고, 내막이 안으로 접힌 것이 크리스타예요.',
        },
        {
          id: 'name', title: '단면 구조에 이름 붙이기', manual: true,
          goal: '모형을 정면에서 본 <b>세로 단면</b>이에요. 핀 ①~⑤가 가리키는 구조의 이름을 오른쪽 목록에서 고르세요.',
          hint: '가장 바깥을 감싼 막은 외막이에요. 안쪽 막이 안으로 접힌 주름이 크리스타이고, 내막 안쪽의 액체가 기질이에요.',
          setup() { setMode('build'); S.b.nameMode = true; S.nmChk = false; [0, 1, 2, 3, 4].forEach((i) => { $('#nm' + i).value = ''; }); bCut(1); bFront(); updateCtl(); },
          check() {
            const miss = [0, 1, 2, 3, 4].find((i) => !nmVal(i));
            if (miss != null) { S.nmChk = false; return '핀 5개의 이름을 모두 골라 주세요. (핀 ' + '①②③④⑤'[miss] + ' 이 비었어요)'; }
            const bad = [0, 1, 2, 3, 4].filter((i) => !nmOK(i)); S.nmChk = true;
            if (bad.length) { const H = ['가장 바깥을 감싼 매끈한 막이에요.', '안쪽 막이에요. 안으로 접혀 들어가요.', '두 막 사이의 좁은 틈이에요.', '내막 안쪽을 채운 액체예요.', '내막이 안으로 접힌 주름이에요.']; return '빨간 칸이 아직 달라요. 핀 ' + '①②③④⑤'[bad[0]] + ': ' + H[bad[0]]; }
            return true;
          },
          explain: '핀 ①은 <b>외막</b>, ②는 <b>내막</b>, ③은 두 막 사이의 <b>막 사이 공간</b>, ④는 내막 안쪽의 <b>기질</b>, ⑤는 내막이 접힌 <b>크리스타</b>예요.',
        },
        {
          type: 'quiz', title: '미토콘드리아의 막',
          goal: '미토콘드리아의 막은 <b>몇 겹</b>이고, 안쪽 막은 어떤 모양일까요?',
          setup() { setMode('build'); S.b.nameMode = false; updateCtl(); },
          choices: ['한 겹이고, 안쪽이 매끈하다', '이중막이고, 안쪽 막이 안으로 접힌 크리스타를 이룬다', '이중막이고, 바깥쪽 막이 안으로 접힌다', '세 겹이고, 가운데 막이 접힌다'],
          answer: 1,
          feedback: ['외막과 내막, 두 겹이에요.', '', '접히는 것은 안쪽 막(내막)이에요.', '막은 외막과 내막 두 겹이에요.'],
          explain: '미토콘드리아는 <b>이중막</b>이고, <b>내막</b>이 안으로 접혀 <b>크리스타</b>를 이뤄요. 외막은 비교적 매끈해요.',
        },
      ],
    },
    {
      title: '구조와 기능', short: '구조와 기능', icon: '📍', phase: '탐구',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 미토콘드리아의 이중막과 기질을 조립했어요. 이 구조에서 세포호흡의 어떤 일이 일어날까요?</div><p>세포호흡의 <b>4단계</b>는 다음 차시에서 자세히 배워요. 여기서는 어느 구조에서 어떤 <b>종류의 일</b>이 일어나는지 큰 그림만 그려요. <b>기질</b>은 분해(CO₂ 생성, 전자 운반체 충전), <b>내막</b>은 에너지 전환(ATP 합성), <b>막 사이 공간</b>은 H⁺ 저장소예요.</p><p>그다음 내막을 크게 확대해 단백질이 어떻게 박혀 있는지 보고, <b>시안화물</b>로 호흡을 멈춰 봐요.</p>',
      features: ['map', 'zoom'],
      setup() { setMode('map'); },
      recap: '해당 과정은 세포질, 피루브산 산화와 TCA 회로는 기질, 전자 전달과 ATP 합성은 내막, H⁺ 저장은 막 사이 공간이에요. 시안화물은 전자 전달을 막아 산소 소비와 ATP 생산을 멈춰요.',
      summary: '<ul><li><b>세포질</b>: 해당 과정(미토콘드리아가 없는 세포에서도 일어나요). <b>기질</b>: 피루브산 산화 · TCA 회로(분해, CO₂ 생성, 전자 운반체 충전). <b>내막</b>: 전자 전달계와 ATP 합성 효소(에너지 전환). <b>막 사이 공간</b>: H⁺ 저장소.</li><li>내막에는 <b>전자 전달 단백질 복합체</b>와 <b>ATP 합성 효소</b>가 박혀 있어요.</li><li><b>시안화물</b>은 전자 전달을 막아 산소를 쓰지 못하게 해서 ATP 생산이 멈춰요.</li><li>기질의 <b>고리 DNA와 70S 리보솜</b> → 미토콘드리아는 자체 단백질 일부를 합성할 수 있어요.</li></ul>',
      missions: [
        {
          id: 'map', title: '위치 지도 완성하기', manual: true,
          goal: '반응 카드 5장을 <b>세포질 · 막 사이 공간 · 내막 · 기질</b> 중 알맞은 곳에 놓으세요.',
          hint: '해당 과정은 미토콘드리아 밖에서 일어나요. 피루브산 산화와 TCA 회로의 효소는 기질에, ATP를 만드는 단백질은 내막에 박혀 있어요.',
          setup() { setMode('map'); S.mp.pick = null; S.mp.so.reset(); },
          check() {
            const so = S.mp.so; if (so.placed < 5) return '카드 5장을 모두 구역에 놓아 주세요. (' + so.placed + ' / 5)';
            const wr = mpWrong(); so.markBad(wr.map((c) => c.id));
            if (wr.length) { const m = MAPC.find((q) => q.id === wr[0].id); return '빨간 카드는 아직 알맞은 곳이 아니에요. ' + m.label + ': ' + (m.id === 'glyc' ? '미토콘드리아가 없는 세포에서도 일어나는 단계예요.' : m.id === 'etc' ? 'ATP 합성 효소와 전자 전달 단백질이 박힌 곳이에요.' : m.id === 'hst' ? '두 막 사이에 있는 좁은 공간이에요.' : '내막 안쪽, 액체로 찬 공간이에요.'); }
            return true;
          },
          explain: '<b>해당 과정</b>은 세포질, <b>피루브산 산화와 TCA 회로</b>는 기질, <b>전자 전달과 ATP 합성</b>은 내막, <b>H⁺ 저장</b>은 막 사이 공간이에요. 해당 과정만 세포질에서 일어나서 미토콘드리아가 없는 세포에서도 진행돼요.',
        },
        {
          id: 'cn', title: '호흡 억제제 시험',
          goal: '<b>내막 확대</b> 화면에서 <b>시안화물</b>을 처리하고, <b>산소 소비와 ATP 생산이 모두 0</b>이 되는 것을 확인하세요.',
          hint: '오른쪽 "🧪 시안화물" 버튼을 눌러요. 전자가 마지막 복합체에서 멈추고 게이지가 줄어드는 것을 기다려요.',
          setup() { setMode('zoom'); znReset(); },
          check: () => S.zm.cn && S.zm.o2.v < 1 && S.zm.atp.v < 1, hold: 0.8,
          status: () => mark(S.zm.cn) + ' 시안화물 처리 &nbsp; ' + mark(S.zm.cn && S.zm.o2.v < 1) + ' 산소 소비 ' + fi(S.zm.o2.v) + ' &nbsp; ' + mark(S.zm.cn && S.zm.atp.v < 1) + ' ATP 생산 ' + fi(S.zm.atp.v),
          explain: '시안화물은 내막의 <b>전자 전달</b> 단백질 복합체를 막아요. 전자가 산소에 도착하지 못하니 <b>산소 소비가 멈추고</b>, 내막에서 ATP를 만드는 일도 멈춰요. 에너지 불꽃이 꺼지는 것과 같아요.',
        },
        {
          type: 'quiz', title: '기질의 DNA와 리보솜',
          goal: '미토콘드리아 기질에 <b>고리 모양 DNA와 70S 리보솜</b>이 있다는 사실로 알 수 있는 것은?',
          setup() { setMode('map'); },
          choices: ['미토콘드리아가 단백질 일부를 스스로 합성할 수 있다', '미토콘드리아에서 해당 과정이 일어난다', '미토콘드리아가 핵 없이 독립해서 살 수 있다', '미토콘드리아의 ATP가 DNA에 저장된다'],
          answer: 0,
          feedback: ['', '해당 과정은 세포질에서 일어나요.', '단백질 대부분은 핵의 유전자에서 만들어져서 독립해서 살지는 못해요.', 'ATP는 DNA에 저장되지 않아요.'],
          explain: 'DNA와 리보솜이 있으면 <b>자체 단백질 일부를 합성</b>할 수 있어요. 고리 DNA와 70S 리보솜은 <b>원핵생물</b>과 닮은 특징이에요.',
        },
      ],
    },
    {
      title: '표면적', short: '표면적', icon: '📐', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 전자 전달 단백질과 ATP 합성 효소가 <b>내막</b>에 박혀 있다는 것을 보았어요. 내막이 넓을수록 단백질이 들어갈 자리가 많아져요.</div><p>외막을 길이 2 μm, 지름 0.5 μm인 원통으로 보면 겉넓이는 π × 0.5 × 2 + 2 × π × 0.25² ≈ 3.14 + 0.39 ≈ <b>3.5 μm²</b>예요. 이 모형에서는 크리스타 판이 1개 생길 때마다 표면적이 3.5 μm²의 <b>50 %</b>씩 늘어난다고 단순하게 가정해요.</p><p><b>내막 표면적 = 3.5 × (1 + 0.5 × N)</b> (N: 판의 수), ATP 합성 효소의 수는 표면적에 비례해요.</p>',
      features: ['area'],
      setup() { setMode('area'); },
      recap: '크리스타 판이 많을수록 내막 표면적이 늘어 ATP 합성 효소가 들어갈 자리가 많아지고, ATP 생산 능력이 커져요. 같은 부피에서 표면적을 늘리는 방법은 소장 융털이나 허파꽈리와 같은 원리예요.',
      summary: '<ul><li>외막(원통 모형) 겉넓이 ≈ <b>3.5 μm²</b>. 내막은 크리스타로 접혀 훨씬 넓어요: <b>표면적 = 3.5 × (1 + 0.5N)</b>. N = 8이면 5배(17.5 μm²).</li><li>ATP 합성 효소의 수 ∝ 내막 표면적(단순 가정) → N = 4이면 ATP 생산 능력은 3배, N = 8이면 5배예요.</li><li>같은 부피에서 <b>주름으로 표면적을 늘리면</b> 단백질 복합체가 더 많이 들어가요. 소장 융털, 허파꽈리도 같은 원리예요.</li></ul>',
      missions: [
        {
          id: 'a8', title: 'N = 8 일 때 표면적',
          goal: '슬라이더로 <b>N = 8</b>을 만들고, 내막 표면적(μm²)을 계산해 입력하세요.',
          hint: '표면적 = 3.5 × (1 + 0.5 × 8) = 3.5 × 5 예요. 오른쪽 위 패널의 계산 과정을 참고해요.',
          setup() { setMode('area'); S.ar.calc = true; $('#inArea').value = ''; arSetN(0); },
          check: () => S.ar.N === 8 && near(numIn('inArea'), arArea(8), 0.15), hold: 0.6,
          status: () => mark(S.ar.N === 8) + ' N = 8 (지금 ' + S.ar.N + ') &nbsp; ' + mark(S.ar.N === 8 && near(numIn('inArea'), arArea(8), 0.15)) + ' 표면적 입력',
          explain: '3.5 × (1 + 0.5 × 8) = 3.5 × 5 = <b>17.5 μm²</b>이에요. 크리스타 판이 8개면 내막 표면적이 N = 0 일 때의 <b>5배</b>가 돼요.',
        },
        {
          id: 'x3', title: 'ATP 생산 3배 만들기',
          goal: 'ATP 합성 효소 수가 표면적에 비례한다고 해요. ATP 생산 능력이 N = 0 일 때의 <b>3배</b>가 되도록 N을 맞추세요.',
          hint: '생산 능력은 표면적에 비례해서 1 + 0.5N 배예요. 슬라이더를 움직이며 게이지가 × 3 이 되는 곳을 찾아요.',
          setup() { setMode('area'); S.ar.calc = false; arSetN(0); },
          check: () => S.ar.N === 4, hold: 0.8,
          status: () => mark(S.ar.N === 4) + ' ATP 생산 능력 × ' + f2(arMult(S.ar.N)) + ' (N = ' + S.ar.N + ')',
          explain: '1 + 0.5N = 3 이므로 <b>N = 4</b>예요. N = 8 이면 5배라서 3배는 그 사이(N = 4)에서 나와요. 표면적이 3배 늘면 합성 효소도 3배 들어가요.',
        },
        {
          type: 'quiz', title: '주름의 의미',
          goal: '내막이 <b>주름</b>져 표면적이 늘어나면 어떤 점이 유리할까요?',
          setup() { setMode('area'); },
          choices: ['단백질 복합체와 ATP 합성 효소가 더 많이 들어가 ATP를 더 많이 만들 수 있다', '미토콘드리아의 부피가 줄어든다', '외막이 더 두꺼워진다', '기질에 들어 있는 DNA가 늘어난다'],
          answer: 0,
          feedback: ['', '주름은 부피를 줄이는 것이 아니라 표면적을 늘려요.', '외막과는 상관없어요.', 'DNA의 양과는 관계없어요.'],
          explain: '막에 박힌 단백질의 수는 <b>표면적에 비례</b>해요. 소장의 <b>융털</b>이나 허파의 <b>허파꽈리</b>도 같은 부피에서 표면적을 늘려 흡수·교환 능력을 키워요.',
        },
      ],
    },
    {
      title: '세포 추론', short: '세포 추론', icon: '🔬', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 크리스타가 많을수록 ATP 생산 능력이 커지는 것을 계산했어요. 에너지를 많이 쓰는 세포는 어떻게 생겼을까요?</div><p>세포 6종의 <b>모형 그림</b>에서 미토콘드리아의 <b>수</b>와 크리스타의 <b>촘촘함(★)</b>을 읽어 순위를 정하고, 세포가 <b>하는 일</b>을 추론해 봐요. (실제로 간세포에는 1000~2000개, 심장 근육 세포는 부피의 약 30~40 %가 미토콘드리아예요. 사람의 성숙 적혈구는 미토콘드리아가 없어요.)</p>',
      features: ['cells'],
      setup() { setMode('cells'); },
      recap: '에너지를 많이 쓰는 세포(심장 근육, 갈색 지방, 정자 등)는 미토콘드리아가 많고 크리스타가 발달했어요. 사람 성숙 적혈구는 미토콘드리아가 없어 포도당을 해당 과정으로만 분해해요.',
      summary: '<ul><li>미토콘드리아 수는 세포의 에너지 사용량과 관련돼요: 심장 근육 세포(부피의 약 30~40 %), 골격근(운동 선수는 더 많아요), 간세포(1000~2000개), 정자 꼬리 중편부(나선형), 갈색 지방 세포(크리스타가 매우 발달, 열 생산).</li><li>지방 저장 세포와 피부 각질층 세포는 적어요. <b>사람 성숙 적혈구는 0개</b>예요: 산소를 운반하지만 자기 산소를 쓰지 않고, 포도당을 해당 과정으로만 분해해요.</li><li>미토콘드리아가 손상되면 가장 먼저 <b>ATP 생산</b>이 줄어요.</li></ul>',
      missions: [
        {
          id: 'cells', title: '세포 6종 추론하기', manual: true,
          goal: '그림의 <b>미토콘드리아 수 × 크리스타 촘촘함(★)</b>이 큰 세포부터 순위를 매기고, 세포마다 <b>하는 일</b>을 고르세요.',
          hint: '심장 14개 × ★5 처럼 곱해서 비교해요. 하는 일은 세포 이름과 미토콘드리아의 수로 추론해요. 적혈구는 미토콘드리아가 없어요.',
          setup() { setMode('cells'); ceReset(); },
          check() {
            const e = S.ce;
            if (e.rank.length < 6) return '카드를 눌러 6종의 순위를 모두 매겨 주세요. (' + e.rank.length + ' / 6)';
            const bi = e.rank.findIndex((id, i) => id !== CE_ORDER[i]);
            if (bi >= 0) { const wi = CE.findIndex((c) => c.id === e.rank[bi]); if (e.wrong !== wi) { e.wrong = wi; e.shake[e.rank[bi]] = 1; } return '빨간 카드의 순위가 달라요. 수 × ★ 값을 곱해서 다시 비교해 보세요.'; }
            e.wrong = -1;
            const miss = CE.find((c) => !fnVal(c.id)); if (miss) return '모든 세포가 하는 일을 골라 주세요. (' + miss.name + ')';
            const wr = CE.filter((c) => fnVal(c.id) !== c.fn); e.badFn = {}; wr.forEach((c) => { e.badFn[c.id] = true; });
            if (wr.length) return '빨간 칸이 아직 달라요. ' + wr[0].name + '가 하는 일을 다시 생각해 보세요.';
            return true;
          },
          explain: '순위는 <b>심장 근육(70) &gt; 갈색 지방(60) &gt; 간세포(24) &gt; 정자(18) &gt; 지방 저장(2) &gt; 적혈구(0)</b> 순이에요. 쉬지 않고 수축하는 심장, 열을 내는 갈색 지방은 에너지를 많이 쓰고, 사람 성숙 적혈구는 미토콘드리아가 없어요. (모형 그림 기준이에요.)',
        },
        {
          type: 'quiz', title: '꾸준한 운동의 효과',
          goal: '운동을 꾸준히 한 사람의 근육 세포에서 일어나는 변화로 가장 알맞은 것은?',
          setup() { setMode('cells'); },
          choices: ['미토콘드리아의 수가 늘어난다', '미토콘드리아가 사라진다', '크리스타가 모두 펴진다', '핵이 두 개가 된다'],
          answer: 0,
          feedback: ['', '에너지를 많이 쓰는 세포는 오히려 미토콘드리아가 늘어요.', '크리스타는 ATP 생산을 위해 필요해요.', '운동과 핵의 수는 관계없어요.'],
          explain: '운동으로 ATP 수요가 늘면 근육 세포의 <b>미토콘드리아가 늘어요</b>. 반대로 미토콘드리아가 손상되면 가장 먼저 <b>ATP 생산</b>이 줄어요.',
        },
      ],
    },
  ];

  mpBuild(); bTokInit(); znReset();
  game = SciSim.game({
    simId: 'hy-mitochondria', mount: '#game', badge: '미토콘드리아 탐험가', homeHref: '../../index.html#hy',
    featureLabels: { build: '🧩 3D 단면 모형', map: '📍 반응 위치 지도', zoom: '🔍 내막 확대와 시안화물', area: '📐 내막 표면적 계산', cells: '🔬 세포 6종 비교' },
    onFeatures() { updateCtl(); },
    levels,
  });

  function readouts() {
    const m = S.mode;
    if (m === 'build') setReads(['조립한 부품', bPlaced() + ' / 7', '단면', Math.round(S.b.sT * 100) + ' %', '회전', Math.round(((S.b.th * 180 / Math.PI) % 360 + 360) % 360) + '°']);
    else if (m === 'map') setReads(['놓은 카드', S.mp.so.placed + ' / 5', '남은 카드', (5 - S.mp.so.placed) + '장', '구역', '4곳']);
    else if (m === 'zoom') setReads(['호흡 억제제', S.zm.cn ? '시안화물' : '없음', '산소 소비', fi(S.zm.o2.v), 'ATP 생산', fi(S.zm.atp.v)]);
    else if (m === 'area') setReads(['크리스타 판 수 N', String(S.ar.N), '내막 표면적', f2(arArea(S.ar.N)) + ' μm²', 'ATP 생산 능력', '× ' + f2(arMult(S.ar.N))]);
    else setReads(['순위 매긴 세포', S.ce.rank.length + ' / 6', '하는 일 고른 세포', CE.filter((c) => fnVal(c.id)).length + ' / 6', '1순위(내 선택)', S.ce.rank.length ? CE.find((c) => c.id === S.ce.rank[0]).name : '—']);
  }

  setMode('build');
  let lastFree = false, lastLv = -1;
  SciSim.loop((dt, t) => {
    clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (game && game.level !== lastLv) { lastLv = game.level; updateCtl(); }
    view.apply(); FX.update(dt); ctx.clearRect(0, 0, VW, VH);
    bgFill('#f3f6ee', '#e8eee2');
    updLater(dt);
    if (S.mode === 'build') bDraw(dt, t); else if (S.mode === 'map') mpDraw(dt, t); else if (S.mode === 'zoom') znDraw(dt, t); else if (S.mode === 'area') arDraw(dt, t); else ceDraw(dt, t);
    FX.draw(); parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(241,246,243,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : approach(S.fade, 0, dt, 9); }
    readouts();
  });

  window.__sim = { S, VW, VH, PHONE, get game() { return game; }, levels, setMode, PARTS, bPlace, bAnchor, bFindMarker, bReset, bCut, bFront, MAPC, mpBuild, znSetDrug, znReset, arSetN, arArea, arMult, arDots, ceTap, CE, CE_ORDER, updateCtl, mpWrong, bPlaced, ceG, mpG };
})();
