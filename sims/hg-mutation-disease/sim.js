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
      if (e.kind === 'text') T(e.x, e.y - 24 * p, e.text, e.size || 15, e.color || '#16a34a', 'center', 800, { alpha: 1 - p * p, stroke: '#fff', strokeWidth: 4 });
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
     고등학교 생물의 유전 · Ⅰ. 유전자와 유전물질 - 돌연변이와 유전병 조사 (단원 59, 5차시)
     성취기준 [12유전01-04] 염색체와 유전자 이상에 대해 이해하고, 사람의 유전병을 발병 원인별 조사 계획을 세워 조사할 수 있다. (뒷부분: 유전자 이상, 조사 계획)
     ① 모형: 점 돌연변이  ② 탐구: 틀 이동  ③ 분석: 발병 원인  ④ 소통: 조사 계획
     (유전병 카드와 요약 자료는 모두 교육용 가상 자료이고, 돌연변이율은 예시 값이에요)
     ========================================================= */
  const S = { mode: 'point', fade: 0, t: 0 };
  let game = null;
  const ease = SciSim.ease;
  const ctlNodes = $$('#ctrlCard .control');
  const BASE_COL = { A: '#ef4444', U: '#f59e0b', G: '#16a34a', C: '#2563eb' };
  function chipOn(root, val) { $$('button', root).forEach((b) => b.classList.toggle('on', String(b.dataset.v) === String(val))); }

  /* ---------- 유전 부호 (표준 코돈표) ---------- */
  const AA_STR = 'FFLLSSSSYY**CC*WLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG';
  const AA3 = { F: 'Phe', L: 'Leu', S: 'Ser', Y: 'Tyr', C: 'Cys', W: 'Trp', P: 'Pro', H: 'His', Q: 'Gln', R: 'Arg', I: 'Ile', M: 'Met', T: 'Thr', N: 'Asn', K: 'Lys', V: 'Val', A: 'Ala', D: 'Asp', E: 'Glu', G: 'Gly', '*': '종결' };
  const AAKO = { F: '페닐알라닌', L: '류신', S: '세린', Y: '타이로신', C: '시스테인', W: '트립토판', P: '프롤린', H: '히스티딘', Q: '글루타민', R: '아르지닌', I: '아이소류신', M: '메싸이오닌', T: '트레오닌', N: '아스파라긴', K: '라이신', V: '발린', A: '알라닌', D: '아스파르트산', E: '글루탐산', G: '글리신', '*': '종결 코돈' };
  const codonAA = (c) => { const b = 'UCAG'; return AA_STR[16 * b.indexOf(c[0]) + 4 * b.indexOf(c[1]) + b.indexOf(c[2])]; };
  function translate(chars) {
    const aa = [];
    for (let i = 0; i + 3 <= chars.length; i += 3) { const a = codonAA(chars.slice(i, i + 3).join('')); aa.push(a); if (a === '*') break; }
    return aa;
  }
  const strip = (aa) => (aa.length && aa[aa.length - 1] === '*' ? aa.slice(0, -1) : aa);
  /* 두 사슬의 달라진 부분 (앞 · 뒤에서 같은 아미노산은 빼요) */
  function diffChains(O, M) {
    const o = strip(O), m = strip(M); let p = 0;
    while (p < o.length && p < m.length && o[p] === m[p]) p++;
    let s = 0; while (s < o.length - p && s < m.length - p && o[o.length - 1 - s] === m[m.length - 1 - s]) s++;
    const stopO = O.length && O[O.length - 1] === '*' ? o.length : -1, stopM = M.length && M[M.length - 1] === '*' ? m.length : -1;
    return { p, s, om: o.length - p - s, mm: m.length - p - s, stopO, stopM, lenO: o.length, lenM: m.length, stopNew: stopM >= 0 && stopM !== stopO };
  }

  /* ---------- 염기 서열 장면 (원래 mRNA와 변한 mRNA) ---------- */
  const SAMPLES = {
    prac: { name: '연습용 mRNA', seq: 'AUGGAACCAUGGUUUAAAUAA', num: false },
    hbb: { name: 'HBB 유전자 일부', seq: 'AUGGUGCACCUGACUCCUGAGGAG', num: true },
  };
  const MAXLEN = 24;
  const SQ = PHONE
    ? { cpr: 4, tw: 33, th: 34, gap: 2, pitch: 76, top: 52, W: 440 }
    : { cpr: 8, tw: 27, th: 32, gap: 2, pitch: 80, top: 56, W: 744 };
  const PN = PHONE
    ? { orig: { x: 8, y: 8, w: 464, h: 206 }, mut: { x: 8, y: 222, w: 464, h: 222 }, info: { x: 8, y: 452, w: 464, h: 180 } }
    : { orig: { x: 14, y: 8, w: 772, h: 136 }, mut: { x: 14, y: 152, w: 772, h: 152 }, info: { x: 14, y: 312, w: 772, h: 236 } };
  function slotXY(idx, panel) {
    const g = Math.floor(idx / 3), row = Math.floor(g / SQ.cpr), col = g % SQ.cpr, cw = SQ.W / SQ.cpr, j = idx % 3;
    return { x: panel.x + (panel.w - SQ.W) / 2 + col * cw + (cw - (3 * SQ.tw + 2 * SQ.gap)) / 2 + j * (SQ.tw + SQ.gap), y: panel.y + SQ.top + row * SQ.pitch };
  }
  let tid = 0;
  const mkTile = (ch) => ({ id: ++tid, ch, prev: ch, x: -999, y: 0, tx: 0, ty: 0, a: 1, flip: 0, init: false, drop: 0 });
  const SEQ = { key: 'prac', orig: [], cur: [], sel: -1, edit: null, ghosts: [], made: { silent: false, missense: false, nonsense: false, sickle: false }, rbc: 0, last: null, caret: 3 };
  function seqLoad(key) {
    SEQ.key = key; SEQ.orig = SAMPLES[key].seq.split(''); SEQ.cur = SEQ.orig.map(mkTile); SEQ.sel = -1; SEQ.edit = null; SEQ.ghosts = []; SEQ.last = null; hideHint();
  }
  seqLoad('prac');
  const curChars = () => SEQ.cur.map((t) => t.ch);
  const ncod = (n) => Math.floor(n / 3);
  function seqUpdate(dt) {
    SEQ.cur.forEach((t, i) => {
      const p = slotXY(i, PN.mut); t.tx = p.x; t.ty = p.y;
      if (!t.init) { t.x = t.tx; t.y = t.ty; t.init = true; }
      t.x = RM ? t.tx : approach(t.x, t.tx, dt, 10); t.y = RM ? t.ty : approach(t.y, t.ty, dt, 10);
      t.a = RM ? 1 : approach(t.a, 1, dt, 9); t.flip = Math.max(0, t.flip - dt * (RM ? 20 : 3));
    });
    for (let i = SEQ.ghosts.length - 1; i >= 0; i--) { const g = SEQ.ghosts[i]; g.age += dt; g.t.y += 80 * dt; g.t.a = Math.max(0, 1 - g.age / 0.6); if (g.age > 0.6) SEQ.ghosts.splice(i, 1); }
    SEQ.rbc = RM ? sickleNow() : approach(SEQ.rbc, sickleNow(), dt, 2.2);
  }
  const sickleNow = () => (SEQ.key === 'hbb' && SEQ.cur.length === 24 && codonAA(SEQ.cur.slice(18, 21).map((t) => t.ch).join('')) === 'V' ? 1 : 0);

  function drawTile(t, o) {
    o = o || {};
    const w = SQ.tw, h = SQ.th, sx = t.flip > 0 ? Math.abs(Math.cos(t.flip * Math.PI)) : 1, ch = t.flip > 0.5 ? t.prev : t.ch, col = BASE_COL[ch] || '#64748b';
    ctx.save(); ctx.globalAlpha = o.alpha == null ? t.a : o.alpha; ctx.translate(t.x + w / 2, t.y + h / 2 - (o.sel ? 3 : 0)); ctx.scale(sx, 1);
    const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2); g.addColorStop(0, C.shade(col, 0.3)); g.addColorStop(1, C.shade(col, -0.12));
    D.shadow(() => { D.roundRect(-w / 2, -h / 2, w, h, 7); ctx.fillStyle = g; ctx.fill(); }, { blur: o.sel ? 9 : 3, y: o.sel ? 4 : 1 });
    ctx.strokeStyle = o.sel ? '#f59e0b' : C.shade(col, -0.35); ctx.lineWidth = o.sel ? 3.5 : 1.2; D.roundRect(-w / 2, -h / 2, w, h, 7); ctx.stroke();
    T(0, 6, ch, PHONE ? 19 : 17, '#fff', 'center', 800, { stroke: C.shade(col, -0.4), strokeWidth: 2.5 });
    ctx.restore();
  }
  /* items: [{x, y, ch, ...}] 를 코돈 상자 · 아미노산 칩과 함께 그려요. chain: translate() 결과, marks: {changed:Set, newStop:index, notch:index|null} */
  function drawCodons(panel, items, chain, marks, o) {
    o = o || {};
    const n = items.length, ng = Math.ceil(n / 3); let prev = null;
    const rect = (g) => { const a = items[3 * g], last = items[Math.min(n - 1, 3 * g + 2)]; return { a, last, full: 3 * g + 2 < n, bx: a.x - 3, bw: last.x + SQ.tw - a.x + 6, by: a.y - 5, bh: SQ.th + 10 }; };
    for (let g = 0; g < ng; g++) {
      const r = rect(g);
      ctx.save(); ctx.globalAlpha = Math.min(r.a.a == null ? 1 : r.a.a, 1);
      D.roundRect(r.bx, r.by, r.bw, r.bh, 9); ctx.fillStyle = r.full ? '#f8fafc' : '#f1f5f9'; ctx.fill();
      ctx.setLineDash(r.full ? [] : [4, 3]); ctx.strokeStyle = r.full ? '#94a3b8' : '#cbd5e1'; ctx.lineWidth = 1.6; ctx.stroke(); ctx.setLineDash([]);
      ctx.restore();
    }
    if (o.tiles) o.tiles();
    for (let g = 0; g < ng; g++) {
      const r = rect(g), bx = r.bx, bw = r.bw, by = r.by, bh = r.bh;
      if (!r.full) { T(bx + bw / 2, by + bh + 18, '남은 염기', 12.5, '#94a3b8', 'center', 700); continue; }
      const aa = g < chain.length ? chain[g] : null, cy = by + bh + 8, cwid = Math.max(40, bw - 4), cx = bx + bw / 2;
      const changed = marks && marks.changed && marks.changed.has(g), newStop = marks && marks.newStop === g;
      let fill = '#ede9fe', stroke = '#8b5cf6', txt = '#4c1d95', label = aa ? AA3[aa] : '—';
      if (o.num && aa && aa !== '*' && g >= 1) label += ' ' + g;
      if (aa === '*') { fill = '#fee2e2'; stroke = '#ef4444'; txt = '#991b1b'; label = '종결'; }
      if (changed) { fill = '#ffedd5'; stroke = '#f97316'; txt = '#9a3412'; }
      if (newStop) { fill = '#fecaca'; stroke = '#dc2626'; }
      if (!aa) { fill = '#f1f5f9'; stroke = '#cbd5e1'; txt = '#94a3b8'; }
      ctx.save(); ctx.globalAlpha = aa ? 1 : 0.6;
      D.roundRect(cx - cwid / 2, cy, cwid, 26, 13); ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = stroke; ctx.lineWidth = changed || newStop ? 3 : 1.6; ctx.stroke();
      T(cx, cy + 18, label, 14, txt, 'center', 800); ctx.restore();
      if (prev && prev.row === Math.floor(g / SQ.cpr) && aa && prev.aa && prev.aa !== '*') {
        ctx.strokeStyle = '#a78bfa'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(prev.x2, cy + 13); ctx.lineTo(cx - cwid / 2, cy + 13); ctx.stroke();
      }
      prev = { row: Math.floor(g / SQ.cpr), x2: cx + cwid / 2, aa };
    }
    if (marks && marks.notch != null && marks.notchGroup != null) {
      const g = marks.notchGroup, a = items[Math.min(n - 1, 3 * g)];
      if (a) { D.label(a.x - 4, a.y + SQ.th + 50, '▲ ' + marks.notchText, { bg: '#dc2626', size: 12.5, align: 'left' }); }
    }
  }
  function drawOrigPanel() {
    const P = PN.orig; panel(P.x, P.y, P.w, P.h, 16, '#fff');
    T(P.x + 16, P.y + 26, '원래 mRNA  5′ → 3′', PHONE ? 15 : 16, '#334155', 'left', 800);
    T(P.x + P.w - 16, P.y + 26, SAMPLES[SEQ.key].name + (SEQ.key === 'hbb' ? ' (아미노산 번호는 Met을 뺀 번호)' : ''), PHONE ? 12.5 : 13.5, '#64748b', 'right', 700);
    const items = SEQ.orig.map((ch, i) => { const p = slotXY(i, P); return { x: p.x, y: p.y, ch, a: 1 }; });
    SEQ.oChain = translate(SEQ.orig);
    drawCodons(P, items, SEQ.oChain, null, { num: SAMPLES[SEQ.key].num, tiles: () => items.forEach((it) => drawTile({ x: it.x, y: it.y, ch: it.ch, prev: it.ch, a: 1, flip: 0 })) });
  }
  function seqMarks(chM) {
    const df = diffChains(SEQ.oChain, chM), ch = new Set();
    for (let i = 0; i < df.mm; i++) ch.add(df.p + i);
    const marks = { changed: ch, newStop: df.stopNew ? df.stopM : null };
    if (df.om > 0 && df.mm === 0 && !df.stopNew) { marks.notch = df.p; marks.notchGroup = df.p; marks.notchText = '소실'; }
    return { df, marks };
  }
  function drawMutPanel(title, extra) {
    const P = PN.mut; panel(P.x, P.y, P.w, P.h, 16, '#fff');
    if (S.mode === 'frame') T(P.x + P.w - 16, P.y + 26, title, PHONE ? 13.5 : 15, '#9a3412', 'right', 800); else T(P.x + 16, P.y + 26, title, PHONE ? 15 : 16, '#9a3412', 'left', 800);
    const items = SEQ.cur;
    const chM = translate(curChars()); SEQ.mChain = chM;
    const r = seqMarks(chM);
    drawCodons(P, items, chM, r.marks, { num: SAMPLES[SEQ.key].num, tiles: () => { items.forEach((t, i) => drawTile(t, { sel: S.mode === 'point' && SEQ.sel === i })); SEQ.ghosts.forEach((g) => drawTile(g.t)); } });
    if (extra) extra(P, items);
    return r;
  }

  /* 적혈구 (둥근 모양 → 낫 모양으로 변형) */
  const RBC_N = [], RBC_S = [[-1, 0], [-0.8, -0.6], [-0.3, -0.95], [0.4, -0.9], [0.95, -0.5], [0.35, -0.5], [-0.1, 0], [0.35, 0.5], [0.95, 0.5], [0.4, 0.9], [-0.3, 0.95], [-0.8, 0.6]];
  for (let k = 0; k < 12; k++) { const a = Math.PI + k * Math.PI / 6; RBC_N.push([Math.cos(a), Math.sin(a)]); }
  function drawRBC(cx, cy, R, m) {
    const pts = RBC_N.map((p, i) => [lerp(p[0], RBC_S[i][0], m) * R, lerp(p[1], RBC_S[i][1], m) * R]);
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(m * -0.35);
    const g = ctx.createRadialGradient(-R * 0.3, -R * 0.3, R * 0.1, 0, 0, R * 1.1); g.addColorStop(0, '#f87171'); g.addColorStop(1, '#b91c1c');
    ctx.beginPath(); const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    let m0 = mid(pts[11], pts[0]); ctx.moveTo(m0[0], m0[1]);
    for (let i = 0; i < 12; i++) { const nx = pts[(i + 1) % 12], md = mid(pts[i], nx); ctx.quadraticCurveTo(pts[i][0], pts[i][1], md[0], md[1]); }
    ctx.closePath(); D.shadow(() => { ctx.fillStyle = g; ctx.fill(); }, { blur: 8, y: 3 }); ctx.strokeStyle = '#7f1d1d'; ctx.lineWidth = 2; ctx.stroke();
    if (m < 0.7) { ctx.globalAlpha = 1 - m / 0.7; ctx.beginPath(); ctx.ellipse(0, 0, R * 0.45, R * 0.3, 0, 0, TAU); ctx.fillStyle = 'rgba(254,202,202,.55)'; ctx.fill(); }
    ctx.restore();
  }

  /* ---------- ① 점 돌연변이 ---------- */
  function pointClass() {
    if (!SEQ.edit) return null;
    const pos = SEQ.edit.pos, g = Math.floor(pos / 3);
    if (3 * g + 3 > SEQ.cur.length) return { kind: 'left', g };
    const oc = SEQ.orig.slice(3 * g, 3 * g + 3).join(''), mc = curChars().slice(3 * g, 3 * g + 3).join('');
    const aO = codonAA(oc), aM = codonAA(mc), stopO = SEQ.oChain.indexOf('*');
    if (stopO >= 0 && g > stopO) return { kind: 'after', g, oc, mc, aO, aM };
    let kind = aO === aM ? 'silent' : aO === '*' ? 'stoploss' : aM === '*' ? 'nonsense' : 'missense';
    return { kind, g, oc, mc, aO, aM };
  }
  const PT_LAB = { silent: ['침묵 돌연변이', '#16a34a'], missense: ['과오 돌연변이', '#d97706'], nonsense: ['넌센스 돌연변이', '#dc2626'], stoploss: ['종결 코돈 소실', '#7c3aed'], left: ['번역에 쓰이지 않는 염기', '#64748b'], after: ['종결 코돈 뒤라 번역되지 않아요', '#64748b'] };
  function pointNote() {
    const c = pointClass();
    if (!c) return;
    if (['silent', 'missense', 'nonsense'].indexOf(c.kind) >= 0) { if (!SEQ.made[c.kind]) { SEQ.made[c.kind] = true; const t = SEQ.cur[SEQ.edit.pos]; parts.burst(t.tx + SQ.tw / 2, t.ty, { count: 14, speed: 150, life: 0.8 }); Sound.success(); } }
    if (SEQ.key === 'hbb' && SEQ.edit.pos === 19 && SEQ.edit.base === 'U' && !SEQ.made.sickle) { SEQ.made.sickle = true; Sound.success(); }
  }
  function pointSelect(i) {
    if (SEQ.edit && SEQ.edit.pos !== i) { const t = SEQ.cur[SEQ.edit.pos]; t.prev = t.ch; t.ch = SEQ.orig[SEQ.edit.pos]; t.flip = 1; SEQ.edit = null; }
    SEQ.sel = i; Sound.tick(); updateCtl();
  }
  function pointBase(b) {
    if (SEQ.sel < 0) { showHint('먼저 위쪽 변한 mRNA에서 바꿀 염기를 눌러 고르세요.'); Sound.fail(); return; }
    const t = SEQ.cur[SEQ.sel];
    if (t.ch === b) return;
    t.prev = t.ch; t.ch = b; t.flip = 1;
    SEQ.edit = b === SEQ.orig[SEQ.sel] ? null : { pos: SEQ.sel, base: b };
    Sound.click(); pointNote(); updateCtl();
  }
  function pointReset() { const k = SEQ.key; SEQ.cur.forEach((t, i) => { if (t.ch !== SEQ.orig[i]) { t.prev = t.ch; t.ch = SEQ.orig[i]; t.flip = 1; } }); SEQ.edit = null; SEQ.sel = -1; updateCtl(); }
  function pointDraw(dt, t) {
    seqUpdate(dt);
    drawOrigPanel();
    const r = drawMutPanel('변한 mRNA  (염기를 눌러 바꿔 보세요)');
    const P = PN.info; panel(P.x, P.y, P.w, P.h, 16, '#fff');
    const c = pointClass();
    if (!c) {
      T(P.x + 16, P.y + 30, '결과', 16, '#334155', 'left', 800);
      textBlock(P.x + 16, P.y + 62, P.w - (SEQ.key === 'hbb' ? (PHONE ? 118 : 250) : 32), '변한 mRNA에서 염기 하나를 눌러 고르고 새 염기를 골라 보세요. 아미노산 사슬이 어떻게 달라지는지 살펴봐요.', PHONE ? 14 : 15, '#475569', PHONE ? 20 : 22, 700);
    } else {
      const lab = PT_LAB[c.kind];
      D.label(P.x + 16, P.y + 30, lab[0], { bg: lab[1], size: PHONE ? 15 : 17, align: 'left' });
      let y = P.y + 66; const lh = PHONE ? 21 : 24, fs = PHONE ? 13.5 : 15, w = P.w - (SEQ.key === 'hbb' ? (PHONE ? 118 : 250) : 32);
      if (c.oc) { T(P.x + 16, y, '코돈  ' + c.oc + ' → ' + c.mc, fs + 1, '#26324a', 'left', 800); y += lh; T(P.x + 16, y, '아미노산  ' + AA3[c.aO] + ' → ' + AA3[c.aM] + (c.aO !== '*' && c.aM !== '*' ? '  (' + AAKO[c.aO] + ' → ' + AAKO[c.aM] + ')' : ''), fs, '#26324a', 'left', 800); y += lh + 4; }
      const ex = { silent: '코돈은 달라졌지만 같은 아미노산을 지정해서 단백질은 그대로예요.', missense: '아미노산 하나가 다른 아미노산으로 바뀌었어요. 단백질의 기능이 달라질 수 있어요.', nonsense: '아미노산 자리에 종결 코돈이 생겨서 단백질이 ' + strip(SEQ.mChain).length + '개 아미노산에서 짧게 끝나요.', stoploss: '종결 코돈이 사라져서 번역이 계속돼요.', left: '코돈을 이루지 못하는 남은 염기라 아미노산에 영향이 없어요.', after: '종결 코돈 뒤쪽은 번역되지 않아 단백질이 그대로예요.' };
      textBlock(P.x + 16, y, w, ex[c.kind], fs, '#475569', lh, 700);
    }
    // 낫 모양 적혈구
    if (SEQ.key === 'hbb') {
      const rx = P.x + P.w - (PHONE ? 54 : 110), ry = P.y + (PHONE ? 62 : 106), R = PHONE ? 32 : 56;
      drawRBC(rx, ry, R, SEQ.rbc);
      TF(rx, P.y + P.h - (PHONE ? 52 : 70), SEQ.rbc > 0.5 ? '낫 모양 적혈구' : '둥근 적혈구', PHONE ? 104 : 190, PHONE ? 14 : 16, 11, SEQ.rbc > 0.5 ? '#b91c1c' : '#475569', 'center', 800);
      if (SEQ.rbc > 0.5) TF(rx, P.y + P.h - (PHONE ? 32 : 46), 'Glu → Val (6번)', PHONE ? 104 : 190, 13.5, 10.5, '#7f1d1d', 'center', 700);
    }
    // 만든 유형 칩
    const mk = [['silent', '침묵'], ['missense', '과오'], ['nonsense', '넌센스']].concat(SEQ.key === 'hbb' || SEQ.made.sickle ? [['sickle', '낫 모양']] : []);
    if (!PHONE) mk.forEach((q, i) => { const bx = P.x + 16 + i * 110, by = P.y + P.h - 24; D.label(bx, by, (SEQ.made[q[0]] ? '✔ ' : '') + q[1], { bg: SEQ.made[q[0]] ? '#16a34a' : '#e2e8f0', color: SEQ.made[q[0]] ? '#fff' : '#64748b', size: 13, align: 'left' }); });
  }
  const pointPT = {
    down(p) {
      for (let i = 0; i < SEQ.cur.length; i++) { const t = SEQ.cur[i]; if (p.x >= t.x - 2 && p.x <= t.x + SQ.tw + 2 && p.y >= t.y - 4 && p.y <= t.y + SQ.th + 4) { pointSelect(i); return false; } }
      return false;
    },
    hover(p) { return SEQ.cur.some((t) => p.x >= t.x && p.x <= t.x + SQ.tw && p.y >= t.y && p.y <= t.y + SQ.th) ? 'pointer' : 'default'; },
  };


  /* =========================================================
     ② 틀 이동: 삽입 · 결실로 읽기틀이 밀리는 모습
     ========================================================= */
  const FS = { op: 'ins', pos: 3, base: 'G', shift: false, del3: false, last: null, ins: false };
  function fsRange() {
    const len = SEQ.cur.length, sl = $('#sPos');
    let mn = 1, mx = len, lab = '결실할 염기 번호';
    if (FS.op === 'ins') { mn = 0; mx = len; lab = '삽입 위치 (염기 몇 개 뒤)'; }
    else if (FS.op === 'del3') { mn = 1; mx = Math.max(1, Math.floor(len / 3)); lab = '결실할 코돈 번호'; }
    FS.pos = clamp(FS.pos, mn, mx);
    sl.min = mn; sl.max = mx; sl.value = FS.pos; $('#posLab').textContent = lab; $('#oPos').textContent = String(FS.pos);
    sl.style.setProperty('--pct', ((FS.pos - mn) / Math.max(1, mx - mn)) * 100 + '%');
    $('#baseBox').hidden = FS.op !== 'ins';
  }
  function fsOpSet(op) { FS.op = op; if (op === 'ins') FS.pos = Math.min(3, SEQ.cur.length); else if (op === 'del3') FS.pos = 2; else FS.pos = 4; fsRange(); updateCtl(); }
  function fsApply() {
    const len = SEQ.cur.length;
    if (FS.op === 'ins') {
      if (len >= MAXLEN) { showHint('염기가 너무 길어져요. (최대 ' + MAXLEN + '개) [처음 mRNA로]를 눌러 다시 시작해 보세요.'); Sound.fail(); return; }
      const t = mkTile(FS.base), p = slotXY(FS.pos, PN.mut); t.x = p.x; t.y = p.y - 52; t.a = 0.1; t.init = true; SEQ.cur.splice(FS.pos, 0, t);
    } else if (FS.op === 'del1') {
      if (len <= 3) { Sound.fail(); return; }
      const g = SEQ.cur.splice(FS.pos - 1, 1); g.forEach((t) => SEQ.ghosts.push({ t, age: 0 }));
    } else {
      if (len <= 6) { Sound.fail(); return; }
      const g = SEQ.cur.splice((FS.pos - 1) * 3, 3); g.forEach((t) => SEQ.ghosts.push({ t, age: 0 }));
    }
    const d = SEQ.cur.length - SEQ.orig.length;
    SEQ.last = { op: FS.op, d };
    if ((FS.op === 'ins' || FS.op === 'del1') && d % 3 !== 0) { if (!FS.shift) Sound.success(); FS.shift = true; }
    if (FS.op === 'del3' && d === -3) { if (!FS.del3) Sound.success(); FS.del3 = true; }
    Sound.click(); fsRange(); hideHint(); updateCtl();
  }
  function fsReset() { SEQ.cur = SEQ.orig.map(mkTile); SEQ.ghosts = []; SEQ.last = null; fsOpSet(FS.op); }
  function fsInfo() {
    const cur = curChars(), d = cur.length - SEQ.orig.length, same = cur.join('') === SEQ.orig.join('');
    const ch = translate(cur), oc = SEQ.oChain || translate(SEQ.orig), df = diffChains(oc, ch);
    return { d, same, ch, oc, df, shift: !same && d % 3 !== 0 };
  }
  function frameDraw(dt, t) {
    seqUpdate(dt);
    drawOrigPanel();
    const r = drawMutPanel('변한 mRNA  (읽기틀: 3염기씩 묶음)', (P, items) => {
      // 삽입 위치 · 결실 위치 표시
      const pulse = 0.6 + 0.4 * Math.sin(t * 6), n = items.length;
      if (FS.op === 'ins') {
        let x, y;
        if (FS.pos < n) { x = items[FS.pos].tx - 5; y = items[FS.pos].ty; } else { x = items[n - 1].tx + SQ.tw + 5; y = items[n - 1].ty; }
        ctx.save(); ctx.globalAlpha = pulse; ctx.strokeStyle = '#2563eb'; ctx.lineWidth = 3; ctx.setLineDash([5, 3]); ctx.beginPath(); ctx.moveTo(x, y - 10); ctx.lineTo(x, y + SQ.th + 10); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = '#2563eb'; ctx.beginPath(); ctx.moveTo(x - 7, y - 16); ctx.lineTo(x + 7, y - 16); ctx.lineTo(x, y - 7); ctx.fill(); ctx.restore();
        D.label(x, y - 28, FS.base + ' 삽입', { bg: BASE_COL[FS.base], size: 12.5 });
      } else {
        const idxs = FS.op === 'del1' ? [FS.pos - 1] : [3 * (FS.pos - 1), 3 * (FS.pos - 1) + 1, 3 * (FS.pos - 1) + 2];
        const ts = idxs.map((i) => items[i]).filter(Boolean);
        if (ts.length) {
          const x0 = ts[0].tx - 4, x1 = ts[ts.length - 1].tx + SQ.tw + 4, y = ts[0].ty;
          ctx.save(); ctx.globalAlpha = pulse; ctx.strokeStyle = '#dc2626'; ctx.lineWidth = 3.5; D.roundRect(x0, y - 6, x1 - x0, SQ.th + 12, 9); ctx.stroke(); ctx.restore();
          D.label((x0 + x1) / 2, y - 22, FS.op === 'del1' ? '이 염기 결실' : '이 코돈 결실', { bg: '#dc2626', size: 12.5 });
        }
      }
    });
    const P = PN.info; panel(P.x, P.y, P.w, P.h, 16, '#fff');
    const f = fsInfo(), df = f.df, fs = PHONE ? 13.5 : 15, lh = PHONE ? 21 : 24;
    const lab = f.same ? ['원래와 같아요', '#64748b'] : f.shift ? ['틀 이동!', '#dc2626'] : ['읽기틀 유지', '#16a34a'];
    D.label(P.x + 16, P.y + 30, lab[0], { bg: lab[1], size: PHONE ? 15 : 17, align: 'left' });
    let y = P.y + 66;
    T(P.x + 16, y, '염기 수  ' + SEQ.orig.length + '개 → ' + SEQ.cur.length + '개' + (f.d === 0 ? '' : f.d % 3 === 0 ? ' (3의 배수만큼 변해요)' : ' (3의 배수가 아니에요)'), fs, '#26324a', 'left', 800); y += lh;
    T(P.x + 16, y, '단백질  아미노산 ' + df.lenO + '개 → ' + df.lenM + '개' + (df.stopM < 0 ? ' (종결 코돈 없음)' : df.stopNew && df.lenM < df.lenO ? ' (이른 종결)' : ''), fs, '#26324a', 'left', 800); y += lh + 4;
    let ex;
    if (f.same) ex = '염기를 삽입하거나 결실해 보세요. 읽기틀이 어떻게 달라지는지 살펴봐요.';
    else if (f.shift) ex = '코돈이 3염기씩 묶이는 자리가 밀려서 그 뒤의 아미노산이 모두 달라져요(원래 ' + df.om + '개 → ' + df.mm + '개).' + (df.stopM >= 0 && df.lenM < df.lenO ? ' 종결 코돈이 일찍 나타나 단백질이 짧아졌어요.' : '');
    else if (df.om > 0 || df.mm > 0) ex = '3의 배수만큼 변해서 뒤쪽 읽기틀은 그대로예요. 달라진 부분은 아미노산 ' + df.om + '개 → ' + df.mm + '개뿐이에요.';
    else ex = '읽기틀이 유지되고 아미노산도 그대로예요.';
    textBlock(P.x + 16, y, P.w - 32, ex, fs, '#475569', lh, 700);
    // 세 번 연속 결실의 의미
    const mk = [['shift', '틀 이동 만들기', FS.shift], ['del3', '3염기 결실', FS.del3]];
    if (!PHONE) mk.forEach((q, i) => { const bx = P.x + 16 + i * 170, by = P.y + P.h - 24; D.label(bx, by, (q[2] ? '✔ ' : '') + q[1], { bg: q[2] ? '#16a34a' : '#e2e8f0', color: q[2] ? '#fff' : '#64748b', size: 13, align: 'left' }); });
  }
  const framePT = {
    down(p) {
      for (let i = 0; i < SEQ.cur.length; i++) {
        const t = SEQ.cur[i];
        if (p.x >= t.x - 2 && p.x <= t.x + SQ.tw + 2 && p.y >= t.y - 4 && p.y <= t.y + SQ.th + 4) {
          FS.pos = FS.op === 'ins' ? (p.x > t.x + SQ.tw / 2 ? i + 1 : i) : FS.op === 'del1' ? i + 1 : Math.floor(i / 3) + 1;
          fsRange(); Sound.tick(); return false;
        }
      }
      return false;
    },
    hover(p) { return SEQ.cur.some((t) => p.x >= t.x && p.x <= t.x + SQ.tw && p.y >= t.y && p.y <= t.y + SQ.th) ? 'pointer' : 'default'; },
  };


  /* =========================================================
     ③ 발병 원인: 유전병 카드 12장 분류 (교육용 요약)
     ========================================================= */
  const CAU = [
    { id: 'pku', label: '페닐케톤뇨증', short: '페닐케톤뇨증', sub: '상염색체 열성 · 효소 이상', ans: 'gene' },
    { id: 'cf', label: '낭성 섬유증', short: '낭성 섬유증', sub: '상염색체 열성', ans: 'gene' },
    { id: 'sca', label: '낫 모양 적혈구 병', short: '낫 모양 적혈구병', sub: 'HBB 염기 하나가 바뀜', ans: 'gene' },
    { id: 'ach', label: '연골 무형성증', short: '연골 무형성증', sub: '상염색체 우성', ans: 'gene' },
    { id: 'hd', label: '헌팅턴병', short: '헌팅턴병', sub: '상염색체 우성', ans: 'gene' },
    { id: 'hem', label: '혈우병', short: '혈우병', sub: 'X 연관 열성', ans: 'gene' },
    { id: 'ds', label: '다운 증후군', short: '다운 증후군', sub: '21번 염색체가 3개', ans: 'chrom' },
    { id: 'ts', label: '터너 증후군', short: '터너 증후군', sub: '45, X', ans: 'chrom' },
    { id: 'ks', label: '클라인펠터 증후군', short: '클라인펠터', sub: '47, XXY', ans: 'chrom' },
    { id: 'cc', label: '고양이 울음 증후군', short: '고양이 울음', sub: '5번 염색체 일부 결실', ans: 'chrom' },
    { id: 't2d', label: '제2형 당뇨병', short: '제2형 당뇨병', sub: '가족력 + 생활 습관', ans: 'poly' },
    { id: 'htn', label: '고혈압', short: '고혈압', sub: '가족력 + 생활 습관', ans: 'poly' },
  ];
  const CBOX = PHONE
    ? [{ id: 'gene', label: '단일 유전자', col: '#7c6cf0', x: 8, y: 316, w: 150, h: 316 }, { id: 'chrom', label: '염색체 이상', col: '#f59e0b', x: 162, y: 316, w: 150, h: 316 }, { id: 'poly', label: '다인자', col: '#16a34a', x: 316, y: 316, w: 156, h: 316 }]
    : [{ id: 'gene', label: '단일 유전자 이상', col: '#7c6cf0', x: 14, y: 222, w: 262, h: 326 }, { id: 'chrom', label: '염색체 이상', col: '#f59e0b', x: 284, y: 222, w: 250, h: 326 }, { id: 'poly', label: '다인자 (유전자 + 환경)', col: '#16a34a', x: 542, y: 222, w: 244, h: 326 }];
  CBOX.forEach((b) => { b.cols = 1; b.hdr = 30; });
  const cauSorter = selectable({
    cards: CAU.map((c) => ({ id: c.id, label: c.label, short: c.short, sub: c.sub, col: '#64748b' })), boxes: CBOX, cw: PHONE ? 226 : 184, ch: PHONE ? 40 : 46, kh: PHONE ? 40 : 40,
    tray: (i) => { const order = [6, 2, 10, 0, 8, 4, 11, 1, 7, 5, 9, 3]; const j = order.indexOf(i); return PHONE ? { x: 8 + (j % 2) * 236, y: 40 + Math.floor(j / 2) * 44 } : { x: 14 + (j % 4) * 193, y: 44 + Math.floor(j / 4) * 55 }; },
    onChange() { updateCtl(); },
  });
  const cauWrong = () => cauSorter.cards.filter((c) => c.zone && CAU.find((q) => q.id === c.id).ans !== c.zone);
  function cauDraw(dt, t) {
    cauSorter.update(dt); cauSorter.drawBoxes();
    T(14, PHONE ? 28 : 30, '유전병 카드를 원인에 맞는 상자에 끌어 넣어요 (교육용 요약)', PHONE ? 14 : 16, '#334155', 'left', 800);
    cauSorter.drawCards();
  }
  const cauPT = sorterPT(() => cauSorter);
  const TBL_A = [['', '고르기'], ['g', '한 유전자의 염기 서열'], ['c', '염색체의 수나 구조'], ['p', '여러 유전자와 환경']];
  const TBL_B = [['', '고르기'], ['g', '염기 서열 분석 · 가계도'], ['c', '핵형 분석'], ['p', '가족력 · 생활 습관 · 위험도']];
  [0, 1, 2].forEach((r) => ['a', 'b'].forEach((k) => { const sel = $('#tc' + r + k); (k === 'a' ? TBL_A : TBL_B).forEach((o) => { const e = document.createElement('option'); e.value = o[0]; e.textContent = o[1]; sel.appendChild(e); }); }));
  const tblAns = () => [0, 1, 2].map((r) => ['a', 'b'].map((k) => $('#tc' + r + k).value));
  const tblOk = () => tblAns().every((row, r) => row[0] === 'gcp'[r] && row[1] === 'gcp'[r]);

  /* =========================================================
     체세포 돌연변이 vs 생식세포 돌연변이 (유전되는가?)
     ========================================================= */
  const so = { a: 0, aT: 0, b: 0, bT: 0, seenA: false, seenB: false, mut: '', fx: 0 };
  const MUT_TXT = {
    uv: '자외선: 피부 세포의 DNA 염기에 변화를 일으킬 수 있어요. 햇빛을 오래 쬐면 피부 세포에 돌연변이가 쌓일 수 있어요.',
    xr: 'X선 · 방사선: 에너지가 커서 DNA 가닥을 끊거나 염기를 바꿀 수 있어요.',
    chem: '화학 물질: 일부 화학 물질(예: 담배 연기의 발암 물질)은 DNA 염기에 붙어 변화를 일으켜요.',
    rep: '복제 오류: DNA를 복제할 때 아주 드물게 잘못된 염기가 들어가요. 요인이 없어도 자연스럽게 생겨요.',
  };
  function somaRun(which) {
    if (which === 'a') { so.a = 0; so.aT = 1; so.seenA = true; } else { so.b = 0; so.bT = 1; so.seenB = true; }
    so.fx = which; Sound.click(); updateCtl();
  }
  function mutPick(v) {
    so.mut = v; $('#mutNote').innerHTML = '<b>' + MUT_TXT[v].split(':')[0] + '</b>' + MUT_TXT[v].slice(MUT_TXT[v].indexOf(':'));
    const L1 = somaLane(0), c = { x: L1.x + L1.w * 0.14, y: L1.y + L1.h * 0.5 };
    for (let i = 0; i < 16 && v !== 'rep'; i++) {
      const col = v === 'uv' ? '#f59e0b' : v === 'xr' ? '#06b6d4' : '#a855f7';
      parts.emit({ x: c.x + (Math.random() - 0.5) * 120, y: c.y - 90, vx: (c.x - (c.x + (Math.random() - 0.5) * 120)) * 0.2, vy: 220, life: 0.55, size: v === 'chem' ? 6 : 3, color: col, shape: v === 'chem' ? 'bubble' : v === 'uv' ? 'square' : 'circle', gravity: 0, fade: true });
    }
    if (v === 'rep') parts.burst(c.x, c.y, { count: 10, colors: ['#ef4444', '#fbbf24'], speed: 70, gravity: 0, life: 0.6 });
    Sound.click(); updateCtl();
  }
  function somaLane(k) { return PHONE ? (k === 0 ? { x: 8, y: 8, w: 464, h: 300 } : { x: 8, y: 316, w: 464, h: 316 }) : (k === 0 ? { x: 14, y: 8, w: 772, h: 262 } : { x: 14, y: 278, w: 772, h: 270 }); }
  function cellDraw(x, y, r, mut, a) {
    ctx.save(); ctx.globalAlpha = a == null ? 1 : a;
    const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r); g.addColorStop(0, '#f0fdf4'); g.addColorStop(1, '#bbf7d0');
    D.shadow(() => { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fillStyle = g; ctx.fill(); }, { blur: 5, y: 2 });
    ctx.strokeStyle = mut ? '#b91c1c' : '#16a34a'; ctx.lineWidth = mut ? 2.6 : 2; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.arc(x, y, r * 0.45, 0, TAU); ctx.fillStyle = mut ? '#fecaca' : '#dcfce7'; ctx.fill(); ctx.strokeStyle = mut ? '#ef4444' : '#4ade80'; ctx.lineWidth = 1.5; ctx.stroke();
    if (mut) { ctx.fillStyle = '#dc2626'; ctx.beginPath(); ctx.arc(x + r * 0.1, y - r * 0.05, Math.max(2.5, r * 0.16), 0, TAU); ctx.fill(); }
    ctx.restore();
  }
  function somaDraw(dt, t) {
    so.a = RM ? so.aT : approach(so.a, so.aT, dt, 0.5); if (Math.abs(so.a - so.aT) < 0.004) so.a = so.aT;
    so.b = RM ? so.bT : approach(so.b, so.bT, dt, 0.5); if (Math.abs(so.b - so.bT) < 0.004) so.b = so.bT;
    const sc = PHONE ? 0.8 : 1;
    [0, 1].forEach((k) => {
      const Ln = somaLane(k), pr = k === 0 ? so.a : so.b;
      panel(Ln.x, Ln.y, Ln.w, Ln.h, 16, '#fff');
      T(Ln.x + 16, Ln.y + 28, k === 0 ? '체세포 돌연변이 (예: 피부 세포에 생긴 암)' : '생식세포 돌연변이 (정자나 난자를 만드는 세포)', PHONE ? 14.5 : 17, k === 0 ? '#b45309' : '#6d28d9', 'left', 800);
      const cx1 = Ln.x + Ln.w * 0.15, cx2 = Ln.x + Ln.w * 0.5, cx3 = Ln.x + Ln.w * 0.85, cy = Ln.y + Ln.h * (PHONE ? 0.42 : 0.48);
      const mutOn = pr > 0.12;
      if (k === 0) {
        // 정상 체세포 → 돌연변이 체세포 → 일부 조직
        cellDraw(cx1, cy, 36 * sc, mutOn, 1);
        T(cx1, cy + 62 * sc, mutOn ? '돌연변이 체세포' : '체세포', 13, mutOn ? '#b91c1c' : '#16a34a', 'center', 800);
        D.arrow(cx1 + 48 * sc, cy, cx2 - 66 * sc, cy, { color: '#94a3b8', width: 3 });
        const n = Math.round(clamp((pr - 0.25) / 0.7, 0, 1) * 9);
        const pos = [[0, 0], [-1, 0], [1, 0], [-0.5, -0.9], [0.5, -0.9], [-0.5, 0.9], [0.5, 0.9], [-1.5, -0.9], [1.5, 0.9]];
        for (let i = 0; i < 9; i++) { const q = pos[i], r = 20 * sc, show = i < Math.max(n, pr > 0.2 ? 1 : 0); if (show) cellDraw(cx2 + q[0] * 44 * sc, cy + q[1] * 40 * sc, r, true, 1); }
        T(cx2, cy + 86 * sc, '이 사람의 몸 일부 조직에만 퍼져요', 13, '#92400e', 'center', 800);
        D.arrow(cx2 + 90 * sc, cy, cx3 - 50 * sc, cy, { color: '#94a3b8', width: 3, dash: [6, 5] });
        person(cx3, cy, 62 * sc, '#cbd5e1'); const a2 = clamp((pr - 0.8) / 0.2, 0, 1);
        ctx.save(); ctx.globalAlpha = a2; D.label(cx3, cy - 62 * sc, '자손', { bg: '#64748b', size: 13 }); ctx.restore();
        if (a2 > 0) { ctx.save(); ctx.globalAlpha = a2; ctx.strokeStyle = '#dc2626'; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(cx3 - 24 * sc, cy - 22 * sc); ctx.lineTo(cx3 + 24 * sc, cy + 24 * sc); ctx.moveTo(cx3 + 24 * sc, cy - 22 * sc); ctx.lineTo(cx3 - 24 * sc, cy + 24 * sc); ctx.stroke(); ctx.restore(); }
        TF(Ln.x + Ln.w / 2, Ln.y + Ln.h - 22, pr > 0.9 ? '자손에게 전해지지 않아요' : '▶ 버튼을 눌러 보세요', Ln.w - 40, PHONE ? 15 : 17, 12, pr > 0.9 ? '#b91c1c' : '#94a3b8', 'center', 800);
      } else {
        // 생식세포 → 돌연변이 배우자 → 수정 → 자손의 모든 세포
        cellDraw(cx1, cy - 6, 36 * sc, mutOn, 1);
        T(cx1, cy + 56 * sc, mutOn ? '돌연변이 생식세포' : '생식세포', 13, mutOn ? '#b91c1c' : '#6d28d9', 'center', 800);
        const fg = clamp((pr - 0.3) / 0.25, 0, 1), fz = clamp((pr - 0.55) / 0.25, 0, 1);
        D.arrow(cx1 + 48 * sc, cy - 6, cx2 - 70 * sc, cy - 6, { color: '#94a3b8', width: 3 });
        ctx.save(); ctx.globalAlpha = fg;
        ctx.beginPath(); ctx.arc(cx2 - 30 * sc, cy - 6, 24 * sc, 0, TAU); ctx.fillStyle = '#fff1f5'; ctx.fill(); ctx.strokeStyle = '#e58aa6'; ctx.lineWidth = 2.5; ctx.stroke();
        ctx.fillStyle = '#dc2626'; ctx.beginPath(); ctx.arc(cx2 - 30 * sc, cy - 6, 6 * sc, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.ellipse(cx2 + 36 * sc, cy - 6, 15 * sc, 11 * sc, 0, 0, TAU); ctx.fillStyle = '#e0f2fe'; ctx.fill(); ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 2; ctx.stroke();
        T(cx2, cy + 56 * sc, '돌연변이 난자 + 정자', 13, '#6d28d9', 'center', 800); ctx.restore();
        D.arrow(cx2 + 70 * sc, cy - 6, cx3 - 66 * sc, cy - 6, { color: '#94a3b8', width: 3 });
        ctx.save(); ctx.globalAlpha = fz;
        // 자손의 모든 세포가 돌연변이를 가져요
        const grid = [[-1, -1], [0, -1], [1, -1], [-1, 0], [0, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];
        grid.forEach((q) => cellDraw(cx3 + q[0] * 34 * sc, cy - 6 + q[1] * 32 * sc, 14 * sc, true, 1));
        D.label(cx3, cy - 66 * sc, '자손', { bg: '#7c3aed', size: 13 }); ctx.restore();
        TF(Ln.x + Ln.w / 2, Ln.y + Ln.h - 22, pr > 0.9 ? '자손의 모든 세포에 전해져요' : '▶ 버튼을 눌러 보세요', Ln.w - 40, PHONE ? 15 : 17, 12, pr > 0.9 ? '#6d28d9' : '#94a3b8', 'center', 800);
      }
    });
    if (so.mut) { const L1 = somaLane(0); D.label(L1.x + L1.w - 14, L1.y + 28, ({ uv: '☀ 자외선', xr: '☢ X선 · 방사선', chem: '⚗ 화학 물질', rep: '🧬 복제 오류' })[so.mut], { bg: '#475569', size: 13, align: 'right' }); }
  }


  /* =========================================================
     ④ 조사 계획서 (교육용 가상 자료로 만든 요약 카드와 비교)
     ========================================================= */
  const DIS = [
    { id: 'ds', name: '다운 증후군', cause: 2, sum: ['원인: 염색체 이상 (21번 염색체가 3개, 47, +21)', '확인: 핵형 분석 · 산모 나이별 발생 빈도 통계', '대부분 생식세포를 만들 때 우연히 생기고, 부모에게서 \'유전\'되는 것이 아니에요'] },
    { id: 'pku', name: '페닐케톤뇨증', cause: 1, sum: ['원인: 단일 유전자 이상 (페닐알라닌 분해 효소 유전자, 상염색체 열성)', '확인: 효소 활성 · 염기 서열 분석, 신생아 선별 검사', '식이 조절로 증상을 예방할 수 있어요'] },
    { id: 't2d', name: '제2형 당뇨병', cause: 3, sum: ['원인: 다인자 (여러 유전자 + 생활 습관 + 환경)', '확인: 가족력 · 생활 습관 · 혈당 통계를 위험도로 표현', '유전자 하나의 검사만으로 단정할 수 없어요'] },
    { id: 'hem', name: '혈우병', cause: 1, sum: ['원인: 단일 유전자 이상 (X 연관 열성, 혈액 응고 인자 유전자)', '확인: 가계도 분석(남자에게 더 많음) · 염기 서열 분석', '가계도에서 일정한 유전 양상이 나타나요'] },
    { id: 'hd', name: '헌팅턴병', cause: 1, sum: ['원인: 단일 유전자 이상 (상염색체 우성)', '확인: 가계도 분석 · 염기 서열 분석', '보통 성인이 된 뒤에 증상이 나타나요'] },
    { id: 'cf', name: '낭성 섬유증', cause: 1, sum: ['원인: 단일 유전자 이상 (상염색체 열성)', '확인: 염기 서열 분석 (대표 변이 ΔF508)', 'ΔF508은 3염기 결실로 Phe 508번 아미노산 하나가 없어진 경우예요'] },
  ];
  const CAUSE_NAME = ['', '단일 유전자 이상', '염색체 이상', '다인자 (여러 유전자 + 환경)'];
  const PL_SLOTS = ['유전병', '조사 질문', '원인 분류', '자료 유형', '조사 방법', '정리 방식', '윤리 점검'];
  const PL_SRC = [['공공기관의 공개 통계', 1], ['학술 논문 · 교과서', 1], ['공개 유전체 데이터베이스', 1], ['환자 단체가 낸 공식 자료', 1], ['출처 없는 개인 SNS 후기', 0]];
  const PL_METH = [['문헌 조사', 1], ['통계 해석', 1], ['개인 사례 직접 인터뷰', 0]];
  const PL_FMT = ['표', '그래프', '인포그래픽'];
  const PL_ETH = ['공개 통계를 써요 (개인 사례 X)', '환자와 가족을 비하하는 표현을 쓰지 않아요'];
  const PL = { slot: 0, dis: -1, q: -1, cause: -1, src: [], meth: [], fmt: -1, eth: [], card: false, cardT: 0 };
  const plQ = (n) => ['\'' + n + '\'의 발병 원인과 조사 방법은 무엇일까?', '\'' + n + '\'에 걸린 우리 이웃은 누구일까?', '\'' + n + '\' 환자는 유전자가 나빠서 걸린 것일까?'];
  function plChecks() {
    const d = PL.dis >= 0 ? DIS[PL.dis] : null;
    const srcOk = PL.src.filter((i) => PL_SRC[i][1]).length, srcBad = PL.src.filter((i) => !PL_SRC[i][1]).length;
    return [
      ['원인별 분류가 알맞아요', !!d && PL.cause === d.cause],
      ['자료 출처가 믿을 만한 2곳 이상이에요', srcOk >= 2 && srcBad === 0],
      ['질문이 조사할 수 있는 질문이에요', PL.q === 0],
      ['조사 방법이 알맞아요', PL.meth.some((i) => PL_METH[i][1]) && !PL.meth.some((i) => !PL_METH[i][1])],
      ['정리 방식을 골랐어요', PL.fmt >= 0],
      ['윤리 점검 두 가지를 모두 했어요', PL.eth.length === 2],
    ];
  }
  const plAllOk = () => plChecks().every((c) => c[1]);
  function plVal(i) {
    const d = PL.dis >= 0 ? DIS[PL.dis] : null;
    if (i === 0) return d ? d.name : '';
    if (i === 1) return d && PL.q >= 0 ? plQ(d.name)[PL.q] : '';
    if (i === 2) return PL.cause >= 1 ? CAUSE_NAME[PL.cause] : '';
    if (i === 3) return PL.src.map((k) => PL_SRC[k][0]).join(' · ');
    if (i === 4) return PL.meth.map((k) => PL_METH[k][0]).join(' · ');
    if (i === 5) return PL.fmt >= 0 ? PL_FMT[PL.fmt] : '';
    return PL.eth.map((k) => (k === 0 ? '공개 통계' : '비하 표현 금지')).join(' · ');
  }
  function plOpts() {
    const box = $('#optBox'), s = PL.slot; box.innerHTML = '';
    $('#optTitle').textContent = PL_SLOTS[s] + (s === 3 || s === 4 || s === 6 ? ' (여러 개 고르기)' : ' 고르기'); box.className = 'chip-grid' + (s === 0 || s === 2 || s === 5 ? '' : ' one');
    const mk = (txt, on, fn, dis) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'mc' + (on ? ' on' : ''); b.textContent = txt; if (dis) b.disabled = true; b.addEventListener('click', () => { Sound.click(); fn(); }); box.appendChild(b); };
    const d = PL.dis >= 0 ? DIS[PL.dis] : null;
    if (s === 0) DIS.forEach((q, i) => mk(q.name, PL.dis === i, () => { PL.dis = i; PL.card = false; updateCtl(); }));
    else if (s === 1) { if (!d) mk('먼저 유전병을 골라 주세요', false, () => {}, true); else plQ(d.name).forEach((t, i) => mk(t, PL.q === i, () => { PL.q = i; PL.card = false; updateCtl(); })); }
    else if (s === 2) [1, 2, 3].forEach((c) => mk(CAUSE_NAME[c], PL.cause === c, () => { PL.cause = c; PL.card = false; updateCtl(); }));
    else if (s === 3) PL_SRC.forEach((q, i) => mk(q[0], PL.src.indexOf(i) >= 0, () => { const k = PL.src.indexOf(i); if (k >= 0) PL.src.splice(k, 1); else PL.src.push(i); PL.card = false; updateCtl(); }));
    else if (s === 4) PL_METH.forEach((q, i) => mk(q[0], PL.meth.indexOf(i) >= 0, () => { const k = PL.meth.indexOf(i); if (k >= 0) PL.meth.splice(k, 1); else PL.meth.push(i); PL.card = false; updateCtl(); }));
    else if (s === 5) PL_FMT.forEach((q, i) => mk(q, PL.fmt === i, () => { PL.fmt = i; PL.card = false; updateCtl(); }));
    else PL_ETH.forEach((q, i) => mk(q, PL.eth.indexOf(i) >= 0, () => { const k = PL.eth.indexOf(i); if (k >= 0) PL.eth.splice(k, 1); else PL.eth.push(i); PL.card = false; updateCtl(); }));
  }
  function plReset() { PL.slot = 0; PL.dis = -1; PL.q = -1; PL.cause = -1; PL.src = []; PL.meth = []; PL.fmt = -1; PL.eth = []; PL.card = false; PL.cardT = 0; hideHint(); updateCtl(); }
  function plGetCard() {
    if (!plAllOk()) { showHint('점검표가 모두 ✔가 되면 요약 카드를 받을 수 있어요.'); Sound.fail(); return; }
    PL.card = true; PL.cardT = 0; Sound.success(); const R = PLG.card; parts.burst(R.x + R.w / 2, R.y + 30, { count: 22, speed: 190, life: 0.9 }); updateCtl();
  }
  const PLG = PHONE
    ? { rows: { x: 8, y: 8, w: 464, h: 328 }, chk: { x: 8, y: 344, w: 464, h: 158 }, card: { x: 8, y: 510, w: 464, h: 122 }, rh: 40 }
    : { rows: { x: 14, y: 8, w: 462, h: 540 }, chk: { x: 484, y: 8, w: 302, h: 224 }, card: { x: 484, y: 240, w: 302, h: 308 }, rh: 68 };
  function planDraw(dt, t) {
    PL.cardT = RM ? 1 : approach(PL.cardT, PL.card ? 1 : 0, dt, 3);
    const R = PLG.rows; panel(R.x, R.y, R.w, R.h, 16, '#fff');
    T(R.x + 16, R.y + 28, '📋 유전병 조사 계획서', PHONE ? 16 : 18, '#1f2d44', 'left', 800);
    PL_SLOTS.forEach((nm, i) => {
      const y = R.y + 42 + i * PLG.rh, on = PL.slot === i, v = plVal(i), h = PLG.rh - 6;
      D.roundRect(R.x + 10, y, R.w - 20, h, 12); ctx.fillStyle = on ? 'rgba(22,163,74,.12)' : '#f8fafc'; ctx.fill(); ctx.strokeStyle = on ? '#16a34a' : '#e2e8f0'; ctx.lineWidth = on ? 3 : 1.5; ctx.stroke();
      D.label(R.x + 20, y + 17, (i + 1) + '. ' + nm, { bg: v ? '#0f766e' : '#94a3b8', size: 12.5, align: 'left' });
      if (v) { if (PHONE) TF(R.x + 112, y + 22, v, R.w - 132, 12.5, 9.5, '#26324a', 'left', 700); else textBlock(R.x + 22, y + 40, R.w - 44, v, 13.5, '#26324a', 17, 700); }
      else T(R.x + (PHONE ? 112 : 22), y + (PHONE ? 22 : 44), on ? (PHONE ? '↓ 아래 도구에서 골라요' : '← 오른쪽 도구에서 골라요') : '아직 비어 있어요', 12.5, '#94a3b8', 'left', 700);
    });
    const K = PLG.chk; panel(K.x, K.y, K.w, K.h, 16, '#fff'); T(K.x + 16, K.y + 28, '✅ 점검표', 16, '#1f2d44', 'left', 800);
    plChecks().forEach((c, i) => { const y = K.y + 52 + i * (PHONE ? 20 : 28); T(K.x + 16, y, (c[1] ? '✔ ' : '▢ ') + c[0], PHONE ? 13 : 14, c[1] ? '#15803d' : '#64748b', 'left', 800); });
    const C0 = PLG.card; panel(C0.x, C0.y, C0.w, C0.h, 16, PL.card ? '#ecfdf5' : '#f8fafc');
    if (!PL.card) { TF(C0.x + C0.w / 2, C0.y + C0.h / 2 + 5, plAllOk() ? '📄 [요약 카드 받기]를 눌러요' : '점검표를 모두 채우면 요약 카드를 받아요', C0.w - 24, 14, 11, '#94a3b8', 'center', 800); return; }
    const d = DIS[PL.dis], a = clamp(PL.cardT, 0, 1);
    ctx.save(); ctx.globalAlpha = a; ctx.translate(0, (1 - a) * 18);
    TF(C0.x + 14, C0.y + 26, '📄 ' + d.name + ' 요약 카드 (교육용 가상 자료)', C0.w - 24, PHONE ? 13.5 : 14.5, 10.5, '#065f46', 'left', 800);
    let y = C0.y + 50;
    d.sum.forEach((s, i) => { if (PHONE && i > 1) return; const h = textBlock(C0.x + 14, y, C0.w - 28, '• ' + s, PHONE ? 12.5 : 13.5, '#334155', PHONE ? 17 : 19, 700); y += h + 6; });
    const same = PL.cause === d.cause;
    D.label(C0.x + 14, C0.y + C0.h - 22, same ? '내 계획과 일치: 원인 분류 ✔' : '내 계획과 달라요', { bg: same ? '#16a34a' : '#dc2626', size: 12.5, align: 'left' });
    ctx.restore();
  }
  const planPT = {
    down(p) { const R = PLG.rows; for (let i = 0; i < 7; i++) { const y = R.y + 42 + i * PLG.rh; if (p.x >= R.x + 10 && p.x <= R.x + R.w - 10 && p.y >= y && p.y <= y + PLG.rh - 6) { PL.slot = i; Sound.tick(); updateCtl(); return false; } } return false; },
    hover(p) { const R = PLG.rows; return p.x >= R.x && p.x <= R.x + R.w && p.y >= R.y + 42 && p.y <= R.y + 42 + 7 * PLG.rh ? 'pointer' : 'default'; },
  };

  /* ---------- 자료 신뢰성 판단 ---------- */
  const SRC = [
    { id: 's1', label: '공공기관이 공개한 질병 통계', short: '공공기관 공개 통계', sub: '출처와 집계 방법이 공개돼요', ans: 'ok' },
    { id: 's2', label: '학술지에 실린 연구 논문', short: '학술지 연구 논문', sub: '다른 전문가가 검토해요', ans: 'ok' },
    { id: 's3', label: '공개 유전체 데이터베이스', short: '공개 유전체 DB', sub: '누구나 확인할 수 있어요', ans: 'ok' },
    { id: 's4', label: '출처 없는 블로그 후기', short: '출처 없는 후기', sub: '확인할 방법이 없어요', ans: 'no' },
    { id: 's5', label: '치료제를 광고하는 쇼핑몰 글', short: '치료제 광고 글', sub: '판매가 목적이에요', ans: 'no' },
    { id: 's6', label: '환자 가족의 SNS 사진 (개인 사례)', short: '환자 가족 SNS 사진', sub: '개인 사례 · 개인 정보예요', ans: 'no' },
  ];
  const SBOX = PHONE
    ? [{ id: 'ok', label: '믿을 만해요', col: '#16a34a', x: 8, y: 316, w: 228, h: 316, cols: 1, hdr: 30 }, { id: 'no', label: '믿기 어려워요', col: '#dc2626', x: 244, y: 316, w: 228, h: 316, cols: 1, hdr: 30 }]
    : [{ id: 'ok', label: '믿을 만해요', col: '#16a34a', x: 14, y: 232, w: 380, h: 316, cols: 1, hdr: 30 }, { id: 'no', label: '믿기 어려워요', col: '#dc2626', x: 406, y: 232, w: 380, h: 316, cols: 1, hdr: 30 }];
  const srcSorter = selectable({
    cards: SRC.map((c) => ({ id: c.id, label: c.label, short: c.short, sub: c.sub, col: '#64748b' })), boxes: SBOX, cw: PHONE ? 456 : 250, ch: PHONE ? 40 : 52, kh: PHONE ? 44 : 50,
    tray: (i) => { const o = [4, 0, 5, 2, 3, 1]; const j = o.indexOf(i); return PHONE ? { x: 8, y: 40 + j * 45 } : { x: 14 + (j % 3) * 262, y: 50 + Math.floor(j / 3) * 62 }; },
    onChange() { updateCtl(); },
  });
  const srcWrong = () => srcSorter.cards.filter((c) => c.zone && SRC.find((q) => q.id === c.id).ans !== c.zone);
  function srcDraw(dt, t) {
    srcSorter.update(dt); srcSorter.drawBoxes();
    T(14, PHONE ? 28 : 30, '자료 카드를 믿을 만한지 따져 상자에 넣어요', PHONE ? 14 : 16, '#334155', 'left', 800);
    srcSorter.drawCards();
  }
  const srcPT = sorterPT(() => srcSorter);

  /* =========================================================
     화면 전환 · 조작 연결
     ========================================================= */
  const PTS = { point: pointPT, frame: framePT, cause: cauPT, plan: planPT, source: srcPT };
  function setMode(m) {
    if (S.mode !== m) S.fade = 1;
    S.mode = m; PT = PTS[m] || null; hideHint();
    if (m === 'frame') { if (SEQ.key !== 'prac') seqLoad('prac'); fsRange(); }
    if (m === 'point' && SEQ.key === 'prac' && SEQ.cur.length !== SEQ.orig.length) { SEQ.cur = SEQ.orig.map(mkTile); SEQ.edit = null; SEQ.sel = -1; }
    if (m === 'plan') plOpts();
    updateCtl();
  }
  function updateCtl() {
    const fr0 = game ? game.free : false, lvNow = game ? game.level : 0;
    ctlNodes.forEach((n) => { n.hidden = (n.dataset.modes || '').split(' ').indexOf(S.mode) < 0; });
    modeButtons(S.mode, lvNow, fr0);
    chipOn($('#smpSel'), SEQ.key); chipOn($('#palSel'), SEQ.sel >= 0 ? SEQ.cur[SEQ.sel].ch : '');
    $('#selInfo').textContent = SEQ.sel >= 0 ? '(' + (SEQ.sel + 1) + '번째 염기 · 현재 ' + SEQ.cur[SEQ.sel].ch + ')' : '(먼저 위에서 염기를 눌러요)';
    $('#ptMade').innerHTML = [['silent', '침묵'], ['missense', '과오'], ['nonsense', '넌센스'], ['sickle', '낫 모양 적혈구 사례 (HBB의 GAG → GUG)']].map(([k, n]) => '<li class="' + (SEQ.made[k] ? 'on' : '') + '">' + (SEQ.made[k] ? '✅' : '⬜') + ' ' + n + ' 만들기</li>').join('');
    chipOn($('#opSel'), FS.op); chipOn($('#insBase'), FS.base);
    $('#fsMade').innerHTML = [[FS.shift, '틀 이동 만들기 (삽입 · 결실 1개)'], [FS.del3, '3염기 결실로 읽기틀 유지 확인']].map(([v, n]) => '<li class="' + (v ? 'on' : '') + '">' + (v ? '✅' : '⬜') + ' ' + n + '</li>').join('');
    if (S.mode === 'frame') fsRange();
    chipOn($('#slotSel'), PL.slot); $$('#slotSel button').forEach((b) => b.classList.toggle('seen', !!plVal(+b.dataset.v)));
    if (S.mode === 'plan') plOpts();
    $('#planCard').disabled = !plAllOk() || PL.card;
    $('#somaA').classList.toggle('btn-good', so.seenA); $('#somaB').classList.toggle('btn-good', so.seenB);
    chipOn($('#mutSel'), so.mut);
  }
  bindModes(setMode);
  $$('#smpSel button').forEach((b) => b.addEventListener('click', () => { Sound.click(); seqLoad(b.dataset.v); updateCtl(); }));
  $$('#palSel button').forEach((b) => b.addEventListener('click', () => pointBase(b.dataset.v)));
  $('#ptReset').addEventListener('click', () => { Sound.click(); pointReset(); });
  $$('#opSel button').forEach((b) => b.addEventListener('click', () => { Sound.click(); fsOpSet(b.dataset.v); }));
  $$('#insBase button').forEach((b) => b.addEventListener('click', () => { Sound.click(); FS.base = b.dataset.v; updateCtl(); }));
  SciSim.bindRange($('#sPos'), $('#oPos'), (v) => String(v), (v) => { FS.pos = v; });
  $('#fsApply').addEventListener('click', fsApply);
  $('#fsReset').addEventListener('click', () => { Sound.click(); fsReset(); });
  $('#cauReset').addEventListener('click', () => { Sound.click(); cauSorter.reset(); });
  ['tc0a', 'tc0b', 'tc1a', 'tc1b', 'tc2a', 'tc2b'].forEach((id) => $('#' + id).addEventListener('change', () => { $('#' + id).classList.remove('bad'); updateCtl(); }));
  $('#somaA').addEventListener('click', () => somaRun('a')); $('#somaB').addEventListener('click', () => somaRun('b'));
  $$('#mutSel button').forEach((b) => b.addEventListener('click', () => mutPick(b.dataset.v)));
  $$('#slotSel button').forEach((b) => b.addEventListener('click', () => { Sound.click(); PL.slot = +b.dataset.v; updateCtl(); }));
  $('#planCard').addEventListener('click', plGetCard);
  $('#planReset').addEventListener('click', () => { Sound.click(); plReset(); });
  $('#srcReset').addEventListener('click', () => { Sound.click(); srcSorter.reset(); });


  /* =========================================================
     미션
     ========================================================= */
  const CAU_N = () => cauSorter.placed;
  const levels = [
    {
      title: '염기 하나가 바뀌면', short: '점 돌연변이', icon: '🔤', phase: '모형',
      intro: '<p class="si-q">❓ 탐구 질문: 같은 \'유전병\'이라도 원인이 다르면 조사하는 방법도 달라야 할까?</p><p>🔗 <b>통합과학</b>에서 DNA의 염기 서열이 mRNA를 거쳐 아미노산 서열이 되고, 염기 하나가 바뀌면 낫 모양 적혈구처럼 형질이 달라질 수 있다는 것을 배웠어요. 앞 차시에서는 염색체의 <b>수와 구조</b>가 바뀌는 이상을 봤어요.</p><p>이번에는 <b>유전자 돌연변이</b>, 곧 DNA <b>염기 서열의 변화</b>를 살펴봐요. mRNA의 염기를 하나씩 바꿔 아미노산 사슬이 어떻게 달라지는지 확인하고 <b>침묵 · 과오 · 넌센스</b>로 분류해요. 모든 자료는 교육용이에요.</p>',
      features: ['point'],
      setup() { seqLoad('prac'); setMode('point'); },
      recap: '염기 하나가 바뀌는 점 돌연변이는 같은 아미노산이면 침묵, 다른 아미노산이면 과오, 종결 코돈이 생기면 넌센스예요. 낫 모양 적혈구는 HBB 유전자의 GAG가 GUG로 바뀌어 Glu가 Val로 바뀐 과오 돌연변이예요.',
      summary: '<ul><li><b>유전자 돌연변이</b>: DNA 염기 서열이 바뀌는 것이에요. 염기 하나가 다른 염기로 바뀌는 <b>점 돌연변이(치환)</b>는 세 가지로 나뉘어요.</li><li><b>침묵</b>: 코돈이 바뀌어도 같은 아미노산 (예: GAA → GAG, 둘 다 Glu). <b>과오</b>: 다른 아미노산으로 바뀜 (GAA → GUA, Glu → Val). <b>넌센스</b>: 종결 코돈이 생겨 단백질이 짧아짐 (UGG → UGA).</li><li><b>낫 모양 적혈구 병</b>: HBB 유전자의 코돈 GAG가 GUG로 바뀌어 헤모글로빈 β 사슬의 6번째 아미노산이 Glu에서 Val로 바뀐 과오 돌연변이예요. 상염색체 열성이고, 이형 접합자(보인자)는 말라리아에 비교적 강해요.</li></ul>',
      missions: [
        {
          id: 'types', title: '세 가지 유형과 낫 모양 사례 만들기',
          goal: '연습용 mRNA에서 <b>침묵 · 과오 · 넌센스</b>를 한 번씩 만들고, HBB 유전자에서 <b>낫 모양 적혈구</b>(GAG → GUG)를 재현하세요.',
          hint: '침묵은 GAA → GAG(2번째 코돈의 셋째 염기를 G로). 과오는 GAA → GUA(둘째 염기를 U로). 넌센스는 UGG → UGA(4번째 코돈의 셋째 염기를 A로). 낫 모양은 HBB에서 GAG 코돈(7번째)의 가운데 염기 A를 U로 바꿔요.',
          setup() { SEQ.made = { silent: false, missense: false, nonsense: false, sickle: false }; seqLoad('prac'); setMode('point'); },
          check: () => SEQ.made.silent && SEQ.made.missense && SEQ.made.nonsense && SEQ.made.sickle, hold: 0.8,
          status: () => mark(SEQ.made.silent) + ' 침묵 &nbsp; ' + mark(SEQ.made.missense) + ' 과오 &nbsp; ' + mark(SEQ.made.nonsense) + ' 넌센스 &nbsp; ' + mark(SEQ.made.sickle) + ' 낫 모양 사례',
          explain: '<b>침묵</b>은 GAA와 GAG가 모두 Glu이므로 단백질이 그대로예요. <b>과오</b>는 GAA → GUA로 Glu가 Val로 바뀌어요. <b>넌센스</b>는 UGG(Trp)가 UGA(종결 코돈)가 되어 단백질이 아미노산 3개에서 끝나요. <b>낫 모양 적혈구</b>는 HBB의 GAG → GUG로 Glu가 Val로 바뀐 과오 돌연변이이고, 이 변화로 헤모글로빈이 엉겨 적혈구가 낫 모양이 돼요.',
        },
        {
          type: 'quiz', title: '염기가 바뀌어도 형질이 그대로인 까닭',
          goal: 'DNA의 염기가 바뀌었는데도 형질이 변하지 않을 수 있는 가장 알맞은 까닭은?',
          setup() { setMode('point'); },
          choices: ['돌연변이는 항상 DNA가 아닌 곳에서 일어나기 때문이다', '바뀐 코돈이 같은 아미노산을 지정하거나(침묵), 단백질 기능에 영향이 없는 부위에서 일어날 수 있기 때문이다', '염기가 바뀌면 곧바로 원래대로 되돌아가기 때문이다', 'mRNA는 단백질로 번역되지 않기 때문이다'],
          answer: 1,
          feedback: ['돌연변이는 DNA 염기 서열이 바뀌는 것이에요.', '', '자동으로 되돌아가지는 않아요. 일부는 세포의 수리 과정으로 고쳐지기도 하지만 이 까닭은 아니에요.', 'mRNA는 번역되어 단백질이 돼요.'],
          explain: '코돈은 여러 개가 같은 아미노산을 지정하기 때문에(예: GAA와 GAG는 Glu) <b>침묵 돌연변이</b>는 형질을 바꾸지 않아요. 또 단백질의 기능에 중요하지 않은 부위가 바뀌면 영향이 거의 없어요. 돌연변이가 항상 해로운 것은 아니에요.',
        },
      ],
    },
    {
      title: '틀 이동', short: '틀 이동', icon: '📏', phase: '탐구',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 염기 하나가 다른 염기로 <b>바뀌는</b> 점 돌연변이를 봤어요. 염기가 <b>끼어들거나 빠지면</b> 어떻게 될까요?</div><p>mRNA는 AUG부터 <b>3염기씩 묶어(읽기틀)</b> 읽어요. 염기 하나를 삽입하거나 결실하면 묶는 자리가 밀리는데, 3염기를 한꺼번에 결실하면 어떨까요? 비교해 봐요.</p><p>💡 \'삽입 위치\'를 <b>AUG 바로 뒤(3)</b>에 두고 G를 삽입해 보세요.</p>',
      features: ['frame'],
      setup() { seqLoad('prac'); fsOpSet('ins'); setMode('frame'); },
      recap: '염기 수가 3의 배수가 아닌 삽입 · 결실은 읽기틀이 밀리는 틀 이동이라 그 뒤 아미노산이 모두 바뀌고 일찍 종결될 수 있어요. 3의 배수만큼의 결실은 아미노산 몇 개만 없애요. 새 돌연변이 대부분은 단백질에 영향이 없어요.',
      summary: '<ul><li><b>삽입 · 결실</b>: 염기가 끼어들거나 빠지는 돌연변이예요. 변하는 염기 수가 3의 배수가 아니면 <b>틀 이동</b>이 일어나 그 뒤의 아미노산이 모두 달라지고, 종결 코돈이 일찍 나타나기도 해요.</li><li>예) AUG GAA CCA UGG UUU AAA UAA (Met–Glu–Pro–Trp–Phe–Lys) → AUG 뒤에 G 삽입: AUG GGA ACC AUG GUU UAA (Met–Gly–Thr–Met–Val–종결).</li><li><b>3의 배수</b>의 결실은 읽기틀이 유지되고 아미노산 몇 개만 소실돼요. 예) 낭성 섬유증의 대표 변이 ΔF508 = Phe 508번 아미노산 한 개의 소실.</li><li>사람은 한 세대에 염기당 약 1.2 × 10⁻⁸의 새 돌연변이가 생겨요. 이배체 유전체(약 62억 염기쌍)에서 약 70개이고, 암호 부분은 약 1.5 %라서 단백질을 바꿀 수 있는 것은 약 1개예요. <b>대부분의 돌연변이는 영향이 없어요.</b></li></ul>',
      missions: [
        {
          id: 'shift', title: '틀 이동 만들기',
          goal: '염기 하나를 <b>삽입 또는 결실</b>해서 <b>틀 이동</b>을 만들어 보세요.',
          hint: '\'삽입 1개\'를 고르고 삽입 위치를 3(AUG 바로 뒤)으로 둔 뒤 G를 골라 [적용하기]를 눌러요. 읽기틀이 밀리는 것을 확인해요.',
          setup() { FS.shift = false; FS.del3 = false; seqLoad('prac'); fsOpSet('ins'); setMode('frame'); },
          check: () => FS.shift, hold: 0.8,
          status: () => mark(FS.shift) + ' 틀 이동 만들기 (염기 수가 3의 배수가 아니게)',
          explain: 'AUG 바로 뒤에 G를 삽입하면 AUG <b>GGA ACC AUG GUU UAA</b>처럼 3염기씩 묶는 자리가 밀려요. 원래 Glu–Pro–Trp–Phe–Lys였던 부분이 Gly–Thr–Met–Val로 모두 바뀌고, 종결 코돈(UAA)이 일찍 나타나 단백질이 짧아져요. 점 돌연변이보다 영향이 훨씬 커요.',
        },
        {
          id: 'del3', title: '3염기 결실과 비교',
          goal: '[처음 mRNA로]를 눌러 되돌린 뒤 <b>3염기 결실</b>을 적용하고, 틀 이동과 어떻게 다른지 비교하세요.',
          hint: '\'3염기 결실\'을 고르고 결실할 코돈 번호를 2로 둔 뒤 [적용하기]를 눌러요. 삽입한 상태에서 하면 염기 수가 3의 배수가 아니라 확인되지 않아요.',
          setup() { FS.del3 = false; seqLoad('prac'); fsOpSet('del3'); setMode('frame'); },
          check: () => FS.del3, hold: 0.8,
          status: () => mark(FS.del3) + ' 3염기 결실 (염기 수가 정확히 3개 줄어들게)',
          explain: '코돈 하나(3염기)가 빠지면 뒤쪽 읽기틀은 그대로라서 <b>아미노산 하나만 소실</b>돼요. 낭성 섬유증의 대표 변이 <b>ΔF508</b>도 3염기 결실로 Phe 508번 하나가 없어진 경우예요. 염기가 1개나 2개 빠지거나 끼면 읽기틀이 밀려요.',
        },
        {
          type: 'quiz', title: '한 세대에 생기는 새 돌연변이',
          goal: '사람은 한 세대에 염기당 약 1.2 × 10⁻⁸의 돌연변이가 생겨요. 이배체 유전체(약 62억 염기쌍)에서 새 돌연변이는 약 <b>70개</b>이고, 암호 부분은 유전체의 약 <b>1.5 %</b>예요. 단백질을 바꿀 수 있는 새 돌연변이는 약 몇 개일까요?',
          setup() { setMode('frame'); },
          choices: ['약 70개', '약 1개', '약 0.01개', '약 62억 개'],
          answer: 1,
          feedback: ['70개는 유전체 전체에 생기는 새 돌연변이 수예요. 단백질을 만드는 암호 부분(1.5 %)만 골라야 해요.', '', '1.5 %는 0.015예요. 70 × 0.015를 계산해 보세요.', '62억은 유전체의 염기쌍 수예요.'],
          explain: '62억 × 1.2 × 10⁻⁸ ≈ 74 → <b>약 70개</b>, 70 × 0.015 ≈ 1.05 → <b>약 1개</b>예요. 새 돌연변이의 대부분은 단백질 정보가 없는 부분에 생기거나 침묵 돌연변이라서 형질에 영향이 없어요. \'돌연변이는 항상 해롭다\'는 오개념이에요.',
        },
      ],
    },
    {
      title: '유전병의 발병 원인', short: '발병 원인', icon: '🗂', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계들에서</b> 염색체 이상(앞 차시), 유전자 돌연변이, 그리고 다유전자 유전(이 단원 3차시)을 살펴봤어요.</div><p>이제 사람의 <b>유전병 12가지</b>(교육용 요약)를 <b>원인별</b>로 나눠요. <b>단일 유전자 이상 · 염색체 이상 · 다인자</b> 세 가지예요. 원인에 따라 확인하는 방법도 달라요.</p><p>💡 \'체세포 · 생식세포\' 화면에서는 돌연변이가 <b>어디에 생겼는지</b>에 따라 자손에게 전해지는지 달라지는 것을 볼 수 있어요.</p>',
      features: ['cause', 'soma'],
      setup() { setMode('cause'); },
      recap: '유전병은 원인에 따라 단일 유전자 이상(가계도 · 염기 서열 분석), 염색체 이상(핵형 분석), 다인자(가족력 · 생활 습관 · 위험도)로 나뉘고, 생식세포에 생긴 돌연변이만 자손에게 전해져요.',
      summary: '<ul><li><b>단일 유전자 이상</b>: 상염색체 열성(페닐케톤뇨증, 낭성 섬유증, 낫 모양 적혈구 병), 상염색체 우성(연골 무형성증, 헌팅턴병), X 연관 열성(혈우병). 가계도에서 일정한 유전 양상이 나타나고 한 유전자의 염기 서열 분석으로 확인해요.</li><li><b>염색체 이상</b>: 다운 · 터너 · 클라인펠터 · 고양이 울음 증후군. 핵형 분석으로 확인하고 대부분 우연히 생겨요.</li><li><b>다인자</b>: 제2형 당뇨병, 고혈압. 여러 유전자와 환경이 함께 작용해서 가족력 + 생활 습관을 위험도로 표현해요.</li><li><b>체세포 돌연변이</b>(예: 암)는 자손에게 유전되지 않고, <b>생식세포 돌연변이</b>는 자손의 모든 세포에 전해져요. 돌연변이원: 자외선, X선 · 방사선, 일부 화학 물질, 그리고 복제 오류.</li></ul>',
      missions: [
        {
          id: 'sortcause', title: '유전병 카드 12장 분류', manual: true,
          goal: '유전병 카드 12장을 <b>단일 유전자 이상 · 염색체 이상 · 다인자</b> 상자로 나누세요.',
          hint: '카드 아래 작은 글씨를 읽어요. 염색체의 수나 구조 이야기이면 염색체 이상, \'가족력 + 생활 습관\'이면 다인자, 한 유전자의 이상(우성 · 열성 · X 연관)이면 단일 유전자예요.',
          setup() { cauSorter.reset(); setMode('cause'); },
          check() {
            if (CAU_N() < 12) { cauSorter.markBad([]); return '카드를 모두 상자에 넣어 주세요. (' + CAU_N() + ' / 12)'; }
            const w = cauWrong();
            if (!w.length) { cauSorter.markBad([]); return true; }
            cauSorter.markBad(w.map((c) => c.id));
            return '\'' + w[0].label + '\' 카드를 다시 생각해 보세요. 이 병은 무엇이 달라진 걸까요? (' + w.length + '장이 달라요)';
          },
          explain: '<b>단일 유전자 이상</b>: 페닐케톤뇨증 · 낭성 섬유증 · 낫 모양 적혈구 병(상염색체 열성), 연골 무형성증 · 헌팅턴병(상염색체 우성), 혈우병(X 연관 열성). <b>염색체 이상</b>: 다운 · 터너 · 클라인펠터 · 고양이 울음 증후군. <b>다인자</b>: 제2형 당뇨병 · 고혈압. (알비니즘도 상염색체 열성의 단일 유전자 이상이에요.)',
        },
        {
          id: 'tbl', title: '원인별 특징 표 채우기', manual: true,
          goal: '원인별로 <b>무엇이 달라졌는지</b>와 <b>확인 방법</b>을 표에서 골라 채우세요.',
          hint: '단일 유전자는 한 유전자의 염기 서열을 분석하고, 염색체 이상은 핵형을 분석해요. 다인자는 가족력과 생활 습관을 위험도로 나타내요.',
          setup() { ['tc0a', 'tc0b', 'tc1a', 'tc1b', 'tc2a', 'tc2b'].forEach((id) => { $('#' + id).value = ''; $('#' + id).classList.remove('bad'); }); setMode('cause'); },
          check() {
            const a = tblAns();
            if (a.some((r) => !r[0] || !r[1])) return '표의 여섯 칸을 모두 골라 주세요.';
            const bad = []; a.forEach((r, i) => { if (r[0] !== 'gcp'[i]) bad.push(['tc' + i + 'a']); if (r[1] !== 'gcp'[i]) bad.push(['tc' + i + 'b']); });
            ['tc0a', 'tc0b', 'tc1a', 'tc1b', 'tc2a', 'tc2b'].forEach((id) => $('#' + id).classList.toggle('bad', bad.some((b) => b[0] === id)));
            if (bad.length) return '붉게 표시된 칸을 다시 생각해 보세요. (' + bad.length + '칸)';
            return true;
          },
          explain: '<b>단일 유전자 이상</b>은 한 유전자의 염기 서열이 달라진 것이라 가계도와 염기 서열 분석으로 확인해요. <b>염색체 이상</b>은 염색체의 수 · 구조가 달라진 것이라 핵형 분석으로 확인하고 대부분 우연히 생겨요. <b>다인자</b>는 여러 유전자와 환경이 함께 작용해서 가족력과 생활 습관을 위험도로 나타내요.',
        },
        {
          type: 'quiz', title: '자손에게 전해지는 돌연변이',
          goal: '피부 세포의 돌연변이로 생긴 암은 자손에게 유전되지 않는데, 정자나 난자를 만드는 세포의 돌연변이는 전해질 수 있어요. 그 까닭은?',
          setup() { setMode('soma'); },
          choices: ['체세포 돌연변이는 그 사람의 몸에만 남고, 생식세포의 돌연변이는 수정란을 거쳐 자손의 모든 세포로 전해지기 때문이다', '체세포 돌연변이가 생식세포 돌연변이보다 항상 약하기 때문이다', '생식세포에서는 돌연변이가 일어나지 않기 때문이다', '암은 항상 부모에게서 물려받기 때문이다'],
          answer: 0,
          feedback: ['', '세기가 아니라 어느 세포에 생겼는지가 중요해요.', '생식세포에도 돌연변이가 생길 수 있어요.', '암 대부분은 체세포에 쌓인 돌연변이 때문에 생기고 유전되지 않아요. (일부 가족성 암은 생식세포 돌연변이 때문이에요)'],
          explain: '자손은 정자와 난자(생식세포)가 만나 생긴 수정란에서 시작해요. <b>생식세포 돌연변이</b>는 수정란과 자손의 모든 세포에 전해지지만, <b>체세포 돌연변이</b>(예: 자외선으로 생긴 피부암)는 그 사람의 몸 일부에만 있어서 자손에게 전해지지 않아요.',
        },
      ],
    },
    {
      title: '조사 계획 세우기', short: '조사 계획', icon: '📋', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 유전병이 원인에 따라 세 가지로 나뉘고, 확인하는 방법도 다르다는 것을 알았어요.</div><p>이제 유전병 하나를 골라 <b>조사 계획서</b>를 만들어요. <b>유전병 · 조사 질문 · 원인 분류 · 자료 유형 · 조사 방법 · 정리 방식 · 윤리 점검</b> 일곱 칸을 채우고, 점검표가 모두 ✔가 되면 <b>요약 카드</b>(교육용 가상 자료)를 받아 내 계획과 비교해요.</p><p>💡 개인의 사례가 아니라 <b>공개된 통계와 연구 자료</b>를 쓰고, 환자와 가족을 비하하는 표현은 쓰지 않아요. 이 도구에는 학생이나 가족의 정보를 입력하는 곳이 없어요.</p>',
      features: ['plan', 'source'],
      setup() { setMode('plan'); },
      recap: '좋은 조사 계획은 조사할 수 있는 질문, 원인별 분류, 믿을 만한 자료 2곳 이상, 알맞은 조사 방법, 윤리 점검을 갖춰요. 원인에 따라 조사 방법이 달라요.',
      summary: '<ul><li><b>조사 계획서 구성</b>: 조사 질문 · 원인 분류 · 자료 유형(공공기관 통계, 학술 자료, 유전체 데이터베이스, 환자 단체 자료) · 조사 방법(문헌 조사, 통계 해석) · 정리 방식(표, 그래프, 인포그래픽) · 윤리 점검.</li><li><b>점검표</b>: 원인별 분류가 있는가, 자료 출처가 믿을 만한 2곳 이상인가, 질문이 조사 가능한가.</li><li><b>윤리</b>: 개인 사례가 아닌 공개 통계를 쓰고, 환자와 가족을 비하하는 표현을 쓰지 않아요.</li><li><b>원인별 조사 방법</b>: 다운 증후군 → 핵형 분석, 페닐케톤뇨증 → 효소 · 염기 서열 분석, 제2형 당뇨병 → 가족력과 생활 습관(위험도).</li></ul>',
      missions: [
        {
          id: 'plan', title: '조사 계획서 만들기', manual: true,
          goal: '유전병을 하나 골라 계획서 <b>일곱 칸</b>을 채우고, 점검표가 모두 ✔가 되면 <b>요약 카드</b>를 받으세요.',
          hint: '질문은 조사할 수 있는 질문(발병 원인과 조사 방법), 자료는 믿을 만한 2곳 이상, 조사 방법은 문헌 조사나 통계 해석, 윤리 점검은 두 가지 모두 골라요. 원인 분류는 앞 단계의 표를 떠올려요.',
          setup() { plReset(); setMode('plan'); },
          check() {
            if (PL.card) return true;
            const ch = plChecks(), bad = ch.filter((c) => !c[1]);
            if (bad.length) return '아직 점검표에 빠진 곳이 있어요: \'' + bad[0][0] + '\' (' + bad.length + '개)';
            return '점검표가 모두 ✔예요! [📄 요약 카드 받기]를 눌러 내 계획과 비교해 보세요.';
          },
          explain: '좋은 조사 계획은 <b>조사할 수 있는 질문</b>, <b>원인별 분류</b>, <b>믿을 만한 자료 2곳 이상</b>, 알맞은 조사 방법, 윤리 점검을 갖춰요. 요약 카드의 원인 분류와 내 계획을 비교해 보면 조사 방향이 맞는지 확인할 수 있어요.',
        },
        {
          id: 'source', title: '믿을 만한 자료 가려내기', manual: true,
          goal: '자료 카드 6장을 <b>믿을 만해요 / 믿기 어려워요</b> 상자로 나누세요.',
          hint: '출처가 분명하고 다른 사람이 확인할 수 있는 자료인지, 개인의 사례나 개인 정보를 다루는지, 무엇을 팔려는 글인지 생각해 보세요.',
          setup() { srcSorter.reset(); setMode('source'); },
          check() {
            const n = srcSorter.placed;
            if (n < 6) { srcSorter.markBad([]); return '카드를 모두 상자에 넣어 주세요. (' + n + ' / 6)'; }
            const w = srcWrong();
            if (!w.length) { srcSorter.markBad([]); return true; }
            srcSorter.markBad(w.map((c) => c.id));
            return '\'' + w[0].label + '\' 카드를 다시 생각해 보세요. 출처 · 검증 가능성 · 개인 정보를 따져 봐요.';
          },
          explain: '<b>공공기관 공개 통계 · 학술 논문 · 공개 유전체 데이터베이스</b>는 출처가 분명하고 다른 사람이 확인할 수 있어요. <b>출처 없는 후기 · 치료제 광고 글</b>은 근거를 확인할 수 없고, <b>환자 가족의 SNS 사진</b>은 개인의 사례이자 개인 정보라서 조사 자료로 쓰지 않아요.',
        },
        {
          type: 'quiz', title: '원인에 따라 달라지는 조사 방법',
          goal: '유전병을 조사할 때 원인에 따라 조사 방법이 달라지는 예로 알맞은 것은?',
          setup() { setMode('plan'); },
          choices: ['다운 증후군은 핵형 분석, 페닐케톤뇨증은 효소 활성 · 염기 서열 분석, 제2형 당뇨병은 가족력과 생활 습관(위험도)', '모든 유전병은 핵형 분석으로 확인한다', '모든 유전병은 가족력만 보면 충분하다', '원인과 상관없이 모든 유전병은 같은 방법으로 조사한다'],
          answer: 0,
          feedback: ['', '핵형 분석은 염색체의 수 · 구조를 보는 방법이라 한 유전자의 염기 변화는 알 수 없어요.', '다인자 질환은 가족력과 함께 생활 습관 · 환경도 봐야 해요.', '원인이 다르면 달라진 것도 달라서 확인 방법도 달라요.'],
          explain: '<b>염색체 이상</b>은 핵형 분석, <b>단일 유전자 이상</b>은 효소 활성이나 염기 서열 분석(가계도 포함), <b>다인자</b>는 가족력 · 생활 습관을 위험도로 표현해요. 같은 \'유전병\'이라도 원인이 다르면 조사 방법도 달라져요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hg-mutation-disease', mount: '#game', badge: '유전병 조사관', homeHref: '../../index.html#hg',
    featureLabels: { point: '🔤 점 돌연변이', frame: '📏 틀 이동', cause: '🗂 원인 분류', soma: '🧫 체세포 · 생식세포', plan: '📋 조사 계획서', source: '🔍 자료 신뢰성' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 읽음 칸 ---------- */
  function readouts() {
    const m = S.mode;
    if (m === 'point') {
      const c = pointClass(), n = strip(translate(curChars())).length;
      setReads(['바꾼 염기', SEQ.edit ? (SEQ.edit.pos + 1) + '번째 ' + SEQ.orig[SEQ.edit.pos] + ' → ' + SEQ.edit.base : '—', '돌연변이 유형', c ? PT_LAB[c.kind][0].replace(' 돌연변이', '') : '—', '단백질 길이', n + '개']);
    } else if (m === 'frame') {
      const f = fsInfo();
      setReads(['염기 수', SEQ.cur.length + '개', '읽기틀', f.same ? '원래와 같음' : f.shift ? '틀 이동' : '유지', '단백질 길이', f.df.lenM + '개 (원래 ' + f.df.lenO + '개)']);
    } else if (m === 'cause') {
      const z = (id) => cauSorter.cards.filter((c) => c.zone === id).length;
      setReads(['분류한 카드', cauSorter.placed + ' / 12', '단일 유전자', z('gene') + '장', '염색체 · 다인자', z('chrom') + ' · ' + z('poly') + '장']);
    } else if (m === 'soma') {
      setReads(['체세포 돌연변이', so.seenA ? '자손에게 전해지지 않아요' : '—', '생식세포 돌연변이', so.seenB ? '자손에게 전해져요' : '—', '돌연변이원', so.mut ? ({ uv: '자외선', xr: 'X선 · 방사선', chem: '화학 물질', rep: '복제 오류' })[so.mut] : '—']);
    } else if (m === 'plan') {
      const ok = plChecks().filter((c) => c[1]).length, filled = [0, 1, 2, 3, 4, 5, 6].filter((i) => plVal(i)).length;
      setReads(['채운 칸', filled + ' / 7', '점검표', ok + ' / 6', '요약 카드', PL.card ? '받았어요' : '아직']);
    } else {
      const z = (id) => srcSorter.cards.filter((c) => c.zone === id).length;
      setReads(['분류한 카드', srcSorter.placed + ' / 6', '믿을 만해요', z('ok') + '장', '믿기 어려워요', z('no') + '장']);
    }
  }

  /* ---------- 시작 ---------- */
  setMode('point');
  let lastFree = false, lastLv = -1;
  SciSim.loop((dt, t) => {
    clock = t; S.t = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (game && game.level !== lastLv) { lastLv = game.level; updateCtl(); }
    view.apply(); ctx.clearRect(0, 0, VW, VH);
    bgFill('#eef4f2', '#e3ece8');
    FX.update(dt);
    switch (S.mode) {
      case 'point': pointDraw(dt, t); break;
      case 'frame': frameDraw(dt, t); break;
      case 'cause': cauDraw(dt, t); break;
      case 'soma': somaDraw(dt, t); break;
      case 'plan': planDraw(dt, t); break;
      case 'source': srcDraw(dt, t); break;
    }
    FX.draw();
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(241,246,243,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, PHONE, get game() { return game; }, levels, setMode, updateCtl, SEQ, FS, seqLoad, pointSelect, pointBase, pointClass, pointReset, fsOpSet, fsApply, fsReset, fsInfo, translate, codonAA, diffChains, curChars,
    cauSorter, CAU, cauWrong, tblAns, so, somaRun, mutPick, PL, DIS, plChecks, plAllOk, plGetCard, plReset, srcSorter, SRC, srcWrong, PN, SQ,
  };
})();
