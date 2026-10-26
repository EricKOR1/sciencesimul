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
  const ease = SciSim.ease;
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
  /* 상자 안에 글을 꽉 채워 쓰기: 줄 수가 넘치면 글자를 줄여요 */
  function textFit(x, y, w, h, str, maxS, minS, color, weight, align) {
    let s = maxS, ls;
    for (; s >= minS; s -= 0.5) { ls = wrap(str, w, s, weight || 700); if (ls.length * s * 1.42 <= h) break; }
    ls = wrap(str, w, s, weight || 700);
    const lh = s * 1.42;
    ls.forEach((l, i) => T(align === 'center' ? x + w / 2 : x, y + s + i * lh, l, s, color, align || 'left', weight || 700));
    return s;
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
      else if (e.kind === 'flash') { ctx.save(); ctx.globalAlpha = (1 - p) * (e.alpha || 0.6); D.glow(e.x, e.y, (e.r || 40) * (0.6 + p), e.color || '#ef4444', 1); ctx.restore(); }
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
    D.shadow(() => { D.roundRect(-w / 2, -h / 2, w, h, r); ctx.fillStyle = c.bad ? '#fdeceb' : (c.ok ? '#effaf1' : (c.sel ? '#fff8dc' : (c.fill || '#fff'))); ctx.fill(); }, { blur: 5 + c.lift * 10, y: 2 + c.lift * 4 });
    ctx.strokeStyle = c.bad ? '#e2464b' : c.ok ? '#16a34a' : c.sel ? '#f59e0b' : C.shade(c.col || '#16a34a', 0.15); ctx.lineWidth = c.bad || c.sel || c.ok ? 3 : 2; D.roundRect(-w / 2, -h / 2, w, h, r); ctx.stroke();
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
     o.cards: [{id, label, short, icon, col, sub}]   o.boxes: [{id, label, col, x, y, w, h, cols, hdr, cap}]
     o.tray(i) -> {x, y}   o.cw, o.ch: 카드 크기   o.kh: 상자 속 칩 높이   o.onTap(card)   o.onChange() */
  class Sorter {
    constructor(o) {
      this.o = o; this.boxes = o.boxes; this.seq = 0; this.drag = null; this.hot = null;
      this.cards = o.cards.map((d, i) => { const p = o.tray(i); return Object.assign({}, d, { x: p.x, y: p.y, w: o.cw, h: o.ch, zone: null, lift: 0, bad: false, ok: false, shake: 0, home: p, seq: 0, sel: false }); });
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
      const was = c.zone; c.zone = zoneId || null; c.bad = false; c.ok = false; if (zoneId) c.seq = ++this.seq; c.lift = 0;
      const box = zoneId ? this.boxes.find((b) => b.id === zoneId) : null;
      if (box && box.cap) {
        const mem = this.cards.filter((k) => k.zone === zoneId && k !== c).sort((a, b) => a.seq - b.seq);
        while (mem.length >= box.cap) { const o = mem.shift(); o.zone = null; o.bad = false; o.ok = false; }
      }
      this.layout(); if (was !== c.zone) { Sound.click(); this.o.onChange && this.o.onChange(); }
    }
    reset() { this.cards.forEach((c) => { c.zone = null; c.bad = false; c.ok = false; c.sel = false; }); this.drag = null; this.selected = null; this.layout(true); this.o.onChange && this.o.onChange(); }
    get placed() { return this.cards.filter((c) => c.zone).length; }
    markBad(ids) {
      this.cards.forEach((c) => { const bad = ids.indexOf(c.id) >= 0; if (bad && !c.bad) c.shake = 1; c.bad = bad; });
    }
    markOk(ids) { this.cards.forEach((c) => { c.ok = ids.indexOf(c.id) >= 0 && !c.bad; }); }
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
        if (b.label) TF(b.x + b.w / 2, b.y + (b.ly || 19), b.label, b.w - 16, b.ls || 14.5, 11.5, C.shade(b.col, -0.35), 'center', 800);
        if (b.draw) b.draw(b);
      });
    }
    drawCards() { this.cards.forEach((c) => { c.sel = !!(this.o.isSel && this.o.isSel(c)); drawCard(c); }); }
    draw() { this.drawBoxes(); this.drawCards(); }
  }
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

  /* 읽음 칸 (캔버스 아래 3칸) */
  const v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3'), l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3');
  let rlast = '';
  function setReads(a) {
    const k = a.join('|'); if (k === rlast) return; rlast = k;
    l1.textContent = a[0]; v1.textContent = a[1]; l2.textContent = a[2]; v2.textContent = a[3]; l3.textContent = a[4]; v3.textContent = a[5];
  }
  function fmtN(n, d) { return Number(n).toLocaleString('ko-KR', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); }
  const fmtG = (v) => (Math.abs(v - Math.round(v)) < 0.05 ? String(Math.round(v)) : v.toFixed(1));
  function chipOn(root, val) { $$('button', root).forEach((b) => b.classList.toggle('on', String(b.dataset.v) === String(val))); }
  /* 모드 단추: 현재 단계(data-lv, 공백으로 여러 단계 가능)에 속한 것만 보여 줘요 */
  function modeBtns(cur, lvNow, free) {
    $$('#modeSeg button').forEach((b) => {
      const lvs = String(b.dataset.lv).split(' ').map(Number);
      b.classList.toggle('on', b.dataset.mode === cur);
      b.classList.toggle('lv-off', !free && lvs.indexOf(lvNow) < 0);
    });
  }
  function bindModes(setModeFn) { $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setModeFn(b.dataset.mode); })); }
  const wait = (fn, ms) => setTimeout(fn, ms);
  function okBurst(x, y) { parts.burst(x, y, { count: 14, speed: 120, life: 0.7, size: 3.5 }); }
  function pill(x, y, text, o) { return D.label(x, y, text, o); }
  function dot(x, y, r, col, o) { D.sphere(x, y, r, col, o || {}); }
  function curveArrow(x1, y1, cx1, cy1, cx2, cy2, x2, y2, o) {
    o = o || {};
    ctx.save(); ctx.strokeStyle = ctx.fillStyle = o.color || '#334155'; ctx.lineWidth = o.width || 4; ctx.lineCap = 'round';
    if (o.dash) ctx.setLineDash(o.dash);
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.bezierCurveTo(cx1, cy1, cx2, cy2, x2, y2); ctx.stroke(); ctx.setLineDash([]);
    const a = Math.atan2(y2 - cy2, x2 - cx2), h = o.head || 11;
    ctx.beginPath(); ctx.moveTo(x2 + Math.cos(a) * 2, y2 + Math.sin(a) * 2);
    ctx.lineTo(x2 - Math.cos(a) * h + Math.sin(a) * h * 0.55, y2 - Math.sin(a) * h - Math.cos(a) * h * 0.55);
    ctx.lineTo(x2 - Math.cos(a) * h - Math.sin(a) * h * 0.55, y2 - Math.sin(a) * h + Math.cos(a) * h * 0.55); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  /* 작은 안전 저장 (실패해도 괜찮아요) */
  function lsGet(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* 무시 */ } }
  /* 눌러서 한 번에 한 칸씩 채우는 순서 도우미: 같은 배열을 섞어요 */
  function shuffled(arr, seed) { const r = mulberry(seed || 7), a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  /* =========================================================
     고등학교 생물의 유전 · Ⅲ. 생명공학기술 - 생명공학 분야 탐구 (단원 61, 5차시)
     성취기준 [12유전03-03] 생명공학기술 관련 학문 분야를 이해하고 우리 생활과 산업에 활용 사례를 조사하여 창의적으로 설명 자료를 제작할 수 있다.
     ① 관찰: 분야 지도  ② 실험: 단백질–화합물 가상 실험  ③ 분석: 활용 사례  ④ 설명: 설명 자료
     (결합 점수 · 억제율은 교육용 가상 값이에요. 실제 에너지 단위가 아니에요)
     ========================================================= */
  const S = { mode: 'map', fade: 0, t: 0 };
  let game = null;
  const ctlNodes = $$('#ctrlCard .control');
  const MINUS = '−';
  const fmtS = (v) => { const r = Math.round(v * 10) / 10; return (r > 0 ? '+' : r < 0 ? MINUS : '') + Math.abs(r).toFixed(1); };

  /* ===== 분야 8곳 ===== */
  const FIELDS = [
    { id: 'gene', name: '유전공학·분자생물학', col: '#16a34a', q: '유전자를 어떻게 읽고, 자르고, 이어 붙일까?', qs: '유전자 읽기·자르기' },
    { id: 'prot', name: '단백질 공학', col: '#f59e0b', q: '단백질의 구조를 바꿔 기능을 더 좋게 만들 수 있을까?', qs: '단백질 기능 개량' },
    { id: 'cell', name: '세포·조직 공학', col: '#ec4899', q: '세포를 키워 손상된 조직을 대신할 수 있을까?', qs: '세포 배양·조직 대체' },
    { id: 'info', name: '생물정보학', col: '#0ea5e9', q: '방대한 서열 데이터에서 의미 있는 패턴을 어떻게 찾을까?', qs: '서열 데이터 분석' },
    { id: 'syn', name: '합성생물학', col: '#8b5cf6', q: '유전 회로를 설계해 생명체에 새 기능을 줄 수 있을까?', qs: '유전 회로 설계' },
    { id: 'pharm', name: '의약·약학', col: '#ef4444', q: '질병 표적에 잘 듣고 안전한 약을 어떻게 만들까?', qs: '안전한 약 설계' },
    { id: 'agri', name: '식품·농업 생명공학', col: '#84cc16', q: '수확량과 영양, 병해충 저항성을 어떻게 높일까?', qs: '작물·식품 개선' },
    { id: 'env', name: '환경 생명공학', col: '#14b8a6', q: '미생물로 오염을 줄이고 자원을 되살릴 수 있을까?', qs: '오염 정화·재활용' },
  ];
  const FNAME = (id) => (FIELDS.find((f) => f.id === id) || {}).name || '';

  /* =========================================================
     ① 분야 지도: 연구 질문 카드 8장 → 분야 칸 8곳
     ========================================================= */
  const MP = { so: null };
  function mpGeom() {
    const w = PHONE ? 228 : 384, h = 58, gap = 8, x0 = PHONE ? 8 : 10, y0 = 40, ch = PHONE ? 38 : 40;
    return { w, h, gap, x0, y0, ch, ty: y0 + 4 * (h + 6) + 26 };
  }
  function mpBuild() {
    const g = mpGeom();
    const boxes = FIELDS.map((f, i) => ({ id: f.id, label: f.name, col: f.col, x: g.x0 + (i % 2) * (g.w + g.gap), y: g.y0 + Math.floor(i / 2) * (g.h + 6), w: g.w, h: g.h, cols: 1, hdr: PHONE ? 22 : 24, cap: 1, ly: PHONE ? 16 : 17, ls: PHONE ? 12.5 : 13.5 }));
    const order = shuffled(FIELDS.map((f) => f.id), 11);
    const cards = order.map((id) => { const f = FIELDS.find((x) => x.id === id); return { id: f.id, label: f.q, short: f.qs, col: '#0ea5e9' }; });
    MP.so = selectable({ cards, boxes, cw: g.w, ch: g.ch, kh: 28, tray: (i) => ({ x: g.x0 + (i % 2) * (g.w + g.gap), y: g.ty + Math.floor(i / 2) * (g.ch + 6) }), onChange() { updateCtl(); } });
  }
  const mpWrong = () => MP.so.cards.filter((c) => c.zone && c.zone !== c.id);
  function mapScene(dt, t) {
    const g = mpGeom();
    MP.so.update(dt);
    T(14, 28, '연구 질문 카드를 알맞은 분야 칸에 놓아요', PHONE ? 14.5 : 16.5, '#334155', 'left', 800);
    MP.so.drawBoxes();
    T(14, g.ty - 8, '연구 질문 카드 (끌어서 놓거나, 카드 → 칸 순서로 눌러요)', PHONE ? 12.5 : 13.5, '#64748b', 'left', 800);
    MP.so.drawCards();
  }
  const mapPT = sorterPT(() => MP.so);

  /* =========================================================
     ① 신약 개발 팀: 한 사례에 세 분야가 협력
     ========================================================= */
  const ROLES = [
    { id: 'info', name: '생물정보학', step: '① 표적 찾기', job: '생명정보 분석가', col: '#0ea5e9', text: '유전체와 단백질 서열 데이터를 분석해 질병과 관련된 단백질, 곧 약이 작용할 표적 후보를 찾아요.' },
    { id: 'prot', name: '단백질 공학', step: '② 표적 분석', job: '단백질 공학 연구원', col: '#f59e0b', text: '표적 단백질을 만들어 구조와 결합 포켓을 알아내고, 필요하면 단백질의 기능을 개량해요.' },
    { id: 'pharm', name: '의약·약학', step: '③ 후보 시험', job: '바이오 의약품 개발자 · 품질·규제 전문가', col: '#16a34a', text: '약 후보 물질을 설계하고 세포와 동물에서 시험해요. 승인 전에 효과와 안전성, 품질을 엄격하게 평가해요.' },
  ];
  const CO = { seen: { info: false, prot: false, pharm: false }, sel: null, draw: { info: 0, prot: 0, pharm: 0 }, hits: [] };
  function coGeom() {
    if (PHONE) return { c: { x: 240, y: 175, r: 46 }, n: { info: { x: 88, y: 92 }, prot: { x: 392, y: 92 }, pharm: { x: 240, y: 318 } }, nr: 44, panel: { x: 8, y: 392, w: 464, h: 236 } };
    return { c: { x: 400, y: 190, r: 56 }, n: { info: { x: 130, y: 130 }, prot: { x: 670, y: 130 }, pharm: { x: 400, y: 340 } }, nr: 52, panel: { x: 10, y: 410, w: 780, h: 138 } };
  }
  function coSelect(id) { CO.sel = id; if (!CO.seen[id]) { CO.seen[id] = true; okBurst(coGeom().n[id].x, coGeom().n[id].y); } CO.draw[id] = 0; Sound.tick(); updateCtl(); }
  function collabScene(dt, t) {
    const g = coGeom();
    T(14, 28, '신약 개발 한 가지에 세 분야가 함께해요', PHONE ? 14.5 : 16.5, '#334155', 'left', 800);
    CO.hits = [];
    ROLES.forEach((r) => {
      const n = g.n[r.id], seen = CO.seen[r.id];
      CO.draw[r.id] = seen ? Math.min(1, CO.draw[r.id] + dt * 2.2) : 0;
      const p = ease.outCubic(CO.draw[r.id]);
      // 연결선 draw (눌러야 그려져요)
      ctx.save(); ctx.strokeStyle = C.rgba(r.col, 0.35); ctx.lineWidth = 3; ctx.setLineDash([6, 6]);
      ctx.beginPath(); ctx.moveTo(g.c.x, g.c.y); ctx.lineTo(g.c.x + (n.x - g.c.x), g.c.y + (n.y - g.c.y)); ctx.stroke(); ctx.setLineDash([]);
      if (p > 0) { ctx.strokeStyle = r.col; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(g.c.x, g.c.y); ctx.lineTo(g.c.x + (n.x - g.c.x) * p, g.c.y + (n.y - g.c.y) * p); ctx.stroke(); }
      ctx.restore();
    });
    // 가운데: 신약 개발
    D.glow(g.c.x, g.c.y, g.c.r * 1.8, '#fde68a', 0.5);
    D.sphere(g.c.x, g.c.y, g.c.r, '#fbbf24', { shadow: true });
    E('💊', g.c.x, g.c.y - 6, g.c.r * 0.7);
    T(g.c.x, g.c.y + g.c.r * 0.62, '신약 개발', PHONE ? 13 : 14.5, '#7c2d12', 'center', 800);
    ROLES.forEach((r) => {
      const n = g.n[r.id], seen = CO.seen[r.id], sel = CO.sel === r.id;
      if (sel) D.ring(n.x, n.y, g.nr + 8, t, { color: '#f59e0b', width: 3 });
      D.sphere(n.x, n.y, g.nr, r.col, { shadow: true });
      TF(n.x, n.y - 2, r.name, g.nr * 1.7, PHONE ? 14 : 16, 11, '#fff', 'center', 800);
      T(n.x, n.y + 17, r.step, PHONE ? 12.5 : 13.5, '#fff', 'center', 800);
      if (seen) { D.sphere(n.x + g.nr * 0.72, n.y - g.nr * 0.72, 12, '#16a34a', { text: '✓', textScale: 1.1, outline: '#fff', outlineWidth: 2 }); }
      CO.hits.push({ id: r.id, x: n.x - g.nr, y: n.y - g.nr, w: g.nr * 2, h: g.nr * 2 });
    });
    const q = g.panel; panel(q.x, q.y, q.w, q.h, 16);
    if (!CO.sel) {
      T(q.x + 18, q.y + 34, '❓ 세 분야를 눌러 보세요', 17, '#334155', 'left', 800);
      textBlock(q.x + 18, q.y + 62, q.w - 36, '약 하나가 만들어지기까지 서로 다른 전문 분야가 맡은 일이 달라요.', PHONE ? 14 : 15, '#475569', 22, 700);
    } else {
      const r = ROLES.find((x) => x.id === CO.sel);
      pill(q.x + 16, q.y + 28, r.step + ' · ' + r.name, { bg: r.col, color: '#fff', size: 14, align: 'left' });
      textBlock(q.x + 18, q.y + 62, q.w - 36, r.text, PHONE ? 14 : 15.5, '#334155', PHONE ? 21 : 23, 700);
      TF(q.x + 18, q.y + q.h - 16, '👩‍🔬 관련 직업: ' + r.job, q.w - 36, 14.5, 11.5, C.shade(r.col, -0.35), 'left', 800);
    }
  }
  const collabPT = {
    down(p) { for (const r of CO.hits) if (inRect(p.x, p.y, r)) { coSelect(r.id); return false; } return false; },
    hover(p) { return CO.hits.some((r) => inRect(p.x, p.y, r)) ? 'pointer' : 'default'; },
  };

  /* =========================================================
     ② 가상 실험: 표적 효소 T 와 정상 효소 N 의 결합 포켓
     점수 규칙(교육용): 정전기 상보 쌍 −1.5, 수소 결합 −1.0, 소수성 접촉 −0.5, 입체 충돌 +3.0
     ========================================================= */
  const DEG = Math.PI / 180, STEP = 72 * DEG;
  const GRP = { P: { col: '#3b82f6', ch: '+' }, M: { col: '#ef4444', ch: MINUS }, H: { col: '#f59e0b', ch: '소' }, D: { col: '#16a34a', ch: '주' }, A: { col: '#14b8a6', ch: '받' } };
  /* 포켓의 다섯 자리: kind = 자리의 성질, need = 짝이 되는 화합물의 기 */
  const SITE = [
    { n: 'P1', kind: 'M', need: 'P', val: -1.5, type: 'e' },
    { n: 'P2', kind: 'P', need: 'M', val: -1.5, type: 'e' },
    { n: 'P3', kind: 'H', need: 'H', val: -0.5, type: 'h' },
    { n: 'P4', kind: 'A', need: 'D', val: -1.0, type: 'b' },
    { n: 'P5', kind: 'D', need: 'A', val: -1.0, type: 'b' },
  ];
  const N_SITES = [0, 2, 3];                  // 정상 효소 N 은 P1 · P3 · P4 만 가져요
  /* 화합물: grp[j] = j번째 꼭짓점의 기 (null 이면 없음) */
  const CMPD = {
    A: { grp: ['P', null, 'H', 'D', null], col: '#f97316' },
    B: { grp: ['P', 'M', 'H', 'D', 'A'], col: '#8b5cf6' },
    C: { grp: [null, null, 'H', 'H', null], col: '#84cc16' },
    D: { grp: ['P', 'M', null, 'D', null], col: '#0ea5e9' },
    E: { grp: ['P', null, 'H', null, null], bulky: 4, col: '#64748b' },
    F: { grp: [null, 'M', null, null, 'A'], col: '#ec4899' },
  };
  const IDS_T = ['A', 'B', 'C', 'D', 'E', 'F'], IDS_N = ['B', 'D', 'A'];
  /* 자세(rot: 72° 시계 방향 돌림 횟수)에서의 점수 */
  function pose(id, rot, P) {
    const c = CMPD[id], pairs = []; let total = 0;
    for (let j = 0; j < 5; j++) {
      const s = (j + rot) % 5;
      if (P === 'N' && N_SITES.indexOf(s) < 0) continue;
      const g = c.grp[j];
      if (g && g === SITE[s].need) { pairs.push({ site: s, j, val: SITE[s].val, type: SITE[s].type }); total += SITE[s].val; }
    }
    const clash = c.bulky != null;
    if (clash) total += 3.0;
    return { total: Math.round(total * 10) / 10, pairs, clash, clashSite: clash ? (c.bulky + rot) % 5 : -1 };
  }
  function bestPose(id, P) { let b = null; for (let r = 0; r < 5; r++) { const q = pose(id, r, P || 'T'); if (!b || q.total < b.total - 1e-9) b = { rot: r, total: q.total }; } return b; }
  function breakdown(ps) {
    const cnt = { e: 0, b: 0, h: 0 }; ps.pairs.forEach((q) => { cnt[q.type]++; });
    const out = [];
    if (cnt.e) out.push(['정전기 ' + cnt.e + '쌍', cnt.e * -1.5, '#2563eb']);
    if (cnt.b) out.push(['수소 결합 ' + cnt.b + '쌍', cnt.b * -1.0, '#16a34a']);
    if (cnt.h) out.push(['소수성 ' + cnt.h + '곳', cnt.h * -0.5, '#d97706']);
    if (ps.clash) out.push(['입체 충돌', 3.0, '#dc2626']);
    return out;
  }
  const DK = { T: { id: null, rot: 0 }, N: { id: null, rot: 0 }, ang: 0, angT: 0, cx: 0, cy: 0, csc: 1, score: 0, best: {}, bestRot: {}, chosen: null, seenN: {}, drag: null, hits: [], msg: '', msgT: 0, tokFlash: {} };
  const curP = () => (S.mode === 'sel' ? 'N' : 'T');
  const triedN = () => Object.keys(DK.best).length;
  function dkGeom() {
    if (PHONE) return { s: 0.74, px: 240, py: 180, score: { x: 8, y: 296, w: 464, h: 82 }, rank: { x: 8, y: 386, w: 464, h: 166 }, tray: { y: 560, h: 76 } };
    return { s: 1, px: 205, py: 238, score: { x: 372, y: 40, w: 418, h: 120 }, rank: { x: 372, y: 166, w: 418, h: 250 }, tray: { y: 448, h: 104 } };
  }
  function trayRects(ids) {
    const g = dkGeom(), n = ids.length, gap = PHONE ? 4 : 8, W = VW - (PHONE ? 16 : 20);
    const w = (W - gap * (n - 1)) / n;
    return ids.map((id, i) => ({ id, x: (PHONE ? 8 : 10) + i * (w + gap), y: g.tray.y, w, h: g.tray.h }));
  }
  function dkMsg(m) { DK.msg = m; DK.msgT = 3.5; }
  /* 화합물을 포켓에 넣기 (fx, fy: 날아오는 시작 위치) */
  function dockIn(id, fx, fy) {
    const P = curP(), g = dkGeom(), cur = DK[P];
    if (P === 'N' && DK.best[id] == null) { dkMsg('먼저 표적 효소 T에서 이 후보를 맞춰 보세요.'); Sound.fail(); return; }
    cur.id = id; cur.rot = P === 'N' ? (DK.bestRot[id] || 0) : 0;
    DK.angT = cur.rot * STEP; DK.ang = DK.angT;
    DK.cx = fx == null ? g.px : fx; DK.cy = fy == null ? g.py : fy; DK.csc = 0.5 / g.s * (PHONE ? 0.8 : 1);
    Sound.click(); afterPose(true);
  }
  function afterPose(isNew) {
    const P = curP(), cur = DK[P]; if (!cur.id) { updateCtl(); return; }
    const ps = pose(cur.id, cur.rot, P), g = dkGeom();
    if (P === 'T') {
      const old = DK.best[cur.id];
      if (old == null || ps.total < old - 1e-9) { DK.best[cur.id] = ps.total; DK.bestRot[cur.id] = cur.rot; if (ps.total < 0) okBurst(g.px, g.py); }
    } else { DK.seenN[cur.id] = true; }
    if (ps.clash) { FX.add({ kind: 'flash', x: g.px + Math.cos(-Math.PI / 2 + ps.clashSite * STEP) * 118 * g.s, y: g.py + Math.sin(-Math.PI / 2 + ps.clashSite * STEP) * 118 * g.s, r: 70, color: '#ef4444', life: 0.7 }); Sound.fail(); }
    updateCtl();
  }
  function dkRotate() {
    const P = curP(), cur = DK[P];
    if (!cur.id) { dkMsg('먼저 후보 화합물을 포켓에 넣어 보세요.'); return; }
    if (P === 'N') { dkMsg('정상 효소 N에는 표적 효소 T에서 찾은 가장 잘 맞는 자세로 넣어요.'); return; }
    cur.rot = (cur.rot + 1) % 5; DK.angT += STEP; Sound.tick(); afterPose(false);
  }
  function dkEject() { const P = curP(); DK[P].id = null; DK.angT = DK.ang = 0; updateCtl(); }
  function dkPickBest() {
    const cur = DK.T;
    if (!cur.id) { dkMsg('결정할 후보를 먼저 포켓에 넣어 보세요.'); return; }
    DK.chosen = cur.id; Sound.success(); okBurst(dkGeom().px, dkGeom().py); updateCtl();
  }

  /* ---------- 그리기: 화합물 · 포켓 ---------- */
  function drawCompound(cx, cy, sc, ang, id, o) {
    o = o || {}; const c = CMPD[id];
    ctx.save(); ctx.translate(cx, cy); ctx.scale(sc, sc); ctx.rotate(ang);
    if (o.alpha != null) ctx.globalAlpha = o.alpha;
    ctx.lineCap = 'round';
    if (c.bulky != null) {
      const a = -Math.PI / 2 + c.bulky * STEP;
      ctx.strokeStyle = '#475569'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * 62, Math.sin(a) * 62); ctx.stroke();
      ctx.beginPath(); ctx.arc(Math.cos(a) * 92, Math.sin(a) * 92, 36, 0, TAU); ctx.fillStyle = 'rgba(148,163,184,.55)'; ctx.fill();
      ctx.strokeStyle = '#475569'; ctx.lineWidth = 8; ctx.stroke();
      ctx.beginPath(); ctx.arc(Math.cos(a) * 92, Math.sin(a) * 92, 15, 0, TAU); ctx.fillStyle = '#f1f5f9'; ctx.fill();
    }
    ctx.strokeStyle = C.shade(c.col, -0.1); ctx.lineWidth = 5;
    for (let j = 0; j < 5; j++) { const a = -Math.PI / 2 + j * STEP; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * 56, Math.sin(a) * 56); ctx.stroke(); }
    D.sphere(0, 0, 22, c.col, { shadow: true });
    ctx.save(); ctx.rotate(-ang); T(0, 7, id, 20, '#fff', 'center', 800); ctx.restore();
    for (let j = 0; j < 5; j++) {
      const a = -Math.PI / 2 + j * STEP, gx = Math.cos(a) * 56, gy = Math.sin(a) * 56, g = c.grp[j];
      if (!g) { ctx.beginPath(); ctx.arc(gx, gy, 5, 0, TAU); ctx.fillStyle = '#e2e8f0'; ctx.fill(); continue; }
      D.sphere(gx, gy, 13, GRP[g].col, { shadow: true });
      ctx.save(); ctx.translate(gx, gy); ctx.rotate(-ang); T(0, 5, GRP[g].ch, 14, '#fff', 'center', 800); ctx.restore();
    }
    ctx.restore();
  }
  function drawPocket(ox, oy, s, P, matched) {
    ctx.save(); ctx.translate(ox, oy); ctx.scale(s, s);
    const wallCol = P === 'T' ? '#94a3b8' : '#b3a79a';
    D.shadow(() => { ctx.beginPath(); ctx.arc(0, 0, 130, 0, TAU); ctx.fillStyle = wallCol; ctx.fill(); }, { blur: 12, y: 4 });
    const gr = ctx.createRadialGradient(-20, -30, 10, 0, 0, 112); gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, '#dbe4ee');
    ctx.beginPath(); ctx.arc(0, 0, 112, 0, TAU); ctx.fillStyle = gr; ctx.fill(); ctx.strokeStyle = '#64748b'; ctx.lineWidth = 3; ctx.stroke();
    SITE.forEach((st, i) => {
      const a = -Math.PI / 2 + i * STEP, ca = Math.cos(a), sa = Math.sin(a);
      const missing = P === 'N' && N_SITES.indexOf(i) < 0;
      if (missing) {
        ctx.beginPath(); ctx.arc(ca * 106, sa * 106, 22, 0, TAU); ctx.fillStyle = wallCol; ctx.fill(); ctx.strokeStyle = '#64748b'; ctx.lineWidth = 3; ctx.stroke();
        T(ca * 106, sa * 106 + 6, '✕', 17, '#f8fafc', 'center', 800);
      } else {
        if (matched && matched.indexOf(i) >= 0) D.glow(ca * 96, sa * 96, 34, '#22c55e', 0.7);
        D.sphere(ca * 96, sa * 96, 17, C.mix('#ffffff', GRP[st.kind].col, 0.55), { outline: GRP[st.kind].col, outlineWidth: 2.5, gloss: false });
        T(ca * 96, sa * 96 + 5.5, GRP[st.kind].ch, 15, C.shade(GRP[st.kind].col, -0.35), 'center', 800);
      }
      T(ca * 122, sa * 122 + 4.5, st.n, 13, '#1e293b', 'center', 800, { stroke: '#e2e8f0', strokeWidth: 3 });
    });
    ctx.restore();
  }
  function drawScoreBox(r, ps, P) {
    panel(r.x, r.y, r.w, r.h, 14);
    T(r.x + 14, r.y + 24, (P === 'T' ? '표적 효소 T' : '정상 효소 N') + ' 결합 점수 (작을수록 잘 결합)', PHONE ? 13 : 14, '#475569', 'left', 800);
    if (!ps) {
      textBlock(r.x + 14, r.y + (PHONE ? 48 : 56), r.w - 28, P === 'T' ? '아래 후보를 눌러(또는 끌어서) 포켓에 넣어 보세요.' : '아래 후보를 눌러 같은 자세로 정상 효소 N에 넣어 보세요.', PHONE ? 14 : 15, '#64748b', 22, 700);
      return;
    }
    const v = Math.round(DK.score * 10) / 10;
    T(r.x + 14, r.y + (PHONE ? 68 : 76), fmtS(v), PHONE ? 38 : 44, v < -0.04 ? '#15803d' : v > 0.04 ? '#dc2626' : '#475569', 'left', 800);
    const parts2 = breakdown(ps);
    let cx = r.x + (PHONE ? 112 : 128), cy = r.y + (PHONE ? 44 : 50);
    if (!parts2.length) T(cx, cy + 14, '맞는 짝이 없어요 (0.0)', 14, '#64748b', 'left', 800);
    parts2.forEach((q) => {
      const txt = q[0] + ' ' + fmtS(q[1]);
      ctx.save(); ctx.font = D.font(PHONE ? 12.5 : 13, 800); const w = ctx.measureText(txt).width + 16; ctx.restore();
      if (cx + w > r.x + r.w - 6) { cx = r.x + (PHONE ? 112 : 128); cy += 28; }
      pill(cx, cy, txt, { bg: C.rgba(q[2], 0.14), color: C.shade(q[2], -0.3), border: q[2], size: PHONE ? 12.5 : 13, align: 'left', pad: 8 });
      cx += w + 6;
    });
  }
  function drawRank(r) {
    panel(r.x, r.y, r.w, r.h, 14);
    T(r.x + 14, r.y + 22, '후보별 최고 점수 (내가 찾은 자세)', PHONE ? 13 : 14, '#475569', 'left', 800);
    const lx = r.x + 14, bx = r.x + (PHONE ? 70 : 82), bw = r.w - (PHONE ? 70 : 82) - (PHONE ? 62 : 70);
    const z = bx + bw * 6 / 8;                      // 점수 0 의 위치 (범위 −6 ~ +2)
    const hy = r.y + (PHONE ? 38 : 44), rowH = (r.h - (hy - r.y) - 8) / 6;
    [-6, -4, -2, 0, 2].forEach((tk) => { const x = bx + bw * (tk + 6) / 8; ctx.strokeStyle = tk === 0 ? '#64748b' : '#e2e8f0'; ctx.lineWidth = tk === 0 ? 2 : 1; ctx.beginPath(); ctx.moveTo(x, hy - 4); ctx.lineTo(x, r.y + r.h - 6); ctx.stroke(); T(x, hy - 8, tk > 0 ? '+' + tk : tk < 0 ? MINUS + Math.abs(tk) : '0', 12, '#94a3b8', 'center', 700); });
    IDS_T.forEach((id, i) => {
      const y = hy + i * rowH, v = DK.best[id], c = CMPD[id];
      T(lx, y + rowH * 0.62, '후보 ' + id, PHONE ? 13 : 14.5, C.shade(c.col, -0.2), 'left', 800);
      if (v == null) { T(bx + 6, y + rowH * 0.62, '아직 안 맞춰 봤어요', 12.5, '#94a3b8', 'left', 700); return; }
      const h = Math.min(rowH - 6, 22);
      DK._bar = DK._bar || {}; DK._bar[id] = RM ? v : approach(DK._bar[id] == null ? 0 : DK._bar[id], v, FDT, 8);
      const vv = DK._bar[id], xx = bx + bw * (clamp(vv, -6, 2) + 6) / 8;
      D.roundRect(Math.min(z, xx), y + (rowH - h) / 2, Math.max(1, Math.abs(xx - z)), h, 5); ctx.fillStyle = v <= 0 ? C.rgba(c.col, 0.85) : '#ef4444'; ctx.fill();
      T(r.x + r.w - 10, y + rowH * 0.62, fmtS(v), PHONE ? 13 : 14.5, v < 0 ? '#15803d' : '#dc2626', 'right', 800);
      if (DK.chosen === id) T(r.x + (PHONE ? 52 : 60), y + rowH * 0.62, '★', 15, '#f59e0b', 'center', 800);
    });
  }
  function drawSelTable(r) {
    panel(r.x, r.y, r.w, r.h, 14);
    T(r.x + 14, r.y + 22, '선택성 비교 (같은 자세로 T 와 N 에 넣은 점수)', PHONE ? 12.5 : 14, '#475569', 'left', 800);
    const hy = r.y + (PHONE ? 38 : 44), rowH = (r.h - (hy - r.y) - 10) / 3;
    const lx = r.x + 14, bx = r.x + (PHONE ? 66 : 82), bw = r.w - (PHONE ? 66 : 82) - (PHONE ? 126 : 150);
    [-6, -4, -2, 0].forEach((tk) => { const x = bx + bw * (tk + 6) / 6; ctx.strokeStyle = tk === 0 ? '#64748b' : '#e2e8f0'; ctx.lineWidth = tk === 0 ? 2 : 1; ctx.beginPath(); ctx.moveTo(x, hy - 4); ctx.lineTo(x, r.y + r.h - 8); ctx.stroke(); T(x, hy - 8, tk === 0 ? '0' : MINUS + Math.abs(tk), 12, '#94a3b8', 'center', 700); });
    IDS_N.forEach((id, i) => {
      const y = hy + i * rowH, c = CMPD[id];
      T(lx, y + rowH * 0.55, '후보 ' + id, PHONE ? 13 : 14.5, C.shade(c.col, -0.2), 'left', 800);
      const tv = DK.best[id], seen = DK.seenN[id];
      if (tv == null) { T(bx + 4, y + rowH * 0.58, '먼저 표적 효소 T에 맞춰 봐요', 12.5, '#94a3b8', 'left', 700); return; }
      const nv = pose(id, DK.bestRot[id], 'N').total, bh = Math.min(16, rowH / 2 - 4), z = bx + bw;
      const xT = bx + bw * (clamp(tv, -6, 0) + 6) / 6;
      D.roundRect(xT, y + 4, Math.max(1, z - xT), bh, 4); ctx.fillStyle = '#16a34a'; ctx.fill();
      T(xT - 4, y + 4 + bh - 3, 'T', 12.5, '#166534', 'right', 800);
      if (seen) {
        const xN = bx + bw * (clamp(nv, -6, 0) + 6) / 6;
        D.roundRect(xN, y + 8 + bh, Math.max(1, z - xN), bh, 4); ctx.fillStyle = '#f59e0b'; ctx.fill();
        T(xN - 4, y + 8 + bh + bh - 3, 'N', 12.5, '#92400e', 'right', 800);
        const sel = Math.round((tv - nv) * 10) / 10;
        T(r.x + r.w - 8, y + rowH * 0.42, 'T ' + fmtS(tv) + ' · N ' + fmtS(nv), PHONE ? 12.5 : 13.5, '#334155', 'right', 800);
        T(r.x + r.w - 8, y + rowH * 0.8, '선택성 ' + fmtS(sel) + (sel === 0 ? ' ⚠' : ''), PHONE ? 12.5 : 13.5, sel === 0 ? '#b91c1c' : '#15803d', 'right', 800);
      } else T(bx + 4, y + 8 + bh + bh - 3, 'N 에 넣어 보세요', 12.5, '#94a3b8', 'left', 700);
    });
  }
  function drawToken(r, id, o) {
    o = o || {};
    const c = CMPD[id], docked = DK[curP()].id === id;
    D.shadow(() => { D.roundRect(r.x, r.y, r.w, r.h, 12); ctx.fillStyle = o.locked ? '#f1f5f9' : docked ? '#eef2ff' : '#fff'; ctx.fill(); }, { blur: 5, y: 2 });
    ctx.strokeStyle = docked ? '#6366f1' : o.locked ? '#cbd5e1' : C.shade(c.col, 0.1); ctx.lineWidth = docked ? 3 : 2; D.roundRect(r.x, r.y, r.w, r.h, 12); ctx.stroke();
    const sc = Math.min((r.h - (PHONE ? 22 : 34)) / 190, (r.w - 8) / 180);
    drawCompound(r.x + r.w / 2, r.y + (r.h - (PHONE ? 20 : 30)) / 2 + 2, sc, 0, id, { alpha: o.locked ? 0.35 : docked ? 0.35 : 1 });
    const v = DK.best[id];
    TF(r.x + r.w / 2, r.y + r.h - (PHONE ? 6 : 10), o.locked ? '🔒 T 먼저' : '후보 ' + id + (v != null ? '  ' + fmtS(v) : ''), r.w - 6, PHONE ? 12.5 : 14, 10.5, '#334155', 'center', 800);
  }
  function dockScene(dt, t) {
    const P = curP(), cur = DK[P], g = dkGeom(), isN = P === 'N';
    DK.hits = []; DK.msgT = Math.max(0, DK.msgT - dt);
    DK.ang = RM ? DK.angT : approach(DK.ang, DK.angT, dt, 12);
    DK.cx = approach(DK.cx, g.px, dt, 10); DK.cy = approach(DK.cy, g.py, dt, 10); DK.csc = approach(DK.csc, 1, dt, 10);
    const ps = cur.id ? pose(cur.id, cur.rot, P) : null;
    DK.score = approach(DK.score, ps ? ps.total : 0, dt, 9);
    T(14, 28, isN ? '정상 효소 N 의 결합 포켓 (P1 · P3 · P4 만 있어요)' : '표적 효소 T 의 결합 포켓 (자리 5곳)', PHONE ? 14 : 16.5, '#334155', 'left', 800);
    drawPocket(g.px, g.py, g.s, P, ps ? ps.pairs.map((q) => q.site) : null);
    const dragOut = DK.drag && DK.drag.from === 'dock' && DK.drag.moved;
    if (cur.id && !dragOut) {
      drawCompound(DK.cx, DK.cy, g.s * DK.csc, DK.ang, cur.id);
      ps.pairs.forEach((q) => {
        const a = -Math.PI / 2 + q.site * STEP, ca = Math.cos(a), sa = Math.sin(a);
        ctx.save(); ctx.translate(g.px, g.py); ctx.scale(g.s, g.s); ctx.strokeStyle = '#16a34a'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(ca * 70, sa * 70); ctx.lineTo(ca * 80, sa * 80); ctx.stroke(); ctx.restore();
        pill(g.px + ca * 150 * g.s, g.py + sa * 150 * g.s, fmtS(q.val), { bg: '#16a34a', color: '#fff', size: 13, pad: 7 });
      });
      if (ps.clash) {
        const a = -Math.PI / 2 + ps.clashSite * STEP;
        D.glow(g.px + Math.cos(a) * 120 * g.s, g.py + Math.sin(a) * 120 * g.s, 52 * g.s, '#ef4444', 0.55 + 0.25 * Math.sin(t * 6));
        pill(clamp(g.px + Math.cos(a) * 160 * g.s, 66, PHONE ? 412 : 318), g.py + Math.sin(a) * 160 * g.s, '입체 충돌 +3.0', { bg: '#dc2626', color: '#fff', size: 13, pad: 7 });
      }
    }
    if (!PHONE) {
      TF(14, 388, '자리  P1 음전하 · P2 양전하 · P3 소수성', 350, 12.5, 10.5, '#64748b', 'left', 700);
      TF(14, 404, 'P4 수소 결합 받개 · P5 수소 결합 주개', 350, 12.5, 10.5, '#64748b', 'left', 700);
      TF(14, 420, '기  + 양전하 · ' + MINUS + ' 음전하 · 소 소수성 · 주 주개 · 받 받개', 350, 12.5, 10.5, '#64748b', 'left', 700);
    }
    drawScoreBox(g.score, ps, P);
    if (isN) drawSelTable(g.rank); else drawRank(g.rank);
    // 후보 쟁반
    const ids = isN ? IDS_N : IDS_T;
    T(14, g.tray.y - 6, '후보 화합물 (눌러서 넣거나 포켓으로 끌어요)', PHONE ? 12 : 13.5, '#64748b', 'left', 800);
    trayRects(ids).forEach((r) => { const locked = isN && DK.best[r.id] == null; drawToken(r, r.id, { locked }); DK.hits.push(Object.assign({ kind: 'tok', locked }, r)); });
    FX.draw();
    if (DK.drag && DK.drag.moved) drawCompound(DK.drag.x, DK.drag.y, g.s * 0.9, DK.drag.from === 'dock' ? DK.ang : 0, DK.drag.id, { alpha: 0.95 });
    if (DK.msgT > 0) TF(14, 52, DK.msg, VW - 28, 14.5, 11.5, '#b91c1c', 'left', 800, { stroke: '#fff', strokeWidth: 4 });
  }
  const dockPT = {
    down(p) {
      const g = dkGeom(), cur = DK[curP()];
      for (const r of DK.hits) if (inRect(p.x, p.y, r)) {
        if (r.locked) { dkMsg('먼저 표적 효소 T에서 이 후보를 맞춰 보세요.'); Sound.fail(); return false; }
        DK.drag = { id: r.id, from: 'tray', x: p.x, y: p.y, sx: p.x, sy: p.y, moved: false, tr: r }; return true;
      }
      if (cur.id && Math.hypot(p.x - g.px, p.y - g.py) < 84 * g.s) { DK.drag = { id: cur.id, from: 'dock', x: p.x, y: p.y, sx: p.x, sy: p.y, moved: false }; return true; }
      return false;
    },
    move(p) { const d = DK.drag; if (!d) return; d.x = p.x; d.y = p.y; if (Math.hypot(p.x - d.sx, p.y - d.sy) > 8) d.moved = true; },
    up(p) {
      const d = DK.drag; DK.drag = null; if (!d) return;
      const g = dkGeom(), inPocket = Math.hypot(p.x - g.px, p.y - g.py) < 132 * g.s;
      if (d.from === 'tray') {
        if (!d.moved) dockIn(d.id, d.tr.x + d.tr.w / 2, d.tr.y + d.tr.h / 2);
        else if (inPocket) dockIn(d.id, p.x, p.y);
      } else if (!d.moved) dkRotate();
      else if (!inPocket) dkEject();
    },
    hover(p) {
      const g = dkGeom(), cur = DK[curP()];
      if (DK.hits.some((r) => inRect(p.x, p.y, r))) return 'grab';
      return cur.id && Math.hypot(p.x - g.px, p.y - g.py) < 84 * g.s ? 'pointer' : 'default';
    },
  };

  /* =========================================================
     ② IC50: 억제율–농도 곡선 (로그 눈금)
     ========================================================= */
  const IC = { B: 0.1, D: 1, A: 3 }, IC_IDS = ['B', 'D', 'A'];
  const CONC = [0.01, 0.03, 0.1, 0.3, 1, 3, 10, 30, 100];
  const IC_S = { idx: 4, prog: 0 };
  const inhib = (ic, c) => 100 / (1 + ic / c);
  function icGeom() {
    if (PHONE) return { plot: { x: 58, y: 70, w: 408, h: 240 }, side: { x: 8, y: 372, w: 464, h: 190 } };
    return { plot: { x: 82, y: 62, w: 450, h: 300 }, side: { x: 566, y: 46, w: 226, h: 360 } };
  }
  function icScene(dt, t) {
    const g = icGeom(), pl = g.plot;
    IC_S.prog = RM ? 1 : Math.min(1, IC_S.prog + dt / 1.4);
    const xOf = (c) => pl.x + (Math.log10(c) + 2) / 4 * pl.w, yOf = (v) => pl.y + pl.h * (1 - v / 100);
    T(14, 28, '억제율–농도 곡선: 후보 B · D · A (가상 자료)', PHONE ? 14 : 16.5, '#334155', 'left', 800);
    panel(pl.x - 44, pl.y - 18, pl.w + 62, pl.h + 62, 14);
    for (let k = 0; k <= 4; k++) { const v = k * 25, y = yOf(v); ctx.strokeStyle = v === 50 ? '#cbd5e1' : '#eef2f7'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pl.x, y); ctx.lineTo(pl.x + pl.w, y); ctx.stroke(); T(pl.x - 8, y + 4.5, String(v), 12.5, '#64748b', 'right', 700); }
    for (let d = -2; d <= 2; d++) { const x = xOf(Math.pow(10, d)); ctx.strokeStyle = '#eef2f7'; ctx.beginPath(); ctx.moveTo(x, pl.y); ctx.lineTo(x, pl.y + pl.h); ctx.stroke(); T(x, pl.y + pl.h + 18, d >= 0 ? String(Math.pow(10, d)) : (d === -1 ? '0.1' : '0.01'), 12.5, '#64748b', 'center', 700); }
    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(pl.x, pl.y); ctx.lineTo(pl.x, pl.y + pl.h); ctx.lineTo(pl.x + pl.w, pl.y + pl.h); ctx.stroke();
    T(pl.x + pl.w / 2, pl.y + pl.h + 38, '농도 (µM, 로그 눈금)', 13, '#475569', 'center', 800);
    ctx.save(); ctx.translate(pl.x - 34, pl.y + pl.h / 2); ctx.rotate(-Math.PI / 2); T(0, 0, '억제율 (%)', 13, '#475569', 'center', 800); ctx.restore();
    T(pl.x + pl.w + 4, yOf(50) + 4, '50', 12, '#94a3b8', 'left', 700);
    // 곡선 draw
    IC_IDS.forEach((id) => {
      const col = CMPD[id].col, N = 120, upto = Math.floor(N * IC_S.prog);
      ctx.strokeStyle = col; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath();
      for (let i = 0; i <= upto; i++) { const c = Math.pow(10, -2 + 4 * i / N), x = xOf(c), y = yOf(inhib(IC[id], c)); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
      ctx.stroke();
      if (IC_S.prog > 0.92) {
        const x = xOf(IC[id]);
        ctx.setLineDash([5, 4]); ctx.strokeStyle = C.rgba(col, 0.8); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, yOf(50)); ctx.lineTo(x, pl.y + pl.h); ctx.stroke(); ctx.setLineDash([]);
        D.sphere(x, yOf(50), 6, col, { gloss: false, outline: '#fff', outlineWidth: 2 });
      }
    });
    // 커서
    const c = CONC[IC_S.idx], cx = xOf(c);
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 2; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(cx, pl.y); ctx.lineTo(cx, pl.y + pl.h); ctx.stroke(); ctx.setLineDash([]);
    IC_IDS.forEach((id) => { D.sphere(cx, yOf(inhib(IC[id], c)), 7, CMPD[id].col, { outline: '#fff', outlineWidth: 2 }); });
    if (IC_S.prog > 0.92) IC_IDS.forEach((id) => { pill(xOf(IC[id]), pl.y + pl.h - 16, String(IC[id]), { bg: CMPD[id].col, color: '#fff', size: 12.5, pad: 6 }); });
    pill(cx, pl.y - 6, c + ' µM', { bg: '#334155', color: '#fff', size: 13, pad: 7 });
    // 옆 패널
    const q = g.side; panel(q.x, q.y, q.w, q.h, 14);
    T(q.x + 14, q.y + 26, '농도 ' + c + ' µM 에서', 15, '#334155', 'left', 800);
    IC_IDS.forEach((id, i) => {
      const y = q.y + 44 + i * (PHONE ? 46 : 70), v = Math.round(inhib(IC[id], c));
      T(q.x + 14, y + 16, '후보 ' + id, 14.5, C.shade(CMPD[id].col, -0.2), 'left', 800);
      T(q.x + q.w - 14, y + 16, '억제율 ' + v + ' %', 14.5, '#334155', 'right', 800);
      D.roundRect(q.x + 14, y + 24, q.w - 28, 12, 6); ctx.fillStyle = '#e2e8f0'; ctx.fill();
      D.roundRect(q.x + 14, y + 24, Math.max(0, (q.w - 28) * v / 100), 12, 6); ctx.fillStyle = CMPD[id].col; ctx.fill();
      T(q.x + 14, y + (PHONE ? 54 : 56), 'IC50 = ' + IC[id] + ' µM', 12.5, '#64748b', 'left', 700);
    });
    if (!PHONE) textBlock(q.x + 14, q.y + 272, q.w - 28, 'IC50 이 작을수록 적은 양으로 절반을 억제하는 강한 후보예요.', 13, '#475569', 19, 700);
  }

  let FDT = 0;

  /* =========================================================
     ③ 활용 사례: 사례 7곳 → 분야 · 관련 직업
     ========================================================= */
  const JOBS = [
    { id: 'j1', name: '바이오 의약품 개발자' }, { id: 'j2', name: '식품 연구개발자' }, { id: 'j3', name: '농업 생명공학 연구원' },
    { id: 'j4', name: '환경 생명공학 연구원' }, { id: 'j5', name: '바이오 에너지 연구원' }, { id: 'j6', name: '단백질 공학 연구원' }, { id: 'j7', name: 'DNA 감식(법과학) 분석가' },
  ];
  const JNAME = (id) => (JOBS.find((j) => j.id === id) || {}).name || '';
  const CASES = [
    { id: 'med', icon: '🏥', sec: '의료', text: '질병 표적에 작용하는 의약품과 감염병 진단 키트 개발', field: 'pharm', job: 'j1' },
    { id: 'food', icon: '🍞', sec: '식품', text: '발효 균주를 골라 맛과 안전성을 높인 김치 · 치즈', field: 'agri', job: 'j2' },
    { id: 'agri', icon: '🌾', sec: '농업', text: '병해충에 강하도록 유전자를 도입해 개량한 작물', field: 'agri', job: 'j3' },
    { id: 'env', icon: '🌊', sec: '환경', text: '미생물로 기름 오염 물질을 분해해 정화', field: 'env', job: 'j4' },
    { id: 'energy', icon: '⛽', sec: '에너지', text: '미생물에 대사 경로를 새로 설계해 바이오 연료를 생산', field: 'syn', job: 'j5' },
    { id: 'ind', icon: '🧺', sec: '산업', text: '찬물에서도 때가 잘 빠지도록 개량한 세제용 효소', field: 'prot', job: 'j6' },
    { id: 'crime', icon: '🔎', sec: '수사', text: '현장 시료의 STR(짧은 반복 서열) 분석으로 DNA 지문 비교', field: 'gene', job: 'j7' },
  ];
  const CS = { sel: 0, pick: CASES.map(() => ({ f: '', j: '' })), res: CASES.map(() => null), hits: [], shake: CASES.map(() => 0) };
  const csGood = (i) => CS.pick[i].f === CASES[i].field && CS.pick[i].j === CASES[i].job;
  const csDone = () => CS.pick.filter((p) => p.f && p.j).length;
  function csSelect(i) { CS.sel = i; Sound.tick(); updateCtl(); }
  function csGeom(i) {
    if (PHONE) return { x: 8, y: 40 + i * 83, w: 464, h: 78 };
    return { x: 10, y: 40 + i * 63, w: 780, h: 58 };
  }
  function casesScene(dt, t) {
    T(14, 28, '사례마다 알맞은 분야와 관련 직업을 연결해요', PHONE ? 14.5 : 16.5, '#334155', 'left', 800);
    CS.hits = [];
    CASES.forEach((c, i) => {
      const r = csGeom(i), p = CS.pick[i], sel = CS.sel === i, res = CS.res[i];
      CS.shake[i] = Math.max(0, CS.shake[i] - dt * 3);
      const sh = CS.shake[i] > 0 && !RM ? Math.sin(clock * 60) * 3 * CS.shake[i] : 0;
      ctx.save(); ctx.translate(sh, 0);
      D.shadow(() => { D.roundRect(r.x, r.y, r.w, r.h, 12); ctx.fillStyle = res === 'ok' ? '#effaf1' : res === 'bad' ? '#fdeceb' : sel ? '#fff8dc' : '#fff'; ctx.fill(); }, { blur: sel ? 10 : 5, y: 2 });
      ctx.strokeStyle = res === 'ok' ? '#16a34a' : res === 'bad' ? '#e2464b' : sel ? '#f59e0b' : '#cbd5e1'; ctx.lineWidth = sel || res ? 3 : 2; D.roundRect(r.x, r.y, r.w, r.h, 12); ctx.stroke();
      E(c.icon, r.x + 26, r.y + (PHONE ? 26 : r.h / 2), 26);
      const tx = r.x + 52;
      if (PHONE) {
        pill(tx, r.y + 16, c.sec, { bg: '#16a34a', color: '#fff', size: 12.5, align: 'left', pad: 8 });
        textBlock(tx + 58, r.y + 21, r.w - 124 - 6, c.text, 13, '#334155', 16, 700);
        const cw = (r.w - 16 - 6) / 2;
        [[p.f ? FNAME(p.f) : '분야 고르기', !!p.f, r.x + 8], [p.j ? JNAME(p.j) : '직업 고르기', !!p.j, r.x + 8 + cw + 6]].forEach(([txt, has, x]) => {
          D.roundRect(x, r.y + 44, cw, 28, 9); ctx.fillStyle = has ? C.rgba('#16a34a', 0.14) : '#f8fafc'; ctx.fill(); ctx.setLineDash(has ? [] : [5, 4]); ctx.strokeStyle = has ? '#16a34a' : '#94a3b8'; ctx.lineWidth = 2; ctx.stroke(); ctx.setLineDash([]);
          TF(x + cw / 2, r.y + 63, txt, cw - 8, 12.5, 10.5, has ? '#14532d' : '#94a3b8', 'center', 800);
        });
      } else {
        pill(tx, r.y + 18, c.sec, { bg: '#16a34a', color: '#fff', size: 13, align: 'left', pad: 8 });
        textBlock(tx, r.y + 40, 360, c.text, 13.5, '#334155', 17, 700);
        [[p.f ? FNAME(p.f) : '분야 고르기', !!p.f, 450, 150], [p.j ? JNAME(p.j) : '직업 고르기', !!p.j, 608, 172]].forEach(([txt, has, x, w]) => {
          D.roundRect(x, r.y + 11, w, 36, 10); ctx.fillStyle = has ? C.rgba('#16a34a', 0.14) : '#f8fafc'; ctx.fill(); ctx.setLineDash(has ? [] : [5, 4]); ctx.strokeStyle = has ? '#16a34a' : '#94a3b8'; ctx.lineWidth = 2; ctx.stroke(); ctx.setLineDash([]);
          TF(x + w / 2, r.y + 34, txt, w - 10, 13.5, 10.5, has ? '#14532d' : '#94a3b8', 'center', 800);
        });
        T(448 - 14, r.y + 34, '→', 18, '#94a3b8', 'center', 800);
      }
      ctx.restore();
      CS.hits.push({ i, x: r.x, y: r.y, w: r.w, h: r.h });
    });
    FX.draw();
  }
  const casesPT = {
    down(p) { for (const r of CS.hits) if (inRect(p.x, p.y, r)) { csSelect(r.i); return false; } return false; },
    hover(p) { return CS.hits.some((r) => inRect(p.x, p.y, r)) ? 'pointer' : 'default'; },
  };

  /* =========================================================
     ④ 설명 자료: 주제 · 매체 · 필수 요소 5개 (정확한 설명을 골라요)
     ========================================================= */
  const MEDIA = [['info', '인포그래픽', '구성', '#0ea5e9'], ['cards', '카드뉴스', '카드', '#ec4899'], ['poster', '포스터', '섹션', '#f59e0b'], ['storyboard', '영상 콘티', '컷', '#8b5cf6']];
  const ENAMES = ['분야 정의', '원리 한 줄', '생활 사례', '사회적 영향', '관련 직업·진로'];
  /* 각 칸: [정확한 설명, 틀린 설명 1, 틀린 설명 2] — 정확한 설명이 놓이는 번호는 주제마다 달라요 */
  const TOPICS = {
    env: {
      name: '환경 생명공학 · 미생물 오염 정화', col: '#14b8a6',
      el: [
        ['환경 생명공학은 생물의 능력을 이용해 오염을 줄이고 자원을 되살리는 방법을 연구하는 분야예요.', '환경 생명공학은 오염 물질을 모두 완전히 없애는 기계를 만드는 분야예요.', '환경 생명공학은 생물을 쓰지 않고 화학 약품만으로 환경을 정화하는 분야예요.'],
        ['오염 물질을 에너지원이나 재료로 분해 · 변환하는 미생물의 물질대사 능력을 이용해요.', '오염 물질은 어떤 미생물도 분해할 수 없으므로 미생물의 개체 수를 늘려 가려요.', '미생물이 오염 물질을 분해하면 항상 그 자리에서 즉시 모두 사라져요.'],
        ['기름에 오염된 해안에서 기름을 분해하는 미생물을 활용하는 정화 방법이 연구 · 활용돼요.', '정화에 쓰이는 미생물은 어떤 환경에서도 똑같이 잘 자라서 조건을 살필 필요가 없어요.', '이 기술은 이미 모든 오염 문제를 100 % 해결했어요.'],
        ['화학적 처리보다 환경 부담이 적을 수 있지만 오염 종류 · 온도 · 양분에 따라 효과가 달라서, 한계와 생태계 영향을 함께 점검해야 해요.', '부작용이 전혀 없으므로 따로 점검하지 않아도 돼요.', '효과가 없어서 사회에 아무 영향도 주지 않아요.'],
        ['환경 생명공학 연구원, 환경 미생물 연구원, 환경 영향 평가 전문가 등이 있어요.', '관련 직업이 없어서 대학 연구실에서만 다뤄요.', '법과학 분석가만 이 분야의 직업이에요.'],
      ],
    },
    ind: {
      name: '단백질 공학 · 세제용 효소 개량', col: '#f59e0b',
      el: [
        ['단백질 공학은 단백질의 구조와 기능을 이해하고, 아미노산 서열을 바꿔 더 좋은 기능을 갖게 하는 분야예요.', '단백질 공학은 단백질을 먹어서 몸에 쌓이게 하는 방법을 연구하는 분야예요.', '단백질 공학은 DNA를 쓰지 않고 단백질만 새로 만들어 내는 분야예요.'],
        ['효소 유전자의 염기 서열을 바꾸면 아미노산 서열과 입체 구조가 달라져, 낮은 온도에서의 활성 같은 성질이 달라질 수 있어요.', '효소의 염기 서열을 바꾸어도 효소의 성질은 항상 그대로예요.', '효소를 끓이면 활성이 더 좋아져서 서열을 바꿀 필요가 없어요.'],
        ['찬물에서도 단백질 때를 잘 분해하도록 개량한 세제용 효소가 산업에 쓰여요.', '세제용 효소는 모든 온도와 모든 때에 똑같이 작용해요.', '세제에 들어 있는 효소는 지방과 단백질을 만들어 옷에 붙여요.'],
        ['세탁 온도를 낮춰 에너지를 줄일 수 있지만, 효소의 안전성과 환경에 미치는 영향도 평가해야 해요.', '효소는 자연 물질이므로 어떤 평가도 필요 없어요.', '세제용 효소는 사회와 환경에 관계가 없어요.'],
        ['단백질 공학 연구원, 효소 개발 연구원, 품질 · 규제 전문가 등이 있어요.', '이 분야에는 연구 직업이 없고 판매 직업만 있어요.', '식품 연구개발자만 효소를 다뤄요.'],
      ],
    },
    drug: {
      name: '의약 · 약학 · 표적 단백질 신약 개발', col: '#ef4444',
      el: [
        ['의약 · 약학은 질병의 원인과 표적을 이해하고, 안전하고 효과 있는 약을 설계 · 시험 · 평가하는 분야예요.', '의약 · 약학은 질병을 일으키는 생물을 직접 길러 퍼뜨리는 분야예요.', '의약 · 약학은 임상 시험 없이 약을 만드는 분야예요.'],
        ['표적 단백질의 결합 포켓에 잘 맞는 화합물을 찾으면 단백질의 기능을 억제하거나 조절할 수 있어요. 정상 단백질에는 덜 붙는 선택성도 중요해요.', '결합 점수가 낮으면 반드시 안전한 약이 되므로 다른 시험은 필요 없어요.', '화합물은 단백질에 결합하지 않아도 같은 효과를 내요.'],
        ['표적 단백질과 후보 화합물의 결합을 컴퓨터로 먼저 평가해 후보를 줄이는 방식이 신약 개발에 활용돼요.', '컴퓨터로 평가하면 실험이 전혀 필요 없어요.', '후보 화합물은 모두 같은 점수가 나와요.'],
        ['개발 기간과 비용을 줄이는 데 도움이 될 수 있지만, 선택성 · 독성 · 몸속 흡수를 시험으로 확인해야 하고 승인 절차도 거쳐요.', '결합이 강하면 곧바로 약으로 쓸 수 있어 시험이 필요 없어요.', '약 개발은 사회와 관계가 없는 순수한 계산이에요.'],
        ['생명정보 분석가, 바이오 의약품 개발자, 품질 · 규제 전문가 등이 있어요.', '생명윤리 전문가나 유전 상담사는 이 분야와 전혀 관련이 없어요.', '약학 분야에는 컴퓨터를 다루는 직업이 없어요.'],
      ],
    },
  };
  const TKEYS = ['env', 'ind', 'drug'];
  /* 정답 위치: (주제 번호 + 칸 번호) % 3 */
  function mdOptions(tk, ei) { const ti = TKEYS.indexOf(tk), ans = (ti + ei) % 3, arr = TOPICS[tk].el[ei], out = []; let b = 1; for (let k = 0; k < 3; k++) out.push(k === ans ? arr[0] : arr[b++]); return { opts: out, ans }; }
  const MD = { topic: null, medium: null, pick: new Array(5).fill(-1), slot: 0, flags: { src: false, lim: false }, checked: false, res: new Array(5).fill(null), slotRects: [] };
  function mdTopic(k) { if (MD.topic === k) return; MD.topic = k; MD.pick = new Array(5).fill(-1); MD.checked = false; MD.res = new Array(5).fill(null); Sound.click(); updateCtl(); }
  function mdMedium(k) { MD.medium = k; MD.checked = false; Sound.click(); updateCtl(); }
  function mdPick(i, o) { MD.pick[i] = o; MD.checked = false; MD.res[i] = null; Sound.tick(); updateCtl(); }
  function mdCheck() {
    MD.checked = true; let ok = 0;
    MD.res = MD.pick.map((p, i) => (p < 0 || !MD.topic ? 'empty' : p === mdOptions(MD.topic, i).ans ? 'ok' : 'bad'));
    MD.res.forEach((r) => { if (r === 'ok') ok++; });
    if (ok === 5) Sound.success(); else Sound.fail();
    updateCtl();
  }
  function mdReset() { MD.pick = new Array(5).fill(-1); MD.checked = false; MD.res = new Array(5).fill(null); MD.slot = 0; updateCtl(); }
  function mdSlotRect(i) {
    if (PHONE) return { x: 8, y: 66 + i * 90, w: 464, h: 84 };
    return { x: 10 + (i % 2) * 396, y: 74 + Math.floor(i / 2) * 140, w: 384, h: 132 };
  }
  function mediaScene(dt, t) {
    const m = MD.medium ? MEDIA.find((x) => x[0] === MD.medium) : null, tp = MD.topic ? TOPICS[MD.topic] : null, col = tp ? tp.col : (m ? m[3] : '#94a3b8');
    D.roundRect(8, 8, VW - 16, PHONE ? 46 : 52, 12); ctx.fillStyle = C.rgba(col, 0.16); ctx.fill(); ctx.strokeStyle = col; ctx.lineWidth = 2.5; ctx.stroke();
    TF(VW / 2, PHONE ? 38 : 40, (tp ? tp.name : '먼저 주제를 골라요') + (m ? ' — ' + m[1] : (tp ? ' — 매체를 골라요' : '')), VW - 30, PHONE ? 14.5 : 18, 11.5, C.shade(col, -0.4), 'center', 800);
    MD.slotRects = [];
    ENAMES.forEach((nm, i) => {
      const r = mdSlotRect(i), sel = MD.slot === i, p = MD.pick[i], res = MD.res[i];
      MD.slotRects.push(r);
      D.shadow(() => { D.roundRect(r.x, r.y, r.w, r.h, 14); ctx.fillStyle = res === 'ok' ? '#effaf1' : res === 'bad' ? '#fdeceb' : '#fff'; ctx.fill(); }, { blur: sel ? 10 : 5, y: 2 });
      ctx.strokeStyle = res === 'ok' ? '#16a34a' : res === 'bad' ? '#e2464b' : sel ? col : '#cbd5e1'; ctx.lineWidth = sel || res ? 3 : 2; D.roundRect(r.x, r.y, r.w, r.h, 14); ctx.stroke();
      const pre = m ? m[2] : '칸';
      pill(r.x + 12, r.y + 18, pre + ' ' + (i + 1) + ' · ' + nm, { bg: C.rgba(col, 0.18), color: C.shade(col, -0.4), size: 13, align: 'left' });
      if (res) T(r.x + r.w - 14, r.y + 24, res === 'ok' ? '✅ 정확해요' : res === 'bad' ? '⚠ 다시 확인' : '⬜ 비어 있어요', 13.5, res === 'ok' ? '#16a34a' : res === 'bad' ? '#b91c1c' : '#64748b', 'right', 800);
      if (!tp) T(r.x + 14, r.y + r.h / 2 + 18, '← 주제를 먼저 골라요', 14, '#94a3b8', 'left', 800);
      else if (p < 0) T(r.x + 14, r.y + r.h / 2 + 18, sel ? '← 오른쪽 목록에서 알맞은 설명을 골라요' : '+ 눌러서 설명 고르기', 14, '#94a3b8', 'left', 800);
      else { const o = mdOptions(MD.topic, i).opts[p]; const lines = wrap(o, r.w - 28, PHONE ? 12.5 : 13.5, 700).slice(0, PHONE ? 3 : 5); lines.forEach((l, k) => T(r.x + 14, r.y + 46 + k * (PHONE ? 15.5 : 18), l, PHONE ? 12.5 : 13.5, '#334155', 'left', 700)); }
    });
    // 여섯 번째 칸: 체크리스트
    const r6 = PHONE ? { x: 8, y: 66 + 5 * 90, w: 464, h: 110 } : { x: 10 + 396, y: 74 + 2 * 140, w: 384, h: 132 };
    panel(r6.x, r6.y, r6.w, r6.h, 14);
    T(r6.x + 14, r6.y + 24, '✔ 체크리스트', 15, '#334155', 'left', 800);
    const okN = MD.res.filter((x) => x === 'ok').length;
    const items = [[!!MD.topic, '주제'], [!!m, '매체'], [MD.pick.every((p) => p >= 0), '5칸 채움'], [MD.checked && okN === 5, '모두 정확'], [MD.flags.src, '출처 표시'], [MD.flags.lim, '한계 표시']];
    items.forEach((it, i) => { const x = r6.x + 14 + (i % 3) * (r6.w - 28) / 3, y = r6.y + 52 + Math.floor(i / 3) * (PHONE ? 26 : 30); T(x, y, (it[0] ? '✅ ' : '⬜ ') + it[1], PHONE ? 13 : 14, it[0] ? '#15803d' : '#64748b', 'left', 800); });
    if (MD.checked) TF(r6.x + 14, r6.y + r6.h - 16, okN === 5 ? '내용이 모두 정확해요 🎉' : '점검 결과 ' + okN + ' / 5 정확 — ⚠ · ⬜ 칸을 보완해요', r6.w - 28, 13.5, 11, okN === 5 ? '#15803d' : '#b45309', 'left', 800);
    FX.draw();
  }
  const mediaPT = {
    down(p) { for (let i = 0; i < MD.slotRects.length; i++) if (inRect(p.x, p.y, MD.slotRects[i])) { MD.slot = i; Sound.tick(); updateCtl(); return false; } return false; },
    hover(p) { return MD.slotRects.some((r) => inRect(p.x, p.y, r)) ? 'pointer' : 'default'; },
  };

  /* =========================================================
     화면 전환 · 조작 연결
     ========================================================= */
  const PK = { no: null, ic: null };
  function setMode(m) {
    if (S.mode !== m) S.fade = 1;
    S.mode = m; hideHint();
    if (m === 'ic50') IC_S.prog = 0;
    if (m === 'dock' || m === 'sel') { const g = dkGeom(), cur = DK[curP()]; DK.cx = g.px; DK.cy = g.py; DK.csc = 1; DK.drag = null; DK.angT = DK.ang = cur.rot * STEP; DK.score = cur.id ? pose(cur.id, cur.rot, curP()).total : 0; }
    PT = m === 'map' ? mapPT : m === 'collab' ? collabPT : (m === 'dock' || m === 'sel') ? dockPT : m === 'cases' ? casesPT : m === 'media' ? mediaPT : null;
    updateCtl();
  }
  function mdOptsHTML() {
    if (!MD.topic) return '<p class="ctrl-note">먼저 위에서 주제를 골라요.</p>';
    const e = mdOptions(MD.topic, MD.slot);
    return e.opts.map((o, i) => '<button type="button" class="mc' + (MD.pick[MD.slot] === i ? ' on' : '') + '" data-v="' + i + '">' + o + '</button>').join('');
  }
  function updateCtl() {
    const fr0 = game ? game.free : false, lvNow = game ? game.level : 0;
    ctlNodes.forEach((n) => { n.hidden = (n.dataset.modes || '').split(' ').indexOf(S.mode) < 0; });
    modeBtns(S.mode, lvNow, fr0);
    $('#mpMade').innerHTML = '<li class="' + (MP.so && MP.so.placed === 8 ? 'on' : '') + '">' + mark(MP.so && MP.so.placed === 8) + ' 놓은 카드 ' + (MP.so ? MP.so.placed : 0) + ' / 8</li>';
    $('#coMade').innerHTML = ROLES.map((r) => '<li class="' + (CO.seen[r.id] ? 'on' : '') + '">' + mark(CO.seen[r.id]) + ' ' + r.name + '</li>').join('');
    const isN = S.mode === 'sel';
    $$('#ctrlCard [data-for="dock"]').forEach((n) => { n.hidden = isN; });
    $('#dkHead').textContent = isN ? '⚖️ 같은 자세로 정상 효소에 넣기' : '🧲 후보 화합물 맞추기';
    const P = curP(), cur = DK[P];
    if (isN) {
      $('#dkMade').innerHTML = IDS_N.map((id) => '<li class="' + (DK.seenN[id] ? 'on' : '') + '">' + mark(DK.seenN[id]) + ' 후보 ' + id + (DK.seenN[id] ? ': T ' + fmtS(DK.best[id]) + ' · N ' + fmtS(pose(id, DK.bestRot[id], 'N').total) : '') + '</li>').join('');
      $('#dkNote').innerHTML = '정상 효소 N은 <b>P1 · P3 · P4</b> 자리만 가져요. 표적 효소 T에서 찾은 가장 잘 맞는 자세로 B · D · A를 넣어 점수를 비교해요.';
    } else {
      $('#dkMade').innerHTML = '<li class="' + (triedN() >= 3 ? 'on' : '') + '">' + mark(triedN() >= 3) + ' 맞춰 본 후보 ' + triedN() + ' / 6 (3종 이상)</li><li class="' + (DK.chosen ? 'on' : '') + '">' + mark(!!DK.chosen) + ' 결정한 후보: ' + (DK.chosen ? '후보 ' + DK.chosen : '—') + '</li>' + (cur.id ? '<li>🧩 후보 ' + cur.id + ' · 자세 ' + (cur.rot + 1) + ' / 5</li>' : '');
      $('#dkNote').innerHTML = '기와 자리가 짝이 맞으면 점수가 내려가요. <b>+ ↔ P1 · ' + MINUS + ' ↔ P2 · 소 ↔ P3 · 주 ↔ P4 · 받 ↔ P5</b>. 점수가 <b>낮을수록</b> 잘 결합해요.';
    }
    chipSet($('#pkNo'), PK.no); chipSet($('#pkIC'), PK.ic);
    $('#oConc').textContent = String(CONC[IC_S.idx]);
    // 사례 선택
    const i = CS.sel, c = CASES[i];
    $('#csHead').textContent = c.icon + ' ' + c.sec + ': ' + c.text;
    $('#csField').value = CS.pick[i].f; $('#csJob').value = CS.pick[i].j;
    $('#csMade').innerHTML = '<li class="' + (csDone() === 7 ? 'on' : '') + '">' + mark(csDone() === 7) + ' 연결한 사례 ' + csDone() + ' / 7</li>';
    chipOn($('#mdTopic'), MD.topic); chipOn($('#mdSel'), MD.medium);
    $$('#mdSlots button').forEach((b) => { const k = +b.dataset.v; b.classList.toggle('on', MD.slot === k); b.classList.toggle('seen', MD.pick[k] >= 0); });
    $('#mdSlotT').textContent = (MD.slot + 1) + '번 · ' + ENAMES[MD.slot] + ' — 알맞은 설명을 고르세요';
    const html = mdOptsHTML(); const box = $('#mdOpts');
    if (box.dataset.k !== html) { box.innerHTML = html; box.dataset.k = html; $$('#mdOpts button').forEach((b) => b.addEventListener('click', () => mdPick(MD.slot, +b.dataset.v))); }
    $$('#mdFlags button').forEach((b) => b.classList.toggle('on', !!MD.flags[b.dataset.v]));
  }
  function chipSet(root, val) { $$('button', root).forEach((b) => b.classList.toggle('on', b.dataset.v === val)); }
  bindModes(setMode);
  $('#mpReset').addEventListener('click', () => { Sound.click(); MP.so.reset(); });
  $('#dkRot').addEventListener('click', () => dkRotate());
  $('#dkOut').addEventListener('click', () => { Sound.click(); dkEject(); });
  $('#dkPick').addEventListener('click', () => dkPickBest());
  $$('#pkNo button').forEach((b) => b.addEventListener('click', () => { Sound.click(); PK.no = b.dataset.v; updateCtl(); }));
  $$('#pkIC button').forEach((b) => b.addEventListener('click', () => { Sound.click(); PK.ic = b.dataset.v; updateCtl(); }));
  SciSim.bindRange($('#sConc'), $('#oConc'), (v) => String(CONC[v]), (v) => { IC_S.idx = v; updateCtl(); });
  $('#csField').innerHTML = '<option value="">— 분야 고르기 —</option>' + FIELDS.map((f) => '<option value="' + f.id + '">' + f.name + '</option>').join('');
  $('#csJob').innerHTML = '<option value="">— 직업 고르기 —</option>' + JOBS.map((j) => '<option value="' + j.id + '">' + j.name + '</option>').join('');
  $('#csField').addEventListener('change', (e) => { CS.pick[CS.sel].f = e.target.value; CS.res[CS.sel] = null; Sound.tick(); updateCtl(); });
  $('#csJob').addEventListener('change', (e) => { CS.pick[CS.sel].j = e.target.value; CS.res[CS.sel] = null; Sound.tick(); updateCtl(); });
  $('#csReset').addEventListener('click', () => { Sound.click(); CS.pick = CASES.map(() => ({ f: '', j: '' })); CS.res = CASES.map(() => null); updateCtl(); });
  $$('#mdTopic button').forEach((b) => b.addEventListener('click', () => mdTopic(b.dataset.v)));
  $$('#mdSel button').forEach((b) => b.addEventListener('click', () => mdMedium(b.dataset.v)));
  $$('#mdSlots button').forEach((b) => b.addEventListener('click', () => { Sound.click(); MD.slot = +b.dataset.v; updateCtl(); }));
  $$('#mdFlags button').forEach((b) => b.addEventListener('click', () => { Sound.click(); MD.flags[b.dataset.v] = !MD.flags[b.dataset.v]; updateCtl(); }));
  $('#mdCheck').addEventListener('click', () => { Sound.click(); mdCheck(); });
  $('#mdReset').addEventListener('click', () => { Sound.click(); mdReset(); });
  mpBuild();

  /* =========================================================
     미션
     ========================================================= */
  const levels = [
    {
      title: '생명공학의 분야 지도', short: '분야 지도', icon: '🗺️', phase: '관찰',
      intro: '<p class="si-q">❓ 탐구 질문: 생명공학은 어떤 학문들이 모여 만든 분야이고, 약은 어떻게 설계될까?</p><p>🔗 <b>앞 차시들</b>에서 단일클론항체 · 줄기세포 · 유전자 편집이 난치병 치료에 쓰인 사례를 봤어요. 이런 기술은 한 학문이 혼자 만든 것이 아니라 여러 분야가 힘을 합쳐 만들어요.</p><p>① 생명공학과 관련된 <b>분야 8곳</b>이 각각 어떤 질문을 던지는지 카드를 연결해 보고, ② <b>신약 개발</b> 한 가지에 세 분야가 어떻게 협력하는지 살펴봐요.</p>',
      features: ['map', 'collab'],
      setup() { setMode('map'); },
      recap: '생명공학은 유전공학 · 단백질 공학 · 세포 · 조직 공학 · 생물정보학 · 합성생물학 · 의약 · 약학 · 식품 · 농업 · 환경 등 여러 분야가 융합된 분야이고, 신약 개발에서는 생물정보학 · 단백질 공학 · 약학이 협력해요.',
      summary: '<ul><li><b>관련 분야 8곳</b>: 유전공학 · 분자생물학 / 단백질 공학 / 세포 · 조직 공학 / 생물정보학 / 합성생물학 / 의약 · 약학 / 식품 · 농업 생명공학 / 환경 생명공학.</li><li><b>융합</b>: 신약 개발은 생물정보학(표적 후보 찾기) → 단백질 공학(표적 분석) → 약학(후보 시험 · 승인)의 협력으로 이루어져요.</li><li><b>직업 예</b>: 생명정보 분석가, 단백질 공학 연구원, 바이오 의약품 개발자, 품질 · 규제 전문가, 유전 상담사, 생명윤리 전문가 등.</li></ul>',
      missions: [
        {
          id: 'map', title: '분야–연구 질문 연결', manual: true,
          goal: '<b>연구 질문 카드 8장</b>을 알맞은 분야 칸에 놓고, <b>🤝 신약 개발 팀</b> 화면에서 세 분야를 모두 눌러 보세요.',
          hint: '분야 이름이 힌트예요. 예를 들어 ‘서열 데이터’는 생물정보학, ‘미생물로 오염 정화’는 환경 생명공학과 어울려요. 신약 개발 팀 화면은 위쪽 단추로 바꿔요.',
          setup() { setMode('map'); },
          check() {
            const n = MP.so.placed;
            if (n < 8) { MP.so.markBad([]); return '질문 카드를 모두 칸에 놓아 주세요. (' + n + ' / 8)'; }
            const w = mpWrong();
            if (w.length) { MP.so.markBad(w.map((c) => c.id)); return '\'' + w[0].short + '\' 카드를 다시 생각해 보세요. (' + w.length + '장이 달라요)'; }
            MP.so.markBad([]); MP.so.markOk(MP.so.cards.map((c) => c.id));
            const k = ROLES.filter((r) => CO.seen[r.id]).length;
            if (k < 3) return '🤝 신약 개발 팀 화면에서 세 분야를 모두 눌러 보세요. (' + k + ' / 3)';
            return true;
          },
          status: () => mark(MP.so.placed === 8) + ' 카드 ' + MP.so.placed + ' / 8 &nbsp; ' + mark(ROLES.every((r) => CO.seen[r.id])) + ' 신약 개발 팀 ' + ROLES.filter((r) => CO.seen[r.id]).length + ' / 3',
          explain: '유전자를 다루는 것은 <b>유전공학 · 분자생물학</b>, 단백질 구조 개량은 <b>단백질 공학</b>, 세포 배양과 조직 대체는 <b>세포 · 조직 공학</b>, 서열 데이터 분석은 <b>생물정보학</b>, 유전 회로 설계는 <b>합성생물학</b>, 안전한 약은 <b>의약 · 약학</b>, 작물 · 식품 개선은 <b>식품 · 농업 생명공학</b>, 오염 정화는 <b>환경 생명공학</b>이에요. 신약 하나에도 세 분야가 이어서 일해요.',
        },
        {
          type: 'quiz', title: '왜 여러 분야가 필요할까?',
          goal: '생명공학이 한 학문이 아니라 <b>여러 분야의 융합</b>인 까닭으로 가장 알맞은 것은?',
          setup() { setMode('collab'); },
          choices: ['하나의 목표(예: 신약 개발)를 이루려면 서열 분석, 단백질 구조 · 기능 이해, 약의 설계 · 평가처럼 서로 다른 전문 지식이 함께 필요하기 때문이다', '생물학만 알면 모든 문제를 혼자서 해결할 수 있기 때문이다', '분야가 많을수록 실험 결과가 저절로 좋아지기 때문이다', '서로 다른 분야는 같은 연구 질문을 절대 다루지 않기 때문이다'],
          answer: 0,
          feedback: ['', '실제 연구는 한 분야만으로 끝나지 않아요. 신약 개발 팀 그림을 다시 떠올려 봐요.', '분야 수가 결과를 보장하지는 않아요. 필요한 전문성이 모이는 것이 중요해요.', '같은 문제를 여러 분야가 서로 다른 방법으로 다루는 경우가 많아요.'],
          explain: '신약 하나를 만들 때도 <b>표적 찾기(생물정보학) → 표적 단백질 분석(단백질 공학) → 후보 설계 · 시험 · 승인(약학)</b>처럼 서로 다른 전문 지식이 이어져요. 그래서 생명공학은 여러 분야가 모여 이루어진 <b>융합 분야</b>예요.',
        },
      ],
    },
    {
      title: '단백질–화합물 가상 실험', short: '가상 실험', icon: '🧪', phase: '실험',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 신약 개발에서 표적 단백질을 분석하고 약 후보를 시험하는 일을 봤어요. 이제 <b>가상 실험</b>으로 직접 해 봐요. <b>세포와 물질대사</b>에서 배운 효소 저해처럼, 약 후보는 표적 단백질의 <b>결합 포켓</b>에 붙어 기능을 막아요.</div><p>표적 효소 <b>T</b>의 결합 포켓에는 자리가 5곳(P1~P5) 있어요. 화합물을 포켓에 넣고 <b>72°씩 돌려</b> 기와 자리를 짝지으면 점수가 내려가요. <b>정전기 상보 쌍 ' + MINUS + '1.5 · 수소 결합 ' + MINUS + '1.0 · 소수성 접촉 ' + MINUS + '0.5 · 입체 충돌 +3.0</b> (교육용 점수, 실제 에너지 단위가 아니에요). 점수가 <b>낮을수록</b> 잘 결합해요.</p>',
      features: ['dock', 'sel', 'ic50'],
      setup() { setMode('dock'); },
      recap: '점수 합이 가장 낮은 후보 B가 표적 효소 T에 가장 잘 결합하지만, 정상 효소 N에도 붙으면 부작용 위험이 있어서 선택성(표적 점수 ' + MINUS + ' 정상 효소 점수)과 IC50도 함께 봐야 해요.',
      summary: '<ul><li><b>가상 점수 규칙</b>(교육용): 정전기 상보 쌍 ' + MINUS + '1.5, 수소 결합 ' + MINUS + '1.0, 소수성 접촉 ' + MINUS + '0.5, 입체 충돌 +3.0. 합이 작을수록(더 음수) 잘 결합해요.</li><li><b>후보 점수</b>: B ' + MINUS + '5.5 / D ' + MINUS + '4.0 / A ' + MINUS + '3.0 / F ' + MINUS + '2.5 / C ' + MINUS + '0.5 / E +1.0. E는 큰 고리가 포켓에 부딪혀요.</li><li><b>선택성</b> = 표적 점수 ' + MINUS + ' 정상 효소 점수: B ' + MINUS + '2.5, D ' + MINUS + '1.5, A 0.0. A는 정상 효소에도 똑같이 붙어 부작용 위험이 있어요.</li><li><b>IC50</b>: 억제율이 50 %가 되는 농도. B 0.1 µM &lt; D 1 µM &lt; A 3 µM 이므로 B가 가장 강해요.</li><li>결합이 강하다고 모두 약이 되지는 않아요. 선택성 · 독성 · 몸속 흡수 · 분해도 따져야 해요.</li></ul>',
      missions: [
        {
          id: 'dock', title: '후보를 맞춰 최고 점수 찾기',
          goal: '표적 효소 T에 후보를 <b>3종 이상</b> 맞춰 보고, 점수가 가장 낮은(가장 잘 결합하는) 후보를 <b>★ 이 후보로 결정</b>하세요.',
          hint: '후보를 눌러 포켓에 넣고 ↻로 72°씩 돌려 점수가 가장 낮은 자세를 찾아요. 기가 많고 짝이 다 맞는 후보가 유리하지만, 6종을 모두 맞춰 비교해 보면 확실해요.',
          setup() { setMode('dock'); },
          check: () => triedN() >= 3 && DK.chosen === 'B' && DK.best.B === -5.5, hold: 0.7,
          status: () => mark(triedN() >= 3) + ' 맞춰 본 후보 ' + triedN() + ' / 3종 이상 &nbsp; ' + mark(DK.chosen === 'B' && DK.best.B === -5.5) + ' 최고 점수 후보를 결정' + (DK.chosen && DK.chosen !== 'B' ? ' (다른 후보가 더 낮을 수 있어요)' : ''),
          explain: '후보 B는 + · ' + MINUS + ' · 소 · 주 · 받 다섯 기가 모두 알맞은 자리에 짝을 이뤄 <b>' + MINUS + '1.5 ' + MINUS + '1.5 ' + MINUS + '0.5 ' + MINUS + '1.0 ' + MINUS + '1.0 = ' + MINUS + '5.5</b>로 점수가 가장 낮아요. 후보 E는 큰 고리가 포켓에 부딪혀 입체 충돌 +3.0이 더해져 <b>+1.0</b>으로 오히려 결합하지 못해요.',
        },
        {
          id: 'sel', title: '선택성과 IC50 읽기', manual: true,
          goal: '<b>⚖️ 정상 효소 N</b>에 B · D · A를 같은 자세로 넣어 비교하고, <b>선택성이 없는 후보</b>와 <b>IC50이 가장 작은 후보</b>를 고르세요.',
          hint: '선택성 = 표적 점수 ' + MINUS + ' 정상 효소 점수예요. 0이면 표적과 정상 효소에 똑같이 붙어요. IC50은 📈 화면에서 억제율 50 % 지점의 농도로 읽어요.',
          setup() { setMode('sel'); },
          check() {
            const need = IDS_N.filter((id) => !DK.seenN[id]);
            if (need.length) return '정상 효소 N에 후보 ' + need.join(' · ') + '를 넣어 비교해 보세요. (먼저 표적 효소 T에서 맞춰 봐야 해요)';
            if (!PK.no || !PK.ic) return '오른쪽 ①, ② 질문에 모두 답해 주세요.';
            if (PK.no !== 'A') return '①을 다시 확인해요. 정상 효소의 점수가 표적 점수와 같은 후보를 찾아요.';
            if (PK.ic !== 'B') return '②를 다시 확인해요. 📈 IC50 화면에서 50 % 지점이 가장 왼쪽(낮은 농도)인 곡선을 찾아요.';
            return true;
          },
          status: () => mark(IDS_N.every((id) => DK.seenN[id])) + ' B · D · A를 N에 넣어 봄 &nbsp; ' + mark(!!PK.no && !!PK.ic) + ' ①②에 답함',
          explain: '같은 자세에서 B는 T ' + MINUS + '5.5 / N ' + MINUS + '3.0 (선택성 ' + MINUS + '2.5), D는 T ' + MINUS + '4.0 / N ' + MINUS + '2.5 (선택성 ' + MINUS + '1.5), A는 T ' + MINUS + '3.0 / N ' + MINUS + '3.0 (선택성 0.0)이에요. A는 정상 효소에도 똑같이 붙어 <b>부작용 위험</b>이 있어요. IC50은 B 0.1 µM, D 1 µM, A 3 µM 이라서 B가 가장 적은 양으로 절반을 억제하는 가장 강한 후보예요.',
        },
        {
          type: 'quiz', title: '점수가 가장 낮은 후보 = 최고의 약?',
          goal: '결합 점수가 가장 낮은 후보가 <b>반드시 최고의 약은 아닌</b> 까닭으로 알맞은 것은?',
          setup() { setMode('sel'); },
          choices: ['정상 단백질에도 붙어 부작용이 생길 수 있고(선택성), 독성이나 몸속 흡수 · 분해 같은 조건도 맞아야 하기 때문이다', '점수는 숫자일 뿐이라 실제 결합과는 관계가 없기 때문이다', '점수가 낮을수록 약효가 약해지기 때문이다', '약은 표적 단백질에 결합하면 안 되기 때문이다'],
          answer: 0,
          feedback: ['', '점수는 결합이 얼마나 잘 되는지를 나타내는 지표예요. 다만 그것만으로 약이 되지는 않아요.', '점수가 낮을수록 잘 결합해요. 약효와 반대로 읽으면 안 돼요.', '약은 표적 단백질에 결합해 기능을 조절해요. 정상 단백질에 덜 붙는 것이 중요해요.'],
          explain: '결합이 강한 것은 <b>필요 조건</b>일 뿐이에요. 후보 A처럼 정상 효소에도 똑같이 붙으면 부작용이 생기고, 독성 · 몸속 흡수 · 분해 같은 조건을 만족해야 해요. 그래서 결합 점수 다음에 선택성과 세포 실험, 동물 · 사람 대상 시험을 거쳐 약으로 승인돼요.',
        },
      ],
    },
    {
      title: '활용 사례와 직업', short: '활용 사례', icon: '🏭', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계들에서</b> 분야 8곳과 신약 개발의 가상 실험을 살펴봤어요. 이제 이 분야들이 <b>우리 생활과 산업</b>에서 어디에 쓰이는지 분석해요.</div><p>사례 <b>7가지</b>(의료 · 식품 · 농업 · 환경 · 에너지 · 산업 · 수사)에 알맞은 <b>분야</b>와 <b>관련 직업</b>을 연결해 보세요.</p><p>그리고 뉴스 · 학술 자료 · 제품 설명서처럼 <b>매체마다 믿을 만한 정도가 다르고</b>, 광고 문구는 장점만 강조할 수 있다는 점도 함께 생각해 봐요.</p>',
      features: ['cases'],
      setup() { setMode('cases'); },
      recap: '의료 · 식품 · 농업 · 환경 · 에너지 · 산업 · 수사 등 생활 곳곳에 생명공학이 쓰이고, 분야마다 관련 직업이 있어요. 정보를 쓸 때는 출처와 근거, 광고 표현을 구분해야 해요.',
      summary: '<ul><li><b>활용 사례</b>: 의료(의약품 · 진단 키트) · 식품(발효 균주) · 농업(병해충 저항 작물) · 환경(미생물 정화) · 에너지(바이오 연료) · 산업(세제용 효소) · 수사(DNA 지문, STR 분석).</li><li><b>DNA 지문</b>: 사람마다 STR(짧은 서열이 반복되는 부위)의 반복 횟수가 달라서, 여러 부위의 반복 횟수를 비교해 같은 사람인지 가려내요.</li><li><b>직업 예</b>: 바이오 의약품 개발자 · 식품 연구개발자 · 농업 생명공학 연구원 · 환경 생명공학 연구원 · 바이오 에너지 연구원 · 단백질 공학 연구원 · DNA 감식 분석가.</li><li><b>정보 읽기</b>: 뉴스 · 학술 자료 · 제품 설명서의 출처와 근거를 확인하고, ‘100 % 안전’ 같은 단정 표현은 근거와 한계를 따져 봐요.</li></ul>',
      missions: [
        {
          id: 'cases', title: '사례–분야–직업 연결', manual: true,
          goal: '사례 <b>7가지</b> 각각에 알맞은 <b>분야</b>와 <b>관련 직업</b>을 고르세요.',
          hint: '사례를 눌러 고른 뒤 오른쪽 목록에서 분야와 직업을 골라요. 사례의 핵심 기술(발효 균주, 대사 경로 설계, 효소 개량, STR 분석 등)을 분야 이름과 비교해 봐요.',
          setup() { setMode('cases'); },
          check() {
            const n = csDone();
            if (n < 7) return '아직 분야와 직업을 모두 고르지 않은 사례가 있어요. (' + n + ' / 7)';
            const bad = CASES.map((c, i) => (csGood(i) ? -1 : i)).filter((i) => i >= 0);
            CASES.forEach((c, i) => { const r = csGood(i) ? 'ok' : 'bad'; if (r === 'bad' && CS.res[i] !== 'bad') CS.shake[i] = 1; CS.res[i] = r; });
            if (bad.length) { const c = CASES[bad[0]], p = CS.pick[bad[0]]; return '\'' + c.sec + '\' 사례를 다시 확인해 보세요. ' + (p.f !== c.field ? '(분야가 달라요)' : '(직업이 달라요)') + ' 달라진 사례: ' + bad.length + '개'; }
            return true;
          },
          status: () => mark(csDone() === 7) + ' 연결한 사례 ' + csDone() + ' / 7',
          explain: '의료 → <b>의약 · 약학</b> / 바이오 의약품 개발자, 식품 → <b>식품 · 농업</b> / 식품 연구개발자, 농업 → <b>식품 · 농업</b> / 농업 생명공학 연구원, 환경 → <b>환경 생명공학</b> / 환경 생명공학 연구원, 에너지 → <b>합성생물학</b> / 바이오 에너지 연구원, 산업(세제용 효소) → <b>단백질 공학</b> / 단백질 공학 연구원, 수사(STR) → <b>유전공학 · 분자생물학</b> / DNA 감식 분석가예요.',
        },
        {
          type: 'quiz', title: '‘100 % 안전한 유전자 기술’ 광고',
          goal: '제품 광고에서 <b>‘100 % 안전한 유전자 기술’</b>이라는 문구를 만났어요. 이 문구를 평가하는 방법으로 가장 알맞은 것은?',
          setup() { setMode('cases'); },
          choices: ['근거 자료(연구 논문, 공공기관 평가)를 찾아 어떤 조건에서 무엇을 시험했는지 확인하고, 한계나 불확실성을 밝혔는지 살펴본다', '광고에 100 %라고 적혀 있으니 그대로 믿는다', '유명한 사람이 추천했으니 사실이라고 본다', '새로운 기술은 모두 거짓이라고 생각한다'],
          answer: 0,
          feedback: ['', '광고는 장점을 강조해요. 근거 자료를 확인해야 해요.', '추천한 사람이 누구인지와 사실 여부는 별개예요.', '모두 거짓이라고 단정하는 것도 근거 없는 판단이에요. 근거를 확인해 보는 것이 중요해요.'],
          explain: '과학 기술에서 ‘100 % 안전’처럼 <b>단정하는 표현</b>은 근거와 한계를 함께 확인해야 해요. 믿을 만한 출처(논문 · 공공기관 평가)에서 <b>어떤 조건</b>으로 <b>무엇을</b> 시험했는지, 불확실한 부분은 무엇인지 살펴보면 광고 표현과 사실을 구분할 수 있어요.',
        },
      ],
    },
    {
      title: '설명 자료 만들기', short: '설명 자료', icon: '📝', phase: '설명',
      intro: '<div class="si-link">🔗 <b>앞 단계들에서</b> 분야 지도, 신약 개발의 가상 실험, 활용 사례와 직업을 살펴봤어요. 이제 하나를 골라 다른 사람에게 <b>설명하는 자료</b>로 만들어 봐요.</div><p>① <b>주제</b>를 고르고 ② <b>매체</b>(인포그래픽 · 카드뉴스 · 포스터 · 영상 콘티)를 골라요. ③ 필수 요소 <b>5개</b>(분야 정의 · 원리 한 줄 · 생활 사례 · 사회적 영향 · 관련 직업 · 진로)에 알맞은 설명을 고르고, ④ <b>출처</b>와 <b>한계</b> 칸까지 넣은 뒤 <b>🔍 체크리스트 점검</b>을 통과해요.</p><p>비슷해 보여도 <b>틀린 설명</b>이 섞여 있어요. 내용이 정확해야 좋은 설명 자료예요!</p>',
      features: ['media'],
      setup() { setMode('media'); },
      recap: '설명 자료에는 분야 정의 · 원리 한 줄 · 생활 사례 · 사회적 영향(이익과 한계) · 관련 직업과 함께 출처와 한계를 적어야 해요.',
      summary: '<ul><li><b>필수 요소 5개</b>: 분야 정의, 원리 한 줄, 생활 사례, 사회적 영향(이익과 한계), 관련 직업 · 진로.</li><li><b>매체 선택</b>: 인포그래픽 · 카드뉴스 · 포스터 · 영상 콘티 중 내용에 맞는 것을 골라요.</li><li><b>출처와 한계</b>: 믿을 만한 출처(교과서 · 논문 · 공공기관)를 밝히고, 이익뿐 아니라 한계와 불확실성도 적어야 읽는 사람이 균형 있게 판단해요.</li><li>같은 사례도 분야마다 주목하는 질문이 달라서 설명하는 관점이 달라져요.</li></ul>',
      missions: [
        {
          id: 'media', title: '필수 요소 5개와 체크리스트', manual: true,
          goal: '주제와 매체를 고르고 필수 요소 <b>5칸</b>을 채운 뒤, <b>📚 출처</b>와 <b>⚠ 한계</b> 칸을 넣고 <b>🔍 체크리스트 점검</b>을 통과하세요.',
          hint: '비슷한 설명 중 정확한 것을 골라요. 단정하는 말(‘항상’, ‘전혀’, ‘100 %’)이 들어 있거나 한계를 지우는 설명은 의심해 봐요. 점검에서 ⚠가 나온 칸은 다시 골라요.',
          setup() { setMode('media'); },
          check() {
            if (!MD.topic) return '먼저 위쪽에서 주제를 골라 주세요.';
            if (!MD.medium) return '매체를 골라 주세요.';
            const empty = MD.pick.filter((p) => p < 0).length;
            if (empty) return '비어 있는 칸이 ' + empty + '개 있어요. 5칸을 모두 채워 주세요.';
            if (!MD.flags.src || !MD.flags.lim) return '📚 출처 칸과 ⚠ 한계 칸을 모두 넣어 주세요.';
            if (!MD.checked) return '🔍 체크리스트 점검을 눌러 정확한지 확인해 보세요.';
            const bad = MD.pick.map((p, i) => (p !== mdOptions(MD.topic, i).ans ? i : -1)).filter((i) => i >= 0);
            if (bad.length) return '점검에서 ⚠가 나온 칸이 ' + bad.length + '개 있어요. (' + ENAMES[bad[0]] + ' 칸부터) 정확한 설명으로 보완해 다시 점검해 보세요.';
            return true;
          },
          explain: '정확한 설명 자료는 <b>정의 · 원리 · 사례</b>가 사실과 맞고, <b>사회적 영향</b>에 이익과 한계를 함께 적고, 관련 <b>직업</b>을 현실에 맞게 제시해요. 단정하는 표현(항상, 전혀, 100 %)이나 한계를 지운 설명은 틀리거나 과장된 설명이에요.',
        },
        {
          type: 'quiz', title: '출처와 한계를 함께 적는 까닭',
          goal: '설명 자료에 <b>출처</b>와 <b>한계</b>를 함께 적어야 하는 까닭으로 알맞은 것은?',
          setup() { setMode('media'); },
          choices: ['읽는 사람이 근거를 직접 확인하고, 이익뿐 아니라 한계와 불확실성까지 균형 있게 판단할 수 있게 하기 위해서이다', '자료가 길고 화려해 보이게 하려고 적는다', '한계를 적으면 기술이 쓸모없다는 뜻이므로 빼는 것이 좋다', '출처는 저작권 때문에만 필요하고 정확성과는 관계가 없다'],
          answer: 0,
          feedback: ['', '목적은 길이가 아니라 신뢰할 수 있는 정보 전달이에요.', '한계를 밝히는 것은 기술을 깎아내리는 것이 아니라 균형 잡힌 정보를 주는 거예요.', '출처는 사실을 확인할 수 있게 해 주는 장치이기도 해요.'],
          explain: '<b>출처</b>가 있으면 읽는 사람이 사실을 확인할 수 있고, <b>한계</b>를 함께 적으면 장점만 부풀리지 않은 균형 잡힌 설명이 돼요. 기술이 사회에 미치는 영향은 이익과 한계를 모두 알아야 판단할 수 있어요.',
        },
        {
          type: 'quiz', title: '같은 사례, 다른 관점',
          goal: '‘효소 세제’ 한 가지를 <b>단백질 공학</b>, <b>환경 생명공학</b>, <b>품질 · 규제</b> 분야가 설명하는 방식이 서로 다른 까닭은?',
          setup() { setMode('media'); },
          choices: ['각 분야가 효소의 구조 개량, 환경에 미치는 영향, 안전성 · 품질 기준처럼 서로 다른 질문에 주목하기 때문이다', '분야마다 사실 자체가 다르기 때문이다', '한 분야만 맞고 나머지는 틀렸기 때문이다', '효소 세제는 한 분야에서만 다루기 때문이다'],
          answer: 0,
          feedback: ['', '사실은 하나이고, 주목하는 질문과 관점이 달라요.', '서로 보완하는 관점이라서 하나만 맞고 나머지는 틀린 것이 아니에요.', '실제로는 여러 분야가 같은 사례를 함께 다뤄요.'],
          explain: '같은 사례도 <b>단백질 공학</b>은 “효소 구조를 어떻게 개량할까”, <b>환경 생명공학</b>은 “환경에 어떤 영향을 줄까”, <b>품질 · 규제</b>는 “안전성과 품질 기준을 지키는가”를 물어요. 서로 다른 관점이 모여야 사례를 균형 있게 이해할 수 있어요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hg-biotech-fields', mount: '#game', badge: '생명공학 탐험가', homeHref: '../../index.html#hg',
    featureLabels: { map: '🗺️ 분야 지도', collab: '🤝 신약 개발 팀', dock: '🧲 표적 효소 T', sel: '⚖️ 정상 효소 N', ic50: '📈 IC50 곡선', cases: '🏭 활용 사례 연결', media: '📝 설명 자료' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 읽음 칸 ---------- */
  function readouts() {
    const m = S.mode;
    if (m === 'map') setReads(['놓은 카드', MP.so.placed + ' / 8', '관련 분야', '8곳', '대표 사례', '신약 개발']);
    else if (m === 'collab') setReads(['읽은 분야', ROLES.filter((r) => CO.seen[r.id]).length + ' / 3', '사례', '신약 개발', '선택', CO.sel ? ROLES.find((r) => r.id === CO.sel).name : '—']);
    else if (m === 'dock' || m === 'sel') {
      const P = curP(), cur = DK[P], ps = cur.id ? pose(cur.id, cur.rot, P) : null;
      setReads(['넣은 후보', cur.id ? '후보 ' + cur.id : '—', '자세', cur.id ? (cur.rot + 1) + ' / 5' : '—', (P === 'T' ? '표적 T' : '정상 N') + ' 점수', ps ? fmtS(ps.total) : '—']);
    } else if (m === 'ic50') { const c = CONC[IC_S.idx]; setReads(['농도', c + ' µM', '후보 B 억제율', Math.round(inhib(IC.B, c)) + ' %', '후보 D · A', Math.round(inhib(IC.D, c)) + ' % · ' + Math.round(inhib(IC.A, c)) + ' %']); }
    else if (m === 'cases') setReads(['연결한 사례', csDone() + ' / 7', '선택한 사례', CASES[CS.sel].sec, '분야', '8곳']);
    else setReads(['주제', MD.topic ? TOPICS[MD.topic].name.split(' · ')[0] : '미선택', '채운 칸', MD.pick.filter((p) => p >= 0).length + ' / 5', '점검', MD.checked ? MD.res.filter((x) => x === 'ok').length + ' / 5 정확' : '아직']);
  }

  /* ---------- 시작 ---------- */
  setMode('map');
  let lastFree = false, lastLv = -1;
  SciSim.loop((dt, t) => {
    clock = t; S.t = t; FDT = dt;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (game && game.level !== lastLv) { lastLv = game.level; updateCtl(); }
    view.apply(); ctx.clearRect(0, 0, VW, VH);
    bgFill('#eef4f2', '#e3ece8');
    FX.update(dt);
    switch (S.mode) {
      case 'map': mapScene(dt, t); break;
      case 'collab': collabScene(dt, t); break;
      case 'dock': case 'sel': dockScene(dt, t); break;
      case 'ic50': icScene(dt, t); break;
      case 'cases': casesScene(dt, t); break;
      case 'media': mediaScene(dt, t); break;
    }
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(241,246,243,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, PHONE, get game() { return game; }, levels, setMode, updateCtl, MP, CO, DK, CS, MD, PK, IC_S, FIELDS, CASES, TOPICS,
    pose, bestPose, dockIn, dkRotate, dkPickBest, dkEject, coSelect, csGood, mdOptions, mdTopic, mdMedium, mdPick, mdCheck, mpWrong, triedN, inhib, IC, CONC,
  };


})();
