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
     고등학교 세포와 물질대사 · Ⅱ. 물질대사와 에너지 - 생활과 산업 속 효소 (단원 57, 7차시)
     성취기준 [12세포02-05] 효소가 우리 생활이나 산업에 다양하게 이용되는 사례를 조사하여 발표할 수 있다.
     ① 분석: 사례 지도  ② 탐구: 원리 연결  ③ 실험: 고정화 실험  ④ 적용: 조사 발표
     ========================================================= */
  const S = { mode: 'map', fade: 0, grp: 'none' };
  let game = null;
  const fi = (v) => String(Math.round(v));
  const KEY_PREFIX = 'hy-enzyme-industry:';
  const store = {
    get(k) { try { return localStorage.getItem(KEY_PREFIX + k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(KEY_PREFIX + k, v); } catch (e) { /* 무시 */ } },
  };

  /* ---------- 자료 ---------- */
  const BLD = [
    { id: 'food', n: '식품 공장', ic: '🏭', col: '#f59e0b', cards: [
      { n: '락테이스', sub: '젖당', out: '포도당 + 갈락토스 → 락토프리 우유', tag: '기질 특이성' },
      { n: '키모신', sub: '우유 단백질(카세인)', out: '응고시켜 치즈를 만들어요', tag: '기질 특이성' },
      { n: '펙티네이스', sub: '과즙의 펙틴', out: '분해해 맑은 주스를 만들어요', tag: '기질 특이성' }] },
    { id: 'wash', n: '세탁소', ic: '🧺', col: '#0ea5e9', cards: [
      { n: '세제용 프로테이스', sub: '단백질 얼룩', out: '아미노산·짧은 펩타이드로 분해해요', tag: '최적 온도 약 40 °C' },
      { n: '세제용 라이페이스', sub: '지방(기름) 얼룩', out: '지방산과 글리세롤로 분해해요', tag: '기질 특이성' },
      { n: '셀룰레이스 (옷감)', sub: '옷감의 섬유 보풀', out: '청바지 가공, 보풀 제거', tag: '기질 특이성' }] },
    { id: 'hosp', n: '병원', ic: '🏥', col: '#ef4444', cards: [
      { n: '포도당 산화 효소', sub: '포도당', out: '혈당 측정 센서에 이용해요', tag: '기질 특이성' },
      { n: '혈전 용해 효소', sub: '혈전(피브린)', out: '혈전을 녹이는 치료에 쓰여요', tag: '기질 특이성' },
      { n: '리소자임', sub: '세균의 세포벽', out: '세균을 분해해 살균해요', tag: '기질 특이성' }] },
    { id: 'lab', n: '연구소', ic: '🔬', col: '#8b5cf6', cards: [
      { n: 'Taq 중합 효소', sub: 'DNA(복제 재료)', out: 'PCR에서 DNA를 합성해요 (94 °C에서도 작용)', tag: '내열성' },
      { n: '제한 효소', sub: 'DNA의 특정 염기서열', out: 'DNA를 정해진 곳에서 잘라요 (이름만)', tag: '기질 특이성' },
      { n: 'DNA 연결 효소', sub: 'DNA 조각', out: 'DNA 조각을 이어 붙여요 (이름만)', tag: '기질 특이성' }] },
    { id: 'env', n: '환경 처리장', ic: '♻️', col: '#16a34a', cards: [
      { n: '셀룰레이스 (식물 섬유)', sub: '식물 섬유(셀룰로스)', out: '포도당으로 분해해 바이오 에탄올 원료를 만들어요', tag: '기질 특이성' },
      { n: '기름 분해 효소', sub: '기름 오염물', out: '기름을 분해해 정화해요', tag: '기질 특이성' },
      { n: 'PET 분해 효소', sub: '플라스틱(PET)', out: '플라스틱 분해 연구에 쓰여요', tag: '연구 중' }] },
  ];
  const PAIR_ANS = ['food', 'food', 'wash', 'hosp', 'hosp', 'lab', 'lab', 'env', 'env', 'env'];
  const PAIR_N = ['락테이스', '키모신', '세제용 프로테이스', '포도당 산화 효소', '혈전 용해 효소', 'Taq 중합 효소', '제한 효소', '셀룰레이스 (식물 섬유 → 바이오 에탄올)', '기름 분해 효소', 'PET 분해 효소'];
  const LINK_ANS = ['spec', 'temp', 'heat', 'small', 'spec', 'ph'];
  const LINK_ICON = ['🧺', '🌡', '🧬', '🔬', '⛽', '💊'];
  const PROP_N = { spec: '기질 특이성', temp: '최적 온도', ph: '최적 pH', heat: '내열성', small: '소량·반복 작용' };
  const PROP_COL = { spec: '#0ea5e9', temp: '#f59e0b', ph: '#a855f7', heat: '#ef4444', small: '#16a34a' };
  const CASE_TXT = ['세제의 프로테이스는 단백질 얼룩만 분해해요.', '세탁 온도를 약 40 °C로 맞춰요.', 'Taq 중합 효소는 94 °C에서도 PCR을 반복해요.', '효소를 조금만 넣어도 많은 기질이 처리돼요.', '바이오 에탄올용 셀룰레이스는 식물 섬유에만 작용해요.', '위에서 쓰는 소화제 속 펩신은 pH 2 근처에서 가장 잘 작용해요.'];

  /* =========================================================
     ① 사례 지도
     ========================================================= */
  S.mp = { sel: -1, visited: {}, flip: [1, 1, 1], t: 0, pop: [0, 0, 0, 0, 0], scraps: {}, q: '', hits: {} };
  const mpG = () => (PHONE
    ? { P: { x: 10, y: 10, w: 460, h: 256 }, Cd: { x: 10, y: 274, w: 460, h: 358 }, pos: [[78, 90], [232, 84], [388, 90], [150, 212], [316, 212]], bw: 80, bh: 62 }
    : { P: { x: 14, y: 14, w: 772, h: 300 }, Cd: { x: 14, y: 322, w: 772, h: 224 }, pos: [[118, 130], [290, 112], [470, 130], [650, 112], [380, 246]], bw: 104, bh: 82 });
  function mpSelect(i) {
    const m = S.mp; m.sel = i; m.visited[BLD[i].id] = true; m.flip = [0, 0, 0]; m.t = 0; m.pop[i] = 1; Sound.tick();
    parts.burst(mpG().pos[i][0], mpG().pos[i][1] - 20, { count: 8, colors: [BLD[i].col, '#fff'], speed: 70, life: 0.5, gravity: 0 }); updateCtl();
  }
  const mpVisited = () => Object.keys(S.mp.visited).length;
  function mpSearch(q) {
    const m = S.mp; m.q = q.trim(); m.hits = {}; const res = [];
    if (!m.q) return res;
    BLD.forEach((b, bi) => b.cards.forEach((c, ci) => { const hay = (c.n + c.sub + c.out + c.tag + b.n).toLowerCase(); if (hay.indexOf(m.q.toLowerCase()) >= 0) { res.push({ bi, ci, key: b.id + ci }); m.hits[bi] = true; } }));
    return res;
  }
  function mpRenderRes() {
    const box = $('#mpRes'); box.innerHTML = '';
    const res = mpSearch($('#mpQ').value);
    res.slice(0, 5).forEach((r) => {
      const c = BLD[r.bi].cards[r.ci], b = document.createElement('button'); b.type = 'button'; b.className = S.mp.scraps[r.key] ? 'on' : '';
      b.innerHTML = (S.mp.scraps[r.key] ? '📌 ' : '') + c.n + '<span class="sub">' + BLD[r.bi].n + ' · ' + c.sub + '</span>';
      b.addEventListener('click', () => { S.mp.scraps[r.key] = !S.mp.scraps[r.key]; if (!S.mp.scraps[r.key]) delete S.mp.scraps[r.key]; store.set('scraps', JSON.stringify(Object.keys(S.mp.scraps))); Sound.click(); mpRenderRes(); updateCtl(); });
      box.appendChild(b);
    });
    if (!res.length && S.mp.q) { const p = document.createElement('p'); p.className = 'ctrl-note'; p.textContent = '검색 결과가 없어요.'; box.appendChild(p); }
    if (res.length > 5) { const p = document.createElement('p'); p.className = 'ctrl-note'; p.textContent = '결과 ' + res.length + '개 중 5개만 보여요.'; box.appendChild(p); }
  }
  function drawBuilding(i, t) {
    const g = mpG(), b = BLD[i], [x, y] = g.pos[i], w = g.bw, h = g.bh, m = S.mp, sc = 1 + 0.12 * m.pop[i], sel = m.sel === i;
    ctx.save(); ctx.translate(x, y + h / 2); ctx.scale(sc, sc); ctx.translate(-x, -(y + h / 2));
    D.shadow(() => { D.roundRect(x - w / 2, y - h / 2 + 12, w, h - 12, 8); ctx.fillStyle = C.shade(b.col, 0.62); ctx.fill(); }, { blur: 8, y: 3 });
    D.roundRect(x - w / 2, y - h / 2 + 12, w, h - 12, 8); ctx.strokeStyle = b.col; ctx.lineWidth = sel ? 4 : 2.5; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - w / 2 - 8, y - h / 2 + 14); ctx.lineTo(x, y - h / 2 - 10); ctx.lineTo(x + w / 2 + 8, y - h / 2 + 14); ctx.closePath(); ctx.fillStyle = b.col; ctx.fill();
    E(b.ic, x, y + 4, L(36, 28));
    // 문 · 창
    ctx.fillStyle = C.shade(b.col, -0.2); D.roundRect(x - 9, y + h / 2 - 22, 18, 22, 4); ctx.fill();
    ctx.restore();
    TF(x, y + h / 2 + L(24, 18), b.n, w + 30, L(15.5, 13), 11, '#1f2d44', 'center', 800);
    if (m.visited[b.id]) D.check(x + w / 2 - 6, y - h / 2 + 12, L(11, 9), 1);
    if (m.hits[i]) D.ring(x, y + 4, w * 0.62, t, { color: '#f59e0b', width: 3 });
    if (!m.visited[b.id] && !m.hits[i]) D.glow(x, y + 6, w * 0.95, '#16a34a', 0.22 + (RM ? 0 : 0.1 * Math.sin(t * 3 + i)));
  }
  function mpDraw(dt, t) {
    const m = S.mp, g = mpG(), P = g.P; m.t += dt; m.pop = m.pop.map((v) => approach(v, 0, dt, 6));
    panel(P.x, P.y, P.w, P.h, 18, '#f4fbf1');
    // 마을 바닥과 길
    ctx.save(); D.roundRect(P.x + 6, P.y + 40, P.w - 12, P.h - 46, 14); ctx.clip();
    const gr = ctx.createLinearGradient(0, P.y + 40, 0, P.y + P.h); gr.addColorStop(0, '#dff3d4'); gr.addColorStop(1, '#c7e8b8'); ctx.fillStyle = gr; ctx.fillRect(P.x, P.y + 40, P.w, P.h);
    ctx.fillStyle = '#cbd5e1'; const ry = PHONE ? 142 : 188; ctx.fillRect(P.x + 6, ry, P.w - 12, PHONE ? 22 : 30); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.setLineDash([14, 12]); ctx.beginPath(); ctx.moveTo(P.x + 10, ry + (PHONE ? 11 : 15)); ctx.lineTo(P.x + P.w - 10, ry + (PHONE ? 11 : 15)); ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();
    T(P.x + 16, P.y + 28, '🗺 효소 마을: 건물을 눌러 효소 카드를 열어 봐요', L(17, 14), '#1f2d44', 'left', 800);
    [4, 3, 2, 1, 0].forEach((i) => drawBuilding(i, t));
    // 카드 패널
    const C0 = g.Cd; panel(C0.x, C0.y, C0.w, C0.h, 18, '#fff');
    if (m.sel < 0) { T(C0.x + C0.w / 2, C0.y + C0.h / 2 + 5, '건물을 누르면 그곳에서 쓰이는 효소 카드가 나타나요.', L(16, 13.5), '#94a3b8', 'center', 800); return; }
    const b = BLD[m.sel];
    T(C0.x + 16, C0.y + 30, b.ic + ' ' + b.n + '의 효소', L(18, 15.5), b.col === '#f59e0b' ? '#b45309' : C.shade(b.col, -0.2), 'left', 800);
    const cw = PHONE ? C0.w - 24 : (C0.w - 24 - 2 * 12) / 3, ch = PHONE ? 100 : 162;
    b.cards.forEach((c, k) => {
      const x = PHONE ? C0.x + 12 : C0.x + 12 + k * (cw + 12), y = PHONE ? C0.y + 46 + k * (ch + 8) : C0.y + 46;
      const p = clamp((m.t - k * 0.14) / 0.5, 0, 1), face = p > 0.5 || RM;
      ctx.save(); ctx.translate(x + cw / 2, y + ch / 2); ctx.scale(RM ? 1 : Math.max(0.02, Math.abs(Math.cos(Math.PI * p))), 1);
      D.shadow(() => { D.roundRect(-cw / 2, -ch / 2, cw, ch, 14); ctx.fillStyle = face ? '#fffdf7' : b.col; ctx.fill(); }, { blur: 6, y: 2 });
      D.roundRect(-cw / 2, -ch / 2, cw, ch, 14); ctx.strokeStyle = b.col; ctx.lineWidth = 2.5; ctx.stroke();
      if (face) {
        const key = b.id + k; const scr = m.scraps[key];
        T(-cw / 2 + 12, -ch / 2 + L(28, 24), c.n, L(16.5, 14), '#1f2d44', 'left', 800, {});
        const lines = [['기질', c.sub], ['얻는 것', c.out]]; let yy = -ch / 2 + L(54, 46);
        lines.forEach(([a, bb]) => { const h2 = textBlock(-cw / 2 + 12, yy, cw - 24, a + ': ' + bb, L(13.5, 12.5), '#475569', L(19, 17), 700); yy += h2 + 3; });
        D.label(-cw / 2 + 12 + 4, ch / 2 - 16, c.tag, { bg: '#e0f2fe', color: '#075985', size: L(12.5, 11.5), align: 'left' });
        if (scr) T(cw / 2 - 12, -ch / 2 + 26, '📌', 16, '#000', 'right', 700);
      } else T(0, 12, '❔', 34, '#fff', 'center', 800);
      ctx.restore();
    });
  }
  const mpPT = {
    down(p) {
      const g = mpG();
      for (let i = 0; i < 5; i++) { const [x, y] = g.pos[i]; if (Math.abs(p.x - x) <= g.bw / 2 + 12 && p.y >= y - g.bh / 2 - 12 && p.y <= y + g.bh / 2 + 24) { mpSelect(i); return true; } }
      return false;
    },
    hover(p) { const g = mpG(); return g.pos.some(([x, y]) => Math.abs(p.x - x) <= g.bw / 2 + 12 && p.y >= y - g.bh / 2 - 12 && p.y <= y + g.bh / 2 + 24) ? 'pointer' : 'default'; },
  };

  /* =========================================================
     ② 원리 연결 (사례와 특성) · 세탁 온도
     ========================================================= */
  S.lk = { wrong: [false, false, false, false, false, false] };
  const lkG = (i) => (PHONE ? { x: 10, y: 8 + i * 104, w: 460, h: 98 } : { x: 14 + (i % 2) * 391, y: 14 + Math.floor(i / 2) * 179, w: 381, h: 168 });
  const lkVal = (i) => selVal('lk' + i);
  function lkDraw(dt, t) {
    for (let i = 0; i < 6; i++) {
      const g = lkG(i), v = lkVal(i), bad = S.lk.wrong[i], col = v ? PROP_COL[v] : '#cbd5e1';
      D.shadow(() => { D.roundRect(g.x, g.y, g.w, g.h, 16); ctx.fillStyle = bad ? '#fff1f0' : '#fff'; ctx.fill(); }, { blur: 7, y: 2 });
      D.roundRect(g.x, g.y, g.w, g.h, 16); ctx.strokeStyle = bad ? '#dc2626' : col; ctx.lineWidth = bad ? 3 : 2.5; if (!v) ctx.setLineDash([6, 5]); ctx.stroke(); ctx.setLineDash([]);
      D.sphere(g.x + 34, g.y + 38, 24, v ? col : '#e2e8f0', { gloss: true, shadow: true }); E(LINK_ICON[i], g.x + 34, g.y + 40, 24);
      T(g.x + 70, g.y + 24, '사례 ' + (i + 1), L(14, 12.5), '#64748b', 'left', 800);
      textBlock(g.x + 70, g.y + 46, g.w - 84, CASE_TXT[i], L(16.5, 14), '#1f2d44', L(24, 20), 800);
      if (v) D.label(g.x + g.w - 14 - 4, g.y + g.h - 24, '→ ' + PROP_N[v], { bg: col, size: L(14.5, 13), align: 'right' });
      else T(g.x + g.w - 14, g.y + g.h - 18, '효소의 특성을 골라요', L(13.5, 12), '#94a3b8', 'right', 700);
    }
  }
  S.ws = { idx: 1, dwell: 0, tried: [false, false, false, false], rem: new Num(100), cost: new Num(20), flash: 0, bub: 0 };
  const WASH = [{ T: 30, rem: 70, cost: 10 }, { T: 40, rem: 100, cost: 20 }, { T: 60, rem: 40, cost: 40 }, { T: 80, rem: 5, cost: 60 }];
  const wsG = () => (PHONE
    ? { A: { x: 10, y: 10, w: 460, h: 252 }, Gr: { x: 10, y: 270, w: 460, h: 196 }, B: { x: 10, y: 474, w: 460, h: 158 } }
    : { A: { x: 14, y: 14, w: 440, h: 330 }, Gr: { x: 466, y: 14, w: 320, h: 330 }, B: { x: 14, y: 352, w: 772, h: 194 } });
  function wsUpdate(dt) {
    const w = S.ws, d = WASH[w.idx]; w.rem.set(d.rem); w.rem.update(dt, 4); w.cost.set(d.cost); w.cost.update(dt, 5);
    if (!w.tried[w.idx] && S.mode === 'wash') { w.dwell += dt; if (w.dwell >= 1.2) { w.tried[w.idx] = true; Sound.success(); parts.burst(wsG().Gr.x + wsG().Gr.w * 0.5, wsG().Gr.y + 120, { count: 10, colors: ['#22c55e', '#fff'], speed: 80, life: 0.5, gravity: 40 }); updateCtl(); } }
  }
  function wsSet(i) { const w = S.ws; if (i === w.idx) return; w.idx = i; w.dwell = 0; Sound.tick(); updateCtl(); }
  const wsPlot = () => { const G = wsG().Gr; return mkPlot(G, { x0: 20, x1: 90, y0: 0, y1: 110, xt: [30, 40, 60, 80], yt: [0, 50, 100], xl: PHONE ? '' : '세탁 온도 (°C)', yl: '', m: PHONE ? { l: 38, t: 30, r: 14, b: 38 } : { l: 44, t: 44, r: 16, b: 46 } }); };
  function wsDraw(dt, t) {
    wsUpdate(dt);
    const w = S.ws, g = wsG(), d = WASH[w.idx], A = g.A, rem = w.rem.v;
    panel(A.x, A.y, A.w, A.h, 18, '#f7fbff');
    T(A.x + 14, A.y + 28, '👕 단백질 얼룩 + 세제 프로테이스 (' + d.T + ' °C)', L(16, 13.5), '#1f2d44', 'left', 800);
    // 세탁 통
    const tx = A.x + A.w / 2 - L(110, 90), ty = A.y + 50, tw = L(220, 180), th = L(210, 140);
    D.beaker(tx, ty, tw, th, { level: 0.78, liquid: d.T >= 60 ? '#ffd8c2' : '#bfe3f7', t, ticks: 0 });
    // 셔츠
    ctx.save(); ctx.beginPath(); const cx = tx + tw / 2, cy = ty + th * 0.52, sw = tw * 0.62, sh = th * 0.55;
    ctx.moveTo(cx - sw * 0.22, cy - sh * 0.5); ctx.lineTo(cx - sw * 0.5, cy - sh * 0.38); ctx.lineTo(cx - sw * 0.62, cy - sh * 0.1); ctx.lineTo(cx - sw * 0.42, cy - sh * 0.02); ctx.lineTo(cx - sw * 0.36, cy - sh * 0.12); ctx.lineTo(cx - sw * 0.36, cy + sh * 0.5); ctx.lineTo(cx + sw * 0.36, cy + sh * 0.5); ctx.lineTo(cx + sw * 0.36, cy - sh * 0.12); ctx.lineTo(cx + sw * 0.42, cy - sh * 0.02); ctx.lineTo(cx + sw * 0.62, cy - sh * 0.1); ctx.lineTo(cx + sw * 0.5, cy - sh * 0.38); ctx.lineTo(cx + sw * 0.22, cy - sh * 0.5); ctx.quadraticCurveTo(cx, cy - sh * 0.32, cx - sw * 0.22, cy - sh * 0.5); ctx.closePath();
    ctx.fillStyle = '#f8fafc'; ctx.fill(); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; ctx.stroke(); ctx.clip();
    const sa = clamp(1 - rem / 100, 0, 1);   // 제거율이 높을수록 얼룩이 옅어져요
    ctx.fillStyle = 'rgba(146,64,14,' + (0.88 * sa) + ')'; ctx.beginPath(); ctx.ellipse(cx - sw * 0.05, cy + sh * 0.1, sw * 0.22, sh * 0.2, 0.4, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(cx + sw * 0.12, cy + sh * 0.22, sw * 0.12, sh * 0.1, -0.3, 0, TAU); ctx.fill();
    ctx.restore();
    // 거품 · 김
    if (!RM) { w.bub += dt * (2 + d.T / 20); while (w.bub > 1) { w.bub -= 1; parts.emit({ x: tx + 14 + Math.random() * (tw - 28), y: ty + th - 10, vx: 0, vy: -26 - Math.random() * 20, life: 1.4, size: 2.5 + Math.random() * 2.5, color: '#9cc9ec', shape: 'bubble', gravity: 0 }); if (d.T >= 60) parts.emit({ x: tx + 20 + Math.random() * (tw - 40), y: ty - 4, vx: 0, vy: -26, life: 1.2, size: 9, color: 'rgba(220,226,235,.8)', shape: 'smoke', gravity: 0 }); } }
    // 온도계
    D.thermometer(A.x + A.w - 52, A.y + 56, L(150, 100), d.T, 20, 90, { ticks: true, step: 20, unit: '°' });
    // 효소 알갱이(20개)
    const nAct = Math.round(d.rem / 5);
    T(A.x + 14, A.y + A.h - 40, '프로테이스 (활성 ' + nAct + ' / 20)', L(13.5, 12), '#475569', 'left', 800);
    for (let i = 0; i < 20; i++) {
      const ex = A.x + 18 + i * L(20, 16.5), ey = A.y + A.h - 18, on = i < nAct;
      ctx.save(); ctx.translate(ex, ey); const rr = L(7, 6);
      ctx.beginPath(); if (on) { ctx.arc(0, 0, rr, 0.35, TAU - 0.35); ctx.lineTo(0, 0); } else { ctx.moveTo(-rr, rr * 0.6); ctx.quadraticCurveTo(-rr * 0.2, -rr * 1.3, rr * 0.4, -rr * 0.2); ctx.quadraticCurveTo(rr * 1.2, rr * 0.7, -rr, rr * 0.6); } ctx.closePath(); ctx.fillStyle = on ? '#38bdf8' : '#9ca3af'; ctx.fill(); ctx.restore();
    }
    // ---- 그래프 ----
    const Gr = g.Gr; panel(Gr.x, Gr.y, Gr.w, Gr.h, 18, '#fff');
    T(Gr.x + 14, Gr.y + 26, L('얼룩 제거율 (%)', '얼룩 제거율 (%) · 가로: 세탁 온도'), L(15.5, 13), '#1f2d44', 'left', 800);
    const pl = wsPlot(); drawAxes(pl);
    const pts = WASH.map((q, i) => ({ x: pl.X(q.T), y: pl.Y(q.rem), i })).filter((q) => w.tried[q.i]);
    if (pts.length > 1) { ctx.save(); ctx.strokeStyle = '#16a34a'; ctx.lineWidth = 3; ctx.beginPath(); pts.forEach((q, j) => { if (j) ctx.lineTo(q.x, q.y); else ctx.moveTo(q.x, q.y); }); ctx.stroke(); ctx.restore(); }
    pts.forEach((q) => D.sphere(q.x, q.y, 6.5, '#16a34a', { gloss: true }));
    D.ring(pl.X(d.T), pl.Y(d.rem), 9, t, { color: '#f59e0b', width: 2 });
    // ---- 막대 ----
    const B = g.B; panel(B.x, B.y, B.w, B.h, 18, '#fff');
    const bx = B.x + L(190, 112), bw = B.w - L(190, 112) - 66;
    T(B.x + 16, B.y + 38, L('얼룩이 지워지는 정도', '제거율'), L(15.5, 13.5), '#166534', 'left', 800); D.roundRect(bx, B.y + 22, bw, 22, 11); ctx.fillStyle = '#eef2f7'; ctx.fill(); D.roundRect(bx, B.y + 22, Math.max(22, bw * rem / 100), 22, 11); ctx.fillStyle = '#22c55e'; ctx.fill(); T(bx + bw + 8, B.y + 40, fi(rem) + ' %', L(16, 14), '#1f2d44', 'left', 800);
    T(B.x + 16, B.y + 84, L('가열 에너지 (상대값)', '가열 에너지'), L(15.5, 13.5), '#9a3412', 'left', 800); D.roundRect(bx, B.y + 68, bw, 22, 11); ctx.fillStyle = '#eef2f7'; ctx.fill(); D.roundRect(bx, B.y + 68, Math.max(22, bw * w.cost.v / 60), 22, 11); ctx.fillStyle = '#f97316'; ctx.fill(); T(bx + bw + 8, B.y + 86, fi(w.cost.v), L(16, 14), '#1f2d44', 'left', 800);
    textBlock(B.x + 16, B.y + L(124, 116), B.w - 32, d.T === 40 ? '40 °C: 효소가 가장 잘 일하고 에너지도 적게 들어요.' : d.T === 30 ? '30 °C: 에너지는 적지만 효소가 조금 느리게 일해요.' : d.T === 60 ? '60 °C: 효소가 변성되기 시작해 얼룩이 덜 지워져요.' : '80 °C: 효소가 거의 변성되어 얼룩이 남아요.', L(15, 13), '#475569', L(21, 18), 700);
  }

  /* =========================================================
     ③ 고정화 실험
     ========================================================= */
  const IMPTS = [[1, 4.0], [2, 3.9], [3, 3.8], [5, 3.5], [10, 2.9], [15, 2.2], [20, 1.6]];
  function immScore(n) {
    if (n <= 1) return 4.0; if (n >= 20) return 1.6;
    for (let i = 1; i < IMPTS.length; i++) { const a = IMPTS[i - 1], b = IMPTS[i]; if (n <= b[0]) return a[1] + (b[1] - a[1]) * (n - a[0]) / (b[0] - a[0]); }
    return 1.6;
  }
  const r1 = (v) => Math.round(v * 10) / 10;
  const r2 = (v) => Math.round(v * 100) / 100;
  /* 점수 표시: 표의 값은 한 자리, 사이 값(예: 17회 1.96)은 두 자리로 보여 줘요 */
  const fvS = (v) => { const q = r2(v); return Math.abs(q * 10 - Math.round(q * 10)) < 1e-9 ? q.toFixed(1) : q.toFixed(2); };
  S.im = { kind: 'imm', n: 0, ph: 'idle', t: 0, scores: [], beads: 'bowl', fresh: true, strip: new Num(0), sieve: new Num(0), milk: new Num(1), speed: 1, pend: false, sel: -1, spent: 0, flyT: 0, auto: 0 };
  const imG = () => (PHONE
    ? { A: { x: 10, y: 10, w: 460, h: 262 }, Gr: { x: 10, y: 280, w: 460, h: 184 }, B: { x: 10, y: 472, w: 460, h: 160 } }
    : { A: { x: 14, y: 14, w: 440, h: 340 }, Gr: { x: 466, y: 14, w: 320, h: 340 }, B: { x: 14, y: 362, w: 772, h: 184 } });
  const imPlot = () => { const G = imG().Gr; return mkPlot(G, { x0: 0, x1: 20.6, y0: 0, y1: 5, xt: [1, 5, 10, 15, 20], yt: [0, 1, 2, 3, 4, 5], xl: PHONE ? '' : '재사용 횟수 (회)', yl: '', m: PHONE ? { l: 34, t: 30, r: 12, b: 36 } : { l: 38, t: 44, r: 14, b: 44 } }); };
  const STRIPC = ['#f6f1c9', '#e9efb0', '#d3e9a2', '#b4de9c', '#8ccf9a', '#5db7a0'];
  function stripColor(v) { const x = clamp(v, 0, 5), i = Math.min(4, Math.floor(x)), f = x - i; return C.mix(STRIPC[i], STRIPC[i + 1], f); }
  function imReact() {
    const m = S.im; if (m.ph !== 'idle' || m.n >= 20) return false;
    if (m.kind === 'imm' && m.beads !== 'bowl') return false;
    if (m.kind === 'free' && !m.fresh) return false;
    m.ph = 'drop'; m.t = 0; m.pend = true; if (m.kind === 'free') { m.fresh = false; m.spent += 1000; } Sound.tick(); updateCtl(); return true;
  }
  function imRecover() {
    const m = S.im; if (m.ph !== 'idle') return false;
    if (m.kind === 'imm') { if (m.beads !== 'milk') return false; m.ph = 'lift'; m.t = 0; }
    else { if (m.fresh || m.n === 0) return false; m.ph = 'swap'; m.t = 0; }
    Sound.click(); updateCtl(); return true;
  }
  function imReset() { const m = S.im; clearLater(); m.n = 0; m.ph = 'idle'; m.t = 0; m.scores = []; m.beads = 'bowl'; m.fresh = true; m.strip.snap(0); m.sieve.snap(0); m.milk.snap(1); m.speed = 1; m.sel = -1; m.spent = 0; m.auto = 0; Sound.click(); updateCtl(); }
  function imAll() { const m = S.im; if (m.kind !== 'imm') return; m.auto = 1; m.speed = 8; updateCtl(); }
  function imStep(dtRaw) {
    const m = S.im, dt = dtRaw * m.speed;
    m.strip.update(dt, 5); m.sieve.update(dt, 6); m.milk.update(dt, 5);
    if (m.ph === 'drop') { m.t += dt; if (m.t >= 0.6) { m.beads = 'milk'; m.ph = 'react'; m.t = 0; const sc = m.kind === 'free' ? 4.0 : immScore(m.n + 1); m.strip.set(sc); } }
    else if (m.ph === 'react') {
      m.t += dt;
      if (m.t >= 1.8) { m.n++; m.scores.push(r2(m.kind === 'free' ? 4.0 : immScore(m.n))); m.ph = 'idle'; m.t = 0; m.pend = false; Sound.success(); updateCtl(); }
    } else if (m.ph === 'lift') {
      m.t += dt; m.sieve.set(m.t < 0.5 ? 1 : 0.0);
      if (m.t >= 1.3) { m.ph = 'swap'; m.t = 0; m.beads = 'sieve'; }
    } else if (m.ph === 'swap') {
      m.t += dt; m.milk.set(m.t < 0.5 ? 0 : 1);
      if (m.t >= 1.2) { m.ph = 'idle'; m.t = 0; if (m.kind === 'imm') { m.beads = 'bowl'; } else { m.fresh = true; } m.strip.set(0); updateCtl(); }
    }
    if (m.auto && m.ph === 'idle') {
      if (m.n >= 20) { m.auto = 0; m.speed = 1; updateCtl(); }
      else if (m.beads === 'milk') imRecover(); else imReact();
    }
  }
  const IM = { bx: 100, by: 104, bw: 190, bh: 150 };
  const imSieveP = (m) => (m.ph === 'lift' ? (m.t < 0.5 ? SciSim.ease.inOutCubic(clamp(m.t / 0.5, 0, 1)) : 1 - SciSim.ease.inOutCubic(clamp((m.t - 0.5) / 0.8, 0, 1))) : 0);
  const imSieveY = (m) => lerp(IM.by - 46, IM.by + IM.bh - 16, imSieveP(m));
  const BEAD_R = 9.5;
  function beadXY(i, m, t) {
    const inMilk = { x: IM.bx + 30 + (i % 4) * 26, y: IM.by + IM.bh - 26 - Math.floor(i / 4) * 22 };
    const inBowl = { x: 338 - 33 + (i % 4) * 22, y: 298 - Math.floor(i / 4) * 17 };
    const rowX = IM.bx + 28 + i * 19, topY = IM.by - 46 - 10;
    if (m.ph === 'drop') { const p = SciSim.ease.inOutCubic(clamp(m.t / 0.6, 0, 1)); return { x: lerp(inBowl.x, inMilk.x, p), y: lerp(inBowl.y, inMilk.y, p) - Math.sin(p * Math.PI) * 70 }; }
    if (m.ph === 'lift') { if (m.t < 0.5) return inMilk; const a = SciSim.ease.inOutCubic(clamp((m.t - 0.5) / 0.8, 0, 1)); return { x: lerp(inMilk.x, rowX, a), y: imSieveY(m) - 10 - Math.floor(i / 4) * 22 * (1 - a) }; }
    if (m.ph === 'swap' && m.beads === 'sieve') { const p = SciSim.ease.inOutCubic(clamp(m.t / 0.6, 0, 1)); return { x: lerp(rowX, inBowl.x, p), y: lerp(topY, inBowl.y, p) - Math.sin(p * Math.PI) * 30 }; }
    if (m.beads === 'milk') return { x: inMilk.x + Math.sin(t * 1.5 + i) * 1.5, y: inMilk.y + Math.cos(t * 1.7 + i) * 1.5 };
    return inBowl;
  }
  function imDraw(dt, t) {
    S.t = t; imStep(dt);
    const m = S.im, g = imG(), A = g.A, s = Math.min(A.w / 440, A.h / 340), ox = A.x + (A.w - 440 * s) / 2, oy = A.y;
    panel(A.x, A.y, A.w, A.h, 18, '#fbfdff');
    ctx.save(); ctx.translate(ox, oy); ctx.scale(s, s);
    T(14, 28, m.kind === 'imm' ? (PHONE ? '🟡 비드에 가둔 락테이스' : '🟡 알긴산 비드에 가둔 락테이스 + 우유') : (PHONE ? '💧 풀어 넣은 락테이스' : '💧 우유에 풀어 넣은 락테이스'), 16 / Math.max(0.8, s), '#1f2d44', 'left', 800);
    // 비커와 우유
    const bx = IM.bx, by = IM.by, bw = IM.bw, bh = IM.bh;
    const lvl = 0.62 * clamp(m.milk.v, 0, 1) + (m.ph === 'swap' ? 0 : 0);
    D.beaker(bx, by, bw, bh, { level: lvl, liquid: '#fffaf0', t, wave: 1.2 });
    T(bx + bw / 2, by + bh + 20, m.kind === 'imm' ? '우유 (젖당)' : '우유 + 자유 효소', 14 / Math.max(0.8, s), '#475569', 'center', 800);
    // 자유 효소 점
    if (m.kind === 'free' && m.fresh === false) for (let i = 0; i < 14; i++) { const q = mulberry(i + 3); D.sphere(bx + 14 + q() * (bw - 28) + Math.sin(t * 1.3 + i) * 3, by + bh * 0.46 + q() * bh * 0.44 + Math.cos(t * 1.1 + i) * 3, 3.5, '#2563eb', { gloss: false }); }
    if (m.kind === 'free' && m.ph === 'swap') T(bx + bw / 2, by + bh * 0.3, '효소도 함께 버려져요', 14 / Math.max(0.8, s), '#b91c1c', 'center', 800);
    // 비드와 거름망
    if (m.kind === 'imm') {
      const showSieve = m.ph === 'lift';
      if (showSieve) { const sy = imSieveY(m); ctx.save(); ctx.strokeStyle = '#475569'; ctx.lineWidth = 2.5; ctx.fillStyle = 'rgba(148,163,184,.35)'; D.roundRect(bx + 18, sy, bw - 36, 14, 6); ctx.fill(); ctx.stroke(); ctx.strokeStyle = '#64748b'; ctx.lineWidth = 1; for (let k = 0; k < 8; k++) { ctx.beginPath(); ctx.moveTo(bx + 26 + k * 18, sy + 2); ctx.lineTo(bx + 26 + k * 18, sy + 12); ctx.stroke(); } ctx.strokeStyle = '#475569'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(bx + bw - 18, sy + 7); ctx.lineTo(bx + bw + 18, sy - 22); ctx.stroke(); ctx.restore(); }
      for (let i = 0; i < 8; i++) { const p = beadXY(i, m, t); bead(p.x, p.y, m, t); }
    }
    // 접시
    if (m.kind === 'imm') { ctx.fillStyle = '#e2e8f0'; ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(338, 308, 52, 12, 0, 0, TAU); ctx.fill(); ctx.stroke(); T(338, 334, '비드 접시', 13.5 / Math.max(0.8, s), '#475569', 'center', 800); }
    // 반응 효과
    if (m.ph === 'react' && !RM && Math.random() < 0.25 * Math.min(1, dt * 60)) parts.emit({ x: ox + (bx + 20 + Math.random() * (bw - 40)) * s, y: oy + (by + bh * 0.6) * s, vx: 0, vy: -24 * s, life: 0.9, size: 2.5 * s + Math.random() * 2, color: m.kind === 'imm' ? '#fcd34d' : '#93c5fd', shape: 'star', gravity: 0 });
    // 시험지
    const sx = 330, sy2 = 60;
    D.roundRect(sx, sy2, 34, 90, 6); ctx.fillStyle = stripColor(m.strip.v); ctx.fill(); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; ctx.stroke();
    T(sx + 17, sy2 - 8, '포도당 시험지', 13 / Math.max(0.8, s), '#475569', 'center', 800);
    T(sx + 17, sy2 + 112, '색 점수 ' + fv1(m.strip.v), 14 / Math.max(0.8, s), '#0f766e', 'center', 800);
    for (let k = 0; k <= 5; k++) { D.roundRect(sx + 44, sy2 + 4 + k * 15, 18, 12, 3); ctx.fillStyle = k < 5 ? stripColor(k) : stripColor(5); ctx.fill(); T(sx + 68, sy2 + 14 + k * 15, String(k), 12 / Math.max(0.8, s), '#64748b', 'left', 700); }
    ctx.restore();
    // ---- 그래프 ----
    const Gr = g.Gr; panel(Gr.x, Gr.y, Gr.w, Gr.h, 18, '#fff');
    T(Gr.x + 14, Gr.y + 26, L('시험지 색 점수 (0~5)', '색 점수 (0~5) · 가로: 재사용 횟수'), L(15.5, 13), '#1f2d44', 'left', 800);
    const pl = imPlot(); drawAxes(pl);
    D.dashedLine(pl.x, pl.Y(4), pl.x + pl.w, pl.Y(4), { color: '#94a3b8', width: 1.4 }); T(pl.x + pl.w - 2, pl.Y(4) - 5, '처음 4.0', 12.5, '#64748b', 'right', 700);
    D.dashedLine(pl.x, pl.Y(2), pl.x + pl.w, pl.Y(2), { color: '#dc2626', width: 1.8 }); T(pl.x + pl.w - 2, pl.Y(2) - 5, '절반 2.0', 12.5, '#dc2626', 'right', 800);
    if (m.scores.length > 1) { ctx.save(); ctx.strokeStyle = m.kind === 'imm' ? '#f59e0b' : '#2563eb'; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.beginPath(); m.scores.forEach((v, i) => { const x = pl.X(i + 1), y = pl.Y(v); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }); ctx.stroke(); ctx.restore(); }
    m.scores.forEach((v, i) => D.sphere(pl.X(i + 1), pl.Y(v), m.sel === i ? 7.5 : 5, m.sel === i ? '#e2464b' : (m.kind === 'imm' ? '#f59e0b' : '#2563eb'), { gloss: true }));
    if (m.sel >= 0 && m.scores[m.sel] != null) D.label(clamp(pl.X(m.sel + 1), pl.x + 50, pl.x + pl.w - 50), pl.y + 12, (m.sel + 1) + '회 → ' + fvS(m.scores[m.sel]), { bg: '#e2464b', size: L(13, 12) });
    // ---- 아래: 비용 ----
    const B = g.B; panel(B.x, B.y, B.w, B.h, 18, '#fff');
    T(B.x + 16, B.y + 28, '효소 값 비교 (1회 사용당)', L(16, 14), '#1f2d44', 'left', 800);
    const bx2 = B.x + L(190, 116), bw2 = B.w - L(190, 116) - 74;
    const rows = [[L('자유 효소 (1회용)', '자유 효소'), 1000, '#2563eb'], [L('고정화 비드 (n회 재사용)', '고정화 비드'), m.n >= 1 ? 1500 / m.n : null, '#f59e0b']];
    rows.forEach(([nm, val, col], i) => {
      const y = B.y + L(48, 46) + i * L(44, 42);
      T(B.x + 16, y + 17, nm, L(15, 12.5), '#26324a', 'left', 800);
      D.roundRect(bx2, y, bw2, 22, 11); ctx.fillStyle = '#eef2f7'; ctx.fill();
      if (val != null) { D.roundRect(bx2, y, Math.max(22, bw2 * clamp(val, 0, 1500) / 1500), 22, 11); ctx.fillStyle = col; ctx.fill(); }
      T(bx2 + bw2 + 8, y + 17, val != null ? fi(val) + '원' : '—', L(16, 14), '#1f2d44', 'left', 800);
    });
    T(B.x + 16, B.y + L(150, 126), m.kind === 'imm' ? '비드 1회 비용 1500원 / ' + Math.max(1, m.n) + '회 = ' + (m.n >= 1 ? fi(1500 / m.n) : '1500') + '원 (사용 ' + m.n + '회째)' : '자유 효소는 쓸 때마다 새로 넣어야 해요: 누적 ' + m.spent + '원', L(15, 12.5), m.kind === 'imm' ? '#b45309' : '#1d4ed8', 'left', 800);
    if (m.kind === 'imm' && m.n >= 1) T(B.x + 16, B.y + L(172, 146), '활성: 처음의 ' + fi(m.scores[m.scores.length - 1] / 4 * 100) + ' %', L(14.5, 12.5), m.scores[m.scores.length - 1] <= 2 ? '#dc2626' : '#475569', 'left', 800);
  }
  const fv1 = (v) => (Math.round(v * 10) / 10).toFixed(1);
  function bead(x, y, m, t) {
    const gr = ctx.createRadialGradient(x - 3, y - 4, 1, x, y, BEAD_R); gr.addColorStop(0, '#fde68a'); gr.addColorStop(0.6, '#f59e0b'); gr.addColorStop(1, '#b45309');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, BEAD_R, 0, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(120,53,15,.6)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = '#2563eb'; [[-3, -2], [3, 2], [0, 5], [-4, 4]].forEach(([dx, dy]) => { ctx.beginPath(); ctx.arc(x + dx, y + dy, 1.4, 0, TAU); ctx.fill(); });
  }
  const imPT = {
    down(p) {
      const pl = imPlot(), m = S.im; if (!inRect(p.x, p.y, imG().Gr) || !m.scores.length) return false;
      let best = -1, bd = 1e9; m.scores.forEach((v, i) => { const d = Math.abs(pl.X(i + 1) - p.x); if (d < bd) { bd = d; best = i; } });
      m.sel = best; Sound.tick(); updateCtl(); return true;
    },
    hover(p) { return inRect(p.x, p.y, imG().Gr) ? 'pointer' : 'default'; },
  };

  /* =========================================================
     ④ 조사 발표
     ========================================================= */
  const TOP6 = [
    { n: '락토프리 우유', ic: '🥛', t: ['식품 공장: 젖당을 분해해 락토프리 우유를 만들어요.', '락테이스: 젖당 → 포도당 + 갈락토스', '기질 특이성: 젖당에만 작용해요.', '장점: 젖당 불내증이 있어도 마실 수 있어요 / 단점: 효소 비용이 들어요.'] },
    { n: '세탁 세제', ic: '🧺', t: ['세탁소와 가정: 단백질·지방 얼룩을 지워요.', '프로테이스·라이페이스: 단백질과 지방을 분해해요.', '최적 온도 약 40 °C: 저온 세탁이 가능해요.', '장점: 세탁 에너지를 아껴요 / 단점: 60 °C 이상에서는 변성돼요.'] },
    { n: '치즈', ic: '🧀', t: ['식품 공장: 우유를 응고시켜 치즈를 만들어요.', '키모신(레닌): 우유 단백질(카세인)을 응고시켜요.', '기질 특이성: 카세인에 작용해요.', '장점: 부산물이 적어요 / 단점: 온도와 pH 조건을 맞춰야 해요.'] },
    { n: '혈당 측정 센서', ic: '🩸', t: ['병원과 가정: 혈액 속 포도당을 측정해요.', '포도당 산화 효소: 포도당 + O₂ → 글루콘산 + H₂O₂', '기질 특이성: 포도당에만 반응해요.', '장점: 적은 양으로 빠르게 측정해요 / 단점: 보관 조건에 따라 활성이 줄어요.'] },
    { n: 'PCR(DNA 증폭)', ic: '🧬', t: ['연구소: DNA를 많이 복제해 늘려요.', 'Taq 중합 효소: DNA를 합성해요.', '내열성: 94 °C에서도 변성되지 않아요 (온천 세균에서 유래).', '장점: 고온을 반복해도 계속 쓸 수 있어요 / 단점: 비용이 들어요.'] },
    { n: '바이오 에탄올', ic: '⛽', t: ['환경·에너지: 식물 섬유로 연료를 만들어요.', '셀룰레이스: 식물 섬유(셀룰로스) → 포도당', '기질 특이성: 식물 섬유에만 작용해요.', '장점: 농업 폐기물을 활용해요 / 단점: 분해가 느리고 비용이 들어요.'] },
  ];
  const PD_H = [['📍', '① 쓰이는 곳', '#ef6a3c'], ['🔬', '② 효소 이름과 반응', '#0ea5e9'], ['🔑', '③ 이용되는 특성', '#a855f7'], ['⚖️', '④ 장점과 단점', '#16a34a']];
  const METH = { doc: '문헌·인터넷 조사', intv: '전문가 인터뷰', survey: '설문 조사', label: '제품 성분표 확인' }, ORGN = { table: '표', pic: '그림·도표', sheet: '스프레드시트' }, TOOLN = { slide: '슬라이드', news: '카드뉴스', video: '짧은 영상' };
  S.pl = { topic: -1, wrong: [false, false, false, false] };
  const plPick = (k) => { const v = selVal('pd' + k); return v === '' ? null : +v; };
  function plBuild(ti) {
    const c = S.pl; c.topic = ti; c.wrong = [false, false, false, false];
    const custom = ti === 6; $('#pdSel').hidden = custom; $('#pdTxt').hidden = !custom;
    for (let k = 0; k < 4; k++) {
      const el = $('#pd' + k); el.innerHTML = ''; const o0 = document.createElement('option'); o0.value = ''; o0.textContent = PD_H[k][1]; el.appendChild(o0);
      el.disabled = ti < 0 || custom; if (ti < 0 || custom) continue;
      const opts = [TOP6[ti].t[k], TOP6[(ti + 2) % 6].t[k], TOP6[(ti + 4) % 6].t[k]]; const sh = (ti + k) % 3;
      [0, 1, 2].forEach((i) => { const oi = (i + sh) % 3; const o = document.createElement('option'); o.value = String(oi); o.textContent = opts[oi]; el.appendChild(o); });
    }
  }
  const plG = () => (PHONE
    ? { H: { x: 10, y: 10, w: 460, h: 120 }, cards: (i) => ({ x: 10 + (i % 2) * 234, y: 138 + Math.floor(i / 2) * 150, w: 226, h: 144 }), X: (j) => ({ x: 10, y: 442 + j * 96, w: 460, h: 90 }) }
    : { H: { x: 14, y: 14, w: 772, h: 100 }, cards: (i) => ({ x: 14 + i * 195, y: 122, w: 187, h: 240 }), X: (j) => ({ x: 14 + j * 391, y: 370, w: 381, h: 176 }) });
  function plSave() { store.set('plan', JSON.stringify({ topic: $('#plTopic').value, method: $('#plMethod').value, org: $('#plOrg').value, tool: $('#plTool').value })); }
  function plDraw(dt, t) {
    const c = S.pl, g = plG(), custom = c.topic === 6, T0 = c.topic >= 0 && !custom ? TOP6[c.topic] : null;
    panel(g.H.x, g.H.y, g.H.w, g.H.h, 16, '#fffdf7');
    T(g.H.x + 16, g.H.y + 30, '🎤 조사 계획 카드', L(17, 15), '#1f2d44', 'left', 800);
    T(g.H.x + 16, g.H.y + 58, '주제: ' + (T0 ? T0.ic + ' ' + T0.n : custom ? '✏ 내가 정한 주제' : '주제를 골라요'), L(18, 15.5), '#0f766e', 'left', 800);
    T(g.H.x + 16, g.H.y + 84, '조사 질문: 이 효소는 왜 여기에 쓰일까?', L(14.5, 13), '#475569', 'left', 700);
    const chips = [['🔎', METH[selVal('plMethod')] || '조사 방법'], ['📊', ORGN[selVal('plOrg')] || '정리 방법'], ['🖥', TOOLN[selVal('plTool')] || '발표 도구']];
    chips.forEach((q, i) => { const on = !!([selVal('plMethod'), selVal('plOrg'), selVal('plTool')][i]); if (PHONE) D.label(g.H.x + g.H.w - 10 - 0, g.H.y + 30 + i * 28 - 4, q[0] + ' ' + q[1], { bg: on ? '#16a34a' : '#e2e8f0', color: on ? '#fff' : '#64748b', size: 12.5, align: 'right' }); else D.label(g.H.x + g.H.w - 14, g.H.y + 28 + i * 30, q[0] + ' ' + q[1], { bg: on ? '#16a34a' : '#e2e8f0', color: on ? '#fff' : '#64748b', size: 13.5, align: 'right' }); });
    for (let k = 0; k < 4; k++) {
      const r = g.cards(k), h = PD_H[k], p = plPick(k); let txt = null;
      if (custom) txt = ($('#pc' + k).value || '').trim() || null; else if (T0 && p != null) txt = [T0.t[k], TOP6[(c.topic + 2) % 6].t[k], TOP6[(c.topic + 4) % 6].t[k]][p];
      const wrong = c.wrong[k];
      D.shadow(() => { D.roundRect(r.x, r.y, r.w, r.h, 14); ctx.fillStyle = wrong ? '#fff1f0' : '#fff'; ctx.fill(); }, { blur: 7, y: 2 });
      D.roundRect(r.x, r.y, r.w, r.h, 14); ctx.strokeStyle = wrong ? '#dc2626' : txt ? h[2] : '#cbd5e1'; ctx.lineWidth = wrong ? 3 : 2; if (!txt) ctx.setLineDash([6, 5]); ctx.stroke(); ctx.setLineDash([]);
      ctx.save(); D.roundRect(r.x, r.y, r.w, r.h, 14); ctx.clip(); ctx.fillStyle = h[2]; ctx.fillRect(r.x, r.y, r.w, L(38, 32)); ctx.restore();
      E(h[0], r.x + 20, r.y + L(20, 17), L(20, 17)); TF(r.x + 38, r.y + L(25, 21), h[1], r.w - 46, L(14.5, 12.5), 10.5, '#fff', 'left', 800);
      textBlock(r.x + 12, r.y + L(60, 54), r.w - 24, txt || (c.topic < 0 ? '주제를 먼저 골라요.' : custom ? '오른쪽 칸에 직접 써요.' : '오른쪽에서 골라요.'), L(14, 12.5), txt ? '#26324a' : '#94a3b8', L(21, 18), 700);
    }
    [0, 1].forEach((j) => {
      const x = g.X(j); const ei = c.topic < 0 || custom ? (j === 0 ? 0 : 3) : (c.topic + (j === 0 ? 2 : 4)) % 6, ex = TOP6[ei];
      panel(x.x, x.y, x.w, x.h, 14, '#f0f9ff');
      T(x.x + 14, x.y + L(26, 24), '🧑‍🎓 친구 예시 ' + (j + 1) + ': ' + ex.ic + ' ' + ex.n, L(15, 13), '#0c4a6e', 'left', 800);
      if (PHONE) TF(x.x + 14, x.y + 52, '효소: ' + ex.t[1], x.w - 28, 13, 10.5, '#334155', 'left', 700); else { textBlock(x.x + 14, x.y + 52, x.w - 28, '쓰이는 곳: ' + ex.t[0], 13.5, '#334155', 20, 700); textBlock(x.x + 14, x.y + 98, x.w - 28, '효소: ' + ex.t[1], 13.5, '#334155', 20, 700); textBlock(x.x + 14, x.y + 138, x.w - 28, '특성: ' + ex.t[2], 13.5, '#334155', 20, 700); }
      if (PHONE) TF(x.x + 14, x.y + 74, '특성: ' + ex.t[2], x.w - 28, 13, 10.5, '#334155', 'left', 700);
    });
  }

  /* =========================================================
     화면 전환 · 조작 연결
     ========================================================= */
  const PTS = { map: mpPT, link: null, wash: null, immo: imPT, present: null };
  function setMode(m) { if (S.mode !== m) S.fade = 1; S.mode = m; PT = PTS[m] || null; hideHint(); if (m === 'wash') S.ws.dwell = 0; updateCtl(); }
  const ctlNodes = $$('#ctrlCard .control');
  const plBad = () => { const c = S.pl; return c.topic < 0; };
  const imMaxRead = () => numIn('inMax');
  function updateCtl() {
    const fr = game ? game.free : false, lvNow = game ? game.level : 0;
    ctlNodes.forEach((n) => { n.hidden = (n.dataset.modes || '').split(' ').indexOf(S.mode) < 0; });
    $$('#ctrlCard [data-grp]').forEach((n) => { n.hidden = !(fr || n.dataset.grp.split(' ').indexOf(S.grp) >= 0); });
    modeButtons(S.mode, lvNow, fr);
    // 지도
    $('#mpNote').innerHTML = '방문한 건물 <b>' + mpVisited() + ' / 5</b> · 스크랩한 카드 <b>' + Object.keys(S.mp.scraps).length + '</b>개 (이 기기에만 저장)';
    PAIR_ANS.forEach((a, i) => { const v = selVal('pr' + i), e = $('#pr' + i); e.classList.toggle('ok', v === a); e.classList.toggle('bad', v !== '' && v !== a); });
    // 원리 연결
    LINK_ANS.forEach((a, i) => { const e = $('#lk' + i); e.classList.remove('bad'); e.classList.toggle('ok', S.lk.wrong[i] === false && selVal('lk' + i) === a && S.lk.checked); });
    $('#lkNote').innerHTML = '고른 사례 <b>' + LINK_ANS.filter((a, i) => selVal('lk' + i)).length + ' / 6</b>';
    // 세탁
    const w = S.ws; $('#sWash').value = w.idx; $('#oWash').textContent = WASH[w.idx].T + ' °C';
    $('#wsNote').innerHTML = '시험한 온도 <b>' + w.tried.filter((x) => x).length + ' / 4</b> · 효과가 높고 에너지가 적게 드는 온도를 골라요.';
    // 고정화
    const m = S.im; chipSet($('#imKind'), m.kind); const busy = m.ph !== 'idle' || m.auto;
    $$('#imKind button').forEach((b) => { b.disabled = busy; });
    $('#imReact').disabled = busy || m.n >= 20 || (m.kind === 'imm' ? m.beads !== 'bowl' : !m.fresh);
    $('#imRecover').disabled = busy || (m.kind === 'imm' ? m.beads !== 'milk' : (m.fresh || m.n === 0));
    $('#imRecover').textContent = m.kind === 'imm' ? '🧺 거름망으로 회수해 재사용' : '🗑 우유와 함께 버리기';
    $('#imAll').disabled = busy || m.kind !== 'imm' || m.n >= 20; $('#imReset').disabled = !!m.auto;
    $('#inCost').classList.toggle('ok', near(numIn('inCost'), 75, 0.5)); $('#inMax').classList.toggle('ok', near(numIn('inMax'), 16, 0));
    $('#imNote').innerHTML = '사용 <b>' + m.n + ' / 20</b>회' + (m.n ? ' · 마지막 색 점수 <b>' + fvS(m.scores[m.scores.length - 1]) + '</b> (처음의 ' + fi(m.scores[m.scores.length - 1] / 4 * 100) + ' %)' : '');
    // 발표
    $('#plNote').innerHTML = S.pl.topic < 0 ? '주제를 고르면 칸마다 문장 3개가 나와요.' : S.pl.topic === 6 ? '내가 정한 주제의 4칸을 직접 써요. (이 기기에만 저장)' : '고른 칸 <b>' + [0, 1, 2, 3].filter((k) => plPick(k) != null).length + ' / 4</b> · 계획 ' + (selVal('plMethod') && selVal('plOrg') && selVal('plTool') ? '✅' : '⬜');
  }
  S.lk.checked = false;
  bindModeSeg(setMode);
  $('#mpQ').addEventListener('input', () => { mpRenderRes(); updateCtl(); });
  PAIR_ANS.forEach((a, i) => $('#pr' + i).addEventListener('change', updateCtl));
  LINK_ANS.forEach((a, i) => $('#lk' + i).addEventListener('change', () => { S.lk.wrong[i] = false; S.lk.checked = false; updateCtl(); }));
  $('#sWash').addEventListener('input', (ev) => wsSet(+ev.target.value));
  $$('#imKind button').forEach((b) => b.addEventListener('click', () => { if (S.im.ph !== 'idle') return; S.im.kind = b.dataset.v; imReset(); }));
  $('#imReact').addEventListener('click', () => imReact());
  $('#imRecover').addEventListener('click', () => imRecover());
  $('#imAll').addEventListener('click', () => imAll());
  $('#imReset').addEventListener('click', () => imReset());
  ['inCost', 'inMax'].forEach((id) => $('#' + id).addEventListener('input', updateCtl));
  (function () {
    const ts = $('#plTopic'); TOP6.forEach((tp, i) => { const o = document.createElement('option'); o.value = String(i); o.textContent = tp.ic + ' ' + tp.n; ts.appendChild(o); }); const oc = document.createElement('option'); oc.value = '6'; oc.textContent = '✏ 내가 정한 주제 (직접 쓰기)'; ts.appendChild(oc);
    ts.addEventListener('change', () => { plBuild(ts.value === '' ? -1 : +ts.value); plSave(); updateCtl(); });
    ['plMethod', 'plOrg', 'plTool'].forEach((id) => $('#' + id).addEventListener('change', () => { plSave(); updateCtl(); }));
    [0, 1, 2, 3].forEach((k) => { $('#pd' + k).addEventListener('change', () => { S.pl.wrong = [false, false, false, false]; updateCtl(); }); $('#pc' + k).addEventListener('input', () => { S.pl.wrong = [false, false, false, false]; updateCtl(); }); });
    try { const sc = store.get('scraps'); if (sc) JSON.parse(sc).forEach((k) => { S.mp.scraps[k] = true; }); } catch (e) { /* 무시 */ }
    try { const pl = JSON.parse(store.get('plan') || 'null'); if (pl) { if (pl.topic !== '' && pl.topic != null) { ts.value = pl.topic; plBuild(+pl.topic); } ['method:plMethod', 'org:plOrg', 'tool:plTool'].forEach((q) => { const [k, id] = q.split(':'); if (pl[k]) $('#' + id).value = pl[k]; }); } } catch (e) { /* 무시 */ }
  })();

  /* =========================================================
     미션
     ========================================================= */
  const levels = [
    {
      title: '효소 사례 지도', short: '사례 지도', icon: '🗺', phase: '분석',
      intro: '<p class="si-q">❓ 탐구 질문: 빨래를 찬물로도 깨끗이 빨 수 있게 한 것은 무엇일까? 효소는 우리 생활에서 또 어디에 쓰일까?</p><p>🔗 <b>앞 차시들</b>에서 효소의 특성(기질 특이성, 최적 온도와 pH), 작용 기작, 저해와 조절을 배웠어요. 이번에는 효소가 <b>생활과 산업</b>에서 어떻게 쓰이는지 <b>조사하고 발표</b>해요.</p><p>효소 마을의 건물 5곳(식품 공장, 세탁소, 병원, 연구소, 환경 처리장)을 눌러 효소 카드를 열어 봐요. 조사에서는 검색과 스크랩 같은 <b>디지털 도구</b>를 써요. 🔎 키워드 검색으로 카드를 찾고 📌 스크랩할 수 있어요.</p>',
      features: ['map'],
      setup() { S.grp = 'none'; setMode('map'); },
      recap: '효소는 식품, 세제·섬유, 의약·진단, 연구·생명공학, 환경·에너지 분야에서 폭넓게 이용돼요. 각 효소는 정해진 기질에만 작용해 원하는 반응만 일으켜요.',
      summary: '<ul><li><b>식품</b>: 락테이스(락토프리 우유), 키모신(치즈), 펙티네이스(맑은 과즙), 아밀레이스(물엿·빵 반죽), 파파인(육류 연화). <b>세제·섬유</b>: 프로테이스·라이페이스·아밀레이스(얼룩 분해, 저온 세탁), 셀룰레이스(청바지 가공).</li><li><b>의약·진단</b>: 소화제, 포도당 산화 효소(혈당 센서), 혈전 용해 효소, 리소자임(살균). <b>연구·생명공학</b>: Taq 중합 효소(PCR), 제한 효소와 연결 효소(DNA 자르고 붙이기, 이름만).</li><li><b>환경·에너지</b>: 셀룰레이스(식물 섬유 → 포도당 → 바이오 에탄올), 기름 분해 효소, PET 분해 효소 연구.</li><li>조사에는 검색, 스프레드시트, 발표 도구 같은 <b>디지털 탐구 도구</b>를 활용해요.</li></ul>',
      missions: [
        {
          id: 'visit', title: '건물 5곳 방문하기',
          goal: '효소 마을의 <b>건물 5곳</b>을 모두 눌러 효소 카드를 열어 보세요.',
          hint: '지도 위의 건물(식품 공장, 세탁소, 병원, 연구소, 환경 처리장)을 하나씩 눌러요. 🔎 검색으로 찾은 건물에는 주황 고리가 생겨요.',
          setup() { S.grp = 'none'; setMode('map'); },
          check: () => mpVisited() >= 5, hold: 0.5,
          status: () => BLD.map((b) => mark(!!S.mp.visited[b.id]) + ' ' + b.n).join(' &nbsp; '),
          explain: '5곳의 카드를 보면 효소가 <b>식품, 세제·섬유, 의약·진단, 연구, 환경</b>에서 이용되는 것을 알 수 있어요. 카드마다 효소가 작용하는 기질과 얻는 것이 달라요.',
        },
        {
          id: 'pairs', title: '효소와 분야 연결', manual: true,
          goal: '효소 10개가 쓰이는 <b>분야(건물)</b>를 골라 연결하세요.',
          hint: '지도의 카드를 다시 열어 확인해요. 혈당 센서와 혈전 치료는 병원, PCR과 DNA 자르기는 연구소, 바이오 에탄올과 기름·플라스틱 분해는 환경 처리장이에요.',
          setup() { S.grp = 'pairs'; setMode('map'); },
          check() {
            const miss = PAIR_ANS.findIndex((a, i) => !selVal('pr' + i)); if (miss >= 0) return (miss + 1) + '번 ' + PAIR_N[miss] + '의 분야를 골라 주세요.';
            const bad = PAIR_ANS.findIndex((a, i) => selVal('pr' + i) !== a); if (bad >= 0) return (bad + 1) + '번 ' + PAIR_N[bad] + josa(PAIR_N[bad], '은', '는') + ' 다른 분야에서 쓰여요. 지도의 카드를 확인해 보세요.';
            return true;
          },
          explain: '락테이스·키모신은 <b>식품 공장</b>, 세제용 프로테이스는 <b>세탁소</b>, 포도당 산화 효소·혈전 용해 효소는 <b>병원</b>, Taq 중합 효소·제한 효소는 <b>연구소</b>, 식물 섬유 셀룰레이스·기름 분해 효소·PET 분해 효소는 <b>환경 처리장</b>에서 이용돼요.',
        },
        {
          type: 'quiz', title: '락토프리 우유', goal: '<b>락토프리 우유</b>를 만드는 효소와, 락토프리 우유가 단맛이 <b>더 나는</b> 까닭은?',
          setup() { S.grp = 'none'; setMode('map'); },
          choices: ['아밀레이스: 녹말이 엿당으로 분해되기 때문이다', '락테이스: 젖당이 포도당과 갈락토스로 분해되어 단맛이 더 나기 때문이다', '키모신: 우유 단백질이 응고되기 때문이다', '프로테이스: 젖당이 단백질로 바뀌기 때문이다'],
          answer: 1,
          feedback: ['우유에는 녹말이 거의 없어요.', '', '키모신은 치즈를 만들 때 쓰여요.', '프로테이스는 단백질을 분해하는 효소예요.'],
          explain: '<b>락테이스</b>가 우유 속 <b>젖당</b>을 <b>포도당과 갈락토스</b>로 분해해요. 분해된 단당류가 젖당보다 단맛이 더 강하게 느껴져요. 젖당 불내증이 있는 사람도 마실 수 있어요.',
        },
      ],
    },
    {
      title: '이용 사례의 원리', short: '원리 연결', icon: '🔗', phase: '탐구',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 효소가 여러 분야에 이용되는 사례를 조사했어요.</div><p>사례마다 <b>효소의 어떤 특성</b> 때문에 그 효소를 이용하는지 연결해 봐요. 세제의 프로테이스는 <b>기질 특이성</b>, 세탁 온도는 <b>최적 온도</b>, PCR의 Taq 중합 효소는 <b>내열성</b>, 효소 양이 적어도 되는 것은 <b>소량으로 반복 작용</b>하기 때문이에요.</p><p>👕 <b>세탁 온도</b> 화면에서는 온도를 바꿔 얼룩 제거율과 에너지를 비교해 가장 알맞은 온도를 골라요. (수치는 모두 예시예요.)</p>',
      features: ['link', 'wash'],
      setup() { S.grp = 'none'; setMode('link'); },
      recap: '효소를 이용하는 까닭은 효소의 특성 때문이에요: 기질 특이성(원하는 반응만), 최적 온도·pH(알맞은 조건), 내열성(고온 반복), 소량·반복 작용(적은 양). 세제 효소는 약 40 °C에서 가장 잘 작용하고 60 °C 이상에서는 변성돼요.',
      summary: '<ul><li><b>이용의 이유</b>: 상온·상압·중성에 가까운 조건에서 작용(에너지 절약), 기질 특이성이 높아 부산물이 적음, 사용량이 적고 생분해돼 환경 부담이 작음.</li><li>세제 효소의 최적 온도는 약 <b>40 °C</b>이고 60 °C 이상에서는 <b>변성</b>되어 효과가 떨어져요. 그래서 찬물~미지근한 물로도 세탁할 수 있어요.</li><li>얼룩의 종류가 여러 가지라서(단백질, 지방, 녹말) 세제에는 <b>프로테이스, 라이페이스, 아밀레이스</b>를 함께 넣어요 (기질 특이성). <b>Taq 중합 효소</b>는 94 °C에서도 작용하는 열에 강한 효소예요(온천 세균에서 유래).</li></ul>',
      missions: [
        {
          id: 'links', title: '사례와 특성 연결', manual: true,
          goal: '사례 6개가 효소의 <b>어떤 특성</b> 때문인지 골라요.',
          hint: '원하는 물질에만 작용하면 기질 특이성, 온도나 pH를 맞춰 쓰면 최적 온도·pH, 높은 온도에서도 쓰면 내열성, 조금만 넣어도 되면 소량으로 반복 작용이에요.',
          setup() { S.grp = 'none'; setMode('link'); },
          check() {
            const miss = LINK_ANS.findIndex((a, i) => !selVal('lk' + i)); if (miss >= 0) return (miss + 1) + '번 사례의 특성을 골라 주세요.';
            S.lk.checked = true; S.lk.wrong = LINK_ANS.map((a, i) => selVal('lk' + i) !== a);
            const bad = S.lk.wrong.findIndex((x) => x); if (bad >= 0) return (bad + 1) + '번 사례를 다시 생각해 보세요. (빨간 카드)';
            return true;
          },
          explain: '프로테이스와 셀룰레이스는 정해진 <b>기질에만</b> 작용하고, 세탁 온도는 <b>최적 온도</b>, 펩신 소화제는 <b>최적 pH</b>(pH 2), Taq 중합 효소는 <b>내열성</b>, 효소를 조금만 써도 되는 것은 <b>소량으로 반복 작용</b>하기 때문이에요.',
        },
        {
          id: 'wash', title: '세탁 온도 정하기',
          goal: '세탁 온도 <b>30 · 40 · 60 · 80 °C</b>를 모두 시험하고, 얼룩이 잘 지워지면서 에너지가 적게 드는 온도로 <b>맞춰 두세요</b>.',
          hint: '슬라이더를 한 칸씩 옮기며 각 온도에서 잠시 기다려요(1~2초). 제거율이 가장 높은 온도는 효소의 최적 온도 근처예요. 마지막에 그 온도에 맞춰요.',
          setup() { S.grp = 'none'; setMode('wash'); },
          check: () => S.ws.tried.every((x) => x) && S.ws.idx === 1, hold: 0.8,
          status: () => WASH.map((q, i) => mark(S.ws.tried[i]) + q.T + '°C').join(' &nbsp; ') + ' &nbsp; ' + mark(S.ws.idx === 1) + ' 40 °C로 맞춤',
          explain: '<b>약 40 °C</b>에서 얼룩이 가장 잘 지워지고 에너지도 적게 들어요. 60 °C 이상에서는 효소가 <b>변성</b>되어 활성 부위의 모양이 무너져 효과가 떨어지고 에너지만 많이 들어요.',
        },
        {
          type: 'quiz', title: '세제에 여러 효소를 넣는 까닭', goal: '세제에 프로테이스, 라이페이스, 아밀레이스를 <b>함께</b> 넣는 까닭은?',
          setup() { S.grp = 'none'; setMode('wash'); },
          choices: ['효소가 서로 섞이면 반응이 더 빨라지기 때문이다', '효소는 기질 특이성이 있어 얼룩의 종류(단백질, 지방, 녹말)마다 알맞은 효소가 필요하기 때문이다', '하나의 효소는 한 번만 쓰이기 때문이다', '세제의 거품을 만들기 위해서이다'],
          answer: 1,
          feedback: ['효소끼리 반응을 더 빠르게 하지 않아요.', '', '효소는 재사용돼요.', '거품은 다른 성분이 만들어요.'],
          explain: '효소는 <b>기질 특이성</b>이 있어서 단백질 얼룩은 프로테이스가, 지방 얼룩은 라이페이스가, 녹말 얼룩은 아밀레이스가 분해해요. 그래서 혼합 얼룩에는 여러 효소를 함께 넣어요.',
        },
      ],
    },
    {
      title: '고정화 효소 실험', short: '고정화 실험', icon: '🧫', phase: '실험',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 효소의 특성이 이용 사례의 이유가 되는 것을 확인했어요. 효소는 반응 후에도 변하지 않아 재사용할 수 있지만, 용액에 녹아 있으면 회수하기 어려워요.</div><p>그래서 산업에서는 효소를 <b>고정화</b>해요. 효소를 <b>알긴산 비드</b> 속에 가두면 거름망으로 <b>회수해 재사용</b>할 수 있어요. 락테이스 비드를 우유에 넣어 10분 반응시키고, 포도당 시험지 색으로 분해 정도를 확인해요. (모두 가상 예시예요.)</p><p>효소 값(1회 1000원)과 비드 값(1500원)을 비교해 <b>회당 비용</b>도 계산해 봐요.</p>',
      features: ['immo'],
      setup() { S.grp = 'none'; setMode('immo'); },
      recap: '고정화한 효소는 거름망으로 회수해 여러 번 재사용할 수 있어 회당 비용이 낮아져요. 다만 반복할수록 활성이 조금씩 줄고, 가둘수록 기질이 접근하기 어려워 활성이 다소 낮아질 수 있어요.',
      summary: '<ul><li><b>고정화 효소</b>: 알긴산 비드 같은 물질에 효소를 가둔 것이에요. 반응 후 <b>회수해 재사용</b>할 수 있고 생성물에 효소가 섞이지 않아요.</li><li>회당 비용 예: 효소 1회 사용 1000원, 비드 1회 비용 1500원이지만 20번 재사용하면 <b>1500원 / 20회 = 75원</b>이에요.</li><li>한계: 반복할수록 활성이 줄어요(예: 20회 뒤 처음의 약 40 %). 활성이 <b>처음의 50 % 이하</b>가 되기 전까지(예: 약 16회)를 재사용 한도로 보아요. 효소를 가두면 기질이 접근하기 어려워 활성이 다소 낮아질 수 있어요.</li></ul>',
      missions: [
        {
          id: 'reuse', title: '비드 5번 재사용하기',
          goal: '🟡 <b>고정화 비드</b>로 우유에 넣어 반응 → 거름망으로 회수해 새 우유에 재사용하는 일을 <b>5번</b> 반복하세요.',
          hint: '▶ 우유에 넣고 10분 반응을 누르고, 끝나면 🧺 거름망으로 회수해 재사용을 눌러요. 이것을 반복해 사용 횟수를 5회까지 채워요. 자유 효소도 시험해 보세요.',
          setup() { S.grp = 'none'; setMode('immo'); if (S.im.kind !== 'imm') { S.im.kind = 'imm'; imReset(); } },
          check: () => S.im.kind === 'imm' && S.im.n >= 5 && !S.im.auto, hold: 0.5,
          status: () => mark(S.im.n >= 5) + ' 비드 사용 ' + Math.min(S.im.n, 5) + ' / 5회 &nbsp; 마지막 점수 ' + (S.im.n ? fvS(S.im.scores[S.im.n - 1]) : '—'),
          explain: '비드는 거름망으로 <b>회수해 새 우유에 다시</b> 쓸 수 있어요. 시험지 색 점수가 조금씩 낮아지는 것은 반복할수록 활성이 줄기 때문이에요(1회 4.0 → 5회 3.5).',
        },
        {
          id: 'calc', title: '회당 비용과 재사용 한도',
          goal: '비드를 <b>20번</b> 쓸 때의 <b>1회당 비용</b>을 계산하고, 활성이 처음(4.0)의 <b>50 %(2.0) 이하</b>가 되기 전까지 몇 회 쓸 수 있는지 그래프에서 읽어 쓰세요.',
          hint: '⏩ 20회까지 한꺼번에를 누르면 자료가 채워져요. 1500원 / 20회를 계산해요. 그래프의 점을 눌러 점수를 확인하고, 2.0(빨간 점선)보다 높은 마지막 횟수를 찾아요.',
          setup() { S.grp = 'calc'; setMode('immo'); },
          check: () => S.im.kind === 'imm' && S.im.n >= 17 && near(numIn('inCost'), 75, 0.5) && near(numIn('inMax'), 16, 0) && !S.im.auto, hold: 0.5,
          status: () => mark(S.im.kind === 'imm' && S.im.n >= 17) + ' 비드 자료 ' + (S.im.kind === 'imm' ? S.im.n : 0) + ' / 17회 이상 &nbsp; ' + mark(near(numIn('inCost'), 75, 0.5)) + ' 1회당 비용 &nbsp; ' + mark(near(numIn('inMax'), 16, 0)) + ' 재사용 한도',
          explain: '1500원 / 20회 = <b>75원</b>이에요. 점수가 2.0(처음의 50 %)보다 높게 유지되는 마지막 횟수는 <b>16회</b>(약 2.08)이고 17회에는 약 1.96으로 내려가요. 한도를 넘으면 효소를 새로 바꾸는 것이 좋아요.',
        },
        {
          type: 'quiz', title: '고정화의 장점과 한계', goal: '효소를 고정화하는 것에 대한 설명으로 <b>옳은 것</b>은?',
          setup() { S.grp = 'none'; setMode('immo'); },
          choices: ['효소를 회수해 재사용할 수 있지만, 가둘수록 기질이 접근하기 어려워 활성이 다소 낮아질 수 있다', '효소가 소모되지 않으므로 몇 번을 써도 활성이 전혀 줄지 않는다', '고정화하면 효소의 기질 특이성이 사라진다', '고정화한 효소는 한 번만 쓸 수 있다'],
          answer: 0,
          feedback: ['', '실험에서 활성이 조금씩 줄었어요.', '기질 특이성은 그대로예요.', '비드는 회수해 여러 번 쓸 수 있어요.'],
          explain: '고정화의 장점은 <b>회수와 재사용</b>이고, 한계는 가두면 기질이 접근하기 어려워 <b>활성이 다소 낮아질 수 있고</b> 반복할수록 활성이 줄어든다는 점이에요.',
        },
      ],
    },
    {
      title: '조사 발표 카드', short: '조사 발표', icon: '🎤', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 이용 사례, 원리, 고정화 실험을 조사했어요. 이제 <b>조사해서 발표</b>할 차례예요.</div><p>조사 계획 카드를 만들어요. <b>주제</b>를 고르고(직접 정해도 돼요), <b>조사 방법 · 정리 방법 · 발표 도구</b>를 선택해요. 그다음 발표 카드 4칸 <b>쓰이는 곳 · 효소 이름과 반응 · 이용되는 특성 · 장점과 단점</b>을 채워요.</p><p>친구가 만든 예시 카드 두 장과 비교해 보세요. 입력한 내용은 <b>이 기기에만</b> 저장돼요.</p>',
      features: ['present'],
      setup() { S.grp = 'none'; setMode('present'); },
      recap: '조사 발표는 주제 정하기 → 조사 방법과 정리 방법 고르기 → 발표 카드(쓰이는 곳, 효소와 반응, 이용되는 특성, 장단점) 만들기 순서로 해요. 효소 이용은 특성 덕분에 에너지와 환경 부담을 줄여요.',
      summary: '<ul><li><b>조사 발표 순서</b>: 주제와 조사 질문 정하기 → 조사 방법(문헌, 인터뷰, 설문, 제품 성분표)과 정리 방법(표, 그림, 스프레드시트) 정하기 → 발표 도구(슬라이드, 카드뉴스, 영상)로 발표하기.</li><li><b>발표 카드 4칸</b>: 쓰이는 곳, 효소 이름과 반응, 이용되는 특성(기질 특이성, 최적 온도·pH, 내열성 등), 장점과 단점.</li><li>효소 이용의 환경 이점: 낮은 온도와 중성에 가까운 조건에서 작용해 <b>에너지를 아끼고</b>, 기질 특이성이 높아 <b>부산물이 적고</b>, 생분해되어 환경 부담이 작아요.</li></ul>',
      missions: [
        {
          id: 'card', title: '내 발표 카드 만들기', manual: true,
          goal: '<b>주제와 조사 계획</b>(방법·정리·도구)을 고르고 <b>발표 카드 4칸</b>을 완성하세요. 친구 예시 카드와 비교해 보세요.',
          hint: '주제를 고르면 칸마다 문장 3개가 나와요. 그 주제에 맞는 문장을 골라요. 직접 정한 주제는 4칸을 직접 써요(4글자 이상).',
          setup() { S.grp = 'none'; setMode('present'); },
          check() {
            const c = S.pl; if (c.topic < 0) return '먼저 주제를 골라 주세요.';
            if (!selVal('plMethod') || !selVal('plOrg') || !selVal('plTool')) return '조사 방법, 정리 방법, 발표 도구를 모두 골라 주세요.';
            if (c.topic === 6) { const short = [0, 1, 2, 3].findIndex((k) => ($('#pc' + k).value || '').trim().length < 4); if (short >= 0) { c.wrong = [0, 1, 2, 3].map((k) => ($('#pc' + k).value || '').trim().length < 4); return (short + 1) + '번 칸을 4글자 이상 써 주세요.'; } c.wrong = [false, false, false, false]; return true; }
            const miss = [0, 1, 2, 3].findIndex((k) => plPick(k) == null); if (miss >= 0) return (miss + 1) + '번 칸을 아직 안 골랐어요.';
            c.wrong = [0, 1, 2, 3].map((k) => plPick(k) !== 0);
            if (c.wrong.some((x) => x)) return '빨간 칸의 문장은 이 주제의 내용이 아니에요. 주제와 맞는지 다시 읽어 보세요.';
            return true;
          },
          explain: '발표 카드에는 <b>쓰이는 곳, 효소 이름과 반응, 이용되는 특성, 장점과 단점</b>이 들어가요. 친구 예시 카드와 비교하면 사례마다 <b>이용하는 특성</b>이 다르지만 모두 효소의 특성 때문이라는 공통점을 찾을 수 있어요.',
        },
        {
          type: 'quiz', title: '효소 이용과 환경', goal: '효소를 이용한 제품이 <b>환경에 도움이 되는 점</b>은?',
          setup() { S.grp = 'none'; setMode('present'); },
          choices: ['낮은 온도와 중성에 가까운 조건에서 작용해 에너지를 아끼고, 기질 특이성이 높아 부산물이 적다', '반드시 높은 온도와 강한 산이 있어야 작동한다', '효소는 반응에서 모두 소모되어 매번 새로 만들어야 한다', '모든 물질을 한꺼번에 분해해 부산물이 많다'],
          answer: 0,
          feedback: ['', '효소는 보통 온화한 조건에서 작용해요.', '효소는 소모되지 않아요.', '효소는 기질 특이성이 있어 부산물이 적어요.'],
          explain: '효소는 <b>온화한 조건</b>에서 정해진 기질에만 작용하므로 에너지를 아끼고 부산물이 적으며 생분해돼요. 그래서 세제의 저온 세탁, 바이오 에탄올 같은 곳에서 환경 부담을 줄여요.',
        },
      ],
    },
  ];

  mpRenderRes(); wsSet; plBuild(S.pl.topic);
  game = SciSim.game({
    simId: 'hy-enzyme-industry', mount: '#game', badge: '효소 이용 발표왕', homeHref: '../../index.html#hy',
    featureLabels: { map: '🗺 효소 마을 지도', link: '🔗 사례와 특성 연결', wash: '👕 세탁 온도 실험', immo: '🧫 고정화 효소 실험', present: '🎤 조사 발표 카드' },
    onFeatures() { updateCtl(); },
    levels,
  });

  function readouts() {
    const m = S.mode;
    if (m === 'map') setReads(['방문한 건물', mpVisited() + ' / 5', '지금 건물', S.mp.sel >= 0 ? BLD[S.mp.sel].n : '—', '스크랩', Object.keys(S.mp.scraps).length + '개']);
    else if (m === 'link') setReads(['고른 사례', LINK_ANS.filter((a, i) => selVal('lk' + i)).length + ' / 6', '맞게 고른 사례', LINK_ANS.filter((a, i) => selVal('lk' + i) === a).length + '', '특성 종류', '5가지']);
    else if (m === 'wash') setReads(['세탁 온도', WASH[S.ws.idx].T + ' °C', '얼룩 제거율', fi(S.ws.rem.v) + ' %', '에너지(상대값)', fi(S.ws.cost.v)]);
    else if (m === 'immo') setReads(['효소 종류', S.im.kind === 'imm' ? '고정화 비드' : '자유 효소', '사용 횟수', S.im.n + ' / 20', '1회당 비용', S.im.kind === 'imm' ? (S.im.n ? fi(1500 / S.im.n) + '원' : '—') : '1000원']);
    else setReads(['주제', S.pl.topic >= 0 ? (S.pl.topic === 6 ? '내가 정한 주제' : TOP6[S.pl.topic].n) : '—', '채운 칸', (S.pl.topic === 6 ? [0, 1, 2, 3].filter((k) => ($('#pc' + k).value || '').trim()).length : [0, 1, 2, 3].filter((k) => plPick(k) != null).length) + ' / 4', '조사 계획', (selVal('plMethod') && selVal('plOrg') && selVal('plTool')) ? '완성' : '—']);
  }

  setMode('map');
  let lastFree = false, lastLv = -1;
  SciSim.loop((dt, t) => {
    clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (game && game.level !== lastLv) { lastLv = game.level; updateCtl(); }
    view.apply(); FX.update(dt); ctx.clearRect(0, 0, VW, VH);
    bgFill('#f3f6ee', '#e8eee2');
    updLater(dt);
    if (S.mode !== 'immo') imStep(dt);
    if (S.mode !== 'wash') wsUpdate(dt);
    if (S.mode === 'map') mpDraw(dt, t); else if (S.mode === 'link') lkDraw(dt, t); else if (S.mode === 'wash') wsDraw(dt, t); else if (S.mode === 'immo') imDraw(dt, t); else plDraw(dt, t);
    FX.draw(); parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(241,246,243,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : approach(S.fade, 0, dt, 9); }
    readouts();
  });

  window.__sim = { S, VW, VH, PHONE, get game() { return game; }, levels, setMode, mpSelect, wsSet, imReact, imRecover, imAll, imReset, imStep, plBuild, immScore, TOP6, BLD, WASH, updateCtl, mpG, imG, imPlot, mpVisited };
})();
