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
     고등학교 세포와 물질대사 · Ⅲ. 세포호흡과 광합성 - 세포호흡의 4단계 (단원 58, 2차시)
     성취기준 [12세포03-02] 세포호흡 과정의 단계별 특징을 다양한 매체를 활용하여 협력적으로 소통할 수 있다.
     ① 모형: 4단계 지도  ② 분석: 산출물 계산  ③ 탐구: 호흡 조절  ④ 분석: 릴레이 설명
     (유기물의 구조식은 다루지 않아요: 탄소 개수 구슬로만 표현)
     ========================================================= */
  const S = { mode: 'map', fade: 0, sub: 'run' };
  let game = null;
  const fi = (v) => String(Math.round(v));
  const ST = [
    { id: 'glyc', n: '해당 과정', loc: '세포질', locId: 'cyto', col: '#16a34a' },
    { id: 'pyox', n: '피루브산 산화', loc: '미토콘드리아 기질', locId: 'matrix', col: '#0ea5e9' },
    { id: 'tca', n: 'TCA 회로', loc: '미토콘드리아 기질', locId: 'matrix', col: '#8b5cf6' },
    { id: 'etc', n: '전자 전달계', loc: '미토콘드리아 내막', locId: 'inner', col: '#e11d74' },
  ];
  const cmix = C.mix;
  const ATPN = 2.5, ATPF = 1.5;   // 전자 운반체 1개당 만들 수 있는 ATP (단순 값)

  /* =========================================================
     ① 4단계 지도: 구슬 추적
     ========================================================= */
  function mG() {
    const P = PHONE ? { x: 10, y: 10, w: 460, h: 424 } : { x: 14, y: 14, w: 772, h: 402 };
    const mx0 = P.x + P.w * (PHONE ? 0.34 : 0.38), mx1 = P.x + P.w - 10, my0 = P.y + P.h * 0.27, my1 = P.y + P.h - 58;
    const cx = (mx0 + mx1) / 2, cy = (my0 + my1) / 2, hw = (mx1 - mx0) / 2, hh = (my1 - my0) / 2, R = Math.min(hh * 0.5, 54), ihw = hw - 14, ihh = hh - 14, ir = Math.max(8, R - 14);
    const sh = ihw - ir, u = PHONE ? 0.82 : 1, rr = Math.min(ihw * 0.3, ihh * 0.5), rc = PHONE ? { x: cx + ihw * 0.16, y: cy - ihh * 0.2 } : { x: cx + ihw * 0.3, y: cy - ihh * 0.1 }, ye = cy + ihh;
    const ang = (a) => ({ x: rc.x + rr * Math.cos(a), y: rc.y + rr * Math.sin(a) });
    return {
      P, mx0, mx1, my0, my1, cx, cy, hw, hh, R, ihw, ihh, ir, sh, u, rr, rc, ye, br: 6.4 * u,
      glu: { x: P.x + P.w * (PHONE ? 0.17 : 0.13), y: P.y + P.h * 0.27 },
      pyA: { x: P.x + P.w * (PHONE ? 0.09 : 0.07), y: P.y + P.h * 0.62 }, pyB: { x: P.x + P.w * (PHONE ? 0.25 : 0.21), y: P.y + P.h * 0.62 },
      site: { x: cx - ihw * (PHONE ? 0.4 : 0.52), y: cy - ihh * 0.28 },
      pool: { x: cx - ihw * 0.9, y: cy + ihh * 0.28, w: 38 * u, h: 19 * u },
      cxs: [-0.8, -0.3, 0.2].map((f) => ({ x: cx + sh * f, y: ye })), syn: { x: cx + sh * 0.82, y: ye },
      o2: { x: cx + sh * 0.2, y: my1 + 22 },
      ringA: ang,
    };
  }
  S.sg = { run: 0, stage: 0, busy: false, cur: 0, grps: [], toks: [], co2: [], els: [], cnt: { atp: 0, nadh: 0, fadh: 0, co2: 0, o2: 0 }, num: { atp: new Num(0), nadh: new Num(0), fadh: new Num(0), co2: new Num(0), o2: new Num(0) }, cap: '', ring: null, rot: 0, glow: 0 };
  const CAPS = [
    '', '① 해당 과정 (세포질, 산소 필요 없음): 6탄소 포도당 → 3탄소 피루브산 2분자 · ATP 순생산 2 · NADH 2',
    '② 피루브산 산화 (기질): 3탄소 피루브산 → 2탄소 아세틸 CoA + CO₂ (2분자 모두) · NADH 2',
    '③ TCA 회로 (기질): 2탄소 + 4탄소 → 6탄소 → … → 4탄소, 한 바퀴에 CO₂ 2 · ATP 1 · NADH 3 · FADH₂ 1 (2회전)',
    '④ 전자 전달계 (내막): NADH · FADH₂의 전자가 전달되어 O₂ 가 H₂O 로 환원 · ATP 대량 합성 (약 28)',
  ];
  function sgReset() {
    const sg = S.sg, g = mG();
    sg.run++; clearLater(); FX.clear(); parts.clear();
    sg.stage = 0; sg.busy = false; sg.cur = 0; sg.toks = []; sg.co2 = []; sg.els = []; sg.ring = null; sg.cap = ''; sg.glow = 0;
    sg.cnt = { atp: 0, nadh: 0, fadh: 0, co2: 0, o2: 0 }; Object.keys(sg.num).forEach((k) => sg.num[k].snap(0));
    sg.grps = [{ id: 'glu', n: 6, x: g.glu.x, y: g.glu.y, a: 1, name: '포도당' }];
    updateCtl();
  }
  const sgSet = (k, v) => { S.sg.cnt[k] = v; S.sg.num[k].set(v); };
  const sgCapOf = (k) => CAPS[k];
  function sgGo(o, to, dur, delay, ease) { if (RM) { Object.assign(o, to); return; } SciSim.tween(o, to, { duration: dur, delay: delay || 0, ease: ease || 'inOutCubic' }); }
  function sgCarrier(type, from, run) {
    const sg = S.sg, g = mG(), i = sg.toks.length, slot = { x: g.pool.x + (i % 6) * (g.pool.w + 3), y: g.pool.y + Math.floor(i / 6) * (g.pool.h + 4) };
    const t = { t: type, x: from.x, y: from.y, a: 0, used: false, gray: 0, slot };
    sg.toks.push(t); sgGo(t, { a: 1 }, 0.2); sgGo(t, { x: slot.x, y: slot.y }, 0.8, 0.1);
    return t;
  }
  function sgCO2(from, g) {
    const sg = S.sg; sg.co2.push({ x: from.x, y: from.y, vy: -34 * g.u, a: 1, t: 0 }); Sound.tick();
  }
  function sgNext() {
    const sg = S.sg; if (sg.busy || sg.stage >= 4) return;
    const k = sg.stage + 1, run = sg.run, g = mG(); sg.busy = true; sg.cur = k; sg.cap = CAPS[k];
    const T = (d, f) => after(RM ? d * 0.02 + 0.001 : d, () => { if (sg.run !== run) return; f(); });
    const fin = (d) => T(d, () => { sg.stage = k; sg.busy = false; if (k === 4) { Sound.success(); parts.burst(g.syn.x, g.syn.y - 20, { count: 20, colors: ['#facc15', '#fff'], speed: 150, life: 0.9, gravity: 40 }); } updateCtl(); });
    const fx = (x, y, text, color) => FX.add({ kind: 'text', x, y, life: 1.4, text, color: color || '#16a34a', size: 15 });
    const grp = (id) => sg.grps.find((q) => q.id === id);
    if (k === 1) {
      const glu = grp('glu');
      T(0.1, () => { fx(glu.x + 8, glu.y - 40, 'ATP 2 소비 (−2)', '#dc2626'); sgGo(glu, { y: glu.y + 8 }, 0.3, 0, 'outBack'); });
      T(1.0, () => {   // 6C → 3C + 3C
        sg.grps = sg.grps.filter((q) => q.id !== 'glu');
        const a = { id: 'pa', n: 3, x: glu.x, y: glu.y, a: 1, name: '피루브산' }, b = { id: 'pb', n: 3, x: glu.x, y: glu.y, a: 1, name: '피루브산' };
        sg.grps.push(a, b); sgGo(a, { x: g.pyA.x, y: g.pyA.y }, 0.8, 0, 'outCubic'); sgGo(b, { x: g.pyB.x, y: g.pyB.y }, 0.8, 0, 'outCubic'); Sound.click();
      });
      T(1.8, () => { fx(g.pyA.x + 40, g.pyA.y - 40, 'ATP 4 생성 (+4)', '#16a34a'); sgSet('atp', 2); });
      T(2.2, () => { for (let j = 0; j < 2; j++) { sgCarrier('NADH', j ? g.pyB : g.pyA, run); sgSet('nadh', sg.cnt.nadh + 1); } fx((g.pyA.x + g.pyB.x) / 2, g.pyA.y - 60, 'NADH +2', '#0f766e'); });
      fin(3.2);
    } else if (k === 2) {
      const a = grp('pa'), b = grp('pb'), sA = { x: g.site.x - 36 * g.u, y: g.site.y }, sB = { x: g.site.x + 36 * g.u, y: g.site.y };
      T(0.0, () => { sgGo(a, { x: sA.x, y: sA.y }, 1.0, 0, 'inOutCubic'); sgGo(b, { x: sB.x, y: sB.y }, 1.0, 0.25, 'inOutCubic'); });
      T(1.5, () => { a.n = 2; a.name = '아세틸 CoA'; sgCO2({ x: a.x, y: a.y - 14 }, g); sgSet('co2', sg.cnt.co2 + 1); sgCarrier('NADH', a, run); sgSet('nadh', sg.cnt.nadh + 1); fx(a.x, a.y - 50, 'CO₂ −1C', '#475569'); });
      T(2.1, () => { b.n = 2; b.name = '아세틸 CoA'; sgCO2({ x: b.x, y: b.y - 14 }, g); sgSet('co2', sg.cnt.co2 + 1); sgCarrier('NADH', b, run); sgSet('nadh', sg.cnt.nadh + 1); fx(b.x, b.y - 50, 'CO₂ −1C', '#475569'); });
      fin(3.2);
    } else if (k === 3) {
      const ac = [grp('pa'), grp('pb')], ring = { id: 'ring', n: 4, x: g.ringA(Math.PI / 2).x, y: g.ringA(Math.PI / 2).y, a: 0, name: '화합물' };
      sg.grps.push(ring); sg.ring = ring; sgGo(ring, { a: 1 }, 0.4);
      for (let j = 0; j < 2; j++) {
        const t0 = 0.5 + j * 2.4, bot = g.ringA(Math.PI / 2), right = g.ringA(0), top = g.ringA(-Math.PI / 2), left = g.ringA(Math.PI);
        T(t0, () => { sgGo(ac[j], { x: bot.x - 8 * g.u, y: bot.y + 6 }, 0.7, 0, 'inOutCubic'); });
        T(t0 + 0.9, () => { ac[j].a = 0; ring.n = 6; Sound.click(); sgGo(ring, { x: right.x, y: right.y }, 0.5, 0.05, 'inOutCubic'); });
        T(t0 + 1.35, () => { ring.n = 5; sgCO2({ x: ring.x, y: ring.y - 14 }, g); sgSet('co2', sg.cnt.co2 + 1); sgCarrier('NADH', ring, run); sgSet('nadh', sg.cnt.nadh + 1); sgGo(ring, { x: top.x, y: top.y }, 0.5, 0.05, 'inOutCubic'); });
        T(t0 + 1.85, () => { ring.n = 4; sgCO2({ x: ring.x, y: ring.y - 14 }, g); sgSet('co2', sg.cnt.co2 + 1); sgCarrier('NADH', ring, run); sgSet('nadh', sg.cnt.nadh + 1); sgGo(ring, { x: left.x, y: left.y }, 0.5, 0.05, 'inOutCubic'); });
        T(t0 + 2.2, () => { sgSet('atp', sg.cnt.atp + 1); fx(left.x - 30, left.y - 20, 'ATP +1', '#16a34a'); sgCarrier('NADH', ring, run); sgSet('nadh', sg.cnt.nadh + 1); sgCarrier('FADH', ring, run); sgSet('fadh', sg.cnt.fadh + 1); sgGo(ring, { x: bot.x, y: bot.y }, 0.4, 0.1, 'inOutCubic'); });
      }
      fin(5.5);
    } else {
      const car = sg.toks.filter((q) => !q.used);
      car.forEach((t, i) => {
        const d = 0.3 + i * 0.26, isF = t.t === 'FADH';
        T(d, () => { sgGo(t, { x: g.cxs[0].x, y: g.ye - 24 * g.u }, 0.55, 0, 'inOutCubic'); });
        T(d + 0.6, () => {
          t.used = true; sgGo(t, { gray: 1 }, 0.3); sgGo(t, { a: 0 }, 0.6, 0.2);
          const el = { x: g.cxs[0].x, y: g.ye, a: 1 }; sg.els.push(el); const p1 = g.cxs[1], p2 = g.cxs[2];
          sgGo(el, { x: p1.x, y: g.ye }, 0.25, 0, 'linear'); T(0.25, () => sgGo(el, { x: p2.x, y: g.ye }, 0.25, 0, 'linear')); T(0.5, () => sgGo(el, { x: g.o2.x, y: g.o2.y - 12 }, 0.3, 0, 'inCubic'));
          T(0.85, () => { sg.els.splice(sg.els.indexOf(el), 1); if (i % 2 === 1 || i === car.length - 1) { sgSet('o2', sg.cnt.o2 + 1); parts.burst(g.o2.x, g.o2.y - 12, { count: 6, colors: ['#38bdf8', '#bae6fd'], speed: 50, life: 0.7, gravity: -30, shape: 'bubble', size: 3 }); } const gain = isF ? ATPF : ATPN; sgSet('atp', sg.cnt.atp + gain); sg.glow = 1; if (i % 3 === 0) parts.burst(g.syn.x, g.syn.y - 22, { count: 7, colors: ['#facc15', '#fff'], speed: 90, life: 0.6, gravity: 60 }); });
        });
      });
      fin(0.3 + car.length * 0.26 + 2.0);
    }
    updateCtl();
  }
  /* 구슬 배치: n개 */
  function beadPos(n, d) {
    if (n === 1) return [[0, 0]]; if (n === 2) return [[-d / 2, 0], [d / 2, 0]];
    if (n === 3) return [[-d / 2, d * 0.3], [d / 2, d * 0.3], [0, -d * 0.55]];
    if (n === 4) return [[-d / 2, -d / 2], [d / 2, -d / 2], [-d / 2, d / 2], [d / 2, d / 2]];
    const r = n === 5 ? d * 0.85 : d * 1.0, out = []; for (let k = 0; k < n; k++) { const a = -Math.PI / 2 + k / n * TAU; out.push([Math.cos(a) * r, Math.sin(a) * r]); } return out;
  }
  function grpDraw(q, g) {
    if (q.a < 0.01) return;
    const r = g.br, d = r * 2.15, pts = beadPos(q.n, d);
    ctx.save(); ctx.globalAlpha = q.a;
    if (pts.length > 1) { ctx.strokeStyle = 'rgba(71,85,105,.45)'; ctx.lineWidth = 2; ctx.beginPath(); pts.forEach((p, i) => { const x = q.x + p[0], y = q.y + p[1]; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }); if (q.n > 2) ctx.closePath(); ctx.stroke(); }
    pts.forEach((p) => D.sphere(q.x + p[0], q.y + p[1], r, '#475569', { gloss: true, shadow: false }));
    const ly = q.y + (q.n >= 4 ? d * 1.0 : d * 0.85) + 14 * g.u;
    T(q.x, ly, q.n + '탄소', 12.5 * (PHONE ? 0.95 : 1), '#1f2d44', 'center', 800, { stroke: 'rgba(255,255,255,.85)', strokeWidth: 3 });
    T(q.x, ly + 14 * (PHONE ? 0.95 : 1), q.name, 12 * (PHONE ? 0.95 : 1), '#475569', 'center', 800, { stroke: 'rgba(255,255,255,.85)', strokeWidth: 3 });
    ctx.restore();
  }
  function pill(x, y, w, h, text, bg, fg, a) {
    ctx.save(); ctx.globalAlpha = a == null ? 1 : a; D.roundRect(x - w / 2, y - h / 2, w, h, h / 2); ctx.fillStyle = bg; ctx.fill(); ctx.strokeStyle = 'rgba(15,23,42,.25)'; ctx.lineWidth = 1; ctx.stroke();
    T(x, y + h * 0.33, text, h * 0.7, fg, 'center', 800); ctx.restore();
  }
  function rsMito(g, t) {
    // 세포질 바탕
    panel(g.P.x, g.P.y, g.P.w, g.P.h, 18, '#f6fbf1');
    T(g.P.x + 14, g.P.y + g.P.h - 12, '세포질', 14, '#4d7c0f', 'left', 800);
    // 외막 · 내막
    D.shadow(() => { D.roundRect(g.mx0, g.my0, g.mx1 - g.mx0, g.my1 - g.my0, g.R); ctx.fillStyle = 'rgba(251,208,150,.95)'; ctx.fill(); }, { blur: 8, y: 3 });
    D.roundRect(g.mx0, g.my0, g.mx1 - g.mx0, g.my1 - g.my0, g.R); ctx.strokeStyle = '#a8561f'; ctx.lineWidth = 3.5; ctx.stroke();
    const ix = g.cx - g.ihw, iy = g.cy - g.ihh;
    D.roundRect(ix, iy, g.ihw * 2, g.ihh * 2, g.ir); const mg = ctx.createLinearGradient(0, iy, 0, iy + g.ihh * 2); mg.addColorStop(0, '#fff7d9'); mg.addColorStop(1, '#f4d58a'); ctx.fillStyle = mg; ctx.fill(); ctx.strokeStyle = '#c2255c'; ctx.lineWidth = 4; ctx.stroke();
    T(g.mx0 + 16, g.my0 - 8, '미토콘드리아', 14, '#9a5b12', 'left', 800);
    T(ix + 14, iy + 22, '기질', 13.5, '#8a6410', 'left', 800);
    T(g.cx + g.ihw - 12, g.ye + 5 + 10, '내막', 13, '#be185d', 'right', 800, { stroke: 'rgba(251,208,150,.9)', strokeWidth: 3 });
    // TCA 고리
    ctx.save(); ctx.strokeStyle = 'rgba(139,92,246,.5)'; ctx.lineWidth = 6; ctx.setLineDash([2, 0]); ctx.beginPath(); ctx.arc(g.rc.x, g.rc.y, g.rr, 0, TAU); ctx.stroke(); ctx.restore();
    ctx.fillStyle = '#8b5cf6'; [0.3, 2.4, 4.5].forEach((a) => { const p = g.ringA(a + (S.sg.cur === 3 && S.sg.busy ? clock * 0.6 : 0)); ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, TAU); ctx.fill(); });
    T(g.rc.x, g.rc.y + 4, 'TCA', 15, '#6d28d9', 'center', 800); T(g.rc.x, g.rc.y + 20, '회로', 13, '#6d28d9', 'center', 800);
    T(g.site.x, g.site.y - 34 * g.u - 2, '피루브산 산화', 12.5, '#0369a1', 'center', 800, { stroke: 'rgba(255,255,255,.85)', strokeWidth: 3 });
    // 전자 전달 단백질과 ATP 합성 효소 (내막에 박혀 있어요)
    g.cxs.forEach((p, k) => { D.shadow(() => { D.roundRect(p.x - 21 * g.u, p.y - 15 * g.u, 42 * g.u, 30 * g.u, 11 * g.u); ctx.fillStyle = '#a5b4fc'; ctx.fill(); }, { blur: 4, y: 1 }); D.roundRect(p.x - 21 * g.u, p.y - 15 * g.u, 42 * g.u, 30 * g.u, 11 * g.u); ctx.strokeStyle = '#4f46e5'; ctx.lineWidth = 2; ctx.stroke(); });
    T(g.cxs[1].x, g.ye - 24 * g.u - 4, '전자 전달 단백질', 12 * (PHONE ? 0.95 : 1), '#3730a3', 'center', 800, { stroke: 'rgba(255,247,217,.9)', strokeWidth: 3 });
    const s = g.syn, sc = g.u; ctx.save(); ctx.fillStyle = '#fde68a'; ctx.strokeStyle = '#a16207'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(s.x, s.y, 17 * sc, 12 * sc, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#d97706'; ctx.fillRect(s.x - 3.5 * sc, s.y - 28 * sc, 7 * sc, 22 * sc); ctx.restore();
    D.sphere(s.x, s.y - 40 * sc, 15 * sc, '#fbbf24', { gloss: true, outline: '#a16207', outlineWidth: 1.5 });
    ctx.save(); ctx.translate(s.x, s.y - 40 * sc); ctx.rotate((S.sg.glow > 0.05 ? clock * 8 : 0)); ctx.fillStyle = '#b45309'; ctx.fillRect(-2, -9 * sc, 4, 9 * sc); ctx.restore();
    T(s.x, s.y - 62 * sc, 'ATP 합성 효소', 12 * (PHONE ? 0.95 : 1), '#92400e', 'center', 800, { stroke: 'rgba(255,247,217,.9)', strokeWidth: 3 });
    // 산소
    ctx.save(); const bob = Math.sin(t * 2) * 2; D.sphere(g.o2.x - 9 * sc, g.o2.y + bob, 8 * sc, '#ef4444', { gloss: true }); D.sphere(g.o2.x + 7 * sc, g.o2.y + bob, 8 * sc, '#ef4444', { gloss: true }); ctx.restore();
    T(g.o2.x, g.o2.y + 26 * sc, 'O₂ (산소)', 12.5, '#b91c1c', 'center', 800);
  }
  function rsDraw(dt, t) {
    const sg = S.sg, g = mG(); sg.glow = approach(sg.glow, 0, dt, 1.6); Object.keys(sg.num).forEach((k) => sg.num[k].update(dt, 7));
    rsMito(g, t);
    if (sg.stage === 0 && !sg.busy) { const q = sg.grps[0]; if (q) D.ring(q.x, q.y, 26 * g.u, t, { color: '#16a34a', width: 2 }); }
    // 탄소 구슬 · 운반체
    sg.grps.forEach((q) => grpDraw(q, g));
    sg.toks.forEach((q) => { if (q.a < 0.01) return; const w = g.pool.w - 3, h = g.pool.h - 3, col = q.gray > 0.5 ? '#cbd5e1' : q.t === 'NADH' ? '#34d399' : '#60a5fa'; pill(q.x, q.y, w, h, q.gray > 0.5 ? (q.t === 'NADH' ? 'NAD⁺' : 'FAD') : (q.t === 'NADH' ? 'NADH' : 'FADH₂'), col, q.gray > 0.5 ? '#475569' : '#052e2b', q.a); });
    // CO₂
    for (let i = sg.co2.length - 1; i >= 0; i--) { const c = sg.co2[i]; c.t += dt; c.y += c.vy * dt; c.x += Math.sin(c.t * 3 + i) * 10 * dt; c.a = clamp(1 - Math.max(0, c.t - 1.6) / 1.2, 0, 1); if (c.a <= 0) { sg.co2.splice(i, 1); continue; } ctx.save(); ctx.globalAlpha = c.a; D.sphere(c.x - 9, c.y, 5.5 * g.u, '#475569', { gloss: false }); pill(c.x + 12 * g.u, c.y, 34 * g.u, 17 * g.u, 'CO₂', '#e2e8f0', '#334155'); ctx.restore(); }
    // 전자
    sg.els.forEach((e) => { D.glow(e.x, e.y, 13, '#facc15', 0.6); D.sphere(e.x, e.y, 6, '#fde047', { gloss: false, text: 'e⁻', textColor: '#713f12', textScale: 0.95 }); });
    // 단계 배너
    const cur = sg.cur ? ST[sg.cur - 1] : null;
    if (cur) D.label(g.P.x + 14, g.P.y + 22, (sg.busy ? '진행 중 · ' : '완료 · ') + (sg.cur) + '단계 ' + cur.n + ' (' + cur.loc + ')', { bg: cur.col, color: '#fff', size: PHONE ? 13 : 14.5, align: 'left' });
    else D.label(g.P.x + 14, g.P.y + 22, '▶ 단계를 시작해 포도당의 탄소 구슬을 따라가 보세요', { bg: '#334155', color: '#fff', size: PHONE ? 12.5 : 14, align: 'left' });
    // 계수 칸
    const cy0 = PHONE ? 444 : 424, ch = 58, n = sg.num, cw = (g.P.w - 4 * 6) / 5;
    const cells = [['ATP (순)', f1(n.atp.v), '#f59e0b'], ['NADH', fi(n.nadh.v), '#10b981'], ['FADH₂', fi(n.fadh.v), '#3b82f6'], ['CO₂', fi(n.co2.v), '#64748b'], ['O₂ 사용', fi(n.o2.v), '#ef4444']];
    cells.forEach((c, i) => { const x = g.P.x + i * (cw + 6); panel(x, cy0, cw, ch, 12, '#fff'); T(x + cw / 2, cy0 + 18, c[0], PHONE ? 12 : 13.5, '#64748b', 'center', 800); T(x + cw / 2, cy0 + 47, c[1], PHONE ? 22 : 26, c[2], 'center', 800); });
    // 설명
    const capY = cy0 + ch + 8, capH = (PHONE ? 640 - 10 : 560 - 6) - capY;
    panel(g.P.x, capY, g.P.w, capH, 12, '#fff');
    textBlock(g.P.x + 14, capY + 22, g.P.w - 28, sg.cap || '① 해당 과정 → ② 피루브산 산화 → ③ TCA 회로 → ④ 전자 전달계 순서로 진행해요. 탄소 구슬은 ● 하나가 탄소 1개예요.', PHONE ? 13 : 14, '#334155', PHONE ? 17 : 19, 700);
  }

  /* =========================================================
     ① 순서 · 장소 배치
     ========================================================= */
  const ODC = [
    { id: 'glyc', label: '해당 과정', short: '해당 과정', sub: '포도당 → 피루브산', icon: '🍬', col: '#16a34a', ans: 'cyto', ord: 0 },
    { id: 'pyox', label: '피루브산 산화', short: '피루브산 산화', sub: '피루브산 → 아세틸 CoA', icon: '✂️', col: '#0ea5e9', ans: 'matrix', ord: 1 },
    { id: 'tca', label: 'TCA 회로', short: 'TCA 회로', sub: '아세틸 CoA → CO₂', icon: '🔄', col: '#8b5cf6', ans: 'matrix', ord: 2 },
    { id: 'etc', label: '전자 전달계', short: '전자 전달계', sub: '전자 → O₂, ATP 합성', icon: '⚡', col: '#e11d74', ans: 'inner', ord: 3 },
  ];
  const ODZ = [['cyto', '세포질', '#16a34a'], ['matrix', '미토콘드리아 기질', '#c9941f'], ['inner', '미토콘드리아 내막', '#c2255c']];
  S.od = { so: null, pick: null, seq: [] };
  function odG() {
    if (PHONE) {
      const bw = 148, boxes = ODZ.map(([id, label, col], k) => ({ id, label, col, x: 10 + k * (bw + 8), y: 10, w: bw, h: 362, cols: 1, hdr: 74, draw: odArt }));
      return { boxes, cw: 226, ch: 56, kh: 30, tray: (i) => ({ x: 10 + (i % 2) * 234, y: 392 + Math.floor(i / 2) * 64 }) };
    }
    const bw = 250, boxes = ODZ.map(([id, label, col], k) => ({ id, label, col, x: 14 + k * (bw + 11), y: 14, w: bw, h: 330, cols: 1, hdr: 92, draw: odArt }));
    return { boxes, cw: 184, ch: 64, kh: 38, tray: (i) => ({ x: 14 + i * 196, y: 368 }) };
  }
  function odArt(b) {
    const ax = b.x + 10, aw = b.w - 20, ay = b.y + 32, ah = b.hdr - 40, cy = ay + ah / 2;
    ctx.save(); D.roundRect(ax, ay, aw, ah, 8); ctx.clip();
    if (b.id === 'cyto') {
      ctx.fillStyle = 'rgba(134,239,172,.4)'; ctx.fillRect(ax, ay, aw, ah);
      for (let k = 0; k < 6; k++) { const a = k / 6 * TAU; D.sphere(ax + aw * 0.3 + Math.cos(a) * ah * 0.2, cy + Math.sin(a) * ah * 0.2, ah * 0.09, '#475569', { gloss: false }); }
      if (aw > 150) T(ax + aw * 0.66, cy + 5, '6C → 3C', 13, '#166534', 'center', 800);
    } else if (b.id === 'matrix') {
      const g = ctx.createLinearGradient(0, ay, 0, ay + ah); g.addColorStop(0, '#fff7d9'); g.addColorStop(1, '#f4d58a'); ctx.fillStyle = g; ctx.fillRect(ax, ay, aw, ah);
      ctx.strokeStyle = '#8b5cf6'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(ax + aw * 0.5, cy, ah * 0.3, 0, TAU); ctx.stroke(); T(ax + aw * 0.5, cy + 4, 'TCA', 12, '#6d28d9', 'center', 800);
    } else {
      ctx.fillStyle = 'rgba(251,208,150,.6)'; ctx.fillRect(ax, ay, aw, ah / 2); ctx.fillStyle = 'rgba(255,243,207,.95)'; ctx.fillRect(ax, ay + ah / 2, aw, ah / 2);
      ctx.strokeStyle = '#c2255c'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(ax, cy); ctx.lineTo(ax + aw, cy); ctx.stroke();
      [0.25, 0.5, 0.75].forEach((f) => { D.roundRect(ax + aw * f - 12, cy - 11, 24, 22, 8); ctx.fillStyle = '#a5b4fc'; ctx.fill(); ctx.strokeStyle = '#4f46e5'; ctx.lineWidth = 1.5; ctx.stroke(); });
    }
    ctx.restore(); ctx.strokeStyle = 'rgba(71,85,105,.35)'; ctx.lineWidth = 1.2; D.roundRect(ax, ay, aw, ah, 8); ctx.stroke();
  }
  function odBuild() {
    const g = odG();
    S.od.so = new Sorter({ cards: ODC, boxes: g.boxes, tray: g.tray, cw: g.cw, ch: g.ch, kh: g.kh, onChange() { S.od.pick = null; updateCtl(); }, onTap(c) { S.od.pick = S.od.pick === c ? null : c; Sound.tick(); }, isSel: (c) => S.od.pick === c });
    S.od.so.cards.forEach((c, i) => { c.ans = ODC[i].ans; });
  }
  const odPT = {
    down(p) { const so = S.od.so; if (so.down(p)) return true; if (S.od.pick) { const bx = so.boxAt(p); if (bx) { const c = S.od.pick; S.od.pick = null; so.place(c, bx.id); } } return false; },
    move(p) { S.od.so.move(p); }, up(p) { S.od.so.up(p); }, hover(p) { return S.od.so.hover(p); },
  };
  function odDraw(dt) {
    const so = S.od.so; so.update(dt); so.draw();
    const left = so.cards.filter((c) => !c.zone).length;
    T(PHONE ? 240 : 400, PHONE ? 560 : 520, left ? '카드를 끌어서 알맞은 곳에 놓고, 오른쪽에서 순서도 눌러요' : '모두 놓았어요. 순서를 눌러 정하고 "확인하기"를 눌러요', 13.5, '#64748b', 'center', 800);
  }
  const odWrong = () => S.od.so.cards.filter((c) => c.zone && c.zone !== c.ans);
  const odSeqOK = () => S.od.seq.length === 4 && S.od.seq.every((id, i) => ODC[i].id === id);

  /* =========================================================
     ② 산출물 표
     ========================================================= */
  const TBV = { glyc: { a: 2, n: 2, f: 0, c: 0 }, pyox: { a: 0, n: 2, f: 0, c: 2 }, tca: { a: 2, n: 6, f: 2, c: 4 }, etc: { a: 28, n: 0, f: 0, c: 0 } };
  const TBROWS = [['glyc', '해당 과정', '세포질'], ['pyox', '피루브산 산화 (2분자)', '기질'], ['tca', 'TCA 회로 (2회전)', '기질'], ['etc', '전자 전달계', '내막']];
  S.tb = { shown: { glyc: false, pyox: false, tca: false }, nums: {}, convOn: false, totOn: false, pulse: { glyc: 0, pyox: 0, tca: 0, etc: 0 }, bar: new Num(0) };
  ['glyc', 'pyox', 'tca', 'etc'].forEach((r) => { S.tb.nums[r] = { a: new Num(0), n: new Num(0), f: new Num(0), c: new Num(0) }; });
  const tbAll = () => S.tb.shown.glyc && S.tb.shown.pyox && S.tb.shown.tca;
  const tbTotOK = () => tbAll() && near(numIn('tA'), 4, 0.01) && near(numIn('tN'), 10, 0.01) && near(numIn('tF'), 2, 0.01);
  const tbConvOK = () => tbAll() && near(numIn('cN'), 10 * ATPN, 0.01) && near(numIn('cF'), 2 * ATPF, 0.01) && near(numIn('cT'), 10 * ATPN + 2 * ATPF, 0.01);
  function tbShow(r) {
    const tb = S.tb; if (r === 'etc') return; if (tb.shown[r]) return; tb.shown[r] = true; tb.pulse[r] = 1; Sound.click();
    const v = TBV[r], n = tb.nums[r]; n.a.set(v.a); n.n.set(v.n); n.f.set(v.f); n.c.set(v.c); updateCtl();
  }
  function tbReset() { const tb = S.tb; tb.shown = { glyc: false, pyox: false, tca: false }; ['glyc', 'pyox', 'tca', 'etc'].forEach((r) => { const n = tb.nums[r]; n.a.snap(0); n.n.snap(0); n.f.snap(0); n.c.snap(0); }); ['tA', 'tN', 'tF', 'cN', 'cF', 'cT'].forEach((id) => { $('#' + id).value = ''; }); tb.bar.snap(0); updateCtl(); }
  function tbG() {
    return PHONE
      ? { P: { x: 10, y: 10, w: 460, h: 290 }, B: { x: 10, y: 308, w: 460, h: 322 }, c0: 112, cw: 86, rh: 42, hh: 36 }
      : { P: { x: 14, y: 14, w: 772, h: 322 }, B: { x: 14, y: 346, w: 772, h: 200 }, c0: 240, cw: 130, rh: 46, hh: 38 };
  }
  function tbDraw(dt, t) {
    const tb = S.tb, g = tbG(), P = g.P, fs = PHONE ? 13 : 15;
    const etcOn = tbConvOK(); if (etcOn && !tb.prevEtc) tb.pulse.etc = 1; tb.prevEtc = etcOn;
    // 값 갱신
    const en = tb.nums.etc; en.a.set(etcOn ? 28 : 0); tb.bar.set(etcOn ? 1 : 0);
    ['glyc', 'pyox', 'tca', 'etc'].forEach((r) => { const n = tb.nums[r]; n.a.update(dt, 6); n.n.update(dt, 6); n.f.update(dt, 6); n.c.update(dt, 6); tb.pulse[r] = approach(tb.pulse[r], 0, dt, 2.5); });
    tb.bar.update(dt, 4);
    panel(P.x, P.y, P.w, P.h, 18, '#fff');
    const heads = [['ATP', '#b45309'], ['NADH', '#0f766e'], ['FADH₂', '#1d4ed8'], ['CO₂', '#475569']], hy = P.y + 14;
    T(P.x + 14, hy + 24, '단계 (포도당 1분자)', fs - 1, '#475569', 'left', 800);
    heads.forEach((h, i) => T(P.x + g.c0 + g.cw * (i + 0.5), hy + 24, h[0], fs + 1, h[1], 'center', 800));
    ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(P.x + 10, hy + g.hh); ctx.lineTo(P.x + P.w - 10, hy + g.hh); ctx.stroke();
    TBROWS.forEach((row, ri) => {
      const r = row[0], y = hy + g.hh + ri * g.rh, shown = r === 'etc' ? etcOn : tb.shown[r], n = tb.nums[r];
      if (tb.pulse[r] > 0.02 || (r === 'etc' && etcOn && tb.pulse.etc > 0.02)) { D.roundRect(P.x + 8, y + 3, P.w - 16, g.rh - 6, 10); ctx.fillStyle = 'rgba(245,158,11,' + (0.2 * tb.pulse[r]) + ')'; ctx.fill(); }
      D.roundRect(P.x + 14, y + 8, 6, g.rh - 16, 3); ctx.fillStyle = ST[ri].col; ctx.fill();
      TF(P.x + 28, y + g.rh / 2 - 2, row[1], g.c0 - 36, fs, 11.5, '#1f2d44', 'left', 800);
      T(P.x + 28, y + g.rh / 2 + 14, row[2], fs - 3, '#64748b', 'left', 700);
      const vals = [n.a.v, n.n.v, n.f.v, n.c.v];
      vals.forEach((v, i) => { const cx = P.x + g.c0 + g.cw * (i + 0.5); if (!shown) T(cx, y + g.rh / 2 + 6, '?', fs + 4, '#cbd5e1', 'center', 800); else T(cx, y + g.rh / 2 + 6, (i === 0 && r === 'etc') ? f1(v) : fi(v), fs + 4, v === 0 ? '#94a3b8' : heads[i][1], 'center', 800); });
      if (r === 'glyc' && shown) T(P.x + g.c0 + g.cw * 0.5, y + 14, '', 10, '#64748b', 'center', 700);
    });
    // 합계 행 (입력한 값을 보여 줘요)
    const ty = hy + g.hh + 4 * g.rh;
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(P.x + 10, ty); ctx.lineTo(P.x + P.w - 10, ty); ctx.stroke();
    T(P.x + 28, ty + g.rh / 2 + 4, '합계', fs + 1, '#1f2d44', 'left', 800);
    const typed = [numOf('tA'), numOf('tN'), numOf('tF'), NaN], ok = [near(typed[0], 4, 0.01), near(typed[1], 10, 0.01), near(typed[2], 2, 0.01)];
    for (let i = 0; i < 3; i++) { const cx = P.x + g.c0 + g.cw * (i + 0.5); if (!tbAll()) T(cx, ty + g.rh / 2 + 6, '?', fs + 4, '#cbd5e1', 'center', 800); else if (isFinite(typed[i])) T(cx, ty + g.rh / 2 + 6, f1(typed[i]), fs + 4, ok[i] ? '#16a34a' : '#e2464b', 'center', 800); else T(cx, ty + g.rh / 2 + 6, '입력', fs - 1, '#94a3b8', 'center', 700); }
    if (tbAll()) T(P.x + g.c0 + g.cw * 3.5, ty + g.rh / 2 + 6, fi(tb.nums.glyc.c.v + tb.nums.pyox.c.v + tb.nums.tca.c.v), fs + 4, '#475569', 'center', 800); else T(P.x + g.c0 + g.cw * 3.5, ty + g.rh / 2 + 6, '?', fs + 4, '#cbd5e1', 'center', 800);
    if (tbAll()) T(P.x + P.w - 12, P.y + P.h - 10, 'ATP 열의 합 = 해당(순 2) + TCA(2), 직접 합성만 합쳐요', PHONE ? 11 : 12.5, '#64748b', 'right', 700);
    // 막대
    const B = g.B; panel(B.x, B.y, B.w, B.h, 18, '#fff');
    T(B.x + 14, B.y + 26, 'ATP는 어디서 만들어질까? (포도당 1분자, 환산 단순 값)', PHONE ? 13.5 : 15, '#1f2d44', 'left', 800);
    const bx = B.x + 20, bw = B.w - 40, by = B.y + (PHONE ? 70 : 62), bh = 36;
    D.roundRect(bx, by, bw, bh, 10); ctx.fillStyle = '#eef2f7'; ctx.fill();
    if (tb.bar.v > 0.01) {
      const direct = 4 / 32 * bw * tb.bar.v, etc2 = 28 / 32 * bw * tb.bar.v;
      D.roundRect(bx, by, direct, bh, 8); ctx.fillStyle = '#16a34a'; ctx.fill();
      D.roundRect(bx + direct, by, etc2, bh, 8); ctx.fillStyle = '#e11d74'; ctx.fill();
      if (tb.bar.v > 0.9) { T(bx + direct / 2, by + bh + 20, '직접 합성 4', 13, '#166534', 'center', 800); T(bx + direct / 2, by + bh + 37, '12.5 %', 13, '#166534', 'center', 800); T(bx + direct + etc2 / 2, by + 24, '전자 전달계 28 (87.5 %)', PHONE ? 14 : 17, '#fff', 'center', 800); T(bx + bw, by - 8, '합계 32 (실제 세포 약 30~32)', PHONE ? 12 : 13.5, '#334155', 'right', 800); }
      if (tb.bar.v > 0.9) { T(B.x + 14, B.y + B.h - (PHONE ? 78 : 40), 'NADH 10 × 2.5 = 25  +  FADH₂ 2 × 1.5 = 3  →  전자 전달계 28', PHONE ? 13 : 15, '#9d174d', 'left', 800); T(B.x + 14, B.y + B.h - (PHONE ? 54 : 16), '직접 합성 = 해당 순생산 2 + TCA 2 = 4  (기질 수준 인산화, 다음 차시에서 자세히)', PHONE ? 12 : 13.5, '#166534', 'left', 700); }
    } else T(bx + bw / 2, by + 24, '표를 채우고 전자 전달계 ATP를 환산하면 막대가 나타나요', 13.5, '#94a3b8', 'center', 800);
  }

  /* =========================================================
     ③ 호흡 조절
     ========================================================= */
  S.rg = { o2: 100, act: 'rest', cn: false, marks: { glyc: false, pyox: false, tca: false, etc: false }, rec: { rest: null, run: null }, disp: [0.37, 0.3, 0.3, 0.3], ph: [0, 0, 0, 0, 0], pile: 0, actv: 0.3, tank: 0 };
  const sat = (o) => Math.min(1, 1.1 * o / (o + 0.1));
  /* 상대 속도: 해당 과정 G, 피루브산 산화 P, TCA 회로 T, 전자 전달계 E (0~1) */
  function rgRates() {
    const r = S.rg, o = r.o2 / 100, R = (r.cn ? 0 : 1) * sat(o), act = r.act === 'rest' ? 0.3 : 1.0;
    return { R, act, v: [0.1 + 0.9 * act * R, act * R, act * R, act * R] };
  }
  const rgPct = (x) => Math.round(x * 100);
  function rgG() {
    return PHONE
      ? { P1: { x: 10, y: 10, w: 460, h: 386 }, P2: { x: 10, y: 404, w: 460, h: 226 } }
      : { P1: { x: 14, y: 14, w: 772, h: 304 }, P2: { x: 14, y: 326, w: 772, h: 220 } };
  }
  function rgBox(i, g) {
    if (PHONE) { return { x: 24, y: g.P1.y + 56 + i * 82, w: 214, h: 52 }; }
    const w = 134, gap = (g.P1.w - 2 * 38 - 4 * w) / 3; return { x: g.P1.x + 38 + i * (w + gap), y: g.P1.y + 74, w, h: 78 };
  }
  function rgDraw(dt, t) {
    const r = S.rg, g = rgG(), rt = rgRates(), v = rt.v;
    r.disp = r.disp.map((d, i) => (RM ? v[i] : approach(d, v[i], dt, 5)));
    r.pile = RM ? 1 - rt.R : approach(r.pile, 1 - rt.R, dt, 4); r.actv = RM ? rt.act : approach(r.actv, rt.act, dt, 5);
    const P1 = g.P1; panel(P1.x, P1.y, P1.w, P1.h, 18, '#fff');
    T(P1.x + 14, P1.y + 26, '호흡 단계별 흐름 (굵기 = 상대 속도, 가장 빠른 때 = 100 %)', PHONE ? 13 : 15, '#1f2d44', 'left', 800);
    const bx = [0, 1, 2, 3].map((i) => rgBox(i, g));
    // 관 (단계 사이) + 입 · 출구
    const pipe = (x1, y1, x2, y2, rate, col, ph) => {
      const th = 3 + 20 * rate; ctx.save(); ctx.lineCap = 'butt'; ctx.strokeStyle = 'rgba(148,163,184,.28)'; ctx.lineWidth = 26; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      if (rate > 0.005) { ctx.strokeStyle = C.rgba(col, 0.55); ctx.lineWidth = th; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        const len = Math.hypot(x2 - x1, y2 - y1), ux = (x2 - x1) / len, uy = (y2 - y1) / len, sp = 22, off = ph % sp; for (let d = off; d < len; d += sp) { D.sphere(x1 + ux * d, y1 + uy * d, 2 + 3.2 * rate, col, { gloss: false }); } }
      ctx.restore();
    };
    r.ph = r.ph.map((p, i) => p + dt * (20 + 160 * (i < 4 ? r.disp[i] : r.disp[3])) * (i < 4 ? (r.disp[i] > 0.005 ? 1 : 0) : (r.disp[3] > 0.005 ? 1 : 0)));
    if (PHONE) {
      const x = bx[0].x + bx[0].w / 2;
      pipe(x, bx[0].y - 22, x, bx[0].y, r.disp[0], '#16a34a', r.ph[0]);
      for (let i = 0; i < 3; i++) pipe(x, bx[i].y + bx[i].h, x, bx[i + 1].y, r.disp[i + 1], ST[i + 1].col, r.ph[i + 1]);
      pipe(bx[3].x + bx[3].w + 56, bx[3].y + 8, bx[3].x + bx[3].w, bx[3].y + 8, r.disp[3], '#ef4444', r.ph[4]);
      T(bx[0].x + bx[0].w + 8, bx[0].y - 10, '← 포도당', 12.5, '#166534', 'left', 800);
      T(bx[3].x + bx[3].w + 62, bx[3].y + 13, 'O₂ ' + r.o2 + ' %', 13, '#b91c1c', 'left', 800);
    } else {
      pipe(P1.x + 6, bx[0].y + bx[0].h / 2, bx[0].x, bx[0].y + bx[0].h / 2, r.disp[0], '#16a34a', r.ph[0]);
      for (let i = 0; i < 3; i++) pipe(bx[i].x + bx[i].w, bx[i].y + bx[i].h / 2, bx[i + 1].x, bx[i + 1].y + bx[i + 1].h / 2, r.disp[i + 1], ST[i + 1].col, r.ph[i + 1]);
      pipe(bx[3].x + bx[3].w / 2, P1.y + 38, bx[3].x + bx[3].w / 2, bx[3].y, r.disp[3], '#ef4444', r.ph[4]);
      T(P1.x + 8, bx[0].y - 6, '포도당', 13, '#166534', 'left', 800); T(bx[3].x + bx[3].w / 2 + 20, P1.y + 54, 'O₂ ' + r.o2 + ' %', 13.5, '#b91c1c', 'left', 800);
    }
    // 단계 상자
    ST.forEach((s, i) => {
      const b = bx[i], mk = r.marks[s.id], rate = r.disp[i];
      D.shadow(() => { D.roundRect(b.x, b.y, b.w, b.h, 14); ctx.fillStyle = cmix('#e5e7eb', s.col, 0.25 + 0.75 * rate); ctx.fill(); }, { blur: 6, y: 2 });
      D.roundRect(b.x, b.y, b.w, b.h, 14); ctx.strokeStyle = mk ? '#e2464b' : s.col; ctx.lineWidth = mk ? 4 : 2; ctx.stroke();
      const lc = rate > 0.55 ? '#fff' : '#1f2d44';
      TF(b.x + b.w / 2, b.y + 26, (i + 1) + ' ' + s.n, b.w - 14, PHONE ? 15 : 16, 12, lc, 'center', 800);
      T(b.x + b.w / 2, b.y + 45, s.loc.replace('미토콘드리아 ', ''), 12.5, rate > 0.55 ? 'rgba(255,255,255,.9)' : '#475569', 'center', 700);
      const pc = rgPct(v[i]);
      if (PHONE) { T(b.x + b.w + 14, b.y + 36, '속도 ' + pc + ' %', 17, pc === 0 ? '#e2464b' : '#1f2d44', 'left', 800); const w2 = 200; D.roundRect(b.x + b.w + 14, b.y + 42, w2, 10, 5); ctx.fillStyle = '#eef2f7'; ctx.fill(); if (pc > 0) { D.roundRect(b.x + b.w + 14, b.y + 42, Math.max(10, w2 * r.disp[i]), 10, 5); ctx.fillStyle = s.col; ctx.fill(); } }
      else { T(b.x + b.w / 2, b.y + b.h + 28, '속도 ' + pc + ' %', 16, pc === 0 ? '#e2464b' : '#1f2d44', 'center', 800); D.roundRect(b.x, b.y + b.h + 36, b.w, 10, 5); ctx.fillStyle = '#eef2f7'; ctx.fill(); if (pc > 0) { D.roundRect(b.x, b.y + b.h + 36, Math.max(10, b.w * r.disp[i]), 10, 5); ctx.fillStyle = s.col; ctx.fill(); } }
      if (mk) D.sphere(b.x + b.w - 4, b.y + 4, 13, '#e2464b', { gloss: false, text: '멈춤', textScale: 0.62 });
      if (i === 3 && r.cn) { D.sphere(b.x + 4, b.y + 4, 13, '#7f1d1d', { gloss: false, text: '🧪', textScale: 0.9 }); }
    });
    T(P1.x + P1.w - 14, P1.y + P1.h - 8, '상자를 눌러 "멈춘 단계"를 표시할 수 있어요', 12.5, '#94a3b8', 'right', 700);
    // 아래 패널
    const P2 = g.P2; panel(P2.x, P2.y, P2.w, P2.h, 18, '#fff');
    const px = P2.x, py = P2.y, w3 = P2.w / 3;
    // NADH 탱크
    const tx = px + 20, ty = py + 40, tw = PHONE ? 60 : 84, th2 = PHONE ? 130 : 130;
    T(px + 14, py + 24, 'NADH 쌓임', PHONE ? 13.5 : 15, '#1f2d44', 'left', 800);
    D.roundRect(tx, ty, tw, th2, 12); ctx.fillStyle = '#eef2f7'; ctx.fill();
    const fl = th2 * clamp(r.pile, 0, 1); if (fl > 1) { ctx.save(); D.roundRect(tx, ty, tw, th2, 12); ctx.clip(); ctx.fillStyle = '#34d399'; ctx.fillRect(tx, ty + th2 - fl, tw, fl); ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(tx, ty + th2 - fl, tw, 4); ctx.restore(); }
    D.roundRect(tx, ty, tw, th2, 12); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; ctx.stroke();
    T(tx + tw + 12, ty + 22, rgPct(1 - rt.R) + ' %', PHONE ? 20 : 24, '#0f766e', 'left', 800);
    T(tx + tw + 12, ty + 42, 'NAD⁺ 재생 ' + rgPct(rt.R) + ' %', PHONE ? 12 : 13, '#475569', 'left', 800);
    if (rt.R < 0.05) T(tx + tw + 12, ty + 64, '재생 막힘!', PHONE ? 12.5 : 14, '#b91c1c', 'left', 800);
    // 효소 활성
    const ex = px + w3 + 10;
    T(ex, py + 24, '해당 과정 효소 활성', PHONE ? 13.5 : 15, '#1f2d44', 'left', 800);
    T(ex, py + 42, '(포스포프럭토키네이스)', 12, '#64748b', 'left', 700);
    const ew = w3 - 30; D.roundRect(ex, py + 54, ew, 16, 8); ctx.fillStyle = '#eef2f7'; ctx.fill(); D.roundRect(ex, py + 54, Math.max(16, ew * r.actv), 16, 8); ctx.fillStyle = '#16a34a'; ctx.fill();
    T(ex, py + 92, 'ATP', 13, '#b45309', 'left', 800); T(ex, py + 114, 'ADP', 13, '#1d4ed8', 'left', 800);
    const abw = ew - 40, atpL = r.act === 'rest' ? 0.85 : 0.35;
    D.roundRect(ex + 36, py + 80, abw, 12, 6); ctx.fillStyle = '#eef2f7'; ctx.fill(); D.roundRect(ex + 36, py + 80, Math.max(12, abw * atpL), 12, 6); ctx.fillStyle = '#f59e0b'; ctx.fill();
    D.roundRect(ex + 36, py + 102, abw, 12, 6); ctx.fillStyle = '#eef2f7'; ctx.fill(); D.roundRect(ex + 36, py + 102, Math.max(12, abw * (1 - atpL)), 12, 6); ctx.fillStyle = '#3b82f6'; ctx.fill();
    TF(ex, py + 140, r.act === 'rest' ? (PHONE ? 'ATP 많음 → 활성 ↓' : 'ATP 많음 → 효소 활성 ↓ 해당 과정 느림') : (PHONE ? 'ADP 많음 → 활성 ↑' : 'ADP 많음 → 효소 활성 ↑ 해당 과정 빠름'), ew + 10, PHONE ? 11.5 : 13, 10.5, '#334155', 'left', 800);
    T(ex, py + 164, '활성 ' + rgPct(rt.act) + ' %', PHONE ? 16 : 18, '#166534', 'left', 800);
    // 기록
    const rx = px + 2 * w3 + 10;
    T(rx, py + 24, '전자 전달 속도 기록', PHONE ? 13.5 : 15, '#1f2d44', 'left', 800);
    [['rest', '😴 휴식'], ['run', '🏃 운동']].forEach((q, k) => { const y = py + 54 + k * 46; D.roundRect(rx, y, w3 - 26, 38, 10); ctx.fillStyle = r.rec[q[0]] != null ? '#ecfdf5' : '#f8fafc'; ctx.fill(); ctx.strokeStyle = r.rec[q[0]] != null ? '#16a34a' : '#cbd5e1'; ctx.lineWidth = 2; ctx.stroke(); T(rx + 8, y + 24, q[1], PHONE ? 13 : 14.5, '#334155', 'left', 800); T(rx + w3 - 36, y + 26, r.rec[q[0]] != null ? r.rec[q[0]] + ' %' : '—', PHONE ? 16 : 18, r.rec[q[0]] != null ? '#166534' : '#94a3b8', 'right', 800); });
    T(rx, py + 160, PHONE ? '산소 100 %에서' : '산소 100 %, 억제제 없음에서', 12, '#64748b', 'left', 700); T(rx, py + 176, '"📌 기록"을 눌러요', 12, '#64748b', 'left', 700);
  }
  const rgPT = {
    down(p) { const g = rgG(); for (let i = 0; i < 4; i++) { const b = rgBox(i, g); if (inRect(p.x, p.y, b)) { const id = ST[i].id; S.rg.marks[id] = !S.rg.marks[id]; Sound.click(); updateCtl(); } } return false; },
    hover(p) { const g = rgG(); return [0, 1, 2, 3].some((i) => inRect(p.x, p.y, rgBox(i, g))) ? 'pointer' : 'default'; },
  };
  function rgRecord() {
    const r = S.rg;
    if (r.o2 !== 100 || r.cn) { showHint('산소 100 %, 억제제 없음 상태에서 기록해요.', 2800); Sound.fail(); return; }
    r.rec[r.act] = rgPct(rgRates().v[3]); Sound.success(); updateCtl();
  }

  /* =========================================================
     ④ 릴레이 요약
     ========================================================= */
  const RLANS = { glyc: { loc: 'cyto', in: 'glc', out: 'o1', pass: 'n1' }, pyox: { loc: 'matrix', in: 'pyr2', out: 'o2', pass: 'n2' }, tca: { loc: 'matrix', in: 'ace2', out: 'o3', pass: 'n3' }, etc: { loc: 'inner', in: 'car', out: 'o4', pass: 'n4' } };
  const RLTXT = { cyto: '세포질', matrix: '미토콘드리아 기질', inner: '미토콘드리아 내막', glc: '6탄소 포도당', pyr2: '3탄소 피루브산 2분자', ace2: '2탄소 아세틸 CoA 2분자', car: 'NADH · FADH₂와 O₂', o1: '3탄소 피루브산 2분자 + ATP 2(순) + NADH 2', o2: '2탄소 아세틸 CoA 2분자 + CO₂ 2 + NADH 2', o3: 'CO₂ 4 + ATP 2 + NADH 6 + FADH₂ 2', o4: 'H₂O + ATP 약 28', n1: '3탄소 피루브산 2분자', n2: '2탄소 아세틸 CoA 2분자', n3: 'NADH · FADH₂ (전자 운반체)', n4: 'ATP (세포의 일에 쓰는 에너지)' };
  const RLKEYS = ['loc', 'in', 'out', 'pass'], RLLAB = { loc: '장소', in: '들어온 것', out: '나가는 것', pass: '넘기는 것' };
  const RLMED = { card: '애니메이션 카드', table: '그림표', script: '역할극 대본' };
  S.rl = { role: 'glyc', data: { glyc: {}, pyox: {}, tca: {}, etc: {} }, med: '', shake: {} };
  const rlFilled = () => ST.reduce((n, s) => n + RLKEYS.filter((k) => S.rl.data[s.id][k]).length, 0);
  const rlRight = (id, k) => S.rl.data[id][k] === RLANS[id][k];
  const rlAllOK = () => ST.every((s) => RLKEYS.every((k) => rlRight(s.id, k)));
  function rlCell(id, k) { const v = S.rl.data[id][k]; return v ? RLTXT[v] : '···'; }
  function rlDraw(dt, t) {
    const rl = S.rl, fsz = PHONE ? 12.5 : 14, lh = PHONE ? 16 : 18;
    const full = rlFilled() === 16, done = rlAllOK() && rl.med;
    if (rl.med === 'script') {
      const x = PHONE ? 10 : 14, w = PHONE ? 460 : 772, h = PHONE ? 142 : 118;
      ST.forEach((s, i) => {
        const y = (PHONE ? 10 : 14) + i * (h + 8), cur = rl.role === s.id; panel(x, y, w, h, 16, '#fff');
        D.roundRect(x, y, 8, h, 4); ctx.fillStyle = s.col; ctx.fill(); if (cur) { D.roundRect(x, y, w, h, 16); ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 3; ctx.stroke(); }
        T(x + 22, y + 26, (i + 1) + '번 주자 · ' + s.n + ' 담당', fsz + 1, s.col, 'left', 800);
        const d = rl.data[s.id], line = '"나는 ' + (d.loc ? RLTXT[d.loc] : '[장소]') + '에서 ' + (d.in ? RLTXT[d.in] : '[들어온 것]') + '을(를) 받아 ' + (d.out ? RLTXT[d.out] : '[나가는 것]') + '을(를) 만들어요. 다음 주자에게 ' + (d.pass ? RLTXT[d.pass] : '[넘기는 것]') + '을(를) 넘길게요!"';
        textBlock(x + 22, y + 52, w - 44, line, fsz, '#1f2d44', lh, 700);
      });
    } else if (rl.med === 'table') {
      const x = PHONE ? 10 : 14, y0 = PHONE ? 10 : 14, w = PHONE ? 460 : 772, c0 = PHONE ? 76 : 120, cw = (w - c0 - 10) / 4 * 1;
      panel(x, y0, w, PHONE ? 604 : 512, 16, '#fff');
      // 가로: 단계 4개 (열), 세로: 4칸 (행)
      const colw = (w - c0 - 14) / 4, rowH = PHONE ? [40, 92, 120, 120, 120] : [46, 66, 92, 96, 88];
      ST.forEach((s, i) => { const cx = x + c0 + i * colw; D.roundRect(cx + 3, y0 + 8, colw - 6, rowH[0] - 6, 8); ctx.fillStyle = s.col; ctx.fill(); TF(cx + colw / 2, y0 + 8 + rowH[0] / 2 + 2, s.n, colw - 10, fsz + 1, 10.5, '#fff', 'center', 800); if (rl.role === s.id) { D.roundRect(cx + 1, y0 + 6, colw - 2, rowH[0] - 2, 9); ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 3; ctx.stroke(); } });
      let yy = y0 + 8 + rowH[0];
      RLKEYS.forEach((k, ri) => {
        const hh = rowH[ri + 1]; ctx.fillStyle = ri % 2 ? '#f8fafc' : '#f1f5f9'; ctx.fillRect(x + 6, yy, w - 12, hh);
        T(x + 14, yy + hh / 2 + 4, RLLAB[k], fsz, '#475569', 'left', 800);
        ST.forEach((s, i) => { const cx = x + c0 + i * colw, txt = rlCell(s.id, k), ok = rl.data[s.id][k] ? rlRight(s.id, k) : null; textBlock(cx + 8, yy + 20, colw - 14, txt, fsz - 0.5, rl.data[s.id][k] ? (rl.shake[s.id + k] ? '#b91c1c' : '#1f2d44') : '#cbd5e1', lh - 1, 700); });
        yy += hh;
      });
    } else {
      // 애니메이션 카드 (기본): 단계 카드 4장과 넘김 화살표
      const x0 = PHONE ? 10 : 14, y0 = PHONE ? 10 : 14, gapX = PHONE ? 0 : 22, cw = PHONE ? 460 : (772 - 3 * gapX) / 4, ch = PHONE ? 140 : 300;
      ST.forEach((s, i) => {
        const x = PHONE ? x0 : x0 + i * (cw + gapX), y = PHONE ? y0 + i * (ch + 12) : y0, cur = rl.role === s.id;
        D.shadow(() => { D.roundRect(x, y, cw, ch, 16); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: 8, y: 2 });
        D.roundRect(x, y, cw, 34, 16); ctx.fillStyle = s.col; ctx.fill(); ctx.fillRect(x, y + 20, cw, 14);
        TF(x + 12, y + 23, (i + 1) + '번 · ' + s.n, cw - 20, fsz + 2, 11.5, '#fff', 'left', 800);
        if (cur) { D.roundRect(x, y, cw, ch, 16); ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 4; ctx.stroke(); }
        let yy = y + 56;
        RLKEYS.forEach((k) => {
          T(x + 12, yy, RLLAB[k], fsz - 1.5, '#64748b', 'left', 800);
          const txt = rlCell(s.id, k), lines = wrap(txt, cw - 24, fsz - 0.5, 700), col = rl.data[s.id][k] ? '#1f2d44' : '#cbd5e1', n = Math.min(lines.length, PHONE ? 1 : 3);
          if (PHONE) { TF(x + 76, yy, txt, cw - 86, fsz - 0.5, 10.5, col, 'left', 700); yy += 22; }
          else { lines.slice(0, 3).forEach((l, j) => T(x + 12, yy + 18 + j * lh, l, fsz - 0.5, col, 'left', 700)); yy += 24 + Math.max(1, n) * lh; }
        });
        if (i < 3) { if (PHONE) D.arrow(x + cw / 2, y + ch + 1, x + cw / 2, y + ch + 11, { color: '#94a3b8', width: 3, head: 8 }); else D.arrow(x + cw + 2, y + 17, x + cw + gapX - 2, y + 17, { color: '#94a3b8', width: 3, head: 9 }); }
      });
    }
    // 완성 배너
    const bannerY = PHONE ? 626 : 548;
    if (done) D.label(PHONE ? 240 : 400, bannerY, '🎉 세포호흡 한 장 요약 완성! (' + RLMED[rl.med] + ')', { bg: '#16a34a', color: '#fff', size: 14 });
    else T(PHONE ? 240 : 400, bannerY, '채운 칸 ' + rlFilled() + ' / 16 · 매체 ' + (rl.med ? RLMED[rl.med] : '아직 안 골랐어요') + (!rl.med ? '' : ''), 13.5, '#64748b', 'center', 800);
  }

  /* =========================================================
     화면 전환 · 조작 연결
     ========================================================= */
  const PTS = { map: null, table: null, regulate: rgPT, relay: null };
  function ptNow() { return S.mode === 'map' && S.sub === 'order' ? odPT : PTS[S.mode] || null; }
  function setMode(m) { if (S.mode !== m) S.fade = 1; S.mode = m; PT = ptNow(); hideHint(); updateCtl(); }
  function setSub(s) { if (S.sub !== s) S.fade = 1; S.sub = s; PT = ptNow(); hideHint(); updateCtl(); }
  const ctlNodes = $$('#ctrlCard .control');
  S.sg.countOn = true; S.tb.convOn = false; S.rg.ratioOn = false;
  const OD_POOL = ['tca', 'glyc', 'etc', 'pyox'];
  function odRender() {
    const pool = $('#odPool'), seq = $('#odSeq');
    pool.innerHTML = OD_POOL.map((id) => { const c = ODC.find((q) => q.id === id), used = S.od.seq.indexOf(id) >= 0; return '<button type="button" class="pk-item" data-id="' + id + '"' + (used ? ' disabled' : '') + '>' + c.label + '</button>'; }).join('');
    seq.innerHTML = S.od.seq.length ? S.od.seq.map((id, i) => '<button type="button" class="pk-chip" data-id="' + id + '"><b>' + (i + 1) + '</b>' + ODC.find((q) => q.id === id).label + '</button>').join('') : '<span class="ctrl-note" style="margin:6px">아직 고르지 않았어요</span>';
    $$('#odPool .pk-item').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.od.seq.push(b.dataset.id); updateCtl(); }));
    $$('#odSeq .pk-chip').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.od.seq.splice(S.od.seq.indexOf(b.dataset.id), 1); updateCtl(); }));
  }
  function rlLoad() { const d = S.rl.data[S.rl.role]; $('#rlLoc').value = d.loc || ''; $('#rlIn').value = d.in || ''; $('#rlOut').value = d.out || ''; $('#rlPass').value = d.pass || ''; }
  function updateCtl() {
    const fr = game ? game.free : false, lvNow = game ? game.level : 0, sg = S.sg, tb = S.tb, r = S.rg, rl = S.rl;
    ctlNodes.forEach((n) => { n.hidden = (n.dataset.modes || '').split(' ').indexOf(S.mode) < 0; });
    $$('#ctrlCard [data-sub]').forEach((n) => { n.hidden = n.dataset.sub !== S.sub; });
    $$('#ctrlCard [data-grp]').forEach((n) => { const k = n.dataset.grp; n.hidden = k === 'count' ? !(sg.countOn || fr) : k === 'tot' ? !(tbAll() || fr) : k === 'conv' ? !(tb.convOn || fr) : k === 'ratio' ? !(r.ratioOn || fr) : false; });
    modeButtons(S.mode, lvNow, fr);
    chipSet($('#mpSub'), S.sub);
    const nb = $('#sgNext'); nb.disabled = sg.busy || sg.stage >= 4; nb.textContent = sg.busy ? '진행 중…' : sg.stage >= 4 ? '✔ 4단계 모두 끝' : '▶ ' + (sg.stage + 1) + '단계 ' + ST[sg.stage].n + ' 시작';
    $('#sgReset').disabled = false;
    $('#sgNote').innerHTML = '지금까지: ATP(순) <b>' + f1(sg.cnt.atp) + '</b> · NADH <b>' + sg.cnt.nadh + '</b> · FADH₂ <b>' + sg.cnt.fadh + '</b> · CO₂ <b>' + sg.cnt.co2 + '</b>';
    $('#inCO2').classList.toggle('ok', sg.stage === 4 && numIn('inCO2') === 6);
    odRender();
    const so = S.od.so; if (so) { const c = (z) => so.cards.filter((q) => q.zone === z).length; $('#odNote').innerHTML = '놓은 카드 <b>' + so.placed + ' / 4</b> · 세포질 ' + c('cyto') + ' · 기질 ' + c('matrix') + ' · 내막 ' + c('inner') + ' · 순서 <b>' + S.od.seq.length + ' / 4</b>'; }
    $$('#tbBtns button').forEach((b) => { const on = tb.shown[b.dataset.s]; b.disabled = on; b.classList.toggle('btn-primary', !on && false); b.textContent = (on ? '✔ ' : '▶ ') + ({ glyc: '해당 과정', pyox: '피루브산 산화 (2분자)', tca: 'TCA 회로 (2회전)' })[b.dataset.s]; });
    ['tA', 'tN', 'tF'].forEach((id, i) => $('#' + id).classList.toggle('ok', near(numIn(id), [4, 10, 2][i], 0.01)));
    ['cN', 'cF', 'cT'].forEach((id, i) => $('#' + id).classList.toggle('ok', near(numIn(id), [25, 3, 28][i], 0.01)));
    $('#tbNote').innerHTML = '채운 단계 <b>' + ['glyc', 'pyox', 'tca'].filter((k) => tb.shown[k]).length + ' / 3</b>' + (tbConvOK() ? ' · 전자 전달계 ATP <b>28</b> → 합계 <b>32</b>' : '');
    $('#oO2').textContent = r.o2 + ' %'; $('#sO2').value = r.o2; chipSet($('#rgAct'), r.act); chipSet($('#rgCn'), r.cn ? 'cn' : 'none');
    const rt = rgRates(); $('#inRatio').classList.toggle('ok', r.rec.rest != null && r.rec.run != null && near(numIn('inRatio'), r.rec.run / r.rec.rest, 0.15));
    $('#rgNote').innerHTML = '지금 속도(%): 해당 <b>' + rgPct(rt.v[0]) + '</b> · 피루브산 산화 <b>' + rgPct(rt.v[1]) + '</b> · TCA <b>' + rgPct(rt.v[2]) + '</b> · 전자 전달 <b>' + rgPct(rt.v[3]) + '</b>';
    chipSet($('#rlRole'), rl.role); chipSet($('#rlMed'), rl.med);
    const d = rl.data[rl.role];
    [['rlLoc', 'loc'], ['rlIn', 'in'], ['rlOut', 'out'], ['rlPass', 'pass']].forEach(([id, k]) => { const e = $('#' + id); e.classList.toggle('ok', !!d[k] && rlRight(rl.role, k)); e.classList.toggle('bad', !!rl.shake[rl.role + k]); });
    $('#rlNote').innerHTML = '채운 칸 <b>' + rlFilled() + ' / 16</b> · 지금 맡은 단계: <b>' + ST.find((s) => s.id === rl.role).n + '</b>';
  }
  bindModeSeg(setMode);
  $$('#mpSub button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setSub(b.dataset.v); }));
  $('#sgNext').addEventListener('click', () => { Sound.click(); sgNext(); });
  $('#sgReset').addEventListener('click', () => { Sound.click(); sgReset(); });
  $('#inCO2').addEventListener('input', updateCtl);
  $('#odSeqReset').addEventListener('click', () => { Sound.click(); S.od.seq = []; updateCtl(); });
  $('#tbBtns').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b && !b.disabled) tbShow(b.dataset.s); });
  ['tA', 'tN', 'tF', 'cN', 'cF', 'cT'].forEach((id) => $('#' + id).addEventListener('input', updateCtl));
  $('#tbReset').addEventListener('click', () => { Sound.click(); tbReset(); });
  $('#sO2').addEventListener('input', (e) => { S.rg.o2 = +e.target.value; updateCtl(); });
  $$('#rgAct button').forEach((b) => b.addEventListener('click', () => { S.rg.act = b.dataset.v; Sound.click(); updateCtl(); }));
  $$('#rgCn button').forEach((b) => b.addEventListener('click', () => { S.rg.cn = b.dataset.v === 'cn'; Sound.click(); updateCtl(); }));
  $('#rgRec').addEventListener('click', rgRecord);
  $('#rgClr').addEventListener('click', () => { Sound.click(); Object.keys(S.rg.marks).forEach((k) => { S.rg.marks[k] = false; }); updateCtl(); });
  $('#inRatio').addEventListener('input', updateCtl);
  $$('#rlRole button').forEach((b) => b.addEventListener('click', () => { S.rl.role = b.dataset.v; Sound.click(); rlLoad(); updateCtl(); }));
  [['rlLoc', 'loc'], ['rlIn', 'in'], ['rlOut', 'out'], ['rlPass', 'pass']].forEach(([id, k]) => $('#' + id).addEventListener('change', (e) => { S.rl.data[S.rl.role][k] = e.target.value; S.rl.shake = {}; updateCtl(); }));
  $$('#rlMed button').forEach((b) => b.addEventListener('click', () => { S.rl.med = b.dataset.v; Sound.click(); updateCtl(); }));

  /* =========================================================
     미션
     ========================================================= */
  const levels = [
    {
      title: '4단계 지도', short: '4단계 지도', icon: '🗺', phase: '모형',
      intro: '<p class="si-q">❓ 탐구 질문: 포도당 한 알이 이산화 탄소와 물로 사라지는 동안 에너지는 어떤 길로 ATP에 담길까?</p><p>🔗 <b>앞 차시에서</b> 미토콘드리아의 구조와 어느 구조에서 어떤 일이 일어나는지 큰 그림을 그렸어요. <b>앞 단원</b>에서는 포도당 + 6O₂ → 6CO₂ + 6H₂O + 에너지(ATP 약 30)의 흐름 개요를 배웠어요. 이번에는 그 길을 <b>4단계</b>로 나누어 하나씩 따라가요.</p><p>세포호흡은 <b>효소가 조절하는 일련의 화학 반응</b>이에요. 분자의 구조식은 다루지 않고 <b>탄소 구슬(●)</b>로만 표현해요. 구슬 하나가 탄소 1개예요.</p>',
      features: ['map'],
      setup() { setMode('map'); },
      recap: '해당 과정(세포질) → 피루브산 산화 → TCA 회로(기질) → 전자 전달계(내막) 순서예요. 포도당의 탄소 6개는 피루브산 산화에서 2개, TCA 회로에서 4개가 CO₂로 나가고, 수소의 전자는 O₂로 가서 H₂O가 돼요.',
      summary: '<ul><li><b>전체 반응</b>: C₆H₁₂O₆ + 6O₂ → 6CO₂ + 6H₂O + 에너지(ATP 약 30, 나머지는 열). 이화 과정이며 효소가 단계를 조절해요.</li><li><b>해당 과정</b>(세포질, 산소 필요 없음): 6탄소 포도당 → 3탄소 피루브산 2분자. <b>피루브산 산화</b>(기질): 3탄소 → 2탄소 아세틸 CoA + CO₂. <b>TCA 회로</b>(기질): 2탄소 + 4탄소 → 6탄소 → … → 4탄소, 한 바퀴에 CO₂ 2. <b>전자 전달계</b>(내막): 전자가 O₂에 전달되어 H₂O 생성.</li><li>탄소 추적: 6 → 3 + 3 → (2 + CO₂) × 2 → CO₂ 2 + 4 = <b>CO₂ 6개</b>. CO₂가 나오는 단계는 피루브산 산화와 TCA 회로, 물이 생기는 단계는 전자 전달계예요.</li><li>전자 운반체: NAD⁺ ⇄ NADH, FAD ⇄ FADH₂ (수소의 전자를 받으면 환원).</li></ul>',
      missions: [
        {
          id: 'order', title: '4단계의 순서와 장소', manual: true,
          goal: '<b>🗂 순서 · 장소</b> 화면에서 4단계 카드를 알맞은 곳에 놓고, 오른쪽에서 <b>일어나는 순서</b>대로 눌러 보세요.',
          hint: '해당 과정만 미토콘드리아 밖(세포질)에서 일어나요. 피루브산 산화와 TCA 회로는 기질, 전자 전달계는 내막이에요.',
          setup() { setMode('map'); setSub('order'); S.od.pick = null; S.od.seq = []; S.od.so.reset(); updateCtl(); },
          check() {
            const so = S.od.so; if (so.placed < 4) return '카드 4장을 모두 구역에 놓아 주세요. (' + so.placed + ' / 4)';
            const wr = odWrong(); so.markBad(wr.map((c) => c.id));
            if (wr.length) return '빨간 카드는 아직 알맞은 곳이 아니에요. ' + wr[0].label + (wr[0].id === 'glyc' ? ': 미토콘드리아가 없는 세포에서도 일어나는 단계예요.' : wr[0].id === 'etc' ? ': 전자 전달 단백질이 박힌 막이에요.' : ': 아세틸 CoA 가 도는 곳은 내막 안쪽 액체예요.');
            if (S.od.seq.length < 4) return '오른쪽에서 4단계를 일어나는 순서대로 눌러 주세요. (' + S.od.seq.length + ' / 4)';
            if (!odSeqOK()) return '순서가 달라요. 포도당이 쪼개진 뒤에 피루브산이 산화되고, 산소를 쓰는 단계가 마지막이에요.';
            return true;
          },
          explain: '순서는 <b>① 해당 과정(세포질) → ② 피루브산 산화(기질) → ③ TCA 회로(기질) → ④ 전자 전달계(내막)</b>예요. 앞 단계의 산물이 다음 단계의 재료가 돼요.',
        },
        {
          id: 'co2', title: '탄소 구슬로 CO₂ 세기',
          goal: '<b>🎞 구슬 추적</b>에서 4단계를 모두 진행하고, 포도당 1분자에서 나온 <b>CO₂ 분자 수</b>를 입력하세요.',
          hint: '▶ 단계 시작 버튼을 4번 눌러요. CO₂는 피루브산 산화에서 2개, TCA 회로에서 4개 나와요. 구슬이 떨어져 나갈 때마다 세어 보세요.',
          setup() { setMode('map'); setSub('run'); S.sg.countOn = true; $('#inCO2').value = ''; sgReset(); },
          check: () => S.sg.stage === 4 && numIn('inCO2') === 6, hold: 0.6,
          status: () => mark(S.sg.stage === 4) + ' 4단계 진행 ' + S.sg.stage + ' / 4 &nbsp; ' + mark(S.sg.stage === 4 && numIn('inCO2') === 6) + ' CO₂ 개수 입력',
          explain: '포도당의 탄소 6개는 모두 CO₂가 돼요: 피루브산 산화에서 <b>2개</b>(피루브산 2분자 × 1), TCA 회로에서 <b>4개</b>(2회전 × 2) → <b>6개</b>. 탄소의 수가 보존돼요.',
        },
        {
          type: 'quiz', title: 'CO₂가 나오는 단계',
          goal: '다음 중 <b>이산화 탄소가 나오는 단계</b> 두 개를 바르게 묶은 것은?',
          setup() { setMode('map'); setSub('run'); },
          choices: ['해당 과정과 TCA 회로', '피루브산 산화와 TCA 회로', 'TCA 회로와 전자 전달계', '해당 과정과 전자 전달계'],
          answer: 1,
          feedback: ['해당 과정에서는 6탄소가 3탄소 둘로 나뉘기만 하고 CO₂가 나오지 않아요.', '', '전자 전달계에서는 CO₂가 아니라 H₂O가 생겨요.', '두 단계 모두 CO₂가 나오지 않아요.'],
          explain: 'CO₂는 <b>피루브산 산화</b>(3탄소 → 2탄소 + CO₂)와 <b>TCA 회로</b>에서 나와요. <b>물</b>이 생기는 단계는 전자 전달계(O₂가 H₂O로 환원)예요.',
        },
      ],
    },
    {
      title: '산출물 계산', short: '산출물 계산', icon: '📊', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 탄소 구슬이 4단계를 지나 CO₂ 6개가 되는 것을 따라갔어요. 그동안 ATP와 전자 운반체는 얼마나 만들어졌을까요?</div><p>포도당 <b>1분자</b> 기준으로 각 단계의 산출물을 표에 쌓아 봐요. 해당 과정은 ATP를 2개 쓰고 4개 만들어 <b>순생산 2</b>예요. <b>NADH 1개</b>는 전자 전달계에서 ATP 약 <b>2.5</b>개, <b>FADH₂ 1개</b>는 약 <b>1.5</b>개에 해당하는 것으로 단순하게 환산해요.</p>',
      features: ['table'],
      setup() { setMode('table'); },
      recap: '직접 합성 ATP는 해당 과정(순 2)과 TCA 회로(2)에서 합쳐 4, NADH 10개와 FADH₂ 2개는 전자 전달계에서 ATP 28로 환산돼요. 합계는 약 32이고, 대부분(87.5 %)이 전자 전달계에서 만들어져요.',
      summary: '<ul><li>포도당 1분자 기준: 해당 과정 ATP 순 2 · NADH 2 / 피루브산 산화 NADH 2 · CO₂ 2 / TCA 회로(2회전) ATP 2 · NADH 6 · FADH₂ 2 · CO₂ 4.</li><li>합계: 직접 합성 ATP <b>4</b>, NADH <b>10</b>, FADH₂ <b>2</b>, CO₂ <b>6</b>.</li><li>환산(단순 값): NADH 10 × 2.5 = 25, FADH₂ 2 × 1.5 = 3 → 전자 전달계 <b>28</b> ATP. 합계 4 + 28 = <b>32</b>(직접 12.5 %, 전자 전달계 87.5 %). 실제 세포에서는 약 30~32로 소개해요.</li><li>TCA 회로가 포도당 1분자당 두 번 도는 까닭: 피루브산 2분자 → 아세틸 CoA 2분자가 되기 때문이에요.</li></ul>',
      missions: [
        {
          id: 'fill', title: '단계별 산출물 표 완성',
          goal: '세 단계 버튼을 눌러 표를 채우고, <b>직접 합성 ATP · NADH · FADH₂</b>의 합계를 입력하세요.',
          hint: '직접 합성 ATP = 해당 과정 순 2 + TCA 회로 2예요. NADH는 2 + 2 + 6, FADH₂는 TCA 회로에서만 나와요.',
          setup() { setMode('table'); tbReset(); },
          check: () => tbTotOK(), hold: 0.6,
          status: () => mark(S.tb.shown.glyc) + ' 해당 &nbsp; ' + mark(S.tb.shown.pyox) + ' 피루브산 산화 &nbsp; ' + mark(S.tb.shown.tca) + ' TCA &nbsp; ' + mark(tbTotOK()) + ' 합계 입력',
          explain: '직접 합성 ATP <b>4</b>(= 2 + 0 + 2), NADH <b>10</b>(= 2 + 2 + 6), FADH₂ <b>2</b>(TCA 회로 2회전)예요. CO₂는 2 + 4 = 6이에요.',
        },
        {
          id: 'conv', title: '전자 전달계 ATP 환산',
          goal: 'NADH 10개와 FADH₂ 2개가 만들 수 있는 ATP를 계산해 <b>NADH 분 · FADH₂ 분 · 합</b>을 입력하세요.',
          hint: 'NADH 1개 = 2.5, FADH₂ 1개 = 1.5로 계산해요. 10 × 2.5 = 25, 2 × 1.5 = 3이에요.',
          setup() { setMode('table'); ['glyc', 'pyox', 'tca'].forEach(tbShow); $('#tA').value = '4'; $('#tN').value = '10'; $('#tF').value = '2'; ['cN', 'cF', 'cT'].forEach((id) => { $('#' + id).value = ''; }); S.tb.convOn = true; updateCtl(); },
          check: () => tbConvOK(), hold: 0.6,
          status: () => mark(near(numIn('cN'), 25, 0.01)) + ' NADH 분 25 &nbsp; ' + mark(near(numIn('cF'), 3, 0.01)) + ' FADH₂ 분 3 &nbsp; ' + mark(near(numIn('cT'), 28, 0.01)) + ' 합 28',
          explain: '25 + 3 = <b>28</b> ATP예요. 직접 합성 4와 합치면 <b>32</b>(실제 세포에서는 약 30~32)이고, 직접 합성 12.5 %, 전자 전달계 87.5 %예요.',
        },
        {
          type: 'quiz', title: 'ATP가 가장 많이 만들어지는 단계',
          goal: '포도당 1분자에서 <b>ATP가 가장 많이 만들어지는</b> 단계는?',
          setup() { setMode('table'); if (!tbConvOK()) { ['glyc', 'pyox', 'tca'].forEach(tbShow); $('#tA').value = '4'; $('#tN').value = '10'; $('#tF').value = '2'; $('#cN').value = '25'; $('#cF').value = '3'; $('#cT').value = '28'; } S.tb.convOn = true; updateCtl(); },
          choices: ['해당 과정', 'TCA 회로', '전자 전달계', '피루브산 산화'],
          answer: 2,
          feedback: ['해당 과정의 순생산은 2예요.', 'TCA 회로에서 직접 만드는 ATP는 2예요. 전자 운반체를 많이 충전하지만 ATP는 적어요.', '', '피루브산 산화에서는 ATP가 직접 만들어지지 않아요.'],
          explain: '<b>전자 전달계</b>에서 약 28개로 가장 많아요. 앞 단계에서 NADH와 FADH₂에 전자를 모아 두었다가 전자 전달계에서 한꺼번에 ATP로 바꿔요. (TCA 회로가 두 번 도는 까닭은 피루브산 2분자가 아세틸 CoA 2분자가 되기 때문이에요.)',
        },
      ],
    },
    {
      title: '호흡 조절', short: '호흡 조절', icon: '🎚', phase: '탐구',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 전자 전달계가 ATP의 대부분을 만든다는 것을 계산했어요. 이 단계들은 늘 같은 속도로 돌아갈까요?</div><p><b>산소 농도</b>, <b>시안화물</b>, 세포의 <b>ATP 상태</b>(휴식 ↔ 운동)를 바꾸면서 각 단계의 흐름이 어떻게 변하는지 관찰해요. 산소는 마지막 단계에서만 직접 쓰이지만, 산소가 없으면 NADH가 NAD⁺로 되돌아가지 못해 앞 단계들도 느려져요. 또 ATP가 많으면 해당 과정의 핵심 효소(포스포프럭토키네이스) 활성이 줄어요.</p>',
      features: ['regulate'],
      setup() { setMode('regulate'); },
      recap: '산소가 없으면 전자 전달이 멈추고 NAD⁺가 재생되지 않아 TCA 회로와 피루브산 산화도 멈춰요. ATP가 많은 휴식 때는 효소 활성이 낮아져 호흡이 느리고, ATP를 많이 쓰는 운동 때는 빨라져요.',
      summary: '<ul><li><b>산소가 없으면</b>: 전자 전달 정지 → NADH가 쌓이고 NAD⁺ 재생 불가 → 피루브산 산화 · TCA 회로 정지. 해당 과정만 남은 NAD⁺로 아주 느리게 진행해요(발효는 다음 차시).</li><li><b>시안화물</b>: 전자 전달을 막아 산소가 있어도 같은 결과가 나와요.</li><li><b>효소 조절(되먹임)</b>: ATP가 많으면 해당 과정의 핵심 효소 활성이 감소, ADP가 많으면 증가해요. 근육 운동 시 ATP 소비 ↑ → ADP ↑ → 호흡 속도 ↑.</li></ul>',
      missions: [
        {
          id: 'o2zero', title: '산소가 없을 때 멈추는 단계',
          goal: '<b>산소 농도를 0 %</b>로 낮추고, 속도가 <b>0 %</b>가 된 단계를 캔버스에서 눌러 <b>"멈춤"</b>으로 표시하세요.',
          hint: '산소 슬라이더를 왼쪽 끝으로 옮겨요. 상자를 누르면 멈춤 표시가 켜지고 한 번 더 누르면 꺼져요. 해당 과정은 아주 조금 흘러서 표시하지 않아요.',
          setup() { setMode('regulate'); S.rg.o2 = 100; S.rg.act = 'rest'; S.rg.cn = false; Object.keys(S.rg.marks).forEach((k) => { S.rg.marks[k] = false; }); updateCtl(); },
          check: () => S.rg.o2 === 0 && !S.rg.cn && S.rg.marks.pyox && S.rg.marks.tca && S.rg.marks.etc && !S.rg.marks.glyc, hold: 0.5,
          status: () => mark(S.rg.o2 === 0) + ' 산소 ' + S.rg.o2 + ' % &nbsp; ' + mark(S.rg.marks.pyox && S.rg.marks.tca && S.rg.marks.etc && !S.rg.marks.glyc) + ' 멈춘 단계 표시',
          explain: '산소가 0 %이면 <b>전자 전달계</b>가 멈추고, NADH가 NAD⁺로 돌아가지 못해 <b>TCA 회로와 피루브산 산화</b>도 멈춰요. <b>해당 과정</b>만 남은 NAD⁺로 겨우 진행돼요(발효는 다음 차시).',
        },
        {
          id: 'restrun', title: '휴식과 운동 비교',
          goal: '산소 100 %에서 <b>휴식</b>과 <b>운동</b>의 전자 전달 속도를 각각 <b>📌 기록</b>하고, 운동 때가 휴식 때의 몇 배인지 입력하세요.',
          hint: 'ATP 상태를 휴식으로 두고 기록, 운동으로 바꿔 또 기록해요. 배수 = 운동 속도 / 휴식 속도예요(소수 첫째 자리).',
          setup() { setMode('regulate'); S.rg.o2 = 100; S.rg.act = 'rest'; S.rg.cn = false; S.rg.rec = { rest: null, run: null }; S.rg.ratioOn = true; Object.keys(S.rg.marks).forEach((k) => { S.rg.marks[k] = false; }); $('#inRatio').value = ''; updateCtl(); },
          check: () => S.rg.rec.rest != null && S.rg.rec.run != null && near(numIn('inRatio'), S.rg.rec.run / S.rg.rec.rest, 0.15), hold: 0.6,
          status: () => mark(S.rg.rec.rest != null) + ' 휴식 기록 ' + (S.rg.rec.rest != null ? S.rg.rec.rest + ' %' : '') + ' &nbsp; ' + mark(S.rg.rec.run != null) + ' 운동 기록 ' + (S.rg.rec.run != null ? S.rg.rec.run + ' %' : '') + ' &nbsp; ' + mark(S.rg.rec.rest != null && S.rg.rec.run != null && near(numIn('inRatio'), S.rg.rec.run / S.rg.rec.rest, 0.15)) + ' 배수',
          explain: '휴식 30 %, 운동 100 %이므로 100 / 30 ≈ <b>3.3배</b>예요. 휴식 중에는 ATP가 쌓여 해당 과정의 효소 활성이 줄고, 운동 중에는 ADP가 늘어 활성이 커져서 호흡이 빨라져요.',
        },
        {
          type: 'quiz', title: '산소와 TCA 회로',
          goal: '산소를 직접 쓰는 단계는 맨 마지막인데도 <b>산소가 없으면 TCA 회로가 멈추는</b> 까닭은?',
          setup() { setMode('regulate'); },
          choices: ['TCA 회로에서도 산소를 직접 쓰기 때문이다', '전자 전달이 멈추면 NADH가 NAD⁺로 되돌아가지 못해 NAD⁺가 부족해지기 때문이다', '산소가 없으면 포도당이 모두 없어지기 때문이다', '산소가 없으면 모든 효소가 변성되기 때문이다'],
          answer: 1,
          feedback: ['TCA 회로에서는 산소를 직접 쓰지 않아요. CO₂가 나오고 전자 운반체가 충전돼요.', '', '포도당이 사라지는 것이 아니라 전자 운반체가 재생되지 않아요.', '효소가 변성되는 것이 아니라 필요한 NAD⁺가 부족해지는 거예요.'],
          explain: '전자 전달계는 NADH의 전자를 받아 <b>NAD⁺를 재생</b>해요. 이게 멈추면 NAD⁺가 바닥나서 TCA 회로와 피루브산 산화도 멈춰요. (휴식 중 호흡이 느린 까닭: ATP가 많아져 효소 활성이 줄기 때문이에요.)',
        },
      ],
    },
    {
      title: '릴레이 설명', short: '릴레이 설명', icon: '🧩', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 4단계가 서로 이어져 한 단계의 산물이 다음 단계의 재료가 되는 것을 확인했어요.</div><p>이번에는 모둠 활동처럼 <b>릴레이</b>로 설명해 봐요. 한 사람이 한 단계를 맡아 <b>장소 / 들어온 것 / 나가는 것 / 다음 사람에게 넘기는 것</b> 네 칸을 채우고, 네 단계를 이어 붙여 <b>세포호흡 한 장 요약</b>을 만들어요. 설명 매체는 <b>애니메이션 카드 · 그림표 · 역할극 대본</b> 중에서 골라요.</p>',
      features: ['relay'],
      setup() { setMode('relay'); },
      recap: '세포호흡은 포도당(6탄소)이 피루브산(3탄소) → 아세틸 CoA(2탄소) → CO₂로 분해되는 동안 전자를 NADH · FADH₂에 모으고, 전자 전달계에서 O₂가 H₂O가 되며 ATP가 만들어지는 이어달리기예요.',
      summary: '<ul><li>해당 과정(세포질): 6탄소 포도당 → 3탄소 피루브산 2분자 + ATP 순 2 + NADH 2. 피루브산 산화(기질): → 2탄소 아세틸 CoA 2분자 + CO₂ 2 + NADH 2.</li><li>TCA 회로(기질): CO₂ 4 + ATP 2 + NADH 6 + FADH₂ 2. 전자 전달계(내막): NADH · FADH₂의 전자 → O₂ → H₂O, ATP 약 28.</li><li>포도당의 <b>탄소는 CO₂</b>로, 수소의 <b>전자는 O₂를 거쳐 H₂O</b>로 가요. 미토콘드리아가 필요 없는 단계는 해당 과정뿐이에요.</li><li>매체를 달리해도(카드, 그림표, 대본) 같은 내용을 전달할 수 있어요. 협력할 때는 앞 사람이 넘긴 것이 내 단계의 재료가 되는지 확인해요.</li></ul>',
      missions: [
        {
          id: 'relay', title: '세포호흡 한 장 요약', manual: true,
          goal: '4단계의 <b>장소 · 들어온 것 · 나가는 것 · 넘기는 것</b> 16칸을 채우고, 설명 <b>매체</b>를 하나 골라 요약을 완성하세요.',
          hint: '앞 사람이 "넘기는 것"이 다음 단계의 "들어온 것"이에요. 단계 칩을 눌러 한 단계씩 채워요.',
          setup() { setMode('relay'); S.rl.data = { glyc: {}, pyox: {}, tca: {}, etc: {} }; S.rl.med = ''; S.rl.shake = {}; S.rl.role = 'glyc'; rlLoad(); updateCtl(); },
          check() {
            const rl = S.rl, miss = ST.filter((s) => RLKEYS.some((k) => !rl.data[s.id][k]));
            if (miss.length) { return '비어 있는 칸이 있어요. (' + rlFilled() + ' / 16) 덜 채운 단계: ' + miss.map((s) => s.n).join(', '); }
            const sh = {}; let first = null; ST.forEach((s) => RLKEYS.forEach((k) => { if (!rlRight(s.id, k)) { sh[s.id + k] = true; if (!first) first = [s, k]; } }));
            if (JSON.stringify(sh) !== JSON.stringify(rl.shake)) { rl.shake = sh; updateCtl(); }
            if (first) return '빨간 칸이 아직 달라요. ' + first[0].n + '의 [' + RLLAB[first[1]] + '] 칸을 다시 생각해 보세요.';
            if (!rl.med) return '설명 매체를 하나 골라 주세요.';
            return true;
          },
          explain: '장소: 해당 과정은 세포질, 피루브산 산화와 TCA 회로는 기질, 전자 전달계는 내막이에요. 앞 단계가 넘기는 것(피루브산 → 아세틸 CoA → NADH · FADH₂ → ATP)이 다음 단계의 재료가 되는 <b>릴레이</b>예요.',
        },
        {
          type: 'quiz', title: '탄소와 전자의 마지막 도착지',
          goal: '포도당의 <b>탄소</b>는 마지막에 어디로 갈까요?',
          setup() { setMode('relay'); },
          choices: ['CO₂', 'H₂O', 'ATP', 'NADH'],
          answer: 0,
          feedback: ['', '물의 수소는 포도당의 수소와 O₂에서 와요. 탄소는 H₂O에 들어가지 않아요.', 'ATP는 에너지를 담는 분자예요. 포도당의 탄소가 ATP로 가는 것은 아니에요.', 'NADH는 전자를 옮기는 운반체예요.'],
          explain: '탄소는 <b>CO₂</b>로 나가고, 수소의 전자는 NADH · FADH₂를 거쳐 <b>O₂ → H₂O</b>로 가요. 이 모든 단계 중 미토콘드리아가 필요 없는 단계는 해당 과정뿐이에요.',
        },
      ],
    },
  ];

  sgReset(); odBuild(); rlLoad();
  game = SciSim.game({
    simId: 'hy-respiration-stages', mount: '#game', badge: '세포호흡 릴레이 주자', homeHref: '../../index.html#hy',
    featureLabels: { map: '🗺 4단계 구슬 추적 지도', table: '📊 단계별 산출물 표', regulate: '🎚 호흡 조절 시뮬레이터', relay: '🧩 릴레이 요약' },
    onFeatures() { updateCtl(); },
    levels,
  });

  function readouts() {
    const m = S.mode;
    if (m === 'map' && S.sub === 'run') setReads(['진행한 단계', S.sg.stage + ' / 4', 'ATP (순)', f1(S.sg.num.atp.v), 'CO₂', fi(S.sg.num.co2.v)]);
    else if (m === 'map') setReads(['놓은 카드', S.od.so.placed + ' / 4', '고른 순서', S.od.seq.length + ' / 4', '남은 카드', (4 - S.od.so.placed) + '장']);
    else if (m === 'table') setReads(['채운 단계', ['glyc', 'pyox', 'tca'].filter((k) => S.tb.shown[k]).length + ' / 3', '직접 합성 ATP', tbAll() ? '2 + 2 = 4' : '?', '전자 전달계 ATP', tbConvOK() ? '28' : '?']);
    else if (m === 'regulate') { const v = rgRates().v; setReads(['산소 농도', S.rg.o2 + ' %', '전자 전달 속도', rgPct(v[3]) + ' %', '해당 과정 속도', rgPct(v[0]) + ' %']); }
    else setReads(['채운 칸', rlFilled() + ' / 16', '설명 매체', S.rl.med ? RLMED[S.rl.med] : '—', '맡은 단계', ST.find((s) => s.id === S.rl.role).n]);
  }

  setMode('map');
  let lastFree = false, lastLv = -1, uiT = 0;
  SciSim.loop((dt, t) => {
    clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (game && game.level !== lastLv) { lastLv = game.level; updateCtl(); }
    view.apply(); FX.update(dt); ctx.clearRect(0, 0, VW, VH);
    bgFill('#f3f6ee', '#e8eee2');
    updLater(dt);
    if (S.mode === 'map' && S.sub === 'run') rsDraw(dt, t); else if (S.mode === 'map') odDraw(dt, t); else if (S.mode === 'table') tbDraw(dt, t); else if (S.mode === 'regulate') rgDraw(dt, t); else rlDraw(dt, t);
    FX.draw(); parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(241,246,243,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : approach(S.fade, 0, dt, 9); }
    uiT += dt; if (uiT > 0.3 && S.mode === 'regulate') { uiT = 0; updateCtl(); }
    readouts();
  });

  window.__sim = { S, VW, VH, PHONE, get game() { return game; }, levels, setMode, setSub, sgNext, sgReset, tbShow, tbReset, rgRates, rgRecord, rgBox, rgG, rlLoad, ODC, odG, updateCtl, tbG, ST, RLANS };
})();
