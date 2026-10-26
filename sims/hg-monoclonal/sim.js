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
     고등학교 생물의 유전 · Ⅲ. 생명공학기술 - 단일클론항체 (단원 61, 2차시)
     성취기준 [12유전03-02] 단일클론항체, 줄기세포, 유전자 편집 기술이 난치병 치료에 활용된 사례를 조사하고, 이러한 치료법의 전망에 대해 협력적으로 소통할 수 있다.
     ① 관찰: 항원·항체  ② 모형: 하이브리도마  ③ 적용: 치료 사례  ④ 소통: 전망
     (치료 사례는 교육용 요약이고, 96칸 판 · 융합 효율 수치는 예시 값이에요)
     ========================================================= */
  const S = { mode: 'ab', fade: 0, t: 0 };
  let game = null;
  const rnd = mulberry(20240927);
  const ease = SciSim.ease;
  const INK = '#26324a';
  const EPI = { x: { col: '#ef4444', shape: 'tri', name: 'x' }, y: { col: '#2563eb', shape: 'sq', name: 'y' }, z: { col: '#16a34a', shape: 'circ', name: 'z' }, w: { col: '#f59e0b', shape: 'dia', name: 'w' } };
  /* 결정기 · 항체 팔 끝 그리기 */
  function epiShape(k, x, y, s, a) {
    const e = EPI[k]; ctx.save(); ctx.translate(x, y); ctx.rotate(a || 0);
    ctx.fillStyle = e.col; ctx.strokeStyle = C.shade(e.col, -0.35); ctx.lineWidth = 1.4;
    ctx.beginPath();
    if (e.shape === 'tri') { ctx.moveTo(0, -s); ctx.lineTo(s * 0.95, s * 0.75); ctx.lineTo(-s * 0.95, s * 0.75); ctx.closePath(); }
    else if (e.shape === 'sq') { ctx.rect(-s * 0.8, -s * 0.8, s * 1.6, s * 1.6); }
    else if (e.shape === 'dia') { ctx.moveTo(0, -s * 1.05); ctx.lineTo(s * 0.9, 0); ctx.lineTo(0, s * 1.05); ctx.lineTo(-s * 0.9, 0); ctx.closePath(); }
    else ctx.arc(0, 0, s * 0.9, 0, TAU);
    ctx.fill(); ctx.stroke(); ctx.restore();
  }
  /* Y자 항체: 팔 끝(위쪽)이 결정기와 만나요. rot=0이면 팔 끝이 위를 향해요 */
  function antibody(x, y, rot, k, sc, alpha) {
    sc = sc || 1; const col = EPI[k].col;
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(sc, sc); ctx.globalAlpha = alpha == null ? 1 : alpha;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = C.shade(col, -0.3); ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(0, 15); ctx.lineTo(0, 2); ctx.moveTo(0, 2); ctx.lineTo(-10, -12); ctx.moveTo(0, 2); ctx.lineTo(10, -12); ctx.stroke();
    ctx.strokeStyle = col; ctx.lineWidth = 4.4; ctx.beginPath(); ctx.moveTo(0, 15); ctx.lineTo(0, 2); ctx.moveTo(0, 2); ctx.lineTo(-10, -12); ctx.moveTo(0, 2); ctx.lineTo(10, -12); ctx.stroke();
    epiShape(k, -10, -14, 3.6, 0); epiShape(k, 10, -14, 3.6, 0);
    ctx.restore();
  }

  /* ===================== ① 항원과 항체 ===================== */
  const ABG = PHONE
    ? { A: { x: 124, y: 196, r: 50 }, B: { x: 356, y: 196, r: 42 }, box: { x: 8, y: 50, w: 464, h: 282 }, tube: { x: 240, y: 74 }, tab: { y: 346 } }
    : { A: { x: 250, y: 220, r: 70 }, B: { x: 566, y: 220, r: 56 }, box: { x: 14, y: 52, w: 772, h: 336 }, tube: { x: 408, y: 80 }, tab: { y: 402 } };
  const SITES = { /* 각도(도): 바깥쪽 방향 */
    A: [['x', -150], ['x', -100], ['y', -35], ['y', 20], ['z', 100], ['z', 160]],
    B: [['y', -60], ['y', 15], ['z', 115], ['z', 185]],
  };
  const AB = { run: null, results: { poly: null, mono: null }, tubeKind: null };
  function siteList() {
    const out = [];
    ['A', 'B'].forEach((ag) => SITES[ag].forEach(([k, deg], i) => { const g = ABG[ag], a = deg * Math.PI / 180; out.push({ ag, k, a, i, taken: false, px: g.x + Math.cos(a) * (g.r + 12), py: g.y + Math.sin(a) * (g.r + 12) }); }));
    return out;
  }
  function abRun(kind) {
    if (AB.run && !AB.run.done) return;
    const sites = siteList(), types = kind === 'poly' ? ['x', 'y', 'z'] : ['x'], per = kind === 'poly' ? 4 : 6;
    const abs = [];
    types.forEach((k, ti) => { for (let n = 0; n < per; n++) abs.push({ k, state: 'fly', delay: (ti * per + n) * 0.17, x: ABG.tube.x + (rnd() - 0.5) * 24, y: ABG.tube.y + 16, rot: 0, tx: 0, ty: 0, site: null, sc: 0.01, wob: rnd() * 6 }); });
    abs.forEach((ab) => {
      const s = sites.find((q) => q.k === ab.k && !q.taken);
      if (s) { s.taken = true; ab.site = s; ab.tx = s.px + Math.cos(s.a) * 17; ab.ty = s.py + Math.sin(s.a) * 17; ab.trot = s.a - Math.PI / 2; }
      else { const b = ABG.box; ab.tx = b.x + 40 + rnd() * (b.w - 80); ab.ty = b.y + b.h - 36 - rnd() * 70; ab.trot = (rnd() - 0.5) * 3; }
    });
    AB.run = { kind, t: 0, abs, done: false, sites };
    AB.tubeKind = kind; Sound.click(); updateCtl();
  }
  function abFinish() {
    const R = AB.run; R.done = true;
    const on = (ag) => R.sites.filter((s) => s.ag === ag && s.taken).length;
    const res = { kind: R.kind, a: on('A'), aTot: SITES.A.length, b: on('B'), bTot: SITES.B.length, kinds: [...new Set(R.sites.filter((s) => s.taken).map((s) => s.k))].sort() };
    AB.results[R.kind] = res; Sound.success(); updateCtl();
  }
  function abReset() { AB.run = null; AB.results = { poly: null, mono: null }; AB.tubeKind = null; updateCtl(); }
  const abBoth = () => !!(AB.results.poly && AB.results.mono);
  function abUpdate(dt) {
    const R = AB.run; if (!R || R.done) return;
    R.t += dt; let busy = false;
    R.abs.forEach((ab) => {
      if (R.t < ab.delay) { busy = true; return; }
      if (ab.state === 'fly') {
        busy = true; ab.sc = approach(ab.sc, 1, dt, 10);
        const k = 1 - Math.exp(-2.6 * dt); ab.x += (ab.tx - ab.x) * k; ab.y += (ab.ty - ab.y) * k + Math.sin(R.t * 6 + ab.wob) * 0.25;
        ab.rot = approach(ab.rot, ab.trot, dt, 5);
        if (Math.hypot(ab.tx - ab.x, ab.ty - ab.y) < 2.5) {
          ab.x = ab.tx; ab.y = ab.ty; ab.rot = ab.trot;
          if (ab.site) { ab.state = 'bound'; ab.pop = 1; parts.burst(ab.site.px, ab.site.py, { count: 5, speed: 60, life: 0.4, size: 2.5, colors: [EPI[ab.k].col, '#fff'] }); Sound.tick(); } else { ab.state = 'free'; ab.fx = ab.tx; ab.fy = ab.ty; }
        }
      } else if (ab.state === 'free') { ab.rot += Math.sin(R.t * 1.5 + ab.wob) * dt * 0.4; ab.x = ab.fx + Math.sin(R.t * 1.1 + ab.wob) * 5; ab.y = ab.fy + Math.cos(R.t * 0.9 + ab.wob) * 4; }
      if (ab.pop) ab.pop = Math.max(0, ab.pop - dt * 3);
    });
    if (!busy) abFinish();
  }
  function blob(cx, cy, r, col, o) {
    o = o || {}; const N = 44;
    ctx.save();
    const g = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.1, cx, cy, r * 1.1); g.addColorStop(0, C.shade(col, 0.5)); g.addColorStop(0.6, col); g.addColorStop(1, C.shade(col, -0.25));
    ctx.beginPath();
    for (let i = 0; i <= N; i++) { const a = i / N * TAU, rr = r * (1 + 0.05 * Math.sin(a * 5 + (o.ph || 0)) + 0.03 * Math.sin(a * 3 + 1)); ctx[i ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); }
    ctx.closePath(); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = C.shade(col, -0.4); ctx.lineWidth = 2.2; ctx.stroke();
    ctx.restore();
  }
  function abDraw(dt, t) {
    abUpdate(dt);
    const b = ABG.box, R = AB.run;
    TF(VW / 2, 26, '같은 항원에 두 종류의 항체를 넣어 어디에 붙는지 비교해요', VW - 24, PHONE ? 14 : 16, 11.5, INK, 'center', 800);
    D.roundRect(b.x, b.y, b.w, b.h, 16); const lg = ctx.createLinearGradient(0, b.y, 0, b.y + b.h); lg.addColorStop(0, '#eaf4fb'); lg.addColorStop(1, '#d6e9f7'); ctx.fillStyle = lg; ctx.fill(); ctx.strokeStyle = '#b6d3e6'; ctx.lineWidth = 2; ctx.stroke();
    /* 항원 */
    [['A', '#a78bfa', '항원 A', PHONE ? '암세포의 단백질' : '암세포 표면의 단백질'], ['B', '#fb923c', '단백질 B', PHONE ? '정상 세포의 단백질' : '정상 세포의 비슷한 단백질']].forEach(([ag, col, name, sub]) => {
      const g = ABG[ag];
      blob(g.x, g.y, g.r, col, { ph: ag === 'A' ? 0 : 2 });
      SITES[ag].forEach(([k, deg]) => { const a = deg * Math.PI / 180; ctx.save(); ctx.strokeStyle = C.shade(col, -0.35); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(g.x + Math.cos(a) * g.r * 0.95, g.y + Math.sin(a) * g.r * 0.95); ctx.lineTo(g.x + Math.cos(a) * (g.r + 7), g.y + Math.sin(a) * (g.r + 7)); ctx.stroke(); ctx.restore(); epiShape(k, g.x + Math.cos(a) * (g.r + 12), g.y + Math.sin(a) * (g.r + 12), 7, a + Math.PI / 2); });
      T(g.x, g.y - 2, name, PHONE ? 14 : 17, '#fff', 'center', 800, { stroke: C.shade(col, -0.35), strokeWidth: 3 }); T(g.x, g.y + (PHONE ? 15 : 18), sub, PHONE ? 11 : 12.5, '#fff', 'center', 800, { stroke: C.shade(col, -0.35), strokeWidth: 3 });
    });
    /* 시험관 */
    const tb = ABG.tube;
    D.testTube(tb.x, tb.y - 40, 26, 62, { level: 0.7, liquid: '#fde68a' });
    if (AB.tubeKind === 'poly') { ['x', 'y', 'z'].forEach((k, i) => antibody(tb.x - 10 + i * 10, tb.y - 6 - i * 3, 0, k, 0.5)); }
    else if (AB.tubeKind === 'mono') { for (let i = 0; i < 3; i++) antibody(tb.x - 10 + i * 10, tb.y - 6 - i * 3, 0, 'x', 0.5); }
    T(tb.x + 24, tb.y - 6, AB.tubeKind === 'poly' ? '다클론 항체 혼합물' : AB.tubeKind === 'mono' ? '단일클론 항체' : '항체 시험관', PHONE ? 12 : 13.5, '#475569', 'left', 800);
    /* 항체 */
    if (R) R.abs.forEach((ab) => { if (R.t < ab.delay) return; antibody(ab.x, ab.y, ab.rot, ab.k, (ab.sc || 1) * (1 + (ab.pop || 0) * 0.25)); });
    /* 범례 */
    const ly = b.y + b.h - 14;
    [['x', 'x 결정기'], ['y', 'y 결정기'], ['z', 'z 결정기']].forEach(([k, lab], i) => { const lx = b.x + 24 + i * (PHONE ? 100 : 130); epiShape(k, lx, ly, 6.5, 0); T(lx + 14, ly + 4.5, lab, PHONE ? 11.5 : 13, '#475569', 'left', 800); });
    /* 결과 표 */
    abTable(ABG.tab.y);
  }
  function abTable(y0) {
    const w = VW - 24, rows = [['poly', '다클론 항체'], ['mono', '단일클론 항체']];
    const cw = [w * 0.28, w * 0.22, w * 0.22, w * 0.28];
    D.roundRect(12, y0, w, PHONE ? 140 : 140, 12); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#d5deea'; ctx.lineWidth = 1.6; ctx.stroke();
    const heads = ['항체', '항원 A에 결합한 자리', '단백질 B에 결합한 자리', '인식한 결정기'];
    let x = 12;
    heads.forEach((h, i) => { TF(x + cw[i] / 2, y0 + 24, h, cw[i] - 8, PHONE ? 11.5 : 13, 9.5, '#64748b', 'center', 800); x += cw[i]; });
    ctx.strokeStyle = '#e2e8f0'; ctx.beginPath(); ctx.moveTo(20, y0 + 36); ctx.lineTo(12 + w - 8, y0 + 36); ctx.stroke();
    rows.forEach(([k, name], r) => {
      const res = AB.results[k], yy = y0 + 70 + r * 46; x = 12;
      const vals = [name, res ? res.a + ' / ' + res.aTot : '—', res ? res.b + ' / ' + res.bTot : '—', res ? res.kinds.join(' · ') + ' (' + res.kinds.length + '종류)' : '—'];
      vals.forEach((v, i) => { TF(x + cw[i] / 2, yy, v, cw[i] - 8, i === 0 ? (PHONE ? 13 : 15) : (PHONE ? 14 : 17), 10, i === 0 ? INK : (res ? (i === 2 && res.b === 0 ? '#16a34a' : INK) : '#94a3b8'), 'center', 800); x += cw[i]; });
    });
  }


  /* ===================== ② 5단계 순서 ===================== */
  const STEPS5 = [
    { id: 'inj', label: '항원 주사', icon: '💉', col: '#ef4444', desc: '생쥐에게 항원을 주사해 B 세포가 항체를 만들게 해요.' },
    { id: 'spl', label: '비장 B 세포 분리', icon: '🧫', col: '#f59e0b', desc: '항체를 만드는 B 세포를 비장에서 분리해요.' },
    { id: 'fus', label: '골수종 세포와 융합', icon: '🔗', col: '#16a34a', desc: 'B 세포와 골수종 세포를 융합해 하이브리도마를 만들어요.' },
    { id: 'hat', label: '선택 배지 배양', icon: '🧪', col: '#2563eb', desc: '융합하지 못한 세포를 없애고 하이브리도마만 키워요.' },
    { id: 'scr', label: '항체 검사 · 클론 증식', icon: '🔍', col: '#7c3aed', desc: '원하는 항체를 만드는 하나의 클론을 골라 대량으로 키워요.' },
  ];
  const OD = { P: null, anim: {} };
  function odInit() {
    const shuffled = [STEPS5[3], STEPS5[0], STEPS5[4], STEPS5[2], STEPS5[1]];
    OD.P = seqPicker($('#odPool'), $('#odSeq'), STEPS5.map((q) => ({ id: q.id, label: q.label })), () => updateCtl());
    OD.P.setPool(shuffled.map((q) => ({ id: q.id, label: q.label }))); OD.P.render(); OD.anim = {};
  }
  const odOK = () => OD.P && OD.P.ok(STEPS5.map((q) => q.id));
  function odDraw(dt, t) {
    TF(VW / 2, 28, odOK() ? '하이브리도마 5단계가 완성됐어요!' : '일어나는 순서대로 카드를 눌러 5단계를 완성해요', VW - 24, PHONE ? 14 : 16, 11.5, INK, 'center', 800);
    const n = 5, order = OD.P.order;
    for (let i = 0; i < n; i++) {
      const id = order[i], st = id ? STEPS5.find((q) => q.id === id) : null;
      const a = st ? (OD.anim[id] = approach(OD.anim[id] == null ? 0 : OD.anim[id], 1, dt, 9)) : 0;
      let x, y, w, h;
      if (PHONE) { w = VW - 24; h = 98; x = 12; y = 52 + i * (h + 8); } else { w = 140; h = 330; x = (VW - (n * w + (n - 1) * 12)) / 2 + i * (w + 12); y = 100; }
      D.roundRect(x, y, w, h, 14);
      if (!st) { ctx.fillStyle = 'rgba(148,163,184,.12)'; ctx.fill(); ctx.setLineDash([7, 5]); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; ctx.stroke(); ctx.setLineDash([]); T(x + w / 2, y + h / 2 + 12, String(i + 1), 44, 'rgba(148,163,184,.5)', 'center', 800); }
      else {
        ctx.save(); const sc = 0.88 + 0.12 * a; ctx.translate(x + w / 2, y + h / 2); ctx.scale(sc, sc); ctx.translate(-w / 2, -h / 2); ctx.globalAlpha = a;
        flatCard(0, 0, w, h, 14, '#fff', 0); ctx.strokeStyle = st.col; ctx.lineWidth = 3; D.roundRect(0, 0, w, h, 14); ctx.stroke();
        D.roundRect(0, 0, w, 8, 4); ctx.fillStyle = st.col; ctx.fill();
        D.sphere(PHONE ? 26 : w / 2, PHONE ? 49 : 40, 15, st.col, { text: String(i + 1) });
        E(st.icon, PHONE ? 66 : w / 2, PHONE ? 49 : 84, PHONE ? 30 : 34);
        if (PHONE) { T(94, 40, st.label, 15, INK, 'left', 800); wrap(st.desc, w - 110, 12.5, 700).slice(0, 3).forEach((l, k) => T(94, 60 + k * 16, l, 12.5, '#475569', 'left', 700)); }
        else { wrap(st.label, w - 20, 15, 800).forEach((l, k) => T(w / 2, 128 + k * 19, l, 15, INK, 'center', 800)); wrap(st.desc, w - 22, 13, 700).slice(0, 7).forEach((l, k) => T(w / 2, 190 + k * 17, l, 13, '#475569', 'center', 700)); }
        ctx.restore();
      }
      if (i < n - 1) { if (PHONE) D.arrow(VW / 2, y + h + 1, VW / 2, y + h + 8, { color: '#94a3b8', width: 3, head: 7 }); else D.arrow(x + w + 1, y + h / 2, x + w + 11, y + h / 2, { color: '#94a3b8', width: 3, head: 7 }); }
    }
    if (!PHONE) T(VW / 2, 470, odOK() ? '항원 주사 → 비장 B 세포 분리 → 융합 → 선택 배지 → 항체 검사' : '카드를 쌓으면 이 자리에 단계 설명이 나타나요', 14, '#64748b', 'center', 800);
  }

  /* ===================== ② 하이브리도마 만들기 ===================== */
  const BCOL4 = [['x', '#ef4444'], ['w', '#f59e0b'], ['z', '#16a34a'], ['y', '#2563eb']];
  const CR = PHONE ? 11 : 15;
  const HBP = (fx, fy) => ({ x: fx * VW, y: fy * VH });
  const HBG = {
    mouse: HBP(0.16, 0.52), sp: Object.assign(HBP(0.68, 0.46), { r: PHONE ? 58 : 94 }),
    dB: Object.assign(HBP(PHONE ? 0.25 : 0.25, 0.5), { r: PHONE ? 100 : 118 }), dM: Object.assign(HBP(PHONE ? 0.75 : 0.75, 0.5), { r: PHONE ? 100 : 118 }),
    fd: Object.assign(HBP(0.5, PHONE ? 0.5 : 0.5), { r: PHONE ? 205 : 160 }),
  };
  const FUS_U = { b5: [-0.3, 0.1], b6: [0.15, 0.55], b7: [-0.55, 0.62], m5: [0.3, -0.02], m6: [-0.05, -0.38], m7: [0.5, 0.78], h0: [-0.55, -0.55], h2: [0.1, -0.8], h3: [0.72, -0.35], bb: [-0.75, 0.12], mm: [0.72, 0.38] };
  const PAIRS = [['b0', 'm0', 'h0', 'h'], ['b2', 'm1', 'h2', 'h'], ['b3', 'm2', 'h3', 'h'], ['b1', 'b4', 'bb', 'f'], ['m3', 'm4', 'mm', 'f']];
  const HB = { stage: 0, tS: 0, pred: null, cells: [], inj: 0, grown: false, merged: false, plate: 0, flask: 0 };
  const POS8 = [26, 31, 49, 56, 62, 77, 82, 91];   /* 96칸 판에서 양성인 칸(0~95) */
  const hbCell = (id) => HB.cells.find((c) => c.id === id);
  function hbInit() {
    HB.stage = 0; HB.tS = 0; HB.pred = null; HB.inj = 0; HB.grown = false; HB.merged = false; HB.plate = 0; HB.flask = 0; HB.kids = [];
    HB.cells = [];
    for (let i = 0; i < 8; i++) { const [k, col] = BCOL4[i % 4]; HB.cells.push({ id: 'b' + i, type: 'b', k, col, x: 0, y: 0, tx: 0, ty: 0, a: 1, aT: 1, dead: false, dieAt: 0, dyT: 0, role: 'B' }); }
    for (let i = 0; i < 8; i++) HB.cells.push({ id: 'm' + i, type: 'm', k: null, col: '#8b5cf6', x: 0, y: 0, tx: 0, ty: 0, a: 0, aT: 0, dead: false, dieAt: 0, dyT: 0, role: 'M' });
    hbTargets(true);
  }
  function hbTargets(snap) {
    const st = HB.stage, G = HBG;
    HB.cells.forEach((c) => {
      const i = +c.id.slice(1);
      let p = { x: c.tx, y: c.ty }, aT = c.aT;
      if (c.type === 'b' || c.id[0] === 'b') {
        if (st <= 1) { const ang = i / 8 * TAU + 0.3, rr = G.sp.r * (i % 2 ? 0.62 : 0.4); p = { x: G.sp.x + Math.cos(ang) * rr, y: G.sp.y + Math.sin(ang) * rr }; aT = 1; }
        else if (st === 2) { p = { x: G.dB.x + (i % 2 ? 1 : -1) * G.dB.r * 0.32, y: G.dB.y + (Math.floor(i / 2) - 1.5) * G.dB.r * 0.42 }; aT = 1; }
      } else if (c.id[0] === 'm') {
        if (st <= 1) { p = { x: G.dM.x, y: G.dM.y }; aT = 0; }
        else if (st === 2) { p = { x: G.dM.x + (i % 2 ? 1 : -1) * G.dM.r * 0.32, y: G.dM.y + (Math.floor(i / 2) - 1.5) * G.dM.r * 0.42 }; aT = 1; }
      }
      if (st >= 3) { /* 융합 접시: 융합 전 위치(짝은 나란히)와 융합 뒤 위치 */
        const pr = PAIRS.find((q) => q[0] === c.id || q[1] === c.id), fd = G.fd;
        const fin = (u) => ({ x: fd.x + u[0] * fd.r * 0.8, y: fd.y + u[1] * fd.r * 0.8 });
        if (pr) { const u = FUS_U[pr[2]], f = fin(u), sgn = pr[0] === c.id ? -1 : 1; p = HB.merged ? f : { x: f.x + sgn * CR * 0.95, y: f.y }; aT = (HB.merged && pr[1] === c.id) ? 0 : 1; }
        else { p = fin(FUS_U[c.id]); aT = 1; }
      }
      if (st >= 5) aT = 0;
      c.tx = p.x; c.ty = p.y; c.aT = aT;
      if (snap) { c.x = p.x; c.y = p.y; c.a = aT; }
    });
  }
  /* 세포 종류 (융합 뒤) */
  function cellKind(c) {
    const pr = PAIRS.find((q) => q[0] === c.id);
    if (HB.merged && pr) return pr[3] === 'h' ? 'h' : (pr[2] === 'bb' ? 'bb' : 'mm');
    return c.id[0] === 'b' ? 'b' : 'm';
  }
  function hbDrawCell(c, x, y, r, kind, a, sc) {
    ctx.save(); ctx.globalAlpha = clamp(a, 0, 1); ctx.translate(x, y); ctx.scale(sc || 1, sc || 1);
    const pr = PAIRS.find((q) => q[0] === c.id), wob = Math.sin(clock * 2 + x * 0.05) * 0.6;
    const body = (bx, bw, bh, fill, line) => { D.roundRect(bx - bw, -bh, bw * 2, bh * 2, bh); ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = line; ctx.lineWidth = 2.2; ctx.stroke(); };
    if (kind === 'b') {
      body(0, r, r, C.mix('#ffffff', c.col, 0.28), c.col);
      ctx.fillStyle = C.shade(c.col, -0.15); ctx.beginPath(); ctx.arc(-r * 0.12, wob * 0.3, r * 0.58, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.arc(-r * 0.35, -r * 0.3, r * 0.18, 0, TAU); ctx.fill();
      antibody(r * 0.95, -r * 0.8, 0.9, c.k, 0.34); antibody(-r * 0.95, -r * 0.8, -0.9, c.k, 0.34);
    } else if (kind === 'm') {
      body(0, r * 1.08, r * 1.08, '#ddd6fe', '#7c3aed');
      ctx.fillStyle = '#6d28d9'; ctx.beginPath(); for (let k = 0; k <= 8; k++) { const ang = k / 8 * TAU, rr = r * (0.62 + 0.08 * Math.sin(k * 2.3)); ctx[k ? 'lineTo' : 'moveTo'](Math.cos(ang) * rr, Math.sin(ang) * rr); } ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.beginPath(); ctx.arc(-r * 0.4, -r * 0.35, r * 0.18, 0, TAU); ctx.fill();
    } else if (kind === 'h') {
      body(0, r * 1.15, r * 1.15, '#e9d5ff', c.col); ctx.strokeStyle = c.col; ctx.lineWidth = 3.4; D.roundRect(-r * 1.15, -r * 1.15, r * 2.3, r * 2.3, r * 1.15); ctx.stroke();
      ctx.fillStyle = C.mix('#6d28d9', c.col, 0.45); ctx.beginPath(); ctx.arc(0, wob * 0.3, r * 0.72, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.beginPath(); ctx.arc(-r * 0.45, -r * 0.45, r * 0.2, 0, TAU); ctx.fill();
      antibody(r * 1.1, -r * 0.9, 0.9, c.k, 0.38); antibody(-r * 1.1, -r * 0.9, -0.9, c.k, 0.38);
    } else if (kind === 'bb') {
      const o = hbCell('b4'); body(0, r * 1.95, r, '#fef3c7', '#b45309');
      ctx.fillStyle = C.shade(c.col, -0.15); ctx.beginPath(); ctx.arc(-r * 0.85, 0, r * 0.55, 0, TAU); ctx.fill(); ctx.fillStyle = C.shade(o.col, -0.15); ctx.beginPath(); ctx.arc(r * 0.85, 0, r * 0.55, 0, TAU); ctx.fill();
    } else if (kind === 'mm') {
      body(0, r * 2.05, r * 1.05, '#ddd6fe', '#7c3aed'); ctx.fillStyle = '#6d28d9'; ctx.beginPath(); ctx.arc(-r * 0.9, 0, r * 0.6, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.arc(r * 0.9, 0, r * 0.6, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }
  const HB_BTN = ['① 항원 주사하기', '② 비장에서 B 세포 분리하기', '③ 골수종 세포와 융합하기', '④ 선택 배지에서 키우기', '⑤ 항체 검사하고 클론 키우기', '✅ 단일클론항체 생산 중'];
  function hbNext() {
    if (HB.stage >= 5) return;
    if (HB.stage === 3 && !HB.pred) { showHint('먼저 "선택 배지에서 살아남아 증식할 세포"를 예측해서 골라요.'); Sound.fail(); return; }
    Sound.click(); HB.stage++; HB.tS = 0; HB.merged = false; HB.grown = false;
    if (HB.stage === 4) { HB.cells.forEach((c) => { c.dieAt = 0.5 + rnd() * 1.4; c.dyT = 0; c.dead = false; }); }
    hbTargets(false); updateCtl();
  }
  function hbReset() { hbInit(); parts.clear(); hideHint(); updateCtl(); }
  /* 선택 배지에서 살아남는 세포인지 (하이브리도마만) */
  const hbSurvivor = (c) => { const pr = PAIRS.find((q) => q[0] === c.id); return !!pr && pr[3] === 'h'; };
  function hbCount() {
    const alive = HB.cells.filter((c) => c.a > 0.05 && !c.dead);
    const n = { b: 0, m: 0, h: 0, f: 0 };
    if (HB.stage < 3) return n;
    alive.forEach((c) => { const k = cellKind(c); if (k === 'b') n.b++; else if (k === 'm') n.m++; else if (k === 'h') n.h++; else n.f++; });
    return n;
  }
  function hbUpdate(dt) {
    HB.tS += dt;
    if (HB.stage === 1) HB.inj = Math.min(1, HB.inj + dt / 1.6); else if (HB.stage < 1) HB.inj = 0;
    if (HB.stage === 3 && !HB.merged && HB.tS > 1.45) { HB.merged = true; HB.cells.forEach((c) => { const pr = PAIRS.find((q) => q[0] === c.id); if (pr) { parts.burst(HB.fusX(pr[2]).x, HB.fusX(pr[2]).y, { count: 7, speed: 70, life: 0.5, size: 2.4, colors: ['#fde047', '#fff'] }); } }); Sound.tick(); hbTargets(false); }
    HB.cells.forEach((c) => {
      const k = RM ? 1 : 1 - Math.exp(-3.2 * dt); c.x += (c.tx - c.x) * k; c.y += (c.ty - c.y) * k; c.a += (c.aT - c.a) * (RM ? 1 : 1 - Math.exp(-6 * dt));
      if (HB.stage === 4 && !c.dead && c.a > 0.05 && !hbSurvivor(c) && HB.tS > c.dieAt) { c.dyT += dt / 0.7; if (c.dyT >= 1) { c.dead = true; parts.emit({ x: c.x, y: c.y, vy: -10, life: 0.8, size: 12, grow: 12, color: '#cbd5e1', shape: 'smoke' }); } }
    });
    if (HB.stage >= 4 && !HB.grown && HB.tS > 2.6) { HB.grown = true; Sound.success(); }
    if (HB.stage === 5) { HB.plate = Math.min(1, HB.plate + dt / 2.4); HB.flask = Math.min(1, HB.flask + dt / 3); }
  }
  HB.fusX = (id) => { const u = FUS_U[id], fd = HBG.fd; return { x: fd.x + u[0] * fd.r * 0.8, y: fd.y + u[1] * fd.r * 0.8 }; };
  function plateGeom() {
    const pitch = PHONE ? 30 : 32, r = PHONE ? 11 : 12;
    return { pitch, r, x0: PHONE ? 62 : 74, y0: PHONE ? 112 : 110 };
  }
  function drawPlate(g, o) {
    /* o.reveal: 드러난 칸 수, o.pick: 고른 칸 번호 */
    const w = g.pitch * 12 + 28, h = g.pitch * 8 + 34, px = g.x0 - 36, py = g.y0 - 36;
    D.shadow(() => { D.roundRect(px, py, w + 14, h + 14, 14); ctx.fillStyle = '#eef2f7'; ctx.fill(); }, { blur: 6, y: 2 }); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; D.roundRect(px, py, w + 14, h + 14, 14); ctx.stroke();
    for (let c = 0; c < 12; c++) T(g.x0 + c * g.pitch, g.y0 - 16, String(c + 1), 11.5, '#64748b', 'center', 800);
    for (let r = 0; r < 8; r++) T(g.x0 - 22, g.y0 + r * g.pitch + 4, 'ABCDEFGH'[r], 12, '#64748b', 'center', 800);
    for (let i = 0; i < 96; i++) {
      const cc = i % 12, rr = Math.floor(i / 12), x = g.x0 + cc * g.pitch, y = g.y0 + rr * g.pitch, shown = i < o.reveal, pos = POS8.indexOf(i) >= 0;
      ctx.beginPath(); ctx.arc(x, y, g.r, 0, TAU);
      if (!shown) { ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1.5; ctx.stroke(); }
      else if (pos) { const gg = ctx.createRadialGradient(x - 3, y - 3, 1, x, y, g.r); gg.addColorStop(0, '#fca5a5'); gg.addColorStop(1, '#ef4444'); ctx.fillStyle = gg; ctx.fill(); ctx.strokeStyle = '#b91c1c'; ctx.lineWidth = 1.8; ctx.stroke(); }
      else { ctx.fillStyle = '#f1f5f9'; ctx.fill(); ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1.5; ctx.stroke(); }
      if (o.pick === i) { D.ring(x, y, g.r + 4, clock, { color: '#f59e0b', width: 3 }); }
    }
  }
  function hbDraw(dt, t) {
    hbUpdate(dt);
    const st = HB.stage, G = HBG;
    const title = ['준비: 생쥐와 항원 (결정기 ▲ x · ■ y · ● z)', '항원을 만난 B 세포들이 각각 다른 항체를 만들어요', 'B 세포와 골수종 세포를 준비했어요', '융합 뒤에는 여러 종류의 세포가 섞여 있어요', '선택 배지에서는 하이브리도마만 살아남아 증식해요', '원하는 항체를 만드는 칸을 골라 단일 클론으로 키워요'][st];
    TF(VW / 2, 28, title, VW - 24, PHONE ? 14 : 16, 11, INK, 'center', 800);
    if (st <= 1) {
      /* 생쥐 + 주사기 + 비장 */
      const m = G.mouse;
      E('🐭', m.x, m.y, PHONE ? 70 : 100);
      const inj = ease.inOutCubic(st === 1 ? clamp(HB.inj * 1.5, 0, 1) : 0);
      const sx = lerp(m.x + (PHONE ? 100 : 150), m.x + (PHONE ? 38 : 56), inj), sy = lerp(m.y - 70, m.y - 18, inj);
      E('💉', sx, sy, PHONE ? 40 : 50, { rot: -0.7 });
      ['x', 'y', 'z'].forEach((k, i) => { const p = st === 1 ? clamp(HB.inj * 1.3 - i * 0.12, 0, 1) : 0; const px = lerp(sx - 10, m.x + 6, ease.inCubic(p)), py = lerp(sy + 14, m.y, ease.inCubic(p)); epiShape(k, px + i * 8 - 8, py + i * 4, 6, 0); if (st === 0) epiShape(k, sx + 6 + i * 11, sy - 22, 6, 0); });
      T(m.x, m.y + (PHONE ? 52 : 72), '생쥐', 15, INK, 'center', 800);
      /* 비장 */
      const sp = G.sp, show = st === 1 ? clamp(HB.inj * 1.4 - 0.5, 0, 1) : 0.28;
      ctx.save(); ctx.globalAlpha = 0.35 + 0.65 * show;
      blob(sp.x, sp.y, sp.r + 14, '#fecaca', { ph: 1 }); ctx.restore();
      T(sp.x, sp.y - sp.r - 22, '비장 (B 세포가 많은 곳)', PHONE ? 12.5 : 14, '#9f1239', 'center', 800);
      if (st === 1) D.arrow(m.x + (PHONE ? 50 : 70), m.y - 10, sp.x - sp.r - 20, sp.y, { color: '#be123c', width: 3, dash: [7, 6], alpha: show });
    }
    /* 세포들 */
    const rr = CR;
    if (st >= 1 && st <= 4) {
      if (st === 2) { [['dB', 'B 세포 접시', '항체 O · 수명이 짧아요'], ['dM', '골수종 세포 접시', '항체 X · 무한히 증식해요']].forEach(([k, name, sub]) => { const d = G[k]; ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, TAU); ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fill(); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2.5; ctx.stroke(); T(d.x, d.y - d.r - 24, name, PHONE ? 14 : 16, INK, 'center', 800); T(d.x, d.y - d.r - 7, sub, PHONE ? 11.5 : 13, '#64748b', 'center', 800); }); }
      if (st >= 3) { const f = G.fd; ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, TAU); const gg = ctx.createRadialGradient(f.x, f.y - f.r * 0.3, f.r * 0.1, f.x, f.y, f.r); gg.addColorStop(0, st >= 4 ? C.mix('#fff7d6', '#fed7aa', clamp(HB.tS / 0.8, 0, 1)) : '#fffbea'); gg.addColorStop(1, st >= 4 ? '#fde0a3' : '#fdf0c4'); ctx.fillStyle = gg; ctx.fill(); ctx.strokeStyle = '#d6c27a'; ctx.lineWidth = 3; ctx.stroke(); }
      HB.cells.forEach((c) => {
        if (c.a < 0.02 || c.dead) return;
        let kind = cellKind(c), sc = 1, a = c.a;
        if (st === 4 && c.dyT > 0) { sc = 1 - 0.55 * c.dyT; a *= 1 - c.dyT; }
        if (st === 3 && HB.merged) { const pr = PAIRS.find((q) => q[0] === c.id); if (pr) sc = 1 + 0.25 * Math.max(0, 1 - (HB.tS - 1.45) * 3); }
        hbDrawCell(c, c.x, c.y, rr, kind, a, sc);
      });
      /* 증식한 클론 */
      if (st >= 4 && HB.grown) { const age = clamp((HB.tS - 2.6) / 0.6, 0, 1); PAIRS.filter((q) => q[3] === 'h').forEach((q) => { const c = hbCell(q[0]); for (let k = 0; k < 3; k++) { const ang = k * TAU / 3 + 0.5, d = rr * 2.5 * ease.outBack(age); hbDrawCell(c, c.x + Math.cos(ang) * d, c.y + Math.sin(ang) * d, rr, 'h', age, 1); } }); }
      if (st === 4 && HB.tS < 0.6) T(G.fd.x, G.fd.y + G.fd.r + 22, '선택 배지를 넣어요', 14, '#b45309', 'center', 800);
    }
    /* 범례와 숫자 */
    if (st >= 3) {
      const cnt = hbCount(), hybN = cnt.h * (HB.grown && HB.tS > 3.2 ? 4 : 1);
      const items = [['B 세포', cnt.b, 'b'], ['골수종 세포', cnt.m, 'm'], ['하이브리도마', hybN, 'h'], ['융합 실패 세포', cnt.f, 'f']];
      const ly = PHONE ? VH - 62 : VH - 54, lw = (VW - 24 - 18) / 4;
      items.forEach(([lab, n, k], i) => {
        const x = 12 + i * (lw + 6);
        D.roundRect(x, ly, lw, PHONE ? 52 : 44, 10); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = st >= 4 && k === 'h' ? '#16a34a' : '#d5deea'; ctx.lineWidth = 2; ctx.stroke();
        const sw = { b: '#ef4444', m: '#8b5cf6', h: '#a855f7', f: '#b45309' }[k];
        D.sphere(x + 15, ly + (PHONE ? 16 : 22), 8, sw, {});
        TF(x + 28, ly + (PHONE ? 20 : 27), lab, lw - 34, PHONE ? 11.5 : 13, 9, INK, 'left', 800);
        if (PHONE) T(x + lw / 2, ly + 44, n + '개', 15, k === 'h' ? '#15803d' : INK, 'center', 800); else T(x + lw - 10, ly + 28, n + '개', 15, k === 'h' ? '#15803d' : INK, 'right', 800);
      });
      if (st === 3 && HB.merged) TF(VW / 2, PHONE ? 52 : 52, '실제 융합 효율은 아주 낮아요: B 세포 10⁸개 × 10⁻⁵ ≈ 하이브리도마 약 10³개', VW - 20, PHONE ? 12.5 : 14, 10, '#7e22ce', 'center', 800);
      if (st === 4 && HB.grown) TF(VW / 2, PHONE ? 52 : 52, '살아남은 하이브리도마 3개가 각각 증식해 4개씩이 되었어요 (3 × 4 = 12개)', VW - 20, PHONE ? 12.5 : 14, 10, '#15803d', 'center', 800);
    }
    if (st >= 5) hbScreen(t);
  }
  /* ⑤ 항체 검사와 클론 증식 */
  function hbScreen(t) {
    const g = plateGeom(), reveal = Math.floor(HB.plate * 96);
    const posShown = POS8.filter((i) => i < reveal).length;
    drawPlate(g, { reveal, pick: HB.plate >= 1 ? POS8[0] : -1 });
    TF(g.x0 + 5.5 * g.pitch, g.y0 + 8 * g.pitch + 22, '96칸 중 양성 ' + posShown + '칸 (원하는 항체가 있어요)' + (HB.plate >= 1 ? ' → 한 칸을 골라 단일 클론으로' : ''), PHONE ? 440 : 420, PHONE ? 12.5 : 14, 10, '#b91c1c', 'center', 800);
    /* 플라스크: 같은 항체가 쌓여요 */
    const fx = PHONE ? VW / 2 : VW - 150, fy = PHONE ? VH - 90 : VH - 92;
    if (HB.plate >= 1 || HB.flask > 0) {
      const lvl = 0.25 + 0.5 * HB.flask;
      D.flask(fx, fy, PHONE ? 110 : 150, PHONE ? 110 : 150, { level: lvl, liquid: '#fde68a', t });
      const n = Math.floor(HB.flask * 14);
      for (let i = 0; i < n; i++) antibody(fx - (PHONE ? 30 : 42) + (i % 5) * (PHONE ? 15 : 21), fy - (PHONE ? 34 : 46) + Math.floor(i / 5) * (PHONE ? 15 : 20) + Math.sin(t * 1.6 + i) * 2, Math.sin(t + i) * 0.2, 'x', 0.55);
      TF(fx, fy + 22, '단일클론항체 (모두 같은 항체 ' + n + '개 표시)', PHONE ? 300 : 230, PHONE ? 13 : 13.5, 10, '#b91c1c', 'center', 800);
    }
  }


  /* ===================== ③ 치료 사례 / 96칸 판 ===================== */
  function pairSorter(items, boxMap, order, cardH) {
    const n = items.length;
    const bh = PHONE ? 0 : Math.floor((VH - 74 - 12 - (n - 1) * 8) / n);
    const boxes = order.map((id, k) => {
      if (PHONE) { const cardRows = Math.ceil(n / 2), y0 = 64 + cardRows * (cardH + 8) + 8, h = Math.floor((VH - y0 - 8 - (n - 1) * 6) / n); return { id, label: boxMap[id], col: (items.find((q) => q.id === id) || { col: '#64748b' }).col, x: 10, y: y0 + k * (h + 6), w: VW - 20, h, cols: 1, hdr: 24 }; }
      return { id, label: boxMap[id], col: (items.find((q) => q.id === id) || { col: '#64748b' }).col, x: 316, y: 66 + k * (bh + 8), w: VW - 316 - 16, h: bh, cols: 1, hdr: 24 };
    });
    return selectable({
      cards: items, boxes, cw: PHONE ? 228 : 276, ch: cardH, kh: PHONE ? 26 : 36,
      tray: (i) => (PHONE ? { x: 10 + (i % 2) * 236, y: 62 + Math.floor(i / 2) * (cardH + 8) } : { x: 20, y: 66 + i * (bh + 8) + (bh - cardH) / 2 }),
      onChange() { updateCtl(); },
    });
  }
  const CASES = [
    { id: 'her2', label: 'HER2가 많은 유방암', short: 'HER2 유방암', sub: '표적 HER2 · 승인', icon: '🎗️', col: '#db2777' },
    { id: 'cd20', label: 'CD20를 가진 림프종', short: 'CD20 림프종', sub: '표적 CD20 · 승인', icon: '🩸', col: '#dc2626' },
    { id: 'tnf', label: '류마티스 관절염 · 크론병', short: '염증 질환', sub: '표적 TNF-α · 승인', icon: '🦴', col: '#ea580c' },
    { id: 'vir', label: '바이러스 감염', short: '바이러스 감염', sub: '표적 바이러스 표면 단백질 · 승인/비상 사용', icon: '🦠', col: '#0d9488' },
    { id: 'kit', label: '임신 · 감염병 검사 키트', short: '검사 키트', sub: '표적 호르몬 · 항원 · 생활 제품', icon: '🧪', col: '#2563eb' },
  ];
  const CASE_BOX = { prolif: '증식 신호 차단', immune: '면역 세포 유도', inflam: '염증 신호 중화', virus: '바이러스 중화', diag: '진단' };
  const CASE_ANS = { her2: 'prolif', cd20: 'immune', tnf: 'inflam', vir: 'virus', kit: 'diag' };
  const CASE_ORDER = ['virus', 'prolif', 'diag', 'inflam', 'immune'];
  const CASE_COL = { prolif: '#db2777', immune: '#dc2626', inflam: '#ea580c', virus: '#0d9488', diag: '#2563eb' };
  const caseSorter = (() => {
    const items = CASES.map((c) => Object.assign({}, c, { col: CASE_COL[CASE_ANS[c.id]] }));
    const so = pairSorter(items, CASE_BOX, CASE_ORDER, PHONE ? 54 : 62);
    so.boxes.forEach((b) => { b.col = CASE_COL[b.id]; });
    return so;
  })();
  const casePT = sorterPT(() => caseSorter);
  const caseWrong = () => caseSorter.cards.filter((c) => c.zone && c.zone !== CASE_ANS[c.id]);
  function caseDraw(dt) {
    caseSorter.update(dt);
    TF(VW / 2, 28, '사례 카드를 알맞은 "작용 방식" 상자에 넣어요', VW - 24, PHONE ? 14 : 16, 11.5, INK, 'center', 800);
    caseSorter.draw();
    T(VW / 2, VH - 8, caseSorter.selected ? '카드를 골랐어요! 놓을 상자를 눌러요' : '교육용 요약이에요. 치료를 권하는 내용이 아니에요', PHONE ? 12 : 13, caseSorter.selected ? '#b45309' : '#94a3b8', 'center', 800);
  }
  /* ---- 96칸 판 ---- */
  const PL = { run: false, reveal: 0, pick: -1 };
  function plReset() { PL.run = false; PL.reveal = 0; PL.pick = -1; $('#plRate').value = ''; $('#plRate').classList.remove('ok'); updateCtl(); }
  function plRun() { if (PL.run) return; PL.run = true; PL.reveal = 0; Sound.click(); updateCtl(); }
  const plDone = () => PL.run && PL.reveal >= 96;
  const plPos = () => POS8.filter((i) => i < Math.floor(PL.reveal)).length;
  function plRatePct() { const v = parseFrac($('#plRate').value); return isFinite(v) ? (v > 1 ? v : v * 100) : NaN; }
  const plRateOK = () => { const v = plRatePct(); return isFinite(v) && Math.abs(v - 800 / 96) <= 0.15; };
  const plPT = {
    down(p) {
      if (!plDone()) return false;
      const g = plateGeom();
      for (let i = 0; i < 96; i++) { const x = g.x0 + (i % 12) * g.pitch, y = g.y0 + Math.floor(i / 12) * g.pitch; if (Math.hypot(p.x - x, p.y - y) <= g.r + 3) { if (POS8.indexOf(i) >= 0) { PL.pick = i; Sound.success(); } else { showHint('양성(빨강) 칸을 눌러야 해요.'); Sound.fail(); } break; } }
      return false;
    },
    hover(p) { if (!plDone()) return 'default'; const g = plateGeom(); for (let i = 0; i < 96; i++) if (Math.hypot(p.x - (g.x0 + (i % 12) * g.pitch), p.y - (g.y0 + Math.floor(i / 12) * g.pitch)) <= g.r + 3) return 'pointer'; return 'default'; },
  };
  function plDraw(dt, t) {
    if (PL.run && PL.reveal < 96) PL.reveal = RM ? 96 : Math.min(96, PL.reveal + dt * 40);
    const g = plateGeom(), reveal = Math.floor(PL.reveal);
    TF(VW / 2, 28, '96칸 판: 칸마다 하이브리도마 클론을 키웠어요 (예시)', VW - 24, PHONE ? 14 : 16, 11.5, INK, 'center', 800);
    drawPlate(g, { reveal, pick: PL.pick });
    const pos = plPos();
    /* 오른쪽(또는 아래) 안내 */
    const rx = PHONE ? 20 : 500, ry = PHONE ? g.y0 + 8 * g.pitch + 18 : 100, rw = PHONE ? VW - 40 : 285;
    panel(rx, ry, rw, PHONE ? 112 : 170, 12, '#fff');
    D.sphere(rx + 22, ry + 26, 9, '#ef4444', {}); T(rx + 38, ry + 31, '양성: 원하는 항체가 있어요', 13.5, INK, 'left', 800);
    D.roundRect(rx + 13, ry + 46, 18, 18, 9); ctx.fillStyle = '#f1f5f9'; ctx.fill(); ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1.5; ctx.stroke(); T(rx + 38, ry + 60, '음성: 없어요', 13.5, INK, 'left', 800);
    T(rx + 14, ry + 90, '양성 칸  ' + pos + ' 칸  /  전체 96칸', 15, plDone() ? '#b91c1c' : '#64748b', 'left', 800);
    if (!PHONE) { TF(rx + 14, ry + 118, plDone() ? '양성(빨강) 칸 하나를 눌러 보세요' : (PL.run ? '검사하는 중…' : '검사를 실행해요'), rw - 24, 13.5, 10, '#64748b', 'left', 700); }
    /* 단일 클론화 */
    if (PL.pick >= 0 && !PHONE) {
      const dy = ry + 186;
      panel(rx, dy, rw, 150, 12, '#fff');
      TF(rx + 14, dy + 24, '고른 칸 ' + 'ABCDEFGH'[Math.floor(PL.pick / 12)] + (PL.pick % 12 + 1) + ' → 한 칸에 세포 1개 이하로 희석', rw - 24, 13, 9.5, INK, 'left', 800);
      const cnt = [1, 0, 1, 1, 0, 1];
      cnt.forEach((n, i) => { const x = rx + 34 + (i % 3) * 56, y = dy + 58 + Math.floor(i / 3) * 40; ctx.beginPath(); ctx.arc(x, y, 15, 0, TAU); ctx.fillStyle = '#f8fafc'; ctx.fill(); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; ctx.stroke(); if (n) D.sphere(x, y, 7, '#a855f7', {}); });
      D.arrow(rx + 190, dy + 78, rx + 246, dy + 78, { color: '#16a34a', width: 3, head: 9 });
      TF(rx + 14, dy + 138, '세포 1개에서 자란 하나의 클론이 단일클론항체를 만들어요', rw - 24, 12.5, 9.5, '#15803d', 'left', 800);
    } else if (PL.pick >= 0 && PHONE) {
      TF(VW / 2, VH - 18, '고른 칸의 세포를 한 칸에 1개 이하로 희석해 단일 클론으로 키워요', VW - 24, 12.5, 9.5, '#15803d', 'center', 800);
    }
  }

  /* ===================== ④ 전망 토의 ===================== */
  const OPT_A = [['a1', '표적만 정확히 공격해 정상 세포 손상이 비교적 적다는', true], ['a2', '진단 키트로 빠르게 쓸 수 있다는', true], ['a3', '모든 종류의 암에 똑같이 효과가 있다는', false]];
  const OPT_B = [['b1', '제조 비용이 높다는', true], ['b2', '마우스 항체가 사람에게 면역 반응을 일으킬 수 있다는', true], ['b3', '표적이 변하면 내성이 생길 수 있다는', true], ['b4', '정상 세포를 가리지 않고 모두 파괴한다는', false]];
  const OPT_C = [['c1', '항체–약물 접합체', true], ['c2', '이중 특이 항체', true], ['c3', '항체를 많이 쓰면 한계가 모두 사라진다는 주장', false]];
  const OL = { a: '', b: '', c: '', pop: { a: 0, b: 0, c: 0 } };
  const olGet = (list, v) => list.find((q) => q[0] === v);
  function olReset() { OL.a = OL.b = OL.c = ''; OL.pop = { a: 0, b: 0, c: 0 }; ['olA', 'olB', 'olC'].forEach((id) => { $('#' + id).value = ''; }); updateCtl(); }
  const olOK = () => { const a = olGet(OPT_A, OL.a), b = olGet(OPT_B, OL.b), c = olGet(OPT_C, OL.c); return !!(a && b && c && a[2] && b[2] && c[2]); };
  function olSentence() {
    const a = olGet(OPT_A, OL.a), b = olGet(OPT_B, OL.b), c = olGet(OPT_C, OL.c);
    return '단일클론항체 치료는 ' + (a ? a[1] : '( … )') + ' 장점이 있지만 ' + (b ? b[1] : '( … )') + ' 한계가 있어서, ' + (c ? c[1] + (c[2] ? josa(c[1], '으로', '로') : '') : '( … )') + ' 보완될 것으로 전망돼요.';
  }
  function olDraw(dt, t) {
    TF(VW / 2, 28, '모둠 3명이 카드를 모아 "이 치료법의 전망"을 완성해요', VW - 24, PHONE ? 14 : 16, 11.5, INK, 'center', 800);
    const roles = [['a', '학생 1', '장점', '#16a34a', OPT_A], ['b', '학생 2', '한계', '#dc2626', OPT_B], ['c', '학생 3', '새로운 기술', '#2563eb', OPT_C]];
    const cw = PHONE ? VW - 24 : (VW - 24 - 20) / 3, chH = PHONE ? 108 : 190;
    roles.forEach(([k, who, role, col, list], i) => {
      const x = PHONE ? 12 : 12 + i * (cw + 10), y = PHONE ? 46 + i * (chH + 8) : 52;
      OL.pop[k] = approach(OL.pop[k], OL[k] ? 1 : 0, dt, 9);
      const opt = olGet(list, OL[k]), bad = opt && !opt[2];
      flatCard(x, y, cw, chH, 14, '#fff', 0); ctx.strokeStyle = bad ? '#dc2626' : col; ctx.lineWidth = 2.6; D.roundRect(x, y, cw, chH, 14); ctx.stroke();
      person(x + 26, y + 34, 30, col, { }); T(x + 52, y + 26, who, 14, INK, 'left', 800); D.label(x + 52, y + 46, role + ' 카드', { bg: col, size: 12, pad: 7, align: 'left' });
      if (opt) {
        ctx.save(); ctx.globalAlpha = OL.pop[k]; const sc = 0.92 + 0.08 * OL.pop[k]; ctx.translate(x + cw / 2, y + chH * 0.66); ctx.scale(sc, sc);
        wrap(opt[1] + (k === 'c' && opt[2] ? '' : ''), cw - 26, 14, 800).slice(0, PHONE ? 2 : 6).forEach((l, j, arr) => T(0, (j - (arr.length - 1) / 2) * 19 + 4, l, 14, bad ? '#b91c1c' : INK, 'center', 800));
        ctx.restore();
        if (bad) T(x + cw - 12, y + 26, '✖ 근거가 없어요', 12.5, '#dc2626', 'right', 800);
      } else TF(x + cw / 2, y + chH * 0.68, '카드를 골라요', cw - 20, 14, 10, '#94a3b8', 'center', 800);
    });
    /* 전망 문장 */
    const sy = PHONE ? 46 + 3 * (chH + 8) : 52 + chH + 14, sh = VH - sy - 12;
    panel(12, sy, VW - 24, sh, 14, olOK() ? '#f0fdf4' : '#fff'); ctx.strokeStyle = olOK() ? '#16a34a' : '#d5deea'; ctx.lineWidth = 2.2; D.roundRect(12, sy, VW - 24, sh, 14); ctx.stroke();
    T(26, sy + 28, '💬 우리 모둠의 전망 문장', 15, '#15803d', 'left', 800);
    wrap(olSentence(), VW - 60, PHONE ? 14 : 16, 800).slice(0, 5).forEach((l, i) => T(26, sy + 56 + i * (PHONE ? 20 : 24), l, PHONE ? 14 : 16, INK, 'left', 800));
    if (olOK()) { D.label(VW - 26, sy + sh - 22, '근거 2개: 장점 · 한계', { bg: '#16a34a', size: 13, align: 'right', pad: 9 }); }
  }


  /* =========================================================
     화면 전환 · 조작 연결
     ========================================================= */
  const PTS = { cases: casePT, plate: plPT };
  function setMode(m) {
    if (S.mode !== m) S.fade = 1;
    S.mode = m; PT = PTS[m] || null; hideHint(); updateCtl();
  }
  const ctlNodes = $$('#ctrlCard .control');
  fillSel($('#olA'), OPT_A.map((q) => [q[0], q[1].replace(/는$/, '')]), '카드를 골라요');
  fillSel($('#olB'), OPT_B.map((q) => [q[0], q[1].replace(/는$/, '')]), '카드를 골라요');
  fillSel($('#olC'), OPT_C.map((q) => [q[0], q[1]]), '카드를 골라요');
  const PRED = { b: 'B 세포', m: '골수종 세포', h: '하이브리도마', f: '융합 실패 세포' };
  function updateCtl() {
    const fr = game ? game.free : false, lvNow = game ? game.level : 0;
    ctlNodes.forEach((n) => { n.hidden = (n.dataset.modes || '').split(' ').indexOf(S.mode) < 0; });
    modeButtons(S.mode, lvNow, fr);
    const busy = !!(AB.run && !AB.run.done);
    $('#abPoly').disabled = busy; $('#abMono').disabled = busy;
    $('#abPoly').classList.toggle('btn-good', !!AB.results.poly); $('#abMono').classList.toggle('btn-good', !!AB.results.mono);
    $('#hbPredBox').hidden = HB.stage < 3;
    $$('#hbPred button').forEach((b) => b.classList.toggle('on', HB.pred === b.dataset.v));
    $('#hbNext').textContent = HB_BTN[HB.stage]; $('#hbNext').disabled = HB.stage >= 5;
    const notes = ['항원을 주사하면 생쥐의 B 세포가 항체를 만들기 시작해요.', '항원을 만난 B 세포들은 클론마다 서로 다른 항체를 만들어요. (색이 달라요)', 'B 세포는 항체를 만들지만 오래 못 살고, 골수종 세포는 무한히 증식해요.', '융합하지 못한 세포와 엉뚱하게 융합한 세포도 섞여 있어요. 선택 배지에서 누가 살아남을지 예측해요.', '선택 배지에서 살아남은 세포가 증식해요. 예측과 비교해 보세요.', '96칸 판에서 원하는 항체를 만드는 칸을 찾아 한 클론만 대량으로 키워요.'];
    $('#hbNote').textContent = notes[HB.stage];
    $('#plRun').disabled = PL.run; $('#plCalc').hidden = !plDone();
    $('#plNote').innerHTML = !PL.run ? '칸마다 하이브리도마 클론을 키운 판이에요. 항체 검사로 원하는 항체를 만드는 칸을 찾아요.' : !plDone() ? '검사하는 중이에요…' : '빨강(양성) 칸을 세어 보고, 양성 칸을 눌러 단일 클론화도 살펴봐요.';
  }
  bindModes(setMode);
  $('#abPoly').addEventListener('click', () => abRun('poly')); $('#abMono').addEventListener('click', () => abRun('mono'));
  $('#abReset').addEventListener('click', () => { Sound.click(); abReset(); });
  $('#odReset').addEventListener('click', () => { Sound.click(); OD.P.reset(); OD.anim = {}; });
  $('#hbNext').addEventListener('click', hbNext); $('#hbReset').addEventListener('click', () => { Sound.click(); hbReset(); });
  $$('#hbPred button').forEach((b) => b.addEventListener('click', () => { Sound.click(); HB.pred = b.dataset.v; updateCtl(); }));
  $('#caseReset').addEventListener('click', () => { Sound.click(); caseSorter.reset(); });
  $('#plRun').addEventListener('click', plRun); $('#plReset').addEventListener('click', () => { Sound.click(); plReset(); });
  $('#plRate').addEventListener('input', () => { $('#plRate').classList.toggle('ok', plRateOK()); updateCtl(); });
  [['olA', 'a'], ['olB', 'b'], ['olC', 'c']].forEach(([id, k]) => $('#' + id).addEventListener('change', (e) => { OL[k] = e.target.value; Sound.click(); updateCtl(); }));
  $('#olReset').addEventListener('click', () => { Sound.click(); olReset(); });

  /* =========================================================
     미션
     ========================================================= */
  const levels = [
    {
      title: '항원과 항체', short: '항원·항체', icon: '🔬', phase: '관찰',
      intro: '<p class="si-q">❓ 탐구 질문: 수많은 세포 중 암세포만 골라 공격하려면 어떤 "유도 미사일"이 필요할까?</p><p>🔗 <b>생명과학</b>에서 항원 · 항체 반응(백신, 혈액형)을, <b>통합과학</b>에서 항원 검사를 만났어요. 항체는 B 림프구가 만드는 단백질이고, 항원의 특정 부위인 <b>항원 결정기</b>에 열쇠와 자물쇠처럼 결합해요.</p><p>이번에는 <b>다클론 항체</b>(여러 결정기를 인식하는 혼합물)와 <b>단일클론 항체</b>(한 가지 결정기만 인식)를 암세포의 단백질 A와 정상 세포의 비슷한 단백질 B에 넣어 비교해요.</p>',
      features: ['ab'],
      setup() { abReset(); setMode('ab'); },
      recap: '다클론 항체는 여러 결정기에 결합하고, 단일클론 항체는 한 가지 결정기에만 결합해서 표적을 더 정확히 구분해요.',
      summary: '<ul><li><b>항체</b>는 B 림프구가 만드는 단백질로, 항원의 특정 부위(<b>항원 결정기</b>)에만 특이적으로 결합해요 (열쇠–자물쇠).</li><li><b>다클론 항체</b>: 여러 B 세포 클론이 만든 항체의 혼합물이라 여러 결정기(x · y · z)를 인식해요. 비슷한 단백질 B에도 붙을 수 있어요(A 6자리 · B 4자리).</li><li><b>단일클론 항체</b>: 한 클론이 만든 같은 항체라 한 가지 결정기(x)만 인식해요. 항원 A의 x 2자리에만 붙고 B에는 붙지 않아요.</li></ul>',
      missions: [
        {
          id: 'ab', title: '다클론 vs 단일클론 결합 비교',
          goal: '두 종류의 항체를 <b>모두</b> 넣어 항원 A와 단백질 B의 <b>몇 자리</b>에 결합하는지 비교하세요.',
          hint: '위쪽 버튼으로 다클론 항체와 단일클론 항체를 한 번씩 넣어요. 표의 숫자(A와 B에 결합한 자리)를 비교해 보세요.',
          setup() { abReset(); setMode('ab'); },
          check: () => abBoth(), hold: 0.5,
          status: () => mark(!!AB.results.poly) + ' 다클론 항체 &nbsp; ' + mark(!!AB.results.mono) + ' 단일클론 항체',
          explain: '다클론 항체는 x · y · z <b>세 종류</b>의 결정기에 모두 붙어서 항원 A의 <b>6자리 전부</b>, 비슷한 단백질 B의 <b>4자리 전부</b>에 결합해요. 단일클론 항체(x)는 <b>한 종류</b>의 결정기에만 붙어서 항원 A의 x <b>2자리</b>에만 결합하고 B에는 <b>0자리</b>예요. 그래서 암세포의 단백질만 골라 표적으로 삼을 수 있어요.',
        },
        {
          type: 'quiz', title: '표적을 더 정확히 구분하는 까닭',
          goal: '단일클론 항체가 다클론 항체보다 <b>표적을 더 정확히 구분</b>하는 까닭은?',
          setup() { setMode('ab'); },
          choices: ['항원의 모든 결정기에 한꺼번에 결합하기 때문이다', '다클론 항체는 항원에 결합하지 못하기 때문이다', '한 종류의 B 세포 클론이 만든 같은 항체라 한 가지 결정기에만 결합하기 때문이다', '항원과 결합하지 않고 항원을 직접 파괴하기 때문이다'],
          answer: 2,
          feedback: ['모든 결정기에 붙는 것은 다클론 항체의 특징이에요. 그래서 비슷한 단백질에도 붙을 수 있어요.', '다클론 항체도 결합해요. 다만 여러 결정기에 붙어 구분력이 떨어져요.', '', '항체는 항원에 결합하는 단백질이에요. 파괴는 결합한 뒤 면역 세포 등이 해요.'],
          explain: '단일클론 항체는 <b>한 클론</b>이 만든 같은 항체라 <b>한 가지 결정기</b>에만 결합해요. 이 결정기를 가진 표적만 골라서 인식하므로 비슷한 단백질과도 구분할 수 있어요.',
        },
      ],
    },
    {
      title: '하이브리도마', short: '하이브리도마', icon: '🧫', phase: '모형',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 단일클론 항체가 한 가지 결정기만 정확히 인식한다는 것을 확인했어요.</div><p>그렇다면 한 종류의 항체를 <b>대량으로</b> 어떻게 얻을까요? B 세포는 항체를 만들지만 <b>오래 증식하지 못하고</b>, 골수종 세포(무한히 증식하는 암세포)는 오래 살지만 <b>원하는 항체를 만들지 못해요</b>. 둘을 융합한 <b>하이브리도마</b>는 두 장점을 모두 가져요.</p><p>5단계를 따라가며 하이브리도마를 만들어 봐요.</p>',
      features: ['order', 'hybrid'],
      setup() { odInit(); hbReset(); setMode('order'); },
      recap: '항원을 주사한 생쥐의 비장 B 세포와 골수종 세포를 융합해 하이브리도마를 만들고, 선택 배지에서 걸러 항체 검사로 원하는 클론을 골라 대량 배양해요.',
      summary: '<ul><li><b>5단계</b>: ① 항원 주사 → ② 비장 B 세포 분리 → ③ 골수종 세포와 융합 → ④ 선택 배지 배양 → ⑤ 항체 검사 · 클론 증식.</li><li><b>B 세포</b>: 항체를 만들지만 수명이 짧아 오래 증식하지 못해요. <b>골수종 세포</b>: 무한히 증식하지만 원하는 항체를 못 만들어요. <b>하이브리도마</b> = 항체 생산 + 무한 증식.</li><li><b>선택 배지</b>에서는 융합하지 못한 세포와 엉뚱하게 융합한 세포가 죽고 하이브리도마만 증식해요. 융합 효율은 낮아서 B 세포 10⁸개에서 하이브리도마가 약 10³개 생겨요(예시).</li></ul>',
      missions: [
        {
          id: 'order', title: '5단계 순서', manual: true,
          goal: '하이브리도마로 단일클론항체를 만드는 <b>5단계 카드</b>를 일어나는 순서대로 쌓으세요.',
          hint: '생쥐에게 항원을 주사해야 B 세포가 항체를 만들어요. 융합 다음에는 융합하지 못한 세포를 없애야 해요.',
          setup() { odInit(); setMode('order'); },
          check() {
            const n = OD.P.order.length;
            if (n < 5) return '카드를 5장 모두 쌓아 주세요. (' + n + ' / 5)';
            if (odOK()) return true;
            const want = STEPS5.map((q) => q.id), k = OD.P.order.findIndex((id, i) => id !== want[i]);
            return (k + 1) + '번째 카드가 알맞지 않아요. 앞 단계의 결과가 다음 단계의 재료가 되는지 생각해 보세요.';
          },
          explain: '<b>항원 주사</b>로 B 세포가 항체를 만들게 한 뒤, 비장에서 <b>B 세포를 분리</b>해 <b>골수종 세포와 융합</b>하고, <b>선택 배지</b>로 하이브리도마만 남긴 다음 <b>항체 검사</b>로 원하는 클론을 골라 대량으로 키워요.',
        },
        {
          id: 'hybrid', title: '선택 배지에서 살아남는 세포', manual: true,
          goal: '①~⑤ 단계를 진행하고, ④ 전에 <b>선택 배지에서 살아남아 증식할 세포</b>를 예측해서 고르세요.',
          hint: '융합이 끝난 접시에는 B 세포, 골수종 세포, 하이브리도마, 융합 실패 세포가 섞여 있어요. 항체를 만들면서 무한히 증식하는 세포는 어느 쪽일까요?',
          setup() { hbReset(); setMode('hybrid'); },
          check() {
            if (HB.stage < 5) return '단계 버튼을 눌러 ⑤ 단계까지 진행해 주세요. (지금 ' + HB.stage + ' / 5)';
            if (!HB.pred) return '선택 배지에서 살아남아 증식할 세포를 골라 주세요.';
            if (HB.pred !== 'h') return '결과를 다시 보세요. 선택 배지에서 살아남아 증식한 세포는 ' + PRED.h + '였어요. 예측을 고쳐 보세요.';
            return true;
          },
          explain: '선택 배지에서는 <b>융합하지 못한 B 세포 · 골수종 세포와 엉뚱하게 융합한 세포</b>가 죽고, <b>하이브리도마</b>만 증식해요. 하이브리도마는 B 세포 쪽에서 <b>항체 생산 능력</b>을, 골수종 세포 쪽에서 <b>무한 증식 능력</b>을 받았기 때문이에요.',
        },
        {
          type: 'quiz', title: '융합이 필요한 까닭',
          goal: 'B 세포나 골수종 세포를 <b>따로따로</b> 키워서는 원하는 단일클론항체를 대량으로 얻기 어려운 까닭은?',
          setup() { setMode('hybrid'); },
          choices: ['B 세포는 항체를 전혀 만들지 못한다', '골수종 세포는 항체를 만들 수 있지만 증식하지 못한다', '융합하면 항체의 종류가 여러 가지로 늘어난다', 'B 세포는 오래 증식하지 못하고, 골수종 세포는 무한히 증식하지만 원하는 항체를 만들지 못한다'],
          answer: 3,
          feedback: ['B 세포는 항체를 만들어요. 문제는 오래 증식하지 못한다는 것이에요.', '반대예요. 골수종 세포는 무한히 증식하지만 원하는 항체를 만들지 못해요.', '융합하는 목적은 한 종류의 항체를 계속 만들도록 하는 것이에요.', ''],
          explain: '<b>B 세포</b>는 항체를 만들지만 수명이 짧아 오래 증식하지 못하고, <b>골수종 세포</b>는 무한히 증식하지만 원하는 항체를 만들지 못해요. 융합한 <b>하이브리도마</b>는 <b>항체 생산 + 무한 증식</b>을 모두 갖춰요.',
        },
      ],
    },
    {
      title: '치료와 진단 사례', short: '치료 사례', icon: '💊', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 하이브리도마가 한 종류의 단일클론항체를 대량으로 만든다는 것을 확인했어요.</div><p>이제 <b>치료와 진단 사례</b>를 살펴봐요. 단일클론항체가 어떤 표적에 붙어 어떻게 작용하는지 연결하고(교육용 요약이며 승인 단계가 표시돼요), 96칸 판 검사에서 <b>양성률</b>을 계산해요.</p>',
      features: ['cases', 'plate'],
      setup() { caseSorter.reset(); setMode('cases'); },
      recap: '단일클론항체는 표적 항원에 결합해 증식 신호 차단, 면역 세포 유도, 염증 신호 중화, 바이러스 중화, 진단에 쓰이고, 96칸 판에서 원하는 항체를 만드는 클론을 골라내요.',
      summary: '<ul><li><b>표적 암 치료</b>: HER2가 많은 유방암 → 증식 신호 차단, CD20를 가진 림프종 B 세포 → 면역 세포 유도 (승인).</li><li><b>자가면역 질환</b>: 염증 신호 물질 TNF-α 중화 (류마티스 관절염 · 크론병, 승인). <b>감염병</b>: 바이러스 표면 단백질에 결합하는 중화 항체 (승인/비상 사용).</li><li><b>진단</b>: 임신 호르몬 · 감염병 항원 검사 키트 (생활 제품).</li><li>96칸 판 양성률 = 8 / 96 ≈ <b>8.3 %</b>. 양성 칸의 세포를 한 칸에 1개 이하가 되도록 희석해 단일 클론으로 키워요. 단일클론항체가 모든 암에 효과가 있는 것은 아니에요.</li></ul>',
      missions: [
        {
          id: 'cases', title: '사례와 작용 방식 연결', manual: true,
          goal: '사례 카드 5장을 알맞은 <b>작용 방식</b> 상자에 넣으세요.',
          hint: 'HER2는 증식 신호를 보내는 단백질이에요. CD20는 림프종 B 세포의 표지이고, TNF-α는 염증 신호 물질이에요. 검사 키트는 진단에 써요.',
          setup() { caseSorter.reset(); setMode('cases'); },
          check() {
            if (caseSorter.placed < 5) { caseSorter.markBad([]); return '카드를 모두 상자에 넣어 주세요. (' + caseSorter.placed + ' / 5)'; }
            const w = caseWrong();
            if (w.length) { caseSorter.markBad(w.map((c) => c.id)); return '\'' + w[0].label + '\' 카드의 표적이 무엇이고 어떻게 작용하는지 다시 생각해 보세요.'; }
            caseSorter.markBad([]); return true;
          },
          explain: '<b>HER2</b>가 많은 유방암에는 증식 신호를 <b>차단</b>하는 항체, <b>CD20</b>를 가진 림프종 B 세포에는 <b>면역 세포를 불러</b> 제거를 돕는 항체, <b>TNF-α</b>에는 염증 신호를 <b>중화</b>하는 항체(류마티스 관절염 · 크론병), 바이러스 표면 단백질에는 감염을 막는 <b>중화</b> 항체가 쓰여요. 검사 키트는 <b>진단</b>에 쓰는 생활 제품이에요. (교육용 요약이며 치료 권유가 아니에요.)',
        },
        {
          id: 'plate', title: '96칸 판 양성률',
          goal: '96칸 판 검사를 실행해 양성(빨강) 칸을 세고 <b>양성률(%)</b>을 입력하세요.',
          hint: '검사가 끝나면 빨강 칸이 8칸이에요. 양성률 = 양성 칸 / 전체 96칸 × 100 = 8 / 96 × 100이에요. 소수 첫째 자리까지 써요.',
          setup() { plReset(); setMode('plate'); },
          check: () => plDone() && plRateOK(), hold: 0.5,
          status: () => mark(plDone()) + ' 검사 실행 ' + mark(plDone() && plRateOK()) + ' 양성률 입력',
          explain: '96칸 중 양성이 8칸이므로 양성률 = 8 / 96 ≈ 0.0833, 즉 <b>약 8.3 %</b>예요. 이 중 한 칸의 세포를 <b>한 칸에 세포 1개 이하</b>가 되도록 희석해 다시 키우면 하나의 세포에서 자란 <b>단일 클론</b>을 얻어요.',
        },
        {
          type: 'quiz', title: '표적 치료의 장점과 오개념',
          goal: '표적 치료에 쓰는 단일클론항체가 정상 세포 손상이 <b>비교적 적은 편</b>인 까닭은?',
          setup() { setMode('cases'); },
          choices: ['모든 종류의 암에 똑같이 효과가 있기 때문이다', '표적 항원을 가진 세포에 특이적으로 결합하기 때문이다 (그래도 부작용은 있을 수 있다)', '항체가 세포 안으로 들어가 DNA를 고치기 때문이다', '정상 세포에는 항체가 절대 결합하지 않기 때문이다'],
          answer: 1,
          feedback: ['단일클론항체는 표적 항원이 있는 경우에만 작용해서 모든 암에 효과가 있는 것은 아니에요.', '', '항체는 주로 세포 표면의 표적에 결합해요. DNA를 고치지 않아요.', '정상 세포에도 표적 항원이 있을 수 있어서 부작용이 생길 수 있어요.'],
          explain: '단일클론항체는 <b>표적 항원</b>에 특이적으로 결합하므로 정상 세포 손상이 비교적 적은 편이에요. 하지만 표적 항원이 <b>없는</b> 암에는 효과가 없고, 정상 세포에도 표적이 있으면 <b>부작용</b>이 생길 수 있어요.',
        },
      ],
    },
    {
      title: '치료법의 전망', short: '전망', icon: '💬', phase: '소통',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 단일클론항체가 치료와 진단에 쓰이는 사례를 확인했어요.</div><p>이제 가상 모둠 3명이 치료법의 <b>전망</b>을 소통해요. <b>장점</b>과 <b>한계</b>를 근거로 들고, 한계를 보완할 <b>새로운 기술</b>을 제안하는 한 문장을 완성해요. 사실이 아닌 과장된 주장은 근거로 쓸 수 없어요.</p>',
      features: ['outlook'],
      setup() { olReset(); setMode('outlook'); },
      recap: '단일클론항체 치료는 특이성이 높은 장점이 있지만 비용 · 면역 반응 · 내성의 한계가 있어, 항체–약물 접합체와 이중 특이 항체 같은 기술로 보완될 전망이에요.',
      summary: '<ul><li><b>장점</b>: 표적 특이성이 높아 정상 세포 손상이 비교적 적고, 진단 키트로도 쓰여요.</li><li><b>한계</b>: 제조 비용이 높고, 마우스 항체는 사람에게 면역 반응을 일으킬 수 있어요(인간화 항체로 개선). 표적이 변하면 내성이 생길 수 있고 부작용도 있어요.</li><li><b>전망</b>: 항체에 약물을 붙인 <b>항체–약물 접합체</b>, 두 곳에 결합하는 <b>이중 특이 항체</b>. 전망을 말할 때는 근거(장점 · 한계)와 함께 과장하지 않아야 해요.</li></ul>',
      missions: [
        {
          id: 'outlook', title: '근거 카드로 전망 문장 만들기', manual: true,
          goal: '학생 3명의 카드(<b>장점 · 한계 · 새로운 기술</b>)를 골라 전망 문장을 완성하세요. 사실과 다른 카드는 고르면 안 돼요.',
          hint: '"모든 암에 똑같이 효과가 있다"처럼 과장된 주장은 근거가 없어요. 장점 하나와 한계 하나가 근거 2개이고, 새로운 기술은 한계를 보완해요.',
          setup() { olReset(); setMode('outlook'); },
          check() {
            const n = [OL.a, OL.b, OL.c].filter(Boolean).length;
            if (n < 3) return '세 학생의 카드를 모두 골라 주세요. (' + n + ' / 3)';
            const a = olGet(OPT_A, OL.a), b = olGet(OPT_B, OL.b), c = olGet(OPT_C, OL.c);
            if (!a[2]) return '"모든 종류의 암에 똑같이 효과가 있다"는 근거가 없는 주장이에요. 단일클론항체는 표적 항원이 있는 경우에만 작용해요.';
            if (!b[2]) return '단일클론항체는 표적 항원을 가진 세포에 주로 결합해요. 정상 세포를 모두 파괴한다는 것은 사실이 아니에요.';
            if (!c[2]) return '항체를 많이 쓴다고 비용 · 면역 반응 · 내성 같은 한계가 사라지지는 않아요. 구체적인 새 기술을 골라 보세요.';
            return true;
          },
          explain: '좋은 전망은 <b>장점과 한계를 모두 근거</b>로 들고, 한계를 보완할 <b>새로운 기술</b>(항체에 약물을 붙인 <b>항체–약물 접합체</b>, 두 곳에 결합하는 <b>이중 특이 항체</b>)을 제안해요. "모든 암에 효과가 있다" 같은 <b>과장된 주장</b>은 근거가 없어요.',
        },
        {
          type: 'quiz', title: '마우스 항체를 사람에게 쓸 때',
          goal: '마우스에서 얻은 단일클론항체를 사람에게 쓸 때의 <b>문제와 해결 방향</b>으로 알맞은 것은?',
          setup() { setMode('outlook'); },
          choices: ['마우스 항체는 사람의 항원에 결합하지 못하므로 사람에게는 쓸 수 없다', '사람 몸이 마우스 항체를 이물질로 인식해 면역 반응이 생길 수 있어서, 사람 항체와 비슷하게 바꾼 인간화 항체로 개선한다', '면역 반응은 항상 일어나지 않으므로 아무 문제가 없다', '항체의 용량을 크게 늘리면 면역 반응이 사라진다'],
          answer: 1,
          feedback: ['마우스 항체도 결합할 수 있지만, 면역 반응이 문제가 돼요.', '', '마우스 항체는 사람에게 면역 반응을 일으킬 수 있어서 문제가 돼요.', '용량을 늘린다고 면역 반응이 사라지지 않아요. 항체의 일부를 사람 것으로 바꾸는 방법을 써요.'],
          explain: '마우스 항체는 사람에게 <b>면역 반응</b>을 일으킬 수 있어서, 항체의 대부분을 <b>사람 항체와 비슷하게</b> 바꾼 <b>인간화 항체</b>로 개선해요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hg-monoclonal', mount: '#game', badge: '항체 탐험가', homeHref: '../../index.html#hg',
    featureLabels: { ab: '🔬 항원과 항체', order: '🧭 5단계 순서', hybrid: '🧫 하이브리도마', cases: '💊 치료 사례', plate: '🔢 96칸 판', outlook: '💬 전망 토의' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 읽음 칸 ---------- */
  function readouts() {
    const m = S.mode;
    if (m === 'ab') { const r = AB.run ? AB.results[AB.run.kind] : (AB.results.mono || AB.results.poly); setReads(['항체', AB.run ? (AB.run.kind === 'poly' ? '다클론' : '단일클론') : '—', '항원 A에 결합', r ? r.a + ' / ' + r.aTot + '자리' : '—', '단백질 B에 결합', r ? r.b + ' / ' + r.bTot + '자리' : '—']); }
    else if (m === 'order') setReads(['쌓은 카드', OD.P.order.length + ' / 5', '순서', odOK() ? '완성' : '쌓는 중', '다음 할 일', odOK() ? '하이브리도마 만들기' : '카드 쌓기']);
    else if (m === 'hybrid') setReads(['진행 단계', HB.stage + ' / 5', '내 예측', HB.pred ? PRED[HB.pred] : '—', '하이브리도마', HB.stage >= 3 ? hbCount().h * (HB.grown && HB.tS > 3.2 ? 4 : 1) + '개' : '—']);
    else if (m === 'cases') setReads(['넣은 카드', caseSorter.placed + ' / 5', '맞게 넣은 카드', caseSorter.cards.filter((c) => c.zone === CASE_ANS[c.id]).length + '장', '고른 카드', caseSorter.selected ? caseSorter.selected.label : '—']);
    else if (m === 'plate') setReads(['검사한 칸', Math.min(96, Math.floor(PL.reveal)) + ' / 96', '양성 칸', plPos() + '칸', '고른 칸', PL.pick >= 0 ? 'ABCDEFGH'[Math.floor(PL.pick / 12)] + (PL.pick % 12 + 1) : '—']);
    else setReads(['고른 카드', [OL.a, OL.b, OL.c].filter(Boolean).length + ' / 3', '근거 카드', (olOK() ? 2 : 0) + ' / 2', '전망 문장', olOK() ? '완성' : '—']);
  }

  /* ---------- 시작 ---------- */
  odInit(); hbInit(); setMode('ab');
  let lastFree = false, lastLv = -1, lastKey = '';
  SciSim.loop((dt, t) => {
    clock = t; S.t = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (game && game.level !== lastLv) { lastLv = game.level; updateCtl(); }
    const key = (AB.run ? AB.run.done : '-') + '|' + HB.stage + '|' + (PL.run ? plDone() : '-') + '|' + (OL.a + OL.b + OL.c);
    if (key !== lastKey) { lastKey = key; updateCtl(); }
    view.apply(); ctx.clearRect(0, 0, VW, VH);
    bgFill('#eef4f2', '#e3ece8');
    switch (S.mode) {
      case 'ab': abDraw(dt, t); break;
      case 'order': odDraw(dt, t); break;
      case 'hybrid': hbDraw(dt, t); break;
      case 'cases': caseDraw(dt, t); break;
      case 'plate': plDraw(dt, t); break;
      case 'outlook': olDraw(dt, t); break;
    }
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(241,246,243,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, PHONE, get game() { return game; }, levels, setMode, updateCtl, AB, abRun, abBoth, abReset, OD, odOK, STEPS5, HB, hbNext, hbReset, hbCount, caseSorter, CASES, CASE_ANS, caseWrong, PL, plRun, plDone, plRateOK, plPos, POS8,
    OL, olOK, olSentence, OPT_A, OPT_B, OPT_C, parseFrac,
  };
})();
