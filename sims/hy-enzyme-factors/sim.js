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
     고등학교 세포와 물질대사 · Ⅱ. 물질대사와 에너지 - 효소 활성 실험 설계 (단원 57, 4차시)
     성취기준 [12세포02-03] 효소의 종류와 특성을 이해하고 효소의 활성에 영향을 미치는 요인에 대한 실험을 설계하여 수행할 수 있다.
     ① 탐구: 종류와 특성  ② 탐구: 실험 설계  ③ 실험: 실험 수행  ④ 분석: 결과 분석
     ========================================================= */
  const S = { mode: 'kinds', sub: 'sort', aSub: 'shape', fade: 0 };
  let game = null;

  /* ---------- 자료 ---------- */
  const TYPES = [
    { id: 'redox', name: '산화·환원 효소', def: '전자·수소를 옮겨요', col: '#ef6a3c' },
    { id: 'trans', name: '전이 효소', def: '작용기를 다른 분자로 옮겨요', col: '#0ea5e9' },
    { id: 'hydro', name: '가수분해 효소', def: '물을 이용해 분해해요', col: '#16a34a' },
    { id: 'lyase', name: '분해(제거) 효소', def: '물을 쓰지 않고 분해해요', col: '#a855f7' },
    { id: 'isom', name: '이성질화 효소', def: '분자 모양만 바꿔요', col: '#d98a06' },
    { id: 'ligase', name: '연결(합성) 효소', def: 'ATP를 써서 두 분자를 이어요', col: '#e11d74' },
  ];
  const ENZ = [
    { id: 'catalase', label: '카탈레이스', short: '카탈레이스', sub: 'H₂O₂ → 물 + 산소', ans: 'redox' },
    { id: 'dehydro', label: '탈수소 효소', short: '탈수소 효소', sub: '기질에서 수소를 뗌', ans: 'redox' },
    { id: 'kinase', label: '인산기 전달 키네이스', short: '키네이스', sub: 'ATP의 인산기를 옮김', ans: 'trans' },
    { id: 'transam', label: '아미노기 전달 효소', short: '아미노기 전달', sub: '아미노기를 옮김', ans: 'trans' },
    { id: 'amylase', label: '아밀레이스', short: '아밀레이스', sub: '물로 녹말 분해', ans: 'hydro' },
    { id: 'protease', label: '프로테이스', short: '프로테이스', sub: '물로 단백질 분해', ans: 'hydro' },
    { id: 'lipase', label: '라이페이스', short: '라이페이스', sub: '물로 지방 분해', ans: 'hydro' },
    { id: 'aldolase', label: '알돌레이스', short: '알돌레이스', sub: '당을 물 없이 쪼갬', ans: 'lyase' },
    { id: 'decarb', label: '탈탄산 효소', short: '탈탄산 효소', sub: 'CO₂를 떼어 냄', ans: 'lyase' },
    { id: 'gluiso', label: '포도당 이성질화 효소', short: '포도당 이성질화', sub: '포도당 → 과당(모양)', ans: 'isom' },
    { id: 'dnaligase', label: 'DNA 연결 효소', short: 'DNA 연결', sub: 'DNA 두 조각을 이음', ans: 'ligase' },
    { id: 'glnsyn', label: '글루타민 합성 효소', short: '글루타민 합성', sub: 'ATP로 분자 둘 연결', ans: 'ligase' },
  ];
  const TFS = [
    { a: 'X', why: '효소는 반응 전후에 변하지 않아서 다시 쓰여요. 소모되지 않아요.' },
    { a: 'O', why: '효소는 소량으로도 같은 반응을 되풀이해서 많은 기질을 처리해요.' },
    { a: 'X', why: '펩신은 pH 2 근처, 아밀레이스는 pH 7 근처, 트립신은 pH 8 근처에서 가장 잘 작용해요. 효소마다 달라요.' },
    { a: 'O', why: '효소는 평형에 빨리 도달하게 할 뿐이에요. 생성물의 양을 늘리지는 않아요.' },
    { a: 'O', why: '활성 부위의 모양과 맞는 기질에만 결합해요(기질 특이성).' },
    { a: 'X', why: '효소는 적절한 조건이면 시험관에서도 작용해요. 간 즙의 카탈레이스가 그 예예요.' },
  ];
  const IVS = {
    temp: { name: '온도', unit: '°C', vals: [0, 10, 20, 30, 37, 45, 55, 65], data: [1.0, 3.5, 6.0, 8.8, 10.0, 7.0, 2.5, 0.3], x0: 0, x1: 70, xt: [0, 20, 40, 60], base: 37 },
    ph: { name: 'pH', unit: '', vals: [3, 5, 7, 9, 11], data: [1.5, 6.0, 10.0, 6.5, 1.5], x0: 2, x1: 12, xt: [3, 5, 7, 9, 11], base: 7 },
    enz: { name: '효소(간 즙) 농도', unit: '%', vals: [0, 25, 50, 75, 100], data: [0, 2.5, 5.0, 7.5, 10.0], x0: 0, x1: 100, xt: [0, 25, 50, 75, 100], base: 100 },
    sub: { name: '기질(H₂O₂) 농도', unit: '%', vals: [0.5, 1, 2, 3, 4, 6], data: [4.0, 6.5, 8.5, 9.5, 9.8, 10.0], x0: 0, x1: 6.5, xt: [0, 2, 4, 6], base: 3 },
  };
  const IV_ICON = { temp: '🌡', ph: '🧫', enz: '🥩', sub: '💧' };
  const CTL = { sub: '기질(H₂O₂) 농도', enz: '효소(간 즙)의 양', temp: '온도', ph: 'pH', vol: '용액의 부피', time: '측정 시간' };
  const OFFS = [[2, -3, 1], [-2, 3, -1], [3, -1, -2], [-1, 2, -1]];   // 10분의 1 mL 단위, 합이 0이라 평균이 표의 값과 같아요
  const fv = (v) => (Math.round(v * 10) / 10).toFixed(1);
  const valTxt = (iv, v) => (iv === 'ph' ? 'pH ' + v : v + (IVS[iv].unit === '%' ? ' %' : ' °C'));

  /* =========================================================
     ① 종류와 특성
     ========================================================= */
  function sortGeo() {
    if (PHONE) {
      const boxes = TYPES.map((t, i) => ({ id: t.id, label: t.name, col: t.col, def: t.def, x: 8 + (i % 2) * 236, y: 6 + Math.floor(i / 2) * 102, w: 228, h: 98, cols: 2, hdr: 42 }));
      return { boxes, tray: (i) => ({ x: 8 + (i % 2) * 236, y: 340 + Math.floor(i / 2) * 43 }), cw: 228, ch: 39, kh: 22 };
    }
    const boxes = TYPES.map((t, i) => ({ id: t.id, label: t.name, col: t.col, def: t.def, x: 14 + (i % 3) * 262, y: 10 + Math.floor(i / 3) * 116, w: 248, h: 108, cols: 2, hdr: 44 }));
    return { boxes, tray: (i) => ({ x: 14 + (i % 3) * 261, y: 262 + Math.floor(i / 3) * 47 }), cw: 250, ch: 42, kh: 26 };
  }
  function makeSorter() {
    const g = sortGeo();
    g.boxes.forEach((b) => { b.draw = (bb) => TF(bb.x + bb.w / 2, bb.y + 37, bb.def, bb.w - 14, 12.5, 10.5, C.shade(bb.col, -0.4), 'center', 700); });
    S.so = new Sorter({
      cards: ENZ.map((e) => ({ id: e.id, label: e.label, short: e.short, sub: e.sub, col: TYPES.find((t) => t.id === e.ans).col })),
      boxes: g.boxes, tray: g.tray, cw: g.cw, ch: g.ch, kh: g.kh,
      onTap: (c) => { S.soSel = S.soSel === c ? null : c; Sound.tick(); },
      onChange: () => { S.soSel = null; rlast = ''; updateCtl(); },
      isSel: (c) => S.soSel === c,
    });
    S.soSel = null;
  }
  const soRight = () => S.so.cards.filter((c) => c.zone && c.zone === ENZ.find((e) => e.id === c.id).ans).length;
  function soReset() {
    // 카드를 섞어 처음 위치에 다시 놓기
    const rnd = mulberry(1234 + (S.soShuffle = (S.soShuffle || 0) + 1));
    const order = ENZ.map((e, i) => i).sort(() => rnd() - 0.5);
    S.so.cards.forEach((c) => { c.zone = null; c.bad = false; c.sel = false; });
    S.so.cards.forEach((c, k) => { const slot = order.indexOf(k); const p = sortGeo().tray(slot); c.home = p; });
    S.so.drag = null; S.soSel = null; S.so.layout(true); rlast = ''; updateCtl();
  }
  function sortDraw(dt, t) {
    const so = S.so; so.update(dt);
    so.drawBoxes();
    const ty = PHONE ? 328 : 254;
    T(PHONE ? 10 : 16, ty, '효소 카드를 끌어서 반응 유형 상자에 넣어요', L(14, 13), '#475569', 'left', 800);
    so.drawCards();
    if (S.soSel && !so.drag) { const c = S.soSel; D.ring(c.x + c.w / 2, c.y + c.h / 2, Math.max(c.w, c.h) * 0.36, t, { color: '#f59e0b' }); }
    if (!PHONE) {
      panel(14, 452, 772, 94, 14, '#fffdf7');
      T(30, 480, '💡 효소 이름은 보통 -ase(-아제)로 끝나요.', 14, '#475569', 'left', 800);
      T(30, 504, '💡 카드의 아랫줄(반응 설명)이 단서예요. 물이 쓰이는지, 무엇을 옮기는지 살펴봐요.', 14, '#475569', 'left', 800);
      T(30, 528, '분류한 카드 ' + so.placed + ' / 12   ·   맞게 놓은 카드 ' + soRight() + ' / ' + so.placed, 14.5, '#166534', 'left', 800);
    } else {
      T(10, 626, '분류 ' + so.placed + ' / 12  ·  맞게 놓은 카드 ' + soRight(), 13, '#166534', 'left', 800);
    }
  }
  const soPT = {
    down(p) {
      const so = S.so;
      if (S.soSel) {
        const hit = so.cards.some((c) => inRect(p.x, p.y, c));
        const b = so.boxAt(p);
        if (b && !hit) { const c = S.soSel; S.soSel = null; so.place(c, b.id); return true; }
      }
      return so.down(p);
    },
    move(p) { S.so.move(p); },
    up(p) { S.so.up(p); },
    hover(p) { return S.so.hover(p); },
  };

  /* ---------- 기질 특이성 미니 영상 ---------- */
  S.dm = { enz: 'amy', sub: 'starch', ph: 'idle', t: 0, n: 0, tried: {}, match: false, lead: 0, rest: 0, mark: 0, glow: 0 };
  const DM = () => (PHONE
    ? { P: { x: 10, y: 10, w: 460, h: 300 }, cx: 160, cy: 168, r: 78, sx: 398, sc: 0.78, B: { x: 10, y: 320, w: 460, h: 312 } }
    : { P: { x: 14, y: 14, w: 772, h: 330 }, cx: 240, cy: 186, r: 108, sx: 700, sc: 1, B: { x: 14, y: 354, w: 772, h: 192 } });
  const dmMatch = (d) => (d.enz === 'amy' && d.sub === 'starch') || (d.enz === 'pro' && d.sub === 'protein');
  function dmGo() {
    const d = S.dm; if (d.ph !== 'idle') return false;
    d.ph = 'in'; d.t = 0; d.match = dmMatch(d); d.mark = 0; Sound.tick(); updateCtl(); return true;
  }
  function dmStep(dt) {
    const d = S.dm; if (d.ph === 'idle') { d.glow = approach(d.glow, 0, dt, 3); return; }
    d.t += dt * (RM ? 8 : 1);
    const durs = { in: 1.2, bind: 0.5, split: 0.7, out: 1.1, bounce: 1.0 };
    if (d.t >= durs[d.ph]) {
      d.t = 0;
      if (d.ph === 'in') d.ph = d.match ? 'bind' : 'bounce';
      else if (d.ph === 'bind') { d.ph = 'split'; Sound.success(); const g = DM(); parts.burst(g.cx + g.r * 0.9 * g.sc, g.cy, { count: 12, colors: ['#facc15', '#fff', '#86efac'], speed: 90, life: 0.6, gravity: 0 }); }
      else if (d.ph === 'split') d.ph = 'out';
      else if (d.ph === 'out') { d.ph = 'idle'; d.n++; d.tried[d.enz + d.sub] = 'ok'; d.glow = 1; updateCtl(); }
      else if (d.ph === 'bounce') { d.ph = 'idle'; d.tried[d.enz + d.sub] = 'no'; updateCtl(); }
      if (d.ph === 'bounce') { Sound.fail(); d.mark = 1; }
    }
  }
  function dmUnit(kind, x, y, r, a) {
    if (kind === 'starch') D.sphere(x, y, r, '#8bc34a', { gloss: true, shadow: true });
    else {
      ctx.save(); ctx.translate(x, y); ctx.rotate(Math.PI / 4 + (a || 0));
      D.shadow(() => { D.roundRect(-r * 0.85, -r * 0.85, r * 1.7, r * 1.7, r * 0.25); const g = ctx.createLinearGradient(-r, -r, r, r); g.addColorStop(0, '#fcd34d'); g.addColorStop(1, '#d97706'); ctx.fillStyle = g; ctx.fill(); }, { blur: 5, y: 2 });
      ctx.restore();
    }
  }
  function dmDraw(dt, t) {
    dmStep(dt);
    const d = S.dm, g = DM(), P = g.P, sc = g.sc, ucol = d.enz === 'amy' ? '#38bdf8' : '#f472b6';
    panel(P.x, P.y, P.w, P.h, 18, '#fbfdff');
    T(P.x + 16, P.y + 28, '🎬 효소 ' + (d.enz === 'amy' ? '아밀레이스' : '프로테이스') + ' + 기질 ' + (d.sub === 'starch' ? '녹말' : '단백질'), L(17, 14.5), '#1f2d44', 'left', 800);
    // 단계 표시
    const stg = d.ph === 'in' ? 0 : d.ph === 'bind' ? 1 : d.ph === 'split' ? 2 : d.ph === 'out' ? 3 : -1;
    ['① 접근', '② 결합', '③ 분해', '④ 방출'].forEach((s, i) => {
      const x = P.x + P.w - (PHONE ? 220 : 340) + i * (PHONE ? 54 : 82);
      D.label(x + 24, P.y + 24, s, { bg: stg === i ? '#16a34a' : '#e2e8f0', color: stg === i ? '#fff' : '#64748b', size: L(13, 11.5), pad: L(8, 5) });
    });
    // 효소 (활성 부위는 오른쪽 패임)
    const cx = g.cx, cy = g.cy, R = g.r, px = cx + R * 0.9, py = cy;
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.clip();
    const grd = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.1, cx, cy, R); grd.addColorStop(0, C.shade(ucol, 0.5)); grd.addColorStop(0.6, ucol); grd.addColorStop(1, C.shade(ucol, -0.3));
    ctx.fillStyle = grd; ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
    // 활성 부위 (기질 모양에 맞는 패임)
    ctx.fillStyle = C.shade(ucol, -0.55);
    if (d.enz === 'amy') { ctx.beginPath(); ctx.arc(px, py, 21 * sc * 1.0 + 4 * sc, 0, TAU); ctx.fill(); }
    else { ctx.save(); ctx.translate(px, py); ctx.rotate(Math.PI / 4); D.roundRect(-20 * sc, -20 * sc, 40 * sc, 40 * sc, 5 * sc); ctx.fill(); ctx.restore(); }
    ctx.restore();
    ctx.strokeStyle = C.shade(ucol, -0.35); ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
    D.glow(cx, cy, R * 1.3, '#16a34a', d.glow * 0.35);
    T(cx - R * 0.1, cy - R * 0.1, 'E', R * 0.6, 'rgba(255,255,255,.85)', 'center', 800);
    T(cx, cy + R + 22, (d.enz === 'amy' ? '아밀레이스' : '프로테이스') + ' (효소)', L(15, 13), '#1f2d44', 'center', 800);
    callout(px + 4, py - 26 * sc, px + (PHONE ? 22 : 36), py - R * 0.8 - 6, '활성 부위', { size: L(13.5, 12) });
    // 기질 (3단위 사슬)
    const ur = 15 * sc, sp = 34 * sc;
    let lx, ly, rx, ry, la = 0;
    const pockX = px + 0, hang = g.sx - (PHONE ? 0 : 80);
    if (d.ph === 'idle') { lx = hang; ly = py; rx = hang; ry = py; }
    else if (d.ph === 'in') {
      const e = SciSim.ease.inOutCubic(clamp(d.t / 1.2, 0, 1));
      const stopX = d.match ? pockX : pockX + 30 * sc;
      lx = lerp(hang, stopX, e); ly = py; rx = lx; ry = py;
    } else if (d.ph === 'bind') { lx = pockX; ly = py; rx = lx; ry = py; }
    else if (d.ph === 'split') { const e = clamp(d.t / 0.7, 0, 1); lx = pockX; ly = py; rx = pockX; ry = py; la = e * 0.6; }
    else if (d.ph === 'out') { const e = SciSim.ease.outCubic(clamp(d.t / 1.1, 0, 1)); lx = lerp(pockX, cx + R * 0.35, e); ly = lerp(py, py - R * 1.05, e); rx = pockX; ry = py; }
    else { const e = SciSim.ease.inOutCubic(clamp(d.t / 1.0, 0, 1)); lx = lerp(pockX + 30 * sc, hang, e); ly = py + Math.sin(d.t * 30) * (1 - e) * 4; rx = lx; ry = ly; }
    const kind = d.sub;
    if (d.ph === 'idle' || d.ph === 'in' || d.ph === 'bind' || d.ph === 'bounce') {
      // 3단위 사슬
      for (let i = 2; i >= 1; i--) { if (i === 1) { ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(lx + sp * (i - 1), ly); ctx.lineTo(lx + sp * i, ly); ctx.stroke(); } }
      ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx + sp, ly); ctx.stroke();
      for (let i = 2; i >= 0; i--) dmUnit(kind, lx + sp * i, ly, ur);
    } else if (d.ph === 'split') {
      const e = clamp(d.t / 0.7, 0, 1);
      ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(lx + sp + e * 10 * sc, ly); ctx.lineTo(lx + sp * 2 + e * 10 * sc, ly); ctx.stroke();
      dmUnit(kind, lx, ly, ur); dmUnit(kind, lx + sp + e * 10 * sc, ly, ur); dmUnit(kind, lx + sp * 2 + e * 10 * sc, ly, ur);
    } else if (d.ph === 'out') {
      const e = SciSim.ease.outCubic(clamp(d.t / 1.1, 0, 1)), rxx = lerp(pockX + sp + 10 * sc, hang - 10, e), ryy = lerp(py, py + R * 0.8, e);
      ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(rxx, ryy); ctx.lineTo(rxx + sp, ryy); ctx.stroke();
      dmUnit(kind, lx, ly, ur); dmUnit(kind, rxx, ryy, ur); dmUnit(kind, rxx + sp, ryy, ur);
    }
    // 기질 이름과 안내
    T(Math.min(hang + 12, P.x + P.w - 70), py + 56 * sc, d.sub === 'starch' ? '녹말 (기질)' : '단백질 (기질)', L(14.5, 12.5), '#475569', 'center', 800);
    if (d.ph === 'bounce' || (d.ph === 'idle' && d.tried[d.enz + d.sub] === 'no')) {
      T(P.x + P.w / 2, P.y + P.h - 18, '✕ 모양이 맞지 않아 결합하지 못해요: 반응 없음', L(16, 13), '#dc2626', 'center', 800);
    } else if (d.ph === 'idle' && d.tried[d.enz + d.sub] === 'ok') {
      T(P.x + P.w / 2, P.y + P.h - 18, '✔ 분해 끝! 효소는 그대로예요. 다시 쓸 수 있어요 (반응 ' + d.n + '회)', L(16, 13), '#15803d', 'center', 800);
    } else T(P.x + P.w / 2, P.y + P.h - 18, d.ph === 'idle' ? '▶ 반응 시험을 눌러 보세요' : '효소와 기질이 만나요…', L(15, 13), '#64748b', 'center', 800);
    // 아래 패널: 결과표 + 특성
    const B = g.B; panel(B.x, B.y, B.w, B.h, 18, '#fff');
    T(B.x + 16, B.y + 28, '시험 결과표', L(16, 14), '#1f2d44', 'left', 800);
    const tx = B.x + 16, ty = B.y + 44, cw = PHONE ? 120 : 140, rh = PHONE ? 44 : 46;
    ['', '녹말', '단백질'].forEach((h, i) => { if (h) T(tx + 92 + (i - 1) * cw + cw / 2, ty + 14, h, L(14.5, 13), '#475569', 'center', 800); });
    [['amy', '아밀레이스'], ['pro', '프로테이스']].forEach((r, ri) => {
      T(tx, ty + 18 + rh * (ri + 1) - rh / 2 + 10, r[1], L(14.5, 13), '#1f2d44', 'left', 800);
      ['starch', 'protein'].forEach((s, si) => {
        const k = r[0] + s, v = d.tried[k], cx0 = tx + 92 + si * cw + 4, cy0 = ty + 26 + ri * rh;
        D.roundRect(cx0, cy0, cw - 8, rh - 8, 10); ctx.fillStyle = v === 'ok' ? '#dcfce7' : v === 'no' ? '#fee2e2' : '#f1f5f9'; ctx.fill();
        T(cx0 + (cw - 8) / 2, cy0 + (rh - 8) / 2 + 5, v === 'ok' ? '분해 ✅' : v === 'no' ? '반응 없음 ✕' : '아직', L(14, 12.5), v === 'ok' ? '#166534' : v === 'no' ? '#b91c1c' : '#94a3b8', 'center', 800);
      });
    });
    const bx = PHONE ? B.x + 16 : B.x + 400, by0 = PHONE ? B.y + 176 : B.y + 30;
    T(bx, by0, '효소의 특성', L(16, 14), '#1f2d44', 'left', 800);
    ['기질 특이성: 맞는 기질에만 작용', '반응 전후에 변하지 않아 재사용', '소량으로도 많은 기질을 처리', '반응 속도만 빠르게 (생성물 양은 그대로)'].forEach((s, i) => TF(bx, by0 + 28 + i * (PHONE ? 25 : 28), '• ' + s, B.w - (bx - B.x) - 14, L(14.5, 13), 11.5, '#475569', 'left', 700));
  }

  /* =========================================================
     ② 실험 설계
     ========================================================= */
  S.ds = { iv: {}, ctl: {}, grp: {}, rep: 1, issues: [], ok: false, shake: 0, prevKeys: '' };
  const ivList = () => Object.keys(S.ds.iv).filter((k) => S.ds.iv[k]);
  const ivOne = () => { const l = ivList(); return l.length === 1 ? l[0] : null; };
  function evalDesign() {
    const d = S.ds, ivs = ivList(), out = [];
    if (ivs.length === 0) out.push({ k: 'iv0', m: '바꿀 요인(독립 변인)을 하나 골라요.' });
    if (ivs.length >= 2) out.push({ k: 'iv2', m: '독립 변인이 ' + ivs.length + '개예요(' + ivs.map((k) => IVS[k].name).join(', ') + '). 함께 바꾸면 결과가 어떤 요인 때문인지 알 수 없어요. 하나만 남겨요.' });
    if (ivs.length === 1) {
      const iv = ivs[0], need = Object.keys(CTL).filter((k) => k !== iv);
      const miss = need.filter((k) => !d.ctl[k]);
      if (miss.length) out.push({ k: 'miss', m: '통제 변인이 빠졌어요: ' + miss.map((k) => CTL[k]).join(', ') + '. 같게 맞춰야 해요.' });
      if (d.ctl[iv]) out.push({ k: 'wrong', m: CTL[iv] + josa(CTL[iv], '은', '는') + ' 바꿀 요인이라 같게 하면 안 돼요.' });
    }
    if (!d.grp.water && !d.grp.boil) out.push({ k: 'grp', m: '대조군이 없어요. 효소 대신 물이나 삶은 간을 넣은 시험관이 필요해요.' });
    if (d.rep < 3) out.push({ k: 'rep', m: '반복 횟수가 ' + d.rep + '회예요. 우연한 오차를 줄이려면 3회 이상 반복해요.' });
    d.issues = out; d.ok = out.length === 0;
    return out;
  }
  function dsUpdateFromUI() {
    const d = S.ds;
    $$('#dsIv button').forEach((b) => { d.iv[b.dataset.v] = b.classList.contains('on'); });
    $$('#dsCtl button').forEach((b) => { d.ctl[b.dataset.v] = b.classList.contains('on'); });
    $$('#dsGrp button').forEach((b) => { d.grp[b.dataset.v] = b.classList.contains('on'); });
    const rp = $('#dsRep button.on'); d.rep = rp ? +rp.dataset.v : 1;
  }
  function dsSetState(o) {   // 시험용 · 상태를 한 번에 정하기
    const d = S.ds;
    if (o.iv) { d.iv = {}; o.iv.forEach((k) => { d.iv[k] = true; }); }
    if (o.ctl) { d.ctl = {}; o.ctl.forEach((k) => { d.ctl[k] = true; }); }
    if (o.grp) { d.grp = {}; o.grp.forEach((k) => { d.grp[k] = true; }); }
    if (o.rep) d.rep = o.rep;
    $$('#dsIv button').forEach((b) => b.classList.toggle('on', !!d.iv[b.dataset.v]));
    $$('#dsCtl button').forEach((b) => b.classList.toggle('on', !!d.ctl[b.dataset.v]));
    $$('#dsGrp button').forEach((b) => b.classList.toggle('on', !!d.grp[b.dataset.v]));
    $$('#dsRep button').forEach((b) => b.classList.toggle('on', +b.dataset.v === d.rep));
    onDesignChange();
  }
  function onDesignChange() {
    const before = S.ds.issues.map((i) => i.k).join(',');
    evalDesign();
    const now = S.ds.issues.map((i) => i.k).join(',');
    if (now !== before && S.ds.issues.length) S.ds.shake = 1;
    const iv = ivOne();
    if (iv !== S.rn.iv) rnSetIv(iv);
    updateCtl();
  }
  const dsPos = () => (PHONE
    ? { P1: { x: 10, y: 8, w: 460, h: 248 }, P2: { x: 10, y: 264, w: 460, h: 146 }, P3: { x: 10, y: 418, w: 460, h: 214 } }
    : { P1: { x: 14, y: 14, w: 772, h: 206 }, P2: { x: 14, y: 228, w: 772, h: 160 }, P3: { x: 14, y: 396, w: 772, h: 150 } });
  function tubeShape(x, y, w, h, liquid, level, o) {
    o = o || {};
    D.testTube(x, y, w, h, { liquid, level, glass: '#7b8ca6' });
    if (o.bits) for (let i = 0; i < o.bits; i++) { ctx.save(); ctx.translate(x - w * 0.22 + (i % 2) * w * 0.38, y + h - w * 0.55 - Math.floor(i / 2) * 7); ctx.fillStyle = o.boil ? '#9a8b82' : '#8b3a2e'; ctx.beginPath(); ctx.ellipse(0, 0, 5, 3.4, 0.4 * i, 0, TAU); ctx.fill(); ctx.restore(); }
  }
  function dsDraw(dt, t) {
    const d = S.ds, g = dsPos(); d.shake = approach(d.shake, 0, dt, 2.2);
    const sh = RM ? 0 : Math.sin(clock * 55) * 4 * d.shake;
    const iv = ivOne(), ivs = ivList();
    // 변수 판
    panel(g.P1.x, g.P1.y, g.P1.w, g.P1.h, 18, '#fbfffb');
    T(g.P1.x + 16, g.P1.y + 28, '카탈레이스 실험: 3 % 과산화 수소 10 mL + 간 즙', L(16.5, 13.5), '#1f2d44', 'left', 800);
    const ax = g.P1.x + (PHONE ? 14 : 22), ay = g.P1.y + (PHONE ? 42 : 44);
    const bw = PHONE ? 214 : 224, bh = PHONE ? 58 : 60;
    // 독립 변인 상자
    ctx.save(); ctx.translate(ivs.length >= 2 ? sh : 0, 0);
    D.roundRect(ax, ay, bw, bh, 14); ctx.fillStyle = ivs.length === 1 ? '#fff4e0' : ivs.length ? '#fee2e2' : '#f1f5f9'; ctx.fill();
    ctx.strokeStyle = ivs.length === 1 ? '#f59e0b' : ivs.length ? '#dc2626' : '#cbd5e1'; ctx.lineWidth = 2.5; if (!ivs.length) ctx.setLineDash([6, 5]); ctx.stroke(); ctx.setLineDash([]);
    T(ax + 12, ay + 20, '바꿀 것 (독립 변인)', L(13.5, 12), '#92400e', 'left', 800);
    TF(ax + 12, ay + bh - 14, ivs.length ? ivs.map((k) => IV_ICON[k] + ' ' + IVS[k].name).join(' + ') : '아직 안 골랐어요', bw - 22, L(17, 15), 12, '#1f2d44', 'left', 800);
    ctx.restore();
    // 종속 변인 상자
    const bx = PHONE ? ax + bw + 14 : ax + bw + 46;
    if (!PHONE) D.arrow(ax + bw + 6, ay + bh / 2, bx - 6, ay + bh / 2, { color: '#94a3b8', width: 3, head: 11 });
    D.roundRect(bx, ay, bw, bh, 14); ctx.fillStyle = '#e8f6fd'; ctx.fill(); ctx.strokeStyle = '#0ea5e9'; ctx.lineWidth = 2.5; ctx.stroke();
    T(bx + 12, ay + 20, '측정할 것 (종속 변인)', L(13.5, 12), '#075985', 'left', 800);
    TF(bx + 12, ay + bh - 14, '🫧 산소 발생량 (mL/30초)', bw - 22, L(17, 15), 12, '#1f2d44', 'left', 800);
    // 통제 변인 칩
    const cy0 = PHONE ? ay + bh + 34 : ay + bh + 34;
    T(ax, cy0 - 10, '같게 맞출 것 (통제 변인)', L(14.5, 13), '#166534', 'left', 800);
    const keys = Object.keys(CTL), cols = PHONE ? 3 : 6, cwid = PHONE ? 144 : 118, chh = PHONE ? 38 : 40, gap = PHONE ? 6 : 6;
    keys.forEach((k, i) => {
      const x = ax + (i % cols) * (cwid + gap), y = cy0 + Math.floor(i / cols) * (chh + 8);
      const on = !!d.ctl[k], isIv = ivs.length === 1 && ivs[0] === k, need = ivs.length === 1 && !isIv;
      const state = isIv ? (on ? 'wrong' : 'iv') : on ? (ivs.length === 1 ? 'good' : 'neutral') : (need ? 'miss' : 'empty');
      const fill = { wrong: '#fee2e2', iv: '#fef3c7', good: '#dcfce7', neutral: '#e0f2fe', miss: '#fff', empty: '#f8fafc' }[state];
      const stroke = { wrong: '#dc2626', iv: '#f59e0b', good: '#16a34a', neutral: '#38bdf8', miss: '#94a3b8', empty: '#cbd5e1' }[state];
      ctx.save(); if (state === 'wrong') ctx.translate(sh, 0);
      D.roundRect(x, y, cwid, chh, 12); ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = stroke; ctx.lineWidth = 2.2; if (state === 'miss' || state === 'empty') ctx.setLineDash([5, 4]); ctx.stroke(); ctx.setLineDash([]);
      TF(x + cwid / 2, y + chh / 2 + 5, (state === 'good' ? '✔ ' : state === 'wrong' ? '✕ ' : state === 'miss' ? '? ' : '') + CTL[k], cwid - 12, L(14.5, 13), 11, '#26324a', 'center', 800);
      ctx.restore();
    });
    // 시험관 줄
    panel(g.P2.x, g.P2.y, g.P2.w, g.P2.h, 18, '#fff');
    T(g.P2.x + 16, g.P2.y + 26, '실험 계획 시험관 (반복 ' + d.rep + '회)', L(16, 14), '#1f2d44', 'left', 800);
    const items = [];
    if (iv) IVS[iv].vals.forEach((v) => items.push({ lab: IVS[iv].name === 'pH' ? 'pH ' + v : v + IVS[iv].unit, bits: iv === 'enz' ? Math.round(v / 100 * 6) : 6, liq: '#bfe3f7' }));
    else if (ivs.length === 0) items.push({ lab: '?', bits: 6, liq: '#e2e8f0', dim: true });
    else ivs.forEach((k) => items.push({ lab: IVS[k].name, bits: 6, liq: '#fecaca' }));
    if (d.grp.water) items.push({ lab: '대조군: 물', bits: 0, liq: '#e5eef5', ctl: true });
    if (d.grp.boil) items.push({ lab: '대조군: 삶은 간', bits: 6, liq: '#e9e2d8', ctl: true, boil: true });
    const n = items.length, areaW = g.P2.w - 40, step = Math.min(PHONE ? 52 : 82, areaW / Math.max(1, n));
    const x0 = g.P2.x + g.P2.w / 2 - step * (n - 1) / 2, ty = g.P2.y + (PHONE ? 44 : 44), th = PHONE ? 70 : 78, tw = PHONE ? 22 : 26;
    items.forEach((it, i) => {
      const x = x0 + i * step;
      for (let r = Math.min(d.rep, 5) - 1; r >= 0; r--) { ctx.save(); ctx.globalAlpha = r === 0 ? 1 : 0.55; ctx.translate(r * 4, -r * 3); tubeShape(x, ty, tw, th, it.liq, 0.55, { bits: it.bits ? Math.min(it.bits, 6) : 0, boil: it.boil }); ctx.restore(); }
      TF(x, ty + th + 18, it.lab, step - 2, L(13, 11.5), 9.5, it.ctl ? '#7c3aed' : '#475569', 'center', 800);
    });
    // 점검 목록
    panel(g.P3.x, g.P3.y, g.P3.w, g.P3.h, 18, d.ok ? '#f0fdf4' : '#fffdf7');
    T(g.P3.x + 16, g.P3.y + 28, d.ok ? '✅ 설계 점검: 통과!' : '⚠ 설계 점검: ' + d.issues.length + '가지를 고쳐요', L(17, 14.5), d.ok ? '#15803d' : '#b45309', 'left', 800);
    if (d.ok) textBlock(g.P3.x + 16, g.P3.y + 56, g.P3.w - 32, '독립 변인 ' + IVS[iv].name + ' 하나만 바꾸고, 나머지 5가지를 같게 했어요. 대조군과 3회 이상 반복으로 결과를 믿을 수 있어요.', L(14.5, 13), '#166534', L(21, 19), 700);
    else { let yy = g.P3.y + 52; d.issues.slice(0, PHONE ? 4 : 3).forEach((is) => { const h = textBlock(g.P3.x + 16, yy, g.P3.w - 32, '• ' + is.m, L(14, 13), '#7c2d12', L(20, 18), 700); yy += h + 4; }); }
  }

  /* =========================================================
     ③ 실험 수행
     ========================================================= */
  S.rn = { iv: null, sel: null, rows: {}, cur: null, queue: [], gas: 0, phase: 'idle', t: 0, flies: [], pts: [], emit: 0 };
  const PHCOL = { 3: '#ef4444', 5: '#f59e0b', 7: '#22c55e', 9: '#3b82f6', 11: '#8b5cf6' };
  function rnKeys() {
    const r = S.rn, out = [];
    if (r.iv) IVS[r.iv].vals.forEach((v) => out.push({ key: String(v), val: v, lab: valTxt(r.iv, v) }));
    if (S.ds.grp.water) out.push({ key: 'ctlW', val: null, lab: '물 대조군', ctl: true });
    if (S.ds.grp.boil) out.push({ key: 'ctlB', val: null, lab: '삶은 간 대조군', ctl: true });
    return out;
  }
  function rnTrueOf(key) { const r = S.rn; if (key === 'ctlW' || key === 'ctlB' || !r.iv) return 0; const i = IVS[r.iv].vals.findIndex((v) => String(v) === key); return i < 0 ? 0 : IVS[r.iv].data[i]; }
  function rnReading(key, rep) {   // 10분의 1 mL 정수
    const tr = Math.round(rnTrueOf(key) * 10); if (tr === 0) return 0;
    const idx = Math.max(0, rnKeys().findIndex((k) => k.key === key));
    return tr + OFFS[idx % 4][rep];
  }
  function rnSetIv(iv) {
    const r = S.rn; r.iv = iv; r.rows = {}; r.cur = null; r.queue = []; r.gas = 0; r.phase = 'idle'; r.flies.length = 0; r.pts.length = 0; r.sel = null;
    const k = rnKeys(); r.sel = k.length ? k[0].key : null;
    rnBuildChips(); updateCtl();
  }
  function rnBuildChips() {
    const box = $('#rnVals'); if (!box) return;
    box.innerHTML = '';
    rnKeys().forEach((k) => {
      const b = document.createElement('button'); b.type = 'button'; b.dataset.v = k.key; b.textContent = k.lab;
      b.addEventListener('click', () => { if (S.rn.phase !== 'idle') return; S.rn.sel = k.key; Sound.tick(); updateCtl(); });
      box.appendChild(b);
    });
  }
  const rnBusy = () => S.rn.phase !== 'idle';
  function rnGo() {
    const r = S.rn;
    if (!r.iv) { showHint('먼저 설계판에서 독립 변인을 하나만 골라요.', 3200); return false; }
    if (rnBusy() || !r.sel) return false;
    delete r.rows[r.sel]; r.pts = r.pts.filter((p) => p.key !== r.sel);
    r.rows[r.sel] = { reps: [], done: false, mean: null };
    r.queue = [0, 1, 2]; rnNextTrial(); updateCtl(); return true;
  }
  function rnNextTrial() {
    const r = S.rn;
    if (!r.queue.length) { r.phase = 'idle'; r.cur = null; updateCtl(); return; }
    const rep = r.queue.shift();
    r.cur = { key: r.sel, rep, target: rnReading(r.sel, rep) / 10 }; r.phase = 'run'; r.t = 0; r.gas = 0;
  }
  function rnFinishTrial() {
    const r = S.rn, row = r.rows[r.cur.key];
    row.reps.push(Math.round(r.cur.target * 10));
    if (row.reps.length === 3) {
      const sum = row.reps.reduce((a, b) => a + b, 0); row.mean = sum / 30; row.lo = Math.min.apply(null, row.reps) / 10; row.hi = Math.max.apply(null, row.reps) / 10; row.done = true;
      Sound.success();
      if (r.iv && !r.cur.key.startsWith('ctl')) {
        const g = rnGeo(), ki = rnKeys().findIndex((k) => k.key === r.cur.key), pos = rnRowPos(ki);
        const p = { key: r.cur.key, val: +r.cur.key, mean: row.mean, shown: false, x: pos.x, y: pos.y };
        r.pts.push(p);
        const pl = rnPlot(), tx = pl.X(p.val), ty = pl.Y(row.mean);
        if (RM) { p.x = tx; p.y = ty; p.shown = true; } else SciSim.tween(p, { x: tx, y: ty }, { duration: 0.7, ease: 'inOutCubic', onDone: () => { p.shown = true; parts.burst(tx, ty, { count: 8, colors: ['#f59e0b', '#fff'], speed: 70, life: 0.5, gravity: 0 }); } });
      }
    }
  }
  function rnUpdate(dt) {
    const r = S.rn;
    if (r.phase === 'run') {
      r.t += dt; const dur = RM ? 0.05 : 1.5, p = clamp(r.t / dur, 0, 1);
      r.gas = r.cur.target * SciSim.ease.outCubic(p);
      if (!RM && r.cur.target > 0) { r.emit += dt * (6 + r.cur.target * 8); while (r.emit >= 1) { r.emit -= 1; const a = rnApp(); const q = a.pt(76 + (Math.random() - 0.5) * 22, 250); parts.emit({ x: q.x, y: q.y, vx: (Math.random() - 0.5) * 6, vy: -50 * a.s - Math.random() * 30, life: 0.9, size: (2 + Math.random() * 2.2) * a.s, color: '#7bb8d9', shape: 'bubble', gravity: 0 }); } }
      if (r.t >= dur) { rnFinishTrial(); r.phase = r.queue.length ? 'gap' : 'end'; r.t = 0; }
    } else if (r.phase === 'gap') {
      r.t += dt; r.gas = approach(r.gas, 0, dt, 12);
      if (r.t >= (RM ? 0.02 : 0.3)) rnNextTrial();
    } else if (r.phase === 'end') {
      r.t += dt; if (r.t >= (RM ? 0.02 : 0.5)) { r.phase = 'idle'; r.cur = null; updateCtl(); }
    } else r.gas = approach(r.gas, 0, dt, 6);
  }
  const rnGeo = () => (PHONE
    ? { A: { x: 10, y: 6, w: 460, h: 282 }, Tb: { x: 10, y: 296, w: 460, h: 216 }, G: { x: 10, y: 520, w: 460, h: 112 } }
    : { A: { x: 14, y: 14, w: 420, h: 330 }, Tb: { x: 446, y: 14, w: 340, h: 330 }, G: { x: 14, y: 354, w: 772, h: 192 } });
  function rnApp() {
    const A = rnGeo().A, s = Math.min(A.w / 420, A.h / 330), ox = A.x + (A.w - 420 * s) / 2, oy = A.y;
    return { s, ox, oy, pt: (lx, ly) => ({ x: ox + lx * s, y: oy + ly * s }) };
  }
  const rnPlot = () => { const G = rnGeo().G, iv = S.rn.iv || 'temp', I = IVS[iv]; return mkPlot(G, { x0: I.x0, x1: I.x1, y0: 0, y1: 12, xt: I.xt, yt: [0, 4, 8, 12], xl: PHONE ? '' : I.name + (I.unit ? ' (' + I.unit + ')' : ''), yl: PHONE ? '' : 'O₂ (mL/30초)', m: PHONE ? { l: 38, t: 24, r: 14, b: 26 } : { l: 52, t: 30, r: 18, b: 40 } }); };
  function rnRowPos(i) {
    const Tb = rnGeo().Tb, n = rnKeys().length, rh = Math.min(PHONE ? 20 : 28, (Tb.h - (PHONE ? 70 : 92)) / Math.max(n, 1));
    return { x: Tb.x + 12 + 0.85 * (Tb.w - 24), y: Tb.y + (PHONE ? 48 : 58) + rh * i + rh / 2, rh };
  }
  function rnCond() {
    const r = S.rn, c = { temp: 37, ph: 7, enz: 100, sub: 3 };
    if (r.iv && r.sel && !String(r.sel).startsWith('ctl')) c[r.iv] = +r.sel;
    return c;
  }
  function rnDraw(dt, t) {
    rnUpdate(dt);
    const r = S.rn, G = rnGeo(), a = rnApp(), s = a.s, c = rnCond(), iv = r.iv;
    // ---- 장치 ----
    panel(G.A.x, G.A.y, G.A.w, G.A.h, 18, '#fbfdff');
    ctx.save(); ctx.translate(a.ox, a.oy); ctx.scale(s, s);
    const tags = [['🌡', c.temp + ' °C', 'temp'], ['🧫', 'pH ' + c.ph, 'ph'], ['🥩', '간 즙 ' + c.enz + ' %', 'enz'], ['💧', 'H₂O₂ ' + c.sub + ' %', 'sub']];
    let tx = 14;
    tags.forEach((q) => { const lab = q[0] + ' ' + q[1]; ctx.font = D.font(13.5, 800); const w = ctx.measureText(lab).width + 18; const hot = iv === q[2]; D.roundRect(tx, 12, w, 28, 14); ctx.fillStyle = hot ? '#fde68a' : '#eef2f7'; ctx.fill(); if (hot) { ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 2; ctx.stroke(); } T(tx + w / 2, 31, lab, 13.5, hot ? '#7c2d12' : '#475569', 'center', 800); tx += w + 6; });
    const isCtlSel = String(r.sel || '').startsWith('ctl');
    // 온도계 · pH
    D.thermometer(30, 118, 110, c.temp, 0, 70, { ticks: false });
    T(30, 280, c.temp + '°C', 13, '#475569', 'center', 800);
    // 시험관
    const bits = isCtlSel ? (r.sel === 'ctlW' ? 0 : 6) : Math.round(c.enz / 100 * 6);
    const liq = PHCOL[c.ph] ? C.mix('#dff1fb', PHCOL[c.ph], 0.22) : '#dff1fb';
    tubeShape(76, 126, 42, 164, liq, 0.62, { bits, boil: r.sel === 'ctlB' });
    ctx.fillStyle = '#c2410c'; ctx.beginPath(); ctx.moveTo(52, 110); ctx.lineTo(100, 110); ctx.lineTo(95, 128); ctx.lineTo(57, 128); ctx.closePath(); ctx.fill();
    // 유리관
    ctx.strokeStyle = 'rgba(100,116,139,.85)'; ctx.lineWidth = 6; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(76, 112); ctx.lineTo(76, 70); ctx.lineTo(232, 70); ctx.lineTo(232, 300); ctx.lineTo(300, 300); ctx.lineTo(300, 256); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2; ctx.stroke();
    // 수조 + 메스실린더
    D.roundRect(214, 244, 176, 76, 8); ctx.fillStyle = 'rgba(140,200,235,.45)'; ctx.fill(); ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.fillStyle = '#fbfdff'; ctx.fillRect(215, 236, 174, 8);
    const cx0 = 282, cw = 36, ct = 72, cb = 262, per = (cb - ct) / 12, gy = ct + clamp(r.gas, 0, 12) * per;
    ctx.fillStyle = 'rgba(140,200,235,.55)'; ctx.fillRect(cx0, gy, cw, cb - gy);
    if (r.gas > 0.05) { ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillRect(cx0, ct, cw, gy - ct); }
    ctx.strokeStyle = '#6b7f9c'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(cx0, ct); ctx.lineTo(cx0, cb); ctx.moveTo(cx0 + cw, ct); ctx.lineTo(cx0 + cw, cb); ctx.moveTo(cx0, ct); ctx.lineTo(cx0 + cw, ct); ctx.stroke();
    for (let k = 0; k <= 12; k++) { const yy = ct + k * per; ctx.fillStyle = '#64748b'; ctx.fillRect(cx0 + cw, yy - 0.75, k % 2 === 0 ? 9 : 5, 1.5); if (k % 2 === 0) T(cx0 + cw + 12, yy + 4.5, String(k), 12.5, '#64748b', 'left', 700); }
    T(cx0 + cw / 2, ct - 8, '모인 기체', 12.5, '#475569', 'center', 800);
    D.label(352, 160, 'O₂ ' + fv(r.gas) + ' mL', { bg: '#0ea5e9', size: 14 });
    T(76, 312, '간 즙 + H₂O₂', 13, '#475569', 'center', 800);
    T(356, 312, '수조', 12.5, '#64748b', 'center', 700);
    ctx.restore();
    // ---- 표 ----
    const Tb = G.Tb; panel(Tb.x, Tb.y, Tb.w, Tb.h, 18, '#fff');
    T(Tb.x + 14, Tb.y + 26, iv ? '측정 표 (mL/30초)' : '측정 표', L(16, 14), '#1f2d44', 'left', 800);
    const keys = rnKeys();
    if (!iv) { textBlock(Tb.x + 14, Tb.y + 60, Tb.w - 28, '설계판에서 바꿀 요인을 하나만 고르면 측정할 값이 나타나요.', 14, '#64748b', 20, 700); }
    else {
      const colX = [0, 0.3, 0.46, 0.62, 0.78].map((f) => Tb.x + 12 + f * (Tb.w - 24));
      ['값', '1회', '2회', '3회', '평균'].forEach((h, i) => T(i === 0 ? colX[0] : colX[i] + (Tb.w - 24) * 0.07, Tb.y + (PHONE ? 44 : 50), h, 13, '#64748b', i === 0 ? 'left' : 'center', 800));
      keys.forEach((k, i) => {
        const pos = rnRowPos(i), y = pos.y - pos.rh / 2, row = r.rows[k.key], sel = r.sel === k.key;
        if (sel) { D.roundRect(Tb.x + 6, y + 1, Tb.w - 12, pos.rh - 2, 8); ctx.fillStyle = 'rgba(245,158,11,.16)'; ctx.fill(); }
        TF(colX[0], pos.y + 5, k.lab, (Tb.w - 24) * 0.3 - 4, L(14, 12.5), 9.5, k.ctl ? '#7c3aed' : '#26324a', 'left', 800);
        for (let j = 0; j < 3; j++) {
          const v = row && row.reps[j] != null ? fv(row.reps[j] / 10) : (row && r.cur && r.cur.key === k.key && r.cur.rep === j ? '…' : '·');
          T(colX[j + 1] + (Tb.w - 24) * 0.07, pos.y + 5, v, L(14, 12.5), v === '·' ? '#cbd5e1' : '#334155', 'center', 700);
        }
        T(colX[4] + (Tb.w - 24) * 0.07, pos.y + 5, row && row.done ? fv(row.mean) : '·', L(15, 13), row && row.done ? '#b45309' : '#cbd5e1', 'center', 800);
      });
      const row = r.rows[r.sel];
      if (row && row.done) T(Tb.x + 14, Tb.y + Tb.h - 12, '평균 ' + fv(row.mean) + ' (범위 ' + fv(row.lo) + ' ~ ' + fv(row.hi) + ')', L(14, 12.5), '#92400e', 'left', 800);
      else T(Tb.x + 14, Tb.y + Tb.h - 12, '행을 눌러 값을 고르고 3회 측정해요', L(13.5, 12), '#64748b', 'left', 700);
    }
    // ---- 그래프 ----
    panel(G.G.x, G.G.y, G.G.w, G.G.h, 18, '#fff');
    const pl = rnPlot(); drawAxes(pl);
    if (PHONE) T(G.G.x + 12, G.G.y + 18, 'O₂ (mL/30초) · ' + IVS[iv || 'temp'].name + (iv && IVS[iv].unit ? ' (' + IVS[iv].unit + ')' : ''), 13, '#334155', 'left', 800);
    if (!iv) T(G.G.x + G.G.w / 2, G.G.y + G.G.h / 2, '측정한 평균이 여기에 점으로 모여요', 14, '#94a3b8', 'center', 700);
    else {
      const shown = r.pts.filter((p) => p.shown).sort((u, v) => u.val - v.val);
      if (shown.length > 1) { ctx.save(); ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.beginPath(); shown.forEach((p, i) => { const x = pl.X(p.val), y = pl.Y(p.mean); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }); ctx.stroke(); ctx.restore(); }
      r.pts.forEach((p) => { const x = p.shown ? pl.X(p.val) : p.x, y = p.shown ? pl.Y(p.mean) : p.y; D.sphere(x, y, p.shown ? 6 : 7, '#f59e0b', { gloss: true, shadow: !p.shown }); });
    }
  }
  const rnPT = {
    down(p) {
      if (rnBusy()) return false;
      const keys = rnKeys(); const Tb = rnGeo().Tb;
      if (p.x < Tb.x || p.x > Tb.x + Tb.w) return false;
      for (let i = 0; i < keys.length; i++) { const pos = rnRowPos(i); if (p.y >= pos.y - pos.rh / 2 && p.y <= pos.y + pos.rh / 2) { S.rn.sel = keys[i].key; Sound.tick(); updateCtl(); return true; } }
      return false;
    },
    hover(p) { const Tb = rnGeo().Tb; return p.x >= Tb.x && p.x <= Tb.x + Tb.w && p.y > Tb.y + 40 ? 'pointer' : 'default'; },
  };
  const rnDonePts = () => rnKeys().filter((k) => !k.ctl && S.rn.rows[k.key] && S.rn.rows[k.key].done).length;

  /* =========================================================
     ④ 결과 분석
     ========================================================= */
  S.an = { prog: 0, sel: null };
  const AN_KEYS = ['temp', 'ph', 'enz', 'sub'];
  const anGeo = (i) => (PHONE ? { x: 10, y: 6 + i * 157, w: 460, h: 151 } : { x: 14 + (i % 2) * 388, y: 14 + Math.floor(i / 2) * 270, w: 384, h: 262 });
  const anPlot = (i) => { const k = AN_KEYS[i], I = IVS[k]; return mkPlot(anGeo(i), { x0: I.x0, x1: I.x1, y0: 0, y1: 12, xt: I.xt, yt: PHONE ? [0, 6, 12] : [0, 4, 8, 12], xl: PHONE ? '' : I.name + (I.unit ? ' (' + I.unit + ')' : ''), m: PHONE ? { l: 34, t: 28, r: 12, b: 24 } : { l: 46, t: 40, r: 16, b: 44 } }); };
  function anEnter() { S.an.prog = 0; if (RM) S.an.prog = 1; else SciSim.tween(S.an, { prog: 1 }, { duration: 1.3, ease: 'inOutCubic' }); }
  function anDraw(dt, t) {
    AN_KEYS.forEach((k, i) => {
      const I = IVS[k], g = anGeo(i), pl = anPlot(i);
      panel(g.x, g.y, g.w, g.h, 16, '#fff');
      T(g.x + 14, g.y + 24, IV_ICON[k] + ' ' + I.name + ' → 산소 (mL/30초)', L(15.5, 13), '#1f2d44', 'left', 800);
      drawAxes(pl);
      // 참고 자료 곡선 (그려지는 중)
      const n = I.vals.length, tot = (n - 1) * clamp(S.an.prog, 0, 1);
      ctx.save(); ctx.strokeStyle = '#64748b'; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.beginPath();
      for (let j = 0; j < n; j++) {
        const x = pl.X(I.vals[j]), y = pl.Y(I.data[j]);
        if (j === 0) ctx.moveTo(x, y);
        else if (j <= tot) ctx.lineTo(x, y);
        else if (j - 1 < tot) { const f = tot - (j - 1), x0 = pl.X(I.vals[j - 1]), y0 = pl.Y(I.data[j - 1]); ctx.lineTo(x0 + (x - x0) * f, y0 + (y - y0) * f); }
      }
      ctx.stroke(); ctx.restore();
      I.vals.forEach((v, j) => { if (j <= tot + 0.01) D.sphere(pl.X(v), pl.Y(I.data[j]), 5, '#64748b', { gloss: true }); });
      // 내가 측정한 평균
      if (S.rn.iv === k) S.rn.pts.forEach((p) => { if (p.shown) D.sphere(pl.X(p.val), pl.Y(p.mean), 7.5, '#f59e0b', { gloss: true, outline: '#fff', outlineWidth: 2 }); });
      // 선택 점 읽기
      const sl = S.an.sel;
      if (sl && sl.k === k) {
        const x = pl.X(I.vals[sl.i]), y = pl.Y(I.data[sl.i]);
        D.dashedLine(x, pl.y + pl.h, x, y, { color: '#e2464b', width: 1.8 }); D.dashedLine(pl.x, y, x, y, { color: '#e2464b', width: 1.8 });
        D.sphere(x, y, 8, '#e2464b', { gloss: true });
        D.label(clamp(x, pl.x + 62, pl.x + pl.w - 62), pl.y + 12, valTxt(k, I.vals[sl.i]) + ' → ' + fv(I.data[sl.i]) + ' mL', { bg: '#e2464b', size: L(13, 12) });
      }
    });
  }
  const anPT = {
    down(p) {
      for (let i = 0; i < 4; i++) {
        const g = anGeo(i);
        if (!inRect(p.x, p.y, g)) continue;
        const k = AN_KEYS[i], I = IVS[k], pl = anPlot(i);
        let best = 0, bd = 1e9; I.vals.forEach((v, j) => { const dd = Math.abs(pl.X(v) - p.x); if (dd < bd) { bd = dd; best = j; } });
        S.an.sel = { k, i: best }; Sound.tick(); rlast = ''; return true;
      }
      return false;
    },
    hover(p) { return AN_KEYS.some((k, i) => inRect(p.x, p.y, anGeo(i))) ? 'pointer' : 'default'; },
  };

  /* =========================================================
     화면 전환 · 조작 연결
     ========================================================= */
  const PTS = { kinds: null, design: null, run: rnPT, analyze: anPT };
  function setMode(m) {
    if (S.mode !== m) { S.fade = 1; if (m === 'analyze') anEnter(); }
    S.mode = m; PT = m === 'kinds' ? (S.sub === 'sort' ? soPT : null) : PTS[m]; hideHint(); updateCtl();
  }
  function setSub(s) { S.sub = s; if (S.mode === 'kinds') PT = s === 'sort' ? soPT : null; hideHint(); updateCtl(); }
  function setASub(s) { S.aSub = s; updateCtl(); }
  const ctlNodes = $$('#ctrlCard .control');
  const chosenShapes = () => ({ temp: selVal('sh_temp'), ph: selVal('sh_ph'), enz: selVal('sh_enz'), sub: selVal('sh_sub') });
  function updateCtl() {
    const fr = game ? game.free : false, lvNow = game ? game.level : 0;
    ctlNodes.forEach((n) => { n.hidden = (n.dataset.modes || '').split(' ').indexOf(S.mode) < 0; });
    modeButtons(S.mode, lvNow, fr);
    // 첫 번째 칸
    chipSet($('#kSub'), S.sub); $$('#ctrlCard [data-sub]').forEach((n) => { n.hidden = n.dataset.sub !== S.sub; });
    chipSet($('#aSub'), S.aSub); $$('#ctrlCard [data-asub]').forEach((n) => { n.hidden = n.dataset.asub !== S.aSub; });
    $('#soNote').innerHTML = '분류한 카드 <b>' + S.so.placed + ' / 12</b>';
    const d = S.dm; chipSet($('#dmEnz'), d.enz); chipSet($('#dmSub'), d.sub); $('#dmGo').disabled = d.ph !== 'idle';
    $('#dmNote').innerHTML = '시험한 조합 <b>' + Object.keys(d.tried).length + ' / 4</b> · 이 효소의 반응 횟수 <b>' + d.n + '</b>회';
    const ans = TFS.map((q, i) => selVal('tf' + i));
    TFS.forEach((q, i) => { const e = $('#tf' + i); e.classList.toggle('ok', ans[i] === q.a); e.classList.toggle('bad', ans[i] !== '' && ans[i] !== q.a); });
    $('#tfNote').innerHTML = '답한 문장 <b>' + ans.filter((a) => a).length + ' / 6</b>';
    // 설계
    const ds = S.ds; $$('#dsIv button').forEach((b) => b.classList.toggle('on', !!ds.iv[b.dataset.v]));
    // 실행
    const r = S.rn, keys = rnKeys();
    $('#rnIv').textContent = r.iv ? IVS[r.iv].name : '—';
    $('#rnLab').textContent = r.iv ? '측정할 값 (' + IVS[r.iv].name + ')' : '설계판에서 독립 변인을 먼저 골라요';
    $$('#rnVals button').forEach((b) => { b.classList.toggle('on', b.dataset.v === r.sel); const row = r.rows[b.dataset.v]; b.classList.toggle('seen', !!(row && row.done)); b.disabled = rnBusy(); });
    $('#rnGo').disabled = rnBusy() || !r.iv || !r.sel; $('#rnClear').disabled = rnBusy();
    $('#rnNote').innerHTML = r.iv ? '측정한 점 <b>' + rnDonePts() + ' / ' + IVS[r.iv].vals.length + '</b> · 한 값마다 <b>3회</b> 반복하고 평균을 내요.' : '설계 하나만 선택되어 있어야 측정할 수 있어요.';
    // 분석
    const sh = chosenShapes(); AN_KEYS.forEach((k) => { const e = $('#sh_' + k); e.classList.toggle('ok', sh[k] === SHAPE[k]); e.classList.toggle('bad', sh[k] !== '' && sh[k] !== SHAPE[k]); });
    $('#inT').classList.toggle('ok', near(numIn('inT'), 37, 3)); $('#inP').classList.toggle('ok', near(numIn('inP'), 7, 0.6));
    $('#anNote').innerHTML = S.aSub === 'shape' ? '그래프를 눌러 값을 읽을 수 있어요. 내가 측정한 평균은 <b style="color:#d97706">주황 점</b>이에요.' : '그래프의 가장 높은 점의 값을 읽어 적어요.';
  }
  const SHAPE = { temp: 'bell', ph: 'bell', enz: 'line', sub: 'sat' };
  bindModeSeg(setMode);
  $$('#kSub button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setSub(b.dataset.v); }));
  $$('#aSub button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setASub(b.dataset.v); }));
  $('#soReset').addEventListener('click', () => { Sound.click(); soReset(); });
  $$('#dmEnz button').forEach((b) => b.addEventListener('click', () => { if (S.dm.ph !== 'idle') return; S.dm.enz = b.dataset.v; Sound.click(); updateCtl(); }));
  $$('#dmSub button').forEach((b) => b.addEventListener('click', () => { if (S.dm.ph !== 'idle') return; S.dm.sub = b.dataset.v; Sound.click(); updateCtl(); }));
  $('#dmGo').addEventListener('click', () => dmGo());
  TFS.forEach((q, i) => $('#tf' + i).addEventListener('change', updateCtl));
  $$('#dsIv button').forEach((b) => b.addEventListener('click', () => { Sound.click(); b.classList.toggle('on'); dsUpdateFromUI(); onDesignChange(); }));
  $$('#dsCtl button').forEach((b) => b.addEventListener('click', () => { Sound.click(); b.classList.toggle('on'); dsUpdateFromUI(); onDesignChange(); }));
  $$('#dsGrp button').forEach((b) => b.addEventListener('click', () => { Sound.click(); b.classList.toggle('on'); dsUpdateFromUI(); onDesignChange(); }));
  $$('#dsRep button').forEach((b) => b.addEventListener('click', () => { Sound.click(); $$('#dsRep button').forEach((x) => x.classList.toggle('on', x === b)); dsUpdateFromUI(); onDesignChange(); }));
  $('#rnGo').addEventListener('click', () => { Sound.click(); rnGo(); });
  $('#rnClear').addEventListener('click', () => { Sound.click(); const v = S.rn.iv; const sel = S.rn.sel; rnSetIv(v); if (sel && rnKeys().some((k) => k.key === sel)) S.rn.sel = sel; updateCtl(); });
  ['inT', 'inP'].forEach((id) => $('#' + id).addEventListener('input', updateCtl));
  ['sh_temp', 'sh_ph', 'sh_enz', 'sh_sub', 'cc1', 'cc2', 'cc3', 'cc4'].forEach((id) => $('#' + id).addEventListener('change', updateCtl));
  function ensureDesign() {
    if (ivOne() && S.ds.ok) return;
    if (!ivOne()) { dsSetState({ iv: ['temp'], ctl: ['sub', 'enz', 'ph', 'vol', 'time'], grp: ['water', 'boil'], rep: 3 }); SciSim.toast('설계가 없어 기본 설계(온도)를 불러왔어요.', '', 2600); }
  }

  /* =========================================================
     미션
     ========================================================= */
  const ccAns = () => selVal('cc1') === 'down' && selVal('cc2') === 'denat' && selVal('cc3') === 'sat' && selVal('cc4') === 'full';
  const levels = [
    {
      title: '효소의 종류와 특성', short: '종류와 특성', icon: '🗂', phase: '탐구',
      intro: '<p class="si-q">❓ 탐구 질문: 효소가 일을 가장 잘하는 조건은 어떻게 알아낼 수 있을까? 어떤 조건이 더 중요할까?</p><p>🔗 <b>통합과학</b>에서 효소를 생물 촉매로 배우고 카탈레이스 실험으로 온도와 pH의 영향을 보았어요. <b>생명과학 Ⅰ</b>에서는 소화제 실험으로 변인 통제를 연습했어요.</p><p>이번 차시에서는 직접 <b>실험을 설계</b>해 봐요. 먼저 효소를 <b>반응 유형</b>별로 나누고, 모든 효소에 공통인 특성을 정리해요. 효소 이름은 보통 <b>-ase(-아제)</b>로 끝나요.</p>',
      features: ['kinds'],
      setup() { setMode('kinds'); setSub('sort'); },
      recap: '효소는 일으키는 반응에 따라 산화·환원, 전이, 가수분해, 분해(제거), 이성질화, 연결(합성) 효소로 나뉘어요. 효소는 기질 특이성이 있고 반응 전후에 변하지 않아 재사용되며 속도만 빠르게 해요.',
      summary: '<ul><li><b>효소의 종류</b>(반응 유형): 산화·환원 효소(전자·수소 전달: 카탈레이스, 탈수소 효소), 전이 효소(작용기 전달: 키네이스), <b>가수분해 효소</b>(물로 분해: 아밀레이스, 프로테이스, 라이페이스, 리소자임), 분해(제거) 효소(물 없이 분해), 이성질화 효소(모양만 변환: 포도당 ⇌ 과당), 연결(합성) 효소(ATP를 써서 두 분자를 연결: DNA 연결 효소).</li><li><b>효소의 특성</b>: 주성분이 단백질(일부는 RNA), <b>기질 특이성</b>, 최적 온도와 최적 pH가 있음, 반응 전후에 변하지 않아 <b>재사용</b>, 소량으로 작용, 반응 <b>속도만</b> 빠르게 하고 생성물의 양은 늘리지 않음. 일부는 보조 인자(금속 이온, 비타민에서 유래한 조효소)가 필요해요.</li></ul>',
      missions: [
        {
          id: 'sort', title: '효소 12개 분류하기', manual: true,
          goal: '효소 카드 12장을 <b>반응 유형 6개 상자</b>에 알맞게 넣으세요.',
          hint: '카드의 아랫줄과 상자의 설명을 비교해요. 물로 분해하면 가수분해 효소, 수소·전자를 옮기면 산화·환원 효소, ATP를 써서 잇는 것은 연결(합성) 효소예요.',
          setup() { setMode('kinds'); setSub('sort'); },
          check() {
            const so = S.so;
            if (so.placed < 12) { return '아직 상자에 넣지 않은 카드가 ' + (12 - so.placed) + '장 있어요.'; }
            const bad = so.cards.filter((c) => c.zone !== ENZ.find((e) => e.id === c.id).ans);
            so.markBad(bad.map((c) => c.id));
            if (bad.length) return bad.length + '장이 다른 상자에 있어요. 빨간 카드의 설명을 상자의 설명과 비교해 보세요. (예: ' + bad[0].label + ')';
            return true;
          },
          explain: '효소는 <b>일으키는 반응</b>으로 나눠요. 아밀레이스·프로테이스·라이페이스는 물을 이용해 분해하는 <b>가수분해 효소</b>, 카탈레이스·탈수소 효소는 <b>산화·환원 효소</b>, 키네이스는 인산기를 옮기는 <b>전이 효소</b>, DNA 연결 효소는 ATP를 써서 잇는 <b>연결(합성) 효소</b>예요.',
        },
        {
          id: 'tf', title: '효소의 특성 O X', manual: true,
          goal: '효소의 특성에 관한 문장 6개에 <b>O 또는 X</b>를 골라요.',
          hint: '효소는 반응 전후에 변하지 않아요. 최적 pH는 효소마다 달라요: 펩신은 pH 2, 아밀레이스는 pH 7, 트립신은 pH 8 근처예요.',
          setup() { setMode('kinds'); setSub('tf'); },
          check() {
            const miss = TFS.findIndex((q, i) => !selVal('tf' + i));
            if (miss >= 0) return (miss + 1) + '번 문장을 아직 안 골랐어요.';
            const bad = TFS.findIndex((q, i) => selVal('tf' + i) !== q.a);
            if (bad >= 0) return (bad + 1) + '번 문장을 다시 생각해 보세요. ' + (selVal('tf' + bad) === 'O' ? '이 문장은 틀렸어요.' : '이 문장은 맞는 말이에요.');
            return true;
          },
          explain: '효소는 <b>소모되지 않고 재사용</b>되며 소량으로 작용해요. <b>최적 pH는 효소마다 달라서</b> 모두 7이 아니에요. 효소는 시험관에서도 작용하고, 반응 속도만 빠르게 할 뿐 생성물의 양을 늘리지 않으며, 맞는 기질에만 작용해요.',
        },
        {
          type: 'quiz', title: '기질 특이성', goal: '아밀레이스 대신 <b>프로테이스</b>를 넣으면 녹말이 분해되지 않아요. 그 까닭은? (🎬 기질 특이성 화면에서 확인해 보세요)',
          setup() { setMode('kinds'); setSub('demo'); },
          choices: ['프로테이스가 녹말과 반응하면 곧바로 소모되어 사라지기 때문이다', '프로테이스의 활성 부위 모양이 녹말과 맞지 않아 결합하지 못하기 때문이다', '프로테이스는 실온에서 항상 변성되기 때문이다', '녹말은 물에 녹지 않아 어떤 효소도 작용할 수 없기 때문이다'],
          answer: 1,
          feedback: ['효소는 반응해도 소모되지 않고 다시 쓰여요.', '', '실온에서 변성되는 것이 아니라, 맞는 기질이 아니어서예요.', '아밀레이스는 녹말을 분해해요.'],
          explain: '효소의 <b>활성 부위</b>는 특정한 모양의 기질에만 맞아요(<b>기질 특이성</b>). 프로테이스는 단백질에, 아밀레이스는 녹말에만 작용해요.',
        },
      ],
    },
    {
      title: '실험 설계', short: '실험 설계', icon: '📝', phase: '탐구',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 효소는 기질 특이성이 있고 최적 온도와 pH가 있다는 것을 정리했어요.</div><p>이제 효소 활성에 영향을 주는 요인을 알아보는 <b>실험을 설계</b>해요. 카탈레이스(간 즙)는 3 % 과산화 수소 10 mL를 물과 산소로 분해해요. 측정값(<b>종속 변인</b>)은 처음 30초 동안 모인 산소 부피예요.</p><p>바꿀 요인(<b>독립 변인</b>)을 <b>하나만</b> 고르고, 나머지는 모두 <b>같게(통제 변인)</b> 해요. 대조군과 반복 횟수도 정해요. ⚠ 실제 실험에서는 보안경과 장갑을 껴요.</p>',
      features: ['design'],
      setup() { setMode('design'); },
      recap: '좋은 실험은 독립 변인 하나만 바꾸고 나머지(통제 변인)를 같게 해요. 대조군으로 비교 기준을 만들고 3회 이상 반복해 오차를 줄여요.',
      summary: '<ul><li><b>독립 변인</b>(바꾸는 요인): 온도, pH, 효소 농도, 기질 농도 중 <b>하나</b>. <b>종속 변인</b>(측정): 산소 발생량(mL/30초). <b>통제 변인</b>(같게): 나머지 요인과 용액 부피, 측정 시간 등.</li><li><b>대조군</b>: 효소 대신 물, 또는 삶은 간(효소가 변성된 상태)을 넣어 산소 발생이 효소 때문임을 확인해요.</li><li>한 가지 조건을 <b>3회 이상 반복</b>하고 평균을 내면 우연한 오차가 줄어요. 3 % 과산화 수소는 눈·피부에 닿지 않게 보안경과 장갑을 껴요.</li></ul>',
      missions: [
        {
          id: 'design', title: '변인 설계판 완성하기', manual: true,
          goal: '독립 변인 <b>하나</b>를 고르고, <b>통제 변인·대조군·반복 횟수</b>를 정해 설계를 통과하세요.',
          hint: '바꿀 요인을 하나만 고른 뒤, 그 요인을 뺀 나머지 5개를 모두 같게 해요. 대조군은 하나 이상, 반복은 3회 이상이에요. 바꿀 요인 자체는 같게 하는 것이 아니에요.',
          setup() { setMode('design'); },
          check() { const is = evalDesign(); return is.length ? is[0].m : true; },
          explain: '독립 변인 <b>하나만</b> 바꾸고 나머지를 같게 해야 결과의 원인을 알 수 있어요. <b>대조군</b>으로 비교 기준을 만들고, <b>3회 이상 반복</b>해서 평균을 내면 우연한 오차를 줄일 수 있어요.',
        },
        {
          type: 'quiz', title: '왜 하나씩 바꿀까?', goal: '온도와 효소 농도를 <b>한꺼번에</b> 바꾸어 실험하면 안 되는 까닭은?',
          setup() { setMode('design'); },
          choices: ['시험관이 너무 많이 필요하기 때문이다', '산소 발생량이 항상 0이 되기 때문이다', '결과가 달라졌을 때 어떤 요인 때문인지 알 수 없기 때문이다', '효소가 변성되어 실험이 끝나기 때문이다'],
          answer: 2,
          feedback: ['시험관 수는 문제의 핵심이 아니에요.', '산소 발생량이 0이 되는 것은 아니에요.', '', '변성은 높은 온도에서 일어나는 일이고, 실험 설계와는 별개예요.'],
          explain: '두 요인을 함께 바꾸면 결과가 달라져도 <b>어느 요인 때문인지 구별할 수 없어요</b>. 그래서 독립 변인은 하나만 바꾸고 나머지는 통제해요.',
        },
        {
          type: 'quiz', title: '삶은 간의 역할', goal: '효소 대신 <b>삶은 간</b>을 넣은 시험관(대조군)의 역할은?',
          setup() { setMode('design'); },
          choices: ['산소 발생이 간 속 효소(카탈레이스)의 작용 때문임을 확인하는 비교 기준이 된다', '반응 속도를 가장 빠르게 하는 최적 조건을 알려 준다', '과산화 수소의 농도를 더 높여 준다', '온도를 일정하게 유지해 준다'],
          answer: 0,
          feedback: ['', '대조군은 최적 조건을 찾는 장치가 아니라 비교 기준이에요.', '대조군은 농도를 바꾸지 않아요.', '온도를 유지하는 것은 통제 변인의 일이에요.'],
          explain: '삶은 간은 효소가 <b>변성</b>되어 활성이 없어요. 여기서 산소가 거의 나오지 않으면 다른 시험관의 산소 발생이 <b>효소 때문</b>이라고 결론 내릴 수 있어요.',
        },
      ],
    },
    {
      title: '실험 수행', short: '실험 수행', icon: '🧪', phase: '실험',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 독립 변인 하나를 골라 통제 변인과 대조군을 정했어요.</div><p>설계한 대로 실험해요. 값을 고르고 <b>▶ 3회 측정</b>을 누르면 한 값마다 같은 실험을 3번 하고 <b>평균</b>을 구해요. 평균은 그래프의 점으로 날아가요. 실험 시간은 빨리 감기로 보여 줘요.</p><p>표의 숫자는 모두 <b>가상 예시</b>예요. 값마다 ±0.3 mL 정도의 오차가 있어요.</p>',
      features: ['run'],
      setup() { ensureDesign(); setMode('run'); },
      recap: '한 조건을 3번 측정해 평균을 내면 오차 범위를 알 수 있어요. 평균을 점으로 찍으면 요인과 활성의 관계가 그래프로 드러나요.',
      summary: '<ul><li>한 값마다 <b>3회 측정</b>한 뒤 <b>평균</b>을 계산해요. 최댓값과 최솟값의 차이는 <b>오차 범위</b>의 크기를 알려 줘요.</li><li>대조군(효소 대신 물, 삶은 간)에서는 산소가 거의 나오지 않아야 해요.</li><li>값 하나가 다른 두 값과 크게 다르면 평균에 그냥 넣지 말고 <b>원인을 점검한 뒤 다시 측정</b>해요.</li></ul>',
      missions: [
        {
          id: 'run', title: '5점 이상 측정하기',
          goal: '선택한 요인의 값을 <b>5가지 이상</b> 골라 각각 <b>3회씩</b> 측정하세요. (대조군도 한 번 측정해 보세요)',
          hint: '오른쪽의 값 버튼(또는 표의 행)을 누르고 ▶ 3회 측정을 눌러요. 측정이 끝나면 평균이 그래프의 점으로 날아가요. 이어서 다른 값을 골라 반복해요.',
          setup() { ensureDesign(); setMode('run'); },
          check: () => rnDonePts() >= 5 && !rnBusy(), hold: 0.6,
          status: () => mark(rnDonePts() >= 5) + ' 측정한 점 ' + rnDonePts() + ' / 5 (값마다 3회 · 평균) &nbsp; ' + mark(rnKeys().some((k) => k.ctl && S.rn.rows[k.key] && S.rn.rows[k.key].done)) + ' 대조군 측정',
          explain: '값마다 <b>3회 측정한 평균</b>을 구했어요. 평균과 함께 최댓값·최솟값의 범위를 보면 측정의 오차를 알 수 있어요. 대조군은 거의 <b>0 mL</b>라서 산소 발생이 효소 때문임을 확인해 줘요.',
        },
        {
          type: 'quiz', title: '튀는 측정값', goal: '같은 조건에서 3회 측정했더니 8.8, 8.9, <b>5.0</b>이 나왔어요. 가장 알맞은 행동은?',
          setup() { ensureDesign(); setMode('run'); },
          choices: ['5.0도 그대로 넣어 평균을 내고 끝낸다', '8.9만 골라 결과로 쓴다', '원인(기체가 샌 곳, 시간 측정 등)을 점검하고 다시 측정한다', '결과가 틀렸으니 가설을 바꾼다'],
          answer: 2,
          feedback: ['튀는 값이 있으면 평균이 왜곡돼요.', '마음에 드는 값만 고르면 안 돼요.', '', '한 번의 이상한 값만으로 가설을 바꾸면 안 돼요.'],
          explain: '혼자 크게 다른 값은 측정 실수일 수 있어요. <b>원인을 점검하고 다시 측정</b>해서 확인해요. 결과를 마음대로 골라 쓰면 안 돼요.',
        },
      ],
    },
    {
      title: '결과 분석', short: '결과 분석', icon: '📊', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 한 요인의 값을 바꿔 가며 산소 발생량을 3회씩 측정했어요.</div><p>이번에는 <b>네 요인</b>(온도·pH·효소 농도·기질 농도)의 그래프를 한 화면에서 비교해요. 그래프를 눌러 값을 읽을 수 있고, 내가 측정한 평균은 주황 점으로 겹쳐 보여요.</p><p>곡선의 <b>모양</b>이 요인마다 다른 까닭을 생각해 봐요. 참고 자료는 3회 평균을 모은 <b>가상 예시</b>이고, 시료마다 같은 조건이어도 ±0.5 mL 정도 달라질 수 있어요.</p>',
      features: ['analyze'],
      setup() { setMode('analyze'); setASub('shape'); },
      recap: '온도와 pH 곡선은 최적값이 있는 종 모양, 효소 농도는 직선(기질이 충분할 때), 기질 농도는 포화 곡선이에요. 고온에서 활성이 급감하는 것은 변성 때문이에요.',
      summary: '<ul><li><b>온도</b>: 최적 온도(사람의 효소는 약 37 °C)까지는 활성이 커지다가 그보다 높으면 단백질이 <b>변성</b>되어 급격히 감소해요. <b>pH</b>: 효소마다 최적 pH가 있어요(펩신 약 2, 아밀레이스 약 7, 트립신 약 8).</li><li><b>효소 농도</b>: 기질이 충분하면 효소 양에 <b>비례</b>(직선). <b>기질 농도</b>: 처음엔 비례하다가 모든 효소가 기질과 결합하면 더 늘지 않는 <b>포화 곡선</b>(다음 차시).</li><li>결론은 <b>독립 변인 → 결과 → 이유</b> 순서로 써요.</li></ul>',
      missions: [
        {
          id: 'shape', title: '곡선 모양 맞히기', manual: true,
          goal: '네 요인의 그래프 모양을 <b>종 모양 · 직선 · 포화 곡선</b> 중에서 골라요.',
          hint: '온도와 pH는 최적값에서 가장 높아요. 효소 농도는 0, 2.5, 5.0… 일정하게 늘어요. 기질 농도는 처음엔 빨리 늘다가 10 근처에서 일정해져요.',
          setup() { setMode('analyze'); setASub('shape'); },
          check() {
            const sh = chosenShapes(); const miss = AN_KEYS.find((k) => !sh[k]);
            if (miss) return IVS[miss].name + ' 그래프의 모양을 골라 주세요.';
            const bad = AN_KEYS.find((k) => sh[k] !== SHAPE[k]);
            if (bad) return IVS[bad].name + ' 그래프를 다시 살펴보세요. 점들이 어떻게 이어지나요?';
            return true;
          },
          explain: '<b>온도·pH</b>는 최적값에서 최대인 종 모양, <b>효소 농도</b>는 기질이 충분할 때 비례하는 직선, <b>기질 농도</b>는 효소가 모두 쓰이면 일정해지는 포화 곡선이에요.',
        },
        {
          id: 'read', title: '최적값 읽고 결론 쓰기', manual: true,
          goal: '그래프에서 <b>최적 온도와 최적 pH</b>를 읽어 쓰고, 결론 문장 2개를 완성하세요.',
          hint: '온도 그래프와 pH 그래프에서 가장 높은 점의 가로 값을 읽어요. 점을 눌러 값을 확인할 수 있어요. 고온에서 줄어드는 까닭은 단백질의 변성이에요.',
          setup() { setMode('analyze'); setASub('read'); },
          check() {
            const t = numIn('inT'), p = numIn('inP');
            if (!isFinite(t) || !isFinite(p)) return '최적 온도와 최적 pH를 모두 써 주세요.';
            if (!near(t, 37, 3)) return '온도 그래프에서 산소 발생량이 가장 많은 점의 온도를 다시 읽어 보세요.';
            if (!near(p, 7, 0.6)) return 'pH 그래프에서 산소 발생량이 가장 많은 점의 pH를 다시 읽어 보세요.';
            if (!selVal('cc1') || !selVal('cc2') || !selVal('cc3') || !selVal('cc4')) return '결론 문장의 빈칸을 모두 골라 주세요.';
            if (!ccAns()) return '결론 문장을 다시 읽어 보세요. 결과(무엇이 어떻게 변하는가)와 이유가 어울리는지 살펴요.';
            return true;
          },
          explain: '간 카탈레이스의 최적 온도는 약 <b>37 °C</b>, 최적 pH는 약 <b>7</b>이에요. 최적 온도보다 높으면 단백질이 <b>변성</b>되어 활성이 급감하고, 기질을 계속 늘리면 모든 효소가 기질과 결합해 <b>포화</b>되어 속도가 일정해져요.',
        },
        {
          type: 'quiz', title: '그래프 해석', goal: '네 그래프를 해석한 설명으로 <b>옳은 것</b>은?',
          setup() { setMode('analyze'); },
          choices: ['기질 농도를 계속 높이면 반응 속도도 한없이 비례하여 증가한다', '효소 농도를 2배로 하면 기질의 양과 관계없이 항상 속도가 2배가 된다', '최적 온도보다 높은 온도에서 활성이 급감하는 것은 효소 단백질이 변성되기 때문이다', '삶은 간을 넣은 대조군에서 산소가 가장 많이 발생한다'],
          answer: 2,
          feedback: ['기질 농도 그래프는 일정해지는 포화 곡선이에요.', '기질이 충분해야 효소 농도에 비례해요.', '', '삶은 간은 효소가 변성되어 산소가 거의 나오지 않아요.'],
          explain: '높은 온도에서는 효소의 입체 구조가 무너지는 <b>변성</b>이 일어나 활성 부위가 기질과 맞지 않아요. 기질 농도 그래프는 <b>포화</b>되고, 효소 농도에 비례하는 것은 <b>기질이 충분할 때</b>만이에요.',
        },
      ],
    },
  ];

  makeSorter(); evalDesign(); rnBuildChips();
  game = SciSim.game({
    simId: 'hy-enzyme-factors', mount: '#game', badge: '효소 실험 설계가', homeHref: '../../index.html#hy',
    featureLabels: { kinds: '🗂 효소 분류 · 기질 특이성', design: '📝 변인 설계판', run: '🧪 카탈레이스 실험 장치', analyze: '📊 네 요인 그래프' },
    onFeatures() { updateCtl(); },
    levels,
  });

  function readouts() {
    const m = S.mode;
    if (m === 'kinds') setReads(['분류한 카드', S.so.placed + ' / 12', '맞게 놓은 카드', soRight() + ' / ' + S.so.placed, '효소 유형', '6가지']);
    else if (m === 'design') { const iv = ivList(); setReads(['바꿀 요인', iv.length ? iv.map((k) => IVS[k].name).join(' + ') : '—', '같게 한 요인', Object.keys(CTL).filter((k) => S.ds.ctl[k]).length + '개', '설계 점검', S.ds.ok ? '통과' : S.ds.issues.length + '가지 지적']); }
    else if (m === 'run') { const row = S.rn.rows[S.rn.sel]; setReads(['측정한 점', rnDonePts() + ' / ' + (S.rn.iv ? IVS[S.rn.iv].vals.length : '—'), '지금 값', S.rn.sel ? (rnKeys().find((k) => k.key === S.rn.sel) || { lab: '—' }).lab : '—', '평균 (mL/30초)', row && row.done ? fv(row.mean) : '—']); }
    else { const sl = S.an.sel; setReads(['고른 그래프', sl ? IVS[sl.k].name : '—', '읽은 값', sl ? valTxt(sl.k, IVS[sl.k].vals[sl.i]) : '—', '산소 발생량', sl ? fv(IVS[sl.k].data[sl.i]) + ' mL/30초' : '—']); }
  }

  setMode('kinds');
  let lastFree = false, lastLv = -1;
  SciSim.loop((dt, t) => {
    clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (game && game.level !== lastLv) { lastLv = game.level; updateCtl(); }
    view.apply(); FX.update(dt); ctx.clearRect(0, 0, VW, VH);
    bgFill('#f3f6ee', '#e8eee2');
    updLater(dt);
    if (S.mode !== 'run') rnUpdate(dt);
    if (S.mode === 'kinds') { if (S.sub === 'sort') sortDraw(dt, t); else dmDraw(dt, t); if (S.sub === 'sort') dmStep(dt); }
    else if (S.mode === 'design') { dsDraw(dt, t); dmStep(dt); }
    else if (S.mode === 'run') { rnDraw(dt, t); dmStep(dt); }
    else { anDraw(dt, t); dmStep(dt); }
    FX.draw(); parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(241,246,243,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : approach(S.fade, 0, dt, 9); }
    readouts();
  });

  const rnFlush = () => { let n = 0; while (S.rn.phase !== 'idle' && n++ < 2000) rnUpdate(0.1); };
  window.__sim = { rnFlush, S, VW, VH, PHONE, get game() { return game; }, levels, setMode, setSub, setASub, dsSetState, evalDesign, rnGo, rnKeys, rnBusy, rnDonePts, dmGo, soReset, ENZ, TYPES, TFS, IVS, ensureDesign, updateCtl, rnSetIv, anEnter };
})();
