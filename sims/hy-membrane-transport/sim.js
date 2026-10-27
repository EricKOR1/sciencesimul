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
    reset() { this.cards.forEach((c) => { c.zone = null; c.bad = false; c.sel = false; }); this.drag = null; this.layout(true); this.o.onChange && this.o.onChange(); }
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


  /* ===== 공유 그림 도구: 인지질, 막 단백질, 분자 (세포막 구조 차시와 같은 그림) ===== */
  let game = null;
  const HEADC = '#3b82f6', TAILC = '#f59e0b';
  const BG2 = '#eef4f2', BG3 = '#e3ece8';
  const PLS = 0.85, PSP = 15;
  /* ---------- 인지질 그리기 ----------
     (hx, hy) = 머리 중심, ang = 머리에서 꼬리 쪽으로 향하는 각도(라디안), o.s = 크기, o.kink = 꺾인(불포화) 꼬리, o.hot = 물에 닿는 꼬리 표시 */
  function drawLipid(hx, hy, ang, o) {
    o = o || {};
    const s = o.s || 1, rh = 7 * s, len = (o.len || 24) * s, off = 3.3 * s;
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(ang);
    if (o.alpha != null) ctx.globalAlpha = o.alpha;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = o.hot ? '#ef4444' : TAILC; ctx.lineWidth = 2.6 * s;
    ctx.beginPath(); ctx.moveTo(rh * 0.6, -off); ctx.lineTo(rh + len, -off); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(rh * 0.6, off);
    if (o.kink) { ctx.lineTo(rh + len * 0.38, off); ctx.lineTo(rh + len * 0.55, off + 4.2 * s); ctx.lineTo(rh + len * 0.72, off); ctx.lineTo(rh + len, off); } else ctx.lineTo(rh + len, off);
    ctx.stroke();
    if (o.hot || o.tip) { ctx.fillStyle = 'rgba(239,68,68,.55)'; ctx.beginPath(); ctx.arc(rh + len + 2 * s, 0, 7 * s, 0, TAU); ctx.fill(); }
    ctx.restore();
    D.sphere(hx, hy, rh, HEADC, { gloss: true });
  }

  /* ---------- 물이 든 칸 ---------- */
  function waterPanel(r, top, bot) {
    ctx.save(); D.roundRect(r.x, r.y, r.w, r.h, 18); ctx.clip();
    const g = ctx.createLinearGradient(0, r.y, 0, r.y + r.h); g.addColorStop(0, top || '#d6ecfb'); g.addColorStop(1, bot || '#a9d4f2'); ctx.fillStyle = g; ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.fillStyle = 'rgba(80,150,225,.16)';
    for (let k = 0; k < 40; k++) { const rx = ((k * 97) % 100) / 100, ry = ((k * 53) % 100) / 100; ctx.beginPath(); ctx.arc(r.x + 12 + rx * (r.w - 24) + Math.sin(clock * 0.8 + k) * 3, r.y + 12 + ry * (r.h - 24) + Math.cos(clock * 0.7 + k * 1.3) * 3, 3, 0, TAU); ctx.fill(); }
    ctx.restore();
    ctx.strokeStyle = 'rgba(30,90,150,.35)'; ctx.lineWidth = 2; D.roundRect(r.x, r.y, r.w, r.h, 18); ctx.stroke();
  }
  function angDelta(a, b) { let d = b - a; d = Math.atan2(Math.sin(d), Math.cos(d)); return d; }

  const PROT = {
    ch: { name: '통로 단백질', col: '#7c3aed', fn: '이온이 지나가는 길(구멍)을 만들어요.' },
    ca: { name: '운반체 단백질', col: '#0d9488', fn: '물질과 결합해 모양이 바뀌며 반대편으로 옮겨요.' },
    re: { name: '수용체', col: '#ea580c', fn: '신호 분자가 결합하면 세포 안으로 신호를 전달해요.' },
    en: { name: '효소', col: '#0284c7', fn: '막에서 화학 반응을 도와요(촉매).' },
    gp: { name: '인식 당단백질', col: '#db2777', fn: '바깥쪽 당 사슬로 세포를 알아보게 해요.' },
  };
  /* 막 단백질 모양 (x, y)=막 단면의 가운데. 위가 세포 밖, 아래가 세포 안 */
  function pbody(x, y, w, h, col, r) {
    const g = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0); g.addColorStop(0, C.shade(col, 0.35)); g.addColorStop(0.5, col); g.addColorStop(1, C.shade(col, -0.25));
    D.roundRect(x - w / 2, y - h / 2, w, h, r); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = C.shade(col, -0.4); ctx.lineWidth = 1.6; ctx.stroke();
  }
  function hex(x, y, r, col) {
    ctx.beginPath(); for (let k = 0; k < 6; k++) { const a = k * TAU / 6 + 0.5; ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } ctx.closePath();
    ctx.fillStyle = col; ctx.fill(); ctx.strokeStyle = C.shade(col, -0.4); ctx.lineWidth = 1.4; ctx.stroke();
  }
  function starShape(x, y, r, col) {
    ctx.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } ctx.closePath();
    ctx.fillStyle = col; ctx.fill(); ctx.strokeStyle = C.shade(col, -0.4); ctx.lineWidth = 1.4; ctx.stroke();
  }
  function drawProt(type, x, y, o) {
    o = o || {}; const s = o.s || 1, k = o.k || 0, a = o.a || 0, col = PROT[type].col;
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); if (o.alpha != null) ctx.globalAlpha = o.alpha;
    if (o.lift) { ctx.shadowColor = 'rgba(0,0,0,.3)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 7; }
    if (type === 'ch') {
      pbody(-17, 0, 20, 92, col, 9); pbody(17, 0, 20, 92, col, 9);
      ctx.fillStyle = 'rgba(190,230,255,.9)'; ctx.fillRect(-7, -42, 14, 84);
    } else if (type === 'ca') {
      pbody(0, 0, 50, 92, col, 16);
      const py = -41 + 82 * k; ctx.fillStyle = '#dff0fc'; ctx.beginPath(); ctx.arc(0, py, 14, 0, TAU); ctx.fill(); ctx.strokeStyle = C.shade(col, -0.4); ctx.lineWidth = 1.6; ctx.stroke();
    } else if (type === 're') {
      const c2 = C.mix(col, '#16a34a', a);
      pbody(0, 8, 20, 78, c2, 9);
      ctx.strokeStyle = C.shade(c2, -0.3); ctx.lineWidth = 11; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, -30); ctx.lineTo(-17, -58); ctx.moveTo(0, -30); ctx.lineTo(17, -58); ctx.stroke();
      ctx.strokeStyle = c2; ctx.lineWidth = 7.5; ctx.beginPath(); ctx.moveTo(0, -30); ctx.lineTo(-17, -58); ctx.moveTo(0, -30); ctx.lineTo(17, -58); ctx.stroke();
      if (a > 0.05) { ctx.strokeStyle = 'rgba(22,163,74,' + (0.2 + 0.7 * a) + ')'; ctx.lineWidth = 2.5; for (let r = 0; r < 3; r++) { const rr = 14 + ((o.t || 0) * 22 + r * 14) % 42; ctx.globalAlpha = a * (1 - rr / 56); ctx.beginPath(); ctx.arc(0, 56, rr, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke(); } }
    } else if (type === 'en') {
      pbody(0, 0, 50, 92, col, 16);
      ctx.fillStyle = '#dff0fc'; ctx.beginPath(); ctx.arc(0, 41, 13, 0, TAU); ctx.fill(); ctx.strokeStyle = C.shade(col, -0.4); ctx.lineWidth = 1.6; ctx.stroke();
    } else if (type === 'gp') {
      pbody(0, 6, 20, 80, col, 9);
      D.sphere(0, -42, 11, col, { gloss: true });
      const sw = Math.sin((o.t || 0) * 1.6) * 3;
      ctx.strokeStyle = '#d97706'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(0, -52); ctx.lineTo(sw - 2, -72); ctx.lineTo(-14 + sw, -88); ctx.moveTo(sw - 2, -72); ctx.lineTo(14 + sw, -88); ctx.moveTo(sw - 2, -72); ctx.lineTo(sw, -96); ctx.stroke();
      [[sw - 2, -72], [-14 + sw, -88], [14 + sw, -88], [sw, -98]].forEach((q) => hex(q[0], q[1], 5.6, '#fbbf24'));
    }
    ctx.restore();
  }
  function drawChol(x, y, o) {
    ctx.save(); ctx.translate(x, y); if (o && o.alpha != null) ctx.globalAlpha = o.alpha; ctx.rotate(o && o.up ? Math.PI : 0);
    D.roundRect(-4.6, -12, 9.2, 24, 4.5); ctx.fillStyle = '#facc15'; ctx.fill(); ctx.strokeStyle = '#b45309'; ctx.lineWidth = 1.4; ctx.stroke();
    ctx.strokeStyle = 'rgba(180,83,9,.6)'; ctx.lineWidth = 1; for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(-4.6, k * 6); ctx.lineTo(4.6, k * 6); ctx.stroke(); }
    ctx.fillStyle = '#60a5fa'; ctx.beginPath(); ctx.arc(0, -13.5, 3.2, 0, TAU); ctx.fill(); ctx.restore();
  }
  function drawMol(id, x, y, s, a) {
    s = s || 1; ctx.save(); if (a != null) ctx.globalAlpha = a;
    if (id === 'o2') { D.sphere(x - 4.5 * s, y, 6 * s, '#ef4444', { gloss: true }); D.sphere(x + 4.5 * s, y, 6 * s, '#ef4444', { gloss: true }); }
    else if (id === 'co2') { D.sphere(x - 11 * s, y, 5.5 * s, '#ef4444', { gloss: true }); D.sphere(x + 11 * s, y, 5.5 * s, '#ef4444', { gloss: true }); D.sphere(x, y, 6.5 * s, '#64748b', { gloss: true }); }
    else if (id === 'eth') { D.sphere(x - 11 * s, y + 3 * s, 5.5 * s, '#64748b', { gloss: true }); D.sphere(x, y - 3 * s, 5.5 * s, '#64748b', { gloss: true }); D.sphere(x + 11 * s, y + 3 * s, 5.5 * s, '#ef4444', { gloss: true }); D.sphere(x + 16 * s, y - 3 * s, 3 * s, '#f8fafc', { gloss: false }); }
    else if (id === 'h2o') { D.sphere(x, y, 7 * s, '#ef4444', { gloss: true }); D.sphere(x - 8 * s, y + 6 * s, 4 * s, '#f1f5f9', { gloss: false }); D.sphere(x + 8 * s, y + 6 * s, 4 * s, '#f1f5f9', { gloss: false }); }
    else if (id === 'glc') { hex(x, y, 11 * s, '#fde047'); ctx.fillStyle = '#ef4444'; [[-13, -6], [13, -6], [0, 14]].forEach((q) => { ctx.beginPath(); ctx.arc(x + q[0] * s, y + q[1] * s, 3 * s, 0, TAU); ctx.fill(); }); }
    else if (id === 'aa') { D.sphere(x, y, 8 * s, '#cbd5e1', { gloss: true }); D.sphere(x + 12 * s, y - 4 * s, 5.5 * s, '#22b455', { gloss: true }); D.sphere(x - 6 * s, y - 7 * s, 3 * s, '#3b82f6', { gloss: false }); D.sphere(x - 6 * s, y + 7 * s, 3 * s, '#ef4444', { gloss: false }); }
    else if (id === 'na') D.sphere(x, y, 8 * s, '#a855f7', { gloss: true, text: '+', textScale: 1.3 });
    else if (id === 'k') D.sphere(x, y, 9 * s, '#ec4899', { gloss: true, text: '+', textScale: 1.3 });
    else if (id === 'pro') { [[0, 0, 15, '#7c3aed'], [-14, 8, 11, '#f97316'], [13, 9, 12, '#3b82f6'], [4, -15, 10, '#22b455'], [-12, -10, 9, '#ef4444']].forEach((q) => D.sphere(x + q[0] * s, y + q[1] * s, q[2] * s, q[3], { gloss: true })); }
    ctx.restore();
  }


  /* =========================================================
     고등학교 세포와 물질대사 · Ⅰ. 세포 - 세포막 물질 수송 (단원 56, 8차시)
     성취기준 [12세포01-05] 세포막의 구조와 특성을 이해하고, 세포막을 통한 물질 수송 과정을 추론할 수 있다. (수송 과정)
     ① 모형: 확산  ② 모형: 운반 단백질  ③ 모형: 능동 수송  ④ 분석: 큰 물질
     ========================================================= */
  const S = { mode: 'diff', fade: 0 };
  const CONC = [1, 2, 4, 8, 16, 32];                 // 바깥 농도(상대값)
  const FAC = [8, 14, 20, 24, 26, 26];               // 촉진 확산 · 능동 수송의 상대 속도 (운반 단백질 2개일 때)
  const rateSimple = (ci) => CONC[ci];
  const rateFac = (ci, n) => FAC[ci] * (n / 2);
  const SPN = { o2: 'O₂', glc: '포도당', na: 'Na⁺' };

  /* 가로 막 장면 공통 영역 */
  const DFP = PHONE ? { x: 10, y: 10, w: 460, h: 330 } : { x: 14, y: 14, w: 772, h: 342 };
  const DFG = PHONE ? { x: 10, y: 350, w: 460, h: 150 } : { x: 14, y: 368, w: 380, h: 178 };
  const DFI = PHONE ? { x: 10, y: 510, w: 460, h: 120 } : { x: 406, y: 368, w: 380, h: 178 };
  const hMid = (P) => P.y + (PHONE ? 176 : 184);
  function bgZones(P, mid) {
    ctx.save(); D.roundRect(P.x, P.y, P.w, P.h, 18); ctx.clip();
    const g1 = ctx.createLinearGradient(0, P.y, 0, mid); g1.addColorStop(0, '#e1f1fc'); g1.addColorStop(1, '#cfe6f7'); ctx.fillStyle = g1; ctx.fillRect(P.x, P.y, P.w, mid - P.y);
    const g2 = ctx.createLinearGradient(0, mid, 0, P.y + P.h); g2.addColorStop(0, '#f6efd6'); g2.addColorStop(1, '#efe3b8'); ctx.fillStyle = g2; ctx.fillRect(P.x, mid, P.w, P.y + P.h - mid);
    ctx.restore();
    ctx.strokeStyle = 'rgba(30,90,150,.3)'; ctx.lineWidth = 2; D.roundRect(P.x, P.y, P.w, P.h, 18); ctx.stroke();
    T(P.x + 16, P.y + 28, '세포 밖', 15, '#1d4f91', 'left', 800); T(P.x + 16, P.y + P.h - 12, '세포 안', 15, '#92400e', 'left', 800);
  }
  /* 인지질 이중층 (가로) : skip = 단백질 x 좌표들 */
  function hMembrane(P, mid, skip, t) {
    const n = Math.floor((P.w - 20) / PSP);
    for (let i = 0; i < n; i++) {
      const lx = P.x + 10 + PSP / 2 + i * PSP; if (skip.some((ox) => Math.abs(lx - ox) < 34)) continue;
      const wob = RM ? 0 : Math.sin(t * 1.7 + i * 1.9) * 1.1;
      drawLipid(lx, mid - 30 + wob, Math.PI / 2, { s: PLS, kink: i % 5 === 2 }); drawLipid(lx, mid + 30 - wob, -Math.PI / 2, { s: PLS, kink: i % 5 === 4 });
    }
  }
  /* 작은 그래프 틀 */
  function graphFrame(R, title, xLabel, xMax, yMax, xt, yt) {
    panel(R.x, R.y, R.w, R.h, 16, '#ffffff');
    T(R.x + 14, R.y + 24, title, L(14.5, 13), '#334155', 'left', 800);
    const x0 = R.x + 44, x1 = R.x + R.w - 18, y0 = R.y + R.h - 34, y1 = R.y + 40;
    ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1;
    yt.forEach((v) => { const yy = lerp(y0, y1, v / yMax); ctx.beginPath(); ctx.moveTo(x0, yy); ctx.lineTo(x1, yy); ctx.stroke(); T(x0 - 6, yy + 4, String(v), 11.5, '#64748b', 'right', 700); });
    xt.forEach((v) => { const xx = lerp(x0, x1, v / xMax); ctx.beginPath(); ctx.moveTo(xx, y0); ctx.lineTo(xx, y0 + 4); ctx.stroke(); T(xx, y0 + 16, String(v), 11.5, '#64748b', 'center', 700); });
    T((x0 + x1) / 2, y0 + 30, xLabel, 12, '#64748b', 'center', 700);
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x0, y1); ctx.lineTo(x0, y0); ctx.lineTo(x1, y0); ctx.stroke();
    return { x0, x1, y0, y1, X: (v) => lerp(x0, x1, v / xMax), Y: (v) => lerp(y0, y1, v / yMax) };
  }
  function flash(x, y, col) { FX.add({ kind: 'ring', x, y, life: 0.4, col: col || '#ef4444' }); }
  const _fxDraw = FX.draw;
  FX.draw = () => {
    _fxDraw();
    FX.list.forEach((e) => {
      if (e.age < 0 || e.kind !== 'ring') return;
      const p = e.age / e.life; ctx.save(); ctx.globalAlpha = 1 - p; ctx.strokeStyle = e.col; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(e.x, e.y, 5 + p * 14, 0, TAU); ctx.stroke(); ctx.restore();
    });
  };

  /* =========================================================
     ① 확산 : 막을 사이에 둔 입자 모형
     ========================================================= */
  S.df = { sp: 'o2', ci: 3, ps: [], contacts: { o2: 0, glc: 0, na: 0 }, cross: { o2: 0, glc: 0, na: 0 }, rec: [], acc: 0 };
  const dfC = () => CONC[S.df.ci];
  const ZB = () => { const mid = hMid(DFP); return { mid, top: DFP.y + 46, c1: mid - 40, c2: mid + 40, bot: DFP.y + DFP.h - 20, l: DFP.x + 18, r: DFP.x + DFP.w - 18 }; };
  function dfSpawn(zone, fade) {
    const z = ZB(), rr = Math.random, sp = 55 + rr() * 40, a = rr() * TAU;
    const p = { x: z.l + rr() * (z.r - z.l), y: zone === 'out' ? z.top + 8 + rr() * (z.c1 - z.top - 20) : z.c2 + 14 + rr() * (z.bot - z.c2 - 20), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, st: zone, a: fade ? 0 : 1, age: 0, cd: 0, sp: S.df.sp };
    return p;
  }
  function dfRebuild() {
    S.df.ps = []; for (let i = 0; i < dfC(); i++) S.df.ps.push(dfSpawn('out', false)); updateCtl();
  }
  function dfClear() {
    S.df.contacts = { o2: 0, glc: 0, na: 0 }; S.df.cross = { o2: 0, glc: 0, na: 0 }; S.df.rec = []; dfRebuild();
  }
  function dfRecord() {
    if (S.df.sp !== 'o2') { showHint('속도는 막을 직접 통과하는 O₂로 측정해요. 입자를 O₂로 바꿔 주세요.', 3500); return; }
    const c = dfC(), i = S.df.rec.findIndex((q) => q.c === c); const q = { c, r: rateSimple(S.df.ci) };
    if (i >= 0) S.df.rec[i] = q; else S.df.rec.push(q);
    S.df.rec.sort((a, b) => a.c - b.c); Sound.success(); parts.burst(DFG.x + DFG.w / 2, DFG.y + DFG.h / 2, { count: 8, speed: 120, size: 3 }); updateCtl();
  }
  const dfTested = (sp) => (sp === 'o2' ? S.df.cross.o2 >= 3 : S.df.contacts[sp] >= 8);
  function dfUpdate(dt) {
    const z = ZB(), D0 = S.df;
    const canCross = D0.sp === 'o2' ? 0.45 : 0;
    D0.ps.forEach((p) => {
      if (!(p.st === 'in' && p.age > 2.4)) p.a = Math.min(1, p.a + dt * 2.5);
      p.cd = Math.max(0, p.cd - dt);
      if (p.st === 'band') { p.y += p.bv * dt; p.x += p.vx * 0.15 * dt; if (p.bv > 0 && p.y >= z.c2 + 4) { p.st = 'in'; p.age = 0; p.vy = 40 + Math.random() * 30; D0.cross[p.sp]++; } else if (p.bv < 0 && p.y <= z.c1 - 4) { p.st = 'out'; p.vy = -(40 + Math.random() * 30); D0.cross[p.sp]++; } return; }
      p.vx += (Math.random() - 0.5) * 380 * dt; p.vy += (Math.random() - 0.5) * 380 * dt;
      const sp = Math.hypot(p.vx, p.vy) || 1, tgt = clamp(sp, 45, 95); p.vx *= tgt / sp; p.vy *= tgt / sp;
      if (!RM || true) { p.x += p.vx * dt; p.y += p.vy * dt; }
      if (p.x < z.l) { p.x = z.l; p.vx = Math.abs(p.vx); } if (p.x > z.r) { p.x = z.r; p.vx = -Math.abs(p.vx); }
      if (p.st === 'out') {
        if (p.y < z.top) { p.y = z.top; p.vy = Math.abs(p.vy); }
        if (p.y > z.c1) {
          D0.contacts[p.sp]++;
          if (Math.random() < canCross) { p.st = 'band'; p.bv = 150; p.y = z.c1; }
          else { p.y = z.c1; p.vy = -Math.abs(p.vy); if (p.sp !== 'o2' || true) flash(p.x, z.c1, p.sp === 'o2' ? '#94a3b8' : '#ef4444'); }
        }
      } else {
        p.age += dt;
        if (p.y > z.bot) { p.y = z.bot; p.vy = -Math.abs(p.vy); }
        if (p.y < z.c2) { if (Math.random() < canCross * 0.6) { p.st = 'band'; p.bv = -150; p.y = z.c2; } else { p.y = z.c2; p.vy = Math.abs(p.vy); } }
        if (p.age > 2.4) p.a -= dt * 1.4;    // 세포 안에서 쓰여 사라져요
      }
    });
    D0.ps = D0.ps.filter((p) => !(p.st === 'in' && p.age > 2.4 && p.a <= 0));
    const outN = D0.ps.filter((p) => p.st === 'out' || (p.st === 'band' && p.bv > 0)).length;
    D0.acc += dt;
    if (outN < dfC() && D0.acc > 0.12) { D0.acc = 0; D0.ps.push(dfSpawn('out', true)); }
  }
  function dfDraw(dt, t) {
    dfUpdate(dt);
    const z = ZB(), P = DFP, mid = z.mid;
    bgZones(P, mid); hMembrane(P, mid, [], t);
    D.label(P.x + P.w - 110, P.y + 24, '바깥 농도 ' + dfC(), { bg: '#1d4f91', size: 13.5 });
    D.label(P.x + P.w - 100, P.y + P.h - 22, '안 농도 0 (바로 사용)', { bg: '#92400e', size: 12.5 });
    // 순 이동 화살표
    const r = S.df.sp === 'o2' ? rateSimple(S.df.ci) : 0;
    if (r > 0) { ctx.save(); ctx.globalAlpha = 0.5; D.arrow(P.x + P.w - 44, mid - 100, P.x + P.w - 44, mid + 100, { color: '#16a34a', width: 3 + r * 0.35 }); ctx.restore(); T(P.x + P.w - 44, mid - 108, '순 이동', 12.5, '#15803d', 'center', 800); }
    S.df.ps.forEach((p) => { if (p.a > 0) drawMol(p.sp, p.x, p.y, 1.05, clamp(p.a, 0, 1)); });
    if (S.df.sp !== 'o2') D.label(P.x + P.w / 2, mid, '막 단백질이 없어서 이중층을 지나가지 못해요', { bg: 'rgba(255,255,255,.92)', color: '#b91c1c', border: '#fca5a5', size: 13.5 });
    // 그래프
    const g = graphFrame(DFG, '상대 속도 – 바깥 농도 (O₂)', '바깥 농도 (상대값)', 32, 32, [0, 8, 16, 24, 32], [0, 8, 16, 24, 32]);
    D.dashedLine(g.X(0), g.Y(0), g.X(32), g.Y(32), { color: '#94a3b8', width: 1.6, dash: [5, 5] });
    if (S.df.rec.length > 1) { ctx.strokeStyle = '#16a34a'; ctx.lineWidth = 2.6; ctx.beginPath(); S.df.rec.forEach((q, i) => { if (i) ctx.lineTo(g.X(q.c), g.Y(q.r)); else ctx.moveTo(g.X(q.c), g.Y(q.r)); }); ctx.stroke(); }
    S.df.rec.forEach((q) => { D.sphere(g.X(q.c), g.Y(q.r), 6, '#16a34a', { gloss: true }); });
    if (!S.df.rec.length) T(g.x1 - 4, g.y1 + 40, '[📝 속도 기록]으로 점을 찍어요', 12.5, '#64748b', 'right', 700);
    // 정보
    panel(DFI.x, DFI.y, DFI.w, DFI.h, 16, '#ffffff');
    const I = DFI;
    T(I.x + 14, I.y + 26, '고른 입자: ' + SPN[S.df.sp], L(16, 14.5), '#1f2d44', 'left', 800);
    TF(I.x + 14, I.y + 52, '바깥 ' + dfC() + ' − 안 0 = 농도 차 ' + dfC(), I.w - 28, L(14.5, 13.5), 12, '#475569', 'left', 800);
    TF(I.x + 14, I.y + 76, '상대 속도: ' + r + (r ? ' (농도 차에 비례)' : ' (이동 없음)'), I.w - 28, L(14.5, 13.5), 12, r ? '#15803d' : '#b91c1c', 'left', 800);
    ['o2', 'glc', 'na'].forEach((sp, i) => {
      const x = I.x + 14 + i * (PHONE ? 148 : 120), y = I.y + L(112, 104), ok = dfTested(sp);
      TF(x, y, (ok ? (sp === 'o2' ? '✅ ' : '✅ ') : '⬜ ') + SPN[sp] + (ok ? (sp === 'o2' ? ' 통과' : ' 막힘') : ''), PHONE ? 140 : 114, 13.5, 11.5, ok ? '#15803d' : '#64748b', 'left', 800);
    });
    if (!PHONE) textBlock(I.x + 14, I.y + 140, I.w - 28, S.df.sp === 'o2' ? '작은 비극성 분자라 이중층을 직접 지나가요. 농도가 높은 곳에서 낮은 곳으로 가는 입자가 더 많아요.' : '크고 극성이거나 전하를 띤 입자는 막 단백질 없이 지나가지 못해요.', 12.5, '#64748b', 17, 700);
  }

  /* =========================================================
     ② 운반 단백질 : 통로 · 운반체, 포화 곡선
     ========================================================= */
  S.cr = { sp: 'glc', ci: 3, n: 2, ps: [], pr: [], rec: { glc: { 2: {}, 4: {} }, na: { 2: {}, 4: {} } }, acc: 0 };
  const crType = () => (S.cr.sp === 'glc' ? 'ca' : 'ch');
  const crC = () => CONC[S.cr.ci];
  const crX = (i, n) => DFP.x + DFP.w * (i + 0.5) / n;
  function crBuild() {
    const C0 = S.cr;
    C0.pr = []; for (let i = 0; i < C0.n; i++) C0.pr.push({ x: crX(i, C0.n), st: 'idle', t: 0, k: 0, occ: null });
    C0.ps = []; for (let i = 0; i < crC(); i++) C0.ps.push(crSpawn('out', false));
    updateCtl();
  }
  function crSpawn(zone, fade) {
    const z = ZB(), rr = Math.random, sp = 55 + rr() * 40, a = rr() * TAU;
    return { x: z.l + rr() * (z.r - z.l), y: zone === 'out' ? z.top + 8 + rr() * (z.c1 - z.top - 22) : z.c2 + 14 + rr() * (z.bot - z.c2 - 20), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, st: zone, a: fade ? 0 : 1, age: 0, sp: S.cr.sp };
  }
  const crBusy = () => S.cr.pr.filter((q) => q.st !== 'idle').length;
  function crUpdate(dt) {
    const C0 = S.cr, z = ZB(), isCa = crType() === 'ca';
    C0.pr.forEach((q) => {
      if (q.st === 'idle') { q.k = approach(q.k, 0, dt, 6); return; }
      q.t += dt;
      if (isCa) {
        if (q.st === 'bind') { q.k = 0; if (q.t > 0.5) { q.st = 'flip'; q.t = 0; } if (q.occ) { q.occ.x = approach(q.occ.x, q.x, dt, 10); q.occ.y = approach(q.occ.y, z.c1 + 4, dt, 10); } }
        else if (q.st === 'flip') { q.k = smooth(q.t / 0.9); if (q.occ) { q.occ.x = q.x; q.occ.y = lerp(z.c1 + 4, z.c2 - 4, q.k); } if (q.t > 0.9) { q.st = 'rel'; q.t = 0; } }
        else if (q.st === 'rel') { q.k = 1; if (q.occ && q.t > 0.35) { q.occ.st = 'in'; q.occ.age = 0; q.occ.vy = 45; q.occ.vx = (Math.random() - 0.5) * 60; q.occ = null; } if (q.t > 0.5) { q.st = 'back'; q.t = 0; } }
        else if (q.st === 'back') { q.k = 1 - smooth(q.t / 0.6); if (q.t > 0.6) { q.st = 'idle'; q.t = 0; q.k = 0; } }
      } else {
        if (q.st === 'bind') { if (q.occ) { q.occ.x = q.x; q.occ.y = lerp(z.c1 - 6, z.c2 + 4, clamp(q.t / 0.9, 0, 1)); } if (q.t > 0.9) { if (q.occ) { q.occ.st = 'in'; q.occ.age = 0; q.occ.vy = 45; q.occ = null; } q.st = 'idle'; q.t = 0; } }
      }
    });
    C0.ps.forEach((p) => {
      if (!(p.st === 'in' && p.age > 2.2)) p.a = Math.min(1, p.a + dt * 2.5);
      if (p.st === 'held') return;
      p.vx += (Math.random() - 0.5) * 380 * dt; p.vy += (Math.random() - 0.5) * 380 * dt;
      const sp = Math.hypot(p.vx, p.vy) || 1, tgt = clamp(sp, 45, 95); p.vx *= tgt / sp; p.vy *= tgt / sp;
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.x < z.l) { p.x = z.l; p.vx = Math.abs(p.vx); } if (p.x > z.r) { p.x = z.r; p.vx = -Math.abs(p.vx); }
      if (p.st === 'out') {
        if (p.y < z.top) { p.y = z.top; p.vy = Math.abs(p.vy); }
        if (p.y > z.c1 - 2) {
          const q = C0.pr.find((q) => q.st === 'idle' && Math.abs(q.x - p.x) < 24);
          if (q) { q.st = 'bind'; q.t = 0; q.occ = p; p.st = 'held'; }
          else { p.y = z.c1 - 2; p.vy = -Math.abs(p.vy); }
        }
      } else if (p.st === 'in') {
        p.age += dt; if (p.y > z.bot) { p.y = z.bot; p.vy = -Math.abs(p.vy); }
        if (p.y < z.c2 + 2) { p.y = z.c2 + 2; p.vy = Math.abs(p.vy); }
        if (p.age > 2.2) p.a -= dt * 1.4;
      }
    });
    C0.ps = C0.ps.filter((p) => !(p.st === 'in' && p.age > 2.2 && p.a <= 0));
    C0.acc += dt;
    const outN = C0.ps.filter((p) => p.st === 'out' || p.st === 'held').length;
    if (outN < crC() && C0.acc > 0.12) { C0.acc = 0; C0.ps.push(crSpawn('out', true)); }
  }
  function crRecord() {
    const C0 = S.cr, c = CONC[C0.ci]; C0.rec[C0.sp][C0.n][c] = rateFac(C0.ci, C0.n); Sound.success();
    parts.burst(DFG.x + DFG.w / 2, DFG.y + DFG.h / 2, { count: 8, speed: 120, size: 3 }); updateCtl();
  }
  const crRecCount = (sp, n) => Object.keys(S.cr.rec[sp][n]).length;
  function crDraw(dt, t) {
    crUpdate(dt);
    const C0 = S.cr, z = ZB(), P = DFP, mid = z.mid, type = crType();
    bgZones(P, mid); hMembrane(P, mid, C0.pr.map((q) => q.x), t);
    D.label(P.x + P.w - 110, P.y + 24, '바깥 농도 ' + crC(), { bg: '#1d4f91', size: 13.5 });
    C0.pr.forEach((q) => { drawProt(type, q.x, mid, { k: type === 'ca' ? q.k : 0 }); });
    C0.pr.forEach((q) => { if (q.st !== 'idle' && PHONE === false && false) D.glow(q.x, mid, 40, '#fde047', 0.4); });
    D.label(P.x + P.w / 2, P.y + P.h - 22, (type === 'ca' ? '운반체 단백질 ' : '통로 단백질 ') + C0.n + '개 · 사용 중 ' + crBusy() + '개', { bg: type === 'ca' ? PROT.ca.col : PROT.ch.col, size: 13 });
    C0.ps.forEach((p) => { if (p.a > 0) drawMol(p.sp, p.x, p.y, 1.05, clamp(p.a, 0, 1)); });
    // 대기: 사용 중인 단백질 위에서 줄 서 있는 입자 표시
    const r = rateFac(C0.ci, C0.n), mx = 52;
    const g = graphFrame(DFG, '상대 속도 – 바깥 농도 (' + SPN[C0.sp] + ')', '바깥 농도 (상대값)', 32, 56, [0, 8, 16, 24, 32], [0, 14, 28, 42, 56]);
    D.dashedLine(g.X(0), g.Y(0), g.X(32), g.Y(32), { color: '#cbd5e1', width: 1.6, dash: [5, 5] }); T(g.X(30), g.Y(32) - 6, '단순 확산', 11.5, '#94a3b8', 'right', 700);
    [[2, '#0d9488'], [4, '#ea580c']].forEach(([n, col]) => {
      const pts = Object.keys(C0.rec[C0.sp][n]).map(Number).sort((a, b) => a - b).map((c) => ({ c, r: C0.rec[C0.sp][n][c] }));
      if (pts.length > 1) { ctx.strokeStyle = col; ctx.lineWidth = 2.6; ctx.beginPath(); pts.forEach((q, i) => { if (i) ctx.lineTo(g.X(q.c), g.Y(q.r)); else ctx.moveTo(g.X(q.c), g.Y(q.r)); }); ctx.stroke(); }
      pts.forEach((q) => D.sphere(g.X(q.c), g.Y(q.r), 5.5, col, { gloss: true }));
    });
    D.label(g.x0 + 70, g.y1 + 8, '● 2개', { bg: '#0d9488', size: 11.5 }); D.label(g.x0 + 130, g.y1 + 8, '● 4개', { bg: '#ea580c', size: 11.5 });
    panel(DFI.x, DFI.y, DFI.w, DFI.h, 16, '#ffffff');
    const I = DFI;
    T(I.x + 14, I.y + 26, '고른 입자: ' + SPN[C0.sp] + ' (' + (type === 'ca' ? '운반체' : '통로') + ')', L(16, 14.5), '#1f2d44', 'left', 800);
    TF(I.x + 14, I.y + 52, '바깥 농도 ' + crC() + ' · 단백질 ' + C0.n + '개', I.w - 28, L(14.5, 13.5), 12, '#475569', 'left', 800);
    TF(I.x + 14, I.y + 78, '상대 속도: ' + r + (r === rateFac(5, C0.n) && C0.ci >= 4 ? ' (최대 속도)' : ''), I.w - 28, L(16, 14.5), 12, '#0f766e', 'left', 800);
    TF(I.x + 14, I.y + L(104, 102), '측정한 점: 2개 ' + crRecCount(C0.sp, 2) + '/6 · 4개 ' + crRecCount(C0.sp, 4) + '/6', I.w - 28, 13.5, 11.5, '#64748b', 'left', 800);
    if (!PHONE) textBlock(I.x + 14, I.y + 128, I.w - 28, C0.ci >= 4 ? '단백질이 쉴 틈 없이 일해서 농도를 더 높여도 속도가 늘지 않아요(포화).' : '농도가 낮을 때는 비어 있는 단백질이 많아 농도에 따라 속도가 늘어요.', 12.5, '#64748b', 17, 700);
  }


  /* =========================================================
     ③ 능동 수송 : Na⁺–K⁺ 펌프, 시안화물 실험, 뿌리털 이온 흡수
     ========================================================= */
  const PMP = PHONE ? { x: 10, y: 10, w: 460, h: 372 } : { x: 14, y: 14, w: 560, h: 430 };
  const PCON = PHONE ? { x: 10, y: 392, w: 460, h: 112 } : { x: 586, y: 14, w: 200, h: 430 };
  const PCAP = PHONE ? { x: 10, y: 514, w: 460, h: 116 } : { x: 14, y: 456, w: 772, h: 90 };
  const pmMid = () => PMP.y + (PHONE ? 188 : 214);
  const pmCx = () => PMP.x + PMP.w * 0.47;
  const PT_B = [0, 1.6, 4.0, 5.2, 7.0, 9.4], PT_T = 9.4;
  const PSTEP = ['Na⁺ 3개가 세포 안쪽에서 펌프에 결합해요.', 'ATP가 결합해 인산이 펌프에 붙고(ADP + P) 펌프의 모양이 바뀌어요.', '펌프가 세포 바깥쪽으로 열리며 Na⁺ 3개를 내보내요.', '바깥쪽의 K⁺ 2개가 결합하면 인산이 떨어져 나가요.', '펌프가 원래 모양으로 돌아오며 K⁺ 2개를 세포 안으로 들여보내요.'];
  S.pp = { t: 0, run: null, target: 0, cycles: 0, stepIdx: 0, steps: new Set() };
  function ppFinish() {
    const q = S.pp; q.cycles++; q.t = 0; q.run = null; q.stepIdx = 0; Sound.success();
    parts.burst(pmCx(), pmMid(), { count: 18, speed: 180, size: 3.5 }); updateCtl();
  }
  function ppAuto() { const q = S.pp; if (q.run === 'auto') return; q.run = 'auto'; Sound.click(); updateCtl(); }
  function ppStep() {
    const q = S.pp; if (q.run) return;
    const idx = Math.min(4, ppSeg()); q.stepIdx = idx; q.target = PT_B[idx + 1]; q.run = 'step'; Sound.click(); updateCtl();
  }
  function ppReset() { const q = S.pp; q.t = 0; q.run = null; q.cycles = 0; q.stepIdx = 0; updateCtl(); }
  function ppUpdate(dt) {
    const q = S.pp; if (!q.run) return;
    if (q.run === 'auto') { q.t += dt * (RM ? 2 : 1); if (q.t >= PT_T) ppFinish(); }
    else { q.t = Math.min(q.target, q.t + dt * (RM ? 2 : 1)); if (q.t >= q.target - 1e-6) { if (q.target >= PT_T - 1e-6) ppFinish(); else { q.run = null; updateCtl(); } } }
  }
  const ppSeg = () => { const t = S.pp.t; let s = 0; for (let i = 0; i < 5; i++) if (t >= PT_B[i]) s = i; return s; };
  function pumpState(t) {
    const cx = pmCx(), mid = pmMid(), ss = (a, b) => smooth((t - a) / (b - a));
    const f = ss(2.8, 4.0) - ss(7.0, 8.2), o = -1 + 2 * f, out = {};
    out.o = o; out.f = f;
    out.na = [0, 1, 2].map((k) => {
      const sx = cx + (k - 1) * 46, sy = mid + 112 + (k % 2) * 14, bx = cx + (k - 1) * 11, by0 = mid + 16, by1 = mid - 16;
      if (t < 4.0) { const pq = smooth(clamp((t - 0.15 * k) / 1.3, 0, 1)); return { x: lerp(sx, bx, pq), y: t > 2.8 ? lerp(by0, by1, f) : lerp(sy, by0, pq) }; }
      const q = smooth(clamp((t - 4.0 - 0.1 * k) / 1.1, 0, 1)); return { x: lerp(bx, cx + (k - 1) * 50, q), y: lerp(by1, mid - 118 - (k % 2) * 14, q) };
    });
    out.k = [0, 1].map((k) => {
      const sx = cx + (k - 0.5) * 60, sy = mid - 122 + (k % 2) * 12, bx = cx + (k - 0.5) * 11, bt = mid - 16, bb = mid + 16;
      if (t < 5.2) return { x: sx, y: sy };
      if (t < 7.0) { const q = smooth(clamp((t - 5.2 - 0.1 * k) / 1.0, 0, 1)); return { x: lerp(sx, bx, q), y: lerp(sy, bt, q) }; }
      if (t < 8.2) return { x: bx, y: lerp(bb, bt, f) };
      const q = smooth(clamp((t - 8.2 - 0.1 * k) / 1.1, 0, 1)); return { x: lerp(bx, sx, q), y: lerp(bb, mid + 118 + (k % 2) * 12, q) };
    });
    // ATP · ADP · 인산
    out.atp = null; out.adp = null; out.p = null;
    if (t < 1.6) out.atp = { x: cx + 150, y: mid + 100, a: 1 };
    if (t >= 1.6 && t < 2.5) { const q = ss(1.6, 2.4); out.atp = { x: lerp(cx + 150, cx + 52, q), y: lerp(mid + 100, mid + 66, q), a: 1 }; }
    if (t >= 2.5) { const q = ss(2.5, 3.6); if (t < 3.6) out.adp = { x: lerp(cx + 52, cx + 140, q), y: lerp(mid + 66, mid + 112, q), a: 1 - ss(3.0, 3.6) }; }
    if (t >= 2.6 && t < 6.2) out.p = { x: cx + 34, y: mid + 56, a: 1 };
    if (t >= 6.2 && t < 7.4) { const q = ss(6.2, 7.2); out.p = { x: lerp(cx + 34, cx + 80, q), y: lerp(mid + 56, mid + 112, q), a: 1 - ss(6.8, 7.4) }; }
    return out;
  }
  function drawPump(cx, mid, o, sc) {
    sc = sc || 1; const u = (o + 1) / 2, wt = lerp(10, 56, u), wb = lerp(56, 10, u), h = 100, w = 104;
    ctx.save(); ctx.translate(cx, mid); ctx.scale(sc, sc);
    const g = ctx.createLinearGradient(-w / 2, 0, w / 2, 0); g.addColorStop(0, '#2dd4bf'); g.addColorStop(0.5, '#0f766e'); g.addColorStop(1, '#115e59');
    D.roundRect(-w / 2, -h / 2, w, h, 20); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = '#0b4a46'; ctx.lineWidth = 2; ctx.stroke();
    const cg = ctx.createLinearGradient(0, -h / 2, 0, h / 2); cg.addColorStop(0, '#d9edfb'); cg.addColorStop(1, '#f6efd6');
    ctx.beginPath(); ctx.moveTo(-wt / 2, -h / 2 - 1); ctx.lineTo(wt / 2, -h / 2 - 1); ctx.lineTo(wb / 2, h / 2 + 1); ctx.lineTo(-wb / 2, h / 2 + 1); ctx.closePath(); ctx.fillStyle = cg; ctx.fill(); ctx.strokeStyle = 'rgba(11,74,70,.55)'; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.restore();
  }
  function ionNa(x, y, s) { D.sphere(x, y, 6.5 * (s || 1), '#a855f7', { gloss: true, text: '+', textScale: 1.4 }); }
  function ionK(x, y, s) { D.sphere(x, y, 7 * (s || 1), '#ec4899', { gloss: true, text: '+', textScale: 1.4 }); }
  function chip(x, y, label, col, a) {
    ctx.save(); if (a != null) ctx.globalAlpha = a; D.roundRect(x - 20, y - 10, 40, 20, 8); ctx.fillStyle = col; ctx.fill(); ctx.strokeStyle = C.shade(col, -0.4); ctx.lineWidth = 1.4; ctx.stroke();
    T(x, y + 4.5, label, 11.5, '#fff', 'center', 800); ctx.restore();
  }
  function ppDraw(dt, t) {
    ppUpdate(dt);
    const Q = S.pp, mid = pmMid(), cx = pmCx(), st = pumpState(Q.t), seg = Q.run === 'auto' ? ppSeg() : Q.stepIdx, busy = !!Q.run || Q.t > 0;
    bgZones(PMP, mid); hMembrane(PMP, mid, [cx], t);
    drawPump(cx, mid, st.o);
    if (!PHONE || true) { T(cx, mid - 62, 'Na⁺–K⁺ 펌프', 14, '#0b4a46', 'center', 800, { stroke: 'rgba(255,255,255,.85)', strokeWidth: 3 }); }
    // 바깥에 있는 이온 (장식) : 바깥 Na⁺ 많음, 안쪽 K⁺ 많음
    const dec = [[PMP.x + 60, -90, 'na'], [PMP.x + 130, -60, 'na'], [PMP.x + PMP.w - 70, -85, 'na'], [PMP.x + PMP.w - 150, -105, 'na'], [PMP.x + 100, -120, 'na'], [PMP.x + PMP.w - 100, -50, 'na'], [PMP.x + PMP.w - 60, 95, 'k'], [PMP.x + 70, 100, 'k'], [PMP.x + 135, 130, 'k'], [PMP.x + PMP.w - 150, 120, 'k'], [PMP.x + 55, 60, 'k'], [PMP.x + PMP.w - 120, 70, 'k']];
    dec.forEach((d, i) => { const x = d[0] + Math.sin(t * 0.8 + i) * 6, y = mid + d[1] + Math.cos(t * 0.7 + i * 1.7) * 5; if (d[2] === 'na') ionNa(x, y); else ionK(x, y); });
    T(PMP.x + PMP.w - 12, PMP.y + 28, 'Na⁺ 밖에 많고, K⁺ 안에 많아요', 13, '#1d4f91', 'right', 800);
    st.na.forEach((p) => ionNa(p.x, p.y)); st.k.forEach((p) => ionK(p.x, p.y));
    if (st.atp) chip(st.atp.x, st.atp.y, 'ATP', '#d97706', st.atp.a);
    if (st.adp) chip(st.adp.x, st.adp.y, 'ADP', '#b45309', st.adp.a);
    if (st.p) { ctx.save(); ctx.globalAlpha = st.p.a; D.sphere(st.p.x, st.p.y, 7, '#facc15', { gloss: true, text: 'P', textScale: 1.2, textColor: '#713f12' }); ctx.restore(); }
    if (Q.t > 2.4 && Q.t < 3.0) D.glow(cx + 40, mid + 60, 38, '#fde047', 0.8);
    // 이온 이름표
    if (!PHONE) { T(cx - 120, mid + 150, '세포 안 Na⁺ (적음)', 12.5, '#6b21a8', 'left', 800); }
    // 농도 막대
    panel(PCON.x, PCON.y, PCON.w, PCON.h, 16, '#ffffff');
    const bars = [['Na⁺', '#a855f7', 10, 145], ['K⁺', '#ec4899', 140, 4]];
    if (!PHONE) {
      T(PCON.x + 14, PCON.y + 26, '세포 안팎 농도 (mM)', 14.5, '#334155', 'left', 800);
      const by = PCON.y + 300, bh = 210, bw = 34;
      bars.forEach((b, gi) => {
        const gx = PCON.x + 30 + gi * 90;
        [['안', b[2]], ['밖', b[3]]].forEach((q, qi) => {
          const x = gx + qi * 40, h = Math.max(3, bh * q[1] / 150);
          D.roundRect(x, by - bh, bw, bh, 6); ctx.fillStyle = '#eef2f7'; ctx.fill();
          D.roundRect(x, by - h, bw, h, 6); ctx.fillStyle = b[1]; ctx.fill();
          T(x + bw / 2, by + 16, q[0], 13, '#475569', 'center', 800); T(x + bw / 2, by - h - 6, String(q[1]), 13, '#1f2d44', 'center', 800);
        });
        D.label(gx + 37, by + 44, b[0], { bg: b[1], size: 13.5 });
      });
      textBlock(PCON.x + 12, by + 72, PCON.w - 24, '두 이온 모두 낮은 쪽 → 높은 쪽! 펌프가 ATP로 이 차이를 유지해요.', 12.5, '#64748b', 17, 700);
    } else {
      T(PCON.x + 14, PCON.y + 22, '세포 안팎 농도 (mM)', 13.5, '#334155', 'left', 800);
      bars.forEach((b, gi) => {
        [['안', b[2]], ['밖', b[3]]].forEach((q, qi) => {
          const x = PCON.x + 12 + gi * 232, y = PCON.y + 34 + qi * 28, wmax = 118, w = Math.max(3, wmax * q[1] / 150);
          T(x, y + 14, b[0] + ' ' + q[0], 12.5, '#475569', 'left', 800);
          D.roundRect(x + 58, y, wmax, 20, 6); ctx.fillStyle = '#eef2f7'; ctx.fill(); D.roundRect(x + 58, y, w, 20, 6); ctx.fillStyle = b[1]; ctx.fill(); T(x + 58 + w + 6, y + 15, String(q[1]), 12.5, '#1f2d44', 'left', 800);
        });
      });
    }
    // 단계 설명
    panel(PCAP.x, PCAP.y, PCAP.w, PCAP.h, 16, '#ffffff');
    const ws = (PCAP.w - 24) / 5;
    for (let i = 0; i < 5; i++) {
      const on = busy && seg === i, past = (busy && seg > i) || false, x = PCAP.x + 12 + i * ws;
      D.roundRect(x + 3, PCAP.y + 10, ws - 6, 24, 12); ctx.fillStyle = on ? '#0f766e' : past ? '#ccfbf1' : '#eef2f7'; ctx.fill();
      T(x + ws / 2, PCAP.y + 27, '' + (i + 1), 14, on ? '#fff' : '#334155', 'center', 800);
    }
    textBlock(PCAP.x + 16, PCAP.y + 54, PCAP.w - 32, busy ? PSTEP[seg] : '[⚡ 한 회전 실행] 또는 [⏭ 한 단계씩]을 눌러 펌프를 돌려 보세요.', L(15, 13.5), '#334155', L(21, 19), 800);
  }

  /* ----- 시안화물 실험 : 촉진 확산 vs 능동 수송 ----- */
  const CYL = PHONE ? { x: 10, y: 10, w: 460, h: 190 } : { x: 14, y: 14, w: 380, h: 358 };
  const CYR = PHONE ? { x: 10, y: 208, w: 460, h: 190 } : { x: 406, y: 14, w: 380, h: 358 };
  const CYB = PHONE ? { x: 10, y: 406, w: 460, h: 224 } : { x: 14, y: 384, w: 772, h: 162 };
  S.cy = { ci: 3, cn: false, atp: 1, seenT: 0, seen: false, units: [] };
  const cyRate = () => ({ fac: FAC[S.cy.ci], act: S.cy.atp < 0.03 ? 0 : Math.round(FAC[S.cy.ci] * S.cy.atp) });
  function cyReset() { S.cy.cn = false; S.cy.atp = 1; S.cy.seenT = 0; S.cy.seen = false; S.cy.units.forEach((u) => { u.t = u.off; }); updateCtl(); }
  function cyInit() { S.cy.units = []; for (let side = 0; side < 2; side++) for (let i = 0; i < 3; i++) S.cy.units.push({ side, i, t: i * 1.1 + side * 0.4, off: i * 1.1 + side * 0.4 }); }
  cyInit();
  function cyUnitDraw(P, mid, u, rate, kind, t) {
    const CYC = 2.6, wait = rate > 0.2 ? Math.max(0, CYC * (26 / rate - 1)) : 1e9;
    const x = P.x + P.w * (u.i + 0.5) / 3;
    let tt = u.t - (wait > 1e8 ? 1e9 : wait), ph = tt < 0 ? -1 : tt / CYC;
    if (ph < 0) {
      if (kind === 'fac') drawProt('ca', x, mid, { s: 0.75, k: 0 }); else drawPump(x, mid, -1, 0.6);
      return;
    }
    const k = clamp((ph - 0.2) / 0.45, 0, 1), kk = smooth(k);
    if (kind === 'fac') {
      drawProt('ca', x, mid, { s: 0.75, k: kk });
      let y; if (ph < 0.2) y = lerp(mid - 105, mid - 35, smooth(ph / 0.2)); else if (ph < 0.65) y = lerp(mid - 35, mid + 35, kk); else y = lerp(mid + 35, mid + 105, smooth((ph - 0.65) / 0.35));
      hex(x, y, 8, '#fde047');
    } else {
      drawPump(x, mid, -1 + 2 * kk, 0.6);
      let y; if (ph < 0.2) y = lerp(mid + 105, mid + 14, smooth(ph / 0.2)); else if (ph < 0.65) y = lerp(mid + 14, mid - 14, kk); else y = lerp(mid - 14, mid - 105, smooth((ph - 0.65) / 0.35));
      ionNa(x, y, 0.95);
      if (ph > 0.2 && ph < 0.4) { ctx.save(); ctx.globalAlpha = 1 - (ph - 0.2) / 0.2; D.glow(x + 30, mid + 40, 24, '#fde047', 0.8); ctx.restore(); }
    }
  }
  function cyDraw(dt, t) {
    const Y = S.cy, rt = cyRate();
    Y.atp = approach(Y.atp, Y.cn ? 0 : 1, dt, RM ? 99 : 0.9);
    if (Y.cn && Y.atp < 0.03) { Y.seenT += dt; if (Y.seenT > 1.5) Y.seen = true; }
    const r = { fac: rt.fac, act: rt.act };
    Y.units.forEach((u) => {
      const rate = u.side ? r.act : r.fac, CYC = 2.6, wait = rate > 0.2 ? Math.max(0, CYC * (26 / rate - 1)) : 1e9;
      if (wait < 1e8) { u.t += dt; if (u.t > wait + CYC) u.t -= wait + CYC; } else u.t = u.off - 1e3;
    });
    [[CYL, 0], [CYR, 1]].forEach(([P, side]) => {
      const mid = P.y + P.h / 2;
      bgZones(P, mid); const xs = [0, 1, 2].map((i) => P.x + P.w * (i + 0.5) / 3); hMembrane(P, mid, xs, t);
      Y.units.filter((u) => u.side === side).forEach((u) => cyUnitDraw(P, mid, u, side ? r.act : r.fac, side ? 'act' : 'fac', t));
      D.label(P.x + P.w / 2, P.y + 24, side ? '능동 수송 (펌프)' : '촉진 확산 (운반체)', { bg: side ? '#0f766e' : '#0d9488', size: 14 });
      T(P.x + P.w - 12, P.y + P.h - 12, side ? 'ATP 필요: 낮은 → 높은 쪽' : '에너지 불필요: 높은 → 낮은 쪽', 12.5, '#475569', 'right', 800);
    });
    if (Y.cn) { const stopped = r.act === 0; D.label(CYR.x + CYR.w / 2, CYR.y + 60, stopped ? 'ATP가 없어 펌프가 멈췄어요' : 'ATP가 줄어 펌프가 느려져요', { bg: stopped ? '#dc2626' : '#f59e0b', size: 13.5 }); }
    // 아래 : 속도 막대와 ATP
    panel(CYB.x, CYB.y, CYB.w, CYB.h, 16, '#ffffff');
    const B = CYB, bx = B.x + 16, bw = B.w - 32;
    const rowY = (i) => B.y + 12 + i * (PHONE ? 48 : 36);
    [['촉진 확산 속도', r.fac, '#0d9488'], ['능동 수송 속도', r.act, '#0f766e']].forEach((q, i) => {
      const y = rowY(i); T(bx, y + 14, q[0] + ': ' + q[1], 15, '#1f2d44', 'left', 800);
      D.roundRect(bx + (PHONE ? 0 : 190), y + (PHONE ? 22 : 0), bw - (PHONE ? 0 : 190), 18, 9); ctx.fillStyle = '#e5e7eb'; ctx.fill();
      if (q[1] > 0) { D.roundRect(bx + (PHONE ? 0 : 190), y + (PHONE ? 22 : 0), Math.max(18, (bw - (PHONE ? 0 : 190)) * q[1] / 30), 18, 9); ctx.fillStyle = q[2]; ctx.fill(); }
    });
    const ay = rowY(2) + (PHONE ? 10 : 0);
    T(bx, ay + 14, '세포호흡으로 만든 ATP: ' + Math.round(Y.atp * 100) + ' %', 15, Y.atp > 0.5 ? '#15803d' : '#b91c1c', 'left', 800);
    D.roundRect(bx + (PHONE ? 0 : 250), ay + (PHONE ? 22 : 0), bw - (PHONE ? 0 : 250), 18, 9); ctx.fillStyle = '#e5e7eb'; ctx.fill();
    if (Y.atp > 0.01) { D.roundRect(bx + (PHONE ? 0 : 250), ay + (PHONE ? 22 : 0), Math.max(18, (bw - (PHONE ? 0 : 250)) * Y.atp), 18, 9); ctx.fillStyle = Y.atp > 0.5 ? '#22c55e' : '#f59e0b'; ctx.fill(); }
    textBlock(bx, B.y + B.h - (PHONE ? 38 : 30), bw, Y.cn ? (Y.atp < 0.1 ? '시안화물이 세포호흡을 막아 ATP가 사라졌어요. 능동 수송은 멈췄지만 촉진 확산은 그대로예요.' : '시안화물이 세포호흡을 막고 있어요. ATP가 줄어들고 있어요…') : '바깥 농도 ' + CONC[Y.ci] + ' 에서 두 수송의 속도가 같아요. [🧪 시안화물 넣기]를 눌러 비교해요.', L(14, 13), '#475569', L(19, 18), 800);
  }

  /* ----- 뿌리털 이온 흡수 ----- */
  const RTP = PHONE ? { x: 10, y: 10, w: 460, h: 330 } : { x: 14, y: 14, w: 520, h: 410 };
  const RTB = PHONE ? { x: 10, y: 350, w: 460, h: 150 } : { x: 546, y: 14, w: 240, h: 410 };
  const RTC = PHONE ? { x: 10, y: 510, w: 460, h: 120 } : { x: 14, y: 436, w: 772, h: 110 };
  const RT_V = { air: 100, n2: 20 };
  S.rt = { cond: 'air', run: false, prog: 0, val: { air: null, n2: null }, ions: [] };
  function rtStart() { if (S.rt.run) return; S.rt.run = true; S.rt.prog = 0; S.rt.ions = []; Sound.click(); updateCtl(); }
  function rtReset() { S.rt.run = false; S.rt.prog = 0; S.rt.val = { air: null, n2: null }; S.rt.ions = []; updateCtl(); }
  function rtDraw(dt, t) {
    const R = S.rt, P = RTP;
    if (R.run) {
      R.prog = Math.min(1, R.prog + dt / 4.5);
      const v = RT_V[R.cond] / 100, spawnRate = 3 + 14 * v;
      R.sa = (R.sa || 0) + dt * spawnRate; while (R.sa > 1) { R.sa -= 1; R.ions.push({ p: 0, y: P.y + 160 + Math.random() * (P.h - 230), sd: Math.random() < 0.5 ? -1 : 1 }); }
      if (R.prog >= 1) { R.run = false; R.val[R.cond] = RT_V[R.cond]; Sound.success(); parts.burst(P.x + P.w / 2, P.y + P.h / 2, { count: 12, speed: 140, size: 3 }); updateCtl(); }
    }
    R.ions.forEach((q) => { q.p += dt * 0.8; }); R.ions = R.ions.filter((q) => q.p < 1);
    // 토양 용액 + 뿌리털
    ctx.save(); D.roundRect(P.x, P.y, P.w, P.h, 18); ctx.clip();
    const g1 = ctx.createLinearGradient(0, P.y, 0, P.y + P.h); g1.addColorStop(0, '#d8ecf9'); g1.addColorStop(1, '#bcdcf1'); ctx.fillStyle = g1; ctx.fillRect(P.x, P.y, P.w, P.h);
    ctx.restore(); ctx.strokeStyle = 'rgba(30,90,150,.3)'; ctx.lineWidth = 2; D.roundRect(P.x, P.y, P.w, P.h, 18); ctx.stroke();
    T(P.x + 16, P.y + 28, '토양 용액 (' + (R.cond === 'air' ? '공기를 불어넣음' : '질소를 불어넣음') + ')', L(15, 13.5), '#1d4f91', 'left', 800);
    // 기포
    for (let k = 0; k < 9; k++) { const bx = P.x + 40 + k * (P.w - 80) / 8, by = P.y + P.h - ((t * 40 + k * 53) % (P.h - 60)); ctx.strokeStyle = R.cond === 'air' ? 'rgba(255,255,255,.9)' : 'rgba(120,120,160,.7)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(bx + Math.sin(t * 2 + k) * 6, by, 5 + (k % 3), 0, TAU); ctx.stroke(); }
    // 뿌리털 세포
    const cx = P.x + P.w * 0.5, top = P.y + 100, bot = P.y + P.h - 20, w = L(150, 150);
    const cg = ctx.createLinearGradient(cx - w / 2, 0, cx + w / 2, 0); cg.addColorStop(0, '#fef3c7'); cg.addColorStop(1, '#fde68a');
    D.roundRect(cx - w / 2, top, w, bot - top, 30); ctx.fillStyle = cg; ctx.fill(); ctx.strokeStyle = '#d97706'; ctx.lineWidth = 3; ctx.stroke();
    T(cx, top + 24, '뿌리털 세포', 14, '#92400e', 'center', 800);
    // 미토콘드리아와 ATP
    const atpRate = RT_V[R.cond] / 100;
    [[-34, 60], [30, 100], [-22, 150]].forEach((m, i) => {
      ctx.save(); ctx.translate(cx + m[0], top + m[1]); ctx.rotate(i * 0.7 - 0.3); D.roundRect(-18, -10, 36, 20, 10); ctx.fillStyle = '#fb923c'; ctx.fill(); ctx.strokeStyle = '#9a3412'; ctx.lineWidth = 1.6; ctx.stroke(); ctx.restore();
      if (R.run && atpRate > 0.5 && Math.floor(t * 3 + i) % 2 === 0) D.glow(cx + m[0], top + m[1], 22, '#fde047', 0.7);
    });
    T(cx, bot - 12, R.run ? 'ATP: ' + (atpRate > 0.5 ? '많이 만들어요' : '조금만 만들어요') : 'ATP', 12.5, '#92400e', 'center', 800);
    // 이온이 들어오는 장면 (왼쪽 · 오른쪽 막의 운반체)
    [-1, 1].forEach((sd) => {
      for (let k = 0; k < 3; k++) { const y = top + 60 + k * (bot - top - 100) / 2; drawProt('ca', cx + sd * (w / 2), y, { s: 0.42, k: 0 }); }
    });
    R.ions.forEach((q) => { const sd = q.sd, sx = cx + sd * (w / 2 + 70), ex = cx + sd * (w / 2 - 28); const x = lerp(sx, ex, smooth(q.p)); D.sphere(x, q.y, 5.5, '#16a34a', { gloss: true }); });
    T(P.x + 20, P.y + 66, 'NO₃⁻ 같은 무기 이온은', 12.5, '#166534', 'left', 700); T(P.x + 20, P.y + 84, '세포 안이 더 진해요', 12.5, '#166534', 'left', 700);
    // 오른쪽 막대
    panel(RTB.x, RTB.y, RTB.w, RTB.h, 16, '#ffffff');
    T(RTB.x + 14, RTB.y + 26, '이온 흡수량 (상대값)', 14.5, '#334155', 'left', 800);
    const by = RTB.y + RTB.h - (PHONE ? 30 : 56), bh = RTB.h - (PHONE ? 70 : 120);
    [['air', '공기', '#16a34a'], ['n2', '질소', '#64748b']].forEach((c, i) => {
      const x = RTB.x + RTB.w * (i === 0 ? 0.2 : 0.6), val = R.val[c[0]], cur = (R.run && R.cond === c[0]) ? RT_V[c[0]] * smooth(R.prog) : val;
      const bw = RTB.w * 0.2;
      D.roundRect(x, by - bh, bw, bh, 8); ctx.fillStyle = '#eef2f7'; ctx.fill();
      if (cur != null && cur > 0.5) { const h = Math.max(4, bh * cur / 100); D.roundRect(x, by - h, bw, h, 8); ctx.fillStyle = c[2]; ctx.fill(); T(x + bw / 2, by - h - 6, String(Math.round(cur)), 14, '#1f2d44', 'center', 800); }
      else T(x + bw / 2, by - bh / 2, '측정 전', 12.5, '#94a3b8', 'center', 800);
      T(x + bw / 2, by + 20, c[1], 14, '#475569', 'center', 800);
    });
    panel(RTC.x, RTC.y, RTC.w, RTC.h, 16, '#ffffff');
    const both = R.val.air != null && R.val.n2 != null;
    textBlock(RTC.x + 16, RTC.y + 30, RTC.w - 32, both ? '산소가 부족하면(질소) 세포호흡으로 만드는 ATP가 줄어 이온 흡수량이 크게 줄어요. (가상 예시 값)' : '공기와 질소를 불어넣은 용액에서 각각 [▶ 흡수량 측정]을 눌러 비교해 보세요. (가상 예시 값)', L(15, 13.5), both ? '#b91c1c' : '#475569', L(21, 19), 800);
  }


  /* =========================================================
     ④ 큰 물질 : 세포 내 섭취와 세포 외 배출 (소낭), 사례 분류
     ========================================================= */
  const BKP = PHONE ? { x: 10, y: 10, w: 460, h: 410 } : { x: 14, y: 14, w: 772, h: 392 };
  const BKI = PHONE ? { x: 10, y: 430, w: 460, h: 200 } : { x: 14, y: 418, w: 772, h: 128 };
  const BK = {
    phago: { name: '식세포 작용', who: '백혈구가 세균을 삼켜요', u: 8, steps: ['큰 입자가 세포막에 닿아요', '막이 입자를 감싸며 안으로 들어가요', '막이 떨어져 나가 소낭이 돼요', '소낭이 세포 안으로 이동해요'] },
    pino: { name: '음세포 작용', who: '세포가 액체 방울을 삼켜요', u: 4, steps: ['액체 방울이 세포막에 닿아요', '막이 방울을 감싸며 안으로 들어가요', '막이 떨어져 나가 작은 소낭이 돼요', '소낭이 세포 안으로 이동해요'] },
    exo: { name: '세포 외 배출', who: '이자 세포가 인슐린을 내보내요', u: 8, steps: ['분비 소낭이 세포막으로 이동해요', '소낭 막이 세포막과 융합해요', '내용물이 세포 밖으로 방출돼요', '소낭 막이 세포막의 일부가 돼요'] },
  };
  S.bk = { kind: 'phago', p: 0, play: false, done: {} };
  const BK_DUR = 7.5;
  function bkPlay(kind) { S.bk.kind = kind; S.bk.p = 0; S.bk.play = true; Sound.click(); updateCtl(); }
  const bkMid = () => BKP.y + (PHONE ? 200 : 190);
  const smooth01 = (a, b, x) => smooth((x - a) / (b - a));
  /* 장면 계산: q = 세포 내 섭취의 진행도(0~1). 세포 외 배출은 q = 1 - p 로 거꾸로 보여요 */
  function bkGeom(q) {
    const Dmax = 90; let Dd;
    if (q < 0.25) Dd = 0; else if (q < 0.6) Dd = Dmax * smooth01(0.25, 0.6, q); else Dd = Dmax * (1 - smooth01(0.6, 0.85, q));
    const vesOn = q >= 0.6, cy0 = Dmax - 18, cy = cy0 + 80 * smooth01(0.6, 1.0, q);
    return { D: Dd, vesOn, cy, vf: smooth01(0.55, 0.85, q), Dmax };
  }
  function bilayerPath(pts, w) {
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = HEADC; ctx.lineWidth = w; ctx.beginPath(); pts.forEach((q, i) => { if (i) ctx.lineTo(q[0], q[1]); else ctx.moveTo(q[0], q[1]); }); ctx.stroke();
    ctx.strokeStyle = TAILC; ctx.lineWidth = w * 0.52; ctx.beginPath(); pts.forEach((q, i) => { if (i) ctx.lineTo(q[0], q[1]); else ctx.moveTo(q[0], q[1]); }); ctx.stroke();
    ctx.restore();
  }
  function bkDraw(dt, t) {
    const B = S.bk, mid = bkMid(), x0 = BKP.x + BKP.w / 2, K = BK[B.kind], exo = B.kind === 'exo';
    if (B.play) { B.p = Math.min(1, B.p + dt / (BK_DUR * (RM ? 0.5 : 1))); if (B.p >= 1) { B.play = false; B.done[B.kind] = true; Sound.success(); parts.burst(x0, mid, { count: 16, speed: 170, size: 3 }); updateCtl(); } }
    const q = exo ? 1 - B.p : B.p, G = bkGeom(q);
    bgZones(BKP, mid);
    T(BKP.x + BKP.w - 14, BKP.y + 28, K.name + ': ' + K.who, L(15, 13.5), '#1f2d44', 'right', 800);
    // 세포막 (이중층)
    const pts = []; for (let x = BKP.x + 8; x <= BKP.x + BKP.w - 8; x += 5) pts.push([x, mid + G.D * Math.exp(-Math.pow((x - x0) / 62, 2))]);
    bilayerPath(pts, 22);
    // 소낭
    if (G.vesOn) {
      const vp = []; for (let a = 0; a <= TAU + 0.1; a += 0.2) vp.push([x0 + Math.cos(a) * 36, mid + G.cy + Math.sin(a) * 36]);
      ctx.save(); ctx.fillStyle = exo ? 'rgba(233,213,255,.8)' : 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.arc(x0, mid + G.cy, 36, 0, TAU); ctx.fill(); ctx.restore();
      bilayerPath(vp, 13);
    }
    // 화물
    const cargo = [];
    if (!exo) {
      let cyc;
      if (q < 0.25) cyc = lerp(mid - 130, mid - 26, smooth01(0, 0.25, q)); else if (q < 0.6) cyc = mid - 26 + (G.Dmax - 18 + 26) * smooth01(0.25, 0.6, q); else cyc = mid + G.cy;
      cargo.push({ x: x0, y: cyc, a: 1 });
    } else {
      for (let j = 0; j < 6; j++) {
        const jx = (j % 3 - 1) * 10, jy = (Math.floor(j / 3) - 0.5) * 10, rel = smooth01(0.4 + 0.015 * j, 0.78, B.p);
        let x = x0 + jx, y = mid + G.cy + jy;
        if (B.p < 0.4) { /* 소낭 안 */ } else { x = x0 + jx + (j - 2.5) * 22 * rel; y = lerp(mid + G.cy + jy, mid - 105 - (j % 3) * 14, rel); }
        cargo.push({ x, y, a: 1, dot: true });
      }
    }
    cargo.forEach((c) => {
      if (c.dot) { D.sphere(c.x, c.y, 5.4, '#7c3aed', { gloss: true }); return; }
      if (B.kind === 'phago') { ctx.save(); ctx.translate(c.x, c.y); ctx.scale(1.45, 1.45); D.roundRect(-20, -10, 40, 20, 10); ctx.fillStyle = '#16a34a'; ctx.fill(); ctx.strokeStyle = '#14532d'; ctx.lineWidth = 2; ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.beginPath(); ctx.arc(-8, -2, 2.4, 0, TAU); ctx.arc(2, 2, 2.4, 0, TAU); ctx.arc(10, -3, 2.4, 0, TAU); ctx.fill(); ctx.restore(); }
      else { ctx.save(); ctx.translate(c.x, c.y); ctx.scale(1.35, 1.35); const g = ctx.createRadialGradient(-4, -4, 2, 0, 0, 16); g.addColorStop(0, '#e0f2fe'); g.addColorStop(1, '#7dd3fc'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 15, 0, TAU); ctx.fill(); ctx.strokeStyle = '#0284c7'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.fillStyle = '#0369a1'; [[-5, -3], [4, -5], [2, 5], [-4, 5], [7, 2]].forEach((d) => { ctx.beginPath(); ctx.arc(d[0], d[1], 1.8, 0, TAU); ctx.fill(); }); ctx.restore(); }
    });
    if (!exo && !G.vesOn) { const c0 = cargo[0]; T(c0.x + 36, c0.y + 5, B.kind === 'phago' ? '세균' : '액체 방울', 13, '#475569', 'left', 800, { stroke: 'rgba(255,255,255,.8)', strokeWidth: 3 }); }
    if (G.vesOn) T(x0 + 48, mid + G.cy + 5, exo ? '분비 소낭 (인슐린)' : '소낭', 13.5, exo ? '#6b21a8' : '#475569', 'left', 800, { stroke: 'rgba(255,255,255,.85)', strokeWidth: 3 });
    // ATP 표시 (큰 물질 수송은 ATP 필요)
    const act = (q > 0.2 && q < 0.9 && B.play) ? 1 : 0;
    D.label(BKP.x + (PHONE ? 70 : 140), BKP.y + (PHONE ? 58 : 24), act && Math.floor(t * 4) % 2 ? '⚡ ATP 사용' : '⚡ ATP 필요', { bg: act ? '#f59e0b' : '#64748b', size: 13.5 });
    // 정보 패널
    panel(BKI.x, BKI.y, BKI.w, BKI.h, 16, '#ffffff');
    const I = BKI, step = B.p < 0.25 ? 0 : B.p < 0.55 ? 1 : B.p < 0.8 ? 2 : 3;
    const ves = Math.round(K.u * G.vf), plasma = 100 - ves;
    if (!PHONE) {
      const ws = (I.w - 32) / 4;
      for (let i = 0; i < 4; i++) { const on = (B.p > 0 || B.play) && step === i; D.roundRect(I.x + 16 + i * ws + 3, I.y + 12, ws - 6, 24, 12); ctx.fillStyle = on ? '#16a34a' : (B.p > 0 && step > i) ? '#dcfce7' : '#eef2f7'; ctx.fill(); T(I.x + 16 + i * ws + ws / 2, I.y + 29, '' + (i + 1), 14, on ? '#fff' : '#334155', 'center', 800); }
      TF(I.x + 16, I.y + 62, B.p > 0 || B.play ? K.steps[step] : '[▶ 시연]을 눌러 소낭이 만들어지는 과정을 보세요.', I.w - 32, 15, 12.5, '#1f2d44', 'left', 800);
      TF(I.x + 16, I.y + 92, '세포막 면적 ' + plasma + ' + 소낭 막 ' + ves + ' = 100 (처음 막 전체 = 100)', I.w - 32, 14.5, 12, '#475569', 'left', 800);
      const bx = I.x + 16, bw = I.w - 32; D.roundRect(bx, I.y + 102, bw, 14, 7); ctx.fillStyle = '#e5e7eb'; ctx.fill(); D.roundRect(bx, I.y + 102, Math.max(14, bw * plasma / 100), 14, 7); ctx.fillStyle = HEADC; ctx.fill(); if (ves > 0) { D.roundRect(bx + bw * plasma / 100, I.y + 102, Math.max(8, bw * ves / 100), 14, 7); ctx.fillStyle = TAILC; ctx.fill(); }
    } else {
      TF(I.x + 14, I.y + 28, B.p > 0 || B.play ? (step + 1) + '. ' + K.steps[step] : '[▶ 시연]을 눌러 보세요.', I.w - 28, 14.5, 12, '#1f2d44', 'left', 800);
      TF(I.x + 14, I.y + 62, '세포막 ' + plasma + ' + 소낭 막 ' + ves + ' = 100', I.w - 28, 14.5, 12, '#475569', 'left', 800);
      const bx = I.x + 14, bw = I.w - 28; D.roundRect(bx, I.y + 72, bw, 14, 7); ctx.fillStyle = '#e5e7eb'; ctx.fill(); D.roundRect(bx, I.y + 72, Math.max(14, bw * plasma / 100), 14, 7); ctx.fillStyle = HEADC; ctx.fill(); if (ves > 0) { D.roundRect(bx + bw * plasma / 100, I.y + 72, Math.max(8, bw * ves / 100), 14, 7); ctx.fillStyle = TAILC; ctx.fill(); }
      textBlock(I.x + 14, I.y + 118, I.w - 28, '소낭이 만들어지거나 융합해도 막 전체의 넓이는 일정해요.', 13, '#64748b', 18, 700);
    }
  }
  const bkDone = () => Object.keys(S.bk.done).length;

  /* ----- 사례 9장 분류 (카드를 상자에 넣기) ----- */
  const CASES = [
    { id: 'alv', short: '폐포 O₂ 이동', label: '폐포의 O₂ 이동', sub: '높→낮 · 단백질 ✕ · ATP ✕', z: 'simple' },
    { id: 'eth', short: '에탄올 막 통과', label: '에탄올의 막 통과', sub: '높→낮 · 단백질 ✕ · ATP ✕', z: 'simple' },
    { id: 'glu', short: '장 포도당 흡수', label: '소장 융털 세포의 포도당 흡수', sub: '높→낮 · 운반체 ○ · ATP ✕', z: 'facil' },
    { id: 'rbk', short: '적혈구 K⁺ 축적', label: '적혈구 안의 K⁺ 축적', sub: '낮→높 · 펌프 ○ · ATP ○', z: 'active' },
    { id: 'no3', short: '뿌리털 NO₃⁻ 흡수', label: '뿌리털의 NO₃⁻ 흡수', sub: '낮→높 · 운반체 ○ · ATP ○', z: 'active' },
    { id: 'kid', short: '콩팥 포도당 재흡수', label: '콩팥 세뇨관의 포도당 재흡수', sub: '낮→높 · 운반체 ○ · ATP ○', z: 'active' },
    { id: 'mac', short: '대식 세포 삼킴', label: '대식 세포가 세균을 삼킴', sub: '큰 입자 · 소낭 · ATP ○', z: 'vesicle' },
    { id: 'ins', short: '인슐린 분비', label: '이자의 인슐린 분비', sub: '큰 분자 · 소낭 융합 · ATP ○', z: 'vesicle' },
    { id: 'nt', short: '신경 전달 물질 방출', label: '신경 말단의 신경 전달 물질 방출', sub: '시냅스 소낭 · 막 융합 · ATP ○', z: 'vesicle' },
  ];
  const CASE = {}; CASES.forEach((c) => { CASE[c.id] = c; });
  const ZN = { simple: '단순 확산', facil: '촉진 확산', active: '능동 수송', vesicle: '소낭 수송' };
  const CBX = PHONE ? { x: 10, y: 10, w: 460, h: 270 } : { x: 14, y: 14, w: 772, h: 250 };
  const CTRAY = PHONE ? { x: 10, y: 290, w: 460, h: 340 } : { x: 14, y: 276, w: 772, h: 270 };
  const casesS = new Sorter({
    cards: [6, 2, 3, 0, 8, 5, 1, 7, 4].map((i) => ({ id: CASES[i].id, label: CASES[i].label, short: CASES[i].short, sub: CASES[i].sub, col: '#0d9488' })),
    boxes: [['simple', '단순 확산', '#16a34a'], ['facil', '촉진 확산', '#0d9488'], ['active', '능동 수송', '#f59e0b'], ['vesicle', '소낭 수송', '#7c3aed']].map((b, i) => {
      if (PHONE) { const gap = 10, bw = (CBX.w - gap) / 2, bh = (CBX.h - gap) / 2; return { id: b[0], label: b[1], col: b[2], x: CBX.x + (i % 2) * (bw + gap), y: CBX.y + Math.floor(i / 2) * (bh + gap), w: bw, h: bh, cols: 1, hdr: 32 }; }
      const gap = 8, bw = (CBX.w - gap * 3) / 4;
      return { id: b[0], label: b[1], col: b[2], x: CBX.x + i * (bw + gap), y: CBX.y, w: bw, h: CBX.h, cols: 1, hdr: 34 };
    }),
    cw: PHONE ? 214 : 244, ch: 50, kh: PHONE ? 30 : 32,
    tray: (i) => (PHONE ? { x: 16 + (i % 2) * 226, y: 330 + Math.floor(i / 2) * 58 } : { x: 22 + (i % 3) * 256, y: 322 + Math.floor(i / 3) * 62 }),
    onChange() { updateCtl(); },
  });
  const casesWrong = () => casesS.cards.filter((c) => c.zone && c.zone !== CASE[c.id].z);
  function casesDraw(dt, t) {
    casesS.update(dt); casesS.drawBoxes();
    panel(CTRAY.x, CTRAY.y, CTRAY.w, CTRAY.h, 16, '#ffffff');
    T(CTRAY.x + 16, CTRAY.y + 26, '사례 9장을 단서(이동 방향 · 막 단백질 · ATP)를 보고 4유형에 나눠요', L(15, 13), '#334155', 'left', 800);
    casesS.drawCards();
  }
  const casesPT = { down: (p) => casesS.down(p), move: (p) => casesS.move(p), up: (p) => casesS.up(p), hover: (p) => casesS.hover(p) };


  /* =========================================================
     화면 전환 · 조작 연결
     ========================================================= */
  const MODE_PT = { diff: null, carrier: null, pump: null, cyan: null, root: null, bulk: null, cases: casesPT };
  function setMode(m) {
    if (S.mode !== m) S.fade = 1;
    S.mode = m; PT = MODE_PT[m] || null;
    if (m === 'diff') dfRebuild(); else if (m === 'carrier') crBuild();
    hideHint(); updateCtl();
  }
  const ctlNodes = $$('#ctrlCard .control');
  function updateCtl() {
    const fr = game ? game.free : false, lvNow = game ? game.level : 0;
    ctlNodes.forEach((n) => { n.hidden = (n.dataset.modes || '').split(' ').indexOf(S.mode) < 0; });
    modeButtons(S.mode, lvNow, fr);
    $$('#dfSp button').forEach((b) => { b.classList.toggle('on', b.dataset.v === S.df.sp); b.classList.toggle('seen', dfTested(b.dataset.v)); });
    $('#oDf').textContent = dfC(); $('#sDf').value = S.df.ci;
    $('#dfNote').innerHTML = '기록한 점 <b>' + S.df.rec.length + '개</b> · 시험한 입자 <b>' + ['o2', 'glc', 'na'].filter(dfTested).length + ' / 3종</b>';
    chipSet($('#crSp'), S.cr.sp); chipSet($('#crN'), S.cr.n); $('#oCr').textContent = crC(); $('#sCr').value = S.cr.ci;
    $('#crNote').innerHTML = SPN[S.cr.sp] + ' 기록: 2개 <b>' + crRecCount(S.cr.sp, 2) + ' / 6</b> · 4개 <b>' + crRecCount(S.cr.sp, 4) + ' / 6</b>';
    const Q = S.pp; $('#ppAuto').disabled = Q.run === 'auto'; $('#ppStep').disabled = !!Q.run;
    $('#ppAuto').textContent = Q.run === 'auto' ? '⚡ 도는 중…' : '⚡ 한 회전 실행'; $('#ppStep').textContent = Q.run === 'step' ? '⏭ 진행 중…' : (Q.t > 0 ? '⏭ 다음 단계' : '⏭ 한 단계씩');
    $('#ppNote').innerHTML = '돌린 횟수 <b>' + Q.cycles + '번</b> · ATP <b>' + Q.cycles + '개</b> 사용';
    $('#oCy').textContent = CONC[S.cy.ci]; $('#sCy').value = S.cy.ci; $('#cyGo').disabled = S.cy.cn; $('#cyGo').textContent = S.cy.cn ? '🧪 시안화물을 넣었어요' : '🧪 시안화물 넣기';
    chipSet($('#rtCond'), S.rt.cond); $('#rtGo').disabled = S.rt.run; $('#rtGo').textContent = S.rt.run ? '측정 중…' : '▶ 흡수량 측정';
    $('#rtNote').innerHTML = '공기 <b>' + (S.rt.val.air != null ? '측정함' : '아직') + '</b> · 질소 <b>' + (S.rt.val.n2 != null ? '측정함' : '아직') + '</b>';
    chipSet($('#bkSel'), S.bk.kind); $('#bkPlay').textContent = S.bk.play ? '시연 중…' : '▶ 다시 시연'; $('#bkPlay').disabled = S.bk.play;
    $('#bkNote').innerHTML = '끝까지 본 시연 <b>' + bkDone() + ' / 3</b>';
  }
  bindModeSeg(setMode);
  $$('#dfSp button').forEach((b) => b.addEventListener('click', () => { S.df.sp = b.dataset.v; Sound.click(); dfRebuild(); }));
  $('#sDf').addEventListener('input', (e) => { S.df.ci = +e.target.value; dfRebuild(); });
  $('#dfRec').addEventListener('click', dfRecord);
  $('#dfReset').addEventListener('click', () => { Sound.click(); dfClear(); });
  $$('#crSp button').forEach((b) => b.addEventListener('click', () => { S.cr.sp = b.dataset.v; Sound.click(); crBuild(); }));
  $$('#crN button').forEach((b) => b.addEventListener('click', () => { S.cr.n = +b.dataset.v; Sound.click(); crBuild(); }));
  $('#sCr').addEventListener('input', (e) => { S.cr.ci = +e.target.value; crBuild(); });
  $('#crRec').addEventListener('click', crRecord);
  $('#crClear').addEventListener('click', () => { Sound.click(); S.cr.rec = { glc: { 2: {}, 4: {} }, na: { 2: {}, 4: {} } }; updateCtl(); });
  $('#ppAuto').addEventListener('click', ppAuto); $('#ppStep').addEventListener('click', ppStep);
  $('#ppReset').addEventListener('click', () => { Sound.click(); ppReset(); });
  $('#sCy').addEventListener('input', (e) => { S.cy.ci = +e.target.value; updateCtl(); });
  $('#cyGo').addEventListener('click', () => { S.cy.cn = true; Sound.click(); updateCtl(); });
  $('#cyReset').addEventListener('click', () => { Sound.click(); cyReset(); });
  $$('#rtCond button').forEach((b) => b.addEventListener('click', () => { if (S.rt.run) return; S.rt.cond = b.dataset.v; Sound.click(); updateCtl(); }));
  $('#rtGo').addEventListener('click', rtStart);
  $('#rtReset').addEventListener('click', () => { Sound.click(); rtReset(); });
  $$('#bkSel button').forEach((b) => b.addEventListener('click', () => { if (S.bk.play) return; bkPlay(b.dataset.v); }));
  $('#bkPlay').addEventListener('click', () => { if (!S.bk.play) bkPlay(S.bk.kind); });
  $('#casesReset').addEventListener('click', () => { Sound.click(); casesS.reset(); });

  /* =========================================================
     미션
     ========================================================= */
  const levels = [
    {
      title: '확산: 막을 가로지르는 입자', short: '확산', icon: '💨', phase: '모형',
      intro: '<p class="si-q">❓ 탐구 질문: 세포는 어떤 때는 공짜로, 어떤 때는 에너지를 써 가며 물질을 드나들게 한다. 그 차이는 무엇일까?</p><p>🔗 <b>통합과학</b>에서 확산과 삼투를, 앞 차시에서 이중층의 <b>투과성</b>(크기 · 극성 · 전하)을 배웠어요. 이제 수송 방식을 <b>① 농도 기울기의 방향, ② 막 단백질이 필요한가, ③ 에너지(ATP)가 필요한가</b>로 비교해 봐요.</p><p>먼저 에너지가 들지 않는 <b>단순 확산</b>이에요. 막 위쪽은 세포 밖, 아래쪽은 세포 안이에요.</p>',
      features: ['diff'],
      setup() { setMode('diff'); },
      recap: '단순 확산은 작은 비극성 분자(O₂, CO₂)가 이중층을 직접 지나 농도가 높은 쪽에서 낮은 쪽으로 이동하는 것으로, 에너지가 필요 없고 속도는 농도 차에 비례해요.',
      summary: '<ul><li><b>단순 확산</b>: 막 단백질 없이 지질 이중층을 <b>직접 통과</b>(O₂, CO₂, 지용성 분자). 농도가 <b>높은 쪽 → 낮은 쪽</b>, <b>에너지 불필요</b>.</li><li>속도는 <b>농도 차에 비례</b>(그래프가 직선).</li><li>포도당 · Na⁺ 같은 입자는 막 단백질이 없으면 이중층을 지나가지 못해요.</li><li>평형에 도달해도 입자는 계속 움직이지만 한쪽으로의 <b>순 이동은 0</b>이에요.</li></ul>',
      missions: [
        {
          id: 'pass3', title: '입자 3종 통과 시험',
          goal: '입자 <b>O₂ · 포도당 · Na⁺</b>를 차례로 골라 막에 부딪히게 하고, 어느 입자가 이중층을 지나가는지 확인하세요.',
          hint: '입자를 고르면 바깥 칸에 그 입자가 나타나요. 몇 초 기다리면 막에 여러 번 부딪혀요. O₂는 막을 지나가고, 포도당과 Na⁺은 튕겨 나와요.',
          setup() { setMode('diff'); S.df.sp = 'o2'; dfClear(); },
          check: () => ['o2', 'glc', 'na'].every(dfTested), hold: 0.6,
          status: () => ['o2', 'glc', 'na'].map((sp) => mark(dfTested(sp)) + ' ' + SPN[sp] + (dfTested(sp) ? (sp === 'o2' ? ' 통과' : ' 막힘') : '')).join(' &nbsp; '),
          explain: '<b>O₂</b>는 작고 무극성이라 지질 이중층을 직접 지나가요(단순 확산). <b>포도당</b>은 크고 극성, <b>Na⁺</b>은 전하를 띠어서 막 단백질 없이는 지나가지 못해요.',
        },
        {
          id: 'rate3', title: '농도 차와 속도',
          goal: '입자를 <b>O₂</b>로 두고, 바깥 농도를 <b>서로 다른 3가지 이상</b>으로 바꿔 가며 [📝 속도 기록]을 눌러 그래프에 점을 찍으세요.',
          hint: '입자를 O₂로 바꾸고 농도 슬라이더를 움직여요. 농도마다 [📝 속도 기록]을 눌러요. 세포 안 농도는 0이라서 농도 차 = 바깥 농도예요.',
          setup() { setMode('diff'); S.df.sp = 'o2'; S.df.rec = []; dfRebuild(); },
          check: () => S.df.rec.length >= 3, hold: 0.6,
          status: () => mark(S.df.rec.length >= 3) + ' 기록한 점 ' + S.df.rec.length + ' / 3 &nbsp; ' + (S.df.rec.length ? '농도: ' + S.df.rec.map((q) => q.c).join(' · ') : ''),
          explain: '바깥 농도가 1 · 2 · 4 · 8 · 16 · 32로 커질 때 속도도 1 · 2 · 4 · 8 · 16 · 32로 커져서 그래프가 <b>직선</b>이에요. 단순 확산의 속도는 <b>농도 차에 비례</b>해요.',
        },
        {
          type: 'quiz', title: '평형에 도달하면?',
          goal: '단순 확산에서 막 양쪽의 농도가 같아지는 <b>평형</b>에 도달하면 어떻게 될까요?',
          setup() { setMode('diff'); },
          choices: ['입자의 움직임이 완전히 멈춘다', '입자는 계속 움직이지만 한쪽으로의 순 이동은 0이다', '모든 입자가 한쪽으로 모인다', '막이 입자를 더 이상 통과시키지 않는다'],
          answer: 1,
          feedback: ['입자는 열운동 때문에 계속 움직여요.', '', '평형에서는 양쪽에 고르게 퍼져 있어요.', '막은 그대로이고 양방향 이동의 수가 같아질 뿐이에요.'],
          explain: '평형에서도 입자는 양방향으로 계속 막을 지나가지만 <b>오가는 수가 같아서 순 이동이 0</b>이에요. 그래서 겉으로는 변화가 없어 보여요.',
        },
      ],
    },
    {
      title: '운반 단백질: 촉진 확산과 포화', short: '운반 단백질', icon: '🔁', phase: '모형',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 포도당 · Na⁺은 이중층만으로는 막을 지나가지 못한다는 것을 확인했어요.</div><p>이런 입자는 막의 <b>운반 단백질</b>이 도와줘요. 이온은 <b>통로 단백질</b>의 구멍으로 지나가고, 포도당은 <b>운반체 단백질</b>에 결합하면 운반체의 모양이 바뀌어 반대편으로 방출돼요. 이것이 <b>촉진 확산</b>이에요. 에너지는 쓰지 않아요.</p><p>바깥 농도를 높이면 속도가 어떻게 달라질까요? 운반체 수를 늘리면 어떻게 될까요?</p>',
      features: ['carrier'],
      setup() { setMode('carrier'); },
      recap: '촉진 확산은 운반 단백질(통로 · 운반체)의 도움으로 농도가 높은 쪽에서 낮은 쪽으로 이동하며 에너지가 필요 없어요. 단백질이 모두 쓰이면 속도가 최댓값에서 일정해지고(포화), 단백질이 많을수록 최댓값이 커져요.',
      summary: '<ul><li><b>촉진 확산</b>: 통로 단백질 또는 운반체 단백질의 도움, <b>높은 쪽 → 낮은 쪽</b>, <b>에너지 불필요</b>(이온, 포도당, 물은 아쿠아포린).</li><li>운반 단백질의 수가 한정되어 있어서 농도를 높여도 속도가 <b>최댓값에서 일정</b>해져요(포화). 예시 값(상대 속도, 단백질 2개): 8 · 14 · 20 · 24 · 26 · 26.</li><li>운반체가 2배가 되면 최대 속도도 2배(26 → 52)가 돼요.</li></ul>',
      missions: [
        {
          id: 'sat', title: '포화 곡선과 운반체 수',
          goal: '<b>포도당</b>(운반체 2개)으로 바깥 농도 <b>1 · 2 · 4 · 8 · 16 · 32</b> 6곳에서 속도를 기록한 뒤, 운반체를 <b>4개</b>로 늘리고 농도 <b>32</b>에서 기록하세요.',
          hint: '입자를 포도당으로 두고 농도 슬라이더를 한 칸씩 움직이며 [📝 속도 기록]을 눌러요. 운반체 수 버튼으로 4개를 고르고 슬라이더를 맨 끝(32)에 놓은 뒤 한 번 더 기록해요.',
          setup() { setMode('carrier'); S.cr.sp = 'glc'; S.cr.n = 2; S.cr.rec = { glc: { 2: {}, 4: {} }, na: { 2: {}, 4: {} } }; crBuild(); },
          check: () => crRecCount('glc', 2) === 6 && S.cr.rec.glc[4][32] === 52, hold: 0.6,
          status: () => mark(crRecCount('glc', 2) === 6) + ' 운반체 2개 곡선 ' + crRecCount('glc', 2) + ' / 6 &nbsp; ' + mark(S.cr.rec.glc[4][32] === 52) + ' 운반체 4개 최대 속도 ' + (S.cr.rec.glc[4][32] === 52 ? 52 : '—'),
          explain: '운반체 2개일 때 속도는 <b>8 · 14 · 20 · 24 · 26 · 26</b>으로, 농도가 낮을 때는 늘다가 운반체가 모두 쓰이면 <b>26에서 일정</b>해져요(포화). 운반체를 4개로 늘리면 최대 속도도 <b>2배(52)</b>가 돼요. 단순 확산은 직선으로 계속 늘어난다는 점과 비교해 보세요.',
        },
        {
          type: 'quiz', title: '촉진 확산의 특징',
          goal: '촉진 확산에 대한 설명으로 옳은 것은?',
          setup() { setMode('carrier'); },
          choices: ['농도 기울기를 따라 이동하므로 에너지가 필요 없고, 운반 단백질 수가 한정되어 속도에 최댓값(포화)이 있다', 'ATP를 써서 농도가 낮은 쪽에서 높은 쪽으로 보낸다', '농도가 높아질수록 속도가 계속 직선으로 증가한다', '운반 단백질 없이 이중층을 직접 지나간다'],
          answer: 0,
          feedback: ['', '그것은 능동 수송이에요. 촉진 확산은 높은 쪽에서 낮은 쪽으로 가요.', '그것은 단순 확산의 특징이에요. 촉진 확산은 포화돼요.', '운반 단백질이 필요한 것이 촉진 확산이에요.'],
          explain: '촉진 확산은 <b>농도 기울기 방향(높은 → 낮은)</b>이라 에너지가 필요 없지만, 도와주는 <b>운반 단백질 수가 한정</b>되어 농도가 높아져도 속도가 일정 수준(포화)에서 멈춰요.',
        },
      ],
    },
    {
      title: '능동 수송: ATP로 거슬러서', short: '능동 수송', icon: '⚡', phase: '모형',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 운반 단백질이 농도가 높은 쪽에서 낮은 쪽으로 물질을 옮겨 주는 것을 봤어요.</div><p>그런데 사람 적혈구 안은 Na⁺이 약 <b>10 mM</b>(밖 약 145 mM), K⁺이 약 <b>140 mM</b>(밖 약 4 mM)이에요. 두 이온 모두 <b>농도가 낮은 쪽에서 높은 쪽</b>으로 모여 있어요. 이것은 <b>ATP를 쓰는 펌프</b>가 일하는 <b>능동 수송</b> 덕분이에요.</p><p>Na⁺–K⁺ 펌프를 돌려 보고, 시안화물(세포호흡 억제제)로 능동 수송과 촉진 확산을 비교해 봐요.</p>',
      features: ['pump', 'cyan', 'root'],
      setup() { setMode('pump'); },
      recap: '능동 수송은 운반체(펌프)가 ATP 에너지를 써서 농도가 낮은 쪽에서 높은 쪽으로 물질을 옮겨요. Na⁺–K⁺ 펌프는 ATP 1분자로 Na⁺ 3개를 내보내고 K⁺ 2개를 들여오며, 세포호흡이 막히면 능동 수송이 멈춰요.',
      summary: '<ul><li><b>능동 수송</b>: 운반체 단백질(펌프), <b>낮은 쪽 → 높은 쪽</b>(농도 기울기를 거슬러), <b>ATP 필요</b>. 속도도 포화돼요.</li><li><b>Na⁺–K⁺ 펌프</b>: ATP 1분자를 쓸 때마다 <b>Na⁺ 3개를 세포 밖으로, K⁺ 2개를 세포 안으로</b>. (적혈구: Na⁺ 안 10 / 밖 145 mM, K⁺ 안 140 / 밖 4 mM)</li><li><b>시안화물</b>(세포호흡 억제제)을 처리하면 ATP가 고갈되어 능동 수송은 거의 0이 되지만 촉진 확산은 변하지 않아요.</li><li>뿌리털의 무기 이온 흡수는 산소가 부족하면 급감해요. 세포호흡으로 ATP를 얻기 때문이에요.</li></ul>',
      missions: [
        {
          id: 'pump1', title: '펌프 한 회전',
          goal: '⚡ 펌프 화면에서 <b>[⚡ 한 회전 실행]</b>(또는 [⏭ 한 단계씩] 5번)으로 펌프를 한 바퀴 돌리세요.',
          hint: '버튼을 누르면 Na⁺ 결합 → ATP 결합과 인산화 → Na⁺ 방출 → K⁺ 결합 → K⁺ 방출 순서로 진행돼요. 끝까지 기다려요.',
          setup() { ppReset(); setMode('pump'); },
          check: () => S.pp.cycles >= 1, hold: 0.4,
          status: () => mark(S.pp.cycles >= 1) + ' 한 회전 &nbsp; ' + mark(S.pp.cycles >= 1) + ' Na⁺ ' + 3 * S.pp.cycles + '개 밖으로 &nbsp; ' + mark(S.pp.cycles >= 1) + ' K⁺ ' + 2 * S.pp.cycles + '개 안으로 &nbsp; ATP ' + S.pp.cycles + '개 사용',
          explain: '펌프는 <b>ATP 1분자</b>를 쓰며 한 번 돌 때마다 <b>Na⁺ 3개를 세포 밖으로, K⁺ 2개를 세포 안으로</b> 옮겨요. ATP에서 떨어진 인산이 펌프에 붙으면 모양이 바뀌고(인산화), 인산이 떨어지면 원래 모양으로 돌아와요.',
        },
        {
          id: 'cyan', title: '시안화물과 뿌리털',
          goal: '🧪 화면에서 <b>시안화물</b>을 넣어 두 수송의 속도를 비교하고, 🌱 화면에서 <b>공기 · 질소</b> 용액의 이온 흡수량을 각각 측정하세요.',
          hint: '🧪 시안화물 화면에서 [시안화물 넣기]를 누르고 ATP가 0이 될 때까지 지켜봐요. 🌱 뿌리털 화면에서 공기와 질소 용액을 하나씩 고르고 [▶ 흡수량 측정]을 눌러요.',
          setup() { cyReset(); rtReset(); setMode('cyan'); },
          check: () => S.cy.seen && S.rt.val.air != null && S.rt.val.n2 != null, hold: 0.6,
          status: () => mark(S.cy.seen) + ' 시안화물 비교 &nbsp; ' + mark(S.rt.val.air != null) + ' 공기 흡수량 &nbsp; ' + mark(S.rt.val.n2 != null) + ' 질소 흡수량',
          explain: '시안화물이 세포호흡을 막으면 ATP가 사라져 <b>능동 수송 속도는 거의 0</b>이 되지만, ATP가 필요 없는 <b>촉진 확산은 그대로</b>예요. 뿌리털도 산소가 부족한 <b>질소</b> 용액에서는 ATP를 적게 만들어 이온 흡수량이 급감해요.',
        },
        {
          type: 'quiz', title: '능동 수송과 산소',
          goal: '뿌리털의 무기 이온 흡수(능동 수송) 속도가 <b>산소 농도</b>와 관계가 있는 까닭은?',
          setup() { setMode('root'); },
          choices: ['산소가 막 단백질에 직접 달라붙어 이온을 끌어당기기 때문이다', '산소를 이용한 세포호흡으로 능동 수송에 필요한 ATP가 만들어지기 때문이다', '산소가 있어야 농도 기울기가 생기기 때문이다', '산소가 세포막을 두껍게 만들어 이온을 막기 때문이다'],
          answer: 1,
          feedback: ['산소는 막 단백질에 붙어 이온을 끌어오지 않아요.', '', '농도 기울기는 산소와 관계없이 이미 있어요.', '산소가 막 두께를 바꾸지 않아요.'],
          explain: '능동 수송은 <b>ATP</b>가 있어야 해요. 산소가 충분하면 <b>세포호흡</b>으로 ATP를 많이 만들 수 있어서 이온 흡수가 활발하고, 산소가 부족하면 ATP가 줄어 흡수가 급감해요.',
        },
      ],
    },
    {
      title: '큰 물질: 소낭으로 옮겨요', short: '큰 물질', icon: '🫧', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 작은 물질을 옮기는 운반 단백질과 펌프를 살펴봤어요.</div><p>세균이나 인슐린 같은 <b>큰 물질</b>은 막 단백질로 옮길 수 없어요. 이럴 때 세포는 <b>막으로 만든 주머니(소낭)</b>를 써요. 큰 입자를 삼키는 <b>식세포 작용</b>, 액체 방울을 삼키는 <b>음세포 작용</b>(세포 내 섭취), 소낭이 세포막과 융합해 내용물을 내보내는 <b>세포 외 배출</b>(앞 차시의 분비 단백질)을 시연으로 확인하고, 사례 9가지를 4유형으로 분류해 봐요.</p>',
      features: ['bulk', 'cases'],
      setup() { setMode('bulk'); },
      recap: '큰 물질은 소낭을 이용해 세포 안팎으로 옮겨요(세포 내 섭취 · 세포 외 배출, ATP 필요). 소낭이 만들어지고 융합해도 막 전체 면적은 일정해요.',
      summary: '<ul><li><b>세포 내 섭취</b>: 식세포 작용(큰 입자, 예: 백혈구가 세균을 삼킴) · 음세포 작용(액체 방울). 막이 감싸 <b>소낭</b>이 돼요.</li><li><b>세포 외 배출</b>: 분비 소낭이 세포막과 융합해 내용물을 방출(인슐린, 신경 전달 물질). 막 소낭 이용, <b>ATP 필요</b>.</li><li>소낭이 떨어지고 융합하면서 세포막 면적은 <b>일정하게 유지</b>돼요.</li><li><b>수송 4유형 비교</b>: 단순 확산(직접 통과 · 높→낮 · ATP 없음), 촉진 확산(운반 단백질 · 높→낮 · ATP 없음), 능동 수송(펌프 · 낮→높 · ATP 사용), 소낭 수송(큰 물질 · ATP 사용).</li></ul>',
      missions: [
        {
          id: 'bulk3', title: '소낭 수송 시연 3가지',
          goal: '🫧 화면에서 <b>식세포 작용 · 음세포 작용 · 세포 외 배출</b> 시연을 각각 끝까지 한 번씩 보세요.',
          hint: '시연 버튼을 하나씩 눌러 7~8초 동안 끝까지 지켜봐요. 아래 숫자(세포막 + 소낭 막 = 100)가 어떻게 달라지는지 보세요.',
          setup() { S.bk.done = {}; S.bk.p = 0; S.bk.play = false; setMode('bulk'); },
          check: () => bkDone() === 3, hold: 0.5,
          status: () => ['phago', 'pino', 'exo'].map((k) => mark(!!S.bk.done[k]) + ' ' + BK[k].name).join(' &nbsp; '),
          explain: '세포 내 섭취에서는 막이 입자를 감싸며 안으로 들어가 <b>소낭</b>이 되고, 세포 외 배출에서는 소낭이 세포막과 <b>융합</b>해 내용물을 내보내요. 두 경우 모두 ATP가 필요하고, 막이 소낭이 되었다 다시 합쳐지므로 <b>세포막 전체 면적은 일정</b>해요.',
        },
        {
          id: 'cases', title: '수송 사례 9가지 분류', manual: true,
          goal: '사례 카드 9장을 <b>단순 확산 · 촉진 확산 · 능동 수송 · 소낭 수송</b> 상자에 나누어 넣으세요.',
          hint: '카드의 단서를 읽어요. 이동 방향이 높→낮이고 단백질이 필요 없으면 단순 확산, 운반체가 필요하면 촉진 확산(ATP ✕), 낮→높이고 ATP를 쓰면 능동 수송, 큰 물질이 소낭을 쓰면 소낭 수송이에요.',
          setup() { setMode('cases'); casesS.reset(); },
          check() {
            if (casesS.placed < 9) { casesS.markBad([]); return '카드를 모두 상자에 넣어 주세요. (' + casesS.placed + ' / 9)'; }
            const w = casesWrong();
            if (!w.length) { casesS.markBad([]); return true; }
            casesS.markBad(w.map((c) => c.id));
            return '\'' + CASE[w[0].id].short + '\' 카드가 맞지 않아요. 이동 방향 · 막 단백질 · ATP 단서를 다시 살펴보세요.';
          },
          explain: '<b>단순 확산</b>: 폐포의 O₂, 에탄올. <b>촉진 확산</b>: 소장 융털 세포의 포도당(농도가 높은 쪽에서 운반체로). <b>능동 수송</b>: 적혈구의 K⁺, 뿌리털의 NO₃⁻, 콩팥 세뇨관의 포도당(낮은 쪽 → 높은 쪽, ATP 사용). <b>소낭 수송</b>: 대식 세포의 세균 삼킴, 인슐린 분비, 신경 전달 물질 방출.',
        },
        {
          type: 'quiz', title: '능동 수송 vs 세포 외 배출',
          goal: '둘 다 ATP가 필요한 <b>능동 수송</b>과 <b>세포 외 배출</b>을 구별하는 기준은?',
          setup() { setMode('cases'); },
          choices: ['물질을 운반체(펌프) 단백질이 옮기는지, 막으로 싸인 소낭이 세포막과 융합하는지', '농도가 높은 쪽에서 낮은 쪽으로 가는지 여부만', '세포막을 통과하는 물질의 색깔', '에너지(ATP)를 쓰는지 여부'],
          answer: 0,
          feedback: ['', '둘 다 농도 기울기와 관계없이 에너지를 써서 일어날 수 있어요.', '색깔은 기준이 아니에요.', '둘 다 ATP를 쓰기 때문에 이것만으로는 구별할 수 없어요.'],
          explain: '능동 수송은 <b>운반체(펌프) 단백질</b>이 작은 물질을 옮기고, 세포 외 배출은 <b>소낭</b>이 세포막과 융합해 큰 물질을 내보내요. 세포 내 섭취가 단순 확산이 아닌 까닭도 <b>큰 입자</b>를 막 구멍이 아니라 소낭으로 옮기고 <b>ATP</b>가 필요하기 때문이에요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hy-membrane-transport', mount: '#game', badge: '막 수송 탐험가', homeHref: '../../index.html#hy',
    featureLabels: { diff: '💨 확산 입자 모형', carrier: '🔁 운반 단백질과 포화 곡선', pump: '⚡ Na⁺–K⁺ 펌프', cyan: '🧪 시안화물 비교 실험', root: '🌱 뿌리털 이온 흡수', bulk: '🫧 세포 내 섭취 · 외 배출', cases: '🗂 수송 사례 분류' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 읽음 칸 ---------- */
  function readouts() {
    const m = S.mode;
    if (m === 'diff') setReads(['입자', SPN[S.df.sp], '바깥 · 안 농도', dfC() + ' · 0', '상대 속도', S.df.sp === 'o2' ? rateSimple(S.df.ci) : 0]);
    else if (m === 'carrier') setReads(['입자', SPN[S.cr.sp], '상대 속도', rateFac(S.cr.ci, S.cr.n), '사용 중인 단백질', crBusy() + ' / ' + S.cr.n]);
    else if (m === 'pump') setReads(['돌린 횟수', S.pp.cycles + '번 (ATP ' + S.pp.cycles + ')', 'Na⁺ 밖으로', 3 * S.pp.cycles + '개', 'K⁺ 안으로', 2 * S.pp.cycles + '개']);
    else if (m === 'cyan') { const r = cyRate(); setReads(['촉진 확산 속도', r.fac, '능동 수송 속도', r.act, 'ATP 수준', Math.round(S.cy.atp * 100) + ' %']); }
    else if (m === 'root') setReads(['용액', S.rt.cond === 'air' ? '공기' : '질소', '공기 흡수량', S.rt.val.air != null ? S.rt.val.air : '측정 전', '질소 흡수량', S.rt.val.n2 != null ? S.rt.val.n2 : '측정 전']);
    else if (m === 'bulk') setReads(['시연', BK[S.bk.kind].name, '끝까지 본 시연', bkDone() + ' / 3', '막 전체 면적', '일정 (100)']);
    else setReads(['놓은 사례', casesS.placed + ' / 9', '남은 사례', (9 - casesS.placed) + '장', '수송 유형', '4가지']);
  }

  /* ---------- 시작 ---------- */
  setMode('diff');
  let lastFree = false, lastLv = -1;
  SciSim.loop((dt, t) => {
    clock = t; S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (game && game.level !== lastLv) { lastLv = game.level; updateCtl(); }
    view.apply(); FX.update(dt); ctx.clearRect(0, 0, VW, VH);
    switch (S.mode) {
      case 'diff': bgFill(BG2, BG3); dfDraw(dt, t); break;
      case 'carrier': bgFill(BG2, BG3); crDraw(dt, t); break;
      case 'pump': bgFill(BG2, BG3); ppDraw(dt, t); break;
      case 'cyan': bgFill(BG2, BG3); cyDraw(dt, t); break;
      case 'root': bgFill(BG2, BG3); rtDraw(dt, t); break;
      case 'bulk': bgFill(BG2, BG3); bkDraw(dt, t); break;
      case 'cases': bgFill(BG2, BG3); casesDraw(dt, t); break;
    }
    FX.draw(); parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(241,246,243,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, PHONE, get game() { return game; }, levels, setMode, CONC, FAC, dfC, dfTested, dfRecord, dfRebuild, dfClear, crBuild, crRecord, crRecCount, crBusy, rateFac,
    ppAuto, ppStep, ppReset, ppUpdate, PT_B, pumpState, cyRate, cyReset, rtStart, rtReset, RT_V, bkPlay, bkDone, BK, casesS, CASE, CASES, updateCtl, dfUpdate, crUpdate,
  };
})();
