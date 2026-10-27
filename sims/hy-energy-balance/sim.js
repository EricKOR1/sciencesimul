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
     고등학교 세포와 물질대사 · Ⅱ. 물질대사와 에너지 - 에너지 섭취와 소비 (단원 57, 2차시)
     성취기준 [12세포02-01] (균형 있는 에너지 섭취와 소비의 중요성)
     ① 분석: 영양소 열량  ② 기록: 하루 섭취  ③ 탐구: 하루 소비  ④ 분석: 에너지 균형
     모든 수치는 학습용 단순 계산 예시이며 개인 진단 · 식단 처방이 아니에요. 입력한 값은 저장하지 않아요.
     ========================================================= */
  const S = { mode: 'cal', fade: 0 };
  let game = null;
  const DISC = '교육용 예시 값 · 개인 진단·식단 처방이 아니에요';
  const KC = { C: 4, P: 4, F: 9 };
  const NUT = { C: { name: '탄수화물', col: '#f59e0b', band: [55, 65] }, P: { name: '단백질', col: '#ef4444', band: [7, 20] }, F: { name: '지방', col: '#3b82f6', band: [15, 30] } };
  const FOODS = [
    { id: 'rice', name: '밥 1공기', short: '밥', icon: '🍚', C: 66, P: 5.5, F: 0.5 },
    { id: 'egg', name: '달걀 1개', short: '달걀', icon: '🥚', C: 0.5, P: 6.5, F: 5 },
    { id: 'milk', name: '우유 1컵', short: '우유', icon: '🥛', C: 9.6, P: 6.4, F: 7.2 },
    { id: 'bread', name: '식빵 2장', short: '식빵', icon: '🍞', C: 40, P: 8, F: 3 },
    { id: 'chick', name: '닭가슴살 100 g', short: '닭가슴살', icon: '🍗', C: 0, P: 23, F: 1.5 },
    { id: 'banana', name: '바나나 1개', short: '바나나', icon: '🍌', C: 27, P: 1.2, F: 0.3 },
    { id: 'burger', name: '햄버거 1개', short: '햄버거', icon: '🍔', C: 40, P: 25, F: 25 },
    { id: 'cola', name: '콜라 250 mL', short: '콜라', icon: '🥤', C: 27, P: 0, F: 0 },
  ];
  const FD = {}; FOODS.forEach((f) => { FD[f.id] = f; f.kc = { C: KC.C * f.C, P: KC.P * f.P, F: KC.F * f.F }; f.kcal = f.kc.C + f.kc.P + f.kc.F; });
  const gtxt = (v) => (Math.round(v * 10) / 10).toString();
  const kcalTxt = (v) => gtxt(v);
  function disc(x, y, align) { T(x, y, DISC, 13, '#64748b', align || 'left', 700); }
  function discBlock(x, y, w) { textBlock(x, y, w, DISC, 13, '#64748b', 16, 700); }

  /* =========================================================
     ① 영양소 열량 : 식품 성분표 검색 화면
     ========================================================= */
  S.cal = { sel: 'rice', done: {}, nums: {}, pulse: 0 };
  FOODS.forEach((f) => { S.cal.nums[f.id] = new Num(0); });
  const CL_A = PHONE ? { x: 10, y: 10, w: 460, h: 314 } : { x: 14, y: 14, w: 486, h: 532 };
  const CL_F = PHONE ? { x: 10, y: 332, w: 460, h: 152 } : { x: 512, y: 14, w: 274, h: 270 };
  const CL_R = PHONE ? { x: 10, y: 490, w: 460, h: 128 } : { x: 512, y: 292, w: 274, h: 208 };
  const clCard = (i) => (PHONE ? { x: CL_A.x + 10 + (i % 2) * 226, y: CL_A.y + 42 + Math.floor(i / 2) * 66, w: 218, h: 62 } : { x: CL_A.x + 12 + (i % 2) * 231, y: CL_A.y + 62 + Math.floor(i / 2) * 116, w: 223, h: 108 });
  const clDone = () => FOODS.filter((f) => S.cal.done[f.id]).length;
  function clSelect(id) {
    S.cal.sel = id; const f = FD[id];
    $('#inC').value = S.cal.done[id] ? gtxt(f.kc.C) : ''; $('#inP').value = S.cal.done[id] ? gtxt(f.kc.P) : ''; $('#inF').value = S.cal.done[id] ? gtxt(f.kc.F) : '';
    Sound.tick(); updateCtl();
  }
  const clOk = (id) => { const f = FD[id]; return near(numIn('inC'), f.kc.C, 0.05) && near(numIn('inP'), f.kc.P, 0.05) && near(numIn('inF'), f.kc.F, 0.05); };
  function clInput() {
    const id = S.cal.sel;
    if (!S.cal.done[id] && clOk(id)) {
      S.cal.done[id] = true; S.cal.nums[id].set(FD[id].kcal); S.cal.pulse = 1; Sound.success();
      const i = FOODS.findIndex((f) => f.id === id), r = clCard(i); parts.burst(r.x + r.w / 2, r.y + r.h / 2, { count: 16 });
    }
    updateCtl();
  }
  function clDraw(dt, t) {
    const c = S.cal; c.pulse = approach(c.pulse, 0, dt, 3);
    FOODS.forEach((f) => c.nums[f.id].update(dt, 5));
    panel(CL_A.x, CL_A.y, CL_A.w, CL_A.h, 18, '#fff');
    D.roundRect(CL_A.x + 10, CL_A.y + 10, CL_A.w - 20, PHONE ? 26 : 38, 19); ctx.fillStyle = '#f1f5f9'; ctx.fill();
    T(CL_A.x + 26, CL_A.y + (PHONE ? 29 : 35), '🔎 식품 성분표 검색', L(16, 14), '#64748b', 'left', 800);
    T(CL_A.x + CL_A.w - 22, CL_A.y + (PHONE ? 29 : 35), '계산한 음식 ' + clDone() + ' / 8', L(14.5, 13), '#16a34a', 'right', 800);
    FOODS.forEach((f, i) => {
      const r = clCard(i), sel = c.sel === f.id, dn = c.done[f.id];
      D.shadow(() => { D.roundRect(r.x, r.y, r.w, r.h, 12); ctx.fillStyle = sel ? '#fff8dc' : '#fff'; ctx.fill(); }, { blur: sel ? 10 : 4, y: 2 });
      D.roundRect(r.x, r.y, r.w, r.h, 12); ctx.strokeStyle = sel ? '#f59e0b' : dn ? '#16a34a' : '#d6e0d9'; ctx.lineWidth = sel ? 3 : 2; ctx.stroke();
      E(f.icon, r.x + (PHONE ? 22 : 30), r.y + (PHONE ? 29 : 32), PHONE ? 24 : 32);
      const tx = r.x + (PHONE ? 42 : 58);
      TF(tx, r.y + (PHONE ? 22 : 28), f.name, r.w - (PHONE ? 50 : 66), L(16, 13.5), 12, '#1f2d44', 'left', 800);
      if (PHONE) T(tx, r.y + 40, '탄 ' + gtxt(f.C) + ' · 단 ' + gtxt(f.P) + ' · 지 ' + gtxt(f.F) + ' g', 13, '#475569', 'left', 700);
      else ['C', 'P', 'F'].forEach((k, q) => T(tx, r.y + 50 + q * 20, NUT[k].name + ' ' + gtxt(f[k]) + ' g', 14, '#475569', 'left', 700));
      if (dn) { D.check(r.x + r.w - 16, r.y + 16, 9, 1); if (PHONE) T(tx, r.y + 57, kcalTxt(c.nums[f.id].v) + ' kcal', 13.5, '#15803d', 'left', 800); else T(r.x + r.w - 10, r.y + r.h - 10, kcalTxt(c.nums[f.id].v) + ' kcal', 15, '#15803d', 'right', 800); }
    });
    // 계산 패널
    const f = FD[c.sel], R = CL_F;
    panel(R.x, R.y, R.w, R.h, 18, '#fff');
    TF(R.x + 14, R.y + 26, f.icon + ' ' + f.name + ': 열량 계산', R.w - 28, L(17, 14.5), 12.5, '#1f2d44', 'left', 800);
    const vals = [numIn('inC'), numIn('inP'), numIn('inF')];
    ['C', 'P', 'F'].forEach((k, q) => {
      const y = R.y + (PHONE ? 36 : 44) + q * (PHONE ? 30 : 36), want = f.kc[k], ok = near(vals[q], want, 0.05);
      T(R.x + 14, y + 20, NUT[k].name + ' ' + gtxt(f[k]) + ' g × ' + KC[k], L(14.5, 13.5), '#334155', 'left', 700);
      const bx = R.x + R.w - (PHONE ? 130 : 96), bw = PHONE ? 116 : 84;
      D.roundRect(bx, y + 2, bw, 26, 8); ctx.fillStyle = ok ? '#dcfce7' : '#f1f5f9'; ctx.fill(); ctx.strokeStyle = ok ? '#16a34a' : '#cbd5e1'; ctx.lineWidth = 2; ctx.stroke();
      T(bx + bw / 2, y + 21, isFinite(vals[q]) ? gtxt(vals[q]) + ' kcal' : '? kcal', 14, ok ? '#15803d' : '#64748b', 'center', 800);
    });
    if (c.done[f.id]) {
      const tot = f.kcal;
      if (!PHONE) {
        T(R.x + 14, R.y + 166, '합계 ' + gtxt(tot) + ' kcal', 17, '#15803d', 'left', 800);
        donut(R.x + 66, R.y + 218, 38, 20, [{ v: f.kc.C, col: NUT.C.col }, { v: f.kc.P, col: NUT.P.col }, { v: f.kc.F, col: NUT.F.col }]);
        ['C', 'P', 'F'].forEach((k, q) => { const y = R.y + 194 + q * 22; D.roundRect(R.x + 120, y - 10, 11, 11, 3); ctx.fillStyle = NUT[k].col; ctx.fill(); T(R.x + 136, y, NUT[k].name + ' ' + Math.round(f.kc[k] / tot * 100) + ' %', 14, '#334155', 'left', 700); });
      } else {
        T(R.x + 14, R.y + 144, '합계 ' + gtxt(tot) + ' kcal', 15, '#15803d', 'left', 800);
        ['C', 'P', 'F'].forEach((k, q) => { T(R.x + 150 + q * 100, R.y + 144, NUT[k].name.slice(0, 1) + ' ' + Math.round(f.kc[k] / tot * 100) + ' %', 13.5, NUT[k].col, 'left', 800); });
      }
    } else {
      T(R.x + 14, R.y + (PHONE ? 144 : 168), '× 는 1 g당 kcal예요. 곱한 값을 입력해요.', L(14, 13), '#64748b', 'left', 700);
      if (!PHONE) { T(R.x + 14, R.y + 194, '탄수화물 · 단백질 1 g = 4 kcal', 14, '#334155', 'left', 800); T(R.x + 14, R.y + 216, '지방 1 g = 9 kcal', 14, '#334155', 'left', 800); }
    }
    // 열량 순위
    const Q = CL_R; panel(Q.x, Q.y, Q.w, Q.h, 18, '#fff');
    T(Q.x + 14, Q.y + 24, '🍽 계산한 음식의 열량 순위', L(16, 14), '#1f2d44', 'left', 800);
    const list = FOODS.filter((q) => c.done[q.id]).sort((a, b) => b.kcal - a.kcal);
    list.forEach((q, i) => {
      const c2 = PHONE ? Math.floor(i / 4) : 0, r2 = PHONE ? i % 4 : i, x0 = Q.x + (PHONE ? 10 + c2 * 226 : 14), y = Q.y + (PHONE ? 34 : 40) + r2 * (PHONE ? 22 : 22);
      const bx = x0 + (PHONE ? 58 : 66), maxW = PHONE ? 100 : Q.w - 14 - 66 - 58, w = maxW * clamp(c.nums[q.id].v / 500, 0, 1);
      T(x0, y + 15, q.short, 13.5, '#334155', 'left', 700);
      if (w > 0.5) { D.roundRect(bx, y + 3, w, 15, 4); ctx.fillStyle = q.kcal > 400 ? '#ef6a3c' : '#22a35a'; ctx.fill(); }
      T(bx + w + 5, y + 15, kcalTxt(c.nums[q.id].v), 13, '#334155', 'left', 800);
    });
    if (!list.length) T(Q.x + Q.w / 2, Q.y + Q.h / 2 + 8, '계산하면 열량 순서가 쌓여요', 14, '#94a3b8', 'center', 700);
    if (!PHONE) discBlock(R.x + 6, 516, R.w - 8); else disc(10, 634, 'left');
  }
  const clPT = {
    down(p) { FOODS.forEach((f, i) => { if (inRect(p.x, p.y, clCard(i))) clSelect(f.id); }); return false; },
    hover(p) { return FOODS.some((f, i) => inRect(p.x, p.y, clCard(i))) ? 'pointer' : 'default'; },
  };

  /* =========================================================
     ② 하루 섭취 : 디지털 식단 기록
     ========================================================= */
  const MEALS = [{ k: 'b', name: '아침', icon: '🌅', col: '#f59e0b' }, { k: 'l', name: '점심', icon: '🍱', col: '#16a34a' }, { k: 's', name: '간식', icon: '🍪', col: '#a855f7' }, { k: 'd', name: '저녁', icon: '🌙', col: '#3b82f6' }];
  const MAXSLOT = PHONE ? 6 : 8;
  S.ml = { sel: 'b', items: { b: [], l: [], s: [], d: [] }, drag: null, hot: null, total: new Num(0), pc: { C: new Num(0), P: new Num(0), F: new Num(0) }, seq: 0 };
  const ML_P = PHONE ? { x: 10, y: 10, w: 460, h: 306 } : { x: 14, y: 14, w: 520, h: 428 };
  const ML_S = PHONE ? { x: 10, y: 324, w: 460, h: 162 } : { x: 546, y: 14, w: 240, h: 428 };
  const ML_T = PHONE ? { x: 10, y: 494, w: 460, h: 138 } : { x: 14, y: 452, w: 772, h: 94 };
  const slotR = (i) => { const sw = (ML_P.w - 28 - 10) / 2, sh = (ML_P.h - 44 - 14 - 10) / 2; return { x: ML_P.x + 14 + (i % 2) * (sw + 10), y: ML_P.y + 44 + Math.floor(i / 2) * (sh + 10), w: sw, h: sh }; };
  const itemR = (i, n) => { const r = slotR(i), cw = (r.w - 24) / 2, ch = PHONE ? 26 : 30; return { x: r.x + 8 + (n % 2) * (cw + 8), y: r.y + (PHONE ? 30 : 34) + Math.floor(n / 2) * (ch + 4), w: cw, h: ch }; };
  const trayR = (i) => (PHONE ? { x: ML_T.x + 10 + (i % 4) * 111, y: ML_T.y + 32 + Math.floor(i / 4) * 52, w: 104, h: 48 } : { x: ML_T.x + 10 + i * 94, y: ML_T.y + 32, w: 88, h: 54 });
  const mlTotals = () => { let C = 0, P = 0, F = 0; MEALS.forEach((m) => S.ml.items[m.k].forEach((it) => { const f = FD[it.id]; C += f.kc.C; P += f.kc.P; F += f.kc.F; })); return { C, P, F, kcal: C + P + F }; };
  const mlKcal = () => Math.round(mlTotals().kcal);
  const mlPct = () => { const t = mlTotals(); if (t.kcal <= 0) return { C: 0, P: 0, F: 0 }; return { C: Math.round(t.C / t.kcal * 100), P: Math.round(t.P / t.kcal * 100), F: Math.round(t.F / t.kcal * 100) }; };
  const mlCount = () => MEALS.reduce((a, m) => a + S.ml.items[m.k].length, 0);
  function mlAdd(id, meal) {
    const arr = S.ml.items[meal];
    if (arr.length >= MAXSLOT) { showHint('이 칸은 가득 찼어요. 음식을 눌러 빼거나 다른 칸을 골라요.', 3200); Sound.fail(); return false; }
    arr.push({ id, pop: 1, seq: ++S.ml.seq }); Sound.click(); updateCtl(); return true;
  }
  function mlClear() { MEALS.forEach((m) => { S.ml.items[m.k].length = 0; }); S.ml.drag = null; hideHint(); updateCtl(); }
  function mlDraw(dt, t) {
    const m = S.ml, tt = mlTotals();
    m.total.set(tt.kcal); m.total.update(dt, 5);
    ['C', 'P', 'F'].forEach((k) => { m.pc[k].set(mlPct()[k]); m.pc[k].update(dt, 6); });
    // 기록 앱
    D.shadow(() => { D.roundRect(ML_P.x, ML_P.y, ML_P.w, ML_P.h, 22); ctx.fillStyle = '#1f2937'; ctx.fill(); }, { blur: 10, y: 3 });
    D.roundRect(ML_P.x + 5, ML_P.y + 5, ML_P.w - 10, ML_P.h - 10, 18); ctx.fillStyle = '#f8fafc'; ctx.fill();
    T(ML_P.x + 18, ML_P.y + 32, '📱 하루 식단 기록 앱', L(17, 14.5), '#1f2d44', 'left', 800);
    T(ML_P.x + ML_P.w - 18, ML_P.y + 32, '선택한 칸: ' + MEALS.find((q) => q.k === m.sel).name, L(14.5, 13), '#16a34a', 'right', 800);
    MEALS.forEach((ml, i) => {
      const r = slotR(i), sel = m.sel === ml.k, hot = m.hot === ml.k;
      D.roundRect(r.x, r.y, r.w, r.h, 14); ctx.fillStyle = C.rgba(ml.col, hot ? 0.28 : 0.1); ctx.fill();
      ctx.setLineDash(sel ? [] : [6, 5]); ctx.strokeStyle = C.rgba(ml.col, sel || hot ? 1 : 0.6); ctx.lineWidth = sel || hot ? 3 : 2; ctx.stroke(); ctx.setLineDash([]);
      const sub = m.items[ml.k].reduce((a, it) => a + FD[it.id].kcal, 0);
      T(r.x + 10, r.y + 22, ml.icon + ' ' + ml.name, L(16, 14), C.shade(ml.col, -0.35), 'left', 800);
      T(r.x + r.w - 10, r.y + 22, Math.round(sub) + ' kcal', L(14.5, 13), '#475569', 'right', 800);
      m.items[ml.k].forEach((it, n) => {
        it.pop = approach(it.pop, 0, dt, 9);
        const q = itemR(i, n), f = FD[it.id], sc = 1 + it.pop * 0.18;
        ctx.save(); ctx.translate(q.x + q.w / 2, q.y + q.h / 2); ctx.scale(sc, sc);
        D.roundRect(-q.w / 2, -q.h / 2, q.w, q.h, 9); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = C.rgba(ml.col, 0.8); ctx.lineWidth = 1.6; ctx.stroke();
        E(f.icon, -q.w / 2 + 14, 1, 17); TF(-q.w / 2 + 28, 5, PHONE ? f.short : f.short + ' ' + kcalTxt(f.kcal), q.w - 32, 13, 11, '#1f2d44', 'left', 800);
        ctx.restore();
      });
      if (!m.items[ml.k].length) T(r.x + r.w / 2, r.y + r.h / 2 + 12, '음식을 놓아요', 13.5, '#94a3b8', 'center', 700);
    });
    // 합계 패널
    panel(ML_S.x, ML_S.y, ML_S.w, ML_S.h, 18, '#fff');
    const bandOK = (k) => mlPct()[k] >= NUT[k].band[0] && mlPct()[k] <= NUT[k].band[1];
    if (!PHONE) {
      T(ML_S.x + ML_S.w / 2, ML_S.y + 28, '섭취 에너지', 15, '#475569', 'center', 800);
      T(ML_S.x + ML_S.w / 2, ML_S.y + 66, comma(m.total.v) + ' kcal', 28, mlKcal() >= 2100 && mlKcal() <= 2300 ? '#15803d' : '#1f2d44', 'center', 800);
      T(ML_S.x + ML_S.w / 2, ML_S.y + 88, '(목표 예시 2200 ± 100)', 13, '#64748b', 'center', 700);
      donut(ML_S.x + ML_S.w / 2, ML_S.y + 152, 48, 26, [{ v: tt.C, col: NUT.C.col }, { v: tt.P, col: NUT.P.col }, { v: tt.F, col: NUT.F.col }]);
      if (tt.kcal <= 0) T(ML_S.x + ML_S.w / 2, ML_S.y + 156, '—', 15, '#94a3b8', 'center', 800);
    } else {
      T(ML_S.x + 14, ML_S.y + 28, '섭취 ' + comma(m.total.v) + ' kcal', 20, mlKcal() >= 2100 && mlKcal() <= 2300 ? '#15803d' : '#1f2d44', 'left', 800);
      T(ML_S.x + ML_S.w - 14, ML_S.y + 28, '(목표 예시 2200 ± 100)', 13, '#64748b', 'right', 700);
    }
    ['C', 'P', 'F'].forEach((k, q) => {
      const y0 = ML_S.y + (PHONE ? 48 + q * 31 : 232 + q * 62), bx = ML_S.x + (PHONE ? 100 : 16), bw = ML_S.w - (PHONE ? 230 : 32), p = mlPct()[k], ok = bandOK(k) && tt.kcal > 0;
      T(ML_S.x + (PHONE ? 14 : 16), y0 + (PHONE ? 14 : 0), NUT[k].name + (PHONE ? '' : ' ' + Math.round(m.pc[k].v) + ' %'), L(14.5, 13.5), NUT[k].col === '#f59e0b' ? '#b45309' : C.shade(NUT[k].col, -0.25), 'left', 800);
      const by = PHONE ? y0 + 2 : y0 + 10, bh = 14;
      D.roundRect(bx, by, bw, bh, 7); ctx.fillStyle = '#eef2f7'; ctx.fill();
      ctx.fillStyle = 'rgba(34,197,94,.35)'; ctx.fillRect(bx + bw * NUT[k].band[0] / 100, by, bw * (NUT[k].band[1] - NUT[k].band[0]) / 100, bh);
      if (tt.kcal > 0) { const mx = bx + bw * clamp(m.pc[k].v / 100, 0, 1); ctx.fillStyle = ok ? '#16a34a' : '#1f2d44'; ctx.beginPath(); ctx.moveTo(mx, by + bh + 1); ctx.lineTo(mx - 6, by + bh + 10); ctx.lineTo(mx + 6, by + bh + 10); ctx.fill(); }
      if (!PHONE) T(bx + bw, y0, '목표 ' + NUT[k].band[0] + '~' + NUT[k].band[1] + ' %', 13, '#16a34a', 'right', 700);
      if (PHONE) T(bx + bw + 8, by + 12, Math.round(m.pc[k].v) + ' % (' + NUT[k].band[0] + '~' + NUT[k].band[1] + ')', 13, ok ? '#15803d' : '#475569', 'left', 800);
    });
    // 트레이
    panel(ML_T.x, ML_T.y, ML_T.w, ML_T.h, 16, '#fff');
    T(ML_T.x + 14, ML_T.y + 22, '음식을 끌어 칸에 놓거나, 눌러서 선택한 칸에 담아요', L(14.5, 13.5), '#334155', 'left', 800);
    FOODS.forEach((f, i) => {
      const r = trayR(i), grab = m.drag && m.drag.id === f.id && m.drag.moved;
      D.roundRect(r.x, r.y, r.w, r.h, 11); ctx.fillStyle = grab ? '#fff8dc' : '#f8fafc'; ctx.fill(); ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1.8; ctx.stroke();
      E(f.icon, r.x + r.w / 2, r.y + 21, 24); TF(r.x + r.w / 2, r.y + 44, f.short, r.w - 8, 13, 11, '#1f2d44', 'center', 800);
    });
    if (m.drag && m.drag.moved) { const f = FD[m.drag.id]; ctx.save(); ctx.globalAlpha = 0.95; D.shadow(() => { D.roundRect(m.drag.x - 46, m.drag.y - 22, 92, 44, 11); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: 12, y: 6 }); E(f.icon, m.drag.x - 24, m.drag.y, 24); T(m.drag.x + 8, m.drag.y + 5, f.short, 13.5, '#1f2d44', 'center', 800); ctx.restore(); }
    if (PHONE) disc(ML_S.x + 14, ML_S.y + ML_S.h - 7, 'left'); else disc(ML_T.x + ML_T.w - 14, ML_T.y + 22, 'right');
  }
  const mlPT = {
    down(p) {
      for (let i = 0; i < FOODS.length; i++) if (inRect(p.x, p.y, trayR(i))) { S.ml.drag = { id: FOODS[i].id, x: p.x, y: p.y, sx: p.x, sy: p.y, moved: false }; Sound.tick(); return true; }
      for (let i = 0; i < 4; i++) { const arr = S.ml.items[MEALS[i].k]; for (let n = 0; n < arr.length; n++) if (inRect(p.x, p.y, itemR(i, n))) { arr.splice(n, 1); Sound.click(); updateCtl(); return false; } if (inRect(p.x, p.y, slotR(i))) { S.ml.sel = MEALS[i].k; Sound.tick(); updateCtl(); return false; } }
      return false;
    },
    move(p) { const d = S.ml.drag; if (!d) return; if (Math.hypot(p.x - d.sx, p.y - d.sy) > 8) d.moved = true; if (d.moved) { d.x = p.x; d.y = p.y; S.ml.hot = null; for (let i = 0; i < 4; i++) if (inRect(p.x, p.y, slotR(i))) S.ml.hot = MEALS[i].k; } },
    up(p) {
      const d = S.ml.drag; S.ml.drag = null; S.ml.hot = null; if (!d) return;
      if (!d.moved) { mlAdd(d.id, S.ml.sel); return; }
      for (let i = 0; i < 4; i++) if (inRect(p.x, p.y, slotR(i))) { S.ml.sel = MEALS[i].k; mlAdd(d.id, MEALS[i].k); return; }
    },
    hover(p) { for (let i = 0; i < FOODS.length; i++) if (inRect(p.x, p.y, trayR(i))) return 'grab'; return 'default'; },
  };

  /* =========================================================
     ③ 하루 소비 : 기초 대사량 + 활동 대사량 + 식이 열 효과
     ========================================================= */
  const ACTS = { sleep: { name: '수면·휴식', met: 1.0, col: '#c7d2fe', tc: '#4338ca', icon: '😴' }, study: { name: '앉아 공부', met: 1.5, col: '#fde68a', tc: '#a16207', icon: '📖' }, walk: { name: '걷기', met: 3.5, col: '#a7f3d0', tc: '#047857', icon: '🚶' }, bike: { name: '자전거', met: 6, col: '#bae6fd', tc: '#0369a1', icon: '🚴' }, run: { name: '달리기', met: 8, col: '#fca5a5', tc: '#b91c1c', icon: '🏃' } };
  const AKEYS = ['sleep', 'study', 'walk', 'bike', 'run'];
  const EX_INTAKE = 2200;
  S.bn = { kg: 60, brush: 'study', cells: new Array(48).fill('sleep'), paint: false, nums: { bmr: new Num(1440), act: new Num(0), tef: new Num(220) } };
  const BN_B = PHONE ? { x: 10, y: 10, w: 460, h: 96 } : { x: 14, y: 14, w: 380, h: 176 };
  const BN_D = PHONE ? { x: 10, y: 114, w: 460, h: 128 } : { x: 406, y: 14, w: 380, h: 176 };
  const BN_T = PHONE ? { x: 10, y: 250, w: 460, h: 372 } : { x: 14, y: 200, w: 772, h: 346 };
  const HR_COLS = PHONE ? 8 : 12;
  const CELL = PHONE ? { top: 40, rowH: 70, lab: 16, h: 25, step: 26 } : { top: 50, rowH: 80, lab: 16, h: 27, step: 28 };
  const cellR = (idx) => { const h = Math.floor(idx / 2), half = idx % 2, row = Math.floor(h / HR_COLS), col = h % HR_COLS, bw = (BN_T.w - 24) / HR_COLS; return { x: BN_T.x + 12 + col * bw + 2, y: BN_T.y + CELL.top + row * CELL.rowH + CELL.lab + half * CELL.step, w: bw - 4, h: CELL.h }; };
  const bnCnt = () => { const o = {}; AKEYS.forEach((k) => { o[k] = 0; }); S.bn.cells.forEach((c) => { o[c]++; }); return o; };
  const bnHours = (k) => bnCnt()[k] * 0.5;
  const bnBMR = () => S.bn.kg * 24;
  const bnAct = () => AKEYS.reduce((a, k) => a + (ACTS[k].met - 1) * S.bn.kg * bnHours(k), 0);
  const bnTEF = () => EX_INTAKE * 0.1;
  const bnTotal = () => bnBMR() + bnAct() + bnTEF();
  const bnExample = () => { const c = bnCnt(); return S.bn.kg === 60 && c.study === 12 && c.walk === 2 && c.run === 1 && c.bike === 0; };
  function bnClear() { S.bn.cells.fill('sleep'); updateCtl(); }
  function bnPaintAt(p) { for (let i = 0; i < 48; i++) if (inRect(p.x, p.y, cellR(i))) { if (S.bn.cells[i] !== S.bn.brush) { S.bn.cells[i] = S.bn.brush; Sound.tick(); updateCtl(); } return true; } return false; }
  function bnDraw(dt, t) {
    const b = S.bn;
    b.nums.bmr.set(bnBMR()); b.nums.act.set(bnAct()); b.nums.tef.set(bnTEF()); ['bmr', 'act', 'tef'].forEach((k) => b.nums[k].update(dt, 6));
    // 기초 대사량
    panel(BN_B.x, BN_B.y, BN_B.w, BN_B.h, 18, '#fff');
    T(BN_B.x + 14, BN_B.y + 26, '🛌 기초 대사량 (누워서 쉴 때 생명 유지에 쓰는 에너지)', L(15, 13), '#1f2d44', 'left', 800);
    if (!PHONE) { E('🧍', BN_B.x + 50, BN_B.y + 98, 52); T(BN_B.x + 50, BN_B.y + 158, b.kg + ' kg', 17, '#1f2d44', 'center', 800); }
    T(BN_B.x + (PHONE ? 14 : 110), BN_B.y + (PHONE ? 58 : 82), '체중 ' + b.kg + ' kg × 24 kcal', L(18, 16), '#475569', 'left', 800);
    T(BN_B.x + (PHONE ? 14 : 110), BN_B.y + (PHONE ? 86 : 122), '= ' + comma(b.nums.bmr.v) + ' kcal/일', L(26, 22), '#15803d', 'left', 800);
    // 소비 구성
    panel(BN_D.x, BN_D.y, BN_D.w, BN_D.h, 18, '#fff');
    const tot = bnTotal(), parts3 = [{ v: b.nums.bmr.v, col: '#6366f1', n: '기초 대사', val: bnBMR() }, { v: b.nums.act.v, col: '#f59e0b', n: '활동 대사', val: bnAct() }, { v: b.nums.tef.v, col: '#14b8a6', n: '식이 열 효과', val: bnTEF() }];
    const dcx = BN_D.x + (PHONE ? 70 : 90), dcy = BN_D.y + (PHONE ? 70 : 96), dR = PHONE ? 46 : 62;
    donut(dcx, dcy, dR, dR * 0.55, parts3);
    T(dcx, dcy - 2, '총 소비', 13, '#64748b', 'center', 700); T(dcx, dcy + 18, comma(b.nums.bmr.v + b.nums.act.v + b.nums.tef.v), 17, '#1f2d44', 'center', 800);
    T(BN_D.x + 14, BN_D.y + 22, '🔥 하루 소비 에너지 구성 (kcal)', L(15, 13), '#1f2d44', 'left', 800);
    parts3.forEach((q, i) => {
      const y = BN_D.y + (PHONE ? 52 : 62) + i * (PHONE ? 26 : 34), x = BN_D.x + (PHONE ? 140 : 180);
      D.roundRect(x, y - 11, 12, 12, 3); ctx.fillStyle = q.col; ctx.fill();
      T(x + 18, y, q.n + ' ' + comma(q.val) + ' (' + (tot > 0 ? Math.round(q.val / tot * 100) : 0) + ' %)', L(15, 13.5), '#334155', 'left', 700);
    });
    if (!PHONE) T(BN_D.x + 14, BN_D.y + 168, '식이 열 효과 = 예시 섭취 2200 kcal의 약 10 %', 13, '#64748b', 'left', 700);
    else T(BN_D.x + 140, BN_D.y + 122, '식이 열 효과: 예시 섭취 2200 kcal의 10 %', 13, '#64748b', 'left', 700);
    // 시간표
    panel(BN_T.x, BN_T.y, BN_T.w, BN_T.h, 18, '#fff');
    T(BN_T.x + 14, BN_T.y + 26, '📱 활동 기록 앱: 24시간 시간표 (한 칸 = 30분)', L(16, 14), '#1f2d44', 'left', 800);
    D.label(BN_T.x + BN_T.w - 76, BN_T.y + 22, ACTS[b.brush].icon + ' ' + ACTS[b.brush].name, { bg: ACTS[b.brush].tc, size: 13.5 });
    const bw = (BN_T.w - 24) / HR_COLS;
    for (let h = 0; h < 24; h++) { const r0 = cellR(h * 2); T(r0.x + r0.w / 2, r0.y - 5, h + '시', 13, '#64748b', 'center', 700); }
    for (let i = 0; i < 48; i++) { const r = cellR(i), a = ACTS[b.cells[i]]; D.roundRect(r.x, r.y, r.w, r.h, 5); ctx.fillStyle = a.col; ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.08)'; ctx.lineWidth = 1; ctx.stroke(); if (b.cells[i] !== 'sleep') E(a.icon, r.x + r.w / 2, r.y + r.h / 2 + 1, PHONE ? 14 : 17); }
    // 활동별 합계
    const cnt = bnCnt(), rows = AKEYS.filter((k) => k !== 'sleep' && cnt[k] > 0);
    const sy = BN_T.y + CELL.top + (PHONE ? 3 : 2) * CELL.rowH + 4;
    T(BN_T.x + 14, sy + 14, '활동 대사량 = (MET − 1) × 체중 × 시간', L(15, 13.5), '#334155', 'left', 800);
    rows.forEach((k, i) => {
      const a = ACTS[k], y = sy + (PHONE ? 33 : 36) + i * (PHONE ? 19 : 22), kc = (a.met - 1) * b.kg * bnHours(k);
      D.roundRect(BN_T.x + 14, y - 12, 12, 12, 3); ctx.fillStyle = a.col; ctx.fill(); ctx.strokeStyle = a.tc; ctx.lineWidth = 1; ctx.stroke();
      T(BN_T.x + 32, y, a.name + ': (' + a.met + ' − 1) × ' + b.kg + ' × ' + bnHours(k) + ' h = ' + comma(kc) + ' kcal', L(14.5, 13), '#334155', 'left', 700);
    });
    if (!rows.length) T(BN_T.x + 14, sy + 38, '아직 활동을 칠하지 않았어요 (수면·휴식은 MET 1.0이라 추가 에너지 0)', L(14, 13), '#94a3b8', 'left', 700);
    T(BN_T.x + BN_T.w - 14, sy + 14, '활동 대사량 합계 ' + comma(b.nums.act.v) + ' kcal', L(16, 14), '#b45309', 'right', 800);
    disc(BN_T.x + 14, BN_T.y + BN_T.h - L(10, 5), 'left');
  }
  const bnPT = {
    down(p) { if (bnPaintAt(p)) { S.bn.paint = true; return true; } return false; },
    move(p) { if (S.bn.paint) bnPaintAt(p); },
    up() { S.bn.paint = false; },
    hover(p) { for (let i = 0; i < 48; i++) if (inRect(p.x, p.y, cellR(i))) return 'crosshair'; return 'default'; },
  };

  /* =========================================================
     ④ 에너지 균형 : 천칭
     ========================================================= */
  const CASES = [
    { id: 'c1', name: '방학 내내 앉아서 간식', intake: 2500, spend: 2000, dir: 'in', body: 'fat', icon: '🛋️', why: '섭취 2500 > 소비 2000 (+500 kcal/일)이라 남는 에너지가 지방(중성 지방)으로 저장돼요.' },
    { id: 'c2', name: '운동선수의 고에너지 식단', intake: 4000, spend: 4000, dir: 'eq', body: 'keep', icon: '🏅', why: '많이 먹지만 소비도 많아서 균형(0)이에요. 소비량에 맞춘 섭취가 중요해요.' },
    { id: 'c3', name: '무리한 굶기', intake: 1000, spend: 2200, dir: 'out', body: 'use', icon: '🥗', why: '섭취 1000 < 소비 2200 (−1200 kcal/일)이라 저장 지방과 근육을 이용하고, 성장기에는 성장 · 발달을 해칠 수 있어요.' },
    { id: 'c4', name: '성장기 청소년', intake: 2700, spend: 2400, dir: 'in', body: 'grow', icon: '🌱', why: '섭취가 소비보다 조금 많은(+300) 에너지는 키가 크고 몸을 이루는 물질을 합성(동화)하는 데 쓰여요.' },
  ];
  const DIRL = { in: '섭취 > 소비', eq: '섭취 = 소비', out: '섭취 < 소비' };
  const BODYL = { fat: '남는 에너지가 지방으로 저장돼요', keep: '체중과 저장량이 그대로예요', use: '저장 지방 · 근육을 이용해요', grow: '성장(몸을 이루는 물질 합성)에 쓰여요' };
  S.bl = { intake: 2200, spend: 2200, ang: new SciSim.Spring(0, { stiffness: 60, damping: 9 }), nI: new Num(2200), nS: new Num(2200), kg: new Num(0), caseSel: null, seenCase: {} };
  const BL_L = PHONE ? { x: 10, y: 10, w: 460, h: 334 } : { x: 14, y: 14, w: 520, h: 532 };
  const BL_R = PHONE ? { x: 10, y: 352, w: 460, h: 280 } : { x: 546, y: 14, w: 240, h: 532 };
  const blDiff = () => S.bl.intake - S.bl.spend;
  const blKg = () => blDiff() * 30 / 7700;
  const blState = () => (Math.abs(blDiff()) <= 100 ? 'eq' : blDiff() > 0 ? 'in' : 'out');
  function blCase(id) { const c = CASES.find((q) => q.id === id); S.bl.intake = c.intake; S.bl.spend = c.spend; S.bl.caseSel = id; S.bl.seenCase[id] = true; $('#sIn').value = c.intake; $('#sOut').value = c.spend; Sound.click(); updateCtl(); }
  function blDraw(dt, t) {
    const b = S.bl, d = blDiff();
    b.ang.target = -clamp(d / 1500, -1, 1) * 0.3; b.ang.update(dt); b.nI.set(b.intake); b.nS.set(b.spend); b.kg.set(blKg()); b.nI.update(dt, 7); b.nS.update(dt, 7); b.kg.update(dt, 5);
    panel(BL_L.x, BL_L.y, BL_L.w, BL_L.h, 18, '#fff');
    const cx = BL_L.x + BL_L.w / 2, py = BL_L.y + (PHONE ? 74 : 110), Lb = PHONE ? 150 : 170, a = RM ? b.ang.target : b.ang.value;
    // 받침대
    ctx.fillStyle = '#94a3b8'; ctx.beginPath(); ctx.moveTo(cx - 8, py); ctx.lineTo(cx + 8, py); ctx.lineTo(cx + 22, py + (PHONE ? 130 : 168)); ctx.lineTo(cx - 22, py + (PHONE ? 130 : 168)); ctx.fill();
    D.roundRect(cx - 62, py + (PHONE ? 126 : 164), 124, 12, 6); ctx.fillStyle = '#64748b'; ctx.fill();
    // 보
    const ex = (s) => ({ x: cx + s * Lb * Math.cos(a), y: py + s * Lb * Math.sin(a) });
    const eL = ex(-1), eR = ex(1);
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(eL.x, eL.y); ctx.lineTo(eR.x, eR.y); ctx.stroke();
    D.sphere(cx, py, 11, '#f59e0b', { gloss: true, shadow: true });
    const pans = [{ e: eL, v: b.nI.v, nm: '섭취', col: '#16a34a', cubes: '#fb923c', icon: '🍽️' }, { e: eR, v: b.nS.v, nm: '소비', col: '#7c3aed', cubes: '#8b5cf6', icon: '🔥' }];
    const drop = PHONE ? 78 : 96, pw = PHONE ? 130 : 170;
    pans.forEach((pn) => {
      const px = pn.e.x, pyy = pn.e.y + drop;
      ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(pn.e.x, pn.e.y); ctx.lineTo(px - pw / 2, pyy); ctx.moveTo(pn.e.x, pn.e.y); ctx.lineTo(px + pw / 2, pyy); ctx.stroke();
      // 쌓인 에너지 칸 (1칸 = 250 kcal)
      const n = Math.round(clamp(pn.v, 0, 4500) / 250), cs = PHONE ? 15 : 19, per = PHONE ? 7 : 8;
      for (let i = 0; i < n; i++) { const col = i % per, row = Math.floor(i / per), xx = px - (per * cs) / 2 + col * cs, yy = pyy - 5 - cs * (row + 1) - 1; D.roundRect(xx + 1, yy, cs - 2, cs - 2, 3); ctx.fillStyle = pn.cubes; ctx.fill(); }
      D.roundRect(px - pw / 2, pyy - 5, pw, 12, 6); ctx.fillStyle = pn.col; ctx.fill();
      T(px, pyy + 30, pn.nm + ' ' + comma(pn.v) + ' kcal', L(17, 14), pn.col, 'center', 800);
    });
    T(BL_L.x + 14, BL_L.y + 24, '⚖️ 에너지 천칭 (한 칸 = 250 kcal)', L(16, 14), '#1f2d44', 'left', 800);
    // 저장 지방 눈금 (한 달 이론치)
    const gy = BL_L.y + BL_L.h - (PHONE ? 70 : 96), gw = BL_L.w - 56, gx = BL_L.x + 28;
    T(BL_L.x + 14, gy - 10, '한 달 동안 쌓이는 체지방 (이론치)', L(15, 13.5), '#334155', 'left', 800);
    D.roundRect(gx, gy + 2, gw, 18, 9); ctx.fillStyle = '#eef2f7'; ctx.fill();
    const mid = gx + gw / 2, kgv = clamp(b.kg.v, -12, 12), len = (gw / 2) * (Math.abs(kgv) / 12);
    if (len > 0.5) { ctx.fillStyle = kgv > 0 ? '#f59e0b' : '#3b82f6'; if (kgv > 0) { D.roundRect(mid, gy + 2, len, 18, 6); } else { D.roundRect(mid - len, gy + 2, len, 18, 6); } ctx.fill(); }
    ctx.fillStyle = '#475569'; ctx.fillRect(mid - 1, gy - 2, 2, 26);
    T(gx, gy + 40, '−12 kg', 13, '#64748b', 'left', 700); T(mid, gy + 40, '0', 13, '#64748b', 'center', 700); T(gx + gw, gy + 40, '+12 kg', 13, '#64748b', 'right', 700);
    T(BL_L.x + BL_L.w / 2, gy + (PHONE ? 58 : 68), (kgv >= 0 ? '+' : '−') + fix1(Math.abs(b.kg.v)) + ' kg ≈ ' + (d >= 0 ? '+' : '−') + comma(Math.abs(d) * 30) + ' kcal / 7700', L(16, 13.5), kgv > 0.05 ? '#b45309' : '#334155', 'center', 800);
    // 설명 패널
    panel(BL_R.x, BL_R.y, BL_R.w, BL_R.h, 18, '#fff');
    const st = blState(), col = st === 'eq' ? '#16a34a' : st === 'in' ? '#b45309' : '#2563eb';
    T(BL_R.x + 14, BL_R.y + 28, '에너지 균형 = 섭취 − 소비', L(15.5, 14), '#1f2d44', 'left', 800);
    T(BL_R.x + BL_R.w / 2, BL_R.y + (PHONE ? 66 : 76), (d > 0 ? '+' : d < 0 ? '−' : '') + comma(Math.abs(d)) + ' kcal/일', PHONE ? 24 : 27, col, 'center', 800);
    D.label(BL_R.x + BL_R.w / 2, BL_R.y + (PHONE ? 96 : 110), st === 'eq' ? '균형' : st === 'in' ? '섭취 > 소비' : '섭취 < 소비', { bg: col, size: 14.5 });
    const msg = st === 'eq' ? '섭취와 소비가 거의 같아요. 몸에 저장된 에너지가 거의 그대로예요.' : st === 'in' ? '남는 에너지는 지방(중성 지방)으로 저장돼요.' : '모자란 에너지는 저장 지방과 근육을 이용해 채워요. 성장기에는 성장 · 발달에 방해가 될 수 있어요.';
    textBlock(BL_R.x + 14, BL_R.y + (PHONE ? 126 : 150), BL_R.w - 28, msg, L(14.5, 13.5), '#334155', L(21, 19), 700);
    textBlock(BL_R.x + 14, BL_R.y + (PHONE ? 186 : 270), BL_R.w - 28, PHONE ? '체지방 1 kg ≈ 7700 kcal로 단순 환산한 이론치예요. 실제로는 소비도 변해서 훨씬 작아요.' : '체지방 1 kg ≈ 7700 kcal로 단순 환산한 이론치예요. 실제로는 소비도 함께 변해서 이보다 훨씬 작아요. (하루 +200 kcal가 1년 쌓이면 이론상 약 9.5 kg)', L(13.5, 13), '#64748b', L(19, 17.5), 700);
    if (PHONE) disc(BL_R.x + 14, BL_R.y + BL_R.h - 10, 'left');
    else { discBlock(BL_R.x + 14, BL_R.y + BL_R.h - 54, BL_R.w - 28); T(BL_R.x + 14, BL_R.y + BL_R.h - 12, '입력한 값은 저장하지 않아요.', 13, '#64748b', 'left', 700); }
  }

  /* =========================================================
     화면 전환 · 조작 연결
     ========================================================= */
  const PTS = { cal: clPT, meal: mlPT, burn: bnPT, bal: null };
  function setMode(m) { if (S.mode !== m) S.fade = 1; S.mode = m; PT = PTS[m] || null; hideHint(); updateCtl(); }
  const ctlNodes = $$('#ctrlCard .control');
  function updateCtl() {
    const fr = game ? game.free : false, lvNow = game ? game.level : 0;
    ctlNodes.forEach((n) => { n.hidden = (n.dataset.modes || '').split(' ').indexOf(S.mode) < 0; });
    modeButtons(S.mode, lvNow, fr);
    const f = FD[S.cal.sel];
    $('#clTitle').innerHTML = f.icon + ' <b>' + f.name + '</b>: 탄수화물 ' + gtxt(f.C) + ' g · 단백질 ' + gtxt(f.P) + ' g · 지방 ' + gtxt(f.F) + ' g';
    ['inC', 'inP', 'inF'].forEach((id, i) => { const k = ['C', 'P', 'F'][i]; $('#' + id).classList.toggle('ok', near(numIn(id), f.kc[k], 0.05)); });
    $('#clNote').innerHTML = S.cal.done[f.id] ? '✅ <b>' + gtxt(f.kcal) + ' kcal</b> 계산 완료! 다른 음식 카드를 눌러 보세요.' : '카드를 눌러 음식을 고르고, 영양소별 열량(g × kcal/g)을 입력해요.';
    $$('#mealSel button').forEach((b) => b.classList.toggle('on', b.dataset.v === S.ml.sel));
    $('#mlNote').innerHTML = '섭취 <b>' + comma(mlKcal()) + ' kcal</b> · 탄수화물 ' + mlPct().C + ' % · 단백질 ' + mlPct().P + ' % · 지방 ' + mlPct().F + ' %';
    $('#sKg').value = S.bn.kg; $('#oKg').textContent = S.bn.kg + ' kg';
    $$('#brushSel button').forEach((b) => b.classList.toggle('on', b.dataset.v === S.bn.brush));
    $('#inTot').classList.toggle('ok', near(numIn('inTot'), 2200, 0.5) && bnExample());
    $('#burnNote').innerHTML = '활동 대사량 <b>' + comma(bnAct()) + ' kcal</b> (MET: 수면 1 · 공부 1.5 · 걷기 3.5 · 자전거 6 · 달리기 8)';
    $('#oIn').textContent = comma(S.bl.intake) + ' kcal'; $('#oOut').textContent = comma(S.bl.spend) + ' kcal';
    $$('#balView button').forEach((b) => b.classList.toggle('on', b.dataset.v === S.bl.view));
    $$('[data-bv]').forEach((n) => { n.hidden = n.dataset.bv !== S.bl.view; });
    CASES.forEach((c) => { const sel = $('#' + c.id + 'd'), sb = $('#' + c.id + 'b'); sel.classList.toggle('ok', S.bl.caseOk && S.bl.caseOk[c.id]); sb.classList.toggle('ok', S.bl.caseOk && S.bl.caseOk[c.id]); $('#' + c.id + 'n').classList.toggle('on', S.bl.caseSel === c.id); });
  }
  bindModeSeg(setMode);
  ['inC', 'inP', 'inF'].forEach((id) => $('#' + id).addEventListener('input', clInput));
  $$('#mealSel button').forEach((b) => b.addEventListener('click', () => { S.ml.sel = b.dataset.v; Sound.click(); updateCtl(); }));
  $('#mlClear').addEventListener('click', () => { Sound.click(); mlClear(); });
  $('#sKg').addEventListener('input', (e) => { S.bn.kg = +e.target.value; updateCtl(); });
  $$('#brushSel button').forEach((b) => b.addEventListener('click', () => { S.bn.brush = b.dataset.v; Sound.click(); updateCtl(); }));
  $('#bnClear').addEventListener('click', () => { Sound.click(); bnClear(); });
  $('#inTot').addEventListener('input', updateCtl);
  $('#sIn').addEventListener('input', (e) => { S.bl.intake = +e.target.value; S.bl.caseSel = null; updateCtl(); });
  $('#sOut').addEventListener('input', (e) => { S.bl.spend = +e.target.value; S.bl.caseSel = null; updateCtl(); });
  S.bl.view = 'free';
  $$('#balView button').forEach((b) => b.addEventListener('click', () => { S.bl.view = b.dataset.v; Sound.click(); updateCtl(); }));
  CASES.forEach((c) => { $('#' + c.id + 'n').addEventListener('click', () => blCase(c.id)); $('#' + c.id + 'd').addEventListener('change', updateCtl); $('#' + c.id + 'b').addEventListener('change', updateCtl); });

  /* =========================================================
     미션
     ========================================================= */
  const levels = [
    {
      title: '영양소 열량', short: '영양소 열량', icon: '🍚', phase: '분석',
      intro: '<p class="si-q">❓ 탐구 질문: 하루 동안 내가 먹은 에너지와 쓴 에너지는 균형을 이룰까? 균형이 깨지면 몸에서는 무슨 일이 일어날까?</p><p>🔗 앞 차시에서 물질대사에는 <b>에너지 출입</b>이 따른다는 것을 알았어요. 이번 차시에서는 <b>음식으로 들어오는 에너지</b>와 <b>몸이 쓰는 에너지</b>를 직접 계산하고 비교해요.</p><p>먼저 식품 성분표(탄수화물 · 단백질 · 지방의 g)로 열량을 구해요. 탄수화물과 단백질은 <b>1 g당 4 kcal</b>, 지방은 <b>1 g당 9 kcal</b>예요. 모든 수치는 <b>교육용 예시</b>이고 입력한 값은 저장하지 않아요.</p>',
      features: ['cal'],
      setup() { setMode('cal'); },
      recap: '영양소의 열량은 탄수화물 · 단백질 1 g당 4 kcal, 지방 1 g당 9 kcal예요. 성분표의 g에 곱하고 더하면 음식의 열량이 나와요.',
      summary: '<ul><li><b>영양소 열량</b>: 탄수화물 4 kcal/g, 단백질 4 kcal/g, <b>지방 9 kcal/g</b>. 음식의 열량 = 4 × 탄수화물(g) + 4 × 단백질(g) + 9 × 지방(g).</li><li>예) 밥 1공기: 66 × 4 + 5.5 × 4 + 0.5 × 9 = 290.5 kcal, 햄버거 1개: 40 × 4 + 25 × 4 + 25 × 9 = 485 kcal.</li><li>같은 질량이면 지방의 열량이 탄수화물의 9 / 4 = <b>2.25배</b>예요.</li><li>이 차시의 수치는 모두 <b>학습용 예시</b>이며 개인 진단 · 식단 처방이 아니에요.</li></ul>',
      missions: [
        {
          id: 'kcal3', title: '세 음식의 열량 계산',
          goal: '식품 성분표를 보고 <b>밥 · 달걀 · 햄버거</b>의 열량을 영양소별로 계산해 입력하세요.',
          hint: '카드를 눌러 음식을 고르고, 탄수화물 g × 4, 단백질 g × 4, 지방 g × 9를 각각 입력해요. 예: 밥의 탄수화물 66 × 4 = 264.',
          setup() { S.cal.done = {}; FOODS.forEach((f) => S.cal.nums[f.id].snap(0)); $('#inC').value = ''; $('#inP').value = ''; $('#inF').value = ''; S.cal.sel = 'rice'; setMode('cal'); },
          check: () => S.cal.done.rice && S.cal.done.egg && S.cal.done.burger, hold: 0.6,
          status: () => mark(!!S.cal.done.rice) + ' 밥 &nbsp; ' + mark(!!S.cal.done.egg) + ' 달걀 &nbsp; ' + mark(!!S.cal.done.burger) + ' 햄버거',
          explain: '밥 = 264 + 22 + 4.5 = <b>290.5 kcal</b>, 달걀 = 2 + 26 + 45 = <b>73 kcal</b>, 햄버거 = 160 + 100 + 225 = <b>485 kcal</b>예요. 영양소별로 곱한 값을 더하면 음식의 열량이 돼요.',
        },
        {
          type: 'quiz', title: '지방의 열량',
          goal: '같은 질량일 때 <b>지방</b>의 열량은 <b>탄수화물</b>의 몇 배일까요?',
          setup() { setMode('cal'); },
          choices: ['같다', '약 2배보다 작다 (1.5배)', '2.25배 (지방 1 g = 9 kcal, 탄수화물 1 g = 4 kcal)', '4배'],
          answer: 2,
          feedback: ['지방은 1 g에 9 kcal, 탄수화물은 4 kcal로 달라요.', '9 / 4 = 2.25로 계산해 보세요.', '', '9 / 4는 4가 아니에요.'],
          explain: '지방 1 g은 9 kcal, 탄수화물 1 g은 4 kcal이므로 9 / 4 = <b>2.25배</b>예요. 그래서 햄버거처럼 지방이 많은 음식은 같은 무게라도 열량이 높아요.',
        },
      ],
    },
    {
      title: '하루 섭취', short: '하루 섭취', icon: '🍱', phase: '기록',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 음식의 열량을 영양소 g으로 계산했어요.</div><p>이제 <b>디지털 식단 기록 앱</b>처럼 아침 · 점심 · 간식 · 저녁 칸에 음식을 담아 하루 <b>섭취 에너지</b>와 <b>영양소 비율</b>을 실시간으로 확인해요. 한국인 영양소 섭취기준의 에너지 적정 비율은 대략 <b>탄수화물 55~65 %, 단백질 7~20 %, 지방 15~30 %</b>예요.</p>',
      features: ['meal'],
      setup() { setMode('meal'); },
      recap: '하루 섭취 에너지는 먹은 음식의 열량을 모두 더한 값이고, 탄수화물 · 단백질 · 지방의 에너지 비율이 적정 범위에 있는 것이 균형 잡힌 식사의 기준이에요.',
      summary: '<ul><li>하루 섭취 에너지 = 먹은 음식 열량의 합. 예시 하루 식단: 약 <b>2200 kcal</b>.</li><li>에너지 적정 비율(개략): <b>탄수화물 55~65 %, 단백질 7~20 %, 지방 15~30 %</b>. 비율은 각 영양소의 kcal ÷ 전체 kcal로 구해요.</li><li>콜라 · 햄버거 중심의 식단은 <b>지방과 당류</b>의 에너지 비율을 높여요.</li><li>식단 기록 앱 같은 디지털 도구로 섭취량을 쉽게 합산하고 비교할 수 있어요.</li></ul>',
      missions: [
        {
          id: 'plan', title: '하루 약 2200 kcal 식단',
          goal: '네 칸에 음식을 담아 하루 섭취가 <b>2200 ± 100 kcal</b>가 되게 하세요.',
          hint: '예: 아침 밥 + 달걀 · 우유, 점심 밥 2공기 + 닭가슴살, 간식 바나나 + 우유, 저녁 밥 + 달걀 + 닭가슴살 등으로 담아 합계를 맞춰 보세요. 음식은 여러 번 담을 수 있어요.',
          setup() { mlClear(); setMode('meal'); },
          check: () => mlKcal() >= 2100 && mlKcal() <= 2300, hold: 0.8,
          status: () => mark(mlKcal() >= 2100 && mlKcal() <= 2300) + ' 섭취 ' + comma(mlKcal()) + ' kcal (목표 2100~2300)',
          explain: '음식의 열량을 모두 더하면 하루 섭취 에너지가 돼요. 앱이 자동으로 합산해 주지만, 음식마다 열량이 달라서 같은 개수를 먹어도 합계는 크게 달라질 수 있어요.',
        },
        {
          id: 'ratio', title: '탄수화물 비율 맞추기',
          goal: '섭취가 <b>2200 ± 100 kcal</b>인 채로 <b>탄수화물 비율을 55~65 %</b> 안에 두세요.',
          hint: '탄수화물 비율이 낮으면 밥 · 식빵 · 바나나를 늘리고, 높으면 달걀 · 우유 · 닭가슴살을 섞어요. 예: 밥 4 · 우유 1 · 식빵 1 · 닭가슴살 2 · 햄버거 1(약 2206 kcal, 탄수화물 64 %).',
          setup() { mlClear(); setMode('meal'); },
          check: () => mlKcal() >= 2100 && mlKcal() <= 2300 && mlPct().C >= 55 && mlPct().C <= 65, hold: 0.8,
          status: () => mark(mlKcal() >= 2100 && mlKcal() <= 2300) + ' 섭취 ' + comma(mlKcal()) + ' kcal &nbsp; ' + mark(mlPct().C >= 55 && mlPct().C <= 65) + ' 탄수화물 ' + mlPct().C + ' %',
          explain: '탄수화물이 에너지의 55~65 %를 차지하도록 곡류 · 과일을 중심으로 하고, 단백질(7~20 %)과 지방(15~30 %)도 적정 범위에 두는 것이 균형 잡힌 식단의 기준이에요.',
        },
        {
          type: 'quiz', title: '콜라와 햄버거 식단',
          goal: '콜라와 햄버거 중심으로 먹으면 <b>높아지는</b> 것은?',
          setup() { setMode('meal'); },
          choices: ['단백질 에너지 비율만 크게 높아진다', '지방과 당류(탄수화물)에서 오는 에너지 비율이 높아진다', '비타민 섭취량이 크게 는다', '소비 에너지가 저절로 늘어난다'],
          answer: 1,
          feedback: ['햄버거는 단백질도 있지만 지방이 더 많아요.', '', '비타민은 열량 계산과 관계가 없어요.', '먹는다고 소비가 저절로 늘지 않아요.'],
          explain: '햄버거는 지방 25 g(225 kcal)이 에너지의 약 46 %를 차지하고, 콜라는 열량이 모두 당류(탄수화물)예요. 이런 식단은 영양소 비율이 한쪽으로 치우치기 쉬워요.',
        },
      ],
    },
    {
      title: '하루 소비', short: '하루 소비', icon: '🏃', phase: '탐구',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 하루 섭취 에너지를 기록했어요.</div><p>몸이 하루에 쓰는 에너지는 <b>기초 대사량 + 활동 대사량 + 식이 열 효과</b>예요. 기초 대사량은 체중 × 24 kcal, 활동 대사량은 <b>(MET − 1) × 체중 × 시간</b>으로 구해요. 24시간 시간표에 활동을 칠해 계산해 봐요. (식이 열 효과는 예시 섭취 2200 kcal의 약 10 %로 계산해요.)</p>',
      features: ['burn'],
      setup() { setMode('burn'); },
      recap: '하루 소비 에너지 = 기초 대사량(체중 × 24) + 활동 대사량((MET − 1) × 체중 × 시간) + 식이 열 효과(섭취의 약 10 %)예요. 체중이 클수록 같은 활동에서 더 많이 써요.',
      summary: '<ul><li><b>기초 대사량</b> ≈ 체중(kg) × 24 kcal/일 (체중 60 kg → 1440 kcal). 생명 유지에 쓰는 에너지 (소비의 약 65 %).</li><li><b>활동 대사량</b> = (MET − 1) × 체중 × 시간. MET: 앉아 공부 1.5, 걷기 3.5, 자전거 6, 달리기 8 (소비의 약 25 %).</li><li><b>식이 열 효과</b> ≈ 섭취 에너지의 약 10 % (음식을 소화 · 흡수 · 저장하는 데 드는 에너지).</li><li>예시 하루(60 kg): 1440 + 540 + 220 = <b>2200 kcal</b>. 활동 대사량은 체중에 비례해요.</li></ul>',
      missions: [
        {
          id: 'act', title: '활동 대사량 540 kcal 만들기',
          goal: '체중을 <b>60 kg</b>으로 맞추고 시간표에 <b>앉아 공부 6시간 · 걷기 1시간 · 달리기 0.5시간</b>을 칠하세요.',
          hint: '아래 활동 버튼을 고르고 시간표 칸을 끌어서 칠해요. 한 칸은 30분이라 앉아 공부 12칸, 걷기 2칸, 달리기 1칸이에요.',
          setup() { S.bn.kg = 60; $('#sKg').value = 60; bnClear(); $('#inTot').value = ''; setMode('burn'); },
          check: () => bnExample() && Math.round(bnAct()) === 540, hold: 0.8,
          status: () => mark(S.bn.kg === 60) + ' 체중 60 kg &nbsp; ' + mark(bnExample()) + ' 공부 ' + bnHours('study') + ' h · 걷기 ' + bnHours('walk') + ' h · 달리기 ' + bnHours('run') + ' h &nbsp; ' + mark(Math.round(bnAct()) === 540) + ' 활동 ' + comma(bnAct()) + ' kcal',
          explain: '앉아 공부 (1.5 − 1) × 60 × 6 = 180, 걷기 (3.5 − 1) × 60 × 1 = 150, 달리기 (8 − 1) × 60 × 0.5 = 210이고 합은 <b>540 kcal</b>예요.',
        },
        {
          id: 'total', title: '하루 총 소비 완성',
          goal: '기초 대사량 1440 + 활동 대사량 540 + 식이 열 효과 220을 더해 <b>총 소비</b>를 입력하세요.',
          hint: '1440 + 540 + 220 = ? 오른쪽 위 도넛에 각 값이 적혀 있어요.',
          setup() { $('#inTot').value = ''; setMode('burn'); },
          check: () => near(numIn('inTot'), 2200, 0.5) && bnExample(), hold: 0.6,
          status: () => mark(bnExample()) + ' 예시 하루 시간표 &nbsp; ' + mark(near(numIn('inTot'), 2200, 0.5)) + ' 총 소비 입력',
          explain: '1440 + 540 + 220 = <b>2200 kcal</b>예요. 기초 대사량이 약 65 %, 활동 대사량이 약 25 %, 식이 열 효과가 약 10 %를 차지해요. 앞에서 만든 2200 kcal 식단과 같은 값이라 균형이 0이 돼요.',
        },
        {
          type: 'quiz', title: '체중과 활동 대사량',
          goal: '같은 운동을 같은 시간 해도 <b>체중이 큰 사람</b>이 더 많은 에너지를 쓰는 까닭은?',
          setup() { setMode('burn'); },
          choices: ['MET 값이 체중에 따라 달라지기 때문이다', '활동 대사량이 체중에 비례하기 때문이다 ((MET − 1) × 체중 × 시간)', '기초 대사량이 줄어들기 때문이다', '식이 열 효과가 없어지기 때문이다'],
          answer: 1,
          feedback: ['MET는 활동의 세기를 나타내는 값이라 체중과 관계없이 같아요.', '', '체중이 크면 기초 대사량도 커져요.', '식이 열 효과는 섭취량에 따라 달라져요.'],
          explain: '활동 대사량 = (MET − 1) × <b>체중</b> × 시간이므로 체중에 비례해요. 체중 60 kg에서 540 kcal인 활동이 체중 80 kg에서는 540 × 80 / 60 = 720 kcal가 돼요.',
        },
      ],
    },
    {
      title: '에너지 균형', short: '에너지 균형', icon: '⚖️', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 하루 섭취와 소비를 각각 계산했어요.</div><p>이제 두 값을 <b>천칭</b>으로 비교해요. <b>에너지 균형 = 섭취 − 소비</b>예요. 섭취가 더 많으면 남는 에너지가 <b>지방</b>으로 저장되고, 더 적으면 저장 지방과 근육을 이용해요. 체지방 1 kg ≈ 7700 kcal로 단순 환산한 <b>이론치</b>를 함께 보여 줘요.</p>',
      features: ['bal'],
      setup() { setMode('bal'); },
      recap: '에너지 균형 = 섭취 − 소비예요. 섭취가 많으면 지방으로 저장되고 적으면 저장 지방 · 근육을 써요. 균형 있는 섭취는 적게 먹는 것이 아니라 소비량과 영양소 비율에 맞추는 것이에요.',
      summary: '<ul><li><b>에너지 균형 = 섭취 − 소비</b>. 0이면 균형, 양수이면 남는 에너지가 <b>지방(중성 지방)</b>으로 저장, 음수이면 <b>저장 지방 · 근육</b>을 이용(성장기에는 성장 · 발달에 방해).</li><li>+500 kcal/일 → 한 달 15000 kcal ≈ 약 1.9 kg(이론치, 체지방 1 kg ≈ 7700 kcal). 실제로는 소비도 변해서 이보다 훨씬 작아요.</li><li>섭취 에너지가 같아도 <b>활동량</b>이 달라지면 균형이 달라져요. 운동선수는 많이 먹어도 소비가 많아 균형일 수 있어요.</li><li><b>균형 잡힌 섭취</b> = 소비량에 맞는 에너지 + 알맞은 영양소 비율. 단순히 적게 먹는 것이 아니에요.</li></ul>',
      missions: [
        {
          id: 'plus500', title: '섭취가 500 kcal 더 많을 때',
          goal: '<b>🎚 직접 맞추기</b>에서 섭취를 소비보다 <b>500 kcal 많게</b> 하고, 저장되는 양을 확인하세요.',
          hint: '소비를 2200 kcal 그대로 두고 섭취를 2700 kcal로 올려요. 천칭이 섭취 쪽으로 기울어요.',
          setup() { S.bl.view = 'free'; S.bl.intake = 2200; S.bl.spend = 2200; S.bl.caseSel = null; $('#sIn').value = 2200; $('#sOut').value = 2200; setMode('bal'); },
          check: () => blDiff() === 500, hold: 0.8,
          status: () => mark(blDiff() === 500) + ' 균형 ' + (blDiff() >= 0 ? '+' : '−') + comma(Math.abs(blDiff())) + ' kcal/일 &nbsp; 한 달 이론치 ' + (blKg() >= 0 ? '+' : '−') + fix1(Math.abs(blKg())) + ' kg',
          explain: '+500 kcal/일이 한 달(30일) 쌓이면 15000 kcal이고, 체지방 1 kg ≈ 7700 kcal로 환산하면 약 <b>1.9 kg</b>(이론치)예요. 남는 에너지는 <b>지방(중성 지방)</b>으로 저장돼요. 실제로는 소비도 함께 변해서 이보다 훨씬 작아요.',
        },
        {
          id: 'cases', title: '균형 점검 사례 카드', manual: true,
          goal: '<b>🗂 사례 카드</b> 4장의 천칭 방향과 몸의 변화를 예측해 고르세요.',
          hint: '사례 이름을 누르면 천칭이 그 값으로 기울어요. 성장기에는 남는 에너지가 몸을 키우는 데도 쓰여요.',
          setup() { S.bl.view = 'case'; S.bl.caseOk = {}; CASES.forEach((c) => { $('#' + c.id + 'd').value = ''; $('#' + c.id + 'b').value = ''; }); S.bl.seenCase = {}; setMode('bal'); },
          check() {
            S.bl.caseOk = {};
            const miss = CASES.filter((c) => !$('#' + c.id + 'd').value || !$('#' + c.id + 'b').value);
            if (miss.length) return '네 사례의 천칭 방향과 몸의 변화를 모두 골라 주세요. (' + miss[0].name + ')';
            if (CASES.some((c) => !S.bl.seenCase[c.id])) return '사례 이름을 눌러 천칭을 모두 확인해 보세요.';
            const bad = CASES.filter((c) => $('#' + c.id + 'd').value !== c.dir || $('#' + c.id + 'b').value !== c.body);
            CASES.forEach((c) => { if (!bad.includes(c)) S.bl.caseOk[c.id] = true; });
            updateCtlSoft();
            if (bad.length) { const c = bad[0]; return '\'' + c.name + '\' 사례를 다시 생각해 보세요. 천칭이 어느 쪽으로 기우는지 먼저 확인해요.'; }
            return true;
          },
          explain: CASES.map((c) => '<b>' + c.name + '</b>: ' + c.why).join('<br>'),
        },
        {
          type: 'quiz', title: '균형 잡힌 섭취란?',
          goal: '<b>균형 잡힌 에너지 섭취</b>를 가장 알맞게 설명한 것은?',
          setup() { setMode('bal'); },
          choices: ['무조건 적게 먹는 것', '소비량에 맞는 에너지를 알맞은 영양소 비율로 먹는 것', '좋아하는 음식만 먹는 것', '섭취 에너지가 같으면 활동량과 관계없이 균형이다'],
          answer: 1,
          feedback: ['너무 적게 먹으면 저장 지방과 근육을 쓰고 성장기에는 성장이 방해돼요.', '', '영양소 비율이 치우치면 균형 잡힌 식사가 아니에요.', '같은 섭취라도 활동량이 달라지면 소비가 달라져 균형이 달라져요.'],
          explain: '에너지 균형은 섭취와 <b>소비</b>를 함께 봐야 해요. 운동량이 많은 사람은 더 먹어야 균형이고, 같은 섭취라도 활동량이 달라지면 균형이 달라져요. 영양소 비율(탄수화물 55~65 % 등)도 중요해요. 남는 에너지는 지방으로 저장돼요.',
        },
      ],
    },
  ];
  function updateCtlSoft() { /* 확인 후 표시만 갱신 */ CASES.forEach((c) => { const ok = S.bl.caseOk && S.bl.caseOk[c.id]; $('#' + c.id + 'd').classList.toggle('ok', !!ok); $('#' + c.id + 'b').classList.toggle('ok', !!ok); }); }

  game = SciSim.game({
    simId: 'hy-energy-balance', mount: '#game', badge: '에너지 계산왕', homeHref: '../../index.html#hy',
    featureLabels: { cal: '🔎 식품 성분표 · 열량 계산', meal: '📱 하루 식단 기록', burn: '🏃 기초 · 활동 대사량 시간표', bal: '⚖️ 에너지 천칭' },
    onFeatures() { updateCtl(); },
    levels,
  });

  function readouts() {
    const m = S.mode;
    if (m === 'cal') { const f = FD[S.cal.sel]; setReads(['고른 음식', f.short, '열량', S.cal.done[f.id] ? gtxt(f.kcal) + ' kcal' : '계산 전', '계산한 음식', clDone() + ' / 8']); }
    else if (m === 'meal') setReads(['섭취 에너지', comma(mlKcal()) + ' kcal', '탄수화물 비율', mlPct().C + ' %', '담은 음식', mlCount() + '개']);
    else if (m === 'burn') setReads(['기초 대사량', comma(bnBMR()) + ' kcal', '활동 대사량', comma(bnAct()) + ' kcal', '총 소비', comma(bnTotal()) + ' kcal']);
    else setReads(['섭취 − 소비', (blDiff() > 0 ? '+' : blDiff() < 0 ? '−' : '') + comma(Math.abs(blDiff())) + ' kcal', '한 달 이론치', (blKg() > 0.04 ? '+' : blKg() < -0.04 ? '−' : '') + fix1(Math.abs(blKg())) + ' kg', '상태', blState() === 'eq' ? '균형' : blState() === 'in' ? '섭취 > 소비' : '섭취 < 소비']);
  }

  setMode('cal');
  let lastFree = false, lastLv = -1;
  SciSim.loop((dt, t) => {
    clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (game && game.level !== lastLv) { lastLv = game.level; updateCtl(); }
    view.apply(); FX.update(dt); ctx.clearRect(0, 0, VW, VH);
    bgFill('#f2f6f0', '#e7eee5');
    if (S.mode === 'cal') clDraw(dt, t); else if (S.mode === 'meal') mlDraw(dt, t); else if (S.mode === 'burn') bnDraw(dt, t); else blDraw(dt, t);
    FX.draw(); parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(241,246,243,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : approach(S.fade, 0, dt, 9); }
    readouts();
  });

  window.__sim = { S, VW, VH, PHONE, get game() { return game; }, levels, setMode, FOODS, FD, CASES, clSelect, clInput, mlAdd, mlClear, mlKcal, mlPct, mlTotals, bnCnt, bnAct, bnExample, bnClear, blCase, blDiff, blKg, updateCtl, trayR, slotR, cellR, itemR };
})();
