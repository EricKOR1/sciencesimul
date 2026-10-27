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
     고등학교 세포와 물질대사 · Ⅱ. 물질대사와 에너지 - 물질대사와 에너지 출입 (단원 57, 1차시)
     성취기준 [12세포02-01] 물질대사는 생명체에서 생명을 유지하기 위해 일어나는 화학 반응임을 이해하고 에너지의 출입이 동반됨을 추론할 수 있다.
     ① 실험: 발아 콩 (온도 · 산소 소비 · 이산화 탄소)  ② 분석: 에너지 계산 (건조 질량 · 아밀레이스)
     ③ 모형: 단계적 반응 (연소 vs 세포)  ④ 적용: 대사 판별
     ========================================================= */
  const S = { mode: 'bean', fade: 0 };
  let game = null;

  /* ---------- 가상 실험 자료 (같은 종 콩 20 g, 25 °C) ---------- */
  const SK = ['dry', 'germ', 'boil'];
  const SAMP = {
    dry: { name: '마른 콩', sub: '물을 흡수하기 전', col: '#c79b4f', line: '#a16207' },
    germ: { name: '발아 중인 콩', sub: '싹이 튼 지 3일', col: '#e8d595', line: '#16a34a' },
    boil: { name: '삶은 콩', sub: '대조군', col: '#a98a68', line: '#64748b' },
  };
  const TEMP = { dry: [22.0, 22.0, 22.0, 22.0], germ: [22.0, 22.3, 22.9, 23.8], boil: [22.0, 22.0, 22.1, 22.1] };
  const O2V = { dry: [0, 0, 0, 0], germ: [0.2, 1.2, 3.5, 6.8], boil: [0, 0, 0, 0] };
  const interp = (arr, d) => { const i = Math.min(3, Math.floor(d + 1e-9)), f = d - i; return arr[i] + (arr[Math.min(3, i + 1)] - arr[i]) * f; };
  const DRYM = { 0: 10.0, 2: 9.6, 4: 9.0, 6: 8.4 };
  const REMAIN = { 0: 100, 2: 55, 4: 25 };
  const KCAL_G = 4;

  /* =========================================================
     ① 발아 콩 실험대
     ========================================================= */
  S.bn = { view: 'temp', day: 0, tgt: 0, focus: null, bub: { dry: [], germ: [], boil: [] }, seen: { temp: false, o2: false, co2: false }, tick: 0 };
  const bnColR = (i) => (PHONE ? { x: 10 + i * 157, y: 10, w: 148, h: 250 } : { x: 14 + i * 261, y: 14, w: 250, h: 290 });
  const BN_G = PHONE ? { x: 10, y: 268, w: 460, h: 190 } : { x: 14, y: 316, w: 480, h: 230 };
  const BN_T = PHONE ? { x: 10, y: 468, w: 460, h: 162 } : { x: 506, y: 316, w: 280, h: 230 };
  const BN_R = PHONE ? { x: 10, y: 268, w: 460, h: 362 } : { x: 14, y: 316, w: 772, h: 230 };
  function bnReset() {
    const b = S.bn; b.day = 0; b.tgt = 0; b.o2Done = false; b.bub = { dry: [], germ: [], boil: [] }; FX.clear(); updateCtl();
  }
  function bnStep() { S.bn.tgt = Math.min(3, Math.floor(S.bn.day + 1e-6) + 1, S.bn.tgt + 1); Sound.click(); updateCtl(); }
  function bnAll() { S.bn.tgt = 3; Sound.click(); updateCtl(); }
  function bnSetView(v) { S.bn.view = v; S.bn.seen[v] = true; S.bn.bub = { dry: [], germ: [], boil: [] }; Sound.click(); updateCtl(); }
  const bnRate = (k) => (k === 'germ' && S.bn.day > 0.01 ? clamp((interp(O2V.germ, Math.min(3, S.bn.day + 0.01)) - interp(O2V.germ, S.bn.day)) * 4 + 0.3, 0.25, 1.4) : 0);
  const bnGerm = () => clamp(S.bn.day / 3, 0, 1);

  /* 콩 한 알 */
  function beanShape(x, y, s, rot, col, o) {
    o = o || {};
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot || 0); ctx.scale(s, s);
    ctx.globalAlpha = o.alpha == null ? 1 : o.alpha;
    ctx.fillStyle = col; ctx.strokeStyle = C.shade(col, -0.38); ctx.lineWidth = 1.6 / s;
    ctx.beginPath(); ctx.ellipse(0, 0, 10, 6.4, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.38)'; ctx.beginPath(); ctx.ellipse(-3, -2.6, 4.4, 1.9, -0.25, 0, TAU); ctx.fill();
    ctx.fillStyle = C.shade(col, -0.42); ctx.beginPath(); ctx.ellipse(1.5, 2.4, 2.4, 1.1, 0, 0, TAU); ctx.fill();
    if (o.wrinkle) { ctx.strokeStyle = C.shade(col, -0.3); ctx.lineWidth = 0.9 / s; for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(-6 + k * 3, -3); ctx.quadraticCurveTo(-4 + k * 3, 0, -6 + k * 3.5, 3.4); ctx.stroke(); } }
    ctx.restore();
  }
  /* 뿌리와 싹 (len 0~1) */
  function sprout(x, y, len, s) {
    if (len <= 0.02) return;
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.strokeStyle = '#f4efd8'; ctx.lineCap = 'round'; ctx.lineWidth = 3.2;
    ctx.beginPath(); ctx.moveTo(-8, 3); ctx.quadraticCurveTo(-14 - len * 4, 8 + len * 6, -12 - len * 10, 10 + len * 18); ctx.stroke();
    ctx.strokeStyle = '#86d19a'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(8, -4); ctx.quadraticCurveTo(12 + len * 3, -9 - len * 8, 10 + len * 5, -10 - len * 14); ctx.stroke();
    ctx.restore();
  }
  function beansGroup(key, cx, cy, s, g) {
    const sp = SAMP[key], pos = [[-18, 2, -0.3], [4, -6, 0.2], [20, 5, 0.5]];
    pos.forEach((q, i) => {
      const x = cx + q[0] * s, y = cy + q[1] * s;
      if (key === 'germ') sprout(x, y, 0.55 + 0.45 * g, s * 0.8);
      beanShape(x, y, s * (key === 'dry' ? 0.85 : key === 'germ' ? 1.0 : 1.0), q[2], sp.col, { wrinkle: key === 'dry' });
    });
  }
  /* 온도 눈금이 있는 보온병 */
  function thermos(cx, top, w, h, key, tempV) {
    const x = cx - w / 2;
    D.shadow(() => { D.roundRect(x, top + 14, w, h - 14, 16); const g = ctx.createLinearGradient(x, 0, x + w, 0); g.addColorStop(0, '#9aa7b8'); g.addColorStop(0.4, '#e7edf5'); g.addColorStop(1, '#8794a8'); ctx.fillStyle = g; ctx.fill(); }, { blur: 8, y: 3 });
    D.roundRect(x + w * 0.2, top + 40, w * 0.6, h - 60, 12); ctx.fillStyle = 'rgba(255,248,230,.96)'; ctx.fill();   // 안쪽이 보이는 창
    beansGroup(key, cx, top + h - 34, 0.9, bnGerm());
    D.roundRect(x + 4, top, w - 8, 18, 6); ctx.fillStyle = '#334155'; ctx.fill();   // 마개
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(cx + w * 0.22, top + 4); ctx.lineTo(cx + w * 0.22, top + h * 0.45); ctx.stroke();   // 온도계 막대
  }
  /* 산소 소비 측정 장치: 밀폐 용기 + KOH 용액 + 눈금 관 */
  function respirometer(r, key, o2v, t) {
    const PW = r.w, jx = r.x + PW * (PHONE ? 0.3 : 0.3), jw = PHONE ? 62 : 92, jh = PHONE ? 86 : 118, jy = r.y + r.h - jh - (PHONE ? 30 : 34);
    // 용기
    D.shadow(() => { D.roundRect(jx - jw / 2, jy, jw, jh, 10); ctx.fillStyle = 'rgba(214,236,250,.55)'; ctx.fill(); }, { blur: 6, y: 2 });
    ctx.strokeStyle = '#8fb3d0'; ctx.lineWidth = 2.5; D.roundRect(jx - jw / 2, jy, jw, jh, 10); ctx.stroke();
    D.roundRect(jx - jw / 2 - 3, jy - 8, jw + 6, 12, 5); ctx.fillStyle = '#475569'; ctx.fill();
    beansGroup(key, jx + 2, jy + jh - 18, PHONE ? 0.62 : 0.8, bnGerm());
    // KOH 용액 컵
    const cw = PHONE ? 24 : 32, cx0 = jx - cw / 2 - (PHONE ? 10 : 14), cy0 = jy + jh - (PHONE ? 38 : 52);
    D.roundRect(cx0 - 2, cy0 + 4, cw + 4, PHONE ? 22 : 28, 5); ctx.fillStyle = 'rgba(167,139,250,.7)'; ctx.fill(); ctx.strokeStyle = '#7c3aed'; ctx.lineWidth = 1.5; ctx.stroke();
    // 관: 용기 뚜껑 → 눈금 관 꼭대기, 눈금 관 아래는 붉은 물 그릇
    const tx = r.x + PW * (PHONE ? 0.8 : 0.78), ty = r.y + (PHONE ? 84 : 112), th = PHONE ? 108 : 130;
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(jx, jy - 8); ctx.lineTo(jx, ty - 16); ctx.lineTo(tx, ty - 16); ctx.lineTo(tx, ty + 2); ctx.stroke();
    // 붉은 물 그릇
    D.roundRect(tx - 17, ty + th + 2, 34, 18, 6); ctx.fillStyle = '#ef476f'; ctx.fill(); ctx.strokeStyle = '#be123c'; ctx.lineWidth = 1.6; ctx.stroke();
    // 눈금 관
    D.roundRect(tx - 8, ty, 16, th + 6, 8); ctx.fillStyle = '#f8fbff'; ctx.fill(); ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 2; ctx.stroke();
    const lvl = clamp(o2v / 8, 0, 1) * (th - 14);
    if (lvl > 0.5) { ctx.save(); D.roundRect(tx - 8, ty, 16, th + 6, 8); ctx.clip(); ctx.fillStyle = '#ef476f'; ctx.fillRect(tx - 8, ty + th - lvl + 4, 16, lvl + 4); ctx.restore(); }
    for (let v = 0; v <= 8; v += 2) { const yy = ty + th - 3 - (v / 8) * (th - 14); ctx.fillStyle = '#64748b'; ctx.fillRect(tx + 9, yy, 6, 1.6); T(tx + 18, yy + 4, String(v), 13, '#64748b', 'left', 700); }
    T(tx + 24, ty - 8, 'mL', 13, '#64748b', 'left', 800);
    T(r.x + r.w / 2, r.y + r.h - 8, 'O₂ 소비 ' + fix1(o2v) + ' mL', PHONE ? 14 : 16, o2v > 0.3 ? '#be123c' : '#475569', 'center', 800);
    if (!PHONE) T(cx0 + cw / 2, cy0 - 3, 'KOH', 13, '#6d28d9', 'center', 800);
  }
  /* 이산화 탄소 확인 장치: 용기 → 석회수 · BTB */
  function co2Rig(r, key, cloud, t) {
    const PW = r.w, jx = r.x + PW * 0.2, jw = PHONE ? 50 : 72, jh = PHONE ? 86 : 118, jy = r.y + r.h - jh - (PHONE ? 46 : 54);
    D.shadow(() => { D.roundRect(jx - jw / 2, jy, jw, jh, 10); ctx.fillStyle = 'rgba(214,236,250,.55)'; ctx.fill(); }, { blur: 6, y: 2 });
    ctx.strokeStyle = '#8fb3d0'; ctx.lineWidth = 2.5; D.roundRect(jx - jw / 2, jy, jw, jh, 10); ctx.stroke();
    D.roundRect(jx - jw / 2 - 3, jy - 8, jw + 6, 12, 5); ctx.fillStyle = '#475569'; ctx.fill();
    beansGroup(key, jx, jy + jh - 18, PHONE ? 0.55 : 0.72, bnGerm());
    // 시험관 두 개 (석회수 · BTB)
    const tw = PHONE ? 24 : 34, th = PHONE ? 112 : 142, ty = r.y + r.h - th - (PHONE ? 46 : 54);
    const tubes = [{ x: r.x + PW * (PHONE ? 0.52 : 0.52), nm: '석회수' }, { x: r.x + PW * (PHONE ? 0.84 : 0.82), nm: 'BTB' }];
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(jx, jy - 8); ctx.lineTo(jx, ty - 12); ctx.lineTo(tubes[1].x, ty - 12); ctx.stroke();
    tubes.forEach((tb, i) => {
      const liq = i === 0 ? C.mix('#e8f3fb', '#f7f5ee', cloud) : (cloud < 0.5 ? C.mix('#3b82d9', '#4ec27a', cloud * 2) : C.mix('#4ec27a', '#f4d03f', (cloud - 0.5) * 2));
      ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(tb.x, ty - 12); ctx.lineTo(tb.x, ty + th * 0.6); ctx.stroke();
      D.testTube(tb.x, ty, tw, th, { level: 0.62, liquid: liq });
      if (i === 0 && cloud > 0.05) { ctx.save(); const path = () => { ctx.beginPath(); ctx.moveTo(tb.x - tw / 2, ty + th * 0.38); ctx.lineTo(tb.x - tw / 2, ty + th - tw / 2); ctx.arc(tb.x, ty + th - tw / 2, tw / 2, Math.PI, 0, true); ctx.lineTo(tb.x + tw / 2, ty + th * 0.38); }; path(); ctx.closePath(); ctx.clip(); for (let k = 0; k < 22; k++) { ctx.fillStyle = 'rgba(255,255,255,' + (0.55 * cloud) + ')'; ctx.beginPath(); ctx.arc(tb.x - tw / 2 + 4 + ((k * 37) % 100) / 100 * (tw - 8), ty + th * 0.4 + ((k * 61) % 100) / 100 * th * 0.58, 2.2 + (k % 3), 0, TAU); ctx.fill(); } ctx.restore(); }
      T(tb.x, ty + th + (PHONE ? 16 : 18), tb.nm, 13, '#334155', 'center', 800);
    });
    // 방울
    const bl = S.bn.bub[key];
    bl.forEach((b) => { ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.strokeStyle = 'rgba(80,120,170,.6)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill(); ctx.stroke(); });
    return { tubes, ty, th, tw };
  }
  function bnBubbles(dt, r, key, rig) {
    const bl = S.bn.bub[key], rate = bnRate(key) * (S.bn.day < S.bn.tgt - 1e-6 || S.bn.day > 0 ? 1 : 0);
    if (!RM && rate > 0 && Math.random() < dt * 5 * rate) { const tb = rig.tubes[Math.random() < 0.55 ? 0 : 1]; bl.push({ x: tb.x + (Math.random() - 0.5) * 6, y: rig.ty + rig.th * 0.86, vy: -26 - Math.random() * 14, r: 2 + Math.random() * 1.8, life: (rig.th * 0.5) }); }
    for (let i = bl.length - 1; i >= 0; i--) { const b = bl[i]; b.y += b.vy * dt; b.life += b.vy * dt; if (b.life <= 0) bl.splice(i, 1); }
    if (bl.length > 30) bl.splice(0, bl.length - 30);
  }
  function bnColumn(i, t, dt) {
    const key = SK[i], r = bnColR(i), sp = SAMP[key], b = S.bn, foc = b.focus === key;
    D.shadow(() => { D.roundRect(r.x, r.y, r.w, r.h, 18); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: 8, y: 2 });
    if (foc) { D.roundRect(r.x, r.y, r.w, r.h, 18); ctx.strokeStyle = sp.line; ctx.lineWidth = 3; ctx.stroke(); }
    TF(r.x + r.w / 2, r.y + L(28, 24), sp.name, r.w - 16, L(18, 14.5), 12.5, '#1f2d44', 'center', 800);
    T(r.x + r.w / 2, r.y + L(48, 42), sp.sub, L(13.5, 13), key === 'boil' ? '#b45309' : '#64748b', 'center', 800);
    beansGroup(key, r.x + r.w / 2, r.y + L(88, 76), L(1.15, 0.95), bnGerm());
    if (key === 'boil' && b.view === 'temp') D.label(r.x + r.w - L(46, 40), r.y + L(88, 76), '대조군', { bg: '#b45309', size: 13 });
    const d = b.day;
    if (b.view === 'temp') {
      const tv = interp(TEMP[key], d), cx = r.x + r.w * (PHONE ? 0.3 : 0.36), top = r.y + L(118, 90), h = L(150, 120), w = L(90, 62);
      thermos(cx, top, w, h, key, tv);
      const tx = r.x + r.w * (PHONE ? 0.68 : 0.78), ty = r.y + L(122, 92), th = L(112, 92);
      D.thermometer(tx, ty, th, tv, 21, 25, { color: '#e2464b', step: 1, unit: '°' });
      ctx.strokeStyle = '#94a3b8'; ctx.setLineDash([4, 4]); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(cx + w * 0.22, top + 8); ctx.lineTo(tx - 12, ty + 8); ctx.stroke(); ctx.setLineDash([]);
      T(r.x + r.w / 2, r.y + r.h - 8, fix1(tv) + ' °C', L(20, 16), tv - 22 > 0.5 ? '#be123c' : '#334155', 'center', 800);
    } else if (b.view === 'o2') {
      respirometer(r, key, interp(O2V[key], d), t);
    } else {
      const ck = key === 'germ' ? clamp(interp(O2V.germ, d) / 6.8, 0, 1) : 0;
      const rig = co2Rig(r, key, ck, t);
      bnBubbles(dt, r, key, rig);
      T(r.x + r.w / 2, r.y + r.h - 8, ck > 0.45 ? L('석회수 뿌옇게, BTB 노랑', '뿌옇게 · 노랑') : ck > 0.08 ? '변하는 중…' : '변화 없음', L(15, 13.5), ck > 0.45 ? '#b45309' : '#64748b', 'center', 800);
    }
  }
  function bnGraph(t) {
    const b = S.bn, isT = b.view === 'temp', ymin = isT ? 21 : 0, ymax = isT ? 25 : 8;
    panel(BN_G.x, BN_G.y, BN_G.w, BN_G.h, 18, '#fff');
    const p = mkPlot(BN_G, { x0: 0, x1: 3, y0: ymin, y1: ymax, xt: [0, 1, 2, 3], yt: isT ? [21, 22, 23, 24, 25] : [0, 2, 4, 6, 8], xfmt: (v) => v + '일', xl: '시간(일)', yl: isT ? '온도 (°C)' : '산소 소비량 (mL)', m: PHONE ? { l: 40, t: 30, r: 62, b: 38 } : { l: 48, t: 34, r: 84, b: 40 } });
    drawAxes(p);
    SK.forEach((k) => {
      const arr = (isT ? TEMP : O2V)[k], col = SAMP[k].line, foc = !b.focus || b.focus === k;
      ctx.save(); ctx.globalAlpha = foc ? 1 : 0.28; ctx.strokeStyle = col; ctx.lineWidth = k === 'germ' ? 4 : 3; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      if (k === 'boil') ctx.setLineDash([2, 6]); else if (k === 'dry') ctx.setLineDash([9, 5]);
      ctx.beginPath(); const nd = Math.floor(b.day + 1e-6);
      for (let d = 0; d <= nd; d++) { const x = p.X(d), y = p.Y(arr[d]); if (d === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
      if (b.day > nd + 1e-6) ctx.lineTo(p.X(b.day), p.Y(interp(arr, b.day)));
      ctx.stroke(); ctx.setLineDash([]);
      for (let d = 0; d <= nd; d++) D.sphere(p.X(d), p.Y(arr[d]), k === 'germ' ? 5.5 : 4.5, col, { gloss: false });
      const ly = p.Y(interp(arr, b.day)) + (isT ? (k === 'dry' ? -15 : k === 'boil' ? 15 : 0) : (k === 'dry' ? -13 : k === 'boil' ? -27 : 0));
      if (nd >= 0) T(p.X(b.day) + 9, ly + 4, SAMP[k].name.replace('발아 중인 ', '발아 ') , 13, col, 'left', 800);
      ctx.restore();
    });
    D.label(BN_G.x + BN_G.w - (PHONE ? 62 : 70), BN_G.y + 20, '측정 ' + Math.floor(b.day + 1e-6) + '일째', { bg: '#475569', size: 13 });
  }
  function bnTable() {
    const b = S.bn, isT = b.view === 'temp', data = isT ? TEMP : O2V;
    panel(BN_T.x, BN_T.y, BN_T.w, BN_T.h, 18, '#fff');
    T(BN_T.x + 14, BN_T.y + 26, (isT ? '🌡️ 온도 기록 (°C)' : '💨 산소 소비 기록 (mL)'), L(16, 15), '#1f2d44', 'left', 800);
    const x0 = BN_T.x + 12, w0 = PHONE ? 112 : 78, cw = (BN_T.w - 24 - w0) / 4, y0 = BN_T.y + 44, rh = (BN_T.h - 56) / 4;
    for (let c = 0; c < 4; c++) T(x0 + w0 + cw * c + cw / 2, y0 + rh * 0.65, c + '일', 13.5, '#64748b', 'center', 800);
    SK.forEach((k, r) => {
      const y = y0 + rh * (r + 1);
      D.roundRect(x0, y + 3, BN_T.w - 24, rh - 6, 8); ctx.fillStyle = b.focus === k ? C.rgba(SAMP[k].line, 0.14) : (r % 2 ? '#fff' : '#f8fafc'); ctx.fill();
      TF(x0 + 8, y + rh * 0.62, SAMP[k].name.replace('발아 중인 ', '발아 '), w0 - 8, 14, 12, SAMP[k].line, 'left', 800);
      for (let c = 0; c < 4; c++) {
        const got = b.day >= c - 1e-3, v = data[k][c];
        T(x0 + w0 + cw * c + cw / 2, y + rh * 0.62, got ? (isT ? fix1(v) : fix1(v)) : '—', L(15, 14), got ? '#1f2d44' : '#cbd5e1', 'center', 800);
      }
    });
  }
  function bnResult(t) {
    panel(BN_R.x, BN_R.y, BN_R.w, BN_R.h, 18, '#fff');
    const b = S.bn, ck = clamp(interp(O2V.germ, b.day) / 6.8, 0, 1);
    T(BN_R.x + 16, BN_R.y + 28, '🫧 이산화 탄소(CO₂) 확인 결과', L(17, 14.5), '#1f2d44', 'left', 800);
    D.label(BN_R.x + BN_R.w - 70, BN_R.y + 24, '측정 ' + Math.floor(b.day + 1e-6) + '일째', { bg: '#475569', size: 13 });
    const cw = PHONE ? BN_R.w - 24 : (BN_R.w - 24 - 20) / 3, ch = PHONE ? 90 : 120;
    SK.forEach((k, i) => {
      const x = PHONE ? BN_R.x + 12 : BN_R.x + 12 + i * (cw + 10), y = PHONE ? BN_R.y + 44 + i * (ch + 10) : BN_R.y + 48;
      D.roundRect(x, y, cw, ch, 12); ctx.fillStyle = '#f8fafc'; ctx.fill(); ctx.strokeStyle = C.rgba(SAMP[k].line, 0.6); ctx.lineWidth = 2; ctx.stroke();
      T(x + 12, y + 24, SAMP[k].name, 15, SAMP[k].line, 'left', 800);
      const c = k === 'germ' ? ck : 0, on = c > 0.45;
      T(x + 12, y + 50, '석회수: ' + (on ? '뿌옇게 흐려짐' : c > 0.08 ? '흐려지는 중' : '맑음'), 14, '#334155', 'left', 700);
      const btb = c < 0.5 ? C.mix('#3b82d9', '#4ec27a', c * 2) : C.mix('#4ec27a', '#f4d03f', (c - 0.5) * 2);
      D.sphere(x + 18, y + 72, 8, btb, { gloss: true }); T(x + 34, y + 77, 'BTB: ' + (c > 0.9 ? '노란색' : c > 0.5 ? '초록 → 노랑' : c > 0.08 ? '파랑 → 초록' : '파란색 그대로'), 14, '#334155', 'left', 700);
      if (!PHONE) T(x + 12, y + 102, on ? 'CO₂ 발생 = 호흡' : '호흡 없음', 14, on ? '#b45309' : '#94a3b8', 'left', 800);
    });
    if (!PHONE) textBlock(BN_R.x + 16, BN_R.y + 196, BN_R.w - 32, 'CO₂가 나오면 석회수가 뿌옇게 흐려지고, BTB 용액은 파란색 → 초록색 → 노란색으로 변해요.', 14, '#475569', 20, 700);
  }
  S.bn.pt = {
    down(p) { for (let i = 0; i < 3; i++) if (inRect(p.x, p.y, bnColR(i))) { S.bn.focus = S.bn.focus === SK[i] ? null : SK[i]; Sound.tick(); break; } return false; },
    hover(p) { for (let i = 0; i < 3; i++) if (inRect(p.x, p.y, bnColR(i))) return 'pointer'; return 'default'; },
  };
  function bnDraw(dt, t) {
    const b = S.bn;
    if (b.day < b.tgt) { b.day = RM ? b.tgt : Math.min(b.tgt, b.day + dt * 0.5); if (b.tgt - b.day < 1e-4) { b.day = b.tgt; updateCtl(); } }
    SK.forEach((_, i) => bnColumn(i, t, dt));
    if (b.view === 'co2') bnResult(t); else { bnGraph(t); bnTable(); }
  }

  /* =========================================================
     ② 에너지 계산 : 건조 질량 감소 · 아밀레이스 활성
     ========================================================= */
  S.ms = { day: 0, bar: new Num(0), seenAmy: false, lastOk: false };
  const MS_G = PHONE ? { x: 10, y: 10, w: 460, h: 232 } : { x: 14, y: 14, w: 500, h: 300 };
  const MS_B = PHONE ? { x: 10, y: 250, w: 460, h: 112 } : { x: 526, y: 14, w: 260, h: 300 };
  const MS_E = PHONE ? { x: 10, y: 370, w: 460, h: 260 } : { x: 14, y: 326, w: 772, h: 220 };
  const msLoss = () => Math.round((DRYM[0] - DRYM[S.ms.day]) * 10) / 10;
  const msKcal = () => Math.round(msLoss() * KCAL_G * 10) / 10;
  const msOk = () => near(numIn('inLoss'), msLoss(), 0.06) && near(numIn('inKcal'), msKcal(), 0.06) && msLoss() > 0;
  const ATP_FR = 0.32;
  function msDraw(dt, t) {
    const m = S.ms, d = m.day, ok = msOk();
    m.bar.set(ok ? msKcal() : 0); m.bar.update(dt, 4);
    // 그래프
    panel(MS_G.x, MS_G.y, MS_G.w, MS_G.h, 18, '#fff');
    const p = mkPlot(MS_G, { x0: 0, x1: 6, y0: 0, y1: 12, xt: [0, 2, 4, 6], yt: [0, 2, 4, 6, 8, 10, 12], xfmt: (v) => v + '일', xl: '발아 후 시간(일, 어두운 곳)', yl: '건조 질량 (g)', m: PHONE ? { l: 42, t: 30, r: 16, b: 48 } : { l: 50, t: 36, r: 24, b: 40 } });
    drawAxes(p);
    const days = [0, 2, 4, 6];
    ctx.save(); ctx.strokeStyle = '#94a3b8'; ctx.setLineDash([5, 5]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(p.x, p.Y(10)); ctx.lineTo(p.x + p.w, p.Y(10)); ctx.stroke(); ctx.setLineDash([]); ctx.restore();
    if (d >= 6) T(p.x + p.w * 0.5, p.Y(10) - 6, '처음 10.0 g', 13, '#64748b', 'center', 700); else T(p.x + p.w - 4, p.Y(10) - 6, '처음 10.0 g', 13, '#64748b', 'right', 700);
    // 줄어든 부분(음영)
    if (d > 0) {
      ctx.save(); ctx.beginPath(); ctx.moveTo(p.X(0), p.Y(10));
      const seg = days.filter((q) => q <= d); seg.forEach((q) => ctx.lineTo(p.X(q), p.Y(DRYM[q])));
      ctx.lineTo(p.X(d), p.Y(10)); ctx.closePath(); ctx.fillStyle = 'rgba(239,68,68,.18)'; ctx.fill(); ctx.restore();
    }
    ctx.save(); ctx.strokeStyle = '#16a34a'; ctx.lineWidth = 4; ctx.lineJoin = 'round'; ctx.beginPath(); days.forEach((q, i) => { const x = p.X(q), y = p.Y(DRYM[q]); if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }); ctx.stroke(); ctx.restore();
    days.forEach((q) => { D.sphere(p.X(q), p.Y(DRYM[q]), q === d ? 8 : 5.5, q === d ? '#f59e0b' : '#16a34a', { gloss: true }); });
    const sx = p.X(d), sy = p.Y(DRYM[d]);
    D.dashedLine(sx, sy, sx, p.y + p.h, { color: '#f59e0b', width: 2 });
    D.label(clamp(sx, p.x + 40, p.x + p.w - 40), clamp(sy - 22, p.y + 12, p.y + p.h - 12), fix1(DRYM[d]) + ' g', { bg: '#f59e0b', size: 14 });
    // 콩 그림
    panel(MS_B.x, MS_B.y, MS_B.w, MS_B.h, 18, '#1e293b');
    const g = d / 6;
    T(MS_B.x + L(14, 130), MS_B.y + 26, '🌙 빛이 없는 곳에서 ' + d + '일째', L(16, 14), '#e2e8f0', 'left', 800);
    const sc = PHONE ? 1.0 : 2.0, bx = MS_B.x + (PHONE ? 62 : MS_B.w * 0.5), by = MS_B.y + (PHONE ? 46 : 120);
    ctx.save(); ctx.fillStyle = '#3f2e22'; if (PHONE) D.roundRect(MS_B.x + 10, MS_B.y + 76, 104, 26, 8); else D.roundRect(MS_B.x + 10, MS_B.y + 192, MS_B.w - 20, 98, 12); ctx.fill(); ctx.restore();
    ctx.save(); ctx.translate(bx, by); ctx.scale(sc, sc);
    ctx.strokeStyle = '#f4efd8'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, 4); ctx.quadraticCurveTo(-6, 12 + g * 10, -4, 16 + g * 22); ctx.stroke();
    ctx.strokeStyle = '#d7e98b'; ctx.beginPath(); ctx.moveTo(0, -4); ctx.quadraticCurveTo(6 + g * 6, -10 - g * 10, 3 + g * 8, -14 - g * 18); ctx.stroke();
    ctx.restore();
    beanShape(bx, by, sc * (1 - g * 0.3), 0, '#e8d595');
    if (!PHONE) textBlock(MS_B.x + 18, MS_B.y + 214, MS_B.w - 36, '빛이 없어 광합성을 못 해요. 저장 물질을 호흡으로 쓰니 건조 질량이 줄어요.', 13.5, '#e2e8f0', 19, 700);
    else textBlock(MS_B.x + 130, MS_B.y + 50, MS_B.w - 144, '광합성을 못 해서 저장 물질을 호흡으로 써요. 물을 흡수해 생체 질량은 늘어도 건조 질량은 줄어요.', 13, '#cbd5e1', 18, 700);
    // 에너지 계산 패널
    panel(MS_E.x, MS_E.y, MS_E.w, MS_E.h, 18, '#fff');
    T(MS_E.x + 16, MS_E.y + 28, '⚡ 줄어든 질량이 방출한 에너지 (녹말 1 g = 4 kcal 가정)', L(16.5, 13.5), '#1f2d44', 'left', 800);
    const lossT = $('#inLoss').value.trim(), kT = $('#inKcal').value.trim();
    const bw = PHONE ? 104 : 150, bh = PHONE ? 44 : 50, by2 = MS_E.y + 50, opw = PHONE ? 92 : 130, eqw = PHONE ? 24 : 34;
    let cxp = MS_E.x + (PHONE ? 12 : 24);
    const okL = near(numIn('inLoss'), msLoss(), 0.06) && msLoss() > 0, okK = near(numIn('inKcal'), msKcal(), 0.06) && msLoss() > 0;
    const box = (txt, lab, ok) => {
      D.roundRect(cxp, by2, bw, bh, 12); ctx.fillStyle = ok ? '#dcfce7' : '#f1f5f9'; ctx.fill(); ctx.strokeStyle = ok ? '#16a34a' : '#cbd5e1'; ctx.lineWidth = 2.5; ctx.stroke();
      TF(cxp + bw / 2, by2 + bh * 0.62, txt, bw - 10, L(22, 17), 12, ok ? '#15803d' : '#64748b', 'center', 800);
      T(cxp + bw / 2, by2 - 6, lab, 13, '#64748b', 'center', 800); cxp += bw;
    };
    box(lossT ? lossT + ' g' : '? g', '감소 질량', okL);
    T(cxp + opw / 2, by2 + bh * 0.62, '× 4 kcal/g', L(19, 15), '#475569', 'center', 800); cxp += opw;
    T(cxp + eqw / 2, by2 + bh * 0.62, '=', L(22, 18), '#475569', 'center', 800); cxp += eqw;
    box(kT ? kT + ' kcal' : '? kcal', '방출 에너지', okK);
    // 에너지 흐름 막대 (6.4 kcal = 막대 전체)
    const fy = MS_E.y + 128, fx = MS_E.x + 16, fw = MS_E.w - 32, fh = 34, full = DRYM[0] - DRYM[6];
    const maxE = full * KCAL_G;
    T(fx, fy - 8, '방출된 화학 에너지 → ATP에 저장 + 열로 방출', L(15, 13.5), '#334155', 'left', 800);
    D.roundRect(fx, fy, fw, fh, 10); ctx.fillStyle = '#eef2f7'; ctx.fill();
    const E = m.bar.v;
    if (E > 0.01) {
      const w1 = fw * clamp(E / maxE, 0, 1), wa = w1 * ATP_FR;
      ctx.save(); D.roundRect(fx, fy, w1, fh, 10); ctx.clip(); ctx.fillStyle = '#16a34a'; ctx.fillRect(fx, fy, wa, fh); ctx.fillStyle = '#ef6a3c'; ctx.fillRect(fx + wa, fy, w1 - wa, fh); ctx.restore();
      if (ok && m.bar.v > msKcal() * 0.97) {
        if (wa > 54) T(fx + wa / 2, fy + 24, 'ATP', 14, '#fff', 'center', 800);
        if (w1 - wa > 40) T(fx + wa + (w1 - wa) / 2, fy + 24, '열', 14, '#fff', 'center', 800);
        T(fx, fy + fh + 20, 'ATP 약 1/3 (≈ ' + fix1(msKcal() * ATP_FR) + ' kcal) · 열 약 2/3 (≈ ' + fix1(msKcal() - Math.round(msKcal() * ATP_FR * 10) / 10) + ' kcal)', L(15, 13.5), '#15803d', 'left', 800);
      }
    } else {
      T(fx + fw / 2, fy + 24, '위 계산을 맞추면 에너지 흐름이 나타나요', 14, '#94a3b8', 'center', 800);
    }
    if (PHONE) { T(fx, MS_E.y + MS_E.h - 38, '열의 일부는 보온병 온도를 높여요(앞 실험 +1.8 °C).', 13, '#64748b', 'left', 700); T(fx, MS_E.y + MS_E.h - 16, '단순 계산이며 지방이면 1 g당 약 9 kcal로 더 커요.', 13, '#64748b', 'left', 700); }
    else T(fx, MS_E.y + MS_E.h - 12, '열의 일부는 보온병 온도를 높여요(앞 실험 +1.8 °C). 단순 계산이며 저장 물질이 지방이면 1 g당 약 9 kcal로 더 커요.', 13.5, '#64748b', 'left', 700);
  }

  /* 아밀레이스 활성 */
  S.am = { p: 0, run: false };
  const AM_T = PHONE ? { x: 10, y: 10, w: 460, h: 262 } : { x: 14, y: 14, w: 772, h: 290 };
  const AM_G = PHONE ? { x: 10, y: 282, w: 460, h: 348 } : { x: 14, y: 316, w: 772, h: 230 };
  const AM_K = [0, 2, 4];
  function amStart() { if (S.am.run) return; S.am.p = 0; S.am.run = true; Sound.click(); updateCtl(); }
  function amReset() { S.am.p = 0; S.am.run = false; updateCtl(); }
  function amDraw(dt, t) {
    const a = S.am;
    if (a.run) { a.p = Math.min(1, a.p + dt / 3.2); if (a.p >= 1) { a.run = false; S.ms.seenAmy = true; updateCtl(); } }
    const rem = (k) => 100 - (100 - REMAIN[k]) * smooth(a.p);
    panel(AM_T.x, AM_T.y, AM_T.w, AM_T.h, 18, '#fff');
    T(AM_T.x + 16, AM_T.y + 28, L('🧪 같은 녹말 용액 + 콩 추출액 → 10분 뒤 아이오딘 검사', '🧪 녹말 + 콩 추출액 → 아이오딘 검사'), L(17, 14), '#1f2d44', 'left', 800);
    const n = 3, colw = AM_T.w / n;
    AM_K.forEach((k, i) => {
      const cx = AM_T.x + colw * (i + 0.5), th = PHONE ? 118 : 148, ty = AM_T.y + (PHONE ? 62 : 74), tw = PHONE ? 38 : 50;
      const r = rem(k) / 100, col = C.mix('#e9c46a', '#241a52', r);
      D.testTube(cx, ty, tw, th, { level: 0.72, liquid: col });
      if (a.run || a.p > 0) { for (let q = 0; q < 3; q++) { const ph = (t * 0.8 + q / 3) % 1; if (a.run && !RM) { ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.arc(cx + Math.sin(ph * 9 + q) * tw * 0.25, ty + th * 0.85 - ph * th * 0.55, 2.4, 0, TAU); ctx.fill(); } } }
      T(cx, ty + th + L(26, 22), k === 0 ? '마른 콩 추출액' : '발아 ' + k + '일 추출액', L(15.5, 13.5), '#1f2d44', 'center', 800);
      T(cx, ty + th + L(48, 40), '남은 녹말 ' + Math.round(rem(k)) + ' %', L(16, 14), r > 0.8 ? '#1e1b4b' : '#4338ca', 'center', 800);
      beanShape(cx, AM_T.y + L(54, 54), 0.8, 0, k === 0 ? '#c79b4f' : '#e8d595', { wrinkle: k === 0 });
    });
    D.label(AM_T.x + AM_T.w - 70, AM_T.y + 28, '⏱ ' + Math.round(a.p * 10) + '분', { bg: '#475569', size: 14 });
    // 막대 그래프
    panel(AM_G.x, AM_G.y, AM_G.w, AM_G.h, 18, '#fff');
    const p = mkPlot(AM_G, { x0: 0, x1: 3, y0: 0, y1: 100, xt: [], yt: [0, 25, 50, 75, 100], yl: '비율 (%)', yfmt: (v) => v + '', m: { l: 46, t: 50, r: 16, b: 48 } });
    drawAxes(p);
    AM_K.forEach((k, i) => {
      const gx = p.X(i + 0.5), bwid = PHONE ? 52 : 90;
      const rv = rem(k), act = 100 - rv;
      [[rv, '#4338ca', -bwid * 0.55, '남은 녹말'], [act, '#16a34a', bwid * 0.55, '분해된 녹말']].forEach((q) => {
        const x = gx + q[2] - bwid / 2, hh = (q[0] / 100) * p.h;
        if (hh > 0.5) { D.roundRect(x, p.y + p.h - hh, bwid, hh, 6); ctx.fillStyle = q[1]; ctx.fill(); }
        T(x + bwid / 2, p.y + p.h - hh - 6, Math.round(q[0]) + '', 14, q[1], 'center', 800);
      });
      T(gx, p.y + p.h + 20, k === 0 ? '마른 콩' : '발아 ' + k + '일', 13.5, '#334155', 'center', 800);
    });
    D.roundRect(AM_G.x + AM_G.w - (PHONE ? 196 : 232), AM_G.y + 12, 10, 10, 3); ctx.fillStyle = '#4338ca'; ctx.fill(); T(AM_G.x + AM_G.w - (PHONE ? 182 : 218), AM_G.y + 22, '남은 녹말', 13, '#334155', 'left', 800);
    D.roundRect(AM_G.x + AM_G.w - (PHONE ? 100 : 116), AM_G.y + 12, 10, 10, 3); ctx.fillStyle = '#16a34a'; ctx.fill(); T(AM_G.x + AM_G.w - (PHONE ? 86 : 102), AM_G.y + 22, '분해된 녹말', 13, '#334155', 'left', 800);
    if (!PHONE) T(AM_G.x + 24, AM_G.y + AM_G.h - 8, '', 1, '#fff');
  }

  /* =========================================================
     ③ 단계적 반응 : 연소 vs 세포
     ========================================================= */
  const E_TOT = 2870, ATP_KJ = 915, HEAT_KJ = 1955, NSTEP = 20;
  const isAtpStep = (k) => k % 2 === 1;
  const atpOfStep = (k) => (isAtpStep(k) ? 91.5 : 0);
  S.st = { c: { run: false, p: 0, done: false, peak: 25, burn: 0 }, s: { run: false, u: 0, atp: 0, heat: 0, done: false, last: 0 }, enz: true, offT: 0, offSeen: false, chips: [], hop: 0, combDone: false, cellDone: false };
  const ST_C = PHONE ? { x: 10, y: 10, w: 460, h: 196 } : { x: 14, y: 14, w: 300, h: 350 };
  const ST_S = PHONE ? { x: 10, y: 214, w: 460, h: 266 } : { x: 326, y: 14, w: 460, h: 350 };
  const ST_B = PHONE ? { x: 10, y: 488, w: 460, h: 142 } : { x: 14, y: 376, w: 772, h: 170 };
  const nA = new Num(0), nH = new Num(0), nC = new Num(0);
  function stCombust() { const c = S.st.c; c.run = true; c.p = 0; c.done = false; c.burn = 0; Sound.click(); updateCtl(); }
  function stCell() { const s = S.st.s; s.run = true; s.u = 0; s.atp = 0; s.heat = 0; s.done = false; s.last = 0; S.st.chips.length = 0; S.st.offT = 0; Sound.click(); updateCtl(); }
  function stReset() { S.st.combDone = false; S.st.cellDone = false; S.st.c = { run: false, p: 0, done: false, peak: 25, burn: 0 }; S.st.s = { run: false, u: 0, atp: 0, heat: 0, done: false, last: 0 }; S.st.chips.length = 0; S.st.offT = 0; nA.snap(0); nH.snap(0); nC.snap(0); FX.clear(); updateCtl(); }
  function stEnz(on) { S.st.enz = on; Sound.click(); updateCtl(); }
  const stairGeo = () => { const R = ST_S; return PHONE ? { x0: R.x + 40, y0: R.y + 62, sw: 16.5, sh: 8.4 } : { x0: R.x + 44, y0: R.y + 80, sw: 18, sh: 10.4 }; };
  const stairPos = (k) => { const g = stairGeo(); return { x: g.x0 + k * g.sw + g.sw / 2, y: g.y0 + k * g.sh }; };   // k번째 계단 윗면 가운데
  function stUpdate(dt) {
    const st = S.st, c = st.c, s = st.s;
    if (c.run) {
      c.p = Math.min(1, c.p + dt / 2.4); c.burn = c.p; c.peak = 25 + 625 * smooth(c.p);
      if (!RM && c.p < 1) { const g = { x: ST_C.x + (PHONE ? 110 : 120), y: ST_C.y + (PHONE ? 150 : 270) }; for (let i = 0; i < 2; i++) parts.emit({ x: g.x + (Math.random() - 0.5) * 30, y: g.y - 30, vx: (Math.random() - 0.5) * 50, vy: -60 - Math.random() * 60, life: 0.7, size: 4, color: '#ffae42', gravity: -40, shape: 'circle' }); }
      if (c.p >= 1) { c.run = false; c.done = true; st.combDone = true; updateCtl(); }
    } else if (c.done) { c.burn = Math.max(0.0, c.burn - dt * 0.3); }
    if (s.run) {
      const rate = st.enz ? 2.4 : 0.004;
      if (!st.enz) { st.offT += dt; if (st.offT >= 3 && s.u < 0.5) { if (!st.offSeen) { st.offSeen = true; updateCtl(); } } }
      s.u = Math.min(NSTEP, s.u + rate * dt);
      while (s.last < Math.floor(s.u + 1e-9) && s.last < NSTEP) {
        const k = s.last; s.last++; const a = atpOfStep(k); s.atp += a; s.heat += E_TOT / NSTEP - a;
        const pos = stairPos(k);
        if (!RM) {
          for (let q = 0; q < 6; q++) parts.emit({ x: pos.x, y: pos.y - 4, vx: (Math.random() - 0.3) * 70, vy: -30 - Math.random() * 50, life: 0.8, size: 3.6, color: '#f97316', gravity: -20, shape: 'circle' });
          if (a > 0) for (let q = 0; q < 3; q++) st.chips.push({ x: pos.x, y: pos.y - 8, t: -q * 0.12, sx: pos.x, sy: pos.y - 8, k });
        }
        Sound.tick();
      }
      if (s.u >= NSTEP - 1e-9 && s.last >= NSTEP) { s.run = false; s.done = true; st.cellDone = true; updateCtl(); }
    }
    // ATP 칩 이동
    const basket = PHONE ? { x: ST_S.x + ST_S.w - 60, y: ST_S.y + 82 } : { x: ST_S.x + ST_S.w - 84, y: ST_S.y + 78 };
    for (let i = st.chips.length - 1; i >= 0; i--) { const q = st.chips[i]; q.t += dt; if (q.t >= 1.1) { st.chips.splice(i, 1); continue; } }
    st.basket = basket;
    nA.set(RM ? s.atp : s.atp); nH.set(s.heat); nC.set(c.p * E_TOT);
    nA.update(dt, 7); nH.update(dt, 7); nC.update(dt, 10);
  }
  function drawCellBlob(cx, cy, r, burn) {
    const col = C.mix('#a7f3d0', '#1f1f1f', clamp(burn, 0, 1));
    ctx.save(); ctx.translate(cx, cy);
    ctx.beginPath(); ctx.ellipse(0, 0, r * 1.15, r, 0, 0, TAU); ctx.fillStyle = C.rgba(col, 0.9); ctx.fill(); ctx.strokeStyle = C.shade(col, -0.35); ctx.lineWidth = 3; ctx.stroke();
    ctx.beginPath(); ctx.arc(-r * 0.2, -r * 0.1, r * 0.34, 0, TAU); ctx.fillStyle = C.rgba(C.mix('#6366f1', '#111111', burn), 0.85); ctx.fill();
    ctx.restore();
  }
  function stDraw(dt, t) {
    stUpdate(dt);
    const st = S.st, c = st.c, s = st.s;
    // --- 연소 ---
    panel(ST_C.x, ST_C.y, ST_C.w, ST_C.h, 18, '#fff7ed');
    T(ST_C.x + 14, ST_C.y + 28, '🔥 연소: 한꺼번에', L(18, 15.5), '#9a3412', 'left', 800);
    const cx = ST_C.x + (PHONE ? 236 : 112), by = ST_C.y + (PHONE ? 158 : 250);
    // 도가니와 포도당
    ctx.save(); ctx.beginPath(); ctx.moveTo(cx - 44, by - 26); ctx.lineTo(cx + 44, by - 26); ctx.lineTo(cx + 30, by + 4); ctx.lineTo(cx - 30, by + 4); ctx.closePath(); ctx.fillStyle = '#9ca3af'; ctx.fill(); ctx.strokeStyle = '#6b7280'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
    const gl = 1 - c.p * 0.85; for (let q = 0; q < 8; q++) { ctx.fillStyle = '#fff'; ctx.strokeStyle = '#cbd5e1'; ctx.beginPath(); ctx.arc(cx - 28 + (q % 4) * 19 + (q > 3 ? 8 : 0), by - 30 - (q > 3 ? 8 : 0) * gl, 6 * gl + 0.5, 0, TAU); ctx.fill(); ctx.stroke(); }
    T(cx, by + 24, '포도당 1 mol (180 g)', 13.5, '#7c2d12', 'center', 800);
    const fs = c.run ? 80 * Math.sin(Math.min(1, c.p * 3) * Math.PI / 2) : c.done ? 70 * c.burn : 0;
    if (fs > 1) D.flame(cx, by - 34, fs, t);
    // 온도계 (0~700 °C)
    const tx = ST_C.x + ST_C.w - (PHONE ? 70 : 50), ty = ST_C.y + (PHONE ? 40 : 56), th = PHONE ? 112 : 196;
    D.thermometer(tx, ty, th, c.peak, 0, 700, { step: 100, unit: '' });
    D.label(tx - (PHONE ? 24 : 0), ty - (PHONE ? 4 : 14), Math.round(c.peak) + ' °C', { bg: c.peak > 300 ? '#dc2626' : '#475569', size: 14 });
    // 세포가 연소한다면
    if (!PHONE) { drawCellBlob(ST_C.x + 44, ST_C.y + 322, 20, c.p); }
    if (!PHONE) T(ST_C.x + 80, ST_C.y + 328, c.p > 0.5 ? '세포가 타 버려요!' : '세포 안에서 연소하면…', 13.5, c.p > 0.5 ? '#b91c1c' : '#64748b', 'left', 800);
    else { drawCellBlob(ST_C.x + 48, ST_C.y + 76, 20, c.p); T(ST_C.x + 14, ST_C.y + 116, c.p > 0.5 ? '세포가 타 버려요!' : '세포 안이라면…', 13, c.p > 0.5 ? '#b91c1c' : '#64748b', 'left', 800); }
    // --- 세포 ---
    panel(ST_S.x, ST_S.y, ST_S.w, ST_S.h, 18, '#f0fdf4');
    T(ST_S.x + 14, ST_S.y + 28, '🧫 세포: 효소로 20여 단계', L(18, 15.5), '#166534', 'left', 800);
    D.label(ST_S.x + ST_S.w - 14, ST_S.y + 26, st.enz ? '🧬 효소 있음' : '🧬 효소 없음', { bg: st.enz ? '#16a34a' : '#dc2626', size: 14, align: 'right' });
    const g = stairGeo();
    // 에너지 축
    T(ST_S.x + 22, g.y0 - 8, '높음', 13, '#64748b', 'center', 800);
    T(ST_S.x + 22, g.y0 + NSTEP * g.sh + 20, '낮음', 13, '#64748b', 'center', 800);
    D.arrow(ST_S.x + 22, g.y0 + 2, ST_S.x + 22, g.y0 + NSTEP * g.sh - 2, { color: '#94a3b8', width: 2.5, head: 9 });
    ctx.save(); ctx.translate(ST_S.x + 11, g.y0 + NSTEP * g.sh * 0.5 + 10); ctx.rotate(-Math.PI / 2); T(0, 0, '화학 에너지', 13, '#64748b', 'center', 800); ctx.restore();
    // 계단
    for (let k = 0; k < NSTEP; k++) {
      const x = g.x0 + k * g.sw, y = g.y0 + k * g.sh, atp = isAtpStep(k), done = k < s.last;
      D.roundRect(x, y, g.sw - 1.5, g.sh * (NSTEP - k) + 6 > 80 ? 80 : g.sh * (NSTEP - k) + 6, 3);
      ctx.fillStyle = done ? (atp ? '#86efac' : '#fed7aa') : '#e2e8f0'; ctx.fill();
      ctx.fillStyle = atp ? '#16a34a' : '#cbd5e1'; ctx.fillRect(x, y, g.sw - 1.5, 3);
    }
    // 포도당 구슬
    const u = s.u, kk = Math.min(NSTEP - 1, Math.floor(u)), fr = u - Math.floor(u);
    const p0 = stairPos(kk), p1 = stairPos(Math.min(NSTEP - 1, kk + 1));
    let bx = p0.x + (p1.x - p0.x) * smooth(fr), by2 = p0.y + (p1.y - p0.y) * smooth(fr) - 9 - Math.sin(fr * Math.PI) * (fr > 0 ? 7 : 0);
    if (s.done) { bx = stairPos(NSTEP - 1).x; by2 = stairPos(NSTEP - 1).y - 9; }
    const jit = (s.run || u < 0.01) && !RM ? (st.enz ? 0.3 : 1.6) : 0;
    bx += Math.sin(t * 40) * jit; by2 += Math.cos(t * 33) * jit;
    const mol = clamp(1 - u / NSTEP, 0.25, 1);
    D.sphere(bx, by2, 7 + 4 * mol, C.mix('#e2e8f0', '#fbbf24', mol), { gloss: true, shadow: true });
    // ATP 칩
    const bk = st.basket;
    D.roundRect(bk.x - 40, bk.y - 26, 94, PHONE ? 50 : 54, 12); ctx.fillStyle = '#dcfce7'; ctx.fill(); ctx.strokeStyle = '#16a34a'; ctx.lineWidth = 2; ctx.stroke();
    T(bk.x + 7, bk.y - 6, 'ATP 저장', 13.5, '#166534', 'center', 800);
    T(bk.x + 7, bk.y + 15, Math.round(nA.v) + ' kJ', 15, '#15803d', 'center', 800);
    st.chips.forEach((q) => {
      if (q.t < 0) return; const p = clamp(q.t / 1.0, 0, 1), e = SciSim.ease.inOutCubic(p);
      const x = q.sx + (bk.x - q.sx) * e, y = q.sy + (bk.y - q.sy) * e - Math.sin(p * Math.PI) * 26;
      D.roundRect(x - 8, y - 5, 16, 10, 3); ctx.fillStyle = '#22c55e'; ctx.fill(); ctx.strokeStyle = '#166534'; ctx.lineWidth = 1.2; ctx.stroke();
    });
    // 세포 온도계 (같은 눈금)
    const sx2 = ST_S.x + (PHONE ? 72 : 66), sy2 = PHONE ? ST_S.y + ST_S.h - 88 : ST_S.y + 238, sh2 = PHONE ? 48 : 86;
    D.thermometer(sx2, sy2, sh2, 37, 0, 700, { step: 100, unit: '', ticks: false, color: '#16a34a' });
    T(sx2 + 24, sy2 + (PHONE ? 30 : 24), '세포 37 °C', L(15, 14), '#166534', 'left', 800);
    T(sx2 + 24, sy2 + (PHONE ? 50 : 44), '(눈금은 연소와 같아요)', 13, '#64748b', 'left', 700);
    if (!st.enz && (s.run || s.u > 0 || st.offT > 0)) {
      const tx2 = PHONE ? ST_S.x + ST_S.w / 2 + 14 : ST_S.x + ST_S.w / 2 + 50, ty2 = PHONE ? ST_S.y + ST_S.h - 12 : ST_S.y + ST_S.h - 12;
      D.label(tx2, ty2, '효소가 없으면 37 °C에서 반응이 거의 일어나지 않아요', { bg: '#dc2626', size: PHONE ? 13 : 14 });
    }
    // --- 에너지 계산 ---
    panel(ST_B.x, ST_B.y, ST_B.w, ST_B.h, 18, '#fff');
    const bx0 = ST_B.x + (PHONE ? 62 : 100), bw = ST_B.w - (PHONE ? 62 : 100) - (PHONE ? 112 : 150);
    T(ST_B.x + 14, ST_B.y + (PHONE ? 38 : 48), '연소', L(17, 15), '#9a3412', 'left', 800);
    T(ST_B.x + 14, ST_B.y + (PHONE ? 90 : 100), '세포', L(17, 15), '#166534', 'left', 800);
    const r1 = ST_B.y + (PHONE ? 20 : 28), r2 = ST_B.y + (PHONE ? 72 : 80), bh = PHONE ? 28 : 32;
    [r1, r2].forEach((yy) => { D.roundRect(bx0, yy, bw, bh, 8); ctx.fillStyle = '#eef2f7'; ctx.fill(); });
    const w1 = bw * clamp(nC.v / E_TOT, 0, 1); if (w1 > 0.5) { D.roundRect(bx0, r1, w1, bh, 8); ctx.fillStyle = '#ef4444'; ctx.fill(); }
    const wA = bw * clamp(nA.v / E_TOT, 0, 1), wH = bw * clamp(nH.v / E_TOT, 0, 1);
    ctx.save(); D.roundRect(bx0, r2, bw, bh, 8); ctx.clip(); ctx.fillStyle = '#16a34a'; ctx.fillRect(bx0, r2, wA, bh); ctx.fillStyle = '#ef6a3c'; ctx.fillRect(bx0 + wA, r2, wH, bh); ctx.restore();
    T(bx0 + bw + 8, r1 + bh * 0.7, '열 ' + comma(nC.v) + ' kJ', L(15, 13.5), '#9a3412', 'left', 800);
    T(bx0 + bw + 8, r2 + bh * 0.45, 'ATP ' + comma(nA.v), L(14.5, 13), '#166534', 'left', 800);
    T(bx0 + bw + 8, r2 + bh * 0.45 + 18, '열 ' + comma(nH.v) + ' kJ', L(14.5, 13), '#c2410c', 'left', 800);
    T(ST_B.x + 14, ST_B.y + ST_B.h - (PHONE ? 22 : 24), '막대 전체 = 포도당 1 mol의 에너지 ' + comma(E_TOT) + ' kJ', L(14, 13), '#475569', 'left', 800);
    T(ST_B.x + 14, ST_B.y + ST_B.h - (PHONE ? 6 : 6), PHONE ? '세포: 20단계, ATP 약 32 %' : '세포는 20단계로 나눠 ATP 약 32 %(915 kJ)를 붙잡고 나머지는 열(체온 유지)로 써요. 단순화한 값이에요.', 13, '#64748b', 'left', 700);
  }

  /* =========================================================
     ④ 대사 판별 (카드를 상자에 넣기)
     ========================================================= */
  const JC = [
    { id: 'bean', icon: '🫘', label: '싹이 트는 콩의 녹말 분해', short: '콩 녹말 분해', box: 'cat', why: '콩 속 아밀레이스 효소가 녹말을 분해해요. 큰 분자 → 작은 분자라서 이화(에너지 방출)예요.' },
    { id: 'leaf', icon: '🌿', label: '식물 잎의 광합성', short: '잎의 광합성', box: 'ana', why: '효소로 CO₂와 물에서 포도당을 합성해요. 작은 분자 → 큰 분자라서 동화(에너지 흡수)예요.' },
    { id: 'muscle', icon: '💪', label: '근육에서 포도당 분해', short: '근육의 포도당 분해', box: 'cat', why: '효소로 포도당을 분해해 ATP를 만들어요. 이화(에너지 방출)예요.' },
    { id: 'prot', icon: '🧬', label: '세포에서 단백질 합성', short: '단백질 합성', box: 'ana', why: '아미노산을 이어 단백질을 합성해요. 동화(에너지 흡수)예요.' },
    { id: 'warmer', icon: '🧤', label: '손난로 속 철 가루의 산화', short: '손난로 철 산화', box: 'non', why: '효소 없이 일어나는 화학 반응이에요. 생명체 안에서 일어나는 효소 반응이 아니라서 물질대사가 아니에요.' },
    { id: 'fire', icon: '🔥', label: '모닥불에서 나무의 연소', short: '모닥불 연소', box: 'non', why: '효소 없이 한꺼번에 타는 연소예요. 물질대사가 아니에요.' },
    { id: 'horm', icon: '💉', label: '아미노산으로 호르몬 합성', short: '호르몬 합성', box: 'ana', why: '아미노산으로 단백질 호르몬을 합성해요. 동화(에너지 흡수)예요.' },
    { id: 'bear', icon: '🐻', label: '겨울잠 자는 곰의 지방 분해', short: '곰의 지방 분해', box: 'cat', why: '효소로 저장 지방을 분해해 ATP와 열을 얻어요. 이화(에너지 방출)예요.' },
  ];
  const JBOX = { cat: { label: '이화 (분해)', col: '#f97316' }, ana: { label: '동화 (합성)', col: '#3b82f6' }, non: { label: '물질대사 아님', col: '#64748b' } };
  const JB = PHONE ? { y: 10, h: 236 } : { y: 14, h: 296 };
  const jsorter = new Sorter({
    cards: JC.map((c) => ({ id: c.id, label: c.label, short: c.short, icon: c.icon, col: '#16a34a' })),
    boxes: ['cat', 'ana', 'non'].map((k, i) => { const gap = PHONE ? 8 : 10, bw = ((PHONE ? 460 : 772) - gap * 2) / 3; return { id: k, label: JBOX[k].label, col: JBOX[k].col, x: (PHONE ? 10 : 14) + i * (bw + gap), y: JB.y, w: bw, h: JB.h, cols: 1, hdr: 32 }; }),
    cw: PHONE ? 226 : 186, ch: PHONE ? 50 : 62, kh: 34,
    tray: (i) => (PHONE ? { x: 10 + (i % 2) * 238, y: 324 + Math.floor(i / 2) * 58 } : { x: 14 + (i % 4) * 194, y: 382 + Math.floor(i / 4) * 74 }),
    onChange() { updateCtl(); },
  });
  const jWrong = () => jsorter.cards.filter((c) => c.zone && c.zone !== JC.find((q) => q.id === c.id).box);
  const jPT = { down: (p) => jsorter.down(p), move: (p) => jsorter.move(p), up: (p) => jsorter.up(p), hover: (p) => jsorter.hover(p) };
  function jDraw(dt, t) {
    jsorter.update(dt); jsorter.drawBoxes();
    const py = PHONE ? 258 : 322, ph = PHONE ? 372 : 224, px = PHONE ? 10 : 14, pw = PHONE ? 460 : 772;
    panel(px, py, pw, ph, 16, '#ffffff');
    T(px + 16, py + 26, '상황 카드 8장을 알맞은 상자에 끌어 넣어요', L(16, 14), '#334155', 'left', 800);
    if (PHONE) textBlock(px + 16, py + 44, pw - 32, '물질대사 = ① 생명체 안에서 ② 효소가 관여하는 ③ 에너지 출입이 있는 화학 반응', 13, '#64748b', 16, 700); else T(px + 16, py + 46, '물질대사 = ① 생명체 안에서 ② 효소가 관여하는 ③ 에너지 출입이 있는 화학 반응', 13.5, '#64748b', 'left', 700);
    jsorter.drawCards();
    // 에너지 출입 표시 (학생이 고른 값)
    [['cat', 'selCat'], ['ana', 'selAna']].forEach((q) => {
      const b = jsorter.boxes.find((x) => x.id === q[0]), sel = selVal(q[1]);
      if (sel === 'out' || sel === 'in') D.label(b.x + b.w / 2, b.y + b.h - 18, sel === 'out' ? '에너지 방출 ▲' : '에너지 흡수 ▼', { bg: sel === 'out' ? '#ef4444' : '#3b82f6', size: 13.5 });
    });
  }

  /* =========================================================
     화면 전환 · 조작 연결
     ========================================================= */
  const PTS = { bean: S.bn.pt, mass: null, amy: null, stair: null, judge: jPT };
  function setMode(m) {
    if (S.mode !== m) S.fade = 1;
    S.mode = m; PT = PTS[m] || null; hideHint(); updateCtl();
  }
  const ctlNodes = $$('#ctrlCard .control');
  function updateCtl() {
    const fr = game ? game.free : false, lvNow = game ? game.level : 0;
    ctlNodes.forEach((n) => { n.hidden = (n.dataset.modes || '').split(' ').indexOf(S.mode) < 0; });
    modeButtons(S.mode, lvNow, fr);
    chipSet($('#beanView'), S.bn.view);
    $('#bnDay').disabled = S.bn.tgt >= 3 || S.bn.day < S.bn.tgt - 1e-6; $('#bnAll').disabled = S.bn.tgt >= 3;
    $('#bnNote').innerHTML = S.bn.view === 'temp' ? '보온병의 <b>온도계</b>를 읽어 기록해요. 시료를 누르면 그래프에서 강조돼요.' : S.bn.view === 'o2' ? 'KOH 용액이 CO₂를 흡수하므로 관 속 붉은 물이 올라간 만큼이 <b>소비한 O₂</b>예요.' : '용기에서 나온 기체를 <b>석회수</b>와 <b>BTB 용액</b>에 통과시켜요.';
    chipSet($('#massDay'), S.ms.day);
    $('#massNote').innerHTML = '<b>' + S.ms.day + '일째</b> 건조 질량 ' + fix1(DRYM[S.ms.day]) + ' g → 처음보다 <b>' + fix1(msLoss()) + ' g</b> 줄었어요. 곱셈은 직접 계산해 보세요.';
    $('#inLoss').classList.toggle('ok', msOk()); $('#inKcal').classList.toggle('ok', msOk());
    $('#amRun').disabled = S.am.run; $('#amRun').textContent = S.am.run ? '⏱ 반응하는 중…' : S.am.p >= 1 ? '↺ 다시 반응시키기' : '▶ 10분 반응 시작';
    chipSet($('#enzSeg'), S.st.enz ? 'on' : 'off');
    $('#stComb').disabled = S.st.c.run; $('#stCell').disabled = S.st.s.run;
    $('#stNote').innerHTML = S.st.enz ? '<b>효소가 있으면</b> 37 °C에서도 단계마다 빠르게 진행돼요.' : '<b>효소가 없으면</b> 37 °C에서 반응이 거의 진행되지 않아요.';
    $('#selCat').classList.toggle('ok', selVal('selCat') === 'out'); $('#selAna').classList.toggle('ok', selVal('selAna') === 'in');
  }
  bindModeSeg(setMode);
  $$('#beanView button').forEach((b) => b.addEventListener('click', () => bnSetView(b.dataset.v)));
  $('#bnDay').addEventListener('click', bnStep); $('#bnAll').addEventListener('click', bnAll); $('#bnReset').addEventListener('click', () => { Sound.click(); bnReset(); });
  $$('#massDay button').forEach((b) => b.addEventListener('click', () => { S.ms.day = +b.dataset.v; Sound.click(); updateCtl(); }));
  $('#inLoss').addEventListener('input', updateCtl); $('#inKcal').addEventListener('input', updateCtl);
  $('#amRun').addEventListener('click', () => { if (S.am.p >= 1) S.am.p = 0; amStart(); });
  $('#amReset').addEventListener('click', () => { Sound.click(); amReset(); });
  $$('#enzSeg button').forEach((b) => b.addEventListener('click', () => stEnz(b.dataset.v === 'on')));
  $('#stComb').addEventListener('click', stCombust); $('#stCell').addEventListener('click', stCell); $('#stReset').addEventListener('click', () => { Sound.click(); stReset(); });
  $('#selCat').addEventListener('change', updateCtl); $('#selAna').addEventListener('change', updateCtl);
  $('#jReset').addEventListener('click', () => { Sound.click(); jsorter.reset(); $('#selCat').value = ''; $('#selAna').value = ''; updateCtl(); });

  /* =========================================================
     미션
     ========================================================= */
  const levels = [
    {
      title: '발아 콩 실험', short: '발아 콩', icon: '🫘', phase: '실험',
      intro: '<p class="si-q">❓ 탐구 질문: 움직이지도 않는 마른 콩이 물에 불려 싹이 트면 몸속에서는 무슨 일이 일어나고 있을까?</p><p>🔗 <b>생명과학 Ⅰ</b>에서 물질대사를 동화와 이화로 나누고 ATP가 에너지를 전달한다고 배웠어요. 이번에는 <b>실험으로 확인</b>해요.</p><p>마른 콩, <b>발아 중인 콩</b>, 삶은 콩(<b>대조군</b>)을 같은 조건(콩 20 g, 25 °C)에 3일간 두고 <b>온도 · 산소 소비 · 이산화 탄소</b>를 측정해요. (가상 예시 자료예요.)</p>',
      features: ['bean'],
      setup() { setMode('bean'); },
      recap: '발아 중인 콩에서는 온도가 오르고, O₂를 소비하고, CO₂가 발생해요. 삶은 콩에서는 변화가 없어서 그 변화가 효소가 관여하는 물질대사(세포호흡) 때문임을 알 수 있어요.',
      summary: '<ul><li><b>발아 콩 탐구</b>(같은 종 콩 20 g, 25 °C, 3일): 발아 콩은 온도 22.0 → 23.8 °C(<b>+1.8 °C</b>), 산소 소비 0.2 → <b>6.8 mL</b>, 석회수 뿌옇게, BTB 노랑. 삶은 콩은 변화가 거의 없어요.</li><li><b>삶은 콩 = 대조군</b>: 가열하면 효소가 변성되어 생명 활동이 없어요. 그래서 온도 · 기체 변화가 <b>물질대사 때문</b>임을 알 수 있어요.</li><li>O₂를 쓰고 CO₂와 열이 나오는 것은 <b>세포호흡(이화)</b>이 일어난다는 증거 → 물질대사에는 <b>에너지 출입</b>이 따라요.</li></ul>',
      missions: [
        {
          id: 'temp', title: '세 시료의 온도 변화 측정',
          goal: '🌡️ 온도 화면에서 <b>3일</b> 동안 세 시료의 온도를 측정해 표에 기록하세요.',
          hint: '「▶ 하루 지나기」를 3번 누르거나 「⏩ 3일 재생」을 눌러요. 온도 눈금이 오르는 시료는 어느 것일까요?',
          setup() { S.bn.view = 'temp'; S.bn.seen.temp = true; bnReset(); setMode('bean'); },
          check: () => S.bn.view === 'temp' && S.bn.day >= 2.999, hold: 0.8,
          status: () => mark(S.bn.view === 'temp') + ' 온도 화면 &nbsp; ' + mark(S.bn.day >= 2.999) + ' 3일 측정 (' + Math.floor(S.bn.day + 1e-6) + ' / 3일) &nbsp; ' + mark(S.bn.day >= 2.999) + ' 발아 콩 +' + fix1(interp(TEMP.germ, S.bn.day) - 22.0) + ' °C',
          explain: '발아 콩만 온도가 <b>22.0 → 23.8 °C(+1.8 °C)</b> 올랐고, 삶은 콩은 22.1 °C로 거의 그대로예요. 발아 콩 안에서 일어난 물질대사로 <b>열이 방출</b>되었다는 뜻이에요.',
        },
        {
          id: 'o2', title: '산소 소비량 3일 기록',
          goal: '💨 산소 소비 화면에서 3일 동안 기록하고, 🫧 이산화 탄소 화면에서 석회수와 BTB도 확인하세요.',
          hint: '먼저 산소 소비 화면에서 3일을 재생해요. 그다음 이산화 탄소 화면 버튼을 눌러 석회수와 BTB를 확인해요.',
          setup() { S.bn.view = 'o2'; S.bn.seen.o2 = true; S.bn.seen.co2 = false; bnReset(); setMode('bean'); },
          check: () => S.bn.o2Done && S.bn.seen.co2 && S.bn.view === 'co2', hold: 0.8,
          status: () => mark(!!S.bn.o2Done) + ' O₂ 소비 3일 기록 &nbsp; ' + mark(S.bn.seen.co2 && S.bn.view === 'co2') + ' CO₂ 화면 확인',
          explain: '발아 콩은 O₂ 소비가 <b>0.2 → 6.8 mL</b>로 늘고 석회수가 뿌예지며 BTB가 노랗게 변했어요. <b>O₂를 쓰고 CO₂를 내놓는 것</b>은 포도당 같은 저장 물질을 분해하는 세포호흡이에요. 삶은 콩 · 마른 콩에서는 이런 변화가 없었어요.',
        },
        {
          type: 'quiz', title: '삶은 콩을 쓰는 까닭',
          goal: '실험에서 <b>삶은 콩</b>을 대조군으로 함께 두는 까닭은?',
          setup() { setMode('bean'); },
          choices: ['삶은 콩은 효소가 변성되어 생명 활동이 없으므로, 나타난 온도 · 기체 변화가 물질대사 때문임을 확인하려고', '삶은 콩은 발아 콩보다 부피가 크기 때문에', '삶으면 콩이 열을 더 많이 내기 때문에', '삶은 콩은 원래 CO₂를 가장 많이 내놓기 때문에'],
          answer: 0,
          feedback: ['', '부피는 대조군을 두는 이유가 아니에요.', '삶은 콩은 거의 열을 내지 않았어요(22.1 °C).', '삶은 콩에서는 석회수가 변하지 않았어요.'],
          explain: '가열하면 효소 단백질이 <b>변성</b>되어 생명 활동이 멈춰요. 삶은 콩에서 변화가 없었으므로 발아 콩에서 일어난 변화는 <b>효소가 관여하는 물질대사</b> 때문이라고 해석할 수 있어요.',
        },
      ],
    },
    {
      title: '에너지 계산', short: '에너지 계산', icon: '🧮', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 발아 콩이 O₂를 쓰고 열을 내는 것을 확인했어요.</div><p>빛이 없는 곳에서 싹이 트면 광합성을 할 수 없어서 <b>저장 물질을 호흡으로 써요</b>. 줄어든 <b>건조 질량</b>으로 방출된 에너지를 계산하고, 싹이 트며 <b>녹말 분해 효소(아밀레이스)</b>가 늘어나는 것도 살펴봐요.</p>',
      features: ['mass', 'amy'],
      setup() { setMode('mass'); },
      recap: '싹이 트며 줄어든 건조 질량은 호흡으로 분해된 저장 물질이고, 그만큼의 화학 에너지가 ATP와 열로 바뀌어요(1.6 g × 4 kcal/g = 6.4 kcal). 발아하며 아밀레이스도 늘어요.',
      summary: '<ul><li>어두운 곳에서 발아하면 광합성을 못 해 저장 물질(녹말 · 지방)을 호흡으로 분해해요 → <b>건조 질량 감소</b> (10.0 g → 8.4 g, 6일). 생체 질량은 물 흡수로 늘어요.</li><li>방출 에너지 = 줄어든 질량 × 1 g당 에너지 = 1.6 g × 4 kcal/g = <b>6.4 kcal</b>(단순 가정). 약 1/3은 <b>ATP</b>로 저장(생장 · 합성에 사용), 나머지는 <b>열</b>로 방출.</li><li>이화에서 얻은 에너지로 동화(세포벽 · 단백질 합성)를 해요.</li><li>발아하며 <b>아밀레이스</b>(녹말 분해 효소)가 만들어져요: 남은 녹말 100 % → 55 % → 25 % (활성 증가). 효소를 이용한 반응이에요.</li></ul>',
      missions: [
        {
          id: 'calc', title: '질량 감소와 방출 에너지 계산',
          goal: '6일째 건조 질량이 얼마나 줄었는지 구하고, 방출된 에너지를 계산해 입력하세요. 🧪 아밀레이스 화면도 한 번 확인해요.',
          hint: '측정한 날에서 6일을 고르고 10.0 − 8.4를 구해요. 방출 에너지는 줄어든 질량에 4 kcal/g를 곱해요. 아밀레이스 화면에서는 ▶ 반응 시작을 눌러요.',
          setup() { S.ms.day = 6; S.ms.seenAmy = false; S.am.p = 0; S.am.run = false; $('#inLoss').value = ''; $('#inKcal').value = ''; setMode('mass'); },
          check: () => S.ms.day === 6 && msOk() && S.ms.seenAmy, hold: 0.6,
          status: () => mark(S.ms.day === 6) + ' 6일째 선택 &nbsp; ' + mark(S.ms.day === 6 && near(numIn('inLoss'), 1.6, 0.06)) + ' 감소 질량 &nbsp; ' + mark(S.ms.day === 6 && near(numIn('inKcal'), 6.4, 0.06)) + ' 방출 에너지 &nbsp; ' + mark(S.ms.seenAmy) + ' 아밀레이스',
          explain: '건조 질량은 10.0 − 8.4 = <b>1.6 g</b> 줄었고, 이 저장 물질이 호흡으로 분해되어 1.6 g × 4 kcal/g = <b>6.4 kcal</b>의 화학 에너지가 방출돼요(단순 가정). 그중 약 1/3은 ATP에 저장되어 생장 · 합성에 쓰이고 나머지는 열이 돼요. 아밀레이스 활성이 커져서 남은 녹말이 100 → 55 → 25 %로 줄었어요.',
        },
        {
          type: 'quiz', title: '싹은 자라는데 질량은 줄어요',
          goal: '어두운 곳에서 싹이 자라는데 콩의 <b>건조 질량</b>이 줄어드는 까닭은?',
          setup() { setMode('mass'); },
          choices: ['싹이 트면 저장 물질이 사라지고 아무것도 만들어지지 않기 때문이다', '빛이 없어 광합성을 못 하고, 저장 물질을 호흡으로 분해해 쓰기 때문이다', '콩이 물을 흡수하면서 건조 질량도 함께 늘기 때문이다', '효소가 물질대사를 멈추기 때문이다'],
          answer: 1,
          feedback: ['싹과 뿌리를 만드는 동화 반응도 일어나요. 다만 호흡으로 분해되는 양이 더 많아요.', '', '물을 흡수하면 늘어나는 것은 생체 질량이에요. 건조 질량은 물을 말려 잰 값이에요.', '효소는 물질대사를 일으키는 데 쓰여요.'],
          explain: '발아 때는 저장 물질을 <b>이화</b>해 얻은 에너지(ATP)로 뿌리 · 싹을 만드는 <b>동화</b>를 해요. 빛이 없으면 광합성으로 새 양분을 못 만들어서 건조 질량은 줄어요.',
        },
        {
          type: 'quiz', title: '온도가 오르는 까닭',
          goal: '발아 콩이 든 보온병의 <b>온도가 오르는</b> 것은 무엇을 뜻할까요?',
          setup() { setMode('mass'); },
          choices: ['호흡으로 방출된 에너지 중 일부가 열로 나왔다', '콩이 주변에서 열을 흡수했다', '에너지가 새로 만들어졌다', '콩이 동화 반응만 했다'],
          answer: 0,
          feedback: ['', '열을 흡수했다면 온도가 내려가요.', '에너지는 새로 만들어지지 않고 형태가 바뀌어요(화학 에너지 → ATP + 열).', '동화는 에너지를 흡수하는 반응이라 온도를 올리지 않아요.'],
          explain: '저장 물질의 화학 에너지가 호흡으로 방출될 때 일부는 ATP에 저장되고 나머지는 <b>열</b>이 돼요. 이 열이 보온병의 온도를 올려요. 에너지는 사라지거나 새로 생기지 않고 형태만 바뀌어요.',
        },
      ],
    },
    {
      title: '단계적 반응', short: '단계적 반응', icon: '🪜', phase: '모형',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 포도당 같은 저장 물질이 분해되면 에너지가 ATP와 열로 나온다는 것을 계산했어요.</div><p>같은 포도당 1 mol(180 g)의 에너지 약 <b>2870 kJ</b>를 <b>연소</b>로 꺼내면 한꺼번에 열이 되지만, 세포는 <b>효소</b>로 20여 단계로 나눠 조금씩 꺼내요. 두 방식을 비교해 봐요.</p>',
      features: ['stair'],
      setup() { setMode('stair'); stReset(); },
      recap: '세포는 효소로 반응을 20여 단계로 나눠 에너지를 조금씩 방출해요. 그래서 37 °C에서도 빠르게 반응하고, 에너지의 일부를 ATP에 저장하며, 열 손상도 피해요.',
      summary: '<ul><li><b>연소</b>: 포도당 1 mol에서 약 2870 kJ이 <b>한꺼번에</b> 열로 방출(600 °C 이상의 불꽃). 세포 안에서는 일어날 수 없어요.</li><li><b>세포</b>: 같은 에너지를 <b>20여 단계의 효소 반응</b>으로 조금씩 방출(37 °C). 약 32 %(915 kJ)는 ATP에 저장하고 나머지(1955 kJ)는 열로 체온 유지에 써요.</li><li><b>효소</b>가 없으면 37 °C에서 반응이 거의 일어나지 않아요. 효소는 단계마다 반응을 빠르게 해요.</li><li>단계로 나누는 이점: 에너지를 <b>ATP로 붙잡아 저장</b>하고 <b>열 손상</b>을 피해요.</li></ul>',
      missions: [
        {
          id: 'stair', title: '연소와 세포 반응 비교',
          goal: '🔥 연소와 🧫 세포 반응을 각각 끝까지 실행해 온도를 비교하세요. 효소를 끈 세포도 3초 이상 관찰해요.',
          hint: '「🔥 연소 실행」과 「🧫 세포 반응 실행」을 차례로 눌러요. 효소 없음으로 바꾼 뒤 세포 반응을 실행해 3초쯤 지켜보세요.',
          setup() { stReset(); S.st.enz = true; S.st.offSeen = false; setMode('stair'); },
          check: () => S.st.combDone && S.st.cellDone && S.st.offSeen, hold: 0.8,
          status: () => mark(S.st.combDone) + ' 연소 ' + Math.round(S.st.c.peak) + ' °C &nbsp; ' + mark(S.st.cellDone) + ' 세포 37 °C 완주 &nbsp; ' + mark(S.st.offSeen) + ' 효소 없음 관찰',
          explain: '연소는 약 2초 만에 온도가 <b>600 °C 이상</b>으로 치솟지만, 세포는 20단계로 나눠 에너지를 꺼내며 <b>37 °C</b>를 유지해요. 효소를 끄면 37 °C에서는 반응이 거의 진행되지 않아요.',
        },
        {
          type: 'quiz', title: '37 °C에서도 빠른 반응',
          goal: '세포 안의 반응이 <b>37 °C</b>의 낮은 온도에서도 빠르게 일어나는 것은 무엇 덕분일까요?',
          setup() { setMode('stair'); },
          choices: ['세포 안이 600 °C까지 뜨거워져서', '효소가 각 단계의 반응을 빠르게 해 주어서', '반응하는 물질이 항상 불꽃을 만들어서', '산소가 한꺼번에 많이 들어와서'],
          answer: 1,
          feedback: ['세포 온도는 37 °C로 유지돼요.', '', '세포 안에는 불꽃이 없어요.', '산소의 양이 아니라 효소가 속도를 정해요.'],
          explain: '<b>효소</b>는 낮은 온도에서도 단계마다 반응을 빠르게 해요. 효소가 없으면 37 °C에서는 반응이 거의 일어나지 않아요.',
        },
        {
          type: 'quiz', title: '단계로 나누면 좋은 점',
          goal: '에너지를 <b>여러 단계</b>로 나누어 방출하는 것의 이점은?',
          setup() { setMode('stair'); },
          choices: ['에너지를 전부 열로 바꿀 수 있다', '에너지를 ATP로 저장할 수 있고 열 손상을 피할 수 있다', '방출되는 총 에너지가 더 커진다', '효소가 필요 없어진다'],
          answer: 1,
          feedback: ['오히려 일부는 ATP에 저장해요.', '', '총 에너지(2870 kJ)는 연소와 같아요.', '단계마다 효소가 필요해요.'],
          explain: '총 에너지는 같지만 단계마다 조금씩 나오기 때문에 일부(약 32 %)를 <b>ATP</b>에 담을 수 있고, 한꺼번에 나오는 열로 세포가 <b>손상</b>되는 것을 피해요.',
        },
      ],
    },
    {
      title: '대사 판별', short: '대사 판별', icon: '🗂', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 세포의 반응은 <b>효소</b>로 단계적으로 일어나고 에너지 출입이 따른다는 것을 알았어요.</div><p>이제 여러 상황이 <b>물질대사</b>인지 판단해요. 물질대사는 <b>생명체 안</b>에서 <b>효소</b>가 관여하며 <b>에너지 출입</b>이 있는 반응이에요. 이화와 동화로 나눈 뒤 에너지가 방출되는지 흡수되는지도 표시해요.</p>',
      features: ['judge'],
      setup() { setMode('judge'); },
      recap: '물질대사는 생명체 안에서 효소가 관여하며 에너지 출입이 따르는 반응이에요. 이화는 에너지를 방출하고 동화는 에너지를 흡수해요. 손난로와 모닥불은 효소가 없어 물질대사가 아니에요.',
      summary: '<ul><li><b>물질대사</b> = 생명체 안에서 <b>효소</b>를 이용해 일어나는 화학 반응 + <b>에너지 출입</b>.</li><li><b>이화</b>(분해): 큰 분자 → 작은 분자, 에너지 <b>방출</b> (콩 녹말 분해, 포도당 분해, 지방 분해). <b>동화</b>(합성): 작은 분자 → 큰 분자, 에너지 <b>흡수</b> (광합성, 단백질 · 호르몬 합성).</li><li>손난로 속 철의 산화, 모닥불의 연소는 에너지가 출입해도 <b>효소가 관여하지 않아</b> 물질대사가 아니에요.</li></ul>',
      missions: [
        {
          id: 'judge', title: '대사 판별', manual: true,
          goal: '카드 8장을 <b>이화 · 동화 · 물질대사 아님</b> 상자에 넣고, 이화와 동화의 <b>에너지 출입</b>을 고르세요.',
          hint: '효소가 관여하는 생명체 속 반응인지 먼저 따져요. 큰 분자를 작은 분자로 분해하면 이화, 작은 분자로 큰 분자를 합성하면 동화예요.',
          setup() { setMode('judge'); jsorter.reset(); $('#selCat').value = ''; $('#selAna').value = ''; updateCtl(); },
          check() {
            if (jsorter.placed < 8) { jsorter.markBad([]); return '카드를 모두 상자에 넣어 주세요. (' + jsorter.placed + ' / 8)'; }
            const w = jWrong();
            if (w.length) { jsorter.markBad(w.map((c) => c.id)); const q = JC.find((x) => x.id === w[0].id); return '\'' + q.short + '\' 카드가 다른 상자에 있어요. ' + q.why.split('. ')[0] + '. 다시 생각해 보세요.'; }
            jsorter.markBad([]);
            const sc = selVal('selCat'), sa = selVal('selAna');
            if (!sc || !sa) return '이화와 동화의 에너지 출입도 골라 주세요.';
            if (sc !== 'out') return '이화(분해)는 에너지를 방출할까요, 흡수할까요?';
            if (sa !== 'in') return '동화(합성)는 에너지를 방출할까요, 흡수할까요?';
            return true;
          },
          explain: '이화(콩 녹말 · 근육 포도당 · 곰의 지방 분해)는 에너지를 <b>방출</b>, 동화(광합성 · 단백질 합성 · 호르몬 합성)는 에너지를 <b>흡수</b>해요. 손난로 속 철 가루의 산화와 모닥불의 연소는 <b>효소 없이</b> 일어나므로 물질대사가 아니에요.',
        },
        {
          type: 'quiz', title: '손난로와 세포호흡',
          goal: '손난로(철 가루의 산화)와 세포호흡 모두 열이 나요. 두 반응의 가장 큰 차이는?',
          setup() { setMode('judge'); },
          choices: ['세포호흡은 효소가 관여하는 생명체 안의 반응이고, 손난로는 효소 없이 일어난다', '손난로만 에너지를 방출한다', '세포호흡은 산소를 쓰지 않는다', '손난로는 동화 반응이다'],
          answer: 0,
          feedback: ['', '둘 다 에너지를 방출해요.', '세포호흡도 산소를 써요.', '철의 산화는 물질대사가 아니라서 동화로 부르지 않아요.'],
          explain: '두 반응 모두 산소를 쓰고 열이 나지만, 세포호흡은 <b>효소</b>로 단계적으로 일어나며 ATP도 만들어요. 겨울잠 자는 동물은 저장 지방을 효소로 천천히 분해해 에너지를 써요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hy-metabolism', mount: '#game', badge: '대사 탐정', homeHref: '../../index.html#hy',
    featureLabels: { bean: '🫘 발아 콩 실험대', mass: '📉 질량과 에너지', amy: '🧪 아밀레이스', stair: '🪜 연소 vs 세포', judge: '🗂 대사 판별 카드' },
    onFeatures() { updateCtl(); },
    levels,
  });

  function readouts() {
    const m = S.mode;
    if (m === 'bean') {
      const b = S.bn, d = b.day, k = Math.floor(d + 1e-6);
      if (b.view === 'temp') setReads(['측정', k + ' / 3일', '발아 콩', fix1(interp(TEMP.germ, d)) + ' °C', '삶은 콩', fix1(interp(TEMP.boil, d)) + ' °C']);
      else if (b.view === 'o2') setReads(['측정', k + ' / 3일', '발아 콩 O₂ 소비', fix1(interp(O2V.germ, d)) + ' mL', '삶은 콩', fix1(interp(O2V.boil, d)) + ' mL']);
      else setReads(['측정', k + ' / 3일', '발아 콩 석회수', interp(O2V.germ, d) / 6.8 > 0.45 ? '뿌옇게' : '맑음', '삶은 콩 석회수', '맑음']);
    } else if (m === 'mass') setReads(['건조 질량', fix1(DRYM[S.ms.day]) + ' g', '줄어든 양', fix1(msLoss()) + ' g', '방출 에너지', msOk() ? fix1(msKcal()) + ' kcal' : '계산 중']);
    else if (m === 'amy') setReads(['반응 시간', Math.round(S.am.p * 10) + ' 분', '발아 4일 남은 녹말', Math.round(100 - 75 * smooth(S.am.p)) + ' %', '마른 콩 남은 녹말', '100 %']);
    else if (m === 'stair') setReads(['연소 온도', Math.round(S.st.c.peak) + ' °C', '세포 온도', '37 °C', '진행 단계', Math.min(NSTEP, S.st.s.last) + ' / ' + NSTEP]);
    else setReads(['놓은 카드', jsorter.placed + ' / 8', '이화 · 동화', jsorter.cards.filter((c) => c.zone === 'cat' || c.zone === 'ana').length + '장', '물질대사 아님', jsorter.cards.filter((c) => c.zone === 'non').length + '장']);
  }

  setMode('bean');
  let lastFree = false, lastLv = -1;
  SciSim.loop((dt, t) => {
    clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (game && game.level !== lastLv) { lastLv = game.level; updateCtl(); }
    view.apply(); FX.update(dt); ctx.clearRect(0, 0, VW, VH);
    if (S.mode !== 'bean') { if (S.bn.day < S.bn.tgt) { /* 측정은 화면을 떠나도 계속 */ S.bn.day = Math.min(S.bn.tgt, S.bn.day + dt * 0.5); } }
    switch (S.mode) {
      case 'bean': bgFill('#eef4f2', '#e3ece8'); bnDraw(dt, t); break;
      case 'mass': bgFill('#eef4f2', '#e3ece8'); msDraw(dt, t); break;
      case 'amy': bgFill('#eef4f2', '#e3ece8'); amDraw(dt, t); break;
      case 'stair': bgFill('#f4f1ec', '#ebe6dd'); stDraw(dt, t); break;
      case 'judge': bgFill('#eef4f2', '#e3ece8'); jDraw(dt, t); break;
    }
    if (S.mode !== 'stair') stUpdate(dt);
    FX.draw(); parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(241,246,243,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : approach(S.fade, 0, dt, 9); }
    readouts();
    // O2 3일 기록 표시
    if (S.bn.view === 'o2' && S.bn.day >= 2.999) S.bn.o2Done = true;
  });

  window.__sim = { S, VW, VH, PHONE, get game() { return game; }, levels, setMode, jsorter, JC, bnStep, bnAll, bnReset, bnSetView, stCombust, stCell, stEnz, stReset, amStart, updateCtl, msOk, interp, TEMP, O2V };
})();
