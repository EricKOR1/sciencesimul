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
     고등학교 생물의 유전 · Ⅱ. 유전자의 발현 - 젖당 오페론 (단원 60, 3차시)
     성취기준 [12유전02-03] 원핵생물과 진핵생물의 유전자 발현 조절 과정을 비교하기 위한 설명 자료를 다양한 매체를 활용하여 제작할 수 있다. (원핵생물의 전사 조절)
     ① 모형: 오페론 구조  ② 실험: 젖당 없을 때  ③ 실험: 젖당 있을 때  ④ 탐구: 돌연변이
     (효소 활성 · 시간은 교육용 예시 값이에요)
     ========================================================= */
  const S = { mode: 'struct', fade: 0, t: 0 };
  let game = null;
  const ctlNodes = $$('#ctrlCard .control');
  const SEGCOL = { I: '#8b5cf6', P: '#0ea5e9', O: '#ef4444', Z: '#16a34a', Y: '#f59e0b', A: '#14b8a6' };
  const SEGKEYS = ['I', 'gap', 'P', 'O', 'Z', 'Y', 'A'];
  const SEGNAME = { I: 'lacI', P: 'P', O: 'O', Z: 'lacZ', Y: 'lacY', A: 'lacA' };
  /* 균주 정의: I 억제자 만듦 / indB 억제자가 유도자와 결합 / Oc 작동 부위 정상 / Pok 프로모터 정상 / Zok 효소 유전자 정상 */
  const STRAINS = {
    wt: { name: '야생형', short: '야생형', I: true, indB: true, O: true, P: true, Z: true, defect: null },
    Im: { name: 'lacI⁻', short: 'lacI⁻', I: false, indB: true, O: true, P: true, Z: true, defect: 'I', why: '억제자를 만들지 못해요 (억제자 결함)' },
    Oc: { name: 'lacOᶜ', short: 'lacOᶜ', I: true, indB: true, O: false, P: true, Z: true, defect: 'O', why: '억제자가 붙을 자리가 변해 억제자가 결합하지 못해요' },
    Is: { name: 'lacIˢ', short: 'lacIˢ', I: true, indB: false, O: true, P: true, Z: true, defect: 'I', why: '억제자가 유도자와 결합하지 못해 항상 작동 부위에 붙어 있어요' },
    Zm: { name: 'lacZ⁻', short: 'lacZ⁻', I: true, indB: true, O: true, P: true, Z: false, defect: 'Z', why: '효소(β-갈락토시데이스) 유전자가 망가졌어요' },
    Pm: { name: 'P⁻', short: 'P⁻', I: true, indB: true, O: true, P: false, Z: true, defect: 'P', why: 'RNA 중합 효소가 프로모터에 붙지 못해요' },
  };
  const STR_KEYS = ['wt', 'Im', 'Oc', 'Is', 'Zm', 'Pm'];
  /* 안정 상태의 결과 (예시 값): 억제자가 작동 부위에 붙어 있는가 / 전사 되는가 / 효소 활성 */
  function steady(key, lac) {
    const st = STRAINS[key];
    const bound = st.I && st.O && !(lac && st.indB);
    const trans = st.P && !bound;
    const act = !st.Z ? 0 : (trans ? 1000 : 1);
    return { bound, trans, act };
  }
  const isHigh = (act) => act >= 100;
  /* ----- 시간에 따른 변화 (젖당 첨가 실험) ----- */
  const KD = 3, TAU_M = 1.5, TAU_E = 6, KC = 6, KM = 5, T_MAX = 60;
  const LAC = { t: 0, L: 0, L0: 0, m: 0.001, x: 0.001, running: false, added: false, hist: [], tM50: null, tA100: null, tA500: null, exhaust: null, speed: 2, amount: 50, maxAct: 1, attempt: 0 };
  const actOf = (x) => 1 + 999 * x;
  function lacReset() {
    Object.assign(LAC, { t: 0, L: 0, L0: 0, m: 0.001, x: 0.001, running: false, added: false, hist: [], tM50: null, tA100: null, tA500: null, exhaust: null, maxAct: 1, attempt: 0 });
    LAC.hist.push({ t: 0, L: 0, m: 0.001, a: 1 });
    updateCtl();
  }
  function lacAdd() { if (LAC.added) return; LAC.added = true; LAC.running = true; LAC.L = LAC.L0 = LAC.amount; Sound.click(); updateCtl(); }
  function lacOcc() { const a = LAC.L / (LAC.L + KD); return 1 / (1 + Math.pow(a / 0.25, 2)); }
  function lacStep(dt) {
    if (!LAC.running) return;
    const h = 0.05, n = Math.max(1, Math.round(dt * LAC.speed / h));
    for (let i = 0; i < n; i++) {
      const occ = lacOcc(), u = 0.001 + 0.999 * (1 - occ);
      LAC.m += h * (u - LAC.m) / TAU_M; LAC.x += h * (LAC.m - LAC.x) / TAU_E;
      LAC.L = Math.max(0, LAC.L - h * KC * LAC.x * LAC.L / (KM + LAC.L));
      LAC.t += h;
      const act = actOf(LAC.x);
      if (act > LAC.maxAct) LAC.maxAct = act;
      if (LAC.added && LAC.tM50 == null && LAC.m >= 0.5) LAC.tM50 = LAC.t;
      if (LAC.tA100 == null && act >= 100) LAC.tA100 = LAC.t;
      if (LAC.tA500 == null && act >= 500) LAC.tA500 = LAC.t;
      if (LAC.exhaust == null && LAC.L < 0.5 && LAC.L0 > 0) { LAC.exhaust = LAC.t; Sound.tick(); }
      if (Math.abs(LAC.t * 4 - Math.round(LAC.t * 4)) < h * 2 && (!LAC.hist.length || LAC.t - LAC.hist[LAC.hist.length - 1].t >= 0.24)) LAC.hist.push({ t: LAC.t, L: LAC.L, m: LAC.m, a: act });
      if (LAC.t >= T_MAX) { LAC.running = false; break; }
    }
  }

  /* =========================================================
     오페론 그림 (조절 유전자 · P · O · lacZ · lacY · lacA)
     ========================================================= */
  const OPW = PHONE ? [64, 22, 40, 34, 100, 86, 74] : [100, 36, 62, 52, 150, 130, 110];
  function opLayout(x0, W) {
    const sum = OPW.reduce((a, b) => a + b, 0), s = W / sum; let x = x0; const out = {};
    SEGKEYS.forEach((k, i) => { out[k] = { x, w: OPW[i] * s }; x += OPW[i] * s; });
    return out;
  }
  const OPR = { bind: 0, morph: 0, ph: 0, rnapX: 0, ent: 0, hist: [] };
  /* 상태 st: {strain, occ(0~1), a(0~1, 유도자 양), u(전사 수준 0~1), m(mRNA 0~1), x(효소 0~1), label(true면 이름표), attempt(전사 시도 0~1 진행, -1이면 없음)} */
  function drawOperon(ox, oy, W, st, dt, t) {
    const L = opLayout(ox, W), sk = STRAINS[st.strain || 'wt'], hh = 30, ly = oy;
    // DNA 줄
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(ox - 8, ly); ctx.lineTo(L.I.x + L.I.w + 6, ly); ctx.stroke();
    ctx.setLineDash([2, 8]); ctx.beginPath(); ctx.moveTo(L.I.x + L.I.w + 6, ly); ctx.lineTo(L.P.x - 2, ly); ctx.stroke(); ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(L.P.x - 2, ly); ctx.lineTo(ox + W + 8, ly); ctx.stroke();
    // 오페론 묶음 표시
    const bx0 = L.P.x - 3, bx1 = L.A.x + L.A.w + 3;
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 2; ctx.setLineDash([6, 4]); D.roundRect(bx0, ly - hh / 2 - 8, bx1 - bx0, hh + 16, 10); ctx.stroke(); ctx.setLineDash([]);
    T((bx0 + bx1) / 2, ly + hh / 2 + 26, st.opName || '젖당 오페론', 13, '#475569', 'center', 800);
    // 구간 상자
    ['I', 'P', 'O', 'Z', 'Y', 'A'].forEach((k) => {
      const r = L[k]; let col = SEGCOL[k], bad = false;
      const alt = st.strain === 'Is' && k === 'I';
      if (st.strain && sk.defect === k && !alt) bad = true;
      D.shadow(() => { D.roundRect(r.x, ly - hh / 2, r.w, hh, 6); ctx.fillStyle = bad ? '#e5e7eb' : C.mix('#ffffff', col, 0.78); ctx.fill(); }, { blur: 4, y: 2 });
      ctx.strokeStyle = bad ? '#e2464b' : alt ? '#f59e0b' : C.shade(col, -0.2); ctx.lineWidth = bad || alt ? 3 : 2; if (alt) ctx.setLineDash([5, 3]); D.roundRect(r.x, ly - hh / 2, r.w, hh, 6); ctx.stroke(); ctx.setLineDash([]);
      let nm = (st.nameMap && st.nameMap[k]) || SEGNAME[k];
      if (st.strain === 'Im' && k === 'I') nm = 'lacI⁻'; if (st.strain === 'Is' && k === 'I') nm = 'lacIˢ'; if (st.strain === 'Oc' && k === 'O') nm = 'Oᶜ'; if (st.strain === 'Zm' && k === 'Z') nm = 'lacZ⁻'; if (st.strain === 'Pm' && k === 'P') nm = 'P⁻';
      const hn = typeof st.hideNames === 'function' ? st.hideNames(k) : st.hideNames;
      if (!hn) T(r.x + r.w / 2, ly + 5, nm, r.w < 44 ? 13 : 14, bad ? '#b91c1c' : '#fff', 'center', 800, bad ? {} : { stroke: C.shade(col, -0.3), strokeWidth: 3 });
      if (bad) { ctx.strokeStyle = '#e2464b'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(r.x + 6, ly - hh / 2 + 4); ctx.lineTo(r.x + r.w - 6, ly + hh / 2 - 4); ctx.moveTo(r.x + r.w - 6, ly - hh / 2 + 4); ctx.lineTo(r.x + 6, ly + hh / 2 - 4); ctx.stroke(); }
    });
    // 억제자
    const bound = st.occ > 0.5, tgt = bound ? 1 : 0;
    OPR.bind = approach(OPR.bind, tgt, dt, 4.5);
    OPR.morph = approach(OPR.morph, st.corep != null ? (st.corep ? 0 : 1) : (st.a > 0.35 && sk.indB ? 1 : 0), dt, 5);
    const Ocx = L.O.x + L.O.w / 2;
    if (sk.I) {
      const fx = L.I.x + L.I.w * 0.5 + Math.sin(t * 0.9) * 10, fy = ly - 92 + Math.sin(t * 1.3) * 5;
      const rx = lerp(fx, Ocx, ease.inOutCubic(OPR.bind)), ry = lerp(fy, ly - hh / 2 - 17, ease.inOutCubic(OPR.bind));
      drawRepressor(rx, ry, OPR.morph, sk.name === 'lacIˢ', t);
      OPR.rx = rx; OPR.ry = ry;
      // lacI에서 억제자가 만들어져 나오는 점선
      if (!st.noMake) { ctx.strokeStyle = 'rgba(139,92,246,.45)'; ctx.lineWidth = 2; ctx.setLineDash([3, 5]); ctx.beginPath(); ctx.moveTo(L.I.x + L.I.w / 2, ly - hh / 2); ctx.quadraticCurveTo(L.I.x + L.I.w / 2, ly - 60, rx - 14, ry + 8); ctx.stroke(); ctx.setLineDash([]); }
    } else {
      T(L.I.x + L.I.w / 2, ly - 54, '억제자 없음', 13, '#b91c1c', 'center', 800);
    }
    if (st.corep && sk.I) { for (let k = 0; k < 2; k++) D.sphere(OPR.rx + (k ? 22 : -22), OPR.ry + (k ? -6 : 6), 6.5, '#f472b6', { gloss: true }); if (st.label !== false) T(OPR.rx + 36, OPR.ry - 22, '트립토판', 13, '#be185d', 'left', 800); }
    // 유도자(알로락토스)
    if (st.a > 0.2 && sk.I) {
      for (let k = 0; k < 2; k++) {
        const bx = OPR.rx + (k ? 20 : -20), by = OPR.ry + (k ? -8 : 8) - 4;
        const far = !sk.indB ? 1 : 0;
        const ax = sk.indB ? bx : bx + (k ? 38 : -38) + Math.sin(t * 3 + k) * 6, ay = sk.indB ? by : by - 20 + Math.cos(t * 3 + k) * 6;
        D.sphere(ax, ay, 6.5, '#fbbf24', { gloss: true });
      }
      if (st.label !== false) T(OPR.rx + 36, OPR.ry - 22, '알로락토스', 13, '#b45309', 'left', 800);
    }
    // RNA 중합 효소
    const act = st.u > 0.2 && sk.P;
    const ry0 = ly + hh / 2 + 15;
    let px = L.P.x + L.P.w / 2, py = ry0 - 2, alpha = 1;
    if (st.attempt != null && st.attempt >= 0) {
      const f = st.attempt;
      const stop = L.O.x - 14;
      const mx = f < 0.5 ? lerp(L.P.x + L.P.w * 0.4, stop, ease.inOutCubic(f / 0.5)) : lerp(stop, L.P.x + L.P.w * 0.4, ease.inOutCubic((f - 0.5) / 0.5));
      px = mx; if (f > 0.42 && f < 0.6) { px += Math.sin(t * 40) * 3; }
    } else if (act && sk.P) {
      OPR.ph = (OPR.ph + dt * 0.33) % 1;
      const xs = L.P.x + L.P.w * 0.4, xe = L.A.x + L.A.w;
      px = lerp(xs, xe, OPR.ph); alpha = OPR.ph > 0.96 ? (1 - OPR.ph) * 25 : 1;
    } else if (sk.P) {
      px = L.P.x + L.P.w * 0.45 + Math.sin(t * 8) * (st.bump ? 2 : 0.6);
    }
    if (sk.P || st.attempt != null) {
      ctx.save(); ctx.globalAlpha = alpha;
      D.sphere(px, py + 4, 17, '#4ade80', { shadow: true, outline: '#16a34a' });
      ctx.restore();
      if (st.label !== false && !act) T(px, py + 34, 'RNA 중합 효소', 13, '#15803d', 'center', 800);
    } else {
      T(L.P.x + L.P.w / 2, ry0 + 20, '결합 못함', 13, '#b91c1c', 'center', 800);
    }
    if (bound && !act && sk.P) {
      T(Ocx + 48, ly - hh / 2 - 22, '✕ 전사 막힘', 13.5, '#e2464b', 'left', 800, { stroke: '#fff', strokeWidth: 4 });
    }
    // mRNA (한 가닥에 세 유전자)
    const mm = clamp(st.m, 0, 1);
    if (mm > 0.02 && sk.P) {
      const y = ly + hh / 2 + 36, x0 = L.Z.x + 2, x1 = L.A.x + L.A.w;
      ctx.strokeStyle = C.rgba('#7c3aed', 0.25 + 0.75 * mm); ctx.lineWidth = 3 + 3 * mm; ctx.lineCap = 'round'; ctx.beginPath();
      for (let x = x0; x <= x1; x += 4) { const yy = y + Math.sin((x - x0) / 8 + t * 2) * 2.5; if (x === x0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy); } ctx.stroke();
      if (st.label !== false && mm > 0.3) T((x0 + x1) / 2, y + 22, st.mrnaLabel || '한 가닥의 mRNA (lacZ · lacY · lacA)', 13, '#6d28d9', 'center', 800);
      // 리보솜
      ['Z', 'Y', 'A'].forEach((k) => { const r = L[k]; ribo(r.x + r.w * 0.55, y - 2, 0.3, { alpha: Math.min(1, mm * 1.4) }); });
    }
    // 효소 아이콘
    const nE = Math.round(clamp(st.x, 0, 1) * 8);
    if (st.showEnz !== false) {
      const ey = ly + hh / 2 + (st.label === false ? 70 : 78);
      for (let k = 0; k < nE; k++) {
        const ex = L.Z.x + 14 + k * ((L.A.x + L.A.w - L.Z.x - 28) / 7), eyy = ey + Math.sin(t * 2 + k) * 2;
        const dead = !sk.Z;
        ctx.save(); ctx.globalAlpha = dead ? 0.35 : 1;
        [[-4, -4], [4, -4], [-4, 4], [4, 4]].forEach((o2) => D.sphere(ex + o2[0], eyy + o2[1], 4.5, dead ? '#9ca3af' : '#16a34a', { gloss: false }));
        ctx.restore();
      }
      if (nE > 0 && st.label !== false) T((L.Z.x + L.A.x + L.A.w) / 2, ey + 24, (sk.Z ? (st.enzLabel || 'β-갈락토시데이스 (젖당 → 포도당 + 갈락토스)') : '작동하지 않는 효소'), 13, sk.Z ? '#166534' : '#6b7280', 'center', 800);
    }
    return L;
  }
  /* 억제자 단백질: 보라색 이량체. morph=1이면 유도자와 결합해 모양이 바뀌어요 */
  function drawRepressor(x, y, morph, superR, t) {
    ctx.save(); ctx.translate(x, y);
    const open = morph;
    D.shadow(() => {
      ctx.beginPath(); ctx.ellipse(-11, 0, 13, 17 - open * 3, -0.15 - open * 0.35, 0, TAU); ctx.fillStyle = C.mix('#8b5cf6', '#c4b5fd', open * 0.6); ctx.fill();
      ctx.beginPath(); ctx.ellipse(11, 0, 13, 17 - open * 3, 0.15 + open * 0.35, 0, TAU); ctx.fill();
    }, { blur: 5, y: 2 });
    ctx.strokeStyle = '#5b21b6'; ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.ellipse(-11, 0, 13, 17 - open * 3, -0.15 - open * 0.35, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.ellipse(11, 0, 13, 17 - open * 3, 0.15 + open * 0.35, 0, TAU); ctx.stroke();
    // DNA에 닿는 홈
    ctx.fillStyle = C.mix('#5b21b6', '#e9d5ff', open); ctx.beginPath(); ctx.moveTo(-5, 12); ctx.lineTo(5, 12); ctx.lineTo(0, 20 - open * 6); ctx.closePath(); ctx.fill();
    T(0, -24, '억제자', 13, '#5b21b6', 'center', 800);
    ctx.restore();
  }
  /* 세포 · 배지 띠 (포도당, 젖당 분자) */
  function drawMedium(x, y, w, h, L, glucose, t, showLac) {
    D.roundRect(x, y, w, h, 16); ctx.fillStyle = '#e8f5ff'; ctx.fill(); ctx.strokeStyle = '#7cc4ff'; ctx.lineWidth = 2; ctx.stroke();
    T(x + 12, y + 20, '배지', 13.5, '#2563eb', 'left', 800);
    // 대장균
    const bx = x + w * 0.5, by = y + h / 2 + 4, bw = w * 0.34, bh = h * 0.58;
    D.shadow(() => { D.roundRect(bx - bw / 2, by - bh / 2, bw, bh, bh / 2); ctx.fillStyle = '#d9f2c4'; ctx.fill(); }, { blur: 5, y: 2 });
    ctx.strokeStyle = '#6aa84f'; ctx.lineWidth = 3; D.roundRect(bx - bw / 2, by - bh / 2, bw, bh, bh / 2); ctx.stroke();
    T(bx, by + 5, '대장균', 14, '#3f7f23', 'center', 800);
    // 분자
    const r = mulberry(5);
    const nG = glucose ? 7 : 0, nL = Math.round(clamp(L / 100, 0, 1) * 9) + (L > 0.5 ? 1 : 0);
    for (let i = 0; i < nG; i++) { const px = x + 30 + r() * (w - 60), py = y + 24 + r() * (h - 40), ox2 = Math.sin(t * 0.8 + i) * 4, oy2 = Math.cos(t * 0.7 + i) * 3; if (Math.abs(px - bx) < bw / 2 + 10 && Math.abs(py - by) < bh / 2 + 6) continue; D.sphere(px + ox2, py + oy2, 6, '#fb923c', { gloss: false, outline: '#c2410c', outlineWidth: 1 }); }
    for (let i = 0; i < nL; i++) { const px = x + 30 + r() * (w - 60), py = y + 24 + r() * (h - 40), ox2 = Math.sin(t * 0.9 + i * 2) * 4, oy2 = Math.cos(t * 0.6 + i) * 3; if (Math.abs(px - bx) < bw / 2 + 14 && Math.abs(py - by) < bh / 2 + 8) continue; D.sphere(px + ox2 - 5, py + oy2, 5.5, '#4ade80', { gloss: false }); D.sphere(px + ox2 + 5, py + oy2, 5.5, '#fb923c', { gloss: false }); }
    if (glucose) { D.sphere(x + w - 150, y + 18, 5, '#fb923c', { gloss: false }); T(x + w - 140, y + 23, '포도당', 13, '#9a3412', 'left', 800); }
    if (showLac || L > 0.5) { D.sphere(x + w - 76, y + 18, 4.5, '#4ade80', { gloss: false }); D.sphere(x + w - 67, y + 18, 4.5, '#fb923c', { gloss: false }); T(x + w - 57, y + 23, '젖당', 13, '#166534', 'left', 800); }
  }

  /* =========================================================
     ① 오페론 구조: 이름표 붙이기 · 기능 연결
     ========================================================= */
  const SEGINFO = [
    { k: 'I', n: '①', desc: '조절 유전자: 오페론과 따로 떨어져 있고, 여기서 억제자 단백질이 항상 조금씩 만들어져요.' },
    { k: 'P', n: '②', desc: '프로모터: RNA 중합 효소가 달라붙어 전사를 시작하는 곳이에요.' },
    { k: 'O', n: '③', desc: '작동 부위: 억제자 단백질이 달라붙을 수 있는 곳이에요. 프로모터와 구조 유전자 사이에 있어요.' },
    { k: 'Z', n: '④', desc: 'lacZ: β-갈락토시데이스를 만들 정보예요. 젖당을 포도당과 갈락토스로 분해해요.' },
    { k: 'Y', n: '⑤', desc: 'lacY: 젖당을 세포 안으로 들여오는 수송 단백질(퍼미에이스)의 정보예요.' },
    { k: 'A', n: '⑥', desc: 'lacA: 아세틸기를 옮기는 효소(트랜스아세틸레이스)의 정보예요.' },
  ];
  const ST = { phase: 1, seg: -1, demo: false, demoT: 0, s1: null, s2: null, bad: false };
  const TAGS = [['A', 'lacA 유전자'], ['I', '조절 유전자 (lacI)'], ['Z', 'lacZ 유전자'], ['O', '작동 부위 (O)'], ['Y', 'lacY 유전자'], ['P', '프로모터 (P)']];
  const FUNCS = [['cG', '효소의 정보 (젖당 분해 · 수송)', 'fG'], ['cO', '억제자가 결합하는 곳', 'fO'], ['cI', '억제자 단백질을 만들어요', 'fI'], ['cP', 'RNA 중합 효소가 결합하는 곳', 'fP']];
  function stGrid() {
    return PHONE ? { bx: 8, bw: 224, bh: 56, by: 310, cols: 2, gapX: 8, gapY: 6, tx: 8, tw: 224, th: 36, ty: 498, tcols: 2 } : { bx: 16, bw: 249, bh: 60, by: 300, cols: 3, gapX: 10, gapY: 8, tx: 16, tw: 249, th: 44, ty: 446, tcols: 3 };
  }
  function stBuild() {
    const g = stGrid();
    // 1단계: 6개 이름표
    const boxes1 = SEGINFO.map((s, i) => ({ id: 'b' + s.k, label: s.n + ' 자리', col: SEGCOL[s.k], x: g.bx + (i % g.cols) * (g.bw + g.gapX), y: g.by + Math.floor(i / g.cols) * (g.bh + g.gapY), w: g.bw, h: g.bh, cols: 1, hdr: 24 }));
    const cards1 = TAGS.map((t) => ({ id: t[0], label: t[1], col: SEGCOL[t[0]] }));
    ST.s1 = selectable({ cards: cards1, boxes: boxes1, cw: g.tw, ch: g.th, kh: 30, tray: (i) => ({ x: g.tx + (i % g.tcols) * (g.tw + g.gapX), y: g.ty + Math.floor(i / g.tcols) * (g.th + 8) }), onChange() { ST.bad = false; updateCtl(); } });
    // 2단계: 4개 기능 카드
    const names = [['fI', '① 조절 유전자', SEGCOL.I], ['fP', '② 프로모터', SEGCOL.P], ['fO', '③ 작동 부위', SEGCOL.O], ['fG', '④⑤⑥ lacZ · lacY · lacA', SEGCOL.Z]];
    const c2 = PHONE ? 1 : 2, w2 = PHONE ? 464 : 380, h2 = PHONE ? 56 : 66;
    const boxes2 = names.map((n, i) => ({ id: n[0], label: n[1], col: n[2], x: 8 + (i % c2) * (w2 + 8), y: 74 + Math.floor(i / c2) * (h2 + 8), w: w2, h: h2, cols: 1, hdr: 24 }));
    const cards2 = FUNCS.map((f) => ({ id: f[0], label: f[1], col: '#0ea5e9' }));
    const ty2 = PHONE ? 74 + 4 * (h2 + 8) + 28 : 74 + 2 * (h2 + 8) + 38;
    ST.s2 = selectable({ cards: cards2, boxes: boxes2, cw: PHONE ? 464 : 380, ch: 40, kh: 28, tray: (i) => ({ x: 8 + (i % c2) * (w2 + 8), y: ty2 + Math.floor(i / c2) * 48 }), onChange() { ST.bad = false; updateCtl(); } });
  }
  const stWrong1 = () => ST.s1.cards.filter((c) => c.zone && c.zone !== 'b' + c.id);
  const stWrong2 = () => { const m = { cG: 'fG', cO: 'fO', cI: 'fI', cP: 'fP' }; return ST.s2.cards.filter((c) => c.zone && c.zone !== m[c.id]); };
  function stDemo() { if (ST.demo) return; ST.demo = true; ST.demoT = 0; Sound.click(); updateCtl(); }
  const structPT = {
    down(p) {
      const so = ST.phase === 1 ? ST.s1 : ST.s2;
      if (ST.phase === 1 && ST.segRects) for (let i = 0; i < ST.segRects.length; i++) { const r = ST.segRects[i]; if (inRect(p.x, p.y, r) && !so.cards.some((c) => inRect(p.x, p.y, c))) { ST.seg = i; Sound.tick(); return false; } }
      if (so.selected && !so.cards.some((c) => inRect(p.x, p.y, c))) { const b = so.boxAt(p), c = so.selected; so.selected = null; so.place(c, b ? b.id : null); return false; }
      return so.down(p);
    },
    move: (p) => (ST.phase === 1 ? ST.s1 : ST.s2).move(p),
    up: (p) => (ST.phase === 1 ? ST.s1 : ST.s2).up(p),
    hover(p) { const so = ST.phase === 1 ? ST.s1 : ST.s2; return so.hover(p) === 'grab' ? 'grab' : (ST.phase === 1 && ST.segRects && ST.segRects.some((r) => inRect(p.x, p.y, r)) ? 'pointer' : 'default'); },
  };
  function structScene(dt, t) {
    if (ST.demo) { ST.demoT += dt; if (ST.demoT > 6.5) { ST.demo = false; updateCtl(); } }
    const so = ST.phase === 1 ? ST.s1 : ST.s2;
    so.update(dt);
    const dm = ST.demo ? ST.demoT : 0;
    const placedOK = (k) => ST.s1.cards.some((c) => c.id === k && c.zone === 'b' + k);
    const oy = PHONE ? 166 : 160, W = VW - (PHONE ? 24 : 60), ox = PHONE ? 12 : 30;
    TF(14, 24, ST.phase === 1 ? '① 이름표 붙이기: 번호 구간에 알맞은 이름표를 끌어 놓거나, 이름표를 누른 뒤 칸을 눌러요' : '② 기능 카드 연결: 구성 요소마다 알맞은 기능을 연결해요', VW - 28, PHONE ? 13.5 : 15.5, 11.5, '#334155', 'left', 800);
    if (ST.phase === 1 && PHONE) { /* 폰: 지도 아래 간격 */ }
    const stt = { strain: 'wt', hideNames: (k) => !placedOK(k), occ: dm > 0 ? 0 : 0, a: 0, u: dm > 0 ? 1 : 0, m: clamp((dm - 0.8) / 2.4, 0, 1), x: clamp((dm - 3.2) / 2.5, 0, 1), label: false, showEnz: dm > 0, noMake: false };
    const Lr = drawOperon(ox, oy, W, stt, dt, t);
    ST.segRects = SEGINFO.map((s) => ({ x: Lr[s.k].x, y: oy - 40, w: Lr[s.k].w, h: 80 }));
    SEGINFO.forEach((s, i) => {
      const cx = Lr[s.k].x + Lr[s.k].w / 2, sel = ST.seg === i;
      D.sphere(cx, oy - 44, 11, SEGCOL[s.k], { text: String(i + 1), textScale: 1.0 });
      if (sel) D.ring(cx, oy - 44, 14, t, { color: '#f59e0b', width: 2.5 });
    });
    if (ST.phase === 1) {
      if (dm > 0) T(VW / 2, oy + (PHONE ? 122 : 122), dm < 3 ? '전사가 일어나면 세 유전자가 한 가닥의 mRNA로 만들어져요' : '한 mRNA에서 세 가지 효소가 만들어져요', PHONE ? 13 : 14.5, '#6d28d9', 'center', 800);
      else {
        const dy = oy + 70, dh = PHONE ? 70 : 62;
        panel(8, dy, VW - 16, dh, 12, '#fffdf0');
        if (ST.seg >= 0) { const s = SEGINFO[ST.seg]; textBlock(20, dy + 24, VW - 40, s.n + ' ' + s.desc, PHONE ? 13 : 14, '#475569', 18, 700); }
        else T(20, dy + 36, '💡 구간(①~⑥)을 눌러 설명을 읽어요  ·  ▶ 전사해 보기를 눌러 보세요.', PHONE ? 13 : 14, '#92400e', 'left', 800);
      }
      so.drawBoxes();
      ST.s1.boxes.forEach((b, i) => D.sphere(b.x + 16, b.y + 13, 9, SEGCOL[SEGINFO[i].k], { text: String(i + 1), textScale: 1 }));
      so.drawCards();
    } else {
      so.drawBoxes(); so.drawCards();
    }
  }

  /* =========================================================
     ② 젖당이 없을 때 (포도당 배지)
     ========================================================= */
  const NL = { att: -1, attT: 0, tried: false, measured: false, g: 0 };
  function nlAttempt() { if (NL.att >= 0) return; NL.att = 0; NL.attT = 0; Sound.click(); }
  function nlMeasure() { NL.measured = true; NL.g = 0; Sound.click(); updateCtl(); }
  function nlReset() { NL.att = -1; NL.attT = 0; NL.tried = false; NL.measured = false; NL.g = 0; updateCtl(); }
  function gaugeBar(x, y, w, label, frac, txt, col, ticks) {
    T(x, y - 8, label, 14.5, '#334155', 'left', 800);
    D.roundRect(x, y, w, 26, 13); ctx.fillStyle = '#e5e7eb'; ctx.fill();
    if (frac > 0.002) { ctx.save(); D.roundRect(x, y, w, 26, 13); ctx.clip(); ctx.fillStyle = col; ctx.fillRect(x, y, w * clamp(frac, 0, 1), 26); ctx.restore(); }
    ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 2; D.roundRect(x, y, w, 26, 13); ctx.stroke();
    if (ticks) ticks.forEach((tk) => { const tx = x + w * tk[0]; ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(tx, y + 26); ctx.lineTo(tx, y + 32); ctx.stroke(); T(tx, y + 46, tk[1], 12.5, '#64748b', 'center', 700); });
    T(x + w + 8, y + 19, txt, 15, '#1f2d44', 'left', 800);
  }
  function nolacScene(dt, t) {
    if (NL.att >= 0) { NL.attT += dt; NL.att = NL.attT / 2.6; if (NL.att >= 1) { NL.att = -1; NL.tried = true; Sound.tick(); updateCtl(); } }
    if (NL.measured) NL.g = approach(NL.g, 1, dt, 3);
    T(14, 28, '포도당 배지 · 젖당 없음', 16.5, '#334155', 'left', 800);
    drawMedium(14, 40, VW - 28, PHONE ? 78 : 72, 0, true, t);
    const oy = PHONE ? 220 : 204, ox = PHONE ? 12 : 30, W = VW - (PHONE ? 24 : 60);
    drawOperon(ox, oy, W, { strain: 'wt', occ: 1, a: 0, u: 0, m: 0, x: 0, attempt: NL.att >= 0 ? NL.att : null, bump: NL.att >= 0.42 && NL.att < 0.6, noMake: false }, dt, t);
    // 측정 게이지
    const gy = PHONE ? 380 : 330, gx = 24, gw = VW - 48 - (PHONE ? 70 : 90);
    if (NL.measured) {
      gaugeBar(gx, gy + 14, gw, 'mRNA 양 (상대, 0 ~ 1)', 0, '0', '#8b5cf6', [[0, '0'], [0.5, '0.5'], [1, '1']]);
      gaugeBar(gx, gy + 100, gw, 'β-갈락토시데이스 활성 (상대값, 로그 눈금)', Math.log10(1) / 3 * NL.g, '1', '#16a34a', [[0, '1'], [1 / 3, '10'], [2 / 3, '100'], [1, '1000']]);
      TF(gx, gy + 170, '→ 억제자가 작동 부위에 붙어 있어 전사가 되지 않아요. 효소 활성은 배경 수준(1)이에요.', VW - 2 * gx, 14.5, 11, '#0d7a4a', 'left', 800);
    } else {
      textBlock(gx, gy + 18, VW - 2 * gx, NL.tried ? '전사 시도 결과를 확인했어요. 이제 [효소 활성 측정]으로 mRNA 양과 효소 활성을 재 보세요.' : '[전사 시도]를 눌러 RNA 중합 효소가 오페론을 지나갈 수 있는지 확인해요. 그 다음 [효소 활성 측정]을 눌러요.', 15, '#475569', 21, 700);
    }
    if (NL.att >= 0.4 && NL.att < 0.62) T(VW / 2, oy - 100, '억제자 때문에 지나가지 못해요!', 15, '#e2464b', 'center', 800, { stroke: '#fff', strokeWidth: 4 });
  }

  /* =========================================================
     ③ 젖당이 있을 때: 유도 · 소진 · 이중 성장
     ========================================================= */
  function drawLacGraph(x, y, w, h) {
    panel(x - 52, y - 22, w + 52 + (PHONE ? 46 : 62), h + 56, 14);
    // 축
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + h); ctx.lineTo(x + w, y + h); ctx.moveTo(x + w, y); ctx.lineTo(x + w, y + h); ctx.stroke();
    const px = (tt) => x + w * tt / T_MAX, py = (frac) => y + h - h * frac;
    for (let k = 0; k <= 6; k++) { const tx = px(k * 10); ctx.strokeStyle = '#eef1f5'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(tx, y); ctx.lineTo(tx, y + h); ctx.stroke(); T(tx, y + h + 16, String(k * 10), 12.5, '#64748b', 'center', 700); }
    T(x + w / 2, y + h + 34, '시간 (분)', 13, '#64748b', 'center', 800);
    [[0, '1'], [1 / 3, '10'], [2 / 3, '100'], [1, '1000']].forEach((tk) => { T(x - 6, py(tk[0]) + 4, tk[1], 12.5, '#15803d', 'right', 800); ctx.strokeStyle = '#eef1f5'; ctx.beginPath(); ctx.moveTo(x, py(tk[0])); ctx.lineTo(x + w, py(tk[0])); ctx.stroke(); });
    [[0, '0'], [0.5, '50'], [1, '100']].forEach((tk) => T(x + w + 6, py(tk[0]) + 4, tk[1] + (tk[0] === 1 ? ' %' : ''), 12.5, '#475569', 'left', 800));
    T(x - 40, y - 8, '효소 활성', 12.5, '#15803d', 'left', 800); T(x + w + 6, y - 8, '상대 %', 12.5, '#475569', 'left', 800);
    const H = LAC.hist;
    const line = (fn, col, lw, dash) => {
      if (H.length < 2) return; ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.lineJoin = 'round'; if (dash) ctx.setLineDash(dash); ctx.beginPath();
      H.forEach((p, i) => { const v = fn(p); if (i) ctx.lineTo(px(p.t), py(v)); else ctx.moveTo(px(p.t), py(v)); }); ctx.stroke(); ctx.restore();
    };
    if (LAC.L0 > 0) line((p) => clamp(p.L / LAC.L0, 0, 1), '#2563eb', 3, [7, 5]);
    line((p) => clamp(p.m, 0, 1), '#f59e0b', 3);
    line((p) => clamp(Math.log10(Math.max(1, p.a)) / 3, 0, 1), '#16a34a', 4.5);
    // 현재 시각 표시선
    if (LAC.added) { ctx.strokeStyle = 'rgba(15,23,42,.25)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(px(LAC.t), y); ctx.lineTo(px(LAC.t), y + h); ctx.stroke(); }
    // 학생이 표시한 시각
    if (LAC.mark > 0) { ctx.strokeStyle = '#7c3aed'; ctx.lineWidth = 2.5; ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.moveTo(px(LAC.mark), y - 6); ctx.lineTo(px(LAC.mark), y + h); ctx.stroke(); ctx.setLineDash([]); pill(px(LAC.mark), y - 12, LAC.mark + '분', { bg: '#7c3aed', color: '#fff', size: 12.5 }); }
    // 범례
    const lx = PHONE ? x + 56 : x + w * 0.46, ly = PHONE ? y - 8 : y + 14;
    [['젖당 양', '#2563eb', true], ['mRNA 양', '#f59e0b'], ['효소 활성(로그)', '#16a34a']].forEach((l, i) => { ctx.strokeStyle = l[1]; ctx.lineWidth = 4; if (l[2]) ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.moveTo(lx + i * (PHONE ? 98 : 132), ly); ctx.lineTo(lx + i * (PHONE ? 98 : 132) + 22, ly); ctx.stroke(); ctx.setLineDash([]); T(lx + i * (PHONE ? 98 : 132) + 28, ly + 4.5, l[0], 12.5, '#334155', 'left', 800); });
  }
  LAC.mark = 0;
  function lacScene(dt, t) {
    lacStep(dt);
    T(14, 26, '포도당 없이 젖당만 있는 배지에 대장균을 키워요', PHONE ? 13.5 : 15.5, '#334155', 'left', 800);
    drawMedium(14, 36, VW - 28, PHONE ? 66 : 62, LAC.L, false, t, true);
    const a = LAC.L / (LAC.L + KD);
    const occ = lacOcc(), u = 0.001 + 0.999 * (1 - occ);
    const oy = PHONE ? 196 : 168, ox = PHONE ? 12 : 30, W = VW - (PHONE ? 24 : 60);
    drawOperon(ox, oy, W, { strain: 'wt', occ, a, u, m: LAC.m, x: LAC.x, label: !PHONE, showEnz: true, noMake: false }, dt, t);
    const gy = PHONE ? 352 : 316, gh = PHONE ? 180 : 168;
    drawLacGraph(PHONE ? 58 : 70, gy, VW - (PHONE ? 58 + 46 : 70 + 62), gh);
    if (!LAC.added) T(VW / 2, gy + gh / 2 + 6, '젖당 양을 정하고 [젖당 넣기]를 누르면 그래프가 그려져요', PHONE ? 13 : 15, '#94a3b8', 'center', 800);
    T(VW - 16, PHONE ? 626 : 550, '지금 ' + fmtN(LAC.t, 1) + '분 · 활성 ' + fmtN(actOf(LAC.x), 0) + ' · 젖당 ' + fmtN(LAC.L, 0), 13.5, '#475569', 'right', 800);
  }

  /* ---------- 포도당 + 젖당 이중 성장 곡선 ---------- */
  const GR = { t: 0, run: false, done: false };
  const odOf = (h) => (h < 2.5 ? 0.05 * Math.exp(0.9 * h) : h < 3.5 ? 0.47 + 0.03 * (h - 2.5) : h < 6.5 ? 0.5 * Math.exp(0.5 * (h - 3.5)) : 0.5 * Math.exp(1.5));
  const glcOf = (h) => clamp(1 - (odOf(Math.min(h, 2.5)) - 0.05) / (odOf(2.5) - 0.05), 0, 1);
  const lacOf = (h) => (h < 3.5 ? 1 : clamp(1 - (odOf(Math.min(h, 6.5)) - odOf(3.5)) / (odOf(6.5) - odOf(3.5)), 0, 1));
  const enzOf = (h) => 1 + 999 * smooth((h - 2.4) / 1.4) * (h < 6.5 ? 1 : clamp(1 - (h - 6.5) / 1.0, 0.3, 1));
  function grRun() { if (GR.run) return; GR.run = true; GR.t = 0; GR.done = false; Sound.click(); updateCtl(); }
  function growthScene(dt, t) {
    if (GR.run) { GR.t += dt * 0.9; if (GR.t >= 7.5) { GR.t = 7.5; GR.run = false; GR.done = true; Sound.success(); updateCtl(); } }
    T(14, 28, '포도당 + 젖당 배지에서 대장균 배양', 16.5, '#334155', 'left', 800);
    const x = PHONE ? 52 : 70, w = VW - x - (PHONE ? 20 : 40), y1 = PHONE ? 84 : 70, h1 = PHONE ? 214 : 210, y2 = y1 + h1 + (PHONE ? 70 : 74), h2 = PHONE ? 130 : 110;
    const px = (hh) => x + w * hh / 7.5;
    // 단계 띠
    [[0, 2.5, '① 포도당 소비', '#fb923c'], [2.5, 3.5, '② 정체기', '#94a3b8'], [3.5, 6.5, '③ 젖당 소비', '#4ade80'], [6.5, 7.5, '', '#cbd5e1']].forEach((b) => {
      ctx.fillStyle = C.rgba(b[3], 0.18); ctx.fillRect(px(b[0]), y1, px(b[1]) - px(b[0]), h1 + (y2 + h2 - y1 - h1));
      if (b[2]) T((px(b[0]) + px(b[1])) / 2, y1 - 8, b[2], PHONE ? 12 : 13.5, C.shade(b[3], -0.4), 'center', 800);
    });
    // OD
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y1); ctx.lineTo(x, y1 + h1); ctx.lineTo(x + w, y1 + h1); ctx.stroke();
    T(x - 6, y1 + 10, '세균 수', 12.5, '#334155', 'right', 800); T(x - 6, y1 + 26, '(상대)', 12.5, '#334155', 'right', 800);
    const maxOD = odOf(7.5);
    ctx.strokeStyle = '#2563eb'; ctx.lineWidth = 4.5; ctx.lineJoin = 'round'; ctx.beginPath();
    for (let hh = 0; hh <= GR.t + 1e-6; hh += 0.05) { const xx = px(hh), yy = y1 + h1 - h1 * odOf(hh) / maxOD * 0.96; if (hh === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy); } ctx.stroke();
    // 효소 활성 (로그)
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y2); ctx.lineTo(x, y2 + h2); ctx.lineTo(x + w, y2 + h2); ctx.stroke();
    T(x - 6, y2 + 12, '효소 활성', 12.5, '#15803d', 'right', 800); T(x - 6, y2 + 28, '(로그)', 12.5, '#15803d', 'right', 800);
    [[0, '1'], [1 / 3, '10'], [2 / 3, '100'], [1, '1000']].forEach((tk) => T(x + w + 4, y2 + h2 - h2 * tk[0] + 4, tk[1], 12, '#15803d', 'left', 700));
    ctx.strokeStyle = '#16a34a'; ctx.lineWidth = 4.5; ctx.beginPath();
    for (let hh = 0; hh <= GR.t + 1e-6; hh += 0.05) { const xx = px(hh), yy = y2 + h2 - h2 * clamp(Math.log10(enzOf(hh)) / 3, 0, 1); if (hh === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy); } ctx.stroke();
    for (let k = 0; k <= 7; k++) T(px(k), y2 + h2 + 17, String(k), 12.5, '#64748b', 'center', 700);
    T(x + w / 2, y2 + h2 + 36, '시간 (시간)', 13, '#64748b', 'center', 800);
    // 당 잔량
    const sy = y1 + h1 + 24;
    [['포도당', glcOf(GR.t), '#fb923c'], ['젖당', lacOf(GR.t), '#4ade80']].forEach((s, i) => {
      const bx = x + i * (w / 2 + 6), bw2 = w / 2 - 12;
      T(bx, sy - 6, s[0] + ' 남은 양', 13, '#475569', 'left', 800);
      D.roundRect(bx, sy, bw2, 16, 8); ctx.fillStyle = '#e5e7eb'; ctx.fill();
      if (s[1] > 0.004) { ctx.save(); D.roundRect(bx, sy, bw2, 16, 8); ctx.clip(); ctx.fillStyle = s[2]; ctx.fillRect(bx, sy, bw2 * s[1], 16); ctx.restore(); }
    });
    const cur = GR.t < 2.5 ? '포도당을 먼저 쓰고 있어요. 젖당 오페론은 거의 꺼져 있어요.' : GR.t < 3.5 ? '포도당이 바닥나 성장이 잠시 멈췄어요. 젖당 오페론이 켜지는 중이에요.' : GR.t < 6.5 ? '젖당 분해 효소가 만들어져 젖당으로 다시 자라요.' : '젖당도 소진되어 성장이 멈췄어요.';
    if (GR.run || GR.done) TF(14, VH - 10, cur, VW - 28, 14.5, 11.5, '#1f2d44', 'left', 800); else T(14, VH - 10, '[▶ 배양 시작]을 눌러 성장 곡선이 그려지는 모습을 봐요', 14.5, '#64748b', 'left', 800);
    if (PHONE) T(14, 46, '포도당이 있으면 젖당 오페론 발현이 낮아져요 (CAP · cAMP)', 12.5, '#64748b', 'left', 700); else T(VW - 14, 28, '포도당이 있으면 젖당이 있어도 발현이 낮아져요 (CAP · cAMP)', 13, '#64748b', 'right', 700);
  }

  /* =========================================================
     ④ 돌연변이 예측 · 실험 · 트립토판 오페론 카드
     ========================================================= */
  const MU = { strain: 'wt', lac: false, anim: -1, key: null, results: {}, bindOcc: 1, m: 0, x: 0, a: 0, preds: {}, lastKey: null, busy: false, queue: [] };
  STR_KEYS.forEach((k) => { MU.results[k] = { no: null, yes: null }; MU.preds[k] = { no: '', yes: '' }; });
  function miniOperon(x, y, w, key) {
    const L = opLayout(x, w), sk = STRAINS[key], h = 22;
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - 2, y); ctx.lineTo(x + w + 2, y); ctx.stroke();
    ['I', 'P', 'O', 'Z', 'Y', 'A'].forEach((k) => {
      const r = L[k], alt = key === 'Is' && k === 'I', bad = sk.defect === k && !alt;
      D.roundRect(r.x, y - h / 2, r.w, h, 5); ctx.fillStyle = bad ? '#e5e7eb' : C.mix('#ffffff', SEGCOL[k], 0.75); ctx.fill();
      ctx.strokeStyle = bad ? '#e2464b' : alt ? '#f59e0b' : C.shade(SEGCOL[k], -0.2); ctx.lineWidth = bad || alt ? 2.5 : 1.5; if (alt) ctx.setLineDash([4, 3]); ctx.stroke(); ctx.setLineDash([]);
      if (bad) { ctx.strokeStyle = '#e2464b'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(r.x + 3, y - h / 2 + 3); ctx.lineTo(r.x + r.w - 3, y + h / 2 - 3); ctx.moveTo(r.x + r.w - 3, y - h / 2 + 3); ctx.lineTo(r.x + 3, y + h / 2 - 3); ctx.stroke(); }
      if (!bad && r.w >= 26) T(r.x + r.w / 2, y + 4.5, alt ? 'Iˢ' : SEGNAME[k].replace('lac', ''), 12, '#fff', 'center', 800, { stroke: C.shade(SEGCOL[k], -0.3), strokeWidth: 3 });
    });
  }
  function tblLayout(top, rowH) {
    const x0 = 10, wN = PHONE ? 86 : 118, wM = PHONE ? 196 : 330, wC = (VW - 20 - wN - wM) / 2;
    return { x0, wN, wM, wC, top, rowH, cx: [x0 + wN + wM, x0 + wN + wM + wC] };
  }
  const levelTxt = (act) => (act >= 100 ? '높음' : '낮음');
  function drawTable2(top, rowH, mode) {
    const g = tblLayout(top, rowH);
    // 머리글
    [['균주', g.x0, g.wN], ['유전자 구조 (✕ 이상)', g.x0 + g.wN, g.wM], ['젖당 없음', g.cx[0], g.wC], ['젖당 있음', g.cx[1], g.wC]].forEach((h) => { D.roundRect(h[1] + 1, top, h[2] - 2, 26, 8); ctx.fillStyle = '#dbeafe'; ctx.fill(); T(h[1] + h[2] / 2, top + 18, h[0], PHONE ? 12.5 : 14, '#1e3a8a', 'center', 800); });
    STR_KEYS.forEach((k, i) => {
      const y = top + 30 + i * rowH, cy = y + rowH / 2 - 2;
      const sel = MU.strain === k && mode === 'mut';
      D.roundRect(g.x0, y, VW - 20, rowH - 4, 10); ctx.fillStyle = sel ? '#fffbe6' : '#fff'; ctx.fill(); ctx.strokeStyle = sel ? '#f59e0b' : '#e2e8f0'; ctx.lineWidth = sel ? 3 : 1.5; ctx.stroke();
      T(g.x0 + 10, cy + 5, STRAINS[k].short, PHONE ? 14 : 16, '#1f2d44', 'left', 800);
      miniOperon(g.x0 + g.wN + 10, cy, g.wM - 20, k);
      ['no', 'yes'].forEach((c, j) => {
        const cx = g.cx[j] + g.wC / 2, lac = j === 1;
        let val = null, txt = '?', col = '#fff', bd = '#cbd5e1', tc = '#94a3b8', sub = '';
        if (mode === 'predict') {
          if (k === 'wt') { const a = steady('wt', lac).act; val = a; txt = levelTxt(a); sub = '(예시) ' + fmtN(a); }
          else { const p = MU.preds[k][c]; if (p) { txt = p === 'hi' ? '높음' : '낮음'; val = p === 'hi' ? 1000 : 1; } }
        } else {
          const r = MU.results[k][c];
          if (r != null) { val = r; txt = levelTxt(r); sub = fmtN(r); }
          const p = MU.preds[k][c];
          if (r != null && k !== 'wt' && p) sub += (p === 'hi') === (r >= 100) ? '  ✓ 예측과 같아요' : '  ✕ 예측과 달라요';
        }
        if (val != null) { const hi = val >= 100; col = hi ? '#dcfce7' : '#f1f5f9'; bd = hi ? '#16a34a' : '#94a3b8'; tc = hi ? '#166534' : '#475569'; if (val === 0 && mode !== 'predict') { col = '#f1f5f9'; } }
        D.roundRect(g.cx[j] + 6, y + 4, g.wC - 12, rowH - 12, 10); ctx.fillStyle = col; ctx.fill(); ctx.strokeStyle = bd; ctx.lineWidth = 2; ctx.stroke();
        T(cx, cy + (sub ? 0 : 6), txt, PHONE ? 14.5 : 16.5, tc, 'center', 800);
        if (sub) TF(cx, cy + 17, sub, g.wC - 16, PHONE ? 11.5 : 12.5, 9.5, mode === 'mut' && sub.indexOf('✕') >= 0 ? '#b91c1c' : '#64748b', 'center', 700);
      });
      if (mode === 'predict') { MU.rowRect = MU.rowRect || {}; }
    });
    if (mode === 'predict') textBlock(14, top + 30 + 6 * rowH + 18, VW - 28, '야생형은 예시예요. 오른쪽(또는 아래) 선택 칸에서 나머지 5종의 효소 활성이 높을지 낮을지 예측해요.', PHONE ? 13 : 14, '#475569', 18, 800);
  }
  function predictScene(dt, t) {
    T(14, 30, '예측: 돌연변이 대장균의 효소 활성 (높음 / 낮음)', PHONE ? 14 : 16.5, '#334155', 'left', 800);
    drawTable2(52, PHONE ? 66 : 62, 'predict');
  }
  function muStart(key, lac) {
    if (MU.anim >= 0) return false;
    MU.strain = key; MU.lac = lac; MU.anim = 0; MU.key = key; Sound.click(); return true;
  }
  function muRunBoth() {
    if (MU.anim >= 0) return;
    muStart(MU.strain, false); MU.queue = [[MU.strain, true]];
    updateCtl();
  }
  function mutScene(dt, t) {
    const key = MU.strain, st = steady(key, MU.lac);
    if (MU.anim >= 0) {
      MU.anim += dt;
      if (MU.anim >= 2.4) {
        MU.results[MU.key][MU.lac ? 'yes' : 'no'] = st.act; MU.anim = -1; Sound.success(); updateCtl();
        if (MU.queue.length) { const q = MU.queue.shift(); MU.strain = q[0]; MU.lac = q[1]; MU.anim = 0; MU.key = q[0]; updateCtl(); }
      }
    }
    // 위쪽 그림: 선택한 균주
    const tgtM = st.trans ? 1 : 0, tgtX = st.trans ? 1 : 0, aT = MU.lac ? 1 : 0;
    MU.m = approach(MU.m, MU.anim >= 0 ? tgtM : 0, dt, 1.6); MU.x = approach(MU.x, MU.anim >= 0 ? tgtX : 0, dt, 1.0); MU.a = approach(MU.a, MU.anim >= 0 || MU.results[key][MU.lac ? 'yes' : 'no'] != null ? aT : 0, dt, 3);
    const occ = STRAINS[key].I && STRAINS[key].O && !(MU.lac && STRAINS[key].indB) ? 1 : 0;
    TF(14, 24, STRAINS[key].name + ' · ' + (MU.lac ? '젖당 있음' : '젖당 없음') + (STRAINS[key].why ? '  —  ' + STRAINS[key].why : ''), VW - 28, PHONE ? 13 : 15, 11, '#334155', 'left', 800);
    const oy = PHONE ? 146 : 138, W = VW - (PHONE ? 24 : 60), ox = PHONE ? 12 : 30;
    drawOperon(ox, oy, W, { strain: key, occ: MU.anim >= 0 || MU.results[key][MU.lac ? 'yes' : 'no'] != null ? occ : (STRAINS[key].I && STRAINS[key].O ? 1 : 0), a: MU.a, u: MU.m, m: MU.m, x: MU.x, label: false, showEnz: true, noMake: !STRAINS[key].I }, dt, t);
    drawTable2(PHONE ? 252 : 244, PHONE ? 56 : 44, 'mut');
  }
  const mutPT = {
    down(p) { const g = tblLayout(PHONE ? 252 : 244, PHONE ? 56 : 44); STR_KEYS.forEach((k, i) => { const y = g.top + 30 + i * g.rowH; if (p.y >= y && p.y < y + g.rowH && MU.anim < 0) { MU.strain = k; Sound.tick(); updateCtl(); } }); return false; },
    hover(p) { return 'pointer'; },
  };

  /* ---------- 트립토판 오페론 (억제 오페론) ---------- */
  const TR = { trp: false, ever: { on: false, off: false } };
  function trpScene(dt, t) {
    T(14, 26, '트립토판 오페론: 최종 산물이 억제하는 오페론', PHONE ? 14 : 16.5, '#334155', 'left', 800);
    const occ = TR.trp ? 1 : 0;
    drawMedium(14, 38, VW - 28, PHONE ? 58 : 56, 0, false, t);
    const oy = PHONE ? 180 : 172, W = VW - (PHONE ? 24 : 60), ox = PHONE ? 12 : 30;
    drawOperon(ox, oy, W, { strain: 'wt', occ, a: 0, corep: TR.trp, u: TR.trp ? 0 : 1, m: TR.trp ? 0 : 1, x: TR.trp ? 0 : 1, label: false, showEnz: true, nameMap: { I: 'trpR', Z: 'trpE', Y: 'trpD · C', A: 'trpB · A' }, opName: '트립토판 오페론', mrnaLabel: '한 가닥의 mRNA', enzLabel: '트립토판 합성 효소', noMake: false }, dt, t);
    // 배지 위 트립토판
    if (TR.trp) for (let i = 0; i < 6; i++) D.sphere(30 + i * ((VW - 80) / 5) + Math.sin(t + i) * 4, 76 + Math.cos(t * 0.8 + i) * 4, 5.5, '#f472b6', { gloss: false });
    pill(VW - 14, 52, TR.trp ? '트립토판 있음' : '트립토판 없음', { bg: TR.trp ? '#fce7f3' : '#fff', color: '#9d174d', border: '#f472b6', size: 13.5, align: 'right' });
    // 비교 카드
    const cy = PHONE ? 350 : 332, cw = (VW - 28 - 10) / 2, ch = PHONE ? 250 : 200;
    [['젖당 오페론 (유도 오페론)', '#16a34a', ['평소에는 꺼져 있어요.', '억제자가 단독으로 작동 부위에 붙어요.', '젖당(알로락토스)이 있으면 억제자가 떨어져 켜져요.', '→ 필요할 때만 분해 효소를 만들어요.']], ['트립토판 오페론 (억제 오페론)', '#db2777', ['평소에는 켜져 있어요.', '억제자는 혼자서는 작동 부위에 못 붙어요.', '트립토판이 있으면 억제자에 결합해 꺼져요.', '→ 충분하면 합성을 멈춰 낭비를 막아요.']]].forEach((c, i) => {
      const x = PHONE ? 14 : 14 + i * (cw + 10), y = PHONE ? cy + i * (ch / 2 + 6) : cy;
      const hh = PHONE ? ch / 2 : ch;
      panel(x, y, PHONE ? VW - 28 : cw, hh, 14);
      D.roundRect(x, y, PHONE ? VW - 28 : cw, 28, 14); ctx.fillStyle = C.rgba(c[1], 0.18); ctx.fill();
      T(x + 12, y + 20, c[0], PHONE ? 13.5 : 15, C.shade(c[1], -0.4), 'left', 800);
      c[2].forEach((ln, k) => { const lines = wrap(ln, (PHONE ? VW - 28 : cw) - 24, PHONE ? 12.5 : 14, 700); lines.forEach((l, q) => T(x + 12, y + 48 + k * (PHONE ? 19 : 36) + q * 17, l, PHONE ? 13 : 14, k === 3 ? C.shade(c[1], -0.4) : '#475569', 'left', k === 3 ? 800 : 700)); });
    });
  }

  /* =========================================================
     화면 전환 · 조작 연결
     ========================================================= */
  const PRED_KEYS = ['Im', 'Oc', 'Is', 'Zm', 'Pm'];
  function setMode(m) {
    if (S.mode !== m) S.fade = 1;
    S.mode = m; hideHint();
    PT = m === 'struct' ? structPT : m === 'mut' ? mutPT : null;
    updateCtl();
  }
  function updateCtl() {
    const fr0 = game ? game.free : false, lvNow = game ? game.level : 0;
    ctlNodes.forEach((n) => { n.hidden = (n.dataset.modes || '').split(' ').indexOf(S.mode) < 0; });
    modeBtns(S.mode, lvNow, fr0);
    chipOn($('#stPhase'), ST.phase);
    $('#stDemo').disabled = ST.demo || ST.phase !== 1;
    const n1 = ST.s1 ? ST.s1.placed : 0, n2 = ST.s2 ? ST.s2.placed : 0;
    $('#stMade').innerHTML = '<li class="' + (n1 === 6 ? 'on' : '') + '">' + mark(n1 === 6) + ' 이름표 ' + n1 + ' / 6</li><li class="' + (n2 === 4 ? 'on' : '') + '">' + mark(n2 === 4) + ' 기능 카드 ' + n2 + ' / 4</li>';
    $('#nlAtt').disabled = NL.att >= 0; $('#nlMeas').disabled = !NL.tried || NL.measured;
    $('#nlMade').innerHTML = '<li class="' + (NL.tried ? 'on' : '') + '">' + mark(NL.tried) + ' 전사 시도 확인 (RNA 중합 효소가 지나갈 수 있나?)</li><li class="' + (NL.measured ? 'on' : '') + '">' + mark(NL.measured) + ' mRNA 양 · 효소 활성 측정</li>';
    $('#oAmt').textContent = LAC.amount; $('#lcAdd').disabled = LAC.added; $('#sAmt').disabled = LAC.added;
    chipOn($('#lcSpeed'), LAC.speed);
    $('#oMark').textContent = LAC.mark + '분'; $('#sMark').disabled = !LAC.added;
    $('#lcMade').innerHTML = [[LAC.added, '젖당 넣기'], [LAC.tM50 != null, 'mRNA 50 % 도달' + (LAC.tM50 != null ? ' (' + fmtN(LAC.tM50, 1) + '분)' : '')], [LAC.tA100 != null, '효소 활성 100 도달' + (LAC.tA100 != null ? ' (' + fmtN(LAC.tA100, 1) + '분)' : '')], [LAC.tA500 != null, '효소 활성 500 도달' + (LAC.tA500 != null ? ' (' + fmtN(LAC.tA500, 1) + '분)' : '')], [LAC.exhaust != null, '젖당이 모두 소진됨' + (LAC.exhaust != null ? ' (관찰함)' : '')]].map((r) => '<li class="' + (r[0] ? 'on' : '') + '">' + mark(r[0]) + ' ' + r[1] + '</li>').join('');
    $('#grRun').disabled = GR.run;
    PRED_KEYS.forEach((k) => ['no', 'yes'].forEach((c) => { const e = $('#pr_' + k + '_' + c); if (e && e.value !== (MU.preds[k][c] || '')) e.value = MU.preds[k][c] || ''; }));
    chipOn($('#muSel'), MU.strain);
    $$('#muSel button').forEach((b) => { const r = MU.results[b.dataset.v]; b.classList.toggle('seen', r.no != null && r.yes != null); });
    $('#muNo').disabled = MU.anim >= 0; $('#muYes').disabled = MU.anim >= 0; $('#muBoth').disabled = MU.anim >= 0;
    chipOn($('#trSel'), TR.trp ? 'y' : 'n');
  }
  bindModes(setMode);
  $$('#stPhase button').forEach((b) => b.addEventListener('click', () => { Sound.click(); ST.phase = +b.dataset.v; ST.bad = false; updateCtl(); }));
  $('#stDemo').addEventListener('click', stDemo);
  $('#stReset').addEventListener('click', () => { Sound.click(); (ST.phase === 1 ? ST.s1 : ST.s2).reset(); ST.bad = false; ST.seg = -1; });
  $('#nlAtt').addEventListener('click', nlAttempt);
  $('#nlMeas').addEventListener('click', nlMeasure);
  $('#nlReset').addEventListener('click', () => { Sound.click(); nlReset(); });
  SciSim.bindRange($('#sAmt'), $('#oAmt'), (v) => String(v), (v) => { LAC.amount = v; });
  $('#lcAdd').addEventListener('click', lacAdd);
  $('#lcReset').addEventListener('click', () => { Sound.click(); lacReset(); LAC.mark = 0; $('#sMark').value = 0; updateCtl(); });
  $$('#lcSpeed button').forEach((b) => b.addEventListener('click', () => { Sound.click(); LAC.speed = +b.dataset.v; updateCtl(); }));
  SciSim.bindRange($('#sMark'), $('#oMark'), (v) => v + '분', (v) => { LAC.mark = v; });
  $('#grRun').addEventListener('click', grRun);
  $('#grReset').addEventListener('click', () => { Sound.click(); GR.t = 0; GR.run = false; GR.done = false; updateCtl(); });
  PRED_KEYS.forEach((k) => ['no', 'yes'].forEach((c) => { const e = $('#pr_' + k + '_' + c); e.innerHTML = '<option value="">선택</option><option value="hi">높음</option><option value="lo">낮음</option>'; e.addEventListener('change', () => { MU.preds[k][c] = e.value; e.classList.remove('bad'); updateCtl(); }); }));
  $$('#muSel button').forEach((b) => b.addEventListener('click', () => { if (MU.anim >= 0) return; Sound.click(); MU.strain = b.dataset.v; updateCtl(); }));
  $('#muNo').addEventListener('click', () => { muStart(MU.strain, false); updateCtl(); });
  $('#muYes').addEventListener('click', () => { muStart(MU.strain, true); updateCtl(); });
  $('#muBoth').addEventListener('click', muRunBoth);
  $$('#trSel button').forEach((b) => b.addEventListener('click', () => { Sound.click(); TR.trp = b.dataset.v === 'y'; TR.ever[TR.trp ? 'on' : 'off'] = true; updateCtl(); }));
  stBuild(); lacReset();

  /* =========================================================
     미션
     ========================================================= */
  const DIAUXIE_FIG = '<svg viewBox="0 0 320 150" width="100%" role="img" aria-label="포도당과 젖당이 함께 있는 배지에서 대장균의 이중 성장 곡선"><rect x="0" y="0" width="320" height="150" fill="#fff"/><path d="M30 120 L30 12 M30 120 L310 120" stroke="#94a3b8" stroke-width="2" fill="none"/><path d="M30 118 C60 118 90 104 105 70 C115 58 125 56 130 56 C138 56 150 55 160 55 C180 56 200 40 240 22 C262 16 285 16 305 16" stroke="#2563eb" stroke-width="4" fill="none"/><text x="52" y="136" font-size="12" fill="#c2410c" font-weight="800">① 포도당</text><text x="128" y="136" font-size="12" fill="#475569" font-weight="800">② ?</text><text x="196" y="136" font-size="12" fill="#166534" font-weight="800">③ 젖당</text><text x="6" y="14" font-size="11" fill="#475569" font-weight="800">세균 수</text><text x="258" y="146" font-size="11" fill="#64748b" font-weight="700">시간</text></svg>';
  const levels = [
    {
      title: '오페론의 구성 요소', short: '오페론 구조', icon: '🧬', phase: '모형',
      intro: '<p class="si-q">❓ 탐구 질문: 대장균은 주변에 젖당이 있을 때만 젖당 분해 효소를 만든다. 세균은 어떻게 필요한 유전자만 켤까?</p><p>🔗 <b>앞 단원</b>에서 <b>오페론</b>(한 프로모터 아래 여러 구조 유전자가 묶여 한 mRNA로 전사됨)을 배웠고, <b>앞 차시</b>에서 전사와 번역의 과정을 살펴봤어요.</p><p>이번 차시는 원핵생물의 <b>전사 조절</b>을 <b>젖당 오페론</b>으로 알아봐요. 먼저 대장균 DNA의 <b>조절 유전자(lacI)</b>와 <b>오페론</b>(프로모터 P · 작동 부위 O · 구조 유전자 lacZ · lacY · lacA)의 위치와 이름, 기능을 익혀요.</p>',
      features: ['struct'],
      setup() { ST.phase = 1; ST.seg = -1; setMode('struct'); },
      recap: '조절 유전자(lacI)는 오페론 밖에서 억제자를 항상 소량 만들고, 오페론은 프로모터(P) · 작동 부위(O) · 구조 유전자(lacZ · lacY · lacA)로 이루어져요. 전사되면 세 유전자가 한 mRNA로 만들어져요.',
      summary: '<ul><li><b>조절 유전자(lacI)</b>: 오페론과 따로 떨어져 있고 <b>억제자</b> 단백질을 항상 소량 만들어요. (오페론에 속하지 않아요)</li><li><b>오페론</b> = 프로모터(P: RNA 중합 효소 결합) + 작동 부위(O: 억제자 결합) + 구조 유전자 <b>lacZ</b>(β-갈락토시데이스: 젖당 → 포도당 + 갈락토스), <b>lacY</b>(젖당 수송), <b>lacA</b>.</li><li>전사되면 구조 유전자 세 개가 <b>한 가닥의 mRNA</b>로 만들어지고 각각 번역돼요.</li></ul>',
      missions: [
        {
          id: 'label', title: '이름표와 기능 연결하기', manual: true,
          goal: '<b>① 이름표</b> 6개를 알맞은 구간(①~⑥)에 놓고, <b>② 기능 카드</b> 4개를 알맞은 구성 요소에 연결하세요.',
          hint: '구간을 눌러 설명을 읽어 보세요. 조절 유전자는 오페론과 떨어져 있고, 프로모터 다음에 작동 부위가 오고, 그 뒤에 lacZ · lacY · lacA가 차례로 있어요. 기능 카드는 위쪽 [② 기능 카드] 단추로 바꿔요.',
          setup() { ST.phase = 1; ST.s1.reset(); ST.s2.reset(); ST.seg = -1; setMode('struct'); },
          check() {
            const n1 = ST.s1.placed, n2 = ST.s2.placed;
            if (n1 < 6) { ST.s1.markBad([]); return '① 이름표를 모두 놓아 주세요. (' + n1 + ' / 6)'; }
            const w1 = stWrong1();
            if (w1.length) { ST.s1.markBad(w1.map((c) => c.id)); ST.phase = 1; return '\'' + w1[0].label + '\' 이름표 자리를 다시 생각해 보세요. 구간 설명을 읽어 봐요. (' + w1.length + '개가 달라요)'; }
            ST.s1.markBad([]);
            if (n2 < 4) return '이름표는 모두 맞았어요! 이제 ② 기능 카드 4장을 연결해 주세요. (' + n2 + ' / 4)';
            const w2 = stWrong2();
            if (w2.length) { ST.s2.markBad(w2.map((c) => c.id)); return '\'' + w2[0].label + '\' 카드를 다시 생각해 보세요. (' + w2.length + '장이 달라요)'; }
            ST.s2.markBad([]); return true;
          },
          explain: '<b>조절 유전자 lacI</b>는 억제자를 만들어요. <b>프로모터(P)</b>에는 RNA 중합 효소가, <b>작동 부위(O)</b>에는 억제자가 결합해요. <b>구조 유전자</b> lacZ(β-갈락토시데이스) · lacY(젖당 수송) · lacA는 효소의 정보를 가졌고, 한 번 전사되면 한 mRNA로 만들어져요.',
        },
        {
          type: 'quiz', title: '조절 유전자는 오페론에 속할까?',
          goal: '젖당 오페론의 조절 유전자(lacI)에 대한 설명으로 옳은 것은?',
          setup() { setMode('struct'); },
          choices: ['오페론에 속하지 않는다. 오페론 밖에서 억제자를 항상 소량 만들어 둔다', '오페론에 속한다. 오페론은 조절 유전자 · 프로모터 · 작동 부위 · 구조 유전자를 모두 포함한다', '오페론에 속하지 않는다. 젖당이 있을 때만 억제자를 만든다', '오페론에 속한다. 억제자는 젖당이 있을 때만 만들어진다'],
          answer: 0,
          feedback: ['', '오페론은 프로모터 · 작동 부위 · 구조 유전자로 이루어진 단위예요. 조절 유전자는 따로 떨어져 있어요.', '억제자는 젖당 유무와 상관없이 늘 조금씩 만들어져요. 그래서 젖당이 없을 때 곧바로 작동 부위에 붙을 수 있어요.', '조절 유전자는 오페론에 속하지 않고, 억제자도 젖당과 상관없이 항상 소량 만들어져요.'],
          explain: '조절 유전자 lacI는 자기 프로모터를 따로 가지고 있어 젖당 유무와 상관없이 억제자를 <b>항상 소량</b> 만들어요. 그래서 젖당이 없을 때 언제든 작동 부위에 붙어 오페론을 꺼 둘 수 있어요.',
        },
      ],
    },
    {
      title: '젖당이 없을 때', short: '젖당 없음', icon: '🚫', phase: '실험',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 조절 유전자(lacI)가 억제자를 만들고, 억제자는 작동 부위(O)에 붙을 수 있다는 것을 배웠어요. <b>억제자가 작동 부위에 붙으면 어떻게 될까요?</b></div><p>포도당만 있고 젖당이 없는 배지에서 대장균을 키워요. 현미경으로 오페론을 확대해 RNA 중합 효소가 전사를 할 수 있는지 시도해 보고, <b>mRNA 양</b>과 <b>효소 활성</b>을 재 봐요.</p>',
      features: ['nolac'],
      setup() { nlReset(); setMode('nolac'); },
      recap: '젖당이 없으면 억제자가 작동 부위에 붙어 RNA 중합 효소가 구조 유전자로 진행하지 못해요. 그래서 mRNA가 만들어지지 않고 β-갈락토시데이스의 활성은 배경 수준(1)이에요.',
      summary: '<ul><li><b>젖당이 없을 때</b>: 억제자가 작동 부위(O)에 결합 → RNA 중합 효소가 프로모터에 있어도 구조 유전자로 <b>진행하지 못해요</b> → 전사가 되지 않아요.</li><li>측정: mRNA 0, β-갈락토시데이스 활성 1(상대값, 배경 수준).</li><li>억제자는 효소를 직접 분해하는 것이 아니라 <b>전사(RNA 중합 효소의 진행)</b>를 막아요.</li></ul>',
      missions: [
        {
          id: 'nolac', title: '전사 시도와 효소 활성 측정',
          goal: '[전사 시도]로 RNA 중합 효소가 오페론을 지나갈 수 있는지 보고, [효소 활성 측정]으로 mRNA 양과 활성을 재세요.',
          hint: '먼저 [전사 시도]를 눌러 RNA 중합 효소가 어디서 멈추는지 보세요. 끝나면 [효소 활성 측정]을 눌러요.',
          setup() { setMode('nolac'); },
          check: () => NL.tried && NL.measured, hold: 0.8,
          status: () => mark(NL.tried) + ' 전사 시도 확인 &nbsp; ' + mark(NL.measured) + ' mRNA 0 · 활성 1 측정',
          explain: '포도당 배지(젖당 없음)에서는 억제자가 작동 부위에 붙어 있어요. RNA 중합 효소가 프로모터에서 출발해도 <b>작동 부위에서 막혀</b> lacZ · lacY · lacA를 전사하지 못해요. 그래서 mRNA는 0, 효소 활성은 배경 수준 1이에요. 필요 없는 효소를 만들지 않아 에너지를 아껴요.',
        },
        {
          type: 'quiz', title: '억제자가 막는 것은?',
          goal: '젖당이 없을 때 억제자가 막는 것은 무엇일까요?',
          setup() { setMode('nolac'); },
          choices: ['RNA 중합 효소가 구조 유전자로 진행해 전사하는 것', '이미 만들어진 β-갈락토시데이스를 분해하는 것', 'DNA가 복제되는 것', '젖당이 세포 안으로 들어오는 것'],
          answer: 0,
          feedback: ['', '억제자는 단백질을 직접 분해하지 않아요. 단백질이 만들어지기 전 단계인 전사를 막아요.', 'DNA 복제와는 상관없어요. 억제자는 전사를 조절해요.', '젖당이 들어오는 것을 막는 것이 아니라, 들어온 젖당(알로락토스)이 억제자에 결합해요.'],
          explain: '억제자는 작동 부위에 붙어 <b>RNA 중합 효소의 진행(전사)</b>을 막는 단백질이에요. 효소 단백질을 직접 분해하는 것이 아니라 효소의 <b>정보를 읽는 것(전사)</b>을 막아서 효소가 만들어지지 않게 해요.',
        },
      ],
    },
    {
      title: '젖당이 있을 때', short: '젖당 있음', icon: '🥛', phase: '실험',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 젖당이 없으면 억제자가 작동 부위에 붙어 전사가 막힌다는 것을 확인했어요. <b>젖당을 넣으면 억제자는 어떻게 될까요?</b></div><p>젖당(의 대사 산물인 <b>알로락토스</b>)이 억제자에 결합하면 억제자의 <b>모양이 바뀌고</b> 작동 부위에서 떨어져요. 그러면 RNA 중합 효소가 지나가며 전사해 효소가 만들어져요. 젖당이 다 분해되면 억제자가 다시 돌아와요.</p><p>💡 젖당 양을 정하고 넣어서 시간에 따른 변화를 그래프로 관찰해요. 위쪽 <b>이중 성장</b> 화면도 살펴봐요.</p>',
      features: ['lac', 'growth'],
      setup() { lacReset(); LAC.mark = 0; $('#sMark').value = 0; setMode('lac'); },
      recap: '젖당(알로락토스)이 억제자에 결합하면 억제자가 작동 부위에서 떨어져 전사가 일어나고, 효소 활성이 약 1000배로 올라가요. 젖당이 소진되면 억제자가 돌아와 활성이 줄어요. 젖당은 오페론을 켜는 유도자예요.',
      summary: '<ul><li><b>젖당이 있을 때</b>: 알로락토스(젖당의 대사 산물)가 억제자에 결합 → 억제자의 모양이 바뀜 → 작동 부위에서 떨어짐 → RNA 중합 효소가 전사 → 효소 합성 → 젖당 분해.</li><li>젖당 첨가 후 약 2분 안에 mRNA가 늘고, 약 10분 뒤 효소 활성이 크게 올라가요(약 1 → 1000, 예시 값).</li><li>젖당이 소진되면 억제자가 작동 부위로 돌아와 전사가 멈추고 활성이 줄어요.</li><li><b>유도자</b>: 오페론을 켜는 물질(알로락토스). 필요할 때만 효소를 만들어 에너지와 자원을 아껴요.</li><li>포도당 + 젖당 배지: 포도당을 먼저 쓰고 → 잠시 성장이 멈췄다가(효소 유도 중) → 젖당을 써서 다시 자라요(2단계 성장). 포도당이 있을 때 발현이 낮아지는 데는 CAP · cAMP가 관여해요.</li></ul>',
      missions: [
        {
          id: 'induce', title: '젖당으로 유도하기',
          goal: '젖당을 넣어 효소 활성이 <b>500 이상</b>으로 오르는 것을 확인하세요. 오르기 시작하는 시점을 기록해 두세요.',
          hint: '젖당 양을 고르고 [젖당 넣기]를 눌러요. 시간이 느리면 [빠르게]를 눌러요. 아래 기록 목록에 mRNA 50 %와 활성 100 · 500에 도달한 시각이 쌓여요.',
          setup() { setMode('lac'); },
          check: () => LAC.added && LAC.tA500 != null, hold: 0.6,
          status: () => mark(LAC.added) + ' 젖당 넣기 &nbsp; ' + mark(LAC.tM50 != null) + ' mRNA 50 %' + (LAC.tM50 != null ? ' (' + fmtN(LAC.tM50, 1) + '분)' : '') + '<br>' + mark(LAC.tA100 != null) + ' 활성 100' + (LAC.tA100 != null ? ' (' + fmtN(LAC.tA100, 1) + '분)' : '') + ' &nbsp; ' + mark(LAC.tA500 != null) + ' 활성 500' + (LAC.tA500 != null ? ' (' + fmtN(LAC.tA500, 1) + '분)' : ''),
          explain: '젖당(알로락토스)이 들어오면 억제자에 결합해 모양이 바뀌고 작동 부위에서 떨어져요. 그러면 RNA 중합 효소가 지나가 mRNA가 몇 분 안에 늘고, 그 뒤 번역된 β-갈락토시데이스가 쌓여 약 10분 뒤에는 활성이 수백 배로 올라요. 젖당이 <b>유도자</b>로 작용해 오페론이 켜진 거예요.',
        },
        {
          id: 'read', title: '젖당이 소진된 시점 읽기',
          goal: '젖당(파란 점선)이 <b>모두 소진되는 시각</b>을 그래프에서 읽고, 아래 슬라이더로 그 시각을 표시하세요.',
          hint: '젖당이 소진될 때까지 시간이 흘러야 해요. 파란 점선이 0 % 가 되는 시각을 찾고 [시각 표시] 슬라이더를 맞춰요. 젖당을 적게 넣으면 더 빨리 소진돼요. (오차 ±2.5분 허용)',
          setup() { setMode('lac'); },
          check: () => LAC.exhaust != null && LAC.mark > 0 && Math.abs(LAC.mark - LAC.exhaust) <= 2.5, hold: 0.6,
          status: () => mark(LAC.exhaust != null) + ' 젖당이 소진되는 것을 관찰 &nbsp; ' + mark(LAC.mark > 0) + ' 시각 표시 ' + (LAC.mark > 0 ? LAC.mark + '분' : '(아직)') + (LAC.exhaust != null && LAC.mark > 0 && Math.abs(LAC.mark - LAC.exhaust) > 2.5 ? '<br>⚠ 파란 점선이 0에 닿는 시각을 다시 확인해 보세요' : ''),
          explain: '파란 점선(젖당 양)이 0이 되는 시각이 젖당이 소진된 때예요. 그 뒤에 억제자가 작동 부위로 돌아와 전사가 멈추고, mRNA가 줄고, 효소 활성도 서서히 줄어요. 젖당이 없으면 오페론을 꺼 자원을 아끼는 되먹임이에요.',
        },
        {
          type: 'quiz', title: '이중 성장 곡선과 유도자',
          goal: '포도당 + 젖당 배지에서 대장균은 포도당을 먼저 쓰고, 성장이 잠시 멈춘 뒤 젖당으로 다시 자라요. 올바른 설명은?',
          figure: DIAUXIE_FIG,
          setup() { setMode('growth'); },
          choices: ['젖당(알로락토스)이 억제자를 떼어 내는 유도자라서, 정체기에는 젖당 분해 효소가 새로 만들어지고 있다', '젖당이 억제자를 만드는 조절 유전자를 켜서, 정체기에는 억제자가 만들어지고 있다', '효소는 처음부터 많이 만들어져 있고, 젖당이 효소 단백질을 직접 활성화한다', '대장균은 젖당 분해 효소를 늘 최대로 만들고 있고, 정체기는 단지 포도당이 부족해서 생긴다'],
          answer: 0,
          feedback: ['', '억제자는 젖당 유무와 상관없이 늘 만들어져요. 젖당이 하는 일은 억제자를 작동 부위에서 떼어 내는 것이에요.', '젖당이 없을 때는 효소가 거의 없고(활성 1), 젖당이 있어야 전사가 일어나 효소가 만들어져요.', '젖당이 없으면 오페론이 꺼져 있어 효소를 거의 만들지 않아요. 필요할 때만 만들어 자원을 아껴요.'],
          explain: '포도당이 바닥나면 젖당만 남아 <b>알로락토스(유도자)</b>가 억제자를 떼어 내고 오페론이 켜져 효소가 만들어져요. 이 효소를 만드는 동안 성장이 잠시 멈추는 <b>정체기</b>가 생겨요. 효소를 필요할 때만 만드는 것은 에너지와 자원을 아끼는 적응적 의미가 있어요.',
        },
      ],
    },
    {
      title: '돌연변이 대장균', short: '돌연변이', icon: '🔬', phase: '탐구',
      intro: '<div class="si-link">🔗 <b>앞 단계들에서</b> 젖당이 없으면 꺼지고 있으면 켜지는 오페론의 작동을 확인했어요. 오페론의 부품이 하나씩 망가지면 어떻게 될까요?</div><p><b>돌연변이 대장균 5종</b>(lacI⁻ · lacOᶜ · lacIˢ · lacZ⁻ · P⁻)의 β-갈락토시데이스 활성이 젖당이 없을 때와 있을 때 <b>높을지 낮을지 먼저 예측</b>하고, 실험으로 확인해 표로 비교해요.</p><p>📘 트립토판 오페론 카드로 <b>유도 오페론</b>과 <b>억제 오페론</b>도 비교해요.</p>',
      features: ['predict', 'mut', 'trp'],
      setup() { setMode('predict'); },
      recap: '젖당이 없어도 효소가 계속 만들어지는 돌연변이는 lacI⁻(억제자 결함)와 lacOᶜ(억제자가 붙을 자리 결함)예요. lacIˢ는 항상 꺼져 있고, lacZ⁻는 효소가 없고, P⁻는 전사 자체가 안 돼요. 트립토판 오페론은 최종 산물이 억제하는 억제 오페론이에요.',
      summary: '<ul><li>효소 활성(상대값, 젖당 없음 / 있음): 야생형 1 / 1000, <b>lacI⁻</b> 1000 / 1000(억제자 결함), <b>lacOᶜ</b> 1000 / 1000(작동 부위가 억제자와 결합 못함), <b>lacIˢ</b> 1 / 1(억제자가 유도자와 결합 못해 항상 꺼짐), <b>lacZ⁻</b> 0 / 0(효소 유전자 결함), <b>P⁻</b> 1 / 1(프로모터 결함, 전사 안 됨).</li><li>lacI⁻와 lacOᶜ는 둘 다 항상 켜져 있지만 원인이 달라요: <b>억제자 자체가 없는 것</b> vs <b>억제자가 붙을 자리가 변한 것</b>.</li><li><b>트립토판 오페론(억제 오페론)</b>: 평소 켜져 있고, 트립토판이 있으면 억제자가 활성화되어 작동 부위에 붙어 꺼져요 (최종 산물이 억제하는 되먹임). 젖당 오페론은 평소 꺼져 있다가 유도자가 있으면 켜지는 <b>유도 오페론</b>이에요.</li></ul>',
      missions: [
        {
          id: 'predict', title: '5종 균주의 효소 활성 예측', manual: true,
          goal: '돌연변이 대장균 <b>5종</b>의 효소 활성이 젖당이 없을 때 · 있을 때 <b>높을지 낮을지</b> 10칸을 모두 예측하세요.',
          hint: '각 균주의 어떤 부품이 망가졌는지(✕ 표시)와 억제자가 작동 부위에 붙는지 생각해 보세요. 효소 유전자(lacZ)가 망가지면 어떨까요? 틀려도 괜찮아요. 실험으로 확인해요.',
          setup() { setMode('predict'); },
          check() {
            const miss = PRED_KEYS.reduce((n, k) => n + ['no', 'yes'].filter((c) => !MU.preds[k][c]).length, 0);
            if (miss) return '예측을 모두 골라 주세요. (' + miss + '칸 남음)';
            return true;
          },
          explain: '예측을 모두 했어요! 이제 실험으로 확인해 볼 차례예요. 맞은 것도 틀린 것도 모두 중요한 학습이에요. 부품마다 하는 일을 떠올리면(억제자 생산 · 억제자 결합 · 유도자 결합 · 프로모터 · 효소 유전자) 결과를 설명할 수 있어요.',
        },
        {
          id: 'measure', title: '실제 결과와 대조하기',
          goal: '돌연변이 5종을 모두 <b>젖당 없음 · 젖당 있음</b> 두 조건으로 측정해 표를 채우고, 예측과 비교하세요.',
          hint: '균주를 고르고 [두 조건 모두 측정]을 눌러요. 5종 모두 측정하면 돼요. 표에서 ✓ · ✕ 로 예측과 같은지 확인해요.',
          setup() { setMode('mut'); },
          check: () => PRED_KEYS.every((k) => MU.results[k].no != null && MU.results[k].yes != null), hold: 0.8,
          status: () => PRED_KEYS.map((k) => mark(MU.results[k].no != null && MU.results[k].yes != null) + ' ' + STRAINS[k].short).join(' &nbsp; ') + '<br>예측과 같은 칸: ' + PRED_KEYS.reduce((n, k) => n + ['no', 'yes'].filter((c) => MU.results[k][c] != null && MU.preds[k][c] && ((MU.preds[k][c] === 'hi') === (MU.results[k][c] >= 100))).length, 0) + ' / ' + PRED_KEYS.reduce((n, k) => n + ['no', 'yes'].filter((c) => MU.results[k][c] != null).length, 0),
          explain: '<b>lacI⁻</b>는 억제자가 없어 항상 켜져요(1000 / 1000). <b>lacOᶜ</b>는 억제자가 붙을 자리가 변해 항상 켜져요(1000 / 1000). <b>lacIˢ</b>는 억제자가 유도자와 결합하지 못해 젖당이 있어도 꺼져 있어요(1 / 1). <b>lacZ⁻</b>는 전사돼도 효소 자체가 없어 0 / 0이에요. <b>P⁻</b>는 전사가 안 돼 1 / 1이에요.',
        },
        {
          type: 'quiz', title: 'lacI⁻와 lacOᶜ의 차이',
          goal: '젖당이 없어도 효소가 계속 만들어지는 돌연변이 두 종, <b>lacI⁻</b>와 <b>lacOᶜ</b>의 차이는 무엇일까요?',
          setup() { setMode('mut'); },
          choices: ['lacI⁻는 억제자 자체를 만들지 못하고, lacOᶜ는 억제자가 붙을 작동 부위가 변해 억제자가 결합하지 못한다', 'lacI⁻는 작동 부위가 변했고, lacOᶜ는 억제자를 만들지 못한다', 'lacI⁻는 효소 유전자가 망가졌고, lacOᶜ는 프로모터가 망가졌다', '두 돌연변이는 원인이 같아서 구별할 수 없다'],
          answer: 0,
          feedback: ['', 'I와 O의 역할을 바꿔 말했어요. lacI는 억제자를 만드는 조절 유전자, lacO는 억제자가 붙는 작동 부위예요.', '효소 유전자(lacZ)나 프로모터(P)가 망가지면 효소가 늘 만들어지는 것이 아니라 오히려 못 만들어요.', '결과(항상 켜짐)는 같지만 원인은 달라요. 억제자 결함인지, 억제자가 붙을 자리 결함인지로 구별해요.'],
          explain: '<b>lacI⁻</b>(억제자 결함)는 억제자 단백질이 없고, <b>lacOᶜ</b>(작동 부위 결함)는 억제자는 있지만 붙을 자리가 변해 결합하지 못해요. 둘 다 전사를 막는 장치가 없어 젖당이 없어도 항상 켜져 있어요. (이 둘을 구별하려면 한 세포에 두 가지를 함께 넣는 실험이 필요하지만, 이 차시에서는 다루지 않아요.)',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hg-lac-operon', mount: '#game', badge: '오페론 탐정', homeHref: '../../index.html#hg',
    featureLabels: { struct: '🧬 오페론 구조', nolac: '🚫 젖당 없음 실험', lac: '🥛 젖당 있음 실험', growth: '📈 이중 성장', predict: '🎯 예측 표', mut: '🔬 돌연변이 실험', trp: '📘 트립토판 오페론' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 읽음 칸 ---------- */
  function readouts() {
    const m = S.mode;
    if (m === 'struct') setReads(['이름표', (ST.s1 ? ST.s1.placed : 0) + ' / 6', '기능 카드', (ST.s2 ? ST.s2.placed : 0) + ' / 4', '선택한 구간', ST.seg >= 0 ? SEGINFO[ST.seg].n : '—']);
    else if (m === 'nolac') setReads(['배지', '포도당 · 젖당 없음', 'mRNA 양', NL.measured ? '0' : '—', '효소 활성', NL.measured ? '1 (배경 수준)' : '—']);
    else if (m === 'lac') setReads(['시간', fmtN(LAC.t, 1) + '분', 'mRNA (상대)', fmtN(LAC.m, 2), '효소 활성', fmtN(actOf(LAC.x), 0)]);
    else if (m === 'growth') setReads(['경과', fmtN(GR.t, 1) + '시간', '포도당 · 젖당 남은 양', fmtN(glcOf(GR.t) * 100, 0) + ' % · ' + fmtN(lacOf(GR.t) * 100, 0) + ' %', '효소 활성', fmtN(enzOf(GR.t), 0)]);
    else if (m === 'predict') setReads(['예측한 칸', PRED_KEYS.reduce((n, k) => n + ['no', 'yes'].filter((c) => MU.preds[k][c]).length, 0) + ' / 10', '야생형', '1 / 1000', '조건', '젖당 없음 / 있음']);
    else if (m === 'mut') { const r = MU.results[MU.strain]; setReads(['균주', STRAINS[MU.strain].name, '젖당 없음', r.no == null ? '—' : fmtN(r.no), '젖당 있음', r.yes == null ? '—' : fmtN(r.yes)]); }
    else setReads(['오페론', '트립토판 오페론', '트립토판', TR.trp ? '있음 → 꺼짐' : '없음 → 켜짐', '종류', '억제 오페론']);
  }

  /* ---------- 시작 ---------- */
  setMode('struct');
  let lastFree = false, lastLv = -1;
  SciSim.loop((dt, t) => {
    clock = t; S.t = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (game && game.level !== lastLv) { lastLv = game.level; updateCtl(); }
    view.apply(); ctx.clearRect(0, 0, VW, VH);
    bgFill('#eef4f2', '#e3ece8');
    FX.update(dt);
    switch (S.mode) {
      case 'struct': structScene(dt, t); break;
      case 'nolac': nolacScene(dt, t); break;
      case 'lac': lacScene(dt, t); break;
      case 'growth': growthScene(dt, t); break;
      case 'predict': predictScene(dt, t); break;
      case 'mut': mutScene(dt, t); break;
      case 'trp': trpScene(dt, t); break;
    }
    FX.draw();
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(241,246,243,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, PHONE, get game() { return game; }, levels, setMode, updateCtl, ST, NL, LAC, GR, MU, TR, STRAINS, steady, nlAttempt, nlMeasure, lacAdd, lacReset, stDemo, grRun, muStart, muRunBoth, stWrong1, stWrong2, drawOperon,
  };
})();
