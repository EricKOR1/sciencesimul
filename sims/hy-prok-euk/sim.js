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
     고등학교 세포와 물질대사 · Ⅰ. 세포 - 원핵세포와 진핵세포 (단원 56, 6차시)
     성취기준 [12세포01-04] 원핵세포와 진핵세포의 공통점과 차이점을 설명할 수 있다.
     ① 실험: 크기 측정  ② 모형: DNA와 핵  ③ 모형: 막·리보솜·벽  ④ 적용: 세포 분류
     ========================================================= */
  const S = { mode: 'calib', fade: 0 };
  let game = null;

  /* ---------- 가상 현미경 ---------- */
  const OBJ = { 100: { c: 10, nm: '100배' }, 400: { c: 2.5, nm: '400배' }, 1000: { c: 1, nm: '1000배' } };   // 접안 마이크로미터 1칸의 실제 길이 (μm)
  const NDIV = PHONE ? 40 : 42, PXDIV = PHONE ? 9 : 10;                                                    // 접안 눈금 칸 수, 1칸의 화면 길이(px)
  const SV = PHONE ? { x: 10, y: 10, w: 460, h: 430 } : { x: 14, y: 14, w: 520, h: 532 };
  const SCX = SV.x + SV.w / 2, SCY = SV.y + SV.h / 2 + (PHONE ? 6 : 8), SR = PHONE ? 205 : 236;
  const EX0 = SCX - NDIV * PXDIV / 2;
  const pxOf = (um, o) => um / OBJ[o].c * PXDIV;                                                            // 길이(μm)가 시야에서 몇 px 인지
  const SPEC = {
    onion: { nm: '양파 표피 세포', L: 150, W: 50, objs: '100배' },
    oral: { nm: '구강 상피 세포', L: 50, W: 46 },
    yeast: { nm: '효모', L: 8, W: 6.5 },
    coli: { nm: '대장균', L: 2, W: 0.8 },
  };
  const SKEYS = ['onion', 'oral', 'yeast', 'coli'];
  S.cal = { obj: 400, v: { 100: 10, 400: null, 1000: 1 }, sx: 37, drag: null, aligned: {}, wrong: false };
  S.ms = { spec: 'onion', obj: 100, ox: 70, drag: null, mark: null, rec: {}, fb: '' };
  const calOk = () => S.cal.v[400] != null;
  const msAligned = () => Math.abs(S.ms.ox) < 4;

  function lensFrame(inside) {
    ctx.save(); ctx.beginPath(); ctx.arc(SCX, SCY, SR, 0, TAU); ctx.clip();
    const g = ctx.createRadialGradient(SCX - SR * 0.2, SCY - SR * 0.3, SR * 0.1, SCX, SCY, SR);
    g.addColorStop(0, '#fffef8'); g.addColorStop(1, '#e4e9ec'); ctx.fillStyle = g; ctx.fillRect(SCX - SR, SCY - SR, SR * 2, SR * 2);
    inside();
    ctx.restore();
    ctx.strokeStyle = '#111827'; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(SCX, SCY, SR + 3, 0, TAU); ctx.stroke();
  }
  function scopePanel() {
    D.shadow(() => { D.roundRect(SV.x, SV.y, SV.w, SV.h, 18); ctx.fillStyle = '#2b3445'; ctx.fill(); }, { blur: 10, y: 3 });
  }
  function drawEyepiece() {
    const x0 = EX0, n = NDIV;
    ctx.save(); ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(x0 - 10, SCY - 12, n * PXDIV + 20, 24); ctx.restore();
    ctx.strokeStyle = '#111'; ctx.fillStyle = '#111'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(x0, SCY); ctx.lineTo(x0 + n * PXDIV, SCY); ctx.stroke();
    for (let i = 0; i <= n; i++) { const x = x0 + i * PXDIV, h = i % 5 === 0 ? 11 : 6; ctx.beginPath(); ctx.moveTo(x, SCY - h); ctx.lineTo(x, SCY + h * 0); ctx.stroke(); if (i % 5 === 0) T(x, SCY + 24, String(i), 13, '#111', 'center', 800, { stroke: 'rgba(255,255,255,.8)', strokeWidth: 3 }); }
  }
  function drawStageMicrometer(sx, obj) {
    const T0 = 10 / OBJ[obj].c * PXDIV, y = SCY + 52, x0 = EX0 + sx;
    ctx.save(); D.roundRect(x0 - 6 * T0 - 20, y - 4, 400 * 4, 34, 6); ctx.restore();
    ctx.save(); ctx.fillStyle = 'rgba(147,197,253,.4)'; ctx.fillRect(SCX - SR, y - 6, SR * 2, 40); ctx.strokeStyle = '#1d4ed8'; ctx.fillStyle = '#1e3a8a'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(SCX - SR, y); ctx.lineTo(SCX + SR, y); ctx.stroke();
    const k0 = Math.floor((SCX - SR - x0) / T0), k1 = Math.ceil((SCX + SR - x0) / T0);
    for (let k = k0; k <= k1; k++) {
      if (k < 0 || k > 100) continue;
      const x = x0 + k * T0, big = k % 5 === 0 || T0 > 30; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + (big ? 14 : 8)); ctx.stroke();
      if (big && (T0 > 30 || k % 5 === 0)) T(x, y + 30, String(k), 13, '#1e3a8a', 'center', 800);
    }
    ctx.restore();
    T(SCX - SR + 14, y - 12, '대물 마이크로미터 (1칸 = 10 μm)', 13, '#1e3a8a', 'left', 800, { stroke: 'rgba(255,255,255,.85)', strokeWidth: 3 });
  }
  function calibDraw(dt, t) {
    const c = S.cal; c.sx = c.drag ? c.sx : RM ? c.sx : approach(c.sx, Math.abs(c.sx) < 4 ? 0 : c.sx, dt, 12);
    const al = Math.abs(c.sx) < 3; if (al) c.aligned[c.obj] = true;
    scopePanel();
    lensFrame(() => {
      drawStageMicrometer(c.sx, c.obj); drawEyepiece();
      if (al) {   // 두 눈금이 다시 만나는 곳
        const d = 40, x = EX0 + d * PXDIV, n = d * OBJ[c.obj].c / 10;
        ctx.fillStyle = 'rgba(250,204,21,.4)'; ctx.fillRect(x - 5, SCY - 40, 10, 140);
        ctx.strokeStyle = '#ca8a04'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, SCY - 40); ctx.lineTo(x, SCY + 100); ctx.stroke();
        D.label(x, SCY - 54, '접안 ' + d + '칸', { bg: '#ca8a04', color: '#fff', size: 13 }); D.label(x, SCY + 116, '대물 ' + (Math.round(n * 10) / 10) + '칸', { bg: '#1d4ed8', color: '#fff', size: 13 });
        D.label(EX0 + 24, SCY - 54, '0점', { bg: '#15803d', color: '#fff', size: 13 });
      }
    });
    D.label(SV.x + 14, SV.y + 22, OBJ[c.obj].nm + ' (대물렌즈)', { bg: 'rgba(0,0,0,.55)', color: '#fff', size: 13, align: 'left' });
    D.label(SV.x + SV.w - 14, SV.y + 22, al ? '두 눈금의 0이 맞았어요' : '아래 눈금을 끌어서 0을 맞춰요', { bg: al ? '#15803d' : 'rgba(0,0,0,.55)', color: '#fff', size: 13, align: 'right' });
    infoPanel(t);
  }
  const calibPT = {
    down(p) { if ((p.x - SCX) ** 2 + (p.y - SCY) ** 2 < SR * SR) { S.cal.drag = { x: p.x, s0: S.cal.sx }; return true; } return false; },
    move(p) { const d = S.cal.drag; if (d) S.cal.sx = clamp(d.s0 + p.x - d.x, -160, 160); },
    up(p) { const d = S.cal.drag; if (!d) return; S.cal.drag = null; if (Math.abs(S.cal.sx) < 5) { S.cal.sx = 0; S.cal.aligned[S.cal.obj] = true; Sound.click(); } updateCtl(); },
    hover(p) { return (p.x - SCX) ** 2 + (p.y - SCY) ** 2 < SR * SR ? 'ew-resize' : 'default'; },
  };

  /* ----- 시료 그리기 (왼쪽 끝 x, 가운데 y) ----- */
  function drawSpecimen(key, xl, yc, o) {
    const sp = SPEC[key], Lp = pxOf(sp.L, o), Wp = Math.max(1.5, pxOf(sp.W, o)), lw = Math.max(1.2, Math.min(3, Lp * 0.02 + 1));
    ctx.save();
    if (key === 'onion') {
      D.roundRect(xl, yc - Wp / 2, Lp, Wp, Math.min(8, Wp * 0.2)); ctx.fillStyle = '#f3e6b3'; ctx.fill(); ctx.strokeStyle = '#a98b4a'; ctx.lineWidth = lw * 1.6; ctx.stroke();
      D.roundRect(xl + lw * 3, yc - Wp / 2 + lw * 3, Lp - lw * 6, Wp - lw * 6, Math.min(6, Wp * 0.15)); ctx.strokeStyle = '#e8a838'; ctx.lineWidth = lw * 0.8; ctx.stroke();
      ctx.fillStyle = 'rgba(160,110,200,.65)'; ctx.beginPath(); ctx.ellipse(xl + Lp * 0.3, yc, Wp * 0.17, Wp * 0.2, 0, 0, TAU); ctx.fill();
    } else if (key === 'oral') {
      ctx.beginPath(); for (let i = 0; i <= 40; i++) { const a = i / 40 * TAU, w = 1 + Math.sin(a * 3 + 1) * 0.05; const x = xl + Lp / 2 + Math.cos(a) * Lp / 2 * w, y = yc + Math.sin(a) * Wp / 2 * w; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); } ctx.closePath();
      ctx.fillStyle = 'rgba(244,190,205,.85)'; ctx.fill(); ctx.strokeStyle = '#c0607a'; ctx.lineWidth = lw; ctx.stroke();
      ctx.fillStyle = 'rgba(120,70,170,.75)'; ctx.beginPath(); ctx.arc(xl + Lp / 2, yc, Wp * 0.13, 0, TAU); ctx.fill();
    } else if (key === 'yeast') {
      ctx.beginPath(); ctx.ellipse(xl + Lp / 2, yc, Lp / 2, Wp / 2, 0, 0, TAU); ctx.fillStyle = 'rgba(250,224,150,.9)'; ctx.fill(); ctx.strokeStyle = '#b8892b'; ctx.lineWidth = lw; ctx.stroke();
      ctx.fillStyle = 'rgba(120,70,170,.7)'; ctx.beginPath(); ctx.arc(xl + Lp * 0.42, yc, Math.max(1.2, Wp * 0.17), 0, TAU); ctx.fill();
    } else {
      D.roundRect(xl, yc - Wp / 2, Lp, Wp, Wp / 2); ctx.fillStyle = 'rgba(120,200,170,.9)'; ctx.fill(); ctx.strokeStyle = '#1f7a62'; ctx.lineWidth = Math.max(1, lw * 0.9); ctx.stroke();
    }
    ctx.restore();
    return Lp;
  }
  function measureDraw(dt, t) {
    const m = S.ms; m.ox = m.drag ? m.ox : RM ? m.ox : approach(m.ox, Math.abs(m.ox) < 4.5 && !m.drag ? 0 : m.ox, dt, 14);
    const Lp = pxOf(SPEC[m.spec].L, m.obj), fits = Lp <= NDIV * PXDIV;
    scopePanel();
    lensFrame(() => {
      drawSpecimen(m.spec, EX0 + m.ox, SCY - 4, m.obj); drawEyepiece();
      if (m.mark != null) {
        const x = EX0 + m.mark * PXDIV;
        ctx.fillStyle = '#e2464b'; ctx.beginPath(); ctx.moveTo(x, SCY - 8); ctx.lineTo(x - 8, SCY - 24); ctx.lineTo(x + 8, SCY - 24); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(226,70,75,.6)'; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(x, SCY - 24); ctx.lineTo(x, SCY - 120); ctx.stroke(); ctx.setLineDash([]);
        D.label(x, SCY - 128, m.mark + '칸', { bg: '#e2464b', color: '#fff', size: 13 });
      }
      if (msAligned()) D.label(EX0 + 66, SCY - 128, '0점 맞춤', { bg: '#15803d', color: '#fff', size: 13 });
    });
    D.label(SV.x + 14, SV.y + 22, SPEC[m.spec].nm + ' · ' + OBJ[m.obj].nm, { bg: 'rgba(0,0,0,.55)', color: '#fff', size: 13, align: 'left' });
    D.label(SV.x + SV.w - 14, SV.y + 22, !fits ? '시료가 시야보다 커요' : msAligned() ? '오른쪽 끝의 눈금을 눌러요' : '시료를 끌어서 왼쪽 끝을 0에 맞춰요', { bg: !fits ? '#b91c1c' : msAligned() ? '#15803d' : 'rgba(0,0,0,.55)', color: '#fff', size: 13, align: 'right' });
    infoPanel(t);
  }
  const measurePT = {
    down(p) {
      if ((p.x - SCX) ** 2 + (p.y - SCY) ** 2 >= SR * SR) return false;
      S.ms.drag = { x: p.x, y: p.y, o0: S.ms.ox, moved: false }; return true;
    },
    move(p) { const d = S.ms.drag; if (!d) return; if (Math.abs(p.x - d.x) > 6) d.moved = true; if (d.moved) S.ms.ox = clamp(d.o0 + p.x - d.x, -120, NDIV * PXDIV * 0.7); },
    up(p) {
      const d = S.ms.drag; if (!d) return; S.ms.drag = null;
      if (!d.moved) {   // 눈금을 눌러서 오른쪽 끝의 눈금을 읽어요
        if (Math.abs(p.y - SCY) < 26 && p.x >= EX0 - 6 && p.x <= EX0 + NDIV * PXDIV + 6) { S.ms.mark = clamp(Math.round((p.x - EX0) / PXDIV * 2) / 2, 0, NDIV); S.ms.fb = ''; Sound.tick(); }
        else showHint('눈금자 위의 시료 오른쪽 끝을 눌러 눈금을 읽어요. 시료는 옆으로 끌어서 움직여요.', 3600);
      } else { if (Math.abs(S.ms.ox) < 7) { S.ms.ox = 0; Sound.click(); } S.ms.mark = null; }
      updateCtl();
    },
    hover(p) { return (p.x - SCX) ** 2 + (p.y - SCY) ** 2 < SR * SR ? 'ew-resize' : 'default'; },
  };
  function msRecord() {
    const m = S.ms, sp = SPEC[m.spec], Lp = pxOf(sp.L, m.obj), cal = S.cal.v[m.obj];
    let msg = '';
    if (Lp > NDIV * PXDIV) msg = '시료가 시야보다 커서 끝까지 잴 수 없어요. 배율을 낮춰 보세요.';
    else if (!msAligned()) msg = '시료의 왼쪽 끝을 접안 눈금의 0에 맞춰요. (시료를 끌어요)';
    else if (Lp < 1.5 * PXDIV) msg = '눈금이 1~2칸도 안 되어 읽기 어려워요. 배율을 높여 보세요.';
    else if (m.mark == null) msg = '시료의 오른쪽 끝에 닿은 접안 눈금을 눌러서 읽어요.';
    else if (Math.abs(m.mark - Lp / PXDIV) > 0.5) msg = '눈금을 잘못 읽었어요. 시료의 오른쪽 끝이 어느 눈금에 닿는지 다시 봐요.';
    else if (cal == null) msg = '이 배율에서 접안 1칸의 길이를 아직 몰라요. 🧮 보정에서 먼저 구해요.';
    if (msg) { m.fb = msg; Sound.fail(); showHint(msg, 4800); updateCtl(); return; }
    const L = Math.round(m.mark * cal * 10) / 10;
    m.rec[m.spec] = { n: m.mark, obj: m.obj, c: cal, L };
    m.fb = ''; Sound.success(); hideHint(); parts.burst(SCX, SCY, { count: 16, colors: ['#22c55e', '#facc15'], size: 3.5 }); updateCtl();
  }
  const msCount = () => Object.keys(S.ms.rec).length;

  /* 오른쪽(아래) 정보: 보정표와 측정 기록 */
  const INF = PHONE ? { x: 10, y: 450, w: 460, h: 180 } : { x: 546, y: 14, w: 240, h: 532 };
  function infoPanel(t) {
    panel(INF.x, INF.y, INF.w, INF.h, 16, '#ffffff');
    const x = INF.x + 14;
    T(x, INF.y + 26, '보정표 (접안 1칸의 길이)', 14.5, '#334155', 'left', 800);
    [100, 400, 1000].forEach((o, i) => {
      const v = S.cal.v[o], tx = PHONE ? INF.x + 14 + i * 150 : x, ty = PHONE ? INF.y + 52 : INF.y + 52 + i * 24;
      T(tx, ty, OBJ[o].nm + ' → ' + (v == null ? '? μm' : v + ' μm'), 14, v == null ? '#b45309' : '#1f2d44', 'left', 800);
    });
    const y1 = INF.y + (PHONE ? 80 : 134);
    T(x, y1, '측정 기록', 14.5, '#334155', 'left', 800);
    let any = false;
    SKEYS.forEach((k, i) => {
      const r = S.ms.rec[k], yy = y1 + 24 + i * (PHONE ? 22 : 40);
      if (r) { any = true; T(x, yy, SPEC[k].nm, 13.5, '#1f2d44', 'left', 800); T(x + (PHONE ? 160 : 0), PHONE ? yy : yy + 17, r.n + '칸 × ' + r.c + ' μm = ' + r.L + ' μm', 13.5, '#15803d', 'left', 800); }
      else T(x, yy, SPEC[k].nm + ' · 아직', 13.5, '#94a3b8', 'left', 700);
    });
    if (S.im.meas != null && !PHONE) { T(x, INF.y + INF.h - 60, '사진 분석: 세포 폭', 13.5, '#1f2d44', 'left', 800); T(x, INF.y + INF.h - 40, '약 ' + S.im.meas + ' μm', 14, '#15803d', 'left', 800); }
  }

  /* ---------- 이미지 분석 ---------- */
  const IM = PHONE ? { x: 10, y: 10, w: 460, h: 380 } : { x: 14, y: 14, w: 520, h: 532 };
  const BARPX = 200, CELLW = 160;
  const IMC = { cx: IM.x + IM.w / 2, cy: IM.y + IM.h * 0.46 };
  const BAR = { x1: IM.x + 30, x2: IM.x + 30 + BARPX, y: IM.y + IM.h - 30 };
  S.im = { tool: 'bar', drag: null, line: { bar: null, cell: null }, cal: null, meas: null, msg: '', done: false };
  function imReset() { const m = S.im; m.line = { bar: null, cell: null }; m.cal = null; m.meas = null; m.done = false; m.msg = ''; m.drag = null; const e = $('#inBar'); if (e) e.value = ''; updateCtl(); }
  function imEval() {
    const m = S.im, v = numOf('inBar');
    const b = m.line.bar;
    if (b) {
      const len = Math.hypot(b.x2 - b.x1, b.y2 - b.y1), onBar = Math.abs(len - BARPX) <= 12 && Math.abs(b.y1 - BAR.y) < 16 && Math.abs(b.y2 - BAR.y) < 16;
      m.cal = onBar && isFinite(v) && Math.abs(v - 50) < 0.6 ? 50 / len : null;
      m.barLen = len;
    } else { m.cal = null; m.barLen = null; }
    const c = m.line.cell;
    if (c) {
      const len = Math.hypot(c.x2 - c.x1, c.y2 - c.y1);
      m.cellPx = len;
      if (m.cal) { m.meas = Math.round(len * m.cal * 10) / 10; m.done = Math.abs(m.meas - 40) <= 4; } else { m.meas = null; m.done = false; }
    } else { m.cellPx = null; m.meas = null; m.done = false; }
  }
  function imDraw(dt, t) {
    imEval();
    const m = S.im;
    D.shadow(() => { D.roundRect(IM.x, IM.y, IM.w, IM.h, 16); ctx.fillStyle = '#9a9aa2'; ctx.fill(); }, { blur: 10, y: 3 });
    ctx.save(); D.roundRect(IM.x, IM.y, IM.w, IM.h, 16); ctx.clip();
    const g = ctx.createRadialGradient(IMC.cx, IMC.cy, 20, IMC.cx, IMC.cy, IM.w * 0.7); g.addColorStop(0, '#d9d6dd'); g.addColorStop(1, '#a7a3ad'); ctx.fillStyle = g; ctx.fillRect(IM.x, IM.y, IM.w, IM.h);
    // 세포 사진 (폭 160 px)
    ctx.beginPath(); for (let i = 0; i <= 60; i++) { const a = i / 60 * TAU, w = 1 + Math.sin(a * 3) * 0.035; const x = IMC.cx + Math.cos(a) * (CELLW / 2) * w, y = IMC.cy + Math.sin(a) * 66 * w; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); } ctx.closePath();
    ctx.fillStyle = 'rgba(236,196,214,.92)'; ctx.fill(); ctx.strokeStyle = '#b05a78'; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.fillStyle = 'rgba(122,72,170,.8)'; ctx.beginPath(); ctx.arc(IMC.cx - 6, IMC.cy + 2, 17, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.beginPath(); ctx.ellipse(IMC.cx - 30, IMC.cy - 26, 30, 10, -0.3, 0, TAU); ctx.fill();
    // 스케일 바 (사진에 찍혀 있음)
    D.roundRect(BAR.x1 - 10, BAR.y - 26, BARPX + 20, 44, 8); ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillRect(BAR.x1, BAR.y - 2, BARPX, 5); ctx.fillRect(BAR.x1, BAR.y - 8, 3, 17); ctx.fillRect(BAR.x2 - 3, BAR.y - 8, 3, 17);
    T((BAR.x1 + BAR.x2) / 2, BAR.y - 13, '50 μm', 14, '#fff', 'center', 800);
    // 그은 선
    const drawLine = (l, col, label) => { if (!l) return; ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(l.x1, l.y1); ctx.lineTo(l.x2, l.y2); ctx.stroke(); [[l.x1, l.y1], [l.x2, l.y2]].forEach((q) => { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(q[0], q[1], 5, 0, TAU); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(q[0], q[1], 2, 0, TAU); ctx.fill(); }); if (label) D.label((l.x1 + l.x2) / 2, (l.y1 + l.y2) / 2 - 20, label, { bg: col, color: '#fff', size: 13 }); };
    drawLine(m.line.bar, '#facc15', m.barLen ? Math.round(m.barLen) + ' px' : '');
    drawLine(m.line.cell, '#22d3ee', m.cellPx ? Math.round(m.cellPx) + ' px' : '');
    if (m.drag) drawLine(m.drag, m.tool === 'bar' ? '#facc15' : '#22d3ee', Math.round(Math.hypot(m.drag.x2 - m.drag.x1, m.drag.y2 - m.drag.y1)) + ' px');
    ctx.restore();
    ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = 2; D.roundRect(IM.x, IM.y, IM.w, IM.h, 16); ctx.stroke();
    D.label(IM.x + 12, IM.y + 22, '구강 상피 세포 사진 (이미지 분석)', { bg: 'rgba(0,0,0,.6)', color: '#fff', size: 13, align: 'left' });
    // 설명 패널
    const ip = PHONE ? { x: 10, y: 400, w: 460, h: 230 } : INF;
    panel(ip.x, ip.y, ip.w, ip.h, 16, '#ffffff');
    const x = ip.x + 14; let y = ip.y + 28;
    T(x, y, '이미지 분석 순서', 15, '#334155', 'left', 800); y += 28;
    const steps = [[!!m.cal, '① 스케일 바(50 μm)를 따라 선을 그어 px를 재요'], [m.cal != null, '→ 1 px = ' + (m.cal ? (Math.round(m.cal * 1000) / 1000) + ' μm' : '?') + ' (50 μm / 바의 px)'], [m.meas != null, '② 세포 폭을 가로질러 선을 그어요'], [m.done, '→ 세포 폭 = px × ' + (m.cal ? (Math.round(m.cal * 1000) / 1000) : '?') + (m.meas != null ? ' = ' + m.meas + ' μm' : '')]];
    steps.forEach((s2, i) => { const h = textBlock(x, y, ip.w - 28, (s2[0] ? '✅ ' : '⬜ ') + s2[1], 13.5, s2[0] ? '#15803d' : '#475569', 19, 800); y += h + 8; });
    if (m.msg) textBlock(x, ip.y + ip.h - (PHONE ? 50 : 70), ip.w - 28, m.msg, 13.5, '#b45309', 19, 800);
  }
  const imPT = {
    down(p) { if (!inRect(p.x, p.y, IM)) return false; S.im.drag = { x1: p.x, y1: p.y, x2: p.x, y2: p.y }; return true; },
    move(p) { const d = S.im.drag; if (d) { d.x2 = clamp(p.x, IM.x, IM.x + IM.w); d.y2 = clamp(p.y, IM.y, IM.y + IM.h); } },
    up(p) {
      const m = S.im, d = m.drag; if (!d) return; m.drag = null;
      let l = { x1: d.x1, y1: d.y1, x2: d.x2, y2: d.y2 };
      if (Math.hypot(l.x2 - l.x1, l.y2 - l.y1) < 12) return;
      if (l.x2 < l.x1) l = { x1: l.x2, y1: l.y2, x2: l.x1, y2: l.y1 };
      if (m.tool === 'bar') {   // 스케일 바 끝에 가까우면 끝에 붙어요
        if (Math.abs(l.x1 - BAR.x1) < 10 && Math.abs(l.y1 - BAR.y) < 14) { l.x1 = BAR.x1; l.y1 = BAR.y; }
        if (Math.abs(l.x2 - BAR.x2) < 10 && Math.abs(l.y2 - BAR.y) < 14) { l.x2 = BAR.x2; l.y2 = BAR.y; }
      }
      m.line[m.tool] = l; Sound.click(); updateCtl();
    },
  };

  /* ---------- 크기 비교 막대그래프 ---------- */
  S.ch = { log: false, anim: 0 };
  const CH = PHONE ? { x: 10, y: 10, w: 460, h: 560 } : { x: 14, y: 14, w: 772, h: 532 };
  function chartDraw(dt, t) {
    panel(CH.x, CH.y, CH.w, CH.h, 18, '#ffffff');
    const c = S.ch; c.anim = approach(c.anim, c.log ? 1 : 0, dt, RM ? 60 : 6);
    T(CH.x + 18, CH.y + 28, '세포의 크기 (내가 잰 값)', 16, '#334155', 'left', 800);
    const px0 = CH.x + 70, pw = CH.w - 100, py0 = CH.y + 56, ph = CH.h - 166;
    const vmin = 1, vmax = 200;
    const ys = (v) => { const lin = ph - ph * clamp(v / 160, 0, 1), lg = ph - ph * clamp(Math.log10(Math.max(v, vmin) / vmin) / Math.log10(vmax / vmin), 0, 1); return py0 + lin + (lg - lin) * c.anim; };
    // 원핵 · 진핵 크기 범위
    [[1, 10, '원핵세포 약 1~10 μm', 'rgba(34,197,94,.18)', '#15803d'], [10, 100, '진핵세포 약 10~100 μm', 'rgba(99,102,241,.14)', '#4338ca']].forEach(([a, b, lb, fc, tc], i) => {
      const y1 = ys(b), y2 = ys(a); ctx.fillStyle = fc; ctx.fillRect(px0, y1, pw, Math.max(1, y2 - y1)); T(px0 + pw - 6, (i ? y1 + 16 : y2 - 6), lb, 13, tc, 'right', 800);
    });
    // 눈금
    ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1;
    (c.log ? [1, 2, 5, 10, 20, 50, 100, 200] : [0, 40, 80, 120, 160]).forEach((v) => { const y = ys(v); ctx.beginPath(); ctx.moveTo(px0, y); ctx.lineTo(px0 + pw, y); ctx.stroke(); T(px0 - 8, y + 4, String(v), 13, '#64748b', 'right', 700); });
    T(CH.x + 14, py0 - 8, 'μm', 13, '#64748b', 'left', 800);
    const n = 4, sp = pw / n;
    SKEYS.forEach((k, i) => {
      const r = S.ms.rec[k], x = px0 + sp * i + sp / 2, bw = Math.min(70, sp * 0.5);
      if (r) {
        const top = ys(r.L), base = py0 + ph;
        const col = k === 'coli' ? '#16a34a' : '#6366f1';
        D.roundRect(x - bw / 2, top, bw, Math.max(0, base - top), 6); ctx.fillStyle = col; ctx.fill();
        T(x, top - 8, r.L + ' μm', 14, '#1f2d44', 'center', 800);
      } else { ctx.setLineDash([5, 5]); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; D.roundRect(x - bw / 2, ys(c.log ? 4 : 30), bw, ys(c.log ? vmin : 0) - ys(c.log ? 4 : 30), 6); ctx.stroke(); ctx.setLineDash([]); T(x, py0 + ph / 2, '아직 안 쟀어요', 13, '#94a3b8', 'center', 800); }
      T(x, py0 + ph + 22, SPEC[k].nm, 13.5, '#334155', 'center', 800);
      T(x, py0 + ph + 42, k === 'coli' ? '(원핵)' : '(진핵)', 13, k === 'coli' ? '#15803d' : '#4338ca', 'center', 800);
    });
    textBlock(CH.x + 18, CH.y + CH.h - 36, CH.w - 36, '막대는 눈금에 맞춰 그렸어요. 로그 눈금으로 바꾸면 크기가 크게 다른 세포도 한눈에 비교돼요.', 13.5, '#64748b', 19, 700);
  }


  /* =========================================================
     ② DNA와 핵 : 대장균과 효모의 DNA 위치 (같은 비율로 그린 모습 + 확대)
     ========================================================= */
  const OV = PHONE ? { x: 10, y: 10, w: 460, h: 252 } : { x: 14, y: 14, w: 772, h: 300 };
  const INS = PHONE ? { x: 10, y: 272, w: 460, h: 236 } : { x: 14, y: 324, w: 772, h: 222 };
  const OVS = PHONE ? 30 : 40;           // 개요 그림: 1 μm = OVS px
  const IS = PHONE ? 80 : 90, IR = PHONE ? 88 : 100;   // 확대 그림: 1 μm = IS px, 원 반지름
  const CO = { x: OV.x + (PHONE ? 90 : 130), y: OV.y + OV.h / 2 }, YE = { x: OV.x + (PHONE ? 330 : 520), y: OV.y + (PHONE ? OV.h / 2 - 4 : 146) };
  const IC1 = { x: INS.x + (PHONE ? 120 : 120), y: INS.y + (PHONE ? 100 : INS.h / 2) }, IC2 = { x: INS.x + (PHONE ? 350 : 500), y: INS.y + (PHONE ? 100 : INS.h / 2) };
  S.dn = { dapi: false, tag: { coli: false, yeast: false }, seen: false };
  const dnTagged = () => S.dn.tag.coli && S.dn.tag.yeast;
  /* 대장균 (중심 cx, cy / 1 μm = s px) */
  function drawColi(cx, cy, s, mode, big) {
    const L = 2 * s, W = 0.8 * s, dapi = mode === 'dapi';
    ctx.save(); ctx.translate(cx, cy);
    D.roundRect(-L / 2, -W / 2, L, W, W / 2); ctx.fillStyle = dapi ? '#0f172a' : '#cfeee0'; ctx.fill();
    ctx.strokeStyle = dapi ? '#334155' : '#1f7a62'; ctx.lineWidth = big ? 4 : 2; ctx.stroke();                 // 세포벽 + 세포막
    if (big) { D.roundRect(-L / 2 + 6, -W / 2 + 6, L - 12, W - 12, (W - 12) / 2); ctx.lineWidth = 2; ctx.strokeStyle = dapi ? '#1e293b' : '#3aa384'; ctx.stroke(); }
    const rr = OD.rng(5);
    if (!dapi || big) { ctx.fillStyle = dapi ? 'rgba(148,163,184,.35)' : '#2f6f5e'; for (let i = 0; i < (big ? 26 : 8); i++) { const x = (rr() - 0.5) * (L - W * 0.7), y = (rr() - 0.5) * (W - 10); if (Math.abs(x) < L * 0.2 && Math.abs(y) < W * 0.22) continue; ctx.beginPath(); ctx.arc(x, y, big ? 3 : 1.2, 0, TAU); ctx.fill(); } }
    // 핵양체: 고리 모양 DNA 가 엉킨 덩어리 (막이 없어요)
    const nl = L * 0.36, nw = W * 0.5;
    ctx.beginPath(); for (let i = 0; i <= 90; i++) { const a = i / 90 * TAU * 3, rad = 0.5 + 0.5 * Math.sin(a * 0.7 + 1), x = Math.cos(a) * nl * (0.35 + 0.5 * rad) * 0.9, y = Math.sin(a * 1.3) * nw * (0.3 + 0.5 * rad) * 0.9; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
    if (dapi) { ctx.shadowColor = '#60a5fa'; ctx.shadowBlur = big ? 22 : 12; ctx.strokeStyle = '#93c5fd'; ctx.lineWidth = big ? 4 : 3; } else { ctx.strokeStyle = 'rgba(124,58,237,.75)'; ctx.lineWidth = big ? 2.4 : 1.6; }
    ctx.stroke(); ctx.shadowBlur = 0;
    if (big) { ctx.strokeStyle = dapi ? '#93c5fd' : '#7c3aed'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(L * 0.3, -W * 0.14, W * 0.1, 0, TAU); ctx.stroke(); }   // 플라스미드
    ctx.restore();
  }
  /* 효모 (개요): 세포벽 + 핵 */
  function drawYeastOv(cx, cy, s, mode) {
    const dapi = mode === 'dapi';
    ctx.save(); ctx.translate(cx, cy);
    ctx.beginPath(); ctx.ellipse(0, 0, 4 * s, 3.25 * s, 0, 0, TAU); ctx.fillStyle = dapi ? '#0f172a' : '#fbe9b6'; ctx.fill(); ctx.strokeStyle = dapi ? '#334155' : '#b8892b'; ctx.lineWidth = 3; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(1.9 * s, 0.7 * s, 1.3 * s, 1.0 * s, 0, 0, TAU); ctx.fillStyle = dapi ? 'rgba(148,163,184,.1)' : 'rgba(160,200,230,.55)'; ctx.fill(); ctx.strokeStyle = dapi ? '#334155' : '#6aa7d6'; ctx.lineWidth = 2; ctx.stroke();   // 액포
    ctx.beginPath(); ctx.arc(-0.8 * s, -0.15 * s, 1.0 * s, 0, TAU);
    if (dapi) { ctx.fillStyle = 'rgba(59,130,246,.55)'; ctx.shadowColor = '#60a5fa'; ctx.shadowBlur = 20; ctx.fill(); ctx.shadowBlur = 0; ctx.strokeStyle = '#93c5fd'; ctx.lineWidth = 2; ctx.stroke(); }
    else { ctx.fillStyle = 'rgba(167,139,250,.55)'; ctx.fill(); ctx.strokeStyle = '#6d4fb3'; ctx.lineWidth = 2.4; ctx.stroke(); }
    ctx.restore();
  }
  /* 효모 핵 확대: 핵막 + 핵공 + 히스톤에 감긴 선형 DNA(염색체) */
  function drawYeastNuc(cx, cy, s, mode) {
    const dapi = mode === 'dapi', r = 0.95 * s;
    ctx.save(); ctx.translate(cx, cy);
    if (!dapi) OD.nucleus(ctx, 0, 0, r, { pores: 7, lw: 3, chromA: 0.25 }); else { ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fillStyle = 'rgba(30,58,138,.35)'; ctx.fill(); }
    const rr = OD.rng(31);
    for (let k = 0; k < 6; k++) {   // 선형 DNA: 양 끝이 있는 막대 모양 + 히스톤 구슬
      const a = k / 6 * TAU + 0.3, d = r * (0.18 + 0.4 * ((k % 3) / 2)), x0 = Math.cos(a) * d, y0 = Math.sin(a) * d, ang = rr() * TAU, len = r * 0.7;
      const xa = x0 - Math.cos(ang) * len / 2, ya = y0 - Math.sin(ang) * len / 2, xb = x0 + Math.cos(ang) * len / 2, yb = y0 + Math.sin(ang) * len / 2;
      if (Math.hypot(xa, ya) > r * 0.88 || Math.hypot(xb, yb) > r * 0.88) { continue; }
      ctx.lineCap = 'round'; ctx.strokeStyle = dapi ? '#93c5fd' : '#7c3aed'; ctx.lineWidth = dapi ? 4 : 3; if (dapi) { ctx.shadowColor = '#60a5fa'; ctx.shadowBlur = 12; }
      ctx.beginPath(); ctx.moveTo(xa, ya); ctx.lineTo(xb, yb); ctx.stroke(); ctx.shadowBlur = 0;
      if (!dapi) for (let j = 0; j < 5; j++) { const u = (j + 0.5) / 5; ctx.fillStyle = '#f59e0b'; ctx.beginPath(); ctx.arc(xa + (xb - xa) * u, ya + (yb - ya) * u, 3.4, 0, TAU); ctx.fill(); }
    }
    ctx.restore();
  }
  function dnaDraw(dt, t) {
    const d = S.dn, mode = d.dapi ? 'dapi' : 'bf';
    const bg = d.dapi ? '#0b1020' : '#f6f3ea';
    D.shadow(() => { D.roundRect(OV.x, OV.y, OV.w, OV.h, 16); ctx.fillStyle = bg; ctx.fill(); }, { blur: 8, y: 2 });
    D.shadow(() => { D.roundRect(INS.x, INS.y, INS.w, INS.h, 16); ctx.fillStyle = bg; ctx.fill(); }, { blur: 8, y: 2 });
    const tc = d.dapi ? '#cbd5e1' : '#334155';
    T(OV.x + 16, OV.y + 26, '같은 비율로 그린 두 세포', 14.5, tc, 'left', 800);
    drawColi(CO.x, CO.y, OVS, mode, false); drawYeastOv(YE.x, YE.y, OVS, mode);
    T(CO.x, CO.y + OVS * 0.8 + 22, '대장균 (원핵생물)', 14, tc, 'center', 800); T(YE.x, YE.y + 3.25 * OVS + 18, '효모 (진핵생물)', 14, tc, 'center', 800);
    // 축척 막대 1 μm
    const bx = OV.x + 16, by = OV.y + OV.h - 26; ctx.fillStyle = d.dapi ? '#e2e8f0' : '#111'; ctx.fillRect(bx, by, OVS, 4); ctx.fillRect(bx, by - 5, 2, 14); ctx.fillRect(bx + OVS - 2, by - 5, 2, 14); T(bx + OVS + 8, by + 5, '1 μm', 13, tc, 'left', 800);
    // 확대
    T(PHONE ? INS.x + 16 : INS.x + INS.w / 2 - 6, PHONE ? INS.y + INS.h - 10 : INS.y + 26, '🔍 확대 (1 μm = ' + IS + ' px)', 14, tc, PHONE ? 'left' : 'center', 800);
    [[IC1, 0], [IC2, 1]].forEach(([c, i]) => {
      ctx.save(); ctx.beginPath(); ctx.arc(c.x, c.y, IR, 0, TAU); ctx.clip(); ctx.fillStyle = d.dapi ? '#050816' : '#fffdf7'; ctx.fillRect(c.x - IR, c.y - IR, IR * 2, IR * 2);
      if (!i) drawColi(c.x, c.y, IS, mode, true); else drawYeastNuc(c.x, c.y, IS, mode);
      ctx.restore(); ctx.strokeStyle = d.dapi ? '#475569' : '#64748b'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(c.x, c.y, IR, 0, TAU); ctx.stroke();
      ctx.fillStyle = d.dapi ? '#e2e8f0' : '#111'; ctx.fillRect(c.x - 0.25 * IS, c.y + IR - 16, 0.5 * IS, 3.5); T(c.x, c.y + IR - 22, '0.5 μm', 13, d.dapi ? '#e2e8f0' : '#111', 'center', 800, { stroke: d.dapi ? 'rgba(5,8,22,.8)' : 'rgba(255,253,247,.8)', strokeWidth: 3 });
    });
    const tx1 = PHONE ? IC1.x : IC1.x + IR + 12, ty1 = PHONE ? IC1.y + IR + 14 : IC1.y - 48, tx2 = PHONE ? IC2.x : IC2.x + IR + 12, ty2 = PHONE ? IC2.y + IR + 14 : IC2.y - 48, tw = PHONE ? 220 : 130;
    const t1 = d.tag.coli ? '핵양체: 고리 모양 DNA, 핵막 없음' : '대장균의 DNA는 어디에 있을까?', t2 = d.tag.yeast ? '핵: 선형 DNA + 히스톤, 핵막으로 싸임' : '효모의 DNA는 어디에 있을까?';
    if (PHONE) { T(IC1.x, ty1 + 4, d.tag.coli ? '핵양체 · 핵막 없음' : '대장균의 DNA는?', 13.5, d.tag.coli ? '#15803d' : tc, 'center', 800); T(IC2.x, ty2 + 4, d.tag.yeast ? '핵 · 핵막으로 싸임' : '효모의 DNA는?', 13.5, d.tag.yeast ? '#15803d' : tc, 'center', 800); }
    else { textBlock(tx1, ty1, tw, t1, 14, d.tag.coli ? '#15803d' : tc, 20, 800); textBlock(tx2, ty2, tw, t2, 14, d.tag.yeast ? '#15803d' : tc, 20, 800); }
    if (d.tag.coli) { D.label(CO.x, CO.y - OVS * 0.8 - 12, '핵양체', { bg: '#16a34a', color: '#fff', size: 13 }); }
    if (d.tag.yeast) { D.label(YE.x - 0.8 * OVS, YE.y - 1.35 * OVS - 6, '핵', { bg: '#16a34a', color: '#fff', size: 13 }); }
    if (!d.dapi) D.label(OV.x + OV.w - 12, OV.y + 22, '일반 현미경: DNA를 구별하기 어려워요', { bg: 'rgba(100,116,139,.9)', color: '#fff', size: 13, align: 'right' });
    else D.label(OV.x + OV.w - 12, OV.y + 22, 'DAPI: DNA가 파랗게 빛나요', { bg: '#2563eb', color: '#fff', size: 13, align: 'right' });
  }
  const dnaHit = (p) => {
    if (Math.abs(p.x - CO.x) < 1.1 * OVS && Math.abs(p.y - CO.y) < 0.55 * OVS + 6 && inRect(p.x, p.y, OV)) return 'coli';
    if (Math.hypot(p.x - (YE.x - 0.8 * OVS), p.y - (YE.y - 0.15 * OVS)) < 1.0 * OVS + 8) return 'yeast';
    if (Math.hypot(p.x - IC1.x, p.y - IC1.y) < IR && Math.abs(p.y - IC1.y) < 0.4 * IS && Math.abs(p.x - IC1.x) < 0.9 * IS) return 'coli';
    if (Math.hypot(p.x - IC2.x, p.y - IC2.y) < 0.95 * IS) return 'yeast';
    return null;
  };
  const dnaPT = {
    down(p) {
      if (!inRect(p.x, p.y, OV) && !inRect(p.x, p.y, INS)) return false;
      const h = dnaHit(p);
      if (!S.dn.dapi) { showHint('일반 현미경으로는 DNA를 구별하기 어려워요. DAPI 형광 염색으로 바꿔 보세요.', 4200); return true; }
      if (h) { if (!S.dn.tag[h]) { S.dn.tag[h] = true; Sound.success(); parts.burst(p.x, p.y, { count: 12, colors: ['#60a5fa', '#fff'], size: 3 }); hideHint(); updateCtl(); } }
      else { Sound.fail(); showHint('파랗게 빛나는 곳이 DNA예요. 그곳을 눌러요.', 3800); }
      return true;
    },
    hover(p) { return S.dn.dapi && dnaHit(p) ? 'pointer' : 'default'; },
  };
  const DNA_ANS = { dm: ['ring', 'lin'], nm: ['no', 'yes'], hs: ['no', 'yes'] };
  const dnaSel = (side, k) => ($('#d' + side + '_' + k) || {}).value || '';
  const dnaAll = () => ['dm', 'nm', 'hs'].every((k) => dnaSel('p', k) === DNA_ANS[k][0] && dnaSel('e', k) === DNA_ANS[k][1]);
  const dnaWrongRows = () => ['dm', 'nm', 'hs'].filter((k) => dnaSel('p', k) !== DNA_ANS[k][0] || dnaSel('e', k) !== DNA_ANS[k][1]);

  /* =========================================================
     ③-a 막성 소기관 찾기
     ========================================================= */
  const PO = PHONE ? { x: 10, y: 10, w: 460, h: 300 } : { x: 14, y: 14, w: 380, h: 532 };
  const EO = PHONE ? { x: 10, y: 320, w: 460, h: 310 } : { x: 406, y: 14, w: 380, h: 532 };
  S.og = { eFound: {}, pTapped: {}, msg: '', msgT: 0 };
  const ORGN = { nuc: '핵 (이중막)', mit: '미토콘드리아 (이중막)', rer: '소포체 (단일막)', gol: '골지체 (단일막)', lys: '리소좀 (단일막)', vac: '액포 (단일막)' };
  const PRO_MSG = { fold: '세포막이 안으로 접힌 막이에요. 막으로 싸인 소기관이 아니에요!', nucleoid: '핵양체: DNA가 모여 있지만 막으로 싸여 있지 않아요.', ribo: '리보솜은 막이 없는 알갱이예요. (원핵 · 진핵 모두 있어요)', plasmid: '플라스미드: 작은 고리 모양 DNA예요. 막이 없어요.', wall: '세포벽과 세포막이에요. 소기관이 아니에요.' };
  const orgGeo = (() => {
    const pc = { x: PO.x + PO.w / 2, y: PO.y + (PHONE ? 140 : 230) }, pl = PHONE ? 320 : 300, pw = PHONE ? 130 : 120;
    const ec = { x: EO.x + EO.w / 2, y: EO.y + (PHONE ? 150 : 250) }, er = PHONE ? 118 : 150;
    return { pc, pl, pw, ec, er };
  })();
  function orgDrawPro() {
    const { pc, pl, pw } = orgGeo, x = pc.x, y = pc.y;
    ctx.save(); ctx.translate(x, y);
    D.roundRect(-pl / 2, -pw / 2, pl, pw, pw / 2); ctx.fillStyle = '#d8f3e6'; ctx.fill(); ctx.strokeStyle = '#1f7a62'; ctx.lineWidth = 6; ctx.stroke();
    D.roundRect(-pl / 2 + 9, -pw / 2 + 9, pl - 18, pw - 18, (pw - 18) / 2); ctx.strokeStyle = '#3aa384'; ctx.lineWidth = 3; ctx.stroke();
    // 세포막이 안으로 접힌 부분
    ctx.strokeStyle = '#3aa384'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(pl * 0.22, -pw / 2 + 9); ctx.bezierCurveTo(pl * 0.2, -pw * 0.12, pl * 0.3, -pw * 0.05, pl * 0.26, pw * 0.1); ctx.bezierCurveTo(pl * 0.23, pw * 0.2, pl * 0.3, pw * 0.2, pl * 0.31, pw * 0.1); ctx.stroke();
    // 핵양체
    ctx.beginPath(); for (let i = 0; i <= 90; i++) { const a = i / 90 * TAU * 3, rad = 0.5 + 0.5 * Math.sin(a * 0.7 + 1), xx = Math.cos(a) * pl * 0.13 * (0.4 + rad * 0.9), yy = Math.sin(a * 1.3) * pw * 0.25 * (0.4 + rad * 0.9); if (i) ctx.lineTo(xx - pl * 0.1, yy); else ctx.moveTo(xx - pl * 0.1, yy); }
    ctx.strokeStyle = 'rgba(124,58,237,.8)'; ctx.lineWidth = 2.6; ctx.stroke();
    ctx.strokeStyle = '#7c3aed'; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.arc(-pl * 0.34, pw * 0.18, pw * 0.07, 0, TAU); ctx.stroke();   // 플라스미드
    const rr = OD.rng(9); for (let i = 0; i < 26; i++) { const xx = (rr() - 0.5) * (pl - pw * 0.7), yy = (rr() - 0.5) * (pw - 26); if (Math.abs(xx + pl * 0.1) < pl * 0.17 && Math.abs(yy) < pw * 0.28) continue; if (Math.abs(xx - pl * 0.27) < 12) continue; ctx.fillStyle = '#2f6f5e'; ctx.beginPath(); ctx.arc(xx, yy, 3.6, 0, TAU); ctx.fill(); }
    ctx.restore();
  }
  function orgDrawEuk() {
    const { ec, er } = orgGeo, x = ec.x, y = ec.y;
    ctx.save();
    ctx.beginPath(); ctx.arc(x, y, er, 0, TAU); ctx.fillStyle = '#fff4de'; ctx.fill(); ctx.strokeStyle = '#e8a838'; ctx.lineWidth = 5; ctx.stroke();
    const s = er / 150;
    OD.nucleus(ctx, x - 20 * s, y - 10 * s, 52 * s, { pores: 8, lw: 2.4 });
    OD.mito(ctx, x + 70 * s, y - 62 * s, 62 * s, 28 * s, -0.5, { cs: 7 * s }); OD.mito(ctx, x - 78 * s, y + 70 * s, 62 * s, 28 * s, 0.4, { cs: 7 * s });
    OD.rer(ctx, x - 20 * s, y - 10 * s, 70 * s, 0.15, 1.9, 2, 13 * s, { th: 8 * s, lw: 1.6, rr: 2.3 * s });
    OD.golgi(ctx, x + 70 * s, y + 38 * s, 62 * s, 4, 13 * s, 0, { th: 8 * s, lw: 1.6, ves: 2 });
    OD.lyso(ctx, x + 22 * s, y + 98 * s, 15 * s);
    OD.vacuole(ctx, x - 112 * s, y - 14 * s, 36 * s, 40 * s, 14 * s, { lw: 1.8 });
    ctx.restore();
  }
  function orgHitEuk(p) {
    const { ec, er } = orgGeo, s = er / 150, x = ec.x, y = ec.y;
    if (Math.hypot(p.x - (x - 20 * s), p.y - (y - 10 * s)) < 54 * s) return 'nuc';
    if (Math.hypot(p.x - (x + 70 * s), p.y - (y - 62 * s)) < 36 * s || Math.hypot(p.x - (x - 78 * s), p.y - (y + 70 * s)) < 36 * s) return 'mit';
    if (Math.hypot(p.x - (x + 22 * s), p.y - (y + 98 * s)) < 20 * s) return 'lys';
    if (Math.abs(p.x - (x + 70 * s)) < 40 * s && Math.abs(p.y - (y + 38 * s)) < 30 * s) return 'gol';
    { const d = Math.hypot(p.x - (x - 20 * s), p.y - (y - 10 * s)), a = Math.atan2(p.y - (y - 10 * s), p.x - (x - 20 * s)); if (d > 64 * s && d < 100 * s && a > 0.1 && a < 1.95) return 'rer'; }
    if (p.x > x - 118 * s && p.x < x - 70 * s && p.y > y - 20 * s && p.y < y + 32 * s) return 'vac';
    return null;
  }
  function orgHitPro(p) {
    const { pc, pl, pw } = orgGeo, dx = p.x - pc.x, dy = p.y - pc.y;
    if (Math.abs(dx - pl * 0.26) < 22 && Math.abs(dy) < pw * 0.42) return 'fold';
    if (Math.abs(dx + pl * 0.1) < pl * 0.2 && Math.abs(dy) < pw * 0.3) return 'nucleoid';
    if (Math.hypot(dx + pl * 0.34, dy - pw * 0.18) < pw * 0.14) return 'plasmid';
    if (Math.abs(dx) < pl / 2 + 8 && Math.abs(dy) < pw / 2 + 8) { if (Math.abs(dx) > pl / 2 - 20 || Math.abs(dy) > pw / 2 - 20) return 'wall'; return 'ribo'; }
    return null;
  }
  const orgFound = () => Object.keys(S.og.eFound).length;
  function orgDraw(dt, t) {
    const g = S.og;
    [PO, EO].forEach((r, i) => { panel(r.x, r.y, r.w, r.h, 16, '#ffffff'); });
    T(PO.x + 16, PO.y + 26, '원핵세포 (세균)', 15, '#15803d', 'left', 800); T(EO.x + 16, EO.y + 26, '진핵세포', 15, '#4338ca', 'left', 800);
    orgDrawPro(); orgDrawEuk();
    // 축척 막대: 원핵 0.5 μm, 진핵 2 μm
    const ps = orgGeo.pl / 2.0, es = orgGeo.er * 2 / 10;   // px per μm (세균 길이 2 μm, 진핵 지름 10 μm)
    const pb = { x: PO.x + 16, y: PO.y + PO.h - 54 }, eb = { x: EO.x + 16, y: EO.y + EO.h - 54 };
    ctx.fillStyle = '#111'; ctx.fillRect(pb.x, pb.y, ps * 0.5, 4); ctx.fillRect(pb.x, pb.y - 5, 2, 14); ctx.fillRect(pb.x + ps * 0.5 - 2, pb.y - 5, 2, 14); T(pb.x + ps * 0.5 + 8, pb.y + 5, '0.5 μm', 13, '#111', 'left', 800);
    ctx.fillRect(eb.x, eb.y, es * 2, 4); ctx.fillRect(eb.x, eb.y - 5, 2, 14); ctx.fillRect(eb.x + es * 2 - 2, eb.y - 5, 2, 14); T(eb.x + es * 2 + 8, eb.y + 5, '2 μm', 13, '#111', 'left', 800);
    T(PO.x + 16, PO.y + PO.h - 22, '※ 두 그림의 확대 비율은 달라요', 13, '#64748b', 'left', 700);
    T(EO.x + 16, EO.y + EO.h - 22, '막으로 싸인 소기관 ' + orgFound() + ' / 6종 찾음', 14, orgFound() === 6 ? '#15803d' : '#475569', 'left', 800);
    // 찾은 소기관 이름표
    const { ec, er } = orgGeo, s = er / 150;
    const pos = { nuc: [-20, -62], mit: [70, -92], rer: [20, 52], gol: [70, 12], lys: [22, 76], vac: [-112, -34] };
    Object.keys(g.eFound).forEach((k) => { const q = pos[k]; D.label(ec.x + q[0] * s, ec.y + q[1] * s, ORGN[k], { bg: '#fde047', color: '#3b2f00', size: 12.5 }); });
    if (g.msg && g.msgT > 0) { g.msgT -= dt; const r = g.msgR; panel(r.x + 10, r.y + r.h - 130, r.w - 20, 56, 12, '#fff8dc'); textBlock(r.x + 20, r.y + r.h - 108, r.w - 40, g.msg, 13.5, '#78350f', 18.5, 800); }
  }
  const orgPT = {
    down(p) {
      const g = S.og;
      if (inRect(p.x, p.y, EO)) {
        const h = orgHitEuk(p);
        if (h) { if (!g.eFound[h]) { g.eFound[h] = true; Sound.success(); parts.burst(p.x, p.y, { count: 10, colors: ['#fde047', '#22c55e'], size: 3 }); } else Sound.click(); g.msg = ORGN[h] + ' 소기관을 찾았어요!'; g.msgR = EO; g.msgT = 2.4; updateCtl(); }
        else { g.msg = '소기관이 아닌 곳이에요. 막으로 싸인 주머니나 타원을 찾아봐요.'; g.msgR = EO; g.msgT = 2.4; Sound.tick(); }
        return true;
      }
      if (inRect(p.x, p.y, PO)) {
        const h = orgHitPro(p);
        if (h) { g.pTapped[h] = true; g.msg = PRO_MSG[h]; g.msgR = PO; g.msgT = 3.4; Sound.click(); }
        else { g.msg = '이 세포의 안에서 막으로 싸인 소기관을 찾아보세요.'; g.msgR = PO; g.msgT = 2.4; }
        updateCtl(); return true;
      }
      return false;
    },
    hover(p) { return inRect(p.x, p.y, EO) || inRect(p.x, p.y, PO) ? 'pointer' : 'default'; },
  };
  const orgDone = () => orgFound() === 6 && Object.keys(S.og.pTapped).length >= 2;
  function orgReset() { S.og = { eFound: {}, pTapped: {}, msg: '', msgT: 0 }; updateCtl(); }

  /* =========================================================
     ③-b 리보솜 침강과 항생제
     ========================================================= */
  const RB = PHONE ? { x: 10, y: 10, w: 460, h: 330 } : { x: 14, y: 14, w: 772, h: 330 };
  const AB = PHONE ? { x: 10, y: 350, w: 460, h: 280 } : { x: 14, y: 356, w: 772, h: 190 };
  const TUBE_L = PHONE ? 170 : 200, TUBE_W = 50;
  const TB = [{ x: RB.x + (PHONE ? 100 : 150), s: 70, nm: '세균 리보솜', sub: '70S' }, { x: RB.x + (PHONE ? 270 : 330), s: 80, nm: '사람 세포질 리보솜', sub: '80S' }];
  S.rb = { run: false, prog: 0, ran: false, tubes: [[], []], abx: false, bind: 0, abxT: 0, abxSeen: false, cnt: [0, 0], drugs: [], accB: 0, accH: 0, ph: 0 };
  function rbMix() { const rr = OD.rng(12); S.rb.tubes = [0, 1].map((k) => { const a = []; for (let i = 0; i < 26; i++) a.push({ x: (rr() - 0.5) * (TUBE_W - 16), y0: 4 + rr() * 22, ph: rr() * TAU }); return a; }); S.rb.run = false; S.rb.prog = 0; S.rb.ran = false; }
  rbMix();
  const RBT = RM ? 0.8 : 4.5, RBD = TUBE_L * 0.78;   // 80S 가 이동하는 거리 (px)
  function rbDist(k, y0) { return y0 + RBD * (TB[k].s / 80) * S.rb.prog; }
  function rbMean(k) { const a = S.rb.tubes[k]; return a.reduce((s, p) => s + (rbDist(k, p.y0) - p.y0), 0) / a.length; }
  function rbRun() { const r = S.rb; if (r.run) return; rbMix(); r.run = true; Sound.click(); updateCtl(); }
  function rbReset() { rbMix(); S.rb.abx = false; S.rb.bind = 0; S.rb.abxT = 0; S.rb.abxSeen = false; S.rb.cnt = [0, 0]; S.rb.drugs = []; updateCtl(); }
  function rbIcon(x, y, s, big, small, col1, col2, blocked) {
    ctx.save(); ctx.translate(x, y);
    const c1 = blocked ? '#9ca3af' : col1, c2 = blocked ? '#cbd5e1' : col2;
    ctx.fillStyle = c1; ctx.beginPath(); ctx.ellipse(0, 0, s * big, s * big * 0.8, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.2)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = c2; ctx.beginPath(); ctx.ellipse(s * 0.05, -s * big * 0.86, s * small, s * small * 0.62, 0, 0, TAU); ctx.fill(); ctx.stroke();
    if (blocked) { ctx.strokeStyle = '#e2464b'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-s * 0.7, -s * 0.7); ctx.lineTo(s * 0.7, s * 0.7); ctx.moveTo(s * 0.7, -s * 0.7); ctx.lineTo(-s * 0.7, s * 0.7); ctx.stroke(); }
    ctx.restore();
  }
  function riboUpdate(dt) {
    const r = S.rb;
    if (r.run) { r.prog = Math.min(1, r.prog + dt / RBT); if (r.prog >= 1) { r.run = false; r.ran = true; Sound.success(); updateCtl(); } }
    if (r.abx) { r.abxT += dt; r.bind = approach(r.bind, 1, dt, 1.4); if (r.abxT > 3 && !r.abxSeen) { r.abxSeen = true; updateCtl(); } } else r.bind = approach(r.bind, 0, dt, 3);
    // 단백질 합성: 세균은 항생제로 멈춰요
    const rateB = 0.9 * (1 - clamp(r.bind * 1.25, 0, 1)), rateH = 0.9;
    r.accB += dt * rateB; r.accH += dt * rateH;
    while (r.accB >= 1) { r.accB -= 1; r.cnt[0]++; const q = abPos(0); parts.emit({ x: q.x, y: q.y - 20, vx: (Math.random() - 0.5) * 30, vy: -40, life: 1.3, size: 4, color: PROT2, gravity: 0 }); }
    while (r.accH >= 1) { r.accH -= 1; r.cnt[1]++; const q = abPos(1); parts.emit({ x: q.x, y: q.y - 24, vx: (Math.random() - 0.5) * 30, vy: -40, life: 1.3, size: 4, color: PROT2, gravity: 0 }); }
    if (r.abx && !RM) { r.drugs.forEach((d) => { d.x = approach(d.x, d.tx, dt, 2); d.y = approach(d.y, d.ty, dt, 2); }); }
  }
  const PROT2 = '#d946ef';
  const abPos = (k) => (k === 0 ? { x: AB.x + (PHONE ? 120 : 230), y: AB.y + AB.h / 2 + (PHONE ? 10 : 8) } : { x: AB.x + (PHONE ? 350 : 560), y: AB.y + AB.h / 2 + (PHONE ? 10 : 8) });
  function riboDraw(dt, t) {
    const r = S.rb; riboUpdate(dt);
    panel(RB.x, RB.y, RB.w, RB.h, 16, '#ffffff'); panel(AB.x, AB.y, AB.w, AB.h, 16, '#ffffff');
    T(RB.x + 16, RB.y + 26, '같은 시간 · 같은 속도로 원심분리하면?', 15, '#334155', 'left', 800);
    TB.forEach((tb, k) => {
      const top = RB.y + (PHONE ? 100 : 96), x = tb.x;
      rbIcon(x - 36, RB.y + 62, k ? 20 : 17, 1, 0.62, k ? '#6366f1' : '#16a34a', k ? '#a5b4fc' : '#86efac');
      T(x - 8, RB.y + 56, tb.sub, 18, k ? '#4338ca' : '#15803d', 'left', 800); T(x - 8, RB.y + 74, tb.nm, 13, '#475569', 'left', 800);
      ctx.save(); D.roundRect(x - TUBE_W / 2, top, TUBE_W, TUBE_L, TUBE_W / 2); ctx.fillStyle = 'rgba(220,235,248,.7)'; ctx.fill(); ctx.clip();
      r.tubes[k].forEach((p) => { const y = rbDist(k, p.y0); ctx.fillStyle = k ? '#6366f1' : '#16a34a'; ctx.beginPath(); ctx.arc(x + p.x + (r.run && !RM ? Math.sin(t * 4 + p.ph) * 0.8 : 0), top + y, 3.4, 0, TAU); ctx.fill(); });
      ctx.restore(); ctx.strokeStyle = '#7aa0bd'; ctx.lineWidth = 3; D.roundRect(x - TUBE_W / 2, top, TUBE_W, TUBE_L, TUBE_W / 2); ctx.stroke();
      if (r.ran) { const m = rbMean(k), yy = top + 14 + m; ctx.strokeStyle = k ? '#4338ca' : '#15803d'; ctx.setLineDash([5, 4]); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + TUBE_W / 2 + 4, yy); ctx.lineTo(x + TUBE_W / 2 + 40, yy); ctx.stroke(); ctx.setLineDash([]); T(x + TUBE_W / 2 + 44, yy + 5, '약 ' + Math.round(m) + ' px', 13, k ? '#4338ca' : '#15803d', 'left', 800); }
    });
    D.arrow(RB.x + 28, RB.y + (PHONE ? 130 : 130), RB.x + 28, RB.y + (PHONE ? 250 : 280), { color: '#e2464b', width: 3, head: 11 }); T(RB.x + 24, RB.y + (PHONE ? 122 : 122), '원심력', 13, '#e2464b', 'left', 800);
    const ix = RB.x + (PHONE ? 20 : 480), iy = RB.y + (PHONE ? 296 : 70), iw = PHONE ? RB.w - 40 : 270;
    if (r.ran) {
      const m70 = rbMean(0), m80 = rbMean(1);
      textBlock(ix, iy, iw, '70S는 80S의 약 ' + Math.round(m70 / m80 * 100) + ' %만큼 내려갔어요. S 값이 클수록 더 빨리 가라앉아요.', PHONE ? 13.5 : 14.5, '#334155', 20, 800);
    } else textBlock(ix, iy, iw, '▶ 같은 시간 원심분리를 눌러 두 리보솜이 가라앉는 빠르기를 비교해요.', PHONE ? 13.5 : 14.5, '#64748b', 20, 800);
    if (!PHONE) textBlock(ix, iy + 120, iw, 'S(스베드베리)는 원심분리할 때 가라앉는 빠르기의 단위예요. 30S + 50S = 70S, 40S + 60S = 80S 처럼 S 값은 단순히 더해지지 않아요.', 13.5, '#64748b', 19, 700);
    // ---- 항생제 ----
    T(AB.x + 16, AB.y + 26, PHONE ? '💊 항생제를 넣으면?' : '💊 항생제(세균 리보솜 억제)를 넣으면?', 15, '#334155', 'left', 800);
    [0, 1].forEach((k) => {
      const c = abPos(k), blocked = k === 0 && r.bind > 0.6;
      ctx.save(); ctx.translate(c.x, c.y);
      if (k === 0) { D.roundRect(-70, -34, 140, 68, 34); ctx.fillStyle = '#d8f3e6'; ctx.fill(); ctx.strokeStyle = '#1f7a62'; ctx.lineWidth = 4; ctx.stroke(); }
      else { ctx.beginPath(); ctx.arc(0, 0, 46, 0, TAU); ctx.fillStyle = '#fff4de'; ctx.fill(); ctx.strokeStyle = '#e8a838'; ctx.lineWidth = 4; ctx.stroke(); OD.nucleus(ctx, -4, -4, 15, { pores: 6, lw: 1.6 }); }
      ctx.restore();
      [[-34, 0], [-12, 12], [16, 6], [38, -8]].forEach((q, i) => { if (k === 1 && (i === 0 || (i === 1))) { q = [q[0] + 8, q[1] + 20]; } if (k === 1 && i === 3) q = [24, -26]; if (k === 1 && i === 2) q = [20, 22]; rbIcon(c.x + q[0] * (k ? 0.95 : 1), c.y + q[1], 8.5, 1, 0.62, k ? '#6366f1' : '#16a34a', k ? '#a5b4fc' : '#86efac', blocked); });
      T(c.x, c.y + (k ? 70 : 56), k ? '사람 세포 (80S)' : '세균 (70S)', 13.5, '#334155', 'center', 800);
      T(c.x, c.y + (k ? 88 : 74), '만든 단백질 ' + r.cnt[k] + '개', 13.5, k ? '#4338ca' : '#15803d', 'center', 800);
    });
    if (r.abx) {
      for (let i = 0; i < 4; i++) { const u = clamp(r.abxT / 2.2 - i * 0.12, 0, 1); const c0 = abPos(0), dx = AB.x + 40 + i * 24, dy = AB.y + 50; const x = dx + (c0.x - 34 + i * 18 - dx) * u, y = dy + (c0.y - 6 + (i % 2) * 10 - dy) * u; ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.arc(x, y, 5, 0, TAU); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke(); }
      if (PHONE) T(AB.x + 16, AB.y + 48, '항생제는 세균의 70S 리보솜에만 붙어요', 13.5, '#b91c1c', 'left', 800); else T(AB.x + AB.w - 16, AB.y + 26, '항생제는 세균의 70S 리보솜에만 붙어요', 13.5, '#b91c1c', 'right', 800);
    }
  }


  /* =========================================================
     ③-c 세포벽 분해 효소 시험
     ========================================================= */
  const WL = PHONE ? { x: 10, y: 10, w: 460, h: 350 } : { x: 14, y: 14, w: 772, h: 330 };
  const WI = PHONE ? { x: 10, y: 370, w: 460, h: 260 } : { x: 14, y: 356, w: 772, h: 190 };
  const WCELLS = [
    { k: 'bac', nm: '세균(대장균)', wall: '펩티도글리칸', col: '#f0a0b8', thick: 7, w: 112, h: 46, r: 23, fill: '#d8f3e6', line: '#1f7a62', enz: 'lyso' },
    { k: 'plant', nm: '식물 세포', wall: '셀룰로스', col: '#d9c08a', thick: 13, w: 120, h: 92, r: 8, fill: '#e8f6d8', line: '#3f9b3a', enz: 'cell' },
    { k: 'fungus', nm: '균류(효모)', wall: '키틴', col: '#c9a227', thick: 8, w: 104, h: 82, r: 40, fill: '#fbeec2', line: '#a0802a', enz: 'chit' },
    { k: 'human', nm: '사람 세포', wall: '벽 없음', col: null, thick: 0, w: 92, h: 92, r: 46, fill: '#fde3cf', line: '#d97706', enz: null },
  ];
  const ENZ = { lyso: '리소자임', cell: '셀룰레이스', chit: '키티네이스' };
  S.wl = { sel: 'lyso', tested: {}, st: WCELLS.map(() => ({ wall: 1, rnd: 0, msg: '' })), pulse: 0 };
  const wlCenter = (i) => (PHONE ? { x: WL.x + 115 + (i % 2) * 230, y: WL.y + 90 + Math.floor(i / 2) * 170 } : { x: WL.x + 96 + i * 193, y: WL.y + 150 });
  function wlReset() { S.wl.st = WCELLS.map(() => ({ wall: 1, rnd: 0, msg: '' })); S.wl.pulse = 0; updateCtl(); }
  function wlGo() {
    const w = S.wl; if (!w.sel) return;
    w.tested[w.sel] = true; w.pulse = 1; Sound.click();
    WCELLS.forEach((c, i) => {
      const st = w.st[i];
      if (c.enz === w.sel && st.wall > 0.5) { st.target = 0; st.msg = '벽이 분해됐어요'; st.hit = true; }
      else if (c.enz === w.sel) st.msg = '이미 벽이 없어요';
      else st.msg = c.k === 'human' ? '벽이 없어서 변화 없음' : '이 효소로는 안 분해돼요';
    });
    updateCtl();
  }
  function wallDraw(dt, t) {
    const w = S.wl; w.pulse = approach(w.pulse, 0, dt, 1.2);
    panel(WL.x, WL.y, WL.w, WL.h, 16, '#ffffff'); panel(WI.x, WI.y, WI.w, WI.h, 16, '#ffffff');
    T(WL.x + 16, WL.y + 26, '효소를 넣으면 어떤 세포의 벽이 분해될까요? (등장액 속)', 14.5, '#334155', 'left', 800);
    WCELLS.forEach((c, i) => {
      const st = w.st[i], cp = wlCenter(i);
      if (st.target === 0) { st.wall = RM ? 0 : approach(st.wall, 0, dt, 2.4); if (st.wall < 0.01) { st.wall = 0; } st.rnd = RM ? 1 : approach(st.rnd, 1, dt, 1.6); }
      const sc = 1 - st.rnd * 0.12, bw = lerp(c.w, Math.min(c.w, c.h) * 0.92, st.rnd) * sc, bh = lerp(c.h, Math.min(c.w, c.h) * 0.92, st.rnd) * sc, rad = lerp(c.r, Math.min(bw, bh) / 2, st.rnd);
      ctx.save(); ctx.translate(cp.x, cp.y);
      if (c.thick && st.wall > 0.01) { const th = c.thick * st.wall; D.roundRect(-bw / 2 - th, -bh / 2 - th, bw + th * 2, bh + th * 2, rad + th); ctx.fillStyle = c.col; ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 1.5; ctx.stroke(); }
      D.roundRect(-bw / 2, -bh / 2, bw, bh, rad); ctx.fillStyle = c.fill; ctx.fill(); ctx.strokeStyle = c.line; ctx.lineWidth = 2.6; ctx.stroke();
      if (c.k === 'bac') { ctx.strokeStyle = 'rgba(124,58,237,.7)'; ctx.lineWidth = 2; ctx.beginPath(); for (let a = 0; a < 12; a++) { const xx = Math.cos(a * 1.4) * bw * 0.18, yy = Math.sin(a * 1.9) * bh * 0.18; if (a) ctx.lineTo(xx, yy); else ctx.moveTo(xx, yy); } ctx.stroke(); }
      else { ctx.fillStyle = 'rgba(124,90,200,.55)'; ctx.beginPath(); ctx.arc(-bw * 0.12, -bh * 0.05, Math.min(bw, bh) * 0.17, 0, TAU); ctx.fill(); }
      if (c.k === 'plant') { ctx.fillStyle = '#5fbf4f'; [[0.3, -0.25], [0.28, 0.25], [-0.3, 0.28]].forEach((q) => { ctx.beginPath(); ctx.ellipse(bw * q[0], bh * q[1], 8, 5, 0, 0, TAU); ctx.fill(); }); }
      ctx.restore();
      T(cp.x, cp.y + (PHONE ? 60 : 82), c.nm, 14, '#26324a', 'center', 800);
      T(cp.x, cp.y + (PHONE ? 76 : 100), '벽: ' + c.wall, 13, c.col ? '#92400e' : '#64748b', 'center', 800);
      if (st.msg) T(cp.x, cp.y + (PHONE ? 94 : 120), st.msg, 13, st.hit ? '#15803d' : '#64748b', 'center', 800);
      if (st.hit && st.wall < 0.05 && st.rnd > 0.9) T(cp.x, cp.y - (PHONE ? 58 : 76), '둥근 모양', 13, '#15803d', 'center', 800);
    });
    // 안내
    const x = WI.x + 16; T(x, WI.y + 28, '효소와 표적', 15, '#334155', 'left', 800);
    [['lyso', '리소자임', '세균의 펩티도글리칸 벽'], ['cell', '셀룰레이스', '식물의 셀룰로스 벽'], ['chit', '키티네이스', '균류의 키틴 벽']].forEach(([k, nm, tg], i) => {
      const y = WI.y + 58 + i * 30, on = w.sel === k;
      T(x, y, (w.tested[k] ? '✅ ' : '⬜ ') + nm + ' → ' + tg, 14.5, on ? '#a21caf' : '#334155', 'left', 800);
    });
    textBlock(x, WI.y + (PHONE ? 154 : 150), WI.w - 32, '세포벽의 성분이 달라서 효소마다 분해하는 벽이 달라요. 사람 세포(동물 세포)는 세포벽이 없어요. (세포 그림의 크기는 실제 비율이 아니에요.)', 13.5, '#64748b', 19, 700);
  }
  const wlOk = () => Object.keys(S.wl.tested).length === 3;

  /* =========================================================
     ③-d 비교표 (선택 상자 값을 캔버스에 보여 줘요)
     ========================================================= */
  const CMP = { dn: ['ring', 'lin'], mb: ['none', 'has'], rb: ['70', '80'], cw: ['pep', 'cel'] };
  const CMPT = { dn: { ring: '고리 모양 DNA (핵양체)', lin: '선형 DNA, 핵막 속 · 히스톤과 함께' }, mb: { none: '막성 소기관 없음', has: '막성 소기관 있음' }, rb: { 70: '70S', 80: '80S (세포질)' }, cw: { pep: '펩티도글리칸 (세균)', cel: '셀룰로스(식물) · 키틴(균류) · 동물은 없음' } };
  const cmpSel = (side, k) => ($('#c' + side + '_' + k) || {}).value || '';
  const cmpAll = () => ['dn', 'mb', 'rb', 'cw'].every((k) => cmpSel('p', k) === CMP[k][0] && cmpSel('e', k) === CMP[k][1]);
  const evOrgan = () => orgDone(), evRibo = () => S.rb.ran && S.rb.abxSeen, evWall = () => wlOk();
  const evCount = () => [evOrgan(), evRibo(), evWall()].filter(Boolean).length;
  function tableDraw(dt, t) {
    const R = PHONE ? { x: 10, y: 10, w: 460, h: 470 } : { x: 14, y: 14, w: 772, h: 380 };
    panel(R.x, R.y, R.w, R.h, 16, '#ffffff');
    const c0 = R.x + 16, cw0 = PHONE ? 92 : 130, cw1 = (R.w - 32 - cw0) / 2, rh = PHONE ? 88 : 66, y0 = R.y + 52;
    T(c0 + cw0 + cw1 / 2, R.y + 34, '원핵세포', 16, '#15803d', 'center', 800); T(c0 + cw0 + cw1 * 1.5, R.y + 34, '진핵세포', 16, '#4338ca', 'center', 800);
    [['dn', 'DNA'], ['mb', '막 구조'], ['rb', '리보솜'], ['cw', '세포벽']].forEach(([k, nm], i) => {
      const y = y0 + i * (rh + 6);
      ctx.fillStyle = '#f1f5f9'; D.roundRect(c0, y, cw0 - 6, rh, 10); ctx.fill(); T(c0 + (cw0 - 6) / 2, y + rh / 2 + 5, nm, 15, '#334155', 'center', 800);
      [['p', 0], ['e', 1]].forEach(([side, j]) => {
        const v = cmpSel(side, k), ok = v && v === CMP[k][j], x = c0 + cw0 + j * cw1;
        D.roundRect(x, y, cw1 - 6, rh, 10); ctx.fillStyle = ok ? '#dcfce7' : v ? '#fef3c7' : '#f8fafc'; ctx.fill(); ctx.strokeStyle = ok ? '#16a34a' : v ? '#f59e0b' : '#cbd5e1'; ctx.lineWidth = 2; ctx.stroke();
        if (v) { const ls = wrap(CMPT[k][v], cw1 - 28, 14, 800).slice(0, 3); ls.forEach((l, q) => T(x + 12, y + rh / 2 + 5 - (ls.length - 1) * 9 + q * 18, l, 14, '#1f2d44', 'left', 800)); }
        else T(x + (cw1 - 6) / 2, y + rh / 2 + 5, '(오른쪽 표에서 고르기)', 13.5, '#94a3b8', 'center', 700);
      });
    });
    // 직접 해 본 활동
    const ey = PHONE ? R.y + R.h + 12 : R.y + R.h + 12, eh = PHONE ? 130 : 128;
    panel(R.x, ey, R.w, eh, 16, '#ffffff');
    T(R.x + 16, ey + 28, '표를 채우려면 직접 확인해 봐요', 15, '#334155', 'left', 800);
    [[evOrgan(), '🔎 막성 소기관 찾기: 진핵 6종, 원핵 0종'], [evRibo(), '🌀 리보솜 침강과 항생제 실험'], [evWall(), '🧪 효소 3가지로 세포벽 시험']].forEach(([ok, tx], i) => T(R.x + 16, ey + 58 + i * 26, (ok ? '✅ ' : '⬜ ') + tx, 14, ok ? '#15803d' : '#64748b', 'left', 800));
  }

  /* ---------- 벤 다이어그램 ---------- */
  const VNC = [
    { id: 'v1', label: '고리 모양 DNA', short: '고리 모양 DNA', ans: 'p' }, { id: 'v2', label: '핵막으로 싸인 핵', short: '핵막으로 싸인 핵', ans: 'e' }, { id: 'v3', label: '막으로 싸인 소기관', short: '막성 소기관', ans: 'e' },
    { id: 'v4', label: '70S 리보솜', short: '70S 리보솜', ans: 'p' }, { id: 'v5', label: '80S 리보솜 (세포질)', short: '80S 리보솜', ans: 'e' }, { id: 'v6', label: '세포막', short: '세포막', ans: 'c' },
    { id: 'v7', label: '세포질', short: '세포질', ans: 'c' }, { id: 'v8', label: '리보솜이 있다', short: '리보솜', ans: 'c' }, { id: 'v9', label: 'DNA(유전 물질)가 있다', short: 'DNA', ans: 'c' },
  ];
  const VB = PHONE ? { x: 10, y: 10, w: 460, h: 262 } : { x: 14, y: 14, w: 772, h: 250 };
  const venn = new Sorter({
    cards: [VNC[5], VNC[1], VNC[3], VNC[8], VNC[6], VNC[0], VNC[4], VNC[2], VNC[7]].map((c) => ({ id: c.id, label: c.label, short: c.short, col: '#64748b' })),
    boxes: [['p', '원핵세포만', '#15803d'], ['c', '공통점', '#7c3aed'], ['e', '진핵세포만', '#4338ca']].map((b, i) => { const gap = 8, bw = (VB.w - gap * 2) / 3; return { id: b[0], label: b[1], col: b[2], x: VB.x + i * (bw + gap), y: VB.y, w: bw, h: VB.h, cols: 1, hdr: 32 }; }),
    cw: PHONE ? 214 : 240, ch: PHONE ? 40 : 44, kh: PHONE ? 34 : 40,
    tray: (i) => (PHONE ? { x: 12 + (i % 2) * 234, y: 296 + Math.floor(i / 2) * 48 } : { x: 28 + (i % 3) * 252, y: 300 + Math.floor(i / 3) * 56 }),
    onChange() { updateCtl(); },
  });
  const vennWrong = () => venn.cards.filter((c) => c.zone && c.zone !== VNC.find((q) => q.id === c.id).ans);
  function vennDraw(dt, t) {
    venn.update(dt); venn.drawBoxes();
    const y0 = PHONE ? 284 : 276, hh = PHONE ? 346 : 270, xx = PHONE ? 10 : 14, ww = PHONE ? 460 : 772;
    panel(xx, y0, ww, hh, 16, '#ffffff'); T(xx + 16, y0 + 26, '원핵세포와 진핵세포의 특징 카드 9장을 나눠요', L(15, 13.5), '#334155', 'left', 800);
    venn.drawCards();
  }
  const vennPT = { down: (p) => venn.down(p), move: (p) => venn.move(p), up: (p) => venn.up(p), hover: (p) => venn.hover(p) };

  /* =========================================================
     ④ 세포 분류
     ========================================================= */
  const CLC = [
    { id: 'c1', label: '대장균', ans: 'p' }, { id: 'c2', label: '효모', ans: 'e' }, { id: 'c3', label: '짚신벌레', ans: 'e' }, { id: 'c4', label: '시금치 잎 세포', ans: 'e' }, { id: 'c5', label: '사람 구강 상피 세포', short: '구강 상피 세포', ans: 'e' },
    { id: 'c6', label: '남세균(시아노박테리아)', short: '남세균', ans: 'p' }, { id: 'c7', label: '곰팡이', ans: 'e' }, { id: 'c8', label: '사람 성숙 적혈구', short: '성숙 적혈구', ans: 'e' }, { id: 'c9', label: '젖산균', ans: 'p' }, { id: 'c10', label: '식물 뿌리털 세포', short: '뿌리털 세포', ans: 'e' },
  ];
  const CLB = PHONE ? { x: 10, y: 10, w: 460, h: 272 } : { x: 14, y: 14, w: 772, h: 262 };
  const classify = new Sorter({
    cards: [CLC[7], CLC[3], CLC[0], CLC[5], CLC[9], CLC[1], CLC[8], CLC[4], CLC[6], CLC[2]].map((c) => ({ id: c.id, label: c.label, short: c.short || c.label, col: '#64748b' })),
    boxes: [['p', '원핵생물', '#15803d', 1], ['e', '진핵생물', '#4338ca', PHONE ? 1 : 2]].map((b, i) => { const gap = 8, bw = i ? (CLB.w - gap) * 0.62 : (CLB.w - gap) * 0.38; return { id: b[0], label: b[1], col: b[2], x: CLB.x + (i ? (CLB.w - gap) * 0.38 + gap : 0), y: CLB.y, w: bw, h: CLB.h, cols: b[3], hdr: 32 }; }),
    cw: PHONE ? 214 : 144, ch: PHONE ? 42 : 48, kh: PHONE ? 34 : 40,
    tray: (i) => (PHONE ? { x: 12 + (i % 2) * 234, y: 300 + Math.floor(i / 2) * 50 } : { x: 18 + (i % 5) * 152, y: 296 + Math.floor(i / 5) * 58 }),
    onChange() { updateCtl(); },
  });
  const clWrong = () => classify.cards.filter((c) => c.zone && c.zone !== CLC.find((q) => q.id === c.id).ans);
  function classifyDraw(dt, t) {
    classify.update(dt); classify.drawBoxes();
    const y0 = PHONE ? 290 : 286, hh = PHONE ? 340 : 262, xx = PHONE ? 10 : 14, ww = PHONE ? 460 : 772;
    panel(xx, y0, ww, hh, 16, '#ffffff');
    if (!PHONE) textBlock(xx + 16, y0 + 150, ww - 32, '💡 DNA · 막 구조 · 리보솜 · 세포벽을 기준으로 생각해요. 핵이 없다거나 광합성을 한다는 것만으로는 판단하기 어려울 수 있어요.', 14, '#64748b', 20, 700);
    classify.drawCards();
  }
  const classifyPT = { down: (p) => classify.down(p), move: (p) => classify.move(p), up: (p) => classify.up(p), hover: (p) => classify.hover(p) };
  const CL_TRAP = {
    c6: '남세균은 광합성을 하지만 엽록체가 없는 원핵생물이에요. (세포막 안쪽 막에서 광합성을 해요)',
    c8: '사람 성숙 적혈구는 핵이 없지만 원래 진핵세포가 분화하면서 핵을 잃은 것이에요.',
  };

  /* =========================================================
     화면 전환 · 조작 연결
     ========================================================= */
  function setMode(m) {
    if (S.mode !== m) S.fade = 1;
    S.mode = m;
    PT = { calib: calibPT, measure: measurePT, image: imPT, chart: null, dna: dnaPT, organ: orgPT, ribo: null, wall: null, table: null, venn: vennPT, classify: classifyPT }[m] || null;
    hideHint(); updateCtl();
  }
  const ctlNodes = $$('#ctrlCard .control');
  function updateCtl() {
    const fr = game ? game.free : false, lvNow = game ? game.level : 0;
    ctlNodes.forEach((n) => { n.hidden = (n.dataset.modes || '').split(' ').indexOf(S.mode) < 0; });
    modeButtons(S.mode, lvNow, fr);
    const cobj = S.mode === 'calib' ? S.cal.obj : S.ms.obj;
    $$('.objSeg').forEach((g) => $$('button', g).forEach((b) => b.classList.toggle('on', +b.dataset.v === cobj)));
    const c = S.cal, v = numOf('inCal');
    $('#inCal').classList.toggle('ok', c.v[c.obj] != null && isFinite(v) && Math.abs(v - OBJ[c.obj].c) < 0.02);
    $('#calNote').innerHTML = !c.aligned[c.obj] ? '대물 마이크로미터(파란 눈금)를 <b>끌어서</b> 접안 눈금의 0과 맞춰요.' : c.v[c.obj] != null && isFinite(v) && Math.abs(v - OBJ[c.obj].c) < 0.02 ? '✅ 보정 완료! ' + OBJ[c.obj].nm + '에서 접안 1칸 = <b>' + OBJ[c.obj].c + ' μm</b>' : '두 눈금이 다시 만나는 곳을 읽고 계산해요: (대물 칸 수 × 10 μm) / 접안 칸 수.';
    chipSet($('#specSeg'), S.ms.spec);
    const m = S.ms, Lp = pxOf(SPEC[m.spec].L, m.obj);
    $('#msRec').disabled = false;
    $('#msNote').innerHTML = m.fb ? '<b style="color:#b45309">' + m.fb + '</b>' : '<b>' + SPEC[m.spec].nm + '</b>' + josa(SPEC[m.spec].nm, '을', '를') + ' ' + OBJ[m.obj].nm + '로 보고 있어요. 기록한 시료 <b>' + msCount() + ' / 4</b>' + (m.mark != null ? ' · 읽은 값 ' + m.mark + '칸' : '');
    chipSet($('#imgTool'), S.im.tool);
    const im = S.im;
    $('#inBar').classList.toggle('ok', im.cal != null);
    $('#imgNote').innerHTML = im.tool === 'bar' ? '사진 아래의 <b>스케일 바</b> 왼쪽 끝에서 오른쪽 끝까지 끌어서 선을 그어요.' + (im.barLen ? ' (잰 길이 ' + Math.round(im.barLen) + ' px)' : '') : '세포의 <b>왼쪽 끝에서 오른쪽 끝</b>까지 끌어서 선을 그어요.' + (im.meas != null ? ' → ' + im.meas + ' μm' : (im.cal == null ? ' (먼저 스케일 바를 보정해요)' : ''));
    chipSet($('#scaleSeg'), S.ch.log ? 'log' : 'lin');
    $('#chartNote').innerHTML = '잰 시료 <b>' + msCount() + ' / 4</b>. 로그 눈금은 한 칸이 10배를 뜻해요.';
    chipSet($('#dapiSeg'), S.dn.dapi ? 'on' : 'off');
    $('#dnaNote').innerHTML = S.dn.dapi ? 'DNA가 <b>파랗게 빛나는 곳</b>을 눌러요 (찾은 곳 ' + (S.dn.tag.coli + S.dn.tag.yeast) + ' / 2)' : '<b>DAPI 형광 염색</b>으로 바꾸면 DNA의 위치가 보여요.';
    ['dm', 'nm', 'hs'].forEach((k) => { const a = $('#dp_' + k), b = $('#de_' + k); if (a) a.classList.toggle('ok', a.value === DNA_ANS[k][0] && a.value !== ''); if (b) b.classList.toggle('ok', b.value === DNA_ANS[k][1] && b.value !== ''); });
    $('#orgNote').innerHTML = '진핵세포에서 <b>막으로 싸인 소기관</b>을 눌러 찾고, 원핵세포의 구조도 눌러서 확인해요. 찾은 소기관 <b>' + orgFound() + ' / 6</b>';
    $('#rbRun').disabled = S.rb.run; $('#rbAbx').textContent = S.rb.abx ? '💊 항생제 빼기' : '💊 항생제 넣기'; $('#rbAbx').classList.toggle('on', S.rb.abx);
    $('#rbNote').innerHTML = '원심분리 ' + (S.rb.ran ? '✅' : '⬜') + ' · 항생제 ' + (S.rb.abxSeen ? '✅' : '⬜') + ' (넣고 3초 이상 지켜봐요)';
    chipSet($('#enzSeg'), S.wl.sel); $$('#enzSeg button').forEach((b) => b.classList.toggle('seen', !!S.wl.tested[b.dataset.v]));
    $('#wlNote').innerHTML = '효소를 고르고 <b>💧 넣기</b>! 시험한 효소 <b>' + Object.keys(S.wl.tested).length + ' / 3</b>';
    ['dn', 'mb', 'rb', 'cw'].forEach((k) => { const a = $('#cp_' + k), b = $('#ce_' + k); if (a) a.classList.toggle('ok', a.value === CMP[k][0] && a.value !== ''); if (b) b.classList.toggle('ok', b.value === CMP[k][1] && b.value !== ''); });
    $('#cmpNote').innerHTML = '직접 확인한 활동 <b>' + evCount() + ' / 3</b> (🔎 · 🌀 · 🧪)';
  }
  bindModeSeg(setMode);
  $$('.objSeg button').forEach((b) => b.addEventListener('click', () => {
    Sound.click(); const o = +b.dataset.v;
    if (S.mode === 'calib') { S.cal.obj = o; S.cal.sx = 37; S.cal.wrong = false; $('#inCal').value = ''; }
    else { S.ms.obj = o; S.ms.mark = null; S.ms.ox = 70; S.ms.fb = ''; }
    updateCtl();
  }));
  $('#inCal').addEventListener('input', () => {
    const c = S.cal, v = numOf('inCal');
    if (isFinite(v) && Math.abs(v - OBJ[c.obj].c) < 0.02) { if (c.aligned[c.obj]) { if (c.v[c.obj] == null) Sound.success(); c.v[c.obj] = OBJ[c.obj].c; } }
    updateCtl();
  });
  $$('#specSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.ms.spec = b.dataset.v; S.ms.mark = null; S.ms.ox = 70; S.ms.fb = ''; updateCtl(); }));
  $('#msRec').addEventListener('click', msRecord);
  $$('#imgTool button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.im.tool = b.dataset.v; updateCtl(); }));
  $('#inBar').addEventListener('input', updateCtl);
  $('#imgReset').addEventListener('click', () => { Sound.click(); imReset(); });
  $$('#scaleSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.ch.log = b.dataset.v === 'log'; updateCtl(); }));
  $$('#dapiSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.dn.dapi = b.dataset.v === 'on'; updateCtl(); }));
  ['dm', 'nm', 'hs'].forEach((k) => { $('#dp_' + k).addEventListener('change', () => { Sound.click(); updateCtl(); }); $('#de_' + k).addEventListener('change', () => { Sound.click(); updateCtl(); }); });
  ['dn', 'mb', 'rb', 'cw'].forEach((k) => { $('#cp_' + k).addEventListener('change', () => { Sound.click(); updateCtl(); }); $('#ce_' + k).addEventListener('change', () => { Sound.click(); updateCtl(); }); });
  $('#orgReset').addEventListener('click', () => { Sound.click(); orgReset(); });
  $('#rbRun').addEventListener('click', rbRun);
  $('#rbAbx').addEventListener('click', () => { Sound.click(); S.rb.abx = !S.rb.abx; S.rb.abxT = 0; updateCtl(); });
  $('#rbReset').addEventListener('click', () => { Sound.click(); rbReset(); });
  $$('#enzSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.wl.sel = b.dataset.v; updateCtl(); }));
  $('#wlGo').addEventListener('click', wlGo);
  $('#wlReset').addEventListener('click', () => { Sound.click(); wlReset(); });
  $('#vnReset').addEventListener('click', () => { Sound.click(); venn.reset(); });
  $('#clReset').addEventListener('click', () => { Sound.click(); classify.reset(); });

  /* =========================================================
     미션
     ========================================================= */
  const MS = (k) => S.ms.rec[k];
  const levels = [
    {
      title: '현미경으로 세포 크기 재기', short: '크기 측정', icon: '📏', phase: '실험',
      intro: '<p class="si-q">❓ 탐구 질문: 세균 한 마리와 내 입안 세포는 같은 \'세포\'인데 무엇이 같고 무엇이 다를까?</p><p>🔗 <b>일반선택 과학</b>(생명과학)과 앞 차시에서 소기관의 구조를 배웠어요. 이번에는 <b>세포의 크기</b>부터 직접 재 볼 거예요. 세포는 너무 작아서 현미경의 <b>접안 마이크로미터</b>(눈금자)로 재요. 그런데 눈금 한 칸의 실제 길이는 배율마다 달라서, 먼저 <b>대물 마이크로미터</b>(실제 길이를 아는 눈금자)와 겹쳐 <b>보정</b>해야 해요.</p><p>이미지 분석 소프트웨어를 쓰면 사진 속 스케일 바로 크기를 잴 수도 있어요.</p>',
      features: ['calib', 'measure', 'image', 'chart'],
      setup() { setMode('calib'); },
      recap: '접안 마이크로미터 한 칸의 길이는 대물 마이크로미터로 보정해야 하고 배율이 바뀌면 달라져요. 원핵세포는 대체로 약 1~10 μm, 진핵세포는 약 10~100 μm예요.',
      summary: '<ul><li><b>보정</b>: 대물 마이크로미터(1 mm를 100칸 = 1칸 10 μm)와 접안 마이크로미터를 겹쳐 두 눈금이 다시 만나는 곳을 읽어요. 예) 400배에서 접안 40칸 = 대물 10칸(100 μm) → 접안 1칸 = 100 / 40 = <b>2.5 μm</b>.</li><li>배율이 바뀌면 접안 1칸의 길이도 달라지므로 배율마다 보정해야 해요. 크기 = 눈금 칸 수 × 1칸의 길이.</li><li><b>이미지 분석</b>: 사진 속 스케일 바(예: 50 μm = 200 px)로 1 px = 0.25 μm를 구한 뒤 세포에 선을 그어 크기를 재요.</li><li>크기: 원핵세포 약 1~10 μm(대장균 약 2 μm), 진핵세포 약 10~100 μm(사람 구강 상피 세포 약 50 μm, 효모 약 5~10 μm).</li></ul>',
      missions: [
        {
          id: 'calib', title: '접안 마이크로미터 보정',
          goal: '🧮 <b>보정</b>에서 <b>400배</b>를 고르고 두 눈금의 0을 맞춘 뒤, 접안 마이크로미터 <b>1칸이 몇 μm</b>인지 계산해서 입력하세요.',
          hint: '파란 대물 눈금을 끌어서 0을 맞추면 접안 40칸이 대물 10칸(= 100 μm)과 만나요. 100 μm를 40칸으로 나누면 한 칸이 얼마일까요?',
          setup() { S.cal.obj = 400; S.cal.sx = 37; S.cal.v[400] = null; S.cal.aligned = {}; $('#inCal').value = ''; setMode('calib'); updateCtl(); },
          check: () => S.cal.v[400] === 2.5, hold: 0.6,
          status: () => mark(!!S.cal.aligned[400]) + ' 0점 맞춤 &nbsp; ' + mark(S.cal.v[400] === 2.5) + ' 접안 1칸 = 2.5 μm',
          explain: '400배에서 접안 40칸이 대물 10칸(10 × 10 μm = 100 μm)과 일치했으므로 접안 1칸 = 100 / 40 = <b>2.5 μm</b>예요. 배율을 바꾸면 이 값도 달라져서(100배: 10 μm, 1000배: 1 μm) 배율마다 다시 보정해야 해요.',
        },
        {
          id: 'measure', title: '세포 크기 재기',
          goal: '시료 <b>2종 이상</b>을 접안 눈금으로 재어 📌 기록하고, 🖼 <b>이미지 분석</b>으로 사진 속 세포 폭도 재어 보세요.',
          hint: '시료를 끌어 왼쪽 끝을 0에 맞추고, 오른쪽 끝의 눈금을 눌러 읽어요. 양파 표피 세포는 100배, 구강 상피 세포는 400배, 효모와 대장균은 1000배가 읽기 좋아요. 이미지 분석은 ①스케일 바(50 μm)를 잡고 입력한 뒤 ②세포 폭을 재요.',
          setup() { S.ms.rec = {}; S.ms.mark = null; S.ms.ox = 70; S.ms.fb = ''; S.ms.spec = 'onion'; S.ms.obj = 100; imReset(); setMode('measure'); updateCtl(); },
          check: () => msCount() >= 2 && S.im.done, hold: 0.8,
          status: () => mark(msCount() >= 2) + ' 눈금으로 잰 시료 ' + msCount() + ' / 2 &nbsp; ' + mark(S.im.done) + ' 이미지 분석' + (S.im.meas != null ? ' (' + S.im.meas + ' μm)' : ''),
          explain: '양파 표피 세포는 약 150 μm, 구강 상피 세포는 약 50 μm, 효모는 약 8 μm, 대장균은 약 2 μm예요. 이미지 분석에서는 스케일 바(50 μm = 200 px)로 1 px = 0.25 μm를 구한 뒤, 세포 폭 160 px × 0.25 = <b>40 μm</b>를 얻어요. 눈금이 너무 적게 읽히면 오차가 커져서 배율을 높여야 해요.',
        },
        {
          type: 'quiz', title: '배율을 바꾸면 눈금 한 칸의 길이는?',
          goal: '현미경의 <b>배율을 바꾸면</b> 접안 마이크로미터 한 칸이 나타내는 실제 길이는 어떻게 될까요?',
          setup() { setMode('calib'); },
          choices: ['변하지 않는다', '배율이 클수록 한 칸이 나타내는 실제 길이가 짧아진다', '배율이 클수록 한 칸이 나타내는 실제 길이가 길어진다', '시료에 따라 마음대로 바뀐다'],
          answer: 1,
          feedback: ['접안 눈금자는 그대로지만 보이는 시료가 확대되므로 한 칸이 나타내는 실제 길이는 달라져요.', '', '배율이 클수록 시료가 더 커 보이므로 같은 눈금 칸이 더 짧은 실제 길이를 뜻해요.', '배율에 따라 일정한 값으로 정해져요(그래서 보정을 해요).'],
          explain: '접안 마이크로미터는 렌즈 속에 고정된 눈금자예요. 배율이 커지면 시료가 크게 보여 같은 한 칸이 가리키는 실제 길이는 <b>더 짧아져요</b>(100배 10 μm → 400배 2.5 μm → 1000배 1 μm). 그래서 배율마다 보정이 필요해요.',
        },
      ],
    },
    {
      title: 'DNA는 어디에 있을까', short: 'DNA와 핵', icon: '🧬', phase: '모형',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 원핵세포(약 1~10 μm)가 진핵세포(약 10~100 μm)보다 작다는 것을 재어 보았어요.</div><p>이제 두 세포의 <b>유전 물질 DNA</b>를 비교해요. 대장균(원핵)과 효모(진핵)를 같은 비율로 놓고, DNA를 파랗게 빛나게 하는 <b>DAPI 형광 염색</b>으로 DNA의 위치를 찾아 확대해 봐요.</p>',
      features: ['dna'],
      setup() { setMode('dna'); },
      recap: '원핵세포의 DNA는 고리 모양으로 핵막 없이 세포질의 핵양체에 있고, 진핵세포의 DNA는 선형이며 히스톤과 함께 염색체를 이루어 핵막으로 싸인 핵 속에 있어요. 둘 다 DNA는 있어요.',
      summary: '<ul><li><b>원핵세포</b>(대장균): <b>고리 모양</b> DNA가 세포질의 <b>핵양체</b>에 있어요. <b>핵막이 없고</b> 히스톤 단백질이 없어요.</li><li><b>진핵세포</b>(효모): <b>선형</b> DNA가 <b>히스톤</b>과 함께 염색체를 이루어 <b>핵막으로 싸인 핵</b> 안에 있어요.</li><li>둘 다 유전 물질로 <b>DNA</b>를 가져요. (원핵세포에 DNA가 없는 것이 아니에요.) DAPI는 DNA를 파랗게 물들이는 형광 염색약이에요.</li></ul>',
      missions: [
        {
          id: 'dnapos', title: 'DNA 위치 표시',
          goal: '🧬 <b>DAPI 형광 염색</b>으로 바꾼 뒤, 대장균과 효모에서 <b>DNA가 빛나는 곳</b>을 각각 눌러 표시하세요.',
          hint: '관찰 방법을 DAPI 형광 염색으로 바꿔요. 대장균은 가운데의 파란 덩어리, 효모는 둥근 핵이에요. 확대 그림을 눌러도 돼요.',
          setup() { S.dn.dapi = false; S.dn.tag = { coli: false, yeast: false }; setMode('dna'); updateCtl(); },
          check: () => dnTagged(), hold: 0.6,
          status: () => mark(S.dn.dapi) + ' DAPI 염색 &nbsp; ' + mark(S.dn.tag.coli) + ' 대장균 DNA &nbsp; ' + mark(S.dn.tag.yeast) + ' 효모 DNA',
          explain: '대장균의 DNA는 <b>핵양체</b>라는 덩어리로 세포질에 놓여 있고 막이 없어요. 효모의 DNA는 <b>핵막으로 싸인 핵</b> 안에 있어요. 두 세포 모두 DNA가 있지만 놓인 방식이 달라요.',
        },
        {
          id: 'dnacmp', title: 'DNA 구조 비교 카드', manual: true,
          goal: '오른쪽 표에서 원핵세포와 진핵세포의 <b>DNA 모양 · 핵막 · 히스톤</b>을 골라 채우고 ✔ 확인하기를 누르세요.',
          hint: '대장균의 DNA는 고리 모양이고 핵막과 히스톤이 없어요. 효모의 DNA는 선형이고 핵막과 히스톤이 있어요(확대 그림의 노란 구슬이 히스톤).',
          setup() { setMode('dna'); ['dp', 'de'].forEach((s) => ['dm', 'nm', 'hs'].forEach((k) => { const e = $('#' + s.replace('d', 'd') + '_' + k); if (e) { e.value = ''; e.className = ''; } })); updateCtl(); },
          check() {
            const emp = ['dm', 'nm', 'hs'].some((k) => !dnaSel('p', k) || !dnaSel('e', k));
            if (emp) return '표의 빈칸을 모두 채워 주세요.';
            if (dnaAll()) return true;
            return '\'' + { dm: 'DNA 모양', nm: '핵막', hs: '히스톤 단백질' }[dnaWrongRows()[0]] + '\' 줄을 다시 확인해 보세요. 확대 그림에서 두 세포의 DNA를 비교해요.';
          },
          explain: '<b>원핵세포</b>: 고리 모양 DNA · 핵막 없음 · 히스톤 없음(핵양체). <b>진핵세포</b>: 선형 DNA · 핵막 있음 · 히스톤 있음(염색체가 핵 안에).',
        },
        {
          type: 'quiz', title: '원핵세포에는 DNA가 없을까?',
          goal: '\'원핵세포에는 DNA가 없다\'는 말에 대한 설명으로 알맞은 것은?',
          setup() { setMode('dna'); },
          choices: ['맞다. 원핵세포는 DNA 대신 RNA를 쓴다', 'DNA는 있지만 핵막으로 싸여 있지 않다', '핵이 있어서 DNA가 핵 속에 있다', 'DNA가 있는 곳은 소포체이다'],
          answer: 1,
          feedback: ['원핵세포도 DNA를 유전 물질로 써요.', '', '원핵세포에는 핵(핵막)이 없어요.', 'DNA는 세포질의 핵양체에 있어요.'],
          explain: '원핵세포는 <b>핵막이 없을 뿐</b> 유전 물질 DNA를 가져요. 고리 모양 DNA가 세포질의 핵양체에 있어요.',
        },
      ],
    },
    {
      title: '막 · 리보솜 · 세포벽', short: '막·리보솜·벽', icon: '🧪', phase: '모형',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> DNA의 위치와 모양이 두 세포에서 다르다는 것을 알았어요.</div><p>이제 <b>세포 안의 막 구조 · 리보솜 · 세포벽</b>을 비교해요. 🔎 막성 소기관을 찾아보고, 🌀 리보솜을 원심분리해(앞 차시의 원심분리!) 70S와 80S의 침강 속도를 비교하고, 항생제를 넣어 보고, 🧪 효소로 세포벽을 분해해 봐요. 그 결과로 📋 비교표와 🗂 벤 다이어그램을 완성해요.</p>',
      features: ['organ', 'ribo', 'wall', 'table', 'venn'],
      setup() { setMode('organ'); },
      recap: '원핵세포는 막으로 싸인 소기관이 없고 70S 리보솜과 (대부분) 세포벽(펩티도글리칸)이 있어요. 진핵세포는 막성 소기관이 있고 80S 리보솜(세포질)이 있으며 식물은 셀룰로스, 균류는 키틴 세포벽을 가져요. 공통점은 세포막 · 세포질 · 리보솜 · DNA예요.',
      summary: '<ul><li><b>막 구조</b>: 원핵세포는 막으로 싸인 소기관이 없어요(세포막이 안으로 접힌 구조는 있어도 소기관은 아님). 진핵세포는 핵 · 미토콘드리아 · 소포체 · 골지체 등 막성 소기관이 있어요.</li><li><b>리보솜</b>: 둘 다 있지만 원핵 <b>70S</b>, 진핵(세포질) <b>80S</b>. S는 원심분리할 때 가라앉는 속도의 단위(침강 계수)예요. 항생제는 세균의 70S 리보솜이나 세포벽을 표적으로 해서 사람 세포에는 해가 적어요.</li><li><b>세포벽</b>: 세균 – 펩티도글리칸, 식물 – 셀룰로스, 균류 – 키틴, 동물 – 없음. 효소마다 분해하는 벽이 달라요.</li><li><b>공통점</b>: 세포막 · 세포질 · 리보솜 · DNA(유전 물질).</li></ul>',
      missions: [
        {
          id: 'table', title: '원핵 · 진핵 비교표', manual: true,
          goal: '🔎 🌀 🧪 활동 세 가지를 모두 해 본 뒤, 📋 <b>비교표</b>의 8칸을 채우고 ✔ 확인하기를 누르세요.',
          hint: '🔎 진핵세포의 막성 소기관 6종을 모두 찾고 원핵세포 구조를 눌러 봐요. 🌀 원심분리와 항생제를, 🧪 효소 3가지를 시험해요. 표는 DNA · 막 구조 · 리보솜 · 세포벽 순서예요.',
          setup() { orgReset(); rbReset(); wlReset(); S.wl.tested = {}; ['cp', 'ce'].forEach((s) => ['dn', 'mb', 'rb', 'cw'].forEach((k) => { const e = $('#' + s + '_' + k); if (e) { e.value = ''; e.className = ''; } })); setMode('organ'); updateCtl(); },
          status: () => mark(evOrgan()) + ' 소기관 찾기 &nbsp; ' + mark(evRibo()) + ' 리보솜 · 항생제 &nbsp; ' + mark(evWall()) + ' 세포벽 효소',
          check() {
            if (evCount() < 3) return '먼저 🔎 · 🌀 · 🧪 활동을 모두 해 보세요. (' + evCount() + ' / 3)';
            const e = ['dn', 'mb', 'rb', 'cw'].filter((k) => !cmpSel('p', k) || !cmpSel('e', k)).length;
            if (e) return '표의 빈칸을 모두 채워 주세요.';
            if (cmpAll()) return true;
            const k = ['dn', 'mb', 'rb', 'cw'].find((q) => cmpSel('p', q) !== CMP[q][0] || cmpSel('e', q) !== CMP[q][1]);
            return '\'' + { dn: 'DNA', mb: '막 구조', rb: '리보솜', cw: '세포벽' }[k] + '\' 줄을 다시 확인해 보세요. 직접 해 본 활동의 결과를 떠올려요.';
          },
          explain: '<b>DNA</b>: 원핵 고리 모양 / 진핵 선형(핵 속). <b>막 구조</b>: 원핵 막성 소기관 없음 / 진핵 있음. <b>리보솜</b>: 원핵 70S / 진핵 80S(세포질). <b>세포벽</b>: 세균 펩티도글리칸 / 식물 셀룰로스 · 균류 키틴(동물은 없음).',
        },
        {
          id: 'venn', title: '공통점과 차이점 나누기', manual: true,
          goal: '카드 9장을 <b>원핵세포만 · 공통점 · 진핵세포만</b> 칸에 나눠 넣으세요.',
          hint: '고리 모양 DNA와 70S 리보솜은 원핵세포만의 특징이에요. 핵막으로 싸인 핵, 막성 소기관, 80S 리보솜은 진핵세포만의 특징이에요. 세포막 · 세포질 · 리보솜 · DNA는 둘 다 가져요.',
          setup() { setMode('venn'); venn.reset(); },
          status: () => mark(venn.placed === 9) + ' 놓은 카드 ' + venn.placed + ' / 9',
          check() {
            if (venn.placed < 9) { venn.markBad([]); return '카드를 모두 넣어 주세요. (' + venn.placed + ' / 9)'; }
            const w = vennWrong(); if (!w.length) { venn.markBad([]); return true; }
            venn.markBad(w.map((c) => c.id)); return '빨갛게 표시된 카드를 다시 생각해 보세요. 두 세포에 모두 있는 것일까요?';
          },
          explain: '<b>공통점</b>: 세포막 · 세포질 · 리보솜 · DNA. <b>원핵만</b>: 고리 모양 DNA(핵양체), 70S 리보솜. <b>진핵만</b>: 핵막으로 싸인 핵, 막성 소기관, 80S 리보솜(세포질).',
        },
        {
          type: 'quiz', title: '항생제가 사람 세포에는 해가 적은 까닭',
          goal: '항생제가 세균은 죽이지만 <b>사람 세포에는 해가 적은</b> 까닭은?',
          setup() { setMode('ribo'); },
          choices: ['사람 세포에는 리보솜이 없어서', '세균의 70S 리보솜이나 세포벽처럼 사람 세포에는 없는 곳을 표적으로 해서', '항생제가 사람 세포의 핵을 통과하지 못해서', '세균에는 미토콘드리아가 없어서'],
          answer: 1,
          feedback: ['사람 세포에도 리보솜(80S)이 있어요. 크기와 구조가 세균 리보솜과 달라요.', '', '핵을 통과하는지는 이 문제와 관계가 없어요.', '세균에 미토콘드리아가 없는 것은 맞지만 항생제의 표적과는 관계가 적어요.'],
          explain: '세균의 <b>70S 리보솜</b>과 <b>펩티도글리칸 세포벽</b>은 사람 세포(80S 리보솜, 세포벽 없음)와 달라서 항생제가 세균만 골라 공격할 수 있어요.',
        },
      ],
    },
    {
      title: '세포 분류하기', short: '세포 분류', icon: '🗂', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> DNA · 막 구조 · 리보솜 · 세포벽으로 원핵세포와 진핵세포를 비교했어요.</div><p>이 기준을 써서 여러 세포를 <b>원핵생물</b>과 <b>진핵생물</b>로 나눠 보아요. 그런데 헷갈리기 쉬운 세포가 숨어 있어요. 핵이 없다고 모두 원핵세포일까요? 광합성을 하면 엽록체가 있을까요?</p>',
      features: ['classify'],
      setup() { setMode('classify'); },
      recap: '세포의 종류는 핵막으로 싸인 핵과 막성 소기관의 유무로 판단해요. 남세균은 광합성을 하지만 엽록체가 없는 원핵생물이고, 사람 성숙 적혈구는 핵이 없지만 진핵세포에서 분화한 세포예요.',
      summary: '<ul><li>원핵생물: 대장균 · 젖산균 · 남세균(시아노박테리아). 진핵생물: 효모 · 곰팡이 · 짚신벌레 · 식물 세포 · 사람 세포.</li><li><b>남세균</b>은 광합성을 하지만 <b>엽록체가 없는 원핵생물</b>이에요(세포막 안쪽 막에서 광합성).</li><li><b>사람 성숙 적혈구</b>는 핵이 없지만 원래 진핵세포가 분화하면서 핵을 잃은 것이에요. 핵이 없다고 모두 원핵세포는 아니에요.</li></ul>',
      missions: [
        {
          id: 'classify', title: '원핵 · 진핵 분류', manual: true,
          goal: '카드 10장을 <b>원핵생물</b>과 <b>진핵생물</b> 상자로 나누세요. 함정 카드가 있어요!',
          hint: '대장균 · 젖산균은 세균이에요. 남세균은 광합성을 하는 세균이에요. 사람 성숙 적혈구는 핵이 없지만 원래 어떤 세포였을까요?',
          setup() { setMode('classify'); classify.reset(); },
          status: () => mark(classify.placed === 10) + ' 놓은 카드 ' + classify.placed + ' / 10',
          check() {
            if (classify.placed < 10) { classify.markBad([]); return '카드를 모두 상자에 넣어 주세요. (' + classify.placed + ' / 10)'; }
            const w = clWrong(); if (!w.length) { classify.markBad([]); return true; }
            classify.markBad(w.map((c) => c.id));
            const tr = w.find((c) => CL_TRAP[c.id]);
            return tr ? CL_TRAP[tr.id] : '빨갛게 표시된 카드를 다시 생각해 보세요. 핵막으로 싸인 핵과 막성 소기관이 있는 세포일까요?';
          },
          explain: '<b>원핵생물</b>: 대장균 · 젖산균 · 남세균. 나머지는 <b>진핵생물</b>이에요. 남세균은 엽록체가 없어도 광합성을 하고, 사람 성숙 적혈구는 진핵세포가 분화하며 핵을 잃은 세포예요.',
        },
        {
          type: 'quiz', title: '핵이 없으면 모두 원핵세포?',
          goal: '핵이 <b>없는</b> 세포는 모두 원핵세포일까요?',
          setup() { setMode('classify'); },
          choices: ['그렇다. 핵이 없으면 원핵세포이다', '아니다. 사람 성숙 적혈구처럼 진핵세포가 분화하며 핵을 잃기도 한다', '아니다. 핵이 없는 세포는 진핵세포 중에서만 나온다', '그렇다. 핵이 없는 세포에는 DNA도 없다'],
          answer: 1,
          feedback: ['성숙 적혈구는 핵이 없지만 진핵세포에서 만들어진 세포예요.', '', '원핵세포도 핵이 없어요. 핵이 없다고 해서 원핵세포라고 단정할 수는 없지만 \'진핵세포 중에서만\'은 틀려요.', '원핵세포에는 DNA가 있고, 성숙 적혈구는 핵과 함께 DNA도 잃지만 진핵세포에서 분화한 것이에요.'],
          explain: '핵의 유무만으로 판단하면 안 돼요. <b>사람 성숙 적혈구</b>는 핵이 없지만 원래 진핵세포가 <b>분화하며 핵을 잃은 것</b>이에요. 또 남세균은 엽록체가 없어도(원핵생물) 광합성을 할 수 있어요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hy-prok-euk', mount: '#game', badge: '세포 비교 전문가', homeHref: '../../index.html#hy',
    featureLabels: { calib: '🧮 보정', measure: '📏 눈금으로 재기', image: '🖼 이미지 분석', chart: '📊 크기 비교', dna: '🧬 DNA 위치', organ: '🔎 막성 소기관', ribo: '🌀 리보솜과 항생제', wall: '🧪 세포벽 효소', table: '📋 비교표', venn: '🗂 벤 다이어그램', classify: '🗂 세포 분류' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 읽음 칸 ---------- */
  function readouts() {
    const m = S.mode;
    if (m === 'calib') setReads(['대물렌즈', OBJ[S.cal.obj].nm, '접안 1칸', S.cal.v[S.cal.obj] != null ? S.cal.v[S.cal.obj] + ' μm' : '?', '0점 맞춤', S.cal.aligned[S.cal.obj] ? '맞음' : '아직']);
    else if (m === 'measure') setReads(['시료', SPEC[S.ms.spec].nm, '읽은 눈금', S.ms.mark != null ? S.ms.mark + '칸' : '—', '기록한 시료', msCount() + ' / 4']);
    else if (m === 'image') setReads(['스케일 바', S.im.cal ? '1 px = ' + (Math.round(S.im.cal * 1000) / 1000) + ' μm' : '보정 전', '세포 폭', S.im.meas != null ? S.im.meas + ' μm' : '—', '분석', S.im.done ? '완료' : '진행 중']);
    else if (m === 'chart') setReads(['눈금', S.ch.log ? '로그' : '보통', '잰 시료', msCount() + ' / 4', '원핵 · 진핵', '1~10 · 10~100 μm']);
    else if (m === 'dna') setReads(['관찰', S.dn.dapi ? 'DAPI 형광' : '일반', '찾은 DNA', (S.dn.tag.coli + S.dn.tag.yeast) + ' / 2', '채운 칸', ['dm', 'nm', 'hs'].filter((k) => dnaSel('p', k) && dnaSel('e', k)).length + ' / 3']);
    else if (m === 'organ') setReads(['진핵 막성 소기관', orgFound() + ' / 6종', '원핵 막성 소기관', '0종', '누른 원핵 구조', Object.keys(S.og.pTapped).length + '곳']);
    else if (m === 'ribo') setReads(['원심분리', S.rb.run ? '진행 중' : S.rb.ran ? '끝' : '전', '항생제', S.rb.abx ? '넣음' : '안 넣음', '세균 · 사람 단백질', S.rb.cnt[0] + ' · ' + S.rb.cnt[1]]);
    else if (m === 'wall') setReads(['고른 효소', ENZ[S.wl.sel], '시험한 효소', Object.keys(S.wl.tested).length + ' / 3', '표적', { lyso: '펩티도글리칸', cell: '셀룰로스', chit: '키틴' }[S.wl.sel]]);
    else if (m === 'table') setReads(['활동', evCount() + ' / 3', '맞게 채운 칸', ['dn', 'mb', 'rb', 'cw'].reduce((a, k) => a + (cmpSel('p', k) === CMP[k][0]) + (cmpSel('e', k) === CMP[k][1]), 0) + ' / 8', '표', '4줄']);
    else if (m === 'venn') setReads(['놓은 카드', venn.placed + ' / 9', '남은 카드', (9 - venn.placed) + '장', '칸', '3칸']);
    else setReads(['놓은 카드', classify.placed + ' / 10', '남은 카드', (10 - classify.placed) + '장', '상자', '2칸']);
  }

  /* ---------- 시작 ---------- */
  setMode('calib');
  let lastFree = false, lastLv = -1;
  SciSim.loop((dt, t) => {
    clock = t; S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (game && game.level !== lastLv) { lastLv = game.level; updateCtl(); }
    view.apply(); FX.update(dt); ctx.clearRect(0, 0, VW, VH);
    if (S.mode !== 'ribo') { const r = S.rb; if (r.run) riboUpdate(dt); }
    switch (S.mode) {
      case 'calib': bgFill('#eef2f0', '#e2e9e6'); calibDraw(dt, t); break;
      case 'measure': bgFill('#eef2f0', '#e2e9e6'); measureDraw(dt, t); break;
      case 'image': bgFill('#eef2f0', '#e2e9e6'); imDraw(dt, t); break;
      case 'chart': bgFill('#eef2f0', '#e2e9e6'); chartDraw(dt, t); break;
      case 'dna': bgFill('#eef2f0', '#e2e9e6'); dnaDraw(dt, t); break;
      case 'organ': bgFill('#eef2f0', '#e2e9e6'); orgDraw(dt, t); break;
      case 'ribo': bgFill('#eef2f0', '#e2e9e6'); riboDraw(dt, t); break;
      case 'wall': bgFill('#eef2f0', '#e2e9e6'); wallDraw(dt, t); break;
      case 'table': bgFill('#eef2f0', '#e2e9e6'); tableDraw(dt, t); break;
      case 'venn': bgFill('#eef2f0', '#e2e9e6'); vennDraw(dt, t); break;
      case 'classify': bgFill('#eef2f0', '#e2e9e6'); classifyDraw(dt, t); break;
    }
    FX.draw(); parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(241,246,243,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, PHONE, get game() { return game; }, levels, setMode, OBJ, SPEC, SV, SCX, SCY, EX0, PXDIV, NDIV, pxOf, IM, BAR, BARPX, CELLW, IMC, venn, classify, VNC, CLC,
    OVS, CO, YE, IC1, IC2, OV, INS, EO, PO, orgGeo, orgHitEuk, orgHitPro, rbRun, rbReset, wlGo, wlReset, cmpAll, CMP, DNA_ANS, updateCtl, msRecord, msCount, imReset, evCount,
  };
})();
