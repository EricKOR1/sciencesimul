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
    flatCard(-w / 2, -h / 2, w, h, r, c.bad ? '#fdeceb' : (c.sel ? '#fff8dc' : (c.fill || '#fff')), c.lift);
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


  /* ---------- 숫자 읽기: '170000', '17만', '1.7e5', '1.7×10^5', '1.7×10⁵', '약 17만 배' ---------- */
  const SUPD = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '⁻': '-' };
  function parseBig(s) {
    s = String(s == null ? '' : s).trim().replace(/[,\s]/g, '').replace(/^약/, '').replace(/(배|번|개|달러|%|％|퍼센트)$/, '');
    if (!s) return NaN;
    s = s.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻]+/g, (m) => '^' + m.split('').map((c) => SUPD[c]).join(''));
    let m = /^(\d*\.?\d+)(?:[x×*]10\^?\(?(-?\d+)\)?|e(-?\d+))$/i.exec(s);
    if (m) return +m[1] * Math.pow(10, +(m[2] != null ? m[2] : m[3]));
    m = /^(\d*\.?\d+)(만|억)?$/.exec(s);
    if (m) return +m[1] * (m[2] === '만' ? 1e4 : m[2] === '억' ? 1e8 : 1);
    return NaN;
  }
  /* ---------- 순서 고르기: 눌러서 차례로 쌓아요 ---------- */
  function seqPicker(poolEl, seqEl, items, onChange) {
    const P = { items, order: [], onChange };
    P.render = () => {
      poolEl.innerHTML = ''; seqEl.innerHTML = '';
      P.pool.forEach((it) => {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'pk-item'; b.textContent = it.label; b.disabled = P.order.indexOf(it.id) >= 0;
        b.addEventListener('click', () => { Sound.click(); P.order.push(it.id); P.render(); P.onChange && P.onChange(); });
        poolEl.appendChild(b);
      });
      if (!P.order.length) { const e = document.createElement('span'); e.className = 'ctrl-note'; e.style.margin = '6px'; e.textContent = '위의 카드를 순서대로 눌러 쌓아요.'; seqEl.appendChild(e); }
      P.order.forEach((id, k) => {
        const it = items.find((q) => q.id === id);
        const b = document.createElement('button'); b.type = 'button'; b.className = 'pk-chip'; b.innerHTML = '<b>' + (k + 1) + '</b>' + it.label;
        b.addEventListener('click', () => { Sound.click(); P.order.splice(k, 1); P.render(); P.onChange && P.onChange(); });
        seqEl.appendChild(b);
      });
    };
    P.setPool = (arr) => { P.pool = arr; };
    P.pool = items.slice();
    P.reset = () => { P.order = []; P.render(); P.onChange && P.onChange(); };
    P.ok = (ids) => P.order.length === ids.length && ids.every((id, k) => P.order[k] === id);
    P.render();
    return P;
  }
  /* 선택 상자 채우기 */
  function fillSel(sel, arr, first) {
    sel.innerHTML = '';
    if (first) { const o = document.createElement('option'); o.value = ''; o.textContent = first; sel.appendChild(o); }
    arr.forEach(([v, t]) => { const o = document.createElement('option'); o.value = v; o.textContent = t; sel.appendChild(o); });
  }
  /* 글자 크기를 맞춘 여러 줄 말풍선 */
  function bubble(x, y, w, str, o) {
    o = o || {};
    const size = o.size || 13, lh = o.lh || size + 3;
    const ls = wrap(str, w - 18, size, 700), h = ls.length * lh + 14;
    D.shadow(() => { D.roundRect(x, y, w, h, 12); ctx.fillStyle = o.fill || '#fff'; ctx.fill(); }, { blur: 6, y: 2 });
    ctx.strokeStyle = o.line || '#cbd5e1'; ctx.lineWidth = 1.6; D.roundRect(x, y, w, h, 12); ctx.stroke();
    ls.forEach((l, i) => T(x + 9, y + 9 + size + i * lh - 2, l, size, o.color || '#26324a', 'left', 700));
    return h;
  }
  /* 그림자 번짐 없이 가볍게 그리는 상자 (카드가 많을 때) */
  function flatCard(x, y, w, h, r, fill, lift) {
    if (lift > 0.05) { D.shadow(() => { D.roundRect(x, y, w, h, r); ctx.fillStyle = fill; ctx.fill(); }, { blur: 5 + lift * 10, y: 2 + lift * 4 }); return; }
    D.roundRect(x, y + 2.5, w, h, r); ctx.fillStyle = 'rgba(30,50,90,.13)'; ctx.fill();
    D.roundRect(x, y, w, h, r); ctx.fillStyle = fill; ctx.fill();
  }


  /* =========================================================
     고등학교 생물의 유전 · Ⅲ. 생명공학기술 - 생명공학의 발달사 (단원 61, 1차시)
     성취기준 [12유전03-01] 생명공학기술 발달 과정에서의 주요 사건을 조사하고 다양한 매체를 활용하여 발표할 수 있다.
     ① 관찰: 연표  ② 탐구: 핵심 기술  ③ 분석: 생활 속 성과  ④ 소통: 발표
     (연도는 대략적인 값이고, 유전체 해독 비용은 교육용 근사 예시예요)
     ========================================================= */
  const S = { mode: 'tl', fade: 0, t: 0 };
  let game = null;
  const rnd = mulberry(20240611);
  const ease = SciSim.ease;
  const INK = '#26324a';
  const ERA = [
    { n: '전통 생명공학', sub: '발효·육종 (1960년대까지)', col: '#b45309' },
    { n: '유전자 재조합 시대', sub: '1970년대~', col: '#2563eb' },
    { n: '유전체·세포·편집 시대', sub: '2000년대~', col: '#7c3aed' },
  ];
  /* 연표 카드 15장 (시간순). year는 카드에 쓰는 글, life가 true인 사건은 생활 사례와 바로 이어져요 */
  const EV = [
    { id: 'ferm', short: '발효·육종', year: '수천 년 전~', label: '발효와 선발 육종', icon: '🍞', era: 0, life: true, tech: '미생물의 발효 작용 이용, 좋은 형질을 고르는 교배', lifeTxt: '빵 · 술 · 장 · 치즈 · 김치', todo: '품질을 일정하게 유지하기' },
    { id: 'peni', short: '페니실린', year: '1928', label: '페니실린 발견', icon: '💊', era: 0, life: true, tech: '곰팡이가 만든 항생 물질, 이후 미생물 발효로 대량 생산', lifeTxt: '세균 감염병 치료', todo: '항생제 내성 세균이 늘어나는 문제' },
    { id: 'dna', short: 'DNA 구조', year: '1953', label: 'DNA 이중 나선', icon: '🧬', era: 0, life: false, tech: 'DNA 구조 규명 (유전 정보가 저장되는 방식 이해)', lifeTxt: '유전자 연구의 바탕', todo: '구조에서 기능으로, 유전자가 하는 일 밝히기' },
    { id: 'rdna', short: '재조합 DNA', year: '1973', label: '재조합 DNA', icon: '🔗', era: 1, life: false, tech: '제한 효소로 자르고 연결 효소로 이어 플라스미드에 넣어 대장균에 도입', lifeTxt: '유전자 의약품 생산의 길을 엶', todo: '안전한 사용 기준 마련' },
    { id: 'mab', short: '단일클론항체', year: '1975', label: '단일클론항체', icon: '🎯', era: 1, life: true, tech: '항체를 만드는 B 세포와 골수종 세포 융합', lifeTxt: '진단 키트 · 표적 치료', todo: '비용과 면역 반응' },
    { id: 'seq', short: '서열 분석', year: '1977', label: 'DNA 염기 서열 분석법', icon: '🔤', era: 1, life: false, tech: 'DNA의 염기 순서를 읽는 방법', lifeTxt: '유전 질환 · 병원체 분석의 바탕', todo: '읽은 정보를 해석하기' },
    { id: 'ins', short: '재조합 인슐린', year: '1982', label: '재조합 사람 인슐린 상용화', icon: '💉', era: 1, life: true, tech: '사람 인슐린 유전자를 넣은 대장균으로 생산', lifeTxt: '당뇨병 치료제 인슐린', todo: '비용과 접근성' },
    { id: 'pcr', short: 'PCR', year: '1983~85', label: 'PCR (DNA 증폭)', icon: '🔁', era: 1, life: true, tech: '적은 양의 DNA를 짧은 시간에 수없이 복제(증폭)', lifeTxt: 'DNA 지문(수사 · 친자 확인), 감염병 진단', todo: '오염 없이 정확하게 검사하기' },
    { id: 'gmt', short: 'GM 토마토', year: '1994', label: '최초의 상업용 GM 작물(토마토)', icon: '🍅', era: 1, life: true, tech: '재조합 DNA 기술을 식물에 응용', lifeTxt: '유전자 변형 작물 재배 · 이용', todo: '인체와 생태계에 미치는 영향 평가' },
    { id: 'dolly', short: '복제 양 돌리', year: '1996', label: '복제 양 돌리', icon: '🐑', era: 1, life: false, tech: '체세포 핵 이식으로 동물 복제', lifeTxt: '체세포로도 새 개체를 만들 수 있음을 보임', todo: '윤리 문제와 낮은 성공률' },
    { id: 'hesc', short: '배아줄기세포', year: '1998', label: '사람 배아줄기세포 확립', icon: '🌱', era: 1, life: false, tech: '초기 배아의 세포를 배양해 줄기세포주 확립', lifeTxt: '재생 의학 연구의 출발', todo: '배아를 이용하는 윤리 문제' },
    { id: 'hgp', short: '유전체 사업', year: '1990~2003', label: '인간 유전체 사업', icon: '🗺️', era: 2, life: true, tech: '사람 DNA 약 31억 염기쌍의 염기 서열 읽기', lifeTxt: '맞춤형 암 치료 · 유전 질환 연구', todo: '서열의 기능 해석, 개인정보 보호' },
    { id: 'ips', short: 'iPS 세포', year: '2006', label: '유도만능줄기세포 (iPS)', icon: '🔄', era: 2, life: false, tech: '체세포에 초기화 인자를 넣어 줄기세포로 되돌림', lifeTxt: '환자 맞춤 재생 의학 연구', todo: '종양 위험과 낮은 효율' },
    { id: 'crispr', short: 'CRISPR', year: '2012', label: 'CRISPR-Cas9 유전자 편집', icon: '✂️', era: 2, life: false, tech: '가이드 RNA와 Cas9으로 원하는 자리의 DNA를 자름 (2020 노벨 화학상)', lifeTxt: '유전 질환 치료 연구', todo: '오프타깃과 윤리 문제' },
    { id: 'mrna', short: 'mRNA 백신', year: '2020', label: 'mRNA 백신 상용화', icon: '🛡️', era: 2, life: true, tech: 'mRNA로 항원 단백질을 만들게 해 면역을 만듦', lifeTxt: '감염병 백신', todo: '보관 조건과 장기 효과 추적' },
  ];
  const EVI = {};
  EV.forEach((e, i) => { e.i = i; EVI[e.id] = i; });
  /* 앞 사건이 뒤 사건의 바탕이 된 연결 */
  const BASIS = [
    ['ferm', 'peni', '미생물을 키우는 지식이 있어서 페니실린을 발효로 대량 생산할 수 있었어요.'],
    ['dna', 'rdna', 'DNA 구조를 알았기에 DNA를 자르고 이어 붙이는 재조합 기술이 가능했어요.'],
    ['rdna', 'ins', '재조합 DNA 기술로 사람 인슐린 유전자를 대장균에 넣었어요.'],
    ['rdna', 'gmt', '재조합 DNA 기술을 식물에 응용했어요.'],
    ['seq', 'hgp', '염기 서열 분석법이 있어서 유전체 전체를 읽을 수 있었어요.'],
    ['hesc', 'ips', '줄기세포 연구가 쌓여 체세포를 되돌리는 연구로 이어졌어요.'],
    ['hgp', 'crispr', '유전체 서열 정보가 있어야 편집할 표적 서열을 찾을 수 있어요.'],
  ];
  const basisOf = (a, b) => BASIS.find((q) => q[0] === a && q[1] === b);
  const fmtRatio = (r) => (r >= 1e4 ? Number((r / 1e4).toPrecision(2)) + '만' : fmtN(Math.round(r)));

  /* ===================== ① 연표 정렬 ===================== */
  const PERM = [5, 9, 13, 0, 11, 3, 14, 6, 10, 1, 7, 12, 4, 2, 8];
  const TL = { cards: [], sel: null, drag: null, grow: 0, solved: false, changes: 0 };
  function tlGeom() {
    const cols = PHONE ? 3 : 5, cw = 148, ch = PHONE ? 84 : 104, gap = PHONE ? 8 : 10;
    return { cols, cw, ch, gap, pitch: ch + 18, x0: (VW - (cols * cw + (cols - 1) * gap)) / 2, y0: PHONE ? 52 : 58 };
  }
  function tlSlot(i) { const g = tlGeom(); return { x: g.x0 + (i % g.cols) * (g.cw + g.gap), y: g.y0 + Math.floor(i / g.cols) * g.pitch }; }
  function tlInit(perm) {
    TL.cards = EV.map((ev) => ({ ev, slot: 0, x: 0, y: 0, lift: 0, shake: 0 }));
    (perm || PERM).forEach((evIdx, slot) => { const c = TL.cards[evIdx]; c.slot = slot; const p = tlSlot(slot); c.x = p.x; c.y = p.y; });
    TL.sel = null; TL.drag = null; TL.grow = 0; TL.solved = false; TL.changes = 0;
  }
  const tlCorrect = () => TL.cards.filter((c) => c.slot === c.ev.i).length;
  const tlCardAtSlot = (p, except) => TL.cards.find((c) => { if (c === except) return false; const s = tlSlot(c.slot), g = tlGeom(); return inRect(p.x, p.y, { x: s.x, y: s.y, w: g.cw, h: g.ch }); });
  const tlCardAtPos = (p) => { const g = tlGeom(); for (let i = TL.cards.length - 1; i >= 0; i--) { const c = TL.cards[i]; if (inRect(p.x, p.y, { x: c.x, y: c.y, w: g.cw, h: g.ch })) return c; } return null; };
  function tlSwap(a, b) {
    const s = a.slot; a.slot = b.slot; b.slot = s; TL.changes++;
    Sound.click(); a.shake = b.shake = 0.6;
  }
  const tlPT = {
    down(p) { const c = tlCardAtPos(p); if (!c) return false; TL.drag = { c, dx: p.x - c.x, dy: p.y - c.y, sx: p.x, sy: p.y, moved: false }; const k = TL.cards.indexOf(c); TL.cards.splice(k, 1); TL.cards.push(c); Sound.tick(); return true; },
    move(p) { const d = TL.drag; if (!d) return; if (Math.hypot(p.x - d.sx, p.y - d.sy) > 8) d.moved = true; if (d.moved) { const g = tlGeom(); d.c.x = clamp(p.x - d.dx, 0, VW - g.cw); d.c.y = clamp(p.y - d.dy, 0, VH - g.ch); } },
    up(p) {
      const d = TL.drag; if (!d) return; TL.drag = null; const c = d.c;
      if (!d.moved) { if (!TL.sel) TL.sel = c; else if (TL.sel === c) TL.sel = null; else { tlSwap(TL.sel, c); TL.sel = null; } return; }
      const t = tlCardAtSlot(p, c); if (t) tlSwap(c, t);
    },
    hover(p) { return tlCardAtPos(p) ? 'grab' : 'default'; },
  };
  function tlUpdate(dt) {
    TL.cards.forEach((c) => {
      const dragging = TL.drag && TL.drag.c === c && TL.drag.moved;
      c.lift = approach(c.lift, dragging ? 1 : 0, dt, 14); c.shake = Math.max(0, c.shake - dt * 3);
      if (!dragging) { const s = tlSlot(c.slot); c.x = RM ? s.x : approach(c.x, s.x, dt, 14); c.y = RM ? s.y : approach(c.y, s.y, dt, 14); }
    });
    const ok = tlCorrect() === 15;
    if (ok && !TL.solved) { TL.solved = true; Sound.success(); const g = tlGeom(); parts.burst(VW / 2, g.y0 + g.pitch * 1.5, { count: 26, speed: 220 }); }
    if (!ok && TL.solved) { TL.solved = false; }
    TL.grow = RM ? (TL.solved ? 1 : 0) : approach(TL.grow, TL.solved ? 1 : 0, dt, 1.2);
    if (TL.solved && TL.grow > 0.995) TL.grow = 1;
  }
  function tlDrawCard(c) {
    const g = tlGeom(), ev = c.ev, w = g.cw, h = g.ch, ok = c.slot === ev.i;
    ctx.save(); ctx.translate(c.x + w / 2, c.y + h / 2);
    const sc = 1 + c.lift * 0.07; ctx.scale(sc, sc);
    if (c.shake > 0 && !RM) ctx.translate(Math.sin(clock * 60) * 3 * c.shake, 0);
    const sel = TL.sel === c, eraCol = ERA[ev.era].col, gr = TL.grow;
    flatCard(-w / 2, -h / 2, w, h, 12, sel ? '#fff8dc' : '#fff', c.lift);
    ctx.strokeStyle = sel ? '#f59e0b' : gr > 0.05 ? C.mix('#cbd5e1', eraCol, gr) : '#cbd5e1'; ctx.lineWidth = sel ? 3 : 2; D.roundRect(-w / 2, -h / 2, w, h, 12); ctx.stroke();
    if (gr > 0.02) { ctx.save(); D.roundRect(-w / 2, -h / 2, w, h, 12); ctx.clip(); ctx.fillStyle = C.rgba(eraCol, gr); ctx.fillRect(-w / 2, -h / 2, w, 7); ctx.restore(); }
    TF(-w / 2 + 10, -h / 2 + 27, ev.year, w - 52, PHONE ? 15 : 16, 11, INK, 'left', 800);
    E(ev.icon, w / 2 - 22, -h / 2 + 24, PHONE ? 20 : 24);
    const ls = wrap(ev.label, w - 20, PHONE ? 12 : 13, 800).slice(0, 3);
    ls.forEach((l, i) => T(-w / 2 + 10, -h / 2 + (PHONE ? 46 : 52) + i * (PHONE ? 15 : 17), l, PHONE ? 12 : 13, '#3b4a63', 'left', 800));
    if (ok) { ctx.fillStyle = '#16a34a'; ctx.beginPath(); ctx.arc(w / 2 - 14, h / 2 - 14, 9, 0, TAU); ctx.fill(); T(w / 2 - 14, h / 2 - 9.5, '✓', 13, '#fff', 'center', 800); }
    ctx.restore();
  }
  function tlDraw(dt, t) {
    tlUpdate(dt);
    const g = tlGeom(), rows = Math.ceil(15 / g.cols);
    TF(VW / 2, 28, TL.solved ? '시대별 색이 나타났어요! 전통 → 재조합 → 유전체·세포·편집' : '카드를 눌러 맞바꾸거나 끌어서 시간 순서대로 놓아요 (오래된 일 → 최근 일)', VW - 24, PHONE ? 14 : 16, 11.5, INK, 'center', 800);
    /* 칸 바탕 + 칸 번호 */
    for (let i = 0; i < 15; i++) {
      const s = tlSlot(i);
      D.roundRect(s.x, s.y, g.cw, g.ch, 12); ctx.fillStyle = 'rgba(148,163,184,.13)'; ctx.fill();
      T(s.x + g.cw / 2, s.y + g.ch / 2 + 6, String(i + 1), 34, 'rgba(148,163,184,.35)', 'center', 800);
    }
    /* 줄마다 시간 선 (정렬하면 시대 색으로 차오름) */
    for (let r = 0; r < rows; r++) {
      const y = g.y0 + r * g.pitch + g.ch + 8;
      ctx.fillStyle = 'rgba(148,163,184,.4)'; D.roundRect(g.x0, y, g.cols * g.cw + (g.cols - 1) * g.gap, 6, 3); ctx.fill();
      for (let k = 0; k < g.cols; k++) {
        const i = r * g.cols + k; if (i >= 15) break;
        const f = clamp(TL.grow * 15 - i, 0, 1); if (f <= 0) continue;
        ctx.fillStyle = ERA[EV[i].era].col; const sx = g.x0 + k * (g.cw + g.gap);
        D.roundRect(sx, y, (g.cw + (k < g.cols - 1 ? g.gap : 0)) * f, 6, 3); ctx.fill();
      }
    }
    TL.cards.forEach(tlDrawCard);
    /* 시대 구분 범례 */
    const ly = g.y0 + rows * g.pitch + 2, lh = VH - ly - 10, cnt = [0, 0, 0]; EV.forEach((e) => cnt[e.era]++);
    const lw = (VW - 24 - 16) / 3;
    ERA.forEach((e, k) => {
      const x = 12 + k * (lw + 8), on = TL.grow > 0.55;
      D.roundRect(x, ly, lw, lh, 12); ctx.fillStyle = on ? C.rgba(e.col, 0.12) : 'rgba(148,163,184,.1)'; ctx.fill();
      ctx.strokeStyle = on ? e.col : 'rgba(148,163,184,.5)'; ctx.lineWidth = 2; ctx.setLineDash(on ? [] : [6, 5]); ctx.stroke(); ctx.setLineDash([]);
      if (on) {
        TF(x + lw / 2, ly + (PHONE ? 20 : 26), e.n, lw - 12, PHONE ? 13 : 15, 10.5, C.shade(e.col, -0.25), 'center', 800);
        TF(x + lw / 2, ly + (PHONE ? 37 : 47), e.sub, lw - 12, PHONE ? 11 : 12.5, 9.5, '#475569', 'center', 700);
        TF(x + lw / 2, ly + (PHONE ? 55 : 69), cnt[k] + '장', lw - 12, PHONE ? 13 : 15, 10.5, e.col, 'center', 800);
      } else TF(x + lw / 2, ly + lh / 2 + 5, k === 1 ? '순서를 맞추면 시대 구분이 나타나요' : '?', lw - 14, 12.5, 10, '#94a3b8', 'center', 800);
    });
  }


  /* ===================== ② 재조합 DNA 만들기 ===================== */
  const ENZ = {
    eco: { n: 'EcoRI', seq: 'GAATTC', col: '#2563eb', cut: 'G^AATTC', end: 'AATT' },
    hind: { n: 'HindIII', seq: 'AAGCTT', col: '#ea580c', cut: 'A^AGCTT', end: 'AGCT' },
    bam: { n: 'BamHI', seq: 'GGATCC', col: '#db2777', cut: 'G^GATCC', end: 'GATC' },
  };
  const FAIL = {
    hind: 'HindIII(AAGCTT)는 사람 DNA의 인슐린 유전자 한가운데를 잘라 유전자를 망가뜨리고, 플라스미드에는 알아보는 자리가 없어서 열지 못해요.',
    bam: 'BamHI(GGATCC)는 사람 DNA에 알아보는 자리가 없어 유전자 조각이 나오지 않고, 플라스미드는 항생제 저항 유전자 안쪽이 잘려요.',
  };
  const RG = PHONE
    ? { sy: 100, sx0: 24, sx1: 456, gx1: 160, gx2: 320, hx: 240, cx: 236, cy: 270, r: 72, px: 16, py: 372, pw: 448, ph: 258 }
    : { sy: 108, sx0: 36, sx1: 764, gx1: 290, gx2: 510, hx: 400, cx: 196, cy: 354, r: 90, px: 392, py: 178, pw: 392, ph: 372 };
  const HW = 0.22, A_TOP = -Math.PI / 2, A_BAM = 0.96;
  const NB = 12, NPL = 4, INS_MAX = 60;
  const BCOL = { A: '#ef6a5a', T: '#4f8ef0', G: '#f5a623', C: '#22b573' };
  const DISH = { x: RG.px + 14, y: RG.py + 46, w: RG.pw - 28, h: RG.ph - 46 - 90 };
  function rcNew() {
    const bact = [];
    for (let i = 0; i < NB; i++) {
      bact.push({ x: DISH.x + 24 + (i % 4) * (DISH.w - 48) / 3 + (rnd() - 0.5) * 16, y: DISH.y + 26 + Math.floor(i / 4) * (DISH.h - 52) / 2 + (rnd() - 0.5) * 12, ang: rnd() * TAU, sp: 10 + rnd() * 10, plasmid: false, alive: 1, dying: 0, dieAt: 0, emitT: rnd() * 0.3, sz: 1 });
    }
    return { enz: null, stage: 0, fail: null, cutT: 0, cutFx: false, m: 0, seal: 0, gap: 0, gapAng: A_TOP, pan: 0, flights: [], bact, abx: 0, t5: 0, insulin: 0, dots: [], pile: [], pulse: 0, sealFx: false, hint: '' };
  }
  let RC = rcNew();
  const rcPlasmids = () => RC.bact.filter((b) => b.plasmid).length;
  const rcAlive = () => RC.bact.filter((b) => b.alive > 0 && b.dying === 0).length;
  const rcDone = () => RC.enz === 'eco' && RC.stage >= 5 && RC.insulin >= 20;
  function rcReset() { RC = rcNew(); parts.clear(); FX.clear(); updateCtl(); }
  const RC_BTN = ['① 제한 효소로 자르기', '② 끝 맞추기 (조각 끼우기)', '③ 연결 효소로 잇기', '④ 대장균에 넣기', '⑤ 항생제 배지에서 키우기', '✅ 인슐린 생산 중'];
  function rcPick(v) {
    if (RC.stage > 0) return;
    RC.enz = v; Sound.click(); updateCtl();
  }
  function rcNext() {
    if (RC.stage >= 5 || RC.fail) return;
    if (RC.stage === 0 && !RC.enz) { showHint('먼저 제한 효소(가위)를 골라요. 사람 DNA와 플라스미드에 표시된 서열을 살펴봐요.'); return; }
    Sound.click();
    RC.stage++;
    if (RC.stage === 1) { RC.cutT = 0; RC.cutFx = false; if (RC.enz !== 'eco') { RC.fail = FAIL[RC.enz]; Sound.fail(); } }
    if (RC.stage === 2) RC.m = 0;
    if (RC.stage === 3) { RC.seal = 0; RC.sealFx = false; }
    if (RC.stage === 4) {
      const picks = [1, 4, 7, 10]; RC.flights = picks.map((k, i) => ({ b: RC.bact[k], delay: i * 0.45, t: 0 }));
    }
    if (RC.stage === 5) { RC.flights.forEach((f) => { f.b.plasmid = true; }); RC.flights = [];   // 아직 날아가는 중인 플라스미드도 들어간 것으로 처리해요
      RC.t5 = 0; RC.abx = 0; RC.bact.forEach((b) => { b.dieAt = b.plasmid ? 1e9 : 0.5 + rnd() * 1.4; }); }
    updateCtl();
  }
  function rcUpdate(dt) {
    const R = RC;
    if (R.stage >= 1) R.cutT = Math.min(1, R.cutT + dt / 1.4);
    if (R.stage >= 1 && !R.cutFx && R.cutT > 0.45) {
      R.cutFx = true;
      const pts = R.enz === 'eco' ? [[RG.gx1, RG.sy], [RG.gx2, RG.sy], [RG.cx, RG.cy - RG.r]] : R.enz === 'hind' ? [[RG.hx, RG.sy]] : [[RG.cx + RG.r * Math.cos(A_BAM), RG.cy + RG.r * Math.sin(A_BAM)]];
      pts.forEach((p) => parts.burst(p[0], p[1], { count: 8, speed: 110, life: 0.5, colors: ['#fde047', '#fff', ENZ[R.enz].col] }));
    }
    const gTarget = R.stage >= 1 && R.enz === 'eco' ? HW : R.stage >= 1 && R.enz === 'bam' ? 0.2 : 0;
    R.gapAng = R.enz === 'bam' ? A_BAM : A_TOP;
    R.gap = RM ? gTarget : approach(R.gap, gTarget, dt, 5);
    if (R.stage >= 2 && !R.fail) R.m = Math.min(1, R.m + dt / 1.3);
    if (R.stage >= 3) { R.seal = Math.min(1, R.seal + dt / 0.9); if (R.seal >= 1 && !R.sealFx) { R.sealFx = true; R.pulse = 1; Sound.success(); parts.burst(RG.cx, RG.cy - RG.r, { count: 14, speed: 140, life: 0.7 }); } }
    R.pulse = Math.max(0, R.pulse - dt * 1.6);
    R.pan = RM ? (R.stage >= 4 ? 1 : 0) : approach(R.pan, R.stage >= 4 ? 1 : 0, dt, 6);
    if (R.stage >= 4) {
      R.bact.forEach((b) => {
        if (b.alive <= 0) return;
        b.ang += (rnd() - 0.5) * dt * 4; const sp = b.dying ? 0 : b.sp;
        b.x += Math.cos(b.ang) * sp * dt; b.y += Math.sin(b.ang) * sp * dt;
        if (b.x < DISH.x + 18) { b.x = DISH.x + 18; b.ang = Math.PI - b.ang; } if (b.x > DISH.x + DISH.w - 18) { b.x = DISH.x + DISH.w - 18; b.ang = Math.PI - b.ang; }
        if (b.y < DISH.y + 14) { b.y = DISH.y + 14; b.ang = -b.ang; } if (b.y > DISH.y + DISH.h - 14) { b.y = DISH.y + DISH.h - 14; b.ang = -b.ang; }
      });
      for (let i = R.flights.length - 1; i >= 0; i--) {
        const f = R.flights[i]; f.t += dt; const p = (f.t - f.delay) / 1.4;
        if (p >= 1) { f.b.plasmid = true; parts.burst(f.b.x, f.b.y, { count: 8, speed: 80, life: 0.5, colors: ['#22c55e', '#fff'] }); Sound.tick(); R.flights.splice(i, 1); }
      }
    }
    if (R.stage >= 5) {
      R.abx = Math.min(1, R.abx + dt / 1.0); R.t5 += dt;
      R.bact.forEach((b) => {
        if (b.alive > 0 && !b.dying && R.t5 > b.dieAt) { b.dying = 0.001; }
        if (b.dying > 0 && b.alive > 0) { b.dying += dt / 0.7; if (b.dying >= 1) { b.alive = 0; parts.emit({ x: b.x, y: b.y, vy: -14, life: 0.9, size: 14, grow: 14, color: '#cbd5e1', shape: 'smoke' }); } }
        if (b.alive > 0 && b.plasmid && R.t5 > 1.6 && R.insulin < INS_MAX) {
          b.emitT -= dt;
          if (b.emitT <= 0) { b.emitT = 0.28; R.insulin++; R.dots.push({ x: b.x, y: b.y, vx: (rnd() - 0.5) * 50, vy: -16 - rnd() * 18, life: 0 }); }
        }
      });
      for (let i = R.dots.length - 1; i >= 0; i--) {
        const d = R.dots[i]; d.life += dt; d.vy += 90 * dt; d.vx *= Math.exp(-1.2 * dt); d.x += d.vx * dt; d.y += d.vy * dt;
        const floor = DISH.y + DISH.h - 5 - rnd() * 3;
        if (d.x < DISH.x + 6) d.x = DISH.x + 6; if (d.x > DISH.x + DISH.w - 6) d.x = DISH.x + DISH.w - 6;
        if (d.y >= floor) { R.dots.splice(i, 1); R.pile.push({ x: d.x, y: floor }); if (R.pile.length > 140) R.pile.shift(); }
      }
    }
  }
  /* ---- 그리기 조각들 ---- */
  function rcStrip(sx, ex, y, col, alpha) {
    if (ex - sx < 1) return;
    ctx.save(); ctx.globalAlpha = alpha == null ? 1 : alpha;
    ctx.strokeStyle = col || '#64748b'; ctx.lineWidth = 3.2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(sx, y - 6); ctx.lineTo(ex, y - 6); ctx.moveTo(sx, y + 6); ctx.lineTo(ex, y + 6); ctx.stroke();
    ctx.lineWidth = 1.4; ctx.strokeStyle = C.rgba(col || '#64748b', 0.5);
    for (let x = sx + 5; x < ex - 2; x += 9) { ctx.beginPath(); ctx.moveTo(x, y - 6); ctx.lineTo(x, y + 6); ctx.stroke(); }
    ctx.restore();
  }
  function rcSiteTick(x, y, col, pulse) {
    ctx.strokeStyle = col; ctx.lineWidth = 3.2; ctx.beginPath(); ctx.moveTo(x, y - 13); ctx.lineTo(x, y + 13); ctx.stroke();
    if (pulse) D.ring(x, y, 17, clock, { color: col, width: 2.5 });
  }
  function rcInsertPts(m, lift) {
    const N = 28, pts = [], e = ease.inOutCubic(clamp(m, 0, 1));
    for (let i = 0; i <= N; i++) {
      const u = i / N, sx = lerp(RG.gx1, RG.gx2, u), sy = RG.sy - lift * (1 - e);
      const a = A_TOP - HW + 2 * HW * u, rx = RG.cx + RG.r * Math.cos(a), ry = RG.cy + RG.r * Math.sin(a);
      pts.push({ x: lerp(sx, rx, e), y: lerp(sy, ry, e) });
    }
    return pts;
  }
  function polyline(pts, col, w) {
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = C.shade(col, -0.25); ctx.lineWidth = w + 2.5; ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.stroke();
    ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = Math.max(1.5, w * 0.25); ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p.x - 0.5, p.y - w * 0.18) : ctx.moveTo(p.x - 0.5, p.y - w * 0.18))); ctx.stroke();
    ctx.restore();
  }
  function ringArc(a0, a1, col, w) {
    ctx.save(); ctx.lineCap = 'round';
    ctx.strokeStyle = C.shade(col, -0.25); ctx.lineWidth = w + 2.5; ctx.beginPath(); ctx.arc(RG.cx, RG.cy, RG.r, a0, a1); ctx.stroke();
    ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.arc(RG.cx, RG.cy, RG.r, a0, a1); ctx.stroke();
    ctx.restore();
  }
  function scissors(x, y, p, rot) {
    if (p <= 0 || p >= 1) return;
    const dropT = clamp(p / 0.45, 0, 1), fadeT = clamp((p - 0.6) / 0.4, 0, 1);
    const yy = y - 12 - (1 - ease.outCubic(dropT)) * 48;
    E('✂️', x, yy, 26, { rot: (rot || 0) + (p > 0.4 ? Math.sin(p * 40) * 0.18 : 0), alpha: 1 - fadeT });
  }
  function rcDrawBase(t) {
    const R = RC, ec = R.enz === 'eco', cut = R.stage >= 1 ? ease.outCubic(R.cutT) : 0;
    const sy = RG.sy;
    T(RG.sx0, sy - 40, '사람 DNA (염색체의 일부)', PHONE ? 13 : 15, '#334155', 'left', 800);
    /* 사람 DNA 줄 */
    const flankOff = (R.stage >= 1 && ec) ? 8 * cut : 0;
    rcStrip(RG.sx0 - flankOff, RG.gx1 - flankOff, sy, '#64748b'); rcStrip(RG.gx2 + flankOff, RG.sx1 + flankOff, sy, '#64748b');
    T(RG.sx0 + 2, sy + 28, '…', 16, '#64748b', 'left', 800); T(RG.sx1 - 2, sy + 28, '…', 16, '#64748b', 'right', 800);
    /* 인슐린 유전자 */
    const fragGone = R.stage >= 2 && ec;
    const lift = (R.stage >= 1 && ec) ? 14 * cut : 0;
    if (R.stage >= 1 && R.enz === 'hind') {
      const pts = rcInsertPts(0, 0), sp = 12 * cut;
      const left = pts.slice(0, 15).map((p) => ({ x: p.x - sp, y: p.y })), right = pts.slice(14).map((p) => ({ x: p.x + sp, y: p.y }));
      polyline(left, '#16a34a', 9); polyline(right, '#16a34a', 9);
      if (cut > 0.5) { T(RG.hx, sy + 5, '✖', 20, '#dc2626', 'center', 800, { stroke: '#fff', strokeWidth: 4 }); }
    } else {
      const pts = rcInsertPts(ec ? R.m : 0, lift);
      polyline(pts, '#16a34a', 9);
    }
    if (R.stage < 1 || !ec) TF((RG.gx1 + RG.gx2) / 2, sy - 22 - lift, '인슐린 유전자', 150, PHONE ? 13 : 15, 11, '#15803d', 'center', 800);
    else if (R.m < 0.3) TF((RG.gx1 + RG.gx2) / 2, sy - 22 - lift, '인슐린 유전자 조각', 170, PHONE ? 13 : 15, 11, '#15803d', 'center', 800, { alpha: 1 - R.m / 0.3 });
    if (fragGone) { ctx.save(); ctx.setLineDash([5, 4]); ctx.strokeStyle = 'rgba(100,116,139,.55)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(RG.gx1 - flankOff, sy - 6); ctx.lineTo(RG.gx2 + flankOff, sy - 6); ctx.moveTo(RG.gx1 - flankOff, sy + 6); ctx.lineTo(RG.gx2 + flankOff, sy + 6); ctx.stroke(); ctx.restore(); }
    /* 알아보는 자리 표시 (고른 효소는 반짝여요) */
    const pre = R.stage === 0 || (R.stage === 1 && R.cutT < 0.45);
    [[RG.gx1, 'eco'], [RG.gx2, 'eco'], [RG.hx, 'hind']].forEach(([x, k]) => {
      if (fragGone && (k === 'eco' || k === 'hind')) return;
      const xx = (k === 'eco' && R.stage >= 1 && ec) ? x + (x === RG.gx1 ? -flankOff : flankOff) : x;
      if (k === 'hind' && R.stage >= 1 && R.enz === 'hind') return;
      rcSiteTick(xx, sy, ENZ[k].col, pre && R.enz === k);
      TF(xx, sy + 31, ENZ[k].seq, 70, PHONE ? 11.5 : 12.5, 9.5, ENZ[k].col, 'center', 800);
    });
    /* 플라스미드 */
    const { cx, cy, r } = RG;
    const pulse = 1 + (RM ? 0 : Math.sin(R.pulse * Math.PI) * 0.06 * R.pulse);
    ctx.save(); ctx.translate(cx, cy); ctx.scale(pulse, pulse); ctx.translate(-cx, -cy);
    const g = R.gap, ac = R.gapAng;
    const a0 = ac + g, a1 = ac + TAU - g;
    ringArc(a0, a1, '#5b7db1', 9);
    /* 항생제 저항 유전자 (amp) */
    const aA = 0.2, aB = 1.85;
    if (R.enz === 'bam' && R.stage >= 1 && R.gap > 0.02) {
      /* 가운데가 잘림: 두 동강 */
      ringArc(aA, A_BAM - g, '#f59e0b', 9); ringArc(A_BAM + g, aB, '#f59e0b', 9);
    } else ringArc(aA, aB, '#f59e0b', 9);
    /* 삽입된 유전자 (고리의 일부) */
    if (ec && R.stage >= 2) polyline(rcInsertPts(R.m, 14), '#16a34a', 9);
    ctx.restore();
    /* 플라스미드 자리 표시 */
    rcSiteTick2(R, t);
    if (R.stage >= 2 && ec) TF(cx, cy - 4, '재조합', r * 1.3, PHONE ? 14 : 16, 11, '#15803d', 'center', 800);
    else TF(cx, cy - 4, '플라스미드', r * 1.4, PHONE ? 14 : 16, 11, '#3b5a8f', 'center', 800);
    TF(cx, cy + 16, R.stage >= 2 && ec ? '플라스미드' : '(벡터)', r * 1.3, PHONE ? 12 : 13, 10, '#475569', 'center', 700);
    const ax = cx + r + 8, ay = cy + r * 0.78;
    D.dashedLine(cx + r * Math.cos(1.0), cy + r * Math.sin(1.0), ax, ay - 6, { color: '#b45309', width: 1.4, dash: [3, 3] });
    T(ax + 2, ay + 4, '항생제 저항', PHONE ? 12 : 13, '#b45309', 'left', 800); T(ax + 2, ay + 20, '유전자', PHONE ? 12 : 13, '#b45309', 'left', 800);
    /* 가위와 이음 효소 */
    if (R.stage >= 1) {
      if (R.enz === 'eco') { scissors(RG.gx1, sy, R.cutT, -0.5); scissors(RG.gx2, sy, R.cutT, 0.5); scissors(cx, cy - r, R.cutT, 0); }
      else if (R.enz === 'hind') scissors(RG.hx, sy, R.cutT, 0);
      else scissors(cx + r * Math.cos(A_BAM), cy + r * Math.sin(A_BAM), R.cutT, 0.6);
    }
    if (R.stage >= 3 && R.enz === 'eco') {
      [-1, 1].forEach((sg) => {
        const a = A_TOP + sg * HW, px2 = cx + r * Math.cos(a), py2 = cy + r * Math.sin(a), k = 1 - R.seal;
        if (R.seal < 1) { D.sphere(px2 + sg * 10, py2 - 14 - k * 18, 6, '#a855f7', { shadow: true }); }
        else D.check(px2 + sg * 18, py2 - 18, 7, 1);
      });
      if (R.seal < 1) TF(cx, cy - r - 36, '연결 효소가 틈을 이어요', 180, PHONE ? 12 : 13, 10, '#7e22ce', 'center', 800);
    }
    if (R.stage === 2 && R.m >= 1) {
      [-1, 1].forEach((sg) => { const a = A_TOP + sg * HW; ctx.strokeStyle = '#dc2626'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx + (r - 9) * Math.cos(a), cy + (r - 9) * Math.sin(a)); ctx.lineTo(cx + (r + 9) * Math.cos(a), cy + (r + 9) * Math.sin(a)); ctx.stroke(); });
      TF(cx, cy - r - 36, '아직 틈이 남아 있어요', 180, PHONE ? 12 : 13, 10, '#dc2626', 'center', 800);
    }
  }
  function rcSiteTick2(R, t) {
    const { cx, cy, r } = RG, hide = R.stage >= 1 && R.enz === 'eco';
    const pre = R.stage === 0 || (R.stage === 1 && R.cutT < 0.45);
    if (!hide) {
      const x = cx, y = cy - r;
      ctx.strokeStyle = ENZ.eco.col; ctx.lineWidth = 3.2; ctx.beginPath(); ctx.moveTo(x, y - 12); ctx.lineTo(x, y + 12); ctx.stroke();
      if (pre && R.enz === 'eco') D.ring(x, y, 16, clock, { color: ENZ.eco.col, width: 2.5 });
      TF(x, y - 22, ENZ.eco.seq, 70, PHONE ? 11.5 : 12.5, 9.5, ENZ.eco.col, 'center', 800);
    }
    if (!(R.stage >= 1 && R.enz === 'bam')) {
      const x = cx + r * Math.cos(A_BAM), y = cy + r * Math.sin(A_BAM);
      ctx.strokeStyle = ENZ.bam.col; ctx.lineWidth = 3.2; ctx.beginPath(); ctx.moveTo(cx + (r - 13) * Math.cos(A_BAM), cy + (r - 13) * Math.sin(A_BAM)); ctx.lineTo(cx + (r + 13) * Math.cos(A_BAM), cy + (r + 13) * Math.sin(A_BAM)); ctx.stroke();
      if (pre && R.enz === 'bam') D.ring(x, y, 16, clock, { color: ENZ.bam.col, width: 2.5 });
      TF(cx + (r - 30) * Math.cos(A_BAM), cy + (r - 30) * Math.sin(A_BAM) + 4, ENZ.bam.seq, 60, PHONE ? 11.5 : 12.5, 9.5, ENZ.bam.col, 'center', 800);
    }
  }
  /* ---- 접착 말단 확대 ---- */
  function seqBox(x, y, ch, s, a) {
    ctx.save(); ctx.globalAlpha = a == null ? 1 : a;
    D.roundRect(x, y, s, s, 5); ctx.fillStyle = BCOL[ch]; ctx.fill();
    T(x + s / 2, y + s * 0.7, ch, s * 0.6, '#fff', 'center', 800);
    ctx.restore();
  }
  function rcInset() {
    const R = RC, { px, py, pw, ph } = RG, cell = PHONE ? 26 : 30;
    panel(px, py, pw, ph, 14, '#fff');
    const en = ENZ[R.enz || 'eco'];
    if (!R.enz) {
      TF(px + pw / 2, py + 34, '🔬 가위가 자르는 자리 확대', pw - 20, 16, 12, INK, 'center', 800);
      textBlock(px + 20, py + 80, pw - 40, '오른쪽 위의 3가지 제한 효소(가위) 중 하나를 골라요. 제한 효소는 DNA에서 자기만 알아보는 특정 서열을 찾아 그 자리를 잘라요.', 14.5, '#475569', 21);
      textBlock(px + 20, py + 190, pw - 40, '사람 DNA와 플라스미드에 파란색(GAATTC), 주황색(AAGCTT), 분홍색(GGATCC)으로 표시된 알아보는 자리를 살펴보세요.', 14, '#64748b', 20);
      return;
    }
    if (R.fail) {
      TF(px + pw / 2, py + 34, '⚠ ' + en.n + '로는 안 돼요', pw - 20, 17, 12, '#b91c1c', 'center', 800);
      textBlock(px + 20, py + 74, pw - 40, R.fail, 14.5, '#475569', 21);
      textBlock(px + 20, py + 200, pw - 40, '두 DNA를 모두 같은 자리에서 잘라 주는 가위를 골라야 해요. 초기화(↺ 처음부터)한 뒤 다시 골라요.', 14, '#64748b', 20);
      return;
    }
    const st = R.stage, gapPx = st <= 1 ? 62 * ease.outCubic(st === 1 ? R.cutT : 0) : st === 2 ? 62 * (1 - ease.inOutCubic(R.m)) : 0;
    const titles = ['🔬 ' + en.n + '가 알아보는 자리 (' + en.seq + ')', '🔬 자른 단면: 접착 말단', '🔬 끝이 서로 맞아 붙어요', '🔬 연결 효소가 틈을 이어요'];
    TF(px + pw / 2, py + 30, titles[Math.min(st, 3)], pw - 20, 16, 12, INK, 'center', 800);
    const ix0 = px + pw / 2 - cell * 3 - 24, ty = py + (PHONE ? 78 : 92), by = ty + cell + (PHONE ? 14 : 16), msgY = by + cell + (PHONE ? 22 : 30);   // 폰: 아래 설명 글과 겹치지 않게 간격을 줄여요
    const top = 'GAATTC'.split(''), bot = 'CTTAAG'.split('');
    const lx = (k) => ix0 + k * cell, rx = (k) => ix0 + k * cell + gapPx;
    /* 뼈대 선 */
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 3.4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(px + 24, ty + cell / 2); ctx.lineTo(lx(0) + cell, ty + cell / 2); ctx.moveTo(px + 24, by + cell / 2); ctx.lineTo(lx(4) + cell, by + cell / 2);
    ctx.moveTo(rx(1), ty + cell / 2); ctx.lineTo(px + pw - 24, ty + cell / 2); ctx.moveTo(rx(5), by + cell / 2); ctx.lineTo(px + pw - 24, by + cell / 2); ctx.stroke();
    T(px + 12, ty + cell / 2 + 4, '5′', 13, '#64748b', 'left', 800); T(px + 12, by + cell / 2 + 4, '3′', 13, '#64748b', 'left', 800);
    T(px + pw - 12, ty + cell / 2 + 4, '3′', 13, '#64748b', 'right', 800); T(px + pw - 12, by + cell / 2 + 4, '5′', 13, '#64748b', 'right', 800);
    /* 접착 말단 강조 */
    if (gapPx > 1) {
      const a = clamp(gapPx / 20, 0, 1);
      ctx.fillStyle = 'rgba(250,204,21,' + 0.28 * a + ')';
      D.roundRect(lx(1) - 3, by - 3, cell * 4 + 6, cell + 6, 7); ctx.fill(); D.roundRect(rx(1) - 3, ty - 3, cell * 4 + 6, cell + 6, 7); ctx.fill();
    }
    /* 염기 */
    seqBox(lx(0), ty, top[0], cell); for (let k = 1; k <= 5; k++) seqBox(rx(k), ty, top[k], cell);
    for (let k = 0; k <= 4; k++) seqBox(lx(k), by, bot[k], cell); seqBox(rx(5), by, bot[5], cell);
    /* 염기쌍 결합선 */
    const bond = (x, k) => { ctx.strokeStyle = '#64748b'; ctx.lineWidth = 1.6; const n = top[k] === 'G' || top[k] === 'C' ? 3 : 2; for (let j = 0; j < n; j++) { const xx = x + cell * (0.3 + 0.2 * j); ctx.beginPath(); ctx.moveTo(xx, ty + cell + 1); ctx.lineTo(xx, by - 1); ctx.stroke(); } };
    bond(lx(0), 0); bond(rx(5), 5);
    const a = clamp(1 - gapPx / 24, 0, 1);
    if (a > 0.02) { ctx.save(); ctx.globalAlpha = a; for (let k = 1; k <= 4; k++) bond(lx(k), k); ctx.restore(); }
    /* 자르는 자리 / 틈 */
    if (st === 0) {
      ctx.save(); ctx.setLineDash([4, 3]); ctx.strokeStyle = '#dc2626'; ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.moveTo(lx(1), ty - 8); ctx.lineTo(lx(1), ty + cell + 4); ctx.moveTo(lx(5), by - 4); ctx.lineTo(lx(5), by + cell + 8); ctx.stroke(); ctx.restore();
      E('✂️', lx(1), ty - 16 + Math.sin(clock * 3) * 2, 18); E('✂️', lx(5), by + cell + 20 + Math.sin(clock * 3 + 1) * 2, 18);
      T(lx(1) - 6, ty - 30, '위 가닥: G와 A 사이', 11.5, '#dc2626', 'left', 800); T(lx(5) + 4, by + cell + (PHONE ? 36 : 40), '아래 가닥: A와 G 사이', 11.5, '#dc2626', 'center', 800);
    }
    if (st === 1 && gapPx > 30) { TF(px + pw / 2, msgY, '접착 말단 ' + en.end + ' (한쪽 가닥이 4염기 더 길어요)', pw - 24, 14, 11, '#a16207', 'center', 800, { alpha: clamp((gapPx - 30) / 20, 0, 1) }); }
    if (st === 2 && R.m >= 1) {
      ctx.fillStyle = '#dc2626'; [[lx(1), ty + cell / 2], [lx(5), by + cell / 2]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, 4.5, 0, TAU); ctx.fill(); });
      TF(px + pw / 2, msgY, 'A-T 염기쌍으로 붙었지만 뼈대에 틈이 남았어요', pw - 24, 13.5, 10.5, '#dc2626', 'center', 800);
    }
    if (st >= 3) {
      [[lx(1), ty + cell / 2], [lx(5), by + cell / 2]].forEach(([x, y]) => { if (R.seal < 1) { ctx.fillStyle = '#a855f7'; ctx.beginPath(); ctx.arc(x, y - 4 * (1 - R.seal), 5, 0, TAU); ctx.fill(); } else { ctx.fillStyle = '#16a34a'; ctx.beginPath(); ctx.arc(x, y, 5, 0, TAU); ctx.fill(); } });
      TF(px + pw / 2, msgY, R.seal < 1 ? '연결 효소가 뼈대의 틈을 이어요' : '끊어졌던 뼈대가 하나로 이어졌어요', pw - 24, 14, 11, R.seal < 1 ? '#7e22ce' : '#15803d', 'center', 800);
    }
    /* 이름표 */
    T(px + 30, ty - 14, st >= 2 ? '플라스미드의 끝' : '플라스미드', 13, '#3b5a8f', 'left', 800);
    T(px + pw - 30, ty - 14, st >= 2 ? '사람 DNA 조각의 끝' : '(잘린 다른 쪽)', 13, st >= 2 ? '#15803d' : '#64748b', 'right', 800);
    const caps = [
      '제한 효소는 특정 서열(' + en.n + ': ' + en.seq + ')을 알아보고 그 자리를 잘라요. 이 서열은 두 가닥을 5′→3′으로 읽으면 같아서 회문 구조예요.',
      '위 가닥은 G와 A 사이, 아래 가닥은 A와 G 사이를 어긋나게 잘라서 한쪽 끝에 ' + en.end + '가 남아요.',
      '사람 DNA 조각을 같은 효소로 잘랐기 때문에 끝의 ' + en.end + '가 플라스미드 끝과 서로 상보적이에요 (A-T).',
      '연결 효소가 인접한 뼈대(당-인산)의 틈을 이어서 DNA가 하나가 돼요.',
    ];
    textBlock(px + 18, py + ph - (PHONE ? 58 : 110), pw - 36, caps[Math.min(st, 3)], PHONE ? 12.5 : 14.5, '#475569', PHONE ? 16 : 21);
  }
  /* ---- 대장균 접시 ---- */
  function bacterium(b, tint) {
    if (b.alive <= 0) return;
    const k = b.dying > 0 ? 1 - b.dying : 1;
    ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.ang); ctx.scale(0.4 + 0.6 * k, 0.4 + 0.6 * k); ctx.globalAlpha = 0.35 + 0.65 * k;
    if (b.dying > 0) ctx.translate(Math.sin(clock * 40) * 1.2, 0);
    const L2 = 15, W2 = 7.5;
    D.shadow(() => { D.roundRect(-L2, -W2, L2 * 2, W2 * 2, W2); ctx.fillStyle = b.dying > 0 ? '#cbd5e1' : '#bfe3b0'; ctx.fill(); }, { blur: 3, y: 1 });
    ctx.strokeStyle = b.dying > 0 ? '#94a3b8' : '#5e9d4f'; ctx.lineWidth = 1.8; D.roundRect(-L2, -W2, L2 * 2, W2 * 2, W2); ctx.stroke();
    ctx.strokeStyle = 'rgba(80,110,70,.55)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-9, -1); ctx.bezierCurveTo(-4, -4, 0, 3, 4, 0); ctx.bezierCurveTo(6, -2, 8, 1, 10, 0); ctx.stroke();
    if (b.plasmid) { ctx.strokeStyle = '#16a34a'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.arc(-6, 2.2, 3.4, 0, TAU); ctx.stroke(); }
    ctx.restore();
  }
  function rcDish() {
    const R = RC, { px, py, pw, ph } = RG;
    panel(px, py, pw, ph, 14, '#fff');
    TF(px + pw / 2, py + 28, R.stage >= 5 ? '🧫 항생제 배지: 저항 유전자가 있는 대장균만 살아요' : '🧫 대장균에 재조합 플라스미드 넣기 (형질 전환)', pw - 20, PHONE ? 14 : 15.5, 11, INK, 'center', 800);
    ctx.save(); D.roundRect(DISH.x, DISH.y, DISH.w, DISH.h, 16); ctx.fillStyle = C.mix('#fff7d6', '#ffe9a8', R.abx * 0.8); ctx.fill(); ctx.strokeStyle = '#d6c27a'; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.clip();
    if (R.abx > 0) { ctx.fillStyle = 'rgba(245,158,11,' + 0.1 * R.abx + ')'; ctx.fillRect(DISH.x, DISH.y, DISH.w, DISH.h); for (let i = 0; i < 14; i++) { const x = DISH.x + 20 + (i * 53) % (DISH.w - 40), y = DISH.y + 12 + ((i * 37 + clock * 18 * R.abx) % (DISH.h - 24)); ctx.fillStyle = 'rgba(217,119,6,.35)'; ctx.beginPath(); ctx.arc(x, y, 2.4, 0, TAU); ctx.fill(); } }
    R.pile.forEach((p) => { D.sphere(p.x, p.y, 3, '#ef4444', { gloss: false }); });
    R.bact.forEach((b) => bacterium(b));
    R.dots.forEach((d) => D.sphere(d.x, d.y, 3.4, '#ef4444', { gloss: false }));
    ctx.restore();
    R.flights.forEach((f) => {
      const p = clamp((f.t - f.delay) / 1.4, 0, 1); if (f.t < f.delay) return;
      const e = ease.inOutCubic(p), x0 = RG.cx, y0 = RG.cy, x = lerp(x0, f.b.x, e), y = lerp(y0, f.b.y, e) - Math.sin(p * Math.PI) * 60;
      const s = lerp(10, 4, e);
      ctx.strokeStyle = '#16a34a'; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.arc(x, y, s, 0, TAU); ctx.stroke();
    });
    /* 숫자 */
    const alive = rcAlive();
    if (R.stage === 4) TF(px + pw / 2, DISH.y + DISH.h + 20, '플라스미드를 받은 대장균 ' + rcPlasmids() + ' / ' + NB + '마리 (초록 고리)', pw - 20, PHONE ? 13 : 14.5, 10.5, '#15803d', 'center', 800);
    if (R.stage >= 5) TF(px + pw / 2, DISH.y + DISH.h + 20, '살아남은 대장균 ' + alive + '마리, 죽은 대장균 ' + (NB - alive) + '마리', pw - 20, PHONE ? 13 : 14.5, 10.5, '#15803d', 'center', 800);
    /* 인슐린 생산 막대 */
    const by = py + ph - 30, bw = pw - 28;
    D.roundRect(px + 14, by, bw, 14, 7); ctx.fillStyle = '#fee2e2'; ctx.fill();
    if (R.insulin > 0) { D.roundRect(px + 14, by, Math.max(14, bw * R.insulin / INS_MAX), 14, 7); ctx.fillStyle = '#ef4444'; ctx.fill(); }
    TF(px + 14, by - 6, '💉 인슐린 입자 ' + R.insulin + ' / ' + INS_MAX, bw, 13, 10.5, '#b91c1c', 'left', 800);
  }
  function rcDraw(dt, t) {
    rcUpdate(dt);
    rcDrawBase(t);
    if (RC.pan < 0.99) { ctx.save(); ctx.globalAlpha = 1 - RC.pan; rcInset(); ctx.restore(); }
    if (RC.pan > 0.01) { ctx.save(); ctx.globalAlpha = RC.pan; rcDish(); ctx.restore(); }
  }


  /* ===================== ② 도구와 하는 일 / ③ 생활 속 성과 (카드 분류) ===================== */
  const TOOLS = [
    { id: 'res', label: '제한 효소', short: '제한 효소', sub: '1973 재조합 DNA', icon: '✂️', col: '#2563eb' },
    { id: 'lig', label: '연결 효소', short: '연결 효소', sub: '1973 재조합 DNA', icon: '🔧', col: '#7c3aed' },
    { id: 'vec', label: '벡터 (플라스미드)', short: '벡터', sub: '1973 재조합 DNA', icon: '🚚', col: '#0d9488' },
    { id: 'pcr', label: 'PCR', short: 'PCR', sub: '1983~85', icon: '🔁', col: '#ea580c' },
    { id: 'seq', label: '염기 서열 분석', short: '서열 분석', sub: '1977 (유전체 사업의 바탕)', icon: '🔤', col: '#db2777' },
  ];
  const TOOL_BOX = { res: 'DNA를 특정 서열에서 자른다', lig: '잘린 조각을 이어 붙인다', vec: '유전자를 세포 안으로 운반한다', pcr: '원하는 DNA를 많이 늘린다 (증폭)', seq: 'DNA의 염기 순서를 읽는다' };
  const TOOL_ORDER = ['seq', 'vec', 'res', 'pcr', 'lig'];
  const LIFE = [
    { id: 'ferm', label: '발효와 선발 육종', short: '발효·육종', sub: '수천 년 전~', icon: '🍞', col: '#b45309' },
    { id: 'ins', label: '재조합 사람 인슐린', short: '재조합 인슐린', sub: '1982', icon: '💉', col: '#2563eb' },
    { id: 'pcr', label: 'PCR (DNA 증폭)', short: 'PCR', sub: '1983~85', icon: '🔁', col: '#ea580c' },
    { id: 'hgp', label: '인간 유전체 사업', short: '유전체 사업', sub: '1990~2003', icon: '🗺️', col: '#7c3aed' },
    { id: 'mrna', label: 'mRNA 백신 상용화', short: 'mRNA 백신', sub: '2020', icon: '🛡️', col: '#0d9488' },
    { id: 'peni', label: '페니실린 발견', short: '페니실린', sub: '1928', icon: '💊', col: '#db2777' },
  ];
  const LIFE_BOX = { ferm: '빵 · 김치 같은 발효 식품', ins: '당뇨병 치료제 인슐린', pcr: 'DNA 지문 (수사 · 친자 확인)', hgp: '맞춤형 암 치료 연구', mrna: '감염병 백신', peni: '세균 감염병 치료 (항생제)' };
  const LIFE_ORDER = ['mrna', 'ins', 'hgp', 'ferm', 'peni', 'pcr'];
  function pairSorter(items, boxMap, order, cardH) {
    const n = items.length;
    const boxes = order.map((id, k) => {
      if (PHONE) { const cardRows = Math.ceil(n / 2), y0 = 64 + cardRows * (cardH + 8) + 8, bh = Math.floor((VH - y0 - 8 - (n - 1) * 6) / n); return { id, label: boxMap[id], col: items.find((q) => q.id === id).col, x: 10, y: y0 + k * (bh + 6), w: VW - 20, h: bh, cols: 1, hdr: 24 }; }
      const bh = Math.floor((VH - 74 - 12 - (n - 1) * 8) / n); return { id, label: boxMap[id], col: items.find((q) => q.id === id).col, x: 316, y: 66 + k * (bh + 8), w: VW - 316 - 16, h: bh, cols: 1, hdr: 24 };
    });
    const so = selectable({
      cards: items, boxes, cw: PHONE ? 228 : 276, ch: cardH, kh: PHONE ? 26 : 36,
      tray: (i) => (PHONE ? { x: 10 + (i % 2) * 236, y: 62 + Math.floor(i / 2) * (cardH + 8) } : { x: 20, y: 66 + i * ((VH - 74 - 12 - (n - 1) * 8) / n + 8) + ((VH - 74 - 12 - (n - 1) * 8) / n - cardH) / 2 }),
      onChange() { updateCtl(); },
    });
    return so;
  }
  const toolSorter = pairSorter(TOOLS, TOOL_BOX, TOOL_ORDER, PHONE ? 52 : 58);
  const lifeSorter = pairSorter(LIFE, LIFE_BOX, LIFE_ORDER, PHONE ? 52 : 52);
  const sorterWrong = (so) => so.cards.filter((c) => c.zone && c.zone !== c.id);
  const sorterDone = (so) => so.cards.length === so.cards.filter((c) => c.zone === c.id).length;
  const toolPT = sorterPT(() => toolSorter), lifePT = sorterPT(() => lifeSorter);
  function pairDraw(so, dt, title, hint) {
    so.update(dt);
    TF(VW / 2, 28, title, VW - 24, PHONE ? 14 : 16, 11.5, INK, 'center', 800);
    so.draw();
    if (so.selected) T(VW / 2, VH - 8, '카드를 골랐어요! 놓을 상자를 눌러요', 13, '#b45309', 'center', 800);
  }
  const toolDraw = (dt) => pairDraw(toolSorter, dt, '도구 카드를 "하는 일" 상자에 넣어요');
  const lifeDraw = (dt) => pairDraw(lifeSorter, dt, '사건 카드를 우리 생활에 준 성과 상자에 넣어요');

  /* ===================== ③ 유전체 해독 비용 그래프 ===================== */
  const COST = [
    { y: 2001, v: 1e8, lab: '약 1억 달러' },
    { y: 2008, v: 1e7, lab: '약 1000만 달러' },
    { y: 2015, v: 4000, lab: '약 4000 달러' },
    { y: 2022, v: 600, lab: '약 600 달러' },
  ];
  const CSG = PHONE ? { px: 66, py: 62, pw: 396, ph: 360 } : { px: 112, py: 62, pw: 650, ph: 372 };
  const CS = { shown: {}, last: null, sel: null, scale: 'log', solved: false, br: 0, n: {} };
  const csNorm = (v, sc) => (sc === 'log' ? clamp((Math.log10(v) - 2) / 6, 0, 1) : clamp(v / 1e8, 0, 1));
  const csX = (y) => CSG.px + (y - 2000) / 24 * CSG.pw;
  const csY = (n) => CSG.py + CSG.ph - n * CSG.ph;
  function csReset() { CS.shown = {}; CS.last = null; CS.sel = null; CS.scale = 'log'; CS.solved = false; CS.br = 0; CS.n = {}; $('#csRatio').value = ''; $('#csRatio').classList.remove('ok'); updateCtl(); }
  function csPick(y) {
    y = +y; CS.sel = y;
    if (!CS.shown[y]) {
      CS.shown[y] = true; Sound.tick();
      const prev = COST.filter((c) => CS.shown[c.y] && c.y !== y).map((c) => c.y).sort((a, b) => a - b);
      const from = CS.n[prev.length ? prev[prev.length - 1] : y];
      CS.n[y] = from != null ? from : 1.02;
      const c = COST.find((q) => q.y === y); if (RM) CS.n[y] = csNorm(c.v, CS.scale);
    }
    updateCtl();
  }
  const csAll = () => COST.every((c) => CS.shown[c.y]);
  const csRatioVal = () => parseBig($('#csRatio').value);
  const csRatioOK = () => { const v = csRatioVal(); return isFinite(v) && v >= 1.5e5 && v <= 1.8e5; };
  function csDraw(dt, t) {
    const g = CSG;
    TF(VW / 2, 28, '한 사람분 유전체 해독 비용 (달러, 근사 예시)', VW - 24, PHONE ? 14 : 16, 11.5, INK, 'center', 800);
    panel(g.px - (PHONE ? 54 : 100), g.py - 24, g.pw + (PHONE ? 66 : 120), g.ph + 78, 14, '#fff');
    /* 눈금 */
    const ticks = CS.scale === 'log' ? [[2, '100'], [3, '1000'], [4, '1만'], [5, '10만'], [6, '100만'], [7, '1000만'], [8, '1억']] : [[0, '0'], [0.25, '2500만'], [0.5, '5000만'], [0.75, '7500만'], [1, '1억']];
    ticks.forEach(([v, lab]) => {
      const n = CS.scale === 'log' ? (v - 2) / 6 : v, y = csY(n);
      ctx.strokeStyle = n === 0 ? '#94a3b8' : '#e2e8f0'; ctx.lineWidth = n === 0 ? 1.6 : 1; ctx.beginPath(); ctx.moveTo(g.px, y); ctx.lineTo(g.px + g.pw, y); ctx.stroke();
      T(g.px - 8, y + 4.5, lab, PHONE ? 12 : 13, '#64748b', 'right', 700);
    });
    for (let yr = 2000; yr <= 2024; yr += 4) { const x = csX(yr); ctx.strokeStyle = '#eef2f7'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, g.py); ctx.lineTo(x, g.py + g.ph); ctx.stroke(); T(x, g.py + g.ph + 20, String(yr), PHONE ? 12 : 13, '#64748b', 'center', 700); }
    T(g.px - (PHONE ? 52 : 98), g.py - 8, '비용(달러)', 12.5, '#64748b', 'left', 800);
    T(g.px + g.pw, g.py + g.ph + 40, '연도', 12.5, '#64748b', 'right', 800);
    T(g.px + g.pw / 2, g.py + g.ph + 40, CS.scale === 'log' ? '세로축: 로그 눈금 (한 칸마다 10배)' : '세로축: 보통 눈금 (한 칸마다 같은 간격)', 12.5, '#64748b', 'center', 800);
    /* 점 이동 + 선 */
    COST.forEach((c) => { if (CS.shown[c.y]) { const tg = csNorm(c.v, CS.scale); CS.n[c.y] = RM ? tg : approach(CS.n[c.y], tg, dt, 4.5); } });
    const pts = COST.filter((c) => CS.shown[c.y]);
    if (pts.length > 1) {
      ctx.save(); ctx.beginPath(); ctx.rect(g.px, g.py - 6, g.pw, g.ph + 12); ctx.clip();
      ctx.strokeStyle = '#7c3aed'; ctx.lineWidth = 3.4; ctx.lineJoin = 'round'; ctx.beginPath(); pts.forEach((c, i) => (i ? ctx.lineTo(csX(c.y), csY(clamp(CS.n[c.y], 0, 1))) : ctx.moveTo(csX(c.y), csY(clamp(CS.n[c.y], 0, 1))))); ctx.stroke(); ctx.restore();
    }
    pts.forEach((c) => {
      const x = csX(c.y), y = csY(clamp(CS.n[c.y], 0, 1)), sel = CS.sel === c.y;
      if (sel) D.glow(x, y, 26, '#7c3aed', 0.35);
      D.sphere(x, y, sel ? 9 : 7, '#7c3aed', { shadow: true });
      const lab = c.y + '년 ' + c.lab, last = c.y === 2022;
      if (last) D.label(x - 10, y + 24, lab, { bg: '#fff', color: '#4c1d95', border: '#c4b5fd', size: PHONE ? 12 : 13.5, align: 'right' });
      else D.label(x + 12, y + (c.y === 2001 ? 26 : 0), lab, { bg: '#fff', color: '#4c1d95', border: '#c4b5fd', size: PHONE ? 12 : 13.5, align: 'left' });
    });
    if (!pts.length) TF(g.px + g.pw / 2, g.py + g.ph / 2, '오른쪽 아래에서 해를 눌러 값을 읽어요', g.pw - 30, 16, 12, '#94a3b8', 'center', 800);
    /* 감소 배율 화살표 */
    CS.br = RM ? (CS.solved ? 1 : 0) : approach(CS.br, CS.solved ? 1 : 0, dt, 4);
    if (CS.br > 0.02 && CS.shown[2001] && CS.shown[2022]) {
      const y1 = csY(clamp(CS.n[2001], 0, 1)), y2 = csY(clamp(CS.n[2022], 0, 1)), xr = g.px + g.pw - 22;
      ctx.save(); ctx.globalAlpha = CS.br;
      D.dashedLine(csX(2001), y1, xr, y1, { color: '#dc2626', width: 1.6, dash: [4, 4] }); D.dashedLine(csX(2022), y2, xr, y2, { color: '#dc2626', width: 1.6, dash: [4, 4] });
      D.arrow(xr, y1 + 2, xr, y2 - 2, { color: '#dc2626', width: 3 });
      D.label(xr - 12, (y1 + y2) / 2, '약 17만 배 감소', { bg: '#fff', color: '#b91c1c', border: '#fca5a5', size: PHONE ? 13 : 15, align: 'right' });
      ctx.restore();
    }
  }


  /* ===================== ④ 발표 자료 구성 ===================== */
  const PR = { sel: [], medium: null, src: '', focus: null, anim: {} };
  const MED = { conti: '영상 콘티', info: '인포그래픽', news: '카드뉴스' };
  const SRC = [['textbook', '교과서'], ['paper', '학술 논문'], ['gov', '공공기관 자료'], ['news', '신문 기사']];
  const prG = () => {
    const cols = PHONE ? 3 : 5, cw = 148, ch = PHONE ? 32 : 38, gap = 8;
    return { cols, cw, ch, gap, pitch: ch + (PHONE ? 6 : 8), x0: (VW - (cols * cw + (cols - 1) * gap)) / 2, y0: PHONE ? 42 : 44 };
  };
  const prChip = (i) => { const g = prG(); return { x: g.x0 + (i % g.cols) * (g.cw + g.gap), y: g.y0 + Math.floor(i / g.cols) * g.pitch, w: g.cw, h: g.ch }; };
  const prBodyY = () => { const g = prG(), rows = Math.ceil(15 / g.cols); return g.y0 + rows * g.pitch + 6; };
  function prReset() { PR.sel = []; PR.medium = null; PR.src = ''; PR.focus = null; PR.anim = {}; $('#prSrc').value = ''; updateCtl(); }
  function prToggle(id) {
    const k = PR.sel.indexOf(id);
    if (k >= 0) { PR.sel.splice(k, 1); if (PR.focus === id) PR.focus = PR.sel[PR.sel.length - 1] || null; Sound.click(); }
    else { if (PR.sel.length >= 5) { showHint('사건은 최대 5개까지 고를 수 있어요. 하나를 눌러 빼고 다시 골라요.'); Sound.fail(); return; } PR.sel.push(id); PR.focus = id; PR.anim[id] = 0; Sound.tick(); }
    updateCtl();
  }
  const prPT = {
    down(p) { for (let i = 0; i < 15; i++) if (inRect(p.x, p.y, prChip(i))) { prToggle(EV[i].id); return false; } prFocusAt(p); return false; },
    hover(p) { for (let i = 0; i < 15; i++) if (inRect(p.x, p.y, prChip(i))) return 'pointer'; return 'default'; },
  };
  let prHit = [];
  function prFocusAt(p) { const h = prHit.find((r) => inRect(p.x, p.y, r)); if (h) { PR.focus = h.id; Sound.tick(); } }
  function prCheck() {
    const n = PR.sel.length, idx = PR.sel.map((id) => EVI[id]);
    const chrono = n >= 2 && idx.every((v, k) => k === 0 || v > idx[k - 1]);
    let link = null;
    for (let a = 0; a < n && !link; a++) for (let b = a + 1; b < n && !link; b++) { const q = basisOf(PR.sel[a], PR.sel[b]); if (q) link = q; }
    return {
      count: n >= 3 && n <= 5, order: chrono, link, life: PR.sel.some((id) => EV[EVI[id]].life), src: !!PR.src, med: !!PR.medium,
      all() { return this.count && this.order && !!this.link && this.life && this.src && this.med; },
    };
  }
  function prDraw(dt, t) {
    const g = prG(), by = prBodyY();
    /* 연표 카드 선택줄 */
    EV.forEach((e, i) => {
      const r = prChip(i), k = PR.sel.indexOf(e.id), on = k >= 0;
      PR.anim[e.id] = approach(PR.anim[e.id] == null ? (on ? 1 : 0) : PR.anim[e.id], on ? 1 : 0, dt, 12);
      const a = PR.anim[e.id];
      flatCard(r.x, r.y, r.w, r.h, 10, on ? C.mix('#ffffff', ERA[e.era].col, 0.14 * a) : '#fff', 0);
      ctx.strokeStyle = on ? ERA[e.era].col : '#cbd5e1'; ctx.lineWidth = on ? 2.6 : 1.6; D.roundRect(r.x, r.y, r.w, r.h, 10); ctx.stroke();
      E(e.icon, r.x + 16, r.y + r.h / 2 + 1, PHONE ? 16 : 19);
      TF(r.x + 32, r.y + r.h / 2 - (PHONE ? 2 : 4), e.year, r.w - 62, 11.5, 9.5, '#64748b', 'left', 800);
      TF(r.x + 32, r.y + r.h / 2 + (PHONE ? 11 : 13), e.short, r.w - 38, 13, 10.5, INK, 'left', 800);
      if (on) { ctx.fillStyle = ERA[e.era].col; ctx.beginPath(); ctx.arc(r.x + r.w - 14, r.y + 14, 10, 0, TAU); ctx.fill(); T(r.x + r.w - 14, r.y + 19, String(k + 1), 13, '#fff', 'center', 800); }
    });
    /* 자료 본문 */
    const tableH = PHONE ? 124 : 106, tY = VH - tableH - 6, bubY = tY - 50;
    const area = { x: 12, y: by, w: VW - 24, h: bubY - 6 - by };
    const n = PR.sel.length, evs = PR.sel.map((id) => EV[EVI[id]]);
    prHit = [];
    D.roundRect(area.x, area.y, area.w, area.h, 14); ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fill(); ctx.strokeStyle = '#d5deea'; ctx.lineWidth = 1.6; ctx.setLineDash([7, 5]); ctx.stroke(); ctx.setLineDash([]);
    if (!n || !PR.medium) {
      TF(area.x + area.w / 2, area.y + area.h / 2 - 8, !n ? '위의 연표 카드를 3~5장 눌러 발표 자료에 넣어요' : '자료 종류(영상 콘티 · 인포그래픽 · 카드뉴스)를 골라요', area.w - 30, 16, 12, '#94a3b8', 'center', 800);
      if (n && !PR.medium) TF(area.x + area.w / 2, area.y + area.h / 2 + 16, '고른 사건 ' + n + '개: ' + evs.map((e) => e.year).join(' → '), area.w - 30, 13.5, 10.5, '#94a3b8', 'center', 700);
    } else if (PR.medium === 'conti') {
      const perRow = PHONE ? 3 : n, rows = Math.ceil(n / perRow), gp = 8;
      const pw = (area.w - 16 - (perRow - 1) * gp) / perRow, ph = (area.h - 16 - (rows - 1) * gp) / rows;
      evs.forEach((e, k) => {
        const x = area.x + 8 + (k % perRow) * (pw + gp), y = area.y + 8 + Math.floor(k / perRow) * (ph + gp);
        const foc = PR.focus === e.id; prHit.push({ x, y, w: pw, h: ph, id: e.id });
        D.shadow(() => { D.roundRect(x, y, pw, ph, 10); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: 5, y: 2 });
        ctx.strokeStyle = foc ? '#f59e0b' : ERA[e.era].col; ctx.lineWidth = foc ? 3 : 1.8; D.roundRect(x, y, pw, ph, 10); ctx.stroke();
        D.label(x + 28, y + 14, '컷 ' + (k + 1), { bg: ERA[e.era].col, size: 12, pad: 7 });
        E(e.icon, x + pw / 2, y + ph * 0.36, clamp(ph * 0.28, 22, 40));
        TF(x + pw / 2, y + ph * 0.36 + clamp(ph * 0.28, 22, 40) * 0.8, e.year, pw - 10, 13.5, 10, INK, 'center', 800);
        const ls = wrap('"' + e.lifeTxt + '"', pw - 14, 11.5, 700).slice(0, 3);
        ls.forEach((l, i) => T(x + pw / 2, y + ph - 10 - (ls.length - 1 - i) * 14, l, 11.5, '#475569', 'center', 700));
      });
    } else if (PR.medium === 'info') {
      const rh = Math.min(48, (area.h - 12) / n), lx = area.x + 34;
      ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(lx, area.y + 10 + rh / 2 - 8); ctx.lineTo(lx, area.y + 10 + (n - 1) * rh + rh / 2 + 8); ctx.stroke();
      evs.forEach((e, k) => {
        const y = area.y + 10 + k * rh + rh / 2, foc = PR.focus === e.id;
        prHit.push({ x: area.x + 6, y: y - rh / 2, w: area.w - 12, h: rh, id: e.id });
        if (foc) { D.roundRect(area.x + 8, y - rh / 2 + 2, area.w - 16, rh - 4, 8); ctx.fillStyle = 'rgba(250,204,21,.16)'; ctx.fill(); }
        D.sphere(lx, y, 11, ERA[e.era].col, { shadow: true });
        E(e.icon, lx + 36, y, 22);
        T(lx + 58, y - 3, e.year + '  ' + e.label, PHONE ? 13 : 14.5, INK, 'left', 800);
        TF(lx + 58, y + 15, e.tech, area.w - 110, PHONE ? 11 : 12, 8.5, '#64748b', 'left', 700);
      });
    } else {
      const cw = Math.min(PHONE ? 220 : 280, area.w * 0.5), step = n > 1 ? (area.w - 16 - cw) / (n - 1) : 0, ch = area.h - 18;
      const order = evs.map((e, k) => ({ e, k })).sort((a, b) => (a.e.id === PR.focus ? 1 : 0) - (b.e.id === PR.focus ? 1 : 0));
      const hits = [];
      order.forEach(({ e, k }) => {
        const x = area.x + 8 + k * step, y = area.y + 9, foc = PR.focus === e.id;
        hits.unshift({ x, y, w: Math.min(cw, step || cw), h: ch, id: e.id });
        D.shadow(() => { D.roundRect(x, y, cw, ch, 12); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: foc ? 10 : 5, y: 3 });
        ctx.strokeStyle = foc ? '#f59e0b' : ERA[e.era].col; ctx.lineWidth = foc ? 3 : 2; D.roundRect(x, y, cw, ch, 12); ctx.stroke();
        ctx.save(); D.roundRect(x, y, cw, ch, 12); ctx.clip(); ctx.fillStyle = ERA[e.era].col; ctx.fillRect(x, y, cw, 8); ctx.restore();
        T(x + 12, y + 32, e.year, 15, INK, 'left', 800); E(e.icon, x + cw - 24, y + 28, 24);
        const ls = wrap(e.label, cw - 26, 13, 800).slice(0, 2); ls.forEach((l, i) => T(x + 12, y + 54 + i * 16, l, 13, '#3b4a63', 'left', 800));
        if (foc) wrap(e.lifeTxt, cw - 26, 12, 700).slice(0, 3).forEach((l, i) => T(x + 12, y + 96 + i * 15, l, 12, '#64748b', 'left', 700));
      });
      prHit = hits;
    }
    /* 설명 줄: 앞 사건이 뒤 사건의 바탕 */
    const ck = prCheck();
    if (ck.link) {
      const a = EV[EVI[ck.link[0]]], b = EV[EVI[ck.link[1]]];
      bubble(12, bubY, VW - 24, '🔗 ' + a.year + ' ' + a.label + ' → ' + b.year + ' ' + b.label + ': ' + ck.link[2], { size: 12, fill: '#f0fdf4', line: '#86efac' });
    }
    /* 초점 사건 표 */
    const foc = PR.focus ? EV[EVI[PR.focus]] : null, ty = tY, th = tableH;
    if (foc && th > 40) {
      D.roundRect(12, ty, VW - 24, th, 12); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#d5deea'; ctx.lineWidth = 1.6; ctx.stroke();
      const f = [['연도', foc.year], ['사건', foc.label], ['기술', foc.tech], ['우리 생활의 성과', foc.lifeTxt], ['남은 과제', foc.todo]];
      if (PHONE) {
        f.forEach(([k, v], i) => { const yy = ty + 16 + i * ((th - 14) / 5); T(22, yy, k, 11.5, '#16a34a', 'left', 800); TF(110, yy, v, VW - 130, 12, 8.5, INK, 'left', 700); });
      } else {
        const cw = (VW - 24 - 10) / 5;
        f.forEach(([k, v], i) => {
          const x = 12 + 5 + i * cw;
          if (i) { ctx.strokeStyle = '#e2e8f0'; ctx.beginPath(); ctx.moveTo(x - 2, ty + 8); ctx.lineTo(x - 2, ty + th - 8); ctx.stroke(); }
          T(x + 6, ty + 20, k, 12.5, '#16a34a', 'left', 800);
          wrap(v, cw - 14, 12.5, 700).slice(0, 4).forEach((l, j) => T(x + 6, ty + 38 + j * 15, l, 12.5, INK, 'left', 700));
        });
      }
    } else if (th > 40) TF(VW / 2, ty + th / 2 + 4, n ? '자료의 사건을 눌러 "연도 – 사건 – 기술 – 생활 성과 – 남은 과제"를 확인해요' : '고른 사건의 "연도 – 사건 – 기술 – 생활 성과 – 남은 과제"가 여기에 나타나요', VW - 40, 13.5, 10.5, '#94a3b8', 'center', 700);
  }


  /* =========================================================
     화면 전환 · 조작 연결
     ========================================================= */
  const PTS = { tl: tlPT, tools: toolPT, life: lifePT, pres: prPT };
  function setMode(m) {
    if (S.mode !== m) S.fade = 1;
    S.mode = m; PT = PTS[m] || null; hideHint(); updateCtl();
  }
  const ctlNodes = $$('#ctrlCard .control');
  fillSel($('#prSrc'), SRC, '출처를 골라요');
  function updateCtl() {
    const fr = game ? game.free : false, lvNow = game ? game.level : 0;
    ctlNodes.forEach((n) => { n.hidden = (n.dataset.modes || '').split(' ').indexOf(S.mode) < 0; });
    modeButtons(S.mode, lvNow, fr);
    /* 재조합 */
    $$('#rcEnz button').forEach((b) => { b.classList.toggle('on', RC.enz === b.dataset.v); b.disabled = RC.stage > 0; });
    const nx = $('#rcNext');
    nx.textContent = RC.fail ? '⚠ 이 가위로는 안 돼요 (↺ 처음부터)' : RC_BTN[RC.stage]; nx.disabled = !!RC.fail || RC.stage >= 5;
    $('#rcNote').innerHTML = !RC.enz ? '두 DNA에 표시된 <b>알아보는 서열</b>을 살펴보고, 사람 DNA와 플라스미드를 <b>모두</b> 알맞게 자르는 가위를 골라요.' : RC.fail ? '<b>' + ENZ[RC.enz].n + '</b>: ' + RC.fail : RC.stage === 0 ? '<b>' + ENZ[RC.enz].n + '</b>은(는) <b>' + ENZ[RC.enz].cut + '</b> 자리를 잘라요. 단계 버튼을 차례로 눌러요.' : RC.stage < 5 ? '단계 버튼을 눌러 다음으로 가요.' : '항생제에 살아남은 대장균이 인슐린을 만들어요!';
    /* 연표 */
    /* 해독 비용 */
    $$('#csYear button').forEach((b) => { b.classList.toggle('on', CS.sel === +b.dataset.v); b.classList.toggle('seen', !!CS.shown[+b.dataset.v]); });
    $$('#csScale button').forEach((b) => b.classList.toggle('on', CS.scale === b.dataset.v));
    $('#csCalc').hidden = !csAll();
    /* 발표 */
    $$('#prMed button').forEach((b) => b.classList.toggle('on', PR.medium === b.dataset.v));
    const ck = prCheck();
    const items = [[ck.count, '사건 3~5개 고르기 (' + PR.sel.length + '개)'], [ck.order, '시간 순서대로 고르기'], [!!ck.link, '앞 사건이 뒤 사건의 바탕임을 보이기'], [ck.life, '생활 사례가 있는 사건 넣기'], [ck.med, '자료 종류 정하기'], [ck.src, '출처 표시하기']];
    $('#prList').innerHTML = items.map((q) => '<li class="' + (q[0] ? 'on' : '') + '">' + (q[0] ? '✅' : '⬜') + ' ' + q[1] + '</li>').join('');
  }
  bindModes(setMode);
  $$('#rcEnz button').forEach((b) => b.addEventListener('click', () => rcPick(b.dataset.v)));
  $('#rcNext').addEventListener('click', rcNext);
  $('#rcReset').addEventListener('click', () => { Sound.click(); rcReset(); });
  $('#tlShuffle').addEventListener('click', () => { Sound.click(); tlInit(); });
  $('#toolReset').addEventListener('click', () => { Sound.click(); toolSorter.reset(); });
  $('#lifeReset').addEventListener('click', () => { Sound.click(); lifeSorter.reset(); });
  $$('#csYear button').forEach((b) => b.addEventListener('click', () => csPick(b.dataset.v)));
  $$('#csScale button').forEach((b) => b.addEventListener('click', () => { Sound.click(); CS.scale = b.dataset.v; updateCtl(); }));
  $('#csRatio').addEventListener('input', () => { const ok = csRatioOK(); $('#csRatio').classList.toggle('ok', ok); CS.solved = ok && csAll(); updateCtl(); });
  $$('#prMed button').forEach((b) => b.addEventListener('click', () => { Sound.click(); PR.medium = b.dataset.v; updateCtl(); }));
  $('#prSrc').addEventListener('change', (e) => { PR.src = e.target.value; Sound.click(); updateCtl(); });
  $('#prReset').addEventListener('click', () => { Sound.click(); prReset(); });

  /* =========================================================
     미션
     ========================================================= */
  const levels = [
    {
      title: '연표로 보는 생명공학', short: '연표', icon: '📅', phase: '관찰',
      intro: '<p class="si-q">❓ 탐구 질문: 인류는 언제부터 생명을 이용해 왔고, 어떤 사건들이 오늘의 생명공학을 만들었을까?</p><p>🔗 <b>통합과학</b>에서 PCR로 병원체의 핵산을 검출하는 원리를, 앞 단원에서 DNA 구조 · 복제 · 유전 부호를 배웠어요. 이 지식들이 생명공학의 주요 사건들의 바탕이에요.</p><p><b>연표 카드 15장</b>을 시간순으로 놓아 보고, 사건들이 <b>3구간</b>으로 나뉘는 것을 확인해요. (연도는 대략적인 값이에요)</p>',
      features: ['tl'],
      setup() { tlInit(); setMode('tl'); },
      recap: '생명공학은 발효 · 육종 같은 전통 생명공학에서 출발해, 재조합 DNA(1973) 이후 유전 정보를 직접 바꾸는 기술로 발전했고, 2000년대부터는 유전체 · 세포 · 편집의 시대가 되었어요.',
      summary: '<ul><li>연표 15장은 <b>전통 생명공학</b>(발효 · 육종, 페니실린, DNA 이중 나선: 3장) → <b>유전자 재조합 시대</b>(1970년대~, 8장) → <b>유전체 · 세포 · 편집 시대</b>(2000년대~, 4장)의 3구간으로 나뉘어요.</li><li><b>전통 생명공학</b>은 미생물이 원래 가진 성질을 이용해요. <b>재조합 DNA(1973)</b>부터는 필요한 <b>유전자를 직접 도입</b>해 유전 정보를 바꿔요.</li><li>연도가 구간인 사건은 끝난 해를 기준으로 줄을 세웠어요 (인간 유전체 사업 1990~2003).</li></ul>',
      missions: [
        {
          id: 'tl', title: '연표 카드를 시간순으로', manual: true,
          goal: '카드 15장을 <b>오래된 일부터</b> 왼쪽 위에서 오른쪽 아래로 차례로 놓으세요.',
          hint: '"수천 년 전~"이 맨 처음이에요. 1983~85(PCR) 다음은 1994, 1996, 1998이고, 인간 유전체 사업(1990~2003)은 끝난 해 2003 기준이라 1998 다음이에요.',
          setup() { tlInit(); setMode('tl'); },
          check() {
            const n = tlCorrect();
            if (n === 15) return true;
            return '아직 ' + (15 - n) + '장이 제자리가 아니에요. (제자리 ' + n + ' / 15) 초록 ✓가 없는 카드의 연도를 비교해 보세요.';
          },
          explain: '시간순으로 놓으면 <b>전통 생명공학</b>(3장) → <b>유전자 재조합 시대</b>(8장) → <b>유전체 · 세포 · 편집 시대</b>(4장)로 나뉘어요. 전통 생명공학은 생물의 성질을 그대로 이용하고, 재조합 DNA(1973) 이후에는 유전 정보를 직접 바꿔요.',
        },
        {
          type: 'quiz', title: '발효와 재조합 인슐린의 차이',
          goal: '김치 · 치즈의 <b>발효</b>와 <b>재조합 사람 인슐린 생산</b>의 가장 큰 차이는?',
          setup() { setMode('tl'); },
          choices: ['둘 다 사람이 유전자를 직접 골라 미생물에 넣는 기술이다', '발효는 미생물이 원래 가진 성질을 이용하고, 재조합 인슐린은 사람 인슐린 유전자를 미생물에 직접 넣어 만든다', '발효는 DNA와 관계가 없고, 재조합 인슐린만 DNA와 관계가 있다', '발효는 대장균을 쓰고, 재조합 인슐린은 효모만 쓴다'],
          answer: 1,
          feedback: ['발효는 유전자를 넣지 않아요. 미생물이 원래 가진 대사 능력을 이용할 뿐이에요.', '', '발효 미생물도 DNA와 효소로 작용해요. 차이는 사람이 유전 정보를 직접 바꿔 넣느냐예요.', '재조합 사람 인슐린(1982)은 대장균에 유전자를 넣어 만들었어요.'],
          explain: '<b>전통 생명공학</b>(발효 · 육종)은 생물이 가진 성질을 이용하거나 좋은 형질을 고르는 것이고, <b>유전자 재조합</b>은 필요한 유전자를 직접 도입해 생물의 유전 정보를 바꾸는 것이에요.',
        },
      ],
    },
    {
      title: '핵심 기술: 재조합 DNA', short: '핵심 기술', icon: '🧬', phase: '탐구',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 재조합 DNA(1973)부터 유전 정보를 직접 바꾸게 되었다는 것을 연표에서 확인했어요.</div><p>이번에는 <b>모형</b>으로 사람 <b>인슐린 유전자</b>를 대장균에 넣어 인슐린을 만들어 봐요. 도구는 DNA를 자르는 <b>제한 효소(가위)</b>, 조각을 잇는 <b>연결 효소(풀)</b>, 유전자를 나르는 <b>플라스미드(벡터)</b>예요. 앞 단원의 <b>유전 부호의 보편성</b> 덕분에 사람의 유전자도 대장균 안에서 읽혀 인슐린이 만들어져요.</p>',
      features: ['recomb', 'tools'],
      setup() { rcReset(); setMode('recomb'); },
      recap: '제한 효소로 사람 DNA의 유전자 조각과 플라스미드를 같은 자리에서 잘라 접착 말단을 만들고, 연결 효소로 이어 대장균에 넣으면, 항생제 저항 유전자로 골라낸 대장균이 인슐린을 만들어요.',
      summary: '<ul><li><b>제한 효소</b>(예: EcoRI, G^AATTC)는 특정 서열을 알아보고 잘라 <b>접착 말단</b>(AATT)을 만들어요. 같은 효소로 자른 조각은 끝이 상보적이라 붙어요.</li><li><b>연결 효소</b>가 뼈대의 틈을 이어 <b>재조합 DNA</b>가 돼요. <b>플라스미드(벡터)</b>에 넣어 대장균에 도입(형질 전환)해요.</li><li><b>항생제 저항 유전자</b>가 있는 대장균만 항생제 배지에서 살아남아 <b>인슐린을 생산</b>해요. 사람 DNA 전체를 섞는 것이 아니라 <b>필요한 조각</b>만 벡터에 넣어요.</li><li>도구: 제한 효소(자르기) · 연결 효소(잇기) · 벡터(운반) · PCR(늘리기) · 염기 서열 분석(읽기).</li></ul>',
      missions: [
        {
          id: 'recomb', title: '재조합 DNA 만들어 인슐린 얻기',
          goal: '알맞은 <b>제한 효소</b>를 골라 ①~⑤ 단계를 진행해 대장균이 <b>인슐린을 만들게</b> 하세요.',
          hint: '사람 DNA의 유전자 양쪽과 플라스미드에 모두 GAATTC가 있어요. 그 서열을 알아보는 EcoRI을 골라 단계를 하나씩 눌러요.',
          setup() { rcReset(); setMode('recomb'); },
          check: () => rcDone(), hold: 0.6,
          status: () => mark(RC.enz === 'eco') + ' 알맞은 가위(EcoRI) &nbsp; ' + mark(RC.stage >= 4) + ' 형질 전환 &nbsp; ' + mark(RC.insulin >= 20) + ' 인슐린 ' + RC.insulin + ' / 20',
          explain: 'EcoRI(G^AATTC)는 사람 DNA의 유전자 양쪽과 플라스미드를 모두 잘라 <b>같은 모양의 접착 말단(AATT)</b>을 만들어요. 연결 효소로 이은 재조합 플라스미드가 대장균에 들어가고, <b>항생제 저항 유전자</b> 덕분에 이를 가진 대장균만 살아남아 인슐린을 만들어요.',
        },
        {
          id: 'tools', title: '도구와 하는 일 연결', manual: true,
          goal: '도구 카드 5장을 알맞은 <b>하는 일</b> 상자에 넣으세요.',
          hint: '제한 효소는 "가위", 연결 효소는 "풀", 벡터는 "운반체"예요. PCR은 DNA를 늘리고, 염기 서열 분석은 순서를 읽어요.',
          setup() { toolSorter.reset(); setMode('tools'); },
          check() {
            if (toolSorter.placed < 5) { toolSorter.markBad([]); return '카드를 모두 상자에 넣어 주세요. (' + toolSorter.placed + ' / 5)'; }
            const w = sorterWrong(toolSorter);
            if (w.length) { toolSorter.markBad(w.map((c) => c.id)); return '\'' + w[0].label + '\' 카드를 다시 생각해 보세요. 이 도구가 DNA에 하는 일이 무엇일까요?'; }
            toolSorter.markBad([]); return true;
          },
          explain: '<b>제한 효소</b>는 자르고, <b>연결 효소</b>는 잇고, <b>벡터</b>는 유전자를 세포로 나르고, <b>PCR</b>은 DNA를 늘리고, <b>염기 서열 분석</b>은 순서를 읽어요. 이 도구들이 함께 쓰여 재조합 DNA, 유전체 해독 같은 사건이 가능했어요.',
        },
        {
          type: 'quiz', title: '같은 모양의 끝이 필요한 까닭',
          goal: '유전자 조각과 플라스미드를 <b>같은 제한 효소</b>로 자르는 까닭은?',
          setup() { setMode('recomb'); },
          choices: ['사람 DNA 전체를 대장균 DNA 전체에 섞기 위해서다', '잘린 끝이 서로 상보적인 모양이어야 염기쌍으로 붙고 연결 효소가 이을 수 있기 때문이다', '같은 효소로 자르면 DNA가 저절로 복제되기 때문이다', '항생제 저항 유전자를 새로 만들기 위해서다'],
          answer: 1,
          feedback: ['재조합 DNA는 사람 DNA 전체를 섞는 것이 아니라 필요한 조각 하나를 벡터에 넣는 거예요.', '', '복제와는 관계없어요. 효소는 자르는 일만 해요.', '저항 유전자는 플라스미드가 원래 가지고 있어요. 잘못 잘리지 않게 주의할 뿐이에요.'],
          explain: '같은 제한 효소로 자르면 끝의 접착 말단(예: AATT)이 상보적이라 A-T, G-C 염기쌍으로 붙어요. 그 뒤 연결 효소가 뼈대의 틈을 이어 줘요. 필요한 <b>유전자 조각을 벡터에 넣는 것</b>이지, 사람 DNA를 대장균 DNA에 통째로 섞는 것이 아니에요.',
        },
      ],
    },
    {
      title: '생활 속 성과', short: '생활 속 성과', icon: '📉', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 염기 서열 분석(1977)과 PCR(1983~85) 같은 도구를 만났어요.</div><p>이 도구들이 쌓여 <b>인간 유전체 사업(1990~2003)</b>이 사람 DNA <b>약 31억 염기쌍</b>을 읽어 냈어요. 지금은 한 사람의 유전체를 읽는 <b>비용이 크게 줄었어요</b> (근사 예시). 그래프를 읽고 몇 배나 줄었는지 계산해 보고, 사건이 <b>우리 생활</b>에 준 성과와 연결해 봐요.</p>',
      features: ['cost', 'life'],
      setup() { csReset(); setMode('cost'); },
      recap: '한 사람분 유전체 해독 비용은 2001년 약 1억 달러에서 2022년 약 600달러로 약 17만 배 줄었고, 생명공학 사건들은 인슐린, DNA 지문, 맞춤형 암 치료, 백신, 발효 식품 같은 생활 속 성과로 이어졌어요.',
      summary: '<ul><li>유전체 해독 비용(근사 예시): 2001년 약 1억 달러 → 2008년 약 1000만 달러 → 2015년 약 4000달러 → 2022년 약 600달러. 1억 / 600 ≈ 1.7 × 10⁵, 즉 <b>약 17만 배</b> 감소.</li><li>값이 아주 많이 달라질 때는 <b>로그 눈금</b>(한 칸마다 10배)을 쓰면 한 그래프에 나타낼 수 있어요.</li><li>사건과 생활 성과: 발효 → 발효 식품, 재조합 인슐린 → 당뇨병 치료제, PCR → DNA 지문, 유전체 사업 → 맞춤형 암 치료 연구, mRNA 백신 → 감염병 백신, 페니실린 → 세균 감염병 치료.</li></ul>',
      missions: [
        {
          id: 'cost', title: '해독 비용이 몇 배로 줄었을까',
          goal: '네 해의 비용을 모두 읽고, <b>2001년 비용이 2022년 비용의 약 몇 배</b>인지 입력하세요.',
          hint: '2001년은 약 1억 달러, 2022년은 약 600달러예요. 1억을 600으로 나누면 17만에 가까워요. "17만", "170000", "1.7e5"처럼 써도 돼요.',
          setup() { csReset(); setMode('cost'); },
          check: () => csAll() && csRatioOK(), hold: 0.5,
          status: () => mark(csAll()) + ' 네 해 읽기 ' + COST.filter((c) => CS.shown[c.y]).length + ' / 4 &nbsp; ' + mark(csAll() && csRatioOK()) + ' 배율 입력',
          explain: '2001년 약 1억 달러 → 2022년 약 600달러이므로 1억 / 600 ≈ 1.7 × 10⁵, 즉 <b>약 17만 배</b> 줄었어요. 세로축이 <b>로그 눈금</b>이라서 1억 달러에서 600달러까지를 한 그림에 담을 수 있어요. 보통 눈금으로 바꾸면 2015년과 2022년 점이 바닥에 붙어 구별이 안 돼요.',
        },
        {
          id: 'life', title: '사건과 생활 성과 연결', manual: true,
          goal: '사건 카드 6장을 우리 생활에 준 <b>성과</b> 상자와 연결하세요.',
          hint: '인슐린은 당뇨병, PCR은 DNA 지문, 유전체 사업은 맞춤형 암 치료 연구, mRNA 백신은 감염병 예방과 이어져요.',
          setup() { lifeSorter.reset(); setMode('life'); },
          check() {
            if (lifeSorter.placed < 6) { lifeSorter.markBad([]); return '카드를 모두 상자에 넣어 주세요. (' + lifeSorter.placed + ' / 6)'; }
            const w = sorterWrong(lifeSorter);
            if (w.length) { lifeSorter.markBad(w.map((c) => c.id)); return '\'' + w[0].label + '\' 카드와 성과를 다시 짝지어 보세요. 이 기술로 만든 것이 우리 생활의 어디에 쓰일까요?'; }
            lifeSorter.markBad([]); return true;
          },
          explain: '<b>발효</b>는 김치 · 치즈 같은 식품으로, <b>재조합 인슐린</b>은 당뇨병 치료제로, <b>PCR</b>은 DNA 지문(수사 · 친자 확인)과 감염병 진단으로, <b>유전체 사업</b>은 맞춤형 암 치료 연구로, <b>mRNA 백신</b>은 감염병 예방으로, <b>페니실린</b>은 세균 감염병 치료로 이어졌어요.',
        },
        {
          type: 'quiz', title: '비용이 크게 줄어든 의미',
          goal: '유전체 해독 비용이 약 <b>17만 배</b> 줄어든 사실이 의료에 주는 의미로 알맞은 것은?',
          setup() { setMode('cost'); },
          choices: ['유전체 해독이 더 이상 필요하지 않게 되었다', '더 많은 환자의 유전체를 읽어 진단과 맞춤형 치료에 활용하기 쉬워졌다', '모든 유전 질환이 곧바로 치료된다', '해독 비용이 낮아질수록 결과의 정확도가 떨어진다'],
          answer: 1,
          feedback: ['오히려 해독이 널리 쓰이게 되었어요.', '', '읽는 것과 치료하는 것은 달라요. 해석과 치료법 개발이 더 필요해요.', '비용과 정확도는 같은 뜻이 아니에요. 기술이 발전하면서 비용이 줄었어요.'],
          explain: '비용이 줄면 더 많은 환자의 유전체를 읽을 수 있어 <b>진단과 맞춤형 치료</b>에 쓰기 쉬워져요. 다만 읽은 서열을 <b>해석하는 일</b>과 <b>개인정보 보호</b> 같은 과제가 남아 있어요.',
        },
      ],
    },
    {
      title: '발표 자료 만들기', short: '발표', icon: '🎬', phase: '소통',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 사건들이 서로의 바탕이 되고 우리 생활의 성과로 이어지는 것을 확인했어요.</div><p>이제 <b>발표 자료</b>를 만들어요. 사건 <b>3~5개</b>를 골라 <b>연도 – 사건 – 기술 – 우리 생활의 성과 – 남은 과제</b>로 정리하고, <b>영상 콘티 · 인포그래픽 · 카드뉴스</b> 중 하나로 구성해요. 체크리스트: 시간 순서 · 앞 사건이 뒤 사건의 바탕이 되는 연결 · 생활 사례 1개 이상 · 출처 표시.</p>',
      features: ['pres'],
      setup() { prReset(); setMode('pres'); },
      recap: '발표 자료는 사건을 시간 순서로 놓고, 앞 사건이 뒤 사건의 바탕이 된 연결과 생활 속 성과, 남은 과제를 함께 보이며, 출처를 밝혀야 믿을 수 있어요.',
      summary: '<ul><li>발표 자료의 구성: <b>연도 – 사건 – 기술 – 우리 생활의 성과 – 남은 과제</b>를 사건마다 정리해요.</li><li>매체: 영상 콘티(장면 + 한 줄 대사) · 인포그래픽 · 카드뉴스 중 내용에 알맞은 것을 골라요.</li><li>체크리스트: <b>시간 순서</b> · <b>앞 사건이 뒤 사건의 바탕</b>이 되는 연결 · <b>생활 사례</b> 1개 이상 · <b>출처 표시</b>.</li><li>예: DNA 이중 나선(1953) → 재조합 DNA(1973) → 재조합 인슐린(1982). 앞의 발견이 뒤의 기술을 가능하게 했어요.</li></ul>',
      missions: [
        {
          id: 'pres', title: '발표 자료 구성', manual: true,
          goal: '연표 카드 <b>3~5장</b>을 시간순으로 골라 자료 종류와 출처를 정하고, 체크리스트를 모두 채우세요.',
          hint: '앞 사건이 뒤 사건의 바탕이 되는 짝을 함께 넣어 보세요. 예) DNA 이중 나선 → 재조합 DNA → 재조합 인슐린. 생활 사례가 있는 사건(인슐린, PCR 등)도 넣어요.',
          setup() { prReset(); setMode('pres'); },
          check() {
            const c = prCheck();
            if (!c.count) return '사건을 3~5개 골라 주세요. (지금 ' + PR.sel.length + '개)';
            if (!c.order) return '고른 사건을 시간 순서대로 눌러 담아 주세요. 순서가 틀렸다면 눌러서 빼고 다시 골라요.';
            if (!c.link) return '앞 사건이 뒤 사건의 바탕이 되는 짝(예: DNA 이중 나선 → 재조합 DNA)이 하나 이상 있어야 해요.';
            if (!c.life) return '우리 생활의 성과로 바로 이어지는 사건(예: 재조합 인슐린, PCR, mRNA 백신)을 하나 이상 넣어 주세요.';
            if (!c.med) return '자료 종류(영상 콘티 · 인포그래픽 · 카드뉴스)를 골라 주세요.';
            if (!c.src) return '출처를 표시해 주세요. 주장에는 믿을 만한 출처가 필요해요.';
            return true;
          },
          explain: '좋은 발표 자료는 사건을 <b>시간순</b>으로 보여 주고, 앞 사건이 뒤 사건의 <b>바탕</b>이 된 연결과 <b>생활 속 성과</b>, <b>남은 과제</b>를 함께 말해요. 어디서 얻은 정보인지 <b>출처</b>를 밝혀야 다른 사람이 확인할 수 있어요.',
        },
        {
          type: 'quiz', title: '앞 사건이 바탕이 된 예',
          goal: '생명공학의 발달이 <b>앞선 사건의 도움</b>을 받아 이루어진 예로 알맞은 것은?',
          setup() { setMode('pres'); },
          choices: ['PCR(1983~85) 덕분에 DNA 이중 나선(1953)이 밝혀졌다', 'mRNA 백신(2020) 덕분에 페니실린(1928)이 발견되었다', 'DNA 구조(1953)를 알았기에 DNA를 자르고 잇는 재조합 DNA(1973)가 가능했다', '재조합 인슐린(1982) 덕분에 염기 서열 분석법(1977)이 만들어졌다'],
          answer: 2,
          feedback: ['시간 순서가 거꾸로예요. 뒤에 일어난 일은 앞선 일의 원인이 될 수 없어요.', '시간 순서가 거꾸로예요. 2020년의 일이 1928년의 일을 가능하게 할 수는 없어요.', '', '시간 순서가 거꾸로예요. 1982년의 일이 1977년의 일을 가능하게 할 수는 없어요.'],
          explain: '<b>DNA 이중 나선(1953)</b>으로 DNA의 구조를 알았기 때문에 <b>DNA를 자르고 잇는 재조합 DNA(1973)</b>가 가능했고, 이것이 <b>재조합 인슐린(1982)</b>으로 이어졌어요. 기술은 앞선 발견 위에 쌓여요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hg-biotech-history', mount: '#game', badge: '생명공학 연구가', homeHref: '../../index.html#hg',
    featureLabels: { tl: '📅 연표 정렬', recomb: '🧬 재조합 DNA', tools: '🧰 도구와 하는 일', cost: '📉 해독 비용', life: '🔗 생활 속 성과', pres: '🎬 발표 자료' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 읽음 칸 ---------- */
  function readouts() {
    const m = S.mode;
    if (m === 'tl') setReads(['제자리 카드', tlCorrect() + ' / 15', '고른 카드', TL.sel ? TL.sel.ev.year + ' ' + TL.sel.ev.label : '—', '시대 구분', TL.solved ? '3 · 8 · 4장' : '순서를 맞추면 나타나요']);
    else if (m === 'recomb') setReads(['진행 단계', RC.stage + ' / 5', '플라스미드를 받은 대장균', RC.stage >= 4 ? rcPlasmids() + ' / ' + NB + '마리' : '—', '인슐린 입자', RC.insulin + ' / ' + INS_MAX]);
    else if (m === 'tools') setReads(['넣은 카드', toolSorter.placed + ' / 5', '맞게 넣은 카드', toolSorter.cards.filter((c) => c.zone === c.id).length + '장', '고른 카드', toolSorter.selected ? toolSorter.selected.label : '—']);
    else if (m === 'cost') {
      const c = COST.find((q) => q.y === CS.sel), r = c ? COST[0].v / c.v : 0;
      setReads(['고른 해', c ? c.y + '년' : '—', '해독 비용', c ? c.lab : '—', '2001년보다', c ? (c.y === 2001 ? '기준' : '약 ' + fmtRatio(r) + ' 배 감소') : '—']);
    } else if (m === 'life') setReads(['넣은 카드', lifeSorter.placed + ' / 6', '맞게 넣은 카드', lifeSorter.cards.filter((c) => c.zone === c.id).length + '장', '고른 카드', lifeSorter.selected ? lifeSorter.selected.label : '—']);
    else { const ck = prCheck(); setReads(['고른 사건', PR.sel.length + ' / 5개', '자료 종류', PR.medium ? MED[PR.medium] : '—', '체크리스트', [ck.count, ck.order, !!ck.link, ck.life, ck.med, ck.src].filter(Boolean).length + ' / 6']); }
  }

  /* ---------- 시작 ---------- */
  tlInit();
  setMode('tl');
  let lastFree = false, lastLv = -1, lastKey = '';
  SciSim.loop((dt, t) => {
    clock = t; S.t = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (game && game.level !== lastLv) { lastLv = game.level; updateCtl(); }
    const key = RC.stage + '|' + RC.fail + '|' + Object.keys(CS.shown).length + '|' + PR.sel.length;
    if (key !== lastKey) { lastKey = key; updateCtl(); }
    view.apply(); ctx.clearRect(0, 0, VW, VH);
    bgFill('#eef4f2', '#e3ece8');
    switch (S.mode) {
      case 'tl': tlDraw(dt, t); break;
      case 'recomb': rcDraw(dt, t); break;
      case 'tools': toolDraw(dt, t); break;
      case 'cost': csDraw(dt, t); break;
      case 'life': lifeDraw(dt, t); break;
      case 'pres': prDraw(dt, t); break;
    }
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(241,246,243,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, PHONE, get game() { return game; }, levels, setMode, updateCtl, EV, TL, tlCorrect, tlInit, tlSlot, tlSwap, RC, get RCs() { return RC; }, rcPick, rcNext, rcReset, rcDone, toolSorter, lifeSorter, sorterWrong, TOOLS, LIFE,
    CS, COST, csPick, csAll, csRatioOK, PR, prToggle, prCheck, BASIS, parseBig,
  };
})();
