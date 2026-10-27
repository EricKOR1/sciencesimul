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
     고등학교 세포와 물질대사 · Ⅲ. 세포호흡과 광합성 - 산소호흡과 발효 (단원 58, 4차시)
     성취기준 [12세포03-04] 산소호흡과 발효의 공통점과 차이점을 이해하고, 실생활에서 발효를 이용한 사례 조사 계획을 세워 조사할 수 있다.
     ① 모형: 산소가 없을 때  ② 모형: 두 가지 발효  ③ 분석: 호흡과 비교  ④ 적용: 사례 판별
     (유기물의 분자 구조식은 다루지 않고 탄소 구슬로 표현해요)
     ========================================================= */
  const S = { mode: 'o2', fade: 0 };
  let game = null;
  const fi = (v) => String(Math.round(v));
  const COL = { glu: '#64748b', pyr: '#f59e0b', ald: '#fb923c', eth: '#dc2626', lac: '#a855f7', co2: '#94a3b8', nad: '#3b82f6', nadh: '#16a34a' };
  const ease = SciSim.ease;

  function pill(x, y, w, h, text, bg, fg, a) {
    ctx.save(); ctx.globalAlpha = a == null ? 1 : a; D.roundRect(x - w / 2, y - h / 2, w, h, h / 2); ctx.fillStyle = bg; ctx.fill(); ctx.strokeStyle = 'rgba(15,23,42,.28)'; ctx.lineWidth = 1; ctx.stroke();
    T(x, y + h * 0.33, text, Math.max(11, h * 0.62), fg, 'center', 800); ctx.restore();
  }
  /* 탄소 구슬 묶음: n개의 구슬 (1 · 2 · 3 · 6), o.cols 로 구슬마다 색, o.off 로 구슬마다 이동 */
  function beadPos(n, r) {
    const d = r * 2.15;
    if (n === 1) return [[0, 0]];
    if (n === 2) return [[-d / 2, d * 0.3], [d / 2, d * 0.3]];
    if (n === 3) return [[-d / 2, d * 0.3], [d / 2, d * 0.3], [0, -d * 0.55]];
    return [[-d, d * 0.5], [0, d * 0.5], [d, d * 0.5], [-d, -d * 0.5], [0, -d * 0.5], [d, -d * 0.5]];
  }
  function mol(x, y, n, r, col, o) {
    o = o || {}; const ps = beadPos(n, r), off = o.off || [];
    ctx.save(); ctx.globalAlpha = o.alpha == null ? 1 : o.alpha;
    const at = (i) => [x + ps[i][0] + (off[i] ? off[i][0] : 0), y + ps[i][1] + (off[i] ? off[i][1] : 0)];
    if (n > 1) {
      ctx.strokeStyle = 'rgba(71,85,105,.5)'; ctx.lineWidth = Math.max(1.6, r * 0.28); ctx.beginPath();
      const ring = n >= 3 ? ps.map((_, i) => i) : [0, 1];
      let first = true; ring.forEach((i) => { if (off[i] && (off[i][0] || off[i][1])) return; const p = at(i); if (first) { ctx.moveTo(p[0], p[1]); first = false; } else ctx.lineTo(p[0], p[1]); });
      if (n >= 3 && !(off.some((q) => q && (q[0] || q[1])))) ctx.closePath();
      ctx.stroke();
    }
    ps.forEach((_, i) => { const p = at(i); D.sphere(p[0], p[1], r, (o.cols && o.cols[i]) || col, { gloss: true }); });
    ctx.restore();
  }
  /* 아래로 이어 쓰는 시간 도우미 */
  const seg = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
  const lerp2 = (a, b, t) => a + (b - a) * t;

  /* =========================================================
     ① 산소가 없을 때: NAD⁺ 가 바닥나면 해당 과정이 멈춰요
     ========================================================= */
  S.o2 = { on: true, tok: [], mach: { st: 'idle', t: 0, gap: 0.5, arr: 0, a: null, b: null, conv: false, atp: false }, pyr: [], atpFly: [], atpEv: [], atpTot: 0, rate: new Num(0), edots: [], bub: [], stopT: 0 };
  function o2G() {
    if (PHONE) {
      return { cell: { x: 10, y: 10, w: 460, h: 372 }, split: 246, GL: { x: 38, y: 92 }, M: { x: 60, y: 46, w: 104, h: 94 }, MC: { x: 112, y: 93 }, MT: [{ x: 88, y: 128 }, { x: 136, y: 128 }],
        PO: { x: 176, y: 93 }, A: { x: 176, y: 50, w: 62, h: 138 }, pyrSlot: (k) => ({ x: 192 + (k % 2) * 30, y: 70 + Math.floor(k / 2) * 22 }), pyrR: 5,
        PB: { x: 18, y: 214, w: 222, h: 156 }, slot: (i) => ({ x: 62 + (i % 2) * 100, y: 262 + Math.floor(i / 2) * 29 }), tw: 62, th: 24,
        Mi: { x: 258, y: 34, w: 204, h: 336 }, door: { x: 258, y: 93 }, q: (k) => ({ x: 302 + (k % 2) * 64, y: 110 + Math.floor(k / 2) * 30 }),
        etc: [{ x: 420, y: 112 }, { x: 420, y: 196 }, { x: 420, y: 280 }], O2: { x: 420, y: 332 }, P: { x: 10, y: 392, w: 460, h: 238 } };
    }
    return { cell: { x: 14, y: 14, w: 772, h: 372 }, split: 428, GL: { x: 58, y: 112 }, M: { x: 100, y: 56, w: 156, h: 112 }, MC: { x: 178, y: 108 }, MT: [{ x: 150, y: 146 }, { x: 206, y: 146 }],
      PO: { x: 276, y: 108 }, A: { x: 280, y: 52, w: 134, h: 132 }, pyrSlot: (k) => ({ x: 304 + (k % 3) * 40, y: 82 + Math.floor(k / 3) * 28 }), pyrR: 6.5,
      PB: { x: 36, y: 214, w: 372, h: 156 }, slot: (i) => ({ x: 98 + (i % 5) * 70, y: 262 + Math.floor(i / 5) * 46 }), tw: 62, th: 26,
      Mi: { x: 446, y: 34, w: 330, h: 336 }, door: { x: 446, y: 108 }, q: (k) => ({ x: 508 + (k % 2) * 76, y: 130 + Math.floor(k / 2) * 34 }),
      etc: [{ x: 668, y: 100 }, { x: 668, y: 190 }, { x: 668, y: 280 }], O2: { x: 736, y: 190 }, P: { x: 14, y: 394, w: 772, h: 152 } };
  }
  function o2Slot(i) { return o2G().slot(i); }
  function o2Reset() {
    const o = S.o2;
    o.tok = []; for (let i = 0; i < 10; i++) { const p = o2Slot(i); o.tok.push({ i, st: 'nad', x: p.x, y: p.y, mv: null, nadh: false, flash: 0, tm: 0, q: -1 }); }
    o.mach = { st: 'idle', t: 0, gap: 0.5, arr: 0, a: null, b: null, conv: false, atp: false }; o.pyr = []; o.atpFly = []; o.atpEv = []; o.atpTot = 0; o.rate.snap(0); o.edots = []; o.bub = []; o.stopT = 0;
    updateCtl();
  }
  const o2Plus = () => S.o2.tok.filter((k) => !k.nadh).length;
  const o2Minus = () => S.o2.tok.filter((k) => k.nadh).length;
  const o2Free = () => S.o2.tok.filter((k) => k.st === 'nad');
  const o2Stopped = () => { const o = S.o2; return !o.on && o.mach.st === 'idle' && o2Free().length < 2 && o.rate.v < 3 && !o.tok.some((k) => k.st === 'toG' || k.st === 'toE'); };
  function mvTo(k, x, y, dur, done, arc) { k.mv = { x0: k.x, y0: k.y, x1: x, y1: y, p: 0, dur: dur, done, arc: arc || 0 }; }
  function o2SetOn(v) {
    const o = S.o2; if (o.on === v) return; o.on = v; Sound.click();
    showHint(v ? '산소가 있어요. NADH 의 전자가 산소에 전달되고 NAD⁺ 가 되돌아와요.' : '산소가 없어요. 전자를 받을 곳이 없으니 NADH 가 NAD⁺ 로 돌아가지 못해요.', 3600);
    updateCtl();
  }
  function o2Update(dt) {
    const o = S.o2, g = o2G(), m = o.mach;
    o.tok.forEach((k) => {
      if (k.flash > 0) k.flash = Math.max(0, k.flash - dt * 2.4);
      if (k.mv) {
        const v = k.mv; v.p = Math.min(1, v.p + dt / (RM ? 0.01 : v.dur)); const e = ease.inOutQuad(v.p);
        k.x = lerp(v.x0, v.x1, e); k.y = lerp(v.y0, v.y1, e) - (v.arc ? Math.sin(v.p * Math.PI) * v.arc : 0);
        if (v.p >= 1) { k.mv = null; if (v.done) v.done(k); }
      }
      if (k.st === 'atE' && !k.mv) {
        if (o.on) {
          k.tm += dt;
          if (k.tm >= 0.45) {
            k.tm = 0; k.nadh = false; k.flash = 1; Sound.tick();
            parts.burst(k.x, k.y, { count: 6, colors: ['#fde047', '#fff'], speed: 70, life: 0.5, gravity: 0, size: 3 });
            o.edots.push({ x0: k.x, y0: k.y, t: 0 });
            k.st = 'back'; k.q = -1;
            const p = o2Slot(k.i); mvTo(k, p.x, p.y, 0.9, (kk) => { kk.st = 'nad'; }, 26);
          }
        } else { k.tm = 0; }
      }
    });
    // 해당 과정 기계
    if (m.st === 'idle') {
      m.gap -= dt;
      const fr = o2Free();
      if (m.gap <= 0 && fr.length >= 2) {
        m.st = 'load'; m.arr = 0; m.conv = false; m.atp = false; m.a = fr[0]; m.b = fr[1];
        [m.a, m.b].forEach((k, j) => { k.st = 'toG'; mvTo(k, g.MT[j].x, g.MT[j].y, 0.4, () => { m.arr++; if (m.arr >= 2) { m.st = 'run'; m.t = 0; } }); });
      }
    } else if (m.st === 'run') {
      m.t += dt;
      if (m.t >= 0.3 && !m.conv) { m.conv = true; [m.a, m.b].forEach((k) => { k.nadh = true; k.flash = 1; }); parts.burst(g.MC.x, g.MC.y + 20, { count: 8, colors: ['#4ade80', '#fff'], speed: 80, life: 0.5, gravity: 0, size: 3 }); }
      if (m.t >= 0.4 && !m.atp) { m.atp = true; o.atpTot += 2; o.atpEv.push(clock, clock); o.atpFly.push({ t: 0, dx: -16 }, { t: 0, dx: 16 }); Sound.tick(); }
      if (m.t >= 0.8) {
        m.st = 'idle'; m.gap = 0.2;
        for (let j = 0; j < 2; j++) o.pyr.push({ x: g.PO.x - 6, y: g.PO.y + (j ? 16 : -16), st: 'out', t: 0, k: -1, mv: null });
        [m.a, m.b].forEach((k) => {
          let q = 0; while (o.tok.some((z) => z.q === q)) q++;
          k.st = 'toE'; k.q = q; const p = g.q(q); mvTo(k, p.x, p.y, 0.9, (kk) => { kk.st = 'atE'; kk.tm = 0; }, 18);
        });
      }
    }
    // 피루브산: 산소가 있으면 미토콘드리아로, 없으면 쌓여요
    o.pyr.forEach((p) => {
      if (o.on && p.st !== 'in') { p.st = 'in'; p.t = 0; p.sx = p.x; p.sy = p.y; }
      if (!o.on && p.st === 'out') { let k = 0; while (o.pyr.some((q) => q !== p && q.k === k)) k++; p.k = k; p.st = 'stay'; p.mv = null; }
      if (p.st === 'in') { p.t += dt / 1.5; const e = ease.inOutQuad(clamp(p.t, 0, 1)); p.x = lerp(p.sx, g.door.x + 80, e); p.y = lerp(p.sy, g.door.y, e); }
      else if (p.st === 'stay') { const s = g.pyrSlot(p.k); p.x = approach(p.x, s.x, dt, 6); p.y = approach(p.y, s.y, dt, 6); }
    });
    for (let i = o.pyr.length - 1; i >= 0; i--) { if (o.pyr[i].st === 'in' && o.pyr[i].t >= 1) { const q = o.pyr[i]; parts.burst(q.x, q.y, { count: 5, colors: ['#94a3b8', '#fff'], speed: 40, life: 0.6, gravity: -20, shape: 'bubble', size: 3 }); o.pyr.splice(i, 1); } }
    // e⁻ 점 (전자 전달계를 따라 산소로)
    for (let i = o.edots.length - 1; i >= 0; i--) { const e = o.edots[i]; e.t += dt / 1.4; if (e.t >= 1) { parts.burst(g.O2.x, g.O2.y, { count: 5, colors: ['#38bdf8', '#bae6fd'], speed: 40, life: 0.6, gravity: -25, shape: 'bubble', size: 3 }); o.edots.splice(i, 1); } }
    for (let i = o.atpFly.length - 1; i >= 0; i--) { o.atpFly[i].t += dt / 1.4; if (o.atpFly[i].t >= 1) o.atpFly.splice(i, 1); }
    while (o.atpEv.length && clock - o.atpEv[0] > 2.0) o.atpEv.shift();
    o.rate.set(clamp(o.atpEv.length / 2.0 / 1.5, 0, 1) * 100); o.rate.update(dt, 5);
  }
  function o2Path(g, e) {   // 전자 전달계를 따라가는 e⁻ 점의 위치
    const pts = [{ x: e.x0, y: e.y0 }, g.etc[0], g.etc[1], g.etc[2], g.O2];
    const u = e.t * (pts.length - 1), i = Math.min(pts.length - 2, Math.floor(u)), f = u - i;
    return { x: lerp(pts[i].x, pts[i + 1].x, f), y: lerp(pts[i].y, pts[i + 1].y, f) };
  }
  function tokDraw(k, g) {
    const col = k.nadh ? COL.nadh : COL.nad, txt = k.nadh ? 'NADH' : 'NAD⁺';
    if (k.flash > 0) D.glow(k.x, k.y, 30, k.nadh ? '#4ade80' : '#60a5fa', k.flash * 0.8);
    ctx.save(); D.shadow(() => { D.roundRect(k.x - g.tw / 2, k.y - g.th / 2, g.tw, g.th, g.th / 2); ctx.fillStyle = col; ctx.fill(); }, { blur: 4, y: 2 });
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1.5; D.roundRect(k.x - g.tw / 2, k.y - g.th / 2, g.tw, g.th, g.th / 2); ctx.stroke();
    T(k.x, k.y + 5, txt, 13.5, '#fff', 'center', 800); ctx.restore();
  }
  function mitoBody(Mi, dim) {
    ctx.save(); D.roundRect(Mi.x, Mi.y, Mi.w, Mi.h, 64); ctx.fillStyle = dim ? '#fdf3e4' : '#fff4de'; ctx.fill(); ctx.strokeStyle = '#a8561f'; ctx.lineWidth = 3.5; ctx.stroke();
    D.roundRect(Mi.x + 14, Mi.y + 14, Mi.w - 28, Mi.h - 28, 52); ctx.strokeStyle = '#c2255c'; ctx.lineWidth = 3; ctx.stroke(); ctx.restore();
  }
  function o2Draw(dt, t) {
    const o = S.o2, g = o2G(), c = g.cell, m = o.mach; o2Update(dt);
    // 세포 (세포질 + 미토콘드리아)
    D.shadow(() => { D.roundRect(c.x, c.y, c.w, c.h, 30); ctx.fillStyle = '#eaf6ec'; ctx.fill(); }, { blur: 8, y: 2 });
    D.roundRect(c.x, c.y, c.w, c.h, 30); ctx.strokeStyle = '#7fb69a'; ctx.lineWidth = 3; ctx.stroke();
    T(c.x + (PHONE ? 16 : 22), c.y + 22, '세포질', 14, '#2f7a52', 'left', 800);
    mitoBody(g.Mi, !o.on);
    T(g.Mi.x + g.Mi.w / 2, g.Mi.y + g.Mi.h - 20, '미토콘드리아 (전자 전달계)', PHONE ? 12.5 : 14, '#a8561f', 'center', 800);
    // 해당 과정 기계
    const M = g.M; D.shadow(() => { D.roundRect(M.x, M.y, M.w, M.h, 16); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: 6, y: 2 });
    D.roundRect(M.x, M.y, M.w, M.h, 16); ctx.strokeStyle = m.st === 'run' ? '#16a34a' : '#94a3b8'; ctx.lineWidth = m.st === 'run' ? 3.5 : 2; ctx.stroke();
    T(M.x + M.w / 2, M.y + 17, '해당 과정', PHONE ? 13 : 14.5, '#166534', 'center', 800);
    const br = PHONE ? 6 : 7.5;
    if (m.st === 'run') {
      const u = seg(m.t, 0.25, 0.8);
      if (u <= 0) mol(g.MC.x, g.MC.y + 4, 6, br * 0.82, COL.glu);
      else { const sp = u * (PHONE ? 20 : 26); mol(g.MC.x, g.MC.y + 4 - sp, 3, br, COL.glu); mol(g.MC.x, g.MC.y + 4 + sp, 3, br, COL.glu); }
    } else if (m.st === 'load' || m.st === 'idle') { ctx.save(); ctx.globalAlpha = 0.55; mol(g.GL.x, g.GL.y, 6, br * 0.82, COL.glu); ctx.restore(); T(g.GL.x, g.GL.y + (PHONE ? 30 : 34), '포도당', 12.5, '#475569', 'center', 800); }
    if (m.st === 'run') T(g.GL.x, g.GL.y + (PHONE ? 30 : 34), '포도당', 12.5, '#475569', 'center', 800);
    if (m.st === 'load' || m.st === 'run' || m.st === 'idle') D.arrow(g.GL.x + (PHONE ? 22 : 28), g.GL.y, M.x - 2, g.GL.y, { color: '#94a3b8', width: 2, head: 8 });
    // 피루브산 쌓임 칸
    const A = g.A; D.roundRect(A.x, A.y, A.w, A.h, 12); ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fill(); ctx.setLineDash([5, 4]); ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.setLineDash([]);
    T(A.x + A.w / 2, A.y + A.h + 15, PHONE ? '피루브산' : '피루브산 (3탄소)', 12.5, '#b45309', 'center', 800);
    o.pyr.forEach((p) => { const a = p.st === 'in' ? 1 - Math.max(0, p.t - 0.7) / 0.3 : 1; mol(p.x, p.y, 3, g.pyrR, COL.pyr, { alpha: a }); });
    // NAD 풀
    const PB = g.PB; D.roundRect(PB.x, PB.y, PB.w, PB.h, 14); ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fill(); ctx.strokeStyle = '#a5b4cf'; ctx.lineWidth = 2; ctx.stroke();
    T(PB.x + 12, PB.y + 22, PHONE ? 'NAD 풀 (모두 10개)' : 'NAD⁺ · NADH 풀 (모두 10개)', 13.5, '#334155', 'left', 800);
    for (let i = 0; i < 10; i++) { const s = g.slot(i); ctx.setLineDash([4, 3]); ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1.5; D.roundRect(s.x - g.tw / 2, s.y - g.th / 2, g.tw, g.th, g.th / 2); ctx.stroke(); ctx.setLineDash([]); }
    // 전자 전달계 · 산소
    const etc = g.etc; ctx.save();
    ctx.strokeStyle = o.on ? 'rgba(194,37,92,.35)' : 'rgba(148,163,184,.35)'; ctx.lineWidth = 12; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(etc[0].x, etc[0].y - 26); ctx.lineTo(etc[2].x, etc[2].y + 26); ctx.stroke(); ctx.restore();
    etc.forEach((p, i) => { D.roundRect(p.x - 22, p.y - 17, 44, 34, 10); ctx.fillStyle = o.on ? '#e5508a' : '#cbd5e1'; ctx.fill(); ctx.strokeStyle = o.on ? '#9d174d' : '#94a3b8'; ctx.lineWidth = 2; ctx.stroke(); T(p.x, p.y + 5, ['복합체', '복합체', '복합체'][i], 12, '#fff', 'center', 800); });
    const op = g.O2, oOn = o.on;
    D.sphere(op.x - 9, op.y, 11, oOn ? '#ef4444' : '#cbd5e1', { gloss: oOn }); D.sphere(op.x + 9, op.y, 11, oOn ? '#ef4444' : '#cbd5e1', { gloss: oOn });
    T(op.x, op.y + 31, oOn ? 'O₂' : 'O₂ 없음', 13.5, oOn ? '#b91c1c' : '#64748b', 'center', 800);
    if (!oOn) { ctx.save(); ctx.strokeStyle = '#e2464b'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(op.x - 22, op.y - 20); ctx.lineTo(op.x + 22, op.y + 20); ctx.moveTo(op.x + 22, op.y - 20); ctx.lineTo(op.x - 22, op.y + 20); ctx.stroke(); ctx.restore(); }
    // 토큰
    o.tok.forEach((k) => { if (k.st === 'atE' && !o.on && !RM) { k.x += Math.sin(clock * 9 + k.i) * 0.15; } tokDraw(k, g); });
    o.edots.forEach((e) => { const p = o2Path(g, e); D.glow(p.x, p.y, 13, '#facc15', 0.6); D.sphere(p.x, p.y, 5.5, '#fde047', { gloss: false, text: 'e⁻', textColor: '#713f12', textScale: 1.1 }); });
    if (!oOn) T(g.Mi.x + g.Mi.w / 2, g.Mi.y + 28, '전자를 받을 곳이 없어요', PHONE ? 12.5 : 13.5, '#e2464b', 'center', 800);
    o.atpFly.forEach((a) => { const p = a.t; pill(M.x + M.w / 2 + a.dx, M.y - 8 - p * 22, 44, 21, 'ATP', '#facc15', '#713f12', 1 - p * p); });
    // 게이지
    const P = g.P; panel(P.x, P.y, P.w, P.h, 16, '#fff');
    const plus = o2Plus(), minus = o2Minus();
    const bx = P.x + 18, bw = PHONE ? P.w - 36 : 250;
    T(bx, P.y + 26, '조건: ' + (oOn ? '산소 있음' : '산소 없음'), 15, oOn ? '#15803d' : '#b91c1c', 'left', 800);
    T(bx, P.y + 52, 'NAD⁺ ' + plus + '개   NADH ' + minus + '개', 15, '#1f2d44', 'left', 800);
    D.roundRect(bx, P.y + 62, bw, 18, 9); ctx.fillStyle = '#eef2f7'; ctx.fill();
    if (plus > 0) { D.roundRect(bx, P.y + 62, bw * plus / 10, 18, 9); ctx.fillStyle = COL.nad; ctx.fill(); }
    if (minus > 0) { D.roundRect(bx + bw * plus / 10, P.y + 62, bw * minus / 10, 18, minus >= 10 ? 9 : 6); ctx.fillStyle = COL.nadh; ctx.fill(); }
    T(bx, P.y + 100, '파랑 = NAD⁺   초록 = NADH', 12.5, '#64748b', 'left', 700);
    const rx = PHONE ? P.x + 18 : P.x + 300, ry = PHONE ? P.y + 128 : P.y + 26, rw = PHONE ? P.w - 36 : 190;
    T(rx, ry, '해당 과정의 ATP 생산 속도', 14.5, '#1f2d44', 'left', 800);
    D.roundRect(rx, ry + 10, rw, 20, 10); ctx.fillStyle = '#eef2f7'; ctx.fill();
    if (o.rate.v > 1) { D.roundRect(rx, ry + 10, Math.max(14, rw * o.rate.v / 100), 20, 10); ctx.fillStyle = o.rate.v < 10 ? '#e2464b' : '#16a34a'; ctx.fill(); }
    T(rx, ry + 52, fi(o.rate.v) + ' %', 22, o.rate.v < 10 ? '#b91c1c' : '#15803d', 'left', 800);
    T(rx + 70, ry + 50, o2Stopped() ? '멈췄어요' : (o.rate.v < 10 && !oOn ? '느려져요…' : '진행 중'), 15, o2Stopped() ? '#b91c1c' : '#475569', 'left', 800);
    T(rx, ry + (PHONE ? 70 : 76), '지금까지 만든 ATP (순생산)  ' + o.atpTot, 13.5, '#475569', 'left', 800);
    if (!PHONE) {
      const tx = P.x + 520;
      T(tx, P.y + 26, '해당 과정이 계속되려면', 14.5, '#1f2d44', 'left', 800);
      T(tx, P.y + 50, 'NAD⁺ 가 있어야 해요.', 14.5, COL.nad, 'left', 800);
      T(tx, P.y + 76, '(포도당 1분자가 NAD⁺ 2개를', 13, '#64748b', 'left', 700); T(tx, P.y + 94, 'NADH 2개로 바꿔요)', 13, '#64748b', 'left', 700);
      if (o2Stopped()) { D.label(tx, P.y + 128, 'NAD⁺ 를 되살릴 방법이 없을까?', { bg: '#fef3c7', color: '#92400e', border: '#f59e0b', size: 14, align: 'left' }); }
    } else if (o2Stopped()) D.label(P.x + P.w / 2, P.y + P.h - 14, 'NAD⁺ 를 되살릴 방법이 없을까?', { bg: '#fef3c7', color: '#92400e', border: '#f59e0b', size: 13.5 });
  }

  /* =========================================================
     ② 두 가지 발효: 피루브산에 NADH 의 전자를 건네요
     ========================================================= */
  S.fm = { org: 'alc', run: null, done: { alc: 0, lac: 0 }, c: { eth: new Num(0), co2: new Num(0), lac: new Num(0), atp: new Num(0), nad: new Num(0) }, vis: 1 };
  function fmG() {
    if (PHONE) return { cell: { x: 10, y: 10, w: 460, h: 332 }, r: 7, G0: { x: 30, y: 176 }, M: { x: 52, y: 130, w: 78, h: 92 }, GS: { x: 91, y: 176 }, ly: [104, 248], x0: 176, x1: 268, x2: 356, x3: 442, NS: { x: 91, y: 70 }, P: { x: 10, y: 352, w: 460, h: 278 }, fs: 12.5 };
    return { cell: { x: 14, y: 14, w: 772, h: 372 }, r: 9, G0: { x: 66, y: 200 }, M: { x: 116, y: 144, w: 120, h: 112 }, GS: { x: 176, y: 200 }, ly: [118, 282], x0: 330, x1: 470, x2: 610, x3: 746, NS: { x: 176, y: 74 }, P: { x: 14, y: 394, w: 772, h: 152 }, fs: 14 };
  }
  function fmReset() { const f = S.fm; f.run = null; Object.keys(f.c).forEach((k) => f.c[k].snap(0)); updateCtl(); }
  function fmStart() {
    const f = S.fm; if (f.run && !f.run.fin) return; fmReset(); f.run = { t: 0, org: f.org, fin: false, ev: {} }; Sound.click(); updateCtl();
  }
  function fmSetOrg(org) { const f = S.fm; if (f.org === org) return; f.org = org; fmReset(); Sound.click(); showHint(org === 'alc' ? '효모는 알코올 발효를 해요. 피루브산이 CO₂ 를 내보내요.' : '젖산균과 근육 세포는 젖산 발효를 해요. CO₂ 는 생기지 않아요.', 3200); }
  const LD = 0.35;   // 아래 줄은 조금 늦게 움직여요
  /* 한 줄(lane)의 분자 상태 */
  function fmLane(i, t, org, g) {
    const y = g.ly[i], tl = t - (i ? LD : 0), alc = org === 'alc', r = g.r, sg = i ? 1 : -1;
    const o = { mol: null, co2: null, nad: null, e: null };
    const sx = g.GS.x, sy = g.GS.y, d = r * 2.15;
    // 피루브산: 해당 과정 → 줄의 시작
    const u1 = ease.inOutQuad(seg(t, 1.1, 2.1));
    let mx = lerp(sx + 26, g.x0, u1), my = lerp(sy + sg * 22, y, u1), n = 3, col = COL.pyr, name = '피루브산 (3탄소)', alpha = t < 1.1 ? 0 : 1;
    if (tl >= 2.6) {
      my = y;
      if (alc) {
        n = 2; col = COL.ald; name = '아세트알데하이드 (2탄소)';
        mx = lerp(g.x0, g.x1, ease.inOutQuad(seg(tl, 3.0, 4.0)));
        const p = seg(tl, 2.6, 4.6), e = ease.outQuad(p);
        o.co2 = { x: g.x0 + e * (PHONE ? 40 : 64), y: y - d * 0.55 - e * (PHONE ? 40 : 52), a: 1 - Math.max(0, p - 0.55) / 0.45 };
      } else mx = lerp(g.x0, g.x1, ease.inOutQuad(seg(tl, 3.0, 4.0)));
    }
    if (tl >= 4.5) {
      col = alc ? COL.eth : COL.lac; n = alc ? 2 : 3; name = alc ? '에탄올 (2탄소)' : '젖산 (3탄소)';
      mx = lerp(g.x1, g.x2, ease.inOutQuad(seg(tl, 5.0, 6.2)));
    }
    if (alpha > 0) o.mol = { x: mx, y: my, n, col, name, alpha };
    // 전자 운반체: NAD⁺ → NADH (해당 과정) → 줄 → NAD⁺ (되돌아감)
    const nx = g.NS.x + sg * 24, ny = g.NS.y, hx = g.x1 - 4, hy = y - 32;
    let tx = nx, ty = ny, red = false, fl = 0;
    if (t < 1.0) { tx = nx; ty = ny; }
    else if (t < 1.5) { const u = ease.inOutQuad(seg(t, 1.0, 1.5)); tx = lerp(nx, sx - sg * 20, u); ty = lerp(ny, sy - 8, u); }
    else if (t < 2.1) { tx = sx - sg * 20; ty = sy - 8; red = true; if (t < 1.8) fl = 1 - seg(t, 1.5, 1.8); }
    else if (tl < 4.5) { const u = ease.inOutQuad(seg(t, 2.1, 3.3 + (i ? LD : 0))); tx = lerp(sx - sg * 20, hx, u); ty = lerp(sy - 8, hy, u); red = true; }
    else if (tl < 4.8) { tx = hx; ty = hy; fl = 1 - seg(tl, 4.5, 4.8); }
    else { const u = ease.inOutQuad(seg(tl, 4.8, 6.4)); tx = lerp(hx, nx, u); ty = lerp(hy, ny, u) - Math.sin(u * Math.PI) * 22; }
    o.nad = { x: tx, y: ty, red, fl };
    if (tl >= 4.0 && tl < 4.5) { const p = seg(tl, 4.0, 4.5); o.e = { x: lerp(hx, g.x1, p), y: lerp(hy, y, p) }; }
    return o;
  }
  function fmCaption(t, org) {
    if (t < 1.1) return '① 포도당(6탄소) 1분자를 넣어요.';
    if (t < 2.2) return '② 해당 과정: 포도당 → 피루브산(3탄소) 2분자. NAD⁺ 가 NADH 로 바뀌고 순 ATP 2가 생겨요.';
    if (t < 4.0) return org === 'alc' ? '③ 피루브산에서 CO₂ 가 떨어져 나가요 → 2탄소 아세트알데하이드' : '③ 피루브산(3탄소)이 그대로 NADH 곁으로 가요. CO₂ 는 나오지 않아요.';
    if (t < 4.8) return '④ NADH 가 전자(수소)를 건네요 → ' + (org === 'alc' ? '아세트알데하이드가 에탄올로 환원' : '피루브산이 젖산으로 환원');
    if (t < 6.9) return '⑤ NAD⁺ 가 되살아나 해당 과정으로 돌아가요. 발효 덕분에 해당 과정이 이어져요.';
    return '포도당 1분자의 결과: ' + (org === 'alc' ? '에탄올 2 + CO₂ 2 + ATP 2' : '젖산 2 + ATP 2') + ' (NAD⁺ 2 재생)';
  }
  function fmDraw(dt, t) {
    const f = S.fm, g = fmG(), c = g.cell, run = f.run, alc = f.org === 'alc';
    if (run && !run.fin) { run.t += dt * (RM ? 3 : 1); }
    const rt = run ? Math.min(run.t, 7.3) : 0;
    if (run && !run.fin && run.t >= 7.3) { run.fin = true; f.done[run.org]++; Sound.success(); updateCtl(); }
    // 카운터 목표
    const L0 = fmLane(0, rt, f.org, g), L1 = fmLane(1, rt, f.org, g);
    const cnt = (tt0) => (rt >= tt0 ? 1 : 0) + (rt >= tt0 + LD ? 1 : 0);
    if (run) {
      f.c.atp.set(rt >= 1.7 ? 2 : 0); f.c.co2.set(alc ? cnt(3.0) : 0); f.c.eth.set(alc ? cnt(4.5) : 0); f.c.lac.set(alc ? 0 : cnt(4.5)); f.c.nad.set(cnt(6.3));
    } else Object.keys(f.c).forEach((k) => f.c[k].set(0));
    Object.keys(f.c).forEach((k) => f.c[k].update(dt, 6));
    // 세포
    D.shadow(() => { D.roundRect(c.x, c.y, c.w, c.h, alc ? 40 : 26); ctx.fillStyle = alc ? '#fff4e0' : '#f1ecff'; ctx.fill(); }, { blur: 8, y: 2 });
    D.roundRect(c.x, c.y, c.w, c.h, alc ? 40 : 26); ctx.strokeStyle = alc ? '#d9a441' : '#9a86d6'; ctx.lineWidth = 3.5; ctx.stroke();
    T(c.x + 18, c.y + 24, alc ? '🍞 효모 (알코올 발효)' : '🦠 젖산균 · 근육 세포 (젖산 발효)', PHONE ? 13.5 : 15, alc ? '#92400e' : '#5b21b6', 'left', 800);
    T(c.x + c.w - 16, c.y + 24, '세포질 (미토콘드리아는 쓰지 않아요)', PHONE ? 11.5 : 13, '#64748b', 'right', 700);
    // 해당 과정 기계
    const M = g.M; D.roundRect(M.x, M.y, M.w, M.h, 16); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#16a34a'; ctx.lineWidth = rt > 1.1 && rt < 2.2 ? 4 : 2.5; ctx.stroke();
    T(M.x + M.w / 2, M.y + 20, '해당 과정', g.fs, '#166534', 'center', 800);
    T(g.GS.x, M.y + M.h - 10, '순 ATP 2', g.fs - 1, '#92400e', 'center', 800);
    if (!PHONE) { T(g.GS.x, M.y + 46, '6탄소 → 3탄소 × 2', 12.5, '#475569', 'center', 700); T(g.GS.x, M.y + 66, 'NAD⁺ 2 → NADH 2', 12.5, '#475569', 'center', 700); } else { T(g.GS.x, M.y + 44, '6C → 3C × 2', 11.5, '#475569', 'center', 700); T(g.GS.x, M.y + 62, 'NAD⁺ → NADH', 11.5, '#475569', 'center', 700); }
    // 포도당
    const gu = run ? ease.inOutQuad(seg(rt, 0, 1.0)) : 0;
    if (!run || rt < 1.1) {
      const gx = lerp(g.G0.x, g.GS.x, gu), a = run ? 1 : 0.45;
      mol(gx, g.GS.y + 2 + (run ? 0 : 0), 6, g.r * 0.82, COL.glu, { alpha: a });
      if (!run) T(g.GS.x, g.GS.y + 4 + g.r * 3.4, '포도당 1분자를 넣어 보세요', PHONE ? 11.5 : 13, '#64748b', 'center', 700);
      else T(gx, g.GS.y + 2 + g.r * 3, '포도당 (6탄소)', 12.5, '#475569', 'center', 800);
    }
    // 줄 (발효)
    g.ly.forEach((y, i) => {
      ctx.save(); D.roundRect(g.x0 - g.r * 3.2, y - 46, g.x3 - g.x0 + g.r * 3.2 + 8, 92, 16); ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.fill(); ctx.restore();
      D.arrow(g.x0 + g.r * 2.4, y, g.x1 - g.r * 2.4, y, { color: '#cbd5e1', width: 3, head: 9 }); D.arrow(g.x1 + g.r * 2.4, y, g.x2 - g.r * 2.4, y, { color: '#cbd5e1', width: 3, head: 9 });
    });
    // 분자 · 운반체
    [L0, L1].forEach((L, i) => {
      if (!run) { const nx = g.NS.x + (i ? 24 : -24); pill(nx, g.NS.y, PHONE ? 52 : 60, PHONE ? 22 : 24, 'NAD⁺', COL.nad, '#fff'); return; }
      if (L.co2 && L.co2.a > 0.02) { ctx.save(); ctx.globalAlpha = L.co2.a; D.sphere(L.co2.x, L.co2.y, g.r, COL.co2, { gloss: true }); T(L.co2.x + g.r + 6, L.co2.y + 5, 'CO₂', 13, '#475569', 'left', 800); ctx.restore(); if (!RM && Math.random() < 0.25) parts.emit({ x: L.co2.x, y: L.co2.y, vx: (Math.random() - 0.5) * 20, vy: -20, life: 0.5, size: 2.5, color: '#cbd5e1', shape: 'bubble' }); }
      if (L.mol) { const m = L.mol; mol(m.x, m.y, m.n, g.r, m.col, { cols: m.cols, off: m.off, alpha: m.alpha }); if (m.alpha > 0.5) TF(m.x, m.y + g.r * 2.6 + 4, m.name, PHONE ? 90 : 150, g.fs - 0.5, 11, '#334155', 'center', 800); }
      const nd = L.nad;
      if (nd.fl > 0) D.glow(nd.x, nd.y, 30, nd.red ? '#4ade80' : '#60a5fa', nd.fl * 0.8);
      pill(nd.x, nd.y, PHONE ? 52 : 60, PHONE ? 22 : 24, nd.red ? 'NADH' : 'NAD⁺', nd.red ? COL.nadh : COL.nad, '#fff');
      if (L.e) { D.glow(L.e.x, L.e.y, 12, '#facc15', 0.6); D.sphere(L.e.x, L.e.y, 5.5, '#fde047', { gloss: false, text: 'e⁻', textColor: '#713f12', textScale: 1.1 }); }
    });
    if (run && rt > 1.55 && rt < 2.9) pill(g.GS.x, M.y - 10 - (rt - 1.55) * 14, 74, 22, '+2 ATP', '#facc15', '#713f12', 1 - seg(rt, 2.2, 2.9));
    if (!run) { T((g.x1 + g.x0) / 2 + 20, (g.ly[0] + g.ly[1]) / 2 + 5, '▶ 버튼을 눌러 포도당 1분자를 넣어요', PHONE ? 13 : 15, '#64748b', 'center', 800); }
    // 설명 자막
    if (run) { const cap = fmCaption(rt, f.org); const ls = wrap(cap, c.w - 36, g.fs, 800); ls.forEach((l, k) => T(c.x + c.w / 2, c.y + c.h - 14 - (ls.length - 1 - k) * 18, l, g.fs, '#1f2d44', 'center', 800, { stroke: 'rgba(255,255,255,.85)', strokeWidth: 4 })); }
    // 카운터
    const P = g.P; panel(P.x, P.y, P.w, P.h, 16, '#fff');
    T(P.x + 16, P.y + 24, '포도당 1분자의 결과 (실행 ' + (f.done[f.org]) + '회 완료)', 14.5, '#1f2d44', 'left', 800);
    const items = alc ? [['에탄올', f.c.eth, COL.eth, '2탄소'], ['CO₂', f.c.co2, COL.co2, '1탄소'], ['ATP (순)', f.c.atp, '#eab308', '해당 과정'], ['NAD⁺ 재생', f.c.nad, COL.nad, '해당 과정으로']]
      : [['젖산', f.c.lac, COL.lac, '3탄소'], ['CO₂', null, COL.co2, '생기지 않아요'], ['ATP (순)', f.c.atp, '#eab308', '해당 과정'], ['NAD⁺ 재생', f.c.nad, COL.nad, '해당 과정으로']];
    const cols = PHONE ? 2 : 4, bw = (P.w - 32 - (cols - 1) * 10) / cols, bh = PHONE ? 100 : 86;
    items.forEach((it, k) => {
      const bx = P.x + 16 + (k % cols) * (bw + 10), by = P.y + 38 + Math.floor(k / cols) * (bh + 8);
      D.roundRect(bx, by, bw, bh, 12); ctx.fillStyle = C.rgba(it[2], 0.12); ctx.fill(); ctx.strokeStyle = C.rgba(it[2], 0.7); ctx.lineWidth = 2; ctx.stroke();
      T(bx + bw / 2, by + 22, it[0], 14.5, '#334155', 'center', 800);
      T(bx + bw / 2, by + 60, it[1] ? fi(it[1].v) : '0', 34, it[1] ? '#1f2d44' : '#94a3b8', 'center', 800);
      T(bx + bw / 2, by + bh - 8, it[3], 12, '#64748b', 'center', 700);
    });
  }
  const fmDone = () => S.fm.done.alc >= 1 && S.fm.done.lac >= 1;

  /* ---------- 산물 카드 (카드 분류) ---------- */
  const PRC = [
    { id: 'p1', label: '에탄올', short: '에탄올', sub: '2탄소', icon: '🍷', col: '#dc2626', ans: 'alc', why: '에탄올은 효모의 알코올 발효 산물이에요. (2탄소)' },
    { id: 'p2', label: '이산화 탄소(CO₂)', short: 'CO₂', sub: '피루브산에서 떨어져 나가요', icon: '💨', col: '#64748b', ans: 'alc', why: 'CO₂ 는 알코올 발효에서만 생겨요. 피루브산(3탄소)에서 1탄소가 떨어져 나가요.' },
    { id: 'p3', label: '아세트알데하이드', short: '아세트알데하이드', sub: '2탄소 중간 물질', icon: '⚗️', col: '#fb923c', ans: 'alc', why: '아세트알데하이드는 알코올 발효의 중간 물질로, NADH 의 전자를 받아 에탄올이 돼요.' },
    { id: 'p4', label: '젖산', short: '젖산', sub: '3탄소', icon: '🥛', col: '#a855f7', ans: 'lac', why: '젖산은 피루브산이 NADH 의 전자를 받아 만들어져요. 탄소 3개 그대로예요.' },
    { id: 'p5', label: '순 ATP 2', short: '순 ATP 2', sub: '해당 과정에서', icon: '🔋', col: '#ca8a04', ans: 'both', why: '두 발효 모두 해당 과정의 기질 수준 인산화로 포도당 1분자당 순 ATP 2를 얻어요.' },
    { id: 'p6', label: 'NAD⁺ 재생', short: 'NAD⁺ 재생', sub: 'NADH → NAD⁺', icon: '♻️', col: '#2563eb', ans: 'both', why: '두 발효 모두 NADH 를 NAD⁺ 로 되돌려 해당 과정이 계속되게 해요.' },
  ];
  function sortGeo(kind) {
    // kind: prod(3상자 6장) | venn(3상자 10장) | case(3상자 10장)
    const names = {
      prod: [['alc', '알코올 발효 (효모)', '#dc2626'], ['both', '두 발효 모두', '#2563eb'], ['lac', '젖산 발효', '#a855f7']],
      venn: [['resp', '산소호흡만', '#16a34a'], ['both', '둘 다 (공통)', '#2563eb'], ['ferm', '발효만', '#ea580c']],
      case: [['alc', '알코올 발효', '#dc2626'], ['lac', '젖산 발효', '#a855f7'], ['resp', '산소호흡', '#16a34a']],
    }[kind];
    if (PHONE) {
      const bw = 148, bh = { prod: 190, venn: 280, case: 262 }[kind], boxes = names.map(([id, label, col], k) => ({ id, label, col, x: 10 + k * (bw + 8), y: 10, w: bw, h: bh, cols: 1, hdr: 34 }));
      const n = kind === 'prod' ? 6 : 10, ty = bh + 24;
      return { boxes, cw: 226, ch: 40, kh: kind === 'prod' ? 40 : 50, tray: (i) => ({ x: 10 + (i % 2) * 234, y: ty + Math.floor(i / 2) * 44 }), B: { x: 10, y: ty + Math.ceil(n / 2) * 44 + 4, w: 460, h: 636 - (ty + Math.ceil(n / 2) * 44 + 4) } };
    }
    const bw = 250, bh = kind === 'prod' ? 214 : 242, boxes = names.map(([id, label, col], k) => ({ id, label, col, x: 14 + k * (bw + 11), y: 14, w: bw, h: bh, cols: 1, hdr: 34 }));
    return { boxes, cw: kind === 'prod' ? 246 : 146, ch: kind === 'prod' ? 52 : 56, kh: kind === 'prod' ? 40 : 40, tray: kind === 'prod' ? (i) => ({ x: 14 + (i % 3) * 257, y: bh + 34 + Math.floor(i / 3) * 62 }) : (i) => ({ x: 14 + (i % 5) * 156.5, y: bh + 28 + Math.floor(i / 5) * 64 }), B: { x: 14, y: 14 + bh + 28 + (kind === 'prod' ? 130 : 136), w: 772, h: 546 - (14 + bh + 28 + (kind === 'prod' ? 130 : 136)) } };
  }
  S.pr = { so: null, pick: null };
  S.vn = { so: null, pick: null };
  S.cs = { so: null, pick: null };
  function mkSorter(slot, cards, kind) {
    const g = sortGeo(kind);
    slot.so = new Sorter({ cards, boxes: g.boxes, tray: g.tray, cw: g.cw, ch: g.ch, kh: g.kh, onChange() { slot.pick = null; updateCtl(); }, onTap(c) { slot.pick = slot.pick === c ? null : c; Sound.tick(); }, isSel: (c) => slot.pick === c });
    slot.so.cards.forEach((c, i) => { c.ans = cards[i].ans; });
  }
  const sortPT = (slot) => ({
    down(p) { const so = slot.so; if (so.down(p)) return true; if (slot.pick) { const bx = so.boxAt(p); if (bx) { const c = slot.pick; slot.pick = null; so.place(c, bx.id); } } return false; },
    move(p) { slot.so.move(p); }, up(p) { slot.so.up(p); }, hover(p) { return slot.so.hover(p); },
  });
  const sortWrong = (slot) => slot.so.cards.filter((c) => c.zone && c.zone !== c.ans);
  function sortCheck(slot, total, defs) {
    const so = slot.so; if (so.placed < total) return '카드 ' + total + '장을 모두 상자에 놓아 주세요. (' + so.placed + ' / ' + total + ')';
    const wr = sortWrong(slot); so.markBad(wr.map((c) => c.id));
    if (wr.length) return '빨간 카드가 아직 달라요. ' + defs.find((q) => q.id === wr[0].id).why;
    return true;
  }
  function prodDraw(dt) {
    const so = S.pr.so, g = sortGeo('prod'); so.update(dt); so.draw();
    const B = g.B; if (B.h > 40) {
      B.h = Math.min(B.h, 110); panel(B.x, B.y, B.w, B.h, 16, '#fff');
      T(B.x + 14, B.y + 26, '피루브산(3탄소) 하나가 NADH 의 전자를 받으면', 14.5, '#1f2d44', 'left', 800);
      T(B.x + 14, B.y + 52, '알코올 발효:  3탄소 → CO₂(1탄소) + 2탄소 아세트알데하이드 → 에탄올', PHONE ? 12.5 : 14, '#b91c1c', 'left', 800);
      T(B.x + 14, B.y + 76, '젖산 발효:  3탄소 → 젖산(3탄소),  CO₂ 는 생기지 않아요', PHONE ? 12.5 : 14, '#7e22ce', 'left', 800);
    }
  }

  /* =========================================================
     ③ 호흡과 비교: 비교표 · 공통점 · 포도당 수 · 효모와 산소
     ========================================================= */
  const TB = [
    { id: 'where', row: '일어나는 곳', a: '해당 과정은 세포질, 나머지는 미토콘드리아', b: '세포질에서만 진행', why: '발효는 세포질의 해당 과정과 그 뒤의 NAD⁺ 재생 반응만이라 미토콘드리아가 필요 없어요.' },
    { id: 'acc', row: '최종 전자 수용체', a: '산소 (O₂)', b: '유기물 (피루브산 또는 그 변환 물질)', why: '산소호흡의 전자는 O₂ 로, 발효의 전자는 유기물로 가요.' },
    { id: 'brk', row: '포도당 분해 정도', a: 'CO₂ 와 H₂O 까지 완전 분해', b: '부분 분해 (에탄올 · 젖산이 남음)', why: '발효 산물에는 에너지가 아직 많이 남아 있어요.' },
    { id: 'prod', row: '산물', a: 'CO₂ 와 H₂O', b: '에탄올 + CO₂ 또는 젖산', why: '산소호흡의 최종 산물은 CO₂ 와 H₂O 이고, 발효는 에탄올(+CO₂) 또는 젖산이에요.' },
    { id: 'atp', row: 'ATP (포도당 1분자)', a: '약 30~32', b: '순 2', why: '산소호흡은 산화적 인산화까지 거쳐 약 30~32, 발효는 기질 수준 인산화로 순 2예요.' },
    { id: 'eff', row: '에너지 효율', a: '약 32 %', b: '약 2 %', why: 'ATP 30개 기준 30 × 30.5 kJ / 2870 kJ ≈ 32 %, 발효는 2 × 30.5 / 2870 ≈ 2 %예요.' },
    { id: 'o2', row: '산소', a: '필요해요', b: '필요 없어요', why: '발효는 산소 없이 일어나요.' },
  ];
  const TB_SW0 = [true, false, true, true, false, true, false];   // 처음에 a·b 가 바뀌어 있는 줄
  S.cm = { view: 'tbl', rows: TB.map((r, i) => ({ sw: TB_SW0[i], pos: TB_SW0[i] ? 1 : 0 })), bad: {}, tried: false, ps: false, bar: { r: new Num(0), f: new Num(0) }, pbar: new Num(100), gr: 0, gf: 0 };
  function cmG() {
    if (PHONE) return { T: { x: 10, y: 10, w: 460, h: 520 }, lw: 84, hh: 34, rh: 72, fs: 12.5 };
    return { T: { x: 14, y: 14, w: 772, h: 410 }, lw: 170, hh: 40, rh: 58, fs: 14.5 };
  }
  function cmReset() { S.cm.rows.forEach((r, i) => { r.sw = TB_SW0[i]; r.pos = TB_SW0[i] ? 1 : 0; }); S.cm.bad = {}; S.cm.tried = false; updateCtl(); }
  const cmWrong = () => TB.map((_, i) => i).filter((i) => S.cm.rows[i].sw);
  function cmTbl(dt) {
    const g = cmG(), Tt = g.T, cm = S.cm, cw = (Tt.w - g.lw - 20) / 2;
    panel(Tt.x, Tt.y, Tt.w, g.hh + g.rh * TB.length + 18, 16, '#fff');
    const x0 = Tt.x + 10, xa = x0 + g.lw, xb = xa + cw + 0, y0 = Tt.y + 8;
    D.roundRect(xa + 3, y0, cw - 6, g.hh - 4, 10); ctx.fillStyle = '#16a34a'; ctx.fill(); T(xa + cw / 2, y0 + g.hh * 0.62, '🌬 산소호흡', g.fs + 1.5, '#fff', 'center', 800);
    D.roundRect(xb + 3, y0, cw - 6, g.hh - 4, 10); ctx.fillStyle = '#ea580c'; ctx.fill(); T(xb + cw / 2, y0 + g.hh * 0.62, '🍞 발효', g.fs + 1.5, '#fff', 'center', 800);
    TB.forEach((r, i) => {
      const row = cm.rows[i], y = y0 + g.hh + i * g.rh, bad = cm.bad[i], ok = cm.tried && !bad && !row.sw && cm.bad.all;
      row.pos = RM ? (row.sw ? 1 : 0) : approach(row.pos, row.sw ? 1 : 0, dt, 9);
      if (i % 2 === 0) { D.roundRect(x0, y - 2, Tt.w - 20, g.rh - 2, 8); ctx.fillStyle = '#f6f8fb'; ctx.fill(); }
      if (PHONE) { const rl = wrap(r.row, g.lw - 12, 12.5, 800).slice(0, 3); rl.forEach((l, j) => T(x0 + 6, y + g.rh / 2 + 5 - (rl.length - 1) * 8 + j * 16, l, 12.5, '#334155', 'left', 800)); } else TF(x0 + 8, y + g.rh / 2 + 5, r.row, g.lw - 14, g.fs, 11.5, '#334155', 'left', 800);
      // 두 칸 (a: 산소호흡의 것, b: 발효의 것). pos 0 → a 가 왼쪽
      [['a', 0], ['b', 1]].forEach(([k, base]) => {
        const p = base === 0 ? row.pos : 1 - row.pos, cx = lerp(xa, xb, p) + 4, w = cw - 8;
        const wrongHere = bad;
        D.shadow(() => { D.roundRect(cx, y, w, g.rh - 6, 10); ctx.fillStyle = wrongHere ? '#fdeceb' : ok ? '#e8f8ee' : '#fff'; ctx.fill(); }, { blur: 4, y: 1 });
        D.roundRect(cx, y, w, g.rh - 6, 10); ctx.strokeStyle = wrongHere ? '#e2464b' : ok ? '#16a34a' : '#cbd5e1'; ctx.lineWidth = wrongHere || ok ? 2.5 : 1.5; ctx.stroke();
        const ls = wrap(r[k], w - 14, g.fs - 0.5, 800).slice(0, 3), lh = g.fs + 1.5, top = y + (g.rh - 6) / 2 - (ls.length - 1) * lh / 2 + 5;
        ls.forEach((l, j) => T(cx + w / 2, top + j * lh, l, g.fs - 0.5, '#1f2d44', 'center', 800));
      });
    });
    const ny = Tt.y + g.hh + g.rh * TB.length + 40;
    T(Tt.x + 14, ny, '줄을 눌러 두 칸을 서로 바꿔요. 틀린 줄을 모두 찾아 바로잡아요.', PHONE ? 12.5 : 14, '#475569', 'left', 700);
  }
  const VNC = [
    { id: 'v1', label: '해당 과정을 거침', sub: '피루브산 2분자', short: '해당 과정', icon: '🍬', col: '#16a34a', ans: 'both', why: '둘 다 포도당을 해당 과정으로 피루브산 2분자로 분해하는 데서 시작해요.' },
    { id: 'v2', label: '포도당에서 출발', sub: '에너지원', short: '포도당에서 출발', icon: '🧁', col: '#64748b', ans: 'both', why: '둘 다 포도당을 에너지원으로 써요.' },
    { id: 'v3', label: '기질 수준 인산화', sub: '해당 과정의 ATP', short: '기질 수준 인산화', icon: '🔋', col: '#ca8a04', ans: 'both', why: '해당 과정에서 기질 수준 인산화로 ATP 를 얻는 것은 공통이에요.' },
    { id: 'v4', label: 'NAD⁺ 재생 필요', sub: '계속 필요해요', short: 'NAD⁺ 재생 필요', icon: '♻️', col: '#2563eb', ans: 'both', why: 'NAD⁺ 가 없으면 해당 과정이 멈추므로 둘 다 NAD⁺ 를 되살려야 해요. (방법만 달라요)' },
    { id: 'v5', label: '효소가 조절', sub: '일련의 반응', short: '효소가 조절', icon: '🧬', col: '#8b5cf6', ans: 'both', why: '모든 단계는 효소가 조절하는 일련의 화학 반응이에요.' },
    { id: 'v6', label: '최종 수용체 O₂', sub: '전자를 받는 곳', short: '최종 수용체 O₂', icon: '💨', col: '#ef4444', ans: 'resp', why: '전자의 최종 수용체가 O₂ 인 것은 산소호흡이에요.' },
    { id: 'v7', label: '미토콘드리아 필요', sub: '진핵세포', short: '미토콘드리아 필요', icon: '⚙️', col: '#a8561f', ans: 'resp', why: '피루브산 산화, TCA 회로, 전자 전달계는 미토콘드리아에서 일어나요.' },
    { id: 'v8', label: '산화적 인산화', sub: 'ATP 대량 합성', short: '산화적 인산화', icon: '⚡', col: '#e11d74', ans: 'resp', why: '화학 삼투로 ATP 를 대량 합성하는 것은 산소호흡이에요.' },
    { id: 'v9', label: '최종 수용체 유기물', sub: '전자를 받는 곳', short: '수용체가 유기물', icon: '🧪', col: '#f59e0b', ans: 'ferm', why: '발효에서는 피루브산(또는 그 변환 물질)이 NADH 의 전자를 받아요.' },
    { id: 'v10', label: '부분 분해', sub: '순 ATP 2', short: '부분 분해 · 순 ATP 2', icon: '🍞', col: '#d97706', ans: 'ferm', why: '발효는 포도당을 부분만 분해하고 순 ATP 2만 얻어요.' },
  ];
  function vennDraw(dt) {
    const so = S.vn.so, g = sortGeo('venn'); so.update(dt); so.draw();
    const B = g.B; if (B.h > 40) { panel(B.x, B.y, B.w, B.h, 16, '#fff'); T(B.x + 14, B.y + 28, '두 과정의 공통점은 가운데 상자에, 차이점은 양쪽 상자에 놓아요.', PHONE ? 12.5 : 14.5, '#1f2d44', 'left', 800); T(B.x + 14, B.y + 54, '가운데 상자의 카드가 5장이면 공통점을 다 찾은 거예요.', PHONE ? 12.5 : 14, '#64748b', 'left', 700); }
  }
  /* 포도당 수 계산 */
  function calcDraw(dt) {
    const cm = S.cm, P = PHONE ? { x: 10, y: 10, w: 460, h: 620 } : { x: 14, y: 14, w: 772, h: 532 };
    cm.bar.r.set(32); cm.bar.f.set(2); cm.bar.r.update(dt, 3); cm.bar.f.update(dt, 3);
    panel(P.x, P.y, P.w, 246 + (PHONE ? 40 : 0), 16, '#fff');
    T(P.x + 16, P.y + 28, 'ATP 30개가 필요할 때, 포도당은 몇 분자가 필요할까요?', PHONE ? 13.5 : 16, '#1f2d44', 'left', 800);
    const chips = (y, n, per, col, label, maxRows) => {
      T(P.x + 16, y, label, PHONE ? 13 : 14.5, col, 'left', 800);
      const cols = PHONE ? 8 : 15, cwid = (P.w - 32) / cols, k = clamp(Math.round(n), 0, 30), cap = cols * maxRows, shown = Math.min(k, cap);
      if (k > cap) T(P.x + 16 + (cap - 1) % cols * cwid + cwid / 2, y + 36 + Math.floor((cap - 1) / cols) * 48 + 4, '+' + (k - cap + 1), 14, col, 'center', 800);
      for (let i = 0; i < Math.max(shown - (k > cap ? 1 : 0), 0); i++) {
        const cx = P.x + 16 + (i % cols) * cwid + cwid / 2, cy = y + 36 + Math.floor(i / cols) * 48;
        const a = RM ? 1 : clamp(cm.t - i * 0.03, 0, 1);
        ctx.save(); ctx.globalAlpha = a; mol(cx, cy - 4, 6, PHONE ? 3.4 : 4.3, COL.glu); T(cx, cy + 22, '×' + per, 11.5, '#92400e', 'center', 800); ctx.restore();
      }
      if (k === 0) T(P.x + 16, y + 40, '아래 입력칸에 포도당 분자 수를 넣어 보세요', 13, '#94a3b8', 'left', 700);
      return k;
    };
    cm.t = (cm.t || 0) + dt;
    const kr = chips(P.y + 62, cm.gr, 30, '#15803d', '🌬 산소호흡 (포도당 1분자 = 약 30 ATP)', 1);
    const kf = chips(P.y + (PHONE ? 168 : 148), cm.gf, 2, '#c2410c', '🍞 발효 (포도당 1분자 = 순 2 ATP)', PHONE ? 2 : 1);
    T(P.x + P.w - 16, P.y + 62, 'ATP ' + (kr * 30), PHONE ? 14 : 16, kr * 30 === 30 ? '#15803d' : '#475569', 'right', 800);
    T(P.x + P.w - 16, P.y + (PHONE ? 168 : 148), 'ATP ' + (kf * 2), PHONE ? 14 : 16, kf * 2 === 30 ? '#15803d' : '#475569', 'right', 800);
    // 효율
    const E0 = P.y + (PHONE ? 300 : 260);
    panel(P.x, E0, P.w, PHONE ? 320 : 264, 16, '#fff');
    T(P.x + 16, E0 + 28, '에너지 효율 (포도당 한 분자의 에너지 중 ATP 에 담긴 몫)', PHONE ? 13 : 15.5, '#1f2d44', 'left', 800);
    const bx = P.x + 120, bw = P.w - 120 - 70;
    [['산소호흡', cm.bar.r.v, '#16a34a', 0], ['발효', cm.bar.f.v, '#ea580c', 1]].forEach(([n, v, col, k]) => {
      const y = E0 + 62 + k * 52;
      T(P.x + 16, y + 6, n, 15, '#334155', 'left', 800); D.roundRect(bx, y - 12, bw, 26, 13); ctx.fillStyle = '#eef2f7'; ctx.fill();
      if (v > 0.3) { D.roundRect(bx, y - 12, Math.max(8, bw * v / 40), 26, 13); ctx.fillStyle = col; ctx.fill(); }
      T(bx + bw + 8, y + 7, '약 ' + fi(v) + ' %', 15.5, '#1f2d44', 'left', 800);
    });
    [0, 10, 20, 30, 40].forEach((v) => { const xx = bx + bw * v / 40; ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(xx, E0 + 134); ctx.lineTo(xx, E0 + 140); ctx.stroke(); T(xx, E0 + 156, v + (v === 40 ? ' %' : ''), 12, '#64748b', 'center', 700); });
    T(P.x + 16, E0 + 182, '효율 = (ATP 수 × 30.5 kJ) / 2870 kJ  (포도당 1 mol 이 내는 에너지 2870 kJ)', PHONE ? 11.5 : 13.5, '#475569', 'left', 700);
    T(P.x + 16, E0 + 206, '산소호흡: 30 × 30.5 / 2870 ≈ 0.32     발효: 2 × 30.5 / 2870 ≈ 0.02', PHONE ? 11.5 : 13.5, '#475569', 'left', 700);
    T(P.x + 16, E0 + 238, '발효 산물(에탄올 · 젖산)에는 에너지가 아직 많이 남아 있어요.', PHONE ? 12 : 14, '#9a3412', 'left', 800);
  }
  /* 효모와 산소 (파스퇴르 현상) */
  function pasDraw(dt, t) {
    const cm = S.cm, P = PHONE ? { x: 10, y: 10, w: 460, h: 620 } : { x: 14, y: 14, w: 772, h: 532 };
    cm.pbar.set(cm.ps ? 7 : 100); cm.pbar.update(dt, 4);
    panel(P.x, P.y, P.w, PHONE ? 250 : 220, 16, cm.ps ? '#f0faf3' : '#fff7ec');
    T(P.x + 16, P.y + 28, '🍞 효모를 같은 ATP 요구량에서 키웠어요', PHONE ? 13.5 : 16, '#1f2d44', 'left', 800);
    const cx = P.x + (PHONE ? 90 : 120), cy = P.y + (PHONE ? 130 : 128);
    D.shadow(() => { ctx.beginPath(); ctx.ellipse(cx, cy, 52, 44, 0, 0, TAU); ctx.fillStyle = '#fde68a'; ctx.fill(); }, { blur: 6, y: 2 }); ctx.strokeStyle = '#d9a441'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(cx, cy, 52, 44, 0, 0, TAU); ctx.stroke();
    T(cx, cy + 5, '효모', 15, '#92400e', 'center', 800);
    if (cm.ps) for (let i = 0; i < 6; i++) { const f = ((t * 0.4 + i / 6) % 1), ox = cx - 120 + f * 72, oy = cy - 30 + (i % 3) * 30; ctx.save(); ctx.globalAlpha = Math.sin(f * Math.PI); D.sphere(ox, oy, 5.5, '#ef4444', { gloss: false }); D.sphere(ox + 9, oy, 5.5, '#ef4444', { gloss: false }); ctx.restore(); }
    T(cx, cy + 74, cm.ps ? '산소 있음 → 산소호흡' : '산소 없음 → 알코올 발효', PHONE ? 13 : 14.5, cm.ps ? '#15803d' : '#c2410c', 'center', 800);
    const bx = P.x + (PHONE ? 190 : 270), bw = P.w - (PHONE ? 190 : 270) - 80, by = P.y + 84;
    T(bx, by - 8, '포도당 소비 속도 (상대값)', PHONE ? 13 : 14.5, '#334155', 'left', 800);
    [['산소 없음', 100, '#ea580c'], ['산소 있음', 7, '#16a34a']].forEach(([n, v, col], k) => {
      const y = by + 24 + k * 46, on = (k === 1) === cm.ps;
      T(bx, y - 6, n, 13, on ? '#1f2d44' : '#94a3b8', 'left', 800); D.roundRect(bx, y, bw, 22, 11); ctx.fillStyle = '#eef2f7'; ctx.fill();
      const cur = on ? cm.pbar.v : v; const w = bw * (on ? cur : v) / 100; if (w > 0.5) { ctx.save(); ctx.globalAlpha = on ? 1 : 0.35; D.roundRect(bx, y, Math.max(8, w), 22, 11); ctx.fillStyle = col; ctx.fill(); ctx.restore(); }
      T(bx + bw + 8, y + 17, k === 0 ? '100' : '약 7', 15.5, on ? '#1f2d44' : '#94a3b8', 'left', 800);
    });
    panel(P.x, P.y + (PHONE ? 266 : 236), P.w, PHONE ? 200 : 168, 16, '#fff');
    const ty = P.y + (PHONE ? 292 : 264), fs = PHONE ? 12.5 : 14.5;
    T(P.x + 16, ty, '왜 산소가 있으면 포도당을 덜 쓸까요?', fs + 1, '#1f2d44', 'left', 800);
    T(P.x + 16, ty + 28, 'ATP 30개를 얻으려면 포도당이 발효 15분자, 산소호흡 약 1분자예요.', fs, '#475569', 'left', 700);
    T(P.x + 16, ty + 52, '같은 ATP 를 얻을 때 산소호흡의 포도당 소비는 발효의 2/30 예요.', fs, '#475569', 'left', 700);
    T(P.x + 16, ty + 80, '100 × 2/30 = 6.7, 약 7', fs + 1, '#15803d', 'left', 800);
    T(P.x + 16, ty + 108, '산소가 있을 때 포도당 소비가 줄어드는 현상(파스퇴르 효과).', fs, '#475569', 'left', 700);
    T(P.x + 16, ty + 132, '통성 혐기성 효모는 산소가 있으면 호흡을 해요.', fs, '#475569', 'left', 700);
  }
  const cmPT = {};
  const _vnPT = sortPT(S.vn);
  cmPT.down = function (p) { const v = S.cm.view; if (v === 'ven') return _vnPT.down(p); if (v === 'tbl') { const g = cmG(), Tt = g.T, yy = p.y - (Tt.y + 8 + g.hh); if (p.x >= Tt.x && p.x <= Tt.x + Tt.w && yy >= 0 && yy < g.rh * TB.length) { const i = Math.floor(yy / g.rh); const r = S.cm.rows[i]; r.sw = !r.sw; S.cm.bad = {}; S.cm.tried = false; Sound.click(); updateCtl(); } } return false; };
  cmPT.move = function (p) { if (S.cm.view === 'ven') _vnPT.move(p); };
  cmPT.up = function (p) { if (S.cm.view === 'ven') _vnPT.up(p); };
  cmPT.hover = function (p) { const v = S.cm.view; if (v === 'ven') return _vnPT.hover(p); if (v === 'tbl') { const g = cmG(), Tt = g.T, yy = p.y - (Tt.y + 8 + g.hh); return yy >= 0 && yy < g.rh * TB.length ? 'pointer' : 'default'; } return 'default'; };
  function cmDraw(dt, t) {
    const v = S.cm.view; if (v === 'tbl') cmTbl(dt); else if (v === 'ven') vennDraw(dt); else if (v === 'calc') calcDraw(dt); else pasDraw(dt, t);
  }
  function cmSetView(v) { S.cm.view = v; S.cm.t = 0; S.fade = 1; Sound.click(); updateCtl(); }

  /* =========================================================
     ④ 사례 판별
     ========================================================= */
  const CSC = [
    { id: 'k1', label: '빵 반죽 부풀기', sub: '효모 + 포도당', short: '빵 반죽 부풀기', icon: '🍞', col: '#d97706', ans: 'alc', why: '효모가 알코올 발효로 CO₂ 를 만들어 반죽이 부풀어요. (에탄올은 굽는 동안 날아가요)' },
    { id: 'k2', label: '요구르트', short: '요구르트', icon: '🥛', col: '#a855f7', ans: 'lac', why: '젖산균이 우유의 당을 젖산으로 발효해요. 젖산 때문에 신맛이 나고 우유 단백질이 굳어요.' },
    { id: 'k3', label: '김치 익힘', sub: '신맛이 나요', short: '김치 익힘', icon: '🥬', col: '#dc2626', ans: 'lac', why: '김치가 익을 때는 젖산균이 젖산 발효를 해서 신맛이 나요.' },
    { id: 'k4', label: '막걸리 · 와인', short: '막걸리 · 와인', icon: '🍶', col: '#0ea5e9', ans: 'alc', why: '효모가 당을 에탄올과 CO₂ 로 바꾸는 알코올 발효예요.' },
    { id: 'k5', label: '산소 모자란 근육', sub: '격렬한 달리기 중', short: '산소 모자란 근육', icon: '🏃', col: '#e11d74', ans: 'lac', why: '산소 공급이 부족한 근육 세포는 젖산 발효를 병행해 ATP 를 얻어요. (운동 며칠 뒤의 근육통은 다른 원인이에요)' },
    { id: 'k6', label: '바이오 에탄올', sub: '연료 만들기', short: '바이오 에탄올', icon: '⛽', col: '#475569', ans: 'alc', why: '효모가 당을 알코올 발효해 에탄올을 만들어요.' },
    { id: 'k7', label: '적혈구의 에너지', sub: '미토콘드리아 없음', short: '적혈구의 에너지', icon: '🩸', col: '#b91c1c', ans: 'lac', why: '성숙한 적혈구에는 미토콘드리아가 없어서 해당 과정과 젖산 발효로만 ATP 를 얻어요.' },
    { id: 'k8', label: '치즈', short: '치즈', icon: '🧀', col: '#ca8a04', ans: 'lac', why: '치즈는 젖산균이 우유를 젖산 발효시키는 과정을 거쳐 만들어요.' },
    { id: 'k9', label: '산소 충분한 효모', sub: '에너지를 얻는 방법', short: '산소 충분한 효모', icon: '🌬', col: '#16a34a', ans: 'resp', why: '산소가 있으면 효모는 산소호흡으로 포도당을 CO₂ 와 H₂O 까지 완전 분해해요.' },
    { id: 'k10', label: '천천히 걷는 근육', sub: '산소가 충분할 때', short: '천천히 걷는 근육', icon: '🚶', col: '#0d9488', ans: 'resp', why: '산소가 충분하면 근육 세포는 주로 산소호흡으로 ATP 를 얻어요.' },
  ];
  function caseDraw(dt) {
    const so = S.cs.so, g = sortGeo('case'); so.update(dt); so.draw();
    const B = g.B; if (B.h > 40) {
      panel(B.x, B.y, B.w, B.h, 16, '#fffbe6');
      const fs = PHONE ? 12 : 14;
      T(B.x + 14, B.y + 26, '⚠ 일상의 "발효"와 이 차시의 발효는 달라요', fs + 1, '#92400e', 'left', 800);
      const ls = wrap('낫토 · 된장 · 간장은 흔히 발효 식품이라 부르지만, 미생물이 단백질을 분해하는 과정이 들어 있어서 "산소 없이 NAD⁺ 를 되살리며 ATP 를 얻는" 이 차시의 발효와는 구별해요.', B.w - 28, fs, 700);
      ls.forEach((l, k) => T(B.x + 14, B.y + 50 + k * (fs + 5), l, fs, '#475569', 'left', 700));
    }
  }

  /* =========================================================
     화면 전환 · 조작 연결
     ========================================================= */
  const PTS = { o2: null, ferm: null, prod: sortPT(S.pr), cmp: cmPT, case: sortPT(S.cs) };
  function setMode(m) { if (S.mode !== m) S.fade = 1; S.mode = m; PT = PTS[m] || null; hideHint(); updateCtl(); }
  const ctlNodes = $$('#ctrlCard .control');
  function updateCtl() {
    const fr = game ? game.free : false, lvNow = game ? game.level : 0, o = S.o2, f = S.fm, cm = S.cm;
    ctlNodes.forEach((n) => { n.hidden = (n.dataset.modes || '').split(' ').indexOf(S.mode) < 0; });
    $$('#ctrlCard [data-sub]').forEach((n) => { n.hidden = n.dataset.sub !== cm.view; });
    modeButtons(S.mode, lvNow, fr);
    chipSet($('#o2Sw'), o.on ? 'on' : 'off');
    $('#o2Note').innerHTML = 'NAD⁺ <b>' + o2Plus() + '개</b> · NADH <b>' + o2Minus() + '개</b> · 해당 과정 속도 <b>' + fi(o.rate.v) + ' %</b>' + (o2Stopped() ? '<br><b>→ 해당 과정이 멈췄어요.</b>' : '');
    chipSet($('#fmOrg'), f.org);
    const running = !!(f.run && !f.run.fin);
    $('#fmRun').disabled = running; $('#fmRun').textContent = running ? '진행 중…' : '▶ 포도당 1분자 넣기';
    $('#fmNote').innerHTML = '실행한 발효: ' + (f.done.alc ? '✅' : '⬜') + ' 알코올 발효 · ' + (f.done.lac ? '✅' : '⬜') + ' 젖산 발효';
    const n = (slot, z) => slot.so.cards.filter((q) => q.zone === z).length;
    $('#prNote').innerHTML = '놓은 카드 <b>' + S.pr.so.placed + ' / 6</b>';
    $('#vnNote').innerHTML = '놓은 카드 <b>' + S.vn.so.placed + ' / 10</b> · 공통 상자 <b>' + n(S.vn, 'both') + '장</b>';
    $('#csNote').innerHTML = '놓은 카드 <b>' + S.cs.so.placed + ' / 10</b> · 알코올 ' + n(S.cs, 'alc') + ' · 젖산 ' + n(S.cs, 'lac') + ' · 호흡 ' + n(S.cs, 'resp');
    chipSet($('#cmView'), cm.view); chipSet($('#psO2'), cm.ps ? 'on' : 'off');
    $('#inGr').classList.toggle('ok', numIn('inGr') === 1); $('#inGf').classList.toggle('ok', numIn('inGf') === 15);
    $('#tbNote').innerHTML = '틀린 줄 <b>' + (cm.tried ? Object.keys(cm.bad).filter((k) => k !== 'all').length : '?') + '</b>' + (cm.tried ? '' : ' (확인하면 알려 줘요)');
  }
  bindModeSeg(setMode);
  $$('#o2Sw button').forEach((b) => b.addEventListener('click', () => o2SetOn(b.dataset.v === 'on')));
  $('#o2Reset').addEventListener('click', () => { Sound.click(); S.o2.on = true; o2Reset(); });
  $$('#fmOrg button').forEach((b) => b.addEventListener('click', () => fmSetOrg(b.dataset.v)));
  $('#fmRun').addEventListener('click', fmStart);
  $('#fmReset').addEventListener('click', () => { Sound.click(); fmReset(); });
  $('#prReset').addEventListener('click', () => { Sound.click(); S.pr.pick = null; S.pr.so.reset(); });
  $('#vnReset').addEventListener('click', () => { Sound.click(); S.vn.pick = null; S.vn.so.reset(); });
  $('#csReset').addEventListener('click', () => { Sound.click(); S.cs.pick = null; S.cs.so.reset(); });
  $$('#cmView button').forEach((b) => b.addEventListener('click', () => cmSetView(b.dataset.v)));
  $$('#psO2 button').forEach((b) => b.addEventListener('click', () => { S.cm.ps = b.dataset.v === 'on'; Sound.click(); updateCtl(); }));
  $('#tbReset').addEventListener('click', () => { Sound.click(); cmReset(); });
  ['inGr', 'inGf'].forEach((id) => $('#' + id).addEventListener('input', () => { S.cm.gr = isFinite(numIn('inGr')) ? clamp(numIn('inGr'), 0, 30) : 0; S.cm.gf = isFinite(numIn('inGf')) ? clamp(numIn('inGf'), 0, 30) : 0; S.cm.t = 0; updateCtl(); }));

  /* =========================================================
     미션
     ========================================================= */
  const levels = [
    {
      title: '산소가 없을 때', short: '산소 없음', icon: '🚫', phase: '모형',
      intro: '<p class="si-q">❓ 탐구 질문: 산소가 없어도 세포는 어떻게 ATP를 계속 만들까? 대신 무엇을 포기할까?</p><p>🔗 <b>앞 차시에서</b> 산소가 없으면 전자 전달이 멈춰 <b>산화적 인산화</b>가 중단되고, <b>기질 수준 인산화</b>(해당 과정)만 ATP를 만들 수 있다고 배웠어요. 통합과학과 생명과학에서 배운 세포호흡의 첫 단계예요.</p><p>그런데 해당 과정에는 조건이 있어요. 포도당 1분자가 <b>NAD⁺ 2개를 NADH 2개로</b> 바꾸기 때문에, NADH를 다시 NAD⁺로 되돌리지 못하면 NAD⁺가 바닥나요. 산소를 켜고 끄며 NAD⁺ 풀이 어떻게 변하는지 관찰해요.</p>',
      features: ['o2'],
      setup() { setMode('o2'); S.o2.on = true; o2Reset(); },
      recap: '해당 과정에는 NAD⁺가 필요해요. 산소가 있으면 NADH의 전자가 전자 전달계를 거쳐 O₂로 가며 NAD⁺가 되살아나지만, 산소가 없으면 전자를 받을 곳이 없어 NAD⁺가 바닥나고 해당 과정도 멈춰요.',
      summary: '<ul><li>해당 과정(세포질)은 포도당 1분자당 <b>NAD⁺ 2개를 NADH 2개로</b> 바꾸며 순 ATP 2를 만들어요. <b>NAD⁺가 있어야</b> 계속돼요.</li><li>산소가 있으면 NADH가 전자를 전자 전달계에 건네 <b>NAD⁺로 재생</b>돼요(최종 전자 수용체 O₂).</li><li>산소가 없으면 전자를 받을 최종 수용체가 없어 NADH가 쌓이고 <b>NAD⁺가 고갈</b>되어 해당 과정도 멈춰요. → NAD⁺를 되살릴 다른 방법이 필요해요.</li></ul>',
      missions: [
        {
          id: 'stop', title: '산소를 끄고 정지 확인',
          goal: '<b>산소를 없애고</b>, NAD⁺가 <b>0개</b>가 되어 해당 과정이 <b>멈춘 것</b>을 1초 이상 확인하세요.',
          hint: '“산소 없음” 버튼을 누르고 5~8초 기다려요. 해당 과정이 NAD⁺ 2개씩 쓰고 나면, 돌아오는 NAD⁺가 없어 바닥나요.',
          setup() { setMode('o2'); S.o2.on = true; o2Reset(); },
          check: () => !S.o2.on && o2Plus() === 0 && o2Stopped(), hold: 1.0,
          status: () => mark(!S.o2.on) + ' 산소 없음 &nbsp; ' + mark(o2Plus() === 0) + ' NAD⁺ ' + o2Plus() + '개 &nbsp; ' + mark(o2Stopped()) + ' 해당 과정 멈춤',
          explain: '산소가 없으면 NADH가 전자를 건넬 곳(O₂)이 없어 NAD⁺로 돌아가지 못해요. 해당 과정은 NAD⁺를 계속 써야 하므로, NAD⁺가 0개가 되면 ATP 생산도 <b>0</b>이 돼요.',
        },
        {
          type: 'quiz', title: '해당 과정이 멈추는 까닭',
          goal: '산소가 없을 때 <b>산소를 직접 쓰지 않는</b> 해당 과정까지 멈추는 까닭은?',
          setup() { setMode('o2'); },
          choices: ['포도당이 세포 안으로 들어오지 못하기 때문이다', 'NADH가 전자를 넘길 곳(최종 전자 수용체)이 없어 NAD⁺로 돌아가지 못하고, NAD⁺가 바닥나기 때문이다', '해당 과정의 효소가 산소가 없으면 변성되기 때문이다', 'ATP가 너무 많이 쌓여 효소가 억제되기 때문이다'],
          answer: 1,
          feedback: ['포도당은 산소와 관계없이 들어와요.', '', '효소는 산소가 없다고 변성되지 않아요.', '산소가 없으면 ATP는 오히려 적어져요.'],
          explain: '해당 과정은 O₂를 쓰지 않지만 <b>NAD⁺</b>가 꼭 필요해요. 산소가 없으면 전자 전달계가 멈춰 NADH → NAD⁺ 재생이 막히고, NAD⁺가 고갈되어 해당 과정도 멈춰요.',
        },
      ],
    },
    {
      title: '두 가지 발효', short: '두 가지 발효', icon: '🧫', phase: '모형',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 산소가 없으면 NAD⁺가 바닥나 해당 과정이 멈췄어요. 이 문제를 해결하는 방법이 <b>발효</b>예요.</div><p>해당 과정에서 만든 <b>피루브산</b>(3탄소)이 NADH의 전자를 직접 받아 <b>NAD⁺를 되살려요</b>. 발효는 두 가지만 다뤄요.</p><p><b>알코올 발효</b>(효모): 3탄소 피루브산 → CO₂ + 2탄소 아세트알데하이드 → <b>2탄소 에탄올</b>. <b>젖산 발효</b>(젖산균 · 근육 세포): 3탄소 피루브산 → <b>3탄소 젖산</b>. 구조식 대신 <b>탄소 개수 구슬</b>로 따라가요.</p>',
      features: ['ferm'],
      setup() { setMode('ferm'); fmReset(); S.fm.done = { alc: 0, lac: 0 }; updateCtl(); },
      recap: '발효는 피루브산(또는 그 변환 물질)이 NADH의 전자를 받아 NAD⁺를 되살려 해당 과정을 이어 가요. 알코올 발효는 에탄올 2 + CO₂ 2, 젖산 발효는 젖산 2를 만들고, 둘 다 순 ATP 2예요.',
      summary: '<ul><li><b>알코올 발효</b>(효모): 3탄소 피루브산 → CO₂ + 2탄소 아세트알데하이드 → (NADH의 전자를 받아) 2탄소 에탄올. 포도당 1분자당 에탄올 2, CO₂ 2, ATP 2.</li><li><b>젖산 발효</b>(젖산균, 근육 세포): 3탄소 피루브산 + NADH → 3탄소 젖산 + NAD⁺. 포도당 1분자당 젖산 2, ATP 2, <b>CO₂ 없음</b>.</li><li>두 발효 모두 NADH → NAD⁺ 재생으로 해당 과정이 이어지고, ATP는 <b>해당 과정의 기질 수준 인산화</b>로만(순 2) 얻어요.</li></ul>',
      missions: [
        {
          id: 'both', title: '두 발효 실행',
          goal: '효모(알코올 발효)와 젖산균(젖산 발효)에서 각각 <b>포도당 1분자</b>를 넣어 발효를 <b>끝까지</b> 실행하세요.',
          hint: '세포를 고르고 “▶ 포도당 1분자 넣기”를 눌러 약 7초 기다려요. 두 세포 모두 해 보세요.',
          setup() { setMode('ferm'); },
          check: () => fmDone(), hold: 0.4,
          status: () => mark(S.fm.done.alc >= 1) + ' 알코올 발효 &nbsp; ' + mark(S.fm.done.lac >= 1) + ' 젖산 발효',
          explain: '<b>알코올 발효</b>: 피루브산이 CO₂를 내보내 2탄소 아세트알데하이드가 되고, NADH의 전자를 받아 에탄올이 돼요. <b>젖산 발효</b>: 피루브산이 NADH의 전자를 받아 젖산이 돼요. 어느 쪽이든 NAD⁺가 되살아나 해당 과정이 이어져요.',
        },
        {
          id: 'prod', title: '산물 카드 맞추기', manual: true,
          goal: '산물 카드 6장을 <b>알코올 발효 · 두 발효 모두 · 젖산 발효</b> 상자로 나누세요.',
          hint: 'CO₂ 와 2탄소 물질은 알코올 발효, 3탄소 젖산은 젖산 발효예요. 순 ATP 2 와 NAD⁺ 재생은 두 발효에 모두 해당해요.',
          setup() { setMode('prod'); S.pr.pick = null; S.pr.so.reset(); },
          check: () => sortCheck(S.pr, 6, PRC),
          explain: '<b>알코올 발효만</b>: 에탄올 · CO₂ · 아세트알데하이드. <b>젖산 발효만</b>: 젖산. <b>둘 다</b>: 해당 과정에서 얻는 순 ATP 2 와 NADH → NAD⁺ 재생이에요.',
        },
        {
          type: 'quiz', title: '젖산 발효에 CO₂가 없는 까닭',
          goal: '젖산 발효에서 <b>CO₂가 생기지 않는</b> 까닭은?',
          setup() { setMode('ferm'); S.fm.org = 'lac'; fmReset(); },
          choices: ['피루브산이 NADH의 수소(전자)를 받아 환원될 뿐, 탄소 3개가 그대로 젖산에 남기 때문이다', '젖산균은 이산화 탄소를 흡수하기 때문이다', '산소가 없으면 CO₂가 물에 모두 녹기 때문이다', '젖산 발효는 해당 과정을 거치지 않기 때문이다'],
          answer: 0,
          feedback: ['', '젖산균이 CO₂를 흡수해서가 아니에요.', '녹는 것이 아니라 처음부터 만들어지지 않아요.', '젖산 발효도 해당 과정을 거쳐 피루브산을 만들어요.'],
          explain: '젖산 발효는 3탄소 피루브산이 전자(수소)를 받는 <b>환원</b>만 일어나서 탄소 3개가 그대로 젖산에 남아요. 알코올 발효에서는 피루브산에서 1탄소가 CO₂로 떨어져 나가요.',
        },
      ],
    },
    {
      title: '호흡과 비교', short: '호흡과 비교', icon: '📊', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 두 발효가 모두 NAD⁺를 되살리고 순 ATP 2를 얻는 방법임을 확인했어요. 이제 <b>산소호흡과 발효</b>의 공통점과 차이점을 정리해요.</div><p>비교표를 완성하고, 가운데 상자에 <b>공통점</b>을 모으고, 같은 ATP 30개를 얻으려면 포도당이 얼마나 필요한지 계산해요. 효율은 ATP 한 분자가 약 30.5 kJ, 포도당 1 mol이 2870 kJ이라는 값으로 어림해요.</p>',
      features: ['cmp'],
      setup() { setMode('cmp'); S.cm.view = 'tbl'; updateCtl(); },
      recap: '산소호흡과 발효는 모두 해당 과정, 기질 수준 인산화, 효소 조절, NAD⁺ 재생을 거쳐요. 차이는 최종 전자 수용체(O₂ 대 유기물), 분해 정도, ATP(약 30~32 대 2), 효율(약 32 % 대 2 %)이에요.',
      summary: '<ul><li><b>공통점</b>: 포도당에서 출발해 <b>해당 과정</b>을 거침, <b>기질 수준 인산화</b>로 ATP 합성, <b>효소</b>가 반응을 조절, <b>NAD⁺ 재생</b>이 계속 필요.</li><li><b>차이점</b>: 산소호흡은 최종 전자 수용체가 O₂, CO₂ · H₂O까지 완전 분해, ATP 약 30~32, 미토콘드리아 필요, 효율 약 32 %. 발효는 최종 전자 수용체가 유기물, 부분 분해(에탄올 · 젖산이 남음), 순 ATP 2, 세포질에서만, 효율 약 2 %.</li><li>같은 ATP 30개를 얻으려면 산소호흡 약 1분자, 발효 30 / 2 = 15분자의 포도당이 필요해요. 효모는 산소가 있으면 포도당 소비가 약 7 / 100으로 줄어요.</li></ul>',
      missions: [
        {
          id: 'table', title: '비교표 완성', manual: true,
          goal: '<b>🌬 산소호흡</b>과 <b>🍞 발효</b>의 비교표 7줄에서 <b>칸의 위치가 바뀐 줄</b>을 눌러 바로잡으세요.',
          hint: '산소호흡은 O₂ 를 최종 수용체로 쓰고 ATP 를 약 30~32 얻어요. 발효는 산소 없이 순 ATP 2, 효율은 약 2 % 예요.',
          setup() { setMode('cmp'); S.cm.view = 'tbl'; cmReset(); },
          check() {
            const w = cmWrong(); const bad = {}; w.forEach((i) => { bad[i] = true; });
            S.cm.tried = true; if (!w.length) bad.all = true;
            if (JSON.stringify(bad) !== JSON.stringify(S.cm.bad)) { S.cm.bad = bad; updateCtl(); }
            if (w.length) return '빨간 줄 ' + w.length + '개가 아직 달라요. “' + TB[w[0]].row + '” 줄: ' + TB[w[0]].why;
            return true;
          },
          explain: '산소호흡: 세포질 + 미토콘드리아, 최종 수용체 O₂, 완전 분해(CO₂ · H₂O), ATP 약 30~32, 효율 약 32 %, 산소 필요. 발효: 세포질에서만, 최종 수용체 유기물, 부분 분해, 순 ATP 2, 효율 약 2 %, 산소 불필요예요.',
        },
        {
          id: 'venn', title: '공통점과 차이점', manual: true,
          goal: '카드 10장을 <b>산소호흡만 · 둘 다(공통) · 발효만</b> 상자로 나누세요.',
          hint: '해당 과정 · 포도당 출발 · 기질 수준 인산화 · NAD⁺ 재생 · 효소 조절은 둘 다예요. O₂ 와 미토콘드리아는 산소호흡 쪽이에요.',
          setup() { setMode('cmp'); S.cm.view = 'ven'; S.vn.pick = null; S.vn.so.reset(); },
          check: () => sortCheck(S.vn, 10, VNC),
          explain: '<b>공통</b>: 해당 과정 · 포도당 · 기질 수준 인산화 · NAD⁺ 재생 · 효소 조절. <b>산소호흡만</b>: 최종 수용체 O₂ · 미토콘드리아 · 산화적 인산화. <b>발효만</b>: 최종 수용체가 유기물 · 부분 분해와 순 ATP 2.',
        },
        {
          id: 'calc', title: '필요한 포도당 계산',
          goal: 'ATP <b>30개</b>를 얻으려면 필요한 포도당은? <b>산소호흡 □분자</b>, <b>발효 □분자</b>를 입력하세요.',
          hint: '산소호흡은 포도당 1분자에서 약 30 ATP, 발효는 순 2 ATP 예요. 발효: 30 / 2 = ?',
          setup() { setMode('cmp'); S.cm.view = 'calc'; $('#inGr').value = ''; $('#inGf').value = ''; S.cm.gr = 0; S.cm.gf = 0; S.cm.t = 0; updateCtl(); },
          check: () => numIn('inGr') === 1 && numIn('inGf') === 15, hold: 0.6,
          status: () => mark(numIn('inGr') === 1) + ' 산소호흡 ' + (isFinite(numIn('inGr')) ? numIn('inGr') : '?') + '분자 &nbsp; ' + mark(numIn('inGf') === 15) + ' 발효 ' + (isFinite(numIn('inGf')) ? numIn('inGf') : '?') + '분자',
          explain: '산소호흡: 30 / 30 = <b>약 1분자</b>, 발효: 30 / 2 = <b>15분자</b>. 같은 ATP를 얻는 데 발효는 포도당이 약 15배 필요해요. 그래서 산소가 있을 때 효모의 포도당 소비 속도는 약 7 / 100으로 줄어요(파스퇴르 효과).',
        },
        {
          type: 'quiz', title: '발효 산물에 남은 에너지',
          goal: '발효 산물(에탄올, 젖산)에 <b>에너지가 아직 많이 남아 있는</b> 까닭은?',
          setup() { setMode('cmp'); S.cm.view = 'calc'; updateCtl(); },
          choices: ['포도당이 CO₂와 H₂O까지 완전히 분해되기 때문이다', '포도당이 부분만 분해되어 탄소 화합물에 에너지가 남기 때문이다', '발효에는 효소가 쓰이지 않기 때문이다', '발효는 열을 전혀 내지 않기 때문이다'],
          answer: 1,
          feedback: ['완전 분해는 산소호흡이에요.', '', '발효도 효소가 조절하는 반응이에요.', '발효에서도 에너지의 일부는 열로 나가요.'],
          explain: '발효는 포도당을 <b>불완전 분해</b>해서 산물에 에너지가 많이 남아 있어요. 그래서 에탄올은 연료로 쓸 수 있고, 효율은 약 2 %에 그쳐요.',
        },
      ],
    },
    {
      title: '사례 판별', short: '사례 판별', icon: '🍞', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 산소호흡과 발효의 공통점 · 차이점을 정리했어요. 이제 생활 속 사례가 어느 쪽인지 가려내요. (사례 조사 계획은 다음 차시에서 세워요.)</div><p>카드 10장을 <b>알코올 발효 · 젖산 발효 · 산소호흡</b>으로 나눠요. 아래 안내도 꼭 읽어 보세요. 일상에서 “발효 식품”이라 부르는 모든 것이 이 차시의 발효는 아니에요.</p>',
      features: ['case'],
      setup() { setMode('case'); },
      recap: '빵 · 막걸리 · 와인 · 바이오 에탄올은 효모의 알코올 발효, 요구르트 · 김치 · 치즈 · 산소가 모자란 근육 · 적혈구는 젖산 발효예요. 낫토 · 된장은 단백질 분해가 들어 있어 이 차시의 발효와 구별해요.',
      summary: '<ul><li><b>알코올 발효</b>(효모): 빵 반죽이 부푸는 것(CO₂), 막걸리 · 와인, 바이오 에탄올.</li><li><b>젖산 발효</b>(젖산균 · 근육): 요구르트, 김치, 치즈, 산소가 모자란 근육, 미토콘드리아가 없는 적혈구.</li><li>산소가 충분하면 효모와 근육 세포도 <b>산소호흡</b>을 해요.</li><li>낫토 · 된장 · 간장은 미생물이 단백질 등을 분해하는 과정이 들어 있어서, 이 차시에서 정의한 발효(산소 없이 NAD⁺를 되살리며 ATP를 얻는 것)와는 구별해요.</li></ul>',
      missions: [
        {
          id: 'cases', title: '사례 10개 분류', manual: true,
          goal: '사례 카드 10장을 <b>알코올 발효 · 젖산 발효 · 산소호흡</b> 상자로 나누어 놓으세요.',
          hint: 'CO₂ 로 부풀거나 술 · 연료를 만들면 알코올 발효, 신맛 나는 식품과 산소가 모자란 근육 · 적혈구는 젖산 발효예요.',
          setup() { setMode('case'); S.cs.pick = null; S.cs.so.reset(); },
          check: () => sortCheck(S.cs, 10, CSC),
          explain: '<b>알코올 발효</b>: 빵 반죽, 막걸리 · 와인, 바이오 에탄올. <b>젖산 발효</b>: 요구르트, 김치, 치즈, 산소가 모자란 근육, 적혈구. <b>산소호흡</b>: 산소가 충분할 때의 효모와 근육이에요.',
        },
        {
          type: 'quiz', title: '낫토 · 된장과 발효',
          goal: '낫토 · 된장을 흔히 “발효 식품”이라 하지만 이 차시에서 배운 발효와 <b>구별하는</b> 까닭은?',
          setup() { setMode('case'); },
          choices: ['미생물이 단백질 등을 분해하는 과정이 들어 있어, 산소 없이 NAD⁺를 되살리며 ATP를 얻는 발효의 정의와 다르기 때문이다', '낫토 · 된장에는 미생물이 전혀 없기 때문이다', '낫토 · 된장은 모두 산소호흡만으로 만들어지기 때문이다', '낫토 · 된장은 CO₂를 전혀 만들지 않기 때문이다'],
          answer: 0,
          feedback: ['', '낫토 · 된장은 미생물이 만들어요.', '산소호흡만으로 만들어진다고 할 수는 없어요. 핵심은 정의가 다르다는 점이에요.', 'CO₂ 생성 여부로 구별하는 것이 아니에요.'],
          explain: '이 차시의 발효는 <b>산소 없이 NAD⁺를 되살려 해당 과정을 이어 가며 ATP를 얻는 것</b>이에요. 낫토 · 된장의 숙성에는 미생물이 단백질을 분해하는 과정이 들어 있어 이 정의와는 구별해요.',
        },
      ],
    },
  ];

  mkSorter(S.pr, PRC, 'prod'); mkSorter(S.vn, VNC, 'venn'); mkSorter(S.cs, CSC, 'case');
  o2Reset(); fmReset();
  game = SciSim.game({
    simId: 'hy-fermentation', mount: '#game', badge: '발효 탐정', homeHref: '../../index.html#hy',
    featureLabels: { o2: '🚫 산소 조절 · NAD⁺ 풀', ferm: '🧫 두 가지 발효 · 산물 카드', cmp: '📊 비교표 · 공통점 · 포도당 계산', case: '🍞 사례 분류' },
    onFeatures() { updateCtl(); },
    levels,
  });

  function readouts() {
    const m = S.mode, f = S.fm, cm = S.cm;
    if (m === 'o2') setReads(['NAD⁺ / NADH', o2Plus() + ' / ' + o2Minus(), '산소', S.o2.on ? '있음' : '없음', '해당 과정 속도', fi(S.o2.rate.v) + ' %']);
    else if (m === 'ferm') setReads(['세포', f.org === 'alc' ? '효모' : '젖산균 · 근육', '진행', f.run ? (f.run.fin ? '완료' : fi(Math.min(100, f.run.t / 7.3 * 100)) + ' %') : '대기', '순 ATP', fi(f.c.atp.v)]);
    else if (m === 'prod') setReads(['놓은 카드', S.pr.so.placed + ' / 6', '알코올 발효', S.pr.so.cards.filter((q) => q.zone === 'alc').length + '장', '젖산 발효', S.pr.so.cards.filter((q) => q.zone === 'lac').length + '장']);
    else if (m === 'cmp') {
      if (cm.view === 'ven') setReads(['놓은 카드', S.vn.so.placed + ' / 10', '공통', S.vn.so.cards.filter((q) => q.zone === 'both').length + '장', '구분', S.vn.so.cards.filter((q) => q.zone === 'resp' || q.zone === 'ferm').length + '장']);
      else if (cm.view === 'calc') setReads(['ATP 목표', '30', '산소호흡', (isFinite(numIn('inGr')) ? numIn('inGr') : '?') + '분자', '발효', (isFinite(numIn('inGf')) ? numIn('inGf') : '?') + '분자']);
      else if (cm.view === 'pas') setReads(['산소', cm.ps ? '있음' : '없음', '포도당 소비 속도', cm.ps ? '약 7' : '100', '대사', cm.ps ? '산소호흡' : '알코올 발효']);
      else setReads(['비교 항목', '7줄', '틀린 줄', cm.tried ? Object.keys(cm.bad).filter((k) => k !== 'all').length + '줄' : '?', '효율', '32 % 대 2 %']);
    } else setReads(['놓은 카드', S.cs.so.placed + ' / 10', '알코올 발효', S.cs.so.cards.filter((q) => q.zone === 'alc').length + '장', '젖산 발효', S.cs.so.cards.filter((q) => q.zone === 'lac').length + '장']);
  }

  setMode('o2');
  let lastFree = false, lastLv = -1, uiT = 0;
  SciSim.loop((dt, t) => {
    clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (game && game.level !== lastLv) { lastLv = game.level; updateCtl(); }
    view.apply(); FX.update(dt); ctx.clearRect(0, 0, VW, VH);
    bgFill('#f3f6ee', '#e8eee2');
    updLater(dt);
    if (S.mode === 'o2') o2Draw(dt, t); else if (S.mode === 'ferm') fmDraw(dt, t); else if (S.mode === 'prod') prodDraw(dt); else if (S.mode === 'cmp') cmDraw(dt, t); else caseDraw(dt);
    FX.draw(); parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(241,246,243,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : approach(S.fade, 0, dt, 9); }
    uiT += dt; if (uiT > 0.25 && (S.mode === 'o2' || S.mode === 'ferm')) { uiT = 0; updateCtl(); }
    readouts();
  });

  window.__sim = { S, VW, VH, PHONE, get game() { return game; }, levels, setMode, o2SetOn, o2Reset, o2Plus, o2Stopped, fmStart, fmSetOrg, fmDone, cmReset, cmSetView, TB, VNC, CSC, PRC, updateCtl, sortWrong };
})();
