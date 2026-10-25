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


  /* =========================================================
     고등학교 세포와 물질대사 · Ⅰ. 세포 - 세포막의 유동 모자이크 (단원 56, 7차시)
     성취기준 [12세포01-05] 세포막의 구조와 특성을 이해하고, 세포막을 통한 물질 수송 과정을 추론할 수 있다. (구조와 특성)
     ① 모형: 인지질 조립  ② 탐구: 막 단백질  ③ 실험: 유동성  ④ 분석: 투과성 추론
     ========================================================= */
  const S = { mode: 'assem', fade: 0 };
  let game = null;
  const HEADC = '#3b82f6', TAILC = '#f59e0b';
  const BG2 = '#eef4f2', BG3 = '#e3ece8';

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

  /* =========================================================
     ① 인지질 조립 : 물속에서 스스로 미셀 → 이중층 소낭
     ========================================================= */
  const ASP = PHONE
    ? { tank: { x: 10, y: 10, w: 460, h: 390 }, info: { x: 10, y: 410, w: 460, h: 98 }, bar: { x: 10, y: 518, w: 460, h: 112 } }
    : { tank: { x: 14, y: 14, w: 530, h: 400 }, info: { x: 556, y: 14, w: 230, h: 400 }, bar: { x: 14, y: 426, w: 772, h: 120 } };
  const AS_N = 44;
  S.as = { stage: 0, lip: [], seenMic: false, seenVes: false, t: 0 };
  function asCenter() { const t = ASP.tank; return { x: t.x + t.w / 2, y: t.y + t.h / 2 + 16 }; }
  function asTarget(l, i, stage) {
    const T0 = ASP.tank, c = asCenter();
    if (stage === 0) {
      const wx = Math.sin(S.as.t * 0.6 + l.ph) * 16, wy = Math.cos(S.as.t * 0.5 + l.ph * 1.3) * 14;
      return { x: l.sx + wx, y: l.sy + wy, a: l.sa + Math.sin(S.as.t * 0.7 + l.ph * 2) * 0.5 };
    }
    if (stage === 1) {
      const k = i % 4, j = Math.floor(i / 4), th = (j / 11) * TAU + k * 0.5 + S.as.t * 0.08;
      const dx = L(125, 100) * (k % 2 ? 1 : -1), dy = L(95, 100) * (k < 2 ? -1 : 1);
      return { x: c.x + dx + Math.cos(th) * 28, y: c.y + dy + Math.sin(th) * 28, a: th + Math.PI };
    }
    if (i < 30) { const th = (i / 30) * TAU - Math.PI / 2; return { x: c.x + Math.cos(th) * 84, y: c.y + Math.sin(th) * 84, a: th + Math.PI }; }
    const j = i - 30, th = (j / 14) * TAU - Math.PI / 2 + 0.2;
    return { x: c.x + Math.cos(th) * 38, y: c.y + Math.sin(th) * 38, a: th };
  }
  function asScatter() {
    const T0 = ASP.tank, rr = mulberry(77 + (S.as.round = (S.as.round || 0) + 1));
    S.as.lip = [];
    for (let i = 0; i < AS_N; i++) {
      const sx = T0.x + 40 + rr() * (T0.w - 80), sy = T0.y + 70 + rr() * (T0.h - 120);
      S.as.lip.push({ x: sx, y: sy, a: rr() * TAU, sx, sy, sa: rr() * TAU, ph: rr() * TAU, wait: 0, r: 2.4 + rr() * 1.8 });
    }
  }
  function asSet(stage) {
    if (stage === S.as.stage && S.as.lip.length) return;
    if (stage === 0) { S.as.stage = 0; asScatter(); updateCtl(); return; }
    S.as.stage = stage;
    S.as.lip.forEach((l, i) => { l.wait = RM ? 0 : (i % 11) * 0.045 + Math.random() * 0.1; });
    if (stage === 1) S.as.seenMic = true;
    Sound.click(); updateCtl();
  }
  function asNext() { if (S.as.stage < 2) asSet(S.as.stage + 1); }
  function asReset() { S.as.stage = 0; S.as.seenMic = false; S.as.seenVes = false; asScatter(); updateCtl(); }
  function asErr(l, i) { const g = asTarget(l, i, S.as.stage); return Math.hypot(l.x - g.x, l.y - g.y); }
  function asSettled() { return S.as.lip.every((l, i) => l.wait <= 0 && asErr(l, i) < 4 && Math.abs(angDelta(l.a, asTarget(l, i, S.as.stage).a)) < 0.12); }
  function asExposed() { if (S.as.stage === 0) return AS_N; return S.as.lip.filter((l, i) => l.wait > 0 || asErr(l, i) > 9).length; }
  asScatter();
  function asUpdate(dt) {
    S.as.t += dt;
    S.as.lip.forEach((l, i) => {
      if (l.wait > 0) { l.wait -= dt; if (l.wait > 0) { if (S.as.stage === 0) l.wait = 0; else return; } }
      const g = asTarget(l, i, S.as.stage), k = RM ? 99 : l.r;
      l.x = approach(l.x, g.x, dt, k); l.y = approach(l.y, g.y, dt, k);
      l.a += angDelta(l.a, g.a) * Math.min(1, dt * k * 1.1);
    });
    if (S.as.stage === 2 && !S.as.seenVes && asSettled()) { S.as.seenVes = true; const c = asCenter(); parts.burst(c.x, c.y, { count: 22, speed: 200 }); Sound.success(); updateCtl(); }
  }
  function asDraw(dt, t) {
    asUpdate(dt);
    const T0 = ASP.tank, c = asCenter();
    waterPanel(T0, '#d6ecfb', '#a9d4f2');
    T(T0.x + 18, T0.y + 30, '💧 물이 든 통', L(17, 15), '#1d4f91', 'left', 800);
    T(T0.x + T0.w - 16, T0.y + 30, ['① 흩어진 인지질 ' + AS_N + '개', '② 미셀', '③ 이중층 소낭'][S.as.stage], 14.5, '#1d4f91', 'right', 800);
    const done = S.as.stage === 2 && S.as.seenVes;
    if (done) {   // 안쪽 물과 바깥 물
      ctx.save(); ctx.globalAlpha = 0.9; const g = ctx.createRadialGradient(c.x, c.y, 2, c.x, c.y, 40); g.addColorStop(0, '#e8f6ff'); g.addColorStop(1, '#c9e6fa'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(c.x, c.y, 31, 0, TAU); ctx.fill(); ctx.restore();
      T(c.x, c.y + 5, '안쪽 물', 13, '#1d4f91', 'center', 800);
      T(c.x + 112, c.y - 98, '바깥 물', 13, '#1d4f91', 'center', 800);
      callout(c.x + 62, c.y - 56, c.x + 118, c.y - 128, '머리가 물과 닿는 바깥층', { line: '#2563eb', size: 12.5 });
      callout(c.x + 24, c.y + 28, c.x + 110, c.y + 130, '머리가 안쪽 물과 닿는 안쪽층', { line: '#2563eb', size: 12.5 });
    }
    S.as.lip.map((l, i) => ({ l, i })).sort((a, b) => a.l.y - b.l.y).forEach(({ l, i }) => {
      const ex = S.as.stage === 0 || l.wait > 0 || asErr(l, i) > 9;
      drawLipid(l.x, l.y, l.a, { s: 1, tip: ex });
    });
    if (S.as.stage === 1) for (let k = 0; k < 4; k++) { const dx = L(125, 100) * (k % 2 ? 1 : -1), dy = L(95, 100) * (k < 2 ? -1 : 1); if (asSettled()) T(c.x + dx, c.y + dy + 62, '미셀', 13, '#92400e', 'center', 800, { stroke: 'rgba(255,255,255,.8)', strokeWidth: 3 }); }
    // 안내 패널
    panel(ASP.info.x, ASP.info.y, ASP.info.w, ASP.info.h, 18, '#ffffff');
    const I0 = ASP.info;
    if (PHONE) {
      D.sphere(I0.x + 22, I0.y + 24, 7, HEADC, { gloss: true }); T(I0.x + 36, I0.y + 29, '머리: 물을 좋아해요 (친수성)', 14, '#1f2d44', 'left', 800);
      ctx.strokeStyle = TAILC; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(I0.x + 14, I0.y + 52); ctx.lineTo(I0.x + 30, I0.y + 52); ctx.stroke(); T(I0.x + 36, I0.y + 57, '꼬리: 물을 싫어해요 (소수성)', 14, '#1f2d44', 'left', 800);
      T(I0.x + 14, I0.y + 84, '물에 닿는 꼬리: ' + asExposed() + '개', 14, asExposed() ? '#b91c1c' : '#15803d', 'left', 800);
    } else {
      T(I0.x + 16, I0.y + 32, '인지질', 17, '#334155', 'left', 800);
      drawLipid(I0.x + 38, I0.y + 66, Math.PI / 2, { s: 1.4 });
      T(I0.x + 66, I0.y + 62, '머리: 물을 좋아해요', 14, '#1f2d44', 'left', 800); T(I0.x + 66, I0.y + 80, '(친수성, 파랑)', 13, '#64748b', 'left', 700);
      T(I0.x + 66, I0.y + 106, '꼬리 2개: 물을 싫어해요', 14, '#1f2d44', 'left', 800); T(I0.x + 66, I0.y + 124, '(소수성, 주황)', 13, '#64748b', 'left', 700);
      const ex = asExposed();
      T(I0.x + 16, I0.y + 176, '물에 닿는 꼬리', 14, '#475569', 'left', 800);
      T(I0.x + 16, I0.y + 212, ex + '개', 30, ex ? '#b91c1c' : '#15803d', 'left', 800);
      textBlock(I0.x + 16, I0.y + 248, I0.w - 32, ex === 0 ? '꼬리가 모두 물을 피해 안쪽으로 숨었어요!' : '꼬리(빨간 점)가 물과 닿아 있어요. 조립을 시작하면 꼬리가 서로 모여요.', 14, ex ? '#c2410c' : '#15803d', 20, 800);
      textBlock(I0.x + 16, I0.y + 318, I0.w - 32, '물 분자는 물을 싫어하는 꼬리를 밀어내고, 꼬리끼리 모이게 해요.', 13, '#64748b', 18, 700);
    }
    // 단계 막대
    panel(ASP.bar.x, ASP.bar.y, ASP.bar.w, ASP.bar.h, 18, '#ffffff');
    const B0 = ASP.bar, names = ['흩어짐', '미셀', '이중층 소낭'], ws = (B0.w - 40) / 3;
    for (let k = 0; k < 3; k++) {
      const bx = B0.x + 20 + k * ws, on = S.as.stage === k, past = S.as.stage > k || (k === 2 && S.as.seenVes);
      D.roundRect(bx + 4, B0.y + 16, ws - 8, 34, 17); ctx.fillStyle = on ? '#16a34a' : past ? '#dcfce7' : '#eef2f7'; ctx.fill();
      T(bx + ws / 2, B0.y + 39, (k + 1) + ' ' + names[k], 15, on ? '#fff' : '#334155', 'center', 800);
    }
    textBlock(B0.x + 20, B0.y + 72, B0.w - 40, ['인지질을 물에 흩뿌렸어요. 꼬리가 물과 닿아 불안정해요. [🧲 조립] 버튼을 눌러요.', '꼬리를 가운데로 숨기며 머리가 바깥을 향하는 작은 덩어리(미셀)가 되었어요. 한 번 더 [🧲 조립]!', done ? '두 겹으로 둥글게 닫힌 이중층 소낭(리포솜)이에요. 머리는 안쪽 물과 바깥 물을 향하고 꼬리는 두 층 사이에 숨었어요.' : '미셀이 합쳐져 두 겹의 이중층 소낭으로 닫히는 중이에요…'][S.as.stage], L(14.5, 13.5), '#475569', L(20, 19), 700);
  }
  const asPT = {};

  /* =========================================================
     ① 이중층 배열 시험 : 머리 · 꼬리 방향 뒤집기
     ========================================================= */
  const FLP = PHONE ? { x: 10, y: 10, w: 460, h: 440 } : { x: 14, y: 14, w: 772, h: 440 };
  const FLTXT = PHONE ? { x: 10, y: 460, w: 460, h: 170 } : { x: 14, y: 466, w: 772, h: 80 };
  const FL_PER = PHONE ? 6 : 10, FL_S = PHONE ? 1.5 : 1.9;
  S.fl = { lip: [], solved: false, moves: 0, flash: 0 };
  const flMid = () => FLP.y + FLP.h / 2;
  const flHalf = () => (7 * FL_S + 24 * FL_S) / 2;
  function flInit(seed) {
    const rr = mulberry(seed || 11);
    S.fl.lip = []; S.fl.solved = false; S.fl.moves = 0;
    for (let row = 0; row < 2; row++) for (let i = 0; i < FL_PER; i++) {
      const sp = (FLP.w - 90) / (FL_PER - 1);
      S.fl.lip.push({ row, i, cx: FLP.x + 45 + i * sp, cy: flMid() + (row === 0 ? -1 : 1) * (flHalf() + 3), flip: rr() < 0.5, a: 0, kink: (i + row) % 3 === 0 });
    }
    if (S.fl.lip.filter((l) => l.flip).length < 5) { S.fl.lip[2].flip = true; S.fl.lip[FL_PER + 4].flip = true; S.fl.lip[FL_PER + 1].flip = true; S.fl.lip[5].flip = true; S.fl.lip[0].flip = true; }
    if (S.fl.lip.every((l) => l.flip)) S.fl.lip[3].flip = false;
    S.fl.lip.forEach((l) => { l.a = flAng(l); });
  }
  // 위쪽 줄: 올바른 방향은 머리가 위(꼬리가 아래, 각도 +90도). 아래쪽 줄: 머리가 아래(각도 -90도).
  function flAng(l) { const ok = l.row === 0 ? Math.PI / 2 : -Math.PI / 2; return l.flip ? ok + Math.PI : ok; }
  const flWrong = () => S.fl.lip.filter((l) => l.flip);
  function flToggle(l) {
    l.flip = !l.flip; Sound.click(); S.fl.moves++;
    SciSim.tween(l, { a: flAng(l) }, { duration: RM ? 0.01 : 0.42, ease: 'outBack' });
    updateCtl();
  }
  function flShuffle() { SciSim.tween(S.fl, {}, { duration: 0.01 }); flInit(Math.floor(Math.random() * 9999) + 3); S.fl.lip.forEach((l) => { l.pop = 1; }); updateCtl(); }
  flInit(11);
  function flDraw(dt, t) {
    const mid = flMid();
    waterPanel({ x: FLP.x, y: FLP.y, w: FLP.w, h: FLP.h }, '#d6ecfb', '#a9d4f2');
    // 막 띠
    ctx.fillStyle = 'rgba(255,247,225,.55)'; ctx.fillRect(FLP.x + 8, mid - flHalf() * 2 - 6, FLP.w - 16, flHalf() * 4 + 12);
    T(FLP.x + 18, FLP.y + 32, '💧 바깥쪽 물', 15, '#1d4f91', 'left', 800);
    T(FLP.x + 18, FLP.y + FLP.h - 16, '💧 안쪽 물', 15, '#1d4f91', 'left', 800);
    S.fl.lip.forEach((l) => {
      l.pop = approach(l.pop || 0, 0, dt, 5);
      const dirx = Math.cos(l.a), diry = Math.sin(l.a), hx = l.cx - dirx * flHalf(), hy = l.cy - diry * flHalf();
      const exposed = (l.row === 0 && diry < -0.35) || (l.row === 1 && diry > 0.35);
      drawLipid(hx, hy, l.a, { s: FL_S, kink: l.kink, hot: exposed && !l.flipping });
      if (exposed) { const ty = l.cy + diry * flHalf() * 1.1; T(l.cx, l.row === 0 ? ty - 16 : ty + 24, '물에 닿아요', 12, '#b91c1c', 'center', 800, { stroke: 'rgba(255,255,255,.85)', strokeWidth: 3, alpha: 0.9 }); }
    });
    if (S.fl.solved) { T(FLP.x + FLP.w / 2, mid - flHalf() * 2 - 24, '✔ 머리는 물 쪽, 꼬리는 안쪽으로!', 15, '#15803d', 'center', 800, { stroke: '#fff', strokeWidth: 4 }); }
    // 아래 안내
    panel(FLTXT.x, FLTXT.y, FLTXT.w, FLTXT.h, 16, '#ffffff');
    const w = flWrong().length;
    textBlock(FLTXT.x + 16, FLTXT.y + 30, FLTXT.w - 32, w ? '인지질을 눌러 뒤집어요. 꼬리가 물에 닿는 인지질이 ' + w + '개 남아 있어요. (빨간 꼬리)' : '모든 인지질의 머리가 물 쪽, 꼬리가 안쪽으로 모였어요. 이것이 인지질 이중층이에요!', L(15, 14), w ? '#475569' : '#15803d', 21, 800);
    if (PHONE) textBlock(FLTXT.x + 16, FLTXT.y + 92, FLTXT.w - 32, '막은 두 겹이라서 양쪽 물을 향한 머리가 바깥과 안쪽 면을 이루고, 소수성 꼬리는 가운데에 모여 물을 막아요.', 13.5, '#64748b', 19, 700);
  }
  const flPT = {
    down(p) { for (const l of S.fl.lip) if (Math.abs(p.x - l.cx) < 30 && Math.abs(p.y - l.cy) < flHalf() + 8) { S.fl.dn = l; return true; } return false; },
    up(p) {
      const l = S.fl.dn; S.fl.dn = null; if (!l) return;
      if (Math.abs(p.x - l.cx) < 30 && Math.abs(p.y - l.cy) < flHalf() + 12) {
        const was = S.fl.solved; flToggle(l); S.fl.solved = flWrong().length === 0;
        if (S.fl.solved && !was) { parts.burst(FLP.x + FLP.w / 2, flMid(), { count: 24, speed: 220 }); Sound.success(); }
        updateCtl();
      }
    },
    hover(p) { return S.fl.lip.some((l) => Math.abs(p.x - l.cx) < 30 && Math.abs(p.y - l.cy) < flHalf() + 8) ? 'pointer' : 'default'; },
  };


  /* =========================================================
     ② 막 단백질 : 이중층에 5종을 끌어다 놓기, 콜레스테롤, 단면 ↔ 위에서 본 모양
     ========================================================= */
  const PTYPES = ['ch', 'ca', 're', 'en', 'gp'];
  const PROT = {
    ch: { name: '통로 단백질', col: '#7c3aed', fn: '이온이 지나가는 길(구멍)을 만들어요.' },
    ca: { name: '운반체 단백질', col: '#0d9488', fn: '물질과 결합해 모양이 바뀌며 반대편으로 옮겨요.' },
    re: { name: '수용체', col: '#ea580c', fn: '신호 분자가 결합하면 세포 안으로 신호를 전달해요.' },
    en: { name: '효소', col: '#0284c7', fn: '막에서 화학 반응을 도와요(촉매).' },
    gp: { name: '인식 당단백질', col: '#db2777', fn: '바깥쪽 당 사슬로 세포를 알아보게 해요.' },
  };
  const PRP = PHONE ? { x: 10, y: 10, w: 460, h: 372 } : { x: 14, y: 14, w: 772, h: 376 };
  const PTR = PHONE ? { x: 10, y: 392, w: 460, h: 238 } : { x: 14, y: 402, w: 772, h: 144 };
  const prMid = () => PRP.y + (PHONE ? 196 : 206);
  const prSlotX = (i) => PRP.x + PRP.w * (i + 0.5) / 5;
  const PLS = 0.85, PSP = 15;
  const TRS = PHONE ? 0.55 : 0.62;
  const trayPos = (i) => (PHONE ? { x: PTR.x + 80 + (i % 3) * 150, y: PTR.y + 84 + Math.floor(i / 3) * 102 } : { x: PTR.x + PTR.w * (i + 0.5) / 5, y: PTR.y + 90 });
  const CHOL_X = [0.2, 0.4, 0.6, 0.8, 0.03, 0.97];
  S.pr = { items: PTYPES.map((k, i) => { const p = trayPos(i); return { type: k, slot: -1, x: p.x, y: p.y, s: TRS, lift: 0, pop: 0 }; }), chol: 0, cdrop: [0, 0, 0, 0, 0, 0], view: 0, vf: 0, drag: null, info: null };
  const prPlaced = () => S.pr.items.filter((q) => q.slot >= 0);
  function prReset() {
    S.pr.items.forEach((q, i) => { q.slot = -1; q.lift = 0; const p = trayPos(i); SciSim.tween(q, { x: p.x, y: p.y, s: TRS }, { duration: RM ? 0.01 : 0.3 }); });
    S.pr.chol = 0; S.pr.cdrop = [0, 0, 0, 0, 0, 0]; S.pr.info = null; S.pr.drag = null; updateCtl();
  }
  function prAddChol() { if (S.pr.chol >= 6) return; S.pr.cdrop[S.pr.chol] = 1; S.pr.chol++; Sound.click(); updateCtl(); }
  function prPlace(q, slot) {
    q.slot = slot; q.lift = 0;
    SciSim.tween(q, { x: prSlotX(slot), y: prMid(), s: 1 }, { duration: RM ? 0.01 : 0.35, ease: 'outBack' });
    q.pop = 1; Sound.success(); parts.burst(prSlotX(slot), prMid(), { count: 10, speed: 120, size: 3 });
    S.pr.info = q.type; showHint(PROT[q.type].name + ': ' + PROT[q.type].fn, 4500); updateCtl();
  }

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
  /* 시연 분자들 (막 단백질 가운데 x, 막 가운데 y, 시간 t) */
  function drawProtDemo(type, x, my, t) {
    if (RM) return;
    const ss = (v) => smooth(v);
    if (type === 'ch') {
      for (let kk = 0; kk < 2; kk++) {
        const q = (t * 0.3 + kk * 0.5) % 1, yy = lerp(-128, 128, q), f = ss((Math.abs(yy) - 46) / 34);
        D.sphere(x + Math.sin(q * 14 + kk * 2) * 15 * f, my + yy, 5.5, '#22c55e', { gloss: true }); }
    } else if (type === 'ca') {
      const p = ((t * 0.2) % 1), kk = p < 0.38 ? 0 : p < 0.62 ? ss((p - 0.38) / 0.24) : 1, pk = -41 + 82 * kk;
      let gy = null;
      if (p < 0.22) gy = lerp(-125, -41, ss(p / 0.22)); else if (p < 0.62) gy = pk; else if (p < 0.78) gy = lerp(41, 125, ss((p - 0.62) / 0.16));
      if (gy != null) hex(x + (p < 0.22 || p > 0.62 ? Math.sin(t * 3) * 3 : 0), my + gy, 8.5, '#fde047');
    } else if (type === 're') {
      const p = ((t * 0.16) % 1);
      let sy = null, sx = 0;
      if (p < 0.28) { sy = lerp(-130, -66, ss(p / 0.28)); sx = lerp(26, 0, ss(p / 0.28)); } else if (p < 0.62) { sy = -66; } else if (p < 0.8) { sy = lerp(-66, -130, ss((p - 0.62) / 0.18)); sx = lerp(0, 26, ss((p - 0.62) / 0.18)); }
      if (sy != null) starShape(x + sx, my + sy, 10, '#ef4444');
    } else if (type === 'en') {
      const p = ((t * 0.16) % 1);
      if (p < 0.3) { const q = ss(p / 0.3); D.sphere(x - lerp(62, 6, q), my + lerp(104, 44, q), 6.5, '#ef4444', { gloss: true }); D.sphere(x + lerp(62, 6, q), my + lerp(104, 44, q), 6.5, '#3b82f6', { gloss: true }); }
      else if (p < 0.5) { D.sphere(x - 5, my + 44, 6.5, '#ef4444', { gloss: true }); D.sphere(x + 5, my + 44, 6.5, '#3b82f6', { gloss: true }); if (p > 0.4) D.glow(x, my + 44, 26, '#fde047', 0.7); }
      else if (p < 0.8) { const q = ss((p - 0.5) / 0.3), yy = lerp(44, 124, q); D.sphere(x - 5, my + yy, 6.5, '#ef4444', { gloss: true }); D.sphere(x + 5, my + yy, 6.5, '#3b82f6', { gloss: true }); }
    } else if (type === 'gp') {
      const q = (t * 0.25) % 1; ctx.save(); ctx.globalAlpha = 1 - q; ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(x, my - 92, 8 + q * 26, 0, TAU); ctx.stroke(); ctx.restore();
    }
  }
  function drawChol(x, y, o) {
    ctx.save(); ctx.translate(x, y); if (o && o.alpha != null) ctx.globalAlpha = o.alpha; ctx.rotate(o && o.up ? Math.PI : 0);
    D.roundRect(-4.6, -12, 9.2, 24, 4.5); ctx.fillStyle = '#facc15'; ctx.fill(); ctx.strokeStyle = '#b45309'; ctx.lineWidth = 1.4; ctx.stroke();
    ctx.strokeStyle = 'rgba(180,83,9,.6)'; ctx.lineWidth = 1; for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(-4.6, k * 6); ctx.lineTo(4.6, k * 6); ctx.stroke(); }
    ctx.fillStyle = '#60a5fa'; ctx.beginPath(); ctx.arc(0, -13.5, 3.2, 0, TAU); ctx.fill(); ctx.restore();
  }
  function prDraw(dt, t) {
    const P = S.pr, mid = prMid(), per = PRP.w;
    P.vf = approach(P.vf, P.view, dt, RM ? 99 : 7);
    P.items.forEach((q) => { q.lift = approach(q.lift, P.drag && P.drag.q === q && P.drag.moved ? 1 : 0, dt, 14); q.pop = approach(q.pop || 0, 0, dt, 3); });
    P.cdrop = P.cdrop.map((v) => approach(v, 0, dt, 5));
    // 배경: 세포 밖 / 세포 안
    ctx.save(); D.roundRect(PRP.x, PRP.y, PRP.w, PRP.h, 18); ctx.clip();
    const g1 = ctx.createLinearGradient(0, PRP.y, 0, mid); g1.addColorStop(0, '#e1f1fc'); g1.addColorStop(1, '#cfe6f7'); ctx.fillStyle = g1; ctx.fillRect(PRP.x, PRP.y, PRP.w, mid - PRP.y);
    const g2 = ctx.createLinearGradient(0, mid, 0, PRP.y + PRP.h); g2.addColorStop(0, '#f6efd6'); g2.addColorStop(1, '#efe3b8'); ctx.fillStyle = g2; ctx.fillRect(PRP.x, mid, PRP.w, PRP.y + PRP.h - mid);
    ctx.restore();
    ctx.strokeStyle = 'rgba(30,90,150,.3)'; ctx.lineWidth = 2; D.roundRect(PRP.x, PRP.y, PRP.w, PRP.h, 18); ctx.stroke();
    const va = 1 - P.vf;
    if (va > 0.02) {
      ctx.save(); ctx.globalAlpha = va;
      T(PRP.x + 16, PRP.y + 28, '세포 밖', 15, '#1d4f91', 'left', 800);
      T(PRP.x + 16, PRP.y + PRP.h - 10, '세포 안 (세포질)', 15, '#92400e', 'left', 800);
      T(PRP.x + PRP.w - 14, PRP.y + 28, '단면(옆에서 본 모양)', 13.5, '#475569', 'right', 800);
      // 인지질 이중층
      const occ = prPlaced().map((q) => prSlotX(q.slot)), n = Math.floor((PRP.w - 20) / PSP);
      const chx = []; for (let i = 0; i < P.chol; i++) chx.push({ x: PRP.x + CHOL_X[i] * per, top: i % 2 === 0, i });
      for (let i = 0; i < n; i++) {
        const lx = PRP.x + 10 + PSP / 2 + i * PSP; if (occ.some((ox) => Math.abs(lx - ox) < 34)) continue;
        const wob = RM ? 0 : Math.sin(t * 1.7 + i * 1.9) * 1.1;
        if (!chx.some((c) => c.top && Math.abs(lx - c.x) < PSP * 0.85)) drawLipid(lx, mid - 30 + wob, Math.PI / 2, { s: PLS, kink: i % 5 === 2 });
        if (!chx.some((c) => !c.top && Math.abs(lx - c.x) < PSP * 0.85)) drawLipid(lx, mid + 30 - wob, -Math.PI / 2, { s: PLS, kink: i % 5 === 4 });
      }
      chx.forEach((c) => { const off = -P.cdrop[c.i] * 90; drawChol(c.x, mid + (c.top ? -17 : 17) + off, { up: !c.top, alpha: 1 - P.cdrop[c.i] * 0.5 }); });
      if (P.chol >= 1) T(PRP.x + PRP.w / 2, PRP.y + 28, '노란 막대: 콜레스테롤', 13, '#a16207', 'center', 800, { stroke: 'rgba(255,255,255,.7)', strokeWidth: 3 });
      // 단백질
      prPlaced().forEach((q) => {
        if (P.drag && P.drag.q === q) return;
        const sx = prSlotX(q.slot), pp = ((t * 0.2) % 1), ph = q.type === 'ca' ? (pp < 0.38 ? 0 : pp < 0.62 ? smooth((pp - 0.38) / 0.24) : pp < 0.78 ? 1 : 1 - smooth((pp - 0.78) / 0.22)) : 0;
        const rp = (t * 0.16) % 1, ra = q.type === 're' ? (rp > 0.28 && rp < 0.62 ? smooth((rp - 0.28) / 0.1) : rp >= 0.62 && rp < 0.8 ? 1 - smooth((rp - 0.62) / 0.18) : 0) : 0;
        drawProtDemo(q.type, sx, mid, t);
        drawProt(q.type, q.x, q.y, { s: q.s * (1 + q.pop * 0.12), k: ph, a: ra, t });
        const lb = D.label(sx, PRP.y + PRP.h - 42, PROT[q.type].name, { bg: PROT[q.type].col, size: 12.5 });
      });
      ctx.restore();
    }
    if (P.vf > 0.02) prTopDraw(t, P.vf);
    // 끌고 있는 단백질
    if (P.drag && P.drag.moved) drawProt(P.drag.q.type, P.drag.q.x, P.drag.q.y, { s: 1.12, lift: 1, t });
    // 트레이
    panel(PTR.x, PTR.y, PTR.w, PTR.h, 16, '#ffffff');
    T(PTR.x + 16, PTR.y + 26, '막 단백질 5종을 끌어(또는 눌러) 막에 넣어요 · ' + prPlaced().length + ' / 5', L(15, 13.5), '#334155', 'left', 800);
    P.items.forEach((q, i) => {
      const tp = trayPos(i);
      if (q.slot >= 0 || (P.drag && P.drag.q === q && P.drag.moved)) { ctx.save(); ctx.globalAlpha = 0.28; drawProt(q.type, tp.x, tp.y, { s: TRS * 0.8 }); ctx.restore(); }
      else drawProt(q.type, q.x, q.y, { s: q.s * (1 + q.lift * 0.1), lift: q.lift, t });
      TF(tp.x, tp.y + L(46, 40), PROT[q.type].name, L(120, 140), 13.5, 11.5, '#26324a', 'center', 800);
      if (q.slot >= 0) D.check(tp.x + 30, tp.y - 10, 9, 1);
    });
    if (!prPlaced().length && !P.drag) D.label(PRP.x + PRP.w / 2, mid, '▼ 단백질을 이 막에 끌어다 놓아요 ▼', { bg: 'rgba(255,255,255,.9)', color: '#475569', border: '#cbd5e1', size: 13.5 });
  }
  /* 위에서 본 모양 (모자이크) */
  function prTopDraw(t, a) {
    const P = S.pr; ctx.save(); ctx.globalAlpha = a;
    ctx.save(); D.roundRect(PRP.x + 1, PRP.y + 1, PRP.w - 2, PRP.h - 2, 17); ctx.clip();
    const bg = ctx.createLinearGradient(0, PRP.y, 0, PRP.y + PRP.h); bg.addColorStop(0, '#f4f9ff'); bg.addColorStop(1, '#e8f2fb'); ctx.fillStyle = bg; ctx.fillRect(PRP.x, PRP.y, PRP.w, PRP.h);
    const cols = Math.floor((PRP.w - 24) / 17), rows = Math.floor((PRP.h - 60) / 15), pr = prPlaced();
    const pos = pr.map((q) => ({ q, x: prSlotX(q.slot) + Math.sin(t * 0.5 + q.slot * 1.7) * 9, y: PRP.y + 70 + ((q.slot * 71) % 5) * ((PRP.h - 150) / 4) + Math.cos(t * 0.4 + q.slot) * 8 }));
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const x = PRP.x + 20 + c * 17 + (r % 2 ? 8 : 0) + (RM ? 0 : Math.sin(t * 1.5 + r * 3 + c * 7) * 1.6), y = PRP.y + 48 + r * 15 + (RM ? 0 : Math.cos(t * 1.3 + c * 5 + r) * 1.6);
      if (pos.some((p) => Math.hypot(p.x - x, p.y - y) < 36)) continue;
      ctx.fillStyle = HEADC; ctx.beginPath(); ctx.arc(x, y, 5.2, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.arc(x - 1.5, y - 1.6, 1.8, 0, TAU); ctx.fill();
    }
    for (let i = 0; i < P.chol; i++) { const x = PRP.x + 30 + ((i * 131) % 7) * ((PRP.w - 60) / 6), y = PRP.y + 56 + ((i * 53) % 6) * ((PRP.h - 100) / 5); ctx.fillStyle = '#facc15'; ctx.strokeStyle = '#b45309'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(x, y, 7, 0, TAU); ctx.fill(); ctx.stroke(); }
    pos.forEach((p) => {
      const col = PROT[p.q.type].col; ctx.save(); ctx.translate(p.x, p.y);
      if (p.q.type === 'ch') { D.sphere(0, 0, 25, col, { gloss: true, shadow: true }); D.sphere(0, 0, 9, '#bfe3ff', { gloss: false }); }
      else if (p.q.type === 'ca') { D.sphere(0, 0, 25, col, { gloss: true, shadow: true }); ctx.fillStyle = '#dff0fc'; ctx.beginPath(); ctx.arc(10, -8, 8, 0, TAU); ctx.fill(); }
      else if (p.q.type === 're') { D.sphere(0, 0, 22, col, { gloss: true, shadow: true }); ctx.strokeStyle = C.shade(col, -0.2); ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-8, -6); ctx.lineTo(-18, -20); ctx.moveTo(8, -6); ctx.lineTo(18, -20); ctx.stroke(); }
      else if (p.q.type === 'en') { D.sphere(0, 0, 25, col, { gloss: true, shadow: true }); ctx.fillStyle = '#dff0fc'; ctx.beginPath(); ctx.arc(0, 15, 8, 0, TAU); ctx.fill(); }
      else { D.sphere(0, 0, 21, col, { gloss: true, shadow: true }); ctx.strokeStyle = '#d97706'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(8, -8); ctx.lineTo(22, -22); ctx.lineTo(34, -16); ctx.moveTo(22, -22); ctx.lineTo(24, -36); ctx.stroke(); hex(22, -22, 5, '#fbbf24'); hex(34, -16, 5, '#fbbf24'); hex(24, -36, 5, '#fbbf24'); }
      ctx.restore();
      D.label(p.x, p.y + 38, PROT[p.q.type].name, { bg: col, size: 12 });
    });
    ctx.restore();
    T(PRP.x + 16, PRP.y + 28, '위에서 본 모양: 단백질이 인지질 사이에 모자이크처럼 섞여 있어요', L(14.5, 13), '#475569', 'left', 800);
    if (!pr.length) T(PRP.x + PRP.w / 2, PRP.y + PRP.h / 2, '단면 화면에서 막 단백질을 먼저 넣어 보세요', 15, '#64748b', 'center', 800);
    ctx.restore();
  }
  const prPT = {
    down(p) {
      const P = S.pr; if (P.view) return false;
      for (const q of P.items.slice().reverse()) {
        const hit = q.slot >= 0 ? (Math.abs(p.x - prSlotX(q.slot)) < 32 && Math.abs(p.y - prMid()) < 62) : (Math.abs(p.x - q.x) < 36 && Math.abs(p.y - q.y) < 50);
        if (hit) { P.drag = { q, sx: p.x, sy: p.y, moved: false, from: q.slot }; Sound.tick(); SciSim.tween(q, { x: q.x }, { duration: 0.0001 }); return true; }
      }
      return false;
    },
    move(p) { const d = S.pr.drag; if (!d) return; if (Math.hypot(p.x - d.sx, p.y - d.sy) > 8) d.moved = true; if (d.moved) { d.q.x = clamp(p.x, 20, VW - 20); d.q.y = clamp(p.y, 20, VH - 20); } },
    up(p) {
      const P = S.pr, d = P.drag; if (!d) return; P.drag = null; const q = d.q;
      if (!d.moved) { P.info = q.type; showHint(PROT[q.type].name + ': ' + PROT[q.type].fn, 4500); if (q.slot < 0) { const free = [0, 1, 2, 3, 4].filter((s) => !P.items.some((o) => o.slot === s)); if (free.length) { const best = free.sort((a, b) => Math.abs(a - 2) - Math.abs(b - 2))[0]; prPlace(q, best); } } return; }
      const inBand = p.x > PRP.x && p.x < PRP.x + PRP.w && Math.abs(p.y - prMid()) < 74;
      if (inBand) {
        const free = [0, 1, 2, 3, 4].filter((s) => !P.items.some((o) => o !== q && o.slot === s)).sort((a, b) => Math.abs(prSlotX(a) - p.x) - Math.abs(prSlotX(b) - p.x));
        if (free.length) { prPlace(q, free[0]); return; }
      }
      // 되돌리기
      const i = P.items.indexOf(q), tp = trayPos(i); q.slot = -1; SciSim.tween(q, { x: tp.x, y: tp.y, s: TRS }, { duration: RM ? 0.01 : 0.35, ease: 'outBack' }); updateCtl();
    },
    hover(p) { const P = S.pr; return !P.view && P.items.some((q) => (q.slot >= 0 ? Math.abs(p.x - prSlotX(q.slot)) < 32 && Math.abs(p.y - prMid()) < 62 : Math.abs(p.x - q.x) < 36 && Math.abs(p.y - q.y) < 50)) ? 'grab' : 'default'; },
  };

  /* ----- 단백질 5종 – 기능 연결 (카드를 상자에 넣기) ----- */
  const MBOX = PHONE ? { w: 224, h: 122, g: 12 } : { w: 250, h: 132, g: 11 };
  const matchS = new Sorter({
    cards: ['re', 'gp', 'ch', 'en', 'ca'].map((k) => ({ id: k, label: PROT[k].name, col: PROT[k].col })),
    boxes: PTYPES.map((k, i) => ({
      id: k, label: '기능 ' + (i + 1), col: '#16a34a',
      x: PHONE ? 10 + (i % 2) * (MBOX.w + MBOX.g) : 14 + (i % 3) * (MBOX.w + MBOX.g), y: PHONE ? 10 + Math.floor(i / 2) * (MBOX.h + 10) : 14 + Math.floor(i / 3) * (MBOX.h + 12), w: MBOX.w, h: MBOX.h, cols: 1, hdr: PHONE ? 76 : 82,
      draw: (b) => { textBlock(b.x + 12, b.y + 44, b.w - 24, PROT[k].fn, 13.5, '#475569', 18, 700); },
    })),
    cw: PHONE ? 214 : 236, ch: 48, kh: 44,
    tray: (i) => (PHONE ? { x: 16 + (i % 2) * 226, y: 452 + Math.floor(i / 2) * 58 } : { x: 28 + (i % 3) * 252, y: 332 + Math.floor(i / 3) * 62 }),
    onChange() { updateCtl(); },
  });
  const matchWrong = () => matchS.cards.filter((c) => c.zone && c.zone !== c.id);
  const MTRAY = PHONE ? { x: 10, y: 404, w: 460, h: 226 } : { x: 14, y: 290, w: 772, h: 256 };
  function matchDraw(dt, t) {
    matchS.update(dt); matchS.drawBoxes();
    panel(MTRAY.x, MTRAY.y, MTRAY.w, MTRAY.h, 16, '#ffffff');
    T(MTRAY.x + 16, MTRAY.y + 30, '막 단백질 카드 5장을 알맞은 기능 상자에 한 장씩 넣어요', L(15, 13.5), '#334155', 'left', 800);
    if (!PHONE) {   // 빈 여섯 번째 칸에 도움말
      const bx = 14 + 2 * (MBOX.w + MBOX.g), by = 14 + MBOX.h + 12;
      panel(bx, by, MBOX.w, MBOX.h, 14, '#fffdf5'); T(bx + 14, by + 28, '💡 앞 화면에서 본 것', 14.5, '#92400e', 'left', 800);
      textBlock(bx + 14, by + 54, MBOX.w - 28, '이온이 줄지어 지나갔고, 포도당이 붙어 반대편으로 옮겨졌고, 별 모양 신호가 붙자 색이 변했어요.', 13, '#6b5a2a', 18, 700);
    }
    matchS.drawCards();
  }
  const matchPT = { down: (p) => matchS.down(p), move: (p) => matchS.move(p), up: (p) => matchS.up(p), hover: (p) => matchS.hover(p) };


  /* =========================================================
     ③ 유동성 : 프라이와 에디딘 실험 재현 (사람 세포 + 생쥐 세포 융합)
     ========================================================= */
  const FXG = PHONE
    ? { pl: { x: 10, y: 10, w: 460, h: 262 }, side: { x: 10, y: 282, w: 460, h: 160 }, gr: { x: 10, y: 452, w: 460, h: 178 } }
    : { pl: { x: 14, y: 14, w: 520, h: 300 }, gr: { x: 14, y: 326, w: 520, h: 220 }, side: { x: 546, y: 14, w: 240, h: 532 } };
  const FX_N = 250, FX_SPEED = 2.5, FX_S0 = 0.09, FX_TMAX = 60, FX_THR = 85;
  const fxDW = () => FXG.pl.w - 24, fxDH = () => FXG.pl.h - 56;
  S.fx = { T: 37, u: 40, chol: false, play: false, t: 0, ps: [], hist: [], mix: 0, t85: null, acc: 0, hnext: 0 };
  /* 막의 유동성 (0~1): 전이 온도보다 낮으면 굳어요. 불포화 지방산이 많으면 전이 온도가 낮아요. 콜레스테롤은 변화를 완충해요. */
  function fluidM(T, u, ch) {
    const Tm = 22 - 0.18 * u, sg = (s) => 1 / (1 + Math.exp(-(T - Tm) / s));
    return ch ? 0.3 + 0.5 * sg(8) : sg(3);
  }
  const fxM = () => fluidM(S.fx.T, S.fx.u, S.fx.chol);
  const fxMPct = () => Math.round(fxM() * 100);
  function fxInit() {
    const rr = mulberry(2024), F = S.fx; F.ps = [];
    for (let i = 0; i < FX_N; i++) { F.ps.push({ x: rr() * 0.5, y: rr(), c: 0 }); F.ps.push({ x: 0.5 + rr() * 0.5, y: rr(), c: 1 }); }
    F.t = 0; F.hist = [{ t: 0, m: 0 }]; F.hnext = 0.5; F.mix = 0; F.t85 = null; F.acc = 0;
  }
  function fxReset() { S.fx.play = false; fxInit(); updateCtl(); }
  fxInit();
  function fxMeasure() {
    let r = 0, g = 0; S.fx.ps.forEach((p) => { if (p.c === 0 && p.x > 0.5) r++; else if (p.c === 1 && p.x < 0.5) g++; });
    return Math.round(Math.min(1, (r + g) / FX_N) * 100);
  }
  function gauss() { let u = 0; while (!u) u = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * Math.random()); }
  function fxUpdate(dt) {
    const F = S.fx;
    if (F.play && F.t < FX_TMAX) {
      const dtm = Math.min(dt, 0.05) * FX_SPEED * (RM ? 3 : 1), sg = FX_S0 * Math.sqrt(fxM() * dtm), asp = fxDW() / fxDH();
      F.ps.forEach((p) => {
        let x = p.x + sg * gauss(), y = p.y + sg * asp * gauss();
        if (x < 0) x = -x; if (x > 1) x = 2 - x; if (y < 0) y = -y; if (y > 1) y = 2 - y;
        p.x = clamp(x, 0, 1); p.y = clamp(y, 0, 1);
      });
      F.t = Math.min(FX_TMAX, F.t + dtm);
      F.mix = fxMeasure();
      if (F.t85 == null && F.mix >= FX_THR) { F.t85 = F.t; Sound.success(); const q = FXG.pl; parts.burst(q.x + q.w / 2, q.y + q.h / 2, { count: 20, speed: 200 }); }
      if (F.t >= F.hnext) { F.hist.push({ t: F.t, m: F.mix }); F.hnext = F.t + 0.5; }
      if (F.t >= FX_TMAX) { F.play = false; updateCtl(); }
    }
  }
  const fxMin = () => Math.round(S.fx.t * 10) / 10;
  function fxDraw(dt, t) {
    fxUpdate(dt);
    const F = S.fx, PL = FXG.pl, M = fxM();
    // 형광 현미경 화면
    ctx.save(); D.roundRect(PL.x, PL.y, PL.w, PL.h, 18); ctx.clip();
    const bg = ctx.createLinearGradient(0, PL.y, 0, PL.y + PL.h); bg.addColorStop(0, '#0f172a'); bg.addColorStop(1, '#16233f'); ctx.fillStyle = bg; ctx.fillRect(PL.x, PL.y, PL.w, PL.h);
    // 인지질 머리 격자 (유동성이 클수록 많이 떨려요)
    ctx.fillStyle = 'rgba(96,165,250,.28)'; ctx.beginPath();
    const cols = Math.floor(fxDW() / 22), rows = Math.floor(fxDH() / 22), amp = (RM ? 0 : 0.4 + 3.2 * M);
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const x = PL.x + 22 + c * 22 + (r % 2 ? 11 : 0) + Math.sin(t * 3 + r * 5 + c * 3) * amp, y = PL.y + 50 + r * 22 + Math.cos(t * 2.6 + c * 4 + r) * amp;
      ctx.moveTo(x + 3.2, y); ctx.arc(x, y, 3.2, 0, TAU);
    }
    ctx.fill();
    ctx.setLineDash([5, 5]); ctx.strokeStyle = 'rgba(255,255,255,.28)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(PL.x + PL.w / 2, PL.y + 40); ctx.lineTo(PL.x + PL.w / 2, PL.y + PL.h - 6); ctx.stroke(); ctx.setLineDash([]);
    // 형광 점
    ['#ef4444', '#22c55e'].forEach((col, ci) => {
      ctx.fillStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 8; ctx.beginPath();
      F.ps.forEach((p) => { if (p.c !== ci) return; const x = PL.x + 12 + p.x * fxDW(), y = PL.y + 40 + p.y * fxDH(); ctx.moveTo(x + 3.7, y); ctx.arc(x, y, 3.7, 0, TAU); });
      ctx.fill(); ctx.shadowBlur = 0;
    });
    ctx.restore();
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 3; D.roundRect(PL.x, PL.y, PL.w, PL.h, 18); ctx.stroke();
    T(PL.x + 16, PL.y + 28, '막 평면 (위에서 본 모양)', L(15, 13.5), '#e2e8f0', 'left', 800);
    ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.arc(PL.x + PL.w - 150, PL.y + 23, 5, 0, TAU); ctx.fill(); T(PL.x + PL.w - 140, PL.y + 28, '사람 세포', 12.5, '#fecaca', 'left', 800);
    ctx.fillStyle = '#22c55e'; ctx.beginPath(); ctx.arc(PL.x + PL.w - 74, PL.y + 23, 5, 0, TAU); ctx.fill(); T(PL.x + PL.w - 64, PL.y + 28, '생쥐 세포', 12.5, '#bbf7d0', 'left', 800);
    if (F.t === 0) D.label(PL.x + PL.w / 2, PL.y + PL.h / 2, '▶ 재생을 눌러 40분을 빠르게 돌려 보세요', { bg: 'rgba(255,255,255,.92)', color: '#334155', size: 13.5 });
    // 그래프
    const GR = FXG.gr; panel(GR.x, GR.y, GR.w, GR.h, 16, '#ffffff');
    const x0 = GR.x + 50, x1 = GR.x + GR.w - 20, y0 = GR.y + GR.h - 40, y1 = GR.y + 38;
    T(GR.x + 16, GR.y + 26, '섞인 정도(%)와 시간(분)', L(15, 13.5), '#334155', 'left', 800);
    ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1; ctx.fillStyle = '#64748b';
    for (let v = 0; v <= 100; v += 25) { const yy = lerp(y0, y1, v / 100); ctx.beginPath(); ctx.moveTo(x0, yy); ctx.lineTo(x1, yy); ctx.stroke(); T(x0 - 6, yy + 4, String(v), 12, '#64748b', 'right', 700); }
    for (let m = 0; m <= FX_TMAX; m += 10) { const xx = lerp(x0, x1, m / FX_TMAX); ctx.beginPath(); ctx.moveTo(xx, y0); ctx.lineTo(xx, y0 + 4); ctx.stroke(); T(xx, y0 + 18, String(m), 12, '#64748b', 'center', 700); }
    T((x0 + x1) / 2, y0 + 34, '시간 (분)', 12.5, '#64748b', 'center', 700);
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x0, y1); ctx.lineTo(x0, y0); ctx.lineTo(x1, y0); ctx.stroke();
    D.dashedLine(x0, lerp(y0, y1, FX_THR / 100), x1, lerp(y0, y1, FX_THR / 100), { color: '#16a34a', width: 1.6, dash: [5, 5] });
    T(x1, lerp(y0, y1, FX_THR / 100) - 5, FX_THR + ' % (섞였다고 봐요)', 12, '#15803d', 'right', 800);
    ctx.strokeStyle = '#0ea5e9'; ctx.lineWidth = 2.6; ctx.lineJoin = 'round'; ctx.beginPath();
    F.hist.forEach((h, i) => { const xx = lerp(x0, x1, h.t / FX_TMAX), yy = lerp(y0, y1, h.m / 100); if (i) ctx.lineTo(xx, yy); else ctx.moveTo(xx, yy); }); ctx.stroke();
    if (F.t85 != null) { const xx = lerp(x0, x1, F.t85 / FX_TMAX), yy = lerp(y0, y1, FX_THR / 100); D.sphere(xx, yy, 6, '#16a34a', { gloss: true }); D.label(Math.min(xx + 6, x1 - 60), yy + 26, F.t85.toFixed(1) + '분에 도달', { bg: '#16a34a', size: 12.5 }); }
    // 오른쪽 · 아래 : 막의 상태
    fxSide(FXG.side, t);
  }
  function fxSide(R, t) {
    const F = S.fx, M = fxM(), pct = fxMPct();
    panel(R.x, R.y, R.w, R.h, 16, '#ffffff');
    T(R.x + 16, R.y + 28, '막의 상태', L(16, 14.5), '#334155', 'left', 800);
    // 막 단면 : 꼬리 모양과 간격
    const n = PHONE ? 10 : 7, nk = Math.round(n * F.u / 100), sp = PHONE ? 40 : 30 + 5 * (F.u / 100) * 0, gx = R.x + R.w / 2 - (n - 1) * (PHONE ? 34 : 29 + F.u * 0.05) / 2, my = R.y + (PHONE ? 74 : 92);
    for (let i = 0; i < n; i++) {
      const stp = PHONE ? 34 : 29 + F.u * 0.05, x = gx + i * stp + (RM ? 0 : Math.sin(t * 3 + i * 2) * (0.4 + 2.4 * M));
      drawLipid(x, my - 28, Math.PI / 2, { s: PHONE ? 0.8 : 0.85, kink: i < nk });
      drawLipid(x, my + 28, -Math.PI / 2, { s: PHONE ? 0.8 : 0.85, kink: i < nk });
    }
    if (F.chol) for (let k = 0; k < 2; k++) { const stp = PHONE ? 34 : 29 + F.u * 0.05; drawChol(gx + (k ? n - 2.5 : 1.5) * stp, my - 16, {}); drawChol(gx + (k ? 2.5 : n - 1.5) * stp, my + 16, { up: true }); }
    if (!PHONE) T(R.x + R.w / 2, my + 62, nk ? '꺾인 꼬리(불포화) ' + nk + '/' + n : '곧은 꼬리(포화)만 있어요', 12.5, '#64748b', 'center', 800);
    const by = R.y + (PHONE ? 116 : 190);
    if (!PHONE) {
      T(R.x + 16, by + 20, '온도 ' + F.T + ' °C', 15, '#1f2d44', 'left', 800);
      T(R.x + 16, by + 44, '불포화 지방산 ' + F.u + ' %', 15, '#1f2d44', 'left', 800);
      T(R.x + 16, by + 68, '콜레스테롤 ' + (F.chol ? '있음' : '없음'), 15, '#1f2d44', 'left', 800);
      T(R.x + 16, by + 110, '막의 유동성', 15, '#475569', 'left', 800);
      T(R.x + R.w - 16, by + 114, pct + ' %', 24, pct >= 60 ? '#15803d' : pct >= 20 ? '#b45309' : '#b91c1c', 'right', 800);
      D.roundRect(R.x + 16, by + 128, R.w - 32, 14, 7); ctx.fillStyle = '#e5e7eb'; ctx.fill();
      if (pct > 0) { D.roundRect(R.x + 16, by + 128, Math.max(14, (R.w - 32) * pct / 100), 14, 7); ctx.fillStyle = pct >= 60 ? '#22c55e' : pct >= 20 ? '#f59e0b' : '#ef4444'; ctx.fill(); }
      textBlock(R.x + 16, by + 176, R.w - 32, pct < 20 ? '막이 굳어 단백질이 거의 움직이지 못해요.' : pct < 60 ? '막이 점점 뻑뻑해져요.' : '막이 액체처럼 흐르듯 움직여요.', 14, '#475569', 20, 800);
      textBlock(R.x + 16, by + 228, R.w - 32, '꺾인 꼬리(불포화)가 많으면 인지질 사이가 느슨해 낮은 온도에서도 잘 움직여요. 콜레스테롤은 너무 굳거나 너무 풀어지지 않게 막아 줘요.', 12.5, '#64748b', 17.5, 700);
    } else {
      T(R.x + 16, by + 14, '온도 ' + F.T + ' °C · 불포화 ' + F.u + ' % · 콜레스테롤 ' + (F.chol ? '있음' : '없음'), 14, '#1f2d44', 'left', 800);
      T(R.x + 16, by + 36, '막의 유동성 ' + pct + ' %', 15, pct >= 60 ? '#15803d' : pct >= 20 ? '#b45309' : '#b91c1c', 'left', 800);
    }
  }


  /* =========================================================
     ④ 투과성 추론 : 분자를 이중층에 보내 보고, 통과 방식으로 분류
     ========================================================= */
  const MOLS = [
    { id: 'o2', name: 'O₂', size: '작음', pol: '무극성', chg: '없음', kind: 'direct', sub: '작음 · 무극성' },
    { id: 'co2', name: 'CO₂', size: '작음', pol: '무극성', chg: '없음', kind: 'direct', sub: '작음 · 무극성' },
    { id: 'eth', name: '에탄올', size: '작음', pol: '극성이 약함', chg: '없음', kind: 'direct', sub: '작음 · 극성 약함' },
    { id: 'h2o', name: '물', size: '작음', pol: '극성', chg: '없음', kind: 'water', sub: '작음 · 극성' },
    { id: 'glc', name: '포도당', size: '큼', pol: '극성', chg: '없음', kind: 'prot', sub: '큼 · 극성' },
    { id: 'aa', name: '아미노산', size: '큼', pol: '극성', chg: '전하를 띠기도 함', kind: 'prot', sub: '큼 · 극성/전하' },
    { id: 'na', name: 'Na⁺', size: '작음', pol: '이온', chg: '+', kind: 'prot', sub: '이온 · 전하 +' },
    { id: 'k', name: 'K⁺', size: '작음', pol: '이온', chg: '+', kind: 'prot', sub: '이온 · 전하 +' },
    { id: 'pro', name: '단백질', size: '매우 큼', pol: '큰 분자', chg: '여러 곳이 전하', kind: 'no', sub: '매우 큼' },
  ];
  const MOL = {}; MOLS.forEach((m) => { MOL[m.id] = m; });
  const MZONE = { direct: 'direct', water: 'direct', prot: 'prot', no: 'no' };      // 물은 두 상자 모두 인정
  const molOk = (id, zone) => zone === MZONE[MOL[id].kind] || (id === 'h2o' && zone === 'prot');
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
  const SDP = PHONE ? { x: 10, y: 10, w: 460, h: 430 } : { x: 14, y: 14, w: 772, h: 396 };
  const SDI = PHONE ? { x: 10, y: 450, w: 460, h: 180 } : { x: 14, y: 422, w: 772, h: 124 };
  const sdMid = () => SDP.y + (PHONE ? 214 : 198);
  const SDX = { mol: PHONE ? 0.26 : 0.3, ch: PHONE ? 0.6 : 0.62, ca: PHONE ? 0.84 : 0.84 };
  S.pm = { sel: 'o2', prot: false, run: null, tested: {}, pa: 0, carK: 0, last: null };
  const sdX = (k) => SDP.x + SDP.w * SDX[k];
  function sdSend() {
    if (S.pm.run) return;
    const m = MOL[S.pm.sel], withP = S.pm.prot;
    S.pm.run = { m: m.id, t: 0, prot: withP, done: false };
    Sound.tick(); updateCtl();
  }
  /* 한 번 보내기의 시간표: {x, y, a(투명도), msg, path 길이} */
  function sdPlan(run) {
    const m = MOL[run.m], mid = sdMid(), y0 = SDP.y + 70, yTop = mid - 46, yBot = mid + 46, yEnd = SDP.y + SDP.h - 56;
    const xm = sdX('mol'), t = run.t, seg = [];
    const ch = sdX('ch'), ca = sdX('ca');
    const pos = (x, y, extra) => Object.assign({ x, y, a: 1 }, extra || {});
    if (m.kind === 'direct') {
      const D1 = 2.6, q = clamp(t / D1, 0, 1), y = lerp(y0, yEnd, q);
      return { total: D1 + 0.3, p: pos(xm + Math.sin(t * 6) * 6, y), verdict: m.name + '는 이중층을 곧바로 지나갔어요. 작고 무극성이라 꼬리 사이를 쉽게 지나요.', josa: true };
    }
    if (m.kind === 'water') {
      if (run.prot) {
        const tA = 1.1, tB = 0.5, tC = 0.7, tot = tA + tB + tC;
        let x, y;
        if (t < tA) { const q = smooth(t / tA); x = lerp(xm, ch, q); y = lerp(y0, yTop, q); } else if (t < tA + tB) { const q = (t - tA) / tB; x = ch; y = lerp(yTop, yBot, q); } else { const q = clamp((t - tA - tB) / tC, 0, 1); x = ch + Math.sin(t * 5) * 5 * q; y = lerp(yBot, yEnd, q); }
        return { total: tot + 0.3, p: pos(x, y), verdict: '물은 통로 단백질(아쿠아포린)이 있으면 훨씬 빠르게 통과해요.' };
      }
      const tA = 0.9, tB = 2.8, tC = 0.5;
      let y; if (t < tA) y = lerp(y0, yTop, smooth(t / tA)); else if (t < tA + tB) y = lerp(yTop, yBot, (t - tA) / tB); else y = lerp(yBot, yEnd, clamp((t - tA - tB) / tC, 0, 1));
      return { total: tA + tB + tC + 0.3, p: pos(xm + Math.sin(t * 5) * 5, y), verdict: '물은 작지만 극성이라 이중층 안쪽을 천천히 지나가요. (통로 단백질이 있으면 빨라져요.)' };
    }
    if (m.kind === 'prot' && run.prot) {
      const isIon = m.id === 'na' || m.id === 'k', tx = isIon ? ch : ca;
      const tA = 1.1;
      if (isIon) {
        const tB = 0.8, tC = 0.7; let x, y;
        if (t < tA) { const q = smooth(t / tA); x = lerp(xm, tx, q); y = lerp(y0, yTop, q); } else if (t < tA + tB) { x = tx; y = lerp(yTop, yBot, (t - tA) / tB); } else { const q = clamp((t - tA - tB) / tC, 0, 1); x = tx; y = lerp(yBot, yEnd, q); }
        return { total: tA + tB + tC + 0.3, p: pos(x, y), verdict: m.name + '는 전하 때문에 이중층은 못 지나지만, 통로 단백질을 통하면 지나갈 수 있어요.' };
      }
      const tB = 0.5, tC = 0.9, tD = 0.8; let x, y, k = 0;
      if (t < tA) { const q = smooth(t / tA); x = lerp(xm, tx, q); y = lerp(y0, yTop - 4, q); } else if (t < tA + tB) { x = tx; y = yTop - 4; } else if (t < tA + tB + tC) { const q = smooth((t - tA - tB) / tC); k = q; x = tx; y = lerp(yTop - 4, yBot + 4, q); } else { k = 1; const q = clamp((t - tA - tB - tC) / tD, 0, 1); x = tx; y = lerp(yBot + 4, yEnd, q); }
      return { total: tA + tB + tC + tD + 0.3, k, p: pos(x, y), verdict: m.name + '는 크고 극성이라 이중층은 못 지나요. 운반체 단백질이 붙잡아 모양을 바꿔 건너편으로 옮겨 줘요.' };
    }
    // 통과하지 못하고 튕겨 나감
    const tA = 1.3, tB = 1.0, tot = tA + tB;
    let y, a = 1;
    if (t < tA) y = lerp(y0, yTop - 2, smooth(t / tA)); else { const q = clamp((t - tA) / tB, 0, 1); y = lerp(yTop - 2, yTop - 90, smooth(q)); a = 1 - q * 0.6; }
    return { total: tot + 0.3, bounce: t >= tA, p: pos(xm + Math.sin(t * 4) * 5, y, { a }), verdict: m.kind === 'no' ? '단백질은 너무 커서 통로도 운반체도 지나갈 수 없어요. (큰 물질은 다음 차시에서 만나요.)' : m.name + '는 크기와 극성(전하) 때문에 이중층만으로는 지나갈 수 없어요. 막 단백질이 필요해요.' };
  }
  function sdUpdate(dt) {
    const P = S.pm; P.pa = approach(P.pa, P.prot ? 1 : 0, dt, RM ? 99 : 6);
    if (P.run) {
      P.run.t += dt; const pl = sdPlan(P.run);
      if (MOL[P.run.m].kind === 'prot' && P.run.prot && !(P.run.m === 'na' || P.run.m === 'k')) P.carK = pl.k || 0; else P.carK = approach(P.carK, 0, dt, 5);
      if (P.run.t >= pl.total) { const m = MOL[P.run.m]; P.tested[m.id] = true; P.last = { id: m.id, text: pl.verdict.replace(/^(.+?)는 /, (a0, g1) => g1 + josa(g1, '은 ', '는 ')) }; P.run = null; Sound.click(); updateCtl(); }
    } else P.carK = approach(P.carK, 0, dt, 5);
  }
  const sdTested = () => Object.keys(S.pm.tested).length;
  function sdDraw(dt, t) {
    sdUpdate(dt);
    const P = S.pm, mid = sdMid();
    // 배경
    ctx.save(); D.roundRect(SDP.x, SDP.y, SDP.w, SDP.h, 18); ctx.clip();
    const g1 = ctx.createLinearGradient(0, SDP.y, 0, mid); g1.addColorStop(0, '#e1f1fc'); g1.addColorStop(1, '#cfe6f7'); ctx.fillStyle = g1; ctx.fillRect(SDP.x, SDP.y, SDP.w, mid - SDP.y);
    const g2 = ctx.createLinearGradient(0, mid, 0, SDP.y + SDP.h); g2.addColorStop(0, '#f6efd6'); g2.addColorStop(1, '#efe3b8'); ctx.fillStyle = g2; ctx.fillRect(SDP.x, mid, SDP.w, SDP.y + SDP.h - mid);
    ctx.restore();
    ctx.strokeStyle = 'rgba(30,90,150,.3)'; ctx.lineWidth = 2; D.roundRect(SDP.x, SDP.y, SDP.w, SDP.h, 18); ctx.stroke();
    T(SDP.x + 16, SDP.y + 28, '세포 밖', 15, '#1d4f91', 'left', 800); T(SDP.x + 16, SDP.y + SDP.h - 14, '세포 안', 15, '#92400e', 'left', 800);
    // 막
    const n = Math.floor((SDP.w - 20) / PSP), pxs = [sdX('ch'), sdX('ca')];
    for (let i = 0; i < n; i++) {
      const lx = SDP.x + 10 + PSP / 2 + i * PSP; if (P.pa > 0.5 && pxs.some((ox) => Math.abs(lx - ox) < 34)) continue;
      const wob = RM ? 0 : Math.sin(t * 1.7 + i * 1.9) * 1.1;
      drawLipid(lx, mid - 30 + wob, Math.PI / 2, { s: PLS, kink: i % 5 === 2 }); drawLipid(lx, mid + 30 - wob, -Math.PI / 2, { s: PLS, kink: i % 5 === 4 });
    }
    if (P.pa > 0.02) { drawProt('ch', pxs[0], mid, { alpha: P.pa }); drawProt('ca', pxs[1], mid, { alpha: P.pa, k: P.carK }); if (P.pa > 0.6) { D.label(pxs[0], SDP.y + SDP.h - 30, '통로 단백질', { bg: PROT.ch.col, size: 12.5 }); D.label(pxs[1], SDP.y + SDP.h - 30, '운반체 단백질', { bg: PROT.ca.col, size: 12.5 }); } }
    // 분자 : 대기 위치 또는 시험 중
    const m = MOL[P.sel];
    if (P.run) {
      const pl = sdPlan(P.run), q = pl.p; drawMol(P.run.m, q.x, q.y, 1.25, q.a);
      T(q.x, q.y - 22, MOL[P.run.m].name, 14, '#12395f', 'center', 800, { stroke: 'rgba(255,255,255,.85)', strokeWidth: 3 });
      if (pl.bounce) D.label(q.x, q.y + 26, '✕ 통과 못 해요', { bg: '#dc2626', size: 12.5 });
    } else {
      drawMol(m.id, sdX('mol'), SDP.y + 70 + Math.sin(t * 2) * 3, 1.25);
      T(sdX('mol'), SDP.y + 48, m.name, 14, '#12395f', 'center', 800, { stroke: 'rgba(255,255,255,.85)', strokeWidth: 3 });
    }
    // 정보 패널
    panel(SDI.x, SDI.y, SDI.w, SDI.h, 16, '#ffffff');
    const bx = SDI.x + 16;
    drawMol(m.id, bx + 30, SDI.y + 36, 1.4);
    T(bx + 70, SDI.y + 34, m.name, 18, '#1f2d44', 'left', 800);
    T(bx + 70, SDI.y + 58, '크기: ' + m.size + ' · 극성: ' + m.pol + ' · 전하: ' + m.chg, L(14, 13), '#475569', 'left', 800);
    const msg = P.run ? '시험 중…' : (P.last ? P.last.text : '분자를 고르고 [▶ 보내기]를 눌러 이중층에 보내 봐요.');
    textBlock(bx, SDI.y + 86, SDI.w - 32, msg, L(14.5, 13.5), P.run ? '#64748b' : '#15803d', L(20, 19), 800);
    T(SDI.x + SDI.w - 16, SDI.y + 30, '시험한 분자 ' + sdTested() + ' / 9', 14, '#475569', 'right', 800);
  }

  /* ----- 분자 9종 분류 (카드를 상자에 넣기) ----- */
  const MBX = PHONE ? { x: 10, y: 10, w: 460, h: 236 } : { x: 14, y: 14, w: 772, h: 256 };
  const MBTRAY = PHONE ? { x: 10, y: 256, w: 460, h: 374 } : { x: 14, y: 282, w: 772, h: 264 };
  const sortm = new Sorter({
    cards: [4, 0, 7, 3, 8, 1, 5, 2, 6].map((i) => ({ id: MOLS[i].id, label: MOLS[i].name, sub: MOLS[i].sub, col: '#0d9488' })),
    boxes: [['direct', '이중층을 직접 통과', '#16a34a'], ['prot', '막 단백질이 있어야 통과', '#f59e0b'], ['no', '통과할 수 없어요', '#dc2626']].map((b, i) => {
      const gap = 10, bw = (MBX.w - gap * 2) / 3;
      return { id: b[0], label: b[1], col: b[2], x: MBX.x + i * (bw + gap), y: MBX.y, w: bw, h: MBX.h, cols: 1, hdr: PHONE ? 40 : 34 };
    }),
    cw: PHONE ? 214 : 236, ch: 46, kh: PHONE ? 36 : 40,
    tray: (i) => (PHONE ? { x: 16 + (i % 2) * 226, y: 304 + Math.floor(i / 2) * 58 } : { x: 28 + (i % 3) * 252, y: 324 + Math.floor(i / 3) * 56 }),
    onChange() { updateCtl(); },
  });
  const sortmWrong = () => sortm.cards.filter((c) => c.zone && !molOk(c.id, c.zone));
  function sortmDraw(dt, t) {
    sortm.update(dt); sortm.drawBoxes();
    panel(MBTRAY.x, MBTRAY.y, MBTRAY.w, MBTRAY.h, 16, '#ffffff');
    T(MBTRAY.x + 16, MBTRAY.y + 28, '분자 9종을 크기 · 극성 · 전하를 보고 알맞은 상자에 넣어요', L(15, 13.5), '#334155', 'left', 800);
    sortm.drawCards();
  }
  const sortmPT = { down: (p) => sortm.down(p), move: (p) => sortm.move(p), up: (p) => sortm.up(p), hover: (p) => sortm.hover(p) };


  /* =========================================================
     화면 전환 · 조작 연결
     ========================================================= */
  const MODE_PT = { assem: null, flip: flPT, prot: prPT, match: matchPT, fluid: null, send: null, sortm: sortmPT };
  function setMode(m) {
    if (S.mode !== m) S.fade = 1;
    if (S.mode === 'fluid' && m !== 'fluid') S.fx.play = false;
    S.mode = m; PT = MODE_PT[m] || null;
    hideHint(); updateCtl();
  }
  const ctlNodes = $$('#ctrlCard .control');
  function updateCtl() {
    const fr = game ? game.free : false, lvNow = game ? game.level : 0;
    ctlNodes.forEach((n) => { n.hidden = (n.dataset.modes || '').split(' ').indexOf(S.mode) < 0; });
    modeButtons(S.mode, lvNow, fr);
    const A = S.as, ex = AS_N;
    $('#asNote').innerHTML = ['인지질 <b>' + ex + '개</b>가 물에 흩어져 있어요. 꼬리(주황)가 물과 닿아 있죠? <b>🧲 조립</b>을 눌러 보세요.', '꼬리를 가운데로 숨긴 <b>미셀</b>이 만들어졌어요. <b>🧲 조립</b>을 한 번 더 눌러요.', A.seenVes ? '<b>이중층 소낭</b> 완성! 머리는 안쪽 · 바깥쪽 물을 향하고, 꼬리는 두 층 사이에 숨었어요.' : '미셀이 합쳐져 소낭으로 닫히는 중이에요…'][A.stage];
    $('#asNext').disabled = A.stage >= 2; $('#asNext').textContent = A.stage === 0 ? '🧲 미셀로 조립' : A.stage === 1 ? '🧲 소낭으로 조립' : '✔ 조립 완료';
    const w = flWrong().length;
    $('#flNote').innerHTML = w ? '인지질을 <b>눌러서 뒤집어요</b>. 꼬리가 물에 닿는 인지질: <b>' + w + '개</b>' : '<b>모두 맞아요!</b> 머리는 물 쪽, 꼬리는 안쪽이에요.';
    chipSet($('#viewSel'), S.pr.view);
    $('#prNote').innerHTML = '막 단백질 <b>' + prPlaced().length + ' / 5</b> · 콜레스테롤 <b>' + S.pr.chol + ' / 6</b>';
    $('#prChol').disabled = S.pr.chol >= 6 || S.pr.view === 1;
    $('#oFT').textContent = S.fx.T + ' °C'; $('#oFU').textContent = S.fx.u + ' %';
    $('#fxChol').classList.toggle('on', S.fx.chol); $('#fxChol').textContent = S.fx.chol ? '🧈 콜레스테롤 있음' : '🧈 콜레스테롤 없음';
    $('#fxPlay').textContent = S.fx.play ? '⏸ 멈춤' : S.fx.t >= FX_TMAX ? '▶ 다시 재생' : S.fx.t > 0 ? '▶ 이어서 재생' : '▶ 재생';
    $$('#molSel button').forEach((b) => { b.classList.toggle('on', b.dataset.v === S.pm.sel); b.classList.toggle('seen', !!S.pm.tested[b.dataset.v]); });
    chipSet($('#pmSeg'), S.pm.prot ? 1 : 0);
    $('#pmSend').disabled = !!S.pm.run; $('#pmSend').textContent = S.pm.run ? '시험 중…' : '▶ 보내기';
  }
  bindModeSeg(setMode);
  $('#asScatter').addEventListener('click', () => { Sound.click(); S.as.stage = 0; asScatter(); updateCtl(); });
  $('#asNext').addEventListener('click', asNext);
  $('#flShuffle').addEventListener('click', () => { Sound.click(); flShuffle(); });
  $$('#viewSel button').forEach((b) => b.addEventListener('click', () => { S.pr.view = +b.dataset.v; Sound.click(); updateCtl(); }));
  $('#prChol').addEventListener('click', prAddChol);
  $('#prReset').addEventListener('click', () => { Sound.click(); prReset(); });
  $('#matchReset').addEventListener('click', () => { Sound.click(); matchS.reset(); });
  $('#sFT').addEventListener('input', (e) => { S.fx.T = +e.target.value; fxReset(); });
  $('#sFU').addEventListener('input', (e) => { S.fx.u = +e.target.value; fxReset(); });
  $('#fxChol').addEventListener('click', () => { S.fx.chol = !S.fx.chol; Sound.click(); fxReset(); });
  $('#fxPlay').addEventListener('click', () => { Sound.click(); if (!S.fx.play && S.fx.t >= FX_TMAX) fxInit(); S.fx.play = !S.fx.play; updateCtl(); });
  $('#fxReset').addEventListener('click', () => { Sound.click(); fxReset(); });
  $$('#molSel button').forEach((b) => b.addEventListener('click', () => { if (S.pm.run) return; S.pm.sel = b.dataset.v; Sound.click(); updateCtl(); }));
  $$('#pmSeg button').forEach((b) => b.addEventListener('click', () => { if (S.pm.run) return; S.pm.prot = b.dataset.v === '1'; Sound.click(); updateCtl(); }));
  $('#pmSend').addEventListener('click', sdSend);
  $('#sortmReset').addEventListener('click', () => { Sound.click(); sortm.reset(); });

  /* =========================================================
     미션
     ========================================================= */
  const levels = [
    {
      title: '인지질 조립: 물속의 이중층', short: '인지질 조립', icon: '🧲', phase: '모형',
      intro: '<p class="si-q">❓ 탐구 질문: 세포막은 어떻게 얇은 막인데도 물질을 가려서 통과시키고, 또 찢어지지 않고 흐르듯 움직일까?</p><p>🔗 <b>통합과학</b>에서 세포막이 <b>인지질 이중층</b>과 단백질로 이루어져 선택적 투과성을 갖는다고 배웠어요. 이번에는 막의 <b>구성 분자</b>를 하나씩 살펴보며 막의 구조와 특성을 설명해 봐요.</p><p>💡 먼저 인지질 하나는 <b>물을 좋아하는 머리(파랑)</b>와 <b>물을 싫어하는 꼬리 2개(주황)</b>로 이루어져 있어요. 물속에 흩뿌리면 어떤 모양이 될까요?</p>',
      features: ['assem', 'flip'],
      setup() { setMode('assem'); },
      recap: '인지질은 물을 좋아하는 머리와 물을 싫어하는 꼬리를 가져서, 물속에서 스스로 꼬리를 안쪽으로 모아 이중층(소낭)을 이뤄요.',
      summary: '<ul><li><b>인지질</b> = 친수성 <b>머리</b> 1개 + 소수성 <b>꼬리</b>(지방산) 2개.</li><li>물속에서 소수성 꼬리는 물을 피해 서로 모이고, 머리는 물을 향해요. 그 결과 스스로 <b>미셀</b>이나 <b>이중층 소낭(리포솜)</b>을 이뤄요.</li><li>세포막은 <b>인지질 이중층</b>: 바깥쪽 머리는 세포 밖의 물, 안쪽 머리는 세포 안의 물과 닿고, 꼬리는 두 층 사이 안쪽에 있어요.</li></ul>',
      missions: [
        {
          id: 'bilayer', title: '인지질로 이중층 만들기',
          goal: '🧲 화면에서 인지질을 <b>미셀 → 이중층 소낭</b>까지 조립하고, 🔀 화면에서 인지질의 방향을 맞춰 <b>이중층</b>을 완성하세요.',
          hint: '🧲 조립 화면에서 [조립] 버튼을 두 번 눌러요. 그다음 🔀 이중층 배열 화면에서 빨간 꼬리가 물에 닿은 인지질을 눌러 뒤집어요. 위쪽 줄은 머리가 위, 아래쪽 줄은 머리가 아래예요.',
          setup() { asReset(); flInit(11); setMode('assem'); },
          check: () => S.as.seenMic && S.as.seenVes && S.fl.solved && flWrong().length === 0, hold: 0.8,
          status: () => mark(S.as.seenMic) + ' 미셀 &nbsp; ' + mark(S.as.seenVes) + ' 이중층 소낭 &nbsp; ' + mark(S.fl.solved) + ' 이중층 배열 (꼬리가 물에 닿는 인지질 ' + flWrong().length + '개)',
          explain: '물을 싫어하는 <b>소수성 꼬리</b>는 물과 닿지 않으려고 서로 모이고, 물을 좋아하는 <b>친수성 머리</b>는 물 쪽을 향해요. 그래서 꼬리가 안쪽에 모인 <b>미셀</b>이 되고, 양쪽이 모두 물인 환경에서는 머리가 양쪽 물을 향하는 <b>두 겹(이중층)</b>이 돼요.',
        },
        {
          type: 'quiz', title: '왜 두 겹일까?',
          goal: '인지질이 물속에서 <b>두 겹(이중층)</b>을 이루어 꼬리를 안쪽에 모으는 까닭은?',
          setup() { setMode('flip'); },
          choices: ['꼬리끼리 단단한 화학 결합으로 붙기 때문이다', '꼬리가 물을 싫어하고 머리는 물을 좋아해서, 양쪽 물을 머리가 향하고 꼬리는 안쪽에 숨기 때문이다', '머리가 꼬리를 끌어당기기 때문이다', '세포 속 효소가 인지질을 두 줄로 세우기 때문이다'],
          answer: 1,
          feedback: ['꼬리끼리는 단단하게 결합하지 않아요. 물을 피하려는 성질 때문에 모이는 거예요.', '', '머리와 꼬리가 서로 끌어당겨서가 아니에요.', '효소가 없어도 인지질은 물속에서 저절로 이중층을 이뤄요.'],
          explain: '인지질은 별도의 에너지나 효소 없이도 <b>물을 싫어하는 꼬리</b>가 안쪽으로 모이고 <b>물을 좋아하는 머리</b>가 바깥(양쪽 물)을 향하면서 저절로 이중층을 이뤄요. 세포막의 바깥쪽과 안쪽이 모두 물이어서 두 겹이 되는 거예요.',
        },
      ],
    },
    {
      title: '막 단백질과 콜레스테롤', short: '막 단백질', icon: '🧩', phase: '탐구',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 인지질이 스스로 이중층을 만드는 것을 봤어요.</div><p>세포막에는 이중층뿐 아니라 <b>단백질</b>도 박혀 있어요. 싱어와 니컬슨(1972)은 인지질 이중층에 단백질이 모자이크처럼 섞여 있고 막이 액체처럼 움직인다는 <b>유동 모자이크 모형</b>을 제안했어요.</p><p>막 단백질 5종을 이중층에 끼워 넣고, 각각 어떤 일을 하는지 확인해 봐요. 동물 세포막의 <b>콜레스테롤</b>도 넣어 봐요.</p>',
      features: ['prot', 'match'],
      setup() { setMode('prot'); },
      recap: '막 단백질은 통로 · 운반체 · 수용체 · 효소 · 세포 인식 같은 기능을 하고, 당 사슬은 막의 바깥쪽에만 있어요. 콜레스테롤은 인지질 사이에 끼어 유동성을 조절해요.',
      summary: '<ul><li><b>막 단백질</b>은 이중층에 박혀(통합 단백질) 있거나 표면에 붙어(말초 단백질) 있어요.</li><li>기능 5가지: <b>수송</b>(통로 · 운반체), <b>수용체</b>(신호 분자 결합), <b>효소</b>(반응 촉매), <b>세포 인식</b>(당단백질), <b>세포 골격 · 이웃 세포 부착</b>.</li><li><b>당 사슬</b>은 단백질 · 지질에 붙어 세포 인식과 신호에 쓰이며 세포막 <b>바깥쪽에만</b> 있어요.</li><li><b>콜레스테롤</b>(동물 세포막)은 인지질 사이에 끼어 유동성이 지나치게 커지거나 작아지지 않게 해요.</li></ul>',
      missions: [
        {
          id: 'place', title: '막 단백질 5종 끼워 넣기',
          goal: '🧩 화면에서 막 단백질 <b>5종을 모두</b> 이중층에 끼워 넣고, <b>콜레스테롤을 3개 이상</b> 넣어 보세요.',
          hint: '아래 단백질을 막 쪽으로 끌어다 놓거나 눌러요. 단백질마다 하는 일이 반복해서 나타나요. 🧈 콜레스테롤 넣기 버튼을 3번 눌러요.',
          setup() { prReset(); S.pr.view = 0; setMode('prot'); },
          check: () => prPlaced().length === 5 && S.pr.chol >= 3, hold: 0.8,
          status: () => PTYPES.map((k) => mark(S.pr.items.find((q) => q.type === k).slot >= 0) + ' ' + PROT[k].name).join(' &nbsp; ') + ' &nbsp; ' + mark(S.pr.chol >= 3) + ' 콜레스테롤 ' + S.pr.chol + '/3',
          explain: '<b>통로 단백질</b>은 이온이 지나가는 길을, <b>운반체</b>는 결합해 모양을 바꾸며 물질을, <b>수용체</b>는 신호 분자를 받아 세포 안에 신호를, <b>효소</b>는 막에서 반응을, <b>인식 당단백질</b>은 바깥쪽 당 사슬로 세포를 알아보는 일을 해요. 위에서 보면 단백질이 인지질 사이에 <b>모자이크</b>처럼 섞여 있어요.',
        },
        {
          id: 'match', title: '단백질 기능 연결', manual: true,
          goal: '막 단백질 카드 5장을 알맞은 <b>기능 상자</b>에 한 장씩 넣으세요.',
          hint: '앞 화면의 시연을 떠올려요. 이온이 줄지어 지나간 것은 통로, 포도당이 붙어 모양이 바뀐 것은 운반체, 별 모양 신호가 붙자 색이 변한 것은 수용체, 두 분자가 합쳐진 것은 효소, 당 사슬은 세포 인식이에요.',
          setup() { setMode('match'); matchS.reset(); },
          check() {
            if (matchS.placed < 5) { matchS.markBad([]); return '카드를 모두 상자에 넣어 주세요. (' + matchS.placed + ' / 5)'; }
            const w = matchWrong(), dup = matchS.boxes.some((b) => matchS.cards.filter((c) => c.zone === b.id).length > 1);
            if (!w.length && !dup) { matchS.markBad([]); return true; }
            matchS.markBad(w.map((c) => c.id)); if (dup) return '한 상자에는 카드를 한 장씩만 넣어요.';
            const nm = PROT[w[0].id].name; return nm + josa(nm, '은', '는') + ' 그 기능이 아니에요. 상자의 설명을 다시 읽어 보세요.';
          },
          explain: '<b>통로</b>: 이온이 지나가는 길, <b>운반체</b>: 물질과 결합해 모양을 바꿔 옮김, <b>수용체</b>: 신호 분자와 결합해 신호 전달, <b>효소</b>: 막에서 반응 촉매, <b>인식 당단백질</b>: 당 사슬로 세포 인식. 이 밖에 세포 골격 · 이웃 세포에 붙게 하는 단백질도 있어요.',
        },
        {
          type: 'quiz', title: '당 사슬은 왜 바깥쪽에만?',
          goal: '당 사슬이 세포막의 <b>바깥쪽에만</b> 붙어 있는 것과 관계 깊은 기능은?',
          setup() { S.pr.view = 0; setMode('prot'); },
          choices: ['세포 안의 포도당을 저장한다', '다른 세포와 신호 분자를 알아보는 세포 인식과 신호 수용을 한다', '막의 두께를 두 배로 늘린다', '꼬리를 물에서 숨긴다'],
          answer: 1,
          feedback: ['당 사슬은 포도당 저장 창고가 아니에요.', '', '당 사슬은 막 두께와 관계없어요.', '꼬리를 숨기는 것은 인지질의 성질이에요.'],
          explain: '당 사슬은 이웃 세포 · 신호 분자와 만나는 <b>세포 바깥쪽</b>에 있어서 세포를 알아보는 <b>세포 인식</b>과 세포 간 신호에 쓰여요.',
        },
      ],
    },
    {
      title: '유동성: 막은 흐르듯 움직여요', short: '유동성', icon: '🌡', phase: '실험',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 막 단백질이 인지질 사이에 섞여 있는 모자이크를 봤어요.</div><p>인지질과 막 단백질은 막 평면 안에서 옆으로 빠르게 움직여요. 인지질은 1초에 약 2 μm씩 이동하지만, 한쪽 층에서 반대쪽 층으로 <b>뒤집히는 일은 매우 드물어요</b>.</p><p>프라이와 에디딘(1970)의 실험을 재현해 볼게요. 사람 세포와 생쥐 세포를 <b>융합</b>시키고 각 세포막 단백질을 빨강 · 초록 형광으로 표지하면, 융합 직후 반쪽씩 갈라져 있던 형광이 시간이 지나며 섞여요. <b>온도</b>와 <b>지방산 꼬리</b>가 어떤 영향을 줄까요?</p>',
      features: ['fluid'],
      setup() { setMode('fluid'); S.fx.T = 37; S.fx.u = 40; S.fx.chol = false; $('#sFT').value = 37; $('#sFU').value = 40; fxReset(); },
      recap: '막은 액체처럼 흐르는 유동성이 있어요. 온도가 낮아지면 굳고, 불포화 지방산(꺾인 꼬리)이 많으면 느슨해 유동성이 커지며, 콜레스테롤은 유동성을 조절해요.',
      summary: '<ul><li>인지질은 막 평면에서 옆으로 1초에 약 2 μm씩 이동하고(<b>측면 이동</b>), 층을 뒤집는 일은 매우 드물어요.</li><li><b>프라이 · 에디딘 실험</b>: 37 °C에서 형광이 약 40분 뒤 섞였고, 낮은 온도(1 °C)에서는 섞이지 않았어요 → 막 단백질이 막 안에서 움직이고, 온도의 영향을 받아요.</li><li>온도가 낮으면 유동성 감소(막이 굳음). <b>포화</b> 지방산(곧은 꼬리)이 많으면 촘촘해 유동성이 작고, <b>불포화</b> 지방산(꺾인 꼬리)이 많으면 느슨해 유동성이 커요. 겨울을 나는 식물 · 냉수성 어류는 불포화 비율이 높아요.</li><li><b>콜레스테롤</b>은 너무 굳거나 너무 풀어지지 않게 조절해요.</li></ul>',
      missions: [
        {
          id: 'mix37', title: '37 °C에서 섞이는 시간',
          goal: '온도를 <b>37 °C</b>로 두고 재생해서, 형광이 <b>85 % 이상</b> 섞이는 데 걸린 시간을 확인하세요.',
          hint: '온도 37 °C, 불포화 40 %, 콜레스테롤 없음 그대로 ▶ 재생을 눌러요. 그래프의 초록 점선(85 %)에 닿으면 시간이 표시돼요. 1초에 약 2.5분이 지나가요.',
          setup() { setMode('fluid'); S.fx.T = 37; S.fx.u = 40; S.fx.chol = false; $('#sFT').value = 37; $('#sFU').value = 40; fxReset(); },
          check: () => S.fx.T >= 36 && S.fx.t85 != null, hold: 0.6,
          status: () => mark(S.fx.T >= 36) + ' 37 °C &nbsp; ' + mark(S.fx.t85 != null) + ' 섞인 정도 ' + S.fx.mix + ' % (목표 ' + FX_THR + ' %) &nbsp; ' + mark(S.fx.t85 != null) + ' 걸린 시간 ' + (S.fx.t85 != null ? S.fx.t85.toFixed(1) + '분' : '—'),
          explain: '37 °C에서는 막이 액체처럼 흘러 막 단백질이 옆으로 이동해서 빨강 · 초록 형광이 <b>약 40분</b> 안팎에 섞여요(원 실험에서는 약 40분 뒤 완전히 섞임). 막 단백질이 막 안에서 움직인다는 증거예요.',
        },
        {
          id: 'cold', title: '1 °C에서는?',
          goal: '온도를 <b>1 °C</b>로 낮추고 <b>40분</b>까지 재생해서, 섞인 정도가 <b>20 % 미만</b>인지 확인하세요.',
          hint: '온도 슬라이더를 1 °C로 낮추면 처음부터 다시 시작해요. 불포화 40 %, 콜레스테롤 없음을 유지하고 ▶ 재생해서 시간이 40분이 될 때까지 기다려요.',
          setup() { setMode('fluid'); S.fx.T = 1; S.fx.u = 40; S.fx.chol = false; $('#sFT').value = 1; $('#sFU').value = 40; fxReset(); },
          check: () => S.fx.T <= 2 && S.fx.t >= 40 && S.fx.mix < 20, hold: 0.6,
          status: () => mark(S.fx.T <= 2) + ' 1 °C &nbsp; ' + mark(S.fx.t >= 40) + ' 시간 ' + Math.floor(S.fx.t) + '분 / 40분 &nbsp; ' + mark(S.fx.t >= 40 && S.fx.mix < 20) + ' 섞인 정도 ' + S.fx.mix + ' %',
          explain: '1 °C에서는 막이 굳어 막 단백질이 거의 움직이지 못해서 <b>40분이 지나도 거의 섞이지 않아요</b>. 같은 시간에 37 °C에서는 대부분 섞였으니, 막의 유동성이 온도의 영향을 받는다는 것을 알 수 있어요.',
        },
        {
          type: 'quiz', title: '겨울을 나는 식물의 막',
          goal: '겨울을 나는 식물이 겨울이 되면 막의 <b>불포화 지방산 비율</b>을 높이는 까닭은?',
          setup() { setMode('fluid'); },
          choices: ['꺾인 꼬리가 많아야 낮은 온도에서도 막이 굳지 않고 유동성을 유지하기 때문이다', '곧은 꼬리가 많아야 막이 더 단단히 얼기 때문이다', '콜레스테롤이 필요 없어지기 때문이다', '막 단백질이 막 밖으로 빠져나가기 때문이다'],
          answer: 0,
          feedback: ['', '막이 얼어 굳으면 막 단백질이 움직이지 못하고 세포가 손상돼요.', '콜레스테롤이 없어서가 아니에요.', '막 단백질이 빠져나가지 않아요.'],
          explain: '낮은 온도에서는 막이 굳어 단백질이 움직이지 못하게 돼요. <b>불포화 지방산</b>(꺾인 꼬리)이 많으면 인지질이 느슨하게 배열되어 낮은 온도에서도 <b>유동성을 유지</b>할 수 있어요.',
        },
      ],
    },
    {
      title: '투과성 추론: 무엇이 지나갈 수 있을까', short: '투과성 추론', icon: '🧪', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 막이 인지질 이중층과 움직이는 단백질로 이루어진 것을 확인했어요.</div><p>이중층의 안쪽은 <b>소수성 꼬리</b>로 가득 차 있어서, 분자의 <b>크기 · 극성 · 전하</b>에 따라 지나가기 쉬운 정도가 크게 달라요. 분자 9종을 이중층에 보내 보고, 어떤 방식으로 막을 통과하는지 추론해 봐요.</p><p>💡 이 결과는 다음 차시의 <b>수송 방식</b>(확산 · 촉진 확산 · 능동 수송)으로 이어져요.</p>',
      features: ['send', 'sortm'],
      setup() { setMode('send'); },
      recap: '이중층은 작은 비극성 분자는 직접 통과시키지만, 크고 극성인 분자와 이온은 막 단백질의 도움이 있어야 하고, 단백질 같은 큰 분자는 통과하지 못해요(선택적 투과성).',
      summary: '<ul><li><b>직접 통과</b>: O₂ · CO₂ · 에탄올처럼 작은 비극성(또는 극성이 약한) 분자.</li><li><b>물</b>: 작지만 극성이라 이중층을 느리게 통과해요. 통로 단백질(<b>아쿠아포린</b>)이 있으면 빠르게 통과해요.</li><li><b>막 단백질 필요</b>: 포도당 · 아미노산처럼 크고 극성인 분자, Na⁺ · K⁺ · Cl⁻ 같은 이온(전하 때문에 소수성 안쪽을 지나지 못함).</li><li><b>통과 불가능</b>: 단백질 · 다당류는 너무 커요.</li><li><b>선택적 투과성</b>: 일부 물질은 쉽게, 일부는 지나가지 못하는 성질.</li></ul>',
      missions: [
        {
          id: 'perm', title: '분자 9종 분류', manual: true,
          goal: '분자 카드 9장을 <b>직접 통과 · 막 단백질 필요 · 통과 불가능</b> 상자에 나누어 넣으세요. 물은 직접 통과와 막 단백질 필요 어느 쪽에 넣어도 돼요.',
          hint: '🧪 통과 시험에서 분자를 하나씩 보내 보고 힌트를 얻어요. 작고 무극성이면 직접 통과, 크고 극성이거나 이온이면 막 단백질 필요, 아주 크면 통과 불가능이에요.',
          setup() { setMode('send'); sortm.reset(); },
          check() {
            if (sortm.placed < 9) { sortm.markBad([]); return '카드를 모두 상자에 넣어 주세요. (' + sortm.placed + ' / 9)'; }
            const w = sortmWrong();
            if (!w.length) { sortm.markBad([]); return true; }
            sortm.markBad(w.map((c) => c.id));
            const nm = MOL[w[0].id].name; return nm + josa(nm, '은', '는') + ' 그 상자가 아니에요. 크기 · 극성 · 전하를 다시 살펴보세요.';
          },
          explain: '<b>O₂ · CO₂ · 에탄올</b>은 작고 무극성(또는 극성이 약함)이라 이중층을 직접 통과해요. <b>물</b>은 작지만 극성이라 느리게 통과하고 아쿠아포린이 있으면 빨라지므로 두 상자 모두 알맞아요. <b>포도당 · 아미노산</b>은 크고 극성, <b>Na⁺ · K⁺</b>는 전하를 띤 이온이라 막 단백질이 필요하고, <b>단백질</b>은 너무 커서 통과할 수 없어요.',
        },
        {
          type: 'quiz', title: '선택적 투과성의 기준',
          goal: '세포막이 지나가는 물질을 가려내는 데 가장 크게 작용하는 두 가지 기준은?',
          setup() { setMode('sortm'); },
          choices: ['분자의 크기와 극성(전하)', '분자의 색깔과 냄새', '분자를 만든 세포의 이름', '분자가 막에 닿는 시간대'],
          answer: 0,
          feedback: ['', '분자의 색깔이나 냄새는 투과 여부와 관계없어요.', '만든 세포는 기준이 아니에요.', '시간대는 기준이 아니에요.'],
          explain: '이중층 안쪽이 소수성이므로 <b>작고 무극성인 분자</b>는 쉽게, <b>크거나 극성 · 전하를 띤 분자</b>는 어렵게 지나가요. 이렇게 일부는 쉽게 일부는 지나가지 못하는 것이 <b>선택적 투과성</b>이에요.',
        },
        {
          type: 'quiz', title: '유동 모자이크라는 이름',
          goal: '<b>유동 모자이크 모형</b>의 이름에서 \'유동\'과 \'모자이크\'가 뜻하는 것은?',
          setup() { setMode('send'); },
          choices: ['유동: 막을 이루는 분자가 움직인다 / 모자이크: 단백질이 인지질 사이에 섞여 있다', '유동: 막이 세포 밖으로 흘러 나간다 / 모자이크: 막이 여러 겹 쌓여 있다', '유동: 물이 막을 지나 흐른다 / 모자이크: 인지질만 가득 차 있다', '유동: 막이 얼어 굳는다 / 모자이크: 모든 분자가 같은 자리에 고정된다'],
          answer: 0,
          feedback: ['', '막이 흘러 나가는 것이 아니에요.', '유동은 막 구성 분자의 이동을 뜻해요.', '막은 얼어 굳은 것이 아니라 흐르듯 움직여요.'],
          explain: '<b>유동</b>은 인지질과 막 단백질이 막 안에서 움직이는 성질, <b>모자이크</b>는 여러 종류의 단백질이 인지질 이중층 사이에 섞여 있는 모습을 뜻해요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hy-membrane-structure', mount: '#game', badge: '세포막 연구원', homeHref: '../../index.html#hy',
    featureLabels: { assem: '🧲 인지질 자기 조립', flip: '🔀 이중층 배열 시험', prot: '🧩 막 단백질 · 콜레스테롤', match: '🗂 단백질 기능 연결', fluid: '🌡 유동성 실험', send: '🧪 분자 통과 시험', sortm: '🗂 투과성 분류' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 읽음 칸 ---------- */
  function readouts() {
    const m = S.mode;
    if (m === 'assem') setReads(['인지질', AS_N + '개', '모양', ['흩어짐', '미셀', '이중층 소낭'][S.as.stage], '물에 닿는 꼬리', asExposed() + '개']);
    else if (m === 'flip') setReads(['꼬리가 물에 닿는 인지질', flWrong().length + '개', '뒤집은 횟수', S.fl.moves + '번', '이중층', S.fl.solved ? '완성' : '아직']);
    else if (m === 'prot') setReads(['막에 넣은 단백질', prPlaced().length + ' / 5', '콜레스테롤', S.pr.chol + ' / 6', '보는 화면', S.pr.view ? '위에서' : '단면']);
    else if (m === 'match') setReads(['놓은 카드', matchS.placed + ' / 5', '남은 카드', (5 - matchS.placed) + '장', '기능', '5가지']);
    else if (m === 'fluid') setReads(['온도', S.fx.T + ' °C', '경과 시간', fxMin() + ' 분', '섞인 정도', S.fx.mix + ' %']);
    else if (m === 'send') setReads(['고른 분자', MOL[S.pm.sel].name, '막 단백질', S.pm.prot ? '있음' : '없음', '시험한 분자', sdTested() + ' / 9']);
    else setReads(['놓은 분자', sortm.placed + ' / 9', '남은 분자', (9 - sortm.placed) + '개', '분류 상자', '3칸']);
  }

  /* ---------- 시작 ---------- */
  setMode('assem');
  let lastFree = false, lastLv = -1;
  SciSim.loop((dt, t) => {
    clock = t; S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (game && game.level !== lastLv) { lastLv = game.level; updateCtl(); }
    view.apply(); FX.update(dt); ctx.clearRect(0, 0, VW, VH);
    switch (S.mode) {
      case 'assem': bgFill(BG2, BG3); asDraw(dt, t); break;
      case 'flip': bgFill(BG2, BG3); flDraw(dt, t); break;
      case 'prot': bgFill(BG2, BG3); prDraw(dt, t); break;
      case 'match': bgFill(BG2, BG3); matchDraw(dt, t); break;
      case 'fluid': bgFill(BG2, BG3); fxDraw(dt, t); break;
      case 'send': bgFill(BG2, BG3); sdDraw(dt, t); break;
      case 'sortm': bgFill(BG2, BG3); sortmDraw(dt, t); break;
    }
    FX.draw(); parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(241,246,243,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, PHONE, get game() { return game; }, levels, setMode, asSet, asNext, asReset, asSettled, asExposed, flToggle, flWrong, flInit,
    prPlace, prAddChol, prPlaced, prReset, PTYPES, prSlotX, prMid, matchS, sortm, MOLS, MOL, sdSend, sdPlan, fluidM, fxM, fxReset, fxUpdate, fxMeasure, FX_THR, FX_N, updateCtl,
  };
})();
