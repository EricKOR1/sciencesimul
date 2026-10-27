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
      if (e.kind === 'text') T(e.x, e.y - 24 * p, e.text, e.size || 15, e.color || '#16a34a', 'center', 800, { alpha: 1 - p * p, stroke: '#fff', strokeWidth: 4 });
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
    reset() { this.cards.forEach((c) => { c.zone = null; c.bad = false; c.sel = false; }); this.drag = null; this.selected = null; this.layout(true); this.o.onChange && this.o.onChange(); }
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


  /* ---------- 분수·퍼센트 입력 읽기: '1/4', '0.25', '25%', '4분의 1' ---------- */
  function parseFrac(s) {
    s = String(s == null ? '' : s).trim().replace(/\s+/g, '').replace(/,/g, '');
    if (!s) return NaN;
    let m = /^(\d+(?:\.\d+)?)분의(\d+(?:\.\d+)?)$/.exec(s);
    if (m) return +m[2] / +m[1];
    m = /^(\d+(?:\.\d+)?)[\/:](\d+(?:\.\d+)?)$/.exec(s);
    if (m) return +m[2] === 0 ? NaN : +m[1] / +m[2];
    m = /^(\d+(?:\.\d+)?)%$/.exec(s);
    if (m) return +m[1] / 100;
    m = /^(\d*\.?\d+)$/.exec(s);
    if (m) return +m[1];
    return NaN;
  }
  const fracIs = (s, target, tol) => { const v = parseFrac(s); return isFinite(v) && Math.abs(v - target) <= (tol == null ? 1e-3 : tol); };
  /* 모드 버튼: 현재 단계의 것만 보여 줘요 (data-lv) */
  function bindModes(setModeFn) { $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setModeFn(b.dataset.mode); })); }
  /* 간단한 막대 그리기 도우미: 값은 0~max 범위로 묶어요 */
  function barRect(x, base, w, v, max, hPx) { const hh = clamp(v / max, 0, 1) * hPx; return { x, y: base - hh, w, h: hh }; }
  function fmtN(n, d) { return Number(n).toLocaleString('ko-KR', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); }
  const pct = (a, b, d) => (b > 0 ? fmtN(a / b * 100, d == null ? 0 : d) + ' %' : '—');
  function dot(x, y, r, col, o) { D.sphere(x, y, r, col, o || {}); }
  /* 사람 아이콘(원 머리 + 몸) */
  function person(x, y, s, col, o) {
    o = o || {};
    ctx.save(); ctx.translate(x, y); ctx.globalAlpha = o.alpha == null ? 1 : o.alpha;
    ctx.fillStyle = col; ctx.strokeStyle = o.line || C.shade(col, -0.25); ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(0, -s * 0.62, s * 0.3, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-s * 0.46, s * 0.55); ctx.quadraticCurveTo(-s * 0.46, -s * 0.2, 0, -s * 0.2); ctx.quadraticCurveTo(s * 0.46, -s * 0.2, s * 0.46, s * 0.55); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  /* 염색체(막대 하나): 가운데가 잘록한 알약 모양 */
  function chromo(x, y, w, h, col, o) {
    o = o || {};
    ctx.save(); ctx.globalAlpha = o.alpha == null ? 1 : o.alpha;
    const g = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0); g.addColorStop(0, C.shade(col, 0.25)); g.addColorStop(0.5, col); g.addColorStop(1, C.shade(col, -0.2));
    ctx.fillStyle = g; D.roundRect(x - w / 2, y - h / 2, w, h, Math.min(w / 2, 10)); ctx.fill();
    ctx.strokeStyle = C.shade(col, -0.35); ctx.lineWidth = 1.4; ctx.stroke();
    ctx.restore();
  }

  /* 카드를 누르면 선택, 상자를 누르면 놓기 (끌기가 어려운 기기를 위해) */
  function selectable(opts) {
    let so = null;
    opts.onTap = (c) => { so.selected = so.selected === c ? null : c; Sound.click(); if (opts.afterTap) opts.afterTap(c); };
    opts.isSel = (c) => !!so && so.selected === c;
    so = new Sorter(opts); so.selected = null;
    return so;
  }
  function sorterPT(get) {
    return {
      down(p) {
        const so = get();
        if (so.selected && !so.cards.some((c) => inRect(p.x, p.y, c))) {
          const b = so.boxAt(p), c = so.selected; so.selected = null;
          so.place(c, b ? b.id : null); return false;
        }
        return so.down(p);
      },
      move: (p) => get().move(p), up: (p) => get().up(p), hover: (p) => get().hover(p),
    };
  }


  /* =========================================================
     고등학교 생물의 유전 · Ⅰ. 유전자와 유전물질 - 염색체 수·구조 이상 (단원 59, 4차시)
     성취기준 [12유전01-04] 염색체와 유전자 이상에 대해 이해하고, 사람의 유전병을 발병 원인별 조사 계획을 세워 조사할 수 있다. (앞부분: 염색체 이상)
     ① 모형: 비분리  ② 모형: 수 이상  ③ 모형: 구조 이상  ④ 분석: 발생 빈도
     (핵형 카드와 사례는 모두 교육용 가상 자료이고, 나이별 빈도는 예시 값이에요)
     ========================================================= */
  const S = { mode: 'meiosis', fade: 0, t: 0 };
  let game = null;
  const ease = SciSim.ease;
  const COLR = '#e2464b', COLB = '#2563eb', COLG = '#16a34a', COLP = '#f59e0b', COLM = '#dc2626';
  const nfmt = (n) => String(n);

  /* ---------- 칸(상자)과 도구 ---------- */
  const ctlNodes = $$('#ctrlCard .control');
  function chipOn(root, val) { $$('button', root).forEach((b) => b.classList.toggle('on', String(b.dataset.v) === String(val))); }

  /* =========================================================
     ① 감수 분열 비분리 모형 (21번 상동 염색체 한 쌍만 따라가요)
     단계 0 감수 1분열 중기 · 1 후기 · 2 감수 1분열 끝(딸세포 2개) · 3 감수 2분열 후기 · 4 생식세포 4개
     ========================================================= */
  const GEO = PHONE
    ? { y0: 74, h: 404, cx: 240, cy: 278, R1: 148, dx: 116, R2: 110, R3: 68, dy: 82, cw: 10, ch: 50, pole: 98, sep: 40, off: 20 }
    : { y0: 62, h: 414, cx: 400, cy: 268, R1: 168, dx: 190, R2: 148, R3: 86, dy: 98, cw: 12, ch: 62, pole: 104, sep: 50, off: 24 };
  const KIND_NAME = { normal: '정상 분열', ndj1: '감수 1분열 비분리', ndj2: '감수 2분열 비분리' };
  function cellsAt(s) {
    const g = GEO;
    if (s === 0) return [{ id: 'c0', par: 'c0', x: g.cx, y: g.cy, rx: g.R1, ry: g.R1 }];
    if (s === 1) return [{ id: 'c0', par: 'c0', x: g.cx, y: g.cy, rx: g.R1 * 1.14, ry: g.R1 * 0.92 }];
    if (s === 2) return [{ id: 'L', par: 'c0', x: g.cx - g.dx, y: g.cy, rx: g.R2, ry: g.R2 }, { id: 'R', par: 'c0', x: g.cx + g.dx, y: g.cy, rx: g.R2, ry: g.R2 }];
    if (s === 3) return [{ id: 'L', par: 'L', x: g.cx - g.dx, y: g.cy, rx: g.R2 * 0.95, ry: g.R2 * 1.1 }, { id: 'R', par: 'R', x: g.cx + g.dx, y: g.cy, rx: g.R2 * 0.95, ry: g.R2 * 1.1 }];
    return [
      { id: 'LT', par: 'L', x: g.cx - g.dx, y: g.cy - g.dy, rx: g.R3, ry: g.R3 }, { id: 'LB', par: 'L', x: g.cx - g.dx, y: g.cy + g.dy, rx: g.R3, ry: g.R3 },
      { id: 'RT', par: 'R', x: g.cx + g.dx, y: g.cy - g.dy, rx: g.R3, ry: g.R3 }, { id: 'RB', par: 'R', x: g.cx + g.dx, y: g.cy + g.dy, rx: g.R3, ry: g.R3 },
    ];
  }
  const cellOf = (s, id) => cellsAt(s).find((c) => c.id === id);
  /* 염색 분체 i (0: 빨강 왼쪽, 1: 빨강 오른쪽, 2: 파랑 왼쪽, 3: 파랑 오른쪽) 의 [세포, 가로, 세로] */
  function slot(kind, s, i) {
    const g = GEO, chr = i >> 1, sis = i & 1, hw = g.cw / 2 + 1, o = g.off, sd = sis ? hw : -hw;
    if (s === 0) return ['c0', (chr ? o * 0.9 : -o * 0.9) + sd, 0];
    if (s === 1) {
      if (kind === 'ndj1') return ['c0', (chr ? -g.pole + o : -g.pole - o) + sd, 0];
      return ['c0', (chr ? g.pole : -g.pole) + sd, 0];
    }
    if (s === 2) {
      if (kind === 'ndj1') return ['L', (chr ? o : -o) + sd, 0];
      return [chr ? 'R' : 'L', sd, 0];
    }
    const up = sis ? g.sep : -g.sep;
    if (s === 3) {
      if (kind === 'normal') return [chr ? 'R' : 'L', 0, up];
      if (kind === 'ndj1') return ['L', chr ? o : -o, up];
      return chr ? ['R', sis ? o * 0.5 : -o * 0.5, -g.sep] : ['L', 0, up];
    }
    if (kind === 'normal') return [['LT', 'LB', 'RT', 'RB'][i], 0, 0];
    if (kind === 'ndj1') return [sis ? 'LB' : 'LT', chr ? o * 0.5 : -o * 0.5, 0];
    return chr ? ['RT', sis ? o * 0.5 : -o * 0.5, 0] : [sis ? 'LB' : 'LT', 0, 0];
  }
  function absPos(kind, s, i) { const sl = slot(kind, s, i), c = cellOf(s, sl[0]); return { x: c.x + sl[1], y: c.y + sl[2] }; }
  /* 생식세포 4개(왼위, 왼아래, 오른위, 오른아래)에 들어 있는 21번 염색체 수 */
  function gameteN21(kind) {
    const r = { LT: 0, LB: 0, RT: 0, RB: 0 };
    for (let i = 0; i < 4; i++) r[slot(kind, 4, i)[0]]++;
    return [r.LT, r.LB, r.RT, r.RB];
  }
  const nTotal = (n21) => 22 + n21;
  const nTag = (n21) => (n21 === 1 ? 'n' : n21 === 2 ? 'n + 1' : 'n − 1');
  const nCol = (n21) => (n21 === 1 ? COLG : n21 === 2 ? COLP : COLM);
  /* 비분리 종류별로 만들어진 생식세포 구성 (24개 / 23개 / 22개 의 개수) */
  function compOf(kind) { const a = gameteN21(kind), r = [0, 0, 0]; a.forEach((n) => { r[n === 2 ? 0 : n === 1 ? 1 : 2]++; }); return r; }

  const me = { kind: 'normal', t: 0, stage: 0, from: 0, to: 0, p: 0, dur: 1.3, moving: false, auto: false, wait: 0, done: { normal: false, ndj1: false, ndj2: false }, cnt: [0, 0, 0, 0], burst: false, ranOnce: false };
  function meReset() { me.t = 0; me.stage = 0; me.moving = false; me.auto = false; me.wait = 0; me.cnt = [0, 0, 0, 0]; me.burst = false; hideHint(); }
  function meKind(k) { if (me.kind === k && me.t === 0) return; me.kind = k; meReset(); updateCtl(); }
  function meGo(s) { me.from = me.t; me.to = s; me.p = 0; me.dur = RM ? 0.01 : 1.3; me.moving = true; }
  function meRun() {
    if (me.moving) return;
    if (me.stage >= 4) meReset();
    me.auto = true; me.wait = me.stage === 0 && me.t === 0 ? 0.35 : 0; me.ranOnce = true; updateCtl();
  }
  function meStep() {
    if (me.moving) return;
    if (me.stage >= 4) { meReset(); updateCtl(); return; }
    me.auto = false; meGo(me.stage + 1); me.ranOnce = true; updateCtl();
  }
  function meArrive(s) {
    me.stage = s;
    if (s === 4 && !me.done[me.kind]) {
      me.done[me.kind] = true; me.auto = false;
      const c = cellsAt(4), n = gameteN21(me.kind);
      c.forEach((cc, k) => parts.burst(cc.x, cc.y, { count: 14, colors: [nCol(n[k]), '#ffffff', '#ffd166'], speed: 150, life: 0.8 }));
      Sound.success();
    } else if (s === 4) { me.auto = false; }
    updateCtl();
  }
  function meUpdate(dt) {
    if (me.moving) {
      me.p += dt / me.dur; const f = Math.min(1, me.p);
      me.t = me.from + (me.to - me.from) * ease.inOutCubic(f);
      if (f >= 1) { me.moving = false; me.t = me.to; meArrive(me.to); me.wait = RM ? 0.05 : 0.75; }
    } else if (me.auto && me.stage < 4) {
      me.wait -= dt; if (me.wait <= 0) meGo(me.stage + 1);
    }
    const tg = gameteN21(me.kind);
    for (let k = 0; k < 4; k++) me.cnt[k] = me.t >= 3.85 ? (RM ? tg[k] : approach(me.cnt[k], tg[k], dt, 5)) : 0;
  }
  const smoothF = (x) => smooth(x);

  function capsule(x, y, col, a) { chromo(x, y, GEO.cw, GEO.ch, col, { alpha: a == null ? 1 : a }); }
  function capsuleSmall(x, y, w, h, col) { chromo(x, y, w, h, col); }

  const MEI_CAP = {
    normal: [['감수 1분열 중기', '복제된 상동 염색체(빨강·파랑) 한 쌍이 세포 가운데에 늘어서요.'], ['감수 1분열 후기', '상동 염색체가 서로 반대쪽 극으로 끌려가요.'], ['감수 1분열 끝', '딸세포 2개가 생겼어요. 염색 분체 2개가 붙은 염색체가 하나씩 들어 있어요.'], ['감수 2분열 후기', '염색 분체가 갈라져 양쪽 극으로 가요.'], ['생식세포 4개', '염색체 21번이 하나씩 들어 있는 세포 4개가 만들어졌어요.']],
    ndj1: [['감수 1분열 중기', '복제된 상동 염색체(빨강·파랑) 한 쌍이 세포 가운데에 늘어서요.'], ['감수 1분열 후기', '상동 염색체가 나뉘지 않고 한쪽 극으로 몰려가요. (비분리)'], ['감수 1분열 끝', '한쪽 딸세포에는 21번이 2개, 다른 쪽에는 하나도 없어요.'], ['감수 2분열 후기', '염색 분체는 정상적으로 갈라져요. 하지만 이미 비정상이에요.'], ['생식세포 4개', '21번 염색체의 수가 정상과 다른 세포가 만들어졌어요.']],
    ndj2: [['감수 1분열 중기', '복제된 상동 염색체(빨강·파랑) 한 쌍이 세포 가운데에 늘어서요.'], ['감수 1분열 후기', '감수 1분열은 정상이에요. 상동 염색체가 반대쪽 극으로 가요.'], ['감수 1분열 끝', '딸세포 2개가 생겼어요. 여기까지는 정상이에요.'], ['감수 2분열 후기', '오른쪽 세포에서 염색 분체가 갈라지지 않고 한쪽 극으로 가요. (비분리)'], ['생식세포 4개', '21번 염색체의 수가 정상과 다른 세포가 만들어졌어요.']],
  };

  function meiosisDraw(dt, t) {
    meUpdate(dt);
    const g = GEO, tt = me.t, st = clamp(Math.round(tt), 0, 4);
    // 설명 칸
    const cap = MEI_CAP[me.kind][st];
    if (PHONE) {
      panel(8, 486, 464, 146, 14, '#fff');
      T(20, 514, KIND_NAME[me.kind] + ' · ' + cap[0], 16, '#1f2d44', 'left', 800);
      textBlock(20, 540, 440, cap[1], 14, '#475569', 20, 700);
      meLegend(20, 596, true);
    } else {
      panel(14, 5, 772, 54, 14, '#fff');
      T(28, 27, KIND_NAME[me.kind] + ' · ' + cap[0], 17, '#1f2d44', 'left', 800);
      TF(28, 49, cap[1], 740, 14, 10.5, '#475569', 'left', 700);
      meLegend(20, 508, false);
    }
    // 세포
    const a = clamp(Math.floor(tt), 0, 3), b = a + 1, f = tt >= 4 ? 1 : smoothF(tt - a);
    const A = cellsAt(a), B = cellsAt(b);
    const fin = clamp((tt - 3.3) / 0.7, 0, 1), n4 = gameteN21(me.kind);
    B.forEach((cb, k) => {
      const pc = A.find((c) => c.id === cb.par) || cb;
      const x = lerp(pc.x, cb.x, f), y = lerp(pc.y, cb.y, f), rx = lerp(pc.rx, cb.rx, f), ry = lerp(pc.ry, cb.ry, f);
      let col = '#d4a373';
      const gi = ['LT', 'LB', 'RT', 'RB'].indexOf(cb.id);
      if (gi >= 0 && fin > 0) col = C.mix('#d4a373', nCol(n4[gi]), fin);
      D.shadow(() => { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.fillStyle = gi >= 0 && fin > 0 ? C.rgba(col, 0.10 + 0.1 * fin) : 'rgba(255,248,235,.95)'; ctx.fill(); }, { blur: 8, y: 2 });
      ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.strokeStyle = col; ctx.lineWidth = gi >= 0 && fin > 0 ? 3.5 : 2.5; ctx.stroke();
    });
    // 방추사
    const pos = [0, 1, 2, 3].map((i) => {
      const p0 = absPos(me.kind, a, i), p1 = absPos(me.kind, b, i);
      return { x: lerp(p0.x, p1.x, f), y: lerp(p0.y, p1.y, f) };
    });
    const aH = 1 - smooth((tt - 1.2) / 0.5);
    if (aH > 0.02) {
      const pxL = g.cx - lerp(g.R1 * 0.93, g.R1 * 1.1, smooth(tt)), pxR = g.cx + lerp(g.R1 * 0.93, g.R1 * 1.1, smooth(tt));
      for (let chr = 0; chr < 2; chr++) {
        const goLeft = chr === 0 || me.kind === 'ndj1';
        const poleX = chr === 0 ? pxL : lerp(pxR, goLeft ? pxL : pxR, smooth(clamp(tt, 0, 1)));
        for (let sI = 0; sI < 2; sI++) {
          const p = pos[chr * 2 + sI];
          ctx.strokeStyle = 'rgba(100,116,139,' + (0.45 * aH) + ')'; ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.moveTo(poleX, g.cy); ctx.lineTo(p.x, p.y - g.ch * 0.18); ctx.moveTo(poleX, g.cy); ctx.lineTo(p.x, p.y + g.ch * 0.18); ctx.stroke();
        }
        ctx.fillStyle = 'rgba(100,116,139,' + (0.7 * aH) + ')'; ctx.beginPath(); ctx.arc(poleX, g.cy, 4, 0, TAU); ctx.fill();
      }
    }
    const aV = smooth((tt - 1.7) / 0.3) * (1 - smooth((tt - 3.15) / 0.4));
    if (aV > 0.02) {
      const cs = cellsAt(3).map((c) => ({ x: c.x, y: c.y, ry: c.ry }));
      cs.forEach((c) => {
        [-1, 1].forEach((sgn) => {
          const py = c.y + sgn * c.ry * 0.9;
          for (let i = 0; i < 4; i++) {
            const p = pos[i]; if (Math.abs(p.x - c.x) > 80) continue;
            if ((sgn < 0) !== (p.y < c.y - 1) && tt > 2.5) continue;
            ctx.strokeStyle = 'rgba(100,116,139,' + (0.4 * aV) + ')'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(c.x, py); ctx.lineTo(p.x, p.y + sgn * g.ch * 0.45); ctx.stroke();
          }
          ctx.fillStyle = 'rgba(100,116,139,' + (0.7 * aV) + ')'; ctx.beginPath(); ctx.arc(c.x, py, 3.5, 0, TAU); ctx.fill();
        });
      });
    }
    // 염색 분체
    const joined = clamp(3 - tt, 0, 1);
    for (let chr = 0; chr < 2; chr++) {
      const col = chr ? COLB : COLR;
      for (let sI = 0; sI < 2; sI++) capsule(pos[chr * 2 + sI].x, pos[chr * 2 + sI].y, col);
      if (joined > 0.05) {
        const m = { x: (pos[chr * 2].x + pos[chr * 2 + 1].x) / 2, y: (pos[chr * 2].y + pos[chr * 2 + 1].y) / 2 };
        ctx.globalAlpha = joined; ctx.fillStyle = '#fff'; ctx.strokeStyle = '#334155'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(m.x, m.y, 3.4, 0, TAU); ctx.fill(); ctx.stroke(); ctx.globalAlpha = 1;
      }
    }
    // 비분리 표시
    if (me.kind === 'ndj1' && tt > 0.85 && tt < 2.3) {
      const al = smooth((tt - 0.85) / 0.3) * (1 - smooth((tt - 2.0) / 0.3));
      const x = (pos[0].x + pos[3].x) / 2, y = Math.min(pos[0].y, pos[3].y) - g.ch * 0.5 - 22;
      ctx.save(); ctx.globalAlpha = al; D.label(x, y, '비분리!', { bg: COLM, size: 15 }); ctx.restore();
    }
    if (me.kind === 'ndj2' && tt > 2.6 && tt < 4.0) {
      const al = smooth((tt - 2.6) / 0.4) * (1 - smooth((tt - 3.7) / 0.3));
      const x = (pos[2].x + pos[3].x) / 2, y = Math.min(pos[2].y, pos[3].y) - g.ch * 0.5 - 22;
      ctx.save(); ctx.globalAlpha = al; D.label(x, y, '비분리!', { bg: COLM, size: 15 }); ctx.restore();
    }
    // 생식세포 이름표와 염색체 수
    if (tt >= 3.7) {
      cellsAt(4).forEach((c, k) => {
        const al = smooth((tt - 3.7) / 0.3), n = n4[k];
        ctx.save(); ctx.globalAlpha = al;
        // 나머지 22개 (회색) — 염색체 수를 22 + 21번으로 보여 줘요
        const gy = c.y + g.R3 * 0.5;
        for (let q = -1; q <= 1; q++) capsuleSmall(c.x + q * 12 - 0, gy, 6, 16, '#94a3b8');
        T(c.x, gy + 22, '+ 나머지 22개', 12, '#64748b', 'center', 700);
        const total = nTotal(n);
        const shown = me.cnt[k] > 0.01 ? Math.round(22 + clamp(me.cnt[k], 0, n)) : 22;
        D.label(c.x, c.y - g.R3 * 0.74, shown + '개' + (shown === total ? ' (' + nTag(n) + ')' : ''), { bg: nCol(n), size: 15 });
        ctx.restore();
      });
    }
  }
  function meLegend(x, y, vertical) {
    capsuleSmall(x + 6, y - 5, 8, 22, COLR); T(x + 20, y + 1, '21번 ① (빨강)', 13, '#334155', 'left', 700);
    capsuleSmall(x + 6 + (vertical ? 120 : 130), y - 5, 8, 22, COLB); T(x + 20 + (vertical ? 120 : 130), y + 1, '21번 ② (파랑)', 13, '#334155', 'left', 700);
    if (!vertical) {
      T(x + 280, y + 1, '염색 분체 2개가 붙은 모양 = 복제된 염색체', 13, '#334155', 'left', 700);
      T(x + 280, y + 22, '나머지 22개 염색체는 모두 정상적으로 나뉜다고 해요.', 13, '#64748b', 'left', 700);
    } else {
      T(x, y + 28, '염색 분체 2개가 붙은 모양 = 복제된 염색체', 13, '#334155', 'left', 700);
    }
  }


  /* =========================================================
     ② 수정 모의: 난자 + 정자 → 자손 핵형 표기
     ========================================================= */
  const COLX = '#ec4899', COLY = '#0ea5e9', COLGR = '#94a3b8';
  const EGG = {
    A: { n21: 1, sex: 'X', lab: '정상 난자' }, B: { n21: 2, sex: 'X', lab: '21번이 2개인 난자' }, C: { n21: 0, sex: 'X', lab: '21번이 없는 난자' },
    D: { n21: 1, sex: 'XX', lab: 'X가 2개인 난자' }, E: { n21: 1, sex: '', lab: '성염색체가 없는 난자' },
  };
  const eggCount = (e) => 21 + e.n21 + e.sex.length;
  function zyOf(eg, sp) {
    const e = EGG[eg], sx = (e.sex + sp).split('').sort().join(''), n21 = e.n21 + 1, tot = 42 + n21 + sx.length;
    let ab = 'none', name = '', note = '';
    if (n21 === 3) { ab = '+21'; name = '다운 증후군'; } else if (n21 === 1) { ab = '-21'; name = '21번 1염색체성'; note = '상염색체가 하나뿐이면 대부분 초기에 유산되어 태어나지 못해요.'; }
    if (n21 === 2) {
      if (sx === 'X') { name = '터너 증후군'; } else if (sx === 'XXY') { name = '클라인펠터 증후군'; } else if (sx === 'XXX') { name = 'X 염색체가 3개인 여성'; } else if (sx === 'Y') { name = '발생하지 못함'; note = 'X 염색체가 하나도 없으면 발생하지 못해요.'; } else name = '정상';
    }
    const notation = tot + ', ' + sx + (ab === 'none' ? '' : ', ' + (ab === '+21' ? '+21' : '−21'));
    return { n21, sx, tot, ab, name, note, notation };
  }
  const FE = PHONE
    ? { eg: { x: 118, y: 118, r: 78 }, sp: { x: 366, y: 118 }, zy: { x: 8, y: 238, w: 464, h: 394 }, sc: 0.78 }
    : { eg: { x: 190, y: 150, r: 104 }, sp: { x: 610, y: 150 }, zy: { x: 120, y: 296, w: 560, h: 252 }, sc: 0.92 };
  const fe = { egg: 'B', sp: 'X', phase: 0, p: 0, done: false, tried: {}, notOk: false, banner: 0, merge: 0 };
  function feReset() { fe.phase = 0; fe.p = 0; fe.done = false; fe.notOk = false; fe.banner = 0; fe.merge = 0; $('#nTot').value = ''; $('#nSex').value = ''; $('#nAb').value = ''; ['nTot', 'nSex', 'nAb'].forEach((i) => $('#' + i).classList.remove('ok', 'bad')); hideHint(); }
  function fertGo() {
    if (fe.phase === 1) return;
    feReset(); fe.phase = 1; fe.p = 0; Sound.click(); updateCtl();
  }
  /* 한 세트의 염색체 모양 (회색 상자 + 21번 + 성염색체)  parts: [{k:'grey', n}, {k:'c21', col}, {k:'X'|'Y'}] */
  function setWidth(parts) { let w = 0; parts.forEach((q, i) => { w += q.k === 'grey' ? 62 : 16; if (i < parts.length - 1) w += 5; }); return w; }
  function drawSet(cx, cy, parts, sc, alpha, labels) {
    ctx.save(); ctx.globalAlpha = alpha == null ? 1 : alpha;
    const tw = setWidth(parts) * sc; let x = cx - tw / 2;
    parts.forEach((q) => {
      const w = (q.k === 'grey' ? 62 : 16) * sc;
      if (q.k === 'grey') {
        D.roundRect(x, cy - 17 * sc, w, 34 * sc, 8 * sc); ctx.fillStyle = '#e2e8f0'; ctx.fill(); ctx.strokeStyle = COLGR; ctx.lineWidth = 1.6; ctx.stroke();
        for (let i = 0; i < 5; i++) chromo(x + (7 + i * 12) * sc, cy, 5 * sc, 22 * sc, COLGR);
        if (labels) T(x + w / 2, cy + 36 * sc + 8, '상염색체 ' + q.n + '개', 12, '#64748b', 'center', 700);
      } else if (q.k === 'c21') {
        chromo(x + w / 2, cy, 9 * sc, 40 * sc, q.col);
        if (labels && !q.noLab) { const m = parts.filter((z) => z.k === 'c21').length; if (q === parts.filter((z) => z.k === 'c21')[0]) T(x + w / 2 + (m - 1) * (w + 5 * sc) / 2, cy - 26 * sc - 4, '21번', 12.5, '#334155', 'center', 800); }
      } else {
        const hh = (q.k === 'X' ? 44 : 28) * sc;
        chromo(x + w / 2, cy, 9 * sc, hh, q.k === 'X' ? COLX : COLY);
        if (labels) T(x + w / 2, cy - 26 * sc - 4, q.k, 13, q.k === 'X' ? '#be185d' : '#0369a1', 'center', 800);
      }
      x += w + 5 * sc;
    });
    ctx.restore();
  }
  const eggParts = (e) => { const a = [{ k: 'grey', n: 21 }]; for (let i = 0; i < e.n21; i++) a.push({ k: 'c21', col: COLR }); e.sex.split('').forEach((s) => { if (s) a.push({ k: s }); }); return a; };
  const spParts = (s) => [{ k: 'grey', n: 21 }, { k: 'c21', col: COLB }, { k: s }];
  function zyParts(eg, sp) {
    const e = EGG[eg], a = [{ k: 'grey', n: 42 }];
    for (let i = 0; i < e.n21; i++) a.push({ k: 'c21', col: COLR });
    a.push({ k: 'c21', col: COLB });
    const sx = (e.sex + sp).split('').sort(); sx.forEach((s) => a.push({ k: s }));
    return a;
  }
  function fertDraw(dt, t) {
    const g = FE, e = EGG[fe.egg];
    if (fe.phase === 1) { fe.p += dt / (RM ? 0.01 : 3.0); if (fe.p >= 1) { fe.p = 1; fe.phase = 2; fe.done = true; fe.tried[fe.egg + fe.sp] = true; const z = g.zy; parts.burst(z.x + z.w / 2, z.y + z.h * 0.42, { count: 26, speed: 190, life: 0.9 }); Sound.success(); updateCtl(); } }
    const p = fe.phase === 0 ? 0 : fe.p;
    const swim = ease.inOutCubic(clamp(p / 0.4, 0, 1)), mov = ease.inOutCubic(clamp((p - 0.55) / 0.45, 0, 1));
    // 난자
    const ex = g.eg.x, ey = g.eg.y, er = g.eg.r;
    D.shadow(() => { ctx.beginPath(); ctx.arc(ex, ey, er, 0, TAU); ctx.fillStyle = '#fff1f5'; ctx.fill(); }, { blur: 10, y: 3 });
    ctx.strokeStyle = '#f0b7c8'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(ex, ey, er, 0, TAU); ctx.stroke();
    ctx.strokeStyle = '#e58aa6'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(ex, ey, er - 4, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.arc(ex, ey, er * 0.7, 0, TAU); ctx.fillStyle = 'rgba(253,164,175,.22)'; ctx.fill(); ctx.strokeStyle = '#f9a8bb'; ctx.lineWidth = 1.5; ctx.stroke();
    // 정자
    const sx0 = g.sp.x, sx1 = ex + er + 46;
    const sx = lerp(sx0, sx1, swim), sy = g.sp.y + (fe.phase === 1 && !RM ? Math.sin(t * 9) * 3 * (1 - swim) : 0);
    const HR = PHONE ? 42 : 52, tl = PHONE ? 50 : 80;
    const tail = (a) => { ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); for (let i = 0; i <= 24; i++) { const u = i / 24, x = sx + HR - 2 + u * tl, y = sy + Math.sin(u * 9 - t * (fe.phase === 1 ? 14 : 3)) * 6 * u; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); };
    if (swim < 1 || fe.phase === 0) tail();
    ctx.save(); ctx.globalAlpha = 1 - smooth((p - 0.5) / 0.1);
    D.shadow(() => { ctx.beginPath(); ctx.ellipse(sx, sy, HR, 30, 0, 0, TAU); ctx.fillStyle = '#e0f2fe'; ctx.fill(); }, { blur: 6, y: 2 });
    ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(sx, sy, HR, 30, 0, 0, TAU); ctx.stroke();
    ctx.restore();
    // 세트 (난자 핵 / 정자 핵)
    const zc = { x: g.zy.x + g.zy.w / 2, y: g.zy.y + g.zy.h * 0.38 };
    fe.merge = fe.phase === 2 ? (RM ? 1 : approach(fe.merge, 1, dt, 5)) : 0;
    const setE = eggParts(e), setS = spParts(fe.sp), zp = zyParts(fe.egg, fe.sp), ZS = PHONE ? 1.05 : 1.25, zw = setWidth(zp) * ZS;
    const eTo = { x: zc.x - zw / 2 + setWidth(setE) * ZS / 2, y: zc.y };
    const sTo = { x: zc.x + zw / 2 - setWidth(setS) * ZS / 2, y: zc.y };
    const eP = { x: lerp(ex, eTo.x, mov), y: lerp(ey, eTo.y, mov) }, sP = { x: lerp(sx, sTo.x, mov), y: lerp(sy, sTo.y, mov) };
    const sc0 = lerp(g.sc * 0.92, ZS, mov);
    if (fe.merge < 0.99) {
      drawSet(eP.x, eP.y, setE, sc0, 1 - fe.merge, mov < 0.05);
      if (fe.phase >= 1) drawSet(sP.x, sP.y, setS, sc0, 1 - fe.merge, false);
    }
    T(ex, ey + er + 22, '난자 · 염색체 ' + eggCount(e) + '개', 15, '#9d174d', 'center', 800);
    T(g.sp.x + (PHONE ? 6 : 20), g.sp.y + 52, '정자 · 염색체 23개', 15, '#075985', 'center', 800);
    if (fe.phase === 0) { // 정자 핵 속 구성 (확대)
      const bx = g.sp.x - 72, by = g.sp.y - 104;
      D.roundRect(bx, by, 150, 54, 12); ctx.fillStyle = '#f0f9ff'; ctx.fill(); ctx.strokeStyle = '#7dd3fc'; ctx.lineWidth = 2; ctx.stroke();
      drawSet(bx + 75, by + 28, setS, 0.78, 1, false);
      ctx.strokeStyle = '#7dd3fc'; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(bx + 75, by + 54); ctx.lineTo(g.sp.x, g.sp.y - 24); ctx.stroke(); ctx.setLineDash([]);
    }
    // 수정란 칸
    const z = g.zy;
    panel(z.x, z.y, z.w, z.h, 16, '#fff');
    T(z.x + 16, z.y + 28, '🥚 + 🏊 수정란', 16, '#334155', 'left', 800);
    if (fe.phase < 2) {
      TF(z.x + z.w / 2, z.y + z.h * 0.5 + 6, fe.phase === 1 ? '수정되는 중…' : '난자와 정자를 고르고 [수정시키기]를 눌러요', z.w - 30, 16, 12, '#94a3b8', 'center', 800);
    } else {
      const zr = zyOf(fe.egg, fe.sp), pts = zp;
      drawSet(zc.x, zc.y, pts, ZS, fe.merge, true);
      fe.banner = approach(fe.banner, zr.tot, dt, 5);
      const shown = Math.min(zr.tot, Math.round(fe.banner));
      const okn = fe.notOk;
      D.label(zc.x, z.y + z.h - 66, '자손의 염색체 수: ' + shown + '개', { bg: shown === zr.tot ? '#0f766e' : '#64748b', size: 16 });
      if (okn) {
        TF(zc.x, z.y + z.h - 30, '핵형 표기: ' + zr.notation + ' · ' + zr.name, z.w - 24, 17, 12, '#166534', 'center', 800);
      } else TF(zc.x, z.y + z.h - 30, '아래에서 핵형 표기를 완성해 보세요', z.w - 24, 15, 12, '#94a3b8', 'center', 800);
      if (okn && zr.note) TF(zc.x, z.y + z.h - 8, zr.note, z.w - 24, 13, 10.5, '#b45309', 'center', 700);
      if (okn && zr.name !== '정상') D.check(z.x + z.w - 30, z.y + 28, 14, 1);
    }
  }
  function fertNot() {
    if (!fe.done) return { ok: false, msg: '먼저 난자와 정자를 골라 [수정시키기]를 눌러 주세요.' };
    const zr = zyOf(fe.egg, fe.sp), n = numOf('nTot'), sx = $('#nSex').value, ab = $('#nAb').value;
    const o = { n: n === zr.tot, s: sx === zr.sx, a: ab === zr.ab };
    return { ok: o.n && o.s && o.a, o, zr };
  }
  function fertNoteUpd() {
    const r = fertNot();
    if (r.o) { $('#nTot').classList.toggle('ok', r.o.n); $('#nSex').classList.toggle('ok', r.o.s); $('#nAb').classList.toggle('ok', r.o.a); }
    fe.notOk = !!r.ok;
    const zr = r.zr; $('#nPrev').innerHTML = r.ok ? '완성! <b>' + zr.notation + '</b> (' + zr.name + ')' : '표기 예: <b>46, XY</b> (수, 성염색체, 이상)';
  }

  /* =========================================================
     핵형 카드 4장 (교육용 가상): 번호별로 모아 놓은 염색체를 세어 판독해요
     ========================================================= */
  const KCARD = [
    { id: 'A', sx: 'X', extra21: 0, n: 45, sex: 'F', dx: 'turner' },
    { id: 'B', sx: 'XY', extra21: 0, n: 46, sex: 'M', dx: 'none' },
    { id: 'C', sx: 'XX', extra21: 1, n: 47, sex: 'F', dx: 'down' },
    { id: 'D', sx: 'XXY', extra21: 0, n: 47, sex: 'M', dx: 'kline' },
  ];
  const DX_NAME = { none: '정상', down: '다운 증후군', turner: '터너 증후군', kline: '클라인펠터 증후군' };
  const kc = { cur: 0, t0: 0, ans: KCARD.map(() => ({ n: '', s: '', d: '' })), bad: KCARD.map(() => false), seen: {} };
  function kcSel(i) {
    kc.cur = i; kc.t0 = performance.now() / 1000; kc.seen[i] = true; chipOn($('#kcSel'), i);
    const a = kc.ans[i]; $('#kN').value = a.n; $('#kS').value = a.s; $('#kD').value = a.d;
    ['kN', 'kS', 'kD'].forEach((id) => $('#' + id).classList.remove('ok', 'bad')); updateCtl();
  }
  function kcStore() { const a = kc.ans[kc.cur]; a.n = $('#kN').value; a.s = $('#kS').value; a.d = $('#kD').value; kc.bad[kc.cur] = false; }
  const kcOk = (i) => { const c = KCARD[i], a = kc.ans[i]; return numOf0(a.n) === c.n && a.s === c.sex && a.d === c.dx; };
  function numOf0(s) { const t = String(s).replace(/[^0-9]/g, ''); return t === '' ? NaN : parseInt(t, 10); }
  const PAIR_H = (i) => Math.round((PHONE ? 52 : 62) - (i - 1) * (PHONE ? 1.4 : 1.7));
  function karyoDraw(dt, t) {
    const c = KCARD[kc.cur], cols = PHONE ? 6 : 8, rows = Math.ceil(23 / cols);
    const X0 = PHONE ? 8 : 14, W0 = PHONE ? 464 : 772, Y0 = PHONE ? 70 : 76, SH = PHONE ? 108 : 128;
    panel(X0, 8, W0, 52, 14, '#fff');
    T(X0 + 14, 31, '핵형 카드 ' + c.id, 18, '#1f2d44', 'left', 800);
    TF(X0 + 14, 51, '교육용 가상 핵형 · 같은 번호끼리 모아 놓았어요. 개수를 세어 보세요.', W0 - 28, 13.5, 10.5, '#64748b', 'left', 700);
    panel(X0, Y0 - 6, W0, rows * SH + 10, 16, '#fff');
    const sw = W0 / cols, now = performance.now() / 1000;
    for (let k = 1; k <= 23; k++) {
      const cx = X0 + ((k - 1) % cols + 0.5) * sw, rowI = Math.floor((k - 1) / cols), cy = Y0 + rowI * SH + SH * 0.44;
      const u = clamp((now - kc.t0 - k * 0.012) / 0.25, 0, 1), sc = RM ? 1 : ease.outBack(u);
      let items;
      if (k <= 22) { const cnt = k === 21 ? 2 + c.extra21 : 2; items = Array.from({ length: cnt }, () => ({ h: PAIR_H(k), col: '#475569' })); }
      else items = c.sx.split('').map((s) => ({ h: s === 'X' ? (PHONE ? 46 : 54) : (PHONE ? 26 : 30), col: s === 'X' ? '#475569' : '#475569', lab: s }));
      const gap = PHONE ? 13 : 16, w0 = -(items.length - 1) * gap / 2;
      ctx.save(); ctx.translate(cx, cy); ctx.scale(sc, sc);
      items.forEach((it, j) => chromo(w0 + j * gap, 0, PHONE ? 8 : 10, it.h, it.col));
      ctx.restore();
      T(cx, cy + (PHONE ? 38 : 46), k === 23 ? '성' : String(k), 14, '#64748b', 'center', 800);
    }
  }


  /* =========================================================
     ③ 구조 이상: 염색체 막대를 잘라 붙여 결실 · 중복 · 역위 · 전좌 만들기
     ========================================================= */
  const GENE_COL = { A: '#ef4444', B: '#f97316', C: '#eab308', D: '#22c55e', E: '#14b8a6', F: '#3b82f6', G: '#8b5cf6', H: '#ec4899' };
  const ORIG = [['A', 'B', 'C', 'D', 'E', 'F'], ['G', 'H']];
  const MAXB = 10;
  let bidSeq = 0;
  const mkBlock = (g, rev) => ({ id: ++bidSeq, g, rev: !!rev, x: -999, y: 0, w: 40, alpha: 1, lift: 0, init: false, tx: 0, ty: 0 });
  const st = { ch: [[], []], sel: [null, null], made: { del: false, dup: false, inv: false, tra: false }, ghosts: [], msg: '', t0: 0 };
  function stBuild(keepMade) {
    st.ch = ORIG.map((a) => a.map((g) => mkBlock(g, false)));
    st.sel = [null, null]; st.ghosts = []; st.msg = '';
    if (!keepMade) st.made = { del: false, dup: false, inv: false, tra: false };
  }
  stBuild();
  const SG = PHONE
    ? { x0: 22, ref: [{ y: 36, h: 26 }, { y: 70, h: 26 }], rbw: 32, ed: [{ y: 146, h: 48 }, { y: 206, h: 48 }], ebw: 52, eMax: 424, pan: { y: 276, h: 356 }, tl: [22, 126] }
    : { x0: 50, ref: [{ y: 44, h: 32 }, { y: 86, h: 32 }], rbw: 46, ed: [{ y: 176, h: 52 }, { y: 244, h: 52 }], ebw: 66, eMax: 680, pan: { y: 324, h: 224 }, tl: [26, 160] };
  function stTargets() {
    st.ch.forEach((arr, c) => {
      const bw = Math.min(SG.ebw, SG.eMax / Math.max(arr.length, ORIG[c].length)), row = SG.ed[c];
      arr.forEach((b, k) => { b.tx = SG.x0 + k * bw; b.ty = row.y; b.tw = bw; });
    });
  }
  function stUpdate(dt) {
    stTargets();
    st.ch.forEach((arr) => arr.forEach((b) => {
      if (!b.init) { b.x = b.tx; b.y = b.ty; b.w = b.tw; b.init = true; }
      b.x = RM ? b.tx : approach(b.x, b.tx, dt, 9); b.y = RM ? b.ty : approach(b.y, b.ty, dt, 9); b.w = RM ? b.tw : approach(b.w, b.tw, dt, 9);
      b.lift = RM ? 0 : approach(b.lift, 0, dt, 4); b.alpha = RM ? 1 : approach(b.alpha, 1, dt, 8);
    }));
    for (let i = st.ghosts.length - 1; i >= 0; i--) { const g = st.ghosts[i]; g.age += dt; g.b.y += 70 * dt; g.b.alpha = Math.max(0, 1 - g.age / 0.7); if (g.age > 0.7) st.ghosts.splice(i, 1); }
  }
  function drawBlock(b, row, first, last, o) {
    o = o || {};
    const x = b.x, y = b.y - b.lift * 22, w = Math.max(6, b.w - 2), h = row.h, col = GENE_COL[b.g] || '#94a3b8', r = 14;
    ctx.save(); ctx.globalAlpha = b.alpha;
    const rl = first ? Math.min(r, h / 2) : 3, rr = last ? Math.min(r, h / 2) : 3;
    const path = () => { ctx.beginPath(); ctx.moveTo(x + rl, y); ctx.lineTo(x + w - rr, y); ctx.arcTo(x + w, y, x + w, y + rr, rr); ctx.lineTo(x + w, y + h - rr); ctx.arcTo(x + w, y + h, x + w - rr, y + h, rr); ctx.lineTo(x + rl, y + h); ctx.arcTo(x, y + h, x, y + h - rl, rl); ctx.lineTo(x, y + rl); ctx.arcTo(x, y, x + rl, y, rl); ctx.closePath(); };
    const gr = ctx.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, C.shade(col, 0.28)); gr.addColorStop(0.5, col); gr.addColorStop(1, C.shade(col, -0.18));
    D.shadow(() => { path(); ctx.fillStyle = gr; ctx.fill(); }, { blur: o.sel ? 10 : 3, y: o.sel ? 4 : 1 });
    path(); ctx.strokeStyle = o.sel ? '#f59e0b' : C.shade(col, -0.35); ctx.lineWidth = o.sel ? 4 : 1.3; ctx.stroke();
    T(x + w / 2, y + h / 2 + 5, b.g, h > 40 ? 20 : 15, '#fff', 'center', 800, { stroke: C.shade(col, -0.45), strokeWidth: 3 });
    // 방향 표시 (▶ / ◀)
    const ay = y + h - 7, ax = x + w / 2;
    ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.beginPath();
    if (b.rev) { ctx.moveTo(ax - 5, ay); ctx.lineTo(ax + 4, ay - 4); ctx.lineTo(ax + 4, ay + 4); } else { ctx.moveTo(ax + 5, ay); ctx.lineTo(ax - 4, ay - 4); ctx.lineTo(ax - 4, ay + 4); }
    ctx.closePath(); if (h > 40) ctx.fill();
    ctx.restore();
  }
  function stInfo() {
    const g1 = st.ch[0].map((b) => b.g), g2 = st.ch[1].map((b) => b.g), all = g1.concat(g2);
    const expect = 'ABCDEFGH'.split('');
    const cnt = {}; all.forEach((g) => { cnt[g] = (cnt[g] || 0) + 1; });
    const missing = expect.filter((g) => !cnt[g]), extra = []; for (const g in cnt) for (let i = 1; i < cnt[g]; i++) extra.push(g);
    const xfer = g1.some((g) => 'GH'.indexOf(g) >= 0) || g2.some((g) => 'ABCDEF'.indexOf(g) >= 0);
    const anyRev = st.ch.some((arr) => arr.some((b) => b.rev));
    const firsts = (arr) => { const seen = [], out = []; arr.forEach((g) => { if (seen.indexOf(g) < 0) { seen.push(g); out.push(g); } }); return out; };
    const asc = (o) => o.every((g, i) => i === 0 || g > o[i - 1]);
    const order = anyRev || !asc(firsts(g1.filter((g) => 'ABCDEF'.indexOf(g) >= 0))) || !asc(firsts(g2.filter((g) => 'GH'.indexOf(g) >= 0)));
    const types = [];
    if (missing.length) types.push('del'); if (extra.length) types.push('dup'); if (xfer) types.push('tra'); if (order) types.push('inv');
    const kind = types.length === 0 ? 'normal' : types.length === 1 ? types[0] : 'mix';
    return { g1, g2, total: all.length, missing, extra, xfer, order, kind, types };
  }
  const KIND_LAB = { normal: ['정상 염색체', '#16a34a'], del: ['결실', '#dc2626'], dup: ['중복', '#d97706'], inv: ['역위', '#7c3aed'], tra: ['전좌', '#0284c7'], mix: ['여러 변화가 섞였어요', '#475569'] };
  function stSelRange(c) { const s = st.sel[c]; return s ? [s.lo, s.hi] : null; }
  function stClick(c, k) {
    const arr = st.ch[c], s = st.sel[c]; Sound.tick();
    if (!s) st.sel[c] = { a: k, lo: k, hi: k };
    else if (s.lo === s.hi && s.a === k) st.sel[c] = null;
    else if (s.lo === s.hi) st.sel[c] = { a: s.a, lo: Math.min(s.a, k), hi: Math.max(s.a, k) };
    else st.sel[c] = { a: k, lo: k, hi: k };
    st.msg = ''; updateCtl();
  }
  function stSlice(c) { const r = stSelRange(c); return r ? st.ch[c].slice(r[0], r[1] + 1) : null; }
  function stOp(kind) {
    const c0 = st.sel[0] ? 0 : st.sel[1] ? 1 : -1;
    if (kind !== 'tra' && c0 < 0) { st.msg = '먼저 염색체의 조각(유전자)을 눌러 고르세요.'; showHint(st.msg); Sound.fail(); return false; }
    if (kind === 'tra' && !(st.sel[0] && st.sel[1])) { st.msg = '전좌는 두 염색체에서 조각을 하나씩(또는 범위로) 골라야 해요.'; showHint(st.msg); Sound.fail(); return false; }
    if (kind === 'del') {
      const [lo, hi] = stSelRange(c0), arr = st.ch[c0];
      if (hi - lo + 1 >= arr.length) { showHint('염색체 전체를 없앨 수는 없어요. 일부 조각만 고르세요.'); Sound.fail(); return false; }
      const out = arr.splice(lo, hi - lo + 1); out.forEach((b) => { b.lift = 0; st.ghosts.push({ b, age: 0 }); });
      FX.add({ kind: 'text', x: SG.x0 + lo * Math.min(SG.ebw, SG.eMax / Math.max(arr.length + out.length, ORIG[c0].length)) + 20, y: SG.ed[c0].y - 6, text: '✂', size: 26, color: '#dc2626', life: 0.9 });
      st.made.del = true; st.sel[c0] = null;
    } else if (kind === 'dup') {
      const [lo, hi] = stSelRange(c0), arr = st.ch[c0], n = hi - lo + 1;
      if (arr.length + n > MAXB) { showHint('염색체가 너무 길어져요. (최대 ' + MAXB + '조각) 더 짧은 범위를 고르세요.'); Sound.fail(); return false; }
      const copies = arr.slice(lo, hi + 1).map((b) => { const nb = mkBlock(b.g, b.rev); nb.x = b.x; nb.y = b.y; nb.w = b.w; nb.init = true; nb.alpha = 0.2; nb.lift = 1; return nb; });
      arr.splice(hi + 1, 0, ...copies); st.made.dup = true; st.sel[c0] = null; Sound.success();
    } else if (kind === 'inv') {
      const [lo, hi] = stSelRange(c0), arr = st.ch[c0];
      if (hi - lo + 1 < 2) { showHint('역위는 2조각 이상을 골라야 뒤집을 수 있어요.'); Sound.fail(); return false; }
      const seg = arr.slice(lo, hi + 1).reverse(); seg.forEach((b) => { b.rev = !b.rev; b.lift = 1; }); arr.splice(lo, hi - lo + 1, ...seg);
      st.made.inv = true; st.sel[c0] = null; Sound.success();
    } else if (kind === 'tra') {
      const [l0, h0] = stSelRange(0), [l1, h1] = stSelRange(1), a = st.ch[0], b = st.ch[1];
      const n0 = h0 - l0 + 1, n1 = h1 - l1 + 1;
      if (a.length - n0 + n1 > MAXB || b.length - n1 + n0 > MAXB) { showHint('염색체가 너무 길어져요. 더 짧은 범위를 고르세요.'); Sound.fail(); return false; }
      const s0 = a.splice(l0, n0), s1 = b.splice(l1, n1); a.splice(l0, 0, ...s1); b.splice(l1, 0, ...s0);
      s0.concat(s1).forEach((x) => { x.lift = 1; });
      st.made.tra = true; st.sel = [null, null]; Sound.success();
    }
    const info = stInfo(); st.msg = ''; hideHint(); updateCtl(); return info.kind;
  }
  function stDraw(dt, t) {
    stUpdate(dt);
    const info = stInfo();
    T(SG.tl[0], PHONE ? 24 : 28, '원래 염색체 (기준)', PHONE ? 15 : 16, '#334155', 'left', 800);
    SG.ref.forEach((row, c) => {
      const n = ORIG[c].length;
      ORIG[c].forEach((g, k) => drawBlock({ g, rev: false, x: SG.x0 + k * SG.rbw, y: row.y, w: SG.rbw, alpha: 1, lift: 0 }, row, k === 0, k === n - 1));
      T(SG.x0 + n * SG.rbw + 10, row.y + row.h / 2 + 5, c === 0 ? '염색체 ①' : '염색체 ②', 13, '#64748b', 'left', 700);
    });
    T(SG.tl[0], SG.tl[1] - (PHONE ? 6 : 12), '내 염색체  (조각을 눌러 고른 뒤 아래 도구를 눌러요)', PHONE ? 14 : 16, '#334155', 'left', 800);
    st.ch.forEach((arr, c) => {
      const row = SG.ed[c], sel = st.sel[c];
      D.roundRect(SG.x0 - 12, row.y - 8, (PHONE ? 440 : 716), row.h + 16, 14); ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fill(); ctx.strokeStyle = '#dbe3ec'; ctx.lineWidth = 1.5; ctx.stroke();
      arr.forEach((b, k) => drawBlock(b, row, k === 0, k === arr.length - 1, { sel: sel && k >= sel.lo && k <= sel.hi }));
    });
    st.ghosts.forEach((g) => { drawBlock(g.b, SG.ed[0], true, true); });
    // 분석 칸
    const P = SG.pan, X = PHONE ? 8 : 14, W = PHONE ? 464 : 772;
    panel(X, P.y, W, P.h, 16, '#fff');
    const kl = KIND_LAB[info.kind];
    D.label(X + 24, P.y + 26, '지금 상태: ' + kl[0], { bg: kl[1], size: PHONE ? 15 : 17, align: 'left' });
    const seq = (arr) => arr.map((b) => (b.rev ? b.g + '′' : b.g)).join(' ');
    const lh = PHONE ? 22 : 26, fs = PHONE ? 14 : 16;
    T(X + 24, P.y + 64, '염색체 ①  ' + seq(st.ch[0]), fs, '#26324a', 'left', 800);
    T(X + 24, P.y + 64 + lh, '염색체 ②  ' + seq(st.ch[1]), fs, '#26324a', 'left', 800);
    const diff = info.total - 8;
    TF(X + 24, P.y + 64 + lh * 2, '유전자 수  정상 8개 → 지금 ' + info.total + '개 ' + (diff === 0 ? '(양은 같아요)' : diff > 0 ? '(' + diff + '개 늘었어요)' : '(' + (-diff) + '개 줄었어요)'), W - 48, fs, 11, diff === 0 ? '#475569' : '#b45309', 'left', 800);
    const EX = { normal: '조각을 골라 결실 · 중복 · 역위 · 전좌를 만들어 보세요. (′ 표시는 방향이 거꾸로라는 뜻이에요)', del: '유전자 ' + info.missing.join(' · ') + '이(가) 사라져서 유전자의 양이 줄었어요.', dup: '유전자 ' + Array.from(new Set(info.extra)).join(' · ') + '이(가) 두 번 들어 있어서 양이 늘었어요.', inv: '조각의 방향이 거꾸로 되었어요. 유전자 양은 같지만 배열이 달라졌어요.', tra: '서로 다른 염색체(비상동 염색체) 사이에서 조각이 바뀌었어요. 유전자 양은 같지만 유전자가 있는 염색체가 달라졌어요.', mix: info.types.map((q) => KIND_LAB[q][0]).join(' · ') + '이(가) 함께 일어났어요. [처음 염색체로]를 눌러 하나씩 만들어 보세요.' };
    textBlock(X + 24, P.y + 64 + lh * 3 - 2, W - 48, EX[info.kind], PHONE ? 14 : 15, '#334155', PHONE ? 20 : 21, 700);
    // 만든 종류 표시
    const mk = [['del', '결실'], ['dup', '중복'], ['inv', '역위'], ['tra', '전좌']];
    mk.forEach((q, i) => {
      const bx = X + 24 + i * (PHONE ? 108 : 120), by = P.y + P.h - 24;
      D.label(bx, by, (st.made[q[0]] ? '✔ ' : '') + q[1], { bg: st.made[q[0]] ? KIND_LAB[q[0]][1] : '#e2e8f0', color: st.made[q[0]] ? '#fff' : '#64748b', size: 14, align: 'left' });
    });
  }
  const stPT = {
    down(p) {
      for (let c = 0; c < 2; c++) {
        const row = SG.ed[c];
        if (p.y >= row.y - 8 && p.y <= row.y + row.h + 8) {
          const arr = st.ch[c];
          for (let k = arr.length - 1; k >= 0; k--) { const b = arr[k]; if (p.x >= b.x && p.x <= b.x + b.w) { stClick(c, k); return false; } }
        }
      }
      return false;
    },
    hover(p) { for (let c = 0; c < 2; c++) { const row = SG.ed[c]; if (p.y >= row.y && p.y <= row.y + row.h && st.ch[c].some((b) => p.x >= b.x && p.x <= b.x + b.w)) return 'pointer'; } return 'default'; },
  };

  /* =========================================================
     사례 연결 (교육용 요약)
     ========================================================= */
  const CASES = [
    { t: '고양이 울음 증후군', s: '5번 염색체 짧은 팔의 일부가 없어요. 아기의 울음소리가 고양이 울음처럼 들려서 붙은 이름이에요.', ans: 'del' },
    { t: '필라델피아 염색체', s: '9번과 22번 염색체 사이에서 조각이 서로 옮겨 붙었어요. 일부 백혈병 세포(체세포)에서 생겨요.', ans: 'tra' },
    { t: '가상 사례 가', s: '어떤 염색체에서 유전자 C D 부분이 한 번 더 반복해서 들어 있어요.', ans: 'dup' },
    { t: '가상 사례 나', s: '어떤 염색체에서 유전자 C D E 부분이 거꾸로 붙어 있어요. 유전자 양은 그대로예요.', ans: 'inv' },
  ];
  const TYPE_OPT = [['', '유형 고르기'], ['del', '결실'], ['dup', '중복'], ['inv', '역위'], ['tra', '전좌']];
  TYPE_OPT.forEach((o) => { for (let i = 0; i < 4; i++) { const e = document.createElement('option'); e.value = o[0]; e.textContent = o[1]; $('#cs' + i).appendChild(e); } });
  const caseAns = () => [0, 1, 2, 3].map((i) => $('#cs' + i).value);
  function miniSeq(x, y, seq, bw, h, revIdx) {
    seq.forEach((g, k) => drawBlock({ g, rev: revIdx && revIdx.indexOf(k) >= 0, x: x + k * bw, y, w: bw, alpha: 1, lift: 0 }, { h }, k === 0, k === seq.length - 1));
  }
  function casesDraw(dt, t) {
    const W = PHONE ? 464 : 380, H = PHONE ? 148 : 236, pos = PHONE ? [[8, 8], [8, 164], [8, 320], [8, 476]] : [[14, 10], [406, 10], [14, 268], [406, 268]];
    const ans = caseAns();
    CASES.forEach((c, i) => {
      const [x, y] = pos[i];
      panel(x, y, W, H, 16, '#fff');
      const ok = ans[i] && ans[i] === c.ans, bad = ans[i] && ans[i] !== c.ans;
      ctx.strokeStyle = ok ? '#16a34a' : bad ? '#dc2626' : '#e2e8f0'; ctx.lineWidth = ok || bad ? 3 : 1.5; D.roundRect(x, y, W, H, 16); ctx.stroke();
      T(x + 14, y + 26, c.t, PHONE ? 16 : 17, '#1f2d44', 'left', 800);
      if (ans[i]) D.label(x + W - 14, y + 24, TYPE_OPT.find((q) => q[0] === ans[i])[1], { bg: ok ? '#16a34a' : '#dc2626', size: 13, align: 'right' });
      textBlock(x + 14, y + 52, W - 28, c.s, PHONE ? 13 : 14, '#475569', PHONE ? 18 : 20, 700);
      const dy = y + H - (PHONE ? 58 : 92);
      if (i === 0) {
        const bwid = PHONE ? 150 : 200;
        T(x + 14, dy - 4 + 2, '5번', 13, '#64748b', 'left', 800);
        D.roundRect(x + 50, dy - 10, bwid, 22, 11); ctx.fillStyle = '#c7d2fe'; ctx.fill(); ctx.strokeStyle = '#6366f1'; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.setLineDash([4, 3]); ctx.strokeStyle = '#dc2626'; ctx.strokeRect(x + 50, dy - 8, bwid * 0.28, 18); ctx.setLineDash([]);
        T(x + 50, dy + 30, '점선 부분(짧은 팔 일부)이 없어요', 12.5, '#b91c1c', 'left', 800);
      } else if (i === 1) {
        const bwid = PHONE ? 120 : 160;
        [['9', 0, '#fbbf24', '#38bdf8'], ['22', 1, '#38bdf8', '#fbbf24']].forEach((q) => {
          const yy = dy - 10 + q[1] * 26;
          T(x + 14, yy + 14, q[0] + '번', 13, '#64748b', 'left', 800);
          D.roundRect(x + 50, yy, bwid * 0.6, 20, 10); ctx.fillStyle = q[1] ? '#38bdf8' : '#fbbf24'; ctx.fill();
          D.roundRect(x + 50 + bwid * 0.6, yy, bwid * 0.4, 20, 10); ctx.fillStyle = q[1] ? '#fbbf24' : '#38bdf8'; ctx.fill();
        });
        T(x + 50, dy + 54 + (PHONE ? -8 : 0), '끝부분이 서로 바뀌었어요', 12.5, '#0369a1', 'left', 800);
      } else if (i === 2) { miniSeq(x + 50, dy, ['A', 'B', 'C', 'D', 'C', 'D', 'E', 'F'], PHONE ? 30 : 36, 28); }
      else { miniSeq(x + 50, dy, ['A', 'B', 'E', 'D', 'C', 'F'], PHONE ? 32 : 40, 28, [2, 3, 4]); }
    });
  }


  /* =========================================================
     ④ 발생 빈도: 산모 나이별 다운 증후군 (예시 값)
     ========================================================= */
  const AGES = [20, 30, 35, 40, 45], DEN = [1500, 900, 350, 100, 30];
  const per1000 = (i) => 1000 / DEN[i];
  const fr = { sel: -1, seen: {}, draw: 0, ev: 0, solved: false };
  function frPick(age) { const i = AGES.indexOf(age); if (i < 0) return; fr.sel = i; fr.seen[age] = true; Sound.click(); if (frOk()) fr.solved = true; updateCtl(); }
  const frOk = () => { const v = parseFloat(String($('#fqR').value).replace(/[^0-9.]/g, '')); return isFinite(v) && v >= 14 && v <= 16 && fr.seen[20] && fr.seen[40]; };
  const FRG = PHONE
    ? { px: 8, py: 8, pw: 464, ph: 318, x0: 62, x1: 440, yT: 58, yB: 244, cl: { x: 8, y: 334, w: 464, h: 298 } }
    : { px: 14, py: 8, pw: 772, ph: 318, x0: 92, x1: 740, yT: 60, yB: 246, cl: { x: 14, y: 334, w: 772, h: 214 } };
  const YMAX = 35;
  const frX = (age) => FRG.x0 + (age - 20) / 25 * (FRG.x1 - FRG.x0), frY = (v) => FRG.yB - clamp(v, 0, YMAX) / YMAX * (FRG.yB - FRG.yT);
  function freqDraw(dt, t) {
    const G = FRG; if (!fr.solved && frOk()) fr.solved = true;
    fr.draw = RM ? 1 : approach(fr.draw, 1, dt, 1.6);
    fr.ev = approach(fr.ev, fr.solved ? 1 : 0, dt, 1.5);
    panel(G.px, G.py, G.pw, G.ph, 16, '#fff');
    T(G.px + 16, G.py + 26, '산모 나이별 다운 증후군 빈도 (예시 값)', PHONE ? 15 : 17, '#1f2d44', 'left', 800);
    T(G.px + 16, G.py + 46, '신생아 1000명 중 다운 증후군인 아기 수', 13, '#64748b', 'left', 700);
    for (let v = 0; v <= 30; v += 10) { const y = frY(v); ctx.strokeStyle = v === 0 ? '#94a3b8' : '#e2e8f0'; ctx.lineWidth = v === 0 ? 1.8 : 1; ctx.beginPath(); ctx.moveTo(G.x0 - 8, y); ctx.lineTo(G.x1 + 16, y); ctx.stroke(); T(G.x0 - 14, y + 4, String(v), 12.5, '#64748b', 'right', 700); }
    T(G.x0 + (G.x1 - G.x0) / 2, G.yB + 42, '산모 나이 (세)', 13, '#64748b', 'center', 700);
    AGES.forEach((a) => { T(frX(a), G.yB + 20, String(a), 13.5, '#334155', 'center', 800); });
    // 선 (왼쪽에서 오른쪽으로 그려져요)
    const k = fr.draw * (AGES.length - 1);
    ctx.strokeStyle = '#16a34a'; ctx.lineWidth = 3.5; ctx.lineJoin = 'round'; ctx.beginPath();
    for (let i = 0; i < AGES.length; i++) {
      const u = Math.min(1, Math.max(0, k - (i - 1)));
      if (i === 0) ctx.moveTo(frX(AGES[0]), frY(per1000(0)));
      else if (u > 0) ctx.lineTo(lerp(frX(AGES[i - 1]), frX(AGES[i]), u), lerp(frY(per1000(i - 1)), frY(per1000(i)), u));
    }
    ctx.stroke();
    AGES.forEach((a, i) => {
      if (k < i - 0.05) return;
      const x = frX(a), y = frY(per1000(i)), on = fr.sel === i, seen = fr.seen[a];
      if (on) { D.dashedLine(x, y, x, G.yB, { color: '#f59e0b', width: 2 }); D.ring(x, y, 12, t, { color: '#f59e0b' }); }
      D.sphere(x, y, on ? 9 : 7, seen ? '#16a34a' : '#64748b', { shadow: true });
      if (seen) {
        const txt = '약 1/' + DEN[i];
        const ly = y - 22 < G.yT - 6 ? y + 26 : y - 18;
        D.label(Math.min(x, G.x1 - 18), ly, txt, { bg: on ? '#f59e0b' : '#0f766e', size: 13 });
      }
    });
    if (fr.sel >= 0) TF(G.px + G.pw / 2, G.py + G.ph - 14, AGES[fr.sel] + '세 산모: 약 1/' + DEN[fr.sel] + ' (1000명당 약 ' + fmtN(per1000(fr.sel), 1) + '명)', G.pw - 30, 15, 11, '#92400e', 'center', 800);
    else TF(G.px + G.pw / 2, G.py + G.ph - 14, '나이를 눌러 빈도를 읽어 보세요 (점을 눌러도 돼요)', G.pw - 30, 14, 11, '#94a3b8', 'center', 800);
    // 주장과 근거
    const c = G.cl; panel(c.x, c.y, c.w, c.h, 16, '#fff');
    D.label(c.x + 16, c.y + 26, '주장', { bg: '#7c3aed', size: 13, align: 'left' });
    TF(c.x + 72, c.y + 31, '"염색체 이상은 항상 부모에게 물려받는다"', c.w - 90, PHONE ? 15 : 17, 12, '#1f2d44', 'left', 800);
    const ev = [
      ['만약 유전이라면', '산모의 나이와 상관없이 빈도가 비슷해야 해요.'],
      ['그래프에서는', '나이가 많을수록 빈도가 크게 늘어요. (40세는 20세의 약 15배)'],
      ['해석', '나이든 난모세포는 감수 분열 때 비분리가 일어날 가능성이 더 커져요. 부모에게서 유전되는 것이 아니라 생식세포를 만들 때 우연히 생겨요.'],
    ];
    let yy = c.y + 62;
    ev.forEach((q, i) => {
      const al = clamp(fr.ev * 3 - i, 0, 1);
      ctx.save(); ctx.globalAlpha = al;
      D.label(c.x + 16, yy, q[0], { bg: i === 2 ? '#16a34a' : '#0f766e', size: 12.5, align: 'left' });
      const tx = PHONE ? c.x + 16 : c.x + 150, ty = PHONE ? yy + 24 : yy + 5;
      const h = textBlock(tx, ty, c.w - (tx - c.x) - 16, q[1], PHONE ? 13 : 14, '#334155', PHONE ? 18 : 20, 700);
      ctx.restore(); yy += PHONE ? h + 40 : Math.max(36, h + 14);
    });
    if (!fr.solved) TF(c.x + c.w / 2, c.y + c.h - 24, '비율을 구하면 근거가 차례로 나타나요', c.w - 30, 14, 11, '#94a3b8', 'center', 800);
  }
  const frPT = {
    down(p) {
      let best = -1, bd = 28;
      AGES.forEach((a, i) => { const d = Math.hypot(p.x - frX(a), p.y - frY(per1000(i))); if (d < bd) { bd = d; best = i; } });
      if (best >= 0) frPick(AGES[best]); return false;
    },
    hover(p) { return AGES.some((a, i) => Math.hypot(p.x - frX(a), p.y - frY(per1000(i))) < 28) ? 'pointer' : 'default'; },
  };

  /* =========================================================
     화면 전환 · 조작 연결
     ========================================================= */
  const PTS = { struct: stPT, freq: frPT };
  function setMode(m) {
    if (S.mode !== m) S.fade = 1;
    S.mode = m; PT = PTS[m] || null; hideHint();
    if (m === 'karyo') { kc.t0 = performance.now() / 1000; kcSel(kc.cur); }
    if (m === 'freq') fr.draw = RM ? 1 : 0;
    updateCtl();
  }
  function setRowInputs() {
    [['0', 'normal'], ['1', 'ndj1'], ['2', 'ndj2']].forEach(([r, kind]) => {
      const ids = ['24', '23', '22'].map((c) => $('#r' + r + '_' + c));
      ids.forEach((e) => { e.disabled = !me.done[kind] || r === '0'; });
      if (r === '0') { const cp = compOf('normal'); ids.forEach((e, i) => { e.value = me.done.normal ? String(cp[i]) : ''; }); }
      const vals = ids.map((e) => numOf0(e.value));
      if (r !== '0') {
        const full = vals.every((v) => isFinite(v)), cp = compOf(kind), ok = full && vals.every((v, i) => v === cp[i]);
        ids.forEach((e) => { e.classList.toggle('ok', ok); e.classList.toggle('bad', full && !ok); });
      } else ids.forEach((e) => e.classList.toggle('ok', me.done.normal));
    });
  }
  const rowOk = (r, kind) => { const v = ['24', '23', '22'].map((c) => numOf0($('#r' + r + '_' + c).value)), cp = compOf(kind); return me.done[kind] && v.every((x, i) => x === cp[i]); };
  function updateCtl() {
    const fr0 = game ? game.free : false, lvNow = game ? game.level : 0;
    ctlNodes.forEach((n) => { n.hidden = (n.dataset.modes || '').split(' ').indexOf(S.mode) < 0; });
    modeButtons(S.mode, lvNow, fr0);
    chipOn($('#kindSel'), me.kind);
    $$('#kindSel button').forEach((b) => b.classList.toggle('seen', !!me.done[b.dataset.v]));
    const busy = me.moving || me.auto;
    $('#meRun').disabled = busy; $('#meStep').disabled = busy;
    $('#meRun').textContent = me.stage >= 4 ? '↺ 다시 실행' : me.stage > 0 && !busy ? '▶ 이어서 실행' : '▶ 끝까지 실행';
    $('#meStep').textContent = me.stage >= 4 ? '↺ 처음 단계로' : '⏭ 한 단계씩';
    setRowInputs();
    chipOn($('#eggSel'), fe.egg); chipOn($('#spSel'), fe.sp);
    $('#fertGo').disabled = fe.phase === 1; $('#notBox').hidden = !fe.done;
    $$('#eggSel button, #spSel button').forEach((b) => { b.disabled = fe.phase === 1; });
    chipOn($('#kcSel'), kc.cur);
    $$('#kcSel button').forEach((b) => b.classList.toggle('seen', !!kc.seen[b.dataset.v]));
    const hasSel = !!(st.sel[0] || st.sel[1]);
    $('#opDel').disabled = !hasSel; $('#opDup').disabled = !hasSel; $('#opInv').disabled = !hasSel; $('#opTra').disabled = !(st.sel[0] && st.sel[1]);
    $('#stMade').innerHTML = [['del', '결실'], ['dup', '중복'], ['inv', '역위'], ['tra', '전좌']].map(([k, n]) => '<li class="' + (st.made[k] ? 'on' : '') + '">' + (st.made[k] ? '✅' : '⬜') + ' ' + n + ' 만들기</li>').join('');
    chipOn($('#ageSel'), fr.sel >= 0 ? AGES[fr.sel] : -1);
    $$('#ageSel button').forEach((b) => b.classList.toggle('seen', !!fr.seen[b.dataset.v]));
  }
  bindModes(setMode);
  $$('#kindSel button').forEach((b) => b.addEventListener('click', () => { Sound.click(); if (me.moving || me.auto) return; meKind(b.dataset.v); }));
  $('#meRun').addEventListener('click', () => { Sound.click(); meRun(); });
  $('#meStep').addEventListener('click', () => { Sound.click(); meStep(); });
  $$('#recTbl input').forEach((e) => e.addEventListener('input', () => { updateCtl(); }));
  $$('#eggSel button').forEach((b) => b.addEventListener('click', () => { Sound.click(); fe.egg = b.dataset.v; feReset(); updateCtl(); }));
  $$('#spSel button').forEach((b) => b.addEventListener('click', () => { Sound.click(); fe.sp = b.dataset.v; feReset(); updateCtl(); }));
  $('#fertGo').addEventListener('click', fertGo);
  ['nTot', 'nSex', 'nAb'].forEach((id) => $('#' + id).addEventListener('input', () => { $('#' + id).classList.remove('ok'); fertNoteUpd(); }));
  ['nSex', 'nAb'].forEach((id) => $('#' + id).addEventListener('change', fertNoteUpd));
  $$('#kcSel button').forEach((b) => b.addEventListener('click', () => { Sound.click(); kcStore(); kcSel(+b.dataset.v); }));
  ['kN', 'kS', 'kD'].forEach((id) => { $('#' + id).addEventListener('input', () => { kcStore(); $('#' + id).classList.remove('bad'); updateCtl(); }); $('#' + id).addEventListener('change', () => { kcStore(); updateCtl(); }); });
  $('#opDel').addEventListener('click', () => { Sound.click(); stOp('del'); });
  $('#opDup').addEventListener('click', () => { Sound.click(); stOp('dup'); });
  $('#opInv').addEventListener('click', () => { Sound.click(); stOp('inv'); });
  $('#opTra').addEventListener('click', () => { Sound.click(); stOp('tra'); });
  $('#stReset').addEventListener('click', () => { Sound.click(); stBuild(true); hideHint(); updateCtl(); });
  [0, 1, 2, 3].forEach((i) => $('#cs' + i).addEventListener('change', () => updateCtl()));
  $$('#ageSel button').forEach((b) => b.addEventListener('click', () => frPick(+b.dataset.v)));
  $('#fqR').addEventListener('input', () => { const ok = frOk(); $('#fqR').classList.toggle('ok', ok); if (ok) fr.solved = true; updateCtl(); });


  /* =========================================================
     미션
     ========================================================= */
  const kcAllIn = (i) => { const a = kc.ans[i]; return a.n !== '' && a.s !== '' && a.d !== ''; };
  const levels = [
    {
      title: '감수 분열과 비분리', short: '비분리', icon: '🧫', phase: '모형',
      intro: '<p class="si-q">❓ 탐구 질문: 감수 분열에서 염색체가 나뉘지 않으면 자손의 염색체는 어떻게 될까?</p><p>🔗 <b>생명과학</b>에서 감수 분열과 상동 염색체의 분리, 핵형 분석을 배웠어요. 이제 염색체가 <b>나뉘지 않는 비분리</b>가 생식세포를 어떻게 바꾸는지 세어 봐요.</p><p>사람의 <b>21번 염색체 한 쌍</b>만 따라가며 정상 분열, 감수 1분열 비분리, 감수 2분열 비분리를 실행해 <b>생식세포 4개의 염색체 수</b>를 표에 기록해요. 나머지 22개 염색체는 정상적으로 나뉜다고 해요.</p>',
      features: ['meiosis'],
      setup() { me.kind = 'normal'; meReset(); setMode('meiosis'); },
      recap: '감수 1분열에서 비분리가 일어나면 생식세포 4개가 모두 비정상(n + 1이 2개, n − 1이 2개)이고, 감수 2분열에서 일어나면 정상 2개, n + 1 1개, n − 1 1개예요.',
      summary: '<ul><li><b>비분리</b>: 감수 분열 중 염색체(또는 염색 분체)가 나뉘지 않고 한쪽 극으로 몰리는 현상이에요.</li><li><b>감수 1분열 비분리</b>: 상동 염색체가 갈라지지 않아 딸세포가 (n + 1)과 (n − 1)이 돼요 → 감수 2분열 후 생식세포 4개가 모두 비정상이에요. 21번 기준 염색체 수는 <b>24 · 24 · 22 · 22</b>.</li><li><b>감수 2분열 비분리</b>: 감수 1분열은 정상이고, 한쪽 딸세포에서만 염색 분체가 갈라지지 않아요 → 정상(23) 2개, n + 1 (24) 1개, n − 1 (22) 1개 = <b>23 · 23 · 24 · 22</b>.</li><li>사람의 정상 생식세포는 염색체가 n = 23개예요.</li></ul>',
      missions: [
        {
          id: 'run', title: '세 가지 분열을 실행하고 표 채우기',
          goal: '<b>정상 · 1분열 비분리 · 2분열 비분리</b>를 모두 실행하고, 두 비분리에서 만들어진 <b>생식세포 4개의 염색체 수</b>를 표에 기록하세요.',
          hint: '방식을 고르고 [끝까지 실행]을 눌러요. 끝나면 생식세포마다 적힌 염색체 수(24개 · 23개 · 22개)가 각각 몇 개인지 세어 표에 적어요. 4개를 합치면 4가 돼요.',
          setup() { me.done = { normal: false, ndj1: false, ndj2: false }; $$('#recTbl input').forEach((e) => { e.value = ''; e.classList.remove('ok', 'bad'); }); me.kind = 'normal'; meReset(); setMode('meiosis'); },
          check: () => me.done.normal && me.done.ndj1 && me.done.ndj2 && rowOk(1, 'ndj1') && rowOk(2, 'ndj2'), hold: 0.8,
          status: () => mark(me.done.normal) + ' 정상 &nbsp; ' + mark(me.done.ndj1) + ' 1분열 비분리 &nbsp; ' + mark(me.done.ndj2) + ' 2분열 비분리<br>' + mark(rowOk(1, 'ndj1')) + ' 1분열 표 &nbsp; ' + mark(rowOk(2, 'ndj2')) + ' 2분열 표',
          explain: '<b>감수 1분열 비분리</b>는 상동 염색체가 한쪽으로 몰려 두 딸세포가 (n + 1)과 (n − 1)이 돼요. 감수 2분열은 정상으로 진행되어도 생식세포 4개가 <b>24 · 24 · 22 · 22</b>로 모두 비정상이에요. <b>감수 2분열 비분리</b>는 한쪽 딸세포에서만 염색 분체가 갈라지지 않아 <b>23 · 23 · 24 · 22</b>, 즉 정상 2개 + 비정상 2개예요.',
        },
        {
          type: 'quiz', title: '1분열 비분리의 생식세포',
          goal: '감수 <b>1분열</b>에서 비분리가 일어났어요. 정상(염색체 23개) 생식세포가 만들어질까요?',
          setup() { setMode('meiosis'); },
          choices: ['네. 감수 2분열이 정상이면 정상 생식세포 2개가 만들어진다', '아니요. 생식세포 4개가 모두 비정상이다 (n + 1이 2개, n − 1이 2개)', '네. 4개 중 2개는 정상이다', '아니요. 하지만 비정상 생식세포는 1개뿐이다'],
          answer: 1,
          feedback: ['감수 1분열에서 이미 한쪽은 21번이 2개, 다른 쪽은 0개가 되어 감수 2분열이 정상이어도 4개 모두 비정상이에요.', '', '정상 생식세포가 2개 남는 것은 감수 2분열 비분리일 때예요.', '두 딸세포가 각각 2개씩 비정상 생식세포를 만들어서 4개 모두 비정상이에요.'],
          explain: '감수 1분열에서 상동 염색체가 한쪽으로 몰리면 딸세포는 (n + 1)과 (n − 1)이에요. 각각 감수 2분열을 하면 <b>(n + 1) 2개와 (n − 1) 2개</b>가 되어 정상 생식세포는 하나도 없어요.',
        },
      ],
    },
    {
      title: '수 이상: 자손의 핵형', short: '수 이상', icon: '🥚', phase: '모형',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 비분리로 21번이 2개인 생식세포(n + 1)와 없는 생식세포(n − 1)가 만들어졌어요.</div><p>이런 생식세포가 정상 생식세포와 <b>수정</b>하면 자손의 염색체 수는 어떻게 될까요? 난자와 정자를 골라 수정시키고 자손의 <b>핵형 표기</b>를 완성해요. 이어서 <b>핵형 카드</b> 4장을 판독해요.</p><p>💡 핵형 표기는 <b>염색체 수, 성염색체, 이상</b> 순서예요. 예) 46, XY / 47, XX, +21. 모든 카드는 교육용 가상 자료예요.</p>',
      features: ['fert', 'karyo'],
      setup() { setMode('fert'); },
      recap: '비정상 난자(24개)와 정상 정자가 만나면 47개의 3염색체성, 22개와 만나면 45개의 1염색체성이 돼요. 다운 증후군은 47, +21, 터너 증후군은 45, X, 클라인펠터 증후군은 47, XXY예요.',
      summary: '<ul><li>정상 난자 23개 + 정상 정자 23개 = <b>46개</b>. 비정상 난자 24개(21번 2개) + 정상 정자 = <b>47개 (3염색체성)</b>, 22개(21번 없음) + 정자 = 45개 (1염색체성)예요.</li><li><b>다운 증후군</b>: 21번 염색체가 3개 → 47, XX 또는 XY, +21.</li><li><b>터너 증후군</b>: X 염색체가 하나뿐 → 45, X. <b>클라인펠터 증후군</b>: X가 2개 + Y → 47, XXY.</li><li>상염색체의 1염색체성은 대부분 초기에 유산되지만, X 염색체의 1염색체성(터너 증후군)은 태어날 수 있어요. (X 염색체의 불활성화 등 이름 수준으로만)</li></ul>',
      missions: [
        {
          id: 'fert', title: '수정 모의와 핵형 표기',
          goal: '<b>21번 염색체가 2개인 난자(24개)</b>를 정자와 수정시키고, 자손의 핵형 표기를 <b>염색체 수 · 성염색체 · 이상</b>으로 완성하세요.',
          hint: '난자 고르기에서 \'21번 2개 (24개)\'를 고르고 정자(X 또는 Y)를 골라 [수정시키기]를 눌러요. 난자 24개 + 정자 23개 = 47개. 21번이 3개이므로 이상은 +21이에요.',
          setup() { fe.egg = 'B'; fe.sp = 'X'; feReset(); setMode('fert'); updateCtl(); },
          check: () => fe.done && fe.egg === 'B' && fertNot().ok, hold: 0.8,
          status: () => mark(fe.egg === 'B') + ' 난자: 21번 2개 &nbsp; ' + mark(fe.done && fe.egg === 'B') + ' 수정 &nbsp; ' + mark(fe.done && fe.egg === 'B' && fertNot().ok) + ' 표기 완성',
          explain: '24개 + 23개 = <b>47개</b>이고, 21번 염색체가 3개가 되므로 <b>+21</b>이에요. 정자가 X이면 47, XX, +21, Y이면 47, XY, +21 — 모두 <b>다운 증후군</b>의 핵형이에요. 대부분의 다운 증후군은 생식세포를 만들 때 우연히 생긴 비분리로 일어나요.',
        },
        {
          id: 'karyo', title: '핵형 카드 4장 판독', manual: true,
          goal: '핵형 카드 A ~ D의 <b>염색체 수 · 성별 · 판독 결과</b>를 모두 입력하고 확인하세요.',
          hint: '1번부터 22번까지는 같은 번호끼리 2개씩 짝이에요. 개수가 다른 번호가 있는지 세어 보고, 마지막 \'성\' 칸에서 X와 Y가 몇 개인지 확인해요.',
          setup() { kc.ans = KCARD.map(() => ({ n: '', s: '', d: '' })); kc.seen = {}; setMode('karyo'); kcSel(0); },
          check() {
            kcStore();
            for (let i = 0; i < 4; i++) if (!kcAllIn(i)) return '카드 ' + KCARD[i].id + '의 염색체 수 · 성별 · 판독을 모두 입력해 주세요.';
            const bad = [0, 1, 2, 3].filter((i) => !kcOk(i));
            if (bad.length) { return '카드 ' + bad.map((i) => KCARD[i].id).join(', ') + '를 다시 살펴보세요. 염색체를 모두 세고, X와 Y의 개수를 확인해 보세요.'; }
            return true;
          },
          explain: '<b>46, XY</b>는 정상 남자, <b>47, XX, +21</b>은 21번이 3개인 <b>다운 증후군</b>(여자), <b>45, X</b>는 X가 하나뿐인 <b>터너 증후군</b>(여자), <b>47, XXY</b>는 X가 2개인 <b>클라인펠터 증후군</b>(남자)이에요. 성별은 Y 염색체가 있으면 남자예요.',
        },
        {
          type: 'quiz', title: '1염색체성의 운명',
          goal: '상염색체의 1염색체성은 대부분 태어나지 못하는데, X 염색체의 1염색체성(터너 증후군)은 태어날 수 있어요. 그 까닭으로 가장 알맞은 것은?',
          setup() { setMode('karyo'); },
          choices: ['X 염색체에는 중요한 유전자가 하나도 없어서', '상염색체에는 유전자가 매우 많아 하나만 있으면 유전자 양의 균형이 크게 깨지지만, X 염색체는 원래 여성의 세포에서도 하나만 활성화되어 영향이 작아서', '터너 증후군은 염색체가 하나 더 많은 경우라서', '상염색체의 1염색체성은 정자에서만 생겨서'],
          answer: 1,
          feedback: ['X 염색체에도 중요한 유전자가 많아요. 그래서 X가 하나뿐이어도 증상이 나타나요.', '', '터너 증후군은 염색체가 하나 부족한 경우(45, X)예요.', '난자나 정자 어느 쪽에서든 비분리가 생길 수 있어요.'],
          explain: '상염색체에는 유전자가 많아서 21번이 부족하면 유전자 양의 균형이 심하게 깨져 대부분 초기에 유산돼요. 반면 X 염색체는 여성의 세포에서도 둘 중 하나가 <b>불활성화</b>되어 쓰이기 때문에 1개여도 생존할 수 있어요. (이름 수준으로만 알아 둬요)',
        },
      ],
    },
    {
      title: '구조 이상 만들기', short: '구조 이상', icon: '✂', phase: '모형',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 염색체의 <b>수</b>가 달라지는 이상을 봤어요. 염색체의 <b>구조</b>가 달라지는 이상도 있어요.</div><p>유전자 순서 <b>A B C D E F</b>가 적힌 염색체 막대를 잘라 붙여서 <b>결실 · 중복 · 역위 · 전좌</b>를 직접 만들어요. 전좌에는 다른 염색체(G H)도 필요해요.</p><p>💡 조각을 한 번 누르면 선택, 다른 조각을 또 누르면 그 사이 범위가 선택돼요. 사례는 교육용 요약이에요.</p>',
      features: ['struct', 'cases'],
      setup() { stBuild(false); setMode('struct'); },
      recap: '결실은 일부가 사라지고, 중복은 일부가 반복되고, 역위는 일부가 거꾸로 붙고, 전좌는 비상동 염색체 사이에서 조각이 옮겨 붙어요. 유전자의 양이 변하는 이상은 결실과 중복이에요.',
      summary: '<ul><li><b>결실</b>: 염색체의 일부가 소실돼요 (A B C E F). 예) 고양이 울음 증후군 = 5번 염색체 짧은 팔의 결실.</li><li><b>중복</b>: 염색체의 일부가 반복돼요 (A B C D C D E F).</li><li><b>역위</b>: 일부가 거꾸로 붙어요 (A B E D C F). 유전자의 양은 같아도 배열이 달라져요.</li><li><b>전좌</b>: 서로 다른(비상동) 염색체 사이에서 조각이 옮겨 붙어요. 예) 필라델피아 염색체 = 9번과 22번 사이의 전좌(체세포에서 생겨 만성 골수성 백혈병과 관련).</li><li>유전자의 <b>양</b>이 변하는 구조 이상은 결실과 중복이에요.</li></ul>',
      missions: [
        {
          id: 'make', title: '네 가지 구조 이상 만들기',
          goal: '염색체 막대를 편집해 <b>결실 · 중복 · 역위 · 전좌</b>를 모두 한 번씩 만들어 보세요.',
          hint: '조각을 눌러 고른 뒤 도구 버튼을 눌러요. 중복은 C D를 골라 복사해 붙이고, 역위는 C D E를 골라 뒤집어요. 전좌는 염색체 ①과 ②에서 각각 조각을 골라 [조각 교환]을 눌러요.',
          setup() { stBuild(false); setMode('struct'); },
          check: () => st.made.del && st.made.dup && st.made.inv && st.made.tra, hold: 0.7,
          status: () => mark(st.made.del) + ' 결실 &nbsp; ' + mark(st.made.dup) + ' 중복 &nbsp; ' + mark(st.made.inv) + ' 역위 &nbsp; ' + mark(st.made.tra) + ' 전좌',
          explain: '결실은 조각이 <b>사라지고</b>, 중복은 조각이 <b>한 번 더 들어가고</b>, 역위는 조각이 <b>거꾸로</b> 붙고, 전좌는 <b>서로 다른 염색체</b> 사이에서 조각이 바뀌어요. 이런 구조 이상은 염색체가 끊어졌다가 잘못 이어질 때 생길 수 있어요.',
        },
        {
          id: 'cases', title: '사례와 유형 연결', manual: true,
          goal: '네 가지 사례가 각각 어떤 <b>구조 이상</b>인지 고르고 확인하세요.',
          hint: '고양이 울음 증후군은 염색체의 일부가 사라진 경우, 필라델피아 염색체는 두 염색체 사이에서 조각이 옮겨 붙은 경우예요.',
          setup() { [0, 1, 2, 3].forEach((i) => { $('#cs' + i).value = ''; }); setMode('cases'); },
          check() {
            const a = caseAns();
            if (a.some((v) => !v)) return '네 사례에 모두 유형을 골라 주세요.';
            const bad = CASES.filter((c, i) => a[i] !== c.ans);
            if (bad.length) return '\'' + bad[0].t + '\'의 유형을 다시 생각해 보세요. (' + bad.length + '개가 달라요)';
            return true;
          },
          explain: '<b>고양이 울음 증후군</b>은 5번 염색체 짧은 팔 일부가 사라진 <b>결실</b>, <b>필라델피아 염색체</b>는 9번과 22번 사이에서 조각이 옮겨 붙은 <b>전좌</b>(체세포에서 생겨요)예요. 가상 사례 가는 <b>중복</b>, 나는 <b>역위</b>예요.',
        },
        {
          type: 'quiz', title: '유전자의 양이 변하는 이상',
          goal: '다음 중 염색체에 들어 있는 <b>유전자의 양(개수)</b>이 달라지는 구조 이상만 짝지은 것은?',
          setup() { setMode('struct'); },
          choices: ['결실과 중복', '역위와 전좌', '결실과 역위', '중복과 전좌'],
          answer: 0,
          feedback: ['', '역위는 유전자 방향만, 전좌는 조각이 다른 염색체로 옮겨 붙을 뿐이라 전체 유전자 양은 같을 수 있어요.', '결실은 맞지만 역위는 배열만 바뀌고 양은 그대로예요.', '중복은 맞지만 전좌는 조각의 위치만 바뀌어요.'],
          explain: '<b>결실</b>은 유전자가 줄고 <b>중복</b>은 늘어요. <b>역위</b>는 양이 같아도 유전자 <b>배열</b>이 달라지고, 조각을 서로 바꾸는 <b>전좌</b>도 전체 양은 같지만 유전자가 있는 염색체가 달라져요. 양이 같아도 이상이 될 수 있어요.',
        },
      ],
    },
    {
      title: '산모 나이와 다운 증후군', short: '발생 빈도', icon: '📈', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계들에서</b> 염색체 이상은 감수 분열 때의 비분리나 염색체 구조 변화로 생겨요.</div><p>이제 자료로 확인해요. <b>산모 나이별 다운 증후군의 빈도</b>(예시 값)를 읽고 40세와 20세의 비율을 구해요. 그리고 \'<b>염색체 이상은 항상 부모에게 물려받는다</b>\'는 주장을 그래프와 감수 분열 지식으로 따져 봐요.</p><p>💡 이 차시는 염색체 이상을 다뤘고, 다음 차시에서는 염기 하나가 바뀌는 <b>유전자 돌연변이</b>와 유전병 조사 계획을 다뤄요.</p>',
      features: ['freq'],
      setup() { fr.sel = -1; fr.seen = {}; fr.solved = false; fr.draw = 0; $('#fqR').value = ''; $('#fqR').classList.remove('ok'); setMode('freq'); },
      recap: '산모 나이가 많을수록 다운 증후군 빈도가 크게 늘어요(40세는 20세의 약 15배). 이것은 유전이 아니라 감수 분열 때 비분리가 일어날 가능성이 커지기 때문이에요.',
      summary: '<ul><li>산모 나이별 다운 증후군 빈도(예시 값): 20세 약 1/1500, 30세 약 1/900, 35세 약 1/350, 40세 약 1/100, 45세 약 1/30. 40세는 20세의 약 <b>15배</b>예요.</li><li>대부분의 다운 증후군은 부모에게서 \'유전\'되는 것이 아니라, 생식세포를 만들 때 <b>우연히 일어난 비분리</b>로 생겨요. 나이가 많아지면 비분리 가능성이 커져요. (일부 가족성 사례는 전좌형이에요)</li><li><b>염색체 이상</b>은 염색체의 수나 구조가 달라지는 것이고, <b>유전자 돌연변이</b>는 DNA 염기 서열이 바뀌는 것이에요.</li></ul>',
      missions: [
        {
          id: 'ratio', title: '40세와 20세의 비율 구하기',
          goal: '그래프에서 <b>20세와 40세</b>의 빈도를 읽고, 40세의 빈도가 20세의 <b>약 몇 배</b>인지 입력하세요.',
          hint: '나이 버튼을 눌러 20세는 약 1/1500, 40세는 약 1/100을 읽어요. (1/100) ÷ (1/1500) = 1500 ÷ 100 이에요.',
          setup() { fr.sel = -1; fr.seen = {}; fr.solved = false; fr.draw = RM ? 1 : 0; $('#fqR').value = ''; $('#fqR').classList.remove('ok'); setMode('freq'); },
          check: () => frOk(), hold: 0.8,
          status: () => mark(!!fr.seen[20]) + ' 20세 읽기 &nbsp; ' + mark(!!fr.seen[40]) + ' 40세 읽기 &nbsp; ' + mark(frOk()) + ' 비율 계산',
          explain: '20세는 약 1/1500, 40세는 약 1/100이므로 <b>1500 ÷ 100 = 15배</b>예요. 산모 나이가 20세에서 40세로 늘면 다운 증후군 빈도가 약 15배가 돼요. 45세는 약 1/30이라 20세의 약 50배예요.',
        },
        {
          type: 'quiz', title: '나이와 빈도의 올바른 해석',
          goal: '산모 나이가 많아질수록 다운 증후군 빈도가 높아지는 현상을 가장 알맞게 해석한 것은?',
          setup() { setMode('freq'); },
          choices: ['다운 증후군은 부모에게서 물려받는 유전병이라 나이가 많은 부모가 더 많이 물려주기 때문이다', '나이가 많은 산모의 생식세포를 만드는 감수 분열에서 염색체 비분리가 일어날 가능성이 커지기 때문이다', '나이가 많은 산모의 DNA 염기 하나가 바뀌기 때문이다', '아기가 태어난 뒤 나이를 먹으면서 염색체가 늘어나기 때문이다'],
          answer: 1,
          feedback: ['유전이라면 산모의 나이와 상관없이 빈도가 비슷해야 해요. 대부분은 생식세포를 만들 때 우연히 생겨요.', '', '염기 하나가 바뀌는 것은 유전자 돌연변이예요. 다운 증후군은 염색체 수 이상이에요.', '염색체 수는 수정란 때 이미 정해져요.'],
          explain: '다운 증후군의 대부분은 <b>감수 분열 때의 비분리</b>로 우연히 생겨요. 산모 나이가 많을수록 비분리 가능성이 커져서 빈도가 높아지는 것이지, 부모에게서 \'유전\'되기 때문이 아니에요.',
        },
        {
          type: 'quiz', title: '염색체 이상과 유전자 돌연변이',
          goal: '\'염색체 이상\'과 \'유전자 돌연변이\'의 차이로 알맞은 것은?',
          setup() { setMode('freq'); },
          choices: ['염색체 이상은 염색체의 수나 구조가 달라지는 것이고, 유전자 돌연변이는 DNA 염기 서열이 바뀌는 것이다', '둘은 이름만 다르고 같은 현상이다', '염색체 이상은 체세포에서만, 유전자 돌연변이는 생식세포에서만 일어난다', '염색체 이상은 항상 해롭고 유전자 돌연변이는 항상 이롭다'],
          answer: 0,
          feedback: ['', '염색체 이상은 큰 규모(염색체의 수 · 구조), 유전자 돌연변이는 DNA 염기 서열 수준의 변화예요.', '둘 모두 체세포와 생식세포에서 일어날 수 있어요.', '돌연변이는 대부분 영향이 없거나 해롭기도 하고 드물게 이롭기도 해요. 항상 이롭거나 해롭지는 않아요.'],
          explain: '<b>염색체 이상</b>은 염색체의 <b>수나 구조</b>(비분리, 결실 · 중복 · 역위 · 전좌)가 달라지고, <b>유전자 돌연변이</b>는 DNA의 <b>염기 서열</b>이 바뀌는 거예요. 다음 차시에서 유전자 돌연변이와 유전병을 원인별로 조사해 봐요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hg-chrom-abnormal', mount: '#game', badge: '염색체 탐정', homeHref: '../../index.html#hg',
    featureLabels: { meiosis: '🧫 감수 분열', fert: '🥚 수정 모의', karyo: '🗂 핵형 카드', struct: '✂ 염색체 편집', cases: '🔗 사례 연결', freq: '📈 발생 빈도' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 읽음 칸 ---------- */
  function readouts() {
    const m = S.mode;
    if (m === 'meiosis') {
      const fin = me.stage === 4 && !me.moving, n = gameteN21(me.kind), nor = n.filter((x) => x === 1).length;
      setReads(['분열 방식', KIND_NAME[me.kind], '정상 생식세포 (23개)', fin ? nor + ' / 4개' : '—', '비정상 생식세포', fin ? (4 - nor) + ' / 4개' : '—']);
    } else if (m === 'fert') {
      const e = EGG[fe.egg], zr = zyOf(fe.egg, fe.sp);
      setReads(['난자의 염색체', eggCount(e) + '개', '정자의 염색체', '23개', '자손의 염색체', fe.done ? zr.tot + '개' : '—']);
    } else if (m === 'karyo') {
      const filled = [0, 1, 2, 3].filter((i) => kcAllIn(i)).length;
      setReads(['보는 카드', '카드 ' + KCARD[kc.cur].id, '입력한 카드', filled + ' / 4', '확인한 카드', Object.keys(kc.seen).length + ' / 4']);
    } else if (m === 'struct') {
      const info = stInfo(), mk = ['del', 'dup', 'inv', 'tra'].filter((k) => st.made[k]).length;
      setReads(['유전자 수', info.total + '개 (정상 8개)', '지금 상태', KIND_LAB[info.kind][0], '만든 유형', mk + ' / 4']);
    } else if (m === 'cases') {
      const a = caseAns();
      setReads(['고른 사례', a.filter((v) => v).length + ' / 4', '맞은 사례', a.filter((v, i) => v === CASES[i].ans).length + ' / 4', '이 차시의 이상', '수 이상 · 구조 이상']);
    } else {
      const i = fr.sel;
      setReads(['고른 나이', i >= 0 ? AGES[i] + '세' : '—', '빈도', i >= 0 ? '약 1/' + DEN[i] : '—', '1000명당', i >= 0 ? fmtN(per1000(i), 1) + '명' : '—']);
    }
  }

  /* ---------- 시작 ---------- */
  setMode('meiosis');
  let lastFree = false, lastLv = -1;
  SciSim.loop((dt, t) => {
    clock = t; S.t = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (game && game.level !== lastLv) { lastLv = game.level; updateCtl(); }
    view.apply(); ctx.clearRect(0, 0, VW, VH);
    bgFill('#eef4f2', '#e3ece8');
    if (S.mode !== 'meiosis') meUpdate(dt);
    FX.update(dt);
    switch (S.mode) {
      case 'meiosis': meiosisDraw(dt, t); break;
      case 'fert': fertDraw(dt, t); break;
      case 'karyo': karyoDraw(dt, t); break;
      case 'struct': stDraw(dt, t); break;
      case 'cases': casesDraw(dt, t); break;
      case 'freq': freqDraw(dt, t); break;
    }
    FX.draw();
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(241,246,243,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, PHONE, get game() { return game; }, levels, setMode, updateCtl, me, meKind, meRun, meStep, meGo, meReset, gameteN21, compOf, fe, fertGo, fertNot, zyOf, EGG, kc, KCARD, kcSel, kcOk,
    st, stOp, stClick, stInfo, stBuild, fr, frPick, frOk, caseAns, CASES, GEO, SG, FE, FRG,
  };
})();
