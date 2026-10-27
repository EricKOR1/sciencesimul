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
     고등학교 세포와 물질대사 · Ⅱ. 물질대사와 에너지 - 효소 저해와 조절 (단원 57, 6차시)
     성취기준 [12세포02-04] 효소의 작용 기작을 이해하고, 생명체 내에서 일어나는 효소 작용의 중요성에 대해 다양한 매체를 활용하여 협력적으로 소통할 수 있다.
     ① 실험: 저해제 실험  ② 모형: 저해 모형  ③ 모형: 되먹임 조절  ④ 적용: 효소의 중요성
     ========================================================= */
  const S = { mode: 'assay', fade: 0, grp: 'none' };
  let game = null;
  const fi = (v) => String(Math.round(v));
  const SL = [1, 2, 4, 8, 16, 32];
  const DATA = { none: [33, 50, 67, 80, 89, 94], A: [14, 25, 40, 57, 73, 84], B: [17, 25, 33, 40, 44, 47] };
  const CN = { none: '저해제 없음', A: '저해제 A', B: '저해제 B' };
  const CCOL = { none: '#64748b', A: '#ef4444', B: '#8b5cf6' };
  const rateModel = (type, s) => (type === 'none' ? Math.round(100 * s / (s + 2)) : type === 'comp' ? Math.round(100 * s / (s + 6)) : Math.round(50 * s / (s + 2)));
  // 표의 자료가 식과 같은지 확인
  ['none', 'comp', 'non'].forEach((ty, i) => { const k = ['none', 'A', 'B'][i]; SL.forEach((s, j) => { if (rateModel(ty, s) !== DATA[k][j]) console.error('data mismatch', ty, s); }); });

  /* =========================================================
     ① 저해제 실험
     ========================================================= */
  S.as = { cond: 'none', idx: 3, pts: { none: {}, A: {}, B: {} }, flies: [], pulse: 0 };
  const asG = () => (PHONE
    ? { Gp: { x: 10, y: 10, w: 460, h: 130 }, Gr: { x: 10, y: 148, w: 460, h: 240 }, Tb: { x: 10, y: 396, w: 460, h: 236 } }
    : { Gp: { x: 546, y: 14, w: 240, h: 350 }, Gr: { x: 14, y: 14, w: 520, h: 350 }, Tb: { x: 14, y: 372, w: 772, h: 174 } });
  const asCount = (c) => Object.keys(S.as.pts[c]).length;
  const asTotal = () => asCount('none') + asCount('A') + asCount('B');
  const asPlot = () => mkPlot(asG().Gr, { x0: 0, x1: 32, y0: 0, y1: 110, xt: [0, 8, 16, 24, 32], yt: [0, 25, 50, 75, 100], xl: '기질 농도 [S] (mM)', yl: '', m: PHONE ? { l: 40, t: 34, r: 14, b: 40 } : { l: 46, t: 46, r: 16, b: 46 } });
  function asMeasure(cond, idx) {
    const a = S.as, c = cond || a.cond, i = idx == null ? a.idx : idx, v = DATA[c][i], g = asG();
    a.pts[c][i] = v; a.pulse = 1; Sound.tick();
    const pl = asPlot(), p = { x: g.Gp.x + g.Gp.w / 2, y: g.Gp.y + g.Gp.h / 2, c, i, shown: false };
    a.flies.push(p);
    const tx = pl.X(SL[i]), ty = pl.Y(v);
    if (RM) { p.x = tx; p.y = ty; p.shown = true; } else SciSim.tween(p, { x: tx, y: ty }, { duration: 0.6, ease: 'inOutCubic', onDone: () => { p.shown = true; parts.burst(tx, ty, { count: 6, colors: [CCOL[c], '#fff'], speed: 60, life: 0.45, gravity: 0 }); updateCtl(); } });
    updateCtl();
  }
  function asAll() { for (let i = 0; i < 6; i++) { const c = S.as.cond; if (i === 0) asMeasure(c, i); else after(RM ? 0.01 : i * 0.14, () => asMeasure(c, i)); } }
  function asClear() { const a = S.as; clearLater(); a.pts = { none: {}, A: {}, B: {} }; a.flies.length = 0; updateCtl(); }
  const asDone = (c) => Object.keys(S.as.pts[c]).filter((i) => S.as.flies.every((f) => f.c !== c || f.i !== +i || f.shown)).length;
  function asDraw(dt, t) {
    const a = S.as, g = asG(), cond = a.cond, v = DATA[cond][a.idx], sv = SL[a.idx]; a.pulse = approach(a.pulse, 0, dt, 3);
    // ---- 시험관 ----
    const Gp = g.Gp; panel(Gp.x, Gp.y, Gp.w, Gp.h, 18, '#fbfdff');
    T(Gp.x + 14, Gp.y + 26, '지금 시험관', L(16, 14), '#1f2d44', 'left', 800);
    const tx = PHONE ? Gp.x + 56 : Gp.x + 62, ty = Gp.y + (PHONE ? 38 : 50), th = PHONE ? 62 : 168, tw = PHONE ? 38 : 72;
    D.testTube(tx, ty, tw, th, { liquid: cond === 'none' ? '#bfe3f7' : cond === 'A' ? '#fbb6b6' : '#d4c3f7', level: 0.7 });
    ctx.save(); ctx.beginPath(); ctx.rect(tx - tw / 2 + 3, ty + th * 0.3, tw - 6, th * 0.68); ctx.clip();
    const rnd = mulberry(7 + a.idx); const nS = [2, 3, 4, 6, 8, 10][a.idx], nI = cond === 'A' ? 5 : cond === 'B' ? 4 : 0;
    for (let k = 0; k < nS; k++) D.sphere(tx - tw * 0.35 + rnd() * tw * 0.7, ty + th * 0.4 + rnd() * th * 0.5 + Math.sin(t * 2 + k) * 2, L(5, 3.8), '#34d399', { gloss: false });
    for (let k = 0; k < nI; k++) { const x = tx - tw * 0.35 + rnd() * tw * 0.7, y = ty + th * 0.4 + rnd() * th * 0.5 + Math.cos(t * 2 + k) * 2; { ctx.fillStyle = CCOL[cond]; ctx.save(); ctx.translate(x, y); ctx.rotate(0.6); ctx.fillRect(-L(4, 3), -L(4, 3), L(8, 6), L(8, 6)); ctx.restore(); } }
    ctx.restore();
    const gx = PHONE ? Gp.x + 108 : Gp.x + 14, gy = PHONE ? Gp.y + 34 : Gp.y + 234;
    T(gx, gy + (PHONE ? 4 : 16), CN[cond], L(17, 15), CCOL[cond], 'left', 800);
    T(gx, gy + (PHONE ? 26 : 40), '[S] = ' + sv + ' mM', L(16, 14), '#1f2d44', 'left', 800);
    const bw = Gp.w - (gx - Gp.x) - 14, by = gy + (PHONE ? 38 : 58);
    D.roundRect(gx, by, bw, 18, 9); ctx.fillStyle = '#eef2f7'; ctx.fill(); D.roundRect(gx, by, Math.max(18, bw * v / 100), 18, 9); ctx.fillStyle = CCOL[cond]; ctx.fill();
    T(gx, by + L(40, 38), '속도 ' + v + ' μmol/분', L(18, 15), '#1f2d44', 'left', 800);
    if (a.pulse > 0.05) D.ring(gx + bw * v / 100, by + 9, 14 * (1 - a.pulse * 0.4), t, { color: CCOL[cond] });
    // ---- 그래프 ----
    const Gr = g.Gr; panel(Gr.x, Gr.y, Gr.w, Gr.h, 18, '#fff');
    T(Gr.x + 14, Gr.y + 26, '반응 속도 (μmol/분)', L(16, 14), '#1f2d44', 'left', 800);
    const pl = asPlot(); drawAxes(pl);
    ['none', 'A', 'B'].forEach((c, k) => { const lx = Gr.x + Gr.w - (PHONE ? 250 : 270) + k * (PHONE ? 80 : 88); D.sphere(lx, Gr.y + 22, 6, CCOL[c], { gloss: false }); T(lx + 10, Gr.y + 27, c === 'none' ? '없음' : c, 13, '#475569', 'left', 800); });
    ['none', 'A', 'B'].forEach((c) => {
      const ids = Object.keys(a.pts[c]).map(Number).filter((i) => a.flies.every((f) => f.c !== c || f.i !== i || f.shown)).sort((p, q) => p - q);
      if (ids.length > 1) { ctx.save(); ctx.strokeStyle = CCOL[c]; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.beginPath(); ids.forEach((i, j) => { const x = pl.X(SL[i]), y = pl.Y(a.pts[c][i]); if (j) ctx.lineTo(x, y); else ctx.moveTo(x, y); }); ctx.stroke(); ctx.restore(); }
      ids.forEach((i) => D.sphere(pl.X(SL[i]), pl.Y(a.pts[c][i]), 6, CCOL[c], { gloss: true }));
    });
    D.ring(pl.X(sv), pl.Y(v), 9, t, { color: CCOL[cond], width: 2 });
    a.flies.forEach((f) => { if (!f.shown) D.sphere(f.x, f.y, 7, CCOL[f.c], { gloss: true, shadow: true }); });
    // ---- 표 ----
    const Tb = g.Tb; panel(Tb.x, Tb.y, Tb.w, Tb.h, 18, '#fff');
    const lab0 = Tb.x + 14, c0 = Tb.x + (PHONE ? 112 : 170), cw = (Tb.x + Tb.w - 14 - c0) / 6;
    T(lab0, Tb.y + L(34, 32), '[S] (mM)', L(14.5, 12.5), '#475569', 'left', 800);
    SL.forEach((s, i) => { const x = c0 + cw * (i + 0.5); if (i === a.idx) { D.roundRect(x - cw / 2 + 2, Tb.y + 10, cw - 4, Tb.h - 20, 8); ctx.fillStyle = 'rgba(245,158,11,.14)'; ctx.fill(); } T(x, Tb.y + L(34, 32), String(s), L(15, 13), '#1f2d44', 'center', 800); });
    ['none', 'A', 'B'].forEach((c, ri) => {
      const y = Tb.y + L(74, 74) + ri * L(38, 50);
      T(lab0, y, CN[c], L(14.5, 12.5), CCOL[c], 'left', 800);
      SL.forEach((s, i) => { const x = c0 + cw * (i + 0.5), val = a.pts[c][i], done = val != null && a.flies.every((f) => f.c !== c || f.i !== i || f.shown); T(x, y, done ? String(val) : '·', L(16, 14), done ? CCOL[c] : '#cbd5e1', 'center', 800); });
    });
  }

  /* =========================================================
     ② 저해 모형 (경쟁적 / 비경쟁적)
     ========================================================= */
  const SMD = [2, 3, 5, 7, 10, 14];
  S.md = { type: 'comp', idx: 2, enz: [], sp: [], ip: [], fly: [], prods: [], flags: { compLow: false, compHigh: false, nonHigh: false }, nProd: 0 };
  const mdG = () => (PHONE
    ? { Bx: { x: 10, y: 10, w: 460, h: 336 }, Br: { x: 10, y: 354, w: 460, h: 278 }, ex: [84, 240, 396], ey: 268, rx: 46, ry: 37, y0: 74, y1: 190 }
    : { Bx: { x: 14, y: 14, w: 772, h: 356 }, Br: { x: 14, y: 378, w: 772, h: 168 }, ex: [150, 400, 650], ey: 282, rx: 66, ry: 52, y0: 86, y1: 176 });
  const mdSite = (e) => { const g = mdG(); return { x: e.x, y: e.y - g.ry * 0.78 }; };
  const mdAllo = (e) => { const g = mdG(); return { x: e.x + g.rx * 0.9, y: e.y - g.ry * 0.1 }; };
  function mdInit() {
    const m = S.md, g = mdG(); m.enz = g.ex.map((x, i) => ({ x, y: g.ey, st: 0, t: 0.4 + i * 0.35, prod: false, nc: 0, nct: 1 + i, dist: 0, doc: null, ncdoc: null }));
    m.sp = []; m.ip = []; m.fly = []; m.prods = [];
  }
  function mdReset() { const m = S.md; mdInit(); m.nProd = 0; }
  function mdPick(list, x, y) { let bi = -1, bd = 1e9; list.forEach((q, i) => { if (q.die) return; const d = Math.hypot(q.x - x, q.y - y); if (d < bd) { bd = d; bi = i; } }); return bi; }
  function mdFly(kind, from, to, cb) { const f = { kind, x: from.x, y: from.y, sx: from.x, sy: from.y, tx: to.x, ty: to.y, t: 0, dur: RM ? 0.01 : 0.4, cb }; S.md.fly.push(f); }
  function mdBindS(e) {
    const m = S.md, st = mdSite(e), i = mdPick(m.sp, st.x, st.y); let from = { x: st.x, y: st.y - 60 };
    if (i >= 0) { const q = m.sp.splice(i, 1)[0]; from = { x: q.x, y: q.y }; }
    e.st = 1; e.doc = { arrived: false }; mdFly('S', from, st, () => { e.doc.arrived = true; });
  }
  function mdBindI(e) {
    const m = S.md, st = mdSite(e), i = mdPick(m.ip, st.x, st.y); let from = { x: st.x, y: st.y - 60 };
    if (i >= 0) { const q = m.ip.splice(i, 1)[0]; from = { x: q.x, y: q.y }; }
    e.st = 2; e.doc = { arrived: false }; mdFly('I', from, st, () => { e.doc.arrived = true; });
  }
  function mdRelease(e, productive) {
    const m = S.md, st = mdSite(e), g = mdG();
    if (e.st === 1 && productive) {
      m.nProd++; Sound.tick();
      m.prods.push({ x: st.x, y: st.y, vx: -34, vy: -50, t: 0, c: '#fb923c' }, { x: st.x, y: st.y, vx: 34, vy: -50, t: 0, c: '#f97316' });
    } else if (e.st === 1) m.sp.push({ x: st.x, y: st.y - 8, vx: (Math.random() - 0.5) * 40, vy: -40, a: 0.6, die: false });
    else m.ip.push({ x: st.x, y: st.y - 8, vx: (Math.random() - 0.5) * 40, vy: -40, a: 0.6, die: false });
    e.st = 0; e.doc = null;
  }
  function mdUpdate(dt) {
    const m = S.md, g = mdG(), sv = SL[S.md.idx], B = g.Bx;
    const nS = SMD[m.idx], nI = m.type === 'comp' ? 6 : m.type === 'non' ? 4 : 0;
    const fr = { x0: B.x + 18, x1: B.x + B.w - 18, y0: B.y + g.y0 - B.y + 0, y1: g.y1 };
    fr.y0 = g.y0; 
    const keep = (list, kind) => {
      const tn = kind === 'S' ? nS : nI;
      while (list.filter((q) => !q.die).length < tn) list.push({ x: lerp(fr.x0, fr.x1, Math.random()), y: lerp(fr.y0, fr.y1, Math.random()), vx: (Math.random() - 0.5) * 50, vy: (Math.random() - 0.5) * 50, a: 0, die: false });
      const live = list.filter((q) => !q.die); if (live.length > tn) for (let i = 0; i < live.length - tn; i++) live[i].die = true;
      for (let i = list.length - 1; i >= 0; i--) {
        const q = list[i]; q.a = q.die ? q.a - dt * 2.5 : Math.min(1, q.a + dt * 2.5); if (q.a < 0) { list.splice(i, 1); continue; }
        q.vx += (Math.random() - 0.5) * 140 * dt; q.vy += (Math.random() - 0.5) * 140 * dt; const sp = Math.hypot(q.vx, q.vy); if (sp > 70) { q.vx *= 70 / sp; q.vy *= 70 / sp; }
        q.x += q.vx * dt; q.y += q.vy * dt;
        if (q.x < fr.x0) { q.x = fr.x0; q.vx = Math.abs(q.vx); } if (q.x > fr.x1) { q.x = fr.x1; q.vx = -Math.abs(q.vx); }
        if (q.y < fr.y0) { q.y = fr.y0; q.vy = Math.abs(q.vy); } if (q.y > fr.y1) { q.y = fr.y1; q.vy = -Math.abs(q.vy); }
      }
    };
    keep(m.sp, 'S'); keep(m.ip, 'I');
    const tauB = 1.0;
    m.enz.forEach((e) => {
      e.dist = approach(e.dist, e.nc ? 1 : 0, dt, 7);
      e.t -= dt;
      if (e.t <= 0) {
        if (e.st === 0) {
          if (m.type === 'comp') { const a = (sv / 2) / (sv / 2 + 2); if (Math.random() < a) mdBindS(e); else mdBindI(e); }
          else mdBindS(e);
          e.t = tauB * (0.8 + Math.random() * 0.4);
        } else {
          const prod = e.st === 1 && !(m.type === 'non' && e.nc);
          mdRelease(e, prod);
          const tauE = m.type === 'comp' ? tauB / (sv / 2 + 2) : 2 * tauB / sv;
          e.t = tauE * (0.5 + Math.random());
        }
      }
      if (m.type === 'non') {
        e.nct -= dt;
        if (e.nct <= 0) {
          const a = mdAllo(e);
          if (!e.nc) { e.nc = 1; const i = mdPick(m.ip, a.x, a.y); let from = { x: a.x + 40, y: a.y - 60 }; if (i >= 0) { const q = m.ip.splice(i, 1)[0]; from = { x: q.x, y: q.y }; } e.ncdoc = { arrived: false }; mdFly('N', from, a, () => { if (e.ncdoc) e.ncdoc.arrived = true; }); }
          else { e.nc = 0; e.ncdoc = null; m.ip.push({ x: a.x, y: a.y - 8, vx: 30, vy: -40, a: 0.6, die: false }); }
          e.nct = 1.2 + Math.random() * 1.6;
        }
      } else if (e.nc) { e.nc = 0; if (e.ncdoc) { const a = mdAllo(e); m.ip.push({ x: a.x, y: a.y - 8, vx: 30, vy: -40, a: 0.6, die: false }); } e.ncdoc = null; }
    });
    for (let i = m.fly.length - 1; i >= 0; i--) { const f = m.fly[i]; f.t += dt; const p = clamp(f.t / f.dur, 0, 1), e2 = SciSim.ease.inOutCubic(p); f.x = f.sx + (f.tx - f.sx) * e2; f.y = f.sy + (f.ty - f.sy) * e2 - Math.sin(p * Math.PI) * 14; if (p >= 1) { m.fly.splice(i, 1); f.cb && f.cb(); } }
    for (let i = m.prods.length - 1; i >= 0; i--) { const q = m.prods[i]; q.t += dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 40 * dt; if (q.t > 0.9) m.prods.splice(i, 1); }
    // 시험 기록
    const v = rateModel(m.type, sv);
    if (m.type === 'comp' && m.idx <= 1) m.flags.compLow = true;
    if (m.type === 'comp' && m.idx >= 4) m.flags.compHigh = true;
    if (m.type === 'non' && m.idx >= 4) m.flags.nonHigh = true;
  }
  function mdEnzyme(e, t) {
    const g = mdG(), d = e.dist, rx = g.rx * (1 + 0.1 * d), ry = g.ry * (1 - 0.14 * d);
    const col = e.st === 2 ? '#94a3b8' : d > 0.5 ? '#7dd3fc' : '#38bdf8';
    D.shadow(() => { ctx.beginPath(); ctx.ellipse(e.x, e.y, rx, ry, 0, 0, TAU); const gr = ctx.createRadialGradient(e.x - rx * 0.3, e.y - ry * 0.5, 6, e.x, e.y, rx); gr.addColorStop(0, C.shade(col, 0.5)); gr.addColorStop(0.6, col); gr.addColorStop(1, C.shade(col, -0.3)); ctx.fillStyle = gr; ctx.fill(); }, { blur: 10, y: 3 });
    // 활성 부위 (홈)
    const st = mdSite(e), sr = (PHONE ? 13 : 19) * (1 - 0.35 * d);
    ctx.fillStyle = C.shade('#38bdf8', -0.55); ctx.beginPath(); ctx.arc(st.x, st.y + sr * 0.6, sr, 0, TAU); ctx.fill();
    if (d > 0.5) { ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 2; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.arc(st.x, st.y + sr * 0.6, sr + 2, 0, TAU); ctx.stroke(); ctx.setLineDash([]); }
    // 조절 부위 (활성 부위가 아닌 곳)
    const a = mdAllo(e); ctx.fillStyle = C.shade('#38bdf8', -0.35); ctx.beginPath(); ctx.arc(a.x, a.y, PHONE ? 7 : 10, 0, TAU); ctx.fill();
    T(e.x - rx * 0.1, e.y + ry * 0.32, 'E', L(34, 24), 'rgba(255,255,255,.85)', 'center', 800);
  }
  function mdDraw(dt, t) {
    mdUpdate(dt);
    const m = S.md, g = mdG(), B = g.Bx, sv = SL[m.idx], v = rateModel(m.type, sv), vb = rateModel('none', sv);
    panel(B.x, B.y, B.w, B.h, 18, '#f7fbff');
    ctx.save(); D.roundRect(B.x + 8, B.y + 46, B.w - 16, B.h - 54, 12); ctx.fillStyle = 'rgba(186,230,253,.3)'; ctx.fill(); ctx.strokeStyle = 'rgba(56,189,248,.55)'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
    T(B.x + 14, B.y + 28, '🔍 ' + (m.type === 'none' ? '저해제 없음' : m.type === 'comp' ? '경쟁적 저해제' : '비경쟁적 저해제') + ' · [S] ' + sv + ' mM', L(16, 14), '#1f2d44', 'left', 800);
    m.sp.forEach((q) => { ctx.save(); ctx.globalAlpha = clamp(q.a, 0, 1); D.sphere(q.x, q.y, L(8, 6.5), '#34d399', { gloss: true }); ctx.restore(); });
    m.ip.forEach((q) => { ctx.save(); ctx.globalAlpha = clamp(q.a, 0, 1); inhib(q.x, q.y, L(9, 7), m.type, t); ctx.restore(); });
    m.enz.forEach((e) => mdEnzyme(e, t));
    // 결합한 입자
    m.enz.forEach((e) => {
      const st = mdSite(e), sr = (PHONE ? 13 : 19) * (1 - 0.35 * e.dist);
      if (e.st === 1 && e.doc && e.doc.arrived) { const jig = e.dist > 0.5 ? Math.sin(t * 20) * 2 : 0; D.sphere(st.x + jig, st.y + sr * 0.5 - (e.dist > 0.5 ? 4 : 0), L(8, 6.5), '#34d399', { gloss: true, shadow: true }); if (e.dist > 0.5) T(st.x + 18, st.y - 12, '✕', L(15, 12), '#dc2626', 'left', 800); }
      if (e.st === 2 && e.doc && e.doc.arrived) inhib(st.x, st.y + sr * 0.5, L(9, 7), 'comp', t);
      if (e.nc && e.ncdoc && e.ncdoc.arrived) { const a = mdAllo(e); inhib(a.x + (PHONE ? 6 : 8), a.y, L(9, 7), 'non', t); }
    });
    m.fly.forEach((f) => { if (f.kind === 'S') D.sphere(f.x, f.y, L(8, 6.5), '#34d399', { gloss: true }); else inhib(f.x, f.y, L(9, 7), f.kind === 'I' ? 'comp' : 'non', t); });
    m.prods.forEach((q) => { ctx.save(); ctx.globalAlpha = Math.max(0, 1 - q.t / 0.9); D.sphere(q.x, q.y, L(5.5, 4.5), q.c, { gloss: false }); ctx.restore(); });
    // 이름표
    const e0 = m.enz[0]; if (e0) { const st = mdSite(e0); callout(st.x - 6, st.y - 6, st.x - (PHONE ? 26 : 100), st.y - (PHONE ? 52 : 66), '활성 부위', { size: L(13, 11.5) }); if (m.type === 'non') { const a = mdAllo(m.enz[2]); callout(a.x + 4, a.y, a.x + (PHONE ? -8 : 20), a.y + (PHONE ? 60 : 82), '조절 부위', { size: L(13, 11.5), line: '#7c3aed' }); } }
    // 범례
    const lx = B.x + B.w - (PHONE ? 140 : 250), ly = B.y + 26;
    D.sphere(lx, ly - 3, 6, '#34d399', { gloss: false }); T(lx + 10, ly + 1, '기질', 13, '#475569', 'left', 800);
    if (m.type !== 'none') { inhib(lx + (PHONE ? 54 : 70), ly - 3, 6, m.type, t); T(lx + (PHONE ? 66 : 82), ly + 1, '저해제', 13, '#475569', 'left', 800); }
    if (!PHONE) { D.sphere(lx + 150, ly - 3, 5, '#fb923c', { gloss: false }); T(lx + 160, ly + 1, '생성물', 13, '#475569', 'left', 800); }
    // 막대
    const R = g.Br; panel(R.x, R.y, R.w, R.h, 18, '#fff');
    const bw = R.w - (PHONE ? 196 : 250), bx = R.x + (PHONE ? 132 : 200);
    T(R.x + 16, R.y + 32, '저해제 없을 때', L(15, 13), '#475569', 'left', 800); T(R.x + 16, R.y + 74, '지금 조건', L(15, 13), CCOL[m.type === 'none' ? 'none' : m.type === 'comp' ? 'A' : 'B'], 'left', 800);
    [[vb, '#94a3b8', 14], [v, m.type === 'none' ? '#64748b' : m.type === 'comp' ? '#ef4444' : '#8b5cf6', 56]].forEach(([val, col, y0]) => {
      D.roundRect(bx, R.y + y0 - 4, bw, 22, 11); ctx.fillStyle = '#eef2f7'; ctx.fill(); D.roundRect(bx, R.y + y0 - 4, Math.max(22, bw * val / 100), 22, 11); ctx.fillStyle = col; ctx.fill();
      T(bx + bw + 10, R.y + y0 + 14, val + '', L(17, 15), '#1f2d44', 'left', 800);
    });
    T(R.x + 16, R.y + L(112, 108), m.type === 'comp' ? '기질이 많아지면 저해제를 밀어내 속도가 회복돼요 (Vmax 같음)' : m.type === 'non' ? '기질을 늘려도 저해된 효소는 일하지 못해 Vmax가 낮아요' : '저해제가 없으면 활성 부위가 기질로 채워져요', L(14.5, 12.5), '#475569', 'left', 800);
    const act = m.enz.filter((e) => e.st === 1 && !(e.nc)).length;
    T(R.x + 16, R.y + L(140, 140), '이 순간 반응 중인 효소 ' + act + ' / 3 · 생성물 누적 ' + m.nProd + '개', L(14.5, 12.5), '#166534', 'left', 800);
    if (PHONE) { textBlock(R.x + 16, R.y + 170, R.w - 32, m.type === 'comp' ? '경쟁적 저해제는 기질과 모양이 비슷해 활성 부위를 두고 기질과 경쟁해요.' : m.type === 'non' ? '비경쟁적 저해제는 활성 부위가 아닌 곳에 붙어 효소의 모양을 바꿔요.' : '', 13, '#64748b', 19, 700); }
  }
  function inhib(x, y, r, type, t) {
    if (type === 'comp') {   // 기질과 비슷한 모양 (붉은 구)
      D.sphere(x, y, r, '#ef4444', { gloss: true });
    } else {   // 비경쟁적: 보라색 별 모양
      ctx.save(); ctx.translate(x, y); ctx.rotate(t * 0.5); ctx.fillStyle = '#8b5cf6'; ctx.strokeStyle = '#5b21b6'; ctx.lineWidth = 1.5; ctx.beginPath(); for (let i = 0; i < 8; i++) { const rr = i % 2 ? r * 0.55 : r * 1.25, a = i / 8 * TAU; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
    }
  }

  /* =========================================================
     ③ 되먹임 조절
     ========================================================= */
  const PMAX = 20, LMAX = 100;
  S.fb = { on: false, cons: 5, spd: 1, L: 30, P: 0, waste: 0, made: 0, used: 0, phase: 0, hist: [], hacc: 0, t: 0, steady: { low: 0, high: 0 }, offWaste: false, over: 0 };
  const fbGeo = () => (PHONE
    ? { P: { x: 10, y: 10, w: 460, h: 470 }, Hh: { x: 10, y: 488, w: 460, h: 144 }, vert: true, s0: 100, s1: 372, bx: 120, by: 0, E: [150, 226, 302], tank: { x: 56, y: 388, w: 128, h: 60 }, cons: { x: 372, y: 430 }, raw: { x: 120, y: 70 }, bw: 92, bh: 56, fbx: 318 }
    : { P: { x: 14, y: 14, w: 772, h: 330 }, Hh: { x: 14, y: 352, w: 772, h: 194 }, vert: false, s0: 92, s1: 566, bx: 0, by: 190, E: [196, 318, 440], tank: { x: 566, y: 118, w: 92, h: 140 }, cons: { x: 742, y: 190 }, raw: { x: 58, y: 190 }, bw: 84, bh: 76, fbx: 0 });
  const fbPt = (g, s) => (g.vert ? { x: g.bx, y: s } : { x: s, y: g.by });
  function fbReset() { const f = S.fb; f.L = 30; f.P = 0; f.waste = 0; f.made = 0; f.used = 0; f.hist = []; f.hacc = 0; f.t = 0; f.over = 0; Sound.click(); updateCtl(); }
  function fbStep(dt) {
    const f = S.fb; if (dt <= 0) return;
    f.P = f.on ? PMAX * (1 - f.L / LMAX) : PMAX;
    let Ca = f.cons;
    f.L += (f.P - f.cons) * dt;
    f.over = 0;
    if (f.L > LMAX) { const ex = f.L - LMAX; f.waste += ex; f.over = ex / dt; f.L = LMAX; }
    if (f.L < 0) { f.L = 0; Ca = f.P; }
    f.made += f.P * dt; f.used += Ca * dt; f.t += dt;
    f.phase += f.P * 8 * dt;
    if (!f.on && f.waste >= 30) f.offWaste = true;
    if (f.on && Math.abs(f.P - f.cons) < 1.2) { if (f.cons <= 6) f.steady.low += dt; else if (f.cons >= 14) f.steady.high += dt; }
    f.hacc += dt; if (f.hacc >= 0.25) { f.hacc = 0; f.hist.push({ P: f.P, C: Ca, L: f.L }); if (f.hist.length > 120) f.hist.shift(); }
  }
  const FBITEM = [['#94a3b8', '원료'], ['#f59e0b', '중간 물질 1'], ['#ec4899', '중간 물질 2'], ['#22c55e', '최종 산물']];
  function fbDraw(dt, t) {
    const f = S.fb, g = fbGeo(), P = g.P; fbStep(dt * f.spd);
    panel(P.x, P.y, P.w, P.h, 18, '#fbfdf7');
    T(P.x + 16, P.y + 28, '효소 3개가 이어진 생산 라인', L(17, 14.5), '#1f2d44', 'left', 800);
    // 벨트
    const pa = fbPt(g, g.s0), pb = fbPt(g, g.s1);
    ctx.save(); ctx.lineCap = 'round'; ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = L(16, 14); ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y); ctx.stroke(); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; ctx.setLineDash([8, 8]); ctx.lineDashOffset = -f.phase; ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y); ctx.stroke(); ctx.restore();
    // 원료 상자
    const rw = g.raw; D.roundRect(rw.x - 36, rw.y - 26, 72, 52, 12); ctx.fillStyle = '#e2e8f0'; ctx.fill(); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; ctx.stroke(); T(rw.x, rw.y + 5, '원료', L(15, 13), '#475569', 'center', 800);
    // 항목
    const len = g.s1 - g.s0, sp = L(54, 46), n = Math.ceil(len / sp) + 1, off = f.phase % sp;
    const eS = g.E; const idxOf = (s) => (s < eS[0] ? 0 : s < eS[1] ? 1 : s < eS[2] ? 2 : 3);
    if (f.P > 0.05) for (let i = 0; i < n; i++) {
      const s = g.s0 + ((i * sp + off) % (len + sp)); if (s > g.s1) continue;
      const q = fbPt(g, s), k = idxOf(s);
      D.shadow(() => { D.roundRect(q.x - L(9, 8), q.y - L(9, 8), L(18, 16), L(18, 16), 5); ctx.fillStyle = FBITEM[k][0]; ctx.fill(); }, { blur: 3, y: 1.5, color: 'rgba(0,0,0,.2)' });
    }
    // 효소 기계
    const act = f.on ? 1 - f.L / LMAX : 1;
    g.E.forEach((s, i) => {
      const q = fbPt(g, s), lit = i === 0 ? act : (f.P > 0.3 ? 1 : 0.15), bw = g.bw, bh = g.bh;
      D.shadow(() => { D.roundRect(q.x - bw / 2, q.y - bh / 2, bw, bh, 14); ctx.fillStyle = lit > 0.5 ? '#e8f5ff' : '#e5e7eb'; ctx.fill(); }, { blur: 7, y: 2 });
      D.roundRect(q.x - bw / 2, q.y - bh / 2, bw, bh, 14); ctx.strokeStyle = i === 0 && f.on && act < 0.5 ? '#dc2626' : '#38bdf8'; ctx.lineWidth = 3; ctx.stroke();
      T(q.x, q.y - bh * 0.12, '효소 ' + (i + 1), L(16, 14), '#0c4a6e', 'center', 800);
      D.glow(q.x, q.y + bh * 0.22, 14, '#facc15', 0.8 * lit * 0.7); D.sphere(q.x, q.y + bh * 0.22, L(7, 6), lit > 0.3 ? '#facc15' : '#9ca3af', { gloss: false });
      if (i === 0) { if (g.vert) T(q.x - bw / 2 - 6, q.y + 5, f.on ? '활동 ' + Math.round(act * 100) + '%' : '활동 100%', 12.5, act < 0.5 && f.on ? '#dc2626' : '#475569', 'right', 800); else T(q.x, q.y + bh * 0.52 + 12, f.on ? '활동 ' + Math.round(act * 100) + ' %' : '활동 100 %', 13, act < 0.5 && f.on ? '#dc2626' : '#475569', 'center', 800); }
    });
    // 구간 이름
    // 탱크
    const tk = g.tank; D.roundRect(tk.x, tk.y, tk.w, tk.h, 10); ctx.fillStyle = '#f1f5f9'; ctx.fill();
    const fillH = (tk.h - 6) * clamp(f.L / LMAX, 0, 1);
    ctx.save(); D.roundRect(tk.x, tk.y, tk.w, tk.h, 10); ctx.clip(); const gr = ctx.createLinearGradient(0, tk.y + tk.h - fillH, 0, tk.y + tk.h); gr.addColorStop(0, '#4ade80'); gr.addColorStop(1, '#16a34a'); ctx.fillStyle = gr; ctx.fillRect(tk.x, tk.y + tk.h - 3 - fillH, tk.w, fillH + 3); ctx.restore();
    D.roundRect(tk.x, tk.y, tk.w, tk.h, 10); ctx.strokeStyle = '#64748b'; ctx.lineWidth = 3; ctx.stroke();
    [25, 50, 75].forEach((v) => { const y = tk.y + tk.h - 3 - (tk.h - 6) * v / 100; ctx.fillStyle = '#64748b'; ctx.fillRect(tk.x + tk.w - 10, y - 1, 10, 2); });
    if (g.vert) T(tk.x, tk.y + tk.h + 22, '최종 산물 ' + fi(f.L), 13.5, '#166534', 'left', 800); else T(tk.x + tk.w / 2, tk.y - 8, '최종 산물 ' + fi(f.L), 15, '#166534', 'center', 800);
    // 넘침
    if (f.over > 0.5 && !RM) { for (let k = 0; k < 2; k++) parts.emit({ x: tk.x + tk.w + 2, y: tk.y + 4, vx: 30 + Math.random() * 20, vy: -10, life: 0.7, size: 3, color: '#4ade80', gravity: 220 }); }
    if (f.waste > 0) { const wy = tk.y + tk.h + (g.vert ? 4 : 14); D.roundRect(tk.x - 6, wy, tk.w + 12, 8, 4); ctx.fillStyle = 'rgba(22,163,74,' + clamp(f.waste / 80, 0.15, 0.7) + ')'; ctx.fill(); if (g.vert) T(tk.x + tk.w + 6, wy + 14, '낭비 ' + fi(f.waste), 13.5, '#b45309', 'left', 800); else T(tk.x + tk.w / 2, wy + 26, '넘친 양(낭비) ' + fi(f.waste), 14.5, '#b45309', 'center', 800); }
    // 소비
    const cs = g.cons; D.sphere(cs.x, cs.y, L(30, 26), '#fde68a', { gloss: true, shadow: true }); T(cs.x, cs.y + 5, '🧫', L(24, 20), '#000', 'center', 700);
    T(cs.x, cs.y + L(52, 46), '세포 활동', L(14, 12.5), '#475569', 'center', 800);
    const fromT = g.vert ? { x: tk.x + tk.w + 2, y: tk.y + tk.h * 0.6 } : { x: tk.x + tk.w + 2, y: g.by };
    D.arrow(fromT.x, fromT.y, cs.x - L(34, 30), cs.y, { color: '#2563eb', width: 2 + f.cons * 0.25, head: 10 });
    D.label((fromT.x + cs.x - L(34, 30)) / 2, (fromT.y + cs.y) / 2 - 16, '소비 ' + f.cons, { bg: '#2563eb', size: L(13.5, 12) });
    // 되먹임 화살표
    const e1 = fbPt(g, g.E[0]), top = tk.y - 36;
    const fbw = f.on ? 1.5 + 5 * f.L / LMAX : 0;
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = f.on ? 'rgba(220,38,38,' + (0.35 + 0.65 * f.L / LMAX) + ')' : '#cbd5e1'; ctx.lineWidth = f.on ? fbw : 2; if (!f.on) ctx.setLineDash([4, 6]);
    ctx.beginPath();
    if (g.vert) { ctx.moveTo(tk.x + tk.w * 0.9, tk.y - 2); ctx.lineTo(tk.x + tk.w * 0.9, tk.y - 18); ctx.lineTo(g.fbx, tk.y - 18); ctx.lineTo(g.fbx, e1.y); ctx.lineTo(e1.x + g.bw / 2 + 4, e1.y); }
    else { ctx.moveTo(tk.x + tk.w / 2, tk.y - 4); ctx.lineTo(tk.x + tk.w / 2, top - 24); ctx.lineTo(e1.x, top - 24); ctx.lineTo(e1.x, e1.y - g.bh / 2 - 6); }
    ctx.stroke(); ctx.setLineDash([]); ctx.restore();
    if (f.on) { const ex = g.vert ? e1.x + g.bw / 2 + 4 : e1.x, ey = g.vert ? e1.y : e1.y - g.bh / 2 - 6; ctx.fillStyle = 'rgba(220,38,38,' + (0.35 + 0.65 * f.L / LMAX) + ')'; ctx.fillRect(g.vert ? ex - 2 : ex - 12, g.vert ? ey - 12 : ey - 4, g.vert ? 4 : 24, g.vert ? 24 : 8); }
    if (g.vert) { T(g.fbx + 8, 250, f.on ? '⊣ 되먹임' : '되먹임 없음', 13.5, f.on ? '#dc2626' : '#94a3b8', 'left', 800); T(g.fbx + 8, 268, f.on ? '억제' : '', 13.5, '#dc2626', 'left', 800); }
    else T((e1.x + tk.x + tk.w / 2) / 2, top - 4, f.on ? '⊣ 되먹임 억제: 최종 산물이 많을수록 효소 1이 더 억제돼요' : '되먹임 없음 (최종 산물이 효소 1에 영향을 주지 않아요)', 14.5, f.on ? '#dc2626' : '#94a3b8', 'center', 800);
    // 구간 이름표
    FBITEM.forEach((q, i) => { if (g.vert || i === 0) return; const xs = [0, (eS[0] + eS[1]) / 2, (eS[1] + eS[2]) / 2, (eS[2] + g.s1) / 2 + 4][i]; T(xs, g.by + g.bh / 2 + 44, q[1], 12.5, FBITEM[i][0] === '#f59e0b' ? '#b45309' : FBITEM[i][0] === '#ec4899' ? '#be185d' : '#15803d', 'center', 800); });
    // 아래: 수치 + 역사
    const H = g.Hh; panel(H.x, H.y, H.w, H.h, 18, '#fff');
    const cols = [['생산 속도', fi(f.P) + ' /초', '#d97706'], ['소비 속도', f.cons + ' /초', '#2563eb'], ['최종 산물', fi(f.L), '#16a34a'], ['넘친 양', fi(f.waste), '#b45309']];
    const cw = (H.w - 28) / (PHONE ? 4 : 5); cols.forEach((c, i) => { T(H.x + 14 + cw * i, H.y + 24, c[0], L(13.5, 12), '#64748b', 'left', 700); T(H.x + 14 + cw * i, H.y + 48, c[1], L(19, 15.5), c[2], 'left', 800); });
    const cp = { x: H.x + 8, y: H.y + 58, w: H.w - 16, h: H.h - 64 };
    const pl = mkPlot(cp, { x0: 0, x1: 30, y0: 0, y1: 20, xt: [], yt: [0, 10, 20], m: { l: 34, t: 6, r: 10, b: 8 } });
    drawAxes(pl);
    const hs = f.hist; [['P', '#f59e0b'], ['C', '#2563eb']].forEach(([k, col]) => { if (hs.length < 2) return; ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.beginPath(); hs.forEach((q, i) => { const x = pl.x + pl.w * (i + (120 - hs.length)) / 119, y = pl.Y(q[k]); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }); ctx.stroke(); ctx.restore(); });
    if (!PHONE) T(H.x + H.w - 14, H.y + 24, '주황: 생산 · 파랑: 소비 (최근 30초)', L(13, 11.5), '#64748b', 'right', 700);
  }

  /* =========================================================
     ④ 효소의 중요성 (카드뉴스와 짝 활동)
     ========================================================= */
  const SLOT_H = [['⚠️', '① 문제', '#ef6a3c'], ['🔬', '② 효소는 어떻게?', '#0ea5e9'], ['🧍', '③ 몸에서 생기는 일', '#a855f7'], ['🛠', '④ 해결 · 예방', '#16a34a']];
  const TOPICS = [
    { n: '페닐케톤뇨증', ic: '🍼', t: ['신생아의 몸에 페닐알라닌이 쌓이는 병이 생겨요.', '페닐알라닌을 분해하는 효소가 부족하거나 없어요.', '페닐알라닌이 쌓여 뇌 발달에 문제가 생길 수 있어요.', '신생아 선별 검사로 일찍 찾고 식이를 조절해요.'] },
    { n: '젖당 불내증', ic: '🥛', t: ['우유를 마시면 배가 아프고 설사가 나요.', '젖당을 분해하는 락테이스가 부족해요.', '분해되지 않은 젖당이 장에 남아 가스와 복통이 생겨요.', '락토프리 우유를 마시거나 락테이스를 함께 먹어요.'] },
    { n: '메탄올 중독과 에탄올 치료', ic: '🧪', t: ['메탄올을 마시면 몸에 독성이 나타나요.', '알코올 탈수소 효소가 메탄올을 독성 물질로 바꿔요.', '독성 물질이 쌓여 시력과 장기가 손상될 수 있어요.', '병원에서 에탄올을 투여해 효소가 에탄올과 먼저 반응하게 해요.'] },
    { n: '설파제와 세균', ic: '💊', t: ['세균 감염을 치료할 약이 필요해요.', '설파제가 세균의 엽산 합성 효소에서 PABA와 경쟁해요.', '세균이 엽산을 만들지 못해 증식이 멈춰요.', '사람은 엽산을 음식으로 얻어 세균만 선택적으로 막아요.'] },
    { n: '납 중독', ic: '⚠️', t: ['납에 노출되면 몸에 이상이 생겨요.', '납 이온이 효소 단백질에 붙어 모양과 활성을 바꿔요.', '헤모글로빈 합성이 줄어 빈혈과 신경 이상이 생길 수 있어요.', '납 노출을 피하고 의사의 진단에 따라 치료를 받아요.'] },
    { n: '시안화물 독성', ic: '☠️', t: ['시안화물은 아주 적은 양으로도 위험해요.', '세포호흡에 필요한 효소에 결합해 작용을 막아요.', '세포가 ATP를 만들지 못해 빠르게 기능을 잃어요.', '노출되지 않도록 관리하고 즉시 응급 치료를 받아요.'] },
    { n: '소화 효소 결핍', ic: '🍽', t: ['기름진 음식을 먹으면 소화가 잘 안 돼요.', '이자에서 라이페이스 같은 소화 효소가 충분히 나오지 않아요.', '지방이 분해되지 않아 기름진 변과 영양 부족이 생겨요.', '의사의 진단에 따라 소화 효소제를 식사와 함께 먹어요.'] },
    { n: '되먹임 조절', ic: '🔁', t: ['세포가 필요 이상으로 만들면 원료가 낭비돼요.', '최종 산물이 경로의 첫 번째 효소를 저해해요.', '최종 산물이 많으면 생산이 줄고 적으면 다시 늘어요.', '필요한 만큼만 만들어 원료와 에너지를 아껴요.'] },
  ];
  const CONS = ['효소는 생명 활동의 화학 반응을 알맞게 일으키고 조절하므로, 한 효소에 문제가 생기면 대사 경로와 몸 전체에 영향을 줄 수 있어요.', '효소는 한 번 일하면 사라지므로 계속 먹어서 보충해야 해요.', '효소 하나가 없어도 다른 효소가 같은 일을 하므로 몸에는 영향이 없어요.'];
  S.cd = { topic: -1, ans: [0, 0, 0, 0], consAns: 0, wrong: [false, false, false, false], consWrong: false, friend: -1 };
  const cdSel = (id) => $('#' + id);
  function cdBuild(ti) {
    const c = S.cd; c.topic = ti; c.friend = ti < 0 ? -1 : (ti + 3) % 8; c.wrong = [false, false, false, false]; c.consWrong = false;
    for (let k = 0; k < 4; k++) {
      const el = cdSel('cd' + k); el.innerHTML = '';
      const first = document.createElement('option'); first.value = ''; first.textContent = SLOT_H[k][1]; el.appendChild(first);
      if (ti < 0) { el.disabled = true; continue; }
      el.disabled = false;
      const opts = [TOPICS[ti].t[k], TOPICS[(ti + 2) % 8].t[k], TOPICS[(ti + 5) % 8].t[k]];
      const order = [0, 1, 2]; const sh = (ti + k) % 3; const rot = order.map((_, i) => order[(i + sh) % 3]);
      rot.forEach((oi, pos) => { const o = document.createElement('option'); o.value = String(oi); o.textContent = opts[oi]; el.appendChild(o); });
    }
    const ce = cdSel('cdCons'); ce.innerHTML = ''; const f0 = document.createElement('option'); f0.value = ''; f0.textContent = '효소는 왜 중요할까요?'; ce.appendChild(f0); ce.disabled = ti < 0;
    if (ti >= 0) { const sh = (ti + 1) % 3; [0, 1, 2].forEach((i) => { const oi = (i + sh) % 3; const o = document.createElement('option'); o.value = String(oi); o.textContent = CONS[oi]; ce.appendChild(o); }); }
  }
  const cdPick = (k) => { const v = cdSel('cd' + k).value; return v === '' ? null : +v; };
  const cdConsPick = () => { const v = cdSel('cdCons').value; return v === '' ? null : +v; };
  const cdG = () => (PHONE
    ? { H: { x: 10, y: 10, w: 460, h: 46 }, cards: (i) => ({ x: 10 + (i % 2) * 234, y: 62 + Math.floor(i / 2) * 156, w: 226, h: 150 }), F: { x: 10, y: 376, w: 460, h: 122 }, K: { x: 10, y: 506, w: 460, h: 126 } }
    : { H: { x: 14, y: 14, w: 772, h: 50 }, cards: (i) => ({ x: 14 + i * 195, y: 72, w: 187, h: 262 }), F: { x: 14, y: 342, w: 380, h: 204 }, K: { x: 404, y: 342, w: 382, h: 204 } });
  function cdDraw(dt, t) {
    const c = S.cd, g = cdG(), T0 = c.topic >= 0 ? TOPICS[c.topic] : null;
    panel(g.H.x, g.H.y, g.H.w, g.H.h, 14, '#fffdf7');
    T(g.H.x + 16, g.H.y + g.H.h / 2 + 7, T0 ? T0.ic + ' ' + T0.n : '🗞 소재를 골라 카드뉴스를 만들어요', L(20, 16.5), '#1f2d44', 'left', 800);
    T(g.H.x + g.H.w - 14, g.H.y + g.H.h / 2 + 5, '문제 → 효소 → 몸 → 해결', L(14, 12), '#64748b', 'right', 700);
    for (let k = 0; k < 4; k++) {
      const r = g.cards(k), h = SLOT_H[k], p = T0 ? cdPick(k) : null, txt = T0 && p != null ? [TOPICS[c.topic].t[k], TOPICS[(c.topic + 2) % 8].t[k], TOPICS[(c.topic + 5) % 8].t[k]][p] : null;
      const wrong = c.wrong[k];
      D.shadow(() => { D.roundRect(r.x, r.y, r.w, r.h, 14); ctx.fillStyle = wrong ? '#fff1f0' : '#fff'; ctx.fill(); }, { blur: 7, y: 2 });
      D.roundRect(r.x, r.y, r.w, r.h, 14); ctx.strokeStyle = wrong ? '#dc2626' : txt ? h[2] : '#cbd5e1'; ctx.lineWidth = wrong ? 3 : 2; if (!txt) ctx.setLineDash([6, 5]); ctx.stroke(); ctx.setLineDash([]);
      ctx.save(); D.roundRect(r.x, r.y, r.w, r.h, 14); ctx.clip(); ctx.fillStyle = h[2]; ctx.fillRect(r.x, r.y, r.w, L(40, 34)); ctx.restore();
      E(h[0], r.x + 22, r.y + L(21, 18), L(22, 19)); T(r.x + 42, r.y + L(26, 23), h[1], L(14.5, 13), '#fff', 'left', 800);
      if (txt) textBlock(r.x + 12, r.y + L(64, 56), r.w - 24, txt, L(14, 13), '#26324a', L(21, 19), 700);
      else textBlock(r.x + 12, r.y + L(64, 56), r.w - 24, T0 ? '오른쪽에서 알맞은 문장을 골라요.' : '소재를 먼저 골라요.', L(14, 13), '#94a3b8', L(21, 19), 700);
      if (k < 3 && !PHONE) D.arrow(r.x + r.w + 1, r.y + r.h / 2, r.x + r.w + 9, r.y + r.h / 2, { color: '#94a3b8', width: 2, head: 6 });
    }
    // 친구 카드
    panel(g.F.x, g.F.y, g.F.w, g.F.h, 14, '#f0f9ff');
    T(g.F.x + 14, g.F.y + 28, '🧑‍🎓 친구의 카드' + (c.friend >= 0 ? ': ' + TOPICS[c.friend].ic + ' ' + TOPICS[c.friend].n : ''), L(16, 14), '#0c4a6e', 'left', 800);
    if (c.friend >= 0) { const ft = TOPICS[c.friend].t; textBlock(g.F.x + 14, g.F.y + L(56, 52), g.F.w - 28, '효소: ' + ft[1], L(14, 12.5), '#334155', L(21, 18), 700); textBlock(g.F.x + 14, g.F.y + L(110, 98), g.F.w - 28, '해결: ' + ft[3], L(14, 12.5), '#334155', L(21, 18), 700); }
    else T(g.F.x + 14, g.F.y + 60, '소재를 고르면 친구가 만든 카드가 나타나요.', L(14, 12.5), '#94a3b8', 'left', 700);
    // 합의
    panel(g.K.x, g.K.y, g.K.w, g.K.h, 14, c.consWrong ? '#fff1f0' : '#fffbeb');
    T(g.K.x + 14, g.K.y + 28, '🤝 우리의 한 문장', L(16, 14), '#92400e', 'left', 800);
    const cp = cdConsPick();
    if (cp != null) textBlock(g.K.x + 14, g.K.y + L(56, 52), g.K.w - 28, '“' + CONS[cp] + '”', L(15, 13), '#1f2d44', L(23, 20), 800);
    else T(g.K.x + 14, g.K.y + 60, '두 카드를 비교하고 한 문장에 합의해요.', L(14, 12.5), '#94a3b8', 'left', 700);
    const note = cdSel('cdNote').value.trim();
    if (note) T(g.K.x + 14, g.K.y + g.K.h - 14, '💬 ' + note, L(14, 12.5), '#475569', 'left', 700);
  }

  /* =========================================================
     화면 전환 · 조작 연결
     ========================================================= */
  function setMode(m) { if (S.mode !== m) S.fade = 1; S.mode = m; PT = null; hideHint(); updateCtl(); }
  const ctlNodes = $$('#ctrlCard .control');
  const JANS = ['comp', 'comp', 'non'];
  const NOTE_KEY = 'hy-enzyme-regulation:note';
  function updateCtl() {
    const fr = game ? game.free : false, lvNow = game ? game.level : 0;
    ctlNodes.forEach((n) => { n.hidden = (n.dataset.modes || '').split(' ').indexOf(S.mode) < 0; });
    $$('#ctrlCard [data-grp]').forEach((n) => { n.hidden = !(fr || n.dataset.grp.split(' ').indexOf(S.grp) >= 0); });
    modeButtons(S.mode, lvNow, fr);
    const a = S.as; chipSet($('#asCond'), a.cond); $('#sAs').value = a.idx; $('#oAs').textContent = SL[a.idx] + ' mM';
    $('#vN').classList.toggle('ok', near(numIn('vN'), 100, 10)); $('#vA').classList.toggle('ok', near(numIn('vA'), 100, 20)); $('#vB').classList.toggle('ok', near(numIn('vB'), 50, 6));
    $('#asNote').innerHTML = '측정한 점: 없음 <b>' + asDone('none') + '</b> · A <b>' + asDone('A') + '</b> · B <b>' + asDone('B') + '</b> (각 6점)';
    const m = S.md; chipSet($('#mdType'), m.type); $('#sMd').value = m.idx; $('#oMd').textContent = SL[m.idx] + ' mM';
    ['jd1', 'jd2', 'jd3'].forEach((id, i) => { const v = selVal(id), e = $('#' + id); e.classList.toggle('ok', v === JANS[i]); e.classList.toggle('bad', v !== '' && v !== JANS[i]); });
    $('#mdNote').innerHTML = '속도 <b>' + rateModel(m.type, SL[m.idx]) + '</b> μmol/분 (저해제 없을 때 ' + rateModel('none', SL[m.idx]) + ')';
    const f = S.fb; chipSet($('#fbOn'), f.on ? 'on' : 'off'); $('#sCons').value = f.cons; $('#oCons').textContent = f.cons + ' /초'; chipSet($('#fbSpd'), String(f.spd));
    $('#fbNote').innerHTML = '생산 <b>' + fi(f.P) + '</b> · 소비 <b>' + f.cons + '</b> · 최종 산물 <b>' + fi(f.L) + '</b> · 넘친 양 <b>' + fi(f.waste) + '</b>';
    const c = S.cd; $('#cdNote2').innerHTML = c.topic < 0 ? '소재를 고른 뒤 4칸을 채워요.' : '고른 칸 <b>' + [0, 1, 2, 3].filter((k) => cdPick(k) != null).length + ' / 4</b> · 합의 문장 ' + (cdConsPick() != null ? '✅' : '⬜');
  }
  bindModeSeg(setMode);
  $$('#asCond button').forEach((b) => b.addEventListener('click', () => { S.as.cond = b.dataset.v; Sound.click(); updateCtl(); }));
  $('#sAs').addEventListener('input', (ev) => { S.as.idx = +ev.target.value; Sound.tick(); updateCtl(); });
  $('#asGo').addEventListener('click', () => asMeasure());
  $('#asAll').addEventListener('click', () => { Sound.click(); asAll(); });
  $('#asClear').addEventListener('click', () => { Sound.click(); asClear(); });
  ['vN', 'vA', 'vB'].forEach((id) => $('#' + id).addEventListener('input', updateCtl));
  function mdSetType(ty) { const m = S.md; m.type = ty; mdInit(); updateCtl(); }
  $$('#mdType button').forEach((b) => b.addEventListener('click', () => { Sound.click(); mdSetType(b.dataset.v); }));
  $('#sMd').addEventListener('input', (ev) => { S.md.idx = +ev.target.value; Sound.tick(); updateCtl(); });
  ['jd1', 'jd2', 'jd3'].forEach((id) => $('#' + id).addEventListener('change', updateCtl));
  $$('#fbOn button').forEach((b) => b.addEventListener('click', () => { S.fb.on = b.dataset.v === 'on'; Sound.click(); updateCtl(); }));
  $('#sCons').addEventListener('input', (ev) => { S.fb.cons = +ev.target.value; Sound.tick(); updateCtl(); });
  $$('#fbSpd button').forEach((b) => b.addEventListener('click', () => { S.fb.spd = +b.dataset.v; Sound.click(); updateCtl(); }));
  $('#fbReset').addEventListener('click', () => fbReset());
  // 카드뉴스
  (function () {
    const ts = $('#cdTopic'); TOPICS.forEach((tp, i) => { const o = document.createElement('option'); o.value = String(i); o.textContent = tp.ic + ' ' + tp.n; ts.appendChild(o); });
    ts.addEventListener('change', () => { cdBuild(ts.value === '' ? -1 : +ts.value); updateCtl(); });
    ['cd0', 'cd1', 'cd2', 'cd3', 'cdCons'].forEach((id) => $('#' + id).addEventListener('change', () => { S.cd.wrong = [false, false, false, false]; S.cd.consWrong = false; updateCtl(); }));
    try { const v = localStorage.getItem(NOTE_KEY); if (v) $('#cdNote').value = v.slice(0, 40); } catch (e) { /* 저장소 없음 */ }
    $('#cdNote').addEventListener('input', () => { try { localStorage.setItem(NOTE_KEY, $('#cdNote').value.slice(0, 40)); } catch (e) { /* 무시 */ } });
  })();

  /* =========================================================
     미션
     ========================================================= */
  const levels = [
    {
      title: '저해제 실험', short: '저해제 실험', icon: '🧪', phase: '실험',
      intro: '<p class="si-q">❓ 탐구 질문: 효소가 한 군데만 막혀도 큰 문제가 생기는 이유는? 세포는 어떻게 효소의 일을 켜고 끌까?</p><p>🔗 <b>앞 차시</b>에서 기질 농도가 높아지면 속도가 Vmax에 가까워지는 포화 곡선을 읽었어요. 이번에는 효소의 일을 방해하는 <b>저해제</b>가 이 곡선을 어떻게 바꾸는지 비교해요.</p><p>저해제 없음 · 저해제 A · 저해제 B 세 조건에서 기질 농도 6단계(1~32 mM)의 속도를 재어 한 그래프에 겹쳐 그려요. 효소 양은 모두 1단위예요.</p>',
      features: ['assay'],
      setup() { S.grp = 'none'; setMode('assay'); },
      recap: '저해제를 넣으면 같은 기질 농도에서 속도가 낮아져요. 저해제 A는 기질을 많이 넣으면 같은 Vmax에 가까워지고, 저해제 B는 기질을 늘려도 Vmax가 낮은 채로 남아요.',
      summary: '<ul><li><b>저해제</b>는 효소의 작용을 줄이는 물질이에요. 같은 기질 농도에서 속도가 낮아져요.</li><li><b>경쟁적 저해</b>: 기질 농도를 충분히 높이면 극복되어 <b>같은 Vmax</b>에 도달하고, 반속도 농도는 커져요(예: 저해제 A, Vmax 약 100).</li><li><b>비경쟁적 저해</b>: 기질 농도를 높여도 극복되지 않아 <b>Vmax가 낮아져요</b>(예: 저해제 B, Vmax 약 50).</li><li>이 자료는 효소 1단위, 기질 1~32 mM의 가상 예시이고, 수식(저해 상수)은 다루지 않아요.</li></ul>',
      missions: [
        {
          id: 'meas', title: '세 조건 × 6점 측정',
          goal: '<b>저해제 없음 · A · B</b> 세 조건에서 기질 농도 6단계의 속도를 모두 측정하세요. (모두 18점)',
          hint: '조건을 고르고 📏 1점 측정을 누르거나, ⚡ 이 조건 6점으로 한 번에 측정할 수 있어요. 세 조건을 각각 해요.',
          setup() { S.grp = 'none'; setMode('assay'); },
          check: () => asTotal() >= 18 && S.as.flies.every((f) => f.shown), hold: 0.6,
          status: () => ['none', 'A', 'B'].map((c) => mark(asCount(c) >= 6) + ' ' + CN[c] + ' ' + asCount(c) + '/6').join(' &nbsp; '),
          explain: '세 곡선을 한 그래프에 겹쳐 보면 <b>저해제가 있을 때 속도가 낮아지고</b>, 저해제 A와 B는 곡선 모양이 서로 달라요. A는 기질 농도가 높을수록 저해 없음 곡선에 가까워져요.',
        },
        {
          id: 'vmax', title: '곡선이 가까워지는 Vmax 읽기',
          goal: '세 곡선이 <b>가까워지는 최대 속도 Vmax</b>를 각각 읽어 쓰세요. (저해제 없음, A, B)',
          hint: '곡선이 기질을 아주 많이 넣으면 어느 높이에 가까워질지 생각해요. 없음은 100, A는 같은 Vmax로 다가가고, B는 훨씬 낮은 곳에서 멈춰요. 아직 점이 없는 조건은 먼저 측정해요.',
          setup() { S.grp = 'readV'; setMode('assay'); },
          check: () => asTotal() >= 18 && near(numIn('vN'), 100, 10) && near(numIn('vA'), 100, 20) && near(numIn('vB'), 50, 6), hold: 0.5,
          status: () => mark(near(numIn('vN'), 100, 10)) + ' 없음 &nbsp; ' + mark(near(numIn('vA'), 100, 20)) + ' A &nbsp; ' + mark(near(numIn('vB'), 50, 6)) + ' B',
          explain: '저해제 없음과 <b>A는 Vmax가 약 100</b>(A는 기질이 아주 많으면 100에 가까워져요), <b>B는 약 50</b>이에요. B는 기질을 아무리 늘려도 최대 속도가 낮아요.',
        },
        {
          type: 'quiz', title: '저해제 B의 정체', goal: '저해제 B를 넣으면 기질을 아무리 늘려도 <b>최대 속도가 낮아져요</b>. 이런 저해는?',
          setup() { S.grp = 'none'; setMode('assay'); },
          choices: ['경쟁적 저해: 저해제가 활성 부위에서 기질과 경쟁한다', '비경쟁적 저해: 저해제가 활성 부위가 아닌 곳에 붙어 효소의 모양을 바꾼다', '효소의 양이 늘어난 것이다', '기질이 변성된 것이다'],
          answer: 1,
          feedback: ['경쟁적 저해는 기질을 많이 넣으면 극복되어 Vmax가 같아져요.', '', '효소 양은 모두 1단위였어요.', '기질은 변성되지 않아요.'],
          explain: '기질을 늘려도 극복되지 않아 <b>Vmax가 낮아지는</b> 저해는 <b>비경쟁적 저해</b>예요. 저해제가 활성 부위가 아닌 곳에 붙어 효소 모양을 바꾸므로 일하는 효소의 수가 줄어드는 효과가 있어요.',
        },
      ],
    },
    {
      title: '경쟁적 · 비경쟁적 저해 모형', short: '저해 모형', icon: '🔍', phase: '모형',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 저해제 A는 기질을 많이 넣으면 극복되고, 저해제 B는 극복되지 않는다는 것을 그래프로 확인했어요.</div><p>🔍 <b>입자 모형</b>으로 그 까닭을 봐요. <b>경쟁적 저해제</b>는 기질과 모양이 비슷해서 <b>활성 부위</b>에 들어가 기질과 경쟁해요. <b>비경쟁적 저해제</b>는 활성 부위가 아닌 <b>조절 부위</b>에 붙어 효소의 모양을 바꿔 활성 부위가 기질과 잘 맞지 않게 해요.</p><p>기질 농도 슬라이더를 올리면서 속도가 회복되는지 확인해요. (이 모형은 3개의 효소만 보여 주는 단순화예요.)</p>',
      features: ['model'],
      setup() { S.grp = 'none'; setMode('model'); },
      recap: '경쟁적 저해제는 활성 부위를 두고 기질과 경쟁하므로 기질을 늘리면 극복돼요. 비경쟁적 저해제는 활성 부위가 아닌 곳에 붙어 효소 모양을 바꾸므로 기질을 늘려도 극복되지 않아요.',
      summary: '<ul><li><b>경쟁적 저해</b>: 저해제가 기질과 모양이 비슷해 <b>활성 부위</b>에 결합해요. 기질 농도를 높이면 기질이 저해제를 밀어내 속도가 회복되고 <b>Vmax는 같아요</b>. 예: 말론산염(숙신산 탈수소 효소), 메탄올 중독 치료에 쓰는 에탄올, 설파제(세균의 엽산 합성 효소에서 PABA와 경쟁).</li><li><b>비경쟁적 저해</b>: 저해제가 활성 부위가 아닌 곳에 결합해 효소의 <b>모양을 바꿔</b> 활성 부위가 기질과 잘 맞지 않게 해요. 기질을 늘려도 극복되지 않아 <b>Vmax가 낮아요</b>. 예: 납·수은 같은 중금속 이온, 시안화물(세포호흡 효소 억제).</li><li>가역·비가역 저해의 구분은 이름만 알아 두어요.</li></ul>',
      missions: [
        {
          id: 'try', title: '두 저해 방식 시험하기',
          goal: '<b>경쟁적</b>은 기질이 적을 때와 많을 때의 속도를, <b>비경쟁적</b>은 기질을 많이 넣었을 때의 속도를 확인하세요.',
          hint: '저해제를 경쟁적으로 두고 기질 농도를 1 mM쯤으로 낮췄다가 16~32 mM로 올려 보세요. 그다음 비경쟁적으로 바꾸고 16~32 mM에서 속도가 회복되는지 봐요.',
          setup() { S.grp = 'none'; setMode('model'); },
          check: () => S.md.flags.compLow && S.md.flags.compHigh && S.md.flags.nonHigh, hold: 0.5,
          status: () => mark(S.md.flags.compLow) + ' 경쟁적 · 기질 적음 &nbsp; ' + mark(S.md.flags.compHigh) + ' 경쟁적 · 기질 많음(회복) &nbsp; ' + mark(S.md.flags.nonHigh) + ' 비경쟁적 · 기질 많음',
          explain: '<b>경쟁적 저해</b>에서는 기질이 많아질수록 저해제를 밀어내 속도가 거의 회복돼요(32 mM에서 84). <b>비경쟁적 저해</b>에서는 기질을 늘려도 저해된 효소가 일하지 못해 속도가 약 47에서 멈춰요.',
        },
        {
          id: 'judge', title: '저해제 유형 판정', manual: true,
          goal: '세 가지 단서가 <b>경쟁적 저해</b>인지 <b>비경쟁적 저해</b>인지 골라요.',
          hint: '활성 부위를 두고 기질과 경쟁하는 것은 경쟁적, 활성 부위가 아닌 곳에 붙어 모양을 바꾸는 것은 비경쟁적이에요. 같은 Vmax에 도달하는 것은 경쟁적이에요.',
          setup() { S.grp = 'judge'; setMode('model'); },
          check() {
            const a = ['jd1', 'jd2', 'jd3'].map(selVal); if (a.some((x) => !x)) return '세 단서를 모두 판정해 주세요.';
            const bad = a.findIndex((x, i) => x !== JANS[i]); if (bad >= 0) return (bad + 1) + '번 단서를 다시 생각해 보세요.';
            return true;
          },
          explain: '구조가 기질과 비슷하고 기질을 많이 넣으면 같은 Vmax에 도달하는 것은 <b>경쟁적 저해</b>이고, 활성 부위가 아닌 곳에 붙어 효소 모양을 바꾸는 것은 <b>비경쟁적 저해</b>예요.',
        },
        {
          type: 'quiz', title: '중금속 이온과 효소', goal: '납·수은 같은 <b>중금속 이온</b>에 의한 효소 활성 저하를 <b>비경쟁적 저해</b>에 가깝다고 보는 까닭은?',
          setup() { S.grp = 'none'; setMode('model'); },
          choices: ['기질과 모양이 같아 활성 부위를 차지하기 때문이다', '기질 농도를 높이면 극복되기 때문이다', '활성 부위가 아닌 곳에 결합해 효소의 모양을 변화시켜 기질을 더 넣어도 회복되지 않기 때문이다', '효소를 새로 만들어 주기 때문이다'],
          answer: 2,
          feedback: ['그것은 경쟁적 저해의 특징이에요.', '기질을 늘려 극복되는 것은 경쟁적 저해예요.', '', '저해제는 효소를 늘리지 않아요.'],
          explain: '중금속 이온은 효소 단백질에 결합해 <b>모양을 변화</b>시키므로 활성 부위가 기질과 잘 맞지 않게 돼요. 기질을 더 넣어도 회복되지 않는 <b>비경쟁적 저해</b>와 비슷해요.',
        },
      ],
    },
    {
      title: '되먹임 조절', short: '되먹임 조절', icon: '🔁', phase: '모형',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 저해제가 효소의 일을 막는 두 가지 방식을 보았어요. 세포는 이 원리를 스스로 활용해 <b>필요한 만큼만</b> 물질을 만들어요.</div><p>효소 3개가 이어진 생산 라인(<b>원료 → 중간 물질 1 → 중간 물질 2 → 최종 산물</b>)에서 <b>최종 산물</b>이 많아지면 <b>첫 번째 효소를 저해</b>하는 것을 <b>되먹임 억제</b>라고 해요.</p><p>되먹임이 없을 때와 있을 때를 비교하고, 소비량을 바꾸어 생산이 따라가는지 확인해요. 시간을 빠르게 돌려도 돼요. 수치는 단순화한 예시예요.</p>',
      features: ['feedback'],
      setup() { S.grp = 'none'; setMode('feedback'); S.fb.on = false; S.fb.cons = 5; fbReset(); },
      recap: '되먹임 억제는 최종 산물이 첫 번째 효소를 저해해 생산량을 소비량에 맞춰요. 되먹임이 없으면 최종 산물이 쌓이고 넘쳐 낭비가 생겨요.',
      summary: '<ul><li><b>되먹임 억제(음성 되먹임)</b>: 대사 경로의 <b>최종 산물</b>이 많아지면 <b>첫 번째 효소를 저해</b>해 생산이 줄고, 최종 산물이 소비되어 줄면 저해가 풀려 생산이 다시 늘어요.</li><li>그 결과 <b>필요한 만큼만</b> 만들어 원료와 에너지를 아껴요. 되먹임이 없으면 최종 산물이 쌓이거나 넘쳐 낭비가 생겨요. 예: 아미노산 합성 경로.</li><li>효소 <b>양</b>을 조절하는 방법도 있어요. 필요할 때 유전자가 발현되어 효소가 합성돼요.</li></ul>',
      missions: [
        {
          id: 'loop', title: '되먹임이 있을 때와 없을 때',
          goal: '(1) 되먹임 <b>없음</b>에서 최종 산물이 넘쳐 <b>낭비(30 이상)</b>가 생기는 것을 보고, (2) 되먹임 <b>있음</b>에서 소비가 적을 때와 많을 때(14 이상) <b>생산이 소비를 따라가는지</b> 확인하세요.',
          hint: '먼저 되먹임 없음 상태에서 기다리면 탱크가 넘쳐요(⏩ 4배 속도). 그다음 되먹임 있음으로 바꾸고 소비를 5쯤으로 두어 생산이 소비와 같아지는 것을 보고, 소비를 15 이상으로 올려 또 확인해요.',
          setup() { S.grp = 'none'; setMode('feedback'); S.fb.on = false; S.fb.cons = 5; S.fb.offWaste = false; S.fb.steady = { low: 0, high: 0 }; fbReset(); },
          check: () => S.fb.offWaste && S.fb.steady.low >= 3 && S.fb.steady.high >= 3, hold: 0.4,
          status: () => mark(S.fb.offWaste) + ' 되먹임 없음: 낭비 ' + fi(S.fb.waste) + ' / 30 &nbsp; ' + mark(S.fb.steady.low >= 3) + ' 되먹임 있음 · 소비 적음 &nbsp; ' + mark(S.fb.steady.high >= 3) + ' 소비 많음(14 이상)',
          explain: '되먹임이 <b>없으면</b> 생산이 소비보다 많아 최종 산물이 쌓이다 넘쳐 <b>낭비</b>가 생겨요. 되먹임이 <b>있으면</b> 최종 산물이 많아질 때 첫 효소가 억제되어 <b>생산이 소비에 맞춰져요</b>. 소비가 늘면 억제가 풀려 생산이 다시 늘어요.',
        },
        {
          type: 'quiz', title: '필요한 만큼만 만드는 방법', goal: '세포가 <b>필요한 만큼만</b> 물질을 만들 수 있는 방법은?',
          setup() { S.grp = 'none'; setMode('feedback'); },
          choices: ['원료가 모두 떨어질 때까지 쉬지 않고 만든다', '효소가 한 번 일하면 사라지게 한다', '최종 산물이 경로의 첫 번째 효소를 저해한다', '중간 물질이 마지막 효소를 더 많이 만든다'],
          answer: 2,
          feedback: ['그러면 최종 산물이 쌓이고 낭비가 생겨요.', '효소는 소모되지 않고 재사용돼요.', '', '되먹임 억제는 최종 산물이 첫 효소를 저해하는 방식이에요.'],
          explain: '<b>최종 산물이 첫 번째 효소를 저해</b>하면 최종 산물이 많을 때는 생산이 줄고, 적을 때는 다시 늘어요. 이렇게 생산량이 자동으로 조절돼요.',
        },
      ],
    },
    {
      title: '효소의 중요성 나누기', short: '효소의 중요성', icon: '🗞', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 저해제와 되먹임으로 효소의 일이 조절된다는 것을 배웠어요. 조절이 깨지거나 효소에 이상이 생기면 몸에는 어떤 일이 생길까요?</div><p>이번에는 <b>다양한 매체</b> 중 하나인 <b>카드뉴스</b>로 효소 작용의 중요성을 <b>친구와 소통</b>해 봐요. 소재 8개 중 하나를 골라 <b>문제 → 어떤 효소가 어떻게 영향을 받나 → 몸에서 생기는 일 → 해결·예방</b> 4칸을 완성하고, 친구 카드와 비교해 <b>한 문장</b>에 합의해요.</p><p>입력한 한마디는 <b>이 기기에만</b> 저장되고 약 처방이나 건강 조언은 아니에요.</p>',
      features: ['cards'],
      setup() { S.grp = 'none'; setMode('cards'); },
      recap: '효소는 연속된 반응으로 이어진 대사 경로의 일꾼이라서 한 효소에 이상이 생기면 경로 전체와 몸에 영향을 줘요. 약과 독 물질은 효소를 표적으로 삼아 작용하는 경우가 많아요.',
      summary: '<ul><li><b>효소 이상</b>: 페닐케톤뇨증(페닐알라닌 분해 효소 결핍), 젖당 불내증(락테이스 부족), 소화 효소 결핍 등은 효소가 부족하거나 없어서 생기는 문제예요.</li><li><b>효소를 표적으로 하는 약·독</b>: 설파제(세균의 엽산 합성 효소), 메탄올 중독 치료의 에탄올(경쟁적), 납·시안화물 같은 독(효소 단백질에 결합)이 있어요. 약은 사람 몸에서 특정 효소만 선택적으로 저해하도록 만들어요.</li><li><b>효소는 왜 중요할까?</b> 효소가 생명 활동의 화학 반응을 알맞은 속도로 일으키고 조절해서, 한 효소의 이상이 대사 경로와 몸 전체에 영향을 줄 수 있어요.</li><li>다루지 않는 것: 알로스테릭 효소의 협동성, 저해 상수 계산, 약 이름·처방 정보.</li></ul>',
      missions: [
        {
          id: 'card', title: '카드뉴스 완성하고 합의하기', manual: true,
          goal: '소재를 하나 골라 <b>4칸 카드뉴스</b>를 완성하고, 친구 카드와 비교해 <b>한 문장에 합의</b>하세요.',
          hint: '소재를 고르면 칸마다 문장 3개가 나와요. 그 소재에 맞는 문장을 골라요. 마지막으로 두 카드를 보고 효소가 왜 중요한지 가장 알맞은 문장을 골라요.',
          setup() { S.grp = 'none'; setMode('cards'); },
          check() {
            const c = S.cd; if (c.topic < 0) return '먼저 소재를 골라 주세요.';
            const miss = [0, 1, 2, 3].find((k) => cdPick(k) == null); if (miss != null) return (miss + 1) + '번 칸을 아직 안 골랐어요.';
            const wr = [0, 1, 2, 3].map((k) => cdPick(k) !== 0); c.wrong = wr;
            if (wr.some((x) => x)) return '빨간 칸의 문장은 이 소재의 내용이 아니에요. 소재 이름과 맞는지 다시 읽어 보세요.';
            if (cdConsPick() == null) return '친구 카드와 비교한 뒤 한 문장을 골라 합의해요.';
            c.consWrong = cdConsPick() !== 0;
            if (c.consWrong) return '두 카드의 공통점을 생각해 보세요. 효소 하나에 이상이 생겼을 때 어떤 일이 생겼나요?';
            return true;
          },
          explain: '카드마다 <b>문제 → 효소가 받는 영향 → 몸의 변화 → 해결·예방</b>이 이어져요. 두 카드의 공통점은 <b>효소 하나에 이상이 생겨도 대사 경로와 몸 전체에 영향</b>이 간다는 점이에요.',
        },
        {
          type: 'quiz', title: '효소 결핍의 영향', goal: '대사 경로에서 <b>효소 하나가 결핍</b>되면 경로 전체에 영향을 주는 까닭은?',
          setup() { S.grp = 'none'; setMode('cards'); },
          choices: ['다른 효소가 모두 사라지기 때문이다', '물질이 연속된 반응으로 이어져 있어 한 단계가 막히면 뒤 단계 물질이 부족해지고 앞 단계 물질이 쌓이기 때문이다', '효소가 있는 세포는 모두 죽기 때문이다', '효소가 없으면 물이 생기지 않기 때문이다'],
          answer: 1,
          feedback: ['다른 효소가 사라지는 것은 아니에요.', '', '대부분은 세포가 바로 죽지 않아요.', '물과는 관계가 없어요.'],
          explain: '대사는 <b>연속된 반응</b>이라서 한 단계의 효소가 없으면 앞 단계의 물질(예: 페닐알라닌)이 쌓이고 뒤 단계의 물질은 만들어지지 못해요.',
        },
        {
          type: 'quiz', title: '약과 효소', goal: '많은 약이 <b>특정 효소를 표적</b>으로 삼는 까닭은?',
          setup() { S.grp = 'none'; setMode('cards'); },
          choices: ['효소는 모든 반응에 똑같이 작용하기 때문이다', '효소는 기질 특이성이 있어 특정 효소만 선택적으로 저해하면 다른 반응에 주는 영향을 줄일 수 있기 때문이다', '효소를 저해하면 몸에 에너지가 더 많아지기 때문이다', '효소는 약을 먹으면 자동으로 늘어나기 때문이다'],
          answer: 1,
          feedback: ['효소는 각각 특정한 기질에만 작용해요.', '', '효소를 저해해도 에너지가 늘지는 않아요.', '효소가 자동으로 늘어나지는 않아요.'],
          explain: '효소는 <b>기질 특이성</b>이 있어서 원하는 효소만 선택적으로 저해하는 약을 만들 수 있어요. 예를 들어 설파제는 세균의 효소를 표적으로 삼아 사람 세포에 미치는 영향을 줄여요.',
        },
      ],
    },
  ];

  mdInit(); cdBuild(-1);
  game = SciSim.game({
    simId: 'hy-enzyme-regulation', mount: '#game', badge: '효소 조절 박사', homeHref: '../../index.html#hy',
    featureLabels: { assay: '🧪 저해제 실험 그래프', model: '🔍 저해 입자 모형', feedback: '🔁 되먹임 생산 라인', cards: '🗞 카드뉴스 만들기' },
    onFeatures() { updateCtl(); },
    levels,
  });

  function readouts() {
    const m = S.mode;
    if (m === 'assay') setReads(['지금 조건', CN[S.as.cond], '속도', DATA[S.as.cond][S.as.idx] + ' μmol/분', '측정한 점', asTotal() + ' / 18']);
    else if (m === 'model') setReads(['저해제', S.md.type === 'none' ? '없음' : S.md.type === 'comp' ? '경쟁적' : '비경쟁적', '기질 농도', SL[S.md.idx] + ' mM', '속도', rateModel(S.md.type, SL[S.md.idx]) + ' μmol/분']);
    else if (m === 'feedback') setReads(['생산 속도', fi(S.fb.P) + ' /초', '소비 속도', S.fb.cons + ' /초', '최종 산물', fi(S.fb.L)]);
    else setReads(['소재', S.cd.topic >= 0 ? TOPICS[S.cd.topic].n : '—', '채운 칸', [0, 1, 2, 3].filter((k) => cdPick(k) != null).length + ' / 4', '합의 문장', cdConsPick() != null ? '골랐어요' : '—']);
  }

  setMode('assay');
  let lastFree = false, lastLv = -1, uiT = 0;
  SciSim.loop((dt, t) => {
    clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (game && game.level !== lastLv) { lastLv = game.level; updateCtl(); }
    view.apply(); FX.update(dt); ctx.clearRect(0, 0, VW, VH);
    bgFill('#f3f6ee', '#e8eee2');
    updLater(dt);
    if (S.mode !== 'model') mdUpdate(dt);
    if (S.mode !== 'feedback') fbStep(dt * S.fb.spd);
    if (S.mode === 'assay') asDraw(dt, t); else if (S.mode === 'model') mdDraw(dt, t); else if (S.mode === 'feedback') fbDraw(dt, t); else cdDraw(dt, t);
    FX.draw(); parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(241,246,243,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : approach(S.fade, 0, dt, 9); }
    uiT += dt; if (uiT > 0.25 && S.mode === 'feedback') { uiT = 0; updateCtl(); }
    readouts();
  });

  window.__sim = { S, VW, VH, PHONE, get game() { return game; }, levels, setMode, asMeasure, asAll, asClear, mdSetType, fbStep, fbReset, cdBuild, TOPICS, CONS, updateCtl, asTotal, DATA, SL, mdInit };
})();
