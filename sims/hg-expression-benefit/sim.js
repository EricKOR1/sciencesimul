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
     고등학교 생물의 유전 · Ⅱ. 유전자의 발현 - 발현·발생 연구와 복지 (단원 60, 7차시)
     성취기준 [12유전02-05] 생물의 유전자 발현 조절 및 발생에 대한 연구가 인류 복지에 기여한 사례를 조사하여 협력적으로 소통할 수 있다.
     ① 관찰: 사례 지도  ② 분석: 조사 계획  ③ 적용: AI 활용  ④ 정리: 공유하기
     (모든 사례는 교육용 요약이며 의료 조언이 아니에요)
     ========================================================= */
  const S = { mode: 'cases', fade: 0, t: 0 };
  let game = null;
  const ease = SciSim.ease;
  const rr = (x, y, w, h, r) => D.roundRect(x, y, w, h, r);
  const col = (c, a) => C.rgba(c, a);

  const FIELDS = [
    { id: 'reg', n: '유전자 발현·조절', col: '#2563eb' },
    { id: 'dev', n: '발생', col: '#ea580c' },
  ];
  const PRIN = [
    { id: 'central', n: '중심원리 (전사 · 번역)', s: '중심원리' },
    { id: 'code', n: '유전 부호와 코돈표', s: '유전 부호' },
    { id: 'lac', n: '젖당 오페론', s: '젖당 오페론' },
    { id: 'euk', n: '진핵생물의 발현 조절', s: '진핵 조절' },
    { id: 'diff', n: '세포 분화와 유전자 발현', s: '세포 분화' },
    { id: 'embryo', n: '초기 발생과 혹스 유전자', s: '초기 발생' },
  ];
  const PCOL = ['#0ea5e9', '#8b5cf6', '#16a34a', '#d97706', '#ec4899', '#ef4444'];
  const PQ = ['문제', '알아낸 원리', '개발된 기술', '인류 복지 기여', '한계와 질문'];
  const CASES = [
    {
      id: 'ins', icon: '💉', n: '재조합 인슐린 대량 생산', t: '재조합 인슐린', field: ['reg'], prin: ['lac', 'code'], main: 'lac',
      prob: '사람 인슐린을 안정적으로 많이 얻기 어려웠어요.',
      know: '유전 부호의 보편성, 인트론이 없는 cDNA, 젖당 오페론의 프로모터와 유도자(IPTG)로 발현 켜기',
      lim: '대장균은 인트론을 제거하지 못해 cDNA가 필요하고, 만든 단백질을 정제해야 해요.',
      plan: ['당뇨병 치료에 쓸 사람 인슐린을 안정적으로 많이 얻기 어려웠다.', '유전 부호는 거의 모든 생물이 같아서 대장균도 사람 유전자의 암호를 읽는다.', '인트론이 없는 인슐린 cDNA를 대장균에 넣고, 젖당 오페론의 프로모터와 유도자(IPTG)로 필요할 때 발현을 켠다.', '사람 인슐린을 대량으로 만들어 공급할 수 있게 되었다.', '대장균은 인트론을 제거하지 못해 cDNA가 필요하고, 만든 단백질을 정제해야 한다.'],
      perm: [3, 0, 4, 2, 1],
    },
    {
      id: 'cancer', icon: '🔬', n: '유전자 발현 검사로 암 분류', t: '암 유형 분류', field: ['reg'], prin: ['diff', 'euk'], main: 'diff',
      prob: '겉보기에 비슷한 종양도 유형이 달라 치료를 고르기 어려웠어요.',
      know: '세포마다 발현하는 유전자가 달라요. 암은 유전자 발현 조절의 이상과 관련이 있어요.',
      lim: '발현 패턴만으로 모든 것을 알 수는 없고, 해석에는 전문가의 판단이 필요해요.',
      plan: ['겉보기에 비슷한 종양도 유형이 달라 치료를 고르기 어려웠다.', '세포마다 발현하는 유전자가 다르고, 암은 유전자 발현 조절의 이상과 관련이 있다.', '종양 조직의 RNA를 분석해 유전자 발현 패턴으로 유형을 나눈다.', '유형에 맞는 치료를 고르는 데 활용된다. (교육용 요약이며 의료 조언이 아니다.)', '발현 패턴만으로 모든 것을 알 수는 없고, 해석에는 전문가의 판단이 필요하다.'],
      perm: [2, 4, 1, 0, 3],
    },
    {
      id: 'folate', icon: '🥬', n: '엽산과 신경관 결손 예방', t: '엽산과 신경관', field: ['dev'], prin: ['embryo'], main: 'embryo',
      prob: '태아의 신경관이 제대로 닫히지 않는 신경관 결손이 생길 수 있어요.',
      know: '초기 발생 연구와 역학 조사로 엽산 섭취와 신경관 결손의 관계를 알아냈어요.',
      lim: '모든 신경관 결손을 막지는 못해요. 원인은 여러 가지예요.',
      plan: ['태아의 신경관이 제대로 닫히지 않는 신경관 결손이 생길 수 있었다.', '초기 발생 연구와 역학 조사로 엽산 섭취와 신경관 결손의 관계를 알아냈다.', '임신 초기 엽산 섭취를 권장하는 보건 지침을 마련했다.', '임신 초기 엽산 섭취가 신경관 결손의 위험을 낮춘다.', '모든 신경관 결손을 막지는 못하며 원인은 여러 가지다.'],
      perm: [1, 3, 0, 4, 2],
    },
    {
      id: 'drug', icon: '💊', n: '약물 안전성 시험', t: '약물 안전성', field: ['dev'], prin: ['embryo', 'diff'], main: 'embryo',
      prob: '탈리도마이드 사건 : 발생 시기에 노출된 약물이 사지 기형을 일으켰어요.',
      know: '발생 시기의 노출이 배아 발생에 영향을 줄 수 있어요. 제브라피시 배아 같은 모델 생물로 독성을 시험해요.',
      lim: '모델 생물의 결과가 사람과 항상 같지는 않아요.',
      plan: ['발생 시기에 노출된 약물(탈리도마이드)이 사지 기형을 일으킨 사건이 있었다.', '발생 시기에 약물에 노출되면 배아의 발생에 영향을 줄 수 있다.', '임신 중 약물 시험에서 배아 발생 영향을 검사하고, 제브라피시 배아 같은 모델 생물로 독성을 시험한다.', '약이 쓰이기 전에 배아에 미치는 영향을 미리 확인할 수 있게 되었다.', '모델 생물의 결과가 사람과 항상 같지는 않다.'],
      perm: [4, 2, 0, 3, 1],
    },
    {
      id: 'ips', icon: '🧪', n: '유도만능줄기세포', t: '유도만능줄기세포', field: ['reg', 'dev'], prin: ['diff', 'euk'], main: 'diff',
      prob: '환자 자신의 세포로 여러 종류의 세포를 얻을 방법이 필요했어요.',
      know: '전사 인자가 세포의 운명을 바꿔요. 분화한 세포도 모든 유전 정보를 가지고 있어요.',
      lim: '만드는 효율이 낮고 안전성을 충분히 확인해야 해요.',
      plan: ['환자 자신의 세포로 여러 종류의 세포를 얻을 방법이 필요했다.', '전사 인자가 유전자 발현을 바꾸면 세포의 운명이 바뀌고, 분화한 세포도 모든 유전 정보를 가진다.', '체세포에 전사 인자 4종(Oct4, Sox2, Klf4, c-Myc)을 넣어 분화한 세포를 초기 상태로 되돌린다.', '재생 의학과 질병 연구에 쓸 수 있는 세포를 얻을 수 있다.', '만드는 효율이 낮고 안전성을 충분히 확인해야 한다.'],
      perm: [0, 2, 3, 1, 4],
    },
    {
      id: 'mrna', icon: '🛡️', n: 'mRNA 백신', t: 'mRNA 백신', field: ['reg'], prin: ['central', 'code'], main: 'central',
      prob: '병원체의 단백질 정보를 몸의 세포에 안전하게 전달할 방법이 필요했어요.',
      know: '전사와 번역을 거쳐 mRNA의 정보가 단백질이 돼요.',
      lim: 'mRNA는 쉽게 분해돼서 안정화하고 전달하는 기술이 필요해요.',
      plan: ['병원체의 단백질 정보를 몸의 세포에 안전하게 전달할 방법이 필요했다.', '전사와 번역을 거쳐 mRNA의 정보가 단백질이 된다.', 'mRNA를 안정화해 세포 안으로 넣어 세포가 직접 단백질을 만들게 한다.', '병원체의 단백질을 몸의 세포가 만들게 해 면역을 유도하는 백신을 개발할 수 있게 되었다.', 'mRNA는 쉽게 분해되어 안정화와 전달 기술이 필요하다.'],
      perm: [3, 1, 4, 0, 2],
    },
  ];
  const caseOf = (id) => CASES.find((c) => c.id === id);
  const prinNo = (id) => PRIN.findIndex((p) => p.id === id) + 1;

  /* ---------- 상태 ---------- */
  S.cs = { sel: 0, read: [1, 0, 0, 0, 0, 0], as: CASES.map(() => ({ f: null, p: null })), bad: CASES.map(() => false), lift: CASES.map(() => 0), flip: 0 };
  const csReadN = () => S.cs.read.reduce((a, b) => a + b, 0);
  const csAssigned = () => S.cs.as.filter((a) => a.f && a.p).length;
  function csReset() {
    S.cs = { sel: 0, read: [1, 0, 0, 0, 0, 0], as: CASES.map(() => ({ f: null, p: null })), bad: CASES.map(() => false), lift: CASES.map(() => 0), flip: 0 };
    updateCtl();
  }
  function csPick(i) { S.cs.sel = i; S.cs.read[i] = 1; S.cs.flip = 0; Sound.click(); updateCtl(); }
  function csSetField(f) { const a = S.cs.as[S.cs.sel]; a.f = a.f === f ? null : f; S.cs.bad[S.cs.sel] = false; Sound.click(); updateCtl(); }
  function csSetPrin(p) { const a = S.cs.as[S.cs.sel]; a.p = a.p === p ? null : p; S.cs.bad[S.cs.sel] = false; Sound.click(); updateCtl(); }
  function csWrong() {
    const w = [];
    CASES.forEach((c, i) => { const a = S.cs.as[i]; if (a.f && a.p && !(c.field.indexOf(a.f) >= 0 && c.prin.indexOf(a.p) >= 0)) w.push(i); });
    return w;
  }

  /* ---------- 화면 배치 ---------- */
  const CSG = PHONE
    ? { tiles: { x0: 14, y0: 46, w: 142, h: 78, dx: 150, dy: 84, per: 3 }, top: { x: 8, y: 8, w: 464, h: 214 }, det: { x: 8, y: 230, w: 464, h: 402 } }
    : { tiles: { x0: 28, y0: 50, w: 114, h: 96, dx: 124, dy: 0, per: 6 }, top: { x: 14, y: 14, w: 772, h: 148 }, det: { x: 14, y: 170, w: 772, h: 376 } };
  const csTile = (i) => ({ x: CSG.tiles.x0 + (i % CSG.tiles.per) * CSG.tiles.dx, y: CSG.tiles.y0 + Math.floor(i / CSG.tiles.per) * CSG.tiles.dy, w: CSG.tiles.w, h: CSG.tiles.h });
  function pill(x, y, text, bg, size, align) {
    return D.label(x, y, text, { bg, size: size || L(13, 12), align: align || 'left' });
  }
  function infoCard(x, y, w, h, label, color, text, size) {
    D.roundRect(x, y, w, h, 12); ctx.fillStyle = col(color, 0.08); ctx.fill(); ctx.strokeStyle = col(color, 0.55); ctx.lineWidth = 1.8; ctx.stroke();
    D.label(x + 10, y + 16, label, { bg: color, size: L(13, 12), align: 'left' });
    textBlock(x + 12, y + L(44, 38), w - 24, text, size || L(16, 13.5), '#26324a', L(23, 19), 700);
  }
  function csDraw(dt, t) {
    const c = S.cs, T0 = CSG.top, D0 = CSG.det;
    c.flip = approach(c.flip, 1, dt, 6);
    panel(T0.x, T0.y, T0.w, T0.h, 16, '#fff');
    TF(T0.x + 16, T0.y + 28, '연구 사례 카드 6장 : 눌러서 읽어요  (읽은 카드 ' + csReadN() + ' / 6)', T0.w - 32, L(16, 14), 11, '#14532d', 'left', 800);
    CASES.forEach((cs, i) => {
      const b = csTile(i), on = c.sel === i, a = c.as[i];
      c.lift[i] = approach(c.lift[i], on ? 1 : 0, dt, 12);
      ctx.save(); ctx.translate(b.x + b.w / 2, b.y + b.h / 2); const sc = 1 + c.lift[i] * 0.05; ctx.scale(sc, sc);
      D.shadow(() => { rr(-b.w / 2, -b.h / 2, b.w, b.h, 14); ctx.fillStyle = c.bad[i] ? '#fdeceb' : on ? '#f0fdf4' : '#f8fafc'; ctx.fill(); }, { blur: 4 + c.lift[i] * 8, y: 2 + c.lift[i] * 3 });
      ctx.strokeStyle = c.bad[i] ? '#e2464b' : on ? '#16a34a' : c.read[i] ? '#94a3b8' : '#cbd5e1'; ctx.lineWidth = on || c.bad[i] ? 3 : 2; if (!c.read[i]) ctx.setLineDash([5, 4]); rr(-b.w / 2, -b.h / 2, b.w, b.h, 14); ctx.stroke(); ctx.setLineDash([]);
      E(cs.icon, 0, -b.h / 2 + L(30, 24), L(30, 26));
      TF(0, b.h / 2 - L(16, 12), cs.t, b.w - 10, L(14, 12.5), 10, '#26324a', 'center', 800);
      ctx.restore();
      // 연결 표시: 분야 점 + 원리 번호
      if (a.f) { const fc = FIELDS.find((q) => q.id === a.f).col; D.sphere(b.x + 12, b.y + 12, 6, fc, { gloss: false }); }
      if (a.p) { D.sphere(b.x + b.w - 14, b.y + 14, 9, PCOL[prinNo(a.p) - 1], { gloss: false, text: String(prinNo(a.p)), textScale: 1.0 }); }
    });
    // 읽음 표시와 연결 표
    if (!PHONE) T(T0.x + T0.w - 16, T0.y + 28, '점 = 분야 · 숫자 = 바탕 원리', 13, '#64748b', 'right', 700);
    // 상세
    const cs = CASES[c.sel], a = c.as[c.sel];
    panel(D0.x, D0.y, D0.w, D0.h, 16, '#fff');
    E(cs.icon, D0.x + 38, D0.y + 36, 32);
    TF(D0.x + 66, D0.y + 42, cs.n, D0.w - (PHONE ? 90 : 360), L(19, 16), 12, '#14532d', 'left', 800);
    if (!PHONE) {
      let px = D0.x + D0.w - 16;
      if (a.p) { const w = pill(px, D0.y + 34, PRIN[prinNo(a.p) - 1].s, PCOL[prinNo(a.p) - 1], 13, 'right'); px = w.x - 8; }
      if (a.f) { const f = FIELDS.find((q) => q.id === a.f); pill(px, D0.y + 34, f.n, f.col, 13, 'right'); }
    }
    const k = ease.outCubic(clamp(c.flip, 0, 1));
    ctx.save(); ctx.globalAlpha = k; ctx.translate(0, (1 - k) * 10);
    if (!PHONE) {
      const w = (D0.w - 32 - 24) / 3, y = D0.y + 68, h = 232;
      infoCard(D0.x + 16, y, w, h, '해결된 문제', '#2563eb', cs.prob);
      infoCard(D0.x + 16 + w + 12, y, w, h, '쓰인 지식', '#16a34a', cs.know);
      infoCard(D0.x + 16 + (w + 12) * 2, y, w, h, '한계', '#dc2626', cs.lim);
    } else {
      const y0 = D0.y + 58, w = D0.w - 24, hs = [76, 100, 80];
      const labs = [['해결된 문제', '#2563eb', cs.prob], ['쓰인 지식', '#16a34a', cs.know], ['한계', '#dc2626', cs.lim]];
      let y = y0; labs.forEach((q, i) => { infoCard(D0.x + 12, y, w, hs[i], q[0], q[1], q[2], 13.5); y += hs[i] + 8; });
    }
    ctx.restore();
    const by = D0.y + D0.h - (PHONE ? 62 : 70);
    ctx.fillStyle = '#f1f5f9'; rr(D0.x + 12, by, D0.w - 24, PHONE ? 52 : 58, 12); ctx.fill();
    const asText = (a.f ? FIELDS.find((q) => q.id === a.f).n : '분야 ?') + '  ·  ' + (a.p ? PRIN[prinNo(a.p) - 1].n : '바탕 원리 ?');
    TF(D0.x + 26, by + L(24, 21), '내가 고른 연결 : ' + asText, D0.w - 52, L(15, 13.5), 11, a.f && a.p ? '#15803d' : '#64748b', 'left', 800);
    T(D0.x + 26, by + L(46, 41), '모든 사례는 교육용 요약이며 의료 조언이 아니에요.', L(13, 12), '#94a3b8', 'left', 700);
  }
  const csPT = {
    down(p) { for (let i = 0; i < 6; i++) if (inRect(p.x, p.y, csTile(i))) { csPick(i); return true; } return false; },
    hover(p) { for (let i = 0; i < 6; i++) if (inRect(p.x, p.y, csTile(i))) return 'pointer'; return 'default'; },
  };

  /* =========================================================
     ② 조사 계획: 5칸 구성 + 출처 신뢰도 순서
     ========================================================= */
  const PLC = ['#2563eb', '#16a34a', '#7c3aed', '#d97706', '#dc2626'];
  S.pl = { c: 0, pick: [-1, -1, -1, -1, -1], bad: [false, false, false, false, false], shake: [0, 0, 0, 0, 0], okAll: false };
  function plReset(c) { S.pl = { c: c == null ? S.pl.c : c, pick: [-1, -1, -1, -1, -1], bad: [false, false, false, false, false], shake: [0, 0, 0, 0, 0], okAll: false }; updateCtl(); }
  function plCheck() {
    const p = S.pl; let wrongN = 0, emptyN = 0;
    for (let i = 0; i < 5; i++) {
      if (p.pick[i] < 0) { emptyN++; continue; }
      const bad = p.pick[i] !== i; if (bad && !p.bad[i]) p.shake[i] = 1; p.bad[i] = bad; if (bad) wrongN++;
    }
    return { wrongN, emptyN };
  }
  const PLG = PHONE
    ? { panel: { x: 8, y: 8, w: 464, h: 624 }, y0: 76, rh: 108, lw: 200, tx: 16, tw: 432, textBelow: true }
    : { panel: { x: 14, y: 14, w: 772, h: 532 }, y0: 78, rh: 90, lw: 150, tx: 176, tw: 586, textBelow: false };
  function plDraw(dt, t) {
    const p = S.pl, P = PLG.panel, cs = CASES[p.c];
    for (let i = 0; i < 5; i++) p.shake[i] = Math.max(0, p.shake[i] - dt * 3);
    panel(P.x, P.y, P.w, P.h, 16, '#fff');
    E(cs.icon, P.x + 34, P.y + 34, 30);
    TF(P.x + 60, P.y + 40, '조사 계획 : ' + cs.n, P.w - 76, L(19, 15.5), 11, '#14532d', 'left', 800);
    const pickedN = p.pick.filter((v) => v >= 0).length;
    TF(P.x + 18, P.y + 64, p.okAll ? '5칸을 모두 알맞게 채웠어요!' : '5칸 중 ' + pickedN + '칸을 골랐어요. 오른쪽(또는 아래) 목록에서 문장을 골라요.', P.w - 36, L(14, 13), 10.5, p.okAll ? '#15803d' : '#64748b', 'left', 700);
    for (let i = 0; i < 5; i++) {
      const y = PLG.y0 + 4 + i * PLG.rh, ok = p.okAll, bad = p.bad[i], sh = p.shake[i] > 0 && !RM ? Math.sin(clock * 60) * 3 * p.shake[i] : 0;
      const lx = P.x + 14, lw = PLG.lw, ty = PLG.textBelow ? y + 38 : y, th = PLG.textBelow ? PLG.rh - 46 : PLG.rh - 12, tx = P.x + (PLG.textBelow ? 14 : PLG.tx - 14 + 14), tw = PLG.textBelow ? P.w - 28 : P.w - PLG.tx - 14;
      D.roundRect(lx, y + 6, lw, PLG.textBelow ? 30 : PLG.rh - 12, 14); ctx.fillStyle = PLC[i]; ctx.fill();
      TF(lx + lw / 2, y + 6 + (PLG.textBelow ? 21 : (PLG.rh - 12) / 2 + 5), (i + 1) + ' · ' + PQ[i], lw - 10, L(16, 14), 11, '#fff', 'center', 800);
      const bx = tx + sh;
      D.roundRect(bx, ty + (PLG.textBelow ? 0 : 6), tw, th, 12); ctx.fillStyle = bad ? '#fdeceb' : ok ? '#ecfdf3' : p.pick[i] >= 0 ? '#f8fafc' : '#fff'; ctx.fill();
      ctx.strokeStyle = bad ? '#e2464b' : ok ? '#22c55e' : p.pick[i] >= 0 ? col(PLC[i], 0.7) : '#cbd5e1'; ctx.lineWidth = bad || ok ? 3 : 2; if (p.pick[i] < 0) ctx.setLineDash([6, 5]); ctx.stroke(); ctx.setLineDash([]);
      if (p.pick[i] >= 0) textBlock(bx + 14, ty + (PLG.textBelow ? 24 : 36), tw - 28 - (ok ? 26 : 0), cs.plan[p.pick[i]], L(15, 13), '#26324a', L(21, 18), 700);
      else T(bx + 14, ty + (PLG.textBelow ? 28 : 6 + th / 2 + 5), '문장을 골라 넣어요', L(14.5, 13), '#94a3b8', 'left', 700);
      if (ok) D.check(bx + tw - 20, ty + (PLG.textBelow ? 20 : 6 + th / 2), 11, 1);
    }
  }

  /* ---------- 출처 신뢰도 ---------- */
  const SRC = [
    { n: '학술 논문', d: '전문가가 검토한 연구 결과예요. 방법과 근거를 확인할 수 있어요.', col: '#16a34a' },
    { n: '공공기관 보고서', d: '공공기관이 근거를 모아 공개한 자료예요.', col: '#22c55e' },
    { n: '언론 기사', d: '기자가 정리한 글이에요. 원문 출처를 확인해야 해요.', col: '#f59e0b' },
    { n: '개인 블로그', d: '글쓴이 개인의 의견이 많아서 근거 확인이 꼭 필요해요.', col: '#ef4444' },
    { n: '홍보 자료', d: '알리는 것이 목적이라 장점 위주일 수 있어요.', col: '#dc2626' },
  ];
  S.sc = { order: [4, 2, 0, 3, 1], y: [0, 0, 0, 0, 0], ok: false, bad: [false, false, false, false, false] };
  const SCG = PHONE
    ? { panel: { x: 8, y: 8, w: 464, h: 624 }, y0: 92, rh: 100, rx: 16, rw: 432 }
    : { panel: { x: 14, y: 14, w: 772, h: 532 }, y0: 96, rh: 84, rx: 30, rw: 712 };
  function scReset() { S.sc = { order: [4, 2, 0, 3, 1], y: [0, 0, 0, 0, 0], ok: false, bad: [false, false, false, false, false], init: false }; updateCtl(); }
  function scMove(pos, dir) {
    const o = S.sc.order, q = pos + dir; if (q < 0 || q > 4) return;
    const tmp = o[pos]; o[pos] = o[q]; o[q] = tmp; S.sc.ok = false; S.sc.bad = [false, false, false, false, false]; Sound.click(); updateCtl();
  }
  function scTier(pos) { return pos < 2 ? 0 : pos === 2 ? 1 : 2; }
  function scEval() {
    const o = S.sc.order, bad = [false, false, false, false, false];
    o.forEach((id, pos) => { const want = id <= 1 ? 0 : id === 2 ? 1 : 2; if (scTier(pos) !== want) bad[id] = true; });
    return bad;
  }
  function scDraw(dt, t) {
    const s = S.sc, P = SCG.panel;
    panel(P.x, P.y, P.w, P.h, 16, '#fff');
    TF(P.x + 18, P.y + 32, '출처 5가지를 믿을 만한 순서로 놓아요', P.w - 36, L(19, 16), 12, '#14532d', 'left', 800);
    T(P.x + 18, P.y + 60, '▲ 가장 믿을 만함', L(14, 12.5), '#16a34a', 'left', 800); T(P.x + P.w - 18, P.y + 60, '근거 확인이 더 필요함 ▼', L(14, 12.5), '#dc2626', 'right', 800);
    s.order.forEach((id, pos) => {
      const ty = SCG.y0 + pos * SCG.rh;
      if (!s.init) s.y[id] = ty; s.y[id] = approach(s.y[id], ty, dt, 10);
    });
    s.init = true;
    // 단계 띠 (확인 후)
    if (s.ok) [[0, 2, '높음', '#16a34a'], [2, 3, '보통', '#f59e0b'], [3, 5, '낮음', '#dc2626']].forEach((q) => { const y1 = SCG.y0 + q[0] * SCG.rh - 4, y2 = SCG.y0 + q[1] * SCG.rh - 8; ctx.fillStyle = col(q[3], 0.1); rr(P.x + 8, y1, P.w - 16, y2 - y1 + 4, 12); ctx.fill(); T(P.x + P.w - 22, y1 + 20, q[2], 14, q[3], 'right', 800); });
    s.order.forEach((id, pos) => {
      const y = s.y[id], c = SRC[id], bad = s.bad[id];
      D.shadow(() => { rr(P.x + SCG.rx, y, SCG.rw, SCG.rh - 12, 14); ctx.fillStyle = bad ? '#fdeceb' : '#fff'; ctx.fill(); }, { blur: 5, y: 2 });
      ctx.strokeStyle = bad ? '#e2464b' : col(c.col, 0.8); ctx.lineWidth = 2.4; rr(P.x + SCG.rx, y, SCG.rw, SCG.rh - 12, 14); ctx.stroke();
      D.sphere(P.x + SCG.rx + 30, y + (SCG.rh - 12) / 2, 17, c.col, { gloss: false, text: String(pos + 1), textScale: 1.1 });
      T(P.x + SCG.rx + 62, y + (PHONE ? 30 : 32), c.n, L(18, 16), '#26324a', 'left', 800);
      textBlock(P.x + SCG.rx + 62, y + (PHONE ? 54 : 56), SCG.rw - 80, c.d, L(13.5, 12.5), '#475569', L(18, 17), 700);
    });
    TF(P.x + P.w / 2, P.y + P.h - 16, s.ok ? '같은 단계 안에서는 순서가 조금 달라도 괜찮아요.' : '순서를 바꾼 뒤 ✔ 확인하기를 눌러요.', P.w - 30, L(14, 13), 10.5, s.ok ? '#15803d' : '#94a3b8', 'center', 800);
  }

  /* =========================================================
     ③ AI 활용: 쓰임 연결, AI 답 검증(오류 2개)
     ========================================================= */
  const AIU = [
    { id: 'str', use: '구조 예측', icon: '🧩', label: '아미노산 서열로 입체 구조를 추정해요', sub: '약물 표적 탐색에 도움', col: '#2563eb' },
    { id: 'pat', use: '패턴 분류', icon: '📊', label: '발현 패턴으로 암 · 질병 유형을 나눠요', sub: '수천 개 유전자의 데이터', col: '#16a34a' },
    { id: 'seq', use: '서열 예측', icon: '🧬', label: '프로모터 · 인핸서 위치를 짐작해요', sub: '조절 서열 예측', col: '#7c3aed' },
    { id: 'srch', use: '검색 · 요약', icon: '🔎', label: '논문을 찾아 요약해요 (오류 가능)', sub: '원문 확인이 필요해요', col: '#ea580c' },
  ];
  const AIG = PHONE
    ? { rows: AIU.map((u, i) => ({ id: u.id, x: 8, y: 62 + i * 88, w: 464, h: 80 })), slot: { dx: 112, dy: 8, w: 344, h: 64 }, tray: { x0: 8, y0: 428, dx: 236, dy: 80, per: 2 }, cw: 228, ch: 72, kh: 64 }
    : { rows: AIU.map((u, i) => ({ id: u.id, x: 20, y: 78 + i * 80, w: 760, h: 72 })), slot: { dx: 176, dy: 8, w: 576, h: 56 }, tray: { x0: 20, y0: 416, dx: 386, dy: 66, per: 2 }, cw: 374, ch: 60, kh: 56 };
  let aiS = null;
  function aiInit() {
    const G = AIG;
    aiS = selectable({
      cards: AIU.map((u) => ({ id: u.id, label: u.label, sub: u.sub, col: u.col })),
      boxes: G.rows.map((r) => Object.assign({}, r, { single: true, hdr: 0, slot: { x: r.x + G.slot.dx, y: r.y + G.slot.dy, w: G.slot.w, h: G.slot.h } })),
      tray: (i) => ({ x: G.tray.x0 + (i % G.tray.per) * G.tray.dx, y: G.tray.y0 + Math.floor(i / G.tray.per) * G.tray.dy }),
      cw: G.cw, ch: G.ch, kh: G.kh, onChange: () => updateCtl(),
    });
    aiS.layout(true);
  }
  function aiState() {
    const bad = [], miss = [];
    AIU.forEach((u) => { const c = aiS.cards.find((q) => q.id === u.id); if (!c.zone) miss.push(u.id); else if (c.zone !== u.id) bad.push(u.id); });
    return { bad, miss };
  }
  function aiDraw(dt, t) {
    const G = AIG;
    TF(VW / 2, PHONE ? 30 : 42, '생명과학에서 AI는 이런 일에 쓰여요', VW - 24, L(20, 16), 12, '#14532d', 'center', 800);
    TF(VW / 2, PHONE ? 50 : 62, '사례 카드를 알맞은 쓰임 칸에 놓아요', VW - 24, L(15, 13), 11, '#64748b', 'center', 700);
    aiS.update(dt);
    G.rows.forEach((r, i) => {
      const u = AIU[i], hot = aiS.hot && aiS.hot.id === r.id;
      D.roundRect(r.x, r.y, r.w, r.h, 14); ctx.fillStyle = hot ? col(u.col, 0.22) : col(u.col, 0.1); ctx.fill();
      ctx.strokeStyle = col(u.col, hot ? 1 : 0.6); ctx.lineWidth = hot ? 3 : 2; ctx.setLineDash([7, 5]); ctx.stroke(); ctx.setLineDash([]);
      E(u.icon, r.x + 28, r.y + r.h / 2 - 8, L(26, 22));
      TF(r.x + L(52, 42), r.y + r.h / 2 + 6, u.use, L(112, 62), L(18, 14.5), 11, u.col, 'left', 800);
      const sl = { x: r.x + G.slot.dx, y: r.y + G.slot.dy, w: G.slot.w, h: G.slot.h };
      D.roundRect(sl.x, sl.y, sl.w, sl.h, 10); ctx.strokeStyle = 'rgba(148,163,184,.55)'; ctx.lineWidth = 1.5; ctx.stroke();
    });
    aiS.drawCards();
  }

  /* ---------- AI 답 검증 ---------- */
  const CHAT = [
    { t: '인슐린 유전자를 대장균에 넣을 때 인트론이 제거된 cDNA를 쓰는 까닭은 대장균이 인트론을 제거하지 못하기 때문이다.', ok: true },
    { t: '대장균은 유전 부호가 사람과 달라서 사람 유전자를 넣어도 다른 아미노산이 이어진다.', ok: false, ans: 1, opts: ['대장균은 사람과 유전 부호가 달라서 번역할 때 변환기가 필요하다.', '유전 부호는 거의 모든 생물이 같아서 사람 유전자를 넣어도 같은 아미노산이 이어진다.', '대장균에는 리보솜이 없어서 사람 유전자를 번역하지 못한다.'] },
    { t: '같은 유전체를 가진 체세포가 서로 다른 세포가 되는 것은 발현하는 유전자가 달라서이다.', ok: true },
    { t: '젖당이 없어도 젖당 오페론의 억제자는 작동 부위에서 항상 떨어져 있다.', ok: false, ans: 0, opts: ['젖당이 없으면 억제자가 작동 부위에 결합해 RNA 중합 효소의 진행을 막는다.', '젖당이 없으면 억제자가 프로모터를 없애 전사를 막는다.', '젖당이 없으면 억제자가 효소 단백질을 직접 분해한다.'] },
  ];
  S.ch = { flag: [0, 0, 0, 0], fix: [-1, -1, -1, -1], lift: [0, 0, 0, 0] };
  function chReset() { S.ch = { flag: [0, 0, 0, 0], fix: [-1, -1, -1, -1], lift: [0, 0, 0, 0] }; $$('#chFix select').forEach((s) => { s.value = '-1'; s.classList.remove('ok', 'bad'); }); updateCtl(); }
  function chToggle(i) { S.ch.flag[i] = S.ch.flag[i] ? 0 : 1; if (!S.ch.flag[i]) S.ch.fix[i] = -1; Sound.click(); updateCtl(); }
  const chFoundN = () => [1, 3].filter((i) => S.ch.flag[i]).length;
  const chFixedN = () => [1, 3].filter((i) => S.ch.flag[i] && S.ch.fix[i] === CHAT[i].ans).length;
  const chFalseFlag = () => [0, 2].filter((i) => S.ch.flag[i]).length;
  const CHG = PHONE
    ? { x0: 8, y0: 70, w: 464, h: 138, dy: 144, per: 1 }
    : { x0: 20, y0: 76, w: 372, h: 206, dx: 388, dy: 220, per: 2 };
  const chBox = (i) => PHONE ? { x: CHG.x0, y: CHG.y0 + i * CHG.dy, w: CHG.w, h: CHG.h } : { x: CHG.x0 + (i % 2) * CHG.dx, y: CHG.y0 + Math.floor(i / 2) * CHG.dy, w: CHG.w, h: CHG.h };
  function chDraw(dt, t) {
    const c = S.ch;
    TF(VW / 2, PHONE ? 30 : 42, 'AI 도우미의 답 4개 : 틀린 답 2개를 찾아요', VW - 24, L(20, 16), 12, '#14532d', 'center', 800);
    CHAT.forEach((q, i) => {
      const b = chBox(i), fl = c.flag[i], isBad = !q.ok;
      c.lift[i] = approach(c.lift[i], fl ? 1 : 0, dt, 10);
      const fixed = fl && isBad && c.fix[i] === q.ans;
      D.shadow(() => { rr(b.x, b.y, b.w, b.h, 16); ctx.fillStyle = fl ? (isBad ? '#fff1f2' : '#fff7ed') : '#fff'; ctx.fill(); }, { blur: 6 + c.lift[i] * 6, y: 2 });
      ctx.strokeStyle = fl ? (isBad ? '#e11d48' : '#f59e0b') : '#cbd5e1'; ctx.lineWidth = fl ? 3.2 : 2; rr(b.x, b.y, b.w, b.h, 16); ctx.stroke();
      E('🤖', b.x + 28, b.y + 30, 24);
      T(b.x + 52, b.y + 36, 'AI 도우미의 답 ' + '①②③④'[i], L(16, 14), '#26324a', 'left', 800);
      textBlock(b.x + 16, b.y + L(66, 62), b.w - 32, q.t, L(15, 13.5), '#26324a', L(22, 19), 700);
      const sy = b.y + b.h - 22;
      if (!fl) T(b.x + 16, sy, '눌러서 틀린 답으로 표시', L(13.5, 12.5), '#94a3b8', 'left', 800);
      else if (isBad) T(b.x + 16, sy, fixed ? '✅ 오류를 찾고 바르게 고쳤어요' : '🚩 오류로 표시했어요 → 오른쪽(아래)에서 고쳐요', L(14, 12.5), fixed ? '#15803d' : '#be123c', 'left', 800);
      else T(b.x + 16, sy, '⚠️ 이 문장은 앞 차시 내용과 맞아요. 다시 확인해요', L(14, 12.5), '#b45309', 'left', 800);
      if (fl && isBad && fixed) D.check(b.x + b.w - 26, b.y + 26, 12, 1);
    });
  }
  const chPT = {
    down(p) { for (let i = 0; i < 4; i++) if (inRect(p.x, p.y, chBox(i))) { chToggle(i); return true; } return false; },
    hover(p) { for (let i = 0; i < 4; i++) if (inRect(p.x, p.y, chBox(i))) return 'pointer'; return 'default'; },
  };

  /* =========================================================
     ④ 공유하기: 가상 모둠 보드 (조사자 · 검증자 · 발표자)
     ========================================================= */
  const SUM = {
    ins: ['사람 인슐린을 많이 얻기 어려웠어요', '유전 부호 보편성 · cDNA · 젖당 오페론 프로모터', '인트론을 못 떼어 cDNA가 필요해요'],
    cancer: ['비슷한 종양의 유형을 나누기 어려웠어요', '세포마다 발현하는 유전자가 달라요', '전문가의 해석이 필요해요'],
    folate: ['신경관 결손이 생길 수 있어요', '초기 발생 연구와 역학 조사', '모든 결손을 막지는 못해요'],
    drug: ['탈리도마이드 사건 (사지 기형)', '발생 시기의 노출이 배아에 영향', '모델 생물과 사람이 다를 수 있어요'],
    ips: ['환자 자신의 세포가 필요했어요', '전사 인자가 세포의 운명을 바꿔요', '효율이 낮고 안전성 확인이 필요해요'],
    mrna: ['병원체 단백질 정보를 전달해야 했어요', '전사와 번역으로 mRNA가 단백질이 돼요', '쉽게 분해돼 안정화 기술이 필요해요'],
  };
  const SUML = ['해결된 문제', '쓰인 원리', '한계'];
  const ROLES = [
    { id: 'inv', icon: '🔍', n: '조사자', miss: 2, col: '#2563eb' },
    { id: 'ver', icon: '✅', n: '검증자', miss: 1, col: '#16a34a' },
    { id: 'pre', icon: '🎤', n: '발표자', miss: 0, col: '#ea580c' },
  ];
  const QS = ['어떤 문제를 해결했나요?', '어떤 원리가 쓰였나요?', '한계는 무엇인가요?'];   // 요약의 빠진 칸(0 문제 · 1 원리 · 2 한계)과 번호가 같아요
  S.bd = { cs: [-1, -1, -1], q: [-1, -1, -1], merged: false, bad: [false, false, false], mp: 0, shake: [0, 0, 0] };
  function bdReset() { S.bd = { cs: [-1, -1, -1], q: [-1, -1, -1], merged: false, bad: [false, false, false], mp: 0, shake: [0, 0, 0] }; $$('#bdSels select').forEach((s) => { s.value = '-1'; s.classList.remove('ok', 'bad'); }); updateCtl(); }
  function bdState() {
    const b = S.bd, miss = [], dup = new Set(), seen = {};
    b.cs.forEach((v, i) => { if (v < 0) miss.push(i); else { if (seen[v] != null) { dup.add(i); dup.add(seen[v]); } seen[v] = i; } });
    const noQ = b.q.map((v, i) => (v < 0 ? i : -1)).filter((i) => i >= 0);
    const wrongQ = b.q.map((v, i) => (v >= 0 && v !== ROLES[i].miss ? i : -1)).filter((i) => i >= 0);
    return { miss, dup: Array.from(dup), noQ, wrongQ };
  }
  const BDG = PHONE
    ? { card: (i) => ({ x: 8, y: 40 + i * 156, w: 464, h: 150 }), map: { x: 8, y: 508, w: 464, h: 124 } }
    : { card: (i) => ({ x: 14 + i * 262, y: 50, w: 248, h: 304 }), map: { x: 14, y: 362, w: 772, h: 184 } };
  function bdDraw(dt, t) {
    const b = S.bd;
    for (let i = 0; i < 3; i++) b.shake[i] = Math.max(0, b.shake[i] - dt * 3);
    b.mp = approach(b.mp, b.merged ? 1 : 0, dt, 0.9);
    TF(VW / 2, PHONE ? 28 : 34, '우리 모둠 보드 : 서로 다른 사례를 올리고 질문을 달아요', VW - 24, L(19, 15.5), 11, '#14532d', 'center', 800);
    ROLES.forEach((r, i) => {
      const c = BDG.card(i), ci = b.cs[i], cs = ci >= 0 ? CASES[ci] : null, bad = b.bad[i], sh = b.shake[i] > 0 && !RM ? Math.sin(clock * 60) * 3 * b.shake[i] : 0;
      ctx.save(); ctx.translate(sh, 0);
      D.shadow(() => { rr(c.x, c.y, c.w, c.h, 16); ctx.fillStyle = bad ? '#fff1f2' : '#fff'; ctx.fill(); }, { blur: 6, y: 2 });
      ctx.strokeStyle = bad ? '#e11d48' : col(r.col, 0.8); ctx.lineWidth = bad ? 3 : 2.4; rr(c.x, c.y, c.w, c.h, 16); ctx.stroke();
      D.roundRect(c.x, c.y, c.w, L(40, 34), 16); ctx.fillStyle = r.col; ctx.fill(); ctx.fillRect(c.x, c.y + L(24, 20), c.w, L(16, 14));
      E(r.icon, c.x + 24, c.y + L(21, 18), L(22, 19)); T(c.x + 46, c.y + L(27, 23), r.n, L(17, 15), '#fff', 'left', 800);
      if (cs) { E(cs.icon, c.x + 20, c.y + L(62, 53), L(22, 19)); TF(c.x + 40, c.y + L(68, 59), cs.n, c.w - L(52, 262), L(14.5, 13), 9.5, '#26324a', 'left', 800); }
      else T(c.x + 16, c.y + L(68, 59), '사례를 골라요 (오른쪽 / 아래)', L(14, 12.5), '#94a3b8', 'left', 700);
      const rowH = L(56, 25), y0 = c.y + L(80, 76);
      for (let k = 0; k < 3; k++) {
        const y = y0 + k * rowH;
        D.label(c.x + 12, y + L(12, 9), SUML[k], { bg: ['#2563eb', '#16a34a', '#dc2626'][k], size: L(12, 10.5), align: 'left', pad: 6 });
        const tx = c.x + (PHONE ? 100 : 12), ty = y + L(34, 17), tw = c.w - (PHONE ? 112 : 24);
        if (!cs) continue;
        if (k === r.miss) { D.roundRect(tx, ty - L(14, 11), tw, L(26, 18), 6); ctx.fillStyle = '#e2e8f0'; ctx.fill(); T(tx + 8, ty + L(5, 3), '??? (빠진 내용)', L(13, 11.5), '#64748b', 'left', 800); }
        else if (PHONE) TF(tx, ty + 4, SUM[cs.id][k], tw, 12.5, 9.5, '#26324a', 'left', 700);
        else textBlock(tx, ty, tw, SUM[cs.id][k], 13, '#26324a', 17, 700);
      }
      // 질문 스티커
      const qi = b.q[i], sy = PHONE ? c.y + 40 : c.y + c.h - 46, sw = PHONE ? 214 : c.w - 24, sx = PHONE ? c.x + c.w - sw - 10 : c.x + 12;
      D.roundRect(sx, sy, sw, L(34, 26), 8); ctx.fillStyle = qi >= 0 ? '#fef9c3' : '#f8fafc'; ctx.fill(); ctx.strokeStyle = qi >= 0 ? '#eab308' : '#cbd5e1'; ctx.lineWidth = 1.8; if (qi < 0) ctx.setLineDash([5, 4]); ctx.stroke(); ctx.setLineDash([]);
      TF(sx + 10, sy + L(22, 18), qi >= 0 ? '❓ ' + QS[qi] : '질문 카드를 골라 붙여요', sw - 20, L(13.5, 11.5), 9.5, qi >= 0 ? '#713f12' : '#94a3b8', 'left', 800);
      ctx.restore();
    });
    // 지도
    const M = BDG.map;
    panel(M.x, M.y, M.w, M.h, 16, '#fff');
    TF(M.x + 16, M.y + 26, b.merged ? '합쳐진 지도 : 연구 사례와 바탕 원리' : '세 카드를 완성하면 사례들이 지도로 합쳐져요', M.w - 32, L(16, 13.5), 11, b.merged ? '#15803d' : '#64748b', 'left', 800);
    const n = 6, cw = (M.w - 24) / n, cy1 = M.y + L(62, 52), py = M.y + M.h - L(30, 26);
    CASES.forEach((cs, i) => {
      const x = M.x + 12 + cw * (i + 0.5), mine = b.cs.indexOf(i) >= 0, al = b.merged ? (mine ? 1 : 0.55) : 0.3;
      ctx.save(); ctx.globalAlpha = al;
      E(cs.icon, x, cy1, L(28, 22));
      if (!PHONE) TF(x, cy1 + 30, cs.t, cw - 6, 12.5, 8.5, '#26324a', 'center', 800);
      ctx.restore();
      if (b.merged && mine) D.ring(x, cy1 - 2, L(24, 19), t, { color: '#16a34a', width: 2 });
      const p = prinNo(cs.main) - 1, px = M.x + 12 + cw * (p + 0.5), a = clamp(b.mp * 1.6 - i * 0.12, 0, 1);
      if (a > 0.01) {
        const f = FIELDS.find((q) => q.id === cs.field[0]).col, sx = x, sy = cy1 + L(42, 18), ex = px + (i % 2 ? 6 : -6), ey = py - L(14, 12);
        ctx.save(); ctx.globalAlpha = al * 0.9 * a; ctx.strokeStyle = f; ctx.lineWidth = mine ? 3 : 2; ctx.beginPath(); ctx.moveTo(sx, sy);
        const N = 20; for (let k = 1; k <= N * a; k++) { const u = k / N, e = u * u * (3 - 2 * u); ctx.lineTo(sx + (ex - sx) * e, sy + (ey - sy) * u); }
        ctx.stroke(); ctx.restore();
      }
    });
    PRIN.forEach((p, k) => { const x = M.x + 12 + cw * (k + 0.5); D.roundRect(x - cw / 2 + 3, py - 12, cw - 6, L(26, 22), 11); ctx.fillStyle = PCOL[k]; ctx.fill(); TF(x, py + L(5, 4), (k + 1) + ' ' + p.s, cw - 12, L(12.5, 10.5), 8, '#fff', 'center', 800); });
    if (b.merged) { FIELDS.forEach((f, i) => { D.sphere(M.x + M.w - L(150, 150) + i * L(78, 78), M.y + 22, 6, f.col, { gloss: false }); T(M.x + M.w - L(150, 150) + i * L(78, 78) + 10, M.y + 27, i ? '발생' : '발현·조절', L(12.5, 11), '#475569', 'left', 800); }); }
  }

  /* =========================================================
     화면 전환 · 조작 연결
     ========================================================= */
  let aiPT = null;
  function setMode(m) {
    if (S.mode !== m) S.fade = 1;
    S.mode = m;
    PT = m === 'cases' ? csPT : m === 'ai' ? aiPT : m === 'chat' ? chPT : null;
    hideHint(); updateCtl();
  }
  const ctlNodes = $$('#ctrlCard .control');
  /* --- 동적 컨트롤 만들기 --- */
  FIELDS.forEach((f) => { const b = document.createElement('button'); b.type = 'button'; b.dataset.v = f.id; b.textContent = f.n; b.addEventListener('click', () => csSetField(f.id)); $('#csField').appendChild(b); });
  PRIN.forEach((p, k) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'mc'; b.dataset.v = p.id; b.textContent = (k + 1) + ' ' + p.s; b.addEventListener('click', () => csSetPrin(p.id)); $('#csPrin').appendChild(b); });
  CASES.forEach((c, i) => { const b = document.createElement('button'); b.type = 'button'; b.dataset.v = i; b.innerHTML = c.icon + '<br><span style="font-size:12px">' + c.t + '</span>'; b.addEventListener('click', () => { Sound.click(); plReset(i); plFill(); }); $('#plCase').appendChild(b); });
  const plSel = [];
  PQ.forEach((q, i) => {
    const w = document.createElement('div'); w.innerHTML = '<div class="lab"><label for="plS' + i + '">' + (i + 1) + ' · ' + q + '</label></div>';
    const s = document.createElement('select'); s.className = 'sel-in'; s.id = 'plS' + i; s.addEventListener('change', () => { S.pl.pick[i] = +s.value; S.pl.bad[i] = false; S.pl.okAll = false; Sound.click(); updateCtl(); });
    w.appendChild(s); $('#plSels').appendChild(w); plSel.push(s);
  });
  function plFill() {
    const cs = CASES[S.pl.c];
    plSel.forEach((s, i) => {
      s.innerHTML = '<option value="-1">문장을 고르세요</option>' + cs.perm.map((idx) => '<option value="' + idx + '">' + cs.plan[idx] + '</option>').join('');
      s.value = String(S.pl.pick[i]); s.classList.remove('ok', 'bad');
    });
  }
  const chSel = [];
  CHAT.forEach((q, i) => {
    const w = document.createElement('div'); w.hidden = true; w.dataset.i = i;
    w.innerHTML = '<div class="lab"><label for="chS' + i + '">답 ' + '①②③④'[i] + '을 바르게 고치면?</label></div>';
    const s = document.createElement('select'); s.className = 'sel-in'; s.id = 'chS' + i;
    s.innerHTML = '<option value="-1">고친 문장을 고르세요</option>' + (q.opts || []).map((o, k) => '<option value="' + k + '">' + o + '</option>').join('');
    s.addEventListener('change', () => { S.ch.fix[i] = +s.value; Sound.click(); updateCtl(); });
    w.appendChild(s); $('#chFix').appendChild(w); chSel.push(w);
  });
  const bdSel = [];
  ROLES.forEach((r, i) => {
    const w = document.createElement('div');
    w.innerHTML = '<div class="lab">' + r.icon + ' ' + r.n + '</div>';
    const s1 = document.createElement('select'); s1.className = 'sel-in'; s1.id = 'bdC' + i;
    s1.innerHTML = '<option value="-1">올릴 사례를 고르세요</option>' + CASES.map((c, k) => '<option value="' + k + '">' + c.icon + ' ' + c.t + '</option>').join('');
    s1.addEventListener('change', () => { S.bd.cs[i] = +s1.value; S.bd.bad[i] = false; Sound.click(); updateCtl(); });
    const s2 = document.createElement('select'); s2.className = 'sel-in'; s2.id = 'bdQ' + i; s2.style.marginTop = '4px';
    s2.innerHTML = '<option value="-1">질문 카드를 고르세요</option>' + QS.map((q, k) => '<option value="' + k + '">' + q + '</option>').join('');
    s2.addEventListener('change', () => { S.bd.q[i] = +s2.value; S.bd.bad[i] = false; Sound.click(); updateCtl(); });
    w.appendChild(s1); w.appendChild(s2); $('#bdSels').appendChild(w); bdSel.push([s1, s2]);
  });
  function updateSrc() {
    const el = $('#srcList'), o = S.sc.order;
    el.innerHTML = o.map((id, pos) => '<div class="src-row' + (S.sc.ok ? ' ok' : S.sc.bad[id] ? ' bad' : '') + '"><span class="rk">' + (pos + 1) + '</span><span>' + SRC[id].n + '</span><button type="button" data-pos="' + pos + '" data-d="-1" aria-label="위로"' + (pos === 0 ? ' disabled' : '') + '>▲</button><button type="button" data-pos="' + pos + '" data-d="1" aria-label="아래로"' + (pos === 4 ? ' disabled' : '') + '>▼</button></div>').join('');
    $$('#srcList button').forEach((b) => b.addEventListener('click', () => scMove(+b.dataset.pos, +b.dataset.d)));
  }
  function updateCtl() {
    const fr = game ? game.free : false, lvNow = game ? game.level : 0;
    ctlNodes.forEach((n) => { n.hidden = (n.dataset.modes || '').split(' ').indexOf(S.mode) < 0; });
    modeButtons(S.mode, lvNow, fr);
    const c = S.cs, a = c.as[c.sel];
    $('#csOut').textContent = (c.sel + 1) + ' / 6';
    $$('#csField button').forEach((b) => b.classList.toggle('on', a.f === b.dataset.v));
    $$('#csPrin button').forEach((b) => b.classList.toggle('on', a.p === b.dataset.v));
    $('#csList').innerHTML = '<li class="' + (csReadN() === 6 ? 'on' : '') + '">' + mark(csReadN() === 6) + ' 읽은 카드 ' + csReadN() + ' / 6</li><li class="' + (csAssigned() === 6 ? 'on' : '') + '">' + mark(csAssigned() === 6) + ' 연결한 사례 ' + csAssigned() + ' / 6</li>';
    $$('#plCase button').forEach((b) => b.classList.toggle('on', +b.dataset.v === S.pl.c));
    plSel.forEach((s, i) => { if (document.activeElement !== s && s.value !== String(S.pl.pick[i])) s.value = String(S.pl.pick[i]); s.classList.toggle('bad', !!S.pl.bad[i]); s.classList.toggle('ok', !!S.pl.okAll); });
    updateSrc();
    chSel.forEach((w, i) => { w.hidden = !(S.ch.flag[i] && CHAT[i].opts); const s = w.querySelector('select'); if (S.ch.flag[i] && CHAT[i].opts) s.classList.toggle('ok', S.ch.fix[i] === CHAT[i].ans); });
    $('#chList').innerHTML = '<li class="' + (chFoundN() === 2 ? 'on' : '') + '">' + mark(chFoundN() === 2) + ' 오류 찾기 ' + chFoundN() + ' / 2</li><li class="' + (chFixedN() === 2 ? 'on' : '') + '">' + mark(chFixedN() === 2) + ' 고치기 ' + chFixedN() + ' / 2</li>' + (chFalseFlag() ? '<li>⚠️ 맞는 답을 ' + chFalseFlag() + '개 표시했어요</li>' : '');
    bdSel.forEach((p, i) => { p[0].classList.toggle('bad', S.bd.bad[i]); p[1].classList.toggle('bad', S.bd.bad[i]); });
    const st = bdState();
    $('#bdList').innerHTML = '<li class="' + (st.miss.length === 0 && st.dup.length === 0 ? 'on' : '') + '">' + mark(st.miss.length === 0 && st.dup.length === 0) + ' 서로 다른 사례 3개</li><li class="' + (st.noQ.length === 0 ? 'on' : '') + '">' + mark(st.noQ.length === 0) + ' 질문 카드 3장</li>';
  }
  bindModes(setMode);
  $('#aiClear').addEventListener('click', () => { Sound.click(); aiS.reset(); aiS.markBad([]); updateCtl(); });

  /* ---------- 단계 · 미션 ---------- */
  const levels = [
    {
      title: '사례 지도 읽고 연결하기', short: '사례 지도', icon: '🗺️', phase: '관찰',
      intro: '<p class="si-q">❓ 탐구 질문: 유전자가 켜지고 꺼지는 규칙과 몸이 만들어지는 과정을 알아낸 것은 우리 삶을 어떻게 바꾸었을까?</p><p>🔗 <b>앞 차시들</b>에서 유전자 발현의 중심원리, 유전 부호, 젖당 오페론, 진핵생물의 발현 조절, 세포 분화, 초기 발생과 혹스 유전자를 배웠어요. 이번에는 이 원리들이 <b>인류의 복지</b>에 기여한 사례를 조사하고 모둠과 소통해요.</p><p>정답이 하나인 문제가 아니라 <b>조사 · 검증 · 공유</b>의 과정이 핵심이에요. 먼저 사례 카드 6장을 읽고, 각 사례의 <b>연구 분야</b>(유전자 발현 · 조절 / 발생)와 <b>바탕이 된 원리</b>를 연결해요. (모든 사례는 교육용 요약이며 의료 조언이 아니에요)</p>',
      features: ['cases'],
      setup() { csReset(); setMode('cases'); },
      recap: '재조합 인슐린, 암 유형 분류, 엽산, 약물 안전성, 유도만능줄기세포, mRNA 백신 6가지 사례는 모두 앞 차시의 원리(발현의 중심원리, 유전 부호, 오페론, 전사 인자, 세포 분화, 초기 발생) 위에 서 있고, 각각 해결한 문제와 한계가 있어요.',
      summary: '<ul><li><b>재조합 인슐린</b> : 사람 인슐린 유전자(cDNA)를 대장균에 넣고 젖당 오페론의 프로모터와 유도자(IPTG)로 발현을 켜서 대량 생산 → 유전 부호의 보편성과 인트론에 대한 이해가 바탕이에요.</li><li><b>발현 검사로 암 분류</b> : 종양의 유전자 발현 패턴으로 유형을 나눠 치료 선택에 활용 → 선택적 발현과 발현 조절의 이해.</li><li><b>엽산과 신경관 결손</b> · <b>약물 안전성</b>(탈리도마이드, 제브라피시 모델) → 초기 발생 연구.</li><li><b>유도만능줄기세포</b> : 전사 인자 4종(Oct4, Sox2, Klf4, c-Myc)으로 분화한 세포를 초기화 → 전사 인자와 세포 분화. <b>mRNA 백신</b> : 전사 · 번역 연구의 성과.</li><li>모든 사례에는 <b>한계</b>가 있어요. 한 사례만으로 일반화하지 않아요.</li></ul>',
      missions: [
        {
          id: 'cases', title: '사례 · 분야 · 원리 연결', manual: true,
          goal: '사례 카드 <b>6장을 모두 눌러 읽고</b>, 각 사례의 <b>연구 분야</b>와 <b>바탕 원리</b>를 정한 뒤 <b>✔ 확인하기</b>를 누르세요.',
          hint: '사례를 누르고 오른쪽(또는 아래)에서 분야와 원리를 골라요. 인슐린 : 젖당 오페론 · 유전 부호 / 암 분류 : 세포 분화 · 진핵 조절 / 엽산 : 초기 발생 / 약물 : 초기 발생 / 줄기세포 : 세포 분화 · 진핵 조절 / mRNA 백신 : 중심원리 · 유전 부호.',
          setup() { csReset(); setMode('cases'); },
          check() {
            if (csReadN() < 6) return '카드를 모두 눌러 읽어요 (' + csReadN() + ' / 6).';
            if (csAssigned() < 6) return '아직 ' + (6 - csAssigned()) + '개 사례의 분야나 원리를 정하지 않았어요.';
            const w = csWrong(); S.cs.bad = CASES.map((c, i) => w.indexOf(i) >= 0);
            if (w.length) return '빨간 카드 ' + w.length + '개는 분야나 원리가 달라요. 사례의 "쓰인 지식"을 다시 읽어 보세요.';
            return true;
          },
          explain: '<b>인슐린</b>은 젖당 오페론(프로모터 · 유도자)과 유전 부호의 보편성, <b>암 분류</b>는 세포마다 다른 발현(세포 분화 · 진핵 조절), <b>엽산</b>과 <b>약물 안전성</b>은 초기 발생, <b>유도만능줄기세포</b>는 전사 인자와 세포 분화, <b>mRNA 백신</b>은 전사 · 번역의 중심원리가 바탕이에요. 한 사례에 여러 원리가 함께 쓰이기도 해요.',
        },
        {
          type: 'quiz', title: '재조합 인슐린과 유전 부호',
          goal: '사람 인슐린 유전자를 대장균에 넣어 인슐린을 만들 수 있는 것은 유전 부호가 모든 생물에서 거의 같기 때문이에요. 이것이 왜 필요할까요?',
          setup() { setMode('cases'); },
          choices: ['유전 부호가 거의 같아서 대장균도 사람 유전자의 암호를 같은 아미노산으로 읽기 때문이다', '대장균이 사람 세포로 바뀌기 때문이다', '대장균에 인트론이 많아서 쉽게 번역되기 때문이다', '인슐린은 번역 없이 만들어지기 때문이다'],
          answer: 0,
          feedback: ['', '대장균은 대장균 그대로예요. 유전 부호가 같아서 사람 유전자를 읽을 수 있을 뿐이에요.', '대장균에는 인트론이 거의 없고 제거하는 과정도 없어요. 그래서 인트론이 없는 cDNA를 넣어요.', '인슐린도 단백질이라서 mRNA를 번역해서 만들어요.'],
          explain: '유전 부호(코돈표)는 거의 모든 생물이 같아서 <b>대장균도 사람 인슐린 유전자의 암호를 같은 아미노산으로 읽어요</b>. 인트론은 대장균이 제거하지 못해서 인트론이 없는 cDNA를 넣어요.',
        },
      ],
    },
    {
      title: '사례 하나 골라 조사 계획 세우기', short: '조사 계획', icon: '📝', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 사례 6장의 분야, 바탕 원리, 한계를 읽었어요.</div><p>이제 사례 <b>하나</b>를 골라 조사 계획을 세워요. 계획은 <b>문제 → 알아낸 원리 → 개발된 기술 → 인류 복지 기여 → 한계와 질문</b>의 5칸이에요. 그리고 조사에 쓸 <b>출처</b>를 신뢰도에 따라 판단해요 (학술 논문, 공공기관 보고서, 언론 기사, 개인 블로그, 홍보 자료).</p>',
      features: ['plan'],
      setup() { plReset(0); plFill(); scReset(); setMode('plan'); },
      recap: '조사 계획은 문제 → 알아낸 원리 → 개발된 기술 → 인류 복지 기여 → 한계와 질문 순서로 세우고, 출처는 학술 논문과 공공기관 보고서가 가장 믿을 만하며 언론 기사는 원문 확인이 필요하고 블로그와 홍보 자료는 근거 확인이 더 필요해요.',
      summary: '<ul><li><b>조사 계획 5칸</b> : 문제 → 알아낸 원리 → 개발된 기술 → 인류 복지 기여 → 한계와 질문.</li><li><b>출처의 신뢰도</b> : 학술 논문 · 공공기관 보고서(높음) > 언론 기사(보통, 원문 확인) > 개인 블로그 · 홍보 자료(낮음, 근거 확인 필요).</li><li>한 사례를 조사할 때는 <b>출처를 2곳 이상 비교</b>해요.</li><li>모든 사례는 교육용 요약이며 의료 조언이 아니에요.</li></ul>',
      missions: [
        {
          id: 'plan', title: '조사 계획 5칸 구성', manual: true,
          goal: '사례 하나를 고르고, <b>5칸</b>(문제 · 알아낸 원리 · 개발된 기술 · 인류 복지 기여 · 한계와 질문)에 알맞은 문장을 골라 넣은 뒤 <b>✔ 확인하기</b>를 누르세요.',
          hint: '문제는 "무엇이 어려웠나", 원리는 "어떤 지식이 쓰였나", 기술은 "무엇을 만들거나 했나", 기여는 "어떤 이익", 한계는 "아직 부족한 점"이에요.',
          setup() { plReset(S.pl.c); plFill(); setMode('plan'); },
          check() {
            const r = plCheck();
            if (r.emptyN) return '아직 ' + r.emptyN + '칸이 비었어요. 문장을 골라 넣어요.';
            if (r.wrongN) return '빨간 칸 ' + r.wrongN + '개는 알맞은 문장이 아니에요. 칸의 이름과 문장의 내용을 다시 맞춰 봐요.';
            S.pl.okAll = true; return true;
          },
          explain: '조사 계획은 <b>문제 → 알아낸 원리 → 개발된 기술 → 인류 복지 기여 → 한계와 질문</b> 순서예요. 한계와 질문 칸까지 쓰면 연구의 이익만이 아니라 <b>부족한 점</b>까지 균형 있게 조사할 수 있어요.',
        },
        {
          id: 'src', title: '출처 신뢰도 판단', manual: true,
          goal: '출처 5가지를 <b>믿을 만한 순서</b>로 놓고 <b>✔ 확인하기</b>를 누르세요. (같은 단계 안의 순서는 조금 달라도 돼요)',
          hint: '전문가가 검토한 논문과 공공기관 자료가 위쪽, 기자가 정리한 기사가 가운데, 개인 의견이나 홍보가 목적인 자료가 아래쪽이에요.',
          setup() { scReset(); setMode('src'); },
          check() {
            const bad = scEval(); S.sc.bad = bad;
            if (bad.some((v) => v)) { updateCtl(); return '빨간 출처는 단계가 달라요. 누가 어떤 목적으로 쓴 자료인지 떠올려 봐요.'; }
            S.sc.ok = true; updateCtl(); return true;
          },
          explain: '<b>학술 논문 · 공공기관 보고서</b>는 근거와 검토 과정이 있어 믿을 만해요. <b>언론 기사</b>는 원문 출처를 확인해야 해요. <b>개인 블로그</b>는 개인 의견이 많고 <b>홍보 자료</b>는 알리는 것이 목적이라 장점 위주일 수 있어서, 근거를 따로 확인해야 해요.',
        },
        {
          type: 'quiz', title: '출처를 2곳 이상 비교하는 까닭',
          goal: '한 사례를 조사할 때 출처를 2곳 이상 비교하는 까닭은?',
          setup() { setMode('src'); },
          choices: ['한 곳의 자료가 틀리거나 한쪽으로 치우쳐 있을 수 있어서, 서로 맞춰 보면 믿음을 높일 수 있다', '출처가 많을수록 보고서가 길어지기 때문이다', '출처를 많이 모아야 점수가 올라가기 때문이다', '모든 출처는 항상 같은 내용을 말하기 때문이다'],
          answer: 0,
          feedback: ['', '길이가 목적이 아니에요. 사실을 확인하는 것이 목적이에요.', '점수가 아니라 정확한 정보를 얻기 위해서예요.', '출처마다 내용이나 입장이 다를 수 있어서 비교가 필요해요.'],
          explain: '출처 하나만 믿으면 오류나 치우친 정보를 놓칠 수 있어요. <b>서로 다른 출처를 맞춰 보면</b> 사실을 확인하고 한계까지 파악할 수 있어요.',
        },
      ],
    },
    {
      title: '생명과학 연구와 인공지능', short: 'AI 활용', icon: '🤖', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 사례 조사 계획을 세우고 출처의 신뢰도를 따져 봤어요.</div><p>최신 연구를 조사할 때 <b>인공지능(AI)</b>의 도움을 받는 경우가 많아요. 생명과학에서도 AI는 <b>단백질 구조 예측, 발현 패턴 분류, 조절 서열 예측, 논문 검색 · 요약</b>에 쓰여요. 하지만 AI의 답은 <b>그럴듯하게 틀릴 수 있어서</b> 가설로 받아들이고, 근거를 확인해야 해요.</p><p>AI 활용 사례 4가지를 쓰임과 연결하고, 가상 AI 도우미의 답 4개에서 <b>앞 차시 지식으로 오류 2개</b>를 찾아 바르게 고쳐요.</p>',
      features: ['ai'],
      setup() { chReset(); aiS.reset(); aiS.markBad([]); setMode('chat'); },
      recap: 'AI는 구조 예측, 패턴 분류, 서열 예측, 검색 · 요약에 쓰이지만 답이 틀릴 수 있어요. AI의 답은 가설이므로 앞 차시에서 배운 지식과 출처로 확인하고 실험 · 자료로 검증해야 해요.',
      summary: '<ul><li>생명과학에서 AI의 쓰임 : <b>구조 예측</b>(아미노산 서열로 입체 구조 추정, 약물 표적 탐색), <b>패턴 분류</b>(수천 개 유전자의 발현 패턴으로 암 · 질병 유형 분류), <b>서열 예측</b>(프로모터 · 인핸서 위치), <b>검색 · 요약</b>(오류 가능, 원문 확인).</li><li><b>AI의 답은 가설</b>이에요. 출처와 근거를 확인하고, 실험이나 자료로 검증해요.</li><li>가상 AI 답 검증 : 유전 부호는 거의 모든 생물이 같아서 사람 유전자를 대장균에 넣어도 같은 아미노산이 이어지고, 젖당이 없으면 억제자가 작동 부위에 결합해 전사를 막아요.</li></ul>',
      missions: [
        {
          id: 'err', title: 'AI 답의 오류 2개 찾아 고치기',
          goal: 'AI 도우미의 답 4개 중 <b>틀린 답 2개</b>를 눌러 표시하고, <b>바르게 고친 문장</b>을 골라요.',
          hint: '답 ②는 유전 부호의 보편성, 답 ④는 젖당 오페론의 억제자 작용을 떠올려요. 표시한 답은 오른쪽(또는 아래)에서 고쳐요.',
          setup() { chReset(); setMode('chat'); },
          check: () => S.ch.flag[1] === 1 && S.ch.flag[3] === 1 && S.ch.flag[0] === 0 && S.ch.flag[2] === 0 && chFixedN() === 2, hold: 0.8,
          status: () => mark(chFoundN() === 2 && chFalseFlag() === 0) + ' 오류 찾기 ' + chFoundN() + ' / 2' + (chFalseFlag() ? ' (맞는 답 ' + chFalseFlag() + '개를 잘못 표시)' : '') + ' &nbsp; ' + mark(chFixedN() === 2) + ' 고치기 ' + chFixedN() + ' / 2',
          explain: '<b>답 ②</b> : 유전 부호는 거의 모든 생물이 같아서 사람 유전자를 대장균에 넣어도 같은 아미노산이 이어져요. <b>답 ④</b> : 젖당이 없으면 억제자가 작동 부위에 <b>결합</b>해 RNA 중합 효소의 진행을 막아요. 답 ①(인트론)과 ③(발현하는 유전자가 달라서 세포가 달라짐)은 맞아요.',
        },
        {
          id: 'use', title: 'AI 활용 4쌍 연결', manual: true,
          goal: 'AI 활용 사례 카드 4장을 알맞은 <b>쓰임</b>(구조 예측 · 패턴 분류 · 서열 예측 · 검색 · 요약) 칸에 놓고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '서열로 입체 구조는 구조 예측, 발현 패턴으로 유형 나누기는 패턴 분류, 조절 서열 위치는 서열 예측, 논문 요약은 검색 · 요약이에요.',
          setup() { aiS.reset(); aiS.markBad([]); setMode('ai'); },
          check() {
            const s = aiState();
            if (s.miss.length) { aiS.markBad([]); return '카드 ' + s.miss.length + '장이 아직 보관함에 있어요.'; }
            aiS.markBad(s.bad);
            if (s.bad.length) return '빨간 카드는 쓰임이 달라요. 카드의 설명이 무엇을 하는지 다시 읽어 봐요.';
            return true;
          },
          explain: '<b>구조 예측</b> : 아미노산 서열 → 입체 구조(약물 표적 탐색). <b>패턴 분류</b> : 발현 패턴 → 암 · 질병 유형. <b>서열 예측</b> : 프로모터 · 인핸서 위치. <b>검색 · 요약</b> : 논문 요약(오류가 있을 수 있어 원문 확인).',
        },
        {
          type: 'quiz', title: 'AI가 그럴듯하게 틀릴 수 있는 까닭',
          goal: 'AI의 답에 그럴듯한 오류가 섞일 수 있어요. 가장 알맞은 설명과 태도는?',
          setup() { setMode('chat'); },
          choices: ['AI는 항상 정답 목록에서 그대로 꺼내 오므로 틀리지 않는다', '학습한 패턴으로 그럴듯한 문장을 만들 뿐이라 사실이 아닌 내용도 자신 있게 쓸 수 있으니, 답을 가설로 보고 근거와 출처를 확인한다', 'AI는 한국어를 몰라서 틀린다', 'AI의 답은 확정된 사실이라 확인할 필요가 없다'],
          answer: 1,
          feedback: ['AI가 정답 목록을 꺼내 오는 것이 아니에요. 그래서 틀린 내용이 섞일 수 있어요.', '', '언어를 아는지의 문제가 아니라, 그럴듯한 문장을 만드는 방식 때문이에요.', '확정된 사실이라고 믿으면 위험해요. 가설로 보고 확인해요.'],
          explain: 'AI는 <b>그럴듯한 문장</b>을 만들어 내지만 사실이 아닌 내용도 자신 있게 쓸 수 있어요. 그래서 AI의 답은 <b>가설</b>로 보고 <b>근거와 출처를 확인</b>하고 자료로 검증해요.',
        },
      ],
    },
    {
      title: '모둠과 공유하고 지도 완성하기', short: '공유하기', icon: '👥', phase: '정리',
      intro: '<div class="si-link">🔗 <b>앞 단계들에서</b> 사례를 조사하는 계획을 세우고 출처와 AI의 답을 검증하는 방법을 익혔어요.</div><p>이제 <b>협력적으로 소통</b>해요. 가상 모둠에는 <b>조사자 · 검증자 · 발표자</b> 세 역할이 있고, 각자 <b>서로 다른 사례</b>의 요약 카드를 올려요. 요약에서 <b>빠진 내용</b>을 묻는 질문 카드를 달고, 사례들을 합쳐 <b>유전자 발현 · 발생 연구가 인류 복지에 기여한 지도</b>를 완성해요.</p>',
      features: ['board'],
      setup() { bdReset(); setMode('board'); },
      recap: '조사자는 사례를 모으고 검증자는 사실과 출처를 확인하며 발표자는 정리해서 전해요. 서로의 요약에 빠진 내용을 묻는 질문을 달면 더 정확해지고, 사례를 합치면 어떤 원리가 어떤 복지로 이어졌는지 지도로 볼 수 있어요.',
      summary: '<ul><li><b>역할</b> : 조사자(사례 조사), 검증자(사실 · 출처 확인), 발표자(정리해 전달).</li><li>서로 <b>다른 사례</b>를 올리고, 요약에서 빠진 내용(해결된 문제 · 쓰인 원리 · 한계)을 묻는 <b>질문 카드</b>를 달아요.</li><li>사례들을 합치면 <b>연구 분야 · 바탕 원리 · 복지</b>의 지도가 완성돼요.</li><li>한 사례만으로 "연구는 항상 이익만 준다"고 결론낼 수 없어요. 사례마다 <b>한계</b>가 있어요.</li></ul>',
      missions: [
        {
          id: 'board', title: '요약 카드 3장과 질문 카드', manual: true,
          goal: '세 역할이 올릴 <b>서로 다른 사례 3개</b>를 고르고, 각 요약에서 <b>빠진 내용</b>(??? 칸)을 묻는 질문 카드를 골라 붙인 뒤 <b>✔ 확인하기</b>를 누르세요.',
          hint: '??? 로 가려진 칸이 "해결된 문제 · 쓰인 원리 · 한계" 중 무엇인지 보고, 그것을 묻는 질문을 골라요.',
          setup() { bdReset(); setMode('board'); },
          check() {
            const st = bdState();
            if (st.miss.length) return '사례를 아직 고르지 않은 역할이 ' + st.miss.length + '명 있어요.';
            if (st.dup.length) { S.bd.bad = [0, 1, 2].map((i) => st.dup.indexOf(i) >= 0); return '같은 사례를 두 명이 골랐어요. 서로 다른 사례를 올려요.'; }
            if (st.noQ.length) { S.bd.bad = [false, false, false]; return '질문 카드를 아직 고르지 않은 역할이 ' + st.noQ.length + '명 있어요.'; }
            S.bd.bad = [0, 1, 2].map((i) => st.wrongQ.indexOf(i) >= 0);
            st.wrongQ.forEach((i) => { if (!S.bd.shake[i]) S.bd.shake[i] = 1; });
            if (st.wrongQ.length) return '빨간 카드의 질문이 요약에서 빠진 내용과 달라요. ??? 칸이 무엇인지 확인해요.';
            S.bd.merged = true; return true;
          },
          explain: '조사자의 요약은 <b>한계</b>, 검증자의 요약은 <b>쓰인 원리</b>, 발표자의 요약은 <b>해결된 문제</b>가 빠져 있었어요. 빠진 내용을 묻는 질문을 달면 서로의 요약이 더 완전해져요. 세 사례가 합쳐져 분야와 바탕 원리의 지도가 이어졌어요.',
        },
        {
          type: 'quiz', title: '검증자의 역할',
          goal: '협력적 소통에서 <b>검증자</b>가 하는 가장 중요한 일은?',
          setup() { setMode('board'); },
          choices: ['사례의 사실과 출처를 확인하고 오류가 있으면 바로잡는다', '요약을 가장 빨리 쓴다', '발표 순서를 정한다', '다른 사람의 의견에 무조건 반대한다'],
          answer: 0,
          feedback: ['', '속도가 아니라 정확성이 중요해요.', '순서를 정하는 일은 검증이 아니에요.', '반대가 목적이 아니라 근거로 확인하는 것이 목적이에요.'],
          explain: '검증자는 사례의 <b>사실과 출처를 확인</b>하고 오류를 바로잡아 모둠이 정확한 정보를 전하도록 도와요.',
        },
        {
          type: 'quiz', title: '한 사례로 결론낼 수 없는 까닭',
          goal: '사례 하나가 성공적이었다고 해서 "유전자 발현 · 발생 연구는 항상 이익만 준다"고 결론낼 수 없는 까닭은?',
          setup() { setMode('board'); },
          choices: ['사례마다 한계와 부작용 가능성, 서로 다른 입장이 있어서 한두 사례만으로 일반화할 수 없기 때문이다', '모든 사례가 해롭기 때문이다', '연구는 이익을 주지 않기 때문이다', '사례가 6개나 있으면 충분하기 때문이다'],
          answer: 0,
          feedback: ['', '모든 사례가 해로운 것이 아니에요. 이익과 한계가 함께 있어요.', '이 차시의 사례들은 실제 이익이 있었어요. 다만 한계도 있어요.', '개수가 아니라 사례마다 한계와 입장이 다르다는 점이 중요해요.'],
          explain: '사례마다 <b>한계</b>(비용, 안전성, 모델 생물과 사람의 차이 등)와 다른 입장이 있어요. 몇 가지 사례만으로 <b>일반화하지 않고</b>, 근거를 비교하며 균형 있게 판단해요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hg-expression-benefit', mount: '#game', badge: '복지 탐구가', homeHref: '../../index.html#hg',
    featureLabels: { cases: '🗺️ 사례 지도', plan: '📝 조사 계획 · 출처 신뢰도', ai: '🤖 AI 쓰임 · AI 답 검증', board: '👥 모둠 보드' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 읽음 칸 ---------- */
  function readouts() {
    const m = S.mode;
    if (m === 'cases') setReads(['읽은 카드', csReadN() + ' / 6', '연결한 사례', csAssigned() + ' / 6', '고른 사례', CASES[S.cs.sel].t]);
    else if (m === 'plan') setReads(['고른 사례', CASES[S.pl.c].t, '채운 칸', S.pl.pick.filter((v) => v >= 0).length + ' / 5', '계획', '문제 → 한계와 질문']);
    else if (m === 'src') setReads(['1순위', SRC[S.sc.order[0]].n, '5순위', SRC[S.sc.order[4]].n, '확인', S.sc.ok ? '통과' : '순서 정하는 중']);
    else if (m === 'ai') setReads(['놓은 카드', aiS.cards.filter((c) => c.zone).length + ' / 4', 'AI 쓰임', '4가지', '기억할 것', 'AI의 답은 가설']);
    else if (m === 'chat') setReads(['오류 찾기', chFoundN() + ' / 2', '고치기', chFixedN() + ' / 2', '표시한 답', S.ch.flag.reduce((a, b) => a + b, 0) + '개']);
    else { const b = S.bd, n = b.cs.filter((v) => v >= 0).length; setReads(['올린 사례', n + ' / 3', '질문 카드', b.q.filter((v) => v >= 0).length + ' / 3', '지도', b.merged ? '완성' : '준비 중']); }
  }

  /* ---------- 시작 ---------- */
  aiInit(); aiPT = sorterPT(() => aiS); plFill(); updateSrc();
  setMode('cases');
  let lastFree = false, lastLv = -1;
  function frameFn(dt, t) {
    clock = t; S.t = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (game && game.level !== lastLv) { lastLv = game.level; updateCtl(); }
    view.apply(); ctx.clearRect(0, 0, VW, VH);
    bgFill('#eef4f2', '#e3ece8');
    switch (S.mode) {
      case 'cases': csDraw(dt, t); break;
      case 'plan': plDraw(dt, t); break;
      case 'src': scDraw(dt, t); break;
      case 'ai': aiDraw(dt, t); break;
      case 'chat': chDraw(dt, t); break;
      case 'board': bdDraw(dt, t); break;
    }
    FX.update(dt); FX.draw();
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(241,246,243,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : approach(S.fade, 0, dt, 9); }
    readouts();
  }
  SciSim.loop(frameFn);

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    frameFn, S, VW, VH, PHONE, get game() { return game; }, levels, setMode, updateCtl, CASES, PRIN, csTile, csPick, csSetField, csSetPrin, csWrong, plReset, plFill, plCheck, scMove, scEval, SRC,
    get aiS() { return aiS; }, aiState, AIU, chToggle, chBox, CHAT, bdState, BDG, bdReset, ROLES, QS, csReadN, csAssigned,
  };
})();
