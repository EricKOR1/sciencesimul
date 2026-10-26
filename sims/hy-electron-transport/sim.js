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
     고등학교 세포와 물질대사 · Ⅲ. 세포호흡과 광합성 - 전자 전달계 비교 (단원 58, 9차시)
     성취기준 [12세포03-07] 광합성과 세포호흡의 전자 전달계를 비교하여 공통점과 차이점을 다양한 매체를 활용하여 설명할 수 있다.
     ① 분석: 산화·환원  ② 모형: 나란히 보기  ③ 분석: 비교표  ④ 적용: 인포그래픽
     (에너지 · 효소 · 산화 환원 중심. 복합체별 반응 · H⁺ 펌프 수 · 산화 환원 전위표는 다루지 않아요)
     ========================================================= */
  const S = { mode: 'redox', fade: 0 };
  let game = null;
  const fi = (v) => String(Math.round(v));
  const D2R = Math.PI / 180;
  function pill(x, y, w, h, text, bg, fg, a) {
    ctx.save(); ctx.globalAlpha = a == null ? 1 : a; D.roundRect(x - w / 2, y - h / 2, w, h, h / 2); ctx.fillStyle = bg; ctx.fill(); ctx.strokeStyle = 'rgba(15,23,42,.28)'; ctx.lineWidth = 1; ctx.stroke();
    T(x, y + h * 0.33, text, h * 0.68, fg, 'center', 800); ctx.restore();
  }
  const ebead = (x, y, r, a) => { ctx.save(); if (a != null) ctx.globalAlpha = a; blit(sprite('eb' + Math.round(r), r * 4, r * 4, (cx, D2) => { cx.translate(r * 2, r * 2); D2.glow(0, 0, r * 1.9, '#facc15', 0.55); D2.sphere(0, 0, r, '#fde047', { gloss: false, text: 'e⁻', textColor: '#713f12', textScale: 0.95 }); }), x, y); ctx.restore(); };
  const sH = () => txtSprite('H1', 'H⁺', 11.5, '#c2410c', 800);

  /* =========================================================
     ① 산화 · 환원
     ========================================================= */
  const RX = [
    { id: 'rx1', from: 'NADH', to: 'NAD⁺', ans: 'lose', side: '호흡', col: '#0d9488', why: 'NADH는 전자를 내놓고 NAD⁺가 돼요. 전자를 잃었으니 산화예요.' },
    { id: 'rx2', from: 'O₂', to: 'H₂O', ans: 'gain', side: '호흡', col: '#0284c7', why: 'O₂는 전자를 받아 H₂O가 돼요. 전자를 얻었으니 환원이에요.' },
    { id: 'rx3', from: 'H₂O', to: 'O₂', ans: 'lose', side: '광합성', col: '#0ea5e9', why: '물은 전자를 내놓고 O₂가 돼요(광분해). 전자를 잃었으니 산화예요.' },
    { id: 'rx4', from: 'NADP⁺', to: 'NADPH', ans: 'gain', side: '광합성', col: '#db2777', why: 'NADP⁺는 전자를 받아 NADPH가 돼요. 전자를 얻었으니 환원이에요.' },
  ];
  S.rx = { t: 0, ok: [false, false, false, false], wrong: [false, false, false, false], vals: ['', '', '', ''] };
  const rxVal = (i) => $('#rx' + (i + 1)).value;
  function rxEval() {
    const r = S.rx; RX.forEach((q, i) => { const v = rxVal(i); const ok = v === q.ans; if (v && !ok && !r.wrong[i]) Sound.tick(); r.ok[i] = ok; r.wrong[i] = !!v && !ok; r.vals[i] = v; });
  }
  function rxG() {
    return PHONE ? { cards: (i) => ({ x: 10 + (i % 2) * 234, y: 10 + Math.floor(i / 2) * 132, w: 226, h: 124 }), L: { x: 10, y: 282, w: 460, h: 170 }, Rr: { x: 10, y: 460, w: 460, h: 170 } }
      : { cards: (i) => ({ x: 14 + i * 195, y: 14, w: 187, h: 206 }), L: { x: 14, y: 228, w: 382, h: 320 }, Rr: { x: 404, y: 228, w: 382, h: 320 } };
  }
  function molGlyph(name, x, y, col, big) {
    const r = big ? 21 : 18;
    if (name === 'O₂') { D.sphere(x - 11, y, 12, '#ef4444', { gloss: true }); D.sphere(x + 11, y, 12, '#ef4444', { gloss: true }); }
    else if (name === 'H₂O') { D.sphere(x, y - 2, 14, '#ef4444', { gloss: true }); D.sphere(x - 13, y + 11, 7.5, '#f8fafc', { gloss: true, outline: '#94a3b8' }); D.sphere(x + 13, y + 11, 7.5, '#f8fafc', { gloss: true, outline: '#94a3b8' }); }
    else { D.roundRect(x - 31, y - 17, 62, 34, 12); ctx.fillStyle = col; ctx.fill(); ctx.strokeStyle = 'rgba(15,23,42,.25)'; ctx.lineWidth = 1.5; ctx.stroke(); }
    T(x, y + (name === 'O₂' ? 30 : name === 'H₂O' ? 32 : 5), name, PHONE ? 13 : 14.5, name === 'O₂' || name === 'H₂O' ? '#1f2d44' : '#fff', 'center', 800);
  }
  function stairs(P, kind, t) {
    panel(P.x, P.y, P.w, P.h, 18, '#fff');
    const resp = kind === 'resp';
    T(P.x + 14, P.y + 24, resp ? '세포호흡: 전자가 계단을 내려가요' : '광합성: 빛이 전자를 두 번 올려 줘요', PHONE ? 13.5 : 15.5, resp ? '#9d174d' : '#166534', 'left', 800);
    const top = P.y + 56, bot = P.y + P.h - (PHONE ? 38 : 50), Y = (lv) => bot - lv * (bot - top);
    const nodes = resp
      ? [{ lv: 0.92, l: 'NADH' }, { lv: 0.7, l: '전달계' }, { lv: 0.5, l: '전달계' }, { lv: 0.3, l: '전달계' }, { lv: 0.08, l: 'O₂' }]
      : [{ lv: 0.06, l: 'H₂O' }, { lv: 0.6, l: '광계 Ⅱ', up: true }, { lv: 0.4, l: '전달계' }, { lv: 0.24, l: '광계 Ⅰ' }, { lv: 0.92, l: '광계 Ⅰ', up: true }, { lv: 0.74, l: '전달계' }, { lv: 0.58, l: 'NADP⁺' }];
    const n = nodes.length, x0 = P.x + 50, x1 = P.x + P.w - 30, xs = (i) => x0 + (x1 - x0) * i / (n - 1);
    D.arrow(P.x + 18, bot + 6, P.x + 18, top - 10, { color: '#94a3b8', width: 2.5, head: 9 }); T(P.x + 24, top - 12, '높음', 12, '#b45309', 'left', 800); T(P.x + 24, bot + 22, '낮음', 12, '#475569', 'left', 800);
    // 길
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = resp ? 'rgba(236,72,153,.28)' : 'rgba(34,197,94,.3)'; ctx.lineWidth = 8; ctx.beginPath(); nodes.forEach((q, i) => { if (i) ctx.lineTo(xs(i), Y(q.lv)); else ctx.moveTo(xs(i), Y(q.lv)); }); ctx.stroke(); ctx.restore();
    nodes.forEach((q, i) => { D.sphere(xs(i), Y(q.lv), 5, q.up ? '#f59e0b' : (resp ? '#ec4899' : '#22c55e'), { gloss: false }); const fs = PHONE ? 11.5 : 12.5; T(xs(i), Y(q.lv) + (i === 0 || (i === n - 1 && resp) ? 19 : (q.up ? -12 : 19)), q.l, fs, '#334155', 'center', 800, { stroke: 'rgba(255,255,255,.85)', strokeWidth: 3 }); });
    // 광자 화살표 (광합성)
    if (!resp) [1, 4].forEach((k) => { const a = nodes[k - 1], b = nodes[k], xx = xs(k); D.arrow(xx - 36, Y(b.lv) - 22, xx - 6, Y(b.lv) - 4, { color: '#f59e0b', width: 3, head: 9 }); T(xx - 40, Y(b.lv) - 26, '빛', 12.5, '#b45309', 'right', 800); });
    // 에너지 방출 표시와 전자
    const per = 4.2, u = ((t / per) % 1), seg = u * (n - 1), si = Math.min(n - 2, Math.floor(seg)), lp = seg - si;
    const a = nodes[si], b = nodes[si + 1], jump = b.up, e = jump ? SciSim.ease.outBack(clamp(lp, 0, 1)) : SciSim.ease.inOutSine(clamp(lp, 0, 1));
    const ex = xs(si) + (xs(si + 1) - xs(si)) * e, ey = Y(a.lv) + (Y(b.lv) - Y(a.lv)) * e;
    ebead(ex, ey, 8.5);
    if (!jump && lp > 0.15 && lp < 0.9) { for (let k = 0; k < 3; k++) { const off = k * 9 - 9; ctx.save(); ctx.globalAlpha = 0.85 * Math.sin(lp * Math.PI); ctx.strokeStyle = '#f97316'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(ex + 12, ey + off - 4); ctx.lineTo(ex + 18, ey + off); ctx.lineTo(ex + 24, ey + off - 4); ctx.lineTo(ex + 30, ey + off); ctx.stroke(); ctx.restore(); } T(ex + 36, ey + 4, '에너지 방출', PHONE ? 11.5 : 12.5, '#c2410c', 'left', 800, { alpha: Math.sin(lp * Math.PI), stroke: 'rgba(255,255,255,.9)', strokeWidth: 3 }); }
  }
  function redoxDraw(dt, t) {
    const g = rxG(), r = S.rx; r.t += dt;
    RX.forEach((q, i) => {
      const c = g.cards(i), ok = r.ok[i], bad = r.wrong[i];
      panel(c.x, c.y, c.w, c.h, 16, ok ? (q.ans === 'lose' ? '#fff1f2' : '#eff6ff') : '#fff');
      if (ok) { D.roundRect(c.x, c.y, c.w, c.h, 16); ctx.strokeStyle = q.ans === 'lose' ? '#e11d48' : '#2563eb'; ctx.lineWidth = 3; ctx.stroke(); }
      if (bad) { D.roundRect(c.x, c.y, c.w, c.h, 16); ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 3; ctx.setLineDash([6, 4]); ctx.stroke(); ctx.setLineDash([]); }
      pill(c.x + 22, c.y + 20, 32, 24, '①②③④'[i], '#1f2d44', '#fff'); T(c.x + 44, c.y + 25, q.side, PHONE ? 12.5 : 13.5, q.side === '호흡' ? '#9d174d' : '#166534', 'left', 800);
      const my = c.y + (PHONE ? 66 : 100), lx = c.x + (PHONE ? 52 : 50), rx = c.x + c.w - (PHONE ? 52 : 50);
      D.arrow(lx + 38, my, rx - 38, my, { color: '#64748b', width: 3, head: 10 });
      molGlyph(q.from, lx, my, q.col); molGlyph(q.to, rx, my, C.shade(q.col, 0.25));
      // 전자 구슬 두 개의 움직임
      const u = ((r.t * 0.45 + i * 0.19) % 1);
      for (let k = 0; k < 2; k++) {
        const d = clamp(u * 1.25 - k * 0.14, 0, 1); if (d <= 0 || d >= 1) continue;
        if (q.ans === 'lose') { const x = lx + 6 + (c.w - 40) * d * 0.9 * 0.8, y = my - 24 - Math.sin(d * Math.PI) * 28 - d * 12; ebead(x, y, 8, Math.min(1, Math.min(d, 1 - d) * 5)); }
        else { const x = c.x + 18 + (lx - c.x - 18 + 6) * d, y = my - 52 + (52 - 26) * d - Math.sin(d * Math.PI) * 6; ebead(x, y, 8, Math.min(1, Math.min(d, 1 - d) * 5)); }
      }
      if (ok) D.label(c.x + c.w / 2, c.y + c.h - (PHONE ? 20 : 26), q.ans === 'lose' ? '산화 (전자 잃음)' : '환원 (전자 얻음)', { bg: q.ans === 'lose' ? '#e11d48' : '#2563eb', color: '#fff', size: PHONE ? 13 : 14.5 });
      else if (bad) T(c.x + c.w / 2, c.y + c.h - (PHONE ? 14 : 20), '구슬이 어디로 가는지 봐요', PHONE ? 12 : 13, '#dc2626', 'center', 800);
      else T(c.x + c.w / 2, c.y + c.h - (PHONE ? 14 : 20), '전자 구슬의 움직임을 봐요', PHONE ? 12 : 13, '#64748b', 'center', 700);
    });
    stairs(g.L, 'resp', t); stairs(g.Rr, 'photo', t);
  }

  /* =========================================================
     ② 나란히 보기: 같은 막 단면 두 개
     ========================================================= */
  function memNew() { return { toks: [], hs: [], fl: [], ap: [], lk: [], pf: [0, 0, 0], spin: 0, spinV: 0, acc: 0, fAcc: 0, aAcc: 0, lAcc: 0, e: 1, g: 0.8, atp: 100 }; }
  function mG(P, kind) {
    const th = 24, y0 = P.y + 38, y1 = P.y + P.h - (PHONE ? 40 : 46), my = (y0 + y1) / 2;
    const cx = [0.17, 0.33, 0.49].map((f) => P.x + P.w * f), mito = kind === 'mito';
    const topR = { x: P.x + 8, y: y0, w: P.w - 16, h: my - th / 2 - 3 - y0 }, botR = { x: P.x + 8, y: my + th / 2 + 3, w: P.w - 16, h: y1 - (my + th / 2 + 3) };
    const start = mito ? { id: 'nadh', x: P.x + P.w * 0.1, y: my + th / 2 + 34, label: 'NADH' } : { id: 'h2o', x: P.x + P.w * 0.1, y: my - th / 2 - 34, label: 'H₂O' };
    const end = mito ? { id: 'o2', x: P.x + P.w * 0.62, y: my + th / 2 + 34, label: 'O₂' } : { id: 'nadp', x: P.x + P.w * 0.62, y: my + th / 2 + 34, label: 'NADP⁺' };
    return { P, kind, mito, th, my, cx, topR, botR, start, end, syn: P.x + P.w * 0.86, sc: PHONE ? 0.62 : 0.74, y0, y1 };
  }
  const inR = (p, r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
  function memUpdate(m, G, dt, prm) {
    const pts = [G.start, { x: G.cx[0], y: G.my }, { x: G.cx[1], y: G.my }, { x: G.cx[2], y: G.my }, G.end];
    m.e = RM ? prm.e : approach(m.e, prm.e, dt, 4); m.g = RM ? prm.g : approach(m.g, prm.g, dt, 2); m.atp = RM ? prm.atp : approach(m.atp, prm.atp, dt, 2.5);
    m.acc += dt * 0.85 * prm.e; while (m.acc >= 1) { m.acc -= 1; if (m.toks.length < 7) m.toks.push({ i: 0, p: 0, dead: 0, stuck: false }); }
    for (let k = m.toks.length - 1; k >= 0; k--) {
      const tk = m.toks[k];
      if (tk.stuck) { tk.dead += dt; if (tk.dead > 1.2) m.toks.splice(k, 1); continue; }
      tk.p += dt * Math.max(0.55, m.e) * 0.95;
      if (tk.p >= 1) {
        tk.i++; tk.p = 0;
        if (prm.block && tk.i === prm.block) { tk.stuck = true; tk.i = prm.block - 1; tk.p = 1; continue; }
        if (tk.i >= 4) { m.toks.splice(k, 1); continue; }
        const pump = G.mito ? true : tk.i === 2, water = !G.mito && tk.i === 1; if (pump || water) m.pf[tk.i - 1] = 1;
      }
    }
    m.pf = m.pf.map((v) => Math.max(0, v - dt * 2));
    const Ht = Math.round(14 * m.g), live = m.hs.filter((q) => !q.die).length, R = G.topR;
    for (let n = live; n < Ht; n++) m.hs.push({ x: R.x + 14 + Math.random() * (R.w - 28), y: R.y + 10 + Math.random() * (R.h - 20), vx: (Math.random() - 0.5) * 24, vy: (Math.random() - 0.5) * 24, a: 0, die: false });
    if (live > Ht) { let n = live - Ht; for (let i = 0; i < m.hs.length && n > 0; i++) if (!m.hs[i].die) { m.hs[i].die = true; n--; } }
    for (let i = m.hs.length - 1; i >= 0; i--) {
      const q = m.hs[i]; q.a = q.die ? q.a - dt * 1.5 : Math.min(1, q.a + dt * 2.5); if (q.a < 0) { m.hs.splice(i, 1); continue; }
      q.vx += (Math.random() - 0.5) * 80 * dt; q.vy += (Math.random() - 0.5) * 80 * dt; const sp = Math.hypot(q.vx, q.vy); if (sp > 30) { q.vx *= 30 / sp; q.vy *= 30 / sp; }
      q.x = clamp(q.x + q.vx * dt, R.x + 8, R.x + R.w - 8); q.y = clamp(q.y + q.vy * dt, R.y + 8, R.y + R.h - 6);
      if (Math.abs(q.x - G.syn) < 22 * G.sc + 4 && q.y > R.y + R.h - 26 * G.sc - 8) q.y = R.y + R.h - 26 * G.sc - 8;
    }
    m.fAcc += dt * 2.6 * m.atp / 100; while (m.fAcc >= 1) { m.fAcc -= 1; m.fl.push({ t: 0 }); }
    m.aAcc += dt * 1.2 * m.atp / 100; while (m.aAcc >= 1) { m.aAcc -= 1; m.ap.push({ t: 0 }); }
    for (let i = m.fl.length - 1; i >= 0; i--) { m.fl[i].t += dt / 0.9; if (m.fl[i].t >= 1) m.fl.splice(i, 1); }
    for (let i = m.ap.length - 1; i >= 0; i--) { m.ap[i].t += dt / 1.6; if (m.ap[i].t >= 1) m.ap.splice(i, 1); }
    if (prm.leak) { m.lAcc += dt * 3.2; while (m.lAcc >= 1) { m.lAcc -= 1; m.lk.push({ t: 0, x: G.P.x + 40 + Math.random() * (G.P.w * 0.66) }); } }
    for (let i = m.lk.length - 1; i >= 0; i--) { m.lk[i].t += dt / 0.9; if (m.lk[i].t >= 1) m.lk.splice(i, 1); }
    m.spinV = approach(m.spinV, 7 * m.atp / 100, dt, 5); m.spin += m.spinV * dt;
    m.pts = pts;
  }
  function memDraw(m, G, t, o) {
    o = o || {}; const P = G.P, th = G.th, my = G.my, sc = G.sc, mito = G.mito, fs = PHONE ? 12 : 13.5;
    panel(P.x, P.y, P.w, P.h, 18, '#fffdf7');
    D.label(P.x + P.w / 2, P.y + 20, mito ? '세포호흡 · 미토콘드리아 내막' : '광합성 · 틸라코이드 막', { bg: mito ? '#be185d' : '#15803d', color: '#fff', size: PHONE ? 14 : 15.5 });
    D.roundRect(G.topR.x, G.topR.y, G.topR.w, G.topR.h, 12); ctx.fillStyle = 'rgba(251,208,150,.5)'; ctx.fill();
    D.roundRect(G.botR.x, G.botR.y, G.botR.w, G.botR.h, 12); ctx.fillStyle = mito ? '#fbeab0' : '#d9f0cb'; ctx.fill();
    ctx.fillStyle = 'rgba(244,114,182,.3)'; ctx.fillRect(P.x + 8, my - th / 2, P.w - 16, th);
    for (let x = P.x + 14; x < P.x + P.w - 10; x += 12) { D.sphere(x, my - th / 2 + 2, 4, '#f472b6', { gloss: false }); D.sphere(x, my + th / 2 - 2, 4, '#f472b6', { gloss: false }); }
    // 복합체
    const names = mito ? ['전달계', '전달계', '전달계'] : ['광계 Ⅱ', '전달계', '광계 Ⅰ'], cols = mito ? ['#a5b4fc', '#a5b4fc', '#a5b4fc'] : ['#86efac', '#c4b5fd', '#86efac'], bcols = mito ? ['#4f46e5', '#4f46e5', '#4f46e5'] : ['#15803d', '#6d28d9', '#15803d'];
    const cw = PHONE ? 50 : 60;
    G.cx.forEach((cx, k) => {
      if (m.pf[k] > 0.05) D.glow(cx, my, 42, '#fb923c', m.pf[k] * 0.6);
      D.roundRect(cx - cw / 2, my - th / 2 - 9, cw, th + 18, 14); ctx.fillStyle = cols[k]; ctx.fill(); ctx.strokeStyle = bcols[k]; ctx.lineWidth = 2.5; ctx.stroke();
      T(cx, my + 4.5, names[k], PHONE ? 11 : 12, '#1f2d44', 'center', 800);
      if (!mito && k !== 1) E('☀', cx - cw / 2 + 4, my - th / 2 - 22, PHONE ? 16 : 19);
      if ((mito ? true : k === 1) && m.pf[k] > 0.05) D.arrow(cx, my - th / 2 - 11, cx, my - th / 2 - 36, { color: '#ea580c', width: 3, head: 9, alpha: m.pf[k] });
    });
    // ATP 합성 효소 (위: H⁺ 많은 쪽)
    const sx = G.syn;
    ctx.save(); ctx.translate(sx, my); ctx.fillStyle = 'rgba(253,230,138,.55)'; ctx.fillRect(-14 * sc, -th / 2 - 22 * sc, 28 * sc, th + 22 * sc); ctx.strokeStyle = '#a16207'; ctx.lineWidth = 2; ctx.strokeRect(-14 * sc, -th / 2 - 22 * sc, 28 * sc, th + 22 * sc);
    ctx.beginPath(); ctx.ellipse(0, 0, 30 * sc, th / 2 + 7 * sc, 0, 0, TAU); ctx.fillStyle = '#fde68a'; ctx.fill(); ctx.stroke();
    ctx.save(); ctx.rotate(m.spin); for (let k = 0; k < 6; k++) { ctx.rotate(TAU / 6); ctx.fillStyle = k % 2 ? '#f59e0b' : '#d97706'; ctx.fillRect(4 * sc, -2.5 * sc, 20 * sc, 5 * sc); } ctx.restore();
    ctx.fillStyle = '#d97706'; ctx.fillRect(-5 * sc, th / 2, 10 * sc, 20 * sc); ctx.restore();
    D.sphere(sx, my + th / 2 + 44 * sc, 22 * sc, '#fbbf24', { gloss: true, outline: '#a16207', outlineWidth: 1.5 });
    T(sx, my + th / 2 + 44 * sc + 60, 'ATP 합성 효소', PHONE ? 11.5 : 12.5, '#92400e', 'center', 800, { stroke: 'rgba(255,253,247,.9)', strokeWidth: 3 });
    // H⁺ 점
    const sp = sH(); m.hs.forEach((q) => blit(sp, q.x, q.y, Math.max(0, q.a)));
    m.fl.forEach((f) => { const y = my - th / 2 - 22 * sc + f.t * (th + 30 * sc); blit(txtSprite('H2', 'H⁺', 12, '#ea580c', 800, 'rgba(255,253,247,.85)'), sx, y, Math.sin(Math.min(1, f.t * 1.1) * Math.PI * 0.95)); });
    m.ap.forEach((f) => { const e = f.t, x = sx - 6 - e * 10, y = my + th / 2 + 44 * sc + 6 + e * 26; ctx.save(); ctx.globalAlpha = 1 - e * e; pill(x, y, 40, 18, 'ATP', '#facc15', '#713f12'); ctx.restore(); });
    m.lk.forEach((f) => { const y = my - th / 2 - 30 + f.t * (th + 70); ctx.save(); ctx.globalAlpha = Math.sin(f.t * Math.PI); T(f.x, y, 'H⁺', 12, '#c2410c', 'center', 800); ctx.restore(); });
    // 칸 이름
    const stk = { stroke: 'rgba(255,253,247,.9)', strokeWidth: 4 };
    T(G.topR.x + 10, G.topR.y + 18, mito ? '막 사이 공간' : '틸라코이드 내부', fs, '#9a5b12', 'left', 800, stk);
    T(G.botR.x + 10, G.botR.y + G.botR.h - 8, mito ? '기질' : '스트로마', fs, mito ? '#8a6410' : '#3f6212', 'left', 800, stk);
    // 시작 · 끝 분자
    [G.start, G.end].forEach((e2) => {
      const nm = e2.label; if (nm === 'O₂') { D.sphere(e2.x - 9, e2.y, 8.5, '#ef4444', { gloss: true }); D.sphere(e2.x + 9, e2.y, 8.5, '#ef4444', { gloss: true }); T(e2.x, e2.y + 25, 'O₂', fs + 1, '#b91c1c', 'center', 800, stk); }
      else if (nm === 'H₂O') { D.sphere(e2.x, e2.y - 2, 9.5, '#ef4444', { gloss: true }); D.sphere(e2.x - 9.5, e2.y + 7, 5.5, '#f8fafc', { gloss: true, outline: '#94a3b8' }); D.sphere(e2.x + 9.5, e2.y + 7, 5.5, '#f8fafc', { gloss: true, outline: '#94a3b8' }); T(e2.x, e2.y - 20, 'H₂O', fs + 1, '#0369a1', 'center', 800, stk); }
      else { D.roundRect(e2.x - 30, e2.y - 15, 60, 30, 11); ctx.fillStyle = nm === 'NADH' ? '#34d399' : '#f9a8d4'; ctx.fill(); ctx.strokeStyle = 'rgba(15,23,42,.3)'; ctx.lineWidth = 1.5; ctx.stroke(); T(e2.x, e2.y + 5, nm, fs, '#1f2d44', 'center', 800); }
    });
    // 전자
    m.toks.forEach((tk) => {
      const a = m.pts[tk.i], b = m.pts[tk.i + 1]; if (!a || !b) return; const e = SciSim.ease.inOutSine(clamp(tk.p, 0, 1)), x = a.x + (b.x - a.x) * e, y = a.y + (b.y - a.y) * e;
      ebead(x, y, 7.5, tk.stuck ? 1 - clamp(tk.dead / 1.2, 0, 1) : 1); if (tk.stuck) T(x + 14, y - 14, '✖', 16, '#dc2626', 'center', 800, { alpha: 1 - clamp(tk.dead / 1.2, 0, 1) });
    });
    if (o.block) { const bx = G.cx[o.block - 1] + (o.block === 1 ? cw / 2 : 0); D.sphere(bx, my - th / 2 - 4, 12, '#dc2626', { gloss: false, text: '✖' }); T(bx, my + th / 2 + 24, '막힘', 12, '#b91c1c', 'center', 800); }
  }
  /* ---- 표시 도구 ---- */
  S.sd = { tool: 'h', hm: { L: null, R: null }, am: { L: null, R: null }, em: { nadh: 0, o2: 0, h2o: 0, nadp: 0 }, mL: memNew(), mR: memNew(), shake: {} };
  function sdG() {
    return PHONE ? { L: { x: 10, y: 10, w: 460, h: 306 }, R: { x: 10, y: 324, w: 460, h: 306 }, B: null } : { L: { x: 14, y: 14, w: 382, h: 424 }, R: { x: 404, y: 14, w: 382, h: 424 }, B: { x: 14, y: 446, w: 772, h: 102 } };
  }
  const sdOK = () => ({ h: S.sd.hm.L === 'top' && S.sd.hm.R === 'top', a: S.sd.am.L === 'bot' && S.sd.am.R === 'bot', e: S.sd.em.nadh === 1 && S.sd.em.o2 === 2 && S.sd.em.h2o === 1 && S.sd.em.nadp === 2 });
  const sdHok = (s) => S.sd.hm[s] === 'top', sdAok = (s) => S.sd.am[s] === 'bot';
  const EM_NAME = ['', '출발', '도착'];
  function sdClear() { const sd = S.sd; sd.hm = { L: null, R: null }; sd.am = { L: null, R: null }; sd.em = { nadh: 0, o2: 0, h2o: 0, nadp: 0 }; updateCtl(); }
  const sdPT = {
    down(p) {
      const sd = S.sd, g = sdG(); let hit = false;
      [['L', g.L, 'mito'], ['R', g.R, 'chl']].forEach(([s, P, kind]) => {
        if (hit) return; const G = mG(P, kind);
        if (sd.tool === 'e') {
          [G.start, G.end].forEach((e2) => { if (hit) return; const r = { x: e2.x - 40, y: e2.y - 26, w: 80, h: 56 }; if (inR(p, r)) { sd.em[e2.id] = (sd.em[e2.id] + 1) % 3; Sound.click(); hit = true; sdFeedback(); } });
        } else if (inR(p, G.topR) || inR(p, G.botR)) {
          const side = inR(p, G.topR) ? 'top' : 'bot', key = sd.tool === 'h' ? 'hm' : 'am';
          sd[key][s] = sd[key][s] === side ? null : side; Sound.click(); hit = true; sdFeedback();
        }
      });
      updateCtl(); return hit;
    },
    hover(p) { const g = sdG(); return inR(p, g.L) || inR(p, g.R) ? 'pointer' : 'default'; },
  };
  let sdFbT = 0;
  function sdFeedback() {
    const sd = S.sd;
    if (sd.tool === 'h') { const ok = sdOK().h; if (sd.hm.L && sd.hm.R && !ok) showHint('H⁺는 펌프되어 올라온 쪽, 즉 그림의 위쪽 칸에 쌓여요.', 3600); else if (ok) showHint('두 막 모두 H⁺가 위쪽(막 사이 공간 · 틸라코이드 내부)에 쌓여요.', 3600); }
    else if (sd.tool === 'a') { const ok = sdOK().a; if (sd.am.L && sd.am.R && !ok) showHint('ATP 합성 효소의 머리는 H⁺가 흘러나오는 아래쪽 칸에 있어요.', 3600); else if (ok) showHint('두 막 모두 ATP는 아래쪽(기질 · 스트로마) 쪽에 만들어져요.', 3600); }
    else { const n = Object.keys(S.sd.em).filter((k) => S.sd.em[k]).length; if (n >= 4 && !sdOK().e) showHint('전자는 물질에서 시작해(출발) 마지막 수용체에 도착해요.', 3600); }
  }
  function tagPill(x, y, text, bg, fg, a) { pill(x, y, text.length * (PHONE ? 11 : 12) + 22, PHONE ? 22 : 24, text, bg, fg, a); }
  function sdDraw(dt, t) {
    const g = sdG(), sd = S.sd, GL = mG(g.L, 'mito'), GR = mG(g.R, 'chl');
    memUpdate(sd.mL, GL, dt, { e: 1, g: 0.8, atp: 100 }); memUpdate(sd.mR, GR, dt, { e: 1, g: 0.8, atp: 100 });
    memDraw(sd.mL, GL, t); memDraw(sd.mR, GR, t);
    // 표시
    const hotC = sd.tool === 'h' ? '#f97316' : sd.tool === 'a' ? '#eab308' : '#6366f1';
    [['L', GL], ['R', GR]].forEach(([s, G]) => {
      const hmk = sd.hm[s], amk = sd.am[s];
      if (hmk) { const r = hmk === 'top' ? G.topR : G.botR; D.roundRect(r.x + 2, r.y + 2, r.w - 4, r.h - 4, 10); ctx.strokeStyle = '#f97316'; ctx.lineWidth = 3.5; ctx.stroke(); tagPill(s === 'L' ? r.x + r.w - 52 : r.x + 52, r.y + (hmk === 'top' ? 22 : 22), 'H⁺ 많음', '#f97316', '#fff'); }
      if (amk) { const r = amk === 'top' ? G.topR : G.botR; D.roundRect(r.x + 5, r.y + 5, r.w - 10, r.h - 10, 10); ctx.strokeStyle = '#eab308'; ctx.lineWidth = 3.5; ctx.setLineDash([8, 5]); ctx.stroke(); ctx.setLineDash([]); tagPill(s === 'L' ? r.x + r.w - 56 : r.x + 56, r.y + r.h - 22, 'ATP 합성', '#facc15', '#713f12'); }
      [G.start, G.end].forEach((e2) => { const v = sd.em[e2.id]; if (v) { const ok = (e2.id === 'nadh' || e2.id === 'h2o') ? v === 1 : v === 2; D.roundRect(e2.x - 38, e2.y - 25, 76, 50, 12); ctx.strokeStyle = v === 1 ? '#2563eb' : '#dc2626'; ctx.lineWidth = 3; ctx.stroke(); tagPill(e2.x, e2.y - (e2.y < G.my ? 36 : -38), EM_NAME[v], v === 1 ? '#2563eb' : '#dc2626', '#fff'); } });
      if (sd.tool === 'e') [G.start, G.end].forEach((e2) => { if (!sd.em[e2.id]) { ctx.save(); ctx.globalAlpha = 0.5 + 0.4 * Math.sin(t * 5); D.roundRect(e2.x - 38, e2.y - 25, 76, 50, 12); ctx.strokeStyle = '#6366f1'; ctx.lineWidth = 2.5; ctx.setLineDash([5, 4]); ctx.stroke(); ctx.restore(); } });
      else { const rs = [G.topR, G.botR]; ctx.save(); ctx.globalAlpha = 0.5 + 0.4 * Math.sin(t * 4); rs.forEach((r) => { const used = (sd.tool === 'h' ? hmk : amk); if (!used) { D.roundRect(r.x + 3, r.y + 3, r.w - 6, r.h - 6, 10); ctx.strokeStyle = hotC; ctx.lineWidth = 2; ctx.setLineDash([5, 5]); ctx.stroke(); } }); ctx.restore(); }
    });
    // 같은 색 선 (짝이 맞으면)
    const ok = sdOK();
    const link = (a, b, col, wd) => { ctx.save(); ctx.strokeStyle = col; ctx.globalAlpha = 0.95; ctx.lineWidth = wd; ctx.setLineDash([3, 6]); ctx.lineCap = 'round'; ctx.lineDashOffset = -t * 20; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); ctx.restore(); };
    if (!PHONE) {
      if (ok.h) link({ x: GL.topR.x + GL.topR.w - 52 + 40, y: GL.topR.y + 22 }, { x: GR.topR.x + 52 - 40, y: GR.topR.y + 22 }, '#f97316', 4.5);
      if (ok.a) link({ x: GL.botR.x + GL.botR.w - 56 + 46, y: GL.botR.y + GL.botR.h - 22 }, { x: GR.botR.x + 56 - 46, y: GR.botR.y + GR.botR.h - 22 }, '#eab308', 4.5);
      const B = g.B; panel(B.x, B.y, B.w, B.h, 16, '#fff');
      const rows = [[ok.h, '#f97316', '💧 H⁺가 많이 쌓이는 쪽', '막 사이 공간  =  틸라코이드 내부'], [ok.a, '#eab308', '🟡 ATP가 만들어지는 쪽', '기질  =  스트로마'], [ok.e, '#6366f1', '⚡ 전자의 출발 → 도착', 'NADH · 물에서 출발  →  O₂ · NADP⁺에 도착']];
      rows.forEach((r, i) => { const y = B.y + 30 + i * 30; D.roundRect(B.x + 12, y - 15, B.w - 24, 26, 8); ctx.fillStyle = r[0] ? C.rgba(r[1], 0.15) : 'rgba(148,163,184,.10)'; ctx.fill(); D.sphere(B.x + 28, y - 2, 6, r[0] ? r[1] : '#cbd5e1', { gloss: false }); T(B.x + 44, y + 3, r[2], 14, r[0] ? '#1f2d44' : '#94a3b8', 'left', 800); T(B.x + 270, y + 3, r[0] ? r[3] : '?  표시하면 짝이 이어져요', 14, r[0] ? '#1f2d44' : '#94a3b8', 'left', 800); });
    }
  }

  /* =========================================================
     ③ 비교표 · 에너지 효율 · 억제제
     ========================================================= */
  const TBL = [
    { k: '장소', L: '미토콘드리아 내막', R: '틸라코이드 막', X: ['미토콘드리아 기질', '엽록체 스트로마'] },
    { k: '에너지 입력', L: '유기물의 화학 에너지', R: '빛에너지', X: ['열에너지', 'ATP의 화학 에너지'] },
    { k: '전자의 출발', L: 'NADH · FADH₂', R: '물 (광분해)', X: ['O₂', 'NADP⁺'] },
    { k: '전자의 에너지', L: '높음 → 낮음 (내려가며 방출)', R: '빛으로 두 번 올린 뒤 내려감', X: ['낮음 → 높음 (계속 흡수)', '변하지 않음'] },
    { k: '최종 전자 수용체', L: 'O₂ (→ H₂O)', R: 'NADP⁺ (→ NADPH)', X: ['NAD⁺', 'H₂O'] },
    { k: 'H⁺ 펌프 방향', L: '기질 → 막 사이 공간', R: '스트로마 → 틸라코이드 내부', X: ['막 사이 공간 → 기질', '틸라코이드 내부 → 스트로마'] },
    { k: 'H⁺ 이동 · ATP', L: 'H⁺ 막 사이 공간 → 기질, ATP는 기질 쪽', R: 'H⁺ 내부 → 스트로마, ATP는 스트로마 쪽', X: ['H⁺ 기질 → 막 사이 공간, ATP는 막 사이 공간 쪽', 'H⁺ 스트로마 → 내부, ATP는 틸라코이드 내부 쪽'] },
    { k: '인산화 이름', L: '산화적 인산화', R: '광인산화', X: ['기질 수준 인산화', '탈인산화'] },
    { k: '산물', L: 'ATP, H₂O', R: 'ATP, NADPH, O₂', X: ['ATP, NADH', 'ATP, CO₂'] },
    { k: '전체 에너지 방향', L: '에너지 방출 (이화)', R: '에너지 흡수 · 저장 (동화)', X: ['에너지 흡수 · 저장 (이화)', '에너지 방출 (동화)'] },
  ];
  const TBL_ORDER = [[2, 0, 3, 1], [1, 3, 0, 2], [3, 1, 2, 0], [0, 2, 1, 3], [2, 3, 0, 1], [1, 0, 3, 2], [3, 2, 1, 0], [0, 3, 2, 1], [2, 1, 3, 0], [1, 2, 0, 3]];
  const tblOpts = (i) => { const r = TBL[i], all = [r.L, r.R, r.X[0], r.X[1]]; return TBL_ORDER[i].map((j) => all[j]); };
  S.tb = { view: 'tbl', row: 0, sel: TBL.map(() => ({ l: '', r: '' })), ihOn: false };
  const tbOK = (i, s) => S.tb.sel[i][s] === TBL[i][s === 'l' ? 'L' : 'R'];
  const tbDone = () => TBL.filter((_, i) => tbOK(i, 'l') && tbOK(i, 'r')).length;
  function tbLoadRow() {
    const i = S.tb.row, opts = tbOpts_cache(i), s = S.tb.sel[i];
    ['tbL', 'tbR'].forEach((id) => { const e = $('#' + id); e.innerHTML = '<option value="">? 고르기</option>' + opts.map((o) => '<option value="' + o + '">' + o + '</option>').join(''); });
    $('#tbL').value = s.l; $('#tbR').value = s.r; $('#tbRowName').textContent = (i + 1) + '. ' + TBL[i].k;
  }
  const tbOpts_cache = (i) => tblOpts(i);
  function tbG() {
    return PHONE ? { T: { x: 10, y: 10, w: 460, h: 620 } } : { T: { x: 14, y: 14, w: 772, h: 534 } };
  }
  S.tb.fx = 0;
  const tbPT = {
    down(p) {
      if (S.tb.view !== 'tbl') return false; const g = tbG(), T0 = g.T, y0 = T0.y + 56, rh = PHONE ? 53 : 46;
      if (p.y >= y0 && p.y < y0 + rh * TBL.length && p.x >= T0.x && p.x <= T0.x + T0.w) { S.tb.row = clamp(Math.floor((p.y - y0) / rh), 0, TBL.length - 1); Sound.click(); tbLoadRow(); updateCtl(); return true; }
      return false;
    },
    hover(p) { return S.tb.view === 'tbl' ? 'pointer' : 'default'; },
  };
  function wrapT(x, y, w, str, size, color, lh, weight, maxLines) {
    const ls = wrap(str, w, size, weight || 800).slice(0, maxLines || 2); const off = ls.length === 1 ? 0 : -lh / 2 + 1;
    ls.forEach((l, i) => T(x, y + off + i * lh, l, size, color, 'center', weight || 800)); return ls.length;
  }
  function tblDraw(dt, t) {
    const g = tbG(), T0 = g.T; panel(T0.x, T0.y, T0.w, T0.h, 18, '#fff');
    const cw0 = PHONE ? 92 : 150, cw = (T0.w - 20 - cw0) / 2, x0 = T0.x + 10, y0 = T0.y + 56, rh = PHONE ? 53 : 46;
    D.roundRect(x0, T0.y + 14, cw0 - 3, 36, 8); ctx.fillStyle = '#e2e8f0'; ctx.fill(); T(x0 + (cw0 - 3) / 2, T0.y + 38, '비교 항목', PHONE ? 13 : 14, '#334155', 'center', 800);
    [['세포호흡 (미토콘드리아 내막)', '#fce7f3', '#9d174d'], ['광합성 (틸라코이드 막)', '#dcfce7', '#166534']].forEach(([nm, bg, fg], k) => { D.roundRect(x0 + cw0 + k * cw, T0.y + 14, cw - 3, 36, 8); ctx.fillStyle = bg; ctx.fill(); TF(x0 + cw0 + k * cw + (cw - 3) / 2, T0.y + 38, PHONE ? nm.replace(/ \(.*\)/, '') : nm, cw - 10, PHONE ? 13.5 : 14.5, 11, fg, 'center', 800); });
    TBL.forEach((r, i) => {
      const y = y0 + i * rh, sel = S.tb.row === i && S.tb.view === 'tbl';
      D.roundRect(x0, y, T0.w - 20, rh - 4, 8); ctx.fillStyle = sel ? 'rgba(250,204,21,.22)' : (i % 2 ? 'rgba(148,163,184,.07)' : 'rgba(148,163,184,.13)'); ctx.fill(); if (sel) { ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 2.5; ctx.stroke(); }
      TF(x0 + (cw0 - 3) / 2, y + rh / 2 + 3, (i + 1) + '. ' + r.k, cw0 - 12, PHONE ? 12.5 : 14, 10.5, '#334155', 'center', 800);
      ['l', 'r'].forEach((s, k) => {
        const val = S.tb.sel[i][s], ok = tbOK(i, s), cx = x0 + cw0 + k * cw + (cw - 3) / 2;
        if (!val) { T(cx, y + rh / 2 + 6, '?', 20, '#cbd5e1', 'center', 800); return; }
        const fs = PHONE ? 11.5 : 12.5; D.roundRect(x0 + cw0 + k * cw + 2, y + 2, cw - 7, rh - 8, 7); ctx.fillStyle = ok ? 'rgba(34,197,94,.16)' : 'rgba(239,68,68,.14)'; ctx.fill();
        wrapT(cx, y + rh / 2 + 3, cw - 16, val, fs, ok ? '#14532d' : '#b91c1c', fs + 3, 800, 2);
      });
    });
    T(T0.x + T0.w - 14, T0.y + T0.h - 10, '완성한 칸 ' + tbDone() * 2 + ' / 20', PHONE ? 12.5 : 14, '#64748b', 'right', 800);
  }
  /* ---- 에너지 효율 ---- */
  function effDraw(dt, t) {
    const T1 = PHONE ? { x: 10, y: 10, w: 460, h: 230 } : { x: 14, y: 14, w: 772, h: 214 }, T2 = PHONE ? { x: 10, y: 248, w: 460, h: 168 } : { x: 14, y: 236, w: 772, h: 150 }, T3 = PHONE ? { x: 10, y: 424, w: 460, h: 206 } : { x: 14, y: 394, w: 772, h: 154 };
    S.tb.fx = RM ? 1 : approach(S.tb.fx, 1, dt, 1.4);
    panel(T1.x, T1.y, T1.w, T1.h, 18, '#fff'); T(T1.x + 14, T1.y + 26, 'NADH 1개(전자 2개)가 O₂까지 내려갈 때 방출하는 에너지 약 220 kJ/mol', PHONE ? 13 : 15.5, '#1f2d44', 'left', 800);
    const bx = T1.x + 20, bw = T1.w - 40, by = T1.y + (PHONE ? 80 : 74), bh = PHONE ? 44 : 52, w76 = bw * 76 / 220 * S.tb.fx;
    D.roundRect(bx, by, bw, bh, 12); ctx.fillStyle = '#fed7aa'; ctx.fill(); ctx.strokeStyle = '#ea580c'; ctx.lineWidth = 2; ctx.stroke();
    if (w76 > 6) { D.roundRect(bx, by, w76, bh, 12); ctx.fillStyle = '#facc15'; ctx.fill(); ctx.strokeStyle = '#a16207'; ctx.lineWidth = 2; ctx.stroke(); }
    T(bx + bw / 2 + w76 / 2, by + bh * 0.64, '열 등으로 나가는 에너지 ' + (220 - 76) + ' kJ', PHONE ? 13 : 16, '#9a3412', 'center', 800);
    if (w76 > 40) T(bx + w76 / 2, by + bh * 0.64, '76', PHONE ? 15 : 18, '#713f12', 'center', 800);
    T(bx, by - 8, '220 kJ (전체)', PHONE ? 12.5 : 13.5, '#9a3412', 'left', 800); T(bx, by + bh + 24, PHONE ? 'ATP로 저장: 약 76 kJ (ATP 약 2.5개)' : 'ATP로 저장: 약 76 kJ (ATP 약 2.5개 × 약 30.5 kJ)', PHONE ? 13 : 14.5, '#a16207', 'left', 800);
    for (let k = 0; k < 3; k++) { if (S.tb.fx > 0.3) pill(bx + (PHONE ? 270 : 400) + k * 52, by + bh + 19, k < 2 ? 44 : 30, 20, k < 2 ? 'ATP' : '½', '#facc15', '#713f12'); }
    T(bx, T1.y + T1.h - 14, '효율(%) = ATP로 저장된 에너지 / 방출된 에너지 × 100', PHONE ? 12.5 : 14, '#475569', 'left', 800);
    panel(T2.x, T2.y, T2.w, T2.h, 18, '#fff'); T(T2.x + 14, T2.y + 26, '광합성(비순환 전자 흐름): 전자 4개(물 2분자 → O₂ 1분자)마다', PHONE ? 13 : 15, '#166534', 'left', 800);
    const ty = T2.y + (PHONE ? 64 : 62); for (let k = 0; k < 8; k++) { const x = T2.x + 24 + k * (PHONE ? 22 : 30); D.glow(x, ty, 14, '#fde047', 0.7); D.sphere(x, ty, PHONE ? 6 : 8, '#facc15', { gloss: true }); }
    T(T2.x + 24, ty + 28, '광자 8개', PHONE ? 13 : 14.5, '#a16207', 'left', 800);
    D.arrow(T2.x + (PHONE ? 206 : 276), ty, T2.x + (PHONE ? 262 : 330), ty, { color: '#64748b', width: 3.5, head: 10 });
    D.label(T2.x + (PHONE ? 330 : 400), ty, 'NADPH 2개', { bg: '#f472b6', color: '#fff', size: PHONE ? 14 : 16 }); D.label(T2.x + (PHONE ? 330 : 400) + (PHONE ? 0 : 140), ty + (PHONE ? 30 : 0), 'ATP 약 3개', { bg: '#facc15', color: '#713f12', size: PHONE ? 14 : 16 });
    T(T2.x + 14, T2.y + T2.h - 14, '두 과정 모두 전자가 에너지 준위를 내려가며 방출한 에너지로 ATP를 만들어요.', PHONE ? 12 : 13.5, '#475569', 'left', 700);
    panel(T3.x, T3.y, T3.w, T3.h, 18, '#fff'); T(T3.x + 14, T3.y + 26, '계산해 봐요', PHONE ? 14 : 15.5, '#1f2d44', 'left', 800);
    T(T3.x + 14, T3.y + 56, '76 / 220 × 100 =', PHONE ? 17 : 20, '#334155', 'left', 800);
    const v = numOf('efP'); T(T3.x + (PHONE ? 178 : 218), T3.y + 56, isNaN(v) ? '?  %' : v + ' %', PHONE ? 19 : 22, isNaN(v) ? '#94a3b8' : (v >= 34 && v <= 36 ? '#16a34a' : '#1f2d44'), 'left', 800);
    textBlock(T3.x + 14, T3.y + 86, T3.w - 28, '나머지 에너지는 열 등으로 나가요. 이 열이 우리 체온을 유지하는 데에도 쓰여요.', PHONE ? 12.5 : 14, '#475569', PHONE ? 17 : 20, 700);
  }
  /* ---- 억제제 실험 ---- */
  const IHP = {
    none: { L: { e: 1, g: 0.8, atp: 100 }, R: { e: 1, g: 0.8, atp: 100 }, name: '처리 없음' },
    cn: { L: { e: 0, g: 0.04, atp: 0, block: 3 }, R: { e: 1, g: 0.8, atp: 100 }, name: '시안화물' },
    db: { L: { e: 1, g: 0.8, atp: 100 }, R: { e: 0, g: 0.04, atp: 5, block: 1 }, name: 'DCMU' },
    un: { L: { e: 1.5, g: 0.12, atp: 20, leak: true }, R: { e: 1.5, g: 0.12, atp: 20, leak: true }, name: '짝풀림제' },
  };
  const IHANS = { cn: { L: 'low', R: 'ok' }, db: { L: 'ok', R: 'low' }, un: { L: 'low', R: 'low' } };
  S.ih = { tr: 'none', rec: { cn: false, db: false, un: false }, settle: 0, mL: memNew(), mR: memNew(), val: { L: new Num(100), R: new Num(100) }, ack: {} };
  function ihG() {
    return PHONE ? { L: { x: 10, y: 10, w: 460, h: 270 }, R: { x: 10, y: 288, w: 460, h: 270 }, Tb: { x: 10, y: 566, w: 460, h: 64 } } : { L: { x: 14, y: 14, w: 382, h: 392 }, R: { x: 404, y: 14, w: 382, h: 392 }, Tb: { x: 14, y: 414, w: 772, h: 134 } };
  }
  const ihOKnow = () => { const ih = S.ih, p = IHP[ih.tr]; return Math.abs(ih.val.L.v - p.L.atp) < 1.5 && Math.abs(ih.val.R.v - p.R.atp) < 1.5; };
  function ihSet(tr) { const ih = S.ih; if (ih.tr === tr) return; ih.tr = tr; ih.settle = 0; Sound.click(); if (tr === 'cn') showHint('시안화물: 호흡의 전자 전달 마지막 단백질을 막아요.', 3200); else if (tr === 'db') showHint('DCMU(제초제 성분): 광계 Ⅱ 뒤의 전자 전달을 막아요.', 3200); else if (tr === 'un') showHint('짝풀림제: 두 막에서 H⁺ 가 새어 기울기가 사라져요.', 3200); else hideHint(); updateCtl(); }
  function ihReset() { const ih = S.ih; ih.tr = 'none'; ih.rec = { cn: false, db: false, un: false }; ih.settle = 0; ih.val.L.snap(100); ih.val.R.snap(100); ih.ack = {}; ih.mL = memNew(); ih.mR = memNew(); updateCtl(); }
  const ihRecN = () => ['cn', 'db', 'un'].filter((k) => S.ih.rec[k]).length;
  const ihVal = (k, s) => $('#ih_' + k + '_' + s).value;
  function ihDraw(dt, t) {
    const g = ihG(), ih = S.ih, p = IHP[ih.tr], GL = mG(g.L, 'mito'), GR = mG(g.R, 'chl');
    ih.val.L.set(p.L.atp); ih.val.R.set(p.R.atp); ih.val.L.update(dt, 3); ih.val.R.update(dt, 3);
    if (ih.tr !== 'none') { if (ihOKnow()) { ih.settle += dt; if (ih.settle > 1.0 && !ih.rec[ih.tr]) { ih.rec[ih.tr] = true; Sound.success(); updateCtl(); } } else ih.settle = 0; }
    memUpdate(ih.mL, GL, dt, p.L); memUpdate(ih.mR, GR, dt, p.R);
    memDraw(ih.mL, GL, t, { block: ih.tr === 'cn' ? 3 : 0 }); memDraw(ih.mR, GR, t, { block: ih.tr === 'db' ? 1 : 0 });
    [[g.L, ih.val.L, '세포호흡'], [g.R, ih.val.R, '광합성']].forEach(([P, v, nm]) => {
      const y = P.y + P.h - (PHONE ? 30 : 36), x0 = P.x + 14, w = P.w - 28; T(x0, y - 4, 'ATP 합성 (상대값)', PHONE ? 12.5 : 13.5, '#334155', 'left', 800); D.roundRect(x0 + (PHONE ? 132 : 150), y - 16, w - (PHONE ? 132 : 150) - 52, 16, 8); ctx.fillStyle = '#eef2f7'; ctx.fill(); if (v.v > 0.5) { D.roundRect(x0 + (PHONE ? 132 : 150), y - 16, Math.max(12, (w - (PHONE ? 132 : 150) - 52) * clamp(v.v / 100, 0, 1)), 16, 8); ctx.fillStyle = v.v >= 90 ? '#16a34a' : '#f59e0b'; ctx.fill(); }
      T(x0 + w, y - 3, fi(v.v), PHONE ? 16 : 18, '#1f2d44', 'right', 800);
    });
    // 처리 이름표와 결과표
    const Tb = g.Tb; panel(Tb.x, Tb.y, Tb.w, Tb.h, 16, '#fff');
    if (PHONE) { T(Tb.x + 12, Tb.y + 24, '처리: ' + p.name + ' · 시험 ' + ihRecN() + ' / 3', 14, '#1f2d44', 'left', 800); const rows = ['cn', 'db', 'un']; rows.forEach((k, i) => T(Tb.x + 12 + i * 150, Tb.y + 50, IHP[k].name + (ih.rec[k] ? ' ' + IHP[k].L.atp + ' · ' + IHP[k].R.atp : ' ? · ?'), 12.5, ih.rec[k] ? '#1f2d44' : '#94a3b8', 'left', 800)); return; }
    T(Tb.x + 14, Tb.y + 26, '처리: ' + p.name, 15.5, ih.tr === 'none' ? '#334155' : '#dc2626', 'left', 800); T(Tb.x + 250, Tb.y + 26, '측정 결과표 (시험하면 채워져요)', 14.5, '#1f2d44', 'left', 800);
    const cx0 = Tb.x + 250, cwid = 170; ['', '세포호흡 ATP', '광합성 ATP'].forEach((h, i) => { if (i) T(cx0 + 20 + i * cwid, Tb.y + 50, h, 13.5, '#475569', 'center', 800); });
    ['none', 'cn', 'db', 'un'].forEach((k, i) => { const y = Tb.y + 62 + i * 18, known = k === 'none' || ih.rec[k]; if (ih.tr === k) { D.roundRect(cx0 - 6, y - 12, cwid * 2 + 60, 17, 6); ctx.fillStyle = 'rgba(245,158,11,.18)'; ctx.fill(); } T(cx0, y + 2, IHP[k].name, 13, '#1f2d44', 'left', 800); [IHP[k].L.atp, IHP[k].R.atp].forEach((v, j) => T(cx0 + 20 + (j + 1) * cwid, y + 2, known ? String(v) : '?', 14, known ? '#1f2d44' : '#cbd5e1', 'center', 800)); });
  }
  function tbDrawAll(dt, t) { if (S.tb.view === 'tbl') tblDraw(dt, t); else if (S.tb.view === 'eff') effDraw(dt, t); else ihDraw(dt, t); }

  /* =========================================================
     ④ 인포그래픽
     ========================================================= */
  const INC = [
    { id: 'k1', label: '막의 단백질 복합체(효소)', short: '단백질 복합체(효소)', icon: '🧬', col: '#6366f1', ans: 'com', txt: '막에 박힌 단백질 복합체(효소)가 전자를 전달해요' },
    { id: 'k2', label: '연속된 산화 · 환원', short: '연속된 산화·환원', icon: '🔁', col: '#0ea5e9', ans: 'com', txt: '연속된 산화 · 환원으로 전자가 이동해요' },
    { id: 'k3', label: '단계적 에너지 방출', short: '단계적 에너지 방출', icon: '⬇', col: '#f97316', ans: 'com', txt: '전자가 내려가며 단계적으로 에너지를 방출해요' },
    { id: 'k4', label: 'H⁺ 농도 기울기 형성', short: 'H⁺ 기울기 형성', icon: '🔋', col: '#ea580c', ans: 'com', txt: '방출된 에너지로 H⁺ 농도 기울기를 만들어요' },
    { id: 'k5', label: 'H⁺ 이동으로 ATP 합성', short: 'H⁺ 이동 → ATP 합성', icon: '🌀', col: '#ca8a04', ans: 'com', txt: 'ATP 합성 효소로 H⁺가 이동하며 ATP를 합성해요(화학 삼투)' },
    { id: 'd1', label: '장소: 내막 ↔ 틸라코이드 막', short: '장소: 내막 ↔ 틸라코이드', icon: '📍', col: '#be185d', ans: 'dif', n: '장소', nn: '장소', L: '미토콘드리아 내막', R: '틸라코이드 막' },
    { id: 'd2', label: '에너지: 화학 에너지 ↔ 빛', short: '에너지: 화학 ↔ 빛', icon: '⚡', col: '#d97706', ans: 'dif', n: '에너지 입력', nn: '에너지', L: '유기물의 화학 에너지', R: '빛에너지' },
    { id: 'd3', label: '전자 출발: NADH ↔ 물', short: '전자 출발: NADH ↔ 물', icon: '🚩', col: '#0d9488', ans: 'dif', n: '전자의 출발', nn: '전자 출발', L: 'NADH · FADH₂', R: '물 (광분해)' },
    { id: 'd4', label: '최종 수용체: O₂ ↔ NADP⁺', short: '수용체: O₂ ↔ NADP⁺', icon: '🏁', col: '#dc2626', ans: 'dif', n: '최종 전자 수용체', nn: '수용체', L: 'O₂ (→ H₂O)', R: 'NADP⁺ (→ NADPH)' },
    { id: 'd5', label: '산물: H₂O ↔ NADPH, O₂', short: '산물: H₂O ↔ NADPH·O₂', icon: '📦', col: '#16a34a', ans: 'dif', n: '산물', nn: '산물', L: 'ATP, H₂O', R: 'ATP, NADPH, O₂' },
  ];
  S.in = { so: null, pick: null, view: 'build', media: '', title: '', sum: '' };
  const LSK = 'hy-electron-transport:infographic';
  function inLoad() { try { const j = JSON.parse(localStorage.getItem(LSK) || '{}'); if (j.title) S.in.title = String(j.title).slice(0, 24); if (j.sum) S.in.sum = String(j.sum).slice(0, 46); if (j.media) S.in.media = j.media; } catch (e) { /* 저장소를 못 쓰면 무시 */ } }
  function inSave() { try { localStorage.setItem(LSK, JSON.stringify({ title: S.in.title, sum: S.in.sum, media: S.in.media })); } catch (e) { /* 무시 */ } }
  function inG() {
    if (PHONE) {
      const bw = 226, boxes = [['com', '공통점', '#6366f1'], ['dif', '차이점', '#e11d74']].map(([id, label, col], k) => ({ id, label, col, x: 10 + k * (bw + 8), y: 10, w: bw, h: 262, cols: 1, hdr: 30 }));
      return { boxes, cw: 226, ch: 44, kh: 34, tray: (i) => ({ x: 10 + (i % 2) * 234, y: 280 + Math.floor(i / 2) * 48 }), H: { x: 10, y: 526, w: 460, h: 104 }, V: { x: 10, y: 10, w: 460, h: 620 } };
    }
    const boxes = [['com', '공통점', '#6366f1', 14], ['dif', '차이점', '#e11d74', 406]].map(([id, label, col, x]) => ({ id, label, col, x, y: 14, w: 380, h: 272, cols: 1, hdr: 34 }));
    return { boxes, cw: 146, ch: 58, kh: 40, tray: (i) => ({ x: 14 + (i % 5) * 156.5, y: 296 + Math.floor(i / 5) * 66 }), H: { x: 14, y: 430, w: 772, h: 118 }, V: { x: 14, y: 14, w: 772, h: 534 } };
  }
  function inBuild() {
    const g = inG();
    S.in.so = new Sorter({ cards: INC, boxes: g.boxes, tray: g.tray, cw: g.cw, ch: g.ch, kh: g.kh, onChange() { S.in.pick = null; updateCtl(); }, onTap(c) { S.in.pick = S.in.pick === c ? null : c; Sound.tick(); }, isSel: (c) => S.in.pick === c });
    S.in.so.cards.forEach((c, i) => { c.ans = INC[i].ans; });
  }
  const inWrong = () => S.in.so.cards.filter((c) => c.zone && c.zone !== c.ans);
  const inPT = {
    down(p) { if (S.in.view !== 'build') return false; const so = S.in.so; if (so.down(p)) return true; if (S.in.pick) { const bx = so.boxAt(p); if (bx) { const c = S.in.pick; S.in.pick = null; so.place(c, bx.id); } } return false; },
    move(p) { if (S.in.view === 'build') S.in.so.move(p); }, up(p) { if (S.in.view === 'build') S.in.so.up(p); }, hover(p) { return S.in.view === 'build' ? S.in.so.hover(p) : 'default'; },
  };
  const placed = (z) => S.in.so.cards.filter((c) => c.zone === z).sort((a, b) => a.seq - b.seq);
  const inList = () => ({ com: INC.filter((q) => q.ans === 'com' && S.in.so.cards.find((c) => c.id === q.id).zone === 'com'), dif: INC.filter((q) => q.ans === 'dif' && S.in.so.cards.find((c) => c.id === q.id).zone === 'dif') });
  function inPreview(P, t) {
    const lst = inList(), media = S.in.media || 'venn', title = S.in.title || '(제목을 써요)', sum = S.in.sum || '(한 줄 요약을 써요)';
    panel(P.x, P.y, P.w, P.h, 18, '#fffef9');
    const thm = { venn: ['#6366f1', '#ef4444', '#16a34a'], mirror: ['#0ea5e9', '#be185d', '#15803d'], flow: ['#f97316', '#be185d', '#15803d'], news: ['#8b5cf6', '#e11d74', '#16a34a'] }[media];
    D.roundRect(P.x + 10, P.y + 10, P.w - 20, 40, 12); ctx.fillStyle = thm[0]; ctx.fill(); TF(P.x + P.w / 2, P.y + 37, title, P.w - 40, PHONE ? 18 : 22, 13, '#fff', 'center', 800);
    const sumY = P.y + P.h - 38; D.roundRect(P.x + 10, sumY - 8, P.w - 20, 40, 12); ctx.fillStyle = 'rgba(15,23,42,.88)'; ctx.fill(); TF(P.x + P.w / 2, sumY + 18, '💡 ' + sum, P.w - 40, PHONE ? 14.5 : 16.5, 11, '#fef08a', 'center', 800);
    const top = P.y + 60, bot = sumY - 14;
    const none = (x, y) => T(x, y, '(비어 있어요)', PHONE ? 12.5 : 13.5, '#cbd5e1', 'center', 800);
    if (PHONE) {
      T(P.x + 14, top + 14, '■ 공통점', 14, thm[0], 'left', 800); let y = top + 28;
      if (!lst.com.length) { none(P.x + P.w / 2, y + 12); y += 30; } lst.com.forEach((q) => { const n = textBlock(P.x + 22, y + 12, P.w - 44, '· ' + q.txt, 12.5, '#1f2d44', 16, 700); y += Math.max(20, n + 6); });
      y += 8; T(P.x + 14, y + 6, '■ 차이점  (세포호흡 ↔ 광합성)', 14, thm[1], 'left', 800); y += 24;
      if (!lst.dif.length) none(P.x + P.w / 2, y + 12); lst.dif.forEach((q) => { T(P.x + 22, y + 10, q.n, 12.5, '#475569', 'left', 800); y += 16; D.roundRect(P.x + 20, y - 2, (P.w - 52) / 2, 34, 8); ctx.fillStyle = 'rgba(190,24,93,.12)'; ctx.fill(); D.roundRect(P.x + 24 + (P.w - 52) / 2, y - 2, (P.w - 52) / 2, 34, 8); ctx.fillStyle = 'rgba(22,163,74,.14)'; ctx.fill(); wrapT(P.x + 20 + (P.w - 52) / 4, y + 15, (P.w - 52) / 2 - 8, q.L, 11.5, '#9d174d', 13, 800, 2); wrapT(P.x + 24 + (P.w - 52) * 0.75, y + 15, (P.w - 52) / 2 - 8, q.R, 11.5, '#166534', 13, 800, 2); y += 40; });
      return;
    }
    if (media === 'venn') {
      const r = Math.min(196, (bot - top) / 2), cy = (top + bot) / 2, d = r * 1.18, cxm = P.x + P.w / 2;
      [[cxm - d / 2, thm[1], '세포호흡'], [cxm + d / 2, thm[2], '광합성']].forEach(([cx, col, nm]) => { ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fillStyle = C.rgba(col, 0.13); ctx.fill(); ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.stroke(); });
      T(cxm - d / 2 - r * 0.45, top + 18, '세포호흡', 17, thm[1], 'center', 800); T(cxm + d / 2 + r * 0.45, top + 18, '광합성', 17, thm[2], 'center', 800); T(cxm, top + 18, '공통점', 17, thm[0], 'center', 800);
      const lx0 = cxm - d / 2 - r + 22, lw = r - d / 2 + r * 0.0 + 0;
      const sideW = r - d / 2 - 14; // 한쪽만 있는 영역 폭
      if (!lst.dif.length) { none(cxm - d / 2 - r * 0.45 + 10, cy); none(cxm + d / 2 + r * 0.45 - 10, cy); }
      lst.dif.forEach((q, i) => { const y = top + 56 + i * ((bot - top - 64) / 5); wrapT(cxm - d / 2 - r + 22 + sideW / 2 + 6, y + 14, sideW, q.L, 12, thm[1], 14, 800, 2); wrapT(cxm + d / 2 + r - 22 - sideW / 2 - 6, y + 14, sideW, q.R, 12, thm[2], 14, 800, 2); });
      if (!lst.com.length) none(cxm, cy); lst.com.forEach((q, i) => { const y = top + 50 + i * ((bot - top - 58) / 5); D.roundRect(cxm - (d / 2 * 0 + (2 * r - d) / 2) + 6, y, 2 * r - d - 12, 44, 8); ctx.fillStyle = 'rgba(99,102,241,.14)'; ctx.fill(); wrapT(cxm, y + 24, 2 * r - d - 28, q.short, 12, '#312e81', 14, 800, 2); });
    } else if (media === 'mirror') {
      const cxm = P.x + P.w / 2; D.roundRect(P.x + 24, top, P.w / 2 - 70, 28, 8); ctx.fillStyle = thm[1]; ctx.fill(); T(P.x + 24 + (P.w / 2 - 70) / 2, top + 20, '세포호흡 (미토콘드리아)', 14, '#fff', 'center', 800);
      D.roundRect(cxm + 46, top, P.w / 2 - 70, 28, 8); ctx.fillStyle = thm[2]; ctx.fill(); T(cxm + 46 + (P.w / 2 - 70) / 2, top + 20, '광합성 (엽록체)', 14, '#fff', 'center', 800);
      ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; ctx.setLineDash([6, 5]); ctx.beginPath(); ctx.moveTo(cxm, top + 36); ctx.lineTo(cxm, bot - 66); ctx.stroke(); ctx.setLineDash([]);
      if (!lst.dif.length) none(cxm, top + 80);
      lst.dif.forEach((q, i) => { const y = top + 40 + i * 52; D.roundRect(P.x + 24, y, P.w / 2 - 70, 44, 8); ctx.fillStyle = 'rgba(190,24,93,.12)'; ctx.fill(); wrapT(P.x + 24 + (P.w / 2 - 70) / 2, y + 24, P.w / 2 - 90, q.L, 13, thm[1], 15, 800, 2); D.roundRect(cxm + 46, y, P.w / 2 - 70, 44, 8); ctx.fillStyle = 'rgba(22,163,74,.14)'; ctx.fill(); wrapT(cxm + 46 + (P.w / 2 - 70) / 2, y + 24, P.w / 2 - 90, q.R, 13, thm[2], 15, 800, 2); D.label(cxm, y + 22, q.nn, { bg: '#475569', color: '#fff', size: 13 }); });
      T(cxm, bot - 46, '↔ 거울처럼 반대 방향 · 같은 원리', 13, '#64748b', 'center', 800);
      const n = lst.com.length || 1; lst.com.forEach((q, i) => { const w = (P.w - 44) / 5; D.roundRect(P.x + 22 + i * w, bot - 36, w - 6, 38, 8); ctx.fillStyle = 'rgba(99,102,241,.14)'; ctx.fill(); wrapT(P.x + 22 + i * w + (w - 6) / 2, bot - 16, w - 16, q.short, 11.5, '#312e81', 13, 800, 2); }); if (!lst.com.length) none(cxm, bot - 16);
    } else if (media === 'flow') {
      T(P.x + 16, top + 14, '■ 공통 원리 (순서대로)', 14.5, thm[0], 'left', 800);
      const order = ['k1', 'k2', 'k3', 'k4', 'k5'], w = (P.w - 44) / 5;
      order.forEach((id, i) => { const q = INC.find((x) => x.id === id), has = lst.com.some((x) => x.id === id), x = P.x + 22 + i * w; D.roundRect(x, top + 26, w - 18, 70, 10); ctx.fillStyle = has ? 'rgba(249,115,22,.16)' : 'rgba(148,163,184,.12)'; ctx.fill(); ctx.strokeStyle = has ? thm[0] : '#cbd5e1'; ctx.lineWidth = 2; ctx.stroke(); if (has) wrapT(x + (w - 18) / 2, top + 62, w - 30, q.short, 12.5, '#7c2d12', 15, 800, 3); else T(x + (w - 18) / 2, top + 66, '?', 20, '#cbd5e1', 'center', 800); if (i < 4) D.arrow(x + w - 17, top + 61, x + w - 1, top + 61, { color: '#f97316', width: 3, head: 8 }); });
      T(P.x + 16, top + 128, '■ 차이점', 14.5, thm[1], 'left', 800);
      D.roundRect(P.x + 130, top + 138, (P.w - 150) / 2 - 4, 26, 8); ctx.fillStyle = thm[1]; ctx.fill(); T(P.x + 130 + ((P.w - 150) / 2 - 4) / 2, top + 156, '세포호흡', 14, '#fff', 'center', 800); D.roundRect(P.x + 130 + (P.w - 150) / 2 + 4, top + 138, (P.w - 150) / 2 - 4, 26, 8); ctx.fillStyle = thm[2]; ctx.fill(); T(P.x + 130 + (P.w - 150) * 0.75 + 4, top + 156, '광합성', 14, '#fff', 'center', 800);
      if (!lst.dif.length) none(P.x + P.w / 2, top + 210);
      lst.dif.forEach((q, i) => { const y = top + 170 + i * 40; D.label(P.x + 72, y + 18, q.nn, { bg: '#475569', color: '#fff', size: 13 }); D.roundRect(P.x + 130, y + 2, (P.w - 150) / 2 - 4, 34, 8); ctx.fillStyle = 'rgba(190,24,93,.12)'; ctx.fill(); wrapT(P.x + 130 + ((P.w - 150) / 2 - 4) / 2, y + 20, (P.w - 150) / 2 - 20, q.L, 12.5, thm[1], 14, 800, 2); D.roundRect(P.x + 130 + (P.w - 150) / 2 + 4, y + 2, (P.w - 150) / 2 - 4, 34, 8); ctx.fillStyle = 'rgba(22,163,74,.14)'; ctx.fill(); wrapT(P.x + 130 + (P.w - 150) * 0.75 + 4, y + 20, (P.w - 150) / 2 - 20, q.R, 12.5, thm[2], 14, 800, 2); });
    } else {
      const cw = (P.w - 20 - 24) / 3, cx = (i) => P.x + 10 + i * (cw + 12), cy0 = top, ch = bot - top;
      [['1', '공통점', thm[0]], ['2', '차이점', thm[1]], ['3', '이렇게 달라요', thm[2]]].forEach(([n, nm, col], i) => { D.roundRect(cx(i), cy0, cw, ch, 14); ctx.fillStyle = C.rgba(col, 0.08); ctx.fill(); ctx.strokeStyle = col; ctx.lineWidth = 2.5; ctx.stroke(); pill(cx(i) + 28, cy0 + 24, 34, 28, n, col, '#fff'); T(cx(i) + 52, cy0 + 30, i < 2 ? nm : '한눈에 보기', 15.5, col, 'left', 800); });
      if (!lst.com.length) none(cx(0) + cw / 2, cy0 + ch / 2); lst.com.forEach((q, i) => { textBlock(cx(0) + 14, cy0 + 66 + i * 46, cw - 26, '· ' + q.txt, 12.5, '#1f2d44', 16, 700); });
      if (!lst.dif.length) none(cx(1) + cw / 2, cy0 + ch / 2); lst.dif.forEach((q, i) => { T(cx(1) + 14, cy0 + 66 + i * 56, q.n, 12.5, '#475569', 'left', 800); T(cx(1) + 14, cy0 + 84 + i * 56, '호흡: ' + q.L, 12, thm[1], 'left', 800); T(cx(1) + 14, cy0 + 100 + i * 56, '광합성: ' + q.R, 12, thm[2], 'left', 800); });
      textBlock(cx(2) + 14, cy0 + 66, cw - 26, '세포호흡은 유기물의 화학 에너지가 전자를 내려보내며 ATP를 만들고, 광합성은 빛이 전자를 올려 준 뒤 내려보내며 ATP와 NADPH를 만들어요.', 13, '#1f2d44', 18, 700);
    }
  }
  function infoDraw(dt, t) {
    const g = inG(), I = S.in;
    if (I.view === 'view') { inPreview(g.V, t); return; }
    const so = I.so; so.update(dt); so.draw();
    const H = g.H; panel(H.x, H.y, H.w, H.h, 16, '#fff');
    const lst = inList(), nC = so.cards.filter((c) => c.zone === 'com').length, nD = so.cards.filter((c) => c.zone === 'dif').length;
    T(H.x + 14, H.y + 26, '인포그래픽 만들기', PHONE ? 14 : 16, '#1f2d44', 'left', 800);
    textBlock(H.x + 14, H.y + 50, H.w - 28, '카드를 끌어서(또는 누른 뒤 상자를 눌러서) 공통점과 차이점으로 나누세요. 다 놓으면 🖼 미리보기에서 표현 방법에 따라 완성된 모습을 볼 수 있어요.', PHONE ? 12 : 13.5, '#475569', PHONE ? 16 : 19, 700);
    T(H.x + H.w - 14, H.y + H.h - 12, '공통점 ' + nC + '장 · 차이점 ' + nD + '장 / 10장', PHONE ? 12.5 : 14, '#64748b', 'right', 800);
  }

  /* =========================================================
     화면 전환 · 조작 연결
     ========================================================= */
  const PTS = { redox: null, side: sdPT, table: tbPT, info: inPT };
  function setMode(m) {
    if (S.mode !== m) S.fade = 1; S.mode = m; PT = PTS[m] || null; hideHint(); if (m === 'table') { tbLoadRow(); } updateCtl();
  }
  const ctlNodes = $$('#ctrlCard .control');
  S.ihpredOn = false;
  function updateCtl() {
    const fr = game ? game.free : false, lvNow = game ? game.level : 0, tb = S.tb, sd = S.sd, ih = S.ih, I = S.in;
    ctlNodes.forEach((n) => { n.hidden = (n.dataset.modes || '').split(' ').indexOf(S.mode) < 0; });
    $$('#ctrlCard [data-sub]').forEach((n) => { n.hidden = n.dataset.sub !== tb.view; });
    $$('#ctrlCard [data-grp]').forEach((n) => { n.hidden = n.dataset.grp === 'ihpred' ? !(S.ihpredOn || fr) : false; });
    modeButtons(S.mode, lvNow, fr);
    rxEval(); RX.forEach((q, i) => { const e = $('#rx' + (i + 1)); e.classList.toggle('ok', S.rx.ok[i]); e.classList.toggle('bad', S.rx.wrong[i]); });
    $('#rxNote').innerHTML = '맞힌 반응 <b>' + S.rx.ok.filter(Boolean).length + ' / 4</b> · 전자를 잃으면 산화, 얻으면 환원이에요.';
    chipSet($('#sdTool'), sd.tool); const ok = sdOK();
    $('#sdHelp').innerHTML = sd.tool === 'h' ? '두 막에서 <b>H⁺가 많이 쌓이는 칸</b>을 눌러요.' : sd.tool === 'a' ? '두 막에서 <b>ATP가 만들어지는 쪽</b> 칸을 눌러요.' : '<b>NADH · O₂ · 물 · NADP⁺</b>를 눌러 <b>출발</b>, <b>도착</b>을 표시해요. (누를 때마다 바뀌어요)';
    $('#sdNote').innerHTML = '표시 완료: ' + (ok.h ? '✅' : '⬜') + ' H⁺ · ' + (ok.a ? '✅' : '⬜') + ' ATP · ' + (ok.e ? '✅' : '⬜') + ' 전자';
    $$('#tbView button').forEach((b) => b.classList.toggle('on', b.dataset.v === tb.view));
    { const s = tb.sel[tb.row]; $('#tbL').classList.toggle('ok', !!s.l && tbOK(tb.row, 'l')); $('#tbL').classList.toggle('bad', !!s.l && !tbOK(tb.row, 'l')); $('#tbR').classList.toggle('ok', !!s.r && tbOK(tb.row, 'r')); $('#tbR').classList.toggle('bad', !!s.r && !tbOK(tb.row, 'r')); }
    $('#efP').classList.toggle('ok', numIn('efP') >= 34 && numIn('efP') <= 36);
    chipSet($('#ihTr'), ih.tr);
    ['cn', 'db', 'un'].forEach((k) => ['L', 'R'].forEach((s) => { const e = $('#ih_' + k + '_' + s), v = ihVal(k, s); e.classList.toggle('ok', !!v && v === IHANS[k][s] && !!ih.ack[k + s + 'seen']); e.classList.toggle('bad', !!ih.ack[k + s]); }));
    $('#tbNote').innerHTML = tb.view === 'tbl' ? '완성한 칸 <b>' + tbDone() * 2 + ' / 20</b> · 표의 줄을 눌러도 고를 수 있어요.' : tb.view === 'eff' ? '계산: 76 / 220 × 100 (소수 첫째 자리에서 반올림)' : '시험한 처리 <b>' + ihRecN() + ' / 3</b> · 지금: <b>' + IHP[ih.tr].name + '</b>' + (ih.tr !== 'none' && !ih.rec[ih.tr] ? ' (측정 중…)' : '');
    $$('#inView button').forEach((b) => b.classList.toggle('on', b.dataset.v === I.view)); chipSet($('#inMedia'), I.media);
    if (I.so) $('#inNote').innerHTML = '놓은 카드 <b>' + I.so.placed + ' / 10</b> · 표현 방법 <b>' + ({ venn: '벤 다이어그램', mirror: '거울 대칭 도식', flow: '흐름도', news: '카드뉴스', '': '아직 안 골랐어요' })[I.media] + '</b>';
  }
  bindModeSeg(setMode);
  RX.forEach((q, i) => $('#rx' + (i + 1)).addEventListener('change', updateCtl));
  $$('#sdTool button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.sd.tool = b.dataset.v; hideHint(); updateCtl(); }));
  $('#sdReset').addEventListener('click', () => { Sound.click(); sdClear(); });
  $$('#tbView button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.tb.view = b.dataset.v; if (S.tb.view === 'tbl') tbLoadRow(); hideHint(); updateCtl(); }));
  $('#tbPrev').addEventListener('click', () => { Sound.click(); S.tb.row = (S.tb.row + TBL.length - 1) % TBL.length; tbLoadRow(); updateCtl(); });
  $('#tbNext').addEventListener('click', () => { Sound.click(); S.tb.row = (S.tb.row + 1) % TBL.length; tbLoadRow(); updateCtl(); });
  ['tbL', 'tbR'].forEach((id, k) => $('#' + id).addEventListener('change', () => { const s = S.tb.sel[S.tb.row]; s[k ? 'r' : 'l'] = $('#' + id).value; const o = tbOK(S.tb.row, k ? 'r' : 'l'); if ($('#' + id).value) { if (o) Sound.success(); else Sound.tick(); } updateCtl(); }));
  $('#efP').addEventListener('input', updateCtl);
  $$('#ihTr button').forEach((b) => b.addEventListener('click', () => ihSet(b.dataset.v === S.ih.tr ? 'none' : b.dataset.v)));
  ['cn', 'db', 'un'].forEach((k) => ['L', 'R'].forEach((s) => $('#ih_' + k + '_' + s).addEventListener('change', () => { S.ih.ack = {}; updateCtl(); })));
  $$('#inView button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.in.view = b.dataset.v; hideHint(); updateCtl(); }));
  $$('#inMedia button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.in.media = b.dataset.v; inSave(); updateCtl(); }));
  $('#inTitle').addEventListener('input', (e) => { S.in.title = e.target.value; inSave(); updateCtl(); });
  $('#inSum').addEventListener('input', (e) => { S.in.sum = e.target.value; inSave(); updateCtl(); });
  $('#inReset').addEventListener('click', () => { Sound.click(); S.in.pick = null; S.in.so.reset(); });
  inLoad(); inBuild(); $('#inTitle').value = S.in.title; $('#inSum').value = S.in.sum; S.in.media = S.in.media || ''; tbLoadRow();

  /* =========================================================
     미션
     ========================================================= */
  const levels = [
    {
      title: '산화 · 환원', short: '산화·환원', icon: '⚖', phase: '분석',
      intro: '<p class="si-q">❓ 탐구 질문: 호흡과 광합성은 서로 반대 방향의 반응인데 전자 전달계의 원리는 왜 이렇게 닮았을까?</p><p>🔗 <b>앞 차시들에서</b> 세포호흡의 산화적 인산화와 광합성의 광인산화(명반응)를 각각 배웠어요. 둘 다 <b>전자 전달계</b>가 중심이었지요. 이번 차시에서는 두 전자 전달계를 <b>에너지 · 효소 · 산화와 환원</b>의 눈으로 나란히 놓고 비교해요.</p><p>먼저 약속부터 정리해요. 전자를 <b>잃으면 산화</b>, <b>얻으면 환원</b>이에요. 한쪽이 잃은 전자를 다른 쪽이 얻으므로 산화와 환원은 <b>항상 짝</b>으로 일어나요. 전자 운반체는 호흡의 <b>NAD⁺/NADH</b>, 광합성의 <b>NADP⁺/NADPH</b>예요. 전자 구슬의 움직임을 보고 네 반응을 판별하고, 아래 두 계단 그림에서 전자의 에너지가 어떻게 달라지는지 봐요.</p>',
      features: ['redox'],
      setup() { setMode('redox'); },
      recap: '전자를 잃으면 산화, 얻으면 환원이고 항상 짝으로 일어나요. 호흡에서는 전자가 높은 에너지(NADH)에서 낮은 에너지(O₂)로 내려가며 에너지를 방출하고, 광합성에서는 빛이 전자를 위로 두 번 밀어 올려요.',
      summary: '<ul><li><b>산화</b> = 전자를 잃음, <b>환원</b> = 전자를 얻음. 한쪽이 잃은 전자를 다른 쪽이 얻으므로 <b>항상 짝</b>으로 일어나요.</li><li>세포호흡: NADH → NAD⁺(산화), O₂ → H₂O(환원). 광합성: H₂O → O₂(산화), NADP⁺ → NADPH(환원). 전자 운반체는 NAD⁺/NADH(호흡), NADP⁺/NADPH(광합성).</li><li>세포호흡의 전자는 <b>높은 에너지(NADH)에서 낮은 에너지(O₂)로 내려가며</b> 에너지를 방출해요. 광합성의 전자는 <b>빛으로 에너지를 두 번 끌어올린 뒤</b> 내려가며 에너지를 방출해요.</li></ul>',
      missions: [
        {
          id: 'redox4', title: '산화 · 환원 판별 4문제', manual: true,
          goal: '전자 구슬이 어디로 움직이는지 보고 <b>네 반응</b>이 전자를 <b>잃는지, 얻는지</b> 골라 보세요.',
          hint: '구슬이 분자에서 나와 떠나면 전자를 잃는 것이고, 밖에서 분자로 들어오면 얻는 것이에요. 잃으면 산화, 얻으면 환원이에요.',
          setup() { setMode('redox'); RX.forEach((q, i) => { $('#rx' + (i + 1)).value = ''; }); updateCtl(); },
          check() {
            rxEval(); const miss = S.rx.vals.filter((v) => !v).length; if (miss) return '네 반응을 모두 골라 주세요. (' + (4 - miss) + ' / 4)';
            const bad = RX.findIndex((q, i) => !S.rx.ok[i]); if (bad >= 0) return '빨간 칸이 아직 달라요. ' + '①②③④'[bad] + ' ' + RX[bad].from + ' → ' + RX[bad].to + '에서 전자 구슬이 어디로 가는지 다시 봐요.';
            return true;
          },
          explain: 'NADH → NAD⁺, H₂O → O₂는 전자를 <b>잃어서 산화</b>예요. O₂ → H₂O, NADP⁺ → NADPH는 전자를 <b>얻어서 환원</b>이에요. 전자를 잃는 쪽이 있으면 반드시 받는 쪽이 있어요. 그래서 산화와 환원은 늘 <b>짝</b>으로 일어나요.',
        },
        {
          type: 'quiz', title: '전자가 내려갈 때 생기는 일',
          goal: '전자가 <b>높은 에너지에서 낮은 에너지로</b> 내려갈 때 일어나는 일은?',
          setup() { setMode('redox'); },
          choices: ['에너지가 방출되고, 그 에너지로 H⁺를 펌프해 ATP 합성을 이끌어요', '에너지를 흡수해서 전자가 더 높은 준위로 올라가요', '아무 에너지 변화가 없어요', '전자가 사라져요'],
          answer: 0,
          feedback: ['', '전자가 올라갈 때(광합성의 빛)는 에너지를 얻지만, 내려갈 때는 에너지를 내놓아요.', '그림에서 전자가 계단을 내려갈 때 에너지 방출 표시가 나타났어요.', '전자는 사라지지 않아요. 산화 · 환원은 전자가 이동하는 거예요.'],
          explain: '전자가 높은 에너지에서 낮은 에너지로 내려갈 때 <b>에너지가 방출</b>돼요. 방출된 에너지로 H⁺를 펌프해 기울기를 만들고, 그 기울기로 ATP를 합성해요. 광합성에서는 빛이 전자를 위로 밀어 올려 이 과정을 시작해요.',
        },
      ],
    },
    {
      title: '나란히 보기', short: '나란히 보기', icon: '🪞', phase: '모형',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 호흡과 광합성의 전자가 모두 에너지 계단을 내려가며 에너지를 내놓는 것을 봤어요. 이제 두 <b>막 단면</b>을 나란히 놓고 닮은 점과 다른 점을 직접 표시해 봐요.</div><p>왼쪽은 미토콘드리아 내막, 오른쪽은 틸라코이드 막이에요. 두 막 모두 H⁺가 많이 쌓이는 쪽을 그림의 <b>위쪽</b>에 그렸어요. 위쪽 칸의 이름이 서로 달라요: 막 사이 공간과 틸라코이드 내부. 아래쪽은 기질과 스트로마예요.</p><p>오른쪽 도구에서 <b>💧 H⁺ 많은 곳</b>, <b>🟡 ATP 합성 쪽</b>, <b>⚡ 전자 출발 · 도착</b>을 차례로 고르고 그림의 칸이나 분자를 눌러 표시해요. H⁺와 ATP 표시가 맞으면 두 막이 <b>같은 색 선</b>으로 이어지고, 그림 아래 표에 정리돼요.</p>',
      features: ['side'],
      setup() { setMode('side'); },
      recap: '두 막 모두 H⁺는 위쪽(막 사이 공간 · 틸라코이드 내부)에 쌓이고, ATP는 아래쪽(기질 · 스트로마) 쪽에 만들어져요. 전자는 NADH · 물에서 출발해 O₂ · NADP⁺에 도착해요.',
      summary: '<ul><li><b>같은 점</b>: 막에 박힌 단백질 복합체(효소)가 전자를 전달하고, H⁺를 펌프해 기울기를 만들며, <b>ATP 합성 효소</b>를 지나 H⁺가 흐를 때 ATP가 합성돼요(화학 삼투).</li><li><b>H⁺가 쌓이는 곳</b>: 미토콘드리아 <b>막 사이 공간</b> / 엽록체 <b>틸라코이드 내부</b>. <b>ATP가 합성되는 쪽</b>: <b>기질</b> / <b>스트로마</b>.</li><li><b>전자의 출발 → 도착</b>: 호흡은 NADH · FADH₂ → O₂, 광합성은 물 → NADP⁺. ATP 합성 효소가 박혀 있는 막 두 곳: <b>미토콘드리아 내막</b>, <b>틸라코이드 막</b>.</li></ul>',
      missions: [
        {
          id: 'marks', title: 'H⁺와 ATP의 위치 표시',
          goal: '두 막에서 <b>H⁺가 많이 쌓이는 칸</b>과 <b>ATP가 합성되는 쪽 칸</b>을 표시하세요. (모두 4곳)',
          hint: '💧 도구로 H⁺ 많은 칸을 두 막에서 한 곳씩, 🟡 도구로 ATP 합성 쪽을 한 곳씩 눌러요. H⁺는 펌프되어 올라온 쪽에 쌓이고, ATP 합성 효소의 머리는 H⁺가 흘러나오는 쪽에 있어요.',
          setup() { setMode('side'); S.sd.tool = 'h'; sdClear(); },
          check: () => { const o = sdOK(); return o.h && o.a; }, hold: 0.8,
          status: () => mark(sdHok('L')) + ' 호흡 H⁺ &nbsp; ' + mark(sdHok('R')) + ' 광합성 H⁺ &nbsp; ' + mark(sdAok('L')) + ' 호흡 ATP &nbsp; ' + mark(sdAok('R')) + ' 광합성 ATP',
          explain: '미토콘드리아는 <b>막 사이 공간</b>, 엽록체는 <b>틸라코이드 내부</b>에 H⁺가 쌓여요. ATP 합성 효소를 지난 H⁺는 아래쪽으로 흘러나오고, ATP는 <b>기질 쪽</b> / <b>스트로마 쪽</b>에서 만들어져요.',
        },
        {
          id: 'ends', title: '전자의 출발과 도착',
          goal: '⚡ 도구로 <b>NADH · 물</b>을 <b>출발</b>로, <b>O₂ · NADP⁺</b>를 <b>도착</b>으로 표시하세요.',
          hint: '분자를 한 번 누르면 출발, 두 번 누르면 도착이에요. 전자는 NADH(호흡), 물(광합성)에서 나와서 마지막에 O₂(호흡), NADP⁺(광합성)에게 가요.',
          setup() { setMode('side'); S.sd.tool = 'e'; updateCtl(); },
          check: () => sdOK().e, hold: 0.8,
          status: () => mark(S.sd.em.nadh === 1) + ' NADH 출발 &nbsp; ' + mark(S.sd.em.o2 === 2) + ' O₂ 도착 &nbsp; ' + mark(S.sd.em.h2o === 1) + ' 물 출발 &nbsp; ' + mark(S.sd.em.nadp === 2) + ' NADP⁺ 도착',
          explain: '세포호흡: <b>NADH</b>(출발) → 전달계 → <b>O₂</b>(도착, H₂O가 됨). 광합성: <b>물</b>(출발) → 광계 Ⅱ → 전달계 → 광계 Ⅰ → <b>NADP⁺</b>(도착, NADPH가 됨). 광합성의 전자는 빛으로 두 번 에너지를 올려 받아요.',
        },
        {
          type: 'quiz', title: 'ATP 합성 효소가 있는 막',
          goal: '<b>ATP 합성 효소</b>가 박혀 있어 H⁺ 흐름으로 ATP를 만드는 막 두 곳은?',
          setup() { setMode('side'); },
          choices: ['미토콘드리아 내막과 틸라코이드 막', '미토콘드리아 외막과 엽록체 외막', '핵막과 소포체 막', '세포막과 골지체 막'],
          answer: 0,
          feedback: ['', '외막은 작은 분자를 쉽게 통과시킬 뿐 ATP 합성 효소와 전자 전달계가 박혀 있지 않아요.', '핵막과 소포체 막은 ATP를 만드는 곳이 아니에요.', '세포막에는 ATP를 쓰는 수송 단백질이 있지만 광합성과 호흡의 ATP 합성 효소는 달라요.'],
          explain: '<b>미토콘드리아 내막</b>(막 사이 공간 H⁺ → 기질)과 <b>틸라코이드 막</b>(틸라코이드 내부 H⁺ → 스트로마)에 전자 전달계와 ATP 합성 효소가 있어요.',
        },
      ],
    },
    {
      title: '비교표', short: '비교표', icon: '📊', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 두 막 단면을 나란히 놓고 H⁺ · ATP · 전자의 위치를 표시했어요. 이제 <b>10가지 항목</b>으로 비교표를 완성하고 두 과정을 숫자와 실험으로 비교해요.</div><p>비교표의 줄을 누르거나 ◀ ▶ 버튼으로 항목을 고르고, <b>세포호흡</b>과 <b>광합성</b>의 값을 각각 골라요(보기 4개 중 하나). 맞으면 초록색이 돼요.</p><p>또 NADH 한 개가 방출하는 에너지(약 220 kJ/mol) 중 <b>ATP로 저장되는 비율</b>(에너지 효율)을 계산하고, <b>억제제</b> 3종(시안화물 · DCMU · 짝풀림제)을 두 막에 처리했을 때 ATP 합성이 어떻게 달라질지 예측하고 확인해요.</p>',
      features: ['table'],
      setup() { setMode('table'); S.tb.view = 'tbl'; tbLoadRow(); },
      recap: '두 전자 전달계는 장소 · 에너지 입력 · 전자의 출발과 도착 · 산물이 달라요. NADH의 에너지 약 220 kJ 중 76 kJ이 ATP로 저장돼 효율이 약 35 %예요. 시안화물은 호흡만, DCMU는 광합성만, 짝풀림제는 둘 다 ATP 합성을 줄여요.',
      summary: '<ul><li>비교(호흡 / 광합성): 장소 <b>미토콘드리아 내막 / 틸라코이드 막</b> · 에너지 입력 <b>화학 에너지 / 빛에너지</b> · 전자의 출발 <b>NADH, FADH₂ / 물</b> · 최종 수용체 <b>O₂ / NADP⁺</b> · H⁺ 펌프 <b>기질 → 막 사이 공간 / 스트로마 → 틸라코이드 내부</b> · 인산화 <b>산화적 인산화 / 광인산화</b> · 산물 <b>ATP, H₂O / ATP, NADPH, O₂</b> · 전체 방향 <b>에너지 방출(이화) / 에너지 흡수 · 저장(동화)</b>.</li><li>에너지 효율(단순 값): NADH 1개가 내보내는 약 220 kJ 중 ATP 약 2.5개(약 76 kJ)로 저장 → 76 / 220 × 100 ≈ <b>35 %</b>. 광합성은 전자 4개(물 2분자 → O₂ 1분자)마다 광자 8개 → NADPH 2개 + ATP 약 3개.</li><li>억제제: <b>시안화물</b> – 호흡의 전자 전달 차단, <b>DCMU</b>(제초제 성분) – 광계 Ⅱ 뒤 광합성 전자 전달 차단, <b>짝풀림제</b> – 두 막에서 H⁺ 기울기가 사라져 ATP 감소.</li></ul>',
      missions: [
        {
          id: 'table', title: '비교표 완성', manual: true,
          goal: '10가지 항목의 <b>세포호흡 · 광합성 값을 모두</b> 골라 비교표를 완성하세요. (20칸)',
          hint: '표의 줄을 누르면 오른쪽 아래에서 값을 고를 수 있어요. 틀린 칸은 빨갛게 보여요. 앞에서 표시한 H⁺와 전자의 방향을 떠올려 봐요.',
          setup() { setMode('table'); S.tb.view = 'tbl'; tbLoadRow(); updateCtl(); },
          check() {
            const n = tbDone() * 2; if (n >= 20) return true;
            const bad = TBL.findIndex((r, i) => (S.tb.sel[i].l && !tbOK(i, 'l')) || (S.tb.sel[i].r && !tbOK(i, 'r')));
            if (bad >= 0) return '빨간 칸이 있어요. ' + (bad + 1) + '번 ' + TBL[bad].k + '을(를) 다시 확인해 보세요.';
            return '아직 비어 있는 칸이 있어요. (' + n + ' / 20)';
          },
          explain: '비교표 20칸을 모두 맞혔어요! 두 전자 전달계는 <b>에너지 · 효소 · 산화 환원</b> 면에서 닮았지만, 에너지 입력과 전자의 출발 · 도착, 산물이 서로 달라요. 호흡은 에너지를 <b>방출</b>하고 광합성은 에너지를 <b>저장</b>해요.',
        },
        {
          id: 'eff', title: '에너지 효율 계산', manual: true,
          goal: 'NADH 1개가 내놓는 약 <b>220 kJ</b> 중 ATP로 저장되는 에너지는 약 <b>76 kJ</b>이에요. <b>효율(%)</b>을 계산해 쓰세요.',
          hint: '효율 = 저장된 에너지 / 방출된 에너지 × 100 = 76 / 220 × 100이에요. 소수 첫째 자리에서 반올림한 정수로 써요.',
          setup() { setMode('table'); S.tb.view = 'eff'; S.tb.fx = 0; $('#efP').value = ''; updateCtl(); },
          check() {
            const v = numIn('efP'); if (isNaN(v)) return '효율을 숫자로 써 주세요.';
            if (v < 34 || v > 36) return '76 / 220 × 100을 계산해 보세요. 약 몇 %일까요?';
            return true;
          },
          explain: '76 / 220 × 100 ≈ <b>34.5 → 약 35 %</b>예요. 나머지 약 65 %는 열 등으로 나가요. 같은 원리로 광합성에서는 광자 8개의 에너지가 NADPH 2개 + ATP 약 3개로 저장돼요.',
        },
        {
          id: 'inhib', title: '억제제 예측과 확인', manual: true,
          goal: '<b>시안화물 · DCMU · 짝풀림제</b>를 처리하면 두 막의 <b>ATP 합성</b>이 어떻게 될지 예측해 표를 채우고, 세 처리를 모두 시험해 확인하세요.',
          hint: '시안화물은 호흡의 전자 전달을, DCMU는 광계 Ⅱ 뒤 광합성의 전자 전달을 막아요. 짝풀림제는 막이 H⁺를 새게 해 두 막 모두 기울기가 사라져요. 처리 버튼을 눌러 시험하고 1~2초 기다려요.',
          setup() { setMode('table'); S.tb.view = 'inh'; S.ihpredOn = true; ihReset(); ['cn', 'db', 'un'].forEach((k) => ['L', 'R'].forEach((s) => { $('#ih_' + k + '_' + s).value = ''; })); updateCtl(); },
          check() {
            if (ihRecN() < 3) return '세 가지 처리를 모두 시험해 주세요. (' + ihRecN() + ' / 3)';
            const miss = ['cn', 'db', 'un'].reduce((n, k) => n + ['L', 'R'].filter((s) => !ihVal(k, s)).length, 0); if (miss) return '예측 표 6칸을 모두 골라 주세요. (' + (6 - miss) + ' / 6)';
            const ack = {}; let first = null;
            ['cn', 'db', 'un'].forEach((k) => ['L', 'R'].forEach((s) => { if (ihVal(k, s) !== IHANS[k][s]) { ack[k + s] = true; if (!first) first = [k, s]; } else ack[k + s + 'seen'] = true; }));
            if (JSON.stringify(ack) !== JSON.stringify(S.ih.ack)) { S.ih.ack = ack; updateCtl(); }
            if (first) return '빨간 칸이 아직 달라요. ' + IHP[first[0]].name + '이(가) ' + (first[1] === 'L' ? '세포호흡' : '광합성') + '의 ATP 합성에 주는 영향을 결과표와 비교해 보세요.';
            return true;
          },
          explain: '<b>시안화물</b>: 호흡의 ATP 합성은 0, 광합성은 정상. <b>DCMU</b>: 호흡은 정상, 광합성은 거의 없음. <b>짝풀림제</b>: 두 막 모두 H⁺ 기울기가 사라져 ATP 합성이 줄어요(둘 다 20). 짝풀림제가 둘 다 줄이는 까닭은 두 막의 ATP 합성이 모두 H⁺ 기울기에 의존하기 때문이에요.',
        },
      ],
    },
    {
      title: '인포그래픽', short: '인포그래픽', icon: '🧾', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 두 전자 전달계를 비교표와 숫자, 억제제 실험으로 비교했어요. 이제 배운 것을 친구에게 <b>전달하는 자료</b>로 만들어요.</div><p>모둠이 함께 <b>공통점 5가지</b>와 <b>차이점 5가지</b> 카드를 알맞은 상자에 놓고, <b>표현 방법</b>(벤 다이어그램 · 거울 대칭 도식 · 흐름도 · 카드뉴스 중 하나)을 골라 <b>제목</b>과 <b>한 줄 요약</b>을 써서 인포그래픽을 완성해요. 쓴 내용은 이 기기에만 저장돼요.</p><p>완성하면 <b>🖼 미리보기</b>에서 선택한 방법대로 꾸며진 모습을 볼 수 있어요. 같은 내용을 다른 방법으로도 바꿔 보며 어느 쪽이 전달이 잘 되는지 이야기해 봐요.</p>',
      features: ['info'],
      setup() { setMode('info'); S.in.view = 'build'; },
      recap: '두 전자 전달계의 공통 원리는 막의 효소 복합체, 연속된 산화 · 환원, 단계적 에너지 방출, H⁺ 기울기, 화학 삼투예요. 차이는 에너지 입력 · 장소 · 전자의 출발과 도착 · 산물 · 에너지 방향이에요.',
      summary: '<ul><li><b>공통 원리</b>: ① 막에 박힌 단백질 복합체(효소) ② 연속된 산화 · 환원 ③ 전자가 이동하며 단계적으로 에너지 방출 ④ 방출된 에너지로 H⁺ 농도 기울기 형성 ⑤ ATP 합성 효소를 통한 H⁺ 이동으로 ATP 합성(<b>화학 삼투</b>).</li><li><b>차이</b>: 에너지 입력(화학 에너지 / 빛), 장소(내막 / 틸라코이드 막), 전자의 출발(NADH / 물)과 도착(O₂ / NADP⁺), 산물(ATP · H₂O / ATP · NADPH · O₂), 에너지 방향(방출 / 저장).</li><li><b>서로 반대 방향의 거울</b>: 호흡의 산물 CO₂ · H₂O는 광합성의 재료이고, 광합성의 산물 포도당 · O₂는 호흡의 재료예요. 산소는 호흡에서 재료(최종 전자 수용체), 광합성에서 산물(물의 광분해)이에요.</li><li>시각화 자료는 <b>벤 다이어그램 · 거울 대칭 도식 · 흐름도 · 카드뉴스</b> 등으로 만들 수 있어요.</li></ul>',
      missions: [
        {
          id: 'infog', title: '인포그래픽 완성', manual: true,
          goal: '카드 10장을 <b>공통점 · 차이점</b> 상자에 나누어 놓고, <b>표현 방법</b>을 고르고 <b>제목</b>과 <b>한 줄 요약</b>을 써서 인포그래픽을 완성하세요.',
          hint: '공통점은 두 전자 전달계에 모두 해당하는 원리 5장, 차이점은 호흡과 광합성이 서로 다른 항목 5장(↔ 표시)이에요. 제목은 2글자 이상, 한 줄 요약은 8글자 이상 써요.',
          setup() { setMode('info'); S.in.view = 'build'; S.in.pick = null; S.in.so.reset(); updateCtl(); },
          check() {
            const so = S.in.so; if (so.placed < 10) return '카드 10장을 모두 상자에 놓아 주세요. (' + so.placed + ' / 10)';
            const wr = inWrong(); so.markBad(wr.map((c) => c.id));
            if (wr.length) return '빨간 카드가 아직 달라요. ' + (wr[0].ans === 'com' ? '두 과정에 모두 해당하는 원리는 공통점이에요.' : '호흡과 광합성이 서로 다른 항목(↔)은 차이점이에요.');
            if (!S.in.media) return '표현 방법(벤 다이어그램 · 거울 대칭 도식 · 흐름도 · 카드뉴스)을 골라 주세요.';
            if (S.in.title.trim().length < 2) return '제목을 2글자 이상 써 주세요.';
            if (S.in.sum.trim().length < 8) return '한 줄 요약을 8글자 이상 써 주세요.';
            return true;
          },
          explain: '공통점은 <b>효소 복합체 · 연속된 산화 환원 · 단계적 에너지 방출 · H⁺ 기울기 · 화학 삼투</b>, 차이점은 <b>장소 · 에너지 입력 · 전자의 출발과 도착 · 산물</b>이에요. 같은 내용이라도 벤 다이어그램은 겹치는 부분이, 거울 대칭 도식은 서로 반대인 점이 잘 보여요.',
        },
        {
          type: 'quiz', title: 'ATP가 합성되는 공통 원리',
          goal: '호흡과 광합성에서 <b>ATP가 합성되는 공통 원리</b>는?',
          setup() { setMode('info'); },
          choices: ['H⁺ 농도 기울기를 이용하는 화학 삼투', '효소가 인산기를 기질에서 직접 옮기는 반응', '빛이 ATP를 바로 만드는 반응', 'O₂가 ATP로 바뀌는 반응'],
          answer: 0,
          feedback: ['', '그것은 기질 수준 인산화예요. 전자 전달계의 ATP 합성은 H⁺ 기울기를 이용해요.', '빛은 전자를 들뜨게 할 뿐 ATP를 직접 만들지 않아요.', 'O₂는 호흡에서 전자를 받는 최종 수용체예요.'],
          explain: '두 과정 모두 전자가 내려가며 방출한 에너지로 H⁺ 기울기를 만들고, 그 H⁺가 <b>ATP 합성 효소</b>를 지나 흐를 때 ATP가 합성돼요. 이것이 <b>화학 삼투</b>예요. 광합성에서 빛은 전자의 에너지를 <b>올리는</b> 일을 해요.',
        },
        {
          type: 'quiz', title: '산소의 두 얼굴',
          goal: '<b>산소(O₂)</b>는 호흡에서는 <b>재료</b>이고 광합성에서는 <b>산물</b>이에요. 그 까닭은?',
          setup() { setMode('info'); },
          choices: ['호흡에서는 전자의 최종 수용체로 쓰이고, 광합성에서는 물이 분해될 때 생기기 때문이다', '호흡에서는 포도당이 만들어지고, 광합성에서는 포도당이 분해되기 때문이다', '호흡과 광합성의 O₂는 모두 CO₂에서 나오기 때문이다', '호흡에서는 빛이 O₂를 흡수하기 때문이다'],
          answer: 0,
          feedback: ['', '호흡은 포도당을 분해하고 광합성은 포도당을 합성해요. 산소의 쓰임과는 관련이 없어요.', '광합성의 O₂는 CO₂가 아니라 물에서 나와요.', '호흡에서 O₂를 받는 것은 전자 전달계예요.'],
          explain: '두 과정은 <b>거울</b> 같아요. 호흡은 O₂를 전자의 최종 수용체로 써서 H₂O로 만들고, 광합성은 물에서 전자를 빼앗아 O₂를 내놓아요. 호흡의 산물(CO₂, H₂O)이 광합성의 재료이고, 광합성의 산물(포도당, O₂)이 호흡의 재료예요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hy-electron-transport', mount: '#game', badge: '전자 전달 비교왕', homeHref: '../../index.html#hy',
    featureLabels: { redox: '⚖ 산화 · 환원 판별과 에너지 계단', side: '🪞 두 막 나란히 보기', table: '📊 비교표 · 에너지 효율 · 억제제', info: '🧾 인포그래픽 만들기' },
    onFeatures() { updateCtl(); },
    levels,
  });

  function readouts() {
    const m = S.mode;
    if (m === 'redox') { const n = S.rx.ok.filter(Boolean).length; setReads(['맞힌 반응', n + ' / 4', '산화', S.rx.ok.map((o, i) => (o && RX[i].ans === 'lose' ? RX[i].from + ' → ' + RX[i].to : null)).filter(Boolean).join(', ') || '—', '환원', S.rx.ok.map((o, i) => (o && RX[i].ans === 'gain' ? RX[i].from + ' → ' + RX[i].to : null)).filter(Boolean).join(', ') || '—']); }
    else if (m === 'side') { const o = sdOK(); setReads(['H⁺ 많은 곳', o.h ? '막 사이 공간 = 내부' : '표시해 봐요', 'ATP 합성 쪽', o.a ? '기질 = 스트로마' : '표시해 봐요', '전자 출발 → 도착', o.e ? '표시 완료' : '표시해 봐요']); }
    else if (m === 'table') {
      if (S.tb.view === 'tbl') setReads(['완성한 칸', tbDone() * 2 + ' / 20', '지금 고른 항목', (S.tb.row + 1) + '. ' + TBL[S.tb.row].k, '비교', '호흡 / 광합성']);
      else if (S.tb.view === 'eff') setReads(['방출 에너지', '약 220 kJ', 'ATP로 저장', '약 76 kJ', '효율', isNaN(numOf('efP')) ? '?' : numOf('efP') + ' %']);
      else setReads(['처리', IHP[S.ih.tr].name, '세포호흡 ATP 합성', fi(S.ih.val.L.v), '광합성 ATP 합성', fi(S.ih.val.R.v)]);
    }
    else { const so = S.in.so; setReads(['놓은 카드', so.placed + ' / 10', '공통점 · 차이점', so.cards.filter((c) => c.zone === 'com').length + ' · ' + so.cards.filter((c) => c.zone === 'dif').length, '표현 방법', ({ venn: '벤 다이어그램', mirror: '거울 대칭', flow: '흐름도', news: '카드뉴스', '': '고르지 않음' })[S.in.media]]); }
  }

  setMode('redox');
  let lastFree = false, lastLv = -1, uiT = 0;
  SciSim.loop((dt, t) => {
    clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (game && game.level !== lastLv) { lastLv = game.level; updateCtl(); }
    view.apply(); FX.update(dt); ctx.clearRect(0, 0, VW, VH);
    bgFill('#f3f6ee', '#e8eee2');
    updLater(dt);
    if (S.mode === 'redox') redoxDraw(dt, t); else if (S.mode === 'side') sdDraw(dt, t); else if (S.mode === 'table') tbDrawAll(dt, t); else infoDraw(dt, t);
    FX.draw(); parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(241,246,243,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : approach(S.fade, 0, dt, 9); }
    uiT += dt; if (uiT > 0.25) { uiT = 0; updateCtl(); }
    readouts();
  });

  window.__sim = { S, VW, VH, PHONE, get game() { return game; }, levels, setMode, sdOK, sdG, mG, TBL, tblOpts, IHANS, ihSet, ihReset, INC, inG, inBuild, updateCtl, tbLoadRow };
})();
