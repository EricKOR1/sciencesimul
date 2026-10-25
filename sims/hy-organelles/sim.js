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


  /* =========================================================
     소기관 그리기 도구 (g = 2D context). 크기는 모두 화면 픽셀 기준
     ========================================================= */
  const OD = (function () {
    const PI2 = Math.PI * 2;
    const PAL = {   // 만화 모식도 색
      cyt: '#fff8ea', nuc: '#cdbdf0', nucL: '#6d4fb3', chrom: '#8d73cf', nucleolus: '#5b3f9e',
      er: '#c4e6f6', erL: '#3b8fc4', rib: '#2f4f8f', gol: '#ffdcb0', golL: '#d9822b',
      lys: '#f9ccd8', lysL: '#d45a7a', lysDot: '#a02848',
      mit: '#ffd0b0', mitL: '#d9622b', cris: '#e8803f', mitMat: '#ffe8d8',
      chl: '#c4ecae', chlL: '#3f9b3a', gran: '#5fbf4f', vac: '#d9eeff', vacL: '#6aa7d6', wall: '#e0c88f', wallL: '#a98b4a',
    };
    const rng = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
    /* 크로마틴 점들 (단위 원 안) */
    const CHROM = (() => { const r = rng(7), a = []; for (let i = 0; i < 16; i++) { const t = r() * PI2, d = Math.sqrt(r()) * 0.74; a.push({ x: Math.cos(t) * d, y: Math.sin(t) * d, s: 0.05 + r() * 0.06 }); } return a; })();

    function rrect(g, x, y, w, h, r) { r = Math.max(0, Math.min(r, w / 2, h / 2)); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
    function smoothPath(g, P, close) {
      g.beginPath(); g.moveTo(P[0].x, P[0].y);
      for (let i = 1; i < P.length - 1; i++) { const mx = (P[i].x + P[i + 1].x) / 2, my = (P[i].y + P[i + 1].y) / 2; g.quadraticCurveTo(P[i].x, P[i].y, mx, my); }
      g.lineTo(P[P.length - 1].x, P[P.length - 1].y);
      if (close) g.closePath();
    }
    /* 중심선(pts)을 따라 두께 thick 의 납작한 주머니(띠). 끝은 둥글게. 반환: 위쪽(+법선)·아래쪽 가장자리 점 */
    function band(g, pts, thick, fill, line, lw, o) {
      o = o || {};
      const n = pts.length, L = [], R = [];
      for (let i = 0; i < n; i++) {
        const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
        let dx = b.x - a.x, dy = b.y - a.y; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
        let k = 1; if (o.taper) { const u = i / (n - 1); k = Math.max(0.35, Math.sin(Math.PI * Math.min(1, u * 0.9 + 0.05)) ** 0.5); }
        const h = thick / 2 * k;
        L.push({ x: pts[i].x - dy * h, y: pts[i].y + dx * h }); R.push({ x: pts[i].x + dy * h, y: pts[i].y - dx * h });
      }
      const all = L.concat(R.slice().reverse());
      smoothPath(g, all, true);
      if (fill) { g.fillStyle = fill; g.fill(); }
      if (line && lw > 0) { g.strokeStyle = line; g.lineWidth = lw; g.lineJoin = 'round'; g.stroke(); }
      return { L, R };
    }
    function ribo(g, x, y, r, col) {
      g.fillStyle = col; g.beginPath(); g.arc(x, y, r, 0, PI2); g.fill();
    }
    /* 호 모양 중심선 */
    function arcPts(cx, cy, rad, a0, a1, n) { const P = []; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; P.push({ x: cx + Math.cos(a) * rad, y: cy + Math.sin(a) * rad }); } return P; }
    function linePts(x0, y0, x1, y1, n, wob, ph) { const P = []; for (let i = 0; i <= n; i++) { const u = i / n, nx = -(y1 - y0), ny = (x1 - x0), d = Math.hypot(nx, ny) || 1; const w = Math.sin(u * Math.PI * 2 + (ph || 0)) * (wob || 0); P.push({ x: x0 + (x1 - x0) * u + nx / d * w, y: y0 + (y1 - y0) * u + ny / d * w }); } return P; }

    /* 핵 : 이중막 + 핵공 + 인 + 염색질.  o: {pal, det(0~1 세부), pore(0~1), lw} */
    function nucleus(g, x, y, r, o) {
      o = o || {}; const P = o.pal || PAL, det = o.det == null ? 1 : o.det, pore = o.pore == null ? det : o.pore, lw = o.lw || Math.max(1.6, r * 0.04);
      const gap = Math.max(lw * 1.9, r * 0.05);
      g.save(); g.translate(x, y);
      g.fillStyle = P.nuc; g.beginPath(); g.arc(0, 0, r, 0, PI2); g.fill();
      g.fillStyle = P.chrom; CHROM.forEach((c, i) => { g.globalAlpha = (o.chromA == null ? 0.55 : o.chromA); g.beginPath(); g.ellipse(c.x * r, c.y * r, c.s * r * 1.4, c.s * r, i, 0, PI2); g.fill(); });
      g.globalAlpha = 1;
      g.fillStyle = P.nucleolus; g.beginPath(); g.arc(r * 0.22, -r * 0.18, r * 0.2, 0, PI2); g.fill();
      g.strokeStyle = P.nucL; g.lineWidth = lw;
      g.beginPath(); g.arc(0, 0, r, 0, PI2); g.stroke();
      if (det > 0.02) { g.globalAlpha = det; g.beginPath(); g.arc(0, 0, r - gap, 0, PI2); g.stroke(); g.globalAlpha = 1; }
      const np = o.pores == null ? 8 : o.pores;
      if (pore > 0.02) for (let i = 0; i < np; i++) {   // 핵공: 두 막이 뚫려 있어요
        const a = (i + 0.35) / np * PI2 + (o.pa || 0), pw = Math.max(lw * 2.2, r * 0.07);
        g.save(); g.globalAlpha = pore; g.rotate(a);
        g.fillStyle = P.cyt; g.fillRect(r - gap - lw * 0.9, -pw / 2, gap + lw * 1.8, pw);
        g.fillStyle = P.nucL; g.fillRect(r - gap - lw * 0.9, -pw / 2 - lw * 0.5, lw * 1.2, lw); g.fillRect(r - gap - lw * 0.9, pw / 2 - lw * 0.5, lw * 1.2, lw);
        g.fillRect(r + lw * 0.1 - lw * 0.9, -pw / 2 - lw * 0.5, lw * 1.2, lw); g.fillRect(r + lw * 0.1 - lw * 0.9, pw / 2 - lw * 0.5, lw * 1.2, lw);
        g.restore();
      }
      g.restore();
    }
    /* 미토콘드리아 : 이중막 + 크리스타.  o: {pal, det(크리스타·안막), lw} */
    function mito(g, x, y, len, wid, rot, o) {
      o = o || {}; const P = o.pal || PAL, det = o.det == null ? 1 : o.det, lw = o.lw || Math.max(1.5, wid * 0.045);
      const gp = Math.max(lw * 2, wid * 0.07);
      g.save(); g.translate(x, y); g.rotate(rot || 0);
      rrect(g, -len / 2, -wid / 2, len, wid, wid / 2); g.fillStyle = P.mit; g.fill();
      g.strokeStyle = P.mitL; g.lineWidth = lw; g.stroke();
      if (det > 0.02) {
        g.globalAlpha = det;
        rrect(g, -len / 2 + gp, -wid / 2 + gp, len - gp * 2, wid - gp * 2, (wid - gp * 2) / 2); g.fillStyle = P.mitMat; g.fill(); g.stroke();
        const n = Math.max(3, Math.floor(len / (o.cs || wid * 0.2))), iw = wid / 2 - gp;
        g.strokeStyle = P.cris; g.lineWidth = lw * 0.95; g.lineCap = 'round';
        for (let i = 0; i < n; i++) {
          const px = -len / 2 + wid * 0.55 + (len - wid * 1.1) * (i + 0.5) / n, up = i % 2 === 0;
          g.beginPath(); g.moveTo(px, up ? -iw : iw); g.lineTo(px + (up ? 0.6 : -0.6) * lw, up ? -iw + iw * 0.95 : iw - iw * 0.95); g.stroke();
        }
        g.globalAlpha = 1;
      }
      g.restore();
    }
    /* 골지체 : 납작한 주머니가 층층이.  o: {pal, det(층 구분), ves(소낭 개수)} */
    function golgi(g, x, y, w, n, gap, rot, o) {
      o = o || {}; const P = o.pal || PAL, det = o.det == null ? 1 : o.det, th = o.th || Math.max(3, gap * 0.62), lw = o.lw || Math.max(1.4, th * 0.2);
      g.save(); g.translate(x, y); g.rotate(rot || 0);
      if (det < 0.98) {   // 흐릿할 때는 한 덩어리
        g.globalAlpha = 1 - det; rrect(g, -w / 2, -(n * gap) / 2, w, n * gap, gap); g.fillStyle = P.gol; g.fill(); g.strokeStyle = P.golL; g.lineWidth = lw; g.stroke(); g.globalAlpha = 1;
      }
      g.globalAlpha = Math.max(0, det);
      for (let i = 0; i < n; i++) {
        const yy = (i - (n - 1) / 2) * gap, ww = w * (1 - 0.1 * Math.abs(i - (n - 1) / 2) / Math.max(1, n / 2)), sag = gap * 0.9;
        const pts = []; for (let k = 0; k <= 10; k++) { const u = k / 10 * 2 - 1; pts.push({ x: u * ww / 2, y: yy + sag * (u * u) - sag * 0.4 }); }
        band(g, pts, th, P.gol, P.golL, lw, { taper: true });
      }
      const nv = o.ves == null ? 4 : o.ves, rr = Math.max(2, th * 0.55);
      for (let i = 0; i < nv; i++) { const side = i % 2 ? 1 : -1, vy = ((i * 0.37) % 1 - 0.5) * n * gap; g.beginPath(); g.arc(side * (w / 2 + rr * (1.6 + (i % 3) * 0.5)), vy + gap * 0.3, rr, 0, PI2); g.fillStyle = P.gol; g.fill(); g.strokeStyle = P.golL; g.lineWidth = lw; g.stroke(); }
      g.globalAlpha = 1; g.restore();
    }
    /* 리소좀 */
    function lyso(g, x, y, r, o) {
      o = o || {}; const P = o.pal || PAL, lw = o.lw || Math.max(1.5, r * 0.09);
      g.save(); g.translate(x, y);
      g.fillStyle = P.lys; g.beginPath(); g.arc(0, 0, r, 0, PI2); g.fill(); g.strokeStyle = P.lysL; g.lineWidth = lw; g.stroke();
      const rr = rng(11); g.fillStyle = P.lysDot; g.globalAlpha = o.dotA == null ? 0.85 : o.dotA;
      for (let i = 0; i < 7; i++) { const t = rr() * PI2, d = Math.sqrt(rr()) * r * 0.6; g.beginPath(); g.arc(Math.cos(t) * d, Math.sin(t) * d, Math.max(1, r * 0.1), 0, PI2); g.fill(); }
      g.globalAlpha = 1; g.restore();
    }
    /* 엽록체 : 이중막 + 그라나 */
    function chloro(g, x, y, rx, ry, rot, o) {
      o = o || {}; const P = o.pal || PAL, det = o.det == null ? 1 : o.det, lw = o.lw || Math.max(1.5, ry * 0.07);
      g.save(); g.translate(x, y); g.rotate(rot || 0);
      g.fillStyle = P.chl; g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, PI2); g.fill(); g.strokeStyle = P.chlL; g.lineWidth = lw; g.stroke();
      if (det > 0.02) {
        g.globalAlpha = det; g.beginPath(); g.ellipse(0, 0, rx - lw * 1.9, ry - lw * 1.9, 0, 0, PI2); g.stroke();
        const gx = [-0.55, -0.2, 0.2, 0.55], gy = [0.1, -0.12, 0.12, -0.08], hh = Math.max(1.4, ry * 0.075), ww = Math.max(5, ry * 0.5);
        g.strokeStyle = P.chlL; g.lineWidth = lw * 0.6; g.globalAlpha = det * 0.55;
        g.beginPath(); g.moveTo(-rx * 0.8, ry * 0.02); g.quadraticCurveTo(0, ry * 0.18, rx * 0.8, -ry * 0.02); g.stroke(); g.globalAlpha = det;
        gx.forEach((u, i) => { for (let k = 0; k < 4; k++) { rrect(g, u * rx - ww / 2, gy[i] * ry + (k - 1.5) * hh * 1.55 - hh / 2, ww, hh, hh / 2); g.fillStyle = P.gran; g.fill(); g.strokeStyle = P.chlL; g.lineWidth = lw * 0.5; g.stroke(); } });
        g.globalAlpha = 1;
      }
      g.restore();
    }
    function vacuole(g, x, y, w, h, r, o) {
      o = o || {}; const P = o.pal || PAL;
      rrect(g, x, y, w, h, r); g.fillStyle = P.vac; g.fill(); g.strokeStyle = P.vacL; g.lineWidth = o.lw || 2; g.stroke();
      g.fillStyle = 'rgba(255,255,255,.55)'; rrect(g, x + w * 0.06, y + h * 0.07, w * 0.3, h * 0.07, h * 0.035); g.fill();
    }
    /* 거친 소포체 : 호 모양 주머니 n 겹 + 리보솜 (cx, cy: 호의 중심) */
    function rer(g, cx, cy, rad, a0, a1, n, gap, o) {
      o = o || {}; const P = o.pal || PAL, th = o.th || Math.max(3, gap * 0.62), lw = o.lw || Math.max(1.3, th * 0.2), rr = o.rr || Math.max(1.6, th * 0.3);
      const out = [];
      for (let i = 0; i < n; i++) {
        const R = rad + i * gap, pts = arcPts(cx, cy, R, a0, a1, 14);
        band(g, pts, th, P.er, P.erL, lw, { taper: true });
        const dets = o.det == null ? 1 : o.det;
        if (dets > 0.02) {
          g.globalAlpha = dets;
          const m = Math.max(4, Math.floor(Math.abs(a1 - a0) * R / (rr * 3.4)));
          for (let k = 0; k < m; k++) {
            const a = a0 + (a1 - a0) * ((k + 0.5) / m), jig = ((k * 7 + i * 3) % 5) / 5 * 0.4;
            const edge = Math.sin(Math.PI * (k + 0.5) / m) ** 0.3;
            if (edge < 0.4) continue;
            const sides = (n === 1) ? [-1, 1] : (i === 0 ? [-1] : (i === n - 1 ? [1] : []));
            sides.forEach((s) => { const q = R + s * (th / 2 + rr * (0.8 + jig)); ribo(g, cx + Math.cos(a) * q, cy + Math.sin(a) * q, rr, P.rib); });
          }
          g.globalAlpha = 1;
        }
        out.push(pts);
      }
      return out;
    }
    /* 관 모양 소포체(매끈) : 분기된 관 그물 */
    function ser(g, cx, cy, s, o) {
      o = o || {}; const P = o.pal || PAL, th = o.th || Math.max(3, s * 0.07), lw = Math.max(1.3, th * 0.22);
      const nets = [
        [[-0.9, -0.1], [-0.55, -0.35], [-0.15, -0.2], [0.3, -0.45], [0.8, -0.3]],
        [[-0.55, -0.35], [-0.5, 0.15], [-0.1, 0.35], [0.35, 0.2]],
        [[-0.15, -0.2], [-0.05, 0.1], [-0.1, 0.35]],
        [[0.3, -0.45], [0.4, -0.05], [0.35, 0.2], [0.7, 0.45]],
        [[-0.1, 0.35], [0.0, 0.6], [0.3, 0.75]],
      ];
      nets.forEach((p) => { const pts = p.map((q) => ({ x: cx + q[0] * s, y: cy + q[1] * s })); band(g, pts, th, P.er, P.erL, lw); });
    }
    /* 리보솜(큰 단위 + 작은 단위) */
    function ribo2(g, x, y, s, big, small, col) {
      g.fillStyle = col || PAL.rib; g.beginPath(); g.ellipse(x, y, s * big, s * big * 0.78, 0, 0, PI2); g.fill();
      g.fillStyle = col ? col : '#4a6fc0'; g.beginPath(); g.ellipse(x + s * 0.1, y - s * big * 0.8, s * small, s * small * 0.62, 0, 0, PI2); g.fill();
    }
    return { PAL, PI2, rng, band, ribo, arcPts, linePts, smoothPath, nucleus, mito, golgi, lyso, chloro, vacuole, rer, ser, ribo2 };
  })();


  /* =========================================================
     고등학교 세포와 물질대사 · Ⅰ. 세포 - 세포 소기관과 분획법 (단원 56, 4차시)
     성취기준 [12세포01-03] (앞부분: 소기관의 구조와 기능, 현미경, 세포 분획법)
     ① 관찰: 현미경  ② 설명: 구조와 기능  ③ 모형: 원심분리기  ④ 적용: 세포 분획
     ========================================================= */
  const S = { mode: 'micro', fade: 0 };
  let game = null;
  const SS = 2;   // 오프스크린 해상도 배율

  /* ---------- 소기관 자료 ---------- */
  const ORG = {
    nuc: { name: '핵', mem: 2, col: '#6d4fb3', st: '이중막(핵막)에 핵공이 뚫려 있고, 안에 인과 염색질이 있어요.', fn: '유전 정보를 저장하고 세포 활동을 조절해요.', where: '동물 · 식물 세포', mt: '유전 정보 저장 · 세포 활동 조절' },
    rer: { name: '거친 소포체', mem: 1, col: '#3b8fc4', st: '납작한 주머니 모양의 단일막이에요. 겉면에 리보솜이 붙어 있어요.', fn: '리보솜에서 만든 단백질을 받아 운반해요.', where: '동물 · 식물 세포', mt: '단백질 운반 (리보솜이 붙어 있음)' },
    ser: { name: '매끈 소포체', mem: 1, col: '#2a9d8f', st: '리보솜이 없는 관 모양의 단일막이에요.', fn: '지질을 합성하고 독성 물질을 해독해요.', where: '동물 · 식물 세포', mt: '지질 합성 · 해독' },
    rib: { name: '리보솜', mem: 0, col: '#2f4f8f', st: '막이 없어요. 큰 단위와 작은 단위, 두 단위(단백질 + rRNA)로 이루어져요.', fn: '단백질을 합성해요(번역).', where: '동물 · 식물 세포', mt: '단백질 합성' },
    gol: { name: '골지체', mem: 1, col: '#d9822b', st: '납작한 주머니(단일막)가 층층이 쌓여 있어요.', fn: '단백질을 가공 · 분류 · 포장해서 분비해요.', where: '동물 · 식물 세포', mt: '단백질 가공 · 분류 · 포장' },
    lys: { name: '리소좀', mem: 1, col: '#d45a7a', st: '가수분해 효소가 들어 있는 단일막 주머니예요.', fn: '세포 안의 물질을 분해해요(세포 내 소화).', where: '동물 세포에서 두드러짐', mt: '세포 내 소화 (가수분해 효소)' },
    mit: { name: '미토콘드리아', mem: 2, col: '#d9622b', st: '이중막이고 안쪽 막이 접힌 크리스타가 있어요.', fn: '세포호흡으로 ATP를 만들어요(에너지 생산).', where: '동물 · 식물 세포', mt: '세포호흡 (ATP 생산)' },
    chl: { name: '엽록체', mem: 2, col: '#3f9b3a', st: '이중막이고 안에 틸라코이드 막이 쌓인 그라나가 있어요.', fn: '광합성으로 포도당을 만들어요.', where: '식물 세포', mt: '광합성' },
    vac: { name: '액포', mem: 1, col: '#4a8fc0', st: '단일막 주머니예요. 식물 세포에서는 크고 가운데에 있어요.', fn: '물질을 저장하고 삼투 조절을 도와요.', where: '식물 세포에서 크게 발달', mt: '저장 · 삼투 조절' },
    wal: { name: '세포벽', mem: 0, col: '#a98b4a', st: '세포막 바깥을 싸는 단단한 층이에요(셀룰로스). 막이 아니에요.', fn: '세포의 모양을 유지하고 보호해요.', where: '식물 세포', mt: '모양 유지 · 보호' },
  };
  const OKEYS = ['nuc', 'rer', 'ser', 'rib', 'gol', 'lys', 'mit', 'chl', 'vac', 'wal'];
  const ANIMAL_SET = ['nuc', 'rer', 'ser', 'rib', 'gol', 'lys', 'mit'];
  const PLANT_SET = ['nuc', 'rer', 'ser', 'rib', 'gol', 'mit', 'chl', 'vac', 'wal'];

  /* =========================================================
     ① 현미경 : 분해능에 따라 선명해지는 세포 (간세포의 일부)
     ========================================================= */
  const NMPX = PHONE ? 7 : 6;                 // 화면 1픽셀 = 몇 nm (시야의 크기)
  const px = (nm) => nm / NMPX;
  const MV = PHONE ? { x: 10, y: 10, w: 460, h: 330 } : { x: 14, y: 14, w: 520, h: 366 };
  const MINFO = PHONE ? { x: 10, y: 498, w: 460, h: 132 } : { x: 546, y: 14, w: 240, h: 366 };
  const MTR = PHONE ? { x: 10, y: 350, w: 460, h: 140 } : { x: 14, y: 392, w: 772, h: 154 };
  const SCN = document.createElement('canvas'); SCN.width = MV.w * SS; SCN.height = MV.h * SS;
  const sg = SCN.getContext('2d');
  const OUT = document.createElement('canvas'); OUT.width = MV.w * SS; OUT.height = MV.h * SS;
  const og = OUT.getContext('2d');
  const BT = document.createElement('canvas'); BT.width = MV.w * SS; BT.height = MV.h * SS;
  const poolD = [], poolU = [];
  function poolCv(arr, i, w, h) { const c = arr[i] || (arr[i] = document.createElement('canvas')); if (c.width !== w || c.height !== h) { c.width = w; c.height = h; } const x = c.getContext('2d'); x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high'; return c; }
  /* 줄였다가 다시 늘려서 흐리게 (k = 흐림 정도). 크기를 연속으로 바꿔서 부드럽게 변해요 */
  function blurInto(dst, src, k) {
    const W = src.width, H = src.height, dg = dst.getContext('2d');
    dg.imageSmoothingEnabled = true; dg.imageSmoothingQuality = 'medium';
    dg.clearRect(0, 0, W, H);
    if (k <= 1.04) { dg.drawImage(src, 0, 0); return; }
    const tw = Math.max(2, Math.round(W / k)), th = Math.max(2, Math.round(H / k));
    let cur = src, cw = W, ch = H, i = 0;
    while (cw / 2 > tw * 1.02) { i++; const nw = Math.round(cw / 2), nh = Math.round(ch / 2), c = poolCv(poolD, i, nw, nh), cg = c.getContext('2d'); cg.clearRect(0, 0, nw, nh); cg.drawImage(cur, 0, 0, nw, nh); cur = c; cw = nw; ch = nh; }
    { i++; const c = poolCv(poolD, i, tw, th), cg = c.getContext('2d'); cg.clearRect(0, 0, tw, th); cg.drawImage(cur, 0, 0, tw, th); cur = c; cw = tw; ch = th; }
    let u = 0;
    while (cw * 2 < W) { u++; const nw = cw * 2, nh = ch * 2, c = poolCv(poolU, u, nw, nh), cg = c.getContext('2d'); cg.clearRect(0, 0, nw, nh); cg.drawImage(cur, 0, 0, nw, nh); cur = c; cw = nw; ch = nh; }
    dg.drawImage(cur, 0, 0, W, H);
  }
  /* 팔레트: 전자 현미경(회색) ↔ 광학 현미경(염색) */
  const PEM = { cyt: '#d2d2d2', nuc: '#bcbcbc', nucL: '#262626', chrom: '#5c5c5c', nucleolus: '#505050', er: '#cfcfcf', erL: '#2a2a2a', rib: '#171717', gol: '#c9c9c9', golL: '#2a2a2a', lys: '#a6a6a6', lysL: '#262626', lysDot: '#2b2b2b', mit: '#b4b4b4', mitL: '#222222', cris: '#383838', mitMat: '#c6c6c6' };
  const PLM = { cyt: '#f5d9ea', nuc: '#a583d0', nucL: '#5b3f9e', chrom: '#5b3f9e', nucleolus: '#3f2a7a', er: '#ecc4dc', erL: '#c27aa6', rib: '#a0539a', gol: '#ecc9de', golL: '#c27aa6', lys: '#d89ac0', lysL: '#a0539a', lysDot: '#7d2c78', mit: '#e4a8c8', mitL: '#b05a92', cris: '#b05a92', mitMat: '#efc6dc' };
  function palMix(t) { const P = {}; Object.keys(PEM).forEach((k) => { P[k] = C.mix(PEM[k], PLM[k], t); }); return P; }
  const resOf = (s) => 200 * Math.pow(10, -3 * s / 100);
  const fmtRes = (r) => (r >= 100 ? Math.round(r) + ' nm' : r >= 10 ? r.toFixed(0) + ' nm' : r >= 1 ? r.toFixed(1) + ' nm' : r.toFixed(2) + ' nm');
  const detA = (need, res) => clamp(Math.log2(need / res) + 0.5, 0, 1);
  const NEED = { pore: 60, cris: 40, gol: 40, rib: 25, memb: 20, lys: 40 };
  /* 시야 안의 구조물 위치 (장면 좌표) */
  const SCL = (() => {
    const w = MV.w, h = MV.h;
    const nuc = { x: -0.06 * w, y: 0.28 * h, r: px(1250) };
    const mit = { x: 0.66 * w, y: 0.22 * h, len: px(1600), wid: px(600), rot: -0.18 };
    const rerR = { cx: 0.40 * w, rad: 480, cy: 0.80 * h - 480, a0: Math.PI / 2 - 0.225, a1: Math.PI / 2 + 0.225, n: 3, gap: px(110), th: px(50) };
    const gol = { x: 0.80 * w, y: 0.64 * h, w: px(1000), n: 5, gap: px(60), rot: -0.12 };
    const lys = { x: 0.50 * w, y: 0.50 * h, r: px(300) / 2 };
    return { w, h, nuc, mit, rerR, gol, lys };
  })();
  /* 오브젝트별 눌렀을 때 판정 */
  function microHit(x, y) {
    const L = SCL, c = Math.cos(-L.mit.rot), s = Math.sin(-L.mit.rot);
    if (Math.hypot(x - L.nuc.x, y - L.nuc.y) < L.nuc.r) return 'nuc';
    { const dx = x - L.mit.x, dy = y - L.mit.y, u = dx * c - dy * s, v = dx * s + dy * c, hl = L.mit.len / 2 - L.mit.wid / 2; const ex = Math.max(0, Math.abs(u) - hl); if (Math.hypot(ex, v) < L.mit.wid / 2 + 3) return 'mit'; }
    { const g = L.gol, dx = x - g.x, dy = y - g.y; if ((dx / (g.w / 2 + 14)) ** 2 + (dy / (g.n * g.gap / 2 + 18)) ** 2 < 1) return 'gol'; }
    if (Math.hypot(x - L.lys.x, y - L.lys.y) < L.lys.r + 8) return 'lys';
    { const q = L.rerR, d = Math.hypot(x - q.cx, y - q.cy), a = Math.atan2(y - q.cy, x - q.cx); if (d > q.rad - q.th - 12 && d < q.rad + (q.n - 1) * q.gap + q.th + 12 && a > q.a0 - 0.05 && a < q.a1 + 0.05) return 'rer'; }
    return null;
  }
  const ORGC = { nuc: () => [SCL.nuc.x + SCL.nuc.r * 0.35, SCL.nuc.y + SCL.nuc.r * 0.15], mit: () => [SCL.mit.x, SCL.mit.y], gol: () => [SCL.gol.x, SCL.gol.y], lys: () => [SCL.lys.x, SCL.lys.y], rer: () => [SCL.rerR.cx, SCL.rerR.cy + SCL.rerR.rad + SCL.rerR.gap] };
  /* 자유 리보솜 위치 (겹치지 않게 뽑기) */
  const FREE_RIB = (() => {
    const r = OD.rng(21), a = [], L = SCL;
    for (let i = 0; i < 400 && a.length < 38; i++) {
      const x = 10 + r() * (L.w - 20), y = 10 + r() * (L.h - 20);
      if (microHit(x, y)) continue;
      if (Math.hypot(x - L.nuc.x, y - L.nuc.y) < L.nuc.r + 12) continue;
      if (Math.hypot(x - L.mit.x, y - L.mit.y) < L.mit.len / 2 + 8) continue;
      if (Math.abs(x - L.gol.x) < L.gol.w / 2 + 40 && Math.abs(y - L.gol.y) < 50) continue;
      if (Math.hypot(x - L.lys.x, y - L.lys.y) < L.lys.r + 14) continue;
      if (Math.hypot(x - L.rerR.cx, y - (L.rerR.cy + L.rerR.rad + L.rerR.gap)) < 135 && y > L.rerR.cy + L.rerR.rad - 30) continue;
      if (a.some((q) => Math.hypot(q.x - x, q.y - y) < 22)) continue;
      a.push({ x, y });
    }
    return a;
  })();
  S.mi = { s: 0, ts: 0, tint: 1, key: '', pick: null, found: {}, seenLM: false, seenEM: false, wiggle: 0, msg: '' };
  function sceneDets(res) { return { pore: detA(NEED.pore, res), cris: detA(NEED.cris, res), gol: detA(NEED.gol, res), rib: detA(NEED.rib, res), mem: detA(NEED.memb, res), lys: detA(NEED.lys, res) }; }
  function renderScene(dt, tint) {
    const g = sg, L = SCL, P = palMix(tint);
    g.setTransform(SS, 0, 0, SS, 0, 0);
    g.fillStyle = P.cyt; g.fillRect(0, 0, L.w, L.h);
    const Pp = Object.assign({}, OD.PAL, P);
    // 자유 리보솜
    if (dt.rib > 0.02) { g.globalAlpha = dt.rib; FREE_RIB.forEach((q) => OD.ribo(g, q.x, q.y, px(26) / 2 + 0.6, P.rib)); g.globalAlpha = 1; }
    OD.nucleus(g, L.nuc.x, L.nuc.y, L.nuc.r, { pal: Pp, det: dt.mem, pore: dt.pore, lw: Math.max(1.4, px(9)), pores: 10, chromA: 0.5 });
    OD.mito(g, L.mit.x, L.mit.y, L.mit.len, L.mit.wid, L.mit.rot, { pal: Pp, det: dt.cris, lw: Math.max(1.4, px(9)), cs: px(75) });
    OD.golgi(g, L.gol.x, L.gol.y, L.gol.w, L.gol.n, L.gol.gap, L.gol.rot, { pal: Pp, det: dt.gol, th: px(34), lw: Math.max(1.2, px(8)), ves: 5 });
    OD.lyso(g, L.lys.x, L.lys.y, L.lys.r, { pal: Pp, lw: Math.max(1.4, px(9)), dotA: 0.2 + 0.7 * dt.lys });
    const q = L.rerR;
    OD.rer(g, q.cx, q.cy, q.rad, q.a0, q.a1, q.n, q.gap, { pal: Pp, det: dt.rib, th: q.th, lw: Math.max(1.2, px(8)), rr: px(26) / 2 + 0.6 });
  }
  function microUpdate(dt) {
    const m = S.mi;
    m.s = RM ? m.ts : approach(m.s, m.ts, dt, 6); if (Math.abs(m.s - m.ts) < 0.05) m.s = m.ts;
    const res = resOf(m.s);
    if (res >= 150) m.seenLM = true; if (res <= 12) m.seenEM = true;
    const tint = Math.round(clamp((Math.log10(res) - 1.3) / 1.0, 0, 1) * 20) / 20;
    const dd = sceneDets(res); Object.keys(dd).forEach((k) => { dd[k] = Math.round(dd[k] * 10) / 10; });
    const k = clamp(res / NMPX / 1.6, 1, 24) * SS;
    const skey = Object.values(dd).join(',') + '|' + tint;
    if (skey !== m.skey) { m.skey = skey; renderScene(dd, tint); m.key = ''; }
    const key = res.toFixed(2);
    if (key !== m.key) { m.key = key; blurInto(OUT, SCN, k); m.tint = tint; }
    m.wiggle = Math.max(0, m.wiggle - dt * 3);
  }
  function microPos(p) { return { x: p.x - MV.x, y: p.y - MV.y }; }
  function microDraw(dt, t) {
    const m = S.mi, res = resOf(m.s);
    microUpdate(dt);
    D.shadow(() => { D.roundRect(MV.x, MV.y, MV.w, MV.h, 16); ctx.fillStyle = '#222'; ctx.fill(); }, { blur: 10, y: 3 });
    ctx.save(); D.roundRect(MV.x, MV.y, MV.w, MV.h, 16); ctx.clip();
    ctx.drawImage(OUT, MV.x, MV.y, MV.w, MV.h);
    // 이름표
    Object.keys(m.found).forEach((k) => {
      const f = m.found[k], cc = ORGC[k](), x = MV.x + cc[0], y = MV.y + cc[1], a = smooth(Math.min(1, (t - f.t) * 4));
      ctx.globalAlpha = a;
      D.arrow(x + 44, y - 34, x + 6, y - 4, { color: '#fde047', width: 2.5, head: 8 });
      D.label(x + 44, y - 42 - (1 - a) * 8, ORG[k].name, { bg: '#fde047', color: '#3b2f00', size: 14 });
      ctx.globalAlpha = 1;
    });
    ctx.restore();
    D.roundRect(MV.x, MV.y, MV.w, MV.h, 16); ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 2; ctx.stroke();
    // 현미경 이름과 분해능
    const em = res < 150;
    D.label(MV.x + 12, MV.y + 22, em ? '전자 현미경(TEM) 사진' : '광학 현미경 사진', { bg: 'rgba(0,0,0,.6)', color: '#fff', size: 13, align: 'left' });
    D.label(MV.x + MV.w - 12, MV.y + 22, '분해능 ' + fmtRes(res), { bg: 'rgba(0,0,0,.6)', color: '#fde68a', size: 13, align: 'right' });
    // 축척 막대: 600 nm
    const sbw = 600 / NMPX, bx = MV.x + 14, by = MV.y + MV.h - 22;
    D.roundRect(bx - 6, by - 20, sbw + 12, 34, 8); ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fill();
    ctx.fillStyle = '#111'; ctx.fillRect(bx, by + 4, sbw, 4); ctx.fillRect(bx, by, 2, 12); ctx.fillRect(bx + sbw - 2, by, 2, 12);
    T(bx + sbw / 2, by - 4, '600 nm (0.6 μm)', 13, '#111', 'center', 800);
    if (res > 40 && S.mi.pick) T(MV.x + MV.w / 2, MV.y + MV.h / 2, '흐려서 구별하기 어려워요', 17, '#fff', 'center', 800, { stroke: 'rgba(0,0,0,.6)', strokeWidth: 5 });
    // 분해능 눈금
    const tr = MTR;
    panel(tr.x, tr.y, tr.w, tr.h, 16, '#ffffff');
    const ax0 = tr.x + 44, ax1 = tr.x + tr.w - 40, ay = tr.y + tr.h - 36;
    const xr = (r) => ax0 + (ax1 - ax0) * Math.log10(400 / r) / Math.log10(400 / 0.2);
    ctx.fillStyle = '#eef2f7'; D.roundRect(ax0, ay - 4, xr(200) - ax0, 8, 4); ctx.fill();
    const g = ctx.createLinearGradient(xr(200), 0, ax1, 0); g.addColorStop(0, '#fcd34d'); g.addColorStop(1, '#22c55e'); ctx.fillStyle = g; D.roundRect(xr(200), ay - 4, ax1 - xr(200), 8, 4); ctx.fill();
    [[200, '광학 한계 200 nm'], [100, '100'], [10, '10'], [1, '1'], [0.2, '전자 한계 0.2 nm']].forEach(([r, lb]) => {
      const x = xr(r); ctx.fillStyle = '#64748b'; ctx.fillRect(x - 1, ay - 8, 2, 16);
      const al = r === 200 ? 'left' : r === 0.2 ? 'right' : 'center';
      T(r === 200 ? x - 4 : r === 0.2 ? x + 2 : x, ay + 26, lb, 13, '#475569', al === 'left' ? 'right' : al === 'right' ? 'right' : 'center', 700);
    });
    const pins = PHONE ? [[300, '리소좀 300', 0], [60, '핵공 60', 1], [40, '크리스타·골지층 40', 2], [25, '리보솜 25', 3], [20, '핵막 두 겹 20', 0]] : [[300, '리소좀 300 nm', 0], [60, '핵공 60 nm', 1], [40, '크리스타 · 골지체 층 40 nm', 2], [25, '리보솜 25 nm', 3], [20, '핵막 두 겹 20 nm', 0]];
    T(tr.x + 16, tr.y + 24, PHONE ? '구조 크기(nm) · 분해능이 작아야 보여요' : '더 작은 구조를 구별하려면 분해능 값이 더 작아야 해요', 13.5, '#334155', 'left', 800);
    pins.forEach(([sz, lb, lane]) => {
      const x = xr(sz), on = res <= sz, ty = ay - 16 - lane * (PHONE ? 16 : 18);
      ctx.strokeStyle = on ? '#16a34a' : '#cbd5e1'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, ay - 6); ctx.lineTo(x, ty + 4); ctx.stroke();
      ctx.fillStyle = on ? '#16a34a' : '#94a3b8'; ctx.beginPath(); ctx.arc(x, ay, 4, 0, TAU); ctx.fill();
      const lbw = lb.length * (PHONE ? 6.4 : 7), lx = clamp(x, tr.x + 8 + (on ? 0 : 0), tr.x + tr.w - 8);
      T(x + 4, ty, (on ? '✓ ' : '') + lb, 13, on ? '#15803d' : '#64748b', 'left', 800);
    });
    // 지금 값 표시(삼각형)
    const mx = xr(clamp(res, 0.2, 400));
    ctx.fillStyle = '#e2464b'; ctx.beginPath(); ctx.moveTo(mx, ay + 6); ctx.lineTo(mx - 7, ay + 17); ctx.lineTo(mx + 7, ay + 17); ctx.closePath(); ctx.fill();
    // 설명 패널
    const ip = MINFO;
    panel(ip.x, ip.y, ip.w, ip.h, 16, '#ffffff');
    const lines = em
      ? ['전자 현미경 (TEM)', '전자선을 써서 분해능이 약 0.2 nm 예요. 배율은 수만~수십만 배.', '시료를 얇게 잘라 진공에서 봐요. 살아 있는 세포는 볼 수 없어요.', '막, 크리스타, 리보솜 같은 내부 구조가 보여요.']
      : ['광학 현미경', '가시광선을 써서 분해능이 약 0.2 μm(200 nm) 예요. 배율은 최대 약 1000~1500배.', '시료를 염색해서 살아 있는 세포도 볼 수 있어요.', '핵과 미토콘드리아의 모양 정도까지 보여요.'];
    if (PHONE) {
      T(ip.x + 12, ip.y + 22, '🏷 이름표 (고른 뒤 사진을 눌러요) · ' + foundCount() + ' / 5', 13.5, '#334155', 'left', 800);
      PCHIPS.forEach((c) => {
        const sel = S.mi.pick === c.k, ok = !!S.mi.found[c.k];
        D.roundRect(c.x, c.y, c.w, c.h, 12); ctx.fillStyle = sel ? '#fff8dc' : ok ? '#dcfce7' : '#fff'; ctx.fill(); ctx.strokeStyle = sel ? '#f59e0b' : ok ? '#16a34a' : '#cbd5e1'; ctx.lineWidth = sel ? 3 : 2; ctx.stroke();
        TF(c.x + c.w / 2, c.y + c.h / 2 + 5, (ok ? '✓ ' : '') + ORG[c.k].name, c.w - 10, 14, 12, '#26324a', 'center', 800);
      });
    } else {
      T(ip.x + 14, ip.y + 28, lines[0], 16, '#334155', 'left', 800);
      let yy = ip.y + 54; for (let i = 1; i < 4; i++) { const hh = textBlock(ip.x + 14, yy, ip.w - 28, lines[i], 13.5, i === 3 ? '#15803d' : '#475569', 19, 700); yy += hh + 8; }
      yy += 6; T(ip.x + 14, yy, '이름표 붙이기', 14, '#334155', 'left', 800);
      OKEYS.slice(0, 0);
      ['nuc', 'mit', 'gol', 'rer', 'lys'].forEach((k, i) => { const ok = !!S.mi.found[k]; T(ip.x + 18, yy + 24 + i * 22, (ok ? '✅ ' : '⬜ ') + ORG[k].name, 13.5, ok ? '#15803d' : '#64748b', 'left', 800); });
    }
  }
  const PCHIPS = ['nuc', 'mit', 'gol', 'rer', 'lys'].map((k, i) => ({ k, x: MINFO.x + 10 + (i % 3) * 150, y: MINFO.y + 34 + Math.floor(i / 3) * 46, w: 142, h: 40 }));
  const microPT = {
    down(p) {
      if (PHONE) { const c = PCHIPS.find((q) => inRect(p.x, p.y, q)); if (c) { Sound.click(); S.mi.pick = S.mi.pick === c.k ? null : c.k; hideHint(); updateCtl(); return true; } }
      if (!inRect(p.x, p.y, MV)) return false;
      const m = S.mi, res = resOf(m.s);
      const q = microPos(p);
      if (res > 40) { showHint('아직 흐려서 소기관을 구별하기 어려워요. 분해능 값을 더 작게 해 보세요.', 3800); return true; }
      if (!m.pick) { showHint('먼저 오른쪽(아래) 이름표를 하나 골라요.', 3200); return true; }
      const hit = microHit(q.x, q.y), want = m.pick;
      if (hit === want) {
        if (!m.found[want]) { m.found[want] = { t: clock }; Sound.success(); const cc = ORGC[want](); parts.burst(MV.x + cc[0], MV.y + cc[1], { count: 14, colors: ['#fde047', '#22c55e', '#38bdf8'], size: 3.5 }); m.msg = ''; hideHint(); }
        m.pick = null; updateCtl();
      } else {
        Sound.fail(); S.mi.wiggle = 1;
        const tip = { nuc: '핵: 이중막으로 싸인 큰 공 모양이고 막에 구멍(핵공)이 있어요.', mit: '미토콘드리아: 이중막 타원 모양이고 안쪽에 주름(크리스타)이 있어요.', gol: '골지체: 납작한 주머니가 층층이 쌓여 있어요.', rer: '거친 소포체: 납작한 막에 점(리보솜)이 박혀 있어요.', lys: '리소좀: 작은 동그란 주머니이고 안에 진한 알갱이가 있어요.' }[want];
        showHint('그곳이 아니에요. ' + tip, 5200);
      }
      return true;
    },
    hover(p) { return inRect(p.x, p.y, MV) && S.mi.pick ? 'crosshair' : (PHONE && PCHIPS.some((q) => inRect(p.x, p.y, q)) ? 'pointer' : 'default'); },
  };
  const foundCount = () => Object.keys(S.mi.found).length;
  function microReset() { S.mi.found = {}; S.mi.pick = null; S.mi.seenLM = false; S.mi.seenEM = false; S.mi.ts = 0; S.mi.s = 0; S.mi.key = ''; S.mi.skey = ''; updateCtl(); }

  /* ----- 광학 / 전자 현미경 분류 ----- */
  const LMCARDS = [
    { id: 'c1', label: '핵의 위치와 크기', ans: 'lm' },
    { id: 'c2', label: '미토콘드리아의 전체 모양', ans: 'lm' },
    { id: 'c3', label: '살아 있는 세포의 관찰', ans: 'lm' },
    { id: 'c4', label: '크리스타(미토콘드리아 안쪽 주름)', ans: 'em' },
    { id: 'c5', label: '리보솜 알갱이', ans: 'em' },
    { id: 'c6', label: '시료를 얇게 잘라 진공에서 관찰', ans: 'em' },
  ];
  const LB = PHONE ? { x: 10, y: 10, w: 460, h: 240 } : { x: 14, y: 14, w: 772, h: 270 };
  const sortLM = new Sorter({
    cards: LMCARDS.map((c) => ({ id: c.id, label: c.label, col: '#64748b' })),
    boxes: [['lm', '🔬 광학 현미경으로 볼 수 있는 것', '#d97706'], ['em', '🔭 전자 현미경이 필요한 것', '#2563eb']].map((b, i) => { const gap = 10, bw = (LB.w - gap) / 2; return { id: b[0], label: b[1], col: b[2], x: LB.x + i * (bw + gap), y: LB.y, w: bw, h: LB.h, cols: 1, hdr: 36 }; }),
    cw: PHONE ? 214 : 240, ch: PHONE ? 50 : 56, kh: PHONE ? 44 : 48,
    tray: (i) => (PHONE ? { x: 14 + (i % 2) * 236, y: 272 + Math.floor(i / 2) * 62 } : { x: 28 + (i % 3) * 252, y: 346 + Math.floor(i / 3) * 70 }),
    onChange() { updateCtl(); },
  });
  const sortLMWrong = () => sortLM.cards.filter((c) => c.zone && c.zone !== LMCARDS.find((q) => q.id === c.id).ans);
  function sortLMDraw(dt, t) {
    sortLM.update(dt); sortLM.drawBoxes();
    const y0 = PHONE ? 262 : 296, hh = PHONE ? 368 : 250, xx = PHONE ? 10 : 14, ww = PHONE ? 460 : 772;
    panel(xx, y0, ww, hh, 16, '#ffffff');
    T(xx + 16, y0 + 26, '현미경으로 관찰한 것을 떠올리며 카드 6장을 분류해요', L(16, 14), '#334155', 'left', 800);
    sortLM.drawCards();
  }
  const sortLMPT = { down: (p) => sortLM.down(p), move: (p) => sortLM.move(p), up: (p) => sortLM.up(p), hover: (p) => sortLM.hover(p) };


  /* =========================================================
     ② 동물 세포와 식물 세포 단면 (눌러서 구조와 기능 보기)
     ========================================================= */
  const CELL = PHONE ? { x: 10, y: 10, w: 460, h: 370 } : { x: 14, y: 14, w: 520, h: 532 };
  const CINFO = PHONE ? { x: 10, y: 390, w: 460, h: 240 } : { x: 546, y: 14, w: 240, h: 532 };
  const Q = Math.min(CELL.w, CELL.h * 0.98);
  S.cell = { kind: 'animal', sel: null, seen: {}, hov: null, objs: {}, pulse: 0 };
  const cu = (u) => CELL.x + u * CELL.w, cv = (v) => CELL.y + v * CELL.h;
  /* 장면 만들기: 각 개체는 {id, draw(), hit(x,y), c:[x,y], hr} */
  function buildCell(kind) {
    const list = [];
    const add = (id, c, hr, draw, hit) => list.push({ id, c, hr, draw, hit });
    const circ = (cx, cy, r) => (x, y) => Math.hypot(x - cx, y - cy) < r;
    if (kind === 'animal') {
      const nx = cu(0.38), ny = cv(0.46), nr = 0.15 * Q;
      add('nuc', [nx, ny], nr + 6, () => OD.nucleus(ctx, nx, ny, nr, { pores: 8, lw: 3 }), circ(nx, ny, nr + 4));
      const rg = 0.034 * Q, rad = nr + 0.03 * Q, a0 = -0.45, a1 = 2.0;
      add('rer', [nx + Math.cos(0.6) * (rad + rg), ny + Math.sin(0.6) * (rad + rg)], rg * 3 + 14, () => OD.rer(ctx, nx, ny, rad, a0, a1, 3, rg, { th: rg * 0.62, lw: 1.8, rr: Math.max(2, 0.008 * Q) }), (x, y) => { const d = Math.hypot(x - nx, y - ny), a = Math.atan2(y - ny, x - nx); return d > rad - rg * 0.5 && d < rad + rg * 2.6 && a > a0 && a < a1; });
      const sx = cu(0.74), sy = cv(0.74), ss = 0.17 * Q;
      add('ser', [sx, sy], ss, () => OD.ser(ctx, sx, sy, ss, { th: 0.026 * Q }), (x, y) => Math.abs(x - sx) < ss && Math.abs(y - sy) < ss * 0.8);
      const gx = cu(0.76), gy = cv(0.25), gw = 0.21 * Q, gg = 0.026 * Q;
      add('gol', [gx, gy], gw * 0.62, () => OD.golgi(ctx, gx, gy, gw, 5, gg, -0.3, { th: gg * 0.62, ves: 5 }), (x, y) => { const c = Math.cos(0.3), s = Math.sin(0.3), dx = x - gx, dy = y - gy, u = dx * c - dy * s, v = dx * s + dy * c; return Math.abs(u) < gw * 0.6 && Math.abs(v) < gg * 3.4; });
      [[0.88, 0.52], [0.58, 0.88]].forEach(([u, v], i) => { const lx = cu(u), ly = cv(v), lr = 0.032 * Q; add(i ? 'lys' : 'lys', [lx, ly], lr + 8, () => OD.lyso(ctx, lx, ly, lr), circ(lx, ly, lr + 5)); });
      [[0.19, 0.76, 0.5], [0.52, 0.16, -0.25], [0.84, 0.78, -0.6]].forEach(([u, v, rot]) => { const mx = cu(u), my = cv(v), ml = 0.17 * Q, mw = 0.078 * Q, c = Math.cos(-rot), s = Math.sin(-rot); add('mit', [mx, my], ml * 0.55, () => OD.mito(ctx, mx, my, ml, mw, rot, { cs: mw * 0.28 }), (x, y) => { const dx = x - mx, dy = y - my, a = dx * c - dy * s, b = dx * s + dy * c; return Math.hypot(Math.max(0, Math.abs(a) - (ml - mw) / 2), b) < mw / 2 + 4; }); });
      [[0.24, 0.30], [0.62, 0.62], [0.16, 0.56]].forEach(([u, v]) => { const rx = cu(u), ry = cv(v); add('rib', [rx, ry], 20, () => { for (let k = 0; k < 3; k++) OD.ribo2(ctx, rx + (k - 1) * 11, ry + (k % 2) * 7, 5.2, 1, 0.62); }, circ(rx, ry + 3, 20)); });
    } else {
      const wx = cu(0.02), wy = cv(0.02), ww = CELL.w * 0.96, wh = CELL.h * 0.96, wt = 0.032 * Q;
      add('wal', [wx + ww * 0.5, wy + 0.01 * wh], 30, () => { }, (x, y) => (x > wx && x < wx + ww && y > wy && y < wy + wh) && !(x > wx + wt && x < wx + ww - wt && y > wy + wt && y < wy + wh - wt));
      const vx = cu(0.31), vy = cv(0.25), vw = CELL.w * 0.58, vh = CELL.h * 0.56;
      add('vac', [vx + vw * 0.5, vy + vh * 0.5], Math.min(vw, vh) * 0.4, () => OD.vacuole(ctx, vx, vy, vw, vh, 0.07 * Q), (x, y) => x > vx && x < vx + vw && y > vy && y < vy + vh);
      const nx = cu(0.17), ny = cv(0.30), nr = 0.1 * Q;
      add('nuc', [nx, ny], nr + 6, () => OD.nucleus(ctx, nx, ny, nr, { pores: 8, lw: 2.6 }), circ(nx, ny, nr + 4));
      const rg = 0.03 * Q, rad = nr + 0.026 * Q, a0 = 0.5, a1 = 2.7;
      add('rer', [nx + Math.cos(1.6) * (rad + rg), ny + Math.sin(1.6) * (rad + rg)], rg * 3 + 10, () => OD.rer(ctx, nx, ny, rad, a0, a1, 2, rg, { th: rg * 0.62, lw: 1.7, rr: Math.max(2, 0.008 * Q) }), (x, y) => { const d = Math.hypot(x - nx, y - ny), a = Math.atan2(y - ny, x - nx); return d > rad - rg * 0.5 && d < rad + rg * 1.7 && a > a0 && a < a1; });
      const sx = cu(0.15), sy = cv(0.66), ss = 0.11 * Q;
      add('ser', [sx, sy], ss, () => OD.ser(ctx, sx, sy, ss, { th: 0.022 * Q }), (x, y) => Math.abs(x - sx) < ss && Math.abs(y - sy) < ss * 0.8);
      const gx = cu(0.17), gy = cv(0.86), gw = 0.17 * Q, gg = 0.024 * Q;
      add('gol', [gx, gy], gw * 0.62, () => OD.golgi(ctx, gx, gy, gw, 4, gg, 0.05, { th: gg * 0.62, ves: 4 }), (x, y) => Math.abs(x - gx) < gw * 0.6 && Math.abs(y - gy) < gg * 3);
      [[0.46, 0.13, 0.0], [0.70, 0.13, 0.05], [0.50, 0.89, 0.0], [0.76, 0.88, -0.05]].forEach(([u, v, rot]) => { const hx = cu(u), hy = cv(v), rx = 0.075 * Q, ry = 0.045 * Q; add('chl', [hx, hy], rx + 6, () => OD.chloro(ctx, hx, hy, rx, ry, rot), (x, y) => ((x - hx) / (rx + 3)) ** 2 + ((y - hy) / (ry + 3)) ** 2 < 1); });
      [[0.14, 0.50, 1.3], [0.32, 0.90, 0.0]].forEach(([u, v, rot]) => { const mx = cu(u), my = cv(v), ml = 0.13 * Q, mw = 0.065 * Q, c = Math.cos(-rot), s = Math.sin(-rot); add('mit', [mx, my], ml * 0.55, () => OD.mito(ctx, mx, my, ml, mw, rot, { cs: mw * 0.28 }), (x, y) => { const dx = x - mx, dy = y - my, a = dx * c - dy * s, b = dx * s + dy * c; return Math.hypot(Math.max(0, Math.abs(a) - (ml - mw) / 2), b) < mw / 2 + 4; }); });
      [[0.26, 0.55], [0.915, 0.5]].forEach(([u, v]) => { const rx = cu(u), ry = cv(v); add('rib', [rx, ry], 20, () => { for (let k = 0; k < 3; k++) OD.ribo2(ctx, rx + (k - 1) * 11, ry + (k % 2) * 7, 5.2, 1, 0.62); }, circ(rx, ry + 3, 20)); });
    }
    return list;
  }
  function cellSet(kind) { S.cell.kind = kind; S.cell.objs = { animal: S.cell.objs.animal || buildCell('animal'), plant: S.cell.objs.plant || buildCell('plant') }; S.cell.sel = null; S.fade = 1; updateCtl(); }
  S.cell.objs = { animal: buildCell('animal'), plant: buildCell('plant') };
  function drawMembIcon(x, y, n, col) {   // 막 개수 그림 : 이중막 ◎ / 단일막 ○ / 없음
    ctx.save(); ctx.translate(x, y); ctx.lineWidth = 3; ctx.strokeStyle = col;
    if (n === 2) { ctx.beginPath(); ctx.arc(0, 0, 14, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, 8, 0, TAU); ctx.stroke(); }
    else if (n === 1) { ctx.beginPath(); ctx.arc(0, 0, 12, 0, TAU); ctx.stroke(); }
    else { ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.arc(0, 0, 12, 0, TAU); ctx.stroke(); ctx.setLineDash([]); }
    ctx.restore();
  }
  function cellDraw(dt, t) {
    const c = S.cell, objs = c.objs[c.kind];
    // 세포 바탕
    if (c.kind === 'animal') {
      ctx.save(); ctx.beginPath();
      const cx = CELL.x + CELL.w / 2, cy = CELL.y + CELL.h / 2, rx = CELL.w * 0.485, ry = CELL.h * 0.475;
      for (let i = 0; i <= 90; i++) { const a = i / 90 * TAU, w = 1 + Math.sin(a * 3 + 0.5) * 0.018 + Math.sin(a * 5) * 0.01; const x = cx + Math.cos(a) * rx * w, y = cy + Math.sin(a) * ry * w; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
      ctx.closePath();
      D.shadow(() => { ctx.fillStyle = '#fff4de'; ctx.fill(); }, { blur: 10, y: 3 });
      ctx.lineWidth = 5; ctx.strokeStyle = '#e8a838'; ctx.stroke(); ctx.restore();
      ctx.save(); ctx.beginPath(); ctx.ellipse(cx, cy, rx * 0.96, ry * 0.96, 0, 0, TAU); ctx.clip(); ctx.restore();
    } else {
      const wx = cu(0.02), wy = cv(0.02), ww = CELL.w * 0.96, wh = CELL.h * 0.96, wt = 0.032 * Q;
      D.shadow(() => { D.roundRect(wx, wy, ww, wh, 18); ctx.fillStyle = OD.PAL.wall; ctx.fill(); }, { blur: 10, y: 3 });
      ctx.strokeStyle = OD.PAL.wallL; ctx.lineWidth = 2.5; D.roundRect(wx, wy, ww, wh, 18); ctx.stroke();
      D.roundRect(wx + wt, wy + wt, ww - wt * 2, wh - wt * 2, 12); ctx.fillStyle = '#fff4de'; ctx.fill(); ctx.strokeStyle = '#e8a838'; ctx.lineWidth = 3.5; ctx.stroke();
      ctx.strokeStyle = 'rgba(120,90,30,.35)'; ctx.lineWidth = 1.3;
      for (let k = 1; k < 4; k++) { ctx.beginPath(); ctx.moveTo(wx + 8, wy + wt * k / 4); ctx.lineTo(wx + ww - 8, wy + wt * k / 4); ctx.stroke(); }
    }
    // 소기관 (식물 : 액포 먼저)
    const order = c.kind === 'plant' ? ['wal', 'vac', 'nuc', 'rer', 'ser', 'gol', 'chl', 'mit', 'rib'] : ['nuc', 'rer', 'ser', 'gol', 'lys', 'mit', 'rib'];
    order.forEach((id) => objs.filter((o) => o.id === id).forEach((o) => {
      const hov = c.hov === o, sel = c.sel === o.id;
      ctx.save();
      if (hov && !sel) { ctx.shadowColor = 'rgba(250,204,21,.9)'; ctx.shadowBlur = 14; }
      if (sel) { ctx.shadowColor = 'rgba(250,204,21,1)'; ctx.shadowBlur = 20; }
      o.draw();
      ctx.restore();
    }));
    if (c.sel) {   // 선택 표시
      objs.filter((o) => o.id === c.sel).forEach((o, i) => {
        const pr = 1 + Math.sin(t * 5 + i) * 0.08;
        if (c.sel === 'wal') return;
        ctx.save(); ctx.strokeStyle = '#facc15'; ctx.lineWidth = 3; ctx.setLineDash([6, 5]); ctx.lineDashOffset = -t * 20;
        ctx.beginPath(); ctx.arc(o.c[0], o.c[1], o.hr * pr, 0, TAU); ctx.stroke(); ctx.restore();
      });
    }
    // 세포 이름표
    D.label(CELL.x + 12, CELL.y + 22, c.kind === 'animal' ? '🐾 동물 세포 (단면)' : '🌱 식물 세포 (단면)', { bg: 'rgba(255,255,255,.9)', color: '#334155', size: 14, align: 'left', border: '#e2e8f0' });
    // 설명 패널
    const ip = CINFO;
    panel(ip.x, ip.y, ip.w, ip.h, 16, '#ffffff');
    const o = c.sel ? ORG[c.sel] : null;
    if (!o) {
      T(ip.x + 16, ip.y + 30, '소기관을 눌러 보세요', 16, '#334155', 'left', 800);
      textBlock(ip.x + 16, ip.y + 56, ip.w - 32, '구조와 기능이 여기에 나타나요. 동물 세포와 식물 세포를 모두 살펴보면 소기관 10종을 만날 수 있어요.', 13.5, '#64748b', 19, 700);
      const n = Object.keys(c.seen).length; T(ip.x + 16, ip.y + ip.h - 20, '살펴본 소기관 ' + n + ' / 10종', 14, n === 10 ? '#15803d' : '#475569', 'left', 800);
    } else {
      const sx = ip.x + 16;
      drawMembIcon(sx + 16, ip.y + 36, o.mem, o.col);
      T(sx + 42, ip.y + 33, o.name, 18, o.col, 'left', 800);
      T(sx + 42, ip.y + 51, o.mem === 2 ? '이중막' : o.mem === 1 ? '단일막' : '막 없음', 13.5, '#475569', 'left', 800);
      let yy = ip.y + 78;
      T(sx, yy, '구조', 13.5, '#334155', 'left', 800); yy += 3 + textBlock(sx, yy + 17, ip.w - 32, o.st, 13.5, '#475569', 18.5, 700) + 18;
      T(sx, yy, '기능', 13.5, '#334155', 'left', 800); yy += 3 + textBlock(sx, yy + 17, ip.w - 32, o.fn, 13.5, '#475569', 18.5, 700) + 18;
      T(sx, Math.min(yy + 2, ip.y + ip.h - 40), '있는 곳: ' + o.where, 13, '#b45309', 'left', 800);
      const n = Object.keys(c.seen).length; T(sx, ip.y + ip.h - 14, '살펴본 소기관 ' + n + ' / 10종', 13.5, n === 10 ? '#15803d' : '#64748b', 'left', 800);
    }
  }
  const cellPT = {
    down(p) {
      if (!inRect(p.x, p.y, CELL)) return false;
      const c = S.cell, objs = c.objs[c.kind];
      const pri = c.kind === 'plant' ? ['rib', 'chl', 'mit', 'gol', 'ser', 'rer', 'nuc', 'vac', 'wal'] : ['rib', 'lys', 'mit', 'gol', 'ser', 'rer', 'nuc'];
      for (const id of pri) for (const o of objs) if (o.id === id && o.hit(p.x, p.y)) {
        c.sel = id; c.seen[id] = true; Sound.click(); parts.burst(p.x, p.y, { count: 8, colors: ['#fde047', '#fff'], size: 3, speed: 90, gravity: 80 }); updateCtl(); return true;
      }
      c.sel = null; updateCtl(); return true;
    },
    hover(p) {
      const c = S.cell, objs = c.objs[c.kind]; c.hov = null;
      if (!inRect(p.x, p.y, CELL)) return 'default';
      const pri = c.kind === 'plant' ? ['rib', 'chl', 'mit', 'gol', 'ser', 'rer', 'nuc'] : ['rib', 'lys', 'mit', 'gol', 'ser', 'rer', 'nuc'];
      for (const id of pri) for (const o of objs) if (o.id === id && o.hit(p.x, p.y)) { c.hov = o; return 'pointer'; }
      return 'default';
    },
  };

  /* ----- 소기관 - 기능 이음 ----- */
  const MT = {
    left: OKEYS.slice(),
    right: ['mit', 'gol', 'wal', 'nuc', 'vac', 'rib', 'lys', 'ser', 'chl', 'rer'],
    link: {},   // 왼쪽 id -> 오른쪽 id
    sel: null, bad: {}, prog: {},
  };
  const MTL = PHONE ? { x: 10, w: 168 } : { x: 28, w: 250 }, MTR_ = PHONE ? { x: 302, w: 168 } : { x: 522, w: 250 };
  const MTY0 = PHONE ? 34 : 40, MTH = PHONE ? 54 : 46, MTG = PHONE ? 4 : 4;
  const mtRow = (i) => MTY0 + i * (MTH + MTG);
  function mtReset() { MT.link = {}; MT.sel = null; MT.bad = {}; MT.prog = {}; updateCtl(); }
  const mtCount = () => Object.keys(MT.link).length;
  function mtWrong() { return MT.left.filter((id) => MT.link[id] && MT.link[id] !== id); }
  function matchDraw(dt, t) {
    T(MTL.x + MTL.w / 2, 24, '소기관', 15, '#334155', 'center', 800); T(MTR_.x + MTR_.w / 2, 24, '하는 일', 15, '#334155', 'center', 800);
    // 선
    MT.left.forEach((id, i) => {
      const r = MT.link[id]; if (!r) return;
      MT.prog[id] = approach(MT.prog[id] == null ? 0 : MT.prog[id], 1, dt, RM ? 60 : 9);
      const j = MT.right.indexOf(r), x1 = MTL.x + MTL.w, y1 = mtRow(i) + MTH / 2, x2 = MTR_.x, y2 = mtRow(j) + MTH / 2, pr = MT.prog[id];
      const bad = MT.bad[id];
      ctx.save(); ctx.strokeStyle = bad ? '#e2464b' : ORG[id].col; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.globalAlpha = 0.9;
      if (bad) ctx.setLineDash([8, 6]);
      ctx.beginPath(); ctx.moveTo(x1, y1);
      const mx = (x1 + x2) / 2; const ex = x1 + (x2 - x1) * pr, ey = y1 + (y2 - y1) * pr;
      if (pr < 0.999) ctx.lineTo(ex, ey); else ctx.bezierCurveTo(mx, y1, mx, y2, x2, y2);
      ctx.stroke(); ctx.restore();
    });
    MT.left.forEach((id, i) => {
      const y = mtRow(i), sel = MT.sel === id, linked = !!MT.link[id], bad = MT.bad[id];
      D.shadow(() => { D.roundRect(MTL.x, y, MTL.w, MTH, 12); ctx.fillStyle = bad ? '#fdeceb' : sel ? '#fff8dc' : '#fff'; ctx.fill(); }, { blur: sel ? 10 : 4, y: 2 });
      ctx.strokeStyle = bad ? '#e2464b' : sel ? '#f59e0b' : ORG[id].col; ctx.lineWidth = sel || bad ? 3 : 2; D.roundRect(MTL.x, y, MTL.w, MTH, 12); ctx.stroke();
      drawMembIcon(MTL.x + 26, y + MTH / 2, ORG[id].mem, ORG[id].col);
      TF(MTL.x + 50, y + MTH / 2 + 5.5, ORG[id].name, MTL.w - 80, 15, 12, '#26324a', 'left', 800);
      if (linked) { ctx.fillStyle = bad ? '#e2464b' : ORG[id].col; ctx.beginPath(); ctx.arc(MTL.x + MTL.w - 12, y + MTH / 2, 5, 0, TAU); ctx.fill(); }
    });
    MT.right.forEach((id, j) => {
      const y = mtRow(j), used = MT.left.some((l) => MT.link[l] === id);
      D.shadow(() => { D.roundRect(MTR_.x, y, MTR_.w, MTH, 12); ctx.fillStyle = used ? '#f1f5f9' : '#fff'; ctx.fill(); }, { blur: 4, y: 2 });
      ctx.strokeStyle = used ? '#94a3b8' : '#cbd5e1'; ctx.lineWidth = 2; D.roundRect(MTR_.x, y, MTR_.w, MTH, 12); ctx.stroke();
      const ls = wrap(ORG[id].mt, MTR_.w - 38, PHONE ? 13 : 14, 800).slice(0, 2);
      ls.forEach((l, k) => T(MTR_.x + 26, y + MTH / 2 + (ls.length === 1 ? 5 : -2 + k * 16), l, PHONE ? 13 : 14, '#26324a', 'left', 800));
      if (used) { const l = MT.left.find((q) => MT.link[q] === id); ctx.fillStyle = MT.bad[l] ? '#e2464b' : ORG[l].col; ctx.beginPath(); ctx.arc(MTR_.x + 12, y + MTH / 2, 5, 0, TAU); ctx.fill(); }
    });
  }
  const matchPT = {
    down(p) {
      for (let i = 0; i < 10; i++) {
        const y = mtRow(i);
        if (inRect(p.x, p.y, { x: MTL.x, y, w: MTL.w, h: MTH })) {
          const id = MT.left[i];
          if (MT.link[id] && MT.sel !== id) { delete MT.link[id]; delete MT.bad[id]; MT.prog[id] = 0; MT.sel = id; }
          else MT.sel = MT.sel === id ? null : id;
          Sound.tick(); updateCtl(); return true;
        }
        if (inRect(p.x, p.y, { x: MTR_.x, y, w: MTR_.w, h: MTH })) {
          const rid = MT.right[i];
          if (!MT.sel) {   // 이미 이어진 선을 눌러 풀기
            const l = MT.left.find((q) => MT.link[q] === rid);
            if (l) { delete MT.link[l]; delete MT.bad[l]; MT.prog[l] = 0; Sound.click(); updateCtl(); }
            return true;
          }
          MT.left.forEach((q) => { if (MT.link[q] === rid) { delete MT.link[q]; delete MT.bad[q]; } });
          MT.link[MT.sel] = rid; MT.prog[MT.sel] = 0; delete MT.bad[MT.sel]; MT.sel = null; Sound.click(); updateCtl(); return true;
        }
      }
      MT.sel = null; return false;
    },
    hover(p) { for (let i = 0; i < 10; i++) { const y = mtRow(i); if (inRect(p.x, p.y, { x: MTL.x, y, w: MTL.w, h: MTH }) || inRect(p.x, p.y, { x: MTR_.x, y, w: MTR_.w, h: MTH })) return 'pointer'; } return 'default'; },
  };

  /* ----- 막의 개수로 분류 ----- */
  const MB = PHONE ? { x: 10, y: 10, w: 460, h: 262 } : { x: 14, y: 14, w: 772, h: 262 };
  const sortMem = new Sorter({
    cards: OKEYS.map((k) => ({ id: k, label: ORG[k].name, short: ORG[k].name, col: ORG[k].col })),
    boxes: [['m2', '이중막', '#7c3aed', 1], ['m1', '단일막', '#2563eb', PHONE ? 1 : 2], ['m0', '막 없음', '#64748b', 1]].map((b, i) => { const gap = 8, bw = [0.3, 0.4, 0.3].map((f) => (MB.w - gap * 2) * f); const bx = MB.x + (i === 0 ? 0 : bw.slice(0, i).reduce((a, c) => a + c, 0) + gap * i); return { id: b[0], label: b[1], col: b[2], x: bx, y: MB.y, w: bw[i], h: MB.h, cols: b[3], hdr: 34 }; }),
    cw: PHONE ? 214 : 144, ch: PHONE ? 42 : 46, kh: PHONE ? 34 : 38,
    tray: (i) => (PHONE ? { x: 12 + (i % 2) * 234, y: 292 + Math.floor(i / 2) * 50 } : { x: 18 + (i % 5) * 152, y: 304 + Math.floor(i / 5) * 56 }),
    onChange() { updateCtl(); },
  });
  const memAns = (id) => 'm' + ORG[id].mem;
  const sortMemWrong = () => sortMem.cards.filter((c) => c.zone && c.zone !== memAns(c.id));
  function sortMemDraw(dt, t) {
    sortMem.update(dt); sortMem.drawBoxes();
    const y0 = PHONE ? 282 : 292, hh = PHONE ? 348 : 254, xx = PHONE ? 10 : 14, ww = PHONE ? 460 : 772;
    panel(xx, y0, ww, hh, 16, '#ffffff');
    if (!PHONE) textBlock(xx + 16, y0 + 150, ww - 32, '💡 핵 · 미토콘드리아 · 엽록체는 막이 두 겹(이중막)이에요. 세포벽은 세포막 바깥을 싸는 층이라서 막이 아니에요.', 14, '#64748b', 20, 700);
    sortMem.drawCards();
  }
  const sortMemPT = { down: (p) => sortMem.down(p), move: (p) => sortMem.move(p), up: (p) => sortMem.up(p), hover: (p) => sortMem.hover(p) };


  /* =========================================================
     ③ 간이 원심분리기 : RCF = 1.118 × 10⁻⁵ × r × rpm²
     ========================================================= */
  const ROT = PHONE ? { x: 10, y: 10, w: 460, h: 200 } : { x: 14, y: 14, w: 320, h: 300 };
  const TUB = PHONE ? { x: 10, y: 220, w: 460, h: 410 } : { x: 346, y: 14, w: 440, h: 532 };
  const CAL = PHONE ? { x: 246, y: 44, w: 218, h: 150 } : { x: 14, y: 326, w: 320, h: 220 };
  const RCX = PHONE ? ROT.x + 112 : ROT.x + ROT.w / 2, RCY = PHONE ? ROT.y + 106 : ROT.y + ROT.h / 2 + 8;
  const PXCM = PHONE ? 5.2 : 9;
const THR = { sand: 500, clay: 3000, pig: 100000 };   // 10분 안에 모두 가라앉는 데 필요한 RCF (g)
  const TL = PHONE ? 240 : 330;                           // 시료 기둥 길이
  const TX = { cx: TUB.x + (PHONE ? 96 : TUB.w / 2 - 60), top: TUB.y + (PHONE ? 62 : 96), w: PHONE ? 56 : 74 };
  const rcfOf = (r, rpm) => Math.round(1.118e-5 * r * rpm * rpm);
  S.rc = { r: 10, rpm: 3000, run: false, prog: 0, ang: 0, w: 0, parts: [], total: { sand: 0, clay: 0, pig: 0 }, settled: { sand: 0, clay: 0, pig: 0 }, layer: { sand: 0, clay: 0 }, last: null, F: { sand: 0, clay: 0, pig: 0 }, disp: 1006, dRcf: 0, ran: 0 };
  const RUNT = RM ? 1.2 : 6;
  function rcMix() {
    const rr = OD.rng(5 + (S.rc.ran || 0) * 3), P = [], w = TX.w - 8;
    const add = (kind, n, rad) => { for (let i = 0; i < n; i++) P.push({ kind, x: -w / 2 + rad + rr() * (w - rad * 2), y0: rr() * (TL - 6) + 3, y: 0, rad, done: false, ph: rr() * TAU }); };
    add('sand', 22, 5.2); add('clay', 40, 3.2); add('pig', 80, 1.5);
    P.forEach((p) => { p.y = p.y0; });
    S.rc.parts = P; S.rc.total = { sand: 22, clay: 40, pig: 80 }; S.rc.settled = { sand: 0, clay: 0, pig: 0 }; S.rc.layer = { sand: 0, clay: 0 }; S.rc.run = false; S.rc.prog = 0;
  }
  rcMix();
  function rcRun() {
    const c = S.rc; if (c.run) return;
    rcMix(); c.ran++;
    const rcf = rcfOf(c.r, c.rpm); c.rcfRun = rcf; c.run = true; c.prog = 0;
    c.F = { sand: rcf / THR.sand, clay: rcf / THR.clay, pig: rcf / THR.pig };
    Sound.click(); updateCtl();
  }
  function rcUpdate(dt) {
    const c = S.rc;
    c.w = approach(c.w, c.run ? c.rpm / 6000 * 14 : 0, dt, c.run ? 2.5 : 1.6); c.ang += c.w * dt;
    c.disp = approach(c.disp, rcfOf(c.r, c.rpm), dt, 8); if (Math.abs(c.disp - rcfOf(c.r, c.rpm)) < 0.5) c.disp = rcfOf(c.r, c.rpm);
    if (c.run) {
      c.prog = Math.min(1, c.prog + dt / RUNT);
      const pileTop = (kind) => TL - c.layer.sand - (kind === 'clay' ? c.layer.clay : 0);
      c.parts.forEach((p) => {
        if (p.done) return;
        const f = Math.min(c.F[p.kind], 4);
        p.y = Math.min(p.y0 + f * TL * c.prog, pileTop(p.kind) - p.rad);
        if (p.y >= pileTop(p.kind) - p.rad - 0.5) { p.done = true; c.settled[p.kind]++; }
      });
      c.layer.sand = approach(c.layer.sand, c.settled.sand / c.total.sand * 36, dt, 10);
      c.layer.clay = approach(c.layer.clay, c.settled.clay / c.total.clay * 44, dt, 10);
      if (c.prog >= 1) {
        c.run = false;
        c.last = { rcf: c.rcfRun, r: c.r, rpm: c.rpm, sand: c.settled.sand === c.total.sand, clay: c.settled.clay === c.total.clay, pig: c.settled.pig === c.total.pig };
        Sound.success(); updateCtl();
      }
    } else {
      c.layer.sand = approach(c.layer.sand, c.settled.sand / c.total.sand * 36, dt, 10);
      c.layer.clay = approach(c.layer.clay, c.settled.clay / c.total.clay * 44, dt, 10);
    }
  }
  function drawTube(cx, top, w, len, col) {
    const x = cx - w / 2;
    ctx.save();
    D.roundRect(x, top, w, len + w / 2, w / 2); // 아래가 둥근 튜브
    ctx.fillStyle = 'rgba(210,235,250,.5)'; ctx.fill(); ctx.restore();
  }
  function rcDraw(dt, t) {
    const c = S.rc; rcUpdate(dt);
    // ---- 회전자(위에서 본 모습) ----
    panel(ROT.x, ROT.y, ROT.w, ROT.h, 16, '#eaf0f7');
    const cx = RCX, cy = RCY, rpx = c.r * PXCM;
    T(ROT.x + 14, ROT.y + 24, '원심분리기 (위에서 본 모습)', 14, '#334155', 'left', 800);
    ctx.save(); ctx.strokeStyle = '#94a3b8'; ctx.setLineDash([4, 5]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(cx, cy, rpx, 0, TAU); ctx.stroke(); ctx.setLineDash([]); ctx.restore();
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(c.ang);
    D.shadow(() => { D.roundRect(-rpx - 22, -9, rpx * 2 + 44, 18, 9); ctx.fillStyle = '#9aa7b8'; ctx.fill(); }, { blur: 6, y: 2 });
    [-1, 1].forEach((s) => {
      const tx = s * (rpx + 2);
      ctx.save(); ctx.translate(tx, 0); ctx.rotate(s > 0 ? 0 : Math.PI);
      D.roundRect(-30, -11, 34, 22, 11); ctx.fillStyle = s > 0 ? 'rgba(180,140,100,.9)' : 'rgba(150,190,210,.9)'; ctx.fill(); ctx.strokeStyle = '#475569'; ctx.lineWidth = 2; ctx.stroke();
      ctx.restore();
    });
    D.sphere(0, 0, 12, '#64748b', { gloss: true });
    ctx.restore();
    // 반지름 표시(고정)
    ctx.strokeStyle = '#e2464b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx, cy + 34 + (PHONE ? 0 : 0)); ctx.lineTo(cx + rpx, cy + 34); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy + 28); ctx.lineTo(cx, cy + 40); ctx.moveTo(cx + rpx, cy + 28); ctx.lineTo(cx + rpx, cy + 40); ctx.stroke();
    D.label(cx + rpx / 2, cy + 52, 'r = ' + c.r + ' cm', { bg: '#fff', color: '#e2464b', size: 13, border: '#fecaca' });
    T(ROT.x + ROT.w - 14, ROT.y + ROT.h - 12, c.run ? '돌아가는 중 · ' + c.rpm + ' rpm' : '멈춤', 13, c.run ? '#15803d' : '#64748b', 'right', 800);
    T(ROT.x + 14, ROT.y + ROT.h - 12, '튜브 2개로 균형', 12.5, '#64748b', 'left', 700);

    // ---- 튜브 (확대) ----
    panel(TUB.x, TUB.y, TUB.w, TUB.h, 16, '#ffffff');
    T(TUB.x + 14, TUB.y + 24, '튜브 속 흙탕물 (확대)', 14, '#334155', 'left', 800);
    const tx = TX.cx, tw = TX.w, ttop = TX.top;
    ctx.save();
    D.roundRect(tx - tw / 2, ttop, tw, TL, tw / 2);
    ctx.fillStyle = '#f2e6d4'; ctx.fill();
    ctx.clip();
    // 침전 층
    const sH = c.layer.sand, cH = c.layer.clay;
    ctx.fillStyle = '#9a6b3f'; ctx.fillRect(tx - tw / 2, ttop + TL - sH, tw, sH + 2);
    ctx.fillStyle = '#d98f57'; ctx.fillRect(tx - tw / 2, ttop + TL - sH - cH, tw, cH);
    // 떠 있는 입자
    c.parts.forEach((p) => {
      if (p.done) return;
      const jx = RM ? 0 : Math.sin(t * 3 + p.ph) * (p.kind === 'pig' ? 1.4 : 0.7);
      ctx.fillStyle = p.kind === 'sand' ? '#8b5a2b' : p.kind === 'clay' ? '#c97a3c' : 'rgba(30,150,130,.8)';
      ctx.beginPath(); ctx.arc(tx + p.x + jx, ttop + p.y, p.rad, 0, TAU); ctx.fill();
      if (p.kind === 'sand') { ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.arc(tx + p.x + jx - 1.4, ttop + p.y - 1.5, p.rad * 0.35, 0, TAU); ctx.fill(); }
    });
    ctx.restore();
    ctx.strokeStyle = '#7aa0bd'; ctx.lineWidth = 3; D.roundRect(tx - tw / 2, ttop, tw, TL, tw / 2); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(tx - tw / 2 + 5, ttop + 8, 4, TL - 20);
    // 원심력 방향
    const ax = tx - tw / 2 - (PHONE ? 22 : 34);
    D.arrow(ax, ttop + 46, ax, ttop + TL * 0.85, { color: '#e2464b', width: 3.5, head: 12 });
    T(ax, ttop + 14, '원심력', 13, '#e2464b', 'center', 800);
    T(ax, ttop + 30, '방향', 13, '#e2464b', 'center', 800);
    T(tx, ttop - 10, '회전축 쪽', 12.5, '#64748b', 'center', 700);
    T(tx, ttop + TL + 20, '튜브 바닥(바깥쪽)', 12.5, '#64748b', 'center', 700);
    // 범례와 결과
    const lx = tx + tw / 2 + (PHONE ? 26 : 30), ly = ttop + 6;
    [['sand', '모래 (큰 입자)', '#8b5a2b', 5.2], ['clay', '점토 (중간 입자)', '#c97a3c', 3.2], ['pig', '색소 (아주 작은 입자)', 'rgba(30,150,130,.9)', 1.7]].forEach(([k, nm, col, rad], i) => {
      const y = ly + i * (PHONE ? 78 : 74);
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(lx + 7, y + 4, rad + 1.5, 0, TAU); ctx.fill();
      T(lx + 22, y + 8, nm, 14, '#334155', 'left', 800);
      const st = c.settled[k], tot = c.total[k], sed = st === tot && tot > 0;
      T(lx + 22, y + 28, c.ran ? (sed ? '✔ 모두 가라앉음' : st > 0 ? (st / tot < 0.3 ? '거의 떠 있음 · ' : '일부 가라앉음 · ') + st + '/' + tot : '가라앉지 않음') : '아직 안 돌렸어요', 13, sed ? '#15803d' : '#64748b', 'left', 700);
      T(lx + 22, y + 46, '필요한 RCF: 약 ' + (k === 'sand' ? '500 g 이상' : k === 'clay' ? '3000 g 이상' : '10만 g 이상'), 13, '#94a3b8', 'left', 700);
    });
    // 진행 시간
    const mins = c.run ? c.prog * 10 : (c.ran ? 10 : 0);
    D.roundRect(TUB.x + TUB.w - 112, TUB.y + 8, 100, 28, 14); ctx.fillStyle = c.run ? '#fef3c7' : '#f1f5f9'; ctx.fill();
    T(TUB.x + TUB.w - 62, TUB.y + 27, '⏱ ' + mins.toFixed(1) + ' / 10 분', 13, '#334155', 'center', 800);
    // ---- RCF 계산기 ----
    const big = Math.round(c.disp);
    if (!PHONE) {
      panel(CAL.x, CAL.y, CAL.w, CAL.h, 16, '#fffdf5');
      T(CAL.x + 14, CAL.y + 26, '🧮 상대 원심력(RCF) 계산기', 15, '#334155', 'left', 800);
      T(CAL.x + 14, CAL.y + 54, 'RCF = 1.118 × 10⁻⁵ × r × rpm²', 15, '#1f2d44', 'left', 800);
      T(CAL.x + 14, CAL.y + 80, '= 1.118 × 10⁻⁵ × ' + c.r + ' × ' + c.rpm + '²', 14, '#475569', 'left', 700);
      T(CAL.x + 14, CAL.y + 128, '≈ ' + fmtNum(big) + ' g', 40, '#c2410c', 'left', 800);
      T(CAL.x + 14, CAL.y + 152, 'g = 중력 가속도의 배수 (질량의 단위 g이 아니에요)', 12.5, '#64748b', 'left', 700);
      T(CAL.x + 14, CAL.y + 178, '회전 수 2배 → RCF ' + (c.rpm * 2 <= 6000 ? '약 ' + fmtNum(rcfOf(c.r, c.rpm * 2)) + ' g' : '4배'), 13, '#2563eb', 'left', 800);
    } else {
      T(CAL.x, ROT.y + 24, '🧮 상대 원심력(RCF)', 14, '#334155', 'left', 800);
      TF(CAL.x, CAL.y + 14, 'RCF = 1.118 × 10⁻⁵ × r × rpm²', CAL.w, 14, 12, '#1f2d44', 'left', 800);
      TF(CAL.x, CAL.y + 38, '= 1.118 × 10⁻⁵ × ' + c.r + ' × ' + c.rpm + '²', CAL.w, 13.5, 12, '#475569', 'left', 700);
      T(CAL.x, CAL.y + 84, '≈ ' + fmtNum(big) + ' g', 34, '#c2410c', 'left', 800);
      T(CAL.x, CAL.y + 108, 'g = 중력 가속도의 배수', 13, '#64748b', 'left', 700);
      T(CAL.x, CAL.y + 132, '회전 수 2배 → RCF ' + (c.rpm * 2 <= 6000 ? '약 ' + fmtNum(rcfOf(c.r, c.rpm * 2)) + ' g' : '4배'), 13, '#2563eb', 'left', 800);
    }
  }
  function fmtNum(n) { return Number(n).toLocaleString('ko-KR'); }
  const rcfIn = () => numOf('inRcf');
  const rcfInOk = () => { const v = rcfIn(); return isFinite(v) && v >= 950 && v <= 1060; };

  /* =========================================================
     ④ 세포 분획 : 낮은 속도 → 높은 속도 순서로 침전시키기
     ========================================================= */
  const FP = { nuc: { thr: 1000, rad: 5.5, n: 6 }, mit: { thr: 10000, rad: 4, n: 14 }, mic: { thr: 100000, rad: 1.8, n: 30 } };
  const SPDMIN = { 1000: 10, 10000: 20, 100000: 60 };
  const FT = PHONE
    ? [0, 1, 2, 3].map((i) => ({ x: 70 + (i % 2) * 230, y: 40 + Math.floor(i / 2) * 214, w: 50, h: 150 }))
    : [0, 1, 2, 3].map((i) => ({ x: 120 + i * 180, y: 96, w: 62, h: 236 }));
  const FPANEL = PHONE ? { x: 10, y: 474, w: 460, h: 156 } : { x: 14, y: 410, w: 772, h: 136 };
  S.fr = { sol: 'sugar', parts: [], homog: false, burst: false, k: 0, runs: [], sel: null, busy: 0, phase: 'idle', t: 0, msg: '', tests: { dna: false, o2: false, er: false }, lbl: ['', '', ''], tv: 0 };
  const frCol = (kind) => (kind === 'nuc' ? '#7c5a9c' : kind === 'mit' ? '#c07a3e' : '#4a8f86');
  function frRand(i, tube) { const r = OD.rng(i * 7 + tube * 131 + 3); const F = FT[tube]; return { x: F.x + 8 + r() * (F.w - 16), y: F.y + 10 + r() * (F.h * 0.75) }; }
  function frHomog() {
    const f = S.fr; if (f.busy) return;
    if (f.sol === 'water') {
      f.parts = []; f.homog = false; f.burst = true; f.k = 0; f.runs = []; f.phase = 'idle';
      const F = FT[0];
      for (let i = 0; i < 18; i++) parts.emit({ x: F.x + F.w / 2 + (Math.random() - 0.5) * F.w, y: F.y + 40 + Math.random() * 120, vx: (Math.random() - 0.5) * 140, vy: (Math.random() - 0.5) * 140, life: 0.9, size: 3 + Math.random() * 3, color: '#f59e0b', gravity: 60, shape: 'bubble' });
      Sound.fail(); f.msg = '증류수에서는 삼투로 물이 들어와 소기관이 터져 버렸어요! 0.25 M 설탕 용액을 써 보세요.'; showHint(f.msg, 5200); updateCtl(); return;
    }
    f.burst = false; f.homog = true; f.k = 0; f.runs = []; f.phase = 'idle'; f.parts = []; f.msg = ''; hideHint();
    let id = 0;
    ['nuc', 'mit', 'mic'].forEach((kind) => { for (let i = 0; i < FP[kind].n; i++) { const p = frRand(id++, 0); f.parts.push({ kind, tube: 0, x: p.x, y: p.y, tx: p.x, ty: p.y, pel: false, pi: -1, ph: Math.random() * TAU, id: id }); } });
    f.parts.forEach((p) => { p.x = FT[0].x + FT[0].w / 2; p.y = FT[0].y - 20; });
    Sound.click(); updateCtl();
  }
  function frSlot(tube, j) { const F = FT[tube]; return { x: F.x + F.w / 2 - 20 + (j % 8) * 5.8, y: F.y + F.h - 8 - Math.floor(j / 8) * 7.5 }; }
  function frSpin() {
    const f = S.fr; if (f.busy || !f.homog || f.k >= 3 || !f.sel) return;
    const g = f.sel, k = f.k;
    const here = f.parts.filter((p) => p.tube === k);
    let j = 0;
    here.forEach((p) => { if (FP[p.kind].thr <= g) { p.pel = true; p.pi = j++; const s = frSlot(k, p.pi); p.tx = s.x; p.ty = s.y; } });
    f.runs.push({ g, min: SPDMIN[g], comp: { nuc: here.filter((p) => p.pel && p.kind === 'nuc').length, mit: here.filter((p) => p.pel && p.kind === 'mit').length, mic: here.filter((p) => p.pel && p.kind === 'mic').length } });
    f.phase = 'spin'; f.t = 0; f.busy = 1; Sound.click(); updateCtl();
  }
  function frInstant() {   // 올바른 순서로 3단계를 한 번에 (나중 단계 미션 준비)
    const f = S.fr; f.sol = 'sugar'; f.burst = false; f.homog = true; f.parts = []; f.runs = []; f.k = 0; f.busy = 0; f.phase = 'idle';
    let id = 0;
    ['nuc', 'mit', 'mic'].forEach((kind) => { for (let i = 0; i < FP[kind].n; i++) { const p = frRand(id++, 0); f.parts.push({ kind, tube: 0, x: p.x, y: p.y, tx: p.x, ty: p.y, pel: false, pi: -1, ph: Math.random() * TAU }); } });
    [1000, 10000, 100000].forEach((g, k) => {
      const here = f.parts.filter((p) => p.tube === k); let j = 0;
      here.forEach((p) => { if (FP[p.kind].thr <= g) { p.pel = true; p.pi = j++; const s = frSlot(k, p.pi); p.x = p.tx = s.x; p.y = p.ty = s.y; } });
      f.runs.push({ g, min: SPDMIN[g], comp: { nuc: here.filter((p) => p.pel && p.kind === 'nuc').length, mit: here.filter((p) => p.pel && p.kind === 'mit').length, mic: here.filter((p) => p.pel && p.kind === 'mic').length } });
      here.forEach((p) => { if (!p.pel) { p.tube = k + 1; const q = frRand(p.ph * 1000 | 0, k + 1); p.x = p.tx = q.x; p.y = p.ty = q.y; } });
      f.k = k + 1;
    });
  }
  function frUpdate(dt) {
    const f = S.fr;
    f.parts.forEach((p) => {
      const rate = p.pel ? 5 : 3.2;
      p.x = approach(p.x, p.tx, dt, rate); p.y = approach(p.y, p.ty, dt, rate);
    });
    if (f.phase === 'spin') {
      f.t += dt;
      if (f.t > (RM ? 0.3 : 2.2)) {
        const k = f.k;
        f.parts.forEach((p) => { if (p.tube === k && !p.pel) { p.tube = k + 1; const q = frRand(Math.floor(p.ph * 1000), k + 1); p.tx = q.x; p.ty = q.y; } });
        f.phase = 'pour'; f.t = 0;
      }
    } else if (f.phase === 'pour') {
      f.t += dt;
      if (f.t > (RM ? 0.3 : 1.3)) { f.k++; f.phase = 'idle'; f.busy = 0; Sound.success(); updateCtl(); }
    } else if (f.phase === 'idle' && f.homog) {
      f.parts.forEach((p) => {   // 떠 있는 입자의 살랑거림
        if (p.pel || RM) return;
        if (Math.hypot(p.x - p.tx, p.y - p.ty) < 2) { const q = frRand(Math.floor(Math.random() * 99999), p.tube); p.tx = q.x; p.ty = q.y; }
      });
    }
  }
  const frComp = (k) => (S.fr.runs[k] ? S.fr.runs[k].comp : null);
  function frPure() {
    const f = S.fr; if (f.k < 3 || f.runs.length < 3) return false;
    const want = ['nuc', 'mit', 'mic'];
    return want.every((kd, i) => { const c = f.runs[i].comp; return c[kd] === FP[kd].n && Object.keys(c).every((q) => q === kd || c[q] === 0); });
  }
  function drawFracTube(F, i, f, t) {
    const x = F.x, y = F.y, w = F.w, h = F.h;
    ctx.save();
    D.roundRect(x, y, w, h, w / 2 > 22 ? 22 : w / 2); ctx.clip();
    const full = f.homog && (i === f.k || (i === f.k + 1 && f.phase === 'pour')), faint = f.homog && i < f.k;
    ctx.fillStyle = full ? 'rgba(228,208,170,.78)' : faint ? 'rgba(228,208,170,.22)' : 'rgba(215,235,250,.5)';
    ctx.fillRect(x, y + 8, w, h);
    f.parts.forEach((p) => {
      if (p.tube !== i) return;
      const wob = p.pel || RM ? 0 : Math.sin(t * 2.2 + p.ph) * 1.1;
      ctx.fillStyle = p.pel ? frCol(p.kind) : '#8b7355'; ctx.globalAlpha = p.pel ? 0.95 : 0.85;
      if (p.kind === 'mit') { ctx.save(); ctx.translate(p.x + wob, p.y); ctx.rotate(p.ph); D.roundRect(-FP.mit.rad * 1.5, -FP.mit.rad * 0.7, FP.mit.rad * 3, FP.mit.rad * 1.4, FP.mit.rad * 0.7); ctx.fill(); ctx.restore(); }
      else { ctx.beginPath(); ctx.arc(p.x + wob, p.y, FP[p.kind].rad, 0, TAU); ctx.fill(); }
      ctx.globalAlpha = 1;
    });
    if (f.phase === 'spin' && f.k === i && !RM) { ctx.strokeStyle = 'rgba(226,70,75,.5)'; ctx.lineWidth = 2; for (let k = 0; k < 3; k++) { const yy = y + 40 + ((t * 120 + k * 60) % (h - 80)); ctx.beginPath(); ctx.moveTo(x + w * 0.3, yy); ctx.lineTo(x + w * 0.3, yy + 16); ctx.stroke(); } }
    ctx.restore();
    ctx.strokeStyle = '#7aa0bd'; ctx.lineWidth = 3; D.roundRect(x, y, w, h, w / 2 > 22 ? 22 : w / 2); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(x + 6, y + 14, 4, h - 40);
  }
  function fracDraw(dt, t) {
    const f = S.fr; frUpdate(dt);
    // 제목
    FT.forEach((F, i) => {
      const act = f.k === i && f.homog && f.k < 3;
      if (act) { ctx.save(); ctx.globalAlpha = 0.5 + 0.3 * Math.sin(t * 4); D.roundRect(F.x - 8, F.y - 8, F.w + 16, F.h + 16, 26); ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 3; ctx.stroke(); ctx.restore(); }
      drawFracTube(F, i, f, t);
      const nm = i === 0 ? '균질액' : i === 3 ? '마지막 상층액' : (i) + '번 상층액';
      T(F.x + F.w / 2, F.y - (PHONE ? 14 : 18), i === 0 ? '균질액' : i === 3 ? '세 번째 상층액' : ['', '첫 번째', '두 번째'][i] + ' 상층액', PHONE ? 12.5 : 13.5, '#334155', 'center', 800);
      const r = f.runs[i];
      if (r) {
        D.label(F.x + F.w / 2, F.y + F.h + 20, '침전물 ' + (i + 1), { bg: frColLabel(i), color: '#fff', size: 12.5 });
        T(F.x + F.w / 2, F.y + F.h + 44, r.g.toLocaleString('ko-KR') + ' g · ' + r.min + '분', 12.5, '#475569', 'center', 800);
      } else if (i < 3 && f.homog) T(F.x + F.w / 2, F.y + F.h + 20, f.k === i ? '▲ 여기서 원심분리' : '', 12.5, '#b45309', 'center', 800);
      if (i < 3) {   // 상층액 옮기기 화살표
        const nx = FT[i + 1];
        if (!PHONE) D.arrow(F.x + F.w + 20, F.y + 50, nx.x - 20, F.y + 50, { color: '#94a3b8', width: 3, head: 10, dash: [5, 5] });
        else if (i % 2 === 0) D.arrow(F.x + F.w + 24, F.y + 50, nx.x - 24, F.y + 50, { color: '#94a3b8', width: 3, head: 10, dash: [5, 5] });
        if (!PHONE) T((F.x + F.w + nx.x) / 2, F.y + 36, '상층액', 12, '#64748b', 'center', 700);
      }
    });
    if (f.burst) T(FT[0].x + FT[0].w / 2, FT[0].y + FT[0].h / 2, '💥', 38, '#000', 'center', 400);
    if (f.k === 3 && !f.busy) T(FT[3].x + FT[3].w / 2, FT[3].y + FT[3].h + 20, '세포질(가용성 효소)', 12.5, '#475569', 'center', 800);
    // 설명 패널
    const pn = FPANEL; panel(pn.x, pn.y, pn.w, pn.h, 16, '#ffffff');
    let msg;
    if (f.burst) msg = '삼투 때문에 물이 소기관 안으로 들어가 터졌어요. 소기관을 터뜨리지 않는 용액을 써야 해요.';
    else if (!f.homog) msg = '① 소기관이 터지지 않는 균질화 용액을 고르고 간 조직을 갈아 균질액을 만들어요.';
    else if (f.k >= 3) msg = frPure() ? '세 번 모두 원심분리했어요. 침전물마다 어떤 소기관이 들어 있을까요? 🔍 침전물 확인 화면에서 검사해 봐요.' : '침전물에 여러 소기관이 섞였어요. ↺ 처음부터 다시 해서 속도 순서를 바꿔 보세요.';
    else msg = '② 지금 ' + (f.k + 1) + '번째 원심분리예요. 속도를 고르고 ▶ 원심분리를 눌러요. 큰 입자만 가라앉고 남은 상층액은 다음 튜브로 옮겨져요.';
    textBlock(pn.x + 16, pn.y + 28, pn.w - 32, msg, L(15, 13.5), '#334155', L(22, 19), 800);
    // 입자 크기 안내
    const gy = pn.y + pn.h - 34;
    [['nuc', '큰 입자'], ['mit', '중간 입자'], ['mic', '아주 작은 입자']].forEach(([k, nm], i) => {
      const gx = pn.x + 24 + i * (PHONE ? 148 : 190);
      ctx.fillStyle = '#8b7355';
      if (k === 'mit') { D.roundRect(gx - 8, gy - 4, 16, 8, 4); ctx.fill(); } else { ctx.beginPath(); ctx.arc(gx, gy, FP[k].rad, 0, TAU); ctx.fill(); }
      T(gx + 16, gy + 5, nm, 13, '#475569', 'left', 800);
    });
  }
  function frColLabel(i) { return ['#7c5a9c', '#c07a3e', '#4a8f86'][i] || '#64748b'; }
  const fracPT = null;

  /* ----- 침전물 확인 (표지 검사) ----- */
  const AS = PHONE ? { x: 10, y: 10, w: 460, h: 340 } : { x: 14, y: 14, w: 772, h: 330 };
  const AVI = PHONE ? { x: 10, y: 360, w: 460, h: 120 } : { x: 14, y: 356, w: 772, h: 190 };
  const TESTS = [['dna', '🧬 DNA 양', '핵의 DNA를 형광 염색으로 측정'], ['o2', '🫁 산소 소비', '숙신산을 넣었을 때 줄어드는 산소'], ['er', '🧫 소포체 표지 효소', '소포체 막에 있는 효소의 활동']];
  function assayVal(test, k) {   // 침전물 k 에서 검사 값 (%)
    const c = frComp(k); if (!c) return 0;
    const base = [[2, 8, 6], [5, 1, 10], [3, 7, 3]][k] || [3, 3, 3];
    const v = test === 'dna' ? 15 * c.nuc + base[0] : test === 'o2' ? 6 * c.mit + base[1] : 2.8 * c.mic + base[2];
    return Math.min(100, Math.round(v));
  }
  S.as = { grow: { dna: 0, o2: 0, er: 0 } };
  function assayDraw(dt, t) {
    const f = S.fr, a = S.as;
    panel(AS.x, AS.y, AS.w, AS.h, 16, '#ffffff');
    T(AS.x + 16, AS.y + 26, '침전물 검사 결과 (가상 값, %)', 15, '#334155', 'left', 800);
    const px0 = AS.x + 56, py0 = AS.y + 54, pw = AS.w - 76, ph = AS.h - 104;
    ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1;
    for (let v = 0; v <= 100; v += 25) { const y = py0 + ph - ph * v / 100; ctx.beginPath(); ctx.moveTo(px0, y); ctx.lineTo(px0 + pw, y); ctx.stroke(); T(px0 - 8, y + 4, String(v), 12.5, '#94a3b8', 'right', 700); }
    const gw = pw / 3;
    TESTS.forEach(([id, nm, sub], gi) => {
      const done = f.tests[id]; a.grow[id] = approach(a.grow[id], done ? 1 : 0, dt, RM ? 60 : 4);
      const gx = px0 + gi * gw;
      for (let k = 0; k < 3; k++) {
        const val = assayVal(id, k), bw = Math.min(40, gw / 5), bx = gx + gw / 2 + (k - 1) * (bw + 8) - bw / 2, hh = ph * val / 100 * a.grow[id];
        if (done || a.grow[id] > 0.02) {
          D.roundRect(bx, py0 + ph - hh, bw, Math.max(0, hh), 4); ctx.fillStyle = frColLabel(k); ctx.fill();
          if (a.grow[id] > 0.95) T(bx + bw / 2, py0 + ph - hh - 5, String(val), 12.5, '#334155', 'center', 800);
        }
        T(bx + bw / 2, py0 + ph + 16, 'P' + (k + 1), 12.5, frColLabel(k), 'center', 800);
      }
      T(gx + gw / 2, py0 + ph + 36, nm, PHONE ? 12.5 : 14, '#334155', 'center', 800);
      if (!done) T(gx + gw / 2, py0 + ph / 2, '검사 전', 14, '#94a3b8', 'center', 800);
    });
    // 침전물 시험관
    panel(AVI.x, AVI.y, AVI.w, AVI.h, 16, '#ffffff');
    T(AVI.x + 16, AVI.y + 26, '내가 붙인 이름표', 14, '#334155', 'left', 800);
    for (let k = 0; k < 3; k++) {
      const bx = AVI.x + 24 + k * (AVI.w - 48) / 3, bw = (AVI.w - 48) / 3 - 14;
      D.roundRect(bx, AVI.y + 40, bw, PHONE ? AVI.h - 52 : 96, 12); ctx.fillStyle = C.rgba(frColLabel(k), 0.12); ctx.fill(); ctx.strokeStyle = frColLabel(k); ctx.lineWidth = 2; ctx.stroke();
      const c = frComp(k), nm = { nuc: '핵', mit: '미토콘드리아', mic: '소포체 조각' }[f.lbl[k]] || '이름 정하는 중';
      T(bx + 14, AVI.y + 64, '침전물 ' + (k + 1), 14, frColLabel(k), 'left', 800);
      T(bx + 14, AVI.y + 88, f.lbl[k] ? nm : '이름 정하는 중', 15, f.lbl[k] ? '#1f2d44' : '#94a3b8', 'left', 800);
      if (!PHONE && c) T(bx + 14, AVI.y + 112, f.runs[k].g.toLocaleString('ko-KR') + ' g · ' + f.runs[k].min + '분 침전', 12.5, '#64748b', 'left', 700);
    }
    if (!PHONE) textBlock(AVI.x + 16, AVI.y + 166, AVI.w - 32, '표지 효소란 특정 소기관에만 많은 효소예요. 검사 값이 큰 곳이 그 소기관이 많이 든 침전물이에요.', 13.5, '#64748b', 19, 700);
  }


  /* =========================================================
     화면 전환 · 조작 연결
     ========================================================= */
  function frDom(k) { const c = frComp(k); if (!c) return ''; return ['nuc', 'mit', 'mic'].reduce((a, b) => (c[b] / FP[b].n > c[a] / FP[a].n ? b : a)); }
  function frReset() {
    const f = S.fr; f.parts = []; f.homog = false; f.burst = false; f.k = 0; f.runs = []; f.busy = 0; f.phase = 'idle'; f.sel = null; f.msg = '';
    f.tests = { dna: false, o2: false, er: false }; f.lbl = ['', '', '']; S.as.grow = { dna: 0, o2: 0, er: 0 };
    ['lbl0', 'lbl1', 'lbl2'].forEach((id) => { const e = $('#' + id); if (e) { e.value = ''; e.className = ''; } });
    hideHint(); updateCtl();
  }
  function asReset() {
    const f = S.fr; f.tests = { dna: false, o2: false, er: false }; f.lbl = ['', '', '']; S.as.grow = { dna: 0, o2: 0, er: 0 };
    ['lbl0', 'lbl1', 'lbl2'].forEach((id) => { const e = $('#' + id); if (e) { e.value = ''; e.className = ''; } });
    updateCtl();
  }
  const asOk = () => { const f = S.fr; return f.k >= 3 && frPure() && f.tests.dna && f.tests.o2 && f.tests.er && [0, 1, 2].every((k) => f.lbl[k] && f.lbl[k] === frDom(k)); };
  function rcReset() { const c = S.rc; c.last = null; c.ran = 0; rcMix(); $('#inRcf').value = ''; updateCtl(); }

  function setMode(m) {
    if (S.mode !== m) S.fade = 1;
    S.mode = m;
    PT = { micro: microPT, sortlm: sortLMPT, cell: cellPT, match: matchPT, membsort: sortMemPT, rcf: null, frac: null, assay: null }[m] || null;
    if (m === 'cell') S.cell.hov = null;
    hideHint(); updateCtl();
  }
  const ctlNodes = $$('#ctrlCard .control');
  function updateCtl() {
    const fr = game ? game.free : false, lvNow = game ? game.level : 0;
    ctlNodes.forEach((n) => { n.hidden = (n.dataset.modes || '').split(' ').indexOf(S.mode) < 0; });
    modeButtons(S.mode, lvNow, fr);
    const m = S.mi, res = resOf(m.ts);
    chipSet($('#scopeSeg'), res >= 150 ? 'lm' : 'em');
    if (+$('#sRes').value !== Math.round(m.ts)) $('#sRes').value = Math.round(m.ts);
    $('#oRes').textContent = fmtRes(res);
    $('#resNote').innerHTML = res >= 150 ? '광학 현미경이에요. 핵과 미토콘드리아의 <b>모양</b> 정도만 보여요.' : res > 40 ? '조금 더 선명해지고 있어요. <b>40 nm 이하</b>면 소기관의 구조가 구별돼요.' : '전자 현미경이에요. <b>막, 크리스타, 리보솜</b>까지 보여요.';
    $$('#nameChips button').forEach((b) => { b.classList.toggle('on', m.pick === b.dataset.v); b.classList.toggle('seen', !!m.found[b.dataset.v]); });
    $('#nameNote').innerHTML = m.pick ? '사진에서 <b>' + ORG[m.pick].name + '</b>' + josa(ORG[m.pick].name, '을', '를') + ' 눌러요.' : '이름표를 고른 뒤 사진 속 구조를 눌러요. 찾은 소기관 <b>' + foundCount() + ' / 5</b>';
    chipSet($('#cellSeg'), S.cell.kind);
    $('#cellNote').innerHTML = '소기관을 눌러 구조와 기능을 확인해요. 살펴본 소기관 <b>' + Object.keys(S.cell.seen).length + ' / 10종</b>';
    $('#oR').textContent = S.rc.r + ' cm'; $('#oRpm').textContent = S.rc.rpm + ' rpm';
    $('#rcfRun').disabled = S.rc.run; $('#rcfRun').textContent = S.rc.run ? '🌀 돌아가는 중…' : '▶ 10분 돌리기';
    $('#inRcf').classList.toggle('ok', rcfInOk());
    const f = S.fr;
    chipSet($('#solSeg'), f.sol); $$('#spdSeg button').forEach((b) => { b.classList.toggle('on', +b.dataset.v === f.sel); b.disabled = !f.homog || f.k >= 3 || !!f.busy; });
    $('#fHomog').disabled = !!f.busy; $('#solSeg').querySelectorAll('button').forEach((b) => { b.disabled = !!f.busy || f.homog; });
    $('#fSpin').disabled = !f.homog || f.k >= 3 || !f.sel || !!f.busy;
    $('#spdHead').textContent = f.k < 3 ? '🌀 ' + (f.k + 1) + '번째 원심분리 속도' : '🌀 원심분리 끝';
    $('#fNote').innerHTML = f.burst ? '증류수에서는 소기관이 터져요. <b>0.25 M 설탕 용액</b>을 골라 다시 갈아 보세요.' : !f.homog ? '용액을 고른 뒤 <b>간 조직 갈기</b>를 눌러요. (차갑게 한 용액에서 갈아요)' : f.k < 3 ? '속도를 고르고 <b>▶ 원심분리</b>! 상층액은 다음 튜브로 옮겨져요.' : '3단계 끝! 침전물을 확인하러 가요.';
    $$('#testSeg button').forEach((b) => b.classList.toggle('on', !!f.tests[b.dataset.v]));
    $('#aNote').innerHTML = f.k < 3 ? '먼저 🧪 세포 분획에서 3단계 원심분리를 끝내야 해요.' : '검사 3가지를 모두 해 보고, 침전물마다 이름을 붙여요. (검사 ' + Object.values(f.tests).filter(Boolean).length + ' / 3)';
    [0, 1, 2].forEach((k) => { const e = $('#lbl' + k); if (e) { e.disabled = f.k < 3; e.classList.toggle('ok', !!f.lbl[k] && f.lbl[k] === frDom(k) && f.tests.dna && f.tests.o2 && f.tests.er); } });
  }
  bindModeSeg(setMode);
  $$('#scopeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.mi.ts = b.dataset.v === 'lm' ? 0 : 100; updateCtl(); }));
  $('#sRes').addEventListener('input', (e) => { S.mi.ts = +e.target.value; updateCtl(); });
  $$('#nameChips button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.mi.pick = S.mi.pick === b.dataset.v ? null : b.dataset.v; hideHint(); updateCtl(); }));
  $('#lmReset').addEventListener('click', () => { Sound.click(); sortLM.reset(); });
  $$('#cellSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); cellSet(b.dataset.v); }));
  $('#mtReset').addEventListener('click', () => { Sound.click(); mtReset(); });
  $('#msReset').addEventListener('click', () => { Sound.click(); sortMem.reset(); });
  $('#sR').addEventListener('input', (e) => { S.rc.r = +e.target.value; updateCtl(); });
  $('#sRpm').addEventListener('input', (e) => { S.rc.rpm = +e.target.value; updateCtl(); });
  $('#rcfRun').addEventListener('click', rcRun);
  $('#rcfReset').addEventListener('click', () => { Sound.click(); S.rc.run = false; rcMix(); updateCtl(); });
  $('#inRcf').addEventListener('input', updateCtl);
  $$('#solSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.fr.sol = b.dataset.v; updateCtl(); }));
  $('#fHomog').addEventListener('click', frHomog);
  $$('#spdSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.fr.sel = +b.dataset.v; updateCtl(); }));
  $('#fSpin').addEventListener('click', frSpin);
  $('#fReset').addEventListener('click', () => { Sound.click(); frReset(); });
  $$('#testSeg button').forEach((b) => b.addEventListener('click', () => { if (S.fr.k < 3) { showHint('먼저 🧪 세포 분획에서 3단계 원심분리를 끝내요.', 3200); return; } Sound.click(); S.fr.tests[b.dataset.v] = true; updateCtl(); }));
  [0, 1, 2].forEach((k) => $('#lbl' + k).addEventListener('change', (e) => { S.fr.lbl[k] = e.target.value; Sound.click(); updateCtl(); }));

  /* =========================================================
     미션
     ========================================================= */
  const levels = [
    {
      title: '현미경으로 보는 세포', short: '현미경', icon: '🔬', phase: '관찰',
      intro: '<p class="si-q">❓ 탐구 질문: 너무 작아서 보이지 않는 소기관의 모양과 하는 일을 사람들은 어떻게 알아냈을까?</p><p>🔗 <b>중학교</b>에서 현미경으로 양파 표피 세포를 보며 핵 · 세포막 · 세포벽 · 엽록체 · 미토콘드리아를 배웠어요. 이번에는 <b>같은 세포</b>를 광학 현미경과 전자 현미경으로 번갈아 보며, 소기관이 어디까지 보이는지 알아봐요.</p><p>분해능(구별할 수 있는 두 점 사이의 가장 짧은 거리)이 작을수록 더 작은 구조가 보여요.</p>',
      features: ['micro', 'sortlm'],
      setup() { setMode('micro'); },
      recap: '광학 현미경(분해능 약 0.2 μm)으로는 핵과 미토콘드리아의 모양까지, 전자 현미경(분해능 약 0.2 nm)으로는 막 구조와 리보솜까지 볼 수 있어요. 다만 전자 현미경으로는 살아 있는 세포를 볼 수 없어요.',
      summary: '<ul><li><b>분해능</b>: 구별할 수 있는 두 점 사이의 최소 거리. 작을수록 선명해요.</li><li><b>광학 현미경</b>: 분해능 약 0.2 μm, 배율 최대 약 1000~1500배, 염색한 시료 · <b>살아 있는 세포</b>도 관찰 가능.</li><li><b>투과 전자 현미경(TEM)</b>: 전자선 이용, 분해능 약 0.2 nm, 배율 수만~수십만 배. 시료를 <b>얇게 잘라 진공</b>에서 봐서 살아 있는 세포는 볼 수 없지만, 막 · 크리스타 · 리보솜 같은 <b>내부 구조</b>가 보여요. (주사 전자 현미경(SEM)은 표면의 입체 모양)</li></ul>',
      missions: [
        {
          id: 'find', title: '두 현미경으로 보고 소기관 찾기',
          goal: '<b>광학 · 전자 현미경</b>으로 모두 관찰하고, 전자 현미경 사진에서 소기관 <b>4종</b> 이상에 이름표를 붙이세요.',
          hint: '현미경 버튼이나 분해능 슬라이더를 움직여요. 40 nm 이하로 선명해지면 이름표를 고르고 사진 속 구조를 눌러요. 이중막 타원에 주름 → 미토콘드리아, 납작한 층 → 골지체, 점이 박힌 막 → 거친 소포체예요.',
          setup() { microReset(); setMode('micro'); },
          check: () => S.mi.seenLM && S.mi.seenEM && foundCount() >= 4, hold: 0.8,
          status: () => mark(S.mi.seenLM) + ' 광학 현미경 &nbsp; ' + mark(S.mi.seenEM) + ' 전자 현미경 &nbsp; ' + mark(foundCount() >= 4) + ' 이름표 ' + foundCount() + ' / 4',
          explain: '분해능이 0.2 μm(200 nm)인 광학 현미경으로는 핵과 미토콘드리아의 <b>모양</b>까지 보이지만, 분해능이 약 0.2 nm인 전자 현미경으로는 <b>이중막 · 크리스타 · 핵공 · 골지체의 층 · 리보솜</b>까지 보여요. 이렇게 모양을 관찰해서 소기관의 구조와 이름을 알아냈어요.',
        },
        {
          id: 'classify', title: '보이는 것 분류', manual: true,
          goal: '관찰한 내용을 떠올리며 카드 6장을 <b>광학 현미경</b>으로 볼 수 있는 것과 <b>전자 현미경</b>이 필요한 것으로 나누세요.',
          hint: '핵과 미토콘드리아의 전체 모양은 광학 현미경으로도 보여요. 크리스타와 리보솜은 너무 작아요. 전자 현미경은 얇게 자른 시료를 진공에서 봐요.',
          setup() { setMode('sortlm'); sortLM.reset(); },
          check() {
            if (sortLM.placed < 6) { sortLM.markBad([]); return '카드를 모두 상자에 넣어 주세요. (' + sortLM.placed + ' / 6)'; }
            const w = sortLMWrong();
            if (!w.length) { sortLM.markBad([]); return true; }
            sortLM.markBad(w.map((c) => c.id)); return '빨갛게 표시된 카드를 다시 생각해 보세요. 그 크기가 광학 현미경의 분해능(0.2 μm)보다 큰지 작은지 비교해요.';
          },
          explain: '핵(5~10 μm)과 미토콘드리아(길이 1~2 μm)는 분해능 0.2 μm보다 커서 광학 현미경으로도 보이고, <b>살아 있는 세포</b>도 관찰할 수 있어요. 크리스타와 리보솜(약 25 nm)은 더 작아서 <b>전자 현미경</b>이 필요하며, 이때는 시료를 얇게 잘라 <b>진공</b> 속에서 보기 때문에 살아 있는 세포는 볼 수 없어요.',
        },
      ],
    },
    {
      title: '소기관 10종의 구조와 기능', short: '구조와 기능', icon: '🧩', phase: '설명',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 전자 현미경으로 소기관의 모양을 보았어요.</div><p>중학교에서는 소기관의 이름과 기능을 배웠어요. 이번에는 <b>막이 몇 겹인지</b>와 <b>내부 구조</b>까지 한 단계 깊이 살펴봐요. 소기관 10종(핵 · 거친 소포체 · 매끈 소포체 · 리보솜 · 골지체 · 리소좀 · 미토콘드리아 · 엽록체 · 액포 · 세포벽)을 동물 세포와 식물 세포에서 찾아봐요.</p>',
      features: ['cell', 'match', 'membsort'],
      setup() { setMode('cell'); },
      recap: '핵 · 미토콘드리아 · 엽록체는 이중막, 소포체 · 골지체 · 리소좀 · 액포는 단일막이고 리보솜은 막이 없어요. 식물 세포에는 엽록체 · 세포벽 · 큰 중앙 액포가 있어요.',
      summary: '<ul><li><b>이중막</b>: 핵(핵공) · 미토콘드리아(크리스타) · 엽록체(틸라코이드). <b>단일막</b>: 거친 · 매끈 소포체, 골지체, 리소좀, 액포. <b>막 없음</b>: 리보솜, (세포벽은 막이 아닌 세포막 바깥의 층).</li><li>핵: 유전 정보 저장 · 세포 활동 조절 / 거친 소포체: 리보솜이 붙어 단백질 운반 / 매끈 소포체: 지질 합성 · 해독 / 리보솜: 단백질 합성 / 골지체: 단백질 가공 · 분류 · 포장 / 리소좀: 세포 내 소화 / 미토콘드리아: 세포호흡 / 엽록체: 광합성 / 액포: 저장 · 삼투 조절 / 세포벽: 모양 유지 · 보호.</li><li>식물 세포에만 있는 것: <b>엽록체 · 세포벽 · 크고 중앙에 있는 액포</b>. 리소좀은 동물 세포에서 두드러져요.</li></ul>',
      missions: [
        {
          id: 'match', title: '소기관과 기능 잇기', manual: true,
          goal: '먼저 🧫 <b>세포 단면</b>에서 소기관 <b>10종</b>을 모두 눌러 살펴본 뒤, 🔗 <b>기능 연결</b>에서 소기관과 하는 일을 이으세요.',
          hint: '세포 단면에서 동물 세포와 식물 세포를 모두 보세요. 리소좀은 동물 세포에, 엽록체 · 세포벽 · 큰 액포는 식물 세포에 있어요. 리보솜은 작은 알갱이 무리예요.',
          setup() { setMode('cell'); mtReset(); },
          status: () => mark(Object.keys(S.cell.seen).length >= 10) + ' 살펴본 소기관 ' + Object.keys(S.cell.seen).length + ' / 10 &nbsp; ' + mark(mtCount() === 10) + ' 이은 선 ' + mtCount() + ' / 10',
          check() {
            const n = Object.keys(S.cell.seen).length;
            if (n < 10) return '먼저 세포 단면에서 소기관 10종을 모두 눌러 살펴보세요. (' + n + ' / 10) 동물 세포와 식물 세포를 모두 봐요.';
            if (mtCount() < 10) { return '아직 선으로 이어지지 않은 소기관이 있어요. (' + mtCount() + ' / 10)'; }
            const w = mtWrong();
            MT.left.forEach((id) => { MT.bad[id] = w.indexOf(id) >= 0; });
            if (!w.length) return true;
            return '빨간 점선으로 표시된 연결을 다시 생각해 보세요. (예: ' + ORG[w[0]].name + ')';
          },
          explain: '각 소기관의 구조가 기능과 연결돼요. 리보솜이 붙은 <b>거친 소포체</b>는 단백질을 운반하고, 납작한 주머니가 쌓인 <b>골지체</b>는 가공 · 분류 · 포장을 하며, 크리스타가 있는 <b>미토콘드리아</b>는 세포호흡으로 에너지를 만들어요.',
        },
        {
          id: 'memb', title: '막의 개수로 분류', manual: true,
          goal: '소기관 카드 10장을 <b>이중막 · 단일막 · 막 없음</b> 상자로 나누세요.',
          hint: '핵 · 미토콘드리아 · 엽록체는 막이 두 겹이에요. 소포체 · 골지체 · 리소좀 · 액포는 한 겹이에요. 리보솜과 세포벽은 막이 아니에요.',
          setup() { setMode('membsort'); sortMem.reset(); },
          check() {
            if (sortMem.placed < 10) { sortMem.markBad([]); return '카드를 모두 상자에 넣어 주세요. (' + sortMem.placed + ' / 10)'; }
            const w = sortMemWrong();
            if (!w.length) { sortMem.markBad([]); return true; }
            sortMem.markBad(w.map((c) => c.id)); return ORG[w[0].id].name + josa(ORG[w[0].id].name, '은', '는') + ' 그 상자가 아니에요. 세포 단면에서 막의 모양을 다시 살펴보세요.';
          },
          explain: '<b>이중막</b> 소기관은 핵 · 미토콘드리아 · 엽록체 3가지예요. 소포체 · 골지체 · 리소좀 · 액포는 <b>단일막</b>, 리보솜은 <b>막이 없어요</b>. 세포벽은 세포막 바깥을 싸는 층이라서 막으로 세지 않아요.',
        },
        {
          type: 'quiz', title: '식물 세포에만 있는 소기관',
          goal: '식물 세포에는 있고 <b>동물 세포에는 없는</b> 소기관끼리 짝지은 것은?',
          setup() { setMode('cell'); },
          choices: ['핵 · 미토콘드리아 · 리보솜', '엽록체 · 세포벽 · 크고 중앙에 있는 액포', '골지체 · 리소좀 · 거친 소포체', '엽록체 · 미토콘드리아 · 매끈 소포체'],
          answer: 1,
          feedback: ['핵 · 미토콘드리아 · 리보솜은 동물 세포에도 있어요.', '', '골지체 · 거친 소포체는 동물 세포에도 있고, 리소좀은 오히려 동물 세포에서 두드러져요.', '미토콘드리아와 매끈 소포체는 동물 세포에도 있어요.'],
          explain: '식물 세포에만 있는 것은 광합성을 하는 <b>엽록체</b>, 세포를 지탱하는 <b>세포벽</b>, 크고 가운데에 있는 <b>액포</b>예요. 리소좀은 동물 세포에서 두드러져요.',
        },
      ],
    },
    {
      title: '간이 원심분리기', short: '원심분리기', icon: '🌀', phase: '모형',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 소기관의 크기가 서로 다르다는 것을 보았어요.</div><p>크기가 다른 소기관을 서로 <b>분리</b>하려면 어떻게 할까요? <b>원심분리기</b>를 돌리면 큰 입자가 먼저 가라앉아요. 간이 원심분리기를 만들어 회전 반지름 r과 회전 수가 침강에 미치는 영향을 알아봐요.</p><p>원심력의 크기는 <b>RCF = 1.118 × 10⁻⁵ × r(cm) × rpm²</b> (단위 g, 중력 가속도의 배수)로 계산해요. 가상 시료는 흙탕물(모래 · 점토 · 색소)이에요.</p>',
      features: ['rcf'],
      setup() { setMode('rcf'); },
      recap: 'RCF = 1.118 × 10⁻⁵ × r × rpm² 이고 회전 수가 2배가 되면 RCF는 4배가 돼요. RCF가 클수록, 입자가 클수록 먼저 가라앉아서 크기가 다른 입자를 차례로 분리할 수 있어요.',
      summary: '<ul><li><b>상대 원심력(RCF)</b> = 1.118 × 10⁻⁵ × r(cm) × rpm². 단위는 g(중력 가속도의 배수). 예: r = 10 cm, 3000 rpm → 약 1000 g.</li><li>RCF는 회전 수의 <b>제곱</b>에 비례해요. 회전 수 2배 → RCF 4배.</li><li>크고 무거운 입자가 먼저 가라앉아요. RCF를 높이면 더 작은 입자까지 가라앉아요.</li><li><b>안전</b>: 뚜껑을 닫고 튜브를 고정하며, 맞은편에 같은 무게의 튜브로 균형을 맞춰요.</li></ul>',
      missions: [
        {
          id: 'rcf', title: 'RCF 계산하기',
          goal: '<b>r = 10 cm, 3000 rpm</b>으로 맞추고 RCF를 직접 계산해서 입력한 뒤 ▶ 10분 돌려 보세요.',
          hint: 'RCF = 1.118 × 10⁻⁵ × 10 × 3000² 이에요. 3000² = 9,000,000 이니까 약 1000 g이에요. 입력칸에 1000 정도를 적어요.',
          setup() { S.rc.r = 8; S.rc.rpm = 2000; $('#sR').value = 8; $('#sRpm').value = 2000; rcReset(); setMode('rcf'); },
          check: () => S.rc.r === 10 && S.rc.rpm === 3000 && rcfInOk() && !!S.rc.last && S.rc.last.r === 10 && S.rc.last.rpm === 3000, hold: 0.8,
          status: () => mark(S.rc.r === 10 && S.rc.rpm === 3000) + ' r = 10 cm · 3000 rpm &nbsp; ' + mark(rcfInOk()) + ' RCF 입력(약 1000 g) &nbsp; ' + mark(!!S.rc.last && S.rc.last.r === 10 && S.rc.last.rpm === 3000) + ' 돌려 보기',
          explain: 'RCF = 1.118 × 10⁻⁵ × 10 × 3000² = 1.118 × 10⁻⁵ × 10 × 9 × 10⁶ ≈ <b>1006 g</b>(약 1000 g)예요. 이 정도에서는 큰 모래 입자만 10분 안에 가라앉아요.',
        },
        {
          id: 'clay', title: '점토까지 가라앉히기',
          goal: 'r과 회전 수를 조절해 <b>모래와 점토가 모두 가라앉고 색소는 남도록</b> 10분 돌려 보세요.',
          hint: '점토는 약 3000 g 이상이 필요해요. r = 10 cm에서는 약 5500 rpm 이상이고, r을 더 크게 해도 돼요. 설정을 바꾼 뒤 ▶ 10분 돌리기를 눌러요.',
          setup() { S.rc.last = null; rcMix(); S.rc.ran = 0; setMode('rcf'); updateCtl(); },
          check: () => !!S.rc.last && S.rc.last.sand && S.rc.last.clay && !S.rc.last.pig, hold: 0.8,
          status: () => { const l = S.rc.last; return mark(!!l && l.sand) + ' 모래 침전 &nbsp; ' + mark(!!l && l.clay) + ' 점토 침전 &nbsp; ' + mark(!!l && !l.pig) + ' 색소는 남음' + (l ? ' &nbsp; (마지막 RCF ' + fmtNum(l.rcf) + ' g)' : ''); },
          explain: '입자가 작을수록 더 큰 RCF가 필요해요. 모래는 약 500 g, 점토는 약 3000 g 이상이면 10분 안에 가라앉지만 <b>색소</b>(아주 작은 입자)는 10만 g 이상의 <b>초원심분리기</b>가 있어야 가라앉아요. 이 원리로 크기가 다른 소기관을 차례로 분리해요.',
        },
        {
          type: 'quiz', title: '회전 수를 2배로 올리면?',
          goal: '회전 수(rpm)를 <b>2배</b>로 올리면 상대 원심력(RCF)은 몇 배가 될까요?',
          setup() { setMode('rcf'); },
          choices: ['2배', '4배', '8배', '변하지 않는다'],
          answer: 1,
          feedback: ['RCF는 회전 수에 비례하지 않고 회전 수의 제곱에 비례해요.', '', '8배는 회전 수의 세제곱이에요. RCF는 제곱에 비례해요.', '회전 수가 커지면 RCF도 커져요.'],
          explain: 'RCF는 <b>rpm²</b>에 비례해요. 회전 수가 2배면 2² = <b>4배</b>예요. (3000 rpm → 약 1006 g, 6000 rpm → 약 4025 g)',
        },
      ],
    },
    {
      title: '세포 분획법', short: '세포 분획', icon: '🧪', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 큰 입자가 먼저 가라앉고 RCF가 클수록 작은 입자까지 가라앉는 것을 확인했어요.</div><p>이 원리를 간세포에 적용해 보아요. 조직을 <b>차가운 등장성 설탕 용액</b>(0.25 M)에서 갈아 균질액을 만들고, <b>낮은 속도 → 높은 속도</b> 순서로 원심분리해서 소기관을 차례로 얻는 방법이 <b>세포 분획법</b>이에요.</p>',
      features: ['frac', 'assay'],
      setup() { setMode('frac'); },
      recap: '세포 분획법은 균질액을 낮은 속도에서 높은 속도로 차례로 원심분리해 큰 소기관부터 얻는 방법이에요. 약 1000 g에서 핵, 약 10000 g에서 미토콘드리아, 약 100000 g에서 소포체 조각이 가라앉아요.',
      summary: '<ul><li><b>세포 분획법</b>: 조직을 차가운 <b>등장성</b> 설탕 용액(0.25 M)에서 균질화(소기관이 터지지 않고 효소 활성도 유지) → <b>낮은 속도에서 높은 속도</b> 순서로 원심분리.</li><li>약 1000 g(10분): <b>핵</b> 침전 → 약 10000 g(20분): <b>미토콘드리아</b>(식물은 엽록체) → 약 100000 g(60분): <b>소포체 조각</b>(미세소체) → 상층액: 세포질(가용성 효소).</li><li>침전물이 무엇인지는 <b>표지 효소</b>로 확인: 핵 침전물에는 DNA가 많고, 미토콘드리아 침전물은 산소를 소비하며, 소포체 조각에는 소포체 표지 효소가 많아요.</li></ul>',
      missions: [
        {
          id: 'order', title: '3단계 원심분리', manual: true,
          goal: '<b>0.25 M 설탕 용액</b>으로 균질액을 만든 뒤, 속도를 골라 3번 원심분리해서 <b>침전물마다 한 가지 소기관만</b> 얻으세요.',
          hint: '먼저 증류수를 써 보면 소기관이 터지는 것도 볼 수 있어요. 큰 입자는 낮은 속도에서도 가라앉으니 1000 g → 10000 g → 100000 g 순서로 해요. 섞이면 ↺ 처음부터!',
          setup() { setMode('frac'); frReset(); },
          status: () => mark(S.fr.homog) + ' 균질액 &nbsp; ' + mark(S.fr.k >= 3) + ' 원심분리 ' + S.fr.k + ' / 3',
          check() {
            const f = S.fr;
            if (!f.homog) return '먼저 균질액을 만들어요. 소기관이 터지지 않는 용액을 골라야 해요.';
            if (f.busy) return '원심분리가 끝날 때까지 기다려 주세요.';
            if (f.k < 3) return '원심분리를 3번 해야 해요. (' + f.k + ' / 3)';
            if (frPure()) return true;
            return '침전물에 여러 소기관이 섞였어요. 낮은 속도에서는 큰 입자만 가라앉으니 속도를 천천히 올려 가며 ↺ 처음부터 다시 해 보세요.';
          },
          explain: '조직을 <b>등장성 설탕 용액</b>에서 갈면 삼투로 물이 드나들지 않아 소기관이 터지지 않아요. 그리고 <b>낮은 속도</b>(약 1000 g)에서는 가장 큰 <b>핵</b>, 중간 속도(약 10000 g)에서는 <b>미토콘드리아</b>, 높은 속도(약 100000 g)에서는 작은 <b>소포체 조각</b>이 차례로 가라앉아 한 가지씩 얻어요.',
        },
        {
          id: 'assay', title: '침전물의 정체 밝히기',
          goal: '검사 3가지를 모두 해 보고, 침전물 1 · 2 · 3에 알맞은 이름(핵 · 미토콘드리아 · 소포체 조각)을 붙이세요.',
          hint: 'DNA가 많은 침전물은 핵, 산소를 많이 소비하는 침전물은 미토콘드리아, 소포체 표지 효소가 많은 침전물은 소포체 조각이에요.',
          setup() { if (!frPure()) frInstant(); asReset(); setMode('assay'); },
          check: () => asOk(), hold: 0.8,
          status: () => mark(S.fr.tests.dna && S.fr.tests.o2 && S.fr.tests.er) + ' 검사 ' + Object.values(S.fr.tests).filter(Boolean).length + ' / 3 &nbsp; ' + mark(asOk()) + ' 이름표 3개',
          explain: '침전물 1은 <b>DNA</b>가 많아 <b>핵</b>, 침전물 2는 <b>산소를 많이 소비</b>해서 <b>미토콘드리아</b>, 침전물 3은 <b>소포체 표지 효소</b>가 많아 <b>소포체 조각</b>이에요. 이렇게 소기관을 분리하고 확인하면 소기관의 기능도 따로 연구할 수 있어요.',
        },
        {
          type: 'quiz', title: '낮은 속도부터 시작하는 까닭',
          goal: '세포 분획에서 <b>낮은 속도 → 높은 속도</b> 순서로 원심분리하는 까닭은?',
          setup() { setMode('frac'); },
          choices: ['작은 소기관이 더 빨리 가라앉기 때문이다', '크고 무거운 소기관이 낮은 속도에서도 먼저 가라앉기 때문이다', '높은 속도에서는 소기관이 모두 터지기 때문이다', '모든 소기관이 같은 속도로 가라앉기 때문이다'],
          answer: 1,
          feedback: ['작은 입자일수록 가라앉는 데 더 큰 원심력이 필요해요.', '', '소기관이 터지는 것은 용액의 농도(삼투) 때문이지 원심분리 속도 때문이 아니에요.', '입자의 크기가 다르면 가라앉는 속도도 달라요. 그래서 분리할 수 있어요.'],
          explain: '큰 소기관(핵)은 낮은 RCF에서도 가라앉고, 작은 소기관일수록 더 높은 RCF가 필요해요. 그래서 <b>속도를 점점 높이며</b> 상층액을 다시 원심분리하면 큰 것부터 차례로 분리돼요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hy-organelles', mount: '#game', badge: '소기관 탐험가', homeHref: '../../index.html#hy',
    featureLabels: { micro: '🔬 현미경 관찰', sortlm: '🗂 보이는 것 분류', cell: '🧫 세포 단면', match: '🔗 기능 연결', membsort: '🗂 막 개수 분류', rcf: '🌀 간이 원심분리기', frac: '🧪 세포 분획', assay: '🔍 침전물 확인' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 읽음 칸 ---------- */
  function readouts() {
    const m = S.mode, res = resOf(S.mi.s);
    if (m === 'micro') setReads(['분해능', fmtRes(res), '현미경', res >= 150 ? '광학' : '전자', '찾은 소기관', foundCount() + ' / 5']);
    else if (m === 'sortlm') setReads(['놓은 카드', sortLM.placed + ' / 6', '남은 카드', (6 - sortLM.placed) + '장', '상자', '2칸']);
    else if (m === 'cell') setReads(['보는 세포', S.cell.kind === 'animal' ? '동물 세포' : '식물 세포', '선택한 소기관', S.cell.sel ? ORG[S.cell.sel].name : '—', '살펴본 소기관', Object.keys(S.cell.seen).length + ' / 10']);
    else if (m === 'match') setReads(['이은 선', mtCount() + ' / 10', '남은 소기관', (10 - mtCount()) + '개', '선택', MT.sel ? ORG[MT.sel].name : '—']);
    else if (m === 'membsort') setReads(['놓은 카드', sortMem.placed + ' / 10', '남은 카드', (10 - sortMem.placed) + '장', '상자', '3칸']);
    else if (m === 'rcf') setReads(['r', S.rc.r + ' cm', '회전 수', S.rc.rpm + ' rpm', 'RCF', fmtNum(rcfOf(S.rc.r, S.rc.rpm)) + ' g']);
    else if (m === 'frac') setReads(['원심분리', S.fr.k + ' / 3', '균질화 용액', S.fr.homog || S.fr.burst ? (S.fr.sol === 'sugar' ? '0.25 M 설탕' : '증류수') : '—', '선택한 속도', S.fr.sel ? fmtNum(S.fr.sel) + ' g' : '—']);
    else setReads(['한 검사', Object.values(S.fr.tests).filter(Boolean).length + ' / 3', '이름 붙인 침전물', S.fr.lbl.filter(Boolean).length + ' / 3', '침전물', S.fr.k >= 3 ? '3개' : '아직']);
  }

  /* ---------- 시작 ---------- */
  setMode('micro');
  let lastFree = false, lastLv = -1;
  SciSim.loop((dt, t) => {
    clock = t; S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (game && game.level !== lastLv) { lastLv = game.level; updateCtl(); }
    view.apply(); FX.update(dt); ctx.clearRect(0, 0, VW, VH);
    switch (S.mode) {
      case 'micro': bgFill('#eef4f2', '#e3ece8'); microDraw(dt, t); break;
      case 'sortlm': bgFill('#eef4f2', '#e3ece8'); sortLMDraw(dt, t); break;
      case 'cell': bgFill('#eef4f2', '#e3ece8'); cellDraw(dt, t); break;
      case 'match': bgFill('#eef4f2', '#e3ece8'); matchDraw(dt, t); break;
      case 'membsort': bgFill('#eef4f2', '#e3ece8'); sortMemDraw(dt, t); break;
      case 'rcf': bgFill('#eef4f2', '#e3ece8'); rcDraw(dt, t); break;
      case 'frac': bgFill('#eef4f2', '#e3ece8'); fracDraw(dt, t); break;
      case 'assay': bgFill('#eef4f2', '#e3ece8'); assayDraw(dt, t); break;
    }
    if (S.mode !== 'rcf') rcUpdateIdle(dt);
    FX.draw(); parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(241,246,243,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : approach(S.fade, 0, dt, 9); }
    readouts();
  });
  function rcUpdateIdle(dt) { if (S.rc.run || S.rc.w > 0.01) rcUpdate(dt); }

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, PHONE, get game() { return game; }, levels, setMode, ORG, OKEYS, MV, CELL, MT, mtRow, MTL, MTR_, MTH, sortLM, sortMem, LMCARDS, resOf, microHit, ORGC, SCL,
    rcRun, rcfOf, frHomog, frSpin, frInstant, frReset, frPure, frDom, FT, FP, updateCtl, asOk, mtReset, cellSet, blurInto, renderScene, foundCount,
  };
})();
