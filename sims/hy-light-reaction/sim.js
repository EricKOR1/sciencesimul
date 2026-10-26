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
     고등학교 세포와 물질대사 · Ⅲ. 세포호흡과 광합성 - 광합성의 명반응 (단원 58, 7차시)
     성취기준 [12세포03-06] (앞부분: 명반응의 단계별 특징)
     ① 모형: 빛 흡수  ② 모형: 물 분해  ③ 모형: ATP 생성  ④ 분석: 조건 변화
     (광계 Ⅰ·Ⅱ 이름은 쓰되 반응 중심 색소의 파장과 산화 환원 전위 수치는 다루지 않아요)
     ========================================================= */
  const S = { mode: 'abs', fade: 0 };
  let game = null;
  const fi = (v) => String(Math.round(v));
  const fx1 = (v) => (Math.round(v * 10) / 10).toFixed(1);
  function pill(x, y, w, h, text, bg, fg, a) {
    ctx.save(); ctx.globalAlpha = a == null ? 1 : a; D.roundRect(x - w / 2, y - h / 2, w, h, h / 2); ctx.fillStyle = bg; ctx.fill(); ctx.strokeStyle = 'rgba(15,23,42,.28)'; ctx.lineWidth = 1; ctx.stroke();
    T(x, y + h * 0.33, text, h * 0.68, fg, 'center', 800); ctx.restore();
  }
  /* 파장(nm) -> 색 */
  function wl2rgb(w) {
    let r = 0, g = 0, b = 0;
    if (w < 440) { r = -(w - 440) / 60; b = 1; } else if (w < 490) { g = (w - 440) / 50; b = 1; } else if (w < 510) { g = 1; b = -(w - 510) / 20; } else if (w < 580) { r = (w - 510) / 70; g = 1; } else if (w < 645) { r = 1; g = -(w - 645) / 65; } else { r = 1; }
    const f = w < 420 ? 0.35 + 0.65 * (w - 380) / 40 : w > 680 ? 0.5 + 0.5 * (700 - w) / 20 : 1;
    const c = (v) => Math.round(255 * Math.pow(clamp(v * f, 0, 1), 0.8));
    return 'rgb(' + c(r) + ',' + c(g) + ',' + c(b) + ')';
  }
  /* 광계 색소의 흡수 정도 (0~1): 청자색과 적색 영역에서 높고 녹색에서 낮아요 */
  const ABSF = (wl) => clamp(0.08 + 0.85 * Math.exp(-Math.pow((wl - 438) / 30, 2)) + 0.78 * Math.exp(-Math.pow((wl - 675) / 22, 2)), 0, 0.97);
  const cnt20 = (wl) => Math.floor(20 * ABSF(wl) + 0.5);
  const BANDS = [{ k: 'blue', name: '청자색', lo: 400, hi: 490 }, { k: 'cyan', name: '청록색', lo: 490, hi: 520 }, { k: 'green', name: '녹색', lo: 520, hi: 570 }, { k: 'yel', name: '황·주황색', lo: 570, hi: 620 }, { k: 'red', name: '적색', lo: 620, hi: 700.001 }];
  const bandOf = (wl) => BANDS.find((b) => wl >= b.lo && wl < b.hi) || BANDS[4];
  const chip3 = (b) => (b ? '✅' : '⬜');

  /* =========================================================
     ① 빛 흡수: 파장에 따라 전자가 들뜨는 횟수
     ========================================================= */
  S.ab = { wl: 450, rec: [], run: null, last: null, ph: [], hops: [], toks: [], pigF: [], rcF: 0, bounce: [] };
  const abPig = (() => {
    const out = [];
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + 0.3; out.push({ u: Math.cos(a) * 0.4, v: Math.sin(a) * 0.36 }); }
    for (let i = 0; i < 11; i++) { const a = i / 11 * TAU + 0.1; out.push({ u: Math.cos(a) * 0.76, v: Math.sin(a) * 0.66 }); }
    return out;
  })();
  function abG() {
    return PHONE
      ? { src: { x: 44, y: 66 }, ps: { x: 188, y: 172, r: 84 }, lad: { x: 346, y: 10, w: 124, h: 292 }, sc: { x: 10, y: 10, w: 328, h: 292 }, sp: { x: 10, y: 310, w: 460, h: 130 }, tb: { x: 10, y: 448, w: 460, h: 182 } }
      : { src: { x: 66, y: 96 }, ps: { x: 300, y: 196, r: 110 }, lad: { x: 540, y: 14, w: 246, h: 364 }, sc: { x: 14, y: 14, w: 518, h: 364 }, sp: { x: 14, y: 388, w: 500, h: 160 }, tb: { x: 522, y: 388, w: 264, h: 160 } };
  }
  const pigPos = (g, i) => ({ x: g.ps.x + abPig[i].u * g.ps.r, y: g.ps.y + abPig[i].v * g.ps.r * 0.88 });
  function abReset() {
    const a = S.ab; a.run = null; a.last = null; a.ph.length = 0; a.hops.length = 0; a.toks.length = 0; a.bounce.length = 0; a.pigF = abPig.map(() => 0); a.rcF = 0; a.rec = [];
    clearLater(); parts.clear(); updateCtl();
  }
  function abGo() {
    const a = S.ab; if (a.run) return;
    const A = ABSF(a.wl);
    a.run = { wl: a.wl, i: 0, t: 0, ex: 0, rf: 0, A, landed: 0 }; a.last = null; Sound.click(); updateCtl();
  }
  function abSpawn(g, run) {
    const i = run.i, A = run.A, absorbed = Math.floor((i + 1) * A + 0.5) - Math.floor(i * A + 0.5) === 1;
    const pig = Math.floor(Math.random() * abPig.length), tp = pigPos(g, pig);
    const col = wl2rgb(run.wl);
    S.ab.ph.push({ x: g.src.x, y: g.src.y, sx: g.src.x, sy: g.src.y, tx: tp.x, ty: tp.y, t: 0, dur: 0.55, ab: absorbed, pig, col, hit: false, rt: 0, vx: 0, vy: 0 });
  }
  function abUpdate(dt) {
    const g = abG(), a = S.ab, run = a.run;
    if (run) {
      run.t += dt;
      while (run.i < 20 && run.t >= run.i * 0.17) { abSpawn(g, run); run.i++; }
    }
    for (let k = a.ph.length - 1; k >= 0; k--) {
      const p = a.ph[k];
      if (!p.hit) {
        p.t += dt / p.dur; const e = Math.min(1, p.t); p.x = p.sx + (p.tx - p.sx) * e; p.y = p.sy + (p.ty - p.sy) * e;
        if (p.t >= 1) {
          p.hit = true;
          if (p.ab) { a.pigF[p.pig] = 1; a.hops.push({ x0: p.tx, y0: p.ty, t: 0, dur: 0.28, col: p.col }); a.ph.splice(k, 1); }
          else {
            if (run) run.rf++;
            const ux = (p.tx - p.sx), uy = (p.ty - p.sy), L = Math.hypot(ux, uy) || 1;
            p.vx = (-ux / L * 0.5 + (Math.random() - 0.5) * 0.9) * 190; p.vy = (-Math.abs(uy / L) * 0.7 - 0.35 + (Math.random() - 0.5) * 0.4) * 190; p.rt = 0;
          }
        }
      } else { p.rt += dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.rt > 0.7) a.ph.splice(k, 1); }
    }
    for (let k = a.hops.length - 1; k >= 0; k--) {
      const h = a.hops[k]; h.t += dt / h.dur;
      if (h.t >= 1) {
        a.hops.splice(k, 1); a.rcF = 1; if (run) run.ex++;
        a.toks.push({ t: -0.05, ox: (Math.random() - 0.5) * 36 }); Sound.tick();
      }
    }
    for (let k = a.toks.length - 1; k >= 0; k--) { a.toks[k].t += dt / 1.5; if (a.toks[k].t >= 1) a.toks.splice(k, 1); }
    a.pigF = a.pigF.map((v) => Math.max(0, v - dt * 2.2)); a.rcF = Math.max(0, a.rcF - dt * 2.6);
    if (run && run.i >= 20 && !a.ph.length && !a.hops.length) {
      const wl = run.wl, n = run.ex, existing = a.rec.findIndex((r) => r.wl === wl);
      const row = { wl, n }; if (existing >= 0) a.rec.splice(existing, 1); a.rec.push(row);
      a.last = { wl, ex: run.ex, rf: run.rf }; a.run = null; Sound.success(); updateCtl();
    }
  }
  function abClasses() { const c = {}; S.ab.rec.forEach((r) => { c[bandOf(r.wl).k] = true; }); return c; }
  function abDraw(dt, t) {
    const g = abG(), a = S.ab; abUpdate(dt);
    const wl = a.run ? a.run.wl : a.wl, col = wl2rgb(wl), ps = g.ps, r = ps.r;
    // 장면 바탕
    panel(g.sc.x, g.sc.y, g.sc.w, g.sc.h, 18, '#fbfdf9');
    // 빛 원천과 빔
    ctx.save(); ctx.globalAlpha = 0.07; ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(g.src.x, g.src.y - 14); ctx.lineTo(ps.x + r * 0.9, ps.y - r * 0.5); ctx.lineTo(ps.x - r * 0.6, ps.y + r * 0.7); ctx.lineTo(g.src.x, g.src.y + 14); ctx.closePath(); ctx.fill(); ctx.restore();
    D.glow(g.src.x, g.src.y, 62, col, 0.55); D.sphere(g.src.x, g.src.y, 24, col, { gloss: true });
    for (let k = 0; k < 8; k++) { const ang = k / 8 * TAU + t * 0.4; ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(g.src.x + Math.cos(ang) * 31, g.src.y + Math.sin(ang) * 31); ctx.lineTo(g.src.x + Math.cos(ang) * 40, g.src.y + Math.sin(ang) * 40); ctx.stroke(); }
    T(g.src.x, g.src.y + 62, '빛 ' + wl + ' nm', PHONE ? 13 : 15, '#334155', 'center', 800);
    T(g.src.x, g.src.y + 80, bandOf(wl).name, PHONE ? 13 : 14.5, '#475569', 'center', 700);
    // 틸라코이드 막 띠
    const my = ps.y + r * 0.8, mx0 = g.sc.x + (PHONE ? 70 : 100), mx1 = g.sc.x + g.sc.w - 14;
    ctx.fillStyle = 'rgba(244,114,182,.3)'; ctx.fillRect(mx0, my - 13, mx1 - mx0, 26);
    for (let x = mx0 + 6; x < mx1 - 4; x += 12) { D.sphere(x, my - 11, 4.2, '#f472b6', { gloss: false }); D.sphere(x, my + 11, 4.2, '#f472b6', { gloss: false }); }
    T(mx1 - 4, my + 38, '틸라코이드 막', PHONE ? 12.5 : 14, '#be185d', 'right', 800);
    // 광계 (색소 모임)
    ctx.save(); ctx.beginPath(); ctx.ellipse(ps.x, ps.y, r, r * 0.88, 0, 0, TAU); ctx.fillStyle = 'rgba(134,239,172,.28)'; ctx.fill(); ctx.strokeStyle = '#16a34a'; ctx.lineWidth = 2.5; ctx.stroke(); ctx.restore();
    abPig.forEach((q, i) => {
      const p = pigPos(g, i), f = a.pigF[i];
      if (f > 0.02) D.glow(p.x, p.y, 26, col, f * 0.9);
      D.sphere(p.x, p.y, PHONE ? 7 : 8.5, f > 0.3 ? C.mix('#22a05a', '#fef08a', f) : '#22a05a', { gloss: true });
    });
    // 반응 중심
    const rc = { x: ps.x, y: ps.y + r * 0.02 };
    if (a.rcF > 0.02) D.glow(rc.x, rc.y, 40, '#fde047', a.rcF);
    D.sphere(rc.x, rc.y, PHONE ? 12 : 14, '#15803d', { gloss: true, outline: '#14532d' });
    T(rc.x, ps.y + r * 0.88 + (PHONE ? 22 : 24), '광계: 색소 모임 · 가운데 반응 중심', PHONE ? 12 : 14, '#166534', 'center', 800);
    // 반응 중심으로 모이는 에너지
    a.hops.forEach((h) => { const e = h.t; const x = h.x0 + (rc.x - h.x0) * e, y = h.y0 + (rc.y - h.y0) * e; D.glow(x, y, 16, h.col, 0.8); D.sphere(x, y, 4, '#fff', { gloss: false }); });
    // 광자
    a.ph.forEach((p) => {
      const al = p.hit ? 1 - p.rt / 0.7 : 1; ctx.save(); ctx.globalAlpha = Math.max(0, al);
      const dx = p.hit ? p.vx : p.tx - p.sx, dy = p.hit ? p.vy : p.ty - p.sy, L = Math.hypot(dx, dy) || 1;
      ctx.strokeStyle = p.col; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - dx / L * 18, p.y - dy / L * 18); ctx.stroke();
      D.glow(p.x, p.y, 12, p.col, 0.85); D.sphere(p.x, p.y, 4.4, p.col, { gloss: false }); ctx.restore();
    });
    // 에너지 준위 계단
    const L = g.lad; panel(L.x, L.y, L.w, L.h, 18, '#fff');
    T(L.x + 14, L.y + 24, '전자의 에너지 준위', PHONE ? 13 : 15, '#1f2d44', 'left', 800);
    const hiY = L.y + (PHONE ? 78 : 92), loY = L.y + L.h - (PHONE ? 74 : 94), rx0 = L.x + 22, rx1 = L.x + L.w - (PHONE ? 22 : 78);
    D.arrow(L.x + 12, loY + 34, L.x + 12, hiY - 26, { color: '#94a3b8', width: 2.5, head: 10 });
    T(L.x + 22, hiY - 12, '높음', 12.5, '#b45309', 'left', 800); T(L.x + 22, loY + 24, '낮음', 12.5, '#475569', 'left', 800);
    ctx.strokeStyle = '#d97706'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(rx0 + 16, hiY); ctx.lineTo(rx1, hiY); ctx.stroke();
    ctx.strokeStyle = '#64748b'; ctx.beginPath(); ctx.moveTo(rx0 + 16, loY); ctx.lineTo(rx1, loY); ctx.stroke();
    const cxL = (rx0 + 16 + rx1) / 2;
    D.sphere(cxL, loY - 11, 8.5, '#fde047', { gloss: true, text: 'e⁻', textColor: '#713f12', textScale: 0.95 });
    T(cxL, loY + 22, '(바닥 상태)', 12, '#64748b', 'center', 700);
    a.toks.forEach((k) => {
      if (k.t < 0) return;
      const jt = Math.min(1, k.t / 0.3), e = SciSim.ease.outBack(jt), exitP = clamp((k.t - 0.55) / 0.45, 0, 1);
      const x = cxL + k.ox * (1 - exitP * 0.3) + exitP * (rx1 - cxL + 20), y = loY - 11 + (hiY - 11 - (loY - 11)) * e;
      ctx.save(); ctx.globalAlpha = 1 - exitP * exitP; D.glow(x, y, 15, '#facc15', 0.6); D.sphere(x, y, 8.5, '#fde047', { gloss: true, text: 'e⁻', textColor: '#713f12', textScale: 0.95 }); ctx.restore();
    });
    if (!PHONE) { D.arrow(rx1 + 6, hiY - 11, rx1 + 56, hiY - 11, { color: '#d97706', width: 3, head: 11 }); T(rx1 + 6, hiY - 24, '전자 전달계로', 12.5, '#b45309', 'left', 800); }
    else T(L.x + L.w - 10, hiY - 24, '→ 전달계로', 11.5, '#b45309', 'right', 800);
    T(L.x + L.w / 2, L.y + L.h - 12, PHONE ? '나간 자리는 곧 채워져요' : '나간 전자의 자리는 곧 채워져요 (다음 단계)', PHONE ? 12 : 12.5, '#64748b', 'center', 700);
    // 파장별 기록 그래프
    const sp = g.sp; panel(sp.x, sp.y, sp.w, sp.h, 16, '#fff');
    const x0 = sp.x + 40, x1 = sp.x + sp.w - 16, X = (w) => x0 + (w - 400) / 300 * (x1 - x0);
    T(sp.x + 12, sp.y + 22, '파장별 들뜬 전자 수 (광자 20개당)', PHONE ? 13 : 14.5, '#1f2d44', 'left', 800);
    const by = sp.y + (PHONE ? 34 : 38), bh = PHONE ? 12 : 16;
    for (let w = 400; w < 700; w += 4) { ctx.fillStyle = wl2rgb(w + 2); ctx.fillRect(X(w), by, X(w + 4) - X(w) + 0.6, bh); }
    ctx.strokeStyle = 'rgba(15,23,42,.3)'; ctx.lineWidth = 1; ctx.strokeRect(x0, by, x1 - x0, bh);
    const cy0 = by + bh + (PHONE ? 8 : 12), cy1 = sp.y + sp.h - (PHONE ? 22 : 24), Y = (n) => cy1 - clamp(n / 20, 0, 1) * (cy1 - cy0);
    [0, 10, 20].forEach((n) => { ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x0, Y(n)); ctx.lineTo(x1, Y(n)); ctx.stroke(); T(x0 - 6, Y(n) + 4, String(n), 12, '#64748b', 'right', 700); });
    [400, 500, 600, 700].forEach((w) => T(X(w), sp.y + sp.h - 6, w + ' nm', PHONE ? 12 : 12.5, '#64748b', 'center', 700));
    const cls = abClasses(), all3 = cls.blue && cls.green && cls.red;
    if (all3) { ctx.save(); ctx.setLineDash([5, 4]); ctx.strokeStyle = '#16a34a'; ctx.lineWidth = 2; ctx.beginPath(); for (let w = 400; w <= 700; w += 5) { const x = X(w), y = Y(20 * ABSF(w)); if (w === 400) ctx.moveTo(x, y); else ctx.lineTo(x, y); } ctx.stroke(); ctx.restore(); T(X(555), cy0 + 12, '점선: 광계 색소의 흡수 경향', PHONE ? 12 : 12.5, '#166534', 'center', 800); }
    a.rec.forEach((q) => { const x = X(q.wl), y = Y(q.n); D.sphere(x, y, PHONE ? 6 : 7, wl2rgb(q.wl), { gloss: false, outline: '#1f2937', outlineWidth: 1.5 }); });
    const mk = X(wl); ctx.fillStyle = '#1f2937'; ctx.beginPath(); ctx.moveTo(mk, by - 1); ctx.lineTo(mk - 6, by - 9); ctx.lineTo(mk + 6, by - 9); ctx.closePath(); ctx.fill();
    // 기록표
    const tb = g.tb; panel(tb.x, tb.y, tb.w, tb.h, 16, '#fff');
    T(tb.x + 12, tb.y + 22, '기록표', PHONE ? 13 : 14.5, '#1f2d44', 'left', 800);
    const rows = a.rec.slice(-(PHONE ? 6 : 5)), rh = PHONE ? 24 : 24;
    if (!rows.length) T(tb.x + 12, tb.y + 52, '광자를 보내 측정하면 여기에 기록돼요.', PHONE ? 12.5 : 13, '#94a3b8', 'left', 700);
    rows.forEach((q, i) => { const y = tb.y + 40 + i * rh; D.sphere(tb.x + 20, y + 8, 7, wl2rgb(q.wl), { gloss: false }); T(tb.x + 34, y + 13, q.wl + ' nm ' + bandOf(q.wl).name, PHONE ? 12.5 : 13, '#26324a', 'left', 800); T(tb.x + tb.w - 12, y + 13, q.n + ' / 20', PHONE ? 14 : 15, '#1f2d44', 'right', 800); });
  }

  /* =========================================================
     ② ~ ④ 틸라코이드 막: 전자 전달 · 물 분해 · H⁺ 기울기 · ATP 합성
     ========================================================= */
  function thG() {
    const cd = S.mode === 'cond';
    const E = PHONE ? { x: 10, y: 10, w: 460, h: 138 } : cd ? { x: 14, y: 12, w: 772, h: 122 } : { x: 14, y: 12, w: 772, h: 136 };
    const M = PHONE ? { x: 10, y: 154, w: 460, h: 286 } : cd ? { x: 14, y: 142, w: 772, h: 252 } : { x: 14, y: 154, w: 772, h: 288 };
    const B = PHONE ? { x: 10, y: 446, w: 460, h: 184 } : cd ? { x: 14, y: 402, w: 772, h: 146 } : { x: 14, y: 450, w: 772, h: 98 };
    const memY = M.y + M.h * 0.5, th = PHONE ? 22 : 24;
    const fr = { p2: 0.12, car: 0.31, p1: 0.5, red: 0.65, syn: 0.84 }, x = {};
    Object.keys(fr).forEach((k) => { x[k] = M.x + M.w * fr[k]; });
    const lum = { x: M.x + 8, y: M.y + 40, w: M.w - 16, h: memY - th / 2 - 5 - (M.y + 40) };
    const str = { x: M.x + 8, y: memY + th / 2 + 5, w: M.w - 16, h: M.y + M.h - 8 - (memY + th / 2 + 5) };
    return { E, M, B, memY, th, x, lum, str, sc: PHONE ? 0.64 : 0.78, xW: x.p2 - (PHONE ? 36 : 50), pw: PHONE ? 54 : 74 };
  }
  const NCD = [0.5, 0.4, 1.0, 0.7, 0.4, 1.0], CYD = [0.4, 1.1, 0.8];
  function thPts() {
    const g = thG(), E = g.E, top = E.y + 38, bot = E.y + E.h - 26, Y = (lv) => bot - lv * (bot - top);
    const P = { W: { x: g.xW, y: Y(0) }, G2: { x: g.x.p2, y: Y(0.14) }, X2: { x: g.x.p2, y: Y(0.66) }, C: { x: g.x.car, y: Y(0.42) }, G1: { x: g.x.p1, y: Y(0.34) }, X1: { x: g.x.p1, y: Y(0.97) }, R: { x: g.x.red, y: Y(0.62) }, Q: { x: g.x.car + (PHONE ? 8 : 16), y: Y(0.22) } };
    P.nc = [P.W, P.G2, P.X2, P.C, P.G1, P.X1, P.R]; P.cy = [P.G1, P.X1, P.Q, P.G1]; P.top = top; P.bot = bot;
    return P;
  }
  S.th = null; S.thKeep = { I: 0, treat: 'none', cyc: false };
  function thInit(keep) {
    const k = Object.assign({}, S.thKeep, keep || {}); S.thKeep = k;
    const g = thG();
    S.th = { I: k.I, treat: k.treat, cyc: k.cyc, toks: [], acc: 0, cacc: 0, dots: [], flows: [], H: 0, synAcc: 0, passed: 0, atp: 0, nadph: 0, o2: 0, eW: 0, wq: 0, e2: 0, pulses: 0, atpFly: [], npFly: [], flash: [], g2: 0, g1: 0, pumpFx: 0, spin: 0, spinV: 0, bubbles: [], rate: { atp: 0, np: 0, o2: 0 }, cnt: { atp: 0, np: 0, o2: 0 }, hist: [], histT: 0, synRate: 0, strH: [], lastDt: 0.016 };
    for (let i = 0; i < 2; i++) S.th.dots.push({ x: g.lum.x + 30 + Math.random() * (g.lum.w - 60), y: g.lum.y + 10 + Math.random() * (g.lum.h - 20), vx: (Math.random() - 0.5) * 30, vy: (Math.random() - 0.5) * 30, a: 1, base: true });
    for (let i = 0; i < 2; i++) S.th.strH.push({ x: g.str.x + 40 + Math.random() * (g.str.w - 80), y: g.str.y + 14 + Math.random() * (g.str.h - 30), vx: (Math.random() - 0.5) * 24, vy: (Math.random() - 0.5) * 24 });
  }
  function thReset(keep) { clearLater(); FX.clear(); parts.clear(); thInit(keep); updateCtl(); }
  const phL = () => 8 - 3 * clamp(S.th.H / 60, 0, 1);
  const gfrac = () => clamp(S.th.H / 60, 0, 1);
  const ratioTxt = () => { const v = Math.pow(10, 3 * gfrac()); return v < 10 ? fx1(v) : comma(v); };
  function thAddH(n, x, y, rise) {
    const th = S.th, g = thG();
    for (let i = 0; i < n; i++) { th.dots.push({ x: x + (Math.random() - 0.5) * 70, y: g.lum.y + 12 + Math.random() * (g.lum.h - 30), vx: (Math.random() - 0.5) * 40, vy: (Math.random() - 0.5) * 30, a: 0.1, base: false }); th.H++; }
  }
  function thPulse() {
    const th = S.th; if (th.toks.length > 30) return;
    th.pulses++; thSpawn(); Sound.click(); updateCtl();
  }
  function thSpawn() { S.th.toks.push({ k: 'nc', seg: 0, t: 0 }); }
  function thSpawnCyc() { S.th.toks.push({ k: 'cy', seg: 0, t: 0 }); thFlash('X1'); }
  function thFlash(which) {
    const th = S.th; th.flash.push({ w: which, t: 0 }); if (which === 'X2') th.g2 = 1; else th.g1 = 1;
  }
  function thWaterE() {
    const th = S.th, g = thG(); th.eW++; th.wq++;
    if (th.wq >= 4) {
      th.wq = 0; th.o2++; th.cnt.o2++;
      const wy = g.memY - g.th / 2 - 36;
      th.bubbles.push({ x: g.x.p2 - 6, y: wy, t: 0 }); th.bubbles.push({ x: g.x.p2 + 8, y: wy + 2, t: -0.12 });
      thAddH(4, g.x.p2, wy + 6, true); Sound.success();
      parts.burst(g.x.p2, wy, { count: 8, colors: ['#bae6fd', '#e0f2fe', '#fff'], speed: 60, life: 0.7, gravity: -30, shape: 'bubble', size: 3.5 });
    } else Sound.tick();
  }
  function thPump() {
    const g = thG(); S.th.pumpFx = 1; thAddH(2, g.x.car, g.memY - g.th / 2 - 4, true);
  }
  function thRed() {
    const th = S.th, g = thG(); th.e2++;
    if (th.e2 >= 2) { th.e2 = 0; th.nadph++; th.cnt.np++; th.npFly.push({ t: 0, lane: th.nadph % 3 }); Sound.tick(); }
  }
  function thAssignFlow() {
    const th = S.th, g = thG(); if (th.H <= 0) return;
    let bi = -1, bd = 1e9; const sx = g.x.syn;
    th.dots.forEach((q, i) => { if (q.base) return; const d = Math.hypot(q.x - sx, q.y - g.lum.y - g.lum.h); if (d < bd) { bd = d; bi = i; } });
    if (bi < 0) return;
    const q = th.dots.splice(bi, 1)[0]; th.H--;
    th.flows.push({ x: q.x, y: q.y, stage: 0, t: 0 });
  }
  const NCT = (i) => NCD[i], CYT = (i) => CYD[i];
  function tokPos(tk, P) {
    const pts = tk.k === 'nc' ? P.nc : P.cy, d = tk.k === 'nc' ? NCD : CYD, a = pts[tk.seg], b = pts[tk.seg + 1];
    const jump = (tk.k === 'nc' && (tk.seg === 1 || tk.seg === 4)) || (tk.k === 'cy' && tk.seg === 0);
    const e = jump ? SciSim.ease.outBack(clamp(tk.t, 0, 1)) : SciSim.ease.inOutSine(clamp(tk.t, 0, 1));
    return { x: a.x + (b.x - a.x) * e, y: a.y + (b.y - a.y) * e };
  }
  function thUpdate(dt) {
    const th = S.th, g = thG(), P = thPts();
    th.lastDt = dt;
    // 전자 만들기
    const I = th.I, ncOK = th.treat === 'none' && I > 0;
    if (ncOK) { th.acc += 0.8 * I * dt; while (th.acc >= 1) { th.acc -= 1; if (th.toks.length < 40) thSpawn(); } } else th.acc = 0;
    if (th.cyc && I > 0) { th.cacc += 0.5 * I * dt; while (th.cacc >= 1) { th.cacc -= 1; if (th.toks.length < 60) thSpawnCyc(); } } else th.cacc = 0;
    // 전자 이동
    for (let i = th.toks.length - 1; i >= 0; i--) {
      const tk = th.toks[i], dur = tk.k === 'nc' ? NCD : CYD;
      tk.t += dt / dur[tk.seg];
      if (tk.t >= 1) {
        const seg = tk.seg;
        if (tk.k === 'nc') {
          if (seg === 0) thWaterE(); else if (seg === 2) thPump(); else if (seg === 5) { thRed(); th.toks.splice(i, 1); continue; }
          tk.seg++; tk.t = 0; if (tk.seg === 1) thFlash('X2'); if (tk.seg === 4) thFlash('X1');
        } else {
          if (seg === 1) thPump(); if (seg === 2) { th.toks.splice(i, 1); continue; }
          tk.seg++; tk.t = 0;
        }
      }
    }
    // H⁺ 점
    const L = g.lum, pw = g.pw;
    th.dots.forEach((q) => {
      q.a = Math.min(1, q.a + dt * 3);
      q.vx += (Math.random() - 0.5) * 110 * dt; q.vy += (Math.random() - 0.5) * 110 * dt; const sp = Math.hypot(q.vx, q.vy), cap = 44; if (sp > cap) { q.vx *= cap / sp; q.vy *= cap / sp; }
      q.x += q.vx * dt; q.y += q.vy * dt;
      if (q.x < L.x + 8) { q.x = L.x + 8; q.vx = Math.abs(q.vx); } if (q.x > L.x + L.w - 8) { q.x = L.x + L.w - 8; q.vx = -Math.abs(q.vx); }
      if (q.y < L.y + 8) { q.y = L.y + 8; q.vy = Math.abs(q.vy); } if (q.y > L.y + L.h - 4) { q.y = L.y + L.h - 4; q.vy = -Math.abs(q.vy); }
      [g.x.p2, g.x.p1].forEach((cx) => { const top = g.memY - g.th / 2 - 18; if (Math.abs(q.x - cx) < pw / 2 + 3 && q.y > top - 4) { q.y = top - 4; q.vy = -Math.abs(q.vy); } });
    });
    th.strH.forEach((q) => { q.vx += (Math.random() - 0.5) * 90 * dt; q.vy += (Math.random() - 0.5) * 90 * dt; const sp = Math.hypot(q.vx, q.vy); if (sp > 28) { q.vx *= 28 / sp; q.vy *= 28 / sp; } q.x += q.vx * dt; q.y += q.vy * dt; const R = g.str; if (q.x < R.x + 10) q.vx = Math.abs(q.vx); if (q.x > R.x + R.w - 10) q.vx = -Math.abs(q.vx); if (q.y < R.y + 8) q.vy = Math.abs(q.vy); if (q.y > R.y + R.h - 28) q.vy = -Math.abs(q.vy); q.x = clamp(q.x, R.x + 10, R.x + R.w - 10); q.y = clamp(q.y, R.y + 8, R.y + R.h - 28); });
    // ATP 합성 효소: H⁺ 가 많을수록 빨리 흘러요
    const rate = th.H > 0 ? Math.max(0.4 * th.H, 1.5) : 0;
    if (th.H > 0) { th.synAcc += rate * dt; while (th.synAcc >= 1 && th.H > 0) { th.synAcc -= 1; thAssignFlow(); } } else th.synAcc = 0;
    th.synRate = approach(th.synRate, rate, dt, 5);
    const sx = g.x.syn, chTop = g.memY - g.th / 2 - 22 * g.sc, chBot = g.memY + g.th / 2 + 6;
    for (let i = th.flows.length - 1; i >= 0; i--) {
      const f = th.flows[i];
      if (f.stage === 0) { const dx = sx - f.x, dy = chTop - f.y, d = Math.hypot(dx, dy) || 1, v = 190 * dt; if (d <= v) { f.x = sx; f.y = chTop; f.stage = 1; f.t = 0; } else { f.x += dx / d * v; f.y += dy / d * v; } }
      else if (f.stage === 1) { f.t += dt / 0.5; f.x = sx + (f.t > 0.55 ? 0 : 0); f.y = chTop + (chBot - chTop) * Math.min(1, f.t); if (f.t >= 1) { f.stage = 2; f.t = 0; th.passed++; if (th.passed % 4 === 0) { th.atp++; th.cnt.atp++; th.atpFly.push({ t: 0, lane: th.passed % 3 }); } } }
      else { f.t += dt / 0.8; f.x = sx + f.t * 22; f.y = chBot + f.t * 12; if (f.t >= 1) th.flows.splice(i, 1); }
    }
    th.spinV = approach(th.spinV, Math.min(th.synRate * 0.9, 14), dt, 6); th.spin += th.spinV * dt;
    for (let i = th.atpFly.length - 1; i >= 0; i--) { th.atpFly[i].t += dt / 1.6; if (th.atpFly[i].t >= 1) th.atpFly.splice(i, 1); }
    for (let i = th.npFly.length - 1; i >= 0; i--) { th.npFly[i].t += dt / 1.6; if (th.npFly[i].t >= 1) th.npFly.splice(i, 1); }
    for (let i = th.bubbles.length - 1; i >= 0; i--) { const b = th.bubbles[i]; b.t += dt; if (b.t > 0) { b.y -= dt * 46; b.x += Math.sin(b.t * 5 + i) * 0.4; } if (b.y < g.M.y + 16) th.bubbles.splice(i, 1); }
    for (let i = th.flash.length - 1; i >= 0; i--) { th.flash[i].t += dt / 0.5; if (th.flash[i].t >= 1) th.flash.splice(i, 1); }
    th.g2 = Math.max(0, th.g2 - dt * 2.4); th.g1 = Math.max(0, th.g1 - dt * 2.4); th.pumpFx = Math.max(0, th.pumpFx - dt * 2.2);
    // 생성 속도 (1초 평균)
    const kk = 1 - Math.exp(-dt / 1.0);
    ['atp', 'np', 'o2'].forEach((k) => { th.rate[k] += (th.cnt[k] / Math.max(dt, 0.001) - th.rate[k]) * kk; th.cnt[k] = 0; if (th.rate[k] < 0.001) th.rate[k] = 0; });
    th.histT += dt; if (th.histT >= 0.2) { th.histT = 0; th.hist.push([th.rate.atp, th.rate.np, th.rate.o2]); if (th.hist.length > 150) th.hist.shift(); }
  }
  /* ATP 합성 효소 (hy-phosphorylation과 같은 모양: 위 = H⁺ 가 많은 쪽) */
  function synthDraw(G, spin, label) {
    const my = G.memY, sx = G.x.syn, sc = G.sc, th = G.th;
    ctx.save(); ctx.translate(sx, my);
    ctx.fillStyle = 'rgba(253,230,138,.55)'; ctx.fillRect(-14 * sc, -th / 2 - 22 * sc, 28 * sc, th + 22 * sc);
    ctx.strokeStyle = '#a16207'; ctx.lineWidth = 2; ctx.strokeRect(-14 * sc, -th / 2 - 22 * sc, 28 * sc, th + 22 * sc);
    ctx.beginPath(); ctx.ellipse(0, 0, 30 * sc, th / 2 + 7 * sc, 0, 0, TAU); ctx.fillStyle = '#fde68a'; ctx.fill(); ctx.stroke();
    ctx.save(); ctx.rotate(spin); for (let k = 0; k < 6; k++) { ctx.rotate(TAU / 6); ctx.fillStyle = k % 2 ? '#f59e0b' : '#d97706'; ctx.fillRect(4 * sc, -2.5 * sc, 20 * sc, 5 * sc); } ctx.restore();
    ctx.fillStyle = '#d97706'; ctx.fillRect(-5 * sc, th / 2, 10 * sc, 20 * sc);
    D.sphere(0, th / 2 + 44 * sc, 24 * sc, '#fbbf24', { gloss: true, outline: '#a16207', outlineWidth: 1.5 });
    ctx.save(); ctx.translate(0, th / 2 + 44 * sc); ctx.rotate(spin * 0.7); ctx.fillStyle = '#b45309'; ctx.fillRect(-2.5, -14 * sc, 5, 14 * sc); ctx.restore();
    ctx.restore();
    T(sx, my + th / 2 + 44 * sc + 46, label || 'ATP 합성 효소', PHONE ? 12 : 13.5, '#92400e', 'center', 800);
  }
  function thMembrane(G, th) {
    const M = G.M, my = G.memY, t = G.th;
    panel(M.x, M.y, M.w, M.h, 18, '#fffdf7');
    // 틸라코이드 내부(루멘): 주머니 모양
    D.roundRect(G.lum.x, G.lum.y - 4, G.lum.w, G.lum.h + 4, 16); ctx.fillStyle = 'rgba(251,208,150,.5)'; ctx.fill(); ctx.strokeStyle = 'rgba(244,114,182,.75)'; ctx.lineWidth = 3; ctx.stroke();
    D.roundRect(G.str.x, G.str.y, G.str.w, G.str.h, 12); const sg = ctx.createLinearGradient(0, G.str.y, 0, G.str.y + G.str.h); sg.addColorStop(0, '#effae3'); sg.addColorStop(1, '#d4efc5'); ctx.fillStyle = sg; ctx.fill();
    T(M.x + M.w - 14, M.y + 22, '틸라코이드 막 단면 (확대)', PHONE ? 12.5 : 14, '#be185d', 'right', 800);
    { const x0 = M.x + 10, bw = M.w - 20; blit(sprite('thband' + Math.round(bw) + '_' + t, bw, t, (cx, D2) => { cx.fillStyle = 'rgba(244,114,182,.3)'; cx.fillRect(0, 0, bw, t); for (let x = 6; x < bw - 4; x += 12) { D2.sphere(x, 2, 4.2, '#f472b6', { gloss: false }); D2.sphere(x, t - 2, 4.2, '#f472b6', { gloss: false }); } }), x0 + bw / 2, my); }
    // 광계 Ⅱ · 전달 단백질 · 광계 Ⅰ · 환원 효소
    const pw = G.pw, top = my - t / 2 - 18, ph = t + 34;
    const blob = (cx, fill, stroke, glow) => {
      if (glow > 0.02) D.glow(cx, my, 62, '#fde047', glow * 0.8);
      SH(() => { D.roundRect(cx - pw / 2, top, pw, ph, 14); ctx.fillStyle = fill; ctx.fill(); }, { blur: 5, y: 2 }); D.roundRect(cx - pw / 2, top, pw, ph, 14); ctx.strokeStyle = stroke; ctx.lineWidth = 2.5; ctx.stroke();
    };
    blob(G.x.p2, '#86efac', '#15803d', th.g2); blob(G.x.p1, '#86efac', '#15803d', th.g1);
    const lab = (cx, s) => T(cx, my + t / 2 + 28, s, PHONE ? 12 : 13, '#14532d', 'center', 800);
    lab(G.x.p2, '광계 Ⅱ'); lab(G.x.p1, '광계 Ⅰ');
    // 전자 전달 단백질
    const cw = PHONE ? 50 : 62; SH(() => { D.roundRect(G.x.car - cw / 2, my - t / 2 - 8, cw, t + 16, 14); ctx.fillStyle = th.pumpFx > 0.05 ? C.mix('#c4b5fd', '#fdba74', th.pumpFx) : '#c4b5fd'; ctx.fill(); }, { blur: 5, y: 2 });
    D.roundRect(G.x.car - cw / 2, my - t / 2 - 8, cw, t + 16, 14); ctx.strokeStyle = '#6d28d9'; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(G.x.car - cw / 2 - (PHONE ? 16 : 22), my, PHONE ? 9 : 12, 6, 0, 0, TAU); ctx.fillStyle = '#ddd6fe'; ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(G.x.car + cw / 2 + (PHONE ? 16 : 22), my, PHONE ? 9 : 12, 6, 0, 0, TAU); ctx.fillStyle = '#ddd6fe'; ctx.fill(); ctx.stroke();
    T(G.x.car, my + t / 2 + 28, '전자 전달 단백질', PHONE ? 12 : 13, '#4c1d95', 'center', 800);
    if (th.pumpFx > 0.05) D.arrow(G.x.car, my - t / 2 - 10, G.x.car, my - t / 2 - 34, { color: '#ea580c', width: 3, head: 9, alpha: th.pumpFx });
    // NADP⁺ 환원 효소 (스트로마 쪽)
    const rw = PHONE ? 40 : 52; SH(() => { D.roundRect(G.x.red - rw / 2, my + t / 2 - 6, rw, 30, 10); ctx.fillStyle = '#fbcfe8'; ctx.fill(); }, { blur: 4, y: 2 }); D.roundRect(G.x.red - rw / 2, my + t / 2 - 6, rw, 30, 10); ctx.strokeStyle = '#be185d'; ctx.lineWidth = 2.5; ctx.stroke();
    T(G.x.red, my + t / 2 + 62, 'NADP⁺ 환원 효소', PHONE ? 12 : 13, '#9d174d', 'center', 800);
    if (th.e2 > 0) D.sphere(G.x.red, my + t / 2 + 9, 6.5, '#fde047', { gloss: false, text: 'e⁻', textColor: '#713f12', textScale: 0.95 });
    else T(G.x.red, my + t / 2 + 14, 'NADP⁺', PHONE ? 12 : 12, '#9d174d', 'center', 800);
  }
  function thEnergy(G, th, P, t, showGauge) {
    const E = G.E; panel(E.x, E.y, E.w, E.h, 16, '#fff');
    T(E.x + 14, E.y + 22, '전자의 에너지 (위쪽일수록 높아요)', PHONE ? 12.5 : 14.5, '#1f2d44', 'left', 800);
    D.arrow(E.x + 12, P.bot + 4, E.x + 12, P.top - 8, { color: '#94a3b8', width: 2.5, head: 9 });
    // 안내선: 에너지 칸 -> 막의 부품
    [G.x.p2, G.x.car, G.x.p1, G.x.red].forEach((x) => D.dashedLine(x, E.y + E.h - 2, x, G.M.y + 4, { color: '#cbd5e1', width: 1.5, dash: [3, 4] }));
    // 흐름 길 (비순환)
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(99,102,241,.22)'; ctx.lineWidth = 8; ctx.beginPath(); P.nc.forEach((p, i) => { if (i) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); }); ctx.stroke();
    ctx.strokeStyle = 'rgba(99,102,241,.55)'; ctx.lineWidth = 2; ctx.setLineDash([2, 5]); ctx.beginPath(); P.nc.forEach((p, i) => { if (i) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); }); ctx.stroke(); ctx.setLineDash([]);
    if (th.cyc || S.mode === 'cond') { ctx.strokeStyle = th.cyc ? 'rgba(168,85,247,.5)' : 'rgba(168,85,247,.18)'; ctx.lineWidth = th.cyc ? 5 : 3; ctx.setLineDash(th.cyc ? [] : [4, 5]); ctx.beginPath(); ctx.moveTo(P.X1.x, P.X1.y); ctx.quadraticCurveTo(P.X1.x - (P.X1.x - P.Q.x) * 0.2, P.Q.y - 4, P.Q.x, P.Q.y); ctx.quadraticCurveTo((P.Q.x + P.G1.x) / 2, P.Q.y + 10, P.G1.x, P.G1.y); ctx.stroke(); ctx.setLineDash([]); }
    ctx.restore();
    // 점
    const dot = (p, col) => { D.sphere(p.x, p.y, 4.5, col, { gloss: false }); };
    dot(P.W, '#38bdf8'); dot(P.G2, '#94a3b8'); dot(P.X2, '#f59e0b'); dot(P.C, '#8b5cf6'); dot(P.G1, '#94a3b8'); dot(P.X1, '#f59e0b'); dot(P.R, '#ec4899');
    const fs = PHONE ? 12 : 13;
    T(P.W.x, P.W.y + 20, '물(H₂O)', fs, '#0369a1', 'center', 800);
    T(P.X2.x + 8, P.X2.y - 11, '광계 Ⅱ 들뜸', fs, '#b45309', 'left', 800);
    T(P.C.x + 6, P.C.y - 12, '에너지 방출 · H⁺ 펌프', fs, '#6d28d9', 'left', 800);
    T(P.X1.x - 8, P.X1.y + 4, '광계 Ⅰ 들뜸', fs, '#b45309', 'right', 800);
    T(P.R.x + 8, P.R.y + 4, 'NADP⁺ → NADPH', fs, '#be185d', 'left', 800);
    // 광자
    th.flash.forEach((f) => {
      const p = f.w === 'X2' ? P.X2 : P.X1, lo = f.w === 'X2' ? P.G2 : P.G1, e = f.t, y = lo.y + (p.y - lo.y) * Math.min(1, e * 1.8);
      ctx.save(); ctx.globalAlpha = 1 - e * e; ctx.strokeStyle = '#facc15'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(p.x - 44 + e * 20, lo.y - 30 + e * 10); ctx.lineTo(p.x - 6, y); ctx.stroke();
      D.glow(p.x, y, 20 + e * 16, '#fde047', 0.7 * (1 - e)); ctx.restore();
      if (e < 0.7 && S.mode === 'water') T(p.x - 48, lo.y - 34, '광자', 12, '#a16207', 'left', 800, { alpha: 1 - e });
    });
    // 전자
    let newest = null;
    th.toks.forEach((tk) => {
      const q = tokPos(tk, P); tk.px = q.x; tk.py = q.y; newest = tk;
      const cyc = tk.k === 'cy'; blit(sprite(cyc ? 'ec' : 'en', 32, 32, (cx, D2) => { cx.translate(16, 16); D2.glow(0, 0, 14, cyc ? '#c084fc' : '#facc15', 0.6); D2.sphere(0, 0, 7.5, cyc ? '#e9d5ff' : '#fde047', { gloss: false, text: 'e⁻', textColor: cyc ? '#581c87' : '#713f12', textScale: 0.95 }); }), q.x, q.y);
    });
    if (showGauge) {
      const gx = E.x + E.w - 30, gy0 = P.top, gy1 = P.bot; D.roundRect(gx - 8, gy0, 16, gy1 - gy0, 8); ctx.fillStyle = '#eef2f7'; ctx.fill();
      const lv = newest ? clamp((P.bot - newest.py) / (P.bot - P.top), 0, 1) : 0, hh = (gy1 - gy0) * lv;
      if (hh > 1) { D.roundRect(gx - 8, gy1 - hh, 16, hh, 8); ctx.fillStyle = '#f59e0b'; ctx.fill(); }
      T(gx, gy1 + 17, '에너지', 11.5, '#64748b', 'center', 800);
    }
  }
  function thBody(G, th, t) {
    const my = G.memY, t2 = G.th, sc = G.sc;
    // 물 분해 부위: 물 2분자
    const wx = G.x.p2, wy = my - t2 / 2 - 36, f = 1 - th.wq * 0.2;
    ctx.save(); ctx.globalAlpha = th.treat === 'dry' ? 0.18 : 1;
    [-1, 1].forEach((s) => { const cx = wx + s * (PHONE ? 12 : 15), cy = wy; ctx.save(); ctx.translate(cx, cy); ctx.scale(f, f); D.sphere(0, 0, PHONE ? 6 : 7, '#ef4444', { gloss: false }); D.sphere(-6.5, 5, 3.6, '#fff', { gloss: false, outline: '#94a3b8', outlineWidth: 1 }); D.sphere(6.5, 5, 3.6, '#fff', { gloss: false, outline: '#94a3b8', outlineWidth: 1 }); ctx.restore(); });
    ctx.restore();
    if (th.treat === 'dry') T(wx, wy - 14, '물 부족', 12, '#b91c1c', 'center', 800, { stroke: 'rgba(255,253,247,.9)', strokeWidth: 3 });
    else T(wx, wy - (PHONE ? 15 : 17), 'H₂O ×2', PHONE ? 12 : 12, '#0369a1', 'center', 800, { stroke: 'rgba(255,253,247,.9)', strokeWidth: 3 });
    if (th.treat === 'dcmu') { D.sphere(G.x.p2 + G.pw / 2 - 2, my - t2 / 2 + 6, 13, '#dc2626', { gloss: false, text: '✖', textScale: 1 }); T(G.x.p2 + G.pw / 2 + 4, my + t2 / 2 + 46, '전달 차단', PHONE ? 12 : 12.5, '#b91c1c', 'left', 800); }
    // 시냅스 아닌 ATP 합성 효소
    synthDraw(G, th.spin, 'ATP 합성 효소');
    // H⁺ 점
    const sH = txtSprite('H1', 'H⁺', 11.5, '#c2410c', 800), sH2 = txtSprite('H2', 'H⁺', 12, '#ea580c', 800, 'rgba(255,253,247,.85)');
    th.dots.forEach((q) => blit(sH, q.x, q.y, Math.max(0, q.a)));
    th.flows.forEach((q) => blit(sH2, q.x, q.y, q.stage === 2 ? 1 - q.t : 1));
    th.strH.forEach((q) => blit(sH, q.x, q.y, 0.7));
    // O₂ 기포
    th.bubbles.forEach((b) => { if (b.t < 0) return; ctx.save(); ctx.globalAlpha = clamp((b.y - (G.M.y + 16)) / 24, 0, 1); D.sphere(b.x - 4, b.y, 5.5, '#38bdf8', { gloss: true }); D.sphere(b.x + 4, b.y, 5.5, '#38bdf8', { gloss: true }); T(b.x, b.y - 11, 'O₂', 11.5, '#0369a1', 'center', 800, { stroke: '#fff', strokeWidth: 3 }); ctx.restore(); });
    T(G.x.p2 + 14, G.M.y + 24, 'O₂는 기체로 방출 ↑', PHONE ? 12 : 12.5, '#0369a1', 'left', 800, { alpha: th.o2 > 0 ? 1 : 0.55 });
    // ATP · NADPH 생성물
    th.atpFly.forEach((q) => { const e = q.t, y0 = my + t2 / 2 + 44 * sc - 2, x = G.x.syn - 14 - e * (PHONE ? 100 : 150), y = y0 + q.lane * 12 + e * 8; ctx.save(); ctx.globalAlpha = 1 - e * e * e; pill(x, y, 40, 18, 'ATP', '#facc15', '#713f12'); ctx.restore(); });
    th.npFly.forEach((q) => { const e = q.t, x = G.x.red + 14 + e * (PHONE ? 60 : 90), y = my + t2 / 2 + 16 + q.lane * 13 + e * 8; ctx.save(); ctx.globalAlpha = 1 - e * e * e; pill(x, y, 54, 18, 'NADPH', '#f472b6', '#fff'); ctx.restore(); });
    T(G.str.x + G.str.w - 10, G.str.y + G.str.h - 10, 'ATP · NADPH → 탄소 고정 반응(다음 차시)', PHONE ? 12 : 12.5, '#3f6212', 'right', 800);
    // 칸 이름표 (맨 위에 그려요)
    const stk = { stroke: 'rgba(255,253,247,.92)', strokeWidth: 4 };
    T(G.lum.x + 12, G.lum.y + 17, '틸라코이드 내부 (pH ' + fx1(phL()) + ')', PHONE ? 12.5 : 14.5, '#9a5b12', 'left', 800, stk);
    T(G.str.x + 12, G.str.y + G.str.h - 10, '스트로마 (pH 8.0)', PHONE ? 12.5 : 14.5, '#3f6212', 'left', 800, stk);
    // 광계 이름표 안내 화살표 (H⁺ 이동 방향)
  }
  /* ----- 아래 칸 ----- */
  function tile(x, y, w, h, label, val, col, big) {
    D.roundRect(x, y, w, h, 10); ctx.fillStyle = C.rgba(col, 0.1); ctx.fill(); ctx.strokeStyle = C.rgba(col, 0.55); ctx.lineWidth = 1.5; ctx.stroke();
    T(x + w / 2, y + 16, label, PHONE ? 12 : 12.5, '#475569', 'center', 800);
    T(x + w / 2, y + h - 10, val, big || (PHONE ? 20 : 22), C.shade(col, -0.4), 'center', 800);
  }
  function waterPanel(G, th, t) {
    const B = G.B; panel(B.x, B.y, B.w, B.h, 16, '#fff');
    T(B.x + 14, B.y + 22, '물 분해: 2H₂O → O₂ + 4H⁺ + 4e⁻', PHONE ? 13 : 15, '#1f2d44', 'left', 800);
    // 전자 4개 칸
    const sx = B.x + 28, sy = B.y + (PHONE ? 66 : 66);
    T(B.x + 14, sy - 20, '물에서 보충한 전자', PHONE ? 12 : 12.5, '#475569', 'left', 800);
    for (let i = 0; i < 4; i++) { const x = sx + i * 40, on = i < th.wq; ctx.beginPath(); ctx.arc(x, sy, 15, 0, TAU); ctx.fillStyle = on ? '#fef08a' : '#f1f5f9'; ctx.fill(); ctx.strokeStyle = on ? '#ca8a04' : '#cbd5e1'; ctx.lineWidth = 2; ctx.setLineDash(on ? [] : [4, 3]); ctx.stroke(); ctx.setLineDash([]); if (on) T(x, sy + 5, 'e⁻', 13, '#713f12', 'center', 800); }
    T(sx + 4 * 40 + 6, sy + 5, th.wq + ' / 4', PHONE ? 16 : 18, '#1f2d44', 'left', 800);
    const r = B.x + (PHONE ? 14 : 296), ry = B.y + (PHONE ? 112 : 28), tw = PHONE ? 100 : 108, gap = 8, th2 = PHONE ? 56 : 62;
    tile(r, ry, tw, th2, '빛 펄스', th.pulses + '회', '#f59e0b'); tile(r + tw + gap, ry, tw, th2, '분해된 물', fi(th.o2 * 2) + '분자', '#0ea5e9'); tile(r + (tw + gap) * 2, ry, tw, th2, 'O₂ 방출', th.o2 + '분자', '#38bdf8');
    tile(r + (tw + gap) * 3, ry, tw, th2, PHONE ? '더해진 H⁺' : '내부에 더해진 H⁺', fi(th.H) + '개', '#f97316');
  }
  function atpPanel(G, th, t) {
    const B = G.B; panel(B.x, B.y, B.w, B.h, 16, '#fff');
    const pa = phL(), gg = gfrac();
    const bw = PHONE ? 210 : 250, bx = B.x + 16, by = B.y + 22;
    T(bx, by - 2, '틸라코이드 내부 [H⁺]', PHONE ? 12.5 : 14, '#334155', 'left', 800); T(bx + bw, by - 2, 'pH ' + fx1(pa), PHONE ? 14 : 16, '#1f2d44', 'right', 800);
    D.roundRect(bx, by + 6, bw, 16, 8); ctx.fillStyle = '#eef2f7'; ctx.fill(); D.roundRect(bx, by + 6, Math.max(8, bw * gg), 16, 8); ctx.fillStyle = '#f97316'; ctx.fill();
    const by2 = by + (PHONE ? 46 : 34);
    T(bx, by2 - 2, '스트로마 [H⁺]', PHONE ? 12.5 : 14, '#334155', 'left', 800); T(bx + bw, by2 - 2, 'pH 8.0', PHONE ? 14 : 16, '#1f2d44', 'right', 800);
    D.roundRect(bx, by2 + 6, bw, 16, 8); ctx.fillStyle = '#eef2f7'; ctx.fill(); D.roundRect(bx, by2 + 6, 8, 16, 8); ctx.fillStyle = '#eab308'; ctx.fill();
    T(bx, by2 + (PHONE ? 42 : 40), '막대 = (8 − pH) / 3 · 농도비 약 ' + ratioTxt() + '배', PHONE ? 12 : 12, '#94a3b8', 'left', 700);
    const tw = PHONE ? 104 : 108, gap = 8, th2 = PHONE ? 50 : 52, r = PHONE ? B.x + 240 : B.x + 296, ry = B.y + 12;
    const tl = [['분해된 물', fi(th.o2 * 2) + '분자', '#0ea5e9'], ['O₂ 방출', th.o2 + '분자', '#38bdf8'], ['NADPH', th.nadph + '개', '#ec4899'], ['ATP', th.atp + '개', '#f59e0b']];
    tl.forEach((q, k) => { if (PHONE) tile(r + (k % 2) * (tw + gap), ry + Math.floor(k / 2) * (th2 + 8), tw, th2, q[0], q[1], q[2]); else tile(r + k * (tw + gap), ry, tw, th2, q[0], q[1], q[2]); });
    const note = PHONE ? '모형: 전자 4개(물 2분자)마다 O₂ 1 · NADPH 2 · H⁺ 12개(물 4 + 펌프 8) → ATP 3 (H⁺ 4개당 ATP 1개)' : '모형: 전자 4개 → O₂ 1 · NADPH 2 · H⁺ 12개 → ATP 3 (H⁺ 4개당 ATP 1개)';
    if (PHONE) textBlock(B.x + 14, B.y + 138, 432, note, 12, '#475569', 16, 700); else textBlock(r, ry + th2 + 20, 4 * tw + 3 * gap, note, 12, '#475569', 16, 700);
  }
  function rateGraph(G, th) {
    const B = G.B; panel(B.x, B.y, B.w, B.h, 16, '#fff');
    const lg = PHONE ? 112 : 168, p = mkPlot({ x: B.x, y: B.y, w: B.w - lg, h: B.h }, { x0: 0, x1: 30, y0: 0, y1: 9, yt: [0, 3, 6, 9], xt: [0, 10, 20, 30], xfmt: (v) => (30 - v === 0 ? '지금' : '-' + (30 - v) + '초'), m: { l: 40, t: 28, r: 8, b: PHONE ? 34 : 32 } });
    drawAxes(p);
    T(B.x + 12, B.y + 20, '생성 속도 (개/초)', PHONE ? 12.5 : 14, '#1f2d44', 'left', 800);
    const cols = ['#f59e0b', '#ec4899', '#38bdf8'];
    for (let k = 0; k < 3; k++) {
      ctx.save(); ctx.beginPath(); ctx.rect(p.x, p.y - 2, p.w, p.h + 4); ctx.clip(); ctx.strokeStyle = cols[k]; ctx.lineWidth = 2.6; ctx.lineJoin = 'round'; ctx.beginPath();
      const n = th.hist.length; th.hist.forEach((h, i) => { const tt = 30 - (n - 1 - i) * 0.2, x = p.X(tt), y = p.Y(h[k]); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
      ctx.stroke(); ctx.restore();
    }
    const lx = B.x + B.w - lg + 10; [['ATP', th.rate.atp], ['NADPH', th.rate.np], ['O₂', th.rate.o2]].forEach((q, k) => { const y = B.y + 30 + k * (PHONE ? 52 : 28); ctx.fillStyle = cols[k]; ctx.fillRect(lx, y - 8, 14, 5); T(lx + 20, y, q[0], PHONE ? 12.5 : 13.5, '#334155', 'left', 800); T(lx + lg - 20, y + (PHONE ? 22 : 0), fx1(q[1]) + (PHONE ? ' /초' : ''), PHONE ? 15 : 16, '#1f2d44', 'right', 800); });
  }
  /* ----- 미토콘드리아와 비교 ----- */
  S.at = { view: 'meter' };
  function cmpPanel(P, kind, t) {
    const mito = kind === 'mito';
    panel(P.x, P.y, P.w, P.h, 18, '#fffdf7');
    T(P.x + P.w / 2, P.y + 26, mito ? '미토콘드리아 내막' : '엽록체 틸라코이드 막', PHONE ? 15 : 17, mito ? '#be185d' : '#15803d', 'center', 800);
    const my = P.y + P.h * 0.5, th = 22, tx0 = P.x + 10, tw = P.w - 20;
    const topY = P.y + 44, botY = my + th / 2 + 4;
    D.roundRect(tx0, topY, tw, my - th / 2 - 4 - topY, 12); ctx.fillStyle = 'rgba(251,208,150,.55)'; ctx.fill();
    D.roundRect(tx0, botY, tw, P.y + P.h - 10 - (PHONE ? 62 : 70) - botY, 12); ctx.fillStyle = mito ? '#fbeab0' : '#d9f0cb'; ctx.fill();
    ctx.fillStyle = 'rgba(244,114,182,.3)'; ctx.fillRect(tx0, my - th / 2, tw, th);
    for (let x = tx0 + 6; x < tx0 + tw - 4; x += 12) { D.sphere(x, my - th / 2 + 2, 4, '#f472b6', { gloss: false }); D.sphere(x, my + th / 2 - 2, 4, '#f472b6', { gloss: false }); }
    const fs = PHONE ? 12 : 13.5;
    T(tx0 + 10, topY + 20, mito ? '막 사이 공간 (H⁺ 많음, pH 약 7)' : '틸라코이드 내부 (H⁺ 많음, pH 약 5)', fs, '#9a5b12', 'left', 800);
    T(tx0 + 10, botY + 20, mito ? '기질 (pH 약 8)' : '스트로마 (pH 약 8)', fs, mito ? '#8a6410' : '#3f6212', 'left', 800);
    // 단백질 두 개와 H⁺ 펌프 화살표
    [0.2, 0.46].forEach((f) => { const cx = tx0 + tw * f; SH(() => { D.roundRect(cx - 24, my - th / 2 - 8, 48, th + 16, 12); ctx.fillStyle = '#a5b4fc'; ctx.fill(); }, { blur: 4, y: 2 }); D.roundRect(cx - 24, my - th / 2 - 8, 48, th + 16, 12); ctx.strokeStyle = '#4f46e5'; ctx.lineWidth = 2; ctx.stroke(); D.arrow(cx, my - th / 2 - 12, cx, my - th / 2 - 38, { color: '#ea580c', width: 3, head: 9 }); });
    T(tx0 + tw * 0.2 + 10, my - th / 2 - 30, 'H⁺ 펌프', fs, '#c2410c', 'left', 800);
    // ATP 합성 효소 + H⁺ 흐름 ↓
    const sx = tx0 + tw * 0.8, sc = PHONE ? 0.62 : 0.74;
    ctx.save(); ctx.translate(sx, my); ctx.fillStyle = 'rgba(253,230,138,.55)'; ctx.fillRect(-14 * sc, -th / 2 - 22 * sc, 28 * sc, th + 22 * sc); ctx.strokeStyle = '#a16207'; ctx.lineWidth = 2; ctx.strokeRect(-14 * sc, -th / 2 - 22 * sc, 28 * sc, th + 22 * sc); ctx.beginPath(); ctx.ellipse(0, 0, 30 * sc, th / 2 + 7 * sc, 0, 0, TAU); ctx.fillStyle = '#fde68a'; ctx.fill(); ctx.stroke(); ctx.save(); ctx.rotate(t * 3); for (let k = 0; k < 6; k++) { ctx.rotate(TAU / 6); ctx.fillStyle = k % 2 ? '#f59e0b' : '#d97706'; ctx.fillRect(4 * sc, -2.5 * sc, 20 * sc, 5 * sc); } ctx.restore(); ctx.fillStyle = '#d97706'; ctx.fillRect(-5 * sc, th / 2, 10 * sc, 20 * sc); ctx.restore();
    D.sphere(sx, my + th / 2 + 44 * sc, 22 * sc, '#fbbf24', { gloss: true, outline: '#a16207', outlineWidth: 1.5 });
    D.arrow(sx - 36 * sc, my - th / 2 - 34, sx - 36 * sc, my + th / 2 + 26, { color: '#16a34a', width: 3, head: 9 });
    T(sx - 40 * sc, my - th / 2 - 38, 'H⁺ 흐름', fs, '#15803d', 'right', 800);
    T(sx, my + th / 2 + 44 * sc + 34 * sc, 'ATP 합성 효소', fs, '#92400e', 'center', 800);
    pill(sx + 30 * sc, my + th / 2 + 44 * sc + 4, 44, 20, 'ATP', '#facc15', '#713f12');
    // H⁺ 점 (위 많음 · 아래 적음)
    for (let i = 0; i < 12; i++) { const hx = tx0 + 24 + ((i * 53 + (mito ? 7 : 21)) % (tw - 48)), hy = topY + 34 + ((i * 37) % Math.max(10, my - th / 2 - topY - 56)); T(hx + Math.sin(t * 1.5 + i) * 3, hy + Math.cos(t * 1.3 + i * 2) * 3, 'H⁺', 11, '#c2410c', 'center', 800, { alpha: 0.8 }); }
    for (let i = 0; i < 2; i++) T(tx0 + 60 + i * 120, botY + 40 + i * 6, 'H⁺', 11, '#c2410c', 'center', 800, { alpha: 0.6 });
    // 전자 정보
    const ey = P.y + P.h - (PHONE ? 50 : 56);
    D.roundRect(P.x + 12, ey, P.w - 24, PHONE ? 42 : 46, 10); ctx.fillStyle = mito ? 'rgba(244,114,182,.12)' : 'rgba(34,197,94,.12)'; ctx.fill();
    if (mito) { T(P.x + P.w / 2, ey + (PHONE ? 17 : 19), '전자: NADH → 전달계 → O₂ (→ H₂O)', fs, '#1f2d44', 'center', 800); T(P.x + P.w / 2, ey + (PHONE ? 34 : 38), 'H⁺ 펌프: 기질 → 막 사이 공간', fs, '#9a3412', 'center', 800); }
    else { T(P.x + P.w / 2, ey + (PHONE ? 17 : 19), '전자: 물 → 광계 Ⅱ → 광계 Ⅰ → NADP⁺', fs, '#1f2d44', 'center', 800); T(P.x + P.w / 2, ey + (PHONE ? 34 : 38), 'H⁺ 펌프: 스트로마 → 틸라코이드 내부', fs, '#9a3412', 'center', 800); }
  }
  function cmpDraw(dt, t) {
    const L = PHONE ? { x: 10, y: 10, w: 460, h: 306 } : { x: 14, y: 14, w: 382, h: 440 }, R = PHONE ? { x: 10, y: 324, w: 460, h: 306 } : { x: 404, y: 14, w: 382, h: 440 };
    cmpPanel(L, 'mito', t); cmpPanel(R, 'chl', t);
    if (!PHONE) { panel(14, 462, 772, 86, 16, '#fff'); T(26, 490, '두 막 모두 H⁺는 아래쪽(기질 · 스트로마)에서 위쪽으로 펌프되고, 위쪽에서 아래쪽으로 ATP 합성 효소를 지나 흘러요.', 14, '#1f2d44', 'left', 800); T(26, 516, '미토콘드리아: H⁺는 바깥쪽(막 사이 공간)에 쌓여요.  엽록체: H⁺는 틸라코이드 안쪽(내부)에 쌓여요.', 14, '#9a3412', 'left', 800); T(26, 538, '그림에서는 H⁺가 많은 쪽을 두 막 모두 위쪽에 그렸어요.', 12.5, '#64748b', 'left', 700); }
  }
  function thDraw(dt, t) {
    const G = thG(), th = S.th, P = thPts(); thUpdate(dt);
    thEnergy(G, th, P, t, S.mode === 'water');
    thMembrane(G, th);
    thBody(G, th, t);
    if (S.mode === 'water') waterPanel(G, th, t); else if (S.mode === 'atp') atpPanel(G, th, t); else rateGraph(G, th);
  }

  /* =========================================================
     화면 전환 · 조작 연결
     ========================================================= */
  function modeI() { return S.mode === 'atp' ? +$('#sL3').value : S.mode === 'cond' ? +$('#sL4').value : 0; }
  function setMode(m, keepState) {
    if (S.mode !== m) S.fade = 1; S.mode = m; hideHint();
    if (m !== 'abs') thReset({ I: m === 'atp' ? +$('#sL3').value : m === 'cond' ? +$('#sL4').value : 0, treat: 'none', cyc: false });
    if (m === 'atp') S.at.view = 'meter';
    updateCtl();
  }
  const ctlNodes = $$('#ctrlCard .control');
  S.wt = { src: null, srcOn: false }; S.at.calcOn = false;
  function updateCtl() {
    const fr = game ? game.free : false, lvNow = game ? game.level : 0, ab = S.ab, th = S.th;
    ctlNodes.forEach((n) => { n.hidden = (n.dataset.modes || '').split(' ').indexOf(S.mode) < 0; });
    $$('#ctrlCard [data-grp]').forEach((n) => { const k = n.dataset.grp; n.hidden = k === 'src' ? !(S.wt.srcOn || fr) : k === 'calc' ? !(S.at.calcOn || fr) : false; });
    modeButtons(S.mode, lvNow, fr);
    $('#oWl').textContent = ab.wl + ' nm'; $('#sWl').value = ab.wl; $('#abGo').disabled = !!ab.run;
    const cls = abClasses();
    $('#abNote').innerHTML = '측정한 구간: ' + chip3(cls.blue) + ' 청자색 ' + chip3(cls.green) + ' 녹색 ' + chip3(cls.red) + ' 적색';
    if (th) {
      $('#wtNote').innerHTML = '빛 펄스 <b>' + th.pulses + '회</b> · 물에서 나온 전자 <b>' + th.eW + '개</b> · O₂ <b>' + th.o2 + '분자</b>';
      $('#wtGo').disabled = th.toks.length > 24;
      chipSet($('#wtSrc'), S.wt.src);
      $('#oL3').textContent = $('#sL3').value; $('#oL4').textContent = $('#sL4').value;
      $$('#atView button').forEach((b) => b.classList.toggle('on', b.dataset.v === S.at.view));
      $('#atNote').innerHTML = '틸라코이드 내부 pH <b>' + fx1(phL()) + '</b> · ATP <b>' + th.atp + '</b>개 · NADPH <b>' + th.nadph + '</b>개';
      chipSet($('#cdTr'), th.treat);
      $$('#cdCyc button').forEach((b) => b.classList.toggle('on', (b.dataset.v === 'on') === th.cyc));
      $('#cdNote').innerHTML = th.treat === 'dry' ? '물이 모자라 광계 Ⅱ에 전자를 줄 수 없어요.' : th.treat === 'dcmu' ? '억제제가 광계 Ⅱ 뒤의 전자 전달을 막아요.' : th.cyc ? '광계 Ⅰ의 전자가 전달계로 되돌아와요.' : '모든 조건이 정상이에요.';
      ['cO2', 'cNp', 'cAt'].forEach((id, i) => $('#' + id).classList.toggle('ok', numIn(id) === [6, 12, 18][i]));
    }
  }
  bindModeSeg((m) => setMode(m));
  $('#sWl').addEventListener('input', (e) => { S.ab.wl = +e.target.value; updateCtl(); });
  $('#abGo').addEventListener('click', abGo);
  $('#wtGo').addEventListener('click', thPulse);
  $('#wtReset').addEventListener('click', () => { Sound.click(); thReset({ I: 0, treat: 'none', cyc: false }); });
  $$('#wtSrc button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.wt.src = b.dataset.v; updateCtl(); }));
  $('#sL3').addEventListener('input', (e) => { S.th.I = +e.target.value; S.thKeep.I = S.th.I; updateCtl(); });
  $('#sL4').addEventListener('input', (e) => { S.th.I = +e.target.value; S.thKeep.I = S.th.I; updateCtl(); });
  $$('#atView button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.at.view = b.dataset.v; updateCtl(); }));
  $('#atReset').addEventListener('click', () => { Sound.click(); thReset({ I: +$('#sL3').value }); });
  $$('#cdTr button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.th.treat = b.dataset.v; S.thKeep.treat = b.dataset.v; updateCtl(); }));
  $$('#cdCyc button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.th.cyc = b.dataset.v === 'on'; S.thKeep.cyc = S.th.cyc; updateCtl(); }));
  ['cO2', 'cNp', 'cAt'].forEach((id) => $('#' + id).addEventListener('input', updateCtl));
  function setLight(sel, v) { $(sel).value = v; S.th.I = v; S.thKeep.I = v; }

  /* =========================================================
     미션
     ========================================================= */
  const e440 = cnt20(440), e550 = cnt20(550), e675 = cnt20(675);
  const levels = [
    {
      title: '빛 흡수', short: '빛 흡수', icon: '🌈', phase: '모형',
      intro: '<p class="si-q">❓ 탐구 질문: 빛이 없으면 광합성이 멈추는 까닭은? 광합성의 산소는 어디서 올까?</p><p>🔗 <b>중학교에서</b> 식물이 빛에너지로 포도당을 만든다고 배웠고, <b>앞 차시</b>에서는 엽록체 <b>틸라코이드 막</b>에 광합성 색소가 모여 있다고 배웠어요. 광합성은 두 반응으로 나뉘어요. 틸라코이드 막에서 빛에너지를 ATP · NADPH의 화학 에너지로 바꾸는 <b>명반응</b>과, 스트로마에서 CO₂를 고정하는 <b>탄소 고정 반응</b>(다음 차시)이에요.</p><p>명반응의 시작은 <b>광계</b>(엽록소 같은 색소와 단백질이 모인 복합체)가 빛을 흡수하는 일이에요. 빛 알갱이(<b>광자</b>)가 색소에 닿으면 색소의 <b>전자</b>가 높은 에너지 준위로 올라가요(<b>들뜸</b>). 파장을 바꿔 가며 광자 20개씩 보내 보고, 어떤 빛이 전자를 많이 들뜨게 하는지 비교해요.</p>',
      features: ['abs'],
      setup() { setMode('abs'); },
      recap: '광계의 색소는 청자색과 적색 빛을 잘 흡수해 전자를 높은 에너지 준위로 올리고, 녹색 빛은 대부분 반사해요. 빛에너지가 전자의 에너지로 바뀌는 것이 명반응의 시작이에요.',
      summary: '<ul><li><b>명반응</b>은 엽록체의 <b>틸라코이드 막</b>에서 일어나요. 빛에너지가 <b>ATP · NADPH</b>의 화학 에너지로 바뀌고, <b>O₂</b>가 방출돼요.</li><li><b>광계</b>(색소 + 단백질)의 엽록소가 빛(광자)을 흡수하면 <b>전자가 높은 에너지 준위로 들떠요</b>. 이 들뜬 전자가 전자 전달계로 넘어가요.</li><li>가상 측정(광자 20개당 들뜬 전자): 440 nm(청자색) <b>' + e440 + '</b>개, 550 nm(녹색) <b>' + e550 + '</b>개, 675 nm(적색) <b>' + e675 + '</b>개. 청자색 · 적색 빛은 많이 흡수되고 녹색 빛은 대부분 반사돼요.</li></ul>',
      missions: [
        {
          id: 'wl3', title: '파장별 들뜸 비교',
          goal: '<b>청자색 · 녹색 · 적색</b> 빛을 각각 <b>광자 20개</b>씩 보내 들뜬 전자의 수를 기록하세요.',
          hint: '슬라이더로 파장을 고른 뒤 "광자 20개 보내기"를 눌러요. 청자색은 400~490 nm, 녹색은 520~570 nm, 적색은 620~700 nm예요. 기록이 끝날 때까지 기다려요.',
          setup() { setMode('abs'); abReset(); S.ab.wl = 450; updateCtl(); },
          check() { const c = abClasses(); return !!(c.blue && c.green && c.red); }, hold: 0.6,
          status() { const c = abClasses(); return chip3(c.blue) + ' 청자색 &nbsp; ' + chip3(c.green) + ' 녹색 &nbsp; ' + chip3(c.red) + ' 적색' + (S.ab.run ? ' &nbsp; (측정 중…)' : ''); },
          explain: '청자색(예: 440 nm)과 적색(예: 675 nm) 빛에서는 광자 20개 중 <b>많은 전자</b>가 들뜨고, 녹색(예: 550 nm) 빛은 <b>대부분 반사</b>돼 들뜸이 적어요. 그래서 잎이 초록색으로 보여요.',
        },
        {
          type: 'quiz', title: '빛이 하는 일',
          goal: '광계에서 빛(광자)이 하는 일로 옳은 것은?',
          setup() { setMode('abs'); },
          choices: ['엽록소의 전자를 더 높은 에너지 준위로 올린다', '엽록소의 전자를 더 낮은 에너지 준위로 내린다', '물을 이산화 탄소로 바꾼다', '엽록소를 포도당으로 바꾼다'],
          answer: 0,
          feedback: ['', '그림에서 전자는 빛을 받으면 위쪽 계단으로 올라갔어요.', '빛은 물을 이산화 탄소로 바꾸지 않아요. 물에서는 전자를 빼앗아 와요(다음 단계).', '포도당은 탄소 고정 반응에서 만들어져요.'],
          explain: '광합성에서 에너지의 입력은 <b>빛에너지</b>예요. 빛이 전자를 <b>높은 에너지 준위로 올리면</b>, 그 전자가 내려오며 내놓는 에너지로 ATP와 NADPH가 만들어져요.',
        },
      ],
    },
    {
      title: '물 분해', short: '물 분해', icon: '💧', phase: '모형',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 빛을 받은 광계의 전자가 높은 에너지 준위로 들떠 전자 전달계로 떠나는 것을 봤어요. 전자가 떠난 자리는 어떻게 채워질까요?</div><p>그림 위쪽 에너지 지도를 보세요. <b>광계 Ⅱ</b>에서 들뜬 전자는 <b>전자 전달 단백질</b>을 따라 에너지를 내놓으며 내려가요. 이 에너지로 <b>H⁺</b>가 스트로마에서 틸라코이드 <b>내부</b>로 펌프돼요. 이어서 <b>광계 Ⅰ</b>이 빛을 받아 전자를 다시 높이 올리고, 전자는 <b>NADP⁺</b>에 전달돼 <b>NADPH</b>가 돼요(환원).</p><p>광계 Ⅱ가 잃은 전자는 <b>물</b>이 채워 줘요. 이것이 <b>물의 광분해</b>예요: <b>2H₂O → O₂ + 4H⁺ + 4e⁻</b>. 빛 펄스를 한 번 보낼 때마다 전자 1개가 물에서 나와요.</p>',
      features: ['water'],
      setup() { setMode('water'); S.wt.srcOn = false; },
      recap: '광계 Ⅱ가 잃은 전자는 물의 광분해(2H₂O → O₂ + 4H⁺ + 4e⁻)로 채워져요. 이때 O₂가 방출되고 H⁺ 4개가 틸라코이드 내부에 더해져요. 광합성의 O₂는 물에서 나와요.',
      summary: '<ul><li>전자 이동: 물 → <b>광계 Ⅱ</b>(빛으로 들뜸) → <b>전자 전달계</b>(에너지 방출, H⁺ 펌프) → <b>광계 Ⅰ</b>(빛으로 다시 들뜸) → <b>NADP⁺</b>(NADPH로 환원).</li><li><b>물의 광분해</b>(광계 Ⅱ, 틸라코이드 내부 쪽): <b>2H₂O → O₂ + 4H⁺ + 4e⁻</b>. 전자 4개가 보충될 때 O₂ 1분자가 나오고 H⁺ 4개가 틸라코이드 내부에 더해져요.</li><li>광합성에서 방출되는 <b>O₂는 물에서</b> 나와요(CO₂가 아니에요). 이 사실은 마지막 차시에서 실험으로 확인해요.</li><li>전자 1개를 물에서 NADPH까지 보내려면 광계 두 곳에서 광자 2개가 필요해서, O₂ 1분자(전자 4개)당 광자 8개 이상이 필요해요.</li></ul>',
      missions: [
        {
          id: 'o2', title: '물 2분자를 분해해 O₂ 만들기',
          goal: '<b>☀ 빛 펄스</b>를 보내 물에서 <b>전자 4개</b>를 보충하고, 물 2분자를 분해해 <b>O₂ 1분자</b>를 방출시키세요.',
          hint: '버튼을 4번 눌러요(전자 1개가 지나가는 데 약 4초가 걸려요). 물에서 전자가 나올 때마다 위쪽 "물에서 보충한 전자" 칸이 하나씩 채워져요.',
          setup() { setMode('water'); S.wt.srcOn = false; S.wt.src = null; thReset({ I: 0, treat: 'none', cyc: false }); },
          check: () => S.th.eW >= 4 && S.th.o2 >= 1, hold: 0.5,
          status: () => mark(S.th.eW >= 4) + ' 물에서 나온 전자 ' + Math.min(4, S.th.eW) + ' / 4 &nbsp; ' + mark(S.th.o2 >= 1) + ' O₂ ' + S.th.o2 + ' / 1',
          explain: '전자 4개가 물에서 나오면 <b>물 2분자</b>가 분해돼요(2H₂O → O₂ + 4H⁺ + 4e⁻). O₂ 1분자는 기체로 방출되고, H⁺ 4개는 틸라코이드 <b>내부</b>에 더해져요.',
        },
        {
          id: 'src', title: '산소(O₂)의 출처', manual: true,
          goal: '그림을 보고 광합성에서 방출되는 <b>O₂는 어디에서 오는지</b> 골라 보세요.',
          hint: 'O₂ 기포가 올라온 곳은 물이 분해되는 자리였어요.',
          setup() { setMode('water'); S.wt.srcOn = true; updateCtl(); },
          check() { if (!S.wt.src) return '산소의 출처를 골라 주세요.'; if (S.wt.src === 'co2') return '그림에서 O₂ 기포가 나온 곳은 물이 분해되는 자리예요. 다시 생각해 보세요.'; return true; },
          explain: '광합성의 O₂는 <b>물</b>에서 나와요. 물이 분해되며 전자 · H⁺ · O₂가 생겨요. CO₂는 다음 차시에서 만나는 <b>탄소 고정 반응</b>에서 포도당의 탄소로 쓰여요.',
        },
        {
          type: 'quiz', title: '전자가 물에서 보충되는 까닭',
          goal: '광계 Ⅱ가 물에서 전자를 <b>보충받아야 하는 까닭</b>은?',
          setup() { setMode('water'); },
          choices: ['빛을 받아 전자를 내보내 전자가 부족해지기 때문이다', '물이 많을수록 빛을 더 많이 흡수하기 때문이다', 'CO₂가 전자를 주기 때문이다', 'ATP가 전자를 만들어 주기 때문이다'],
          answer: 0,
          feedback: ['', '물은 빛을 흡수하는 색소가 아니라 전자의 공급원이에요.', 'CO₂는 탄소 고정 반응의 재료예요.', 'ATP는 명반응의 산물이에요.'],
          explain: '광계 Ⅱ의 엽록소는 빛을 받아 전자를 <b>내보내기만</b> 하면 전자가 없어져요. 그래서 <b>물에서 전자를 계속 보충</b>해야 광합성이 이어져요. 빛이 없으면 이 과정이 멈춰요.',
        },
      ],
    },
    {
      title: 'ATP 생성', short: 'ATP 생성', icon: '🔋', phase: '모형',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 물이 분해되며 H⁺가 틸라코이드 내부에 더해지고, 전자가 전달계를 내려가며 H⁺를 내부로 펌프하는 것을 봤어요. 이 H⁺는 어디에 쓰일까요?</div><p>세포호흡의 <b>화학 삼투</b>를 떠올려 보세요. 틸라코이드 <b>내부</b>에 쌓인 H⁺가 농도 기울기를 따라 <b>ATP 합성 효소</b>를 지나 <b>스트로마</b>로 흘러나올 때 ADP + Pi → ATP가 합성돼요. 이것이 <b>광인산화</b>예요.</p><p>틸라코이드 내부 pH는 약 5, 스트로마는 약 8이라 H⁺ 농도가 <b>약 1000배</b> 차이 나요(호흡의 약 10배보다 커요). 전자는 NADP⁺에 도착해 <b>NADPH</b>를 만들어요. 포도당 1분자를 만들 때 명반응의 합계도 계산해 봐요.</p>',
      features: ['atp'],
      setup() { setMode('atp'); S.at.calcOn = false; },
      recap: '틸라코이드 내부에 쌓인 H⁺가 ATP 합성 효소를 지나 스트로마로 흐르며 ATP가 만들어져요(광인산화). 전자는 NADP⁺에 도착해 NADPH를 만들고, 물 12분자에서 O₂ 6, NADPH 12, ATP 18이 생겨요.',
      summary: '<ul><li><b>광인산화</b>(화학 삼투): 틸라코이드 <b>내부</b>의 H⁺가 ATP 합성 효소를 지나 <b>스트로마</b>로 흐르며 ATP가 스트로마 쪽에 합성돼요.</li><li>틸라코이드 내부 pH 약 <b>5</b>, 스트로마 약 <b>8</b> → H⁺ 농도 약 <b>1000배</b> 차(미토콘드리아는 약 10배 차). H⁺ 펌프 방향: <b>스트로마 → 틸라코이드 내부</b>(미토콘드리아는 기질 → 막 사이 공간).</li><li>전자는 광계 Ⅰ을 지나 <b>NADP⁺ → NADPH</b>(스트로마 쪽, 환원).</li><li>포도당 1분자를 만들 때 명반응 합계: <b>H₂O 12분자 분해 → O₂ 6분자, NADPH 12개, ATP 18개</b>. ATP와 NADPH는 탄소 고정 반응에서 쓰이고 O₂는 방출돼요.</li></ul>',
      missions: [
        {
          id: 'grad', title: 'H⁺ 기울기로 ATP 만들기',
          goal: '빛을 세게 해 틸라코이드 내부 pH를 <b>6.0 이하</b>로 만들고, <b>ATP 6개</b> 이상을 합성하세요.',
          hint: '빛 세기를 7 이상으로 올려요. 빛이 셀수록 전자가 많이 흘러 H⁺가 더 많이 쌓여요. H⁺가 합성 효소를 지나갈 때마다 ATP 합성 효소가 돌아요.',
          setup() { setMode('atp'); S.at.calcOn = false; thReset({ I: 5, treat: 'none', cyc: false }); setLight('#sL3', 5); updateCtl(); },
          check: () => +fx1(phL()) <= 6.0 && S.th.atp >= 6, hold: 1.0,
          status: () => mark(+fx1(phL()) <= 6.0) + ' 내부 pH ' + fx1(phL()) + ' (6.0 이하) &nbsp; ' + mark(S.th.atp >= 6) + ' ATP ' + S.th.atp + ' / 6',
          explain: '빛이 세지면 전자 흐름이 빨라져 H⁺가 틸라코이드 내부에 더 많이 쌓여요. 이 <b>H⁺ 농도 기울기</b>가 ATP 합성 효소를 돌려 ATP를 만들어요. 모형에서는 H⁺ 4개가 지나갈 때 ATP 1개가 만들어져요.',
        },
        {
          id: 'calc', title: '물 12분자에서 얻는 것', manual: true,
          goal: '전자 4개(물 2분자)마다 <b>O₂ 1 · NADPH 2 · ATP 3</b>이 만들어져요. <b>물 12분자</b>를 분해하면 O₂, NADPH, ATP는 각각 몇 개일까요?',
          hint: '12분자는 2분자의 6배예요. 아래 칸에 O₂ · NADPH · ATP를 차례로 써요.',
          setup() { setMode('atp'); S.at.calcOn = true; ['cO2', 'cNp', 'cAt'].forEach((id) => { $('#' + id).value = ''; }); updateCtl(); },
          check() {
            if (isNaN(numIn('cO2')) || isNaN(numIn('cNp')) || isNaN(numIn('cAt'))) return '세 칸을 모두 채워 주세요.';
            if (numIn('cO2') !== 6) return 'O₂는 물 2분자당 1분자예요. 12분자는 2분자의 6배예요.';
            if (numIn('cNp') !== 12) return 'NADPH는 물 2분자당 2개예요. 6배를 해 보세요.';
            if (numIn('cAt') !== 18) return 'ATP는 물 2분자당 3개예요. 6배를 해 보세요.';
            return true;
          },
          explain: '물 12분자 → 전자 24개 → <b>O₂ 6분자, NADPH 12개, ATP 18개</b>예요. 이 ATP 18과 NADPH 12는 다음 차시에서 포도당 1분자를 만들 때 쓰는 양과 같아요. O₂는 방출돼요.',
        },
        {
          type: 'quiz', title: '미토콘드리아와 방향 비교',
          goal: '<b>🔁 미토콘드리아와 비교</b> 화면을 보고 답하세요. H⁺가 쌓이는 곳이 바르게 짝지어진 것은?',
          setup() { setMode('atp'); S.at.calcOn = false; S.at.view = 'cmp'; updateCtl(); },
          choices: ['미토콘드리아: 막 사이 공간 / 엽록체: 틸라코이드 내부', '미토콘드리아: 기질 / 엽록체: 스트로마', '미토콘드리아: 막 사이 공간 / 엽록체: 스트로마', '미토콘드리아: 기질 / 엽록체: 틸라코이드 내부'],
          answer: 0,
          feedback: ['', '기질과 스트로마는 H⁺가 펌프되어 나온 쪽, 즉 H⁺가 적은 쪽이에요.', '엽록체에서는 틸라코이드 내부에 H⁺가 쌓여요.', '미토콘드리아에서는 막 사이 공간에 H⁺가 쌓여요.'],
          explain: 'H⁺는 미토콘드리아에서 <b>기질 → 막 사이 공간</b>으로, 엽록체에서 <b>스트로마 → 틸라코이드 내부</b>로 펌프돼요. 그리고 쌓인 H⁺가 ATP 합성 효소를 지나 기질 · 스트로마로 흐르며 ATP를 합성해요(화학 삼투).',
        },
      ],
    },
    {
      title: '조건 변화', short: '조건 변화', icon: '🎛', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 명반응이 빛에서 시작해 O₂, NADPH, ATP를 만든다는 것을 알았어요. 조건이 바뀌면 이 세 가지의 생성 속도는 어떻게 달라질까요?</div><p>빛 세기를 바꾸고, <b>물 부족</b>이나 전자 전달 <b>억제제</b>를 처리해 보면서 ATP · NADPH · O₂ 생성 속도 그래프를 관찰해요. 또 <b>순환적 전자 흐름</b>도 켜 봐요. 이 흐름에서는 광계 Ⅰ의 전자가 NADP⁺로 가지 않고 전자 전달계로 되돌아와 H⁺만 펌프해요. 그래서 <b>ATP만</b> 더 만들어져요(NADPH, O₂ 없음). 탄소 고정 반응에서 ATP가 더 필요할 때 보충하는 역할을 해요.</p>',
      features: ['cond'],
      setup() { setMode('cond'); },
      recap: '빛이 약해지면 명반응의 세 산물 모두 줄고, 빛이 없으면 멈춰요. 순환적 전자 흐름은 광계 Ⅰ의 전자가 되돌아와 ATP만 더 만들어요(NADPH, O₂ 없음).',
      summary: '<ul><li>빛이 약해지면 전자 흐름이 줄어 <b>ATP · NADPH · O₂</b> 생성 속도가 모두 줄어요. 빛이 없으면 O₂와 NADPH 생성이 바로 멈추고 ATP는 남은 H⁺가 빠져나가면 멈춰요.</li><li><b>물 부족</b>이나 <b>전자 전달 억제제</b>(광계 Ⅱ 뒤를 막음)는 광계 Ⅱ의 전자 흐름을 막아 O₂와 NADPH 생성이 멈춰요.</li><li><b>순환적 전자 흐름</b>: 광계 Ⅰ의 전자가 NADP⁺ 대신 전자 전달계로 되돌아옴 → H⁺ 펌프 → <b>ATP만</b> 추가 생성(NADPH, O₂ 없음).</li><li>명반응 장소: <b>틸라코이드 막</b>. 산물: ATP, NADPH(스트로마의 탄소 고정 반응으로), O₂(방출).</li></ul>',
      missions: [
        {
          id: 'dark', title: '빛을 끄면?',
          goal: '<b>빛 세기를 0</b>으로 내리고, ATP · NADPH · O₂ 생성 속도가 모두 <b>0.0</b>이 되는 것을 확인하세요.',
          hint: '슬라이더를 0으로 내려요. O₂와 NADPH는 먼저 멈추고, ATP는 남은 H⁺가 빠져나가는 몇 초 뒤에 멈춰요. 그래프가 바닥에 닿을 때까지 기다려요.',
          setup() { setMode('cond'); thReset({ I: 6, treat: 'none', cyc: false }); setLight('#sL4', 6); updateCtl(); },
          check: () => S.th.I === 0 && +fx1(S.th.rate.atp) === 0 && +fx1(S.th.rate.np) === 0 && +fx1(S.th.rate.o2) === 0, hold: 1.0,
          status: () => mark(S.th.I === 0) + ' 빛 ' + S.th.I + ' &nbsp; ' + mark(+fx1(S.th.rate.atp) === 0 && +fx1(S.th.rate.np) === 0 && +fx1(S.th.rate.o2) === 0) + ' ATP ' + fx1(S.th.rate.atp) + ' · NADPH ' + fx1(S.th.rate.np) + ' · O₂ ' + fx1(S.th.rate.o2) + ' (개/초)',
          explain: '빛이 없으면 광계가 전자를 들뜨게 하지 못해 <b>전자 흐름이 멈춰요</b>. 그러면 물 분해(O₂)와 NADPH 생성이 멈추고, H⁺ 펌프도 멈춰 쌓인 H⁺가 빠져나간 뒤에는 ATP 합성도 멈춰요.',
        },
        {
          id: 'cycle', title: 'ATP만 만들어지는 상태',
          goal: '<b>물 부족</b>이나 <b>억제제</b>를 처리하고 <b>순환적 전자 흐름을 켠</b> 채, 빛 세기 3 이상에서 <b>ATP만</b> 생성되는 상태를 2초 유지하세요.',
          hint: '먼저 빛 세기를 3 이상으로 하고, 처리에서 물 부족이나 억제제를 눌러요. 그 다음 순환적 전자 흐름을 "켬"으로 바꿔요. NADPH와 O₂는 0.0이 돼야 해요.',
          setup() { setMode('cond'); thReset({ I: 6, treat: 'none', cyc: false }); setLight('#sL4', 6); updateCtl(); },
          check: () => S.th.treat !== 'none' && S.th.cyc && S.th.I >= 3 && +fx1(S.th.rate.atp) >= 0.5 && +fx1(S.th.rate.np) === 0 && +fx1(S.th.rate.o2) === 0, hold: 2.0,
          status: () => mark(S.th.treat !== 'none') + ' 처리 &nbsp; ' + mark(S.th.cyc) + ' 순환 켬 &nbsp; ' + mark(S.th.I >= 3) + ' 빛 ' + S.th.I + ' &nbsp; ' + mark(+fx1(S.th.rate.atp) >= 0.5 && +fx1(S.th.rate.np) === 0 && +fx1(S.th.rate.o2) === 0) + ' ATP ' + fx1(S.th.rate.atp) + ' · NADPH ' + fx1(S.th.rate.np) + ' · O₂ ' + fx1(S.th.rate.o2),
          explain: '물 부족이나 억제제로 광계 Ⅱ의 전자 흐름이 막히면 O₂와 NADPH 생성이 멈춰요. 그래도 <b>순환적 전자 흐름</b>은 광계 Ⅰ에서 전자가 돌며 H⁺를 펌프하므로 <b>ATP만</b> 만들어져요.',
        },
        {
          type: 'quiz', title: '순환적 전자 흐름의 산물',
          goal: '<b>순환적 전자 흐름</b>에서 만들어지지 <b>않는</b> 것은?',
          setup() { setMode('cond'); },
          choices: ['ATP', 'NADPH와 O₂', 'H⁺ 농도 기울기', 'ATP와 H⁺ 농도 기울기'],
          answer: 1,
          feedback: ['순환적 전자 흐름에서도 H⁺가 펌프돼 ATP가 만들어져요.', '', 'H⁺ 펌프로 기울기가 만들어져요.', '둘 다 만들어져요. 만들어지지 않는 것을 골라야 해요.'],
          explain: '순환적 전자 흐름에서는 전자가 NADP⁺로 가지 않으므로 <b>NADPH</b>가 생기지 않고, 물을 분해하지 않으므로 <b>O₂</b>도 생기지 않아요. H⁺가 펌프되므로 <b>ATP</b>만 더 생겨요.',
        },
      ],
    },
  ];

  thInit({ I: 0 });
  abReset();
  game = SciSim.game({
    simId: 'hy-light-reaction', mount: '#game', badge: '명반응 탐험가', homeHref: '../../index.html#hy',
    featureLabels: { abs: '🌈 파장별 빛 흡수 실험', water: '💧 물 분해와 전자 전달', atp: '🔋 H⁺ 기울기와 ATP 합성', cond: '🎛 조건에 따른 생성 속도' },
    onFeatures() { updateCtl(); },
    levels,
  });

  function readouts() {
    const m = S.mode, th = S.th, ab = S.ab;
    if (m === 'abs') { const run = ab.run, la = ab.last; setReads(['빛의 파장', ab.wl + ' nm ' + bandOf(ab.wl).name, '들뜬 전자 (광자 20개 중)', run ? run.ex + ' / 20' : (la ? la.ex + ' / 20 (' + la.wl + ' nm)' : '—'), '반사된 광자', run ? String(run.rf) : (la ? String(la.rf) : '—')]); }
    else if (m === 'water') setReads(['빛 펄스', th.pulses + '회', '분해된 물 · O₂', fi(th.o2 * 2) + '분자 · ' + th.o2 + '분자', '내부에 쌓인 H⁺', th.H + '개']);
    else if (m === 'atp') setReads(['내부 pH', fx1(phL()), 'ATP · NADPH', th.atp + ' · ' + th.nadph, 'O₂ 방출', th.o2 + '분자']);
    else setReads(['ATP 생성 속도', fx1(th.rate.atp) + ' /초', 'NADPH 생성 속도', fx1(th.rate.np) + ' /초', 'O₂ 생성 속도', fx1(th.rate.o2) + ' /초']);
  }

  setMode('abs');
  let lastFree = false, lastLv = -1, uiT = 0;
  SciSim.loop((dt, t) => {
    clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (game && game.level !== lastLv) { lastLv = game.level; updateCtl(); }
    view.apply(); FX.update(dt); ctx.clearRect(0, 0, VW, VH);
    bgFill('#f3f6ee', '#e8eee2');
    updLater(dt);
    if (S.mode === 'abs') abDraw(dt, t); else if (S.mode === 'atp' && S.at.view === 'cmp') { cmpDraw(dt, t); } else thDraw(dt, t);
    FX.draw(); parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(241,246,243,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : approach(S.fade, 0, dt, 9); }
    uiT += dt; if (uiT > 0.25) { uiT = 0; updateCtl(); }
    readouts();
  });

  window.__sim = { S, VW, VH, PHONE, get game() { return game; }, levels, setMode, abGo, abReset, thPulse, thReset, setLight, updateCtl, phL, cnt20, ABSF };
})();
