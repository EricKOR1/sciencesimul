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


  function fmtN(n, d) { return Number(n).toLocaleString('ko-KR', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); }
  const pct = (a, b, d) => (b > 0 ? fmtN(a / b * 100, d == null ? 0 : d) + ' %' : '—');
  function dot(x, y, r, col, o) { D.sphere(x, y, r, col, o || {}); }
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


  /* ===== 유전 부호 · 염기 도구 ===== */
  const ease = SciSim.ease;
  const BASE_COL = { A: '#ef4444', U: '#f59e0b', T: '#f59e0b', G: '#16a34a', C: '#2563eb' };
  const CMP = { A: 'T', T: 'A', G: 'C', C: 'G' };            // DNA 가닥끼리 상보
  const CMP_RNA = { A: 'U', T: 'A', G: 'C', C: 'G' };         // 주형 DNA → RNA
  const CMP_RR = { A: 'U', U: 'A', G: 'C', C: 'G' };          // RNA 코돈 → 안티코돈
  const AA_STR = 'FFLLSSSSYY**CC*WLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG';
  const AA3 = { F: 'Phe', L: 'Leu', S: 'Ser', Y: 'Tyr', C: 'Cys', W: 'Trp', P: 'Pro', H: 'His', Q: 'Gln', R: 'Arg', I: 'Ile', M: 'Met', T: 'Thr', N: 'Asn', K: 'Lys', V: 'Val', A: 'Ala', D: 'Asp', E: 'Glu', G: 'Gly', '*': '종결' };
  const AA_LIST = 'FLSYCWPHQRIMTNKVADEG'.split('');
  const AA_GROUP = { G: 'np', A: 'np', V: 'np', L: 'np', I: 'np', M: 'np', P: 'np', F: 'np', W: 'np', S: 'po', T: 'po', C: 'po', Y: 'po', N: 'po', Q: 'po', K: 'pos', R: 'pos', H: 'pos', D: 'neg', E: 'neg', '*': 'stop' };
  const GROUP_COL = { np: '#f59e0b', po: '#14b8a6', pos: '#3b82f6', neg: '#ef4444', stop: '#64748b' };
  const aaCol = (a) => GROUP_COL[AA_GROUP[a] || 'stop'];
  const codonAA = (c) => { const b = 'UCAG'; const i = b.indexOf(c[0]), j = b.indexOf(c[1]), k = b.indexOf(c[2]); return i < 0 || j < 0 || k < 0 ? '?' : AA_STR[16 * i + 4 * j + k]; };
  const rnaOfT = (s) => s.replace(/T/g, 'U');
  const revStr = (s) => s.split('').reverse().join('');
  /* 첫 AUG부터 종결 코돈까지 번역 (없으면 시작 못 함) */
  function translateORF(m, from) {
    let st = m.indexOf('AUG', from || 0);
    if (st < 0) return { start: -1, aa: [], stop: false, end: -1 };
    const aa = []; let i = st, stop = false;
    for (; i + 3 <= m.length; i += 3) { const a = codonAA(m.slice(i, i + 3)); aa.push(a); if (a === '*') { stop = true; i += 3; break; } }
    return { start: st, aa, stop, end: i };
  }
  const aaStr = (aa) => aa.map((a) => AA3[a]).join('–');
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

  /* ===== 염기 타일 · 아미노산 칩 ===== */
  function baseTile(x, y, w, h, ch, o) {
    o = o || {};
    const col = BASE_COL[ch] || '#94a3b8';
    ctx.save();
    ctx.globalAlpha = (o.alpha == null ? 1 : o.alpha) * (o.dim ? 0.38 : 1);
    D.roundRect(x + 1, y + 1, w - 2, h - 2, Math.min(7, h / 3));
    ctx.fillStyle = o.fill || C.mix('#ffffff', col, o.solid ? 0.9 : 0.2); ctx.fill();
    ctx.strokeStyle = o.hl || C.shade(col, -0.1); ctx.lineWidth = o.hl ? 3 : 1.6; ctx.stroke();
    if (ch && !o.blank) T(x + w / 2, y + h / 2 + Math.min(6, h * 0.2), ch, Math.min(h * 0.58, 20), o.solid ? '#fff' : C.shade(col, -0.35), 'center', 800);
    if (o.lock) { T(x + w - 7, y + 9, '🔒', 8, '#64748b', 'center', 700); }
    ctx.restore();
  }
  function aaChip(cx, cy, w, h, aa, o) {
    o = o || {};
    const col = o.col || aaCol(aa);
    ctx.save(); ctx.globalAlpha = o.alpha == null ? 1 : o.alpha;
    D.shadow(() => { D.roundRect(cx - w / 2, cy - h / 2, w, h, h / 2); ctx.fillStyle = C.mix('#ffffff', col, o.solid ? 0.95 : 0.22); ctx.fill(); }, { blur: 4, y: 1 });
    ctx.strokeStyle = o.hl || C.shade(col, -0.1); ctx.lineWidth = o.hl ? 3 : 1.6; D.roundRect(cx - w / 2, cy - h / 2, w, h, h / 2); ctx.stroke();
    T(cx, cy + 4.5, o.text || AA3[aa], Math.min(14, h * 0.55), o.solid ? '#fff' : C.shade(col, -0.45), 'center', 800);
    ctx.restore();
  }
  /* 작은 별 모양 '정답' 효과 */
  function okBurst(x, y) { parts.burst(x, y, { count: 14, speed: 120, life: 0.7, size: 3.5 }); }
  /* 방향 표기 5′ 3′ */
  const P5 = '5′', P3 = '3′';

  /* ---------- 공통 그림: 이중 나선, 리보솜, 구슬 사슬 ---------- */
  function helix(x1, x2, y, amp, t, c1, c2, o) {
    o = o || {};
    const n = Math.max(2, Math.round((x2 - x1) / 3));
    ctx.save(); ctx.lineWidth = o.lw || 3; ctx.lineCap = 'round';
    for (let k = 0; k < 2; k++) {
      ctx.strokeStyle = k ? c2 : c1; ctx.beginPath();
      for (let i = 0; i <= n; i++) {
        const x = x1 + (x2 - x1) * i / n, ph = (x - x1) / 22 + t * (o.spin || 0) + k * Math.PI;
        const yy = y + Math.sin(ph) * amp;
        if (i) ctx.lineTo(x, yy); else ctx.moveTo(x, yy);
      }
      ctx.stroke();
    }
    ctx.lineWidth = 1.4; ctx.strokeStyle = 'rgba(100,116,139,.45)';
    for (let x = x1 + 6; x < x2; x += 11) { const ph = (x - x1) / 22 + t * (o.spin || 0); ctx.beginPath(); ctx.moveTo(x, y + Math.sin(ph) * amp); ctx.lineTo(x, y - Math.sin(ph) * amp); ctx.stroke(); }
    ctx.restore();
  }
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
  function beads(pts, r, col, o) {
    o = o || {};
    pts.forEach((p, i) => { D.sphere(p.x, p.y, r, o.cols ? o.cols[i % o.cols.length] : col, { gloss: r > 4 }); });
  }
  /* 리보솜: 대단위체(위) + 소단위체(아래). 중심 (x, y) 는 mRNA가 지나는 줄, s는 크기 */
  function ribo(x, y, s, o) {
    o = o || {};
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.globalAlpha = o.alpha == null ? 1 : o.alpha;
    const lift = o.lift || 0;
    // 소단위체
    ctx.save(); ctx.translate(0, 0);
    D.shadow(() => { ctx.beginPath(); ctx.ellipse(0, 11, 38, 14, 0, 0, TAU); ctx.fillStyle = '#7dd3a8'; ctx.fill(); }, { blur: 4, y: 2 });
    ctx.strokeStyle = '#2f9e6a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(0, 11, 38, 14, 0, 0, TAU); ctx.stroke(); ctx.restore();
    if (!o.noLarge) {
      ctx.save(); ctx.translate(0, -lift);
      D.shadow(() => { ctx.beginPath(); ctx.moveTo(-42, -2); ctx.bezierCurveTo(-46, -50, 46, -50, 42, -2); ctx.closePath(); ctx.fillStyle = '#34b27b'; ctx.fill(); }, { blur: 5, y: 2 });
      ctx.strokeStyle = '#1f7a52'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-42, -2); ctx.bezierCurveTo(-46, -50, 46, -50, 42, -2); ctx.closePath(); ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }
  function pill(x, y, text, o) { return D.label(x, y, text, o); }


  /* =========================================================
     고등학교 생물의 유전 · Ⅱ. 유전자의 발현 - 유전자 발현의 중심원리 (단원 60, 1차시)
     성취기준 [12유전02-01] 전사와 번역 과정을 거쳐 유전자가 발현되는 중심원리를 이해하고, 모형을 이용하여 유전자 발현 과정을 설명할 수 있다.
     ① 모형: 중심원리  ② 모형: 전사와 RNA 가공  ③ 모형: 번역  ④ 탐구: 단백질 합성 모의실험
     (염기 수 · 번역 속도 등은 교육용 예시 값이에요)
     ========================================================= */
  const S = { mode: 'flow', fade: 0, t: 0 };
  let game = null;
  const ctlNodes = $$('#ctrlCard .control');
  const GENE = 'ATGGAACCATGGTTTAAATAA';            // 암호화(비주형) 가닥 5′→3′
  const TEMPL = GENE.split('').map((c) => CMP[c]).join('');   // 주형 가닥 3′→5′ (왼쪽부터)
  const MRNA = rnaOfT(GENE);
  const MRNA_SP = 'AUG GAA CCA UGG UUU AAA UAA';
  const mrnaCodons = (s) => s.match(/.{1,3}/g) || [];

  /* =========================================================
     ① 중심원리: 정보의 흐름 도표 + 세포 단면 (원핵 / 진핵)
     ========================================================= */
  const F = {
    cell: 'euk', names: [null, null, null], sel: 0, bad: [false, false, false],
    run: false, t: 0, ranP: false, ranE: false, trace: { p: null, e: null }, ptr: [0, 0, 0],
  };
  const SLOT_NAMES = ['복제', '전사', '번역'];
  const F_END = { euk: 9.0, prok: 6.7 };
  const nextEmptySlot = () => { for (let i = 0; i < 3; i++) if (!F.names[i]) return i; return -1; };
  function dgGeom() {
    if (!PHONE) {
      return {
        dna: { x: 90, y: 118, w: 108, h: 48 }, rna: { x: 90, y: 232, w: 108, h: 48 }, pro: { x: 90, y: 346, w: 108, h: 48 },
        rep: { p: [[144, 106], [178, 90], [178, 146], [144, 130]], slot: [208, 118] },
        tx: { a: [90, 144], b: [90, 206], slot: [138, 175] },
        tl: { a: [90, 258], b: [90, 320], slot: [138, 289] },
        rv: { a: [48, 206], b: [48, 144], lab: [26, 175] },
        note: [14, 420],
      };
    }
    return {
      dna: { x: 70, y: 112, w: 100, h: 44 }, rna: { x: 240, y: 112, w: 100, h: 44 }, pro: { x: 410, y: 112, w: 100, h: 44 },
      rep: { p: [[48, 90], [34, 54], [106, 54], [92, 90]], slot: [70, 56] },
      tx: { a: [124, 112], b: [186, 112], slot: [155, 84] },
      tl: { a: [294, 112], b: [356, 112], slot: [325, 84] },
      rv: { a: [210, 144], b: [124, 144], lab: [167, 168] },
      note: [14, 188],
    };
  }
  function cellRect() { return PHONE ? { x: 10, y: 206, w: 460, h: 330 } : { x: 238, y: 56, w: 550, h: 352 }; }
  const SC_W = 520, SC_H = 400;
  function chainStrip() { return PHONE ? { x: 10, y: 556, w: 460, h: 76 } : { x: 238, y: 446, w: 550, h: 104 }; }

  function flowTimes() {
    const e = F.cell === 'euk';
    return e ? { txEnd: 3.0, tlStart: 5.4, tlEnd: 9.0 } : { txEnd: 4.0, tlStart: 1.0, tlEnd: 6.5 };
  }
  function flowPhaseText() {
    const t = F.t, e = F.cell === 'euk';
    if (!F.run && F.t <= 0) return F.cell === 'euk' ? '핵막이 있어서 전사(핵 안)와 번역(세포질)이 장소로 나뉘어요' : '핵막이 없어서 전사와 번역이 같은 공간에서 일어나요';
    if (e) {
      if (t < 3) return '① 핵 안에서 DNA → mRNA (전사)';
      if (t < 4.2) return '② 핵 안에서 mRNA 가공';
      if (t < 5.4) return '③ 핵공을 지나 세포질로';
      if (t < 9) return '④ 세포질의 리보솜에서 번역';
      return '단백질 완성! 번역은 전사와 가공이 끝난 뒤에 시작했어요';
    }
    if (t < 1) return '① DNA → mRNA (전사) 시작';
    if (t < 4) return '② 전사가 계속되는 동안 리보솜이 mRNA에 붙어 번역!';
    if (t < 6.5) return '③ 전사가 끝난 뒤에도 번역이 이어져요';
    return '단백질 완성! 번역은 전사가 끝나기 전에 시작했어요';
  }
  function flowStep(dt) {
    if (!F.run) return;
    F.t += dt;
    const end = F_END[F.cell];
    if (F.t >= end) {
      F.t = end; F.run = false;
      const tm = flowTimes();
      if (F.cell === 'euk') { F.ranE = true; F.trace.e = tm; } else { F.ranP = true; F.trace.p = tm; }
      if (!RM) { const r = cellRect(); parts.burst(r.x + r.w * 0.8, r.y + r.h * 0.55, { count: 18, speed: 130, life: 0.8 }); }
    }
  }
  function flowRun() {
    if (F.run) return;
    F.t = 0; F.run = true; Sound.click();
  }
  function flowReset(keepNames) {
    F.run = false; F.t = 0; if (!keepNames) { F.names = [null, null, null]; F.bad = [false, false, false]; F.sel = 0; }
  }
  function setCell(c) { if (F.cell === c) return; F.cell = c; F.run = false; F.t = 0; updateCtl(); }

  function drawDiagram() {
    const g = dgGeom();
    const lit = [F.run || F.t > 0 ? 1 : 0, 0, 0];
    const nodes = [['dna', 'DNA', '#16a34a'], ['rna', 'RNA', '#8b5cf6'], ['pro', '단백질', '#f59e0b']];
    nodes.forEach(([k, name, col]) => {
      const n = g[k];
      D.shadow(() => { D.roundRect(n.x - n.w / 2, n.y - n.h / 2, n.w, n.h, 14); ctx.fillStyle = C.mix('#ffffff', col, 0.18); ctx.fill(); }, { blur: 7, y: 2 });
      ctx.strokeStyle = col; ctx.lineWidth = 2.5; D.roundRect(n.x - n.w / 2, n.y - n.h / 2, n.w, n.h, 14); ctx.stroke();
      T(n.x, n.y + 6, name, 19, C.shade(col, -0.4), 'center', 800);
    });
    // 복제 (DNA → DNA)
    const r = g.rep.p;
    curveArrow(r[0][0], r[0][1], r[1][0], r[1][1], r[2][0], r[2][1], r[3][0], r[3][1], { color: '#16a34a', width: 4 });
    // 전사 · 번역
    D.arrow(g.tx.a[0], g.tx.a[1], g.tx.b[0], g.tx.b[1], { color: '#8b5cf6', width: 4.5, head: 14 });
    D.arrow(g.tl.a[0], g.tl.a[1], g.tl.b[0], g.tl.b[1], { color: '#f59e0b', width: 4.5, head: 14 });
    // 역전사 (점선, 예외)
    D.arrow(g.rv.a[0], g.rv.a[1], g.rv.b[0], g.rv.b[1], { color: '#94a3b8', width: 3, head: 11, dash: [5, 5] });
    if (PHONE) T(g.rv.lab[0], g.rv.lab[1], '역전사 (예외)', 13, '#64748b', 'center', 800);
    else { ctx.save(); ctx.translate(g.rv.lab[0], g.rv.lab[1]); ctx.rotate(-Math.PI / 2); T(0, 0, '역전사 (예외)', 13, '#64748b', 'center', 800); ctx.restore(); }
    // 이름표 칸
    const slots = [g.rep.slot, g.tx.slot, g.tl.slot], cols = ['#16a34a', '#8b5cf6', '#f59e0b'];
    slots.forEach((s, i) => {
      const nm = F.names[i], selected = F.sel === i;
      const sh = F.bad[i] && !RM ? Math.sin(clock * 55) * 3 : 0;
      const w = nm ? 58 : 44, h = 34;
      if (selected && !nm) D.ring(s[0], s[1], 26, clock, { color: '#f59e0b', width: 3 });
      D.shadow(() => { D.roundRect(s[0] - w / 2 + sh, s[1] - h / 2, w, h, 17); ctx.fillStyle = nm ? C.mix('#ffffff', cols[i], 0.28) : '#fff'; ctx.fill(); }, { blur: 5, y: 2 });
      ctx.strokeStyle = F.bad[i] ? '#e2464b' : nm ? cols[i] : selected ? '#f59e0b' : '#94a3b8'; ctx.lineWidth = selected || F.bad[i] ? 3 : 2; D.roundRect(s[0] - w / 2 + sh, s[1] - h / 2, w, h, 17); ctx.stroke();
      T(s[0] + sh, s[1] + 6, nm || '?', nm ? 16 : 20, nm ? C.shade(cols[i], -0.4) : '#64748b', 'center', 800);
    });
    textBlock(g.note[0], g.note[1], PHONE ? 440 : 210, '점선 화살표: 역전사 (레트로바이러스 등 일부 예외)', 13, '#64748b', 17, 700);
  }
  function flowSlotAt(p) {
    const g = dgGeom();
    const slots = [g.rep.slot, g.tx.slot, g.tl.slot];
    for (let i = 0; i < 3; i++) if (Math.hypot(p.x - slots[i][0], p.y - slots[i][1]) < 32) return i;
    return -1;
  }
  const flowPT = {
    down(p) { const i = flowSlotAt(p); if (i >= 0) { F.sel = i; Sound.click(); updateCtl(); } return false; },
    hover(p) { return flowSlotAt(p) >= 0 ? 'pointer' : 'default'; },
  };
  function nameAssign(nm) {
    if (F.sel < 0) { showHint('먼저 캔버스에서 ? 칸을 눌러 주세요.'); return; }
    const i = F.sel; F.names[i] = nm; F.bad[i] = false; Sound.click();
    const g = dgGeom(); const s = [g.rep.slot, g.tx.slot, g.tl.slot][i];
    parts.burst(s[0], s[1], { count: 8, speed: 80, life: 0.5, size: 3 });
    F.sel = nextEmptySlot(); updateCtl();
  }

  function drawFlowCell(dt, t) {
    const R = cellRect(), s = Math.min(R.w / SC_W, R.h / SC_H);
    const euk = F.cell === 'euk';
    ctx.save(); ctx.translate(R.x, R.y); ctx.scale(s, s);
    const tm = flowTimes(), T0 = F.t;
    const txP = clamp(T0 / tm.txEnd, 0, 1);
    // 세포 바깥 · 세포질
    D.shadow(() => { D.roundRect(0, 0, SC_W, SC_H, 64); ctx.fillStyle = euk ? '#fff7df' : '#f2fbe9'; ctx.fill(); }, { blur: 10, y: 3 });
    ctx.strokeStyle = euk ? '#d9a441' : '#6aa84f'; ctx.lineWidth = euk ? 4 : 7; D.roundRect(0, 0, SC_W, SC_H, 64); ctx.stroke();
    if (!euk) { ctx.strokeStyle = '#bde08e'; ctx.lineWidth = 2; D.roundRect(9, 9, SC_W - 18, SC_H - 18, 56); ctx.stroke(); }
    pill(SC_W - 18, 26, euk ? '진핵 세포' : '원핵 세포', { bg: euk ? '#d9a441' : '#6aa84f', color: '#fff', size: 15, align: 'right' });
    // 핵 또는 핵양체
    const DNAy = 120, MRy = 238;
    if (euk) {
      D.shadow(() => { ctx.beginPath(); ctx.ellipse(165, 180, 150, 130, 0, 0, TAU); ctx.fillStyle = '#e9e4ff'; ctx.fill(); }, { blur: 8, y: 2 });
      ctx.strokeStyle = '#7c6ad8'; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(165, 180, 150, 130, 0, 0, TAU); ctx.stroke();
      ctx.strokeStyle = '#c9c0ff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(165, 180, 142, 122, 0, 0, TAU); ctx.stroke();
      // 핵공
      D.roundRect(290, 224, 18, 30, 6); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#7c6ad8'; ctx.lineWidth = 3; ctx.stroke();
      T(165, 328, '핵', 15, '#5b4bb5', 'center', 800); T(165 + 2, 346, '(전사 · 가공)', 13, '#5b4bb5', 'center', 800);
      T(420, 372, '세포질 (번역)', 15, '#9a6b10', 'center', 800);
    } else {
      ctx.save(); ctx.setLineDash([6, 6]); ctx.strokeStyle = '#6aa84f'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(165, 140, 130, 62, 0, 0, TAU); ctx.stroke(); ctx.restore();
      T(165, 70, '핵양체(핵막 없음)', 14, '#3f7f23', 'center', 800);
      T(165, 372, '전사 · 번역이 같은 공간', 15, '#3f7f23', 'center', 800);
    }
    // DNA
    helix(60, 270, DNAy, 11, t, '#16a34a', '#0d7a4a', { spin: 0.6 });
    T(165, DNAy - 26, 'DNA', 15, '#0d7a4a', 'center', 800);
    // mRNA 길이 · 위치
    const L0 = 170, nx0 = 70, cx0 = 330;
    let mx0 = nx0, my = MRy, grown = L0 * txP, capOn = 0, tailOn = 0, exp = 0;
    let rib = [];   // {x, frac(0..1 진행), alpha}
    if (euk) {
      capOn = clamp((T0 - 3.0) / 0.5, 0, 1); tailOn = clamp((T0 - 3.5) / 0.7, 0, 1);
      exp = ease.inOutCubic(clamp((T0 - 4.2) / 1.2, 0, 1));
      mx0 = lerp(nx0, cx0, exp);
      const tlP = clamp((T0 - 5.4) / 3.6, 0, 1);
      if (T0 > 5.4 && tlP < 1) rib.push({ x: mx0 + L0 * tlP, frac: tlP, alpha: Math.min(1, (T0 - 5.4) * 3) });
      if (tlP >= 1) rib.push({ x: mx0 + L0, frac: 1, alpha: 1 - clamp((T0 - 9.0) * 2, 0, 1), done: true });
    } else {
      [1.0, 1.8, 2.6].forEach((st) => {
        if (T0 < st) return;
        const front = nx0 + L0 * txP - 10;
        const x = Math.min(nx0 + 46 * (T0 - st), Math.max(nx0, front));
        const frac = clamp((x - nx0) / L0, 0, 1);
        rib.push({ x: Math.min(x, nx0 + L0), frac, alpha: Math.min(1, (T0 - st) * 4), done: frac >= 1 });
      });
    }
    // mRNA 줄
    if (grown > 0.5) {
      const x0 = mx0, x1 = mx0 + grown;
      ctx.strokeStyle = '#8b5cf6'; ctx.lineWidth = 5; ctx.lineCap = 'round';
      ctx.beginPath();
      for (let x = x0; x <= x1; x += 4) { const yy = my + Math.sin((x - x0) / 9) * 2.2; if (x === x0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy); }
      ctx.stroke();
      T(x0 - 12, my + 5, P5, 13, '#6d3fd6', 'right', 800);
      if (txP >= 1 || !euk) T(x1 + 12, my + 5, txP >= 1 ? P3 : '', 13, '#6d3fd6', 'left', 800);
      if (euk && capOn > 0) { D.sphere(x0 - 3, my, 7 * capOn, '#f97316', {}); if (capOn > 0.9) T(x0 - 3, my - 16, '캡', 13, '#c2570a', 'center', 800); }
      if (euk && tailOn > 0) {
        ctx.strokeStyle = '#facc15'; ctx.lineWidth = 4;
        ctx.beginPath(); for (let i = 0; i <= 14 * tailOn; i++) { const x = x1 + 4 + i * 2.6, yy = my + 3 + Math.sin(i * 1.3) * 4; if (i) ctx.lineTo(x, yy); else ctx.moveTo(x, yy); } ctx.stroke();
        if (tailOn > 0.9) T(x1 + 24, my - 14, '폴리 A', 13, '#a16207', 'center', 800);
      }
    }
    // 전사 효소
    if (T0 > 0 && T0 < tm.txEnd) {
      const ex = 60 + 210 * txP;
      D.shadow(() => { ctx.beginPath(); ctx.ellipse(ex, DNAy, 20, 24, 0, 0, TAU); ctx.fillStyle = 'rgba(167,139,250,.92)'; ctx.fill(); }, { blur: 6, y: 2 });
      ctx.strokeStyle = '#6d28d9'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(ex, DNAy, 20, 24, 0, 0, TAU); ctx.stroke();
      T(ex, DNAy - 34, 'RNA 중합 효소', 13, '#6d28d9', 'center', 800);
      ctx.strokeStyle = '#8b5cf6'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(ex - 4, DNAy + 18); ctx.lineTo(nx0 + L0 * txP, my - 3); ctx.stroke();
    }
    // 리보솜 + 단백질 사슬
    rib.forEach((r, i) => {
      const x = euk ? r.x : r.x, nB = Math.round(clamp(r.frac, 0, 1) * 9);
      ctx.save(); ctx.globalAlpha = r.alpha;
      ribo(x, my, 0.52, {});
      const pts = [];
      for (let k = 0; k < nB; k++) pts.push({ x: x - 6 + Math.sin(k * 0.9 + i) * 6, y: my + 30 + k * 8.5 });
      beads(pts, 4.4, '#f59e0b', { cols: ['#f59e0b', '#fbbf24'] });
      if (r.done) { const p = clamp(F.t - (F.cell === 'euk' ? 9.0 : 6.5), 0, 1); D.sphere(x - 6, my + 104 + p * 40, 11, '#f59e0b', {}); }
      ctx.restore();
    });
    if (euk && T0 > 0 && tm.txEnd) { if (T0 > 5.4) T(cx0 + 90, my - 50, '5′→3′ 방향으로 번역', 13, '#9a6b10', 'center', 800); }
    ctx.restore();
    // 단계 문구
    const phrase = flowPhaseText();
    TF(R.x + R.w / 2, R.y + R.h + (PHONE ? 22 : 24), phrase, R.w - 16, PHONE ? 14 : 15.5, 12, '#1f2d44', 'center', 800);
  }
  function drawChain() {
    const c = chainStrip(), tm = flowTimes(), T0 = F.t, euk = F.cell === 'euk';
    const stage = [T0 > 0.2, euk ? T0 > 5.4 + 1 : T0 > 1.8 + 1.2, euk ? T0 >= 9 : T0 >= 6.5, euk ? T0 >= 9 : T0 >= 6.5];
    const items = [['DNA 염기 서열', '#16a34a'], ['아미노산 서열', '#f59e0b'], ['단백질의 기능', '#0ea5e9'], ['형질', '#ec4899']];
    const n = 4, gap = PHONE ? 20 : 26, w = (c.w - gap * (n - 1)) / n, h = PHONE ? 44 : 50;
    items.forEach((it, i) => {
      const x = c.x + i * (w + gap), y = c.y + (c.h - h) / 2 + (PHONE ? 6 : 0);
      const on = stage[i];
      D.shadow(() => { D.roundRect(x, y, w, h, 12); ctx.fillStyle = on ? C.mix('#ffffff', it[1], 0.3) : '#fff'; ctx.fill(); }, { blur: on ? 8 : 4, y: 2 });
      ctx.strokeStyle = on ? it[1] : '#cbd5e1'; ctx.lineWidth = on ? 3 : 2; D.roundRect(x, y, w, h, 12); ctx.stroke();
      TF(x + w / 2, y + h / 2 + 5, it[0], w - 8, 14.5, 11.5, on ? C.shade(it[1], -0.4) : '#64748b', 'center', 800);
      if (i < n - 1) D.arrow(x + w + 3, y + h / 2, x + w + gap - 3, y + h / 2, { color: on ? '#475569' : '#cbd5e1', width: 3, head: 9 });
    });
    T(c.x + 2, c.y + 12, '정보 → 기능 → 형질', 13, '#64748b', 'left', 800);
    if (T0 >= (euk ? 9 : 6.5)) T(c.x + c.w - 2, c.y + 12, '예) 갈색 눈 형질의 효소 단백질', 13, '#64748b', 'right', 700);
  }
  function flowDraw(dt, t) {
    flowStep(dt);
    drawDiagram(); drawChain(); drawFlowCell(dt, t);
    T(PHONE ? 14 : 14, 30, F.cell === 'euk' ? '진핵생물: 유전자 발현 과정' : '원핵생물: 유전자 발현 과정', 17, '#334155', 'left', 800);
  }

  /* =========================================================
     ② 전사: 프로모터 → 신장 → 종결, 그리고 진핵 RNA 가공
     ========================================================= */
  const TXN = 29, TX_G0 = 4, TX_G1 = 25;     // 프로모터 0~3 · 유전자 4~24 · 종결 서열 25~28
  const TX = { choice: null, t: 0, running: false, state: 'idle', q: 2, lift: 1, unw: 0, n: 0, cam: 0, done: false, ok: false, fail: false, born: [], mrna: '', everOK: false, msg: '' };
  const twT = () => (PHONE ? 36 : 34);
  const txVis = () => Math.floor((VW - 24) / twT());
  const TX_TIMES = { bind: 1.4, elong: 5.75, term: 1.0, rel: 0.9 };
  function txReset() {
    TX.running = false; TX.t = 0; TX.state = 'idle'; TX.q = 2; TX.lift = 1; TX.unw = 0; TX.n = 0; TX.done = false; TX.ok = false; TX.fail = false; TX.born = []; TX.mrna = ''; TX.cam = 0; TX.msg = '';
    updateCtl();
  }
  function txPick(c) { TX.choice = c; txReset(); updateCtl(); }
  function txRun() {
    if (TX.running || !TX.choice) { if (!TX.choice) showHint('먼저 주형으로 쓸 가닥을 골라 주세요.'); return; }
    txReset(); TX.running = true; Sound.click();
  }
  function txStep(dt) {
    if (!TX.running) { TX.cam = approach(TX.cam, txCamTarget(), dt, 6); return; }
    TX.t += dt;
    const t = TX.t, B = TX_TIMES.bind, E1 = B + TX_TIMES.elong, T1 = E1 + TX_TIMES.term, R1 = T1 + TX_TIMES.rel;
    const wrongStrand = TX.choice === 'top';
    if (t < B) {
      TX.state = 'bind'; TX.q = 2; TX.lift = 1 - smooth(t / 0.7); TX.unw = smooth((t - 0.7) / 0.7);
    } else if (wrongStrand) {
      TX.state = 'fail'; TX.q = 2; TX.lift = 0; TX.unw = 1;
      if (!TX.fail) { TX.fail = true; Sound.fail(); }
      if (t > B + 2.4) { TX.running = false; }
    } else if (t < E1) {
      TX.state = 'elong'; const u = t - B; TX.q = u < 0.5 ? lerp(2, 4, u / 0.5) : 4 + (u - 0.5) * 4; TX.lift = 0; TX.unw = 1;
    } else if (t < T1) {
      TX.state = 'term'; TX.q = 25 + (t - E1) * 2; TX.lift = 0; TX.unw = 1;
    } else if (t < R1) {
      TX.state = 'release'; const p = (t - T1) / TX_TIMES.rel; TX.q = 27; TX.lift = -smooth(p); TX.unw = 1 - smooth(p);
    } else {
      TX.state = 'done'; TX.running = false; TX.done = true; TX.q = 27; TX.lift = -1; TX.unw = 0;
      TX.ok = TX.mrna === MRNA; if (TX.ok && !TX.everOK) { TX.everOK = true; Sound.success(); }
    }
    if (!wrongStrand && t >= B) {
      const n = clamp(Math.floor(TX.q - TX_G0 + 1e-6), 0, 21);
      if (n > TX.n) { for (let i = TX.n; i < n; i++) TX.born[i] = t; TX.n = n; }
      if (TX.state === 'term' || TX.state === 'release' || TX.state === 'done') TX.n = 21;
      TX.mrna = MRNA.slice(0, TX.n);
    }
    TX.cam = approach(TX.cam, txCamTarget(), dt, 5);
  }
  function txCamTarget() {
    const vis = txVis(); if (TX.state === 'done') return clamp(TXN - vis - 0, 0, TXN - vis) * 0.5;
    return clamp(TX.q - (PHONE ? 5 : 9), 0, TXN - vis);
  }
  const txX = (i) => 12 + (i - TX.cam) * twT();
  function txOpen(i) {
    const d = i + 0.5 - TX.q;
    const o = d >= 0 ? smooth(1 - d / 2.6) : smooth(1 + d / 1.6);
    return o * TX.unw;
  }
  function txDraw(dt, t) {
    txStep(dt);
    const tw = twT(), th = 34, y0 = PHONE ? 196 : 168, vis = txVis();
    // 단계 칩
    const phs = [['개시', 'bind'], ['신장', 'elong'], ['종결', 'term']];
    const curPh = TX.state === 'bind' || TX.state === 'fail' ? 0 : TX.state === 'elong' ? 1 : (TX.state === 'term' || TX.state === 'release' || TX.state === 'done') ? 2 : -1;
    phs.forEach((p, i) => {
      const cx = VW / 2 + (i - 1) * 104, on = curPh === i;
      pill(cx, 36, (i + 1) + ' ' + p[0], { bg: on ? '#7c3aed' : '#fff', color: on ? '#fff' : '#64748b', border: on ? '#7c3aed' : '#cbd5e1', size: 15 });
    });
    const sub = TX.state === 'idle' ? (TX.choice ? '▶ 전사 시작을 눌러요' : '먼저 주형 가닥을 골라요')
      : TX.state === 'bind' ? 'RNA 중합 효소가 프로모터에 결합하고 DNA 이중 가닥이 풀려요'
        : TX.state === 'elong' ? '주형을 따라 이동하며 상보적인 RNA 뉴클레오타이드를 연결해요'
          : TX.state === 'term' ? '종결 서열에 도착!' : TX.state === 'release' ? 'RNA 중합 효소와 RNA가 DNA에서 떨어져요'
            : TX.state === 'fail' ? '' : '전사 완료! mRNA 5′→3′ 가 만들어졌어요';
    TF(VW / 2, 70, sub, VW - 24, 14.5, 12, '#334155', 'center', 800);
    // 가닥 이름표 (범례)
    const tl = TX.choice ? (TX.choice === 'top' ? ['위쪽: 주형 가닥', '아래쪽: 암호화 가닥'] : ['위쪽: 암호화(비주형) 가닥', '아래쪽: 주형 가닥']) : ['위쪽 가닥', '아래쪽 가닥'];
    const topCol = TX.choice === 'top' ? '#7c3aed' : '#16a34a', botCol = TX.choice === 'bottom' ? '#7c3aed' : TX.choice ? '#16a34a' : '#64748b';
    const legY = PHONE ? 100 : 98;
    pill(12, legY, tl[0] + ' ' + P5 + '→' + P3, { bg: '#fff', color: topCol, border: topCol, size: 13, align: 'left' });
    pill(PHONE ? 12 : VW - 12, PHONE ? legY + 28 : legY, tl[1] + ' ' + P3 + '→' + P5, { bg: '#fff', color: botCol, border: botCol, size: 13, align: PHONE ? 'left' : 'right' });
    const yTop = (i) => y0 - 18 * txOpen(i), yBot = (i) => y0 + th + 6 + 18 * txOpen(i);
    // 영역 이름
    const rgn = [[0, 4, '프로모터', '#0ea5e9'], [4, 25, '암호화 부분', '#16a34a'], [25, 29, '종결 서열', '#ef4444']];
    rgn.forEach((r) => {
      const xa = txX(r[0]), xb = txX(r[1]);
      if (xb < 0 || xa > VW) return;
      const a = Math.max(8, xa + 2), b = Math.min(VW - 8, xb - 2);
      ctx.strokeStyle = r[3]; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(a, y0 - 42); ctx.lineTo(b, y0 - 42); ctx.stroke();
      if (b - a > 70) T((a + b) / 2, y0 - 48, r[2], 13, r[3], 'center', 800);
    });
    // DNA 타일
    for (let i = 0; i < TXN; i++) {
      const x = txX(i); if (x < -tw || x > VW) continue;
      const inGene = i >= TX_G0 && i < TX_G1, gi = i - TX_G0;
      const o = txOpen(i);
      if (inGene) {
        const isT = TX.choice === 'top';
        baseTile(x, yTop(i), tw, th, GENE[gi], { hl: isT && TX.choice ? '#7c3aed' : null });
        baseTile(x, yBot(i), tw, th, TEMPL[gi], { hl: TX.choice === 'bottom' ? '#7c3aed' : null });
        if (o < 0.55) { ctx.strokeStyle = 'rgba(100,116,139,.55)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + tw / 2 - 3, yTop(i) + th); ctx.lineTo(x + tw / 2 - 3, yBot(i)); ctx.moveTo(x + tw / 2 + 3, yTop(i) + th); ctx.lineTo(x + tw / 2 + 3, yBot(i)); ctx.stroke(); }
      } else {
        const col = i < TX_G0 ? '#0ea5e9' : '#ef4444';
        baseTile(x, yTop(i), tw, th, '', { fill: C.mix('#ffffff', col, 0.2), blank: true, hl: C.shade(col, 0.1) });
        baseTile(x, yBot(i), tw, th, '', { fill: C.mix('#ffffff', col, 0.2), blank: true, hl: C.shade(col, 0.1) });
        T(x + tw / 2, yTop(i) + th / 2 + 4, '·', 18, col, 'center', 800); T(x + tw / 2, yBot(i) + th / 2 + 4, '·', 18, col, 'center', 800);
      }
    }
    // 5′ 3′ 끝 표시
    const e0 = txX(0), e1 = txX(TXN);
    if (e0 > 16) { T(e0 - 4, y0 + th / 2 + 6, P5, 14, '#475569', 'right', 800); T(e0 - 4, y0 + th + 6 + th / 2 + 6, P3, 14, '#475569', 'right', 800); }
    if (e1 < VW - 14) { T(e1 + 4, y0 + th / 2 + 6, P3, 14, '#475569', 'left', 800); T(e1 + 4, y0 + th + 6 + th / 2 + 6, P5, 14, '#475569', 'left', 800); }
    // RNA 타일
    for (let i = 0; i < TX.n; i++) {
      const gi = TX_G0 + i, x = txX(gi); if (x < -tw || x > VW) continue;
      const age = TX.n - i, born = TX.born[i] || 0, bt = clamp((TX.t - born) / 0.28, 0, 1);
      const rel = TX.state === 'release' || TX.state === 'done' ? smooth((TX.t - (TX_TIMES.bind + TX_TIMES.elong + TX_TIMES.term)) / TX_TIMES.rel) : 0;
      const dropAway = clamp((age - 7) / 6, 0, 1) * 62 + rel * 36;
      const y = yBot(gi) + th + 5 + dropAway - (1 - ease.outBack(bt)) * 26;
      ctx.save(); ctx.globalAlpha = Math.min(1, bt * 1.6);
      baseTile(x, y, tw, th, MRNA[i], { solid: true });
      if (dropAway < 6 && i > 0) { /* 짝짓기 막대 */ }
      ctx.restore();
      if (dropAway < 40) { ctx.strokeStyle = 'rgba(100,116,139,.55)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + tw / 2 - 3, yBot(gi) + th); ctx.lineTo(x + tw / 2 - 3, y + 2); ctx.moveTo(x + tw / 2 + 3, yBot(gi) + th); ctx.lineTo(x + tw / 2 + 3, y + 2); ctx.stroke(); }
    }
    // RNA 중합 효소
    if (TX.state !== 'idle' || true) {
      const px = txX(TX.q), pw = tw * 4.4, ph = th * 2 + 6 + 64;
      const idle = TX.state === 'idle';
      const hover = idle ? 1 : TX.lift;
      const yy = y0 - 12 - (hover > 0 ? hover * 70 : 0) + (hover < 0 ? hover * 70 : 0);
      const ax = idle ? (PHONE ? 90 : 120) : px;
      const al = idle ? 0.95 : clamp(1 - Math.abs(Math.min(0, TX.lift)) * 1.1, 0, 1);
      const sh = TX.state === 'fail' && !RM ? Math.sin(t * 30) * 4 : 0;
      ctx.save(); ctx.globalAlpha = al;
      D.shadow(() => { D.roundRect(ax - pw / 2 + sh, yy, pw, ph, 28); ctx.fillStyle = 'rgba(167,139,250,.38)'; ctx.fill(); }, { blur: 8, y: 3 });
      ctx.strokeStyle = TX.state === 'fail' ? '#e2464b' : '#7c3aed'; ctx.lineWidth = 3.5; D.roundRect(ax - pw / 2 + sh, yy, pw, ph, 28); ctx.stroke();
      pill(ax + sh, yy - 14, 'RNA 중합 효소', { bg: '#f5f3ff', color: '#6d28d9', border: '#7c3aed', size: 13 });
      ctx.restore();
      if (TX.state === 'fail') { T(ax, yy + ph / 2 + 10, '✕', 38, '#e2464b', 'center', 800, { stroke: '#fff', strokeWidth: 5 }); }
    }
    // 방향 안내
    if (TX.state === 'elong' || TX.state === 'term') {
      const ay = y0 - 66;
      if (!PHONE) { D.arrow(txX(TX.q) - 30, ay, txX(TX.q) + 40, ay, { color: '#7c3aed', width: 3, head: 10 }); T(txX(TX.q) + 48, ay + 5, '이동 방향', 13, '#7c3aed', 'left', 800); }
    }
    // 실패 안내 · 완성된 mRNA
    if (TX.state === 'fail' && TX.t > TX_TIMES.bind + 0.6) {
      const bx = 16, by = PHONE ? 392 : 346, bw = VW - 32, bh = PHONE ? 140 : 112;
      panel(bx, by, bw, bh, 14, '#fff4f4'); ctx.strokeStyle = '#e2464b'; ctx.lineWidth = 2; D.roundRect(bx, by, bw, bh, 14); ctx.stroke();
      T(bx + 14, by + 24, '이 가닥으로는 전사를 시작할 수 없어요', 15.5, '#b91c1c', 'left', 800);
      textBlock(bx + 14, by + 48, bw - 28, '위쪽 가닥은 왼쪽 → 오른쪽이 5′ → 3′ 방향이에요. RNA 중합 효소는 주형을 3′ → 5′ 방향으로 읽으며 RNA를 5′ → 3′ 방향으로 만들어요. 프로모터가 왼쪽에 있어서 이 DNA에서는 오른쪽으로 가며 3′ → 5′로 읽히는 아래쪽 가닥이 주형이에요.', 14, '#7f1d1d', PHONE ? 20 : 19, 700);
    }
    if (TX.n > 0 && TX.state !== 'fail') {
      const done = TX.done, y = PHONE ? 420 : 392;
      const txt = P5 + '-' + (mrnaCodons(TX.mrna).join(' ')) + (done ? '' : '…') + '-' + (done ? P3 : '');
      panel(14, y - 30, VW - 28, PHONE ? 118 : 100, 14, '#faf7ff');
      T(26, y - 8, 'mRNA', 14, '#6d28d9', 'left', 800);
      TF(26, y + 22, done ? P5 + '-' + mrnaCodons(TX.mrna).join(' ') + '-' + P3 : P5 + '-' + mrnaCodons(TX.mrna).join(' ') + ' …', VW - 52, 22, 13, '#1f2d44', 'left', 800, {});
      if (done) {
        const cmp = TX.ok ? '암호화 가닥과 같은 서열(T 대신 U), 주형 가닥과는 상보적' : '기대한 mRNA와 달라요';
        TF(26, y + 50, cmp, VW - 52, 14.5, 12, TX.ok ? '#15803d' : '#b91c1c', 'left', 800);
        T(26, y + 72, '아미노산을 만들 정보는 AUG ~ UAA 사이의 코돈이에요', 13.5, '#64748b', 'left', 700);
      }
    }
    if (TX.state === 'idle' && !TX.choice) { /* 안내 */
      textBlock(18, PHONE ? 400 : 350, VW - 36, 'RNA 중합 효소는 프로모터에서 출발해요. DNA 두 가닥 중 어느 쪽을 주형으로 읽을까요?', 15, '#475569', 21, 800);
    }
  }

  /* ---------- RNA 가공 (핵 안) ---------- */
  const SEG = [['e', 150], ['i', 900], ['e', 200], ['i', 1200], ['e', 250]];
  const PR = { ops: [], cap: 0, capT: 0, sp: 0, spT: 0, tail: 0, tailT: 0, exp: 0, expT: 0, exporting: false, exported: false, dropI: 0, dropT: 0 };
  const procU = () => (PHONE ? 330 : 590) / 2700;
  function procReset() {
    PR.ops = []; PR.cap = PR.capT = PR.sp = PR.spT = PR.tail = PR.tailT = PR.exp = PR.expT = 0; PR.exporting = false; PR.exported = false; PR.dropI = PR.dropT = 0;
    SciSim.tween(PR, { capT: 0, spT: 0, tailT: 0, expT: 0 }, { duration: 0.0001 });
    updateCtl();
  }
  function procOp(k) {
    if (PR.ops.indexOf(k) >= 0 || PR.exporting) return;
    PR.ops.push(k); Sound.click();
    if (k === 'cap') SciSim.tween(PR, { capT: 1 }, { duration: 0.8, ease: 'outBack' });
    if (k === 'splice') SciSim.tween(PR, { spT: 1 }, { duration: 1.6, ease: 'inOutCubic' });
    if (k === 'tail') SciSim.tween(PR, { tailT: 1 }, { duration: 1.0, ease: 'outCubic' });
    updateCtl();
  }
  function procExport() {
    if (PR.ops.length < 3 || PR.exporting || PR.exported) return;
    PR.exporting = true; Sound.click();
    SciSim.tween(PR, { expT: 1 }, { duration: 3.2, ease: 'inOutCubic', onDone: () => { PR.exported = true; PR.exporting = false; updateCtl(); } });
    updateCtl();
  }
  const procLen = () => 2700 - PR.spT * 2100;
  function procDraw(dt, t) {
    const u = procU(), x0 = PHONE ? 44 : 60, yBar = PHONE ? 176 : 176, bh = 30;
    // 핵 · 세포질 배경
    const envY = PHONE ? 330 : 300;
    D.roundRect(8, 58, VW - 16, envY - 58, 18); ctx.fillStyle = '#ece8ff'; ctx.fill();
    D.roundRect(8, envY, VW - 16, VH - envY - 8, 18); ctx.fillStyle = '#fff4dc'; ctx.fill();
    const pxC = VW / 2 + (PHONE ? 20 : 60);
    ctx.strokeStyle = '#7c6ad8'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(14, envY); ctx.lineTo(pxC - 22, envY); ctx.moveTo(pxC + 22, envY); ctx.lineTo(VW - 14, envY); ctx.stroke();
    ctx.strokeStyle = '#b5a9f5'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(14, envY + 6); ctx.lineTo(pxC - 22, envY + 6); ctx.moveTo(pxC + 22, envY + 6); ctx.lineTo(VW - 14, envY + 6); ctx.stroke();
    T(22, 82, '핵 (전사 · RNA 가공)', 15, '#5b4bb5', 'left', 800); T(22, envY + 28, '세포질 (번역)', 15, '#9a6b10', 'left', 800);
    T(pxC, envY - 10, '핵공', 13, '#5b4bb5', 'center', 800);
    // mRNA 모양 (핵 안, 막대)
    const sp = PR.spT;
    if (PR.expT <= 0.001 || !PR.exporting && !PR.exported) {
      const xc = x0 + 24 * PR.capT;       // 캡을 붙이면 5′ 끝이 약간 밀려요 (막대는 그대로)
      let x = x0;
      const segs = [];
      SEG.forEach((s, i) => {
        const isE = s[0] === 'e', w = s[1] * u * (isE ? 1 : (1 - sp));
        segs.push({ s, x, w, i });
        x += w;
      });
      const xEnd = x;
      ctx.lineCap = 'round';
      // 인트론: 위로 올라간 고리 (제거 중) 또는 선
      segs.forEach((g) => {
        if (g.s[0] === 'i') {
          if (g.w > 0.5) {
            const loop = Math.sin(clamp(sp, 0, 1) * Math.PI) * 60 + 4;
            ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 4;
            ctx.beginPath(); ctx.moveTo(g.x, yBar + bh / 2); ctx.bezierCurveTo(g.x + g.w * 0.1, yBar + bh / 2 - loop * 1.35, g.x + g.w * 0.9, yBar + bh / 2 - loop * 1.35, g.x + g.w, yBar + bh / 2); ctx.stroke();
            if (sp > 0.02) { ctx.fillStyle = 'rgba(148,163,184,.25)'; ctx.fill(); }
          }
        }
      });
      // 엑손 상자
      segs.forEach((g) => {
        if (g.s[0] === 'e') {
          D.shadow(() => { D.roundRect(g.x, yBar, g.w, bh, 5); ctx.fillStyle = '#34b27b'; ctx.fill(); }, { blur: 4, y: 2 });
          ctx.strokeStyle = '#1f7a52'; ctx.lineWidth = 2; D.roundRect(g.x, yBar, g.w, bh, 5); ctx.stroke();
        }
      });
      // 5′ 캡 · 폴리 A
      if (PR.capT > 0.02) { const r = 9 * PR.capT; D.sphere(x0 - 6 - r * 0.2, yBar + bh / 2, r, '#f97316', {}); T(x0 - 6, yBar + bh + 22, '5′ 캡', 13.5, '#c2570a', 'center', 800); }
      if (PR.tailT > 0.02) {
        const L = 200 * u * PR.tailT; ctx.strokeStyle = '#facc15'; ctx.lineWidth = 5; ctx.beginPath();
        const n = Math.max(2, Math.round(L / 3));
        for (let i = 0; i <= n; i++) { const xx = xEnd + 3 + L * i / n, yy = yBar + bh / 2 + Math.sin(i * 0.9) * 4; if (i) ctx.lineTo(xx, yy); else ctx.moveTo(xx, yy); } ctx.stroke();
        if (PR.tailT > 0.8) T(xEnd + 3 + L / 2, yBar + bh + 22, '폴리 A 꼬리(약 200 nt)', 13, '#a16207', 'center', 800);
      }
      // 이름표 (엑손 · 인트론 길이)
      segs.forEach((g, k) => {
        const lab = g.s[0] === 'e' ? '엑손 ' + g.s[1] : '인트론 ' + g.s[1];
        const cx = g.x + g.w / 2;
        if (g.s[0] === 'e') T(cx, yBar - 10 - (sp > 0.5 && (g.i / 2) % 2 === 1 ? 17 : 0), PHONE ? String(g.s[1]) : lab, 13, '#1f7a52', 'center', 800);
        else if (g.w > 40) T(cx, yBar + bh + 22 + (g.i === 3 ? 0 : 0), PHONE ? '인트론 ' + g.s[1] : lab, 13, '#64748b', 'center', 800);
      });
      if (sp > 0.02 && sp < 0.999) {
        T(VW / 2, yBar - 78, '인트론이 고리로 빠지며 엑손이 이어져요', 14.5, '#334155', 'center', 800);
      }
      // 암호 부분 괄호 (스플라이싱 후)
      if (sp > 0.99) {
        const cs = segs[0].x + 30 * u, ce = segs[0].x + 573 * u;
        ctx.strokeStyle = '#0d7a4a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cs, yBar + bh + 8); ctx.lineTo(cs, yBar + bh + 14); ctx.lineTo(ce, yBar + bh + 14); ctx.lineTo(ce, yBar + bh + 8); ctx.stroke();
        T((cs + ce) / 2, yBar + bh + 36, '암호 부분 543 nt', 13.5, '#0d7a4a', 'center', 800);
      }
      // 길이 표시
      const lenTxt = '길이 ' + fmtN(Math.round(procLen())) + ' nt' + (PR.capT > 0.9 || PR.tailT > 0.9 ? ' + 캡' + (PR.tailT > 0.9 ? ' + 폴리 A(약 200 nt)' : '') : '');
      TF(x0, yBar + bh + (sp > 0.99 ? 72 : 60), lenTxt, VW - 2 * x0, 16, 12, '#1f2d44', 'left', 800);
      // 떨어져 나간 인트론
      if (sp > 0.6) {
        const fall = (sp - 0.6) / 0.4;
        [1, 3].forEach((k, j) => { const w = SEG[k][1] * u * 0.3; const cx = x0 + (j ? 190 : 90) + (PHONE ? -20 : 0); const yy = yBar - 40 + fall * 120;
          ctx.save(); ctx.globalAlpha = Math.max(0, 1 - fall * 0.9); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(cx, yy, Math.max(10, w * 0.5), 12, 0, 0, TAU); ctx.stroke(); T(cx, yy + 4, '인트론', 12, '#64748b', 'center', 800); ctx.restore(); });
      }
    }
    // 핵공 통과: 경로를 따라 이동
    if (PR.exporting || PR.exported) {
      const Lm = (600 * u) + (PR.tailT * 200 * u) + 14, yb = yBar + bh / 2;
      const yOut = envY + (PHONE ? 140 : 130);
      const path = [[pxC + Lm, yb], [pxC, yb], [pxC, yOut], [pxC + Lm, yOut]];
      const segLen = [Lm, yOut - yb, Lm], tot = segLen[0] + segLen[1] + segLen[2];
      const at = (d) => { d = clamp(d, 0, tot); if (d <= segLen[0]) return [path[0][0] - d, yb]; d -= segLen[0]; if (d <= segLen[1]) return [pxC, yb + d]; d -= segLen[1]; return [pxC + d, yOut]; };
      const head = Lm + (tot - Lm) * PR.expT;
      ctx.strokeStyle = '#8b5cf6'; ctx.lineWidth = 11; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath();
      const nP = 60; for (let i = 0; i <= nP; i++) { const p = at(head - Lm + Lm * i / nP); if (i) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); } ctx.stroke();
      const ph = at(head); D.sphere(ph[0], ph[1], 9, '#f97316', {});
      const pt = at(head - Lm); ctx.strokeStyle = '#facc15'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(pt[0], pt[1]); const pt2 = at(head - Lm + 14); ctx.lineTo(pt2[0], pt2[1]); ctx.stroke();
      if (PR.exported) { T(pxC + Lm / 2, yOut - 22, '성숙한 mRNA → 리보솜으로', 14.5, '#5b21b6', 'center', 800); }
      else T(pxC + 60, envY - 40, '5′ 캡 쪽부터 핵공을 통과', 14, '#5b21b6', 'left', 800);
    }
    // 동작 순서 안내
    if (!PR.ops.length) textBlock(14, PHONE ? 470 : 456, VW - 28, '아래 세 가지 가공 중 순서를 생각해 하나씩 눌러 보세요. 전구 mRNA: 엑손 150 + 인트론 900 + 엑손 200 + 인트론 1200 + 엑손 250 = 2700 nt', 14, '#475569', 20, 700);
  }

  /* =========================================================
     ③ 번역: 개시 → 신장(A · P · E 자리) → 종결, 폴리리보솜
     ========================================================= */
  const LEAD = 'GCCACC', TRAIL = 'GCU';
  const TL_M = LEAD + MRNA + TRAIL;                       // 30염기
  const TL_COD = mrnaCodons(MRNA);                         // AUG GAA CCA UGG UUU AAA UAA
  const TL_AA = TL_COD.map(codonAA);                       // M E P W F K *
  const antiOf = (cod) => cod.split('').map((c) => CMP_RR[c]).join('');   // 왼쪽부터 읽는 안티코돈 (3′→5′)
  const TL = {
    state: 'idle', t: 0, rk: 0, sub: 0, large: 0, chain: [], trna: [], cand: [], pick: -1, added: 0, initDone: false, released: false, wrongs: 0,
    cam: 0, wob: 0, flying: null, rel: 0, relBead: null, shake: 0, seed: 7,
  };
  const tlW = () => 30;
  const tlX = (tile) => 14 + (tile - TL.cam) * tlW();
  const tlY = () => (PHONE ? 330 : 270);
  const codStart = (c) => 6 + 3 * c;
  function tlReset() {
    Object.assign(TL, { state: 'idle', t: 0, rk: 0, sub: 0, large: 0, chain: [], trna: [], cand: [], pick: -1, added: 0, initDone: false, released: false, flying: null, rel: 0, relBead: null, shake: 0, cam: 0 });
    SciSim.tween(TL, { sub: 0, large: 0 }, { duration: 0.0001 });
    updateCtl();
  }
  function tlStart() {
    if (TL.state !== 'idle') return;
    TL.state = 'scan'; TL.t = 0; Sound.click(); updateCtl();
  }
  function tlMakeCands() {
    const c = TL.rk + 1; const cod = TL_COD[c]; const rnd = mulberry(TL.seed * 31 + c * 7);
    const correct = { aa: TL_AA[c], anti: antiOf(cod), ok: true };
    const pool = []; for (let i = 0; i < 40; i++) {
      const a = 'AUGC'; const k = [0, 1, 2].map(() => a[Math.floor(rnd() * 4)]).join('');
      const x = codonAA(k); const an = antiOf(k);
      // 올바른 안티코돈과 두 군데 이상 달라야 해요
      let diff = 0; for (let j = 0; j < 3; j++) if (an[j] !== correct.anti[j]) diff++;
      if (x !== '*' && x !== correct.aa && diff >= 2 && !pool.some((p) => p.anti === an || p.aa === x)) pool.push({ aa: x, anti: an, ok: false });
      if (pool.length >= 2) break;
    }
    const list = [correct, pool[0], pool[1]];
    for (let i = 2; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t = list[i]; list[i] = list[j]; list[j] = t; }
    TL.cand = list.map((c0, i) => Object.assign({ x: 0, y: 0, alpha: 0, sc: 0.8, i, bad: 0 }, c0));
    TL.cand.forEach((c0, i) => { SciSim.tween(c0, { alpha: 1, sc: 1 }, { duration: 0.35, delay: i * 0.08, ease: 'outBack' }); });
  }
  function tlPick(i) {
    if (TL.state !== 'wait' || TL.pick >= 0) return;
    const c = TL.cand[i];
    if (!c) return;
    if (!c.ok) {
      TL.wrongs++; Sound.fail(); c.bad = 1; TL.shake = 0.5;
      showHint('안티코돈 ' + c.anti.split('').join('') + ' 은(는) 코돈 ' + TL_COD[TL.rk + 1] + ' 과(와) 상보적으로 짝지어지지 않아요.');
      wait(() => { c.bad = 0; }, 700);
      return;
    }
    TL.pick = i; Sound.click();
    TL.state = 'enter'; TL.t = 0;
    const slot = tlSiteXY(TL.rk + 1);
    TL.flying = { x: c.x, y: c.y, tx: slot.x, ty: slot.y, aa: c.aa, anti: c.anti, codon: TL.rk + 1, p: 0 };
  }
  function tlSiteXY(c) { return { x: tlX(codStart(c)) + tlW() * 1.5, y: tlY() - 6 }; }
  function tlRelease() { if (TL.state !== 'stopwait') return; TL.state = 'release'; TL.t = 0; Sound.click(); }
  function tlStep(dt) {
    TL.t += dt; TL.shake = Math.max(0, TL.shake - dt);
    const camT = clamp(TL.state === 'idle' || TL.state === 'scan' ? 0 : (codStart(TL.rk) - (PHONE ? 5 : 8)), 0, 30 - Math.floor((VW - 28) / tlW()));
    TL.cam = approach(TL.cam, TL.state === 'idle' ? 0 : camT, dt, 5);
    const S0 = TL.state;
    if (S0 === 'scan') {
      const d = 1.8;
      TL.sub = TL.t / d;      // 0→1 : 소단위체가 mRNA 5′ 쪽에서 AUG까지 이동
      if (TL.t >= d) { TL.sub = 1; TL.state = 'dock'; TL.t = 0; TL.trna = [{ codon: 0, aa: 'M', anti: antiOf('AUG'), alpha: 1, drop: 0, gone: false }]; TL.chain = ['M']; Sound.tick(); }
    } else if (S0 === 'dock') {
      TL.large = smooth(TL.t / 0.9);
      if (TL.t >= 0.9) { TL.large = 1; TL.initDone = true; TL.state = 'wait'; TL.t = 0; tlMakeCands(); updateCtl(); }
    } else if (S0 === 'enter') {
      const f = TL.flying; f.p = clamp(TL.t / 0.55, 0, 1);
      if (TL.t >= 0.55) {
        TL.state = 'bond'; TL.t = 0; Sound.success();
        TL.trna.push({ codon: f.codon, aa: f.aa, anti: f.anti, alpha: 1, drop: 0, gone: false });
        TL.flying = null; TL.cand = []; TL.pick = -1;
      }
    } else if (S0 === 'bond') {
      if (TL.t >= 0.75) {
        TL.chain.push(TL.trna[TL.trna.length - 1].aa); TL.added++;
        if (!RM) { const s = tlSiteXY(TL.rk + 1); parts.burst(s.x, s.y - 70, { count: 8, speed: 70, life: 0.5, size: 3 }); }
        TL.state = 'trans'; TL.t = 0;
      }
    } else if (S0 === 'trans') {
      const p = smooth(TL.t / 0.8);
      TL.wob = p;
      if (TL.t >= 0.8) {
        TL.rk++; TL.wob = 0; TL.trna.forEach((tr) => { if (tr.codon < TL.rk - 1 && !tr.gone) { tr.gone = true; } });
        if (TL_AA[TL.rk + 1] === '*') { TL.state = 'stopwait'; TL.t = 0; }
        else { TL.state = 'wait'; TL.t = 0; tlMakeCands(); }
        updateCtl();
      }
    } else if (S0 === 'release') {
      if (TL.t >= 2.2) { TL.state = 'done'; TL.released = true; Sound.success(); updateCtl(); if (!RM) parts.burst(VW / 2, 120, { count: 22, speed: 140, life: 0.9 }); }
    }
    TL.trna.forEach((tr) => { if (tr.gone) { tr.drop += dt * 90; tr.alpha = Math.max(0, tr.alpha - dt * 1.6); } });
    // 후보 tRNA 위치
    const n = TL.cand.length, ty = tlTokY();
    TL.cand.forEach((c, i) => { c.x = VW * (0.2 + 0.3 * i); c.y = ty; });
  }
  /* tRNA 그림: (cx, yAnti) 에 안티코돈 칸 3개, 위로 줄기와 아미노산 칩 */
  function trnaShape(cx, yAnti, aa, anti, o) {
    o = o || {};
    const tw = o.tw || tlW(), sc = o.sc || 1, al = o.alpha == null ? 1 : o.alpha;
    ctx.save(); ctx.globalAlpha = al; ctx.translate(cx, yAnti); ctx.scale(sc, sc);
    const h = 26, up = o.stem || 64;
    D.shadow(() => {
      ctx.fillStyle = o.bad ? '#fecaca' : '#bae6fd'; D.roundRect(-4, -up, 8, up, 3); ctx.fill();
      ctx.beginPath(); ctx.ellipse(-16, -up * 0.5, 14, 9, 0, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(16, -up * 0.5, 14, 9, 0, 0, TAU); ctx.fill();
      D.roundRect(-tw * 1.5, -h + 2, tw * 3, h, 7); ctx.fill();
    }, { blur: 4, y: 2 });
    ctx.strokeStyle = o.bad ? '#e2464b' : '#0284c7'; ctx.lineWidth = 2; D.roundRect(-tw * 1.5, -h + 2, tw * 3, h, 7); ctx.stroke();
    for (let k = 0; k < 3; k++) { const ch = anti[k]; T(-tw + k * tw, -5, ch, 15, BASE_COL[ch], 'center', 800); }
    if (!o.noChip) aaChip(0, -up - 14, 56, 24, aa, { solid: false });
    ctx.restore();
  }
  const tlTokY = () => (PHONE ? 536 : 456);
  function tlDraw(dt, t) {
    tlStep(dt);
    const tw = tlW(), y = tlY(), H = 28;
    let msg = '';
    switch (TL.state) {
      case 'idle': msg = '리보솜 소단위체가 mRNA의 5′ 쪽에 있어요. [개시 시작]을 눌러요.'; break;
      case 'scan': msg = '개시: 소단위체가 mRNA를 따라 이동하며 시작 코돈 AUG를 찾아요'; break;
      case 'dock': msg = '개시 tRNA(Met)가 AUG에 짝지어지고 대단위체가 붙어요'; break;
      case 'wait': msg = 'A 자리의 코돈 ' + TL_COD[TL.rk + 1] + ' 에 맞는 안티코돈의 tRNA를 골라요'; break;
      case 'enter': msg = 'tRNA가 A 자리로 들어와 코돈과 안티코돈이 짝지어져요'; break;
      case 'bond': msg = '펩타이드 결합: P 자리의 사슬이 A 자리의 아미노산에 연결돼요'; break;
      case 'trans': msg = '리보솜이 코돈 한 칸 이동: A → P → E (빈 tRNA는 떠나요)'; break;
      case 'stopwait': msg = '종결: A 자리에 종결 코돈 ' + TL_COD[TL.rk + 1] + ' — 짝지을 tRNA가 없어요'; break;
      case 'release': msg = '사슬이 방출되고 리보솜이 mRNA에서 떨어져요'; break;
      default: msg = '번역 완료! Met–Glu–Pro–Trp–Phe–Lys 단백질이 만들어졌어요';
    }
    TF(VW / 2, 36, msg, VW - 24, 15.5, 12, '#1f2d44', 'center', 800);
    // 리보솜 위치
    let rcx;
    const pCod = TL.state === 'idle' || TL.state === 'scan' || TL.state === 'dock' ? 0 : TL.rk;
    const pOff = TL.state === 'trans' ? TL.wob : 0;
    const xAUG = tlX(codStart(0) + 1.5);
    if (TL.state === 'idle') rcx = tlX(1.5);
    else if (TL.state === 'scan') rcx = lerp(tlX(1.5), xAUG, smooth(TL.sub));
    else rcx = tlX(codStart(pCod) + 1.5) + pOff * 3 * tw;
    const relP = TL.state === 'release' ? smooth(TL.t / 1.4) : TL.state === 'done' ? 1 : 0;
    // mRNA 줄
    for (let i = 0; i < 30; i++) {
      const x = tlX(i); if (x < -tw || x > VW) continue;
      baseTile(x, y, tw, H, TL_M[i], { solid: true, dim: !(i >= 6 && i < 27) });
    }
    TL_COD.forEach((cd, c) => {
      const x = tlX(codStart(c)); if (x < -3 * tw || x > VW) return;
      ctx.strokeStyle = c === 0 ? '#16a34a' : c === 6 ? '#e2464b' : '#94a3b8'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(x + 2, y + H + 24); ctx.lineTo(x + 3 * tw - 2, y + H + 24); ctx.stroke();
      T(x + 1.5 * tw, y + H + 41, c === 0 ? '시작' : c === 6 ? '종결' : cd, 12.5, c === 0 ? '#16a34a' : c === 6 ? '#e2464b' : '#94a3b8', 'center', 800);
    });
    const e0 = tlX(0), e1 = tlX(30);
    if (e0 > 16) T(e0 - 4, y + H / 2 + 5, P5, 14, '#475569', 'right', 800);
    if (e1 < VW - 14) T(e1 + 4, y + H / 2 + 5, P3, 14, '#475569', 'left', 800);
    // 소단위체 (아래)
    const sw = 4.7 * tw, sd = relP * 40;
    ctx.save(); ctx.globalAlpha = 1 - relP * 0.5;
    D.shadow(() => { ctx.beginPath(); ctx.ellipse(rcx, y + H + 4 + sd, sw * 0.62, 13, 0, 0, TAU); ctx.fillStyle = '#7dd3a8'; ctx.fill(); }, { blur: 5, y: 2 });
    ctx.strokeStyle = '#2f9e6a'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(rcx, y + H + 4 + sd, sw * 0.62, 13, 0, 0, TAU); ctx.stroke();
    T(rcx, y + H + 9 + sd, '소단위체', 13, '#14532d', 'center', 800);
    ctx.restore();
    // 대단위체 (위) + 자리 이름
    const lift = relP * 60, dl = rcx - 4.5 * tw - 6, dr = rcx + 4.5 * tw + 6, dt0 = y - 168 - (1 - TL.large) * 70 - lift;
    const largeA = TL.state === 'idle' || TL.state === 'scan' ? 0 : TL.large * (1 - relP * 0.8);
    if (largeA > 0.02) {
      ctx.save(); ctx.globalAlpha = largeA;
      const path = () => { ctx.beginPath(); ctx.moveTo(dl, y - 8 - lift * 0.2); ctx.bezierCurveTo(dl - 6, dt0 - 30, dr + 6, dt0 - 30, dr, y - 8 - lift * 0.2); ctx.closePath(); };
      D.shadow(() => { path(); ctx.fillStyle = 'rgba(52,178,123,.26)'; ctx.fill(); }, { blur: 6, y: 2 });
      ctx.strokeStyle = '#1f7a52'; ctx.lineWidth = 3; path(); ctx.stroke();
      ['E', 'P', 'A'].forEach((nm, k) => {
        const sx = rcx + (k - 1) * 3 * tw;
        if (k) { ctx.strokeStyle = 'rgba(31,122,82,.4)'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(sx - 1.5 * tw, y - 6); ctx.lineTo(sx - 1.5 * tw, dt0 + 52); ctx.stroke(); ctx.setLineDash([]); }
        pill(sx, dt0 + 54, nm + ' 자리', { bg: '#fff', color: '#1f7a52', border: '#1f7a52', size: 13 });
      });
      T(rcx, dt0 + 24, '대단위체', 13, '#14532d', 'center', 800);
      ctx.restore();
    }
    // 사슬을 쥔 tRNA 위치 (코돈 번호)
    const bP = TL.state === 'bond' ? clamp(TL.t / 0.75, 0, 1) : 0;
    const holdC = TL.state === 'bond' ? lerp(TL.rk, TL.rk + 1, smooth((bP - 0.35) / 0.3)) : TL.state === 'trans' ? TL.rk + 1 : TL.rk;
    const holdR = Math.round(holdC);
    // tRNA들
    TL.trna.forEach((tr) => {
      const cx = tlX(codStart(tr.codon)) + 1.5 * tw;
      const noChip = tr.codon <= holdR && !(tr.codon === holdR && TL.chain.length === 0);
      trnaShape(cx, y - 4 + tr.drop, tr.aa, tr.anti, { alpha: tr.alpha * (1 - relP), tw, stem: 70, noChip });
    });
    if (TL.flying) {
      const f = TL.flying, c0 = TL.cand[TL.pick], k = ease.outBack(f.p);
      const x = lerp(c0 ? c0.x : f.tx, f.tx, k), yy = lerp(c0 ? c0.y : f.ty, y - 4, k);
      trnaShape(x, yy, f.aa, f.anti, { tw: lerp(26, tw, k), stem: lerp(56, 70, k) });
    }
    // 펩타이드 사슬
    if (TL.chain.length) {
      const extra = TL.state === 'bond' && smooth((bP - 0.35) / 0.3) > 0.5 ? 1 : 0;
      const ids = TL.chain.slice(); if (extra) ids.push(TL.trna[TL.trna.length - 1].aa);
      const hx = tlX(codStart(0) + 1.5) + (holdC) * 3 * tw, hy = y - 4 - 70 - 14;
      const relX = relP * -90, relY = relP * -60;
      const n = ids.length, pts = [];
      for (let k = 0; k < n; k++) { const age = n - 1 - k; pts.push({ x: hx - age * 24 + relX, y: hy - age * 9 + relY }); }
      if (pts.length > 1) { ctx.strokeStyle = 'rgba(100,116,139,.7)'; ctx.lineWidth = 4; ctx.beginPath(); pts.forEach((p, k) => { if (k) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); }); ctx.stroke(); }
      pts.forEach((p, k) => { ctx.save(); ctx.globalAlpha = TL.state === 'done' ? 0 : 1; D.sphere(p.x, p.y, 13, aaCol(ids[k]), { text: AA3[ids[k]], textScale: 0.85 }); ctx.restore(); });
    }
    // 후보 tRNA 토큰
    const ty = tlTokY();
    if (TL.state === 'wait' || TL.state === 'enter') {
      T(VW / 2, ty - 100, '이 중 맞는 tRNA는? (눌러서 고르기)', 15, '#475569', 'center', 800);
      TL.cand.forEach((c, i) => {
        if (TL.pick === i) return;
        const sh = c.bad && !RM ? Math.sin(clock * 50) * 4 : 0;
        trnaShape(c.x + sh, ty, c.aa, c.anti, { tw: 26, alpha: c.alpha, sc: c.sc, stem: 56, bad: c.bad });
        T(c.x, ty + 24, '3′ ' + c.anti + ' 5′', 14, '#334155', 'center', 800, { alpha: c.alpha });
      });
    }
    if (TL.state === 'stopwait') {
      const cx = VW / 2;
      pill(cx, ty - 50, TL_COD[TL.rk + 1] + ' 종결 코돈: 맞는 tRNA가 없어요', { bg: '#fff', color: '#b91c1c', border: '#e2464b', size: 14 });
      const bw = 190, bh = 52, bx = cx - bw / 2, by = ty - 20;
      D.shadow(() => { D.roundRect(bx, by, bw, bh, 14); ctx.fillStyle = '#e2464b'; ctx.fill(); }, { blur: 8, y: 3 });
      T(cx, by + bh / 2 + 6, '✂ 사슬 방출', 19, '#fff', 'center', 800);
      TL.relBtn = { x: bx, y: by, w: bw, h: bh };
    } else TL.relBtn = null;
    if (TL.state === 'idle') {
      const bw = 200, bh = 54, bx = VW / 2 - bw / 2, by = ty - 20;
      D.shadow(() => { D.roundRect(bx, by, bw, bh, 14); ctx.fillStyle = '#16a34a'; ctx.fill(); }, { blur: 8, y: 3 });
      T(VW / 2, by + bh / 2 + 6, '▶ 개시 시작', 19, '#fff', 'center', 800);
      TL.startBtn = { x: bx, y: by, w: bw, h: bh };
    } else TL.startBtn = null;
    // 방출된 단백질
    if (TL.state === 'release' || TL.state === 'done') {
      const p = TL.state === 'done' ? 1 : smooth(TL.t / 2.2);
      const px = lerp(rcx - 100, VW / 2, p), py = lerp(y - 160, ty - 20, p);
      for (let k = 0; k < 6; k++) { const a = k / 6 * TAU; D.sphere(px + Math.cos(a) * 30 * p + (1 - p) * (k - 3) * 22, py + Math.sin(a) * 22 * p, 13, aaCol(TL.chain[k] || 'G'), { text: AA3[TL.chain[k] || 'G'], textScale: 0.85 }); }
      T(px, py + 52, '단백질: Met–Glu–Pro–Trp–Phe–Lys', 14.5, '#92400e', 'center', 800, { alpha: p });
    }
    if (TL.state === 'idle') textBlock(18, 96, VW - 36, 'mRNA는 5′ → 3′ 방향으로 읽어요. 시작 코돈 AUG에서 번역이 시작되고, 종결 코돈 UAA에서 끝나요.', 14.5, '#475569', 20, 700);
  }
  const tlPT = {
    down(p) {
      if (TL.startBtn && inRect(p.x, p.y, TL.startBtn)) { tlStart(); return false; }
      if (TL.relBtn && inRect(p.x, p.y, TL.relBtn)) { tlRelease(); return false; }
      if (TL.state === 'wait') {
        for (let i = 0; i < TL.cand.length; i++) { const c = TL.cand[i]; if (Math.abs(p.x - c.x) < 62 && p.y > c.y - 110 && p.y < c.y + 38) { tlPick(i); return false; } }
      }
      return false;
    },
    hover(p) {
      if (TL.startBtn && inRect(p.x, p.y, TL.startBtn)) return 'pointer';
      if (TL.relBtn && inRect(p.x, p.y, TL.relBtn)) return 'pointer';
      if (TL.state === 'wait') for (const c of TL.cand) if (Math.abs(p.x - c.x) < 62 && p.y > c.y - 110 && p.y < c.y + 38) return 'pointer';
      return 'default';
    },
  };

  /* ---------- 폴리리보솜 ---------- */
  const PL = { n: 5, clock: 0 };
  const PL_P = 6.6;
  function plLen() { return VW - (PHONE ? 90 : 140); }
  function plProt(clockT, n) { let c = 0; for (let j = 0; j < n; j++) { const off = j * PL_P / n; if (clockT >= off + PL_P) c += Math.floor((clockT - off) / PL_P); } return c; }
  function plSet(n) { PL.n = n; PL.clock = 0; updateCtl(); }
  function polyDraw(dt, t) {
    PL.clock += dt;
    const L = plLen(), x0 = (VW - L) / 2, y = PHONE ? 170 : 168;
    T(18, 34, '폴리리보솜: mRNA 한 분자에 리보솜 여러 개', 16.5, '#334155', 'left', 800);
    // mRNA 줄
    ctx.strokeStyle = '#8b5cf6'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath();
    for (let x = x0; x <= x0 + L; x += 4) { const yy = y + Math.sin((x - x0) / 10) * 2; if (x === x0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy); } ctx.stroke();
    T(x0 - 8, y + 5, P5, 14, '#6d3fd6', 'right', 800); T(x0 + L + 8, y + 5, P3, 14, '#6d3fd6', 'left', 800);
    D.sphere(x0 - 2, y, 6, '#f97316', {});
    const v = L / (PL_P - 0.6);
    let done = 0;
    for (let j = 0; j < PL.n; j++) {
      const off = j * PL_P / PL.n;
      if (PL.clock < off) continue;
      const u = (PL.clock - off) % PL_P, cnt = Math.floor((PL.clock - off) / PL_P);
      done += cnt;
      const moving = u < PL_P - 0.6, x = x0 + Math.min(L, u * v), frac = clamp((x - x0) / L, 0, 1);
      const pop = !moving ? clamp((u - (PL_P - 0.6)) / 0.6, 0, 1) : 0;
      ctx.save(); ctx.globalAlpha = moving ? Math.min(1, u * 4) : 1 - pop;
      ribo(x, y, 0.5, {});
      const nB = Math.max(1, Math.round(frac * 11));
      for (let k = 0; k < nB; k++) D.sphere(x - 8 + Math.sin(k * 0.8 + j) * 6, y + 30 + k * 9.5, 4.4, '#f59e0b', {});
      ctx.restore();
      if (!moving) { D.sphere(x - 8, y + 110 + pop * 70, 11, '#f59e0b', {}); }
    }
    // 완성 단백질 모음
    panel(14, PHONE ? 360 : 340, VW - 28, PHONE ? 130 : 110, 14);
    T(28, (PHONE ? 360 : 340) + 28, '리보솜 ' + PL.n + '개 · 경과 ' + fmtN(PL.clock, 1) + '초', 16, '#334155', 'left', 800);
    T(28, (PHONE ? 360 : 340) + 56, '완성된 단백질', 15, '#64748b', 'left', 800);
    const total = plProt(PL.clock, PL.n);
    for (let k = 0; k < Math.min(total, 24); k++) D.sphere(150 + (k % 12) * 24, (PHONE ? 360 : 340) + 52 + Math.floor(k / 12) * 24, 9, '#f59e0b', {});
    T(VW - 28, (PHONE ? 360 : 340) + 56, total + '개', 26, '#b45309', 'right', 800);
    T(18, PHONE ? 520 : 470, '같은 시간(12초)에 리보솜 1개 → 단백질 ' + plProt(12, 1) + '개, 5개 → ' + plProt(12, 5) + '개 (예시)', 14.5, '#475569', 'left', 800);
  }

  /* =========================================================
     ④ 단백질 합성 모의실험 · 합성 시간
     ========================================================= */
  const SEQS = {
    a: { name: '인트론 없는 진핵 유전자', type: 'euk', coding: 'ATGGAACCATGGTTTAAATAA', intron: null },
    b: { name: '인트론 포함 진핵 유전자', type: 'euk', coding: 'ATGGCTAAGGTAAGTCCTTTAGGGATGCTAA', intron: [9, 22] },
    c: { name: '원핵 오페론 일부', type: 'prok', coding: 'ATGAAATTTTAAACGATGCCCGGGTGA', intron: null },
  };
  const LAB = { key: 'a', cur: SEQS.a.coding.split(''), sel: -1, mut: null, run: false, p: 0, res: null, base: null, ranOrig: false, ranMut: false, tmRan: false, runs: 0 };
  function labCompute(coding, key) {
    const sq = SEQS[key], pre = rnaOfT(coding);
    let mrna = pre;
    if (sq.intron) mrna = pre.slice(0, sq.intron[0]) + pre.slice(sq.intron[1]);
    const orfs = []; let from = 0;
    for (;;) {
      const o = translateORF(mrna, from);
      if (o.start < 0) break;
      orfs.push(o);
      if (sq.type !== 'prok' || !o.stop) break;
      from = o.end;
    }
    const aa = []; orfs.forEach((o, i) => { if (i) aa.push('|'); o.aa.forEach((a) => aa.push(a)); });
    return { pre, mrna, orfs, aa, txt: orfs.map((o) => aaStr(o.aa)).join(' ｜ ') };
  }
  function labTypeText(res, base, mutated) {
    if (!mutated) return '원래 서열 (기준 결과)';
    if (!res.orfs.length) return '시작 코돈 AUG가 없어져 단백질을 만들지 못해요';
    const a = res.orfs.map((o) => o.aa.join('')).join('|'), b = base.orfs.map((o) => o.aa.join('')).join('|');
    if (a === b) return res.mrna === base.mrna ? '단백질 변화 없음' : '단백질 변화 없음 (침묵 돌연변이)';
    const la = res.orfs.reduce((s, o) => s + o.aa.length, 0), lb = base.orfs.reduce((s, o) => s + o.aa.length, 0);
    if (la < lb && res.orfs[0].aa[res.orfs[0].aa.length - 1] === '*') return '종결 코돈이 일찍 생겨 단백질이 짧아져요 (넌센스)';
    return '아미노산이 달라져요 (과오 돌연변이)';
  }
  function labReset() { LAB.cur = SEQS[LAB.key].coding.split(''); LAB.mut = null; LAB.sel = -1; LAB.run = false; LAB.p = 0; LAB.res = null; updateCtl(); }
  function labPick(k) { if (LAB.run) return; LAB.key = k; LAB.base = labCompute(SEQS[k].coding, k); labReset(); }
  function labSelect(i) {
    if (LAB.run) return;
    const sq = SEQS[LAB.key];
    if (sq.intron && (i === sq.intron[0] || i === sq.intron[0] + 1 || i === sq.intron[1] - 1 || i === sq.intron[1] - 2)) { showHint('인트론의 시작(GU)과 끝(AG) 염기는 스플라이싱 신호라서 이 모의실험에서는 바꾸지 않아요.'); return; }
    LAB.sel = LAB.sel === i ? -1 : i; Sound.click(); updateCtl();
  }
  function labBase(b) {
    if (LAB.run) return;
    if (LAB.sel < 0) { showHint('먼저 DNA의 암호화 가닥에서 바꿀 염기를 눌러 주세요.'); return; }
    const orig = SEQS[LAB.key].coding[LAB.sel];
    LAB.cur = SEQS[LAB.key].coding.split('');
    if (b !== orig) { LAB.cur[LAB.sel] = b; LAB.mut = { i: LAB.sel, from: orig, to: b }; } else LAB.mut = null;
    Sound.click(); updateCtl();
  }
  function labRun() {
    if (LAB.run) return;
    LAB.run = true; LAB.p = 0; Sound.click();
    LAB.pend = { res: labCompute(LAB.cur.join(''), LAB.key), mut: LAB.mut ? Object.assign({}, LAB.mut) : null };
    LAB.res = LAB.pend.res; updateCtl();
  }
  function labFinish() {
    LAB.run = false; LAB.p = 1;
    if (LAB.pend && LAB.pend.mut) LAB.ranMut = true; else LAB.ranOrig = true;
    LAB.runs++;
    Sound.success(); updateCtl();
  }
  /* 가로로 줄 바꿈하며 타일 그리기: 마지막 y 반환 */
  function tileRows(arr, x0, y, tw, th, perRow, f) {
    let row = 0;
    arr.forEach((it, i) => {
      row = Math.floor(i / perRow); const col = i % perRow;
      f(it, i, x0 + col * tw, y + row * (th + 3));
    });
    return y + (Math.floor((arr.length - 1) / perRow) + 1) * (th + 3);
  }
  function labDraw(dt, t) {
    if (LAB.run) { LAB.p += dt / 5.2; if (LAB.p >= 1) labFinish(); }
    const sq = SEQS[LAB.key], coding = LAB.cur, N = coding.length;
    const tw = PHONE ? 26 : 24, th = PHONE ? 26 : 26, per = Math.floor((VW - 48) / tw), x0 = 30;
    const res = LAB.res || LAB.base || labCompute(sq.coding, LAB.key), p = LAB.run || LAB.res ? LAB.p : 0;
    const prok = sq.type === 'prok';
    let y = 52;
    pill(14, y - 10, 'DNA ' + sq.name, { bg: '#16a34a', color: '#fff', size: 14, align: 'left' });
    y += 14;
    const tpl = coding.map((c) => CMP[c]);
    const sweep = LAB.run ? clamp((p - 0.08) / 0.37, 0, 1) * N : -1;
    let yb = tileRows(coding, x0, y, tw, th, per, (c, i, x, yy) => {
      const mut = LAB.mut && LAB.mut.i === i, selc = LAB.sel === i;
      const lock = sq.intron && (i === sq.intron[0] || i === sq.intron[0] + 1 || i === sq.intron[1] - 1 || i === sq.intron[1] - 2);
      const inI = sq.intron && i >= sq.intron[0] && i < sq.intron[1];
      baseTile(x, yy, tw, th, c, { hl: mut ? '#f97316' : selc ? '#7c3aed' : null, dim: false, fill: inI ? '#eef0f4' : null });
      if (lock) T(x + tw - 5, yy + 9, '·', 16, '#94a3b8', 'center', 800);
      LAB.tiles[i] = { x, y: yy, w: tw, h: th };
    });
    T(x0 - 4, y + th / 2 + 5, P5, 13, '#475569', 'right', 800);
    yb += 2;
    T(x0 - 4, yb + th / 2 + 5, P3, 13, '#475569', 'right', 800);
    let yb2 = tileRows(tpl, x0, yb, tw, th, per, (c, i, x, yy) => { baseTile(x, yy, tw, th, c, { dim: false, fill: sq.intron && i >= sq.intron[0] && i < sq.intron[1] ? '#eef0f4' : null }); });
    if (sweep >= 0 && sweep < N) { const col = Math.floor(sweep) % per, row = Math.floor(Math.floor(sweep) / per); const sx = x0 + col * tw + tw / 2; D.glow(sx, y + row * (th + 3) + th / 2, 26, '#7c3aed', 0.5); }
    // 단계 화살표 1: 전사
    const stage = (yy, txt, on) => { D.arrow(VW / 2 - 70, yy - 6, VW / 2 - 70, yy + 14, { color: on ? '#7c3aed' : '#cbd5e1', width: 3, head: 9 }); T(VW / 2 - 56, yy + 10, txt, 14, on ? '#6d28d9' : '#94a3b8', 'left', 800); };
    yb2 += 6;
    stage(yb2, '전사 (주형 가닥 → RNA)', p > 0.08);
    let yy = yb2 + 22;
    // 전구 mRNA
    const nPre = LAB.res ? Math.ceil(clamp((p - 0.1) / 0.35, 0, 1) * N) : 0;
    const pre = res.pre.split('');
    T(14, yy + 4, prok ? 'mRNA' : '전구 mRNA', 13, '#6d28d9', 'left', 800);
    yy += 8;
    yy = tileRows(pre, x0, yy, tw, th, per, (c, i, x, ty) => {
      if (i >= nPre) return;
      const inI = sq.intron && i >= sq.intron[0] && i < sq.intron[1];
      const rm = inI && p > 0.5 ? clamp((p - 0.5) / 0.12, 0, 1) : 0;
      baseTile(x, ty + rm * 10, tw, th, c, { solid: !inI, fill: inI ? '#e5e7eb' : null, alpha: 1 - rm * 0.85, hl: LAB.mut && LAB.mut.i === i ? '#f97316' : null });
      if (inI && p > 0.5) { ctx.save(); ctx.globalAlpha = 1 - rm * 0.5; ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 3, ty + th / 2 + rm * 10); ctx.lineTo(x + tw - 3, ty + th / 2 + rm * 10); ctx.stroke(); ctx.restore(); }
    });
    yy += 4;
    // 가공 → 성숙 mRNA (진핵만)
    let mRows = null;
    if (!prok) {
      stage(yy, 'RNA 가공 (5′ 캡 · 인트론 제거 · 폴리 A 꼬리)', p > 0.45);
      yy += 24;
      T(14, yy + 4, '성숙 mRNA', 13, '#6d28d9', 'left', 800); yy += 8;
      const pp = clamp((p - 0.45) / 0.15, 0, 1), m = res.mrna.split('');
      const capW = 26; 
      if (pp > 0) D.sphere(x0 + 9, yy + th / 2, 9 * pp, '#f97316', {});
      yy = tileRows(m, x0 + capW, yy, tw, th, per - 1, (c, i, x, ty) => { baseTile(x, ty, tw, th, c, { solid: true, alpha: pp, hl: LAB.mut && sq.intron && false ? null : null }); });
      if (pp > 0.6) { const lastRow = Math.floor((m.length - 1) / (per - 1)), lastCol = (m.length - 1) % (per - 1); const tx = x0 + capW + (lastCol + 1) * tw + 4, ty2 = yy - (th + 3) + th / 2;
        ctx.strokeStyle = '#facc15'; ctx.lineWidth = 4; ctx.beginPath(); for (let i = 0; i <= 8; i++) { const xx = tx + i * 3, y2 = ty2 + Math.sin(i * 1.2) * 4; if (i) ctx.lineTo(xx, y2); else ctx.moveTo(xx, y2); } ctx.stroke(); }
      yy += 2;
      if (pp > 0.7) { pill(x0 + 40, yy + 8, '5′ 캡', { bg: '#fff', color: '#c2570a', border: '#f97316', size: 12.5, align: 'left' }); pill(x0 + 110, yy + 8, '폴리 A 꼬리', { bg: '#fff', color: '#a16207', border: '#facc15', size: 12.5, align: 'left' }); yy += 20; }
    } else {
      T(14, yy + 12, '원핵생물: 가공 없이 곧바로 번역 (전사 중에도 번역 시작)', 13, '#64748b', 'left', 800); yy += 18;
    }
    stage(yy, '번역 (코돈 → 아미노산)', p > 0.6);
    yy += 26;
    // 아미노산 칩
    const nAA = LAB.res ? Math.ceil(clamp((p - 0.6) / 0.4, 0, 1) * res.aa.length) : 0;
    const cw = 44, chh = 24, perA = Math.floor((VW - 24) / (cw + 4));
    if (!res.orfs.length) T(14, yy + 18, '시작 코돈 AUG가 없어 번역이 시작되지 않아요', 15, '#b91c1c', 'left', 800);
    res.aa.forEach((a, i) => {
      if (i >= nAA) return; const col = i % perA, row = Math.floor(i / perA);
      const cx = 14 + cw / 2 + col * (cw + 4), cy = yy + 14 + row * (chh + 4);
      if (a === '|') { T(cx, cy + 5, '｜', 18, '#94a3b8', 'center', 800); return; }
      aaChip(cx, cy, cw, chh, a, {});
    });
    LAB.endY = yy + 14 + (Math.floor(Math.max(0, res.aa.length - 1) / perA) + 1) * (chh + 4);
    // 결과 비교 표
    const ty = Math.max(LAB.endY + 6, PHONE ? 470 : 400), hgt = VH - ty - 8;
    if (hgt > 70 && LAB.res && !LAB.run) {
      panel(10, ty, VW - 20, hgt, 14);
      const base = LAB.base || labCompute(sq.coding, LAB.key);
      const mut = LAB.pend ? LAB.pend.mut : null;
      T(24, ty + 24, '결과 기록', 15, '#334155', 'left', 800);
      const rows = [['원래', base.txt || '(없음)'], [mut ? mut.i + 1 + '번째 ' + mut.from + '→' + mut.to : '이번', LAB.res.txt || '(없음)']];
      rows.forEach((r, k) => { T(24, ty + 50 + k * 24, r[0], 13.5, k ? '#c2570a' : '#64748b', 'left', 800); TF(120, ty + 50 + k * 24, r[1], VW - 150, 14, 11, '#1f2d44', 'left', 800); });
      TF(24, ty + 104, '→ ' + labTypeText(LAB.res, base, !!mut), VW - 48, 15, 12, '#0d7a4a', 'left', 800);
    } else if (!LAB.res) {
      textBlock(14, Math.max(LAB.endY + 24, PHONE ? 500 : 420), VW - 28, 'DNA 염기를 눌러 하나만 바꿔 볼 수도 있어요. ▶ 합성 실행을 누르면 DNA → 전사 → (가공) → 번역이 차례로 일어나요.', 14.5, '#475569', 20, 700);
    }
  }
  LAB.tiles = [];
  const labPT = {
    down(p) {
      for (let i = 0; i < LAB.tiles.length; i++) { const r = LAB.tiles[i]; if (r && inRect(p.x, p.y, { x: r.x, y: r.y, w: r.w, h: r.h })) { labSelect(i); return false; } }
      return false;
    },
    hover(p) { for (let i = 0; i < LAB.tiles.length; i++) { const r = LAB.tiles[i]; if (r && inRect(p.x, p.y, r)) return 'pointer'; } return 'default'; },
  };

  const TM = { t: 0, run: false, ran: false };
  const TM_SPEED = 8;
  function tmRun() { if (TM.run) return; TM.t = 0; TM.run = true; Sound.click(); }
  function timeDraw(dt, t) {
    if (TM.run) { TM.t += dt * TM_SPEED; if (TM.t >= 60) { TM.t = 60; TM.run = false; TM.ran = true; LAB.tmRan = true; Sound.success(); updateCtl(); } }
    T(18, 34, '300개 아미노산 단백질 한 분자를 만드는 데 걸리는 시간', 16, '#334155', 'left', 800);
    const rows = [['원핵생물', 20, 15, '#6aa84f', '전사와 번역이 같은 곳'], ['진핵생물', 5, 60, '#d9a441', '핵과 세포질에서 따로']];
    const bx = 24, bw = VW - 48, by0 = PHONE ? 100 : 100;
    rows.forEach((r, k) => {
      const y = by0 + k * (PHONE ? 150 : 120), nAA = clamp(TM.t * r[1], 0, 300), frac = nAA / 300;
      T(bx, y - 8, r[0] + ' (번역 속도 약 ' + r[1] + '개/초)', 15.5, '#1f2d44', 'left', 800);
      D.roundRect(bx, y, bw, 30, 15); ctx.fillStyle = '#e5e7eb'; ctx.fill();
      if (frac > 0.003) { ctx.save(); D.roundRect(bx, y, bw, 30, 15); ctx.clip(); ctx.fillStyle = r[3]; ctx.fillRect(bx, y, Math.max(8, bw * frac), 30); ctx.restore(); }
      ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 2; D.roundRect(bx, y, bw, 30, 15); ctx.stroke();
      ribo(bx + Math.max(18, bw * frac), y + 12, 0.42, { noLarge: false });
      T(bx + bw, y + 52, fmtN(Math.floor(nAA)) + ' / 300개' + (frac >= 1 ? ' · 완성 ✔' : ''), 14.5, '#475569', 'right', 800);
      T(bx, y + 52, r[4], 13.5, '#64748b', 'left', 700);
    });
    const yy = by0 + 2 * (PHONE ? 150 : 120) - 20;
    T(bx, yy, '경과 시간(모의): ' + fmtN(TM.t, 0) + '초', 18, '#334155', 'left', 800);
    if (TM.ran) {
      panel(14, yy + 18, VW - 28, PHONE ? 118 : 96, 14);
      T(28, yy + 46, '원핵: 300개를 초당 20개씩 → 약 15초', 16, '#3f7f23', 'left', 800);
      T(28, yy + 72, '진핵: 300개를 초당 5개씩 → 약 60초 (약 4배)', 16, '#9a6b10', 'left', 800);
      T(28, yy + 98, '(교육용 예시 값: 실제 속도는 생물 · 조건에 따라 달라요)', 13, '#64748b', 'left', 700);
    } else textBlock(bx, yy + 30, bw, TM.run ? '시간이 8배 빨리 흘러가요...' : '[▶ 시간 재기]를 누르면 두 세포에서 같은 단백질이 만들어지는 시간을 비교해요.', 14.5, '#475569', 20, 700);
  }

  /* =========================================================
     화면 전환 · 조작 연결
     ========================================================= */
  const PTS = { flow: flowPT, tl: tlPT, lab: labPT };
  function setMode(m) {
    if (S.mode !== m) S.fade = 1;
    S.mode = m; PT = PTS[m] || null; hideHint();
    updateCtl();
  }
  const OPS = { cap: '5′ 캡 붙이기', splice: '인트론 제거', tail: '폴리 A 꼬리 붙이기' };
  function updateCtl() {
    const fr0 = game ? game.free : false, lvNow = game ? game.level : 0;
    ctlNodes.forEach((n) => { n.hidden = (n.dataset.modes || '').split(' ').indexOf(S.mode) < 0; });
    modeBtns(S.mode, lvNow, fr0);
    chipOn($('#cellSel'), F.cell);
    $$('#nameSel button').forEach((b) => { b.classList.toggle('on', F.names.indexOf(b.dataset.v) >= 0); });
    $('#flRun').disabled = F.run;
    chipOn($('#tplSel'), TX.choice); $('#txRun').disabled = TX.running || !TX.choice;
    $$('#opList button').forEach((b) => { const used = PR.ops.indexOf(b.dataset.v) >= 0; b.disabled = used || PR.exporting; b.classList.toggle('on', used); });
    $('#opSeq').innerHTML = PR.ops.length ? PR.ops.map((k, i) => '<span class="pk-chip"><b>' + (i + 1) + '</b> ' + OPS[k] + '</span>').join('') : '<span class="in-unit">아직 아무것도 하지 않았어요</span>';
    $('#prExport').disabled = PR.ops.length < 3 || PR.exporting || PR.exported;
    $('#tlGo').disabled = TL.state !== 'idle';
    $('#oRib').textContent = PL.n;
    chipOn($('#labSeq'), LAB.key); chipOn($('#labPal'), LAB.mut ? LAB.mut.to : LAB.sel >= 0 ? SEQS[LAB.key].coding[LAB.sel] : '');
    $('#selInfo').textContent = LAB.sel >= 0 ? '(' + (LAB.sel + 1) + '번째 염기 · 원래 ' + SEQS[LAB.key].coding[LAB.sel] + (LAB.mut ? ' → ' + LAB.mut.to : '') + ')' : '(위의 DNA에서 염기를 눌러요)';
    $('#labRun').disabled = LAB.run; $('#tmRun').disabled = TM.run;
  }
  bindModes(setMode);
  $$('#cellSel button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setCell(b.dataset.v); }));
  $$('#nameSel button').forEach((b) => b.addEventListener('click', () => nameAssign(b.dataset.v)));
  $('#flRun').addEventListener('click', flowRun);
  $('#flReset').addEventListener('click', () => { Sound.click(); flowReset(true); updateCtl(); });
  $$('#tplSel button').forEach((b) => b.addEventListener('click', () => { Sound.click(); txPick(b.dataset.v); }));
  $('#txRun').addEventListener('click', txRun);
  $('#txReset').addEventListener('click', () => { Sound.click(); txReset(); });
  $$('#opList button').forEach((b) => b.addEventListener('click', () => procOp(b.dataset.v)));
  $('#prExport').addEventListener('click', procExport);
  $('#prReset').addEventListener('click', () => { Sound.click(); procReset(); });
  $('#tlGo').addEventListener('click', tlStart);
  $('#tlReset').addEventListener('click', () => { Sound.click(); tlReset(); });
  SciSim.bindRange($('#sRib'), $('#oRib'), (v) => String(v), (v) => { plSet(v); });
  $$('#labSeq button').forEach((b) => b.addEventListener('click', () => { Sound.click(); labPick(b.dataset.v); }));
  $$('#labPal button').forEach((b) => b.addEventListener('click', () => labBase(b.dataset.v)));
  $('#labRun').addEventListener('click', labRun);
  $('#labRevert').addEventListener('click', () => { Sound.click(); labReset(); });
  $('#tmRun').addEventListener('click', tmRun);
  labPick('a');

  /* =========================================================
     미션
     ========================================================= */
  const levels = [
    {
      title: '정보는 어디로 흐를까', short: '중심원리', icon: '🏭', phase: '모형',
      intro: '<p class="si-q">❓ 탐구 질문: 핵 속 DNA의 정보는 어떤 단계를 거쳐 세포질의 단백질이 될까? 각 단계는 무엇이 필요하고 어디서 일어날까?</p><p>🔗 <b>통합과학</b>에서 DNA의 염기 서열이 mRNA를 거쳐 단백질의 아미노산 서열이 된다는 것(전사 · 번역)을 배웠어요. 앞 단원에서는 유전자의 구조(엑손 · 인트론)와 DNA 복제도 살펴봤어요.</p><p>이번 차시는 이 흐름을 <b>유전자 발현의 중심원리</b>로 정리하고 전사 · RNA 가공 · 번역을 한 단계씩 들여다봐요. 먼저 정보가 어디로 흐르는지, 원핵 세포와 진핵 세포에서 무엇이 다른지 봐요.</p>',
      features: ['flow'],
      setup() { flowReset(true); setMode('flow'); },
      recap: '중심원리는 DNA → (복제) → DNA, DNA → (전사) → RNA → (번역) → 단백질이에요. 진핵 세포는 핵에서 전사 · 가공하고 세포질에서 번역하지만, 원핵 세포는 핵막이 없어 전사 중에도 번역이 시작돼요.',
      summary: '<ul><li><b>유전자 발현</b>: 유전자의 정보가 전사와 번역을 거쳐 단백질을 만들고 형질로 나타나는 과정이에요.</li><li><b>중심원리</b>: DNA → DNA(복제), DNA → RNA(전사), RNA → 단백질(번역). 정보는 핵산에서 단백질로 흘러요. (예외: 레트로바이러스의 역전사 RNA → DNA)</li><li><b>진핵 세포</b>는 핵 안에서 전사와 RNA 가공을 하고, 완성된 mRNA가 핵공을 지나 세포질에서 번역돼요. <b>원핵 세포</b>는 핵막이 없어 전사와 번역이 같은 공간에서 거의 동시에 일어나요.</li><li>정보 → 기능 → 형질: DNA 염기 서열 → 아미노산 서열 → 단백질의 기능 → 형질</li></ul>',
      missions: [
        {
          id: 'names', title: '화살표 3개에 이름 붙이기', manual: true,
          goal: '중심원리 도표의 화살표 <b>3개</b>에 알맞은 이름(복제 · 전사 · 번역)을 붙이세요.',
          hint: 'DNA → DNA 는 정보를 그대로 사본으로 만드는 일, DNA → RNA 는 RNA로 옮겨 적는 일, RNA → 단백질은 염기 서열을 아미노산 서열로 바꾸는 일이에요.',
          setup() { flowReset(false); setMode('flow'); },
          check() {
            const n = F.names.filter((x) => !x).length;
            if (n) { F.bad = [false, false, false]; return '아직 이름이 없는 화살표가 있어요. (' + n + '개)'; }
            const wrong = [0, 1, 2].filter((i) => F.names[i] !== SLOT_NAMES[i]);
            if (!wrong.length) { F.bad = [false, false, false]; return true; }
            const nb = [0, 1, 2].map((i) => wrong.indexOf(i) >= 0); F.bad = nb; 
            return '\'' + (wrong[0] === 0 ? 'DNA → DNA' : wrong[0] === 1 ? 'DNA → RNA' : 'RNA → 단백질') + '\' 화살표의 이름을 다시 생각해 보세요. (' + wrong.length + '개가 달라요)';
          },
          explain: '<b>복제</b>는 DNA가 DNA 사본을 만들어 세포 분열 때 정보를 전달하는 일이고, <b>전사</b>는 유전자의 정보를 RNA로 옮겨 적는 일, <b>번역</b>은 mRNA의 염기 서열을 아미노산 서열로 바꾸어 단백질을 만드는 일이에요. 점선의 역전사는 레트로바이러스 같은 예외예요.',
        },
        {
          id: 'compare', title: '번역은 언제 시작될까?',
          goal: '<b>원핵 세포</b>와 <b>진핵 세포</b>에서 각각 [▶ 발현 실행]을 해 보고, 번역이 시작되는 때를 비교하세요.',
          hint: '위쪽 단추로 세포 종류를 바꿀 수 있어요. 각 세포에서 끝까지 실행해야 해요. 아래 문구에서 번역이 전사보다 먼저 시작하는지 나중에 시작하는지 확인해요.',
          setup() { setMode('flow'); },
          check: () => F.ranP && F.ranE, hold: 0.6,
          status: () => mark(F.ranP) + ' 원핵 세포 실행' + (F.trace.p ? ' (번역 시작 ' + F.trace.p.tlStart.toFixed(1) + '초 &lt; 전사 끝 ' + F.trace.p.txEnd.toFixed(1) + '초)' : '') + '<br>' + mark(F.ranE) + ' 진핵 세포 실행' + (F.trace.e ? ' (번역 시작 ' + F.trace.e.tlStart.toFixed(1) + '초 &gt; 전사 끝 ' + F.trace.e.txEnd.toFixed(1) + '초)' : ''),
          explain: '<b>원핵 세포</b>에는 핵막이 없어서 mRNA가 만들어지는 중에도 리보솜이 붙어 번역이 시작돼요(전사–번역 동시). <b>진핵 세포</b>에서는 핵 안에서 전사 · 가공이 끝난 mRNA가 핵공을 지나 세포질로 나온 뒤에야 번역이 시작돼요. 이 시간 차 사이에 진핵생물은 RNA 가공 단계에서도 발현을 조절할 수 있어요.',
        },
        {
          type: 'quiz', title: '정보 흐름의 방향',
          goal: '유전자 발현에서 정보의 흐름과 관련하여 옳은 설명은?',
          setup() { setMode('flow'); },
          choices: ['DNA → RNA → 단백질 방향으로 흐르고, 단백질의 아미노산 서열 정보가 DNA로 되돌아가는 경로는 알려져 있지 않다', '단백질이 많이 만들어지면 그 아미노산 서열이 DNA에 새겨져 염기 서열이 바뀐다', 'RNA에서 DNA로 정보가 흐르는 일은 어떤 생물에서도 일어나지 않는다', '번역은 핵 안에서 DNA를 직접 읽어 아미노산을 연결하는 과정이다'],
          answer: 0,
          feedback: ['', '단백질의 서열이 DNA의 염기 서열을 바꾸지는 못해요. 정보는 핵산에서 단백질로만 흘러요.', '레트로바이러스는 역전사 효소로 RNA를 주형 삼아 DNA를 만들어요. 그래서 도표에 점선으로 예외를 나타냈어요.', '번역은 mRNA의 코돈을 읽어요. DNA를 직접 읽는 것은 전사예요.'],
          explain: '유전 정보는 DNA → RNA → 단백질 방향으로만 전달돼요. 단백질의 아미노산 서열에서 핵산으로 되돌아가는 경로가 없어서 몸에서 만들어진 단백질이 DNA를 바꾸지 못해요. (역전사는 RNA → DNA의 예외이고, 단백질 → 핵산은 아니에요.)',
        },
      ],
    },
    {
      title: '전사와 RNA 가공', short: '전사', icon: '🧬', phase: '모형',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 유전자 발현이 전사 → (가공) → 번역으로 이어지는 것을 봤어요. 이번에는 전사를 <b>개시 · 신장 · 종결</b>로 나누어 자세히 보고, 진핵생물의 <b>RNA 가공</b>도 살펴봐요.</div><p>RNA 중합 효소는 DNA 두 가닥 중 한 가닥만 <b>주형</b>으로 써요. 다른 가닥은 mRNA와 같은 서열을 가진 <b>암호화(비주형) 가닥</b>이에요. 어느 가닥이 주형인지 직접 골라 mRNA를 만들어 보세요.</p>',
      features: ['tx', 'proc'],
      setup() { txReset(); setMode('tx'); },
      recap: '전사는 RNA 중합 효소가 프로모터에 결합(개시)해 주형을 3′ → 5′로 읽으며 RNA를 5′ → 3′로 합성(신장)하고 종결 서열에서 떨어지는(종결) 과정이에요. 진핵 전구 mRNA는 5′ 캡 → 인트론 제거 → 폴리 A 꼬리 순으로 가공된 뒤 핵공을 지나요.',
      summary: '<ul><li><b>전사</b>: ① 개시 — RNA 중합 효소가 프로모터에 결합하고 DNA 이중 가닥이 풀려요. ② 신장 — 주형 가닥을 3′ → 5′로 읽으며 상보적인 뉴클레오타이드를 5′ → 3′ 방향으로 연결해요. ③ 종결 — 종결 서열에서 효소와 RNA가 떨어져요.</li><li><b>주형 가닥</b>과 <b>암호화 가닥</b>: mRNA는 주형과 상보적이고 암호화 가닥과 같은 서열이에요(T 대신 U). 예) 암호화 5′-ATG GAA CCA TGG TTT AAA TAA-3′ → mRNA 5′-AUG GAA CCA UGG UUU AAA UAA-3′</li><li><b>진핵 RNA 가공</b>(핵 안): 5′ 캡 붙이기, 인트론 제거(스플라이싱), 3′ 폴리 A 꼬리 붙이기. 전구 mRNA 2700 nt → 엑손만 남아 600 nt → 5′ 캡 + 폴리 A 꼬리(약 200 nt). 이 중 암호 부분은 543 nt. 가공된 mRNA만 핵공을 지나요.</li></ul>',
      missions: [
        {
          id: 'mrna', title: '주형 가닥을 골라 mRNA 만들기',
          goal: 'DNA의 <b>주형 가닥</b>을 골라 전사를 실행해 mRNA <b>AUGGAACCAUGGUUUAAAUAA</b>를 만드세요.',
          hint: 'RNA 중합 효소는 프로모터(왼쪽)에서 오른쪽으로 이동하며 주형을 3′ → 5′ 방향으로 읽어요. 왼쪽 끝에 3′라고 적힌 가닥을 찾아요.',
          setup() { txReset(); setMode('tx'); },
          check: () => TX.done && TX.ok, hold: 0.6,
          status: () => mark(!!TX.choice) + ' 주형 가닥 고르기' + (TX.choice ? ' (' + (TX.choice === 'top' ? '위쪽' : '아래쪽') + ')' : '') + ' &nbsp; ' + mark(TX.done && TX.ok) + ' mRNA 완성',
          explain: 'mRNA는 5′ → 3′ 방향으로 합성돼요. 아래쪽 가닥(3′-TAC CTT GGT ACC AAA TTT ATT-5′)이 주형이라 RNA 중합 효소가 이 가닥을 3′ → 5′로 읽으며 상보적인 염기(A–U, T–A, G–C, C–G)를 이어 붙여 5′-AUG GAA CCA UGG UUU AAA UAA-3′ 를 만들어요. 위쪽 가닥은 암호화 가닥이라 mRNA와 같은 서열(T 대신 U)이에요.',
        },
        {
          id: 'order', title: '가공 3단계 순서 맞추기', manual: true,
          goal: '진핵 전구 mRNA(2700 nt)를 <b>5′ 캡 → 인트론 제거 → 폴리 A 꼬리</b> 순서로 가공하고, 완성된 mRNA를 핵공으로 내보내세요.',
          hint: '5′ 캡은 전사가 시작되자마자 5′ 끝에 붙고, 인트론은 전사 중에 이어서 잘려 나가며, 폴리 A 꼬리는 전사가 끝날 즈음 3′ 끝에 붙어요. 마지막으로 핵공을 지나요.',
          setup() { procReset(); setMode('proc'); },
          check() {
            const o = PR.ops.join(',');
            if (PR.ops.length < 3) return '세 가지 가공을 모두 눌러 주세요. (' + PR.ops.length + ' / 3)';
            if (o !== 'cap,splice,tail') {
              const names = { cap: '5′ 캡', splice: '인트론 제거', tail: '폴리 A 꼬리' };
              const want = ['cap', 'splice', 'tail'];
              const i = want.findIndex((k, j) => PR.ops[j] !== k);
              return (i + 1) + '번째 순서가 달라요. ' + (i === 0 ? '가장 먼저 일어나는 가공은 전사가 시작되자마자 5′ 끝에 붙는 5′ 캡이에요.' : i === 1 ? '5′ 캡 다음에는 전사가 이어지는 동안 인트론이 제거돼요.' : '폴리 A 꼬리는 3′ 끝이 만들어진 뒤 마지막에 붙어요.') + ' [초기화] 후 다시 해 보세요.';
            }
            if (!PR.exported) return '가공이 끝났어요! 이제 [핵공 통과]를 눌러 mRNA를 세포질로 내보내세요.';
            return true;
          },
          explain: '엑손 150 + 200 + 250 = <b>600 nt</b>만 남고 인트론 900 + 1200 = 2100 nt는 제거돼요. <b>5′ 캡</b>과 <b>폴리 A 꼬리</b>(약 200 nt)는 mRNA를 분해로부터 보호하고 번역을 도와요. 가공이 끝난 성숙 mRNA만 핵공을 지나 세포질로 나가요.',
        },
        {
          type: 'quiz', title: '암호화 가닥과 인트론',
          goal: 'mRNA의 서열과 인트론에 대한 설명으로 옳은 것은?',
          setup() { setMode('tx'); },
          choices: ['mRNA는 주형 가닥과 상보적이므로 결국 암호화 가닥과 같은 서열(T 대신 U)이 되고, 인트론은 스플라이싱으로 제거되어 단백질 정보가 되지 않는다', 'mRNA는 암호화 가닥과 상보적인 서열이고, 인트론은 번역되어 기능이 없는 아미노산이 된다', 'RNA 중합 효소가 암호화 가닥을 주형으로 쓰기 때문에 mRNA가 암호화 가닥과 같은 서열이 된다', 'mRNA는 주형 가닥과 같은 서열이고, 인트론은 핵공을 통과하지 못해서 번역되지 않는다'],
          answer: 0,
          feedback: ['', '인트론은 전구 mRNA에서 제거되기 때문에 번역될 수 없어요. 또 mRNA는 주형과 상보적이고 암호화 가닥과는 같은 서열이에요.', '주형으로 쓰이는 것은 암호화 가닥이 아니라 그 상보 가닥이에요. 주형과 상보적으로 합성하기 때문에 결과적으로 암호화 가닥과 같은 서열이 돼요.', 'mRNA는 주형과 상보적이에요. 같은 서열이면 안 돼요.'],
          explain: '주형이 암호화 가닥과 상보적이고 RNA는 주형과 상보적으로 합성되므로, 상보를 두 번 거쳐 mRNA는 암호화 가닥과 같은 서열이 돼요(T만 U). 인트론은 스플라이싱으로 전구 mRNA에서 잘려 나가고, 엑손만 이어진 성숙 mRNA가 번역돼요.',
        },
      ],
    },
    {
      title: '번역의 세 단계', short: '번역', icon: '🏭', phase: '모형',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 전사로 mRNA가 만들어지고 진핵 mRNA는 가공된 뒤 세포질로 나가는 것을 봤어요. 이제 리보솜이 mRNA를 읽는 <b>번역</b>을 <b>개시 · 신장 · 종결</b>로 나누어 직접 진행해 봐요.</div><p>리보솜에는 tRNA가 들어오는 <b>A 자리</b>, 사슬을 쥔 tRNA가 있는 <b>P 자리</b>, 빈 tRNA가 나가는 <b>E 자리</b>가 있어요. mRNA는 5′ → 3′ 방향으로 읽어요.</p>',
      features: ['tl', 'poly'],
      setup() { tlReset(); setMode('tl'); },
      recap: '번역은 소단위체가 AUG를 찾고 대단위체가 합쳐지는 개시, A 자리에 안티코돈이 맞는 tRNA가 들어와 펩타이드 결합 후 한 코돈씩 이동하는 신장, 종결 코돈에서 사슬이 방출되는 종결로 이어져요.',
      summary: '<ul><li><b>개시</b>: 리보솜 소단위체가 mRNA의 시작 코돈 AUG를 찾고, 개시 tRNA(Met)가 짝지어진 뒤 대단위체가 결합해요.</li><li><b>신장</b>: A 자리에 코돈과 상보적인 안티코돈을 가진 tRNA가 들어오고 → 펩타이드 결합으로 사슬이 연장되며 → 리보솜이 mRNA를 따라 한 코돈(3염기) 이동(A → P → E)해요. 코돈 5′-AUG-3′ 와 안티코돈 3′-UAC-5′ 가 짝지어요.</li><li><b>종결</b>: 종결 코돈(UAA · UAG · UGA)에는 대응하는 tRNA가 없어서 사슬이 방출되고 리보솜이 떨어져요.</li><li><b>폴리리보솜</b>: mRNA 하나에 리보솜 여러 개가 붙어 같은 단백질을 동시에 여러 개 만들어요.</li></ul>',
      missions: [
        {
          id: 'build', title: '개시 · 신장 · 종결 완성하기',
          goal: '<b>개시</b> 복합체를 만들고 A 자리에 맞는 tRNA를 골라 아미노산을 <b>3개 이상</b> 연결한 뒤, 종결 코돈에서 사슬을 <b>방출</b>하세요.',
          hint: 'A 자리의 코돈과 상보적인 안티코돈을 찾아요. 코돈 5′-GAA-3′ 에는 안티코돈 3′-CUU-5′ 가 짝지어져요 (A–U, G–C). 틀리면 tRNA가 튕겨 나와요.',
          setup() { tlReset(); setMode('tl'); },
          check: () => TL.initDone && TL.chain.length >= 3 && TL.released, hold: 0.4,
          status: () => mark(TL.initDone) + ' 개시 복합체 조립 &nbsp; ' + mark(TL.chain.length >= 3) + ' 아미노산 연결 ' + TL.chain.length + '개 &nbsp; ' + mark(TL.released) + ' 종결 코돈에서 방출',
          explain: '소단위체가 AUG에서 개시 tRNA(안티코돈 3′-UAC-5′, Met)와 짝지어지고 대단위체가 합쳐져요. 신장에서는 A 자리의 코돈과 안티코돈이 상보적으로 짝지어진 tRNA만 들어오고, 펩타이드 결합 뒤 리보솜이 한 코돈씩 이동해요. 종결 코돈 UAA에는 짝지을 tRNA가 없어 사슬이 방출돼요. 이렇게 Met–Glu–Pro–Trp–Phe–Lys가 만들어졌어요.',
        },
        {
          type: 'quiz', title: '폴리리보솜의 이점',
          goal: 'mRNA 한 분자에 리보솜 여러 개가 붙어 번역하는 폴리리보솜의 이점으로 알맞은 것은?',
          setup() { setMode('poly'); },
          choices: ['같은 시간에 같은 단백질을 여러 개 동시에 만들 수 있다', 'mRNA가 리보솜 수만큼 길어져서 더 큰 단백질을 만든다', '리보솜마다 서로 다른 아미노산 서열의 단백질을 만든다', '리보솜이 많으면 mRNA가 분해되지 않는다'],
          answer: 0,
          feedback: ['', '단백질의 크기는 mRNA의 암호 부분 길이로 정해져요. 리보솜 수와는 상관없어요.', '같은 mRNA를 읽으므로 모두 같은 서열의 단백질이 만들어져요.', 'mRNA의 수명은 다른 요인으로 정해져요. 폴리리보솜의 이점은 생산 속도예요.'],
          explain: '리보솜 1개는 mRNA를 한 번 읽는 동안 단백질 1개를 만들어요. 리보솜 5개가 시간 간격을 두고 같은 mRNA에 붙으면 같은 시간에 단백질을 훨씬 많이 만들 수 있어요. 모두 같은 mRNA를 읽으므로 같은 단백질이에요.',
        },
      ],
    },
    {
      title: '단백질 합성 모의실험', short: '합성 모의', icon: '🧪', phase: '탐구',
      intro: '<div class="si-link">🔗 <b>앞 단계들에서</b> 전사, RNA 가공, 번역을 따로 살펴봤어요. 이제 이 과정을 <b>한 번에</b> 실행해 서열이 어떻게 바뀌는지 기록해요. 앞 단원의 돌연변이도 떠올려 봐요.</div><p>서열 세 가지(<b>인트론 없는 진핵 유전자 · 인트론 포함 진핵 유전자 · 원핵 오페론 일부</b>) 중 하나를 골라 DNA → 전사 → (가공) → 번역을 실행해요. DNA의 염기 <b>하나</b>를 바꿔 결과가 어떻게 달라지는지도 비교해 보세요.</p>',
      features: ['lab', 'time'],
      setup() { setMode('lab'); },
      recap: '모의실험에서 DNA → 전사 → (가공) → 번역이 이어지고, 염기 하나가 바뀌면 mRNA와 아미노산 서열이 달라질 수 있어요. 암호 부분 543 nt는 아미노산 180개가 되고, 같은 300개 아미노산 단백질도 원핵(약 15초)보다 진핵(약 60초)이 오래 걸려요.',
      summary: '<ul><li><b>모의실험</b>: 진핵 유전자는 전사 → RNA 가공(캡 · 인트론 제거 · 꼬리) → 번역, 원핵 유전자는 가공 없이 전사 → 번역이에요. 원핵 오페론은 한 mRNA에서 시작 · 종결 코돈마다 여러 폴리펩타이드를 만들 수 있어요.</li><li>DNA 염기 하나가 바뀌면 mRNA와 아미노산 서열이 달라질 수 있어요(과오 · 넌센스). 인트론의 염기는 가공에서 제거되어 단백질에 영향이 없어요.</li><li>mRNA의 <b>5′ 캡 · 폴리 A 꼬리</b>는 mRNA를 보호하고 번역 효율을 높여요.</li><li>성숙 mRNA 600 nt 중 암호 부분 543 nt = 코돈 181개 = 아미노산 180개 + 종결 코돈.</li><li>번역 시간(예시): 300개 아미노산 — 원핵 약 15초(20개/초), 진핵 약 60초(5개/초).</li></ul>',
      missions: [
        {
          id: 'lab', title: '전 과정 실행과 염기 하나 바꾸기',
          goal: '서열을 골라 <b>▶ 합성 실행</b>을 하고, DNA의 염기 <b>1개를 바꿔</b> 다시 실행해 비교하세요. 위쪽 <b>⏱ 합성 시간</b>도 재어 보세요.',
          hint: '1) 서열을 고르고 바로 합성 실행 2) DNA의 암호화 가닥에서 염기 하나를 누르고 바꿀 염기를 골라 합성 실행 3) 위쪽 ⏱ 합성 시간에서 시간 재기. 인트론의 염기를 바꾸면 결과가 어떻게 될지도 예상해 보세요.',
          setup() { setMode('lab'); },
          check: () => LAB.ranOrig && LAB.ranMut && LAB.tmRan, hold: 0.6,
          status: () => mark(LAB.ranOrig) + ' 원래 서열 실행 &nbsp; ' + mark(LAB.ranMut) + ' 염기 1개 바꿔 실행 &nbsp; ' + mark(LAB.tmRan) + ' 합성 시간 비교',
          explain: '염기를 바꾸면 mRNA와 아미노산 서열이 달라질 수 있어요. 아미노산이 바뀌면 과오, 종결 코돈이 생기면 넌센스, 같은 아미노산이면 침묵 돌연변이예요. 인트론 안의 염기(스플라이싱 신호 제외)는 가공에서 제거되므로 단백질이 바뀌지 않아요. 같은 300개 아미노산 단백질을 만드는 데 진핵은 원핵보다 약 4배 오래 걸려요.',
        },
        {
          type: 'quiz', title: '5′ 캡과 폴리 A 꼬리',
          goal: '진핵 mRNA의 5′ 캡과 폴리 A 꼬리가 하는 일로 가장 알맞은 것은? (스스로 추론해 보세요)',
          setup() { setMode('lab'); },
          choices: ['mRNA를 분해로부터 보호하고 번역 효율을 높인다', '아미노산을 지정하는 코돈이 되어 단백질의 일부가 된다', '인트론을 잘라 내는 가위 역할을 한다', 'mRNA가 핵공을 통과하지 못하게 막는다'],
          answer: 0,
          feedback: ['', '캡과 꼬리는 번역되지 않는 부분이에요. 코돈이 되지 않아요.', '인트론 제거는 스플라이싱이 해요. 캡과 꼬리는 mRNA의 양 끝에 붙어요.', '가공이 끝난 mRNA가 핵공을 지나 세포질로 나가요. 막는 것이 아니에요.'],
          explain: '5′ 캡과 폴리 A 꼬리는 mRNA의 양 끝을 감싸 세포질의 분해 효소로부터 <b>보호</b>하고, 리보솜이 mRNA에 붙어 번역을 시작하는 효율을 <b>높여요</b>. 그래서 진핵 mRNA는 캡과 꼬리가 있어야 오래, 효율적으로 번역돼요.',
        },
        {
          type: 'quiz', title: '암호 부분 543 nt에서 만들어지는 아미노산 수',
          goal: '성숙 mRNA 600 nt 중 암호 부분은 543 nt이고, 끝에 종결 코돈이 있어요. 이 암호 부분에서 만들어지는 단백질의 아미노산은 몇 개일까요?',
          setup() { setMode('lab'); },
          choices: ['543개', '181개', '180개', '600개'],
          answer: 2,
          feedback: ['543은 염기 수예요. 코돈 하나는 염기 3개로 아미노산 1개를 지정해요.', '543 nt를 3으로 나누면 코돈 181개인데, 종결 코돈은 아미노산을 지정하지 않아요.', '', '600은 성숙 mRNA의 전체 염기 수예요. 암호 부분 밖의 비번역 부분도 있어요.'],
          explain: '543 nt는 코돈 181개(543을 3으로 나눈 수)예요. 이 중 마지막 하나는 종결 코돈이라 아미노산을 만들지 않으므로 단백질은 <b>180개</b>의 아미노산으로 이루어져요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hg-central-dogma', mount: '#game', badge: '단백질 합성 기술자', homeHref: '../../index.html#hg',
    featureLabels: { flow: '🧫 세포 단면', tx: '🧬 전사', proc: '✂ RNA 가공', tl: '🏭 번역', poly: '🔗 폴리리보솜', lab: '🧪 합성 모의실험', time: '⏱ 합성 시간' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 읽음 칸 ---------- */
  function readouts() {
    const m = S.mode;
    if (m === 'flow') {
      const tm = flowTimes();
      setReads(['세포', F.cell === 'euk' ? '진핵 세포' : '원핵 세포', '진행', F.t <= 0 ? '대기' : fmtN(F.t, 1) + '초', '번역 시작', F.t <= 0 ? '—' : (F.t >= tm.tlStart ? tm.tlStart.toFixed(1) + '초 (전사 끝 ' + tm.txEnd.toFixed(1) + '초)' : '아직')]);
    } else if (m === 'tx') {
      setReads(['단계', TX.state === 'idle' ? '대기' : TX.state === 'bind' ? '개시' : TX.state === 'elong' ? '신장' : TX.state === 'fail' ? '시작 못 함' : TX.state === 'done' ? '완료' : '종결', '합성한 염기', TX.n + ' / 21', '주형 가닥', TX.choice ? (TX.choice === 'top' ? '위쪽' : '아래쪽') : '—']);
    } else if (m === 'proc') {
      setReads(['mRNA 길이', fmtN(Math.round(procLen())) + ' nt', '가공 단계', PR.ops.length + ' / 3', '위치', PR.exported ? '세포질' : PR.exporting ? '핵공 통과 중' : '핵 안']);
    } else if (m === 'tl') {
      setReads(['상태', TL.state === 'idle' ? '대기' : TL.state === 'scan' || TL.state === 'dock' ? '개시' : TL.state === 'stopwait' || TL.state === 'release' || TL.state === 'done' ? '종결' : '신장', '사슬 길이', TL.chain.length + '개', 'A 자리 코돈', (TL.state === 'wait' || TL.state === 'enter' || TL.state === 'stopwait') ? TL_COD[TL.rk + 1] : '—']);
    } else if (m === 'poly') {
      setReads(['리보솜', PL.n + '개', '경과', fmtN(PL.clock, 1) + '초', '완성한 단백질', plProt(PL.clock, PL.n) + '개']);
    } else if (m === 'lab') {
      const sq = SEQS[LAB.key];
      setReads(['서열', sq.name, '단계', LAB.run ? (LAB.p < 0.45 ? '전사' : LAB.p < 0.6 ? '가공' : '번역') : LAB.res ? '완료' : '대기', '바꾼 염기', LAB.mut ? LAB.mut.i + 1 + '번째 ' + LAB.mut.from + '→' + LAB.mut.to : '없음']);
    } else {
      setReads(['원핵', fmtN(Math.min(15, TM.t), 0) + ' / 15초', '진핵', fmtN(Math.min(60, TM.t), 0) + ' / 60초', '속도', TM.run ? '8배' : '—']);
    }
  }

  /* ---------- 시작 ---------- */
  setMode('flow');
  let lastFree = false, lastLv = -1;
  SciSim.loop((dt, t) => {
    clock = t; S.t = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (game && game.level !== lastLv) { lastLv = game.level; updateCtl(); }
    view.apply(); ctx.clearRect(0, 0, VW, VH);
    bgFill('#eef4f2', '#e3ece8');
    FX.update(dt);
    switch (S.mode) {
      case 'flow': flowDraw(dt, t); break;
      case 'tx': txDraw(dt, t); break;
      case 'proc': procDraw(dt, t); break;
      case 'tl': tlDraw(dt, t); break;
      case 'poly': polyDraw(dt, t); break;
      case 'lab': labDraw(dt, t); break;
      case 'time': timeDraw(dt, t); break;
    }
    FX.draw();
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(241,246,243,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, PHONE, get game() { return game; }, levels, setMode, updateCtl, F, TX, PR, TL, PL, LAB, TM, SEQS, flowRun, setCell, nameAssign, txPick, txRun, procOp, procExport, procReset, tlStart, tlPick, tlRelease, tlReset, plSet, labPick, labSelect, labBase, labRun, labReset, labCompute, tmRun, codonAA, translateORF, tlDraw, tlStep, txDraw, flowDraw,
  };
})();
