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
     고등학교 생물의 유전 · Ⅲ. 생명공학기술 - CRISPR 유전자 편집 (단원 61, 4차시)
     성취기준 [12유전03-02] 단일클론항체, 줄기세포, 유전자 편집 기술이 난치병 치료에 활용된 사례를 조사하고, 이러한 치료법의 전망에 대해 협력적으로 소통할 수 있다.
     ① 모형: 표적 찾기  ② 모형: 절단과 수리  ③ 적용: 치료 사례  ④ 소통: 한계와 전망
     (서열 · 유전체 크기는 교육용 모형이고, 사례는 교육용 요약이에요. 치료 권유가 아니에요)
     ========================================================= */
  const S = { mode: 'target', fade: 0, t: 0 };
  let game = null;
  const rnd = mulberry(20241210);
  const ease = SciSim.ease;
  const INK = '#26324a';
  const BCOL = { A: '#ef6a5a', T: '#4f8ef0', U: '#4f8ef0', G: '#f5a623', C: '#22b573' };
  const COMP = { A: 'T', T: 'A', G: 'C', C: 'G' };
  const sup = (n) => String(n).split('').map((d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[+d] || '⁻').join('');
  /* 큰 수/작은 수를 'a × 10ⁿ'으로 */
  function sci(v, d) { if (v === 0) return '0'; const e = Math.floor(Math.log10(Math.abs(v))), m = v / Math.pow(10, e); return Number(m.toFixed(d == null ? 2 : d)) + ' × 10' + (e < 0 ? '⁻' : '') + sup(Math.abs(e)); }

  /* ===================== ① 표적 찾기 ===================== */
  const GENOME = 'CGGGACTCGGTCTCGCATCTGACCTAGGTCAAGTATCAACGTTACTGCATCTGACCTAGGTCAAGTAGGGGGTGGGAACACTTAGTAGGCAGCTGACCTAGGTCCAGTTGGCTTGTGCGC';
  const TARGET = 'GCATCTGACCTAGGTCAAGT', GUIDE = TARGET.replace(/T/g, 'U'), P_MAX = GENOME.length - 23;
  const CANDS = [14, 46, 88];
  const tgInfo = (q) => { let m = 0; for (let i = 0; i < 20; i++) if (GENOME[q + i] === TARGET[i]) m++; const pam = GENOME.slice(q + 20, q + 23); return { q, m, pam, pamOK: pam[1] === 'G' && pam[2] === 'G', bind: m === 20 && pam[1] === 'G' && pam[2] === 'G' }; };
  const TG = { p: 6, drag: null, found: {}, bound: false, boundOnce: false, scan: null, snap: 0, msg: '' };
  const tgQ = () => clamp(Math.round(TG.p), 0, P_MAX);
  function tgReset() { TG.p = 6; TG.drag = null; TG.found = {}; TG.bound = false; TG.boundOnce = false; TG.scan = null; TG.snap = 0; TG.msg = ''; parts.clear(); tgSync(); updateCtl(); }
  function tgSync() { $('#tgPos').value = tgQ(); $('#tgOut').textContent = (tgQ() + 1) + '번째 염기'; }
  function tgSet(p) { TG.p = clamp(p, 0, P_MAX); TG.scan = null; }
  const TGG = PHONE
    ? { slot: 18.4, x0: 4, ty: 262, map: { x: 24, y: 96, w: 432 }, info: { y: 430 } }
    : { slot: 29.6, x0: 12, ty: 270, map: { x: 40, y: 102, w: 720 }, info: { y: 440 } };
  const tgX = (idx) => TGG.x0 + (idx - (TG.p - 2)) * TGG.slot;
  const TG_PT = {
    down(p) { if (p.y > TGG.map.y - 24 && p.y < TGG.map.y + 20 && p.x >= TGG.map.x - 6 && p.x <= TGG.map.x + TGG.map.w + 6) { tgSet((p.x - TGG.map.x) / TGG.map.w * GENOME.length - 11); TG.drag = { map: true }; tgSync(); return true; } if (p.y > 200 && p.y < 400) { TG.drag = { x: p.x, p0: TG.p }; TG.scan = null; return true; } return false; },
    move(p) { const d = TG.drag; if (!d) return; if (d.map) tgSet((p.x - TGG.map.x) / TGG.map.w * GENOME.length - 11); else TG.p = clamp(d.p0 - (p.x - d.x) / TGG.slot, 0, P_MAX); tgSync(); },
    up() { TG.drag = null; },
    hover(p) { return p.y > 200 && p.y < 400 ? 'grab' : 'default'; },
  };
  function tgUpdate(dt) {
    if (TG.scan) {
      const sc = TG.scan;
      if (sc.pause > 0) { sc.pause -= dt; } else {
        TG.p = Math.min(P_MAX, TG.p + 15 * dt);
        const q = tgQ();
        if (CANDS.indexOf(q) >= 0 && !sc.seen[q]) { sc.seen[q] = true; TG.p = q; sc.pause = tgInfo(q).bind ? 0.2 : 1.4; sc.stopAfter = tgInfo(q).bind; }
        if (TG.p >= P_MAX) TG.scan = null;
      }
      if (sc.pause <= 0 && sc.stopAfter) TG.scan = null;
      tgSync();
    } else if (!TG.drag) { const q = tgQ(); TG.p = RM ? q : approach(TG.p, q, dt, 14); }
    const q = tgQ(), inf = tgInfo(q);
    if (CANDS.indexOf(q) >= 0 && Math.abs(TG.p - q) < 0.3) { if (!TG.found[q]) { TG.found[q] = { m: inf.m, pam: inf.pam, bind: inf.bind }; Sound.tick(); } }
    const was = TG.bound; TG.bound = inf.bind && Math.abs(TG.p - q) < 0.3;
    if (TG.bound && !was) { TG.boundOnce = true; TG.snap = 1; Sound.success(); const x = tgX(q + 10); parts.burst(x + TGG.slot / 2, TGG.ty + 40, { count: 16, speed: 140, life: 0.7, colors: ['#22c55e', '#a855f7', '#fde047'] }); updateCtl(); }
    TG.snap = Math.max(0, TG.snap - dt * 2);
    TG.msg = inf.bind ? '일치 20 / 20 + PAM(' + inf.pam + ') → Cas9이 결합해요!' : inf.m === 20 ? '일치 20 / 20이지만 옆에 PAM(NGG)이 없어요 (' + inf.pam + ') → 결합하지 못해요.' : inf.m >= 18 && inf.pamOK ? '일치 ' + inf.m + ' / 20 + PAM(' + inf.pam + '): 완벽하지 않지만 유사 서열이에요 (오프타깃 가능성).' : '일치 ' + inf.m + ' / 20 · 옆 3염기 ' + inf.pam + (inf.pamOK ? ' (PAM 있음)' : ' (PAM 아님)') + ' → 결합하지 못해요.';
  }
  function tgDraw(dt, t) {
    tgUpdate(dt);
    const q = tgQ(), inf = tgInfo(q), G = TGG;
    TF(VW / 2, 26, '가이드 RNA와 상보적인 서열 + 바로 옆 PAM(NGG)을 찾아요', VW - 24, PHONE ? 14 : 16, 11.5, INK, 'center', 800);
    /* 유전체 지도 */
    const mp = G.map, cw = mp.w / GENOME.length;
    T(mp.x, mp.y - 22, '유전체 모형 ' + GENOME.length + '염기 (끌어서 옮겨요)', 13, '#64748b', 'left', 800);
    D.roundRect(mp.x, mp.y, mp.w, 16, 6); ctx.fillStyle = '#e2e8f0'; ctx.fill();
    CANDS.forEach((c) => { const f = TG.found[c]; if (f) { ctx.fillStyle = f.bind ? '#16a34a' : f.m === 20 ? '#f59e0b' : '#f97316'; ctx.fillRect(mp.x + c * cw, mp.y, 20 * cw, 16); D.sphere(mp.x + (c + 10) * cw, mp.y - 8, 6, f.bind ? '#16a34a' : '#f59e0b', {}); } });
    ctx.strokeStyle = '#7c3aed'; ctx.lineWidth = 3; D.roundRect(mp.x + TG.p * cw - 1, mp.y - 3, 23 * cw + 2, 22, 6); ctx.stroke();
    /* 서열 */
    const ty = G.ty, by = ty + 34;
    D.roundRect(4, ty - 30, VW - 8, 190, 14); ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fill();
    T(1, ty - 10, "5′", 12, '#64748b', 'left', 800); T(1, by + 5, "3′", 12, '#64748b', 'left', 800);
    for (let i = 0; i < GENOME.length; i++) {
      const x = tgX(i); if (x < -G.slot || x > VW) continue;
      const cx = x + G.slot / 2, inGuide = i >= q && i < q + 20, inPam = i >= q + 20 && i < q + 23;
      const ch = GENOME[i];
      if (inPam) { ctx.fillStyle = 'rgba(250,204,21,.45)'; ctx.fillRect(x, ty - 22, G.slot, 30); }
      T(cx, ty, ch, PHONE ? 15 : 18, BCOL[ch], 'center', 800);
      T(cx, by, COMP[ch], PHONE ? 15 : 18, C.mix(BCOL[COMP[ch]], '#94a3b8', 0.35), 'center', 800);
      if (inGuide) {
        const gi = i - q, ok = ch === TARGET[gi];
        ctx.strokeStyle = ok ? '#22c55e' : '#ef4444'; ctx.lineWidth = ok ? 2 : 2.4; ctx.beginPath(); ctx.moveTo(cx, by + 8); ctx.lineTo(cx, by + 30); ctx.stroke();
        T(cx, by + 52, GUIDE[gi], PHONE ? 15 : 18, BCOL[GUIDE[gi]], 'center', 800);
        if (!ok) T(cx, by + 76, '✖', 14, '#ef4444', 'center', 800);
      }
    }
    /* 가닥 방향 / 가이드 / Cas9 */
    const gx0 = tgX(q), gw = 20 * G.slot;
    ctx.save(); const bound = TG.bound, pulse = 1 + (bound ? TG.snap * 0.04 : 0);
    D.roundRect(gx0 - 8, by + 18, gw + 16, 52, 18); ctx.fillStyle = bound ? 'rgba(34,197,94,.20)' : 'rgba(168,85,247,.16)'; ctx.fill(); ctx.strokeStyle = bound ? '#16a34a' : '#a855f7'; ctx.lineWidth = bound ? 3.4 : 2.4; ctx.stroke();
    ctx.restore();
    T(gx0 + gw / 2, by + 96, '가이드 RNA (20염기) + Cas9', PHONE ? 13 : 14.5, bound ? '#15803d' : '#7e22ce', 'center', 800);
    const pamX = tgX(q + 20);
    ctx.strokeStyle = '#ca8a04'; ctx.lineWidth = 2.2; D.roundRect(pamX - 2, ty - 24, 3 * G.slot + 4, 34, 6); ctx.stroke();
    T(pamX + 1.5 * G.slot, ty - 32, 'PAM', 13.5, '#a16207', 'center', 800);
    ctx.strokeStyle = '#7c3aed'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(gx0, ty - 26); ctx.lineTo(gx0 + gw, ty - 26); ctx.stroke(); T(gx0 + gw / 2, ty - 32, '표적 서열 20염기', 13.5, '#6d28d9', 'center', 800);
    if (bound) { const mx = tgX(q + 10) + G.slot / 2; D.glow(mx, by + 40, 120, '#22c55e', 0.25 + 0.2 * TG.snap); D.check(gx0 + gw + 30, by + 44, 11, 1); }
    /* 안내 */
    const iy = G.info.y;
    const w = VW - 24;
    bubble(12, iy, w, TG.msg, { size: PHONE ? 13 : 14.5, fill: TG.bound ? '#f0fdf4' : inf.m >= 18 ? '#fff7ed' : '#fff', line: TG.bound ? '#86efac' : inf.m >= 18 ? '#fdba74' : '#cbd5e1' });
    const nf = Object.keys(TG.found).length;
    T(14, iy + (PHONE ? 68 : 70), '살펴본 후보 자리: ' + nf + '곳' + Object.keys(TG.found).map((k) => '  ' + (+k + 1) + '번째(' + TG.found[k].m + '/20' + (TG.found[k].bind ? ', 결합' : ', 결합 못 함') + ')').join(''), PHONE ? 12 : 13.5, '#64748b', 'left', 800);
    if (TG.boundOnce) T(14, iy + (PHONE ? 90 : 96), '찾았어요! 가이드 RNA가 표적에 결합해 Cas9이 자를 준비를 마쳤어요.', PHONE ? 12.5 : 14, '#15803d', 'left', 800);
  }

  /* ===================== ① 일치 횟수 계산 ===================== */
  const CL = { L: 10, ok10: false, ok20: false, rev: { 10: 0, 20: 0 } };
  const GEN_SIZE = 6.2e9;
  const cl4 = (L) => Math.pow(4, L), clE = (L) => GEN_SIZE / cl4(L);
  const clVal = (id) => parseBig($('#' + id).value);
  const clOK10 = () => { const v = clVal('clIn10'); return isFinite(v) && v >= 5500 && v <= 6300; };
  const clOK20 = () => { const v = clVal('clIn20'); return isFinite(v) && v >= 0.005 && v <= 0.0065; };
  function clReset() { CL.L = 10; CL.ok10 = CL.ok20 = false; CL.rev = { 10: 0, 20: 0 }; ['clIn10', 'clIn20'].forEach((id) => { $('#' + id).value = ''; $('#' + id).classList.remove('ok'); }); $('#clL').value = 10; $('#clOut').textContent = '10염기'; updateCtl(); }
  const CLG = PHONE ? { x: 74, y: 250, w: 380, h: 250 } : { x: 110, y: 218, w: 650, h: 270 };
  function clDraw(dt, t) {
    CL.ok10 = clOK10(); CL.ok20 = clOK20();
    CL.rev[10] = approach(CL.rev[10], CL.ok10 ? 1 : 0, dt, 6); CL.rev[20] = approach(CL.rev[20], CL.ok20 ? 1 : 0, dt, 6);
    TF(VW / 2, 26, '우연히 같은 서열이 나타날 횟수 = 유전체 염기 수 / 4ᴸ', VW - 24, PHONE ? 14 : 16, 11, INK, 'center', 800);
    panel(12, 40, VW - 24, PHONE ? 150 : 150, 14, '#fff');
    T(26, 70, '사람 이배체 유전체: 6.2 × 10⁹ 염기', PHONE ? 14 : 16, '#334155', 'left', 800);
    T(26, 102, '가이드 RNA ' + CL.L + '염기 → 가능한 서열 4' + sup(CL.L) + ' 가지', PHONE ? 14 : 16, '#6d28d9', 'left', 800);
    T(26, 134, '4' + sup(CL.L) + ' = ' + (CL.L <= 10 ? fmtN(cl4(CL.L)) : sci(cl4(CL.L), 2)), PHONE ? 20 : 26, INK, 'left', 800);
    T(PHONE ? 26 : 400, PHONE ? 164 : 134, '기대 횟수 = 6.2 × 10⁹ / 4' + sup(CL.L), PHONE ? 14 : 16, '#64748b', 'left', 800);
    /* 그래프 (세로축 로그) */
    const g = CLG, lx = (L) => g.x + (L - 5) / 15 * g.w, ly = (v) => g.y + g.h - clamp((Math.log10(v) + 3) / 10, 0, 1) * g.h;
    panel(g.x - (PHONE ? 62 : 98), g.y - 22, g.w + (PHONE ? 74 : 112), g.h + 62, 14, '#fff');
    for (let e = -3; e <= 7; e += 2) { const y = ly(Math.pow(10, e)); ctx.strokeStyle = e === -3 ? '#94a3b8' : '#e2e8f0'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(g.x, y); ctx.lineTo(g.x + g.w, y); ctx.stroke(); T(g.x - 8, y + 4.5, e === 0 ? '1' : '10' + sup(e), 12.5, '#64748b', 'right', 700); }
    for (let L = 5; L <= 20; L += 5) { T(lx(L), g.y + g.h + 20, L + '염기', 12.5, '#64748b', 'center', 700); }
    T(g.x - (PHONE ? 58 : 94), g.y - 6, '기대 횟수(번)', 12, '#64748b', 'left', 800);
    ctx.save(); ctx.strokeStyle = 'rgba(124,58,237,.35)'; ctx.lineWidth = 2.6; ctx.setLineDash([6, 5]); ctx.beginPath(); for (let L = 5; L <= 20; L += 0.5) { const x = lx(L), y = ly(clE(L)); if (L === 5) ctx.moveTo(x, y); else ctx.lineTo(x, y); } ctx.stroke(); ctx.restore();
    /* 지금 L 표시선 */
    const cxL = lx(CL.L); ctx.strokeStyle = '#a855f7'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cxL, g.y); ctx.lineTo(cxL, g.y + g.h); ctx.stroke();
    D.sphere(cxL, ly(clE(CL.L)), 6, '#a855f7', { gloss: false });
    [[10, '#dc2626', '약 5900번'], [20, '#16a34a', '약 0.006번']].forEach(([L, col, lab]) => {
      const r = CL.rev[L]; if (r < 0.02) return; ctx.globalAlpha = r; const x = lx(L), y = ly(clE(L));
      D.sphere(x, y, 9, col, { shadow: true }); D.label(x + (L === 20 ? -14 : 14), y + (L === 20 ? -20 : -4), L + '염기: ' + lab, { bg: '#fff', color: col, border: col, size: PHONE ? 12.5 : 14, align: L === 20 ? 'right' : 'left' }); ctx.globalAlpha = 1;
    });
    if (CL.ok10 && CL.ok20) TF(VW / 2, g.y + g.h + 50, '20염기: 6.2 × 10⁹ / 4²⁰ ≈ 0.006번 → 유전체에서 우연히 나올 가능성이 매우 낮아 정확해요', VW - 30, PHONE ? 12 : 14, 9.5, '#15803d', 'center', 800);
    else if (CL.ok10) TF(VW / 2, g.y + g.h + 50, '10염기는 약 5900번이나 우연히 일치해요 → 특이성이 낮아요', VW - 30, PHONE ? 12.5 : 14, 10, '#b91c1c', 'center', 800);
  }


  /* ===================== ② 절단과 수리 ===================== */
  const GENE = 'ATGGCTCACCTGACTCCTGTGAAGTGGACTAGAGTTTTACTGACGGAAAGTGAGCAAAGGCTAACG';
  const AA_TAB = (() => { const aa = 'FFLLSSSSYY**CC*WLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG', m = {}; let i = 0; for (const a of 'TCAG') for (const b of 'TCAG') for (const c of 'TCAG') m[a + b + c] = aa[i++]; return m; })();
  const AA3 = { M: 'Met', A: 'Ala', H: 'His', L: 'Leu', T: 'Thr', P: 'Pro', V: 'Val', K: 'Lys', W: 'Trp', R: 'Arg', E: 'Glu', S: 'Ser', G: 'Gly', D: 'Asp', Q: 'Gln', F: 'Phe', Y: 'Tyr', N: 'Asn', I: 'Ile', C: 'Cys', '*': '정지' };
  const CUT = 21, NSH = 54, NCOD = 18;   /* 자르는 자리: 21번째와 22번째 염기 사이 */
  const HDR_SEQ = GENE.slice(0, 19) + 'A' + GENE.slice(20);
  const translate = (s) => { const out = []; for (let i = 0; i < NCOD; i++) out.push(AA_TAB[s.slice(i * 3, i * 3 + 3)] || '?'); return out; };
  const OUTS = [
    { id: 'del3', t: '3염기 결실', frame: false, apply: (s) => s.slice(0, CUT) + s.slice(CUT + 3) },
    { id: 'ins1', t: '1염기 삽입', frame: true, apply: (s) => s.slice(0, CUT) + 'T' + s.slice(CUT) },
    { id: 'del2', t: '2염기 결실', frame: true, apply: (s) => s.slice(0, CUT) + s.slice(CUT + 2) },
    { id: 'del1', t: '1염기 결실', frame: true, apply: (s) => s.slice(0, CUT) + s.slice(CUT + 1) },
    { id: 'ins2', t: '2염기 삽입', frame: true, apply: (s) => s.slice(0, CUT) + 'TG' + s.slice(CUT) },
  ];
  const RP = { stage: 0, mode: null, k: 0, seq: GENE, letters: [], ghosts: [], cutGap: 0, cutT: 0, res: null, aaT: 0, tmpl: 0, flash: 0, pulse: {} };
  const RPG = PHONE
    ? { cw: 16, per: 27, x0: 24, rows: [138, 288], aaDy: 56, frameH: 40, cas: { y: 86 } }
    : { cw: 14, per: 54, x0: 22, rows: [196], aaDy: 56, frameH: 44, cas: { y: 82 } };
  const rpSlot = (i) => { const g = RPG, r = Math.floor(i / g.per), c = i % g.per; return { x: g.x0 + c * g.cw + g.cw / 2, y: g.rows[Math.min(r, g.rows.length - 1)] }; };
  function rpMakeLetters() { RP.letters = GENE.split('').map((ch, i) => { const p = rpSlot(i); return { ch, x: p.x, y: p.y, a: 1, pulse: 0 }; }); RP.ghosts = []; }
  function rpReset(keepK) {
    RP.stage = 0; RP.mode = null; RP.seq = GENE; RP.cutGap = 0; RP.cutT = 0; RP.res = null; RP.aaT = 0; RP.tmpl = 0; RP.flash = 0; if (!keepK) RP.k = 0;
    rpMakeLetters(); parts.clear(); updateCtl();
  }
  const rpCas = () => ({ x: rpSlot(CUT - 1).x + RPG.cw / 2, y: RPG.cas.y });
  function rpCut() { if (RP.stage !== 0) return; RP.stage = 1; RP.flash = 1; Sound.click(); const c = rpCas(); const s = rpSlot(CUT - 1); parts.burst(s.x + RPG.cw / 2, s.y, { count: 14, speed: 130, life: 0.7, colors: ['#fde047', '#fff', '#a855f7'] }); updateCtl(); }
  function rpRepair() {
    if (RP.stage !== 1 || !RP.mode) { if (RP.stage === 1 && !RP.mode) showHint('수리 방식을 먼저 골라요.'); return; }
    const old = RP.seq; let next, info;
    if (RP.mode === 'hdr') { next = HDR_SEQ; info = { mode: 'hdr', t: '주형 DNA로 정확히 교정', frame: false, fixed: true }; }
    else { const o = OUTS[RP.k % OUTS.length]; RP.k++; next = o.apply(old); info = { mode: 'nhej', t: o.t, frame: o.frame, id: o.id }; }
    /* 글자 조작: 결실은 사라지고, 삽입은 끼어들고, 교정은 글자가 바뀌어요 */
    const L0 = RP.letters;
    if (RP.mode === 'hdr') { L0[19].ch = 'A'; L0[19].pulse = 1; }
    else {
      const dl = next.length - old.length;
      if (dl < 0) { const rem = L0.splice(CUT, -dl); rem.forEach((l) => { l.dy = 22; RP.ghosts.push(l); }); }
      else { const ins = next.slice(CUT, CUT + dl).split('').map((ch) => ({ ch, x: 0, y: 0, a: 0, pulse: 1, ins: true })); L0.splice(CUT, 0, ...ins); ins.forEach((l, i) => { const p = rpSlot(CUT + i); l.x = p.x; l.y = p.y - 26; }); }
    }
    RP.seq = next; RP.stage = 2; RP.aaT = 0; RP.tmpl = 0;
    const prot = translate(next), stop = prot.indexOf('*');
    info.prot = prot; info.stop = stop; info.dead = info.mode === 'nhej' && info.frame && stop >= 0; info.same = info.mode === 'nhej' && !info.frame;
    RP.res = info; Sound.success(); updateCtl();
  }
  function rpUpdate(dt) {
    RP.flash = Math.max(0, RP.flash - dt * 2.4);
    const gapT = RP.stage === 1 ? 18 : 0; RP.cutGap = RM ? gapT : approach(RP.cutGap, gapT, dt, 7);
    if (RP.stage === 2) RP.aaT = Math.min(1, RP.aaT + dt / 0.6);
    if (RP.stage === 1 && RP.mode === 'hdr') RP.tmpl = Math.min(1, RP.tmpl + dt / 1.2); else if (RP.stage === 2) RP.tmpl = Math.max(0, RP.tmpl - dt * 2); else RP.tmpl = 0;
    RP.letters.forEach((l, i) => {
      const p = rpSlot(i), off = (i >= CUT ? 1 : -1) * RP.cutGap / 2 * (RP.stage === 1 || RP.cutGap > 0.4 ? 1 : 0);
      const tx = p.x + off, ty = p.y;
      if (l.ins) { l.a = approach(l.a, 1, dt, 9); }
      l.x = RM ? tx : approach(l.x, tx, dt, 11); l.y = RM ? ty : approach(l.y, ty, dt, 11);
      l.pulse = Math.max(0, (l.pulse || 0) - dt * 1.8);
    });
    RP.ghosts = RP.ghosts.filter((l) => { l.a = Math.max(0, (l.a == null ? 1 : l.a) - dt * 2.2); l.y += 40 * dt; return l.a > 0.02; });
  }
  function rpDraw(dt, t) {
    rpUpdate(dt);
    const g = RPG, rows = g.rows;
    TF(VW / 2, 26, RP.stage === 0 ? 'Cas9이 가이드 RNA를 따라 표적에 결합했어요 (표적 자리: 21번째와 22번째 염기 사이)' : RP.stage === 1 ? 'DNA 두 가닥이 모두 잘렸어요! 세포가 스스로 수리해요' : '수리가 끝났어요: ' + RP.res.t, VW - 24, PHONE ? 13 : 15.5, 10.5, INK, 'center', 800);
    /* Cas9 복합체 */
    const cs = rpCas();
    D.glow(cs.x, cs.y, 70, '#a855f7', 0.3);
    ctx.save(); const wob = RM ? 0 : Math.sin(t * 3) * 2;
    D.roundRect(cs.x - 56, cs.y - 24 + wob, 112, 46, 20); const cg = ctx.createLinearGradient(0, cs.y - 24, 0, cs.y + 22); cg.addColorStop(0, '#c084fc'); cg.addColorStop(1, '#8b5cf6'); ctx.fillStyle = cg; ctx.fill(); ctx.strokeStyle = '#6d28d9'; ctx.lineWidth = 2.4; ctx.stroke(); ctx.restore();
    T(cs.x, cs.y - 2 + wob, 'Cas9', 17, '#fff', 'center', 800); T(cs.x, cs.y + 15 + wob, '+ 가이드 RNA', 12, '#ede9fe', 'center', 800);
    const site = rpSlot(CUT - 1);
    D.dashedLine(cs.x, cs.y + 24, site.x + g.cw / 2, site.y - 34, { color: '#8b5cf6', width: 2, dash: [4, 4] });
    if (RP.flash > 0) { D.glow(site.x + g.cw / 2, site.y, 60 * (0.5 + RP.flash), '#fde047', RP.flash * 0.9); E('✂️', site.x + g.cw / 2, site.y - 46 - RP.flash * 6, 26, { alpha: RP.flash }); }
    /* 이중 가닥 뼈대 */
    rows.forEach((ry, r) => {
      const a = g.x0, b = g.x0 + (r === 0 ? Math.min(g.per, NSH) : NSH - g.per) * g.cw;
      const cutHere = r === 0;
      ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      [ry - 20, ry + 20].forEach((yy) => {
        ctx.beginPath();
        if (cutHere && RP.cutGap > 0.5) { const cx = g.x0 + CUT * g.cw; ctx.moveTo(a, yy); ctx.lineTo(cx - RP.cutGap / 2 - 1, yy); ctx.moveTo(cx + RP.cutGap / 2 + 1, yy); ctx.lineTo(b, yy); } else { ctx.moveTo(a, yy); ctx.lineTo(b, yy); }
        ctx.stroke();
      });
    });
    /* 코돈 틀 */
    for (let c = 0; c < NCOD; c++) {
      const i0 = c * 3, p0 = rpSlot(i0), p2 = rpSlot(i0 + 2), left = p0.x - g.cw / 2 + 1, w = p2.x - p0.x + g.cw - 2;
      const mut = RP.mode === 'hdr' || (RP.res && RP.res.mode === 'hdr') ? c === 6 : false;
      D.roundRect(left, p0.y - 18, w, 36, 7); ctx.fillStyle = (c % 2) ? 'rgba(241,245,249,.8)' : 'rgba(224,231,255,.55)'; ctx.fill();
      if (mut && !(RP.res && RP.res.mode === 'hdr')) { ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 2.2; D.roundRect(left, p0.y - 18, w, 36, 7); ctx.stroke(); }
      if (c === 6 && RP.res && RP.res.mode === 'hdr') { ctx.strokeStyle = '#16a34a'; ctx.lineWidth = 2.6; D.roundRect(left, p0.y - 18, w, 36, 7); ctx.stroke(); }
    }
    /* 글자 */
    const fs = PHONE ? 15 : 14.5;
    RP.letters.forEach((l, i) => { if (i >= NSH) return; ctx.save(); ctx.globalAlpha = l.a == null ? 1 : l.a; const sc = 1 + (l.pulse || 0) * 0.5; ctx.translate(l.x, l.y + 5); ctx.scale(sc, sc); T(0, 0, l.ch, fs, l.pulse > 0.1 ? '#16a34a' : BCOL[l.ch], 'center', 800); ctx.restore(); });
    RP.ghosts.forEach((l) => { ctx.save(); ctx.globalAlpha = l.a; T(l.x, l.y + 5, l.ch, fs, '#ef4444', 'center', 800); ctx.restore(); });
    /* 아미노산 */
    const prot = translate(RP.seq), showNew = RP.stage === 2 && RP.aaT >= 1 ? true : false;
    const origProt = translate(GENE);
    let stopSeen = false;
    for (let c = 0; c < NCOD; c++) {
      const p0 = rpSlot(c * 3 + 1), shown = RP.stage === 2 ? (RP.aaT >= 0.5 ? prot : origProt) : origProt;
      const a = shown[c], col = stopSeen ? '#cbd5e1' : a === '*' ? '#dc2626' : (RP.stage === 2 && shown[c] !== origProt[c]) ? '#b45309' : '#475569';
      if (a === '*') stopSeen = true;
      const lab = AA3[a] || '?';
      D.roundRect(p0.x - g.cw * 1.45, p0.y + g.aaDy - 15, g.cw * 2.9, 24, 8); ctx.fillStyle = a === '*' ? 'rgba(254,202,202,.8)' : (RP.stage === 2 && shown[c] !== origProt[c] ? 'rgba(254,243,199,.9)' : 'rgba(255,255,255,.85)'); ctx.fill();
      TF(p0.x, p0.y + g.aaDy + 3, lab, g.cw * 2.8, PHONE ? 13 : 13, 9.5, col, 'center', 800);
      T(p0.x, p0.y + g.aaDy + 27, String(c + 1), 11.5, '#94a3b8', 'center', 700);
    }
    T(g.x0, rows[0] - 30, '염기 서열 (3개씩 묶인 틀 = 코돈)', 12.5, '#64748b', 'left', 800);
    T(g.x0, rows[0] + g.aaDy - 24, '→ 아미노산 (번역 결과)', 12.5, '#64748b', 'left', 800);
    /* 주형 DNA */
    if (RP.tmpl > 0.02 || (RP.mode === 'hdr' && RP.stage === 1)) {
      const tp = ease.outCubic(RP.tmpl), ty = rows[rows.length - 1] + g.aaDy + 70 - tp * 30;
      ctx.save(); ctx.globalAlpha = Math.min(1, RP.tmpl * 1.4);
      const cx = rpSlot(19).x; D.roundRect(cx - 74, ty - 22, 148, 44, 10); ctx.fillStyle = '#ecfdf5'; ctx.fill(); ctx.strokeStyle = '#16a34a'; ctx.lineWidth = 2.4; ctx.stroke();
      T(cx, ty - 3, '주형 DNA: …CCT GAG AAG…', 13, '#15803d', 'center', 800); T(cx, ty + 15, '(정상 서열 GAG를 가짐)', 12, '#15803d', 'center', 800);
      D.arrow(cx, ty - 24, cx, ty - 44, { color: '#16a34a', width: 3, head: 9 });
      ctx.restore();
    }
    /* 결과 설명 */
    const ry = rows[rows.length - 1] + g.aaDy + (PHONE ? 100 : 100);
    const info = RP.res;
    if (!info) { if (ry < VH - 40) bubble(12, ry, VW - 24, RP.stage === 0 ? '① Cas9으로 DNA를 자르고, ② 세포의 수리 방식을 골라 ③ 수리를 실행해요. 지금 서열의 7번째 아미노산은 Val(GTG)이에요.' : '② 수리 방식(끝 연결 / 주형 DNA)을 골라 ③ 수리를 실행해요.', { size: PHONE ? 13 : 14.5 }); }
    else {
      const msgs = [];
      if (info.mode === 'hdr') { msgs.push('주형 DNA를 이용해 GTG(Val)가 GAG(Glu)로 정확히 교정됐어요.'); msgs.push('나머지 서열은 그대로예요: 정확한 교정이 가능해요.'); }
      else if (info.frame) { msgs.push(info.t + ' → 읽기틀이 밀려요. 8번째 아미노산부터 모두 달라져요.'); msgs.push(info.stop >= 0 ? (info.stop + 1) + '번째에서 정지 코돈이 나타나 단백질이 짧아져요 → 유전자 불활성화(녹아웃).' : '정지 코돈이 아직 안 보여요.'); }
      else { msgs.push(info.t + ' → 3의 배수라 읽기틀이 유지돼요. 8번째 아미노산(Lys) 하나만 없어져요.'); msgs.push('유전자가 거의 그대로 작동해요. 다시 시도해 읽기틀이 밀리는 결과를 찾아요.'); }
      const hh = bubble(12, ry, VW - 24, msgs[0], { size: PHONE ? 13 : 14.5, fill: info.dead ? '#fef2f2' : info.fixed ? '#f0fdf4' : '#fff', line: info.dead ? '#fca5a5' : info.fixed ? '#86efac' : '#cbd5e1' });
      if (ry + hh + 4 < VH - 30) bubble(12, ry + hh + 6, VW - 24, msgs[1], { size: PHONE ? 13 : 14.5 });
    }
  }
  const rpKO = () => !!(RP.res && RP.res.mode === 'nhej' && RP.res.dead);
  const rpFix = () => !!(RP.res && RP.res.mode === 'hdr' && RP.seq === HDR_SEQ);


  /* ===================== ③ 체외 편집 치료의 흐름 ===================== */
  const FLOW = [
    { id: 'collect', label: '조혈모세포 채취', icon: '🩸', desc: '환자의 몸에서 조혈모세포를 꺼내요.', col: '#dc2626' },
    { id: 'edit', label: '체외 편집', icon: '✂️', desc: '몸 밖에서 BCL11A의 조절 부위를 편집해요.', col: '#7c3aed' },
    { id: 'check', label: '편집 확인', icon: '🔬', desc: '편집이 제대로 됐는지 검사해요.', col: '#0ea5e9' },
    { id: 'infuse', label: '환자에게 이식', icon: '💉', desc: '편집된 세포를 환자에게 되돌려요.', col: '#16a34a' },
  ];
  const FL = { P: null, anim: {}, dot: 0 };
  function flInit() {
    FL.P = seqPicker($('#flPool'), $('#flSeq'), FLOW.map((q) => ({ id: q.id, label: q.label })), () => updateCtl());
    const sh = [FLOW[2], FLOW[0], FLOW[3], FLOW[1]]; FL.P.setPool(sh.map((q) => ({ id: q.id, label: q.label }))); FL.P.render(); FL.anim = {}; FL.dot = 0;
  }
  const flOK = () => FL.P && FL.P.ok(FLOW.map((q) => q.id));
  function flDraw(dt, t) {
    const ok = flOK(), order = FL.P.order;
    TF(VW / 2, 26, ok ? '환자의 세포가 몸 밖에서 편집된 뒤 돌아가요 (체외 편집)' : '체외 편집 치료의 4단계를 순서대로 쌓아요', VW - 24, PHONE ? 14 : 16, 11, INK, 'center', 800);
    const n = 4, bw = PHONE ? VW - 100 : 168, bh = PHONE ? 100 : 190;
    const pos = (i) => (PHONE ? { x: 76, y: 60 + i * (bh + 24) } : { x: 40 + i * (bw + 18), y: 150 });
    /* 환자 */
    const pa = PHONE ? { x: 36, y: 330 } : { x: 70, y: 100 };
    person(pa.x, pa.y, PHONE ? 34 : 40, '#fb923c', {}); T(pa.x, pa.y + (PHONE ? 38 : 44), '환자', 13, INK, 'center', 800);
    const path = [];
    for (let i = 0; i < n; i++) { const p = pos(i); path.push(PHONE ? { x: p.x + bw / 2, y: p.y + bh / 2 } : { x: p.x + bw / 2, y: p.y + bh / 2 }); }
    for (let i = 0; i < n; i++) {
      const p = pos(i), id = order[i], st = id ? FLOW.find((q) => q.id === id) : null;
      const a = st ? (FL.anim[id] = approach(FL.anim[id] == null ? 0 : FL.anim[id], 1, dt, 9)) : 0;
      D.roundRect(p.x, p.y, bw, bh, 14);
      if (!st) { ctx.fillStyle = 'rgba(148,163,184,.12)'; ctx.fill(); ctx.setLineDash([7, 5]); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; ctx.stroke(); ctx.setLineDash([]); T(p.x + bw / 2, p.y + bh / 2 + 14, String(i + 1), 44, 'rgba(148,163,184,.5)', 'center', 800); }
      else {
        ctx.save(); const sc = 0.9 + 0.1 * a; ctx.translate(p.x + bw / 2, p.y + bh / 2); ctx.scale(sc, sc); ctx.translate(-bw / 2, -bh / 2); ctx.globalAlpha = a;
        flatCard(0, 0, bw, bh, 14, '#fff', 0); ctx.strokeStyle = st.col; ctx.lineWidth = 3; D.roundRect(0, 0, bw, bh, 14); ctx.stroke(); D.roundRect(0, 0, bw, 8, 4); ctx.fillStyle = st.col; ctx.fill();
        D.sphere(PHONE ? 28 : bw / 2, PHONE ? 50 : 38, 14, st.col, { text: String(i + 1) });
        E(st.icon, PHONE ? 74 : bw / 2, PHONE ? 50 : 82, PHONE ? 30 : 34);
        if (PHONE) { T(100, 44, st.label, 15, INK, 'left', 800); wrap(st.desc, bw - 112, 12.5, 700).slice(0, 3).forEach((l, k) => T(100, 64 + k * 16, l, 12.5, '#475569', 'left', 700)); }
        else { wrap(st.label, bw - 20, 15, 800).forEach((l, k) => T(bw / 2, 124 + k * 19, l, 15, INK, 'center', 800)); wrap(st.desc, bw - 24, 12.5, 700).slice(0, 4).forEach((l, k) => T(bw / 2, 148 + k * 16, l, 12.5, '#475569', 'center', 700)); }
        ctx.restore();
      }
      if (i < n - 1) { const q = pos(i + 1); if (PHONE) D.arrow(p.x + bw / 2, p.y + bh + 2, p.x + bw / 2, q.y - 2, { color: '#94a3b8', width: 3, head: 8 }); else D.arrow(p.x + bw + 1, p.y + bh / 2, q.x - 1, p.y + bh / 2, { color: '#94a3b8', width: 3, head: 8 }); }
    }
    /* 환자 → 첫 단계, 마지막 → 환자 화살표 */
    const f0 = pos(0), f3 = pos(3);
    if (PHONE) { D.arrow(pa.x + 14, pa.y, f0.x - 2, f0.y + bh / 2, { color: '#fb923c', width: 3, head: 8, dash: [6, 5] }); D.arrow(f3.x - 2, f3.y + bh * 0.8, pa.x + 14, pa.y + 16, { color: '#16a34a', width: 3, head: 8, dash: [6, 5] }); }
    else { D.arrow(pa.x + 22, pa.y + 4, f0.x + bw / 2, f0.y - 2, { color: '#fb923c', width: 3, head: 8, dash: [6, 5] }); D.arrow(f3.x + bw / 2, f3.y + bh + 2, f3.x + bw / 2, f3.y + bh + 52, { color: '#16a34a', width: 3, head: 8, dash: [6, 5] }); D.dashedLine(f3.x + bw / 2, f3.y + bh + 52, pa.x, f3.y + bh + 52, { color: '#16a34a', width: 3, dash: [6, 5] }); D.arrow(pa.x, f3.y + bh + 52, pa.x, pa.y + 48, { color: '#16a34a', width: 3, head: 8, dash: [6, 5] }); T((f3.x + pa.x) / 2 + bw / 2, f3.y + bh + 74, '편집된 세포가 환자에게 돌아가요', 13.5, '#15803d', 'center', 800); }
    /* 세포가 흐르는 모양 */
    if (ok) {
      FL.dot = (FL.dot + dt * 0.28) % 1;
      const pts = [PHONE ? { x: pa.x, y: pa.y } : { x: pa.x, y: pa.y }].concat(path).concat([{ x: pa.x, y: pa.y }]);
      const segs = pts.length - 1, u = FL.dot * segs, k = Math.min(segs - 1, Math.floor(u)), f = u - k;
      const x = lerp(pts[k].x, pts[k + 1].x, f), y = lerp(pts[k].y, pts[k + 1].y, f);
      const edited = k >= 2;
      D.glow(x, y, 20, edited ? '#22c55e' : '#fb923c', 0.5); D.sphere(x, y, 9, edited ? '#22c55e' : '#ef4444', { shadow: true });
      if (edited) T(x, y - 16, '편집됨', 12, '#15803d', 'center', 800, { stroke: '#fff', strokeWidth: 3 });
    }
    T(VW / 2, VH - 10, '체외 편집: 환자의 세포를 꺼내 몸 밖에서 편집하므로 편집 결과를 확인한 뒤 되돌릴 수 있어요', PHONE ? 11.5 : 13, '#64748b', 'center', 800);
  }

  /* ===================== ③ 사례 단계 분류 ===================== */
  function triSorter(items, boxDefs, ch, kh) {
    const n = items.length, nb = boxDefs.length;
    let boxes, tray;
    if (PHONE) {
      const bh = 96, gap = 6;
      boxes = boxDefs.map((b, k) => Object.assign({ x: 10, y: 50 + k * (bh + gap), w: VW - 20, h: bh, cols: 1, hdr: 24 }, b));
      const ty = 50 + nb * (bh + gap) + 6;
      tray = (i) => ({ x: 10 + (i % 2) * 236, y: ty + Math.floor(i / 2) * (ch + 6) });
    } else {
      const bw = (VW - 24 - 16) / 3, bh = 270;
      boxes = boxDefs.map((b, k) => Object.assign({ x: 12 + k * (bw + 8), y: 54, w: bw, h: bh, cols: 1, hdr: 28 }, b));
      const ty = 54 + bh + 14;
      tray = (i) => ({ x: 12 + (i % 3) * (bw + 8), y: ty + Math.floor(i / 3) * (ch + 6) });
    }
    return selectable({ cards: items, boxes, cw: PHONE ? 228 : (VW - 24 - 16) / 3, ch, kh, tray, onChange() { updateCtl(); } });
  }
  const CASE_BOX = [{ id: 'ok', label: '승인된 치료', col: '#16a34a' }, { id: 'trial', label: '임상 시험 단계', col: '#f59e0b' }, { id: 'res', label: '연구 단계', col: '#7c3aed' }];
  const CASE5 = [
    { id: 'sick', own: 'ok', label: '낫 모양 적혈구병 (체외 편집, 2023년 승인)', short: '낫 모양 적혈구병', icon: '🩸', col: '#16a34a' },
    { id: 'thal', own: 'ok', label: 'β-지중해빈혈 (체외 편집)', short: 'β-지중해빈혈', icon: '🧬', col: '#16a34a' },
    { id: 'eye', own: 'trial', label: '유전성 눈 질환 (눈 속에 편집 도구를 직접 전달)', short: '유전성 눈 질환', icon: '👁', col: '#f59e0b' },
    { id: 'tcell', own: 'trial', label: '암 면역 세포 편집', short: '암 면역 세포 편집', icon: '🛡️', col: '#f59e0b' },
    { id: 'cattle', own: 'res', label: '가축의 질병 저항성 형질 편집', short: '가축 편집', icon: '🐄', col: '#7c3aed' },
  ];
  const caseSorter = triSorter(CASE5, CASE_BOX, PHONE ? 44 : 58, PHONE ? 28 : 34);
  const casePT = sorterPT(() => caseSorter);
  const caseWrong = () => caseSorter.cards.filter((c) => c.zone && c.zone !== c.own);
  function triDraw(so, dt, title) {
    so.update(dt);
    TF(VW / 2, 28, title, VW - 24, PHONE ? 14 : 16, 11.5, INK, 'center', 800);
    so.draw();
    if (so.selected) T(VW / 2, VH - 6, '카드를 골랐어요! 놓을 상자를 눌러요', 13, '#b45309', 'center', 800);
  }
  const caseDraw = (dt) => triDraw(caseSorter, dt, '사례 카드를 알맞은 단계 상자에 넣어요 (교육용 요약)');

  /* ===================== ③ 체세포 편집 vs 생식세포 편집 ===================== */
  const SM = { gen: 0, a: 0 };
  function smReset() { SM.gen = 0; updateCtl(); }
  function smDraw(dt, t) {
    SM.a = approach(SM.a, SM.gen, dt, 4);
    TF(VW / 2, 26, '편집된 세포가 자손에게 전해지는지 비교해요', VW - 24, PHONE ? 14 : 16, 11, INK, 'center', 800);
    const panels = [
      { t: '체세포 편집 (환자 한 사람)', col: '#0ea5e9', germ: false, note: '자손에게 유전되지 않아요' },
      { t: '생식세포 · 배아 편집', col: '#dc2626', germ: true, note: '자손에게 유전돼요 (윤리 논쟁)' },
    ];
    panels.forEach((P, k) => {
      const w = PHONE ? VW - 24 : (VW - 36) / 2, h = PHONE ? 270 : 400, x = PHONE ? 12 : 12 + k * (w + 12), y = PHONE ? 44 + k * (h + 10) : 46;
      panel(x, y, w, h, 14, '#fff'); ctx.strokeStyle = P.col; ctx.lineWidth = 2.4; D.roundRect(x, y, w, h, 14); ctx.stroke();
      TF(x + w / 2, y + 26, P.t, w - 20, 16, 11, P.col, 'center', 800);
      /* 부모 */
      const px = x + w * 0.28, py = y + h * 0.34, cx = x + w * 0.72, cy = y + h * 0.68;
      person(px, py, PHONE ? 38 : 56, '#fb923c', {});
      T(px, py + (PHONE ? 44 : 64), P.germ ? '편집한 배아에서 자란 사람' : '편집 치료를 받은 환자', PHONE ? 11.5 : 12.5, INK, 'center', 800);
      /* 세포들 */
      const cells = P.germ ? 6 : 3;
      for (let i = 0; i < 6; i++) { const ang = i / 6 * TAU + 0.3, rx = px + Math.cos(ang) * (PHONE ? 34 : 50), ry = py + Math.sin(ang) * (PHONE ? 34 : 50) - 6; const edited = P.germ ? true : i < 3; D.sphere(rx, ry, 5.5, edited ? '#ef4444' : '#cbd5e1', { gloss: false }); }
      T(px, py - (PHONE ? 54 : 78), P.germ ? '모든 세포와 생식세포가 편집' : '혈액 줄기세포 일부만 편집', PHONE ? 11.5 : 12.5, '#475569', 'center', 800);
      /* 자손 */
      const a = clamp(SM.a, 0, 1);
      ctx.save(); ctx.globalAlpha = a;
      D.arrow(px + 24, py + 8, cx - 22, cy - 16, { color: '#94a3b8', width: 3, head: 9, dash: [6, 5] });
      T((px + cx) / 2 + 22, (py + cy) / 2 - 8, '다음 세대', 12.5, '#64748b', 'left', 800);
      person(cx, cy, PHONE ? 34 : 48, '#a3e635', {});
      for (let i = 0; i < 6; i++) { const ang = i / 6 * TAU + 0.3, rx = cx + Math.cos(ang) * (PHONE ? 30 : 44), ry = cy + Math.sin(ang) * (PHONE ? 30 : 44) - 6; D.sphere(rx, ry, 5.5, P.germ ? '#ef4444' : '#cbd5e1', { gloss: false }); }
      T(cx, cy + (PHONE ? 40 : 58), P.germ ? '자손의 모든 세포가 편집됨' : '자손은 편집되지 않아요', PHONE ? 11.5 : 12.5, P.germ ? '#b91c1c' : '#0369a1', 'center', 800);
      ctx.restore();
      TF(x + w / 2, y + h - 14, P.note, w - 20, 14, 10.5, P.col, 'center', 800, { alpha: a });
    });
    D.sphere(VW / 2 - 70, VH - 14, 5.5, '#ef4444', { gloss: false }); T(VW / 2 - 60, VH - 9.5, '편집된 세포', 12, '#475569', 'left', 800); D.sphere(VW / 2 + 40, VH - 14, 5.5, '#cbd5e1', { gloss: false }); T(VW / 2 + 50, VH - 9.5, '편집 안 된 세포', 12, '#475569', 'left', 800);
  }

  /* ===================== ④ 한계와 대응 ===================== */
  const LIMS = [
    { id: 'off', label: '오프타깃: 의도하지 않은 곳이 잘려요', short: '오프타깃', icon: '🎯', col: '#dc2626' },
    { id: 'mosaic', label: '모자이크: 일부 세포만 편집돼요', short: '모자이크', icon: '🧩', col: '#ea580c' },
    { id: 'deliver', label: '전달 방법: 편집 도구를 세포에 넣기 어려워요', short: '전달 방법', icon: '🚚', col: '#0d9488' },
    { id: 'cost', label: '매우 높은 비용과 접근성', short: '비용 · 접근성', icon: '💰', col: '#7c3aed' },
    { id: 'long', label: '장기 안전성을 아직 다 알지 못해요', short: '장기 안전성', icon: '⏳', col: '#2563eb' },
  ];
  const LIM_BOX = { off: '더 정밀한 Cas9 · 가이드 설계와 편집 뒤 유전체 검사', mosaic: '편집 효율을 높이고 편집된 세포의 비율을 확인하는 일', deliver: '체외 편집이나 더 안전한 전달체 개선', cost: '제도적 지원과 생산 기술 발전으로 비용을 낮추는 일', long: '오랜 기간 추적 관찰' };
  const LIM_ORDER = ['cost', 'off', 'long', 'deliver', 'mosaic'];
  function pairSorter(items, boxMap, order, cardH) {
    const n = items.length, bh = PHONE ? 0 : Math.floor((VH - 74 - 12 - (n - 1) * 8) / n);
    const boxes = order.map((id, k) => {
      if (PHONE) { const cardRows = Math.ceil(n / 2), y0 = 64 + cardRows * (cardH + 8) + 8, h = Math.floor((VH - y0 - 8 - (n - 1) * 6) / n); return { id, label: boxMap[id], col: items.find((q) => q.id === id).col, x: 10, y: y0 + k * (h + 6), w: VW - 20, h, cols: 1, hdr: 24 }; }
      return { id, label: boxMap[id], col: items.find((q) => q.id === id).col, x: 316, y: 66 + k * (bh + 8), w: VW - 316 - 16, h: bh, cols: 1, hdr: 24 };
    });
    return selectable({ cards: items, boxes, cw: PHONE ? 228 : 276, ch: cardH, kh: PHONE ? 26 : 34, tray: (i) => (PHONE ? { x: 10 + (i % 2) * 236, y: 62 + Math.floor(i / 2) * (cardH + 8) } : { x: 20, y: 66 + i * (bh + 8) + (bh - cardH) / 2 }), onChange() { updateCtl(); } });
  }
  const limSorter = pairSorter(LIMS, LIM_BOX, LIM_ORDER, PHONE ? 52 : 58);
  const limPT = sorterPT(() => limSorter);
  const limWrong = () => limSorter.cards.filter((c) => c.zone && c.zone !== c.id);
  const limDone = () => limSorter.cards.every((c) => c.zone === c.id);
  const limDraw = (dt) => triDraw(limSorter, dt, '한계 카드를 알맞은 "대응" 상자에 넣어요');

  /* ===================== ④ 전망 토의 ===================== */
  const OPT_A = [['a1', '더 정밀한 편집 기술이 개발되어 안전성이 높아질', true], ['a2', '더 많은 질환의 치료에 응용될', true], ['a3', '편집하면 모든 유전병이 곧 완전히 치료될', false]];
  const OL = { a: '', b: '', c: '', pop: { a: 0, b: 0, c: 0 } };
  const olGet = (list, v) => list.find((q) => q[0] === v);
  const OPT_B = LIMS.map((q) => [q.id, q.label.replace(/^[^:]+: /, ''), true, q.short]);
  const OPT_C = Object.keys(LIM_BOX).map((id) => [id, LIM_BOX[id], true]);
  function olReset() { OL.a = OL.b = OL.c = ''; OL.pop = { a: 0, b: 0, c: 0 }; ['olA', 'olB', 'olC'].forEach((id) => { $('#' + id).value = ''; }); updateCtl(); }
  const olOK = () => !!(olGet(OPT_A, OL.a) && olGet(OPT_A, OL.a)[2] && OL.b && OL.c && OL.b === OL.c);
  function olSentence() {
    const a = olGet(OPT_A, OL.a), b = olGet(OPT_B, OL.b), c = olGet(OPT_C, OL.c);
    return 'CRISPR 치료는 ' + (a ? a[1] : '( … )') + ' 것으로 기대되지만, ' + (b ? '"' + b[3] + '" 한계' : '( … )') + ' 때문에 ' + (c ? c[1] + josa(c[1], '이', '가') : '( … )') + ' 필요해요.';
  }
  function olDraw(dt, t) {
    TF(VW / 2, 28, '모둠이 한계를 근거로 들어 전망 문장을 완성해요', VW - 24, PHONE ? 14 : 16, 11.5, INK, 'center', 800);
    const roles = [['a', '전망', '#2563eb', OPT_A], ['b', '한계 (근거)', '#dc2626', OPT_B], ['c', '대응', '#16a34a', OPT_C]];
    const cw = PHONE ? VW - 24 : (VW - 24 - 20) / 3, chH = PHONE ? 96 : 150;
    roles.forEach(([k, role, col, list], i) => {
      const x = PHONE ? 12 : 12 + i * (cw + 10), y = PHONE ? 46 + i * (chH + 8) : 50;
      OL.pop[k] = approach(OL.pop[k], OL[k] ? 1 : 0, dt, 9);
      const opt = olGet(list, OL[k]), bad = opt && !opt[2], mism = k === 'c' && OL.c && OL.b && OL.c !== OL.b;
      flatCard(x, y, cw, chH, 14, '#fff', 0); ctx.strokeStyle = bad || mism ? '#dc2626' : col; ctx.lineWidth = 2.6; D.roundRect(x, y, cw, chH, 14); ctx.stroke();
      D.label(x + 12, y + 20, role, { bg: col, size: 12.5, pad: 8, align: 'left' });
      if (opt) { ctx.save(); ctx.globalAlpha = OL.pop[k]; wrap(opt[1], cw - 26, PHONE ? 13 : 14, 800).slice(0, PHONE ? 3 : 6).forEach((l, j) => T(x + cw / 2, y + 52 + j * (PHONE ? 17 : 19), l, PHONE ? 13 : 14, bad || mism ? '#b91c1c' : INK, 'center', 800)); ctx.restore(); if (bad) T(x + cw - 10, y + 22, '✖ 근거가 없어요', 12, '#dc2626', 'right', 800); if (mism) T(x + cw - 10, y + 22, '✖ 한계와 안 맞아요', 12, '#dc2626', 'right', 800); }
      else TF(x + cw / 2, y + chH * 0.6, '카드를 골라요', cw - 20, 14, 10, '#94a3b8', 'center', 800);
    });
    const sy = PHONE ? 46 + 3 * (chH + 8) : 50 + chH + 14, sh = VH - sy - 12;
    panel(12, sy, VW - 24, sh, 14, olOK() ? '#f0fdf4' : '#fff'); ctx.strokeStyle = olOK() ? '#16a34a' : '#d5deea'; ctx.lineWidth = 2.2; D.roundRect(12, sy, VW - 24, sh, 14); ctx.stroke();
    T(26, sy + 28, '💬 우리 모둠의 전망 문장', 15, '#15803d', 'left', 800);
    wrap(olSentence(), VW - 60, PHONE ? 14 : 16, 800).slice(0, 6).forEach((l, i) => T(26, sy + 58 + i * (PHONE ? 20 : 24), l, PHONE ? 14 : 16, INK, 'left', 800));
    if (olOK()) D.label(VW - 26, sy + sh - 22, '한계 + 대응 + 전망 완성', { bg: '#16a34a', size: 13, align: 'right', pad: 9 });
  }


  /* =========================================================
     화면 전환 · 조작 연결
     ========================================================= */
  const PTS = { target: TG_PT, cases: casePT, limits: limPT };
  function setMode(m) {
    if (S.mode !== m) S.fade = 1;
    S.mode = m; PT = PTS[m] || null; hideHint(); updateCtl();
  }
  const ctlNodes = $$('#ctrlCard .control');
  fillSel($('#olA'), OPT_A.map((q) => [q[0], q[1] + ' 것']), '카드를 골라요');
  fillSel($('#olB'), OPT_B.map((q) => [q[0], q[3] + ': ' + q[1]]), '카드를 골라요');
  fillSel($('#olC'), OPT_C.map((q) => [q[0], q[1]]), '카드를 골라요');
  function updateCtl() {
    const fr = game ? game.free : false, lvNow = game ? game.level : 0;
    ctlNodes.forEach((n) => { n.hidden = (n.dataset.modes || '').split(' ').indexOf(S.mode) < 0; });
    modeButtons(S.mode, lvNow, fr);
    $('#tgNote').innerHTML = TG.boundOnce ? '결합했어요! 슬라이더나 끌기로 다른 자리도 살펴봐요. 같은 20염기인데 PAM이 없는 자리와 18 / 20인 유사 서열이 있어요.' : '긴 서열 위를 <b>끌어서</b> 옮기거나 슬라이더 · 자동 훑기를 써요. <b>일치 20 / 20</b>이고 바로 옆이 <b>NGG(PAM)</b>인 자리를 찾아요.';
    $('#clOut').textContent = CL.L + '염기';
    $$('#rpMode button').forEach((b) => { b.classList.toggle('on', RP.mode === b.dataset.v); b.disabled = RP.stage >= 2; });
    $('#rpCut').disabled = RP.stage !== 0; $('#rpGo').disabled = RP.stage !== 1;
    $('#rpNote').innerHTML = RP.stage === 0 ? 'Cas9이 표적에 결합해 있어요. 먼저 <b>① 자르기</b>를 눌러요.' : RP.stage === 1 ? '이중 가닥이 모두 잘렸어요. <b>수리 방식</b>을 고르고 <b>③ 수리 실행</b>을 눌러요. ' + (RP.mode === 'hdr' ? '주형 DNA가 함께 들어가요.' : RP.mode === 'nhej' ? '끝 연결은 결과가 매번 달라요.' : '') : '결과를 확인했어요. ↺ 다시를 눌러 다른 결과도 봐요.';
    $('#smGen').textContent = SM.gen ? '◀ 이전 세대' : '▶ 다음 세대 보기';
    $('#smNote').innerHTML = SM.gen ? '체세포 편집은 환자 한 사람의 몸에만 적용돼요. <b>생식세포 · 배아 편집</b>은 자손에게 유전돼서 윤리 논쟁이 커요.' : '두 가지 편집에서 편집된 세포(빨강)가 어디에 있는지 봐요.';
  }
  bindModes(setMode);
  SciSim.bindRange($('#tgPos'), null, null, (v) => { TG.scan = null; TG.p = v; tgSync(); updateCtl(); });
  $('#tgL').addEventListener('click', () => { TG.scan = null; TG.p = clamp(tgQ() - 1, 0, P_MAX); tgSync(); Sound.tick(); });
  $('#tgR').addEventListener('click', () => { TG.scan = null; TG.p = clamp(tgQ() + 1, 0, P_MAX); tgSync(); Sound.tick(); });
  $('#tgScan').addEventListener('click', () => { Sound.click(); TG.p = 0; TG.snap = 0; TG.scan = { seen: {}, pause: 0.4, stopAfter: false }; tgSync(); });
  SciSim.bindRange($('#clL'), null, null, (v) => { CL.L = v; updateCtl(); });
  ['clIn10', 'clIn20'].forEach((id) => $('#' + id).addEventListener('input', () => { $('#clIn10').classList.toggle('ok', clOK10()); $('#clIn20').classList.toggle('ok', clOK20()); updateCtl(); }));
  $('#rpCut').addEventListener('click', rpCut); $('#rpGo').addEventListener('click', rpRepair); $('#rpAgain').addEventListener('click', () => { Sound.click(); rpReset(true); });
  $$('#rpMode button').forEach((b) => b.addEventListener('click', () => { if (RP.stage >= 2) return; Sound.click(); RP.mode = b.dataset.v; updateCtl(); }));
  $('#flReset').addEventListener('click', () => { Sound.click(); FL.P.reset(); FL.anim = {}; });
  $('#caseReset').addEventListener('click', () => { Sound.click(); caseSorter.reset(); });
  $('#smGen').addEventListener('click', () => { Sound.click(); SM.gen = SM.gen ? 0 : 1; updateCtl(); }); $('#smReset').addEventListener('click', () => { Sound.click(); smReset(); });
  $('#limReset').addEventListener('click', () => { Sound.click(); limSorter.reset(); });
  [['olA', 'a'], ['olB', 'b'], ['olC', 'c']].forEach(([id, k]) => $('#' + id).addEventListener('change', (e) => { OL[k] = e.target.value; Sound.click(); updateCtl(); }));
  $('#olReset').addEventListener('click', () => { Sound.click(); olReset(); });

  /* =========================================================
     미션
     ========================================================= */
  const levels = [
    {
      title: '표적 찾기', short: '표적 찾기', icon: '🎯', phase: '모형',
      intro: '<p class="si-q">❓ 탐구 질문: 수십억 염기 중 딱 한 곳만 찾아 자르려면 어떤 안내자가 필요할까?</p><p>🔗 <b>앞 단원</b>에서 염기쌍(A-T, G-C)과 앞 차시 <b>단일클론항체</b>의 "특이성"을 배웠어요. <b>CRISPR-Cas9</b>은 세균이 파지(바이러스)의 DNA 조각을 기억해 외부 DNA를 자르는 방어 체계에서 유래했고, 샤르팡티에와 다우드나가 유전자 편집 도구로 만들었어요(2012, 2020 노벨 화학상).</p><p><b>가이드 RNA</b>(표적과 상보적인 약 20염기)가 표적을 찾고 <b>Cas9</b>(DNA 절단 효소)이 자르며, 표적 바로 옆에 <b>PAM(NGG)</b> 서열이 있어야 해요. 원리는 간단한 모형으로만 다뤄요.</p>',
      features: ['target', 'calc'],
      setup() { tgReset(); clReset(); setMode('target'); },
      recap: '가이드 RNA가 20염기 전부 상보적인 표적을 찾고 옆에 PAM(NGG)이 있으면 Cas9이 결합해요. 20염기는 유전체에서 우연히 일치할 기대 횟수가 약 0.006번이라 한 곳만 정확히 찾을 수 있어요.',
      summary: '<ul><li><b>가이드 RNA</b>(표적과 상보적인 약 20염기)가 표적을 찾고, <b>Cas9</b>(DNA 절단 효소)이 DNA를 잘라요. 표적 바로 옆에 <b>PAM(NGG)</b>이 있어야 결합해요.</li><li>같은 20염기여도 PAM이 없으면 결합하지 못하고, 18 / 20 + PAM인 <b>유사 서열</b>에서는 의도하지 않은 절단(<b>오프타깃</b>)이 일어날 수 있어요.</li><li>길이 L인 서열은 4ᴸ가지 중 하나: 10염기는 4¹⁰ ≈ 1.05 × 10⁶, 기대 횟수 6.2 × 10⁹ / 4¹⁰ ≈ <b>5900번</b>(특이성 낮음). 20염기는 4²⁰ ≈ 1.1 × 10¹², 기대 횟수 ≈ <b>0.006번</b>.</li></ul>',
      missions: [
        {
          id: 'find', title: '표적 찾기와 일치 횟수',
          goal: '<b>🎯 표적 찾기</b>에서 Cas9 복합체를 표적에 <b>결합</b>시키고, <b>🔢 일치 횟수 계산</b>에서 <b>10염기와 20염기</b>의 기대 횟수를 입력하세요.',
          hint: '"자동으로 훑기"를 누르면 후보 자리를 차례로 보여 줘요. 기대 횟수 = 6.2 × 10⁹ / 4ᴸ 이고 4¹⁰ ≈ 1.05 × 10⁶, 4²⁰ ≈ 1.1 × 10¹²예요.',
          setup() { tgReset(); clReset(); setMode('target'); },
          check: () => TG.boundOnce && clOK10() && clOK20(), hold: 0.6,
          status: () => mark(TG.boundOnce) + ' 표적에 결합 &nbsp; ' + mark(clOK10()) + ' 10염기 &nbsp; ' + mark(clOK20()) + ' 20염기',
          explain: '표적은 가이드 RNA와 <b>20염기가 모두 일치</b>하고 바로 옆에 <b>PAM(NGG)</b>이 있는 자리예요. 같은 20염기여도 PAM이 없으면 결합하지 못해요. 10염기는 6.2 × 10⁹ / 4¹⁰ ≈ <b>5900번</b> 우연히 일치하지만, 20염기는 6.2 × 10⁹ / 4²⁰ ≈ <b>0.006번</b>이라 한 곳만 정확히 찾을 수 있어요. 18 / 20 + PAM인 유사 서열에서는 <b>오프타깃</b> 절단이 일어날 수 있어요.',
        },
        {
          type: 'quiz', title: '가이드 RNA와 Cas9의 역할',
          goal: '<b>가이드 RNA</b>와 <b>Cas9</b>의 역할을 바르게 설명한 것은?',
          setup() { setMode('target'); },
          choices: ['Cas9이 표적을 찾고, 가이드 RNA가 DNA를 자른다', '가이드 RNA가 표적 서열과 상보적으로 결합해 자리를 찾고, Cas9이 그 자리의 DNA를 자른다', '가이드 RNA는 잘린 DNA를 이어 붙인다', 'PAM이 없어도 가이드 RNA는 어떤 서열에나 결합해 자른다'],
          answer: 1,
          feedback: ['역할이 반대예요. 자리를 찾는 안내자는 가이드 RNA이고, 자르는 효소가 Cas9이에요.', '', 'DNA를 이어 붙이는 것은 세포의 수리 효소가 해요.', '표적 옆에 PAM(NGG)이 있어야 Cas9이 결합해서 잘라요.'],
          explain: '<b>가이드 RNA</b>는 표적과 상보적으로 결합하는 <b>안내자</b>이고, <b>Cas9</b>은 그 자리의 이중 가닥 DNA를 자르는 <b>가위(효소)</b>예요. 표적 옆의 <b>PAM(NGG)</b>이 있어야 결합해요.',
        },
      ],
    },
    {
      title: '절단과 수리', short: '절단과 수리', icon: '✂️', phase: '모형',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> Cas9이 표적에 결합했어요. 앞 단원 <b>돌연변이와 질병</b>에서 염기의 삽입 · 결실이 읽기틀을 밀어 단백질을 망가뜨린다는 것을 배웠어요.</div><p>Cas9은 표적에서 <b>이중 가닥을 모두</b> 잘라요. 세포는 스스로 수리하는데 ① <b>끝 연결</b>은 잘린 끝을 그대로 이어 붙이며 작은 삽입 · 결실이 생겨 <b>읽기틀 이동</b>으로 유전자가 불활성화되기도 하고, ② <b>주형 DNA</b>를 함께 넣으면 주형을 본떠 <b>정확히 교정</b>해요.</p><p>낫 모양 적혈구병 치료는 원인 변이(<b>HBB</b>)를 고치는 대신, 태아형 글로빈을 꺼 둔 조절 유전자(<b>BCL11A</b>)의 적혈구 특이적 조절 부위를 불활성화해 태아형 헤모글로빈이 다시 만들어지게 하는 <b>발현 조절</b> 방식이에요.</p>',
      features: ['repair'],
      setup() { rpReset(); setMode('repair'); },
      recap: '끝 연결은 작은 삽입 · 결실을 만들어 읽기틀 이동으로 유전자를 불활성화할 수 있고, 주형 DNA를 함께 쓰면 정확한 교정이 가능해요.',
      summary: '<ul><li>Cas9은 표적에서 DNA <b>이중 가닥</b>을 모두 잘라요 (표적 자리: 21번째와 22번째 염기 사이).</li><li><b>끝 연결</b>: 잘린 끝을 그냥 이어 붙여요. 1~2염기 삽입 · 결실(3의 배수가 아닌 변화)은 <b>읽기틀 이동</b> → 정지 코돈 → <b>유전자 불활성화</b>. 3염기 결실은 읽기틀이 유지돼요.</li><li><b>주형 DNA</b>를 함께 넣으면 정확한 교정(예: GTG(Val) → GAG(Glu))이 가능해요.</li><li>낫 모양 적혈구병 치료: 조절 유전자(BCL11A)의 조절 부위를 불활성화해 태아형 헤모글로빈을 다시 만들어요 (원인 변이를 고치지 않고 발현 조절을 바꿈).</li></ul>',
      missions: [
        {
          id: 'ko', title: '읽기틀 이동으로 유전자 불활성화',
          goal: '<b>끝 연결</b>로 수리해 <b>읽기틀이 밀려 정지 코돈이 생기는</b> 결과(유전자 불활성화)를 만드세요.',
          hint: '① 자르기 → 수리 방식 "끝 연결" → ③ 수리 실행. 결과는 매번 달라요. 3염기 결실은 읽기틀이 유지되니 ↺ 다시를 눌러 반복해요.',
          setup() { rpReset(); setMode('repair'); },
          check: () => rpKO(), hold: 0.6,
          status: () => mark(RP.stage >= 1) + ' 절단 &nbsp; ' + mark(!!(RP.res && RP.res.mode === 'nhej')) + ' 끝 연결 수리 &nbsp; ' + mark(rpKO()) + ' 읽기틀 이동 + 정지',
          explain: '끝 연결로 <b>1~2염기가 삽입 · 결실</b>되면 3의 배수가 아니라서 <b>읽기틀이 밀리고</b> 8번째 아미노산부터 모두 달라지며 곧 <b>정지 코돈</b>이 생겨 단백질이 짧아져요 → <b>유전자 불활성화</b>. 3염기 결실은 읽기틀이 유지돼 아미노산 하나만 없어져요.',
        },
        {
          id: 'fix', title: '주형 DNA로 정확히 교정',
          goal: '<b>주형 DNA</b>를 함께 넣어 7번째 아미노산 <b>Val(GTG)</b>을 <b>Glu(GAG)</b>로 정확히 교정하세요.',
          hint: '↺ 다시로 원래 유전자에서 시작해요. ① 자르기 → 수리 방식 "주형 DNA를 함께 넣기" → ③ 수리 실행.',
          setup() { rpReset(); setMode('repair'); },
          check: () => rpFix(), hold: 0.6,
          status: () => mark(RP.stage >= 1) + ' 절단 &nbsp; ' + mark(!!(RP.res && RP.res.mode === 'hdr')) + ' 주형 사용 &nbsp; ' + mark(rpFix()) + ' 7번째 Val → Glu',
          explain: '주형 DNA에는 정상 서열 <b>GAG</b>가 들어 있어서, 세포가 이 주형을 본떠 잘린 자리를 메우면 <b>GTG(Val)가 GAG(Glu)로 정확히 교정</b>돼요. 끝 연결과 달리 삽입 · 결실이 무작위로 생기지 않아요. (낫 모양 적혈구병의 원인 변이와 같은 종류의 점 돌연변이를 흉내 낸 모형이에요.)',
        },
        {
          type: 'quiz', title: '정확한 교정이 가능한 쪽',
          goal: '끝 연결과 주형 DNA를 이용한 수리 중 <b>정확한 교정</b>이 가능한 쪽은?',
          setup() { setMode('repair'); },
          choices: ['끝 연결: 잘린 끝을 이어 붙이므로 항상 원래 서열로 돌아온다', '주형 DNA를 이용한 수리: 주형의 서열을 본떠 원하는 서열로 고칠 수 있다', '둘 다 무작위로 삽입 · 결실이 생겨서 정확한 교정은 불가능하다', '둘 다 Cas9 없이도 저절로 일어난다'],
          answer: 1,
          feedback: ['끝 연결은 이어 붙이는 과정에서 작은 삽입 · 결실이 생기는 일이 많아요.', '', '주형이 있으면 주형을 본떠 정확히 고칠 수 있어요.', '자르는 일은 Cas9이 해요. 수리는 그 뒤에 세포가 해요.'],
          explain: '<b>끝 연결</b>은 작은 삽입 · 결실이 생겨 유전자를 <b>불활성화</b>하는 데 쓰이고, <b>주형 DNA</b>를 함께 넣으면 주형을 본떠 <b>원하는 서열로 정확히 교정</b>할 수 있어요.',
        },
      ],
    },
    {
      title: '치료 사례', short: '치료 사례', icon: '🩸', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 끝 연결로 유전자를 불활성화하는 방법을 확인했어요. 앞 단원의 <b>유전자 발현 조절</b>과 <b>HBB 돌연변이</b>가 연결돼요.</div><p>낫 모양 적혈구병 · β-지중해빈혈은 환자의 <b>조혈모세포</b>를 꺼내 <b>BCL11A</b>의 적혈구 특이적 조절 부위를 편집해 <b>태아형 헤모글로빈</b>이 다시 만들어지게 한 뒤 되돌려 이식해요(2023년 승인). 치료의 <b>흐름</b>과 사례의 <b>단계</b>를 정리하고, <b>체세포 편집</b>과 <b>생식세포 · 배아 편집</b>을 비교해요. (교육용 요약이며 치료 권유가 아니에요)</p>',
      features: ['flow', 'cases', 'soma'],
      setup() { FL.P.reset(); FL.anim = {}; caseSorter.reset(); smReset(); setMode('flow'); },
      recap: '체외 편집 치료는 채취 → 체외 편집 → 편집 확인 → 이식 순서로 진행되고, 승인 · 임상 시험 · 연구 단계를 구분해야 하며, 체세포 편집은 자손에게 유전되지 않아요.',
      summary: '<ul><li><b>체외 편집 치료 흐름</b>: 조혈모세포 채취 → 체외 편집 → 편집 확인 → 환자에게 이식.</li><li><b>낫 모양 적혈구병 · β-지중해빈혈</b>: 승인(2023년). 원인 변이를 고치는 대신 BCL11A의 조절 부위를 편집해 <b>태아형 헤모글로빈</b>이 만들어지게 해요(발현 조절). <b>유전성 눈 질환 · 암 면역 세포 편집</b>: 임상 시험. <b>가축 편집</b>: 연구.</li><li><b>체세포 편집</b>은 환자 한 사람에게만 적용되고 자손에게 유전되지 않아요. <b>생식세포 · 배아 편집</b>은 자손에게 유전돼 윤리 논쟁이 있어요.</li></ul>',
      missions: [
        {
          id: 'flowcase', title: '치료 흐름과 사례 단계', manual: true,
          goal: '<b>🩸 치료 흐름</b> 4단계를 순서대로 쌓고, <b>📋 사례 단계</b>에서 사례 5장을 <b>승인 · 임상 시험 · 연구</b>로 분류하세요.',
          hint: '환자의 세포를 꺼내는 일이 먼저예요. 낫 모양 적혈구병과 β-지중해빈혈은 체외 편집 치료로 승인되었어요. 눈 속에 직접 전달하거나 암 면역 세포를 편집하는 치료는 임상 시험 단계예요.',
          setup() { FL.P.reset(); FL.anim = {}; caseSorter.reset(); setMode('flow'); },
          check() {
            const n = FL.P.order.length;
            if (n < 4) return '🩸 치료 흐름 카드를 4장 모두 쌓아 주세요. (' + n + ' / 4)';
            if (!flOK()) return '치료 흐름의 순서가 맞지 않아요. 환자의 세포를 꺼낸 뒤 무엇을 하고 어떻게 확인해 돌려보낼까요?';
            if (caseSorter.placed < 5) { caseSorter.markBad([]); return '📋 사례 카드를 모두 상자에 넣어 주세요. (' + caseSorter.placed + ' / 5)'; }
            const w = caseWrong();
            if (w.length) { caseSorter.markBad(w.map((c) => c.id)); return '\'' + w[0].short + '\' 카드의 단계를 다시 생각해 보세요. 지금 실제 환자 치료에 쓰이고 있을까요?'; }
            caseSorter.markBad([]); return true;
          },
          explain: '체외 편집 치료는 <b>채취 → 체외 편집 → 편집 확인 → 이식</b> 순서예요. <b>낫 모양 적혈구병 · β-지중해빈혈</b>은 2023년 승인된 치료이고, <b>유전성 눈 질환 · 암 면역 세포 편집</b>은 임상 시험, <b>가축 편집</b>은 연구 단계예요. (교육용 요약이며 치료 권유가 아니에요.)',
        },
        {
          type: 'quiz', title: '체세포 편집은 왜 유전되지 않을까',
          goal: '<b>체세포 편집</b>이 자손에게 유전되지 않는 까닭은?',
          setup() { setMode('soma'); },
          choices: ['편집이 DNA에 아무 변화도 일으키지 않기 때문이다', '편집된 세포가 정자나 난자 같은 생식세포가 아니라 환자의 몸을 이루는 체세포라서 다음 세대로 전달되지 않기 때문이다', '자손은 항상 부모와 다른 DNA를 갖기 때문이다', '체세포는 DNA를 갖고 있지 않기 때문이다'],
          answer: 1,
          feedback: ['편집은 그 세포의 DNA를 바꿔요. 다만 그 세포가 자손으로 전달되지 않을 뿐이에요.', '', '자손은 부모의 생식세포에서 DNA를 물려받아요. 편집된 체세포는 거기에 포함되지 않아요.', '체세포도 DNA를 가지고 있어요.'],
          explain: '유전은 <b>생식세포(정자 · 난자)</b>를 통해 일어나요. 체세포 편집은 환자 몸의 <b>체세포(혈액 줄기세포 등)</b>만 바꾸므로 <b>자손에게 유전되지 않아요</b>. 생식세포 · 배아 편집은 모든 세포와 생식세포가 편집되어 자손에게 유전돼요.',
        },
        {
          type: 'quiz', title: '원인 변이를 고치지 않아도 되는 까닭',
          goal: '낫 모양 적혈구병 치료에서 <b>원인 변이(HBB)를 직접 고치지 않아도</b> 되는 까닭은?',
          setup() { setMode('flow'); },
          choices: ['조절 유전자의 조절 부위를 불활성화해 태아형 글로빈이 다시 만들어지면 정상에 가까운 헤모글로빈이 산소를 운반할 수 있기 때문이다', 'HBB 유전자는 이 질환과 아무 관련이 없기 때문이다', 'Cas9은 변이가 있는 유전자만 자를 수 있기 때문이다', '편집하면 모든 세포가 자손에게 전달되기 때문이다'],
          answer: 0,
          feedback: ['', 'HBB 유전자의 변이가 낫 모양 적혈구병의 원인이에요. 치료는 다른 유전자(BCL11A)의 조절 부위를 바꿔 우회해요.', '이 치료의 표적은 변이가 있는 HBB가 아니라 BCL11A의 조절 부위예요.', '체외 편집은 환자의 체세포만 바꾸고 자손에게 유전되지 않아요.'],
          explain: '태아형 글로빈 유전자는 보통 BCL11A 때문에 꺼져 있어요. 그 <b>조절 부위를 불활성화(끝 연결)</b>하면 <b>태아형 헤모글로빈이 다시 만들어져</b> 낫 모양 헤모글로빈을 대신해요. 원인 변이를 고치는 대신 <b>발현 조절을 바꾸는</b> 방식이에요.',
        },
      ],
    },
    {
      title: '한계와 전망', short: '한계와 전망', icon: '💬', phase: '소통',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 승인된 치료와 임상 시험 · 연구 단계의 사례, 그리고 체세포와 생식세포 편집의 차이를 확인했어요.</div><p>이제 CRISPR 치료의 <b>한계</b>(오프타깃, 모자이크, 전달 방법, 높은 비용과 접근성, 장기 안전성)와 알맞은 <b>대응</b>을 연결하고, 한계를 <b>근거</b>로 들어 <b>전망 문장</b>을 만들어요. 기술의 이익과 한계를 함께 말하는 것이 중요해요.</p>',
      features: ['limits', 'outlook'],
      setup() { limSorter.reset(); olReset(); setMode('limits'); },
      recap: 'CRISPR 치료에는 오프타깃, 모자이크, 전달, 비용, 장기 안전성의 한계가 있고, 각 한계에 대응하는 노력이 더 정밀하고 널리 쓰이는 치료의 전망을 만들어요. 과장된 주장은 근거가 없어요.',
      summary: '<ul><li><b>한계 → 대응</b>: 오프타깃 → 더 정밀한 Cas9 · 가이드 설계와 전체 유전체 검사, 모자이크 → 편집 효율을 높이고 편집된 세포의 비율 확인, 전달 방법 → 체외 편집이나 안전한 전달체, 비용 · 접근성 → 제도적 지원과 생산 기술, 장기 안전성 → 오랜 기간 추적 관찰.</li><li><b>전망</b>: 더 정밀한 편집, 더 많은 질환에 응용. 그러나 "편집하면 모든 유전병이 곧 완치된다"는 주장은 근거가 없어요.</li></ul>',
      missions: [
        {
          id: 'limits', title: '한계와 대응, 전망 문장', manual: true,
          goal: '<b>⚠ 한계와 대응</b>에서 한계 카드 5장을 알맞은 대응에 연결하고, <b>💬 전망 토의</b>에서 <b>전망 · 한계 · 대응</b>이 이어진 문장을 완성하세요.',
          hint: '오프타깃은 정밀도, 모자이크는 편집 효율, 전달은 체외 편집이나 전달체, 비용은 제도와 생산 기술, 장기 안전성은 추적 관찰로 대응해요. 전망 문장의 한계와 대응은 짝이 맞아야 해요.',
          setup() { limSorter.reset(); olReset(); setMode('limits'); },
          check() {
            if (limSorter.placed < 5) { limSorter.markBad([]); return '⚠ 한계 카드를 모두 대응 상자에 넣어 주세요. (' + limSorter.placed + ' / 5)'; }
            const w = limWrong();
            if (w.length) { limSorter.markBad(w.map((c) => c.id)); return '\'' + w[0].short + '\' 카드에 알맞은 대응을 다시 생각해 보세요.'; }
            limSorter.markBad([]);
            const n = [OL.a, OL.b, OL.c].filter(Boolean).length;
            if (n < 3) return '💬 전망 토의에서 전망 · 한계 · 대응을 모두 골라 주세요. (' + n + ' / 3)';
            const a = olGet(OPT_A, OL.a);
            if (!a[2]) return '"편집하면 모든 유전병이 곧 완전히 치료된다"는 근거 없는 과장이에요. 다른 전망을 골라 보세요.';
            if (OL.b !== OL.c) return '고른 한계와 대응이 짝이 맞지 않아요. 그 한계를 줄이는 대응을 골라 보세요.';
            return true;
          },
          explain: '<b>오프타깃</b>은 더 정밀한 Cas9 · 가이드 설계와 검사로, <b>모자이크</b>는 편집 효율과 편집 비율 확인으로, <b>전달</b>은 체외 편집이나 안전한 전달체로, <b>비용</b>은 제도적 지원과 생산 기술로, <b>장기 안전성</b>은 오랜 추적 관찰로 대응해요. 한계를 근거로 들고 대응을 함께 말하면 균형 잡힌 전망이 돼요.',
        },
        {
          type: 'quiz', title: '오프타깃 위험을 줄이는 방법',
          goal: 'Cas9이 의도하지 않은 곳을 자르는 <b>오프타깃</b> 위험을 줄이는 방법으로 알맞은 것은?',
          setup() { setMode('target'); },
          choices: ['가이드 RNA를 10염기로 짧게 만든다', '유사한 서열이 적은 특이적인 가이드를 설계하고 정밀도가 높은 Cas9을 쓰며, 편집 뒤 의도하지 않은 변화를 검사한다', 'PAM이 없는 곳에만 Cas9을 보낸다', '편집을 여러 번 반복한다'],
          answer: 1,
          feedback: ['10염기는 유전체에서 약 5900번 우연히 일치해서 오히려 오프타깃이 늘어요.', '', 'PAM이 없으면 Cas9이 결합하지 못해 표적도 편집되지 않아요.', '반복하면 의도하지 않은 곳이 잘릴 기회가 오히려 늘어요.'],
          explain: '유사 서열(예: 18 / 20 + PAM)에서 의도하지 않은 절단이 생길 수 있으므로 <b>특이적인 가이드 설계, 정밀도가 높은 Cas9, 편집 뒤 유전체 검사</b>로 오프타깃 위험을 줄여요. 가이드가 짧으면(10염기) 오히려 일치 횟수가 늘어요.',
        },
        {
          type: 'quiz', title: '"모든 유전병이 완전히 치료된다"는 주장',
          goal: '"유전자 편집을 하면 <b>모든 유전병이 완전히 치료된다</b>"는 주장의 문제는?',
          setup() { setMode('outlook'); },
          choices: ['오프타깃, 모자이크, 전달, 높은 비용, 장기 안전성 같은 한계를 무시한 과장이고, 질환마다 치료 단계가 다르기 때문이다', '유전자 편집은 어떤 질환에도 쓰일 수 없기 때문이다', '편집은 자손에게만 효과가 있기 때문이다', '유전병은 환경 때문에만 생기기 때문이다'],
          answer: 0,
          feedback: ['', '낫 모양 적혈구병 · β-지중해빈혈처럼 승인된 치료도 있어요.', '체세포 편집은 환자 본인에게 적용돼요.', '유전병은 유전자의 변화가 원인이 되는 질환이에요.'],
          explain: '유전자 편집은 일부 질환에서 승인된 치료가 있지만, <b>한계</b>(오프타깃, 모자이크, 전달, 높은 비용과 접근성, 장기 안전성)가 있고 질환마다 <b>승인 · 임상 시험 · 연구</b> 단계가 달라서 "모든 유전병이 완전히 치료된다"는 말은 과장이에요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hg-gene-editing', mount: '#game', badge: '유전자 편집 연구가', homeHref: '../../index.html#hg',
    featureLabels: { target: '🎯 표적 찾기', calc: '🔢 일치 횟수 계산', repair: '✂️ 절단과 수리', flow: '🩸 치료 흐름', cases: '📋 사례 단계', soma: '👪 체세포와 생식세포', limits: '⚠ 한계와 대응', outlook: '💬 전망 토의' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 읽음 칸 ---------- */
  function readouts() {
    const m = S.mode;
    if (m === 'target') { const q = tgQ(), inf = tgInfo(q); setReads(['위치', (q + 1) + '번째 염기', '가이드와 일치', inf.m + ' / 20', 'PAM · 결합', inf.pam + (inf.pamOK ? ' (PAM)' : ' (아님)') + ' · ' + (inf.bind ? '결합' : '결합 안 함')]); }
    else if (m === 'calc') setReads(['가이드 길이', CL.L + '염기', '가능한 서열', '4' + sup(CL.L) + ' = ' + (CL.L <= 10 ? fmtN(cl4(CL.L)) : sci(cl4(CL.L), 2)), '입력 확인', (CL.ok10 ? '10염기 ✓ ' : '10염기 — ') + (CL.ok20 ? '20염기 ✓' : '20염기 —')]);
    else if (m === 'repair') setReads(['단계', RP.stage === 0 ? '결합' : RP.stage === 1 ? '절단' : '수리 완료', '수리 방식', RP.mode ? (RP.mode === 'hdr' ? '주형 DNA' : '끝 연결') : '—', '결과', RP.res ? (RP.res.mode === 'hdr' ? 'Val → Glu 교정' : RP.res.t + (RP.res.dead ? ' · 불활성화' : ' · 유지')) : '—']);
    else if (m === 'flow') setReads(['쌓은 카드', FL.P.order.length + ' / 4', '순서', flOK() ? '완성' : '쌓는 중', '다음 할 일', flOK() ? '사례 분류' : '카드 쌓기']);
    else if (m === 'cases') setReads(['넣은 카드', caseSorter.placed + ' / 5', '맞게 넣은 카드', caseSorter.cards.filter((c) => c.zone === c.own).length + '장', '고른 카드', caseSorter.selected ? caseSorter.selected.short : '—']);
    else if (m === 'soma') setReads(['보는 세대', SM.gen ? '자손' : '부모', '체세포 편집', SM.gen ? '유전 안 됨' : '—', '생식세포 편집', SM.gen ? '유전됨' : '—']);
    else if (m === 'limits') setReads(['넣은 카드', limSorter.placed + ' / 5', '맞게 넣은 카드', limSorter.cards.filter((c) => c.zone === c.id).length + '장', '고른 카드', limSorter.selected ? limSorter.selected.short : '—']);
    else setReads(['고른 카드', [OL.a, OL.b, OL.c].filter(Boolean).length + ' / 3', '한계와 대응', OL.b && OL.c ? (OL.b === OL.c ? '짝이 맞아요' : '짝이 달라요') : '—', '전망 문장', olOK() ? '완성' : '—']);
  }

  /* ---------- 시작 ---------- */
  tgReset(); clReset(); rpReset(); flInit(); smReset();
  setMode('target');
  let lastFree = false, lastLv = -1, lastKey = '';
  SciSim.loop((dt, t) => {
    clock = t; S.t = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (game && game.level !== lastLv) { lastLv = game.level; updateCtl(); }
    const key = RP.stage + '|' + (RP.mode || '') + '|' + (OL.a + OL.b + OL.c) + '|' + (TG.boundOnce ? 1 : 0) + '|' + (TG.scan ? 1 : 0);
    if (key !== lastKey) { lastKey = key; updateCtl(); }
    view.apply(); ctx.clearRect(0, 0, VW, VH);
    bgFill('#eef4f2', '#e3ece8');
    switch (S.mode) {
      case 'target': tgDraw(dt, t); break;
      case 'calc': clDraw(dt, t); break;
      case 'repair': rpDraw(dt, t); break;
      case 'flow': flDraw(dt, t); break;
      case 'cases': caseDraw(dt, t); break;
      case 'soma': smDraw(dt, t); break;
      case 'limits': limDraw(dt, t); break;
      case 'outlook': olDraw(dt, t); break;
    }
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(241,246,243,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, PHONE, get game() { return game; }, levels, setMode, updateCtl, TG, tgInfo, tgSet, tgSync, tgQ, CANDS, GENOME, TARGET, CL, clOK10, clOK20, RP, rpCut, rpRepair, rpKO, rpFix, rpReset, OUTS, HDR_SEQ, GENE, translate,
    FL, flOK, FLOW, caseSorter, CASE5, caseWrong, SM, limSorter, LIMS, limWrong, OL, olOK, olSentence, OPT_A, OPT_B, OPT_C, parseBig,
  };
})();
