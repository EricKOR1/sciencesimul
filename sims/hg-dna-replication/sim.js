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
  /* 시간 지연이 있는 효과(리셋 시 지울 수 있게 한 곳에서 관리) */
  const FX = { list: [] };
  FX.add = (e) => { e.age = -(e.delay || 0); FX.list.push(e); };
  FX.clear = () => { FX.list.length = 0; };
  FX.update = (dt) => { for (let i = FX.list.length - 1; i >= 0; i--) { const e = FX.list[i]; e.age += dt; if (e.age >= e.life) { FX.list.splice(i, 1); if (e.done) e.done(); } } };
  FX.draw = () => {
    FX.list.forEach((e) => {
      if (e.age < 0) return;
      const p = e.age / e.life;
      if (e.kind === 'text') {
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
      if (box.slot) return box.slot;
      const cols = box.cols || 2, gap = box.gap || 6, rows = Math.max(1, Math.ceil(n / cols));
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
      if (zoneId) { const bx = this.boxes.find((q) => q.id === zoneId); if (bx && bx.single) this.cards.forEach((o) => { if (o !== c && o.zone === zoneId) { o.zone = null; o.bad = false; } }); }
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
     고등학교 생물의 유전 · Ⅰ. 유전자와 유전물질 - DNA의 반보존적 복제 (단원 59, 9차시)
     성취기준 [12유전01-07] 반보존적 DNA 복제 과정을 이해하고 그 의미를 추론하여 협력적으로 소통할 수 있다.
     ① 탐구: 세 가지 가설  ② 실험: 밀도 띠  ③ 모형: 복제 모의  ④ 설명: 복제의 의미
     (효소와 프라이머는 용어 수준, 수치는 근사 예시 값, 모둠 보드는 가상이에요)
     ========================================================= */
  const S = { mode: 'hyp', fade: 0, t: 0 };
  let game = null;
  const ease = SciSim.ease;
  const rr = (x, y, w, h, r) => D.roundRect(x, y, w, h, r);
  const fmt1 = (n) => String(+Number(n).toFixed(2));
  const BC = { A: '#22c55e', T: '#ef4444', G: '#eab308', C: '#3b82f6' };
  const BT = { A: '#ffffff', T: '#ffffff', G: '#3b2f00', C: '#ffffff' };
  const BASES = ['A', 'T', 'G', 'C'];
  const COMP = { A: 'T', T: 'A', G: 'C', C: 'G' };
  const OLD = '#2563eb', NEW = '#ef4444';

  /* ---------- DNA 분자 그림: a, b = 두 가닥에서 원래 가닥의 비율 (1 = 모두 원래, 0 = 모두 새 것) ---------- */
  function strandBar(x, y, w, h, f, off) {
    const n = 8, sw = w / n, cnt = Math.round(clamp(f, 0, 1) * n), old = {};
    for (let k = 0; k < cnt; k++) old[Math.floor((k + 0.5) * n / cnt)] = true;
    for (let i = 0; i < n; i++) { ctx.fillStyle = old[i] ? OLD : NEW; ctx.fillRect(x + i * sw, y, sw + 0.6, h); }
    ctx.strokeStyle = 'rgba(15,23,42,.45)'; ctx.lineWidth = 1; ctx.strokeRect(x, y, w, h);
  }
  function molecule(cx, cy, w, m, o) {
    o = o || {};
    ctx.save(); ctx.globalAlpha = o.alpha == null ? 1 : o.alpha;
    const s = o.s || 1; ctx.translate(cx, cy); ctx.scale(s, s);
    for (let i = 0; i <= 8; i++) { const x = -w / 2 + i * w / 8; ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, -3); ctx.lineTo(x, 3); ctx.stroke(); }
    strandBar(-w / 2, -11, w, 8, m.a, 0); strandBar(-w / 2, 3, w, 8, m.b, 0);
    ctx.restore();
  }
  /* 가설별 복제 결과 (g회 복제 뒤 DNA 분자 목록) */
  function hypMols(h, g) {
    if (h === 0) { const a = [{ a: 1, b: 1 }]; for (let i = 1; i < Math.pow(2, g); i++) a.push({ a: 0, b: 0 }); return a; }
    if (h === 1) { const a = [{ a: 1, b: 0 }, { a: 0, b: 1 }]; for (let i = 2; i < Math.pow(2, g); i++) a.push({ a: 0, b: 0 }); return a; }
    const f = 1 / Math.pow(2, g), a = []; for (let i = 0; i < Math.pow(2, g); i++) a.push({ a: f, b: f }); return a;
  }
  const HYP = [
    { n: '보존적 복제', rule: '원래 이중 가닥은 그대로 남고, 새 이중 가닥이 따로 만들어져요.' },
    { n: '반보존적 복제', rule: '새로 만들어진 DNA는 원래 가닥 1개 + 새 가닥 1개로 이루어져요.' },
    { n: '분산적 복제', rule: '원래 가닥과 새 가닥이 조각조각 섞여서 두 가닥 모두 섞인 DNA가 돼요.' },
  ];
  /* ---------- 밀도 띠 (초원심 분리 튜브) ---------- */
  const DL = 1.710, DM = 1.717, DH = 1.724;          // 가벼운 / 중간 / 무거운 DNA의 밀도 (g/cm³, 예시)
  const bandsOf = (mols) => {
    const g = {};
    mols.forEach((m) => { const f = (m.a + m.b) / 2, d = +(DL + (DH - DL) * f).toFixed(4); g[d] = (g[d] || 0) + 1; });
    return Object.keys(g).map((d) => ({ d: +d, a: g[d] / mols.length })).sort((p, q) => p.d - q.d);
  };
  const sigOf = (bands) => bands.map((b) => b.d.toFixed(4) + ':' + b.a.toFixed(3)).join('|');
  function newTube(w, h) { return { b: [{ y: 0, a: 0, init: false }, { y: 0, a: 0, init: false }], w, h }; }
  function tubeUpdate(T0, top, bands, dt) {
    const yD = (d) => top + 26 + (d - 1.705) / (1.730 - 1.705) * (T0.h - 56);
    for (let i = 0; i < 2; i++) {
      const tg = bands[i], b = T0.b[i];
      const ty = tg ? yD(tg.d) : b.y, ta = tg ? tg.a : 0;
      if (!b.init) { b.y = ty || yD(DM); b.a = 0; b.init = true; }
      b.y = RM ? ty : approach(b.y, ty, dt, 6); b.a = RM ? ta : approach(b.a, ta, dt, 6);
    }
  }
  /* 튜브 그림: x = 중심, top = 위쪽 y */
  function drawTube(T0, x, top, o) {
    o = o || {};
    const w = T0.w, h = T0.h, r = w / 2;
    ctx.save();
    // 유리관 + 염화 세슘 용액(아래로 갈수록 진함)
    const g = ctx.createLinearGradient(0, top, 0, top + h); g.addColorStop(0, '#e0f2fe'); g.addColorStop(1, '#7dd3fc');
    ctx.beginPath(); ctx.moveTo(x - r, top); ctx.lineTo(x - r, top + h - r); ctx.arc(x, top + h - r, r, Math.PI, 0, true); ctx.lineTo(x + r, top); ctx.closePath();
    D.shadow(() => { ctx.fillStyle = g; ctx.fill(); }, { blur: 6, y: 2 });
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.clip();
    // 띠
    T0.b.forEach((b) => {
      if (b.a < 0.01) return;
      const th = 5 + 20 * b.a;
      ctx.save(); ctx.shadowColor = '#a855f7'; ctx.shadowBlur = 14 * b.a;
      const bg = ctx.createLinearGradient(0, b.y - th / 2, 0, b.y + th / 2); bg.addColorStop(0, 'rgba(168,85,247,0)'); bg.addColorStop(0.5, 'rgba(192,132,252,' + (0.55 + 0.45 * b.a) + ')'); bg.addColorStop(1, 'rgba(168,85,247,0)');
      ctx.fillStyle = bg; ctx.fillRect(x - r + 3, b.y - th / 2, w - 6, th);
      ctx.fillStyle = 'rgba(243,232,255,' + (0.5 + 0.5 * b.a) + ')'; ctx.fillRect(x - r + 5, b.y - 1.5, w - 10, 3);
      ctx.restore();
    });
    ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,.45)'; rr(x - r + 4, top + 6, 5, h - r - 10, 3); ctx.fill();
  }
  const tubeY = (top, h, d) => top + 26 + (d - 1.705) / (1.730 - 1.705) * (h - 56);

  /* =========================================================
     ① 세 가지 가설
     ========================================================= */
  const PERM = { 0: { 1: [2, 0, 1], 2: [1, 2, 0] }, 1: { 1: [0, 2, 1], 2: [2, 1, 0] }, 2: { 1: [1, 0, 2], 2: [0, 2, 1] } };
  S.hy = { h: 0, g: 1, done: {}, wrong: -1, wrongT: 0, rev: {}, tube: newTube(32, 104), sel: -1 };
  const hyKey = (h, g) => h + '-' + g;
  const hyN = () => Object.keys(S.hy.done).filter((k) => S.hy.done[k]).length;
  const HYG = PHONE
    ? { top: { x: 8, y: 8, w: 464, h: 150 }, cardY: 196, cardH: 300, cw: 148, cx: [8, 166, 324], mw: 112 }
    : { top: { x: 14, y: 14, w: 772, h: 130 }, cardY: 186, cardH: 262, cw: 244, cx: [14, 278, 542], mw: 176 };
  const hyCard = (k) => ({ x: HYG.cx[k], y: HYG.cardY, w: HYG.cw, h: HYG.cardH });
  function hySet(h, g) { const y = S.hy; if (h != null) y.h = h; if (g != null) y.g = g; y.sel = -1; y.wrong = -1; Sound.click(); updateCtl(); }
  function hyPick(k) {
    const y = S.hy, key = hyKey(y.h, y.g), perm = PERM[y.h][y.g];
    if (y.done[key]) return;
    y.sel = k;
    if (perm[k] === y.h) { y.done[key] = true; y.rev[key] = 0; Sound.success(); const c = hyCard(k); parts.burst(c.x + c.w / 2, c.y + c.h / 2, { count: 22, speed: 200, colors: [OLD, NEW, '#16a34a', '#fff'] }); }
    else { y.wrong = k; y.wrongT = 1; Sound.fail(); }
    updateCtl();
  }
  function hyDraw(dt, t) {
    const y = S.hy, G = HYG, key = hyKey(y.h, y.g), perm = PERM[y.h][y.g], done = !!y.done[key];
    y.wrongT = Math.max(0, y.wrongT - dt * 1.3);
    // 위쪽 설명 칸
    panel(G.top.x, G.top.y, G.top.w, G.top.h, 16, '#fff');
    T(G.top.x + 16, G.top.y + 28, '원래 DNA', L(16, 14.5), '#14532d', 'left', 800);
    molecule(G.top.x + L(110, 100), G.top.y + L(76, 70), L(160, 130), { a: 1, b: 1 });
    T(G.top.x + L(110, 100), G.top.y + L(112, 108), '파랑 = 원래 가닥', 13, OLD, 'center', 800);
    T(G.top.x + L(110, 100), G.top.y + L(130, 128), '빨강 = 새 가닥', 13, NEW, 'center', 800);
    const tx = G.top.x + L(230, 210), tw = G.top.w - L(230, 210) - (PHONE ? 16 : 120);
    D.label(tx, G.top.y + 28, HYP[y.h].n, { bg: ['#7c3aed', '#16a34a', '#d97706'][y.h], size: L(15, 13.5), align: 'left' });
    textBlock(tx, G.top.y + 58, tw, HYP[y.h].rule, L(15.5, 13), '#26324a', L(21, 18), 800);
    textBlock(tx, G.top.y + (PHONE ? 118 : 106), tw, '복제 ' + y.g + '회 뒤에는 DNA가 ' + Math.pow(2, y.g) + '개가 돼요.', L(14, 12.5), '#475569', 18, 700);
    // 밀도 띠로 바꾸기 (오른쪽 위 작은 튜브)
    if (!PHONE) {
      const tb = y.tube, bx = G.top.x + G.top.w - 70, top = G.top.y + 8;
      tubeUpdate(tb, top, done ? bandsOf(hypMols(y.h, y.g)) : [], dt);
      drawTube(tb, bx, top, {});
      T(bx, G.top.y + G.top.h - 4, done ? '밀도 띠' : '밀도 띠 ?', 12, '#64748b', 'center', 800);
    }
    // 그림 카드 3장
    T(VW / 2, G.cardY - 14, '복제 ' + y.g + '회 뒤, ' + HYP[y.h].n + '의 결과는 어느 그림일까요?', L(17, 14), '#26324a', 'center', 800);
    for (let k = 0; k < 3; k++) {
      const c = hyCard(k), hh = perm[k], mols = hypMols(hh, y.g);
      const isDone = done && hh === y.h, bad = y.wrong === k && y.wrongT > 0 && !done, sh = bad && !RM ? Math.sin(clock * 55) * 5 * y.wrongT : 0;
      D.shadow(() => { rr(c.x + sh, c.y, c.w, c.h, 16); ctx.fillStyle = isDone ? '#ecfdf5' : bad ? '#fef2f2' : '#fff'; ctx.fill(); }, { blur: 8, y: 2 });
      ctx.strokeStyle = isDone ? '#16a34a' : bad ? '#dc2626' : y.sel === k && !done ? '#f59e0b' : '#cbd5e1'; ctx.lineWidth = isDone || bad || y.sel === k ? 3.5 : 2; rr(c.x + sh, c.y, c.w, c.h, 16); ctx.stroke();
      D.label(c.x + 30 + sh, c.y + 24, '그림 ' + 'ABC'[k], { bg: isDone ? '#16a34a' : '#475569', size: 13.5 });
      const n = mols.length, rowH = Math.min(52, (c.h - 70) / n), y0 = c.y + 56 + ((c.h - 70) - rowH * n) / 2 + rowH / 2;
      const rev = isDone ? ease.outCubic(clamp(y.rev[key] = approach(y.rev[key] == null ? 1 : y.rev[key], 1, dt, 2.5), 0, 1)) : 1;
      mols.forEach((m, i) => molecule(c.x + c.w / 2 + sh, lerp(c.y + 30, y0 + i * rowH, rev), G.mw, m, { alpha: rev, s: lerp(0.5, 1, rev) }));
      if (isDone) D.check(c.x + c.w - 26, c.y + 26, 13, 1);
      if (done && !isDone) ctx.globalAlpha = 1;
    }
    // 아래 안내
    const ry = G.cardY + G.cardH + L(30, 26);
    if (done) D.label(VW / 2, ry, '✔ ' + HYP[y.h].n + '의 복제 ' + y.g + '회 결과예요 (예측 ' + hyN() + ' / 6)', { bg: '#15803d', size: L(15, 13) });
    else T(VW / 2, ry, '예측 ' + hyN() + ' / 6 완료', L(15, 13.5), '#64748b', 'center', 800);
  }
  const hyPT = {
    down(p) { for (let k = 0; k < 3; k++) if (inRect(p.x, p.y, hyCard(k))) { hyPick(k); return false; } return false; },
    hover(p) { return [0, 1, 2].some((k) => inRect(p.x, p.y, hyCard(k))) ? 'pointer' : 'default'; },
  };

  /* =========================================================
     ② 밀도 띠 (메셀슨 · 스탈 실험)
     ========================================================= */
  S.tb = { n: 0, seen: { 0: true }, tubes: [newTube(52, 250), newTube(46, 250), newTube(46, 250), newTube(46, 250)], calcOn: false, ok3: false, ok4: false, cells: 0 };
  const TBG = PHONE
    ? { flask: { x: 8, y: 8, w: 464, h: 150 }, tubesY: 178, tx: [104, 192, 280, 368], tubeH: 200, table: { x: 8, y: 424, w: 464, h: 210 } }
    : { flask: { x: 14, y: 14, w: 204, h: 532 }, tubesY: 70, tx: [296, 386, 476, 566], tubeH: 250, table: { x: 612, y: 14, w: 176, h: 532 } };
  const tbName = ['실험 결과', '보존적 예측', '반보존적 예측', '분산적 예측'];
  function tbExp(n) { return bandsOf(hypMols(1, n === 0 ? 0 : n)); }
  function tbPred(h, n) { return bandsOf(hypMols(h, n)); }
  /* n = 0 일 때 분자 하나(무거운 DNA)만 있도록 */
  const _hm = hypMols;
  function tbBands(h, n) { if (n === 0) return [{ d: DH, a: 1 }]; return bandsOf(_hm(h, n)); }
  function tbMatch(h, n) { return sigOf(tbBands(h, n)) === sigOf(tbBands(1, n)); }
  const tbSeenN = () => [0, 1, 2, 3, 4].filter((v) => S.tb.seen[v]).length;
  function tbSet(n) { S.tb.n = n; S.tb.seen[n] = true; S.tb.cells = 0; updateCtl(); }
  function tbCounts(n) { const tot = Math.pow(2, n); return n === 0 ? { tot: 1, mid: 0, light: 0, heavy: 1 } : { tot, mid: 2, light: tot - 2, heavy: 0 }; }
  function tbDraw(dt, t) {
    const b = S.tb, G = TBG, n = b.n;
    b.cells = approach(b.cells, 1, dt, 2.2);
    // 배양 플라스크 칸
    const F = G.flask; panel(F.x, F.y, F.w, F.h, 16, '#fff');
    TF(F.x + 14, F.y + 26, '대장균 배양', F.w - 28, L(16, 14.5), 11, '#14532d', 'left', 800);
    const fy = F.y + L(54, 40), fh = L(100, 56), fw = L(88, 64);
    const flask = (cx, cy, col, label, sub, cells, dark) => {
      ctx.save(); ctx.translate(cx, cy);
      const wid = fw, hh = fh;
      ctx.beginPath(); ctx.moveTo(-wid * 0.2, -hh / 2); ctx.lineTo(-wid * 0.2, -hh * 0.18); ctx.lineTo(-wid / 2, hh / 2 - 6); ctx.quadraticCurveTo(-wid / 2, hh / 2, -wid * 0.4, hh / 2); ctx.lineTo(wid * 0.4, hh / 2); ctx.quadraticCurveTo(wid / 2, hh / 2, wid / 2, hh / 2 - 6); ctx.lineTo(wid * 0.2, -hh * 0.18); ctx.lineTo(wid * 0.2, -hh / 2); ctx.closePath();
      ctx.fillStyle = col; D.shadow(() => ctx.fill(), { blur: 5, y: 2 }); ctx.strokeStyle = '#475569'; ctx.lineWidth = 2.5; ctx.stroke();
      ctx.save(); ctx.clip();
      for (let i = 0; i < cells; i++) { const px = ((i * 37) % 60 - 30) / 60 * wid * 0.62, py = hh * 0.12 + ((i * 53) % 50 - 10) / 50 * hh * 0.28; ctx.fillStyle = dark ? '#dbeafe' : '#fef3c7'; ctx.beginPath(); ctx.ellipse(px, py, 4.5, 2.6, i, 0, TAU); ctx.fill(); }
      ctx.restore(); ctx.restore();
      T(cx, cy + hh / 2 + 18, label, L(14.5, 12.5), '#1f2d44', 'center', 800);
      T(cx, cy + hh / 2 + 36, sub, L(12.5, 11.5), '#64748b', 'center', 700);
    };
    const c1x = PHONE ? F.x + 70 : F.x + F.w / 2, c1y = fy + fh / 2;
    flask(c1x, c1y, 'rgba(37,99,235,.55)', '¹⁵N 배지 (무거운 질소)', PHONE ? 'DNA 모두 무거움' : '여러 세대 키움 → DNA 모두 무거움', 12, true);
    const c2x = PHONE ? F.x + F.w - 150 : F.x + F.w / 2, c2y = PHONE ? fy + fh / 2 : fy + fh / 2 + 190;
    flask(c2x, c2y, 'rgba(250,204,21,.28)', '¹⁴N 배지 (가벼운 질소)', n === 0 ? '아직 옮기기 전 (0회)' : n + '회 복제 뒤 (' + n + '세대)', Math.min(16, Math.pow(2, n) * 2), false);
    D.arrow(PHONE ? F.x + 150 : F.x + F.w / 2, PHONE ? c1y : c1y + fh / 2 + 46, PHONE ? F.x + F.w - 224 : F.x + F.w / 2, PHONE ? c1y : c2y - fh / 2 - 8, { color: '#64748b', width: 3, head: 11 });
    if (!PHONE) T(F.x + F.w / 2 + 12, c1y + fh / 2 + 76, '옮겨 키워요', 13, '#64748b', 'left', 800);
    if (!PHONE) {
      textBlock(F.x + 14, F.y + F.h - 128, F.w - 28, 'CsCl 용액에서 초원심 분리하면 DNA가 밀도에 따라 띠를 이뤄요.', 13, '#475569', 18, 700);
      T(F.x + 14, F.y + F.h - 70, '띠의 밀도 (g/cm³)', 13, '#14532d', 'left', 800);
      [['1.710', '가벼운 ¹⁴N/¹⁴N'], ['1.717', '중간 ¹⁵N/¹⁴N'], ['1.724', '무거운 ¹⁵N/¹⁵N']].forEach((q, i) => T(F.x + 14, F.y + F.h - 48 + i * 18, q[0] + '  ' + q[1], 13, '#334155', 'left', 700));
    }
    // 튜브들
    const expBands = tbBands(1, n);
    b.tubes.forEach((tb, i) => {
      const x = G.tx[i], bands = i === 0 ? expBands : tbBands(i - 1, n);
      tb.h = G.tubeH; tb.w = i === 0 ? 52 : 46;
      tubeUpdate(tb, G.tubesY, bands, dt);
      drawTube(tb, x, G.tubesY, {});
      TF(x, G.tubesY + G.tubeH + 22, tbName[i], 88, L(14, 12.5), 10.5, i === 0 ? '#6d28d9' : '#26324a', 'center', 800);
      if (i > 0) {
        const ok = tbMatch(i - 1, n);
        ctx.save(); D.label(x, G.tubesY - 12, ok ? '✔ 일치' : '✖ 불일치', { bg: ok ? '#16a34a' : '#dc2626', size: 12.5, pad: 6 }); ctx.restore();
      } else D.label(x, G.tubesY - 12, 'UV 사진', { bg: '#6d28d9', size: 12.5, pad: 6 });
    });
    // 밀도 눈금 (실험 튜브 옆)
    const ax = G.tx[0] - 26;
    [[DL, '1.710'], [DM, '1.717'], [DH, '1.724']].forEach((q) => {
      const y = tubeY(G.tubesY, G.tubeH, q[0]);
      ctx.strokeStyle = '#64748b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ax - 8, y); ctx.lineTo(ax, y); ctx.stroke();
      T(ax - 11, y + 5, q[1], 12.5, '#475569', 'right', 800);
    });
    if (PHONE) T(VW / 2, G.tubesY + G.tubeH + 46, '밀도(g/cm³): 가벼운 1.710 · 중간 1.717 · 무거운 1.724', 12.5, '#475569', 'center', 700);
    // 밀도 눈금 글자: 오른쪽 아래 작은 범례
    if (!PHONE) { /* 범례는 표 칸에 */ }
    // 표
    const Q = G.table; panel(Q.x, Q.y, Q.w, Q.h, 16, '#fff');
    TF(Q.x + 12, Q.y + 26, '세대별 띠와 DNA', Q.w - 24, L(15, 14), 11, '#14532d', 'left', 800);
    const rows = [0, 1, 2, 3, 4], rh = PHONE ? 30 : 46, ry0 = Q.y + 44;
    if (PHONE) { T(Q.x + 40, ry0 + 4, '복제', 12.5, '#64748b', 'center', 800); T(Q.x + 118, ry0 + 4, 'DNA 수', 12.5, '#64748b', 'center', 800); T(Q.x + 250, ry0 + 4, '띠 (중간 : 가벼운)', 12.5, '#64748b', 'center', 800); }
    rows.forEach((r, i) => {
      const y = ry0 + (PHONE ? 12 : 8) + i * rh, on = r === n, c = tbCounts(r);
      ctx.fillStyle = on ? 'rgba(124,58,237,.14)' : i % 2 ? '#f8fafc' : '#f1f5f9'; rr(Q.x + 8, y, Q.w - 16, rh - 4, 8); ctx.fill();
      if (on) { ctx.strokeStyle = '#7c3aed'; ctx.lineWidth = 2; rr(Q.x + 8, y, Q.w - 16, rh - 4, 8); ctx.stroke(); }
      const seen = !!b.seen[r];
      if (PHONE) {
        T(Q.x + 40, y + (rh - 4) / 2 + 5, r + '회', 14, '#26324a', 'center', 800);
        T(Q.x + 118, y + (rh - 4) / 2 + 5, c.tot + '개', 14, '#26324a', 'center', 800);
        TF(Q.x + 300, y + (rh - 4) / 2 + 5, seen ? tbRatioText(r) : '?', 280, 14, 11, seen ? '#6d28d9' : '#94a3b8', 'center', 800);
      } else {
        T(Q.x + 18, y + 20, r + '회 복제 · DNA ' + c.tot + '개', 14, '#26324a', 'left', 800);
        TF(Q.x + 18, y + 38, seen ? tbRatioText(r) : '? (직접 확인)', Q.w - 30, 13.5, 11, seen ? '#6d28d9' : '#94a3b8', 'left', 800);
      }
    });
    if (!PHONE) {
      textBlock(Q.x + 14, ry0 + 8 + 5 * rh + 14, Q.w - 28, '어느 세대에서도 ¹⁵N을 가진 가닥은 2개로 일정해요.', 13.5, '#475569', 18, 700);
    }
  }
  function tbRatioText(r) {
    const c = tbCounts(r);
    if (r === 0) return '무거운 띠 1개';
    if (r === 1) return '중간 띠 1개만';
    if (r === 2) return '중간 : 가벼운 = 1 : 1';
    const known = r === 2 || (r === 3 && S.tb.ok3) || (r === 4 && S.tb.ok4);
    return known ? '중간 : 가벼운 = ' + c.mid + ' : ' + c.light + ' = 1 : ' + c.light / 2 : '중간 : 가벼운 = 2 : ?';
  }

  /* =========================================================
     연결하기 도우미 (끌어서 선 잇기, 눌러서 고른 뒤 눌러 잇기)
     o.left, o.right: [{id, t, sub}]   o.rect(side, i)   o.ans: {leftId: rightId}
     ========================================================= */
  function Matcher(o) { this.o = o; this.links = {}; this.sel = -1; this.drag = null; this.tt = {}; this.flag = null; }
  Matcher.prototype.count = function () { return Object.keys(this.links).length; };
  Matcher.prototype.wrong = function () { return Object.keys(this.links).filter((i) => this.o.ans[this.o.left[i].id] !== this.o.right[this.links[i]].id).map(Number); };
  Matcher.prototype.reset = function () { this.links = {}; this.sel = -1; this.drag = null; this.tt = {}; this.flag = null; this.o.onChange && this.o.onChange(); };
  Matcher.prototype.link = function (i, q) {
    Object.keys(this.links).forEach((k) => { if (this.links[k] === q) { delete this.links[k]; delete this.tt['l' + k]; } });
    this.links[i] = q; delete this.tt['l' + i]; this.sel = -1; this.flag = null; Sound.click(); this.o.onChange && this.o.onChange();
  };
  Matcher.prototype.down = function (p) {
    const o = this.o;
    for (let i = 0; i < o.left.length; i++) if (inRect(p.x, p.y, o.rect(0, i))) { this.drag = { i, x: p.x, y: p.y, sx: p.x, sy: p.y, moved: false }; Sound.tick(); return true; }
    for (let q = 0; q < o.right.length; q++) if (inRect(p.x, p.y, o.rect(1, q)) && this.sel >= 0) { this.link(this.sel, q); return false; }
    return false;
  };
  Matcher.prototype.move = function (p) { const d = this.drag; if (!d) return; d.x = p.x; d.y = p.y; if (Math.hypot(p.x - d.sx, p.y - d.sy) > 8) d.moved = true; };
  Matcher.prototype.up = function (p) {
    const d = this.drag; if (!d) return; this.drag = null;
    if (!d.moved) { this.sel = this.sel === d.i ? -1 : d.i; return; }
    for (let q = 0; q < this.o.right.length; q++) if (inRect(p.x, p.y, this.o.rect(1, q))) { this.link(d.i, q); return; }
  };
  Matcher.prototype.hover = function (p) { return this.o.left.some((l, i) => inRect(p.x, p.y, this.o.rect(0, i))) ? 'grab' : 'default'; };
  Matcher.prototype.draw = function (dt) {
    const o = this.o;
    Object.keys(this.links).forEach((i) => {
      const a = o.rect(0, +i), b = o.rect(1, this.links[i]), key = 'l' + i;
      this.tt[key] = RM ? 1 : approach(this.tt[key] == null ? 0 : this.tt[key], 1, dt, 6);
      const p = this.tt[key], x1 = a.x + a.w, y1 = a.y + a.h / 2, x2 = b.x, y2 = b.y + b.h / 2, bad = this.flag && this.flag[i];
      ctx.strokeStyle = bad ? '#dc2626' : '#16a34a'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.bezierCurveTo(x1 + 30, y1, x2 - 30, y2, x1 + (x2 - x1) * p, y1 + (y2 - y1) * p); ctx.stroke();
    });
    if (this.drag) { const a = o.rect(0, this.drag.i); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 3; ctx.setLineDash([6, 5]); ctx.beginPath(); ctx.moveTo(a.x + a.w, a.y + a.h / 2); ctx.lineTo(this.drag.x, this.drag.y); ctx.stroke(); ctx.setLineDash([]); }
    o.left.forEach((it, i) => {
      const r = o.rect(0, i), on = this.sel === i, linked = this.links[i] != null, bad = this.flag && this.flag[i];
      D.shadow(() => { rr(r.x, r.y, r.w, r.h, 12); ctx.fillStyle = on ? '#fff8dc' : '#fff'; ctx.fill(); }, { blur: 5, y: 2 });
      ctx.strokeStyle = bad ? '#dc2626' : on ? '#f59e0b' : linked ? '#16a34a' : '#7c8dc4'; ctx.lineWidth = on || linked ? 3 : 2; rr(r.x, r.y, r.w, r.h, 12); ctx.stroke();
      if (it.sub) { TF(r.x + 12, r.y + r.h / 2 - 4, it.t, r.w - 24, o.fs || 15, 11, '#26324a', 'left', 800); textBlock(r.x + 12, r.y + r.h / 2 + 14, r.w - 24, it.sub, (o.fs || 15) - 2.5, '#64748b', 15, 700); }
      else { const ls = wrap(it.t, r.w - 22, o.fs || 14.5, 800); const lh = (o.fs || 14.5) + 5; ls.forEach((s, k) => T(r.x + 12, r.y + r.h / 2 - (ls.length - 1) * lh / 2 + 5 + k * lh, s, o.fs || 14.5, '#26324a', 'left', 800)); }
    });
    o.right.forEach((it, q) => {
      const r = o.rect(1, q), linked = Object.values(this.links).indexOf(q) >= 0, hot = this.drag && inRect(this.drag.x, this.drag.y, r);
      D.shadow(() => { rr(r.x, r.y, r.w, r.h, 12); ctx.fillStyle = hot ? '#ecfdf5' : '#fff'; ctx.fill(); }, { blur: 5, y: 2 });
      ctx.strokeStyle = hot || linked ? '#16a34a' : '#cbd5e1'; ctx.lineWidth = hot || linked ? 3 : 2; rr(r.x, r.y, r.w, r.h, 12); ctx.stroke();
      const ls = wrap(it.t, r.w - 22, o.fs2 || 13.5, 800); const lh = (o.fs2 || 13.5) + 4.5;
      ls.forEach((s, k) => T(r.x + 11, r.y + r.h / 2 - (ls.length - 1) * lh / 2 + 5 + k * lh, s, o.fs2 || 13.5, '#26324a', 'left', 800));
    });
  };

  /* =========================================================
     ③ 새 가닥 만들기 (복제 모의: 헬리케이스로 풀고 중합 효소가 새 뉴클레오타이드 연결)
     ========================================================= */
  const BD_TOP = 'ATGCCG', BD_BOT = BD_TOP.split('').map((c) => COMP[c]).join('');
  const BDG = PHONE
    ? { x0: 56, dx: 72, bw: 56, bh: 40, cT: 232, cB: 272, oT: 130, oB: 360, gap: 56, trayY: 500, trayX: [76, 188, 300, 412], tw: 64 }
    : { x0: 150, dx: 100, bw: 70, bh: 42, cT: 226, cB: 268, oT: 130, oB: 340, gap: 58, trayY: 486, trayX: [280, 410, 540, 670], tw: 76 };
  S.bd = { open: false, prog: 0, s1: BD_TOP.split('').map(() => null), s2: BD_TOP.split('').map(() => null), sel: null, drag: null, msg: '', msgT: 0, fly: [], fin: 0 };
  const bdU = (i) => clamp((S.bd.prog * 8 - i) / 2, 0, 1);
  const bdYT = (i) => lerp(BDG.cT, BDG.oT, ease.inOutCubic(bdU(i)));
  const bdYB = (i) => lerp(BDG.cB, BDG.oB, ease.inOutCubic(bdU(i)));
  const bdX = (i) => BDG.x0 + i * BDG.dx;
  const bdCount = () => S.bd.s1.filter(Boolean).length + S.bd.s2.filter(Boolean).length;
  const bdOpened = () => S.bd.prog >= 0.995;
  function bdSlot(row, i) { // row 1: 위쪽 가닥(주형)의 새 가닥, row 2: 아래쪽 가닥(주형)의 새 가닥
    const f = ease.inOutCubic(S.bd.fin);
    const sh = 34 * f;
    return row === 1 ? { x: bdX(i), y: lerp(bdYT(i) + BDG.gap, bdYT(i) + BDG.bh + 2, f) - sh } : { x: bdX(i), y: lerp(bdYB(i) - BDG.gap, bdYB(i) - BDG.bh - 2, f) + sh };
  }
  function bdBlock(x, y, b, o) {
    o = o || {};
    const w = BDG.bw * (o.s || 1), h = BDG.bh * (o.s || 1);
    ctx.save(); ctx.globalAlpha = o.alpha == null ? 1 : o.alpha;
    D.shadow(() => { const g = ctx.createLinearGradient(0, y - h / 2, 0, y + h / 2); g.addColorStop(0, C.shade(BC[b], 0.28)); g.addColorStop(1, C.shade(BC[b], -0.12)); rr(x - w / 2, y - h / 2, w, h, 10); ctx.fillStyle = g; ctx.fill(); }, { blur: o.lift ? 12 : 4, y: o.lift ? 6 : 2 });
    ctx.strokeStyle = o.edge || C.shade(BC[b], -0.4); ctx.lineWidth = o.edge ? 3.5 : 2; rr(x - w / 2, y - h / 2, w, h, 10); ctx.stroke();
    T(x, y + 7, b, 22 * (o.s || 1), BT[b], 'center', 800);
    ctx.restore();
  }
  function bdOpenGo() { if (S.bd.open) return; S.bd.open = true; Sound.click(); updateCtl(); }
  function bdReset() { S.bd = { open: false, prog: 0, s1: BD_TOP.split('').map(() => null), s2: BD_TOP.split('').map(() => null), sel: null, drag: null, msg: '', msgT: 0, fly: [], fin: 0 }; updateCtl(); }
  function bdPlace(row, i, b) {
    const d = S.bd, tmpl = row === 1 ? BD_TOP[i] : BD_BOT[i], arr = row === 1 ? d.s1 : d.s2;
    if (arr[i]) return;
    const sl = bdSlot(row, i);
    if (COMP[tmpl] === b) {
      arr[i] = { b, t: RM ? 1 : 0 }; d.sel = null; d.msg = ''; Sound.success(); parts.burst(sl.x, sl.y, { count: 12, speed: 120, colors: [BC[b], '#fff', NEW] });
      if (bdCount() === 12) { Sound.level(); d.msg = ''; }
    } else {
      d.fly.push({ b, x: sl.x, y: sl.y, t: 0 });
      d.msg = (b === 'A' || b === 'G' ? '퓨린' : '피리미딘') + ' ' + b + '은(는) 주형의 ' + tmpl + '와 짝이 아니라서 튕겨 나가요 (교정)'; d.msgT = 3.2; d.sel = null; Sound.fail();
    }
    updateCtl();
  }
  function bdDraw(dt, t) {
    const d = S.bd, G = BDG;
    if (d.open) d.prog = RM ? 1 : Math.min(1, d.prog + dt / 2.6);
    d.msgT = Math.max(0, d.msgT - dt);
    d.fin = approach(d.fin, bdCount() === 12 ? 1 : 0, dt, 2.2); if (Math.abs(d.fin - (bdCount() === 12 ? 1 : 0)) < 0.003) d.fin = bdCount() === 12 ? 1 : 0;
    [d.s1, d.s2].forEach((a) => a.forEach((s) => { if (s) s.t = RM ? 1 : approach(s.t, 1, dt, 8); }));
    T(VW / 2, PHONE ? 28 : 36, '복제 모의: 주형 가닥에 맞춰 새 가닥을 만들어요', L(20, 15.5), '#14532d', 'center', 800);
    const n = BD_TOP.length, f = ease.inOutCubic(d.fin);
    // 뼈대 (주형 가닥) : 파랑
    for (const row of [1, 2]) {
      ctx.strokeStyle = OLD; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath();
      for (let i = 0; i < n; i++) { const y = (row === 1 ? bdYT(i) - G.bh / 2 - 6 : bdYB(i) + G.bh / 2 + 6) + (row === 1 ? -34 * f : 34 * f); i ? ctx.lineTo(bdX(i), y) : ctx.moveTo(bdX(i), y); }
      ctx.stroke();
    }
    // 새 가닥 뼈대 : 빨강 (놓은 만큼)
    for (const row of [1, 2]) {
      const arr = row === 1 ? d.s1 : d.s2;
      ctx.strokeStyle = NEW; ctx.lineWidth = 6; ctx.lineCap = 'round';
      for (let i = 0; i + 1 < n; i++) if (arr[i] && arr[i + 1]) { const a = bdSlot(row, i), b = bdSlot(row, i + 1); ctx.beginPath(); ctx.moveTo(a.x, a.y + (row === 1 ? G.bh / 2 + 6 : -G.bh / 2 - 6)); ctx.lineTo(b.x, b.y + (row === 1 ? G.bh / 2 + 6 : -G.bh / 2 - 6)); ctx.stroke(); }
    }
    // 주형 블록과 수소 결합
    for (let i = 0; i < n; i++) {
      const yt = bdYT(i) - 34 * f, yb = bdYB(i) + 34 * f, x = bdX(i);
      const closed = bdU(i) < 0.02;
      if (closed) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; const nb = BD_TOP[i] === 'A' || BD_TOP[i] === 'T' ? 2 : 3; for (let q = 0; q < nb; q++) { const xx = x + (q - (nb - 1) / 2) * 11; ctx.beginPath(); ctx.moveTo(xx, yt + G.bh / 2 - 3); ctx.lineTo(xx, yt + G.bh / 2 + 3); ctx.stroke(); } }
      bdBlock(x, yt, BD_TOP[i], { edge: OLD }); bdBlock(x, yb, BD_BOT[i], { edge: OLD });
      // 새 가닥과의 수소 결합
      [[1, d.s1[i], yt], [2, d.s2[i], yb]].forEach((q) => {
        if (!q[1]) return;
        const sl = bdSlot(q[0], i), nb = (BD_TOP[i] === 'A' || BD_TOP[i] === 'T') ? 2 : 3;
        const y0 = Math.min(q[2], sl.y) + G.bh / 2, y1 = Math.max(q[2], sl.y) - G.bh / 2;
        if (y1 - y0 > 3) { ctx.strokeStyle = '#64748b'; ctx.lineWidth = 2.5; ctx.setLineDash([3, 3]); for (let k = 0; k < nb; k++) { const xx = x + (k - (nb - 1) / 2) * 11; ctx.beginPath(); ctx.moveTo(xx, y0); ctx.lineTo(xx, y1); ctx.stroke(); } ctx.setLineDash([]); }
      });
    }
    // 빈 자리와 새 뉴클레오타이드
    for (const row of [1, 2]) for (let i = 0; i < n; i++) {
      const u = bdU(i), sl = bdSlot(row, i), s = (row === 1 ? d.s1 : d.s2)[i];
      if (s) { const te = ease.outBack(clamp(s.t, 0, 1)); bdBlock(sl.x, sl.y - (1 - te) * (row === 1 ? 26 : -26), s.b, { edge: NEW, alpha: clamp(s.t * 1.6, 0, 1) }); continue; }
      if (u < 0.95) continue;
      const hot = d.sel || (d.drag && d.drag.moved);
      ctx.save(); ctx.setLineDash([6, 5]); ctx.strokeStyle = hot ? '#16a34a' : 'rgba(100,116,139,.6)'; ctx.lineWidth = hot ? 3 : 2; rr(sl.x - G.bw / 2, sl.y - G.bh / 2, G.bw, G.bh, 10); ctx.stroke(); ctx.restore();
      if (hot) D.ring(sl.x, sl.y, G.bw * 0.5, t + i * 0.12, { color: '#16a34a', speed: 0.9, width: 2 });
    }
    // 헬리케이스 (풀리는 위치)
    if (d.open && d.prog < 0.995) { const hx = bdX(0) + d.prog * (n + 1) * G.dx - G.dx; D.label(hx, (G.cT + G.cB) / 2, '헬리케이스', { bg: '#ea580c', size: 13 }); }
    if (!d.open) D.label(VW / 2, (G.cT + G.cB) / 2 - (PHONE ? 70 : 90), '① 헬리케이스로 풀기 단추를 눌러요', { bg: '#475569', size: L(14.5, 13) });
    else if (bdOpened() && bdCount() === 0) T(VW / 2, (G.oT + G.oB) / 2 + 6, '파랑 주형 가닥마다 짝이 맞는 새 뉴클레오타이드를 이어 붙여요', L(15, 12.5), '#475569', 'center', 800);
    // 라벨
    T(VW / 2, PHONE ? 50 : 60, '파랑 테두리 = 주형(원래) 가닥 · 빨강 테두리 = 새 가닥', L(14.5, 12.5), '#64748b', 'center', 800);
    // 날아와서 튕겨 나가는 잘못된 염기
    d.fly = d.fly.filter((q) => { q.t += dt / 1.0; return q.t < 1; });
    d.fly.forEach((q) => {
      const tray = G.trayX[BASES.indexOf(q.b)], p = q.t < 0.45 ? q.t / 0.45 : 1 - (q.t - 0.45) / 0.55;
      const x = lerp(tray, q.x, ease.outCubic(clamp(p, 0, 1))) + (q.t > 0.45 ? (q.t - 0.45) * 80 : 0), y = lerp(G.trayY, q.y, ease.outCubic(clamp(p, 0, 1))) + (q.t > 0.45 ? -(q.t - 0.45) * 90 : 0);
      bdBlock(x, y, q.b, { alpha: q.t < 0.45 ? 1 : 1 - (q.t - 0.45) / 0.55, s: 0.9 });
      if (q.t > 0.4) T(q.x + 4, q.y - G.bh / 2 - 6, '✖', 22, '#dc2626', 'center', 800, { alpha: 1 - q.t });
    });
    // 보관함
    const px = PHONE ? 8 : 190, pw = PHONE ? 464 : 580, py = G.trayY - 52, ph = 104;
    panel(px, py, pw, ph, 16, '#fff');
    T(px + pw / 2, py + 20, '새 뉴클레오타이드 (끌어서 또는 눌러서 놓아요)', L(14, 12.5), '#475569', 'center', 800);
    BASES.forEach((b, k) => {
      const x = G.trayX[k], dragging = d.drag && d.drag.b === b && d.drag.moved;
      if (!dragging) { bdBlock(x, G.trayY + 8, b, { s: 1.1 }); if (d.sel === b) D.ring(x, G.trayY + 8, 40, t, { color: '#f59e0b', speed: 1, width: 3 }); }
      else bdBlock(x, G.trayY + 8, b, { s: 1.1, alpha: 0.25 });
    });
    if (d.drag && d.drag.moved) bdBlock(d.drag.x, d.drag.y, d.drag.b, { s: 1.15, lift: true });
    // 메시지 · 결과
    if (d.msgT > 0 && d.msg) textBlock(VW / 2, G.trayY - 74, 500, d.msg, L(14, 12.5), '#b91c1c', 18, 800, 'center');
    if (bdCount() === 12 && d.fin > 0.8) {
      const dy = 34;
      D.label(VW / 2, (G.cT + G.cB) / 2 - 2, '딸 DNA 2개: 원래 가닥(파랑) 1 + 새 가닥(빨강) 1', { bg: '#15803d', size: L(15, 13) });
    }
    T(PHONE ? 12 : 26, PHONE ? 626 : 548, '완성한 새 뉴클레오타이드 ' + bdCount() + ' / 12', 13.5, '#64748b', 'left', 800);
  }
  const bdPT = {
    down(p) {
      const d = S.bd;
      for (const b of BASES) { const x = BDG.trayX[BASES.indexOf(b)]; if (Math.abs(p.x - x) <= BDG.tw / 2 + 4 && Math.abs(p.y - (BDG.trayY + 8)) <= 30) { d.drag = { b, x: p.x, y: p.y, sx: p.x, sy: p.y, moved: false }; Sound.tick(); return true; } }
      if (d.sel) { const tg = bdTarget(p); if (tg) { bdPlace(tg.row, tg.i, d.sel); return false; } }
      return false;
    },
    move(p) { const d = S.bd.drag; if (!d) return; d.x = p.x; d.y = p.y; if (Math.hypot(p.x - d.sx, p.y - d.sy) > 8) d.moved = true; },
    up(p) {
      const d = S.bd, g = d.drag; if (!g) return; d.drag = null;
      if (!bdOpened()) { d.msg = '먼저 ① 헬리케이스로 풀기를 눌러요'; d.msgT = 2.5; return; }
      if (!g.moved) { d.sel = d.sel === g.b ? null : g.b; Sound.click(); return; }
      const tg = bdTarget(p); if (tg) bdPlace(tg.row, tg.i, g.b);
    },
    hover(p) { return BASES.some((b) => Math.abs(p.x - BDG.trayX[BASES.indexOf(b)]) <= BDG.tw / 2 && Math.abs(p.y - (BDG.trayY + 8)) <= 28) ? 'grab' : 'default'; },
  };
  function bdTarget(p) {
    if (!bdOpened()) return null;
    for (const row of [1, 2]) for (let i = 0; i < BD_TOP.length; i++) { const sl = bdSlot(row, i); if (Math.abs(p.x - sl.x) <= BDG.bw / 2 + 8 && Math.abs(p.y - sl.y) <= BDG.bh / 2 + 10) return { row, i }; }
    return null;
  }

  /* =========================================================
     ③ 복제 거품과 효소 (애니메이션 + 용어 연결)
     ========================================================= */
  const FKG = PHONE
    ? { P: { x: 8, y: 8, w: 464, h: 312 }, ox: 240, cy: 150, R: 196, bh: 46, mx: 12, mw: 200, rx: 268, rw: 204, my: 364, mh: 52, mstep: 64 }
    : { P: { x: 14, y: 14, w: 502, h: 532 }, ox: 265, cy: 236, R: 190, bh: 62, mx: 534, mw: 120, rx: 666, rw: 122, my: 70, mh: 96, mstep: 116 };
  const FK_TERMS = [{ id: 'hel', t: '헬리케이스' }, { id: 'pri', t: '프라이머' }, { id: 'pol', t: 'DNA 중합 효소' }, { id: 'lig', t: '연결 효소' }];
  const FK_FUNC = [{ id: 'pri', t: '합성이 시작되는 짧은 가닥' }, { id: 'lig', t: '지연 가닥의 조각을 이어 줌' }, { id: 'hel', t: '이중 가닥을 풀어 줌' }, { id: 'pol', t: '새 뉴클레오타이드를 이어 붙임' }];
  const fkMatcher = new Matcher({
    left: FK_TERMS, right: FK_FUNC, ans: { hel: 'hel', pri: 'pri', pol: 'pol', lig: 'lig' }, fs: 14, fs2: 13,
    rect: (side, i) => (side === 0 ? { x: FKG.mx, y: FKG.my + i * FKG.mstep, w: FKG.mw, h: FKG.mh } : { x: FKG.rx, y: FKG.my + i * FKG.mstep, w: FKG.rw, h: FKG.mh }),
    onChange: () => updateCtl(),
  });
  S.fk = { t: 0 };
  const FK_T = 12, LF = PHONE ? 44 : 48;
  function fkDraw(dt, t) {
    const G = FKG, P = G.P;
    S.fk.t = (S.fk.t + dt) % FK_T;
    const tt = S.fk.t, Rt = G.R * ease.inOutQuad(clamp(tt / 9, 0, 1)), ox = G.ox, cy = G.cy;
    panel(P.x, P.y, P.w, P.h, 16, '#fff');
    T(P.x + 16, P.y + 28, '복제 원점에서 양쪽으로 커지는 복제 거품', L(17, 14), '#14532d', 'left', 800);
    ctx.save(); rr(P.x + 2, P.y + 40, P.w - 4, P.h - 44, 14); ctx.clip();
    const hb = (x) => { const d = Math.abs(x - ox); if (Rt < 6 || d >= Rt) return 3.5; const q = 1 - (d / Rt) * (d / Rt); return Math.max(3.5, G.bh * Math.pow(q, 0.8) * clamp(Rt / 50, 0.2, 1)); };
    const xa = ox - G.R - 24, xb = ox + G.R + 24;
    // 새 가닥 (바깥에서 안쪽으로 그려요): 위쪽 딸 DNA = 위 주형 + 새 가닥
    const newY = (x, up) => (up ? cy - hb(x) + 9 : cy + hb(x) - 9);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    // 연속 합성: 오른쪽 포크의 아래 가닥(선도), 왼쪽 포크의 위 가닥(선도)
    const lead = (dir, up) => {
      const tip = ox + dir * Math.max(0, Rt - 20); if (Rt < 24) return null;
      ctx.strokeStyle = NEW; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(ox, newY(ox, up));
      for (let s = 0; s <= 1.001; s += 0.02) { const x = ox + (tip - ox) * s; ctx.lineTo(x, newY(x, up)); } ctx.stroke();
      return { x: tip, y: newY(tip, up) };
    };
    const tipR = lead(1, false), tipL = lead(-1, true);
    // 불연속 합성: 오른쪽 위, 왼쪽 아래
    const frags = [];
    const lag = (dir, up) => {
      const xf = ox + dir * Rt;
      for (let k = 0; k < 7; k++) {
        const e = ox + dir * LF * (k + 1), s0 = ox + dir * LF * k;
        const g = clamp((Rt - LF * (k + 1) - 16) / 38, 0, 1);
        if (Rt < LF * (k + 1) + 6) continue;
        const pr = 9, xe = e, xs = e - dir * (pr + 2 + g * (LF - pr - 4));
        // 프라이머 (주황)
        ctx.strokeStyle = '#f97316'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(xe, newY(xe, up)); ctx.lineTo(xe - dir * pr, newY(xe - dir * pr, up)); ctx.stroke();
        if (g > 0) { ctx.strokeStyle = NEW; ctx.lineWidth = 5; ctx.beginPath(); const x0 = xe - dir * pr; ctx.moveTo(x0, newY(x0, up)); for (let s = 0; s <= 1.001; s += 0.05) { const x = x0 + (xs - x0) * s; ctx.lineTo(x, newY(x, up)); } ctx.stroke(); }
        frags.push({ k, dir, up, x: xe, y: newY(xe, up), xs, g, ready: g >= 1 });
        // 연결 효소 (이웃 조각이 모두 끝나면 이음)
        if (k > 0 && g >= 1 && Rt > LF * (k + 1) + 16 + 38 + 40) {
          const jx = s0; ctx.strokeStyle = NEW; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(jx, newY(jx, up)); ctx.lineTo(jx + dir * (-1) * 0, newY(jx, up)); ctx.stroke();
          frags.push({ lig: true, x: jx, y: newY(jx, up) });
        }
      }
    };
    lag(1, true); lag(-1, false);
    // 이음 표시(초록 점)
    frags.filter((f) => f.lig).forEach((f) => { ctx.fillStyle = '#16a34a'; ctx.beginPath(); ctx.arc(f.x, f.y, 5.5, 0, TAU); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.6; ctx.stroke(); });
    // 중합 효소 (선도 가닥 끝, 지연 가닥의 자라는 끝)
    const pol = (x, y) => { ctx.save(); ctx.translate(x, y); const g = ctx.createRadialGradient(-3, -4, 1, 0, 0, 14); g.addColorStop(0, '#fde68a'); g.addColorStop(1, '#a855f7'); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, 13, 10, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = '#6b21a8'; ctx.lineWidth = 1.6; ctx.stroke(); ctx.restore(); };
    if (tipR) pol(tipR.x, tipR.y + 1); if (tipL) pol(tipL.x, tipL.y + 1);
    const growing = frags.filter((f) => !f.lig && f.g > 0 && f.g < 1);
    growing.forEach((f) => pol(f.xs, f.y));
    // 주형(원래) 가닥: 파랑
    const strandPoly = (up) => { ctx.strokeStyle = OLD; ctx.lineWidth = 6; ctx.beginPath(); let first = true; for (let x = xa; x <= xb; x += 3) { const y = up ? cy - hb(x) : cy + hb(x); first ? ctx.moveTo(x, y) : ctx.lineTo(x, y); first = false; } ctx.stroke(); };
    strandPoly(true); strandPoly(false);
    // 아직 풀리지 않은 부분의 염기쌍 막대
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2;
    for (let x = xa; x <= xb; x += 12) { if (Math.abs(x - ox) < Rt - 2) continue; ctx.beginPath(); ctx.moveTo(x, cy - 3); ctx.lineTo(x, cy + 3); ctx.stroke(); }
    // 헬리케이스
    [-1, 1].forEach((dir) => { if (Rt < 8) return; const x = ox + dir * Rt; ctx.save(); ctx.translate(x, cy); ctx.fillStyle = '#ea580c'; ctx.beginPath(); ctx.moveTo(dir * 13, 0); ctx.lineTo(-dir * 6, -13); ctx.lineTo(-dir * 6, 13); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#9a3412'; ctx.lineWidth = 1.6; ctx.stroke(); ctx.restore(); });
    D.label(ox, cy + 4, '복제 원점', { bg: '#475569', size: 12.5, pad: 6 });
    ctx.restore();
    // 이름표 (오른쪽 포크)
    const al = clamp((Rt - 90) / 60, 0, 1);
    if (al > 0.02) {
      const xf = ox + Rt, chip = (x, y, s, col, tx, ty) => { ctx.save(); ctx.globalAlpha = al; D.dashedLine(tx, ty, x, y, { color: col, width: 1.6, dash: [4, 3] }); D.label(x, y, s, { bg: col, size: 13, pad: 7 }); ctx.restore(); };
      chip(Math.min(xf - 6, P.x + P.w - 56), cy - 46, '헬리케이스', '#ea580c', xf, cy);
      const lo = G.bh + 30;
      if (tipR) chip(ox - 30, cy + lo, '선도 가닥 (연속 합성)', '#dc2626', tipR.x - 40, newY(tipR.x - 40, false));
      const lf = frags.find((f) => !f.lig && f.dir === 1 && f.g > 0);
      if (lf) chip(ox - 30, cy - G.bh - 34, '지연 가닥 (짧은 조각)', '#dc2626', lf.xs + 6, lf.y);
      if (tipR) chip(ox + 70, cy + lo + 32, 'DNA 중합 효소', '#7e22ce', tipR.x, tipR.y + 8);
      const pf = frags.find((f) => !f.lig && f.dir === 1 && f.up);
      if (pf) chip(ox + 100, cy - G.bh - 66, '프라이머 (주황)', '#c2410c', pf.x - 3, pf.y);
      const lg = frags.find((f) => f.lig && f.x > ox);
      if (lg) chip(ox + 150, cy + lo + 64, '연결 효소 (초록 점)', '#15803d', lg.x, lg.y);
    }
    // 설명
    const ty = P.y + P.h - 112;
    if (!PHONE) textBlock(P.x + 16, ty, P.w - 32, 'DNA 중합 효소는 새 가닥을 한쪽 방향(5′→3′)으로만 이어 붙여요. 그래서 포크를 따라 한쪽(선도 가닥)은 연속으로, 반대쪽(지연 가닥)은 짧은 조각으로 합성되고 연결 효소가 이어요.', L(14.5, 12.5), '#334155', L(21, 17), 700);
    T(P.x + P.w - 14, P.y + P.h - 10, '파랑 = 원래 가닥 · 빨강 = 새 가닥', 12.5, '#64748b', 'right', 800);
    // 연결하기
    if (!PHONE) { panel(526, 14, 262, 532, 16, '#fff'); T(657, 44, '용어 ↔ 하는 일', 16, '#14532d', 'center', 800); }
    else { panel(8, 326, 464, 306, 16, '#fff'); T(240, 346 - 6, '용어 ↔ 하는 일', 14.5, '#14532d', 'center', 800); }
    fkMatcher.draw(dt);
  }
  const fkPT = { down: (p) => fkMatcher.down(p), move: (p) => fkMatcher.move(p), up: (p) => fkMatcher.up(p), hover: (p) => fkMatcher.hover(p) };

  /* =========================================================
     ③ 복제 시간 (대장균 vs 사람)
     ========================================================= */
  const ORIG = [1, 10, 100, 1000, 3000, 10000];
  S.tm = { idx: 0, ecOk: false, u: 0, seen: { 0: true } };
  const hSec = (n) => 6.2e9 / (2 * 50 * n);
  function fmtT(sec) {
    if (sec >= 3.15e7 * 0.9) return '약 ' + (sec / 3.156e7).toFixed(1) + '년';
    if (sec >= 86400 * 2) return '약 ' + Math.round(sec / 86400) + '일';
    if (sec >= 86400 * 0.9) return '약 ' + (sec / 86400).toFixed(1) + '일';
    return '약 ' + (sec / 3600).toFixed(1) + '시간';
  }
  const tmHours = (n) => hSec(n) / 3600;
  const tmFast = () => tmHours(ORIG[S.tm.idx]) <= 8;
  function tmDraw(dt, t) {
    const m = S.tm; m.u = (m.u + dt / 5.5) % 1.3;
    const u = clamp(m.u, 0, 1), n = ORIG[m.idx];
    // 대장균
    const A = PHONE ? { x: 8, y: 8, w: 464, h: 214 } : { x: 14, y: 14, w: 772, h: 214 };
    panel(A.x, A.y, A.w, A.h, 16, '#fff');
    TF(A.x + 16, A.y + 28, '대장균: 고리 DNA 4.6 × 10⁶ 염기쌍, 복제 원점 1개', A.w - 32, L(17, 14), 11, '#14532d', 'left', 800);
    const rx = A.x + L(110, 84), ry = A.y + L(122, 118), rad = L(62, 50);
    ctx.strokeStyle = OLD; ctx.lineWidth = 9; ctx.beginPath(); ctx.arc(rx, ry, rad, 0, TAU); ctx.stroke();
    ctx.strokeStyle = NEW; ctx.lineWidth = 9; ctx.lineCap = 'butt'; ctx.beginPath(); ctx.arc(rx, ry, rad, -Math.PI / 2 - u * Math.PI, -Math.PI / 2 + u * Math.PI); ctx.stroke();
    ctx.fillStyle = '#ea580c'; ctx.beginPath(); ctx.arc(rx, ry - rad, 7, 0, TAU); ctx.fill();
    [-1, 1].forEach((s) => { const a = -Math.PI / 2 + s * u * Math.PI; D.sphere(rx + rad * Math.cos(a), ry + rad * Math.sin(a), 6, '#a855f7', { gloss: false }); });
    T(rx, ry + 5, Math.round(u * 100) + ' %', L(18, 15), '#26324a', 'center', 800);
    T(rx, ry - rad - 14, '원점', 12.5, '#ea580c', 'center', 800);
    const tx = A.x + L(220, 170), tw = A.w - L(220, 170) - 14;
    textBlock(tx, A.y + 62, tw, '포크는 양쪽으로 2개, 포크 하나는 초당 약 1000 염기(예시)', L(15, 13), '#334155', 20, 800);
    textBlock(tx, A.y + 100, tw, '복제 시간 = 4.6 × 10⁶ / (2 × 1000) = ' + (m.ecOk ? '2300초 ≈ 약 38분' : '?'), L(15.5, 13), m.ecOk ? '#15803d' : '#64748b', 20, 800);
    T(tx, A.y + 150, '실제 대장균의 분열 주기와 비슷한 규모예요.', L(13.5, 12), '#94a3b8', 'left', 700);
    // 사람
    const B = PHONE ? { x: 8, y: 232, w: 464, h: 400 } : { x: 14, y: 240, w: 772, h: 306 };
    panel(B.x, B.y, B.w, B.h, 16, '#fff');
    TF(B.x + 16, B.y + 28, '사람: 이배체 약 62억 염기쌍, 복제 원점 ' + fmtN(n) + '개', B.w - 32, L(17, 14), 11, '#14532d', 'left', 800);
    const bx = B.x + 24, bw = B.w - 48, by = B.y + 74, bhh = 26;
    ctx.fillStyle = '#e0e7ff'; rr(bx, by, bw, bhh, 8); ctx.fill();
    const nd = Math.min(n, 40), seg = bw / nd;
    for (let i = 0; i < nd; i++) {
      const cx2 = bx + seg * (i + 0.5), w2 = seg * u;
      ctx.fillStyle = 'rgba(239,68,68,.85)'; ctx.fillRect(cx2 - w2 / 2, by + 3, w2, bhh - 6);
      ctx.fillStyle = '#ea580c'; ctx.fillRect(cx2 - 1.5, by - 6, 3, 6);
    }
    ctx.strokeStyle = '#6366f1'; ctx.lineWidth = 2; rr(bx, by, bw, bhh, 8); ctx.stroke();
    if (n > 40) T(bx + bw, by + bhh + 18, '※ 그림에는 원점 40개만 그렸어요 (실제 ' + fmtN(n) + '개)', 12.5, '#94a3b8', 'right', 700);
    T(bx, by - 12, '복제 중인 DNA (빨강 = 새로 복제된 부분)', 13, '#64748b', 'left', 800);
    textBlock(B.x + 16, by + bhh + L(52, 46), B.w - 32, '복제 시간 = 6.2 × 10⁹ / (2 × 50 × ' + fmtN(n) + ') 초 (포크 속도는 초당 약 50 염기라고 가정)', L(15, 13), '#334155', 20, 800);
    D.label(B.x + B.w / 2, by + bhh + L(86, 100), '사람 DNA 복제 시간: ' + fmtT(hSec(n)), { bg: tmFast() ? '#15803d' : '#dc2626', size: L(18, 15) });
    // 로그 시간 눈금: 1시간 ~ 10만 시간
    const gy = B.y + B.h - L(76, 74), gx = bx, gw = bw;
    T(gx + gw, gy - 18, '복제 시간 (시간, 로그 눈금)', 13, '#64748b', 'right', 800);
    ctx.fillStyle = '#e2e8f0'; rr(gx, gy, gw, 16, 6); ctx.fill();
    const fr = clamp(Math.log10(Math.max(tmHours(n), 1)) / 5, 0, 1);
    if (fr > 0.002) { ctx.fillStyle = tmFast() ? '#16a34a' : '#ef4444'; rr(gx, gy, gw * fr, 16, Math.min(6, gw * fr / 2)); ctx.fill(); }
    [0, 1, 2, 3, 4, 5].forEach((e) => { const x = gx + gw * e / 5; ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, gy + 16); ctx.lineTo(x, gy + 22); ctx.stroke(); T(x, gy + 38, e === 0 ? '1시간' : e === 1 ? '10' : e === 2 ? '100' : e === 3 ? '1000' : e === 4 ? '1만' : '10만', 12.5, '#64748b', 'center', 700); });
    const sx = gx + gw * Math.log10(8) / 5;
    ctx.strokeStyle = '#2563eb'; ctx.lineWidth = 2.5; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(sx, gy - 6); ctx.lineTo(sx, gy + 22); ctx.stroke(); ctx.setLineDash([]);
    D.label(sx + 8, gy - 12, 'S기 약 8시간', { bg: '#2563eb', size: 12.5, align: 'left', pad: 6 });
    if (tmFast()) T(B.x + B.w / 2, B.y + B.h - 10, '8시간 안에 끝나요! 원점이 수천 개 이상 필요하다고 추론할 수 있어요.', L(14, 12.5), '#15803d', 'center', 800);
    else T(B.x + B.w / 2, B.y + B.h - 10, '실제 세포는 하루도 안 걸려요. 원점이 몇 개나 필요할까요?', L(14, 12.5), '#b91c1c', 'center', 800);
  }

  /* =========================================================
     ④ 세포 주기와 DNA 양
     ========================================================= */
  S.cy = { ph: 0, p: 0, dv: 0, nodiv: false };
  const CYG = PHONE ? { cell: { x: 8, y: 8, w: 464, h: 330 }, gr: { x: 8, y: 350, w: 464, h: 284 } } : { cell: { x: 14, y: 14, w: 470, h: 532 }, gr: { x: 496, y: 14, w: 292, h: 532 } };
  const cyAmt = () => { const c = S.cy; if (c.ph === 0) return 2; if (c.ph === 1) return 2 + 2 * c.p; if (c.ph === 2 && !c.nodiv && c.dv < 0.5) return 4; if (c.ph === 3 || c.dv >= 0.5) return c.nodiv ? 1 : 2; return c.nodiv ? 2 : 4; };
  const cyDone = () => S.cy.ph === 3 && !S.cy.nodiv;
  function cyRep() { const c = S.cy; if (c.ph !== 0) return; c.ph = 1; c.p = 0; Sound.click(); updateCtl(); }
  function cyDiv() { const c = S.cy; if (c.ph !== 2 || c.nodiv || c.dv > 0) return; c.dv = 0.0001; Sound.click(); updateCtl(); }
  function cyNoRep() { const c = S.cy; if (c.ph !== 0) return; c.nodiv = true; c.ph = 2; c.dv = 0.0001; Sound.click(); updateCtl(); }
  function cyReset() { S.cy = { ph: 0, p: 0, dv: 0, nodiv: false }; updateCtl(); }
  function cyChrom(x, y, h, col, alpha) {
    ctx.save(); ctx.globalAlpha = alpha == null ? 1 : alpha;
    const g = ctx.createLinearGradient(x - 8, 0, x + 8, 0); g.addColorStop(0, C.shade(col, 0.3)); g.addColorStop(0.5, col); g.addColorStop(1, C.shade(col, -0.2));
    ctx.fillStyle = g; rr(x - 7, y - h / 2, 14, h, 7); ctx.fill(); ctx.strokeStyle = C.shade(col, -0.4); ctx.lineWidth = 1.4; ctx.stroke(); ctx.restore();
  }
  function cyDraw(dt, t) {
    const c = S.cy, G = CYG;
    if (c.ph === 1) { c.p = RM ? 1 : Math.min(1, c.p + dt / 2.4); if (c.p >= 1) { c.ph = 2; Sound.success(); updateCtl(); } }
    if (c.dv > 0 && c.dv < 1) { c.dv = RM ? 1 : Math.min(1, c.dv + dt / 2.0); if (c.dv >= 1) { c.ph = 3; if (!c.nodiv) { Sound.success(); } else Sound.fail(); updateCtl(); } }
    const dv = ease.inOutCubic(clamp(c.dv, 0, 1));
    panel(G.cell.x, G.cell.y, G.cell.w, G.cell.h, 16, '#fff');
    const cx = G.cell.x + G.cell.w / 2, cy = G.cell.y + (PHONE ? 150 : 236);
    TF(G.cell.x + 16, G.cell.y + 28, c.ph === 0 ? '분열 전 세포 (G₁기)' : c.ph === 1 ? '복제 중 (S기)' : c.ph === 2 && c.dv === 0 ? '복제 끝 (G₂기)' : c.ph === 3 ? '분열 후 (딸세포 2개)' : '분열 중 (M기)', G.cell.w - 32, L(17, 14.5), 11, '#14532d', 'left', 800);
    const rx = lerp(L(168, 150), L(86, 72), dv), ry = lerp(L(130, 96), L(112, 88), dv), off = L(86, 76) * dv;
    [-1, 1].forEach((s) => {
      ctx.save(); ctx.translate(cx + s * off, cy);
      D.shadow(() => { ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, TAU); ctx.fillStyle = '#ecfdf5'; ctx.fill(); }, { blur: 6, y: 2 });
      ctx.strokeStyle = '#10b981'; ctx.lineWidth = 3.5; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(0, 0, rx * 0.72, ry * 0.7, 0, 0, TAU); ctx.fillStyle = 'rgba(167,139,250,.14)'; ctx.fill(); ctx.setLineDash([5, 4]); ctx.strokeStyle = 'rgba(124,58,237,.5)'; ctx.lineWidth = 2; ctx.stroke(); ctx.setLineDash([]);
      ctx.restore();
    });
    // 염색체: 상동 염색체 2개 (보라, 청록)
    const hc = L(96, 84), cols = ['#7c3aed', '#0891b2'];
    [0, 1].forEach((j) => {
      const bx = cx + (j ? 1 : -1) * L(40, 34);
      const rep = c.nodiv ? 0 : (c.ph === 0 ? 0 : c.ph === 1 ? c.p : 1);
      [0, 1].forEach((k) => {
        if (k === 1 && rep <= 0) return;
        const x0 = (c.nodiv || rep <= 0) ? bx : bx + (k ? 8 : -8) * rep;
        let x;
        if (c.dv > 0) { const cxD = cx + (c.nodiv ? (j ? 1 : -1) : (k ? 1 : -1)) * off; const fin = c.nodiv ? cxD : cxD + (j ? 1 : -1) * L(26, 22); x = lerp(x0, fin, dv); }
        else x = x0;
        cyChrom(x, cy, hc, cols[j], k === 1 ? clamp(rep * 1.4, 0, 1) : 1);
      });
      // 동원체 점
      if (c.dv === 0 && rep > 0.5) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(bx, cy, 3.2, 0, TAU); ctx.fill(); }
    });
    // 설명 글자
    const ty = cy + ry + L(30, 28);
    if (c.ph === 2 && c.dv === 0) T(cx, ty, '염색 분체 2개: 두 DNA의 염기 서열이 같아요', L(14.5, 12.5), '#6d28d9', 'center', 800);
    else if (c.ph === 3 && !c.nodiv) T(cx, ty, '딸세포마다 원래와 같은 DNA를 가져요', L(14.5, 12.5), '#15803d', 'center', 800);
    else if (c.ph === 3 && c.nodiv) T(cx, ty, '복제 없이 분열 → 딸세포의 DNA 양이 절반!', L(14.5, 12.5), '#b91c1c', 'center', 800);
    else if (c.ph === 0) T(cx, ty, '염색체 2개 (상동 염색체 한 쌍) · DNA 상대량 2', L(14.5, 12.5), '#475569', 'center', 800);
    // DNA 상대량 막대
    const amt = cyAmt();
    D.label(cx, G.cell.y + G.cell.h - L(34, 26), '세포 하나의 DNA 상대량: ' + fmt1(amt), { bg: c.nodiv && c.ph === 3 ? '#dc2626' : '#475569', size: L(16, 14) });
    // 그래프
    const R = G.gr; panel(R.x, R.y, R.w, R.h, 16, '#fff');
    TF(R.x + 14, R.y + 28, '세포 하나의 DNA 상대량', R.w - 28, L(16, 14), 11, '#14532d', 'left', 800);
    const gx0 = R.x + L(50, 58), gx1 = R.x + R.w - 22, gy1 = R.y + R.h - L(62, 58), gy0 = R.y + L(70, 62);
    const X = (v) => gx0 + (gx1 - gx0) * v / 4, Y = (v) => gy1 - (gy1 - gy0) * v / 5;
    for (let v = 0; v <= 5; v++) { ctx.strokeStyle = v === 0 ? '#64748b' : '#e2e8f0'; ctx.lineWidth = v === 0 ? 2 : 1; ctx.beginPath(); ctx.moveTo(gx0 - 4, Y(v)); ctx.lineTo(gx1, Y(v)); ctx.stroke(); T(gx0 - 10, Y(v) + 5, String(v), 13, '#64748b', 'right', 700); }
    ['G₁기', 'S기', 'G₂기', '분열 후'].forEach((s, i) => { T(X(i + 0.5), gy1 + 22, s, 13, '#475569', 'center', 800); ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(X(i + 1), gy1); ctx.lineTo(X(i + 1), gy1 + 6); ctx.stroke(); });
    // 선
    const pts = [[0, 2], [1, 2]];
    if (c.ph >= 1 && !c.nodiv) pts.push([1 + (c.ph === 1 ? c.p : 1), 2 + 2 * (c.ph === 1 ? c.p : 1)]);
    if (c.ph >= 2 && !c.nodiv) pts.push([3, 4]);
    if (c.nodiv && c.ph >= 2) pts.push([3, 2]);
    if (c.dv > 0) { const fv = c.nodiv ? 1 : 2, st = c.nodiv ? 2 : 4; pts.push([3 + 0.25 * dv, lerp(st, fv, dv)]); if (c.dv >= 1) pts.push([4, fv]); }
    ctx.strokeStyle = c.nodiv ? '#dc2626' : '#7c3aed'; ctx.lineWidth = 4; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(X(p[0]), Y(p[1])) : ctx.moveTo(X(p[0]), Y(p[1])))); ctx.stroke();
    const lp = pts[pts.length - 1]; D.sphere(X(lp[0]), Y(lp[1]), 8, c.nodiv ? '#dc2626' : '#7c3aed', { shadow: true });
    D.label(X(lp[0]), Y(lp[1]) - 20, fmt1(c.dv >= 1 ? (c.nodiv ? 1 : 2) : amt), { bg: '#475569', size: 12.5, pad: 6 });
    if (!PHONE) textBlock(R.x + 14, R.y + R.h - 22 - 0, R.w - 28, '', 12, '#64748b', 16, 700);
  }

  /* =========================================================
     ④ 복제의 의미 연결 · 모둠 보드
     ========================================================= */
  const MNL = [{ id: 'acc', t: '정확성', sub: '새 DNA의 염기 서열이 원래와 같아요' }, { id: 'keep', t: '정보의 보존', sub: '딸 DNA마다 원래 정보가 이어져요' }, { id: 'fast', t: '신속성', sub: '긴 DNA도 짧은 시간에 복제해요' }];
  const MNR = [{ id: 'keep', t: '딸 DNA마다 원래 가닥이 1개씩 그대로 들어 있어요 (반보존적)' }, { id: 'fast', t: '복제 원점이 여러 개이고, 각각 양쪽으로 복제 거품이 커져요' }, { id: 'acc', t: '원래 가닥을 주형으로 삼아 상보적 염기쌍(A–T, G–C)으로만 연결해요' }];
  const MNG = PHONE ? { lx: 8, lw: 214, rx: 258, rw: 214, y0: 110, h: 126, step: 150 } : { lx: 24, lw: 300, rx: 476, rw: 300, y0: 110, h: 112, step: 136 };
  const mnMatcher = new Matcher({
    left: MNL, right: MNR, ans: { acc: 'acc', keep: 'keep', fast: 'fast' }, fs: 17, fs2: 14,
    rect: (side, i) => ({ x: side === 0 ? MNG.lx : MNG.rx, y: MNG.y0 + i * MNG.step, w: side === 0 ? MNG.lw : MNG.rw, h: MNG.h }),
    onChange: () => updateCtl(),
  });
  function mnDraw(dt, t) {
    TF(VW / 2, PHONE ? 30 : 40, '복제의 의미: 모형에서 본 근거와 연결해요', VW - 24, L(21, 16), 12, '#14532d', 'center', 800);
    T(MNG.lx + MNG.lw / 2, MNG.y0 - 24, '복제의 의미', L(16, 14), '#6d28d9', 'center', 800);
    T(MNG.rx + MNG.rw / 2, MNG.y0 - 24, '모형에서 본 근거', L(16, 14), '#0e7490', 'center', 800);
    mnMatcher.draw(dt);
    textBlock(VW / 2, MNG.y0 + 3 * MNG.step + 4, VW - 60, '복제 중 틀린 염기가 그대로 남으면 새로운 돌연변이가 돼요 (앞 차시). 그래서 정확성이 중요해요.', L(14.5, 12.5), '#64748b', 19, 700, 'center');
  }
  const mnPT = { down: (p) => mnMatcher.down(p), move: (p) => mnMatcher.move(p), up: (p) => mnMatcher.up(p), hover: (p) => mnMatcher.hover(p) };

  const PBS = [
    { id: 's1', ok: true, t: '새 가닥은 주형(원래 가닥)과 상보적인 염기쌍(A–T, G–C)으로만 만들어져서 두 DNA의 염기 서열이 같아요.' },
    { id: 's2', ok: true, t: '딸 DNA마다 원래 가닥이 1개씩 그대로 들어 있어서 원래의 유전 정보가 이어져요.' },
    { id: 's3', ok: false, t: '복제 원점이 많아서 복제가 빨리 끝나기 때문에 정보가 정확해져요.' },
    { id: 's4', ok: false, t: '원래 DNA는 사라지고 새 가닥만 남아서 정보가 새로 바뀌어요.' },
  ];
  const PBM = [
    { who: '모둠원 1 (가상)', t: '메셀슨 · 스탈 실험에서 ¹⁵N 가닥 2개가 세대가 지나도 그대로 남았어요. 원래 가닥이 계속 이어지는 거예요.', col: '#fde68a' },
    { who: '모둠원 2 (가상)', t: '복제 모의에서 틀린 염기는 튕겨 나갔어요. 그래서 복제가 정확한 것 같아요.', col: '#fbcfe8' },
    { who: '모둠원 3 (가상)', t: '사람 DNA는 복제 원점이 많아야 하루 안에 복제가 끝나요.', col: '#bae6fd' },
  ];
  S.pb = { sel: {}, posted: [], popT: 0 };
  const pbOk = () => S.pb.posted.length === 2 && PBS.filter((s) => s.ok).every((s) => S.pb.posted.indexOf(s.id) >= 0);
  function pbPost() {
    const ids = PBS.filter((s) => S.pb.sel[s.id]).map((s) => s.id);
    if (!ids.length) return;
    S.pb.posted = ids; S.pb.popT = 0; Sound.click(); updateCtl();
  }
  function pbClear() { S.pb.posted = []; S.pb.sel = {}; Sound.click(); updateCtl(); }
  function pbDraw(dt, t) {
    S.pb.popT = Math.min(1, S.pb.popT + dt * 2.2);
    TF(VW / 2, PHONE ? 28 : 38, '가상 모둠 보드: 반보존적 복제가 유전 정보를 정확히 전달하는 근거는?', VW - 24, L(19, 14.5), 11.5, '#14532d', 'center', 800);
    panel(PHONE ? 8 : 14, PHONE ? 44 : 56, PHONE ? 464 : 772, PHONE ? 590 : 480, 16, '#fef9ec');
    const note = (x, y, w, h, col, who, text, a) => {
      ctx.save(); ctx.translate(x + w / 2, y + h / 2); ctx.scale(a, a); ctx.rotate((1 - a) * 0.1);
      D.shadow(() => { rr(-w / 2, -h / 2, w, h, 8); ctx.fillStyle = col; ctx.fill(); }, { blur: 6, y: 3 });
      D.shadow(() => {}, {});
      T(-w / 2 + 12, -h / 2 + 22, who, L(13.5, 12.5), '#475569', 'left', 800);
      textBlock(-w / 2 + 12, -h / 2 + 44, w - 24, text, L(14, 12.5), '#1f2d44', L(19, 17), 700);
      ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.arc(0, -h / 2 + 4, 5, 0, TAU); ctx.fill();
      ctx.restore();
    };
    const nw = PHONE ? 448 : 244, nh = PHONE ? 84 : 150;
    PBM.forEach((m, i) => { const x = PHONE ? 16 : 28 + i * 252, y = PHONE ? 56 + i * 92 : 76; note(x, y, nw, nh, m.col, m.who, m.t, 1); });
    const by = PHONE ? 340 : 252;
    T(PHONE ? 20 : 30, by - 6, S.pb.posted.length ? '내가 올린 문장' : '내가 올릴 문장을 오른쪽(아래) 칸에서 골라 보드에 올려요', L(15, 13), '#92400e', 'left', 800);
    S.pb.posted.forEach((id, i) => {
      const s = PBS.find((q) => q.id === id), a = ease.outBack(clamp(S.pb.popT * 1.5 - i * 0.3, 0.001, 1));
      const w = PHONE ? 448 : 372, h = PHONE ? 66 : 112, x = PHONE ? 16 : 28 + (i % 2) * 384, y = PHONE ? by + 6 + i * 74 : by + 6 + Math.floor(i / 2) * 124;
      note(x, y, w, h, '#bbf7d0', '내 문장 ' + (i + 1), s.t, a);
    });
  }

  /* =========================================================
     화면 전환 · 조작 연결
     ========================================================= */
  const PTS = { hyp: hyPT, build: bdPT, fork: fkPT, meaning: mnPT };
  function setMode(m) {
    if (S.mode !== m) S.fade = 1;
    S.mode = m; PT = PTS[m] || null; hideHint(); updateCtl();
  }
  const ctlNodes = $$('#ctrlCard .control');
  const bdSel = $('#bdSel');
  PBS.forEach((s) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'mc'; b.dataset.v = s.id; b.textContent = s.t; bdSel.appendChild(b); });
  function updateCtl() {
    const fr = game ? game.free : false, lvNow = game ? game.level : 0;
    ctlNodes.forEach((n) => { n.hidden = (n.dataset.modes || '').split(' ').indexOf(S.mode) < 0; });
    modeButtons(S.mode, lvNow, fr);
    chipSet($('#hyH'), S.hy.h); chipSet($('#hyG'), S.hy.g);
    $$('#hyH button').forEach((b) => b.classList.toggle('seen', !!(S.hy.done[hyKey(+b.dataset.v, 1)] && S.hy.done[hyKey(+b.dataset.v, 2)])));
    $('#hyList').innerHTML = [0, 1, 2].map((h) => '<li class="' + (S.hy.done[hyKey(h, 1)] && S.hy.done[hyKey(h, 2)] ? 'on' : '') + '">' + mark(S.hy.done[hyKey(h, 1)] && S.hy.done[hyKey(h, 2)]) + ' ' + HYP[h].n + ': 1회 ' + (S.hy.done[hyKey(h, 1)] ? '✔' : '·') + ' / 2회 ' + (S.hy.done[hyKey(h, 2)] ? '✔' : '·') + '</li>').join('');
    $('#tbOut').textContent = S.tb.n + '회'; $('#tbN').value = S.tb.n; $('#tbCalc').hidden = !S.tb.calcOn;
    $('#inR3').classList.toggle('ok', S.tb.ok3); $('#inR4').classList.toggle('ok', S.tb.ok4);
    $('#bdOpen').disabled = S.bd.open; $('#bdOpen').textContent = S.bd.open ? '① 풀었어요' : '① 헬리케이스로 풀기';
    $('#bdNote').innerHTML = !S.bd.open ? '먼저 이중 가닥을 풀어요.' : !bdOpened() ? '헬리케이스가 가닥을 풀고 있어요…' : bdCount() < 12 ? '파랑 <b>주형 가닥</b>마다 짝이 맞는 <b>새 뉴클레오타이드</b>를 끌어서 빈 자리에 놓아요. (' + bdCount() + ' / 12)' : '<b>완성!</b> 딸 DNA 두 개가 서로 같고, 각각 원래 가닥 1개를 가져요.';
    $('#tmOut').textContent = fmtN(ORIG[S.tm.idx]) + '개'; $('#tmN').value = S.tm.idx; $('#tmCalc').hidden = !S.tm.calcOn;
    $('#inEc').classList.toggle('ok', S.tm.ecOk);
    $('#cyRep').disabled = S.cy.ph !== 0; $('#cyDiv').disabled = !(S.cy.ph === 2 && !S.cy.nodiv && S.cy.dv === 0); $('#cyNo').disabled = S.cy.ph !== 0;
    $('#cyNote').innerHTML = S.cy.ph === 0 ? '먼저 <b>DNA 복제</b>를 눌러요.' : S.cy.ph === 1 ? '복제 중… DNA 상대량이 2에서 4로 늘어요.' : S.cy.ph === 2 && S.cy.dv === 0 ? '염색 분체 2개가 만들어졌어요. 이제 <b>세포 분열</b>을 눌러요.' : S.cy.ph === 3 && !S.cy.nodiv ? '딸세포마다 DNA 상대량 2로 돌아왔어요.' : S.cy.ph === 3 ? '복제 없이 분열하면 딸세포의 DNA 양이 절반이에요. ↺ 처음부터 다시 해요.' : '분열 중…';
    $$('#bdSel button').forEach((b) => b.classList.toggle('on', !!S.pb.sel[b.dataset.v]));
  }
  bindModes(setMode);
  $$('#hyH button').forEach((b) => b.addEventListener('click', () => hySet(+b.dataset.v, null)));
  $$('#hyG button').forEach((b) => b.addEventListener('click', () => hySet(null, +b.dataset.v)));
  $('#tbN').addEventListener('input', (e) => { tbSet(+e.target.value); });
  const ratioIn = (id, key, ans) => $('#' + id).addEventListener('input', () => {
    const v = numOf(id), ok = isFinite(v) && v === ans, was = S.tb[key]; S.tb[key] = ok; if (ok && !was) { Sound.success(); parts.burst(VW / 2, VH / 2, { count: 16, speed: 170 }); } updateCtl();
  });
  ratioIn('inR3', 'ok3', 3); ratioIn('inR4', 'ok4', 7);
  $('#bdOpen').addEventListener('click', bdOpenGo);
  $('#bdReset').addEventListener('click', () => { Sound.click(); bdReset(); });
  $('#fkRestart').addEventListener('click', () => { Sound.click(); S.fk.t = 0; });
  $('#fkClear').addEventListener('click', () => { Sound.click(); fkMatcher.reset(); });
  $('#tmN').addEventListener('input', (e) => { S.tm.idx = +e.target.value; S.tm.seen[S.tm.idx] = true; S.tm.u = 0; updateCtl(); });
  $('#inEc').addEventListener('input', () => { const v = numOf('inEc'), ok = isFinite(v) && v >= 36 && v <= 40, was = S.tm.ecOk; S.tm.ecOk = ok; if (ok && !was) { Sound.success(); parts.burst(120, 130, { count: 14, speed: 150 }); } updateCtl(); });
  $('#cyRep').addEventListener('click', cyRep); $('#cyDiv').addEventListener('click', cyDiv); $('#cyNo').addEventListener('click', cyNoRep);
  $('#cyReset').addEventListener('click', () => { Sound.click(); cyReset(); });
  $('#mnReset').addEventListener('click', () => { Sound.click(); mnMatcher.reset(); });
  $$('#bdSel button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.pb.sel[b.dataset.v] = !S.pb.sel[b.dataset.v]; updateCtl(); }));
  $('#bdPost').addEventListener('click', pbPost); $('#bdClear').addEventListener('click', pbClear);

  function tbReset() { S.tb.n = 0; S.tb.seen = { 0: true }; S.tb.ok3 = false; S.tb.ok4 = false; S.tb.calcOn = false; $('#inR3').value = ''; $('#inR4').value = ''; $('#tbN').value = 0; }
  function hyReset() { S.hy.done = {}; S.hy.rev = {}; S.hy.h = 0; S.hy.g = 1; S.hy.sel = -1; S.hy.wrong = -1; }
  function tmReset() { S.tm.idx = 0; S.tm.ecOk = false; S.tm.seen = { 0: true }; S.tm.calcOn = true; $('#inEc').value = ''; $('#tmN').value = 0; }
  const tbDone012 = () => !!(S.tb.seen[0] && S.tb.seen[1] && S.tb.seen[2]);

  const levels = [
    {
      title: '복제에 대한 세 가지 가설', short: '세 가지 가설', icon: '🧩', phase: '탐구',
      intro: '<p class="si-q">❓ 탐구 질문: 복제된 DNA 두 개는 각각 원래 DNA의 무엇을 가지고 있을까? 그리고 그 방식은 왜 생명에게 중요할까?</p><p>🔗 <b>생명과학</b>에서 세포가 분열하기 전에 DNA 상대량이 2에서 4로 늘어나는 것을 배웠고, 앞 차시에서 DNA는 A–T, G–C로 짝을 이룬 <b>이중 나선</b>이라는 것을 확인했어요. 이번에는 DNA가 <b>어떻게 복제되는지</b>를 따져 봐요.</p><p>💡 복제 방식에 대한 가설은 <b>보존적 · 반보존적 · 분산적</b> 세 가지였어요. 파랑은 원래 가닥, 빨강은 새 가닥으로 나타내고, 각 가설의 규칙대로 복제 1회, 2회 뒤의 DNA를 예측해 봐요.</p>',
      features: ['hyp'],
      setup() { hyReset(); setMode('hyp'); },
      recap: '보존적은 원래 이중 가닥이 그대로 남고, 반보존적은 딸 DNA마다 원래 가닥 1개 + 새 가닥 1개, 분산적은 가닥 전체가 조각조각 섞여요. 결과는 밀도로 구별할 수 있어요.',
      summary: '<ul><li><b>보존적 복제</b>: 원래 이중 가닥은 그대로, 새 이중 가닥이 따로 만들어짐 → 복제 1회 뒤 무거운 DNA 1 + 가벼운 DNA 1.</li><li><b>반보존적 복제</b>: 딸 DNA = <b>원래 가닥 1 + 새 가닥 1</b> → 복제 1회 뒤 모두 중간 밀도.</li><li><b>분산적 복제</b>: 원래 가닥과 새 가닥이 조각조각 섞임 → 복제 1회 뒤 모두 중간 밀도(복제할수록 점점 가벼워짐).</li><li>복제 n회 뒤 DNA는 2ⁿ개가 돼요.</li></ul>',
      missions: [
        {
          id: 'pred', title: '가설별 복제 결과 예측',
          goal: '<b>세 가설</b> 각각에 대해 <b>복제 1회 · 2회</b> 뒤의 DNA 그림을 골라 <b>6번</b> 모두 맞히세요.',
          hint: '가설의 규칙을 그대로 적용해요. 반보존적은 복제할 때마다 원래 가닥이 새 가닥과 짝을 이뤄요. 보존적은 원래 이중 가닥이 그대로 하나 남아요. 분산적은 파랑과 빨강이 섞인 가닥이에요.',
          setup() { hyReset(); setMode('hyp'); },
          check: () => hyN() === 6, hold: 0.8,
          status: () => mark(S.hy.done['0-1'] && S.hy.done['0-2']) + ' 보존적 ' + (+!!S.hy.done['0-1'] + +!!S.hy.done['0-2']) + '/2 &nbsp; ' + mark(S.hy.done['1-1'] && S.hy.done['1-2']) + ' 반보존적 ' + (+!!S.hy.done['1-1'] + +!!S.hy.done['1-2']) + '/2 &nbsp; ' + mark(S.hy.done['2-1'] && S.hy.done['2-2']) + ' 분산적 ' + (+!!S.hy.done['2-1'] + +!!S.hy.done['2-2']) + '/2',
          explain: '<b>보존적</b>: 1회 뒤 원래 이중 가닥 1개 + 새 이중 가닥 1개, 2회 뒤 원래 1개 + 새 3개. <b>반보존적</b>: 1회 뒤 모두 (원래 1 + 새 1), 2회 뒤 그런 DNA 2개 + 새 가닥만 2개인 DNA 2개. <b>분산적</b>: 가닥마다 파랑과 빨강이 섞여 있고 복제할수록 파랑의 비율이 절반씩 줄어요.',
        },
        {
          type: 'quiz', title: '반보존적 복제로 만들어진 딸 DNA',
          goal: '반보존적 복제로 만들어진 <b>딸 DNA 한 분자</b>의 구성은?',
          setup() { setMode('hyp'); },
          choices: ['원래 가닥 2개', '새 가닥 2개', '원래 가닥 1개 + 새 가닥 1개', '원래 가닥과 새 가닥이 조각조각 섞인 가닥 2개'],
          answer: 2,
          feedback: ['그것은 보존적 복제에서 \'원래 DNA\'가 그대로 남은 경우예요.', '그것은 보존적 복제에서 새로 생긴 DNA의 모습이에요.', '', '그것은 분산적 복제의 모습이에요.'],
          explain: '반보존적 복제에서는 두 가닥이 풀려 각각 <b>주형</b>이 되고, 각 주형에 상보적인 새 가닥이 만들어져요. 그래서 딸 DNA는 모두 <b>원래 가닥 1개 + 새 가닥 1개</b>예요.',
        },
      ],
    },
    {
      title: '메셀슨 · 스탈의 밀도 띠 실험', short: '밀도 띠', icon: '🧪', phase: '실험',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 세 가설이 복제 뒤에 서로 다른 DNA를 만든다고 예측했어요. 이제 어느 가설이 맞는지 <b>실험</b>으로 가려요.</div><p><b>메셀슨과 스탈(1958)</b>은 대장균을 <b>¹⁵N(무거운 질소)</b> 배지에서 여러 세대 키워 DNA를 모두 무겁게 만든 뒤 <b>¹⁴N(가벼운 질소)</b> 배지로 옮겼어요. 세대마다 DNA를 염화 세슘(CsCl) 용액에서 초원심 분리하면 <b>밀도에 따라 띠</b>가 생겨요. 복제 횟수를 바꿔 가며 띠를 읽고, 세 가설의 예측과 비교해요.</p><p>💡 밀도(예시): ¹⁴N/¹⁴N 1.710, ¹⁵N/¹⁴N 1.717, ¹⁵N/¹⁵N 1.724 g/cm³.</p>',
      features: ['tube'],
      setup() { tbReset(); setMode('tube'); },
      recap: '1세대에 중간 띠만 나와서 보존적 복제가 기각되고, 2세대에 중간 띠와 가벼운 띠가 1 : 1로 나와 분산적 복제가 기각돼요. 남은 것은 반보존적 복제예요.',
      summary: '<ul><li><b>메셀슨 · 스탈(1958)</b>: ¹⁵N 배지의 대장균을 ¹⁴N 배지로 옮기고 세대마다 DNA 밀도 띠를 관찰.</li><li>0세대 무거운 띠 1개 / 1세대 <b>중간 띠 1개</b> / 2세대 중간 : 가벼운 = <b>1 : 1</b> / 3세대 1 : 3 / 4세대 1 : 7.</li><li><b>1세대</b>에서 무거운 띠와 가벼운 띠가 나와야 하는 <b>보존적 복제는 기각</b>. <b>2세대</b>에서 가벼운 띠가 생기므로 중간 띠 하나가 점점 가벼워져야 하는 <b>분산적 복제도 기각</b> → <b>반보존적 복제</b>.</li><li>n회 복제 후 DNA 2ⁿ개 중 중간 2개, 가벼운 2ⁿ − 2개 (1 : 1, 1 : 3, 1 : 7). ¹⁵N을 가진 가닥은 어느 세대에도 <b>2개</b>로 일정해요.</li></ul>',
      missions: [
        {
          id: 'gen012', title: '0 · 1 · 2세대 띠 확인',
          goal: '복제 횟수를 <b>0회 → 1회 → 2회</b>로 바꿔 가며 <b>밀도 띠</b>의 위치와 개수를 확인하세요.',
          hint: '복제 횟수 슬라이더를 오른쪽으로 움직여요. 실험 결과 튜브(UV 사진)의 띠와 세 가설의 예측 튜브를 비교해요.',
          setup() { tbReset(); setMode('tube'); },
          check: () => tbDone012(), hold: 0.8,
          status: () => mark(S.tb.seen[0]) + ' 0세대 &nbsp; ' + mark(S.tb.seen[1]) + ' 1세대 &nbsp; ' + mark(S.tb.seen[2]) + ' 2세대',
          explain: '0세대: <b>무거운 띠</b> 1개. 1세대: <b>중간 띠</b> 1개(보존적 복제의 예측과 달라요). 2세대: <b>중간 띠와 가벼운 띠</b>가 같은 양(분산적 복제의 예측과 달라요).',
        },
        {
          id: 'gen34', title: '3 · 4세대 비율 계산',
          goal: '복제 3회 · 4회 뒤의 <b>중간 : 가벼운 = 1 : ?</b>를 계산해 입력하세요.',
          hint: '복제 n회 뒤 DNA는 2ⁿ개이고 중간 띠는 항상 2개예요. 3회: 8개 중 중간 2개, 가벼운 6개 → 2 : 6. 4회: 16개 중 중간 2개, 가벼운 14개 → 2 : 14.',
          setup() { tbReset(); S.tb.calcOn = true; S.tb.seen = { 0: true, 1: true, 2: true }; $('#tbN').value = 2; S.tb.n = 2; setMode('tube'); updateCtl(); },
          check: () => S.tb.ok3 && S.tb.ok4 && S.tb.seen[3] && S.tb.seen[4], hold: 0.8,
          status: () => mark(S.tb.seen[3] && S.tb.seen[4]) + ' 3 · 4회 띠 보기 &nbsp; ' + mark(S.tb.ok3) + ' 3회 1 : ' + (S.tb.ok3 ? 3 : '?') + ' &nbsp; ' + mark(S.tb.ok4) + ' 4회 1 : ' + (S.tb.ok4 ? 7 : '?'),
          explain: '3회 복제 뒤 DNA 8개 중 중간 2개 · 가벼운 6개 → <b>1 : 3</b>, 4회 복제 뒤 16개 중 중간 2개 · 가벼운 14개 → <b>1 : 7</b>이에요. ¹⁵N을 가진 가닥이 계속 2개로 일정하기 때문에 중간 띠는 늘어나지 않고 가벼운 띠만 늘어나요.',
        },
        {
          type: 'quiz', title: '기각되는 가설은?',
          goal: '1세대에서는 <b>중간 띠 1개</b>만, 2세대에서는 <b>중간 띠와 가벼운 띠</b>가 나타났어요. 이 결과로 기각되는 가설을 옳게 짝지은 것은?',
          setup() { setMode('tube'); },
          choices: ['1세대 결과로 분산적, 2세대 결과로 보존적', '1세대 결과로 반보존적, 2세대 결과로 보존적', '1세대 결과로 보존적, 2세대 결과로 분산적', '두 가설 모두 1세대 결과로 기각된다'],
          answer: 2,
          feedback: ['서로 바뀌었어요. 1세대에서 무거운 띠와 가벼운 띠가 나와야 하는 것은 보존적 복제예요.', '반보존적 복제는 이 결과와 일치해요. 기각되는 것은 보존적, 분산적이에요.', '', '1세대의 중간 띠 하나는 분산적 복제의 예측과도 같아요. 분산적은 2세대에서 중간 띠가 더 가벼운 위치 하나로 나타나야 하는데 중간 띠와 가벼운 띠 두 개가 나와 그때 기각돼요.'],
          explain: '1세대 결과(중간 띠만)는 <b>보존적</b> 복제(무거운 띠 + 가벼운 띠)와 달라 기각돼요. 2세대 결과(중간 띠 + 가벼운 띠)는 <b>분산적</b> 복제(하나의 띠가 더 가벼워짐)와 달라 기각돼요. 남은 것은 <b>반보존적</b> 복제이고, ¹⁵N 가닥이 세대가 지나도 2개로 일정한 것도 이와 맞아요.',
        },
      ],
    },
    {
      title: '복제 모의실험', short: '복제 모의', icon: '🧬', phase: '모형',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 반보존적 복제가 맞다는 것을 밀도 띠로 확인했어요.</div><p>이제 <b>복제가 어떻게 일어나는지</b> 모형으로 따라 해 봐요. 복제 원점에서 이중 가닥이 풀리고(<b>헬리케이스</b>), 합성의 시작점인 <b>프라이머</b>가 붙은 뒤 <b>DNA 중합 효소</b>가 주형에 맞춰 새 뉴클레오타이드를 연결해요. 조각으로 합성되는 가닥은 <b>연결 효소</b>가 이어요. 효소는 <b>용어 수준</b>으로만 알아봐요.</p><p>💡 마지막에는 복제에 걸리는 <b>시간</b>을 계산해 복제 원점이 왜 많이 필요한지 추론해요.</p>',
      features: ['build', 'fork', 'time'],
      setup() { bdReset(); setMode('build'); },
      recap: '주형 가닥에 상보적인 염기만 연결되므로(틀린 염기는 교정) 딸 DNA 둘이 같아요. 선도 가닥은 연속, 지연 가닥은 조각으로 합성돼요. 사람은 복제 원점이 수천 개 이상이어야 하루 안에 복제가 끝나요.',
      summary: '<ul><li>복제 원점에서 <b>헬리케이스</b>가 이중 가닥을 풀면 복제 거품이 양쪽으로 커져요. <b>프라이머</b>가 합성 시작점이 되고, <b>DNA 중합 효소</b>가 주형에 상보적인 뉴클레오타이드(A–T, G–C)를 연결해요. 틀린 염기는 떨어져 나가요(교정).</li><li>DNA 중합 효소는 한쪽 방향(5′→3′)으로만 합성 → <b>선도 가닥</b>은 연속, <b>지연 가닥</b>은 짧은 조각으로 합성되고 <b>연결 효소</b>가 이어요.</li><li>대장균: 4.6 × 10⁶ / (2 × 1000) = 2300초 ≈ <b>약 38분</b>.</li><li>사람: 원점 1개라면 6.2 × 10⁹ / 100 ≈ 6.2 × 10⁷초 ≈ <b>약 2년</b>인데 실제 S기는 약 8시간 → 복제 원점이 <b>수천 ~ 수만 개</b>.</li></ul>',
      missions: [
        {
          id: 'build', title: '주형에 맞는 새 가닥 만들기',
          goal: '<b>① 헬리케이스로 풀기</b> 후, 두 주형 가닥에 맞는 <b>새 뉴클레오타이드 12개</b>를 모두 연결하세요.',
          hint: 'A는 T와, G는 C와 짝이에요. 주형이 A이면 새 가닥은 T, 주형이 C이면 새 가닥은 G예요. 틀리면 튕겨 나가니 걱정하지 말고 다시 해요.',
          setup() { bdReset(); setMode('build'); },
          check: () => bdCount() === 12, hold: 0.8,
          status: () => mark(S.bd.open) + ' 풀기 &nbsp; ' + mark(bdCount() === 12) + ' 새 뉴클레오타이드 ' + bdCount() + ' / 12',
          explain: '새 가닥은 주형 가닥과 <b>상보적</b>(A–T, G–C)으로만 만들어져요. 그래서 두 딸 DNA는 원래 DNA와 염기 서열이 같고, 각각 <b>원래 가닥 1개 + 새 가닥 1개</b>예요. 틀린 염기는 붙어도 떨어져 나가요(교정).',
        },
        {
          id: 'terms', title: '효소 용어와 하는 일 연결', manual: true,
          goal: '<b>용어 카드 4개</b>를 알맞은 <b>하는 일</b>과 이은 뒤 <b>✔ 확인하기</b>를 누르세요.',
          hint: '헬리케이스는 가닥을 풀고, 프라이머는 합성의 시작점, DNA 중합 효소는 새 뉴클레오타이드를 연결, 연결 효소는 지연 가닥의 조각을 이어요.',
          setup() { fkMatcher.reset(); setMode('fork'); },
          check() {
            const n = fkMatcher.count();
            if (n < 4) { fkMatcher.flag = null; return '용어 4개를 모두 이어 주세요. (' + n + ' / 4)'; }
            const w = fkMatcher.wrong(); fkMatcher.flag = w.length ? Object.fromEntries(w.map((i) => [i, true])) : null;
            if (!w.length) return true;
            return '\'' + FK_TERMS[w[0]].t + '\'의 하는 일을 다시 생각해 보세요. (빨간 선) 애니메이션에서 효소가 어디에서 무엇을 하는지 살펴봐요.';
          },
          explain: '<b>헬리케이스</b>는 이중 가닥을 풀고, <b>프라이머</b>는 합성이 시작되는 짧은 가닥, <b>DNA 중합 효소</b>는 새 뉴클레오타이드를 이어 붙이며, <b>연결 효소</b>는 지연 가닥의 조각들을 이어 줘요. (용어와 하는 일 한 줄만 알면 돼요.)',
        },
        {
          id: 'time', title: '복제 시간 계산과 원점 수',
          goal: '대장균의 <b>복제 시간(분)</b>을 계산해 입력하고, 사람 DNA의 복제 원점 수를 늘려 <b>S기(약 8시간) 안</b>에 끝나게 하세요.',
          hint: '대장균: 4.6 × 10⁶ / 2000 = 2300초 → 2300 / 60 ≈ 38분. 사람은 슬라이더를 오른쪽으로 옮겨 막대가 \'S기 약 8시간\' 선 왼쪽에 오게 해요.',
          setup() { tmReset(); setMode('time'); },
          check: () => S.tm.ecOk && tmFast(), hold: 0.8,
          status: () => mark(S.tm.ecOk) + ' 대장균 약 38분 &nbsp; ' + mark(tmFast()) + ' 사람 8시간 안 (원점 ' + fmtN(ORIG[S.tm.idx]) + '개)',
          explain: '대장균은 4.6 × 10⁶ 염기쌍을 포크 2개(각 초당 1000 염기)로 복제하니 2300초 ≈ <b>38분</b>이에요. 사람은 원점 1개면 약 2년이 걸리지만 실제 S기는 약 8시간이므로, 복제 원점이 <b>수천 개 이상</b>(약 2200개 이상)이라고 추론할 수 있어요.',
        },
      ],
    },
    {
      title: '복제의 의미', short: '복제의 의미', icon: '🔗', phase: '설명',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 복제의 방식(반보존적, 상보적 염기쌍, 복제 원점)을 모형으로 확인했어요.</div><p>이제 복제의 <b>의미</b>를 정리해요. 먼저 <b>세포 주기</b>에서 DNA 상대량이 2 → 4 → 2로 변하는 것을 보고, 복제의 의미(<b>정확성 · 정보의 보존 · 신속성</b>)를 모형에서 본 근거와 연결해요. 마지막으로 <b>가상 모둠 보드</b>에 근거 문장을 올려 서로 비교해요.</p><p>💡 복제 때 틀린 염기가 남으면 <b>새로운 돌연변이</b>가 돼요(앞 차시와 연결).</p>',
      features: ['cycle', 'meaning', 'board'],
      setup() { cyReset(); setMode('cycle'); },
      recap: '복제로 DNA 상대량이 2에서 4로 늘고 분열 뒤 딸세포는 다시 2를 가져요. 반보존적 복제는 상보적 염기쌍(정확성)과 원래 가닥의 유지(보존), 여러 원점(신속성) 덕분에 유전 정보를 정확하고 빠르게 전달해요.',
      summary: '<ul><li><b>세포 주기</b>: 분열 전 DNA 상대량 2 → <b>복제(S기)</b>로 4(염색 분체 2개, 두 DNA의 염기 서열이 같음) → <b>분열</b>로 딸세포마다 2.</li><li>복제가 일어나지 않고 분열하면 딸세포의 DNA 양이 절반이 돼요.</li><li><b>의미</b>: 정확성(주형과 상보적 염기쌍), 정보의 보존(딸 DNA마다 원래 가닥 1개), 신속성(복제 원점 다수와 양방향 진행).</li><li>복제 오류가 남으면 새로운 돌연변이가 돼요.</li><li>협력적 소통: 근거를 한 문장으로 쓰고 서로 비교해 정확한 근거를 가려내요.</li></ul>',
      missions: [
        {
          id: 'cycle', title: 'DNA 상대량 2 → 4 → 2',
          goal: '<b>① DNA 복제</b>와 <b>② 세포 분열</b>을 차례로 눌러 DNA 상대량이 <b>2 → 4 → 2</b>로 변하는 것을 확인하세요.',
          hint: '먼저 ① DNA 복제(S기)를 누르고, 염색 분체 2개가 생기면 ② 세포 분열을 눌러요.',
          setup() { cyReset(); setMode('cycle'); },
          check: () => cyDone(), hold: 0.8,
          status: () => mark(S.cy.ph >= 2 && !S.cy.nodiv) + ' 복제 (2 → 4) &nbsp; ' + mark(cyDone()) + ' 분열 (4 → 딸세포 2)',
          explain: '복제(S기)로 DNA 상대량이 <b>2에서 4</b>가 되고 염색체는 <b>염색 분체 2개</b>(두 DNA의 염기 서열이 같음)로 이루어져요. 분열하면 염색 분체가 갈라져 딸세포마다 상대량 <b>2</b>를 가져요.',
        },
        {
          id: 'meaning', title: '의미와 근거 연결, 보드에 올리기', manual: true,
          goal: '복제의 <b>의미 3개</b>를 근거와 이은 뒤, 모둠 보드에 <b>정확성의 근거로 알맞은 문장</b>을 모두 골라 올리고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '정확성 = 상보적 염기쌍, 정보의 보존 = 딸 DNA마다 원래 가닥 1개, 신속성 = 복제 원점 여러 개. 보드에는 \'상보적 염기쌍으로만 연결\'과 \'원래 가닥이 남음\' 문장을 올려요.',
          setup() { mnMatcher.reset(); pbClear(); setMode('meaning'); },
          check() {
            const n = mnMatcher.count();
            if (n < 3) { mnMatcher.flag = null; return '의미 카드 3개를 모두 근거와 이어 주세요. (' + n + ' / 3)'; }
            const w = mnMatcher.wrong(); mnMatcher.flag = w.length ? Object.fromEntries(w.map((i) => [i, true])) : null;
            if (w.length) return '\'' + MNL[w[0]].t + '\'' + josa(MNL[w[0]].t, '은', '는') + ' 다른 근거와 이어져요. 빨간 선을 다시 생각해 보세요.';
            if (!S.pb.posted.length) return '모둠 보드 화면에서 문장을 골라 올려 주세요.';
            const bad = S.pb.posted.map((id) => PBS.find((s) => s.id === id)).filter((s) => !s.ok);
            if (bad.length) return bad[0].id === 's3' ? '복제 원점은 \'신속성\'의 근거예요. 정보를 정확히 전달하는 근거는 아니에요.' : '반보존적 복제에서는 원래 가닥이 딸 DNA에 남아요. 원래 DNA가 사라진다는 문장은 틀렸어요.';
            if (!pbOk()) return '알맞은 문장이 하나 더 있어요. 정확성과 정보 보존의 근거를 모두 올려요.';
            return true;
          },
          explain: '<b>정확성</b>: 원래 가닥을 주형으로 상보적 염기쌍(A–T, G–C)으로만 연결 → 염기 서열이 같아요. <b>정보의 보존</b>: 딸 DNA마다 원래 가닥이 1개 남아요. <b>신속성</b>: 복제 원점이 여러 개이고 양쪽으로 진행해요. 정확한 전달의 근거로는 앞의 두 가지를 올려요.',
        },
        {
          type: 'quiz', title: '복제 없이 분열하면',
          goal: '정상 딸세포의 DNA 상대량은 <b>2</b>예요. 만약 DNA를 <b>복제하지 않고</b> 세포가 분열한다면 딸세포 하나의 DNA 양은?',
          setup() { setMode('cycle'); },
          choices: ['2로 같다', '1로 절반이 된다', '4로 두 배가 된다', '0이 된다'],
          answer: 1,
          feedback: ['복제하지 않으면 분열 전 DNA 양(2)을 두 세포가 나눠 가지므로 같을 수 없어요.', '', '4는 복제가 끝난 분열 전 세포의 양이에요. 복제가 없으면 늘어날 수 없어요.', '딸세포에도 DNA가 일부 전달되니 0은 아니에요. 다만 절반으로 줄어요.'],
          explain: '복제가 없으면 분열 전 DNA(상대량 2)를 두 딸세포가 나눠 가져 <b>각각 1</b>, 즉 <b>절반</b>이 돼요. 그래서 세포는 분열 전에 DNA를 복제해 딸세포가 같은 양의 같은 정보를 가지게 해요. (복제된 염색 분체 2개는 염기 서열이 같아요.)',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hg-dna-replication', mount: '#game', badge: '복제 탐정', homeHref: '../../index.html#hg',
    featureLabels: { hyp: '🧩 세 가지 가설', tube: '🧪 밀도 띠 실험', build: '🧬 새 가닥 만들기', fork: '🍴 복제 거품과 효소', time: '⏱ 복제 시간', cycle: '🔄 세포 주기', meaning: '🔗 복제의 의미', board: '📌 모둠 보드' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 읽음 칸 ---------- */
  function readouts() {
    const m = S.mode;
    if (m === 'hyp') setReads(['가설', HYP[S.hy.h].n, '복제 횟수', S.hy.g + '회 (DNA ' + Math.pow(2, S.hy.g) + '개)', '예측', hyN() + ' / 6']);
    else if (m === 'tube') { const c = tbCounts(S.tb.n); setReads(['복제 횟수', S.tb.n + '회', 'DNA 분자', c.tot + '개', '중간 : 가벼운', S.tb.n === 0 ? '무거운 DNA만' : S.tb.n === 1 ? '중간만' : S.tb.n === 2 ? '1 : 1' : (S.tb.n === 3 && S.tb.ok3) ? '1 : 3' : (S.tb.n === 4 && S.tb.ok4) ? '1 : 7' : '계산해 보세요']); }
    else if (m === 'build') setReads(['놓은 염기', bdCount() + ' / 12', '풀린 정도', Math.round(S.bd.prog * 100) + ' %', '딸 DNA', bdCount() === 12 ? '2개 (같음)' : '—']);
    else if (m === 'fork') setReads(['이은 선', fkMatcher.count() + ' / 4', '효소 용어', '4가지', '합성 방향', '한쪽(5′→3′)']);
    else if (m === 'time') setReads(['대장균', S.tm.ecOk ? '약 38분' : '? 분', '사람 원점', fmtN(ORIG[S.tm.idx]) + '개', '사람 복제', fmtT(hSec(ORIG[S.tm.idx]))]);
    else if (m === 'cycle') setReads(['세포 주기', ['G₁기', 'S기', S.cy.dv > 0 && S.cy.dv < 1 ? 'M기' : 'G₂기', '분열 후'][S.cy.ph], 'DNA 상대량', fmt1(cyAmt()), '염색 분체', S.cy.ph >= 2 && !S.cy.nodiv && S.cy.dv === 0 ? '2개 (같음)' : '—']);
    else if (m === 'meaning') setReads(['이은 선', mnMatcher.count() + ' / 3', '의미', '정확성 · 보존 · 신속성', '근거', '모형에서']);
    else setReads(['올린 문장', S.pb.posted.length + '개', '모둠원 글', '3개 (가상)', '정확한 근거', pbOk() ? '모두 올림' : '—']);
  }

  /* ---------- 시작 ---------- */
  tbReset(); tmReset(); S.tm.calcOn = false; hyReset();
  setMode('hyp');
  let lastFree = false, lastLv = -1;
  SciSim.loop((dt, t) => {
    clock = t; S.t = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (game && game.level !== lastLv) { lastLv = game.level; updateCtl(); }
    view.apply(); ctx.clearRect(0, 0, VW, VH);
    bgFill('#eef4f2', '#e3ece8');
    switch (S.mode) {
      case 'hyp': hyDraw(dt, t); break;
      case 'tube': tbDraw(dt, t); break;
      case 'build': bdDraw(dt, t); break;
      case 'fork': fkDraw(dt, t); break;
      case 'time': tmDraw(dt, t); break;
      case 'cycle': cyDraw(dt, t); break;
      case 'meaning': mnDraw(dt, t); break;
      case 'board': pbDraw(dt, t); break;
    }
    FX.update(dt); FX.draw();
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(241,246,243,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, PHONE, get game() { return game; }, levels, setMode, updateCtl, hyPick, hySet, PERM, hyCard, hypMols, bandsOf, tbSet, tbMatch, tbBands, tbCounts, BDG, bdPlace, bdSlot, bdCount, bdOpenGo, bdOpened, bdX, BD_TOP, BD_BOT, fkMatcher, FKG, FK_TERMS, FK_FUNC,
    mnMatcher, MNL, MNR, MNG, ORIG, tmFast, hSec, cyRep, cyDiv, cyNoRep, cyDone, PBS, pbPost, pbOk, hyN,
  };
})();
