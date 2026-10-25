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
     고등학교 생물의 유전 · Ⅰ. 유전자와 유전물질 - 상염색체와 성염색체 유전 (단원 59, 1차시)
     성취기준 [12유전01-01] 유전 형질이 유전자를 통해 자손에게 유전됨을 이해하고, 상염색체 유전과 성염색체 유전 양상의 차이를 설명할 수 있다.
     ① 탐구: 유전자와 형질  ② 모형: 상염색체  ③ 모형: X 연관  ④ 분석: 정반대 교배
     ========================================================= */
  const S = { mode: 'chain', fade: 0, t: 0 };
  let game = null;
  const rnd = mulberry((Math.random() * 4294967296) >>> 0);
  const COL = { auto: '#7c6cf0', X: '#ec4899', Y: '#3b82f6', good: '#15803d', mut: '#f59e0b', red: '#dc2626', son: '#3b82f6', dau: '#ec4899', ink: '#26324a', mute: '#5a6679' };
  const KEY = { N: "X", M: "X'" };

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

  /* ---------- 성별 막대 + 떨어지는 점 (Galton 식) ---------- */
  class SexBars {
    constructor(cats, theory) {
      this.cats = cats; this.theory = theory; this.dots = []; this.queue = []; this.acc = 0;
      this.cnt = { m: {}, f: {} }; this.disp = { m: {}, f: {} }; this.ex = {}; this.showTh = false;
      this.reset();
    }
    reset() {
      this.cats.forEach((c) => { this.cnt.m[c.id] = 0; this.cnt.f[c.id] = 0; this.disp.m[c.id] = 0; this.disp.f[c.id] = 0; });
      this.dots = []; this.queue = []; this.acc = 0; this.ex = {};
    }
    total(s) { return this.cats.reduce((a, c) => a + this.cnt[s][c.id], 0); }
    all() { return this.total('m') + this.total('f'); }
    pending() { return this.dots.length + this.queue.length; }
    enqueue(list, secs) { this.queue = this.queue.concat(list); this.rate = Math.max(6, list.length / (secs || 1.6)); }
    spawn(sex, cat, extra) {
      const g = this.geom && this.geom[sex]; if (!g) { this.cnt[sex][cat]++; if (extra) this.ex[extra] = (this.ex[extra] || 0) + 1; return; }
      const k = this.cats.findIndex((c) => c.id === cat);
      this.dots.push({ sex, cat, extra, t: 0, x0: g.x + g.w / 2 + (rnd() - 0.5) * 30, jx: (rnd() - 0.5) * (g.bw * 0.5), k });
    }
    update(dt) {
      if (this.queue.length) {
        this.acc += this.rate * dt;
        while (this.acc >= 1 && this.queue.length) { this.acc -= 1; const q = this.queue.shift(); this.spawn(q.sex, q.cat, q.extra); }
      } else this.acc = 0;
      for (let i = this.dots.length - 1; i >= 0; i--) {
        const d = this.dots[i]; d.t += dt / (RM ? 0.01 : 0.5);
        if (d.t >= 1) { this.cnt[d.sex][d.cat]++; if (d.extra) this.ex[d.extra] = (this.ex[d.extra] || 0) + 1; this.dots.splice(i, 1); }
      }
      ['m', 'f'].forEach((s) => this.cats.forEach((c) => {
        const tot = this.total(s), tgt = tot ? this.cnt[s][c.id] / tot : 0;
        this.disp[s][c.id] = RM ? tgt : approach(this.disp[s][c.id], tgt, dt, 9);
      }));
    }
    /* geom: {m:{x,y,w,h}, f:{...}} 패널 사각형 */
    draw(geom, titles, ylab) {
      this.geom = geom;
      ['m', 'f'].forEach((s) => {
        const g = geom[s], col = s === 'm' ? COL.son : COL.dau;
        g.bw = Math.min(70, g.w * 0.22);
        panel(g.x, g.y, g.w, g.h, 14, '#fff');
        ctx.strokeStyle = col; ctx.lineWidth = 2.5; D.roundRect(g.x, g.y, g.w, g.h, 14); ctx.stroke();
        const tot = this.total(s);
        T(g.x + 12, g.y + 24, titles[s] + ' (' + tot + '명)', L(16, 14.5), col, 'left', 800);
        const px = g.x + 40, pw = g.w - 54, top = g.y + 54, base = g.y + g.h - 44, ph = base - top;
        g.px = px; g.pw = pw; g.top = top; g.base = base;
        [0, 25, 50, 75, 100].forEach((v) => {
          const yy = base - ph * v / 100;
          ctx.strokeStyle = v === 0 ? '#94a3b8' : '#e2e8f0'; ctx.lineWidth = v === 0 ? 1.6 : 1; ctx.beginPath(); ctx.moveTo(px, yy); ctx.lineTo(px + pw, yy); ctx.stroke();
          T(px - 6, yy + 4, v + '', 11.5, '#64748b', 'right', 700);
        });
        T(g.x + 12, top - 8, ylab || '비율 (%)', 11.5, '#64748b', 'left', 700);
        const n = this.cats.length, slot = pw / n;
        g.bars = [];
        this.cats.forEach((c, i) => {
          const cx = px + slot * (i + 0.5), bw = g.bw;
          const v = clamp(this.disp[s][c.id], 0, 1), hh = ph * v;
          g.bars.push({ cx, top: base - hh });
          if (hh > 0.5) {
            const gr = ctx.createLinearGradient(cx - bw / 2, 0, cx + bw / 2, 0); gr.addColorStop(0, C.shade(c.col, 0.2)); gr.addColorStop(1, c.col);
            ctx.fillStyle = gr; D.roundRect(cx - bw / 2, base - hh, bw, hh, 5); ctx.fill();
          }
          const th = this.showTh && this.theory && this.theory[s] ? this.theory[s][c.id] : null;
          if (th != null) {
            const ty = base - ph * th;
            D.dashedLine(cx - bw / 2 - 8, ty, cx + bw / 2 + 8, ty, { color: '#0f172a', width: 1.8, dash: [5, 4] });
          }
          const cnt = this.cnt[s][c.id];
          const lab = tot ? fmtN(cnt / tot * 100, 1) + ' %' : '—';
          const labY = th != null ? Math.min(base - hh, base - ph * th) : base - hh;
          T(cx, Math.max(top + 12, labY - 7), lab, 13.5, '#1f2d44', 'center', 800, { stroke: '#fff', strokeWidth: 3 });
          TF(cx, base + 17, c.label, slot - 6, 13, 10.5, '#26324a', 'center', 800);
          T(cx, base + 33, cnt + '명', 12, '#64748b', 'center', 700);
        });
        if (this.showTh && this.theory) { D.dashedLine(px + pw - 78, g.y + 18, px + pw - 58, g.y + 18, { color: '#0f172a', width: 1.8, dash: [5, 4] }); T(px + pw - 52, g.y + 22, '이론값', 12, '#334155', 'left', 700); }
      });
      // 떨어지는 점
      this.dots.forEach((d) => {
        const g = geom[d.sex]; if (!g || !g.bars) return;
        const b = g.bars[d.k], e = SciSim.ease.inQuad(clamp(d.t, 0, 1)), ex = SciSim.ease.outQuad(clamp(d.t, 0, 1));
        const x = d.x0 + (b.cx + d.jx - d.x0) * ex, y = g.top - 6 + (b.top - (g.top - 6)) * e;
        const c = this.cats[d.k];
        ctx.fillStyle = c.col; ctx.beginPath(); ctx.arc(x, y, 5, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.arc(x - 1.5, y - 1.5, 1.8, 0, TAU); ctx.fill();
      });
    }
  }

  /* 부모 영역 그림용: 사람 아이콘 + 염색체 (낱개) */
  function pill(p) { drawChr(p.x, p.y, p.kind, p.mark, { alpha: p.alpha, s: p.s, nolabel: p.nolabel }); }


  /* =========================================================
     ① 유전자와 형질: 사슬 카드 + 염색체 지도
     ========================================================= */
  const CASES = {
    pea: {
      name: '완두 씨 모양', nm: ['R', 'r'], opts: ['정상 대립유전자 R이 있어요 (RR · Rr)', '열성 대립유전자 r만 있어요 (rr)'],
      cards: [
        { id: 'g', label: 'SBEI 유전자', sub: 'DNA의 한 부분' },
        { id: 'p', label: '녹말 가지 효소', sub: 'SBEI 유전자가 만든 단백질' },
        { id: 't', label: '씨의 모양', sub: '둥근 씨 · 주름진 씨' },
      ],
      prot: ['효소 있음', '효소 없음'], trait: ['둥근 씨', '주름진 씨'],
      txt: ['효소가 있어서 녹말이 충분히 합성돼요. 씨가 마를 때 고르게 줄어서 둥근 씨가 돼요.', '효소가 없어서 녹말이 적고 당이 많아요. 삼투로 물을 많이 흡수했다가 마르면서 쭈글쭈글한 주름진 씨가 돼요.'],
    },
    alb: {
      name: '알비니즘', nm: ['A', 'a'], opts: ['정상 대립유전자 A가 있어요 (AA · Aa)', '열성 대립유전자 a만 있어요 (aa)'],
      cards: [
        { id: 'g', label: 'TYR 유전자', sub: '11번 염색체 위의 유전자' },
        { id: 'p', label: '티로시네이스 효소', sub: 'TYR 유전자가 만든 단백질' },
        { id: 't', label: '피부 · 털 · 눈의 색', sub: '멜라닌 색소의 양' },
      ],
      prot: ['효소 있음', '효소 없음'], trait: ['색소가 있어요', '색소가 없어요'],
      txt: ['티로시네이스 효소가 있어서 멜라닌이 합성돼요. 피부 · 털 · 눈에 색소가 있어요.', '효소가 만들어지지 않거나 기능이 없어서 멜라닌이 합성되지 않아요. 색소가 없는 알비니즘이 돼요.'],
    },
    cb: {
      name: '적록 색맹', nm: ['X', "X'"], opts: ['정상 대립유전자 X가 있어요', "색맹 대립유전자 X'만 있어요 (X'Y · X'X')"],
      cards: [
        { id: 'g', label: '원뿔세포 색소 유전자', sub: 'X 염색체 위의 유전자' },
        { id: 'p', label: '빛을 받는 색소 단백질', sub: '적색 · 녹색 빛을 받는 원뿔세포' },
        { id: 't', label: '색을 구별하는 능력', sub: '적색과 녹색의 구별' },
      ],
      prot: ['색소 단백질 정상', '색소 단백질 이상'], trait: ['적색 · 녹색 구별', '구별하기 어려워요'],
      txt: ['정상 색소 단백질이 적색과 녹색 빛을 각각 받아서 두 색을 구별해요.', '적색 또는 녹색 빛을 받는 색소 단백질이 정상이 아니어서 적색과 녹색을 구별하기 어려워요.'],
    },
  };
  const CASE_IDS = ['pea', 'alb', 'cb'];
  const SLOT_DEF = [{ id: 'g', label: '① 유전자 (DNA)', col: '#7c6cf0' }, { id: 'p', label: '② 단백질', col: '#f59e0b' }, { id: 't', label: '③ 형질', col: '#16a34a' }];
  S.chain = { cur: 'pea', allele: 0, seenMut: false, seenNorm: false, done: {}, flow: [], tflow: 0 };
  const ch_m = PHONE ? 8 : 14, ch_gap = PHONE ? 22 : 46;
  const CH_W = (VW - 2 * ch_m - 2 * ch_gap) / 3;
  const CH_Y = PHONE ? 46 : 52, CH_H2 = PHONE ? 98 : 106;
  const LOW = { x: ch_m, y: CH_Y + CH_H2 + 14, w: VW - 2 * ch_m, h: VH - (CH_Y + CH_H2 + 14) - 12 };
  const chainSorters = {};
  CASE_IDS.forEach((id, ci) => {
    const order = [[1, 2, 0], [2, 0, 1], [1, 0, 2]][ci];
    const cards = order.map((k) => Object.assign({ col: SLOT_DEF[k].col }, CASES[id].cards[k]));
    chainSorters[id] = selectable({
      cards, cw: PHONE ? 440 : 232, ch: PHONE ? 52 : 56, kh: PHONE ? 58 : 62,
      boxes: SLOT_DEF.map((sd, i) => ({ id: sd.id, label: sd.label, col: sd.col, x: ch_m + i * (CH_W + ch_gap), y: CH_Y, w: CH_W, h: CH_H2, cols: 1, hdr: 28 })),
      tray: (i) => (PHONE ? { x: 20, y: LOW.y + 60 + i * 64 } : { x: 28 + i * 252, y: LOW.y + 100 }),
      onChange() { updateCtl(); },
    });
  });
  const curSorter = () => chainSorters[S.chain.cur];
  const chainOk = (id) => chainSorters[id].cards.every((c) => c.zone === c.id);
  const chainCount = () => CASE_IDS.filter((id) => S.chain.done[id]).length;
  function chainReset(id) {
    id = id || S.chain.cur; chainSorters[id].reset(); S.chain.done[id] = false; S.chain.flow = [];
  }
  function chainAllReset() { CASE_IDS.forEach((id) => chainReset(id)); S.chain.cur = 'pea'; S.chain.allele = 0; S.chain.seenMut = false; S.chain.seenNorm = false; }
  function chainSetCase(id) { S.chain.cur = id; S.chain.flow = []; S.chain.allele = 0; S.fade = 0.6; updateCtl(); }

  /* 형질 그림 */
  function drawSeed(x, y, r, wrinkled, t) {
    ctx.save(); ctx.translate(x, y);
    const g = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r * 1.1);
    g.addColorStop(0, wrinkled ? '#d9cf7a' : '#c4e56f'); g.addColorStop(1, wrinkled ? '#9a8b3a' : '#5da22f');
    ctx.fillStyle = g; ctx.strokeStyle = wrinkled ? '#6d5f20' : '#3f7a1d'; ctx.lineWidth = 2.5;
    ctx.beginPath();
    const N = 36;
    for (let i = 0; i <= N; i++) {
      const a = i / N * TAU, k = wrinkled ? 1 + 0.12 * Math.sin(a * 7 + 0.6) + 0.06 * Math.sin(a * 13) : 1;
      const px = Math.cos(a) * r * k, py = Math.sin(a) * r * k * (wrinkled ? 0.92 : 1);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    if (wrinkled) {
      ctx.strokeStyle = 'rgba(80,66,16,.55)'; ctx.lineWidth = 1.6;
      for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + 0.4; ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * 0.2, Math.sin(a) * r * 0.2); ctx.quadraticCurveTo(Math.cos(a + 0.35) * r * 0.55, Math.sin(a + 0.35) * r * 0.55, Math.cos(a) * r * 0.85, Math.sin(a) * r * 0.85); ctx.stroke(); }
    } else { ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.ellipse(-r * 0.32, -r * 0.4, r * 0.22, r * 0.12, -0.6, 0, TAU); ctx.fill(); }
    ctx.restore();
  }
  function drawTraitPic(id, mut, x, y, s, t) {
    if (id === 'pea') drawSeed(x, y, s * 0.55, !!mut, t);
    else if (id === 'alb') {
      person(x, y + s * 0.1, s * 1.05, mut ? '#f6e7da' : '#b9825a', { line: mut ? '#d8b9a0' : '#7a4f33' });
      ctx.fillStyle = mut ? '#f8fafc' : '#3b2a20'; ctx.beginPath(); ctx.arc(x, y - s * 0.62 - s * 0.14, s * 0.28, Math.PI, TAU); ctx.fill();
      ctx.fillStyle = mut ? '#f472b6' : '#2b1d14'; ctx.beginPath(); ctx.arc(x - s * 0.1, y - s * 0.6, 2.4, 0, TAU); ctx.arc(x + s * 0.1, y - s * 0.6, 2.4, 0, TAU); ctx.fill();
    } else {
      const c1 = mut ? '#a8a070' : '#e2464b', c2 = mut ? '#a8a070' : '#16a34a';
      dot(x - s * 0.32, y, s * 0.3, c1, { shadow: true }); dot(x + s * 0.32, y, s * 0.3, c2, { shadow: true });
      if (mut) T(x, y - s * 0.46, '?', 20, '#92400e', 'center', 800);
    }
  }
  function drawEnzyme(x, y, r, on, t, k) {
    if (!on) { ctx.setLineDash([4, 4]); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke(); ctx.setLineDash([]); return; }
    const w = RM ? 0 : Math.sin(t * 2.4 + k) * 0.18;
    ctx.save(); ctx.translate(x, y); ctx.rotate(w);
    const g = ctx.createRadialGradient(-r * 0.3, -r * 0.3, 1, 0, 0, r * 1.2); g.addColorStop(0, '#fde68a'); g.addColorStop(1, '#f59e0b');
    ctx.fillStyle = g; ctx.strokeStyle = '#b45309'; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.arc(0, 0, r, 0.45, TAU - 0.45); ctx.lineTo(r * 0.12, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  function chainRunPanel(dt, t) {
    const sc = S.chain, id = sc.cur, cs = CASES[id], mu = sc.allele === 1;
    panel(LOW.x, LOW.y, LOW.w, LOW.h, 16, '#ffffff');
    const x0 = LOW.x, y0 = LOW.y, W = LOW.w;
    T(x0 + 14, y0 + 26, '사슬 완성! 대립유전자를 바꾸면 무엇이 달라질까요?', L(15.5, 13.5), '#26324a', 'left', 800);
    // 세 칸 (유전자 · 단백질 · 형질)
    const cx = [0, 1, 2].map((i) => ch_m + i * (CH_W + ch_gap) + CH_W / 2), cy = y0 + (PHONE ? 118 : 140);
    // 유전자 (DNA 가닥 + 대립유전자 글자)
    for (let i = 0; i < 9; i++) {
      const px = cx[0] - 40 + i * 10, py = cy + Math.sin(t * 2 + i * 0.8) * (RM ? 0 : 5);
      dot(px, py, 4.2, i % 2 ? '#8b7cf6' : '#c4b5fd', {});
    }
    D.label(cx[0], cy - 40, cs.nm[sc.allele] + (id === 'cb' ? ' 유전자' : ' 대립유전자'), { bg: mu ? '#fef3c7' : '#dcfce7', color: mu ? '#92400e' : '#166534', border: mu ? '#f59e0b' : '#16a34a', size: 14 });
    T(cx[0], cy + 62, '유전자', 14, '#475569', 'center', 800);
    // 단백질
    for (let k = 0; k < 4; k++) drawEnzyme(cx[1] - 30 + (k % 2) * 60, cy - 24 + Math.floor(k / 2) * 46, 16, !mu, t, k);
    T(cx[1], cy + 62, cs.prot[sc.allele], 14, mu ? '#b91c1c' : '#166534', 'center', 800);
    // 형질
    drawTraitPic(id, mu, cx[2], cy - 4, PHONE ? 56 : 66, t);
    T(cx[2], cy + 62, cs.trait[sc.allele], 14, mu ? '#b91c1c' : '#166534', 'center', 800);
    // 화살표와 흐르는 점
    const gap = PHONE ? 50 : 64;
    const ax = [[cx[0] + gap, cx[1] - gap], [cx[1] + gap, cx[2] - gap]];
    ax.forEach((a, i) => {
      D.arrow(a[0], cy, a[1], cy, { color: i === 1 && mu ? '#cbd5e1' : '#64748b', width: 3 });
      if (mu && i === 1) T((a[0] + a[1]) / 2, cy + 6, '✕', 20, '#dc2626', 'center', 800);
    });
    sc.flow = sc.flow.filter((f) => f.t < 1);
    if (!RM) {
      sc.tflow += dt;
      if (sc.tflow > 0.4) { sc.tflow = 0; sc.flow.push({ t: 0, seg: 0 }); if (!mu) sc.flow.push({ t: 0, seg: 1 }); }
      sc.flow.forEach((f) => {
        f.t += dt * 0.8; const a = ax[f.seg];
        if (mu && f.seg === 0 && f.t > 0.7) return;
        dot(a[0] + (a[1] - a[0]) * f.t, cy, 5, f.seg === 0 ? '#8b7cf6' : '#f59e0b', {});
      });
    } else sc.flow = [];
    textBlock(x0 + 16, cy + (PHONE ? 104 : 112), W - 32, cs.txt[sc.allele], L(15, 14), '#334155', L(22, 20), 700);
  }
  function chainDraw(dt, t) {
    const sc = S.chain, so = curSorter(), cs = CASES[sc.cur];
    T(VW / 2, PHONE ? 26 : 32, cs.name + ' : 유전자 → 단백질 → 형질', L(19, 16), '#26324a', 'center', 800);
    // 상자 사이 화살표
    for (let i = 0; i < 2; i++) { const x1 = ch_m + (i + 1) * CH_W + i * ch_gap + 4, x2 = x1 + ch_gap - 8; D.arrow(x1, CH_Y + CH_H2 / 2, x2, CH_Y + CH_H2 / 2, { color: '#64748b', width: 3 }); }
    so.update(dt);
    // 잘못 놓은 카드 표시
    so.cards.forEach((c) => { const bad = !!c.zone && c.zone !== c.id; if (bad && !c.bad) c.shake = 1; c.bad = bad; });
    const ok = chainOk(sc.cur);
    if (ok && !sc.done[sc.cur]) { sc.done[sc.cur] = true; Sound.success(); parts.burst(VW / 2, CH_Y + CH_H2 / 2, { count: 26, speed: 220 }); sc.flow = []; sc.allele = 0; updateCtl(); }
    so.drawBoxes();
    if (sc.done[sc.cur]) { chainRunPanel(dt, t); }
    else {
      panel(LOW.x, LOW.y, LOW.w, LOW.h, 16, '#ffffff');
      T(LOW.x + 14, LOW.y + 28, '카드를 끌어서 위의 세 상자에 순서대로 놓아요', L(16, 14), '#334155', 'left', 800);
      T(LOW.x + 14, LOW.y + 54, '유전자가 먼저, 그 다음 단백질, 마지막이 형질이에요', L(14, 12.5), '#64748b', 'left', 700);
    }
    so.drawCards();
  }
  const chainPT = sorterPT(() => curSorter());

  /* ---------- 염색체 지도 + 분류 ---------- */
  const CHR_MB = [248, 242, 198, 190, 181, 171, 159, 145, 138, 134, 135, 133, 114, 107, 102, 90, 83, 80, 59, 64, 47, 51, 156, 57];
  const CHR_NAME = []; for (let i = 1; i <= 22; i++) CHR_NAME.push(String(i)); CHR_NAME.push('X', 'Y');
  const MAP = { x: PHONE ? 8 : 14, y: PHONE ? 8 : 12, w: VW - (PHONE ? 16 : 28), h: PHONE ? 184 : 196 };
  const LOC_CARDS = [
    { id: 'pea', label: '완두 씨 모양', sub: '완두 · SBEI 유전자', ans: 'auto' },
    { id: 'alb', label: '알비니즘', sub: 'TYR 유전자 · 열성', ans: 'auto' },
    { id: 'ach', label: '연골 무형성증', sub: 'FGFR3 유전자 · 우성', ans: 'auto' },
    { id: 'cb', label: '적록 색맹', sub: '원뿔세포 색소 유전자 · 열성', ans: 'X' },
    { id: 'hem', label: '혈우병 A', sub: '혈액 응고 인자 유전자 · 열성', ans: 'X' },
  ];
  const LB_Y = MAP.y + MAP.h + 10, LB_H = PHONE ? 104 : 92;
  const locBoxes = [
    { id: 'auto', label: '상염색체 유전자', col: '#7c6cf0', x: ch_m, y: LB_Y, w: (VW - 2 * ch_m - 12) / 2, h: LB_H, cols: 1, hdr: 28 },
    { id: 'X', label: 'X 염색체 유전자', col: '#ec4899', x: ch_m + (VW - 2 * ch_m - 12) / 2 + 12, y: LB_Y, w: (VW - 2 * ch_m - 12) / 2, h: LB_H, cols: 1, hdr: 28 },
  ];
  const LT_Y = LB_Y + LB_H + 10;
  const loc = selectable({
    cards: LOC_CARDS.map((c) => ({ id: c.id, label: c.label, sub: c.sub, col: '#7c6cf0' })), boxes: locBoxes,
    cw: PHONE ? 214 : 250, ch: 46, kh: PHONE ? 42 : 40,
    tray: (i) => (PHONE ? { x: 12 + (i % 2) * 230, y: LT_Y + 38 + Math.floor(i / 2) * 54 } : { x: 18 + (i % 3) * 262, y: LT_Y + 40 + Math.floor(i / 3) * 56 }),
    onChange() { updateCtl(); },
  });
  // 한 상자에 카드가 여러 장 들어가도 칩이 줄어들도록 칸 높이 보정
  const locWrong = () => loc.cards.filter((c) => c.zone && LOC_CARDS.find((q) => q.id === c.id).ans !== c.zone);
  function locDraw(dt, t) {
    loc.update(dt);
    // 지도
    panel(MAP.x, MAP.y, MAP.w, MAP.h, 14, '#ffffff');
    T(MAP.x + 12, MAP.y + 22, '사람의 염색체 지도 (상염색체 22쌍 + 성염색체 X · Y)', L(14.5, 12.5), '#334155', 'left', 800);
    const n = 24, gx = MAP.x + 14, gw = MAP.w - 28, slot = gw / n, bw = Math.min(PHONE ? 10 : 16, slot * 0.62);
    const top = MAP.y + (PHONE ? 76 : 78), maxH = MAP.h - (PHONE ? 76 : 78) - 22, mx = 248;
    const pins = { 3: { c: '#7c6cf0', t: '4번 · FGFR3', f: 0.04, dy: 0 }, 10: { c: '#7c6cf0', t: '11번 · TYR', f: 0.62, dy: PHONE ? 1 : 0 }, 22: { c: '#ec4899', t: 'X · 색소 · 응고 인자 유전자', f: 0.94, dy: PHONE ? 0 : 1 } };
    for (let i = 0; i < n; i++) {
      const cx = gx + slot * (i + 0.5), h = CHR_MB[i] / mx * maxH, isX = i === 22, isY = i === 23;
      const col = isX ? COL.X : isY ? COL.Y : (pins[i] ? COL.auto : '#b8c0d6');
      chromo(cx, top + h / 2, bw, h, col);
      if (!PHONE || i % 3 === 2 || pins[i] || isX || isY) T(cx, top + maxH + 14, CHR_NAME[i], PHONE ? 10.5 : 12, pins[i] ? '#26324a' : '#64748b', 'center', pins[i] ? 800 : 700);
      const pn = pins[i];
      if (pn) {
        const py = top + h * pn.f;
        ctx.fillStyle = '#dc2626'; ctx.fillRect(cx - bw / 2 - 1, py - 3, bw + 2, 6);
        const lx = i === 22 ? cx - slot * 1.2 : cx + slot * 1.2, ly = MAP.y + 40 + pn.dy * (PHONE ? 24 : 22);
        D.dashedLine(cx + (i === 22 ? -bw / 2 : bw / 2), py, lx, ly, { color: '#64748b', width: 1.3, dash: [3, 3] });
        D.label(lx, ly, pn.t, { bg: '#fff', color: '#26324a', border: pn.c, size: PHONE ? 11 : 12.5, align: i === 22 ? 'right' : 'left' });
      }
    }
    // 상자와 카드
    loc.drawBoxes();
    T(ch_m + 4, LT_Y + 24, '유전자 카드를 알맞은 상자에 끌어 넣어요', L(15, 13.5), '#334155', 'left', 800);
    loc.drawCards();
  }
  const locPT = sorterPT(() => loc);


  /* =========================================================
     ② 상염색체 · ③ X 연관: 교배 모형
     ========================================================= */
  const BAND_Y = 148;
  const BAND = { fcx: PHONE ? 84 : 134, zcx: VW / 2 };
  BAND.mcx = VW - BAND.fcx;
  const BARS_Y = PHONE ? 262 : 246;
  const BGEOM = PHONE
    ? { m: { x: 8, y: BARS_Y, w: 228, h: VH - BARS_Y - 8 }, f: { x: 244, y: BARS_Y, w: 228, h: VH - BARS_Y - 8 } }
    : { m: { x: 14, y: BARS_Y, w: 382, h: VH - BARS_Y - 10 }, f: { x: 404, y: BARS_Y, w: 382, h: VH - BARS_Y - 10 } };
  const mkBars = (cats, theory) => new SexBars(cats, theory);
  S.auto = { bars: mkBars([{ id: 'norm', label: '정상', col: '#16a34a' }, { id: 'aa', label: '알비니즘(aa)', col: '#f59e0b' }], { m: { norm: 0.75, aa: 0.25 }, f: { norm: 0.75, aa: 0.25 } }), fl: null, zy: null };
  S.xl = { mom: ['N', 'M'], dad: ['N', 'Y'], bars: null, fl: null, zy: null, th: false };
  const gtOfMom = (m) => (m[0] === 'M' ? "X'" : 'X') + (m[1] === 'M' ? "X'" : 'X');
  const gtOfDad = (d) => (d[0] === 'M' ? "X'" : 'X') + 'Y';
  function xlTheory() {
    const nM = S.xl.mom.filter((q) => q === 'M').length, dM = S.xl.dad[0] === 'M' ? 1 : 0;
    const ps = nM / 2, pd = (nM / 2) * dM;
    return { m: { norm: 1 - ps, cb: ps }, f: { norm: 1 - pd, cb: pd } };
  }
  function xlRebuild() {
    S.xl.bars = mkBars([{ id: 'norm', label: '정상', col: '#16a34a' }, { id: 'cb', label: '색맹', col: '#e2464b' }], xlTheory());
    S.xl.bars.showTh = S.xl.th; S.xl.fl = null; S.xl.zy = null;
  }
  xlRebuild();

  function bandSpec(kind) {
    if (kind === 'auto') {
      return {
        f: [{ kind: 'auto', mark: 'A' }, { kind: 'auto', mark: 'a' }, { kind: 'X', mark: 'N' }, { kind: 'Y' }],
        m: [{ kind: 'auto', mark: 'A' }, { kind: 'auto', mark: 'a' }, { kind: 'X', mark: 'N' }, { kind: 'X', mark: 'N' }],
        ofs: [-45, -15, 20, 50], zofs: [-45, -15, 20, 50], fslot: [0, 2], mslot: [1, 3], pairs: [[0, 1], [2, 3]], s: 1,
        fname: '아버지 · Aa', mname: '어머니 · Aa',
      };
    }
    const x = S.xl;
    return {
      f: [{ kind: 'X', mark: x.dad[0] }, { kind: 'Y' }], m: [{ kind: 'X', mark: x.mom[0] }, { kind: 'X', mark: x.mom[1] }],
      ofs: [-22, 22], zofs: [-24, 24], fslot: [0], mslot: [1], pairs: [[0, 1]], s: 1.15,
      fname: '아버지 · ' + gtOfDad(x.dad) + (x.dad[0] === 'M' ? ' (색맹)' : ''), mname: '어머니 · ' + gtOfMom(x.mom) + (x.mom[0] === 'M' && x.mom[1] === 'M' ? ' (색맹)' : x.mom.indexOf('M') >= 0 ? ' (보인자)' : ''),
    };
  }
  const sepAmt = (t) => (t < 0.4 ? t / 0.4 : Math.max(0, 1 - (t - 0.4) / 0.8));
  function newChild(kind) {
    if (kind === 'auto') {
      const fi = rnd() < 0.5 ? 0 : 1, mi = rnd() < 0.5 ? 0 : 1, ys = rnd() < 0.5, ms = rnd() < 0.5 ? 2 : 3;
      const fa = fi === 0 ? 'A' : 'a', ma = mi === 0 ? 'A' : 'a';
      const gt = fa === ma ? fa + ma : 'Aa', aa = fa === 'a' && ma === 'a';
      return {
        fp: [fi, ys ? 3 : 2], mp: [mi, ms], sex: ys ? 'm' : 'f', cat: aa ? 'aa' : 'norm', gt,
        pills: [{ kind: 'auto', mark: fa }, { kind: 'auto', mark: ma }, { kind: ys ? 'Y' : 'X', mark: 'N' }, { kind: 'X', mark: 'N' }],
        name: (ys ? '아들' : '딸') + ' · ' + gt + ' · ' + (aa ? '알비니즘' : '정상'),
      };
    }
    const x = S.xl, mi = rnd() < 0.5 ? 0 : 1, di = rnd() < 0.5 ? 0 : 1, mm = x.mom[mi], son = di === 1;
    const dm = x.dad[0];
    const aff = son ? mm === 'M' : (mm === 'M' && dm === 'M');
    const car = !son && (mm === 'M') !== (dm === 'M');
    const gt = son ? (mm === 'M' ? "X'Y" : 'XY') : (mm === 'M' && dm === 'M' ? "X'X'" : car ? "XX'" : 'XX');
    return {
      fp: [di], mp: [mi], sex: son ? 'm' : 'f', cat: aff ? 'cb' : 'norm', extra: car ? 'carrier' : null, gt,
      pills: [son ? { kind: 'Y' } : { kind: 'X', mark: dm }, { kind: 'X', mark: mm }],
      name: (son ? '아들' : '딸') + ' · ' + gt + ' · ' + (aff ? '색맹' : car ? '정상 (보인자)' : '정상'),
    };
  }
  function finishFlight(st) {
    const fl = st.fl; if (!fl) return;
    st.zy = fl.child; if (!fl.launched) st.bars.spawn(fl.child.sex, fl.child.cat, fl.child.extra);
    st.fl = null;
  }
  function runTrials(kind, n) {
    const st = kind === 'auto' ? S.auto : S.xl;
    finishFlight(st);
    if (n === 1) { st.fl = { t: 0, child: newChild(kind), merged: false, launched: false }; Sound.tick(); return; }
    const list = []; let last = null;
    for (let i = 0; i < n; i++) { last = newChild(kind); list.push({ sex: last.sex, cat: last.cat, extra: last.extra }); }
    st.zy = last; st.bars.enqueue(list, n >= 1000 ? 2.4 : n >= 100 ? 1.4 : 0.8);
  }
  function crossUpdate(st, dt) {
    st.bars.update(dt);
    const fl = st.fl; if (!fl) return;
    fl.t += RM ? dt * 4 : dt;
    if (fl.t >= 1.0 && !fl.merged) { fl.merged = true; st.zy = fl.child; parts.burst(BAND.zcx, BAND_Y, { count: 14, speed: 120, size: 3 }); }
    if (fl.t >= 1.35 && !fl.launched) { fl.launched = true; st.bars.spawn(fl.child.sex, fl.child.cat, fl.child.extra); }
    if (fl.t >= 1.7) st.fl = null;
  }
  function drawBand(kind, st) {
    const sp = bandSpec(kind), fl = st.fl, y = BAND_Y, zc = BAND.zcx;
    const sepT = fl ? sepAmt(fl.t) : 0;
    const homeXY = (who, i) => {
      const cx = who === 'f' ? BAND.fcx : BAND.mcx, pair = sp.pairs.find((pr) => pr.indexOf(i) >= 0), dir = pair && pair[0] === i ? -1 : 1;
      return { x: cx + sp.ofs[i] * sp.s + dir * sepT * 9, y };
    };
    [['f', BAND.fcx], ['m', BAND.mcx]].forEach(([who, cx]) => {
      person(cx, 46, 30, who === 'f' ? COL.son : COL.dau);
      TF(cx, 94, who === 'f' ? sp.fname : sp.mname, PHONE ? 150 : 250, L(15, 13), 11, '#26324a', 'center', 800);
      const picks = fl ? (who === 'f' ? fl.child.fp : fl.child.mp) : [];
      sp[who].forEach((it, i) => {
        const h = homeXY(who, i), picked = picks.indexOf(i) >= 0;
        let a = 1; if (fl && fl.t > 0.4 && fl.t < 1.5) a = 0.35;
        if (fl && picked && fl.t > 0.4 && fl.t < 1.5) a = 0.2;
        pill({ x: h.x, y: h.y, kind: it.kind, mark: it.mark, s: sp.s, alpha: a });
      });
    });
    // 자녀 자리 (접합자)
    const nslot = sp.zofs.length;
    const showChild = (fl && fl.merged) || (!fl && st.zy);
    const cd = fl && fl.merged ? fl.child : st.zy;
    for (let i = 0; i < nslot; i++) {
      const zx = zc + sp.zofs[i] * sp.s, zy = y;
      if (showChild && cd) {
        const p = cd.pills[i];
        const pop = fl && fl.merged ? SciSim.ease.outBack(clamp((fl.t - 1.0) / 0.3, 0, 1)) : 1;
        drawChr(zx, zy, p.kind, p.mark, { s: sp.s * (0.6 + 0.4 * pop), alpha: pop });
      } else {
        ctx.setLineDash([4, 4]); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.6; D.roundRect(zx - 9 * sp.s, zy - 38 * sp.s, 18 * sp.s, 76 * sp.s, 8); ctx.stroke(); ctx.setLineDash([]);
      }
    }
    if (showChild && cd) {
      person(zc, 46, 30, cd.sex === 'm' ? COL.son : COL.dau);
      TF(zc, 94, cd.name, PHONE ? 150 : 250, L(15, 13), 10.5, '#26324a', 'center', 800);
    } else {
      person(zc, 46, 30, '#cbd5e1'); T(zc, 52, '?', 18, '#64748b', 'center', 800);
      T(zc, 94, '자녀', L(15, 13), '#64748b', 'center', 800);
    }
    // 날아가는 염색체
    if (fl && fl.t > 0.4 && fl.t < 1.0) {
      const u = SciSim.ease.inOutCubic(clamp((fl.t - 0.4) / 0.6, 0, 1));
      const mv = (who, picks, slots) => picks.forEach((pi, k) => {
        const h = homeXY(who, pi), it = sp[who][pi], zx = zc + sp.zofs[slots[k]] * sp.s;
        pill({ x: h.x + (zx - h.x) * u, y: h.y - Math.sin(u * Math.PI) * 26, kind: it.kind, mark: it.mark, s: sp.s * (1 + 0.1 * Math.sin(u * Math.PI)), nolabel: true });
      });
      mv('f', fl.child.fp, sp.fslot); mv('m', fl.child.mp, sp.mslot);
    }
    if (kind === 'xl') {
      const tx = BAND.fcx, tw = PHONE ? 146 : 250;
      textBlock(tx, BAND_Y + 76, tw, 'Y 염색체에는 이 자리에 대응하는 유전자가 없어요 (반접합)', L(12.5, 11.5), '#1e3a8a', L(15, 14), 800, 'center');
    }
  }
  function crossDraw(kind, dt) {
    const st = kind === 'auto' ? S.auto : S.xl;
    crossUpdate(st, dt);
    drawBand(kind, st);
    st.bars.draw(BGEOM, { m: '아들', f: '딸' }, '비율 (%)');
  }
  const crossBusy = (st) => st.bars.pending() > 0 || !!st.fl;
  function autoReset() { S.auto.bars.reset(); S.auto.fl = null; S.auto.zy = null; }
  function xlReset() { S.xl.bars.reset(); S.xl.fl = null; S.xl.zy = null; }
  const autoCnt = () => { const b = S.auto.bars; return { n: b.all(), sm: b.total('m'), sf: b.total('f'), am: b.cnt.m.aa, af: b.cnt.f.aa }; };
  const xlCnt = () => { const b = S.xl.bars; return { n: b.all(), sm: b.total('m'), sf: b.total('f'), am: b.cnt.m.cb, af: b.cnt.f.cb, car: b.ex.carrier || 0 }; };
  const xlIsCross = (mom, dad) => S.xl.mom.join('') === mom && S.xl.dad.join('') === dad;


  /* =========================================================
     ④ 정반대 교배 · 남녀 발현 빈도
     ========================================================= */
  const RC = {
    alb: {
      name: '알비니즘 (상염색체 열성)', lab: ['정상', '알비니즘'],
      a: { mom: { g: 'AA', aff: false }, dad: { g: 'aa', aff: true } },
      b: { mom: { g: 'aa', aff: true }, dad: { g: 'AA', aff: false } },
      kid: (side) => [{ sex: 'm', g: 'Aa', aff: false, car: true }, { sex: 'm', g: 'Aa', aff: false, car: true }, { sex: 'f', g: 'Aa', aff: false, car: true }, { sex: 'f', g: 'Aa', aff: false, car: true }],
    },
    cb: {
      name: '적록 색맹 (X 연관 열성)', lab: ['정상', '색맹'],
      a: { mom: { g: 'XX', aff: false }, dad: { g: "X'Y", aff: true } },
      b: { mom: { g: "X'X'", aff: true }, dad: { g: 'XY', aff: false } },
      kid: (side) => (side === 'a'
        ? [{ sex: 'm', g: 'XY', aff: false }, { sex: 'm', g: 'XY', aff: false }, { sex: 'f', g: "XX'", aff: false, car: true }, { sex: 'f', g: "XX'", aff: false, car: true }]
        : [{ sex: 'm', g: "X'Y", aff: true }, { sex: 'm', g: "X'Y", aff: true }, { sex: 'f', g: "XX'", aff: false, car: true }, { sex: 'f', g: "XX'", aff: false, car: true }]),
    },
  };
  S.recip = { trait: 'alb', ran: {}, pops: {} };
  const sideTitle = (s) => (s === 'a' ? '(가) 어머니 정상 × 아버지 형질 보유' : '(나) 어머니 형질 보유 × 아버지 정상');
  const sideKids = (tr, s) => RC[tr].kid(s);
  function kidSummary(tr, s) {
    const k = sideKids(tr, s), lab = RC[tr].lab;
    const part = (sx, nm) => {
      const g = k.filter((q) => q.sex === sx), a = g.filter((q) => q.aff).length;
      return nm + ' ' + g.length + '명 : ' + (a === g.length ? '모두 ' + lab[1] : a === 0 ? '모두 ' + lab[0] + (g.some((q) => q.car) ? ' (보인자)' : '') : lab[0] + ' ' + (g.length - a) + ' · ' + lab[1] + ' ' + a);
    };
    return [part('m', '아들'), part('f', '딸')];
  }
  const sigOf = (tr, s) => sideKids(tr, s).map((q) => q.sex + (q.aff ? '1' : '0')).sort().join('');
  const recipSame = (tr) => sigOf(tr, 'a') === sigOf(tr, 'b');
  const recipRanN = () => ['alb', 'cb'].reduce((a, tr) => a + (S.recip.ran[tr + 'a'] ? 1 : 0) + (S.recip.ran[tr + 'b'] ? 1 : 0), 0);
  function recipRun(side) {
    const key = S.recip.trait + side;
    if (S.recip.ran[key]) { S.recip.ran[key] = 0; S.recip.pops[key] = 0; updateCtl(); return; }
    S.recip.ran[key] = 1; S.recip.pops[key] = 0; Sound.success(); updateCtl();
  }
  function recipPanel(x, y, w, h, side, dt, t) {
    const tr = S.recip.trait, rc = RC[tr], key = tr + side, ran = !!S.recip.ran[key];
    const pa = rc[side], col = side === 'a' ? '#0ea5e9' : '#a855f7';
    panel(x, y, w, h, 16, '#fff'); ctx.strokeStyle = col; ctx.lineWidth = 2.5; D.roundRect(x, y, w, h, 16); ctx.stroke();
    TF(x + w / 2, y + 26, sideTitle(side), w - 24, L(16.5, 14.5), 11, col, 'center', 800);
    const cx = x + w / 2, py = y + (PHONE ? 68 : 100), dx = Math.min(100, w * 0.24);
    D.dashedLine(cx - dx + 22, py - 4, cx + dx - 22, py - 4, { color: '#64748b', width: 2, dash: [1, 0] });
    [[cx - dx, pa.mom, '어머니', COL.dau, 0], [cx + dx, pa.dad, '아버지', COL.son, 1]].forEach(([px, par, nm, c, k]) => {
      person(px, py, L(34, 28), par.aff ? C.mix(c, '#e2464b', 0.55) : c);
      if (par.aff) { ctx.strokeStyle = '#e2464b'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(px, py - L(34, 28) * 0.1, L(34, 28) * 0.8, 0, TAU); ctx.stroke(); }
      T(px, py + L(34, 28) * 0.55 + 18, nm + ' ' + par.g, L(14.5, 13), '#26324a', 'center', 800);
      T(px, py + L(34, 28) * 0.55 + 35, par.aff ? rc.lab[1] : rc.lab[0], L(13, 12), par.aff ? '#b91c1c' : '#166534', 'center', 800);
    });
    const ky = y + (PHONE ? 158 : 262);
    if (!ran) {
      T(cx, ky, '▶ ' + '교배 실행 버튼을 눌러요', L(15, 13.5), '#94a3b8', 'center', 800);
      T(cx, ky + 24, '(자녀 4명: 아들 2 · 딸 2)', 12.5, '#94a3b8', 'center', 700);
      return;
    }
    S.recip.pops[key] = (S.recip.pops[key] || 0) + dt;
    const kids = sideKids(tr, side), sp = Math.min(86, (w - 30) / 4);
    D.dashedLine(cx, py + 70, cx, ky - 46, { color: '#64748b', width: 2, dash: [1, 0] });
    kids.forEach((kd, i) => {
      const kx = cx + (i - 1.5) * sp, a = RM ? 1 : SciSim.ease.outBack(clamp((S.recip.pops[key] - 0.15 - i * 0.22) / 0.4, 0, 1));
      if (a <= 0) return;
      ctx.save(); ctx.translate(kx, ky); ctx.scale(a, a); ctx.translate(-kx, -ky);
      const base = kd.sex === 'm' ? COL.son : COL.dau;
      person(kx, ky, L(28, 24), kd.aff ? C.mix(base, '#e2464b', 0.55) : base);
      if (kd.aff) { ctx.strokeStyle = '#e2464b'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(kx, ky - L(28, 24) * 0.1, L(28, 24) * 0.8, 0, TAU); ctx.stroke(); }
      T(kx, ky + 38, kd.g, L(14, 12.5), '#26324a', 'center', 800);
      T(kx, ky + 54, kd.aff ? rc.lab[1] : kd.car ? '보인자' : rc.lab[0], L(12.5, 11.5), kd.aff ? '#b91c1c' : kd.car ? '#7c3aed' : '#166534', 'center', 800);
      T(kx, ky - L(34, 30), kd.sex === 'm' ? '아들' : '딸', 12, '#64748b', 'center', 700);
      ctx.restore();
    });
    if (tr === 'cb') {
      // 교차 유전: 어머니의 X가 아들에게
      const ay = ky + (PHONE ? 66 : 78);
      D.arrow(cx - dx, py + 78, cx - 1.5 * sp, ky - 40, { color: '#ec4899', width: 2.6, dash: [6, 4], alpha: 0.9 });
      TF(cx, ky + (PHONE ? 72 : 84), '아들의 X는 어머니에게서 받아요', w - 20, L(13.5, 12), 10.5, '#be185d', 'center', 800);
      void ay;
    }
    const sm = kidSummary(tr, side);
    textBlock(x + 16, ky + (PHONE ? 92 : 124), w - 32, sm[0], L(14.5, 13), '#26324a', L(21, 19), 800);
    textBlock(x + 16, ky + (PHONE ? 92 : 124) + L(24, 22), w - 32, sm[1], L(14.5, 13), '#26324a', L(21, 19), 800);
  }
  function recipDraw(dt, t) {
    const tr = S.recip.trait;
    if (PHONE) {
      recipPanel(8, 8, 464, 290, 'a', dt, t); recipPanel(8, 306, 464, 290, 'b', dt, t);
    } else {
      recipPanel(14, 10, 382, 448, 'a', dt, t); recipPanel(404, 10, 382, 448, 'b', dt, t);
    }
    const vy = PHONE ? 602 : 470, vh = PHONE ? 32 : 78, both = S.recip.ran[tr + 'a'] && S.recip.ran[tr + 'b'];
    panel(PHONE ? 8 : 14, vy, VW - (PHONE ? 16 : 28), vh, 14, both ? (recipSame(tr) ? '#ecfdf5' : '#fef3c7') : '#ffffff');
    if (both) {
      const same = recipSame(tr);
      TF(VW / 2, vy + (PHONE ? 21 : 32), '(가)와 (나)의 결과가 ' + (same ? '같아요 → 아들 · 딸 어디서도 차이가 없어요' : '달라요 → 아들의 표현형이 어머니를 따라가요'), VW - 50, L(19, 14.5), 12, same ? '#166534' : '#92400e', 'center', 800);
      if (!PHONE) T(VW / 2, vy + 58, RC[tr].name, 14, '#64748b', 'center', 700);
    } else {
      TF(VW / 2, vy + (PHONE ? 21 : 45), '두 방향의 교배를 모두 실행해 결과를 비교해 봐요', VW - 50, L(17, 13.5), 11, '#94a3b8', 'center', 800);
    }
  }

  /* ---------- 남녀 발현 빈도: X 염색체 100개 중 6개가 X' ---------- */
  S.freq = { solved: false, pick: { t: 0, m: [], f: [] }, ratioShow: 0 };
  const FQ = 0.06;
  const fqFem = FQ * FQ, fqRatio = FQ / fqFem;     // 0.0036 · 약 16.7배
  function freqDraw(dt, t) {
    const f = S.freq;
    const pw = VW - (PHONE ? 16 : 28), px = PHONE ? 8 : 14, py = PHONE ? 8 : 12, ph = PHONE ? 196 : 206;
    panel(px, py, pw, ph, 16, '#fff');
    T(px + 14, py + 26, 'X 염색체 100개 중 6개가 색맹 대립유전자 X\'을 가진다고 해요 (q = 0.06)', L(15, 12.5), '#334155', 'left', 800);
    const cols = PHONE ? 20 : 25, rows = 100 / cols, cell = Math.min((pw - 28) / cols, (ph - 70) / rows), gx = px + (pw - cell * cols) / 2, gy = py + 40;
    // 6개의 X'는 고정된 위치
    const FIX = [3, 17, 29, 41, 62, 88];
    for (let i = 0; i < 100; i++) {
      const cx = gx + (i % cols) * cell + cell / 2, cy = gy + Math.floor(i / cols) * cell + cell / 2, mk = FIX.indexOf(i * 1) >= 0;
      ctx.fillStyle = mk ? '#e2464b' : '#f9a8d4'; D.roundRect(cx - cell * 0.4, cy - cell * 0.4, cell * 0.8, cell * 0.8, 3); ctx.fill();
      if (mk) { ctx.strokeStyle = '#9f1239'; ctx.lineWidth = 1.5; ctx.stroke(); }
    }
    // 뽑기 장면: 남자는 1개, 여자는 2개
    f.pick.t -= dt;
    if (f.pick.t <= 0) { f.pick.t = 1.4; f.pick.m = [Math.floor(rnd() * 100)]; f.pick.f = [Math.floor(rnd() * 100), Math.floor(rnd() * 100)]; }
    const ring = (i, col) => { const cx = gx + (i % cols) * cell + cell / 2, cy = gy + Math.floor(i / cols) * cell + cell / 2; ctx.strokeStyle = col; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.arc(cx, cy, cell * 0.62, 0, TAU); ctx.stroke(); };
    f.pick.m.forEach((i) => ring(i, COL.son)); f.pick.f.forEach((i) => ring(i, '#7c3aed'));
    T(px + 14, py + ph - 10, '푸른 원: 남자가 받는 X 1개 · 보라 원: 여자가 받는 X 2개 (무작위로 뽑아 봐요)', L(13, 11.5), '#64748b', 'left', 700);
    // 막대
    const by = py + ph + 12, bh = VH - by - 10;
    panel(px, by, pw, bh, 16, '#fff');
    const base = by + bh - 48, top = by + 46, plotH = base - top, max = 8, bx0 = px + 70, bw = PHONE ? 70 : 96;
    T(px + 14, by + 26, '발현 빈도 (색맹인 사람의 비율, %)', L(15, 13), '#334155', 'left', 800);
    [0, 2, 4, 6, 8].forEach((v) => { const yy = base - plotH * v / max; ctx.strokeStyle = v === 0 ? '#94a3b8' : '#e2e8f0'; ctx.lineWidth = v === 0 ? 1.6 : 1; ctx.beginPath(); ctx.moveTo(bx0 - 14, yy); ctx.lineTo(px + pw - 14, yy); ctx.stroke(); T(bx0 - 20, yy + 4, v + '', 11.5, '#64748b', 'right', 700); });
    const bars = [{ lab: '남자 (X 1개)', v: FQ * 100, col: COL.son, cx: bx0 + 70 + (PHONE ? 10 : 40) }, { lab: '여자 (X 2개)', v: fqFem * 100, col: COL.dau, cx: bx0 + 70 + (PHONE ? 10 : 40) + (PHONE ? 140 : 230), hide: !f.solved }];
    f.ratioShow = approach(f.ratioShow, f.solved ? 1 : 0, dt, 5);
    bars.forEach((b, i) => {
      const hh = plotH * (b.hide ? 0 : b.v / max) * (i === 1 ? f.ratioShow : 1);
      if (hh > 0.2) { const g = ctx.createLinearGradient(b.cx - bw / 2, 0, b.cx + bw / 2, 0); g.addColorStop(0, C.shade(b.col, 0.2)); g.addColorStop(1, b.col); ctx.fillStyle = g; D.roundRect(b.cx - bw / 2, base - hh, bw, hh, hh < 6 ? 1 : 5); ctx.fill(); }
      T(b.cx, base + 18, b.lab, L(14.5, 13), '#26324a', 'center', 800);
      const lab = i === 0 ? '6 %' : f.solved ? fmtN(fqFem * 100, 2) + ' %' : '? %';
      T(b.cx, Math.min(base - hh - 8, base - 8), lab, 15, '#1f2d44', 'center', 800, { stroke: '#fff', strokeWidth: 3 });
      if (i === 1 && !f.solved) T(b.cx, base - 28, '직접 계산해 봐요', 12.5, '#94a3b8', 'center', 700);
    });
    // 식
    const ex = bx0 + 70 + (PHONE ? 10 : 40) + (PHONE ? 140 : 230) + (PHONE ? 62 : 90), ew = px + pw - 14 - ex;
    if (ew > 80) {
      textBlock(ex, top + 6, ew, '남자: X\'이 1개면 돼요 → q = 0.06', 13, '#1d4ed8', 18, 800);
      textBlock(ex, top + 62, ew, f.solved ? '여자: 두 X가 모두 X\'이어야 해요 → q × q = ' + fmtN(fqFem, 4) : '여자: 두 X가 모두 X\'이어야 해요', 13, '#be185d', 18, 800);
      if (f.solved) textBlock(ex, top + 128, ew, '남자가 여자의 약 ' + fmtN(fqRatio, 0) + '배', 14, '#26324a', 20, 800);
    }
    if (!PHONE || true) { /* 설명 줄 */ }
    // 큰 결과
    if (f.solved && PHONE) TF(px + pw / 2, by + bh - 14, '남자가 여자의 약 ' + fmtN(fqRatio, 0) + '배 (6 % : ' + fmtN(fqFem * 100, 2) + ' %)', pw - 20, 14, 11, '#26324a', 'center', 800);
  }


  /* =========================================================
     화면 전환 · 조작 연결
     ========================================================= */
  S.tbl = { on: false }; S.rule = { on: false };
  const PTS = { chain: chainPT, locate: locPT };
  function setMode(m) {
    if (S.mode !== m) S.fade = 1;
    S.mode = m; PT = PTS[m] || null; hideHint(); updateCtl();
  }
  const ctlNodes = $$('#ctrlCard .control');
  const OPT = (sel, arr) => { sel.innerHTML = ''; arr.forEach(([v, t]) => { const o = document.createElement('option'); o.value = v; o.textContent = t; sel.appendChild(o); }); };
  OPT($('#tAll'), [['', '고르세요'], ['0', '0'], ['1/4', '1/4'], ['1/2', '1/2'], ['3/4', '3/4'], ['1', '1']]);
  OPT($('#tSon'), [['', '고르세요'], ['0', '0'], ['1/4', '1/4'], ['1/2', '1/2'], ['3/4', '3/4'], ['1', '1']]);
  OPT($('#tDau'), [['', '고르세요'], ['0', '0'], ['1/4', '1/4'], ['1/2', '1/2'], ['3/4', '3/4'], ['1', '1']]);
  OPT($('#ruleSame'), [['', '고르세요'], ['auto', '상염색체 유전'], ['X', 'X 연관 유전']]);
  OPT($('#ruleDiff'), [['', '고르세요'], ['auto', '상염색체 유전'], ['X', 'X 연관 유전']]);
  function updateCtl() {
    const fr = game ? game.free : false, lvNow = game ? game.level : 0;
    ctlNodes.forEach((n) => { n.hidden = (n.dataset.modes || '').split(' ').indexOf(S.mode) < 0; });
    modeButtons(S.mode, lvNow, fr);
    const sc = S.chain, cs = CASES[sc.cur];
    chipSet($('#caseSel'), sc.cur);
    $$('#caseSel button').forEach((b) => b.classList.toggle('seen', !!sc.done[b.dataset.v]));
    $('#alleleBox').hidden = !sc.done[sc.cur];
    const ab = $$('#alleleSel button'); ab[0].textContent = cs.opts[0]; ab[1].textContent = cs.opts[1]; chipSet($('#alleleSel'), String(sc.allele));
    $('#chainNote').textContent = sc.done[sc.cur] ? '대립유전자를 열성으로 바꾸면 단백질과 형질이 어떻게 달라지는지 비교해 보세요.' : '카드 세 장을 ①유전자 → ②단백질 → ③형질 상자에 끌어 놓아요. 카드를 누르면 선택되고 상자를 누르면 놓여요.';
    chipSet($('#momSel'), S.xl.mom.join('')); chipSet($('#dadSel'), S.xl.dad[0]);
    $('#autoTh').classList.toggle('on', S.auto.bars.showTh); $('#xlTh').classList.toggle('on', S.xl.th);
    $('#xlTbl').hidden = !S.tbl.on; $('#ruleBox').hidden = !S.rule.on;
    chipSet($('#trSel'), S.recip.trait);
    $('#rcA').textContent = (S.recip.ran[S.recip.trait + 'a'] ? '↺ (가) 다시 실행' : '(가) 교배 실행') + ' : 어머니 정상 × 아버지 형질';
    $('#rcB').textContent = (S.recip.ran[S.recip.trait + 'b'] ? '↺ (나) 다시 실행' : '(나) 교배 실행') + ' : 어머니 형질 × 아버지 정상';
    $$('#trSel button').forEach((b) => b.classList.toggle('seen', !!(S.recip.ran[b.dataset.v + 'a'] && S.recip.ran[b.dataset.v + 'b'])));
    const busyA = crossBusy(S.auto), busyX = crossBusy(S.xl);
    $$('#autoBtns button').forEach((b) => { b.disabled = busyA && +b.dataset.n !== 1 ? true : busyA && S.auto.bars.pending() > 0; });
    $$('#xlBtns button').forEach((b) => { b.disabled = busyX && S.xl.bars.pending() > 0; });
  }
  bindModes(setMode);
  $$('#caseSel button').forEach((b) => b.addEventListener('click', () => { Sound.click(); chainSetCase(b.dataset.v); }));
  $$('#alleleSel button').forEach((b) => b.addEventListener('click', () => {
    Sound.click(); S.chain.allele = +b.dataset.v; S.chain.flow = [];
    if (S.chain.allele === 1) S.chain.mutSeen[S.chain.cur] = true;
    updateCtl();
  }));
  $('#chainReset').addEventListener('click', () => { Sound.click(); chainReset(); updateCtl(); });
  $('#locReset').addEventListener('click', () => { Sound.click(); loc.reset(); });
  $$('#autoBtns button').forEach((b) => b.addEventListener('click', () => { runTrials('auto', +b.dataset.n); updateCtl(); }));
  $$('#xlBtns button').forEach((b) => b.addEventListener('click', () => { runTrials('xl', +b.dataset.n); updateCtl(); }));
  $('#autoTh').addEventListener('click', () => { Sound.click(); S.auto.bars.showTh = !S.auto.bars.showTh; updateCtl(); });
  $('#xlTh').addEventListener('click', () => { Sound.click(); S.xl.th = !S.xl.th; S.xl.bars.showTh = S.xl.th; updateCtl(); });
  $('#autoReset').addEventListener('click', () => { Sound.click(); autoReset(); updateCtl(); });
  $('#xlReset').addEventListener('click', () => { Sound.click(); xlReset(); updateCtl(); });
  $$('#momSel button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.xl.mom = b.dataset.v.split(''); xlRebuild(); updateCtl(); }));
  $$('#dadSel button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.xl.dad = [b.dataset.v, 'Y']; xlRebuild(); updateCtl(); }));
  $$('#trSel button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.recip.trait = b.dataset.v; updateCtl(); }));
  $('#rcA').addEventListener('click', () => recipRun('a'));
  $('#rcB').addEventListener('click', () => recipRun('b'));
  S.chain.mutSeen = {};
  ['tAll', 'tSon', 'tDau', 'ruleSame', 'ruleDiff'].forEach((id) => $('#' + id).addEventListener('change', (e) => { e.target.classList.remove('ok', 'bad'); }));
  const fqVal = () => {
    const raw = String($('#fqIn').value).trim(); if (!raw) return NaN;
    const v = parseFrac(raw); if (!isFinite(v)) return NaN;
    return /%/.test(raw) || v >= 0.05 ? (/%/.test(raw) ? v : v / 100) : v;
  };
  const fqOk = () => { const v = fqVal(); return isFinite(v) && v >= 0.0031 && v <= 0.0041; };
  $('#fqIn').addEventListener('input', () => { const ok = fqOk(); S.freq.solved = ok; $('#fqIn').classList.toggle('ok', ok); if (ok) { Sound.success(); } });
  function freqReset() { S.freq.solved = false; $('#fqIn').value = ''; $('#fqIn').classList.remove('ok'); }

  /* =========================================================
     미션
     ========================================================= */
  const aOK = () => { const a = autoCnt(); return a.n >= 100 && a.sm >= 20 && a.sf >= 20; };
  const xlOK = () => { const x = xlCnt(); return xlIsCross('NM', 'NY') && x.n >= 100 && x.sm >= 30 && x.am / x.sm >= 0.3 && x.am / x.sm <= 0.7; };
  const levels = [
    {
      title: '유전자와 형질', short: '유전자와 형질', icon: '🔗', phase: '탐구',
      intro: '<p class="si-q">❓ 탐구 질문: 같은 열성 형질인데 왜 어떤 형질은 아들에게만 더 자주 나타날까?</p><p>🔗 <b>중학교</b>에서 멘델의 분리 법칙과 적록 색맹을, <b>생명과학</b>에서 상동 염색체와 성염색체(상염색체 22쌍 + 성염색체 1쌍)를 배웠어요. 이 차시에서는 <b>유전자 → 단백질 → 형질</b>의 관계를 과학적으로 확인된 사례로 살펴보고, <b>상염색체 유전</b>과 <b>X 염색체 유전</b>이 자손에게 전해지는 방식이 어떻게 다른지 알아봐요.</p><p>💡 먼저 사례 3개의 사슬을 만들고, 유전자가 어느 염색체에 있는지 지도에서 확인해요.</p>',
      features: ['chain', 'locate'],
      setup() { setMode('chain'); },
      recap: '유전자는 단백질(효소 등)을 통해 형질을 나타내요. 대립유전자가 달라 단백질이 달라지면 형질이 달라져요. 유전자는 상염색체 또는 X 염색체에 있고, 우성은 \'더 흔한\' 형질이 아니라 대립유전자 하나로 나타나는 형질이에요.',
      summary: '<ul><li><b>유전자 → 단백질 → 형질</b>: 완두 SBEI 유전자(녹말 가지 효소)는 둥근 씨·주름진 씨를, 알비니즘의 TYR 유전자(티로시네이스)는 멜라닌 합성을, 적록 색맹은 원뿔세포의 색소 단백질을 결정해요.</li><li>유전자의 위치: 알비니즘(TYR) <b>11번</b>, 연골 무형성증(FGFR3) <b>4번</b> → <b>상염색체</b> / 적록 색맹 · 혈우병 A → <b>X 염색체</b>. 완두에는 성염색체가 없어요.</li><li><b>우성</b> = 대립유전자 하나만 있어도 나타나는 형질이에요. 집단에서 더 흔하다는 뜻이 아니에요 (연골 무형성증은 우성이지만 약 2만 5천 명 중 1명 정도로 드물어요, 예시 값).</li></ul>',
      missions: [
        {
          id: 'chain', title: '유전자 → 단백질 → 형질',
          goal: '완두 · 알비니즘 · 적록 색맹의 카드를 <b>유전자 → 단백질 → 형질</b> 순서로 놓고, 각 사례에서 <b>열성 대립유전자</b>로 바꿔 결과를 확인하세요.',
          hint: '위쪽 \'사례 고르기\'에서 사례를 바꿔요. 카드를 모두 놓으면 \'대립유전자 바꾸기\' 버튼이 나타나요. 열성(또는 색맹) 버튼을 눌러 보세요.',
          setup() { chainAllReset(); S.chain.mutSeen = {}; setMode('chain'); },
          check: () => chainCount() === 3 && CASE_IDS.every((id) => S.chain.mutSeen[id]), hold: 0.6,
          status: () => mark(chainCount() === 3) + ' 사슬 ' + chainCount() + ' / 3 &nbsp; ' + mark(CASE_IDS.every((id) => S.chain.mutSeen[id])) + ' 열성 확인 ' + CASE_IDS.filter((id) => S.chain.mutSeen[id]).length + ' / 3',
          explain: '유전자는 <b>단백질</b>(효소, 색소 단백질 등)을 만드는 정보이고, 단백질이 <b>형질</b>을 나타내요. 완두 <b>SBEI</b> 유전자의 열성 대립유전자(r)는 녹말 가지 효소를 만들지 못해 녹말이 적고 당이 많아요. 삼투로 물을 많이 흡수했다가 마르면서 쭈글쭈글한 <b>주름진 씨</b>가 돼요. 알비니즘은 <b>TYR</b> 유전자의 이상으로 멜라닌을 만들지 못해 색소가 없어요.',
        },
        {
          id: 'locate', title: '유전자는 어느 염색체에?', manual: true,
          goal: '염색체 지도를 보고 유전자 카드 5장을 <b>상염색체</b> 또는 <b>X 염색체</b> 상자에 넣으세요.',
          hint: '지도에 4번(FGFR3), 11번(TYR), X(색소 · 응고 인자 유전자)가 표시되어 있어요. 완두는 성염색체가 없는 식물이에요.',
          setup() { setMode('locate'); loc.reset(); },
          check() {
            if (loc.placed < 5) { loc.markBad([]); return '카드를 모두 상자에 넣어 주세요. (' + loc.placed + ' / 5)'; }
            const w = locWrong();
            if (!w.length) { loc.markBad([]); return true; }
            loc.markBad(w.map((c) => c.id));
            return '\'' + w[0].label + '\' 카드가 들어갈 상자를 다시 생각해 보세요. 지도에서 그 유전자가 있는 염색체를 찾아봐요.';
          },
          explain: '알비니즘의 <b>TYR</b>은 11번, 연골 무형성증의 <b>FGFR3</b>는 4번 상염색체에 있어요. 적록 색맹과 혈우병 A의 유전자는 <b>X 염색체</b>에 있어요. 완두에는 성염색체가 없으므로 완두의 유전자는 모두 상염색체에 있는 것으로 봐요.',
        },
        {
          type: 'quiz', title: '우성이란?',
          goal: '\'우성\' 형질에 대한 설명으로 옳은 것은?',
          setup() { setMode('locate'); },
          choices: ['우성 형질은 집단에서 항상 더 흔하다', '우성 형질은 대립유전자 하나만 있어도 나타난다', '우성 형질은 열성 형질보다 항상 몸에 유리하다', '연골 무형성증은 우성 유전이라서 매우 흔한 유전병이다'],
          answer: 1,
          feedback: ['우열은 \'흔한 정도\'와 관계없어요. 우성인 연골 무형성증은 약 2만 5천 명 중 1명 정도로 드물어요 (예시 값).', '', '우성인지 열성인지는 몸에 유리한지와 관계없어요.', '연골 무형성증은 우성이지만 매우 드문 유전병이에요.'],
          explain: '우성은 <b>대립유전자 하나만 있어도 형질이 나타나는 것</b>을 뜻해요. 집단에서 얼마나 흔한지와는 별개예요. 연골 무형성증(FGFR3, 4번 상염색체)은 우성이지만 드물어요.',
        },
      ],
    },
    {
      title: '상염색체 유전', short: '상염색체', icon: '🧬', phase: '모형',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 알비니즘의 TYR 유전자는 11번 상염색체에 있다는 것을 확인했어요.</div><p>이제 부모가 모두 <b>보인자(Aa)</b>인 알비니즘 가계에서 자녀가 태어나는 과정을 <b>모형</b>으로 재현해요. 상동 염색체 쌍이 갈라져 배우자가 만들어지고, 성별(XX / XY)은 <b>따로</b> 정해져요.</p><p>💡 아들과 딸 각각에서 알비니즘(aa)의 비율이 어떻게 되는지 비교해 봐요.</p>',
      features: ['auto'],
      setup() { setMode('auto'); },
      recap: '상염색체 유전자는 성별과 관계없이 전해져요. Aa × Aa → AA : Aa : aa = 1 : 2 : 1이고, 아들과 딸에서 aa의 비율이 모두 1/4에 가까워져요. 한 번의 결과는 다음 확률에 영향을 주지 않아요.',
      summary: '<ul><li><b>상염색체 유전</b>: 유전자가 상염색체에 있어서 <b>성별과 관계없이</b> 같은 방식으로 전해져요.</li><li>Aa × Aa → 배우자 A : a = 1 : 1 → 자녀 <b>AA : Aa : aa = 1 : 2 : 1</b>, 알비니즘(aa) 확률 <b>1/4</b>. 아들 중 aa도 1/4, 딸 중 aa도 1/4이에요.</li><li>자녀 수가 적으면 비율이 흔들리지만, 많을수록 이론값(1/4)에 가까워져요.</li><li>첫째가 aa여도 둘째가 aa일 확률은 <b>여전히 1/4</b>이에요. (각 수정은 독립적)</li></ul>',
      missions: [
        {
          id: 'auto', title: '아들과 딸의 알비니즘 비율',
          goal: 'Aa × Aa 부부의 자녀를 <b>100명 이상</b> 만들고, 아들과 딸에서 <b>알비니즘(aa) 비율</b>을 비교해 보세요.',
          hint: '\'+1명\' 버튼으로 과정을 보고, \'+100명\'으로 한꺼번에 만들 수 있어요. 점선(이론값)은 \'이론값 보기\'로 켜요.',
          setup() { autoReset(); setMode('auto'); },
          check: () => aOK(), hold: 0.8,
          status: () => { const a = autoCnt(); return mark(a.n >= 100) + ' 자녀 ' + a.n + ' / 100명 &nbsp; 아들 aa ' + pct(a.am, a.sm, 1) + ' &nbsp; 딸 aa ' + pct(a.af, a.sf, 1); },
          explain: '아들과 딸 모두에서 알비니즘(aa)의 비율이 <b>약 1/4(25 %)</b>이에요. 상염색체의 유전자는 성별과 관계없이 전해지기 때문에 <b>성별에 따른 차이가 없어요</b>. 자녀 수가 적을 때는 비율이 흔들리지만 많아질수록 이론값에 가까워져요.',
        },
        {
          type: 'quiz', title: '둘째가 aa일 확률',
          goal: 'Aa × Aa 부부의 첫째가 알비니즘(aa)이에요. 둘째가 알비니즘일 확률은?',
          setup() { setMode('auto'); },
          choices: ['0 (첫째가 이미 알비니즘이므로)', '1/4', '1/2', '3/4'],
          answer: 1,
          feedback: ['첫째의 결과는 둘째에 영향을 주지 않아요. 각 자녀는 새로 수정된 독립적인 사건이에요.', '', '1/2은 Aa × aa 같은 교배의 확률이에요. Aa × Aa에서 aa는 1/4이에요.', '3/4는 알비니즘이 \'아닐\' 확률(AA 또는 Aa)이에요.'],
          explain: '각 수정은 독립적이에요. 첫째가 aa였다는 사실은 둘째에 아무 영향을 주지 않으므로 둘째가 aa일 확률은 <b>언제나 1/4</b>이에요. (자녀를 4명 낳는다고 정확히 1명이 aa인 것도 아니에요.)',
        },
      ],
    },
    {
      title: 'X 연관 유전', short: 'X 연관', icon: '🎀', phase: '모형',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 상염색체 유전은 아들과 딸에서 같은 비율로 나타났어요.</div><p>이번에는 유전자가 <b>X 염색체</b>에 있는 <b>적록 색맹</b>이에요. X는 분홍색, Y는 파란색으로 그리고, 색맹 대립유전자 X\'은 빨간 띠로 표시해요. <b>Y 염색체에는 같은 자리에 유전자가 없어서</b> 남자는 X 연관 유전자를 <b>하나만</b> 가져요(반접합).</p><p>💡 부모의 유전자형을 골라 자녀를 만들고, 아들과 딸을 나눠서 봐요.</p>',
      features: ['xl'],
      setup() { setMode('xl'); },
      recap: '남자는 X 연관 유전자를 하나만 가지므로 열성이어도 그대로 나타나요. 아들의 X는 어머니에게서 오고, 딸은 아버지의 X 전부와 어머니의 X 하나를 받아요. 그래서 XX\' × XY의 자녀가 색맹일 확률은 전체 1/4, 아들 1/2, 딸 0이에요.',
      summary: '<ul><li>성 결정: 난자는 모두 X, 정자는 X : Y = 1 : 1 → 아들 : 딸 ≈ 1 : 1.</li><li><b>X 연관 유전</b>: 유전자가 X 염색체에 있어요. Y에는 대응하는 유전자가 없어서 남자는 한 개만 가져요(<b>반접합</b>) → 열성이어도 나타나요.</li><li>아들의 X는 <b>어머니</b>에게서, 딸은 아버지의 X 전부와 어머니의 X 하나를 받아요. 아버지 → 아들로는 Y가 전달돼요.</li><li>보인자 어머니(XX\') × 정상 아버지(XY): 아들 중 색맹 <b>1/2</b>, 딸 중 색맹 <b>0</b>(딸의 1/2는 보인자), 전체 자녀 중 색맹 <b>1/4</b>.</li></ul>',
      missions: [
        {
          id: 'xl', title: '보인자 어머니의 아들',
          goal: '어머니를 <b>XX\'(보인자)</b>, 아버지를 <b>XY(정상)</b>로 고르고 자녀를 <b>100명 이상</b> 만든 뒤 아들 중 색맹의 비율을 확인하세요.',
          hint: '오른쪽 위 \'부모의 유전자형 고르기\'에서 어머니 XX\'와 아버지 XY를 눌러요. \'+100명\'을 누르면 돼요. 아들 중 색맹 비율은 약 1/2(50 %)이에요.',
          setup() { xlReset(); setMode('xl'); },
          check: () => xlOK(), hold: 0.8,
          status: () => { const x = xlCnt(); return mark(xlIsCross('NM', 'NY')) + ' 어머니 XX\' · 아버지 XY &nbsp; ' + mark(x.n >= 100 && xlIsCross('NM', 'NY')) + ' 자녀 ' + (xlIsCross('NM', 'NY') ? x.n : 0) + ' / 100명 &nbsp; 아들 중 색맹 ' + pct(x.am, x.sm, 1); },
          explain: '아들은 어머니의 X 둘 중 하나를 받아요. 어머니가 XX\'이면 아들의 <b>절반(1/2)</b>이 X\'을 받아 색맹이 돼요. 아버지에게서는 Y를 받으니 아버지가 정상이라는 사실은 아들에게 영향을 주지 않아요. 딸은 아버지의 정상 X를 받으므로 색맹이 되지 않아요.',
        },
        {
          id: 'tbl', title: '색맹 확률 표', manual: true,
          goal: '보인자 어머니(XX\') × 정상 아버지(XY)에서 <b>전체 자녀 · 아들 중 · 딸 중</b> 색맹일 확률을 표에 채우세요.',
          hint: '아들 중 1/2가 색맹이고 딸은 모두 아버지의 정상 X를 받아요. 전체 자녀는 아들이 1/2이므로 1/2 × 1/2 = 1/4예요.',
          setup() { ['tAll', 'tSon', 'tDau'].forEach((id) => { $('#' + id).value = ''; $('#' + id).classList.remove('ok', 'bad'); }); setMode('xl'); S.tbl.on = true; updateCtl(); },
          check() {
            const v = { tAll: $('#tAll').value, tSon: $('#tSon').value, tDau: $('#tDau').value }, ans = { tAll: '1/4', tSon: '1/2', tDau: '0' };
            const nm = { tAll: '전체 자녀', tSon: '아들 중', tDau: '딸 중' };
            if (!v.tAll || !v.tSon || !v.tDau) return '세 칸을 모두 골라 주세요.';
            const bad = Object.keys(ans).filter((k) => v[k] !== ans[k]);
            Object.keys(ans).forEach((k) => { $('#' + k).classList.toggle('ok', v[k] === ans[k]); $('#' + k).classList.toggle('bad', v[k] !== ans[k]); });
            if (!bad.length) return true;
            return '\'' + nm[bad[0]] + '\' 칸을 다시 생각해 보세요. (아들의 X는 어머니에게서, 딸은 아버지의 X를 받아요)';
          },
          explain: '어머니 XX\'은 X와 X\'을 1 : 1로 만들어요. <b>아들</b>(XY)은 어머니의 X를 받으므로 색맹(X\'Y)이 될 확률이 <b>1/2</b>이에요. <b>딸</b>은 아버지의 정상 X를 받아 색맹이 되지 않아요(<b>0</b>, 딸의 1/2는 보인자 XX\'). 전체 자녀 중에서는 1/2(아들) × 1/2 = <b>1/4</b>이에요.',
        },
        {
          type: 'quiz', title: '색맹 아버지의 X\'은 어디로?',
          goal: '색맹인 아버지(X\'Y)의 X\'은 아들에게 전달될까요?',
          setup() { setMode('xl'); },
          choices: ['네. 아들도 아버지에게서 X를 받아요', '아니요. 아들은 아버지에게서 Y를 받아요', '아버지가 색맹이면 아들은 모두 보인자예요', '아니요. 아들은 아버지에게서 아무것도 받지 않아요'],
          answer: 1,
          feedback: ['아들(XY)의 X는 어머니에게서 와요. 아버지에게서는 Y를 받아요.', '', '보인자는 X를 두 개 가진 여자에서 쓰는 말이에요. 아들은 X가 하나뿐이에요.', '아버지에게서 Y 염색체(성을 결정)를 받아요. 다만 Y에는 색맹 유전자 자리가 없어요.'],
          explain: '아들은 아버지의 <b>Y</b>와 어머니의 <b>X</b>를 받아요. 그래서 아버지의 X\'은 아들에게 전달되지 않고 <b>딸에게만</b> 전달돼요. 아들의 색맹 여부는 어머니의 유전자형이 결정해요.',
        },
      ],
    },
    {
      title: '정반대 교배', short: '정반대 교배', icon: '🔄', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> X 연관 유전은 아들의 표현형이 어머니에게서 정해진다는 것을 확인했어요.</div><p>같은 형질을 <b>(가) 어머니 정상 × 아버지 형질</b>과 <b>(나) 어머니 형질 × 아버지 정상</b>으로 바꿔 교배해 봐요. 이것이 <b>정반대 교배</b>예요. 유전자가 상염색체에 있는지 X 염색체에 있는지에 따라 결과가 같을 수도, 다를 수도 있어요.</p><p>💡 마지막에는 남녀의 발현 빈도 차이도 계산해 봐요.</p>',
      features: ['recip', 'freq'],
      setup() { setMode('recip'); },
      recap: '정반대 교배에서 결과가 같으면 상염색체 유전, 아들의 표현형이 어머니를 따라가 결과가 성별에 따라 다르면 X 연관 유전을 의심해요. X 연관 열성 형질은 남자에서 훨씬 자주 나타나요.',
      summary: '<ul><li><b>정반대 교배</b>: 부모의 형질을 서로 바꿔 두 방향으로 교배해요.</li><li>알비니즘(상염색체): aa × AA, AA × aa 모두 자녀가 <b>모두 Aa(정상)</b>로 결과가 같아요.</li><li>적록 색맹(X 연관): (가) XX × X\'Y → 아들 정상, 딸 보인자 / (나) X\'X\' × XY → 아들 <b>모두 색맹</b>, 딸 보인자 → 결과가 <b>성별에 따라 달라요</b>(교차 유전).</li><li><b>판정 규칙</b>: 결과가 같으면 상염색체, 성별에 따라 다르면 X 연관을 의심해요.</li><li>X 연관 열성 형질: 열성 대립유전자를 가진 X의 비율이 q = 0.06이면 남자 <b>6 %</b>, 여자 q² = 0.0036(<b>0.36 %</b>) → 남자가 약 17배 더 자주 나타나요. 색맹인 딸의 아버지는 반드시 색맹이에요.</li></ul>',
      missions: [
        {
          id: 'recip', title: '판정 규칙 카드 완성', manual: true,
          goal: '알비니즘과 적록 색맹의 정반대 교배를 <b>(가) · (나) 모두</b> 실행하고, 판정 규칙 카드를 완성하세요.',
          hint: '\'형질 고르기\'에서 알비니즘과 색맹을 각각 고른 뒤 (가)와 (나) 교배를 실행해요. 화면 아래에 두 결과가 같은지 달라지는지 나와요.',
          setup() { S.recip.ran = {}; S.recip.pops = {}; ['ruleSame', 'ruleDiff'].forEach((id) => { $('#' + id).value = ''; $('#' + id).classList.remove('ok', 'bad'); }); setMode('recip'); S.rule.on = true; updateCtl(); },
          check() {
            const n = recipRanN();
            if (n < 4) return '두 형질 모두 (가)와 (나) 교배를 실행해 보세요. (' + n + ' / 4)';
            const a = $('#ruleSame').value, b = $('#ruleDiff').value;
            if (!a || !b) return '판정 규칙 카드의 두 칸을 모두 고르세요.';
            $('#ruleSame').classList.toggle('ok', a === 'auto'); $('#ruleSame').classList.toggle('bad', a !== 'auto');
            $('#ruleDiff').classList.toggle('ok', b === 'X'); $('#ruleDiff').classList.toggle('bad', b !== 'X');
            if (a !== 'auto') return '정반대 교배의 결과가 같았던 형질은 알비니즘이에요. 알비니즘은 어떤 유전일까요?';
            if (b !== 'X') return '결과가 성별에 따라 달랐던 형질은 적록 색맹이에요. 적록 색맹은 어떤 유전일까요?';
            return true;
          },
          explain: '알비니즘(상염색체 유전)은 어느 쪽이 aa여도 자녀가 모두 Aa라서 결과가 <b>같아요</b>. 적록 색맹(X 연관)은 아들의 X가 어머니에게서 오기 때문에 (가)에서는 아들이 정상, (나)에서는 아들이 모두 색맹으로 <b>성별에 따라 달라요</b>. 그래서 정반대 교배의 결과가 같으면 상염색체 유전, 성별에 따라 다르면 X 연관 유전을 의심해요. 같은 열성 형질이 남녀에게 비슷하게 나타나면 상염색체 유전일 가능성이 커요.',
        },
        {
          id: 'freq', title: '남녀 발현 빈도', manual: true,
          goal: 'X 염색체 100개 중 6개가 X\'이에요. <b>여자</b>가 색맹일 빈도(%)를 계산해 입력하세요.',
          hint: '여자는 X를 두 개 가져서 두 X가 모두 X\'이어야 해요. 0.06 × 0.06 = 0.0036이고, 퍼센트로는 0.36 %예요.',
          setup() { freqReset(); setMode('freq'); },
          check() {
            const raw = String($('#fqIn').value).trim();
            if (!raw) return '여자의 발현 빈도(%)를 입력해 주세요.';
            if (fqOk()) { S.freq.solved = true; return true; }
            const v = fqVal();
            if (isFinite(v) && Math.abs(v - 0.06) < 0.004) return '0.06은 남자의 빈도예요. 여자는 두 X가 모두 X\'이어야 하니 0.06을 한 번 더 곱해요.';
            return '여자는 X를 두 개 가져서 두 X가 모두 X\'이어야 해요. 0.06 × 0.06을 퍼센트로 바꿔 보세요.';
          },
          explain: '남자는 X가 하나뿐이라 X\'이면 곧 색맹이므로 빈도가 q = 0.06(<b>6 %</b>)이에요. 여자는 두 X가 모두 X\'이어야 하므로 q × q = 0.06 × 0.06 = 0.0036(<b>0.36 %</b>)이에요. 남자가 여자보다 약 <b>17배</b>(0.06 / 0.0036) 더 자주 나타나요. (예시 값)',
        },
        {
          type: 'quiz', title: '색맹인 딸의 아버지',
          goal: '적록 색맹인 딸이 있어요. 이 딸의 <b>아버지</b>의 표현형은?',
          setup() { setMode('recip'); },
          choices: ['정상일 수도 있고 색맹일 수도 있다', '반드시 색맹이다', '반드시 정상이다', '색맹 여부를 알 수 없다'],
          answer: 1,
          feedback: ['딸이 색맹이면 X\'X\'이에요. X\' 하나는 반드시 아버지에게서 와요.', '', '아버지가 정상(XY)이면 딸은 아버지의 정상 X를 받아 색맹이 될 수 없어요.', '딸이 X\'X\'이므로 아버지의 X는 반드시 X\'이에요. 알 수 있어요.'],
          explain: '딸이 색맹이면 유전자형이 <b>X\'X\'</b>예요. 두 X 중 하나는 반드시 <b>아버지</b>에게서 오므로 아버지는 X\'Y, 즉 <b>색맹</b>이에요. (어머니는 보인자이거나 색맹이에요.) 이처럼 X 연관 열성 형질에서는 \'딸의 아버지\'와 \'아들의 어머니\'를 확인하면 유전 방식을 추론할 수 있어요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hg-autosomal-sex', mount: '#game', badge: '유전 양상 탐구가', homeHref: '../../index.html#hg',
    featureLabels: { chain: '🔗 유전자 → 형질 사슬', locate: '🗺 염색체 지도', auto: '🧬 상염색체 교배', xl: '🎀 X 연관 교배', recip: '🔄 정반대 교배', freq: '📊 남녀 발현 빈도' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 읽음 칸 ---------- */
  function readouts() {
    const m = S.mode;
    if (m === 'chain') setReads(['사례', CASES[S.chain.cur].name, '완성한 사슬', chainCount() + ' / 3', '보는 대립유전자', S.chain.done[S.chain.cur] ? CASES[S.chain.cur].nm[S.chain.allele] : '—']);
    else if (m === 'locate') { const a = loc.cards.filter((c) => c.zone === 'auto').length, x = loc.cards.filter((c) => c.zone === 'X').length; setReads(['분류한 카드', loc.placed + ' / 5', '상염색체 상자', a + '장', 'X 염색체 상자', x + '장']); }
    else if (m === 'auto') { const a = autoCnt(); setReads(['전체 자녀', a.n + '명', '아들 중 aa', pct(a.am, a.sm, 1) + (a.sm ? ' (' + a.am + '/' + a.sm + ')' : ''), '딸 중 aa', pct(a.af, a.sf, 1) + (a.sf ? ' (' + a.af + '/' + a.sf + ')' : '')]); }
    else if (m === 'xl') { const x = xlCnt(); setReads(['부모', gtOfMom(S.xl.mom) + ' × ' + gtOfDad(S.xl.dad), '아들 중 색맹', pct(x.am, x.sm, 1) + (x.sm ? ' (' + x.am + '/' + x.sm + ')' : ''), '딸 중 색맹 · 보인자', (x.sf ? x.af + '명 · ' + x.car + '명' : '—')]); }
    else if (m === 'recip') { const tr = S.recip.trait, both = S.recip.ran[tr + 'a'] && S.recip.ran[tr + 'b']; setReads(['형질', RC[tr].name.split(' ')[0], '실행한 교배', recipRanN() + ' / 4', '(가)와 (나)', both ? (recipSame(tr) ? '결과가 같아요' : '성별에 따라 달라요') : '—']); }
    else setReads(['남자 발현 빈도', '6 %', '여자 발현 빈도', S.freq.solved ? fmtN(fqFem * 100, 2) + ' %' : '? %', '남자 : 여자', S.freq.solved ? '약 ' + fmtN(fqRatio, 0) + ' : 1' : '?']);
  }

  /* ---------- 시작 ---------- */
  setMode('chain');
  let lastFree = false, lastLv = -1, lastBusy = '';
  SciSim.loop((dt, t) => {
    clock = t; S.t = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (game && game.level !== lastLv) { lastLv = game.level; updateCtl(); }
    const busy = crossBusy(S.auto) + '|' + S.auto.bars.pending() + crossBusy(S.xl) + S.xl.bars.pending();
    if (busy !== lastBusy) { lastBusy = busy; updateCtl(); }
    view.apply(); ctx.clearRect(0, 0, VW, VH);
    switch (S.mode) {
      case 'chain': bgFill('#eef4f2', '#e3ece8'); chainDraw(dt, t); break;
      case 'locate': bgFill('#eef4f2', '#e3ece8'); locDraw(dt, t); break;
      case 'auto': bgFill('#eef4f2', '#e3ece8'); crossDraw('auto', dt); break;
      case 'xl': bgFill('#f6f1f4', '#eee3ea'); crossDraw('xl', dt); break;
      case 'recip': bgFill('#eef4f2', '#e3ece8'); recipDraw(dt, t); break;
      case 'freq': bgFill('#eef4f2', '#e3ece8'); freqDraw(dt, t); break;
    }
    // 보이지 않는 화면의 시험도 계속 진행되도록 반대쪽 막대는 갱신만
    if (S.mode !== 'auto') S.auto.bars.update(dt);
    if (S.mode !== 'xl') S.xl.bars.update(dt);
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(241,246,243,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, PHONE, get game() { return game; }, levels, setMode, chainSorters, chainOk, chainCount, CASES, CASE_IDS, loc, LOC_CARDS, locWrong,
    runTrials, autoCnt, xlCnt, xlIsCross, xlRebuild, recipRun, recipRanN, RC, recipSame, fqOk, fqVal, updateCtl, autoReset, xlReset, crossBusy, freqReset, chainSetCase,
  };
})();
