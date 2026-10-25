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
     고등학교 생물의 유전 · Ⅰ. 유전자와 유전물질 - DNA 구조의 규명 (단원 59, 7차시)
     성취기준 [12유전01-05] DNA의 구조와 유전물질 규명 관련 과학사적 연구 결과를 설명하기 위한 발표 자료를 창의적으로 제작할 수 있다.
     ① 분석: 샤가프 자료  ② 분석: X선 회절  ③ 모형: 이중 나선  ④ 적용: 발표 자료
     (수치는 근사 예시 값, X선 사진은 교육용 가상 사진이에요)
     ========================================================= */
  const S = { mode: 'chg', fade: 0, t: 0 };
  let game = null;
  const ease = SciSim.ease;
  const BC = { A: '#22c55e', T: '#ef4444', G: '#eab308', C: '#3b82f6' };
  const BT = { A: '#ffffff', T: '#ffffff', G: '#3b2f00', C: '#ffffff' };
  const BN = { A: '아데닌', T: '타이민', G: '구아닌', C: '사이토신' };
  const PUR = { A: true, G: true, T: false, C: false };
  const COMP = { A: 'T', T: 'A', G: 'C', C: 'G' };
  const BASES = ['A', 'T', 'G', 'C'];
  const rr = (x, y, w, h, r) => D.roundRect(x, y, w, h, r);

  /* ---------- 공통: 수 입력, 모드 단추 ---------- */
  const fmt1 = (n) => String(+Number(n).toFixed(2));

  /* =========================================================
     ① 샤가프 자료
     ========================================================= */
  const SP = [
    { id: 'human', n: '사람', A: 31, T: 29, G: 20, C: 20 },
    { id: 'ecoli', n: '대장균', A: 26, T: 24, G: 25, C: 25 },
    { id: 'yeast', n: '효모', A: 31, T: 33, G: 19, C: 17 },
    { id: 'tb', n: '결핵균', A: 15, T: 15, G: 35, C: 35 },
  ];
  const spRatio = (s) => (s.A + s.T) / (s.G + s.C);
  const ratioStr = (s) => spRatio(s).toFixed(2);
  S.chg = { sp: 0, view: 0, seen: { 0: true }, vals: { A: 0, T: 0, G: 0, C: 0 }, pk: 0, sk: 0, ymax: 40, viewSeen: { 0: true }, ruleOn: false, calcOn: false, calcOk: false };
  const CG = PHONE ? { cx: 8, cy: 8, cw: 464, ch: 330, tx: 8, ty: 350, tw: 464 } : { cx: 14, cy: 14, cw: 446, ch: 532, tx: 474, ty: 14, tw: 314 };
  const TBL_COLS = [
    [['A', 'A|(%)'], ['T', 'T|(%)'], ['G', 'G|(%)'], ['C', 'C|(%)']],
    [['d1', 'A와 T|차이'], ['d2', 'G와 C|차이']],
    [['pu', '퓨린|A+G'], ['py', '피리미딘|T+C'], ['rt', '(A+T)/|(G+C)']],
  ];
  function tblVal(s, k) {
    if (k === 'A' || k === 'T' || k === 'G' || k === 'C') return String(s[k]);
    if (k === 'd1') return String(Math.abs(s.A - s.T));
    if (k === 'd2') return String(Math.abs(s.G - s.C));
    if (k === 'pu') return String(s.A + s.G);
    if (k === 'py') return String(s.T + s.C);
    return ratioStr(s);
  }
  const tblRowH = () => (PHONE ? 46 : 54);
  function tblRect(i) { return { x: CG.tx, y: CG.ty + 70 + i * tblRowH(), w: CG.tw, h: tblRowH() - 4 }; }
  function chgSelect(i) {
    if (S.chg.sp === i) return; S.chg.sp = i; S.chg.seen[i] = true; Sound.click(); updateCtl();
  }
  function chgView(v) { S.chg.view = v; S.chg.viewSeen[v] = true; Sound.click(); updateCtl(); }
  const chgSeenN = () => SP.filter((s, i) => S.chg.seen[i]).length;

  function chgDraw(dt, t) {
    const c = S.chg, s = SP[c.sp];
    BASES.forEach((b) => { c.vals[b] = approach(c.vals[b], s[b], dt, 7); });
    c.pk = approach(c.pk, c.view === 1 ? 1 : 0, dt, 6);
    c.sk = approach(c.sk, c.view === 2 ? 1 : 0, dt, 6);
    c.ymax = approach(c.ymax, c.view === 2 ? 60 : 40, dt, 6);
    // 막대 그래프 카드
    panel(CG.cx, CG.cy, CG.cw, CG.ch, 16, '#fff');
    TF(CG.cx + 16, CG.cy + 30, s.n + ' DNA의 염기 조성 (전체 염기 중 %)', CG.cw - 32, L(18, 15), 12, '#14532d', 'left', 800);
    const px = CG.cx + 52, pw = CG.cw - 72, baseY = CG.cy + CG.ch - (PHONE ? 62 : 84), topY = CG.cy + (PHONE ? 100 : 92), ph = baseY - topY;
    const yOf = (v) => baseY - (v / c.ymax) * ph;
    // 눈금선
    const step = c.ymax > 45 ? 20 : 10;
    for (let v = 0; v <= 60; v += step) {
      if (v > c.ymax + 0.5) break;
      ctx.strokeStyle = v === 0 ? '#64748b' : '#e2e8f0'; ctx.lineWidth = v === 0 ? 2 : 1;
      ctx.beginPath(); ctx.moveTo(px - 6, yOf(v)); ctx.lineTo(px + pw, yOf(v)); ctx.stroke();
      T(px - 10, yOf(v) + 5, String(v), 13, '#64748b', 'right', 700);
    }
    const bw = Math.min(PHONE ? 58 : 66, pw / 4 * 0.62);
    const xEven = (i) => px + pw * (i + 0.5) / 4;
    const xPair = (i) => { const gc = px + pw * (i < 2 ? 0.27 : 0.73); return gc + (i % 2 === 0 ? -1 : 1) * (bw * 0.56); };
    const xStack = (i) => px + pw * (i === 0 || i === 2 ? 0.28 : 0.72);   // A,G: 퓨린 / T,C: 피리미딘
    const bw2 = bw * (1 + 0.5 * c.sk);
    const order = ['A', 'T', 'G', 'C'];
    const pos = {};
    order.forEach((b, i) => {
      const xe = lerp(xEven(i), xPair(i), c.pk);
      const stackX = b === 'A' || b === 'G' ? px + pw * 0.28 : px + pw * 0.72;
      const x = lerp(xe, stackX, c.sk);
      const off = b === 'G' ? c.vals.A : b === 'C' ? c.vals.T : 0;
      const o = off * c.sk;
      const v = c.vals[b];
      pos[b] = { x, top: yOf(o + v), bot: yOf(o), v };
    });
    // 쌓기 순서: 아래 → 위
    ['A', 'T', 'G', 'C'].forEach((b) => {
      const p = pos[b], h = p.bot - p.top;
      if (h <= 0.4) return;
      const gx = ctx.createLinearGradient(p.x - bw2 / 2, 0, p.x + bw2 / 2, 0);
      gx.addColorStop(0, C.shade(BC[b], 0.25)); gx.addColorStop(1, C.shade(BC[b], -0.12));
      ctx.fillStyle = gx; rr(p.x - bw2 / 2, p.top, bw2, h, Math.min(8, h / 2)); ctx.fill();
      ctx.strokeStyle = C.shade(BC[b], -0.35); ctx.lineWidth = 1.5; ctx.stroke();
      if (h > 22) T(p.x, p.top + h / 2 + 5, b, 15, BT[b], 'center', 800);
    });
    // 값 이름표
    if (c.sk < 0.5) {
      order.forEach((b) => { const p = pos[b]; D.label(p.x, p.top - 16, Math.round(p.v) + ' %', { bg: '#fff', color: '#1f2d44', border: '#cbd5e1', size: 13 }); });
      order.forEach((b, i) => { const p = pos[b]; T(p.x, baseY + 24, b, 17, C.shade(BC[b], -0.3), 'center', 800); T(p.x, baseY + 42, BN[b], 12.5, '#64748b', 'center', 700); });
    }
    // 짝 묶기: 괄호와 차이
    if (c.pk > 0.05) {
      [['A', 'T'], ['G', 'C']].forEach((pr) => {
        const a = pos[pr[0]], b = pos[pr[1]], y = Math.min(a.top, b.top) - 44;
        ctx.save(); ctx.globalAlpha = Math.min(1, c.pk * (1 - c.sk) * 1.4);
        ctx.strokeStyle = '#15803d'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(a.x, y + 12); ctx.lineTo(a.x, y); ctx.lineTo(b.x, y); ctx.lineTo(b.x, y + 12); ctx.stroke();
        const diff = Math.abs(s[pr[0]] - s[pr[1]]);
        D.label((a.x + b.x) / 2, y - 14, pr[0] + ' ≈ ' + pr[1] + (diff === 0 ? ' (차이 0)' : ' (차이 ' + diff + ')'), { bg: '#15803d', size: 13.5 });
        ctx.restore();
      });
    }
    // 합 비교
    if (c.sk > 0.05) {
      ctx.save(); ctx.globalAlpha = Math.min(1, c.sk * 1.3);
      const sums = [[px + pw * 0.28, '퓨린 A + G', s.A + s.G, (s.A + s.G)], [px + pw * 0.72, '피리미딘 T + C', s.T + s.C, (s.T + s.C)]];
      sums.forEach((q) => {
        T(q[0], baseY + 24, q[1], L(15.5, 14), '#334155', 'center', 800);
        T(q[0], baseY + 44, '= ' + q[2] + ' %', 15, '#15803d', 'center', 800);
        const topv = yOf(q[3]);
        D.label(q[0], topv - 16, q[2] + ' %', { bg: '#fff', color: '#1f2d44', border: '#cbd5e1', size: 13.5 });
      });
      ctx.restore();
    }
    // 아래 요약 줄
    const ry = CG.cy + CG.ch - 14;
    if (c.view === 2) T(CG.cx + CG.cw / 2, ry, '(A + T) / (G + C) = ' + (s.A + s.T) + ' / ' + (s.G + s.C) + ' = ' + ratioStr(s), L(15.5, 14), '#14532d', 'center', 800);
    else T(CG.cx + CG.cw / 2, ry, c.view === 1 ? 'A와 T, G와 C의 양을 짝지어 비교해요' : '막대를 비교해 보세요', 13.5, '#64748b', 'center', 700);

    // 표
    const tx = CG.tx, ty = CG.ty, tw = CG.tw;
    panel(tx, ty, tw, PHONE ? 4 * tblRowH() + 118 : CG.ch, 16, '#fff');
    T(tx + 14, ty + 28, '4종 생물의 염기 조성 (근사 예시 값)', L(15.5, 14), '#14532d', 'left', 800);
    const cols = TBL_COLS[c.view], nameW = PHONE ? 78 : 92, cw = (tw - 24 - nameW) / cols.length;
    cols.forEach((k, j) => { const hs = k[1].split('|'); hs.forEach((h2, q) => TF(tx + 12 + nameW + cw * (j + 0.5), ty + 52 + q * 15, h2, cw - 2, 13, 10.5, '#475569', 'center', 800)); });
    SP.forEach((q, i) => {
      const r = tblRect(i), on = c.sp === i;
      ctx.fillStyle = on ? 'rgba(22,163,74,.14)' : i % 2 ? '#f8fafc' : '#f1f5f9'; rr(r.x + 6, r.y, r.w - 12, r.h, 10); ctx.fill();
      if (on) { ctx.strokeStyle = '#16a34a'; ctx.lineWidth = 2.5; rr(r.x + 6, r.y, r.w - 12, r.h, 10); ctx.stroke(); }
      T(r.x + 18, r.y + r.h / 2 + 6, q.n, L(17, 15), '#26324a', 'left', 800);
      if (c.seen[i]) T(r.x + r.w - 20, r.y + 16, '✓', 14, '#16a34a', 'center', 800);
      cols.forEach((k, j) => {
        const val = tblVal(q, k[0]);
        const isBase = k[0].length === 1;
        T(r.x + 12 + nameW + cw * (j + 0.5), r.y + r.h / 2 + 6, val, L(18, 16), isBase ? C.shade(BC[k[0]], -0.3) : '#1f2d44', 'center', 800);
      });
    });
    const noteY = ty + 70 + 4 * tblRowH() + 10;
    if (chgSeenN() === 4) D.label(tx + tw / 2, ty + (PHONE ? 4 * tblRowH() + 112 : CG.ch - 28), '4종 모두 A ≈ T, G ≈ C', { bg: '#15803d', size: 14 });
    if (c.view === 0) textBlock(tx + 14, noteY + 6, tw - 28, '표의 줄을 눌러 종을 바꿔요. 어느 종에서도 A와 T, G와 C의 양이 거의 같아요.', 13.5, '#475569', 18, 700);
    else if (c.view === 1) textBlock(tx + 14, noteY + 6, tw - 28, '차이가 거의 0이에요. A와 T, G와 C가 짝처럼 움직여요.', 13.5, '#475569', 18, 700);
    else textBlock(tx + 14, noteY + 6, tw - 28, '퓨린과 피리미딘 합은 거의 같지만, (A+T)/(G+C)는 종마다 달라요.', 13.5, '#475569', 18, 700);
  }
  const chgPT = {
    down(p) { for (let i = 0; i < SP.length; i++) if (inRect(p.x, p.y, tblRect(i))) { chgSelect(i); return false; } return false; },
    hover(p) { return SP.some((q, i) => inRect(p.x, p.y, tblRect(i))) ? 'pointer' : 'default'; },
  };
  const RULE_OK = () => $('#ruleA').value === 'T' && $('#ruleG').value === 'C';
  const CALC_OK = { T: 31, G: 19, C: 19 };
  function calcCheck() {
    const ok = {};
    ['T', 'G', 'C'].forEach((k) => { const v = numOf('in' + k); ok[k] = isFinite(v) && Math.abs(v - CALC_OK[k]) <= 0.51; $('#in' + k).classList.toggle('ok', ok[k]); const e = $('#in' + k); if (!ok[k] && e.value.trim() !== '') e.classList.remove('ok'); });
    S.chg.calcOk = ok.T && ok.G && ok.C; return ok;
  }

  /* =========================================================
     ② X선 회절
     ========================================================= */
  const XS = PHONE ? 1.5 : 2.2;                     // 사진에서 1 mm = 몇 px
  const XB = PHONE ? { x: 8, y: 8, w: 464, h: 372 } : { x: 14, y: 14, w: 446, h: 532 };
  const XC = { x: XB.x + XB.w / 2 + 6, y: XB.y + XB.h / 2 };
  const XT = [-100, -50, -40, -30, -20, -10, 0, 10, 20, 30, 40, 50, 100];
  S.xr = { m: [{ mm: -30, tg: -30, drag: false }, { mm: 30, tg: 30, drag: false }], show: 0, showOn: false, recA: false, recB: false, bp: false, msg: '', lastKey: '', pop: { A: 0, B: 0 }, appear: 0 };
  const xrY = (mm) => XC.y + mm * XS;
  const xrHandle = (i) => ({ x: XB.x + XB.w - 22, y: xrY(S.xr.m[i].mm) });
  function xrState() {
    const x = S.xr, a = x.m[0], b = x.m[1];
    const rest = !a.drag && !b.drag && Math.abs(a.mm - a.tg) < 0.05 && Math.abs(b.mm - b.tg) < 0.05;
    const gap = Math.abs(a.tg - b.tg);
    return { rest, gap, a: a.tg, b: b.tg };
  }
  function xrKind(st) {
    if (st.gap === 0) return 'same';
    if (Math.abs(st.a) <= 50 && Math.abs(st.b) <= 50 && st.gap === 10) return 'A';
    if (st.gap === 100 && ((Math.abs(st.a) === 100 && st.b === 0) || (Math.abs(st.b) === 100 && st.a === 0))) return 'B';
    return 'other';
  }
  function xrUpdate(dt) {
    const x = S.xr;
    x.m.forEach((m) => { if (!m.drag) m.mm = RM ? m.tg : approach(m.mm, m.tg, dt, 14); });
    x.show = approach(x.show, x.showOn ? 1 : 0, dt, 6);
    x.appear = RM ? 1 : approach(x.appear, 1, dt, 1.4);
    const st = xrState();
    if (st.rest) {
      const k = xrKind(st);
      if (k === 'A' && !x.recA) { x.recA = true; x.pop.A = 1; Sound.success(); parts.burst(XB.x + XB.w - 30, xrY(st.a), { count: 14, speed: 150 }); updateCtl(); }
      if (k === 'B' && !x.recB) { x.recB = true; x.pop.B = 1; Sound.success(); parts.burst(XB.x + XB.w - 30, xrY(st.a), { count: 14, speed: 150 }); updateCtl(); }
    }
    x.pop.A = approach(x.pop.A, 0, dt, 2); x.pop.B = approach(x.pop.B, 0, dt, 2);
  }
  function spot(x, y, rx, ry, a) {
    ctx.save(); ctx.translate(x, y); ctx.scale(1, ry / rx);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
    g.addColorStop(0, 'rgba(235,245,255,' + (0.95 * a) + ')'); g.addColorStop(0.45, 'rgba(160,200,255,' + (0.45 * a) + ')'); g.addColorStop(1, 'rgba(120,160,230,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, rx, 0, TAU); ctx.fill(); ctx.restore();
  }
  function drawPhoto(t) {
    const x = S.xr, ap = ease.outCubic(clamp(x.appear, 0, 1));
    ctx.save();
    rr(XB.x, XB.y, XB.w, XB.h, 16); ctx.clip();
    const bg = ctx.createLinearGradient(0, XB.y, 0, XB.y + XB.h); bg.addColorStop(0, '#0a1018'); bg.addColorStop(1, '#05080d');
    ctx.fillStyle = bg; ctx.fillRect(XB.x, XB.y, XB.w, XB.h);
    ctx.globalCompositeOperation = 'lighter';
    const k = XS / 2.2;
    // 가운데 빛무리
    const hg = ctx.createRadialGradient(XC.x, XC.y, 0, XC.x, XC.y, 190 * k);
    hg.addColorStop(0, 'rgba(70,95,140,' + (0.5 * ap) + ')'); hg.addColorStop(1, 'rgba(40,60,100,0)');
    ctx.fillStyle = hg; ctx.fillRect(XB.x, XB.y, XB.w, XB.h);
    // 층선마다 X자 모양으로 늘어선 점
    for (let n = -5; n <= 5; n++) {
      const y = xrY(n * 10), an = Math.abs(n);
      const inten = (an === 0 ? 0.55 : clamp(1 - 0.13 * (an - 1), 0.35, 1)) * ap;
      const xo = an === 0 ? 46 * k : (an * 17 + 6) * k;
      [-1, 1].forEach((sg) => {
        spot(XC.x + sg * xo, y, 17 * k, 7 * k, Math.min(1, inten * 1.25));
        if (an > 0) spot(XC.x + sg * (xo + 38 * k), y, 13 * k, 6 * k, inten * 0.5);
      });
      if (an === 1 || an === 2) spot(XC.x, y, 12 * k, 5 * k, inten * 0.35);
      if (an > 0 && an < 5) { const sg2 = ctx.createLinearGradient(XC.x - 120 * k, 0, XC.x + 120 * k, 0); sg2.addColorStop(0, 'rgba(150,190,255,0)'); sg2.addColorStop(0.5, 'rgba(150,190,255,' + (0.16 * ap) + ')'); sg2.addColorStop(1, 'rgba(150,190,255,0)'); ctx.fillStyle = sg2; ctx.fillRect(XC.x - 120 * k, y - 1.2, 240 * k, 2.4); }
    }
    // 짙은 호 (중심에서 100 mm)
    [-1, 1].forEach((sg) => {
      ctx.save(); ctx.strokeStyle = 'rgba(190,220,255,' + (0.85 * ap) + ')'; ctx.lineWidth = 9 * k; ctx.lineCap = 'round';
      ctx.shadowColor = '#9cc7ff'; ctx.shadowBlur = 14;
      ctx.beginPath(); ctx.arc(XC.x, XC.y, 100 * XS, sg * Math.PI / 2 - 0.2, sg * Math.PI / 2 + 0.2); ctx.stroke(); ctx.restore();
    });
    ctx.globalCompositeOperation = 'source-over';
    // 눈금 (왼쪽)
    for (let mm = -100; mm <= 100; mm += 10) {
      const y = xrY(mm), big = mm % 50 === 0;
      ctx.strokeStyle = big ? 'rgba(200,215,235,.9)' : 'rgba(200,215,235,.5)'; ctx.lineWidth = big ? 2 : 1.3;
      ctx.beginPath(); ctx.moveTo(XB.x + 6, y); ctx.lineTo(XB.x + (big ? 24 : 15), y); ctx.stroke();
      if (big) T(XB.x + 28, y + 5, Math.abs(mm) + (mm === 0 ? '' : ''), 13, 'rgba(210,225,245,.9)', 'left', 700);
    }
    T(XB.x + 8, XB.y + 22, 'mm', 13, 'rgba(210,225,245,.9)', 'left', 800);
    // X자 무늬 표시
    if (x.show > 0.01) {
      ctx.save(); ctx.globalAlpha = x.show; ctx.strokeStyle = '#fde047'; ctx.lineWidth = 3; ctx.setLineDash([9, 7]); ctx.lineDashOffset = -t * 18;
      const ext = 6;
      [-1, 1].forEach((sg) => { ctx.beginPath(); ctx.moveTo(XC.x - sg * (ext * 17 + 6) * k, xrY(-ext * 10)); ctx.lineTo(XC.x + sg * (ext * 17 + 6) * k, xrY(ext * 10)); ctx.stroke(); });
      ctx.setLineDash([]);
      D.label(XC.x + 4, XB.y + 36, 'X자 무늬 → 나선 구조', { bg: '#a16207', size: 14 });
      ctx.restore();
    }
    ctx.restore();
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 3; rr(XB.x, XB.y, XB.w, XB.h, 16); ctx.stroke();
    T(XB.x + XB.w / 2, XB.y + XB.h - 12, '가상 X선 회절 사진 (교육용)', 12.5, 'rgba(210,225,245,.85)', 'center', 700);
  }
  /* 세로로 12 bp 정도의 작은 나선 스케치 (측정 기록 옆) */
  function helixSketch(cx, y0, k, nbp, o) {
    o = o || {};
    const R = k, step = 0.34 * k, M = nbp * 4, pts1 = [], pts2 = [];
    for (let j = 0; j <= M; j++) { const i = j / 4, a = 2 * Math.PI * i / 10; pts1.push({ x: cx + R * Math.cos(a), y: y0 + i * step, z: Math.sin(a) }); pts2.push({ x: cx - R * Math.cos(a), y: y0 + i * step, z: -Math.sin(a) }); }
    const seg = (P, back, col) => {
      for (let j = 0; j < M; j++) {
        const zz = (P[j].z + P[j + 1].z) / 2; if ((zz < 0) !== back) continue;
        ctx.strokeStyle = back ? C.shade(col, 0.35) : col; ctx.lineWidth = (back ? 3 : 4.6) * (k / 24); ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(P[j].x, P[j].y); ctx.lineTo(P[j + 1].x, P[j + 1].y); ctx.stroke();
      }
    };
    seg(pts1, true, '#2563eb'); seg(pts2, true, '#7c3aed');
    const vis = o.rungs == null ? nbp : o.rungs;
    for (let i = 0; i < nbp; i++) {
      if (i >= vis) break;
      const p1 = pts1[i * 4], p2 = pts2[i * 4];
      ctx.strokeStyle = i % 2 ? '#fb923c' : '#94a3b8'; ctx.lineWidth = 3 * (k / 24); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
    }
    seg(pts1, false, '#2563eb'); seg(pts2, false, '#7c3aed');
  }
  function xrDraw(dt, t) {
    xrUpdate(dt);
    const x = S.xr;
    drawPhoto(t);
    // 눈금선과 손잡이
    const cols = ['#f59e0b', '#22d3ee'];
    x.m.forEach((m, i) => {
      const y = xrY(clamp(m.mm, -105, 105)), h = xrHandle(i);
      ctx.save(); ctx.strokeStyle = cols[i]; ctx.lineWidth = 2.5; ctx.setLineDash(m.drag ? [] : [8, 5]);
      ctx.beginPath(); ctx.moveTo(XB.x + 34, y); ctx.lineTo(XB.x + XB.w - 8, y); ctx.stroke(); ctx.restore();
      D.shadow(() => { ctx.beginPath(); ctx.arc(h.x, y, m.drag ? 15 : 13, 0, TAU); ctx.fillStyle = cols[i]; ctx.fill(); }, { blur: 6, y: 1 });
      T(h.x, y + 5, String(i + 1), 14, '#0b1220', 'center', 800);
      if (!m.drag && !x.recA && !x.recB && i === 0) D.ring(h.x, y, 20, t, { color: cols[i], speed: 0.9, width: 2 });
    });
    // 측정 카드
    const st = xrState();
    const PX = PHONE ? 8 : 474, PY = PHONE ? 392 : 14, PW = PHONE ? 464 : 314, PH = PHONE ? 240 : 532;
    panel(PX, PY, PW, PH, 16, '#fff');
    TF(PX + 14, PY + 28, '층선 간격 → 반복 거리', PW - 28, L(17, 15), 12, '#14532d', 'left', 800);
    textBlock(PX + 14, PY + 50, PW - 28, '반복 거리(nm) = 34 / 간격(mm)  (간격이 좁을수록 반복 거리가 길어요)', 13, '#64748b', 17, 700);
    const kind = xrKind(st);
    const live = st.gap === 0 ? '두 선이 같은 줄에 있어요' : '간격 ' + st.gap + ' mm → 34 / ' + st.gap + ' = ' + fmt1(34 / st.gap) + ' nm';
    const lc = !st.rest ? '#94a3b8' : (kind === 'A' || kind === 'B') ? '#15803d' : '#475569';
    ctx.fillStyle = '#f8fafc'; rr(PX + 12, PY + 88, PW - 24, 44, 10); ctx.fill();
    TF(PX + PW / 2, PY + 116, st.rest ? live : '선을 놓으면 가까운 줄에 붙어요', PW - 40, L(16, 14.5), 11, lc, 'center', 800);
    let hint = '';
    if (st.rest) {
      if (kind === 'A') hint = '이웃한 층선 사이 간격이에요 → 나선 한 바퀴의 길이';
      else if (kind === 'B') hint = '중심에서 짙은 호까지 → 염기쌍 사이 간격';
      else if (kind === 'other' && st.gap === 200) hint = '위아래 호 사이예요. 중심에서 한쪽 호까지만 재요';
      else if (kind === 'other') hint = '이웃한 층선 한 칸(10 mm) 또는 중심~호(100 mm)를 재 보세요';
    }
    if (hint) textBlock(PX + 14, PY + 154, PW - 28, hint, 13, '#475569', 17, 700);
    // 기록
    const ry = PY + 196;
    const recs = [
      [x.recA, 'A', '층선 한 칸 10 mm → 3.4 nm', '나선 한 바퀴의 길이'],
      [x.recB, 'B', '중심~호 100 mm → 0.34 nm', '염기쌍 사이 간격'],
    ];
    recs.forEach((r, i) => {
      const yy = ry + i * (PHONE ? 38 : 50);
      ctx.fillStyle = r[0] ? 'rgba(22,163,74,.12)' : '#f1f5f9'; rr(PX + 12, yy, PW - 24, PHONE ? 34 : 44, 10); ctx.fill();
      ctx.strokeStyle = r[0] ? '#16a34a' : '#cbd5e1'; ctx.lineWidth = r[0] ? 2.5 : 1.5; rr(PX + 12, yy, PW - 24, PHONE ? 34 : 44, 10); ctx.stroke();
      const sc = 1 + x.pop[r[1]] * 0.04;
      if (r[0]) { D.check(PX + 32, yy + (PHONE ? 17 : 22), 9, 1); TF(PX + 50, yy + (PHONE ? 22 : 20), r[2], PW - 70, L(14.5, 13), 10.5, '#166534', 'left', 800); if (!PHONE) T(PX + 50, yy + 37, r[3], 12.5, '#64748b', 'left', 700); }
      else T(PX + 20, yy + (PHONE ? 22 : 27), '⬜ 측정 ' + r[1] + ': ' + (r[1] === 'A' ? '이웃한 층선 사이' : '중심에서 짙은 호까지'), L(14, 13), '#94a3b8', 'left', 700);
    });
    // 나선 스케치
    if (!PHONE) {
      const sy = PY + 322;
      T(PX + 14, sy, '이 자료로 그린 DNA', 14, '#334155', 'left', 800);
      const kk = 30, hx = PX + 96, hy = sy + 30, nb = x.recA ? 10 : 6;
      ctx.save(); ctx.globalAlpha = x.recA ? 1 : 0.35;
      helixSketch(hx, hy, kk, nb, { rungs: x.recB ? nb : (x.recA ? 0 : 0) });
      ctx.restore();
      if (x.recA) {
        const y1 = hy, y2 = hy + 10 * 0.34 * kk;
        ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(hx + 52, y1); ctx.lineTo(hx + 52, y2); ctx.moveTo(hx + 46, y1); ctx.lineTo(hx + 58, y1); ctx.moveTo(hx + 46, y2); ctx.lineTo(hx + 58, y2); ctx.stroke();
        T(hx + 66, (y1 + y2) / 2 - 4, '한 바퀴', 13.5, '#b45309', 'left', 800); T(hx + 66, (y1 + y2) / 2 + 14, '3.4 nm', 14, '#b45309', 'left', 800);
      }
      if (x.recB) {
        const y1 = hy, y2 = hy + 0.34 * kk;
        T(hx - 76, hy + 36, '염기쌍 사이', 13, '#0e7490', 'right', 800); T(hx - 76, hy + 52, '0.34 nm', 13.5, '#0e7490', 'right', 800);
        ctx.strokeStyle = '#0e7490'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(hx - 70, y1); ctx.lineTo(hx - 70, y2); ctx.moveTo(hx - 76, y1); ctx.lineTo(hx - 64, y1); ctx.moveTo(hx - 76, y2); ctx.lineTo(hx - 64, y2); ctx.stroke();
      }
      if (x.recA && x.recB) D.label(PX + PW / 2, PY + PH - 22, '3.4 / 0.34 = 10 → 한 바퀴에 염기쌍 10개', { bg: '#15803d', size: 13.5 });
      else T(PX + PW / 2, PY + PH - 20, '두 가지를 모두 측정해 보세요', 13, '#94a3b8', 'center', 700);
    }
  }
  const xrPT = {
    down(p) {
      let best = -1, bd = 1e9;
      S.xr.m.forEach((m, i) => {
        const h = xrHandle(i), d1 = Math.hypot(p.x - h.x, p.y - h.y), d2 = (p.x > XB.x && p.x < XB.x + XB.w) ? Math.abs(p.y - xrY(m.mm)) * 1.6 : 1e9;
        const d = Math.min(d1, d2); if (d < bd) { bd = d; best = i; }
      });
      if (best >= 0 && bd < 26) { S.xr.m[best].drag = true; S.xr.cur = best; Sound.tick(); return true; }
      return false;
    },
    move(p) { const m = S.xr.m[S.xr.cur]; if (m && m.drag) m.mm = clamp((p.y - XC.y) / XS, -105, 105); },
    up() {
      const m = S.xr.m[S.xr.cur]; if (!m || !m.drag) return; m.drag = false;
      let b = XT[0]; XT.forEach((v) => { if (Math.abs(v - m.mm) < Math.abs(b - m.mm)) b = v; }); m.tg = b; Sound.click();
    },
    hover(p) { return S.xr.m.some((m, i) => { const h = xrHandle(i); return Math.hypot(p.x - h.x, p.y - h.y) < 20; }) ? 'grab' : 'default'; },
  };
  function xrReset() { S.xr.m[0].mm = S.xr.m[0].tg = -30; S.xr.m[1].mm = S.xr.m[1].tg = 30; S.xr.m.forEach((m) => { m.drag = false; }); updateCtl(); }
  function xrFull() { S.xr = { m: [{ mm: -30, tg: -30, drag: false }, { mm: 30, tg: 30, drag: false }], show: 0, showOn: false, recA: false, recB: false, bp: false, msg: '', pop: { A: 0, B: 0 }, appear: 0, cur: 0 }; $('#inBp').value = ''; $('#inBp').classList.remove('ok', 'bad'); updateCtl(); }

  /* =========================================================
     ③ 염기쌍 맞추기 (틈 폭 2 nm)
     ========================================================= */
  const BW = { pur: 108, pyr: 72 };            // 1 nm = 90 px, 퓨린 1.2 nm / 피리미딘 0.8 nm
  const bw = (b) => (PUR[b] ? BW.pur : BW.pyr);
  const FG = PHONE
    ? { rl: 62, rr: 242, rows: [196, 318], bh: 60, panel: { x: 8, y: 410, w: 464, h: 160 }, resX: 272, resW: 196, tray: { A: [78, 486], G: [208, 486], T: [320, 486], C: [414, 486] }, head: [[143, 'pur'], [367, 'pyr']], headY: 446 }
    : { rl: 112, rr: 292, rows: [216, 346], bh: 60, panel: { x: 500, y: 74, w: 290, h: 300 }, resX: 346, resW: 146, tray: { A: [575, 170], G: [575, 280], T: [715, 170], C: [715, 280] }, head: [[575, 'pur'], [715, 'pyr']], headY: 124 };
  S.fit = { slots: [[null, null], [null, null]], sel: null, drag: null, found: { AT: false, GC: false }, tried: { wide: false, narrow: false }, shake: [0, 0], flash: [0, 0] };
  const slotXY = (r, side) => ({ x: side === 0 ? FG.rl : FG.rr, y: FG.rows[r] });
  function rowEval(r) {
    const a = S.fit.slots[r][0], b = S.fit.slots[r][1];
    if (!a || !b) return null;
    const w = (PUR[a.b] ? 12 : 8) + (PUR[b.b] ? 12 : 8);
    if (w > 20) return 'wide'; if (w < 20) return 'narrow';
    const k = [a.b, b.b].sort().join('');
    return k === 'AT' ? 'AT' : k === 'CG' ? 'GC' : 'wrong';
  }
  const fitFound = () => S.fit.found.AT && S.fit.found.GC && S.fit.tried.wide && S.fit.tried.narrow;
  function fitPlace(r, side, b) {
    const f = S.fit, was = f.slots[r][side];
    f.slots[r][side] = { b, t: RM ? 1 : 0 };
    f.sel = null; Sound.click();
    const st = rowEval(r);
    if (st) {
      f.shake[r] = 1; f.flash[r] = 1;
      const y = FG.rows[r];
      if (st === 'wide') f.tried.wide = true;
      else if (st === 'narrow') f.tried.narrow = true;
      else if (st === 'AT' || st === 'GC') {
        if (!f.found[st]) { Sound.success(); parts.burst(FG.rl + 90, y, { count: 18, speed: 170, colors: [BC.A, BC.T, BC.G, BC.C, '#fff'] }); }
        f.found[st] = true;
      } else Sound.fail();
      if (st === 'wide' || st === 'narrow') Sound.fail();
    }
    updateCtl();
  }
  function fitClearAll() { const f = S.fit; f.slots = [[null, null], [null, null]]; f.sel = null; f.drag = null; f.shake = [0, 0]; f.flash = [0, 0]; updateCtl(); }
  function fitReset() { fitClearAll(); S.fit.found = { AT: false, GC: false }; S.fit.tried = { wide: false, narrow: false }; updateCtl(); }
  function hexPath(x, y, r) { ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + i * Math.PI / 3; ctx[i ? 'lineTo' : 'moveTo'](x + r * Math.cos(a), y + r * Math.sin(a)); } ctx.closePath(); }
  function pentPath(x, y, r) { ctx.beginPath(); for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * 2 * Math.PI / 5; ctx[i ? 'lineTo' : 'moveTo'](x + r * Math.cos(a), y + r * Math.sin(a)); } ctx.closePath(); }
  /* 염기 블록: 중심 (cx, cy). 퓨린은 고리 2개, 피리미딘은 고리 1개 */
  function baseBlock(cx, cy, b, o) {
    o = o || {};
    const w = bw(b) * (o.s || 1), h = 60 * (o.s || 1), x = cx - w / 2, y = cy - h / 2;
    ctx.save(); ctx.globalAlpha = o.alpha == null ? 1 : o.alpha;
    D.shadow(() => {
      const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, C.shade(BC[b], 0.28)); g.addColorStop(1, C.shade(BC[b], -0.12));
      rr(x, y, w, h, 12); ctx.fillStyle = g; ctx.fill();
    }, { blur: o.lift ? 12 : 5, y: o.lift ? 6 : 2 });
    ctx.strokeStyle = C.shade(BC[b], -0.4); ctx.lineWidth = 2; rr(x, y, w, h, 12); ctx.stroke();
    // 고리
    ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 2;
    const rx = x + 14 * (o.s || 1), ry = y + h - 15 * (o.s || 1), r = 8.5 * (o.s || 1);
    if (PUR[b]) { hexPath(rx + 5, ry, r); ctx.stroke(); pentPath(rx + 5 + r * 1.78, ry - 1, r * 0.9); ctx.stroke(); }
    else { hexPath(rx + 5, ry, r); ctx.stroke(); }
    T(cx, cy - 2, b, 24 * (o.s || 1), BT[b], 'center', 800);
    ctx.restore();
  }
  function railV(x, y0, y1, phase) {
    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y1); ctx.stroke();
    let k = 0;
    for (let y = y0 + 8; y < y1; y += 26, k++) {
      if (k % 2 === 0) D.sphere(x, y, 7, '#fb923c', { gloss: false });
      else { pentPath(x, y, 8.5); ctx.fillStyle = '#38bdf8'; ctx.fill(); ctx.strokeStyle = '#0284c7'; ctx.lineWidth = 1.5; ctx.stroke(); }
    }
  }
  function fitDraw(dt, t) {
    const f = S.fit;
    f.shake = f.shake.map((v) => Math.max(0, v - dt * 3)); f.flash = f.flash.map((v) => Math.max(0, v - dt * 1.4));
    f.slots.forEach((row) => row.forEach((s) => { if (s) s.t = RM ? 1 : approach(s.t, 1, dt, 9); }));
    T(PHONE ? VW / 2 : 224, PHONE ? 30 : 38, '염기쌍 맞추기', L(21, 18), '#14532d', 'center', 800);
    T(PHONE ? VW / 2 : 224, PHONE ? 52 : 62, '두 가닥의 뼈대 사이 틈은 항상 같아요', L(14.5, 13), '#64748b', 'center', 700);
    const top = FG.rows[0] - 70, bot = FG.rows[1] + 70;
    // 틈 폭 표시
    D.arrow(FG.rl, top - 6, FG.rr, top - 6, { color: '#0f766e', width: 2.5, head: 10 }); D.arrow(FG.rr, top - 6, FG.rl, top - 6, { color: '#0f766e', width: 2.5, head: 10 });
    D.label((FG.rl + FG.rr) / 2, top - 26, '틈 폭 2 nm (일정)', { bg: '#0f766e', size: 13.5 });
    railV(FG.rl - 12, top + 4, bot, 0); railV(FG.rr + 12, top + 4, bot, 0);
    T(FG.rl - 12, bot + 24, '당–인산', 13, '#64748b', 'center', 800); T(FG.rr + 12, bot + 24, '뼈대', 13, '#64748b', 'center', 800);
    for (let r = 0; r < 2; r++) {
      const y = FG.rows[r], st = rowEval(r), sh = f.shake[r] > 0 && !RM ? Math.sin(clock * 60) * 5 * f.shake[r] : 0;
      // 빈 자리 표시
      [0, 1].forEach((side) => {
        if (f.slots[r][side]) return;
        const x0 = side === 0 ? FG.rl : FG.rr - 90;
        ctx.setLineDash([6, 5]); ctx.strokeStyle = 'rgba(100,116,139,.55)'; ctx.lineWidth = 2; rr(x0, y - 30, 90, 60, 12); ctx.stroke(); ctx.setLineDash([]);
        T(x0 + 45, y + 5, side === 0 ? '왼쪽 자리' : '오른쪽 자리', 12.5, '#94a3b8', 'center', 700);
      });
      const L0 = f.slots[r][0], R0 = f.slots[r][1];
      const drawSide = (s, side) => {
        if (!s) return;
        const te = ease.outBack(clamp(s.t, 0, 1)), w = bw(s.b);
        const cxs = side === 0 ? FG.rl + w / 2 - (1 - te) * 46 : FG.rr - w / 2 + (1 - te) * 46;
        baseBlock(cxs + sh, y, s.b, { alpha: st === 'wide' ? 0.88 : 1 });
        // 뼈대와 연결 막대
        ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 4; ctx.beginPath();
        if (side === 0) { ctx.moveTo(FG.rl - 12, y); ctx.lineTo(FG.rl - 1, y); } else { ctx.moveTo(FG.rr + 1, y); ctx.lineTo(FG.rr + 12, y); }
        ctx.stroke();
      };
      drawSide(L0, 0); drawSide(R0, 1);
      if (L0 && R0 && st) {
        const wl = bw(L0.b), wr = bw(R0.b), jx = FG.rl + wl;
        if (st === 'wide') {
          const ox0 = FG.rr - wr, ox1 = FG.rl + wl;
          ctx.fillStyle = 'rgba(220,38,38,.35)'; ctx.fillRect(ox0, y - 30, ox1 - ox0, 60);
          ctx.strokeStyle = '#dc2626'; ctx.lineWidth = 2.5; ctx.strokeRect(ox0, y - 30, ox1 - ox0, 60);
        } else if (st === 'narrow') {
          const gx0 = FG.rl + wl, gx1 = FG.rr - wr;
          ctx.setLineDash([5, 4]); ctx.strokeStyle = '#dc2626'; ctx.lineWidth = 2.5; ctx.strokeRect(gx0, y - 30, gx1 - gx0, 60); ctx.setLineDash([]);
          ctx.fillStyle = 'rgba(220,38,38,.10)'; ctx.fillRect(gx0, y - 30, gx1 - gx0, 60);
        } else if (st === 'AT' || st === 'GC') {
          D.glow(jx, y, 70, '#22c55e', 0.35 + 0.4 * f.flash[r]);
          const n = st === 'AT' ? 2 : 3;
          ctx.strokeStyle = '#fff'; ctx.lineWidth = 3.4; ctx.lineCap = 'round';
          for (let q = 0; q < n; q++) { const yy = y + (q - (n - 1) / 2) * 11; ctx.beginPath(); ctx.moveTo(jx - 7, yy); ctx.lineTo(jx + 7, yy); ctx.stroke(); }
        } else {
          ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 3; ctx.setLineDash([4, 4]); ctx.strokeRect(FG.rl - 2, y - 32, 184, 64); ctx.setLineDash([]);
        }
      }
      // 결과 글자
      const rx = FG.resX;
      let msg, col;
      if (!st) { msg = L0 || R0 ? '반대쪽 자리에도 블록을 놓아요' : '왼쪽·오른쪽 자리에 블록을 놓아요'; col = '#94a3b8'; }
      else if (st === 'wide') { msg = '✖ 너무 넓어요 (고리 2개 + 고리 2개)'; col = '#b91c1c'; }
      else if (st === 'narrow') { msg = '✖ 너무 좁아요 (고리 1개 + 고리 1개)'; col = '#b91c1c'; }
      else if (st === 'wrong') { msg = '▲ 너비는 맞지만 샤가프 규칙(A와 T, G와 C)과 달라요'; col = '#b45309'; }
      else { msg = '✔ ' + (st === 'AT' ? 'A–T' : 'G–C') + ' 짝! 수소 결합 ' + (st === 'AT' ? 2 : 3) + '개'; col = '#15803d'; }
      textBlock(rx, y - 12, FG.resW, msg, L(14, 13.5), col, 18, 800);
    }
    // 염기 블록 보관함
    const P = FG.panel;
    panel(P.x, P.y, P.w, P.h, 16, '#fff');
    FG.head.forEach((h) => T(h[0], FG.headY, h[1] === 'pur' ? '퓨린 (고리 2개)' : '피리미딘 (고리 1개)', L(14.5, 13.5), '#334155', 'center', 800));
    BASES.forEach((b) => {
      const p = FG.tray[b], dragging = f.drag && f.drag.b === b && f.drag.moved;
      if (!dragging) {
        baseBlock(p[0], p[1], b, { s: 1 });
        if (f.sel === b) D.ring(p[0], p[1], 46, t, { color: '#f59e0b', speed: 1, width: 3 });
      } else baseBlock(p[0], p[1], b, { s: 1, alpha: 0.28 });
      T(p[0], p[1] + 48, BN[b], 13, '#475569', 'center', 800);
    });
    if (f.drag && f.drag.moved) baseBlock(f.drag.x, f.drag.y, f.drag.b, { s: 1.06, lift: true });
    // 둘 다 맞았을 때 칭찬
    if (f.found.AT && f.found.GC) {
      const yy = PHONE ? 600 : 500;
      D.label(PHONE ? VW / 2 : 224, yy, '샤가프 규칙으로 정해진 짝: A–T, G–C', { bg: '#15803d', size: L(15, 13.5) });
    } else {
      const yy = PHONE ? 596 : 492;
      textBlock(PHONE ? 20 : 30, yy - 8, PHONE ? 440 : 440, '고리 수 때문에 폭이 달라요: 퓨린 1.2 nm, 피리미딘 0.8 nm (상대 크기). 틈 2.0 nm에 딱 맞는 조합을 찾아봐요.', 13.5, '#475569', 18, 700);
    }
  }
  const fitPT = {
    down(p) {
      const f = S.fit;
      for (const b of BASES) {
        const q = FG.tray[b];
        if (Math.abs(p.x - q[0]) <= bw(b) / 2 + 4 && Math.abs(p.y - q[1]) <= 34) { f.drag = { b, x: p.x, y: p.y, sx: p.x, sy: p.y, moved: false }; Sound.tick(); return true; }
      }
      // 고른 블록이 있으면 누른 자리에 놓아요 (이미 블록이 있으면 바꿔요)
      if (f.sel) { const t = fitTarget(p); if (t) { fitPlace(t.r, t.side, f.sel); return false; } }
      // 놓은 블록을 누르면 치워요
      for (let r = 0; r < 2; r++) for (let sd = 0; sd < 2; sd++) {
        const s = f.slots[r][sd]; if (!s) continue;
        const w = bw(s.b), x0 = sd === 0 ? FG.rl : FG.rr - w;
        if (p.x >= x0 && p.x <= x0 + w && Math.abs(p.y - FG.rows[r]) <= 30) { f.slots[r][sd] = null; Sound.click(); updateCtl(); return false; }
      }
      return false;
    },
    move(p) { const d = S.fit.drag; if (!d) return; d.x = p.x; d.y = p.y; if (Math.hypot(p.x - d.sx, p.y - d.sy) > 8) d.moved = true; },
    up(p) {
      const f = S.fit, d = f.drag; if (!d) return; f.drag = null;
      if (!d.moved) { f.sel = f.sel === d.b ? null : d.b; Sound.click(); return; }
      const t = fitTarget(p); if (t) fitPlace(t.r, t.side, d.b);
    },
    hover(p) { return BASES.some((b) => { const q = FG.tray[b]; return Math.abs(p.x - q[0]) <= bw(b) / 2 && Math.abs(p.y - q[1]) <= 30; }) ? 'grab' : 'default'; },
  };
  function fitTarget(p) {
    for (let r = 0; r < 2; r++) {
      if (Math.abs(p.y - FG.rows[r]) <= 62 && p.x >= FG.rl - 40 && p.x <= FG.rr + 40) return { r, side: p.x < (FG.rl + FG.rr) / 2 ? 0 : 1 };
    }
    return null;
  }

  /* =========================================================
     ③ 이중 나선 만들기 (사다리 → 방향 → 꼬기)
     ========================================================= */
  const HX_N = 20, HX_SEQ = 'ATGCCGTAGCTAGGCATCGA';
  const HK = PHONE ? 40 : 66;                     // 1 nm = HK px
  const HC = PHONE ? { cx: 118, y0: 92 } : { cx: 230, y0: 86 };
  S.hx = { vis: 0, build: false, dir: false, dirT: 0, tw: 0, twT: 0, twDone: false, dirSeen: false };
  function hxPts(tw, ph) {
    const R = HK, step = 0.34 * HK, M = HX_N * 4, p1 = [], p2 = [];
    for (let j = 0; j <= M; j++) {
      const i = j / 4, a = tw * 2 * Math.PI * i / 10 + ph;
      p1.push({ x: HC.cx + R * Math.cos(a), y: HC.y0 + i * step, z: Math.sin(a) });
      p2.push({ x: HC.cx - R * Math.cos(a), y: HC.y0 + i * step, z: -Math.sin(a) });
    }
    return [p1, p2];
  }
  function hxDraw(dt, t) {
    const h = S.hx;
    if (h.build) h.vis = RM ? HX_N : Math.min(HX_N, h.vis + dt * 7);
    h.tw = RM ? h.twT : approach(h.tw, h.twT, dt, 1.1);
    if (Math.abs(h.tw - h.twT) < 0.004) h.tw = h.twT;
    h.dirT = approach(h.dirT, h.dir ? 1 : 0, dt, 6);
    const tw = h.tw, R = HK, step = 0.34 * HK, M = HX_N * 4, lw = Math.max(2.4, HK * 0.075);
    const [p1, p2] = hxPts(tw, 0);
    const seg = (P, back, col) => {
      for (let j = 0; j < M; j++) {
        const zz = (P[j].z + P[j + 1].z) / 2; if ((zz < -1e-6) !== back) continue;
        ctx.strokeStyle = back ? C.shade(col, 0.4) : col; ctx.lineWidth = lw * (back ? 1.05 : 1.45); ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(P[j].x, P[j].y); ctx.lineTo(P[j + 1].x, P[j + 1].y); ctx.stroke();
      }
    };
    T(PHONE ? VW / 2 : 400, PHONE ? 28 : 32, tw < 0.05 ? '사다리 모양 (펼친 DNA)' : '이중 나선 모형', L(20, 17), '#14532d', 'center', 800);
    const c1 = '#2563eb', c2 = '#7c3aed';
    seg(p1, true, c1); seg(p2, true, c2);
    // 염기쌍 막대
    for (let i = 0; i < HX_N; i++) {
      const a = clamp(h.vis - i, 0, 1); if (a <= 0) continue;
      const q1 = p1[i * 4], q2 = p2[i * 4], mx = (q1.x + q2.x) / 2, b1 = HX_SEQ[i], b2 = COMP[b1];
      ctx.save(); ctx.globalAlpha = a; ctx.lineCap = 'round'; ctx.lineWidth = Math.max(3.5, HK * 0.1);
      ctx.strokeStyle = BC[b1]; ctx.beginPath(); ctx.moveTo(q1.x, q1.y); ctx.lineTo(mx, q1.y); ctx.stroke();
      ctx.strokeStyle = BC[b2]; ctx.beginPath(); ctx.moveTo(mx, q1.y); ctx.lineTo(q2.x, q1.y); ctx.stroke();
      if (tw < 0.1 && HK > 50) { T((q1.x + mx) / 2, q1.y + 4.5, b1, 13, '#fff', 'center', 800, { stroke: C.shade(BC[b1], -0.4), strokeWidth: 3 }); T((q2.x + mx) / 2, q1.y + 4.5, b2, 13, '#fff', 'center', 800, { stroke: C.shade(BC[b2], -0.4), strokeWidth: 3 }); }
      ctx.restore();
    }
    seg(p1, false, c1); seg(p2, false, c2);
    // 방향 화살표
    if (h.dirT > 0.02) {
      ctx.save(); ctx.globalAlpha = h.dirT;
      const arrowOn = (P, j0, j1, col) => {
        ctx.strokeStyle = col; ctx.lineWidth = lw * 1.9; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        const dir = j1 > j0 ? 1 : -1;
        ctx.beginPath(); ctx.moveTo(P[j0].x, P[j0].y);
        for (let j = j0 + dir; j !== j1 + dir; j += dir) ctx.lineTo(P[j].x, P[j].y); ctx.stroke();
        const e = P[j1], pr = P[j1 - dir], ang = Math.atan2(e.y - pr.y, e.x - pr.x), hs = Math.max(9, HK * 0.2);
        ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(e.x + Math.cos(ang) * hs, e.y + Math.sin(ang) * hs);
        ctx.lineTo(e.x + Math.cos(ang + 2.5) * hs * 0.9, e.y + Math.sin(ang + 2.5) * hs * 0.9); ctx.lineTo(e.x + Math.cos(ang - 2.5) * hs * 0.9, e.y + Math.sin(ang - 2.5) * hs * 0.9); ctx.closePath(); ctx.fill();
      };
      arrowOn(p1, Math.round(M * 0.8), Math.round(M * 0.5), '#1d4ed8');
      arrowOn(p2, Math.round(M * 0.2), Math.round(M * 0.5), '#6d28d9');
      ctx.restore();
      const lx = HC.cx + R + (PHONE ? 26 : 60);
      D.label(lx, HC.y0 + 3 * step, '가닥 1 ↑ 위쪽으로', { bg: '#1d4ed8', size: L(13.5, 12.5), align: 'left' });
      D.label(lx, HC.y0 + 6 * step, '가닥 2 ↓ 아래쪽으로', { bg: '#6d28d9', size: L(13.5, 12.5), align: 'left' });
      textBlock(lx, HC.y0 + 9 * step, PHONE ? 150 : 210, '두 가닥은 서로 반대 방향(역평행)이에요.', L(14, 13), '#334155', 18, 800);
    }
    // 치수 표시 (꼬인 뒤)
    if (tw > 0.7 && h.vis >= HX_N) {
      const al = clamp((tw - 0.7) / 0.3, 0, 1);
      ctx.save(); ctx.globalAlpha = al;
      const dy = HC.y0 - 16;
      D.arrow(HC.cx - R, dy, HC.cx + R, dy, { color: '#0f766e', width: 2, head: 8 }); D.arrow(HC.cx + R, dy, HC.cx - R, dy, { color: '#0f766e', width: 2, head: 8 });
      D.label(HC.cx, dy - 14, '지름 2 nm', { bg: '#0f766e', size: 13 });
      const bx = HC.cx + R + (PHONE ? 196 : 300), y1 = HC.y0 + 2 * step, y2 = HC.y0 + 12 * step;
      ctx.strokeStyle = '#b45309'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(bx, y1); ctx.lineTo(bx, y2); ctx.moveTo(bx - 8, y1); ctx.lineTo(bx + 8, y1); ctx.moveTo(bx - 8, y2); ctx.lineTo(bx + 8, y2); ctx.stroke();
      T(bx + 12, (y1 + y2) / 2 - 4, PHONE ? '한 바퀴' : '한 바퀴 3.4 nm', L(14.5, 13), '#b45309', 'left', 800);
      T(bx + 12, (y1 + y2) / 2 + 15, '염기쌍 10개', L(14, 12.5), '#b45309', 'left', 800);
      const sy1 = HC.y0 + 15 * step, sy2 = HC.y0 + 16 * step, sx = bx;
      ctx.strokeStyle = '#0e7490'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(sx, sy1); ctx.lineTo(sx, sy2); ctx.moveTo(sx - 7, sy1); ctx.lineTo(sx + 7, sy1); ctx.moveTo(sx - 7, sy2); ctx.lineTo(sx + 7, sy2); ctx.stroke();
      T(sx + 12, (sy1 + sy2) / 2 + 5, PHONE ? '0.34 nm' : '염기쌍 사이 0.34 nm', L(14, 12.5), '#0e7490', 'left', 800);
      ctx.restore();
    }
    if (!h.build) D.label(PHONE ? VW / 2 : 400, PHONE ? 330 : 300, '① 단추로 규칙(A–T, G–C)에 맞는 사다리를 만들어요', { bg: '#14532d', size: L(14, 12.5) });
    // 끝 안내
    if (h.twDone) D.label(PHONE ? VW / 2 : 400, PHONE ? 606 : 538, '염기쌍은 안쪽, 당–인산 뼈대는 바깥쪽!', { bg: '#15803d', size: L(14.5, 13) });
  }
  function hxNoteText() {
    const h = S.hx;
    if (!h.build) return '먼저 <b>사다리 만들기</b>를 눌러요. 샤가프 규칙(A–T, G–C)에 따라 염기쌍이 한 줄씩 생겨요.';
    if (!h.dirSeen) return '두 가닥이 <b>어느 방향</b>인지 <b>② 방향 보기</b>로 확인해요.';
    if (!h.twDone) return '이제 <b>③ 꼬기</b>를 눌러 사다리를 나선으로 꼬아요.';
    return '완성! 염기쌍 폭이 일정해서 DNA 지름도 일정해요.';
  }
  function hxReset() { S.hx = { vis: 0, build: false, dir: false, dirT: 0, tw: 0, twT: 0, twDone: false, dirSeen: false }; updateCtl(); }

  /* =========================================================
     ④ 발표 자료 (연표 카드를 골라 배치)
     ========================================================= */
  const TLC = [
    { id: 'g', base: 'g', y: 1928, label: '1928', sub: '그리피스', icon: '🐭', col: '#2563eb', grp: 'mat', num: 'R형→S형',
      data: '살아 있는 R형 세균 + 열처리해 죽인 S형 세균을 쥐에 주사', found: '쥐가 죽고 살아 있는 S형이 나옴 → R형이 S형으로 바뀌는 형질 전환', next: '형질을 바꾼 물질의 정체는 무엇일까?' },
    { id: 'a', base: 'a', y: 1944, label: '1944', sub: '에이버리 등', icon: '🧫', col: '#2563eb', grp: 'mat', num: 'DNA 분해 효소',
      data: 'S형 추출물에 단백질·RNA·DNA 분해 효소를 각각 처리해 R형과 섞음', found: 'DNA 분해 효소를 처리했을 때만 형질 전환이 일어나지 않음 → 형질 전환 물질은 DNA', next: 'DNA는 어떤 구조여서 정보를 담을까?' },
    { id: 'a2', base: 'a', y: 1944, label: '1944', sub: '에이버리 등', icon: '🧫', col: '#2563eb', grp: 'mat', num: '단백질', bad: true,
      data: 'S형 추출물에 단백질·RNA·DNA 분해 효소를 각각 처리해 R형과 섞음', found: '단백질 분해 효소를 처리했을 때만 형질 전환이 일어나지 않음 → 형질 전환 물질은 단백질', next: '단백질은 어떤 구조일까?' },
    { id: 's', base: 's', y: 1949, label: '1949~50', sub: '샤가프', icon: '📊', col: '#16a34a', grp: 'str', num: 'A≈T, G≈C',
      data: '여러 생물의 DNA 염기 조성을 분석', found: '같은 종에서 A≈T, G≈C (종마다 A+T와 G+C의 비율은 다름)', next: '이 규칙은 DNA의 어떤 구조를 뜻할까?' },
    { id: 'f', base: 'f', y: 1951, label: '1951~52', sub: '프랭클린·윌킨스', icon: '📷', col: '#16a34a', grp: 'str', num: '3.4 nm',
      data: 'DNA 섬유의 X선 회절 사진(사진 51)', found: 'X자 무늬 → 나선 구조. 한 바퀴 3.4 nm, 지름 약 2 nm', next: '두 자료를 모두 만족하는 모형은?' },
    { id: 'h', base: 'h', y: 1952, label: '1952', sub: '허시·체이스', icon: '🦠', col: '#2563eb', grp: 'mat', num: '³²P·³⁵S',
      data: '³²P(DNA)와 ³⁵S(단백질)로 표지한 T2 파지를 대장균에 감염', found: '대장균 안으로 들어가 자손 파지를 만든 것은 DNA → DNA가 유전 물질', next: 'DNA는 어떤 구조일까?' },
    { id: 'w', base: 'w', y: 1953, label: '1953', sub: '왓슨·크릭', icon: '🧬', col: '#16a34a', grp: 'str', num: '지름 2 nm',
      data: '샤가프의 염기 조성과 프랭클린의 X선 자료를 설명하는 모형 제작', found: '당–인산 뼈대가 바깥에 있고 염기가 A–T, G–C로 짝을 이룬 역평행 이중 나선', next: '이 구조에서 DNA는 어떻게 복제될까?' },
    { id: 'w2', base: 'w', y: 1953, label: '1953', sub: '왓슨·크릭', icon: '🧬', col: '#16a34a', grp: 'str', num: '지름 2 nm', bad: true,
      data: '샤가프의 염기 조성과 프랭클린의 X선 자료를 설명하는 모형 제작', found: '같은 염기끼리(A–A, G–G) 짝을 이루고 염기가 바깥에 있는 이중 나선', next: '이 구조에서 DNA는 어떻게 복제될까?' },
    { id: 'm', base: 'm', y: 1958, label: '1958', sub: '메셀슨·스탈', icon: '⚖️', col: '#64748b', grp: 'rep', num: '15N·14N',
      data: '¹⁵N으로 표지한 대장균 DNA의 밀도 분석 (다음 차시)', found: 'DNA는 반보존적으로 복제됨', next: '복제의 의미는 무엇일까?' },
  ];
  const TL_LINK = { g: ['a'], a: ['s', 'h'], s: ['f', 'w'], f: ['w'], h: ['w'], w: ['m'], m: [] };
  const TL_BY = {}; TLC.forEach((c) => { TL_BY[c.id] = c; });
  const FMT_NAME = { tl: '연표 인포그래픽', cn: '카드뉴스', st: '영상 콘티' };
  const TKW = PHONE ? { cw: 150, ch: 46, per: 3, x0: 8, y0: 300, dx: 156, dy: 52 } : { cw: 120, ch: 54, per: 4, x0: 14, y0: 344, dx: 126, dy: 60 };
  const TKB = PHONE ? { x: 8, y: 54, w: 464, h: 236 } : { x: 14, y: 60, w: 504, h: 270 };
  const TKP = PHONE ? { x: 8, y: 466, w: 464, h: 170 } : { x: 532, y: 60, w: 256, h: 486 };
  S.talk = { sel: null, fmt: '', vis: {}, credit: '' };
  let talk = null;
  function talkInit() {
    talk = selectable({
      cards: TLC.map((c) => ({ id: c.id, label: c.label, sub: c.sub, icon: c.icon, col: c.col })),
      boxes: [{ id: 'board', label: '발표 자료 보드: 시간 순서대로 4~6장', col: '#16a34a', x: TKB.x, y: TKB.y, w: TKB.w, h: TKB.h, cols: 2, hdr: 30 }],
      tray: (i) => ({ x: TKW.x0 + (i % TKW.per) * TKW.dx, y: TKW.y0 + Math.floor(i / TKW.per) * TKW.dy }),
      cw: TKW.cw, ch: TKW.ch, kh: PHONE ? 38 : 40,
      afterTap: (c) => { S.talk.sel = c.id; },
      onChange: () => { updateCtl(); },
    });
    talk.layout(true);
  }
  const talkMembers = () => talk.cards.filter((c) => c.zone === 'board').sort((a, b) => a.seq - b.seq);
  function talkEval() {
    const mem = talkMembers().map((c) => TL_BY[c.id]), tk = S.talk;
    const r = { n: mem.length, bad: [], order: true, chain: true, facts: true, fmt: !!tk.fmt, vis: Object.keys(tk.vis).filter((k) => tk.vis[k]).length, credit: tk.credit === 'fr', hasF: mem.some((c) => c.id === 'f') };
    mem.forEach((c, i) => {
      if (c.bad) { r.facts = false; r.bad.push(c.id); }
      if (i > 0) {
        const pv = mem[i - 1];
        if (!(c.y > pv.y)) { r.order = false; r.bad.push(c.id); }
        else if (TL_LINK[pv.base].indexOf(c.base) < 0) { r.chain = false; r.bad.push(c.id); }
      }
    });
    r.items = [r.n >= 2 && r.order, r.n >= 2 && r.chain, r.n >= 1 && r.facts, r.vis >= 1, r.credit && r.hasF];
    return r;
  }
  function talkDraw(dt, t) {
    talk.update(dt);
    const tk = S.talk, ev = talkEval();
    talk.boxes[0].label = tk.fmt ? FMT_NAME[tk.fmt] + ' 보드 (시간 순서대로 4~6장)' : '발표 자료 보드: 시간 순서대로 4~6장';
    talk.drawBoxes();
    // 연결 화살표 (연결 화살표 시각 요소)
    const mem = talkMembers();
    if (tk.vis.arrow) {
      for (let i = 0; i + 1 < mem.length; i++) {
        const a = mem[i], b = mem[i + 1], ok = TL_LINK[TL_BY[a.id].base].indexOf(TL_BY[b.id].base) >= 0;
        D.arrow(a.x + a.w / 2, a.y + a.h, b.x + b.w / 2, b.y, { color: ok ? '#16a34a' : '#dc2626', width: 3, head: 11, alpha: 0.85, dash: ok ? null : [6, 5] });
      }
    }
    talk.drawCards();
    // 형식 장식과 시각 요소
    mem.forEach((c, i) => {
      const d = TL_BY[c.id];
      if (tk.vis.color) { ctx.fillStyle = d.col; rr(c.x, c.y + 4, 7, c.h - 8, 3); ctx.fill(); }
      if (tk.vis.num && c.h >= 34) D.label(c.x + c.w - 6, c.y + c.h - 2, d.num, { bg: '#fff', color: '#14532d', border: '#86efac', size: 12.5, align: 'right', pad: 6 });
      if (tk.fmt === 'cn') { D.sphere(c.x + 2, c.y + 2, 11, '#16a34a', { gloss: false, text: String(i + 1), textScale: 1 }); }
      if (tk.fmt === 'st') { D.label(c.x + 4, c.y - 2, 'S#' + (i + 1) + ' 🎬', { bg: '#0f766e', size: 12.5, align: 'left', pad: 6 }); }
      if (tk.fmt === 'tl') { ctx.fillStyle = '#fff'; ctx.strokeStyle = '#16a34a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(c.x + 1, c.y + c.h / 2, 6, 0, TAU); ctx.fill(); ctx.stroke(); }
    });
    if (!tk.fmt) T(TKB.x + TKB.w / 2, TKB.y + TKB.h - 14, '형식을 고르면 보드 모양이 바뀌어요', 13, '#64748b', 'center', 700);
    // 상세 패널
    panel(TKP.x, TKP.y, TKP.w, TKP.h, 16, '#fff');
    const sel = tk.sel ? TL_BY[tk.sel] : null;
    if (!sel) { textBlock(TKP.x + 16, TKP.y + 34, TKP.w - 32, '카드를 눌러 연도 · 과학자 · 실험 · 알아낸 것 · 다음 질문을 읽어 보세요. 틀린 내용의 카드는 보드에 놓지 않아요.', L(15, 13.5), '#64748b', 22, 700); }
    else {
      const rows = PHONE ? [['연도 · 과학자', sel.label + ' · ' + sel.sub], ['실험 · 자료', sel.data], ['알아낸 것', sel.found], ['다음 질문', sel.next]] : [['연도', sel.label], ['과학자', sel.sub], ['실험 · 자료', sel.data], ['알아낸 것', sel.found], ['다음 질문', sel.next]];
      let y = TKP.y + 26;
      rows.forEach((rw) => {
        D.label(TKP.x + 14, y, rw[0], { bg: '#dcfce7', color: '#166534', size: 12.5, align: 'left', pad: 7 });
        const hh = textBlock(TKP.x + 16, y + 26, TKP.w - 32, rw[1], PHONE ? 12.5 : 13.5, '#1f2d44', PHONE ? 16 : 18, 700);
        y += 26 + hh + (PHONE ? 6 : 10);
      });
    }
    // 점검 결과 막대
    if (!PHONE) {
      const ok = ev.items.filter(Boolean).length;
      T(TKB.x + 6, TKW.y0 + 3 * TKW.dy + 8, '점검표 ' + ok + ' / 5 통과', 14, ok === 5 ? '#15803d' : '#64748b', 'left', 800);
    }
  }
  function talkReset() {
    S.talk = { sel: null, fmt: '', vis: {}, credit: '' };
    $('#credit').value = '';
    talk.reset(); updateCtl();
  }

  /* =========================================================
     화면 전환 · 조작 연결
     ========================================================= */
  const PTS = { chg: chgPT, xrd: xrPT, fit: fitPT };
  function setMode(m) {
    if (S.mode !== m) S.fade = 1;
    S.mode = m;
    PT = m === 'talk' ? sorterPT(() => talk) : (PTS[m] || null);
    hideHint(); updateCtl();
  }
  const ctlNodes = $$('#ctrlCard .control');
  const OPT = (sel, arr) => { sel.innerHTML = ''; arr.forEach(([v, t]) => { const o = document.createElement('option'); o.value = v; o.textContent = t; sel.appendChild(o); }); };
  OPT($('#ruleA'), [['', '고르세요'], ['T', 'T'], ['G', 'G'], ['C', 'C']]);
  OPT($('#ruleG'), [['', '고르세요'], ['A', 'A'], ['T', 'T'], ['C', 'C']]);
  OPT($('#credit'), [['', '고르세요'], ['wc', '왓슨과 크릭이 혼자 알아냈다고 적기'], ['fr', '프랭클린의 X선 자료가 모형에 결정적이었음을 적기'], ['no', '연구자 이름은 쓰지 않기']]);
  const spSel = $('#spSel');
  SP.forEach((s, i) => { const b = document.createElement('button'); b.type = 'button'; b.dataset.v = i; b.textContent = s.n; spSel.appendChild(b); });
  const CHK_NAMES = ['① 시간 순서', '② 인과 연결', '③ 사실 정확성', '④ 시각 요소', '⑤ 기여자 인정'];
  function updateCtl() {
    const fr = game ? game.free : false, lvNow = game ? game.level : 0;
    ctlNodes.forEach((n) => { n.hidden = (n.dataset.modes || '').split(' ').indexOf(S.mode) < 0; });
    modeButtons(S.mode, lvNow, fr);
    // 샤가프
    $$('#spSel button').forEach((b) => { b.classList.toggle('on', +b.dataset.v === S.chg.sp); b.classList.toggle('seen', !!S.chg.seen[b.dataset.v]); });
    chipSet($('#chView'), S.chg.view);
    $('#ruleBox').hidden = !S.chg.ruleOn; $('#calcBox').hidden = !S.chg.calcOn;
    $('#ruleA').classList.toggle('ok', $('#ruleA').value === 'T'); $('#ruleG').classList.toggle('ok', $('#ruleG').value === 'C');
    // X선
    $('#xShow').textContent = S.xr.showOn ? '✖ X자 무늬 숨기기' : '✖ X자 무늬 표시';
    $('#recList').innerHTML = '<li class="' + (S.xr.recA ? 'on' : '') + '">' + mark(S.xr.recA) + ' 층선 한 칸 10 mm → 3.4 nm</li><li class="' + (S.xr.recB ? 'on' : '') + '">' + mark(S.xr.recB) + ' 중심~호 100 mm → 0.34 nm</li>';
    $('#bpBox').hidden = !(S.xr.recA && S.xr.recB);
    // 이중 나선
    const hb = S.hx.build && S.hx.vis >= HX_N;
    $('#hxBuild').disabled = S.hx.build; $('#hxDir').disabled = !hb; $('#hxTwist').disabled = !hb;
    $('#hxDir').textContent = S.hx.dir ? '② 방향 표시 끄기' : '② 두 가닥 방향 보기';
    $('#hxTwist').textContent = S.hx.twT > 0.5 ? '③ ↩ 다시 펴기' : '③ 🌀 나선으로 꼬기';
    $('#hxNote').innerHTML = hxNoteText();
    // 발표 자료
    chipSet($('#fmtSel'), S.talk.fmt);
    $$('#visSel button').forEach((b) => b.classList.toggle('on', !!S.talk.vis[b.dataset.v]));
    if (talk) { const ev = talkEval(); $('#chkList').innerHTML = CHK_NAMES.map((n, i) => '<li class="' + (ev.items[i] ? 'on' : '') + '">' + mark(ev.items[i]) + ' ' + n + '</li>').join(''); }
  }
  bindModes(setMode);
  $$('#spSel button').forEach((b) => b.addEventListener('click', () => chgSelect(+b.dataset.v)));
  $$('#chView button').forEach((b) => b.addEventListener('click', () => chgView(+b.dataset.v)));
  ['ruleA', 'ruleG'].forEach((id) => $('#' + id).addEventListener('change', () => { Sound.click(); updateCtl(); }));
  ['inT', 'inG', 'inC'].forEach((id) => $('#' + id).addEventListener('input', () => {
    const was = S.chg.calcOk; const ok = calcCheck();
    ['T', 'G', 'C'].forEach((k) => $('#in' + k).classList.toggle('ok', ok[k]));
    if (S.chg.calcOk && !was) { Sound.success(); parts.burst(VW / 2, VH / 2, { count: 18, speed: 180 }); }
    updateCtl();
  }));
  $('#xShow').addEventListener('click', () => { Sound.click(); S.xr.showOn = !S.xr.showOn; updateCtl(); });
  $('#xReset').addEventListener('click', () => { Sound.click(); xrReset(); });
  $('#inBp').addEventListener('input', () => {
    const v = numOf('inBp'), ok = isFinite(v) && v === 10; $('#inBp').classList.toggle('ok', ok);
    if (ok && !S.xr.bp) { Sound.success(); parts.burst(XC.x, XC.y, { count: 22, speed: 200 }); }
    S.xr.bp = ok; updateCtl();
  });
  $('#fitClear').addEventListener('click', () => { Sound.click(); fitClearAll(); });
  $('#hxBuild').addEventListener('click', () => { if (S.hx.build) return; Sound.click(); S.hx.build = true; S.hx.vis = 0; updateCtl(); });
  $('#hxDir').addEventListener('click', () => { if (!(S.hx.build && S.hx.vis >= HX_N)) return; Sound.click(); S.hx.dir = !S.hx.dir; if (S.hx.dir) S.hx.dirSeen = true; updateCtl(); });
  $('#hxTwist').addEventListener('click', () => { if (!(S.hx.build && S.hx.vis >= HX_N)) return; Sound.click(); S.hx.twT = S.hx.twT > 0.5 ? 0 : 1; updateCtl(); });
  $('#hxReset').addEventListener('click', () => { Sound.click(); hxReset(); });
  $$('#fmtSel button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.talk.fmt = b.dataset.v; updateCtl(); }));
  $$('#visSel button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.talk.vis[b.dataset.v] = !S.talk.vis[b.dataset.v]; updateCtl(); }));
  $('#credit').addEventListener('change', (e) => { S.talk.credit = e.target.value; Sound.click(); updateCtl(); });
  $('#talkClear').addEventListener('click', () => { Sound.click(); talk.reset(); talk.markBad([]); updateCtl(); });

  /* ---------- 미션 도우미 ---------- */
  function chgReset(rule, calc) {
    S.chg.sp = 0; S.chg.seen = { 0: true }; S.chg.view = 0; S.chg.viewSeen = { 0: true }; S.chg.ruleOn = !!rule; S.chg.calcOn = !!calc; S.chg.calcOk = false;
    $('#ruleA').value = ''; $('#ruleG').value = '';
    ['inT', 'inG', 'inC'].forEach((id) => { $('#' + id).value = ''; $('#' + id).classList.remove('ok', 'bad'); });
  }
  const spN = () => chgSeenN();

  const levels = [
    {
      title: '샤가프 자료: 염기 조성의 규칙', short: '샤가프 자료', icon: '📊', phase: '분석',
      intro: '<p class="si-q">❓ 탐구 질문: 겨우 사진 한 장과 숫자 몇 개로 어떻게 DNA의 모양을 알아냈을까?</p><p>🔗 <b>통합과학</b>에서 DNA 이중 나선 모형을 만들고 샤가프 규칙(A와 T, G와 C의 양이 같다)의 결과를 배웠어요. 이번에는 그 규칙이 <b>어떤 자료에서 나왔는지</b>를 거꾸로 확인해요. 앞 차시에서 DNA가 유전 물질이라는 증거를 모았다면, 이제 DNA가 <b>어떤 구조인지</b>를 밝힌 증거 세 가지(샤가프의 염기 조성, 프랭클린의 X선 사진, 왓슨과 크릭의 모형)를 차례로 살펴봐요.</p><p>💡 첫 번째 증거는 <b>샤가프의 염기 조성 자료</b>예요. (수치는 근사 예시 값)</p>',
      features: ['chg'],
      setup() { chgReset(true, false); setMode('chg'); },
      recap: '같은 종의 DNA에서 A≈T, G≈C예요. 이 규칙은 DNA가 두 가닥이고 A–T, G–C가 짝을 이룬다는 단서이고, (A+T)/(G+C)는 종마다 달라요.',
      summary: '<ul><li><b>샤가프(1949~1950)</b>: 여러 생물의 DNA 염기 조성을 분석했어요.</li><li>같은 종에서 <b>A ≈ T, G ≈ C</b> → 퓨린(A+G) ≈ 피리미딘(T+C) ≈ 1 : 1.</li><li>그러나 <b>(A+T)/(G+C)는 종마다 달라요</b>. 예) 사람 1.5, 대장균 1.0, 효모 1.78, 결핵균 0.43 (근사 예시).</li><li>한 종에서 A가 31 %이면 T ≈ 31 %, G + C ≈ 38 %, G ≈ C ≈ 19 %로 예측할 수 있어요.</li><li>A와 T의 양이 같은 까닭: DNA는 두 가닥이고 한 가닥의 A가 다른 가닥의 T와 짝을 이루기 때문이에요.</li></ul>',
      missions: [
        {
          id: 'rule', title: 'A ≈ T, G ≈ C 규칙 찾기',
          goal: '표의 줄을 눌러 <b>4종 생물</b>을 모두 살펴보고, <b>짝 묶기</b> 보기로 비교한 뒤 찾은 규칙을 <b>오른쪽 아래</b>에 골라 넣으세요.',
          hint: '사람에서 A는 31 %, T는 29 %예요. G는 20 %이고 C도 20 %예요. 다른 생물에서도 짝을 이루는 두 값이 비슷한지 확인해 봐요.',
          setup() { chgReset(true, false); setMode('chg'); },
          check: () => spN() === 4 && !!S.chg.viewSeen[1] && RULE_OK(), hold: 0.8,
          status: () => mark(spN() === 4) + ' 생물 종 확인 ' + spN() + ' / 4 &nbsp; ' + mark(!!S.chg.viewSeen[1]) + ' 짝 묶기 보기 &nbsp; ' + mark(RULE_OK()) + ' 규칙 선택',
          explain: '4종 모두에서 <b>A와 T</b>의 양, <b>G와 C</b>의 양이 거의 같아요(차이 0~2 %p). 이것이 <b>샤가프 규칙</b>이에요. 반면 A와 G는 서로 달라요.',
        },
        {
          id: 'calc', title: 'A가 31 %일 때 나머지 염기',
          goal: '어떤 생물(가상)의 DNA에서 <b>A가 31 %</b>예요. 샤가프 규칙으로 <b>T · G · C</b>의 비율(%)을 예측해 입력하세요.',
          hint: 'A와 T의 양은 같아요. 남은 비율(100 − 31 − 31 = 38)을 G와 C가 똑같이 나눠 가져요.',
          setup() { chgReset(false, true); setMode('chg'); },
          check: () => S.chg.calcOk, hold: 0.6,
          status: () => mark(S.chg.calcOk) + ' T = 31, G = 19, C = 19',
          explain: 'A ≈ T이므로 T ≈ <b>31 %</b>예요. A + T = 62 %이므로 G + C = <b>38 %</b>이고, G ≈ C이므로 각각 <b>19 %</b>예요.',
        },
        {
          type: 'quiz', title: '규칙이 알려 주는 것',
          goal: '샤가프 자료에서 모든 종의 A와 T의 양이 거의 같았어요. 이 규칙을 가장 잘 설명하는 것은?',
          setup() { chgReset(false, false); setMode('chg'); S.chg.view = 2; S.chg.viewSeen[2] = true; updateCtl(); },
          choices: ['DNA는 한 가닥이고 A와 T가 우연히 비슷하게 만들어지기 때문이다', 'DNA는 두 가닥이고, 한 가닥의 A가 다른 가닥의 T와 짝을 이루기 때문이다', '모든 생물의 DNA에서 (A+T)/(G+C)가 똑같기 때문이다', 'A와 G처럼 같은 종류의 염기끼리 짝을 이루기 때문이다'],
          answer: 1,
          feedback: ['4종 모두에서 같은 규칙이 나왔어요. 우연이 아니라 짝짓기 규칙이 있다는 뜻이에요.', '', '표를 보세요. (A+T)/(G+C)는 사람 1.50, 대장균 1.00, 효모 1.78, 결핵균 0.43으로 종마다 달라요.', 'A와 G의 양은 서로 달라요(사람 31 %와 20 %). 양이 같은 것은 A와 T, G와 C예요.'],
          explain: 'A의 양과 T의 양이 같은 것은 두 가닥에서 <b>A가 T와, G가 C와 짝</b>을 이루기 때문이에요. 종마다 달라지는 것은 <b>(A+T)/(G+C)</b>, 즉 염기가 얼마나 AT 쪽으로 치우쳤는가예요.',
        },
      ],
    },
    {
      title: 'X선 회절 사진 읽기', short: 'X선 회절', icon: '📷', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 샤가프 자료로 염기가 A–T, G–C로 짝을 이룬다는 단서를 얻었어요. 하지만 그 자료만으로는 DNA의 <b>모양</b>을 알 수 없어요.</div><p>두 번째 증거는 <b>프랭클린과 윌킨스의 X선 회절 사진</b>(1951~1952, 사진 51)이에요. DNA 섬유에 X선을 쬐면 규칙적인 반복 구조가 <b>무늬</b>로 나타나요. 가상 사진에서 <b>층선 사이 간격</b>을 눈금자로 재어 DNA 안의 <b>반복 거리</b>를 구해요.</p><p>💡 교육용 가상 축척: 간격 10 mm ↔ 3.4 nm, 간격 100 mm ↔ 0.34 nm. 간격이 좁을수록 반복 거리는 길어요(역비례).</p>',
      features: ['xrd'],
      setup() { xrFull(); setMode('xrd'); },
      recap: 'X자 무늬는 나선 구조를 뜻해요. 층선 간격 10 mm는 한 바퀴 3.4 nm, 100 mm는 염기쌍 사이 0.34 nm이고, 3.4 / 0.34 = 10이므로 한 바퀴에 염기쌍이 10개예요.',
      summary: '<ul><li><b>프랭클린 · 윌킨스(1951~1952)</b>: DNA 섬유의 X선 회절 사진(사진 51)에서 <b>X자 무늬</b>가 나타났어요 → <b>나선 구조</b>.</li><li>층선 간격이 <b>좁을수록 반복 거리가 길어요</b>(역비례). 가상 축척: 10 mm ↔ 3.4 nm(나선 한 바퀴), 100 mm ↔ 0.34 nm(염기쌍 사이 간격).</li><li>한 바퀴 3.4 nm / 염기쌍 사이 0.34 nm = <b>염기쌍 10개</b>. 나선의 지름은 약 <b>2 nm</b>.</li><li>사진 한 장은 모양과 길이를 알려 주지만, 염기를 어떻게 짝짓는지는 샤가프 자료가 필요해요.</li></ul>',
      missions: [
        {
          id: 'measure', title: '눈금자로 반복 거리 재기',
          goal: '눈금자 두 개로 <b>① 이웃한 층선 사이</b>와 <b>② 중심에서 짙은 호까지</b>를 재고, <b>한 바퀴의 염기쌍 수</b>를 입력하세요.',
          hint: '손잡이를 끌어 놓으면 가까운 줄에 붙어요. ① 이웃한 두 층선(10 mm 간격) ② 가운데 줄(0)과 위쪽 짙은 호(100 mm). 두 값이 모이면 입력칸이 나타나요.',
          setup() { xrFull(); setMode('xrd'); },
          check: () => S.xr.recA && S.xr.recB && S.xr.bp, hold: 0.8,
          status: () => mark(S.xr.recA) + ' 측정 A 10 mm &nbsp; ' + mark(S.xr.recB) + ' 측정 B 100 mm &nbsp; ' + mark(S.xr.bp) + ' 염기쌍 10개',
          explain: '층선 한 칸 <b>10 mm</b> → 반복 거리 34 / 10 = <b>3.4 nm</b>(한 바퀴), 중심~호 <b>100 mm</b> → 34 / 100 = <b>0.34 nm</b>(염기쌍 사이). 3.4 / 0.34 = <b>10</b>이므로 한 바퀴에 염기쌍이 10개 있어요.',
        },
        {
          type: 'quiz', title: 'X자 무늬가 알려 주는 것',
          goal: 'X선 회절 사진에서 <b>X자 모양</b>의 무늬가 나타났어요. 이 무늬로 알 수 있는 것은?',
          setup() { setMode('xrd'); S.xr.showOn = true; updateCtl(); },
          choices: ['DNA가 나선 구조라는 것', 'A와 T, G와 C가 짝을 이룬다는 것', 'DNA가 유전 물질이라는 것', '사진 한 장으로 DNA의 구조를 모두 알 수 있다는 것'],
          answer: 0,
          feedback: ['', '염기의 짝짓기 규칙은 샤가프의 자료에서 나왔어요. X선 사진은 모양과 반복 길이를 알려 줘요.', 'DNA가 유전 물질이라는 증거는 에이버리와 허시·체이스의 실험에서 나왔어요.', '사진은 나선 모양과 길이를 알려 주지만, 염기를 어떻게 짝짓는지는 다른 자료(샤가프)가 있어야 알 수 있어요.'],
          explain: 'X자 무늬는 <b>나선 구조</b>를 나타내는 특징적인 모양이에요. 층선 간격에서 <b>반복 거리</b>(3.4 nm, 0.34 nm)를 구할 수 있지만, 염기의 짝짓기는 <b>샤가프 자료</b>와 함께 해석해야 해요. 한 가지 자료만으로는 모형을 만들 수 없어요.',
        },
      ],
    },
    {
      title: '이중 나선 모형 만들기', short: '이중 나선', icon: '🌀', phase: '모형',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 샤가프 자료(A–T, G–C)와 X선 사진(나선, 한 바퀴 3.4 nm, 염기쌍 10개, 지름 약 2 nm)을 얻었어요.</div><p>왓슨과 크릭(1953)은 두 자료를 <b>모두 만족하는 모형</b>을 만들었어요. 먼저 <b>폭이 2 nm로 일정한 틈</b>에 염기 블록이 어떻게 들어맞는지 확인해요. 그다음 규칙으로 사다리를 만들고 <b>두 가닥의 방향</b>을 살펴본 뒤 <b>나선으로 꼬아요</b>.</p><p>💡 퓨린(A, G)은 고리가 2개, 피리미딘(T, C)은 고리가 1개라서 크기가 달라요.</p>',
      features: ['fit', 'helix'],
      setup() { fitReset(); setMode('fit'); },
      recap: '틈 폭이 일정하려면 퓨린 하나와 피리미딘 하나가 짝을 이뤄야 하고, 샤가프 규칙으로 A–T(수소 결합 2개), G–C(3개)가 정해져요. 당–인산 뼈대는 바깥, 염기쌍은 안쪽이고 두 가닥은 반대 방향인 이중 나선이에요.',
      summary: '<ul><li><b>왓슨 · 크릭(1953)</b>: 샤가프 자료와 X선 자료를 모두 설명하는 이중 나선 모형.</li><li>염기쌍의 폭이 일정(약 2 nm)하려면 <b>퓨린(A, G; 고리 2개) + 피리미딘(T, C; 고리 1개)</b>이어야 해요. 퓨린 + 퓨린은 너무 넓고, 피리미딘 + 피리미딘은 너무 좁아요.</li><li>샤가프 규칙으로 <b>A–T(수소 결합 2개)</b>, <b>G–C(수소 결합 3개)</b>.</li><li><b>당–인산 뼈대는 바깥</b>, 염기쌍은 안쪽에 있어요. 두 가닥은 서로 <b>반대 방향(역평행)</b>이에요.</li><li>한 바퀴 3.4 nm = 염기쌍 10개(사이 간격 0.34 nm), 지름 약 2 nm.</li></ul>',
      missions: [
        {
          id: 'pairs', title: '맞는 염기쌍 찾기',
          goal: '두 줄의 틈에 블록을 놓아 보세요. <b>너무 넓은 짝</b>, <b>너무 좁은 짝</b>을 확인하고, 딱 맞는 <b>A–T</b>와 <b>G–C</b>를 모두 찾으세요.',
          hint: '고리 2개인 퓨린(A, G) 두 개는 너무 넓고, 고리 1개인 피리미딘(T, C) 두 개는 너무 좁아요. 퓨린 하나와 피리미딘 하나 중에서, 샤가프 규칙에 맞는 짝은 A–T와 G–C예요.',
          setup() { fitReset(); setMode('fit'); },
          check: () => fitFound(), hold: 0.8,
          status: () => mark(S.fit.tried.wide) + ' 너무 넓은 짝 &nbsp; ' + mark(S.fit.tried.narrow) + ' 너무 좁은 짝 &nbsp; ' + mark(S.fit.found.AT) + ' A–T &nbsp; ' + mark(S.fit.found.GC) + ' G–C',
          explain: '퓨린 + 퓨린은 2.4 nm로 <b>너무 넓고</b>, 피리미딘 + 피리미딘은 1.6 nm로 <b>너무 좁아요</b>. 퓨린 + 피리미딘만 2.0 nm에 맞아요. 그중 A–C와 G–T는 샤가프 규칙에 어긋나고, <b>A–T</b>(수소 결합 2개)와 <b>G–C</b>(수소 결합 3개)가 짝이에요.',
        },
        {
          id: 'helix', title: '이중 나선 모형 완성',
          goal: '<b>① 사다리 만들기</b> → <b>② 두 가닥 방향 보기</b> → <b>③ 나선으로 꼬기</b>를 차례로 해서 이중 나선을 완성하세요.',
          hint: '오른쪽 단추를 위에서부터 차례로 눌러요. ②에서는 두 가닥의 화살표가 서로 반대 방향인지 확인해요.',
          setup() { hxReset(); setMode('helix'); },
          check: () => S.hx.build && S.hx.vis >= HX_N && S.hx.dirSeen && S.hx.twDone, hold: 0.8,
          status: () => mark(S.hx.build && S.hx.vis >= HX_N) + ' 사다리 &nbsp; ' + mark(S.hx.dirSeen) + ' 방향 확인 &nbsp; ' + mark(S.hx.twDone) + ' 나선 꼬기',
          explain: '염기쌍(A–T, G–C)은 <b>안쪽</b>, 당–인산 뼈대는 <b>바깥쪽</b>에 있고 두 가닥은 <b>반대 방향</b>이에요. 꼬면 지름 <b>2 nm</b>, 한 바퀴 <b>3.4 nm</b>(염기쌍 10개), 염기쌍 사이 <b>0.34 nm</b>인 X선 자료와 맞는 이중 나선이 돼요.',
        },
        {
          type: 'quiz', title: 'DNA 지름이 일정한 까닭',
          goal: 'DNA의 지름은 어디에서나 약 2 nm로 일정해요. 그 까닭으로 가장 알맞은 것은?',
          setup() { setMode('fit'); },
          choices: ['퓨린과 퓨린이 짝을 이루기 때문이다', '당–인산 뼈대가 안쪽에서 염기를 붙잡고 있기 때문이다', '염기쌍이 항상 퓨린 하나와 피리미딘 하나로 이루어져 폭이 같기 때문이다', '모든 염기쌍의 수소 결합이 3개로 같기 때문이다'],
          answer: 2,
          feedback: ['퓨린 + 퓨린은 너무 넓어서 틈에 맞지 않아요.', '뼈대는 바깥쪽에 있고 염기가 안쪽에서 짝을 이뤄요.', '', 'A–T는 수소 결합이 2개, G–C는 3개로 달라요. 폭이 같은 것은 퓨린 + 피리미딘 조합이기 때문이에요.'],
          explain: '염기쌍은 <b>퓨린 하나 + 피리미딘 하나</b>(A–T 또는 G–C)이므로 어느 염기쌍이든 폭이 같아요. 그래서 DNA 지름이 일정하고, 염기 서열이 달라도 같은 구조를 이뤄요.',
        },
      ],
    },
    {
      title: '발표 자료 만들기', short: '발표 자료', icon: '🎞️', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 샤가프 · 프랭클린 · 왓슨과 크릭의 증거로 이중 나선 모형을 완성했어요. 앞 차시의 유전 물질 규명 실험과 합치면 하나의 이야기가 돼요.</div><p>이제 <b>발표 자료</b>를 만들어요. 카드 중 <b>4~6장</b>을 골라 시간 순서대로 보드에 놓고, 앞 카드의 <b>다음 질문</b>이 뒤 카드로 이어지게 구성해요. 형식은 <b>연표 인포그래픽 · 카드뉴스 · 영상 콘티</b> 중에서 골라요.</p><p>💡 카드 중에는 <b>내용이 틀린 것</b>이 섞여 있어요. 눌러서 내용을 읽고 가려내요.</p>',
      features: ['talk'],
      setup() { talkReset(); setMode('talk'); },
      recap: '과학의 증거는 질문과 결과가 이어지며 쌓여요: 그리피스 → 에이버리 → (허시·체이스) → 샤가프 → 프랭클린 → 왓슨 · 크릭. 샤가프는 염기 짝짓기 규칙을, 프랭클린은 나선 모양과 치수를 알려 줬어요.',
      summary: '<ul><li><b>연표(연도 대략)</b>: 1928 그리피스 · 1944 에이버리 · 1949~50 샤가프 · 1951~52 프랭클린과 윌킨스 · 1952 허시·체이스 · 1953 왓슨·크릭 · 1958 메셀슨·스탈(다음 차시).</li><li>발표 자료 한 칸: <b>연도 – 과학자 – 실험 · 자료 – 알아낸 것 – 다음 질문</b>.</li><li>점검표: 시간 순서, 앞 결과가 다음 질문으로 이어지는 인과 연결, 사실 정확성, 시각 요소, 기여자 인정 한 줄.</li><li>프랭클린의 자료가 모형 구축에 결정적이었으나 당시 충분히 알려지지 않았다는 논의가 있어요. 연구 기여를 정확히 밝히는 것도 과학자의 윤리예요.</li><li>샤가프 자료 → <b>염기 짝짓기 규칙</b>, 프랭클린 자료 → <b>나선 모양과 치수</b>.</li></ul>',
      missions: [
        {
          id: 'cards', title: '카드 고르고 배치하기', manual: true,
          goal: '카드 <b>4~6장</b>을 골라 <b>시간 순서</b>대로 보드에 놓고, <b>형식</b>을 고른 뒤 <b>✔ 확인하기</b>를 누르세요.',
          hint: '카드를 눌러 내용을 읽어요. 같은 연도의 카드 두 장 중 내용이 틀린 것은 빼요. 예) 1928 → 1944 → 1949~50 → 1951~52 → 1953처럼 앞 카드의 다음 질문이 뒤 카드로 이어지게 해요.',
          setup() { talkReset(); setMode('talk'); },
          check() {
            const e = talkEval(); talk.markBad(e.bad);
            if (e.n < 4) return '카드를 4장 이상 보드에 놓아요. (지금 ' + e.n + '장)';
            if (e.n > 6) return '카드는 6장까지만 써요. 가장 중요한 카드를 골라 보세요.';
            if (!e.facts) return '내용이 틀린 카드가 있어요(빨간 카드). 눌러서 읽고 올바른 카드로 바꿔요.';
            if (!e.order) return '연도가 앞선 카드가 먼저 오도록 시간 순서대로 놓아요. (빨간 카드)';
            if (!e.chain) return '앞 카드의 \'다음 질문\'이 빨간 카드의 연구로 이어지지 않아요. 사이를 이어 줄 카드를 넣거나 바꿔 보세요.';
            if (!e.fmt) return '형식(연표 · 카드뉴스 · 영상 콘티)을 하나 골라요.';
            return true;
          },
          explain: '좋은 발표 자료는 <b>시간 순서</b>가 맞고, 앞 연구의 <b>결과가 다음 질문</b>으로 이어지며, 내용이 <b>정확</b>해요. 예) 그리피스(형질 전환) → 에이버리(물질은 DNA) → 샤가프(염기 규칙) → 프랭클린(X선 사진) → 왓슨 · 크릭(모형).',
        },
        {
          id: 'check', title: '점검표 통과하기', manual: true,
          goal: '<b>시각 요소</b>를 하나 이상 고르고 <b>기여자 인정 한 줄</b>을 골라, 점검표 <b>5개</b>를 모두 통과하세요.',
          hint: '시각 요소는 연결 화살표 · 핵심 숫자 · 색 구분 중에서 골라요. 기여자 인정 문장은 프랭클린의 X선 자료가 모형에 결정적이었음을 밝히는 것이에요. 보드에 프랭클린 · 윌킨스 카드도 있어야 해요.',
          setup() { setMode('talk'); },
          check() {
            const e = talkEval();
            if (!(e.n >= 4 && e.n <= 6 && e.order && e.chain && e.facts && e.fmt)) return '먼저 앞 미션의 보드(4~6장, 시간 순서, 연결, 사실, 형식)를 완성해 주세요.';
            if (!e.vis) return '시각 요소를 하나 이상 골라요.';
            if (!S.talk.credit) return '기여자 인정 한 줄을 골라요.';
            if (S.talk.credit !== 'fr') return '이 문장은 연구에 기여한 사람을 정확히 인정하지 않아요. 프랭클린의 자료가 어떤 역할을 했는지 밝히는 문장을 골라요.';
            if (!e.hasF) return '프랭클린의 자료를 인정하는 문장을 쓰려면 \'프랭클린 · 윌킨스\' 카드가 보드에 있어야 해요.';
            return true;
          },
          explain: '시각 요소(화살표 · 핵심 숫자 · 색)는 <b>인과와 핵심 증거</b>를 한눈에 보여 줘요. 그리고 프랭클린의 X선 자료는 모형 구축에 <b>결정적</b>이었지만 당시 충분히 알려지지 않았다는 논의가 있으므로, 발표에서 <b>기여를 정확히 밝히는 것</b>이 중요해요.',
        },
        {
          type: 'quiz', title: '두 자료의 역할',
          goal: '샤가프의 염기 조성 자료와 프랭클린의 X선 회절 자료는 왓슨과 크릭의 모형에서 각각 무엇의 근거가 되었나요?',
          setup() { setMode('talk'); },
          choices: ['샤가프: 나선 모양과 3.4 nm / 프랭클린: 염기의 짝짓기 규칙', '두 자료 모두 DNA가 유전 물질이라는 증거', '샤가프: DNA의 복제 방식 / 프랭클린: 단백질의 구조', '샤가프: 염기의 짝짓기 규칙(A–T, G–C) / 프랭클린: 나선 모양과 치수'],
          answer: 3,
          feedback: ['서로 바뀌었어요. 염기 조성은 샤가프, X선 사진은 프랭클린의 자료예요.', '유전 물질이 DNA라는 증거는 에이버리와 허시·체이스의 실험이에요.', '복제 방식은 이 두 자료와 관계가 없고(메셀슨·스탈 실험은 다음 차시), X선 자료는 DNA 섬유의 사진이에요.', ''],
          explain: '<b>샤가프</b>의 자료는 <b>염기의 짝짓기 규칙(A–T, G–C)</b>을, <b>프랭클린</b>의 X선 회절 자료는 <b>나선 모양과 치수</b>(한 바퀴 3.4 nm, 지름 약 2 nm)를 알려 줬어요. 왓슨과 크릭은 두 가지를 모두 만족하는 모형을 제안했어요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hg-dna-structure', mount: '#game', badge: 'DNA 구조 탐정', homeHref: '../../index.html#hg',
    featureLabels: { chg: '📊 샤가프 자료', xrd: '📷 X선 회절 사진', fit: '🧩 염기쌍 맞추기', helix: '🌀 이중 나선 모형', talk: '🎞️ 발표 자료 보드' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 읽음 칸 ---------- */
  function readouts() {
    const m = S.mode;
    if (m === 'chg') { const s = SP[S.chg.sp]; setReads(['생물 종', s.n, 'A · T / G · C', s.A + ' · ' + s.T + ' / ' + s.G + ' · ' + s.C + ' (%)', '(A+T)/(G+C)', ratioStr(s)]); }
    else if (m === 'xrd') {
      const st = xrState(), live = st.rest && st.gap > 0;
      setReads(['눈금 간격', live ? st.gap + ' mm' : '—', '반복 거리', live ? fmt1(34 / st.gap) + ' nm' : '—', '측정 기록', (+S.xr.recA + +S.xr.recB) + ' / 2']);
    }
    else if (m === 'fit') setReads(['틈 폭', '2 nm', '찾은 짝', (S.fit.found.AT ? 'A–T ' : '') + (S.fit.found.GC ? 'G–C' : '') || '—', '짝 맞춘 줄', (+(rowEval(0) === 'AT' || rowEval(0) === 'GC') + +(rowEval(1) === 'AT' || rowEval(1) === 'GC')) + ' / 2']);
    else if (m === 'helix') setReads(['염기쌍', Math.floor(S.hx.vis) + ' / ' + HX_N + '개', '꼬임', Math.round(S.hx.tw * 100) + ' %', '두 가닥 방향', S.hx.dirSeen ? '반대 방향' : '—']);
    else { const ev = talkEval(); setReads(['보드 카드', ev.n + '장', '점검표', ev.items.filter(Boolean).length + ' / 5', '형식', S.talk.fmt ? FMT_NAME[S.talk.fmt] : '—']); }
  }

  /* ---------- 시작 ---------- */
  talkInit();
  hxReset();
  setMode('chg');
  let lastFree = false, lastLv = -1;
  SciSim.loop((dt, t) => {
    clock = t; S.t = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (game && game.level !== lastLv) { lastLv = game.level; updateCtl(); }
    view.apply(); ctx.clearRect(0, 0, VW, VH);
    bgFill('#eef4f2', '#e3ece8');
    switch (S.mode) {
      case 'chg': chgDraw(dt, t); break;
      case 'xrd': xrDraw(dt, t); break;
      case 'fit': fitDraw(dt, t); break;
      case 'helix': {
        hxDraw(dt, t);
        const h = S.hx;
        if (h.build && h.vis >= HX_N && !h.built) { h.built = true; updateCtl(); Sound.success(); }
        if (!h.twDone && h.twT === 1 && h.tw >= 0.99 && h.vis >= HX_N) { h.twDone = true; Sound.success(); parts.burst(HC.cx, HC.y0 + 230, { count: 26, speed: 220 }); updateCtl(); }
        break;
      }
      case 'talk': talkDraw(dt, t); break;
    }
    FX.update(dt); FX.draw();
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(241,246,243,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, PHONE, get game() { return game; }, levels, setMode, updateCtl, SP, chgSelect, chgView, RULE_OK, calcCheck, XT, xrState, xrKind, xrY, XC, XS, XB, xrHandle,
    FG, fitPlace, rowEval, fitFound, fitTarget, HX_N, HC, TLC, TL_LINK, get talk() { return talk; }, talkEval, talkMembers, talkReset, hxReset, tblRect,
  };
})();
