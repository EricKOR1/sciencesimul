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
     고등학교 세포와 물질대사 · Ⅰ. 세포 - 단백질의 합성과 분비 (단원 56, 5차시)
     성취기준 [12세포01-03] (뒷부분: 소기관의 유기적 관계 - 물질의 합성과 분비, 자기방사법)
     ① 모형: 분비의 길  ② 실험: 추적 실험  ③ 탐구: 협력과 이상  ④ 적용: 세포의 특징
     ========================================================= */
  const S = { mode: 'path', fade: 0 };
  let game = null;
  const PROT = '#d946ef';

  /* ---------- 이자 세포 장면 (장면 좌표 780 x 500) ---------- */
  const G = {
    W: 780, H: 500, memX: 690,
    nuc: { x: 130, y: 230, r: 84 },
    rer: { rad: 112, a0: -0.8, a1: 0.95, n: 3, gap: 17, th: 11 },
    gol: { x: 410, y: 240, w: 150, n: 5, gap: 22, rot: Math.PI / 2 },
    ves: [[560, 150], [604, 186], [548, 312], [598, 338], [636, 158], [644, 304]],
    mit: [{ x: 150, y: 425, rot: 0.15 }, { x: 330, y: 445, rot: -0.1 }, { x: 520, y: 420, rot: 0.1 }], mitLen: 96, mitWid: 44,
  };
  const PA = PHONE ? { x: 10, y: 10, w: 460, h: 330 } : { x: 14, y: 14, w: 772, h: 424 };
  const CAP = PHONE ? { x: 10, y: 350, w: 460, h: 280 } : { x: 14, y: 446, w: 772, h: 100 };
  function sceneT(r) { const s = Math.min(r.w / G.W, r.h / G.H); return { s, ox: r.x + (r.w - G.W * s) / 2, oy: r.y + (r.h - G.H * s) / 2 }; }
  const PGRAY = { cyt: '#d6d6d6', nuc: '#bdbdbd', nucL: '#262626', chrom: '#6a6a6a', nucleolus: '#4a4a4a', er: '#d0d0d0', erL: '#2a2a2a', rib: '#151515', gol: '#c9c9c9', golL: '#2a2a2a', lys: '#a6a6a6', lysL: '#262626', lysDot: '#2b2b2b', mit: '#b4b4b4', mitL: '#222', cris: '#383838', mitMat: '#c6c6c6', chl: '#bbb', chlL: '#333', gran: '#555', vac: '#ddd', vacL: '#444', wall: '#ccc', wallL: '#555' };
  const stT = (sx, sy) => { const T0 = S.tr || sceneT(PA); return [T0.ox + sx * T0.s, T0.oy + sy * T0.s]; };
  /* 장면 안 글씨(크기는 화면 기준으로 고정) */
  function slab(x, y, text, o) { o = o || {}; const p = stT(x, y); return D.label(p[0], p[1], text, Object.assign({ bg: 'rgba(255,255,255,.92)', color: '#334155', size: 13, border: '#cbd5e1' }, o)); }
  function drawScene(T0, o) {
    o = o || {}; S.tr = T0;
    const P = o.pal || OD.PAL, pc = o.pal ? o.pal : OD.PAL;
    ctx.save(); ctx.translate(T0.ox, T0.oy); ctx.scale(T0.s, T0.s);
    // 세포질과 세포 밖
    D.roundRect(10, 8, G.memX - 10, G.H - 16, 22); ctx.fillStyle = o.pal ? P.cyt : '#fff6e2'; ctx.fill();
    ctx.fillStyle = o.pal ? '#ececec' : '#e6f3fc'; ctx.fillRect(G.memX + 4, 8, G.W - G.memX - 8, G.H - 16);
    ctx.strokeStyle = o.pal ? '#2a2a2a' : '#e8a838'; ctx.lineWidth = 6; D.roundRect(10, 8, G.memX - 10, G.H - 16, 22); ctx.stroke();
    // 핵, 소포체
    const dim = o.dim || {};
    const dimIt = (k, fn) => { ctx.save(); if (dim[k]) ctx.globalAlpha = 0.35; fn(); ctx.restore(); };
    dimIt('nuc', () => OD.nucleus(ctx, G.nuc.x, G.nuc.y, G.nuc.r, { pal: P, pores: 8, lw: 3, chromA: o.pal ? 0.4 : 0.5 }));
    dimIt('er', () => OD.rer(ctx, G.nuc.x, G.nuc.y, G.rer.rad, G.rer.a0, G.rer.a1, G.rer.n, G.rer.gap, { pal: P, th: G.rer.th, lw: 2, rr: 3.4 }));
    // 골지체
    dimIt('gol', () => OD.golgi(ctx, G.gol.x, G.gol.y, G.gol.w, G.gol.n, G.gol.gap, G.gol.rot, { pal: P, th: 13, lw: 2, ves: 0 }));
    // 분비 소낭(저장된 것)
    G.ves.forEach((v, i) => {
      ctx.beginPath(); ctx.arc(v[0], v[1], 17, 0, TAU); ctx.fillStyle = o.pal ? '#c4c4c4' : '#ffe9bf'; ctx.fill(); ctx.strokeStyle = o.pal ? '#2a2a2a' : '#d9822b'; ctx.lineWidth = 2.4; ctx.stroke();
      ctx.fillStyle = o.pal ? '#444' : '#c026d3'; ctx.globalAlpha = o.noStock ? 0 : (o.stock == null ? 0.8 : o.stock); ctx.beginPath(); ctx.arc(v[0], v[1], 8, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
    });
    // 미토콘드리아
    G.mit.forEach((m, i) => {
      ctx.save();
      if (o.glowMito) { ctx.shadowColor = 'rgba(250,204,21,.95)'; ctx.shadowBlur = 22 * (o.glowMito === true ? 1 : o.glowMito); }
      if (dim.mito) ctx.globalAlpha = 0.35;
      OD.mito(ctx, m.x, m.y, G.mitLen, G.mitWid, m.rot, { pal: P, cs: 9 });
      ctx.restore();
    });
    // 자유 리보솜 몇 개
    if (!o.pal) { [[300, 130], [330, 380], [250, 400], [470, 340], [480, 130]].forEach((q) => OD.ribo(ctx, q[0], q[1], 3.2, OD.PAL.rib)); }
    ctx.restore();
  }
  /* 하는 일 이름표 */
  function sceneLabels(o) {
    o = o || {};
    slab(G.nuc.x, G.nuc.y - G.nuc.r - 24, '핵', { size: 14 });
    const rp = [G.nuc.x + 150 * Math.cos(-0.75), G.nuc.y + 150 * Math.sin(-0.75)];
    slab(rp[0] + 52, rp[1] - 14, '거친 소포체');
    slab(G.gol.x, G.gol.y - 98, '골지체');
    slab(600, 112, '분비 소낭');
    slab(330, 487, '미토콘드리아');
    const mp = stT(G.memX, 52); D.label(mp[0], mp[1], '세포막', { bg: '#fde68a', color: '#78350f', size: 13 });
    const op = stT(G.memX + 44, 250); T(op[0], op[1] - 10, '세포 밖', 13, '#1d4f91', 'center', 800); T(op[0], op[1] + 8, '(혈액)', 13, '#1d4f91', 'center', 800);
  }

  /* ---------- ① 분비의 길 ---------- */
  const STAGES = [
    { nm: 'DNA', cap: '핵 안에서 <b>DNA</b>의 유전 정보를 mRNA로 옮겨 적어요(전사).', c: '핵' },
    { nm: 'mRNA', cap: '<b>mRNA</b>가 핵공을 지나 세포질로 나가요.', c: '핵공' },
    { nm: '리보솜', cap: '거친 소포체에 붙은 <b>리보솜</b>이 mRNA를 읽어 단백질 사슬을 만들어요(번역).', c: '리보솜' },
    { nm: '소포체', cap: '합성되는 사슬이 <b>소포체 안</b>으로 들어가 접히고 당이 붙어요.', c: '소포체' },
    { nm: '소낭', cap: '소포체 가장자리에서 <b>수송 소낭</b>이 떨어져 나가 골지체로 가요.', c: '수송 소낭' },
    { nm: '골지체', cap: '<b>골지체</b>에서 단백질을 가공 · 분류 · 포장해요.', c: '골지체' },
    { nm: '분비 소낭', cap: '골지체에서 <b>분비 소낭</b>이 떨어져 나가 세포막으로 가요.', c: '분비 소낭' },
    { nm: '세포 밖', cap: '분비 소낭이 <b>세포막과 융합</b>해 내용물을 세포 밖으로 내보내요(세포 외 배출).', c: '세포막' },
  ];
  const WP = [[0, 118, 226], [1, 212, 236], [2, 228, 200], [3, 238, 198], [3.5, 228, 284], [4, 232, 338], [4.5, 300, 312], [5, 362, 252], [5.5, 410, 240], [6, 470, 240], [6.5, 580, 240], [6.8, 672, 238], [7, 722, 238]];
  function wpAt(p) {
    p = clamp(p, 0, 7);
    for (let i = 1; i < WP.length; i++) if (p <= WP[i][0]) { const a = WP[i - 1], b = WP[i], u = (p - a[0]) / (b[0] - a[0]); return [a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u]; }
    return [WP[WP.length - 1][1], WP[WP.length - 1][2]];
  }
  S.sp = { p: 0, tp: 0, send: false, sentDone: false, visited: {}, flash: 0, atp: 0, released: 0 };
  function spSet(n) { const k = S.sp; k.tp = clamp(n, 0, 7); k.send = false; k.visited[Math.round(k.tp)] = true; Sound.click(); updateCtl(); }
  function spSend() { const k = S.sp; k.p = 0; k.tp = 7; k.send = true; k.sentDone = false; k.visited = { 0: true }; k.released = 0; Sound.click(); updateCtl(); }
  function spReset() { const k = S.sp; k.p = 0; k.tp = 0; k.send = false; k.sentDone = false; k.visited = { 0: true }; k.released = 0; parts.clear(); updateCtl(); }
  const stageNow = () => Math.round(S.sp.p);
  function drawGlob(x, y, s, col, o) {
    o = o || {}; ctx.save(); ctx.translate(x, y); ctx.scale(s, s); if (o.alpha != null) ctx.globalAlpha = o.alpha;
    [[-5, 2, 7], [4, -4, 7.5], [5, 5, 6.5], [-3, -6, 5.5]].forEach(([dx, dy, r]) => { D.sphere(dx, dy, r, col, { gloss: false }); });
    if (o.sugar) { ctx.fillStyle = '#22c55e'; ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; ctx.lineTo(11 + Math.cos(a) * 3.5, -8 + Math.sin(a) * 3.5); } ctx.fill(); ctx.fillStyle = '#16a34a'; ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; ctx.lineTo(-11 + Math.cos(a) * 3.5, 8 + Math.sin(a) * 3.5); } ctx.fill(); }
    ctx.restore();
  }
  function drawDNA(x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.lineWidth = 2.4; for (let k = 0; k < 2; k++) { ctx.strokeStyle = k ? '#14b8a6' : '#7c3aed'; ctx.beginPath(); for (let i = 0; i <= 24; i++) { const u = i / 24 * 30 - 15, yy = Math.sin(i / 24 * TAU * 1.6 + k * Math.PI) * 7; if (i) ctx.lineTo(u, yy); else ctx.moveTo(u, yy); } ctx.stroke(); }
    ctx.strokeStyle = 'rgba(100,116,139,.7)'; ctx.lineWidth = 1.4; for (let i = 1; i < 12; i++) { const u = i / 12 * 30 - 15, a = Math.sin(i / 12 * TAU * 1.6) * 7; ctx.beginPath(); ctx.moveTo(u, a); ctx.lineTo(u, -a); ctx.stroke(); }
    ctx.restore();
  }
  function drawMRNA(x, y, len, rot, col) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot || 0); ctx.strokeStyle = col || '#f59e0b'; ctx.lineWidth = 3.4; ctx.lineCap = 'round'; ctx.beginPath();
    for (let i = 0; i <= 20; i++) { const u = -len / 2 + len * i / 20, v = Math.sin(i * 0.9) * 4; if (i) ctx.lineTo(u, v); else ctx.moveTo(u, v); } ctx.stroke(); ctx.restore();
  }
  /* 지금 단계(p)의 화물 그리기. 장면 좌표(변환 안)에서 호출 */
  function drawCargo(p, t) {
    const pos = wpAt(p), x = pos[0], y = pos[1];
    drawDNA(106, 218, 1.1);
    if (p < 0.08) return;
    if (p < 2) {   // mRNA
      const a = clamp((p - 0.08) / 0.4, 0, 1); ctx.globalAlpha = a; drawMRNA(x, y, 26 + 8 * Math.sin(t * 4), p < 1 ? -0.3 : -0.6); ctx.globalAlpha = 1;
      D.label(x + 4, y - 20, 'mRNA', { bg: '#f59e0b', color: '#fff', size: 11 });
    } else if (p < 3) {   // 리보솜에서 번역 : 사슬이 자라요
      const g = (p - 2); OD.ribo2(ctx, 228, 200, 6, 1, 0.62, '#4a6fc0'); drawMRNA(222, 187, 30, -0.4);
      const n = Math.round(g * 8); for (let i = 0; i < n; i++) D.sphere(236 + i * 4.2, 206 + i * 1.4, 3.6, PROT, { gloss: false });
    } else if (p < 3.85) {   // 소포체 안에서 접힘
      drawGlob(x, y, 0.9 + 0.15 * Math.sin(t * 6), PROT, { sugar: p > 3.4 });
    } else if (p < 4.95 || (p >= 5.75 && p < 6.85)) {   // 소낭에 실려서
      const big = p >= 5.75 ? 19 : 16;
      ctx.beginPath(); ctx.arc(x, y, big, 0, TAU); ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fill(); ctx.strokeStyle = p >= 5.75 ? '#d9822b' : '#3b8fc4'; ctx.lineWidth = 3; ctx.stroke();
      drawGlob(x, y, 0.8, p >= 5.75 ? '#a21caf' : PROT, { sugar: true });
    } else if (p < 5.75) {   // 골지체 안에서 가공: 색이 바뀌어요
      const u = clamp((p - 4.95) / 0.8, 0, 1); drawGlob(x, y, 0.95, C.mix(PROT, '#a21caf', u), { sugar: true });
      if (u > 0.2) { ctx.fillStyle = '#facc15'; ctx.beginPath(); ctx.arc(x + 14, y - 12, 4, 0, TAU); ctx.fill(); }
    } else {   // 세포 밖으로 방출
      const u = clamp((p - 6.85) / 0.15, 0, 1); ctx.fillStyle = 'rgba(217,70,239,.25)'; ctx.beginPath(); ctx.arc(G.memX, 238, 20 * (1 - u * 0.5), 0, TAU); ctx.fill();
      for (let i = 0; i < 4; i++) drawGlob(G.memX + 24 + u * (22 + i * 8), 238 + (i - 1.5) * 24 * u, 0.55, '#a21caf', { alpha: 0.4 + 0.6 * u });
    }
  }
  function pathDraw(dt, t) {
    const k = S.sp;
    const st0 = Math.round(k.p);
    if (k.send) { k.p = Math.min(7, k.p + dt * (RM ? 40 : 0.82)); k.tp = k.p; } else k.p = RM ? k.tp : approach(k.p, k.tp, dt, 3.2);
    if (Math.round(k.p) !== st0) updateCtl();
    if (Math.abs(k.p - k.tp) < 0.004) k.p = k.tp;
    const st = Math.round(k.p); k.visited[st] = true;
    if (k.send && k.p >= 7) { k.send = false; if (!k.sentDone) { k.sentDone = true; Sound.success(); const q = stT(G.memX + 40, 238); parts.burst(q[0], q[1], { count: 22, colors: ['#d946ef', '#facc15', '#38bdf8'], size: 3.5 }); updateCtl(); } }
    const T0 = sceneT(PA); S.tr = T0;
    drawScene(T0, { glowMito: 0.8 + 0.2 * Math.sin(t * 5) });
    ctx.save(); ctx.translate(T0.ox, T0.oy); ctx.scale(T0.s, T0.s);
    // ATP 입자: 미토콘드리아 → 지금 일하는 곳
    const cp = wpAt(k.p), mi = G.mit[st <= 2 ? 0 : st <= 5 ? 1 : 2];
    if (!RM) for (let i = 0; i < 3; i++) { const u = ((t * 0.7 + i / 3) % 1), ax = mi.x + (cp[0] - mi.x) * u, ay = mi.y + (cp[1] - mi.y) * u; ctx.globalAlpha = Math.sin(u * Math.PI); D.sphere(ax, ay, 6.5, '#facc15', { gloss: false, text: 'ATP', textScale: 0.62 }); ctx.globalAlpha = 1; }
    drawCargo(k.p, t);
    ctx.restore();
    sceneLabels();
    D.label(PA.x + 12, PA.y + 20, '이자 세포 (인슐린을 분비하는 세포)', { bg: 'rgba(255,255,255,.92)', color: '#334155', size: 13, align: 'left', border: '#e2e8f0' });
    const gp = stT(G.gol.x, G.gol.y + 92); T(gp[0], gp[1], '시스 → 트랜스', 12.5, '#b45309', 'center', 800);
    // 설명 패널
    panel(CAP.x, CAP.y, CAP.w, CAP.h, 16, '#ffffff');
    const sg = clamp(st, 0, 7), S0 = STAGES[sg];
    T(CAP.x + 16, CAP.y + 28, (sg + 1) + ' / 8 · ' + S0.nm, 16, '#a21caf', 'left', 800);
    textBlock(CAP.x + 16, CAP.y + 54, CAP.w - 32, S0.cap.replace(/<\/?b>/g, ''), L(15.5, 15), '#334155', L(22, 21), 800);
    T(CAP.x + 16, CAP.y + CAP.h - 14, '⚡ 이 모든 과정에는 미토콘드리아가 만든 ATP가 필요해요.', 13.5, '#b45309', 'left', 800);
    // 단계 진행 점
    for (let i = 0; i < 8; i++) { const cx = CAP.x + CAP.w - 24 - (7 - i) * 22, cy = CAP.y + 22; ctx.beginPath(); ctx.arc(cx, cy, i === sg ? 7 : 5, 0, TAU); ctx.fillStyle = i < sg ? '#a21caf' : i === sg ? '#facc15' : '#e2e8f0'; ctx.fill(); }
    if (PHONE) {   // 휴대전화: 캔버스 안 버튼
      PBT.forEach((b) => { D.roundRect(b.x, b.y, b.w, b.h, 12); ctx.fillStyle = b.k === 'send' ? '#2563eb' : '#fff'; ctx.fill(); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; ctx.stroke(); TF(b.x + b.w / 2, b.y + b.h / 2 + 5, b.t, b.w - 8, 14, 12, b.k === 'send' ? '#fff' : '#26324a', 'center', 800); });
    }
  }
  const PBT = PHONE ? [{ k: 'prev', t: '◀ 이전', x: CAP.x + 10, y: CAP.y + 170, w: 110, h: 48 }, { k: 'next', t: '다음 ▶', x: CAP.x + 130, y: CAP.y + 170, w: 110, h: 48 }, { k: 'send', t: '🚀 한 번에', x: CAP.x + 250, y: CAP.y + 170, w: 200, h: 48 }] : [];
  const pathPT = {
    down(p) { const b = PBT.find((q) => inRect(p.x, p.y, q)); if (!b) return false; if (b.k === 'prev') spSet(Math.round(S.sp.tp) - 1); else if (b.k === 'next') spSet(Math.round(S.sp.tp) + 1); else spSend(); return true; },
    hover(p) { return PBT.some((q) => inRect(p.x, p.y, q)) ? 'pointer' : 'default'; },
  };

  /* ---------- 분비 순서 맞추기 ---------- */
  const ORD_ITEMS = [
    { id: 5, t: '골지체에서 가공 · 분류 · 포장해요' }, { id: 2, t: '리보솜이 mRNA를 읽어 사슬을 만들어요' }, { id: 7, t: '세포막과 융합해 세포 밖으로 내보내요' }, { id: 0, t: '핵에서 DNA 정보를 mRNA로 옮겨 적어요' },
    { id: 4, t: '수송 소낭이 소포체에서 떨어져 나가요' }, { id: 1, t: 'mRNA가 핵공을 지나 세포질로 나가요' }, { id: 6, t: '분비 소낭이 골지체에서 떨어져 나가요' }, { id: 3, t: '사슬이 소포체 안으로 들어가 접혀요' },
  ];
  S.ord = { seq: [] };
  function ordRender() {
    const pool = $('#ordPool'), seq = $('#ordSeq'); pool.innerHTML = ''; seq.innerHTML = '';
    ORD_ITEMS.forEach((it) => {
      const used = S.ord.seq.indexOf(it.id) >= 0, b = document.createElement('button'); b.type = 'button'; b.className = 'pk-item'; b.textContent = it.t; b.disabled = used;
      b.addEventListener('click', () => { if (S.ord.seq.indexOf(it.id) < 0) { S.ord.seq.push(it.id); Sound.click(); ordRender(); updateCtl(); } });
      pool.appendChild(b);
    });
    S.ord.seq.forEach((id, i) => {
      const it = ORD_ITEMS.find((q) => q.id === id), b = document.createElement('button'); b.type = 'button'; b.className = 'pk-chip'; b.innerHTML = '<b>' + (i + 1) + '</b>' + it.t;
      b.addEventListener('click', () => { S.ord.seq.splice(i, 1); Sound.click(); ordRender(); updateCtl(); });
      seq.appendChild(b);
    });
  }
  const ordOk = () => S.ord.seq.length === 8 && S.ord.seq.every((v, i) => v === i);
  function ordDraw(dt, t) {
    const T0 = sceneT(PA); S.tr = T0;
    drawScene(T0, { glowMito: 0.5 }); sceneLabels();
    S.ord.seq.forEach((id, i) => { const w = wpAt(id === 4 ? 4.5 : id === 7 ? 6.9 : id === 6 ? 6.4 : id), q = stT(w[0], w[1] - 30); ctx.beginPath(); ctx.arc(q[0], q[1], 13, 0, TAU); ctx.fillStyle = '#a21caf'; ctx.fill(); T(q[0], q[1] + 5.5, String(i + 1), 16, '#fff', 'center', 800); });
    panel(CAP.x, CAP.y, CAP.w, CAP.h, 16, '#ffffff');
    T(CAP.x + 16, CAP.y + 30, '단백질이 거치는 8단계를 순서대로 눌러요', 16, '#334155', 'left', 800);
    textBlock(CAP.x + 16, CAP.y + 56, CAP.w - 32, '오른쪽(아래) 단계 설명을 차례로 누르면 그림 위에 번호가 붙어요. 번호가 이어진 길이 분비의 길이에요. (놓은 설명 ' + S.ord.seq.length + ' / 8)', 14, '#64748b', 20, 700);
  }


  /* =========================================================
     ② 추적 실험 (자기방사법: 펄스 - 체이스)
     ========================================================= */
  const TIMES = [3, 20, 40, 120];
  const QUOTA = { 3: [90, 5, 0, 0, 5], 20: [20, 65, 10, 0, 5], 40: [5, 25, 60, 5, 5], 120: [3, 5, 20, 67, 5] };   // 거친 소포체 · 골지체 · 분비 소낭 · 세포 밖 · 기타 (%)
  const RC = ['rer', 'gol', 'ves', 'out', 'oth'];
  const RNAME = { rer: '거친 소포체', gol: '골지체', ves: '분비 소낭', out: '세포 밖', oth: '기타' };
  const RCOL = { rer: '#3b8fc4', gol: '#d9822b', ves: '#c026d3', out: '#16a34a', oth: '#94a3b8' };
  const EM = PHONE ? { x: 10, y: 10, w: 460, h: 300 } : { x: 14, y: 14, w: 520, h: 330 };
  const BAR = PHONE ? { x: 10, y: 320, w: 460, h: 190 } : { x: 546, y: 14, w: 240, h: 330 };
  const TLN = PHONE ? { x: 10, y: 518, w: 460, h: 112 } : { x: 14, y: 354, w: 772, h: 192 };
  /* 은 알갱이 위치 (장면 좌표) : 구획별로 미리 뽑아 둬요 */
  const GRAINS = (() => {
    const r = OD.rng(77), gs = [];
    const inRer = () => { for (let i = 0; i < 50; i++) { const rad = 100 + r() * 70, a = G.rer.a0 + 0.05 + r() * (G.rer.a1 - G.rer.a0 - 0.1); const x = G.nuc.x + Math.cos(a) * rad, y = G.nuc.y + Math.sin(a) * rad; if (Math.hypot(x - G.nuc.x, y - G.nuc.y) > G.nuc.r + 10) return [x, y]; } return [G.nuc.x + 140, G.nuc.y]; };
    const inGol = () => [G.gol.x - 54 + r() * 108, G.gol.y - 66 + r() * 132];
    const inVes = () => { const v = G.ves[Math.floor(r() * G.ves.length)], a = r() * TAU, d = Math.sqrt(r()) * 12; return [v[0] + Math.cos(a) * d, v[1] + Math.sin(a) * d]; };
    const inOut = () => [G.memX + 16 + r() * 66, 40 + r() * 420];
    const inOth = () => { for (let i = 0; i < 80; i++) { const x = 40 + r() * 620, y = 330 + r() * 150; if (!G.mit.some((m) => Math.hypot(x - m.x, y - m.y) > 0 && Math.abs(x - m.x) < 52 && Math.abs(y - m.y) < 30)) return [x, y]; } return [300, 380]; };
    for (let i = 0; i < 100; i++) gs.push({ i, pos: { rer: inRer(), gol: inGol(), ves: inVes(), out: inOut(), oth: inOth() }, x: 0, y: 0, init: false });
    return gs;
  })();
  S.rd = { t: 3, seen: { 3: true }, auto: false, at: 0, bar: [90, 5, 0, 0, 5], tl: 0 };
  function grainComp(i, t) {
    if (i >= 95) return 'oth';
    const q = QUOTA[t], o = q[3], v = q[2], g = q[1];
    return i < o ? 'out' : i < o + v ? 'ves' : i < o + v + g ? 'gol' : 'rer';
  }
  function radSet(t) { S.rd.t = t; S.rd.seen[t] = true; S.rd.auto = false; Sound.click(); updateCtl(); }
  function radReset() { S.rd.t = 3; S.rd.seen = { 3: true }; S.rd.auto = false; S.rd.at = 0; GRAINS.forEach((g) => { g.init = false; }); ['rd0', 'rd1', 'rd2', 'rd3'].forEach((id) => { const e = $('#' + id); if (e) { e.value = ''; e.className = ''; } }); updateCtl(); }
  const RAD_ANS = { 3: 'rer', 20: 'gol', 40: 'ves', 120: 'out' };
  const radAnsOk = () => TIMES.every((t, i) => { const e = $('#rd' + i); return e && e.value === RAD_ANS[t]; });
  function radDraw(dt, t) {
    const k = S.rd;
    if (k.auto) { k.at += dt; if (k.at > 2.4) { k.at = 0; const i = TIMES.indexOf(k.t); if (i < 3) { k.t = TIMES[i + 1]; k.seen[k.t] = true; updateCtl(); } else k.auto = false; } }
    // EM 사진 (회색, 장면을 줄여서)
    const Tz = sceneT(EM); S.tr = Tz;
    D.shadow(() => { D.roundRect(EM.x, EM.y, EM.w, EM.h, 16); ctx.fillStyle = '#d6d6d6'; ctx.fill(); }, { blur: 10, y: 3 });
    ctx.save(); D.roundRect(EM.x, EM.y, EM.w, EM.h, 16); ctx.clip();
    ctx.fillStyle = '#d6d6d6'; ctx.fillRect(EM.x, EM.y, EM.w, EM.h);
    drawScene(Tz, { pal: PGRAY, noStock: false, glowMito: 0 });
    ctx.save(); ctx.translate(Tz.ox, Tz.oy); ctx.scale(Tz.s, Tz.s);
    GRAINS.forEach((g) => {
      const c = grainComp(g.i, k.t), p = g.pos[c];
      if (!g.init) { g.x = p[0]; g.y = p[1]; g.init = true; }
      g.x = RM ? p[0] : approach(g.x, p[0], dt, 3.2); g.y = RM ? p[1] : approach(g.y, p[1], dt, 3.2);
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(g.x, g.y, 5.2, 0, TAU); ctx.fill(); ctx.fillStyle = '#050505'; ctx.beginPath(); ctx.arc(g.x, g.y, 3.6, 0, TAU); ctx.fill();
    });
    ctx.restore(); ctx.restore();
    ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 2; D.roundRect(EM.x, EM.y, EM.w, EM.h, 16); ctx.stroke();
    D.label(EM.x + 12, EM.y + 22, '전자 현미경 사진 + 감광 유제 (' + k.t + '분)', { bg: 'rgba(0,0,0,.65)', color: '#fff', size: 13, align: 'left' });
    [['거친 소포체', G.nuc.x + 150, G.nuc.y - 120], ['골지체', G.gol.x, G.gol.y - 96], ['분비 소낭', 600, 112], ['세포 밖', G.memX + 44, 40]].forEach(([nm, x, y]) => { const q = stT(x, y); D.label(q[0], q[1], nm, { bg: 'rgba(255,255,255,.9)', color: '#334155', size: 12.5, border: '#cbd5e1' }); });
    // 막대그래프 (구획별 은 알갱이 비율 %)
    panel(BAR.x, BAR.y, BAR.w, BAR.h, 16, '#ffffff');
    T(BAR.x + 14, BAR.y + 26, '구획별 은 알갱이 비율 (%)', 14, '#334155', 'left', 800);
    const q = QUOTA[k.t], rowH = (BAR.h - 60) / 5, bx = BAR.x + (PHONE ? 110 : 96), bw = BAR.w - (PHONE ? 110 : 96) - 54;
    RC.forEach((c, i) => {
      k.bar[i] = RM ? q[i] : approach(k.bar[i], q[i], dt, 5); if (Math.abs(k.bar[i] - q[i]) < 0.05) k.bar[i] = q[i];
      const y = BAR.y + 44 + i * rowH, v = clamp(k.bar[i], 0, 100);
      T(BAR.x + 14, y + rowH / 2 + 4, RNAME[c], 13.5, '#334155', 'left', 800);
      ctx.fillStyle = '#eef2f7'; D.roundRect(bx, y + 6, bw, rowH - 14, 6); ctx.fill();
      if (v > 0.2) { ctx.fillStyle = RCOL[c]; D.roundRect(bx, y + 6, Math.max(2, bw * v / 100), rowH - 14, 6); ctx.fill(); }
      T(bx + bw + 8, y + rowH / 2 + 4, Math.round(k.bar[i]) + '%', 14, '#334155', 'left', 800);
    });
    // 펄스-체이스 시간선
    panel(TLN.x, TLN.y, TLN.w, TLN.h, 16, '#ffffff');
    T(TLN.x + 16, TLN.y + 26, '펄스 - 체이스: 짧게 표지한 뒤 표지 없는 아미노산으로 바꿔요', L(15, 13.5), '#334155', 'left', 800);
    const y0 = TLN.y + (PHONE ? 44 : 54), yc = y0 + (PHONE ? 38 : 52), sx = TLN.x + 16, ex = TLN.x + TLN.w - 16, w3 = (ex - sx) * 0.18;
    D.roundRect(sx, y0, w3, 26, 8); ctx.fillStyle = '#f97316'; ctx.fill(); TF(sx + w3 / 2, y0 + 18, PHONE ? '³H 3분' : '³H 아미노산 3분', w3 - 8, 13, 11, '#fff', 'center', 800);
    D.roundRect(sx + w3 + 4, y0, ex - sx - w3 - 4, 26, 8); ctx.fillStyle = '#60a5fa'; ctx.fill(); TF((sx + w3 + 4 + ex) / 2, y0 + 18, PHONE ? '비방사성 아미노산' : '표지 없는 아미노산으로 교체 (체이스)', ex - sx - w3 - 12, 13, 11, '#fff', 'center', 800);
    TIMES.forEach((tm, i) => {
      const x = sx + w3 / 2 + (ex - sx - w3 / 2 - 24) * i / 3, on = tm === k.t;
      ctx.beginPath(); ctx.arc(x, yc, on ? 10 : 7, 0, TAU); ctx.fillStyle = on ? '#a21caf' : k.seen[tm] ? '#c4b5fd' : '#cbd5e1'; ctx.fill();
      T(x, yc + (PHONE ? 26 : 30), tm + '분', 13.5, on ? '#a21caf' : '#64748b', 'center', 800);
      if (i) { ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 2; const xp = sx + w3 / 2 + (ex - sx - w3 / 2 - 24) * (i - 1) / 3; ctx.beginPath(); ctx.moveTo(xp + 10, yc); ctx.lineTo(x - 10, yc); ctx.stroke(); }
    });
    if (!PHONE) T(TLN.x + 16, TLN.y + TLN.h - 18, '※ 감광 유제를 입힌 필름에서 방사선이 닿은 곳에 검은 은 알갱이가 생겨요. 시각마다 알갱이의 위치를 비교해요.', 13, '#64748b', 'left', 700);
  }


  /* =========================================================
     ③ 협력과 이상 : 소기관 하나를 고장 내면?
     ========================================================= */
  const SCN_NAMES = { mito: '미토콘드리아 억제', er: '소포체 이동 차단', gol: '골지체 기능 정지', nuc: '핵 기능 정지' };
  const PRED_ANS = ['slow', 'er', 'tv', 'less'];   // 미토콘드리아 억제 · 소포체 이동 차단 · 골지체 기능 정지 · 핵 기능 정지
  /* 구획별 자리 (장면 좌표) */
  const SLOTS = (() => {
    const er = [], tv = [], gl = [], sv = [];
    for (let a = 0; a < 3; a++) for (let k = 0; k < 11; k++) { const ang = -0.62 + (k / 10) * 1.38, R = G.rer.rad + a * G.rer.gap; er.push([G.nuc.x + Math.cos(ang) * R, G.nuc.y + Math.sin(ang) * R]); }
    for (let k = 0; k < 14; k++) { const u = k / 13, row = k % 2; tv.push([232 + u * 120 + row * 6, 338 - u * 78 + row * 12]); }
    for (let s = 0; s < 5; s++) for (let k = 0; k < 5; k++) gl.push([G.gol.x + (2 - s) * G.gol.gap - 0, G.gol.y - 52 + k * 26 + ((s % 2) ? 6 : 0)]);
    G.ves.forEach((v) => { sv.push([v[0], v[1]]); });
    G.ves.forEach((v) => { sv.push([v[0] + 5, v[1] + 5]); }); G.ves.forEach((v) => { sv.push([v[0] - 5, v[1] - 6]); });
    return { er, tv, gl, sv };
  })();
  const DWELL = { er: 1.7, tv: 1.3, gol: 1.9, sv: 1.6 };
  S.df = { scn: 'none', cargo: [], acc: 0, out: 0, t: 0, tried: {}, clock: 0, outDots: [], seq: 0 };
  function dfReset() {
    const d = S.df, keep = d.scn; d.cargo = []; d.acc = 0; d.out = 0; d.t = 0; d.outDots = []; d.seq = 0; d.scn = 'none';
    for (let i = 0; i < 150; i++) dfUpdate(0.1);   // 정상 상태까지 미리 돌려 둬요
    d.cargo.forEach((c) => { c.x = c.tx; c.y = c.ty; }); d.out = 0; d.t = 0; d.outDots = []; d.scn = keep; updateCtl();
  }
  function dfSet(s) { const d = S.df; d.scn = s; dfReset(); Sound.click(); }
  const dfAtp = () => (S.df.scn === 'mito' ? 0.25 : 1);
  function dfCount(st) { return S.df.cargo.filter((c) => c.st === st).length; }
  function dfUpdate(dt) {
    const d = S.df, atp = dfAtp(); d.t += dt; if (d.scn !== 'none' && d.t > 5) d.tried[d.scn] = true;
    d.acc += dt * (d.scn === 'nuc' ? 0 : 1.15) * atp;
    while (d.acc >= 1) { d.acc -= 1; if (dfCount('er') < 33 && d.cargo.length < 110) d.cargo.push({ st: 'er', tm: 0, x: 228, y: 200, seq: ++d.seq }); }
    d.cargo.forEach((c) => {
      c.tm += dt * atp;
      if (c.st === 'er' && c.tm >= DWELL.er && d.scn !== 'er') { c.st = 'tv'; c.tm = 0; c.seq = ++d.seq; }
      else if (c.st === 'tv' && c.tm >= DWELL.tv && d.scn !== 'gol') { c.st = 'gol'; c.tm = 0; c.seq = ++d.seq; }
      else if (c.st === 'gol' && c.tm >= DWELL.gol && d.scn !== 'gol') { c.st = 'sv'; c.tm = 0; c.seq = ++d.seq; }
      else if (c.st === 'sv' && c.tm >= DWELL.sv) { c.st = 'out'; c.tm = 0; d.out++; d.outDots.push({ x: G.memX + 20 + Math.random() * 60, y: 60 + Math.random() * 380, a: 1 }); if (d.outDots.length > 40) d.outDots.shift(); }
    });
    // 자리 배정
    ['er', 'tv', 'gol', 'sv'].forEach((st) => {
      const arr = d.cargo.filter((c) => c.st === st).sort((a, b) => a.seq - b.seq), sl = st === 'er' ? SLOTS.er : st === 'tv' ? SLOTS.tv : st === 'gol' ? SLOTS.gl : SLOTS.sv;
      arr.forEach((c, i) => { const q = sl[i % sl.length]; c.tx = q[0]; c.ty = q[1]; });
    });
    d.cargo.forEach((c) => { if (c.st === 'out') { c.tx = G.memX + 30; c.ty = 240; c.x = approach(c.x, c.tx, dt, 6); c.y = approach(c.y, c.ty, dt, 6); } else { c.x = approach(c.x, c.tx == null ? c.x : c.tx, dt, 4); c.y = approach(c.y, c.ty == null ? c.y : c.ty, dt, 4); } });
    d.cargo = d.cargo.filter((c) => !(c.st === 'out' && Math.hypot(c.x - c.tx, c.y - c.ty) < 6));
  }
  function defectDraw(dt, t) {
    const d = S.df; dfUpdate(dt);
    const T0 = sceneT(PA); S.tr = T0;
    const dim = { mito: d.scn === 'mito', er: d.scn === 'er', gol: d.scn === 'gol', nuc: d.scn === 'nuc' };
    drawScene(T0, { dim: {}, glowMito: d.scn === 'mito' ? 0.15 : 0.8, stock: 0.5 });
    ctx.save(); ctx.translate(T0.ox, T0.oy); ctx.scale(T0.s, T0.s);
    // 소포체 가장자리의 수송 소낭 자리
    d.cargo.forEach((c) => {
      if (c.st === 'tv') { ctx.beginPath(); ctx.arc(c.x, c.y, 11, 0, TAU); ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fill(); ctx.strokeStyle = '#3b8fc4'; ctx.lineWidth = 2; ctx.stroke(); }
      D.sphere(c.x, c.y, c.st === 'tv' ? 6 : 6.5, PROT, { gloss: false });
    });
    d.outDots.forEach((o) => { D.sphere(o.x, o.y, 5.5, '#a21caf', { gloss: false }); });
    // 고장 표시
    const mark = (x, y) => { ctx.save(); ctx.strokeStyle = '#e2464b'; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x - 16, y - 16); ctx.lineTo(x + 16, y + 16); ctx.moveTo(x + 16, y - 16); ctx.lineTo(x - 16, y + 16); ctx.stroke(); ctx.restore(); };
    if (d.scn === 'nuc') mark(G.nuc.x, G.nuc.y);
    if (d.scn === 'gol') mark(G.gol.x, G.gol.y);
    if (d.scn === 'er') mark(G.nuc.x + 130, G.nuc.y + 100);
    if (d.scn === 'mito') G.mit.forEach((m) => mark(m.x, m.y));
    ctx.restore();
    sceneLabels();
    // 구획별 개수 표시
    [['er', 'er', 170, 380], ['tv', 'tv', 322, 372], ['gol', 'gol', 450, 352], ['sv', 'sv', 604, 398]].forEach(([k, st, x, y]) => { const n = dfCount(st), q = stT(x, y); D.label(q[0], q[1], { er: '소포체 ', tv: '수송 소낭 ', gol: '골지체 ', sv: '분비 소낭 ' }[k] + n, { bg: n >= 12 ? '#fee2e2' : '#ffffff', color: n >= 12 ? '#b91c1c' : '#334155', size: 13, border: n >= 12 ? '#fca5a5' : '#cbd5e1' }); });
    // 설명 패널
    panel(CAP.x, CAP.y, CAP.w, CAP.h, 16, '#ffffff');
    const atp = dfAtp(), rate = d.t > 3 ? d.out / d.t * 60 : 0;
    T(CAP.x + 16, CAP.y + 28, d.scn === 'none' ? '정상 상태' : '고장: ' + SCN_NAMES[d.scn], 16, d.scn === 'none' ? '#15803d' : '#b91c1c', 'left', 800);
    T(CAP.x + 16, CAP.y + 54, '분비된 단백질 ' + d.out + '개 · ' + (d.t > 3 ? '분당 약 ' + rate.toFixed(0) + '개' : '재는 중…'), 14.5, '#334155', 'left', 800);
    // ATP 막대
    T(CAP.x + 16, CAP.y + (PHONE ? 86 : 82), 'ATP 공급', 13.5, '#b45309', 'left', 800);
    ctx.fillStyle = '#fef3c7'; D.roundRect(CAP.x + 92, CAP.y + (PHONE ? 72 : 68), 130, 16, 8); ctx.fill(); ctx.fillStyle = '#f59e0b'; D.roundRect(CAP.x + 92, CAP.y + (PHONE ? 72 : 68), 130 * atp, 16, 8); ctx.fill();
    T(CAP.x + 230, CAP.y + (PHONE ? 86 : 82), Math.round(atp * 100) + '%', 13.5, '#b45309', 'left', 800);
    if (!PHONE) textBlock(CAP.x + 300, CAP.y + 28, CAP.w - 316, d.scn === 'none' ? '단백질이 막힘 없이 흘러 세포 밖으로 나가요.' : '고장 난 소기관 앞쪽에 단백질이 어디까지 쌓이는지 살펴봐요.', 14, '#64748b', 20, 700);
    else textBlock(CAP.x + 16, CAP.y + 112, CAP.w - 32, d.scn === 'none' ? '단백질이 막힘 없이 흘러 세포 밖으로 나가요.' : '고장 난 소기관 앞쪽에 단백질이 어디까지 쌓이는지 살펴봐요.', 14, '#64748b', 20, 700);
  }
  const prSel = (i) => ($('#pr' + i) || {}).value || '';
  const prCount = () => [0, 1, 2, 3].filter((i) => prSel(i) === PRED_ANS[i]).length;
  const triedCount = () => Object.keys(S.df.tried).length;
  function predictDraw(dt, t) {
    // 장면 위에 '고장 후보'를 보여 주기만 해요
    const T0 = sceneT(PA); S.tr = T0;
    drawScene(T0, { glowMito: 0.6 }); sceneLabels();
    panel(CAP.x, CAP.y, CAP.w, CAP.h, 16, '#ffffff');
    T(CAP.x + 16, CAP.y + 30, '소기관 하나가 고장 나면 어떤 일이 생길까요?', 16, '#334155', 'left', 800);
    textBlock(CAP.x + 16, CAP.y + 56, CAP.w - 32, '아래(오른쪽) 표에서 고장마다 단백질이 어디에 쌓일지 예측해요. 그 뒤 🔧 고장 실험에서 확인해요. (확인한 고장 ' + triedCount() + ' / 4)', 14, '#64748b', 20, 700);
  }

  /* ----- 릴레이 카드 ----- */
  const RELAY = [
    { id: 'nuc', label: '핵', sub: 'mRNA를 만들어 내보내요', col: '#6d4fb3' },
    { id: 'rib', label: '리보솜', sub: 'mRNA를 읽어 사슬을 만들어요', col: '#2f4f8f' },
    { id: 'rer', label: '소포체', sub: '사슬을 접고 소낭에 실어요', col: '#3b8fc4' },
    { id: 'gol', label: '골지체', sub: '가공 · 분류 · 포장해요', col: '#d9822b' },
    { id: 'sv', label: '분비 소낭', sub: '세포막과 융합해 내보내요', col: '#c026d3' },
    { id: 'mit', label: '미토콘드리아', sub: 'ATP를 만들어 대요', col: '#d9622b' },
  ];
  const RLORDER = ['nuc', 'rib', 'rer', 'gol', 'sv', 'mit'];
  const RLB = PHONE ? { x: 10, y: 10, w: 460, h: 270 } : { x: 14, y: 14, w: 772, h: 214 };
  const relay = new Sorter({
    cards: [RELAY[3], RELAY[0], RELAY[5], RELAY[2], RELAY[4], RELAY[1]].map((c) => ({ id: c.id, label: c.label, sub: c.sub, col: c.col })),
    boxes: RLORDER.map((id, i) => {
      const cols = PHONE ? 2 : 3, gap = 8, bw = (RLB.w - gap * (cols - 1)) / cols, bh = PHONE ? 82 : 100, c = i % cols, r = Math.floor(i / cols);
      return { id: 's' + i, label: i < 5 ? (i + 1) + '번 주자' : '에너지 공급', col: i < 5 ? '#a21caf' : '#d97706', x: RLB.x + c * (bw + gap), y: RLB.y + r * (bh + gap), w: bw, h: bh, cols: 1, hdr: 26 };
    }),
    cw: PHONE ? 214 : 240, ch: PHONE ? 52 : 56, kh: PHONE ? 50 : 54,
    tray: (i) => (PHONE ? { x: 12 + (i % 2) * 234, y: 310 + Math.floor(i / 2) * 64 } : { x: 28 + (i % 3) * 252, y: 332 + Math.floor(i / 3) * 70 }),
    onChange() { updateCtl(); },
  });
  const relayWrong = () => relay.cards.filter((c) => c.zone && c.zone !== 's' + RLORDER.indexOf(c.id));
  const relayDup = () => relay.boxes.some((b) => relay.cards.filter((c) => c.zone === b.id).length > 1);
  function relayDraw(dt, t) {
    relay.update(dt); relay.drawBoxes();
    const y0 = PHONE ? 290 : 240, hh = PHONE ? 340 : 306, xx = PHONE ? 10 : 14, ww = PHONE ? 460 : 772;
    panel(xx, y0, ww, hh, 16, '#ffffff');
    T(xx + 16, y0 + 28, '단백질 릴레이: 내가 하는 일 → 다음 주자에게 넘기는 것', L(16, 13.5), '#334155', 'left', 800);
    relay.drawCards();
  }
  const relayPT = { down: (p) => relay.down(p), move: (p) => relay.move(p), up: (p) => relay.up(p), hover: (p) => relay.hover(p) };


  /* =========================================================
     ④ 세포의 특징 : 소기관 발달 정도로 하는 일 추론하기
     ========================================================= */
  const PF_ORG = [['rer', '거친 소포체', '#3b8fc4'], ['gol', '골지체', '#d9822b'], ['mit', '미토콘드리아', '#d9622b'], ['ser', '매끈 소포체', '#2a9d8f'], ['chl', '엽록체', '#3f9b3a']];
  const PF_BOX = [
    { id: 'rg', label: '거친 소포체 · 골지체', col: '#a21caf', lv: [4, 4, 2, 1, 0] },
    { id: 'mit', label: '미토콘드리아', col: '#d9622b', lv: [1, 1, 4, 1, 0] },
    { id: 'ser', label: '매끈 소포체', col: '#2a9d8f', lv: [1, 1, 3, 4, 0] },
    { id: 'chl', label: '엽록체 · 큰 액포', col: '#3f9b3a', lv: [1, 1, 2, 0, 4] },
  ];
  const PF_CARDS = [
    { id: 'pancreas', label: '이자 샘세포', short: '이자 샘세포', sub: '소화 효소 · 인슐린 분비', ans: 'rg' },
    { id: 'muscle', label: '근육 세포', short: '근육 세포', sub: '수축에 에너지를 많이 써요', ans: 'mit' },
    { id: 'liver', label: '간세포', short: '간세포', sub: '독성 물질 해독 · 지질 합성', ans: 'ser' },
    { id: 'leaf', label: '식물 잎살 세포', short: '잎살 세포', sub: '광합성으로 포도당 생산', ans: 'chl' },
    { id: 'saliva', label: '침샘 세포', short: '침샘 세포', sub: '침 속 소화 효소 분비', ans: 'rg' },
    { id: 'plasma', label: '항체 만드는 형질세포', short: '형질세포', sub: '항체 단백질을 분비', ans: 'rg' },
  ];
  const PFB = PHONE ? { x: 10, y: 10, w: 460, h: 408 } : { x: 14, y: 14, w: 772, h: 290 };
  const profile = new Sorter({
    cards: [PF_CARDS[4], PF_CARDS[1], PF_CARDS[3], PF_CARDS[0], PF_CARDS[2], PF_CARDS[5]].map((c) => ({ id: c.id, label: c.label, short: c.short, sub: c.sub, col: '#64748b' })),
    boxes: PF_BOX.map((b, i) => {
      const gap = 8;
      if (PHONE) { const bw = (PFB.w - gap) / 2, bh = (PFB.h - gap) / 2; return { id: b.id, label: b.label, col: b.col, x: PFB.x + (i % 2) * (bw + gap), y: PFB.y + Math.floor(i / 2) * (bh + gap), w: bw, h: bh, cols: 1, hdr: 32, draw: pfBars(b) }; }
      const bw = (PFB.w - gap * 3) / 4; return { id: b.id, label: b.label, col: b.col, x: PFB.x + i * (bw + gap), y: PFB.y, w: bw, h: PFB.h, cols: 1, hdr: 32, draw: pfBars(b) };
    }),
    cw: PHONE ? 214 : 240, ch: PHONE ? 52 : 56, kh: PHONE ? 34 : 42,
    tray: (i) => (PHONE ? { x: 12 + (i % 2) * 234, y: 486 + Math.floor(i / 2) * 48 } : { x: 28 + (i % 3) * 252, y: 372 + Math.floor(i / 3) * 70 }),
    onChange() { updateCtl(); },
  });
  function pfBars(b) {
    return (bx) => {
      const n = 5, bwid = PHONE ? 22 : 24, sp = (bx.w - 20) / n, base = bx.y + bx.h - 14, mh = PHONE ? 46 : 60;
      b.lv.forEach((v, i) => {
        const x = bx.x + 10 + i * sp + (sp - bwid) / 2, h = mh * v / 4;
        ctx.fillStyle = 'rgba(148,163,184,.22)'; D.roundRect(x, base - mh, bwid, mh, 4); ctx.fill();
        if (h > 0) { ctx.fillStyle = PF_ORG[i][2]; D.roundRect(x, base - h, bwid, h, 4); ctx.fill(); }
      });
    };
  }
  const profWrong = () => profile.cards.filter((c) => c.zone && c.zone !== PF_CARDS.find((q) => q.id === c.id).ans);
  function profileDraw(dt, t) {
    profile.update(dt); profile.drawBoxes();
    const y0 = PHONE ? 424 : 314, xx = PHONE ? 10 : 14, ww = PHONE ? 460 : 772, hh = PHONE ? 206 : 232;
    panel(xx, y0, ww, hh, 16, '#ffffff');
    if (PHONE) {   // 범례 (두 줄)
      PF_ORG.forEach((o, i) => { const lx = xx + 12 + (i % 3) * 150, ly = y0 + 22 + Math.floor(i / 3) * 22; ctx.fillStyle = o[2]; D.roundRect(lx, ly - 10, 14, 14, 3); ctx.fill(); T(lx + 20, ly + 2, o[1], 13, '#334155', 'left', 800); });
      T(xx + 12, y0 + 70, '상자 속 막대 = 소기관이 발달한 정도', 13, '#64748b', 'left', 700);
    } else {
      T(xx + 16, y0 + 26, '상자 속 막대: 소기관이 발달한 정도', 14, '#334155', 'left', 800);
      let lx = xx + 270; PF_ORG.forEach((o) => { const ly = y0 + 22; ctx.fillStyle = o[2]; D.roundRect(lx, ly - 10, 12, 12, 3); ctx.fill(); T(lx + 17, ly + 1, o[1], 13, '#334155', 'left', 800); ctx.font = D.font(13, 800); lx += 17 + ctx.measureText(o[1]).width + 16; });
    }
    profile.drawCards();
  }
  const profilePT = { down: (p) => profile.down(p), move: (p) => profile.move(p), up: (p) => profile.up(p), hover: (p) => profile.hover(p) };

  /* =========================================================
     화면 전환 · 조작 연결
     ========================================================= */
  function setMode(m) {
    if (S.mode !== m) S.fade = 1;
    S.mode = m;
    PT = { path: pathPT, order: null, rad: null, predict: null, defect: null, relay: relayPT, profile: profilePT }[m] || null;
    if (m === 'defect' && S.df.cargo.length === 0) dfReset();
    hideHint(); updateCtl();
  }
  const ctlNodes = $$('#ctrlCard .control');
  function updateCtl() {
    const fr = game ? game.free : false, lvNow = game ? game.level : 0;
    ctlNodes.forEach((n) => { n.hidden = (n.dataset.modes || '').split(' ').indexOf(S.mode) < 0; });
    modeButtons(S.mode, lvNow, fr);
    const k = S.sp;
    $$('#stgSeg button').forEach((b) => { const i = +b.dataset.v; b.classList.toggle('on', i === Math.round(k.tp)); b.classList.toggle('seen', !!k.visited[i]); });
    $('#stgPrev').disabled = Math.round(k.tp) <= 0 || k.send; $('#stgNext').disabled = Math.round(k.tp) >= 7 || k.send; $('#stgSend').disabled = k.send;
    $('#stgNote').innerHTML = '지금 <b>' + (Math.round(k.tp) + 1) + ' / 8</b> · ' + STAGES[Math.round(k.tp)].nm + (k.sentDone ? ' · ✅ 한 번에 보내기 완료' : '');
    $$('#timeSeg button').forEach((b) => { b.classList.toggle('on', +b.dataset.v === S.rd.t); b.classList.toggle('seen', !!S.rd.seen[+b.dataset.v]); });
    $('#radPlay').textContent = S.rd.auto ? '⏸ 재생 멈추기' : '▶ 자동 재생';
    $('#radNote').innerHTML = '살펴본 시각 <b>' + Object.keys(S.rd.seen).length + ' / 4</b>. 시각을 바꾸며 은 알갱이(검은 점)가 어디로 가는지 봐요.';
    [0, 1, 2, 3].forEach((i) => { const e = $('#rd' + i); if (e) e.classList.toggle('ok', e.value === RAD_ANS[TIMES[i]] && e.value !== ''); });
    $('#prNote').innerHTML = '맞게 예측한 것 <b>' + prCount() + ' / 4</b> · 확인해 본 고장 <b>' + triedCount() + ' / 4</b>';
    [0, 1, 2, 3].forEach((i) => { const e = $('#pr' + i); if (e) e.classList.toggle('ok', e.value === PRED_ANS[i]); });
    chipSet($('#dfSeg'), S.df.scn);
    $('#dfNote').innerHTML = S.df.scn === 'none' ? '고장 낼 소기관을 골라요. 확인한 고장 <b>' + triedCount() + ' / 4</b> (5초 이상 지켜봐요)' : '<b>' + SCN_NAMES[S.df.scn] + '</b> 중이에요. 단백질이 어디에 쌓이는지 지켜봐요. 확인한 고장 <b>' + triedCount() + ' / 4</b>';
  }
  bindModeSeg(setMode);
  $$('#stgSeg button').forEach((b) => b.addEventListener('click', () => spSet(+b.dataset.v)));
  $('#stgPrev').addEventListener('click', () => spSet(Math.round(S.sp.tp) - 1));
  $('#stgNext').addEventListener('click', () => spSet(Math.round(S.sp.tp) + 1));
  $('#stgSend').addEventListener('click', spSend);
  $('#stgReset').addEventListener('click', () => { Sound.click(); spReset(); });
  $('#ordReset').addEventListener('click', () => { Sound.click(); S.ord.seq = []; ordRender(); updateCtl(); });
  $$('#timeSeg button').forEach((b) => b.addEventListener('click', () => radSet(+b.dataset.v)));
  $('#radPlay').addEventListener('click', () => { Sound.click(); if (S.rd.auto) S.rd.auto = false; else { S.rd.auto = true; S.rd.at = 0; S.rd.t = 3; S.rd.seen[3] = true; } updateCtl(); });
  [0, 1, 2, 3].forEach((i) => { $('#rd' + i).addEventListener('change', () => { Sound.click(); updateCtl(); }); $('#pr' + i).addEventListener('change', () => { Sound.click(); updateCtl(); }); });
  $$('#dfSeg button').forEach((b) => b.addEventListener('click', () => dfSet(b.dataset.v)));
  $('#dfReset').addEventListener('click', () => { Sound.click(); dfReset(); });
  $('#rlReset').addEventListener('click', () => { Sound.click(); relay.reset(); });
  $('#pfReset').addEventListener('click', () => { Sound.click(); profile.reset(); });
  ordRender();

  /* =========================================================
     미션
     ========================================================= */
  const levels = [
    {
      title: '단백질이 가는 길', short: '분비의 길', icon: '🛤', phase: '모형',
      intro: '<p class="si-q">❓ 탐구 질문: 이자 세포에서 만들어진 인슐린은 세포 안에서 어떤 길을 지나 혈액으로 나갈까?</p><div class="si-link">🔗 <b>앞 차시</b>에서 소기관 10종의 구조와 기능을 배웠고, <b>통합과학</b>에서 DNA의 정보가 mRNA를 거쳐 단백질로 합성되는 것(번역)을 배웠어요.</div><p>이번에는 소기관들이 <b>한 팀</b>이 되어 단백질을 만들어 내보내는 과정을 따라가요. 핵 → 리보솜 → 소포체 → 소낭 → 골지체 → 분비 소낭 → 세포 밖, 이 길로 단백질이 이동하는 모습을 살펴봐요.</p>',
      features: ['path', 'order'],
      setup() { setMode('path'); spReset(); },
      recap: '분비 단백질은 핵(DNA → mRNA) → 핵공 → 거친 소포체의 리보솜(번역) → 소포체 → 수송 소낭 → 골지체(가공 · 분류 · 포장) → 분비 소낭 → 세포막과 융합해 세포 밖으로 나가요. 이 모든 과정에 미토콘드리아의 ATP가 필요해요.',
      summary: '<ul><li><b>분비 단백질의 길</b>: 핵(DNA → mRNA) → 핵공 → <b>거친 소포체의 리보솜</b>에서 번역(사슬이 소포체 안으로 들어가 접히고 당이 붙음) → <b>수송 소낭</b> → <b>골지체</b>에서 가공 · 분류 · 포장 → <b>분비 소낭</b> → 세포막과 융합하여 <b>세포 밖으로 배출</b>(세포 외 배출).</li><li>이 모든 과정에 <b>ATP</b>가 필요하고, 미토콘드리아가 공급해요.</li><li>세포질의 자유 리보솜에서 만든 단백질은 세포질 · 핵 · 미토콘드리아에서 쓰이고, 막 단백질도 같은 길로 세포막에 도착해요.</li></ul>',
      missions: [
        {
          id: 'order', title: '분비의 8단계 순서', manual: true,
          goal: '🔢 <b>순서 맞추기</b>에서 단백질이 거치는 8단계 설명을 순서대로 놓으세요.',
          hint: '핵 → 핵공 → 리보솜 → 소포체 안 → 수송 소낭 → 골지체 → 분비 소낭 → 세포막 순서예요. 먼저 🛤 분비의 길에서 단계를 눌러 보면 도움이 돼요.',
          setup() { setMode('order'); S.ord.seq = []; ordRender(); },
          status: () => mark(S.ord.seq.length === 8) + ' 놓은 설명 ' + S.ord.seq.length + ' / 8',
          check() {
            if (S.ord.seq.length < 8) return '8단계를 모두 놓아 주세요. (' + S.ord.seq.length + ' / 8)';
            if (ordOk()) return true;
            const i = S.ord.seq.findIndex((v, k) => v !== k); return (i + 1) + '번째 칸이 맞지 않아요. 그림에서 단백질이 지나가는 길을 다시 따라가 보세요.';
          },
          explain: '핵에서 만든 <b>mRNA</b>가 핵공을 지나고, <b>거친 소포체의 리보솜</b>에서 번역되며 사슬이 소포체 안으로 들어가요. 그다음 <b>수송 소낭</b> → <b>골지체</b> → <b>분비 소낭</b> → 세포막과 융합해 세포 밖으로 나가요.',
        },
        {
          id: 'send', title: '길 따라 한 번 보내기',
          goal: '🛤 <b>분비의 길</b>에서 <b>🚀 한 번에 보내기</b>를 눌러 단백질이 세포 밖으로 나갈 때까지 지켜보세요.',
          hint: '🚀 한 번에 보내기 버튼을 누르면 단백질이 처음부터 끝까지 가요. 중간에 노란 ATP가 따라가는 것도 살펴봐요.',
          setup() { setMode('path'); spReset(); },
          check: () => S.sp.sentDone, hold: 0.5,
          status: () => mark(S.sp.sentDone) + ' 세포 밖까지 도착 &nbsp; (지금 ' + (Math.round(S.sp.p) + 1) + ' / 8 단계)',
          explain: '단백질은 소기관을 <b>소낭</b>에 실려 옮겨 다녀요. 소포체에서 접히고, 골지체에서 가공 · 분류 · 포장되고, 마지막에 분비 소낭이 세포막과 융합하면서 내용물이 세포 밖으로 나가요. 미토콘드리아가 만든 ATP가 이 과정을 도와요.',
        },
        {
          type: 'quiz', title: '리보솜이 소포체에 붙은 까닭',
          goal: '분비 단백질을 만드는 리보솜이 <b>거친 소포체에 붙어 있는</b> 까닭은?',
          setup() { setMode('path'); },
          choices: ['합성하면서 단백질 사슬을 소포체 안으로 바로 넣기 위해서', '리보솜이 소포체 안에 들어 있으면 ATP가 필요 없어서', '소포체가 mRNA를 만들어 주기 위해서', '소포체 막이 이중막이라서 리보솜이 떨어지지 않기 위해서'],
          answer: 0,
          feedback: ['', 'ATP는 이 과정에도 필요해요. 리보솜은 소포체 안이 아니라 바깥 면에 붙어 있어요.', 'mRNA는 핵에서 만들어져요.', '소포체는 단일막이에요.'],
          explain: '거친 소포체의 리보솜은 단백질을 합성하면서 <b>사슬을 소포체 안으로 밀어 넣어요</b>. 그래서 소포체 안에서 접히고 소낭에 실려 골지체로 갈 수 있어요.',
        },
      ],
    },
    {
      title: '추적 실험: 자기방사법', short: '추적 실험', icon: '☢', phase: '실험',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 단백질이 소포체 → 골지체 → 분비 소낭 → 세포 밖으로 간다고 배웠어요. 그런데 사람들은 이 길을 <b>어떻게 알아냈을까요?</b></div><p>방법은 <b>자기방사법</b>이에요. 방사성 동위 원소(³H)가 든 아미노산을 짧게(3분) 먹이고(<b>펄스</b>), 표지 없는 아미노산으로 바꾼 뒤(<b>체이스</b>) 시간마다 세포를 얇게 잘라요. 감광 유제를 입히면 방사선이 닿은 곳에 <b>검은 은 알갱이</b>가 생겨서, 표지된 단백질의 위치를 전자 현미경으로 볼 수 있어요.</p><p>(값은 이해를 돕기 위해 단순화한 가상 자료예요.)</p>',
      features: ['rad'],
      setup() { setMode('rad'); radReset(); },
      recap: '방사성 아미노산을 짧게 공급한 뒤(펄스) 표지 없는 아미노산으로 바꾸어(체이스) 시간마다 관찰하면, 표지된 단백질이 소포체 → 골지체 → 분비 소낭 → 세포 밖 순서로 이동하는 것을 알 수 있어요.',
      summary: '<ul><li><b>자기방사법</b>: ³H 같은 방사성 동위 원소가 든 아미노산을 공급 → 시료를 얇게 잘라 <b>감광 유제</b> → 방사선이 닿은 곳에 <b>은 알갱이</b>가 생겨요(전자 현미경 관찰).</li><li><b>펄스-체이스</b>: 짧게(3분) 표지한 뒤 표지 없는 아미노산으로 바꿔요. 그러면 표지된 단백질만 따라가며 이동 순서를 볼 수 있어요.</li><li>이자 샘세포 예(가상 값): 3분 – 거친 소포체 90 % → 20분 – 골지체 65 % → 40분 – 분비 소낭 60 % → 120분 – 세포 밖 67 %. 방사성이 <b>시간 순서대로</b> 이동했어요.</li></ul>',
      missions: [
        {
          id: 'table', title: '시각마다 방사성 위치 기록',
          goal: '시각 <b>3분 · 20분 · 40분 · 120분</b>의 사진과 그래프를 모두 보고, 은 알갱이가 <b>가장 많은 곳</b>을 표에 기록하세요.',
          hint: '시각 버튼(또는 ▶ 자동 재생)으로 사진을 바꿔요. 막대가 가장 긴 구획이 은 알갱이가 가장 많은 곳이에요.',
          setup() { setMode('rad'); radReset(); },
          check: () => Object.keys(S.rd.seen).length === 4 && radAnsOk(), hold: 0.8,
          status: () => mark(Object.keys(S.rd.seen).length === 4) + ' 살펴본 시각 ' + Object.keys(S.rd.seen).length + ' / 4 &nbsp; ' + mark(radAnsOk()) + ' 표 4칸 정답',
          explain: '3분에는 <b>거친 소포체</b>(90 %), 20분에는 <b>골지체</b>(65 %), 40분에는 <b>분비 소낭</b>(60 %), 120분에는 <b>세포 밖</b>(67 %)에 은 알갱이가 가장 많아요. 표지된 단백질이 이 순서대로 이동했다는 뜻이에요.',
        },
        {
          type: 'quiz', title: '왜 짧게만 표지할까?',
          goal: '방사성 아미노산을 <b>오래 계속</b> 공급하면 안 되는 까닭은?',
          setup() { setMode('rad'); },
          choices: ['모든 구획이 한꺼번에 표지되어 이동 순서를 알 수 없어서', '방사선이 세포를 모두 녹여 버려서', '아미노산이 단백질이 되지 못해서', '필름이 너무 빨리 검게 변해서'],
          answer: 0,
          feedback: ['', '실험에서 쓰는 방사선은 아주 약해서 세포를 녹이지 않아요. 문제는 관찰 방법이에요.', '표지된 아미노산도 보통 아미노산처럼 단백질이 돼요.', '필름의 문제가 아니라 표지된 시점이 섞이는 것이 문제예요.'],
          explain: '오래 공급하면 소포체 · 골지체 · 소낭이 <b>모두 표지</b>되어 어느 것이 먼저인지 알 수 없어요. <b>짧게 표지(펄스)</b>하고 <b>표지 없는 아미노산으로 바꾸어(체이스)</b> 한 무리의 단백질만 따라가야 해요.',
        },
        {
          type: 'quiz', title: '자기방사법으로 알 수 있는 것',
          goal: '자기방사법으로 알아낼 수 있는 것은?',
          setup() { setMode('rad'); },
          choices: ['물질이 지나가는 소기관의 순서', '소기관의 정확한 개수', '단백질의 아미노산 서열', '세포의 나이'],
          answer: 0,
          feedback: ['', '은 알갱이로 개수를 세는 방법이 아니에요.', '서열은 자기방사법으로 알 수 없어요.', '이 방법은 세포의 나이와 관계없어요.'],
          explain: '표지된 물질의 위치를 시간 순서대로 보면 <b>물질이 어떤 소기관을 어떤 순서로 지나가는지</b> 알 수 있어요.',
        },
      ],
    },
    {
      title: '소기관의 협력과 이상', short: '협력과 이상', icon: '🔧', phase: '탐구',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 표지된 단백질이 소기관 사이를 차례로 이동하는 것을 확인했어요.</div><p>소기관이 한 팀이라면, 한 곳이 <b>고장</b> 나면 어떻게 될까요? 먼저 고장마다 단백질이 <b>어디에 쌓일지 예측</b>하고, 🔧 고장 실험으로 확인해요. 마지막에는 소기관 카드로 <b>릴레이 설명</b>을 완성해요.</p>',
      features: ['predict', 'defect', 'relay'],
      setup() { setMode('predict'); },
      recap: '소기관은 서로 연결되어 한 팀처럼 일해요. 골지체나 소포체에서 막히면 그 앞에 단백질이 쌓이고, 핵이 멈추면 새로 만드는 양이 줄고, 미토콘드리아가 멈추면 전체가 느려져요.',
      summary: '<ul><li><b>미토콘드리아 억제</b>: ATP 부족으로 전 과정이 느려져요(어느 한 곳에만 쌓이지 않음). <b>소포체 이동 차단</b>: 단백질이 소포체에 쌓여요. <b>골지체 기능 정지</b>: 수송 소낭이 소포체와 골지체 사이에 쌓이고 분비 소낭이 만들어지지 않아요. <b>핵 기능 정지</b>: 새 mRNA가 없어 단백질 합성과 분비가 줄어요.</li><li><b>릴레이</b>: 핵(mRNA 만들기) → 리보솜(사슬 만들기) → 소포체(접어서 소낭에 싣기) → 골지체(가공 · 분류 · 포장) → 분비 소낭(세포 밖으로 내보내기). 미토콘드리아는 모든 단계에 ATP를 공급해요.</li></ul>',
      missions: [
        {
          id: 'predict', title: '고장 나면 어디에 쌓일까?', manual: true,
          goal: '🎯 <b>예측하기</b> 표에서 고장 4가지의 결과를 예측하고, 🔧 <b>고장 실험</b>에서 4가지를 모두 확인한 뒤 ✔ 확인하기를 누르세요.',
          hint: '앞쪽 소기관이 막히면 그 앞에 단백질이 쌓여요. 핵이 멈추면 새로 만들어지지 않고, 미토콘드리아가 멈추면 모든 단계가 느려져요.',
          setup() { setMode('predict'); S.df.tried = {}; $$('[id^=pr]').forEach((e) => { if (e.tagName === 'SELECT') { e.value = ''; e.className = ''; } }); updateCtl(); },
          status: () => mark(prCount() === 4) + ' 맞게 예측 ' + prCount() + ' / 4 &nbsp; ' + mark(triedCount() === 4) + ' 확인한 고장 ' + triedCount() + ' / 4',
          check() {
            const e = [0, 1, 2, 3].filter((i) => !prSel(i)).length;
            if (e) return '예측 표를 모두 채워 주세요.';
            if (prCount() < 4) { const i = [0, 1, 2, 3].find((q) => prSel(q) !== PRED_ANS[q]); return '\'' + ['미토콘드리아 억제', '소포체 이동 차단', '골지체 기능 정지', '핵 기능 정지'][i] + '\' 예측을 다시 생각해 보세요. 그 소기관이 하는 일 바로 앞뒤에서 무슨 일이 생길까요?'; }
            if (triedCount() < 4) return '예측이 모두 맞아요! 이제 🔧 고장 실험에서 4가지 고장을 각각 5초 이상 지켜보며 확인해 봐요. (' + triedCount() + ' / 4)';
            return true;
          },
          explain: '<b>소포체 이동 차단</b>이면 단백질이 소포체에, <b>골지체 정지</b>이면 소포체와 골지체 사이의 수송 소낭에 쌓여요. <b>핵이 멈추면</b> 새 mRNA가 없어 만들어지는 양이 줄고, <b>미토콘드리아가 멈추면</b> ATP가 부족해 모든 단계가 느려져요.',
        },
        {
          id: 'relay', title: '릴레이 카드 완성', manual: true,
          goal: '🏃 <b>릴레이 카드</b> 6장을 1~5번 주자와 에너지 공급 자리에 알맞게 놓으세요.',
          hint: '1번 주자는 mRNA를 만드는 소기관이에요. 이어서 사슬을 만들고, 접고, 포장하고, 내보내요. 모든 단계에 ATP를 대는 소기관은 따로 놓아요.',
          setup() { setMode('relay'); relay.reset(); },
          status: () => mark(relay.placed === 6) + ' 놓은 카드 ' + relay.placed + ' / 6',
          check() {
            if (relay.placed < 6) { relay.markBad([]); return '카드를 모두 자리에 놓아 주세요. (' + relay.placed + ' / 6)'; }
            if (relayDup()) return '한 자리에는 카드를 한 장씩만 놓아요.';
            const w = relayWrong();
            if (!w.length) { relay.markBad([]); return true; }
            relay.markBad(w.map((c) => c.id)); return '빨갛게 표시된 카드의 순서를 다시 생각해 보세요. 앞 주자가 넘겨 준 것을 받아서 일해요.';
          },
          explain: '<b>핵</b>이 mRNA를 만들어 내보내면 <b>리보솜</b>이 읽어 사슬을 만들고, <b>소포체</b>가 접어서 소낭에 실으면 <b>골지체</b>가 가공 · 분류 · 포장하고, <b>분비 소낭</b>이 세포 밖으로 내보내요. <b>미토콘드리아</b>는 모든 주자에게 ATP를 공급해요.',
        },
        {
          type: 'quiz', title: '골지체가 일을 못 하면',
          goal: '골지체가 기능을 못 하면 단백질이 <b>쌓이는 곳</b>은?',
          setup() { setMode('defect'); },
          choices: ['세포 밖', '분비 소낭 안', '소포체 쪽(소포체와 골지체 사이의 수송 소낭)', '핵 안'],
          answer: 2,
          feedback: ['단백질이 세포 밖으로 나가려면 골지체를 거쳐야 해요.', '분비 소낭은 골지체에서 만들어지므로 골지체가 멈추면 생기지 않아요.', '', '핵은 단백질 길의 첫 단계 앞쪽이에요. 단백질이 핵에 쌓이지는 않아요.'],
          explain: '단백질은 소포체 → (수송 소낭) → 골지체 순서로 가요. 골지체가 멈추면 <b>소포체 쪽</b>에 소낭이 쌓이고, 골지체에서 만드는 <b>분비 소낭</b>은 만들어지지 않아요.',
        },
      ],
    },
    {
      title: '세포마다 다른 소기관', short: '세포의 특징', icon: '📊', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 소기관마다 맡은 일이 다르고, 서로 협력한다는 것을 알았어요.</div><p>세포마다 하는 일이 달라서 <b>발달한 소기관</b>도 달라요. 세포의 하는 일을 보고, 어떤 소기관이 가장 발달했을지 <b>추론</b>해 보세요.</p>',
      features: ['profile'],
      setup() { setMode('profile'); },
      recap: '분비 단백질을 많이 만드는 세포는 거친 소포체와 골지체가, 에너지를 많이 쓰는 세포는 미토콘드리아가, 해독하는 간세포는 매끈 소포체가, 광합성 세포는 엽록체와 큰 액포가 발달해요.',
      summary: '<ul><li><b>이자 샘세포 · 침샘 세포 · 항체를 만드는 형질세포</b>: 단백질을 많이 만들어 분비 → <b>거친 소포체와 골지체</b>가 매우 발달.</li><li><b>근육 세포</b>: 수축에 에너지를 많이 사용 → <b>미토콘드리아</b>가 매우 많음.</li><li><b>간세포</b>: 해독과 지질 합성 → <b>매끈 소포체</b> 발달.</li><li><b>식물 잎살 세포</b>: 광합성 → <b>엽록체</b>와 큰 액포.</li><li>세포의 기능에 따라 발달한 소기관이 달라요(구조와 기능의 관계).</li></ul>',
      missions: [
        {
          id: 'profile', title: '세포와 발달한 소기관 짝짓기', manual: true,
          goal: '세포 카드 6장을 그 세포에서 <b>가장 발달한 소기관</b> 상자에 넣으세요.',
          hint: '단백질을 많이 분비하는 세포는 거친 소포체와 골지체, 에너지를 많이 쓰는 세포는 미토콘드리아, 해독하는 세포는 매끈 소포체, 광합성 세포는 엽록체예요.',
          setup() { setMode('profile'); profile.reset(); },
          status: () => mark(profile.placed === 6) + ' 놓은 카드 ' + profile.placed + ' / 6',
          check() {
            if (profile.placed < 6) { profile.markBad([]); return '카드를 모두 상자에 넣어 주세요. (' + profile.placed + ' / 6)'; }
            const w = profWrong();
            if (!w.length) { profile.markBad([]); return true; }
            profile.markBad(w.map((c) => c.id)); return '빨갛게 표시된 카드의 세포가 무슨 일을 하는지 다시 읽어 보세요.';
          },
          explain: '<b>이자 샘세포 · 침샘 세포 · 형질세포</b>는 단백질(소화 효소, 호르몬, 항체)을 만들어 분비하므로 <b>거친 소포체와 골지체</b>가 발달하고, <b>근육 세포</b>는 에너지를 많이 써서 <b>미토콘드리아</b>가, <b>간세포</b>는 해독을 하므로 <b>매끈 소포체</b>가, <b>잎살 세포</b>는 광합성을 하므로 <b>엽록체</b>가 발달해요.',
        },
        {
          type: 'quiz', title: '소화 효소를 많이 분비하는 세포',
          goal: '소화 효소를 많이 분비하는 세포에서 특히 발달한 소기관끼리 짝지은 것은?',
          setup() { setMode('profile'); },
          choices: ['거친 소포체와 골지체', '매끈 소포체와 엽록체', '리소좀과 세포벽', '미토콘드리아와 액포'],
          answer: 0,
          feedback: ['', '매끈 소포체는 지질 합성 · 해독, 엽록체는 광합성과 관련이 있어요.', '세포벽은 막 소기관이 아니며 분비와 관계가 적어요.', '미토콘드리아는 에너지 공급에 중요하지만, 분비 단백질을 만들고 포장하는 소기관은 아니에요.'],
          explain: '소화 효소는 단백질이라서 <b>거친 소포체</b>에서 만들어 운반하고 <b>골지체</b>에서 가공 · 포장해 분비해요. 그래서 이런 세포에서는 두 소기관이 매우 발달해 있어요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hy-secretory-pathway', mount: '#game', badge: '분비 경로 탐정', homeHref: '../../index.html#hy',
    featureLabels: { path: '🛤 분비의 길', order: '🔢 순서 맞추기', rad: '☢ 자기방사법', predict: '🎯 예측하기', defect: '🔧 고장 실험', relay: '🏃 릴레이 카드', profile: '📊 세포의 특징' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 읽음 칸 ---------- */
  function readouts() {
    const m = S.mode;
    if (m === 'path') setReads(['단계', (Math.round(S.sp.p) + 1) + ' / 8', '지금 이름', STAGES[clamp(Math.round(S.sp.p), 0, 7)].nm, '한 번에 보내기', S.sp.sentDone ? '완료' : S.sp.send ? '이동 중' : '아직']);
    else if (m === 'order') setReads(['놓은 설명', S.ord.seq.length + ' / 8', '남은 설명', (8 - S.ord.seq.length) + '개', '순서', ordOk() ? '맞아요' : '확인 전']);
    else if (m === 'rad') setReads(['관찰 시각', S.rd.t + '분', '가장 많은 곳', RNAME[RC[QUOTA[S.rd.t].indexOf(Math.max.apply(null, QUOTA[S.rd.t].slice(0, 4)))]], '살펴본 시각', Object.keys(S.rd.seen).length + ' / 4']);
    else if (m === 'predict') setReads(['맞게 예측', prCount() + ' / 4', '확인한 고장', triedCount() + ' / 4', '고장 종류', '4가지']);
    else if (m === 'defect') setReads(['고장', S.df.scn === 'none' ? '없음' : SCN_NAMES[S.df.scn], '분비된 단백질', S.df.out + '개', '소포체 · 수송 소낭', dfCount('er') + ' · ' + dfCount('tv')]);
    else if (m === 'relay') setReads(['놓은 카드', relay.placed + ' / 6', '남은 카드', (6 - relay.placed) + '장', '자리', '1~5번 + 에너지']);
    else setReads(['놓은 카드', profile.placed + ' / 6', '남은 카드', (6 - profile.placed) + '장', '상자', '4칸']);
  }

  /* ---------- 시작 ---------- */
  setMode('path');
  let lastFree = false, lastLv = -1;
  SciSim.loop((dt, t) => {
    clock = t; S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (game && game.level !== lastLv) { lastLv = game.level; updateCtl(); }
    view.apply(); FX.update(dt); ctx.clearRect(0, 0, VW, VH);
    switch (S.mode) {
      case 'path': bgFill('#f3f1f6', '#e9e5ef'); pathDraw(dt, t); break;
      case 'order': bgFill('#f3f1f6', '#e9e5ef'); ordDraw(dt, t); break;
      case 'rad': bgFill('#f3f1f6', '#e9e5ef'); radDraw(dt, t); break;
      case 'predict': bgFill('#f3f1f6', '#e9e5ef'); predictDraw(dt, t); break;
      case 'defect': bgFill('#f3f1f6', '#e9e5ef'); defectDraw(dt, t); break;
      case 'relay': bgFill('#f3f1f6', '#e9e5ef'); relayDraw(dt, t); break;
      case 'profile': bgFill('#f3f1f6', '#e9e5ef'); profileDraw(dt, t); break;
    }
    FX.draw(); parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(241,246,243,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, PHONE, get game() { return game; }, levels, setMode, G, STAGES, PA, CAP, spSet, spSend, spReset, ORD_ITEMS, ordOk, QUOTA, TIMES, radSet, GRAINS, grainComp, RAD_ANS,
    PRED_ANS, dfSet, dfReset, dfCount, triedCount, relay, RLORDER, profile, PF_CARDS, updateCtl, wpAt, SLOTS, prCount,
  };
})();
