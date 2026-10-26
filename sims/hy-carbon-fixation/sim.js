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
     고등학교 세포와 물질대사 · Ⅲ. 세포호흡과 광합성 - 탄소 고정 반응 (단원 58, 8차시)
     성취기준 [12세포03-06] (뒷부분: 탄소 고정 반응의 특징과 두 반응의 상호 관계)
     ① 모형: 캘빈 회로  ② 분석: 필요량 계산  ③ 모형: 두 반응 연결  ④ 예측: 조건 예측
     (유기물의 구조식은 다루지 않고 탄소 구슬(●)과 이름표 RuBP · 3PG · G3P만 써요)
     ========================================================= */
  const S = { mode: 'cal', fade: 0 };
  let game = null;
  const fi = (v) => String(Math.round(v));
  const fx1 = (v) => (Math.round(v * 10) / 10).toFixed(1);
  const D2R = Math.PI / 180;
  function pill(x, y, w, h, text, bg, fg, a) {
    ctx.save(); ctx.globalAlpha = a == null ? 1 : a; D.roundRect(x - w / 2, y - h / 2, w, h, h / 2); ctx.fillStyle = bg; ctx.fill(); ctx.strokeStyle = 'rgba(15,23,42,.28)'; ctx.lineWidth = 1; ctx.stroke();
    T(x, y + h * 0.33, text, h * 0.68, fg, 'center', 800); ctx.restore();
  }
  const COL = { atp: ['#facc15', '#713f12'], nadph: ['#f472b6', '#fff'], adp: ['#bfdbfe', '#1e3a8a'], nadp: ['#fbcfe8', '#831843'] };
  const ang = (c, R, deg) => ({ x: c.x + R * Math.cos(deg * D2R), y: c.y + R * Math.sin(deg * D2R) });

  /* ---------- 탄소 구슬 분자 ---------- */
  const BEADS = {
    5: [0, 1, 2, 3, 4].map((k) => ({ x: Math.cos((-90 + 72 * k) * D2R) * 12.5, y: Math.sin((-90 + 72 * k) * D2R) * 12.5 })),
    6: [0, 1, 2, 3, 4, 5].map((k) => ({ x: Math.cos((-90 + 60 * k) * D2R) * 13, y: Math.sin((-90 + 60 * k) * D2R) * 13 })),
    3: [0, 1, 2].map((k) => ({ x: Math.cos((-90 + 120 * k) * D2R) * 10, y: Math.sin((-90 + 120 * k) * D2R) * 10 })),
    1: [{ x: 0, y: 0 }],
  };
  const KIND = { R: { n: 5, name: 'RuBP' }, X: { n: 6, name: '6탄소' }, P: { n: 3, name: '3PG' }, G: { n: 3, name: 'G3P' }, O: { n: 3, name: 'G3P' }, C: { n: 1, name: 'CO₂' } };
  function drawMol(m, sc) {
    const k = KIND[m.k], pts = BEADS[k.n], s = (sc || 1) * (1 + m.pop * 0.18), r = 5.3 * (sc || 1);
    ctx.save(); ctx.translate(m.x, m.y); ctx.scale(s, s); ctx.globalAlpha = clamp(m.a, 0, 1);
    if (m.pop > 0.05) D.glow(0, 0, 30, '#fde047', m.pop * 0.8);
    if (k.n > 1) {
      ctx.strokeStyle = 'rgba(71,85,105,.5)'; ctx.lineWidth = 2.2; ctx.beginPath(); pts.forEach((p, i) => { if (i) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); }); ctx.closePath(); ctx.stroke();
      if (m.k === 'G' || m.k === 'O') { ctx.fillStyle = 'rgba(244,114,182,.18)'; ctx.fill(); }
    }
    pts.forEach((p, i) => { const teal = m.k === 'C' || (m.teal && (m.teal === true || m.teal[i])); D.sphere(p.x, p.y, r, teal ? '#14b8a6' : '#475569', { gloss: true }); });
    ctx.restore();
    if (m.k === 'C') { const x = m.x, y = m.y; ctx.save(); ctx.globalAlpha = clamp(m.a, 0, 1); D.sphere(x - 11, y + 2, 4.5, '#ef4444', { gloss: false }); D.sphere(x + 11, y + 2, 4.5, '#ef4444', { gloss: false }); ctx.restore(); }
  }
  const molLabel = (m) => (m.k === 'C' ? 'CO₂' : KIND[m.k].name);

  /* ---------- 물질 흐름표 (ATP · NADPH 알갱이 날리기) ---------- */
  function flyDraw(list) {
    list.forEach((f) => {
      if (f.t < 0) return; const e = SciSim.ease.inOutSine(clamp(f.t, 0, 1)), x = f.sx + (f.tx - f.sx) * e, y = f.sy + (f.ty - f.sy) * e - Math.sin(e * Math.PI) * (f.arc || 0);
      f.x = x; f.y = y; const a = f.fade ? clamp(1 - (f.t - 0.6) / 0.4, 0, 1) : 1; pill(x, y, f.w || 50, 19, f.label, f.bg, f.fg, a);
    });
  }
  function flyUpdate(list, dt) {
    for (let i = list.length - 1; i >= 0; i--) {
      const f = list[i]; f.t += dt / f.dur; if (f.t < 0) continue;
      if (f.t >= 1) { list.splice(i, 1); if (f.arrive) f.arrive(f); }
    }
  }
  const mkFly = (sx, sy, tx, ty, label, c, o) => Object.assign({ sx, sy, tx, ty, label, bg: c[0], fg: c[1], t: 0, dur: 0.8, w: label.length > 4 ? 62 : 46 }, o || {});

  /* ---------- 대사 모형: 명반응(ATP · NADPH 공급)과 탄소 고정 반응(소비) ---------- */
  const PM = { pN: 0.5, pA: 0.75, a: 1.5, b: 2.2, k: 0.12 };
  const sat = (x) => x / (x + 0.1);
  function poolStep(st, L, C, E, W, dt) {
    const pn = PM.pN * (L / 10) * W * (1 - st.N), pa = PM.pA * (L / 10) * W * (1 - st.A);
    const v1 = PM.a * E * (C / 10) * st.R, q = PM.b * E * sat(st.N) * sat(st.A) * st.P;
    st.N = clamp(st.N + (pn - 2 * PM.k * q) * dt, 0, 1); st.A = clamp(st.A + (pa - 3 * PM.k * q) * dt, 0, 1);
    st.R = clamp(st.R + (q - v1) * dt, 0, 1); st.P = 1 - st.R;
    return { pn, pa, v1, q };
  }
  function poolSteady(L, C) { const st = { A: 0.5, N: 0.5, R: 0.4, P: 0.6 }; for (let i = 0; i < 1200; i++) poolStep(st, L, C, 1, 1, 0.05); return st; }

  /* =========================================================
     ① 캘빈 회로: 탄소 구슬 따라가기
     ========================================================= */
  S.cv = null;
  function calG() {
    const P = PHONE ? { x: 10, y: 10, w: 460, h: 376 } : { x: 14, y: 14, w: 498, h: 534 };
    const Q = PHONE ? { x: 10, y: 394, w: 460, h: 236 } : { x: 520, y: 14, w: 266, h: 534 };
    const c = { x: P.x + P.w / 2, y: P.y + P.h / 2 + (PHONE ? 10 : 12) }, R = PHONE ? 100 : 148;
    return { P, Q, c, R, sc: PHONE ? 0.82 : 1, st: { fix: ang(c, R, -90), red: ang(c, R, 30), reg: ang(c, R, 150) }, S0: { x: P.x + (PHONE ? 30 : 42), y: c.y + (PHONE ? 10 : 36) }, CO0: { x: P.x + (PHONE ? 34 : 50), y: P.y + (PHONE ? 38 : 50) }, OUT: { x: P.x + P.w - (PHONE ? 44 : 56), y: c.y + (PHONE ? 100 : 140) } };
  }
  function poolSlot(g, kind, k) {
    const sp = { R: [196, 252], P: [292, 348], G: [62, 118] }[kind], col = k % 3, row = Math.floor(k / 3);
    return ang(g.c, g.R + (row ? 25 : -25) * (PHONE ? 0.85 : 1), sp[0] + col * (sp[1] - sp[0]) / 2);
  }
  function cvNew(k, x, y, o) { const m = Object.assign({ k, x, y, tx: x, ty: y, a: 0, pop: 0, pos: 'free', slot: -1, teal: null }, o || {}); S.cv.mols.push(m); return m; }
  function cvDel(m) { const i = S.cv.mols.indexOf(m); if (i >= 0) S.cv.mols.splice(i, 1); }
  function cvPool(kind) { return S.cv.mols.filter((m) => m.k === kind && m.pos === 'pool').sort((a, b) => a.slot - b.slot); }
  function cvPlace(m, kind) { const used = cvPool(kind).map((q) => q.slot); let s = 0; while (used.indexOf(s) >= 0) s++; m.slot = s; m.pos = 'pool'; }
  function cvReset() {
    clearLater(); FX.clear(); parts.clear();
    const g = calG(); S.cv = { mols: [], fly: [], fixed: 0, busy: false, phase: 'fix', atp: 0, nadph: 0, outG: 0, done: false, run: (S.cv ? S.cv.run : 0) + 1, pulse: 0 };
    for (let i = 0; i < 3; i++) { const p = poolSlot(g, 'R', i); const m = cvNew('R', p.x, p.y); m.a = 1; cvPlace(m, 'R'); }
    updateCtl();
  }
  const cvCount = (k) => S.cv.mols.filter((m) => m.k === k).length;
  function cvGo() {
    const cv = S.cv; if (cv.busy) return;
    if (cv.phase === 'fix') cvFix(); else if (cv.phase === 'reduce') cvReduce(); else if (cv.phase === 'regen') cvRegen(); else cvReset();
    updateCtl();
  }
  function cvFix() {
    const cv = S.cv, g = calG(), run = cv.run; if (cv.fixed >= 3) return; cv.busy = true; cv.fixed++;
    const r = cvPool('R')[0]; r.pos = 'free'; r.tx = g.st.fix.x - 16; r.ty = g.st.fix.y + 8;
    const c = cvNew('C', g.CO0.x, g.CO0.y); c.tx = g.st.fix.x + 24; c.ty = g.st.fix.y - 4; Sound.tick();
    after(RM ? 0.05 : 1.2, () => {
      if (cv.run !== run) return;
      cvDel(r); cvDel(c); const x = cvNew('X', g.st.fix.x, g.st.fix.y, { a: 1, teal: [false, false, false, false, false, true], pop: 1 }); x.pos = 'free'; Sound.click();
      parts.burst(x.x, x.y, { count: 10, colors: ['#14b8a6', '#fde047', '#fff'], speed: 90, life: 0.6, gravity: 0 });
      after(RM ? 0.05 : 1.0, () => {
        if (cv.run !== run) return;
        cvDel(x);
        const p1 = cvNew('P', x.x - 12, x.y, { a: 1, teal: [false, false, true], pop: 1 }), p2 = cvNew('P', x.x + 12, x.y, { a: 1, teal: null, pop: 1 }); cvPlace(p1, 'P'); cvPlace(p2, 'P'); Sound.success();
        after(RM ? 0.05 : 0.9, () => { if (cv.run !== run) return; cv.busy = false; if (cv.fixed >= 3) cv.phase = 'reduce'; updateCtl(); });
      });
    });
  }
  function cvReduce() {
    const cv = S.cv, g = calG(), run = cv.run; cv.busy = true;
    const ps = cvPool('P'); let left = ps.length * 2;
    ps.forEach((p, i) => {
      const d = RM ? 0 : i * 0.22;
      [['ATP', COL.atp, 0, -14], ['NADPH', COL.nadph, 0, 14]].forEach(([nm, col, ox, oy], j) => {
        cv.fly.push(mkFly(g.S0.x, g.S0.y + (j ? 16 : -16), p.tx + ox + 24, p.ty + oy, nm, col, { t: -d / 0.9, dur: 0.9, arc: 24, arrive() {
          if (cv.run !== run) return;
          if (nm === 'ATP') cv.atp++; else cv.nadph++;
          const back = nm === 'ATP' ? ['ADP+Pi', COL.adp] : ['NADP⁺', COL.nadp];
          cv.fly.push(mkFly(p.tx + 24, p.ty + (j ? 14 : -14), g.S0.x, g.S0.y + (j ? 16 : -16), back[0], back[1], { dur: 1.1, fade: true, arc: -20 }));
          if (j === 1) { p.k = 'G'; p.pop = 1; Sound.tick(); }
          left--; if (left === 0) { cv.busy = false; cv.phase = 'regen'; updateCtl(); }
        } }));
      });
    });
  }
  function cvRegen() {
    const cv = S.cv, g = calG(), run = cv.run; cv.busy = true;
    const gs = cvPool('G'), out = gs[gs.length - 1], rest = gs.slice(0, gs.length - 1);
    out.pos = 'free'; out.teal = true; out.tx = g.OUT.x; out.ty = g.OUT.y; out.pop = 1;
    after(RM ? 0.05 : 1.4, () => { if (cv.run !== run) return; out.k = 'O'; cv.outG = 1; Sound.success(); parts.burst(out.x, out.y, { count: 14, colors: ['#14b8a6', '#fde047', '#f472b6'], speed: 110, life: 0.8 }); });
    rest.forEach((m, i) => { m.pos = 'free'; m.tx = g.st.reg.x + (i - 2) * 11; m.ty = g.st.reg.y + (i % 2 ? 14 : -10); });
    for (let j = 0; j < 3; j++) {
      cv.fly.push(mkFly(g.S0.x, g.S0.y + 4 * j, g.st.reg.x - 30 + 12 * j, g.st.reg.y - 30, 'ATP', COL.atp, { t: -(RM ? 0 : 0.5 + j * 0.25) / 0.9, dur: 0.9, arc: 18, arrive() {
        if (cv.run !== run) return; cv.atp++;
        cv.fly.push(mkFly(g.st.reg.x - 30 + 12 * j, g.st.reg.y - 30, g.S0.x, g.S0.y + 4 * j, 'ADP+Pi', COL.adp, { dur: 1.1, fade: true, arc: -18 }));
      } }));
    }
    after(RM ? 0.05 : 2.4, () => {
      if (cv.run !== run) return;
      rest.forEach((m) => cvDel(m));
      for (let i = 0; i < 3; i++) { const r = cvNew('R', g.st.reg.x + (i - 1) * 16, g.st.reg.y, { a: 1, pop: 1 }); cvPlace(r, 'R'); }
      Sound.success(); parts.burst(g.st.reg.x, g.st.reg.y, { count: 12, colors: ['#22c55e', '#fde047', '#fff'], speed: 90, life: 0.7, gravity: 0 });
      after(RM ? 0.05 : 1.0, () => { if (cv.run !== run) return; cv.busy = false; cv.phase = 'done'; cv.done = true; updateCtl(); });
    });
  }
  function cvUpdate(dt) {
    const cv = S.cv, g = calG();
    cv.mols.forEach((m) => {
      if (m.pos === 'pool') { const p = poolSlot(g, m.k === 'O' ? 'G' : m.k, m.slot); m.tx = p.x; m.ty = p.y; }
      m.x = RM ? m.tx : approach(m.x, m.tx, dt, 5); m.y = RM ? m.ty : approach(m.y, m.ty, dt, 5); m.a = approach(m.a, 1, dt, 6); m.pop = Math.max(0, m.pop - dt * 1.6);
    });
    flyUpdate(cv.fly, dt);
  }
  function ledger(g, cv) {
    const Q = g.Q, n = { R: cvCount('R'), X: cvCount('X'), P: cvCount('P'), G: cvCount('G'), O: cvCount('O'), C: cvCount('C') };
    panel(Q.x, Q.y, Q.w, Q.h, 18, '#fff');
    T(Q.x + 14, Q.y + 26, '탄소 구슬 장부', PHONE ? 15 : 17, '#1f2d44', 'left', 800);
    const rows = [['5탄소 화합물 (RuBP)', n.R, 5], ['6탄소 중간체', n.X, 6], ['3탄소 화합물 (3PG)', n.P, 3], ['3탄소 당 (G3P)', n.G, 3], ['회로 밖으로 나간 G3P', n.O, 3], ['CO₂ (구슬 1개)', n.C, 1]];
    const y0 = Q.y + (PHONE ? 40 : 50), rh = PHONE ? 23 : 34; let sum = 0;
    rows.forEach((r, i) => {
      const y = y0 + i * rh; sum += r[1] * r[2];
      if (i % 2 === 0) { D.roundRect(Q.x + 8, y - (PHONE ? 4 : 6), Q.w - 16, rh - 2, 8); ctx.fillStyle = 'rgba(148,163,184,.12)'; ctx.fill(); }
      TF(Q.x + 14, y + (PHONE ? 13 : 16), r[0], PHONE ? 200 : 138, 13.5, 10.5, '#334155', 'left', 800);
      T(Q.x + Q.w - 14, y + (PHONE ? 13 : 16), r[1] + ' × ' + r[2] + ' = ' + (r[1] * r[2]), PHONE ? 13.5 : 14.5, r[1] ? '#1f2d44' : '#94a3b8', 'right', 800);
    });
    const ys = y0 + rows.length * rh + (PHONE ? 4 : 6);
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(Q.x + 12, ys - 4); ctx.lineTo(Q.x + Q.w - 12, ys - 4); ctx.stroke();
    T(Q.x + 14, ys + (PHONE ? 14 : 18), '탄소 구슬 합계', PHONE ? 14 : 15, '#1f2d44', 'left', 800); T(Q.x + Q.w - 14, ys + (PHONE ? 14 : 18), fi(sum) + '개', PHONE ? 16 : 19, '#0f766e', 'right', 800);
    const yu = ys + (PHONE ? 30 : 42);
    T(Q.x + 14, yu + (PHONE ? 10 : 14), '쓴 ATP', PHONE ? 13.5 : 14.5, '#854d0e', 'left', 800); T(Q.x + Q.w / 2 - 8, yu + (PHONE ? 10 : 14), cv.atp + '개', PHONE ? 15 : 17, '#1f2d44', 'right', 800);
    T(Q.x + Q.w / 2 + 6, yu + (PHONE ? 10 : 14), '쓴 NADPH', PHONE ? 13.5 : 14.5, '#9d174d', 'left', 800); T(Q.x + Q.w - 14, yu + (PHONE ? 10 : 14), cv.nadph + '개', PHONE ? 15 : 17, '#1f2d44', 'right', 800);
    if (!PHONE) {
      const yl = yu + 44; D.sphere(Q.x + 20, yl, 6, '#475569', { gloss: true }); T(Q.x + 32, yl + 5, '탄소 구슬', 13, '#475569', 'left', 700); D.sphere(Q.x + 116, yl, 6, '#14b8a6', { gloss: true }); T(Q.x + 128, yl + 5, 'CO₂에서 온 탄소', 13, '#0f766e', 'left', 700);
      textBlock(Q.x + 14, yl + 36, Q.w - 28, '구슬은 사라지거나 새로 생기지 않아요. 합계는 늘 15 + (들어온 CO₂)예요.', 12.5, '#64748b', 17, 700);
    }
  }
  function calDraw(dt, t) {
    const g = calG(), cv = S.cv; cvUpdate(dt);
    const P = g.P; panel(P.x, P.y, P.w, P.h, 18, '#f4fbef');
    T(P.x + 14, P.y + 24, '스트로마의 캘빈 회로', PHONE ? 14 : 16, '#3f6212', 'left', 800);
    // 회로 길과 방향 화살표
    ctx.save(); ctx.strokeStyle = 'rgba(100,116,139,.45)'; ctx.lineWidth = 3; ctx.setLineDash([8, 7]); ctx.lineDashOffset = RM ? 0 : -t * 14; ctx.beginPath(); ctx.arc(g.c.x, g.c.y, g.R, 0, TAU); ctx.stroke(); ctx.setLineDash([]); ctx.restore();
    [-30, 90, 210].forEach((d) => { const p = ang(g.c, g.R, d), a = (d + 90) * D2R; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(a); ctx.fillStyle = 'rgba(71,85,105,.75)'; ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(9, 7); ctx.lineTo(-9, 7); ctx.closePath(); ctx.fill(); ctx.restore(); });
    // 단계 표지
    const stn = [['fix', '① 고정', 0, -34], ['red', '② 환원', 58, 2], ['reg', '③ 재생', 0, 32]];
    stn.forEach(([k, label, ox, oy]) => { const p = g.st[k]; D.sphere(p.x, p.y, 9, k === 'fix' ? '#14b8a6' : k === 'red' ? '#ec4899' : '#22c55e', { gloss: true }); pill(p.x + ox, p.y + oy, 62, 22, label, '#1f2d44', '#fff'); });
    if (!PHONE) { T(g.st.fix.x + 36, g.st.fix.y - 56, '루비스코(RuBisCO)', 13, '#0f766e', 'left', 800); }
    else T(g.st.fix.x + 4, g.st.fix.y - 52, '루비스코', 12, '#0f766e', 'left', 800);
    // 풀 이름
    const pl = [['5탄소 RuBP', 224, 'R', 60], ['3탄소 3PG', 320, 'P', 60], ['3탄소 G3P', 90, 'G', 64]];
    pl.forEach(([lab, deg, k, off]) => { const p = ang(g.c, g.R + off * (PHONE ? 0.85 : 1) + (k === 'G' ? 0 : 0), deg); T(p.x, p.y + 4, lab, PHONE ? 12.5 : 14, '#475569', 'center', 800); });
    // 명반응 공급원 · 출구 · CO₂ 입구
    D.roundRect(P.x + 6, g.S0.y - 40, PHONE ? 54 : 70, 88, 12); ctx.fillStyle = 'rgba(134,239,172,.35)'; ctx.fill(); ctx.strokeStyle = '#16a34a'; ctx.lineWidth = 2; ctx.stroke();
    T(P.x + 6 + (PHONE ? 27 : 35), g.S0.y - 22, PHONE ? '명반응' : '명반응', PHONE ? 12 : 13, '#166534', 'center', 800); T(P.x + 6 + (PHONE ? 27 : 35), g.S0.y - 6, '공급', PHONE ? 12 : 13, '#166534', 'center', 800);
    T(P.x + 6 + (PHONE ? 27 : 35), g.S0.y + 40, 'ATP·NADPH', PHONE ? 9.5 : 10.5, '#166534', 'center', 800);
    D.arrow(g.CO0.x + 22, g.CO0.y, g.CO0.x + 52, g.CO0.y, { color: '#0f766e', width: 2.5, head: 8 }); T(g.CO0.x - 22, g.CO0.y + 5, 'CO₂ 입구', PHONE ? 12 : 13, '#0f766e', 'left', 800);
    T(g.OUT.x, g.OUT.y + 40, PHONE ? '포도당 등' : '포도당·녹말·설탕', PHONE ? 12 : 12.5, '#9d174d', 'center', 800); T(g.OUT.x, g.OUT.y + 56, '합성(동화)', PHONE ? 12 : 12.5, '#9d174d', 'center', 800);
    D.roundRect(g.OUT.x - 28, g.OUT.y - 26, 56, 52, 12); ctx.strokeStyle = 'rgba(190,24,93,.5)'; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.stroke(); ctx.setLineDash([]);
    // 분자와 알갱이
    cv.mols.forEach((m) => { drawMol(m, g.sc); });
    cv.mols.forEach((m) => { if (m.pos === 'pool' && m.a > 0.5 && (m.slot === 1 || m.slot === 4) && m.k !== 'O') T(m.x, m.y + 24 * g.sc, molLabel(m), 11.5, '#64748b', 'center', 800); if (m.k === 'C') T(m.x, m.y - 14, 'CO₂', 12, '#0f766e', 'center', 800); if (m.k === 'X') T(m.x, m.y + 26, '6탄소 중간체', 12, '#0f766e', 'center', 800); if (m.k === 'O' && m.a > 0.5) T(m.x, m.y + 22, 'G3P', 11.5, '#9d174d', 'center', 800); });
    flyDraw(cv.fly);
    ledger(g, cv);
  }

  /* =========================================================
     ② 필요량 계산: 표와 천칭
     ========================================================= */
  S.nd = { n: 3, tilt: 0, balT: 0, calcOn: false, cmp: '' };
  const NVALS = [3, 6, 9, 12];
  const needRow = (n) => ({ n, atp: 3 * n, nadph: 2 * n, g3p: n / 3, glc: n / 6 });
  const SUP = { atp: 18, nadph: 12, o2: 6, water: 12 };
  function ndG() {
    return PHONE ? { T: { x: 10, y: 10, w: 460, h: 218 }, B: { x: 10, y: 236, w: 460, h: 394 } } : { T: { x: 14, y: 14, w: 772, h: 214 }, B: { x: 14, y: 236, w: 772, h: 312 } };
  }
  function blocks(x, y, w, nA, nN, maxCols) {
    const s = PHONE ? 9 : 10, gp = 2.2, cols = maxCols || 10; let i = 0;
    for (let k = 0; k < nA + nN; k++) { const col = i % cols, row = Math.floor(i / cols), isA = k < nA; D.roundRect(x + col * (s + gp), y - row * (s + gp), s, s, 2); ctx.fillStyle = isA ? '#facc15' : '#f472b6'; ctx.fill(); ctx.strokeStyle = isA ? '#a16207' : '#be185d'; ctx.lineWidth = 0.8; ctx.stroke(); i++; }
  }
  function needDraw(dt, t) {
    const g = ndG(), nd = S.nd, row = needRow(nd.n); const Tt = g.T, Bb = g.B;
    panel(Tt.x, Tt.y, Tt.w, Tt.h, 18, '#fff');
    T(Tt.x + 14, Tt.y + 26, PHONE ? 'CO₂ 1분자(회전 1회) = ATP 3 + NADPH 2' : '회로 1회전(CO₂ 1분자 고정)마다: ATP 3개(환원 2 + 재생 1) · NADPH 2개(환원)', PHONE ? 13.5 : 15, '#1f2d44', 'left', 800);
    const cols = PHONE ? [['CO₂ (= 회전 수)', 108], ['ATP', 62], ['NADPH', 78], ['순생산 G3P', 98], ['포도당', 62]] : [['CO₂ 분자 수 (= 회전 수)', 190], ['ATP', 110], ['NADPH', 120], ['순생산 G3P', 170], ['포도당', 140]];
    const x0 = Tt.x + 12, y0 = Tt.y + 44, rh = PHONE ? 30 : 33; let cx = x0;
    cols.forEach(([nm, w]) => { D.roundRect(cx, y0, w - 3, 28, 7); ctx.fillStyle = '#e2e8f0'; ctx.fill(); TF(cx + (w - 3) / 2, y0 + 19, nm, w - 8, PHONE ? 12.5 : 14, 10.5, '#334155', 'center', 800); cx += w; });
    NVALS.forEach((n, i) => {
      const r = needRow(n), y = y0 + 32 + i * rh, on = n === nd.n; cx = x0; const tot = cols.reduce((a, c) => a + c[1], 0) - 3;
      if (on) { D.roundRect(x0, y, tot, rh - 2, 8); ctx.fillStyle = 'rgba(250,204,21,.28)'; ctx.fill(); ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 2.5; ctx.stroke(); }
      const vals = [fi(r.n), fi(r.atp), fi(r.nadph), fi(r.g3p), r.glc === 0.5 ? '0.5' : r.glc === 1.5 ? '1.5' : fi(r.glc)];
      vals.forEach((v, k) => { T(cx + (cols[k][1] - 3) / 2, y + rh * 0.66, v, PHONE ? 16 : 18, on ? '#1f2d44' : '#64748b', 'center', 800); cx += cols[k][1]; });
    });
    // 천칭
    panel(Bb.x, Bb.y, Bb.w, Bb.h, 18, '#fff');
    const cxm = Bb.x + Bb.w / 2, py = Bb.y + (PHONE ? 150 : 128), bl = PHONE ? 128 : 230;
    const target = clamp((SUP.atp + SUP.nadph - 5 * nd.n) / 30, -1, 1) * 11; nd.tilt = RM ? target : approach(nd.tilt, target, dt, 4);
    const a = nd.tilt * D2R;
    // 받침대
    ctx.fillStyle = '#94a3b8'; ctx.beginPath(); ctx.moveTo(cxm, py); ctx.lineTo(cxm - 26, Bb.y + Bb.h - 22); ctx.lineTo(cxm + 26, Bb.y + Bb.h - 22); ctx.closePath(); ctx.fill(); D.roundRect(cxm - 56, Bb.y + Bb.h - 24, 112, 12, 6); ctx.fillStyle = '#64748b'; ctx.fill();
    const lx = cxm - Math.cos(a) * bl, ly = py - Math.sin(a) * bl, rx = cxm + Math.cos(a) * bl, ry = py + Math.sin(a) * bl;
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(rx, ry); ctx.stroke();
    D.sphere(cxm, py, 10, '#f59e0b', { gloss: true });
    const pan = (x, y, label, sub, nA, nN, col) => {
      ctx.strokeStyle = '#64748b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 60, y + 56); ctx.moveTo(x, y); ctx.lineTo(x + 60, y + 56); ctx.stroke();
      D.roundRect(x - 66, y + 54, 132, 8, 4); ctx.fillStyle = '#94a3b8'; ctx.fill();
      blocks(x - 54, y + 46, 108, nA, nN, 10);
      T(x, y - 52, label, PHONE ? 13.5 : 14.5, col, 'center', 800); T(x, y - 34, sub, PHONE ? 12 : 13, '#475569', 'center', 700);
    };
    if (PHONE) { pan(lx, ly, '명반응이 공급', '물 12분자: ATP 18 · NADPH 12', SUP.atp, SUP.nadph, '#166534'); pan(rx, ry, '탄소 고정이 써요', 'CO₂ ' + nd.n + ': ATP ' + row.atp + ' · NADPH ' + row.nadph, row.atp, row.nadph, '#9d174d'); }
    else { pan(lx, ly, '명반응이 공급해요', '물 12분자 → ATP 18 · NADPH 12', SUP.atp, SUP.nadph, '#166534'); pan(rx, ry, '탄소 고정 반응이 써요', 'CO₂ ' + nd.n + '분자 → ATP ' + row.atp + ' · NADPH ' + row.nadph, row.atp, row.nadph, '#9d174d'); }
    const bal = nd.n === 6;
    if (bal) { D.glow(cxm, py - 6, 70, '#fde047', 0.5 + 0.2 * Math.sin(t * 5)); pill(cxm, Bb.y + 52, PHONE ? 160 : 180, 28, '수지가 딱 맞아요 ✓', '#16a34a', '#fff'); }
    else T(cxm, Bb.y + 54, row.atp + row.nadph > SUP.atp + SUP.nadph ? '필요한 양이 더 많아요' : '공급이 남아요', PHONE ? 14 : 15.5, '#b45309', 'center', 800);
    T(Bb.x + 14, Bb.y + Bb.h - 26, '노란 칸 = ATP 1개 · 분홍 칸 = NADPH 1개', PHONE ? 12 : 13, '#64748b', 'left', 700);
    T(Bb.x + Bb.w - 14, Bb.y + 24, nd.n === 6 ? '포도당 1분자 = 6 CO₂' : 'CO₂ ' + nd.n + '분자 = 포도당 ' + (nd.n / 6 === 0.5 ? '1/2' : nd.n / 6 === 1.5 ? '3/2' : fi(nd.n / 6)) + '분자', PHONE ? 13 : 14.5, '#0f766e', 'right', 800);
  }

  /* =========================================================
     ③ 두 반응 연결: 엽록체 전체도
     ========================================================= */
  S.lk = null;
  function lkG() {
    if (PHONE) return {
      ENV: { x: 10, y: 94, w: 460, h: 250 }, TH: { x: 24, y: 150, w: 118, h: 150 }, CV: { x: 360, y: 238 }, rr: 46, ay: [196, 272], ax: [150, 312],
      box: { A: { x: 152, y: 150, w: 140, h: 40 }, B: { x: 152, y: 278, w: 140, h: 40 }, C: { x: 296, y: 24, w: 124, h: 38 }, D: { x: 60, y: 24, w: 96, h: 38 } },
      tray: (i) => ({ x: 10 + (i % 2) * 234, y: 352 + Math.floor(i / 2) * 46 }), cw: 226, ch: 40, G: { x: 10, y: 450, w: 460, h: 180 }, light: { x: 40, y: 56 },
    };
    return {
      ENV: { x: 14, y: 72, w: 772, h: 306 }, TH: { x: 36, y: 162, w: 236, h: 160 }, CV: { x: 616, y: 254 }, rr: 62, ay: [224, 288], ax: [278, 548],
      box: { A: { x: 330, y: 172, w: 170, h: 44 }, B: { x: 330, y: 300, w: 170, h: 44 }, C: { x: 556, y: 18, w: 120, h: 42 }, D: { x: 110, y: 18, w: 96, h: 42 } },
      tray: (i) => ({ x: 14 + i * 195, y: 388 }), cw: 186, ch: 46, G: { x: 14, y: 446, w: 772, h: 102 }, light: { x: 44, y: 44 },
    };
  }
  const LKC = [
    { id: 'c1', label: 'ATP · NADPH', short: 'ATP · NADPH', icon: '', col: '#16a34a', ans: 'A' },
    { id: 'c2', label: 'ADP + Pi · NADP⁺', short: 'ADP·Pi · NADP⁺', icon: '', col: '#2563eb', ans: 'B' },
    { id: 'c3', label: 'CO₂', short: 'CO₂', icon: '', col: '#0f766e', ans: 'C' },
    { id: 'c4', label: 'O₂', short: 'O₂', icon: '', col: '#0284c7', ans: 'D' },
  ];
  function lkBuild() {
    const g = lkG(), boxes = ['A', 'B', 'C', 'D'].map((id) => Object.assign({ id, col: { A: '#16a34a', B: '#2563eb', C: '#0f766e', D: '#0284c7' }[id], cols: 1, hdr: 4 }, g.box[id]));
    const so = new Sorter({ cards: LKC, boxes, tray: g.tray, cw: g.cw, ch: g.ch, kh: g.ch - 8, onChange() { lkSingle(); S.lk.pick = null; updateCtl(); }, onTap(c) { S.lk.pick = S.lk.pick === c ? null : c; Sound.tick(); }, isSel: (c) => S.lk && S.lk.pick === c });
    so.cards.forEach((c, i) => { c.ans = LKC[i].ans; });
    return so;
  }
  function lkSingle() {
    const so = S.lk.so; let moved = false;
    so.boxes.forEach((b) => { const mem = so.cards.filter((c) => c.zone === b.id).sort((a, c) => a.seq - c.seq); while (mem.length > 1) { const c = mem.shift(); c.zone = null; moved = true; } });
    if (moved) so.layout();
  }
  function lkInit(L0, C0, keepSo) {
    const L = L0 != null ? L0 : (S.lk ? S.lk.L : 6), C = C0 != null ? C0 : (S.lk ? S.lk.C : 6), st = poolSteady(L, C), oldSo = S.lk && keepSo ? S.lk.so : null;
    S.lk = { L, C, st: { A: st.A, N: st.N, R: st.R, P: st.P }, rate: { pn: 0, q: 0 }, fwd: [], bwd: [], ph: [], o2: [], co2: [], acc: 0, pick: null, so: oldSo, spin: 0 };
    if (!oldSo) { S.lk.so = lkBuild(); S.lk.so.layout(true); }
  }
  const lkWrong = () => S.lk.so.cards.filter((c) => c.zone && c.zone !== c.ans);
  const lkPT = {
    down(p) { const so = S.lk.so; if (so.down(p)) return true; if (S.lk.pick) { const bx = so.boxAt(p); if (bx) { const c = S.lk.pick; S.lk.pick = null; so.place(c, bx.id); } } return false; },
    move(p) { S.lk.so.move(p); }, up(p) { S.lk.so.up(p); }, hover(p) { return S.lk.so.hover(p); },
  };
  function lkUpdate(dt) {
    const lk = S.lk, g = lkG(), st = lk.st;
    const r = poolStep(st, lk.L, lk.C, 1, 1, dt); lk.rate = r;
    lk.spin += dt * (0.4 + r.q * 6);
    lk.acc += r.q * 4 * dt;
    while (lk.acc >= 1) {
      lk.acc -= 1; const y1 = g.ay[0], y0 = g.ax[0];
      if (lk.fwd.length < 14) { lk.fwd.push(mkFly(g.ax[0], y1 - 8, g.ax[1], y1 - 8, 'ATP', COL.atp, { dur: 1.5, w: 42, arrive: lkArrive })); lk.fwd.push(mkFly(g.ax[0], y1 + 12, g.ax[1], y1 + 12, 'NADPH', COL.nadph, { dur: 1.5, w: 56, arrive: lkArrive })); }
    }
    flyUpdate(lk.fwd, dt); flyUpdate(lk.bwd, dt);
    // 빛 · O₂ · CO₂ 장식 입자
    const pnr = r.pn; lk.phT = (lk.phT || 0) - dt; if (lk.L > 0 && lk.phT <= 0) { lk.phT = 1 / (0.5 + lk.L * 0.5); lk.ph.push({ t: 0 }); }
    lk.o2T = (lk.o2T || 0) - dt; if (pnr > 0.02 && lk.o2T <= 0) { lk.o2T = 0.6 / (pnr * 6 + 0.3); lk.o2.push({ t: 0, x: g.TH.x + 40 + Math.random() * (g.TH.w - 80) }); }
    lk.coT = (lk.coT || 0) - dt; if (r.v1 > 0.02 && lk.coT <= 0) { lk.coT = 0.7 / (r.v1 * 3 + 0.2); lk.co2.push({ t: 0 }); }
    [lk.ph, lk.o2, lk.co2].forEach((arr) => { for (let i = arr.length - 1; i >= 0; i--) { arr[i].t += dt / 1.4; if (arr[i].t >= 1) arr.splice(i, 1); } });
    lk.so.update(dt);
  }
  function lkArrive(f) {
    const lk = S.lk, g = lkG(); if (!lk || (f.label !== 'ATP' && f.label !== 'NADPH')) return;
    const back = f.label === 'ATP' ? ['ADP+Pi', COL.adp] : ['NADP⁺', COL.nadp], yb = g.ay[1] + (f.label === 'ATP' ? -8 : 12);
    lk.bwd.push(mkFly(g.ax[1], yb, g.ax[0], yb, back[0], back[1], { dur: 1.5, w: back[0].length > 4 ? 58 : 52 }));
  }
  function thyl(x, y, w, h) {
    const nst = 3, sw = w / nst;
    for (let s = 0; s < nst; s++) for (let k = 0; k < 5; k++) { const dx = x + s * sw + 6, dy = y + 12 + k * (h - 24) / 5; D.roundRect(dx, dy, sw - 14, (h - 24) / 5 - 4, 6); ctx.fillStyle = '#86efac'; ctx.fill(); ctx.strokeStyle = '#15803d'; ctx.lineWidth = 1.5; ctx.stroke(); }
  }
  function lkDraw(dt, t) {
    const g = lkG(), lk = S.lk; lkUpdate(dt);
    panel(g.ENV.x, g.ENV.y, g.ENV.w, g.ENV.h, 28, '#f1fae9'); D.roundRect(g.ENV.x + 6, g.ENV.y + 6, g.ENV.w - 12, g.ENV.h - 12, 24); ctx.strokeStyle = 'rgba(22,163,74,.45)'; ctx.lineWidth = 2; ctx.stroke();
    T(g.ENV.x + g.ENV.w - 18, g.ENV.y + g.ENV.h - 16, PHONE ? '엽록체 (바탕: 스트로마)' : '엽록체 · 바탕은 스트로마', PHONE ? 12.5 : 14, '#3f6212', 'right', 800);
    // 틸라코이드
    thyl(g.TH.x, g.TH.y, g.TH.w, g.TH.h);
    T(g.TH.x + g.TH.w / 2, g.TH.y + g.TH.h + 22, PHONE ? '틸라코이드 (명반응)' : '틸라코이드 막 (명반응)', PHONE ? 12.5 : 14, '#166534', 'center', 800);
    // 캘빈 회로 아이콘
    const cc = g.CV, rr = g.rr; ctx.save(); ctx.strokeStyle = 'rgba(100,116,139,.5)'; ctx.lineWidth = 3; ctx.setLineDash([7, 6]); ctx.lineDashOffset = -lk.spin * 6; ctx.beginPath(); ctx.arc(cc.x, cc.y, rr, 0, TAU); ctx.stroke(); ctx.setLineDash([]); ctx.restore();
    for (let k = 0; k < 3; k++) { const a = lk.spin * 0.8 + k * TAU / 3, p = { x: cc.x + Math.cos(a) * rr, y: cc.y + Math.sin(a) * rr }; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(a + Math.PI / 2); ctx.fillStyle = 'rgba(71,85,105,.8)'; ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(8, 6); ctx.lineTo(-8, 6); ctx.closePath(); ctx.fill(); ctx.restore(); }
    T(cc.x, cc.y - 2, '캘빈 회로', PHONE ? 13 : 15, '#334155', 'center', 800); T(cc.x, cc.y + 17, '(탄소 고정 반응)', PHONE ? 12 : 12.5, '#475569', 'center', 700);
    // 화살표 (A: 틸라코이드 → 캘빈 회로, B: 반대)
    const arr = (y, x1, x2, col) => D.arrow(x1, y, x2, y, { color: col, width: 3.5, head: 12, alpha: 0.5 });
    arr(g.ay[0], g.ax[0], g.ax[1], '#16a34a'); arr(g.ay[1], g.ax[1], g.ax[0], '#2563eb');
    // 입구/출구 화살표
    D.arrow(g.box.C.x + g.box.C.w / 2, g.box.C.y + g.box.C.h + 2, cc.x + (PHONE ? 4 : 0), cc.y - rr - 8, { color: '#0f766e', width: 3.5, head: 12, alpha: 0.55 });
    D.arrow(g.TH.x + g.TH.w * 0.45, g.TH.y - 2, g.box.D.x + g.box.D.w / 2, g.box.D.y + g.box.D.h + 2, { color: '#0284c7', width: 3.5, head: 12, alpha: 0.55 });
    // 빛
    D.glow(g.light.x, g.light.y, 40, '#fde047', 0.5); E('☀', g.light.x, g.light.y + 2, PHONE ? 30 : 36); T(g.light.x + (PHONE ? 26 : 32), g.light.y + 6, '빛', PHONE ? 13 : 14.5, '#a16207', 'left', 800);
    lk.ph.forEach((q) => { const e = q.t, x = g.light.x + 22 + (g.TH.x + 40 - g.light.x - 22) * e, y = g.light.y + 20 + (g.TH.y + 14 - g.light.y - 20) * e; ctx.save(); ctx.globalAlpha = 1 - e * e; D.glow(x, y, 12, '#fde047', 0.8); D.sphere(x, y, 3.8, '#fde047', { gloss: false }); ctx.restore(); });
    lk.o2.forEach((q) => { const e = q.t, sx = g.TH.x + g.TH.w * 0.45, sy = g.TH.y - 2, ex = g.box.D.x + g.box.D.w / 2, ey = g.box.D.y + g.box.D.h + 2, x = sx + (ex - sx) * e, y = sy + (ey - sy) * e; ctx.save(); ctx.globalAlpha = Math.sin(e * Math.PI); D.sphere(x - 4, y, 4.5, '#38bdf8', { gloss: true }); D.sphere(x + 4, y, 4.5, '#38bdf8', { gloss: true }); ctx.restore(); });
    lk.co2.forEach((q) => { const e = q.t, x = g.box.C.x + g.box.C.w / 2 + (cc.x - (g.box.C.x + g.box.C.w / 2)) * e, y = g.box.C.y + g.box.C.h + (cc.y - rr - 8 - g.box.C.y - g.box.C.h) * e; ctx.save(); ctx.globalAlpha = Math.sin(e * Math.PI) * 0.95; D.sphere(x, y, 5, '#14b8a6', { gloss: true }); D.sphere(x - 8, y + 5, 3.4, '#ef4444', { gloss: false }); D.sphere(x + 8, y + 5, 3.4, '#ef4444', { gloss: false }); ctx.restore(); });
    flyDraw(lk.fwd); flyDraw(lk.bwd);
    // 칸 (카드를 놓는 곳)
    lk.so.drawBoxes();
    ['A', 'B', 'C', 'D'].forEach((id) => { const b = g.box[id]; if (!lk.so.cards.some((c) => c.zone === id)) T(b.x + b.w / 2, b.y + b.h / 2 + 5, id === 'A' ? '→ 무엇이 건너갈까?' : id === 'B' ? '← 무엇이 돌아올까?' : id === 'C' ? 'CO₂ 들어오는 곳' : 'O₂ 나가는 곳', PHONE ? 12 : 13, '#475569', 'center', 800); });
    lk.so.drawCards();
    // 게이지
    const G = g.G; panel(G.x, G.y, G.w, G.h, 16, '#fff');
    const st = lk.st, bars = [['ATP 저장량', st.A, '#f59e0b'], ['NADPH 저장량', st.N, '#ec4899'], ['NADP⁺ 남은 양 (명반응 재료)', 1 - st.N, '#2563eb']];
    const bx = G.x + 16, bw = PHONE ? G.w - 32 - 70 : 420;
    bars.forEach((b, i) => { const y = G.y + (PHONE ? 22 : 24) + i * (PHONE ? 38 : 26); TF(bx, y, b[0], PHONE ? 170 : 220, PHONE ? 13 : 14, 11, '#334155', 'left', 800); const x0 = bx + (PHONE ? 176 : 232), w = bw - (PHONE ? 176 : 232) - 4; D.roundRect(x0, y - 11, w, 14, 7); ctx.fillStyle = '#eef2f7'; ctx.fill(); if (b[1] > 0.004) { D.roundRect(x0, y - 11, Math.max(10, w * b[1]), 14, 7); ctx.fillStyle = b[2]; ctx.fill(); } T(x0 + w + 8, y, fi(b[1] * 100) + ' %', PHONE ? 13 : 14, '#1f2d44', 'left', 800); });
    const sp1 = fi(clamp(lk.rate.pn / PM.pN, 0, 1) * 100), sp2 = fi(clamp(lk.rate.q * 2 * PM.k / PM.pN, 0, 1) * 100);
    if (!PHONE) { const rx = G.x + 480; T(rx, G.y + 26, '명반응: NADPH 만드는 속도', 13.5, '#166534', 'left', 800); T(rx + 270, G.y + 26, sp1 + ' %', 16, '#1f2d44', 'right', 800); T(rx, G.y + 54, '탄소 고정: NADPH 쓰는 속도', 13.5, '#9d174d', 'left', 800); T(rx + 270, G.y + 54, sp2 + ' %', 16, '#1f2d44', 'right', 800); T(rx, G.y + 84, '(최대 속도에 대한 %) 둘은 서로 이어져 있어요', 12.5, '#64748b', 'left', 700); }
    else { const y = G.y + 22 + 3 * 38; T(G.x + 16, y, '명반응 ' + sp1 + ' % · 탄소 고정 ' + sp2 + ' % (NADPH 속도, 최대 대비)', 13, '#334155', 'left', 800); }
  }

  /* =========================================================
     ④ 조건 예측: 시나리오를 예측하고 실행
     ========================================================= */
  const SCN = [
    { id: 'light', icon: '🌑', name: '빛을 갑자기 끔', why: '빛이 없으면 ATP · NADPH를 새로 못 만들어요. 환원과 재생이 멈춰 3PG가 쌓이고 RuBP는 줄어요.' },
    { id: 'co2', icon: '🚫', name: 'CO₂ 공급 중단', why: '고정할 CO₂가 없어 RuBP가 쓰이지 않고 쌓여요. 3PG는 재생에 쓰여 줄고, ATP · NADPH는 쓰이지 않아 늘어요.' },
    { id: 'temp', icon: '🌡', name: '온도를 높여 효소 변성', why: '효소가 변성되어 회로가 멈춰요. 3PG와 RuBP 양은 그대로이고, 쓰이지 않는 ATP · NADPH만 늘어요.' },
    { id: 'water', icon: '💧', name: '물 공급 중단', why: '물이 없으면 전자를 얻을 수 없어 ATP · NADPH 생성이 멈춰요. 결과는 빛을 끈 것과 같아요(조금 늦게).' },
    { id: 'both', icon: '⛔', name: '빛 끄기 + CO₂ 중단', why: '새 ATP · NADPH도 없고 CO₂도 없어요. 남은 ATP · NADPH로 3PG가 RuBP로 바뀌고 RuBP는 더 쓰이지 않아 RuBP가 늘어요.' },
    { id: 'relight', icon: '💡', name: '빛을 다시 켬 (어두운 상태에서)', why: '다시 ATP · NADPH가 만들어져 3PG가 RuBP로 되돌아가요. ATP · NADPH와 RuBP가 늘고 3PG가 줄어요.' },
  ];
  const PRQ = [['ATP · NADPH', 'an'], ['3PG (3탄소)', 'p'], ['RuBP (5탄소)', 'r']];
  const PRL = { up: '▲ 증가', down: '▼ 감소', flat: '■ 변화 없음' };
  const PR_T = 24, PR_C = 4, PR_DT = 0.1;
  S.pr = { sel: 'light', p: {}, ran: {}, pass: {}, traj: null, tcur: 0, running: false, key: null, bars: { an: 0, p: 0, r: 0 }, res: null };
  function prCond(id, t) {
    const b = { L: 8, C: 8, E: 1, W: 1 }; if (id === 'relight') { if (t >= PR_C) return b; return { L: 0, C: 8, E: 1, W: 1 }; }
    if (t < PR_C) return b;
    const x = Object.assign({}, b);
    if (id === 'light') x.L = 0; else if (id === 'co2') x.C = 0; else if (id === 'temp') x.E = 0; else if (id === 'water') x.W = Math.exp(-(t - PR_C) / 3); else if (id === 'both') { x.L = 0; x.C = 0; }
    return x;
  }
  function prSim(id) {
    const st = id === 'relight' ? (() => { const s = { A: 0.5, N: 0.5, R: 0.4, P: 0.6 }; for (let i = 0; i < 1600; i++) poolStep(s, 0, 8, 1, 1, 0.05); return s; })() : poolSteady(8, 8);
    const traj = []; for (let t = 0; t <= PR_T + 1e-9; t += PR_DT) { const c = prCond(id, t); poolStep(st, c.L, c.C, c.E, c.W, PR_DT); traj.push({ t, an: (st.A + st.N) / 2, p: st.P, r: st.R }); }
    return traj;
  }
  function prKey(traj) {
    const a = traj[Math.round(PR_C / PR_DT) - 1], z = traj[traj.length - 1], out = {};
    ['an', 'p', 'r'].forEach((k) => { const d = z[k] - a[k]; out[k] = d > 0.08 ? 'up' : d < -0.08 ? 'down' : 'flat'; });
    return out;
  }
  function prSelect(id) {
    const pr = S.pr; if (pr.sel === id) return; pr.sel = id; pr.running = false; pr.traj = null; pr.tcur = 0; pr.res = null; Sound.click(); prLoad(); updateCtl();
  }
  function prLoad() { const q = S.pr.p[S.pr.sel] || {}; $('#pr1').value = q.an || ''; $('#pr2').value = q.p || ''; $('#pr3').value = q.r || ''; }
  function prSave() { const pr = S.pr; pr.p[pr.sel] = { an: $('#pr1').value, p: $('#pr2').value, r: $('#pr3').value }; }
  function prGo() {
    const pr = S.pr; prSave(); const q = pr.p[pr.sel];
    if (!q.an || !q.p || !q.r) { showHint('세 가지 변화를 모두 예측한 뒤 실행해요.', 3200); return; }
    pr.traj = prSim(pr.sel); pr.key = prKey(pr.traj); pr.tcur = 0; pr.running = true; pr.res = null; pr.locked = JSON.parse(JSON.stringify(q)); Sound.click(); updateCtl();
  }
  function prFinish() {
    const pr = S.pr; pr.running = false; pr.tcur = PR_T; const q = pr.locked, ok = { an: q.an === pr.key.an, p: q.p === pr.key.p, r: q.r === pr.key.r };
    pr.res = { ok, all: ok.an && ok.p && ok.r }; pr.ran[pr.sel] = true; if (pr.res.all) { pr.pass[pr.sel] = true; Sound.success(); } else Sound.tick(); updateCtl();
  }
  function prG() {
    return PHONE ? { Gr: { x: 10, y: 10, w: 460, h: 296 }, Bars: { x: 10, y: 314, w: 460, h: 122 }, V: { x: 10, y: 444, w: 460, h: 186 } } : { Bars: { x: 14, y: 14, w: 230, h: 358 }, Gr: { x: 252, y: 14, w: 534, h: 358 }, V: { x: 14, y: 380, w: 772, h: 168 } };
  }
  function prDraw(dt, t) {
    const g = prG(), pr = S.pr, sc = SCN.find((s) => s.id === pr.sel);
    if (pr.running) { pr.tcur = Math.min(PR_T, pr.tcur + dt * 3); if (pr.tcur >= PR_T) prFinish(); }
    const cur = pr.traj ? pr.traj[Math.min(pr.traj.length - 1, Math.round(pr.tcur / PR_DT))] : null;
    const tgt = cur || { an: 0, p: 0, r: 0 };
    ['an', 'p', 'r'].forEach((k) => { pr.bars[k] = RM ? tgt[k] : approach(pr.bars[k], tgt[k], dt, 10); });
    // 그래프
    const Gr = g.Gr; panel(Gr.x, Gr.y, Gr.w, Gr.h, 18, '#fff');
    const p = mkPlot(Gr, { x0: 0, x1: PR_T, y0: 0, y1: 100, yt: [0, 25, 50, 75, 100], xt: [0, 4, 8, 12, 16, 20, 24], xfmt: (v) => v + '초', m: { l: 44, t: 46, r: 24, b: 40 }, xl: '시간 (초)', yl: '상대 양 (%)' });
    drawAxes(p); T(Gr.x + Gr.w / 2, Gr.y + 28, sc.icon + ' ' + sc.name + ' (' + PR_C + '초에 조건을 바꿔요)', PHONE ? 13.5 : 16, '#1f2d44', 'center', 800);
    ctx.save(); ctx.setLineDash([5, 5]); ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(p.X(PR_C), p.y); ctx.lineTo(p.X(PR_C), p.y + p.h); ctx.stroke(); ctx.restore();
    T(p.X(PR_C) + 5, p.y + 14, '조건 변경', PHONE ? 12 : 13, '#dc2626', 'left', 800);
    const cols = { an: '#8b5cf6', p: '#2563eb', r: '#16a34a' };
    if (pr.traj) ['an', 'p', 'r'].forEach((k) => { ctx.save(); ctx.beginPath(); ctx.rect(p.x, p.y - 2, p.w, p.h + 4); ctx.clip(); ctx.strokeStyle = cols[k]; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.beginPath(); let first = true; pr.traj.forEach((q) => { if (q.t > pr.tcur + 1e-9) return; const x = p.X(q.t), y = p.Y(q[k] * 100); if (first) { ctx.moveTo(x, y); first = false; } else ctx.lineTo(x, y); }); ctx.stroke(); ctx.restore(); });
    else T(p.x + p.w / 2, p.y + p.h / 2, '예측을 고르고 ▶ 실행하기를 눌러요', PHONE ? 13.5 : 15.5, '#94a3b8', 'center', 800);
    // 막대 (지금 양)
    const B = g.Bars; panel(B.x, B.y, B.w, B.h, 18, '#fff'); T(B.x + 14, B.y + 24, '지금의 양 (상대)', PHONE ? 13.5 : 15, '#1f2d44', 'left', 800);
    const items = [['ATP · NADPH', 'an', '#8b5cf6'], ['3PG (3탄소)', 'p', '#2563eb'], ['RuBP (5탄소)', 'r', '#16a34a']];
    if (!PHONE) {
      const bh = 226, by = B.y + 40, bw = 44;
      items.forEach((it, i) => { const x = B.x + 28 + i * 66, v = pr.bars[it[1]]; D.roundRect(x, by, bw, bh, 10); ctx.fillStyle = '#eef2f7'; ctx.fill(); const hh = bh * clamp(v, 0, 1); if (hh > 1) { D.roundRect(x, by + bh - hh, bw, hh, 10); ctx.fillStyle = it[2]; ctx.fill(); } T(x + bw / 2, by + bh + 22, fi(v * 100) + '%', 15, '#1f2d44', 'center', 800); TF(x + bw / 2, by + bh + 44, it[0], 62, 12.5, 10, '#475569', 'center', 800); });
    } else {
      items.forEach((it, i) => { const y = B.y + 40 + i * 26, v = pr.bars[it[1]], x0 = B.x + 134, w = B.w - 134 - 62; T(B.x + 14, y + 12, it[0], 13.5, '#334155', 'left', 800); D.roundRect(x0, y, w, 16, 8); ctx.fillStyle = '#eef2f7'; ctx.fill(); if (v > 0.004) { D.roundRect(x0, y, Math.max(10, w * v), 16, 8); ctx.fillStyle = it[2]; ctx.fill(); } T(x0 + w + 8, y + 13, fi(v * 100) + '%', 14, '#1f2d44', 'left', 800); });
    }
    // 예측과 결과 표
    const V = g.V; panel(V.x, V.y, V.w, V.h, 18, '#fff');
    T(V.x + 14, V.y + 26, pr.res ? (pr.res.all ? '🎉 예측이 모두 맞았어요!' : '🤔 예측과 결과를 비교해요') : '내 예측과 결과', PHONE ? 14 : 16, pr.res && pr.res.all ? '#15803d' : '#1f2d44', 'left', 800);
    const q = pr.running || pr.res ? pr.locked : (pr.p[pr.sel] || {}), rowH = PHONE ? 38 : 32;
    PRQ.forEach(([nm, k], i) => {
      const y = V.y + 38 + i * rowH, my = q && q[k], ok = pr.res ? pr.res.ok[k] : null;
      D.roundRect(V.x + 8, y, V.w - 16, rowH - 4, 8); ctx.fillStyle = ok === true ? 'rgba(34,197,94,.14)' : ok === false ? 'rgba(239,68,68,.12)' : 'rgba(148,163,184,.10)'; ctx.fill();
      TF(V.x + 18, y + rowH * 0.62, nm, PHONE ? 118 : 160, PHONE ? 13.5 : 14.5, 11, '#334155', 'left', 800);
      T(V.x + (PHONE ? 140 : 210), y + rowH * 0.62, '예측 ' + (my ? PRL[my] : '?'), PHONE ? 13.5 : 15, '#1f2d44', 'left', 800);
      if (pr.res) { T(V.x + (PHONE ? 296 : 440), y + rowH * 0.62, '결과 ' + PRL[pr.key[k]], PHONE ? 13.5 : 15, '#1f2d44', 'left', 800); T(V.x + V.w - 18, y + rowH * 0.64, ok ? '✔' : '✖', 18, ok ? '#16a34a' : '#dc2626', 'right', 800); }
    });
    if (pr.res) { textBlock(V.x + 14, V.y + 42 + 3 * rowH + 6, V.w - 28, sc.why, PHONE ? 12 : 13, '#475569', PHONE ? 16 : 17, 700); }
  }

  /* =========================================================
     화면 전환 · 조작 연결
     ========================================================= */
  const PTS = { cal: null, need: null, link: lkPT, pred: null };
  PT = null;
  function setMode(m) {
    if (S.mode !== m) S.fade = 1; S.mode = m; PT = PTS[m] || null; hideHint();
    if (m === 'link' && !S.lk) lkInit();
    updateCtl();
  }
  const ctlNodes = $$('#ctrlCard .control');
  S.cv_accOn = false;
  const PRBTN = $('#prSc');
  PRBTN.innerHTML = SCN.map((s) => '<button type="button" data-v="' + s.id + '">' + s.icon + ' ' + s.name + '</button>').join('');
  function updateCtl() {
    const fr = game ? game.free : false, lvNow = game ? game.level : 0, cv = S.cv, nd = S.nd, pr = S.pr, lk = S.lk;
    ctlNodes.forEach((n) => { n.hidden = (n.dataset.modes || '').split(' ').indexOf(S.mode) < 0; });
    $$('#ctrlCard [data-grp]').forEach((n) => { const k = n.dataset.grp; n.hidden = k === 'acc' ? !(S.cv_accOn || fr) : k === 'calc' ? !(nd.calcOn || fr) : false; });
    modeButtons(S.mode, lvNow, fr);
    if (cv) {
      const lab = cv.phase === 'fix' ? 'CO₂ 넣기 (' + cv.fixed + ' / 3)' : cv.phase === 'reduce' ? '환원: ATP · NADPH 쓰기' : cv.phase === 'regen' ? '재생: 5탄소로 되돌리기' : '↺ 처음부터 다시';
      $('#cvGo').textContent = cv.busy ? '진행 중…' : lab; $('#cvGo').disabled = cv.busy;
      $('#cvNote').innerHTML = '고정한 CO₂ <b>' + cv.fixed + ' / 3</b> · 쓴 ATP <b>' + cv.atp + '</b> · 쓴 NADPH <b>' + cv.nadph + '</b> · 회로 밖 G3P <b>' + cv.outG + '</b>';
      $('#aG').classList.toggle('ok', numIn('aG') === 3); $('#aR').classList.toggle('ok', numIn('aR') === 15);
    }
    $('#oN').textContent = nd.n; $('#sN').value = nd.n;
    { const r = needRow(nd.n); $('#ndNote').innerHTML = 'CO₂ <b>' + nd.n + '</b>분자 → ATP <b>' + r.atp + '</b> · NADPH <b>' + r.nadph + '</b> · 순생산 G3P <b>' + r.g3p + '</b>분자'; }
    $('#nC').classList.toggle('ok', numIn('nC') === 6); $('#nA').classList.toggle('ok', numIn('nA') === 18); $('#nP').classList.toggle('ok', numIn('nP') === 12); $('#nCmp').classList.toggle('ok', $('#nCmp').value === 'same');
    if (lk) {
      $('#oL').textContent = lk.L; $('#oC').textContent = lk.C; $('#sL').value = lk.L; $('#sC').value = lk.C;
      $('#lkNote').innerHTML = '카드를 <b>끌어서</b> 알맞은 칸에 놓거나, 카드를 <b>누른 뒤</b> 칸을 눌러요. 놓은 카드 <b>' + lk.so.placed + ' / 4</b>';
    }
    $$('#prSc button').forEach((b) => { b.classList.toggle('on', b.dataset.v === pr.sel); b.classList.toggle('ran', !!pr.ran[b.dataset.v]); });
    $('#prGo').disabled = pr.running; $('#prGo').textContent = pr.running ? '실행 중…' : '▶ 실행하기';
    const nRan = Object.keys(pr.ran).length;
    $('#prNote').innerHTML = '실행한 시나리오 <b>' + nRan + ' / 6</b> · 예측이 맞은 시나리오 <b>' + Object.keys(pr.pass).length + '</b>';
  }
  bindModeSeg(setMode);
  $('#cvGo').addEventListener('click', () => { Sound.click(); cvGo(); });
  $('#cvReset').addEventListener('click', () => { Sound.click(); cvReset(); });
  ['aG', 'aR', 'nC', 'nA', 'nP'].forEach((id) => $('#' + id).addEventListener('input', updateCtl));
  $('#nCmp').addEventListener('change', updateCtl);
  $('#sN').addEventListener('input', (e) => { S.nd.n = +e.target.value; updateCtl(); });
  $('#sL').addEventListener('input', (e) => { S.lk.L = +e.target.value; updateCtl(); });
  $('#sC').addEventListener('input', (e) => { S.lk.C = +e.target.value; updateCtl(); });
  $('#lkReset').addEventListener('click', () => { Sound.click(); S.lk.pick = null; S.lk.so.reset(); });
  $$('#prSc button').forEach((b) => b.addEventListener('click', () => prSelect(b.dataset.v)));
  ['pr1', 'pr2', 'pr3'].forEach((id) => $('#' + id).addEventListener('change', () => { const pr = S.pr; if (pr.running) return; prSave(); pr.res = null; pr.traj = null; pr.tcur = 0; updateCtl(); }));
  $('#prGo').addEventListener('click', prGo);

  /* =========================================================
     미션
     ========================================================= */
  const levels = [
    {
      title: '캘빈 회로', short: '캘빈 회로', icon: '🔄', phase: '모형',
      intro: '<p class="si-q">❓ 탐구 질문: 빛이 없는 밤에도 식물은 포도당을 만들까? 명반응과 탄소 고정 반응은 어떻게 서로를 필요로 할까?</p><p>🔗 <b>앞 차시에서</b> 명반응이 틸라코이드 막에서 <b>ATP · NADPH</b>를 만들고 O₂를 내보낸다고 배웠어요. 이제 그 ATP · NADPH가 쓰이는 곳, 엽록체 <b>스트로마</b>의 <b>탄소 고정 반응</b>(<b>캘빈 회로</b>)을 따라가요.</p><p>분자 구조식은 쓰지 않고 <b>탄소 구슬(●)</b>로만 따라가요. 회로는 세 단계예요. <b>① 고정</b>: CO₂ 1분자가 5탄소 화합물(<b>RuBP</b>)에 붙어(효소 <b>루비스코</b>) 6탄소 중간체를 거쳐 곧바로 3탄소 화합물(<b>3PG</b>) 2분자가 돼요. <b>② 환원</b>: 3PG가 ATP와 NADPH를 써서 3탄소 당(<b>G3P</b>)이 돼요. <b>③ 재생</b>: G3P 대부분이 ATP를 써서 RuBP로 되돌아가 회로가 이어지고, 일부는 회로를 떠나 포도당 등으로 합성돼요.</p>',
      features: ['cal'],
      setup() { setMode('cal'); S.cv_accOn = false; },
      recap: 'CO₂ 3분자를 고정하면 3PG 6분자가 되고, 환원으로 G3P 6분자가 돼요. 그중 1분자(탄소 3개)가 회로 밖으로 나가고 5분자(탄소 15개)는 RuBP 3분자로 재생돼요. 이 과정은 스트로마에서 일어나요.',
      summary: '<ul><li><b>탄소 고정 반응(캘빈 회로)</b>은 엽록체 <b>스트로마</b>에서 효소에 의해 일어나요. 세 단계: <b>① 고정</b>(CO₂ + RuBP 5탄소 → 6탄소 중간체 → 3PG 3탄소 × 2, 효소 루비스코) → <b>② 환원</b>(3PG → G3P, ATP 1개와 NADPH 1개 사용) → <b>③ 재생</b>(G3P 대부분 → RuBP, ATP 사용).</li><li>CO₂ <b>3분자</b>(3회전): RuBP 3분자(탄소 15) + CO₂ 3개 = 탄소 18 → 3PG 6분자 → G3P 6분자(탄소 18) → <b>1분자(탄소 3)는 순생산</b>, <b>5분자(탄소 15)는 RuBP 3분자로 재생</b>.</li><li>이 순생산 G3P가 포도당 · 녹말 · 설탕 등으로 합성돼요(동화). RuBP가 매번 재생되어야 CO₂를 계속 붙잡을 수 있어요.</li></ul>',
      missions: [
        {
          id: 'turn3', title: 'CO₂ 3분자, 회로 3바퀴',
          goal: '<b>CO₂를 3분자</b> 넣어 고정하고, <b>환원</b>과 <b>재생</b>까지 마쳐 회로를 한 번 완성하세요.',
          hint: '버튼을 차례로 눌러요: CO₂ 넣기 3번 → 환원 → 재생. 단계마다 구슬 수가 오른쪽 장부에 적혀요.',
          setup() { setMode('cal'); S.cv_accOn = false; cvReset(); },
          check: () => S.cv.done, hold: 0.6,
          status: () => mark(S.cv.fixed >= 3 && S.cv.phase !== 'fix') + ' 고정 ' + S.cv.fixed + ' / 3 &nbsp; ' + mark(S.cv.atp >= 6) + ' 환원 &nbsp; ' + mark(S.cv.done) + ' 재생',
          explain: '고정 3번 → 3PG 6분자(탄소 18), 환원(ATP 6 · NADPH 6) → G3P 6분자, 재생(ATP 3)으로 G3P 5분자가 RuBP 3분자로 돌아가고 G3P 1분자가 회로를 떠나요.',
        },
        {
          id: 'acct', title: '구슬 수 회계', manual: true,
          goal: '장부를 보고 <b>회로 밖으로 나간 G3P 1분자의 탄소 구슬 수</b>와 <b>RuBP로 재생에 쓰인 탄소 구슬 수</b>를 쓰세요.',
          hint: 'G3P는 3탄소 당이에요. 재생에 쓰인 G3P는 5분자이고 각각 탄소가 3개예요.',
          setup() { setMode('cal'); S.cv_accOn = true; ['aG', 'aR'].forEach((id) => { $('#' + id).value = ''; }); updateCtl(); },
          check() {
            if (!S.cv.done) return '먼저 회로를 한 번 완성해 보세요. (CO₂ 3분자 → 환원 → 재생)';
            if (isNaN(numIn('aG')) || isNaN(numIn('aR'))) return '두 칸을 모두 채워 주세요.';
            if (numIn('aG') !== 3) return '회로를 떠난 G3P는 1분자예요. 3탄소 당이니 탄소는 몇 개일까요?';
            if (numIn('aR') !== 15) return '재생에 쓰인 G3P는 5분자이고, 1분자에 탄소가 3개예요. 5 × 3을 계산해 보세요.';
            return true;
          },
          explain: '순생산 G3P 1분자 = <b>탄소 3개</b>(들어온 CO₂ 3개의 탄소와 같아요). 재생에 쓰인 구슬은 G3P 5분자 × 3 = <b>15개</b>로, RuBP 3분자(5 × 3 = 15)가 돼요. 구슬은 사라지지 않아요.',
        },
        {
          type: 'quiz', title: 'RuBP가 재생되는 까닭',
          goal: '회로 끝에서 <b>5탄소 화합물(RuBP)이 다시 만들어지는 까닭</b>은?',
          setup() { setMode('cal'); },
          choices: ['다음 CO₂를 붙잡을 RuBP가 있어야 회로가 계속 돌기 때문이다', 'RuBP가 포도당의 최종 산물이기 때문이다', 'RuBP가 빛을 흡수하는 색소이기 때문이다', 'RuBP가 O₂를 만들기 때문이다'],
          answer: 0,
          feedback: ['', '포도당의 재료가 되는 것은 회로 밖으로 나간 G3P예요.', '빛을 흡수하는 것은 엽록소 같은 색소예요.', 'O₂는 명반응의 물 분해에서 나와요.'],
          explain: 'RuBP는 CO₂를 <b>처음 붙잡는</b> 분자예요. 재생되지 않으면 다음 CO₂를 고정할 수 없어 회로가 멈춰요. 탄소 고정 반응은 <b>스트로마</b>에서 일어나요.',
        },
      ],
    },
    {
      title: '필요량 계산', short: '필요량 계산', icon: '🧮', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 회로를 한 바퀴 돌리며 환원과 재생에 ATP · NADPH를 쓰는 것을 봤어요. 포도당 1분자를 만들려면 얼마나 필요할까요?</div><p>CO₂ <b>1분자</b>를 고정할 때마다(회전 1회) <b>ATP 3개</b>(환원 2 + 재생 1)와 <b>NADPH 2개</b>(환원)가 쓰여요. 포도당(탄소 6개) 1분자의 탄소는 CO₂ <b>6분자</b>에서 와요.</p><p>슬라이더로 CO₂ 분자 수를 바꾸면 표와 <b>천칭</b>이 바뀌어요. 천칭 왼쪽은 명반응이 물 12분자에서 만든 ATP · NADPH(<b>앞 차시</b>: ATP 18, NADPH 12, O₂ 6)예요.</p>',
      features: ['need'],
      setup() { setMode('need'); S.nd.calcOn = false; },
      recap: '포도당 1분자는 CO₂ 6분자, 회로 6회전으로 만들어요. 필요한 것은 ATP 18개와 NADPH 12개로, 명반응이 물 12분자에서 만드는 양과 같아요.',
      summary: '<ul><li>회전 1회(CO₂ 1분자): <b>ATP 3개</b>(환원 2 + 재생 1), <b>NADPH 2개</b>(환원). 3회전마다 순생산 G3P 1분자.</li><li><b>포도당 1분자</b> = CO₂ <b>6</b>분자 = 6회전 → <b>ATP 18개, NADPH 12개</b>, 순생산 G3P 2분자.</li><li>명반응이 물 12분자에서 만드는 ATP 18 · NADPH 12(O₂ 6)와 <b>같아서 수지가 맞아요</b>. 어느 한쪽이 모자라면 탄소 고정 반응이 정체돼요.</li><li>광합성 전체식(간단히): 6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂.</li></ul>',
      missions: [
        {
          id: 'bal', title: '수지가 맞는 CO₂ 수',
          goal: '슬라이더로 CO₂ 분자 수를 바꿔 <b>천칭이 수평</b>이 되게 하세요.',
          hint: '왼쪽(명반응 공급)은 ATP 18 + NADPH 12 = 30칸이에요. 오른쪽은 CO₂ 1분자당 5칸(ATP 3 + NADPH 2)이 쌓여요.',
          setup() { setMode('need'); S.nd.calcOn = false; S.nd.n = 3; updateCtl(); },
          check: () => S.nd.n === 6, hold: 1.0,
          status: () => mark(S.nd.n === 6) + ' CO₂ ' + S.nd.n + '분자 (포도당 1분자 = 6분자)',
          explain: 'CO₂ <b>6분자</b>일 때 필요한 ATP 3 × 6 = <b>18</b>, NADPH 2 × 6 = <b>12</b>로 명반응의 공급과 같아서 천칭이 수평이에요.',
        },
        {
          id: 'calc', title: '포도당 1분자의 필요량', manual: true,
          goal: '<b>포도당 1분자</b>를 만들 때 필요한 <b>CO₂ · ATP · NADPH</b>의 수를 쓰고, 명반응의 산물(ATP 18 · NADPH 12)과 비교해 고르세요.',
          hint: '표에서 포도당이 1인 줄을 찾아요. 비교는 필요량과 공급량이 같은지 따져요.',
          setup() { setMode('need'); S.nd.calcOn = true; ['nC', 'nA', 'nP'].forEach((id) => { $('#' + id).value = ''; }); $('#nCmp').value = ''; updateCtl(); },
          check() {
            if (isNaN(numIn('nC')) || isNaN(numIn('nA')) || isNaN(numIn('nP'))) return '세 칸을 모두 채워 주세요.';
            if (numIn('nC') !== 6) return '포도당은 탄소가 6개예요. CO₂ 1분자에 탄소 1개이니 필요한 CO₂는 몇 분자일까요?';
            if (numIn('nA') !== 18) return 'CO₂ 1분자당 ATP 3개예요. CO₂ 6분자면 몇 개일까요?';
            if (numIn('nP') !== 12) return 'CO₂ 1분자당 NADPH 2개예요. CO₂ 6분자면 몇 개일까요?';
            if (!$('#nCmp').value) return '명반응의 산물과 비교해 골라 주세요.';
            if ($('#nCmp').value !== 'same') return '필요량 ATP 18 · NADPH 12와 명반응의 ATP 18 · NADPH 12를 다시 비교해 보세요.';
            return true;
          },
          explain: '포도당 1분자 = CO₂ <b>6</b> · ATP <b>18</b> · NADPH <b>12</b>. 명반응이 물 12분자에서 만드는 ATP 18 · NADPH 12와 <b>같아요</b>. 그래서 두 반응은 서로 짝을 이루어 돌아가요. 명반응의 NADPH와 ATP가 모자라면 회로가 정체돼요.',
        },
      ],
    },
    {
      title: '두 반응 연결', short: '두 반응 연결', icon: '🔗', phase: '모형',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 명반응이 만든 ATP · NADPH를 탄소 고정 반응이 정확히 같은 양만큼 쓴다는 것을 확인했어요. 쓰고 나면 그 물질은 어디로 갈까요?</div><p>엽록체 전체 그림을 보세요. 틸라코이드에서 만든 <b>ATP · NADPH</b>가 스트로마의 캘빈 회로로 건네지고, 반응이 끝나면 <b>ADP + Pi · NADP⁺</b>가 틸라코이드로 돌아가 <b>명반응의 재료</b>가 돼요. 이 순환 고리를 카드로 완성해 봐요.</p><p>빛 세기와 CO₂ 농도를 바꾸며 한쪽이 막히면 반대쪽도 멈추는지 확인해요. 그래서 탄소 고정 반응을 <b>암반응</b>이라 부르면 오해가 생겨요. 빛이 직접 필요하지는 않지만, 명반응의 산물이 있어야 하고 주로 낮에 진행되기 때문이에요.</p>',
      features: ['link'],
      setup() { setMode('link'); },
      recap: '명반응이 만든 ATP · NADPH는 탄소 고정 반응에서 쓰이고, 그 결과 생긴 ADP + Pi · NADP⁺는 명반응의 재료가 돼요. 한쪽이 막히면 다른 쪽도 멈추는 순환 관계예요. O₂는 나가고 CO₂는 들어와요.',
      summary: '<ul><li><b>명반응(틸라코이드)</b> → <b>ATP · NADPH</b> → <b>탄소 고정 반응(스트로마)</b> → <b>ADP + Pi · NADP⁺</b> → 다시 명반응. 이 순환이 막히면 반대쪽도 멈춰요.</li><li>엽록체 출입: <b>CO₂ 들어옴</b>(탄소 고정 반응의 재료), <b>O₂ 나감</b>(명반응의 물 분해).</li><li>CO₂가 끊기면 ATP · NADPH가 쓰이지 않고 쌓여 <b>NADP⁺가 모자라</b> 명반응도 정체돼요. 빛이 없으면 ATP · NADPH를 못 만들어 탄소 고정 반응이 멈춰요.</li><li>탄소 고정 반응을 <b>암반응</b>이라고 하면 &quot;빛이 없을 때만 일어난다&quot;고 오해해요. 빛이 직접 필요하지는 않지만 명반응의 산물이 필요하고, 빛이 있을 때 효소가 활성화되어 주로 낮에 진행돼요.</li></ul>',
      missions: [
        {
          id: 'loop', title: '순환 고리 완성', manual: true,
          goal: '카드 4장을 알맞은 칸에 놓아 <b>순환 고리</b>를 완성하세요. (틸라코이드 → 스트로마로 가는 것, 돌아오는 것, 엽록체로 들어오는 기체, 나가는 기체)',
          hint: 'ATP · NADPH는 명반응의 산물이라 틸라코이드에서 캘빈 회로로 가요. 돌아오는 것은 그것을 쓰고 남은 ADP + Pi · NADP⁺예요. CO₂는 들어오고 O₂는 나가요.',
          setup() { setMode('link'); S.lk.pick = null; S.lk.so.reset(); },
          check() {
            const so = S.lk.so; if (so.placed < 4) return '카드 4장을 모두 놓아 주세요. (' + so.placed + ' / 4)';
            const wr = lkWrong(); so.markBad(wr.map((c) => c.id));
            if (wr.length) { const w = wr[0]; return '빨간 카드가 아직 달라요. ' + ({ c1: 'ATP · NADPH는 명반응의 산물이라 틸라코이드에서 캘빈 회로로 건너가요.', c2: 'ATP · NADPH를 쓰고 남은 ADP + Pi · NADP⁺가 틸라코이드로 돌아와 명반응의 재료가 돼요.', c3: 'CO₂는 탄소 고정 반응의 재료라 엽록체 안으로 들어와요.', c4: 'O₂는 명반응의 물 분해에서 생겨 엽록체 밖으로 나가요.' })[w.id]; }
            return true;
          },
          explain: '순환 고리: 틸라코이드 <b>ATP · NADPH → 캘빈 회로</b>, 캘빈 회로 <b>ADP + Pi · NADP⁺ → 틸라코이드</b>. 엽록체 출입은 <b>CO₂ 들어옴 · O₂ 나감</b>이에요. 입자의 흐름은 빛과 CO₂ 농도에 따라 바뀌어요.',
        },
        {
          id: 'stall', title: 'CO₂를 끊으면 명반응도 정체',
          goal: '빛 세기를 <b>5 이상</b>으로 두고 <b>CO₂ 농도를 0</b>으로 내려, 명반응이 정체되어 <b>NADPH 저장량이 90 % 이상</b>이 되게 하세요.',
          hint: 'CO₂ 슬라이더를 0으로 내려요. ATP · NADPH가 쓰이지 않고 쌓이면 NADP⁺가 줄어 명반응이 돌 수 없어요. 몇 초 기다려요.',
          setup() { setMode('link'); lkInit(6, 6, true); updateCtl(); },
          check: () => S.lk.C === 0 && S.lk.L >= 5 && S.lk.st.N >= 0.9, hold: 1.2,
          status: () => mark(S.lk.L >= 5) + ' 빛 ' + S.lk.L + ' &nbsp; ' + mark(S.lk.C === 0) + ' CO₂ ' + S.lk.C + ' &nbsp; ' + mark(S.lk.st.N >= 0.9) + ' NADPH ' + fi(S.lk.st.N * 100) + ' % (90 % 이상)',
          explain: 'CO₂가 없으면 탄소 고정 반응이 멈춰 ATP · NADPH가 쓰이지 않고 쌓여요. 그러면 <b>NADP⁺와 ADP가 모자라</b> 명반응도 정체돼요. 한쪽이 멈추면 다른 쪽도 멈추는 순환 관계예요.',
        },
        {
          type: 'quiz', title: '암반응이라고 부르면 생기는 오해',
          goal: '탄소 고정 반응을 <b>암반응</b>이라고 부르면 오해가 생기는 까닭은?',
          setup() { setMode('link'); },
          choices: ['빛이 없을 때만 일어나는 반응이라고 생각하게 되지만, 명반응의 산물(ATP · NADPH)이 있어야 하고 주로 낮에 진행된다', '밤에도 계속 포도당을 만들어서 암반응이라고 부른다', '빛이 직접 필요해서 암반응이라고 부른다', '엽록체 밖에서 일어나서 암반응이라고 부른다'],
          answer: 0,
          feedback: ['', '밤에는 명반응의 산물이 없어 거의 멈춰요.', '빛이 직접 필요하지는 않아요. 하지만 명반응 산물이 필요해요.', '탄소 고정 반응은 엽록체의 스트로마에서 일어나요.'],
          explain: '탄소 고정 반응은 빛이 <b>직접</b> 필요하지는 않지만 <b>명반응이 만든 ATP · NADPH</b>가 있어야 해요. 또 빛이 있을 때 효소가 활성화되어 주로 낮에 진행돼요. 그래서 &quot;암반응&quot;이라는 이름은 오해를 줘요.',
        },
      ],
    },
    {
      title: '조건 예측', short: '조건 예측', icon: '🎯', phase: '예측',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 한쪽이 막히면 다른 쪽도 멈추는 순환 관계를 확인했어요. 이번에는 조건이 바뀔 때 화합물 양이 어떻게 변할지 <b>먼저 예측</b>해 보고 실행해서 맞춰 봐요.</div><p>캘빈은 이런 논리로 회로의 순서를 알아냈어요(마지막 차시에서 만나요). 클로렐라에 정상 빛과 CO₂를 준 뒤 조건을 바꾸고, <b>ATP · NADPH</b>, <b>3PG</b>(3탄소 화합물), <b>RuBP</b>(5탄소 화합물)의 양이 어떻게 달라지는지 봐요. (값은 이해를 돕기 위해 단순화한 상대값이에요.)</p><p>시나리오 6가지 중에서 골라 세 가지 변화(▲ 증가 · ▼ 감소 · ■ 변화 없음)를 예측하고 <b>▶ 실행하기</b>를 눌러요.</p>',
      features: ['pred'],
      setup() { setMode('pred'); },
      recap: '빛을 끄면 3PG가 쌓이고 RuBP가 줄어요(환원과 재생에 쓸 ATP · NADPH 부족). CO₂를 끊으면 RuBP가 쌓이고 3PG가 줄어요(붙잡을 CO₂가 없음). 조건을 바꾼 뒤 중간 물질의 양 변화로 반응 순서를 추론할 수 있어요.',
      summary: '<ul><li><b>빛을 끈 직후</b>: ATP · NADPH가 부족해 환원과 재생이 멈춰 <b>3PG 증가, RuBP 감소</b>.</li><li><b>CO₂ 공급 중단 직후</b>: 고정할 CO₂가 없어 <b>RuBP 증가, 3PG 감소</b>(ATP · NADPH는 쓰이지 않아 늘어요).</li><li><b>효소 변성</b>(높은 온도): 회로 전체가 멈춰 3PG · RuBP 양은 그대로, ATP · NADPH만 쌓여요. <b>물 공급 중단</b>은 전자를 얻을 수 없어 빛을 끈 것과 같은 결과가 돼요.</li><li>밤에 광합성이 거의 멈추는 까닭: ① 명반응이 일어나지 않아 ATP · NADPH가 만들어지지 않고, ② 빛이 있을 때 활성화되는 탄소 고정 반응의 효소도 활성이 낮아져요. 중간 물질의 양 변화를 보면 반응의 순서를 추론할 수 있어요.</li></ul>',
      missions: [
        {
          id: 'pred2', title: '빛 끄기와 CO₂ 끊기 예측', manual: true,
          goal: '<b>🌑 빛을 갑자기 끔</b>과 <b>🚫 CO₂ 공급 중단</b>에서 ATP · NADPH, 3PG, RuBP의 변화를 예측하고 실행해 <b>두 시나리오 모두 맞히세요</b>.',
          hint: '빛이 없으면 ATP · NADPH를 못 만들고, CO₂가 없으면 RuBP를 쓸 수 없어요. 3PG는 RuBP가 CO₂를 붙잡아 생기고, 환원 · 재생으로 RuBP로 되돌아가요.',
          setup() { setMode('pred'); S.pr.sel = 'light'; S.pr.traj = null; S.pr.res = null; S.pr.running = false; S.pr.tcur = 0; prLoad(); updateCtl(); },
          check() {
            const pr = S.pr;
            if (!pr.ran.light || !pr.ran.co2) return '두 시나리오(빛을 갑자기 끔, CO₂ 공급 중단)를 예측하고 ▶ 실행하기를 눌러 확인해요.';
            if (!pr.pass.light) return '빛을 갑자기 끔의 예측이 틀렸어요. 빛이 없으면 어떤 물질이 부족해질지 생각해 다시 실행해 보세요.';
            if (!pr.pass.co2) return 'CO₂ 공급 중단의 예측이 틀렸어요. CO₂를 붙잡는 분자가 어느 쪽일지 생각해 다시 실행해 보세요.';
            return true;
          },
          explain: '<b>빛을 끄면</b> ATP · NADPH가 줄어 3PG를 환원하지 못해 <b>3PG 증가, RuBP 감소</b>예요. <b>CO₂를 끊으면</b> RuBP가 CO₂를 붙잡지 못해 <b>RuBP 증가, 3PG 감소</b>예요. ATP · NADPH는 쓰이지 않아 늘어요.',
        },
        {
          id: 'run5', title: '시나리오 더 실행하기',
          goal: '시나리오를 <b>5가지 이상</b> 실행해 곡선을 확인하세요. (예측은 틀려도 괜찮아요)',
          hint: '시나리오 버튼을 누르고 세 가지 예측을 고른 뒤 ▶ 실행하기를 눌러요. 실행이 끝나야 인정돼요.',
          setup() { setMode('pred'); updateCtl(); },
          check: () => Object.keys(S.pr.ran).length >= 5, hold: 0.5,
          status: () => mark(Object.keys(S.pr.ran).length >= 5) + ' 실행한 시나리오 ' + Object.keys(S.pr.ran).length + ' / 5',
          explain: '효소 변성은 회로 전체를 멈추고, 물 공급 중단은 빛을 끈 것과 같고(조금 늦게), 두 조건을 동시에 주면 남은 ATP · NADPH로 3PG가 RuBP로 바뀐 뒤 멈춰요. 빛을 다시 켜면 회로가 되살아나요.',
        },
        {
          type: 'quiz', title: '빛을 끈 직후 3PG가 쌓이는 까닭',
          goal: '빛을 끈 직후 <b>3PG가 쌓이는 까닭</b>은?',
          setup() { setMode('pred'); },
          choices: ['환원에 필요한 ATP · NADPH가 부족해져 3PG가 G3P로 바뀌지 못하기 때문이다', 'CO₂가 더 많이 들어오기 때문이다', 'RuBP가 3PG를 더 빨리 만들기 때문이다', '루비스코가 빛에 의해 파괴되기 때문이다'],
          answer: 0,
          feedback: ['', 'CO₂ 공급은 그대로예요. 달라진 것은 빛이에요.', '3PG를 만드는 RuBP는 오히려 줄어요.', '효소는 빛이 아니라 높은 온도 등에서 변성돼요.'],
          explain: '빛이 없으면 명반응이 ATP · NADPH를 만들지 못해 3PG의 <b>환원</b>이 멈춰요. 그런데 CO₂ 고정은 한동안 계속되어 <b>3PG는 쌓이고 RuBP는 줄어요</b>. 반대로 CO₂를 끊으면 RuBP가 쌓여요.',
        },
      ],
    },
  ];

  cvReset(); lkInit();
  game = SciSim.game({
    simId: 'hy-carbon-fixation', mount: '#game', badge: '캘빈 회로 탐험가', homeHref: '../../index.html#hy',
    featureLabels: { cal: '🔄 탄소 구슬 캘빈 회로', need: '🧮 필요량 표와 천칭', link: '🔗 엽록체 순환 고리', pred: '🎯 조건 예측 그래프' },
    onFeatures() { updateCtl(); },
    levels,
  });

  function readouts() {
    const m = S.mode, cv = S.cv, nd = S.nd, lk = S.lk, pr = S.pr;
    if (m === 'cal') { const s = cvCount('R') * 5 + cvCount('X') * 6 + cvCount('P') * 3 + cvCount('G') * 3 + cvCount('O') * 3 + cvCount('C'); setReads(['고정한 CO₂', cv.fixed + ' / 3', '쓴 ATP · NADPH', cv.atp + ' · ' + cv.nadph, '탄소 구슬 합계', s + '개']); }
    else if (m === 'need') { const r = needRow(nd.n); setReads(['CO₂ 분자 수', nd.n + '분자', 'ATP · NADPH 필요', r.atp + ' · ' + r.nadph, '포도당', (r.glc === 0.5 ? '0.5' : r.glc === 1.5 ? '1.5' : fi(r.glc)) + '분자']); }
    else if (m === 'link') setReads(['빛 · CO₂', lk.L + ' · ' + lk.C, 'ATP · NADPH 저장', fi(lk.st.A * 100) + ' % · ' + fi(lk.st.N * 100) + ' %', '놓은 카드', lk.so.placed + ' / 4']);
    else { const cur = pr.traj ? pr.traj[Math.min(pr.traj.length - 1, Math.round(pr.tcur / PR_DT))] : null; setReads(['ATP · NADPH', cur ? fi(cur.an * 100) + ' %' : '—', '3PG', cur ? fi(cur.p * 100) + ' %' : '—', 'RuBP', cur ? fi(cur.r * 100) + ' %' : '—']); }
  }

  setMode('cal');
  let lastFree = false, lastLv = -1, uiT = 0;
  SciSim.loop((dt, t) => {
    clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (game && game.level !== lastLv) { lastLv = game.level; updateCtl(); }
    view.apply(); FX.update(dt); ctx.clearRect(0, 0, VW, VH);
    bgFill('#f3f6ee', '#e8eee2');
    updLater(dt);
    if (S.mode === 'cal') calDraw(dt, t); else if (S.mode === 'need') needDraw(dt, t); else if (S.mode === 'link') lkDraw(dt, t); else prDraw(dt, t);
    FX.draw(); parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(241,246,243,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : approach(S.fade, 0, dt, 9); }
    uiT += dt; if (uiT > 0.25) { uiT = 0; updateCtl(); }
    readouts();
  });

  window.__sim = { S, VW, VH, PHONE, get game() { return game; }, levels, setMode, cvGo, cvReset, lkInit, prGo, prSim, prKey, SCN, PM, poolStep, updateCtl };
})();
