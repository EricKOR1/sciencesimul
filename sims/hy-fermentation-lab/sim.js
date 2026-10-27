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
     고등학교 세포와 물질대사 · Ⅲ. 세포호흡과 광합성 - 발효 실험과 사례 조사 (단원 58, 5차시)
     성취기준 [12세포03-04] 산소호흡과 발효의 공통점과 차이점을 이해하고, 실생활에서 발효를 이용한 사례 조사 계획을 세워 조사할 수 있다.
     ① 실험: 발효 관찰  ② 탐구: 실험 설계  ③ 분석: 결과 분석  ④ 적용: 조사 계획
     (자료는 모두 가상의 예시 자료예요)
     ========================================================= */
  const S = { mode: 'obs', fade: 0 };
  let game = null;
  const fi = (v) => String(Math.round(v));
  const ease = SciSim.ease;
  const seg = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
  const r1 = (v) => Math.round(v * 10) / 10;
  let dtL = 0.016;

  /* ---------- 자료 (20분간 CO₂ 부피 mL, 3회 평균) ---------- */
  const BASEC = { temp: 35, glu: 10, yeast: 1, o2: 0 };
  const FAC = {
    temp: { name: '온도', icon: '🌡', unit: '°C', levels: [20, 30, 35, 45, 55], mean: [8, 16, 18, 12, 2], fmt: (v) => v + ' °C', ymax: 20, base: '35 °C', xl: '온도 (°C)', opt: 35 },
    glu: { name: '포도당 농도', icon: '🍬', unit: '%', levels: [2, 5, 10, 20, 40], mean: [7, 13, 18, 18, 8], fmt: (v) => v + ' %', ymax: 20, base: '10 %', xl: '포도당 농도 (%)' },
    yeast: { name: '효모 양', icon: '🍞', unit: 'g', levels: [0.5, 1, 1.5, 2, 3], mean: [9, 18, 26.5, 35, 52], fmt: (v) => v + ' g', ymax: 60, base: '1 g', xl: '효모 양 (g)' },
    o2: { name: '산소 공급', icon: '💨', unit: '', levels: [0, 1, 2, 3, 4], mean: [18, 17, 16, 15, 14], grow: [100, 125, 150, 175, 200], fmt: (v) => ['밀폐', '약하게', '보통', '세게', '아주 세게'][v], ymax: 20, base: '밀폐', xl: '공기를 불어넣는 세기' },
  };
  const FKEYS = ['temp', 'glu', 'yeast', 'o2'];
  /* 시간 곡선: 처음에는 빠르고 포도당이 줄고 에탄올이 쌓이면 느려져요 (20분에서 1) */
  const TK = 18, f20 = 1 - Math.exp(-20 / TK);
  const fT = (t) => (1 - Math.exp(-clamp(t, 0, 20) / TK)) / f20;
  /* 한 조건의 세 번 측정값 (평균이 표의 값과 정확히 같게) */
  function trials(m) { if (m === 0) return [0, 0, 0]; const a = r1(m * 0.96), b = r1(m * 1.03), c = r1(3 * m - a - b); return [a, b, c]; }
  const CAUSE = {
    act: '효소의 활성이 높아져서', den: '효소가 변성되어서', osm: '삼투로 효모 세포에서 물이 빠져나가서', sat: '기질이 포화되어 더 늘어도 일정해서',
    sub: '기질(포도당)이 많아져서 반응이 빨라져서', amt: '효소를 가진 효모의 양이 늘어서', resp: '산소호흡이 함께 일어나 발효가 줄어서', atp: '호흡이 같은 포도당에서 ATP 를 더 많이 만들어서',
    no: '먹이(포도당)가 없어서', noy: '발효할 효모가 없어서',
  };
  const READ = {
    temp: [{ q: '20 °C에서 35 °C까지 CO₂가 늘어난 까닭', ans: 'act', opts: ['act', 'den', 'sat', 'osm'] }, { q: '45 °C에서 55 °C로 가며 CO₂가 급격히 준 까닭', ans: 'den', opts: ['act', 'den', 'sat', 'osm'] }],
    glu: [{ q: '2 %에서 10 %까지 CO₂가 늘어난 까닭', ans: 'sub', opts: ['sub', 'den', 'amt', 'osm'] }, { q: '10 %와 20 %에서 CO₂가 같은 까닭', ans: 'sat', opts: ['sub', 'sat', 'den', 'resp'] }, { q: '40 %에서 CO₂가 줄어든 까닭', ans: 'osm', opts: ['act', 'osm', 'sat', 'amt'] }],
    yeast: [{ q: '효모가 많을수록 CO₂가 거의 비례해 늘어난 까닭', ans: 'amt', opts: ['amt', 'sat', 'osm', 'den'] }],
    o2: [{ q: '산소를 더 공급할수록 CO₂가 조금 준 까닭', ans: 'resp', opts: ['resp', 'den', 'osm', 'sat'] }, { q: '산소가 있을 때 효모가 더 많이 늘어나는 까닭', ans: 'atp', opts: ['atp', 'den', 'osm', 'sat'] }],
  };
  const ivOf = () => S.dz.iv || 'temp';

  /* ---------- 그리기 도구: 삼각 플라스크 · 풍선 · 시험관 ---------- */
  function flaskPathAt(cx, base, w, h) {
    const hw = w / 2, nw = w * 0.17, top = base - h, nh = h * 0.36;
    ctx.beginPath(); ctx.moveTo(cx - nw, top); ctx.lineTo(cx - nw, top + nh); ctx.lineTo(cx - hw, base - 14); ctx.quadraticCurveTo(cx - hw, base, cx - hw + 14, base);
    ctx.lineTo(cx + hw - 14, base); ctx.quadraticCurveTo(cx + hw, base, cx + hw, base - 14); ctx.lineTo(cx + nw, top + nh); ctx.lineTo(cx + nw, top); ctx.closePath();
  }
  function flaskDraw(cx, base, w, h, liquid, level, o) {
    o = o || {};
    ctx.save(); flaskPathAt(cx, base, w, h); ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fill(); ctx.clip();
    const ly = base - h * 0.08 - h * 0.52 * level, g = ctx.createLinearGradient(0, ly, 0, base); g.addColorStop(0, C.shade(liquid, 0.12)); g.addColorStop(1, C.shade(liquid, -0.08));
    ctx.fillStyle = g; ctx.fillRect(cx - w, ly, w * 2, base - ly + 2);
    if (o.cloud) { ctx.fillStyle = 'rgba(255,255,255,' + (0.16 * o.cloud) + ')'; ctx.fillRect(cx - w, ly, w * 2, base - ly); }
    ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.fillRect(cx - w * 0.38, base - h * 0.62, 4, h * 0.5);
    ctx.restore();
    flaskPathAt(cx, base, w, h); ctx.strokeStyle = '#8fa3ba'; ctx.lineWidth = 2.5; ctx.stroke();
    return ly;
  }
  function balloonDraw(cx, neckY, r, col, nw) {
    r = Math.max(3, r); const ry = r * 1.18, cy = neckY - 4 - ry;
    ctx.save();
    D.shadow(() => { ctx.beginPath(); ctx.ellipse(cx, cy, r, ry, 0, 0, TAU); ctx.fillStyle = col; ctx.fill(); }, { blur: 6, y: 2 });
    const g = ctx.createRadialGradient(cx - r * 0.35, cy - ry * 0.4, r * 0.1, cx, cy, ry); g.addColorStop(0, C.shade(col, 0.5)); g.addColorStop(0.6, col); g.addColorStop(1, C.shade(col, -0.2));
    ctx.beginPath(); ctx.ellipse(cx, cy, r, ry, 0, 0, TAU); ctx.fillStyle = g; ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.ellipse(cx - r * 0.35, cy - ry * 0.45, r * 0.2, ry * 0.12, -0.6, 0, TAU); ctx.fill();
    ctx.fillStyle = C.shade(col, -0.25); ctx.fillRect(cx - nw, neckY - 7, nw * 2, 7);
    ctx.restore();
    return cy;
  }
  function tubeDraw(cx, top, w, h, turb, bub) {
    ctx.save();
    ctx.beginPath(); ctx.moveTo(cx - w / 2, top); ctx.lineTo(cx - w / 2, top + h - w / 2); ctx.arc(cx, top + h - w / 2, w / 2, Math.PI, 0, true); ctx.lineTo(cx + w / 2, top); ctx.closePath();
    ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fill(); ctx.clip();
    const ly = top + h * 0.34, g = ctx.createLinearGradient(0, ly, 0, top + h);
    g.addColorStop(0, C.mix('#dff1fb', '#f4efe2', turb)); g.addColorStop(1, C.mix('#c9e6f6', '#e6dfcc', turb));
    ctx.fillStyle = g; ctx.fillRect(cx - w, ly, w * 2, h);
    if (turb > 0.02) { ctx.fillStyle = 'rgba(245,240,226,' + (0.55 * turb) + ')'; ctx.fillRect(cx - w, ly, w * 2, h); }
    ctx.restore();
    ctx.beginPath(); ctx.moveTo(cx - w / 2, top); ctx.lineTo(cx - w / 2, top + h - w / 2); ctx.arc(cx, top + h - w / 2, w / 2, Math.PI, 0, true); ctx.lineTo(cx + w / 2, top); ctx.strokeStyle = '#8fa3ba'; ctx.lineWidth = 2.5; ctx.stroke();
  }

  /* =========================================================
     ① 발효 관찰: 물중탕의 발효관 4개 + 석회수
     ========================================================= */
  const FL = [
    { id: 'A', name: '실험군 A', sub: '효모 + 포도당', vend: 18, liquid: '#f1d99a', bal: '#ef4444', cloud: 1 },
    { id: 'B', name: '대조군 B', sub: '포도당 없음', vend: 0, liquid: '#f4e7c4', bal: '#f59e0b', cloud: 1 },
    { id: 'C', name: '대조군 C', sub: '끓인 효모 + 포도당', vend: 0, liquid: '#e8cf8f', bal: '#3b82f6', cloud: 0.6 },
    { id: 'D', name: '대조군 D', sub: '효모 없음', vend: 0, liquid: '#dff1fb', bal: '#22c55e', cloud: 0 },
  ];
  S.ob = { t: 0, run: false, done: false, sp: FL.map(() => new SciSim.Spring(0, { stiffness: 120, damping: 11 })), vd: FL.map(() => 0), turb: FL.map(() => 0), lime: { go: false, t: 0, shown: false }, bub: 0, cg: { B: '', C: '', D: '' }, chk: false };
  function obG() {
    if (PHONE) return { fw: 72, fh: 86, base: 262, cx: (i) => 66 + i * 116, bathY: 214, bathH: 70, rmax: 24, Gp: { x: 10, y: 372, w: 460, h: 140 }, Tp: { x: 10, y: 522, w: 460, h: 108 }, tubeW: 26, tubeH: 66, clockY: 22 };
    return { fw: 108, fh: 120, base: 296, cx: (i) => 111 + i * 193, bathY: 238, bathH: 94, rmax: 40, Gp: { x: 14, y: 402, w: 500, h: 144 }, Tp: { x: 524, y: 402, w: 262, h: 144 }, tubeW: 32, tubeH: 84, clockY: 28 };
  }
  const obVol = (i) => (i === 0 ? FL[0].vend * fT(S.ob.t) : 0);
  function obReset() {
    const o = S.ob; o.t = 0; o.run = false; o.done = false; o.lime = { go: false, t: 0, shown: false }; o.sp.forEach((s) => { s.target = 0; }); o.turb = FL.map(() => 0); o.vd = FL.map(() => 0); updateCtl();
  }
  function obRun() { const o = S.ob; if (o.run) return; if (o.done) obReset(); o.run = true; Sound.click(); updateCtl(); }
  function obLime() { const o = S.ob; if (!o.done || o.lime.go) return; o.lime = { go: true, t: 0, shown: false }; Sound.click(); updateCtl(); }
  function obDraw(dt, t) {
    const o = S.ob, g = obG(), fw = g.fw, fh = g.fh;
    if (o.run) { o.t = Math.min(20, o.t + dt * (RM ? 6 : 2)); if (o.t >= 20) { o.run = false; o.done = true; Sound.success(); updateCtl(); } }
    FL.forEach((f, i) => {
      o.vd[i] = obVol(i); const r = o.vd[i] > 0.05 ? 13 + 5.6 * Math.cbrt(o.vd[i]) : 7; o.sp[i].target = Math.min(r * (PHONE ? 0.62 : 1), g.rmax); o.sp[i].update(dt);
    });
    if (o.lime.go) { o.lime.t += dt; FL.forEach((f, i) => { const tg = f.vend > 0 ? 1 : 0; o.turb[i] = approach(o.turb[i], o.lime.t > 1 ? tg : 0, dt, 0.9); }); if (o.lime.t > 4 && !o.lime.shown) { o.lime.shown = true; updateCtl(); } }
    // 시간 표시줄
    const bw = PHONE ? 300 : 460, bx = (VW - bw) / 2 - (PHONE ? 20 : 20);
    T(bx - 12, g.clockY + 5, '⏱', 20, '#334155', 'right', 800);
    D.roundRect(bx, g.clockY - 8, bw, 16, 8); ctx.fillStyle = '#e5ebf2'; ctx.fill();
    if (o.t > 0.05) { D.roundRect(bx, g.clockY - 8, Math.max(16, bw * o.t / 20), 16, 8); ctx.fillStyle = '#16a34a'; ctx.fill(); }
    T(bx + bw + 12, g.clockY + 6, fix1(o.t) + ' / 20분', 15, '#1f2d44', 'left', 800);
    // 물중탕
    const by = g.bathY;
    // 플라스크 (뒤) + 풍선
    FL.forEach((f, i) => {
      const cx = g.cx(i), top = g.base - fh;
      flaskDraw(cx, g.base, fw, fh, f.liquid, 0.9, { cloud: f.cloud });
      balloonDraw(cx, top, o.sp[i].value, f.bal, fw * 0.17);
      T(cx, g.base + (PHONE ? 52 : 52), f.name, PHONE ? 13 : 15, '#1f2d44', 'center', 800);
      T(cx, g.base + (PHONE ? 69 : 71), f.sub, PHONE ? 11.5 : 13, '#64748b', 'center', 700);
      const v = o.vd[i];
      if (o.t > 0.05 || o.done) pill(cx, top - 2 * o.sp[i].value * 1.18 - 20, PHONE ? 62 : 74, 22, fix1(v) + ' mL', '#fff', '#1f2d44', 1);
    });
    // 물 (앞쪽)
    ctx.save(); const wy = by, wh = g.bathH;
    D.roundRect(PHONE ? 14 : 28, wy, VW - (PHONE ? 28 : 56), wh, 14); ctx.fillStyle = 'rgba(96,165,250,.32)'; ctx.fill(); ctx.strokeStyle = 'rgba(37,99,235,.55)'; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.restore();
    T(PHONE ? 26 : 44, by + wh - 10, '35 °C 물중탕', PHONE ? 12.5 : 14, '#1d4ed8', 'left', 800);
    // 기포 (실험군 A)
    if (o.run && !RM && Math.random() < 0.55) { const cx = g.cx(0); parts.emit({ x: cx + (Math.random() - 0.5) * fw * 0.6, y: g.base - 12, vx: (Math.random() - 0.5) * 10, vy: -(40 + Math.random() * 40), life: 0.9, size: 2 + Math.random() * 2.5, color: 'rgba(255,255,255,.9)', shape: 'bubble' }); }
    // 그래프 (시간 – CO₂ 부피)
    const Gp = g.Gp; panel(Gp.x, Gp.y, Gp.w, Gp.h, 16, '#fff');
    const pl = mkPlot(Gp, { x0: 0, x1: 20, y0: 0, y1: 20, xt: [0, 5, 10, 15, 20], yt: [0, 10, 20], xl: '시간 (분)', yl: 'CO₂ 부피 (mL)', m: { l: 44, t: 36, r: 14, b: 46 } });
    drawAxes(pl);
    FL.forEach((f, i) => {
      ctx.save(); ctx.strokeStyle = f.bal; ctx.lineWidth = i === 0 ? 3.5 : 2.5; ctx.lineCap = 'round'; if (i) ctx.setLineDash([i * 3 + 3, 5]);
      ctx.beginPath(); const nmax = Math.max(1, Math.floor(o.t * 4));
      for (let k = 0; k <= nmax; k++) { const tt = Math.min(o.t, k / 4); const v = f.vend * fT(tt); const x = pl.X(tt), y = pl.Y(v) - (i ? i * 1.5 : 0); if (k) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
      ctx.stroke(); ctx.restore();
    });
    if (o.t > 0.1) { const x = pl.X(o.t), y = pl.Y(obVol(0)); D.sphere(x, y, 6, '#ef4444', { gloss: false }); }
    // 범례
    FL.forEach((f, i) => { const lx = PHONE ? Gp.x + 150 + i * 76 : Gp.x + Gp.w - 138, ly = PHONE ? Gp.y + 20 : Gp.y + 30 + i * 18; ctx.strokeStyle = f.bal; ctx.lineWidth = 3; if (i) ctx.setLineDash([i * 3 + 2, 4]); ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx + (PHONE ? 16 : 20), ly); ctx.stroke(); ctx.setLineDash([]); T(lx + (PHONE ? 21 : 26), ly + 4.5, f.id + (i ? (PHONE ? ' 대조' : ' 대조군') : (PHONE ? ' 실험' : ' 실험군')), 12, '#475569', 'left', 700); });
    // 석회수 시험관
    const Tp = g.Tp; panel(Tp.x, Tp.y, Tp.w, Tp.h, 16, '#fff');
    T(Tp.x + 12, Tp.y + 22, '🧪 석회수 검사', PHONE ? 13.5 : 14.5, '#1f2d44', 'left', 800);
    FL.forEach((f, i) => {
      const cx = Tp.x + (PHONE ? 40 : 36) + i * ((Tp.w - (PHONE ? 80 : 72)) / 3), top = Tp.y + 32;
      tubeDraw(cx, top + 4, g.tubeW, g.tubeH, o.turb[i], 0);
      if (o.lime.go && o.lime.t > 0.3 && o.lime.t < 3.2 && f.vend > 0 && !RM && Math.random() < 0.5) parts.emit({ x: cx + (Math.random() - 0.5) * 8, y: top + g.tubeH * 0.8, vx: 0, vy: -45, life: 0.6, size: 2.5, color: 'rgba(255,255,255,.95)', shape: 'bubble' });
      T(cx, top + g.tubeH + (PHONE ? 20 : 20), f.id, 13.5, '#334155', 'center', 800);
    });
    if (!PHONE) { T(Tp.x + Tp.w - 10, Tp.y + 22, o.lime.shown ? 'A 만 뿌옇게!' : o.done ? '검사를 눌러 보세요' : '실행 후 검사', 12.5, o.lime.shown ? '#b91c1c' : '#64748b', 'right', 800); }
    else T(Tp.x + Tp.w - 10, Tp.y + 22, o.lime.shown ? 'A 만 뿌옇게!' : o.done ? '검사를 눌러 보세요' : '실행 후 검사', 12, o.lime.shown ? '#b91c1c' : '#64748b', 'right', 800);
  }
  function pill(x, y, w, h, text, bg, fg, a) {
    ctx.save(); ctx.globalAlpha = a == null ? 1 : a; D.roundRect(x - w / 2, y - h / 2, w, h, h / 2); ctx.fillStyle = bg; ctx.fill(); ctx.strokeStyle = 'rgba(15,23,42,.28)'; ctx.lineWidth = 1; ctx.stroke();
    T(x, y + h * 0.33, text, Math.max(11, h * 0.6), fg, 'center', 800); ctx.restore();
  }

  /* =========================================================
     ② 실험 설계: 한 번에 한 요인만 바꿔요
     ========================================================= */
  S.dz = { ch: { temp: false, glu: false, yeast: false, o2: false }, ctl: { boil: false, noGlu: false, noYeast: false }, rep: 1, hyp: '', iv: null, pulse: 0 };
  const dzChanged = () => FKEYS.filter((k) => S.dz.ch[k]);
  function dzG() {
    if (PHONE) return { fx: 10, fy: 10, fw: 214, fh: 60, fgap: 8, Rx: 236, Ry: 10, Rw: 234, Rh: 250, Cx: 10, Cy: 290, Cw: 460, Ch: 340 };
    return { fx: 14, fy: 14, fw: 270, fh: 56, fgap: 8, Rx: 300, Ry: 14, Rw: 486, Rh: 250, Cx: 14, Cy: 286, Cw: 772, Ch: 260 };
  }
  function dzDraw(dt, t) {
    const z = S.dz, g = dzG(), chg = dzChanged(), n = chg.length; z.pulse = (z.pulse || 0) + dt;
    FKEYS.forEach((k, i) => {
      const f = FAC[k], on = z.ch[k], x = g.fx, y = g.fy + i * (g.fh + g.fgap);
      D.shadow(() => { D.roundRect(x, y, g.fw, g.fh, 14); ctx.fillStyle = on ? '#fff3e2' : '#fff'; ctx.fill(); }, { blur: 6, y: 2 });
      D.roundRect(x, y, g.fw, g.fh, 14); ctx.strokeStyle = on ? (n > 1 ? '#e2464b' : '#f59e0b') : '#cbd5e1'; ctx.lineWidth = on ? 3 : 2; ctx.stroke();
      E(f.icon, x + 26, y + g.fh / 2, 26);
      T(x + 52, y + g.fh / 2 - 4, f.name, PHONE ? 14 : 16, '#1f2d44', 'left', 800);
      T(x + 52, y + g.fh / 2 + 17, on ? '바꿔요 (독립 변인)' : '고정 ' + f.base, PHONE ? 12 : 13.5, on ? '#b45309' : '#64748b', 'left', 700);
      T(x + g.fw - 12, y + g.fh / 2 + 6, on ? '🔁' : '🔒', 22, '#000', 'right', 800);
    });
    // 오른쪽: 비교하는 조건
    panel(g.Rx, g.Ry, g.Rw, g.Rh, 16, '#fff');
    T(g.Rx + 16, g.Ry + 26, '이렇게 비교해요', PHONE ? 14 : 16, '#1f2d44', 'left', 800);
    if (n === 1) {
      const f = FAC[chg[0]], cols = f.levels.length, cw = (g.Rw - 24) / cols;
      f.levels.forEach((lv, i) => {
        const cx = g.Rx + 12 + cw * (i + 0.5), base = g.Ry + (PHONE ? 130 : 148), sc = PHONE ? 0.5 : 0.66;
        const appear = RM ? 1 : clamp((z.pulse - i * 0.08) / 0.35, 0, 1);
        ctx.save(); ctx.globalAlpha = appear; flaskDraw(cx, base, 112 * sc, 128 * sc, '#f1d99a', 0.9); ctx.restore();
        T(cx, base + 22, f.fmt(lv), PHONE ? 11.5 : 14, '#b45309', 'center', 800);
      });
      T(g.Rx + g.Rw / 2, g.Ry + (PHONE ? 176 : 204), '바꾸는 것: ' + f.name + ' (5가지 조건)', PHONE ? 12 : 14, '#b45309', 'center', 800);
      T(g.Rx + g.Rw / 2, g.Ry + (PHONE ? 196 : 226), '→ 측정하는 것: 20분간 CO₂ 부피 (mL)', PHONE ? 12 : 14, '#15803d', 'center', 800);
    } else if (n === 0) {
      T(g.Rx + g.Rw / 2, g.Ry + g.Rh / 2 - 6, '바꾸는 요인이 없어요', PHONE ? 14 : 17, '#64748b', 'center', 800);
      T(g.Rx + g.Rw / 2, g.Ry + g.Rh / 2 + 22, '한 요인을 골라 “바꿈”으로 해 보세요', PHONE ? 12 : 14, '#94a3b8', 'center', 700);
    } else {
      const sh = RM ? 0 : Math.sin(clock * 30) * 2 * Math.max(0, 1 - z.pulse * 2);
      T(g.Rx + g.Rw / 2 + sh, g.Ry + g.Rh / 2 - 22, '⚠ 요인 ' + n + '개를 한꺼번에 바꿨어요', PHONE ? 14 : 17, '#b91c1c', 'center', 800);
      T(g.Rx + g.Rw / 2, g.Ry + g.Rh / 2 + 8, '어느 요인 때문에 CO₂ 가 달라졌는지', PHONE ? 12 : 14, '#475569', 'center', 700);
      T(g.Rx + g.Rw / 2, g.Ry + g.Rh / 2 + 30, '알 수 없어요. 한 번에 하나만 바꿔요.', PHONE ? 12 : 14, '#475569', 'center', 700);
    }
    // 아래: 설계 점검표
    panel(g.Cx, g.Cy, g.Cw, g.Ch, 16, '#fff');
    T(g.Cx + 16, g.Cy + 26, '📋 설계 점검표', PHONE ? 14 : 16, '#1f2d44', 'left', 800);
    const fixed = FKEYS.filter((k) => !z.ch[k]).map((k) => FAC[k].name + ' ' + FAC[k].base).concat(['용액 50 mL', '측정 시간 20분']);
    const ctls = [['boil', '끓인 효모'], ['noGlu', '포도당 없음'], ['noYeast', '효모 없음']].filter((q) => z.ctl[q[0]]).map((q) => q[1]);
    const lines = [
      [n === 1, '바꾸는 요인(독립 변인): ' + (n === 1 ? FAC[chg[0]].name : n === 0 ? '아직 없어요' : '하나만 골라야 해요')],
      [n === 1, '통제 변인(같게 할 것): ' + fixed.join(' · ')],
      [ctls.length > 0, '대조군: ' + (ctls.length ? ctls.join(' · ') : '아직 없어요')],
      [z.rep === 3, '반복 횟수: ' + z.rep + '회' + (z.rep === 3 ? '' : ' (3회 평균을 내요)')],
      [!!z.hyp, '가설: ' + (z.hyp && n === 1 ? FAC[chg[0]].name + josa(FAC[chg[0]].name, '이', '가') + ' 높아질수록 발효 속도는 ' + z.hyp + ' 것이다' : '아직 안 썼어요')],
    ];
    const fs = PHONE ? 12.5 : 14.5; let yy = g.Cy + 54;
    lines.forEach((l) => { const ls = wrap(l[1], g.Cw - 70, fs, 700); T(g.Cx + 18, yy + 4, l[0] ? '✅' : '⬜', fs + 2, '#000', 'left', 700); ls.forEach((s, k) => { T(g.Cx + 48, yy + 4 + k * (fs + 4), s, fs, l[0] ? '#15803d' : '#475569', 'left', 700); }); yy += ls.length * (fs + 4) + (PHONE ? 10 : 12); });
  }
  const dzOK = () => dzChanged().length === 1 && Object.keys(S.dz.ctl).some((k) => S.dz.ctl[k]) && S.dz.rep === 3 && !!S.dz.hyp;

  /* =========================================================
     ③ 결과 분석: 5조건 × 3회 측정, 그래프
     ========================================================= */
  S.da = { m: { temp: [], glu: [], yeast: [], o2: [] }, sel: 0, view: 'res', anim: null, sp: [0, 1, 2].map(() => new SciSim.Spring(0, { stiffness: 120, damping: 11 })), tshow: new Num(0), pts: new Num(0), read: { opt: '', rows: ['', '', ''] }, chk: false };
  const daLv = () => FAC[ivOf()];
  const daN = () => S.da.m[ivOf()].filter((x) => x).length;
  function daG() {
    if (PHONE) return { Bp: { x: 10, y: 10, w: 460, h: 168 }, Tp: { x: 10, y: 186, w: 460, h: 148 }, Gp: { x: 10, y: 342, w: 460, h: 288 }, fw: 66, fh: 76, cx: (i) => 90 + i * 150, base: 134 };
    return { Bp: { x: 14, y: 14, w: 372, h: 206 }, Tp: { x: 396, y: 14, w: 390, h: 206 }, Gp: { x: 14, y: 230, w: 772, h: 316 }, fw: 80, fh: 96, cx: (i) => 78 + i * 112, base: 178 };
  }
  function daMeasure() {
    const d = S.da, k = ivOf(), f = FAC[k], i = d.sel; if (d.anim) return;
    d.anim = { p: 0, i }; Sound.click(); d.sp.forEach((s) => { s.target = 0; }); updateCtl();
  }
  function daReset() { const d = S.da; d.m = { temp: [], glu: [], yeast: [], o2: [] }; d.anim = null; d.sp.forEach((s) => { s.target = 0; s.value = 0; }); d.read = { opt: '', rows: ['', '', ''] }; d.chk = false; updateCtl(); }
  function daSel(i) { const d = S.da; if (d.anim) return; d.sel = i; Sound.tick(); updateCtl(); }
  /* 풍선 반지름: 부피가 커도 제목 글씨를 덮지 않게 (데스크톱 10 ~ 19) */
  const balR = (v, g) => (PHONE ? Math.min(g.fw * 0.5, 13 + 5.6 * Math.cbrt(v)) * 0.55 : 10 + 9 * Math.cbrt(clamp(v, 0, 60) / 60));
  function daDraw(dt, t) {
    const d = S.da, g = daG(), k = ivOf(), f = FAC[k], mm = d.m[k];
    if (d.anim) {
      d.anim.p += dt / (RM ? 0.3 : 3.0);
      const tr = trials(f.mean[d.anim.i]);
      d.sp.forEach((s, j) => { s.target = d.anim.p > 0.12 ? balR(tr[j], g) : 0; });
      if (d.anim.p >= 1) { mm[d.anim.i] = trials(f.mean[d.anim.i]); d.anim = null; Sound.success(); updateCtl(); }
    } else d.sp.forEach((s) => { const cur = mm[d.sel]; s.target = cur ? balR(cur[d.sp.indexOf(s)], g) : 0; });
    d.sp.forEach((s) => s.update(dt));
    // 물중탕과 세 플라스크
    const Bp = g.Bp; panel(Bp.x, Bp.y, Bp.w, Bp.h, 16, '#fff');
    T(Bp.x + 14, PHONE ? Bp.y + Bp.h - 10 : Bp.y + 24, '반복 3회 · ' + f.name + ' ' + f.fmt(f.levels[d.sel]), PHONE ? 13.5 : 15, '#1f2d44', 'left', 800);
    const fb = Bp.y + g.base - (PHONE ? 8 : 4);
    [0, 1, 2].forEach((j) => {
      const cx = Bp.x + g.cx(j) - (PHONE ? 20 : 0), top = fb - g.fh;
      flaskDraw(cx, fb, g.fw, g.fh, '#f1d99a', 0.9); balloonDraw(cx, top, d.sp[j].value, ['#ef4444', '#f59e0b', '#a855f7'][j], g.fw * 0.17);
      T(cx, fb + 18, (j + 1) + '회', 13, '#475569', 'center', 800);
    });
    ctx.save(); D.roundRect(Bp.x + 8, fb - g.fh * 0.42, Bp.w - 16, g.fh * 0.42 + 6, 10); ctx.fillStyle = 'rgba(96,165,250,.25)'; ctx.fill(); ctx.restore();
    if (d.anim && !RM && Math.random() < 0.5) [0, 1, 2].forEach((j) => { if (Math.random() < 0.6) parts.emit({ x: Bp.x + g.cx(j) - (PHONE ? 20 : 0) + (Math.random() - 0.5) * g.fw * 0.5, y: fb - 10, vy: -(35 + Math.random() * 35), life: 0.8, size: 2 + Math.random() * 2, color: 'rgba(255,255,255,.9)', shape: 'bubble' }); });
    // 표
    const Tp = g.Tp; panel(Tp.x, Tp.y, Tp.w, Tp.h, 16, '#fff');
    T(Tp.x + 12, Tp.y + 22, '측정 결과표 (CO₂ 부피, mL)', PHONE ? 13 : 14, '#1f2d44', 'left', 800);
    const c0 = Tp.x + (PHONE ? 46 : 52), cw = (Tp.w - (PHONE ? 54 : 62)) / 5, ty = Tp.y + 46, rh = PHONE ? 24 : 30;
    f.levels.forEach((lv, i) => { const on = i === d.sel; if (on) { D.roundRect(c0 + cw * i + 2, ty - 16, cw - 4, rh * 5 + 8, 8); ctx.fillStyle = 'rgba(245,158,11,.14)'; ctx.fill(); } T(c0 + cw * (i + 0.5), ty, f.fmt(lv), PHONE ? 11.5 : 13, '#b45309', 'center', 800); });
    ['1회', '2회', '3회', '평균'].forEach((rn, r) => {
      const y = ty + (r + 1) * rh; T(Tp.x + 12, y + 4, rn, PHONE ? 12 : 13.5, r === 3 ? '#15803d' : '#475569', 'left', 800);
      f.levels.forEach((lv, i) => {
        const tr = mm[i]; let txt = '–', col = '#cbd5e1';
        if (tr) { txt = r < 3 ? fix1(tr[r]) : fix1((tr[0] + tr[1] + tr[2]) / 3); col = r === 3 ? '#15803d' : '#1f2d44'; }
        T(c0 + cw * (i + 0.5), y + 4, txt, PHONE ? 12.5 : 14.5, col, 'center', r === 3 ? 800 : 700);
      });
    });
    // 그래프
    const Gp = g.Gp; panel(Gp.x, Gp.y, Gp.w, Gp.h, 16, '#fff');
    if (d.view === 'time') daTime(Gp, f, d); else daRes(Gp, f, d, mm);
  }
  function daRes(Gp, f, d, mm) {
    const k = ivOf(), lv = f.levels, x0 = lv[0] - (lv[4] - lv[0]) * 0.1, x1 = lv[4] + (lv[4] - lv[0]) * 0.1;
    const pl = mkPlot(Gp, { x0, x1, y0: 0, y1: f.ymax, xt: lv, yt: f.ymax === 60 ? [0, 15, 30, 45, 60] : [0, 5, 10, 15, 20], xfmt: (v) => (k === 'o2' ? ['밀폐', '약', '보통', '세', '아주 센'][v] : String(v)), xl: f.xl, yl: '20분간 CO₂ 부피 (mL)', m: { l: 50, t: 56, r: k === 'o2' ? 56 : 18, b: 44 } });
    drawAxes(pl);
    // 평균 선 + 3회 점
    const done = lv.map((_, i) => mm[i]).map((tr, i) => (tr ? { i, x: pl.X(lv[i]), mean: (tr[0] + tr[1] + tr[2]) / 3, tr } : null)).filter(Boolean);
    ctx.save(); ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.beginPath(); done.forEach((p, j) => { if (j) ctx.lineTo(p.x, pl.Y(p.mean)); else ctx.moveTo(p.x, pl.Y(p.mean)); }); ctx.stroke(); ctx.restore();
    done.forEach((p) => {
      p.tr.forEach((v, j) => { ctx.save(); ctx.globalAlpha = 0.65; D.sphere(p.x + (j - 1) * 7, pl.Y(v), 3.6, ['#fb923c', '#f59e0b', '#a855f7'][j], { gloss: false }); ctx.restore(); });
      D.sphere(p.x, pl.Y(p.mean), 6.5, '#dc2626', { gloss: true });
    });
    if (k === 'o2') {
      const gy = (v) => pl.y + pl.h - clamp(v / 200, 0, 1) * pl.h;
      [0, 50, 100, 150, 200].forEach((v) => T(pl.x + pl.w + 8, gy(v) + 4.5, String(v), 12, '#2563eb', 'left', 700));
      T(Gp.x + Gp.w - 8, Gp.y + 22, '효모 증식(상대값)', 12.5, '#2563eb', 'right', 800);
      ctx.save(); ctx.strokeStyle = '#2563eb'; ctx.lineWidth = 2.5; ctx.setLineDash([6, 4]); ctx.beginPath(); done.forEach((p, j) => { const y = gy(f.grow[p.i]); if (j) ctx.lineTo(p.x, y); else ctx.moveTo(p.x, y); }); ctx.stroke(); ctx.restore();
      done.forEach((p) => D.sphere(p.x, gy(f.grow[p.i]), 5, '#2563eb', { gloss: false }));
    }
    if (done.length === 5) {
      const mx = Math.max(...f.mean), bi = f.mean.indexOf(mx), x = pl.X(lv[bi]), y = pl.Y(mx);
      D.ring(x, y, 14, clock, { color: '#16a34a', width: 3 });
      D.label(x + (bi >= 3 ? -14 : 14), y - 22, '최대 ' + fix1(mx) + ' mL · ' + f.fmt(lv[bi]), { bg: '#16a34a', color: '#fff', size: 13, align: bi >= 3 ? 'right' : 'left' });
    } else if (!done.length) T(pl.x + pl.w / 2, pl.y + pl.h / 2, '조건을 골라 측정하면 그래프가 그려져요', PHONE ? 13 : 15, '#94a3b8', 'center', 800);
    T(Gp.x + 14, Gp.y + 44, '큰 점 = 평균, 작은 점 = 3회 측정값', PHONE ? 11.5 : 13, '#475569', 'left', 800);
  }
  function daTime(Gp, f, d) {
    const m = f.mean[d.sel], pl = mkPlot(Gp, { x0: 0, x1: 20, y0: 0, y1: f.ymax, xt: [0, 5, 10, 15, 20], yt: f.ymax === 60 ? [0, 15, 30, 45, 60] : [0, 5, 10, 15, 20], xl: '시간 (분)', m: { l: 50, t: 36, r: 20, b: 44 } });
    drawAxes(pl);
    T(Gp.x + 14, Gp.y + 24, f.name + ' ' + f.fmt(f.levels[d.sel]) + ' 의 시간–CO₂ 부피(mL) 곡선', PHONE ? 12.5 : 14.5, '#1f2d44', 'left', 800);
    d.tshow.set(20); d.tshow.update(dtL, 0.7);
    const tt = d.tshow.v;
    ctx.save(); ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 3.5; ctx.beginPath(); for (let i = 0; i <= 60; i++) { const x = i / 3; if (x > tt) break; const px = pl.X(x), py = pl.Y(m * fT(x)); if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); } ctx.stroke(); ctx.restore();
    // 처음 기울기(접선) 비교
    const s0 = m / (TK * f20); ctx.save(); ctx.setLineDash([6, 5]); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(pl.X(0), pl.Y(0)); ctx.lineTo(pl.X(8), pl.Y(Math.min(f.ymax, s0 * 8))); ctx.stroke(); ctx.restore();
    T(pl.X(8) + 8, pl.Y(Math.min(f.ymax, s0 * 8)) - 8, '처음 속도가 계속되면', PHONE ? 11.5 : 13, '#64748b', 'left', 700);
    const ex = pl.X(16), ey = pl.Y(m * fT(16)); D.sphere(ex, ey, 6, '#dc2626', { gloss: false });
    D.label(ex - 10, ey > pl.y + pl.h - 60 ? ey - 24 : ey + 28, '점점 느려져요', { bg: '#fff', color: '#b91c1c', border: '#fca5a5', size: 13, align: 'right' });
  }
  const daReadOK = () => {
    const d = S.da, f = FAC[ivOf()], mx = Math.max(...f.mean);
    if (d.read.opt === '') return '최대로 발효한 조건을 골라 주세요.';
    if (f.mean[+d.read.opt] !== mx) return '그래프에서 CO₂ 가 가장 많은 점을 찾아보세요. ' + (ivOf() === 'glu' ? '(같은 값이면 어느 쪽이든 괜찮아요)' : '');
    const rows = READ[ivOf()];
    for (let i = 0; i < rows.length; i++) { if (!d.read.rows[i]) return '“' + rows[i].q + '”의 까닭을 골라 주세요.'; if (d.read.rows[i] !== rows[i].ans) return '“' + rows[i].q + '” 쪽이 아직 달라요. 그래프의 변화와 효소의 성질을 떠올려 보세요.'; }
    return true;
  };

  /* =========================================================
     ④ 조사 계획: 계획서 · 시각화 도구 · 예시 인포그래픽
     ========================================================= */
  const TOPICS = ['김치의 젖산 발효', '요구르트', '막걸리', '빵 만들기', '와인', '바이오 에탄올', '치즈'];
  const KNOW = [['mic', '어떤 미생물'], ['kind', '발효의 종류'], ['prod', '만들어지는 산물'], ['why', '이용하는 까닭'], ['cond', '만드는 조건']];
  const METH = [['doc', '문헌 · 영상'], ['int', '인터뷰'], ['make', '직접 만들어 관찰'], ['lab', '제품 라벨 조사']];
  const VIS = [['time', '연표', '🕰', '시간 순서가 중요할 때'], ['flow', '순서도', '🔀', '단계나 반응 순서를 보일 때'], ['info', '인포그래픽', '📊', '여러 사실을 한눈에'], ['video', '영상 구성안', '🎬', '이야기로 시연할 때']];
  const SAFE = [['hyg', '식품 위생 · 알레르기 확인'], ['src', '출처 2곳 이상 비교'], ['adult', '가열 · 알코올은 어른과 함께, 음용 금지']];
  S.pl = { topic: '', q: '', know: {}, meth: {}, when: '', vis: '', safe: {}, flip: [new Num(0), new Num(0)], flipT: [0, 0] };
  function plLoad() { try { const j = JSON.parse(localStorage.getItem('hyFermLabPlan') || 'null'); if (j && typeof j === 'object') { const p = S.pl; p.topic = j.topic || ''; p.q = j.q || ''; p.know = j.know || {}; p.meth = j.meth || {}; p.when = j.when || ''; p.vis = j.vis || ''; p.safe = j.safe || {}; } } catch (e) { /* 저장소를 쓸 수 없어요 */ } }
  function plSave() { const p = S.pl; try { localStorage.setItem('hyFermLabPlan', JSON.stringify({ topic: p.topic, q: p.q, know: p.know, meth: p.meth, when: p.when, vis: p.vis, safe: p.safe })); } catch (e) { /* 저장소를 쓸 수 없어요 */ } }
  const plCount = (o) => Object.keys(o).filter((k) => o[k]).length;
  function plG() {
    if (PHONE) return { Cp: { x: 10, y: 10, w: 460, h: 330 }, Vp: { x: 10, y: 346, w: 460, h: 118 }, ex: [{ x: 10, y: 470, w: 226, h: 160 }, { x: 244, y: 470, w: 226, h: 160 }], fs: 12 };
    return { Cp: { x: 14, y: 14, w: 436, h: 532 }, Vp: { x: 460, y: 14, w: 326, h: 236 }, ex: [{ x: 460, y: 260, w: 158, h: 286 }, { x: 628, y: 260, w: 158, h: 286 }], fs: 14.5 };
  }
  function plDraw(dt, t) {
    const p = S.pl, g = plG(), fs = g.fs;
    panel(g.Cp.x, g.Cp.y, g.Cp.w, g.Cp.h, 16, '#fffdf5');
    T(g.Cp.x + 16, g.Cp.y + 28, '📝 사례 조사 계획서', PHONE ? 15 : 17, '#1f2d44', 'left', 800);
    const rows = [
      ['조사 주제', p.topic, !!p.topic], ['조사 질문', p.q.trim(), p.q.trim().length >= 5],
      ['알아낼 내용', KNOW.filter((k) => p.know[k[0]]).map((k) => k[1]).join(' · '), plCount(p.know) >= 2], ['조사 방법', METH.filter((k) => p.meth[k[0]]).map((k) => k[1]).join(' · '), plCount(p.meth) >= 1],
      ['조사 기간', p.when, !!p.when], ['정리 · 시각화', p.vis ? VIS.find((v) => v[0] === p.vis)[1] : '', !!p.vis], ['안전 · 출처', SAFE.filter((k) => p.safe[k[0]]).map((k) => k[1]).join(' / '), plCount(p.safe) >= 2],
    ];
    let y = g.Cp.y + 52; const lw = PHONE ? 86 : 100;
    rows.forEach((r) => {
      const ls = wrap(r[1] || '아직 안 썼어요', g.Cp.w - lw - 52, fs - 0.5, 700).slice(0, PHONE ? 2 : 3), hh = Math.max(PHONE ? 30 : 44, ls.length * (fs + 3) + (PHONE ? 12 : 16));
      D.roundRect(g.Cp.x + 12, y, g.Cp.w - 24, hh, 10); ctx.fillStyle = r[2] ? '#ecfdf3' : '#f6f7fa'; ctx.fill(); ctx.strokeStyle = r[2] ? '#86efac' : '#e2e8f0'; ctx.lineWidth = 1.5; ctx.stroke();
      T(g.Cp.x + 22, y + hh / 2 + 5, r[0], fs - 0.5, r[2] ? '#15803d' : '#64748b', 'left', 800);
      ls.forEach((l, k) => T(g.Cp.x + 22 + lw, y + hh / 2 + 5 - (ls.length - 1) * (fs + 3) / 2 + k * (fs + 3), l, fs - 0.5, r[1] ? '#1f2d44' : '#b0b8c6', 'left', 700));
      T(g.Cp.x + g.Cp.w - 26, y + hh / 2 + 6, r[2] ? '✅' : '⬜', 15, '#000', 'center', 700);
      y += hh + (PHONE ? 4 : 9);
    });
    if (!PHONE) T(g.Cp.x + 16, g.Cp.y + g.Cp.h - 16, '입력한 내용은 이 기기에만 저장돼요.', 12.5, '#94a3b8', 'left', 700);
    // 시각화 도구 고르기
    panel(g.Vp.x, g.Vp.y, g.Vp.w, g.Vp.h, 16, '#fff');
    T(g.Vp.x + 14, g.Vp.y + 24, '무엇으로 보여 줄까요?', PHONE ? 13.5 : 15, '#1f2d44', 'left', 800);
    const cols = 2, tw = (g.Vp.w - 14 * 2 - 10) / 2, th = PHONE ? 38 : 84;
    VIS.forEach((v, i) => {
      const tx = g.Vp.x + 14 + (i % cols) * (tw + 10), ty = g.Vp.y + 36 + Math.floor(i / cols) * (th + 8), on = p.vis === v[0];
      D.roundRect(tx, ty, tw, th, 12); ctx.fillStyle = on ? '#e0f2fe' : '#f6f7fa'; ctx.fill(); ctx.strokeStyle = on ? '#0284c7' : '#d6dce6'; ctx.lineWidth = on ? 3 : 1.5; ctx.stroke();
      E(v[2], tx + 22, ty + (PHONE ? th / 2 : 26), PHONE ? 18 : 24);
      T(tx + 42, ty + (PHONE ? 16 : 22), v[1], PHONE ? 13 : 15, '#1f2d44', 'left', 800);
      if (PHONE) T(tx + 42, ty + 31, v[3], 10.5, '#64748b', 'left', 700); else { const ls = wrap(v[3], tw - 16, 12.5, 700); ls.forEach((l, k) => T(tx + 10, ty + 52 + k * 16, l, 12.5, '#64748b', 'left', 700)); }
    });
    // 예시 인포그래픽 (눌러서 뒤집기)
    const EX = [
      { t: '예시 ① 김치', front: '🥬', steps: ['배추 + 소금 + 양념', '무산소 환경에서 젖산균 증식', '포도당 → 젖산 (CO₂ 약간)', 'pH 하락 → 신맛 · 보존성 ↑'], col: '#dc2626' },
      { t: '예시 ② 막걸리', front: '🍶', steps: ['쌀 녹말', '누룩의 효소 → 포도당', '효모의 알코올 발효', '에탄올 + CO₂ (거품)'], col: '#0ea5e9' },
    ];
    g.ex.forEach((r, i) => {
      p.flip[i].set(p.flipT[i]); p.flip[i].update(dt, 7);
      const u = p.flip[i].v, sx = Math.abs(Math.cos(u * Math.PI)), back = u > 0.5, e = EX[i];
      ctx.save(); ctx.translate(r.x + r.w / 2, r.y + r.h / 2); ctx.scale(Math.max(0.04, sx), 1);
      D.shadow(() => { D.roundRect(-r.w / 2, -r.h / 2, r.w, r.h, 14); ctx.fillStyle = back ? '#fff' : C.rgba(e.col, 0.1); ctx.fill(); }, { blur: 7, y: 2 });
      D.roundRect(-r.w / 2, -r.h / 2, r.w, r.h, 14); ctx.strokeStyle = e.col; ctx.lineWidth = 3; ctx.stroke();
      if (!back) { E(e.front, 0, PHONE ? -26 : -40, PHONE ? 40 : 56); T(0, PHONE ? 22 : 30, e.t, PHONE ? 14 : 16, '#1f2d44', 'center', 800); T(0, PHONE ? 44 : 56, '눌러서 뒤집어요', 12, '#64748b', 'center', 700); }
      else {
        T(0, -r.h / 2 + 22, e.t, PHONE ? 12.5 : 14.5, e.col, 'center', 800);
        const sh = (r.h - 44) / 4;
        e.steps.forEach((s, k) => {
          const yy = -r.h / 2 + 34 + k * sh;
          D.roundRect(-r.w / 2 + 8, yy, r.w - 16, sh - 12, 10); ctx.fillStyle = C.rgba(e.col, 0.12); ctx.fill();
          const ls = wrap(s, r.w - 30, PHONE ? 11 : 12.5, 800); ls.slice(0, 3).forEach((l, q) => T(0, yy + (sh - 12) / 2 + 4 - (Math.min(ls.length, 3) - 1) * 7.5 + q * 15, l, PHONE ? 11 : 12.5, '#1f2d44', 'center', 800));
          if (k < 3) T(0, yy + sh - 1, '▼', 11, e.col, 'center', 800);
        });
      }
      ctx.restore();
    });
  }
  const plTap = {
    down(p) {
      const s = S.pl, g = plG();
      g.ex.forEach((r, i) => { if (inRect(p.x, p.y, r)) { s.flipT[i] = s.flipT[i] ? 0 : 1; Sound.click(); } });
      const cols = 2, tw = (g.Vp.w - 14 * 2 - 10) / 2, th = PHONE ? 38 : 84;
      VIS.forEach((v, i) => { const tx = g.Vp.x + 14 + (i % cols) * (tw + 10), ty = g.Vp.y + 36 + Math.floor(i / cols) * (th + 8); if (inRect(p.x, p.y, { x: tx, y: ty, w: tw, h: th })) { s.vis = v[0]; plSave(); Sound.click(); updateCtl(); } });
      return false;
    },
    hover(p) { const g = plG(); return g.ex.some((r) => inRect(p.x, p.y, r)) || inRect(p.x, p.y, g.Vp) ? 'pointer' : 'default'; },
  };

  /* =========================================================
     화면 전환 · 조작 연결
     ========================================================= */
  const PTS = { obs: null, design: null, data: null, plan: plTap };
  function setMode(m) { if (S.mode !== m) S.fade = 1; S.mode = m; PT = PTS[m] || null; hideHint(); if (m === 'design') S.dz.pulse = 0; updateCtl(); }
  const ctlNodes = $$('#ctrlCard .control');
  S.ob.ctlOn = false; S.da.readOn = false;
  const HYPS = ['계속 빨라질', '빨라지다가 느려질', '빨라지다가 일정해질', '변하지 않을', '느려질'];
  function daBuildRead() {
    const k = ivOf(), f = FAC[k], rows = READ[k];
    const opt = $('#daOpt'); opt.innerHTML = '<option value="">조건 고르기</option>' + f.levels.map((lv, i) => '<option value="' + i + '">' + f.fmt(lv) + '</option>').join('');
    $$('#daRows .tf-row').forEach((row, i) => {
      row.hidden = i >= rows.length; if (i >= rows.length) return;
      $('.lab', row).textContent = rows[i].q;
      const sel = $('select', row); sel.innerHTML = '<option value="">까닭 고르기</option>' + rows[i].opts.map((c) => '<option value="' + c + '">' + CAUSE[c] + '</option>').join('');
    });
    S.da.read = { opt: '', rows: ['', '', ''] };
  }
  function updateCtl() {
    const fr = game ? game.free : false, lvNow = game ? game.level : 0, o = S.ob, z = S.dz, d = S.da, p = S.pl;
    ctlNodes.forEach((n) => { n.hidden = (n.dataset.modes || '').split(' ').indexOf(S.mode) < 0; });
    $$('#ctrlCard [data-grp]').forEach((n) => { const kk = n.dataset.grp; n.hidden = kk === 'ctl' ? !(o.ctlOn || fr) : kk === 'read' ? !(d.readOn || fr) : false; });
    modeButtons(S.mode, lvNow, fr);
    // ① 관찰
    $('#obRun').disabled = o.run; $('#obRun').textContent = o.run ? '진행 중…' : (o.done ? '↺ 다시 20분 실행' : '▶ 20분 가속 실행');
    $('#obLime').disabled = !o.done || o.lime.go; $('#obLime').textContent = o.lime.shown ? '✔ 검사 끝' : '🧪 석회수 검사';
    $('#obNote').innerHTML = '시간 <b>' + fix1(o.t) + ' / 20분</b> · 풍선 A <b>' + fix1(o.vd[0]) + ' mL</b>' + (o.done ? '<br>B · C · D 는 <b>0 mL</b> 이에요.' : '');
    ['B', 'C', 'D'].forEach((k) => { const e = $('#cg_' + k); e.classList.toggle('ok', !!o.chk && e.value === CGANS[k]); e.classList.toggle('bad', !!o.chk && e.value !== '' && e.value !== CGANS[k]); });
    // ② 설계
    FKEYS.forEach((k) => $$('#dzFac .fac-row[data-f="' + k + '"] button').forEach((b) => b.classList.toggle('on', (b.dataset.s === 'chg') === !!z.ch[k])));
    $$('#dzCtl button').forEach((b) => b.classList.toggle('on', !!z.ctl[b.dataset.v]));
    chipSet($('#dzRep'), z.rep);
    const chg = dzChanged(), nm = chg.length === 1 ? FAC[chg[0]].name : '바꾸는 요인';
    $('#dzHyp').value = z.hyp; $('#dzName').textContent = nm; $('#dzJosa').textContent = josa(nm, '이', '가');
    $('#dzNote').innerHTML = '바꾸는 요인 <b>' + chg.length + '개</b>' + (chg.length > 1 ? ' <b style="color:#b91c1c">→ 하나만!</b>' : '');
    // ③ 분석
    const f = FAC[ivOf()];
    $('#daTitle').textContent = f.icon + ' ' + f.name + ' (5가지 조건)';
    $$('#daLv button').forEach((b, i) => { b.textContent = f.fmt(f.levels[i]) + (d.m[ivOf()][i] ? ' ✔' : ''); b.classList.toggle('on', i === d.sel); b.disabled = !!d.anim; });
    $('#daRun').disabled = !!d.anim; $('#daRun').textContent = d.anim ? '측정 중…' : '▶ ' + f.fmt(f.levels[d.sel]) + ' 3회 측정';
    chipSet($('#daView'), d.view);
    $('#daNote').innerHTML = '측정한 조건 <b>' + daN() + ' / 5</b>';
    $('#daOpt').value = d.read.opt; $$('#daRows .tf-row select').forEach((s, i) => { s.value = d.read.rows[i] || ''; });
    const rr = d.chk ? daReadOK() : null; $('#daOpt').classList.toggle('bad', !!d.chk && d.read.opt !== '' && f.mean[+d.read.opt] !== Math.max(...f.mean));
    // ④ 계획
    $('#plTopic').value = p.topic; if (document.activeElement !== $('#plQ')) $('#plQ').value = p.q;
    $$('#plKnow button').forEach((b) => b.classList.toggle('on', !!p.know[b.dataset.v])); $$('#plMeth button').forEach((b) => b.classList.toggle('on', !!p.meth[b.dataset.v]));
    $('#plWhen').value = p.when; chipSet($('#plVis'), p.vis); $$('#plSafe button').forEach((b) => b.classList.toggle('on', !!p.safe[b.dataset.v]));
  }
  const CGANS = { B: 'no', C: 'den', D: 'noy' };
  bindModeSeg(setMode);
  $('#obRun').addEventListener('click', obRun);
  $('#obReset').addEventListener('click', () => { Sound.click(); obReset(); });
  $('#obLime').addEventListener('click', obLime);
  ['B', 'C', 'D'].forEach((k) => $('#cg_' + k).addEventListener('change', () => { S.ob.cg[k] = $('#cg_' + k).value; S.ob.chk = false; updateCtl(); }));
  $$('#dzFac .fac-row button').forEach((b) => b.addEventListener('click', () => {
    const k = b.closest('.fac-row').dataset.f; S.dz.ch[k] = b.dataset.s === 'chg'; Sound.click(); S.dz.pulse = 0;
    const c = dzChanged(); if (c.length === 1) S.dz.iv = c[0]; updateCtl();
  }));
  $$('#dzCtl button').forEach((b) => b.addEventListener('click', () => { S.dz.ctl[b.dataset.v] = !S.dz.ctl[b.dataset.v]; Sound.click(); updateCtl(); }));
  $$('#dzRep button').forEach((b) => b.addEventListener('click', () => { S.dz.rep = +b.dataset.v; Sound.click(); updateCtl(); }));
  $('#dzHyp').addEventListener('change', (e) => { S.dz.hyp = e.target.value; updateCtl(); });
  $$('#daLv button').forEach((b, i) => b.addEventListener('click', () => daSel(i)));
  $('#daRun').addEventListener('click', daMeasure);
  $$('#daView button').forEach((b) => b.addEventListener('click', () => { S.da.view = b.dataset.v; S.da.tshow.snap(0); Sound.click(); updateCtl(); }));
  $('#daOpt').addEventListener('change', (e) => { S.da.read.opt = e.target.value; S.da.chk = false; updateCtl(); });
  $$('#daRows .tf-row select').forEach((s, i) => s.addEventListener('change', () => { S.da.read.rows[i] = s.value; S.da.chk = false; updateCtl(); }));
  $('#plTopic').addEventListener('change', (e) => { S.pl.topic = e.target.value; plSave(); updateCtl(); });
  $('#plQ').addEventListener('input', (e) => { S.pl.q = e.target.value; plSave(); });
  $$('#plKnow button').forEach((b) => b.addEventListener('click', () => { S.pl.know[b.dataset.v] = !S.pl.know[b.dataset.v]; plSave(); Sound.click(); updateCtl(); }));
  $$('#plMeth button').forEach((b) => b.addEventListener('click', () => { S.pl.meth[b.dataset.v] = !S.pl.meth[b.dataset.v]; plSave(); Sound.click(); updateCtl(); }));
  $('#plWhen').addEventListener('change', (e) => { S.pl.when = e.target.value; plSave(); updateCtl(); });
  $$('#plVis button').forEach((b) => b.addEventListener('click', () => { S.pl.vis = b.dataset.v; plSave(); Sound.click(); updateCtl(); }));
  $$('#plSafe button').forEach((b) => b.addEventListener('click', () => { S.pl.safe[b.dataset.v] = !S.pl.safe[b.dataset.v]; plSave(); Sound.click(); updateCtl(); }));

  /* =========================================================
     미션
     ========================================================= */
  const levels = [
    {
      title: '발효 관찰', short: '발효 관찰', icon: '🎈', phase: '실험',
      intro: '<p class="si-q">❓ 탐구 질문: 빵을 부풀리는 효모는 어떤 조건에서 가장 활발히 발효할까? 우리 생활 속 발효를 어떻게 조사하면 좋을까?</p><p>🔗 <b>앞 차시에서</b> 효모가 산소 없이 알코올 발효로 CO₂를 내보낸다는 것을 배웠어요. 앞 단원의 효소 실험(온도 · 기질 농도)에서 변인을 통제하던 경험도 떠올려 보세요.</p><p>이번에는 살아 있는 효모로 실험해요. 기본 설정은 <b>건조 효모 1 g + 10 % 포도당 용액 50 mL, 35 °C 물중탕, 20분</b>이에요. 풍선이 부푸는 것이 정말 효모의 발효 때문인지 확인하려고 <b>대조군 3개</b>(포도당 없음 · 끓인 효모 · 효모 없음)를 함께 놓아요.</p><p>⚠ <b>안전</b>: 발효관 · 풍선을 쓰고, 알코올 냄새가 나도 <b>마시지 않아요</b>. 가열 장치(물중탕)는 어른과 함께 조심해서 다뤄요. (이 차시의 측정값은 모두 가상의 예시 자료예요.)</p>',
      features: ['obs'],
      setup() { setMode('obs'); S.ob.ctlOn = false; obReset(); },
      recap: '효모 + 포도당을 35 °C에서 20분 두면 풍선이 부풀어 CO₂가 약 18 mL 모여요. 포도당 없음 · 끓인 효모 · 효모 없음의 대조군은 부풀지 않아서, 풍선의 CO₂는 살아 있는 효모가 포도당을 발효해서 만든 것이라고 확인할 수 있어요.',
      summary: '<ul><li><b>기본 설정</b>: 건조 효모 1 g + 10 % 포도당 50 mL, 35 °C 물중탕, 20분 → 풍선에 CO₂ 약 18 mL(예시 자료).</li><li><b>대조군</b>: 포도당 없음(먹이 없음), 끓인 효모(효소 변성), 효모 없음 → 모두 풍선이 부풀지 않아요.</li><li>CO₂ 확인: <b>석회수가 뿌옇게 흐려져요</b>(또는 BTB 용액이 노란색). 에탄올은 냄새와 증류로 확인해요.</li><li>시간–CO₂ 곡선: 처음에는 빠르다가 포도당이 줄고 에탄올이 쌓이며 점점 느려져요.</li><li>안전: 알코올은 음용 금지, 가열 장치는 어른과 함께.</li></ul>',
      missions: [
        {
          id: 'run', title: '20분 가속 실행',
          goal: '기본 설정의 발효관 4개를 <b>20분 가속 실행</b>으로 끝까지 관찰하세요.',
          hint: '“▶ 20분 가속 실행”을 누르고 10초쯤 기다려요. 풍선 A와 그래프를 함께 보세요.',
          setup() { setMode('obs'); S.ob.ctlOn = false; obReset(); },
          check: () => S.ob.done, hold: 0.4,
          status: () => mark(S.ob.done) + ' 실행 ' + fix1(S.ob.t) + ' / 20분 &nbsp; ' + mark(S.ob.vd[0] > 17) + ' 풍선 A ' + fix1(S.ob.vd[0]) + ' mL',
          explain: '20분 뒤 풍선 A에는 CO₂가 약 <b>18 mL</b> 모였고, 대조군 B · C · D는 부풀지 않았어요. 그래프에서 A의 기울기는 처음에 가파르다가 점점 완만해져요.',
        },
        {
          id: 'ctl', title: '대조군 결과 기록', manual: true,
          goal: '대조군 <b>B · C · D</b>의 풍선이 부풀지 않은 <b>까닭</b>을 각각 고르세요. (석회수 검사도 해 보세요.)',
          hint: 'B는 먹이가 없고, C는 끓여서 효소가 변성됐고, D는 발효할 효모가 없어요.',
          setup() { setMode('obs'); S.ob.ctlOn = true; S.ob.chk = false; ['B', 'C', 'D'].forEach((k) => { $('#cg_' + k).value = ''; S.ob.cg[k] = ''; }); updateCtl(); },
          check() {
            const o = S.ob; o.chk = true;
            if (!o.done) { o.chk = false; return '먼저 20분 가속 실행을 끝까지 해 보세요.'; }
            const names = { B: 'B(포도당 없음)', C: 'C(끓인 효모)', D: 'D(효모 없음)' };
            for (const k of ['B', 'C', 'D']) { if (!o.cg[k]) { o.chk = false; return names[k] + '의 까닭을 골라 주세요.'; } }
            for (const k of ['B', 'C', 'D']) { if (o.cg[k] !== CGANS[k]) { return names[k] + '의 까닭이 아직 달라요. 발효에 필요한 것(효모 · 먹이 · 살아 있는 효소)을 떠올려 보세요.'; } }
            return true;
          },
          explain: '<b>B</b> 포도당이 없으면 발효할 먹이가 없어요. <b>C</b> 끓이면 효모의 효소가 <b>변성</b>되어 발효를 못 해요. <b>D</b> 효모가 없으면 포도당만 있어서 CO₂가 생기지 않아요. 이 대조군들이 A의 CO₂가 효모의 발효 때문임을 보여 줘요.',
        },
        {
          type: 'quiz', title: '풍선 속 기체 확인',
          goal: '풍선 속 기체가 <b>이산화 탄소</b>임을 확인하는 방법은?',
          setup() { setMode('obs'); },
          choices: ['푸른색 염화 코발트 종이가 붉게 변하는지 본다', '석회수가 뿌옇게 흐려지는지 본다', '아이오딘 용액이 청람색이 되는지 본다', '붉은 리트머스 종이가 파랗게 변하는지 본다'],
          answer: 1,
          feedback: ['그것은 물의 확인 방법이에요.', '', '그것은 녹말의 확인 방법이에요.', 'CO₂ 가 물에 녹으면 약한 산성이라 푸른 리트머스 종이를 붉게 해요.'],
          explain: 'CO₂는 <b>석회수(수산화 칼슘 용액)를 뿌옇게</b> 흐리게 해요(탄산 칼슘 생성). BTB 용액이 노란색으로 변하는 것으로도 확인할 수 있어요. 석회수 검사에서 A만 흐려졌어요.',
        },
      ],
    },
    {
      title: '실험 설계', short: '실험 설계', icon: '🧪', phase: '탐구',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 대조군으로 A의 CO₂가 효모의 발효 때문임을 확인했어요. 이제 <b>효모가 가장 잘 발효하는 조건</b>을 찾는 실험을 설계해요.</div><p>한 번에 <b>한 요인만</b> 바꾸고 나머지는 같게 해야 어느 요인 때문인지 알 수 있어요. 효소 실험과 달리 <b>살아 있는 효모</b>를 쓰므로 온도 외에 <b>효모 양 · 포도당(영양분) 농도 · 산소 유무</b>도 변인이 돼요.</p><p>독립 변인 하나, 종속 변인(20분간 CO₂ 부피), 통제 변인, 대조군, 반복 3회, 가설을 정해 설계를 완성해요.</p>',
      features: ['design'],
      setup() { setMode('design'); },
      recap: '한 번에 한 요인(독립 변인)만 바꾸고 나머지(통제 변인)는 같게 하며, 대조군을 두고 3회 반복해 평균을 내야 믿을 수 있는 결과를 얻어요. 효모 실험에서는 온도 · 포도당 농도 · 효모 양 · 산소 유무가 변인이 돼요.',
      summary: '<ul><li><b>독립 변인</b>: 내가 바꾸는 요인(온도 / 포도당 농도 / 효모 양 / 산소 유무 중 하나). <b>종속 변인</b>: 20분간 CO₂ 부피.</li><li><b>통제 변인</b>: 나머지 요인과 용액 부피(50 mL), 측정 시간(20분). 두 요인을 한꺼번에 바꾸면 원인을 알 수 없어요.</li><li><b>대조군</b>(끓인 효모, 포도당 없음, 효모 없음)과 <b>반복 3회</b>의 평균으로 신뢰도를 높여요.</li><li>가설 형식: “○○가 높아질수록 발효 속도는 …일 것이다.”</li></ul>',
      missions: [
        {
          id: 'design', title: '변인 설정과 가설', manual: true,
          goal: '<b>바꿀 요인 하나</b>를 고르고, 대조군 · <b>반복 3회</b> · <b>가설</b>까지 설계를 완성하세요.',
          hint: '네 요인 중 하나만 “바꿈”으로 하고, 대조군을 하나 이상 고르고, 반복을 3회로 정한 뒤 가설 문장을 완성해요.',
          setup() { setMode('design'); S.dz.pulse = 0; S.dz.ch = { temp: false, glu: false, yeast: false, o2: false }; S.dz.ctl = { boil: false, noGlu: false, noYeast: false }; S.dz.rep = 1; S.dz.hyp = ''; S.dz.iv = null; updateCtl(); },
          check() {
            const z = S.dz, c = dzChanged();
            if (c.length === 0) return '바꿀 요인(독립 변인)을 하나 골라 주세요.';
            if (c.length > 1) return '요인을 ' + c.length + '개나 바꾸면 어느 요인 때문인지 알 수 없어요. 하나만 바꾸고 나머지는 같게 해요.';
            if (!Object.keys(z.ctl).some((k) => z.ctl[k])) return '대조군을 하나 이상 골라 주세요.';
            if (z.rep !== 3) return '믿을 수 있는 평균을 내려면 반복을 3회로 해요.';
            if (!z.hyp) return '가설 문장을 완성해 주세요.';
            return true;
          },
          explain: '독립 변인 <b>하나</b>만 바꾸고 나머지는 통제해야 결과가 그 요인 때문이라고 말할 수 있어요. 대조군과 3회 반복으로 신뢰도를 높였어요. 가설은 실험 결과로 확인하면 돼요.',
        },
        {
          type: 'quiz', title: '같게 해야 할 것',
          goal: '<b>포도당 농도</b>를 독립 변인으로 할 때 <b>같게 해야 할 것</b>으로 알맞은 것은?',
          setup() { setMode('design'); },
          choices: ['온도 · 효모 양 · 용액 부피 · 측정 시간', '포도당 농도 · 온도', '온도만', '아무것도 같게 하지 않아도 된다'],
          answer: 0,
          feedback: ['', '포도당 농도는 바꾸는 요인이라 조건마다 달라요.', '온도 외에도 효모 양 · 부피 · 시간이 달라지면 안 돼요.', '그러면 어느 요인 때문인지 알 수 없어요.'],
          explain: '포도당 농도를 바꾸면 <b>온도 · 효모 양 · 용액 부피 · 측정 시간</b>은 모든 조건에서 같게 해야 해요. 그래야 CO₂ 부피의 차이를 포도당 농도 때문이라고 할 수 있어요.',
        },
      ],
    },
    {
      title: '결과 분석', short: '결과 분석', icon: '📈', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 설계한 실험을 수행해요. (독립 변인을 고르지 않았다면 온도로 진행해요.)</div><p>선택한 변인의 <b>5가지 조건</b>을 <b>3회씩</b> 측정해 평균을 구하고 그래프로 나타내요. 그래프에서 <b>최적 값</b>을 읽고, 결과가 그렇게 나온 <b>원인</b>(효소 활성 · 변성 · 삼투 · 기질 포화 등)을 연결해요.</p><p>시간에 따른 CO₂ 곡선도 살펴봐요. (모든 값은 가상 예시 자료예요.)</p>',
      features: ['data'],
      setup() { setMode('data'); S.da.readOn = false; S.da.view = 'res'; S.da.sel = 0; S.da.anim = null; S.da.sp.forEach((s) => { s.target = 0; }); daBuildRead(); updateCtl(); },
      recap: '온도는 약 35 °C에서 최대(종 모양, 55 °C 이상 변성), 포도당 농도는 증가 후 일정(40 %에서 삼투로 감소), 효모 양은 거의 비례예요. 산소가 있으면 발효는 조금 줄고 효모 증식은 늘어요. 시간이 지나면 포도당 감소와 에탄올 축적으로 속도가 줄어요.',
      summary: '<ul><li><b>온도</b>: 약 35 °C에서 최대인 종 모양. 낮으면 효소 활성이 낮고, 55 °C 이상에서는 효소가 <b>변성</b>돼요.</li><li><b>포도당 농도</b>: 증가하다 10~20 %에서 일정(기질 <b>포화</b>), 40 %에서는 <b>삼투</b>로 효모 세포가 탈수되어 감소해요.</li><li><b>효모 양</b>: 효소를 가진 세포가 늘어 CO₂가 거의 <b>비례</b>해서 늘어요.</li><li><b>산소 유무</b>: 산소가 있으면 호흡이 가능해 같은 포도당에서도 ATP를 더 많이 얻고 효모가 <b>더 많이 증식</b>해요(발효는 조금 줄어요).</li><li>시간–CO₂ 곡선은 포도당 감소 · 에탄올 축적으로 점점 완만해져요. 3회 평균으로 오차를 줄여요.</li></ul>',
      missions: [
        {
          id: 'measure', title: '5조건 × 3회 측정',
          goal: '선택한 변인의 <b>5가지 조건</b>을 모두 <b>3회씩</b> 측정하세요.',
          hint: '조건 버튼을 고르고 “▶ 3회 측정”을 눌러요. 다섯 조건을 모두 해 보세요.',
          setup() { setMode('data'); S.da.readOn = false; S.da.view = 'res'; S.da.sel = 0; daReset(); daBuildRead(); updateCtl(); },
          check: () => daN() === 5, hold: 0.5,
          status: () => mark(daN() === 5) + ' 측정한 조건 ' + daN() + ' / 5 (' + FAC[ivOf()].name + ')',
          explain: '같은 조건을 <b>3회</b> 측정해 평균을 내면 우연한 오차를 줄일 수 있어요. 점은 3회 측정값, 큰 점은 평균이에요.',
        },
        {
          id: 'read', title: '최적 값과 원인', manual: true,
          goal: '그래프에서 CO₂가 <b>가장 많은 조건</b>을 읽고, 결과가 그렇게 나온 <b>원인</b>을 연결하세요.',
          hint: '그래프에서 가장 높은 점을 찾아요. 오르는 구간 · 내리는 구간 · 평평한 구간이 왜 생겼는지 효소의 성질로 생각해요.',
          setup() { setMode('data'); S.da.readOn = true; S.da.view = 'res'; daBuildRead(); S.da.chk = false; updateCtl(); },
          check() {
            const d = S.da; if (daN() < 5) return '먼저 5가지 조건을 모두 측정해 그래프를 완성해 주세요. (' + daN() + ' / 5)';
            d.chk = true; const r = daReadOK(); return r;
          },
          explain: '온도는 약 35 °C가 최적(효소 활성 최대, 높으면 <b>변성</b>), 포도당은 10~20 %에서 포화되고 40 %에서는 <b>삼투</b>로 줄어요. 효모 양은 많을수록 거의 <b>비례</b>하고, 산소가 있으면 <b>호흡이 함께</b> 일어나 발효는 조금 줄고 증식은 늘어요.',
        },
        {
          type: 'quiz', title: '시간에 따른 속도 감소',
          goal: '시간이 지나며 CO₂ 발생 <b>속도가 줄어드는</b> 까닭은? (⏱ 시간 곡선을 봐요)',
          setup() { setMode('data'); S.da.view = 'time'; S.da.tshow.snap(0); updateCtl(); },
          choices: ['포도당이 줄고 에탄올이 쌓여 발효가 점점 느려지기 때문이다', '효모가 점점 늘어 포도당을 덜 쓰기 때문이다', '온도가 시간이 지나며 계속 내려가기 때문이다', '풍선이 커져서 CO₂가 안으로 들어가기 어렵기 때문이다'],
          answer: 0,
          feedback: ['', '20분 동안 효모 수는 거의 그대로이고 포도당은 줄어들어요.', '물중탕이라 온도는 일정해요.', '풍선의 압력이 발효 속도를 좌우하지는 않아요.'],
          explain: '처음에는 포도당이 충분해 빠르다가, 시간이 지나며 <b>포도당이 줄고 에탄올이 쌓여</b> 발효 속도가 줄어요. 그래서 곡선이 점점 완만해져요.',
        },
      ],
    },
    {
      title: '조사 계획', short: '조사 계획', icon: '📝', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 효모의 발효를 실험으로 확인했어요. 이제 <b>우리 생활 속 발효 사례</b>를 조사하는 계획을 세워요.</div><p>조사 주제 · 질문 · 알아낼 내용 · 조사 방법 · 기간 · 정리(시각화) 방식 · 안전과 출처 확인을 칸 채우기로 작성해요. 입력한 내용은 <b>이 기기에만 저장</b>돼요.</p><p>시각화 도구(연표 · 순서도 · 인포그래픽 · 영상 구성안)를 고르고, 오른쪽 <b>예시 인포그래픽</b> 두 장을 눌러서 뒤집어 보세요.</p>',
      features: ['plan'],
      setup() { setMode('plan'); },
      recap: '조사 계획서에는 주제, 질문, 알아낼 내용(미생물 · 발효의 종류 · 산물 · 까닭 · 조건), 방법, 기간, 시각화 방식, 안전과 출처 확인이 들어가요. 김치와 요구르트는 젖산 발효, 막걸리와 빵은 효모의 알코올 발효가 중심이에요.',
      summary: '<ul><li><b>조사 계획서</b>: 주제 → 질문 → 알아낼 내용(어떤 미생물 · 발효의 종류 · 산물 · 이용하는 까닭 · 만드는 조건) → 방법(문헌 · 영상, 인터뷰, 직접 만들어 관찰, 제품 라벨) → 기간 → 정리 · 시각화 → 안전 · 출처 확인.</li><li><b>시각화 도구</b>: 연표(시간 순서), 순서도(단계 · 반응 순서), 인포그래픽(여러 사실을 한눈에), 영상 구성안(이야기 · 시연).</li><li><b>김치</b>: 발효 초기에는 CO₂를 내는 젖산균이, 후기에는 산에 강한 젖산균이 우세해지고 젖산이 쌓여 pH가 내려가 신맛이 강해져요.</li><li><b>막걸리</b>: 누룩의 효소가 쌀 녹말을 당으로 분해하고, 효모가 알코올 발효로 에탄올과 CO₂(거품)를 만들어요.</li></ul>',
      missions: [
        {
          id: 'plan', title: '사례 조사 계획서 쓰기', manual: true,
          goal: '조사 계획서의 <b>7칸</b>을 모두 채우세요. (질문은 5글자 이상, 알아낼 내용은 2개 이상, 안전 · 출처는 2개 이상)',
          hint: '주제를 고르고 “왜 · 어떻게” 질문을 써 보세요. 알아낼 내용과 조사 방법을 고르고, 시각화 도구와 안전 · 출처 확인을 정해요.',
          setup() { setMode('plan'); updateCtl(); },
          check() {
            const p = S.pl;
            if (!p.topic) return '조사 주제를 골라 주세요.';
            if (p.q.trim().length < 5) return '조사 질문을 5글자 이상 써 주세요. (예: 김치는 왜 시간이 지나면 시어질까?)';
            if (plCount(p.know) < 2) return '알아낼 내용을 2개 이상 골라 주세요.';
            if (plCount(p.meth) < 1) return '조사 방법을 하나 이상 골라 주세요.';
            if (!p.when) return '조사 기간을 골라 주세요.';
            if (!p.vis) return '정리 · 시각화 방식을 골라 주세요.';
            if (plCount(p.safe) < 2) return '안전 · 출처 확인 항목을 2개 이상 골라 주세요.';
            return true;
          },
          explain: '좋은 조사 계획은 <b>질문 → 알아낼 내용 → 방법 → 기간 → 정리 방식 → 안전 · 출처 확인</b> 순서로 구체적이에요. 정리 방식은 내용에 맞는 시각화 도구를 골라요.',
        },
        {
          type: 'quiz', title: '김치가 익는 동안',
          goal: '김치가 익어 가는 동안의 변화로 알맞은 것은?',
          setup() { setMode('plan'); },
          choices: ['초기에는 CO₂를 내는 젖산균이, 후기에는 산에 강한 젖산균이 우세해지고 젖산이 쌓여 pH가 내려가 신맛이 강해진다', '후기에는 효모의 알코올 발효로 에탄올이 대부분이 되어 신맛이 난다', '산소호흡이 활발해져 시간이 갈수록 CO₂만 늘고 신맛은 줄어든다', '시간이 지나면 pH가 올라가 신맛이 약해진다'],
          answer: 0,
          feedback: ['', '김치의 신맛은 에탄올이 아니라 젖산 때문이에요.', '김치는 산소가 적은 환경에서 젖산 발효가 일어나요.', '젖산이 쌓이면 pH는 내려가요.'],
          explain: '김치는 <b>젖산 발효</b>로 익어요. 발효 초기에는 CO₂를 내는 젖산균(예: 류코노스톡)이, 후기에는 산에 강한 젖산균(예: 락토바실러스)이 우세해지고, 젖산이 쌓여 pH가 내려가 신맛이 강해져요.',
        },
        {
          type: 'quiz', title: '막걸리의 알코올과 거품',
          goal: '막걸리를 빚을 때 <b>알코올과 거품(CO₂)</b>은 어디서 생길까?',
          setup() { setMode('plan'); },
          choices: ['효모가 쌀 녹말이 분해된 당을 알코올 발효해서 에탄올과 CO₂를 만든다', '젖산균이 젖산 발효를 하면서 에탄올을 만든다', '쌀이 산소호흡을 하면서 에탄올을 만든다', '누룩이 물과 반응해서 에탄올과 CO₂가 생긴다'],
          answer: 0,
          feedback: ['', '젖산 발효의 산물은 젖산이고 CO₂도 생기지 않아요.', '쌀은 이미 죽은 낟알이라 호흡하지 않아요.', '누룩의 역할은 효소 · 효모 공급이에요. 알코올은 효모의 발효 산물이에요.'],
          explain: '누룩의 효소가 쌀 녹말을 당으로 분해하고, <b>효모의 알코올 발효</b>가 그 당을 에탄올과 CO₂로 바꿔요. 거품은 CO₂예요.',
        },
      ],
    },
  ];

  plLoad();
  game = SciSim.game({
    simId: 'hy-fermentation-lab', mount: '#game', badge: '발효 연구원', homeHref: '../../index.html#hy',
    featureLabels: { obs: '🎈 발효관 · 대조군 · 석회수', design: '🧪 실험 설계 카드', data: '📈 5조건 × 3회 측정 · 그래프', plan: '📝 조사 계획서 · 시각화 도구' },
    onFeatures() { updateCtl(); },
    levels,
  });

  function readouts() {
    const m = S.mode, o = S.ob, d = S.da, p = S.pl, z = S.dz;
    if (m === 'obs') setReads(['시간', fix1(o.t) + '분', '풍선 A', fix1(o.vd[0]) + ' mL', '대조군 B · C · D', o.done ? '0 mL' : (o.t > 0 ? '0 mL' : '—')]);
    else if (m === 'design') { const c = dzChanged(); setReads(['바꾸는 요인', c.length ? c.map((k) => FAC[k].name).join(' + ') : '없음', '반복', z.rep + '회', '대조군', Object.keys(z.ctl).filter((k) => z.ctl[k]).length + '개']); }
    else if (m === 'data') { const f = FAC[ivOf()], tr = d.m[ivOf()][d.sel]; setReads([f.name, f.fmt(f.levels[d.sel]), '3회 평균', tr ? fix1((tr[0] + tr[1] + tr[2]) / 3) + ' mL' : '—', '측정한 조건', daN() + ' / 5']); }
    else setReads(['채운 칸', [!!p.topic, p.q.trim().length >= 5, plCount(p.know) >= 2, plCount(p.meth) >= 1, !!p.when, !!p.vis, plCount(p.safe) >= 2].filter(Boolean).length + ' / 7', '주제', p.topic || '—', '시각화', p.vis ? VIS.find((v) => v[0] === p.vis)[1] : '—']);
  }

  setMode('obs');
  let lastFree = false, lastLv = -1, uiT = 0;
  SciSim.loop((dt, t) => {
    clock = t; dtL = dt;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (game && game.level !== lastLv) { lastLv = game.level; updateCtl(); }
    view.apply(); FX.update(dt); ctx.clearRect(0, 0, VW, VH);
    bgFill('#f3f6ee', '#e8eee2');
    updLater(dt);
    if (S.mode === 'obs') obDraw(dt, t); else if (S.mode === 'design') dzDraw(dt, t); else if (S.mode === 'data') daDraw(dt, t); else plDraw(dt, t);
    FX.draw(); parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(241,246,243,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : approach(S.fade, 0, dt, 9); }
    uiT += dt; if (uiT > 0.25 && (S.mode === 'obs' || S.mode === 'data')) { uiT = 0; updateCtl(); }
    readouts();
  });

  window.__sim = { S, VW, VH, PHONE, get game() { return game; }, levels, setMode, obRun, obReset, obLime, daMeasure, daSel, daReset, daBuildRead, dzChanged, FAC, READ, CAUSE, trials, fT, updateCtl, plSave };
})();
