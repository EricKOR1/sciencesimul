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
     고등학교 생물의 유전 · Ⅰ. 유전자와 유전물질 - 사람 유전 연구와 가계도 (단원 59, 2차시)
     성취기준 [12유전01-02] 사람 유전 연구 방법의 어려움을 이해하고, 사람의 유전 현상 분석을 근거로 유전 형질의 유전적 특성을 추론할 수 있다.
     ① 관찰: 연구 방법  ② 분석: 쌍둥이·집단  ③ 탐구: 유전 양상  ④ 분석: 가계도 추론
     (모든 자료는 교육용 가상 자료이며 학생 가족의 정보를 입력하는 기능은 없어요)
     ========================================================= */
  const S = { mode: 'diff', fade: 0, t: 0 };
  let game = null;
  const rnd = mulberry((Math.random() * 4294967296) >>> 0);
  const ease = SciSim.ease;
  const COLS = { mz: '#2563eb', dz: '#f59e0b', male: '#3b82f6', female: '#ec4899', aff: '#334155', ok: '#16a34a', bad: '#dc2626' };

  const COL = { auto: '#7c6cf0', X: '#ec4899', Y: '#3b82f6', good: '#15803d', mut: '#f59e0b', red: '#dc2626' };
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


  /* ---------- ① 연구의 어려움 ---------- */
  const DIFF_ROWS = [
    { k: '세대 시간', pea: { v: 1, lab: '1년 이내 (한 철)' }, hum: { v: 30, lab: '약 25~30년', mark: 25 }, max: 30, note: '한 세대를 지나는 데 걸리는 시간' },
    { k: '자손의 수', pea: { v: 100, lab: '한 포기에서 약 100개 (예시)' }, hum: { v: 2, lab: '부부 한 쌍에 보통 몇 명 (예시 2명)' }, max: 100, note: '한 번의 교배로 얻는 자손' },
    { k: '교배 실험', pea: { ok: true, lab: '원하는 교배를 할 수 있어요' }, hum: { ok: false, lab: '교배 실험을 할 수 없어요' }, note: '부모를 골라 짝짓기' },
    { k: '환경 통제', pea: { ok: true, lab: '환경을 일정하게 통제해요' }, hum: { ok: false, lab: '식사 · 생활 습관 등 통제가 어려워요' }, note: '환경이 형질에 미치는 영향' },
  ];
  const DIFF_OPTS = [
    { id: 'gen', t: '세대가 길어서 여러 세대를 관찰하기 어렵다', ok: true },
    { id: 'num', t: '자손의 수가 적어서 규칙을 찾기 어렵다', ok: true },
    { id: 'cross', t: '원하는 부모끼리 교배하는 실험을 할 수 없다', ok: true },
    { id: 'env', t: '환경의 영향이 커서 유전의 영향만 따로 보기 어렵다', ok: true },
    { id: 'chr', t: '사람은 염색체가 없어서 유전자를 조사할 수 없다', ok: false },
    { id: 'mendel', t: '사람에게는 멘델의 유전 원리가 적용되지 않는다', ok: false },
  ];
  S.diff = { pick: {}, grow: 0, t0: 0 };
  function diffDraw(dt, t) {
    const d = S.diff; d.grow = RM ? 1 : approach(d.grow, 1, dt, 2.2);
    const px = PHONE ? 8 : 14, pw = VW - px * 2, top = PHONE ? 8 : 12;
    panel(px, top, pw, VH - top - (PHONE ? 8 : 12), 16, '#fff');
    TF(px + 14, top + 28, '완두와 사람: 유전을 연구하기에 어떤 점이 다를까요?', pw - 28, L(17, 14), 11.5, '#26324a', 'left', 800);
    const rowH = (VH - top - 104) / 4, lx = px + 14, lw = PHONE ? 74 : 112, colW = (pw - lw - 40) / 2;
    D.label(lx + lw + colW / 2, top + 58, '🌱 완두', { bg: '#dcfce7', color: '#166534', size: 14 });
    D.label(lx + lw + colW + 20 + colW / 2, top + 58, '🧑 사람', { bg: '#dbeafe', color: '#1e40af', size: 14 });
    DIFF_ROWS.forEach((r, i) => {
      const y = top + 78 + i * rowH, h = rowH - 8;
      ctx.fillStyle = i % 2 ? '#f8fafc' : '#f1f5f9'; D.roundRect(px + 8, y, pw - 16, h, 12); ctx.fill();
      TF(lx + 4, y + h / 2 - 2, r.k, lw - 6, L(16, 14), 12, '#26324a', 'left', 800);
      T(lx + 4, y + h / 2 + 16, '', 11, '#64748b', 'left', 700);
      [[r.pea, lx + lw, '#16a34a'], [r.hum, lx + lw + colW + 20, '#2563eb']].forEach(([c, x0, col], k) => {
        if (c.v != null) {
          const bw = colW - 10, bh = Math.min(22, h * 0.34), by = y + h * 0.28;
          ctx.fillStyle = '#e2e8f0'; D.roundRect(x0, by, bw, bh, 6); ctx.fill();
          const w = Math.max(0, c.v / r.max * bw * d.grow);
          if (w > 0.5) { ctx.fillStyle = col; D.roundRect(x0, by, w, bh, Math.min(6, w / 2)); ctx.fill(); }
          if (c.mark) { const mx = x0 + c.mark / r.max * bw; ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(mx, by - 3); ctx.lineTo(mx, by + bh + 3); ctx.stroke(); }
          TF(x0, by + bh + 17, c.lab, colW - 6, L(13.5, 12), 10, '#334155', 'left', 800);
        } else {
          const cy = y + h * 0.4, ok = c.ok;
          D.check(x0 + 14, cy, 12, d.grow, { color: ok ? '#16a34a' : '#dc2626' });
          if (!ok) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x0 + 9, cy - 5); ctx.lineTo(x0 + 19, cy + 5); ctx.moveTo(x0 + 19, cy - 5); ctx.lineTo(x0 + 9, cy + 5); ctx.stroke(); }
          TF(x0 + 32, cy + 5, c.lab, colW - 36, L(13.5, 12), 10, ok ? '#166534' : '#b91c1c', 'left', 800);
        }
      });
    });
    T(px + 14, VH - top - 20, '※ 수치는 이해를 돕기 위한 대략적인 예시 값이에요.', 12, '#94a3b8', 'left', 700);
  }
  const diffOkSet = () => DIFF_OPTS.filter((o) => o.ok).map((o) => o.id).sort().join(',');
  const diffPicked = () => Object.keys(S.diff.pick).filter((k) => S.diff.pick[k]).sort().join(',');

  /* ---------- ① 연구 방법과 질문 연결 ---------- */
  const METHODS = [{ id: 'ped', t: '가계도 조사', icon: '🌳' }, { id: 'twin', t: '쌍둥이 연구', icon: '👯' }, { id: 'pop', t: '집단 조사', icon: '👥' }, { id: 'dna', t: 'DNA · 유전체 분석', icon: '🧬' }];
  const QUESTS = [
    { id: 'pop', t: '형질이 나타나는 빈도와 성별 차이는?' },
    { id: 'ped', t: '어떤 방식으로 유전될까? (우성 · 열성, 상 · 성염색체)' },
    { id: 'dna', t: '어떤 염기 서열의 변이가 관련될까?' },
    { id: 'twin', t: '유전과 환경이 형질에 미치는 영향의 정도는?' },
  ];
  S.match = { sel: -1, links: {}, drag: null, t: {} };
  const MG = {
    lx: PHONE ? 10 : 36, rx: PHONE ? 260 : 468, cw: PHONE ? 210 : 296, ch: PHONE ? 100 : 82, y0: PHONE ? 70 : 92, gap: PHONE ? 16 : 20,
  };
  const mY = (i) => MG.y0 + i * (MG.ch + MG.gap);
  const mRect = (side, i) => ({ x: side === 0 ? MG.lx : MG.rx, y: mY(i), w: MG.cw, h: MG.ch });
  const matchLinked = () => Object.keys(S.match.links).length;
  function matchWrong() { return Object.keys(S.match.links).filter((i) => METHODS[i].id !== QUESTS[S.match.links[i]].id); }
  function matchDraw(dt, t) {
    const m = S.match;
    TF(VW / 2, PHONE ? 34 : 44, '연구 방법을 끌어서(또는 눌러서) 알아내려는 질문과 이어요', VW - 24, L(18, 14), 11, '#26324a', 'center', 800);
    // 이은 선
    Object.keys(m.links).forEach((i) => {
      const a = mRect(0, +i), b = mRect(1, m.links[i]), key = 'l' + i;
      m.t[key] = RM ? 1 : approach(m.t[key] == null ? 0 : m.t[key], 1, dt, 6);
      const p = m.t[key], x1 = a.x + a.w, y1 = a.y + a.h / 2, x2 = b.x, y2 = b.y + b.h / 2;
      const bad = m.flag && m.flag[i];
      ctx.strokeStyle = bad ? '#dc2626' : '#16a34a'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.bezierCurveTo(x1 + 50, y1, x2 - 50, y2, x1 + (x2 - x1) * p, y1 + (y2 - y1) * p); ctx.stroke();
    });
    if (m.drag) { const a = mRect(0, m.drag.i); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 3; ctx.setLineDash([6, 5]); ctx.beginPath(); ctx.moveTo(a.x + a.w, a.y + a.h / 2); ctx.lineTo(m.drag.x, m.drag.y); ctx.stroke(); ctx.setLineDash([]); }
    METHODS.forEach((mt, i) => {
      const r = mRect(0, i), on = m.sel === i, linked = m.links[i] != null, bad = m.flag && m.flag[i];
      D.shadow(() => { D.roundRect(r.x, r.y, r.w, r.h, 14); ctx.fillStyle = on ? '#fff8dc' : '#fff'; ctx.fill(); }, { blur: 6, y: 2 });
      ctx.strokeStyle = bad ? '#dc2626' : on ? '#f59e0b' : linked ? '#16a34a' : '#7c8dc4'; ctx.lineWidth = on || linked ? 3 : 2; D.roundRect(r.x, r.y, r.w, r.h, 14); ctx.stroke();
      E(mt.icon, r.x + 30, r.y + r.h / 2, 28);
      TF(r.x + 56, r.y + r.h / 2 + 5, mt.t, r.w - 66, L(17, 15), 11, '#26324a', 'left', 800);
    });
    QUESTS.forEach((q, i) => {
      const r = mRect(1, i), linked = Object.values(m.links).indexOf(i) >= 0, hot = m.drag && inRect(m.drag.x, m.drag.y, r);
      D.shadow(() => { D.roundRect(r.x, r.y, r.w, r.h, 14); ctx.fillStyle = hot ? '#ecfdf5' : '#fff'; ctx.fill(); }, { blur: 6, y: 2 });
      ctx.strokeStyle = hot ? '#16a34a' : linked ? '#16a34a' : '#cbd5e1'; ctx.lineWidth = hot || linked ? 3 : 2; D.roundRect(r.x, r.y, r.w, r.h, 14); ctx.stroke();
      T(r.x + 12, r.y + 18, '❓ 알아내려는 질문', 11.5, '#64748b', 'left', 700);
      textBlock(r.x + 12, r.y + 40, r.w - 24, q.t, L(14.5, 13), '#26324a', L(19, 17), 800);
    });
  }
  const matchPT = {
    down(p) {
      for (let i = 0; i < METHODS.length; i++) if (inRect(p.x, p.y, mRect(0, i))) { S.match.drag = { i, x: p.x, y: p.y, sx: p.x, sy: p.y, moved: false }; Sound.tick(); return true; }
      for (let i = 0; i < QUESTS.length; i++) if (inRect(p.x, p.y, mRect(1, i)) && S.match.sel >= 0) { matchLink(S.match.sel, i); return false; }
      return false;
    },
    move(p) { const d = S.match.drag; if (!d) return; d.x = p.x; d.y = p.y; if (Math.hypot(p.x - d.sx, p.y - d.sy) > 8) d.moved = true; },
    up(p) {
      const d = S.match.drag; if (!d) return; S.match.drag = null;
      if (!d.moved) { S.match.sel = S.match.sel === d.i ? -1 : d.i; return; }
      for (let i = 0; i < QUESTS.length; i++) if (inRect(p.x, p.y, mRect(1, i))) { matchLink(d.i, i); return; }
    },
    hover: (p) => (METHODS.some((m, i) => inRect(p.x, p.y, mRect(0, i))) ? 'grab' : 'default'),
  };
  function matchLink(i, q) {
    const m = S.match;
    Object.keys(m.links).forEach((k) => { if (m.links[k] === q) { delete m.links[k]; delete m.t['l' + k]; } });
    m.links[i] = q; delete m.t['l' + i]; m.sel = -1; m.flag = null; Sound.click(); updateCtl();
  }
  function matchReset() { S.match = { sel: -1, links: {}, drag: null, t: {} }; updateCtl(); }


  /* =========================================================
     ② 쌍둥이 연구 · 집단 조사
     ========================================================= */
  const TW = { A: { mz: [40, 40], dz: [40, 22] }, B: { mz: [30, 21], dz: [30, 9] }, C: { mz: [40, 22], dz: [40, 20] } };
  const TW_IDS = ['A', 'B', 'C'], TW_NAME = { A: '㉠', B: '㉡', C: '㉢' };
  const twRate = (id, k) => TW[id][k][1] / TW[id][k][0] * 100;
  S.tw = { cur: 'A', done: {}, ok: { mz: false, dz: false }, bars: { A: { mz: 0, dz: 0 }, B: { mz: 0, dz: 0 }, C: { mz: 0, dz: 0 } }, cells: {}, t0: 0, pickBest: '' };
  S.pop = { idx: 0, seen: false, disp: { m: 0, f: 0 }, lineP: 0 };
  const POP_M = [[25, 2], [50, 5], [100, 7], [150, 11], [200, 13], [300, 19], [400, 24], [500, 30]];
  const POP_F = [[25, 0], [50, 0], [100, 1], [150, 1], [200, 1], [300, 2], [400, 2], [500, 2]];
  const popN = (i) => POP_M[i][0] + POP_F[i][0];
  const popRate = (arr, i) => arr[i][1] / arr[i][0] * 100;

  /* 쌍둥이 쌍 카드 배치: 일치 / 불일치 칸에 snap */
  function twLayout(id, kind) {
    const [tot, con] = TW[id][kind];
    const cells = [];
    for (let i = 0; i < tot; i++) cells.push({ con: i < con, k: i });
    return cells;
  }
  function twCellsInit(id) {
    S.tw.cells = {};
    ['mz', 'dz'].forEach((kind) => {
      const arr = twLayout(id, kind);
      // 처음에는 섞인 위치(풀)에서 시작해 분류 칸으로 이동
      const order = arr.map((c, i) => i).sort(() => rnd() - 0.5);
      S.tw.cells[kind] = arr.map((c, i) => ({ con: c.con, fx: 0.1 + rnd() * 0.8, fy: 0.1 + rnd() * 0.8, p: 0, delay: order.indexOf(i) * 0.018 }));
    });
    S.tw.t0 = 0;
  }
  function twPanel(x, y, w, h, kind, dt) {
    const id = S.tw.cur, [tot, con] = TW[id][kind], col = kind === 'mz' ? COLS.mz : COLS.dz;
    panel(x, y, w, h, 14, '#fff'); ctx.strokeStyle = col; ctx.lineWidth = 2.5; D.roundRect(x, y, w, h, 14); ctx.stroke();
    TF(x + 12, y + 24, (kind === 'mz' ? '1란성 쌍둥이' : '2란성 쌍둥이') + ' · 형질 ' + TW_NAME[id], w - 24, L(16, 14), 11, col, 'left', 800);
    TF(x + 12, y + 44, '적어도 한 사람에게 형질이 있는 ' + tot + '쌍 (예시)', w - 24, L(13, 11.5), 10, '#64748b', 'left', 700);
    const gap = 8, bw = (w - 24 - gap) / 2, by = y + 56, bh = h - 66;
    const boxes = [{ x: x + 12, lab: '일치 (둘 다 형질)', n: con, ok: true }, { x: x + 12 + bw + gap, lab: '불일치 (한 명만)', n: tot - con, ok: false }];
    boxes.forEach((b) => {
      ctx.fillStyle = b.ok ? 'rgba(22,163,74,.10)' : 'rgba(245,158,11,.12)'; D.roundRect(b.x, by, bw, bh, 10); ctx.fill();
      ctx.setLineDash([5, 4]); ctx.strokeStyle = b.ok ? '#16a34a' : '#f59e0b'; ctx.lineWidth = 1.6; ctx.stroke(); ctx.setLineDash([]);
      TF(b.x + 8, by + 18, b.lab + ' : ' + b.n + '쌍', bw - 16, L(13.5, 12), 10, b.ok ? '#166534' : '#92400e', 'left', 800);
    });
    // 카드 (쌍 하나 = 두 원)
    const cw = Math.min(PHONE ? 22 : 26, (bw - 14) / 4.4), chh = Math.min(15, cw * 0.62), cols = Math.max(1, Math.floor((bw - 12) / (cw + 3)));
    const cells = S.tw.cells[kind] || [];
    let ci = 0, di = 0;
    cells.forEach((c) => {
      const idx = c.con ? ci++ : di++, bx = c.con ? boxes[0].x : boxes[1].x;
      const tx = bx + 8 + (idx % cols) * (cw + 3) + cw / 2, ty = by + 34 + Math.floor(idx / cols) * (chh + 4) + chh / 2;
      c.p = RM ? 1 : clamp(c.p + dt / 0.5 * (S.tw.t0 > c.delay ? 1 : 0), 0, 1);
      const e = ease.outBack(c.p), sx = x + 12 + c.fx * (w - 24 - cw), sy = by + 6 + c.fy * (bh - 20);
      const px = sx + (tx - sx) * e, py = sy + (ty - sy) * e;
      D.roundRect(px - cw / 2, py - chh / 2, cw, chh, 4); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1; ctx.stroke();
      const r = chh * 0.3;
      ctx.fillStyle = COLS.bad; ctx.beginPath(); ctx.arc(px - cw * 0.22, py, r, 0, TAU); ctx.fill();
      ctx.fillStyle = c.con ? COLS.bad : '#cbd5e1'; ctx.beginPath(); ctx.arc(px + cw * 0.22, py, r, 0, TAU); ctx.fill();
    });
  }
  function twChart(x, y, w, h, dt) {
    panel(x, y, w, h, 14, '#fff');
    TF(x + 12, y + 24, '일치율 비교 (%) = 일치한 쌍 / 적어도 한 명에게 형질이 있는 쌍 × 100', w - 24, L(14.5, 12.5), 10.5, '#334155', 'left', 800);
    const px = x + 40, pw = w - 56, top = y + 72, base = y + h - 34, ph = base - top;
    [0, 25, 50, 75, 100].forEach((v) => { const yy = base - ph * v / 100; ctx.strokeStyle = v === 0 ? '#94a3b8' : '#e2e8f0'; ctx.lineWidth = v === 0 ? 1.6 : 1; ctx.beginPath(); ctx.moveTo(px, yy); ctx.lineTo(px + pw, yy); ctx.stroke(); T(px - 6, yy + 4, v + '', 11.5, '#64748b', 'right', 700); });
    const slot = pw / 3, bw = Math.min(46, slot * 0.28);
    TW_IDS.forEach((id, i) => {
      const cx = px + slot * (i + 0.5), done = !!S.tw.done[id];
      ['mz', 'dz'].forEach((kind, k) => {
        const b = S.tw.bars[id], tgt = done ? twRate(id, kind) : 0;
        b[kind] = RM ? tgt : approach(b[kind], tgt, dt, 6);
        const v = clamp(b[kind], 0, 100), hh = ph * v / 100, bx = cx + (k === 0 ? -bw - 3 : 3), col = kind === 'mz' ? COLS.mz : COLS.dz;
        if (hh > 0.5) { ctx.fillStyle = col; D.roundRect(bx, base - hh, bw, hh, 5); ctx.fill(); }
        if (done) T(bx + bw / 2, base - hh - 6, fmtN(twRate(id, kind), 0) + ' %', 13, '#1f2d44', 'center', 800);
      });
      T(cx, base + 20, '형질 ' + TW_NAME[id] + (done ? '' : ' (계산 전)'), 14, '#26324a', 'center', 800);
    });
    const ly = y + 44;
    D.roundRect(x + 14, ly - 11, 12, 12, 3); ctx.fillStyle = COLS.mz; ctx.fill(); T(x + 30, ly, '1란성', 12, '#334155', 'left', 700);
    D.roundRect(x + 76, ly - 11, 12, 12, 3); ctx.fillStyle = COLS.dz; ctx.fill(); T(x + 92, ly, '2란성', 12, '#334155', 'left', 700);
  }
  function twinsDraw(dt, t) {
    S.tw.t0 += dt;
    if (PHONE) {
      twPanel(8, 8, 464, 206, 'mz', dt); twPanel(8, 222, 464, 206, 'dz', dt); twChart(8, 436, 464, 196, dt);
    } else {
      twPanel(14, 10, 382, 262, 'mz', dt); twPanel(404, 10, 382, 262, 'dz', dt); twChart(14, 282, 772, 266, dt);
    }
  }
  function twinsSet(id) {
    S.tw.cur = id; twCellsInit(id); const dn = !!S.tw.done[id];
    S.tw.ok = { mz: dn, dz: dn }; $('#inMz').value = dn ? fmtN(twRate(id, 'mz'), 0) : ''; $('#inDz').value = dn ? fmtN(twRate(id, 'dz'), 0) : '';
    $('#inMz').classList.toggle('ok', dn); $('#inDz').classList.toggle('ok', dn); updateCtl();
  }
  function twCheckInputs() {
    const id = S.tw.cur, mz = numOf('inMz'), dz = numOf('inDz');
    const okM = isFinite(mz) && Math.abs(mz - twRate(id, 'mz')) < 0.5, okD = isFinite(dz) && Math.abs(dz - twRate(id, 'dz')) < 0.5;
    $('#inMz').classList.toggle('ok', okM); $('#inDz').classList.toggle('ok', okD);
    if (okM && okD && !S.tw.done[id]) { S.tw.done[id] = true; Sound.success(); parts.burst(VW / 2, VH * 0.7, { count: 18, speed: 190 }); }
    return { mz: okM, dz: okD };
  }

  /* 집단 조사: 표본 수를 늘리면 빈도가 안정돼요 */
  function popDraw(dt, t) {
    const p = S.pop, i = p.idx, mr = popRate(POP_M, i), fr = popRate(POP_F, i);
    p.disp.m = RM ? mr : approach(p.disp.m, mr, dt, 7); p.disp.f = RM ? fr : approach(p.disp.f, fr, dt, 7);
    p.lineP = RM ? i : approach(p.lineP, i, dt, 6);
    const px = PHONE ? 8 : 14, py = PHONE ? 8 : 12;
    const lw = PHONE ? 464 : 478, lh = PHONE ? 300 : VH - 24, bx = PHONE ? 8 : px + lw + 10, bwid = PHONE ? 464 : VW - bx - 14, by = PHONE ? py + lh + 8 : py, bh = PHONE ? 300 : VH - 24;
    // 꺾은선: 표본 수 → 빈도
    panel(px, py, lw, lh, 14, '#fff');
    TF(px + 12, py + 24, '표본 수에 따른 색맹 빈도 (가상 조사)', lw - 24, L(15, 13), 10.5, '#334155', 'left', 800);
    const gx = px + 44, gw = lw - 62, gt = py + 52, gb = py + lh - 44, gh = gb - gt, ymax = 10;
    [0, 2, 4, 6, 8, 10].forEach((v) => { const yy = gb - gh * v / ymax; ctx.strokeStyle = v === 0 ? '#94a3b8' : '#e2e8f0'; ctx.lineWidth = v === 0 ? 1.6 : 1; ctx.beginPath(); ctx.moveTo(gx, yy); ctx.lineTo(gx + gw, yy); ctx.stroke(); T(gx - 6, yy + 4, v + '', 11.5, '#64748b', 'right', 700); });
    T(px + 12, gt - 8, '빈도 (%)', 11.5, '#64748b', 'left', 700);
    const xs = (k) => gx + 10 + (gw - 20) * k / (POP_M.length - 1);
    POP_M.forEach((q, k) => { T(xs(k), gb + 18, String(popN(k)), 11.5, k === i ? '#26324a' : '#94a3b8', 'center', k === i ? 800 : 700); });
    T(gx + gw / 2, gb + 36, '표본 수 (명)', 12, '#64748b', 'center', 700);
    [[POP_M, COLS.male, 'm'], [POP_F, COLS.female, 'f']].forEach(([arr, col]) => {
      ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.beginPath();
      const upto = p.lineP;
      for (let k = 0; k <= Math.ceil(upto); k++) {
        const kk = Math.min(k, upto), k0 = Math.floor(kk), f = kk - k0, v = k0 < arr.length - 1 ? popRate(arr, k0) * (1 - f) + popRate(arr, k0 + 1) * f : popRate(arr, k0);
        const x = xs(kk), y = gb - gh * clamp(v, 0, ymax) / ymax;
        if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      for (let k = 0; k <= i; k++) { const x = xs(k), v = popRate(arr, k), y = gb - gh * clamp(v, 0, ymax) / ymax; dot(x, y, k === i ? 6 : 4, col, {}); }
    });
    D.roundRect(px + lw - 130, py + 10, 12, 12, 3); ctx.fillStyle = COLS.male; ctx.fill(); T(px + lw - 114, py + 21, '남자', 12, '#334155', 'left', 700);
    D.roundRect(px + lw - 70, py + 10, 12, 12, 3); ctx.fillStyle = COLS.female; ctx.fill(); T(px + lw - 54, py + 21, '여자', 12, '#334155', 'left', 700);
    // 현재 표본의 막대
    panel(bx, by, bwid, bh, 14, '#fff');
    TF(bx + 12, by + 24, '현재 표본 ' + popN(i) + '명 (남 ' + POP_M[i][0] + ' · 여 ' + POP_F[i][0] + ')', bwid - 24, L(15, 13), 10.5, '#334155', 'left', 800);
    const bt = by + 52, bb = by + bh - 70, bhh = bb - bt;
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(bx + 20, bb); ctx.lineTo(bx + bwid - 20, bb); ctx.stroke();
    const slot = (bwid - 40) / 2, bw2 = Math.min(70, slot * 0.5);
    [[POP_M, COLS.male, '남자', p.disp.m], [POP_F, COLS.female, '여자', p.disp.f]].forEach(([arr, col, nm, dv], k) => {
      const cx = bx + 20 + slot * (k + 0.5), hh = bhh * clamp(dv, 0, ymax) / ymax;
      if (hh > 0.4) { ctx.fillStyle = col; D.roundRect(cx - bw2 / 2, bb - hh, bw2, hh, 5); ctx.fill(); }
      T(cx, bb - hh - 8, fmtN(popRate(arr, i), 1) + ' %', 15, '#1f2d44', 'center', 800, { stroke: '#fff', strokeWidth: 3 });
      T(cx, bb + 20, nm, 14, '#26324a', 'center', 800);
      T(cx, bb + 40, arr[i][1] + ' / ' + arr[i][0] + '명', 13, '#475569', 'center', 700);
    });
    T(bx + bwid / 2, by + 44, '막대 높이 = 색맹인 사람의 비율 (최대 10 %)', 11.5, '#94a3b8', 'center', 700);
  }

  /* =========================================================
     ③ ④ 가계도: 자료 · 규칙 · 그림
     ========================================================= */
  const PD = {
    A: {
      assume: '상염색체 열성',
      nodes: { 1: { s: 'm', a: 0, x: 0.32, g: 0 }, 2: { s: 'f', a: 0, x: 0.52, g: 0 }, 3: { s: 'f', a: 1, x: 0.28, g: 1 }, 4: { s: 'm', a: 0, x: 0.48, g: 1 }, 5: { s: 'f', a: 0, x: 0.68, g: 1 }, 6: { s: 'm', a: 1, x: 0.48, g: 2 }, 7: { s: 'f', a: 0, x: 0.68, g: 2 } },
      couples: [[1, 2], [4, 5]], kids: { '1-2': [3, 4], '4-5': [6, 7] },
      gt: { 1: 'Aa', 2: 'Aa', 3: 'aa', 4: 'Aa', 5: 'Aa', 6: 'aa', 7: 'AA 또는 Aa' },
      q: [{ id: 'q1', t: '4와 5 사이에서 태어날 다음 자녀가 형질을 가질 확률', ans: 1 / 4, show: '1/4' }, { id: 'q2', t: '정상인 7이 보인자(Aa)일 확률', ans: 2 / 3, show: '2/3' }],
      path: { ids: [4, 6], lab: 'a' },
    },
    B: {
      assume: 'X 연관 열성',
      nodes: { 1: { s: 'm', a: 0, x: 0.22, g: 0 }, 2: { s: 'f', a: 0, x: 0.42, g: 0 }, 3: { s: 'm', a: 1, x: 0.12, g: 1 }, 5: { s: 'm', a: 0, x: 0.30, g: 1 }, 4: { s: 'f', a: 0, x: 0.50, g: 1 }, 6: { s: 'm', a: 0, x: 0.70, g: 1 }, q: { s: 'u', a: 0, x: 0.60, g: 2, unk: true } },
      couples: [[1, 2], [6, 4]], kids: { '1-2': [3, 5, 4], '6-4': ['q'] },
      gt: { 1: 'XY', 2: "XX'", 3: "X'Y", 4: "XX 또는 XX'", 5: 'XY', 6: 'XY' },
      q: [{ id: 'q1', t: '4와 6 사이에서 태어날 다음 자녀(성별은 모름)가 형질을 가질 확률', ans: 1 / 8, show: '1/8' }, { id: 'q2', t: '그 자녀가 아들일 때 형질을 가질 확률', ans: 1 / 4, show: '1/4' }],
      path: { ids: [2, 4, 'q'], lab: "X'" },
    },
    C: {
      assume: '상염색체 우성',
      nodes: { 1: { s: 'm', a: 1, x: 0.30, g: 0 }, 2: { s: 'f', a: 1, x: 0.52, g: 0 }, 3: { s: 'm', a: 0, x: 0.30, g: 1 }, 4: { s: 'f', a: 1, x: 0.52, g: 1 }, 5: { s: 'm', a: 0, x: 0.74, g: 1 }, 6: { s: 'm', a: 0, x: 0.63, g: 2 } },
      couples: [[1, 2], [5, 4]], kids: { '1-2': [3, 4], '5-4': [6] },
      gt: { 1: 'Aa', 2: 'Aa', 3: 'aa', 4: 'Aa', 5: 'aa', 6: 'aa' },
      q: [{ id: 'q1', t: '4와 5 사이에서 태어날 다음 자녀가 형질을 가질 확률', ans: 1 / 2, show: '1/2' }],
      path: null,
    },
    D: {
      assume: '아직 알 수 없음',
      nodes: { 1: { s: 'm', a: 1, x: 0.38, g: 0 }, 2: { s: 'f', a: 0, x: 0.58, g: 0 }, 3: { s: 'f', a: 0, x: 0.38, g: 1 }, 4: { s: 'm', a: 0, x: 0.58, g: 1 } },
      couples: [[1, 2]], kids: { '1-2': [3, 4] }, gt: {}, q: [], path: null,
    },
  };
  const PED_KEYS = ['A', 'B', 'C', 'D'];
  const CANDS = [{ id: 'AD', t: '상염색체 우성', col: '#7c6cf0' }, { id: 'AR', t: '상염색체 열성', col: '#16a34a' }, { id: 'XD', t: 'X 연관 우성', col: '#ec4899' }, { id: 'XR', t: 'X 연관 열성', col: '#f59e0b' }];
  const RULE_OF = { AD: [0], AR: [1], XD: [0, 3], XR: [1, 2] };
  const RULES = [
    { n: '①', t: '정상 부모 → 형질 있는 자녀', d: '형질이 없는 부모 사이에서 형질이 있는 자녀가 태어났으면 그 형질은 열성이에요 (우성 후보 소거).' },
    { n: '②', t: '형질 있는 부모 → 정상 자녀', d: '형질이 있는 부모 사이에서 형질이 없는 자녀가 태어났으면 그 형질은 우성이에요 (열성 후보 소거).' },
    { n: '③', t: '어머니 · 딸 확인 (X 연관 열성)', d: 'X 연관 열성이라면 형질이 있는 어머니의 아들은 모두 형질이 있고, 형질이 있는 딸의 아버지는 반드시 형질이 있어요. 하나라도 어기면 X 연관 열성이 아니에요.' },
    { n: '④', t: '아버지 · 어머니 확인 (X 연관 우성)', d: 'X 연관 우성이라면 형질이 있는 아버지의 딸은 모두 형질이 있고, 형질이 없는 어머니의 아들은 모두 형질이 없어요. 하나라도 어기면 X 연관 우성이 아니에요.' },
  ];
  function pedKidsOf(pd) {
    const out = [];
    pd.couples.forEach((cp) => {
      const f = pd.nodes[cp.find((id) => pd.nodes[id].s === 'm')], mId = cp.find((id) => pd.nodes[id].s === 'f'), m = pd.nodes[mId];
      (pd.kids[cp.join('-')] || []).forEach((cid) => { const c = pd.nodes[cid]; if (c.unk) return; out.push({ cid, c, f, m, fid: cp.find((id) => pd.nodes[id].s === 'm'), mid: mId }); });
    });
    return out;
  }
  /* 규칙별 위반 목록: [ {id, why} ] */
  function pedViol(key) {
    const pd = PD[key], v = [[], [], [], []];
    pedKidsOf(pd).forEach((k) => {
      const { cid, c, f, m, fid, mid } = k;
      if (!f.a && !m.a && c.a) v[0].push({ id: cid, why: fid + '번과 ' + mid + '번은 정상인데 ' + cid + '번은 형질이 있어요' });
      if (f.a && m.a && !c.a) v[1].push({ id: cid, why: fid + '번과 ' + mid + '번은 형질이 있는데 ' + cid + '번은 정상이에요' });
      if (m.a && c.s === 'm' && !c.a) v[2].push({ id: cid, why: '형질이 있는 어머니 ' + mid + '번의 아들 ' + cid + '번이 정상이에요' });
      if (c.s === 'f' && c.a && !f.a) v[2].push({ id: cid, why: '형질이 있는 딸 ' + cid + '번의 아버지 ' + fid + '번이 정상이에요' });
      if (f.a && c.s === 'f' && !c.a) v[3].push({ id: cid, why: '형질이 있는 아버지 ' + fid + '번의 딸 ' + cid + '번이 정상이에요' });
      if (!m.a && c.s === 'm' && c.a) v[3].push({ id: cid, why: '형질이 없는 어머니 ' + mid + '번의 아들 ' + cid + '번이 형질을 가져요' });
    });
    return v;
  }
  const PV = {}; PED_KEYS.forEach((k) => { PV[k] = pedViol(k); });
  S.ped = { key: 'A', applied: { A: [0, 0, 0, 0], B: [0, 0, 0, 0], C: [0, 0, 0, 0] }, last: null, rev: 0, pulse: 0, ans: '', hw: { A: '', B: '', C: '' }, shake: {} };
  S.prob = { key: 'A', gt: false, gtP: 0, done: {}, need: '', anim: null, rev: 0 };
  const candState = (key) => {
    const ap = S.ped.applied[key] || [0, 0, 0, 0];
    return CANDS.map((c) => {
      const why = [];
      RULE_OF[c.id].forEach((r) => { if (ap[r] && PV[key][r].length) why.push({ r, ids: PV[key][r].map((q) => q.id) }); });
      return { c, out: why.length > 0, why };
    });
  };
  const pedAllApplied = (key) => S.ped.applied[key].every((q) => q);
  const pedRemain = (key) => candState(key).filter((q) => !q.out).map((q) => q.c.id);

  /* 가계도 그림 */
  const PA = PHONE ? { x: 8, y: 8, w: 464, h: 262 } : { x: 14, y: 10, w: 772, h: 270 };
  function pedXY(pd, id, area) {
    const n = pd.nodes[id], gens = 3, gap = (area.h - 100) / (gens - 1);
    return { x: area.x + 36 + n.x * (area.w - 72), y: area.y + 42 + n.g * gap };
  }
  function pedNode(x, y, sz, n, o) {
    o = o || {};
    ctx.save(); ctx.translate(x, y); const sc = o.sc == null ? 1 : o.sc; ctx.scale(sc, sc);
    ctx.lineWidth = 2.6; ctx.strokeStyle = n.unk ? '#94a3b8' : '#26324a';
    if (n.unk) ctx.setLineDash([5, 4]);
    ctx.fillStyle = n.a ? COLS.aff : '#fff';
    ctx.beginPath();
    if (n.s === 'm') ctx.rect(-sz, -sz, sz * 2, sz * 2);
    else if (n.s === 'f') ctx.arc(0, 0, sz, 0, TAU);
    else { ctx.moveTo(0, -sz * 1.2); ctx.lineTo(sz * 1.2, 0); ctx.lineTo(0, sz * 1.2); ctx.lineTo(-sz * 1.2, 0); ctx.closePath(); }
    ctx.fill(); ctx.stroke(); ctx.setLineDash([]);
    if (n.unk) T(0, 6, '?', 18, '#64748b', 'center', 800);
    ctx.restore();
  }
  function drawPedigree(key, area, dt, o) {
    o = o || {};
    const pd = PD[key], sz = PHONE ? 15 : 19, rev = S.ped.rev;
    panel(area.x, area.y, area.w, area.h, 14, '#fff');
    D.label(area.x + 12, area.y + 18, '가계도 ' + key, { bg: '#1f2d44', color: '#fff', size: 13, align: 'left' });
    if (o.assume) T(area.x + area.w - 12, area.y + 22, '가정: ' + pd.assume + ' 유전', L(13.5, 12), '#475569', 'right', 800);
    const gapY = 0, tNode = (n) => n.g * 0.9 + 0.15;
    const pos = {}; Object.keys(pd.nodes).forEach((id) => { pos[id] = pedXY(pd, id, area); });
    const viol = {}; // 표시할 위반 (적용한 규칙만)
    if (o.applied) o.applied.forEach((on, r) => { if (on) PV[key][r].forEach((q) => { (viol[q.id] = viol[q.id] || []).push(r); }); });
    // 선
    pd.couples.forEach((cp) => {
      const a = pos[cp[0]], b = pos[cp[1]], gnode = pd.nodes[cp[0]], t0 = gnode.g * 0.9 + 0.35;
      const p1 = clamp((rev - t0) / 0.35, 0, 1);
      ctx.strokeStyle = '#26324a'; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
      const x1 = Math.min(a.x, b.x) + sz, x2 = Math.max(a.x, b.x) - sz, mx = (a.x + b.x) / 2;
      if (p1 > 0) { ctx.beginPath(); ctx.moveTo(x1, a.y); ctx.lineTo(x1 + (x2 - x1) * p1, a.y); ctx.stroke(); }
      const kids = pd.kids[cp.join('-')] || [];
      const p2 = clamp((rev - t0 - 0.35) / 0.45, 0, 1);
      if (kids.length && p2 > 0) {
        const cy = pos[kids[0]].y, sy = a.y + (cy - a.y) * 0.5;
        const xs = kids.map((id) => pos[id].x), lo = Math.min(mx, ...xs), hi = Math.max(mx, ...xs);
        const anyUnk = kids.some((id) => pd.nodes[id].unk);
        if (anyUnk) ctx.setLineDash([5, 4]);
        ctx.beginPath(); ctx.moveTo(mx, a.y); ctx.lineTo(mx, a.y + (sy - a.y) * Math.min(1, p2 * 2)); ctx.stroke();
        if (p2 > 0.4) { const q = clamp((p2 - 0.4) / 0.4, 0, 1); ctx.beginPath(); ctx.moveTo(mx, sy); ctx.lineTo(mx + (lo - mx) * q, sy); ctx.moveTo(mx, sy); ctx.lineTo(mx + (hi - mx) * q, sy); ctx.stroke(); }
        if (p2 > 0.7) { const q = clamp((p2 - 0.7) / 0.3, 0, 1); kids.forEach((id) => { ctx.beginPath(); ctx.moveTo(pos[id].x, sy); ctx.lineTo(pos[id].x, sy + (pos[id].y - sizeOf(pd.nodes[id]) - sy) * q); ctx.stroke(); }); }
        ctx.setLineDash([]);
      }
    });
    function sizeOf(n) { return n.unk ? sz * 1.2 : sz; }
    // 노드
    Object.keys(pd.nodes).forEach((id) => {
      const n = pd.nodes[id], p = pos[id], tn = tNode(n);
      const a = RM ? 1 : ease.outBack(clamp((rev - tn) / 0.35, 0, 1));
      if (a <= 0) return;
      const hl = o.hl && o.hl.indexOf(String(id)) >= 0;
      if (hl) { ctx.strokeStyle = 'rgba(220,38,38,' + (0.35 + 0.3 * Math.sin(S.t * 6)) + ')'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(p.x, p.y, sz * 1.9, 0, TAU); ctx.stroke(); }
      pedNode(p.x, p.y, sz, n, { sc: a });
      const la = clamp((a - 0.5) * 2, 0, 1);
      if (!n.unk) T(p.x, p.y + sz + (PHONE ? 15 : 17), String(id), L(14, 12.5), '#334155', 'center', 800, { alpha: la });
      else T(p.x, p.y + sz * 1.2 + 16, '다음 자녀', L(12.5, 11), '#64748b', 'center', 700, { alpha: la });
      if (viol[id]) viol[id].forEach((r, k) => {
        const bx = p.x + sz * 0.95 + k * 14, by = p.y - sz * 1.05;
        ctx.fillStyle = '#dc2626'; ctx.beginPath(); ctx.arc(bx, by, 8, 0, TAU); ctx.fill(); T(bx, by + 4, String(r + 1), 11, '#fff', 'center', 800);
      });
      if (o.gt && pd.gt[id]) {
        const ga = RM ? 1 : clamp(S.prob.gtP * 6 - Object.keys(pd.nodes).indexOf(String(id)) * 0.5, 0, 1);
        if (ga > 0) TF(p.x, p.y + sz + (PHONE ? 31 : 35), pd.gt[id], PHONE ? 66 : 96, L(13, 11), 9, n.a ? '#b91c1c' : '#1d4ed8', 'center', 800, { alpha: ga, stroke: '#fff', strokeWidth: 3 });
      }
    });
    // 범례
    const lgx = area.x + area.w - (PHONE ? 96 : 150), lgy = area.y + area.h - 24;
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#26324a'; ctx.lineWidth = 2; ctx.fillRect(lgx - 52, lgy - 7, 12, 12); ctx.strokeRect(lgx - 52, lgy - 7, 12, 12);
    ctx.beginPath(); ctx.arc(lgx - 30, lgy - 1, 6.5, 0, TAU); ctx.stroke();
    T(lgx - 20, lgy + 4, '정상', 12, '#475569', 'left', 700);
    ctx.fillStyle = COLS.aff; ctx.fillRect(lgx + 14, lgy - 7, 12, 12); T(lgx + 30, lgy + 4, '형질 있음', 12, '#475569', 'left', 700);
    void gapY;
    return pos;
  }

  /* ---------- ③ 유전 양상: 규칙 적용과 후보 소거 ---------- */
  const remainAll = (key) => CANDS.filter((c) => !RULE_OF[c.id].some((r) => PV[key][r].length)).map((c) => c.id);
  const CG = PHONE
    ? { y: PA.y + PA.h + 8, w: 227, h: 88, gx: 8, gap: 10, cols: 2 }
    : { y: PA.y + PA.h + 8, w: (772 - 30) / 4, h: 104, gx: 14, gap: 10, cols: 4 };
  const candRect = (i) => ({ x: CG.gx + (i % CG.cols) * (CG.w + CG.gap), y: CG.y + Math.floor(i / CG.cols) * (CG.h + 8), w: CG.w, h: CG.h });
  const RP = { x: PHONE ? 8 : 14, y: CG.y + (PHONE ? 2 : 1) * (CG.h + 8) };
  RP.w = VW - RP.x * 2; RP.h = VH - RP.y - (PHONE ? 8 : 12);
  S.ped.prevOut = {};
  function pedDraw(dt, t) {
    const p = S.ped, key = p.key, ap = p.applied[key];
    p.rev += dt * (RM ? 20 : 1);
    const hl = []; ap.forEach((on, r) => { if (on) PV[key][r].forEach((q) => { if (hl.indexOf(String(q.id)) < 0) hl.push(String(q.id)); }); });
    drawPedigree(key, PA, dt, { applied: ap, hl });
    const cs = candState(key), prev = p.prevOut[key] || (p.prevOut[key] = {});
    cs.forEach((q, i) => {
      const r = candRect(i), c = q.c;
      if (q.out && !prev[c.id]) { p.shake[c.id] = 1; Sound.fail(); }
      prev[c.id] = q.out; p.shake[c.id] = Math.max(0, (p.shake[c.id] || 0) - dt * 2.5);
      ctx.save(); if (p.shake[c.id] > 0 && !RM) ctx.translate(Math.sin(t * 60) * 4 * p.shake[c.id], 0);
      D.shadow(() => { D.roundRect(r.x, r.y, r.w, r.h, 14); ctx.fillStyle = q.out ? '#f1f5f9' : '#fff'; ctx.fill(); }, { blur: 6, y: 2 });
      ctx.strokeStyle = q.out ? '#cbd5e1' : c.col; ctx.lineWidth = q.out ? 2 : 3; D.roundRect(r.x, r.y, r.w, r.h, 14); ctx.stroke();
      TF(r.x + 12, r.y + 26, c.t, r.w - 24, L(16, 14.5), 11, q.out ? '#94a3b8' : '#26324a', 'left', 800);
      if (q.out) {
        ctx.strokeStyle = '#e2464b'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(r.x + 10, r.y + 20); ctx.lineTo(r.x + Math.min(r.w - 10, 14 + ctx.measureText(c.t).width + 80), r.y + 20); ctx.stroke();
        T(r.x + 12, r.y + 50, '소거됨', L(15, 13), '#dc2626', 'left', 800);
        q.why.forEach((w, k) => { if (k < 2) TF(r.x + 12, r.y + 70 + k * 18, '규칙 ' + RULES[w.r].n + ' · ' + w.ids.join(', ') + '번', r.w - 24, L(13, 12), 10, '#64748b', 'left', 700); });
      } else {
        const fin = pedAllApplied(key);
        T(r.x + 12, r.y + 50, fin ? '남은 후보' : '가능성 있음', L(15, 13), fin ? '#166534' : '#64748b', 'left', 800);
        if (fin) D.check(r.x + r.w - 26, r.y + 26, 11, 1, {});
      }
      ctx.restore();
    });
    // 규칙 설명 패널
    panel(RP.x, RP.y, RP.w, RP.h, 14, '#fff');
    const last = p.last && p.last.key === key ? p.last : null;
    if (!last) {
      TF(RP.x + 14, RP.y + 26, '규칙 ①~④를 하나씩 적용해 후보를 소거해 봐요', RP.w - 28, L(16, 14), 11, '#334155', 'left', 800);
      textBlock(RP.x + 14, RP.y + 52, RP.w - 28, '오른쪽 위의 규칙 버튼을 누르면 가계도에서 규칙을 어기는 사람에게 빨간 번호표가 붙고, 해당하는 유전 양상 후보가 소거돼요.', L(14, 12.5), '#64748b', L(20, 18), 700);
    } else {
      const R = RULES[last.r], v = PV[key][last.r];
      TF(RP.x + 14, RP.y + 26, '규칙 ' + R.n + ' : ' + R.t, RP.w - 28, L(16, 14), 11, '#26324a', 'left', 800);
      const h1 = textBlock(RP.x + 14, RP.y + 50, RP.w - 28, R.d, L(13.5, 12.5), '#475569', L(19, 17), 700);
      const msg = v.length ? '결과: ' + v.map((q) => q.why).slice(0, 2).join(' / ') + ' → ' + (last.r === 0 ? '우성 · X 연관 우성 후보' : last.r === 1 ? '열성 · X 연관 열성 후보' : last.r === 2 ? 'X 연관 열성 후보' : 'X 연관 우성 후보') + ' 소거' : '결과: 이 규칙을 어기는 사람이 없어요 → 소거되는 후보가 없어요';
      textBlock(RP.x + 14, RP.y + 50 + h1 + 6, RP.w - 28, msg, L(14, 12.5), v.length ? '#b91c1c' : '#166534', L(20, 18), 800);
    }
    if (pedAllApplied(key)) {
      const rem = pedRemain(key).map((id) => CANDS.find((c) => c.id === id).t);
      TF(RP.x + 14, RP.y + RP.h - 14, '가능한 유전 양상: ' + rem.join(' · ') + (rem.length > 1 ? ' (하나로 정할 수 없어요)' : ''), RP.w - 28, L(15, 13), 10.5, '#166534', 'left', 800);
    }
  }
  function pedApply(r) {
    const key = S.ped.key; if (!(key in S.ped.applied)) return;
    S.ped.applied[key][r] = S.ped.applied[key][r] ? 0 : 1;
    if (S.ped.applied[key][r]) { S.ped.last = { key, r }; Sound.tick(); }
    updateCtl();
  }
  function pedApplyAll() { const key = S.ped.key; for (let r = 0; r < 4; r++) { if (!S.ped.applied[key][r]) { S.ped.applied[key][r] = 1; S.ped.last = { key, r }; } } Sound.click(); updateCtl(); }
  function pedClear() { const key = S.ped.key; S.ped.applied[key] = [0, 0, 0, 0]; S.ped.last = null; S.ped.prevOut[key] = {}; updateCtl(); }
  function pedSetKey(k) { S.ped.key = k; S.ped.rev = 0; S.ped.last = null; S.fade = 0.5; updateCtl(); }
  const pedDoneN = () => ['A', 'B', 'C'].filter((k) => pedAllApplied(k)).length;


  /* ---------- ④ 가계도 추론: 유전자형 · 확률 ---------- */
  function punnett(x, y, w, h, o) {
    const cw = (w - 56) / 2, ch = (h - 52) / 2;
    TF(x + w / 2, y + 14, o.title, w, L(13.5, 12), 10, '#334155', 'center', 800);
    o.cols.forEach((c, j) => TF(x + 56 + cw * (j + 0.5), y + 40, c, cw - 4, L(15, 13), 11, '#1d4ed8', 'center', 800));
    o.rows.forEach((r, i) => TF(x + 28, y + 52 + ch * (i + 0.5) + 5, r, 52, L(15, 13), 11, '#be185d', 'center', 800));
    T(x + w / 2 + 28, y + h + 14, '분홍: 어머니의 난자 · 파랑: 아버지의 정자', 11.5, '#64748b', 'center', 700);
    let cnt = 0;
    o.cells.forEach((row, i) => row.forEach((g, j) => {
      const cx = x + 56 + cw * j, cy = y + 52 + ch * i, hl = o.hl(g);
      if (hl) cnt++;
      D.roundRect(cx + 2, cy + 2, cw - 4, ch - 4, 8); ctx.fillStyle = hl ? 'rgba(226,70,75,.18)' : '#f8fafc'; ctx.fill(); ctx.strokeStyle = hl ? '#e2464b' : '#cbd5e1'; ctx.lineWidth = hl ? 2.5 : 1.5; ctx.stroke();
      TF(cx + cw / 2, cy + ch / 2 + 5, g.t, cw - 8, L(15, 13), 10, hl ? '#b91c1c' : '#26324a', 'center', 800);
    }));
    return cnt;
  }
  const PUN = {
    A: { title: '4 × 5 (Aa × Aa)', rows: ['A', 'a'], cols: ['A', 'a'], cells: [[{ t: 'AA' }, { t: 'Aa' }], [{ t: 'Aa' }, { t: 'aa' }]], hl: (g) => g.t === 'aa' },
    B: { title: "4가 보인자일 때 : XX' × XY", rows: ['X', "X'"], cols: ['X', 'Y'], cells: [[{ t: 'XX' }, { t: 'XY' }], [{ t: "XX'" }, { t: "X'Y" }]], hl: (g) => g.t === "X'Y" },
    C: { title: '4 × 5 (Aa × aa)', rows: ['A', 'a'], cols: ['a', 'a'], cells: [[{ t: 'Aa' }, { t: 'Aa' }], [{ t: 'aa' }, { t: 'aa' }]], hl: (g) => g.t === 'Aa' },
  };
  function probDraw(dt, t) {
    const pb = S.prob, key = pb.key, pd = PD[key];
    S.ped.rev += dt * (RM ? 20 : 1); pb.gtP = RM ? 1 : approach(pb.gtP, pb.gt ? 1 : 0, dt, 2.2);
    drawPedigree(key, PA, dt, { gt: pb.gt && pb.gtP > 0.02, assume: key !== 'D' });
    const by = PA.y + PA.h + 8, bh = VH - by - (PHONE ? 8 : 12), bx = PHONE ? 8 : 14, bw = VW - bx * 2;
    panel(bx, by, bw, bh, 14, '#fff');
    if (key === 'D') {
      TF(bx + 14, by + 26, '이 가계도로 유전 양상을 정할 수 있을까요?', bw - 28, L(17, 14.5), 11, '#26324a', 'left', 800);
      textBlock(bx + 14, by + 52, bw - 28, '1은 형질이 있고 2는 정상이에요. 자녀 3과 4는 모두 정상이에요. 규칙 ①~④를 적용하면 아래 후보가 남아요.', L(14, 12.5), '#475569', L(20, 18), 700);
      const rem = remainAll('D'), cw = (bw - 28 - 18) / 4;
      CANDS.forEach((c, i) => {
        const on = rem.indexOf(c.id) >= 0, cx = bx + 14 + i * (cw + 6), cy = by + (PHONE ? 126 : 112);
        D.roundRect(cx, cy, cw, 54, 10); ctx.fillStyle = on ? '#ecfdf5' : '#f1f5f9'; ctx.fill(); ctx.strokeStyle = on ? '#16a34a' : '#cbd5e1'; ctx.lineWidth = on ? 2.5 : 1.5; ctx.stroke();
        TF(cx + cw / 2, cy + 24, c.t, cw - 8, L(14.5, 12.5), 10, on ? '#166534' : '#94a3b8', 'center', 800);
        T(cx + cw / 2, cy + 44, on ? '가능' : '불가능', L(13.5, 12), on ? '#16a34a' : '#dc2626', 'center', 800);
      });
      textBlock(bx + 14, by + (PHONE ? 202 : 200), bw - 28, '→ 가능한 유전 양상이 ' + remainAll('D').length + '가지 남아요. 하나로 정하려면 어떤 정보가 더 필요할까요? (오른쪽 위에서 고르세요)', L(14.5, 13), '#92400e', L(21, 19), 800);
      return;
    }
    const pn = PUN[key];
    TF(bx + 14, by + 24, '가정: ' + pd.assume + ' 유전 · 가계도 ' + key, bw - 28, L(15.5, 13.5), 11, '#26324a', 'left', 800);
    const pw = PHONE ? bw - 28 : 270, ph = PHONE ? 130 : bh - 62;
    punnett(bx + 14, by + 38, pw, ph, { title: pn.title, rows: pn.rows, cols: pn.cols, cells: pn.cells, hl: pn.hl });
    const tx = PHONE ? bx + 14 : bx + 14 + pw + 16, ty = PHONE ? by + 38 + ph + 36 : by + 46, tw = PHONE ? bw - 28 : bw - pw - 44;
    const steps = {
      A: ['4와 5는 자녀 6이 aa이므로 둘 다 보인자 Aa예요.', 'Aa × Aa → aa는 4칸 중 1칸 : 1/4', '7은 정상이므로 AA · Aa · Aa 중 하나 → Aa일 확률 2/3'],
      B: ["4의 아버지는 XY(정상), 어머니 2는 XX'이므로 4가 보인자일 확률은 1/2", "4가 XX'이면 자녀 중 X'Y는 4칸 중 1칸이므로 1/4 → 1/2 × 1/4 = 1/8", "아들일 때: 4가 보인자(1/2) × 아들 중 X'Y(1/2) = 1/4"],
      C: ['4는 형질이 있고 자녀 6이 정상(aa)이므로 4는 Aa예요.', 'Aa × aa → Aa(형질 있음)는 4칸 중 2칸 : 1/2', '상염색체 우성이든 X 연관 우성이든 이 가계도에서는 확률이 같아요.'],
    }[key];
    let yy = ty;
    steps.forEach((st, i) => {
      const qi = Math.min(i, pd.q.length);
      if (i > 0 && !pb.done[key + 'q' + qi]) return;
      yy += textBlock(tx, yy, tw, (i + 1) + '. ' + st, L(14, 12.5), i === 0 ? '#475569' : '#166534', L(19.5, 17.5), 700) + 6;
    });
    if (pb.anim) {
      const a = pb.anim, ids = a.ids; a.t += dt * 0.55;
      const pos = ids.map((id) => pedXY(pd, id, PA)), u = Math.min(a.t, 0.999) * (ids.length - 1), k = Math.floor(u), f = u - k;
      const p0 = pos[k], p1 = pos[Math.min(k + 1, ids.length - 1)], e = ease.inOutCubic(f);
      const x = p0.x + (p1.x - p0.x) * e, y = p0.y + (p1.y - p0.y) * e - Math.sin(e * Math.PI) * 20;
      drawChr(x, y, key === 'B' ? 'X' : 'auto', key === 'B' ? 'M' : 'a', { s: 0.55, nolabel: true });
      D.label(x, y - 36, a.lab, { bg: '#fff', color: '#b91c1c', border: '#e2464b', size: 13 });
      if (a.t >= 1) pb.anim = null;
    }
  }
  function probSet(k) { S.prob.key = k; S.ped.rev = 0; S.prob.anim = null; S.fade = 0.5; updateCtl(); }
  function probAnim() { const pth = PD[S.prob.key].path; if (!pth) return; S.prob.anim = { ids: pth.ids, lab: pth.lab, t: 0 }; Sound.tick(); }

  /* =========================================================
     화면 전환 · 조작 연결
     ========================================================= */
  S.hwOn = false; S.finOn = false; S.prob.txt = {};
  const PTS = { match: matchPT };
  function setMode(m) {
    if (S.mode !== m) S.fade = 1;
    if (m === 'ped' || m === 'prob') S.ped.rev = 0;
    if (m === 'twins' && !S.tw.cells.mz) twCellsInit(S.tw.cur);
    S.mode = m; PT = PTS[m] || null; hideHint(); updateCtl();
  }
  const ctlNodes = $$('#ctrlCard .control');
  const OPT = (sel, arr) => { sel.innerHTML = ''; arr.forEach(([v, t]) => { const o = document.createElement('option'); o.value = v; o.textContent = t; sel.appendChild(o); }); };
  ['hwA', 'hwB', 'hwC'].forEach((id) => OPT($('#' + id), [['', '고르세요'], ['rec', '열성'], ['dom', '우성']]));
  OPT($('#finA'), [['', '고르세요'], ['AD', '상염색체 우성'], ['AR', '상염색체 열성'], ['XD', 'X 연관 우성'], ['XR', 'X 연관 열성']]);
  const dsel = $('#diffSel');
  DIFF_OPTS.forEach((o) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'mc'; b.dataset.v = o.id; b.textContent = o.t; dsel.appendChild(b); });
  function updateCtl() {
    const fr = game ? game.free : false, lvNow = game ? game.level : 0;
    ctlNodes.forEach((n) => { n.hidden = (n.dataset.modes || '').split(' ').indexOf(S.mode) < 0; });
    modeButtons(S.mode, lvNow, fr);
    $$('#diffSel button').forEach((b) => b.classList.toggle('on', !!S.diff.pick[b.dataset.v]));
    chipSet($('#twSel'), S.tw.cur); $$('#twSel button').forEach((b) => b.classList.toggle('seen', !!S.tw.done[b.dataset.v]));
    chipSet($('#twBest'), S.tw.pickBest);
    $('#oPop').textContent = popN(S.pop.idx) + '명';
    chipSet($('#pedSel'), S.ped.key); $$('#pedSel button').forEach((b) => b.classList.toggle('seen', pedAllApplied(b.dataset.v)));
    $$('#ruleSel button').forEach((b) => b.classList.toggle('on', !!(S.ped.applied[S.ped.key] || [])[+b.dataset.r]));
    $('#hwBox').hidden = !S.hwOn; $('#finBox').hidden = !S.finOn;
    const pk = S.prob.key, pd = PD[pk];
    chipSet($('#prSel'), pk); $$('#prSel button').forEach((b) => b.classList.toggle('seen', PD[b.dataset.v].q.length > 0 && PD[b.dataset.v].q.every((q) => S.prob.done[b.dataset.v + q.id])));
    $('#prInputs').hidden = pk === 'D'; $('#needBox').hidden = pk !== 'D';
    if (pk !== 'D') {
      $('#pw1').hidden = pd.q.length < 1; $('#pw2').hidden = pd.q.length < 2;
      if (pd.q[0]) $('#pl1').textContent = pd.q[0].t; if (pd.q[1]) $('#pl2').textContent = pd.q[1].t;
      ['q1', 'q2'].forEach((q, i) => { const el = $('#pq' + (i + 1)); el.classList.toggle('ok', !!S.prob.done[pk + q]); });
      $('#prAnim').disabled = !pd.path;
    }
    $('#prGt').textContent = S.prob.gt ? '🔎 유전자형 숨기기' : '🔎 구성원 유전자형 보기';
    chipSet($('#needSel'), S.prob.need);
  }
  bindModes(setMode);
  $$('#diffSel button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.diff.pick[b.dataset.v] = !S.diff.pick[b.dataset.v]; updateCtl(); }));
  $('#matchReset').addEventListener('click', () => { Sound.click(); matchReset(); });
  $$('#twSel button').forEach((b) => b.addEventListener('click', () => { Sound.click(); twinsSet(b.dataset.v); }));
  $$('#twBest button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.tw.pickBest = b.dataset.v; updateCtl(); }));
  ['inMz', 'inDz'].forEach((id) => $('#' + id).addEventListener('input', () => { S.tw.ok = twCheckInputs(); updateCtl(); }));
  $('#sPop').addEventListener('input', (e) => { S.pop.idx = +e.target.value; if (S.pop.idx === POP_M.length - 1) S.pop.seen = true; updateCtl(); });
  $$('#pedSel button').forEach((b) => b.addEventListener('click', () => { Sound.click(); pedSetKey(b.dataset.v); }));
  $$('#ruleSel button').forEach((b) => b.addEventListener('click', () => pedApply(+b.dataset.r)));
  $('#ruleAll').addEventListener('click', pedApplyAll);
  $('#ruleClear').addEventListener('click', () => { Sound.click(); pedClear(); });
  ['hwA', 'hwB', 'hwC', 'finA'].forEach((id) => $('#' + id).addEventListener('change', (e) => { e.target.classList.remove('ok', 'bad'); }));
  $$('#prSel button').forEach((b) => b.addEventListener('click', () => {
    Sound.click(); S.prob.txt[S.prob.key + 'q1'] = $('#pq1').value; S.prob.txt[S.prob.key + 'q2'] = $('#pq2').value;
    probSet(b.dataset.v); $('#pq1').value = S.prob.txt[b.dataset.v + 'q1'] || ''; $('#pq2').value = S.prob.txt[b.dataset.v + 'q2'] || '';
  }));
  ['pq1', 'pq2'].forEach((id, i) => $('#' + id).addEventListener('input', () => {
    const pk = S.prob.key, q = PD[pk].q[i]; if (!q) return;
    const ok = fracIs($('#' + id).value, q.ans, 0.006);
    if (ok && !S.prob.done[pk + q.id]) { Sound.success(); parts.burst(VW / 2, PA.y + PA.h + 60, { count: 16, speed: 170 }); }
    S.prob.done[pk + q.id] = ok; updateCtl();
  }));
  $('#prGt').addEventListener('click', () => { Sound.click(); S.prob.gt = !S.prob.gt; updateCtl(); });
  $('#prAnim').addEventListener('click', probAnim);
  $$('#needSel button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.prob.need = b.dataset.v; updateCtl(); }));
  function resetProbInputs() { S.prob.done = {}; S.prob.txt = {}; $('#pq1').value = ''; $('#pq2').value = ''; S.prob.need = ''; updateCtl(); }

  /* =========================================================
     미션
     ========================================================= */
  const probN = () => ['Aq1', 'Aq2', 'Bq1', 'Bq2', 'Cq1'].filter((k) => S.prob.done[k]).length;
  const twN = () => TW_IDS.filter((id) => S.tw.done[id]).length;
  const levels = [
    {
      title: '연구 방법', short: '연구 방법', icon: '⚖️', phase: '관찰',
      intro: '<p class="si-q">❓ 탐구 질문: 교배 실험을 할 수 없는 사람의 형질이 어떤 방식으로 유전되는지 어떻게 알아낼까?</p><p>🔗 <b>중학교</b>에서 사람의 유전 연구 방법(가계도 조사, 쌍둥이 연구, 집단 조사, DNA 분석)과 가계도 기호를 배웠어요. 이번 차시에서는 방법의 이름을 다시 외우는 대신, 사람 유전 연구가 <b>왜 어려운지</b> 알아보고 각 방법으로 <b>무엇을 알아낼 수 있는지</b> 분석해요.</p><p>💡 이 차시의 모든 가계도 · 쌍둥이 · 집단 자료는 <b>교육용 가상 자료</b>예요. 번호만 쓰고 실제 가족 정보는 다루지 않아요.</p>',
      features: ['diff', 'match'],
      setup() { setMode('diff'); },
      recap: '사람은 세대가 길고 자손이 적으며 교배 실험을 할 수 없고 환경을 통제하기 어려워서 유전 연구가 어려워요. 그래서 가계도 · 쌍둥이 · 집단 · DNA 자료를 분석해 유전 특성을 추론해요.',
      summary: '<ul><li><b>사람 유전 연구의 어려움</b>: ① 한 세대가 길어요(약 25~30년). ② 자손의 수가 적어요. ③ 교배 실험을 할 수 없어요. ④ 환경의 영향이 크고 통제하기 어려워요. ⑤ 대부분의 형질이 여러 유전자의 영향을 받아요(다유전자).</li><li><b>연구 방법과 알아내려는 질문</b>: 가계도 조사 → 어떤 방식으로 유전되나 / 쌍둥이 연구 → 유전과 환경의 영향 정도 / 집단 조사 → 빈도와 성별 차이 / DNA · 유전체 분석 → 어떤 염기 서열 변이가 관련되나.</li><li>모든 자료는 교육용 가상 자료이고, 사람의 유전 연구에는 개인정보 보호가 중요해요.</li></ul>',
      missions: [
        {
          id: 'diff', title: '사람 유전 연구가 어려운 까닭', manual: true,
          goal: '완두와 비교해 <b>사람 유전 연구의 어려움</b>인 것을 <b>4가지</b> 고르세요.',
          hint: '그림에서 세대 시간 · 자손 수 · 교배 실험 · 환경 통제의 차이를 봐요. 사람에게도 염색체와 멘델의 원리는 똑같이 있어요.',
          setup() { S.diff.pick = {}; S.diff.grow = 0; setMode('diff'); },
          check() {
            const pk = diffPicked();
            const wrong = DIFF_OPTS.filter((o) => !o.ok && S.diff.pick[o.id]);
            if (wrong.length) return '\'' + wrong[0].t + '\'는 어려움이 아니에요. 사람도 염색체가 있고 멘델의 유전 원리가 적용돼요. 다시 골라 보세요.';
            if (pk === diffOkSet()) return true;
            const n = Object.keys(S.diff.pick).filter((k) => S.diff.pick[k]).length;
            return n < 4 ? '아직 ' + (4 - n) + '가지가 더 있어요. 그림의 네 가지 차이를 하나씩 떠올려 보세요.' : '골라야 할 것을 다시 확인해 보세요.';
          },
          explain: '사람은 <b>세대가 길고(약 25~30년)</b>, <b>자손의 수가 적고</b>, <b>교배 실험을 할 수 없고</b>, <b>환경의 영향이 커서</b> 통제하기 어려워요. 그리고 대부분의 형질은 여러 유전자가 함께 관여하는 다유전자 유전이에요. 하지만 사람에게도 염색체가 있고 멘델의 유전 원리가 똑같이 적용돼요.',
        },
        {
          id: 'match', title: '연구 방법과 질문 연결', manual: true,
          goal: '연구 방법 <b>4가지</b>를 각각 알아내려는 <b>질문</b>과 이으세요.',
          hint: '가계도는 유전되는 방식, 쌍둥이는 유전과 환경의 영향 정도, 집단 조사는 빈도, DNA 분석은 염기 서열 변이예요.',
          setup() { matchReset(); setMode('match'); },
          check() {
            const n = matchLinked();
            if (n < 4) { S.match.flag = null; return '방법 네 가지를 모두 질문과 이어 주세요. (' + n + ' / 4)'; }
            const w = matchWrong();
            S.match.flag = w.length ? Object.fromEntries(w.map((i) => [i, true])) : null;
            if (!w.length) return true;
            const mt = METHODS[w[0]].t, fin = (mt.charCodeAt(mt.length - 1) - 0xAC00) % 28; return '\'' + mt + '\'' + (fin === 0 || fin === 8 ? '로' : '으로') + ' 알아낼 수 있는 것을 다시 생각해 보세요. (빨간 선)';
          },
          explain: '<b>가계도 조사</b>는 형질이 어떤 방식(우성 · 열성, 상염색체 · 성염색체)으로 유전되는지, <b>쌍둥이 연구</b>는 유전과 환경이 형질에 미치는 영향의 정도, <b>집단 조사</b>는 형질의 빈도와 성별 차이, <b>DNA · 유전체 분석</b>은 어떤 염기 서열의 변이가 형질과 관련되는지를 알아내요.',
        },
      ],
    },
    {
      title: '쌍둥이 · 집단 자료', short: '쌍둥이·집단', icon: '👯', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 쌍둥이 연구는 유전과 환경의 영향 정도를, 집단 조사는 빈도를 알아낸다고 확인했어요.</div><p>이번에는 가상의 <b>쌍둥이 자료</b>로 <b>일치율</b>을 직접 계산해 비교해요. 1란성 쌍둥이는 유전자가 같고, 2란성 쌍둥이는 일반 형제처럼 유전자의 약 절반이 같아요. 그 다음 <b>집단 조사 자료</b>에서 표본 수가 결과에 주는 영향도 살펴봐요.</p>',
      features: ['twins', 'pop'],
      setup() { setMode('twins'); },
      recap: '1란성의 일치율이 2란성보다 훨씬 높을수록 유전의 영향이 커요. 1란성도 100 %가 아니면 환경의 영향이 있고, 두 일치율이 비슷하면 환경의 영향이 커요. 집단 조사는 표본이 클수록 빈도가 안정돼요.',
      summary: '<ul><li><b>일치율</b> = (두 사람 모두 형질이 나타난 쌍 수) / (적어도 한 사람에게 형질이 나타난 쌍 수) × 100.</li><li>가상 자료: 형질 ㉠ 1란성 100 % · 2란성 55 % / ㉡ 1란성 70 % · 2란성 30 % / ㉢ 1란성 55 % · 2란성 50 %.</li><li>1란성(유전자가 같음)의 일치율이 2란성보다 <b>훨씬 높을수록</b> 유전의 영향이 커요(㉠). 1란성이라도 100 %가 아니면 <b>환경의 영향</b>이 있어요(㉡). 두 일치율이 <b>비슷하면</b> 환경의 영향이 커요(㉢).</li><li><b>집단 조사</b>: 표본이 작으면 우연에 따라 빈도가 크게 흔들려요. 표본이 커질수록 안정돼요(가상 자료: 1000명에서 남자 6 %, 여자 0.4 %).</li></ul>',
      missions: [
        {
          id: 'twins', title: '일치율 계산과 비교',
          goal: '형질 ㉠㉡㉢의 <b>1란성 · 2란성 일치율</b>을 계산해 입력하고, <b>유전의 영향이 가장 큰 형질</b>을 고르세요. 집단 조사 표본도 <b>1000명</b>까지 늘려 보세요.',
          hint: '일치한 쌍 수 / (일치 + 불일치한 쌍 수) × 100이에요. 예: 22쌍 일치, 18쌍 불일치 → 22 / 40 × 100 = 55 %. 1란성과 2란성의 차이가 가장 큰 형질이 정답이에요.',
          setup() { S.tw.done = {}; S.tw.pickBest = ''; S.tw.bars = { A: { mz: 0, dz: 0 }, B: { mz: 0, dz: 0 }, C: { mz: 0, dz: 0 } }; S.pop.idx = 0; S.pop.seen = false; $('#sPop').value = 0; twinsSet('A'); setMode('twins'); },
          check: () => twN() === 3 && S.tw.pickBest === 'A' && S.pop.seen, hold: 0.8,
          status: () => mark(twN() === 3) + ' 일치율 계산 ' + twN() + ' / 3 &nbsp; ' + mark(S.tw.pickBest === 'A') + ' 유전 영향이 큰 형질 ' + (S.tw.pickBest ? '㉠㉡㉢'.charAt(['A', 'B', 'C'].indexOf(S.tw.pickBest)) : '?') + ' &nbsp; ' + mark(S.pop.seen) + ' 표본 1000명',
          explain: '㉠은 1란성 <b>100 %</b>, 2란성 <b>55 %</b>로 차이가 가장 커서 <b>유전의 영향이 가장 커요</b>. ㉡은 1란성이 70 %로 100 %에 못 미쳐 <b>환경의 영향</b>도 있어요. ㉢은 두 일치율(55 %와 50 %)이 비슷해 <b>환경의 영향이 커요</b>. 집단 조사는 표본이 클수록 빈도가 안정돼요.',
        },
        {
          type: 'quiz', title: '일치율이 비슷하다면',
          goal: '형질 ㉢은 1란성 쌍둥이의 일치율(55 %)과 2란성 쌍둥이의 일치율(50 %)이 <b>비슷해요</b>. 가장 알맞은 해석은?',
          setup() { setMode('twins'); twinsSet('C'); },
          choices: ['유전자의 영향이 매우 크다', '환경의 영향이 크다', '이 형질은 유전자와 전혀 관계가 없다', '1란성 쌍둥이는 서로 유전자가 다르다'],
          answer: 1,
          feedback: ['유전의 영향이 크다면 유전자가 같은 1란성의 일치율이 2란성보다 훨씬 높아야 해요.', '', '두 일치율이 다소 차이가 나니 유전의 영향이 \'전혀\' 없다고는 할 수 없어요. 다만 환경의 영향이 더 커 보여요.', '1란성 쌍둥이는 유전자가 같아요. 2란성 쌍둥이는 일반 형제처럼 유전자의 약 절반이 같아요.'],
          explain: '유전자가 같은 1란성과 유전자가 일부만 같은 2란성의 일치율이 <b>비슷하면</b> 유전자 차이가 결과에 영향을 주지 못한 것이므로 <b>환경의 영향이 크다</b>고 해석해요. 1란성 쌍둥이 사이의 형질 차이는 유전자가 같으므로 환경이 만든 거예요.',
        },
        {
          type: 'quiz', title: '표본이 작으면',
          goal: '표본 50명을 조사했더니 색맹이 남자 2명, 여자 0명이었어요. 이 결과로 \'여자는 색맹이 없다\'고 결론 내리기 어려운 가장 큰 까닭은?',
          setup() { setMode('pop'); },
          choices: ['표본이 작아서 우연에 따라 결과가 크게 달라질 수 있다', '여자는 원래 색맹이 될 수 없기 때문이다', '조사 결과는 항상 틀리기 때문이다', '남자의 수가 더 많이 필요하기 때문이다'],
          answer: 0,
          feedback: ['', '여자도 두 X가 모두 색맹 대립유전자일 때 색맹이 될 수 있어요. 다만 드물어요.', '조사 결과가 틀린 게 아니라 표본이 작아서 대표성이 낮은 거예요.', '남녀의 수보다 표본의 크기가 문제예요.'],
          explain: '표본이 작으면 <b>우연</b>에 따라 빈도가 크게 흔들려요. 표본을 1000명으로 늘리면 남자 6 %, 여자 0.4 %로 안정되는 것을 볼 수 있어요. 집단 조사에서는 표본이 <b>충분히 커야</b> 결과를 믿을 수 있어요.',
        },
      ],
    },
    {
      title: '유전 양상 추론', short: '유전 양상', icon: '🌳', phase: '탐구',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 쌍둥이 · 집단 자료로 유전과 환경의 영향을 비교했어요.</div><p>이제 <b>가계도 분석</b>이에요. □은 남자, ○은 여자, 색이 채워지면 형질이 있는 사람이에요. 네 가지 후보(상염색체 우성 · 열성, X 연관 우성 · 열성)를 놓고 <b>판별 규칙</b>을 가계도에 적용해 후보를 하나씩 소거해요.</p><p>💡 규칙을 어기는 사람에게 <b>빨간 번호표</b>가 붙어요. 모든 규칙을 통과하고도 남는 후보는 <b>가능한 유전 양상</b>이에요.</p>',
      features: ['ped'],
      setup() { setMode('ped'); },
      recap: '형질이 없는 부모에서 형질이 있는 자녀가 나오면 열성, 형질이 있는 부모에서 정상 자녀가 나오면 우성이에요. X 연관 규칙을 어기면 상염색체 유전이에요. 모든 규칙을 통과해도 상염색체 가능성은 남을 수 있어요.',
      summary: '<ul><li><b>우성 / 열성</b>: 정상 부모 → 형질 있는 자녀 ⇒ <b>열성</b>(부모는 모두 보인자). 형질 있는 부모 → 정상 자녀 ⇒ <b>우성</b>(부모는 모두 이형 접합).</li><li><b>X 연관 열성이라면</b>: 형질이 있는 어머니의 아들은 모두 형질이 있고, 형질이 있는 딸의 아버지는 반드시 형질이 있어요. 하나라도 어기면 상염색체 유전이에요.</li><li><b>X 연관 우성이라면</b>: 형질이 있는 아버지의 딸은 모두 형질이 있고, 형질이 없는 어머니의 아들은 모두 형질이 없어요. 어기면 상염색체 유전이에요.</li><li>모든 규칙을 통과해도 상염색체 유전의 가능성이 남으므로 \'<b>가능한 유전 양상</b>\'으로 표현해요. 형질이 남자에게만 나타나도 반드시 X 연관은 아니에요.</li></ul>',
      missions: [
        {
          id: 'hw', title: '우성일까 열성일까', manual: true,
          goal: '가계도 <b>A · B · C</b>의 형질이 <b>우성</b>인지 <b>열성</b>인지 고르세요.',
          hint: '□ ○가 모두 정상인 부모에게서 형질 있는 자녀가 나왔는지(→ 열성), 형질 있는 부모에게서 정상 자녀가 나왔는지(→ 우성) 찾아봐요. 오른쪽 위의 규칙 ① ②를 눌러 확인해도 돼요.',
          setup() { S.hwOn = true; S.finOn = false; setMode('ped'); updateCtl(); },
          check() {
            const v = { A: $('#hwA').value, B: $('#hwB').value, C: $('#hwC').value }, ans = { A: 'rec', B: 'rec', C: 'dom' };
            if (!v.A || !v.B || !v.C) return '세 가계도 모두 골라 주세요.';
            const bad = ['A', 'B', 'C'].filter((k) => v[k] !== ans[k]);
            ['A', 'B', 'C'].forEach((k) => { $('#hw' + k).classList.toggle('ok', v[k] === ans[k]); $('#hw' + k).classList.toggle('bad', v[k] !== ans[k]); });
            if (!bad.length) return true;
            return '가계도 ' + bad[0] + (bad[0] === 'C' ? '는 형질이 있는 부모(1, 2)에게서 정상인 자녀(3)가 태어났어요. 어떤 형질일까요?' : '는 정상인 부모에게서 형질이 있는 자녀가 태어났어요. 어떤 형질일까요?');
          },
          explain: '가계도 <b>A</b>는 정상인 1 · 2에게서 형질이 있는 딸 3이, <b>B</b>는 정상인 1 · 2에게서 형질이 있는 아들 3이 태어났으므로 <b>열성</b>이에요. 가계도 <b>C</b>는 형질이 있는 1 · 2에게서 정상인 아들 3이 태어났으므로 <b>우성</b>이고, 1 · 2는 모두 이형 접합이에요.',
        },
        {
          id: 'elim', title: '후보 소거로 유전 양상 정하기',
          goal: '가계도 <b>A · B · C</b> 모두에 <b>규칙 ①~④를 적용</b>하고, 가계도 <b>A</b>에서 남은 유전 양상을 고르세요.',
          hint: '\'규칙 모두 적용\' 버튼으로 한 번에 적용할 수 있어요. 가계도 A에서 형질이 있는 딸 3의 아버지 1은 정상이에요. 그러면 X 연관 열성일 수 있을까요?',
          setup() { S.hwOn = false; S.finOn = true; setMode('ped'); updateCtl(); },
          check: () => pedDoneN() === 3 && $('#finA').value === 'AR', hold: 0.6,
          status: () => mark(pedDoneN() === 3) + ' 규칙 적용 ' + pedDoneN() + ' / 3개 가계도 &nbsp; ' + mark($('#finA').value === 'AR') + ' A의 유전 양상',
          explain: '가계도 A: 규칙 ①로 우성 · X 연관 우성이 소거되고, 규칙 ③에서 형질이 있는 딸 3의 아버지 1이 정상이므로 X 연관 열성도 소거돼요 → <b>상염색체 열성</b>만 남아요. 가계도 B는 상염색체 열성 · X 연관 열성이 남고, 가계도 C는 상염색체 우성 · X 연관 우성이 남아요. 이처럼 모든 규칙을 통과해도 상염색체 가능성이 남을 수 있어서 \'<b>가능한 유전 양상</b>\'이라고 표현해요.',
        },
        {
          type: 'quiz', title: '남자에게만 나타나는 형질',
          goal: '어떤 가계도에서 형질이 <b>남자에게만</b> 나타났어요. 이 형질에 대해 옳은 것은?',
          setup() { S.hwOn = false; S.finOn = false; setMode('ped'); },
          choices: ['남자에게만 나타나므로 반드시 X 연관 유전이다', '상염색체 열성 유전일 수도 있다', 'Y 연관 유전이므로 어머니는 보인자가 될 수 없다', '여자에게는 절대 나타날 수 없다'],
          answer: 1,
          feedback: ['가계도의 구성원이 적으면 상염색체 유전 형질이 우연히 남자에게만 나타날 수 있어요. 규칙으로 따져 봐야 해요.', '', 'Y 연관 유전은 아버지 → 아들로만 전해지는 다른 유전 양상이에요. 이 차시에서는 이름만 알아 두면 돼요.', 'X 연관 열성이라도 아버지가 형질이 있고 어머니가 보인자이면 딸에게도 나타날 수 있어요.'],
          explain: '형질이 <b>남자에게만</b> 나타나도 구성원 수가 적으면 <b>상염색체 열성</b> 유전일 수 있어요. X 연관인지 알려면 \'형질이 있는 딸의 아버지\', \'형질이 있는 어머니의 아들\' 같은 <b>규칙을 어기는 사람</b>이 있는지 확인해야 해요. (형질이 있는 딸의 아버지가 정상이면 X 연관 열성이 될 수 없어요.)',
        },
      ],
    },
    {
      title: '가계도 추론', short: '가계도 추론', icon: '🧮', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 판별 규칙으로 가능한 유전 양상을 추려 냈어요.</div><p>유전 양상이 정해졌다고 <b>가정</b>하면 가계도 구성원의 <b>유전자형</b>을 추론하고 <b>확률</b>을 계산할 수 있어요. (AA · Aa · aa, XX · XX\' · X\'Y)</p><p>💡 또 어떤 가계도는 자료만으로 <b>하나로 정할 수 없어요</b>. 그럴 때는 어떤 정보가 더 필요한지도 생각해 봐요.</p>',
      features: ['prob'],
      setup() { setMode('prob'); },
      recap: '유전 양상을 정하면 구성원의 유전자형과 확률을 추론할 수 있어요: A(상염색체 열성)에서 다음 자녀 1/4, 정상인 7이 보인자일 확률 2/3, B(X 연관 열성)에서 1/8(아들이면 1/4), C(상염색체 우성)에서 1/2. 자료가 부족하면 가계도를 더 넓혀야 해요.',
      summary: '<ul><li><b>가계도 A</b>(상염색체 열성): 6이 aa → 4 · 5는 모두 Aa. 다음 자녀가 aa일 확률 <b>1/4</b>. 정상인 7이 Aa일 확률 <b>2/3</b>(AA : Aa = 1 : 2).</li><li><b>가계도 B</b>(X 연관 열성): 3이 X\'Y → 2는 XX\'. 4가 보인자일 확률 1/2 × X\'을 물려줄 확률 1/2 × 아들일 확률 1/2 = <b>1/8</b>. 아들로 한정하면 <b>1/4</b>.</li><li><b>가계도 C</b>(상염색체 우성): 4는 형질이 있는데 자녀 6이 정상 → 4는 Aa. Aa × aa → 형질이 있을 확률 <b>1/2</b>.</li><li>자료가 부족하면 가능한 유전 양상이 여러 가지 남아요. 구성원과 세대를 넓혀 더 많은 정보를 모아야 해요.</li></ul>',
      missions: [
        {
          id: 'prob', title: '유전자형과 확률 계산',
          goal: '가계도 <b>A · B · C</b>에서 <b>확률 5개</b>를 구해 입력하세요. (분수나 소수로)',
          hint: '구성원 유전자형 보기를 눌러 유전자형을 확인해요. 확률 = (경우의 수) 곱하기예요. 가계도 B는 4가 보인자일 확률 1/2부터 시작해요.',
          setup() { resetProbInputs(); S.prob.gt = false; setMode('prob'); probSet('A'); },
          check: () => probN() === 5, hold: 0.6,
          status: () => mark(S.prob.done.Aq1 && S.prob.done.Aq2) + ' A ' + (+!!S.prob.done.Aq1 + +!!S.prob.done.Aq2) + '/2 &nbsp; ' + mark(S.prob.done.Bq1 && S.prob.done.Bq2) + ' B ' + (+!!S.prob.done.Bq1 + +!!S.prob.done.Bq2) + '/2 &nbsp; ' + mark(S.prob.done.Cq1) + ' C ' + (+!!S.prob.done.Cq1) + '/1',
          explain: 'A: 4 × 5는 Aa × Aa이므로 다음 자녀가 aa일 확률은 <b>1/4</b>이고, 정상인 7은 AA · Aa · Aa 중 하나이므로 보인자일 확률이 <b>2/3</b>예요. B: 4가 보인자(1/2) × 보인자가 X\'을 물려줄 확률(1/2) × 아들(1/2) = <b>1/8</b>이고, 아들이면 1/2 × 1/2 = <b>1/4</b>이에요. C: 4가 Aa이므로 Aa × aa에서 형질이 있을 확률은 <b>1/2</b>이에요.',
        },
        {
          id: 'need', title: '더 필요한 정보', manual: true,
          goal: '가계도 <b>D</b>는 가능한 유전 양상이 여러 가지 남아요. 하나로 정하려면 <b>어떤 정보</b>가 더 필요할까요?',
          hint: '가계도 D에는 자녀 두 명이 모두 정상이에요. 형질이 나타나는 구성원이 더 있으면 규칙을 적용할 수 있어요.',
          setup() { S.prob.need = ''; setMode('prob'); probSet('D'); },
          check() {
            const n = S.prob.need;
            if (!n) return '필요한 정보를 하나 골라 주세요.';
            if (n === 'more') return true;
            return n === 'abo' ? '혈액형은 이 형질의 유전 양상과 관계가 없어요. 규칙을 적용할 수 있는 정보가 필요해요.' : '이름 · 나이 · 키 · 몸무게는 유전 양상을 정하는 규칙에 쓸 수 없어요. 형질이 나타나는지 아닌지의 정보가 필요해요.';
          },
          explain: '가계도 D의 자녀가 모두 정상이어서 규칙 ④로 X 연관 우성만 소거돼요. 상염색체 우성 · 열성, X 연관 열성이 남아요. <b>더 많은 구성원과 다음 세대의 표현형</b>(형질이 나타나는 사람)을 조사해 규칙을 더 적용해야 하나로 좁힐 수 있어요. 이것이 사람 유전 연구에서 <b>가계도를 넓게 조사하는 까닭</b>이에요.',
        },
        {
          type: 'quiz', title: '정상 자녀가 알려 주는 것',
          goal: '형질이 있는 <b>부모</b> 사이에서 <b>정상인 자녀</b>가 태어났어요. 이 사실이 알려 주는 것은?',
          setup() { setMode('prob'); probSet('C'); },
          choices: ['이 형질은 열성이고 부모는 모두 동형 접합이다', '이 형질은 우성이고 부모는 모두 이형 접합이다', '이 형질은 X 연관 열성이다', '정상 자녀는 새로 생긴 돌연변이 때문에 태어났다'],
          answer: 1,
          feedback: ['열성 형질이 있는 부모는 모두 열성 동형 접합이라 정상 자녀를 낳을 수 없어요.', '', '이 사실만으로 X 연관인지는 알 수 없고, 열성이라면 정상 자녀가 태어날 수 없어요.', '돌연변이는 매우 드물어요. 우성 형질의 이형 접합 부모라면 정상 자녀는 흔히 태어나요.'],
          explain: '형질이 있는 부모에게서 정상 자녀가 태어났다면 부모는 <b>정상 대립유전자</b>를 숨기고 있는 거예요. 그러려면 그 형질은 <b>우성</b>이고 부모는 모두 <b>이형 접합(Aa)</b>이어야 해요. 자녀는 부모에게서 각각 열성 대립유전자(a)를 받아 aa가 된 거예요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hg-pedigree', mount: '#game', badge: '가계도 분석가', homeHref: '../../index.html#hg',
    featureLabels: { diff: '⚖️ 완두와 사람 비교', match: '🔗 방법과 질문 연결', twins: '👯 쌍둥이 연구', pop: '👥 집단 조사', ped: '🌳 유전 양상 판별', prob: '🧮 가계도 추론' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 읽음 칸 ---------- */
  function readouts() {
    const m = S.mode;
    if (m === 'diff') setReads(['고른 어려움', Object.keys(S.diff.pick).filter((k) => S.diff.pick[k]).length + '개', '정답 개수', '4개', '비교 대상', '완두 · 사람']);
    else if (m === 'match') setReads(['이은 선', matchLinked() + ' / 4', '연구 방법', '4가지', '자료', '가상 · 번호만']);
    else if (m === 'twins') { const id = S.tw.cur, ok = S.tw.ok; setReads(['형질', TW_NAME[id], '1란성 일치율', ok.mz ? fmtN(twRate(id, 'mz'), 0) + ' %' : '?', '2란성 일치율', ok.dz ? fmtN(twRate(id, 'dz'), 0) + ' %' : '?']); }
    else if (m === 'pop') { const i = S.pop.idx; setReads(['표본 수', popN(i) + '명', '남자 빈도', fmtN(popRate(POP_M, i), 1) + ' % (' + POP_M[i][1] + '/' + POP_M[i][0] + ')', '여자 빈도', fmtN(popRate(POP_F, i), 1) + ' % (' + POP_F[i][1] + '/' + POP_F[i][0] + ')']); }
    else if (m === 'ped') { const k = S.ped.key, ap = S.ped.applied[k]; setReads(['가계도', k, '적용한 규칙', ap.reduce((a, b) => a + b, 0) + ' / 4', '남은 후보', ap.every((q) => q) ? pedRemain(k).length + '가지' : '규칙을 모두 적용하면 알 수 있어요']); }
    else { const k = S.prob.key; setReads(['가계도', k, '가정', PD[k].assume, '맞힌 확률', PD[k].q.length ? PD[k].q.filter((q) => S.prob.done[k + q.id]).length + ' / ' + PD[k].q.length : '—']); }
  }

  /* ---------- 시작 ---------- */
  twCellsInit('A');
  setMode('diff');
  let lastFree = false, lastLv = -1;
  SciSim.loop((dt, t) => {
    clock = t; S.t = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (game && game.level !== lastLv) { lastLv = game.level; updateCtl(); }
    view.apply(); ctx.clearRect(0, 0, VW, VH);
    bgFill('#eef4f2', '#e3ece8');
    switch (S.mode) {
      case 'diff': diffDraw(dt, t); break;
      case 'match': matchDraw(dt, t); break;
      case 'twins': twinsDraw(dt, t); break;
      case 'pop': popDraw(dt, t); break;
      case 'ped': pedDraw(dt, t); break;
      case 'prob': probDraw(dt, t); break;
    }
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(241,246,243,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, PHONE, get game() { return game; }, levels, setMode, updateCtl, DIFF_OPTS, METHODS, QUESTS, mRect, matchLink, matchLinked, matchWrong, TW, twRate, twinsSet, twCheckInputs, twN,
    POP_M, POP_F, PD, PV, CANDS, candState, pedRemain, pedApply, pedApplyAll, pedSetKey, probSet, pedAllApplied, remainAll, pedViol, probN, resetProbInputs,
  };
})();
