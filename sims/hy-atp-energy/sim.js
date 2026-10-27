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

  /* =========================================================
     고등학교 세포와 물질대사 · Ⅱ. 물질대사와 에너지 - ATP와 에너지 공급 (단원 57, 3차시)
     성취기준 [12세포02-02] 생명 활동에 필요한 에너지를 공급하는 과정에서 광합성과 세포호흡 그리고 ATP의 역할을 설명할 수 있다.
     ① 모형: ATP 모형  ② 분석: 에너지 흐름  ③ 모형: 에너지 연결  ④ 적용: 생명 활동
     ========================================================= */
  const S = { mode: 'atp', fade: 0 };
  let game = null;
  const E_G = 2870, E_ATP = 915, E_HEAT = 1955, E_PHOS = 30.5;
  const later = [];
  const after = (sec, fn) => later.push({ t: sec, fn });
  const clearLater = () => { later.length = 0; };
  function updLater(dt) { for (let i = later.length - 1; i >= 0; i--) { const q = later[i]; q.t -= dt; if (q.t <= 0) { later.splice(i, 1); try { q.fn(); } catch (e) { console.error(e); } } } }
  const fk = (v) => { const r = Math.round(v * 10) / 10; return comma10(r); };
  function comma10(r) { const s = String(r), i = s.indexOf('.'); const ip = i < 0 ? s : s.slice(0, i), fp = i < 0 ? '' : s.slice(i); return ip.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + fp; }

  /* ---------- 공통 그리기 ---------- */
  function drawPi(x, y, r, o) {
    o = o || {};
    ctx.save(); ctx.globalAlpha = o.alpha == null ? 1 : o.alpha;
    if (o.glow) D.glow(x, y, r * 2.2, '#ffb347', 0.7);
    D.sphere(x, y, r, '#f59e0b', { gloss: true, shadow: !o.flat });
    T(x, y + r * 0.36, 'P', r * 1.05, '#fff', 'center', 800);
    ctx.restore();
  }
  function gear(x, y, r, ang, col, teeth) {
    teeth = teeth || 8;
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    ctx.beginPath();
    for (let i = 0; i < teeth; i++) {
      const a = (i / teeth) * TAU, w = TAU / teeth;
      ctx.lineTo(Math.cos(a - w * 0.22) * r * 0.8, Math.sin(a - w * 0.22) * r * 0.8); ctx.lineTo(Math.cos(a - w * 0.14) * r, Math.sin(a - w * 0.14) * r);
      ctx.lineTo(Math.cos(a + w * 0.14) * r, Math.sin(a + w * 0.14) * r); ctx.lineTo(Math.cos(a + w * 0.22) * r * 0.8, Math.sin(a + w * 0.22) * r * 0.8);
    }
    ctx.closePath(); ctx.fillStyle = col; ctx.fill(); ctx.strokeStyle = C.shade(col, -0.35); ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, r * 0.28, 0, TAU); ctx.fillStyle = '#fff'; ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  function bolt(x, y, s, col) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.fillStyle = col || '#facc15'; ctx.strokeStyle = '#a16207'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(2, -12); ctx.lineTo(-7, 2); ctx.lineTo(-1, 2); ctx.lineTo(-4, 12); ctx.lineTo(7, -3); ctx.lineTo(1, -3); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
  }
  function wavy(x1, y, x2, col, amp, t, w) {
    ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = w || 4; ctx.lineCap = 'round'; ctx.beginPath();
    for (let x = x1; x <= x2; x += 2) { const yy = y + Math.sin((x - x1) / 5 + t * 6) * amp; if (x === x1) ctx.moveTo(x, yy); else ctx.lineTo(x, yy); }
    ctx.stroke(); ctx.restore();
  }

  /* =========================================================
     ① ATP 모형
     ========================================================= */
  const AT_P = PHONE ? { x: 10, y: 10, w: 460, h: 300 } : { x: 14, y: 14, w: 772, h: 330 };
  const AT_B = PHONE ? { x: 10, y: 318, w: 460, h: 312 } : { x: 14, y: 354, w: 772, h: 192 };
  const AT_AD = PHONE ? { x: 14, y: 82, w: 96, h: 80 } : { x: 36, y: 100, w: 150, h: 100 };
  const atSlot = (i) => (PHONE ? { x: 156 + i * 72, y: 122 } : { x: 272 + i * 88, y: 150 });
  const atPool = (j) => (PHONE ? { x: 156 + j * 72, y: 246 } : { x: 272 + j * 88, y: 282 });
  const AT_M = PHONE ? { x: 360, y: 60, w: 104, h: 124 } : { x: 556, y: 76, w: 206, h: 150 };
  const atPR = PHONE ? 25 : 31;
  S.at = { n: 0, pool: 3, cyc: 0, dis3: false, busy: false, fly: [], work: 0, workT: 0, drag: null, flame: 0, msg: '', bolts: [], seenEq: 0, hot: false };
  const atName = () => ['아데노신', 'AMP (인산 1개)', 'ADP (인산 2개)', 'ATP (인산 3개)'][S.at.n];
  function atReset() { const a = S.at; a.n = 0; a.pool = 3; a.cyc = 0; a.dis3 = false; a.busy = false; a.fly.length = 0; a.work = 0; a.workT = 0; a.drag = null; a.bolts.length = 0; a.msg = ''; clearLater(); FX.clear(); updateCtl(); }
  function atPoolFirst() { return atPool(3 - S.at.pool); }   // 풀 안에서 가장 오른쪽 구슬을 먼저 써요
  function atAttach(from) {
    const a = S.at;
    if (a.busy || a.n >= 3 || a.pool <= 0) return false;
    a.busy = true; a.pool--;
    const st = from || atPool(a.pool), sl = atSlot(a.n), idx = a.n;
    a.fly.push({ x: st.x, y: st.y, sx: st.x, sy: st.y, tx: sl.x, ty: sl.y, t: 0, dur: RM ? 0.01 : 0.45, kind: 'attach' });
    after(RM ? 0.02 : 0.47, () => {
      a.n = idx + 1; a.busy = false; Sound.click();
      if (a.n >= 2) {
        a.bolts.push({ t: 0, tx: sl.x, ty: sl.y }); a.msg = '에너지를 받아 고에너지 인산 결합이 만들어졌어요 (약 ' + E_PHOS + ' kJ/mol 저장)';
        parts.burst(sl.x, sl.y, { count: 10, colors: ['#facc15', '#f59e0b', '#fff'], speed: 90, life: 0.6, gravity: 0 });
      } else a.msg = '인산기 1개: AMP';
      if (a.n === 3 && a.dis3) { a.cyc++; a.dis3 = false; Sound.success(); a.msg = 'ADP + Pi + 에너지 → ATP 충전! (' + a.cyc + '바퀴)'; }
      updateCtl();
    });
    updateCtl(); return true;
  }
  function atDischarge() {
    const a = S.at;
    if (a.busy || a.n < 2) return false;
    a.busy = true; const idx = a.n - 1, sl = atSlot(idx); const was3 = a.n === 3;
    a.n--; if (was3) a.dis3 = true; a.flame = 1; a.work = 1; a.workT = 0;
    const m = { x: AT_M.x + AT_M.w / 2, y: AT_M.y + AT_M.h + (PHONE ? 22 : 26) };
    a.fly.push({ x: sl.x, y: sl.y, sx: sl.x, sy: sl.y, tx: m.x, ty: m.y, t: 0, dur: RM ? 0.01 : 0.7, kind: 'detach' });
    parts.burst(sl.x, sl.y, { count: 22, colors: ['#ff8a3d', '#ffcf5a', '#ef4444'], speed: 150, life: 0.7, gravity: -30 });
    Sound.tick(); a.msg = was3 ? 'ATP → ADP + Pi + 에너지 (약 ' + E_PHOS + ' kJ/mol): 방출된 에너지로 일을 해요' : 'ADP → AMP + Pi + 에너지';
    after(RM ? 0.05 : 1.9, () => {
      const p = atPool(a.pool); a.fly.push({ x: m.x, y: m.y, sx: m.x, sy: m.y, tx: p.x, ty: p.y, t: 0, dur: RM ? 0.01 : 0.6, kind: 'return' });
      after(RM ? 0.02 : 0.62, () => { a.pool++; a.busy = false; updateCtl(); });
    });
    updateCtl(); return true;
  }
  function atUpdate(dt) {
    const a = S.at;
    a.flame = approach(a.flame, 0, dt, 2.4);
    if (a.work > 0) { a.workT += dt; if (a.workT > 1.5) a.work = 0; }
    for (let i = a.fly.length - 1; i >= 0; i--) { const f = a.fly[i]; f.t += dt; const p = clamp(f.t / f.dur, 0, 1), e = SciSim.ease.inOutCubic(p); f.x = f.sx + (f.tx - f.sx) * e; f.y = f.sy + (f.ty - f.sy) * e - Math.sin(p * Math.PI) * 24; if (f.t >= f.dur) a.fly.splice(i, 1); }
    for (let i = a.bolts.length - 1; i >= 0; i--) { const b = a.bolts[i]; b.t += dt; if (b.t > 0.9) a.bolts.splice(i, 1); }
  }
  function atDraw(dt, t) {
    atUpdate(dt);
    const a = S.at;
    panel(AT_P.x, AT_P.y, AT_P.w, AT_P.h, 18, '#fffdf7');
    T(AT_P.x + 16, AT_P.y + 28, '🔋 ATP 만들기 · 쓰기', L(18, 15.5), '#1f2d44', 'left', 800);
    D.label(AT_P.x + (PHONE ? 330 : 410), AT_P.y + 24, atName(), { bg: ['#64748b', '#0ea5e9', '#f59e0b', '#16a34a'][a.n], size: L(16, 14) });
    // 아데노신 블록: 아데닌(파랑) + 리보스(분홍)
    const ad = AT_AD;
    D.shadow(() => { D.roundRect(ad.x, ad.y, ad.w, ad.h, 16); ctx.fillStyle = '#e8f0fe'; ctx.fill(); }, { blur: 8, y: 3 });
    ctx.strokeStyle = '#6b9bd6'; ctx.lineWidth = 2.5; D.roundRect(ad.x, ad.y, ad.w, ad.h, 16); ctx.stroke();
    const hx = ad.x + ad.w * 0.28, hy = ad.y + ad.h * 0.45, hr = ad.h * 0.3;
    ctx.beginPath(); for (let i = 0; i < 6; i++) { const ang = i / 6 * TAU + Math.PI / 6; const px = hx + Math.cos(ang) * hr, py = hy + Math.sin(ang) * hr; if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); } ctx.closePath(); ctx.fillStyle = '#3b82f6'; ctx.fill(); ctx.strokeStyle = '#1d4ed8'; ctx.lineWidth = 2; ctx.stroke();
    T(hx, hy + 5, 'A', 15, '#fff', 'center', 800);
    const rx = ad.x + ad.w * 0.72, ry = ad.y + ad.h * 0.45;
    ctx.beginPath(); for (let i = 0; i < 5; i++) { const ang = i / 5 * TAU - Math.PI / 2; const px = rx + Math.cos(ang) * hr, py = ry + Math.sin(ang) * hr; if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); } ctx.closePath(); ctx.fillStyle = '#f472b6'; ctx.fill(); ctx.strokeStyle = '#be185d'; ctx.lineWidth = 2; ctx.stroke();
    T(hx, ad.y + ad.h + 18, '아데닌', 13.5, '#1d4ed8', 'center', 800); T(rx, ad.y + ad.h + 18, '리보스', 13.5, '#be185d', 'center', 800);
    T(ad.x + ad.w / 2, ad.y - 8, '아데노신', 14.5, '#334155', 'center', 800);
    // 인산기 사슬
    const sl0 = atSlot(0);
    for (let i = 0; i < 3; i++) {
      const sl = atSlot(i), on = a.n > i;
      ctx.save(); ctx.setLineDash([5, 5]); ctx.strokeStyle = on ? 'rgba(0,0,0,0)' : '#cbd5e1'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(sl.x, sl.y, atPR + 3, 0, TAU); ctx.stroke(); ctx.restore();
      if (!on && i === a.n && !a.busy && a.pool > 0) D.ring(sl.x, sl.y, atPR + 5, t, { color: '#f59e0b' });
      if (on) {
        const prev = i === 0 ? { x: ad.x + ad.w, y: sl.y } : atSlot(i - 1), x1 = prev.x + (i === 0 ? 0 : atPR), x2 = sl.x - atPR;
        if (i === 0) { ctx.strokeStyle = '#64748b'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x1, sl.y); ctx.lineTo(x2, sl.y); ctx.stroke(); }
        else { D.glow((x1 + x2) / 2, sl.y, 26, '#ffb347', 0.5 + 0.2 * Math.sin(t * 5)); wavy(x1, sl.y, x2, '#f97316', 3, t, 4); T((x1 + x2) / 2, sl.y - 14, '~', 18, '#c2410c', 'center', 800); }
        drawPi(sl.x, sl.y, atPR);
      }
    }
    T(atSlot(0).x, atSlot(0).y - atPR - 14, '인산기 1', 13, '#64748b', 'center', 800); T(atSlot(1).x, atSlot(1).y - atPR - 14, '2', 13, '#64748b', 'center', 800); T(atSlot(2).x, atSlot(2).y - atPR - 14, '3', 13, '#64748b', 'center', 800);
    if (a.n >= 2) T(AT_AD.x + AT_AD.w + 2, atSlot(0).y + atPR + (PHONE ? 20 : 26), '~ 고에너지 결합 ' + (a.n - 1) + '개', L(14.5, 13), '#c2410c', 'left', 800);
    // 일하는 반응(근수축)
    const m = AT_M; D.shadow(() => { D.roundRect(m.x, m.y, m.w, m.h, 16); ctx.fillStyle = '#f3e8ff'; ctx.fill(); }, { blur: 8, y: 3 });
    ctx.strokeStyle = '#a855f7'; ctx.lineWidth = 2.5; D.roundRect(m.x, m.y, m.w, m.h, 16); ctx.stroke();
    T(m.x + m.w / 2, m.y + 24, '💪 일하는 반응', L(16, 13.5), '#6b21a8', 'center', 800);
    const prog = a.work > 0 ? clamp(Math.sin(clamp(a.workT / 1.5, 0, 1) * Math.PI), 0, 1) : 0;
    gear(m.x + m.w * 0.3, m.y + m.h * 0.58, L(26, 20), a.work > 0 ? t * 5 : 0, '#c084fc');
    const bw = L(80, 44) - 28 * prog * L(1, 0.5);
    D.roundRect(m.x + m.w * 0.52, m.y + m.h * 0.52, bw, 22, 8); ctx.fillStyle = '#7c3aed'; ctx.fill();
    T(m.x + m.w / 2, m.y + m.h - 12, a.work > 0 ? '에너지를 받아 일해요!' : '멈춰 있어요', 13, a.work > 0 ? '#6b21a8' : '#94a3b8', 'center', 800);
    if (a.flame > 0.02) { ctx.save(); ctx.globalAlpha = a.flame; D.flame(atSlot(Math.max(0, a.n)).x + (a.n >= 0 ? 0 : 0), atSlot(a.n).y + 12, L(46, 34) * a.flame, t); ctx.restore(); }
    // 풀의 인산기
    T(PHONE ? AT_P.x + 16 : atPool(0).x - atPR - 6, atPool(0).y - atPR - 12, PHONE ? '인산기(Pi) 풀 (눌러서 붙여요)' : '인산기(Pi) 풀: 끌어서 붙이거나 눌러요', L(14.5, 13), '#64748b', PHONE ? 'left' : 'left', 800);
    for (let j = 0; j < 3; j++) {
      const p = atPool(j); ctx.save(); ctx.setLineDash([4, 4]); ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x, p.y, atPR + 2, 0, TAU); ctx.stroke(); ctx.restore();
      if (j < a.pool && !(a.drag && a.drag.j === j && a.drag.moved)) { const bob = RM ? 0 : Math.sin(t * 2 + j) * 2; drawPi(p.x, p.y + bob, atPR); }
    }
    if (a.drag && a.drag.moved) drawPi(a.drag.x, a.drag.y, atPR * 1.1, { glow: true });
    a.fly.forEach((f) => drawPi(f.x, f.y, atPR, { glow: f.kind === 'detach', flat: true }));
    // 에너지 공급 번개 (세포호흡)
    a.bolts.forEach((b) => { const p = b.t / 0.9, sx = AT_P.x + AT_P.w * 0.5, sy = AT_P.y + 18; const x = sx + (b.tx - sx) * SciSim.ease.outCubic(p), y = sy + (b.ty - sy) * SciSim.ease.outCubic(p); ctx.save(); ctx.globalAlpha = 1 - p * 0.6; bolt(x, y, 1.6); ctx.restore(); });
    if (a.bolts.length && !PHONE) T(AT_P.x + AT_P.w - 16, AT_P.y + 24, '🔥 세포호흡의 에너지', 13.5, '#b45309', 'right', 800);
    // 아래 패널: 반응식
    const B = AT_B; panel(B.x, B.y, B.w, B.h, 18, '#fff');
    T(B.x + 16, B.y + 28, '반응식 (단순 값)', L(16, 14), '#1f2d44', 'left', 800);
    const ey = B.y + (PHONE ? 72 : 76), fs = L(22, 17);
    const eqs = [['ATP', '#16a34a', a.n === 3], [' ⇌ ', '#475569', true], ['ADP', '#f59e0b', true], [' + ', '#475569', true], ['Pi', '#f59e0b', true], [' + 에너지', '#c2410c', true]];
    ctx.save(); ctx.font = D.font(fs, 800); let wTot = 0; eqs.forEach((q) => { wTot += ctx.measureText(q[0]).width; }); let ex = B.x + B.w / 2 - wTot / 2; ctx.restore();
    eqs.forEach((q) => { ctx.save(); ctx.font = D.font(fs, 800); const w = ctx.measureText(q[0]).width; ctx.restore(); T(ex, ey, q[0], fs, q[1], 'left', 800); ex += w; });
    T(B.x + B.w / 2, ey + 28, '방전: ATP → ADP + Pi + 에너지 (약 ' + E_PHOS + ' kJ/mol)', L(16, 13.5), '#6d28d9', 'center', 800);
    T(B.x + B.w / 2, ey + 52, '충전: ADP + Pi + 에너지(세포호흡) → ATP', L(16, 13.5), '#166534', 'center', 800);
    const sy2 = B.y + (PHONE ? 190 : 150);
    T(B.x + 16, sy2, '충전-방전 한 바퀴: ' + a.cyc + ' / 3', L(17, 15), a.cyc >= 3 ? '#15803d' : '#334155', 'left', 800);
    for (let i = 0; i < 3; i++) { const bx = B.x + (PHONE ? 190 : 230) + i * 44; D.roundRect(bx, sy2 - 18, 36, 20, 7); ctx.fillStyle = a.cyc > i ? '#22c55e' : '#e2e8f0'; ctx.fill(); }
    textBlock(B.x + 16, B.y + (PHONE ? 224 : 172) + (PHONE ? 0 : 0), B.w - 32, a.msg || (a.n === 0 ? '인산기(Pi)를 아데노신 옆에 하나씩 붙여 봐요.' : a.n < 3 ? '인산기를 3개까지 붙이면 ATP가 돼요.' : 'ATP 완성! 이제 인산기를 떼 보세요.'), L(14.5, 13.5), '#475569', 18, 700);
    if (PHONE) textBlock(B.x + 16, B.y + 262, B.w - 32, '한 바퀴: ATP → ADP + Pi (방전) → 다시 ATP (충전)', 13, '#64748b', 17, 700);
  }
  const atPT = {
    down(p) {
      const a = S.at;
      for (let j = 0; j < a.pool; j++) { const pp = atPool(j); if (Math.hypot(p.x - pp.x, p.y - pp.y) < atPR + 8) { a.drag = { j, x: pp.x, y: pp.y, sx: p.x, sy: p.y, moved: false }; Sound.tick(); return true; } }
      return false;
    },
    move(p) { const d = S.at.drag; if (!d) return; if (Math.hypot(p.x - d.sx, p.y - d.sy) > 8) d.moved = true; if (d.moved) { d.x = p.x; d.y = p.y; } },
    up(p) {
      const a = S.at, d = a.drag; a.drag = null; if (!d) return;
      const sl = atSlot(a.n);
      if (!d.moved) { atAttach(atPool(d.j)); return; }
      if (a.n < 3 && Math.hypot(p.x - sl.x, p.y - sl.y) < atPR * 2.4) atAttach({ x: p.x, y: p.y }); else showHint('다음 빈 자리(점선 원)에 놓아요.', 2600);
    },
    hover(p) { const a = S.at; for (let j = 0; j < a.pool; j++) { const pp = atPool(j); if (Math.hypot(p.x - pp.x, p.y - pp.y) < atPR + 8) return 'grab'; } return 'default'; },
  };

  /* =========================================================
     ② 에너지 흐름
     ========================================================= */
  S.fl = { mol: 1.0, light: true, g: new Num(E_G), a: new Num(E_ATP), h: new Num(E_HEAT), ok: false, fade: new Num(1) };
  const FL_P = PHONE ? { x: 10, y: 10, w: 460, h: 364 } : { x: 14, y: 14, w: 772, h: 378 };
  const FL_B = PHONE ? { x: 10, y: 382, w: 460, h: 248 } : { x: 14, y: 400, w: 772, h: 146 };
  const flBoxes = () => (PHONE
    ? { A: { x: 20, y: 40, w: 210, h: 72 }, B: { x: 20, y: 152, w: 210, h: 70 }, C: { x: 20, y: 262, w: 210, h: 84 }, ATP: { x: 300, y: 254, w: 150, h: 48 }, HEAT: { x: 300, y: 312, w: 150, h: 48 } }
    : { A: { x: 34, y: 70, w: 200, h: 170 }, B: { x: 312, y: 90, w: 160, h: 130 }, C: { x: 550, y: 70, w: 190, h: 170 }, ATP: { x: 440, y: 302, w: 150, h: 70 }, HEAT: { x: 620, y: 302, w: 130, h: 70 } });
  const flSc = (kJ) => kJ * (PHONE ? 26 : 40) / (E_G * 2);
  const hd = (w, k) => Math.min(PHONE ? 20 : 30, Math.max(10, w * k));
  function flDraw(dt, t) {
    const f = S.fl; f.g.set(E_G * f.mol); f.a.set(E_ATP * f.mol); f.h.set(E_HEAT * f.mol); ['g', 'a', 'h'].forEach((k) => f[k].update(dt, 7)); f.fade.set(f.light ? 1 : 0); f.fade.update(dt, 6);
    const B = flBoxes(), P = FL_P;
    panel(P.x, P.y, P.w, P.h, 18, '#fbfff8');
    T(P.x + 16, P.y + 26, '식물 세포의 에너지 흐름 (포도당 ' + fix1(f.mol) + ' mol = ' + Math.round(180 * f.mol) + ' g)', L(16.5, 13.5), '#1f2d44', 'left', 800);
    // 박스
    const box = (r, col, fill, title, sub, on) => { ctx.save(); ctx.globalAlpha = on == null ? 1 : 0.45 + 0.55 * on; D.shadow(() => { D.roundRect(r.x, r.y, r.w, r.h, 16); ctx.fillStyle = fill; ctx.fill(); }, { blur: 7, y: 2 }); D.roundRect(r.x, r.y, r.w, r.h, 16); ctx.strokeStyle = col; ctx.lineWidth = 2.5; ctx.stroke(); ctx.restore(); };
    box(B.A, '#f59e0b', '#fff8e1', '', '', f.fade.v);
    box(B.B, '#0ea5e9', '#e8f6fd'); box(B.C, '#16a34a', '#e8f8ee'); box(B.ATP, '#16a34a', '#dcfce7'); box(B.HEAT, '#ef6a3c', '#fde8dd');
    // 광합성 상자
    const ax = B.A.x + B.A.w / 2;
    E('☀️', B.A.x + 26, B.A.y + 28, PHONE ? 26 : 34); ctx.save(); ctx.globalAlpha = 0.4 + 0.6 * f.fade.v;
    T(B.A.x + (PHONE ? 50 : 56), B.A.y + (PHONE ? 26 : 34), '광합성 (엽록체)', L(17, 14.5), '#a16207', 'left', 800);
    T(B.A.x + 12, B.A.y + (PHONE ? 52 : 70), f.light ? '빛에너지 → 화학 에너지' : '빛이 없어 멈춰요', L(14.5, 13), f.light ? '#a16207' : '#b91c1c', 'left', 800);
    if (!PHONE) { T(B.A.x + 12, B.A.y + 96, '6CO₂ + 6H₂O + 빛에너지', 14, '#475569', 'left', 700); T(B.A.x + 12, B.A.y + 118, '→ C₆H₁₂O₆ + 6O₂', 14, '#475569', 'left', 700); T(B.A.x + 12, B.A.y + 150, '빛이 있을 때만 일어나요', 13.5, '#a16207', 'left', 800); }
    else T(B.A.x + 12, B.A.y + 70, '빛이 있을 때만 일어나요', 13, '#a16207', 'left', 800);
    ctx.restore();
    if (!f.light && !RM) { ctx.save(); ctx.fillStyle = 'rgba(30,41,59,.18)'; D.roundRect(B.A.x, B.A.y, B.A.w, B.A.h, 16); ctx.fill(); ctx.restore(); }
    // 포도당 상자
    T(B.B.x + B.B.w / 2, B.B.y + 26, '포도당', L(17, 14.5), '#0369a1', 'center', 800);
    T(B.B.x + B.B.w / 2, B.B.y + (PHONE ? 46 : 50), 'C₆H₁₂O₆ ' + fix1(f.mol) + ' mol', L(15, 13.5), '#334155', 'center', 800);
    T(B.B.x + B.B.w / 2, B.B.y + (PHONE ? 64 : 76), '화학 에너지 ' + fk(f.g.v) + ' kJ', L(15.5, 13.5), '#0369a1', 'center', 800);
    if (!PHONE) T(B.B.x + B.B.w / 2, B.B.y + 104, (f.light ? '방금 만든 포도당' : '저장해 둔 포도당'), 13.5, '#64748b', 'center', 700);
    // 세포호흡 상자
    T(B.C.x + (PHONE ? 12 : 14), B.C.y + (PHONE ? 26 : 34), '세포호흡 (미토콘드리아)', L(16.5, 14), '#166534', 'left', 800);
    T(B.C.x + 12, B.C.y + (PHONE ? 50 : 62), f.light ? '밤낮 항상 일어나요' : '식물 세포도 세포호흡을 해요', L(14.5, 13), '#15803d', 'left', 800);
    if (!PHONE) { T(B.C.x + 12, B.C.y + 96, 'C₆H₁₂O₆ + 6O₂', 14, '#475569', 'left', 700); T(B.C.x + 12, B.C.y + 118, '→ 6CO₂ + 6H₂O + 에너지', 14, '#475569', 'left', 700); T(B.C.x + 12, B.C.y + 150, '산소를 써서 포도당을 분해', 13.5, '#166534', 'left', 700); }
    else T(B.C.x + 12, B.C.y + 74, '포도당 + O₂ → CO₂ + H₂O', 13, '#475569', 'left', 700);
    // 출력 상자 글자
    T(B.ATP.x + B.ATP.w / 2, B.ATP.y + (PHONE ? 20 : 28), 'ATP에 저장', L(16, 13.5), '#166534', 'center', 800);
    T(B.ATP.x + B.ATP.w / 2, B.ATP.y + (PHONE ? 38 : 54), fk(f.a.v) + ' kJ', L(18, 14.5), '#15803d', 'center', 800);
    T(B.HEAT.x + B.HEAT.w / 2, B.HEAT.y + (PHONE ? 20 : 28), '열로 방출', L(16, 13.5), '#9a3412', 'center', 800);
    T(B.HEAT.x + B.HEAT.w / 2, B.HEAT.y + (PHONE ? 38 : 54), fk(f.h.v) + ' kJ', L(18, 14.5), '#c2410c', 'center', 800);
    // 화살표 (폭은 에너지에 비례)
    const wg = flSc(f.g.v), wa = flSc(f.a.v), wh = flSc(f.h.v);
    if (!PHONE) {
      D.arrow(B.A.x + B.A.w + 6, B.A.y + 90, B.B.x - 6, B.B.y + 66, { color: f.light ? '#f59e0b' : '#cbd5e1', width: Math.max(0.5, wg * f.fade.v), head: hd(wg, 1.2), dash: f.light ? null : [6, 6] });
      D.arrow(B.B.x + B.B.w + 6, B.B.y + 66, B.C.x - 6, B.C.y + 90, { color: '#0ea5e9', width: wg, head: hd(wg, 1.2) });
      D.arrow(B.C.x + 50, B.C.y + B.C.h + 4, B.ATP.x + B.ATP.w * 0.5 + 40, B.ATP.y - 4, { color: '#22a35a', width: wa, head: hd(wa, 1.4) });
      D.arrow(B.C.x + 120, B.C.y + B.C.h + 4, B.HEAT.x + B.HEAT.w * 0.5, B.HEAT.y - 4, { color: '#ef6a3c', width: wh, head: hd(wh, 1.4) });
      T(B.A.x + B.A.w + 12, B.A.y + 70, fk(E_G * f.mol * f.fade.v) + ' kJ', 13.5, f.light ? '#a16207' : '#94a3b8', 'left', 800);
    } else {
      D.arrow(B.A.x + 105, B.A.y + B.A.h + 4, B.B.x + 105, B.B.y - 4, { color: f.light ? '#f59e0b' : '#cbd5e1', width: Math.max(0.5, wg * f.fade.v), head: hd(wg, 1.2), dash: f.light ? null : [6, 6] });
      D.arrow(B.B.x + 105, B.B.y + B.B.h + 4, B.C.x + 105, B.C.y - 4, { color: '#0ea5e9', width: wg, head: hd(wg, 1.2) });
      D.arrow(B.C.x + B.C.w + 4, B.C.y + 30, B.ATP.x - 4, B.ATP.y + 23, { color: '#22a35a', width: wa, head: hd(wa, 1.4) });
      D.arrow(B.C.x + B.C.w + 4, B.C.y + 62, B.HEAT.x - 4, B.HEAT.y + 23, { color: '#ef6a3c', width: wh, head: hd(wh, 1.4) });
      textBlock(300, 52, 160, f.light ? '빛이 있으면 광합성으로 포도당을 만들고, 세포호흡은 항상 해요.' : '빛이 없으면 광합성은 멈추고, 저장한 포도당으로 세포호흡을 해요.', 13.5, '#475569', 19, 700);
      T(300, 150, '화살표 폭 = 에너지 크기', 13, '#64748b', 'left', 700);
    }
    if (!PHONE) { textBlock(B.A.x, B.A.y + B.A.h + 20, 250, f.light ? '☀ 빛이 있어요. 두 과정이 모두 일어나요.' : '🌙 빛이 없어요. 광합성은 멈추고 세포호흡만 계속돼요.', 14, '#475569', 19, 800); T(P.x + 16, P.y + P.h - 12, '화살표 폭 = 에너지 크기 (같은 눈금)', 13, '#64748b', 'left', 700); }
    if (f.ok) D.label(B.ATP.x + B.ATP.w / 2, B.ATP.y - 16, '≈ 32 %가 ATP로!', { bg: '#16a34a', size: 13.5 });
    // 아래 패널: 발효 비교
    panel(FL_B.x, FL_B.y, FL_B.w, FL_B.h, 18, '#fff');
    T(FL_B.x + 16, FL_B.y + 26, '비교: 포도당 1 mol로 만드는 ATP', L(16, 14), '#1f2d44', 'left', 800);
    const bx = FL_B.x + (PHONE ? 126 : 130), bw = FL_B.w - (PHONE ? 126 : 130) - (PHONE ? 110 : 230), rows = [['세포호흡', 30, '#16a34a', '약 30 mol (915 kJ, 약 32 %)'], ['발효(산소 없음)', 2, '#a855f7', '2 mol (61 kJ, 약 2 %)']];
    rows.forEach((q, i) => {
      const y = FL_B.y + (PHONE ? 48 : 40) + i * (PHONE ? 38 : 32), w = bw * q[1] / 30;
      T(FL_B.x + 16, y + 15, q[0], L(15, 13.5), '#334155', 'left', 800);
      D.roundRect(bx, y + 2, w, 18, 5); ctx.fillStyle = q[2]; ctx.fill();
      if (PHONE) T(bx, y + 36, q[3], 13, q[2], 'left', 800); else T(bx + w + 8, y + 16, q[3], 13.5, q[2], 'left', 800);
    });
    if (PHONE) {
      textBlock(FL_B.x + 16, FL_B.y + 148, FL_B.w - 32, '계산 예: ATP로 저장된 비율 = ATP 에너지 / 포도당 에너지', 14, '#334155', 19, 800);
      textBlock(FL_B.x + 16, FL_B.y + 190, FL_B.w - 32, '🔗 생명과학 Ⅰ에서는 100 → ATP 40 + 열 60으로 단순화했어요. 실제 계산값은 약 32 %예요(교과서에 따라 약 34~40 %).', 13.5, '#64748b', 19, 700);
    } else textBlock(FL_B.x + 16, FL_B.y + 116, FL_B.w - 32, '🔗 생명과학 Ⅰ에서는 100 → ATP 40 + 열 60으로 단순화했어요. 포도당 1 mol로 계산하면 약 32 %예요(교과서에 따라 약 34~40 %).', 13.5, '#64748b', 19, 700);
  }

  /* =========================================================
     ③ 에너지 연결 (커플링)
     ========================================================= */
  const MACH = [
    { id: 'prot', name: '단백질 합성', note: '아미노산을 이어요', col: '#3b82f6', icon: '🧬' },
    { id: 'pump', name: '능동 수송', note: '세포막 펌프', col: '#14b8a6', icon: '🚰' },
    { id: 'muscle', name: '근수축', note: '근육이 줄어들어요', col: '#a855f7', icon: '💪' },
  ];
  S.cp = { tok: [], run: { prot: 0, pump: 0, muscle: 0, charge: 0 }, cnt: { prot: 0, pump: 0, muscle: 0, charge: 0 }, conn: {}, drag: null, sel: null, msg: '', hot: null };
  const CP_ATP = PHONE ? { x: 10, y: 10, w: 280, h: 118 } : { x: 276, y: 56, w: 250, h: 140 };
  const CP_ADP = PHONE ? { x: 10, y: 160, w: 280, h: 118 } : { x: 276, y: 340, w: 250, h: 140 };
  const CP_CH = PHONE ? { x: 10, y: 296, w: 280, h: 164 } : { x: 24, y: 232, w: 224, h: 250 };
  const cpMach = (i) => (PHONE ? { x: 300, y: 10 + i * 150, w: 170, h: 140 } : { x: 566, y: 30 + i * 170, w: 208, h: 156 });
  const CP_X = PHONE ? { x: 10, y: 468, w: 460, h: 162 } : null;
  const TOKW = PHONE ? 62 : 72, TOKH = PHONE ? 38 : 42;
  function cpInit() {
    S.cp.tok = [0, 1, 2].map((i) => ({ id: i, k: 'ATP', x: 0, y: 0, busy: false, shake: 0, lift: 0, vis: 1 }));
    cpLayout(true);
  }
  function cpHome(tk) { const box = tk.k === 'ATP' ? CP_ATP : CP_ADP, list = S.cp.tok.filter((q) => q.k === tk.k && !q.busy), i = list.indexOf(tk); const per = Math.max(1, Math.floor((box.w - 12) / (TOKW + 8))); return { x: box.x + 10 + (i % per) * (TOKW + 8), y: box.y + 44 + Math.floor(i / per) * (TOKH + 8) }; }
  function cpLayout(instant) { S.cp.tok.forEach((tk) => { if (tk.busy || (S.cp.drag && S.cp.drag.tk === tk && S.cp.drag.moved)) return; const h = cpHome(tk); if (instant || RM) { tk.x = h.x; tk.y = h.y; } else SciSim.tween(tk, { x: h.x, y: h.y }, { duration: 0.4, ease: 'outBack' }); }); }
  function cpReset() { S.cp.run = { prot: 0, pump: 0, muscle: 0, charge: 0 }; S.cp.cnt = { prot: 0, pump: 0, muscle: 0, charge: 0 }; S.cp.conn = {}; S.cp.drag = null; S.cp.sel = null; S.cp.msg = ''; clearLater(); cpInit(); updateCtl(); }
  function cpUse(tk, mid) {
    const c = S.cp, i = MACH.findIndex((m) => m.id === mid), r = cpMach(i), key = mid;
    if (tk.k !== 'ATP') { tk.shake = 1; Sound.fail(); c.msg = 'ADP는 에너지를 줄 수 없어요. 먼저 세포호흡에서 충전해요.'; showHint(c.msg, 3200); cpLayout(); return; }
    if (c.run[key] > 0) { cpLayout(); return; }
    tk.busy = true; c.run[key] = 1e-4; SciSim.tween(tk, { x: r.x + 14, y: r.y + r.h - TOKH - 10 }, { duration: RM ? 0.01 : 0.35, ease: 'outCubic' });
    c.sel = null; Sound.click();
    after(RM ? 0.05 : 0.4, () => { parts.burst(r.x + 40, r.y + r.h - 30, { count: 10, colors: ['#ffcf5a', '#ff8a3d'], speed: 90, life: 0.6, gravity: 0 }); });
    after(RM ? 0.1 : 2.0, () => { tk.k = 'ADP'; tk.busy = false; c.run[key] = 0; c.cnt[key]++; c.conn[key] = true; c.msg = '「' + MACH[i].name + '」: ATP → ADP + Pi로 인산기가 떨어지며 에너지를 전달했어요.'; Sound.success(); cpLayout(); updateCtl(); });
    cpLayout(); updateCtl();
  }
  function cpCharge(tk) {
    const c = S.cp, r = CP_CH;
    if (tk.k !== 'ADP') { tk.shake = 1; Sound.fail(); c.msg = '이미 ATP예요. 에너지를 쓰고 ADP가 된 뒤에 충전해요.'; showHint(c.msg, 3200); cpLayout(); return; }
    if (c.run.charge > 0) { cpLayout(); return; }
    tk.busy = true; c.run.charge = 1e-4; SciSim.tween(tk, { x: r.x + r.w / 2 - TOKW / 2, y: r.y + r.h - TOKH - 12 }, { duration: RM ? 0.01 : 0.35, ease: 'outCubic' });
    c.sel = null; Sound.click();
    after(RM ? 0.1 : 1.9, () => { tk.k = 'ATP'; tk.busy = false; c.run.charge = 0; c.cnt.charge++; c.conn.charge = true; c.msg = '세포호흡(에너지 방출)의 에너지로 ADP + Pi → ATP(에너지 흡수 반응)가 합성됐어요.'; Sound.success(); cpLayout(); updateCtl(); });
    cpLayout(); updateCtl();
  }
  function cpDrop(tk, p) {
    for (let i = 0; i < MACH.length; i++) if (inRect(p.x, p.y, cpMach(i))) { cpUse(tk, MACH[i].id); return; }
    if (inRect(p.x, p.y, CP_CH)) { cpCharge(tk); return; }
    cpLayout();
  }
  const cpPT = {
    down(p) {
      const tks = S.cp.tok;
      for (let i = tks.length - 1; i >= 0; i--) { const tk = tks[i]; if (!tk.busy && inRect(p.x, p.y, { x: tk.x, y: tk.y, w: TOKW, h: TOKH })) { S.cp.drag = { tk, dx: p.x - tk.x, dy: p.y - tk.y, sx: p.x, sy: p.y, moved: false }; Sound.tick(); SciSim.tween(tk, { x: tk.x, y: tk.y }, { duration: 0.0001 }); return true; } }
      // 눌러서 쓰기: 선택한 토큰이 있으면 눌린 곳으로
      if (S.cp.sel) { const tk = S.cp.sel; for (let i = 0; i < MACH.length; i++) if (inRect(p.x, p.y, cpMach(i))) { cpUse(tk, MACH[i].id); return false; } if (inRect(p.x, p.y, CP_CH)) { cpCharge(tk); return false; } S.cp.sel = null; }
      return false;
    },
    move(p) { const d = S.cp.drag; if (!d) return; if (Math.hypot(p.x - d.sx, p.y - d.sy) > 8) d.moved = true; if (d.moved) { d.tk.x = clamp(p.x - d.dx, 0, VW - TOKW); d.tk.y = clamp(p.y - d.dy, 0, VH - TOKH); S.cp.hot = MACH.findIndex((m, i) => inRect(p.x, p.y, cpMach(i))); if (inRect(p.x, p.y, CP_CH)) S.cp.hot = 9; } },
    up(p) { const d = S.cp.drag; S.cp.drag = null; S.cp.hot = null; if (!d) return; if (!d.moved) { S.cp.sel = S.cp.sel === d.tk ? null : d.tk; cpLayout(); return; } cpDrop(d.tk, p); },
    hover(p) { return S.cp.tok.some((tk) => !tk.busy && inRect(p.x, p.y, { x: tk.x, y: tk.y, w: TOKW, h: TOKH })) ? 'grab' : 'default'; },
  };
  function tokenDraw(tk, o) {
    o = o || {};
    const atp = tk.k === 'ATP', sel = S.cp.sel === tk, lift = tk.lift;
    ctx.save(); ctx.translate(tk.x + TOKW / 2 + (tk.shake > 0 && !RM ? Math.sin(clock * 60) * 4 * tk.shake : 0), tk.y + TOKH / 2 - lift * 4); ctx.scale(1 + lift * 0.07, 1 + lift * 0.07);
    D.shadow(() => { D.roundRect(-TOKW / 2, -TOKH / 2, TOKW, TOKH, 12); ctx.fillStyle = atp ? '#22c55e' : '#e2e8f0'; ctx.fill(); }, { blur: 5 + lift * 8, y: 2 + lift * 3 });
    D.roundRect(-TOKW / 2, -TOKH / 2, TOKW, TOKH, 12); ctx.strokeStyle = sel ? '#f59e0b' : atp ? '#15803d' : '#94a3b8'; ctx.lineWidth = sel ? 4 : 2.2; ctx.stroke();
    if (atp) { T(-TOKW / 2 + (PHONE ? 23 : 28), 6, 'ATP', PHONE ? 13.5 : 16, '#fff', 'center', 800); drawPi(TOKW / 2 - 15, 0, 9, { flat: true }); }
    else { T(-TOKW / 2 + (PHONE ? 20 : 22), 5, 'ADP', PHONE ? 13 : 14.5, '#475569', 'center', 800); drawPi(TOKW / 2 - 12, 0, 8, { flat: true, alpha: 0.9 }); T(TOKW / 2 - 24, 4, '+', 13, '#64748b', 'center', 800); }
    ctx.restore();
  }
  function cpMachDraw(i, t) {
    const m = MACH[i], r = cpMach(i), run = S.cp.run[m.id] > 0, hot = S.cp.hot === i;
    const prog = run ? clamp((S.cp.run[m.id] - 0) / 1.6, 0, 1) : 0;
    D.shadow(() => { D.roundRect(r.x, r.y, r.w, r.h, 16); ctx.fillStyle = C.rgba(m.col, hot ? 0.28 : 0.1); ctx.fill(); }, { blur: 6, y: 2 });
    D.roundRect(r.x, r.y, r.w, r.h, 16); ctx.strokeStyle = C.rgba(m.col, hot || run ? 1 : 0.65); ctx.lineWidth = hot || run ? 3.5 : 2.4; ctx.stroke();
    E(m.icon, r.x + 26, r.y + 28, 26); T(r.x + 48, r.y + 33, m.name, L(17, 15), C.shade(m.col, -0.3), 'left', 800);
    if (!PHONE) T(r.x + 12, r.y + 56, m.note, 13.5, '#64748b', 'left', 700);
    const ang = run ? t * 5 : 0;
    if (PHONE) gear(r.x + r.w - 32, r.y + 56, 19, ang, m.col, 8);
    else { gear(r.x + r.w - 44, r.y + 72, 24, ang, m.col, 8); gear(r.x + r.w - 84, r.y + 94, 14, -ang * 1.6 + 0.2, C.shade(m.col, 0.25), 7); }
    T(r.x + 12, r.y + (PHONE ? 84 : 96), run ? '▶ 진행 중' : '⏸ ATP 필요', 13.5, run ? '#15803d' : '#94a3b8', 'left', 800);
    if (S.cp.cnt[m.id] > 0) T(r.x + r.w - 12, r.y + 20, '✔ ' + S.cp.cnt[m.id] + '회', 13.5, '#15803d', 'right', 800);
    if (!run && !PHONE) T(r.x + r.w - 12, r.y + r.h - 12, '← ATP를 놓아요', 13, '#94a3b8', 'right', 700);
  }
  function cpDraw(dt, t) {
    const c = S.cp; ['prot', 'pump', 'muscle', 'charge'].forEach((k) => { if (c.run[k] > 0) c.run[k] += dt; });
    c.tok.forEach((tk) => { tk.lift = approach(tk.lift, c.drag && c.drag.tk === tk && c.drag.moved ? 1 : 0, dt, 14); tk.shake = Math.max(0, tk.shake - dt * 3); });
    if (!PHONE) panel(14, 14, 772, 532, 18, '#fbfdfb');
    // 상자
    [[CP_ATP, 'ATP 보관함 (에너지 있음)', '#16a34a'], [CP_ADP, 'ADP + Pi 보관함 (에너지 없음)', '#64748b']].forEach((q) => { const b = q[0]; D.roundRect(b.x, b.y, b.w, b.h, 14); ctx.fillStyle = C.rgba(q[2], 0.1); ctx.fill(); ctx.setLineDash([7, 5]); ctx.strokeStyle = C.rgba(q[2], 0.7); ctx.lineWidth = 2; ctx.stroke(); ctx.setLineDash([]); T(b.x + 12, b.y + 28, q[1], L(15, 13.5), C.shade(q[2], -0.3), 'left', 800); });
    // 충전기 (세포호흡)
    const ch = CP_CH, run = c.run.charge > 0, hot = c.hot === 9;
    D.shadow(() => { D.roundRect(ch.x, ch.y, ch.w, ch.h, 16); ctx.fillStyle = hot ? '#fde8c8' : '#fff1de'; ctx.fill(); }, { blur: 6, y: 2 });
    D.roundRect(ch.x, ch.y, ch.w, ch.h, 16); ctx.strokeStyle = run || hot ? '#ea580c' : '#f59e0b'; ctx.lineWidth = run || hot ? 3.5 : 2.4; ctx.stroke();
    T(ch.x + 12, ch.y + 28, '🔥 세포호흡', L(18, 15.5), '#9a3412', 'left', 800);
    T(ch.x + 12, ch.y + 50, '포도당 분해 = 에너지 방출 반응', L(14, 13), '#9a3412', 'left', 700);
    T(ch.x + 12, ch.y + 70, '이 에너지로 ATP를 합성해요', L(14, 13), '#9a3412', 'left', 700);
    const gl = run ? 1 - clamp(c.run.charge / 1.6, 0, 1) : 1;
    for (let q = 0; q < 6; q++) { D.sphere(ch.x + 30 + (q % 3) * 22, ch.y + (PHONE ? 100 : 112) + Math.floor(q / 3) * 20, 8 * (0.35 + 0.65 * gl), '#fff', { gloss: true, outline: '#cbd5e1' }); }
    if (run) { D.flame(ch.x + ch.w - 50, ch.y + ch.h - 36, 30, t); bolt(ch.x + ch.w / 2 + Math.sin(t * 9) * 6, ch.y + ch.h - 60, 1.2); }
    T(ch.x + ch.w / 2, ch.y + ch.h - 4, '← ADP를 끌어다 놓아요', 13, '#c2410c', 'center', 700);
    if (c.cnt.charge > 0) T(ch.x + ch.w - 12, ch.y + 28, '✔ ' + c.cnt.charge + '회', 13.5, '#15803d', 'right', 800);
    // 기계
    MACH.forEach((m, i) => cpMachDraw(i, t));
    // 화살표 (순환)
    if (!PHONE) {
      D.arrow(CP_ATP.x + CP_ATP.w + 4, CP_ATP.y + 70, 560, CP_ATP.y + 70, { color: '#16a34a', width: 3, head: 11, dash: [6, 5] });
      D.arrow(560, CP_ADP.y + 70, CP_ADP.x + CP_ADP.w + 4, CP_ADP.y + 70, { color: '#64748b', width: 3, head: 11, dash: [6, 5] });
      D.arrow(CP_ADP.x - 4, CP_ADP.y + 70, ch.x + ch.w + 4, ch.y + ch.h * 0.7, { color: '#64748b', width: 3, head: 11, dash: [6, 5] });
      D.arrow(ch.x + ch.w * 0.5, ch.y - 4, CP_ATP.x - 4, CP_ATP.y + 70, { color: '#ea580c', width: 3, head: 11, dash: [6, 5] });
      T(404, 36, 'ATP 에너지를 쓰는 반응(에너지 흡수)', 14, '#475569', 'center', 800);
      T(150, 36, '에너지를 내놓는 반응', 14, '#9a3412', 'center', 800);
    } else {
      D.arrow(CP_ATP.x + CP_ATP.w - 20, CP_ATP.y + CP_ATP.h + 4, CP_ATP.x + CP_ATP.w - 20, CP_ADP.y - 4, { color: '#94a3b8', width: 2.5, head: 9, dash: [6, 5] });
      D.arrow(CP_ADP.x + 60, CP_ADP.y + CP_ADP.h + 4, CP_ADP.x + 60, CP_CH.y - 4, { color: '#64748b', width: 2.5, head: 9, dash: [6, 5] });
    }
    c.tok.forEach((tk) => { if (!(c.drag && c.drag.tk === tk)) tokenDraw(tk); });
    if (c.drag) tokenDraw(c.drag.tk);
    if (PHONE) {
      const X = CP_X; panel(X.x, X.y, X.w, X.h, 16, '#fff'); T(X.x + 14, X.y + 26, '💡 에너지 연결', 15, '#1f2d44', 'left', 800);
      textBlock(X.x + 14, X.y + 50, X.w - 28, c.msg || 'ATP 토큰을 눌러 고르고 기계를 누르거나, 끌어다 놓아요. ATP 없이는 기계가 멈춰요.', 14, '#475569', 19, 700);
    } else {
      D.roundRect(276, 206, 250, 120, 12); ctx.fillStyle = '#fff'; ctx.fill();
      textBlock(286, 232, 232, c.msg || 'ATP를 기계에 놓으면 인산기가 떨어지며 에너지를 전달해요. ADP는 세포호흡 충전기로 보내요.', 13.5, '#475569', 19, 700);
    }
  }

  /* =========================================================
     ④ 생명 활동
     ========================================================= */
  const ORG = [
    { id: 'plant', name: '식물', icon: '🌿', start: 'sun', use: 'synth' },
    { id: 'muscle', name: '근육 세포', icon: '🏃', start: 'food', use: 'move' },
    { id: 'yeast', name: '효모 (산소 없는 반죽)', short: '효모', icon: '🍞', start: 'ferm', use: 'div' },
    { id: 'firefly', name: '반딧불이', icon: '✨', start: 'food', use: 'light' },
    { id: 'vent', name: '심해 열수구 세균', short: '열수구 세균', icon: '🌋', start: 'chem', use: 'synth' },
  ];
  const STARTS = { sun: { n: '햇빛 (광합성)', ic: '☀️' }, food: { n: '먹이의 유기물 (세포호흡)', ic: '🍖' }, ferm: { n: '포도당 분해, 산소 없이 (발효)', ic: '🫧' }, chem: { n: '무기물의 화학 에너지', ic: '⚗️' } };
  const USES = { synth: { n: '물질 합성 · 생장', ic: '🧱' }, move: { n: '근수축 (운동)', ic: '💪' }, light: { n: '발광 (빛 내기)', ic: '💡' }, div: { n: '세포 분열 · 출아', ic: '🧫' } };
  const USEBARS = [{ id: 'run', n: '달리기 중 근수축', v: 100 }, { id: 'walk', n: '빨리 걷기 중 근수축', v: 45 }, { id: 'divn', n: '세포 분열 중 합성', v: 20 }, { id: 'pump', n: '쉴 때 능동 수송', v: 14 }, { id: 'nerve', n: '쉴 때 신경 신호 전도', v: 10 }, { id: 'rest', n: '쉬는 근육 세포', v: 3 }];
  S.lf = { pick: null, seen: {} };
  const LF_O = (i) => (PHONE ? { x: 10, y: 10 + i * 74, w: 460, h: 68 } : { x: 14 + i * 156, y: 14, w: 148, h: 300 });
  const LF_B = PHONE ? { x: 10, y: 388, w: 460, h: 242 } : { x: 14, y: 324, w: 772, h: 222 };
  const lfBar = (i) => { const p = LF_B, rowH = PHONE ? 30 : 29, y = p.y + (PHONE ? 52 : 50) + i * rowH; return { x: p.x + 12, y: y - 4, w: p.w - 24, h: rowH - 2, bx: p.x + (PHONE ? 150 : 232), by: y, bw: p.w - (PHONE ? 150 : 232) - (PHONE ? 70 : 90) }; };
  const lfOk = () => ORG.every((o) => selVal('ls_' + o.id) === o.start && selVal('lu_' + o.id) === o.use);
  function lfDraw(dt, t) {
    ORG.forEach((o, i) => {
      const r = LF_O(i), ss = selVal('ls_' + o.id), su = selVal('lu_' + o.id), okS = ss === o.start, okU = su === o.use;
      panel(r.x, r.y, r.w, r.h, 16, '#fff');
      if (!PHONE) {
        E(o.icon, r.x + r.w / 2, r.y + 38, 38); TF(r.x + r.w / 2, r.y + 78, o.short || o.name, r.w - 12, 15.5, 12, '#1f2d44', 'center', 800);
        const cell = (y, lab, key, ok, icon, txt) => { D.roundRect(r.x + 8, y, r.w - 16, 86, 12); ctx.fillStyle = ok ? '#dcfce7' : '#f1f5f9'; ctx.fill(); ctx.strokeStyle = ok ? '#16a34a' : '#cbd5e1'; ctx.lineWidth = 2; ctx.stroke(); T(r.x + r.w / 2, y + 18, lab, 13, '#64748b', 'center', 800); if (icon) E(icon, r.x + r.w / 2, y + 42, 24); else T(r.x + r.w / 2, y + 52, '고르기 전', 13, '#94a3b8', 'center', 700); if (txt) { const w = wrap(txt, r.w - 24, 12.5, 800); w.slice(0, 2).forEach((l, q) => T(r.x + r.w / 2, y + 64 + q * 14, l, 12.5, '#334155', 'center', 800)); } };
        cell(r.y + 90, '① 에너지 출발점', 'start', okS, STARTS[ss] && STARTS[ss].ic, STARTS[ss] && STARTS[ss].n);
        D.arrow(r.x + r.w / 2, r.y + 180, r.x + r.w / 2, r.y + 198, { color: '#16a34a', width: 3, head: 9 });
        cell(r.y + 202, '② ATP를 쓰는 곳', 'use', okU, USES[su] && USES[su].ic, USES[su] && USES[su].n);
      } else {
        E(o.icon, r.x + 28, r.y + 36, 32); TF(r.x + 52, r.y + 28, o.short || o.name, 100, 14.5, 12, '#1f2d44', 'left', 800);
        const sx = r.x + 150;
        [[ss, okS, STARTS], [su, okU, USES]].forEach((q, k) => { const x = sx + k * 152 - (k ? 0 : 0); D.roundRect(x, r.y + 8, 144, 52, 10); ctx.fillStyle = q[1] ? '#dcfce7' : '#f1f5f9'; ctx.fill(); ctx.strokeStyle = q[1] ? '#16a34a' : '#cbd5e1'; ctx.lineWidth = 2; ctx.stroke(); if (q[2][q[0]]) { E(q[2][q[0]].ic, x + 18, r.y + 34, 20); const w = wrap(q[2][q[0]].n, 100, 12.5, 800).slice(0, 2); w.forEach((l, z) => T(x + 34, r.y + 28 + z * 15, l, 12.5, '#334155', 'left', 800)); } else T(x + 72, r.y + 38, k ? '② 쓰는 곳' : '① 출발점', 13, '#94a3b8', 'center', 700); });
        D.arrow(sx - 30, r.y + 34, sx - 4, r.y + 34, { color: '#16a34a', width: 2.5, head: 8 });
      }
    });
    // ATP 사용량 비교
    const p = LF_B; panel(p.x, p.y, p.w, p.h, 16, '#fff');
    T(p.x + 14, p.y + 26, '🔋 ATP 사용량 비교 (예시 상대값) — 가장 많이 쓰는 활동을 눌러요', L(15.5, 13), '#1f2d44', 'left', 800);
    USEBARS.forEach((b, i) => {
      const r = lfBar(i), sel = S.lf.pick === b.id;
      if (sel) { D.roundRect(r.x, r.y, r.w, r.h, 8); ctx.fillStyle = 'rgba(245,158,11,.18)'; ctx.fill(); ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 2; ctx.stroke(); }
      T(r.x + 6, r.by + 16, b.n, L(14, 13), '#334155', 'left', 700);
      D.roundRect(r.bx, r.by + 3, Math.max(0.1, r.bw * b.v / 100), 15, 4); ctx.fillStyle = b.v >= 100 ? '#ef6a3c' : '#22a35a'; ctx.fill();
      T(r.bx + r.bw * b.v / 100 + 6, r.by + 16, String(b.v), 13.5, '#334155', 'left', 800);
    });
    T(p.x + p.w - 14, p.y + p.h - 8, '교육용 단순 비교 · 단위: 상대값', 13, '#94a3b8', 'right', 700);
  }
  const lfPT = {
    down(p) { USEBARS.forEach((b, i) => { if (inRect(p.x, p.y, lfBar(i))) { S.lf.pick = b.id; Sound.click(); updateCtl(); } }); return false; },
    hover(p) { return USEBARS.some((b, i) => inRect(p.x, p.y, lfBar(i))) ? 'pointer' : 'default'; },
  };

  /* =========================================================
     화면 전환 · 조작 연결
     ========================================================= */
  const PTS = { atp: atPT, flow: null, couple: cpPT, life: lfPT };
  function setMode(m) { if (S.mode !== m) S.fade = 1; S.mode = m; PT = PTS[m] || null; hideHint(); updateCtl(); }
  const ctlNodes = $$('#ctrlCard .control');
  const flOk = () => near(numIn('inPct'), 32, 0.6) && S.fl.mol > 0;
  function updateCtl() {
    const fr = game ? game.free : false, lvNow = game ? game.level : 0;
    ctlNodes.forEach((n) => { n.hidden = (n.dataset.modes || '').split(' ').indexOf(S.mode) < 0; });
    modeButtons(S.mode, lvNow, fr);
    const a = S.at;
    $('#atDis').disabled = a.busy || a.n < 2; $('#atChg').disabled = a.busy || a.n >= 3 || a.pool <= 0;
    $('#atChg').textContent = a.n === 0 ? '➕ 인산기 붙이기' : '⚡ 에너지 주고 붙이기';
    $('#atNote').innerHTML = '지금: <b>' + atName() + '</b> · 한 바퀴 <b>' + a.cyc + '</b> / 3';
    $('#oMol').textContent = fix1(S.fl.mol) + ' mol (' + Math.round(180 * S.fl.mol) + ' g)'; $('#sMol').value = S.fl.mol;
    chipSet($('#lightSeg'), S.fl.light ? 'on' : 'off');
    S.fl.ok = flOk(); $('#inPct').classList.toggle('ok', flOk()); $('#inHeat').classList.toggle('ok', near(numIn('inHeat'), E_HEAT * 0.5, 1) && S.fl.mol === 0.5);
    $('#flNote').innerHTML = '포도당 <b>' + fix1(S.fl.mol) + ' mol</b>: 화학 에너지 ' + fk(E_G * S.fl.mol) + ' kJ → ATP ' + fk(E_ATP * S.fl.mol) + ' kJ + 열 ' + fk(E_HEAT * S.fl.mol) + ' kJ';
    $('#cpNote').innerHTML = '연결한 곳: ' + [['prot', '단백질 합성'], ['pump', '능동 수송'], ['muscle', '근수축'], ['charge', 'ATP 합성']].map((q) => (S.cp.conn[q[0]] ? '✅ ' : '⬜ ') + q[1]).join(' · ');
    ORG.forEach((o) => { $('#ls_' + o.id).classList.toggle('ok', selVal('ls_' + o.id) === o.start); $('#lu_' + o.id).classList.toggle('ok', selVal('lu_' + o.id) === o.use); });
    $('#lfNote').innerHTML = '가장 많이 쓰는 활동: <b>' + (S.lf.pick ? USEBARS.find((b) => b.id === S.lf.pick).n : '아직 안 골랐어요') + '</b>';
  }
  bindModeSeg(setMode);
  $('#atDis').addEventListener('click', atDischarge);
  $('#atChg').addEventListener('click', () => atAttach());
  $('#atReset').addEventListener('click', () => { Sound.click(); atReset(); });
  $('#sMol').addEventListener('input', (e) => { S.fl.mol = Math.round(+e.target.value * 10) / 10; updateCtl(); });
  $$('#lightSeg button').forEach((b) => b.addEventListener('click', () => { S.fl.light = b.dataset.v === 'on'; Sound.click(); updateCtl(); }));
  $('#inPct').addEventListener('input', updateCtl); $('#inHeat').addEventListener('input', updateCtl);
  $('#cpReset').addEventListener('click', () => { Sound.click(); cpReset(); });
  ORG.forEach((o) => { $('#ls_' + o.id).addEventListener('change', updateCtl); $('#lu_' + o.id).addEventListener('change', updateCtl); });
  $('#lfReset').addEventListener('click', () => { Sound.click(); ORG.forEach((o) => { $('#ls_' + o.id).value = ''; $('#lu_' + o.id).value = ''; }); S.lf.pick = null; updateCtl(); });

  /* =========================================================
     미션
     ========================================================= */
  const levels = [
    {
      title: 'ATP 모형', short: 'ATP 모형', icon: '🔋', phase: '모형',
      intro: '<p class="si-q">❓ 탐구 질문: 식물이 햇빛으로 만든 양분에서 내 근육이 쓰는 에너지는 어떻게 이어질까?</p><p>🔗 <b>생명과학 Ⅰ</b>에서 ATP를 에너지를 충전하고 방전하는 배터리로 배웠어요. 이번에는 ATP의 <b>구조</b>를 블록으로 직접 만들어 봐요. ATP는 <b>아데노신(아데닌 + 리보스)에 인산기 3개</b>가 붙은 분자예요.</p><p>끝의 인산기가 떨어지면 <b>ATP ⇌ ADP + Pi + 에너지</b>(약 30.5 kJ/mol, 단순 값)가 방출되고, 그 에너지로 다른 반응이 일어나요.</p>',
      features: ['atp'],
      setup() { setMode('atp'); },
      recap: 'ATP는 아데노신에 인산기 3개가 붙은 분자예요. 끝 인산기가 떨어지면 ADP + Pi + 에너지(약 30.5 kJ/mol)가 나오고, 세포호흡의 에너지로 다시 ATP가 합성돼요. 한 분자가 하루에 1000번 넘게 재활용돼요.',
      summary: '<ul><li><b>ATP</b> = 아데노신(아데닌 + 리보스) + 인산기 3개. 인산기가 1개면 AMP, 2개면 ADP예요.</li><li><b>ATP ⇌ ADP + Pi + 에너지</b> (약 30.5 kJ/mol, 단순 값). 인산기가 떨어질 때 에너지가 방출되어 다른 반응에 쓰여요. 세포호흡의 에너지로 ADP + Pi → ATP로 <b>재합성</b>(충전)돼요.</li><li>세포 속 ATP는 약 50 g뿐이지만 하루에 만들고 분해하는 ATP 총량은 약 60 kg이라 ATP 한 분자가 <b>하루에 1000번 이상</b> 재활용돼요 (60 kg / 50 g = 1200). 그래서 ATP는 저장 물질보다 에너지를 즉시 전달하는 <b>화폐</b>에 가까워요.</li></ul>',
      missions: [
        {
          id: 'cycle', title: 'ATP ⇌ ADP + Pi 세 바퀴',
          goal: '인산기 3개를 붙여 ATP를 만든 뒤, <b>방전(인산기 떼기) → 충전(다시 붙이기)</b>을 3번 반복하세요.',
          hint: '인산기를 끌어다 점선 원에 하나씩 놓아요. ATP가 되면 ✂ 인산기 떼기 → ⚡ 에너지 주고 붙이기를 눌러요. 한 바퀴 = 방전 + 충전.',
          setup() { atReset(); setMode('atp'); },
          check: () => S.at.cyc >= 3 && S.at.n === 3 && !S.at.busy, hold: 0.8,
          status: () => mark(S.at.n === 3 || S.at.cyc > 0) + ' ATP 만들기 &nbsp; ' + mark(S.at.cyc >= 3) + ' 충전-방전 ' + S.at.cyc + ' / 3바퀴',
          explain: 'ATP → ADP + Pi 방전에서 약 <b>30.5 kJ/mol</b>이 방출되어 일하는 반응에 쓰이고, ADP + Pi + 에너지(세포호흡) → ATP 충전으로 다시 만들어요. 이 한 바퀴가 세포 안에서 쉬지 않고 돌아요.',
        },
        {
          type: 'quiz', title: 'ATP는 왜 화폐일까?',
          goal: 'ATP가 에너지를 오래 저장하는 물질보다 <b>에너지를 즉시 전달하는 화폐</b>에 가까운 까닭은?',
          setup() { setMode('atp'); },
          choices: ['세포 속 양이 매우 적고 끊임없이 분해 · 재합성되며 빠르게 재활용되기 때문이다', '한 번 만들어지면 평생 세포 안에 쌓여 있기 때문이다', '식물에서만 만들어지기 때문이다', '인산기가 한 번 떨어지면 다시 붙지 않기 때문이다'],
          answer: 0,
          feedback: ['', 'ATP는 약 50 g뿐이고 계속 재합성돼요.', '모든 생물이 ATP를 써요.', 'ADP + Pi로 다시 ATP가 만들어져요.'],
          explain: '세포 속 ATP는 성인 기준 약 50 g뿐이지만 계속 <b>분해되고 재합성</b>되면서 에너지를 전달해요. 포도당 같은 물질이 장기 저장고라면 ATP는 바로 쓰는 화폐예요.',
        },
        {
          type: 'quiz', title: 'ATP의 재활용',
          goal: '세포 속 ATP는 약 50 g이지만 하루에 만들고 분해하는 ATP는 약 60 kg이에요. ATP 한 분자는 하루에 약 몇 번 재활용될까요?',
          setup() { setMode('atp'); },
          choices: ['약 12번', '약 120번', '약 1200번 (60 kg / 50 g)', '약 12000번'],
          answer: 2,
          feedback: ['60 kg = 60000 g이에요. 60000 / 50을 계산해 보세요.', '60000 / 50 = 1200이에요.', '', '60000 / 50은 12000이 아니에요.'],
          explain: '60 kg = 60000 g이므로 60000 g / 50 g = <b>1200</b>번이에요. 하루에 한 분자가 1000번 이상 충전과 방전을 반복하는 셈이에요.',
        },
      ],
    },
    {
      title: '에너지 흐름', short: '에너지 흐름', icon: '🌞', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> ATP가 충전되고 방전되는 것을 보았어요. 충전의 에너지는 어디서 올까요?</div><p><b>광합성</b>은 빛에너지를 포도당의 화학 에너지로 저장하고(물질 합성 · 에너지 저장), <b>세포호흡</b>은 포도당을 분해해 ATP를 만들어요(물질 분해 · 에너지 생성). 포도당 1 mol(180 g)에는 약 <b>2870 kJ</b>이 담겨 있어요.</p>',
      features: ['flow'],
      setup() { setMode('flow'); },
      recap: '광합성은 빛에너지를 포도당의 화학 에너지(1 mol당 약 2870 kJ)로 저장하고, 세포호흡은 이를 분해해 약 32 %(915 kJ)를 ATP에, 나머지를 열에 나눠요. 식물 세포도 세포호흡을 해요.',
      summary: '<ul><li><b>광합성</b>: 6CO₂ + 6H₂O + 빛에너지 → C₆H₁₂O₆ + 6O₂. 빛에너지를 포도당(1 mol = 180 g)의 <b>화학 에너지(약 2870 kJ)</b>로 저장해요. 빛이 있을 때만 일어나요.</li><li><b>세포호흡</b>: C₆H₁₂O₆ + 6O₂ → 6CO₂ + 6H₂O + 에너지. 포도당 1 mol에서 <b>ATP 약 30 mol(915 kJ) + 열 1955 kJ</b>. ATP로 저장되는 비율 = 915 / 2870 ≈ <b>32 %</b>(교과서에 따라 약 34~40 %).</li><li>식물 세포도 <b>항상</b> 세포호흡을 해요. 발효는 포도당 1 mol당 ATP 2 mol(61 kJ, 약 2 %).</li><li>에너지는 만들어지는 것이 아니라 <b>형태가 바뀌어</b> 흘러요. (생명과학 Ⅰ의 40 : 60은 단순화한 값이에요.)</li></ul>',
      missions: [
        {
          id: 'flow', title: 'ATP로 얻는 에너지 계산',
          goal: '포도당 1 mol에서 ATP로 저장되는 <b>에너지 비율(%)</b>을 구하고, 포도당 <b>0.5 mol</b>일 때 <b>열 에너지(kJ)</b>를 입력하세요.',
          hint: '비율은 ATP 에너지 / 포도당 에너지 = 915 / 2870이에요. 슬라이더를 0.5 mol로 맞추면 화살표 옆에 열 에너지가 나와요.',
          setup() { S.fl.mol = 1; S.fl.light = true; $('#inPct').value = ''; $('#inHeat').value = ''; setMode('flow'); },
          check: () => flOk() && S.fl.mol === 0.5 && near(numIn('inHeat'), E_HEAT * 0.5, 1), hold: 0.6,
          status: () => mark(flOk()) + ' ATP 비율 ≈ 32 % &nbsp; ' + mark(S.fl.mol === 0.5) + ' 0.5 mol &nbsp; ' + mark(S.fl.mol === 0.5 && near(numIn('inHeat'), E_HEAT * 0.5, 1)) + ' 열 977.5 kJ',
          explain: '915 / 2870 ≈ 0.319, 즉 약 <b>32 %</b>가 ATP에 저장돼요(생명과학 Ⅰ의 40 %는 단순화한 값). 포도당 0.5 mol이면 에너지가 절반이라 열 = 1955 × 0.5 = <b>977.5 kJ</b>이에요.',
        },
        {
          type: 'quiz', title: '광합성은 에너지를 만들까?',
          goal: '"광합성은 에너지를 <b>만들어 낸다</b>"는 설명에서 고쳐야 할 점은?',
          setup() { setMode('flow'); },
          choices: ['고칠 곳이 없다', '에너지를 새로 만드는 것이 아니라 빛에너지를 화학 에너지로 바꿔 저장한다', '광합성은 에너지를 방출하는 과정이다', '광합성은 동물 세포에서 일어난다'],
          answer: 1,
          feedback: ['에너지는 새로 생기지 않아요.', '', '광합성은 에너지를 흡수해 저장해요.', '광합성은 엽록체가 있는 식물 · 조류 · 남세균에서 일어나요.'],
          explain: '에너지는 <b>생기거나 사라지지 않고</b> 형태만 바뀌어요. 광합성은 빛에너지를 포도당의 화학 에너지로 <b>전환하여 저장</b>하는 과정이에요.',
        },
        {
          type: 'quiz', title: '모두 ATP가 될까?',
          goal: '세포호흡으로 방출된 에너지는 <b>모두 ATP</b>가 될까요?',
          setup() { setMode('flow'); },
          choices: ['모두 ATP가 된다', '일부(약 32 %)만 ATP가 되고 나머지는 열로 방출된다', '모두 열이 된다', 'ATP가 되는 비율은 광합성보다 항상 낮다'],
          answer: 1,
          feedback: ['915 kJ만 ATP에 저장돼요.', '', 'ATP에도 약 32 %가 저장돼요.', '광합성과 세포호흡의 비율을 같은 기준으로 비교하지 않아요.'],
          explain: '포도당 1 mol의 2870 kJ 중 약 <b>915 kJ(32 %)</b>가 ATP에 저장되고 나머지 <b>1955 kJ</b>는 열로 방출돼요. 이 열은 체온 유지에 쓰여요.',
        },
      ],
    },
    {
      title: '에너지 연결', short: '에너지 연결', icon: '⚙️', phase: '모형',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 세포호흡의 에너지 일부가 ATP에 담기는 것을 계산했어요.</div><p>세포 안에는 <b>에너지를 흡수해야 진행되는 반응</b>(단백질 합성, 능동 수송, 근수축)이 많아요. 이 반응들은 ATP의 인산기가 떨어지며 내놓는 에너지와 <b>연결(커플링)</b>되어야 일어나요. 반대로 ATP 합성은 에너지를 흡수하는 반응이라서 <b>에너지를 방출하는 세포호흡</b>과 연결돼요.</p>',
      features: ['couple'],
      setup() { setMode('couple'); cpReset(); },
      recap: '에너지를 흡수하는 반응(단백질 합성, 능동 수송, 근수축, ATP 합성)은 에너지를 방출하는 반응(ATP 분해, 세포호흡)과 연결되어야 일어나요. ATP 없이는 정지, 공급하면 진행돼요.',
      summary: '<ul><li><b>에너지 연결(커플링)</b>: ATP가 인산기를 전달하며 내놓는 에너지로 에너지를 흡수하는 반응(단백질 합성, 능동 수송, 근수축)이 진행돼요. ATP 없이는 멈춰요.</li><li>반대로 <b>ADP + Pi → ATP</b>는 에너지를 흡수하는 반응이라서, 에너지를 방출하는 <b>세포호흡</b>(포도당 분해)과 연결되어 일어나요.</li><li><b>ATP를 합성</b>하는 과정: 세포호흡, 광합성의 명반응. <b>ATP를 소비</b>하는 과정: 근수축, 능동 수송, 합성 반응(단백질 합성).</li></ul>',
      missions: [
        {
          id: 'couple', title: '반응과 ATP 연결 4개',
          goal: 'ATP를 <b>단백질 합성 · 능동 수송 · 근수축</b>에 하나씩 연결하고, ADP를 <b>세포호흡 충전기</b>에도 연결하세요.',
          hint: 'ATP 토큰을 끌어다 기계에 놓아요(눌러서 고른 뒤 기계를 눌러도 돼요). ATP가 ADP가 되면 세포호흡 충전기로 보내 다시 ATP로 만들어요.',
          setup() { setMode('couple'); cpReset(); },
          check: () => ['prot', 'pump', 'muscle', 'charge'].every((k) => S.cp.conn[k]), hold: 0.6,
          status: () => ['prot', 'pump', 'muscle', 'charge'].map((k, i) => mark(!!S.cp.conn[k]) + ' ' + ['단백질 합성', '능동 수송', '근수축', '세포호흡 충전'][i]).join(' &nbsp; '),
          explain: 'ATP의 인산기가 떨어지면서 내놓은 에너지가 <b>단백질 합성 · 능동 수송 · 근수축</b>을 진행시켜요(에너지 흡수 반응과 연결). 생긴 ADP + Pi는 <b>세포호흡</b>(에너지 방출 반응)의 에너지로 다시 ATP가 돼요.',
        },
        {
          type: 'quiz', title: 'ATP를 합성하는 과정은?',
          goal: '다음 중 <b>ATP를 합성</b>하는 과정은?',
          setup() { setMode('couple'); },
          choices: ['세포호흡', '근수축', '능동 수송', '단백질 합성'],
          answer: 0,
          feedback: ['', '근수축은 ATP를 소비해요.', '능동 수송은 ATP를 소비해요.', '단백질 합성은 ATP를 소비해요.'],
          explain: '<b>세포호흡</b>(과 광합성의 명반응)은 ATP를 <b>합성</b>하고, 근수축 · 능동 수송 · 단백질 합성은 ATP를 <b>소비</b>해요.',
        },
      ],
    },
    {
      title: '생명 활동', short: '생명 활동', icon: '🌍', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> ATP가 에너지를 흡수하는 반응과 연결되는 것을 보았어요.</div><p>모든 생물은 <b>같은 ATP</b>를 쓰지만 에너지의 <b>출발점</b>은 달라요. 식물 · 근육 세포 · 효모 · 반딧불이 · 심해 열수구 세균의 <b>에너지 출발점</b>과 <b>ATP를 쓰는 곳</b>을 맞춰 보고, 활동마다 ATP를 얼마나 쓰는지도 비교해요.</p>',
      features: ['life'],
      setup() { setMode('life'); },
      recap: '모든 생물은 같은 ATP를 에너지 전달 물질로 써요. 식물은 햇빛, 동물은 먹이, 효모는 발효, 열수구 세균은 무기물에서 에너지를 얻어 ATP를 만들고, 근수축 · 발광 · 합성 등에 써요.',
      summary: '<ul><li>에너지 출발점: 식물 = <b>햇빛</b>(광합성 → 포도당 → 세포호흡), 근육 세포 · 반딧불이 = <b>먹이의 유기물</b>(세포호흡), 효모(산소 없음) = 포도당 <b>발효</b>, 심해 열수구 세균 = <b>무기물</b>(황화수소 등)의 화학 에너지.</li><li>ATP 쓰임: 식물 · 열수구 세균 = 물질 합성 · 생장, 근육 세포 = 근수축, 반딧불이 = 발광, 효모 = 출아(세포 분열).</li><li>광합성의 산물(포도당 · O₂)이 세포호흡의 재료이고, 세포호흡의 산물(CO₂ · H₂O)이 광합성의 재료예요.</li><li>호흡을 못 하면 ATP가 부족해져 에너지를 많이 쓰는 활동부터 멈춰요. 달리기 근수축이 ATP를 가장 많이 써요(예시).</li></ul>',
      missions: [
        {
          id: 'life', title: '생물의 에너지 지도', manual: true,
          goal: '생물 5종의 <b>에너지 출발점</b>과 <b>ATP를 쓰는 곳</b>을 고르고, ATP를 가장 많이 쓰는 활동도 눌러서 고르세요.',
          hint: '식물은 햇빛, 동물은 먹이예요. 효모(산소 없는 반죽)는 발효, 열수구 세균은 햇빛이 닿지 않아 무기물을 써요. 막대 그래프에서 가장 긴 막대를 눌러요.',
          setup() { setMode('life'); ORG.forEach((o) => { $('#ls_' + o.id).value = ''; $('#lu_' + o.id).value = ''; }); S.lf.pick = null; updateCtl(); },
          check() {
            const miss = ORG.find((o) => !selVal('ls_' + o.id) || !selVal('lu_' + o.id));
            if (miss) return '모든 생물의 출발점과 ATP 쓰임을 골라 주세요. (' + miss.name + ')';
            const bad = ORG.find((o) => selVal('ls_' + o.id) !== o.start || selVal('lu_' + o.id) !== o.use);
            if (bad) return (bad.short || bad.name) + '의 ' + (selVal('ls_' + bad.id) !== bad.start ? '에너지 출발점' : 'ATP 쓰임') + '을 다시 생각해 보세요.';
            if (!S.lf.pick) return '막대 그래프에서 ATP를 가장 많이 쓰는 활동을 눌러 골라 주세요.';
            if (S.lf.pick !== 'run') return '막대가 가장 긴 활동을 눌러 보세요. 몸을 움직일 때 ATP를 많이 써요.';
            return true;
          },
          explain: '식물은 <b>햇빛</b> → 광합성 → 포도당 → 세포호흡 → ATP, 근육 세포와 반딧불이는 <b>먹이</b> → 세포호흡 → ATP, 효모는 산소 없이 포도당을 <b>발효</b>해 ATP(소량), 심해 열수구 세균은 황화수소 같은 <b>무기물</b>의 에너지로 ATP를 만들어요. 모두 같은 ATP로 합성 · 근수축 · 발광 · 분열에 써요. 달리기 근수축이 ATP를 가장 많이 써요(예시).',
        },
        {
          type: 'quiz', title: '호흡을 못 하는 상황',
          goal: '세포가 세포호흡을 하지 못하는 상황에서 <b>가장 먼저</b> 겪는 문제는?',
          setup() { setMode('life'); },
          choices: ['ATP가 부족해진다', '포도당이 모두 사라진다', '광합성이 더 활발해진다', '세포가 커진다'],
          answer: 0,
          feedback: ['', '포도당이 사라지는 것이 아니라 ATP를 못 만들어요.', '동물 세포에는 광합성이 없고, 식물도 ATP를 만들어야 해요.', '세포 크기와 관계없어요.'],
          explain: '세포 속 ATP는 아주 적어서 세포호흡이 막히면 <b>ATP가 부족</b>해지고, 에너지를 많이 쓰는 근수축 · 신경 신호 전도 같은 활동부터 멈춰요.',
        },
        {
          type: 'quiz', title: '광합성과 세포호흡의 관계',
          goal: '광합성과 세포호흡의 관계를 바르게 설명한 것은?',
          setup() { setMode('life'); },
          choices: ['서로 아무 관계가 없다', '한쪽의 산물이 다른 쪽의 재료가 된다 (포도당 · O₂ ↔ CO₂ · H₂O)', '둘 다 에너지를 흡수한다', '식물에서는 세포호흡이 일어나지 않는다'],
          answer: 1,
          feedback: ['광합성의 산물이 세포호흡의 재료가 돼요.', '', '세포호흡은 에너지를 방출해요.', '식물 세포도 세포호흡을 해요.'],
          explain: '광합성의 산물 <b>포도당과 O₂</b>가 세포호흡의 재료이고, 세포호흡의 산물 <b>CO₂와 H₂O</b>가 광합성의 재료예요. 모든 생물이 ATP라는 공통 에너지 전달 물질을 써요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hy-atp-energy', mount: '#game', badge: 'ATP 에너지 배달부', homeHref: '../../index.html#hy',
    featureLabels: { atp: '🔋 ATP 블록 만들기', flow: '🌞 에너지 흐름도', couple: '⚙️ 에너지 연결 기계', life: '🌍 생물의 에너지 지도' },
    onFeatures() { updateCtl(); },
    levels,
  });

  function readouts() {
    const m = S.mode;
    if (m === 'atp') setReads(['분자', atName().split(' ')[0], '충전-방전', S.at.cyc + ' / 3바퀴', '1회 방출 에너지', E_PHOS + ' kJ/mol']);
    else if (m === 'flow') setReads(['포도당', fix1(S.fl.mol) + ' mol', 'ATP 에너지', fk(E_ATP * S.fl.mol) + ' kJ', '열 에너지', fk(E_HEAT * S.fl.mol) + ' kJ']);
    else if (m === 'couple') setReads(['ATP 토큰', S.cp.tok.filter((q) => q.k === 'ATP').length + '개', 'ADP 토큰', S.cp.tok.filter((q) => q.k === 'ADP').length + '개', '연결한 곳', ['prot', 'pump', 'muscle', 'charge'].filter((k) => S.cp.conn[k]).length + ' / 4']);
    else setReads(['맞춘 생물', ORG.filter((o) => selVal('ls_' + o.id) === o.start && selVal('lu_' + o.id) === o.use).length + ' / 5', '고른 활동', S.lf.pick ? USEBARS.find((b) => b.id === S.lf.pick).n : '—', '공통 전달 물질', 'ATP']);
  }

  cpInit();
  setMode('atp');
  let lastFree = false, lastLv = -1;
  SciSim.loop((dt, t) => {
    clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (game && game.level !== lastLv) { lastLv = game.level; updateCtl(); }
    view.apply(); FX.update(dt); ctx.clearRect(0, 0, VW, VH);
    bgFill('#f3f6ee', '#e8eee2');
    if (S.mode !== 'atp') atUpdate(dt);
    updLater(dt);
    if (S.mode === 'atp') atDraw(dt, t); else if (S.mode === 'flow') flDraw(dt, t); else if (S.mode === 'couple') cpDraw(dt, t); else lfDraw(dt, t);
    FX.draw(); parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(241,246,243,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : approach(S.fade, 0, dt, 9); }
    readouts();
  });

  window.__sim = { S, VW, VH, PHONE, get game() { return game; }, levels, setMode, atAttach, atDischarge, atReset, atSlot, atPool, cpUse, cpCharge, cpReset, cpMach, CP_CH, MACH, ORG, USEBARS, lfBar, updateCtl, flOk, atPR };
})();
