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
  /* 물 방울 모양 (물 분자가 빠져나가는 표시) */
  function drop(x, y, s, a) {
    ctx.save(); ctx.globalAlpha = a == null ? 1 : a; ctx.translate(x, y);
    const g = ctx.createLinearGradient(0, -s, 0, s); g.addColorStop(0, '#9fd6ff'); g.addColorStop(1, '#3b8fe8');
    ctx.fillStyle = g; ctx.strokeStyle = '#2a6fbf'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(0, -s * 1.3); ctx.bezierCurveTo(s * 0.9, -s * 0.2, s * 0.95, s * 0.95, 0, s * 0.95); ctx.bezierCurveTo(-s * 0.95, s * 0.95, -s * 0.9, -s * 0.2, 0, -s * 1.3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.ellipse(-s * 0.3, 0, s * 0.16, s * 0.3, 0.3, 0, TAU); ctx.fill();
    ctx.restore();
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
      if (e.kind === 'water') { // 물 한 방울이 위로 올라갔다가 사라져요
        const x = e.x + e.vx * p, y = e.y + e.vy * p + 60 * p * p;
        drop(x, y, e.size || 9, 1 - p * p);
        if (p < 0.6) T(x + 14, y - 4, '물', 13, '#2a6fbf', 'left', 800, { alpha: 1 - p / 0.6 });
      } else if (e.kind === 'text') {
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
     고등학교 생물의 유전 · Ⅰ. 유전자와 유전물질 - 다유전자 유전 (단원 59, 3차시)
     성취기준 [12유전01-03] 사람의 다유전자유전에 대해 이해하고, 유전 현상의 다양성 사례를 조사하여 과학적 근거를 활용하여 협력적으로 소통할 수 있다.
     ① 관찰: 단일 인자  ② 모형: 다유전자  ③ 분석: 환경과 유전  ④ 소통: 사례 소통
     ('키 점수' 모형은 교육용 가상 모형이고, 사례 자료는 예시 값이에요)
     ========================================================= */
  const S = { mode: 'compare', fade: 0, t: 0 };
  let game = null;
  const rnd = mulberry((Math.random() * 4294967296) >>> 0);
  const ease = SciSim.ease;
  const COL3 = { disc: '#7c6cf0', cont: '#16a34a', g1: '#2563eb', g2: '#f59e0b', g3: '#16a34a', ink: '#26324a' };
  const niceMax = (v) => { const steps = [5, 10, 12, 15, 20, 25, 30, 40, 50, 60, 70, 80, 100]; return steps.find((q) => q >= v) || 100; };

  const COL = { auto: '#7c6cf0', X: '#ec4899', Y: '#3b82f6', good: '#15803d', mut: '#f59e0b', red: '#dc2626', son: '#3b82f6', dau: '#ec4899' };
  /* ---------- 염색체 그림 (상염색체 · X · Y) ---------- */
  const CH_H = { auto: 76, X: 84, Y: 56 };
  /* mark: 상염색체 'A' | 'a', X 'N' | 'M' (M = 색맹 대립유전자 X'), Y 는 같은 자리에 유전자 없음 */
  function drawChr(x, y, kind, mark, o) {
    o = o || {};
    const h = CH_H[kind] * (o.s || 1), w = 18 * (o.s || 1);
    const col = kind === 'auto' ? COL.auto : kind === 'X' ? COL.X : COL.Y;
    ctx.save(); ctx.globalAlpha = o.alpha == null ? 1 : o.alpha;
    chromo(x, y, w, h, col);
    const by = y - h / 2 + h * 0.34;
    if (kind === 'Y') {
      ctx.setLineDash([3, 3]); ctx.strokeStyle = '#1e3a8a'; ctx.lineWidth = 1.3; ctx.strokeRect(x - w / 2 + 1, by - 5, w - 2, 10); ctx.setLineDash([]);
      T(x, by + 3.5, '×', 11 * (o.s || 1), '#1e3a8a', 'center', 800);
    } else {
      const bc = mark === 'A' || mark === 'N' ? COL.good : mark === 'a' ? COL.mut : COL.red;
      ctx.fillStyle = bc; ctx.fillRect(x - w / 2, by - 4, w, 8); ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 1; ctx.strokeRect(x - w / 2, by - 4, w, 8);
    }
    if (!o.nolabel) {
      const lab = kind === 'Y' ? 'Y' : kind === 'X' ? (mark === 'M' ? "X'" : 'X') : (mark || '');
      T(x, y + h / 2 + 14, lab, 14 * Math.min(1.2, o.s || 1), '#26324a', 'center', 800);
    }
    ctx.restore();
  }


  /* ---------- 막대 그래프 + 떨어지는 점 ---------- */
  class Hist {
    constructor(o) {
      this.labels = o.labels; this.n = o.labels.length; this.col = o.col; this.mode = o.mode || 'count';
      this.dots = []; this.queue = []; this.acc = 0; this.rate = 20; this.geom = null;
      this.reset();
    }
    reset() { this.cnt = new Array(this.n).fill(0); this.disp = new Array(this.n).fill(0); this.dots = []; this.queue = []; this.acc = 0; }
    total() { return this.cnt.reduce((a, b) => a + b, 0); }
    pending() { return this.dots.length + this.queue.length; }
    enqueue(list, secs) { this.queue = this.queue.concat(list); this.rate = Math.max(8, list.length / (secs || 1.5)); }
    spawn(k) {
      if (!this.geom) { this.cnt[k]++; return; }
      this.dots.push({ k, t: 0, x0: this.geom.cx(k) + (rnd() - 0.5) * 30, jx: (rnd() - 0.5) * this.geom.bw * 0.5 });
    }
    update(dt) {
      if (this.queue.length) { this.acc += this.rate * dt; while (this.acc >= 1 && this.queue.length) { this.acc -= 1; this.spawn(this.queue.shift()); } } else this.acc = 0;
      for (let i = this.dots.length - 1; i >= 0; i--) { const d = this.dots[i]; d.t += dt / (RM ? 0.01 : 0.5); if (d.t >= 1) { this.cnt[d.k]++; this.dots.splice(i, 1); } }
      const tot = this.total();
      for (let k = 0; k < this.n; k++) { const tg = this.mode === 'pct' ? (tot ? this.cnt[k] / tot * 100 : 0) : this.cnt[k]; this.disp[k] = RM ? tg : approach(this.disp[k], tg, dt, 9); }
    }
    /* r: {x,y,w,h}  o: {ymax, title, sub, gap, theory(퍼센트 배열), showTh, curve, xlab, labFn(k)->[line1,line2], every, valLab, col(k)} */
    draw(r, o) {
      o = o || {};
      panel(r.x, r.y, r.w, r.h, 14, '#fff');
      if (o.title) TF(r.x + 12, r.y + 22, o.title, r.w - 24, L(15, 13), 10.5, '#334155', 'left', 800);
      if (o.sub) TF(r.x + 12, r.y + 40, o.sub, r.w - 24, L(12.5, 11.5), 10, '#64748b', 'left', 700);
      const px = r.x + 40, pw = r.w - 54, top = r.y + (o.sub ? 56 : 44), base = r.y + r.h - (o.xlab ? 56 : 38), ph = base - top;
      const ymax = o.ymax || 10, stepV = ymax <= 12 ? 2 : ymax <= 30 ? 5 : 10;
      for (let v = 0; v <= ymax + 0.001; v += stepV) {
        const yy = base - ph * v / ymax; ctx.strokeStyle = v === 0 ? '#94a3b8' : '#e2e8f0'; ctx.lineWidth = v === 0 ? 1.6 : 1; ctx.beginPath(); ctx.moveTo(px, yy); ctx.lineTo(px + pw, yy); ctx.stroke(); T(px - 6, yy + 4, String(v), 11.5, '#64748b', 'right', 700);
      }
      T(r.x + r.w - 12, top - 8, this.mode === 'pct' ? '세로축: 비율 (%)' : '세로축: 사람 수 (명)', 11.5, '#64748b', 'right', 700);
      const slot = pw / this.n, gap = o.gap == null ? 0.22 : o.gap, bw = slot * (1 - gap);
      this.geom = { bw, cx: (k) => px + slot * (k + 0.5), top, base, ph };
      const tops = [];
      for (let k = 0; k < this.n; k++) {
        const cx = px + slot * (k + 0.5), v = clamp(this.disp[k], 0, ymax), hh = ph * v / ymax, col = o.col ? o.col(k) : this.col;
        tops.push({ x: cx, y: base - hh });
        if (hh > 0.4) { const g = ctx.createLinearGradient(cx - bw / 2, 0, cx + bw / 2, 0); g.addColorStop(0, C.shade(col, 0.2)); g.addColorStop(1, col); ctx.fillStyle = g; D.roundRect(cx - bw / 2, base - hh, bw, hh, Math.min(4, bw / 3)); ctx.fill(); }
        if (o.showTh && o.theory) { const ty = base - ph * clamp(o.theory[k], 0, ymax) / ymax; D.dashedLine(cx - bw / 2 - 1, ty, cx + bw / 2 + 1, ty, { color: '#0f172a', width: 2, dash: [4, 3] }); }
        if (o.valLab !== false && (this.n <= 9 || o.valLab) && this.cnt[k] > 0) {
          const lab = this.mode === 'pct' ? fmtN(this.cnt[k] / Math.max(1, this.total()) * 100, 1) : String(this.cnt[k]);
          T(cx, base - hh - 5, lab, this.n > 9 ? 10.5 : 12.5, '#1f2d44', 'center', 800, { stroke: '#fff', strokeWidth: 3 });
        }
        const show = !o.every || k % o.every === 0;
        if (show) { const ll = o.labFn ? o.labFn(k) : [this.labels[k]]; TF(cx, base + 15, ll[0], slot * (o.every || 1) - 2, this.n > 9 ? 11.5 : 12.5, 9.5, '#26324a', 'center', 800); if (ll[1]) T(cx, base + 30, ll[1], 11, '#64748b', 'center', 700); }
      }
      if (o.curve && this.total() > 0) {
        ctx.strokeStyle = 'rgba(220,38,38,.85)'; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(tops[0].x, tops[0].y);
        for (let i = 0; i < tops.length - 1; i++) { const mx = (tops[i].x + tops[i + 1].x) / 2, my = (tops[i].y + tops[i + 1].y) / 2; ctx.quadraticCurveTo(tops[i].x, tops[i].y, mx, my); }
        ctx.lineTo(tops[tops.length - 1].x, tops[tops.length - 1].y); ctx.stroke();
      }
      if (o.xlab) T(px + pw / 2, r.y + r.h - 8, o.xlab, 12, '#64748b', 'center', 700);
      this.dots.forEach((d) => {
        const e = ease.inQuad(clamp(d.t, 0, 1)), ex = ease.outQuad(clamp(d.t, 0, 1)), tx = tops[d.k] ? tops[d.k].x : 0, ty = tops[d.k] ? tops[d.k].y : base;
        const dx = d.x0 + (tx + d.jx - d.x0) * ex, dy = top - 4 + (Math.min(ty, base - 4) - (top - 4)) * e, dr = this.n > 9 ? 3.2 : 5;
        ctx.fillStyle = o.col ? o.col(d.k) : this.col; ctx.beginPath(); ctx.arc(dx, dy, dr, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.arc(dx - dr * 0.3, dy - dr * 0.3, dr * 0.35, 0, TAU); ctx.fill();
      });
    }
  }

  /* ---------- ① 단일 인자 vs 다유전자 ---------- */
  const ABO_DATA = [11, 8, 3, 8], ALB_DATA = [23, 7], HT_DATA = [1, 3, 7, 9, 6, 3, 1];
  const mkList = (data, seed) => { const a = []; data.forEach((c, k) => { for (let i = 0; i < c; i++) a.push(k); }); const r = mulberry(seed); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a.map((k) => k); };
  S.cmp = {
    abo: new Hist({ labels: ['A형', 'B형', 'AB형', 'O형'], col: COL3.disc }),
    alb: new Hist({ labels: ['정상', '알비니즘'], col: COL3.disc }),
    ht: new Hist({ labels: ['150~', '155~', '160~', '165~', '170~', '175~', '180~'], col: COL3.cont }),
    started: {},
  };
  const CMP_DEF = { abo: { data: ABO_DATA, seed: 11 }, alb: { data: ALB_DATA, seed: 12 }, ht: { data: HT_DATA, seed: 13 } };
  const cmpDone = (k) => S.cmp[k].total() === 30 && S.cmp[k].pending() === 0;
  const cmpN = () => ['abo', 'alb', 'ht'].filter(cmpDone).length;
  function cmpRun(k) {
    if (S.cmp.started[k] && !cmpDone(k)) return;
    S.cmp[k].reset(); S.cmp.started[k] = true;
    S.cmp[k].enqueue(mkList(CMP_DEF[k].data, CMP_DEF[k].seed), 1.8); Sound.tick(); updateCtl();
  }
  function cmpReset() { ['abo', 'alb', 'ht'].forEach((k) => S.cmp[k].reset()); S.cmp.started = {}; updateCtl(); }
  function compareDraw(dt, t) {
    ['abo', 'alb', 'ht'].forEach((k) => S.cmp[k].update(dt));
    const R = PHONE
      ? { abo: { x: 8, y: 8, w: 464, h: 168 }, alb: { x: 8, y: 184, w: 464, h: 146 }, ht: { x: 8, y: 338, w: 464, h: 206 }, tx: { x: 8, y: 552, w: 464, h: 80 } }
      : { abo: { x: 14, y: 10, w: 382, h: 190 }, alb: { x: 14, y: 208, w: 382, h: 170 }, ht: { x: 404, y: 10, w: 382, h: 368 }, tx: { x: 14, y: 386, w: 772, h: 162 } };
    S.cmp.abo.draw(R.abo, { ymax: 12, title: 'ABO식 혈액형 (가상 학생 30명)', sub: '구분되는 4가지', gap: 0.3 });
    S.cmp.alb.draw(R.alb, { ymax: 30, title: '알비니즘 (Aa × Aa 부부의 자녀 30명 모의)', sub: '구분되는 2가지', gap: 0.5 });
    S.cmp.ht.draw(R.ht, { ymax: 12, title: '키 (가상 학생 30명)', sub: '5 cm 구간 · 연속적으로 이어져요', gap: 0.04, curve: cmpDone('ht'), xlab: '키 구간 (cm)', col: () => COL3.cont, valLab: true });
    const T0 = R.tx; panel(T0.x, T0.y, T0.w, T0.h, 14, '#fff');
    const ok = cmpN() === 3;
    if (PHONE) {
      TF(T0.x + 12, T0.y + 26, ok ? '혈액형 · 알비니즘: 구분되는 몇 가지 (불연속)' : '세 가지 조사를 모두 해 보세요 (' + cmpN() + ' / 3)', T0.w - 24, 13.5, 10.5, ok ? '#5b21b6' : '#64748b', 'left', 800);
      if (ok) TF(T0.x + 12, T0.y + 52, '키: 연속적이고 가운데가 높은 종 모양', T0.w - 24, 13.5, 10.5, '#166534', 'left', 800);
    } else if (!ok) {
      TF(T0.x + T0.w / 2, T0.y + T0.h / 2 + 6, '왼쪽 위의 버튼으로 세 가지 조사를 모두 해 보세요 (' + cmpN() + ' / 3)', T0.w - 30, 17, 12, '#94a3b8', 'center', 800);
    } else {
      D.roundRect(T0.x + 10, T0.y + 10, T0.w / 2 - 15, T0.h - 20, 10); ctx.fillStyle = 'rgba(124,108,240,.10)'; ctx.fill();
      D.roundRect(T0.x + T0.w / 2 + 5, T0.y + 10, T0.w / 2 - 15, T0.h - 20, 10); ctx.fillStyle = 'rgba(22,163,74,.10)'; ctx.fill();
      T(T0.x + 24, T0.y + 38, '단일 인자 유전', 17, '#5b21b6', 'left', 800);
      textBlock(T0.x + 24, T0.y + 62, T0.w / 2 - 45, '한 쌍의 대립유전자 → 표현형이 뚜렷이 구분되는 몇 가지 (불연속 변이)', 14, '#334155', 20, 700);
      T(T0.x + T0.w / 2 + 20, T0.y + 38, '다유전자 유전', 17, '#166534', 'left', 800);
      textBlock(T0.x + T0.w / 2 + 20, T0.y + 62, T0.w / 2 - 45, '여러 쌍의 유전자 + 환경 → 표현형이 연속적이고 가운데가 높은 종 모양 (정규 분포)', 14, '#334155', 20, 700);
    }
  }

  /* ---------- ① 형질 카드 8장 분류 ---------- */
  const TRAIT8 = [
    { id: 'abo', label: 'ABO식 혈액형', sub: 'A · B · AB · O 4가지', ans: 'disc' },
    { id: 'alb', label: '알비니즘', sub: '정상 · 알비니즘 2가지', ans: 'disc' },
    { id: 'pea', label: '완두 씨 모양', sub: '둥근 씨 · 주름진 씨', ans: 'disc' },
    { id: 'cb', label: '적록 색맹', sub: '정상 · 색맹', ans: 'disc' },
    { id: 'ht', label: '키', sub: '150 cm ~ 180 cm 연속', ans: 'cont' },
    { id: 'skin', label: '피부색', sub: '밝은 색 ~ 어두운 색 연속', ans: 'cont' },
    { id: 'bmi', label: '체질량 지수', sub: '값이 연속적으로 이어져요', ans: 'cont' },
    { id: 'bp', label: '혈압', sub: '값이 연속적으로 이어져요', ans: 'cont' },
  ];
  const SB = PHONE ? { y: 10, h: 218 } : { y: 12, h: 208 };
  const sortBoxes = [
    { id: 'disc', label: '구분되는 몇 가지 (불연속)', col: '#7c6cf0', x: PHONE ? 8 : 14, y: SB.y, w: PHONE ? 228 : 382, h: SB.h, cols: 1, hdr: 30 },
    { id: 'cont', label: '연속적으로 이어져요', col: '#16a34a', x: PHONE ? 244 : 404, y: SB.y, w: PHONE ? 228 : 382, h: SB.h, cols: 1, hdr: 30 },
  ];
  const sorter8 = selectable({
    cards: TRAIT8.map((c) => ({ id: c.id, label: c.label, sub: c.sub, col: '#7c6cf0' })), boxes: sortBoxes, cw: PHONE ? 224 : 250, ch: 46, kh: PHONE ? 40 : 40,
    tray: (i) => { const order = [3, 6, 0, 5, 1, 7, 2, 4]; const j = order.indexOf(i); return PHONE ? { x: 8 + (j % 2) * 236, y: SB.y + SB.h + 52 + Math.floor(j / 2) * 54 } : { x: 18 + (j % 3) * 262, y: SB.y + SB.h + 56 + Math.floor(j / 3) * 56 }; },
    onChange() { updateCtl(); },
  });
  const sortWrong = () => sorter8.cards.filter((c) => c.zone && TRAIT8.find((q) => q.id === c.id).ans !== c.zone);
  function sortDraw(dt, t) {
    sorter8.update(dt); sorter8.drawBoxes();
    T(14, SB.y + SB.h + 30, '형질 카드를 알맞은 상자에 끌어 넣어요', L(16, 14), '#334155', 'left', 800);
    sorter8.drawCards();
  }
  const sortPT = sorterPT(() => sorter8);


  /* =========================================================
     ② 다유전자 모형: AaBbCc × AaBbCc …  (대문자 대립유전자 1개당 +2 cm, 기본 160 cm)
     ========================================================= */
  const GENE_L = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
  const popc = (v) => { let c = 0; while (v) { c += v & 1; v >>= 1; } return c; };
  const binom = (n, k) => { let r = 1; for (let i = 1; i <= k; i++) r = r * (n - k + i) / i; return Math.round(r); };
  const gameteLab = (g, n) => { let s = ''; for (let i = 0; i < n; i++) s += (g >> (n - 1 - i)) & 1 ? GENE_L[i] : GENE_L[i].toLowerCase(); return s; };
  const cmOf = (k) => 160 + 2 * k;
  S.cross = { n: 3, hist: null, cells: [], fill: null, th: false, solved: false, tab: 0 };
  function crossBuild(n) {
    const x = S.cross; x.n = n;
    x.hist = new Hist({ labels: Array.from({ length: 2 * n + 1 }, (_, k) => String(k)), col: COL3.cont, mode: 'pct' });
    x.theory = Array.from({ length: 2 * n + 1 }, (_, k) => binom(2 * n, k) / Math.pow(2, 2 * n) * 100);
    x.ymax = niceMax(Math.max.apply(null, x.theory) * 1.15);
    const N = n <= 3 ? Math.pow(2, n) : 0; x.cells = [];
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) x.cells.push({ i, j, k: popc(i) + popc(j), p: 0, on: false });
    x.fill = null;
  }
  crossBuild(3);
  const crossTotal = () => S.cross.hist.total();
  const crossBusy = () => S.cross.hist.pending() > 0 || !!S.cross.fill;
  function crossFill() {
    const x = S.cross; if (x.n > 3) return;
    x.hist.reset(); x.cells.forEach((c) => { c.on = false; c.p = 0; });
    const N = x.cells.length; x.fill = { i: 0, acc: 0, per: Math.min(0.09, 2.4 / N) }; Sound.tick(); updateCtl();
  }
  function crossRandom(m) {
    const x = S.cross, list = [];
    for (let i = 0; i < m; i++) { let k = 0; for (let j = 0; j < 2 * x.n; j++) if (rnd() < 0.5) k++; list.push(k); }
    x.hist.enqueue(list, m >= 1000 ? 2.2 : 1.2); Sound.tick(); updateCtl();
  }
  function crossReset() { S.cross.hist.reset(); S.cross.fill = null; S.cross.cells.forEach((c) => { c.on = false; c.p = 0; }); updateCtl(); }
  function crossUpdate(dt) {
    const x = S.cross; x.hist.update(dt);
    if (x.fill) {
      x.fill.acc += dt;
      while (x.fill && x.fill.acc >= x.fill.per && x.fill.i < x.cells.length) { x.fill.acc -= x.fill.per; const c = x.cells[x.fill.i++]; c.on = true; x.hist.spawn(c.k); }
      if (x.fill && x.fill.i >= x.cells.length) { x.fill = null; updateCtl(); }
    }
    x.cells.forEach((c) => { c.p = c.on ? (RM ? 1 : approach(c.p, 1, dt, 14)) : 0; });
  }
  function drawParent(cx, y, n, name, col) {
    person(cx, y, 26, col);
    T(cx, y + 36, name, 13, '#26324a', 'center', 800);
    const m = Math.min(n, 3), w = 14;
    for (let g = 0; g < m; g++) {
      const gx = cx - (m - 1) * 21 + g * 42;
      drawChr(gx - 8, y + 80, 'auto', GENE_L[g], { s: 0.62, nolabel: true });
      drawChr(gx + 8, y + 80, 'auto', GENE_L[g].toLowerCase(), { s: 0.62, nolabel: true });
      T(gx, y + 80 + 40, GENE_L[g] + GENE_L[g].toLowerCase(), 13, '#26324a', 'center', 800);
    }
    void w;
  }
  function crossDraw(dt, t) {
    crossUpdate(dt);
    const x = S.cross, n = x.n, N = n <= 3 ? Math.pow(2, n) : 0;
    const topH = 296, hy = 10 + topH + 8;
    // 부모 영역
    if (!PHONE) {
      panel(14, 10, 288, topH, 14, '#fff');
      TF(158, 34, '부모 : ' + GENE_L.slice(0, n).map((g) => g + g.toLowerCase()).join('').slice(0, 6) + (n > 3 ? '…' : '') + ' × 같은 유전자형', 262, 14.5, 10.5, '#334155', 'center', 800);
      drawParent(86, 66, n, '아버지', COL.son); drawParent(230, 66, n, '어머니', COL.dau);
      textBlock(26, 238, 264, '대문자 1개당 +2 cm (기본 160 cm)', 13.5, '#475569', 19, 800);
      textBlock(26, 258, 264, '배우자 2^' + n + ' = ' + Math.pow(2, n) + '가지 · 표현형 ' + (2 * n + 1) + '가지', 13.5, '#166534', 19, 800);
      textBlock(26, 278, 264, '(n = ' + n + '쌍, 서로 다른 염색체)', 12.5, '#64748b', 18, 700);
    } else {
      panel(8, 8, 464, 62, 14, '#fff');
      TF(240, 28, '부모 : ' + GENE_L.slice(0, n).map((g) => g + g.toLowerCase()).join('') + (n > 3 ? '…' : '') + ' × 같은 유전자형 (n = ' + n + '쌍)', 440, 14, 10.5, '#334155', 'center', 800);
      TF(240, 50, '대문자 1개당 +2 cm (기본 160 cm) · 배우자 ' + Math.pow(2, n) + '가지 · 표현형 ' + (2 * n + 1) + '가지', 440, 13, 10.5, '#166534', 'center', 800);
    }
    // 표 (n <= 3) 또는 설명
    const gx0 = PHONE ? 8 : 310, gy0 = PHONE ? 78 : 10, gw = PHONE ? 464 : 476, gh = PHONE ? 300 : topH;
    panel(gx0, gy0, gw, gh, 14, '#fff');
    if (n <= 3) {
      const cell = Math.min(PHONE ? 30 : 31, (gh - 62) / N, (gw - 70) / N), tw = cell * N, ox = gx0 + (gw - tw) / 2 + 12, oy = gy0 + 52;
      TF(gx0 + gw / 2, gy0 + 22, '배우자 조합표: 칸 = 자손 1명 (숫자 = 대문자 수)', gw - 20, L(14.5, 12.5), 10.5, '#334155', 'center', 800);
      for (let i = 0; i < N; i++) {
        TF(ox - 6, oy + cell * (i + 0.5) + 4, gameteLab(i, n), 40, 11.5, 9, COL.X, 'right', 800);
        T(ox + cell * (i + 0.5), oy - 5, gameteLab(i, n), cell < 28 ? 9.5 : 11, '#1d4ed8', 'center', 800);
      }
      x.cells.forEach((c) => {
        const cx = ox + c.j * cell, cy = oy + c.i * cell, sc = c.on ? 0.35 + 0.65 * ease.outBack(clamp(c.p, 0, 1)) : 1;
        ctx.save(); ctx.translate(cx + cell / 2, cy + cell / 2); ctx.scale(sc, sc);
        D.roundRect(-cell / 2 + 1, -cell / 2 + 1, cell - 2, cell - 2, 4);
        ctx.fillStyle = c.on ? C.mix('#d1fae5', '#065f46', c.k / (2 * n)) : '#f1f5f9'; ctx.fill();
        if (c.on) T(0, 4, String(c.k), cell < 28 ? 11 : 12.5, c.k / (2 * n) > 0.5 ? '#fff' : '#064e3b', 'center', 800);
        ctx.restore();
      });
    } else {
      TF(gx0 + gw / 2, gy0 + 30, 'n = ' + n + '쌍: 배우자 2^' + n + ' = ' + fmtN(Math.pow(2, n)) + '가지', gw - 24, L(17, 14), 11, '#26324a', 'center', 800);
      TF(gx0 + gw / 2, gy0 + 62, '자손의 조합 ' + fmtN(Math.pow(4, n)) + '가지 → 표로 만들기엔 너무 많아요', gw - 24, L(15, 13), 10.5, '#475569', 'center', 800);
      TF(gx0 + gw / 2, gy0 + 96, '그래서 자손을 무작위로 만들어 분포를 봐요', gw - 24, L(15, 13), 10.5, '#475569', 'center', 800);
      TF(gx0 + gw / 2, gy0 + 140, '표현형 ' + (2 * n + 1) + '가지 (키 160 ~ ' + cmOf(2 * n) + ' cm)', gw - 24, L(17, 14), 11, '#166534', 'center', 800);
      if (x.solved) TF(gx0 + gw / 2, gy0 + 180, '극단형 확률 (1/4)^' + n + ' = 1/' + fmtN(Math.pow(4, n)) + (n === 10 ? ' (약 100만분의 1)' : ''), gw - 24, L(16, 13.5), 10.5, '#b91c1c', 'center', 800);
      const mid = binom(2 * n, n) / Math.pow(2, 2 * n) * 100;
      TF(gx0 + gw / 2, gy0 + (x.solved ? 214 : 190), '가장 흔한 중간형(' + cmOf(n) + ' cm): 이론상 ' + fmtN(mid, 1) + ' %', gw - 24, L(15, 13), 10.5, '#334155', 'center', 800);
    }
    // 분포
    const hr = PHONE ? { x: 8, y: 386, w: 464, h: VH - 386 - 8 } : { x: 14, y: hy, w: 772, h: VH - hy - 12 };
    x.hist.draw(hr, {
      ymax: x.ymax, title: '자손의 키 분포 (자손 ' + fmtN(x.hist.total()) + '명)', sub: x.th ? '점선: 이론 비율' : '', gap: n > 5 ? 0.12 : 0.2, theory: x.theory, showTh: x.th,
      every: n > 5 ? 2 : 0, labFn: (k) => [String(k), cmOf(k) + ' cm'], xlab: '대문자 대립유전자 수 k (키 = 160 + 2k cm)', valLab: n <= 3,
      curve: n >= 8 && x.hist.total() > 200,
    });
    void hy;
  }


  /* =========================================================
     ③ 환경과 유전: 같은 유전자형도 환경에 따라 표현형이 퍼져요
     ========================================================= */
  const ZR = (seed, n) => { const r = mulberry(seed), a = []; for (let i = 0; i < n; i++) a.push(r() + r() - 1); return a; };
  const ENV = {
    z: [ZR(101, 100), ZR(202, 100), ZR(303, 100)],
    base: [166, 168, 166], names: ['AaBbCc', 'AABbCc', 'AABbcc'], cm: ['166 cm', '168 cm', '166 cm'], cols: [COL3.g1, COL3.g2, COL3.g3],
    tw: [ZR(404, 5), ZR(505, 5)], lo: 156, hi: 178,
  };
  S.env = { E: 0, dispE: 0, on: [true, true, false], dc: [new Array(23).fill(0), new Array(23).fill(0), new Array(23).fill(0)], touched: false, maxE: 0 };
  const envBin = (g, i, E) => Math.round(clamp(ENV.base[g] + E * ENV.z[g][i], ENV.lo, ENV.hi)) - ENV.lo;
  function envCounts(g, E) { const c = new Array(ENV.hi - ENV.lo + 1).fill(0); for (let i = 0; i < 100; i++) c[envBin(g, i, E)]++; return c; }
  function envOverlap(E) { const a = envCounts(0, E), b = envCounts(1, E); let s = 0; for (let k = 0; k < a.length; k++) s += Math.min(a[k], b[k]); return s / 100; }
    function envDraw(dt, t) {
    const e = S.env; e.dispE = RM ? e.E : approach(e.dispE, e.E, dt, 6);
    const nb = ENV.hi - ENV.lo + 1;
    const R = PHONE ? { x: 8, y: 8, w: 464, h: 356 } : { x: 14, y: 10, w: 772, h: 350 };
    panel(R.x, R.y, R.w, R.h, 14, '#fff');
    TF(R.x + 12, R.y + 24, '같은 유전자형 100명의 키 분포 (환경 변이 ±' + e.E + ' cm)', R.w - 24, L(16, 14), 10.5, '#334155', 'left', 800);
    const px = R.x + 40, pw = R.w - 54, top = R.y + 62, base = R.y + R.h - 44, ph = base - top, ymax = 60;
    [0, 20, 40, 60].forEach((v) => { const yy = base - ph * v / ymax; ctx.strokeStyle = v === 0 ? '#94a3b8' : '#e2e8f0'; ctx.lineWidth = v === 0 ? 1.6 : 1; ctx.beginPath(); ctx.moveTo(px, yy); ctx.lineTo(px + pw, yy); ctx.stroke(); T(px - 6, yy + 4, String(v), 11.5, '#64748b', 'right', 700); });
    T(R.x + R.w - 12, top - 8, '세로축: 사람 수 (명)', 11.5, '#64748b', 'right', 700);
    const slot = pw / nb;
    // 범례 (켜 둔 집단)
    let lx = R.x + 12;
    for (let g = 0; g < 3; g++) {
      if (!e.on[g]) continue;
      D.roundRect(lx, R.y + 36, 12, 12, 3); ctx.fillStyle = ENV.cols[g]; ctx.fill();
      const lab = ENV.names[g] + ' (' + ENV.cm[g] + ')'; T(lx + 17, R.y + 47, lab, L(13, 12), '#334155', 'left', 800); lx += L(150, 140);
    }
    for (let g = 0; g < 3; g++) {
      if (!e.on[g]) continue;
      const tg = envCounts(g, e.E);
      for (let k = 0; k < nb; k++) {
        e.dc[g][k] = RM ? tg[k] : approach(e.dc[g][k], tg[k], dt, 9);
        const hh = ph * clamp(e.dc[g][k], 0, ymax) / ymax; if (hh < 0.4) continue;
        const cx = px + slot * (k + 0.5), bw = slot * 0.84;
        ctx.globalAlpha = 0.55; ctx.fillStyle = ENV.cols[g]; D.roundRect(cx - bw / 2, base - hh, bw, hh, 3); ctx.fill(); ctx.globalAlpha = 1;
        ctx.strokeStyle = ENV.cols[g]; ctx.lineWidth = 1.4; D.roundRect(cx - bw / 2, base - hh, bw, hh, 3); ctx.stroke();
      }
    }
    for (let k = 0; k < nb; k++) { const cm = ENV.lo + k; if (cm % 2 === 0) T(px + slot * (k + 0.5), base + 16, String(cm), 11.5, '#26324a', 'center', 800); }
    T(px + pw / 2, R.y + R.h - 8, '키 (cm)', 12, '#64748b', 'center', 700);
    const ov = envOverlap(e.E);
    D.label(R.x + R.w - 14, R.y + 24, '두 집단의 겹침 ' + fmtN(ov * 100, 0) + ' %', { bg: ov >= 0.5 ? '#16a34a' : '#475569', color: '#fff', size: 13, align: 'right' });
    // 1란성 쌍둥이 5쌍
    const Q = PHONE ? { x: 8, y: 372, w: 464, h: 260 } : { x: 14, y: 368, w: 772, h: 180 };
    panel(Q.x, Q.y, Q.w, Q.h, 14, '#fff');
    TF(Q.x + 12, Q.y + 24, '1란성 쌍둥이 5쌍 (유전자형이 같아요: AaBbCc, 기본 166 cm)', Q.w - 24, L(15, 13), 10.5, '#334155', 'left', 800);
    const pairW = (Q.w - 24) / 5, ph2 = Q.h - 80;
    for (let i = 0; i < 5; i++) {
      const cx = Q.x + 12 + pairW * (i + 0.5);
      const A = Math.round(clamp(166 + e.E * ENV.tw[0][i], ENV.lo, ENV.hi)), B = Math.round(clamp(166 + e.E * ENV.tw[1][i], ENV.lo, ENV.hi));
      const scale = (v) => ph2 * (v - 150) / 30;
      [[A, -1, COL.son], [B, 1, COL.dau]].forEach(([v, d, c]) => {
        const bx = cx + d * (PHONE ? 16 : 24), hh = scale(v), by = Q.y + Q.h - 36;
        ctx.fillStyle = C.rgba(c, 0.8); D.roundRect(bx - (PHONE ? 11 : 15), by - hh, PHONE ? 22 : 30, hh, 5); ctx.fill();
        T(bx, by - hh - 5, String(v), 12.5, '#1f2d44', 'center', 800);
      });
      T(cx, Q.y + Q.h - 16, A === B ? '차이 없음' : '차이 ' + Math.abs(A - B) + ' cm', L(14, 12.5), A === B ? '#64748b' : '#b91c1c', 'center', 800);
    }
  }
  const envTwDiff = () => { let m = 0; for (let i = 0; i < 5; i++) { const A = Math.round(clamp(166 + S.env.E * ENV.tw[0][i], ENV.lo, ENV.hi)), B = Math.round(clamp(166 + S.env.E * ENV.tw[1][i], ENV.lo, ENV.hi)); m = Math.max(m, Math.abs(A - B)); } return m; };


  /* =========================================================
     ④ 사례 소통: 사례 카드 분류와 모둠 보드
     ========================================================= */
  const CASE6 = [
    { id: 'ht', label: '키', short: '키', ans: 'poly', dist: 'cont', env: '영양 · 건강 상태에 따라 달라져요', evd: '분포가 연속적인 종 모양이고, 1란성 쌍둥이도 키가 조금 달라요 (예시)', gene: '수천 개의 유전 변이가 조금씩 영향을 줘요 (키 변이 중 유전의 몫 약 80 %, 나머지는 환경 · 예시 값)' },
    { id: 'skin', label: '피부색', short: '피부색', ans: 'poly', dist: 'cont', env: '햇빛(자외선) 노출에 따라 달라져요', evd: '밝은 색에서 어두운 색까지 연속적이에요', gene: '멜라닌 합성을 조절하는 여러 유전자가 관여해요' },
    { id: 'bmi', label: '체질량 지수', short: '체질량 지수', ans: 'poly', dist: 'cont', env: '식습관 · 운동에 따라 달라져요', evd: '값이 연속적이고, 가족력과 생활 습관이 함께 영향을 줘요', gene: '유전 + 환경이 함께 만든 형질이에요' },
    { id: 'bp', label: '혈압', short: '혈압', ans: 'poly', dist: 'cont', env: '소금 섭취 · 운동 · 스트레스 등 생활 습관', evd: '값이 연속적이고, 가족력과 생활 습관이 함께 영향을 줘요', gene: '여러 유전자 + 생활 습관이 관여해요' },
    { id: 'abo', label: 'ABO식 혈액형', short: 'ABO식', ans: 'single', dist: 'disc', env: '환경의 영향이 거의 없어요', evd: 'A · B · AB · O 4가지로 뚜렷이 구분돼요', gene: '한 개의 유전자(복대립유전자)가 정해요' },
    { id: 'alb', label: '알비니즘', short: '알비니즘', ans: 'single', dist: 'disc', env: '환경의 영향이 거의 없어요', evd: '정상 · 알비니즘 2가지로 뚜렷이 구분돼요', gene: 'TYR 유전자 하나의 이상이에요 (열성)' },
  ];
  const CB = PHONE ? { y: 10, h: 262 } : { y: 12, h: 172 };
  const caseBoxes = [
    { id: 'single', label: '단일 인자 유전', col: '#7c6cf0', x: PHONE ? 8 : 14, y: CB.y, w: PHONE ? 228 : 382, h: CB.h, cols: PHONE ? 1 : 2, hdr: 30 },
    { id: 'poly', label: '다유전자 + 환경', col: '#16a34a', x: PHONE ? 244 : 404, y: CB.y, w: PHONE ? 228 : 382, h: CB.h, cols: PHONE ? 1 : 2, hdr: 30 },
  ];
  S.cases = { last: null, seen: {} };
  const caseSorter = selectable({
    cards: CASE6.map((c) => ({ id: c.id, label: c.label, short: c.short, col: '#7c6cf0' })), boxes: caseBoxes, cw: PHONE ? 224 : 250, ch: 44, kh: PHONE ? 34 : 38,
    tray: (i) => { const order = [4, 2, 0, 5, 3, 1]; const j = order.indexOf(i); return PHONE ? { x: 8 + (j % 2) * 236, y: CB.y + CB.h + 34 + Math.floor(j / 2) * 52 } : { x: 18 + (j % 3) * 262, y: CB.y + CB.h + 34 + Math.floor(j / 3) * 54 }; },
    afterTap(c) { S.cases.last = c.id; S.cases.seen[c.id] = true; updateCtl(); },
    onChange() { updateCtl(); },
  });
  const caseWrong = () => caseSorter.cards.filter((c) => c.zone && CASE6.find((q) => q.id === c.id).ans !== c.zone);
  const casePT = sorterPT(() => caseSorter);
  function miniDist(x, y, w, h, kind) {
    const vals = kind === 'disc' ? [0.55, 0.3, 0.12, 0.35] : [0.12, 0.3, 0.62, 0.95, 0.62, 0.3, 0.12];
    const n = kind === 'disc' ? 4 : 7, bw = w / n;
    vals.slice(0, n).forEach((v, i) => { ctx.fillStyle = kind === 'disc' ? '#7c6cf0' : '#16a34a'; const g = kind === 'disc' ? 0.35 : 0.04; D.roundRect(x + i * bw + bw * g / 2, y + h - h * v, bw * (1 - g), h * v, 2); ctx.fill(); });
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x, y + h); ctx.lineTo(x + w, y + h); ctx.stroke();
  }
  function casesDraw(dt, t) {
    caseSorter.update(dt); caseSorter.drawBoxes();
    T(14, CB.y + CB.h + 22, '사례 카드를 눌러 근거를 확인하고, 알맞은 상자에 넣어요', L(15, 13), '#334155', 'left', 800);
    const EP = PHONE ? { x: 8, y: CB.y + CB.h + 34 + 3 * 52 + 6, w: 464 } : { x: 14, y: CB.y + CB.h + 34 + 2 * 54 + 6, w: 772 };
    EP.h = VH - EP.y - (PHONE ? 8 : 12);
    panel(EP.x, EP.y, EP.w, EP.h, 14, '#fff');
    const cs = CASE6.find((q) => q.id === S.cases.last);
    if (!cs) { TF(EP.x + EP.w / 2, EP.y + EP.h / 2 + 5, '카드를 눌러 근거를 확인해요 (분포 모양 · 환경 요인 · 유전자 수)', EP.w - 24, L(16, 13.5), 11, '#94a3b8', 'center', 800); }
    else {
      TF(EP.x + 12, EP.y + 24, cs.label + ' 의 근거 (예시 자료)', EP.w - 24, L(16, 14), 11, '#26324a', 'left', 800);
      miniDist(EP.x + 14, EP.y + 40, PHONE ? 90 : 110, EP.h - 60, cs.dist);
      T(EP.x + 14 + (PHONE ? 45 : 55), EP.y + EP.h - 8, cs.dist === 'disc' ? '구분되는 몇 가지' : '연속 · 종 모양', 11.5, '#64748b', 'center', 700);
      const tx = EP.x + (PHONE ? 118 : 140), tw = EP.w - (PHONE ? 130 : 152); let yy = EP.y + 46;
      [['분포', cs.evd], ['환경', cs.env], ['유전자', cs.gene]].forEach(([k, v]) => {
        D.label(tx, yy, k, { bg: '#e2e8f0', color: '#334155', size: 12, align: 'left' });
        const hh = textBlock(tx + 52, yy - 6, tw - 52, v, L(13.5, 12), '#334155', L(18, 16), 700); yy += Math.max(30, hh + 12);
      });
    }
    caseSorter.drawCards();
  }
  /* ---------- 모둠 보드 ---------- */
  const BD_TRAITS = [{ id: 'ht', t: '키' }, { id: 'skin', t: '피부색' }, { id: 'bmi', t: '체질량 지수' }, { id: 'bp', t: '혈압' }, { id: 'abo', t: 'ABO식 혈액형' }];
  const BD_EV = [{ id: 'e1', t: '분포가 연속적인 종 모양이에요', ok: true }, { id: 'e2', t: '환경(영양 · 햇빛 · 생활 습관)에 따라 달라져요', ok: true }, { id: 'e3', t: '유전자 한 개의 검사 결과예요', ok: false }, { id: 'e4', t: '주변 몇 사람의 경험이에요', ok: false }];
  const BD_SRC = [{ id: 's1', t: '교과서 · 학술 논문', ok: true }, { id: 's2', t: '공공기관 통계', ok: true }, { id: 's3', t: '출처를 알 수 없는 게시글', ok: false }];
  S.board = { posts: [], sel: { tr: 'ht', ev: 'e1', src: 's1' }, shake: 0 };
  const bdName = (id, arr) => (arr.find((q) => q.id === id) || {}).t || '';
  function bdPost() {
    const b = S.board, s = b.sel;
    if (b.posts.length >= 3) { showHint('모둠원 세 명의 카드가 모두 올라갔어요. 비우고 다시 해 볼 수 있어요.', 3500); return; }
    if (s.tr === 'abo') { fail('ABO식 혈액형은 한 개의 유전자가 정하는 단일 인자 형질이에요. \'사람의 유전은 대부분 다유전자 유전\'을 뒷받침하지 못해요.'); return; }
    if (b.posts.some((p) => p.tr === s.tr)) { fail('같은 형질이 이미 올라가 있어요. 서로 다른 형질을 모아야 결론이 믿을 만해져요.'); return; }
    const ev = BD_EV.find((q) => q.id === s.ev), src = BD_SRC.find((q) => q.id === s.src);
    if (!ev.ok) { fail('\'' + ev.t + '\'는 근거가 약해요. 한 유전자의 검사 결과나 몇 사람의 경험만으로 형질을 단정할 수 없어요.'); return; }
    if (!src.ok) { fail('출처를 알 수 없는 글은 근거로 쓸 수 없어요. 교과서 · 학술 논문이나 공공기관 통계를 골라요.'); return; }
    b.posts.push({ tr: s.tr, ev: s.ev, src: s.src, t: 0 }); Sound.success(); parts.burst(VW / 2, VH * 0.4, { count: 14, speed: 150 }); hideHint(); updateCtl();
    function fail(msg) { b.shake = 1; Sound.fail(); showHint(msg, 5200); }
  }
  function boardDraw(dt, t) {
    const b = S.board, n = b.posts.length;
    b.shake = Math.max(0, b.shake - dt * 2.5);
    TF(VW / 2, PHONE ? 26 : 32, '🧑‍🤝‍🧑 모둠 보드: 서로 다른 형질을 모아 보세요', VW - 24, L(19, 15.5), 12, '#26324a', 'center', 800);
    const cw = PHONE ? VW - 16 : 246, gap = PHONE ? 6 : 16, x0 = PHONE ? 8 : (VW - (cw * 3 + gap * 2)) / 2, y0 = PHONE ? 46 : 54, ch = PHONE ? 92 : 276;
    const cardXY = (i) => (PHONE ? { x: x0, y: y0 + i * (ch + gap) } : { x: x0 + i * (cw + gap), y: y0 });
    for (let i = 0; i < 3; i++) {
      const { x, y } = cardXY(i), p = b.posts[i];
      if (!p) {
        ctx.setLineDash([6, 5]); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; D.roundRect(x, y, cw, ch, 14); ctx.stroke(); ctx.setLineDash([]);
        T(PHONE ? x + 14 : x + cw / 2, y + 28, '모둠원 ' + (i + 1), L(15, 13.5), '#94a3b8', PHONE ? 'left' : 'center', 800);
        TF(x + cw / 2, y + (PHONE ? 62 : ch / 2 + 4), '카드가 아직 없어요', cw - 16, L(14.5, 12.5), 10.5, '#94a3b8', 'center', 700);
        continue;
      }
      p.t = RM ? 1 : Math.min(1, p.t + dt / 0.4); const sc = ease.outBack(p.t);
      ctx.save(); ctx.translate(x + cw / 2, y + ch / 2); ctx.scale(sc, sc); ctx.translate(-(x + cw / 2), -(y + ch / 2));
      D.shadow(() => { D.roundRect(x, y, cw, ch, 14); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: 8, y: 3 });
      ctx.strokeStyle = '#16a34a'; ctx.lineWidth = 3; D.roundRect(x, y, cw, ch, 14); ctx.stroke();
      if (PHONE) {
        T(x + 12, y + 22, '모둠원 ' + (i + 1), 13, '#64748b', 'left', 800);
        D.label(x + 86, y + 18, bdName(p.tr, BD_TRAITS), { bg: '#0f766e', color: '#fff', size: 12, align: 'left' });
        D.label(x + 190, y + 18, '다유전자 + 환경', { bg: '#5b21b6', color: '#fff', size: 12, align: 'left' });
        const hh = textBlock(x + 12, y + 46, cw - 24, '근거 : ' + bdName(p.ev, BD_EV), 12.5, '#92400e', 17, 800);
        TF(x + 12, y + 46 + hh + 8, '출처 : ' + bdName(p.src, BD_SRC), cw - 24, 12.5, 10, '#1e40af', 'left', 800);
      } else {
        T(x + 12, y + 24, '모둠원 ' + (i + 1), 14, '#64748b', 'left', 800);
        let yy = y + 48;
        [['형질', bdName(p.tr, BD_TRAITS), '#0f766e'], ['주장', '다유전자 + 환경', '#5b21b6'], ['근거', bdName(p.ev, BD_EV), '#92400e'], ['출처', bdName(p.src, BD_SRC), '#1e40af']].forEach(([k, v, c]) => {
          D.label(x + 10, yy, k, { bg: c, color: '#fff', size: 11.5, align: 'left' });
          const hh = textBlock(x + 10, yy + 25, cw - 20, v, 14, '#26324a', 19, 800); yy += hh + 31;
        });
      }
      ctx.restore();
    }
    // 결론
    const cy = PHONE ? y0 + 3 * (ch + gap) + 14 : y0 + ch + 28, cwid = VW - (PHONE ? 16 : 28), cx0 = (VW - cwid) / 2, chh = VH - cy - (PHONE ? 8 : 12);
    if (n === 3) {
      [0, 1, 2].forEach((i) => { const c = cardXY(i); const ax = PHONE ? c.x + cw - 18 : c.x + cw / 2, ay = PHONE ? c.y + ch - 4 : c.y + ch + 3; if (!PHONE) D.arrow(ax, ay, VW / 2 + (i - 1) * 70, cy - 3, { color: '#16a34a', width: 3 }); });
    }
    D.shadow(() => { D.roundRect(cx0, cy, cwid, chh, 14); ctx.fillStyle = n === 3 ? '#ecfdf5' : '#fff'; ctx.fill(); }, { blur: 8, y: 3 });
    ctx.strokeStyle = n === 3 ? '#16a34a' : '#cbd5e1'; ctx.lineWidth = n === 3 ? 3 : 2; D.roundRect(cx0, cy, cwid, chh, 14); ctx.stroke();
    if (n < 3) { TF(VW / 2, cy + chh / 2 + 4, '서로 다른 형질 3개를 모으면 결론이 완성돼요 (' + n + ' / 3)', cwid - 24, L(17, 14), 11, '#94a3b8', 'center', 800); }
    else {
      TF(VW / 2, cy + 30, '결론: 사람의 유전은 대부분 다유전자 유전이에요', cwid - 24, L(19, 15.5), 11, '#166534', 'center', 800);
      [['연속적인 분포', '여러 쌍의 유전자가 함께 작용해요'], ['같은 유전자형도 환경에 따라', '표현형이 달라져요'], ['유전자 하나의 검사 결과만으로', '형질을 단정할 수 없어요']].forEach((q, k) => {
        TF(VW / 2, cy + 62 + k * (PHONE ? 26 : 28), '✔ ' + q[0] + ' → ' + q[1], cwid - 30, L(15, 13), 10.5, '#334155', 'center', 800);
      });
    }
  }


  /* =========================================================
     화면 전환 · 조작 연결
     ========================================================= */
  S.crQ = false;
  const PTS = { sort: sortPT, cases: casePT };
  function setMode(m) {
    if (S.mode !== m) S.fade = 1;
    S.mode = m; PT = PTS[m] || null; hideHint(); updateCtl();
  }
  const ctlNodes = $$('#ctrlCard .control');
  const OPT = (sel, arr) => { sel.innerHTML = ''; arr.forEach(([v, t]) => { const o = document.createElement('option'); o.value = v; o.textContent = t; sel.appendChild(o); }); };
  OPT($('#bdTr'), BD_TRAITS.map((q) => [q.id, q.t])); OPT($('#bdEv'), BD_EV.map((q) => [q.id, q.t])); OPT($('#bdSrc'), BD_SRC.map((q) => [q.id, q.t]));
  const nSet = (n) => { crossBuild(n); $('#sN').value = n; updateCtl(); };
  function updateCtl() {
    const fr = game ? game.free : false, lvNow = game ? game.level : 0;
    ctlNodes.forEach((n) => { n.hidden = (n.dataset.modes || '').split(' ').indexOf(S.mode) < 0; });
    modeButtons(S.mode, lvNow, fr);
    ['abo', 'alb', 'ht'].forEach((k) => { const b = $('#cmp' + k.charAt(0).toUpperCase() + k.slice(1)); b.classList.toggle('btn-good', cmpDone(k)); b.disabled = S.cmp.started[k] && !cmpDone(k); });
    $('#oN').textContent = S.cross.n + '쌍';
    $('#crFill').disabled = S.cross.n > 3 || crossBusy(); $('#crFill').textContent = S.cross.n > 3 ? '표는 n ≤ 3에서만' : '🧮 표 채우기 (' + Math.pow(4, S.cross.n) + '명)';
    $('#cr100').disabled = crossBusy(); $('#cr1000').disabled = crossBusy();
    $('#crTh').classList.toggle('on', S.cross.th);
    $('#crQ').hidden = !S.crQ;
    $('#oE').textContent = '±' + S.env.E + ' cm';
    $$('#envSel button').forEach((b) => b.classList.toggle('on', !!S.env.on[+b.dataset.g]));
  }
  bindModes(setMode);
  $('#cmpAbo').addEventListener('click', () => cmpRun('abo')); $('#cmpAlb').addEventListener('click', () => cmpRun('alb')); $('#cmpHt').addEventListener('click', () => cmpRun('ht'));
  $('#cmpReset').addEventListener('click', () => { Sound.click(); cmpReset(); });
  $('#sortReset').addEventListener('click', () => { Sound.click(); sorter8.reset(); });
  $('#caseReset').addEventListener('click', () => { Sound.click(); caseSorter.reset(); S.cases.seen = {}; S.cases.last = null; updateCtl(); });
  SciSim.bindRange($('#sN'), $('#oN'), (v) => v + '쌍', (v) => { nSet(v); });
  $('#crFill').addEventListener('click', crossFill); $('#cr100').addEventListener('click', () => crossRandom(100)); $('#cr1000').addEventListener('click', () => crossRandom(1000));
  $('#crTh').addEventListener('click', () => { Sound.click(); S.cross.th = !S.cross.th; updateCtl(); });
  $('#crReset').addEventListener('click', () => { Sound.click(); crossReset(); });
  const crOk = () => { const p = parseFrac($('#xP3').value), k = numOf('xK10'); return { p: isFinite(p) && Math.abs(p - 1 / 64) < 0.0006, k: k === 21 }; };
  ['xP3', 'xK10'].forEach((id) => $('#' + id).addEventListener('input', () => { const o = crOk(); $('#xP3').classList.toggle('ok', o.p); $('#xK10').classList.toggle('ok', o.k); if (o.p && o.k) S.cross.solved = true; updateCtl(); }));
  SciSim.bindRange($('#sE'), $('#oE'), (v) => '±' + v + ' cm', (v) => { S.env.E = v; S.env.maxE = Math.max(S.env.maxE, v); updateCtl(); });
  $$('#envSel button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.env.on[+b.dataset.g] = !S.env.on[+b.dataset.g]; updateCtl(); }));
  ['bdTr', 'bdEv', 'bdSrc'].forEach((id, i) => $('#' + id).addEventListener('change', (e) => { S.board.sel[['tr', 'ev', 'src'][i]] = e.target.value; }));
  $('#bdPost').addEventListener('click', bdPost);
  $('#bdClear').addEventListener('click', () => { Sound.click(); S.board.posts = []; hideHint(); updateCtl(); });

  /* =========================================================
     미션
     ========================================================= */
  const levels = [
    {
      title: '단일 인자와 다유전자', short: '단일 인자', icon: '📊', phase: '관찰',
      intro: '<p class="si-q">❓ 탐구 질문: 형질이 어떤 건 \'있다/없다\'로 나뉘는데, 키는 왜 모든 값이 연속으로 이어질까?</p><p>🔗 <b>중학교</b>에서 한 쌍의 대립유전자로 정해지는 형질(멘델의 법칙, ABO식 혈액형)을 배웠고, 이 단원 앞 차시에서 알비니즘 같은 <b>단일 인자 유전</b>을 다뤘어요. 이제 <b>키</b>처럼 연속적으로 나타나는 형질을 살펴봐요.</p><p>💡 이 차시는 사람의 다유전자 유전 <b>개별 사례</b>보다, <b>사람의 유전 대부분이 다유전자 유전으로 이루어진다</b>는 의미에 초점을 둬요. 자료는 모두 교육용 가상 자료예요.</p>',
      features: ['compare', 'sort'],
      setup() { setMode('compare'); },
      recap: '단일 인자 유전은 한 쌍의 대립유전자로 정해져 표현형이 뚜렷이 구분되고(불연속 변이), 다유전자 유전은 여러 쌍의 유전자와 환경이 함께 작용해 표현형이 연속적인 종 모양 분포를 보여요.',
      summary: '<ul><li><b>단일 인자 유전</b>: 한 쌍의 대립유전자가 형질을 결정해 표현형이 <b>뚜렷이 구분되는 몇 가지</b>로 나타나요(불연속 변이). 예) ABO식 혈액형, 알비니즘.</li><li><b>다유전자 유전</b>: 여러 쌍의 유전자와 환경이 함께 형질에 관여해 표현형이 <b>연속적</b>이에요. 분포가 가운데가 높은 종 모양(정규 분포)을 이뤄요. 예) 키, 피부색.</li><li>표현형이 뚜렷이 구분되지 않고 연속적으로 나타나면 <b>다유전자 유전</b>(+ 환경)을 의심해요.</li></ul>',
      missions: [
        {
          id: 'compare', title: '분포 모양 비교',
          goal: '<b>혈액형 · 알비니즘 · 키</b> 세 가지 조사를 모두 해서 막대 분포의 모양을 비교해 보세요.',
          hint: '위쪽 \'세 가지 조사\' 버튼을 차례로 눌러요. 점들이 떨어져 막대가 쌓여요. 키 분포는 어떤 모양일까요?',
          setup() { cmpReset(); setMode('compare'); },
          check: () => cmpN() === 3, hold: 0.6,
          status: () => mark(cmpDone('abo')) + ' 혈액형 &nbsp; ' + mark(cmpDone('alb')) + ' 알비니즘 &nbsp; ' + mark(cmpDone('ht')) + ' 키',
          explain: '혈액형(A · B · AB · O 4가지)과 알비니즘(2가지)은 막대가 <b>따로따로 떨어져</b> 있어요(<b>불연속 변이</b>). 키는 막대가 <b>이어지며 가운데가 높은 종 모양</b>(정규 분포)이에요(<b>연속 변이</b>). 앞의 것은 한 쌍의 대립유전자, 뒤의 것은 여러 쌍의 유전자와 환경이 함께 만든 형질이에요.',
        },
        {
          id: 'sort', title: '형질 카드 분류', manual: true,
          goal: '형질 카드 8장을 <b>구분되는 몇 가지</b>와 <b>연속적</b> 상자로 나누세요.',
          hint: '표현형이 \'A형 · B형처럼 뚜렷이 나뉘면\' 구분되는 몇 가지, 키처럼 \'값이 이어지면\' 연속적이에요.',
          setup() { sorter8.reset(); setMode('sort'); },
          check() {
            if (sorter8.placed < 8) { sorter8.markBad([]); return '카드를 모두 상자에 넣어 주세요. (' + sorter8.placed + ' / 8)'; }
            const w = sortWrong();
            if (!w.length) { sorter8.markBad([]); return true; }
            sorter8.markBad(w.map((c) => c.id));
            return '\'' + w[0].label + '\' 카드를 다시 생각해 보세요. 이 형질의 표현형이 뚜렷이 구분되는지, 값이 이어지는지 따져 봐요.';
          },
          explain: '<b>ABO식 혈액형 · 알비니즘 · 완두 씨 모양 · 적록 색맹</b>은 표현형이 뚜렷이 구분되어 단일 인자로 설명돼요. <b>키 · 피부색 · 체질량 지수 · 혈압</b>은 값이 연속적으로 이어지고 환경의 영향이 커서 여러 유전자와 환경이 함께 작용하는 다유전자 형질이에요.',
        },
        {
          type: 'quiz', title: '연속적인 표현형이라면',
          goal: '표현형이 뚜렷이 구분되지 않고 <b>연속적으로</b> 나타나는 형질에서 가장 먼저 의심해 볼 유전 방식은?',
          setup() { setMode('compare'); },
          choices: ['한 쌍의 대립유전자가 관여하는 단일 인자 유전', '여러 쌍의 유전자와 환경이 함께 관여하는 다유전자 유전', 'X 염색체에 있는 유전자가 관여하는 X 연관 유전', '염색체의 수가 달라지는 염색체 이상'],
          answer: 1,
          feedback: ['단일 인자 유전은 표현형이 A형 · B형처럼 뚜렷이 구분돼요.', '', 'X 연관 유전도 표현형은 정상 · 색맹처럼 구분되어 나타나요.', '염색체 이상은 형질의 값이 연속적으로 이어지는 이유가 아니에요.'],
          explain: '표현형이 <b>연속적인 종 모양 분포</b>를 보이면 <b>여러 쌍의 유전자와 환경</b>이 함께 작용하는 다유전자 유전을 의심해요. 키 · 피부색 · 혈압 등 사람의 많은 형질이 여기에 속해요.',
        },
      ],
    },
    {
      title: '다유전자 모형', short: '다유전자', icon: '🔔', phase: '모형',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 키의 분포는 가운데가 높은 종 모양이었어요.</div><p>이제 <b>모형</b>으로 확인해요. 서로 다른 염색체에 있는 <b>n쌍의 유전자</b>(A/a, B/b, C/c …)가 있고, <b>대문자 대립유전자 1개당 +2 cm</b>(기본 160 cm)라고 가정해요. 부모는 모두 AaBbCc… 이에요.</p><p>💡 n이 1 → 2 → 3으로 늘 때 분포가 어떻게 변하는지, n이 매우 클 때는 어떤 모양이 되는지 봐요.</p>',
      features: ['cross'],
      setup() { nSet(3); setMode('cross'); },
      recap: 'n쌍의 유전자에서 표현형은 2n + 1가지이고, n = 3이면 1 : 6 : 15 : 20 : 15 : 6 : 1이에요. n이 커질수록 막대가 늘어 연속적인 종 모양이 되고, 극단형은 (1/4)ⁿ으로 매우 드물어요.',
      summary: '<ul><li>가상 모형: 서로 다른 염색체의 n쌍의 유전자, 대문자 대립유전자 1개당 +2 cm, 기본 160 cm. 부모 AaBbCc… × AaBbCc…</li><li><b>n = 1</b>: 대문자 수 0 · 1 · 2 = 1 : 2 : 1 (3가지). <b>n = 2</b>: 1 : 4 : 6 : 4 : 1 (합 16, 5가지). <b>n = 3</b>: <b>1 : 6 : 15 : 20 : 15 : 6 : 1</b> (합 64, 7가지, 키 160 ~ 172 cm).</li><li>표현형은 <b>2n + 1가지</b>, 극단형(160 cm 또는 가장 큰 키)의 확률은 각각 <b>(1/4)ⁿ</b> (n = 3이면 1/64, n = 10이면 약 100만분의 1). 중간형(n = 3일 때 166 cm)이 20/64 ≈ 31 %로 가장 많아요.</li><li>n이 커질수록 막대가 많아져 연속적인 종 모양 분포에 가까워져요. 실제 사람의 키에는 수천 개의 유전 변이가 관여하고 개별 효과는 아주 작아요.</li></ul>',
      missions: [
        {
          id: 'cross', title: 'n = 3에서 1000명 만들기',
          goal: '유전자 쌍 수를 <b>n = 3</b>으로 두고 자손을 <b>1000명 이상</b> 만들어 분포가 이론값에 가까워지는 것을 확인하세요.',
          hint: '\'표 채우기\'로 64명을 먼저 만들고 \'+1000명\'을 눌러요. 이론값(점선)과 막대를 비교해 보세요. 가운데 막대(166 cm)가 가장 높아야 해요.',
          setup() { S.crQ = false; S.cross.th = false; S.cross.solved = false; nSet(3); setMode('cross'); },
          check: () => S.cross.n === 3 && crossTotal() >= 1000 && !crossBusy(), hold: 0.8,
          status: () => mark(S.cross.n === 3) + ' n = ' + S.cross.n + ' &nbsp; ' + mark(S.cross.n === 3 && crossTotal() >= 1000) + ' 자손 ' + (S.cross.n === 3 ? fmtN(crossTotal()) : 0) + ' / 1000명',
          explain: 'n = 3에서 자손의 대문자 수는 <b>1 : 6 : 15 : 20 : 15 : 6 : 1</b>(합 64)의 비로 나타나요. 자손을 1000명으로 늘리면 막대가 이 이론값에 가까워지는 것을 볼 수 있어요. 가운데(166 cm)가 20/64 ≈ 31 %로 가장 많아요.',
        },
        {
          id: 'prob', title: '극단형 확률과 표현형 가짓수', manual: true,
          goal: 'n = 3에서 키가 <b>160 cm</b>(대문자 0개)가 될 확률과, n = 10일 때 <b>표현형의 가짓수</b>를 구해 입력하세요.',
          hint: '부모 AaBbCc에서 각 쌍이 aa가 될 확률은 1/4이에요. 3쌍이 모두 aa이면 (1/4)×(1/4)×(1/4)예요. 표현형은 대문자 수가 0 ~ 2n이므로 2n + 1가지예요.',
          setup() { S.crQ = true; $('#xP3').value = ''; $('#xK10').value = ''; $('#xP3').classList.remove('ok'); $('#xK10').classList.remove('ok'); S.cross.solved = false; setMode('cross'); updateCtl(); },
          check() {
            const o = crOk(), rawP = String($('#xP3').value).trim(), rawK = String($('#xK10').value).trim();
            if (!rawP || !rawK) return '두 칸을 모두 입력해 주세요.';
            if (!o.p) return 'n = 3일 때 키가 160 cm이려면 세 쌍이 모두 aa여야 해요. 각 쌍이 aa일 확률 1/4을 세 번 곱해 보세요.';
            if (!o.k) return '표현형은 대문자 대립유전자가 0개부터 2n개까지예요. n = 10이면 몇 가지일까요?';
            S.cross.solved = true; return true;
          },
          explain: 'Aa × Aa에서 aa일 확률은 1/4이므로 3쌍이 모두 aa일 확률은 (1/4)³ = <b>1/64</b>이에요. 키가 172 cm(AABBCC)일 확률도 1/64예요. 표현형은 대문자 수가 0 ~ 2n이므로 <b>2n + 1 = 21가지</b>(n = 10)이고, n = 10이면 극단형은 (1/4)¹⁰ ≈ <b>100만분의 1</b>로 매우 드물어요. 막대가 21개로 늘면 거의 매끈한 곡선처럼 보여요.',
        },
        {
          type: 'quiz', title: '중간형이 가장 많은 까닭',
          goal: 'n = 3에서 가운데 키(166 cm)가 가장 많이 나타나는 까닭은?',
          setup() { setMode('cross'); },
          choices: ['중간 키 유전자만 우성이라서', '대문자 대립유전자가 3개가 되는 유전자형 조합의 수가 가장 많아서', '환경이 중간 키에만 유리해서', '극단형 유전자는 자손에게 전달되지 않아서'],
          answer: 1,
          feedback: ['이 모형에서 모든 유전자는 대문자 하나당 +2 cm로 똑같이 더해져요. 우열은 상관없어요.', '', '이 모형에는 환경이 들어 있지 않아요. 순전히 유전자 조합의 수 때문이에요.', '극단형도 전달돼요. 다만 그 조합이 되는 경우가 1/64로 드물 뿐이에요.'],
          explain: '대문자가 3개가 되는 조합(20가지)이 0개(1가지)나 6개(1가지)가 되는 조합보다 훨씬 많기 때문이에요. 쌍 수 n이 커질수록 극단형 <b>(1/4)ⁿ</b>은 더 드물어지고 가운데는 더 두드러져 <b>종 모양</b>이 돼요.',
        },
      ],
    },
    {
      title: '환경과 유전', short: '환경과 유전', icon: '🌦', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 유전자형으로 정해지는 키는 7가지(n = 3)로 나뉘었어요. 실제로는 어떨까요?</div><p>같은 유전자형 <b>AaBbCc</b> 100명에게도 영양 · 질병 같은 <b>환경</b>이 서로 달라서 키가 조금씩 달라져요. 환경 변이를 슬라이더로 조절해 분포가 어떻게 달라지는지 봐요.</p><p>💡 아래 쌍둥이 그림은 앞 차시에서 본 <b>1란성 쌍둥이</b>(유전자형이 같음)의 키 차이를 보여 줘요.</p>',
      features: ['env'],
      setup() { setMode('env'); },
      recap: '같은 유전자형도 환경에 따라 표현형이 퍼지고, 유전자형이 다른 집단의 표현형도 겹쳐요. 그래서 키(표현형)만으로 유전자형을 알 수 없고, 1란성 쌍둥이도 환경이 다르면 키가 달라요.',
      summary: '<ul><li><b>표현형 = 유전자형 + 환경</b>. 같은 유전자형(AaBbCc)도 영양 · 질병 등 환경에 따라 키가 퍼져요(막대 사이가 메워지고 곡선이 매끈해져요).</li><li>유전자형이 다른 집단(AaBbCc 166 cm와 AABbCc 168 cm)의 분포는 환경 변이가 클수록 많이 <b>겹쳐요</b>. 그래서 키만으로 유전자형을 알 수 없어요.</li><li>대문자가 같은 수이면 유전자형이 달라도(AaBbCc, AABbcc) 같은 키가 돼요.</li><li>1란성 쌍둥이는 유전자형이 같지만 환경이 다르면 키 차이가 생겨요.</li></ul>',
      missions: [
        {
          id: 'env', title: '두 유전자형의 분포 겹치기',
          goal: '환경 변이를 조절해 <b>AaBbCc(166 cm)</b>와 <b>AABbCc(168 cm)</b> 두 집단의 분포가 <b>50 % 이상</b> 겹치게 만드세요.',
          hint: '환경 변이 슬라이더를 오른쪽으로 올려요. 파란 막대와 주황 막대가 섞일수록 \'두 집단의 겹침\' 숫자가 커져요. 켜져 있는 두 유전자형은 AaBbCc와 AABbCc예요.',
          setup() { S.env.on = [true, true, false]; S.env.E = 0; S.env.dispE = 0; S.env.maxE = 0; $('#sE').value = 0; setMode('env'); $('#sE').dispatchEvent(new Event('input')); },
          check: () => S.env.on[1] && envOverlap(S.env.E) >= 0.5, hold: 0.8,
          status: () => mark(S.env.on[1]) + ' AABbCc 함께 보기 &nbsp; ' + mark(envOverlap(S.env.E) >= 0.5) + ' 겹침 ' + fmtN(envOverlap(S.env.E) * 100, 0) + ' % (목표 50 %)',
          explain: '환경 변이가 커질수록 같은 유전자형 안에서도 키가 퍼지고, 유전자형이 다른 두 집단의 분포가 <b>서로 겹쳐요</b>. 같은 키라도 유전자형이 다를 수 있고, 같은 유전자형도 환경에 따라 키가 달라요. 1란성 쌍둥이의 키 차이도 환경 때문이에요.',
        },
        {
          type: 'quiz', title: '키가 같으면 유전자형도 같을까',
          goal: '키가 똑같은 두 사람의 유전자형은 같을까요?',
          setup() { setMode('env'); S.env.on[2] = true; updateCtl(); },
          choices: ['네. 키가 같으면 유전자형도 같다', '아니요. 대문자 수가 같으면 유전자형이 달라도(AaBbCc, AABbcc) 키가 같을 수 있고, 같은 유전자형도 환경에 따라 키가 달라진다', '네. 하지만 환경이 같을 때만 그렇다', '아니요. 키는 유전자와 관계가 없다'],
          answer: 1,
          feedback: ['AaBbCc와 AABbcc는 대문자가 3개로 같아 키가 같지만 유전자형은 달라요.', '', '환경이 같아도 대문자 수만 같으면 유전자형이 달라도 같은 키가 될 수 있어요.', '키는 유전자와 환경이 함께 정해요. 유전의 영향이 커요.'],
          explain: '표현형 = 유전자형 + 환경이므로 <b>키(표현형)만으로 유전자형을 단정할 수 없어요</b>. AaBbCc와 AABbcc는 유전자형이 달라도 대문자가 3개로 같아 키가 같고, 같은 유전자형(1란성 쌍둥이)도 환경에 따라 키가 달라져요.',
        },
      ],
    },
    {
      title: '사례 소통', short: '사례 소통', icon: '🧑‍🤝‍🧑', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 표현형이 연속적인 형질은 다유전자 + 환경이 만든다는 것을 확인했어요.</div><p>이제 사람의 형질 <b>사례 6가지</b>를 조사하고 과학적 <b>근거</b>로 분류해요. 그리고 가상 <b>모둠 보드</b>에서 모둠원 3명이 서로 다른 형질의 \'주장 – 근거 – 출처\' 카드를 올려 결론을 모아요.</p><p>💡 좋은 소통은 <b>믿을 만한 근거와 출처</b>로 이루어져요. 개인 사례나 근거 없는 주장은 올라가지 않아요.</p>',
      features: ['cases', 'board'],
      setup() { setMode('cases'); },
      recap: '사람의 형질 대부분은 여러 유전자와 환경이 함께 만드는 다유전자 유전이에요. 유전자 하나의 검사 결과만으로 형질을 단정할 수 없고, 주장에는 믿을 만한 근거와 출처가 필요해요.',
      summary: '<ul><li><b>단일 인자</b>: ABO식 혈액형, 알비니즘 → 표현형이 뚜렷이 구분돼요, 환경 영향이 거의 없어요.</li><li><b>다유전자 + 환경</b>: 키, 피부색, 체질량 지수, 혈압 → 분포가 연속적이고(종 모양) 환경 요인(영양 · 햇빛 · 식습관 · 생활 습관)의 영향이 커요.</li><li>사람의 유전은 <b>대부분 다유전자 유전</b>이에요. 그래서 \'키 유전자\' 하나의 검사 결과만으로 형질을 단정할 수 없어요.</li><li>과학적 의사소통: <b>주장 – 근거 – 출처</b>. 근거는 분포 · 쌍둥이 자료 · 환경 요인처럼 검증 가능한 자료이고, 출처는 교과서 · 학술 논문 · 공공기관 통계처럼 믿을 만한 곳이어야 해요.</li></ul>',
      missions: [
        {
          id: 'cases', title: '사례 분류와 근거', manual: true,
          goal: '사례 카드 6장을 <b>모두 눌러 근거를 확인</b>하고, <b>단일 인자</b>와 <b>다유전자 + 환경</b> 상자로 나누세요.',
          hint: '카드를 눌러 \'분포 · 환경 · 유전자\' 근거를 읽어요. 분포가 뚜렷이 구분되고 환경 영향이 거의 없으면 단일 인자예요.',
          setup() { caseSorter.reset(); S.cases.seen = {}; S.cases.last = null; setMode('cases'); },
          check() {
            const seen = Object.keys(S.cases.seen).length;
            if (caseSorter.placed < 6) { caseSorter.markBad([]); return '카드를 모두 상자에 넣어 주세요. (' + caseSorter.placed + ' / 6)'; }
            const w = caseWrong();
            if (w.length) { caseSorter.markBad(w.map((c) => c.id)); return '\'' + w[0].label + '\' 카드의 근거(분포 모양 · 환경 요인)를 다시 읽어 보세요.'; }
            caseSorter.markBad([]);
            if (seen < 6) return '분류는 맞아요! 근거를 아직 확인하지 않은 카드가 ' + (6 - seen) + '장 있어요. 카드를 눌러 근거를 읽어 보세요.';
            return true;
          },
          explain: '<b>ABO식 혈액형 · 알비니즘</b>은 표현형이 뚜렷이 구분되고 환경의 영향이 거의 없는 <b>단일 인자</b> 형질이에요. <b>키 · 피부색 · 체질량 지수 · 혈압</b>은 분포가 연속적이고 영양 · 햇빛 · 식습관 · 생활 습관 같은 환경의 영향이 커서 <b>다유전자 + 환경</b> 형질이에요.',
        },
        {
          id: 'board', title: '모둠 보드 만들기', manual: true,
          goal: '모둠원 3명이 <b>서로 다른 형질</b>의 \'주장 – 근거 – 출처\' 카드를 올려 결론을 완성하세요.',
          hint: '형질은 키 · 피부색 · 체질량 지수 · 혈압 중에서 고르고, 근거는 \'분포가 연속적\' 또는 \'환경에 따라 달라짐\', 출처는 교과서 · 학술 논문 · 공공기관 통계를 골라요.',
          setup() { S.board.posts = []; hideHint(); setMode('board'); },
          check() { const n = S.board.posts.length; return n >= 3 ? true : '카드를 올려 모둠원 세 명의 카드를 채워 주세요. (' + n + ' / 3)'; },
          explain: '키 · 피부색 · 체질량 지수 · 혈압처럼 <b>서로 다른 형질</b>이 모두 <b>다유전자 + 환경</b>으로 설명되는 것을 모으면 \'<b>사람의 유전은 대부분 다유전자 유전</b>\'이라는 결론을 뒷받침해요. 한 유전자의 검사 결과나 몇 사람의 경험, 출처가 불분명한 글은 근거로 쓸 수 없어요.',
        },
        {
          type: 'quiz', title: '근거 없는 \'키 유전자\' 글',
          goal: '어떤 글이 \'키 유전자 하나를 검사하면 아이의 키가 정해진다\'고 주장해요. 이 글의 가장 큰 문제는?',
          setup() { setMode('board'); },
          choices: ['키는 여러 유전자와 환경이 함께 정하므로 유전자 하나의 검사만으로 단정할 수 없다', '키는 유전과 전혀 관계가 없다', '키는 환경만으로 정해진다', '유전자 검사는 어떤 형질에도 쓸 수 없다'],
          answer: 0,
          feedback: ['', '키의 변이 중 약 80 %는 유전의 영향이에요 (예시 값). 유전과 관계가 있어요.', '환경만으로 정해지지 않아요. 유전자와 환경이 함께 작용해요.', '단일 유전자 형질(예: 알비니즘)은 유전자 검사로 확인할 수 있어요. 다만 다유전자 형질은 하나로 단정할 수 없어요.'],
          explain: '사람의 형질 대부분은 <b>다유전자 유전</b>이에요. 키에는 수천 개의 유전 변이가 조금씩 관여하고 환경(영양 등)도 영향을 주므로, <b>유전자 하나의 검사 결과만으로 키를 단정할 수 없어요</b>. 근거와 출처를 확인하는 태도가 과학적 의사소통의 기본이에요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hg-polygenic', mount: '#game', badge: '다유전자 탐구가', homeHref: '../../index.html#hg',
    featureLabels: { compare: '📊 분포 비교', sort: '🗂 형질 카드', cross: '🔔 다유전자 교배', env: '🌦 환경과 유전', cases: '🔎 사례 분류', board: '🧑‍🤝‍🧑 모둠 보드' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 읽음 칸 ---------- */
  function readouts() {
    const m = S.mode;
    if (m === 'compare') setReads(['한 조사', cmpN() + ' / 3', '단일 인자 막대', '떨어져 있어요', '키 막대', cmpDone('ht') ? '이어져 있어요' : '—']);
    else if (m === 'sort') { const a = sorter8.cards.filter((c) => c.zone === 'disc').length, b = sorter8.cards.filter((c) => c.zone === 'cont').length; setReads(['분류한 카드', sorter8.placed + ' / 8', '구분되는 몇 가지', a + '장', '연속적', b + '장']); }
    else if (m === 'cross') { const x = S.cross, n = x.n, tot = crossTotal(), c0 = x.hist.cnt[0]; setReads(['자손 수', fmtN(tot) + '명', '표현형 가짓수', (2 * n + 1) + '가지 (' + cmOf(0) + ' ~ ' + cmOf(2 * n) + ' cm)', '극단형(' + cmOf(0) + ' cm) 관찰', tot ? c0 + '명 (' + fmtN(c0 / tot * 100, 2) + ' %)' : '—']); }
    else if (m === 'env') { const ov = envOverlap(S.env.E); setReads(['환경 변이', '±' + S.env.E + ' cm', '두 집단의 겹침', fmtN(ov * 100, 0) + ' %', '쌍둥이 최대 키 차이', envTwDiff() + ' cm']); }
    else if (m === 'cases') setReads(['분류한 카드', caseSorter.placed + ' / 6', '근거 확인', Object.keys(S.cases.seen).length + ' / 6', '단일 인자 · 다유전자', caseSorter.cards.filter((c) => c.zone === 'single').length + ' · ' + caseSorter.cards.filter((c) => c.zone === 'poly').length]);
    else setReads(['올린 카드', S.board.posts.length + ' / 3', '고른 형질', S.board.posts.map((p) => bdName(p.tr, BD_TRAITS)).join(' · ') || '—', '결론', S.board.posts.length === 3 ? '완성' : '모으는 중']);
  }

  /* ---------- 시작 ---------- */
  setMode('compare');
  let lastFree = false, lastLv = -1, lastBusy = '';
  SciSim.loop((dt, t) => {
    clock = t; S.t = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (game && game.level !== lastLv) { lastLv = game.level; updateCtl(); }
    const busy = (crossBusy() ? 1 : 0) + '|' + cmpN() + (S.cmp.abo.pending() + S.cmp.alb.pending() + S.cmp.ht.pending());
    if (busy !== lastBusy) { lastBusy = busy; updateCtl(); }
    view.apply(); ctx.clearRect(0, 0, VW, VH);
    bgFill('#eef4f2', '#e3ece8');
    if (S.mode !== 'compare') ['abo', 'alb', 'ht'].forEach((k) => S.cmp[k].update(dt));
    if (S.mode !== 'cross') crossUpdate(dt);
    switch (S.mode) {
      case 'compare': compareDraw(dt, t); break;
      case 'sort': sortDraw(dt, t); break;
      case 'cross': crossDraw(dt, t); break;
      case 'env': envDraw(dt, t); break;
      case 'cases': casesDraw(dt, t); break;
      case 'board': boardDraw(dt, t); break;
    }
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(241,246,243,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, PHONE, get game() { return game; }, levels, setMode, updateCtl, cmpRun, cmpN, cmpDone, sorter8, TRAIT8, sortWrong, crossFill, crossRandom, crossTotal, crossBusy, crossBuild, nSet,
    ENV, envOverlap, envCounts, envTwDiff, caseSorter, CASE6, caseWrong, bdPost, BD_TRAITS, BD_EV, BD_SRC, crOk, popc, binom,
  };
})();
