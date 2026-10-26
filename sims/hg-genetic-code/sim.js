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
     고등학교 생물의 유전 · Ⅱ. 유전자의 발현 - 유전 부호와 코돈표 (단원 60, 2차시)
     성취기준 [12유전02-02] 유전 부호를 이해하고, 유전 부호 표를 사용하여 유전 정보를 해독할 수 있다.
     ① 실험: 부호 규명  ② 모형: 코돈표  ③ 적용: 해독 연습  ④ 분석: 부호의 특징
     (니런버그 · 마태이 실험은 교육용으로 단순화한 가상 실험이에요)
     ========================================================= */
  const S = { mode: 'nir', fade: 0, t: 0 };
  let game = null;
  const ctlNodes = $$('#ctrlCard .control');
  const B4 = 'UCAG';
  const AA_KO = { F: '페닐알라닌', L: '류신', S: '세린', Y: '타이로신', C: '시스테인', W: '트립토판', P: '프롤린', H: '히스티딘', Q: '글루타민', R: '아르지닌', I: '아이소류신', M: '메싸이오닌', T: '트레오닌', N: '아스파라긴', K: '라이신', V: '발린', A: '알라닌', D: '아스파르트산', E: '글루탐산', G: '글리신', '*': '종결 코돈' };
  const aaOfName = (nm) => { for (const k in AA3) if (AA3[k] === nm) return k; return null; };
  const CODON_COUNT = {}; for (let i = 0; i < 64; i++) { const a = AA_STR[i]; CODON_COUNT[a] = (CODON_COUNT[a] || 0) + 1; }
  const codonsOf = (a) => { const out = []; for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) for (let k = 0; k < 4; k++) { const c = B4[i] + B4[j] + B4[k]; if (codonAA(c) === a) out.push(c); } return out; };
  const optList = (extra) => '<option value="">선택</option>' + AA_LIST.map((a) => '<option value="' + a + '">' + AA3[a] + '</option>').join('') + (extra ? '<option value="*">종결</option>' : '');

  /* ---------- 코돈표 그리기 (첫째 · 둘째 · 셋째 염기 순서로 읽기) ---------- */
  const TB = { sel: null, hit: [], view: 'table', ask: null, fillOK: {}, fillSel: {} };
  function tableRect() { return PHONE ? { x: 6, y: 40, w: 468, h: 474 } : { x: 8, y: 44, w: 606, h: 508 }; }
  /* o: {only: Set(codon) 이면 그 코돈만 보여 주고 나머지는 ···, hide: Set(codon) 이면 아미노산 이름을 ?로 가려요, ring: codon} */
  function drawTable(R, o) {
    o = o || {};
    const lx = R.x + 28, cw = (R.w - 28) / 4, hy = R.y, hh = 28, by = hy + hh + 4, rh = (R.h - hh - 6) / 4;
    TB.hit = [];
    const selAA = TB.sel ? codonAA(TB.sel) : null;
    for (let j = 0; j < 4; j++) { T(lx + j * cw + cw / 2 - 2, hy + 19, B4[j], 17, BASE_COL[B4[j]], 'center', 800); }
    T(R.x + 14, hy + 19, '첫째', 11.5, '#94a3b8', 'center', 800);
    T(lx + 2 * cw - 2, hy - 2, '둘째 염기', 11.5, '#94a3b8', 'center', 800);
    for (let i = 0; i < 4; i++) {
      T(R.x + 14, by + i * rh + rh / 2 + 7, B4[i], 19, BASE_COL[B4[i]], 'center', 800);
      for (let j = 0; j < 4; j++) {
        const cx = lx + j * cw + 2, cy = by + i * rh + 2, w = cw - 4, h = rh - 4;
        const rowOn = TB.sel && TB.sel[0] === B4[i], colOn = TB.sel && TB.sel[1] === B4[j];
        D.roundRect(cx, cy, w, h, 10); ctx.fillStyle = rowOn && colOn ? '#fffbe6' : '#fff'; ctx.fill();
        ctx.strokeStyle = rowOn && colOn ? '#f59e0b' : rowOn || colOn ? '#fcd9a0' : '#d3dbe5'; ctx.lineWidth = rowOn && colOn ? 3 : 1.6; D.roundRect(cx, cy, w, h, 10); ctx.stroke();
        for (let k = 0; k < 4; k++) {
          const cod = B4[i] + B4[j] + B4[k], aa = codonAA(cod), ly = cy + (k + 0.5) * h / 4, lh = h / 4 - 2;
          const same = selAA && selAA === aa, show = !o.only || o.only.has(cod);
          if (show) {
            D.roundRect(cx + 3, ly - lh / 2, w - 6, lh, 6);
            ctx.fillStyle = C.rgba(aaCol(aa), same ? 0.5 : 0.17); ctx.fill();
            if (TB.sel === cod || o.ring === cod) { ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 2.5; ctx.stroke(); }
            else if (same) { ctx.strokeStyle = C.shade(aaCol(aa), -0.1); ctx.lineWidth = 1.5; ctx.stroke(); }
          }
          const fs = Math.min(15, lh * 0.72);
          const px = cx + 9;
          ctx.save(); ctx.font = D.font(fs, 800); ctx.textBaseline = 'alphabetic';
          let x = px;
          [0, 1, 2].forEach((m) => { ctx.fillStyle = show ? (m === 2 ? BASE_COL[cod[2]] : '#475569') : '#cbd5e1'; ctx.textAlign = 'left'; ctx.fillText(cod[m], x, ly + fs * 0.35); x += ctx.measureText(cod[m]).width + 0.5; });
          ctx.restore();
          const hid = o.hide && o.hide.has(cod);
          let label = show ? (hid ? (TB.fillSel[cod] ? AA3[TB.fillSel[cod]] : '?') : AA3[aa]) : '···';
          let col = show ? C.shade(aaCol(aa), -0.45) : '#cbd5e1';
          if (hid) col = TB.fillSel[cod] ? '#0f172a' : '#e2464b';
          T(cx + w - 8, ly + fs * 0.35, label, fs, col, 'right', 800);
          if (show && cod === 'AUG') T(cx + w - 8 - 40, ly + fs * 0.35, '시작', fs * 0.8, '#16a34a', 'right', 800);
          TB.hit.push({ x: cx + 3, y: ly - lh / 2, w: w - 6, h: lh, codon: cod, show });
        }
      }
    }
  }
  function tableAt(p) { for (const r of TB.hit) if (r.show && inRect(p.x, p.y, r)) return r.codon; return null; }
  function drawTableDetail(R) {
    panel(R.x, R.y, R.w, R.h, 14);
    const c = TB.sel;
    const x = R.x + 14;
    if (!c) { textBlock(x, R.y + 30, R.w - 28, '표에서 코돈을 눌러 보세요.', 14.5, '#64748b', 20, 800); textBlock(x, R.y + 78, R.w - 28, '첫째 → 둘째 → 셋째 염기 순서로 찾아요.', 14, '#64748b', 20, 700); return; }
    const aa = codonAA(c), n = CODON_COUNT[aa];
    T(x, R.y + 34, P5 + '-' + c + '-' + P3, 22, '#1f2d44', 'left', 800);
    aaChip(R.x + R.w / 2, R.y + 66, Math.min(R.w - 28, 130), 28, aa, { solid: true, text: aa === '*' ? '종결' : AA3[aa] });
    T(R.x + R.w / 2, R.y + 100, aa === '*' ? '아미노산을 지정하지 않아요' : AA_KO[aa], 14, '#475569', 'center', 800);
    if (c === 'AUG') T(R.x + R.w / 2, R.y + 120, '시작 코돈 (Met)', 14, '#16a34a', 'center', 800);
    T(R.x + R.w / 2, R.y + (c === 'AUG' ? 144 : 126), (aa === '*' ? '종결 코돈 ' : AA3[aa] + '의 코돈 ') + n + '개', 14.5, '#1f2d44', 'center', 800);
    const list = codonsOf(aa); let yy = R.y + (c === 'AUG' ? 168 : 152);
    const per = Math.max(2, Math.floor((R.w - 20) / 56));
    list.forEach((cd, i) => { const col = i % per, row = Math.floor(i / per); pill(R.x + 10 + col * 56 + 26, yy + row * 28, cd, { bg: cd === c ? '#fde68a' : '#fff', color: '#1f2d44', border: '#cbd5e1', size: 12.5 }); });
    // 범례
    const ly = R.y + R.h - 92;
    [['np', '비극성'], ['po', '극성'], ['pos', '염기성(+)'], ['neg', '산성(−)'], ['stop', '종결']].forEach((g, i) => { D.roundRect(R.x + 14, ly + i * 17 - 7, 12, 12, 3); ctx.fillStyle = C.rgba(GROUP_COL[g[0]], 0.45); ctx.fill(); T(R.x + 32, ly + i * 17 + 4, g[1], 12, '#64748b', 'left', 700); });
  }
  function tableScene(dt, t) {
    const R = tableRect();
    if (PHONE) {
      drawTable(R, {});
      drawTableDetail({ x: 8, y: 520, w: 464, h: 112 });
    } else {
      drawTable(R, {});
      drawTableDetail({ x: 624, y: 44, w: 168, h: 508 });
    }
  }
  const tablePT = {
    down(p) { const c = tableAt(p); if (c) { TB.sel = c; Sound.tick(); updateCtl(); } return false; },
    hover(p) { return tableAt(p) ? 'pointer' : 'default'; },
  };
  /* 아미노산별 코돈 수 막대 */
  const BARS = Object.keys(CODON_COUNT).sort((a, b) => CODON_COUNT[b] - CODON_COUNT[a] || (a === '*' ? 1 : b === '*' ? -1 : 0));
  const BAR_SHOW = {};
  function barsScene(dt, t) {
    const x0 = 14, y0 = 64, rowH = PHONE ? 27 : 22.5, bw = (VW - 2 * x0 - 110 - 70);
    T(x0, 38, '아미노산별 코돈 수 (모두 64개 중 종결 3개 + 아미노산 지정 61개)', PHONE ? 13 : 15, '#334155', 'left', 800);
    BARS.forEach((a, i) => {
      const y = y0 + i * rowH, n = CODON_COUNT[a];
      BAR_SHOW[a] = approach(BAR_SHOW[a] == null ? 0 : BAR_SHOW[a], 1, dt, 5);
      const sel = TB.sel && codonAA(TB.sel) === a;
      aaChip(x0 + 38, y + rowH / 2 - 1, 70, rowH - 5, a, { text: a === '*' ? '종결' : AA3[a] + ' ' + a, hl: sel ? '#f59e0b' : null });
      const unit = bw / 6;
      for (let k = 0; k < n; k++) { const bx = x0 + 84 + k * unit, w = (unit - 4) * clamp(BAR_SHOW[a] * 1.4 - k * 0.1, 0, 1); if (w > 0) { D.roundRect(bx, y + 2, w, rowH - 7, 4); ctx.fillStyle = C.rgba(aaCol(a), 0.75); ctx.fill(); } }
      T(x0 + 84 + n * unit + 6, y + rowH / 2 + 5, n + '개', 13.5, '#334155', 'left', 800);
      TB.hit[i] = { y, h: rowH, aa: a };
    });
    const ys = y0 + BARS.length * rowH + 4;
    if (ys < VH - 20) T(x0, ys + 16, '6개: Leu · Ser · Arg (3종) / 4개: 5종 / 3개: Ile / 2개: 9종 / 1개: Met · Trp', PHONE ? 11.5 : 13.5, '#64748b', 'left', 700);
  }
  const barsPT = {
    down(p) { for (const r of TB.hit) if (r && r.aa && p.y >= r.y && p.y < r.y + r.h) { const cs = codonsOf(r.aa); TB.sel = cs[0]; updateCtl(); Sound.tick(); return false; } return false; },
    hover(p) { return TB.hit.some((r) => r && r.aa && p.y >= r.y && p.y < r.y + r.h) ? 'pointer' : 'default'; },
  };

  /* =========================================================
     ① 부호 규명: 가상 니런버그 · 마태이 실험
     ========================================================= */
  const NIR_KINDS = { U: { mrna: 'U', txt: 'poly-U', seq: 'UUUUUUUUUUUU', res: ['F'] }, A: { mrna: 'A', txt: 'poly-A', seq: 'AAAAAAAAAAAA', res: ['K'] }, C: { mrna: 'C', txt: 'poly-C', seq: 'CCCCCCCCCCCC', res: ['P'] }, G: { mrna: 'G', txt: 'poly-G', seq: 'GGGGGGGGGGGG', res: ['G'] }, UC: { mrna: 'UC', txt: 'UCUCUC… 반복', seq: 'UCUCUCUCUCUC', res: ['S', 'L'] } };
  const N = { kind: 'U', run: false, t: 0, done: {}, shown: null, seed: 11 };
  const NIR_END = 5.0;
  function nirRun() { if (N.run) return; N.run = true; N.t = 0; N.shown = N.kind; Sound.click(); updateCtl(); }
  function nirPick(k) { if (N.run) return; N.kind = k; N.shown = null; N.t = 0; updateCtl(); }
  function nirDraw(dt, t) {
    if (N.run) { N.t += dt; if (N.t >= NIR_END) { N.run = false; N.done[N.shown] = true; Sound.success(); updateCtl(); } }
    const K = NIR_KINDS[N.kind], shownK = N.shown ? NIR_KINDS[N.shown] : null;
    const prog = N.shown ? (N.run ? N.t : NIR_END) : 0;
    T(14, 32, '니런버그 · 마태이 실험(1961): 인공 mRNA를 세포 추출액에 넣어요', PHONE ? 13.5 : 16, '#334155', 'left', 800);
    // 인공 mRNA 줄과 세포 추출액
    const top = PHONE ? 48 : 52;
    pill(14, top + 14, '넣는 인공 mRNA: ' + K.txt, { bg: '#ede9fe', color: '#5b21b6', border: '#8b5cf6', size: 14, align: 'left' });
    const n = PHONE ? 11 : 14, tw = PHONE ? 30 : 34;
    const sx = 14, sy = top + 40;
    T(sx, sy + 20, P5, 14, '#475569', 'left', 800);
    for (let i = 0; i < n; i++) baseTile(sx + 22 + i * tw, sy, tw, 28, K.seq[i % K.seq.length], { solid: true });
    T(sx + 22 + n * tw + 6, sy + 20, '…' + P3, 14, '#475569', 'left', 800);
    const flX = PHONE ? 350 : 640, flY = top + 8;
    D.roundRect(flX, flY, PHONE ? 112 : 140, 70, 14); ctx.fillStyle = '#fef3c7'; ctx.fill(); ctx.strokeStyle = '#d97706'; ctx.lineWidth = 2; ctx.stroke();
    TF(flX + (PHONE ? 56 : 70), flY + 28, '세포 추출액', PHONE ? 100 : 128, 14.5, 12, '#92400e', 'center', 800);
    TF(flX + (PHONE ? 56 : 70), flY + 50, '리보솜 · tRNA · 효소', PHONE ? 104 : 130, 12.5, 11, '#92400e', 'center', 700);
    // 시험관 20개
    const per = PHONE ? 5 : 10, gx = PHONE ? 22 : 24, gw = VW - 2 * gx, cwid = gw / per;
    const rowsY0 = PHONE ? 178 : 168, rowH = PHONE ? 96 : 150;
    T(14, rowsY0 - 6, '● = 방사성 표지 아미노산 (시험관마다 한 종류만 표지)', PHONE ? 12 : 13.5, '#64748b', 'left', 800);
    AA_LIST.forEach((a, i) => {
      const col = i % per, row = Math.floor(i / per);
      const cx = gx + cwid * (col + 0.5), ty = rowsY0 + 8 + row * rowH;
      const w = PHONE ? 30 : 36, h = PHONE ? 62 : 96;
      const hit = shownK && shownK.res.indexOf(a) >= 0, reveal = prog > 3.4;
      const fill = prog > 0.9 ? Math.min(1, (prog - 0.9) / 0.6) : 0;
      // 시험관
      ctx.save();
      D.shadow(() => { D.roundRect(cx - w / 2, ty, w, h, w / 2); ctx.fillStyle = '#f8fafc'; ctx.fill(); }, { blur: 4, y: 2 });
      ctx.save(); D.roundRect(cx - w / 2 + 2, ty + 2, w - 4, h - 4, w / 2 - 2); ctx.clip();
      const lv = h * (0.52 + 0.1 * fill);
      ctx.fillStyle = hit && reveal ? 'rgba(251,191,36,.75)' : 'rgba(125,211,252,.55)'; ctx.fillRect(cx - w / 2, ty + h - lv, w, lv);
      if (prog > 1 && prog < 3.4 && !RM) { for (let b = 0; b < 3; b++) { const bt = (t * 1.2 + b * 0.33 + i * 0.07) % 1; D.sphere(cx + Math.sin(b * 2 + i) * w * 0.2, ty + h - 6 - bt * lv * 0.9, 2.2, '#ffffff', { gloss: false }); } }
      ctx.restore();
      ctx.strokeStyle = hit && reveal ? '#d97706' : '#94a3b8'; ctx.lineWidth = hit && reveal ? 3 : 2; D.roundRect(cx - w / 2, ty, w, h, w / 2); ctx.stroke();
      ctx.restore();
      // 떨어지는 mRNA 방울
      if (prog > 0.1 && prog < 1.0) { const f = (prog - 0.1) / 0.9; D.sphere(cx, ty - 30 + f * 40, 5, '#8b5cf6', {}); }
      // 방사성 표지 점 + 이름
      D.sphere(cx - (PHONE ? 11 : 12), ty + h + 11, 4.5, '#ef4444', { gloss: false });
      T(cx + 2, ty + h + 17, AA3[a], PHONE ? 13 : 14, '#334155', 'center', 800);
      // 결과: 방사성 폴리펩타이드
      if (shownK && reveal) {
        if (hit) {
          const beadsN = 4; for (let b = 0; b < beadsN; b++) { const bt = clamp((prog - 3.4 - b * 0.15) / 0.5, 0, 1); if (bt > 0) D.sphere(cx + (b - 1.5) * 0 + Math.sin(b + t * 3) * 1.5, ty + h * 0.3 + b * (PHONE ? 9 : 14) * bt, PHONE ? 5 : 6, aaCol(a), { text: '', gloss: true }); }
          if (!RM && Math.floor(t * 6) % 3 === 0) D.glow(cx, ty + h / 2, 40, '#fbbf24', 0.35);
          T(cx, ty + h + 33, '방사성 ○', PHONE ? 11.5 : 12.5, '#b45309', 'center', 800);
        } else T(cx, ty + h + 33, '없음', PHONE ? 11.5 : 12.5, '#cbd5e1', 'center', 800);
      }
    });
    // 해설
    const ay = PHONE ? 574 : 534;
    if (shownK && prog >= NIR_END - 0.01) {
      const names = shownK.res.map((a) => AA3[a]).join(' + ');
      TF(14, ay, shownK.txt + ' → ' + names + ' 시험관에서만 방사성 폴리펩타이드가 나왔어요', VW - 28, 15.5, 11.5, '#1f2d44', 'left', 800);
      if (shownK.res.length === 1) TF(14, ay + 20, '그래서 ' + shownK.mrna.repeat(3) + ' = ' + names + ' (코돈 하나가 뜻하는 아미노산이에요)', VW - 28, 14, 11, '#0d7a4a', 'left', 800);
      else TF(14, ay + 20, 'UCU CUC UCU CUC… 두 코돈이 번갈아 읽혀 Ser–Leu–Ser–Leu… 가 만들어졌어요', VW - 28, 14, 11, '#0d7a4a', 'left', 800);
    } else if (N.run) T(14, ay, '실험 중… 시험관마다 방사성 표지가 붙은 폴리펩타이드가 만들어지는지 확인해요', 14.5, '#475569', 'left', 800);
    else T(14, ay, '[▶ 실험 시작]을 눌러 인공 mRNA를 모든 시험관에 넣어 보세요', 14.5, '#475569', 'left', 800);
  }

  /* ---------- 코돈표 빈칸 (부호 규명 결과 정리) ---------- */
  const FILL_SET = new Set(['UUU', 'AAA', 'CCC', 'GGG', 'UCU', 'CUC']);
  const FILL_HIDE = new Set(['UUU', 'AAA', 'CCC', 'GGG', 'CUC']);
  const FILL_ANS = { UUU: 'F', AAA: 'K', CCC: 'P', GGG: 'G', CUC: 'L' };
  function fillScene(dt, t) {
    const R = tableRect();
    drawTable(R, { only: FILL_SET, hide: FILL_HIDE });
    const x = PHONE ? 10 : 626, y = PHONE ? 522 : 44, w = PHONE ? 460 : 166, h = PHONE ? 108 : 508;
    panel(x, y, w, h, 14);
    T(x + 12, y + 28, '빈칸 채우기', 15, '#334155', 'left', 800);
    textBlock(x + 12, y + 54, w - 24, PHONE ? '실험으로 알아낸 코돈만 보여요. 오른쪽 선택 칸에서 ? 를 채워요. UCU는 Ser로 알려져 있어요.' : '실험 결과로 알아낸 코돈만 보여요. 아래쪽 선택 칸에서 ? 를 채워요. 이미 알려진 UCU는 Ser예요.', 13.5, '#475569', 19, 700);
    if (!PHONE) {
      textBlock(x + 12, y + 190, w - 24, 'UCUCUC…에서는 Ser와 Leu가 번갈아 나왔어요. UCU = Ser 이므로 CUC = ?', 13.5, '#0d7a4a', 19, 800);
      const done = N.done.UC;
      T(x + 12, y + 300, done ? '✔ UCUCUC… 실험 완료' : '↺ UCUCUC… 실험을 아직 안 했어요 (🧪 부호 규명 화면에서)', 13, done ? '#15803d' : '#b45309', 'left', 800);
    }
  }

  /* =========================================================
     ③ 해독 연습
     ========================================================= */
  const PROB = [
    { kind: 'dna', given: 'TACGTTAGGCATACT', mrna: 'AUGCAAUCCGUAUGA', aa: 'MQSV*', title: '문제 1 · DNA 주형 가닥 → mRNA → 아미노산' },
    { kind: 'frame', given: 'GCAUGGGCAAAUAGCC', start: 2, aa: 'MGK*', title: '문제 2 · 시작 코돈을 찾아 읽기틀 정하기' },
    { kind: 'count', aa: 'MFD', answer: 4, title: '문제 3 · 가능한 mRNA는 모두 몇 가지?' },
  ];
  const DC = { p: 0, solved: [false, false, false], ref: false, act: 0, vals: [new Array(20).fill(''), new Array(4).fill(''), ['']], start: -1, bad: {}, msg: '', msgT: 0, msgOK: false, tray: [], trayBtn: null };
  const slotCount = (p) => (p === 0 ? 20 : p === 1 ? 4 : 1);
  const slotKind = (p, i) => (p === 0 ? (i < 15 ? 'base' : 'aa') : p === 1 ? 'aa' : 'num');
  function dcMsg(m, ok) { DC.msg = m; DC.msgOK = !!ok; DC.msgT = 5; }
  function dcPick(p) { DC.p = p; DC.act = p === 0 ? 0 : 0; DC.bad = {}; DC.msg = ''; DC.ref = false; updateCtl(); }
  function dcClear() { DC.vals[DC.p] = new Array(slotCount(DC.p)).fill(''); DC.start = DC.p === 1 ? -1 : DC.start; if (DC.p === 1) DC.start = -1; DC.bad = {}; DC.msg = ''; DC.act = 0; DC.solved[DC.p] = false; updateCtl(); }
  function dcSet(i, v) {
    const p = DC.p; if (DC.solved[p]) return;
    DC.vals[p][i] = v; DC.bad = {}; Sound.tick();
    const n = slotCount(p);
    let nx = i + 1; while (nx < n && DC.vals[p][nx]) nx++;
    DC.act = nx < n ? nx : i;
    updateCtl();
  }
  function dcAnswerChips() {
    const k = slotKind(DC.p, DC.act);
    if (k === 'base') return ['A', 'U', 'G', 'C'].map((b) => ({ v: b, label: b, col: BASE_COL[b] }));
    if (k === 'aa') return AA_LIST.concat(['*']).map((a) => ({ v: a, label: a === '*' ? '종결' : AA3[a], col: aaCol(a) }));
    return [1, 2, 3, 4, 6, 8, 12, 16].map((n) => ({ v: String(n), label: n + '가지', col: '#64748b' }));
  }
  function dcCheck() {
    const p = DC.p, v = DC.vals[p], P = PROB[p];
    if (DC.solved[p]) return;
    DC.bad = {};
    if (p === 0) {
      const m = v.slice(0, 15).join('');
      if (v.slice(0, 15).some((x) => !x)) { dcMsg('mRNA의 빈칸을 모두 채워 주세요.'); return; }
      for (let i = 0; i < 15; i++) if (v[i] !== P.mrna[i]) { DC.bad[i] = 1; dcMsg((i + 1) + '번째 염기를 다시 확인해요. 주형 가닥 ' + P.given[i] + ' 와 상보적인 RNA 염기는? (A–U, T–A, G–C, C–G)'); DC.act = i; return; }
      if (v.slice(15).some((x) => !x)) { dcMsg('아미노산 칸을 모두 채워 주세요. mRNA는 맞아요!'); DC.act = 15 + v.slice(15).findIndex((x) => !x); return; }
      for (let i = 0; i < 5; i++) if (v[15 + i] !== P.aa[i]) { DC.bad[15 + i] = 1; dcMsg((i + 1) + '번째 코돈 ' + P.mrna.slice(3 * i, 3 * i + 3) + ' 을(를) 코돈표에서 다시 찾아요.'); DC.act = 15 + i; return; }
    } else if (p === 1) {
      if (DC.start < 0) { dcMsg('먼저 위의 mRNA에서 시작 코돈 AUG의 첫 염기(A)를 눌러요.'); return; }
      if (DC.start !== P.start) { dcMsg('그 자리에서 시작하면 AUG가 아니에요. 5′ 쪽에서 처음 나오는 AUG를 찾아요.'); return; }
      if (v.some((x) => !x)) { dcMsg('아미노산 칸을 모두 채워 주세요.'); DC.act = v.findIndex((x) => !x); return; }
      for (let i = 0; i < 4; i++) if (v[i] !== P.aa[i]) { DC.bad[i] = 1; dcMsg((i + 1) + '번째 코돈을 읽기틀에 맞춰 다시 읽어요.'); DC.act = i; return; }
    } else {
      if (!v[0]) { dcMsg('가능한 mRNA 수를 골라 주세요.'); return; }
      if (+v[0] !== P.answer) { DC.bad[0] = 1; dcMsg('각 아미노산을 지정하는 코돈 수를 코돈표에서 세어 곱해 봐요. (Met · Phe · Asp 각각 몇 개?)'); return; }
    }
    DC.solved[p] = true; Sound.success(); dcMsg('정답이에요! 🎉', true);
    if (!RM) parts.burst(VW / 2, 120, { count: 22, speed: 150, life: 0.9 });
    updateCtl();
  }
  function decodeScene(dt, t) {
    DC.msgT = Math.max(0, DC.msgT - dt);
    const p = DC.p, P = PROB[p], v = DC.vals[p];
    if (DC.ref) {
      drawTable(tableRect(), {});
      if (PHONE) drawTableDetail({ x: 8, y: 520, w: 464, h: 112 }); else drawTableDetail({ x: 624, y: 44, w: 168, h: 508 });
      pill(VW / 2 - 40, 26, '📖 코돈표 (눌러서 확인)', { bg: '#fffbe6', color: '#92400e', border: '#f59e0b', size: 13 });
      return;
    }
    TF(14, 30, P.title, VW - 28, 16.5, 12, '#334155', 'left', 800);
    const tw = PHONE ? 28 : 36, solved = DC.solved[p];
    let y = 56;
    DC.trayHit = []; DC.tileHit = [];
    if (p === 0 || p === 1) {
      const n = P.given.length, x0 = (VW - n * tw) / 2;
      T(x0, y + 4, p === 0 ? '주어진 DNA 주형 가닥 ' + P3 + ' → ' + P5 : '주어진 mRNA ' + P5 + ' → ' + P3, 14, '#475569', 'left', 800);
      for (let i = 0; i < n; i++) {
        const isStart = p === 1 && DC.start === i;
        baseTile(x0 + i * tw, y + 12, tw, 32, P.given[i], { solid: p === 1 && DC.start >= 0 && i >= DC.start && i < DC.start + 3, hl: isStart ? '#f59e0b' : null, dim: p === 1 && DC.start >= 0 && (i < DC.start || i >= DC.start + 3 * 4) });
        DC.tileHit.push({ x: x0 + i * tw, y: y + 12, w: tw, h: 32, i });
      }
      if (p === 1 && DC.start >= 0) {
        for (let k = 0; k < 4; k++) { const bx = x0 + (DC.start + 3 * k) * tw; ctx.strokeStyle = k === 3 ? '#e2464b' : '#16a34a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(bx + 2, y + 52); ctx.lineTo(bx + 3 * tw - 2, y + 52); ctx.stroke(); }
        T(x0 + DC.start * tw + 1.5 * tw, y + 70, '시작', 12.5, '#16a34a', 'center', 800);
      }
      y += 60;
      if (p === 0) {
        T(x0, y + 8, 'mRNA ' + P5 + ' → ' + P3 + ' (아래에서 골라 써요)', 14, '#475569', 'left', 800);
        for (let i = 0; i < 15; i++) {
          const x = x0 + i * tw, act = DC.act === i, bad = DC.bad[i];
          baseTile(x, y + 16, tw, 34, v[i] || '', { blank: !v[i], solid: false, hl: bad ? '#e2464b' : act ? '#7c3aed' : null, fill: v[i] ? null : '#fff' });
          if (act && !solved) D.ring(x + tw / 2, y + 33, 20, clock, { color: '#7c3aed', width: 2 });
          DC.tileHit.push({ x, y: y + 16, w: tw, h: 34, slot: i });
        }
        for (let k = 0; k < 5; k++) { const bx = x0 + 3 * k * tw; ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(bx + 2, y + 56); ctx.lineTo(bx + 3 * tw - 2, y + 56); ctx.stroke(); }
        y += 66;
      }
      // 아미노산 칸
      const nAA = p === 0 ? 5 : 4, aaStartTile = p === 0 ? 0 : DC.start >= 0 ? DC.start : 0;
      T(x0, y + 8, '아미노산 서열', 14, '#475569', 'left', 800);
      for (let k = 0; k < nAA; k++) {
        const idx = p === 0 ? 15 + k : k;
        const cx = x0 + (aaStartTile + 3 * k + 1.5) * tw, act = DC.act === idx, bad = DC.bad[idx];
        const w = Math.min(3 * tw - 6, 92), h = 36, cy = y + 36;
        const val = v[idx];
        D.shadow(() => { D.roundRect(cx - w / 2, cy - h / 2, w, h, 18); ctx.fillStyle = val ? C.mix('#ffffff', aaCol(val), 0.22) : '#fff'; ctx.fill(); }, { blur: 4, y: 1 });
        ctx.strokeStyle = bad ? '#e2464b' : act && !solved ? '#7c3aed' : val ? aaCol(val) : '#94a3b8'; ctx.lineWidth = bad || (act && !solved) ? 3 : 2; D.roundRect(cx - w / 2, cy - h / 2, w, h, 18); ctx.stroke();
        T(cx, cy + 5.5, val ? (val === '*' ? '종결' : AA3[val]) : '?', 15, val ? C.shade(aaCol(val), -0.45) : '#94a3b8', 'center', 800);
        if (act && !solved) D.ring(cx, cy, 24, clock, { color: '#7c3aed', width: 2 });
        DC.tileHit.push({ x: cx - w / 2, y: cy - h / 2, w, h, slot: idx });
      }
      y += 66;
    } else {
      // 문제 3
      T(18, y + 14, '아미노산 서열  Met – Phe – Asp 를 만드는 mRNA는 몇 가지일까요?', 15, '#475569', 'left', 800);
      y += 36;
      const names = ['Met', 'Phe', 'Asp'], keys = ['M', 'F', 'D'];
      keys.forEach((a, k) => {
        const cx = VW / 2 + (k - 1) * (PHONE ? 140 : 190);
        aaChip(cx, y + 20, 100, 36, a, {});
        const cnt = DC.ref || solved ? CODON_COUNT[a] + '개' : '?개';
        T(cx, y + 62, '코돈 ' + (solved ? CODON_COUNT[a] : '?') + '개', 14, '#475569', 'center', 800);
        if (k < 2) T(cx + (PHONE ? 70 : 95), y + 27, '×', 22, '#475569', 'center', 800);
      });
      y += 92;
      const act = DC.act === 0, bad = DC.bad[0], val = v[0];
      const w = 150, h = 42, cx = VW / 2, cy = y + 22;
      T(cx - w / 2 - 12, cy + 6, '= ', 20, '#475569', 'right', 800);
      D.shadow(() => { D.roundRect(cx - w / 2, cy - h / 2, w, h, 20); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: 4, y: 1 });
      ctx.strokeStyle = bad ? '#e2464b' : act && !solved ? '#7c3aed' : '#94a3b8'; ctx.lineWidth = 3; D.roundRect(cx - w / 2, cy - h / 2, w, h, 20); ctx.stroke();
      T(cx, cy + 7, val ? val + '가지' : '?', 20, '#1f2d44', 'center', 800);
      DC.tileHit.push({ x: cx - w / 2, y: cy - h / 2, w, h, slot: 0 });
      y += 70;
    }
    // 메시지
    if (DC.msg && DC.msgT > 0) {
      const lines = wrap(DC.msg, VW - 44, 14, 800);
      const hh = lines.length * 19 + 14;
      D.roundRect(12, y - 2, VW - 24, hh, 12); ctx.fillStyle = DC.msgOK ? '#e8f8ee' : '#fdeceb'; ctx.fill(); ctx.strokeStyle = DC.msgOK ? '#16a34a' : '#e2464b'; ctx.lineWidth = 2; ctx.stroke();
      lines.forEach((l, i) => T(24, y + 18 + i * 19, l, 14, DC.msgOK ? '#166534' : '#991b1b', 'left', 800));
      y += hh + 6;
    } else if (solved) { T(VW / 2, y + 14, '이 문제는 풀었어요 ✔', 15, '#15803d', 'center', 800); y += 28; }
    // 선택지 (tray)
    if (!solved) {
      const chips = dcAnswerChips(), kind = slotKind(p, DC.act);
      const cw = kind === 'base' ? 62 : kind === 'num' ? 78 : PHONE ? 84 : 92, ch = 38, gap = 6;
      const per = Math.max(1, Math.floor((VW - 24 + gap) / (cw + gap)));
      const rows = Math.ceil(chips.length / per), totalW = Math.min(chips.length, per) * (cw + gap) - gap, sx = (VW - totalW) / 2;
      T(18, y + 12, kind === 'base' ? '쓸 염기를 골라요' : kind === 'aa' ? '아미노산을 골라요' : '가짓수를 골라요', 14, '#475569', 'left', 800);
      y += 20;
      chips.forEach((c, i) => {
        const col = i % per, row = Math.floor(i / per), x = sx + col * (cw + gap), yy = y + row * (ch + gap);
        const cur = v[DC.act] === c.v;
        D.shadow(() => { D.roundRect(x, yy, cw, ch, 12); ctx.fillStyle = cur ? C.mix('#ffffff', c.col, 0.35) : '#fff'; ctx.fill(); }, { blur: 3, y: 1 });
        ctx.strokeStyle = c.col; ctx.lineWidth = cur ? 3 : 1.8; D.roundRect(x, yy, cw, ch, 12); ctx.stroke();
        T(x + cw / 2, yy + ch / 2 + 5.5, c.label, kind === 'base' ? 19 : 14.5, kind === 'base' ? BASE_COL[c.v] : C.shade(c.col, -0.4), 'center', 800);
        DC.trayHit.push({ x, y: yy, w: cw, h: ch, v: c.v });
      });
      y += rows * (ch + gap);
    }
  }
  const dcPT = {
    down(p) {
      if (DC.ref) { const c = tableAt(p); if (c) { TB.sel = c; Sound.tick(); } return false; }
      for (const r of DC.trayHit || []) if (inRect(p.x, p.y, r) && !DC.solved[DC.p]) { dcSet(DC.act, r.v); return false; }
      for (const r of DC.tileHit || []) if (inRect(p.x, p.y, r)) {
        if (DC.p === 1 && r.i != null) { if (DC.solved[1]) return false; DC.start = r.i; DC.bad = {}; Sound.click(); updateCtl(); if (PROB[1].given[r.i] !== 'A') dcMsg('시작 코돈 AUG는 A로 시작해요. 5′ 쪽에서 처음 나오는 AUG의 A를 눌러요.'); else DC.msg = ''; return false; }
        if (r.slot != null && !DC.solved[DC.p]) { if (DC.p === 1 && DC.start < 0) { dcMsg('먼저 위의 mRNA에서 시작 코돈 AUG의 A를 눌러요.'); return false; } DC.act = r.slot; Sound.tick(); updateCtl(); return false; }
      }
      return false;
    },
    hover(p) { if (DC.ref) return tableAt(p) ? 'pointer' : 'default'; for (const r of (DC.trayHit || []).concat(DC.tileHit || [])) if (inRect(p.x, p.y, r)) return 'pointer'; return 'default'; },
  };

  /* =========================================================
     ④ 부호의 특징: 보편성 · 셋째 염기 · 돌연변이 다시 분류
     ========================================================= */
  const UN = { run: false, t: 0, done: false };
  const UN_MRNA = 'AUGUGGAAAGGCUGA';
  const UN_AA = ['M', 'W', 'K', 'G'];
  function unRun() { if (UN.run) return; UN.run = true; UN.t = 0; Sound.click(); updateCtl(); }
  function drawCellBox(cx, cy, w, h, kind, label, prog, col) {
    ctx.save();
    D.shadow(() => {
      if (kind === 'human') { ctx.beginPath(); ctx.ellipse(cx, cy, w / 2, h / 2, 0, 0, TAU); }
      else D.roundRect(cx - w / 2, cy - h / 2, w, h, h / 2);
      ctx.fillStyle = kind === 'human' ? '#fff0e0' : '#eaf7df'; ctx.fill();
    }, { blur: 8, y: 3 });
    ctx.strokeStyle = col; ctx.lineWidth = 4;
    if (kind === 'human') { ctx.beginPath(); ctx.ellipse(cx, cy, w / 2, h / 2, 0, 0, TAU); ctx.stroke(); } else { D.roundRect(cx - w / 2, cy - h / 2, w, h, h / 2); ctx.stroke(); }
    ctx.restore();
    T(cx, cy - h / 2 - 10, label, 15.5, C.shade(col, -0.4), 'center', 800);
    // 리보솜 + 사슬
    ribo(cx - w * 0.16, cy + 2, 0.55, {});
    const nB = Math.round(prog * 4);
    for (let k = 0; k < nB; k++) D.sphere(cx - w * 0.16 + 30 + k * 26, cy - h * 0.2 - k * 3, 11, aaCol(UN_AA[k]), { text: AA3[UN_AA[k]], textScale: 0.85 });
  }
  function univScene(dt, t) {
    if (UN.run) { UN.t += dt; if (UN.t >= 4.2) { UN.run = false; UN.done = true; Sound.success(); updateCtl(); } }
    const prog = UN.done ? 1 : clamp((UN.t - 1.2) / 2.6, 0, 1);
    T(14, 32, '같은 mRNA를 사람 세포 추출액과 대장균 추출액에 넣어요', PHONE ? 14 : 16.5, '#334155', 'left', 800);
    // mRNA
    const n = UN_MRNA.length, tw = PHONE ? 26 : 32, x0 = (VW - n * tw) / 2, y0 = 64;
    T(x0 - 6, y0 + 20, P5, 14, '#475569', 'right', 800); T(x0 + n * tw + 6, y0 + 20, P3, 14, '#475569', 'left', 800);
    for (let i = 0; i < n; i++) baseTile(x0 + i * tw, y0, tw, 28, UN_MRNA[i], { solid: true });
    // 화살표 + 방울
    const lx = PHONE ? VW / 2 : VW * 0.27, rx = PHONE ? VW / 2 : VW * 0.73;
    const hy = PHONE ? 210 : 270, ey = PHONE ? 440 : 270, bw = PHONE ? 300 : 280, bh = PHONE ? 130 : 150;
    D.arrow(VW / 2, y0 + 34, lx, hy - bh / 2 - 22, { color: '#8b5cf6', width: 3, head: 10 });
    D.arrow(VW / 2, y0 + 34, rx, PHONE ? ey - bh / 2 - 22 : ey - bh / 2 - 22, { color: '#8b5cf6', width: 3, head: 10 });
    drawCellBox(lx, hy, bw, bh, 'human', '사람 세포 추출액', prog, '#ea8a3a');
    drawCellBox(rx, ey, bw, bh, 'bact', '대장균 추출액', prog, '#6aa84f');
    if (UN.run && UN.t < 1.2) { const f = UN.t / 1.2; D.sphere(lerp(VW / 2, lx, f), lerp(y0 + 34, hy - bh / 2 - 22, f), 7, '#8b5cf6', {}); D.sphere(lerp(VW / 2, rx, f), lerp(y0 + 34, ey - bh / 2 - 22, f), 7, '#8b5cf6', {}); }
    const by = PHONE ? 560 : 400;
    if (UN.done) {
      panel(14, by, VW - 28, PHONE ? 70 : 128, 14, '#f3fbf5');
      T(VW / 2, by + 28, '두 추출액이 같은 펩타이드를 만들었어요: Met–Trp–Lys–Gly', PHONE ? 13.5 : 17, '#166534', 'center', 800);
      if (!PHONE) {
        T(VW / 2, by + 62, '→ 사람과 대장균이 같은 유전 부호를 쓰고 있어요 (보편성)', 16, '#166534', 'center', 800);
        T(VW / 2, by + 94, '그래서 사람의 인슐린 유전자를 대장균에 넣어도 인슐린이 만들어져요', 15, '#475569', 'center', 800);
        T(VW / 2, by + 118, '(미토콘드리아 등 일부는 부호가 조금 달라요)', 13.5, '#64748b', 'center', 700);
      } else T(VW / 2, by + 52, '→ 같은 부호를 써요 (보편성)', 13.5, '#166534', 'center', 800);
    } else T(VW / 2, by + 24, UN.run ? '번역 중…' : '[▶ 같은 mRNA 넣기]를 눌러요', 15, '#475569', 'center', 800);
  }

  const SYN = { g: 0, third: { same: 126, total: 183 }, all: { same: 134, total: 549 }, seen: false, sel: ['', '', ''] };
  const MUTS = [['GAA', 'GAG'], ['GAA', 'GUA'], ['UGG', 'UGA']];
  const MUT_ANS = ['silent', 'missense', 'nonsense'];
  const MUT_KO = { silent: '침묵', missense: '과오', nonsense: '넌센스' };
  function synScene(dt, t) {
    SYN.g = approach(SYN.g, 1, dt, 1.6); if (SYN.g > 0.97) SYN.seen = true;
    T(14, 30, '단일 염기 치환 결과: 같은 아미노산을 지정하는 비율', PHONE ? 13.5 : 16.5, '#334155', 'left', 800);
    const bx = 18, bwid = VW - 36, bars = [['셋째 염기만 바꾼 경우', SYN.third, '#16a34a'], ['모든 위치를 바꾼 경우', SYN.all, '#f59e0b']];
    bars.forEach((b, k) => {
      const y = 52 + k * (PHONE ? 74 : 70), r = b[1].same / b[1].total, wsame = bwid * r * SYN.g;
      T(bx, y + 10, b[0] + ' (' + b[1].total + '가지 중 같은 아미노산 ' + b[1].same + '가지)', PHONE ? 12.5 : 14.5, '#475569', 'left', 800);
      D.roundRect(bx, y + 20, bwid, 28, 14); ctx.fillStyle = '#e5e7eb'; ctx.fill();
      ctx.save(); D.roundRect(bx, y + 20, bwid, 28, 14); ctx.clip(); ctx.fillStyle = b[2]; ctx.fillRect(bx, y + 20, wsame, 28); ctx.restore();
      ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 2; D.roundRect(bx, y + 20, bwid, 28, 14); ctx.stroke();
      T(bx + Math.max(40, wsame) - 8, y + 40, '약 ' + Math.round(r * 100 * SYN.g) + ' %', 15, '#fff', 'right', 800);
      T(bx + bwid - 10, y + 40, '다른 아미노산', 13, '#64748b', 'right', 800, { alpha: SYN.g });
    });
    const cy0 = PHONE ? 220 : 212;
    T(bx, cy0 + 8, '앞 단원 돌연변이 3가지를 코돈표로 다시 분류해요', PHONE ? 13.5 : 15.5, '#334155', 'left', 800);
    const cw = PHONE ? (VW - 36) : (VW - 36 - 20) / 3, ch = PHONE ? 84 : 150;
    MUTS.forEach((m, k) => {
      const x = PHONE ? bx : bx + k * (cw + 10), y = PHONE ? cy0 + 20 + k * (ch + 8) : cy0 + 22;
      panel(x, y, cw, ch, 14);
      const a1 = codonAA(m[0]), a2 = codonAA(m[1]);
      const mid = x + cw / 2;
      if (!PHONE) {
        T(mid, y + 26, m[0] + ' → ' + m[1], 18, '#1f2d44', 'center', 800);
        aaChip(mid - 44, y + 64, 74, 28, a1, { text: a1 === '*' ? '종결' : AA3[a1] }); T(mid, y + 70, '→', 16, '#64748b', 'center', 800); aaChip(mid + 44, y + 64, 74, 28, a2, { text: a2 === '*' ? '종결' : AA3[a2] });
        const sel = SYN.sel[k];
        pill(mid, y + 112, sel ? MUT_KO[sel] : '? 선택해요', { bg: sel ? '#e8f8ee' : '#fff', color: sel ? '#166534' : '#94a3b8', border: sel ? '#16a34a' : '#cbd5e1', size: 14.5 });
      } else {
        T(x + 14, y + 30, m[0] + ' → ' + m[1], 17, '#1f2d44', 'left', 800);
        aaChip(x + 130, y + 26, 70, 26, a1, { text: a1 === '*' ? '종결' : AA3[a1] }); T(x + 176, y + 32, '→', 15, '#64748b', 'center', 800); aaChip(x + 222, y + 26, 70, 26, a2, { text: a2 === '*' ? '종결' : AA3[a2] });
        const sel = SYN.sel[k];
        pill(x + 14, y + 62, sel ? MUT_KO[sel] : '? 아래에서 선택', { bg: sel ? '#e8f8ee' : '#fff', color: sel ? '#166534' : '#94a3b8', border: sel ? '#16a34a' : '#cbd5e1', size: 13.5, align: 'left' });
      }
    });
  }

  /* =========================================================
     화면 전환 · 조작 연결
     ========================================================= */
  const ASK = { list: ['AUG', 'UGG', 'GCA', 'AAG', 'AGA'], i: 0, msg: '' };
  const PTS = { table: null, decode: dcPT, fill: null };
  function setMode(m) {
    if (S.mode !== m) S.fade = 1;
    S.mode = m; hideHint();
    if (m === 'table') PT = TB.view === 'bars' ? barsPT : tablePT; else if (m === 'decode') PT = dcPT; else PT = null;
    updateCtl();
  }
  function updateCtl() {
    const fr0 = game ? game.free : false, lvNow = game ? game.level : 0;
    ctlNodes.forEach((n) => { n.hidden = (n.dataset.modes || '').split(' ').indexOf(S.mode) < 0; });
    modeBtns(S.mode, lvNow, fr0);
    chipOn($('#nirSel'), N.kind); $('#nirRun').disabled = N.run;
    $('#nirMade').innerHTML = ['U', 'A', 'C', 'G', 'UC'].map((k) => '<li class="' + (N.done[k] ? 'on' : '') + '">' + mark(N.done[k]) + ' ' + NIR_KINDS[k].txt + (N.done[k] ? ' → ' + NIR_KINDS[k].res.map((a) => AA3[a]).join(' + ') : '') + '</li>').join('');
    chipOn($('#tbView'), TB.view);
    $('#askQ').innerHTML = ASK.i >= 5 ? '✅ 코돈 5개를 모두 찾았어요!' : '<b>' + (ASK.i + 1) + ' / 5</b> · 코돈 ' + P5 + '-<b>' + ASK.list[Math.min(ASK.i, 4)] + '</b>-' + P3 + ' 가 지정하는 것은?';
    $('#askBtn').disabled = ASK.i >= 5; $('#askSel').disabled = ASK.i >= 5;
    $$('#pbSel button').forEach((b) => { b.classList.toggle('on', +b.dataset.v === DC.p); b.classList.toggle('seen', DC.solved[+b.dataset.v]); b.textContent = (DC.solved[+b.dataset.v] ? '✔ ' : '') + '문제 ' + (+b.dataset.v + 1); });
    $('#dcCheck').disabled = DC.solved[DC.p]; $('#dcRef').textContent = DC.ref ? '↩ 문제로 돌아가기' : '📖 코돈표 펼치기';
    $('#unRun').disabled = UN.run;
    if (S.mode === 'table') PT = TB.view === 'bars' ? barsPT : tablePT;
    // 선택 칸 표시 되돌리기
    ['f0', 'f1', 'f2', 'f3', 'f4'].forEach((id) => { const e = $('#' + id); const c = ['UUU', 'AAA', 'CCC', 'GGG', 'CUC'][+id[1]]; if (e && e.value !== (TB.fillSel[c] || '')) e.value = TB.fillSel[c] || ''; });
  }
  bindModes(setMode);
  $$('#nirSel button').forEach((b) => b.addEventListener('click', () => { Sound.click(); nirPick(b.dataset.v); }));
  $('#nirRun').addEventListener('click', nirRun);
  ['f0', 'f1', 'f2', 'f3', 'f4'].forEach((id, i) => { const e = $('#' + id); e.innerHTML = optList(false); e.addEventListener('change', () => { TB.fillSel[['UUU', 'AAA', 'CCC', 'GGG', 'CUC'][i]] = e.value; e.classList.remove('bad'); updateCtl(); }); });
  $$('#tbView button').forEach((b) => b.addEventListener('click', () => { Sound.click(); TB.view = b.dataset.v; setMode('table'); }));
  $('#askSel').innerHTML = optList(true);
  $('#askBtn').addEventListener('click', () => {
    if (ASK.i >= 5) return; const v = $('#askSel').value;
    if (!v) { showHint('아미노산을 골라 주세요.'); return; }
    const cod = ASK.list[ASK.i];
    if (v === codonAA(cod)) { TB.sel = cod; ASK.i++; Sound.success(); okBurst(VW / 2, 200); $('#askSel').value = ''; showHint(cod + ' → ' + (codonAA(cod) === '*' ? '종결' : AA3[codonAA(cod)]) + ' ✔', 2500); }
    else { Sound.fail(); showHint('아니에요. 첫째 염기 ' + cod[0] + ' → 둘째 염기 ' + cod[1] + ' → 셋째 염기 ' + cod[2] + ' 순서로 표에서 다시 찾아요.', 4200); }
    updateCtl();
  });
  $$('#pbSel button').forEach((b) => b.addEventListener('click', () => { Sound.click(); dcPick(+b.dataset.v); }));
  $('#dcCheck').addEventListener('click', () => { Sound.click(); dcCheck(); });
  $('#dcClear').addEventListener('click', () => { Sound.click(); dcClear(); });
  $('#dcRef').addEventListener('click', () => { Sound.click(); DC.ref = !DC.ref; updateCtl(); });
  $('#unRun').addEventListener('click', unRun);
  $('#unA').innerHTML = '<option value="">선택</option><option value="diff">사람과 대장균은 서로 다른 유전 부호를 쓴다</option><option value="same">사람과 대장균은 같은 유전 부호를 쓴다 (보편성)</option><option value="none">대장균은 사람 mRNA를 번역하지 못한다</option>';
  $('#synB').innerHTML = '<option value="">선택</option><option value="24">약 24 %</option><option value="69">약 69 %</option><option value="100">약 100 %</option>';
  [0, 1, 2].forEach((k) => { const e = $('#synC' + k); e.innerHTML = '<option value="">선택</option><option value="silent">침묵</option><option value="missense">과오</option><option value="nonsense">넌센스</option>'; e.addEventListener('change', () => { SYN.sel[k] = e.value; e.classList.remove('bad'); }); });
  ['unA', 'synB'].forEach((id) => $('#' + id).addEventListener('change', () => $('#' + id).classList.remove('bad')));

  /* =========================================================
     미션
     ========================================================= */
  const nirChips = () => ['U', 'A', 'C', 'G'].map((k) => mark(N.done[k]) + ' ' + NIR_KINDS[k].txt + (N.done[k] ? ' → ' + AA3[NIR_KINDS[k].res[0]] : '')).join(' &nbsp; ');
  const levels = [
    {
      title: '코돈의 뜻을 밝힌 실험', short: '부호 규명', icon: '🧪', phase: '실험',
      intro: '<p class="si-q">❓ 탐구 질문: mRNA의 A, U, G, C 네 글자는 어떤 사전으로 아미노산이 될까? 그 사전은 어떻게 만들어졌고 모든 생물에서 같을까?</p><p>🔗 <b>통합과학</b>에서 염기 3개(코돈)가 아미노산 1개를 지정한다는 것(4 → 16 → 64 ≥ 20)과 간단한 코돈표를 배웠어요. 이번에는 이 <b>사전이 어떻게 만들어졌는지</b>와 <b>64칸 표준 코돈표</b>로 직접 해독하는 방법을 배워요.</p><p>1961년 니런버그와 마태이는 <b>인공 mRNA</b>를 세포 추출액에 넣고 어떤 아미노산이 이어지는지 확인했어요. 가상으로 따라 해 봐요. 시험관 20개에는 아미노산이 한 종류씩만 방사성으로 표지되어 있어요.</p>',
      features: ['nir', 'fill'],
      setup() { setMode('nir'); },
      recap: 'poly-U는 Phe, poly-A는 Lys, poly-C는 Pro, poly-G는 Gly만 이어서 UUU · AAA · CCC · GGG의 뜻을 알아냈어요. 같은 코돈이 반복되면 한 종류의 아미노산만 이어지고, UCUCUC…는 두 코돈이 번갈아 읽혀 Ser–Leu이 나왔어요.',
      summary: '<ul><li><b>유전 부호</b>: mRNA의 염기 3개(코돈)가 아미노산 1개를 지정하는 규칙이에요. 4³ = 64가지 코돈이 있어요.</li><li><b>니런버그 · 마태이 실험(1961)</b>: 세포 추출액 + 인공 mRNA + 방사성 표지 아미노산. poly-U(UUUU…) → 표지 Phe 시험관에서만 방사성 폴리펩타이드 → <b>UUU = Phe</b>. poly-A → Lys(AAA), poly-C → Pro(CCC), poly-G → Gly(GGG).</li><li>같은 코돈이 반복되는 mRNA는 한 종류의 아미노산만 이어요. UCUCUC…처럼 두 코돈이 번갈아 나오면 두 아미노산이 번갈아 이어져요(UCU = Ser이면 CUC = Leu).</li></ul>',
      missions: [
        {
          id: 'nir4', title: '인공 mRNA 4가지 실험',
          goal: '<b>poly-U · poly-A · poly-C · poly-G</b>를 차례로 실험해서 방사성이 나타나는 시험관을 찾으세요.',
          hint: '위쪽 단추에서 mRNA를 고르고 [실험 시작]을 눌러요. 한 번에 한 종류씩 실험하고, 결과가 나온 뒤 다음 mRNA를 골라요.',
          setup() { setMode('nir'); },
          check: () => ['U', 'A', 'C', 'G'].every((k) => N.done[k]), hold: 0.8,
          status: nirChips,
          explain: '<b>poly-U</b>(UUUU…)는 UUU가 반복되는 mRNA예요. 이 mRNA를 넣었을 때 <b>Phe</b>를 표지한 시험관에서만 방사성 폴리펩타이드가 나왔으므로 <b>UUU = Phe</b>예요. 같은 방법으로 AAA = Lys, CCC = Pro, GGG = Gly를 알아냈어요.',
        },
        {
          id: 'fill', title: '코돈표 빈칸 채우기', manual: true,
          goal: '실험 결과로 <b>UUU · AAA · CCC · GGG</b>의 아미노산을 채우세요. <b>UCUCUC…</b> 실험도 해 보고, UCU = Ser임을 이용해 <b>CUC</b>도 채워요.',
          hint: 'UCUCUC…에서는 Ser와 Leu가 번갈아 나왔어요. UCU가 Ser라면 나머지 CUC는 어느 아미노산일까요? 🧪 부호 규명 화면에서 UCUCUC… 실험을 해야 해요.',
          setup() { setMode('fill'); },
          check() {
            if (!N.done.UC) return 'UCUCUC… 인공 mRNA 실험도 해 보세요. (위쪽 🧪 부호 규명 화면에서 5번째 mRNA)';
            const keys = Object.keys(FILL_ANS), miss = keys.filter((c) => !TB.fillSel[c]);
            if (miss.length) return '아직 고르지 않은 칸이 있어요. (' + miss.length + '개)';
            const wrong = keys.filter((c) => TB.fillSel[c] !== FILL_ANS[c]);
            keys.forEach((c, i) => $('#f' + i).classList.toggle('bad', wrong.indexOf(c) >= 0));
            if (!wrong.length) return true;
            return wrong[0] + ' 칸이 달라요. ' + (wrong[0] === 'CUC' ? 'UCUCUC…에서 Ser와 Leu가 번갈아 나왔고 UCU는 Ser예요.' : '실험 결과에서 그 mRNA를 넣었을 때 방사성이 나온 시험관을 떠올려 보세요.') + ' (' + wrong.length + '칸)';
          },
          explain: 'UUU = Phe, AAA = Lys, CCC = Pro, GGG = Gly예요. UCUCUC…는 UCU와 CUC가 번갈아 읽혀 Ser–Leu–Ser–Leu…가 만들어졌어요. UCU가 Ser라면 CUC는 <b>Leu</b>예요. 이런 실험을 거듭해 64개 코돈의 뜻이 모두 밝혀졌어요.',
        },
        {
          type: 'quiz', title: '왜 한 종류의 아미노산만 이어질까?',
          goal: 'poly-U(UUUU…)를 넣었을 때 한 종류의 아미노산(Phe)만 이어지는 까닭으로 알맞은 것은?',
          setup() { setMode('nir'); },
          choices: ['UUU UUU UUU… 처럼 같은 코돈이 반복되어 같은 아미노산이 계속 지정되기 때문이다', '세포 추출액에 페닐알라닌만 들어 있기 때문이다', '코돈 하나가 여러 아미노산을 번갈아 지정하기 때문이다', 'mRNA가 번역되지 않고 Phe 하나만 달라붙기 때문이다'],
          answer: 0,
          feedback: ['', '추출액에는 20종 아미노산이 모두 있어요. 방사성 표지가 붙은 것이 시험관마다 다를 뿐이에요.', '한 코돈은 한 아미노산만 지정해요. 그래서 UUU만 반복되면 한 종류만 이어져요.', '폴리펩타이드가 만들어졌으니 번역이 일어난 거예요.'],
          explain: 'poly-U는 UUU가 계속 이어지는 mRNA를 3염기씩 끊어 읽으면 UUU UUU UUU…가 돼요. 한 코돈은 한 아미노산만 지정하므로 Phe–Phe–Phe…만 이어지고, Phe 표지 시험관에서만 방사성이 나와요.',
        },
      ],
    },
    {
      title: '64칸 코돈표 읽기', short: '코돈표', icon: '🔤', phase: '모형',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 인공 mRNA 실험으로 몇 가지 코돈의 뜻을 알아냈어요. 이런 실험으로 밝혀진 <b>64개 코돈 전체</b>가 표준 코돈표예요.</div><p>표는 <b>첫째 → 둘째 → 셋째 염기</b> 순서로 읽어요. 64개 코돈 중 <b>61개</b>는 아미노산을 지정하고 <b>3개</b>(UAA · UAG · UGA)는 종결 코돈이에요. 시작 코돈 AUG는 Met을 지정해요.</p><p>💡 칸을 눌러 코돈을 골라 보세요. 같은 아미노산의 다른 코돈도 함께 표시돼요.</p>',
      features: ['table'],
      setup() { TB.view = 'table'; setMode('table'); },
      recap: '코돈표에는 64개 코돈이 있어요. 61개는 아미노산을, 3개(UAA · UAG · UGA)는 종결을 지정하고, AUG는 시작 코돈(Met)이에요. 한 아미노산에 코돈이 여러 개일 수 있지만(축퇴성) 한 코돈은 한 아미노산만 지정해요.',
      summary: '<ul><li><b>표준 코돈표</b>: 64개 코돈 = 아미노산 지정 61개 + 종결 3개(UAA · UAG · UGA). <b>시작 코돈 AUG = Met</b>.</li><li><b>축퇴성</b>: 한 아미노산을 지정하는 코돈이 여러 개예요. 6개 — Leu · Ser · Arg(3종), 4개 — Val · Pro · Thr · Ala · Gly(5종), 3개 — Ile, 2개 — Phe · Tyr · Cys · His · Gln · Asn · Lys · Asp · Glu(9종), 1개 — Met · Trp(2종). (18 + 20 + 3 + 18 + 2 = 61)</li><li>반대로 <b>한 코돈은 한 아미노산만</b> 지정해요(모호하지 않아요).</li><li>읽는 법: 첫째 염기(왼쪽 줄) → 둘째 염기(위쪽 칸) → 셋째 염기(칸 안의 줄).</li></ul>',
      missions: [
        {
          id: 'find5', title: '코돈 5개 찾아 아미노산 입력',
          goal: '코돈표에서 문제로 나온 <b>코돈 5개</b>가 지정하는 아미노산을 찾아 입력하세요.',
          hint: '첫째 염기로 줄을 찾고, 둘째 염기로 칸을 찾고, 셋째 염기로 그 칸 안의 줄을 찾아요. 칸을 눌러 확인하고 아래에서 아미노산을 골라 [확인]을 눌러요.',
          setup() { TB.view = 'table'; setMode('table'); },
          check: () => ASK.i >= 5, hold: 0.6,
          status: () => mark(ASK.i >= 5) + ' 찾은 코돈 ' + Math.min(ASK.i, 5) + ' / 5',
          explain: 'AUG = Met(시작), UGG = Trp, GCA = Ala, AAG = Lys, AGA = Arg예요. Met과 Trp는 코돈이 1개뿐이고, Ala는 4개, Lys는 2개, Arg는 6개예요. 코돈표를 읽는 순서만 알면 어떤 코돈의 뜻이든 찾을 수 있어요.',
        },
        {
          type: 'quiz', title: '코돈표에 대한 옳은 설명',
          goal: '코돈표를 보고 옳은 설명을 고르세요.',
          setup() { TB.view = 'table'; setMode('table'); },
          choices: ['UGA는 아미노산을 지정하지 않는 종결 코돈이고, Leu처럼 한 아미노산에 코돈이 여러 개인 경우가 있다', 'UGA는 Trp를 지정하고, 한 코돈이 여러 아미노산을 지정하기도 한다', '한 코돈이 상황에 따라 서로 다른 아미노산을 지정할 수 있다', 'UGA는 시작 코돈이다'],
          answer: 0,
          feedback: ['', 'Trp를 지정하는 코돈은 UGG 하나뿐이에요. UGA는 종결 코돈이에요.', '한 코돈은 항상 한 아미노산(또는 종결)만 지정해요. 여러 코돈이 같은 아미노산을 지정하는 것이 축퇴성이에요.', '시작 코돈은 AUG(Met)예요. UGA는 번역을 끝내는 종결 코돈이에요.'],
          explain: '종결 코돈 UAA · UAG · UGA에는 대응하는 아미노산이 없어서 번역이 끝나요. 한 아미노산에 코돈이 여러 개(예: Leu는 6개)인 것은 <b>축퇴성</b>이고, 반대로 한 코돈이 여러 아미노산을 지정하는 일은 없어요.',
        },
      ],
    },
    {
      title: '해독 연습', short: '해독 연습', icon: '📝', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 코돈표 읽는 법을 익혔어요. 이제 이 표로 <b>유전 정보를 해독</b>해요.</div><p>문제 3개를 풀어요. 문제마다 아래에서 칸을 눌러 고른 뒤 <b>✔ 정답 확인</b>을 눌러요. 막히면 <b>📖 코돈표 펼치기</b>로 표를 볼 수 있어요.</p><p>① DNA 주형 가닥 → mRNA → 아미노산, ② mRNA에서 시작 코돈을 찾아 읽기틀 정하기, ③ 아미노산 서열에서 가능한 mRNA 수 구하기예요.</p>',
      features: ['decode'],
      setup() { dcPick(0); setMode('decode'); },
      recap: '해독은 mRNA(주형 DNA의 상보 서열)에서 시작 코돈 AUG를 찾아 3염기씩 읽기틀을 정하고 코돈표로 아미노산을 찾는 일이에요. 아미노산 서열에서 가능한 mRNA 수는 아미노산마다 코돈 수를 곱해요.',
      summary: '<ul><li><b>DNA 주형 가닥 → mRNA → 아미노산</b>: 주형 3′-TAC GTT AGG CAT ACT-5′ → mRNA 5′-AUG CAA UCC GUA UGA-3′ → Met–Gln–Ser–Val–종결.</li><li><b>읽기틀</b>: 처음 나오는 AUG에서 시작해 3염기씩 끊어 읽어요. mRNA 5′-GC<b>AUG</b>GGCAAAUAGCC-3′ → AUG GGC AAA UAG → Met–Gly–Lys–종결 (앞의 GC와 뒤의 CC는 번역되지 않아요).</li><li><b>가능한 mRNA 수</b>: 아미노산마다 코돈 수를 곱해요. Met–Phe–Asp = 1 × 2 × 2 = 4가지.</li></ul>',
      missions: [
        {
          id: 'decode3', title: '해독 문제 3개 풀기',
          goal: '해독 문제 <b>3개</b>를 모두 풀어 보세요.',
          hint: '문제 1: 주형 가닥의 각 염기와 상보적인 RNA 염기를 써요(T→A, A→U, G→C, C→G). 문제 2: 5′ 쪽에서 처음 나오는 AUG를 눌러 시작점을 정해요. 문제 3: 아미노산마다 코돈 수를 세어 곱해요.',
          setup() { setMode('decode'); },
          check: () => DC.solved.every(Boolean), hold: 0.6,
          status: () => DC.solved.map((s, i) => mark(s) + ' 문제 ' + (i + 1)).join(' &nbsp; '),
          explain: '<b>문제 1</b>: 주형 3′-TAC GTT AGG CAT ACT-5′ → mRNA 5′-AUG CAA UCC GUA UGA-3′ → Met–Gln–Ser–Val–종결. <b>문제 2</b>: GC AUG GGC AAA UAG CC → Met–Gly–Lys–종결 (처음부터 읽으면 읽기틀이 달라져요). <b>문제 3</b>: Met(1) × Phe(2) × Asp(2) = 4가지.',
        },
        {
          type: 'quiz', title: 'Met–Trp–Lys를 만드는 mRNA',
          goal: '아미노산 서열 <b>Met–Trp–Lys</b>를 만드는 mRNA(암호 부분)는 몇 가지일까요?',
          setup() { setMode('decode'); },
          choices: ['1가지', '2가지', '4가지', '6가지'],
          answer: 1,
          feedback: ['Lys를 지정하는 코돈이 AAA와 AAG로 2개예요. 두 가지가 있어요.', '', 'Met(1) × Trp(1) × Lys(2)예요. Met · Trp는 코돈이 1개씩이에요.', '6은 Leu · Ser · Arg 같은 아미노산의 코돈 수예요. Lys는 2개예요.'],
          explain: 'Met 코돈 1개(AUG) × Trp 코돈 1개(UGG) × Lys 코돈 2개(AAA · AAG) = <b>2가지</b>예요: AUG UGG AAA / AUG UGG AAG. 같은 아미노산 서열을 만드는 mRNA가 여러 개일 수 있는 것이 축퇴성의 결과예요.',
        },
      ],
    },
    {
      title: '유전 부호의 특징', short: '부호의 특징', icon: '🌍', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계들에서</b> 코돈표로 유전 정보를 해독했어요. 이제 이 부호의 <b>특징</b>을 분석해요.</div><p>① <b>보편성</b>: 같은 mRNA를 사람 세포 추출액과 대장균 추출액에 넣으면 어떻게 될까요? ② <b>축퇴성의 의미</b>: 셋째 염기가 바뀌면 같은 아미노산인 경우가 많아요. 앞 단원에서 배운 침묵 · 과오 · 넌센스 돌연변이도 코돈표로 다시 분류해요.</p><p>📘 두 화면에서 모두 선택 칸을 채우고 <b>✔ 확인하기</b>를 눌러요.</p>',
      features: ['univ', 'syn'],
      setup() { setMode('univ'); },
      recap: '사람과 대장균 추출액이 같은 펩타이드를 만든다는 것은 유전 부호가 거의 모든 생물에서 같다(보편성)는 뜻이에요. 셋째 염기만 바뀌면 약 69 %가 같은 아미노산이라 영향이 작은 경우가 많아요.',
      summary: '<ul><li><b>보편성</b>: 거의 모든 생물이 같은 유전 부호를 써요. 사람과 대장균 추출액에 같은 mRNA를 넣으면 같은 펩타이드가 만들어져요. 그래서 사람의 인슐린 유전자를 대장균에 넣어 인슐린을 만들 수 있어요. 공통 조상에서 유래했다는 증거이기도 해요. (일부 예외: 미토콘드리아 등)</li><li><b>축퇴성과 돌연변이</b>: 종결 코돈을 뺀 61개 코돈의 셋째 염기를 다른 3가지로 바꾼 183가지 중 126가지(약 69 %)가 같은 아미노산이에요. 모든 위치의 단일 염기 치환 549가지 중에서는 134가지(약 24 %)예요. 셋째 염기의 변이는 영향이 작은 경우가 많아요.</li><li><b>돌연변이 분류</b>: GAA → GAG (Glu → Glu) 침묵, GAA → GUA (Glu → Val) 과오, UGG → UGA (Trp → 종결) 넌센스.</li></ul>',
      missions: [
        {
          id: 'analyze', title: '보편성 실험 해석과 동의 비율 비교', manual: true,
          goal: '<b>보편성 실험</b>을 해석하고, <b>셋째 염기 치환</b>의 동의 비율을 읽고, 돌연변이 3개를 분류하세요.',
          hint: '🌍 보편성 화면에서 [같은 mRNA 넣기]를 하고 해석을 골라요. 🔢 셋째 염기 화면에서 막대 두 개를 보고 비율을 고르고, 코돈표로 아미노산이 어떻게 바뀌는지 보고 침묵 · 과오 · 넌센스를 골라요.',
          setup() { setMode('univ'); },
          check() {
            const sel = (id) => $('#' + id).value;
            if (!UN.done) return '먼저 🌍 보편성 화면에서 [같은 mRNA 넣기]를 해 보세요.';
            if (!sel('unA')) { return '두 추출액이 같은 펩타이드를 만든 것을 해석해서 선택해 주세요.'; }
            if (sel('unA') !== 'same') { $('#unA').classList.add('bad'); return '두 추출액이 같은 펩타이드를 만들었어요. 서로 다른 부호라면 같은 펩타이드가 나올 수 없어요.'; }
            if (!SYN.seen) return '🔢 셋째 염기 화면의 막대 두 개를 살펴보세요.';
            if (!sel('synB')) return '셋째 염기 치환에서 같은 아미노산이 되는 비율(약)을 골라 주세요.';
            if (sel('synB') !== '69') { $('#synB').classList.add('bad'); return '막대의 초록색 부분을 읽어요. 셋째 염기만 바꾼 183가지 중 126가지가 같은 아미노산이에요.'; }
            const miss = SYN.sel.filter((x) => !x).length; if (miss) return '돌연변이 3개를 모두 분류해 주세요. (' + miss + '개 남음)';
            const wr = SYN.sel.map((x, i) => (x !== MUT_ANS[i] ? i : -1)).filter((i) => i >= 0);
            [0, 1, 2].forEach((k) => $('#synC' + k).classList.toggle('bad', wr.indexOf(k) >= 0));
            if (wr.length) return MUTS[wr[0]][0] + ' → ' + MUTS[wr[0]][1] + ' 은(는) 아미노산이 어떻게 바뀌나요? 같으면 침묵, 다른 아미노산이면 과오, 종결 코돈이 생기면 넌센스예요.';
            return true;
          },
          explain: '사람과 대장균 추출액이 같은 mRNA에서 같은 펩타이드를 만든 것은 두 생물이 <b>같은 유전 부호</b>를 쓴다는 뜻이에요(보편성). 셋째 염기 치환은 183가지 중 126가지(약 69 %)가 같은 아미노산이지만 모든 위치로 보면 549가지 중 134가지(약 24 %)뿐이에요. GAA → GAG는 Glu → Glu로 <b>침묵</b>, GAA → GUA는 Glu → Val로 <b>과오</b>, UGG → UGA는 Trp → 종결로 <b>넌센스</b>예요.',
        },
        {
          type: 'quiz', title: '셋째 염기 변이가 덜 해로운 까닭',
          goal: '셋째 염기가 바뀌는 돌연변이가 형질을 덜 바꾸는 경우가 많은 까닭은?',
          setup() { setMode('syn'); },
          choices: ['셋째 염기가 바뀌어도 같은 아미노산을 지정하는 코돈이 많기 때문이다', '셋째 염기는 번역되지 않고 버려지기 때문이다', '셋째 염기가 바뀌면 항상 종결 코돈이 되기 때문이다', '셋째 염기는 DNA 복제 때 돌연변이가 생기지 않기 때문이다'],
          answer: 0,
          feedback: ['', '셋째 염기도 번역돼요. 다만 셋째 염기가 바뀌어도 같은 아미노산인 경우가 많을 뿐이에요.', '종결 코돈이 되는 경우는 드물어요. 대부분은 같은 아미노산 또는 다른 아미노산이에요.', '복제 오류는 어떤 염기에서나 일어날 수 있어요.'],
          explain: '코돈표에서 같은 아미노산을 지정하는 코돈들은 첫째 · 둘째 염기가 같고 셋째 염기만 다른 경우가 많아요. 그래서 셋째 염기가 바뀌어도 아미노산이 그대로인 침묵 돌연변이가 많아요(183가지 중 126가지).',
        },
        {
          type: 'quiz', title: '부호가 거의 모든 생물에서 같다는 사실',
          goal: '유전 부호가 거의 모든 생물에서 같다는 사실이 알려 주는 것으로 알맞은 것은?',
          setup() { setMode('univ'); },
          choices: ['모든 생물이 공통 조상에서 유래했고, 한 생물의 유전자를 다른 생물에서 발현시킬 수 있다', '모든 생물의 유전자가 서로 같다', '모든 생물이 같은 단백질을 만든다', '유전 부호는 생물마다 우연히 같아졌다'],
          answer: 0,
          feedback: ['', '부호(코돈 → 아미노산 규칙)가 같을 뿐이에요. 유전자의 염기 서열은 생물마다 달라요.', '같은 규칙으로 읽어도 서로 다른 유전자는 서로 다른 단백질을 만들어요.', '우연이라고 보기에는 64개 코돈이 대부분 일치해요. 공통 조상에서 물려받았다고 설명해요.'],
          explain: '64개 코돈의 뜻이 거의 모든 생물에서 같다는 것은 <b>공통 조상</b>에서 부호가 물려졌다는 증거예요. 또 사람의 인슐린 유전자를 대장균이 사람의 인슐린 서열 그대로 읽어 만들 수 있는 근거이기도 해요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hg-genetic-code', mount: '#game', badge: '유전 부호 해독가', homeHref: '../../index.html#hg',
    featureLabels: { nir: '🧪 부호 규명', fill: '📝 코돈표 빈칸', table: '🔤 64칸 코돈표', decode: '🔎 해독 연습', univ: '🌍 보편성', syn: '🔢 셋째 염기' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 읽음 칸 ---------- */
  function readouts() {
    const m = S.mode;
    if (m === 'nir') {
      const k = NIR_KINDS[N.kind];
      setReads(['넣은 mRNA', k.txt, '시험관', '20개 (표지 1종씩)', '결과', N.shown && !N.run ? NIR_KINDS[N.shown].res.map((a) => AA3[a]).join(' + ') + ' 시험관 ○' : N.run ? '실험 중' : '아직']);
    } else if (m === 'fill') {
      const ok = Object.keys(FILL_ANS).filter((c) => TB.fillSel[c] === FILL_ANS[c]).length;
      setReads(['알려진 코돈', 'UCU = Ser', '채운 칸', Object.keys(FILL_ANS).filter((c) => TB.fillSel[c]).length + ' / 5', 'UCUCUC… 실험', N.done.UC ? '했어요' : '아직']);
    } else if (m === 'table') {
      const c = TB.sel;
      setReads(['선택한 코돈', c ? P5 + '-' + c + '-' + P3 : '—', '아미노산', c ? (codonAA(c) === '*' ? '종결' : AA3[codonAA(c)]) : '—', '그 아미노산의 코돈 수', c ? CODON_COUNT[codonAA(c)] + '개' : '—']);
    } else if (m === 'decode') {
      setReads(['문제', (DC.p + 1) + ' / 3', '푼 문제', DC.solved.filter(Boolean).length + ' / 3', '코돈표', DC.ref ? '펼침' : '접음']);
    } else if (m === 'univ') {
      setReads(['사람 세포 추출액', UN.done ? 'Met–Trp–Lys–Gly' : '—', '대장균 추출액', UN.done ? 'Met–Trp–Lys–Gly' : '—', '결과', UN.done ? '같은 펩타이드' : '아직']);
    } else {
      setReads(['셋째 염기 치환', '126 / 183 (약 69 %)', '모든 위치 치환', '134 / 549 (약 24 %)', '분류한 돌연변이', SYN.sel.filter(Boolean).length + ' / 3']);
    }
  }

  /* ---------- 시작 ---------- */
  setMode('nir');
  let lastFree = false, lastLv = -1;
  SciSim.loop((dt, t) => {
    clock = t; S.t = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (game && game.level !== lastLv) { lastLv = game.level; updateCtl(); }
    view.apply(); ctx.clearRect(0, 0, VW, VH);
    bgFill('#eef4f2', '#e3ece8');
    switch (S.mode) {
      case 'nir': nirDraw(dt, t); break;
      case 'fill': fillScene(dt, t); break;
      case 'table': if (TB.view === 'bars') barsScene(dt, t); else tableScene(dt, t); break;
      case 'decode': decodeScene(dt, t); break;
      case 'univ': univScene(dt, t); break;
      case 'syn': synScene(dt, t); break;
    }
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(241,246,243,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, PHONE, get game() { return game; }, levels, setMode, updateCtl, N, NIR_KINDS, TB, ASK, DC, PROB, UN, SYN, MUTS, FILL_ANS, nirPick, nirRun, dcPick, dcSet, dcCheck, dcClear, unRun, codonAA, CODON_COUNT, codonsOf, drawTable,
  };
})();
