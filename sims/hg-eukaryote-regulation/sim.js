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
     고등학교 생물의 유전 · Ⅱ. 유전자의 발현 - 진핵생물의 발현 조절 (단원 60, 4차시)
     성취기준 [12유전02-03] 원핵생물과 진핵생물의 유전자 발현 조절 과정을 비교하기 위한 설명 자료를 다양한 매체를 활용하여 제작할 수 있다. (진핵생물: 원핵과 다른 점만)
     ① 모형: 달라지는 점  ② 모형: 전사 인자  ③ 분석: 여러 단계  ④ 소통: 설명 자료
     (mRNA 수 · 단백질 양은 교육용 예시 값이에요)
     ========================================================= */
  const S = { mode: 'compare', fade: 0, t: 0 };
  let game = null;
  const ctlNodes = $$('#ctrlCard .control');

  /* =========================================================
     ① 달라지는 점: 원핵 / 진핵 나란히 보기 + 핫스팟 5곳
     ========================================================= */
  const HOT = [
    { n: '①', name: '장소 · 핵막', pro: '핵막이 없어서 전사와 번역이 같은 공간에서 거의 동시에 일어나요.', euk: '핵막이 있어서 핵 안에서 전사 · RNA 가공을 하고, 세포질에서 번역해요.' },
    { n: '②', name: '염색질', pro: '히스톤에 감긴 염색질이 없어서 RNA 중합 효소가 프로모터에 곧바로 접근할 수 있어요.', euk: 'DNA가 히스톤에 감긴 염색질이라서, 풀려야 전사 인자와 RNA 중합 효소가 접근할 수 있어요.' },
    { n: '③', name: '조절 서열', pro: '프로모터 · 작동 부위 근처에 억제자 같은 조절 단백질이 붙는 비교적 단순한 조절이에요.', euk: '프로모터와 멀리 떨어진 인핸서에 여러 전사 인자가 조합해 결합해 조절해요.' },
    { n: '④', name: '오페론 · 유전자 단위', pro: '여러 유전자가 오페론으로 묶여 한 프로모터 아래에서 한 mRNA로 전사돼요.', euk: '오페론이 없고 유전자마다 개별 프로모터를 가져서 유전자마다 각각의 mRNA로 전사돼요.' },
    { n: '⑤', name: '전사 이후의 조절', pro: '주로 전사 단계에서 조절해요. (RNA 가공이 없어요)', euk: 'RNA 가공 · 핵공 수송 · mRNA 수명 · 번역 효율 · 단백질 분해에서도 조절해요.' },
  ];
  const CM = { sel: -1, seen: new Array(5).fill(false), hits: [], pr: 0 };
  function cmpGeom() {
    if (PHONE) { const s = 0.95, x0 = (480 - 380 * s) / 2; return { s, w: 380 * s, h: 180 * s, p: { x: x0, y: 38 }, e: { x: x0, y: 38 + 180 * s + 6 }, card: { x: 8, y: 38 + 2 * 180 * s + 14, w: 464, h: 640 - (38 + 2 * 180 * s + 14) - 6 } }; }
    return { s: 1.0, w: 380, h: 180, p: { x: 12, y: 44 }, e: { x: 408, y: 44 }, card: { x: 10, y: 244, w: 780, h: 306 } };
  }
  function selHot(i) { CM.sel = i; CM.seen[i] = true; Sound.tick(); CM.pr = 0; updateCtl(); }
  function drawProk(ox, oy, s, t) {
    ctx.save(); ctx.translate(ox, oy); ctx.scale(s, s);
    D.shadow(() => { D.roundRect(0, 0, 380, 180, 48); ctx.fillStyle = '#f2fbe9'; ctx.fill(); }, { blur: 8, y: 3 });
    ctx.strokeStyle = '#6aa84f'; ctx.lineWidth = 6; D.roundRect(0, 0, 380, 180, 48); ctx.stroke(); ctx.strokeStyle = '#bde08e'; ctx.lineWidth = 2; D.roundRect(8, 8, 364, 164, 42); ctx.stroke();
    pill(364, 22, '원핵생물 (대장균)', { bg: '#6aa84f', color: '#fff', size: 14, align: 'right' });
    // DNA 줄 + 오페론
    const dy = 54; ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(18, dy); ctx.lineTo(362, dy); ctx.stroke();
    const seg = [[28, 22, '#0ea5e9'], [50, 20, '#ef4444'], [74, 62, '#16a34a'], [140, 62, '#f59e0b'], [206, 62, '#14b8a6'], [292, 52, '#8b5cf6']];
    seg.forEach((g) => { D.roundRect(g[0], dy - 11, g[1], 22, 5); ctx.fillStyle = C.mix('#fff', g[2], 0.8); ctx.fill(); ctx.strokeStyle = C.shade(g[2], -0.2); ctx.lineWidth = 1.5; ctx.stroke(); });
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 1.8; ctx.setLineDash([5, 3]); D.roundRect(25, dy - 16, 250, 32, 8); ctx.stroke(); ctx.setLineDash([]);
    T(150, dy + 31, '오페론', 13, '#475569', 'center', 800);
    // 한 가닥 mRNA + 리보솜
    const my = 106; ctx.strokeStyle = '#8b5cf6'; ctx.lineWidth = 4.5; ctx.beginPath(); for (let x = 76; x <= 268; x += 4) { const yy = my + Math.sin(x / 8 + t * 2) * 2; if (x === 76) ctx.moveTo(x, yy); else ctx.lineTo(x, yy); } ctx.stroke();
    [108, 172, 236].forEach((x, i) => { ribo(x, my - 1, 0.3, {}); for (let k = 0; k < 4; k++) D.sphere(x - 3 + Math.sin(k) * 3, my + 20 + k * 8, 3.6, '#f59e0b', { gloss: false }); });
    T(172, 160, '전사와 번역이 같은 곳에서 동시에', 13, '#3f7f23', 'center', 800);
    ctx.restore();
  }
  function drawEuk(ox, oy, s, t) {
    ctx.save(); ctx.translate(ox, oy); ctx.scale(s, s);
    D.shadow(() => { D.roundRect(0, 0, 380, 180, 48); ctx.fillStyle = '#fff7df'; ctx.fill(); }, { blur: 8, y: 3 });
    ctx.strokeStyle = '#d9a441'; ctx.lineWidth = 4.5; D.roundRect(0, 0, 380, 180, 48); ctx.stroke();
    pill(364, 22, '진핵생물', { bg: '#d9a441', color: '#fff', size: 14, align: 'right' });
    // 핵
    D.shadow(() => { D.roundRect(14, 38, 232, 130, 38); ctx.fillStyle = '#ece8ff'; ctx.fill(); }, { blur: 6, y: 2 });
    ctx.strokeStyle = '#7c6ad8'; ctx.lineWidth = 4.5; D.roundRect(14, 38, 232, 130, 38); ctx.stroke();
    D.roundRect(240, 90, 12, 26, 5); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#7c6ad8'; ctx.lineWidth = 2.5; ctx.stroke();
    T(130, 160, '핵 (전사 · 가공)', 13, '#5b4bb5', 'center', 800);
    T(312, 160, '세포질 (번역)', 13, '#9a6b10', 'center', 800);
    // 염색질 + 두 유전자
    const g = [[58, '#16a34a'], [88, '#f59e0b']];
    [0, 1].forEach((i) => {
      const y = 62 + i * 30;
      ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(24, y); ctx.lineTo(236, y); ctx.stroke();
      if (i === 0) for (let x = 30; x < 112; x += 15) { D.sphere(x, y, 7.2, '#fda4af', { gloss: false, outline: '#e11d48', outlineWidth: 1.2 }); }
      D.roundRect(120, y - 8, 14, 16, 4); ctx.fillStyle = '#fed7aa'; ctx.fill(); ctx.strokeStyle = '#ea580c'; ctx.lineWidth = 1.5; ctx.stroke();
      D.roundRect(168, y - 8, 14, 16, 4); ctx.fillStyle = '#bae6fd'; ctx.fill(); ctx.strokeStyle = '#0284c7'; ctx.stroke();
      D.roundRect(186, y - 8, 44, 16, 4); ctx.fillStyle = C.mix('#fff', g[i][1], 0.78); ctx.fill(); ctx.strokeStyle = C.shade(g[i][1], -0.2); ctx.stroke();
      // 개별 mRNA
      const my = 112 + i * 20; ctx.strokeStyle = i ? '#f59e0b' : '#16a34a'; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(36, my); ctx.lineTo(210, my); ctx.stroke();
      D.sphere(33, my, 4.5, '#f97316', { gloss: false });
      // 핵공 밖 mRNA + 리보솜
      ctx.strokeStyle = i ? '#f59e0b' : '#16a34a'; ctx.beginPath(); ctx.moveTo(262, 98 + i * 34); ctx.lineTo(358, 98 + i * 34); ctx.stroke();
      ribo(310, 97 + i * 34, 0.27, {});
    });
    T(98, 50, '염색질', 12.5, '#be123c', 'center', 800, { alpha: 0 });
    ctx.restore();
  }
  function cmpHotXY(i, side) {
    // 각 핫스팟의 (국소) 위치: [원핵, 진핵]
    const P = [[336, 130], [304, 84], [48, 84], [168, 82], [174, 134]], E = [[252, 70], [64, 84], [152, 40], [214, 86], [138, 134]];
    return side === 'p' ? P[i] : E[i];
  }
  function compareScene(dt, t) {
    const g = cmpGeom();
    CM.pr += dt;
    drawProk(g.p.x, g.p.y, g.s, t); drawEuk(g.e.x, g.e.y, g.s, t);
    CM.hits = [];
    HOT.forEach((h, i) => {
      [['p', g.p], ['e', g.e]].forEach(([side, o]) => {
        const lp = cmpHotXY(i, side), x = o.x + lp[0] * g.s, y = o.y + lp[1] * g.s;
        const sel = CM.sel === i;
        if (sel) D.ring(x, y, 17, t, { color: '#f59e0b', width: 3 });
        D.sphere(x, y, 12, CM.seen[i] ? '#16a34a' : '#7c3aed', { text: String(i + 1), textScale: 1.0, shadow: true, outline: sel ? '#f59e0b' : '#fff', outlineWidth: 2 });
        CM.hits.push({ x: x - 22, y: y - 22, w: 44, h: 44, i });
      });
    });
    // 비교 카드
    const c = g.card;
    panel(c.x, c.y, c.w, c.h, 16);
    if (CM.sel < 0) {
      T(c.x + 18, c.y + 34, '❓ 두 세포의 달라지는 점을 찾아보세요', 17, '#334155', 'left', 800);
      textBlock(c.x + 18, c.y + 66, c.w - 36, '그림 속 번호 ①~⑤ 를 눌러 원핵생물과 진핵생물의 차이를 비교해요. 다섯 군데를 모두 찾아보세요.', 15, '#475569', 22, 700);
    } else {
      const h = HOT[CM.sel], colW = (c.w - 46) / 2;
      T(c.x + 18, c.y + 30, h.n + ' ' + h.name, 17, '#1f2d44', 'left', 800);
      const phH = (c.h - 40 - 6 - 6) / 2, cols = PHONE ? [[c.x + 12, c.y + 38, c.w - 24, 'pro'], [c.x + 12, c.y + 38 + phH + 6, c.w - 24, 'euk']] : [[c.x + 14, c.y + 48, colW, 'pro'], [c.x + 32 + colW, c.y + 48, colW, 'euk']];
      cols.forEach(([x, y, w, k]) => {
        const col = k === 'pro' ? '#6aa84f' : '#d9a441', hh = PHONE ? phH : c.h - 62;
        D.roundRect(x, y, w, hh, 12); ctx.fillStyle = C.rgba(col, 0.12); ctx.fill(); ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.stroke();
        T(x + 12, y + (PHONE ? 20 : 24), k === 'pro' ? '원핵생물' : '진핵생물', PHONE ? 14 : 15, C.shade(col, -0.4), 'left', 800);
        textBlock(x + 12, y + (PHONE ? 40 : 48), w - 24, h[k], PHONE ? 13 : 15.5, '#334155', PHONE ? 17 : 24, 700);
      });
    }
  }
  const comparePT = {
    down(p) { for (const r of CM.hits) if (inRect(p.x, p.y, r)) { selHot(r.i); return false; } return false; },
    hover(p) { return CM.hits.some((r) => inRect(p.x, p.y, r)) ? 'pointer' : 'default'; },
  };

  /* =========================================================
     ② 전사 인자: 염색질 · 인핸서 · 조합 조절 (AND)
     ========================================================= */
  const CELLS = { A: ['X', 'Y', 'Z'], B: ['X', 'Y'], C: ['Y', 'Z'] };
  const TFCOL = { X: '#ef4444', Y: '#2563eb', Z: '#f59e0b', B: '#8b5cf6' };
  const TFS = { cell: 'A', bound: { X: false, Y: false, Z: false }, basal: false, open: 0, loop: 0, mrna: 0, msg: '', msgT: 0, shake: {}, seenOff: { B: false, C: false }, onA: false, pos: {}, hits: [] };
  const tfAny = () => TFS.bound.X || TFS.bound.Y || TFS.bound.Z;
  const tfAll3 = () => TFS.bound.X && TFS.bound.Y && TFS.bound.Z;
  const tfOn = () => tfAll3() && TFS.basal;
  function tfMsg(m) { TFS.msg = m; TFS.msgT = 4; }
  function tfReset(keepFlags) { TFS.bound = { X: false, Y: false, Z: false }; TFS.basal = false; TFS.mrna = 0; TFS.msg = ''; if (!keepFlags) { TFS.seenOff = { B: false, C: false }; TFS.onA = false; } updateCtl(); }
  function tfCell(c) { TFS.cell = c; tfReset(true); }
  function tfToggle(k) {
    if (k === 'B') {
      if (!tfAny()) { tfMsg('염색질이 닫혀 있어서 모일 수 없어요. 먼저 전사 인자를 붙여 염색질을 풀어요.'); TFS.shake.B = 0.5; Sound.fail(); return; }
      TFS.basal = !TFS.basal; Sound.click();
    } else {
      if (CELLS[TFS.cell].indexOf(k) < 0) { tfMsg('세포 ' + TFS.cell + '에는 전사 인자 ' + k + '가 없어요.'); TFS.shake[k] = 0.5; Sound.fail(); return; }
      TFS.bound[k] = !TFS.bound[k]; Sound.click();
      if (!tfAny()) TFS.basal = false;
    }
    TFS.msg = '';
    updateCtl();
  }
  function tfGeom() {
    const y = PHONE ? 250 : 240;
    return { y, eS: VW * 0.06, eE: VW * (PHONE ? 0.34 : 0.30), pX: VW * (PHONE ? 0.58 : 0.66), pW: VW * 0.075, gW: VW * (PHONE ? 0.24 : 0.2), ty: PHONE ? 520 : 456 };
  }
  function tfScene(dt, t) {
    const G = tfGeom(); TFS.hits = [];
    TFS.msgT = Math.max(0, TFS.msgT - dt);
    TFS.open = approach(TFS.open, tfAny() ? 1 : 0, dt, 3.5);
    TFS.loop = approach(TFS.loop, tfAll3() && TFS.basal ? 1 : 0, dt, 2.6);
    if (tfOn()) TFS.mrna = Math.min(40, TFS.mrna + dt * 5);
    if (tfOn() && TFS.cell === 'A') TFS.onA = true;
    if (TFS.cell !== 'A' && TFS.basal && CELLS[TFS.cell].every((k) => TFS.bound[k]) && !tfOn()) TFS.seenOff[TFS.cell] = true;
    Object.keys(TFS.shake).forEach((k) => { TFS.shake[k] = Math.max(0, TFS.shake[k] - dt); });
    T(14, 28, '세포 ' + TFS.cell + ': 가진 전사 인자 ' + CELLS[TFS.cell].join(' · '), PHONE ? 14.5 : 16.5, '#334155', 'left', 800);
    T(14, 52, '같은 유전체(DNA)를 가졌지만 세포마다 가진 전사 인자의 조합이 달라요', PHONE ? 12.5 : 14, '#64748b', 'left', 700);
    const pull = TFS.loop * (G.pX - G.eE - (PHONE ? 56 : 80));
    const px = G.pX - pull, spacerEnd = px;
    const dnaY = G.y;
    // 염색질 구슬 (닫힘: DNA를 감싸고 있어요 / 열림: 인핸서 · 프로모터 주변이 풀려요)
    const beadsAll = [];
    for (let x = 20; x < VW - 20; x += 24) beadsAll.push(x);
    // DNA 줄
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(10, dnaY); ctx.lineTo(G.eE, dnaY); ctx.stroke();
    // 스페이서 (루프)
    const lh = TFS.loop * (PHONE ? 100 : 120);
    ctx.beginPath(); ctx.moveTo(G.eE, dnaY); ctx.bezierCurveTo(G.eE + 10, dnaY - lh * 1.3, spacerEnd - 10, dnaY - lh * 1.3, spacerEnd, dnaY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(spacerEnd, dnaY); ctx.lineTo(Math.min(VW - 8, px + G.pW + G.gW + 20), dnaY); ctx.stroke();
    if (TFS.loop < 0.5) T((G.eE + G.pX) / 2, dnaY + 30, '…… 멀리 떨어진 DNA ……', PHONE ? 12.5 : 14, '#94a3b8', 'center', 800);
    // 인핸서 · 프로모터 · 유전자
    D.roundRect(G.eS, dnaY - 14, G.eE - G.eS, 28, 7); ctx.fillStyle = '#fed7aa'; ctx.fill(); ctx.strokeStyle = '#ea580c'; ctx.lineWidth = 2.5; ctx.stroke();

    D.roundRect(px, dnaY - 14, G.pW, 28, 7); ctx.fillStyle = '#bae6fd'; ctx.fill(); ctx.strokeStyle = '#0284c7'; ctx.lineWidth = 2.5; ctx.stroke();

    D.roundRect(px + G.pW + 4, dnaY - 14, G.gW, 28, 7); ctx.fillStyle = tfOn() ? '#86efac' : '#d1d5db'; ctx.fill(); ctx.strokeStyle = tfOn() ? '#16a34a' : '#94a3b8'; ctx.lineWidth = 2.5; ctx.stroke();
    T(px + G.pW + 4 + G.gW / 2, dnaY + 5, '유전자', 14, tfOn() ? '#14532d' : '#6b7280', 'center', 800);
    // 염색질 구슬
    beadsAll.forEach((bx, i) => {
      const nearE = bx > G.eS - 30 && bx < G.eE + 20, nearP = bx > px - 40 && bx < px + G.pW + G.gW + 30 && TFS.loop < 0.9;
      const free = (nearE || nearP) && TFS.open > 0.01;
      const inLoop = bx > G.eE + 20 && bx < G.pX - 6;
      if (inLoop && TFS.loop > 0.5) return;
      if (TFS.loop > 0.5 && bx > px - 40 && bx < px + G.pW + 4 + G.gW + 8) return;   // 풀린 프로모터 · 유전자 구간은 구슬이 가리지 않아요
      const off = free ? TFS.open : 0;
      const yy = dnaY + (i % 2 ? -1 : 1) * (off * 44) + (free ? Math.sin(t * 2 + i) * 2 * off : 0), xx = bx + (free ? (i % 2 ? -6 : 6) * off : 0);
      if (!free && !(nearE || nearP) && TFS.open > 0.01) { /* 먼 곳은 그대로 */ }
      D.sphere(xx, yy, 10, '#fda4af', { gloss: true, outline: '#e11d48', outlineWidth: 1.5 });
    });
    T((G.eS + G.eE) / 2, dnaY + 44, '인핸서', 14, '#c2410c', 'center', 800, { stroke: '#fff', strokeWidth: 4 });
    T(px + G.pW / 2, dnaY + 44, '프로모터', 14, '#0369a1', 'center', 800, { stroke: '#fff', strokeWidth: 4 });
    T(PHONE ? 12 : 20, dnaY - 100, TFS.open > 0.5 ? '염색질이 풀렸어요' : '염색질이 닫혀 있어요 (히스톤에 감김)', PHONE ? 12.5 : 14, TFS.open > 0.5 ? '#16a34a' : '#be123c', 'left', 800);
    // 활성화 인자 슬롯과 결합한 인자
    const slotX = [0, 1, 2].map((i) => G.eS + (G.eE - G.eS) * (0.17 + 0.33 * i));
    ['X', 'Y', 'Z'].forEach((k, i) => {
      const bound = TFS.bound[k], has = CELLS[TFS.cell].indexOf(k) >= 0;
      const tx = bound ? slotX[i] : (PHONE ? 60 + i * 80 : 120 + i * 90), ty = bound ? dnaY - 32 : G.ty;
      TFS.pos[k] = TFS.pos[k] || { x: tx, y: ty };
      TFS.pos[k].x = approach(TFS.pos[k].x, tx, dt, 7); TFS.pos[k].y = approach(TFS.pos[k].y, ty, dt, 7);
      const sh = TFS.shake[k] > 0 && !RM ? Math.sin(t * 50) * 4 : 0;
      ctx.save(); ctx.globalAlpha = has ? 1 : 0.35;
      D.sphere(TFS.pos[k].x + sh, TFS.pos[k].y, bound ? 17 : 22, TFCOL[k], { text: k, textScale: 1.0, shadow: true });
      ctx.restore();
      if (!bound) { T(TFS.pos[k].x, TFS.pos[k].y + 42, has ? '활성화 인자 ' + k : '(이 세포에는 없음)', 12.5, has ? '#475569' : '#94a3b8', 'center', 800); TFS.hits.push({ k, x: TFS.pos[k].x - 30, y: TFS.pos[k].y - 30, w: 60, h: 60 }); }
      else TFS.hits.push({ k, x: TFS.pos[k].x - 22, y: TFS.pos[k].y - 22, w: 44, h: 44 });
    });
    // 기본 전사 인자 + RNA 중합 효소
    const bx = TFS.basal ? px + G.pW / 2 : (PHONE ? 400 : 560), by = TFS.basal ? dnaY - 36 : G.ty;
    TFS.pos.B = TFS.pos.B || { x: bx, y: by }; TFS.pos.B.x = approach(TFS.pos.B.x, bx, dt, 7); TFS.pos.B.y = approach(TFS.pos.B.y, by, dt, 7);
    const shB = TFS.shake.B > 0 && !RM ? Math.sin(t * 50) * 4 : 0;
    const bw = TFS.basal ? 76 : 148, bh = 38;
    D.shadow(() => { D.roundRect(TFS.pos.B.x - bw / 2 + shB, TFS.pos.B.y - bh / 2, bw, bh, 19); ctx.fillStyle = '#ddd6fe'; ctx.fill(); }, { blur: 6, y: 2 });
    ctx.strokeStyle = '#7c3aed'; ctx.lineWidth = 2.5; D.roundRect(TFS.pos.B.x - bw / 2 + shB, TFS.pos.B.y - bh / 2, bw, bh, 19); ctx.stroke();
    TF(TFS.pos.B.x + shB, TFS.pos.B.y + 5, TFS.basal ? '기본 인자' : '기본 전사 인자 + RNA 중합 효소', bw - 10, TFS.basal ? 12.5 : 12.5, 10, '#4c1d95', 'center', 800);
    TFS.hits.push({ k: 'B', x: TFS.pos.B.x - bw / 2, y: TFS.pos.B.y - 24, w: bw, h: 48 });
    if (!TFS.basal) T(TFS.pos.B.x, TFS.pos.B.y + 44, '프로모터에 모일 수 있어요', 12.5, '#475569', 'center', 800);
    // 인핸서 ↔ 프로모터 접촉
    if (TFS.loop > 0.6) { ctx.strokeStyle = '#7c3aed'; ctx.lineWidth = 3; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(slotX[1], dnaY - 48); ctx.quadraticCurveTo((slotX[1] + px) / 2, dnaY - 78, px + G.pW / 2, dnaY - 54); ctx.stroke(); ctx.setLineDash([]); T((G.eE + px) / 2 + 20, dnaY - lh * 1.0 - 32, '인핸서가 프로모터에 닿아요', 13, '#6d28d9', 'center', 800); }
    // LED 줄
    const ly = PHONE ? 330 : 322;
    const lsp = PHONE ? 60 : 70;
    ['X', 'Y', 'Z'].forEach((k, i) => { const x = 36 + i * lsp; D.sphere(x, ly, 11, TFS.bound[k] ? TFCOL[k] : '#d1d5db', { gloss: true }); if (TFS.bound[k]) D.glow(x, ly, 24, TFCOL[k], 0.4); T(x, ly + 28, k + (TFS.bound[k] ? ' 결합' : ''), 12.5, '#475569', 'center', 800); });
    T(36 + 3 * lsp - 12, ly + 5, 'AND', 14, '#64748b', 'center', 800);
    const gx = 36 + 3 * lsp + (PHONE ? 30 : 40);
    D.sphere(gx, ly, 14, tfOn() ? '#16a34a' : '#d1d5db', { gloss: true }); if (tfOn()) D.glow(gx, ly, 34, '#16a34a', 0.55);
    T(gx + 24, ly + 5, tfOn() ? '유전자 켜짐' : '꺼짐', 14.5, tfOn() ? '#166534' : '#6b7280', 'left', 800);
    // mRNA 통
    const mx = VW - (PHONE ? 100 : 150), my = ly - 14;
    D.roundRect(mx, my - 20, PHONE ? 80 : 130, 56, 12); ctx.fillStyle = '#faf5ff'; ctx.fill(); ctx.strokeStyle = '#a78bfa'; ctx.lineWidth = 2; ctx.stroke();
    T(mx + (PHONE ? 40 : 65), my - 26, 'mRNA 수', 13, '#6d28d9', 'center', 800, { stroke: '#fff', strokeWidth: 4 });
    for (let i = 0; i < Math.floor(TFS.mrna / 2); i++) { const cx = mx + 10 + (i % (PHONE ? 7 : 11)) * 11, cy = my + 24 - Math.floor(i / (PHONE ? 7 : 11)) * 11; D.sphere(cx, cy, 4.2, '#8b5cf6', { gloss: false }); }
    T(mx + (PHONE ? 40 : 65), my + 52, Math.floor(TFS.mrna) + '개', 14, '#334155', 'center', 800);
    // 안내
    let msg = TFS.msgT > 0 ? TFS.msg : !tfAny() ? '① 활성화 인자를 눌러 인핸서에 붙여요. 염색질이 풀려요.' : !TFS.basal ? '② 아래 [기본 전사 인자 + RNA 중합 효소]를 눌러 프로모터에 모아요.' : tfAll3() ? '③ 인핸서 고리가 프로모터에 닿아 유전자가 켜졌어요!' : '활성화 인자 3종(X · Y · Z)이 모두 있어야 켜져요. (AND)';
    TF(VW / 2, PHONE ? 380 : 366, msg, VW - 24, PHONE ? 13.5 : 15, 11.5, TFS.msgT > 0 ? '#b91c1c' : '#1f2d44', 'center', 800);
  }
  const tfPT = {
    down(p) { for (const r of TFS.hits) if (inRect(p.x, p.y, r)) { tfToggle(r.k); return false; } return false; },
    hover(p) { return TFS.hits.some((r) => inRect(p.x, p.y, r)) ? 'pointer' : 'default'; },
  };

  /* =========================================================
     ③ 여러 단계: mRNA 수 = 합성 속도 × 수명 · 단백질 양
     ========================================================= */
  const GX = { rate: 10, life: 5, tr: 1, dg: 1, target: false, mR: 50, pR: 100, t0: 0 };
  const gxM = () => GX.rate * GX.life;
  const gxP = () => 100 * (gxM() / 50) * GX.tr / GX.dg;
  const fmtG = (v) => (Math.abs(v - Math.round(v)) < 0.05 ? String(Math.round(v)) : v.toFixed(1));
  function tank(x, y, w, h, frac, col, ticks, maxTxt, label) {
    D.roundRect(x, y, w, h, 14); ctx.fillStyle = '#fff'; ctx.fill();
    ctx.save(); D.roundRect(x, y, w, h, 14); ctx.clip();
    const fh = h * clamp(frac, 0, 1);
    const g = ctx.createLinearGradient(0, y + h - fh, 0, y + h); g.addColorStop(0, C.rgba(col, 0.7)); g.addColorStop(1, C.rgba(col, 0.95));
    ctx.fillStyle = g; ctx.fillRect(x, y + h - fh, w, fh);
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(x, y + h - fh, w, 4);
    ctx.restore();
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 3; D.roundRect(x, y, w, h, 14); ctx.stroke();
    ticks.forEach((tk) => { const yy = y + h - h * tk[0]; ctx.strokeStyle = 'rgba(100,116,139,.55)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x + 10, yy); ctx.stroke(); T(x - 5, yy + 4.5, tk[1], 12.5, '#64748b', 'right', 700); });
  }
  function drips(x, y, n, speed, col, t) {
    for (let i = 0; i < n; i++) { const ph = (t * speed + i / n) % 1; ctx.save(); ctx.globalAlpha = 1 - ph; D.sphere(x + Math.sin(i * 2) * 4, y + ph * 30, 3.6, col, { gloss: false }); ctx.restore(); }
  }
  function stagesScene(dt, t) {
    GX.mR = approach(GX.mR, gxM(), dt, 5); GX.pR = approach(GX.pR, gxP(), dt, 5);
    T(14, 28, '유전자 X의 발현: 4단계 조절', PHONE ? 15 : 17, '#334155', 'left', 800);
    if (!PHONE) {
      // 전사
      D.shadow(() => { D.roundRect(34, 100, 100, 150, 14); ctx.fillStyle = '#ecfdf5'; ctx.fill(); }, { blur: 6, y: 2 });
      ctx.strokeStyle = '#16a34a'; ctx.lineWidth = 2.5; D.roundRect(34, 100, 100, 150, 14); ctx.stroke();
      T(84, 124, '① 전사', 15, '#166534', 'center', 800);
      helix(46, 122, 164, 9, t, '#16a34a', '#0d7a4a', { spin: 0.6, lw: 2.5 });
      T(84, 206, fmtG(GX.rate) + '개/시간', 18, '#166534', 'center', 800);
      T(84, 230, '합성 속도', 13, '#475569', 'center', 700);
      D.arrow(136, 175, 206, 175, { color: '#8b5cf6', width: 3 + GX.rate / 4, head: 12 });
      // mRNA 통
      tank(246, 100, 150, 250, GX.mR / 200, '#8b5cf6', [[0, '0'], [0.25, '50'], [0.5, '100'], [0.75, '150'], [1, '200']], '200', 'mRNA');
      const nd = Math.round(GX.mR / 5); for (let i = 0; i < nd; i++) { const cx = 262 + (i % 8) * 16, cy = 340 - Math.floor(i / 8) * 14; if (cy > 106) D.sphere(cx, cy, 5, '#7c3aed', { gloss: false }); }
      T(321, 380, 'mRNA ' + fmtG(GX.mR) + '개', 17, '#5b21b6', 'center', 800);
      T(321, 400, '= 속도 × 수명 = ' + fmtG(GX.rate) + ' × ' + fmtG(GX.life), 13.5, '#475569', 'center', 800);
      drips(321, 352, 4, 0.5 + 1 / GX.life * 1.4, '#a78bfa', t); T(321, 426, '② 수명 ' + fmtG(GX.life) + '시간 (분해되기까지)', 13, '#6d28d9', 'center', 800);
      D.arrow(402, 175, 480, 175, { color: '#f59e0b', width: 2 + GX.tr * 5, head: 12 + GX.tr * 3 });
      T(441, 150, '③ 번역 효율', 13, '#b45309', 'center', 800); T(441, 212, '×' + fmtG(GX.tr), 16, '#b45309', 'center', 800);
      // 단백질 통
      tank(520, 100, 150, 250, GX.pR / 1600, '#f59e0b', [[0, '0'], [0.25, '400'], [0.5, '800'], [0.75, '1200'], [1, '1600']], '1600', '단백질');
      const nb = Math.min(60, Math.round(GX.pR / 28)); for (let i = 0; i < nb; i++) { const cx = 536 + (i % 8) * 16, cy = 340 - Math.floor(i / 8) * 14; if (cy > 106) D.sphere(cx, cy, 5, '#f59e0b', { gloss: false }); }
      T(595, 380, '단백질 ' + fmtG(Math.round(GX.pR * 10) / 10) + ' (상대량)', 17, '#92400e', 'center', 800);
      T(595, 400, '= 100 × (mRNA/50) × ' + fmtG(GX.tr) + ' / ' + fmtG(GX.dg), 13.5, '#475569', 'center', 800);
      drips(595, 352, 4, 0.4 + GX.dg * 0.8, '#fbbf24', t); T(595, 426, '④ 분해 ×' + fmtG(GX.dg), 13, '#92400e', 'center', 800);
      if (GX.target) { const yy = 100 + 250 - 250 * (400 / 1600); ctx.strokeStyle = '#e2464b'; ctx.lineWidth = 2.5; ctx.setLineDash([7, 5]); ctx.beginPath(); ctx.moveTo(516, yy); ctx.lineTo(676, yy); ctx.stroke(); ctx.setLineDash([]); pill(518, yy - 14, '목표 400', { bg: '#e2464b', color: '#fff', size: 13, align: 'right' }); }
      panel(690, 100, 100, 250, 12);
      textBlock(698, 126, 86, '기준 상태', 13.5, '#334155', 18, 800);
      textBlock(698, 148, 86, '10개/시간 × 5시간 = mRNA 50개', 12.5, '#475569', 17, 700);
      textBlock(698, 214, 86, '수명이 2배(10시간)이면 mRNA 100개, 단백질도 약 2배', 12.5, '#475569', 17, 700);
    } else {
      const bx = 40, bw = VW - 80;
      T(14, 56, '① 전사 속도 ' + fmtG(GX.rate) + '개/시간  →  ② mRNA 수명 ' + fmtG(GX.life) + '시간', 13.5, '#166534', 'left', 800);
      D.roundRect(bx + 30, 84, bw - 40, 56, 14); ctx.fillStyle = '#f3e8ff'; ctx.fill();
      ctx.save(); D.roundRect(bx + 30, 84, bw - 40, 56, 14); ctx.clip(); ctx.fillStyle = '#8b5cf6'; ctx.fillRect(bx + 30, 84, (bw - 40) * clamp(GX.mR / 200, 0, 1), 56); ctx.restore();
      ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 3; D.roundRect(bx + 30, 84, bw - 40, 56, 14); ctx.stroke();
      [0, 0.25, 0.5, 0.75, 1].forEach((f) => T(bx + 30 + (bw - 40) * f, 160, String(Math.round(f * 200)), 12.5, '#64748b', 'center', 700));
      T(bx + 30 + (bw - 40) / 2, 118, 'mRNA ' + fmtG(GX.mR) + '개', 16, '#fff', 'center', 800, { stroke: '#5b21b6', strokeWidth: 3 });
      T(14, 200, '③ 번역 효율 ×' + fmtG(GX.tr) + '  →  ④ 분해 ×' + fmtG(GX.dg), 13.5, '#92400e', 'left', 800);
      D.roundRect(bx + 30, 226, bw - 40, 56, 14); ctx.fillStyle = '#fff7e0'; ctx.fill();
      ctx.save(); D.roundRect(bx + 30, 226, bw - 40, 56, 14); ctx.clip(); ctx.fillStyle = '#f59e0b'; ctx.fillRect(bx + 30, 226, (bw - 40) * clamp(GX.pR / 1600, 0, 1), 56); ctx.restore();
      ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 3; D.roundRect(bx + 30, 226, bw - 40, 56, 14); ctx.stroke();
      [0, 0.25, 0.5, 0.75, 1].forEach((f) => T(bx + 30 + (bw - 40) * f, 302, String(Math.round(f * 1600)), 12.5, '#64748b', 'center', 700));
      T(bx + 30 + (bw - 40) / 2, 260, '단백질 ' + fmtG(Math.round(GX.pR * 10) / 10), 16, '#fff', 'center', 800, { stroke: '#92400e', strokeWidth: 3 });
      if (GX.target) { const xx = bx + 30 + (bw - 40) * 0.25; ctx.strokeStyle = '#e2464b'; ctx.lineWidth = 2.5; ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.moveTo(xx, 218); ctx.lineTo(xx, 290); ctx.stroke(); ctx.setLineDash([]); pill(xx, 212, '목표 400', { bg: '#e2464b', color: '#fff', size: 13 }); }
      panel(14, 336, VW - 28, 150, 12);
      textBlock(26, 362, VW - 52, 'mRNA 수 = 합성 속도 × 평균 수명', 14.5, '#334155', 20, 800);
      textBlock(26, 388, VW - 52, '= ' + fmtG(GX.rate) + ' × ' + fmtG(GX.life) + ' = ' + fmtG(GX.mR) + '개 (기준: 10 × 5 = 50개)', 14, '#475569', 20, 700);
      textBlock(26, 420, VW - 52, '단백질 = 100 × (mRNA 수/50) × 번역 효율 / 분해 속도', 14, '#334155', 20, 800);
      textBlock(26, 446, VW - 52, '수명이 2배(10시간)이면 mRNA 100개, 단백질도 약 2배예요.', 14, '#475569', 20, 700);
    }
    TF(VW / 2, PHONE ? 520 : 468, gxM() === 50 && GX.tr === 1 && GX.dg === 1 ? '기준 상태: mRNA 50개 · 단백질 100 (상대량)' : '현재 단백질 양은 기준의 ' + fmtG(Math.round(gxP()) / 100) + '배 (' + fmtG(Math.round(gxP() * 10) / 10) + ')', VW - 28, 16, 12, '#1f2d44', 'center', 800);
  }

  /* ---------- 단계 – 사례 연결 ---------- */
  const STAGES = [['chrom', '① 염색질 접근', '#e11d48'], ['init', '② 전사 개시', '#7c3aed'], ['proc', '③ RNA 가공', '#0ea5e9'], ['mrna', '④ mRNA 수송 · 수명', '#16a34a'], ['trans', '⑤ 번역', '#f59e0b'], ['prot', '⑥ 단백질 활성 · 분해', '#14b8a6']];
  const CASES = [['c3', '수명이 짧은 mRNA로 빠른 반응', 'mrna'], ['c1', '호르몬 수용체가 전사 인자로 작용', 'init'], ['c5', '리보솜이 mRNA에 잘 붙어요', 'trans'], ['c2', '같은 RNA에서 인트론 제거 방식이 달라져요', 'proc'], ['c6', '세포 주기 단백질을 제때 분해', 'prot'], ['c4', '히스톤이 느슨해져 DNA가 드러나요', 'chrom']];
  const LK = { so: null };
  function lkBuild() {
    const c = PHONE ? 1 : 2, w = PHONE ? 464 : 384, h = PHONE ? 52 : 66, gp = PHONE ? 4 : 8;
    const boxes = STAGES.map((s, i) => ({ id: s[0], label: s[1], col: s[2], x: 8 + (i % c) * (w + 8), y: 42 + Math.floor(i / c) * (h + gp), w, h, cols: 1, hdr: PHONE ? 22 : 24 }));
    const cards = CASES.map((k) => ({ id: k[0], label: k[1], col: '#0ea5e9' }));
    const ty = 42 + Math.ceil(STAGES.length / c) * (h + gp) + (PHONE ? 24 : 32);
    LK.so = selectable({ cards, boxes, cw: PHONE ? 464 : 384, ch: PHONE ? 34 : 44, kh: PHONE ? 26 : 34, tray: (i) => ({ x: 8 + (i % c) * (w + 8), y: ty + Math.floor(i / c) * (PHONE ? 38 : 52) }), onChange() { updateCtl(); } });
  }
  const lkWrong = () => LK.so.cards.filter((c) => c.zone && c.zone !== CASES.find((k) => k[0] === c.id)[2]);
  function linkScene(dt, t) {
    LK.so.update(dt);
    T(14, 28, '단계마다 알맞은 사례 카드를 연결해요', PHONE ? 14.5 : 16.5, '#334155', 'left', 800);
    LK.so.drawBoxes();
    const ty = 42 + Math.ceil(STAGES.length / (PHONE ? 1 : 2)) * ((PHONE ? 52 + 4 : 66 + 8)) + (PHONE ? 6 : 12);
    T(14, ty + 4, '사례 카드 (끌어서 놓거나, 카드 → 칸 순서로 눌러요)', 13.5, '#64748b', 'left', 800);
    LK.so.drawCards();
  }
  const linkPT = sorterPT(() => LK.so);

  /* =========================================================
     ④ 설명 자료 만들기: 매체 고르기 + 필수 요소 6개 + 정확성 점검
     ========================================================= */
  const MEDIA = [['diagram', '비교 도식', '구성', '#0ea5e9'], ['poster', '포스터', '섹션', '#f59e0b'], ['cards', '카드뉴스', '카드', '#ec4899'], ['storyboard', '영상 콘티', '컷', '#8b5cf6'], ['slides', '디지털 슬라이드', '슬라이드', '#16a34a']];
  const ELEM = [
    { name: '유전자 묶음', opts: ['원핵생물은 유전자를 오페론으로 묶어 한 mRNA로 전사하고, 진핵생물은 유전자마다 개별 프로모터를 가져요.', '원핵생물은 유전자마다 개별 프로모터를 갖고, 진핵생물은 오페론으로 묶어 한 mRNA로 전사해요.', '원핵생물과 진핵생물 모두 유전자가 오페론으로 묶여 있어요.'], ans: 0 },
    { name: '일어나는 장소', opts: ['원핵생물은 핵 안에서 전사하고 세포질에서 번역해요.', '진핵생물은 핵에서 전사 · 가공하고 세포질에서 번역하지만, 원핵생물은 같은 공간에서 거의 동시에 해요.', '진핵생물은 번역도 핵 안에서 일어나요.'], ans: 1 },
    { name: '염색질', opts: ['원핵생물도 DNA가 히스톤에 감긴 염색질이 풀려야 전사가 돼요.', '진핵생물은 DNA가 히스톤에 감긴 염색질이 풀려야 전사할 수 있고, 원핵생물에는 이런 히스톤 염색질이 없어요.', '진핵생물의 DNA는 염색질 없이 맨몸으로 있어요.'], ans: 1 },
    { name: '전사 인자 · 인핸서', opts: ['전사 인자는 원핵생물에만 있어요.', '인핸서는 반드시 프로모터 바로 옆에 붙어 있어야 해요.', '진핵생물은 여러 전사 인자가 멀리 있는 인핸서에도 조합해 결합해 조절하고, 원핵생물은 억제자 · 작동 부위 같은 비교적 단순한 조절을 해요.'], ans: 2 },
    { name: '전사 후 조절', opts: ['전사가 끝나면 어떤 조절도 일어나지 않아요.', '진핵생물은 RNA 가공 · 수송 · mRNA 수명 · 번역 · 단백질 분해에서도 조절하고, 원핵생물은 주로 전사 단계에서 조절해요.', '원핵생물에서만 mRNA 수명이 조절돼요.'], ans: 1 },
    { name: '대표 예시', opts: ['원핵생물은 젖당 오페론, 진핵생물은 스테로이드 호르몬 수용체가 전사 인자로 작용하는 경우예요.', '젖당 오페론은 진핵생물의 대표 예시예요.', '스테로이드 호르몬은 세포막 수용체에 붙어 mRNA를 직접 번역해요.'], ans: 0 },
  ];
  const MD = { medium: null, pick: new Array(6).fill(-1), slot: 0, checked: false, res: new Array(6).fill(null) };
  function mdMedium(k) { MD.medium = k; MD.checked = false; Sound.click(); updateCtl(); }
  function mdPick(i, o) { MD.pick[i] = o; MD.checked = false; MD.res[i] = null; Sound.tick(); updateCtl(); }
  function mdCheck() {
    MD.checked = true; let ok = 0;
    MD.res = MD.pick.map((p, i) => (p < 0 ? 'empty' : p === ELEM[i].ans ? 'ok' : 'bad'));
    MD.res.forEach((r) => { if (r === 'ok') ok++; });
    if (ok === 6) Sound.success(); else Sound.fail();
    updateCtl();
  }
  function mdReset() { MD.pick = new Array(6).fill(-1); MD.checked = false; MD.res = new Array(6).fill(null); MD.slot = 0; updateCtl(); }
  function mdSlotRect(i) {
    if (PHONE) return { x: 8, y: 66 + i * 90, w: 464, h: 84 };
    return { x: 10 + (i % 2) * 396, y: 74 + Math.floor(i / 2) * 140, w: 384, h: 132 };
  }
  function mediaScene(dt, t) {
    const m = MD.medium ? MEDIA.find((x) => x[0] === MD.medium) : null, col = m ? m[3] : '#94a3b8';
    D.roundRect(8, 8, VW - 16, PHONE ? 46 : 52, 12); ctx.fillStyle = C.rgba(col, 0.16); ctx.fill(); ctx.strokeStyle = col; ctx.lineWidth = 2.5; ctx.stroke();
    TF(VW / 2, PHONE ? 38 : 40, m ? '원핵 vs 진핵 유전자 발현 조절 — ' + m[1] : '먼저 매체를 골라요 (위쪽 단추)', VW - 30, PHONE ? 15 : 18, 12, C.shade(col, -0.4), 'center', 800);
    MD.slotRects = [];
    ELEM.forEach((e, i) => {
      const r = mdSlotRect(i), sel = MD.slot === i, p = MD.pick[i], res = MD.res[i];
      MD.slotRects.push(r);
      D.shadow(() => { D.roundRect(r.x, r.y, r.w, r.h, 14); ctx.fillStyle = res === 'ok' ? '#effaf1' : res === 'bad' ? '#fdeceb' : '#fff'; ctx.fill(); }, { blur: sel ? 10 : 5, y: 2 });
      ctx.strokeStyle = res === 'ok' ? '#16a34a' : res === 'bad' ? '#e2464b' : sel ? col : '#cbd5e1'; ctx.lineWidth = sel || res ? 3 : 2; D.roundRect(r.x, r.y, r.w, r.h, 14); ctx.stroke();
      const pre = m ? m[2] : '칸';
      pill(r.x + 12, r.y + 18, pre + ' ' + (i + 1) + ' · ' + e.name, { bg: C.rgba(col, 0.18), color: C.shade(col, -0.4), size: 13, align: 'left' });
      if (res) T(r.x + r.w - 14, r.y + 24, res === 'ok' ? '✅ 정확해요' : res === 'bad' ? '⚠ 다시 확인' : '⬜ 비어 있어요', 13.5, res === 'ok' ? '#16a34a' : res === 'bad' ? '#b91c1c' : '#64748b', 'right', 800);
      if (p < 0) T(r.x + 14, r.y + r.h / 2 + 18, sel ? '← 오른쪽 목록에서 알맞은 설명을 골라요' : '+ 눌러서 설명 고르기', 14, '#94a3b8', 'left', 800);
      else { const lines = wrap(e.opts[p], r.w - 28, PHONE ? 13 : 14, 700).slice(0, PHONE ? 3 : 5); lines.forEach((l, k) => T(r.x + 14, r.y + 46 + k * (PHONE ? 16.5 : 19), l, PHONE ? 13 : 14, '#334155', 'left', 700)); }
    });
    const ok = MD.res.filter((x) => x === 'ok').length;
    if (MD.checked) T(VW / 2, PHONE ? 626 : 548, ok === 6 ? '체크리스트 통과! 필수 요소 6개가 모두 정확해요 🎉' : '점검 결과 ' + ok + ' / 6 통과 — ⚠ · ⬜ 칸을 보완해요', 15.5, ok === 6 ? '#15803d' : '#b45309', 'center', 800);
  }
  const mediaPT = {
    down(p) { for (let i = 0; i < (MD.slotRects || []).length; i++) if (inRect(p.x, p.y, MD.slotRects[i])) { MD.slot = i; Sound.tick(); updateCtl(); return false; } return false; },
    hover(p) { return (MD.slotRects || []).some((r) => inRect(p.x, p.y, r)) ? 'pointer' : 'default'; },
  };

  /* =========================================================
     화면 전환 · 조작 연결
     ========================================================= */
  function setMode(m) {
    if (S.mode !== m) S.fade = 1;
    S.mode = m; hideHint();
    PT = m === 'compare' ? comparePT : m === 'tf' ? tfPT : m === 'link' ? linkPT : m === 'media' ? mediaPT : null;
    updateCtl();
  }
  function mdOptsHTML() {
    const e = ELEM[MD.slot];
    return e.opts.map((o, i) => '<button type="button" class="mc' + (MD.pick[MD.slot] === i ? ' on' : '') + '" data-v="' + i + '">' + o + '</button>').join('');
  }
  function updateCtl() {
    const fr0 = game ? game.free : false, lvNow = game ? game.level : 0;
    ctlNodes.forEach((n) => { n.hidden = (n.dataset.modes || '').split(' ').indexOf(S.mode) < 0; });
    modeBtns(S.mode, lvNow, fr0);
    $('#cmpMade').innerHTML = HOT.map((h, i) => '<li class="' + (CM.seen[i] ? 'on' : '') + '">' + mark(CM.seen[i]) + ' ' + h.n + ' ' + h.name + '</li>').join('');
    chipOn($('#tfCell'), TFS.cell);
    $$('#tfTok button').forEach((b) => { const k = b.dataset.v; b.classList.toggle('on', k === 'B' ? TFS.basal : TFS.bound[k]); b.disabled = k !== 'B' && CELLS[TFS.cell].indexOf(k) < 0; });
    $('#tfMade').innerHTML = [[TFS.onA, '세포 A에서 유전자 켜기'], [TFS.seenOff.B, '세포 B에서는 켜지지 않는 것 확인'], [TFS.seenOff.C, '세포 C에서는 켜지지 않는 것 확인']].map((r) => '<li class="' + (r[0] ? 'on' : '') + '">' + mark(r[0]) + ' ' + r[1] + '</li>').join('');
    $('#oRate').textContent = fmtG(GX.rate); $('#oLife').textContent = fmtG(GX.life); $('#oTr').textContent = '×' + fmtG(GX.tr); $('#oDg').textContent = '×' + fmtG(GX.dg);
    $('#gxRes').textContent = 'mRNA ' + fmtG(gxM()) + '개 · 단백질 ' + fmtG(Math.round(gxP() * 10) / 10);
    chipOn($('#mdSel'), MD.medium);
    $$('#mdSlots button').forEach((b) => { const i = +b.dataset.v; b.classList.toggle('on', MD.slot === i); b.classList.toggle('seen', MD.pick[i] >= 0); });
    $('#mdSlotT').textContent = (MD.slot + 1) + '번 · ' + ELEM[MD.slot].name + ' — 알맞은 설명을 고르세요';
    const html = mdOptsHTML(); if ($('#mdOpts').dataset.k !== html) { $('#mdOpts').innerHTML = html; $('#mdOpts').dataset.k = html; $$('#mdOpts button').forEach((b) => b.addEventListener('click', () => mdPick(MD.slot, +b.dataset.v))); }
    $('#lkMade').innerHTML = '<li class="' + (LK.so && LK.so.placed === 6 ? 'on' : '') + '">' + mark(LK.so && LK.so.placed === 6) + ' 연결한 카드 ' + (LK.so ? LK.so.placed : 0) + ' / 6</li>';
  }
  bindModes(setMode);
  $$('#tfCell button').forEach((b) => b.addEventListener('click', () => { Sound.click(); tfCell(b.dataset.v); }));
  $$('#tfTok button').forEach((b) => b.addEventListener('click', () => tfToggle(b.dataset.v)));
  $('#tfReset').addEventListener('click', () => { Sound.click(); tfReset(true); });
  [['sRate', 'oRate', 'rate'], ['sLife', 'oLife', 'life'], ['sTr', 'oTr', 'tr'], ['sDg', 'oDg', 'dg']].forEach(([sid, oid, key]) => SciSim.bindRange($('#' + sid), $('#' + oid), (v) => String(v), (v) => { GX[key] = v; updateCtl(); }));
  function gxBase() { GX.rate = 10; GX.life = 5; GX.tr = 1; GX.dg = 1; [['sRate', 10], ['sLife', 5], ['sTr', 1], ['sDg', 1]].forEach(([id, v]) => { const e = $('#' + id); e.value = v; e.dispatchEvent(new Event('input')); }); updateCtl(); }
  $('#gxReset').addEventListener('click', () => { Sound.click(); gxBase(); });
  $('#lkReset').addEventListener('click', () => { Sound.click(); LK.so.reset(); });
  $$('#mdSel button').forEach((b) => b.addEventListener('click', () => mdMedium(b.dataset.v)));
  $$('#mdSlots button').forEach((b) => b.addEventListener('click', () => { Sound.click(); MD.slot = +b.dataset.v; updateCtl(); }));
  $('#mdCheck').addEventListener('click', () => { Sound.click(); mdCheck(); });
  $('#mdReset').addEventListener('click', () => { Sound.click(); mdReset(); });
  lkBuild();

  /* =========================================================
     미션
     ========================================================= */
  const levels = [
    {
      title: '원핵생물과 달라지는 점', short: '달라지는 점', icon: '⚖️', phase: '모형',
      intro: '<p class="si-q">❓ 탐구 질문: 같은 유전자 발현인데, 핵막과 긴 DNA를 가진 진핵생물은 대장균보다 무엇이 더 복잡해질까?</p><p>🔗 <b>앞 차시</b>에서 젖당 오페론으로 원핵생물의 전사 조절(억제자 · 작동 부위)을 배웠어요. 그리고 <b>세포와 물질대사</b>에서 핵막이 있는 진핵 세포와 없는 원핵 세포의 구조 차이도 배웠어요.</p><p>이번 차시에서는 진핵생물의 발현 조절을 <b>원핵생물과 다른 점만</b> 간단히 비교해요. 그림 속 번호 <b>①~⑤</b>를 눌러 다섯 가지 차이를 찾아보세요.</p>',
      features: ['compare'],
      setup() { CM.sel = -1; CM.seen.fill(false); setMode('compare'); },
      recap: '진핵생물은 핵막 때문에 전사와 번역이 장소로 나뉘고, 염색질이 풀려야 전사할 수 있으며, 인핸서와 전사 인자의 조합으로 조절하고, 오페론 없이 유전자마다 개별 프로모터를 가지며, 전사 이후에도 조절돼요.',
      summary: '<ul><li><b>① 장소</b>: 진핵은 핵(전사 · RNA 가공)과 세포질(번역)이 분리, 원핵은 같은 공간에서 거의 동시에.</li><li><b>② 염색질</b>: 진핵의 DNA는 히스톤에 감겨 있어 풀려야 전사 가능(히스톤 · 메틸화의 화학은 이름만).</li><li><b>③ 조절 서열</b>: 진핵은 프로모터 + 멀리 떨어진 인핸서에 여러 전사 인자가 조합해 결합.</li><li><b>④ 유전자 단위</b>: 진핵은 오페론이 없고 유전자마다 개별 프로모터, 원핵은 오페론.</li><li><b>⑤ 전사 이후</b>: 진핵은 RNA 가공 · 수송 · mRNA 수명 · 번역 · 단백질 분해에서도 조절.</li></ul>',
      missions: [
        {
          id: 'hot5', title: '다른 점 5곳 찾기',
          goal: '그림 속 번호 <b>①~⑤</b>를 모두 눌러 원핵생물과 진핵생물의 다른 점을 확인하세요.',
          hint: '원핵 세포와 진핵 세포 그림에 같은 번호가 있어요. 어느 쪽이든 눌러서 아래 비교 카드를 읽어요.',
          setup() { CM.seen.fill(false); setMode('compare'); },
          check: () => CM.seen.every(Boolean), hold: 0.6,
          status: () => HOT.map((h, i) => mark(CM.seen[i]) + ' ' + h.n).join(' &nbsp; '),
          explain: '진핵생물은 ① 핵막 때문에 전사(핵)와 번역(세포질)이 장소로 나뉘고, ② 히스톤에 감긴 염색질이 풀려야 전사할 수 있고, ③ 멀리 있는 인핸서와 여러 전사 인자의 조합으로 조절하며, ④ 오페론이 없고 유전자마다 개별 프로모터를 가지고, ⑤ 전사 이후에도 조절해요.',
        },
        {
          type: 'quiz', title: '오페론이 없는 까닭',
          goal: '원핵생물에서는 한 번에 켜지는 여러 유전자가 한 프로모터 아래 묶여 있는데, 진핵생물에서는 유전자마다 개별 프로모터를 가져요. 그 배경으로 알맞은 것은?',
          setup() { CM.sel = 3; setMode('compare'); },
          choices: ['세포 종류마다 서로 다른 유전자를 따로따로 켜고 꺼야 해서, 유전자마다 따로 조절하는 편이 유리하다', '진핵생물은 유전자가 하나뿐이라서 오페론이 필요 없다', '진핵생물에서는 DNA에서 전사가 일어나지 않아서이다', '진핵생물은 모든 유전자가 항상 한꺼번에 켜져 있어서이다'],
          answer: 0,
          feedback: ['', '진핵생물은 유전자가 수만 개나 돼요.', '진핵생물도 DNA를 주형으로 전사해요. 다만 핵 안에서 일어나요.', '진핵생물은 세포마다 필요한 유전자만 골라 켜요. 그래서 개별 조절이 중요해요.'],
          explain: '다세포 진핵생물은 세포 종류마다 서로 다른 유전자를 켜야 해요. 한 프로모터에 여러 유전자를 묶어 한꺼번에 켜는 오페론보다, 유전자마다 프로모터와 인핸서를 따로 두고 전사 인자의 <b>조합</b>으로 조절하는 편이 세포마다 다른 발현을 만들기에 유리해요.',
        },
      ],
    },
    {
      title: '전사 인자와 인핸서', short: '전사 인자', icon: '🎛️', phase: '모형',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 진핵생물의 DNA는 염색질로 감겨 있고 인핸서와 전사 인자로 조절한다는 것을 봤어요. 이제 이 과정을 직접 진행해 봐요.</div><p>① 활성화 전사 인자를 <b>인핸서</b>에 붙이면 염색질이 풀려요. ② <b>기본 전사 인자와 RNA 중합 효소</b>가 프로모터에 모여요. ③ 인핸서의 DNA가 고리를 만들어 프로모터에 닿으면 전사가 활발해져요.</p><p>이 유전자는 활성화 인자 <b>X · Y · Z가 모두</b> 있어야 켜져요(AND 조건). 세포 A · B · C는 가진 인자가 달라요.</p>',
      features: ['tf'],
      setup() { tfReset(false); TFS.cell = 'A'; setMode('tf'); },
      recap: '전사 인자가 인핸서에 결합해 염색질이 풀리고, 기본 전사 인자와 RNA 중합 효소가 프로모터에 모이고, 인핸서가 고리를 만들어 프로모터에 닿으면 유전자가 켜져요. 이 유전자는 X · Y · Z가 모두 있어야 켜지므로, 가진 인자의 조합이 다른 세포는 서로 다른 유전자를 발현해요.',
      summary: '<ul><li><b>염색질 열기</b>: 전사 인자가 결합하면 히스톤에 감긴 염색질이 풀려 DNA가 드러나요.</li><li><b>전사 개시</b>: 기본 전사 인자와 RNA 중합 효소가 프로모터에 모여요. 멀리 있는 <b>인핸서</b>의 DNA가 고리를 만들어 프로모터에 닿으면 전사 속도가 크게 올라가요.</li><li><b>조합 조절(AND)</b>: 활성화 인자 3종(X · Y · Z)이 모두 있어야 켜져요. 세포마다 가진 전사 인자의 조합이 달라서, 같은 유전체를 가져도 서로 다른 유전자가 켜져요.</li><li><b>호르몬</b>: 스테로이드 호르몬은 세포 안 수용체와 결합해 전사 인자로 작용해요.</li></ul>',
      missions: [
        {
          id: 'tfon', title: '인핸서 고리를 만들어 켜기',
          goal: '세포 A에서 X · Y · Z를 인핸서에 붙이고 기본 인자를 모아 <b>유전자를 켜세요</b>. 세포 B · C에서는 켜지지 않는 것도 확인하세요.',
          hint: '캔버스의 인자를 눌러 인핸서에 붙이고(또는 오른쪽 단추), 마지막에 기본 전사 인자를 눌러요. 세포 B · C는 위쪽에서 바꿔요. 가진 인자를 모두 붙이고 기본 인자까지 모아도 꺼져 있는지 봐요.',
          setup() { tfReset(false); TFS.cell = 'A'; setMode('tf'); },
          check: () => TFS.onA && TFS.seenOff.B && TFS.seenOff.C, hold: 0.8,
          status: () => mark(TFS.onA) + ' 세포 A에서 켜기 &nbsp; ' + mark(TFS.seenOff.B) + ' 세포 B 꺼짐 확인 &nbsp; ' + mark(TFS.seenOff.C) + ' 세포 C 꺼짐 확인',
          explain: '세포 A는 X · Y · Z를 모두 가져서 인핸서 고리가 프로모터에 닿고 유전자가 켜져요. 세포 B는 Z가, 세포 C는 X가 없어서 가진 인자를 다 붙여도 <b>꺼져 있어요</b>(AND). 같은 DNA를 가져도 가진 <b>전사 인자의 조합</b>이 다르면 발현하는 유전자가 달라져요.',
        },
        {
          type: 'quiz', title: '같은 유전체, 다른 발현',
          goal: '같은 유전체를 가진 세포에서 서로 다른 유전자가 켜지는 까닭과, 스테로이드 호르몬이 유전자 발현을 바꾸는 방식으로 옳은 것은?',
          setup() { setMode('tf'); },
          choices: ['세포마다 가진 전사 인자의 조합이 달라서이고, 스테로이드 호르몬은 세포 안 수용체와 결합해 전사 인자로 작용한다', '세포마다 가진 DNA가 달라서이고, 스테로이드 호르몬은 DNA 염기 서열을 바꾼다', '세포마다 RNA 중합 효소의 종류가 완전히 달라서이고, 스테로이드 호르몬은 번역을 직접 한다', '세포마다 유전 부호가 달라서이고, 스테로이드 호르몬은 세포막 수용체만 건드린다'],
          answer: 0,
          feedback: ['', '체세포는 모두 같은 DNA를 가져요. 호르몬도 염기 서열을 바꾸지는 않아요.', 'RNA 중합 효소는 세포마다 같아요. 달라지는 것은 전사 인자의 조합이에요.', '유전 부호는 모든 세포에서 같아요.'],
          explain: '세포마다 가진 <b>전사 인자의 조합</b>이 달라 켜지는 유전자가 달라요. 지용성인 스테로이드 호르몬은 세포막을 지나 세포 안(핵) 수용체와 결합하고, 이 호르몬–수용체 복합체가 <b>전사 인자</b>로 작용해 특정 유전자의 전사를 조절해요.',
        },
      ],
    },
    {
      title: '여러 단계의 조절', short: '여러 단계', icon: '🎚️', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 전사 개시 단계의 조절(전사 인자 · 인핸서)을 봤어요. 진핵생물은 전사 뒤에도 <b>여러 단계</b>에서 발현을 조절해요.</div><p>조절 단계 6곳: ① 염색질 접근 → ② 전사 개시 → ③ RNA 가공 → ④ mRNA 수송 · 수명 → ⑤ 번역 → ⑥ 단백질 활성 · 분해.</p><p>유전자 X의 발현을 4개의 슬라이더(전사 속도 · mRNA 수명 · 번역 효율 · 단백질 분해)로 바꾸며 mRNA 수와 단백질 양이 어떻게 달라지는지 계산해 봐요. <b>mRNA 수 = 합성 속도 × 평균 수명</b>이에요.</p>',
      features: ['stages', 'link'],
      setup() { GX.target = false; gxBase(); setMode('stages'); },
      recap: '정상 상태의 mRNA 수는 합성 속도 × 평균 수명이에요(10 × 5 = 50개, 수명이 2배면 100개). 번역 효율이 2배면 단백질도 2배가 돼요. 진핵생물은 염색질 접근부터 단백질 분해까지 여섯 단계에서 발현을 조절해요.',
      summary: '<ul><li><b>조절 6단계</b>: 염색질 접근 → 전사 개시 → RNA 가공 → mRNA 수송 · 수명 → 번역 → 단백질 활성 · 분해.</li><li><b>mRNA 수 = 합성 속도 × 평균 수명</b>: 합성 10개/시간, 수명 5시간 → 50개. 수명이 2배(10시간)면 100개이고 단백질도 약 2배예요. 번역 효율이 2배면 단백질도 2배예요.</li><li>사례: β-글로빈 mRNA 수명은 10시간 이상, 일부 사이토카인 mRNA는 약 30분. 수명이 짧은 mRNA는 필요할 때 빨리 켜고 끌 수 있어 빠른 반응에 유리해요.</li><li>단계–사례: 호르몬 → 전사 인자(전사 개시), 인트론 제거 방식 → RNA 가공, 수명이 짧은 mRNA → 빠른 반응.</li></ul>',
      missions: [
        {
          id: 'target', title: '단백질 양 목표치 맞추기',
          goal: '<b>전사 속도는 10으로 그대로</b> 두고 mRNA 수명 · 번역 효율 · 분해 속도를 바꿔 <b>단백질 양을 400(상대량)</b>으로 맞추세요.',
          hint: '단백질 = 100 × (mRNA 수 / 50) × 번역 효율 / 분해 속도예요. 예를 들어 수명 10시간(mRNA 100개)이면 번역 효율 ×2에서 400이 돼요. 다른 조합도 있어요.',
          setup() { GX.target = true; gxBase(); setMode('stages'); },
          check: () => GX.rate === 10 && Math.abs(gxP() - 400) < 0.5, hold: 0.8,
          status: () => mark(GX.rate === 10) + ' 전사 속도 10 유지 &nbsp; ' + mark(Math.abs(gxP() - 400) < 0.5) + ' 단백질 ' + fmtG(Math.round(gxP() * 10) / 10) + ' / 400',
          explain: '예를 들어 수명 10시간이면 mRNA 100개(= 10 × 10)이고, 번역 효율 ×2이면 단백질 = 100 × (100/50) × 2 / 1 = <b>400</b>이에요. 또는 수명 5시간(mRNA 50개)에서 번역 효율 ×2, 분해 ×0.5로도 400이 돼요. 이렇게 한 유전자의 발현량은 <b>여러 단계의 조절</b>이 곱해져서 정해져요.',
        },
        {
          id: 'link', title: '단계–사례 카드 연결', manual: true,
          goal: '조절 단계 6곳에 알맞은 <b>사례 카드</b>를 한 장씩 연결하세요.',
          hint: '카드의 키워드를 단계 이름과 비교해 봐요: 호르몬 수용체 → 전사를 시작하는 단계, 인트론 제거 → RNA를 다듬는 단계, 수명이 짧은 mRNA → mRNA의 양과 수명 단계.',
          setup() { LK.so.reset(); setMode('link'); },
          check() {
            const n = LK.so.placed;
            if (n < 6) { LK.so.markBad([]); return '카드를 모두 칸에 놓아 주세요. (' + n + ' / 6)'; }
            const w = lkWrong();
            if (!w.length) { LK.so.markBad([]); return true; }
            LK.so.markBad(w.map((c) => c.id));
            return '\'' + w[0].label + '\' 카드를 다시 생각해 보세요. (' + w.length + '장이 달라요)';
          },
          explain: '호르몬 수용체가 전사 인자로 작용하는 것은 <b>전사 개시</b>, 인트론 제거 방식이 달라지는 것은 <b>RNA 가공</b>, 수명이 짧은 mRNA로 빠르게 반응하는 것은 <b>mRNA 수명</b>, 히스톤이 느슨해지는 것은 <b>염색질 접근</b>, 리보솜이 mRNA에 잘 붙는 것은 <b>번역</b>, 세포 주기 단백질의 제때 분해는 <b>단백질 분해</b> 단계의 조절이에요.',
        },
        {
          type: 'quiz', title: 'mRNA 수명이 짧을수록 유리한 상황',
          goal: 'mRNA의 수명이 <b>짧을수록</b> 유리한 상황으로 알맞은 것은?',
          setup() { GX.target = false; setMode('stages'); },
          choices: ['자극에 빠르게 반응하고 신호가 사라지면 곧바로 발현을 줄여야 하는 단백질(예: 일부 사이토카인)', '산소를 운반하는 헤모글로빈처럼 오래 계속 만들어야 하는 단백질', '세포가 평생 하나만 만들면 되는 단백질', 'mRNA가 분해되지 않아야 만들어지는 모든 단백질'],
          answer: 0,
          feedback: ['', 'β-글로빈 mRNA는 수명이 10시간 이상으로 길어요. 오래 만들어야 하면 수명이 긴 것이 유리해요.', '그런 단백질은 수명이 긴 mRNA가 유리해요.', '수명이 짧은 mRNA는 오히려 빨리 분해되어 발현을 빨리 끌 수 있어요.'],
          explain: '일부 사이토카인 mRNA는 수명이 약 30분으로 짧아요. 합성이 멈추면 mRNA가 곧 사라져서 단백질 합성도 빨리 줄어요. 그래서 자극에 <b>빠르게 켜고 빠르게 끌</b> 수 있어요. 반대로 β-글로빈 mRNA(10시간 이상)는 오래 안정하게 만들어야 하는 단백질에 알맞아요.',
        },
      ],
    },
    {
      title: '설명 자료 만들기', short: '설명 자료', icon: '📝', phase: '설명',
      intro: '<div class="si-link">🔗 <b>앞 단계들에서</b> 원핵생물(젖당 오페론)과 진핵생물의 유전자 발현 조절을 비교했어요. 이제 이 내용을 다른 사람에게 <b>설명하는 자료</b>로 만들어 봐요.</div><p>① 매체를 골라요: 비교 도식 · 포스터 · 카드뉴스 · 영상 콘티 · 디지털 슬라이드. ② 필수 요소 <b>6개</b>(오페론 vs 개별 유전자 · 장소 · 염색질 · 전사 인자와 인핸서 · 전사 후 조절 · 예시)에 알맞은 설명을 고르세요. ③ <b>🔍 체크리스트 점검</b>으로 정확한지 확인하고 부족한 곳을 보완해요.</p><p>설명 자료는 내용이 <b>정확</b>해야 해요. 비슷해 보여도 틀린 설명이 섞여 있어요!</p>',
      features: ['media'],
      setup() { mdReset(); MD.medium = null; setMode('media'); },
      recap: '설명 자료에는 오페론 vs 개별 유전자, 장소, 염색질, 전사 인자 · 인핸서, 전사 후 조절, 예시의 6가지 요소가 들어가야 하고, 만든 뒤에는 출처와 대조해 정확성을 점검해야 해요.',
      summary: '<ul><li><b>비교 자료의 필수 요소 6개</b>: ① 오페론(원핵) vs 개별 유전자(진핵) ② 장소(핵 vs 세포질, 같은 공간) ③ 염색질(히스톤) ④ 전사 인자 · 인핸서 ⑤ 전사 후 조절 ⑥ 예시(젖당 오페론, 스테로이드 호르몬).</li><li><b>한 문장 요약</b>: 원핵생물은 주로 오페론 단위로 전사를 조절하지만, 진핵생물은 염색질 · 전사 인자 · 인핸서와 전사 후 단계까지 여러 단계에서 조절해요.</li><li><b>정확성 점검</b>: 교과서 · 논문 같은 믿을 만한 출처와 대조하고, 용어와 예시가 정확한지 확인해요. 생성형 AI의 답도 항상 사실 확인이 필요해요.</li></ul>',
      missions: [
        {
          id: 'media', title: '필수 요소 6개 배치와 체크리스트', manual: true,
          goal: '매체를 고르고 필수 요소 <b>6개</b> 칸을 모두 채운 뒤 <b>🔍 체크리스트 점검</b>을 통과하세요.',
          hint: '비슷한 설명 중 정확한 것을 골라요. 점검에서 ⚠ 가 나온 칸은 다시 골라요. 원핵은 오페론 · 같은 공간, 진핵은 개별 프로모터 · 핵과 세포질 · 염색질 · 인핸서 · 전사 후 조절이 핵심이에요.',
          setup() { mdReset(); MD.medium = null; setMode('media'); },
          check() {
            if (!MD.medium) return '먼저 위쪽 단추에서 매체를 골라 주세요.';
            const empty = MD.pick.filter((p) => p < 0).length;
            if (empty) return '비어 있는 칸이 ' + empty + '개 있어요. 6칸을 모두 채워 주세요.';
            if (!MD.checked) return '🔍 체크리스트 점검을 눌러 정확한지 확인해 보세요.';
            const bad = MD.pick.map((p, i) => (p !== ELEM[i].ans ? i : -1)).filter((i) => i >= 0);
            if (bad.length) return '점검에서 ⚠ 가 나온 칸이 ' + bad.length + '개 있어요. (' + ELEM[bad[0]].name + ' 칸부터) 정확한 설명으로 보완해 다시 점검해 보세요.';
            return true;
          },
          explain: '정확한 설명 자료의 핵심은 <b>원핵</b>: 오페론 · 핵막 없이 같은 공간 · 히스톤 염색질 없음 · 억제자와 작동 부위 · 주로 전사 단계 조절 · 젖당 오페론, <b>진핵</b>: 개별 프로모터 · 핵과 세포질 분리 · 염색질이 풀려야 전사 · 인핸서와 전사 인자의 조합 · 전사 후 여러 단계 조절 · 스테로이드 호르몬 수용체예요.',
        },
        {
          type: 'quiz', title: '원핵과 진핵의 조절 차이를 한 문장으로',
          goal: '원핵생물과 진핵생물의 유전자 발현 조절의 차이를 가장 알맞게 설명한 한 문장은?',
          setup() { setMode('media'); },
          choices: ['원핵생물은 주로 오페론 단위의 전사 조절이 중심이지만, 진핵생물은 염색질 · 전사 인자 · 인핸서와 전사 후 단계까지 여러 단계에서 조절한다', '원핵생물에는 조절이 없고 진핵생물에서만 유전자 발현이 조절된다', '진핵생물은 오페론으로 유전자를 묶어 한꺼번에 켜고, 원핵생물은 유전자마다 따로 켠다', '원핵생물과 진핵생물은 유전자 발현 조절 방식이 완전히 같다'],
          answer: 0,
          feedback: ['', '원핵생물도 젖당 오페론처럼 발현을 조절해요.', '반대로 말했어요. 오페론은 원핵생물에서 볼 수 있어요.', '핵막 · 염색질 · 인핸서 · 전사 후 조절 등에서 서로 달라요.'],
          explain: '핵심은 <b>복잡도</b>예요. 원핵생물은 오페론과 억제자 같은 비교적 단순한 전사 조절이 중심이고, 진핵생물은 염색질, 전사 인자와 인핸서, 그리고 RNA 가공 · mRNA 수명 · 번역 · 단백질 분해까지 여러 단계에서 발현을 조절해요.',
        },
        {
          type: 'quiz', title: '설명 자료의 정확성 점검',
          goal: '설명 자료를 만든 뒤 <b>정확성</b>을 점검하는 방법으로 가장 알맞은 것은?',
          setup() { setMode('media'); },
          choices: ['교과서 · 논문 같은 믿을 만한 출처와 대조해 사실인지 확인하고, 용어와 예시가 정확한지 점검한다', '그림이 예쁘고 색이 화려한지만 확인한다', '생성형 AI가 쓴 설명은 항상 정확하므로 확인하지 않아도 된다', '내용이 길수록 정확하다고 본다'],
          answer: 0,
          feedback: ['', '디자인도 중요하지만 정확성은 내용을 출처와 대조해야 알 수 있어요.', 'AI의 답변도 틀린 내용이 섞일 수 있어서 반드시 사실 확인이 필요해요.', '길이와 정확성은 상관없어요.'],
          explain: '설명 자료는 <b>정확성</b>이 가장 중요해요. 믿을 만한 출처(교과서 · 논문 · 공공기관 자료)와 대조해 사실인지 확인하고, 용어 · 숫자 · 예시가 정확한지 점검해요. 생성형 AI가 만든 문장도 사실 확인 없이 쓰면 안 돼요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hg-eukaryote-regulation', mount: '#game', badge: '발현 조절 해설가', homeHref: '../../index.html#hg',
    featureLabels: { compare: '⚖️ 원핵 · 진핵 비교', tf: '🎛️ 전사 인자', stages: '🎚️ 조절 슬라이더', link: '🔗 단계–사례 연결', media: '📝 설명 자료' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 읽음 칸 ---------- */
  function readouts() {
    const m = S.mode;
    if (m === 'compare') setReads(['찾은 다른 점', CM.seen.filter(Boolean).length + ' / 5', '선택', CM.sel >= 0 ? HOT[CM.sel].n + ' ' + HOT[CM.sel].name : '—', '비교 대상', '원핵 vs 진핵']);
    else if (m === 'tf') setReads(['세포', TFS.cell + ' (' + CELLS[TFS.cell].join(' · ') + ')', '유전자', tfOn() ? '켜짐' : '꺼짐', 'mRNA 수', Math.floor(TFS.mrna) + '개']);
    else if (m === 'stages') setReads(['mRNA 수', fmtG(gxM()) + '개', '단백질 양', fmtG(Math.round(gxP() * 10) / 10), '기준 대비', '×' + fmtG(Math.round(gxP()) / 100)]);
    else if (m === 'link') setReads(['연결한 카드', (LK.so ? LK.so.placed : 0) + ' / 6', '조절 단계', '6곳', '예', '호르몬 → 전사 인자']);
    else setReads(['매체', MD.medium ? MEDIA.find((x) => x[0] === MD.medium)[1] : '미선택', '채운 칸', MD.pick.filter((p) => p >= 0).length + ' / 6', '점검', MD.checked ? MD.res.filter((x) => x === 'ok').length + ' / 6 통과' : '아직']);
  }

  /* ---------- 시작 ---------- */
  setMode('compare');
  let lastFree = false, lastLv = -1;
  SciSim.loop((dt, t) => {
    clock = t; S.t = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (game && game.level !== lastLv) { lastLv = game.level; updateCtl(); }
    view.apply(); ctx.clearRect(0, 0, VW, VH);
    bgFill('#eef4f2', '#e3ece8');
    switch (S.mode) {
      case 'compare': compareScene(dt, t); break;
      case 'tf': tfScene(dt, t); break;
      case 'stages': stagesScene(dt, t); break;
      case 'link': linkScene(dt, t); break;
      case 'media': mediaScene(dt, t); break;
    }
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(241,246,243,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, PHONE, get game() { return game; }, levels, setMode, updateCtl, CM, TFS, GX, LK, MD, ELEM, HOT, selHot, tfToggle, tfCell, tfReset, tfOn, gxP, gxM, lkWrong, mdMedium, mdPick, mdCheck, mdReset,
  };
})();
