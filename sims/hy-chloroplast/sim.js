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
     고등학교 세포와 물질대사 · Ⅲ. 세포호흡과 광합성 - 엽록체와 광합성 색소 (단원 58, 6차시)
     성취기준 [12세포03-05] 엽록체의 구조를 이해하고 기능과 관련지어 설명할 수 있다.
     ① 모형: 모형 조립  ② 실험: 색소 분리  ③ 분석: 구조와 기능  ④ 적용: 추론하기
     (3D 회전 · 단면 모형, 종이 크로마토그래피의 Rf 값, 흡수 스펙트럼)
     ========================================================= */
  const S = { mode: 'build', fade: 0 };
  let game = null;
  const fi = (v) => String(Math.round(v));
  const ease = SciSim.ease;
  const seg = (t, a, b) => clamp((t - a) / (b - a), 0, 1);

  /* ---------- 3D 모형 자료 ---------- */
  const CA = 120, CB = 58, CC = 58, KI = 0.9;               // 외막의 반축 (길이 · 높이 · 깊이), 내막의 비율
  const DS = 8.6, DR = 13.5, DT = 5.2;                      // 틸라코이드 판의 간격 · 반지름 · 두께
  const GR = [[-72, -4, 8, 5], [-38, 4, -16, 6], [-4, -2, 17, 5], [30, 5, -12, 6], [62, -3, 10, 4], [-8, 0, -27, 4]];   // 그라나: x, y, z, 판 수
  const LAM = [[0, 1], [1, 2], [2, 3], [3, 4], [1, 5], [5, 3]];       // 스트로마 틸라코이드가 이어 주는 그라나 쌍
  const STA = [[-94, 0, 0, 7], [86, 2, -6, 8], [14, -34, -4, 9]];     // 녹말 알갱이: x, y, z, 반지름
  const DNAC = [-30, -33, 2];
  const PARTS = [
    { id: 'outer', name: '외막', clue: '바깥을 싸는 매끈한 막', col: '#a8561f', anchor: [102, 30, 0] },
    { id: 'inner', name: '내막', clue: '안쪽을 싸는 막', col: '#c2255c', anchor: [-92, 26, 0] },
    { id: 'stroma', name: '스트로마', clue: '내막 안쪽의 액체', col: '#65a30d', anchor: [52, -31, -10] },
    { id: 'granum', name: '그라나', clue: '틸라코이드가 쌓인 것', col: '#15803d', anchor: [-4, 19, 17] },
    { id: 'lamella', name: '스트로마 틸라코이드', clue: '그라나를 잇는 막', col: '#0d9488', anchor: [-21, 6, 0] },
    { id: 'lumen', name: '틸라코이드 내부', clue: '막 주머니 안쪽 공간', col: '#ca8a04', anchor: [62, -7, 22] },
    { id: 'starch', name: '녹말 알갱이', clue: '만든 양분을 잠시 저장', col: '#64748b', anchor: [86, 2, -6] },
    { id: 'dna', name: 'DNA', clue: '고리 모양 유전 물질', col: '#2563eb', anchor: [-30, -33, 2] },
    { id: 'ribo', name: '리보솜', clue: '작은 단백질 공장 알갱이', col: '#7c3aed', anchor: [48, 28, 16] },
  ];
  const TRAY_ORDER = [3, 0, 2, 5, 1, 4, 6, 7, 8];
  const TAGSLOT = [['top', 0], ['bot', 0], ['bot', 1], ['top', 1], ['bot', 2], ['top', 2], ['bot', 4], ['bot', 3], ['top', 3]];
  const inEll = (x, y, z, k) => (x / (CA * k)) ** 2 + (y / (CB * k)) ** 2 + (z / (CC * k)) ** 2 <= 1;
  const RIBO = (() => {
    const r = mulberry(5), out = [[48, 28, 16]]; let guard = 0;
    while (out.length < 15 && guard++ < 600) {
      const X = (r() - 0.5) * 2 * 112, Y = (r() - 0.5) * 100, Z = (r() - 0.5) * 100;
      if (!inEll(X, Y, Z, 0.86)) continue;
      if (GR.some((g) => Math.hypot(X - g[0], Z - g[2]) < DR + 5 && Math.abs(Y - g[1]) < g[3] * DS / 2 + 7)) continue;
      if (STA.some((q) => Math.hypot(X - q[0], Y - q[1], Z - q[2]) < q[3] + 6)) continue;
      if (Math.hypot(X - DNAC[0], Y - DNAC[1], Z - DNAC[2]) < 20) continue;
      if (out.some((q) => Math.hypot(q[0] - X, q[1] - Y, q[2] - Z) < 16)) continue;
      out.push([X, Y, Z]);
    }
    return out;
  })();

  /* =========================================================
     ① 3D 단면 모형 (조립 · 회전 · 절개)
     ========================================================= */
  S.b = { th: 0.35, s: 0, sT: 0, pitch: 0.32, a: PARTS.map(() => 0), placed: PARTS.map(() => false), tok: [], sel: -1, drag: null, rot: null, hov: -1, nameMode: false, cmp: false, cx: 0, cy: 0, sc: 1 };
  const bPlaced = () => S.b.placed.filter(Boolean).length;
  function bLay() {
    return PHONE
      ? { cx: 240, cy: 186, sc: 1.25, topY: 40, botY: [326, 352], topX: [-175, -60, 55, 170], botX: [-165, -78, 6, 90, 178], tx: 10, ty: 376, tcw: 228, tch: 40, tgx: 4, tgy: 4, cols: 2, hintY: 624 }
      : { cx: 400, cy: 200, sc: 1.5, topY: 40, botY: [354, 354], topX: [-300, -95, 105, 300], botX: [-300, -160, -45, 60, 185], tx: 14, ty: 394, tcw: 148, tch: 54, tgx: 8, tgy: 8, cols: 5, hintY: 538 };
  }
  function bTokInit() {
    const g = bLay();
    S.b.tok = TRAY_ORDER.map((pi, k) => {
      const col = k % g.cols, row = Math.floor(k / g.cols), x = g.tx + col * (g.tcw + g.tgx), y = g.ty + row * (g.tch + g.tgy);
      return { pi, x, y, w: g.tcw, h: g.tch, hx: x, hy: y, lift: 0, shake: 0, state: 'tray', alpha: 1 };
    });
  }
  function bReset() {
    const b = S.b; b.placed = PARTS.map(() => false); b.a = PARTS.map(() => 0); b.sel = -1; b.drag = null; b.hov = -1; bTokInit(); updateCtl();
  }
  function bProj(X, Y, Z) {
    const b = S.b, c = Math.cos(b.th), s = Math.sin(b.th), X1 = X * c + Z * s, Z1 = -X * s + Z * c, cp = Math.cos(b.pitch), sp = Math.sin(b.pitch);
    const Y2 = Y * cp - Z1 * sp, Z2 = Y * sp + Z1 * cp;
    return { x: b.cx + X1 * b.sc, y: b.cy - Y2 * b.sc, z: Z2 };
  }
  const bAnchor = (i) => { const a = PARTS[i].anchor; return bProj(a[0], a[1], a[2]); };
  /* 렌즈(회전 타원체)의 윤곽: k = 1 외막, KI = 내막 */
  function ellPath(k) {
    const b = S.b, c = Math.cos(b.th), s = Math.sin(b.th), sp = Math.sin(b.pitch), cp = Math.cos(b.pitch), A = CA * k, B = CB * k, Q = CC * k;
    const m11 = A * A * c * c + Q * Q * s * s, m22 = A * A * s * s * sp * sp + B * B * cp * cp + Q * Q * c * c * sp * sp, m12 = (A * A - Q * Q) * c * s * sp;
    const mean = (m11 + m22) / 2, d = Math.sqrt(((m11 - m22) / 2) ** 2 + m12 * m12), l1 = mean + d, l2 = Math.max(1e-6, mean - d), phi = 0.5 * Math.atan2(2 * m12, m11 - m22);
    ctx.moveTo(b.cx + Math.sqrt(l1) * b.sc * Math.cos(-phi), b.cy + Math.sqrt(l1) * b.sc * Math.sin(-phi));
    ctx.ellipse(b.cx, b.cy, Math.sqrt(l1) * b.sc, Math.sqrt(l2) * b.sc, -phi, 0, TAU);
  }
  const GHOST = '#8d9bb0';
  function ghostStroke(a, w) { ctx.globalAlpha = a; ctx.strokeStyle = GHOST; ctx.lineWidth = w || 1.8; ctx.setLineDash([6, 5]); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1; }
  function glowStroke(col, w) { const p = 0.55 + 0.35 * Math.sin(clock * 6); ctx.save(); ctx.globalAlpha = p; ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineJoin = 'round'; ctx.stroke(); ctx.restore(); }
  function bOutline(k, col, A, mode, lw) {
    ctx.beginPath(); ellPath(k);
    if (mode === 'ghost') ghostStroke(1, 2);
    else if (mode === 'solid') { ctx.save(); ctx.globalAlpha = A; ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.stroke(); ctx.restore(); }
    else glowStroke(col, lw + 7);
  }
  function bStroma(A, mode) {
    ctx.beginPath(); ellPath(KI);
    if (mode === 'ghost') { ctx.save(); ctx.fillStyle = 'rgba(141,155,176,.05)'; ctx.fill(); ctx.restore(); }
    else if (mode === 'solid') {
      const a = bProj(0, 0, 0), g = ctx.createRadialGradient(a.x - 40, a.y - 30, 10, a.x, a.y, CA * S.b.sc);
      g.addColorStop(0, '#f2fbd8'); g.addColorStop(1, '#cfe9a0'); ctx.save(); ctx.globalAlpha = A * 0.92; ctx.fillStyle = g; ctx.fill(); ctx.restore();
    } else { ctx.save(); ctx.fillStyle = 'rgba(132,204,22,.45)'; ctx.globalAlpha = 0.6 + 0.35 * Math.sin(clock * 6); ctx.fill(); ctx.restore(); }
  }
  /* 안쪽 구조: 그라나(판) · 스트로마 틸라코이드 · 녹말 · DNA · 리보솜 을 깊이 순서로 */
  function bItems() {
    const items = [];
    GR.forEach((g, k) => { const p = bProj(g[0], g[1], g[2]); items.push({ z: p.z, k: 'g', gi: k }); });
    LAM.forEach((l, k) => { const a = GR[l[0]], c = GR[l[1]], p = bProj((a[0] + c[0]) / 2, (a[1] + c[1]) / 2 + 4, (a[2] + c[2]) / 2); items.push({ z: p.z + 0.5, k: 'l', li: k }); });
    STA.forEach((q, k) => { const p = bProj(q[0], q[1], q[2]); items.push({ z: p.z, k: 's', si: k }); });
    { const p = bProj(DNAC[0], DNAC[1], DNAC[2]); items.push({ z: p.z, k: 'd' }); }
    RIBO.forEach((q) => { const p = bProj(q[0], q[1], q[2]); items.push({ z: p.z, k: 'r', p }); });
    items.sort((p, q) => p.z - q.z);
    return items;
  }
  const partOf = (it) => (it.k === 'g' ? 3 : it.k === 'l' ? 4 : it.k === 's' ? 6 : it.k === 'd' ? 7 : 8);
  function discDraw(g, j, mode, A, lumenA) {
    const b = S.b, sc = b.sc, n = g[3], yy = g[1] + (j - (n - 1) / 2) * DS, c = bProj(g[0], yy, g[2]), rx = DR * sc, sp = Math.sin(b.pitch), ry = Math.max(1.6, DR * sc * sp), th = DT * Math.cos(b.pitch) * sc;
    const sideA = [c.x - rx, c.y], sideB = [c.x + rx, c.y];
    if (mode === 'ghost') { ctx.beginPath(); ctx.ellipse(c.x, c.y, rx, ry, 0, 0, TAU); ghostStroke(1, 1.3); return; }
    if (mode === 'glow') { ctx.beginPath(); ctx.ellipse(c.x, c.y, rx, ry, 0, 0, TAU); ctx.save(); ctx.fillStyle = 'rgba(34,197,94,.45)'; ctx.fill(); ctx.restore(); glowStroke('#22c55e', 6); return; }
    ctx.save(); ctx.globalAlpha = A;
    // 옆면
    ctx.beginPath(); ctx.moveTo(sideA[0], sideA[1]); ctx.lineTo(sideA[0], sideA[1] + th); ctx.ellipse(c.x, c.y + th, rx, ry, 0, Math.PI, 0, true); ctx.lineTo(sideB[0], sideB[1]); ctx.ellipse(c.x, c.y, rx, ry, 0, 0, Math.PI, true); ctx.closePath();
    ctx.fillStyle = '#15803d'; ctx.fill(); ctx.strokeStyle = '#14532d'; ctx.lineWidth = 1.2; ctx.stroke();
    if (lumenA > 0.02 && b.pitch < 0.2) { ctx.fillStyle = 'rgba(253,230,138,' + lumenA + ')'; ctx.fillRect(c.x - rx + 2, c.y + th * 0.25, rx * 2 - 4, Math.max(1.2, th * 0.5)); }
    // 윗면
    ctx.beginPath(); ctx.ellipse(c.x, c.y, rx, ry, 0, 0, TAU); const gg = ctx.createRadialGradient(c.x - rx * 0.3, c.y - ry * 0.3, 1, c.x, c.y, rx); gg.addColorStop(0, '#4ade80'); gg.addColorStop(1, '#16a34a'); ctx.fillStyle = gg; ctx.fill(); ctx.strokeStyle = '#14532d'; ctx.lineWidth = 1.4; ctx.stroke();
    if (lumenA > 0.02) { ctx.beginPath(); ctx.ellipse(c.x, c.y, rx * 0.62, Math.max(1, ry * 0.62), 0, 0, TAU); ctx.fillStyle = 'rgba(253,230,138,' + lumenA * 0.9 + ')'; ctx.fill(); }
    ctx.restore();
  }
  function bItemDraw(it, mode) {
    const b = S.b, i = partOf(it), A = b.a[i], sc = b.sc, lumenA = b.a[5];
    if (it.k === 'g') {
      const g = GR[it.gi];
      for (let j = 0; j < g[3]; j++) discDraw(g, j, mode, A, mode === 'solid' ? lumenA : 0);
    } else if (it.k === 'l') {
      const l = LAM[it.li], a = GR[l[0]], c = GR[l[1]], y = (a[1] + c[1]) / 2 + 4, p1 = bProj(a[0], y, a[2]), p2 = bProj(c[0], y, c[2]);
      ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y);
      if (mode === 'ghost') ghostStroke(1, 2);
      else if (mode === 'solid') { ctx.save(); ctx.globalAlpha = A; ctx.lineCap = 'round'; ctx.strokeStyle = '#115e59'; ctx.lineWidth = 7 * sc; ctx.stroke(); ctx.strokeStyle = lumenA > 0.02 ? 'rgba(253,230,138,' + (0.5 + 0.5 * lumenA) + ')' : '#2dd4bf'; ctx.lineWidth = 4.2 * sc; ctx.stroke(); ctx.restore(); }
      else glowStroke('#2dd4bf', 7 * sc);
    } else if (it.k === 's') {
      const q = STA[it.si], p = bProj(q[0], q[1], q[2]), r = q[3] * sc;
      if (mode === 'ghost') { ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU); ghostStroke(1, 1.4); }
      else if (mode === 'solid') { ctx.save(); ctx.globalAlpha = A; D.sphere(p.x, p.y, r, '#f1f5f9', { gloss: true, outline: '#94a3b8' }); ctx.restore(); }
      else { ctx.save(); ctx.globalAlpha = 0.6 + 0.35 * Math.sin(clock * 6); D.glow(p.x, p.y, r * 2.6, '#94a3b8', 0.9); ctx.restore(); }
    } else if (it.k === 'd') {
      const pts = []; for (let j = 0; j <= 40; j++) { const f = (j / 40) * TAU, r = 11 + 2 * Math.sin(3 * f); pts.push(bProj(DNAC[0] + r * Math.cos(f), DNAC[1] + r * Math.sin(f), DNAC[2])); }
      ctx.beginPath(); pts.forEach((q, j) => (j ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y))); ctx.closePath();
      if (mode === 'ghost') ghostStroke(1, 2);
      else if (mode === 'solid') { ctx.save(); ctx.globalAlpha = A; ctx.strokeStyle = '#1d4ed8'; ctx.lineWidth = 4; ctx.lineJoin = 'round'; ctx.stroke(); ctx.strokeStyle = 'rgba(147,197,253,.9)'; ctx.lineWidth = 1.4; ctx.stroke(); ctx.restore(); }
      else glowStroke('#60a5fa', 9);
    } else {
      const r = 3.4 * sc;
      if (mode === 'ghost') { ctx.beginPath(); ctx.arc(it.p.x, it.p.y, r, 0, TAU); ghostStroke(1, 1.3); }
      else if (mode === 'solid') { ctx.save(); ctx.globalAlpha = A; D.sphere(it.p.x, it.p.y, r, '#7c3aed', { gloss: false }); ctx.restore(); }
      else { ctx.save(); ctx.globalAlpha = 0.6 + 0.35 * Math.sin(clock * 6); D.glow(it.p.x, it.p.y, r * 3.2, '#a78bfa', 0.9); ctx.restore(); }
    }
  }
  function bModel() {
    const b = S.b, A = b.a, fr = (1 - smooth(b.s)) * 0.5;
    if (A[2] < 0.99) bStroma(0, 'ghost'); if (A[2] > 0.01) bStroma(A[2], 'solid');
    const items = bItems();
    items.forEach((it) => { const i = partOf(it); if (A[i] < 0.99) bItemDraw(it, 'ghost'); if (A[i] > 0.01) bItemDraw(it, 'solid'); });
    // 앞쪽의 막 (단면을 열면 투명해져요)
    if (fr > 0.01 && A[0] > 0.02) {
      const a = bProj(0, 0, 0), g = ctx.createLinearGradient(a.x, b.cy - CB * b.sc, a.x, b.cy + CB * b.sc);
      g.addColorStop(0, 'rgba(255,255,255,' + (fr * 0.8) + ')'); g.addColorStop(0.5, 'rgba(255,240,220,' + (fr * 0.3) + ')'); g.addColorStop(1, 'rgba(255,255,255,' + (fr * 0.1) + ')');
      ctx.save(); ctx.globalAlpha = A[0]; ctx.beginPath(); ellPath(1); ctx.fillStyle = g; ctx.fill(); ctx.restore();
    }
    if (A[1] < 0.99) bOutline(KI, '', 0, 'ghost'); if (A[1] > 0.01) bOutline(KI, '#c2255c', A[1], 'solid', 3.5);
    if (A[0] < 0.99) bOutline(1, '', 0, 'ghost'); if (A[0] > 0.01) bOutline(1, '#a8561f', A[0], 'solid', 5);
    // 강조 (표시 위에 끌고 있을 때)
    if (b.hov >= 0 && !b.placed[b.hov]) {
      const i = b.hov;
      if (i === 0) bOutline(1, '#a8561f', 1, 'glow', 5); else if (i === 1) bOutline(KI, '#c2255c', 1, 'glow', 4); else if (i === 2) bStroma(1, 'glow');
      else if (i === 5) items.filter((it) => it.k === 'g').forEach((it) => bItemDraw(it, 'glow'));
      else items.filter((it) => partOf(it) === i).forEach((it) => bItemDraw(it, 'glow'));
    }
  }
  function bTags(g) {
    const b = S.b;
    PARTS.forEach((p, i) => {
      if (b.a[i] < 0.05) return;
      const [row, k] = TAGSLOT[i], sx = g.cx + (row === 'top' ? g.topX[k] : g.botX[k]), sy = row === 'top' ? g.topY : (PHONE ? g.botY[k % 2] : g.botY[0]);
      const an = bAnchor(i);
      ctx.save(); ctx.globalAlpha = b.a[i];
      ctx.strokeStyle = 'rgba(71,85,105,.75)'; ctx.lineWidth = 1.4; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(an.x, an.y); ctx.lineTo(sx, sy + (row === 'top' ? 12 : -12)); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = '#334155'; ctx.beginPath(); ctx.arc(an.x, an.y, 3.2, 0, TAU); ctx.fill();
      D.label(sx, sy, p.name, { bg: '#fff', color: C.shade(p.col, -0.25), border: p.col, size: PHONE ? 13 : 14 });
      ctx.restore();
    });
  }
  const NM_ANS = ['outer', 'stroma', 'inner', 'lumen', 'granum'];
  const NM_PIN = [0, 2, 1, 5, 3];
  const nmVal = (i) => selVal('nm' + i);
  const nmOK = (i) => nmVal(i) === NM_ANS[i];
  const nmBad = (i) => S.nmChk && nmVal(i) !== '' && nmVal(i) !== NM_ANS[i];
  function bPins() {
    for (let i = 0; i < 5; i++) {
      const an = bAnchor(NM_PIN[i]), ok = nmOK(i), bad = nmBad(i);
      ctx.save();
      D.shadow(() => { ctx.fillStyle = ok ? '#dcfce7' : bad ? '#fee2e2' : '#fff'; ctx.beginPath(); ctx.arc(an.x, an.y, 14, 0, TAU); ctx.fill(); }, { blur: 5, y: 2 });
      ctx.strokeStyle = ok ? '#16a34a' : bad ? '#e2464b' : '#334155'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(an.x, an.y, 14, 0, TAU); ctx.stroke(); ctx.restore();
      T(an.x, an.y + 5.5, '①②③④⑤'[i], 17, ok ? '#15803d' : bad ? '#b91c1c' : '#1f2d44', 'center', 800);
    }
  }
  function bTokDraw(t) {
    const p = PARTS[t.pi], done = t.state === 'placed', sel = S.b.sel === t.pi && !done;
    ctx.save();
    const cx = t.x + t.w / 2, cy = t.y + t.h / 2; ctx.translate(cx, cy); const s = 1 + t.lift * 0.06; ctx.scale(s, s);
    if (t.shake > 0 && !RM) ctx.translate(Math.sin(clock * 60) * 3 * t.shake, 0);
    ctx.globalAlpha = done ? 0.5 : 1;
    D.shadow(() => { D.roundRect(-t.w / 2, -t.h / 2, t.w, t.h, 12); ctx.fillStyle = done ? '#eef2f7' : sel ? '#fff8dc' : '#fff'; ctx.fill(); }, { blur: 5 + t.lift * 10, y: 2 + t.lift * 4 });
    D.roundRect(-t.w / 2, -t.h / 2, t.w, t.h, 12); ctx.strokeStyle = sel ? '#f59e0b' : C.shade(p.col, 0.1); ctx.lineWidth = sel ? 3 : 2; ctx.stroke();
    ctx.fillStyle = p.col; D.roundRect(-t.w / 2 + 7, -t.h / 2 + 9, 7, t.h - 18, 4); ctx.fill();
    TF(-t.w / 2 + 21, PHONE ? -2 : -3, p.name, t.w - 44, PHONE ? 14 : 15, 11, '#26324a', 'left', 800);
    TF(-t.w / 2 + 21, PHONE ? 13 : 15, p.clue, t.w - 30, PHONE ? 11 : 11.5, 9.5, '#5a6679', 'left', 700);
    if (done) D.check(t.w / 2 - 18, 0, 8, 1);
    ctx.restore();
  }
  function bCompare(g) {
    const P = PHONE ? { x: 10, y: 60, w: 460, h: 262 } : { x: 548, y: 66, w: 240, h: 272 };
    ctx.save(); ctx.globalAlpha = 0.97; panel(P.x, P.y, P.w, P.h, 16, '#fffdf6'); ctx.restore();
    T(P.x + 12, P.y + 24, '⚙️ 미토콘드리아와 비교', 14.5, '#1f2d44', 'left', 800);
    // 작은 미토콘드리아
    const mx = P.x + P.w / 2, my = P.y + 62, mw = PHONE ? 90 : 78, mh = 30;
    D.roundRect(mx - mw, my - mh, mw * 2, mh * 2, mh); ctx.fillStyle = '#fff4de'; ctx.fill(); ctx.strokeStyle = '#a8561f'; ctx.lineWidth = 3; ctx.stroke();
    D.roundRect(mx - mw + 7, my - mh + 7, mw * 2 - 14, mh * 2 - 14, mh - 7); ctx.strokeStyle = '#c2255c'; ctx.lineWidth = 2.2; ctx.stroke();
    ctx.strokeStyle = '#e5508a'; ctx.lineWidth = 3; [-36, -12, 12, 36].forEach((dx, k) => { ctx.beginPath(); if (k % 2) { ctx.moveTo(mx + dx, my + mh - 8); ctx.lineTo(mx + dx, my - 2); } else { ctx.moveTo(mx + dx, my - mh + 8); ctx.lineTo(mx + dx, my + 2); } ctx.stroke(); });
    T(mx, my + mh + 20, '미토콘드리아: 내막이 접힌 크리스타', 12.5, '#a8561f', 'center', 800);
    const fs = PHONE ? 13 : 13;
    const lines = [['공통', '이중막(외막 + 내막) · 안쪽에 기질/스트로마', '고리 DNA · 70S 리보솜 → 일부 단백질을 자체 합성'], ['다른 점', '미토콘드리아: 내막이 안으로 접힌 크리스타', '엽록체: 내막과 따로 있는 틸라코이드 막 (그라나)']];
    let y = my + mh + 44;
    lines.forEach((ln, k) => {
      T(P.x + 12, y, (k ? '◆ ' : '◇ ') + ln[0], 13.5, k ? '#b91c1c' : '#15803d', 'left', 800); y += 5;
      ln.slice(1).forEach((s) => { const ls = wrap(s, P.w - 30, fs, 700); ls.forEach((l) => { y += fs + 4; T(P.x + 18, y, l, fs, '#334155', 'left', 700); }); y += 3; });
      y += 14;
    });
  }
  function bDraw(dt, t) {
    const b = S.b, g = bLay(); b.cx = g.cx; b.cy = g.cy; b.sc = g.sc;
    b.s = RM ? b.sT : approach(b.s, b.sT, dt, 8); b.pitch = 0.32 * (1 - smooth(b.s));
    PARTS.forEach((p, i) => { b.a[i] = RM ? (b.placed[i] ? 1 : 0) : approach(b.a[i], b.placed[i] ? 1 : 0, dt, 7); if (Math.abs(b.a[i] - (b.placed[i] ? 1 : 0)) < 0.004) b.a[i] = b.placed[i] ? 1 : 0; });
    b.tok.forEach((k) => { k.lift = approach(k.lift, b.drag && b.drag.t === k && b.drag.moved ? 1 : 0, dt, 14); k.shake = Math.max(0, k.shake - dt * 3); });
    const gy = b.cy + CB * b.sc * 1.02 + 8;
    ctx.save(); const gg = ctx.createRadialGradient(b.cx, gy, 6, b.cx, gy, 240 * g.sc); gg.addColorStop(0, 'rgba(100,116,139,.2)'); gg.addColorStop(1, 'rgba(100,116,139,0)'); ctx.fillStyle = gg; ctx.beginPath(); ctx.ellipse(b.cx, gy, 240 * g.sc, 24 * g.sc, 0, 0, TAU); ctx.fill(); ctx.restore();
    bModel();
    if (b.nameMode) bPins(); else bTags(g);
    if (!b.nameMode) PARTS.forEach((p, i) => {
      if (b.placed[i]) return; const an = bAnchor(i), hot = b.hov === i, r = hot ? 17 : 13;
      ctx.save(); D.shadow(() => { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(an.x, an.y, r, 0, TAU); ctx.fill(); }, { blur: 5, y: 2 });
      ctx.strokeStyle = hot ? '#f59e0b' : '#475569'; ctx.lineWidth = hot ? 3 : 2; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.arc(an.x, an.y, r, 0, TAU); ctx.stroke(); ctx.setLineDash([]); ctx.restore();
      T(an.x, an.y + 6, '?', 16, hot ? '#b45309' : '#334155', 'center', 800);
      if (b.drag && b.drag.moved) D.ring(an.x, an.y, 15, t + i * 0.13, { color: '#f59e0b', width: 2 });
    });
    const all = bPlaced() === PARTS.length;
    T(g.cx, g.hintY, b.nameMode ? '핀 ①~⑤가 가리키는 구조의 이름을 오른쪽 목록에서 골라요' : all ? '조립 완료! 화면을 끌어 돌려 보고 단면 슬라이더로 열어 보세요' : '부품 카드를 모형의 물음표(?)로 끌어다 놓아요', PHONE ? 12.5 : 13.5, '#64748b', 'center', 800);
    if (!b.nameMode && !all) { b.tok.forEach((k) => { if (!(b.drag && b.drag.t === k)) bTokDraw(k); }); if (b.drag) bTokDraw(b.drag.t); }
    else if (!b.nameMode) b.tok.forEach(bTokDraw);
    if (!PHONE) T(g.cx, 380, '길이 약 5~10 μm · 지름 약 2~3 μm', 12.5, '#7b8aa0', 'center', 700);
    if (b.cmp) bCompare(g);
  }
  function bFindMarker(p, rad) {
    let bi = -1, bd = rad || 46;
    PARTS.forEach((q, i) => { if (S.b.placed[i]) return; const a = bAnchor(i), d = Math.hypot(a.x - p.x, a.y - p.y); if (d < bd) { bd = d; bi = i; } });
    return bi;
  }
  function bPlace(t, i) {
    const b = S.b, an = bAnchor(i); b.drag = null; b.sel = -1;
    if (t.pi !== i) { t.shake = 1; Sound.fail(); showHint('그 자리는 ' + PARTS[t.pi].name + josa(PARTS[t.pi].name, '이', '가') + ' 아니에요. 점선 모양과 설명을 잘 맞춰 보세요.', 3200); SciSim.tween(t, { x: t.hx, y: t.hy }, { duration: RM ? 0.01 : 0.35, ease: 'outBack' }); return false; }
    b.placed[i] = true; t.state = 'placed'; Sound.success(); hideHint();
    parts.burst(an.x, an.y, { count: 14, colors: [PARTS[i].col, '#fff', '#fbbf24'], speed: 120, life: 0.7, gravity: 80 });
    FX.add({ kind: 'text', x: an.x, y: an.y - 18, life: 1, text: PARTS[i].name, color: C.shade(PARTS[i].col, -0.2), size: 15 });
    SciSim.tween(t, { x: t.hx, y: t.hy }, { duration: RM ? 0.01 : 0.3, ease: 'outBack' });
    updateCtl(); return true;
  }
  const bPT = {
    down(p) {
      const b = S.b;
      if (!b.nameMode) {
        for (let k = b.tok.length - 1; k >= 0; k--) { const t = b.tok[k]; if (t.state === 'tray' && inRect(p.x, p.y, t)) { SciSim.tween(t, { x: t.x, y: t.y }, { duration: 0.0001 }); b.drag = { t, dx: p.x - t.x, dy: p.y - t.y, sx: p.x, sy: p.y, moved: false }; Sound.tick(); return true; } }
        if (b.sel >= 0) { const i = bFindMarker(p, 40); if (i >= 0) { const t = b.tok.find((q) => q.pi === b.sel); if (t) bPlace(t, i); return false; } }
      }
      b.rot = { sx: p.x, th0: b.th, moved: false }; return true;
    },
    move(p) {
      const b = S.b;
      if (b.drag) { const d = b.drag; if (Math.hypot(p.x - d.sx, p.y - d.sy) > 8) d.moved = true; if (d.moved) { d.t.x = clamp(p.x - d.dx, 0, VW - d.t.w); d.t.y = clamp(p.y - d.dy, 0, VH - d.t.h); b.hov = bFindMarker(p, 46); } }
      else if (b.rot) { if (Math.abs(p.x - b.rot.sx) > 4) b.rot.moved = true; b.th = b.rot.th0 + (p.x - b.rot.sx) * 0.012; }
    },
    up(p) {
      const b = S.b;
      if (b.drag) {
        const d = b.drag, t = d.t; b.hov = -1;
        if (!d.moved) { b.drag = null; b.sel = b.sel === t.pi ? -1 : t.pi; SciSim.tween(t, { x: t.hx, y: t.hy }, { duration: 0.0001 }); return; }
        const i = bFindMarker(p, 46); if (i >= 0) bPlace(t, i); else { b.drag = null; SciSim.tween(t, { x: t.hx, y: t.hy }, { duration: RM ? 0.01 : 0.35, ease: 'outBack' }); }
      }
      b.rot = null;
    },
    hover(p) { const b = S.b; return b.tok.some((t) => t.state === 'tray' && inRect(p.x, p.y, t)) && !b.nameMode ? 'grab' : 'ew-resize'; },
  };
  function bSpin() { const b = S.b; if (RM) { b.th += TAU; return; } SciSim.tween(b, { th: b.th + TAU }, { duration: 1.6, ease: 'inOutCubic' }); }
  function bFront() { const b = S.b; const tg = Math.round(b.th / TAU) * TAU; if (RM) b.th = tg; else SciSim.tween(b, { th: tg }, { duration: 0.6, ease: 'outCubic' }); }
  function bCut(v) { S.b.sT = clamp(v, 0, 1); $('#sCut').value = Math.round(S.b.sT * 100); updateCtl(); }

  /* =========================================================
     ② 색소 분리: 종이 크로마토그래피
     ========================================================= */
  const PIG = [
    { id: 'car', name: '카로틴', color: '주황', rf: 0.95, col: '#f59e0b', dist: 9.5 },
    { id: 'xan', name: '잔토필', color: '노랑', rf: 0.75, col: '#eab308', dist: 7.5 },
    { id: 'cha', name: '엽록소 a', color: '청록', rf: 0.6, col: '#0d9488', dist: 6.0 },
    { id: 'chb', name: '엽록소 b', color: '황록', rf: 0.5, col: '#84cc16', dist: 5.0 },
  ];
  const FRONT = 10.0;                 // 용매 이동 거리 (cm, 원점선에서)
  const rfOf = (p) => p.dist / FRONT;   // 표에 쓰는 Rf = 색소 이동 거리 / 용매 이동 거리
  S.ch = { ext: false, extT: 0, spots: 0, depth: 1, dipped: false, dipT: 0, dev: 0, devRun: false, devDone: false, marked: false, markA: 0, fail: false, meas: {}, flash: 0, ruler: new Num(0), fade: 0 };
  function chG() {
    if (PHONE) return { u: 21, px: 300, pb: 428, pw: 66, ph: 14, jarX: 300, jarW: 118, bench: { x: 10, y: 10, w: 190, h: 410 } };
    return { u: 24.5, px: 560, pb: 470, pw: 76, ph: 14, jarX: 560, jarW: 140, bench: { x: 14, y: 14, w: 290, h: 470 } };
  }
  function chReset() { const c = S.ch; c.ext = false; c.extT = 0; c.spots = 0; c.dipped = false; c.dipT = 0; c.dev = 0; c.devRun = false; c.devDone = false; c.marked = false; c.markA = 0; c.fail = false; c.meas = {}; c.ruler.snap(0); c.fade = 0; $$('#rfRows input').forEach((e) => { e.value = ''; }); $$('#rfRows select').forEach((e) => { e.value = ''; }); updateCtl(); }
  function chNewPaper() { const c = S.ch; c.spots = 0; c.dipped = false; c.dipT = 0; c.dev = 0; c.devRun = false; c.devDone = false; c.marked = false; c.markA = 0; c.fail = false; c.meas = {}; c.ruler.snap(0); c.fade = 0; updateCtl(); }
  function chExtract() { const c = S.ch; if (c.ext) return; c.ext = true; c.extT = 0; Sound.success(); showHint('시금치 잎을 에탄올에 갈아 초록색 추출액을 만들었어요.', 3000); updateCtl(); }
  function chSpot() { const c = S.ch; if (!c.ext || c.dipped || c.spots >= 8) return; c.spots++; Sound.tick(); const g = chG(); parts.burst(g.px, g.pb - 2 * g.u, { count: 5, colors: ['#4d7c0f', '#65a30d'], speed: 28, life: 0.4, gravity: 0, size: 2.5 }); if (c.spots === 5) showHint('점이 충분히 진해졌어요! 이제 용매에 담가요.', 3000); updateCtl(); }
  function chDip() {
    const c = S.ch; if (!c.ext || c.spots < 1 || c.dipped) return; c.dipped = true; c.dipT = 0; Sound.click();
    if (c.depth > 2) { c.fail = true; Sound.fail(); showHint('용매가 점보다 높아서 색소가 용매로 녹아 나갔어요! 점은 용매 위에 있어야 해요. ↺ 새 종이로 다시 해요.', 6000); }
    updateCtl();
  }
  function chDevelop() { const c = S.ch; if (!c.dipped || c.fail || c.devRun || c.devDone) return; c.devRun = true; Sound.click(); updateCtl(); }
  function chMark() { const c = S.ch; if (!c.devDone || c.marked) return; c.marked = true; c.markA = 0; Sound.success(); c.ruler.set(1); showHint('연필로 용매 전선과 띠를 표시했어요. 이제 띠를 눌러 이동 거리를 재요.', 4200); updateCtl(); }
  const chFront = () => FRONT * Math.sqrt(clamp(S.ch.dev, 0, 1));          // 원점선에서 용매 전선까지 (cm)
  const chBandD = (p) => p.rf * chFront();                                     // 띠의 이동 거리
  function chDraw(dt, t) {
    const c = S.ch, g = chG(), u = g.u;
    if (c.devRun) { c.dev = Math.min(1, c.dev + dt / (RM ? 1.5 : 8)); if (c.dev >= 1) { c.devRun = false; c.devDone = true; Sound.success(); updateCtl(); } }
    if (c.ext) c.extT = Math.min(1, c.extT + dt / 1.2);
    if (c.dipped) c.dipT = Math.min(1, c.dipT + dt / 0.9);
    if (c.devDone && !c.marked) c.fade = Math.min(1, c.fade + dt / 14); if (c.marked) c.fade = approach(c.fade, 0, dt, 6);
    c.markA = Math.min(1, c.markA + dt * 2); c.ruler.update(dt, 5);
    // 왼쪽: 작업대 (추출 → 점 찍기 → 담그기 → 전개 → 전선 표시 → 측정)
    const B = g.bench; panel(B.x, B.y, B.w, B.h, 16, '#fbfaf3');
    T(B.x + 14, B.y + 26, '🧪 실험 순서', PHONE ? 14 : 16, '#1f2d44', 'left', 800);
    const steps = [['🍃 잎 갈아 추출', c.ext], ['✏️ 점 찍기 (여러 번 겹쳐)', c.spots >= 5], ['🧴 용매에 담그기', c.dipped && !c.fail], ['⏩ 전개', c.devDone], ['✏️ 용매 전선 표시', c.marked], ['📏 띠 이동 거리 재기', Object.keys(c.meas).length === 4]];
    const sh = PHONE ? 46 : 54;
    steps.forEach((s, i) => {
      const y = B.y + 44 + i * sh, cur = steps.findIndex((q) => !q[1]) === i;
      D.roundRect(B.x + 10, y, B.w - 20, sh - 8, 12); ctx.fillStyle = s[1] ? '#e8f8ee' : cur ? '#fff6dc' : '#f4f6fa'; ctx.fill(); ctx.strokeStyle = s[1] ? '#86d19f' : cur ? '#f59e0b' : '#dbe1ea'; ctx.lineWidth = cur ? 2.5 : 1.5; ctx.stroke();
      T(B.x + 22, y + (sh - 8) / 2 + 5, (s[1] ? '✅ ' : (i + 1) + '. ') + s[0], PHONE ? 12 : 14, s[1] ? '#15803d' : '#1f2d44', 'left', 800);
    });
    // 갈기(추출액): 비커
    const ex = B.x + B.w / 2, ey = B.y + 44 + 6 * sh + (PHONE ? 8 : 12);
    ctx.save(); D.roundRect(B.x + 12, ey, 44, 52, 8); ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fill(); ctx.strokeStyle = '#8fa3ba'; ctx.lineWidth = 2; ctx.stroke(); ctx.clip(); ctx.fillStyle = C.mix('#f3f4f6', '#3f7d20', c.extT); ctx.fillRect(B.x + 12, ey + 18, 44, 40); ctx.restore();
    T(B.x + 64, ey + 22, '에탄올 추출액', 13, '#475569', 'left', 800); T(B.x + 64, ey + 42, c.ext ? '진한 초록색' : '아직 없어요', 12.5, c.ext ? '#3f6212' : '#94a3b8', 'left', 700);
    // 오른쪽: 종이와 병
    const px = g.px, pb = g.pb, pw = g.pw, ph = g.ph * u, jw = g.jarW, jh = 14.6 * u;
    const dipOff = (1 - ease.outCubic(c.dipT)) * 52;                  // 담그기 전에는 위로 들려 있어요
    const jx = px - jw / 2, jb = pb + 8, jy = jb - jh;
    // 병 (뒤)
    ctx.save(); D.roundRect(jx, jy, jw, jh, 14); ctx.fillStyle = 'rgba(226,240,251,.5)'; ctx.fill(); ctx.restore();
    // 용매
    const lvl = c.depth * u;
    const solvTop = jb - 6 - lvl;
    ctx.save(); D.roundRect(jx + 3, jy + 3, jw - 6, jh - 6, 12); ctx.clip(); const sg = ctx.createLinearGradient(0, solvTop, 0, jb); sg.addColorStop(0, 'rgba(186,230,253,.75)'); sg.addColorStop(1, 'rgba(125,190,235,.8)'); ctx.fillStyle = sg; ctx.fillRect(jx, solvTop, jw, jb - solvTop); ctx.restore();
    // 종이
    const paperBottom = jb - 6 - dipOff, py0 = paperBottom - ph;
    const yAt = (cm) => paperBottom - cm * u;    // 종이 아래 끝에서 cm 위
    ctx.save(); D.shadow(() => { ctx.fillStyle = '#fffef9'; ctx.fillRect(px - pw / 2, py0, pw, ph); }, { blur: 4, y: 1 });
    ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1.5; ctx.strokeRect(px - pw / 2, py0, pw, ph);
    // 젖은 부분 (전선 아래)
    const frontCm = 2 + (c.dipped && !c.fail ? chFront() : 0);
    if (c.dipped && !c.fail) { const wy = yAt(frontCm); const wg = ctx.createLinearGradient(0, wy, 0, paperBottom); wg.addColorStop(0, 'rgba(147,197,253,.5)'); wg.addColorStop(1, 'rgba(147,197,253,.18)'); ctx.fillStyle = wg; ctx.fillRect(px - pw / 2 + 1, wy, pw - 2, paperBottom - wy); }
    ctx.restore();
    // 원점선 (연필, 아래에서 2 cm)
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 1.6; ctx.setLineDash([5, 3]); ctx.beginPath(); ctx.moveTo(px - pw / 2 + 4, yAt(2)); ctx.lineTo(px + pw / 2 - 4, yAt(2)); ctx.stroke(); ctx.setLineDash([]);
    // 점 · 띠
    const inten = clamp(c.spots / 6, 0, 1);
    if (!c.fail) {
      if (c.spots > 0 && !(c.dev > 0.02)) { const r = 4 + c.spots * 0.9; ctx.save(); ctx.globalAlpha = 0.25 + 0.75 * inten; D.glow(px, yAt(2), r * 2.4, '#3f7d20', 0.8); ctx.fillStyle = '#2f6a1c'; ctx.beginPath(); ctx.ellipse(px, yAt(2), pw * 0.26, r * 0.62, 0, 0, TAU); ctx.fill(); ctx.restore(); }
      if (c.dev > 0.02) {
        const f = chFront(); const sep = clamp(c.dev * 1.8, 0, 1);
        PIG.forEach((p) => {
          const d = chBandD(p), y = yAt(2 + d), bh = (0.45 + 0.18 * (1 - sep)) * u; const fadeA = 1 - 0.55 * c.fade;
          ctx.save(); ctx.globalAlpha = (0.2 + 0.8 * inten) * fadeA * (0.35 + 0.65 * sep); ctx.fillStyle = p.col; ctx.beginPath(); ctx.ellipse(px, y, pw * 0.34, bh, 0, 0, TAU); ctx.fill(); ctx.restore();
          if (c.marked) { const hot = c.meas[p.id]; ctx.save(); ctx.strokeStyle = hot ? '#15803d' : '#334155'; ctx.lineWidth = hot ? 2.5 : 1.4; ctx.beginPath(); ctx.ellipse(px, y, pw * 0.4, bh + 3, 0, 0, TAU); ctx.stroke(); ctx.restore(); }
        });
        // 용매 전선
        const fy = yAt(2 + f); ctx.save(); ctx.globalAlpha = c.marked ? 1 : 0.85 * (1 - 0.6 * c.fade); ctx.strokeStyle = c.marked ? '#7c3aed' : '#60a5fa'; ctx.lineWidth = c.marked ? 2.4 : 3; ctx.setLineDash(c.marked ? [] : [6, 3]); ctx.beginPath(); ctx.moveTo(px - pw / 2, fy); ctx.lineTo(px + pw / 2, fy); ctx.stroke(); ctx.restore();
        if (c.marked) T(px + pw / 2 + 8, fy + 4, '용매 전선', 12.5, '#7c3aed', 'left', 800);
      }
    } else { ctx.save(); ctx.globalAlpha = 0.7; ctx.fillStyle = '#4d7c0f'; ctx.fillRect(px - pw / 2 + 1, yAt(c.depth + 0.0) - 2, pw - 2, 6); ctx.restore(); }
    // 병 (앞) · 뚜껑
    ctx.save(); D.roundRect(jx, jy, jw, jh, 14); ctx.strokeStyle = '#8fa3ba'; ctx.lineWidth = 3; ctx.stroke(); ctx.restore();
    if (c.dipped) { D.roundRect(jx - 5, jy - 8, jw + 10, 11, 5); ctx.fillStyle = '#94a3b8'; ctx.fill(); }
    T(px, jb + 20, '전개 용매 (석유 에터 : 아세톤 = 9 : 1)', PHONE ? 11.5 : 13, '#475569', 'center', 800);
    // 용매 높이 표시
    ctx.save(); ctx.setLineDash([4, 3]); ctx.strokeStyle = '#2563eb'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(jx + jw + 4, solvTop); ctx.lineTo(jx + jw + 26, solvTop); ctx.stroke(); ctx.restore();
    T(jx + jw + 30, solvTop + 4, '용매 ' + c.depth + ' cm', PHONE ? 11.5 : 12.5, '#2563eb', 'left', 800);
    // 눈금자 (전선 표시 후)
    const rl = c.ruler.v;
    if (rl > 0.02) {
      const rx = px - pw / 2 - (PHONE ? 26 : 34);
      ctx.save(); ctx.globalAlpha = rl; D.roundRect(rx - 14, yAt(14.6), 24, 13.2 * u, 5); ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fill(); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5; ctx.stroke();
      for (let k = 0; k <= 12; k++) { const y = yAt(2 + k); ctx.strokeStyle = '#475569'; ctx.lineWidth = k % 2 ? 1 : 1.8; ctx.beginPath(); ctx.moveTo(rx + 10, y); ctx.lineTo(rx + 10 - (k % 2 ? 6 : 11), y); ctx.stroke(); if (k % 2 === 0 && k > 0) T(rx - 15, y + 4, String(k), 11, '#334155', 'right', 700); }
      ctx.restore(); T(rx - 10, yAt(2) + 17, '0', 11, '#334155', 'center', 800); T(rx + 2, yAt(12.8), 'cm', 11.5, '#334155', 'center', 800);
    }
    // 측정 표
    const MT = PHONE ? { x: px + 44, y: 24 } : { x: px + 84, y: 40 };
    if (c.marked) {
      T(MT.x, MT.y + 4, '띠를 눌러 재요', PHONE ? 12.5 : 14, '#475569', 'left', 800);
      PIG.forEach((p, i) => { const y = MT.y + 28 + i * (PHONE ? 22 : 26); D.sphere(MT.x + 8, y - 4, 7, p.col, { gloss: false }); T(MT.x + 22, y, p.name, PHONE ? 12 : 13.5, '#334155', 'left', 700); T(MT.x + (PHONE ? 84 : 104), y, c.meas[p.id] ? fix1(p.dist) + ' cm' : '?', PHONE ? 12.5 : 14, c.meas[p.id] ? '#15803d' : '#94a3b8', 'left', 800); });
      T(MT.x, MT.y + 28 + 4 * (PHONE ? 22 : 26) + 4, '용매 ' + fix1(FRONT) + ' cm', PHONE ? 12.5 : 14, '#7c3aed', 'left', 800);
    }
    // 시간표시 · 안전
    if (c.devRun || c.devDone) T(g.px - (PHONE ? 20 : 0), PHONE ? 20 : 26, c.devDone ? '전개 끝: 용매 ' + fix1(FRONT) + ' cm' : '전개 중… ' + fi(c.dev * 20) + '분', PHONE ? 13 : 15, '#1f2d44', 'center', 800);
    const sy = PHONE ? 458 : 506; panel(PHONE ? 10 : 14, sy, PHONE ? 460 : 772, PHONE ? 172 : 44, 12, '#fff8e1');
    if (PHONE) { const ls = wrap('⚠ 안전 · 환경: 용매(석유 에터 · 아세톤)는 환기가 잘되는 곳에서 쓰고, 불 가까이 두지 않아요. 보안경을 쓰고 뚜껑을 닫아요. 폐액은 따로 모아 버려요. 점은 용매에 잠기지 않게 해요.', 436, 12.5, 700); ls.forEach((l, k) => T(22, sy + 24 + k * 18, l, 12.5, '#92400e', 'left', 700)); }
    else T(26, sy + 27, '⚠ 안전 · 환경: 용매는 환기가 잘되는 곳에서, 불 가까이 두지 않고 보안경을 써요. 폐액은 따로 모아 버려요.', 13.5, '#92400e', 'left', 700);
  }
  const chPT = {
    down(p) {
      const c = S.ch, g = chG(); if (!c.marked) return false;
      PIG.forEach((q) => { const y = g.pb + 2 - (2 + chBandD(q)) * g.u; if (Math.abs(p.y - y) < 14 && Math.abs(p.x - g.px) < g.pw * 0.6) { if (!c.meas[q.id]) { c.meas[q.id] = true; Sound.success(); parts.burst(g.px, y, { count: 8, colors: [q.col, '#fff'], speed: 70, life: 0.5, gravity: 0, size: 3 }); updateCtl(); } } });
      return false;
    },
    hover(p) { const c = S.ch, g = chG(); return c.marked && Math.abs(p.x - g.px) < g.pw * 0.6 ? 'pointer' : 'default'; },
  };
  const chOK = () => S.ch.ext && S.ch.spots >= 5 && S.ch.dipped && !S.ch.fail && S.ch.devDone && S.ch.marked;

  /* =========================================================
     ③ 구조와 기능: 2D 단면과 기능 카드
     ========================================================= */
  const FUN = {
    a: { t: '물질 출입 조절', long: '이중막이 물질의 출입을 조절해요' },
    b: { t: '빛 흡수 · 전자 전달 · ATP 합성', long: '색소가 박힌 틸라코이드 막에서 명반응이 일어나요' },
    c: { t: '막 표면적을 넓혀 빛 흡수 효율 높임', long: '틸라코이드가 쌓여 막 표면적이 넓어져 색소와 효소가 많이 들어가요' },
    d: { t: '효소로 CO₂ 에서 포도당 합성', long: '스트로마의 효소가 CO₂ 로 포도당을 만드는 탄소 고정 반응을 해요' },
    e: { t: '만든 양분을 녹말로 임시 저장', long: '남는 포도당을 녹말 알갱이로 잠시 저장해요' },
  };
  const PINS = [
    { id: 'p1', name: '외막 · 내막', ans: 'a' }, { id: 'p2', name: '틸라코이드 막', ans: 'b' }, { id: 'p3', name: '그라나', ans: 'c' }, { id: 'p4', name: '스트로마', ans: 'd' }, { id: 'p5', name: '녹말 알갱이', ans: 'e' },
  ];
  S.fn = { sel: PINS.map(() => ''), chk: false, on: PINS.map(() => new Num(0)), hit: -1 };
  const fnVal = (i) => S.fn.sel[i];
  const fnOK = (i) => fnVal(i) === PINS[i].ans;
  const fnCnt = () => PINS.filter((_, i) => fnOK(i)).length;
  /* 2D 단면 엽록체: k 배율, opts.N: 그라나 판 수들, opts.starch: 녹말 반지름들 */
  const XS = [-74, -42, -8, 28, 62];
  function chloro2D(cx, cy, k, o) {
    o = o || {}; const N = o.N || [5, 6, 5, 6, 4], st = o.starch || [8, 9], A = CA * k, B = CB * k;
    D.shadow(() => { ctx.beginPath(); ctx.ellipse(cx, cy, A, B, 0, 0, TAU); ctx.fillStyle = '#f2d9b5'; ctx.fill(); }, { blur: 8, y: 3 });
    ctx.beginPath(); ctx.ellipse(cx, cy, A, B, 0, 0, TAU); ctx.strokeStyle = '#a8561f'; ctx.lineWidth = 4 * Math.max(0.8, k / 1.5); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(cx, cy, A * KI, B * KI, 0, 0, TAU); const g = ctx.createRadialGradient(cx - A * 0.3, cy - B * 0.3, 8, cx, cy, A); g.addColorStop(0, '#f4fbdc'); g.addColorStop(1, '#cfe9a0'); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = '#c2255c'; ctx.lineWidth = 3 * Math.max(0.8, k / 1.5); ctx.stroke();
    if (o.stroma) { ctx.save(); ctx.globalAlpha = 0.5 + 0.2 * Math.sin(clock * 3); ctx.beginPath(); ctx.ellipse(cx, cy, A * KI, B * KI, 0, 0, TAU); ctx.fillStyle = 'rgba(190,230,90,.55)'; ctx.fill(); ctx.restore(); }
    // 스트로마 틸라코이드 (그라나 사이를 잇는 막)
    ctx.strokeStyle = '#0d9488'; ctx.lineWidth = 3.2 * k; ctx.lineCap = 'round';
    for (let i = 0; i < XS.length - 1; i++) { const y = cy + (i % 2 ? 7 : -7) * k; ctx.beginPath(); ctx.moveTo(cx + XS[i] * k, y); ctx.lineTo(cx + XS[i + 1] * k, y); ctx.stroke(); }
    // 그라나
    XS.forEach((x, i) => {
      const n = N[i], hh = (n - 1) * DS * k / 2;
      for (let j = 0; j < n; j++) {
        const yy = cy - hh + j * DS * k, w = DR * 2 * k * (o.hiGr === true ? 1.0 : 1), h = DT * k;
        D.roundRect(cx + x * k - w / 2, yy - h / 2, w, h, h / 2); ctx.fillStyle = o.lumen ? '#fde68a' : '#16a34a'; ctx.fill(); ctx.strokeStyle = '#14532d'; ctx.lineWidth = Math.max(1.2, 1.6 * k / 1.5); ctx.stroke();
      }
    });
    // 녹말 · 리보솜 · DNA
    const sp = [[-60, 36], [60, -38]];
    st.forEach((r, i) => { if (i < 2 && r > 0.3) D.sphere(cx + sp[i][0] * k, cy + sp[i][1] * k, r * k, '#f1f5f9', { gloss: true, outline: '#94a3b8' }); });
    [[-95, -6], [95, -4], [-52, -40], [0, -40], [0, 40], [48, 36], [-96, 16], [96, 14], [30, -44]].forEach((q) => { D.sphere(cx + q[0] * k, cy + q[1] * k, 2.6 * Math.max(1, k * 0.8), '#7c3aed', { gloss: false }); });
    ctx.strokeStyle = '#1d4ed8'; ctx.lineWidth = 2.4; ctx.beginPath(); for (let j = 0; j <= 30; j++) { const f = j / 30 * TAU, r = 8 * k + 1.4 * k * Math.sin(3 * f); const x = cx - 24 * k + r * Math.cos(f), y = cy + 34 * k + r * Math.sin(f) * 0.9; if (j) ctx.lineTo(x, y); else ctx.moveTo(x, y); } ctx.stroke();
  }
  function pinPos(i, cx, cy, k) {
    return [[-93.6 * k, -36.3 * k], [XS[3] * k + DR * k + 10, -12.9 * k], [XS[1] * k, -21.5 * k - 18 * k], [88 * k, 8 * k], [-60 * k, 36 * k]].map((q) => [cx + q[0], cy + q[1]])[i];
  }
  function fnG() {
    if (PHONE) return { cx: 240, cy: 176, k: 1.75, L: { x: 10, y: 330, w: 460, h: 300 } };
    return { cx: 290, cy: 220, k: 2.1, L: { x: 560, y: 14, w: 226, h: 532 } };
  }
  function fnDraw(dt, t) {
    const f = S.fn, g = fnG(), k = g.k, cx = g.cx, cy = g.cy;
    PINS.forEach((p, i) => { f.on[i].set(fnOK(i) ? 1 : 0); f.on[i].update(dt, 4); });
    const starchR = [7 + 3.5 * f.on[4].v, 8 + 3.5 * f.on[4].v];
    chloro2D(cx, cy, k, { starch: starchR, stroma: f.on[3].v > 0.5 });
    // 기능 효과
    if (f.on[0].v > 0.02) { ctx.save(); ctx.globalAlpha = f.on[0].v; const a = CA * k, b = CB * k; for (let i = 0; i < 4; i++) { const u = ((t * 0.5 + i / 4) % 1), ang = -2.6 + i * 0.5, ex = cx + Math.cos(ang) * a * 1.0, ey = cy + Math.sin(ang) * b * 1.0, nx = Math.cos(ang) * 0.9, ny = Math.sin(ang) * 0.9; D.arrow(ex + nx * 26, ey + ny * 26 - 6, ex - nx * 18, ey - ny * 18, { color: '#a8561f', width: 3, head: 9, alpha: 0.9 * Math.sin(u * Math.PI) }); } ctx.restore(); }
    if (f.on[1].v > 0.02) { ctx.save(); ctx.globalAlpha = f.on[1].v; for (let i = 0; i < 3; i++) { const u = ((t * 0.6 + i / 3) % 1), x0 = cx + (XS[2] - 60 + i * 30) * k, y0 = cy - 120 * k * 0.55; D.arrow(x0 - 30, y0 - 30 + u * 30, x0 + 6, y0 + 8 + u * 30, { color: '#f59e0b', width: 3.5, head: 10, alpha: 0.9 }); } D.glow(cx + XS[3] * k, cy, 38 * k, '#fde047', 0.35 + 0.2 * Math.sin(t * 5)); ctx.restore(); T(cx + XS[3] * k, cy + CB * k * 0.82, 'e⁻ → ATP', 13.5, '#92400e', 'center', 800); }
    if (f.on[2].v > 0.02) { ctx.save(); ctx.globalAlpha = f.on[2].v; const x = cx + XS[1] * k, hh = 5 * DS * k / 2; ctx.strokeStyle = '#16a34a'; ctx.setLineDash([5, 4]); ctx.lineWidth = 2.5; D.roundRect(x - DR * k - 6, cy - hh - 8, DR * 2 * k + 12, hh * 2 + 16, 8); ctx.stroke(); ctx.setLineDash([]); ctx.restore(); T(x, cy - hh - 14, '표면적 ↑', 13, '#15803d', 'center', 800); }
    if (f.on[3].v > 0.02) { ctx.save(); ctx.globalAlpha = f.on[3].v; const sx0 = cx + 88 * k, sy0 = cy + 8 * k; for (let i = 0; i < 6; i++) { const u = (t * 0.4 + i / 6) % 1, ang = i / 6 * TAU, r = 30 * k * (1 - u) + 6; ctx.globalAlpha = f.on[3].v * Math.sin(u * Math.PI); D.sphere(sx0 + Math.cos(ang) * r, sy0 + Math.sin(ang) * r, 3.6, '#94a3b8', { gloss: false }); } ctx.globalAlpha = f.on[3].v; T(sx0, sy0 + 34 * k, 'CO₂ 6개 → 포도당(6탄소)', 12.5, '#3f6212', 'center', 800); ctx.restore(); }
    // 핀
    PINS.forEach((p, i) => {
      const q = pinPos(i, cx, cy, k), ok = fnOK(i), bad = f.chk && fnVal(i) !== '' && !ok, r = 14;
      ctx.save(); D.shadow(() => { ctx.fillStyle = ok ? '#dcfce7' : bad ? '#fee2e2' : '#fff'; ctx.beginPath(); ctx.arc(q[0], q[1], r, 0, TAU); ctx.fill(); }, { blur: 5, y: 2 });
      ctx.strokeStyle = ok ? '#16a34a' : bad ? '#e2464b' : '#334155'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(q[0], q[1], r, 0, TAU); ctx.stroke(); ctx.restore();
      T(q[0], q[1] + 5.5, '①②③④⑤'[i], 17, ok ? '#15803d' : bad ? '#b91c1c' : '#1f2d44', 'center', 800);
      D.label(q[0], q[1] + (i === 0 ? -26 : 28), p.name, { bg: '#fff', color: '#334155', border: '#cbd5e1', size: PHONE ? 12.5 : 13.5 });
    });
    // 기능 카드 목록
    const L2 = g.L; panel(L2.x, L2.y, L2.w, L2.h, 16, '#fff');
    T(L2.x + 12, L2.y + 26, '기능 카드', 15, '#1f2d44', 'left', 800);
    Object.keys(FUN).forEach((id, i) => {
      const y = L2.y + 40 + i * ((L2.h - 52) / 5), hh = (L2.h - 52) / 5 - 8, used = PINS.findIndex((p, q) => fnVal(q) === id && fnOK(q)) >= 0;
      D.roundRect(L2.x + 8, y, L2.w - 16, hh, 10); ctx.fillStyle = used ? '#e8f8ee' : '#f6f7fa'; ctx.fill(); ctx.strokeStyle = used ? '#86d19f' : '#dbe1ea'; ctx.lineWidth = 1.5; ctx.stroke();
      T(L2.x + 18, y + 22, id.toUpperCase(), 15, used ? '#15803d' : '#475569', 'left', 800);
      const ls = wrap(FUN[id].t, L2.w - 62, PHONE ? 12.5 : 12.5, 700).slice(0, 3); ls.forEach((l, q) => T(L2.x + 42, y + 20 + q * 15, l, 12.5, '#1f2d44', 'left', 700));
    });
    if (!PHONE) {
      const bx = 14, by = 410, bw = 536; panel(bx, by, bw, 128, 14, '#fffdf6');
      const done = PINS.map((p, i) => [p, i]).filter(([p, i]) => fnOK(i));
      if (!done.length) T(bx + 16, by + 30, '핀 ①~⑤의 기능을 오른쪽 목록(카드 A~E)에서 골라 보세요.', 14, '#64748b', 'left', 800);
      else done.forEach(([p, i], q) => T(bx + 16, by + 26 + q * 22, '①②③④⑤'[i] + ' ' + p.name + ': ' + FUN[p.ans].long, 13, '#1f2d44', 'left', 700));
    }
  }

  /* =========================================================
     ③ 흡수 스펙트럼
     ========================================================= */
  const gau = (x, m, s) => Math.exp(-((x - m) * (x - m)) / (2 * s * s));
  const aChl = (x) => clamp(0.95 * gau(x, 430, 16) + 0.3 * gau(x, 412, 9) + 0.78 * gau(x, 662, 16) + 0.1 * gau(x, 600, 45), 0, 1);
  const aChb = (x) => clamp(0.9 * gau(x, 455, 16) + 0.5 * gau(x, 645, 17) + 0.06 * gau(x, 560, 50), 0, 1);
  const aCar = (x) => clamp(0.55 * gau(x, 425, 14) + 0.8 * gau(x, 450, 16) + 0.7 * gau(x, 480, 16) + 0.08 * gau(x, 515, 18), 0, 1);
  const aLeaf = (x) => clamp(0.62 * aChl(x) + 0.21 * aChb(x) + 0.3 * aCar(x) + 0.05, 0, 1);
  const LAMP = {
    sun: { name: '햇빛(백색)', f: () => 1, col: '#f59e0b' },
    rb: { name: '적색 + 청색 LED', f: (x) => gau(x, 450, 11) + gau(x, 660, 11), col: '#7c3aed' },
    g: { name: '녹색 LED', f: (x) => gau(x, 525, 13), col: '#16a34a' },
  };
  const lampAbs = (id) => { let n = 0, d = 0; for (let x = 400; x <= 700; x++) { const l = LAMP[id].f(x); n += l * aLeaf(x); d += l; } return d ? n / d : 0; };
  const LAMPV = {}; Object.keys(LAMP).forEach((k) => { LAMPV[k] = Math.round(lampAbs(k) * 100); });
  const wlColor = (x) => {
    let r = 0, g = 0, b = 0;
    if (x < 440) { r = -(x - 440) / 40; b = 1; } else if (x < 490) { g = (x - 440) / 50; b = 1; } else if (x < 510) { g = 1; b = -(x - 510) / 20; } else if (x < 580) { r = (x - 510) / 70; g = 1; } else if (x < 645) { r = 1; g = -(x - 645) / 65; } else r = 1;
    const f = x < 420 ? 0.5 + 0.5 * (x - 400) / 20 : x > 680 ? 0.5 + 0.5 * (700 - x) / 20 : 1;
    return 'rgb(' + Math.round(255 * Math.pow(r * f, 0.8)) + ',' + Math.round(255 * Math.pow(g * f, 0.8)) + ',' + Math.round(255 * Math.pow(b * f, 0.8)) + ')';
  };
  const wlName = (x) => (x < 450 ? '청자색' : x < 495 ? '청색' : x < 570 ? '녹색' : x < 590 ? '황색' : x < 620 ? '주황색' : '적색');
  S.sp = { wl: 480, lamp: 'sun', mk: { blue: null, red: null }, drag: false, bar: new Num(0) };
  function spG() {
    if (PHONE) return { P: { x: 10, y: 10, w: 460, h: 306 }, I: { x: 10, y: 324, w: 460, h: 306 } };
    return { P: { x: 14, y: 14, w: 772, h: 340 }, I: { x: 14, y: 362, w: 772, h: 184 } };
  }
  function spPlot() { const g = spG(); return mkPlot(g.P, { x0: 400, x1: 700, y0: 0, y1: 1, xt: [400, 450, 500, 550, 600, 650, 700], yt: [0, 0.5, 1], xl: '파장 (nm)', yl: '상대 흡수', m: { l: 50, t: 58, r: 18, b: 52 } }); }
  function spDraw(dt, t) {
    const s = S.sp, g = spG(), pl = spPlot();
    s.bar.update(dt, 4);
    panel(g.P.x, g.P.y, g.P.w, g.P.h, 16, '#fff');
    // 스펙트럼 띠
    const sg = ctx.createLinearGradient(pl.x, 0, pl.x + pl.w, 0); for (let x = 400; x <= 700; x += 20) sg.addColorStop((x - 400) / 300, wlColor(x));
    D.roundRect(pl.x, pl.y + pl.h + 22, pl.w, 12, 6); ctx.fillStyle = sg; ctx.fill();
    drawAxes(pl);
    // 램프 분포
    const lp = LAMP[s.lamp]; ctx.save(); ctx.beginPath(); ctx.moveTo(pl.X(400), pl.Y(0)); for (let x = 400; x <= 700; x += 2) ctx.lineTo(pl.X(x), pl.Y(0.9 * clamp(lp.f(x), 0, 1))); ctx.lineTo(pl.X(700), pl.Y(0)); ctx.closePath(); ctx.globalAlpha = 0.16; ctx.fillStyle = lp.col; ctx.fill(); ctx.restore();
    const curves = [['엽록소 a', aChl, '#0d9488', 4], ['엽록소 b', aChb, '#65a30d', 3], ['카로티노이드', aCar, '#f59e0b', 3], ['잎 전체', aLeaf, '#334155', 2]];
    curves.forEach(([n, fn, col, w], ci) => { ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineJoin = 'round'; if (ci === 3) ctx.setLineDash([6, 4]); ctx.beginPath(); for (let x = 400; x <= 700; x += 2) { const px = pl.X(x), py = pl.Y(fn(x)); if (x === 400) ctx.moveTo(px, py); else ctx.lineTo(px, py); } ctx.stroke(); ctx.restore(); });
    // 범례
    curves.forEach(([n, , col], i) => { const lx = pl.x + (PHONE ? 70 + (i % 2) * 126 : 100 + i * 148), ly = 0, lyy = pl.y - 36; ctx.strokeStyle = col; ctx.lineWidth = 4; if (i === 3) ctx.setLineDash([5, 3]); ctx.beginPath(); ctx.moveTo(lx, lyy + (PHONE ? Math.floor(i / 2) * 16 : 0)); ctx.lineTo(lx + 16, lyy + (PHONE ? Math.floor(i / 2) * 16 : 0)); ctx.stroke(); ctx.setLineDash([]); T(lx + 22, lyy + 5 + (PHONE ? Math.floor(i / 2) * 16 : 0), n, PHONE ? 12 : 13, '#475569', 'left', 800); });
    // 표시한 봉우리
    [['blue', '청자색 봉우리'], ['red', '적색 봉우리']].forEach(([k, label]) => { const w = s.mk[k]; if (w == null) return; const x = pl.X(w), y = pl.Y(aChl(w)); D.ring(x, y, 12, clock, { color: '#16a34a', width: 3 }); D.sphere(x, y, 5, '#16a34a', { gloss: false }); D.label(x, y - 22, label + ' ' + w + ' nm', { bg: '#16a34a', color: '#fff', size: 12.5 }); });
    // 커서
    const cx = pl.X(s.wl); ctx.save(); ctx.strokeStyle = '#1f2d44'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx, pl.y); ctx.lineTo(cx, pl.y + pl.h + 38); ctx.stroke(); ctx.restore();
    D.sphere(cx, pl.y + pl.h + 28, 9, wlColor(s.wl), { gloss: true, outline: '#1f2d44', outlineWidth: 2 });
    // 아래: 잎과 빛
    const I = g.I; panel(I.x, I.y, I.w, I.h, 16, '#fff');
    const a = aLeaf(s.wl), ac = aChl(s.wl), ab = aChb(s.wl), ar = aCar(s.wl), ia = Math.round(a * 100);
    const lx = I.x + (PHONE ? 30 : 56), ly = I.y + (PHONE ? 78 : 84);
    // 잎
    ctx.save(); ctx.translate(lx + (PHONE ? 70 : 90), ly + 36); ctx.rotate(-0.1); ctx.beginPath(); ctx.ellipse(0, 0, PHONE ? 62 : 80, PHONE ? 20 : 24, 0, 0, TAU); const lg = ctx.createLinearGradient(-60, 0, 60, 0); lg.addColorStop(0, '#4ade80'); lg.addColorStop(1, '#16a34a'); ctx.fillStyle = lg; ctx.fill(); ctx.strokeStyle = '#14532d'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
    T(lx + (PHONE ? 70 : 90), ly + (PHONE ? 78 : 80), '잎에 ' + wlName(s.wl) + ' 빛을 비춰요', 12.5, '#475569', 'center', 800);
    D.arrow(lx, ly - 40, lx + (PHONE ? 66 : 84), ly + 14, { color: wlColor(s.wl), width: 7, head: 16 });
    T(lx - 4, ly - 46, s.wl + ' nm', 13.5, '#1f2d44', 'left', 800);
    D.arrow(lx + (PHONE ? 74 : 94), ly + 12, lx + (PHONE ? 140 : 180), ly - 40, { color: wlColor(s.wl), width: Math.max(1.5, 7 * (1 - a)), head: 12, alpha: 0.35 + 0.65 * (1 - a) });
    T(lx + (PHONE ? 100 : 150), ly - 46, '반사 · 투과 ' + (100 - ia) + ' %', 13, '#475569', 'left', 800);
    T(lx + (PHONE ? 150 : 200), ly + 40, '흡수 ' + ia + ' %', 16, ia >= 50 ? '#15803d' : '#b91c1c', 'left', 800);
    // 색소별 값
    const bx = I.x + (PHONE ? 20 : 350), by = I.y + (PHONE ? 142 : 36), bw = PHONE ? I.w - 40 : 190;
    [['엽록소 a', ac, '#0d9488'], ['엽록소 b', ab, '#65a30d'], ['카로티노이드', ar, '#f59e0b']].forEach(([n, v, col], i) => { const y = by + i * 24; T(bx, y + 5, n, 13, '#334155', 'left', 800); D.roundRect(bx + 94, y - 8, bw - 94 - 36, 16, 8); ctx.fillStyle = '#eef2f7'; ctx.fill(); if (v > 0.01) { D.roundRect(bx + 94, y - 8, Math.max(6, (bw - 94 - 36) * v), 16, 8); ctx.fillStyle = col; ctx.fill(); } T(bx + bw - 28, y + 5, fi(v * 100), 13, '#1f2d44', 'left', 800); });
    // 램프별 흡수율
    const rx = I.x + (PHONE ? 20 : 570), ry = I.y + (PHONE ? 220 : 26), rw = PHONE ? I.w - 40 : 196;
    T(rx, ry - 2, '잎이 흡수하는 빛의 비율', 13.5, '#1f2d44', 'left', 800);
    Object.keys(LAMP).forEach((id, i) => { const y = ry + 26 + i * (PHONE ? 24 : 36), on = s.lamp === id; T(rx, y + 5, LAMP[id].name, PHONE ? 12 : 12.5, on ? '#1f2d44' : '#94a3b8', 'left', 800); D.roundRect(rx + (PHONE ? 130 : 110), y - 8, rw - (PHONE ? 130 : 110) - 40, 16, 8); ctx.fillStyle = '#eef2f7'; ctx.fill(); const w = (rw - (PHONE ? 130 : 110) - 40) * LAMPV[id] / 100; if (w > 1) { ctx.save(); ctx.globalAlpha = on ? 1 : 0.4; D.roundRect(rx + (PHONE ? 130 : 110), y - 8, Math.max(8, w), 16, 8); ctx.fillStyle = LAMP[id].col; ctx.fill(); ctx.restore(); } T(rx + rw - 34, y + 5, LAMPV[id] + ' %', 13, on ? '#1f2d44' : '#94a3b8', 'left', 800); });
  }
  const spPT = {
    down(p) { const s = S.sp, pl = spPlot(); if (p.x >= pl.x - 10 && p.x <= pl.x + pl.w + 10 && p.y >= pl.y - 10 && p.y <= pl.y + pl.h + 44) { s.drag = true; spSet(Math.round(400 + (p.x - pl.x) / pl.w * 300)); return true; } return false; },
    move(p) { const s = S.sp, pl = spPlot(); if (s.drag) spSet(Math.round(400 + (p.x - pl.x) / pl.w * 300)); }, up() { S.sp.drag = false; },
    hover(p) { const pl = spPlot(); return p.x >= pl.x && p.x <= pl.x + pl.w && p.y >= pl.y && p.y <= pl.y + pl.h + 44 ? 'ew-resize' : 'default'; },
  };
  function spSet(w) { S.sp.wl = clamp(w, 400, 700); $('#spL').value = S.sp.wl; updateCtl(); }
  function spMark() {
    const s = S.sp, w = s.wl;
    if (w >= 420 && w <= 450 && s.mk.blue == null) { s.mk.blue = w; Sound.success(); parts.burst(spPlot().X(w), spPlot().Y(aChl(w)), { count: 10, colors: ['#0d9488', '#fff'], speed: 90, life: 0.6 }); }
    else if (w >= 650 && w <= 680 && s.mk.red == null) { s.mk.red = w; Sound.success(); parts.burst(spPlot().X(w), spPlot().Y(aChl(w)), { count: 10, colors: ['#0d9488', '#fff'], speed: 90, life: 0.6 }); }
    else { Sound.fail(); showHint('엽록소 a 곡선이 가장 높은 곳에 맞춰 보세요. (청자색 쪽과 적색 쪽 두 곳)', 3000); }
    updateCtl();
  }

  /* =========================================================
     ④ 추론하기: 상황 4개
     ========================================================= */
  const SIT = [
    { id: 'aut', name: '🍁 가을 단풍' }, { id: 'shade', name: '🌿 그늘 잎' }, { id: 'dark', name: '🌑 어둠' }, { id: 'sea', name: '🌊 붉은 해조류' },
  ];
  S.fi = { sit: 0, aut: { cha: false, chb: false, xan: false, car: false }, shade: { gr: '', b: '' }, dark: { st: '' }, sea: { l: '', p: '' }, anim: PIG.map(() => new Num(1)), starch: new Num(1), grM: new Num(0), chk: false, solved: [false, false, false, false] };
  const fiOk = [
    () => { const a = S.fi.aut; return a.cha && a.chb && !a.xan && !a.car; },
    () => S.fi.shade.gr === 'more' && S.fi.shade.b === 'more',
    () => S.fi.dark.st === 'less',
    () => S.fi.sea.l === 'gb' && S.fi.sea.p === 'aux',
  ];
  const fiN = () => fiOk.filter((f) => f()).length;
  function fiG() { return PHONE ? { P: { x: 10, y: 10, w: 460, h: 620 } } : { P: { x: 14, y: 14, w: 772, h: 532 } }; }
  function strip(x, y, w, h, faint, label) {
    D.roundRect(x, y, w, h, 8); ctx.fillStyle = '#fffef9'; ctx.fill(); ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1.5; ctx.stroke();
    PIG.forEach((p, i) => { const yy = y + h - 20 - p.rf * (h - 40); ctx.save(); ctx.globalAlpha = 0.25 + 0.75 * faint[i]; ctx.fillStyle = p.col; ctx.beginPath(); ctx.ellipse(x + w / 2, yy, w * 0.34, 7, 0, 0, TAU); ctx.fill(); ctx.restore(); });
    T(x + w / 2, y + h + 20, label, 13.5, '#334155', 'center', 800);
  }
  function fiDraw(dt, t) {
    const f = S.fi, g = fiG(), P = g.P; panel(P.x, P.y, P.w, P.h, 16, '#fff');
    for (let i = 0; i < 4; i++) { const on = fiOk[i](); const x = P.x + P.w - 20 - (3 - i) * 24; D.sphere(x, P.y + 24, 8, on ? '#16a34a' : '#cbd5e1', { gloss: false }); }
    T(P.x + 16, P.y + 28, SIT[f.sit].name, PHONE ? 15 : 17, '#1f2d44', 'left', 800);
    const sx = P.x, sy = P.y;
    if (f.sit === 0) {
      const keys = ['car', 'xan', 'cha', 'chb'];
      keys.forEach((k, i) => f.anim[i].set(f.aut[k] ? 0 : 1)); f.anim.forEach((n) => n.update(dt, 4));
      const w = PHONE ? 110 : 140, h = PHONE ? 270 : 300, y0 = sy + (PHONE ? 90 : 90);
      strip(sx + (PHONE ? 40 : 90), y0, w, h, [1, 1, 1, 1], '여름 잎의 색소 띠');
      strip(sx + (PHONE ? 200 : 300), y0, w, h, f.anim.map((n) => n.v), '가을 잎의 색소 띠(예측)');
      // 잎 색
      const rem = (id) => f.anim[PIG.findIndex((p) => p.id === id)].v; const green = (rem('cha') + rem('chb')) / 2, yel = (rem('car') + rem('xan')) / 2;
      const col = C.mix(C.mix('#f59e0b', '#dc2626', 0.35 * (1 - green)), '#16a34a', green * 0.9);
      ctx.save(); ctx.translate(sx + (PHONE ? 80 : 160), sy + 62); ctx.beginPath(); ctx.ellipse(0, 0, 36, 16, -0.3, 0, TAU); ctx.fillStyle = '#16a34a'; ctx.fill(); ctx.restore();
      ctx.save(); ctx.translate(sx + (PHONE ? 250 : 360), sy + 62); ctx.beginPath(); ctx.ellipse(0, 0, 36, 16, -0.3, 0, TAU); ctx.fillStyle = col; ctx.fill(); ctx.restore();
      T(sx + (PHONE ? 360 : 520), sy + 110, '단풍이 드는 까닭을', 14, '#475569', 'left', 700); T(sx + (PHONE ? 360 : 520), sy + 132, '색소의 변화로 설명해요.', 14, '#475569', 'left', 700);
      if (!PHONE) { T(sx + 520, sy + 180, '띠를 눌러 “옅어짐”으로 바꾸거나', 13.5, '#64748b', 'left', 700); T(sx + 520, sy + 202, '오른쪽 목록의 버튼을 눌러요.', 13.5, '#64748b', 'left', 700); if (fiOk[0]()) { T(sx + 520, sy + 250, '엽록소가 먼저 분해되어', 14.5, '#15803d', 'left', 800); T(sx + 520, sy + 272, '카로티노이드의 노랑 · 주황이', 14.5, '#15803d', 'left', 800); T(sx + 520, sy + 294, '드러나요. (붉은 단풍의 안토사이아닌은', 14.5, '#15803d', 'left', 800); T(sx + 520, sy + 316, '새로 합성돼요)', 14.5, '#15803d', 'left', 800); } }
      else if (fiOk[0]()) T(sx + 230, sy + 440, '엽록소가 먼저 분해되어 카로티노이드의 노랑 · 주황이 드러나요.', 12.5, '#15803d', 'center', 800);
    } else if (f.sit === 1) {
      f.grM.set(f.shade.gr === 'more' && f.shade.b === 'more' ? 1 : 0); f.grM.update(dt, 4);
const k = PHONE ? 1.3 : 1.4, y = sy + (PHONE ? 190 : 250);
      chloro2D(sx + (PHONE ? 240 : 200), y, k, { N: [3, 3, 3, 3, 2], starch: [8, 9] }); chloro2D(sx + (PHONE ? 240 : 580), y + (PHONE ? 260 : 0), k, { N: [3, 3, 3, 3, 2].map((n) => n + Math.round(f.grM.v * 3)), starch: [7, 8] });
      T(sx + (PHONE ? 240 : 200), y + CB * k + 36, '☀️ 햇빛을 잘 받는 잎', 14.5, '#334155', 'center', 800);
      T(sx + (PHONE ? 240 : 580), y + (PHONE ? 260 : 0) + CB * k + 36, '🌿 그늘에서 자란 잎', 14.5, '#334155', 'center', 800);
      T(sx + (PHONE ? 240 : 580), y + (PHONE ? 260 : 0) - CB * k - 30, f.grM.v > 0.5 ? '그라나 ↑ · 엽록소 b 비율 ↑' : '예측해 보세요', 13.5, f.grM.v > 0.5 ? '#15803d' : '#94a3b8', 'center', 800);
    } else if (f.sit === 2) {
      f.starch.set(f.dark.st === 'less' ? 0.18 : 1); f.starch.update(dt, 1.2);
      const k = PHONE ? 1.4 : 1.4, y = sy + (PHONE ? 180 : 240);
      chloro2D(sx + (PHONE ? 240 : 200), y, k, { starch: [8, 9] }); chloro2D(sx + (PHONE ? 240 : 580), y + (PHONE ? 260 : 0), k, { starch: [8 * f.starch.v, 9 * f.starch.v] });
      T(sx + (PHONE ? 240 : 200), y + CB * k + 34, '☀️ 빛이 있을 때', 14.5, '#334155', 'center', 800); T(sx + (PHONE ? 240 : 580), y + (PHONE ? 260 : 0) + CB * k + 34, '🌑 어둠에 오래 둠', 14.5, '#334155', 'center', 800);
      T(sx + (PHONE ? 240 : 580), y + (PHONE ? 260 : 0) - CB * k - 26, f.dark.st === '' ? '녹말 알갱이가 어떻게 될까요?' : f.dark.st === 'less' ? '광합성이 멈춰 양분이 쓰여요' : '다시 생각해 보세요', 13.5, f.dark.st === 'less' ? '#15803d' : '#94a3b8', 'center', 800);
    } else {
      // 바다: 깊이에 따른 빛
      const h = PHONE ? 360 : 380, x0 = sx + 24, y0 = sy + 54, w = PHONE ? 250 : 440;
      const sg = ctx.createLinearGradient(0, y0, 0, y0 + h); sg.addColorStop(0, '#bae6fd'); sg.addColorStop(1, '#0c4a6e'); D.roundRect(x0, y0, w, h, 14); ctx.fillStyle = sg; ctx.fill();
      [['적색', 0.18, '#ef4444', 80], ['녹색', 0.62, '#22c55e', 0.0], ['청색', 0.95, '#3b82f6', 0.0]].forEach(([n, pen, col], i) => { const bx = x0 + 28 + i * (w - 56) / 2.4, depth = pen * (h - 40); ctx.save(); ctx.fillStyle = col; ctx.globalAlpha = 0.85; ctx.fillRect(bx - 12, y0 + 6, 24, depth); ctx.restore(); T(bx, y0 + 6 + depth + 18, n, 12.5, '#fff', 'center', 800); });
      T(x0 + w / 2, y0 + h + 22, '깊이가 깊을수록 적색 빛은 먼저 사라져요', PHONE ? 12 : 13.5, '#475569', 'center', 800);
      const ok = fiOk[3](); const ay = y0 + h * 0.74; ctx.save(); for (let i = 0; i < 5; i++) { ctx.fillStyle = '#b91c1c'; ctx.beginPath(); ctx.ellipse(x0 + w * 0.5 + (i - 2) * 22, ay + (i % 2) * 8, 11, 17, 0.3 * (i - 2), 0, TAU); ctx.fill(); } ctx.restore();
      D.label(x0 + w * 0.5, ay - 34, '🌿 붉은 해조류', { bg: '#fff', color: '#991b1b', border: '#fca5a5', size: 13.5 });
      if (ok) { for (let i = 0; i < 3; i++) { const u = (t * 0.6 + i / 3) % 1; D.arrow(x0 + w * 0.5 - 40 + i * 40, ay - 90 + u * 40, x0 + w * 0.5 - 30 + i * 40, ay - 52 + u * 40, { color: '#22c55e', width: 3, head: 9, alpha: Math.sin(u * Math.PI) }); } }
      T(x0 + w + 18, y0 + 26, '붉은색은 녹색 빛을', PHONE ? 12 : 14, '#475569', 'left', 700); T(x0 + w + 18, y0 + 48, '반사해서 보이는 색이에요.', PHONE ? 12 : 14, '#475569', 'left', 700);
      if (ok) { T(x0 + w + 18, y0 + 100, '보조 색소(피코에리트린)가', PHONE ? 12 : 14, '#15803d', 'left', 800); T(x0 + w + 18, y0 + 122, '녹색 빛을 흡수해 엽록소 a 에', PHONE ? 12 : 14, '#15803d', 'left', 800); T(x0 + w + 18, y0 + 144, '에너지를 전달해요.', PHONE ? 12 : 14, '#15803d', 'left', 800); }
    }
  }
  const fiPT = {
    down(p) {
      const f = S.fi; if (f.sit !== 0) return false;
      const g = fiG(), P = g.P, w = PHONE ? 110 : 140, h = PHONE ? 270 : 300, y0 = P.y + 90, x1 = P.x + (PHONE ? 200 : 300);
      if (p.x >= x1 && p.x <= x1 + w && p.y >= y0 && p.y <= y0 + h) {
        const keys = ['car', 'xan', 'cha', 'chb'], rf = [0.95, 0.75, 0.6, 0.5];
        let bi = -1, bd = 22; rf.forEach((r, i) => { const yy = y0 + h - 20 - r * (h - 40); const d = Math.abs(p.y - yy); if (d < bd) { bd = d; bi = i; } });
        if (bi >= 0) { f.aut[keys[bi]] = !f.aut[keys[bi]]; Sound.click(); updateCtl(); }
      }
      return false;
    },
    hover(p) { const g = fiG(), P = g.P; return S.fi.sit === 0 && p.x >= P.x + (PHONE ? 200 : 300) && p.x <= P.x + (PHONE ? 310 : 440) ? 'pointer' : 'default'; },
  };

  /* =========================================================
     화면 전환 · 조작 연결
     ========================================================= */
  const PTS = { build: bPT, chrom: chPT, func: null, spec: spPT, infer: fiPT };
  function setMode(m) { if (S.mode !== m) S.fade = 1; S.mode = m; PT = PTS[m] || null; hideHint(); updateCtl(); }
  const ctlNodes = $$('#ctrlCard .control');
  S.nmChk = false; S.ch.rfOn = false;
  const rfName = (i) => selVal('rn' + i);
  const rfNum = (i) => numOf('rf' + i);
  const rfRowOK = (i) => rfName(i) === PIG[i].id && near(rfNum(i), rfOf(PIG[i]), 0.006);
  const measN = () => Object.keys(S.ch.meas).length;
  function updateCtl() {
    const fr = game ? game.free : false, lvNow = game ? game.level : 0, b = S.b, c = S.ch, f = S.fn, s = S.sp, fi2 = S.fi;
    ctlNodes.forEach((n) => { n.hidden = (n.dataset.modes || '').split(' ').indexOf(S.mode) < 0; });
    $$('#ctrlCard [data-grp]').forEach((n) => { const k = n.dataset.grp; n.hidden = k === 'name' ? !b.nameMode : k === 'rf' ? !(c.rfOn || fr) : false; });
    $$('#ctrlCard [data-sit]').forEach((n) => { n.hidden = +n.dataset.sit !== fi2.sit; });
    modeButtons(S.mode, lvNow, fr);
    // ① 모형
    $('#oCut').textContent = Math.round(b.sT * 100) + ' %'; $('#sCut').value = Math.round(b.sT * 100);
    $('#bNote').innerHTML = '조립한 부품 <b>' + bPlaced() + ' / 9</b> · 화면을 <b>끌면</b> 3D 모형이 돌아가요.';
    $('#bCmp').classList.toggle('on', b.cmp); $('#bCmp').textContent = b.cmp ? '⚙️ 비교 닫기' : '⚙️ 미토콘드리아와 비교';
    [0, 1, 2, 3, 4].forEach((i) => { const e = $('#nm' + i); e.classList.toggle('ok', nmOK(i)); e.classList.toggle('bad', S.nmChk && nmBad(i)); });
    // ② 크로마토그래피
    $('#chExt').disabled = c.ext; $('#chExt').textContent = c.ext ? '✔ 추출액 준비 완료' : '🍃 잎을 에탄올에 갈아 추출';
    $('#chSpot').disabled = !c.ext || c.dipped || c.spots >= 8; $('#chSpot').textContent = '✏️ 점 찍기 (' + c.spots + ' / 8)';
    chipSet($('#chDepth'), c.depth); $$('#chDepth button').forEach((x) => { x.disabled = c.dipped; });
    $('#chDip').disabled = !c.ext || c.spots < 1 || c.dipped; $('#chDev').disabled = !c.dipped || c.fail || c.devRun || c.devDone; $('#chMark').disabled = !c.devDone || c.marked;
    $('#chDev').textContent = c.devRun ? '전개 중…' : '⏩ 전개 (시간 가속)';
    $('#chNote').innerHTML = c.fail ? '<b style="color:#b91c1c">용매가 점보다 높아 색소가 녹아 나갔어요.</b> “새 종이로”를 눌러 다시 해요.' : c.marked ? '띠를 <b>눌러서</b> 이동 거리를 재요. 잰 띠 <b>' + measN() + ' / 4</b>' : c.devDone ? '전개가 끝났어요. 마르기 전에 <b>용매 전선</b>을 연필로 표시해요.' : c.spots >= 5 ? '점이 충분히 진해요. 점보다 낮은 용매에 담가요.' : '점은 <b>여러 번 겹쳐</b> 찍어야 띠가 잘 보여요. (5번 이상)';
    PIG.forEach((p, i) => { const sel = $('#rn' + i), inp = $('#rf' + i); const nOK = rfName(i) === p.id, rOK = near(rfNum(i), rfOf(p), 0.006); sel.classList.toggle('ok', nOK && rfName(i) !== ''); inp.classList.toggle('ok', rOK); });
    // ③ 구조와 기능
    PINS.forEach((p, i) => { const e = $('#fn' + i); e.classList.toggle('ok', fnOK(i)); e.classList.toggle('bad', f.chk && fnVal(i) !== '' && !fnOK(i)); });
    $('#fnNote').innerHTML = '맞힌 핀 <b>' + fnCnt() + ' / 5</b>';
    $('#spL').value = s.wl; $('#oL').textContent = s.wl + ' nm';
    chipSet($('#spLamp'), s.lamp);
    $('#spNote').innerHTML = '표시한 봉우리: ' + (s.mk.blue != null ? '✅ 청자색 ' + s.mk.blue + ' nm' : '⬜ 청자색') + ' · ' + (s.mk.red != null ? '✅ 적색 ' + s.mk.red + ' nm' : '⬜ 적색');
    // ④ 추론
    chipSet($('#fiSit'), String(fi2.sit)); $$('#fiSit button').forEach((x, i) => x.classList.toggle('seen', fiOk[i]()));
    $$('#fiAut button').forEach((x) => x.classList.toggle('on', !!fi2.aut[x.dataset.v]));
    $('#fiGr').value = fi2.shade.gr; $('#fiB').value = fi2.shade.b; $('#fiSt').value = fi2.dark.st; $('#fiL').value = fi2.sea.l; $('#fiP').value = fi2.sea.p;
    $('#fiNote').innerHTML = '푼 상황 <b>' + fiN() + ' / 4</b>';
  }
  bindModeSeg(setMode);
  $('#sCut').addEventListener('input', (e) => { S.b.sT = +e.target.value / 100; updateCtl(); });
  $('#bSpin').addEventListener('click', () => { Sound.click(); bSpin(); });
  $('#bFront').addEventListener('click', () => { Sound.click(); bFront(); });
  $('#bReset').addEventListener('click', () => { Sound.click(); bReset(); });
  $('#bCmp').addEventListener('click', () => { S.b.cmp = !S.b.cmp; Sound.click(); updateCtl(); });
  [0, 1, 2, 3, 4].forEach((i) => $('#nm' + i).addEventListener('change', () => { S.nmChk = false; updateCtl(); }));
  $('#chExt').addEventListener('click', chExtract); $('#chSpot').addEventListener('click', chSpot);
  $$('#chDepth button').forEach((x) => x.addEventListener('click', () => { if (S.ch.dipped) return; S.ch.depth = +x.dataset.v; Sound.click(); updateCtl(); }));
  $('#chDip').addEventListener('click', chDip); $('#chDev').addEventListener('click', chDevelop); $('#chMark').addEventListener('click', chMark);
  $('#chNew').addEventListener('click', () => { Sound.click(); chNewPaper(); });
  PIG.forEach((p, i) => { $('#rn' + i).addEventListener('change', updateCtl); $('#rf' + i).addEventListener('input', updateCtl); });
  PINS.forEach((p, i) => $('#fn' + i).addEventListener('change', () => { S.fn.sel[i] = $('#fn' + i).value; S.fn.chk = false; if (fnOK(i)) { Sound.success(); } updateCtl(); }));
  $('#spL').addEventListener('input', (e) => { S.sp.wl = +e.target.value; updateCtl(); });
  $('#spMark').addEventListener('click', spMark); $('#spClr').addEventListener('click', () => { S.sp.mk = { blue: null, red: null }; Sound.click(); updateCtl(); });
  $$('#spLamp button').forEach((x) => x.addEventListener('click', () => { S.sp.lamp = x.dataset.v; Sound.click(); updateCtl(); }));
  $$('#fiSit button').forEach((x) => x.addEventListener('click', () => { S.fi.sit = +x.dataset.v; S.fade = 1; Sound.click(); updateCtl(); }));
  $$('#fiAut button').forEach((x) => x.addEventListener('click', () => { S.fi.aut[x.dataset.v] = !S.fi.aut[x.dataset.v]; Sound.click(); updateCtl(); }));
  [['fiGr', () => { S.fi.shade.gr = $('#fiGr').value; }], ['fiB', () => { S.fi.shade.b = $('#fiB').value; }], ['fiSt', () => { S.fi.dark.st = $('#fiSt').value; }], ['fiL', () => { S.fi.sea.l = $('#fiL').value; }], ['fiP', () => { S.fi.sea.p = $('#fiP').value; }]]
    .forEach(([id, fn]) => $('#' + id).addEventListener('change', () => { fn(); Sound.click(); updateCtl(); }));

  /* =========================================================
     미션
     ========================================================= */
  const FN_HINT = ['이중막은 바깥과 안쪽 사이로 물질이 드나드는 것을 조절해요.', '색소가 박혀 있는 막이에요. 빛을 흡수하는 반응이 일어나요.', '납작한 주머니가 쌓이면 막의 표면적이 넓어져요.', '효소가 들어 있는 액체예요. CO₂ 로 포도당을 만드는 반응이 일어나요.', '광합성으로 만든 양분을 잠깐 모아 두는 곳이에요.'];
  const levels = [
    {
      title: '모형 조립', short: '모형 조립', icon: '🧩', phase: '모형',
      intro: '<p class="si-q">❓ 탐구 질문: 잎이 초록색인 까닭은 무엇이고, 엽록체 안의 어느 곳에서 빛을 받을까?</p><p>🔗 <b>앞 차시에서</b> 미토콘드리아의 이중막과 크리스타를 조립해 봤어요. 중학교(식물과 에너지)에서는 광합성이 <b>엽록체</b>에서 일어난다고 배웠어요. 이번에는 엽록체의 내부 구조를 3D 모형으로 만들어요.</p><p>엽록체는 이중막(외막 · 내막)으로 싸여 있고, 안쪽 액체인 <b>스트로마</b> 속에 납작한 막 주머니 <b>틸라코이드</b>가 있어요. 틸라코이드가 동전처럼 쌓인 것이 <b>그라나</b>이고, 그라나 사이는 <b>스트로마 틸라코이드</b>가 이어 줘요. 크기는 길이 약 5~10 μm, 지름 약 2~3 μm의 렌즈 모양이고 잎살 세포 한 개에 약 20~100개가 있어요.</p><p>부품 9개를 끌어다 조립하고, 화면을 끌어 <b>360° 돌려</b> 보고 <b>단면 슬라이더</b>로 열어 봐요.</p>',
      features: ['build'],
      setup() { setMode('build'); S.b.nameMode = false; },
      recap: '엽록체는 외막과 내막의 이중막으로 싸여 있고, 안쪽 스트로마에 납작한 틸라코이드 막 주머니가 있어요. 틸라코이드가 쌓인 것이 그라나이고, 틸라코이드 내부는 스트로마와 막으로 나뉘어 있어요. 스트로마에는 DNA, 70S 리보솜, 녹말 알갱이가 있어요.',
      summary: '<ul><li><b>이중막</b>: 외막과 내막. 물질의 출입을 조절해요. 안쪽 막은 미토콘드리아의 크리스타처럼 접히지 않아요.</li><li><b>스트로마</b>: 내막 안쪽 액체. 탄소 고정 효소, <b>DNA</b>, <b>70S 리보솜</b>, <b>녹말 알갱이</b>가 있어요.</li><li><b>틸라코이드</b>: 납작한 주머니 모양의 막(색소가 박혀 있어요). 막으로 둘러싸인 안쪽 공간이 <b>틸라코이드 내부(내강)</b>이고, 쌓인 것이 <b>그라나</b>, 그라나를 잇는 것이 <b>스트로마 틸라코이드</b>예요.</li><li>크기: 길이 약 5~10 μm, 지름 약 2~3 μm의 렌즈 모양, 잎살 세포 한 개에 약 20~100개.</li><li>미토콘드리아와 공통: 이중막 · 내부 막 구조 · 고리 DNA와 70S 리보솜(자체 단백질 일부 합성).</li></ul>',
      missions: [
        {
          id: 'build', title: '부품 9개 조립하기',
          goal: '부품 카드 9개를 점선 모형의 <b>?</b> 표시로 끌어다 놓아 엽록체를 조립하세요. 화면을 끌면 모형이 돌아가요.',
          hint: '카드를 가져가면 표시가 가리키는 구조가 반짝여요. 카드의 설명과 점선 모양을 맞춰 보세요. 카드를 눌러 고른 뒤 ? 표시를 눌러도 돼요.',
          setup() { setMode('build'); S.b.nameMode = false; bReset(); },
          check: () => bPlaced() === 9, hold: 0.6,
          status: () => mark(bPlaced() === 9) + ' 조립한 부품 ' + bPlaced() + ' / 9',
          explain: '<b>외막 · 내막 · 스트로마 · 그라나 · 스트로마 틸라코이드 · 틸라코이드 내부 · 녹말 알갱이 · DNA · 리보솜</b> 9가지를 모두 맞췄어요. 틸라코이드는 이중막과 별개로 스트로마 안에 있는 막 주머니예요.',
        },
        {
          id: 'name', title: '단면 구조에 이름 붙이기', manual: true,
          goal: '모형을 정면에서 본 <b>세로 단면</b>이에요. 핀 ①~⑤가 가리키는 구조의 이름을 오른쪽 목록에서 고르세요.',
          hint: '가장 바깥을 감싼 막이 외막이에요. 안쪽 액체가 스트로마, 동전처럼 쌓인 것이 그라나, 납작한 주머니의 안쪽 공간이 틸라코이드 내부예요.',
          setup() { setMode('build'); S.b.nameMode = true; S.nmChk = false; [0, 1, 2, 3, 4].forEach((i) => { $('#nm' + i).value = ''; }); bCut(1); bFront(); updateCtl(); },
          check() {
            const miss = [0, 1, 2, 3, 4].find((i) => !nmVal(i));
            if (miss != null) { S.nmChk = false; return '핀 5개의 이름을 모두 골라 주세요. (핀 ' + '①②③④⑤'[miss] + ' 이 비었어요)'; }
            const bad = [0, 1, 2, 3, 4].filter((i) => !nmOK(i)); S.nmChk = true;
            if (bad.length) { const H = ['가장 바깥을 감싼 매끈한 막이에요.', '내막 안쪽을 채운 액체예요.', '외막 바로 안쪽의 막이에요. 접히지 않아요.', '납작한 막 주머니의 안쪽 공간이에요.', '틸라코이드가 동전처럼 쌓인 것이에요.']; return '빨간 칸이 아직 달라요. 핀 ' + '①②③④⑤'[bad[0]] + ': ' + H[bad[0]]; }
            return true;
          },
          explain: '핀 ①은 <b>외막</b>, ②는 내막 안쪽의 액체인 <b>스트로마</b>, ③은 <b>내막</b>, ④는 납작한 주머니의 안쪽인 <b>틸라코이드 내부</b>, ⑤는 틸라코이드가 쌓인 <b>그라나</b>예요.',
        },
        {
          type: 'quiz', title: '엽록체의 막 구조',
          goal: '엽록체의 막 구조에 대한 설명으로 옳은 것은?',
          setup() { setMode('build'); S.b.nameMode = false; updateCtl(); },
          choices: ['이중막 안의 스트로마에 납작한 틸라코이드 막 주머니가 있고, 틸라코이드 내부는 스트로마와 막으로 나뉘어 있다', '단일막이고 안쪽 막이 크리스타로 접혀 있다', '이중막이고 내막이 접힌 크리스타에 색소가 박혀 있다', '틸라코이드 내부와 스트로마는 막 없이 하나로 이어져 있다'],
          answer: 0,
          feedback: ['', '엽록체도 외막과 내막의 이중막이에요.', '크리스타는 미토콘드리아의 구조예요. 엽록체의 색소는 틸라코이드 막에 있어요.', '틸라코이드 막이 스트로마와 틸라코이드 내부를 나눠요.'],
          explain: '엽록체는 <b>이중막</b> 안의 스트로마에 <b>틸라코이드</b>라는 별도의 막 구조가 있어요. 틸라코이드 막이 안쪽 공간(내부)과 스트로마를 나누고, 이 막에 광합성 색소가 박혀 있어요.',
        },
      ],
    },
    {
      title: '색소 분리', short: '색소 분리', icon: '🧪', phase: '실험',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 틸라코이드 막에 색소가 박혀 있다고 했어요. 그 색소를 직접 분리해 봐요. 중2에서 배운 <b>종이 크로마토그래피</b>를 한 단계 깊이 해서 <b>Rf 값</b>까지 계산해요.</div><p>시금치 잎을 에탄올에 갈아 추출액을 만들고, 여과지 아래쪽 2 cm에 <b>여러 번 겹쳐 점</b>을 찍어요. 점이 용매에 <b>잠기지 않게</b> 담가 전개하고, 용매가 올라간 곳(용매 전선)을 바로 연필로 표시해요.</p><p><b>Rf = 색소 이동 거리 / 용매 이동 거리</b> (둘 다 원점선에서 잰 거리). 용매 이동 거리는 10.0 cm예요. (용매는 환기가 잘되는 곳에서, 불 가까이 두지 않고, 폐액은 따로 모아 버려요.)</p>',
      features: ['chrom'],
      setup() { setMode('chrom'); S.ch.rfOn = false; chReset(); },
      recap: '색소는 용매에 잘 녹고 종이에 덜 붙을수록 멀리 이동해요. 위에서부터 카로틴(Rf 0.95) > 잔토필(0.75) > 엽록소 a(0.60) > 엽록소 b(0.50) 순으로 분리돼요. Rf = 색소 이동 거리 / 용매 이동 거리예요.',
      summary: '<ul><li><b>방법</b>: 시금치 잎 + 에탄올(또는 아세톤) 추출 → 여과지 아래 2 cm에 여러 번 겹쳐 점찍기 → 전개 용매(석유 에터 : 아세톤 = 9 : 1)에 담그기(점이 잠기지 않게, 뚜껑 닫기) → 용매 전선을 바로 표시.</li><li><b>Rf 값</b> = 색소 이동 거리 / 용매 이동 거리. 용매 10.0 cm일 때 카로틴(주황) 9.5 cm → <b>0.95</b>, 잔토필(노랑) 7.5 cm → <b>0.75</b>, 엽록소 a(청록) 6.0 cm → <b>0.60</b>, 엽록소 b(황록) 5.0 cm → <b>0.50</b>.</li><li><b>원리</b>: 용매에 잘 녹고(극성이 낮고) 종이에 덜 붙을수록 멀리 이동해요. 그래서 카로틴이 가장 멀리 가요.</li><li>안전 · 환경: 환기, 불 가까이 두지 않기, 보안경, 폐액 분리 수거.</li></ul>',
      missions: [
        {
          id: 'run', title: '크로마토그래피 전개',
          goal: '추출액으로 점을 <b>5번 이상</b> 겹쳐 찍고, 점보다 <b>낮은 용매</b>에서 전개한 뒤 <b>용매 전선</b>을 표시하세요.',
          hint: '1) 잎 갈기 2) 점 찍기 5번 이상 3) 용매 높이를 1 cm로 하고 담그기 4) 전개 5) 전선 표시 순서예요. 점은 2 cm 높이에 있어서 용매가 3 cm이면 잠겨요.',
          setup() { setMode('chrom'); S.ch.rfOn = false; chReset(); },
          check: () => chOK(), hold: 0.5,
          status: () => mark(S.ch.ext) + ' 추출 &nbsp; ' + mark(S.ch.spots >= 5) + ' 점 ' + S.ch.spots + ' / 5 &nbsp; ' + mark(S.ch.dipped && !S.ch.fail) + ' 담그기 &nbsp; ' + mark(S.ch.devDone) + ' 전개 &nbsp; ' + mark(S.ch.marked) + ' 전선 표시',
          explain: '점을 여러 번 겹쳐 찍어야 색이 진해서 띠가 잘 보여요. 점이 용매에 잠기면 색소가 용매로 녹아 나가서 분리가 안 돼요. 전개가 끝나면 용매 전선은 금방 흐려지므로 바로 연필로 표시해야 해요.',
        },
        {
          id: 'rf', title: '이동 거리 재고 Rf 계산',
          goal: '네 띠를 <b>눌러</b> 이동 거리를 재고, 각 띠의 <b>색소 이름</b>과 <b>Rf 값</b>(소수 둘째 자리까지)을 입력하세요.',
          hint: 'Rf = 색소 이동 거리 / 용매 이동 거리(10.0 cm). 예: 이동 거리 9.5 cm이면 9.5 / 10.0 = 0.95. 위에서부터 카로틴 → 잔토필 → 엽록소 a → 엽록소 b 순이에요.',
          setup() { setMode('chrom'); S.ch.rfOn = true; updateCtl(); },
          check: () => measN() === 4 && PIG.every((p, i) => rfRowOK(i)), hold: 0.6,
          status: () => PIG.map((p, i) => mark(rfRowOK(i)) + ' ' + p.color + ' ' + (S.ch.meas[p.id] ? fix1(p.dist) + ' cm' : '? cm')).join(' &nbsp; '),
          explain: '위에서부터 <b>카로틴(주황) 9.5 cm → 0.95, 잔토필(노랑) 7.5 cm → 0.75, 엽록소 a(청록) 6.0 cm → 0.60, 엽록소 b(황록) 5.0 cm → 0.50</b>이에요. 극성이 낮은 카로틴은 용매에 잘 녹고 종이에 덜 붙어서 가장 멀리 가요.',
        },
        {
          type: 'quiz', title: '색소 띠가 갈라지는 까닭',
          goal: '여러 색소가 <b>서로 다른 위치</b>에 띠를 이루며 분리되는 까닭은?',
          setup() { setMode('chrom'); },
          choices: ['색소마다 용매에 녹는 정도와 종이에 붙는 정도가 달라서 이동 속도가 다르기 때문이다', '색소의 색깔이 달라서 중력이 다르게 작용하기 때문이다', '용매가 색소를 새로 만들어 내기 때문이다', '색소가 증발하는 속도가 다르기 때문이다'],
          answer: 0,
          feedback: ['', '색깔 때문이 아니라 녹는 정도와 붙는 정도의 차이예요.', '용매는 색소를 이동시킬 뿐 새로 만들지 않아요.', '증발이 아니라 이동 속도의 차이로 분리돼요.'],
          explain: '용매가 종이를 타고 올라가며 색소를 끌고 가요. 용매에 잘 녹고 종이에 덜 붙는 색소일수록 <b>멀리</b>, 종이에 잘 붙는 색소일수록 <b>가까이</b> 머물러 띠가 갈라져요. 점이 용매에 잠기면 색소가 용매에 녹아 나가 분리를 못 해요.',
        },
      ],
    },
    {
      title: '구조와 기능', short: '구조와 기능', icon: '🔗', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 엽록체의 색소 4가지를 분리하고 Rf 값을 구했어요. 이 색소들은 <b>틸라코이드 막</b>에 있어요. 이제 구조와 기능을 짝지어요.</div><p>틸라코이드 막은 빛 흡수 · 전자 전달 · ATP 합성(명반응), 그라나는 쌓여서 표면적이 넓어 빛 흡수 효율이 높고, 스트로마는 효소가 있어 CO₂로 포도당을 만드는 탄소 고정 반응이 일어나요. 반응 단계는 다음 두 차시에서 자세히 배워요.</p><p>또 <b>흡수 스펙트럼</b> 그래프(파장 400~700 nm)에서 엽록소의 흡수 봉우리 두 개와 녹색 구간의 골짜기를 읽고, 잎이 초록으로 보이는 까닭과 식물 생장 조명이 적색 + 청색 LED인 까닭을 추론해요.</p>',
      features: ['func', 'spec'],
      setup() { setMode('func'); S.fn.chk = false; },
      recap: '틸라코이드 막은 색소가 있어 빛 흡수와 명반응, 그라나는 막 표면적을 넓혀 빛 흡수 효율을 높이고, 스트로마는 효소로 CO₂ 를 포도당으로 만들어요. 엽록소는 청자색과 적색 빛을 잘 흡수하고 녹색은 덜 흡수해 잎이 초록으로 보여요.',
      summary: '<ul><li><b>외막 · 내막</b>: 물질 출입 조절. <b>틸라코이드 막</b>: 색소가 박힌 곳 — 빛 흡수, 전자 전달, ATP 합성(명반응). <b>그라나</b>: 쌓여서 막 표면적↑ → 빛 흡수 효율↑. <b>스트로마</b>: 효소가 있는 곳 — CO₂로 포도당을 만드는 탄소 고정 반응. <b>녹말 알갱이</b>: 만든 양분의 일시 저장.</li><li><b>흡수 스펙트럼</b>: 엽록소는 청자색(약 430~450 nm)과 적색(약 660~680 nm) 빛을 잘 흡수하고, 녹색(약 550 nm)은 덜 흡수하고 반사 · 투과해서 잎이 초록으로 보여요. 카로티노이드는 청색~청록(약 450~500 nm) 빛을 흡수해요.</li><li>엽록소 a만 반응 중심 색소이고, 나머지는 빛을 모아 전달하는 보조 색소예요.</li><li>식물 생장 조명에 적색 + 청색 LED를 쓰는 까닭: 엽록소가 흡수하는 파장이기 때문이에요.</li></ul>',
      missions: [
        {
          id: 'link', title: '구조와 기능 연결', manual: true,
          goal: '2D 단면의 핀 ①~⑤가 가리키는 구조에 알맞은 <b>기능 카드(A~E)</b>를 골라 5개를 모두 연결하세요.',
          hint: '틸라코이드 막은 색소가 있어 빛을 받아요. 그라나는 쌓여서 표면적이 넓고, 스트로마에는 효소가 있어요. 녹말은 양분 저장이에요.',
          setup() { setMode('func'); S.fn.chk = false; PINS.forEach((p, i) => { S.fn.sel[i] = ''; $('#fn' + i).value = ''; }); updateCtl(); },
          check() {
            const f = S.fn; const miss = PINS.findIndex((p, i) => !fnVal(i));
            if (miss >= 0) { f.chk = false; return '핀 ' + '①②③④⑤'[miss] + '(' + PINS[miss].name + ')의 기능을 골라 주세요.'; }
            f.chk = true; const bad = PINS.findIndex((p, i) => !fnOK(i));
            if (bad >= 0) return '빨간 핀이 아직 달라요. 핀 ' + '①②③④⑤'[bad] + '(' + PINS[bad].name + '): ' + FN_HINT[bad];
            return true;
          },
          explain: '<b>외막 · 내막</b>은 물질 출입을 조절하고, <b>틸라코이드 막</b>은 색소가 있어 빛 흡수 · 전자 전달 · ATP 합성(명반응)을 해요. <b>그라나</b>는 막 표면적을 넓히고, <b>스트로마</b>의 효소가 CO₂로 포도당을 합성(탄소 고정 반응)하며, <b>녹말 알갱이</b>는 양분을 임시 저장해요.',
        },
        {
          id: 'peaks', title: '흡수 봉우리 2개 찾기',
          goal: '<b>📈 흡수 스펙트럼</b> 화면에서 엽록소 a의 <b>청자색 봉우리</b>와 <b>적색 봉우리</b>의 파장을 찾아 📌 표시하세요.',
          hint: '그래프를 끌거나 파장 슬라이더를 움직여 엽록소 a(청록 곡선)가 가장 높은 곳에 맞추고 📌를 눌러요. 청자색은 약 430~450 nm, 적색은 약 660~680 nm 근처예요.',
          setup() { setMode('spec'); S.sp.mk = { blue: null, red: null }; updateCtl(); },
          check: () => S.sp.mk.blue != null && S.sp.mk.red != null, hold: 0.6,
          status: () => mark(S.sp.mk.blue != null) + ' 청자색 봉우리 ' + (S.sp.mk.blue != null ? S.sp.mk.blue + ' nm' : '?') + ' &nbsp; ' + mark(S.sp.mk.red != null) + ' 적색 봉우리 ' + (S.sp.mk.red != null ? S.sp.mk.red + ' nm' : '?'),
          explain: '엽록소는 <b>청자색(약 430~450 nm)</b>과 <b>적색(약 660~680 nm)</b> 빛을 잘 흡수해요. 녹색(약 550 nm)은 덜 흡수하고 반사 · 투과해서 잎이 <b>초록색</b>으로 보여요. 그래서 식물 생장 조명에 적색 + 청색 LED를 쓰면 흡수 효율이 높아요(그래프 아래 막대: 햇빛 ' + LAMPV.sun + ' %, 적색 + 청색 LED ' + LAMPV.rb + ' %, 녹색 LED ' + LAMPV.g + ' %).',
        },
        {
          type: 'quiz', title: '그라나가 많으면 유리한 점',
          goal: '엽록체에 <b>그라나가 많으면</b> 유리한 점은?',
          setup() { setMode('func'); },
          choices: ['틸라코이드 막의 표면적이 넓어 색소와 효소가 많이 들어가 빛을 효율적으로 흡수한다', '스트로마의 부피가 커져 DNA를 더 많이 저장한다', '외막의 면적이 늘어 물질이 더 많이 드나든다', '녹말 알갱이가 저절로 늘어난다'],
          answer: 0,
          feedback: ['', '그라나는 틸라코이드가 쌓인 것이라 스트로마의 부피를 키우는 것이 아니에요.', '외막과는 관계가 없어요.', '그라나의 기능은 빛 흡수 면적을 넓히는 것이에요.'],
          explain: '그라나는 <b>틸라코이드가 쌓인 것</b>이라 좁은 공간에 막 표면적이 넓어요. 색소와 광합성 효소 · 전자 전달 단백질이 많이 들어가 빛 에너지를 효율적으로 받아요. 미토콘드리아의 크리스타와 같은 원리예요.',
        },
      ],
    },
    {
      title: '추론하기', short: '추론하기', icon: '🔎', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 엽록체의 구조와 기능, 색소의 흡수 특성을 연결했어요. 이제 그 지식으로 <b>상황 4개</b>를 추론해요.</div><p>🍁 가을 단풍에서 색소 띠가 어떻게 변할까요? 🌿 그늘에서 자란 잎의 엽록체는 어떻게 다를까요? 🌑 엽록체가 있는 세포를 어둠에 오래 두면? 🌊 깊은 바다의 붉은 해조류는 어떤 빛으로 광합성을 할까요? 상황마다 예측을 고르면 그림이 알려 줘요.</p>',
      features: ['infer'],
      setup() { setMode('infer'); },
      recap: '가을에는 엽록소가 먼저 분해되어 카로티노이드의 노랑 · 주황이 드러나요. 그늘 잎의 엽록체는 그라나가 많고 엽록소 b 비율이 높고, 어둠에 오래 두면 녹말 알갱이가 줄어요. 붉은 해조류는 깊은 곳까지 오는 녹색~청색 빛을 보조 색소로 흡수해요.',
      summary: '<ul><li><b>가을 단풍</b>: 엽록소가 먼저 분해되어 카로티노이드(노랑 · 주황)가 드러나요. 붉은 색소 안토사이아닌은 새로 합성돼요.</li><li><b>그늘 잎</b>: 약한 빛을 모으려고 그라나가 더 많고 엽록소 b의 비율이 높다고 추정할 수 있어요.</li><li><b>어둠</b>: 광합성이 멈추면 저장한 녹말 알갱이가 양분으로 쓰여 줄어요.</li><li><b>붉은 해조류</b>: 깊은 바다에는 녹색~청색 빛이 닿아요. 보조 색소가 이 빛을 흡수해 엽록소 a에 전달해요.</li><li>엽록체와 미토콘드리아의 공통: <b>이중막 · 내부 막 구조</b>, 고리 DNA와 70S 리보솜 → 일부 단백질을 <b>자체 합성</b>. 엽록체에만: 틸라코이드와 엽록소.</li></ul>',
      missions: [
        {
          id: 'infer', title: '상황 4개 추론', manual: true,
          goal: '<b>🍁 가을 단풍 · 🌿 그늘 잎 · 🌑 어둠 · 🌊 붉은 해조류</b> 네 상황에서 알맞은 예측을 모두 고르세요.',
          hint: '단풍: 먼저 분해되는 색소 → 어느 띠가 옅어질까요? 그늘: 약한 빛을 많이 모으려면? 어둠: 광합성이 멈추면 저장 양분은? 바다: 깊은 곳에 남는 빛은?',
          setup() { setMode('infer'); S.fi.sit = 0; updateCtl(); },
          check() {
            const f = S.fi;
            if (!fiOk[0]()) return '🍁 가을 단풍: 가을 잎의 띠를 눌러 보세요. 가을에는 엽록소(청록 · 황록 띠)가 먼저 분해돼요. 카로틴과 잔토필은 그대로예요.';
            if (!fiOk[1]()) return '🌿 그늘 잎: 약한 빛을 잘 모으려면 그라나가 더 많고, 엽록소 b 비율이 높아요.';
            if (!fiOk[2]()) return '🌑 어둠: 광합성이 멈추면 녹말 알갱이는 양분으로 쓰여 줄어들어요.';
            if (!fiOk[3]()) return '🌊 붉은 해조류: 깊은 바다에 닿는 빛은 녹색~청색이고, 보조 색소가 그 빛을 흡수해요.';
            return true;
          },
          explain: '<b>단풍</b>: 엽록소가 먼저 분해되어 카로티노이드가 드러나요. <b>그늘 잎</b>: 그라나 ↑, 엽록소 b 비율 ↑(추정). <b>어둠</b>: 녹말 알갱이 ↓. <b>붉은 해조류</b>: 깊이 닿는 녹색~청색 빛을 보조 색소로 흡수해 광합성을 해요.',
        },
        {
          type: 'quiz', title: '엽록체와 미토콘드리아',
          goal: '엽록체와 미토콘드리아에 <b>공통으로</b> 있는 특징과, 그것으로 알 수 있는 것은?',
          setup() { setMode('infer'); },
          choices: ['이중막과 내부 막 구조, 자체 DNA와 70S 리보솜이 있어 일부 단백질을 스스로 합성할 수 있다', '크리스타와 틸라코이드가 모두 있어 빛에너지를 직접 흡수한다', '엽록소가 있어서 둘 다 광합성을 한다', 'DNA가 없어서 모든 단백질을 세포질에서 받아 온다'],
          answer: 0,
          feedback: ['', '크리스타는 미토콘드리아에만, 틸라코이드는 엽록체에만 있어요.', '엽록소는 엽록체에만 있어요. 미토콘드리아는 세포호흡을 해요.', '둘 다 고리 모양 DNA와 리보솜이 있어요.'],
          explain: '엽록체와 미토콘드리아는 <b>이중막과 내부 막 구조</b>, <b>고리 DNA와 70S 리보솜</b>이 있어요. 그래서 자체 단백질의 일부를 합성할 수 있어요. 엽록체에만 틸라코이드와 엽록소가 있어요.',
        },
      ],
    },
  ];

  mkBuildInit();
  function mkBuildInit() { bTokInit(); }
  game = SciSim.game({
    simId: 'hy-chloroplast', mount: '#game', badge: '엽록체 탐험가', homeHref: '../../index.html#hy',
    featureLabels: { build: '🧩 3D 단면 모형', chrom: '🧪 크로마토그래피 실험대', func: '🔗 구조와 기능 연결', spec: '📈 흡수 스펙트럼', infer: '🔎 상황 추론' },
    onFeatures() { updateCtl(); },
    levels,
  });

  function readouts() {
    const m = S.mode, c = S.ch, s = S.sp;
    if (m === 'build') setReads(['조립한 부품', bPlaced() + ' / 9', '단면', Math.round(S.b.sT * 100) + ' %', '회전', Math.round(((S.b.th * 180 / Math.PI) % 360 + 360) % 360) + '°']);
    else if (m === 'chrom') setReads(['용매 이동 거리', c.dev > 0 ? fix1(chFront()) + ' cm' : '—', '점 찍은 횟수', c.spots + ' / 8', '잰 띠', measN() + ' / 4']);
    else if (m === 'func') setReads(['맞힌 핀', fnCnt() + ' / 5', '기능 카드', '5장', '틸라코이드 막', fnOK(1) ? '명반응' : '?']);
    else if (m === 'spec') setReads(['파장', s.wl + ' nm (' + wlName(s.wl) + ')', '잎의 흡수', fi(aLeaf(s.wl) * 100) + ' %', '선택한 조명', LAMP[s.lamp].name + ' ' + LAMPV[s.lamp] + ' %']);
    else setReads(['푼 상황', fiN() + ' / 4', '지금 보는 상황', SIT[S.fi.sit].name, '예측', fiOk[S.fi.sit]() ? '맞아요' : '고르는 중']);
  }

  setMode('build');
  let lastFree = false, lastLv = -1, uiT = 0;
  SciSim.loop((dt, t) => {
    clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (game && game.level !== lastLv) { lastLv = game.level; updateCtl(); }
    view.apply(); FX.update(dt); ctx.clearRect(0, 0, VW, VH);
    bgFill('#f3f6ee', '#e8eee2');
    updLater(dt);
    if (S.mode === 'build') bDraw(dt, t); else if (S.mode === 'chrom') chDraw(dt, t); else if (S.mode === 'func') fnDraw(dt, t); else if (S.mode === 'spec') spDraw(dt, t); else fiDraw(dt, t);
    FX.draw(); parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(241,246,243,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : approach(S.fade, 0, dt, 9); }
    uiT += dt; if (uiT > 0.25 && S.mode === 'chrom') { uiT = 0; updateCtl(); }
    readouts();
  });

  window.__sim = { S, VW, VH, PHONE, get game() { return game; }, levels, setMode, PARTS, bPlace, bAnchor, bFindMarker, bReset, bCut, bFront, PIG, chExtract, chSpot, chDip, chDevelop, chMark, chFront, chBandD, chG, PINS, FUN, LAMP, LAMPV, aChl, aLeaf, spMark, spSet, fiOk, updateCtl, bPlaced, RIBO, GR, STA, inEll };
})();
