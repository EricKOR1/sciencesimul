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
  /* 부드러운 그림자는 매 프레임 비싸서(소프트웨어 렌더링) 겹쳐 그린 반투명 테두리로 대신해요 */
  const SH = (fn) => fn();
  /* 자주 그리는 작은 그림은 한 번만 만들어 두고 복사해서 써요 */
  const SPR = {};
  function sprite(key, w, h, fn) {
    if (!SPR[key]) {
      const c = document.createElement('canvas'); c.width = Math.ceil(w * 2); c.height = Math.ceil(h * 2);
      const cx = c.getContext('2d'); cx.scale(2, 2); fn(cx, SciSim.draw(cx), w, h); SPR[key] = { c, w, h };
    }
    return SPR[key];
  }
  function blit(s, x, y, a) { if (a != null && a !== 1) { ctx.save(); ctx.globalAlpha = a; ctx.drawImage(s.c, x - s.w / 2, y - s.h / 2, s.w, s.h); ctx.restore(); } else ctx.drawImage(s.c, x - s.w / 2, y - s.h / 2, s.w, s.h); }
  function txtSprite(key, str, size, color, weight, stroke) {
    return sprite(key, Math.ceil(str.length * size * 0.9 + 10), Math.ceil(size * 1.5 + 6), (cx, D2, w, h) => {
      cx.font = D2.font(size, weight || 800); cx.textAlign = 'center'; cx.textBaseline = 'middle';
      if (stroke) { cx.lineJoin = 'round'; cx.strokeStyle = stroke; cx.lineWidth = 4; cx.strokeText(str, w / 2, h / 2 + 1); }
      cx.fillStyle = color; cx.fillText(str, w / 2, h / 2 + 1);
    });
  }
  function panel(x, y, w, h, r, fill) { D.roundRect(x, y + 3, w, h, r || 14); ctx.fillStyle = 'rgba(15,23,42,.06)'; ctx.fill(); D.roundRect(x, y, w, h, r || 14); ctx.fillStyle = fill || '#fff'; ctx.fill(); ctx.strokeStyle = 'rgba(100,116,139,.22)'; ctx.lineWidth = 1; ctx.stroke(); }
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
     고등학교 세포와 물질대사 · Ⅲ. 세포호흡과 광합성 - 광합성 연구의 역사 (단원 58, 10차시)
     성취기준 [12세포03-08] 광합성 관련 과학사적 연구 결과를 조사하여 시각화 자료를 창의적으로 제작하여 협력적으로 소통할 수 있다.
     ① 관찰: 연대표  ② 탐구: 산소의 출처  ③ 분석: 캘빈의 추적  ④ 적용: 시각화 제작
     (연대 · 인물은 교과서 일반 서술 수준이에요. 개별 평전 · 노벨상 상세 · 분자 단계 메커니즘은 다루지 않아요)
     ========================================================= */
  const S = { mode: 'time', fade: 0 };
  let game = null;
  const fi = (v) => String(Math.round(v));
  function pill(x, y, w, h, text, bg, fg, a) {
    ctx.save(); ctx.globalAlpha = a == null ? 1 : a; D.roundRect(x - w / 2, y - h / 2, w, h, h / 2); ctx.fillStyle = bg; ctx.fill(); ctx.strokeStyle = 'rgba(15,23,42,.28)'; ctx.lineWidth = 1; ctx.stroke();
    T(x, y + h * 0.33, text, h * 0.68, fg, 'center', 800); ctx.restore();
  }
  function wrapT(x, y, w, str, size, color, lh, weight, maxLines, align) {
    const ls = wrap(str, w, size, weight || 800).slice(0, maxLines || 2); const off = ls.length === 1 ? 0 : -lh * (ls.length - 1) / 2;
    ls.forEach((l, i) => T(x, y + off + i * lh, l, size, color, align || 'center', weight || 800)); return ls.length;
  }
  function wl2rgb(w) {
    let r = 0, g = 0, b = 0;
    if (w < 440) { r = -(w - 440) / 60; b = 1; } else if (w < 490) { g = (w - 440) / 50; b = 1; } else if (w < 510) { g = 1; b = -(w - 510) / 20; } else if (w < 580) { r = (w - 510) / 70; g = 1; } else if (w < 645) { r = 1; g = -(w - 645) / 65; } else { r = 1; }
    const f = w < 420 ? 0.35 + 0.65 * (w - 380) / 40 : w > 680 ? 0.5 + 0.5 * (700 - w) / 20 : 1;
    const c = (v) => Math.round(255 * Math.pow(clamp(v * f, 0, 1), 0.8)); return 'rgb(' + c(r) + ',' + c(g) + ',' + c(b) + ')';
  }

  /* ---------- 연표 카드 11장 (연도 · 인물 · 실험 · 알게 된 것) ---------- */
  const EV = [
    { id: 'helm', key: 1640, ys: '1640년대', who: '헬몬트', icon: '🌳', st: '버드나무 5년 기르기', exp: '흙 90 kg에 버드나무 2.3 kg을 5년 길렀더니 나무는 76.7 kg이 되었고, 흙은 약 57 g만 줄었어요.', found: '식물의 양분은 흙이 아니라 물에서 온다고 결론 지었어요. (일부만 옳아요: 공기 속 CO₂가 주된 재료라는 것은 몰랐어요.)', fnd: '양분은 흙이 아닌 물에서 (일부만 옳음)', v1: '버드나무 5년 기르기', v2: '양분은 흙이 아닌 물에서', m: '식물의 양분은 흙이 아니라 물에서 온다', con: ['mat'] },
    { id: 'prie', key: 1771, ys: '1771년', who: '프리스틀리', icon: '🕯', st: '촛불 · 쥐 · 박하', exp: '밀폐 용기 속에서 촛불이 꺼지고 쥐가 죽는 공기에 박하 식물을 두었더니 다시 촛불이 타고 쥐가 살아났어요.', found: '식물이 공기를 회복시킨다는 것을 알았어요. (산소를 내놓는다는 암시)', fnd: '식물이 공기를 회복시킴 (산소 암시)', v1: '밀폐 용기 속 박하 식물', v2: '식물이 공기를 회복시킴', m: '식물이 공기를 회복시킨다 (산소 암시)', con: ['o2'] },
    { id: 'inge', key: 1779, ys: '1779년', who: '잉엔하우스', icon: '☀', st: '빛과 녹색 부분', exp: '식물이 공기를 회복시키려면 빛이 필요한지, 식물의 어느 부분에서 일어나는지 조사했어요.', found: '공기를 회복시키려면 빛이 필요하고 녹색 부분에서만 일어난다는 것을 알았어요.', fnd: '빛이 필요 · 녹색 부분에서만', v1: '빛과 식물 부분 비교', v2: '빛 필요, 녹색 부분에서만', m: '빛이 필요하고 녹색 부분에서만 일어난다', con: ['light'] },
    { id: 'saus', key: 1804, ys: '1804년', who: '소쉬르', icon: '⚖', st: 'CO₂와 물의 질량', exp: 'CO₂와 물의 질량 변화를 정량했어요.', found: '식물의 질량 증가는 CO₂와 물에서 온다는 것을 알았어요.', fnd: '질량 증가는 CO₂와 물에서', v1: 'CO₂와 물의 질량 변화', v2: '질량 증가는 CO₂와 물에서', m: '질량 증가는 CO₂와 물에서 온다', con: ['mat'] },
    { id: 'enge', key: 1882, ys: '1882년', who: '엥겔만', icon: '🌈', st: '해캄 · 세균 · 프리즘', exp: '호기성 세균과 해캄으로, 프리즘으로 나눈 빛을 해캄에 비추면 청자색과 적색 영역의 엽록체 둘레에 세균이 모였어요.', found: '산소(광합성)는 엽록체에서 발생하고, 엽록소가 청자색 · 적색 빛을 잘 이용한다는 것을 알았어요(작용 스펙트럼).', fnd: '엽록체에서 O₂ · 청자색 · 적색 빛', v1: '해캄과 호기성 세균', v2: '엽록체에서 O₂, 청자색·적색 빛', m: '산소는 엽록체에서 나오고 청자색 · 적색 빛을 잘 쓴다', con: ['abs'] },
    { id: 'vann', key: 1931, ys: '1931년', who: '반 니일', icon: '🧫', st: '광합성 세균과 H₂S', exp: '광합성 세균이 CO₂와 황화수소(H₂S)로 광합성을 하며, 산소가 아닌 황을 내놓는 것을 확인했어요.', found: '식물 광합성에서도 산소는 물에서 나올 것이라는 가설을 세웠어요.', fnd: '산소는 물에서 나올 것이라는 가설', v1: '광합성 세균 (CO₂ + H₂S)', v2: '산소는 물에서? (가설)', m: '산소는 물에서 나올 것이라는 가설', con: ['water'] },
    { id: 'hill', key: 1937, ys: '1937년', who: '힐', icon: '🧪', st: '분리한 엽록체', exp: '분리한 엽록체에 전자 수용체(페리시안화칼륨)를 주고 빛을 쬐었어요.', found: 'CO₂ 없이도 산소가 발생했어요(힐 반응). 산소 발생은 CO₂ 고정과 별개의 반응(명반응)이에요.', fnd: 'CO₂ 없이도 O₂ 발생 (힐 반응)', v1: '분리한 엽록체 + 전자 수용체', v2: 'CO₂ 없이도 O₂ 발생', m: 'CO₂ 없이도 O₂가 발생한다 (힐 반응)', con: ['lr'] },
    { id: 'ruben', key: 1941, ys: '1941년', who: '루벤과 카멘', icon: '🔴', st: '¹⁸O 표지', exp: '산소의 동위 원소 ¹⁸O로 표지했어요. H₂¹⁸O와 CO₂를 주면 ¹⁸O₂가 나오고, H₂O와 C¹⁸O₂를 주면 ¹⁸O₂는 나오지 않았어요.', found: '광합성에서 나오는 산소는 물에서 나온다는 것을 알았어요.', fnd: '광합성의 O₂는 물에서 (¹⁸O 표지)', v1: '¹⁸O 표지 물과 CO₂', v2: '광합성의 O₂는 물에서', m: '¹⁸O 표지로 광합성의 산소는 물에서 나온다', con: ['water'] },
    { id: 'anon', key: 1954, ys: '1954년', who: '아논', icon: '🔋', st: '빛을 쬔 엽록체', exp: '분리한 엽록체에 빛을 쬐었더니 ATP가 합성되었어요.', found: '빛으로 ATP가 합성된다는 것(광인산화)을 알았어요.', fnd: '빛으로 ATP 합성 (광인산화)', v1: '분리한 엽록체에 빛', v2: '빛으로 ATP 합성', m: '빛으로 ATP가 합성된다 (광인산화)', con: ['lr', 'chemi'] },
    { id: 'calv', key: 1954, ys: '1950년대', who: '캘빈과 벤슨', icon: '⚗', st: '¹⁴CO₂ 추적', exp: '방사성 ¹⁴CO₂를 클로렐라에 짧게 주고 시간별로 얼려, 종이 크로마토그래피와 자기방사법으로 ¹⁴C가 들어간 화합물을 확인했어요.', found: '¹⁴C가 가장 먼저 3탄소 화합물(3PG)에 나타나는 것(약 2~5초)을 알아 캘빈 회로를 밝혔어요. (1961 노벨 화학상)', fnd: '3PG가 가장 먼저 표지 (캘빈 회로)', v1: '¹⁴CO₂ + 크로마토그래피', v2: '3PG가 가장 먼저 표지', m: '¹⁴C 추적으로 3PG가 가장 먼저 표지된다', con: ['cf'] },
    { id: 'jage', key: 1966, ys: '1966년', who: '야겐도르프', icon: '🌀', st: 'pH 4 → pH 8', exp: '엽록체를 산성(pH 4) 용액에 넣어 틸라코이드 내부를 산성으로 만든 뒤 pH 8 용액으로 옮겼어요.', found: '빛이 없어도 ATP가 합성되었어요. H⁺ 농도 기울기가 ATP 합성의 힘이에요(화학 삼투).', fnd: 'H⁺ 농도 기울기가 ATP 합성의 힘', v1: '엽록체를 pH 4에서 pH 8로', v2: 'H⁺ 기울기가 ATP 합성의 힘', m: 'H⁺ 농도 기울기가 ATP 합성의 힘이다', con: ['chemi'] },
  ];
  const EVI = {}; EV.forEach((e) => { EVI[e.id] = e; });
  const CONC = { mat: '광합성의 재료는 CO₂와 물', o2: '식물이 O₂를 내놓는다', light: '빛을 이용한다 (명반응의 시작)', abs: '엽록소의 빛 흡수', water: '물의 광분해 · O₂는 물에서', lr: '명반응 (ATP · NADPH · O₂ 생성)', cf: '탄소 고정 반응 (캘빈 회로)', chemi: 'H⁺ 기울기와 화학 삼투' };
  const CONCS = { mat: '재료: CO₂ · 물', o2: 'O₂ 방출', light: '빛 이용', abs: '엽록소의 빛 흡수', water: '물의 광분해', lr: '명반응', cf: '캘빈 회로', chemi: '화학 삼투' };

  /* =========================================================
     ① 연대표: 순서 정하기 · 짝 맞추기
     ========================================================= */
  function tmG() {
    if (PHONE) { const sw = 146, sh = 92; return { n: 11, slot: (i) => ({ x: 10 + (i % 3) * (sw + 8), y: 30 + Math.floor(i / 3) * 118, w: sw, h: sh }), Dp: { x: 10, y: 486, w: 460, h: 144 }, M: { x: 10, y: 10, w: 460, h: 620 } }; }
    const sw = 118, sh = 150, gx = (772 - 6 * sw) / 5; return { n: 11, slot: (i) => (i < 6 ? { x: 14 + i * (sw + gx), y: 38, w: sw, h: sh } : { x: 14 + (i - 6) * (sw + gx) + (sw + gx) / 2, y: 38 + sh + 36, w: sw, h: sh }), Dp: { x: 14, y: 386, w: 772, h: 162 }, M: { x: 14, y: 14, w: 772, h: 534 } };
  }
  const SHUF = ['ruben', 'helm', 'jage', 'enge', 'hill', 'calv', 'prie', 'saus', 'anon', 'vann', 'inge'];
  S.tm = { view: 'sort', order: SHUF.slice(), cards: [], sel: null, focus: 'helm', flip: false, drag: null, okT: 0, mt: ['', '', '', '', '', ''] };
  const tmKeys = () => S.tm.order.map((id) => EVI[id].key);
  const tmSorted = () => { const k = tmKeys(); for (let i = 1; i < k.length; i++) if (k[i] < k[i - 1]) return false; return true; };
  const tmBad = () => { const k = tmKeys(), bad = []; for (let i = 0; i < k.length; i++) { let b = false; for (let j = i + 1; j < k.length; j++) if (k[j] < k[i]) b = true; if (b) bad.push(S.tm.order[i]); } return bad; };
  function tmBuild() {
    const g = tmG(); S.tm.cards = EV.map((e) => { const i = S.tm.order.indexOf(e.id), s = g.slot(i); return { id: e.id, x: s.x, y: s.y, w: s.w, h: s.h, flip: 0, lift: 0, bad: false, shake: 0 }; });
  }
  function tmSwap(i, j) { const o = S.tm.order, t = o[i]; o[i] = o[j]; o[j] = t; Sound.click(); S.tm.cards.forEach((c) => { c.bad = false; }); updateCtl(); }
  function tmShuffle() { S.tm.order = SHUF.slice(); S.tm.sel = null; S.tm.cards.forEach((c) => { c.bad = false; }); S.tm.okT = 0; updateCtl(); }
  const tmSlotAt = (p) => { const g = tmG(); for (let i = 0; i < g.n; i++) { const s = g.slot(i); if (p.x >= s.x - 4 && p.x <= s.x + s.w + 4 && p.y >= s.y - 4 && p.y <= s.y + s.h + 4) return i; } return -1; };
  const tmPT = {
    down(p) {
      if (S.tm.view !== 'sort') return false; const cs = S.tm.cards;
      for (let i = cs.length - 1; i >= 0; i--) { const c = cs[i]; if (p.x >= c.x && p.x <= c.x + c.w && p.y >= c.y && p.y <= c.y + c.h) { S.tm.drag = { c, dx: p.x - c.x, dy: p.y - c.y, sx: p.x, sy: p.y, moved: false }; cs.splice(i, 1); cs.push(c); Sound.tick(); return true; } }
      return false;
    },
    move(p) { const d = S.tm.drag; if (!d) return; if (Math.hypot(p.x - d.sx, p.y - d.sy) > 8) d.moved = true; if (d.moved) { d.c.x = clamp(p.x - d.dx, 0, VW - d.c.w); d.c.y = clamp(p.y - d.dy, 0, VH - d.c.h); } },
    up(p) {
      const d = S.tm.drag; if (!d) return; S.tm.drag = null; const c = d.c, from = S.tm.order.indexOf(c.id);
      if (!d.moved) { S.tm.focus = c.id; if (S.tm.sel && S.tm.sel !== c.id) { const a = S.tm.order.indexOf(S.tm.sel); tmSwap(a, from); S.tm.sel = null; } else S.tm.sel = S.tm.sel === c.id ? null : c.id; updateCtl(); return; }
      const j = tmSlotAt({ x: p.x, y: p.y }); S.tm.focus = c.id; if (j >= 0 && j !== from) tmSwap(from, j); S.tm.sel = null; updateCtl();
    },
    hover(p) { return S.tm.view === 'sort' && tmSlotAt(p) >= 0 ? 'grab' : 'default'; },
  };
  function evCard(c, e, t) {
    const lift = c.lift, w = c.w, h = c.h, cx = c.x + w / 2, cy = c.y + h / 2, f = c.flip, sx = Math.max(0.04, Math.abs(Math.cos(f * Math.PI))), back = f > 0.5;
    ctx.save(); ctx.translate(cx + (c.shake > 0 && !RM ? Math.sin(clock * 60) * 3 * c.shake : 0), cy); const sc = 1 + lift * 0.06; ctx.scale(sx * sc, sc);
    const sel = S.tm.sel === c.id, ok = S.tm.okT > 0.5;
    D.roundRect(-w / 2, -h / 2, w, h, 14); ctx.fillStyle = c.bad ? '#fdeceb' : back ? '#fff8dc' : '#fff'; ctx.fill();
    ctx.strokeStyle = c.bad ? '#e2464b' : sel ? '#f59e0b' : ok ? '#16a34a' : '#cbd5e1'; ctx.lineWidth = c.bad || sel ? 3.5 : 2.2; ctx.stroke();
    if (!back) {
      if (PHONE) { E(e.icon, -w / 2 + 24, -h / 2 + 28, 26); TF(-w / 2 + 44, -h / 2 + 24, e.who, w - 52, 14, 11, '#1f2d44', 'left', 800); wrapT(0, h / 2 - 28, w - 14, e.st, 12, '#475569', 14, 700, 2); }
      else { E(e.icon, 0, -h / 2 + 34, 34); TF(0, -h / 2 + 76, e.who, w - 14, 15.5, 11, '#1f2d44', 'center', 800); wrapT(0, h / 2 - 34, w - 16, e.st, 12.5, '#475569', 15, 700, 3); }
    } else {
      D.label(0, -h / 2 + (PHONE ? 18 : 22), e.ys, { bg: '#f59e0b', color: '#fff', size: PHONE ? 13 : 14.5 });
      wrapT(0, (PHONE ? 8 : 18), w - 14, e.fnd, PHONE ? 12 : 12.5, '#1f2d44', PHONE ? 13.5 : 15.5, 800, PHONE ? 3 : 5);
    }
    ctx.restore();
  }
  function timeDraw(dt, t) {
    const g = tmG(), tm = S.tm; tm.okT = approach(tm.okT, tmSorted() && tm.view === 'sort' ? 1 : 0, dt, 3);
    if (tm.view === 'match') { matchDraw(dt, t); return; }
    // 슬롯 바탕과 번호
    for (let i = 0; i < g.n; i++) { const s = g.slot(i); D.roundRect(s.x - 3, s.y - 3, s.w + 6, s.h + 6, 16); ctx.fillStyle = 'rgba(148,163,184,.14)'; ctx.fill(); ctx.strokeStyle = 'rgba(148,163,184,.5)'; ctx.setLineDash([5, 4]); ctx.lineWidth = 1.5; ctx.stroke(); ctx.setLineDash([]); T(s.x + s.w / 2, s.y - 8, tm.okT > 0.5 ? EVI[tm.order[i]].ys : (i + 1) + '번째', PHONE ? 12 : 13.5, tm.okT > 0.5 ? '#15803d' : '#94a3b8', 'center', 800); }
    // 이어지는 선
    if (tm.okT > 0.02) { ctx.save(); ctx.globalAlpha = tm.okT; ctx.strokeStyle = '#16a34a'; ctx.lineWidth = 5; ctx.lineCap = 'round'; for (let i = 0; i < g.n - 1; i++) { const a = g.slot(i), b = g.slot(i + 1); ctx.beginPath(); if (a.y !== b.y) { const my2 = a.y + a.h + (PHONE ? 4 : 10); ctx.moveTo(a.x + a.w / 2, a.y + a.h + 2); ctx.lineTo(a.x + a.w / 2, my2); ctx.lineTo(b.x + b.w / 2, my2); } else { ctx.moveTo(a.x + a.w + 4, a.y + a.h / 2); ctx.lineTo(b.x - 4, b.y + b.h / 2); } ctx.stroke(); } ctx.restore(); }
    // 카드
    tm.cards.forEach((c) => {
      const i = tm.order.indexOf(c.id), s = g.slot(i), dragging = tm.drag && tm.drag.c === c && tm.drag.moved;
      if (!dragging) { c.x = RM ? s.x : approach(c.x, s.x, dt, 12); c.y = RM ? s.y : approach(c.y, s.y, dt, 12); c.w = s.w; c.h = s.h; }
      c.flip = RM ? (tm.flip ? 1 : 0) : approach(c.flip, tm.flip ? 1 : 0, dt, 7); c.lift = approach(c.lift, dragging ? 1 : 0, dt, 14); c.shake = Math.max(0, c.shake - dt * 3);
    });
    tm.cards.forEach((c) => evCard(c, EVI[c.id], t));
    // 설명 칸
    const Dp = g.Dp; panel(Dp.x, Dp.y, Dp.w, Dp.h, 16, '#fff'); const e = EVI[tm.focus];
    if (!e) { T(Dp.x + 14, Dp.y + 30, '카드를 눌러 설명을 읽어요', 14.5, '#94a3b8', 'left', 800); return; }
    E(e.icon, Dp.x + 30, Dp.y + 32, 30); T(Dp.x + 58, Dp.y + 33, e.ys + ' · ' + e.who, PHONE ? 15 : 17, '#1f2d44', 'left', 800);
    textBlock(Dp.x + 14, Dp.y + 62, Dp.w - 28, '실험: ' + e.exp, PHONE ? 12 : 13.5, '#334155', PHONE ? 14 : 18, 700);
    const nl = wrap('실험: ' + e.exp, Dp.w - 28, PHONE ? 12 : 13.5, 700).length;
    textBlock(Dp.x + 14, Dp.y + 62 + nl * (PHONE ? 14 : 18) + 6, Dp.w - 28, '알게 된 것: ' + e.found, PHONE ? 12 : 13.5, '#15803d', PHONE ? 14 : 18, 800);
  }
  /* ---- 인물 – 발견 짝 맞추기 ---- */
  const MT_P = ['helm', 'prie', 'inge', 'enge', 'ruben', 'calv'], MT_ORDER = [3, 0, 5, 1, 4, 2];
  const mtVal = (i) => $('#mt' + (i + 1)).value;
  const mtOk = (i) => mtVal(i) === MT_P[i];
  function matchDraw(dt, t) {
    const g = tmG(), M = g.M; panel(M.x, M.y, M.w, M.h, 18, '#fff');
    T(M.x + 14, M.y + 26, '누가 무엇을 알아냈을까요?', PHONE ? 14.5 : 16.5, '#1f2d44', 'left', 800);
    const rh = PHONE ? 90 : 78, y0 = M.y + 44, lw = PHONE ? 150 : 250, rw = PHONE ? 214 : 300, lx = M.x + 14, rx = M.x + M.w - rw - 14;
    MT_P.forEach((id, i) => {
      const e = EVI[id], y = y0 + i * rh, ok = mtOk(i), v = mtVal(i);
      D.roundRect(lx, y, lw, rh - 12, 12); ctx.fillStyle = ok ? 'rgba(34,197,94,.14)' : '#f8fafc'; ctx.fill(); ctx.strokeStyle = ok ? '#16a34a' : '#cbd5e1'; ctx.lineWidth = 2; ctx.stroke();
      E(e.icon, lx + 26, y + (rh - 12) / 2, 26); T(lx + 50, y + (rh - 12) / 2 - 4, e.who, PHONE ? 13.5 : 15.5, '#1f2d44', 'left', 800); T(lx + 50, y + (rh - 12) / 2 + 15, e.ys, PHONE ? 12 : 13, '#64748b', 'left', 700);
      const j = MT_P.indexOf(id), yj = y0 + MT_ORDER.indexOf(j) * rh;
    });
    MT_ORDER.forEach((j, k) => {
      const e = EVI[MT_P[j]], y = y0 + k * rh, taken = [0, 1, 2, 3, 4, 5].filter((i) => mtVal(i) === MT_P[j]);
      D.roundRect(rx, y, rw, rh - 12, 12); ctx.fillStyle = taken.length ? 'rgba(99,102,241,.1)' : '#f8fafc'; ctx.fill(); ctx.strokeStyle = taken.length ? '#6366f1' : '#cbd5e1'; ctx.lineWidth = 2; ctx.stroke();
      wrapT(rx + rw / 2, y + (rh - 12) / 2, rw - 22, e.m, PHONE ? 12 : 13.5, '#1f2d44', PHONE ? 14 : 16, 800, 3);
    });
    // 선
    MT_P.forEach((id, i) => {
      const v = mtVal(i); if (!v) return; const k = MT_ORDER.indexOf(MT_P.indexOf(v)), ya = y0 + i * rh + (rh - 12) / 2, yb = y0 + k * rh + (rh - 12) / 2, ok = v === id;
      ctx.save(); ctx.strokeStyle = ok ? '#16a34a' : '#ef4444'; ctx.lineWidth = 4; ctx.lineCap = 'round'; if (!ok) ctx.setLineDash([2, 7]); ctx.beginPath(); ctx.moveTo(lx + lw, ya); ctx.bezierCurveTo(lx + lw + 60, ya, rx - 60, yb, rx, yb); ctx.stroke(); ctx.restore();
    });
    T(M.x + M.w / 2, M.y + M.h - 14, '맞힌 짝 ' + [0, 1, 2, 3, 4, 5].filter(mtOk).length + ' / 6', PHONE ? 12.5 : 14, '#64748b', 'center', 800);
  }

  /* =========================================================
     ② 산소의 출처: 엥겔만 · 루벤과 카멘
     ========================================================= */
  const BE = [{ k: 'blue', name: '청자색', lo: 430, hi: 450, n: 45 }, { k: 'cyan', name: '청록색', lo: 480, hi: 500, n: 12 }, { k: 'green', name: '녹색', lo: 530, hi: 570, n: 5 }, { k: 'yel', name: '황주색', lo: 580, hi: 620, n: 11 }, { k: 'red', name: '적색', lo: 650, hi: 680, n: 40 }];
  const ENGC = (w) => 5 + 40 * Math.exp(-Math.pow((w - 440) / 26, 2)) + 35 * Math.exp(-Math.pow((w - 668) / 24, 2)) + 6 * Math.exp(-Math.pow((w - 600) / 22, 2)) + 7 * Math.exp(-Math.pow((w - 488) / 18, 2));
  S.en = { bact: [], run: false, done: false, sel: {}, t: 0 };
  function enG() {
    return PHONE ? { A: { x: 10, y: 10, w: 460, h: 252 }, B: { x: 10, y: 270, w: 460, h: 250 }, x0: 28, x1: 452, fy: 170, lamp: { x: 32, y: 66 }, pr: { x: 78, y: 66 } }
      : { A: { x: 14, y: 14, w: 772, h: 292 }, B: { x: 14, y: 314, w: 772, h: 234 }, x0: 44, x1: 756, fy: 212, lamp: { x: 50, y: 90 }, pr: { x: 128, y: 90 } };
  }
  function enReset() {
    const g = enG(), r = mulberry(11), list = [], n = BE.reduce((a, b) => a + b.n, 0);
    for (let i = 0; i < n; i++) list.push({ x0: g.x0 + 6 + r() * (g.x1 - g.x0 - 12), y: g.fy + (r() - 0.5) * 70 });
    list.sort((a, b) => a.x0 - b.x0); let k = 0;
    BE.forEach((b) => { for (let i = 0; i < b.n; i++, k++) { const q = list[k]; q.band = b.k; q.tx = 400 + 0; const nm = b.lo + r() * (b.hi - b.lo); q.tnm = nm; q.ty = g.fy + (r() - 0.5) * 16; q.x = q.x0; q.sp = 38 + r() * 40; q.ph = r() * 6; } });
    S.en.bact = list; S.en.run = false; S.en.done = false; S.en.t = 0; updateCtl();
  }
  const enNm = (g, x) => 400 + (x - g.x0) / (g.x1 - g.x0) * 300, enPx = (g, nm) => g.x0 + (nm - 400) / 300 * (g.x1 - g.x0);
  const enCount = (g) => BE.map((b) => S.en.bact.filter((q) => { const nm = enNm(g, q.x); return nm >= b.lo - 0.01 && nm <= b.hi + 0.01 && Math.abs(q.y - g.fy) < 14; }).length);
  const enSelOK = () => { const s = S.en.sel; return !!(s.blue && s.red && !s.cyan && !s.green && !s.yel); };
  const enPT = {
    down(p) {
      if (S.src.view !== 'eng') return false; const g = enG(), B = g.B, bw = (g.x1 - g.x0);
      if (!S.en.done) return false;
      for (const b of BE) { const x1 = enPx(g, b.lo) - 8, x2 = enPx(g, b.hi) + 8; if (p.x >= x1 && p.x <= x2 && p.y >= B.y + 30 && p.y <= B.y + B.h - 24) { S.en.sel[b.k] = !S.en.sel[b.k]; Sound.click(); updateCtl(); return true; } }
      return false;
    },
    hover(p) { return S.src.view === 'eng' && S.en.done && p.y > enG().B.y ? 'pointer' : 'default'; },
  };
  function enUpdate(dt) {
    const g = enG(), en = S.en; if (!en.run) return; en.t += dt; let all = true;
    en.bact.forEach((q) => {
      const tx = enPx(g, q.tnm), dx = tx - q.x, dy = q.ty - q.y, d = Math.hypot(dx, dy);
      if (d > 1.5) { all = false; const v = Math.min(d, q.sp * dt * (RM ? 8 : 1)); q.x += dx / d * v; q.y += dy / d * v + Math.sin(en.t * 6 + q.ph) * 0.25; } else { q.x = tx; q.y = q.ty; }
    });
    if (all) { en.run = false; en.done = true; Sound.success(); updateCtl(); }
  }
  function enDraw(dt, t) {
    const g = enG(), en = S.en; enUpdate(dt); const A = g.A, B = g.B;
    panel(A.x, A.y, A.w, A.h, 18, '#0f172a');
    // 빛 → 프리즘 → 스펙트럼
    D.glow(g.lamp.x, g.lamp.y, 40, '#fff', 0.5); D.sphere(g.lamp.x, g.lamp.y, 13, '#fffbe6', { gloss: true }); ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fillRect(g.lamp.x + 12, g.lamp.y - 2, g.pr.x - g.lamp.x - 26, 4);
    ctx.save(); ctx.beginPath(); ctx.moveTo(g.pr.x - 18, g.pr.y + 16); ctx.lineTo(g.pr.x, g.pr.y - 18); ctx.lineTo(g.pr.x + 18, g.pr.y + 16); ctx.closePath(); ctx.fillStyle = 'rgba(186,230,253,.6)'; ctx.fill(); ctx.strokeStyle = '#e0f2fe'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
    T(g.pr.x, g.pr.y + 38, '프리즘', PHONE ? 12 : 13, '#bae6fd', 'center', 800); T(g.lamp.x, g.lamp.y + 34, '빛', PHONE ? 12 : 13, '#fef3c7', 'center', 800);
    const sy0 = g.fy - 44, sh = 88;
    // 부채꼴
    const grd = ctx.createLinearGradient(g.x0, 0, g.x1, 0); for (let w = 400; w <= 700; w += 20) grd.addColorStop((w - 400) / 300, wl2rgb(w)); ctx.save(); ctx.globalAlpha = 0.18; ctx.fillStyle = grd; ctx.beginPath(); ctx.moveTo(g.pr.x + 14, g.pr.y); ctx.lineTo(g.x1, sy0 - 6); ctx.lineTo(g.x0, sy0 - 6); ctx.closePath(); ctx.fill(); ctx.restore();
    ctx.save(); ctx.globalAlpha = 0.9; ctx.fillStyle = grd; ctx.fillRect(g.x0, sy0, g.x1 - g.x0, sh); ctx.restore();
    ctx.fillStyle = 'rgba(15,23,42,.22)'; ctx.fillRect(g.x0, sy0, g.x1 - g.x0, sh);
    // 해캄 (녹색 줄 모양 세포)
    const cw = PHONE ? 20 : 26; for (let x = g.x0; x < g.x1 - 2; x += cw) { D.roundRect(x + 1, g.fy - 11, cw - 2, 22, 5); ctx.fillStyle = 'rgba(187,247,208,.55)'; ctx.fill(); ctx.strokeStyle = '#166534'; ctx.lineWidth = 1.2; ctx.stroke(); ctx.strokeStyle = '#15803d'; ctx.lineWidth = 2.4; ctx.beginPath(); for (let k = 0; k <= 8; k++) { const xx = x + 3 + (cw - 6) * k / 8, yy = g.fy + (k % 2 ? 7 : -7); if (k) ctx.lineTo(xx, yy); else ctx.moveTo(xx, yy); } ctx.stroke(); }
    T(g.x0, sy0 - 12, '해캄(녹조류)과 호기성 세균 · 프리즘으로 나눈 빛', PHONE ? 12 : 13.5, '#e2e8f0', 'left', 800);
    [400, 500, 600, 700].forEach((w) => T(enPx(g, w), sy0 + sh + 18, w + ' nm', PHONE ? 12 : 12.5, '#cbd5e1', 'center', 800));
    // 세균
    ctx.save(); ctx.fillStyle = '#93c5fd'; en.bact.forEach((q) => { ctx.beginPath(); ctx.ellipse(q.x, q.y, 3.4, 2, 0.4 + q.ph, 0, TAU); ctx.fill(); }); ctx.restore();
    T(A.x + A.w - 14, A.y + A.h - 14, '세균 ' + en.bact.length + '마리 (산소가 많은 곳으로 모여요)', PHONE ? 12 : 13.5, '#93c5fd', 'right', 800);
    if (!en.run && !en.done) T(A.x + A.w / 2, A.y + A.h - 40, '▶ 시간 흐르게 하기를 눌러 보세요', PHONE ? 13 : 15, '#fde68a', 'center', 800);
    // 막대 그래프 + 흡수 곡선
    panel(B.x, B.y, B.w, B.h, 18, '#fff');
    const cnt = enCount(g), top = B.y + 34, bot = B.y + B.h - 42, Y = (n) => bot - clamp(n / 50, 0, 1) * (bot - top);
    T(B.x + 14, B.y + 22, '영역별 세균 수', PHONE ? 13.5 : 15, '#1f2d44', 'left', 800);
    [0, 25, 50].forEach((n) => { ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(g.x0 - 6, Y(n)); ctx.lineTo(g.x1, Y(n)); ctx.stroke(); T(g.x0 - 10, Y(n) + 4, String(n), 12, '#64748b', 'right', 700); });
    BE.forEach((b, i) => {
      const x1 = enPx(g, b.lo), x2 = enPx(g, b.hi), sel = en.sel[b.k], c = cnt[i];
      if (sel) { D.roundRect(x1 - 7, top - 6, x2 - x1 + 14, bot - top + 12, 8); ctx.fillStyle = 'rgba(250,204,21,.22)'; ctx.fill(); ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 2.5; ctx.stroke(); }
      const hh = bot - Y(c); if (hh > 0.5) { D.roundRect(x1, bot - hh, x2 - x1, hh, 4); ctx.fillStyle = wl2rgb((b.lo + b.hi) / 2); ctx.fill(); ctx.strokeStyle = 'rgba(15,23,42,.4)'; ctx.lineWidth = 1.2; ctx.stroke(); }
      T((x1 + x2) / 2, Y(c) - 6, String(c), PHONE ? 14 : 16, '#1f2d44', 'center', 800); T((x1 + x2) / 2, bot + 16, b.name, PHONE ? 12 : 12.5, '#475569', 'center', 800);
    });
    ctx.save(); ctx.strokeStyle = '#16a34a'; ctx.lineWidth = 2.4; ctx.setLineDash([6, 4]); ctx.beginPath(); for (let w = 400; w <= 700; w += 4) { const x = enPx(g, w), y = Y(ENGC(w)); if (w === 400) ctx.moveTo(x, y); else ctx.lineTo(x, y); } ctx.stroke(); ctx.restore();
    T(B.x + B.w - 14, B.y + 22, '점선: 엽록체 색소의 흡수(상대)', PHONE ? 12 : 13.5, '#166534', 'right', 800);
    if (en.done) T(B.x + B.w / 2, B.y + B.h - 7, '세균이 가장 많은 두 영역의 막대를 눌러 골라요', PHONE ? 12 : 13.5, '#b45309', 'center', 800);
  }
  /* ---- 루벤과 카멘 ---- */
  function rbNew(exp) { return { exp, mols: [], bub: [], tube: [], t: 0, running: false, spawned: 0, done: false, lab: 0 }; }
  S.rb = { exp: 'A', A: rbNew('A'), B: rbNew('B'), conOn: false };
  function rbG() {
    return PHONE ? { P: { A: { x: 10, y: 10, w: 460, h: 252 }, B: { x: 10, y: 268, w: 460, h: 252 } }, R: { x: 10, y: 528, w: 460, h: 102 } }
      : { P: { A: { x: 14, y: 14, w: 382, h: 372 }, B: { x: 404, y: 14, w: 382, h: 372 } }, R: { x: 14, y: 394, w: 772, h: 154 } };
  }
  const RBL = { A: { water: 'H₂¹⁸O', co2: 'CO₂', wl: true, cl: false, title: 'A. 물에 ¹⁸O 표지' }, B: { water: 'H₂O', co2: 'C¹⁸O₂', wl: false, cl: true, title: 'B. CO₂에 ¹⁸O 표지' } };
  function rbGo() { const r = S.rb, e = r[r.exp]; if (e.running) return; Object.assign(e, rbNew(r.exp)); e.running = true; Sound.click(); updateCtl(); }
  function rbClear() { S.rb.A = rbNew('A'); S.rb.B = rbNew('B'); S.rb.conOn = false; updateCtl(); }
  function atomO(x, y, lab, r) { D.sphere(x, y, r, lab ? '#dc2626' : '#7dd3fc', { gloss: true }); if (lab && r > 6) T(x, y + r * 0.34, '¹⁸', r * 0.95, '#fff', 'center', 800); }
  function rbPanel(P, key, t, dt) {
    const e = S.rb[key], L = RBL[key]; const sel = S.rb.exp === key;
    panel(P.x, P.y, P.w, P.h, 18, sel ? '#fffef5' : '#fff'); if (sel) { D.roundRect(P.x, P.y, P.w, P.h, 18); ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 3; ctx.stroke(); }
    T(P.x + 14, P.y + 24, L.title, PHONE ? 13.5 : 15.5, '#1f2d44', 'left', 800);
    const cx = P.x + P.w / 2, cy = P.y + P.h * (PHONE ? 0.66 : 0.62), tubeX = cx, tubeY = P.y + (PHONE ? 38 : 44), tubeH = PHONE ? 84 : 128;
    // 모으는 시험관
    D.roundRect(tubeX - 26, tubeY, 52, tubeH, 12); ctx.fillStyle = 'rgba(186,230,253,.35)'; ctx.fill(); ctx.strokeStyle = '#60a5fa'; ctx.lineWidth = 2.5; ctx.stroke();
    T(tubeX + 36, tubeY + 14, '모은 O₂', PHONE ? 12 : 13, '#0369a1', 'left', 800);
    e.tube.forEach((m, i) => { const col = i % 2, row = Math.floor(i / 2); const x = tubeX - 11 + col * 22, y = tubeY + tubeH - 14 - row * 17; atomO(x - 4, y, m.lab, 5.2); atomO(x + 4, y, m.lab, 5.2); });
    // 세포
    const R = PHONE ? 36 : 54; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fillStyle = 'rgba(187,247,208,.55)'; ctx.fill(); ctx.strokeStyle = '#16a34a'; ctx.lineWidth = 3; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(cx, cy, R * 0.6, R * 0.38, 0.4, 0, TAU); ctx.fillStyle = '#4ade80'; ctx.fill(); ctx.strokeStyle = '#15803d'; ctx.lineWidth = 2; ctx.stroke(); T(cx, cy + R + 16, '클로렐라(엽록체)', PHONE ? 12 : 13, '#166534', 'center', 800);
    // 물 · CO₂ 공급원
    const wx = P.x + (PHONE ? 52 : 62), wy = cy + (PHONE ? 8 : 26), kx = P.x + P.w - (PHONE ? 52 : 62);
    D.roundRect(wx - 40, wy - 34, 80, 70, 12); ctx.fillStyle = 'rgba(147,197,253,.4)'; ctx.fill(); ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 2; ctx.stroke(); T(wx, wy + 52, L.water, PHONE ? 13 : 14.5, '#1d4ed8', 'center', 800);
    for (let k = 0; k < 3; k++) { const ax = wx - 22 + k * 22, ay = wy - 6 + (k % 2) * 16; atomO(ax, ay, L.wl, 7); D.sphere(ax - 7, ay + 8, 3.6, '#f8fafc', { gloss: false, outline: '#94a3b8', outlineWidth: 0.8 }); D.sphere(ax + 7, ay + 8, 3.6, '#f8fafc', { gloss: false, outline: '#94a3b8', outlineWidth: 0.8 }); }
    D.roundRect(kx - 40, wy - 34, 80, 70, 12); ctx.fillStyle = 'rgba(226,232,240,.7)'; ctx.fill(); ctx.strokeStyle = '#64748b'; ctx.lineWidth = 2; ctx.stroke(); T(kx, wy + 52, L.co2, PHONE ? 13 : 14.5, '#334155', 'center', 800);
    for (let k = 0; k < 2; k++) { const ax = kx - 18 + k * 36, ay = wy - 4 + k * 4; atomO(ax - 9, ay, L.cl, 5.6); D.sphere(ax, ay, 5.2, '#475569', { gloss: true }); atomO(ax + 9, ay, L.cl, 5.6); }
    if (!e.running && !e.done) { T(cx, P.y + P.h - 14, sel ? '▶ 광합성 시키기를 눌러요' : '(다른 실험이에요)', PHONE ? 12 : 13.5, '#94a3b8', 'center', 800); }
    // 진행
    if (e.running) {
      e.t += dt; const iv = 0.9; while (e.spawned < 8 && e.t >= e.spawned * iv + 0.2) { e.spawned++; const k = e.spawned; for (let w = 0; w < 2; w++) e.mols.push({ k: 'w', t: -w * 0.12, sx: wx + (w ? 14 : -14), sy: wy, ex: cx, ey: cy, lab: L.wl }); e.mols.push({ k: 'c', t: -0.2, sx: kx, sy: wy, ex: cx, ey: cy, lab: L.cl }); e.bub.push({ t: -0.9, lab: L.wl, x: cx, y: cy - R * 0.2 }); }
      if (e.spawned >= 8 && !e.bub.length && !e.mols.length) { e.running = false; e.done = true; e.lab = e.tube.filter((m) => m.lab).length; Sound.success(); updateCtl(); }
    }
    for (let i = e.mols.length - 1; i >= 0; i--) { const m = e.mols[i]; m.t += dt / 0.9; if (m.t < 0) continue; const u = SciSim.ease.inOutSine(clamp(m.t, 0, 1)), x = m.sx + (m.ex - m.sx) * u, y = m.sy + (m.ey - m.sy) * u; ctx.save(); ctx.globalAlpha = 1 - clamp((m.t - 0.8) / 0.2, 0, 1); if (m.k === 'w') { atomO(x, y, m.lab, 7); D.sphere(x - 7, y + 8, 3.6, '#f8fafc', { gloss: false, outline: '#94a3b8', outlineWidth: 0.8 }); D.sphere(x + 7, y + 8, 3.6, '#f8fafc', { gloss: false, outline: '#94a3b8', outlineWidth: 0.8 }); } else { atomO(x - 9, y, m.lab, 5.6); D.sphere(x, y, 5.2, '#475569', { gloss: true }); atomO(x + 9, y, m.lab, 5.6); } ctx.restore(); if (m.t >= 1) e.mols.splice(i, 1); }
    for (let i = e.bub.length - 1; i >= 0; i--) { const b = e.bub[i]; b.t += dt / 1.3; if (b.t < 0) continue; const u = clamp(b.t, 0, 1); const tx = tubeX, ty = tubeY + tubeH - 14 - Math.floor(e.tube.length / 2) * 17; const x = b.x + (tx - b.x) * u, y = b.y + (ty - b.y) * u - Math.sin(u * Math.PI) * 6; atomO(x - 4.5, y, b.lab, 6); atomO(x + 4.5, y, b.lab, 6); if (b.t >= 1) { e.bub.splice(i, 1); e.tube.push({ lab: b.lab }); Sound.tick(); } }
  }
  function rubDraw(dt, t) {
    const g = rbG(); rbPanel(g.P.A, 'A', t, dt); rbPanel(g.P.B, 'B', t, dt);
    const R = g.R; panel(R.x, R.y, R.w, R.h, 16, '#fff'); T(R.x + 14, R.y + 26, '결과 기록 (모은 O₂ 8분자 중)', PHONE ? 13.5 : 15, '#1f2d44', 'left', 800);
    [['A', 'A. H₂¹⁸O + CO₂ 를 줌'], ['B', 'B. H₂O + C¹⁸O₂ 를 줌']].forEach(([k, nm], i) => {
      const e = S.rb[k], y = R.y + 44 + i * (PHONE ? 26 : 34), has = e.done; if (S.rb.exp === k) { D.roundRect(R.x + 8, y - 4, R.w - 16, PHONE ? 24 : 30, 8); ctx.fillStyle = 'rgba(250,204,21,.18)'; ctx.fill(); }
      T(R.x + 18, y + (PHONE ? 14 : 17), nm, PHONE ? 12.5 : 14.5, '#1f2d44', 'left', 800);
      T(R.x + (PHONE ? 240 : 330), y + (PHONE ? 14 : 17), has ? '¹⁸O₂ ' + e.lab + ' / ' + e.tube.length + '분자' : (e.running ? '모으는 중… (' + e.tube.length + ' / 8)' : '아직 실험하지 않았어요'), PHONE ? 13 : 15, has ? (e.lab > 0 ? '#b91c1c' : '#334155') : '#94a3b8', 'left', 800);
    });
    if (!PHONE) D.sphere(R.x + 24, R.y + R.h - 20, 6.5, '#dc2626', { gloss: true }), T(R.x + 38, R.y + R.h - 15, '¹⁸O (표지된 산소)', 13, '#b91c1c', 'left', 800), D.sphere(R.x + 190, R.y + R.h - 20, 6.5, '#7dd3fc', { gloss: true }), T(R.x + 204, R.y + R.h - 15, '보통 산소', 13, '#0369a1', 'left', 800);
  }
  function srcDraw(dt, t) { if (S.src.view === 'eng') enDraw(dt, t); else rubDraw(dt, t); }

  /* =========================================================
     ③ 캘빈의 추적
     ========================================================= */
  const CD = { 2: { pg: 85, sp: 10, ot: 5 }, 30: { pg: 40, sp: 45, ot: 15 }, 300: { pg: 15, sp: 30, ot: 55 } };
  const CT = { 2: '2초', 30: '30초', 300: '5분' };
  const CC = { pg: '#2563eb', sp: '#f97316', ot: '#64748b' }, CN = { pg: '3PG', sp: '당 인산', ot: '기타' };
  S.cl = { t: 2, rec: {}, run: null, cur: null, spots: 0, first: null, readOn: false };
  function clG() {
    return PHONE ? { F: { x: 10, y: 10, w: 460, h: 150 }, Pp: { x: 10, y: 168, w: 226, h: 226 }, G: { x: 244, y: 168, w: 226, h: 226 }, Q: { x: 10, y: 402, w: 460, h: 228 } }
      : { F: { x: 14, y: 14, w: 248, h: 366 }, Pp: { x: 270, y: 14, w: 272, h: 366 }, G: { x: 550, y: 14, w: 236, h: 366 }, Q: { x: 14, y: 388, w: 772, h: 160 } };
  }
  function clGo() { const c = S.cl; if (c.run) return; c.run = { t: 0, time: c.t }; c.cur = null; c.spots = 0; Sound.click(); updateCtl(); }
  function clClear() { const c = S.cl; c.rec = {}; c.run = null; c.cur = null; c.spots = 0; c.first = null; updateCtl(); }
  const clN = () => Object.keys(S.cl.rec).length;
  function clDraw(dt, t) {
    const g = clG(), c = S.cl;
    if (c.run) { c.run.t += dt; const u = c.run.t / 3.2; c.spots = RM ? 1 : approach(c.spots, clamp((u - 0.45) * 2, 0, 1), dt, 6); if (c.run.t >= 3.2) { c.cur = c.run.time; c.rec[c.run.time] = true; c.spots = 1; c.run = null; Sound.success(); updateCtl(); } }
    else c.spots = c.cur ? 1 : 0;
    // 플라스크
    const F = g.F; panel(F.x, F.y, F.w, F.h, 18, '#fff'); T(F.x + 14, F.y + 24, '클로렐라 + ¹⁴CO₂', PHONE ? 13.5 : 15, '#1f2d44', 'left', 800);
    const fx = F.x + (PHONE ? 110 : F.w / 2), fy = F.y + F.h - (PHONE ? 22 : 40), fw = PHONE ? 90 : 150, fh = PHONE ? 100 : 190;
    D.flask(fx, fy, fw, fh, { level: 0.55, liquid: '#4ade80', t });
    for (let k = 0; k < 7; k++) { const ph = (t * 0.7 + k * 0.31) % 1; ctx.save(); ctx.globalAlpha = Math.sin(ph * Math.PI) * 0.8; D.sphere(fx - fw * 0.2 + (k * 13 % 40) * (fw / 90), fy - 12 - ph * fh * 0.4, 3.4, '#bbf7d0', { gloss: false }); ctx.restore(); }
    // ¹⁴CO₂ 방울
    const running = !!c.run, tm = running ? c.run.time : c.t;
    ctx.save(); ctx.globalAlpha = running ? 1 : 0.55; for (let k = 0; k < 4; k++) { const ph = (t * 0.9 + k * 0.25) % 1; const x = fx + (k % 2 ? 7 : -7), y = fy - fh - 22 + ph * (fh * 0.52); D.sphere(x - 7, y, 3.6, '#dc2626', { gloss: false }); D.sphere(x, y, 4.4, '#475569', { gloss: false }); D.sphere(x + 7, y, 3.6, '#dc2626', { gloss: false }); } ctx.restore();
    // 시계
    const cxk = F.x + (PHONE ? F.w - 90 : F.w / 2), cyk = F.y + (PHONE ? 78 : 80); ctx.beginPath(); ctx.arc(cxk, cyk, PHONE ? 30 : 34, 0, TAU); ctx.fillStyle = '#f8fafc'; ctx.fill(); ctx.strokeStyle = '#334155'; ctx.lineWidth = 3; ctx.stroke();
    const prog = running ? clamp(c.run.t / 3.2, 0, 1) : 0, shown = running ? Math.round(tm * clamp(c.run.t / 2.2, 0, 1)) : tm; const a = -Math.PI / 2 + prog * TAU; ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cxk, cyk); ctx.lineTo(cxk + Math.cos(a) * 22, cyk + Math.sin(a) * 22); ctx.stroke();
    T(cxk, cyk + (PHONE ? 52 : 52), '시료: ' + CT[tm] + ' 뒤', PHONE ? 13 : 14.5, '#334155', 'center', 800);
    if (running && !PHONE) T(F.x + F.w / 2, F.y + F.h - 8, '꺼내서 바로 얼려요', 13, '#b45309', 'center', 800);
    // 종이
    const Pp = g.Pp; panel(Pp.x, Pp.y, Pp.w, Pp.h, 18, '#fff'); T(Pp.x + 14, Pp.y + 24, '종이 크로마토그래피 + 자기방사법', PHONE ? 12 : 14, '#1f2d44', 'left', 800);
    const pw = Pp.w - 36, px = Pp.x + 18, py = Pp.y + 40, ph2 = Pp.h - (PHONE ? 74 : 84); D.roundRect(px, py, pw, ph2, 8); ctx.fillStyle = '#f1f5f9'; ctx.fill(); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; ctx.stroke();
    ctx.save(); D.roundRect(px, py, pw, ph2, 8); ctx.clip();
    const spot = (u, v, ratio, col, lab) => { const rr = clamp(Math.sqrt(ratio / 100) * (PHONE ? 30 : 38), 0, 42), al = clamp(0.25 + ratio / 100 * 0.75, 0, 1) * c.spots; if (al < 0.02) return; const x = px + u * pw, y = py + v * ph2; const g2 = ctx.createRadialGradient(x, y, 0, x, y, rr * 1.4); g2.addColorStop(0, 'rgba(15,23,42,' + al + ')'); g2.addColorStop(0.6, 'rgba(15,23,42,' + al * 0.7 + ')'); g2.addColorStop(1, 'rgba(15,23,42,0)'); ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(x, y, rr * 1.4, 0, TAU); ctx.fill(); };
    if (c.cur || c.run) { const dd = CD[c.run ? c.run.time : c.cur]; spot(0.34, 0.74, dd.pg, CC.pg); spot(0.52, 0.5, dd.sp, CC.sp); [[0.26, 0.28], [0.74, 0.62], [0.7, 0.2]].forEach(([u, v]) => spot(u, v, dd.ot / 3, CC.ot)); }
    ctx.restore();
    if (c.cur || c.run) { const dd = CD[c.run ? c.run.time : c.cur]; if (c.spots > 0.6) { T(px + 0.34 * pw + 6, py + 0.74 * ph2 + (PHONE ? 38 : 48), '3PG', PHONE ? 12 : 13.5, '#1d4ed8', 'center', 800, { stroke: 'rgba(241,245,249,.9)', strokeWidth: 3 }); T(px + 0.52 * pw, py + 0.5 * ph2 - (PHONE ? 30 : 38), '당 인산', PHONE ? 12 : 13.5, '#c2410c', 'center', 800, { stroke: 'rgba(241,245,249,.9)', strokeWidth: 3 }); T(px + 0.74 * pw, py + 0.62 * ph2 + (PHONE ? 26 : 30), '기타', PHONE ? 12 : 13.5, '#475569', 'center', 800, { stroke: 'rgba(241,245,249,.9)', strokeWidth: 3 }); } }
    else T(px + pw / 2, py + ph2 / 2, '시료를 채취하면 점이 나타나요', PHONE ? 12.5 : 13.5, '#94a3b8', 'center', 800);
    D.arrow(px + 8, py + ph2 + 12, px + pw - 8, py + ph2 + 12, { color: '#94a3b8', width: 2, head: 7 }); T(px + pw / 2, py + ph2 + 28, c.cur || c.run ? '점이 클수록 · 진할수록 ¹⁴C가 많아요' : '방사선이 닿은 곳이 검게 나타나요', PHONE ? 12 : 12, '#64748b', 'center', 700);
    // 비율 막대
    const G = g.G; panel(G.x, G.y, G.w, G.h, 18, '#fff'); T(G.x + 14, G.y + 24, '표지 비율 (%)', PHONE ? 13 : 15, '#1f2d44', 'left', 800);
    [2, 30, 300].forEach((tt, i) => {
      const y = G.y + 44 + i * (PHONE ? 54 : 74), x0 = G.x + 14, w = G.w - 28, done = !!c.rec[tt], cur = c.run ? c.run.time === tt : c.cur === tt; T(x0, y, CT[tt], PHONE ? 13 : 14.5, cur ? '#b45309' : '#334155', 'left', 800);
      D.roundRect(x0, y + 8, w, PHONE ? 26 : 30, 8); ctx.fillStyle = '#eef2f7'; ctx.fill(); if (cur) { ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 2.5; ctx.stroke(); }
      if (done || (cur && c.spots > 0.2)) { const d = CD[tt], k = done && !(c.run && c.run.time === tt) ? 1 : c.spots; let xx = x0; ['pg', 'sp', 'ot'].forEach((q) => { const ww = w * d[q] / 100 * k; if (ww > 0.5) { ctx.save(); D.roundRect(x0, y + 8, w, PHONE ? 26 : 30, 8); ctx.clip(); ctx.fillStyle = CC[q]; ctx.fillRect(xx, y + 8, ww, PHONE ? 26 : 30); ctx.restore(); if (ww > 24) T(xx + ww / 2, y + (PHONE ? 27 : 29), String(d[q]), PHONE ? 13 : 14.5, '#fff', 'center', 800); } xx += ww; }); }
    });
    [['pg', 0], ['sp', 1], ['ot', 2]].forEach(([q, i]) => { const y = G.y + G.h - (PHONE ? 16 : 22) - (2 - i) * (PHONE ? 0 : 0); const x = G.x + 14 + i * (PHONE ? 66 : 70); ctx.fillStyle = CC[q]; ctx.fillRect(x, y - 10, 12, 12); T(x + 16, y, CN[q], PHONE ? 12 : 12.5, '#475569', 'left', 800); });
    // 기록표
    const Q = g.Q; panel(Q.x, Q.y, Q.w, Q.h, 18, '#fff'); T(Q.x + 14, Q.y + 24, '기록표 (¹⁴C 표지 비율, 가상 자료)', PHONE ? 13 : 15, '#1f2d44', 'left', 800);
    const cols = PHONE ? [74, 90, 100, 90] : [140, 170, 170, 170], hx = Q.x + 14; let xx = hx; ['시간', '3PG', '당 인산', '기타'].forEach((h, k) => { D.roundRect(xx, Q.y + 36, cols[k] - 4, 26, 7); ctx.fillStyle = k ? C.rgba(Object.values(CC)[k - 1], 0.18) : '#e2e8f0'; ctx.fill(); T(xx + (cols[k] - 4) / 2, Q.y + 54, h, PHONE ? 12.5 : 14, '#334155', 'center', 800); xx += cols[k]; });
    [2, 30, 300].forEach((tt, i) => { const y = Q.y + 70 + i * (PHONE ? 38 : 26); xx = hx; const d = CD[tt], has = !!c.rec[tt]; const vals = [CT[tt], has ? d.pg + ' %' : '?', has ? d.sp + ' %' : '?', has ? d.ot + ' %' : '?']; vals.forEach((v, k) => { const col = has || k === 0 ? '#1f2d44' : '#cbd5e1'; T(xx + (cols[k] - 4) / 2, y + (PHONE ? 16 : 18), v, PHONE ? 14 : 16, col, 'center', 800); xx += cols[k]; }); });
    if (!PHONE) T(Q.x + Q.w - 14, Q.y + 24, '앞 차시의 3PG는 이렇게 알아냈어요', 13, '#64748b', 'right', 700);
  }

  /* =========================================================
     ④ 시각화 제작: 연표 · 영상 구성안
     ========================================================= */
  const MKC = { g: ['#16a34a', '#dcfce7', '#14532d'], b: ['#2563eb', '#dbeafe', '#1e3a8a'], o: ['#ea580c', '#ffedd5', '#7c2d12'], p: ['#7c3aed', '#ede9fe', '#4c1d95'] };
  S.mk = { mode: 'vis', ev: [], style: '', color: 'g', con: {}, line: {}, title: '', sum: '' };
  const MKS = 'hy-photo-history:make';
  function mkLoad() { try { const j = JSON.parse(localStorage.getItem(MKS) || '{}'); const m = S.mk; if (j.mode) m.mode = j.mode; if (Array.isArray(j.ev)) m.ev = j.ev.filter((x) => EVI[x]).slice(0, 5); if (j.style) m.style = j.style; if (j.color && MKC[j.color]) m.color = j.color; if (j.con) m.con = j.con; if (j.line) m.line = j.line; if (j.title) m.title = String(j.title).slice(0, 24); if (j.sum) m.sum = String(j.sum).slice(0, 46); } catch (e) { /* 저장소를 못 쓰면 무시 */ } }
  function mkSave() { try { const m = S.mk; localStorage.setItem(MKS, JSON.stringify({ mode: m.mode, ev: m.ev, style: m.style, color: m.color, con: m.con, line: m.line, title: m.title, sum: m.sum })); } catch (e) { /* 무시 */ } }
  const mkEvs = () => EV.filter((e) => S.mk.ev.indexOf(e.id) >= 0);
  const mkConOK = (e) => S.mk.con[e.id] && e.con.indexOf(S.mk.con[e.id]) >= 0;
  function mkRowsBuild() {
    const m = S.mk, box = $('#mkRows'); box.innerHTML = '';
    mkEvs().forEach((e) => {
      const row = document.createElement('div'); row.className = 'ev-row';
      if (m.mode === 'vis') { row.innerHTML = '<span class="lab">' + e.icon + ' ' + e.who + ' (' + e.ys + ') — 오늘 배운 개념과의 연결</span><select data-ev="' + e.id + '" aria-label="' + e.who + '와 연결할 개념"><option value="">? 고르기</option>' + Object.keys(CONC).map((k) => '<option value="' + k + '"' + (m.con[e.id] === k ? ' selected' : '') + '>' + CONC[k] + '</option>').join('') + '</select>'; const sel = row.querySelector('select'); sel.addEventListener('change', () => { m.con[e.id] = sel.value; mkSave(); updateCtl(); }); }
      else { row.innerHTML = '<span class="lab">🎬 ' + e.icon + ' ' + e.who + ' 장면의 대사</span><input class="txt-in" data-ev="' + e.id + '" type="text" maxlength="40" placeholder="예: 식물이 공기를 맑게 해요!" aria-label="' + e.who + ' 장면의 대사" value="">'; const inp = row.querySelector('input'); inp.value = m.line[e.id] || ''; inp.addEventListener('input', () => { m.line[e.id] = inp.value; mkSave(); updateCtl(); }); }
      box.appendChild(row);
    });
  }
  function mkToggle(id) {
    const m = S.mk, i = m.ev.indexOf(id); if (i >= 0) m.ev.splice(i, 1); else { if (m.ev.length >= (m.mode === 'vid' ? 3 : 5)) { showHint(m.mode === 'vid' ? '영상 구성안은 장면 3컷이에요. 하나를 빼고 골라요.' : '사건은 최대 5개까지 고를 수 있어요.', 3000); return; } m.ev.push(id); }
    Sound.click(); mkSave(); mkRowsBuild(); updateCtl();
  }
  function mkPreview(P, t) {
    const m = S.mk, evs = mkEvs(), col = MKC[m.color], title = m.title || '(제목을 써요)', sum = m.sum || '(한 줄 요약을 써요)', n = evs.length;
    panel(P.x, P.y, P.w, P.h, 18, '#fffef9');
    D.roundRect(P.x + 10, P.y + 10, P.w - 20, 40, 12); ctx.fillStyle = m.mode === 'vid' ? '#334155' : col[0]; ctx.fill(); TF(P.x + P.w / 2, P.y + 37, (m.mode === 'vid' ? '🎬 ' : '') + title, P.w - 40, PHONE ? 18 : 22, 13, '#fff', 'center', 800);
    const sumY = P.y + P.h - 38; D.roundRect(P.x + 10, sumY - 8, P.w - 20, 40, 12); ctx.fillStyle = 'rgba(15,23,42,.88)'; ctx.fill(); TF(P.x + P.w / 2, sumY + 18, '💡 ' + sum, P.w - 40, PHONE ? 14.5 : 16.5, 11, '#fef08a', 'center', 800);
    const top = P.y + 62, bot = sumY - 12, W = P.w, H = bot - top;
    if (!n) { T(P.x + P.w / 2, top + H / 2 - 10, '오른쪽에서 연표 사건을 골라요', PHONE ? 14 : 16.5, '#94a3b8', 'center', 800); T(P.x + P.w / 2, top + H / 2 + 18, m.mode === 'vid' ? '(3개)' : '(3~5개)', PHONE ? 13 : 15, '#94a3b8', 'center', 800); return; }
    const conChip = (x, y, e, w) => { const ok = mkConOK(e), v = m.con[e.id]; D.label(x, y, v ? '🔗 ' + CONCS[v] : '🔗 개념 연결?', { bg: v ? (ok ? col[0] : '#ef4444') : '#cbd5e1', color: v ? '#fff' : '#475569', size: PHONE ? 12 : 12.5 }); };
    if (m.mode === 'vid') {
      const sw = PHONE ? W - 28 : (W - 24 - 24) / 3, sh = PHONE ? (H - 16) / 3 : H - 4;
      evs.forEach((e, i) => {
        const x = PHONE ? P.x + 14 : P.x + 12 + i * (sw + 12), y = PHONE ? top + i * (sh + 8) : top; D.roundRect(x, y, sw, sh - 4, 14); ctx.fillStyle = '#f1f5f9'; ctx.fill(); ctx.strokeStyle = '#64748b'; ctx.lineWidth = 2.5; ctx.stroke();
        D.label(x + 42, y + 20, '장면 ' + (i + 1), { bg: '#334155', color: '#fff', size: 13 });
        if (PHONE) { E(e.icon, x + 34, y + (sh - 4) / 2 + 6, 36); T(x + 66, y + 22, e.ys + ' · ' + e.who, 13, '#1f2d44', 'left', 800); const ln = m.line[e.id] || ''; D.roundRect(x + 66, y + 32, sw - 80, sh - 48, 12); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; ctx.stroke(); if (ln) wrapT(x + 66 + (sw - 80) / 2, y + 32 + (sh - 48) / 2, sw - 100, ln, 13, '#1f2d44', 16, 800, 3); else T(x + 66 + (sw - 80) / 2, y + 32 + (sh - 48) / 2 + 5, '(대사를 써요)', 12.5, '#cbd5e1', 'center', 800); }
        else { E(e.icon, x + sw / 2, y + 70, 58); T(x + sw / 2, y + 128, e.ys, 14.5, '#b45309', 'center', 800); T(x + sw / 2, y + 150, e.who, 17, '#1f2d44', 'center', 800); wrapT(x + sw / 2, y + 184, sw - 20, e.v1, 12.5, '#475569', 16, 700, 2); const ln = m.line[e.id] || ''; D.roundRect(x + 12, y + 214, sw - 24, sh - 4 - 226, 14); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; ctx.stroke(); ctx.beginPath(); ctx.moveTo(x + sw / 2 - 10, y + 214); ctx.lineTo(x + sw / 2, y + 204); ctx.lineTo(x + sw / 2 + 10, y + 214); ctx.fillStyle = '#fff'; ctx.fill(); if (ln) wrapT(x + sw / 2, y + 214 + (sh - 4 - 226) / 2, sw - 44, ln, 14, '#1f2d44', 18, 800, 4); else T(x + sw / 2, y + 214 + (sh - 4 - 226) / 2 + 5, '(대사를 써요)', 13.5, '#cbd5e1', 'center', 800); }
      });
      return;
    }
    if (m.style === 'comic') {
      const k = Math.min(n, 4), cw = (W - 30) / 2, ch = (H - 8) / 2;
      evs.slice(0, 4).forEach((e, i) => {
        const x = P.x + 12 + (i % 2) * (cw + 6), y = top + Math.floor(i / 2) * (ch + 8); D.roundRect(x, y, cw, ch, 12); ctx.fillStyle = col[1]; ctx.fill(); ctx.strokeStyle = col[0]; ctx.lineWidth = 3.5; ctx.stroke();
        pill(x + 22, y + 20, 32, 24, String(i + 1), col[0], '#fff'); D.roundRect(x + 44, y + 8, cw - 56, 26, 8); ctx.fillStyle = '#fff'; ctx.fill(); TF(x + 44 + (cw - 56) / 2, y + 26, e.ys + ' · ' + e.who + ' · ' + e.v1, cw - 66, PHONE ? 12 : 12.5, 9.5, col[2], 'center', 800);
        E(e.icon, x + (PHONE ? 38 : 54), y + ch * 0.55, PHONE ? 36 : 54);
        const bx = x + (PHONE ? 66 : 96), bw = cw - (PHONE ? 76 : 108), by = y + 42, bh = ch * 0.46; D.roundRect(bx, by, bw, bh, 14); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#334155'; ctx.lineWidth = 2; ctx.stroke(); wrapT(bx + bw / 2, by + bh / 2, bw - 16, e.v2, PHONE ? 12.5 : 14, '#1f2d44', PHONE ? 15 : 17, 800, 3);
        conChip(x + cw / 2, y + ch - 18, e);
      });
      if (n > 4) T(P.x + P.w / 2, top + H - 2, '만화는 4컷이라 앞의 4개만 보여요', 12.5, '#dc2626', 'center', 800);
      return;
    }
    if (m.style === 'tree') {
      const cx = P.x + P.w / 2, rh = H / n, cw = PHONE ? (W - 56) / 2 + 12 : 330;
      ctx.strokeStyle = col[0]; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(cx, top + 4); ctx.lineTo(cx, bot - 2); ctx.stroke();
      evs.forEach((e, i) => {
        const y = top + rh * i + rh / 2, left = i % 2 === 0, x = left ? cx - 20 - cw : cx + 20; D.sphere(cx, y, 11, col[0], { gloss: true }); ctx.strokeStyle = col[0]; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(cx, y); ctx.lineTo(left ? cx - 20 : cx + 20, y); ctx.stroke();
        D.roundRect(x, y - rh / 2 + 4, cw, rh - 8, 12); ctx.fillStyle = col[1]; ctx.fill(); ctx.strokeStyle = col[0]; ctx.lineWidth = 2.5; ctx.stroke();
        E(e.icon, x + 24, y - rh / 2 + 24, 24); T(x + 44, y - rh / 2 + 28, e.ys + ' · ' + e.who, PHONE ? 12.5 : 14, col[2], 'left', 800);
        const tx = x + 12, tw = cw - 24, fs = PHONE ? 12 : 12.5, lh = PHONE ? 13 : 15;
        T(tx, y - rh / 2 + 28 + lh + 3, '실험: ' + e.v1, fs, '#334155', 'left', 700); T(tx, y - rh / 2 + 28 + lh * 2 + 3, '알게 된 것: ' + e.v2, fs, '#1f2d44', 'left', 800);
        if (rh > 78) conChip(x + cw / 2, y + rh / 2 - 18, e);
      });
      return;
    }
    // 선형 연표 (기본)
    if (PHONE) {
      const rh = H / n, lx = P.x + 34; ctx.strokeStyle = col[0]; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(lx, top + 6); ctx.lineTo(lx, bot - 6); ctx.stroke();
      evs.forEach((e, i) => {
        const y = top + rh * i, cy = y + rh / 2; D.sphere(lx, cy, 11, col[0], { gloss: true }); T(lx, cy + 4, String(i + 1), 12, '#fff', 'center', 800);
        D.roundRect(lx + 20, y + 3, P.w - 34 - 30 - 20 + 20, rh - 6, 12); ctx.fillStyle = col[1]; ctx.fill(); ctx.strokeStyle = col[0]; ctx.lineWidth = 2; ctx.stroke();
        E(e.icon, lx + 42, y + 24, 22); T(lx + 60, y + 26, e.ys + ' · ' + e.who, 12.5, col[2], 'left', 800); T(lx + 32, y + 26 + 15, '실험: ' + e.v1, 11, '#334155', 'left', 700); T(lx + 32, y + 26 + 29, '알게 된 것: ' + e.v2, 11, '#1f2d44', 'left', 800); if (rh > 86) conChip(lx + 20 + (P.w - 64) / 2, y + rh - 14, e);
      });
      return;
    }
    const cw = (W - 24 - (n - 1) * 10) / n, ly = top + 20; ctx.strokeStyle = col[0]; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(P.x + 14, ly); ctx.lineTo(P.x + P.w - 14, ly); ctx.stroke();
    evs.forEach((e, i) => {
      const x = P.x + 12 + i * (cw + 10), cx = x + cw / 2; D.sphere(cx, ly, 11, col[0], { gloss: true }); T(cx, ly + 4, String(i + 1), 12, '#fff', 'center', 800);
      D.roundRect(x, ly + 22, cw, H - 36, 14); ctx.fillStyle = col[1]; ctx.fill(); ctx.strokeStyle = col[0]; ctx.lineWidth = 2.5; ctx.stroke();
      D.label(cx, ly + 44, e.ys, { bg: col[0], color: '#fff', size: 13 }); E(e.icon, cx, ly + 90, 38); TF(cx, ly + 132, e.who, cw - 14, 16, 11, col[2], 'center', 800);
      T(cx, ly + 160, '실험', 12, '#64748b', 'center', 800); wrapT(cx, ly + 192, cw - 18, e.v1, 12.5, '#334155', 16, 700, 3);
      T(cx, ly + 232, '알게 된 것', 12, '#64748b', 'center', 800); wrapT(cx, ly + 264, cw - 18, e.v2, 12.5, '#1f2d44', 16, 800, 3);
      T(cx, ly + 304, '오늘의 개념', 12, '#64748b', 'center', 800); const v = m.con[e.id]; if (v) wrapT(cx, ly + 332, cw - 18, CONCS[v], 12.5, mkConOK(e) ? '#15803d' : '#dc2626', 16, 800, 2); else T(cx, ly + 334, '?', 18, '#cbd5e1', 'center', 800);
    });
  }
  function makeDraw(dt, t) { const P = PHONE ? { x: 10, y: 10, w: 460, h: 620 } : { x: 14, y: 14, w: 772, h: 534 }; mkPreview(P, t); }

  /* =========================================================
     화면 전환 · 조작 연결
     ========================================================= */
  const PTS = { time: tmPT, src: enPT, cal: null, make: null };
  S.src = { view: 'eng' };
  function setMode(m) { if (S.mode !== m) S.fade = 1; S.mode = m; PT = PTS[m] || null; hideHint(); updateCtl(); }
  const ctlNodes = $$('#ctrlCard .control');
  S.rbConOn = false;
  (function initSelects() {
    for (let i = 0; i < 6; i++) { const sel = $('#mt' + (i + 1)); sel.innerHTML = '<option value="">? 고르기</option>' + MT_ORDER.map((j) => '<option value="' + MT_P[j] + '">' + EVI[MT_P[j]].m + '</option>').join(''); sel.addEventListener('change', () => { if (sel.value) { if (sel.value === MT_P[i]) Sound.success(); else Sound.tick(); } updateCtl(); }); }
    $('#mkEv').innerHTML = EV.map((e) => '<button type="button" data-v="' + e.id + '">' + e.icon + ' ' + e.who + '<br><span style="font-weight:700;font-size:11.5px;color:var(--muted)">' + e.ys + '</span></button>').join('');
  })();
  function updateCtl() {
    const fr = game ? game.free : false, lvNow = game ? game.level : 0, tm = S.tm, en = S.en, rb = S.rb, cl = S.cl, mk = S.mk;
    ctlNodes.forEach((n) => { n.hidden = (n.dataset.modes || '').split(' ').indexOf(S.mode) < 0; });
    $$('#ctrlCard [data-sub]').forEach((n) => { const v = n.dataset.sub; const cur = S.mode === 'time' ? tm.view : S.mode === 'src' ? S.src.view : mk.mode; n.hidden = v !== cur; });
    $$('#ctrlCard [data-grp]').forEach((n) => { const k = n.dataset.grp; n.hidden = k === 'concl' ? !((rb.A.done && rb.B.done) || fr) : k === 'read' ? !(cl.readOn || fr) : false; });
    modeButtons(S.mode, lvNow, fr);
    $$('#tmView button').forEach((b) => b.classList.toggle('on', b.dataset.v === tm.view));
    $$('#srView button').forEach((b) => b.classList.toggle('on', b.dataset.v === S.src.view));
    for (let i = 0; i < 6; i++) { const e = $('#mt' + (i + 1)), v = e.value; e.classList.toggle('ok', !!v && v === MT_P[i]); e.classList.toggle('bad', !!v && v !== MT_P[i]); }
    $('#tmFlip').textContent = tm.flip ? '🔄 앞면으로' : '🔄 카드 뒤집어 보기';
    $('#tmNote').innerHTML = tm.view === 'sort' ? (tmSorted() ? '✅ 시간 순서가 맞아요!' : '카드 ' + tmBad().length + '장이 순서가 어긋났어요.') : '맞힌 짝 <b>' + [0, 1, 2, 3, 4, 5].filter(mtOk).length + ' / 6</b>';
    $('#enGo').disabled = en.run || en.done; $('#enGo').textContent = en.done ? '✔ 실험 끝' : en.run ? '모이는 중…' : '▶ 시간 흐르게 하기';
    $$('#enPick button').forEach((b) => b.classList.toggle('on', !!en.sel[b.dataset.v])); $$('#enPick button').forEach((b) => { b.disabled = !en.done && !fr; });
    chipSet($('#rbExp'), rb.exp); $('#rbGo').disabled = rb[rb.exp].running; $('#rbGo').textContent = rb[rb.exp].running ? '실험 중…' : '▶ 광합성 시키기';
    $('#srNote').innerHTML = S.src.view === 'eng' ? (en.done ? '세균이 모두 모였어요. 많은 두 영역을 골라요.' : en.run ? '세균이 산소가 많은 곳으로 모이고 있어요…' : '▶ 를 누르면 세균이 움직여요.') : '실험 A ' + (rb.A.done ? '✔' : '⬜') + ' · 실험 B ' + (rb.B.done ? '✔' : '⬜') + ' (둘 다 해 봐요)';
    chipSet($('#clT'), String(cl.t)); $('#clGo').disabled = !!cl.run;
    $('#clNote').innerHTML = '기록한 시간 <b>' + clN() + ' / 3</b> · 지금: <b>' + CT[cl.t] + '</b>' + (cl.run ? ' (시료 처리 중…)' : '');
    chipSet($('#clFirst'), cl.first);
    $$('#mkMode button').forEach((b) => b.classList.toggle('on', b.dataset.v === mk.mode)); $$('#mkEv button').forEach((b) => b.classList.toggle('on', mk.ev.indexOf(b.dataset.v) >= 0));
    chipSet($('#mkStyle'), mk.style); chipSet($('#mkColor'), mk.color);
    $('#mkEvLab').textContent = mk.mode === 'vid' ? '장면 3컷에 쓸 사건을 3개 골라요' : '연표 사건을 3~5개 골라요';
    $$('#mkRows select').forEach((s) => { const e = EVI[s.dataset.ev]; s.classList.toggle('ok', !!s.value && e.con.indexOf(s.value) >= 0); s.classList.toggle('bad', !!s.value && e.con.indexOf(s.value) < 0); });
    $('#mkNote').innerHTML = '고른 사건 <b>' + mk.ev.length + '</b>개' + (mk.mode === 'vis' ? ' · 연결을 고르면 초록색이 되면 맞아요.' : ' · 장면마다 대사를 써요.');
  }
  bindModeSeg(setMode);
  $$('#tmView button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.tm.view = b.dataset.v; PT = PTS.time; updateCtl(); }));
  $('#tmFlip').addEventListener('click', () => { Sound.click(); S.tm.flip = !S.tm.flip; updateCtl(); });
  $('#tmShuffle').addEventListener('click', () => { Sound.click(); tmShuffle(); });
  $$('#srView button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.src.view = b.dataset.v; updateCtl(); }));
  $('#enGo').addEventListener('click', () => { if (!S.en.run && !S.en.done) { S.en.run = true; Sound.click(); updateCtl(); } });
  $('#enReset').addEventListener('click', () => { Sound.click(); S.en.sel = {}; enReset(); });
  $$('#enPick button').forEach((b) => b.addEventListener('click', () => { if (!S.en.done && !(game && game.free)) return; S.en.sel[b.dataset.v] = !S.en.sel[b.dataset.v]; Sound.click(); updateCtl(); }));
  $$('#rbExp button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.rb.exp = b.dataset.v; updateCtl(); }));
  $('#rbGo').addEventListener('click', rbGo);
  $('#rbReset').addEventListener('click', () => { Sound.click(); rbClear(); $('#rbCon').value = ''; });
  $('#rbCon').addEventListener('change', updateCtl);
  $$('#clT button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.cl.t = +b.dataset.v; updateCtl(); }));
  $('#clGo').addEventListener('click', clGo);
  $('#clReset').addEventListener('click', () => { Sound.click(); clClear(); });
  $$('#clFirst button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.cl.first = b.dataset.v; updateCtl(); }));
  $$('#mkMode button').forEach((b) => b.addEventListener('click', () => { Sound.click(); const m = S.mk; if (m.mode === b.dataset.v) return; m.mode = b.dataset.v; if (m.mode === 'vid' && m.ev.length > 3) m.ev = m.ev.slice(0, 3); mkSave(); mkRowsBuild(); updateCtl(); }));
  $('#mkEv').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) mkToggle(b.dataset.v); });
  $$('#mkStyle button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.mk.style = b.dataset.v; mkSave(); updateCtl(); }));
  $$('#mkColor button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.mk.color = b.dataset.v; mkSave(); updateCtl(); }));
  $('#mkTitle').addEventListener('input', (e) => { S.mk.title = e.target.value; mkSave(); updateCtl(); });
  $('#mkSum').addEventListener('input', (e) => { S.mk.sum = e.target.value; mkSave(); updateCtl(); });
  mkLoad(); $('#mkTitle').value = S.mk.title; $('#mkSum').value = S.mk.sum; mkRowsBuild(); tmBuild(); enReset();

  /* =========================================================
     미션
     ========================================================= */
  const levels = [
    {
      title: '연대표', short: '연대표', icon: '🕰', phase: '관찰',
      intro: '<p class="si-q">❓ 탐구 질문: 광합성의 비밀은 한 번에 밝혀졌을까? 실험 결과 하나하나는 무엇을 알려 주었을까?</p><p>🔗 <b>앞 차시들에서</b> 광합성이 명반응(물 분해 · ATP · NADPH · O₂)과 탄소 고정 반응(캘빈 회로)으로 이루어진다는 것을 배웠어요. 이 지식은 하루아침에 생기지 않았어요. 수백 년 동안 많은 과학자가 <b>작은 실험</b>을 이어 가며 알아낸 결과예요.</p><p>이번 차시에서는 광합성 연구의 <b>연표 카드 11장</b>을 만나요. 카드를 <b>시간 순서</b>대로 정렬하고, 인물과 알아낸 것을 짝지어 봐요. (연도는 교과서 일반 서술 수준이고, 대략이에요.) 카드를 눌러 아래 설명을 읽고, <b>🔄 카드 뒤집어 보기</b>로 연도와 알게 된 것을 볼 수 있어요.</p>',
      features: ['time'],
      setup() { setMode('time'); S.tm.view = 'sort'; PT = PTS.time; },
      recap: '광합성 연구는 헬몬트(1640년대)에서 시작해 프리스틀리, 잉엔하우스, 소쉬르, 엥겔만, 반 니일, 힐, 루벤과 카멘, 아논, 캘빈, 야겐도르프로 이어졌어요. 헬몬트는 공기 속 CO₂를 몰랐고, 잉엔하우스는 빛이 필요하다는 것을 보였어요.',
      summary: '<ul><li>연표(대략): <b>1640년대</b> 헬몬트(버드나무 실험, 양분은 물에서) → <b>1771</b> 프리스틀리(식물이 공기를 회복) → <b>1779</b> 잉엔하우스(빛과 녹색 부분 필요) → <b>1804</b> 소쉬르(CO₂와 물의 질량) → <b>1882</b> 엥겔만(엽록체, 청자색 · 적색 빛) → <b>1931</b> 반 니일(산소는 물에서라는 가설) → <b>1937</b> 힐(힐 반응) → <b>1941</b> 루벤과 카멘(¹⁸O 표지) → <b>1954</b> 아논(광인산화) · <b>1950년대</b> 캘빈과 벤슨(¹⁴C 추적) → <b>1966</b> 야겐도르프(H⁺ 기울기 = 화학 삼투).</li><li>헬몬트의 결론은 일부만 옳아요. 흙은 거의 줄지 않았지만, 나무가 늘어난 주된 재료가 공기 속 <b>CO₂</b>라는 것은 몰랐어요.</li><li>잉엔하우스는 연표에서 <b>빛이 필요하다</b>는 것을 먼저 보인 사람이에요.</li></ul>',
      missions: [
        {
          id: 'sort', title: '연표 카드 시간 순서대로', manual: true,
          goal: '연표 카드 11장을 <b>시간이 이른 것부터 늦은 것 순서</b>로 놓으세요.',
          hint: '카드를 누르면 아래에 연도와 설명이 나와요. 🔄 카드 뒤집어 보기를 누르면 모든 카드의 연도를 볼 수 있어요. 카드를 끌어 다른 카드와 자리를 바꿔요. (1954년 아논과 1950년대 캘빈은 어느 쪽이 앞이어도 돼요.)',
          setup() { setMode('time'); S.tm.view = 'sort'; PT = PTS.time; tmShuffle(); S.tm.flip = false; S.tm.focus = 'helm'; updateCtl(); },
          check() {
            if (tmSorted()) return true; const bad = tmBad(); S.tm.cards.forEach((c) => { const b = bad.indexOf(c.id) >= 0; if (b && !c.bad) c.shake = 1; c.bad = b; });
            return '빨간 카드 ' + bad.length + '장이 순서가 어긋났어요. 카드를 누르면 연도를 알 수 있어요.';
          },
          explain: '시간 순서: 헬몬트(1640년대) → 프리스틀리(1771) → 잉엔하우스(1779) → 소쉬르(1804) → 엥겔만(1882) → 반 니일(1931) → 힐(1937) → 루벤과 카멘(1941) → 아논(1954) · 캘빈과 벤슨(1950년대) → 야겐도르프(1966)예요. 순서대로 놓으면 선이 이어져요.',
        },
        {
          id: 'pair', title: '인물과 발견 짝짓기', manual: true,
          goal: '<b>6명의 과학자</b>가 각각 무엇을 알아냈는지 짝지어 보세요.',
          hint: '🔗 짝 맞추기 화면에서 인물마다 알아낸 것을 골라요. 헬몬트는 흙과 물, 프리스틀리는 공기 회복, 잉엔하우스는 빛과 녹색 부분이에요. ¹⁸O는 루벤과 카멘, ¹⁴C는 캘빈이에요.',
          setup() { setMode('time'); S.tm.view = 'match'; PT = PTS.time; for (let i = 1; i <= 6; i++) $('#mt' + i).value = ''; updateCtl(); },
          check() { const n = [0, 1, 2, 3, 4, 5].filter(mtOk).length; if (n === 6) return true; const miss = [0, 1, 2, 3, 4, 5].filter((i) => !mtVal(i)).length; if (miss) return '아직 고르지 않은 인물이 있어요. (' + (6 - miss) + ' / 6)'; const bad = [0, 1, 2, 3, 4, 5].find((i) => !mtOk(i)); return '빨간 선이 아직 달라요. ' + EVI[MT_P[bad]].who + '의 실험에서 무엇을 알게 되었는지 다시 읽어 봐요.'; },
          explain: '헬몬트 – 양분은 물에서(일부만 옳음), 프리스틀리 – 식물이 공기를 회복, 잉엔하우스 – 빛과 녹색 부분 필요, 엥겔만 – 엽록체에서 O₂ · 청자색 · 적색 빛, 루벤과 카멘 – ¹⁸O 표지로 O₂는 물에서, 캘빈 – ¹⁴C 추적으로 3PG가 가장 먼저예요.',
        },
        {
          type: 'quiz', title: '헬몬트의 실험이 놓친 것',
          goal: '버드나무가 자라는 데 흙이 거의 줄지 않았다는 헬몬트의 실험에서 <b>그가 몰랐던 것</b>은?',
          setup() { setMode('time'); },
          choices: ['나무가 늘어난 주된 재료가 공기 속 CO₂라는 것', '식물이 물을 흡수한다는 것', '흙이 조금 줄었다는 것', '나무의 질량을 잴 수 있다는 것'],
          answer: 0,
          feedback: ['', '헬몬트도 물을 준 것은 알고 있었어요. 그는 물이 양분이라고 결론 내렸어요.', '흙이 약 57 g 줄어든 것은 실험 결과예요. 그는 알고 있었어요.', '그는 나무와 흙의 질량을 쟀어요.'],
          explain: '헬몬트는 흙이 거의 줄지 않았으니 식물의 양분이 <b>물에서 온다</b>고 결론 내렸어요. 일부만 옳아요. 식물이 만든 유기물의 탄소는 주로 공기 속 <b>CO₂</b>에서 와요. 소쉬르가 CO₂와 물의 질량 변화를 재서 이를 보였어요.',
        },
      ],
    },
    {
      title: '산소의 출처', short: '산소의 출처', icon: '🔬', phase: '탐구',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 연표에서 광합성의 산소가 어디서 나오는지 오랫동안 궁금했다는 것을 봤어요. (명반응 차시에서는 O₂가 <b>물</b>에서 나온다고 미리 소개했어요.) 이 사실은 어떻게 밝혀졌을까요?</div><p><b>엥겔만(1882)</b>의 실험을 재현해요. 프리즘으로 나눈 빛을 해캄(녹조류)에 비추고, 산소가 많은 곳에 모이는 <b>호기성 세균</b>이 어느 영역에 모이는지 봐요. 세균이 산소가 발생하는 곳을 알려 주는 <b>지표</b>예요.</p><p>이어서 <b>루벤과 카멘(1941)</b>의 <b>¹⁸O 표지</b> 실험을 해요. 물에 ¹⁸O를 표지한 실험(A)과 CO₂에 표지한 실험(B)에서 나오는 산소를 비교해 결론을 내려요.</p>',
      features: ['src'],
      setup() { setMode('src'); S.src.view = 'eng'; PT = PTS.src; },
      recap: '엥겔만의 실험에서 세균은 청자색과 적색 빛을 받는 엽록체 둘레에 가장 많이 모였어요(산소가 가장 많이 발생). 루벤과 카멘의 ¹⁸O 표지 실험에서는 물에 표지했을 때만 ¹⁸O₂가 나와, 광합성의 산소는 물에서 나온다는 것이 확인됐어요.',
      summary: '<ul><li><b>엥겔만(1882)</b>: 호기성 세균(산소가 많은 곳에 모임)과 해캄, 프리즘 빛. 가상 자료: 청자색 45, 청록 12, 녹색 5, 황주색 11, 적색 40마리. → <b>산소(광합성)는 엽록체에서 발생</b>하고 엽록소는 <b>청자색 · 적색 빛</b>을 잘 이용해요. 세균 수 그래프는 엽록소의 흡수 스펙트럼과 비슷해요(작용 스펙트럼).</li><li><b>루벤과 카멘(1941)</b>: 산소 동위 원소 ¹⁸O 표지. H₂¹⁸O + CO₂ → <b>¹⁸O₂ 나옴</b>, H₂O + C¹⁸O₂ → <b>¹⁸O₂ 안 나옴</b> → 광합성의 산소는 <b>물</b>에서 나와요.</li><li><b>힐(1937)</b>: 분리한 엽록체에 전자 수용체와 빛만 주어도 CO₂ 없이 산소가 나와요(힐 반응). 산소 발생은 CO₂ 고정과 별개의 <b>명반응</b>이에요.</li></ul>',
      missions: [
        {
          id: 'engel', title: '세균이 많이 모인 두 영역',
          goal: '엥겔만의 실험을 진행하고, 세균이 <b>가장 많이 모인 두 영역</b>을 고르세요.',
          hint: '▶ 시간 흐르게 하기를 눌러 세균이 모일 때까지 기다려요. 그래프에서 막대가 가장 높은 두 곳을 눌러요.',
          setup() { setMode('src'); S.src.view = 'eng'; PT = PTS.src; S.en.sel = {}; enReset(); },
          check: () => S.en.done && enSelOK(), hold: 0.8,
          status: () => mark(S.en.done) + ' 실험 끝 &nbsp; ' + mark(!!S.en.sel.blue) + ' 청자색 &nbsp; ' + mark(!!S.en.sel.red) + ' 적색' + (Object.keys(S.en.sel).filter((k) => S.en.sel[k]).length > 2 || (S.en.sel.cyan || S.en.sel.green || S.en.sel.yel) ? ' &nbsp; (다른 영역은 빼요)' : ''),
          explain: '세균은 <b>청자색(45마리)</b>과 <b>적색(40마리)</b> 영역에 가장 많이 모였어요. 호기성 세균은 산소가 많은 곳으로 모이므로 산소가 가장 많이 발생한 곳, 즉 엽록소가 청자색 · 적색 빛을 잘 이용하는 곳이에요. 녹색 영역(5마리)에는 거의 없어요.',
        },
        {
          id: 'ruben', title: '¹⁸O 표지 실험과 결론', manual: true,
          goal: '<b>실험 A와 B를 모두</b> 실행하고, 두 결과로 알 수 있는 <b>결론</b>을 고르세요.',
          hint: '실험을 고르고 ▶ 광합성 시키기를 눌러요. 모은 O₂ 중 ¹⁸O₂가 몇 분자인지 비교해요. 두 실험을 모두 하면 결론을 고를 수 있어요.',
          setup() { setMode('src'); S.src.view = 'rub'; PT = PTS.src; rbClear(); $('#rbCon').value = ''; updateCtl(); },
          check() {
            const r = S.rb; if (!r.A.done || !r.B.done) return '실험 A와 B를 모두 실행해 주세요. (A ' + (r.A.done ? '✔' : '⬜') + ' · B ' + (r.B.done ? '✔' : '⬜') + ')';
            const v = $('#rbCon').value; if (!v) return '결론을 골라 주세요.'; if (v !== 'water') return '표지한 물에서 ¹⁸O₂가 나왔는지, 표지한 CO₂에서도 나왔는지 다시 비교해 보세요.'; return true;
          },
          explain: 'A(H₂¹⁸O + CO₂)에서는 ¹⁸O₂가 나오고, B(H₂O + C¹⁸O₂)에서는 ¹⁸O₂가 나오지 않았어요. 그러므로 광합성에서 방출되는 <b>산소는 물</b>에서 나와요. 이 과학사적 결과가 명반응의 <b>물의 광분해</b>(2H₂O → O₂ + 4H⁺ + 4e⁻)와 연결돼요.',
        },
        {
          type: 'quiz', title: '힐 반응이 보여 준 것',
          goal: '분리한 엽록체에 전자 수용체를 주고 빛을 비추면 <b>CO₂ 없이도 산소가 발생</b>했어요(힐 반응). 이 결과가 보여 주는 것은?',
          setup() { setMode('src'); },
          choices: ['산소 발생은 CO₂ 고정과 별개로 빛에 의해 일어나는 명반응이다', '광합성의 산소는 CO₂에서 나온다', '엽록체에서는 빛이 없어도 산소가 나온다', '광합성에 물은 필요하지 않다'],
          answer: 0,
          feedback: ['', 'CO₂가 없어도 산소가 발생했으므로 산소는 CO₂에서 나오는 것이 아니에요.', '이 실험에서는 빛을 비췄어요. 빛이 있어야 산소가 나와요.', '산소는 물에서 나와요. 그래서 물이 필요해요.'],
          explain: 'CO₂가 없는데도 빛과 전자 수용체만으로 산소가 나왔으니, <b>산소 발생(명반응)은 CO₂ 고정(탄소 고정 반응)과 별개</b>예요. 엥겔만이 호기성 세균을 쓴 까닭은, 세균이 산소가 많은 곳에 모이므로 <b>산소 발생 위치를 알려 주는 지표</b>이기 때문이에요.',
        },
      ],
    },
    {
      title: '캘빈의 추적', short: '캘빈의 추적', icon: '⚗', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 동위 원소 표지로 산소의 출처를 밝히는 것을 봤어요. 같은 방법이 <b>탄소 고정 반응</b>의 순서를 밝히는 데도 쓰였어요. 앞 차시에서 본 캘빈 회로의 첫 산물 3PG는 어떻게 알아냈을까요?</div><p><b>캘빈과 벤슨(1950년대)</b>은 방사성 <b>¹⁴CO₂</b>를 클로렐라에 짧게 주고 시간마다 시료를 꺼내 바로 얼렸어요. 얼린 시료를 <b>종이 크로마토그래피</b>로 분리하고 <b>자기방사법</b>(필름에 방사선이 닿은 곳이 검게 나타남)으로 ¹⁴C가 들어간 화합물을 찾았어요.</p><p>시간 <b>2초 · 30초 · 5분</b>에 시료를 채취하며 어느 화합물이 가장 먼저 표지되는지 읽어요. 이는 앞 차시의 분비 경로 추적(펄스 · 체이스)과 같은 <b>추적 실험</b>의 원리예요. (값은 가상 자료예요.)</p>',
      features: ['cal'],
      setup() { setMode('cal'); },
      recap: '¹⁴CO₂를 짧게 준 뒤 2초 때 ¹⁴C는 3PG에 85 %로 가장 먼저 나타났고, 30초에는 당 인산으로(45 %), 5분에는 여러 화합물(기타 55 %)로 퍼졌어요. 이 순서로 캘빈 회로의 첫 산물이 3PG라는 것을 알았어요.',
      summary: '<ul><li><b>캘빈의 방법</b>: 방사성 ¹⁴CO₂를 클로렐라에 짧게 공급 → 시간마다 시료를 얼려 반응 정지 → <b>종이 크로마토그래피</b>로 분리 → <b>자기방사법</b>으로 ¹⁴C가 든 화합물 확인.</li><li>가상 자료(¹⁴C 표지 비율, 3PG / 당 인산 / 기타): <b>2초 85 / 10 / 5 %</b>, <b>30초 40 / 45 / 15 %</b>, <b>5분 15 / 30 / 55 %</b>(아미노산 · 유기산 등). 가장 먼저 표지되는 것(약 2~5초)이 <b>3PG</b>예요.</li><li>짧은 시간 뒤에 표지된 물질을 조사하면 <b>반응의 순서</b>를 알 수 있어요. 이 업적으로 캘빈은 1961년 노벨 화학상을 받았어요.</li><li>앞 차시의 &quot;빛을 끄면 3PG가 쌓이고 RuBP가 줄어요&quot; 같은 결과도 이런 추적 방법으로 알아낸 것이에요.</li></ul>',
      missions: [
        {
          id: 'track', title: '시간별 표지 비율 읽기', manual: true,
          goal: '<b>2초 · 30초 · 5분</b> 세 시점의 시료를 모두 채취해 기록하고, <b>가장 먼저 ¹⁴C로 표지된 화합물</b>을 고르세요.',
          hint: '시간 버튼을 고르고 🧪 시료 채취하기를 눌러요. 처리가 끝나면 종이에 점이 나타나고 막대가 채워져요. 가장 짧은 시간에 가장 높은 비율을 보인 화합물을 찾아요.',
          setup() { setMode('cal'); S.cl.readOn = true; clClear(); S.cl.t = 2; updateCtl(); },
          check() {
            const c = S.cl; if (clN() < 3) return '세 시점(2초 · 30초 · 5분)을 모두 채취해 기록해 주세요. (' + clN() + ' / 3)';
            if (!c.first) return '가장 먼저 표지된 화합물을 골라 주세요.';
            if (c.first !== 'pg') return '2초 때 비율이 가장 높은 화합물을 표에서 찾아 보세요.';
            return true;
          },
          explain: '2초 뒤 ¹⁴C는 <b>3PG에 85 %</b>로 가장 먼저 나타났어요. 30초에는 당 인산(45 %)으로, 5분에는 아미노산 · 유기산 등 여러 화합물(기타 55 %)로 퍼졌어요. 3PG가 <b>캘빈 회로의 첫 산물</b>이라는 앞 차시의 내용과 이어져요.',
        },
        {
          type: 'quiz', title: '짧은 시간 뒤의 시료를 보는 까닭',
          goal: '캘빈이 ¹⁴CO₂를 준 지 <b>아주 짧은 시간</b> 뒤의 시료를 조사한 까닭은?',
          setup() { setMode('cal'); },
          choices: ['어떤 화합물이 먼저 표지되는지, 즉 반응의 순서를 알기 위해서', '방사성이 오래 남게 하기 위해서', '클로렐라가 빨리 죽게 하기 위해서', 'CO₂ 양을 늘리기 위해서'],
          answer: 0,
          feedback: ['', '방사성 물질의 양이 아니라 표지되는 순서가 중요해요.', '시료를 얼려 반응을 멈추는 것은 순간의 상태를 관찰하기 위해서예요.', '이 실험에서 CO₂의 양은 바꾸지 않아요.'],
          explain: '오래 기다리면 ¹⁴C가 여러 화합물로 퍼져 순서를 알 수 없어요. <b>짧은 시간</b> 뒤에 표지된 물질을 조사하면 가장 먼저 만들어지는 물질(3PG)과 이어서 만들어지는 물질의 순서, 즉 <b>반응의 순서</b>를 알 수 있어요. 분비 경로의 자기방사법 추적과 같은 원리예요.',
        },
      ],
    },
    {
      title: '시각화 제작', short: '시각화 제작', icon: '🎨', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 엥겔만, 루벤과 카멘, 캘빈의 실험 결과를 읽으며 광합성 지식이 실험에서 어떻게 나왔는지 거꾸로 확인했어요. 이제 이 이야기를 친구에게 <b>시각 자료</b>로 전달해요.</div><p>모둠이 함께 연표 사건 <b>3~5개</b>를 골라 <b>연도 – 인물 – 실험 – 알게 된 것 – 오늘 배운 개념과의 연결</b>이 담긴 자료를 만들어요. 형식(선형 연표 · 나무형 · 만화 4컷)과 색을 고르고 <b>제목</b>과 <b>한 줄 요약</b>을 써요. 대신 <b>🎬 영상 구성안</b>(장면 3컷 + 대사)으로 만들 수도 있어요. 쓴 내용은 이 기기에만 저장돼요.</p>',
      features: ['make'],
      setup() { setMode('make'); },
      recap: '과학사 자료는 연도 · 인물 · 실험 · 알게 된 것 · 오늘 배운 개념의 연결을 담으면 이야기가 잘 전달돼요. 광합성의 산소 출처는 ¹⁸O 표지로, 3PG가 첫 산물이라는 것은 ¹⁴C 추적과 크로마토그래피로 밝혀졌어요.',
      summary: '<ul><li>시각 자료의 5요소: <b>연도 · 인물 · 실험 · 알게 된 것 · 오늘 배운 개념과의 연결</b>. 형식은 선형 연표, 나무형, 만화 4컷, 영상 구성안(장면 3컷 + 대사) 등으로 고를 수 있어요.</li><li>개념 연결 예: 헬몬트 · 소쉬르 – 광합성의 재료, 프리스틀리 – O₂ 방출, 잉엔하우스 – 빛 이용, 엥겔만 – 엽록소의 빛 흡수, 반 니일 · 루벤과 카멘 – 물의 광분해, 힐 · 아논 – 명반응, 캘빈 – 탄소 고정 반응, 야겐도르프 – H⁺ 기울기와 화학 삼투.</li><li>탐구 방법: <b>동위 원소 표지</b>(¹⁸O, ¹⁴C)와 <b>크로마토그래피</b> · <b>자기방사법</b>이 광합성 과정을 밝히는 데 쓰였어요.</li></ul>',
      missions: [
        {
          id: 'make', title: '광합성 연구 이야기 만들기', manual: true,
          goal: '연표 사건 <b>3~5개</b>를 골라 <b>개념 연결</b>까지 맞추고 <b>제목</b>과 <b>한 줄 요약</b>을 써서 시각 자료를 완성하세요. (🎬 영상 구성안은 사건 3개와 대사)',
          hint: '시각 자료: 사건을 고르면 아래에 개념 연결 칸이 생겨요. 초록색이 되면 맞은 거예요. 만화 4컷은 사건이 4개 이하여야 해요. 제목은 2글자 이상, 한 줄 요약은 8글자 이상 써요.',
          setup() { setMode('make'); updateCtl(); },
          check() {
            const m = S.mk, evs = mkEvs();
            if (m.mode === 'vid') {
              if (evs.length !== 3) return '영상 구성안은 사건을 정확히 3개 골라야 해요. (' + evs.length + '개)';
              const no = evs.find((e) => (m.line[e.id] || '').trim().length < 6); if (no) return no.who + ' 장면의 대사를 6글자 이상 써 주세요.';
            } else {
              if (evs.length < 3 || evs.length > 5) return '연표 사건을 3~5개 골라 주세요. (' + evs.length + '개)';
              if (!m.style) return '형식(선형 연표 · 나무형 · 만화 4컷)을 골라 주세요.';
              if (m.style === 'comic' && evs.length > 4) return '만화 4컷은 사건이 4개 이하여야 해요.';
              const no = evs.find((e) => !m.con[e.id]); if (no) return no.who + '의 개념 연결을 골라 주세요.';
              const bad = evs.find((e) => !mkConOK(e)); if (bad) return '빨간 칸이 있어요. ' + bad.who + '의 실험이 오늘 배운 어떤 개념과 이어지는지 다시 생각해 보세요.';
            }
            if (m.title.trim().length < 2) return '제목을 2글자 이상 써 주세요.';
            if (m.sum.trim().length < 8) return '한 줄 요약을 8글자 이상 써 주세요.';
            return true;
          },
          explain: '연도 · 인물 · 실험 · 알게 된 것 · 개념 연결이 모두 들어간 이야기가 완성됐어요. 같은 내용을 형식을 바꿔 보며 어느 방법이 이해하기 쉬운지 친구와 이야기해 봐요.',
        },
        {
          type: 'quiz', title: '산소의 출처를 밝힌 방법',
          goal: '광합성에서 방출되는 산소가 물에서 나온다는 것을 밝힌 방법은?',
          setup() { setMode('make'); },
          choices: ['산소의 동위 원소(¹⁸O)로 물이나 CO₂를 표지하고 나오는 산소를 조사하는 방법', '식물의 질량 변화를 재는 방법', '프리즘으로 나눈 빛을 비추는 방법', '엽록체를 pH 4에서 pH 8로 옮기는 방법'],
          answer: 0,
          feedback: ['', '질량 변화로는 재료를 알 수 있지만 산소의 출처를 알 수는 없어요(소쉬르의 방법).', '프리즘 빛은 어떤 색 빛이 광합성에 쓰이는지 알려 줘요(엥겔만의 방법).', '그 방법은 ATP 합성의 힘을 보인 야겐도르프의 실험이에요.'],
          explain: '루벤과 카멘이 <b>동위 원소 ¹⁸O로 표지</b>한 물과 CO₂를 따로 주어 나오는 산소를 조사했어요. 표지된 물에서만 ¹⁸O₂가 나왔으니 광합성의 산소는 물에서 나와요.',
        },
        {
          type: 'quiz', title: '3PG가 첫 산물임을 보인 방법',
          goal: '캘빈 회로의 <b>첫 산물이 3PG</b>임을 보인 방법은?',
          setup() { setMode('make'); },
          choices: ['방사성 ¹⁴CO₂를 짧게 주고 시간별로 ¹⁴C가 든 화합물을 크로마토그래피와 자기방사법으로 확인하는 방법', '분리한 엽록체에 전자 수용체를 주고 빛을 비추는 방법', '밀폐 용기에 박하 식물과 촛불을 넣는 방법', '호기성 세균을 해캄 주위에 모으는 방법'],
          answer: 0,
          feedback: ['', '그것은 힐의 실험으로, 산소 발생이 CO₂ 고정과 별개임을 보였어요.', '그것은 프리스틀리의 실험으로, 식물이 공기를 회복시킨다는 것을 보였어요.', '그것은 엥겔만의 실험으로, 산소가 엽록체에서 나온다는 것을 보였어요.'],
          explain: '캘빈과 벤슨은 <b>¹⁴CO₂를 짧게</b> 주고 시간별로 시료를 얼려 <b>종이 크로마토그래피</b>와 <b>자기방사법</b>으로 ¹⁴C가 든 화합물을 확인했어요. 2초 뒤 가장 먼저 3PG가 표지되어 캘빈 회로의 첫 산물임을 알았어요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hy-photo-history', mount: '#game', badge: '광합성 역사 탐험가', homeHref: '../../index.html#hy',
    featureLabels: { time: '🕰 연표 카드 정렬 · 짝 맞추기', src: '🔬 엥겔만 · 루벤과 카멘 실험', cal: '⚗ 캘빈의 ¹⁴C 추적', make: '🎨 시각 자료 · 영상 구성안 만들기' },
    onFeatures() { updateCtl(); },
    levels,
  });

  function readouts() {
    const m = S.mode;
    if (m === 'time') setReads(['시간 순서', S.tm.view === 'sort' ? (tmSorted() ? '맞아요' : '카드 ' + tmBad().length + '장 어긋남') : '짝 맞추기', '고른 카드', EVI[S.tm.focus] ? EVI[S.tm.focus].who + ' (' + EVI[S.tm.focus].ys + ')' : '—', '맞힌 짝', [0, 1, 2, 3, 4, 5].filter(mtOk).length + ' / 6']);
    else if (m === 'src') { if (S.src.view === 'eng') { const cnt = enCount(enG()); setReads(['세균 수 (청자색 · 적색)', cnt[0] + ' · ' + cnt[4], '세균 수 (녹색)', String(cnt[2]), '실험', S.en.done ? '끝났어요' : S.en.run ? '진행 중' : '시작 전']); } else setReads(['실험 A ¹⁸O₂', S.rb.A.done ? S.rb.A.lab + ' / ' + S.rb.A.tube.length : '—', '실험 B ¹⁸O₂', S.rb.B.done ? S.rb.B.lab + ' / ' + S.rb.B.tube.length : '—', '기록', (S.rb.A.done ? 1 : 0) + (S.rb.B.done ? 1 : 0) + ' / 2']); }
    else if (m === 'cal') { const c = S.cl, tt = c.run ? c.run.time : c.cur, d = tt ? CD[tt] : null; setReads(['시료 시간', tt ? CT[tt] : CT[c.t], '3PG · 당 인산', d && c.spots > 0.9 ? d.pg + ' · ' + d.sp + ' %' : '—', '기록한 시점', clN() + ' / 3']); }
    else { const mk = S.mk; setReads(['고른 사건', mk.ev.length + '개', '형식', mk.mode === 'vid' ? '영상 구성안' : ({ line: '선형 연표', tree: '나무형', comic: '만화 4컷', '': '고르지 않음' })[mk.style], '개념 연결', mk.mode === 'vid' ? '—' : mkEvs().filter(mkConOK).length + ' / ' + mk.ev.length]); }
  }

  setMode('time');
  let lastFree = false, lastLv = -1, uiT = 0;
  SciSim.loop((dt, t) => {
    clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (game && game.level !== lastLv) { lastLv = game.level; updateCtl(); }
    view.apply(); FX.update(dt); ctx.clearRect(0, 0, VW, VH);
    bgFill('#f3f6ee', '#e8eee2');
    updLater(dt);
    if (S.mode === 'time') timeDraw(dt, t); else if (S.mode === 'src') srcDraw(dt, t); else if (S.mode === 'cal') clDraw(dt, t); else makeDraw(dt, t);
    FX.draw(); parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(241,246,243,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : approach(S.fade, 0, dt, 9); }
    uiT += dt; if (uiT > 0.25) { uiT = 0; updateCtl(); }
    readouts();
  });

  window.__sim = { S, VW, VH, PHONE, get game() { return game; }, levels, setMode, EV, EVI, tmG, tmSorted, tmShuffle, enG, enCount, enPx, rbGo, rbClear, clGo, CD, mkToggle, mkRowsBuild, MKC, updateCtl, tmSwap };
})();
