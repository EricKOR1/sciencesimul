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
     고등학교 세포와 물질대사 · Ⅱ. 물질대사와 에너지 - 효소의 작용 기작 (단원 57, 5차시)
     성취기준 [12세포02-04] 효소의 작용 기작을 이해하고, 생명체 내에서 일어나는 효소 작용의 중요성에 대해 다양한 매체를 활용하여 협력적으로 소통할 수 있다.
     ① 모형: 활성화 에너지  ② 모형: 복합체 형성  ③ 분석: 속도와 포화  ④ 예측: 예측하기
     ========================================================= */
  const S = { mode: 'energy', fade: 0, grp: 'none' };
  let game = null;
  const fi = (v) => String(Math.round(v));
  const KM = 2, VMAX = 100;
  const SLEVS = [0.5, 1, 2, 4, 8, 16, 32];
  const rateOf = (E, s, a) => Math.round(VMAX * E * (a == null ? 1 : a) * s / (s + KM));
  const sTxt = (v) => (v < 1 ? '0.5' : String(v));

  /* =========================================================
     ① 활성화 에너지 (에너지 언덕과 구슬)
     ========================================================= */
  const EN_R = 40, EN_P = 20, EA0 = 50, EA1 = 20;
  S.en = { enz: false, temp: 37, ea: new Num(EA0), marbles: [], prods: [], outs: [], total: 0, meas: null, res: { no: null, yes: null }, flush: 0, read: false, attempts: 0 };
  const enG = () => (PHONE
    ? { P: { x: 10, y: 10, w: 460, h: 430 }, x0: 66, xa: 188, xp: 254, xb: 320, xe: 458, yb: 396, sc: 3.1, r: 6.5, B: { x: 10, y: 450, w: 460, h: 182 }, nres: 5 }
    : { P: { x: 14, y: 14, w: 772, h: 424 }, x0: 92, xa: 298, xp: 428, xb: 558, xe: 770, yb: 392, sc: 3.25, r: 9.5, B: { x: 14, y: 446, w: 772, h: 100 }, nres: 5 });
  const EnY = (E) => { const g = enG(); return g.yb - E * g.sc; };
  const kTof = (T) => 9 * (T + 273) / 310;
  const actOf = (T) => 1 / (1 + Math.exp((T - 52) / 3));
  const eaEff = () => (S.en.enz ? EA0 - (EA0 - EA1) * actOf(S.en.temp) : EA0);
  function curveE(x, hp) {
    const g = enG();
    if (x <= g.xa) return EN_R;
    if (x < g.xp) return EN_R + (hp - EN_R) * (0.5 - 0.5 * Math.cos(Math.PI * (x - g.xa) / (g.xp - g.xa)));
    if (x < g.xb) return hp - (hp - EN_P) * (0.5 - 0.5 * Math.cos(Math.PI * (x - g.xp) / (g.xb - g.xp)));
    return EN_P;
  }
  const N_MARB = 10;
  function enRestX(i) { const g = enG(); const n = nMarb(), w = g.xa - 10 - (g.x0 + 4); return g.x0 + 4 + (i + 0.5) * (w / n); }
  function enInit() {
    const e = S.en; e.marbles = []; e.prods = []; e.outs = [];
    const n = nMarb();
    for (let i = 0; i < n; i++) e.marbles.push({ slot: i, st: 'rest', timer: 0.3 + Math.random() * 1.6, t: 0, e: 0, alpha: 1, x: enRestX(i), y: 0, ok: false, from: 0 });
  }
  const nMarb = () => (PHONE ? 8 : N_MARB);
  const prodX = (i) => enG().xb + 28 + i * (PHONE ? 22 : 30);
  function enUpdate(dt) {
    const e = S.en, g = enG();
    e.ea.set(eaEff()); e.ea.update(dt, 5);
    const n = nMarb(), kT = kTof(e.temp);
    e.marbles.slice().forEach((m) => {
      if (m.alpha < 1) m.alpha = Math.min(1, m.alpha + dt * 2.5);
      if (m.st === 'rest') {
        m.timer -= dt;
        m.x = approach(m.x, enRestX(m.slot), dt, 8);
        if (m.timer <= 0) {
          m.timer = (n / 12) * (0.5 + Math.random());
          const en = -kT * Math.log(Math.max(1e-6, Math.random()));
          if (en < 1.2) return;
          m.e = en; m.t = 0; e.attempts++;
          m.ok = en >= eaEff();
          m.st = m.ok ? 'cross' : 'hop'; m.from = m.x;
        }
      } else if (m.st === 'hop') {
        m.t += dt; if (m.t >= Math.min(0.8, 0.2 + 0.07 * Math.sqrt(m.e))) { m.st = 'rest'; m.t = 0; }
      } else if (m.st === 'cross') {
        m.t += dt;
        if (!m.cnt && m.t >= (RM ? 0.2 : 1.1)) { m.cnt = true; e.total++; if (e.meas) e.meas.cnt++; Sound.tick(); }
        if (m.t >= (RM ? 0.2 : 1.7)) {
          e.marbles.splice(e.marbles.indexOf(m), 1);
          m.x = prodX(Math.min(e.prods.length, g.nres - 1)); m.st = 'prod'; m.alpha = 1; e.prods.push(m);
          if (e.prods.length > g.nres) { const old = e.prods.shift(); old.out = 0; e.outs.push(old); }
          const used = e.marbles.map((q) => q.slot);
          for (let k = 0; k < n; k++) if (used.indexOf(k) < 0) { e.marbles.push({ slot: k, st: 'rest', timer: 0.4 + Math.random(), t: 0, e: 0, alpha: 0, x: enRestX(k), y: 0, ok: false, from: 0 }); break; }
        }
      }
    });
    e.prods.forEach((m, i) => { m.x = approach(m.x, prodX(i), dt, 6); });
    for (let i = e.outs.length - 1; i >= 0; i--) { const o = e.outs[i]; o.out += dt; o.x += dt * 30; if (o.out > 0.6) e.outs.splice(i, 1); }
    if (e.meas) { e.meas.t += dt; if (e.meas.t >= e.meas.dur) { e.res[e.enz ? 'yes' : 'no'] = { n: e.meas.cnt, T: e.temp, enz: e.enz }; e.meas = null; Sound.success(); updateCtl(); } }
  }
  function enMarbleXY(m) {
    const g = enG(), e = S.en, hp = EN_R + e.ea.v;
    if (m.st === 'rest') return { x: m.x, y: EnY(EN_R) - g.r };
    if (m.st === 'hop') { const dur = Math.min(0.8, 0.2 + 0.07 * Math.sqrt(m.e)), p = clamp(m.t / dur, 0, 1); return { x: m.x, y: EnY(EN_R + m.e * 4 * p * (1 - p)) - g.r }; }
    if (m.st === 'cross') {
      const p = clamp(m.t / (RM ? 0.2 : 1.7), 0, 1), q = p < 0.18 ? 0 : (p - 0.18) / 0.82;
      const xEnd = prodX(Math.min(e.prods.length, g.nres - 1)), x = m.from + (xEnd - m.from) * SciSim.ease.inOutQuad(q);
      const u0 = p / 0.18, hump = p < 0.18 ? m.e * 4 * u0 * (1 - u0) : 0;   // 도약
      return { x, y: EnY(curveE(x, hp) + hump) - g.r };
    }
    return { x: m.x, y: EnY(EN_P) - g.r };
  }
  function enDraw(dt, t) {
    enUpdate(dt);
    const e = S.en, g = enG(), P = g.P, hp = EN_R + e.ea.v, tmp = e.temp;
    panel(P.x, P.y, P.w, P.h, 18, '#fcfdf9');
    T_(P.x + 16, P.y + 28, '에너지 언덕을 넘어야 반응이 일어나요', L(17, 14.5));
    // 축
    ctx.save(); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(g.x0 - 8, EnY(100)); ctx.lineTo(g.x0 - 8, EnY(0)); ctx.lineTo(g.xe, EnY(0)); ctx.stroke(); ctx.restore();
    [0, 20, 40, 60, 80, 100].forEach((v) => { ctx.strokeStyle = '#eef2f7'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(g.x0 - 8, EnY(v)); ctx.lineTo(g.xe, EnY(v)); ctx.stroke(); T(g.x0 - 14, EnY(v) + 4.5, String(v), 12.5, '#64748b', 'right', 700); });
    T(g.x0 - 8, EnY(100) - 10, '에너지 (상대값)', L(13, 12), '#475569', 'left', 800);
    // 지형 (효소 없을 때 언덕을 흐릿하게)
    const path = (hh) => { ctx.beginPath(); ctx.moveTo(g.x0 - 8, EnY(0)); for (let x = g.x0 - 8; x <= g.xe; x += 4) ctx.lineTo(x, EnY(curveE(Math.max(x, g.x0), hh))); ctx.lineTo(g.xe, EnY(0)); ctx.closePath(); };
    if (e.ea.v < EA0 - 1) { ctx.save(); ctx.setLineDash([6, 5]); ctx.strokeStyle = 'rgba(100,116,139,.6)'; ctx.lineWidth = 2; ctx.beginPath(); for (let x = g.x0 - 8; x <= g.xe; x += 4) { const yy = EnY(curveE(Math.max(x, g.x0), EN_R + EA0)); if (x === g.x0 - 8) ctx.moveTo(x, yy); else ctx.lineTo(x, yy); } ctx.stroke(); ctx.restore(); T(g.xp + 6, EnY(EN_R + EA0) - 6, '효소 없을 때 언덕', 12.5, '#64748b', 'center', 700); }
    path(hp); const gr = ctx.createLinearGradient(0, EnY(hp), 0, EnY(0)); gr.addColorStop(0, '#d9e6d2'); gr.addColorStop(1, '#bcd0b5'); ctx.fillStyle = gr; ctx.fill();
    ctx.strokeStyle = e.enz ? '#16a34a' : '#64748b'; ctx.lineWidth = 3.5; ctx.lineJoin = 'round'; ctx.beginPath(); for (let x = g.x0 - 8; x <= g.xe; x += 3) { const yy = EnY(curveE(Math.max(x, g.x0), hp)); if (x === g.x0 - 8) ctx.moveTo(x, yy); else ctx.lineTo(x, yy); } ctx.stroke();
    // 에너지 수준선
    D.dashedLine(g.x0 - 8, EnY(EN_R), g.xa + 10, EnY(EN_R), { color: '#2563eb', width: 1.6 });
    T(g.x0 + 4, EnY(EN_R) + (PHONE ? 18 : 22), '반응물', L(15, 13), '#1d4ed8', 'left', 800);
    D.dashedLine(g.xb - 4, EnY(EN_P), g.xe, EnY(EN_P), { color: '#16a34a', width: 1.6 });
    T(g.xe - 6, EnY(EN_P) + (PHONE ? 18 : 22), '생성물', L(15, 13), '#166534', 'right', 800);
    // 활성화 에너지 화살표
    const ax = g.xa + 4;
    D.dashedLine(ax - 6, EnY(hp), g.xp, EnY(hp), { color: '#dc2626', width: 1.6 });
    D.arrow(ax, EnY(EN_R) - 2, ax, EnY(hp) + 4, { color: '#dc2626', width: 3, head: 10 });
    D.label(ax + (PHONE ? 30 : 36), EnY((EN_R + hp) / 2) - 2, '활성화 에너지' + (S.en.read ? ' ' + fi(e.ea.v) : ''), { bg: '#dc2626', size: L(13.5, 12) });
    // 반응 에너지 차이 (변하지 않음)
    const dx = g.xe - 8;
    D.dashedLine(g.xb + 4, EnY(EN_R), dx, EnY(EN_R), { color: '#94a3b8', width: 1.2 });
    D.arrow(dx, EnY(EN_R) + 2, dx, EnY(EN_P) - 4, { color: '#475569', width: 2.4, head: 8 });
    T(dx - 8, (EnY(EN_R) + EnY(EN_P)) / 2 + 2, '에너지 차이', L(13, 11.5), '#475569', 'right', 800);
    T(dx - 8, (EnY(EN_R) + EnY(EN_P)) / 2 + 18, '(변하지 않아요)', L(12.5, 11), '#64748b', 'right', 700);
    // 구슬
    const heat = clamp((tmp - 37) / 43, 0, 1), col = C.mix('#3b82f6', '#ef4444', heat * 0.8);
    e.marbles.forEach((m) => {
      const q = enMarbleXY(m); let c = col;
      if (m.st === 'cross') { const f = clamp((q.x - g.xp) / (g.xb - g.xp), 0, 1); c = C.mix(col, '#22c55e', f); }
      ctx.save(); ctx.globalAlpha = m.alpha;
      if (m.st === 'hop' || m.st === 'cross') D.glow(q.x, q.y, g.r * 2, m.ok ? '#facc15' : '#93c5fd', 0.45);
      D.sphere(q.x, q.y, g.r, c, { gloss: true, shadow: true }); ctx.restore();
    });
    e.prods.forEach((m) => { D.sphere(m.x, EnY(EN_P) - g.r, g.r, '#22c55e', { gloss: true, shadow: true }); });
    e.outs.forEach((m) => { ctx.save(); ctx.globalAlpha = Math.max(0, 1 - m.out / 0.6); D.sphere(m.x, EnY(EN_P) - g.r, g.r, '#22c55e', { gloss: true }); ctx.restore(); });
    // 효소 표시
    if (e.enz) { const bx = g.xp, by = EnY(hp) - 46; ctx.save(); ctx.globalAlpha = 0.95; D.label(bx, by, '🔑 효소가 언덕을 낮춰요', { bg: '#16a34a', size: L(13.5, 12) }); ctx.restore(); }
    // 열 표시
    if (tmp > 40) T(g.x0 + 4, EnY(100) + 18, '🔥 열 에너지가 많아요 · 구슬이 더 높이 뛰어요', 13, '#b91c1c', 'left', 800);
    // 측정 막대
    const B = g.B; panel(B.x, B.y, B.w, B.h, 18, '#fff');
    T(B.x + 16, B.y + 26, e.meas ? '측정 중… ' + fi(Math.max(0, e.meas.dur - e.meas.t) + 0.49) + '초 남음' : '10초 동안 생긴 생성물 수', L(15.5, 13.5), '#1f2d44', 'left', 800);
    const bars = [['효소 없음', 'no', '#64748b'], ['효소 있음', 'yes', '#16a34a']];
    const mx = Math.max(12, (e.res.no ? e.res.no.n : 0), (e.res.yes ? e.res.yes.n : 0), e.meas ? e.meas.cnt : 0);
    const bx0 = B.x + L(110, 96), bw = B.w - L(110, 96) - 60;
    bars.forEach((b, i) => {
      const y = B.y + L(42, 40) + i * L(26, 28), r = e.res[b[1]], live = e.meas && ((e.enz ? 'yes' : 'no') === b[1]), v = live ? e.meas.cnt : (r ? r.n : 0);
      T(B.x + 16, y + 14, b[0], L(14.5, 13), '#26324a', 'left', 800);
      D.roundRect(bx0, y, bw, 18, 9); ctx.fillStyle = '#eef2f7'; ctx.fill();
      if (v > 0) { D.roundRect(bx0, y, Math.max(18, bw * v / mx), 18, 9); ctx.fillStyle = b[2]; ctx.fill(); }
      T(bx0 + bw + 8, y + 14, (live || r) ? v + '개' : '—', L(14.5, 13), '#26324a', 'left', 800);
    });
  }
  const T_ = (x, y, s, size) => T(x, y, s, size, '#1f2d44', 'left', 800);
  function enGo() {
    const e = S.en; if (e.meas) return false;
    e.meas = { t: 0, dur: 10, cnt: 0 }; Sound.tick(); updateCtl(); return true;
  }
  function enFlush(sec) { const n = Math.ceil(sec / 0.05); for (let i = 0; i < n; i++) enUpdate(0.05); }
  function enSetEnz(v) { const e = S.en; e.enz = !!v; e.meas = null; Sound.click(); updateCtl(); }

  /* =========================================================
     ② 복합체 형성 (열쇠–자물쇠 / 유도 적합)
     ========================================================= */
  S.cx = { model: 'induced', sub: 'S', ph: 'idle', t: 0, n: 0, tries: 0, total: 0, jaw: new SciSim.Spring(0, { stiffness: 150, damping: 13 }), x: 0, seen: {}, glow: 0, burst: false, msg: '', ids: 0 };
  const CXK = () => (PHONE ? 0.6 : 1);
  const cxG = () => { const k = CXK(); return PHONE ? { k, P: { x: 10, y: 10, w: 460, h: 330 }, cx: 120, cy: 175, B: { x: 10, y: 348, w: 460, h: 284 } } : { k, P: { x: 14, y: 14, w: 772, h: 330 }, cx: 214, cy: 186, B: { x: 14, y: 352, w: 772, h: 194 } }; };
  const gapOf = (model, g) => (model === 'lock' ? 34 : 54) * g.k;
  function cxInit() { const c = S.cx, g = cxG(); c.jaw.value = c.jaw.target = gapOf(c.model, g); c.jaw.velocity = 0; c.x = g.cx + 330 * g.k; }
  function cxSubDims(sub, k) { return sub === 'S' ? { ra: 13 * k, rb: 13 * k, d: 28 * k } : sub === 'near' ? { ra: 13 * k, rb: 21 * k, d: 36 * k } : { ra: 30 * k, rb: 0, d: 0 }; }
  function cxStop(sub, model, g) {
    const k = g.k, cx = g.cx;
    if (sub === 'S') return cx + 34 * k;
    if (sub === 'near') return model === 'lock' ? cx + 64 * k : cx + 34 * k;
    return model === 'lock' ? cx + 120 * k : cx + 100 * k;
  }
  function cxGo() {
    const c = S.cx; if (c.ph !== 'idle') return false;
    const g = cxG(); c.ph = 'in'; c.t = 0; c.tries++; c.seen[c.model + c.sub] = true; c.msg = ''; c.x = g.cx + 330 * g.k; c.cur = { sub: c.sub, model: c.model };
    Sound.tick(); updateCtl(); return true;
  }
  function cxReset() { const c = S.cx; c.ph = 'idle'; c.n = 0; c.tries = 0; c.ids++; c.glow = 0; c.msg = ''; cxInit(); Sound.click(); updateCtl(); }
  function cxSetModel(m) { const c = S.cx; if (c.ph !== 'idle') return; c.model = m; c.jaw.target = gapOf(m, cxG()); updateCtl(); }
  function cxStep(dt) {
    const c = S.cx, g = cxG(), k = g.k, cur = c.cur || { sub: c.sub, model: c.model };
    c.jaw.update(dt); c.glow = approach(c.glow, 0, dt, 2.5);
    if (c.ph === 'idle') { c.jaw.target = gapOf(c.model, g); return; }
    c.t += dt * (RM ? 6 : 1);
    const sub = cur.sub, model = cur.model, stop = cxStop(sub, model, g), start = g.cx + 330 * k;
    const match = sub === 'S';
    const dur = { in: 1.3, close: model === 'induced' ? 0.55 : 0.2, strain: 0.6, split: 0.45, out: 1.2, jam: 0.7, back: 1.0 }[c.ph];
    if (c.ph === 'in') { c.x = lerp(start, stop, SciSim.ease.inOutCubic(clamp(c.t / dur, 0, 1))); if (model === 'induced') c.jaw.target = 54 * k; }
    if (c.ph === 'close') { c.jaw.target = match ? 34 * k : 43 * k; }
    if (c.ph === 'back') { c.x = lerp(stop, start, SciSim.ease.inOutCubic(clamp(c.t / dur, 0, 1))); c.jaw.target = gapOf(model, g); }
    if (c.ph === 'out') c.jaw.target = gapOf(model, g);
    if (c.t >= dur) {
      c.t = 0;
      if (c.ph === 'in') { if (match) { c.ph = 'close'; } else if (sub === 'near' && model === 'induced') c.ph = 'close'; else { c.ph = 'jam'; Sound.fail(); c.msg = sub === 'near' ? '비슷하지만 입구에서 막혀요: 활성 부위에 맞지 않아요' : '전혀 다른 모양이라 들어가지 못해요'; } }
      else if (c.ph === 'close') { if (match) { c.ph = 'strain'; c.glow = 1; Sound.click(); c.msg = '효소–기질 복합체(ES) 형성'; } else { c.ph = 'jam'; Sound.fail(); c.msg = '꼭 맞춰지지 않아 반응이 일어나지 않아요'; } }
      else if (c.ph === 'strain') { c.ph = 'split'; Sound.success(); const q = cxPos(g); parts.burst(q.ax + 14 * k, g.cy, { count: 14, colors: ['#facc15', '#fff', '#86efac'], speed: 100, life: 0.6, gravity: 0 }); }
      else if (c.ph === 'split') { c.ph = 'out'; c.msg = '생성물이 떨어져 나가고 효소는 원래 모양으로 돌아와요'; }
      else if (c.ph === 'out') { c.ph = 'idle'; c.n++; c.total++; c.glow = 1; c.msg = '반응 ' + c.n + '회 완료! 같은 효소가 다시 쓰여요'; updateCtl(); }
      else if (c.ph === 'jam') { c.ph = 'back'; }
      else if (c.ph === 'back') { c.ph = 'idle'; c.x = start; updateCtl(); }
    }
  }
  function cxPos(g) {
    const c = S.cx, k = g.k, cur = c.cur || { sub: c.sub }, dm = cxSubDims(cur.sub, k), p = clamp(c.t / (c.ph === 'out' ? 1.2 : 1), 0, 1);
    let ax = c.x, ay = g.cy, bx = c.x + dm.d, by = g.cy, split = 0;
    if (c.ph === 'split') split = SciSim.ease.outCubic(clamp(c.t / 0.45, 0, 1)) * 6 * k;
    if (c.ph === 'out') {
      const base = g.cx + 34 * k, bb = base + 28 * k + 6 * k;
      const pb = SciSim.ease.inOutCubic(clamp(p / 0.7, 0, 1)), pa = SciSim.ease.inOutCubic(clamp((p - 0.25) / 0.75, 0, 1));
      bx = lerp(bb, g.cx + 250 * k, pb); by = lerp(g.cy, g.cy + 70 * k, pb);
      ax = lerp(base, g.cx + 215 * k, pa); ay = lerp(g.cy, g.cy - 70 * k, pa);
    } else if (c.ph === 'split') { bx += split; ax -= split * 0; }
    return { ax, ay, bx, by, dm, split };
  }
  function lobe(x, y, r, col, o) { D.sphere(x, y, r, col, Object.assign({ gloss: true, shadow: true }, o || {})); }
  function hexa(x, y, r, col) {
    ctx.save(); ctx.translate(x, y);
    D.shadow(() => { ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + Math.PI / 6; const px = Math.cos(a) * r, py = Math.sin(a) * r; if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); } ctx.closePath(); const gr = ctx.createLinearGradient(-r, -r, r, r); gr.addColorStop(0, C.shade(col, 0.4)); gr.addColorStop(1, col); ctx.fillStyle = gr; ctx.fill(); }, { blur: 6, y: 2 });
    ctx.strokeStyle = C.shade(col, -0.3); ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
  }
  function cxDraw(dt, t) {
    cxStep(dt);
    const c = S.cx, g = cxG(), k = g.k, P = g.P, cx = g.cx, cy = g.cy, gap = c.jaw.value, cur = c.cur || { sub: c.sub, model: c.model };
    panel(P.x, P.y, P.w, P.h, 18, '#fbfdff');
    T(P.x + 16, P.y + 28, '🔍 입자 모형: ' + (c.model === 'lock' ? '열쇠–자물쇠 모형' : '유도 적합 모형'), L(17, 14.5), '#1f2d44', 'left', 800);
    // 효소 몸체
    const ec = '#38bdf8', rx = 105 * k, ry = 96 * k, jr = 34 * k, jx = cx + 78 * k;
    D.glow(cx + 20 * k, cy, 150 * k, '#16a34a', c.glow * 0.4);
    D.shadow(() => { ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, TAU); const gr = ctx.createRadialGradient(cx - 40 * k, cy - 40 * k, 10, cx, cy, rx); gr.addColorStop(0, C.shade(ec, 0.5)); gr.addColorStop(0.6, ec); gr.addColorStop(1, C.shade(ec, -0.3)); ctx.fillStyle = gr; ctx.fill(); }, { blur: 12, y: 4 });
    // 활성 부위 통로
    D.roundRect(cx - 6 * k, cy - gap / 2, 124 * k, gap, 8 * k); ctx.fillStyle = C.shade(ec, -0.55); ctx.fill();
    // 턱
    [-1, 1].forEach((sg) => {
      const jy = cy + sg * (gap / 2 + jr);
      ctx.save(); ctx.beginPath(); ctx.arc(jx, jy, jr, 0, TAU); const gr = ctx.createRadialGradient(jx - 8 * k, jy - 8 * k, 4, jx, jy, jr); gr.addColorStop(0, C.shade(ec, 0.4)); gr.addColorStop(1, C.shade(ec, -0.15)); ctx.fillStyle = gr; ctx.fill(); ctx.strokeStyle = C.shade(ec, -0.35); ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
    });
    T(cx - 40 * k, cy - 30 * k, 'E', 60 * k, 'rgba(255,255,255,.85)', 'center', 800);
    T(cx - 20 * k, cy + ry + 24, '효소', L(15, 13), '#1f2d44', 'center', 800);
    callout(jx + jr * 0.35, cy - gap / 2 - jr * 1.3, jx + 40 * k, P.y + 56, '활성 부위', { size: L(13.5, 12) });
    // 기질 / 생성물
    const q = cxPos(g), dm = q.dm, sub = cur.sub;
    const bound = c.ph === 'close' || c.ph === 'strain' || c.ph === 'split' || (c.ph === 'jam' && !(sub === 'far'));
    if (sub === 'far') { hexa(q.ax + (c.ph === 'in' || c.ph === 'jam' || c.ph === 'back' ? 0 : 0), cy + (c.ph === 'jam' ? Math.sin(c.t * 40) * 3 * k : 0), dm.ra, '#a855f7'); }
    else {
      const shake = c.ph === 'jam' ? Math.sin(c.t * 40) * 2.5 * k : 0;
      if (c.ph !== 'split' && c.ph !== 'out') {
        const stretch = c.ph === 'strain' ? SciSim.ease.inOutQuad(clamp(c.t / 0.6, 0, 1)) * 7 * k : 0;
        ctx.strokeStyle = c.ph === 'strain' ? '#f97316' : '#64748b'; ctx.lineWidth = c.ph === 'strain' ? 5 : 4; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(q.ax, q.ay + shake); ctx.lineTo(q.bx + stretch, q.by + shake); ctx.stroke();
        if (c.ph === 'strain') { D.glow((q.ax + q.bx) / 2, cy, 36 * k, '#fb923c', 0.7); }
        lobe(q.ax, q.ay + shake, dm.ra, '#34d399'); lobe(q.bx + stretch, q.by + shake, dm.rb, sub === 'S' ? '#60a5fa' : '#f472b6');
      } else {
        lobe(q.ax, q.ay, dm.ra, '#34d399'); lobe(q.bx, q.by, dm.rb, '#60a5fa');
      }
    }
    // 이름표
    if (c.ph === 'idle' || c.ph === 'in' || c.ph === 'back' || c.ph === 'jam') D.label(c.x + (sub === 'far' ? dm.ra : dm.d + dm.rb) + 12 * k, cy, sub === 'S' ? '기질 S' : sub === 'near' ? '비슷한 분자 S′' : '다른 분자 S″', { bg: '#1f2d44', size: L(13.5, 12), align: 'left' });
    if (c.ph === 'strain' || c.ph === 'split') D.label(cx + 120 * k, cy - 62 * k - 28, 'ES 복합체', { bg: '#16a34a', size: L(14, 12.5) });
    if (c.ph === 'out') D.label(cx + 235 * k, cy + 98 * k, '생성물 P', { bg: '#2563eb', size: L(13.5, 12) });
    if (c.msg) TF(P.x + P.w / 2, P.y + P.h - 14, c.msg, P.w - 30, L(15.5, 13), 11.5, c.msg.indexOf('않') >= 0 || c.msg.indexOf('못') >= 0 || c.msg.indexOf('막혀') >= 0 ? '#dc2626' : '#15803d', 'center', 800);
    // 단계
    const stg = { in: 0, close: 1, strain: 1, split: 2, out: 3 }[c.ph];
    ['① 접근', '② 결합', '③ 반응', '④ 방출'].forEach((s, i) => { const x = P.x + P.w - (PHONE ? 210 : 330) + i * (PHONE ? 52 : 80); D.label(x + 24, P.y + 24, s, { bg: stg === i && sub === 'S' ? '#16a34a' : '#e2e8f0', color: stg === i && sub === 'S' ? '#fff' : '#64748b', size: L(13, 11.5), pad: L(8, 5) }); });
    // 아래: 반응식 + 횟수
    const B = g.B; panel(B.x, B.y, B.w, B.h, 18, '#fff');
    const eqs = [['E + S', stg === 0 || c.ph === 'idle'], [' ⇌ ', false], ['ES', stg === 1 || stg === 2 && false], [' → ', false], ['E + P', stg === 3]];
    const fs = L(26, 20); ctx.save(); ctx.font = D.font(fs, 800); let w = 0; eqs.forEach((q2) => { w += ctx.measureText(q2[0]).width; }); ctx.restore();
    let ex = B.x + B.w / 2 - w / 2; eqs.forEach((q2) => { ctx.save(); ctx.font = D.font(fs, 800); const ww = ctx.measureText(q2[0]).width; ctx.restore(); T(ex, B.y + L(50, 44), q2[0], fs, q2[1] ? '#16a34a' : '#64748b', 'left', 800); ex += ww; });
    T(B.x + B.w / 2, B.y + L(78, 70), '효소(E)는 반응 전과 후에 변하지 않아요', L(15, 13), '#475569', 'center', 800);
    T(B.x + 18, B.y + L(112, 100), '이 효소 분자가 한 반응', L(16, 14), '#1f2d44', 'left', 800);
    for (let i = 0; i < 3; i++) { D.sphere(B.x + L(250, 220) + i * 40, B.y + L(106, 94), 14, c.n > i ? '#22c55e' : '#e2e8f0', { gloss: c.n > i }); if (c.n > i) T(B.x + L(250, 220) + i * 40, B.y + L(112, 99), String(i + 1), 14, '#fff', 'center', 800); }
    T(B.x + L(380, 328), B.y + L(112, 100), c.n + '회' + (c.n > 3 ? ' (계속 가능)' : ''), L(16, 14), '#166534', 'left', 800);
    const expl = c.model === 'lock' ? '🔑 열쇠–자물쇠 모형: 활성 부위의 모양이 처음부터 기질과 꼭 맞아요. 모양이 조금만 달라도 들어가지 못해요.' : '🤝 유도 적합 모형: 기질이 들어와 결합하면 활성 부위가 기질에 맞게 모양을 바꿔 꼭 맞춰져요. 반응 후에는 원래 모양으로 돌아와요.';
    textBlock(B.x + 18, B.y + L(146, 130), B.w - 36, expl, L(14.5, 13), '#475569', L(20, 18), 700);
  }

  /* =========================================================
     ③ 속도와 포화
     ========================================================= */
  const SPART = [2, 3, 5, 8, 12, 17, 24];
  S.rt = { idx: 2, units: 1, pts: { 1: {}, 2: {} }, flies: [], sp: [], occ: [], prods: [], shuf: 0, ymax: new Num(110), u2: new Num(0), seen2: false };
  const rtG = () => (PHONE
    ? { Bx: { x: 10, y: 10, w: 460, h: 224 }, G: { x: 10, y: 242, w: 460, h: 246 }, Tb: { x: 10, y: 496, w: 460, h: 136 } }
    : { Bx: { x: 14, y: 14, w: 372, h: 356 }, G: { x: 398, y: 14, w: 388, h: 356 }, Tb: { x: 14, y: 380, w: 772, h: 166 } });
  const rtNE = () => (S.rt.units === 2 ? 20 : 10);
  function rtEnzPos(i) {
    const g = rtG().Bx, per = 10, row = Math.floor(i / per), col = i % per, cw = (g.w - 28) / per;
    return { x: g.x + 14 + cw * (col + 0.5), y: g.y + g.h - (PHONE ? 34 : 36) - row * (PHONE ? 34 : 46), s: Math.min(cw * 0.42, PHONE ? 15 : 18) };
  }
  function rtFreeRect() { const g = rtG().Bx; return { x0: g.x + 16, x1: g.x + g.w - 16, y0: g.y + (PHONE ? 78 : 92), y1: g.y + g.h - (S.rt.units === 2 ? (PHONE ? 92 : 128) : (PHONE ? 56 : 82)) }; }
  function rtOccProb() { const sv = SLEVS[S.rt.idx]; return sv / (sv + KM); }
  function rtShuffle() {
    const r = S.rt, ne = rtNE(), want = ne * rtOccProb(), kf = Math.floor(want), kk = kf + (Math.random() < want - kf ? 1 : 0);
    while (r.occ.length < ne) r.occ.push({ st: 0, t: 0, a: 0 });
    r.occ.length = ne;
    const cur = r.occ.map((o, i) => (o.st > 0 ? i : -1)).filter((i) => i >= 0);
    const order = r.occ.map((o, i) => i).sort(() => Math.random() - 0.5);
    let bound = cur.slice();
    while (bound.length > kk) { const i = bound.splice(Math.floor(Math.random() * bound.length), 1)[0]; const o = r.occ[i]; o.st = 0; const p = rtEnzPos(i); r.prods.push({ x: p.x, y: p.y - 22, t: 0 }); }
    for (const i of order) { if (bound.length >= kk) break; if (!r.occ[i].st) { r.occ[i].st = 1; r.occ[i].t = 0; bound.push(i); } }
  }
  function rtUpdate(dt) {
    const r = S.rt, fr = rtFreeRect();
    r.ymax.set(r.units === 2 || r.seen2 ? 220 : 110); r.ymax.update(dt, 5);
    const tn = SPART[r.idx];
    while (r.sp.filter((q) => !q.die).length < tn) r.sp.push({ x: lerp(fr.x0, fr.x1, Math.random()), y: lerp(fr.y0, fr.y1, Math.random()), vx: (Math.random() - 0.5) * 50, vy: (Math.random() - 0.5) * 50, a: 0, die: false });
    const live = r.sp.filter((q) => !q.die); if (live.length > tn) for (let i = 0; i < live.length - tn; i++) live[i].die = true;
    for (let i = r.sp.length - 1; i >= 0; i--) {
      const q = r.sp[i];
      q.a = q.die ? q.a - dt * 2.5 : Math.min(1, q.a + dt * 2.5); if (q.a < 0) { r.sp.splice(i, 1); continue; }
      q.vx += (Math.random() - 0.5) * 140 * dt; q.vy += (Math.random() - 0.5) * 140 * dt;
      const sp = Math.hypot(q.vx, q.vy); if (sp > 70) { q.vx *= 70 / sp; q.vy *= 70 / sp; }
      q.x += q.vx * dt; q.y += q.vy * dt;
      if (q.x < fr.x0) { q.x = fr.x0; q.vx = Math.abs(q.vx); } if (q.x > fr.x1) { q.x = fr.x1; q.vx = -Math.abs(q.vx); }
      if (q.y < fr.y0) { q.y = fr.y0; q.vy = Math.abs(q.vy); } if (q.y > fr.y1) { q.y = fr.y1; q.vy = -Math.abs(q.vy); }
    }
    r.shuf -= dt; if (r.shuf <= 0) { r.shuf = 0.7 + Math.random() * 0.5; rtShuffle(); }
    r.occ.forEach((o) => { if (o.st === 1) { o.t += dt; if (o.t > 0.35) o.st = 2; } o.a = approach(o.a, o.st > 0 ? 1 : 0, dt, 9); });
    for (let i = r.prods.length - 1; i >= 0; i--) { const p = r.prods[i]; p.t += dt; if (p.t > 0.9) r.prods.splice(i, 1); }
    for (let i = r.flies.length - 1; i >= 0; i--) { const f = r.flies[i]; if (f.shown) r.flies.splice(i, 1); }
    r.u2.set(r.units === 2 ? 1 : 0); r.u2.update(dt, 6);
  }
  const rtCount = (u) => Object.keys(S.rt.pts[u]).length;
  const rtV = (idx, u) => rateOf(u, SLEVS[idx]);
  function rtMeasure() {
    const r = S.rt, g = rtG(), idx = r.idx, u = r.units, v = rtV(idx, u);
    r.pts[u][idx] = v; if (u === 2) r.seen2 = true;
    const pl = rtPlot(), p = { x: g.Bx.x + g.Bx.w / 2, y: g.Bx.y + 40, u, idx, shown: false, v };
    r.flies.push(p); Sound.tick();
    const tx = pl.X(SLEVS[idx]), ty = pl.Y(v);
    if (RM) { p.x = tx; p.y = ty; p.shown = true; } else SciSim.tween(p, { x: tx, y: ty }, { duration: 0.65, ease: 'inOutCubic', onDone: () => { p.shown = true; parts.burst(tx, ty, { count: 8, colors: [u === 1 ? '#f59e0b' : '#a855f7', '#fff'], speed: 70, life: 0.5, gravity: 0 }); updateCtl(); } });
    updateCtl();
  }
  function rtClear() { const r = S.rt; r.pts = { 1: {}, 2: {} }; r.flies.length = 0; r.seen2 = false; updateCtl(); }
  const rtPlot = () => { const G = rtG().G, ym = S.rt.ymax.v; const yt = ym > 120 ? [0, 50, 100, 150, 200].filter((v) => v <= ym) : [0, 25, 50, 75, 100]; return mkPlot(G, { x0: 0, x1: 32, y0: 0, y1: ym, xt: [0, 8, 16, 24, 32], yt, xl: '기질 농도 [S] (mM)', yl: '', m: PHONE ? { l: 40, t: 34, r: 14, b: 38 } : { l: 46, t: 44, r: 16, b: 46 } }); };
  function rtDraw(dt, t) {
    rtUpdate(dt);
    const r = S.rt, G = rtG(), sv = SLEVS[r.idx], v = rtV(r.idx, r.units), occ = Math.round(100 * rtOccProb());
    // ---- 용액 상자 ----
    const B = G.Bx; panel(B.x, B.y, B.w, B.h, 18, '#f7fbff');
    ctx.save(); D.roundRect(B.x + 8, B.y + 52, B.w - 16, B.h - 60, 12); ctx.fillStyle = 'rgba(186,230,253,.35)'; ctx.fill(); ctx.strokeStyle = 'rgba(56,189,248,.6)'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
    T(B.x + 14, B.y + 28, '기질 ' + sTxt(sv) + ' mM · 효소 ' + r.units + '단위', L(16, 14), '#1f2d44', 'left', 800);
    D.label(B.x + B.w - (PHONE ? 80 : 100), B.y + 24, '속도 ' + v, { bg: '#f59e0b', size: L(15, 13.5) });
    T(B.x + 14, B.y + 46 + (PHONE ? 0 : 0), '활성 부위 점유율 ' + occ + ' %', L(14, 12.5), '#0369a1', 'left', 800);
    // 기질 입자
    r.sp.forEach((q) => { ctx.save(); ctx.globalAlpha = clamp(q.a, 0, 1); D.sphere(q.x, q.y, L(7, 6), '#34d399', { gloss: true }); ctx.restore(); });
    // 효소
    const ne = rtNE();
    for (let i = 0; i < ne; i++) {
      const p = rtEnzPos(i), o = r.occ[i] || { st: 0, a: 0 }, pop = i >= 10 ? clamp(r.u2.v * 1.4 - 0.2, 0, 1) : 1; if (pop <= 0.02) continue;
      ctx.save(); ctx.globalAlpha = pop; ctx.translate(p.x, p.y); ctx.scale(0.7 + 0.3 * pop, 0.7 + 0.3 * pop);
      const s = p.s, col = o.st > 0 ? '#38bdf8' : '#7dd3fc';
      D.shadow(() => { D.roundRect(-s * 1.15, -s * 0.8, s * 2.3, s * 1.6, s * 0.7); const gr = ctx.createLinearGradient(0, -s, 0, s); gr.addColorStop(0, C.shade(col, 0.35)); gr.addColorStop(1, C.shade(col, -0.2)); ctx.fillStyle = gr; ctx.fill(); }, { blur: 4, y: 1.5 });
      ctx.fillStyle = C.shade(col, -0.55); ctx.beginPath(); ctx.arc(0, -s * 0.8, s * 0.5, 0, Math.PI); ctx.fill();
      if (o.st > 0) { const fly = o.st === 1 ? clamp(o.t / 0.35, 0, 1) : 1; D.sphere(0, -s * 0.9 - (1 - fly) * 16, s * 0.4, '#34d399', { gloss: false }); }
      ctx.restore();
    }
    r.prods.forEach((q) => { ctx.save(); ctx.globalAlpha = Math.max(0, 1 - q.t / 0.9); D.sphere(q.x, q.y - q.t * 36, L(5.5, 5), '#fb923c', { gloss: false }); ctx.restore(); });
    T(B.x + B.w / 2, B.y + B.h - 6, '효소 ' + ne + '개 (활성 부위 ' + ne + '개)', L(13, 11.5), '#64748b', 'center', 700);
    // ---- 그래프 ----
    const Gr = G.G; panel(Gr.x, Gr.y, Gr.w, Gr.h, 18, '#fff');
    T(Gr.x + 14, Gr.y + 26, '반응 속도 (μmol/분)', L(15.5, 13.5), '#1f2d44', 'left', 800);
    const pl = rtPlot(); drawAxes(pl);
    if (rtCount(1) >= 7) {
      D.dashedLine(pl.x, pl.Y(100), pl.x + pl.w, pl.Y(100), { color: '#dc2626', width: 1.8 }); T(pl.x + pl.w - 4, pl.Y(100) - 6, 'Vmax', 13, '#dc2626', 'right', 800);
      D.dashedLine(pl.x, pl.Y(50), pl.x + pl.w, pl.Y(50), { color: '#2563eb', width: 1.4 }); T(pl.x + pl.w - 4, pl.Y(50) - 6, '½ Vmax', 13, '#2563eb', 'right', 800);
    }
    [1, 2].forEach((u) => {
      const idxs = Object.keys(r.pts[u]).map(Number).filter((i) => r.flies.every((f) => f.u !== u || f.idx !== i || f.shown)).sort((a, b) => a - b);
      const col = u === 1 ? '#f59e0b' : '#a855f7';
      if (idxs.length > 1) { ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.beginPath(); idxs.forEach((i, j) => { const x = pl.X(SLEVS[i]), y = pl.Y(r.pts[u][i]); if (j) ctx.lineTo(x, y); else ctx.moveTo(x, y); }); ctx.stroke(); ctx.restore(); }
      idxs.forEach((i) => D.sphere(pl.X(SLEVS[i]), pl.Y(r.pts[u][i]), 6.5, col, { gloss: true }));
    });
    const cur = r.pts[r.units][r.idx];
    D.dashedLine(pl.X(sv), pl.y + pl.h, pl.X(sv), pl.Y(v), { color: '#94a3b8', width: 1.4 });
    D.ring(pl.X(sv), pl.Y(v), 8, t, { color: r.units === 1 ? '#f59e0b' : '#a855f7', width: 2 });
    r.flies.forEach((f) => { if (!f.shown) D.sphere(f.x, f.y, 7, f.u === 1 ? '#f59e0b' : '#a855f7', { gloss: true, shadow: true }); });
    D.sphere(Gr.x + Gr.w - (PHONE ? 130 : 150), Gr.y + 22, 6, '#f59e0b', { gloss: false }); T(Gr.x + Gr.w - (PHONE ? 120 : 140), Gr.y + 27, '1단위', 13, '#475569', 'left', 800);
    D.sphere(Gr.x + Gr.w - (PHONE ? 66 : 76), Gr.y + 22, 6, '#a855f7', { gloss: false }); T(Gr.x + Gr.w - (PHONE ? 56 : 66), Gr.y + 27, '2단위', 13, '#475569', 'left', 800);
    // ---- 표 ----
    const Tb = G.Tb; panel(Tb.x, Tb.y, Tb.w, Tb.h, 18, '#fff');
    const lab0 = Tb.x + 14, c0 = Tb.x + (PHONE ? 104 : 190), cw = (Tb.x + Tb.w - 14 - c0) / 7;
    T(lab0, Tb.y + L(34, 32), '[S] (mM)', L(14.5, 12.5), '#475569', 'left', 800);
    SLEVS.forEach((s, i) => { const x = c0 + cw * (i + 0.5); if (i === r.idx) { D.roundRect(x - cw / 2 + 2, Tb.y + 12, cw - 4, Tb.h - 24, 8); ctx.fillStyle = 'rgba(245,158,11,.14)'; ctx.fill(); } T(x, Tb.y + L(34, 32), sTxt(s), L(15, 13), '#1f2d44', 'center', 800); });
    [1, 2].forEach((u, ri) => {
      const y = Tb.y + L(74, 68) + ri * L(42, 36);
      T(lab0, y, '효소 ' + u + '단위 속도', L(14.5, 12.5), u === 1 ? '#b45309' : '#7e22ce', 'left', 800);
      SLEVS.forEach((s, i) => { const x = c0 + cw * (i + 0.5), v2 = r.pts[u][i], done = v2 != null && r.flies.every((f) => f.u !== u || f.idx !== i || f.shown); T(x, y, done ? String(v2) : '·', L(16, 14), done ? (u === 1 ? '#b45309' : '#7e22ce') : '#cbd5e1', 'center', 800); });
    });
  }

  /* =========================================================
     ④ 예측하기
     ========================================================= */
  const CARDS = [
    { short: '기질 8 → 32', title: '기질이 이미 충분해요', ask: '8 mM에서 기질을 4배(32 mM)로 늘리면?', b: { E: 1, S: 8, a: 1 }, a: { E: 1, S: 32, a: 1 }, why: '활성 부위의 대부분(80 %)이 이미 기질로 차 있어서 기질을 4배로 늘려도 속도는 80에서 94로 조금만 늘어요.' },
    { short: '기질 0.5 → 1', title: '기질이 부족해요', ask: '0.5 mM에서 기질을 2배(1 mM)로 늘리면?', b: { E: 1, S: 0.5, a: 1 }, a: { E: 1, S: 1, a: 1 }, why: '활성 부위가 많이 비어 있어(20 %) 기질을 늘리면 속도가 크게 늘어요: 20에서 33으로 약 1.7배예요.' },
    { short: '효소 ×2 (8 mM)', title: '효소의 양을 늘려요', ask: '기질 8 mM은 그대로 두고 효소만 2배로 늘리면?', b: { E: 1, S: 8, a: 1 }, a: { E: 2, S: 8, a: 1 }, why: '일하는 활성 부위가 2배로 늘어 속도가 80에서 160으로 2배가 돼요. 최대 속도 Vmax도 2배예요.' },
    { short: '60 °C 가열', title: '온도를 높여요', ask: '효소가 있는 용액을 37 °C에서 60 °C로 가열하면? (기질 8 mM)', b: { E: 1, S: 8, a: 1 }, a: { E: 1, S: 8, a: 0.1 }, why: '60 °C에서는 대부분의 효소가 변성되어 활성 부위의 모양이 무너져요. 속도가 80에서 8로 급감해요.' },
    { short: '효소 절반 삶음', title: '효소의 일부를 삶아요', ask: '효소의 절반을 삶아 변성시키면? (기질 8 mM)', b: { E: 1, S: 8, a: 1 }, a: { E: 1, S: 8, a: 0.5 }, why: '일하는 효소가 절반으로 줄어 속도도 80에서 40으로 절반이 돼요.' },
    { short: '기질 0.5 → 2', title: '기질이 부족해요 (4배)', ask: '0.5 mM에서 기질을 4배(2 mM)로 늘리면?', b: { E: 1, S: 0.5, a: 1 }, a: { E: 1, S: 2, a: 1 }, why: '기질이 4배가 되면 활성 부위가 더 많이 차서 속도가 20에서 50으로 2.5배가 돼요.' },
    { short: '효소 ×2 (0.5 mM)', title: '기질이 부족한데 효소를 늘려요', ask: '0.5 mM에서 효소를 2배로 늘리면?', b: { E: 1, S: 0.5, a: 1 }, a: { E: 2, S: 0.5, a: 1 }, why: '효소가 2배면 기질과 만날 활성 부위도 2배라서 속도가 20에서 40으로 2배가 돼요.' },
    { short: '효소 ×2 (32 mM)', title: '기질이 충분한데 효소를 늘려요', ask: '32 mM에서 효소를 2배로 늘리면?', b: { E: 1, S: 32, a: 1 }, a: { E: 2, S: 32, a: 1 }, why: '기질이 충분해 모든 효소가 일하고 있어요(94 %). 효소를 2배로 하면 속도도 94에서 188로 2배가 돼요.' },
  ];
  CARDS.forEach((c) => { c.vb = rateOf(c.b.E, c.b.S, c.b.a); c.va = rateOf(c.a.E, c.a.S, c.a.a); const r = c.va / c.vb; c.cat = r < 0.9 ? 'down' : r <= 1.3 ? 'small' : 'big'; });
  const CAT_TXT = { down: '감소', small: '소폭 증가', big: '크게 증가' };
  S.pr = { i: 0, pred: CARDS.map(() => null), ran: CARDS.map(() => false), bar: new Num(0), t: 0, flash: 0 };
  const prG = () => (PHONE
    ? { C: { x: 10, y: 10, w: 460, h: 172 }, Bs: { x: 10, y: 190, w: 460, h: 226 }, Pl: { x: 10, y: 424, w: 460, h: 104 }, I: { x: 10, y: 536, w: 460, h: 96 } }
    : { C: { x: 14, y: 14, w: 772, h: 118 }, Bs: { x: 14, y: 140, w: 772, h: 214 }, Pl: { x: 14, y: 362, w: 772, h: 96 }, I: { x: 14, y: 466, w: 772, h: 80 } });
  function prSelect(i) { S.pr.i = clamp(i, 0, 7); S.pr.bar.snap(S.pr.ran[S.pr.i] ? CARDS[S.pr.i].va : CARDS[S.pr.i].vb); Sound.tick(); updateCtl(); }
  function prRun() {
    const p = S.pr, c = CARDS[p.i];
    if (!p.pred[p.i]) { showHint('먼저 예측을 골라요: 감소, 소폭 증가, 크게 증가', 3000); return false; }
    if (p.ran[p.i]) return false;
    p.ran[p.i] = true; p.bar.set(c.va); p.flash = 1; showHint(p.pred[p.i] === c.cat ? '✔ 예측이 맞았어요!' : '결과를 확인해 보세요: ' + CAT_TXT[c.cat], 4000);
    const ok = p.pred[p.i] === c.cat; if (ok) Sound.success(); else Sound.fail();
    const G = prG(); parts.burst(G.Bs.x + G.Bs.w * 0.6, G.Bs.y + 120, { count: ok ? 18 : 8, colors: ok ? ['#22c55e', '#facc15', '#fff'] : ['#f59e0b', '#fff'], speed: 110, life: 0.7, gravity: 60 });
    updateCtl(); return true;
  }
  const prMatch = () => CARDS.filter((c, i) => S.pr.ran[i] && S.pr.pred[i] === c.cat).length;
  const prRanN = () => S.pr.ran.filter((x) => x).length;
  function enzRow(x, y, w, st, ne, a, occFrac) {
    // 효소 아이콘 줄: 점유/비점유/변성
    const n = ne, cols = 10, cw = Math.min(w / cols, PHONE ? 24 : 30);
    for (let i = 0; i < n; i++) {
      const col = i % cols, row = Math.floor(i / cols), ex = x + cw * (col + 0.5), ey = y + row * (PHONE ? 26 : 30);
      const inactive = i >= Math.round(n * a), bound = !inactive && (i - 0) < Math.round(n * a * occFrac);
      const bc = inactive ? '#cbd5e1' : bound ? '#38bdf8' : '#bae6fd', s = cw * 0.36;
      ctx.save(); ctx.translate(ex, ey);
      D.roundRect(-s * 1.1, -s * 0.8, s * 2.2, s * 1.6, s * 0.7); ctx.fillStyle = bc; ctx.fill();
      ctx.fillStyle = C.shade(bc, -0.45); ctx.beginPath(); ctx.arc(0, -s * 0.8, s * 0.5, 0, Math.PI); ctx.fill();
      if (bound) D.sphere(0, -s * 0.95, s * 0.38, '#34d399', { gloss: false });
      if (inactive) { ctx.strokeStyle = '#64748b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-s * 0.6, -s * 0.4); ctx.lineTo(s * 0.6, s * 0.5); ctx.moveTo(s * 0.6, -s * 0.4); ctx.lineTo(-s * 0.6, s * 0.5); ctx.stroke(); }
      ctx.restore();
    }
  }
  function prDraw(dt, t) {
    const p = S.pr, G = prG(), c = CARDS[p.i], ran = p.ran[p.i]; p.bar.update(dt, 5); p.flash = approach(p.flash, 0, dt, 2);
    // 카드
    panel(G.C.x, G.C.y, G.C.w, G.C.h, 18, '#fffdf7');
    D.label(G.C.x + 52, G.C.y + 26, '카드 ' + (p.i + 1) + ' / 8', { bg: '#16a34a', size: L(14, 12.5) });
    T(G.C.x + 108 + (PHONE ? 8 : 40), G.C.y + 30, c.title, L(18, 15), '#1f2d44', 'left', 800);
    textBlock(G.C.x + 18, G.C.y + L(62, 58), G.C.w - 36, c.ask, L(18, 15), '#1f2d44', L(26, 22), 800);
    const stateTxt = p.pred[p.i] ? '내 예측: ' + CAT_TXT[p.pred[p.i]] : '아직 예측하지 않았어요';
    T(G.C.x + 18, G.C.y + G.C.h - 16, stateTxt, L(15, 13), p.pred[p.i] ? '#0369a1' : '#94a3b8', 'left', 800);
    if (ran) { const ok = p.pred[p.i] === c.cat; D.label(G.C.x + G.C.w - (PHONE ? 90 : 120), G.C.y + G.C.h - 22, ok ? '✔ 예측이 맞았어요' : '결과: ' + CAT_TXT[c.cat], { bg: ok ? '#16a34a' : '#f59e0b', size: L(14, 12.5) }); }
    // 막대
    const B = G.Bs; panel(B.x, B.y, B.w, B.h, 18, '#fff');
    const pw = (B.w - 36) / 2, blocks = [['처음', c.b, c.vb, 0], ['바꾼 뒤', c.a, ran ? c.va : null, 1]];
    if (!PHONE) {
      blocks.forEach(([nm, st, val, k]) => {
        const x = B.x + 12 + k * (pw + 12), y = B.y + 14;
        D.roundRect(x, y, pw, B.h - 28, 14); ctx.fillStyle = k ? (ran ? '#f0fdf4' : '#f8fafc') : '#f8fafc'; ctx.fill(); ctx.strokeStyle = k && ran ? '#86efac' : '#e2e8f0'; ctx.lineWidth = 2; ctx.stroke();
        T(x + 14, y + 26, nm, 16, '#1f2d44', 'left', 800);
        T(x + 14, y + 50, '효소 ' + st.E + '단위 · 기질 ' + sTxt(st.S) + ' mM' + (st.a < 1 ? ' · 활성 ' + Math.round(st.a * 100) + ' %' : ''), 14, '#475569', 'left', 800);
        if (k === 0 || ran) enzRow(x + 14, y + 80, pw - 28, st, st.E * 10, st.a, st.S / (st.S + KM));
        else T(x + pw / 2, y + 100, '▶ 실행하면 보여요', 15, '#94a3b8', 'center', 800);
        // 막대
        const bx = x + 14, by = y + B.h - 28 - 38, bw = pw - 28 - 56, vv = k === 0 ? c.vb : p.bar.v;
        D.roundRect(bx, by, bw, 20, 10); ctx.fillStyle = '#eef2f7'; ctx.fill();
        const wv = bw * clamp(vv, 0, 200) / 200; if (wv > 0.5) { D.roundRect(bx, by, Math.max(wv, 4), 20, 10); ctx.fillStyle = k ? '#16a34a' : '#64748b'; ctx.fill(); }
        T(bx + bw + 8, by + 15, (k === 0 || ran) ? fi(vv) : '—', 16, '#1f2d44', 'left', 800);
        T(bx, by - 6, '반응 속도 (μmol/분, 눈금 0~200)', 12.5, '#64748b', 'left', 700);
      });
    } else {
      blocks.forEach(([nm, st, val, k]) => {
        const y = B.y + 8 + k * 109, x = B.x + 8;
        D.roundRect(x, y, B.w - 16, 101, 12); ctx.fillStyle = k && ran ? '#f0fdf4' : '#f8fafc'; ctx.fill(); ctx.strokeStyle = k && ran ? '#86efac' : '#e2e8f0'; ctx.lineWidth = 2; ctx.stroke();
        T(x + 10, y + 20, nm + ': 효소 ' + st.E + ' · 기질 ' + sTxt(st.S) + ' mM' + (st.a < 1 ? ' · 활성 ' + Math.round(st.a * 100) + '%' : ''), 12.5, '#1f2d44', 'left', 800);
        if (k === 0 || ran) enzRow(x + 10, y + 42, 250, st, st.E * 10, st.a, st.S / (st.S + KM)); else T(x + 130, y + 52, '▶ 실행하면 보여요', 13, '#94a3b8', 'center', 800);
        const bx = x + 10, by = y + (st.E === 2 ? 82 : 66), bw = B.w - 16 - 20 - 50, vv = k === 0 ? c.vb : p.bar.v;
        D.roundRect(bx, by - 6, bw, 16, 8); ctx.fillStyle = '#eef2f7'; ctx.fill(); const wv = bw * clamp(vv, 0, 200) / 200; if (wv > 0.5) { D.roundRect(bx, by - 6, Math.max(wv, 4), 16, 8); ctx.fillStyle = k ? '#16a34a' : '#64748b'; ctx.fill(); }
        T(bx + bw + 6, by + 8, (k === 0 || ran) ? fi(vv) : '—', 14, '#1f2d44', 'left', 800);
      });
    }
    // 카드 선택 칩
    const Pl = G.Pl; panel(Pl.x, Pl.y, Pl.w, Pl.h, 14, '#fff');
    const cols = 4, cw = (Pl.w - 16 - (cols - 1) * 6) / cols, ch = PHONE ? 42 : 38;
    CARDS.forEach((cd, i) => {
      const x = Pl.x + 8 + (i % cols) * (cw + 6), y = Pl.y + 9 + Math.floor(i / cols) * (ch + 6), on = p.i === i, rn = p.ran[i], ok = rn && p.pred[i] === cd.cat;
      D.roundRect(x, y, cw, ch, 10); ctx.fillStyle = on ? '#fff8dc' : rn ? (ok ? '#dcfce7' : '#ffedd5') : '#f8fafc'; ctx.fill(); ctx.strokeStyle = on ? '#f59e0b' : rn ? (ok ? '#16a34a' : '#f59e0b') : '#cbd5e1'; ctx.lineWidth = on ? 3 : 2; ctx.stroke();
      T(x + 14, y + ch / 2 + 5, String(i + 1), L(15, 13), '#64748b', 'center', 800);
      { const ls = wrap(cd.short, cw - 36, L(13.5, 12), 800).slice(0, 2); ls.forEach((l2, j) => T(x + cw / 2 + 10, y + ch / 2 + (ls.length === 1 ? 5 : -1 + j * 14), l2, L(13.5, 12), '#26324a', 'center', 800)); }
    });
    // 전환 수 정보
    const I = G.I; panel(I.x, I.y, I.w, I.h, 14, '#eef6ff');
    T(I.x + 16, I.y + 26, '💡 효소 한 분자가 얼마나 일할까?', L(15.5, 13.5), '#1d4ed8', 'left', 800);
    textBlock(I.x + 16, I.y + L(46, 48), I.w - 32, '카탈레이스 1분자는 1초에 H₂O₂ 약 4천만 개를 분해해요. 사람이 1초에 1개씩 나르면 4천만 초(약 463일)가 걸려요. 그래서 효소가 적어도 많은 기질을 처리해요.', L(13.5, 12.5), '#334155', L(19, 18), 700);
  }
  const prPT = {
    down(p) {
      const G = prG(), Pl = G.Pl, cols = 4, cw = (Pl.w - 16 - (cols - 1) * 6) / cols, ch = PHONE ? 42 : 38;
      for (let i = 0; i < 8; i++) { const x = Pl.x + 8 + (i % cols) * (cw + 6), y = Pl.y + 9 + Math.floor(i / cols) * (ch + 6); if (inRect(p.x, p.y, { x, y, w: cw, h: ch })) { prSelect(i); return true; } }
      return false;
    },
    hover(p) { const Pl = prG().Pl; return inRect(p.x, p.y, Pl) ? 'pointer' : 'default'; },
  };

  /* =========================================================
     화면 전환 · 조작 연결
     ========================================================= */
  const PTS = { energy: null, complex: null, rate: null, predict: prPT };
  function setMode(m) {
    if (S.mode !== m) S.fade = 1;
    S.mode = m; PT = PTS[m] || null; hideHint();
    if (m === 'predict') S.pr.bar.snap(S.pr.ran[S.pr.i] ? CARDS[S.pr.i].va : CARDS[S.pr.i].vb);
    updateCtl();
  }
  const ctlNodes = $$('#ctrlCard .control');
  const cardAns = () => ['cd1', 'cd2', 'cd3'].map((id) => selVal(id));
  const CARD_OK = ['lock', 'induced', 'both'];
  const enBothOk = () => { const r = S.en.res; return !!(r.no && r.yes && Math.abs(r.no.T - 37) <= 3 && Math.abs(r.yes.T - 37) <= 3 && r.yes.n > r.no.n); };
  function updateCtl() {
    const fr = game ? game.free : false, lvNow = game ? game.level : 0;
    ctlNodes.forEach((n) => { n.hidden = (n.dataset.modes || '').split(' ').indexOf(S.mode) < 0; });
    $$('#ctrlCard [data-grp]').forEach((n) => { n.hidden = !(fr || n.dataset.grp.split(' ').indexOf(S.grp) >= 0); });
    modeButtons(S.mode, lvNow, fr);
    // 에너지 언덕
    const e = S.en; chipSet($('#enEnz'), e.enz ? 'yes' : 'no');
    $('#sTemp').value = e.temp; $('#oTemp').textContent = e.temp + ' °C';
    $('#tempNote').innerHTML = e.temp >= 35 && e.temp <= 40 ? '체온 구간이에요 (사람의 효소는 약 37 °C에서 가장 잘 작용해요).' : e.temp > 45 ? '<b style="color:#b91c1c">고온</b>: 열을 받은 구슬은 많이 뛰지만 효소는 변성돼요.' : '35~40 °C가 체온 구간이에요.';
    $('#enGo').disabled = !!e.meas; $('#enGo').textContent = e.meas ? '측정 중…' : '▶ 10초 측정 (' + (e.enz ? '효소 있음' : '효소 없음') + ')';
    S.en.read = near(numIn('inEa0'), EA0, 2) && near(numIn('inEa1'), EA1, 2);
    $('#inEa0').classList.toggle('ok', near(numIn('inEa0'), EA0, 2)); $('#inEa1').classList.toggle('ok', near(numIn('inEa1'), EA1, 2));
    $('#enNote').innerHTML = '효소 없음 <b>' + (e.res.no ? e.res.no.n + '개' : '—') + '</b> · 효소 있음 <b>' + (e.res.yes ? e.res.yes.n + '개' : '—') + '</b> (10초 동안 생긴 생성물 수)';
    // 복합체
    const c = S.cx; chipSet($('#cxModel'), c.model); chipSet($('#cxSub'), c.sub);
    $('#cxGo').disabled = c.ph !== 'idle'; $$('#cxModel button, #cxSub button').forEach((b) => { b.disabled = c.ph !== 'idle'; });
    const ca = cardAns(); ['cd1', 'cd2', 'cd3'].forEach((id, i) => { const el = $('#' + id); el.classList.toggle('ok', ca[i] === CARD_OK[i]); el.classList.toggle('bad', ca[i] !== '' && ca[i] !== CARD_OK[i]); });
    $('#cxNote').innerHTML = '이 효소가 한 반응 <b>' + c.n + '회</b> · 시도 ' + c.tries + '회';
    // 속도
    const r = S.rt; $('#sS').value = r.idx; $('#oS').textContent = sTxt(SLEVS[r.idx]) + ' mM'; chipSet($('#rtUnits'), String(r.units));
    $('#inVmax').classList.toggle('ok', near(numIn('inVmax'), 100, 10)); $('#inKm').classList.toggle('ok', near(numIn('inKm'), 2, 0.6));
    $('#rtNote').innerHTML = '속도 <b>' + rtV(r.idx, r.units) + '</b> μmol/분 · 측정한 점 1단위 <b>' + rtCount(1) + ' / 7</b>, 2단위 <b>' + rtCount(2) + '</b>';
    // 예측
    const p = S.pr; chipSet($('#prPred'), p.pred[p.i] || ''); $$('#prPred button').forEach((b) => { b.disabled = p.ran[p.i]; });
    $('#prGo').disabled = p.ran[p.i] || !p.pred[p.i];
    $('#prLab').textContent = '카드 ' + (p.i + 1) + ': 속도가 어떻게 될까요?';
    $('#prNote').innerHTML = p.ran[p.i] ? '<b>' + CARDS[p.i].why + '</b>' : '실행한 카드 <b>' + prRanN() + ' / 8</b> · 예측이 맞은 카드 <b>' + prMatch() + '</b>';
  }
  bindModeSeg(setMode);
  $$('#enEnz button').forEach((b) => b.addEventListener('click', () => enSetEnz(b.dataset.v === 'yes')));
  $('#sTemp').addEventListener('input', (ev) => { S.en.temp = +ev.target.value; S.en.meas = null; updateCtl(); });
  $('#enGo').addEventListener('click', () => enGo());
  ['inEa0', 'inEa1', 'inVmax', 'inKm'].forEach((id) => $('#' + id).addEventListener('input', updateCtl));
  $$('#cxModel button').forEach((b) => b.addEventListener('click', () => { Sound.click(); cxSetModel(b.dataset.v); }));
  $$('#cxSub button').forEach((b) => b.addEventListener('click', () => { if (S.cx.ph !== 'idle') return; S.cx.sub = b.dataset.v; Sound.click(); updateCtl(); }));
  $('#cxGo').addEventListener('click', () => cxGo());
  $('#cxReset').addEventListener('click', () => cxReset());
  ['cd1', 'cd2', 'cd3'].forEach((id) => $('#' + id).addEventListener('change', updateCtl));
  $('#sS').addEventListener('input', (ev) => { S.rt.idx = +ev.target.value; Sound.tick(); updateCtl(); });
  $$('#rtUnits button').forEach((b) => b.addEventListener('click', () => { S.rt.units = +b.dataset.v; S.rt.occ.length = 0; Sound.click(); updateCtl(); }));
  $('#rtGo').addEventListener('click', () => rtMeasure());
  $('#rtClear').addEventListener('click', () => { Sound.click(); rtClear(); });
  $$('#prPred button').forEach((b) => b.addEventListener('click', () => { if (S.pr.ran[S.pr.i]) return; S.pr.pred[S.pr.i] = b.dataset.v; Sound.click(); updateCtl(); }));
  $('#prGo').addEventListener('click', () => prRun());

  /* =========================================================
     미션
     ========================================================= */
  const levels = [
    {
      title: '활성화 에너지', short: '활성화 에너지', icon: '⛰', phase: '모형',
      intro: '<p class="si-q">❓ 탐구 질문: 효소는 어떻게 반응을 빠르게 만들까? 기질을 계속 늘리면 반응은 얼마든지 빨라질까?</p><p>🔗 <b>통합과학</b>에서 효소는 생물 촉매이고 열쇠–자물쇠 모형으로 기질과 결합한다고 배웠어요. 이번에는 <b>에너지</b> 관점으로 효소가 반응을 빠르게 하는 방법을 살펴봐요.</p><p>반응물이 생성물이 되려면 먼저 <b>에너지 언덕</b>을 넘어야 해요. 그 언덕의 높이가 <b>활성화 에너지</b>예요. 에너지는 상대값으로만 나타내요.</p>',
      features: ['energy'],
      setup() { S.grp = 'none'; setMode('energy'); },
      recap: '효소는 활성화 에너지를 낮춰 반응을 빠르게 해요. 반응물과 생성물의 에너지는 변하지 않아서 반응의 방향과 에너지 출입은 그대로예요.',
      summary: '<ul><li><b>활성화 에너지</b>: 반응물이 생성물이 되기 위해 넘어야 하는 에너지 언덕의 높이예요. 이 언덕이 높으면 상온에서 반응이 느려요.</li><li><b>효소는 활성화 에너지를 낮춰</b>(예: 상대값 50 → 20) 같은 시간에 언덕을 넘는 반응물이 늘어요. <b>반응물과 생성물의 에너지는 변하지 않으므로</b> 반응의 방향과 에너지 출입은 그대로예요. 효소가 스스로 에너지를 만들어 주지는 않아요.</li><li>온도를 올려도 언덕을 넘는 분자가 늘지만 효소 단백질이 <b>변성</b>되기 때문에 세포는 체온 근처(약 37 °C)에서 효소로 반응을 빠르게 해요.</li><li>효소가 활성화 에너지를 낮추는 방법(모형): 기질들을 활성 부위에 가까이 모아 알맞은 방향으로 놓고, 결합할 때 기질의 모양에 긴장을 주어 반응이 쉽게 일어나게 해요.</li></ul>',
      missions: [
        {
          id: 'compare', title: '효소가 있을 때와 없을 때',
          goal: '온도를 <b>체온 근처(35~40 °C)</b>에 두고 <b>효소 없음</b>과 <b>효소 있음</b>에서 각각 10초 동안 생기는 생성물 수를 측정하세요.',
          hint: '효소 없음 / 효소 있음을 고른 뒤 ▶ 10초 측정을 눌러요. 구슬이 언덕을 넘으면 초록색 생성물이 돼요. 두 번 측정해서 비교해요.',
          setup() { S.grp = 'none'; setMode('energy'); },
          check: () => enBothOk() && !S.en.meas, hold: 0.6,
          status: () => { const r = S.en.res; return mark(!!r.no) + ' 효소 없음 ' + (r.no ? r.no.n + '개' : '') + ' &nbsp; ' + mark(!!r.yes) + ' 효소 있음 ' + (r.yes ? r.yes.n + '개' : '') + ' &nbsp; ' + mark(enBothOk()) + ' 효소 있음 &gt; 없음 (체온 근처)'; },
          explain: '효소가 있으면 <b>활성화 에너지가 낮아져</b> 같은 시간에 더 많은 구슬이 언덕을 넘어 생성물이 돼요. 효소가 없으면 언덕이 높아 넘는 구슬이 거의 없어요.',
        },
        {
          id: 'readEa', title: '언덕 높이 읽기', manual: true,
          goal: '그래프의 눈금을 보고 <b>활성화 에너지</b>(언덕 꼭대기 − 반응물 에너지)를 효소 없음과 있음에서 각각 읽어 쓰세요.',
          hint: '반응물 에너지 눈금(40)에서 언덕 꼭대기 눈금까지의 차이예요. 효소 있음 / 없음을 바꿔 가며 눈금을 읽어요. 효소가 있으면 점선으로 이전 언덕도 보여요.',
          setup() { S.grp = 'read'; setMode('energy'); },
          check() {
            const a = numIn('inEa0'), b = numIn('inEa1');
            if (!isFinite(a) || !isFinite(b)) return '효소 없음과 효소 있음일 때의 값을 모두 써 주세요.';
            if (!near(a, EA0, 2)) return '효소 없음일 때 언덕 꼭대기 눈금에서 반응물 에너지 눈금을 빼 보세요.';
            if (!near(b, EA1, 2)) return '효소 있음일 때 언덕이 얼마나 낮아졌는지 눈금으로 다시 읽어 보세요.';
            return true;
          },
          explain: '효소가 없을 때 활성화 에너지는 상대값 <b>50</b>(90 − 40), 효소가 있을 때는 <b>20</b>(60 − 40)이에요. 반응물(40)과 생성물(20)의 에너지는 그대로예요.',
        },
        {
          type: 'quiz', title: '효소가 바꾸지 못하는 것', goal: '효소가 있을 때와 없을 때를 비교했어요. 효소가 있어도 <b>달라지지 않는</b> 것은?',
          setup() { S.grp = 'none'; setMode('energy'); },
          choices: ['활성화 에너지', '반응물과 생성물의 에너지(와 그 차이)', '일정 시간에 언덕을 넘는 반응물의 수', '반응이 일어나는 빠르기'],
          answer: 1,
          feedback: ['효소는 활성화 에너지를 낮춰요.', '', '효소가 있으면 언덕을 넘는 반응물이 더 많아져요.', '효소가 있으면 반응이 빨라져요.'],
          explain: '효소는 <b>활성화 에너지만</b> 낮춰요. 반응물과 생성물의 에너지는 그대로라서 에너지가 나오는지 필요한지(방향)는 바뀌지 않아요. 효소가 있어도 생성물이 반응물보다 에너지가 높은 반응에서 에너지를 만들어 주지는 않아요.',
        },
      ],
    },
    {
      title: '효소–기질 복합체', short: '복합체 형성', icon: '🔍', phase: '모형',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 효소가 활성화 에너지를 낮춰 반응을 빠르게 한다는 것을 보았어요.</div><p>그러면 효소는 <b>어떻게</b> 활성화 에너지를 낮출까요? 효소는 <b>활성 부위</b>에서 기질과 결합해 <b>효소–기질 복합체(ES)</b>를 이루고, 기질들을 가까이 모아 알맞은 방향으로 놓거나 모양에 긴장을 주어 반응을 쉽게 만들어요. 반응이 끝나면 생성물이 떨어져 나가고 효소는 그대로 남아요.</p><p>결합 모형은 두 가지예요: <b>열쇠–자물쇠 모형</b>과 <b>유도 적합 모형</b>. 🔍 입자 모형으로 비교해 봐요.</p>',
      features: ['complex'],
      setup() { S.grp = 'none'; setMode('complex'); },
      recap: '효소는 활성 부위에서 기질과 효소–기질 복합체(ES)를 이루고 반응을 일으킨 뒤 생성물을 내놓아요. E + S ⇌ ES → E + P. 효소는 변하지 않고 다시 쓰여요.',
      summary: '<ul><li><b>E + S ⇌ ES → E + P</b>: 효소(E)와 기질(S)이 결합해 효소–기질 복합체(ES)를 이루고, 반응 후 생성물(P)이 떨어져 나가며 효소는 다시 쓰여요.</li><li><b>열쇠–자물쇠 모형</b>: 활성 부위와 기질이 처음부터 꼭 맞아요. <b>유도 적합 모형</b>: 기질이 결합하면 활성 부위가 기질에 맞게 모양이 변해 꼭 맞춰져요.</li><li>두 모형 모두 <b>기질 특이성</b>을 설명해요. 모양이 비슷하지만 다른 분자는 꼭 맞지 않아 반응하지 못하고, 전혀 다른 분자는 결합하지 못해요.</li><li>활성 부위에서 기질이 알맞은 방향으로 가까이 놓이고 모양에 긴장이 생겨 활성화 에너지가 낮아져요.</li></ul>',
      missions: [
        {
          id: 'react', title: '한 효소가 세 번 일하기',
          goal: '모형에서 <b>맞는 기질 S</b>를 넣어 같은 효소가 <b>3번</b> 반응하도록 하세요. 비슷한 분자 S′와 다른 분자 S″도 넣어 보세요.',
          hint: '기질을 S로 고르고 ▶ 기질 넣기를 눌러요. 반응이 끝나면 효소가 원래 모양으로 돌아와요. 다시 넣어 3번 채워요. 새 효소를 누르면 횟수가 지워져요.',
          setup() { S.grp = 'none'; setMode('complex'); },
          check: () => S.cx.n >= 3 && S.cx.ph === 'idle', hold: 0.6,
          status: () => mark(S.cx.n >= 3) + ' 반응 ' + Math.min(S.cx.n, 3) + ' / 3회 (같은 효소) &nbsp; ' + mark(!!(S.cx.seen[S.cx.model + 'near'] || S.cx.total > 0 && (S.cx.seen.locknear || S.cx.seen.inducednear))) + ' S′ 시험 &nbsp; ' + mark(!!(S.cx.seen.lockfar || S.cx.seen.inducedfar)) + ' S″ 시험',
          explain: '맞는 기질 S는 활성 부위에 결합해 <b>ES 복합체</b>를 이루고 생성물 두 조각으로 나뉘어요. 반응이 끝나면 효소는 <b>원래 모양</b>으로 돌아와 다시 쓰여요. S′는 비슷해도 꼭 맞지 않고, S″는 모양이 달라 결합하지 못해요.',
        },
        {
          id: 'cards', title: '설명과 모형 이름 연결하기', manual: true,
          goal: '세 설명에 맞는 모형을 <b>열쇠–자물쇠 · 유도 적합 · 두 모형 모두</b> 중에서 고르세요.',
          hint: '모형 비교 화면에서 두 가지 모형 버튼을 바꿔 가며 활성 부위(턱)가 어떻게 움직이는지 보세요. 반응 후 생성물이 떨어져 나가고 효소가 다시 쓰이는 것은 두 모형 모두에 해당해요.',
          setup() { S.grp = 'cards'; setMode('complex'); },
          check() {
            const a = cardAns(); if (a.some((x) => !x)) return '세 설명 모두 모형을 골라 주세요.';
            const bad = a.findIndex((x, i) => x !== CARD_OK[i]);
            if (bad >= 0) return (bad + 1) + '번 설명을 다시 생각해 보세요.' + (bad === 0 ? ' 활성 부위의 모양은 변하나요?' : bad === 1 ? ' 활성 부위가 기질에 맞게 변하는 모형이에요.' : ' 두 모형에서 모두 일어나는 일이에요.');
            return true;
          },
          explain: '<b>열쇠–자물쇠 모형</b>은 활성 부위가 기질과 처음부터 꼭 맞고, <b>유도 적합 모형</b>은 기질이 결합하면서 활성 부위의 모양이 맞춰져요. 반응 후 생성물이 떨어져 나가고 효소가 다시 쓰이는 것은 <b>두 모형 모두</b>예요.',
        },
        {
          type: 'quiz', title: '효소의 재사용', goal: '효소 하나가 반응을 마친 뒤에도 <b>다시 반응에 쓰일 수 있는</b> 까닭은?',
          setup() { S.grp = 'none'; setMode('complex'); },
          choices: ['반응할 때마다 새 효소가 만들어지기 때문이다', '생성물이 활성 부위에서 떨어져 나가면 효소가 원래 상태로 돌아오기 때문이다', '효소는 기질과 결합하지 않고 곁에서 지켜보기만 하기 때문이다', '반응이 끝나면 효소가 기질로 바뀌기 때문이다'],
          answer: 1,
          feedback: ['효소는 소모되지 않고 같은 분자가 다시 쓰여요.', '', '효소는 활성 부위에서 기질과 결합해요.', '효소는 반응 전후에 변하지 않아요.'],
          explain: '효소는 기질과 결합해 ES 복합체를 만들지만 반응이 끝나 <b>생성물이 떨어져 나가면 활성 부위가 원래대로</b> 돌아와 다시 기질을 받을 수 있어요.',
        },
      ],
    },
    {
      title: '기질 농도와 반응 속도', short: '속도와 포화', icon: '📈', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 효소–기질 복합체가 만들어지고 효소가 다시 쓰이는 것을 보았어요. 활성 부위는 개수가 정해져 있어요.</div><p>그러면 기질을 계속 늘리면 반응은 얼마든지 빨라질까요? 기질 농도 [S]를 바꿔 가며 <b>반응 초기 속도</b>를 측정해 그래프를 그려요. 활성 부위가 얼마나 차 있는지(<b>점유율</b>)도 함께 봐요.</p><p>그래프에서 <b>최대 속도(Vmax)</b>와 속도가 Vmax의 절반이 되는 기질 농도(<b>반속도 농도</b>)를 읽어요. 수식은 쓰지 않고 그래프로만 읽어요.</p>',
      features: ['rate'],
      setup() { S.grp = 'none'; setMode('rate'); },
      recap: '기질 농도가 낮을 때는 속도가 기질 농도에 거의 비례하지만, 모든 활성 부위가 기질로 차면 속도가 더 늘지 않는 포화 곡선이 돼요. 효소 양을 2배로 하면 Vmax가 2배가 돼요.',
      summary: '<ul><li><b>기질 농도–반응 속도 그래프</b>는 포화 곡선이에요. 기질이 적을 때는 활성 부위가 많이 비어 있어 속도가 기질 농도에 거의 <b>비례</b>하고, 기질이 많으면 모든 효소가 기질과 결합(ES)해 있어 속도가 <b>일정</b>해져요.</li><li><b>최대 속도 Vmax</b>(예: 100 μmol/분)와 속도가 Vmax의 절반(50)인 <b>반속도 농도</b>(예: 2 mM)를 그래프에서 읽어요. 이 수치는 이 자료의 값이에요.</li><li><b>효소 농도를 2배</b>로 하면 같은 기질 농도에서 속도가 약 2배, Vmax도 2배(200)가 되고, 반속도 농도는 그대로(2 mM)예요.</li></ul>',
      missions: [
        {
          id: 'pts', title: '7점 측정해 그래프 그리기',
          goal: '기질 농도 슬라이더로 <b>0.5 · 1 · 2 · 4 · 8 · 16 · 32 mM</b> 7점의 속도를 모두 측정하세요. (효소 1단위)',
          hint: '슬라이더를 한 칸씩 옮기고 📏 속도 측정을 눌러요. 측정할 때마다 점이 그래프로 날아가요. 효소 1단위가 선택되어 있어야 해요.',
          setup() { S.grp = 'none'; S.rt.units = 1; setMode('rate'); },
          check: () => rtCount(1) >= 7 && S.rt.flies.every((f) => f.shown), hold: 0.6,
          status: () => mark(rtCount(1) >= 7) + ' 측정한 점 ' + rtCount(1) + ' / 7 &nbsp; ' + SLEVS.map((s, i) => mark(S.rt.pts[1][i] != null) + sTxt(s)).join(' '),
          explain: '기질 농도가 낮을 때는 속도가 거의 <b>비례</b>해서 늘다가, 농도가 높아질수록 늘어나는 폭이 줄어요. 점유율(활성 부위가 기질로 찬 비율)도 같은 모양으로 늘어요.',
        },
        {
          id: 'readV', title: 'Vmax와 반속도 농도 읽기',
          goal: '곡선에서 <b>최대 속도 Vmax</b>와 속도가 Vmax의 <b>절반</b>이 되는 기질 농도를 읽어 쓰세요. 그리고 효소 2단위로도 한 점 이상 측정하세요.',
          hint: '점선 Vmax(빨강)와 ½ Vmax(파랑)를 눈금에서 읽어요. 반속도 농도는 ½ Vmax 높이에서 곡선과 만나는 점의 가로 눈금이에요. 효소 2단위 버튼을 누르고 측정해 보세요.',
          setup() { S.grp = 'read'; setMode('rate'); },
          check: () => near(numIn('inVmax'), 100, 10) && near(numIn('inKm'), 2, 0.6) && rtCount(2) >= 1 && S.rt.flies.every((f) => f.shown), hold: 0.5,
          status: () => mark(near(numIn('inVmax'), 100, 10)) + ' Vmax 읽기 &nbsp; ' + mark(near(numIn('inKm'), 2, 0.6)) + ' 반속도 농도 읽기 &nbsp; ' + mark(rtCount(2) >= 1) + ' 효소 2단위 측정',
          explain: '곡선은 <b>Vmax ≈ 100</b> μmol/분에 가까워지고, 속도가 그 절반(50)이 되는 기질 농도는 <b>2 mM</b>이에요. 효소를 2단위로 하면 같은 기질 농도에서 속도가 약 2배, Vmax는 200이 되지만 반속도 농도는 그대로예요.',
        },
        {
          type: 'quiz', title: '포화와 효소의 양', goal: '다음 중 <b>옳은 설명</b>은?',
          setup() { S.grp = 'none'; setMode('rate'); },
          choices: ['기질 농도를 높이면 반응 속도는 한없이 증가한다', '기질이 아주 많으면 활성 부위가 모두 차서 속도가 더 늘지 않으며, 효소를 2배로 하면 Vmax도 2배가 된다', '효소를 2배로 하면 반속도 농도도 2배가 된다', '기질이 적을 때 속도는 기질 농도와 관계가 없다'],
          answer: 1,
          feedback: ['활성 부위의 수가 정해져 있어서 속도는 Vmax에서 멈춰요.', '', '반속도 농도는 2 mM 그대로였어요.', '기질이 적을 때는 속도가 기질 농도에 거의 비례해요.'],
          explain: '기질이 충분하면 <b>모든 활성 부위가 기질로 차서</b> 속도가 더 늘지 않아요(<b>포화</b>). 효소를 2배로 하면 활성 부위가 2배라서 Vmax가 2배가 돼요.',
        },
      ],
    },
    {
      title: '속도 변화 예측', short: '예측하기', icon: '🎯', phase: '예측',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 기질 농도가 낮을 때는 속도가 기질에 비례하고, 높을 때는 포화된다는 것을 확인했어요.</div><p>이제 배운 것을 <b>예측</b>에 써요. 조건 카드 8장을 보고 반응 속도가 <b>감소 · 소폭 증가 · 크게 증가</b> 중 어떻게 될지 먼저 골라요. 그런 다음 ▶ 실행으로 확인해요.</p><p>활성 부위가 얼마나 차 있는지, 일하는 효소가 몇 개인지를 떠올리면 쉬워요.</p>',
      features: ['predict'],
      setup() { S.grp = 'none'; setMode('predict'); },
      recap: '기질이 부족하면 기질을, 기질이 충분하면 효소의 양을 늘려야 속도가 크게 늘어요. 고온이나 변성으로 일하는 효소가 줄면 속도가 줄어요. 효소는 활성화 에너지를 낮추는 역할을 해요.',
      summary: '<ul><li>기질이 <b>부족</b>할 때는 기질을 늘리면 속도가 크게 늘고, 기질이 <b>충분</b>할 때는 기질을 더 늘려도 소폭만 늘어요. 이때는 <b>효소의 양</b>을 늘려야 속도가 크게 늘어요.</li><li>효소가 <b>변성</b>(고온, 삶음)되면 일하는 효소가 줄어 속도가 크게 줄어요.</li><li>효소는 반응의 <b>활성화 에너지를 낮추고</b> 자신은 소모되지 않아요. 효소 1분자가 하루 종일 일할 수 있어서 적은 양으로도 많은 기질을 처리해요(카탈레이스 1분자는 1초에 약 4천만 개의 H₂O₂를 분해).</li></ul>',
      missions: [
        {
          id: 'run8', title: '8장 예측하고 확인하기',
          goal: '조건 카드 <b>8장</b>마다 먼저 속도 변화를 예측하고, <b>▶ 실행해서 확인</b>하세요.',
          hint: '카드를 고르고(아래 칸을 눌러요) 예측 버튼을 누른 뒤 실행해요. 틀려도 괜찮아요. 결과 설명을 읽으면서 활성 부위가 얼마나 차 있는지 생각해 봐요.',
          setup() { S.grp = 'none'; setMode('predict'); },
          check: () => prRanN() >= 8, hold: 0.5,
          status: () => mark(prRanN() >= 8) + ' 실행한 카드 ' + prRanN() + ' / 8 &nbsp; ✨ 예측이 맞은 카드 ' + prMatch(),
          explain: '기질이 부족하면 <b>기질을 늘릴 때</b> 속도가 크게 늘고, 이미 충분하면 <b>효소를 늘려야</b> 속도가 크게 늘어요. 효소를 삶거나 60 °C로 가열하면 변성되어 속도가 크게 줄어요.',
        },
        {
          type: 'quiz', title: '속도를 더 높이려면', goal: '기질이 이미 <b>충분히 많은</b> 상태(32 mM)에서 반응 속도를 <b>크게</b> 높이는 가장 좋은 방법은?',
          setup() { S.grp = 'none'; setMode('predict'); },
          choices: ['기질을 두 배 더 넣는다', '용액을 60 °C로 가열한다', '효소의 양을 늘린다', '활성 부위를 기질로 더 채운다'],
          answer: 2,
          feedback: ['이미 포화에 가까워서 기질을 더 넣어도 속도는 거의 그대로예요.', '60 °C에서는 효소가 변성되어 속도가 줄어요.', '', '이미 활성 부위가 거의 다 차 있어요.'],
          explain: '기질이 충분하면 속도는 <b>일하는 활성 부위의 수</b>가 정해요. 그래서 <b>효소의 양을 늘리면</b> 속도가 크게 늘어요. 효소는 활성화 에너지를 낮추는 역할을 하고, 소모되지 않아 적은 양으로도 많은 기질을 처리해요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hy-enzyme-mechanism', mount: '#game', badge: '효소 기작 탐험가', homeHref: '../../index.html#hy',
    featureLabels: { energy: '⛰ 활성화 에너지 언덕', complex: '🔍 효소–기질 입자 모형', rate: '📈 기질 농도–속도 그래프', predict: '🎯 속도 예측 카드' },
    onFeatures() { updateCtl(); },
    levels,
  });

  function readouts() {
    const m = S.mode;
    if (m === 'energy') setReads(['활성화 에너지', S.en.read ? fi(S.en.ea.v) + ' (상대값)' : '눈금으로 읽어요', '10초 생성물', S.en.meas ? S.en.meas.cnt + '개 (측정 중)' : (S.en.res[S.en.enz ? 'yes' : 'no'] ? S.en.res[S.en.enz ? 'yes' : 'no'].n + '개' : '—'), '온도', S.en.temp + ' °C']);
    else if (m === 'complex') setReads(['결합 모형', S.cx.model === 'lock' ? '열쇠–자물쇠' : '유도 적합', '이 효소의 반응', S.cx.n + '회', '시도한 기질', S.cx.sub === 'S' ? 'S (맞음)' : S.cx.sub === 'near' ? 'S′ (비슷함)' : 'S″ (다름)']);
    else if (m === 'rate') setReads(['기질 농도 [S]', sTxt(SLEVS[S.rt.idx]) + ' mM', '반응 속도', rtV(S.rt.idx, S.rt.units) + ' μmol/분', '점유율', Math.round(100 * rtOccProb()) + ' %']);
    else setReads(['카드', (S.pr.i + 1) + ' / 8', '실행한 카드', prRanN() + ' / 8', '예측이 맞은 카드', prMatch() + '']);
  }

  enInit(); cxInit();
  setMode('energy');
  let lastFree = false, lastLv = -1;
  SciSim.loop((dt, t) => {
    clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (game && game.level !== lastLv) { lastLv = game.level; updateCtl(); }
    view.apply(); FX.update(dt); ctx.clearRect(0, 0, VW, VH);
    bgFill('#f3f6ee', '#e8eee2');
    updLater(dt);
    if (S.mode !== 'energy') enUpdate(dt);
    if (S.mode !== 'complex') cxStep(dt);
    if (S.mode !== 'rate') rtUpdate(dt);
    if (S.mode === 'energy') enDraw(dt, t); else if (S.mode === 'complex') cxDraw(dt, t); else if (S.mode === 'rate') rtDraw(dt, t); else prDraw(dt, t);
    FX.draw(); parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(241,246,243,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : approach(S.fade, 0, dt, 9); }
    readouts();
  });

  const enFlush2 = (sec) => enFlush(sec);
  window.__sim = { S, VW, VH, PHONE, get game() { return game; }, levels, setMode, enGo, enSetEnz, enFlush: enFlush2, cxGo, cxReset, cxSetModel, rtMeasure, rtClear, rtFlush: (sec) => { const n = Math.ceil(sec / 0.05); for (let i = 0; i < n; i++) rtUpdate(0.05); }, prRun, prSelect, CARDS, updateCtl, SLEVS, rtCount, cxStep, prRanN, enBothOk };
})();
