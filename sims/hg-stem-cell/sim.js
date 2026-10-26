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
     고등학교 생물의 유전 · Ⅲ. 생명공학기술 - 줄기세포와 재생 의학 (단원 61, 3차시)
     성취기준 [12유전03-02] 단일클론항체, 줄기세포, 유전자 편집 기술이 난치병 치료에 활용된 사례를 조사하고, 이러한 치료법의 전망에 대해 협력적으로 소통할 수 있다.
     ① 관찰: 줄기세포란  ② 모형: 종류  ③ 탐구: 분화 유도  ④ 소통: 치료와 전망
     (치료 사례는 교육용 요약이고, 승인 · 임상 시험 · 연구 단계를 구분해서 보여 줘요. 치료 권유가 아니에요)
     ========================================================= */
  const S = { mode: 'divide', fade: 0, t: 0 };
  let game = null;
  const rnd = mulberry(20241105);
  const ease = SciSim.ease;
  const INK = '#26324a';
  const STEM = '#22c55e';
  const SPEC = [{ n: '신경 세포', col: '#7c3aed', k: 'n' }, { n: '근육 세포', col: '#ef4444', k: 'm' }, { n: '피부 세포', col: '#f59e0b', k: 's' }];
  const specOf = (k) => SPEC.find((q) => q.k === k);

  /* ---- 세포 그리기 ---- */
  function stemCell(x, y, r, o) {
    o = o || {}; ctx.save(); ctx.globalAlpha = o.a == null ? 1 : o.a;
    D.glow(x, y, r * 1.9, STEM, 0.35 * (o.glow == null ? 1 : o.glow));
    D.sphere(x, y, r, STEM, { shadow: true });
    ctx.fillStyle = C.shade(STEM, -0.35); ctx.beginPath(); ctx.arc(x - r * 0.1, y + r * 0.05, r * 0.42, 0, TAU); ctx.fill();
    if (o.ips) { ctx.strokeStyle = '#2563eb'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, r + 3.5, 0, TAU); ctx.stroke(); }
    ctx.restore();
  }
  /* 분화한 세포: k = 'n' 신경(별 모양) | 'm' 근육(긴 모양) | 's' 피부(네모) ; m은 줄기세포 색에서 해당 색으로 섞이는 정도(0~1) */
  function specCell(x, y, r, k, m, a) {
    const sp = specOf(k), col = C.mix(STEM, sp.col, clamp(m == null ? 1 : m, 0, 1));
    ctx.save(); ctx.globalAlpha = a == null ? 1 : a; ctx.translate(x, y);
    const mm = clamp(m == null ? 1 : m, 0, 1);
    if (k === 'n') {
      ctx.strokeStyle = C.shade(col, -0.2); ctx.lineWidth = 2.4 * mm + 0.1; ctx.lineCap = 'round';
      for (let i = 0; i < 5; i++) { const ang = i / 5 * TAU + 0.4; ctx.beginPath(); ctx.moveTo(Math.cos(ang) * r * 0.6, Math.sin(ang) * r * 0.6); ctx.lineTo(Math.cos(ang) * r * (0.6 + 0.9 * mm), Math.sin(ang) * r * (0.6 + 0.9 * mm)); ctx.stroke(); }
      D.sphere(0, 0, r * 0.82, col, {});
    } else if (k === 'm') {
      const w = r * (1 + 0.7 * mm), h = r * (1 - 0.3 * mm);
      D.roundRect(-w, -h, w * 2, h * 2, h); const g = ctx.createLinearGradient(0, -h, 0, h); g.addColorStop(0, C.shade(col, 0.3)); g.addColorStop(1, C.shade(col, -0.2)); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = C.shade(col, -0.4); ctx.lineWidth = 1.8; ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1.6; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * w * 0.32, -h * 0.7); ctx.lineTo(i * w * 0.32, h * 0.7); ctx.stroke(); }
    } else {
      const s2 = r * (0.95 + 0.1 * mm), rr = r * (1 - 0.65 * mm);
      D.roundRect(-s2, -s2, s2 * 2, s2 * 2, rr); const g = ctx.createLinearGradient(0, -s2, 0, s2); g.addColorStop(0, C.shade(col, 0.3)); g.addColorStop(1, C.shade(col, -0.2)); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = C.shade(col, -0.4); ctx.lineWidth = 1.8; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.arc(-s2 * 0.35, -s2 * 0.35, s2 * 0.18, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  /* ===================== ① 줄기세포 분열 ===================== */
  const DVG = PHONE
    ? { N: { x: 150, y: 250 }, R: 17, tis: { x: 270, y: 110, w: 196, h: 330 }, cols: 4 }
    : { N: { x: 230, y: 290 }, R: 25, tis: { x: 440, y: 80, w: 344, h: 400 }, cols: 6 };
  const STEM_SLOTS = [[0, 0], [-1, -0.8], [1, -0.8], [-1, 0.8], [1, 0.8], [0, 1.6]];
  const DV = { stems: [], diffs: [], anim: null, asym: 0, total: 0, kind: 'asym', msg: '', lost: false };
  const dvSlot = (i) => ({ x: DVG.N.x + STEM_SLOTS[i][0] * DVG.R * 2.2, y: DVG.N.y + STEM_SLOTS[i][1] * DVG.R * 2.2 });
  const dvTis = (i) => { const g = DVG, cw = (g.tis.w - 20) / g.cols; return { x: g.tis.x + 10 + cw * (i % g.cols) + cw / 2, y: g.tis.y + 64 + Math.floor(i / g.cols) * cw }; };
  const DV_MAX = PHONE ? 24 : 30;
  function dvReset() { DV.stems = [{ x: dvSlot(0).x, y: dvSlot(0).y, slot: 0 }]; DV.diffs = []; DV.anim = null; DV.asym = 0; DV.total = 0; DV.msg = ''; DV.lost = false; parts.clear(); updateCtl(); }
  const dvCanGo = () => !DV.anim && DV.stems.length > 0 && DV.diffs.length < DV_MAX - (DV.kind === 'diff' ? 1 : 0) && !(DV.kind === 'self' && DV.stems.length >= 6);
  function dvGo() {
    if (!dvCanGo()) { if (DV.kind === 'self' && DV.stems.length >= 6) showHint('줄기세포 자리가 가득 찼어요.'); return; }
    const par = DV.stems[0]; Sound.click();
    DV.anim = { t: 0, kind: DV.kind, par, px: par.x, py: par.y, applied: false };
    updateCtl();
  }
  function dvApply() {
    const A = DV.anim; DV.total++;
    if (A.kind === 'asym') { DV.asym++; DV.diffs.push({ k: SPEC[DV.diffs.length % 3].k, x: dvTis(DV.diffs.length).x, y: dvTis(DV.diffs.length).y }); DV.msg = '비대칭 분열: 줄기세포는 그대로 남고(자기 복제), 딸세포 하나는 분화했어요.'; }
    else if (A.kind === 'diff') { DV.stems.shift(); [0, 1].forEach(() => { const n = DV.diffs.length; DV.diffs.push({ k: SPEC[n % 3].k, x: dvTis(n).x, y: dvTis(n).y }); }); DV.msg = DV.stems.length ? '둘 다 분화해서 줄기세포가 하나 줄었어요.' : '줄기세포가 모두 분화해 없어졌어요. 새 세포를 만들 수 없어요 (고갈).'; if (!DV.stems.length) DV.lost = true; }
    else { const slot = DV.stems.length; DV.stems.push({ x: dvSlot(slot).x, y: dvSlot(slot).y, slot }); DV.msg = '둘 다 줄기세포로 남아 줄기세포가 늘었어요.'; }
    DV.stems.forEach((s, i) => { s.slot = i; });
    DV.anim = null; Sound.success(); updateCtl();
  }
  function dvUpdate(dt) {
    const A = DV.anim;
    if (A) { A.t += dt / 1.5; if (A.t >= 1) dvApply(); }
    DV.stems.forEach((s, i) => { const p = dvSlot(i); s.x = approach(s.x, p.x, dt, 8); s.y = approach(s.y, p.y, dt, 8); });
  }
  function dvDraw(dt, t) {
    dvUpdate(dt);
    const g = DVG, R = g.R, A = DV.anim;
    TF(VW / 2, 28, '줄기세포는 분열하면서 자기 자신을 지키고 다른 세포를 만들어요', VW - 24, PHONE ? 14 : 16, 11.5, INK, 'center', 800);
    /* 틈새 */
    const nr = R * 4.4;
    ctx.beginPath(); ctx.arc(g.N.x, g.N.y + R * 0.6, nr, 0, TAU); const ng = ctx.createRadialGradient(g.N.x, g.N.y, 10, g.N.x, g.N.y, nr); ng.addColorStop(0, 'rgba(187,247,208,.65)'); ng.addColorStop(1, 'rgba(187,247,208,.15)'); ctx.fillStyle = ng; ctx.fill();
    ctx.setLineDash([8, 6]); ctx.strokeStyle = '#4ade80'; ctx.lineWidth = 2.4; ctx.stroke(); ctx.setLineDash([]);
    T(g.N.x, g.N.y - nr - 8 + R * 0.6, '줄기세포가 머무는 곳', PHONE ? 12.5 : 14, '#15803d', 'center', 800);
    /* 조직 */
    panel(g.tis.x, g.tis.y, g.tis.w, g.tis.h, 14, '#fff');
    T(g.tis.x + g.tis.w / 2, g.tis.y + 26, '분화한 세포 (조직)', PHONE ? 13 : 15, INK, 'center', 800);
    DV.diffs.forEach((d, i) => { const p = dvTis(i); specCell(p.x, p.y, R * 0.62, d.k, 1, 1); });
    /* 줄기세포들 */
    DV.stems.forEach((s, i) => { if (A && i === 0) return; stemCell(s.x, s.y, R, { glow: 0.6 + 0.4 * Math.sin(t * 2 + i) }); });
    if (A) dvDrawAnim(A, t);
    /* 숫자 */
    T(g.N.x, g.N.y + nr + 22 + R * 0.6, '줄기세포 ' + DV.stems.length + '개', PHONE ? 14 : 16, '#15803d', 'center', 800);
    const my = g.tis.y + g.tis.h - 14;
    T(g.tis.x + g.tis.w / 2, my, '분화한 세포 ' + DV.diffs.length + '개', PHONE ? 13 : 15, INK, 'center', 800);
    if (DV.msg) { const w = PHONE ? VW - 24 : 400; bubble(PHONE ? 12 : 20, PHONE ? VH - 62 : VH - 76, w, DV.msg, { size: PHONE ? 12.5 : 14, fill: DV.lost ? '#fef2f2' : '#f0fdf4', line: DV.lost ? '#fca5a5' : '#86efac' }); }
  }
  function dvDrawAnim(A, t) {
    const g = DVG, R = g.R, p = A.t, x = A.px, y = A.py;
    const res = A.kind;
    /* 단계: 0~0.3 늘어남, 0.3~0.6 갈라짐, 0.6~1 이동과 모양 변화 */
    if (p < 0.3) { const k = p / 0.3; ctx.save(); ctx.translate(x, y); ctx.scale(1 + 0.5 * k, 1 - 0.12 * k); stemCell(0, 0, R, {}); ctx.restore(); return; }
    const k2 = clamp((p - 0.3) / 0.3, 0, 1), k3 = clamp((p - 0.6) / 0.4, 0, 1), sep = R * 1.05 * ease.outCubic(k2);
    const ax = x - sep, bx = x + sep;
    /* 딸세포 A (자리에 남음) / 딸세포 B (조직쪽으로) */
    let a2 = { x: ax, y }, b2 = { x: bx, y };
    const tgt = dvTis(DV.diffs.length);
    if (res === 'asym') { b2 = { x: lerp(bx, tgt.x, ease.inOutCubic(k3)), y: lerp(y, tgt.y, ease.inOutCubic(k3)) }; }
    else if (res === 'diff') { const t2 = dvTis(DV.diffs.length + 1); a2 = { x: lerp(ax, tgt.x, ease.inOutCubic(k3)), y: lerp(y, tgt.y, ease.inOutCubic(k3)) }; b2 = { x: lerp(bx, t2.x, ease.inOutCubic(k3)), y: lerp(y, t2.y, ease.inOutCubic(k3)) }; }
    else { const s = dvSlot(DV.stems.length); b2 = { x: lerp(bx, s.x, ease.inOutCubic(k3)), y: lerp(y, s.y, ease.inOutCubic(k3)) }; }
    if (k2 < 1) { ctx.strokeStyle = C.shade(STEM, -0.1); ctx.lineWidth = R * 1.1 * (1 - k2); ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(ax, y); ctx.lineTo(bx, y); ctx.stroke(); }
    const kind = DV.diffs.length % 3, kind2 = (DV.diffs.length + 1) % 3;
    if (res === 'asym') { stemCell(a2.x, a2.y, R, {}); specCell(b2.x, b2.y, R * lerp(1, 0.62, k3), SPEC[kind].k, k3, 1); if (k3 > 0.3) T(b2.x, b2.y - R * 1.6, '분화', 13, SPEC[kind].col, 'center', 800, { stroke: '#fff', strokeWidth: 3 }); if (k2 > 0.5) T(a2.x, a2.y - R * 1.6, '자기 복제', 13, '#15803d', 'center', 800, { stroke: '#fff', strokeWidth: 3 }); }
    else if (res === 'diff') { specCell(a2.x, a2.y, R * lerp(1, 0.62, k3), SPEC[kind].k, k3, 1); specCell(b2.x, b2.y, R * lerp(1, 0.62, k3), SPEC[kind2].k, k3, 1); }
    else { stemCell(a2.x, a2.y, R, {}); stemCell(b2.x, b2.y, R, {}); }
  }
  const dvAsymOK = () => DV.asym >= 5 && DV.stems.length >= 1;

  /* ===================== 카드 분류기 (3개 상자) ===================== */
  function triSorter(items, boxDefs, ch, kh) {
    const n = items.length, nb = boxDefs.length;
    let boxes, tray;
    if (PHONE) {
      const bh = 96, gap = 6;
      boxes = boxDefs.map((b, k) => Object.assign({ x: 10, y: 50 + k * (bh + gap), w: VW - 20, h: bh, cols: 1, hdr: 24 }, b));
      const ty = 50 + nb * (bh + gap) + 6;
      tray = (i) => ({ x: 10 + (i % 2) * 236, y: ty + Math.floor(i / 2) * (ch + 6) });
    } else {
      const bw = (VW - 24 - 16) / 3, bh = n > 6 ? 238 : 270;
      boxes = boxDefs.map((b, k) => Object.assign({ x: 12 + k * (bw + 8), y: 54, w: bw, h: bh, cols: 1, hdr: 28 }, b));
      const ty = 54 + bh + 14;
      tray = (i) => ({ x: 12 + (i % 3) * (bw + 8), y: ty + Math.floor(i / 3) * (ch + 6) });
    }
    return selectable({ cards: items, boxes, cw: PHONE ? 228 : (VW - 24 - 16) / 3, ch, kh, tray, onChange() { updateCtl(); } });
  }
  function triDraw(so, dt, title) {
    so.update(dt);
    TF(VW / 2, 28, title, VW - 24, PHONE ? 14 : 16, 11.5, INK, 'center', 800);
    so.draw();
    if (so.selected) T(VW / 2, VH - 6, '카드를 골랐어요! 놓을 상자를 눌러요', 13, '#b45309', 'center', 800);
  }
  const TYPE_BOX = [
    { id: 'esc', label: '배아줄기세포', col: '#db2777' },
    { id: 'asc', label: '성체줄기세포', col: '#ea580c' },
    { id: 'ips', label: '유도만능줄기세포 (iPS)', col: '#2563eb' },
  ];
  const FEAT = [
    { id: 'e1', own: 'esc', label: '배반포의 내세포괴에서 얻어요', short: '내세포괴에서 얻어요' },
    { id: 'a1', own: 'asc', label: '골수의 조혈모세포가 대표적이에요', short: '골수의 조혈모세포' },
    { id: 'i1', own: 'ips', label: '피부 등 체세포에 전사 인자 4종을 넣어 만들어요', short: '체세포에 4인자 도입' },
    { id: 'e2', own: 'esc', label: '배아를 이용해서 윤리 쟁점이 있어요', short: '배아 이용 윤리 쟁점' },
    { id: 'a2', own: 'asc', label: '분화 범위가 해당 조직의 몇 종류로 제한돼요', short: '분화 범위가 제한돼요' },
    { id: 'i2', own: 'ips', label: '환자 자신의 세포로 만들 수 있어 면역 거부가 줄어요', short: '환자 자신의 세포 이용' },
    { id: 'e3', own: 'esc', label: '다른 사람의 배아에서 얻으면 면역 거부가 일어날 수 있어요', short: '타인 세포라 거부 가능' },
    { id: 'a3', own: 'asc', label: '조직 속에 아주 적게 있어 얻기 어려워요', short: '조직에 소수만 있어요' },
    { id: 'i3', own: 'ips', label: '종양이 생길 위험과 낮은 효율이 한계예요', short: '종양 위험 · 낮은 효율' },
  ];
  const sortSorter = triSorter(FEAT.map((f) => Object.assign({ col: { esc: '#db2777', asc: '#ea580c', ips: '#2563eb' }[f.own] }, f)), TYPE_BOX, PHONE ? 44 : 52, PHONE ? 28 : 34);
  const sortPT = sorterPT(() => sortSorter);
  const sortWrong = () => sortSorter.cards.filter((c) => c.zone && c.zone !== c.own);
  const sortDraw = (dt) => triDraw(sortSorter, dt, '특징 카드를 알맞은 줄기세포 상자에 넣어요');

  /* ===================== ② 분화 범위 시험 ===================== */
  const LINE5 = [{ k: 'n', n: '신경', col: '#7c3aed' }, { k: 'm', n: '근육', col: '#ef4444' }, { k: 's', n: '피부', col: '#f59e0b' }, { k: 'b', n: '혈액', col: '#0ea5e9' }, { k: 'l', n: '간', col: '#16a34a' }];
  const RGT = {
    esc: { n: '배아줄기세포', sub: '배반포 내세포괴에서 얻어요', reach: ['n', 'm', 's', 'b', 'l'], col: '#db2777' },
    asc: { n: '성체줄기세포', sub: '골수의 조혈모세포로 시험해요', reach: ['b'], col: '#ea580c' },
    ips: { n: '유도만능줄기세포', sub: '체세포에서 되돌린 세포예요', reach: ['n', 'm', 's', 'b', 'l'], col: '#2563eb' },
  };
  const RGG = PHONE
    ? { C: { x: 240, y: 296 }, rad: 168, nr: 28, bars: { x: 12, y: 372, w: 456, h: 260 }, bh: 120 }
    : { C: { x: 270, y: 440 }, rad: 235, nr: 36, bars: { x: 548, y: 72, w: 236, h: 440 }, bh: 260 };
  const RG = { sel: 'esc', tested: {}, run: null, disp: { esc: 0, asc: 0, ips: 0 }, ans: null };
  const rgNodePos = (i) => { const ang = (-150 + i * 30) * Math.PI / 180; return { x: RGG.C.x + Math.cos(ang) * RGG.rad, y: RGG.C.y + Math.sin(ang) * RGG.rad }; };
  function rgReset() { RG.sel = 'esc'; RG.tested = {}; RG.run = null; RG.disp = { esc: 0, asc: 0, ips: 0 }; RG.ans = null; updateCtl(); }
  function rgGo() { if (RG.run && !RG.run.done) return; RG.run = { type: RG.sel, t: 0, done: false }; Sound.click(); updateCtl(); }
  const rgAll = () => ['esc', 'asc', 'ips'].every((k) => RG.tested[k] != null);
  function rgUpdate(dt) {
    const R = RG.run;
    if (R && !R.done) { R.t += dt; if (R.t > 2.2) { R.done = true; RG.tested[R.type] = RGT[R.type].reach.length; Sound.success(); updateCtl(); } }
    ['esc', 'asc', 'ips'].forEach((k) => { RG.disp[k] = RM ? (RG.tested[k] || 0) : approach(RG.disp[k], RG.tested[k] || 0, dt, 4); });
  }
  function rgDraw(dt, t) {
    rgUpdate(dt);
    const R = RG.run, T0 = RGT[R ? R.type : RG.sel], cc = RGG.C;
    TF(VW / 2, 28, '세 종류의 줄기세포가 몇 가지 계통의 세포로 분화할 수 있는지 시험해요', VW - 24, PHONE ? 14 : 16, 11, INK, 'center', 800);
    /* 시험 접시 */
    LINE5.forEach((ln, i) => {
      const p = rgNodePos(i), ok = R && T0.reach.indexOf(ln.k) >= 0, st = R ? clamp((R.t - 0.3 - i * 0.28) / 0.5, 0, 1) : 0;
      if (R && st > 0) D.arrow(cc.x, cc.y - RGG.nr * 0.6, lerp(cc.x, p.x, st * 0.86), lerp(cc.y, p.y, st * 0.86), { color: ok ? ln.col : '#cbd5e1', width: 3.4, head: 9, alpha: 0.9, dash: ok ? null : [6, 6] });
      ctx.beginPath(); ctx.arc(p.x, p.y, RGG.nr, 0, TAU);
      const reached = R && ok && st >= 1;
      ctx.fillStyle = reached ? C.mix('#ffffff', ln.col, 0.2) : '#fff'; ctx.fill(); ctx.strokeStyle = reached ? ln.col : (R && !ok && st >= 1 ? '#cbd5e1' : '#94a3b8'); ctx.lineWidth = reached ? 3.4 : 2; ctx.stroke();
      if (reached) { const kk = { n: 'n', m: 'm', s: 's' }[ln.k]; if (kk) specCell(p.x, p.y - 4, RGG.nr * 0.45, kk, 1, 1); else D.sphere(p.x, p.y - 4, RGG.nr * 0.4, ln.col, {}); }
      TF(p.x, p.y + RGG.nr * 0.62 + (reached ? 4 : 0), ln.n, RGG.nr * 1.7, PHONE ? 12 : 14, 10, R && !ok && st >= 1 ? '#94a3b8' : INK, 'center', 800);
      if (R && !ok && st >= 1) T(p.x, p.y - 2, '✖', 22, '#94a3b8', 'center', 800);
      if (reached) D.check(p.x + RGG.nr * 0.78, p.y - RGG.nr * 0.78, 9, 1);
    });
    ctx.save(); D.glow(cc.x, cc.y, 62, RGT[RG.sel].col, 0.25); ctx.restore();
    const cell = R ? R.type : RG.sel;
    stemCell(cc.x, cc.y, PHONE ? 22 : 28, { ips: cell === 'ips' });
    TF(cc.x, cc.y + (PHONE ? 46 : 56), RGT[cell].n, 190, PHONE ? 14 : 16, 11, RGT[cell].col, 'center', 800);
    TF(cc.x, cc.y + (PHONE ? 63 : 76), RGT[cell].sub, 230, PHONE ? 12 : 13, 9.5, '#64748b', 'center', 700);
    /* 막대 그래프 */
    const b = RGG.bars; panel(b.x, b.y, b.w, b.h, 14, '#fff');
    TF(b.x + b.w / 2, b.y + 26, '분화할 수 있는 계통 수 (5개 중)', b.w - 16, 14, 10.5, INK, 'center', 800);
    const base = b.y + b.h - 56, ph = RGG.bh, bw = Math.min(54, b.w / 5);
    for (let v = 0; v <= 5; v++) { const y = base - ph * v / 5; ctx.strokeStyle = v ? '#e2e8f0' : '#94a3b8'; ctx.lineWidth = v ? 1 : 1.6; ctx.beginPath(); ctx.moveTo(b.x + 30, y); ctx.lineTo(b.x + b.w - 12, y); ctx.stroke(); T(b.x + 24, y + 4.5, String(v), 12, '#64748b', 'right', 700); }
    ['esc', 'asc', 'ips'].forEach((k, i) => {
      const cx = b.x + 30 + (b.w - 42) * (i + 0.5) / 3, v = clamp(RG.disp[k], 0, 5), hh = ph * v / 5;
      if (hh > 0.5) { const g = ctx.createLinearGradient(cx - bw / 2, 0, cx + bw / 2, 0); g.addColorStop(0, C.shade(RGT[k].col, 0.25)); g.addColorStop(1, RGT[k].col); ctx.fillStyle = g; D.roundRect(cx - bw / 2, base - hh, bw, hh, 5); ctx.fill(); }
      if (RG.tested[k] != null) T(cx, base - hh - 6, RG.tested[k] + ' / 5', 14, RGT[k].col, 'center', 800);
      TF(cx, base + 18, RGT[k].n.replace('유도만능줄기세포', 'iPS').replace('줄기세포', ''), bw + 20, 13, 9.5, INK, 'center', 800); TF(cx, base + 35, k === 'ips' ? '(유도만능)' : '줄기세포', bw + 24, 11.5, 9, '#64748b', 'center', 700);
    });
  }


  /* ===================== ③ 와딩턴 지형: 분화 유도와 역분화 ===================== */
  const HLO = PHONE ? { x: 56, y: 4, s: 0.68 } : { x: 0, y: 0, s: 1 };
  const hp = (x, y) => ({ x: HLO.x + x * HLO.s, y: HLO.y + y * HLO.s });
  const HLT = hp(280, 128);
  const HLP = {
    n: { a: [280, 128], c1: [205, 190], c2: [105, 285], b: [105, 402] },
    m: { a: [280, 128], c1: [268, 215], c2: [285, 335], b: [280, 436] },
    s: { a: [280, 128], c1: [355, 190], c2: [455, 285], b: [455, 402] },
  };
  function hlPos(k, s) {
    const P = HLP[k], u = 1 - s, f = (i) => P.a[i] * u * u * u + 3 * P.c1[i] * u * u * s + 3 * P.c2[i] * u * s * s + P.b[i] * s * s * s;
    return hp(f(0), f(1));
  }
  const HLD = PHONE ? { x: 12, y: 372, w: 456, h: 260 } : { x: 548, y: 56, w: 236, h: 472 };
  const FACT = [['Oct4', '#ef4444'], ['Sox2', '#3b82f6'], ['Klf4', '#16a34a'], ['c-Myc', '#f59e0b']];
  const HL = { ball: { fate: null, s: 0, origin: 'stem', anim: null }, done: { n: false, m: false, s: false }, reprog: false, patientN: false, patient: false, msg: '', prog: 0 };
  const COL_DOTS = (() => { const r = mulberry(77), a = []; for (let i = 0; i < 300; i++) { const ang = r() * TAU, rad = Math.sqrt(r()) * 0.9; a.push([Math.cos(ang) * rad, Math.sin(ang) * rad]); } return a; })();
  const COLONIES = (() => { const r = mulberry(31), a = []; let guard = 0; while (a.length < 30 && guard++ < 2000) { const ang = r() * TAU, rad = Math.sqrt(r()) * 0.82, p = [Math.cos(ang) * rad, Math.sin(ang) * rad]; if (a.every((q) => Math.hypot(q[0] - p[0], q[1] - p[1]) > 0.16)) a.push(p); } return a; })();
  function hlReset() { HL.ball = { fate: null, s: 0, origin: 'stem', anim: null }; HL.done = { n: false, m: false, s: false }; HL.reprog = false; HL.patientN = false; HL.patient = false; HL.msg = ''; HL.prog = 0; parts.clear(); updateCtl(); }
  function hlSignal(f) {
    const b = HL.ball;
    if (b.anim) return;
    if (b.fate !== null) { showHint('이미 분화했어요. "새 줄기세포"를 누르거나 4인자로 되돌려요.'); Sound.fail(); return; }
    b.fate = f; b.anim = { kind: 'roll', t: 0 }; Sound.click(); updateCtl();
  }
  function hlNew() { if (HL.ball.anim) return; HL.ball = { fate: null, s: 0, origin: 'stem', anim: null }; HL.msg = ''; Sound.click(); updateCtl(); }
  function hlPatient() { if (HL.ball.anim) return; HL.ball = { fate: 's', s: 1, origin: 'skin', anim: null }; HL.patient = true; HL.prog = 0; HL.msg = '환자의 피부 세포예요. 이미 분화해서 피부 골짜기 바닥에 있어요.'; Sound.click(); updateCtl(); }
  function hlFactor() {
    const b = HL.ball;
    if (b.anim) return;
    if (b.fate === null) { showHint('분화한 세포가 있어야 해요. 먼저 환자의 피부 세포를 가져오거나 신호를 눌러 분화시켜요.'); Sound.fail(); return; }
    b.anim = { kind: 'factor', t: 0 }; if (b.origin === 'skin') HL.prog = 0; Sound.click(); updateCtl();
  }
  function hlUpdate(dt) {
    const b = HL.ball, A = b.anim;
    if (!A) return;
    if (A.kind === 'roll') {
      A.t += dt / 1.6; const p = clamp(A.t, 0, 1); b.s = ease.outBounce(p);
      if (!RM && Math.random() < 0.5) { const q = hlPos(b.fate, b.s); parts.emit({ x: q.x, y: q.y, vx: (Math.random() - 0.5) * 30, vy: -10, life: 0.5, size: 3, color: specOf(b.fate).col, shape: 'circle' }); }
      if (A.t >= 1) { b.s = 1; b.anim = null; if (b.origin === 'stem') HL.done[b.fate] = true; if (b.origin === 'ips' && b.fate === 'n') { HL.patientN = true; HL.msg = '환자의 iPS 세포에서 신경 세포를 만들었어요. 환자 자신의 세포라 면역 거부가 줄어요.'; } else if (b.origin === 'stem') HL.msg = specOf(b.fate).n + '로 분화했어요 (신호 → 골짜기).'; Sound.success(); const q = hlPos(b.fate, 1); parts.burst(q.x, q.y, { count: 10, speed: 90, life: 0.6, colors: [specOf(b.fate).col, '#fff'] }); updateCtl(); }
    } else {
      const was = A.t; A.t += dt / 3.0;
      if (b.origin === 'skin') HL.prog = clamp((A.t - 0.3) / 0.6, 0, 1);
      if (A.t > 0.45) { const p = clamp((A.t - 0.45) / 0.55, 0, 1); b.s = (b.s0 == null ? (b.s0 = b.s) : b.s0) * (1 - ease.inOutCubic(p)); }
      if (A.t >= 1) { b.s = 0; b.s0 = null; b.fate = null; b.anim = null; if (b.origin === 'skin') { b.origin = 'ips'; HL.reprog = true; HL.prog = 1; HL.msg = '4인자가 피부 세포를 초기화했어요. 환자의 iPS 세포가 되었어요! (효율은 낮아요)'; } else HL.msg = '4인자가 세포를 줄기세포 상태로 되돌렸어요.'; Sound.success(); parts.burst(HLT.x, HLT.y, { count: 14, speed: 110, life: 0.7 }); updateCtl(); }
    }
  }
  function hillDrawLand() {
    const m = (x, y) => hp(x, y);
    const a = m(20, 508), b = m(280, 70), c = m(540, 508);
    ctx.save();
    const g = ctx.createLinearGradient(0, m(0, 70).y, 0, m(0, 508).y); g.addColorStop(0, '#d9f0cf'); g.addColorStop(0.55, '#a7d49b'); g.addColorStop(1, '#79b36d');
    ctx.beginPath(); ctx.moveTo(a.x, a.y); const c1 = m(90, 300), c2 = m(190, 95), c3 = m(370, 95), c4 = m(470, 300);
    ctx.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, b.x, b.y); ctx.bezierCurveTo(c3.x, c3.y, c4.x, c4.y, c.x, c.y); ctx.closePath();
    ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = '#5f9a56'; ctx.lineWidth = 3; ctx.stroke();
    ctx.clip();
    /* 골짜기 홈 */
    ['n', 'm', 's'].forEach((k) => {
      const P = HLP[k], p0 = m(P.a[0], P.a[1] + 6), p1 = m(P.c1[0], P.c1[1]), p2 = m(P.c2[0], P.c2[1]), p3 = m(P.b[0], P.b[1]);
      ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(70,110,60,.55)'; ctx.lineWidth = 34 * HLO.s; ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.bezierCurveTo(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y); ctx.stroke();
      ctx.strokeStyle = 'rgba(210,235,200,.65)'; ctx.lineWidth = 20 * HLO.s; ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.bezierCurveTo(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y); ctx.stroke();
    });
    ctx.restore();
    /* 골짜기 바닥 웅덩이 + 이름 */
    SPEC.forEach((sp) => {
      const q = HLP[sp.k].b, pp = m(q[0], q[1]);
      ctx.beginPath(); ctx.ellipse(pp.x, pp.y + 14 * HLO.s, 46 * HLO.s, 17 * HLO.s, 0, 0, TAU); ctx.fillStyle = C.rgba(sp.col, 0.3); ctx.fill(); ctx.strokeStyle = sp.col; ctx.lineWidth = 2.2; ctx.stroke();
      TF(pp.x, pp.y + 44 * HLO.s + 4, sp.n, 120, PHONE ? 13 : 15, 10.5, C.shade(sp.col, -0.25), 'center', 800);
    });
    const top = m(280, 70);
    T(top.x, top.y - 6, '높은 곳: 분화하지 않은 상태', PHONE ? 12 : 14, '#3f7d3a', 'center', 800);
  }
  function hlBallDraw(t) {
    const b = HL.ball, p = b.fate ? hlPos(b.fate, b.s) : HLT, r = (PHONE ? 15 : 21);
    if (b.fate === null) { stemCell(p.x, p.y, r, { ips: b.origin === 'ips' }); TF(p.x, p.y - r - 12, b.origin === 'ips' ? '환자의 iPS 세포' : '줄기세포', 130, PHONE ? 12.5 : 14, 10, '#14532d', 'center', 800, { stroke: '#fff', strokeWidth: 3 }); }
    else { specCell(p.x, p.y, r, b.fate, clamp(b.s * 1.7, 0, 1), 1); if (b.origin === 'skin' || b.origin === 'ips') TF(p.x, p.y - r - 12, b.origin === 'skin' ? '환자의 피부 세포' : '환자의 iPS 유래 세포', 150, PHONE ? 12.5 : 14, 10, '#1e3a8a', 'center', 800, { stroke: '#fff', strokeWidth: 3 }); }
    /* 4인자 입자 */
    const A = b.anim;
    if (A && A.kind === 'factor') {
      FACT.forEach(([nm, col], i) => {
        const st = clamp((A.t - i * 0.06) / 0.35, 0, 1), from = { x: HLD.x + HLD.w * (0.2 + 0.2 * i), y: HLD.y + (PHONE ? 40 : HLD.h - 90) };
        const ang = clamp((A.t - 0.35) / 0.65, 0, 1) * TAU * 2 + i * TAU / 4, rad = r * 1.9 * (1 - 0.15 * Math.sin(t * 6));
        const px = lerp(from.x, p.x + Math.cos(ang) * rad, ease.outCubic(st)), py = lerp(from.y, p.y + Math.sin(ang) * rad, ease.outCubic(st));
        ctx.globalAlpha = A.t < 0.9 ? 1 : 1 - (A.t - 0.9) * 10; D.sphere(px, py, 9, col, { shadow: true }); T(px, py - 13, nm, 11.5, col, 'center', 800, { stroke: '#fff', strokeWidth: 3 }); ctx.globalAlpha = 1;
      });
    }
  }
  function hillDish() {
    const d = HLD; panel(d.x, d.y, d.w, d.h, 14, '#fff');
    TF(d.x + d.w / 2, d.y + 26, '역분화: 4인자 도입', d.w - 14, 15, 11, INK, 'center', 800);
    const cx = PHONE ? d.x + 110 : d.x + d.w / 2, cy = PHONE ? d.y + 150 : d.y + 150, R = PHONE ? 84 : 88;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fillStyle = '#f8fafc'; ctx.fill(); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2.6; ctx.stroke();
    COL_DOTS.forEach((q) => { ctx.fillStyle = 'rgba(148,163,184,.55)'; ctx.beginPath(); ctx.arc(cx + q[0] * R, cy + q[1] * R, 2, 0, TAU); ctx.fill(); });
    const n = HL.patient ? Math.floor(30 * HL.prog + 1e-6) : 0;
    for (let i = 0; i < n; i++) { const q = COLONIES[i]; D.glow(cx + q[0] * R, cy + q[1] * R, 9, '#22c55e', 0.5); D.sphere(cx + q[0] * R, cy + q[1] * R, 4.4, '#16a34a', { gloss: false }); }
    const tx = PHONE ? d.x + 215 : d.x + d.w / 2, ty = PHONE ? d.y + 70 : d.y + 262;
    const al = PHONE ? 'left' : 'center';
    if (HL.patient) {
      textBlock(tx - (PHONE ? 0 : (d.w - 28) / 2), ty, PHONE ? 230 : d.w - 28, '환자의 피부 섬유아세포 10만 개에 4인자를 넣으면', PHONE ? 13 : 14, INK, 17, 700, 'left');
      T(tx - (PHONE ? 0 : (d.w - 28) / 2), ty + (PHONE ? 52 : 52), 'iPS 콜로니 ' + n + '개', 20, '#15803d', 'left', 800);
      T(tx - (PHONE ? 0 : (d.w - 28) / 2), ty + (PHONE ? 76 : 76), HL.prog >= 1 ? '약 0.03 % (30 / 100000)' : '만드는 중…', PHONE ? 14 : 15, '#475569', 'left', 800);
    } else textBlock(tx - (PHONE ? 0 : (d.w - 28) / 2), ty, PHONE ? 230 : d.w - 28, '환자의 피부 세포를 가져오면 10만 개 중 몇 개가 iPS가 되는지 볼 수 있어요.', PHONE ? 13 : 14, '#64748b', 17, 700, 'left');
    /* 4인자 범례 */
    FACT.forEach(([nm, col], i) => { const x = PHONE ? d.x + 215 + (i % 2) * 112 : d.x + 26 + (i % 2) * 104, y = PHONE ? d.y + 196 + Math.floor(i / 2) * 26 : d.y + d.h - 62 + Math.floor(i / 2) * 26; D.sphere(x, y, 8, col, {}); T(x + 14, y + 4.5, nm, 13.5, INK, 'left', 800); });
  }
  function hillDraw(dt, t) {
    hlUpdate(dt);
    TF(VW / 2, 24, '와딩턴 지형: 공이 굴러내리는 곳이 세포의 분화 방향이에요', VW - 24, PHONE ? 14 : 16, 11, INK, 'center', 800);
    hillDrawLand(); hlBallDraw(t); hillDish();
    if (HL.msg) bubble(PHONE ? 12 : 16, PHONE ? 334 : VH - 62, PHONE ? VW - 24 : 510, HL.msg, { size: PHONE ? 12 : 13.5, fill: '#fffbea', line: '#fcd34d' });
  }

  /* ===================== ④ 치료 사례 단계 분류 ===================== */
  const CASE_BOX = [{ id: 'ok', label: '승인된 치료', col: '#16a34a' }, { id: 'trial', label: '임상 시험 단계', col: '#f59e0b' }, { id: 'res', label: '연구 단계', col: '#7c3aed' }];
  const CASE6 = [
    { id: 'hsc', own: 'ok', label: '조혈모세포 이식 (백혈병 등)', short: '조혈모세포 이식', icon: '🩸', col: '#16a34a' },
    { id: 'epi', own: 'ok', label: '표피 줄기세포로 배양한 피부 이식 (심한 화상)', short: '배양 피부 이식', icon: '🔥', col: '#16a34a' },
    { id: 'cor', own: 'trial', label: 'iPS 유래 세포를 이용한 각막 질환 연구', short: 'iPS 각막', icon: '👁', col: '#f59e0b' },
    { id: 'pd', own: 'trial', label: 'iPS 유래 세포를 이용한 파킨슨병 연구', short: 'iPS 파킨슨병', icon: '🧠', col: '#f59e0b' },
    { id: 'sci', own: 'res', label: '척수 손상 복구 연구', short: '척수 손상 복구', icon: '🦴', col: '#7c3aed' },
    { id: 'isl', own: 'res', label: '당뇨병의 췌도 세포 재생 연구', short: '췌도 세포 재생', icon: '🧬', col: '#7c3aed' },
  ];
  const caseSorter = triSorter(CASE6, CASE_BOX, PHONE ? 44 : 58, PHONE ? 28 : 34);
  const casePT = sorterPT(() => caseSorter);
  const caseWrong = () => caseSorter.cards.filter((c) => c.zone && c.zone !== c.own);
  const caseDraw = (dt) => { triDraw(caseSorter, dt, '사례 카드를 알맞은 단계 상자에 넣어요 (교육용 요약)'); };

  /* ===================== ④ 광고 점검과 의견 ===================== */
  const CHK = [
    ['c1', '승인된 치료인지, 임상 시험 단계인지 확인해요', true],
    ['c2', '근거 자료(논문 · 임상 시험 기록)가 있는지 확인해요', true],
    ['c3', '부작용과 한계를 설명하는지 확인해요', true],
    ['c4', '후기가 많으면 안전하다고 믿어요', false],
    ['c5', '가격이 비쌀수록 효과가 좋다고 생각해요', false],
    ['c6', '"모든 병에 효과가 있다"는 말이면 믿을 만해요', false],
  ];
  const SENT = {
    eth: [['eth1', '배아를 이용하는 연구는 생명의 시작에 대한 윤리적 논의와 동의 절차가 꼭 필요해요.', true], ['eth2', 'iPS는 배아를 쓰지 않지만 환자 정보 보호와 동의 같은 윤리 문제는 남아 있어요.', true], ['eth3', '윤리 문제는 기술이 좋아지면 저절로 없어지므로 논의할 필요가 없어요.', false]],
    cost: [['cost1', '치료가 승인되어도 비용이 높으면 받기 어려운 사람이 생겨 공정한 지원 방안이 필요해요.', true], ['cost2', '환자 맞춤형 세포는 만드는 시간과 비용이 커서 비용을 낮추는 연구가 필요해요.', true], ['cost3', '비싼 치료일수록 항상 효과가 크므로 비용은 걱정하지 않아도 돼요.', false]],
    safe: [['safe1', '종양이 생길 위험이 있어서 오랫동안 추적하며 안전성을 확인해야 해요.', true], ['safe2', '승인 전에는 임상 시험으로 안전성과 효과를 단계별로 검증해야 해요.', true], ['safe3', '동물 실험에서 한 번 성공하면 사람에게도 안전하다고 볼 수 있어요.', false]],
    reg: [['reg1', '승인되지 않은 시술의 광고를 막고 치료의 단계를 투명하게 알리는 규제가 필요해요.', true], ['reg2', '연구 윤리 심의와 임상 시험 승인 제도가 있어야 환자를 보호할 수 있어요.', true], ['reg3', '규제는 연구를 늦추므로 없애는 것이 환자에게 가장 좋아요.', false]],
  };
  const TOPIC = { eth: '윤리', cost: '비용', safe: '안전', reg: '규제' };
  const TK = { chk: {}, topic: null, sent: '' };
  const tkSentOf = () => (TK.topic ? SENT[TK.topic].find((q) => q[0] === TK.sent) : null);
  function tkReset() { TK.chk = {}; TK.topic = null; TK.sent = ''; updateCtl(); }
  const tkChkOK = () => CHK.every((q) => !!TK.chk[q[0]] === q[2]);
  const tkSentOK = () => { const s = tkSentOf(); return !!(s && s[2]); };
  function talkDraw(dt, t) {
    TF(VW / 2, 28, '근거 없는 시술 광고를 살펴보고 모둠 의견을 모아요 (가상 사례)', VW - 24, PHONE ? 14 : 16, 11.5, INK, 'center', 800);
    const pw = PHONE ? VW - 24 : 352, ph = PHONE ? 130 : 182, px = 12, py = 46;
    D.shadow(() => { D.roundRect(px, py, pw, ph, 14); const g = ctx.createLinearGradient(px, py, px + pw, py + ph); g.addColorStop(0, '#fff1f2'); g.addColorStop(1, '#fef3c7'); ctx.fillStyle = g; ctx.fill(); }, { blur: 6, y: 2 });
    ctx.strokeStyle = '#f87171'; ctx.lineWidth = 3; ctx.setLineDash([8, 5]); D.roundRect(px, py, pw, ph, 14); ctx.stroke(); ctx.setLineDash([]);
    D.label(px + 56, py + 18, '가상 광고', { bg: '#dc2626', size: 12, pad: 7 });
    TF(px + pw / 2, py + (PHONE ? 58 : 76), '모든 병을 낫게 하는 줄기세포 시술!', pw - 24, PHONE ? 18 : 22, 13, '#b91c1c', 'center', 800);
    TF(px + pw / 2, py + (PHONE ? 86 : 112), '후기 1000건 · 지금만 특별 할인', pw - 24, PHONE ? 14 : 17, 11, '#b45309', 'center', 800);
    TF(px + pw / 2, py + (PHONE ? 112 : 146), '부작용은 걱정 없어요!', pw - 24, PHONE ? 13 : 16, 10.5, '#64748b', 'center', 800);
    /* 점검표 */
    const cx = PHONE ? 12 : 376, cy = PHONE ? py + ph + 10 : 46, cw = PHONE ? VW - 24 : VW - 388, rh = PHONE ? 30 : 38, chh = 30 + CHK.length * rh;
    panel(cx, cy, cw, chh, 14, '#fff');
    T(cx + 14, cy + 22, '확인할 점 점검', PHONE ? 13.5 : 15, INK, 'left', 800);
    CHK.forEach((q, i) => {
      const y = cy + 40 + i * rh, on = !!TK.chk[q[0]], good = on && q[2], badp = on && !q[2];
      ctx.fillStyle = good ? '#16a34a' : badp ? '#dc2626' : '#e2e8f0'; ctx.beginPath(); ctx.arc(cx + 22, y + rh / 2 - 6, 9, 0, TAU); ctx.fill();
      T(cx + 22, y + rh / 2 - 1, good ? '✓' : badp ? '✖' : '', 12, '#fff', 'center', 800);
      TF(cx + 40, y + rh / 2 - 1, q[1], cw - 52, PHONE ? 12 : 13.5, 9.5, badp ? '#b91c1c' : INK, 'left', 700);
    });
    /* 의견 */
    const oy = PHONE ? cy + chh + 10 : py + ph + 14, ow = PHONE ? VW - 24 : 352, oh = PHONE ? VH - oy - 10 : VH - oy - 12;
    panel(12, oy, ow, oh, 14, tkSentOK() ? '#f0fdf4' : '#fff'); ctx.strokeStyle = tkSentOK() ? '#16a34a' : '#d5deea'; ctx.lineWidth = 2; D.roundRect(12, oy, ow, oh, 14); ctx.stroke();
    T(26, oy + 24, '💬 모둠 의견' + (TK.topic ? ' · ' + TOPIC[TK.topic] : ''), 14.5, '#15803d', 'left', 800);
    const s = tkSentOf();
    if (s) wrap(s[1], ow - 30, PHONE ? 13 : 15, 800).slice(0, PHONE ? 3 : 5).forEach((l, i) => T(26, oy + 50 + i * (PHONE ? 18 : 22), l, PHONE ? 13 : 15, s[2] ? INK : '#b91c1c', 'left', 800));
    else TF(26, oy + 56, '주제를 고르고 의견 문장을 골라요', ow - 30, 14, 10.5, '#94a3b8', 'left', 800);
  }


  /* =========================================================
     화면 전환 · 조작 연결
     ========================================================= */
  const PTS = { sort: sortPT, cases: casePT };
  function setMode(m) {
    if (S.mode !== m) S.fade = 1;
    S.mode = m; PT = PTS[m] || null; hideHint(); updateCtl();
  }
  const ctlNodes = $$('#ctrlCard .control');
  $('#tkChk').innerHTML = CHK.map((q) => '<button type="button" class="mc" data-v="' + q[0] + '">' + q[1] + '</button>').join('');
  function updateCtl() {
    const fr = game ? game.free : false, lvNow = game ? game.level : 0;
    ctlNodes.forEach((n) => { n.hidden = (n.dataset.modes || '').split(' ').indexOf(S.mode) < 0; });
    modeButtons(S.mode, lvNow, fr);
    $$('#dvKind button').forEach((b) => b.classList.toggle('on', DV.kind === b.dataset.v));
    $('#dvGo').disabled = !dvCanGo();
    $('#dvNote').innerHTML = DV.lost ? '줄기세포가 모두 없어졌어요. ↺ 처음부터 다시 해요.' : DV.kind === 'asym' ? '<b>자기 복제</b>와 <b>분화</b>를 한 번에: 줄기세포 1개가 줄기세포 1개와 분화 세포 1개가 돼요.' : DV.kind === 'diff' ? '딸세포 둘이 모두 분화하면 줄기세포가 줄어요.' : '딸세포 둘이 모두 줄기세포로 남으면 줄기세포가 늘어요.';
    $$('#rgSel button').forEach((b) => { b.classList.toggle('on', RG.sel === b.dataset.v); b.classList.toggle('seen', RG.tested[b.dataset.v] != null); });
    $('#rgGo').disabled = !!(RG.run && !RG.run.done); $('#rgAskBox').hidden = !rgAll();
    $$('#rgAns button').forEach((b) => b.classList.toggle('on', RG.ans === b.dataset.v));
    const busy = !!HL.ball.anim;
    $$('#hlSig button[data-v]').forEach((b) => { b.disabled = busy; }); $('#hlNew').disabled = busy; $('#hlPatient').disabled = busy; $('#hlFactor').disabled = busy;
    $('#hlNote').innerHTML = HL.done.n || HL.done.m || HL.done.s ? '분화시킨 계통: ' + SPEC.filter((q) => HL.done[q.k]).map((q) => q.n).join(' · ') + '. 새 줄기세포를 놓고 다른 신호도 눌러 봐요.' : '신호 분자를 눌러 줄기세포(꼭대기)를 신경 · 근육 · 피부 골짜기로 굴려요.';
    $$('#tkChk button').forEach((b) => b.classList.toggle('on', !!TK.chk[b.dataset.v]));
    $$('#tkTopic button').forEach((b) => b.classList.toggle('on', TK.topic === b.dataset.v));
    const sel = $('#tkSent'); const want = TK.topic || '';
    if (sel.dataset.topic !== want) { sel.dataset.topic = want; fillSel(sel, TK.topic ? SENT[TK.topic].map((q) => [q[0], q[1]]) : [], TK.topic ? '의견 문장을 골라요' : '먼저 주제를 골라요'); sel.value = TK.sent || ''; }
  }
  bindModes(setMode);
  $$('#dvKind button').forEach((b) => b.addEventListener('click', () => { Sound.click(); DV.kind = b.dataset.v; updateCtl(); }));
  $('#dvGo').addEventListener('click', dvGo); $('#dvReset').addEventListener('click', () => { Sound.click(); dvReset(); });
  $('#sortReset').addEventListener('click', () => { Sound.click(); sortSorter.reset(); });
  $$('#rgSel button').forEach((b) => b.addEventListener('click', () => { if (RG.run && !RG.run.done) return; Sound.click(); RG.sel = b.dataset.v; updateCtl(); }));
  $('#rgGo').addEventListener('click', rgGo);
  $$('#rgAns button').forEach((b) => b.addEventListener('click', () => { Sound.click(); RG.ans = b.dataset.v; updateCtl(); }));
  $$('#hlSig button[data-v]').forEach((b) => b.addEventListener('click', () => hlSignal(b.dataset.v)));
  $('#hlNew').addEventListener('click', hlNew); $('#hlPatient').addEventListener('click', hlPatient); $('#hlFactor').addEventListener('click', hlFactor);
  $('#caseReset').addEventListener('click', () => { Sound.click(); caseSorter.reset(); });
  $$('#tkChk button').forEach((b) => b.addEventListener('click', () => { Sound.click(); TK.chk[b.dataset.v] = !TK.chk[b.dataset.v]; updateCtl(); }));
  $$('#tkTopic button').forEach((b) => b.addEventListener('click', () => { Sound.click(); TK.topic = b.dataset.v; TK.sent = ''; updateCtl(); }));
  $('#tkSent').addEventListener('change', (e) => { TK.sent = e.target.value; Sound.click(); updateCtl(); });
  $('#tkReset').addEventListener('click', () => { Sound.click(); tkReset(); });

  /* =========================================================
     미션
     ========================================================= */
  const levels = [
    {
      title: '줄기세포란', short: '줄기세포란', icon: '🔬', phase: '관찰',
      intro: '<p class="si-q">❓ 탐구 질문: 한 번 분화한 세포를 다시 되돌릴 수 있다면 망가진 몸을 고칠 수 있을까?</p><p>🔗 <b>통합과학</b>과 중학교에서 세포 분열을, 앞 차시 <b>세포 분화와 유전자 발현</b>에서 분화가 유전자 발현 프로그램의 결과라는 것을 배웠어요. 오늘은 <b>줄기세포</b>를 만나요.</p><p>줄기세포는 <b>자기 복제</b>(자기와 같은 세포를 만듦)와 <b>분화</b>(여러 세포로 변함)를 함께 해요. 분열 방식을 바꿔 가며 줄기세포 수가 어떻게 되는지 관찰해요.</p>',
      features: ['divide'],
      setup() { DV.kind = 'asym'; dvReset(); setMode('divide'); },
      recap: '줄기세포는 비대칭 분열로 줄기세포 하나는 남기고(자기 복제) 하나는 분화시켜서, 줄기세포 수를 유지하면서 새 세포를 계속 공급해요.',
      summary: '<ul><li><b>줄기세포</b> = <b>자기 복제</b>(자기 재생)와 <b>분화</b> 능력을 함께 가진 세포.</li><li><b>비대칭 분열</b>: 줄기세포 1개 → 줄기세포 1개 + 분화 세포 1개. 그래서 줄기세포 수가 유지되면서 새 세포가 만들어져요.</li><li>줄기세포가 계속 분화만 하면 줄기세포가 <b>고갈</b>되어 새 세포를 더 이상 만들 수 없어요.</li></ul>',
      missions: [
        {
          id: 'divide', title: '비대칭 분열 5번',
          goal: '<b>비대칭 분열</b>을 <b>5번</b> 시키되 줄기세포가 없어지지 않게 하세요.',
          hint: '"비대칭 분열"을 고르고 ▶ 분열시키기를 눌러요. 한 번마다 줄기세포 1개와 분화 세포 1개가 생겨요.',
          setup() { DV.kind = 'asym'; dvReset(); setMode('divide'); },
          check: () => dvAsymOK(), hold: 0.6,
          status: () => mark(DV.asym >= 5) + ' 비대칭 분열 ' + DV.asym + ' / 5 &nbsp; ' + mark(DV.stems.length >= 1) + ' 줄기세포 ' + DV.stems.length + '개',
          explain: '<b>비대칭 분열</b>에서는 딸세포 하나가 줄기세포로 남고(<b>자기 복제</b>) 다른 하나는 <b>분화</b>해요. 그래서 분열을 5번 해도 줄기세포는 그대로 있고, 분화한 세포가 5개 늘어나요.',
        },
        {
          type: 'quiz', title: '분화만 계속하면',
          goal: '줄기세포가 분열할 때마다 <b>둘 다 분화</b>해 버리면 어떤 문제가 생길까요?',
          setup() { setMode('divide'); },
          choices: ['줄기세포가 점점 늘어난다', '줄기세포가 고갈되어 새 세포를 더 이상 만들 수 없게 된다', '분화한 세포가 다시 줄기세포로 돌아온다', '아무 문제도 생기지 않는다'],
          answer: 1,
          feedback: ['둘 다 분화하면 줄기세포는 오히려 줄어요.', '', '분화한 세포가 저절로 줄기세포가 되지는 않아요. 역분화는 특별한 처리가 필요해요.', '줄기세포가 없어지면 새 세포를 공급하지 못해요.'],
          explain: '줄기세포가 계속 분화만 하면 <b>줄기세포가 고갈</b>돼요. 줄기세포 수를 유지하는 <b>자기 복제</b>가 있어야 평생 새 세포를 공급할 수 있어요.',
        },
      ],
    },
    {
      title: '줄기세포의 종류', short: '종류', icon: '🗂', phase: '모형',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 줄기세포가 자기 복제와 분화를 함께 한다는 것을 확인했어요.</div><p>줄기세포는 <b>어디서 얻고 얼마나 다양한 세포로 분화하는지</b>에 따라 <b>배아줄기세포 · 성체줄기세포 · 유도만능줄기세포(iPS)</b>로 나뉘어요. 특징 카드를 분류하고, 분화 시험으로 분화 범위를 비교해요. (원리보다 활용 사례와 한계를 중심으로 봐요)</p>',
      features: ['sort', 'range'],
      setup() { sortSorter.reset(); setMode('sort'); },
      recap: '배아줄기세포와 iPS는 거의 모든 세포로 분화하지만 윤리 쟁점이나 종양 위험이 있고, 성체줄기세포는 분화 범위가 해당 조직의 몇 종류로 제한돼요.',
      summary: '<ul><li><b>배아줄기세포</b>: 배반포의 내세포괴에서 얻고 거의 모든 세포로 분화해요. 배아를 이용하는 <b>윤리 쟁점</b>, 타인 세포라 면역 거부 가능성.</li><li><b>성체줄기세포</b>: 골수의 <b>조혈모세포</b> 등. 분화 범위가 해당 조직의 몇 종류로 <b>제한</b>돼요. 조직에 적게 있어 얻기 어려워요.</li><li><b>유도만능줄기세포(iPS)</b>: 체세포에 전사 인자 4종을 넣어 만들어요. 환자 자신의 세포라 <b>면역 거부가 줄고</b> 배아를 파괴하지 않지만, <b>종양 위험</b>과 낮은 효율이 한계예요.</li><li>분화 시험(5개 계통 중): 배아 5 · iPS 5 · 성체(조혈모세포) 1.</li></ul>',
      missions: [
        {
          id: 'sort', title: '특징 분류', manual: true,
          goal: '특징 카드 9장을 알맞은 <b>줄기세포 종류</b> 상자에 넣으세요.',
          hint: '"배반포"와 "배아"는 배아줄기세포, "골수"와 "제한"은 성체줄기세포, "4인자"와 "환자 자신의 세포"는 iPS와 관련돼요.',
          setup() { sortSorter.reset(); setMode('sort'); },
          check() {
            if (sortSorter.placed < 9) { sortSorter.markBad([]); return '카드를 모두 상자에 넣어 주세요. (' + sortSorter.placed + ' / 9)'; }
            const w = sortWrong();
            if (w.length) { sortSorter.markBad(w.map((c) => c.id)); return '\'' + w[0].short + '\' 카드를 다시 생각해 보세요. 어느 줄기세포의 특징일까요?'; }
            sortSorter.markBad([]); return true;
          },
          explain: '<b>배아줄기세포</b>는 배반포의 내세포괴에서 얻고 윤리 쟁점이 있어요. <b>성체줄기세포</b>(골수의 조혈모세포 등)는 분화 범위가 제한돼요. <b>iPS</b>는 체세포에 4인자를 넣어 만들어 환자 자신의 세포를 쓸 수 있지만 종양 위험과 낮은 효율이 한계예요.',
        },
        {
          id: 'range', title: '분화 범위 비교',
          goal: '세 종류의 줄기세포를 모두 <b>분화 시험</b>하고, 분화 범위가 <b>가장 좁은</b> 줄기세포를 고르세요.',
          hint: '위쪽에서 줄기세포 종류를 고르고 🧪 분화 시험하기를 눌러요. 막대의 "n / 5"를 비교하면 가장 작은 쪽이 분화 범위가 좁아요.',
          setup() { rgReset(); setMode('range'); },
          check: () => rgAll() && RG.ans === 'asc', hold: 0.5,
          status: () => mark(rgAll()) + ' 세 종류 시험 ' + Object.keys(RG.tested).length + ' / 3 &nbsp; ' + mark(RG.ans === 'asc') + ' 가장 좁은 것 고르기',
          explain: '배아줄기세포와 iPS는 5개 계통 <b>모두</b>(5 / 5)로, 성체줄기세포(조혈모세포)는 <b>혈액 계통 1개</b>(1 / 5)로만 분화해요. 성체줄기세포는 해당 조직의 몇 종류로 분화가 <b>제한</b>돼요.',
        },
        {
          type: 'quiz', title: '성체줄기세포의 분화 범위',
          goal: '골수의 <b>조혈모세포</b> 같은 성체줄기세포는 어떤 세포로 분화할 수 있을까요?',
          setup() { setMode('range'); },
          choices: ['몸의 모든 종류의 세포', '해당 조직의 몇 종류의 세포(혈액 세포 등)로 제한된다', '어떤 세포로도 분화하지 못한다', '배아 세포로만 분화한다'],
          answer: 1,
          feedback: ['모든 세포로 분화하는 것은 배아줄기세포나 iPS의 특징이에요.', '', '조혈모세포는 혈액 세포로 분화해요. 이미 백혈병 등의 치료(조혈모세포 이식)에 쓰이고 있어요.', '성체줄기세포가 배아 세포로 분화하지는 않아요.'],
          explain: '성체줄기세포는 분화 범위가 <b>해당 조직의 몇 종류</b>로 제한돼요. 반면 배아줄기세포는 <b>배아를 이용한다는 윤리 쟁점</b>이 있어서 사회적 논의가 필요해요.',
        },
      ],
    },
    {
      title: '분화 유도와 역분화', short: '분화 유도', icon: '⛰', phase: '탐구',
      intro: '<div class="si-link">🔗 <b>앞 차시(세포 분화와 유전자 발현)</b>에서 분화는 발현 프로그램의 결과라고 배웠어요. 역분화는 그 <b>반대 방향</b>이에요.</div><p><b>와딩턴 지형</b>은 세포의 분화를 언덕을 굴러내리는 공에 비유해요. 신호 분자가 공을 신경 · 근육 · 피부 골짜기로 굴려요. 반대로 <b>4인자</b>(Oct4 · Sox2 · Klf4 · c-Myc)는 분화한 세포를 다시 언덕 꼭대기로 끌어올려 <b>iPS</b>로 만들어요.</p>',
      features: ['hill'],
      setup() { hlReset(); setMode('hill'); },
      recap: '신호 분자는 줄기세포를 신경 · 근육 · 피부로 분화시키고, 4인자는 분화한 체세포를 iPS로 되돌려요. 환자 자신의 세포로 만들면 면역 거부가 줄지만 효율은 약 0.03 %로 낮아요.',
      summary: '<ul><li><b>분화 유도</b>: 신호 분자에 따라 줄기세포가 신경 · 근육 · 피부 등 서로 다른 세포로 분화해요 (와딩턴 지형의 골짜기).</li><li><b>역분화</b>: 체세포에 전사 인자 4종(Oct4 · Sox2 · Klf4 · c-Myc)을 넣으면 줄기세포 상태의 <b>iPS</b>로 되돌아가요(2006년).</li><li>효율은 낮아요: 섬유아세포 10만 개에서 iPS 콜로니 약 30개(약 0.03 %).</li><li>환자 자신의 세포로 만든 iPS는 면역 거부가 줄고 배아를 파괴하지 않지만, <b>종양 위험</b>이 있어요.</li></ul>',
      missions: [
        {
          id: 'induce', title: '분화 유도 3가지',
          goal: '줄기세포에 신호 분자 A · B · C를 각각 넣어 <b>신경 · 근육 · 피부</b> 세포로 분화시키세요.',
          hint: '신호를 누르면 공이 굴러내려요. 한 번 분화한 뒤에는 🌱 새 줄기세포를 눌러 꼭대기에 새 줄기세포를 놓고 다른 신호를 눌러요.',
          setup() { hlReset(); setMode('hill'); },
          check: () => HL.done.n && HL.done.m && HL.done.s, hold: 0.5,
          status: () => mark(HL.done.n) + ' 신경 &nbsp; ' + mark(HL.done.m) + ' 근육 &nbsp; ' + mark(HL.done.s) + ' 피부',
          explain: '같은 줄기세포라도 <b>어떤 신호 분자</b>를 받느냐에 따라 서로 다른 골짜기로 굴러내려 <b>신경 · 근육 · 피부</b> 세포가 돼요. 분화한 세포는 골짜기 바닥에 있어 저절로 꼭대기로 올라가지 못해요.',
        },
        {
          id: 'ips', title: '환자 세포로 iPS 만들기',
          goal: '환자의 <b>피부 세포</b>를 가져와 <b>4인자</b>로 iPS로 되돌린 뒤, <b>신호 A</b>로 신경 세포로 분화시키세요.',
          hint: '① 환자의 피부 세포 가져오기 → ② 4인자 넣기(공이 꼭대기로 올라가요) → 신호 A: 신경을 눌러요.',
          setup() { hlReset(); setMode('hill'); },
          check: () => HL.reprog && HL.patientN, hold: 0.5,
          status: () => mark(HL.patient) + ' 환자 세포 &nbsp; ' + mark(HL.reprog) + ' iPS로 되돌림 &nbsp; ' + mark(HL.patientN) + ' 신경 세포로 분화',
          explain: '4인자(Oct4 · Sox2 · Klf4 · c-Myc)가 분화한 피부 세포를 <b>꼭대기(줄기세포 상태)로 되돌려</b> iPS가 돼요. 하지만 효율은 낮아서 <b>10만 개 중 약 30개(약 0.03 %)</b>만 iPS 콜로니가 돼요. 환자 자신의 세포로 만든 iPS에서 신경 세포를 만들면 면역 거부가 줄어요.',
        },
        {
          type: 'quiz', title: 'iPS의 장점과 위험',
          goal: 'iPS의 <b>장점 두 가지</b>와 <b>위험 한 가지</b>를 바르게 말한 것은?',
          setup() { setMode('hill'); },
          choices: ['환자 자신의 세포로 만들어 면역 거부가 줄고 배아를 파괴하지 않는다. 다만 종양이 생길 위험이 있다', '배아를 이용해 윤리 쟁점이 크다. 만드는 효율은 100 %이다', '성체줄기세포보다 항상 안전하고 모든 질병을 치료한다', '이미 모든 질병의 치료에 쓰이고 있어 위험이 전혀 없다'],
          answer: 0,
          feedback: ['', 'iPS는 배아를 이용하지 않아요. 효율도 0.03 % 정도로 낮아요.', '종양 위험 같은 한계가 있고, 모든 질병이 치료되는 것은 아니에요.', '임상 시험 단계인 연구가 많고, 위험을 확인하는 중이에요.'],
          explain: 'iPS의 장점은 <b>환자 자신의 세포</b>를 써서 <b>면역 거부가 줄어드는 것</b>과 <b>배아를 파괴하지 않는 것</b>이에요. 위험은 <b>종양</b>이 생길 수 있다는 점이고, 만드는 <b>효율이 낮은 것</b>도 한계예요.',
        },
      ],
    },
    {
      title: '치료와 전망', short: '치료와 전망', icon: '💬', phase: '소통',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 줄기세포의 종류와 분화 · 역분화를 확인했어요.</div><p>이제 줄기세포 <b>치료 사례</b>를 <b>승인 · 임상 시험 · 연구</b> 단계로 구분하고, 근거 없는 시술 광고에서 확인할 점을 정리해요. 그리고 모둠에서 <b>윤리 · 비용 · 안전 · 규제</b> 중 하나를 골라 전망 의견을 소통해요. (교육용 요약이며 치료 권유가 아니에요)</p>',
      features: ['cases', 'talk'],
      setup() { caseSorter.reset(); setMode('cases'); },
      recap: '줄기세포 치료는 승인된 것(조혈모세포 이식, 배양 피부 이식)과 임상 시험 · 연구 단계가 섞여 있어서, 치료의 단계와 근거를 확인해야 해요.',
      summary: '<ul><li><b>승인된 치료</b>: 골수의 조혈모세포 이식(백혈병 등), 표피 줄기세포로 배양한 피부 이식(심한 화상).</li><li><b>임상 시험 단계</b>: iPS 유래 세포를 이용한 각막 · 파킨슨병 · 심장 질환 연구. <b>연구 단계</b>: 척수 손상 복구, 당뇨병의 췌도 세포 재생.</li><li>승인되지 않은 줄기세포 시술 광고는 <b>치료 단계 · 근거 자료 · 부작용 설명</b>을 확인해야 해요.</li><li>전망 의견은 <b>윤리 · 비용 · 안전 · 규제</b>를 근거와 함께 말해요.</li></ul>',
      missions: [
        {
          id: 'cases', title: '치료 사례 단계 분류', manual: true,
          goal: '사례 카드 6장을 <b>승인 · 임상 시험 · 연구</b> 단계 상자에 넣으세요.',
          hint: '조혈모세포 이식과 배양 피부 이식은 이미 치료에 쓰이고 있어요. iPS를 이용한 각막과 파킨슨병은 임상 시험이 진행되는 단계예요.',
          setup() { caseSorter.reset(); setMode('cases'); },
          check() {
            if (caseSorter.placed < 6) { caseSorter.markBad([]); return '카드를 모두 상자에 넣어 주세요. (' + caseSorter.placed + ' / 6)'; }
            const w = caseWrong();
            if (w.length) { caseSorter.markBad(w.map((c) => c.id)); return '\'' + w[0].short + '\' 카드의 단계를 다시 생각해 보세요. 지금 실제 환자 치료에 쓰이고 있을까요?'; }
            caseSorter.markBad([]); return true;
          },
          explain: '<b>승인</b>된 치료는 조혈모세포 이식과 표피 줄기세포 배양 피부 이식이에요. iPS 유래 세포를 이용한 각막 · 파킨슨병 · 심장 질환은 <b>임상 시험</b> 단계이고, 척수 손상 복구와 췌도 세포 재생은 아직 <b>연구</b> 단계예요. (교육용 요약이며 치료 권유가 아니에요.)',
        },
        {
          id: 'talk', title: '광고 점검과 모둠 의견', manual: true,
          goal: '가상 광고를 볼 때 <b>확인할 점 3가지</b>를 모두 고르고, <b>주제와 의견 문장</b>을 하나 골라 모둠 의견을 완성하세요.',
          hint: '확인할 점은 "치료 단계", "근거 자료", "부작용 설명"이에요. 후기 수나 가격은 효과의 근거가 아니에요. 의견은 사실과 맞는 문장을 골라요.',
          setup() { tkReset(); setMode('talk'); },
          check() {
            const picked = CHK.filter((q) => TK.chk[q[0]]);
            if (!picked.length) return '광고에서 확인할 점을 골라 주세요.';
            const wrong = picked.find((q) => !q[2]);
            if (wrong) return '"' + wrong[1] + '"는 효과나 안전의 근거가 아니에요. 다시 생각해 보세요.';
            if (picked.length < 3) return '확인할 점이 더 있어요. (지금 ' + picked.length + ' / 3) 치료 단계, 근거 자료, 부작용 설명을 확인해 보세요.';
            if (!TK.topic) return '모둠 의견의 주제(윤리 · 비용 · 안전 · 규제)를 골라 주세요.';
            const s = tkSentOf();
            if (!s) return '의견 문장을 골라 주세요.';
            if (!s[2]) return '이 문장은 사실과 맞지 않아요. 근거를 들어 의견을 말해야 해요.';
            return true;
          },
          explain: '근거 없는 시술 광고는 <b>치료의 단계(승인 · 임상 시험)</b>, <b>근거 자료</b>, <b>부작용과 한계의 설명</b>을 확인해야 해요. 후기 수나 가격은 효과의 근거가 아니고, "모든 병에 효과"라는 말은 과장이에요. 전망 의견은 윤리 · 비용 · 안전 · 규제 중 하나를 <b>근거와 함께</b> 말해요.',
        },
        {
          type: 'quiz', title: '줄기세포 치료는 모든 질병에 쓰일까',
          goal: '줄기세포 치료는 <b>모든 질병</b>에 이미 쓰이고 있을까요?',
          setup() { setMode('talk'); },
          choices: ['네, 모든 질병에 승인되어 쓰이고 있다', '아니요. 일부만 승인되었고 나머지는 임상 시험이나 연구 단계라서 단계를 확인해야 한다', '아니요. 줄기세포 치료는 어떤 질병에도 쓰이지 않는다', '네, 광고에 나오면 모두 승인된 치료이다'],
          answer: 1,
          feedback: ['승인된 치료는 일부예요. 많은 사례가 임상 시험이나 연구 단계예요.', '', '조혈모세포 이식처럼 승인되어 쓰이는 치료도 있어요.', '광고에 나온다고 승인된 치료는 아니에요. 단계를 확인해야 해요.'],
          explain: '줄기세포 치료 중 <b>승인된 것은 일부</b>(조혈모세포 이식, 배양 피부 이식 등)이고, 나머지는 <b>임상 시험 · 연구 단계</b>예요. 광고만으로 판단하지 말고 <b>치료의 단계와 근거</b>를 확인해야 해요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hg-stem-cell', mount: '#game', badge: '줄기세포 탐험가', homeHref: '../../index.html#hg',
    featureLabels: { divide: '🔬 줄기세포 분열', sort: '🗂 특징 분류', range: '🧪 분화 범위', hill: '⛰ 와딩턴 지형', cases: '📋 치료 사례', talk: '💬 광고와 의견' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 읽음 칸 ---------- */
  function readouts() {
    const m = S.mode;
    if (m === 'divide') setReads(['줄기세포', DV.stems.length + '개', '분화한 세포', DV.diffs.length + '개', '비대칭 분열', DV.asym + ' / 5회']);
    else if (m === 'sort') setReads(['넣은 카드', sortSorter.placed + ' / 9', '맞게 넣은 카드', sortSorter.cards.filter((c) => c.zone === c.own).length + '장', '고른 카드', sortSorter.selected ? sortSorter.selected.short : '—']);
    else if (m === 'range') setReads(['시험한 종류', Object.keys(RG.tested).length + ' / 3', '배아 · 성체 · iPS', ['esc', 'asc', 'ips'].map((k) => (RG.tested[k] != null ? RG.tested[k] : '?')).join(' · ') + ' (5개 중)', '내 답', RG.ans ? RGT[RG.ans].n : '—']);
    else if (m === 'hill') setReads(['분화시킨 계통', SPEC.filter((q) => HL.done[q.k]).length + ' / 3', 'iPS로 되돌림', HL.reprog ? '완료' : '—', 'iPS 콜로니', HL.patient ? Math.floor(30 * HL.prog + 1e-6) + '개 (0.03 %)' : '—']);
    else if (m === 'cases') setReads(['넣은 카드', caseSorter.placed + ' / 6', '맞게 넣은 카드', caseSorter.cards.filter((c) => c.zone === c.own).length + '장', '고른 카드', caseSorter.selected ? caseSorter.selected.short : '—']);
    else setReads(['고른 확인점', CHK.filter((q) => TK.chk[q[0]]).length + ' / 3', '의견 주제', TK.topic ? TOPIC[TK.topic] : '—', '의견 문장', tkSentOK() ? '알맞아요' : TK.sent ? '다시 생각해요' : '—']);
  }

  /* ---------- 시작 ---------- */
  dvReset(); setMode('divide');
  let lastFree = false, lastLv = -1, lastKey = '';
  SciSim.loop((dt, t) => {
    clock = t; S.t = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (game && game.level !== lastLv) { lastLv = game.level; updateCtl(); }
    const key = (DV.anim ? 1 : 0) + '|' + (RG.run ? RG.run.done : '-') + '|' + (HL.ball.anim ? 1 : 0);
    if (key !== lastKey) { lastKey = key; updateCtl(); }
    view.apply(); ctx.clearRect(0, 0, VW, VH);
    bgFill('#eef4f2', '#e3ece8');
    switch (S.mode) {
      case 'divide': dvDraw(dt, t); break;
      case 'sort': sortDraw(dt, t); break;
      case 'range': rgDraw(dt, t); break;
      case 'hill': hillDraw(dt, t); break;
      case 'cases': caseDraw(dt, t); break;
      case 'talk': talkDraw(dt, t); break;
    }
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(241,246,243,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, PHONE, get game() { return game; }, levels, setMode, updateCtl, DV, dvGo, dvReset, dvAsymOK, sortSorter, FEAT, sortWrong, RG, rgGo, rgAll, RGT, HL, hlSignal, hlNew, hlPatient, hlFactor, hlReset, caseSorter, CASE6, caseWrong, TK, CHK, SENT, tkChkOK, tkSentOK, COLONIES,
  };
})();
