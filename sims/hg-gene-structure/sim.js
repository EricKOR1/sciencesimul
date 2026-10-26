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
      if (box.slot) return box.slot;
      const cols = box.cols || 2, gap = box.gap || 6, rows = Math.max(1, Math.ceil(n / cols));
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
      if (zoneId) { const bx = this.boxes.find((q) => q.id === zoneId); if (bx && bx.single) this.cards.forEach((o) => { if (o !== c && o.zone === zoneId) { o.zone = null; o.bad = false; } }); }
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
     고등학교 생물의 유전 · Ⅰ. 유전자와 유전물질 - 원핵·진핵의 유전자 (단원 59, 8차시)
     성취기준 [12유전01-06] 원핵세포와 진핵세포의 유전자 구조와 유전체 구성을 이해하고, 공통점과 차이점을 비교하여 설명할 수 있다.
     ① 분석: 유전체 크기  ② 모형: 원핵 유전자  ③ 모형: 진핵 유전자  ④ 분석: 비교하기
     (유전체 수치는 근사 예시 값이에요)
     ========================================================= */
  const S = { mode: 'size', fade: 0, t: 0 };
  let game = null;
  const ease = SciSim.ease;
  const rr = (x, y, w, h, r) => D.roundRect(x, y, w, h, r);
  const fmt1 = (n) => String(+Number(n).toFixed(2));
  const COLS = { ec: '#16a34a', ye: '#d97706', hu: '#2563eb', exon: '#15803d', intron: '#bbf7d0', prom: '#f59e0b', term: '#ef4444', g1: '#3b82f6', g2: '#8b5cf6', g3: '#ec4899' };

  /* =========================================================
     ① 유전체 크기
     ========================================================= */
  const GEN = [
    { id: 'ec', n: '대장균', bp: 4.6e6, genes: 4300, cod: 88, col: COLS.ec, bpTxt: '약 460만', genesTxt: '약 4300개', genesTbl: '4300개' },
    { id: 'ye', n: '효모', bp: 1.2e7, genes: 6000, cod: 70, col: COLS.ye, bpTxt: '약 1200만', genesTxt: '약 6000개', genesTbl: '6000개' },
    { id: 'hu', n: '사람', bp: 3.1e9, genes: 20000, cod: 1.5, col: COLS.hu, bpTxt: '약 31억', genesTxt: '약 2만 개', genesTbl: '2만 개' },
  ];
  S.sz = { view: 0, seen: { 0: true }, f: [0, 0, 0], pie: [0, 0, 0], calcOn: false, ok: { A: false, B: false, C: false, D: false } };
  const SZC = PHONE ? { x: 8, y: 8, w: 464, h: 338 } : { x: 14, y: 14, w: 504, h: 532 };
  const SZT = PHONE ? { x: 8, y: 356, w: 464, h: 276 } : { x: 530, y: 14, w: 258, h: 532 };
  const logFrac = (bp) => clamp((Math.log10(bp) - 6) / 4, 0, 1);
  const genesFrac = (n) => clamp(n / 20000, 0, 1);
  function szTarget(i) { const g = GEN[i], v = S.sz.view; return v === 0 ? logFrac(g.bp) : v === 1 ? genesFrac(g.genes) : g.cod / 100; }
  function szView(v) { if (S.sz.view !== v) { S.sz.view = v; S.sz.seen[v] = true; S.fade = 0.4; Sound.click(); updateCtl(); } }
  const szSeenN = () => [0, 1, 2].filter((v) => S.sz.seen[v]).length;
  const SZ_ANS = { A: [640, 700], B: [4.4, 5.3], C: [1000, 1150], D: [140000, 170000] };
  const szKeys = { A: 'inGA', B: 'inGB', C: 'inGC', D: 'inGD' };
  function szCalc() {
    const ok = {};
    Object.keys(szKeys).forEach((k) => { const v = numOf(szKeys[k]); ok[k] = isFinite(v) && v >= SZ_ANS[k][0] && v <= SZ_ANS[k][1]; $('#' + szKeys[k]).classList.toggle('ok', ok[k]); });
    S.sz.ok = ok; return ok;
  }
  const szSolved = () => S.sz.ok.A && S.sz.ok.B && S.sz.ok.C && S.sz.ok.D;
  function szDraw(dt, t) {
    const z = S.sz, c = SZC;
    GEN.forEach((g, i) => { z.f[i] = approach(z.f[i], szTarget(i), dt, 6); z.pie[i] = approach(z.pie[i], z.view === 2 ? 1 : 0, dt, 4); });
    panel(c.x, c.y, c.w, c.h, 16, '#fff');
    const titles = ['유전체 크기 (한 세트의 DNA 염기쌍 수) · 로그 눈금', '유전자 수 (단백질을 만드는 유전자)', '유전체에서 암호 부분이 차지하는 비율'];
    TF(c.x + 16, c.y + 30, titles[z.view], c.w - 32, L(17, 14.5), 11, '#14532d', 'left', 800);
    if (z.view < 2) {
      const lx = c.x + L(86, 64), pw = c.w - L(86, 64) - 22, top = c.y + 62, rowH = (c.h - L(190, 160)) / 3;
      // 눈금
      const ticks = z.view === 0 ? [[6, '100만'], [7, '1000만'], [8, '1억'], [9, '10억'], [10, '100억']] : [[0, '0'], [5000, '5000'], [10000, '1만'], [15000, '1.5만'], [20000, '2만']];
      ticks.forEach((q, i) => {
        const fx = z.view === 0 ? (q[0] - 6) / 4 : q[0] / 20000, x = lx + fx * pw;
        ctx.strokeStyle = i === 0 ? '#94a3b8' : '#e2e8f0'; ctx.lineWidth = i === 0 ? 2 : 1;
        ctx.beginPath(); ctx.moveTo(x, top - 6); ctx.lineTo(x, top + rowH * 3 + 4); ctx.stroke();
        T(x, top + rowH * 3 + 24, q[1], L(14, 12.5), '#64748b', 'center', 700);
      });
      T(lx + pw / 2, top + rowH * 3 + 46, z.view === 0 ? '한 칸이 10배 (로그 눈금)' : '유전자 수 (개)', 13, '#94a3b8', 'center', 700);
      GEN.forEach((g, i) => {
        const y = top + i * rowH + rowH / 2, bh = Math.min(46, rowH * 0.62);
        T(c.x + 14, y + 6, g.n, L(18, 15), '#26324a', 'left', 800);
        ctx.fillStyle = '#eef2f7'; rr(lx, y - bh / 2, pw, bh, 8); ctx.fill();
        const w = z.f[i] * pw;
        if (w > 0.5) {
          const gr = ctx.createLinearGradient(0, y - bh / 2, 0, y + bh / 2); gr.addColorStop(0, C.shade(g.col, 0.25)); gr.addColorStop(1, C.shade(g.col, -0.1));
          ctx.fillStyle = gr; rr(lx, y - bh / 2, w, bh, Math.min(8, w / 2)); ctx.fill();
        }
        const txt = z.view === 0 ? g.bpTxt + ' 염기쌍' : g.genesTxt;
        const lw = 150;
        if (w + lw + 10 < pw) D.label(lx + w + 8, y, txt, { bg: '#fff', color: '#1f2d44', border: g.col, size: L(14, 12.5), align: 'left' });
        else D.label(lx + w - 8, y, txt, { bg: '#fff', color: '#1f2d44', border: g.col, size: L(14, 12.5), align: 'right' });
      });
      // 배율 말풍선
      const by = top + rowH * 3 + L(70, 66);
      if (z.view === 0) {
        D.label(c.x + c.w / 2, by, z.ok.A ? '사람 유전체 ≈ 대장균의 약 670배' : '사람 유전체는 대장균의 약 몇 배일까요?', { bg: z.ok.A ? '#15803d' : '#475569', size: L(14.5, 13) });
        T(c.x + c.w / 2, by + 26, '대장균 DNA를 곧게 펴면 약 1.56 mm (세포 길이 약 2 µm의 약 800배)', L(13.5, 12), '#64748b', 'center', 700);
      } else {
        D.label(c.x + c.w / 2, by, z.ok.B ? '사람 유전자 수 ≈ 대장균의 약 5배' : '사람 유전자 수는 대장균의 약 몇 배일까요?', { bg: z.ok.B ? '#15803d' : '#475569', size: L(14.5, 13) });
        T(c.x + c.w / 2, by + 26, '유전체 크기의 배율과 비교해 보세요', L(13.5, 12), '#64748b', 'center', 700);
      }
    } else {
      const n = 3, r = Math.min(L(76, 54), (c.w - 40) / n / 2 - 6), cy = c.y + L(210, 168);
      GEN.forEach((g, i) => {
        const cx = c.x + c.w / (n * 2) * (2 * i + 1), a = z.pie[i], frac = g.cod / 100;
        ctx.save(); ctx.translate(cx, cy);
        ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fillStyle = '#e2e8f0'; ctx.fill();
        const sweep = TAU * frac * a, st = -Math.PI / 2;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, r, st, st + sweep); ctx.closePath();
        const gr = ctx.createLinearGradient(-r, -r, r, r); gr.addColorStop(0, C.shade(g.col, 0.2)); gr.addColorStop(1, C.shade(g.col, -0.15)); ctx.fillStyle = gr; ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5; ctx.stroke();
        ctx.beginPath(); ctx.arc(0, 0, r * 0.52, 0, TAU); ctx.fillStyle = '#fff'; ctx.fill();
        ctx.restore();
        T(cx, cy - 2, fmt1(g.cod) + ' %', L(19, 16), '#26324a', 'center', 800);
        T(cx, cy + 16, '암호 부분', L(12.5, 11.5), '#64748b', 'center', 700);
        T(cx, cy + r + 28, g.n, L(18, 15), g.col, 'center', 800);
        T(cx, cy + r + 48, '암호 ' + g.cod + ' % · 그 밖 ' + fmt1(100 - g.cod) + ' %', L(13, 11.5), '#475569', 'center', 700);
      });
      // 범례와 사람 설명
      const ly = c.y + c.h - L(78, 70);
      ctx.fillStyle = '#64748b'; ctx.fillRect(c.x + 20, ly - 8, 12, 12); ctx.fillStyle = '#e2e8f0'; ctx.fillRect(c.x + 20, ly + 10, 12, 12);
      T(c.x + 40, ly + 3, '색 칸: 단백질을 만드는 암호 부분(엑손)', L(14, 12.5), '#334155', 'left', 700);
      T(c.x + 40, ly + 21, '회색 칸: 그 밖의 DNA (조절 서열 · 인트론 · 반복 서열 …)', L(14, 12.5), '#334155', 'left', 700);
      textBlock(c.x + 20, ly + 48, c.w - 40, '사람: 인트론을 포함한 유전자 영역은 약 25 %, 반복 서열은 약 절반이에요.', L(13.5, 12), '#1d4ed8', 17, 800);
    }
    // 자료표
    const q = SZT;
    panel(q.x, q.y, q.w, q.h, 16, '#fff');
    TF(q.x + 14, q.y + 28, '자료표 (근사 예시 값)', q.w - 28, L(16, 14.5), 12, '#14532d', 'left', 800);
    const nameW = L(58, 74), cw = (q.w - 24 - nameW) / 3, hy = q.y + 58;
    ['유전체|(염기쌍)', '유전자|수', '암호|부분'].forEach((h, j) => { const hs = h.split('|'); hs.forEach((s, k) => T(q.x + 12 + nameW + cw * (j + 0.5), hy + k * 15, s, L(13, 12.5), z.view === j ? '#15803d' : '#64748b', 'center', 800)); });
    GEN.forEach((g, i) => {
      const y = q.y + 94 + i * L(56, 46), h = L(50, 40);
      ctx.fillStyle = i % 2 ? '#f8fafc' : '#f1f5f9'; rr(q.x + 8, y, q.w - 16, h, 10); ctx.fill();
      T(q.x + 14, y + h / 2 + 6, g.n, L(15, 14), g.col, 'left', 800);
      [g.bpTxt, g.genesTbl, g.cod + ' %'].forEach((s, j) => {
        const on = z.view === j;
        if (on) { ctx.fillStyle = 'rgba(22,163,74,.12)'; rr(q.x + 12 + nameW + cw * j + 1, y + 3, cw - 2, h - 6, 8); ctx.fill(); }
        TF(q.x + 12 + nameW + cw * (j + 0.5), y + h / 2 + 5, s.replace('약 ', ''), cw - 4, L(14.5, 13), 10, '#1f2d44', 'center', 800);
      });
    });
    const ny = q.y + 94 + 3 * L(56, 46) + 18;
    textBlock(q.x + 14, ny, q.w - 28, '유전자 하나의 평균 길이 = 유전체 크기 / 유전자 수', L(14, 13), '#334155', 18, 800);
    if (z.ok.C || z.ok.D) {
      const yy = ny + L(50, 44);
      if (z.ok.C) D.label(q.x + 14, yy, '대장균 약 1100 염기쌍', { bg: COLS.ec, size: L(14, 13), align: 'left' });
      if (z.ok.D) D.label(q.x + 14, yy + 32, '사람 약 15만 염기쌍', { bg: COLS.hu, size: L(14, 13), align: 'left' });
    } else if (!PHONE) textBlock(q.x + 14, ny + L(40, 36), q.w - 28, '계산한 값은 오른쪽 아래 입력칸에 써요.', L(13, 12), '#94a3b8', 17, 700);
    if (!PHONE && z.ok.A && z.ok.B) textBlock(q.x + 14, q.y + q.h - 78, q.w - 28, '유전체는 약 670배, 유전자 수는 약 5배 → 유전체가 클수록 유전자가 비례해 많은 것은 아니에요.', 13.5, '#15803d', 18, 800);
  }

  /* =========================================================
     ② 원핵 유전자: 고리 DNA, 플라스미드, 오페론
     ========================================================= */
  const PKG = PHONE
    ? { cell: { x: 8, y: 8, w: 300, h: 180 }, ring: { x: 96, y: 98, r: 52 }, pls: { x: 222, y: 104, r: 20 }, info: { x: 318, y: 8, w: 154, h: 180 },
        tray: { x0: 8, y0: 196, dx: 118, dy: 38, per: 4, cw: 112, ch: 32 }, panel: { x: 8, y: 276, w: 464, h: 358 }, sx: 24, sw: 432, sy: 322, my: 386, py: 590 }
    : { cell: { x: 14, y: 14, w: 340, h: 196 }, ring: { x: 128, y: 114, r: 68 }, pls: { x: 292, y: 124, r: 28 }, info: { x: 366, y: 14, w: 420, h: 196 },
        tray: { x0: 18, y0: 220, dx: 110, dy: 0, per: 7, cw: 104, ch: 34 }, panel: { x: 14, y: 266, w: 772, h: 282 }, sx: 54, sw: 692, sy: 316, my: 392, py: 506 };
  const OPG = [
    { id: 'promoter', k: '프로모터', a: 0.0, b: 0.10, col: COLS.prom },
    { id: 'g1', k: '유전자 1', a: 0.14, b: 0.34, col: COLS.g1 },
    { id: 'g2', k: '유전자 2', a: 0.40, b: 0.60, col: COLS.g2 },
    { id: 'g3', k: '유전자 3', a: 0.66, b: 0.86, col: COLS.g3 },
    { id: 'term', k: '종결 서열', a: 0.90, b: 1.0, col: COLS.term },
  ];
  const ox = (f) => PKG.sx + f * PKG.sw;
  const TX_A = 0.12, TX_B = 0.92, V_TX = 0.14, V_TL = 0.115;
  S.pk = { run: false, tip: TX_A, done: false, rib: [0, 1, 2].map(() => ({ on: false, pos: 0, prog: 0, done: false, t: 0, px: 0, py: 0 })), burst: 0, ran: false };
  let tagger = null;
  const PK_TAGS = [
    { id: 'ring', label: '고리 모양 DNA', short: '고리 DNA', col: '#7c3aed' },
    { id: 'plasmid', label: '플라스미드', short: '플라스미드', col: '#7c3aed' },
    { id: 'promoter', label: '프로모터', short: '프로모터', col: COLS.prom },
    { id: 'g1', label: '유전자 1', short: '유전자 1', col: COLS.g1 },
    { id: 'g2', label: '유전자 2', short: '유전자 2', col: COLS.g2 },
    { id: 'g3', label: '유전자 3', short: '유전자 3', col: COLS.g3 },
    { id: 'term', label: '종결 서열', short: '종결 서열', col: COLS.term },
  ];
  function pkBoxes() {
    const R = PKG.ring, P = PKG.pls, b = [];
    b.push({ id: 'ring', x: R.x - R.r - 8, y: R.y - R.r - 8, w: 2 * R.r + 16, h: 2 * R.r + 16, cols: 1, hdr: 2, single: true, col: '#7c3aed', slot: { x: R.x - 46, y: R.y - 15, w: 92, h: 30 } });
    b.push({ id: 'plasmid', x: P.x - P.r - 20, y: P.y - P.r - 8, w: 2 * P.r + 40, h: 2 * P.r + 46, cols: 1, hdr: 2, single: true, col: '#7c3aed', slot: { x: P.x - 48, y: P.y + P.r + 6, w: 96, h: 28 } });
    OPG.forEach((g) => { const x = ox(g.a), w = (g.b - g.a) * PKG.sw; b.push({ id: g.id, x, y: PKG.sy - 24, w, h: 48, cols: 1, hdr: 2, single: true, col: g.col, slot: { x: x + 2, y: PKG.sy - 14, w: w - 4, h: 28 } }); });
    return b;
  }
  function pkInit() {
    const T0 = PKG.tray;
    tagger = selectable({
      cards: PK_TAGS.map((c) => Object.assign({}, c)),
      boxes: pkBoxes(),
      tray: (i) => ({ x: T0.x0 + (i % T0.per) * T0.dx, y: T0.y0 + Math.floor(i / T0.per) * T0.dy }),
      cw: T0.cw, ch: T0.ch, kh: 28,
      onChange: () => { updateCtl(); },
    });
    tagger.layout(true);
  }
  function pkTagWrong() {
    const bad = []; let missing = 0;
    PK_TAGS.forEach((t) => { const c = tagger.cards.find((c) => c.id === t.id); if (!c.zone) missing++; else if (c.zone !== t.id) bad.push(t.id); });
    // 한 자리에 두 장
    tagger.boxes.forEach((b) => { const mem = tagger.cards.filter((c) => c.zone === b.id); if (mem.length > 1) mem.forEach((c) => { if (bad.indexOf(c.id) < 0) bad.push(c.id); }); });
    return { bad, missing };
  }
  const pkTagged = (id) => { const c = tagger && tagger.cards.find((c) => c.id === id); return !!c && c.zone === id; };
  function pkGo() {
    const k = S.pk; if (k.run && !k.done) return; if (k.done) pkReset();
    S.pk.run = true; S.pk.ran = true; Sound.click(); updateCtl();
  }
  function pkReset() { S.pk = { run: false, tip: TX_A, done: false, rib: [0, 1, 2].map(() => ({ on: false, pos: 0, prog: 0, done: false, t: 0, px: 0, py: 0 })), burst: 0, ran: false }; updateCtl(); }
  function pkUpdate(dt) {
    const k = S.pk; if (!k.run || k.done) return;
    k.tip = Math.min(TX_B, k.tip + dt * V_TX);
    OPG.slice(1, 4).forEach((g, i) => {
      const r = k.rib[i];
      if (!r.on && k.tip > g.a + 0.02) { r.on = true; r.pos = g.a; Sound.tick(); }
      if (r.on && !r.done) {
        const lim = Math.min(g.b, k.tip - 0.012);
        r.pos = Math.min(lim, r.pos + dt * V_TL); r.prog = clamp((r.pos - g.a) / (g.b - g.a), 0, 1);
        if (r.pos >= g.b - 1e-6) { r.done = true; r.t = 0; r.px = ox(g.a + (g.b - g.a) / 2); r.py = PKG.my + 34; Sound.success(); parts.burst(ox(g.b), PKG.my, { count: 14, speed: 120, colors: [g.col, '#fff'] }); }
      }
      if (r.done) { r.t += dt; r.px = approach(r.px, ox(g.a + (g.b - g.a) / 2), dt, 3); r.py = approach(r.py, PKG.py, dt, 2.2); }
    });
    if (k.tip >= TX_B - 1e-6 && k.rib.every((r) => r.done)) { k.done = true; updateCtl(); }
  }
  function drawRibosome(x, y, s, a) {
    ctx.save(); ctx.globalAlpha = a == null ? 1 : a; ctx.translate(x, y);
    const g1 = ctx.createLinearGradient(0, -14 * s, 0, 0); g1.addColorStop(0, '#fcd34d'); g1.addColorStop(1, '#f59e0b');
    ctx.fillStyle = g1; ctx.beginPath(); ctx.ellipse(0, -7 * s, 15 * s, 10 * s, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = '#b45309'; ctx.lineWidth = 1.6; ctx.stroke();
    const g2 = ctx.createLinearGradient(0, 0, 0, 10 * s); g2.addColorStop(0, '#fde68a'); g2.addColorStop(1, '#fbbf24');
    ctx.fillStyle = g2; ctx.beginPath(); ctx.ellipse(0, 5 * s, 11 * s, 6.5 * s, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = '#b45309'; ctx.stroke();
    ctx.restore();
  }
  function pkDraw(dt, t) {
    pkUpdate(dt);
    const k = S.pk, G = PKG, R = G.ring, P = G.pls;
    // 세포
    D.shadow(() => { rr(G.cell.x, G.cell.y, G.cell.w, G.cell.h, 26); ctx.fillStyle = '#ecfdf5'; ctx.fill(); }, { blur: 8, y: 2 });
    ctx.strokeStyle = '#10b981'; ctx.lineWidth = 4; rr(G.cell.x, G.cell.y, G.cell.w, G.cell.h, 26); ctx.stroke();
    T(G.cell.x + 14, G.cell.y + 22, '원핵세포 (핵막 없음)', L(14.5, 13), '#047857', 'left', 800);
    // 세포질의 리보솜 점
    for (let i = 0; i < 16; i++) { const px = G.cell.x + 20 + ((i * 53) % (G.cell.w - 40)), py = G.cell.y + 34 + ((i * 37) % (G.cell.h - 50)); if (Math.hypot(px - R.x, py - R.y) > R.r + 14 && Math.hypot(px - P.x, py - P.y) > P.r + 10) { ctx.fillStyle = 'rgba(245,158,11,.45)'; ctx.beginPath(); ctx.arc(px, py, 3.2, 0, TAU); ctx.fill(); } }
    // 고리 DNA와 오페론 부분
    ctx.strokeStyle = '#7c3aed'; ctx.lineWidth = 9; ctx.beginPath(); ctx.arc(R.x, R.y, R.r, 0, TAU); ctx.stroke();
    ctx.strokeStyle = '#c4b5fd'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(R.x, R.y, R.r, 0, TAU); ctx.stroke();
    const a0 = -Math.PI * 0.42, a1 = -Math.PI * 0.05;
    ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 12; ctx.lineCap = 'butt'; ctx.beginPath(); ctx.arc(R.x, R.y, R.r, a0, a1); ctx.stroke();
    ctx.strokeStyle = '#7c3aed'; ctx.lineWidth = 9; ctx.beginPath(); ctx.arc(P.x, P.y, P.r, 0, TAU); ctx.stroke(); ctx.strokeStyle = '#c4b5fd'; ctx.lineWidth = 3; ctx.stroke();
    // 확대선
    const zx = R.x + R.r * Math.cos((a0 + a1) / 2), zy = R.y + R.r * Math.sin((a0 + a1) / 2);
    ctx.save(); ctx.setLineDash([6, 6]); ctx.strokeStyle = 'rgba(245,158,11,.75)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(zx, zy); ctx.lineTo(G.panel.x + 20, G.panel.y); ctx.moveTo(zx, zy); ctx.lineTo(G.panel.x + G.panel.w - 20, G.panel.y); ctx.stroke(); ctx.restore();
    D.label(zx + 6, zy - 14, '🔍 확대', { bg: '#b45309', size: 12.5, align: 'left', pad: 6 });
    // 정보 칸
    const I = G.info;
    panel(I.x, I.y, I.w, I.h, 14, '#fff');
    TF(I.x + 14, I.y + 26, '원핵생물 유전체의 특징', I.w - 28, L(15.5, 13.5), 11, '#14532d', 'left', 800);
    const lines = ['· 고리 모양 DNA 1개가 세포질에 있어요', '· 작은 고리 DNA(플라스미드)가 따로 있기도 해요', '· 유전자 사이가 짧고 암호 부분이 대부분이에요', '· 인트론이 거의 없어요'];
    if (!PHONE) lines.forEach((s, i) => T(I.x + 16, I.y + 56 + i * 24, s, 14, '#334155', 'left', 700));
    else textBlock(I.x + 12, I.y + 50, I.w - 22, lines[0] + '\n' + lines[2], 12.5, '#334155', 18, 700);
    // 이름표 보관함
    const T0 = G.tray, trayRows = Math.ceil(PK_TAGS.length / T0.per);
    ctx.fillStyle = 'rgba(124,58,237,.07)'; rr(T0.x0 - 8, T0.y0 - 6, T0.per * T0.dx + 2, trayRows * (T0.ch + 6) + 6 + (trayRows - 1) * 0, 12); ctx.fill();
    // 오페론 패널
    const Pn = G.panel;
    panel(Pn.x, Pn.y, Pn.w, Pn.h, 16, '#fff');
    TF(Pn.x + 14, Pn.y + 22, '🔍 오페론 구간 확대 (세포질 속)', Pn.w - 28, L(15, 13.5), 11, '#92400e', 'left', 800);
    // DNA 띠 (구간마다 색)
    const sy = G.sy;
    D.shadow(() => { rr(ox(0), sy - 12, G.sw, 24, 6); ctx.fillStyle = '#e5e7eb'; ctx.fill(); }, { blur: 4, y: 1 });
    OPG.forEach((g) => {
      const x = ox(g.a), w = (g.b - g.a) * G.sw;
      const ok = pkTagged(g.id);
      ctx.fillStyle = ok ? g.col : C.mix('#ffffff', g.col, 0.38); rr(x, sy - 12, w, 24, 5); ctx.fill();
      ctx.strokeStyle = C.shade(g.col, -0.3); ctx.lineWidth = 1.5; rr(x, sy - 12, w, 24, 5); ctx.stroke();
      if (!ok) T(x + w / 2, sy + 5, '?', 14, '#475569', 'center', 800);
    });
    // 전사된 부분 강조
    if (k.run) { const x0 = ox(TX_A), x1 = ox(k.tip); ctx.fillStyle = 'rgba(15,23,42,.10)'; ctx.fillRect(x0, sy + 12, x1 - x0, 3); }
    // 방향 화살표
    D.arrow(ox(0), sy + 38, ox(0.16), sy + 38, { color: '#64748b', width: 2, head: 8 });
    T(ox(0) + 4, sy + 56, 'DNA 읽는 방향', 12.5, '#64748b', 'left', 700);
    // RNA 중합 효소
    if (k.run || k.tip > TX_A) {
      const px = ox(k.tip);
      ctx.save(); ctx.translate(px, sy - 22); const g = ctx.createRadialGradient(-4, -6, 2, 0, 0, 22); g.addColorStop(0, '#bfdbfe'); g.addColorStop(1, '#3b82f6');
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, 24, 15, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = '#1e40af'; ctx.lineWidth = 1.8; ctx.stroke(); ctx.restore();
      T(px, sy - 42, 'RNA 중합 효소', 12.5, '#1e40af', 'center', 800, { stroke: '#fff', strokeWidth: 4 });
    }
    // mRNA (물결선)
    if (k.tip > TX_A + 0.001) {
      const x0 = ox(TX_A), x1 = ox(k.tip), my = G.my;
      ctx.strokeStyle = '#0ea5e9'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(x0, my);
      for (let x = x0; x <= x1; x += 5) ctx.lineTo(x, my + Math.sin(x * 0.12 + t * 0) * 2.2);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(14,165,233,.5)'; ctx.lineWidth = 2; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(ox(k.tip), sy + 12); ctx.lineTo(x1, my); ctx.stroke(); ctx.setLineDash([]);
      D.label((x0 + Math.min(x1, x0 + 300)) / 2, my + 26, '하나의 mRNA' + (k.done ? ' (유전자 3개 분량)' : ''), { bg: '#0ea5e9', size: 13 });
    }
    // 리보솜과 단백질
    k.rib.forEach((r, i) => {
      const g = OPG[i + 1];
      if (!r.on) return;
      if (!r.done) {
        const x = ox(r.pos), n = Math.floor(r.prog * 14);
        // 새로 만들어지는 폴리펩타이드
        for (let q = 0; q < n; q++) { const bx = x + Math.sin(q * 0.9) * 7, by = PKG.my + 22 + q * 7.5; ctx.fillStyle = g.col; ctx.beginPath(); ctx.arc(bx, by, 4.2, 0, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1; ctx.stroke(); }
        drawRibosome(x, PKG.my - 2, 1.1);
      } else {
        const fade = clamp(1 - r.t / 1.2, 0, 1);
        if (fade > 0.02) drawRibosome(ox(g.b), PKG.my - 2, 1.1, fade);
        // 완성된 단백질 (공 모양)
        const pr = 17;
        D.sphere(r.px, r.py, pr, g.col, { shadow: true });
        T(r.px, r.py + 5, String(i + 1), 15, '#fff', 'center', 800);
        T(r.px, r.py + pr + 18, '단백질 ' + (i + 1), 13, g.col, 'center', 800, { stroke: '#fff', strokeWidth: 4 });
      }
    });
    // 안내
    if (!k.run) T(Pn.x + Pn.w / 2, PKG.my + 24, '▶ 전사 시작을 누르면 mRNA가 만들어지고, 곧바로 번역이 이어져요', L(14.5, 12.5), '#94a3b8', 'center', 700);
    if (k.done) D.label(Pn.x + Pn.w / 2, PKG.my + 56, 'mRNA 1개 → 단백질 3종 (핵막이 없어서 전사 중에 번역 시작)', { bg: '#15803d', size: L(14, 12.5) });
    // 놓을 수 있는 자리 표시
    if ((tagger.drag && tagger.drag.moved) || tagger.selected) {
      tagger.boxes.forEach((b) => {
        const hot = tagger.hot === b;
        ctx.save(); ctx.setLineDash([6, 5]); ctx.strokeStyle = hot ? '#16a34a' : 'rgba(100,116,139,.7)'; ctx.lineWidth = hot ? 3.5 : 2; if (hot) { ctx.fillStyle = 'rgba(22,163,74,.12)'; rr(b.x, b.y, b.w, b.h, 10); ctx.fill(); }
        rr(b.x, b.y, b.w, b.h, 10); ctx.stroke(); ctx.restore();
      });
    }
    // 이름표와 카드
    tagger.update(dt); tagger.drawCards();
    const wr = pkTagWrong();
    if (wr.missing === 0 && wr.bad.length === 0) D.label(G.cell.x + G.cell.w / 2, G.cell.y + G.cell.h + 4 + (PHONE ? 0 : 0), '이름표 모두 알맞아요', { bg: '#15803d', size: 12.5 });
  }
  const pkPT = sorterPT(() => tagger);

  /* =========================================================
     ③ 진핵 유전자: 엑손, 인트론, 스플라이싱
     ========================================================= */
  const EK = PHONE ? 386 / 2700 : 680 / 2700;
  const EX0 = PHONE ? 72 : 80;
  const EUG = PHONE
    ? { nuc: { x: 8, y: 8, w: 464, h: 500 }, chr: { y: 76 }, gy: 170, py: 306, my: 440, lab: 170 }
    : { nuc: { x: 14, y: 14, w: 772, h: 520 }, chr: { y: 78 }, gy: 170, py: 306, my: 440, lab: 178 };
  const SEGS = [{ k: 'e1', n: '엑손 1', len: 150, ex: true }, { k: 'i1', n: '인트론 1', len: 900, ex: false }, { k: 'e2', n: '엑손 2', len: 200, ex: true }, { k: 'i2', n: '인트론 2', len: 1200, ex: false }, { k: 'e3', n: '엑손 3', len: 250, ex: true }];
  const DYS_EX = (() => { const r = mulberry(7), a = []; for (let i = 0; i < 79; i++) a.push(0.01 + 0.98 * (i + r()) / 79); return a; })();
  S.eu = { view: 0, tip: 0, run: false, seg: SEGS.map((s) => ({ rem: 0, ring: 0 })), mat: 0, shakeK: null, shakeT: 0, msg: '', msgT: 0, dysSeen: false, calcOn: false, ok1: false, ok2: false };
  function euSegX() { const xs = []; let x = EX0; SEGS.forEach((s, i) => { const w = s.len * EK * (s.ex ? 1 : 1 - ease.inOutCubic(S.eu.seg[i].rem)); xs.push({ x, w }); x += w; }); return xs; }
  const euRemoved = () => SEGS.filter((s, i) => !s.ex && S.eu.seg[i].rem >= 1).length;
  const euMatLen = () => (euRemoved() === 2 ? SEGS.filter((s) => s.ex).reduce((a, s) => a + s.len, 0) : 0);
  function euGo() { const e = S.eu; if (e.run) return; if (e.tip >= 1) euReset(); S.eu.run = true; Sound.click(); updateCtl(); }
  function euReset() { S.eu = Object.assign(S.eu, { tip: 0, run: false, seg: SEGS.map(() => ({ rem: 0, ring: 0 })), mat: 0, shakeK: null, shakeT: 0, msg: '', msgT: 0 }); updateCtl(); }
  function euFull() { euReset(); S.eu.view = 0; S.eu.dysSeen = false; $('#inM1').value = ''; $('#inM2').value = ''; S.eu.ok1 = false; S.eu.ok2 = false; $('#inM1').classList.remove('ok'); $('#inM2').classList.remove('ok'); updateCtl(); }
  function euRemove(i) {
    const e = S.eu, s = SEGS[i];
    if (e.tip < 1) { e.msg = '먼저 전사를 끝까지 해요'; e.msgT = 2; return; }
    if (s.ex) { e.shakeK = i; e.shakeT = 1; e.msg = '엑손은 번역되는 부분이라 남겨요'; e.msgT = 2.4; Sound.fail(); return; }
    if (e.seg[i].rem > 0) return;
    Sound.tick();
    SciSim.tween(e.seg[i], { rem: 1 }, { duration: RM ? 0.01 : 0.9, ease: 'inOutCubic', onDone: () => { Sound.success(); updateCtl(); } });
    SciSim.tween(e.seg[i], { ring: 1 }, { duration: RM ? 0.01 : 1.1, ease: 'outCubic' });
  }
  function euDraw(dt, t) {
    const e = S.eu, G = EUG;
    if (e.run) { e.tip = Math.min(1, e.tip + dt * 0.28); if (e.tip >= 1) { e.run = false; Sound.success(); updateCtl(); } }
    e.shakeT = Math.max(0, e.shakeT - dt * 2.5); e.msgT = Math.max(0, e.msgT - dt);
    const N = G.nuc;
    D.shadow(() => { rr(N.x, N.y, N.w, N.h, 36); ctx.fillStyle = '#eef2ff'; ctx.fill(); }, { blur: 8, y: 2 });
    ctx.strokeStyle = '#6366f1'; ctx.lineWidth = 4; ctx.setLineDash([]); rr(N.x, N.y, N.w, N.h, 36); ctx.stroke();
    T(N.x + 22, N.y + 28, '핵 (진핵세포)', L(14.5, 13), '#4338ca', 'left', 800);
    if (e.view === 1) { euDystro(t); return; }
    // 선형 염색체
    const cy = G.chr.y, cx0 = N.x + 26, cx1 = N.x + N.w - 26, mid = (cx0 + cx1) / 2;
    const gr = ctx.createLinearGradient(0, cy - 12, 0, cy + 12); gr.addColorStop(0, '#a5b4fc'); gr.addColorStop(1, '#6366f1');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(cx0 + 12, cy - 12); ctx.lineTo(mid - 14, cy - 12); ctx.lineTo(mid - 4, cy - 5); ctx.lineTo(mid + 4, cy - 5); ctx.lineTo(mid + 14, cy - 12); ctx.lineTo(cx1 - 12, cy - 12);
    ctx.arc(cx1 - 12, cy, 12, -Math.PI / 2, Math.PI / 2); ctx.lineTo(mid + 14, cy + 12); ctx.lineTo(mid + 4, cy + 5); ctx.lineTo(mid - 4, cy + 5); ctx.lineTo(mid - 14, cy + 12); ctx.lineTo(cx0 + 12, cy + 12); ctx.arc(cx0 + 12, cy, 12, Math.PI / 2, -Math.PI / 2); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#4338ca'; ctx.lineWidth = 2; ctx.stroke();
    T(cx1, cy - 20, '선형 염색체', 13, '#4338ca', 'right', 800);
    const gx = EX0 + 0.62 * (2700 * EK);
    ctx.fillStyle = '#f59e0b'; ctx.fillRect(gx - 5, cy - 12, 10, 24);
    ctx.save(); ctx.setLineDash([6, 6]); ctx.strokeStyle = 'rgba(245,158,11,.8)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(gx - 5, cy + 12); ctx.lineTo(EX0 - 40, G.gy - 24); ctx.moveTo(gx + 5, cy + 12); ctx.lineTo(EX0 + 2700 * EK, G.gy - 20); ctx.stroke(); ctx.restore();
    D.label(PHONE ? gx - 70 : gx + 14, cy + 34, PHONE ? '🔍 유전자 확대 (염기 수)' : '🔍 유전자 하나 확대 (숫자는 염기 수)', { bg: '#b45309', size: 12.5, align: 'left', pad: 6 });
    // 유전자 띠
    const gy = G.gy, bh = 34;
    const pw0 = PHONE ? 38 : 44;
    ctx.fillStyle = COLS.prom; rr(EX0 - pw0 - 2, gy - bh / 2, pw0, bh, 6); ctx.fill(); ctx.strokeStyle = C.shade(COLS.prom, -0.3); ctx.lineWidth = 1.5; ctx.stroke();
    T(EX0 - 4, gy - bh / 2 - 8, '프로모터', L(13, 12.5), '#b45309', 'right', 800);
    let x = EX0;
    const full = SEGS.map((s) => { const r = { x, w: s.len * EK }; x += r.w; return r; });
    SEGS.forEach((s, i) => {
      const r = full[i];
      if (s.ex) { ctx.fillStyle = COLS.exon; rr(r.x, gy - bh / 2, r.w, bh, 5); ctx.fill(); ctx.strokeStyle = '#14532d'; ctx.lineWidth = 1.5; ctx.stroke(); T(r.x + r.w / 2, gy - bh / 2 - 8, s.n, L(13, 12), '#15803d', 'center', 800); T(r.x + r.w / 2, gy + bh / 2 + 18, String(s.len), L(13, 12), '#15803d', 'center', 800); }
      else {
        ctx.fillStyle = COLS.intron; rr(r.x, gy - bh / 2, r.w, bh, 5); ctx.fill(); ctx.setLineDash([5, 4]); ctx.strokeStyle = '#4ade80'; ctx.lineWidth = 1.8; ctx.stroke(); ctx.setLineDash([]);
        T(r.x + r.w / 2, gy + 5, s.n + ' (' + s.len + ')', L(13.5, 11.5), '#166534', 'center', 800);
      }
    });
    // 전구 mRNA
    const py = G.py, ph = 24;
    T(N.x + 22, py - 30, '전구 mRNA (전사 직후)', L(14.5, 13), '#0369a1', 'left', 800);
    const xs = euSegX();
    const tipX = EX0 + e.tip * 2700 * EK;
    if (e.tip > 0.001) {
      T(EX0 + 2700 * EK, py - 30, e.tip >= 1 ? '2700 염기' : Math.round(e.tip * 2700) + ' 염기', L(14, 12.5), '#0369a1', 'right', 800);
      // RNA 중합 효소 위치 표시
      if (e.tip < 1) { ctx.save(); ctx.translate(tipX, gy - bh / 2 - 4); ctx.fillStyle = '#3b82f6'; ctx.beginPath(); ctx.ellipse(0, -2, 17, 11, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = '#1e40af'; ctx.lineWidth = 1.6; ctx.stroke(); ctx.restore(); }
    }
    let acc = 0;
    SEGS.forEach((s, i) => {
      const full0 = full[i], seg = xs[i], sd = e.seg[i];
      // 전사된 길이까지만 그려요
      const startBp = SEGS.slice(0, i).reduce((a, q) => a + q.len, 0);
      const have = clamp((e.tip * 2700 - startBp) / s.len, 0, 1);
      if (have <= 0) return;
      const sh = e.shakeK === i && e.shakeT > 0 && !RM ? Math.sin(clock * 55) * 3 * e.shakeT : 0;
      let w = seg.w * have, x0 = seg.x + sh;
      if (!s.ex) {
        // 빠져나가는 고리
        if (sd.ring > 0 && sd.ring < 1) {
          const rc = Math.min(30, full0.w * 0.18) + 6;
          ctx.save(); ctx.globalAlpha = 1 - sd.ring * sd.ring; ctx.strokeStyle = '#4ade80'; ctx.lineWidth = 6;
          ctx.beginPath(); ctx.arc(full0.x + full0.w / 2, py - 10 - sd.ring * 54, rc * (0.4 + 0.6 * (1 - sd.ring * 0.4)), 0, TAU); ctx.stroke(); ctx.restore();
        }
        if (w < 0.5) return;
        ctx.fillStyle = COLS.intron; rr(x0, py - ph / 2, w, ph, 5); ctx.fill(); ctx.setLineDash([5, 4]); ctx.strokeStyle = '#4ade80'; ctx.lineWidth = 1.8; ctx.stroke(); ctx.setLineDash([]);
        if (w > 100 && have >= 1) T(x0 + w / 2, py + 5, s.n, 12.5, '#166534', 'center', 800);
        if (e.tip >= 1 && sd.rem === 0) {
          D.label(x0 + w / 2, py + 26, '✂ 눌러서 제거', { bg: 'rgba(22,101,52,.85)', size: 12, pad: 6 });
        }
      } else {
        ctx.fillStyle = COLS.exon; rr(x0, py - ph / 2, w, ph, 5); ctx.fill(); ctx.strokeStyle = '#14532d'; ctx.lineWidth = 1.5; ctx.stroke();
      }
    });
    // 제거 후 잇기 안내
    if (euRemoved() > 0 && euRemoved() < 2) T(N.x + N.w / 2, py + 52, '남은 인트론도 제거해요', 13.5, '#64748b', 'center', 700);
    // 성숙 mRNA
    const my = G.my;
    const done = euRemoved() === 2 && SEGS.every((s, i) => s.ex || e.seg[i].rem >= 1);
    e.mat = approach(e.mat, done ? 1 : 0, dt, 2.2);
    T(N.x + 22, my - 34, '성숙 mRNA (인트론 제거 후)', L(14.5, 13), '#15803d', 'left', 800);
    if (e.mat > 0.02) {
      const total = 600 * EK, x0 = EX0 + (2700 * EK - total) / 2, ww = total;
      const yy = lerp(py, my, ease.outCubic(e.mat));
      let xx = lerp(xs[0].x, x0, ease.outCubic(e.mat));
      SEGS.forEach((s, i) => { if (!s.ex) return; const w = s.len * EK; ctx.fillStyle = COLS.exon; rr(xx, yy - ph / 2, w, ph, 4); ctx.fill(); ctx.strokeStyle = '#14532d'; ctx.lineWidth = 1.5; ctx.stroke(); xx += w; });
      if (e.mat > 0.95) {
        D.label(x0 + ww / 2, my + 32, '성숙 mRNA ' + (euMatLen()) + ' 염기 (150 + 200 + 250)', { bg: '#15803d', size: L(14, 12.5) });
        D.arrow(x0 + ww + 12, my, x0 + ww + 70, my, { color: '#6366f1', width: 3, head: 10 });
        T(x0 + ww + 78, my + 5, '핵 밖으로 → 번역', L(14, 12.5), '#4338ca', 'left', 800);
        T(x0 + ww / 2, my + 58, '2700 → 600 염기 (약 ' + Math.round(600 / 2700 * 100) + ' %만 남아요)', L(13.5, 12), '#475569', 'center', 700);
      }
    } else T(N.x + N.w / 2, my + 4, '인트론을 모두 제거하면 여기에 성숙 mRNA가 만들어져요', L(14, 12.5), '#94a3b8', 'center', 700);
    if (e.msgT > 0 && e.msg) D.label(N.x + N.w / 2, N.y + N.h - 18, e.msg, { bg: '#b45309', size: 13.5 });
    if (!e.run && e.tip === 0) D.label(N.x + N.w / 2, py, '▶ 전사 시작을 눌러 전구 mRNA를 만들어요', { bg: '#475569', size: L(14, 12.5) });
  }
  function euDystro(t) {
    const N = EUG.nuc, z = S.eu;
    const bx = N.x + 36, bw = N.w - 72, by = N.y + 100;
    TF(N.x + 22, N.y + 62, '디스트로핀 유전자 (근육 단백질; 사람에서 가장 긴 유전자 중 하나)', N.w - 44, L(16, 13.5), 11, '#26324a', 'left', 800);
    D.shadow(() => { rr(bx, by, bw, 38, 8); ctx.fillStyle = '#e0e7ff'; ctx.fill(); }, { blur: 5, y: 1 });
    ctx.strokeStyle = '#6366f1'; ctx.lineWidth = 2; rr(bx, by, bw, 38, 8); ctx.stroke();
    ctx.strokeStyle = COLS.exon; ctx.lineWidth = 1.4;
    DYS_EX.forEach((f) => { const x = bx + f * bw; ctx.beginPath(); ctx.moveTo(x, by + 4); ctx.lineTo(x, by + 34); ctx.stroke(); });
    T(bx, by - 8, 'DNA 약 220만 염기쌍 · 엑손 79개 (초록 눈금)', L(14, 12.5), '#4338ca', 'left', 800);
    // 성숙 mRNA (같은 눈금)
    const w2 = 14000 / 2.2e6 * bw, my = by + 118;
    T(bx, my - 14, '성숙 mRNA: 약 1.4만 염기 (같은 눈금)', L(14, 12.5), '#15803d', 'left', 800);
    ctx.fillStyle = COLS.exon; ctx.fillRect(bx, my, w2, 14);
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(bx, my + 14); ctx.lineTo(bx + 50, my + 70); ctx.moveTo(bx + w2, my + 14); ctx.lineTo(bx + 50 + 230, my + 70); ctx.stroke(); ctx.setLineDash([]);
    // 확대
    const zx = bx + 50, zy = my + 70, zw = 230;
    ctx.fillStyle = '#f1f5f9'; rr(zx - 4, zy - 4, zw + 8, 48, 8); ctx.fill(); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5; ctx.stroke();
    for (let i = 0; i < 79; i++) { ctx.fillStyle = i % 2 ? '#16a34a' : '#15803d'; ctx.fillRect(zx + i * zw / 79, zy, zw / 79 + 0.4, 40); }
    T(zx + zw + 16, zy + 18, '약 ' + Math.round(zw / w2) + '배 확대', L(14, 12.5), '#475569', 'left', 800);
    T(zx + zw + 16, zy + 38, '(엑손 79개를 이어 붙인 것)', L(12.5, 11.5), '#64748b', 'left', 700);
    const pctTxt = z.ok2 ? '약 ' + fmt1(Math.round(14000 / 2.2e6 * 1000) / 10) + ' %' : '? %';
    D.label(N.x + N.w / 2, N.y + N.h - 78, '유전자 중 mRNA가 되는 부분: ' + pctTxt, { bg: z.ok2 ? '#15803d' : '#475569', size: L(16, 14) });
    textBlock(N.x + 26, N.y + N.h - 52, N.w - 52, '나머지 대부분은 인트론이에요. 인트론은 전사된 뒤 제거되어 번역되지 않아요.', L(14.5, 13), '#334155', 20, 700);
  }
  const euPT = {
    down(p) {
      if (S.eu.view !== 0) return false;
      const xs = euSegX();
      for (let i = 0; i < SEGS.length; i++) {
        if (p.x >= xs[i].x - 2 && p.x <= xs[i].x + Math.max(xs[i].w, SEGS[i].ex ? SEGS[i].len * EK : 0) + 2 && Math.abs(p.y - EUG.py) <= 22) { S.eu.pdn = { i, x: p.x, y: p.y, moved: false }; return true; }
      }
      return false;
    },
    move(p) { const d = S.eu.pdn; if (!d) return; if (Math.hypot(p.x - d.x, p.y - d.y) > 8) d.moved = true; },
    up(p) {
      const d = S.eu.pdn; if (!d) return; S.eu.pdn = null;
      if (!d.moved || p.y < EUG.py - 20) euRemove(d.i);
    },
    hover(p) { return Math.abs(p.y - EUG.py) <= 20 ? 'pointer' : 'default'; },
  };

  /* =========================================================
     ④ 비교표 · 벤 다이어그램
     ========================================================= */
  const CMP_ROWS = [
    { k: 'DNA 모양', pro: '고리 모양 DNA (+ 플라스미드)', euk: '선형 DNA (염색체)' },
    { k: '염색체 수', pro: '보통 1개', euk: '여러 개 (사람 체세포 46개)' },
    { k: '유전자 밀도', pro: '높음 (유전자 사이가 짧아요)', euk: '낮음 (유전자 사이가 길어요)' },
    { k: '암호 부분 비율', pro: '대부분 (대장균 약 88 %)', euk: '일부 (사람 약 1.5 %)' },
    { k: '인트론', pro: '거의 없음', euk: '있음 (엑손 + 인트론)' },
    { k: '오페론', pro: '있음 (한 mRNA에 여러 유전자)', euk: '일반적으로 없음 (유전자마다 mRNA)' },
    { k: '유전체 크기', pro: '대체로 작음 (대장균 약 460만 염기쌍)', euk: '대체로 큼 (사람 약 31억 염기쌍)' },
  ];
  const CMP_START = [false, true, true, false, true, false, true];
  const CMPG = PHONE
    ? { lx: 8, lw: 78, ax: 92, bx: 284, cw: 188, y0: 66, rh: 80 }
    : { lx: 14, lw: 140, ax: 160, bx: 478, cw: 310, y0: 80, rh: 60 };
  S.cmp = { rows: CMP_ROWS.map((r, i) => ({ sw: CMP_START[i], t: CMP_START[i] ? 1 : 0, flag: false, shake: 0 })), checked: false };
  const cmpWrong = () => S.cmp.rows.map((r, i) => (r.sw ? i : -1)).filter((i) => i >= 0);
  function cmpFlip(i) { const r = S.cmp.rows[i]; r.sw = !r.sw; r.flag = false; Sound.click(); updateCtl(); }
  function cmpReset() { S.cmp.rows.forEach((r, i) => { r.sw = CMP_START[i]; r.t = r.sw ? 1 : 0; r.flag = false; }); updateCtl(); }
  function cmpRowRect(i) { return { x: CMPG.lx, y: CMPG.y0 + i * CMPG.rh, w: CMPG.bx + CMPG.cw - CMPG.lx, h: CMPG.rh - 6 }; }
  function cmpDraw(dt, t) {
    const G = CMPG;
    TF(VW / 2, PHONE ? 26 : 34, '줄을 눌러 두 칸을 서로 바꿔 알맞게 맞춰요', VW - 24, L(19, 15), 12, '#14532d', 'center', 800);
    const hy = PHONE ? 52 : 62;
    D.label(G.ax + G.cw / 2, hy, '⭕ 원핵생물 (대장균)', { bg: '#16a34a', size: L(15, 13) });
    D.label(G.bx + G.cw / 2, hy, '🧬 진핵생물 (사람)', { bg: '#2563eb', size: L(15, 13) });
    S.cmp.rows.forEach((r, i) => {
      r.t = RM ? (r.sw ? 1 : 0) : approach(r.t, r.sw ? 1 : 0, dt, 9); r.shake = Math.max(0, r.shake - dt * 3);
      const R = cmpRowRect(i), d = CMP_ROWS[i], sh = r.shake > 0 && !RM ? Math.sin(clock * 60) * 3 * r.shake : 0;
      ctx.fillStyle = r.flag ? 'rgba(220,38,38,.12)' : i % 2 ? '#f8fafc' : '#eef2f7'; rr(R.x, R.y, R.w, R.h, 12); ctx.fill();
      if (r.flag) { ctx.strokeStyle = '#dc2626'; ctx.lineWidth = 2.5; rr(R.x, R.y, R.w, R.h, 12); ctx.stroke(); }
      TF(G.lx + 8, R.y + R.h / 2 + 6, d.k, G.lw - 12, L(16, 13.5), 11, '#26324a', 'left', 800);
      const te = ease.inOutCubic(r.t);
      const chip = (txt, x) => {
        const w = G.cw - 8, h = R.h - 12, y = R.y + 6;
        D.shadow(() => { rr(x + sh, y, w, h, 10); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: 4, y: 1 });
        ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1.5; rr(x + sh, y, w, h, 10); ctx.stroke();
        const ls = wrap(txt, w - 18, L(14.5, 12.5), 800);
        const lh = L(18, 16), by = y + h / 2 - (ls.length - 1) * lh / 2 + 5;
        ls.forEach((s, q) => T(x + sh + w / 2, by + q * lh, s, L(14.5, 12.5), '#1f2d44', 'center', 800));
      };
      chip(d.pro, lerp(G.ax, G.bx, te) + 4); chip(d.euk, lerp(G.bx, G.ax, te) + 4);
    });
    T(VW / 2, VH - 14, '※ 근사 예시: 대장균 약 460만 염기쌍, 사람 약 31억 염기쌍', 12.5, '#94a3b8', 'center', 700);
  }
  const cmpPT = {
    down(p) { for (let i = 0; i < CMP_ROWS.length; i++) if (inRect(p.x, p.y, cmpRowRect(i))) { cmpFlip(i); return false; } return false; },
    hover(p) { return CMP_ROWS.some((r, i) => inRect(p.x, p.y, cmpRowRect(i))) ? 'pointer' : 'default'; },
  };

  const VN = [
    { id: 'plasmid', label: '플라스미드', g: 'p', icon: '⭕', col: '#16a34a' },
    { id: 'operon', label: '오페론', g: 'p', icon: '🔗', col: '#16a34a' },
    { id: 'ring', label: '고리 모양 염색체', g: 'p', icon: '🔄', col: '#16a34a' },
    { id: 'intron', label: '인트론', g: 'e', icon: '✂️', col: '#2563eb' },
    { id: 'repeat', label: '반복 서열', g: 'e', icon: '🔁', col: '#2563eb' },
    { id: 'exon', label: '엑손', g: 'e', icon: '🟩', col: '#2563eb' },
    { id: 'promoter', label: '프로모터', g: 'c', icon: '🚦', col: '#7c3aed' },
    { id: 'code', label: '유전 부호 (3염기 암호)', g: 'c', icon: '🔤', col: '#7c3aed' },
  ];
  const VNG = PHONE
    ? { boxes: [{ id: 'p', x: 8, y: 74, w: 148, h: 300, label: '원핵생물만', col: '#16a34a' }, { id: 'c', x: 166, y: 74, w: 148, h: 300, label: '공통', col: '#7c3aed' }, { id: 'e', x: 324, y: 74, w: 148, h: 300, label: '진핵생물만', col: '#2563eb' }], cw: 148, ch: 44, per: 3, x0: 8, y0: 392, dx: 156, dy: 52, kh: 40 }
    : { boxes: [{ id: 'p', x: 18, y: 92, w: 238, h: 262, label: '원핵생물만', col: '#16a34a' }, { id: 'c', x: 281, y: 92, w: 238, h: 262, label: '공통', col: '#7c3aed' }, { id: 'e', x: 544, y: 92, w: 238, h: 262, label: '진핵생물만', col: '#2563eb' }], cw: 184, ch: 46, per: 4, x0: 14, y0: 384, dx: 196, dy: 58, kh: 42 };
  let vennS = null;
  function vnInit() {
    const G = VNG;
    vennS = selectable({
      cards: VN.map((c) => ({ id: c.id, label: c.label, icon: c.icon, col: c.col })),
      boxes: G.boxes.map((b) => Object.assign({}, b, { cols: 1, hdr: b.id === 'c' ? 62 : 32 })),
      tray: (i) => ({ x: G.x0 + (i % G.per) * G.dx, y: G.y0 + Math.floor(i / G.per) * G.dy }),
      cw: G.cw, ch: G.ch, kh: G.kh,
      onChange: () => { updateCtl(); },
    });
    vennS.layout(true);
  }
  function vnState() {
    const bad = [], miss = [];
    VN.forEach((c) => { const k = vennS.cards.find((q) => q.id === c.id); if (!k.zone) miss.push(c.id); else if (k.zone !== c.g) bad.push(c.id); });
    return { bad, miss };
  }
  function vnDraw(dt, t) {
    const G = VNG;
    TF(VW / 2, PHONE ? 28 : 38, '원핵생물과 진핵생물의 공통점 · 차이점', VW - 24, L(20, 16), 12, '#14532d', 'center', 800);
    // 겹친 두 타원
    if (!PHONE) {
      ctx.save(); ctx.globalAlpha = 0.9;
      ctx.fillStyle = 'rgba(22,163,74,.10)'; ctx.beginPath(); ctx.ellipse(262, 222, 262, 150, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(37,99,235,.10)'; ctx.beginPath(); ctx.ellipse(538, 222, 262, 150, 0, 0, TAU); ctx.fill();
      ctx.restore();
    }
    vennS.update(dt);
    vennS.drawBoxes();
    const cb = G.boxes[1];
    textBlock(cb.x + cb.w / 2, cb.y + 42, cb.w - 14, 'DNA · 4종 염기 · 3염기 암호 · 전사와 번역', L(12.5, 11.5), '#6d28d9', 15, 800, 'center');
    vennS.drawCards();
    T(VW / 2, VH - 12, '카드는 8장이에요. 각 상자에 몇 장씩 들어갈까요?', 13, '#94a3b8', 'center', 700);
  }

  /* =========================================================
     화면 전환 · 조작 연결
     ========================================================= */
  const PTS = { cmp: cmpPT, euk: euPT };
  function setMode(m) {
    if (S.mode !== m) S.fade = 1;
    S.mode = m;
    PT = m === 'prok' ? pkPT : m === 'venn' ? sorterPT(() => vennS) : (PTS[m] || null);
    hideHint(); updateCtl();
  }
  const ctlNodes = $$('#ctrlCard .control');
  function updateCtl() {
    const fr = game ? game.free : false, lvNow = game ? game.level : 0;
    ctlNodes.forEach((n) => { n.hidden = (n.dataset.modes || '').split(' ').indexOf(S.mode) < 0; });
    modeButtons(S.mode, lvNow, fr);
    chipSet($('#szView'), S.sz.view); $$('#szView button').forEach((b) => b.classList.toggle('seen', !!S.sz.seen[b.dataset.v]));
    $('#szCalc').hidden = !S.sz.calcOn;
    const pk = S.pk;
    if (tagger) {
      const placed = tagger.cards.filter((c) => c.zone).length;
      $('#pkList').innerHTML = '<li class="' + (placed === 7 ? 'on' : '') + '">' + mark(placed === 7) + ' 이름표 ' + placed + ' / 7</li><li class="' + (pk.ran ? 'on' : '') + '">' + mark(pk.ran) + ' 전사 시작</li><li class="' + (pk.tip > TX_A ? 'on' : '') + '">' + mark(pk.tip > TX_A) + ' mRNA 1개 만들어짐</li><li class="' + (pk.rib.filter((r) => r.done).length === 3 ? 'on' : '') + '">' + mark(pk.rib.filter((r) => r.done).length === 3) + ' 단백질 ' + pk.rib.filter((r) => r.done).length + ' / 3종</li>';
    }
    $('#pkGo').textContent = pk.done ? '↺ 다시 보기' : pk.run ? '진행 중…' : '▶ 전사 시작';
    chipSet($('#euView'), S.eu.view);
    $('#euX').hidden = S.eu.view !== 0; $('#euCalc').hidden = !S.eu.calcOn;
    $('#euGo').textContent = S.eu.run ? '진행 중…' : S.eu.tip >= 1 ? '▶ 다시 전사' : '▶ 전사 시작';
  }
  bindModes(setMode);
  $$('#szView button').forEach((b) => b.addEventListener('click', () => szView(+b.dataset.v)));
  Object.keys(szKeys).forEach((k) => $('#' + szKeys[k]).addEventListener('input', () => {
    const was = S.sz.ok[k]; szCalc();
    if (S.sz.ok[k] && !was) { Sound.success(); parts.burst(SZC.x + SZC.w / 2, SZC.y + 200, { count: 14, speed: 160 }); }
    updateCtl();
  }));
  $('#pkClear').addEventListener('click', () => { Sound.click(); tagger.reset(); tagger.markBad([]); updateCtl(); });
  $('#pkGo').addEventListener('click', pkGo);
  $('#pkReset').addEventListener('click', () => { Sound.click(); pkReset(); });
  $$('#euView button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.eu.view = +b.dataset.v; if (S.eu.view === 1) S.eu.dysSeen = true; S.fade = 0.5; updateCtl(); }));
  $('#euGo').addEventListener('click', euGo);
  $('#euReset').addEventListener('click', () => { Sound.click(); euReset(); });
  $('#inM1').addEventListener('input', () => { const v = numOf('inM1'), ok = isFinite(v) && v === 600; const was = S.eu.ok1; S.eu.ok1 = ok; $('#inM1').classList.toggle('ok', ok); if (ok && !was) Sound.success(); updateCtl(); });
  $('#inM2').addEventListener('input', () => { const v = numOf('inM2'), ok = isFinite(v) && v >= 0.5 && v <= 0.7; const was = S.eu.ok2; S.eu.ok2 = ok; $('#inM2').classList.toggle('ok', ok); if (ok && !was) Sound.success(); updateCtl(); });
  $('#cmpShuffle').addEventListener('click', () => { Sound.click(); cmpReset(); });
  $('#vnClear').addEventListener('click', () => { Sound.click(); vennS.reset(); vennS.markBad([]); updateCtl(); });

  function szReset() {
    S.sz.view = 0; S.sz.seen = { 0: true }; S.sz.calcOn = true; S.sz.ok = { A: false, B: false, C: false, D: false };
    Object.keys(szKeys).forEach((k) => { const e = $('#' + szKeys[k]); e.value = ''; e.classList.remove('ok'); });
  }

  const levels = [
    {
      title: '유전체 크기와 구성', short: '유전체 크기', icon: '📏', phase: '분석',
      intro: '<p class="si-q">❓ 탐구 질문: 사람의 유전체가 대장균의 670배면 유전자도 670배 많을까?</p><p>🔗 <b>세포와 물질대사</b>에서 원핵세포와 진핵세포가 DNA를 어디에 두는지(핵막 유무 등)를 비교했고, <b>통합과학</b>에서 유전자가 전사와 번역을 거쳐 단백질이 된다고 배웠어요. 이번 차시에서는 <b>유전자가 DNA 위에 어떻게 배열되어 있는지</b>를 비교해요.</p><p>💡 <b>유전체</b>는 한 생물이 가진 유전 정보 전체(한 세트의 DNA)예요. 대장균 · 효모 · 사람의 유전체 크기, 유전자 수, 암호 부분 비율을 살펴보고 유전자 하나의 평균 길이를 계산해요. (수치는 근사 예시 값)</p>',
      features: ['size'],
      setup() { szReset(); setMode('size'); },
      recap: '사람의 유전체는 대장균의 약 670배이지만 유전자 수는 약 5배예요. 사람은 유전자 하나가 훨씬 길고(약 15만 대 약 1100 염기쌍) 암호 부분이 약 1.5 %뿐이에요.',
      summary: '<ul><li><b>유전체</b>: 한 생물이 가진 유전 정보 전체(한 세트의 DNA). (근사 예시) 대장균 약 460만 염기쌍 · 유전자 약 4300개 · 암호 부분 약 88 %, 효모 약 1200만 · 약 6000개 · 약 70 %, 사람 약 31억 · 약 2만 개 · 약 1.5 %.</li><li>사람 유전체는 대장균의 약 <b>670배</b>(31억 / 460만)인데 유전자 수는 약 <b>5배</b>뿐이에요.</li><li>유전자당 평균 길이 = 유전체 크기 / 유전자 수 → 대장균 약 <b>1100</b>, 사람 약 <b>15만</b> 염기쌍.</li><li>사람 유전체: 인트론 포함 유전자 영역 약 25 %, 반복 서열 약 절반, 암호 부분(엑손)은 약 1.5 %.</li><li>대장균 DNA를 곧게 펴면 4.6 × 10⁶ × 0.34 nm ≈ 약 1.56 mm로 세포 길이(약 2 µm)의 약 800배예요.</li></ul>',
      missions: [
        {
          id: 'calc', title: '배율과 유전자 하나의 길이 계산',
          goal: '세 가지 자료(<b>크기 · 유전자 수 · 암호 부분 %</b>)를 모두 보고, 오른쪽 아래 <b>계산 칸 4개</b>를 채우세요.',
          hint: '사람 유전체 31억 / 대장균 460만 ≈ 670. 유전자 수는 2만 / 4300 ≈ 5. 유전자 하나의 길이 = 유전체 크기 / 유전자 수: 대장균 460만 / 4300 ≈ 1100, 사람 31억 / 2만 = 15만.',
          setup() { szReset(); setMode('size'); },
          check: () => szSeenN() === 3 && szSolved(), hold: 0.8,
          status: () => mark(szSeenN() === 3) + ' 자료 ' + szSeenN() + ' / 3 &nbsp; ' + mark(S.sz.ok.A && S.sz.ok.B) + ' 배율 2개 &nbsp; ' + mark(S.sz.ok.C && S.sz.ok.D) + ' 유전자 길이 2개',
          explain: '사람 유전체는 대장균의 약 <b>670배</b>(31억 / 460만)이지만 유전자 수는 약 <b>5배</b>(2만 / 4300)뿐이에요. 유전자 하나의 평균 길이는 대장균 약 <b>1100</b>, 사람 약 <b>15만</b> 염기쌍으로, 사람 유전자가 훨씬 길어요.',
        },
        {
          type: 'quiz', title: '유전체가 크면 유전자도 많을까',
          goal: '사람 유전체는 대장균의 약 670배인데 유전자 수는 약 5배예요. 이를 가장 알맞게 설명한 것은?',
          setup() { setMode('size'); },
          choices: ['사람의 유전자 하나가 대장균 유전자보다 훨씬 짧기 때문이다', '유전자가 아닌 부분(비암호화 DNA)이 훨씬 많고, 유전자 하나도 훨씬 길기 때문이다', '비암호화 DNA는 쓸모없는 찌꺼기여서 없애도 되기 때문이다', '사람은 대장균보다 유전자가 필요하지 않기 때문이다'],
          answer: 1,
          feedback: ['반대예요. 유전자당 평균 길이는 사람 약 15만, 대장균 약 1100 염기쌍으로 사람 유전자가 훨씬 길어요.', '', '비암호화 DNA에는 유전자 발현을 조절하는 서열도 있어서 쓸모없다고 단정할 수 없어요.', '사람도 단백질을 만드는 유전자가 약 2만 개나 필요해요.'],
          explain: '유전체가 커도 유전자 수가 비례해 늘지 않는 것은 <b>비암호화 DNA</b>(유전자 사이 부분, 인트론, 반복 서열)의 비율이 높고 유전자 하나도 더 길기 때문이에요. 암호 부분은 대장균 약 88 %, 사람 약 1.5 %예요.',
        },
      ],
    },
    {
      title: '원핵생물의 유전자: 오페론', short: '원핵 유전자', icon: '⭕', phase: '모형',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 대장균은 유전체가 작고 유전자가 빽빽하며 암호 부분이 약 88 %라는 것을 확인했어요.</div><p>이번에는 <b>원핵생물의 유전자 배열</b>을 확대해 봐요. 고리 모양 DNA 속의 <b>오페론</b>은 <b>프로모터 → 유전자 1 · 2 · 3 → 종결 서열</b>이 한 줄로 이어져 있어요. 먼저 구성 요소에 <b>이름표</b>를 붙이고, 전사를 시작해 <b>mRNA와 단백질 3종</b>이 만들어지는 과정을 지켜봐요.</p><p>💡 원핵세포에는 핵막이 없어서 DNA와 리보솜이 같은 세포질에 있어요.</p>',
      features: ['prok'],
      setup() { tagger.reset(); tagger.markBad([]); pkReset(); setMode('prok'); },
      recap: '원핵생물의 DNA는 고리 모양이고 플라스미드가 있을 수 있어요. 관련 유전자들이 한 프로모터 아래 이어진 오페론은 하나의 mRNA로 전사되고, 핵막이 없어 전사 중에 번역이 시작돼요.',
      summary: '<ul><li><b>고리 모양 DNA 1개</b>(+ 플라스미드)가 세포질에 있어요. 유전자 밀도가 높고 인트론이 거의 없어요.</li><li><b>오페론</b>: 프로모터 → 유전자 1 · 2 · 3 → 종결 서열이 한 줄로 배열. 하나의 긴 mRNA가 만들어지고 그 mRNA에서 여러 단백질이 만들어져요.</li><li>핵막이 없어서 <b>전사 도중에 리보솜이 붙어 번역을 시작</b>해요(전사와 번역이 동시에 일어나요).</li><li>오페론의 작동 조절은 다음 단원에서 배워요.</li></ul>',
      missions: [
        {
          id: 'tags', title: '구성 요소 이름표 붙이기', manual: true,
          goal: '<b>이름표 7개</b>를 알맞은 자리(고리 DNA, 플라스미드, 오페론의 5개 구간)에 놓고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '주황 호 부분이 오페론이에요. 확대한 띠에서 왼쪽부터 프로모터 → 유전자 1 → 2 → 3 → 종결 서열이고, 큰 고리는 고리 모양 DNA, 작은 고리는 플라스미드예요.',
          setup() { tagger.reset(); tagger.markBad([]); pkReset(); setMode('prok'); },
          check() {
            const w = pkTagWrong();
            if (w.missing > 0) { tagger.markBad([]); return '이름표 ' + w.missing + '개가 아직 보관함에 있어요. 모두 알맞은 자리에 놓아요.'; }
            tagger.markBad(w.bad);
            if (w.bad.length) return '빨간 이름표는 자리가 달라요. 오페론은 프로모터 → 유전자 1 → 2 → 3 → 종결 서열 순서예요.';
            return true;
          },
          explain: '<b>프로모터</b>(전사 시작 신호) → <b>유전자 1 · 2 · 3</b> → <b>종결 서열</b>이 한 줄로 이어진 구간이 <b>오페론</b>이에요. 큰 고리는 <b>고리 모양 DNA</b>이고, 작은 고리는 <b>플라스미드</b>예요.',
        },
        {
          id: 'transcribe', title: '전사와 번역 지켜보기',
          goal: '<b>▶ 전사 시작</b>을 눌러 mRNA가 만들어지고, 그 위에서 <b>단백질 3종</b>이 만들어지는 것을 끝까지 지켜보세요.',
          hint: '▶ 전사 시작 단추를 누르고 기다려요. mRNA가 길어지는 도중에 리보솜이 앞쪽부터 붙어 단백질을 만들기 시작해요.',
          setup() { pkReset(); setMode('prok'); },
          check: () => S.pk.done, hold: 0.8,
          status: () => mark(S.pk.ran) + ' 전사 시작 &nbsp; ' + mark(S.pk.tip > TX_A) + ' mRNA 1개 &nbsp; ' + mark(S.pk.done) + ' 단백질 ' + S.pk.rib.filter((r) => r.done).length + ' / 3종',
          explain: '오페론 전체가 <b>하나의 mRNA</b>로 전사되고, 그 mRNA에서 <b>단백질 3종</b>이 만들어져요. 핵막이 없어서 mRNA가 다 만들어지기 전에 리보솜이 붙어 <b>번역</b>을 시작해요.',
        },
        {
          type: 'quiz', title: '전사와 번역이 동시에, 하나의 mRNA에서 여러 단백질',
          goal: '원핵생물에서 <b>전사 도중에 번역</b>이 시작될 수 있는 까닭과, <b>하나의 mRNA에서 여러 단백질</b>이 만들어지는 까닭을 옳게 짝지은 것은?',
          setup() { setMode('prok'); },
          choices: ['핵막이 있어서 / 인트론이 많아서', '리보솜이 핵 안에 있어서 / 유전자마다 프로모터가 따로 있어서', '핵막이 없어서 / 여러 유전자가 한 프로모터 아래 오페론으로 이어져 있어서', '플라스미드가 있어서 / 엑손이 여러 개여서'],
          answer: 2,
          feedback: ['원핵세포에는 핵막이 없어요. 인트론도 거의 없어요.', '원핵생물의 리보솜은 세포질에 있고, 오페론은 유전자 여러 개가 한 프로모터를 함께 써요.', '', '플라스미드는 작은 고리 DNA일 뿐 번역 시기와 관계가 없고, 엑손은 진핵생물 유전자의 구조예요.'],
          explain: '원핵생물은 <b>핵막이 없어서</b> DNA와 리보솜이 같은 공간에 있으니 전사 중에 번역이 시작될 수 있어요. 여러 유전자가 한 프로모터 아래 이어진 <b>오페론</b>은 하나의 mRNA로 전사되므로, 한 mRNA에서 여러 종류의 단백질이 만들어져요.',
        },
      ],
    },
    {
      title: '진핵생물의 유전자: 엑손과 인트론', short: '진핵 유전자', icon: '✂️', phase: '모형',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 원핵생물의 유전자는 오페론처럼 이어져 있고 인트론이 거의 없다는 것을 확인했어요.</div><p><b>진핵생물</b>의 유전자는 달라요. 선형 염색체 속의 유전자 하나는 <b>프로모터 + 엑손(발현되는 부분) + 인트론</b>으로 되어 있어요. 인트론도 <b>전사</b>는 되지만, mRNA가 성숙하는 과정에서 <b>제거</b>돼요. 인트론을 직접 제거해 <b>성숙 mRNA</b>를 만들고, 실제 유전자(디스트로핀)에서 얼마나 작은 부분이 mRNA가 되는지 비교해요.</p><p>💡 RNA 가공의 세부 과정은 다음 단원에서 배우고, 여기서는 인트론이 제거된다는 구조적 사실까지 다뤄요.</p>',
      features: ['euk'],
      setup() { euFull(); S.eu.calcOn = false; setMode('euk'); },
      recap: '진핵생물 유전자는 엑손과 인트론으로 이루어져요. 인트론은 전사되지만 제거되어 번역되지 않아서, 성숙 mRNA는 엑손만 이어 붙인 것(가상 유전자 X는 600 염기, 디스트로핀은 유전자의 약 0.6 %)이에요.',
      summary: '<ul><li>진핵생물 유전자 하나 = <b>프로모터 + 엑손(발현되는 부분) + 인트론</b>. 염색체는 <b>선형</b>이고 여러 개예요.</li><li><b>인트론은 전사되지만</b> mRNA가 성숙하는 과정에서 <b>제거</b>되고(스플라이싱) 번역되지 않아요. 엑손만 이어진 것이 <b>성숙 mRNA</b>예요.</li><li>가상 유전자 X: 전구 mRNA 2700 염기 → 인트론 900 + 1200 제거 → 성숙 mRNA 150 + 200 + 250 = <b>600 염기</b>.</li><li>디스트로핀 유전자: DNA 약 220만 염기쌍, 엑손 79개, 성숙 mRNA 약 1.4만 염기 → 유전자 중 mRNA가 되는 부분은 약 <b>0.6 %</b>.</li><li>한 유전자에서 엑손의 조합을 달리해 서로 다른 mRNA를 만들기도 해요(선택적 스플라이싱, 이름만).</li></ul>',
      missions: [
        {
          id: 'splice', title: '인트론 제거해 성숙 mRNA 만들기',
          goal: '<b>▶ 전사 시작</b>으로 전구 mRNA를 만든 뒤, <b>인트론 2개</b>를 눌러(또는 위로 끌어) 제거해 성숙 mRNA를 만드세요.',
          hint: '전사가 끝나야 인트론을 제거할 수 있어요. 옅은 색 구간(인트론 1, 2)을 눌러요. 엑손(진한 초록)은 남겨요.',
          setup() { euFull(); S.eu.calcOn = false; setMode('euk'); },
          check: () => euRemoved() === 2 && S.eu.mat > 0.95, hold: 0.8,
          status: () => mark(S.eu.tip >= 1) + ' 전사 완료 &nbsp; ' + mark(euRemoved() >= 1) + ' 인트론 ' + euRemoved() + ' / 2 제거 &nbsp; ' + mark(S.eu.mat > 0.95) + ' 성숙 mRNA',
          explain: '인트론은 전사되어 <b>전구 mRNA</b>에 들어 있지만 성숙 과정에서 <b>제거</b>돼요. 남은 <b>엑손</b>이 이어져 <b>성숙 mRNA</b>가 되고, 이것이 번역돼요.',
        },
        {
          id: 'len', title: '성숙 mRNA의 길이 계산',
          goal: '가상 유전자 X의 <b>성숙 mRNA 길이</b>를 구하고, <b>디스트로핀</b> 유전자에서 mRNA가 되는 부분의 비율(%)을 구해 입력하세요.',
          hint: '엑손 150 + 200 + 250 = 600. 디스트로핀: 1.4만 / 220만 × 100 ≈ 0.6 %. 디스트로핀 화면은 위쪽 단추로 볼 수 있어요.',
          setup() { S.eu.calcOn = true; S.eu.view = 0; S.eu.dysSeen = false; S.eu.ok1 = false; S.eu.ok2 = false; $('#inM1').value = ''; $('#inM2').value = ''; $('#inM1').classList.remove('ok'); $('#inM2').classList.remove('ok'); setMode('euk'); },
          check: () => S.eu.ok1 && S.eu.ok2 && S.eu.dysSeen, hold: 0.8,
          status: () => mark(S.eu.ok1) + ' 성숙 mRNA 길이 &nbsp; ' + mark(S.eu.dysSeen) + ' 디스트로핀 화면 &nbsp; ' + mark(S.eu.ok2) + ' 비율',
          explain: '가상 유전자 X의 성숙 mRNA는 150 + 200 + 250 = <b>600 염기</b>예요(전구 mRNA 2700 염기의 약 22 %). 디스트로핀은 DNA 약 220만 염기쌍에서 성숙 mRNA가 약 1.4만 염기뿐이라 약 <b>0.6 %</b>만 mRNA가 돼요.',
        },
        {
          type: 'quiz', title: '인트론은 전사될까, 번역될까',
          goal: '진핵생물 유전자의 <b>인트론</b>에 대해 옳은 것은?',
          setup() { S.eu.calcOn = false; setMode('euk'); },
          choices: ['전사되지 않고 DNA에만 있다', '전사되지만 mRNA 성숙 과정에서 제거되어 번역되지 않는다', '전사되어 번역되며 단백질의 일부가 된다', '원핵생물 유전자에도 대부분 들어 있다'],
          answer: 1,
          feedback: ['인트론도 DNA에서 RNA로 전사돼요. 전구 mRNA에 들어 있는 것을 눈으로 확인했어요.', '', '번역되는 것은 인트론이 제거된 성숙 mRNA의 엑손 부분이에요.', '원핵생물 유전자에는 인트론이 거의 없어요.'],
          explain: '인트론은 <b>전사는 되지만</b> 성숙 mRNA가 만들어지는 과정에서 <b>제거</b>되어 번역되지 않아요. 원핵생물 유전자에는 인트론이 거의 없어요.',
        },
      ],
    },
    {
      title: '원핵과 진핵 비교하기', short: '비교하기', icon: '📋', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계들에서</b> 유전체 크기(대장균 4.6 Mb, 사람 31억 염기쌍)와 원핵의 오페론, 진핵의 엑손 · 인트론을 직접 다뤘어요.</div><p>이제 둘을 <b>비교</b>해요. 비교표의 칸이 뒤바뀌어 있으니 알맞게 바로잡고, <b>벤 다이어그램</b>에서 공통점과 차이점을 분류해요. 마지막에는 비교한 내용을 실제 상황(사람 유전자를 대장균에서 발현)에 적용해 봐요.</p>',
      features: ['cmp', 'venn'],
      setup() { cmpReset(); setMode('cmp'); },
      recap: '원핵과 진핵은 모두 DNA에 4종 염기와 3염기 암호로 정보를 저장하고 전사 · 번역을 거쳐요. 차이는 DNA 모양과 개수, 유전자 밀도와 암호 부분 비율, 인트론 · 오페론의 유무, 유전체 크기예요.',
      summary: '<table class="tbl left"><tr><th></th><th>원핵생물</th><th>진핵생물</th></tr><tr><td class="rowh">DNA</td><td>고리 모양 1개 (+ 플라스미드)</td><td>선형 염색체 여러 개</td></tr><tr><td class="rowh">유전자 밀도 · 암호 부분</td><td>높음 · 대부분(대장균 약 88 %)</td><td>낮음 · 일부(사람 약 1.5 %)</td></tr><tr><td class="rowh">인트론 · 오페론</td><td>인트론 거의 없음 · 오페론 있음</td><td>인트론 있음 · 오페론 일반적으로 없음</td></tr><tr><td class="rowh">유전체 크기</td><td>대체로 작음(4.6 Mb)</td><td>대체로 큼(사람 약 31억)</td></tr></table><ul><li><b>공통점</b>: DNA에 유전 정보 저장, 4종 염기와 3염기 암호(거의 같은 유전 부호), 유전자 → 전사 → 번역, 프로모터.</li><li>비암호화 DNA는 쓸모없다고 단정할 수 없어요. 조절 서열도 있어요.</li></ul>',
      missions: [
        {
          id: 'table', title: '비교표 맞추기', manual: true,
          goal: '줄을 눌러 두 칸을 바꿔서 <b>원핵생물 / 진핵생물</b> 칸에 알맞은 내용이 오게 하고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '원핵: 고리 DNA, 염색체 1개, 유전자 밀도 높음, 암호 부분 대부분, 인트론 거의 없음, 오페론 있음, 유전체 작음. 진핵은 그 반대예요.',
          setup() { cmpReset(); setMode('cmp'); },
          check() {
            const w = cmpWrong();
            S.cmp.rows.forEach((r, i) => { const bad = w.indexOf(i) >= 0; if (bad && !r.flag) r.shake = 1; r.flag = bad; });
            if (!w.length) return true;
            return '아직 ' + w.length + '줄이 알맞지 않아요(빨간 줄). 줄을 눌러 두 칸을 바꿔 보세요.';
          },
          explain: '원핵생물은 <b>고리 DNA 1개</b>에 유전자가 빽빽하고(암호 부분 대부분) <b>오페론</b>이 있으며 인트론이 거의 없어요. 진핵생물은 <b>선형 염색체 여러 개</b>에 유전자 밀도가 낮고 암호 부분이 일부이며 <b>인트론</b>이 있고 유전체가 대체로 커요.',
        },
        {
          id: 'venn', title: '공통점과 차이점 분류', manual: true,
          goal: '카드 8장을 <b>원핵생물만 / 공통 / 진핵생물만</b> 상자에 알맞게 넣고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '원핵: 플라스미드, 오페론, 고리 모양 염색체. 공통: 프로모터, 유전 부호. 진핵: 인트론, 엑손, 반복 서열.',
          setup() { vennS.reset(); vennS.markBad([]); setMode('venn'); },
          check() {
            const s = vnState();
            if (s.miss.length) { vennS.markBad([]); return '카드 ' + s.miss.length + '장이 아직 보관함에 있어요.'; }
            vennS.markBad(s.bad);
            if (s.bad.length) return '빨간 카드는 상자가 달라요. 원핵에만 있는지, 둘 다에 있는지, 진핵에만 있는지 다시 생각해 보세요.';
            return true;
          },
          explain: '<b>원핵만</b>: 플라스미드, 오페론, 고리 모양 염색체. <b>진핵만</b>: 인트론, 엑손, 반복 서열(많음). <b>공통</b>: 프로모터와 유전 부호(3염기 암호). 둘 다 DNA에 4종 염기로 정보를 저장하고 전사와 번역으로 단백질을 만들어요.',
        },
        {
          type: 'quiz', title: '사람 유전자를 대장균에서',
          goal: '인트론이 있는 <b>사람의 유전자 DNA</b>를 그대로 대장균에 넣어 단백질을 만들게 했더니 제대로 된 단백질이 만들어지지 않았어요. 가장 알맞은 까닭은?',
          setup() { setMode('venn'); },
          choices: ['대장균에는 DNA가 없기 때문이다', '유전 부호가 사람과 대장균에서 완전히 다르기 때문이다', '대장균은 인트론을 제거하지 못해서 엑손과 인트론이 모두 mRNA에 남기 때문이다', '대장균에는 리보솜이 없기 때문이다'],
          answer: 2,
          feedback: ['대장균에도 DNA(고리 모양)가 있어요. DNA는 모든 생물의 공통점이에요.', '유전 부호(3염기 암호)는 거의 모든 생물이 같아요. 그래서 대장균에서도 사람 유전자의 암호를 읽을 수 있어요.', '', '대장균에도 리보솜이 있어요. 원핵생물은 전사 중에 리보솜이 mRNA에 붙어 번역해요.'],
          explain: '원핵생물에는 인트론이 거의 없고 <b>인트론을 제거하는 과정</b>도 없어요. 그래서 인트론이 있는 사람 유전자를 그대로 넣으면 엑손과 인트론이 모두 mRNA에 남아요. (실제로는 인트론이 이미 제거된 성숙 mRNA를 바탕으로 만든 DNA를 넣어요.) 유전 부호는 공통이라 암호는 읽을 수 있어요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hg-gene-structure', mount: '#game', badge: '유전체 탐험가', homeHref: '../../index.html#hg',
    featureLabels: { size: '📏 유전체 크기 비교', prok: '⭕ 원핵 유전자(오페론)', euk: '✂️ 진핵 유전자(엑손 · 인트론)', cmp: '📋 비교표', venn: '🔵 벤 다이어그램' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 읽음 칸 ---------- */
  function readouts() {
    const m = S.mode;
    if (m === 'size') setReads(['보는 자료', ['유전체 크기', '유전자 수', '암호 부분 %'][S.sz.view], '사람 / 대장균', S.sz.view === 0 ? (S.sz.ok.A ? '유전체 약 670배' : '유전체 ? 배') : S.sz.view === 1 ? (S.sz.ok.B ? '유전자 약 5배' : '유전자 ? 배') : '암호 1.5 % 대 88 %', '확인한 자료', szSeenN() + ' / 3']);
    else if (m === 'prok') { const p = tagger.cards.filter((c) => c.zone).length; setReads(['이름표', p + ' / 7', 'mRNA', S.pk.tip > TX_A ? '1개' : '—', '단백질', S.pk.rib.filter((r) => r.done).length + ' / 3종']); }
    else if (m === 'euk') {
      if (S.eu.view === 1) setReads(['유전자 길이', '약 220만', 'mRNA 길이', '약 1.4만 염기', 'mRNA 비율', S.eu.ok2 ? '약 0.6 %' : '? %']);
      else setReads(['전구 mRNA', Math.round(S.eu.tip * 2700) + ' 염기', '제거한 인트론', euRemoved() + ' / 2', '성숙 mRNA', euMatLen() ? euMatLen() + ' 염기' : '—']);
    }
    else if (m === 'cmp') setReads(['비교 항목', '7줄', '원핵', '고리 DNA · 오페론', '진핵', '엑손 · 인트론']);
    else { const p = vennS.cards.filter((c) => c.zone).length; setReads(['놓은 카드', p + ' / 8', '상자', '원핵 · 공통 · 진핵', '공통점', PHONE ? 'DNA · 암호' : 'DNA · 4종 염기 · 3염기 암호']); }
  }

  /* ---------- 시작 ---------- */
  pkInit(); vnInit();
  setMode('size');
  let lastFree = false, lastLv = -1;
  SciSim.loop((dt, t) => {
    clock = t; S.t = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (game && game.level !== lastLv) { lastLv = game.level; updateCtl(); }
    view.apply(); ctx.clearRect(0, 0, VW, VH);
    bgFill('#eef4f2', '#e3ece8');
    switch (S.mode) {
      case 'size': szDraw(dt, t); break;
      case 'prok': pkDraw(dt, t); break;
      case 'euk': euDraw(dt, t); break;
      case 'cmp': cmpDraw(dt, t); break;
      case 'venn': vnDraw(dt, t); break;
    }
    FX.update(dt); FX.draw();
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(241,246,243,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, PHONE, get game() { return game; }, levels, setMode, updateCtl, GEN, szView, szCalc, szSolved, get tagger() { return tagger; }, get vennS() { return vennS; }, pkTagWrong, pkGo, pkReset, PKG, OPG, ox,
    euGo, euReset, euRemove, euRemoved, euSegX, EUG, SEGS, EX0, EK, cmpWrong, cmpFlip, cmpRowRect, VN, vnState, VNG, CMP_ROWS,
  };
})();
