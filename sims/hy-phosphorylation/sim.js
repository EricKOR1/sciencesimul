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
     고등학교 세포와 물질대사 · Ⅲ. 세포호흡과 광합성 - 두 가지 인산화 (단원 58, 3차시)
     성취기준 [12세포03-03] 세포호흡 과정에서의 인산화 과정을 기질 수준의 인산화와 산화적 인산화 과정으로 구분할 수 있다.
     ① 분석: 기질 수준  ② 모형: H⁺ 기울기  ③ 모형: 화학 삼투  ④ 분석: 구분하기
     (산화적 인산화는 화학 삼투로 ATP가 합성된다는 수준까지, 전자 전달 단백질은 '단백질 복합체'로만)
     ========================================================= */
  const S = { mode: 'sub', fade: 0 };
  let game = null;
  const fi = (v) => String(Math.round(v));
  const cmix = C.mix;
  const phA = (g) => 7.5 - 0.5 * g, phM = (g) => 7.5 + 0.5 * g;           // 막 사이 공간 · 기질의 pH (기울기 정도 g: 0~1)
  const concH = (ph) => Math.pow(10, 8 - ph);                              // 기질(pH 8)을 1로 본 상대 H⁺ 농도
  const ratioH = (g) => Math.pow(10, g);                                   // H⁺ 농도비 = 10^ΔpH
  function pill(x, y, w, h, text, bg, fg, a) {
    ctx.save(); ctx.globalAlpha = a == null ? 1 : a; D.roundRect(x - w / 2, y - h / 2, w, h, h / 2); ctx.fillStyle = bg; ctx.fill(); ctx.strokeStyle = 'rgba(15,23,42,.28)'; ctx.lineWidth = 1; ctx.stroke();
    T(x, y + h * 0.33, text, h * 0.68, fg, 'center', 800); ctx.restore();
  }
  function beads(x, y, n, r, col) {
    const d = r * 2.15, pts = n === 3 ? [[-d / 2, d * 0.3], [d / 2, d * 0.3], [0, -d * 0.55]] : [[-d / 2, -d / 2], [d / 2, -d / 2], [-d / 2, d / 2], [d / 2, d / 2]];
    ctx.strokeStyle = 'rgba(71,85,105,.45)'; ctx.lineWidth = 2; ctx.beginPath(); pts.forEach((p, i) => { if (i) ctx.lineTo(x + p[0], y + p[1]); else ctx.moveTo(x + p[0], y + p[1]); }); ctx.closePath(); ctx.stroke();
    pts.forEach((p) => D.sphere(x + p[0], y + p[1], r, col || '#475569', { gloss: true }));
  }
  function pBlock(x, y, s, a) {
    ctx.save(); ctx.globalAlpha = a == null ? 1 : a; D.shadow(() => { D.roundRect(x - s / 2, y - s / 2, s, s, s * 0.28); ctx.fillStyle = '#fb923c'; ctx.fill(); }, { blur: 5, y: 2 });
    D.roundRect(x - s / 2, y - s / 2, s, s, s * 0.28); ctx.strokeStyle = '#c2410c'; ctx.lineWidth = 2; ctx.stroke(); T(x, y + s * 0.18, 'Ⓟ', s * 0.7, '#fff', 'center', 800); ctx.restore();
  }

  /* =========================================================
     ① 기질 수준 인산화: 인산기 블록 옮기기
     ========================================================= */
  S.sb = { view: 'glyc', done: { glyc: 0, tca: 0 }, need: { glyc: 4, tca: 2 }, busy: false, drag: null, invest: { glyc: 0 }, tok: null, adp: null, atps: { glyc: [], tca: [] }, run: 0, sent: false, pick: {}, bad: false, pulse: 0, ring: 0 };
  const sbN = (v) => S.sb.need[v || S.sb.view], sbD = (v) => S.sb.done[v || S.sb.view];
  function sbG() {
    const P1 = PHONE ? { x: 10, y: 10, w: 460, h: 360 } : { x: 14, y: 14, w: 772, h: 372 }, P2 = PHONE ? { x: 10, y: 378, w: 460, h: 252 } : { x: 14, y: 394, w: 772, h: 152 };
    const ew = PHONE ? 250 : 290, eh = PHONE ? 130 : 150, ec = { x: P1.x + P1.w * 0.5, y: P1.y + P1.h * 0.58 };
    return { P1, P2, ec, ew, eh, sL: { x: ec.x - ew * 0.25, y: ec.y + 10 }, aR: { x: ec.x + ew * 0.27, y: ec.y + 8 }, bs: PHONE ? 24 : 28, br: PHONE ? 6.4 : 7.4 };
  }
  function sbNewTok(from) {
    const g = sbG(), v = S.sb.view, sb = S.sb;
    sb.tok = { x: from ? from.x : g.sL.x - 120, y: from ? from.y : g.sL.y, a: 0, px: 0, py: 0, hasP: true, pa: 1, n: v === 'glyc' ? 3 : 4, off: 0 };
    sb.adp = { a: 0, atp: false, x: g.aR.x, y: g.aR.y };
    sbGo(sb.tok, { x: g.sL.x, y: g.sL.y, a: 1 }, 0.6); sbGo(sb.adp, { a: 1 }, 0.5, 0.2);
    sb.tok.px = g.sL.x + 8; sb.tok.py = g.sL.y - 46;
  }
  function sbGo(o, to, dur, delay, ease) { if (RM) { Object.assign(o, to); return; } SciSim.tween(o, to, { duration: dur, delay: delay || 0, ease: ease || 'outCubic' }); }
  function sbReset(v) {
    const sb = S.sb; sb.run++; clearLater(); FX.clear(); parts.clear(); sb.busy = false; sb.drag = null; sb.view = v || sb.view; sb.done[sb.view] = 0; sb.atps[sb.view] = []; sb.tok = null; sb.adp = null; sb.sent = false;
    if (sb.view === 'glyc') { sb.invest.glyc = 0; }
    sbNewTok(); const run = sb.run;
    if (sb.view === 'glyc') after(RM ? 0.01 : 0.6, () => { if (sb.run === run) { sbGo(sb.invest, { glyc: 1 }, 1.0, 0, 'inOutCubic'); } });
    updateCtl();
  }
  function sbSetView(v) { if (S.sb.view === v) return; S.sb.run++; clearLater(); FX.clear(); parts.clear(); S.sb.busy = false; S.sb.drag = null; S.sb.view = v; S.sb.tok = null; S.sb.adp = null;
    if (sbD(v) < sbN(v)) { sbNewTok(); if (v === 'glyc') S.sb.invest.glyc = 1; } updateCtl(); }
  function sbSend(from) {
    const sb = S.sb, g = sbG(); if (sb.busy || !sb.tok || sbD() >= sbN()) return;
    const v = sb.view, run = sb.run, t = sb.tok, adp = sb.adp; sb.busy = true; sb.sent = true;
    const tgt = { px: g.aR.x - 2, py: g.aR.y - 26 }; if (from) { t.px = from.x; t.py = from.y; }
    sbGo(t, tgt, 0.45, 0, 'inOutCubic');
    after(RM ? 0.01 : 0.5, () => {
      if (sb.run !== run) return;
      t.hasP = false; adp.atp = true; sb.done[v]++; sb.pulse = 1; Sound.success();
      parts.burst(g.aR.x, g.aR.y - 10, { count: 16, colors: ['#facc15', '#fff', '#fb923c'], speed: 130, life: 0.8, gravity: 60 });
      FX.add({ kind: 'text', x: g.aR.x, y: g.aR.y - 46, life: 1.2, text: 'ATP 합성!', color: '#b45309', size: 16 });
      sb.atps[v].push({ a: 0 }); sbGo(sb.atps[v][sb.atps[v].length - 1], { a: 1 }, 0.4, 0.3);
      updateCtl();
    });
    after(RM ? 0.02 : 1.2, () => {
      if (sb.run !== run) return;
      sbGo(t, { x: g.sL.x + 70, y: g.sL.y + 120, a: 0 }, 0.7, 0, 'inCubic'); sbGo(adp, { a: 0 }, 0.5);
      after(RM ? 0.01 : 0.7, () => { if (sb.run !== run) return; sb.busy = false; if (sbD(v) < sbN(v)) sbNewTok(); else { sb.tok = null; sb.adp = null; Sound.level(); } updateCtl(); });
    });
    updateCtl();
  }
  const sbPT = {
    down(p) {
      const sb = S.sb, t = sb.tok; if (!t || sb.busy || !t.hasP || sbD() >= sbN()) return false;
      if (Math.hypot(p.x - t.px, p.y - t.py) < 30) { sb.drag = { dx: t.px - p.x, dy: t.py - p.y, sx: p.x, sy: p.y, moved: false }; Sound.tick(); return true; } return false;
    },
    move(p) { const sb = S.sb, d = sb.drag; if (!d) return; if (Math.hypot(p.x - d.sx, p.y - d.sy) > 8) d.moved = true; if (d.moved) { sb.tok.px = clamp(p.x + d.dx, 10, VW - 10); sb.tok.py = clamp(p.y + d.dy, 10, VH - 10); } },
    up(p) {
      const sb = S.sb, d = sb.drag; if (!d) return; sb.drag = null; const g = sbG(), t = sb.tok;
      if (!d.moved) { sbSend(); return; }
      if (Math.hypot(p.x - g.aR.x, p.y - g.aR.y) < 64) sbSend({ x: t.px, y: t.py });
      else { Sound.fail(); sbGo(t, { px: g.sL.x + 8, py: g.sL.y - 46 }, RM ? 0.01 : 0.4, 0, 'outBack'); showHint('Ⓟ 블록을 오른쪽 ADP 위에 놓아야 해요.', 2400); }
    },
    hover(p) { const t = S.sb.tok; return t && !S.sb.busy && t.hasP && Math.hypot(p.x - t.px, p.y - t.py) < 30 ? 'grab' : 'default'; },
  };
  function sbDraw(dt, t) {
    const sb = S.sb, g = sbG(), P1 = g.P1, P2 = g.P2, v = sb.view, glyc = v === 'glyc';
    sb.pulse = approach(sb.pulse, 0, dt, 3); sb.ring = (sb.ring + dt) % 1;
    panel(P1.x, P1.y, P1.w, P1.h, 18, glyc ? '#f6fbf1' : '#fffbea');
    T(P1.x + P1.w / 2, P1.y + P1.h - 12, glyc ? '세포질 (막이 없어도 일어나요)' : '미토콘드리아 기질', PHONE ? 13 : 14.5, glyc ? '#4d7c0f' : '#8a6410', 'center', 800);
    // 효소
    const ec = g.ec, ew = g.ew, eh = g.eh;
    D.shadow(() => { D.roundRect(ec.x - ew / 2, ec.y - eh / 2, ew, eh, eh * 0.4); ctx.fillStyle = '#bfdbfe'; ctx.fill(); }, { blur: 10, y: 4 });
    D.roundRect(ec.x - ew / 2, ec.y - eh / 2, ew, eh, eh * 0.4); ctx.strokeStyle = '#2563eb'; ctx.lineWidth = 3; ctx.stroke();
    [g.sL, g.aR].forEach((q, k) => { ctx.beginPath(); ctx.arc(q.x, q.y, k ? 33 : 36, 0, TAU); ctx.fillStyle = '#dbeafe'; ctx.fill(); ctx.strokeStyle = '#60a5fa'; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.stroke(); ctx.setLineDash([]); });
    T(ec.x, ec.y - eh / 2 + 20, '효소', 14, '#1e40af', 'center', 800);
    T(g.sL.x, ec.y + eh / 2 + 20, '▲ 고에너지 기질', 12.5, '#1e3a8a', 'center', 800); T(g.aR.x, ec.y + eh / 2 + 20, '▲ ADP 자리', 12.5, '#1e3a8a', 'center', 800);
    // 해당 과정의 에너지 투자
    if (glyc) {
      const ix = P1.x + 14, iy = P1.y + 14, iw = PHONE ? 210 : 270, ih = 74; D.roundRect(ix, iy, iw, ih, 12); ctx.fillStyle = 'rgba(254,226,226,.7)'; ctx.fill(); ctx.strokeStyle = '#fca5a5'; ctx.lineWidth = 1.5; ctx.stroke();
      T(ix + 10, iy + 20, '먼저 투자: ATP 2개 소비', 13.5, '#991b1b', 'left', 800);
      const k = sb.invest.glyc;
      for (let j = 0; j < 2; j++) { const bx = ix + 40 + j * 66, by = iy + 50; pill(bx, by, 54, 24, k > 0.6 ? 'ADP' : 'ATP', k > 0.6 ? '#d1d5db' : '#facc15', '#1f2937'); }
      T(ix + iw - 12, iy + 56, k > 0.6 ? '소비 2' : '', 17, '#b91c1c', 'right', 800);
    }
    // 대기 중인 기질
    const left = sbN() - sbD() - (sb.tok ? 1 : 0);
    if (left > 0) { T(P1.x + 70, P1.y + P1.h * 0.58 + 78, '대기', 12.5, '#64748b', 'center', 800); for (let j = 0; j < left; j++) { beads(P1.x + 40 + j * 36, P1.y + P1.h * 0.58 + 108, glyc ? 3 : 4, 4.4, '#64748b'); } }
    // ADP 창고 + ATP 만든 것
    const wx = P1.x + P1.w - (PHONE ? 150 : 236), wy = P1.y + 14, ww = PHONE ? 136 : 222, wh = 74;
    D.roundRect(wx, wy, ww, wh, 12); ctx.fillStyle = 'rgba(254,243,199,.75)'; ctx.fill(); ctx.strokeStyle = '#fcd34d'; ctx.lineWidth = 1.5; ctx.stroke();
    T(wx + 10, wy + 20, '새로 만든 ATP ' + sbD() + ' / ' + sbN(), 13.5, '#92400e', 'left', 800);
    sb.atps[v].forEach((q, i) => pill(wx + 32 + (i % 3) * 62 * (PHONE ? 0.74 : 1) + (i >= 3 ? 0 : 0), wy + 46 + Math.floor(i / 3) * 0, 52, 22, 'ATP', '#facc15', '#713f12', q.a));
    // 기질 · ADP
    if (sb.tok) {
      const tk = sb.tok; ctx.save(); ctx.globalAlpha = tk.a; beads(tk.x, tk.y, tk.n, g.br, '#475569');
      if (tk.hasP) { ctx.strokeStyle = '#c2410c'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(tk.x, tk.y - g.br * 1.8); ctx.lineTo(tk.px, tk.py + g.bs * 0.4); ctx.stroke(); }
      ctx.restore();
      T(tk.x, tk.y + g.br * 3.4 + (tk.n === 3 ? 0 : 6), (tk.n) + '탄소 화합물', 12.5, '#1f2d44', 'center', 800, { alpha: tk.a });
      if (tk.hasP) { const lift = sb.drag && sb.drag.moved ? 1.12 : 1; pBlock(tk.px, tk.py, g.bs * lift, tk.a); if (!sb.busy && !sb.drag && sbD() < sbN()) D.ring(tk.px, tk.py, g.bs * 0.85, t, { color: '#f59e0b', width: 2 }); }
      else pBlock(tk.px, tk.py, g.bs, 0);
    }
    if (sb.adp) { const a = sb.adp; pill(a.x, a.y, 64, 28, a.atp ? 'ATP' : 'ADP', a.atp ? '#facc15' : '#d1d5db', a.atp ? '#713f12' : '#1f2937', a.a); if (a.atp) D.glow(a.x, a.y, 56 * (0.6 + sb.pulse * 0.6), '#facc15', 0.5 * a.a); }
    if (sb.drag && sb.drag.moved) D.ring(g.aR.x, g.aR.y - 8, 40, t, { color: '#f59e0b', width: 2.5 });
    // 합계판
    panel(P2.x, P2.y, P2.w, P2.h, 18, '#fff');
    const gk = sbD('glyc'), tk2 = sbD('tca'), net = gk - 2, xs = P2.x + 18;
    T(xs, P2.y + 26, 'ATP 수지 (포도당 1분자)', PHONE ? 14 : 15.5, '#1f2d44', 'left', 800);
    const rowY = (i) => P2.y + (PHONE ? 66 : 54) + i * (PHONE ? 56 : 34);
    const SW = PHONE ? 38 : 46, ST2 = PHONE ? 43 : 52;
    const slot = (x, y, ok, col, txt) => { D.roundRect(x, y - 12, SW, 24, 12); ctx.fillStyle = ok ? col : '#eef2f7'; ctx.fill(); ctx.strokeStyle = ok ? 'rgba(15,23,42,.3)' : '#cbd5e1'; ctx.lineWidth = 1.5; ctx.stroke(); T(x + SW / 2, y + 5, ok ? txt : '·', PHONE ? 11.5 : 12.5, ok ? '#1f2937' : '#94a3b8', 'center', 800); };
    // 해당 과정
    T(xs, rowY(0) + 5, '해당 과정', 14, '#166534', 'left', 800);
    const sx = xs + (PHONE ? 76 : 104);
    for (let j = 0; j < 4; j++) slot(sx + j * ST2, rowY(0), j < gk, '#facc15', '생성');
    for (let j = 0; j < 2; j++) slot(sx + 4 * ST2 + 10 + j * ST2, rowY(0), sb.invest.glyc > 0.9, '#fca5a5', '소비');
    T(sx + 6 * ST2 + 24, rowY(0) + 6, '순 ' + net, PHONE ? 16 : 18, net > 0 ? '#16a34a' : '#64748b', 'left', 800);
    if (PHONE) T(xs, rowY(0) + 26, '생성 ' + gk + ' − 소비 2 = ' + net, 12.5, '#64748b', 'left', 700); else T(sx + 6 * ST2 + 70, rowY(0) + 5, '= 생성 ' + gk + ' − 소비 2', 13, '#64748b', 'left', 700);
    // TCA 회로
    T(xs, rowY(1) + 5, 'TCA 회로', 14, '#6d28d9', 'left', 800);
    for (let j = 0; j < 2; j++) slot(sx + j * ST2, rowY(1), j < tk2, '#facc15', '생성');
    T(sx + 2 * ST2 + 14, rowY(1) + 6, '순 ' + tk2, PHONE ? 16 : 18, tk2 > 0 ? '#16a34a' : '#64748b', 'left', 800);
    if (PHONE) T(xs, rowY(1) + 26, '회전 1번에 1개 × 2회전', 12.5, '#64748b', 'left', 700); else T(sx + 2 * ST2 + 70, rowY(1) + 5, '= 회로 1번에 1개 × 2회전', 13, '#64748b', 'left', 700);
    const sum = (gk >= 0 ? net : 0) + tk2, done = gk === 4 && tk2 === 2;
    T(xs, rowY(2) + (PHONE ? 8 : 10), '기질 수준 합계', 14.5, '#1f2d44', 'left', 800);
    T(sx + (PHONE ? 70 : 60), rowY(2) + (PHONE ? 10 : 12), done ? '(해당 순 ' + net + ') + (TCA ' + tk2 + ') = ' + sum : (gk === 4 ? '해당 순 ' + net : '두 단계를 모두 해 보면 알 수 있어요'), PHONE ? 13.5 : 15.5, done ? '#be185d' : '#94a3b8', 'left', 800);
  }

  /* =========================================================
     공통: 내막 확대 장면 (② H⁺ 기울기 · ③ 화학 삼투)
     ========================================================= */
  function memG(mode) {
    const grad = mode === 'grad';
    const A = PHONE ? { x: 10, y: 10, w: 460, h: grad ? 392 : 326 } : { x: 14, y: 14, w: 772, h: grad ? 392 : 312 };
    const memY = A.y + A.h * 0.5, th = 26, f = PHONE ? [0.16, 0.34, 0.52] : [0.14, 0.3, 0.46];
    const syn = A.x + A.w * (PHONE ? 0.8 : 0.76);
    return {
      A, memY, th, cxs: f.map((q) => A.x + A.w * q), cw: PHONE ? 54 : 70, chh: PHONE ? 40 : 46, sx: syn, ssc: grad ? (PHONE ? 0.72 : 0.82) : (PHONE ? 0.95 : 1.12),
      ims: { x: A.x + 10, y: A.y + 34, w: A.w - 20, h: memY - th / 2 - 6 - (A.y + 34) }, mat: { x: A.x + 10, y: memY + th / 2 + 6, w: A.w - 20, h: A.y + A.h - 10 - (memY + th / 2 + 6) },
      src: { x: A.x + 38, y: memY + th / 2 + 44 }, o2: { x: A.x + A.w * f[2] + (PHONE ? 4 : 10), y: memY + th / 2 + (PHONE ? 52 : 58) },
    };
  }
  function hLists(z) { if (!z.ims) { z.ims = []; z.mat = []; } return z; }
  /* H⁺ 점의 개수를 농도에 맞춰요 (막 사이 공간: 3 × [H⁺], 기질: 3 × [H⁺], 기질 pH 8 = 1) */
  function hTarget(g) { return [Math.round(3 * concH(phA(g))), Math.round(3 * concH(phM(g)))]; }
  function hUpdate(z, g0, dt, G, pumpSrc) {
    hLists(z); const [ti, tm] = hTarget(g0), rects = [G.ims, G.mat], lists = [z.ims, z.mat], tg = [ti, tm];
    lists.forEach((L, k) => {
      const R = rects[k], live = L.filter((q) => !q.die).length;
      for (let n = live; n < tg[k]; n++) { const fromMem = pumpSrc && k === 0 && z.pumpPending > 0; if (fromMem) z.pumpPending--; const sx = fromMem ? pumpSrc[Math.floor(Math.random() * pumpSrc.length)] : R.x + 14 + Math.random() * (R.w - 28); L.push({ x: fromMem ? sx : sx, y: fromMem ? G.memY + 4 : R.y + 8 + Math.random() * (R.h - 16), vx: (Math.random() - 0.5) * 30, vy: fromMem ? -90 : (Math.random() - 0.5) * 30, a: fromMem ? 0.6 : 0, die: false, born: !!fromMem }); }
      if (live > tg[k]) { let n = live - tg[k]; for (let i = 0; i < L.length && n > 0; i++) if (!L[i].die && !L[i].born) { L[i].die = true; n--; } }
      for (let i = L.length - 1; i >= 0; i--) {
        const q = L[i]; q.a = q.die ? q.a - dt * 1.6 : Math.min(1, q.a + dt * 3); if (q.a < 0) { L.splice(i, 1); continue; }
        q.vx += (Math.random() - 0.5) * 110 * dt; q.vy += (Math.random() - 0.5) * 110 * dt; const sp = Math.hypot(q.vx, q.vy); if (sp > 50 && !q.born) { q.vx *= 50 / sp; q.vy *= 50 / sp; }
        q.x += q.vx * dt; q.y += q.vy * dt; if (q.born && q.y < R.y + R.h) q.born = false;
        if (!q.born) { if (q.x < R.x + 8) { q.x = R.x + 8; q.vx = Math.abs(q.vx); } if (q.x > R.x + R.w - 8) { q.x = R.x + R.w - 8; q.vx = -Math.abs(q.vx); } if (q.y < R.y + 6) { q.y = R.y + 6; q.vy = Math.abs(q.vy); } if (q.y > R.y + R.h - 4) { q.y = R.y + R.h - 4; q.vy = -Math.abs(q.vy); } }
      }
    });
  }
  function hDraw(z) { [z.ims, z.mat].forEach((L) => L.forEach((q) => { ctx.save(); ctx.globalAlpha = Math.max(0, q.a); T(q.x, q.y + 4, 'H⁺', 11.5, '#c2410c', 'center', 800); ctx.restore(); })); }
  function memBack(G, labelsIms, labelsMat) {
    const A = G.A, my = G.memY, th = G.th; panel(A.x, A.y, A.w, A.h, 18, '#fffdf7');
    D.roundRect(G.ims.x, G.ims.y, G.ims.w, G.ims.h, 12); ctx.fillStyle = 'rgba(251,208,150,.55)'; ctx.fill();
    D.roundRect(G.mat.x, G.mat.y, G.mat.w, G.mat.h, 12); const mg = ctx.createLinearGradient(0, G.mat.y, 0, G.mat.y + G.mat.h); mg.addColorStop(0, '#fff7d9'); mg.addColorStop(1, '#f4d58a'); ctx.fillStyle = mg; ctx.fill();
    T(G.ims.x + 12, G.ims.y + 20, labelsIms || '막 사이 공간', 14.5, '#9a5b12', 'left', 800); T(G.mat.x + 12, G.mat.y + 22, labelsMat || '기질', 14.5, '#8a6410', 'left', 800);
    const x0 = A.x + 10, x1 = A.x + A.w - 10; ctx.fillStyle = 'rgba(244,114,182,.3)'; ctx.fillRect(x0, my - th / 2, x1 - x0, th);
    for (let x = x0 + 6; x < x1 - 4; x += 12) { D.sphere(x, my - th / 2 + 2, 4.2, '#f472b6', { gloss: false }); D.sphere(x, my + th / 2 - 2, 4.2, '#f472b6', { gloss: false }); }
    T(x1 - 4, my - th / 2 - 5, '내막', 14, '#be185d', 'right', 800, { stroke: 'rgba(251,208,150,.8)', strokeWidth: 3 });
  }
  function memComplexes(G, blocked) {
    const my = G.memY;
    G.cxs.forEach((cx, k) => {
      const hot = k === 2 && blocked;
      D.shadow(() => { D.roundRect(cx - G.cw / 2, my - G.chh / 2, G.cw, G.chh, 18); ctx.fillStyle = hot ? '#fecaca' : '#a5b4fc'; ctx.fill(); }, { blur: 5, y: 2 });
      D.roundRect(cx - G.cw / 2, my - G.chh / 2, G.cw, G.chh, 18); ctx.strokeStyle = hot ? '#dc2626' : '#4f46e5'; ctx.lineWidth = 2.5; ctx.stroke();
      T(cx, my + 4.5, ['복합체 ①', '복합체 ②', '복합체 ③'][k], PHONE ? 11 : 12.5, hot ? '#991b1b' : '#312e81', 'center', 800);
    });
    if (blocked) D.sphere(G.cxs[2] + G.cw / 2 - 2, my - G.chh / 2 + 2, 13, '#dc2626', { gloss: false, text: '✖' });
  }
  /* ATP 합성 효소 (터빈): spin 회전각, open 통로, plug 막힘 */
  function synthDraw(G, spin, plug, label) {
    const my = G.memY, sx = G.sx, sc = G.ssc, th = G.th;
    ctx.save(); ctx.translate(sx, my);
    // 통로(막 사이 공간 쪽 입구)
    ctx.fillStyle = 'rgba(253,230,138,.55)'; ctx.fillRect(-14 * sc, -th / 2 - 22 * sc, 28 * sc, th + 22 * sc);
    ctx.strokeStyle = '#a16207'; ctx.lineWidth = 2; ctx.strokeRect(-14 * sc, -th / 2 - 22 * sc, 28 * sc, th + 22 * sc);
    // 회전자
    ctx.beginPath(); ctx.ellipse(0, 0, 30 * sc, th / 2 + 7 * sc, 0, 0, TAU); ctx.fillStyle = '#fde68a'; ctx.fill(); ctx.stroke();
    ctx.save(); ctx.rotate(spin); for (let k = 0; k < 6; k++) { ctx.rotate(TAU / 6); ctx.fillStyle = k % 2 ? '#f59e0b' : '#d97706'; ctx.fillRect(4 * sc, -2.5 * sc, 20 * sc, 5 * sc); } ctx.restore();
    // 줄기와 머리 (기질 쪽)
    ctx.fillStyle = '#d97706'; ctx.fillRect(-5 * sc, th / 2, 10 * sc, 20 * sc);
    D.sphere(0, th / 2 + 44 * sc, 24 * sc, '#fbbf24', { gloss: true, outline: '#a16207', outlineWidth: 1.5 });
    ctx.save(); ctx.translate(0, th / 2 + 44 * sc); ctx.rotate(spin * 0.7); ctx.fillStyle = '#b45309'; ctx.fillRect(-2.5, -14 * sc, 5, 14 * sc); ctx.restore();
    if (plug) { D.roundRect(-18 * sc, -th / 2 - 30 * sc, 36 * sc, 14 * sc, 4); ctx.fillStyle = '#dc2626'; ctx.fill(); T(0, -th / 2 - 18 * sc, '막힘', 11, '#fff', 'center', 800); }
    ctx.restore();
    T(sx, my + th / 2 + 44 * sc + 38 * sc, label || 'ATP 합성 효소', PHONE ? 12 : 13.5, '#92400e', 'center', 800);
  }

  /* =========================================================
     ② H⁺ 기울기 만들기
     ========================================================= */
  S.gr = { s: 5, o2: true, g: 0, els: [], spawnT: 0, pumpPending: 0, noO2T: 0, ims: null, mat: null, pumps: 0, spin: 0, maxG: 0 };
  function grPath(G) { return [{ x: G.src.x, y: G.src.y }, { x: G.cxs[0], y: G.memY + 6 }, { x: G.cxs[1], y: G.memY + 6 }, { x: G.cxs[2], y: G.memY + 6 }, { x: G.o2.x, y: G.o2.y - 10 }]; }
  function grClear() { const z = S.gr; z.g = 0; z.els.length = 0; z.pumpPending = 0; z.noO2T = 0; z.spawnT = 0; z.maxG = 0; if (z.ims) { z.ims.length = 0; z.mat.length = 0; } updateCtl(); }
  function grUpdate(dt) {
    const z = S.gr, G = memG('grad'), path = grPath(G);
    z.spawnT -= dt; const rate = z.s * 0.4;   // 초당 전자 수
    if (z.o2 && z.s > 0 && z.spawnT <= 0 && z.els.length < 10) { z.spawnT = 1 / rate; z.els.push({ seg: 0, p: 0, x: path[0].x, y: path[0].y }); }
    for (let i = z.els.length - 1; i >= 0; i--) {
      const e = z.els[i]; if (!z.o2) break;                          // 산소가 없으면 전자 흐름이 멈춰요
      const a = path[e.seg], b = path[e.seg + 1], len = Math.hypot(b.x - a.x, b.y - a.y) || 1; e.p += dt * 150 / len;
      if (e.p >= 1) {
        e.seg++; e.p = 0;
        if (e.seg >= 4) { parts.burst(path[4].x, path[4].y + 6, { count: 5, colors: ['#38bdf8', '#bae6fd'], speed: 45, life: 0.6, gravity: -25, shape: 'bubble', size: 3 }); z.els.splice(i, 1); continue; }
        z.g += 0.05 * (1 - z.g); z.pumpPending++; z.pumps++; Sound.tick();   // 복합체를 지날 때마다 H⁺ 가 막 사이 공간으로 펌프돼요
      }
      const a2 = path[e.seg], b2 = path[e.seg + 1]; e.x = a2.x + (b2.x - a2.x) * e.p; e.y = a2.y + (b2.y - a2.y) * e.p;
    }
    z.g = clamp(z.g - 0.02 * z.g * dt, 0, 1); z.maxG = Math.max(z.maxG, z.g);
    if (!z.o2 && z.s > 0 && z.g < 0.12) z.noO2T += dt; else if (z.o2) z.noO2T = 0;
    hUpdate(z, z.g, dt, G, G.cxs); z.spin = 0;
  }
  function grDraw(dt, t) {
    const z = S.gr, G = memG('grad'), A = G.A, my = G.memY; grUpdate(dt);
    memBack(G);
    memComplexes(G, !z.o2);
    // ATP 합성 효소 (다음 단계에서 사용: 지금은 닫혀 있어요)
    synthDraw(G, 0, true, 'ATP 합성 효소 (다음 단계)');
    hDraw(z);
    // NADH · 산소 · 전자
    const path = grPath(G); D.sphere(path[0].x, path[0].y, 17, '#34d399', { gloss: true, text: 'NADH', textScale: 0.6 });
    if (z.o2) { D.sphere(G.o2.x - 9, G.o2.y + 6, 8, '#ef4444', { gloss: true }); D.sphere(G.o2.x + 7, G.o2.y + 6, 8, '#ef4444', { gloss: true }); T(G.o2.x, G.o2.y + 30, 'O₂', 13.5, '#b91c1c', 'center', 800); }
    else { T(G.o2.x, G.o2.y + 8, 'O₂ 없음', 13.5, '#b91c1c', 'center', 800); ctx.strokeStyle = '#dc2626'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(G.o2.x - 22, G.o2.y - 10); ctx.lineTo(G.o2.x + 22, G.o2.y + 22); ctx.stroke(); }
    z.els.forEach((e) => { D.glow(e.x, e.y, 13, '#facc15', 0.55); D.sphere(e.x, e.y, 6.5, '#fde047', { gloss: false, text: 'e⁻', textColor: '#713f12', textScale: 0.95 }); });
    if (!z.o2 && z.els.length) T(G.cxs[1], my + 52, '전자가 갈 곳이 없어 흐름이 멈췄어요', PHONE ? 11.5 : 13.5, '#b91c1c', 'center', 800, { stroke: 'rgba(255,247,217,.9)', strokeWidth: 3 });
    // 게이지: H⁺ 농도 막대와 pH 눈금
    const Pg = PHONE ? { x: 10, y: 410, w: 460, h: 220 } : { x: 14, y: 414, w: 772, h: 132 };
    panel(Pg.x, Pg.y, Pg.w, Pg.h, 16, '#fff');
    const pa = phA(z.g), pm = phM(z.g), ca = concH(pa), cm = concH(pm);
    const bar = (x, y, w, label, ph, c, col) => {
      T(x, y, label, PHONE ? 13.5 : 14.5, '#334155', 'left', 800); D.roundRect(x, y + 8, w, 18, 9); ctx.fillStyle = '#eef2f7'; ctx.fill(); D.roundRect(x, y + 8, Math.max(8, w * c / 10), 18, 9); ctx.fillStyle = col; ctx.fill();
      T(x + w, y, 'pH ' + (Math.round(ph * 10) / 10).toFixed(1), PHONE ? 14.5 : 16, '#1f2d44', 'right', 800);
    };
    const bw = PHONE ? 250 : 290, bx = Pg.x + 16, by = Pg.y + 28;
    bar(bx, by, bw, '막 사이 공간 [H⁺]', pa, ca, '#f97316'); bar(bx, by + (PHONE ? 52 : 44), bw, '기질 [H⁺]', pm, cm, '#eab308');
    T(bx, by + (PHONE ? 100 : 86), '막대 길이 = 기질(pH 8)을 1로 본 [H⁺] (최대 10)', 11.5, '#94a3b8', 'left', 700);
    // pH 눈금자 (7 ~ 8)
    const rw = PHONE ? 250 : 190, rx = PHONE ? bx : Pg.x + 352, ry = PHONE ? Pg.y + 174 : Pg.y + 62;
    T(rx, ry - 26, 'pH 눈금', 13, '#334155', 'left', 800); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx + rw, ry); ctx.stroke();
    [7, 7.5, 8].forEach((v) => { const xx = rx + (v - 7) * rw; ctx.beginPath(); ctx.moveTo(xx, ry - 5); ctx.lineTo(xx, ry + 5); ctx.stroke(); T(xx, ry + 22, v.toFixed(v % 1 ? 1 : 0), 12, '#64748b', 'center', 700); });
    D.sphere(rx + (pa - 7) * rw, ry, 8, '#f97316', { gloss: false }); D.sphere(rx + (pm - 7) * rw, ry, 8, '#eab308', { gloss: false });
    const tx = PHONE ? Pg.x + 290 : Pg.x + 580, ty = PHONE ? Pg.y + 28 : Pg.y + 28;
    T(tx, ty, 'ΔpH', PHONE ? 13.5 : 14.5, '#334155', 'left', 800); T(tx + (PHONE ? 50 : 56), ty + 4, z.g.toFixed(2), PHONE ? 26 : 30, z.g >= 0.8 ? '#16a34a' : '#1f2d44', 'left', 800);
    T(tx, ty + 34, '농도비 약 ' + f1(ratioH(z.g)) + '배', PHONE ? 14 : 16.5, '#9a3412', 'left', 800);
    const pw = PHONE ? 160 : 176, py = ty + 48; D.roundRect(tx, py, pw, 12, 6); ctx.fillStyle = '#eef2f7'; ctx.fill(); D.roundRect(tx, py, Math.max(8, pw * z.g), 12, 6); ctx.fillStyle = z.g >= 0.8 ? '#16a34a' : '#f59e0b'; ctx.fill(); ctx.strokeStyle = '#334155'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(tx + pw * 0.8, py - 4); ctx.lineTo(tx + pw * 0.8, py + 16); ctx.stroke();
    T(tx, py + 34, '목표 ΔpH 0.8 이상', PHONE ? 12 : 13, '#64748b', 'left', 700); T(tx, py + 50, '(농도비 6.3배 이상)', PHONE ? 12 : 13, '#64748b', 'left', 700);
  }

  /* =========================================================
     ③ 화학 삼투: ATP 합성 효소를 수력 터빈으로
     ========================================================= */
  const TRV = {
    none: { o2: 100, atp: 100, heat: 2, g: 0.75, name: '처리 없음' },
    cn: { o2: 0, atp: 0, heat: 1, g: 0, name: '시안화물' },
    ol: { o2: 30, atp: 0, heat: 1, g: 0.95, name: '올리고마이신' },
    un: { o2: 180, atp: 20, heat: 3, g: 0.12, name: '짝풀림제' },
  };
  const HEATN = ['', '낮음', '보통', '높음'];
  const TRANS = { cn: { o: 'zero', a: 'zero', h: 'down' }, ol: { o: 'down', a: 'zero', h: 'down' }, un: { o: 'up', a: 'down', h: 'up' } };
  S.ch = { tr: 'none', rec: { cn: false, ol: false, un: false }, settle: 0, o2: new Num(100), atp: new Num(100), heat: new Num(2), g: 0.75, spin: 0, els: [], spawnT: 0, atpFly: [], flames: [], hflow: [], flowT: 0, atpT: 0, leakT: 0, flameT: 0, ims: null, mat: null, pumpPending: 0, ack: {} };
  const chOK = () => { const c = S.ch, t = TRV[c.tr]; return Math.abs(c.o2.v - t.o2) < 1.5 && Math.abs(c.atp.v - t.atp) < 1.5 && Math.abs(c.heat.v - t.heat) < 0.06; };
  function chSet(tr) {
    const c = S.ch; if (c.tr === tr) return; c.tr = tr; c.settle = 0; Sound.click();
    if (tr === 'cn') showHint('시안화물: 전자 전달 복합체 ③을 막았어요.', 3000); else if (tr === 'ol') showHint('올리고마이신: ATP 합성 효소의 H⁺ 통로를 막았어요.', 3000); else if (tr === 'un') showHint('짝풀림제: 내막이 H⁺ 를 새게 해요.', 3000); else hideHint();
    updateCtl();
  }
  function chReset() { const c = S.ch; c.tr = 'none'; c.rec = { cn: false, ol: false, un: false }; c.settle = 0; c.o2.snap(100); c.atp.snap(100); c.heat.snap(2); c.g = 0.75; c.els.length = 0; c.atpFly.length = 0; c.flames.length = 0; c.hflow.length = 0; if (c.ims) { c.ims.length = 0; c.mat.length = 0; } updateCtl(); }
  function chGeo() {
    const G = memG('chemi'), A = G.A;
    const Lp = PHONE ? { x: 10, y: 342, w: 460, h: 132 } : { x: 14, y: 334, w: 376, h: 212 }, Tp = PHONE ? { x: 10, y: 480, w: 460, h: 150 } : { x: 398, y: 334, w: 388, h: 212 };
    return { G, A, Lp, Tp };
  }
  function chUpdate(dt) {
    const c = S.ch, { G } = chGeo(), t = TRV[c.tr];
    c.o2.set(t.o2); c.atp.set(t.atp); c.heat.set(t.heat); c.o2.update(dt, 3); c.atp.update(dt, 3); c.heat.update(dt, 3);
    c.g = RM ? t.g : approach(c.g, t.g, dt, 1.4);
    if (chOK() && c.tr !== 'none') { c.settle += dt; if (c.settle > 1.0 && !c.rec[c.tr]) { c.rec[c.tr] = true; Sound.success(); updateCtl(); } } else if (!chOK()) c.settle = 0;
    // 전자 (장식: 산소 소비 속도에 비례)
    const path = grPath(G), rate = 2.2 * c.o2.v / 100;
    c.spawnT -= dt; if (rate > 0.05 && c.spawnT <= 0 && c.els.length < 9) { c.spawnT = 1 / rate; c.els.push({ seg: 0, p: 0, x: path[0].x, y: path[0].y }); }
    for (let i = c.els.length - 1; i >= 0; i--) {
      const e = c.els[i], a = path[e.seg], b = path[e.seg + 1], len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      const blocked = c.tr === 'cn' && e.seg === 2 && e.p > 0.55;
      if (!blocked) e.p += dt * (60 + 110 * c.o2.v / 100) / len;
      if (e.p >= 1) { e.seg++; e.p = 0; if (e.seg >= 4) { if (c.o2.v > 3) parts.burst(path[4].x, path[4].y + 6, { count: 4, colors: ['#38bdf8', '#bae6fd'], speed: 40, life: 0.5, gravity: -25, shape: 'bubble', size: 3 }); c.els.splice(i, 1); continue; } c.pumpPending++; }
      const a2 = path[e.seg], b2 = path[e.seg + 1]; e.x = a2.x + (b2.x - a2.x) * e.p; e.y = a2.y + (b2.y - a2.y) * e.p;
    }
    hUpdate(c, c.g, dt, G, G.cxs); c.pumpPending = Math.min(c.pumpPending, 4);
    // 합성 효소: 회전 · H⁺ 흐름 · ATP
    const w = 7.5 * c.atp.v / 100; c.spin += dt * w;
    c.flowT -= dt; const fr = 3 * c.atp.v / 100;
    if (fr > 0.05 && c.flowT <= 0) { c.flowT = 1 / fr; c.hflow.push({ t: 0 }); }
    for (let i = c.hflow.length - 1; i >= 0; i--) { c.hflow[i].t += dt / 0.9; if (c.hflow[i].t >= 1) c.hflow.splice(i, 1); }
    c.atpT -= dt; const ar = 1.6 * c.atp.v / 100; if (ar > 0.05 && c.atpT <= 0) { c.atpT = 1 / ar; c.atpFly.push({ t: 0 }); }
    for (let i = c.atpFly.length - 1; i >= 0; i--) { c.atpFly[i].t += dt / 1.5; if (c.atpFly[i].t >= 1) c.atpFly.splice(i, 1); }
    // 새는 H⁺ (짝풀림제) 와 열 불꽃
    c.leakT -= dt; if (c.tr === 'un' && c.leakT <= 0) { c.leakT = 0.22; c.hflow.push({ leak: true, x: G.A.x + 30 + Math.random() * (G.A.w * 0.62), t: 0 }); }
    c.flameT -= dt; const fRate = [0, 0.15, 0.9, 4][Math.round(c.heat.v)] || 0.9; if (c.flameT <= 0) { c.flameT = 1 / fRate; c.flames.push({ x: G.A.x + 40 + Math.random() * (G.A.w - 80), t: 0 }); }
    for (let i = c.flames.length - 1; i >= 0; i--) { c.flames[i].t += dt / 1.3; if (c.flames[i].t >= 1) c.flames.splice(i, 1); }
  }
  function chDraw(dt, t) {
    const c = S.ch, { G, A, Lp, Tp } = chGeo(), my = G.memY; chUpdate(dt);
    memBack(G);
    memComplexes(G, c.tr === 'cn');
    synthDraw(G, c.spin, c.tr === 'ol', 'ATP 합성 효소 (터빈)');
    hDraw(c);
    // H⁺ 의 터빈 통과 · 새는 H⁺
    const sc = G.ssc, th = G.th;
    c.hflow.forEach((f) => {
      if (f.leak) { const y = my - th / 2 - 30 + f.t * (th + 80); ctx.save(); ctx.globalAlpha = Math.sin(f.t * Math.PI); T(f.x, y, 'H⁺', 12, '#c2410c', 'center', 800); ctx.restore(); return; }
      const y = my - th / 2 - 40 * sc + f.t * (th + 90 * sc); ctx.save(); ctx.globalAlpha = Math.sin(Math.min(1, f.t * 1.3) * Math.PI * 0.95); T(G.sx, y, 'H⁺', 12, '#c2410c', 'center', 800); ctx.restore();
    });
    c.atpFly.forEach((f) => { const x = G.sx + 28 * sc + f.t * 70, y = my + th / 2 + 44 * sc - f.t * 80; ctx.save(); ctx.globalAlpha = 1 - f.t * f.t; pill(x, y, 44, 20, 'ATP', '#facc15', '#713f12'); ctx.restore(); });
    // 열 불꽃
    c.flames.forEach((f) => { ctx.save(); ctx.globalAlpha = Math.sin(f.t * Math.PI); E('🔥', f.x, my - th / 2 - 4 - f.t * 26, 17); ctx.restore(); });
    // NADH · 산소 · 전자
    const path = grPath(G); D.sphere(path[0].x, path[0].y, 15, '#34d399', { gloss: true, text: 'NADH', textScale: 0.58 });
    D.sphere(G.o2.x - 9, G.o2.y + 4, 7.5, '#ef4444', { gloss: true }); D.sphere(G.o2.x + 6, G.o2.y + 4, 7.5, '#ef4444', { gloss: true }); T(G.o2.x, G.o2.y + 26, 'O₂', 13, '#b91c1c', 'center', 800);
    c.els.forEach((e) => { D.glow(e.x, e.y, 12, '#facc15', 0.55); D.sphere(e.x, e.y, 6, '#fde047', { gloss: false, text: 'e⁻', textColor: '#713f12', textScale: 0.95 }); });
    // 처리 이름표
    D.label(A.x + 14, A.y + 20, '처리: ' + TRV[c.tr].name, { bg: c.tr === 'none' ? '#334155' : c.tr === 'un' ? '#ea580c' : c.tr === 'ol' ? '#7c3aed' : '#dc2626', color: '#fff', size: PHONE ? 13 : 14.5, align: 'left' });
    // 측정 게이지
    panel(Lp.x, Lp.y, Lp.w, Lp.h, 16, '#fff');
    T(Lp.x + 14, Lp.y + 24, '미토콘드리아 현탁액 측정 (상대값, 처리 없음 = 100)', PHONE ? 12.5 : 14.5, '#1f2d44', 'left', 800);
    const gx = Lp.x + (PHONE ? 118 : 118), gw = Lp.w - (PHONE ? 118 : 118) - 62, g1 = Lp.y + (PHONE ? 50 : 62);
    const gbar = (y, label, v, col) => { T(Lp.x + 14, y + 5, label, PHONE ? 13 : 14, '#334155', 'left', 800); D.roundRect(gx, y - 10, gw, 20, 10); ctx.fillStyle = '#eef2f7'; ctx.fill(); if (v > 0.4) { D.roundRect(gx, y - 10, Math.max(20, gw * clamp(v / 200, 0, 1)), 20, 10); ctx.fillStyle = col; ctx.fill(); } ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(gx + gw / 2, y - 14); ctx.lineTo(gx + gw / 2, y + 14); ctx.stroke(); T(gx + gw + 8, y + 6, fi(v), 17, '#1f2d44', 'left', 800); };
    gbar(g1, '산소 소비', c.o2.v, '#ef4444'); gbar(g1 + (PHONE ? 30 : 44), 'ATP 합성', c.atp.v, '#f59e0b');
    // 열: 낮음 · 보통 · 높음
    const hy = Lp.y + (PHONE ? 108 : 164), hw2 = gw / 3; T(Lp.x + 14, hy + 5, '열 발생', PHONE ? 13 : 14, '#334155', 'left', 800);
    for (let k = 1; k <= 3; k++) { const on = Math.round(c.heat.v) === k; D.roundRect(gx + (k - 1) * (hw2 + 2), hy - 12, hw2 - 2, 24, 8); ctx.fillStyle = on ? ['', '#93c5fd', '#fcd34d', '#fb923c'][k] : '#eef2f7'; ctx.fill(); T(gx + (k - 1) * (hw2 + 2) + (hw2 - 2) / 2, hy + 5, HEATN[k], 13, on ? '#1f2d44' : '#94a3b8', 'center', 800); }
    // 결과표
    panel(Tp.x, Tp.y, Tp.w, Tp.h, 16, '#fff');
    T(Tp.x + 14, Tp.y + 24, '측정 결과표 (시험하면 채워져요)', PHONE ? 13 : 14.5, '#1f2d44', 'left', 800);
    const cx0 = Tp.x + (PHONE ? 118 : 118), cw = (Tp.w - (PHONE ? 118 : 118) - 8) / 3, ty = Tp.y + (PHONE ? 44 : 60);
    ['산소 소비', 'ATP 합성', '열 발생'].forEach((h, i) => T(cx0 + cw * (i + 0.5), ty, h, PHONE ? 12 : 13.5, '#475569', 'center', 800));
    const rows = ['none', 'cn', 'ol', 'un'], rh = PHONE ? 22 : 34;
    rows.forEach((k, i) => {
      const y = ty + 14 + i * rh, known = k === 'none' || c.rec[k], tv = TRV[k];
      if (c.tr === k) { D.roundRect(Tp.x + 8, y - 2, Tp.w - 16, rh - 2, 8); ctx.fillStyle = 'rgba(245,158,11,.16)'; ctx.fill(); }
      T(Tp.x + 14, y + rh * 0.62, tv.name, PHONE ? 12 : 14, '#1f2d44', 'left', 800);
      [fi(tv.o2), fi(tv.atp), HEATN[tv.heat]].forEach((txt, j) => T(cx0 + cw * (j + 0.5), y + rh * 0.62, known ? txt : '?', PHONE ? 13 : 16, known ? '#1f2d44' : '#cbd5e1', 'center', 800));
    });
  }
  const chRecN = () => ['cn', 'ol', 'un'].filter((k) => S.ch.rec[k]).length;
  const rsVal = (k, c) => selVal('rs_' + k + '_' + c);
  const rsAllSel = () => ['cn', 'ol', 'un'].every((k) => ['o', 'a', 'h'].every((c) => rsVal(k, c)));
  const rsRight = (k, c) => rsVal(k, c) === TRANS[k][c];

  /* =========================================================
     ④ 구분하기
     ========================================================= */
  const SOC = [
    { id: 'c1', label: '해당 과정에서 ATP 2 순생산', short: '해당 과정 순 ATP 2', icon: '🍬', col: '#16a34a', ans: 'sub', why: '해당 과정에서는 효소가 인산기를 기질에서 ADP로 직접 옮겨 ATP를 만들어요.' },
    { id: 'c2', label: 'TCA 회로의 ATP 1', short: 'TCA 회로의 ATP 1', icon: '🔄', col: '#8b5cf6', ans: 'sub', why: 'TCA 회로의 ATP 1도 기질의 고에너지 화합물에서 인산기를 직접 옮겨 만들어요.' },
    { id: 'c3', label: '막 사이 공간에 H⁺ 축적', short: '막 사이 H⁺ 축적', icon: '💧', col: '#d9822b', ans: 'ox', why: 'H⁺ 가 막 사이 공간에 쌓이는 것은 전자 전달로 펌프한 결과로, 산화적 인산화의 일부예요.' },
    { id: 'c4', label: 'ATP 합성 효소의 회전', short: '합성 효소 회전', icon: '🌀', col: '#e11d74', ans: 'ox', why: 'ATP 합성 효소가 H⁺ 의 흐름으로 도는 것은 화학 삼투예요.' },
    { id: 'c5', label: '산소 없는 근육이 해당 과정으로 얻는 ATP', short: '산소 없는 근육 ATP', icon: '🏃', col: '#0ea5e9', ans: 'sub', why: '산소가 없으면 전자 전달계가 멈춰서 해당 과정의 기질 수준 인산화로만 ATP를 얻어요.' },
    { id: 'c6', label: '시안화물 중독으로 ATP 급감', short: '시안화물 중독', icon: '☠️', col: '#dc2626', ans: 'ox', why: '시안화물은 전자 전달을 막아 산화적 인산화를 멈추게 해요.' },
    { id: 'c7', label: '효모가 발효할 때 얻는 ATP', short: '효모 발효 ATP', icon: '🍞', col: '#d97706', ans: 'sub', why: '발효에서도 ATP는 해당 과정의 기질 수준 인산화로 얻어요.' },
    { id: 'c8', label: '갈색 지방의 열 생산', short: '갈색 지방 열 생산', icon: '🔥', col: '#ea580c', ans: 'ox', why: '갈색 지방에서는 H⁺ 기울기를 열로 바꿔 쓰는 것으로, 산화적 인산화의 H⁺ 기울기가 쓰여요.' },
    { id: 'c9', label: '전자 전달계를 전자가 통과', short: '전자 전달계 통과', icon: '⚡', col: '#4f46e5', ans: 'ox', why: '전자가 전달계를 지나며 H⁺ 를 펌프하는 것이 산화적 인산화의 시작이에요.' },
    { id: 'c10', label: '산소가 H₂O 로 환원', short: '산소 → H₂O 환원', icon: '💦', col: '#0284c7', ans: 'ox', why: '전자의 최종 수용체인 산소가 H₂O 가 되는 것은 전자 전달계의 마지막 일이에요.' },
  ];
  S.so = { so: null, pick: null };
  function soG() {
    if (PHONE) {
      const bw = 226, boxes = [['sub', '기질 수준 인산화', '#16a34a'], ['ox', '산화적 인산화', '#e11d74']].map(([id, label, col], k) => ({ id, label, col, x: 10 + k * (bw + 8), y: 10, w: bw, h: 250, cols: 1, hdr: 30 }));
      return { boxes, cw: 226, ch: 44, kh: 28, tray: (i) => ({ x: 10 + (i % 2) * 234, y: 270 + Math.floor(i / 2) * 48 }), B: { x: 10, y: 516, w: 460, h: 114 } };
    }
    const bw = 380, boxes = [['sub', '기질 수준 인산화', '#16a34a'], ['ox', '산화적 인산화', '#e11d74']].map(([id, label, col], k) => ({ id, label, col, x: 14 + k * (bw + 12), y: 14, w: bw, h: 262, cols: 2, hdr: 34 }));
    return { boxes, cw: 146, ch: 58, kh: 38, tray: (i) => ({ x: 14 + (i % 5) * 156.5, y: 286 + Math.floor(i / 5) * 66 }), B: { x: 14, y: 422, w: 772, h: 124 } };
  }
  function soBuild() {
    const g = soG();
    S.so.so = new Sorter({ cards: SOC, boxes: g.boxes, tray: g.tray, cw: g.cw, ch: g.ch, kh: g.kh, onChange() { S.so.pick = null; updateCtl(); }, onTap(c) { S.so.pick = S.so.pick === c ? null : c; Sound.tick(); }, isSel: (c) => S.so.pick === c });
    S.so.so.cards.forEach((c, i) => { c.ans = SOC[i].ans; });
  }
  const soPT = {
    down(p) { const so = S.so.so; if (so.down(p)) return true; if (S.so.pick) { const bx = so.boxAt(p); if (bx) { const c = S.so.pick; S.so.pick = null; so.place(c, bx.id); } } return false; },
    move(p) { S.so.so.move(p); }, up(p) { S.so.so.up(p); }, hover(p) { return S.so.so.hover(p); },
  };
  const soWrong = () => S.so.so.cards.filter((c) => c.zone && c.zone !== c.ans);
  function soDraw(dt, t) {
    const so = S.so.so, g = soG(); so.update(dt); so.draw();
    const B = g.B; panel(B.x, B.y, B.w, B.h, 16, '#fff');
    T(B.x + 14, B.y + 24, '포도당 1분자의 ATP 수지 (약 32, 실제 세포는 약 30~32)', PHONE ? 12.5 : 14.5, '#1f2d44', 'left', 800);
    const bx = B.x + 18, bw = B.w - 36, by = B.y + (PHONE ? 40 : 38), bh = PHONE ? 30 : 32;
    D.roundRect(bx, by, bw, bh, 10); ctx.fillStyle = '#eef2f7'; ctx.fill();
    const w1 = bw * 4 / 32, w2 = bw * 28 / 32;
    D.roundRect(bx, by, w1, bh, 8); ctx.fillStyle = '#16a34a'; ctx.fill(); D.roundRect(bx + w1, by, w2, bh, 8); ctx.fillStyle = '#e11d74'; ctx.fill();
    T(bx + w1 + w2 / 2, by + bh * 0.68, '산화적 인산화 28 (87.5 %)', PHONE ? 13.5 : 16, '#fff', 'center', 800);
    T(bx + w1 / 2, by + bh + 18, '기질 수준 4', PHONE ? 12 : 13.5, '#166534', 'center', 800); T(bx + w1 / 2, by + bh + 34, '(12.5 %)', PHONE ? 12 : 13.5, '#166534', 'center', 800);
    if (!PHONE) T(bx + bw, by + bh + 26, '해당 순 2 + TCA 2 = 4  |  NADH 10 × 2.5 + FADH₂ 2 × 1.5 = 28', 13.5, '#475569', 'right', 700);
  }

  /* =========================================================
     화면 전환 · 조작 연결
     ========================================================= */
  const PTS = { sub: sbPT, grad: null, chemi: null, sort: soPT };
  function setMode(m) { if (S.mode !== m) S.fade = 1; S.mode = m; PT = PTS[m] || null; hideHint(); updateCtl(); }
  const ctlNodes = $$('#ctrlCard .control');
  S.sb.pickOn = false; S.ch.resOn = false;
  function updateCtl() {
    const fr = game ? game.free : false, lvNow = game ? game.level : 0, sb = S.sb, z = S.gr, c = S.ch;
    ctlNodes.forEach((n) => { n.hidden = (n.dataset.modes || '').split(' ').indexOf(S.mode) < 0; });
    $$('#ctrlCard [data-grp]').forEach((n) => { const k = n.dataset.grp; n.hidden = k === 'pick' ? !(sb.pickOn || fr) : k === 'res' ? !(c.resOn || fr) : false; });
    modeButtons(S.mode, lvNow, fr);
    chipSet($('#sbView'), sb.view);
    const left = sbN() - sbD(); $('#sbSend').disabled = sb.busy || !sb.tok || left <= 0 || !sb.tok.hasP;
    $('#sbSend').textContent = left <= 0 ? '✔ 이 단계 끝' : '🟧 인산기 ADP로 보내기';
    $('#sbNote').innerHTML = '인산기 전달 <b>' + sbD('glyc') + ' / 4</b> (해당 과정) · <b>' + sbD('tca') + ' / 2</b> (TCA 회로)';
    $$('#sbPick button').forEach((b) => b.classList.toggle('on', !!sb.pick[b.dataset.v]));
    $('#sbG').classList.toggle('ok', numIn('sbG') === 2); $('#sbT').classList.toggle('ok', numIn('sbT') === 2); $('#sbS').classList.toggle('ok', numIn('sbS') === 4);
    $('#oS').textContent = z.s; $('#sS').value = z.s; chipSet($('#grO2'), z.o2 ? 'on' : 'off');
    $('#grNote').innerHTML = 'ΔpH <b>' + z.g.toFixed(2) + '</b> · 농도비 약 <b>' + f1(ratioH(z.g)) + '배</b>' + (!z.o2 ? ' · 산소 없음 ' + Math.min(4, z.noO2T).toFixed(1) + ' / 4초' : '');
    chipSet($('#chTr'), c.tr);
    $('#chNote').innerHTML = '시험한 처리 <b>' + chRecN() + ' / 3</b> · 지금: <b>' + TRV[c.tr].name + '</b>' + (c.tr !== 'none' && !c.rec[c.tr] ? ' (측정 중…)' : '');
    ['cn', 'ol', 'un'].forEach((k) => ['o', 'a', 'h'].forEach((cc) => { const e = $('#rs_' + k + '_' + cc), v = rsVal(k, cc); e.classList.toggle('ok', !!v && rsRight(k, cc) && !!c.ack[k + cc + 'seen']); e.classList.toggle('bad', !!c.ack[k + cc]); }));
    const so = S.so.so; if (so) { const n = (z2) => so.cards.filter((q) => q.zone === z2).length; $('#soNote').innerHTML = '놓은 카드 <b>' + so.placed + ' / 10</b> · 기질 수준 ' + n('sub') + ' · 산화적 ' + n('ox'); }
  }
  bindModeSeg(setMode);
  $$('#sbView button').forEach((b) => b.addEventListener('click', () => { Sound.click(); sbSetView(b.dataset.v); }));
  $('#sbSend').addEventListener('click', () => sbSend());
  $('#sbReset').addEventListener('click', () => { Sound.click(); sbReset(); });
  $$('#sbPick button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.sb.pick[b.dataset.v] = !S.sb.pick[b.dataset.v]; S.sb.bad = false; updateCtl(); }));
  ['sbG', 'sbT', 'sbS'].forEach((id) => $('#' + id).addEventListener('input', updateCtl));
  $('#sS').addEventListener('input', (e) => { S.gr.s = +e.target.value; updateCtl(); });
  $$('#grO2 button').forEach((b) => b.addEventListener('click', () => { S.gr.o2 = b.dataset.v === 'on'; Sound.click(); updateCtl(); }));
  $('#grClr').addEventListener('click', () => { Sound.click(); grClear(); });
  $$('#chTr button').forEach((b) => b.addEventListener('click', () => chSet(b.dataset.v)));
  ['cn', 'ol', 'un'].forEach((k) => ['o', 'a', 'h'].forEach((cc) => $('#rs_' + k + '_' + cc).addEventListener('change', () => { S.ch.ack = {}; updateCtl(); })));
  $('#soReset').addEventListener('click', () => { Sound.click(); S.so.pick = null; S.so.so.reset(); });

  /* =========================================================
     미션
     ========================================================= */
  const levels = [
    {
      title: '기질 수준', short: '기질 수준', icon: '🧱', phase: '분석',
      intro: '<p class="si-q">❓ 탐구 질문: ATP를 만드는 방법에는 효소가 인산기를 직접 건네는 방법만 있을까? 미토콘드리아 막은 왜 꼭 필요할까?</p><p>🔗 <b>앞 차시에서</b> 포도당 1분자의 ATP는 직접 합성 4, 전자 전달계 28이라는 것을 계산했어요. ATP를 만드는 이 방법(<b>인산화</b>)에는 두 가지가 있어요. 먼저 <b>기질 수준 인산화</b>를 만나요.</p><p><b>효소</b>가 인산기(Ⓟ)를 가진 <b>고에너지 기질</b>에서 ADP로 인산기를 <b>직접</b> 옮겨 ATP를 만들어요. 해당 과정(총 생성 4, 순생산 2)과 TCA 회로(회로 1번에 1, 포도당 1분자당 2)에서 일어나고, <b>산소도 미토콘드리아 막도 필요 없어요</b>(해당 과정은 세포질).</p>',
      features: ['sub'],
      setup() { setMode('sub'); },
      recap: '기질 수준 인산화는 효소가 고에너지 기질의 인산기를 ADP에 직접 옮겨 ATP를 만드는 방법이에요. 해당 과정(순 2)과 TCA 회로(2)에서 일어나 포도당 1분자에서 합계 4 ATP를 만들고, 산소와 막이 필요 없어요.',
      summary: '<ul><li><b>기질 수준 인산화</b>: 효소가 <b>인산기를 가진 고에너지 기질</b>에서 ADP로 인산기를 <b>직접</b> 옮겨 ATP를 만들어요.</li><li>일어나는 곳: <b>해당 과정</b>(세포질)과 <b>TCA 회로</b>(기질). 포도당 1분자당 해당 과정은 총 생성 4 − 소비 2 = 순 <b>2</b>, TCA 회로는 1 × 2회전 = <b>2</b>, 합계 <b>4</b> ATP(약 12 %).</li><li><b>산소가 필요 없고</b> 미토콘드리아 막도 필요 없어요(해당 과정은 세포질에서 진행).</li></ul>',
      missions: [
        {
          id: 'glyc4', title: '인산기 전달 4번',
          goal: '<b>🍬 해당 과정</b>에서 주황색 Ⓟ 블록을 ADP로 옮겨 <b>인산기 전달 4번</b>을 해 보세요.',
          hint: 'Ⓟ 블록을 오른쪽 ADP 위로 끌어다 놓거나 블록을 눌러요. 고에너지 3탄소 화합물 2분자가 각각 2번씩 인산기를 건네서 모두 4번이에요.',
          setup() { setMode('sub'); S.sb.pickOn = false; sbReset('glyc'); },
          check: () => S.sb.done.glyc >= 4, hold: 0.8,
          status: () => mark(S.sb.done.glyc >= 4) + ' 인산기 전달 ' + S.sb.done.glyc + ' / 4',
          explain: '해당 과정에서는 효소가 고에너지 기질의 인산기를 ADP에 <b>직접</b> 옮겨 ATP를 <b>4개</b> 만들어요. 앞서 포도당을 활성화하는 데 ATP를 <b>2개 소비</b>했으니 순생산은 4 − 2 = <b>2</b>예요.',
        },
        {
          id: 'pick', title: '기질 수준 인산화 찾기', manual: true,
          goal: '<b>🔄 TCA 회로</b>에서도 인산기 전달 2번을 해 본 뒤, 기질 수준 인산화가 일어나는 <b>단계</b>를 모두 고르고 <b>해당 순생산 · TCA · 합계</b>를 입력하세요.',
          hint: 'TCA 회로 화면에서 Ⓟ 블록을 2번 옮겨요. 해당 과정 순생산은 생성 4 − 소비 2예요. 합계 = 해당 순생산 + TCA.',
          setup() { setMode('sub'); S.sb.pickOn = true; S.sb.pick = {}; S.sb.bad = false; ['sbG', 'sbT', 'sbS'].forEach((id) => { $('#' + id).value = ''; }); if (sbD('tca') < 2) { sbReset('tca'); } else sbSetView('tca'); updateCtl(); },
          check() {
            const sb = S.sb;
            if (sbD('glyc') < 4) return '먼저 🍬 해당 과정에서 인산기 전달 4번을 해 보세요. (' + sbD('glyc') + ' / 4)';
            if (sbD('tca') < 2) return '🔄 TCA 회로 화면에서 인산기 전달 2번을 해 보세요. (' + sbD('tca') + ' / 2)';
            const pk = Object.keys(sb.pick).filter((k) => sb.pick[k]);
            if (!pk.length) return '기질 수준 인산화가 일어나는 단계를 눌러 골라 주세요.';
            if (sb.pick.pyox || sb.pick.etc) return (sb.pick.pyox ? '피루브산 산화' : '전자 전달계') + '에서는 효소가 인산기를 직접 옮겨 ATP를 만들지 않아요. 다시 생각해 보세요.';
            if (!(sb.pick.glyc && sb.pick.tca)) return '인산기를 직접 옮겨 ATP를 만드는 단계가 더 있어요. (해당 과정, TCA 회로)';
            if (numIn('sbG') !== 2) return '해당 과정 순생산 = 총 생성 4 − 소비 2 예요.';
            if (numIn('sbT') !== 2) return 'TCA 회로는 회로 1번에 1개씩, 포도당 1분자당 2번 돌아요.';
            if (numIn('sbS') !== 4) return '합계 = 해당 과정 순생산 + TCA 회로예요.';
            return true;
          },
          explain: '기질 수준 인산화는 <b>해당 과정</b>(순 2)과 <b>TCA 회로</b>(2)에서 일어나 합계 <b>4</b> ATP예요. 피루브산 산화에서는 ATP가 직접 만들어지지 않고, 전자 전달계는 산화적 인산화예요.',
        },
        {
          type: 'quiz', title: '기질 수준 인산화의 조건',
          goal: '기질 수준 인산화에 대한 설명으로 옳은 것은?',
          setup() { setMode('sub'); },
          choices: ['산소가 있어야만 일어난다', '산소 없이도 일어나며 해당 과정은 미토콘드리아 밖(세포질)에서도 일어난다', '미토콘드리아 내막의 ATP 합성 효소가 H⁺ 흐름으로 만든다', '포도당 1분자에서 ATP의 대부분을 만든다'],
          answer: 1,
          feedback: ['기질 수준 인산화는 산소를 직접 쓰지 않아요.', '', '그것은 산화적 인산화(화학 삼투)예요.', '대부분(약 28)은 산화적 인산화에서 만들어지고 기질 수준은 4뿐이에요.'],
          explain: '인산기를 효소가 직접 옮기므로 <b>산소도, 막도 필요 없어요</b>. 해당 과정은 세포질에서 일어나요. 포도당 1분자에서 만드는 ATP는 4로 전체(약 32)의 12.5 %예요.',
        },
      ],
    },
    {
      title: 'H⁺ 기울기', short: 'H⁺ 기울기', icon: '🔋', phase: '모형',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 기질 수준으로 만든 ATP는 4뿐이었어요. 나머지 약 28 ATP는 NADH · FADH₂의 <b>전자</b>가 만들어요.</div><p>이것이 <b>산화적 인산화</b>예요. NADH가 내막의 <b>전자 전달계</b>(단백질 복합체)에 전자를 건네면, 전자가 복합체를 차례로 지나며 에너지를 방출하고 그 에너지로 <b>H⁺</b>가 기질에서 <b>막 사이 공간</b>으로 펌프돼요. 전자는 마지막에 <b>O₂</b>에 도착해 H₂O가 돼요. 복합체 Ⅰ~Ⅳ의 개별 반응이나 H⁺ 수는 다루지 않아요.</p><p>막 사이 공간은 약간 산성(pH 약 7.0), 기질은 pH 약 8.0이 되어 <b>H⁺ 농도 약 10배 차</b>(+ 전하 차)가 생겨요.</p>',
      features: ['grad'],
      setup() { setMode('grad'); },
      recap: '전자가 전자 전달계를 지나며 방출하는 에너지로 H⁺가 기질에서 막 사이 공간으로 펌프되어 H⁺ 농도 기울기(pH 약 7 대 8, 약 10배)가 생겨요. 산소가 없으면 전자가 갈 곳이 없어 흐름과 펌프가 멈춰요.',
      summary: '<ul><li><b>산화적 인산화의 1단계</b>: NADH · FADH₂의 전자가 내막의 전자 전달계(단백질 복합체)를 지나며 에너지를 방출하고, 이 에너지로 <b>H⁺를 기질 → 막 사이 공간</b>으로 펌프해요.</li><li>그 결과 막 사이 공간의 pH 약 7.0, 기질 약 8.0 → <b>H⁺ 농도 약 10배 차</b>(+ 전하 차)의 기울기가 생겨요.</li><li>전자의 <b>최종 수용체는 O₂</b>(H⁺와 결합해 H₂O). 산소가 없으면 전자가 갈 곳이 없어 흐름과 H⁺ 펌프가 멈춰요.</li></ul>',
      missions: [
        {
          id: 'grad', title: 'H⁺ 기울기 만들기',
          goal: 'NADH를 공급해 <b>ΔpH 0.8 이상</b>(농도비 약 6.3배 이상)의 H⁺ 기울기를 <b>1초 이상</b> 유지하세요.',
          hint: '산소가 있는 상태에서 NADH 공급 속도를 높이면 더 빨리 쌓여요. 전자가 복합체를 하나 지날 때마다 H⁺가 막 사이 공간으로 올라가요.',
          setup() { setMode('grad'); S.gr.s = 5; S.gr.o2 = true; grClear(); },
          check: () => S.gr.o2 && S.gr.g >= 0.8, hold: 1.0,
          status: () => mark(S.gr.g >= 0.8) + ' ΔpH ' + S.gr.g.toFixed(2) + ' / 0.80 &nbsp; ' + mark(S.gr.o2) + ' 산소 있음',
          explain: '전자가 복합체를 지날 때마다 H⁺가 <b>막 사이 공간</b>으로 펌프되어 쌓여요. ΔpH 0.8이면 H⁺ 농도가 기질보다 약 6.3배, ΔpH 1.0이면 약 10배예요.',
        },
        {
          id: 'noO2', title: '산소 없이 시험',
          goal: '<b>↺ 기울기 비우기</b>를 누르고 <b>산소를 없앤</b> 뒤, NADH를 공급해도 기울기가 생기지 않는 상태를 <b>4초</b> 동안 확인하세요.',
          hint: '먼저 기울기를 비우고 산소를 "없음"으로 바꿔요. 전자가 O₂에 도착하지 못하면 흐름이 멈춰서 H⁺ 펌프도 멈춰요. NADH 공급은 0이 아니어야 해요.',
          setup() { setMode('grad'); S.gr.s = 5; S.gr.o2 = true; grClear(); },
          check: () => S.gr.noO2T >= 4, hold: 0.4,
          status: () => mark(!S.gr.o2) + ' 산소 없음 &nbsp; ' + mark(S.gr.noO2T >= 4) + ' ' + Math.min(4, S.gr.noO2T).toFixed(1) + ' / 4초 (ΔpH ' + S.gr.g.toFixed(2) + ')',
          explain: '산소는 전자의 <b>최종 수용체</b>예요. 산소가 없으면 전자가 갈 곳이 없어 전달계 전체가 멈추고 H⁺ 펌프도 멈춰서 <b>기울기가 만들어지지 않아요</b>.',
        },
        {
          type: 'quiz', title: '전자의 도착지와 H⁺가 쌓이는 곳',
          goal: '전자 전달계에 대한 설명으로 옳은 것은?',
          setup() { setMode('grad'); },
          choices: ['전자의 최종 수용체는 산소이고, H⁺는 막 사이 공간에 쌓인다', '전자의 최종 수용체는 NADH이고, H⁺는 기질에 쌓인다', '전자의 최종 수용체는 산소이고, H⁺는 기질에 쌓인다', '전자의 최종 수용체는 포도당이고, H⁺는 막 사이 공간에 쌓인다'],
          answer: 0,
          feedback: ['', 'NADH는 전자를 주는 쪽(전자 운반체)이에요.', 'H⁺는 기질에서 막 사이 공간으로 펌프돼요.', '포도당은 전자의 출발점이에요.'],
          explain: '전자는 NADH → 복합체 → <b>O₂</b>로 가요. 에너지를 방출하며 H⁺를 <b>막 사이 공간</b>으로 펌프해서, 막 사이 공간의 H⁺ 농도가 높아져요.',
        },
      ],
    },
    {
      title: '화학 삼투', short: '화학 삼투', icon: '🌀', phase: '모형',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 전자 전달로 막 사이 공간에 H⁺ 기울기를 만들었어요(pH 약 7 대 8, 약 10배 차 + 전하 차). 이 기울기는 어디에 쓰일까요?</div><p><b>ATP 합성 효소</b>를 <b>수력 터빈</b>에 비유해요. 막 사이 공간의 H⁺가 농도 기울기를 따라 효소의 통로를 지나 기질로 흘러내릴 때 <b>회전자</b>가 돌며 ADP + Pi → ATP가 합성돼요. 이것이 <b>화학 삼투</b>예요.</p><p>세 가지 처리를 시험해요. <b>짝풀림제</b>(막이 H⁺를 새게 함), <b>올리고마이신</b>(효소 통로를 막음), <b>시안화물</b>(전자 전달을 막음).</p>',
      features: ['chemi'],
      setup() { setMode('chemi'); },
      recap: '막 사이 공간의 H⁺가 ATP 합성 효소를 지나 기질로 흘러내릴 때 효소가 돌며 ATP가 합성돼요(화학 삼투). 짝풀림제는 기울기를 없애 ATP 합성을 줄이고 열을 늘리며, 올리고마이신은 통로를, 시안화물은 전자 전달을 막아 ATP 합성을 멈춰요.',
      summary: '<ul><li><b>화학 삼투</b>: H⁺가 농도 기울기를 따라 ATP 합성 효소의 통로를 지나 막 사이 공간 → 기질로 흐르며 효소가 돌고 ADP + Pi → ATP가 합성돼요. ATP 합성에 필요한 힘은 <b>H⁺ 농도 기울기</b>예요.</li><li>가상 측정(상대값, 산소 소비 / ATP 합성 / 열): 처리 없음 100 / 100 / 보통, 시안화물 0 / 0 / 낮음, 올리고마이신 30 / 0 / 낮음, 짝풀림제 180 / 20 / 높음.</li><li><b>짝풀림제</b>(예: DNP, 갈색 지방의 짝풀림 단백질): 막이 H⁺를 새게 해 기울기가 사라져요. 산소 소비는 오히려 늘고 ATP 합성은 줄며, 에너지가 <b>열</b>로 나와 체온이 올라요.</li></ul>',
      missions: [
        {
          id: 'three', title: '세 가지 처리 시험',
          goal: '<b>짝풀림제 · 올리고마이신 · 시안화물</b>을 하나씩 처리하고, 값이 안정될 때까지 기다려 <b>측정 결과표</b>를 채우세요.',
          hint: '처리 버튼을 누르고 게이지가 멈출 때까지 1~2초 기다리면 오른쪽 결과표에 값이 기록돼요. 셋 모두 해야 해요.',
          setup() { setMode('chemi'); S.ch.resOn = false; chReset(); },
          check: () => chRecN() === 3, hold: 0.4,
          status: () => mark(S.ch.rec.un) + ' 짝풀림제 &nbsp; ' + mark(S.ch.rec.ol) + ' 올리고마이신 &nbsp; ' + mark(S.ch.rec.cn) + ' 시안화물',
          explain: '처리 없음 100 / 100 / 보통 → <b>시안화물</b> 0 / 0 / 낮음, <b>올리고마이신</b> 30 / 0 / 낮음, <b>짝풀림제</b> 180 / 20 / 높음이에요. 처리마다 어느 단계를 막거나 새게 했는지에 따라 달라져요.',
        },
        {
          id: 'table', title: '결과표 완성하기', manual: true,
          goal: '측정 결과를 보고 <b>정상(처리 없음)과 비교한 변화</b>(증가 · 감소 · 없음)를 9칸 모두 골라 결과표를 완성하세요.',
          hint: '오른쪽 결과표의 값을 100(처리 없음)과 비교해요. 0 근처는 "없음", 100보다 작으면 "감소", 크면 "증가"예요. 열은 낮음 → 감소, 높음 → 증가예요.',
          setup() { setMode('chemi'); S.ch.resOn = true; S.ch.ack = {}; ['cn', 'ol', 'un'].forEach((k) => ['o', 'a', 'h'].forEach((cc) => { $('#rs_' + k + '_' + cc).value = ''; })); updateCtl(); },
          check() {
            if (chRecN() < 3) return '먼저 세 가지 처리를 모두 시험해 표를 채워 주세요.';
            const miss = ['cn', 'ol', 'un'].reduce((n, k) => n + ['o', 'a', 'h'].filter((cc) => !rsVal(k, cc)).length, 0);
            if (miss) return '9칸을 모두 골라 주세요. (' + (9 - miss) + ' / 9)';
            const ack = {}; let first = null;
            ['cn', 'ol', 'un'].forEach((k) => ['o', 'a', 'h'].forEach((cc) => { if (!rsRight(k, cc)) { ack[k + cc] = true; if (!first) first = [k, cc]; } else ack[k + cc + 'seen'] = true; }));
            if (JSON.stringify(ack) !== JSON.stringify(S.ch.ack)) { S.ch.ack = ack; updateCtl(); }
            if (first) return '빨간 칸이 아직 달라요. ' + TRV[first[0]].name + '의 ' + ({ o: '산소 소비', a: 'ATP 합성', h: '열 발생' })[first[1]] + ' 값을 100과 비교해 보세요.';
            return true;
          },
          explain: '<b>시안화물</b>: 산소 소비 · ATP 합성 없음(0), 열 감소. <b>올리고마이신</b>: 통로가 막혀 H⁺가 쌓이고 전자 전달도 느려져 산소 소비 감소, ATP 합성 없음. <b>짝풀림제</b>: 기울기가 사라져 산소 소비 증가, ATP 합성 감소, 열 증가예요.',
        },
        {
          type: 'quiz', title: '짝풀림제와 체온',
          goal: '짝풀림제를 쓰면 <b>체온이 오르는</b> 까닭은?',
          setup() { setMode('chemi'); },
          choices: ['H⁺ 기울기에 담긴 에너지가 ATP 합성 대신 열로 방출되기 때문이다', 'ATP 합성이 늘어나기 때문이다', '전자 전달이 멈추기 때문이다', '산소 소비가 줄어들기 때문이다'],
          answer: 0,
          feedback: ['', '짝풀림제는 ATP 합성을 오히려 줄여요.', '전자 전달은 멈추지 않고 오히려 빨라져요.', '산소 소비는 늘어나요.'],
          explain: '짝풀림제는 막이 H⁺를 새게 해서 <b>기울기의 에너지가 ATP 대신 열</b>로 나와요. 산소 소비는 늘고 ATP 합성은 줄어요. 갈색 지방의 짝풀림 단백질도 같은 원리로 열을 만들어요.',
        },
      ],
    },
    {
      title: '구분하기', short: '구분하기', icon: '🗂', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 두 가지 인산화를 모두 만났어요. <b>기질 수준 인산화</b>는 효소가 인산기를 직접 옮기고, <b>산화적 인산화</b>는 전자 전달로 만든 H⁺ 기울기(화학 삼투)를 이용해요.</div><p>사례 카드 10장을 두 상자로 나누고, 포도당 1분자에서 두 방법이 만드는 ATP의 몫을 비교해요. (광합성의 광인산화는 뒤의 차시에서 비교해요.)</p>',
      features: ['sort'],
      setup() { setMode('sort'); },
      recap: '포도당 1분자에서 기질 수준 인산화는 약 4 ATP(12.5 %), 산화적 인산화는 약 28 ATP(87.5 %)를 만들어요. 산소가 없는 환경에서 ATP를 만들 수 있는 인산화는 기질 수준 인산화예요.',
      summary: '<ul><li><b>기질 수준 인산화</b>: 효소가 인산기를 직접 옮김. 해당 과정 · TCA 회로. 산소와 막이 필요 없어요. 발효와 산소 없는 근육의 ATP도 이 방식이에요.</li><li><b>산화적 인산화</b>: NADH · FADH₂의 전자 → 전자 전달계 → H⁺ 펌프 → H⁺ 기울기 → ATP 합성 효소(화학 삼투). 전자의 최종 수용체는 O₂, 산소가 없으면 멈춰요.</li><li>ATP 수지: 기질 수준 약 <b>4</b>(12.5 %) + 산화적 약 <b>28</b>(87.5 %) = 약 <b>32</b> (실제 세포는 약 30~32).</li></ul>',
      missions: [
        {
          id: 'sort', title: '사례 10개 분류', manual: true,
          goal: '사례 카드 10장을 <b>기질 수준 인산화</b>와 <b>산화적 인산화</b> 상자로 나누어 놓으세요.',
          hint: '인산기를 효소가 직접 옮기면 기질 수준, H⁺ 기울기 · 전자 전달 · 산소 환원이면 산화적이에요. 산소 없이도 얻는 ATP는 기질 수준이에요.',
          setup() { setMode('sort'); S.so.pick = null; S.so.so.reset(); },
          check() {
            const so = S.so.so; if (so.placed < 10) return '카드 10장을 모두 상자에 놓아 주세요. (' + so.placed + ' / 10)';
            const wr = soWrong(); so.markBad(wr.map((c) => c.id));
            if (wr.length) return '빨간 카드가 아직 달라요. ' + SOC.find((q) => q.id === wr[0].id).why;
            return true;
          },
          explain: '<b>기질 수준</b>: 해당 과정 순 2, TCA 회로 1, 산소 없는 근육의 ATP, 효모 발효의 ATP. <b>산화적</b>: 막 사이 공간 H⁺ 축적, ATP 합성 효소 회전, 시안화물 중독, 갈색 지방 열 생산, 전자 전달계 통과, 산소의 H₂O 환원이에요.',
        },
        {
          type: 'quiz', title: '화학 삼투란?',
          goal: '<b>화학 삼투</b>를 가장 알맞게 설명한 것은?',
          setup() { setMode('sort'); },
          choices: ['H⁺의 농도 기울기를 이용해 ATP를 합성하는 것', '효소가 인산기를 기질에서 ADP로 직접 옮기는 것', '물이 반투과성 막을 지나 이동하는 것', '전자가 산소에서 NADH로 이동하는 것'],
          answer: 0,
          feedback: ['', '그것은 기질 수준 인산화예요.', '그것은 삼투예요. 화학 삼투는 H⁺ 기울기로 ATP를 만드는 거예요.', '전자는 NADH에서 산소로 이동해요.'],
          explain: '<b>화학 삼투</b>는 전자 전달로 만든 <b>H⁺ 농도 기울기</b>를 이용해 ATP 합성 효소가 ATP를 만드는 것이에요. 산소가 없는 환경에서는 전자 전달이 멈추므로 기질 수준 인산화만 ATP를 만들 수 있어요.',
        },
      ],
    },
  ];

  sbReset('glyc'); soBuild(); chReset(); grClear();
  game = SciSim.game({
    simId: 'hy-phosphorylation', mount: '#game', badge: '인산화 탐정', homeHref: '../../index.html#hy',
    featureLabels: { sub: '🧱 인산기 블록 조작', grad: '🔋 H⁺ 기울기 모형', chemi: '🌀 화학 삼투 터빈', sort: '🗂 인산화 사례 분류' },
    onFeatures() { updateCtl(); },
    levels,
  });

  function readouts() {
    const m = S.mode;
    if (m === 'sub') { const full = sbD('glyc') === 4 && sbD('tca') === 2; setReads(['해당 과정 인산기 전달', sbD('glyc') + ' / 4', 'TCA 회로 인산기 전달', sbD('tca') + ' / 2', '기질 수준 ATP (순)', full ? '2 + 2 = 4' : '?']); }
    else if (m === 'grad') setReads(['ΔpH', S.gr.g.toFixed(2), 'H⁺ 농도비', '약 ' + f1(ratioH(S.gr.g)) + '배', '전자 · 산소', S.gr.o2 ? '흐름 있음' : '막힘']);
    else if (m === 'chemi') setReads(['처리', TRV[S.ch.tr].name, '산소 소비', fi(S.ch.o2.v), 'ATP 합성', fi(S.ch.atp.v)]);
    else { const so = S.so.so, n = (z) => so.cards.filter((q) => q.zone === z).length; setReads(['놓은 카드', so.placed + ' / 10', '기질 수준', n('sub') + '장', '산화적', n('ox') + '장']); }
  }

  setMode('sub');
  let lastFree = false, lastLv = -1, uiT = 0;
  SciSim.loop((dt, t) => {
    clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (game && game.level !== lastLv) { lastLv = game.level; updateCtl(); }
    view.apply(); FX.update(dt); ctx.clearRect(0, 0, VW, VH);
    bgFill('#f3f6ee', '#e8eee2');
    updLater(dt);
    if (S.mode !== 'grad') { if (S.gr.o2 !== undefined) S.gr.g = clamp(S.gr.g - 0.02 * S.gr.g * dt, 0, 1); }
    if (S.mode === 'sub') sbDraw(dt, t); else if (S.mode === 'grad') grDraw(dt, t); else if (S.mode === 'chemi') chDraw(dt, t); else soDraw(dt, t);
    FX.draw(); parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(241,246,243,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : approach(S.fade, 0, dt, 9); }
    uiT += dt; if (uiT > 0.25 && (S.mode === 'grad' || S.mode === 'chemi')) { uiT = 0; updateCtl(); }
    readouts();
  });

  window.__sim = { S, VW, VH, PHONE, get game() { return game; }, levels, setMode, sbSend, sbReset, sbSetView, sbG, grClear, chSet, chReset, TRV, SOC, soG, updateCtl, memG, chGeo };
})();
