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
      if (instant || RM) { c.x = x; c.y = y; c.w = w; c.h = h; return; }
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
     고등학교 세포와 물질대사 · Ⅰ. 세포 - 탄수화물과 지질 (단원 56, 1차시)
     성취기준 [12세포01-01] 탄수화물과 지질의 종류와 주요 기능을 이해하고 생물체에 들어있는 탄수화물과 지질을 관찰할 수 있다.
     ① 모형: 종류와 구조 (고리 블록, 지질 블록, 분류 카드)  ② 설명: 주요 기능 (에너지 저장 비교, 기능 연결)
     ③ 실험: 검출 반응 (아이오딘, 베네딕트, 수단 Ⅲ)  ④ 관찰: 현미경 관찰 (감자 녹말 알갱이, 땅콩 지방 방울)
     ========================================================= */
  const CARB_COL = '#d97706', LIPID_COL = '#0891b2';
  const S = { mode: 'blocks', sub: 'carb', fade: 0 };
  let game = null;

  /* ---------- 배치 ---------- */
  const WS = PHONE ? { x: 10, y: 10, w: 460, h: 396 } : { x: 14, y: 14, w: 772, h: 372 };
  const TRAY = PHONE ? { x: 10, y: 418, w: 460, h: 212 } : { x: 14, y: 398, w: 772, h: 148 };
  const RAD = L(27, 20);
  const DSP = RAD * 2.15;

  /* =========================================================
     ① 블록 상자 : 탄수화물(포도당 고리 블록) / 지질(글리세롤 + 지방산 꼬리 + 머리)
     ========================================================= */
  S.carb = { blocks: [], shape: 'line', di: false, poly: false, shapes: { helix: false, branch: false, bundle: false }, drag: null };
  for (let i = 0; i < 8; i++) {
    const hx = PHONE ? TRAY.x + 62 + (i % 4) * 112 : TRAY.x + 56 + i * 94;
    const hy = PHONE ? TRAY.y + 98 + Math.floor(i / 4) * 70 : TRAY.y + 90;
    S.carb.blocks.push({ i, x: hx, y: hy, hx, hy, slot: -1, pop: 0, lift: 0 });
  }
  const chainOf = () => S.carb.blocks.filter((b) => b.slot >= 0).sort((a, b) => a.slot - b.slot);
  const CCX = WS.x + WS.w / 2, CCY = WS.y + WS.h * 0.6;

  /* 모양별 위치 (중심 정렬). 단위: 픽셀 */
  function carbLayout(shape, n) {
    const d = DSP, out = [];
    if (shape === 'helix') {
      for (let k = 0; k < n; k++) { const a = k * 1.2 + 0.4; out.push({ x: (k - (n - 1) / 2) * 0.8 * d, y: 0.78 * d * Math.sin(a), z: Math.cos(a), par: k - 1, flip: false }); }
    } else if (shape === 'branch') {
      const P = [[-1.5, 0, -1], [-0.5, 0, 0], [0.5, 0, 1], [1.5, 0, 2], [0.12, -0.98, 1], [0.74, -1.96, 4], [1.12, 0.98, 2], [1.74, 1.96, 6]];
      for (let k = 0; k < n; k++) out.push({ x: P[k][0] * d, y: P[k][1] * d, z: 0, par: P[k][2], flip: false });
    } else {
      for (let k = 0; k < n; k++) out.push({ x: (k - (n - 1) / 2) * d, y: 0, z: 0, par: k - 1, flip: shape === 'bundle' && k % 2 === 1 });
    }
    if (n) {
      let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
      out.forEach((p) => { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y); });
      const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
      out.forEach((p) => { p.x += CCX - mx; p.y += CCY - my + (shape === 'bundle' ? 0 : 6); });
    }
    return out;
  }

  function ringPath(x, y, r) { ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + i * TAU / 6; const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r; if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); } ctx.closePath(); }
  /* 포도당 고리 블록 (구조식이 아니라 단순한 고리 모양) */
  function drawGlucose(x, y, r, o) {
    o = o || {};
    ctx.save(); ctx.globalAlpha = o.alpha == null ? 1 : o.alpha;
    ctx.translate(x, y); const sc = o.scale || 1; ctx.scale(sc, sc);
    const col = o.col || '#f59e0b';
    D.shadow(() => {
      ringPath(0, 0, r);
      const g = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r * 1.1);
      g.addColorStop(0, C.shade(col, 0.55)); g.addColorStop(0.6, col); g.addColorStop(1, C.shade(col, -0.3));
      ctx.fillStyle = g; ctx.fill();
    }, { blur: o.lift ? 14 : 6, y: o.lift ? 7 : 3, color: 'rgba(120,60,0,.28)' });
    ringPath(0, 0, r); ctx.strokeStyle = C.shade(col, -0.45); ctx.lineWidth = 2.2; ctx.lineJoin = 'round'; ctx.stroke();
    ringPath(0, 0, r * 0.58); ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.fill();
    // 고리 속 산소(빨간 점): 뒤집힌 고리는 반대쪽에 있어요
    const fl = o.flip ? -1 : 1;
    ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.arc(fl * r * 0.5, -fl * r * 0.3, r * 0.15, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(120,53,15,.55)'; ctx.beginPath(); ctx.arc(-fl * r * 0.52, fl * r * 0.34, r * 0.1, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.ellipse(-r * 0.38, -r * 0.42, r * 0.3, r * 0.14, -0.6, 0, TAU); ctx.fill();
    ctx.restore();
  }
  function link(a, b, r, alpha) {
    const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy); if (len < r * 1.2) return;
    const ux = dx / len, uy = dy / len, sx = a.x + ux * r * 0.78, sy = a.y + uy * r * 0.78, ex = b.x - ux * r * 0.78, ey = b.y - uy * r * 0.78;
    ctx.save(); ctx.globalAlpha = alpha == null ? 1 : alpha; ctx.lineCap = 'round';
    ctx.strokeStyle = '#7c2d12'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
    ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 3.4; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
    ctx.restore();
  }

  function carbAttach(b) {
    const n = chainOf().length;
    if (b.slot >= 0 || n >= 8) return false;
    b.slot = n; b.pop = 1;
    const lay = carbLayout(S.carb.shape, n + 1), me = lay[n];
    if (n >= 1) {
      const par = lay[me.par >= 0 ? me.par : n - 1];
      FX.add({ kind: 'water', x: (me.x + par.x) / 2, y: (me.y + par.y) / 2 - 10, vx: 38, vy: -80, life: 1.3, delay: 0.28 });
      Sound.click();
    } else Sound.tick();
    updateCtl();
    return true;
  }
  function carbReset() {
    S.carb.blocks.forEach((b) => { b.slot = -1; b.lift = 0; });
    S.carb.shape = 'line'; S.carb.drag = null;
    FX.clear(); updateCtl();
  }
  function setShape(s) {
    if (chainOf().length < 5 && s !== 'line') return;
    S.carb.shape = s;
    if (s !== 'line') S.carb.shapes[s] = true;
    Sound.click(); updateCtl();
  }
  function carbInfo() {
    const n = chainOf().length, sh = S.carb.shape;
    if (n === 0) return ['포도당 고리 블록을 작업대로 옮겨 보세요', '블록 하나가 고리 1개예요. 누르거나 끌어서 놓아요.'];
    if (n === 1) return ['단당류 (고리 1개)', '포도당 · 과당 · 갈락토스처럼 더 쪼갤 수 없는 당이에요.'];
    if (n === 2) return ['이당류 (고리 2개)', '단당류 2개가 물이 빠지며 결합해요. 엿당 · 설탕 · 젖당이 있어요.'];
    if (n < 5) return ['고리가 ' + n + '개 이어졌어요', '5개 이상 이으면 다당류 모양을 바꿔 볼 수 있어요.'];
    const nm = { line: ['다당류 (고리가 길게 이어진 사슬)', '실제 다당류는 고리 수백~수천 개가 이어져 있어요.'], helix: ['녹말 — 나선 모양', '식물이 포도당을 저장하는 다당류예요.'], branch: ['글리코젠 — 가지가 많은 모양', '동물이 간 · 근육에 포도당을 저장하는 다당류예요.'], bundle: ['셀룰로스 — 곧은 가닥 다발', '식물 세포벽의 주성분이에요. 곧은 가닥이 나란히 모여요.'] };
    return nm[sh];
  }

  /* ----- 지질 ----- */
  const LT = L(250, 168);
  const RX = WS.x + L(118, 70), SPY = L(80, 76), RY0 = WS.y + L(104, 118);
  const slotY = (k) => RY0 + k * SPY;
  S.lip = { type: 'tg', pieces: [], tgDone: false, plDone: false, waterSeen: false, water: 0, waterOn: false, stSeen: false, wxSeen: false, drag: null, flash: 0, bil: [] };
  function lipBuild() {
    S.lip.pieces = [];
    const hy = (i) => (PHONE ? TRAY.y + 48 + i * 40 : TRAY.y + 44 + i * 36);
    const hx = TRAY.x + L(24, 14);
    const mk = (kind, i) => ({ kind, slot: -1, x: hx, y: hy(i), hx, hy: hy(i), lift: 0, pop: 0 });
    if (S.lip.type === 'tg') for (let i = 0; i < 3; i++) S.lip.pieces.push(mk('tail', i));
    else if (S.lip.type === 'pl') {
      const h = mk('head', 0); h.hx = h.x = TRAY.x + L(430, 330); h.hy = h.y = TRAY.y + L(74, 100);
      S.lip.pieces.push(h, mk('tail', 0), mk('tail', 1));
    }
    S.lip.drag = null;
  }
  lipBuild();
  function setLipType(t) {
    if (S.lip.type === t) return;
    S.lip.type = t; S.lip.waterOn = false; lipBuild(); FX.clear();
    if (t === 'st') S.lip.stSeen = true;
    if (t === 'wx') S.lip.wxSeen = true;
    Sound.click(); updateCtl();
  }
  function lipReset() { lipBuild(); S.lip.waterOn = false; FX.clear(); updateCtl(); }
  const lipDone = () => { const p = S.lip.pieces; return p.length > 0 && p.every((q) => q.slot >= 0); };
  function lipAttach(q) {
    if (q.slot >= 0) return false;
    const used = S.lip.pieces.filter((x) => x.slot >= 0).map((x) => x.slot);
    let slot = -1;
    if (q.kind === 'head') slot = 0;
    else { const cand = S.lip.type === 'pl' ? [1, 2] : [0, 1, 2]; slot = cand.find((s) => used.indexOf(s) < 0); }
    if (slot == null || slot < 0 || used.indexOf(slot) >= 0) return false;
    q.slot = slot; q.pop = 1;
    FX.add({ kind: 'water', x: RX + (q.kind === 'head' ? 30 : 16), y: slotY(slot) - 12, vx: 30, vy: -70, life: 1.3, delay: 0.3 });
    Sound.click(); updateCtl();
    if (lipDone()) {
      if (S.lip.type === 'tg') S.lip.tgDone = true; else if (S.lip.type === 'pl') S.lip.plDone = true;
      S.lip.flash = 1;
      setTimeout(() => { if (S.mode === 'blocks' && S.sub === 'lipid') { parts.burst(RX + 150, slotY(1), { count: 22, speed: 190, colors: ['#fbbf24', '#22d3ee', '#fb923c'] }); Sound.success(); } }, 450);
    }
    return true;
  }
  function tailPath(x, y, len) {
    ctx.beginPath(); ctx.moveTo(x, y);
    const step = 14; let up = 1;
    for (let px = x + step; px <= x + len + 0.1; px += step) { ctx.lineTo(px, y + up * 5.5); up = -up; }
  }
  function drawTail(x, y, o) {
    o = o || {};
    ctx.save(); ctx.globalAlpha = o.alpha == null ? 1 : o.alpha; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (o.lift) { ctx.shadowColor = 'rgba(120,60,0,.35)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 6; }
    tailPath(x, y, o.len || LT); ctx.strokeStyle = '#b45309'; ctx.lineWidth = 9; ctx.stroke();
    ctx.shadowColor = 'transparent';
    tailPath(x, y, o.len || LT); ctx.strokeStyle = '#fdba74'; ctx.lineWidth = 5.4; ctx.stroke();
    ctx.restore();
  }
  function drawHead(x, y, r, o) {
    o = o || {};
    ctx.save(); ctx.globalAlpha = o.alpha == null ? 1 : o.alpha;
    D.sphere(x, y, r, '#2f7fe0', { shadow: true, gloss: true });
    T(x, y + r * 0.34, '머리', Math.max(13, r * 0.62), '#fff', 'center', 800);
    ctx.restore();
  }
  function drawGlycerol(x, y0, y1) {
    ctx.save();
    D.shadow(() => { D.roundRect(x - 9, y0 - 26, 18, y1 - y0 + 52, 9); const g = ctx.createLinearGradient(x - 9, 0, x + 9, 0); g.addColorStop(0, '#fde68a'); g.addColorStop(1, '#d97706'); ctx.fillStyle = g; ctx.fill(); }, { blur: 6, y: 3, color: 'rgba(120,60,0,.3)' });
    D.roundRect(x - 9, y0 - 26, 18, y1 - y0 + 52, 9); ctx.strokeStyle = '#92400e'; ctx.lineWidth = 2; ctx.stroke();
    ctx.restore();
  }
  function lipBilayerInit() {
    const rr = mulberry(11), n = L(24, 20), per = n / 2, arr = [];
    const sc = L(1.7, 1.15), hr = 8.5, tl = 36, off = (hr * 0.6 + tl) * sc + 3;
    const cx = WS.x + WS.w / 2, cy = WS.y + WS.h * 0.56, sp = 2 * hr * sc * 1.12;
    for (let i = 0; i < n; i++) {
      const top = i < per, k = i % per;
      arr.push({ x: WS.x + 30 + rr() * (WS.w - 60), y: WS.y + 90 + rr() * (WS.h - 130), rot: rr() * TAU, tx: cx + (k - (per - 1) / 2) * sp, ty: cy + (top ? -1 : 1) * off, trot: top ? 0 : Math.PI, vx: 0, vy: 0, ph: rr() * TAU });
    }
    S.lip.bil = arr; S.lip.bilOff = off; S.lip.bilSc = sc;
  }
  lipBilayerInit();
  function drawMiniPL(x, y, rot, s, a) {
    // 머리(위쪽) + 꼬리 2개(아래쪽)
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.globalAlpha = a == null ? 1 : a;
    const hr = 8.5 * s, tl = 36 * s;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    [-4 * s, 4 * s].forEach((dx) => {
      ctx.beginPath(); ctx.moveTo(dx, hr * 0.6); for (let k = 1; k <= 4; k++) ctx.lineTo(dx + (k % 2 ? 2.4 : -2.4) * s, hr * 0.6 + tl * k / 4);
      ctx.strokeStyle = '#b45309'; ctx.lineWidth = 4.6 * s; ctx.stroke(); ctx.strokeStyle = '#fdba74'; ctx.lineWidth = 2.6 * s; ctx.stroke();
    });
    D.sphere(0, 0, hr, '#2f7fe0', { gloss: true, shadow: false });
    ctx.restore();
  }

  function drawSteroid() {
    const r = L(34, 25), cx = WS.x + WS.w * L(0.38, 0.45), cy = WS.y + WS.h * L(0.52, 0.5);
    const s3 = Math.sqrt(3);
    const ctr = [[0, 0], [s3 * r, 0], [s3 * r * 1.5, -1.5 * r]];
    const x0 = cx - (s3 * r * 1.5 + 1.55 * r) / 2, y0 = cy + 0.75 * r;
    const cols = ['#22d3ee', '#06b6d4', '#0891b2'];
    ctx.save(); ctx.lineJoin = 'round';
    ctr.forEach((c, i) => {
      ctx.beginPath(); for (let k = 0; k < 6; k++) { const a = -Math.PI / 2 + k * TAU / 6; const px = x0 + c[0] + Math.cos(a) * r, py = y0 + c[1] + Math.sin(a) * r; if (k) ctx.lineTo(px, py); else ctx.moveTo(px, py); } ctx.closePath();
      ctx.fillStyle = C.rgba(cols[i], 0.55); ctx.fill(); ctx.strokeStyle = '#0e7490'; ctx.lineWidth = 3; ctx.stroke();
    });
    const px0 = x0 + ctr[2][0] + 1.554 * r, py0 = y0 + ctr[2][1];
    ctx.beginPath(); for (let k = 0; k < 5; k++) { const a = k * TAU / 5; const px = px0 + Math.cos(a) * 0.851 * r, py = py0 + Math.sin(a) * 0.851 * r; if (k) ctx.lineTo(px, py); else ctx.moveTo(px, py); } ctx.closePath();
    ctx.fillStyle = C.rgba('#67e8f9', 0.6); ctx.fill(); ctx.strokeStyle = '#0e7490'; ctx.lineWidth = 3; ctx.stroke();
    // 곁사슬
    ctx.strokeStyle = '#0e7490'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(px0 + 0.85 * r, py0 - 0.2 * r); ctx.lineTo(px0 + 1.6 * r, py0 - 0.9 * r); ctx.lineTo(px0 + 2.4 * r, py0 - 0.4 * r); ctx.stroke();
    ctx.restore();
    // 이름표
    const lab = (i, nm) => { const c = ctr[i]; D.label(x0 + c[0], y0 + c[1] + 5, nm, { bg: 'rgba(14,116,144,.92)', size: 13, pad: 6 }); };
    lab(0, 'A'); lab(1, 'B'); lab(2, 'C'); D.label(px0, py0 + 5, 'D', { bg: 'rgba(14,116,144,.92)', size: 13, pad: 6 });
    return { x: x0, y: y0, r };
  }
  function drawWax() {
    const x0 = WS.x + 30, x1 = WS.x + WS.w - 30, cy = WS.y + WS.h * L(0.5, 0.42);
    ctx.save();
    // 잎 세포층
    for (let i = 0; i < 6; i++) { const w = (x1 - x0) / 6; D.roundRect(x0 + i * w + 3, cy + 22, w - 6, 70, 14); ctx.fillStyle = i % 2 ? '#86d17a' : '#74c668'; ctx.fill(); ctx.strokeStyle = '#3f8f3a'; ctx.lineWidth = 2; ctx.stroke(); if (i % 2 === 0) D.sphere(x0 + i * w + w / 2, cy + 57, 9, '#15803d', { gloss: false }); }
    // 큐티클 (왁스) 층
    ctx.beginPath(); ctx.moveTo(x0, cy + 20); for (let x = x0; x <= x1; x += 8) ctx.lineTo(x, cy + 20 + Math.sin(x * 0.07) * 2.2);
    ctx.lineTo(x1, cy + 8); for (let x = x1; x >= x0; x -= 8) ctx.lineTo(x, cy + 8 + Math.sin(x * 0.07) * 2.2); ctx.closePath();
    const g = ctx.createLinearGradient(0, cy + 6, 0, cy + 22); g.addColorStop(0, '#fde047'); g.addColorStop(1, '#eab308'); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = '#a16207'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.restore();
    // 물방울 (표면에 동글게 맺힘)
    [0.2, 0.42, 0.66, 0.84].forEach((f, i) => { const x = x0 + (x1 - x0) * f; const r = 11 + (i % 2) * 4; ctx.save(); ctx.globalAlpha = .95; D.sphere(x, cy - r + 6, r, '#7cc4ff', { gloss: true, light: '#e7f6ff' }); ctx.restore(); });
    callout(x0 + (x1 - x0) * 0.52, cy + 14, WS.x + WS.w * 0.5, cy - 62, '왁스(큐티클): 물이 새지 않게 막아요', { line: '#a16207', border: '#eab308' });
    T(x0 + 6, cy + 108, '잎 세포', 13, '#2f7a30', 'left', 800);
    return null;
  }

  function carbDraw(dt, t) {
    panel(WS.x, WS.y, WS.w, WS.h, 18, '#fffdf6');
    panel(TRAY.x, TRAY.y, TRAY.w, TRAY.h, 18, '#ffffff');
    const ch = chainOf(), n = ch.length, sh = S.carb.shape;
    const lay = carbLayout(sh, n);
    // 읽을거리
    const info = carbInfo();
    T(WS.x + 20, WS.y + 34, info[0], L(21, 18), CARB_COL === '#d97706' ? '#9a3412' : '#000', 'left', 800);
    textBlock(WS.x + 20, WS.y + 58, PHONE ? WS.w - 36 : WS.w - 190, info[1], L(15, 13.5), '#475569', L(21, 19), 700);
    // 빠져나간 물
    const wx = WS.x + WS.w - 24, wy0 = PHONE ? WS.y + WS.h - 38 : WS.y + 32;
    if (PHONE) { T(WS.x + 18, wy0 + 6, '빠져나간 물 ' + Math.max(0, n - 1) + '분자', 14, '#2a6fbf', 'left', 800); for (let k = 0; k < Math.max(0, n - 1); k++) drop(WS.x + 188 + k * 20, wy0 + 1, 7.5, 1); }
    else {
      T(wx, wy0, '빠져나간 물', 13.5, '#2a6fbf', 'right', 800);
      for (let k = 0; k < Math.max(0, n - 1); k++) drop(wx - 12 - k * 20, wy0 + 24, 7.5, 1);
      T(wx, wy0 + 56, Math.max(0, n - 1) + '분자', 14, '#2a6fbf', 'right', 800);
    }
    // 작업대 바닥선
    if (S.carb.shape !== 'bundle' && !PHONE) D.dashedLine(WS.x + 20, WS.y + WS.h - 28, WS.x + WS.w - 20, WS.y + WS.h - 28, { color: '#e7d9b0', width: 2 });
    if (n === 0) {
      ctx.save(); ctx.globalAlpha = 0.5 + 0.2 * Math.sin(t * 3);
      D.roundRect(CCX - RAD * 1.4, CCY - RAD * 1.4, RAD * 2.8, RAD * 2.8, 18); ctx.setLineDash([7, 6]); ctx.strokeStyle = '#d97706'; ctx.lineWidth = 2.5; ctx.stroke(); ctx.setLineDash([]);
      T(CCX, CCY + 6, '여기에', 14, '#b45309', 'center', 800);
      ctx.restore();
    }
    // 다발: 옆 가닥(흐리게)
    if (sh === 'bundle' && n >= 5) {
      [-1, 1].forEach((sgn) => {
        const yy = sgn * DSP * 1.55;
        const g = lay.map((p) => ({ x: p.x, y: p.y + yy }));
        g.forEach((p, k) => { if (k) link(g[k - 1], p, RAD, 0.35); });
        g.forEach((p, k) => drawGlucose(p.x, p.y, RAD, { alpha: 0.38, flip: k % 2 === (sgn > 0 ? 0 : 1) }));
      });
      for (let k = 0; k < n; k += 2) {
        for (const yy of [-1, 1]) {
          const y1 = lay[k].y + yy * DSP * 0.55, y2 = lay[k].y + yy * DSP * 1.0;
          D.dashedLine(lay[k].x, y1, lay[k].x, y2, { color: '#9a3412', width: 2, dash: [3, 4] });
        }
      }
      T(CCX, WS.y + WS.h - 12, '점선: 가닥 사이를 약하게 붙잡는 결합 → 곧은 가닥이 나란히 다발을 이뤄요', L(13.5, 12.5), '#9a3412', 'center', 800);
    }
    // 링크 → 고리 (나선은 깊이 순서)
    ch.forEach((b, k) => {
      const tg = lay[k];
      if (tg.par >= 0) { const pb = ch[tg.par]; link(pb, b, RAD * (1 - 0.05), 1); }
    });
    const order = ch.map((b, k) => ({ b, k, z: lay[k].z })).sort((a, c) => a.z - c.z);
    order.forEach(({ b, k }) => {
      const sc = (sh === 'helix' ? 0.9 + 0.1 * lay[k].z : 1) * (1 + b.pop * 0.18);
      drawGlucose(b.x, b.y, RAD, { scale: sc, flip: lay[k].flip, lift: b.lift });
      if (k === 0 && n >= 1 && sh === 'line') { /* 이름표 */ }
    });
    if (n >= 1 && sh === 'line') { const b0 = ch[0]; D.label(b0.x, b0.y + RAD + 24, '포도당 고리', { bg: '#fff7e0', color: '#9a3412', border: '#fcd9a0', size: 13 }); }
    // 트레이
    T(TRAY.x + 18, TRAY.y + 26, '🍞 포도당 고리 블록 ' + (8 - n) + '개 남음', L(16, 15), '#9a3412', 'left', 800);
    T(TRAY.x + TRAY.w - 16, TRAY.y + 26, PHONE ? '눌러서 연결' : '눌러서 또는 끌어서 연결해요', 13.5, '#64748b', 'right', 700);
    S.carb.blocks.filter((b) => b.slot < 0).forEach((b) => {
      if (S.carb.drag === b) return;
      drawGlucose(b.x, b.y, RAD, { scale: 1 + b.pop * 0.1 });
    });
    if (S.carb.drag) drawGlucose(S.carb.drag.x, S.carb.drag.y, RAD, { scale: 1.16, lift: 1 });
    // 완성 이름표 (단당류·이당류)
    if (n === 1 || n === 2) {
      const my = ch[0].y - RAD - 30;
      const mx = n === 1 ? ch[0].x : (ch[0].x + ch[1].x) / 2;
      D.label(mx, my, n === 1 ? '포도당' : '엿당 (포도당 + 포도당)', { bg: '#9a3412', size: 14 });
    }
  }
  function carbUpdate(dt) {
    const ch = chainOf(), n = ch.length, lay = carbLayout(S.carb.shape, n);
    S.carb.blocks.forEach((b) => {
      b.pop = approach(b.pop, 0, dt, 6);
      if (S.carb.drag === b) return;
      const tx = b.slot >= 0 ? lay[b.slot].x : b.hx, ty = b.slot >= 0 ? lay[b.slot].y : b.hy;
      if (RM) { b.x = tx; b.y = ty; } else { b.x = approach(b.x, tx, dt, 11); b.y = approach(b.y, ty, dt, 11); }
    });
    if (n === 2) S.carb.di = true;
    if (n >= 5) { S.carb.poly = true; if (S.carb.shape !== 'line') S.carb.shapes[S.carb.shape] = true; }
  }
  const carbPT = {
    down(p) {
      const free = S.carb.blocks.filter((b) => b.slot < 0 && Math.hypot(p.x - b.x, p.y - b.y) < RAD + 10);
      if (!free.length) return false;
      free.sort((a, b) => Math.hypot(p.x - a.x, p.y - a.y) - Math.hypot(p.x - b.x, p.y - b.y));
      const b = free[0]; S.carb.drag = b; b.sx = p.x; b.sy = p.y; b.moved = false; Sound.tick(); return true;
    },
    move(p) { const b = S.carb.drag; if (!b) return; if (Math.hypot(p.x - b.sx, p.y - b.sy) > 8) b.moved = true; if (b.moved) { b.x = p.x; b.y = p.y; } },
    up(p) {
      const b = S.carb.drag; if (!b) return; S.carb.drag = null;
      if (!b.moved || inRect(p.x, p.y, WS)) carbAttach(b);
    },
    hover(p) { return S.carb.blocks.some((b) => b.slot < 0 && Math.hypot(p.x - b.x, p.y - b.y) < RAD + 10) ? 'grab' : 'default'; },
  };

  /* ----- 지질 그리기 · 조작 ----- */
  function lipDraw(dt, t) {
    panel(WS.x, WS.y, WS.w, WS.h, 18, '#f4fcfd');
    const ty = S.lip.type;
    const hasTray = ty === 'tg' || ty === 'pl';
    if (hasTray) panel(TRAY.x, TRAY.y, TRAY.w, TRAY.h, 18, '#ffffff');
    const titles = { tg: ['중성 지방', '글리세롤 막대 1개 + 지방산 꼬리 3개'], pl: ['인지질', '글리세롤 막대 + 머리 1개 + 지방산 꼬리 2개'], st: ['스테로이드', '고리 4개가 붙은 모양 (고리 3개 + 5각 고리 1개)'], wx: ['왁스', '잎 표면의 큐티클을 이루는 지질'] };
    T(WS.x + 20, WS.y + 34, titles[ty][0], L(21, 18), '#0e7490', 'left', 800);
    textBlock(WS.x + 20, WS.y + 58, WS.w - 40, titles[ty][1], L(15, 13.5), '#475569', L(21, 19), 700);
    if (ty === 'st') {
      const g = drawSteroid();
      textBlock(WS.x + 24, WS.y + WS.h - 92, WS.w - 48, '예: 콜레스테롤(세포막을 이루는 성분), 성호르몬(몸의 기능을 조절하는 호르몬). 이 단계에서는 이런 모양만 알아도 돼요.', L(15, 13.5), '#334155', L(21, 19), 700);
      return;
    }
    if (ty === 'wx') {
      drawWax();
      textBlock(WS.x + 24, WS.y + WS.h - L(44, 62), WS.w - 48, '식물 잎 표면의 왁스는 물이 증발하는 것을 막고, 물방울이 구슬처럼 맺히게 해요.', L(15, 13.5), '#334155', L(21, 19), 700);
      return;
    }
    const w = S.lip.water;
    // 물 속 인지질 이중층
    if (ty === 'pl' && w > 0.01) {
      ctx.save(); ctx.globalAlpha = w;
      D.roundRect(WS.x + 6, WS.y + 6, WS.w - 12, WS.h - 12, 14); const g = ctx.createLinearGradient(0, WS.y, 0, WS.y + WS.h); g.addColorStop(0, '#dcf0ff'); g.addColorStop(1, '#b9defa'); ctx.fillStyle = g; ctx.fill();
      ctx.restore();
      ctx.save(); ctx.globalAlpha = w;
      T(WS.x + 20, WS.y + 34, '인지질 + 물', L(21, 18), '#0e7490', 'left', 800);
      textBlock(WS.x + 20, WS.y + 58, WS.w - 40, '머리는 물과 닿는 바깥쪽, 꼬리는 물을 피해 안쪽으로 모여요.', L(15, 13.5), '#334155', L(21, 19), 700);
      ctx.restore();
      S.lip.bil.forEach((q) => drawMiniPL(q.x, q.y, q.rot, S.lip.bilSc, w));
      ctx.save(); ctx.globalAlpha = w;
      const cy = WS.y + WS.h * 0.56;
      T(WS.x + WS.w / 2, cy - S.lip.bilOff - 34, '물 (바깥)', 14, '#2a6fbf', 'center', 800);
      T(WS.x + WS.w / 2, cy + S.lip.bilOff + 40, '물 (바깥)', 14, '#2a6fbf', 'center', 800);
      D.label(WS.x + WS.w / 2, cy + 5, '꼬리끼리 안쪽에 숨어요', { bg: 'rgba(255,247,224,.95)', color: '#9a3412', border: '#fdba74', size: 13 });
      callout(WS.x + WS.w * 0.5, cy - S.lip.bilOff - 4, WS.x + WS.w * 0.5, cy - S.lip.bilOff - 66, '머리: 물을 좋아해요', { line: '#2f7fe0', border: '#93c5fd' });
      ctx.restore();
    }
    const mainA = ty === 'pl' ? 1 - smooth(w * 1.6) : 1;
    if (mainA > 0.01) {
      ctx.save(); ctx.globalAlpha = mainA;
      drawGlycerol(RX, slotY(0), slotY(2));
      D.label(RX, slotY(2) + 52, '글리세롤', { bg: '#fff7e0', color: '#9a3412', border: '#fcd9a0', size: 13 });
      for (let k = 0; k < 3; k++) {
        if (ty === 'pl' && k === 0) { ctx.setLineDash([5, 5]); ctx.strokeStyle = '#93c5fd'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(RX + 46, slotY(0), 26, 0, TAU); ctx.stroke(); ctx.setLineDash([]); continue; }
        ctx.save(); ctx.globalAlpha = 0.5; ctx.setLineDash([6, 6]); ctx.strokeStyle = '#d97706'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(RX + 10, slotY(k)); ctx.lineTo(RX + 10 + LT, slotY(k)); ctx.stroke(); ctx.setLineDash([]); ctx.restore();
      }
      ctx.restore();
    }
    // 조각들
    S.lip.pieces.forEach((q) => {
      if (S.lip.drag === q) return;
      const a = q.slot >= 0 ? mainA : 1;
      if (a < 0.02) return;
      if (q.kind === 'tail') drawTail(q.x, q.y, { alpha: a, len: LT });
      else drawHead(q.x + (q.slot >= 0 ? 0 : 0), q.y, 26, { alpha: a });
    });
    if (S.lip.drag) { const q = S.lip.drag; if (q.kind === 'tail') drawTail(q.x, q.y, { lift: 1 }); else drawHead(q.x, q.y, 28); }
    // 이름표
    if (mainA > 0.3 && ty === 'tg') {
      const a = S.lip.pieces.filter((q) => q.slot >= 0).length;
      if (a > 0) D.label(RX + 10 + LT / 2, slotY(0) - 30, '지방산 꼬리', { bg: '#fff7e0', color: '#9a3412', border: '#fcd9a0', size: 13 });
    }
    if (mainA > 0.3 && ty === 'pl') {
      const hd = S.lip.pieces.find((q) => q.kind === 'head' && q.slot >= 0);
      if (hd) D.label(RX + 46, slotY(0) - 42, '머리: 물을 좋아해요', { bg: '#e3efff', color: '#1d4ed8', border: '#93c5fd', size: 13, align: 'left' });
      if (S.lip.pieces.some((q) => q.kind === 'tail' && q.slot >= 0)) D.label(RX + 10 + LT / 2, slotY(2) + 32, '꼬리 2개: 물을 싫어해요', { bg: '#fff7e0', color: '#9a3412', border: '#fcd9a0', size: 13 });
    }
    // 트레이 글
    if (hasTray) {
      const left = S.lip.pieces.filter((q) => q.slot < 0).length;
      T(TRAY.x + 18, TRAY.y + 24, left ? '조각을 글리세롤에 연결해요 (눌러도 돼요)' : (S.lip.flash > 0.01 || lipDone() ? '✨ 완성!' : ''), L(15, 14), '#0e7490', 'left', 800);
      const xr = TRAY.x + TRAY.w - 16;
      if (ty === 'tg') { textBlock(PHONE ? TRAY.x + 14 : TRAY.x + 300, PHONE ? TRAY.y + 176 : TRAY.y + 44, PHONE ? TRAY.w - 28 : TRAY.w - 316, '꼬리 하나가 연결될 때마다 물 1분자가 빠져나가요. 꼬리는 길게 이어진 사슬이에요.', L(14.5, 13), '#475569', L(21, 18), 700); }
      else { textBlock(PHONE ? TRAY.x + 14 : TRAY.x + 300, PHONE ? TRAY.y + 150 : TRAY.y + 44, PHONE ? TRAY.w - 28 : TRAY.w - 316, '머리 1개 + 꼬리 2개를 연결해요. 머리와 꼬리는 물을 대하는 성질이 달라요.', L(14, 13), '#475569', L(21, 18), 700); }
    }
    // 완성 이름표
    if (lipDone() && mainA > 0.3) {
      const txt = ty === 'tg' ? '중성 지방 완성 (물 3분자 빠짐)' : '인지질 완성';
      D.label(WS.x + WS.w - 20, WS.y + 36, txt, { bg: '#0e7490', size: 14, align: 'right' });
    }
  }
  function lipUpdate(dt, t) {
    S.lip.flash = approach(S.lip.flash, 0, dt, 1.2);
    S.lip.water = approach(S.lip.water, S.lip.waterOn && S.lip.type === 'pl' ? 1 : 0, dt, RM ? 60 : 2.4);
    const w = S.lip.water;
    S.lip.pieces.forEach((q) => {
      q.pop = approach(q.pop, 0, dt, 6);
      if (S.lip.drag === q) return;
      let tx = q.hx, ty = q.hy;
      if (q.slot >= 0) { tx = q.kind === 'head' ? RX + 46 : RX + 10; ty = slotY(q.slot); if (q.kind === 'head') { tx = RX + 46; } }
      if (q.kind === 'tail' && q.slot < 0) { tx = q.hx; ty = q.hy; }
      if (RM) { q.x = tx; q.y = ty; } else { q.x = approach(q.x, tx, dt, 11); q.y = approach(q.y, ty, dt, 11); }
    });
    if (S.lip.waterOn && S.lip.type === 'pl') S.lip.waterSeen = S.lip.waterSeen || w > 0.9;
    // 이중층 이동
    S.lip.bil.forEach((q) => {
      const k = smooth(w);
      if (S.lip.waterOn) {
        q.x = approach(q.x, q.tx + Math.sin(t * 1.3 + q.ph) * 1.6, dt, 2.6); q.y = approach(q.y, q.ty + Math.cos(t * 1.1 + q.ph) * 1.4, dt, 2.6);
        let dr = q.trot - q.rot; dr = Math.atan2(Math.sin(dr), Math.cos(dr)); q.rot += dr * Math.min(1, dt * 3);
      } else { q.rot += dt * 0.6; }
    });
  }
  function lipSetWater(on) {
    if (S.lip.type !== 'pl' || !lipDone()) return;
    S.lip.waterOn = !!on;
    if (on) lipBilayerInit();
    Sound.click(); updateCtl();
  }
  const lipPT = {
    down(p) {
      const ty = S.lip.type; if (ty !== 'tg' && ty !== 'pl') return false;
      if (S.lip.waterOn) return false;
      const free = S.lip.pieces.filter((q) => q.slot < 0 && (q.kind === 'tail' ? (p.x >= q.x - 10 && p.x <= q.x + LT + 10 && Math.abs(p.y - q.y) < 18) : Math.hypot(p.x - q.x, p.y - q.y) < 30));
      if (!free.length) return false;
      const q = free[0]; S.lip.drag = q; q.sx = p.x; q.sy = p.y; q.moved = false; q.ox = p.x - q.x; q.oy = p.y - q.y; Sound.tick(); return true;
    },
    move(p) { const q = S.lip.drag; if (!q) return; if (Math.hypot(p.x - q.sx, p.y - q.sy) > 8) q.moved = true; if (q.moved) { q.x = p.x - q.ox; q.y = p.y - q.oy; } },
    up(p) {
      const q = S.lip.drag; if (!q) return; S.lip.drag = null;
      if (!q.moved || inRect(p.x, p.y, WS)) { if (!lipAttach(q)) { showHint('이 조각은 지금 만드는 지질에 필요하지 않아요.'); } }
    },
    hover(p) { return S.lip.pieces.some((q) => q.slot < 0 && (q.kind === 'tail' ? (p.x >= q.x - 10 && p.x <= q.x + LT + 10 && Math.abs(p.y - q.y) < 18) : Math.hypot(p.x - q.x, p.y - q.y) < 30)) ? 'grab' : 'default'; },
  };


  /* =========================================================
     분류 카드 · 기능 연결 (Sorter)
     ========================================================= */
  const KIND = {
    glucose: ['포도당', 'mono', '포도당은 고리 1개짜리 단당류예요.'],
    sucrose: ['설탕', 'di', '설탕은 포도당과 과당이 결합한 이당류예요. (고리 2개)'],
    starch: ['녹말', 'poly', '녹말은 포도당이 길게 이어진 다당류예요.'],
    glycogen: ['글리코젠', 'poly', '글리코젠은 포도당이 가지 치며 이어진 다당류예요.'],
    cellulose: ['셀룰로스', 'poly', '셀룰로스도 포도당이 이어진 다당류예요.'],
    tg: ['중성 지방', 'tg', '중성 지방은 글리세롤 1개에 지방산 꼬리 3개가 붙어요.'],
    pl: ['인지질', 'pl', '인지질은 머리 1개와 꼬리 2개를 가진 지질이에요.'],
    chol: ['콜레스테롤', 'ster', '콜레스테롤은 고리 4개 모양의 스테로이드예요.'],
  };
  const SORT_BOXES = [
    { id: 'mono', label: '탄수화물: 단당류', col: '#d97706' },
    { id: 'di', label: '탄수화물: 이당류', col: '#d97706' },
    { id: 'poly', label: '탄수화물: 다당류', col: '#d97706' },
    { id: 'tg', label: '지질: 중성 지방', col: '#0891b2' },
    { id: 'pl', label: '지질: 인지질', col: '#0891b2' },
    { id: 'ster', label: '지질: 스테로이드', col: '#0891b2' },
  ];
  function sortLayout() {
    const bx = [];
    if (PHONE) { const bw = 224, bh = 106; SORT_BOXES.forEach((b, i) => bx.push(Object.assign({}, b, { x: 10 + (i % 2) * (bw + 12), y: 10 + Math.floor(i / 2) * (bh + 10), w: bw, h: bh, cols: 1, hdr: 30 }))); }
    else { const bw = 250, bh = 152; SORT_BOXES.forEach((b, i) => bx.push(Object.assign({}, b, { x: 14 + (i % 3) * (bw + 11), y: 14 + Math.floor(i / 3) * (bh + 12), w: bw, h: bh, cols: 1, hdr: 32 }))); }
    return bx;
  }
  const sortKeys = Object.keys(KIND);
  const SORT_TRAY = PHONE ? { x: 10, y: 360, w: 460, h: 270 } : { x: 14, y: 358, w: 772, h: 188 };
  const sorter = new Sorter({
    cards: sortKeys.map((k) => ({ id: k, label: KIND[k][0], col: KIND[k][1] === 'tg' || KIND[k][1] === 'pl' || KIND[k][1] === 'ster' ? LIPID_COL : CARB_COL })),
    boxes: sortLayout(), cw: PHONE ? 214 : 176, ch: PHONE ? 42 : 40, kh: PHONE ? 30 : 32,
    tray: (i) => (PHONE ? { x: 16 + (i % 2) * 226, y: SORT_TRAY.y + 46 + Math.floor(i / 2) * 54 } : { x: 28 + (i % 4) * 188, y: SORT_TRAY.y + 56 + Math.floor(i / 4) * 56 }),
    onChange() { S.sortNote = ''; },
  });
  function sortWrong() { return sorter.cards.filter((c) => c.zone && KIND[c.id][1] !== c.zone); }

  const FUNC = {
    starch: { name: '녹말', func: '식물의 에너지 저장', col: '#d97706' },
    glycogen: { name: '글리코젠', func: '간·근육의 에너지 저장', col: '#d97706' },
    cellulose: { name: '셀룰로스', func: '식물 세포벽의 주성분', col: '#d97706' },
    tg: { name: '중성 지방', func: '장기 에너지 저장·단열', col: '#0891b2' },
    pl: { name: '인지질', func: '세포막의 기본 뼈대', col: '#0891b2' },
    chol: { name: '콜레스테롤', func: '호르몬의 재료', col: '#0891b2' },
  };
  const funcKeys = Object.keys(FUNC);
  const MATCH_TRAY = PHONE ? { x: 10, y: 360, w: 460, h: 270 } : { x: 14, y: 270, w: 772, h: 276 };
  const matcher = new Sorter({
    cards: funcKeys.map((k) => ({ id: k, label: FUNC[k].func, short: FUNC[k].func, col: FUNC[k].col })),
    boxes: funcKeys.map((k, i) => {
      const bw = PHONE ? 224 : 250, bh = PHONE ? 106 : 118;
      return { id: k, label: FUNC[k].name, col: FUNC[k].col, x: PHONE ? 10 + (i % 2) * (bw + 12) : 14 + (i % 3) * (bw + 11), y: PHONE ? 10 + Math.floor(i / 2) * (bh + 10) : 14 + Math.floor(i / 3) * (bh + 12), w: bw, h: bh, cols: 1, hdr: 32 };
    }),
    cw: PHONE ? 214 : 236, ch: 42, kh: 40,
    tray: (i) => { const o = [2, 5, 0, 3, 4, 1][i]; return PHONE ? { x: 16 + (o % 2) * 226, y: MATCH_TRAY.y + 50 + Math.floor(o / 2) * 54 } : { x: 28 + (o % 3) * 252, y: MATCH_TRAY.y + 62 + Math.floor(o / 3) * 56 }; },
    onChange() { S.matchNote = ''; },
  });
  function matchWrong() { return matcher.cards.filter((c) => c.zone && c.zone !== c.id); }
  S.sortNote = ''; S.matchNote = '';

  function sortDraw(dt, t) {
    sorter.update(dt);
    sorter.drawBoxes();
    panel(SORT_TRAY.x, SORT_TRAY.y, SORT_TRAY.w, SORT_TRAY.h, 16, '#ffffff');
    T(SORT_TRAY.x + 16, SORT_TRAY.y + 26, '카드 8장을 알맞은 상자에 끌어 넣어요 (눌렀다가 상자를 눌러도 돼요)', L(15, 13.5), '#334155', 'left', 800);
    sorter.drawCards();
  }
  function matchDraw(dt, t) {
    matcher.update(dt);
    matcher.drawBoxes();
    panel(MATCH_TRAY.x, MATCH_TRAY.y, MATCH_TRAY.w, MATCH_TRAY.h, 16, '#ffffff');
    T(MATCH_TRAY.x + 16, MATCH_TRAY.y + 28, '기능 카드를 알맞은 물질 상자에 끌어 넣어요', L(15, 13.5), '#334155', 'left', 800);
    matcher.drawCards();
    if (!PHONE) {
      T(MATCH_TRAY.x + 16, MATCH_TRAY.y + MATCH_TRAY.h - 22, '에너지 1 g당: 탄수화물 약 4 kcal · 중성 지방 약 9 kcal', 14, '#64748b', 'left', 800);
    }
  }
  const sortPT = { down: (p) => sorter.down(p), move: (p) => sorter.move(p), up: (p) => sorter.up(p), hover: (p) => sorter.hover(p) };
  const matchPT = { down: (p) => matcher.down(p), move: (p) => matcher.move(p), up: (p) => matcher.up(p), hover: (p) => matcher.hover(p) };

  /* =========================================================
     ② 에너지 저장 비교 : 같은 에너지를 저장하는 데 필요한 질량
     ========================================================= */
  const KCAL_C = 4, KCAL_F = 9;
  S.en = { E: 600, mC: 150, mF: 66.7, seen: { low: false, hi: false } };
  const EN = PHONE ? { x: 10, y: 10, w: 460, h: 330 } : { x: 14, y: 14, w: 772, h: 318 };
  const EN2 = PHONE ? { x: 10, y: 352, w: 460, h: 278 } : { x: 14, y: 344, w: 772, h: 202 };
  function energyDraw(dt, t) {
    const e = S.en;
    e.mC = approach(e.mC, e.E / KCAL_C, dt, 7); e.mF = approach(e.mF, e.E / KCAL_F, dt, 7);
    panel(EN.x, EN.y, EN.w, EN.h, 18, '#fffdf6');
    T(EN.x + 20, EN.y + 34, '같은 에너지 ' + e.E + ' kcal를 저장하려면?', L(21, 18), '#9a3412', 'left', 800);
    textBlock(EN.x + 20, EN.y + 58, EN.w - 40, '필요한 질량 = 저장할 에너지 / 1 g당 에너지. 막대 길이가 질량이에요.', L(15, 13.5), '#475569', 20, 700);
    const ax0 = EN.x + L(150, 22), axW = EN.w - L(150, 22) - L(64, 66), bh = L(56, 40);
    const rows = [
      { y: EN.y + L(104, 152), name: '탄수화물', icon: '🍞', per: KCAL_C, m: e.mC, col: '#d97706', real: e.E / KCAL_C },
      { y: EN.y + L(196, 232), name: '중성 지방', icon: '🧈', per: KCAL_F, m: e.mF, col: '#0891b2', real: e.E / KCAL_F },
    ];
    // 눈금
    const maxM = 500, gy0 = EN.y + L(92, 126), gy1 = EN.y + L(262, 284), gl = EN.y + L(284, 306);
    for (let v = 0; v <= maxM; v += 100) {
      const x = ax0 + axW * v / maxM;
      D.dashedLine(x, gy0, x, gy1, { color: '#e7ddc5', width: 1.5, dash: [4, 5] });
      T(x, gl, v + (v === maxM ? ' g' : ''), 13, '#64748b', 'center', 700);
    }
    rows.forEach((r) => {
      if (PHONE) {
        E(r.icon, EN.x + 30, r.y - 16, 24);
        T(EN.x + 52, r.y - 12, r.name + '  (1 g당 ' + r.per + ' kcal)', 14.5, '#1f2d44', 'left', 800);
      } else {
        E(r.icon, EN.x + 30, r.y + bh / 2, 28);
        T(EN.x + 58, r.y + bh / 2 - 2, r.name, 16, '#1f2d44', 'left', 800);
        T(EN.x + 58, r.y + bh / 2 + 18, '1 g당 ' + r.per + ' kcal', 13, '#64748b', 'left', 700);
      }
      const w = axW * clamp(r.m, 0, maxM) / maxM;
      D.shadow(() => { D.roundRect(ax0, r.y, Math.max(0.1, w), bh, 10); const g = ctx.createLinearGradient(0, r.y, 0, r.y + bh); g.addColorStop(0, C.shade(r.col, 0.3)); g.addColorStop(1, r.col); ctx.fillStyle = g; ctx.fill(); }, { blur: 6, y: 3, color: 'rgba(0,0,0,.18)' });
      if (w > 4) { ctx.save(); D.roundRect(ax0, r.y, w, bh, 10); ctx.clip(); ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(ax0, r.y + 4, w, bh * 0.28); ctx.restore(); }
      D.label(ax0 + w + 8, r.y + bh / 2, Math.round(r.real) + ' g', { bg: r.col, size: 15, align: 'left' });
    });
    D.label(PHONE ? EN.x + 20 : EN.x + EN.w - 20, PHONE ? EN.y + 108 : EN.y + 36, '지방은 탄수화물의 약 ' + (KCAL_F / KCAL_C).toFixed(2) + '배 에너지', { bg: '#fff1d6', color: '#9a3412', border: '#fcd9a0', size: 13, align: PHONE ? 'left' : 'right' });
    // 동물 카드
    panel(EN2.x, EN2.y, EN2.w, EN2.h, 18, '#ffffff');
    T(EN2.x + 20, EN2.y + 30, '그래서 지방을 쓰는 생물들', L(17, 15), '#0e7490', 'left', 800);
    const items = [['🐻', '곰', '겨울잠 동안 몸에 쌓아 둔 지방을 천천히 써요.'], ['🐪', '낙타 혹', '지방을 모아 저장해요. 같은 에너지를 가볍게 지닐 수 있어요.'], ['🐦', '철새', '먼 거리를 날기 전에 지방을 쌓아요.']];
    if (PHONE) {
      items.forEach((it, i) => { const y = EN2.y + 64 + i * 70; E(it[0], EN2.x + 36, y + 18, 34); T(EN2.x + 72, y + 12, it[1], 15, '#1f2d44', 'left', 800); textBlock(EN2.x + 72, y + 32, EN2.w - 90, it[2], 13, '#475569', 17, 700); });
    } else {
      const cw = (EN2.w - 20 * 2 - 24) / 3;
      items.forEach((it, i) => { const x = EN2.x + 20 + i * (cw + 12); D.roundRect(x, EN2.y + 52, cw, 132, 14); ctx.fillStyle = '#f1fafc'; ctx.fill(); E(it[0], x + 34, EN2.y + 88, 38); T(x + 66, EN2.y + 92, it[1], 16, '#1f2d44', 'left', 800); textBlock(x + 14, EN2.y + 126, cw - 28, it[2], 13.5, '#475569', 19, 700); });
    }
  }
  function energyCalcOk() {
    const c = numOf('inCarb'), f = numOf('inFat'), E_ = S.en.E;
    return { c: Math.abs(c - 250) < 0.5 && E_ === 1000, f: f >= 111 && f <= 111.2 && E_ === 1000 };
  }


  /* =========================================================
     ③ 검출 반응 실험대 : 시료 9종 × 시약 3종
     ========================================================= */
  const SAMPLES = [
    { id: 'water', n: ['증류수'], base: '#d6ecfa', iod: 0, ben: 0, sud: 0, truth: [0, 0, 0] },
    { id: 'glucose', n: ['포도당', '용액'], base: '#d6ecfa', iod: 0, ben: 3, sud: 0, truth: [0, 1, 0] },
    { id: 'sucrose', n: ['설탕', '용액'], base: '#d6ecfa', iod: 0, ben: 0, sud: 0, truth: [0, 0, 0] },
    { id: 'starch', n: ['녹말', '용액'], base: '#e9e8dc', iod: 1, ben: 0, sud: 0, truth: [1, 0, 0] },
    { id: 'oil', n: ['식용유'], base: '#d6ecfa', oil: true, iod: 0, ben: 0, sud: 3, truth: [0, 0, 1] },
    { id: 'potato', n: ['감자 즙'], base: '#e8dcc0', iod: 1, ben: 1, sud: 0, truth: [1, 1, 0] },
    { id: 'apple', n: ['사과즙'], base: '#f2e6a2', iod: 0, ben: 3, sud: 0, truth: [0, 1, 0] },
    { id: 'peanut', n: ['땅콩 즙'], base: '#eedab0', iod: 0, ben: 0, sud: 2, truth: [0, 0, 1] },
    { id: 'milk', n: ['우유'], base: '#fbfaf2', iod: 0, ben: 2, sud: 1, truth: [0, 1, 1] },
  ];
  const REAG = [
    { id: 'iod', name: '아이오딘–아이오딘화 칼륨 용액', short: '아이오딘', col: '#b7791f' },
    { id: 'ben', name: '베네딕트 용액', short: '베네딕트', col: '#3a86d8' },
    { id: 'sud', name: '수단 Ⅲ 용액', short: '수단 Ⅲ', col: '#e24a1a' },
  ];
  const BEN = ['#3a86d8', '#3fae6a', '#e3c933', '#ef8f2d', '#b83b25'];
  const BEN_NAME = ['청색(변화 없음)', '녹색', '노란색', '주황색', '벽돌색'];
  const IOD_NAVY = '#26237f', IOD_AMB = '#c58a22';
  const SUD_RED = '#e0451c';
  S.lab = { r: 0, t: [[], [], []], bath: { on: false, timer: 0, flame: 0, temp: 25 }, bottleX: 120, bottleTilt: 0 };
  function labReset() {
    S.lab.t = [0, 1, 2].map(() => SAMPLES.map(() => ({ added: false, dropT: -9, prog: 0, heat: 0 })));
    S.lab.bath.on = false; S.lab.bath.timer = 0; S.lab.bath.flame = 0;
    S.tbl = { v: SAMPLES.map(() => [false, false, false]), bad: SAMPLES.map(() => false), shake: SAMPLES.map(() => 0) };
    updateCtl();
  }
  const TUBE = PHONE ? { w: 30, h: 116 } : { w: 36, h: 176 };
  const tubePos = (i) => {
    if (!PHONE) return { x: 14 + 43 + i * (772 / 9), y: 158 };
    return { x: 10 + 40 + (i % 3) * 152, y: 62 + Math.floor(i / 3) * 192 };
  };
  const tubeHit = (p, i) => { const q = tubePos(i); return p.x >= q.x - 30 && p.x <= q.x + (PHONE ? 100 : 30) && p.y >= q.y - 24 && p.y <= q.y + TUBE.h + 6; };
  function labApply(r, i, delay) {
    const t = S.lab.t[r][i]; if (t.added) return false;
    t.added = true; t.dropT = -(delay || 0); Sound.tick(); return true;
  }
  function labApplyAll(r) { SAMPLES.forEach((s, i) => labApply(r, i, i * 0.14)); Sound.click(); updateCtl(); }
  function labHeat() {
    if (!S.lab.t[1].some((t) => t.added)) { showHint('먼저 베네딕트 용액을 시험관에 넣어요.'); return; }
    S.lab.bath.on = true; S.lab.bath.timer = 6; Sound.click(); updateCtl();
  }
  const labCount = (r) => S.lab.t[r].filter((t) => t.added && t.prog > 0.95 && (r !== 1 || t.heat > 0.99)).length;
  const labAdded = (r) => S.lab.t[r].filter((t) => t.added).length;

  /* 시험관 안 모습 계산 */
  function tubeLook(r, i) {
    const s = SAMPLES[i], t = S.lab.t[r][i];
    const L0 = { water: s.base, oil: null, lvW: 0.62, lvO: 0, dots: [], tint: null };
    if (s.oil) { L0.lvW = 0.3; L0.oil = '#f3d34a'; L0.lvO = 0.3; }
    if (!t.added) return L0;
    const pr = smooth(t.prog);
    if (r === 0) {
      const col = s.iod ? (pr < 0.35 ? C.mix(s.base, IOD_AMB, pr / 0.35) : C.mix(IOD_AMB, IOD_NAVY, (pr - 0.35) / 0.65)) : C.mix(s.base, IOD_AMB, 0.62 * pr);
      L0.water = col;
    } else if (r === 1) {
      const h = t.heat, fin = s.ben;
      let col = C.mix(s.base, BEN[0], Math.min(1, pr * 1.2));
      if (h > 0) { const f = h * fin, a = Math.floor(f), b = Math.min(4, a + 1); col = a >= 4 ? BEN[4] : C.mix(BEN[a], BEN[b], f - a); if (fin === 0) col = BEN[0]; }
      L0.water = col;
      if (fin >= 3 && h > 0.5) { const rr = mulberry(30 + i); for (let k = 0; k < Math.round(10 * (h - 0.5) * 2); k++) L0.dots.push({ x: 0.15 + rr() * 0.7, y: 0.93 - rr() * 0.07, r: 1.6 + rr() * 1.4, c: BEN[Math.min(4, fin + 1)] }); }
    } else {
      const rr = mulberry(77 + i);
      if (s.oil) { L0.oil = C.mix('#f3d34a', SUD_RED, pr * 0.92); }
      else if (s.sud >= 2) { for (let k = 0; k < 11; k++) L0.dots.push({ x: 0.12 + rr() * 0.76, y: 1 - L0.lvW + 0.03 + rr() * 0.3, r: 2 + rr() * 1.8, c: SUD_RED, a: pr }); L0.water = C.mix(s.base, '#f2a98a', 0.28 * pr); }
      else if (s.sud === 1) { for (let k = 0; k < 4; k++) L0.dots.push({ x: 0.2 + rr() * 0.6, y: 1 - L0.lvW + 0.03 + rr() * 0.18, r: 1.9 + rr() * 1.0, c: SUD_RED, a: pr }); }
      else { for (let k = 0; k < 4; k++) L0.dots.push({ x: 0.2 + rr() * 0.6, y: 0.94 - rr() * 0.04, r: 1.4 + rr() * 0.8, c: '#e98b62', a: pr * 0.9 }); }
    }
    return L0;
  }
  function drawTubeLiquid(x, y, w, h, look, t) {
    const path = () => { ctx.beginPath(); ctx.moveTo(x - w / 2, y); ctx.lineTo(x - w / 2, y + h - w / 2); ctx.arc(x, y + h - w / 2, w / 2, Math.PI, 0, true); ctx.lineTo(x + w / 2, y); };
    ctx.save(); path(); ctx.closePath(); ctx.clip();
    const topW = y + h - h * look.lvW;
    ctx.fillStyle = C.rgba(look.water, 0.9); ctx.fillRect(x - w, topW, w * 2, h * look.lvW + 4);
    if (look.oil) { const topO = topW - h * look.lvO; ctx.fillStyle = C.rgba(look.oil, 0.92); ctx.fillRect(x - w, topO, w * 2, topW - topO + 1); ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fillRect(x - w, topO, w * 2, 2.4); }
    else { ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fillRect(x - w, topW, w * 2, 2.4); }
    look.dots.forEach((d) => { ctx.globalAlpha = d.a == null ? 1 : d.a; ctx.fillStyle = d.c; ctx.beginPath(); ctx.arc(x - w / 2 + 3 + d.x * (w - 6), y + d.y * h, d.r, 0, TAU); ctx.fill(); });
    ctx.globalAlpha = 1;
    // 글라스 반사 + 가열 거품
    ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.fillRect(x - w / 2 + 3, y + 8, 3.5, h - w);
    ctx.restore();
    ctx.save(); path(); ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 2.5; ctx.stroke(); ctx.restore();
  }

  function labDraw(dt, t) {
    const lab = S.lab, r = lab.r, bath = lab.bath;
    // 실험대 배경
    bgFill('#eef4f2', '#dfe9e4');
    D.roundRect(0, VH - 58, VW, 58, 0); ctx.fillStyle = '#d9c9a8'; ctx.fill();
    // 시약병 + 라벨
    const rg = REAG[r];
    if (PHONE) {
      D.label(VW / 2, 24, rg.name, { bg: rg.col, size: 13.5, pad: 10 });
    } else {
      const tx = tubePos(Math.max(0, lab.focus == null ? 0 : lab.focus)).x;
      lab.bottleX = approach(lab.bottleX, tx, dt, 5);
      const bx = lab.bottleX, by = 94;
      lab.bottleTilt = approach(lab.bottleTilt, lab.dropping ? 1 : 0, dt, 12);
      ctx.save(); ctx.translate(bx, by); ctx.rotate(-0.12 * lab.bottleTilt);
      D.shadow(() => { D.roundRect(-24, -34, 48, 56, 12); ctx.fillStyle = C.rgba(rg.col, 0.85); ctx.fill(); }, { blur: 6, y: 3 });
      D.roundRect(-24, -34, 48, 56, 12); ctx.strokeStyle = C.shade(rg.col, -0.35); ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#374151'; D.roundRect(-9, -52, 18, 20, 4); ctx.fill();
      ctx.fillStyle = '#374151'; ctx.beginPath(); ctx.moveTo(-6, 22); ctx.lineTo(6, 22); ctx.lineTo(2, 36); ctx.lineTo(-2, 36); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillRect(-18, -14, 36, 22);
      T(0, 2, rg.short.length > 4 ? rg.short.slice(0, 4) : rg.short, 12.5, '#1f2d44', 'center', 800);
      ctx.restore();
      D.label(20, 22, '시약: ' + rg.name, { bg: rg.col, size: 14, align: 'left', pad: 10 });
    }
    // 중탕 물그릇 (베네딕트일 때, 줄마다)
    const rows = PHONE ? 3 : 1;
    if (r === 1) {
      for (let rw = 0; rw < rows; rw++) {
        const q = tubePos(rw * (PHONE ? 3 : 0)), top = q.y + TUBE.h * 0.5, bot = q.y + TUBE.h + 12;
        const x0 = PHONE ? 10 : 22, x1 = PHONE ? 470 : 778;
        ctx.save(); D.roundRect(x0, top, x1 - x0, bot - top, 10); ctx.clip();
        const g = ctx.createLinearGradient(0, top, 0, bot); g.addColorStop(0, 'rgba(120,190,245,.55)'); g.addColorStop(1, 'rgba(70,150,225,.7)'); ctx.fillStyle = g; ctx.fillRect(x0, top, x1 - x0, bot - top);
        ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.moveTo(x0, top + 3); for (let x = x0; x <= x1; x += 12) ctx.lineTo(x, top + 3 + Math.sin(t * 2.4 + x * 0.05) * 1.6); ctx.lineTo(x1, top - 2); ctx.lineTo(x0, top - 2); ctx.fill();
        ctx.restore();
        lab['bath' + rw] = { x0, x1, top, bot };
      }
    }
    // 시험관 거치대 + 시험관
    const q0 = tubePos(0);
    if (!PHONE) { D.roundRect(20, q0.y + TUBE.h * 0.42, 760, 10, 5); ctx.fillStyle = '#b08a52'; ctx.fill(); }
    SAMPLES.forEach((s, i) => {
      const q = tubePos(i), st = lab.t[r][i];
      const look = tubeLook(r, i);
      const dy = st.added && r === 1 && bath.on && st.prog > 0.9 ? Math.sin(t * 40 + i) * 0.6 : 0;
      drawTubeLiquid(q.x, q.y + dy, TUBE.w, TUBE.h, look, t);
      // 떨어지는 방울
      if (st.added && st.dropT > 0 && st.dropT < 0.55) {
        const k = st.dropT / 0.55, surf = q.y + TUBE.h - TUBE.h * (look.lvW + look.lvO);
        const yy = lerp(q.y - 24, surf, k * k);
        ctx.save(); const rc = REAG[r].col; D.sphere(q.x, yy, 5.5, rc, { gloss: true }); ctx.restore();
        lab.dropping = true;
      }
      // 이름과 결과
      const nm = s.n;
      const lx = PHONE ? q.x + 28 : q.x, ly = PHONE ? q.y + 20 : q.y + TUBE.h + 30;
      const al = PHONE ? 'left' : 'center';
      nm.forEach((l, k) => T(lx, ly + k * 16, l, PHONE ? 14 : 13.5, '#26324a', al, 800));
      const done = st.added && st.prog > 0.95 && (r !== 1 || st.heat > 0.99);
      const ry = ly + nm.length * 16 + 6;
      let txt = '', col = '#64748b';
      if (done) {
        if (r === 0) { txt = s.iod ? '청람색' : '황갈색'; col = s.iod ? '#26237f' : '#8a5a12'; }
        else if (r === 1) { txt = ['청색', '녹색', '노란색', '주황색', '벽돌색'][s.ben]; col = BEN[s.ben]; if (s.ben === 0) col = '#2563a8'; }
        else { txt = ['변화 없음', '붉은 방울 조금', '붉은 방울', '붉게 염색'][s.sud]; col = s.sud ? '#c2410c' : '#64748b'; }
        if (PHONE) T(lx, ry + 4, txt, 13, col, al, 800); else TF(lx, ry + 4, txt, 82, 13.5, 11, col, al, 800);
      } else if (st.added && r === 1 && st.prog > 0.95) {
        T(lx, ry + 4, '가열해요', 13, '#b45309', al, 800);
      } else if (!st.added) {
        T(lx, ry + 4, '눌러서 넣기', 12.5, '#94a3b8', al, 700);
      }
      if (done) D.check(PHONE ? q.x + 12 : q.x + TUBE.w * 0.5 + 8, q.y - 12, 7, 1);
    });
    lab.dropping = lab.t[r].some((st) => st.added && st.dropT > 0 && st.dropT < 0.55);
    // 중탕 앞 유리 + 불꽃 + 온도
    if (r === 1) {
      for (let rw = 0; rw < rows; rw++) {
        const b = lab['bath' + rw]; if (!b) continue;
        ctx.save(); D.roundRect(b.x0, b.top, b.x1 - b.x0, b.bot - b.top, 10); ctx.strokeStyle = 'rgba(120,150,190,.8)'; ctx.lineWidth = 3; ctx.stroke(); ctx.restore();
        if (bath.flame > 0.02) {
          const q0 = tubePos(rw * (PHONE ? 3 : 0)), sp = PHONE ? 152 : 772 / 9;
          for (let k = 0; k < (PHONE ? 3 : 4); k++) D.flame(PHONE ? q0.x + 118 + k * sp : q0.x + sp * 0.5 + k * 2 * sp, b.bot + 16, 22 * bath.flame, t + k);
        }
      }
      const b0 = lab.bath0;
      if (b0) D.label(VW - 14, PHONE ? 48 : 24, '물중탕 ' + Math.round(bath.temp) + ' °C', { bg: bath.on ? '#dc2626' : '#64748b', size: 13.5, align: 'right' });
    }
    // 안전 안내
    const sy = VH - 29;
    D.roundRect(PHONE ? 8 : 20, sy - 20, VW - (PHONE ? 16 : 40), 40, 12); ctx.fillStyle = '#fff7e0'; ctx.fill(); ctx.strokeStyle = '#f4c66a'; ctx.lineWidth = 2; ctx.stroke();
    if (PHONE) { T(VW / 2, sy - 3, '🥽 보안경 · 🔥 가열 주의 (입구는 사람 반대쪽)', 12.5, '#7c4a00', 'center', 800); T(VW / 2, sy + 13, '🧪 폐액은 따로 모아 처리해요', 12.5, '#7c4a00', 'center', 800); }
    else T(VW / 2, sy + 5, '🥽 보안경을 써요  ·  🔥 가열할 때 시험관 입구를 사람 쪽으로 향하지 않아요  ·  🧪 폐액은 따로 모아서 처리해요', 14, '#7c4a00', 'center', 800);
  }
  function labUpdate(dt) {
    const lab = S.lab, bath = lab.bath;
    bath.timer = Math.max(0, bath.timer - dt); if (bath.on && bath.timer <= 0) bath.on = false;
    bath.flame = approach(bath.flame, bath.on ? 1 : 0, dt, 5);
    bath.temp = approach(bath.temp, bath.on ? 92 : 28, dt, bath.on ? 0.9 : 0.25);
    lab.t.forEach((arr, r) => arr.forEach((t, i) => {
      if (!t.added) return;
      t.dropT += dt;
      t.prog = clamp((t.dropT - 0.5) / 1.3, 0, 1);
      if (r === 1 && bath.on && t.prog > 0.9) t.heat = Math.min(1, t.heat + dt / 4);
    }));
    if (bath.on && Math.random() < dt * 22 && !RM) { const b = lab.bath0; if (b) parts.emit({ x: b.x0 + 20 + Math.random() * (b.x1 - b.x0 - 40), y: b.bot - 4, vx: 0, vy: -50 - Math.random() * 40, life: 0.9, size: 2.5 + Math.random() * 2, color: 'rgba(255,255,255,.9)', shape: 'bubble', fade: true }); }
  }
  const labPT = {
    down(p) {
      for (let i = 0; i < SAMPLES.length; i++) if (tubeHit(p, i)) { S.lab.focus = i; if (labApply(S.lab.r, i, 0)) updateCtl(); return false; }
      return false;
    },
    hover(p) { return SAMPLES.some((s, i) => tubeHit(p, i)) ? 'pointer' : 'default'; },
  };
  /* pointer.down이 true를 돌려주지 않으면 up이 오지 않으므로, 눌렀을 때 바로 적용 */

  /* =========================================================
     결과표 : 시약 결과를 보고 들어 있는 물질을 판정
     ========================================================= */
  const VERD = ['녹말', '환원당', '지질'];
  function tblGeom() {
    if (PHONE) return { x: 8, y: 10, hdr: 56, rh: 52, cs: 78, rc: 54, vc: 62 };
    return { x: 14, y: 14, hdr: 58, rh: 42, cs: 150, rc: 124, vc: 84 };
  }
  function tblCell(p) {
    const g = tblGeom();
    for (let i = 0; i < SAMPLES.length; i++) {
      const y = g.y + g.hdr + i * g.rh;
      if (p.y < y || p.y > y + g.rh) continue;
      const x0 = g.x + g.cs + 3 * g.rc;
      for (let c = 0; c < 3; c++) if (p.x >= x0 + c * g.vc && p.x <= x0 + (c + 1) * g.vc) return { i, c };
    }
    return null;
  }
  function tblDraw(dt, t) {
    const g = tblGeom(), W = g.cs + 3 * g.rc + 3 * g.vc;
    bgFill('#eef4f2', '#e3ece8');
    panel(g.x - (PHONE ? 2 : 0), g.y - 4, W + 4, g.hdr + SAMPLES.length * g.rh + (PHONE ? 74 : 60), 14, '#ffffff');
    const hy = g.y + g.hdr - 16;
    T(g.x + 10, hy, '시료', 14, '#475569', 'left', 800);
    REAG.forEach((rg, c) => D.label(g.x + g.cs + c * g.rc + g.rc / 2, hy - 5, PHONE ? rg.short.slice(0, 3) : rg.short, { bg: rg.col, size: PHONE ? 12.5 : 13.5, pad: 6 }));
    VERD.forEach((v, c) => D.label(g.x + g.cs + 3 * g.rc + c * g.vc + g.vc / 2, hy - 5, v, { bg: '#15803d', size: PHONE ? 12.5 : 13.5, pad: 6 }));
    T(g.x + g.cs + 1.5 * g.rc, g.y + 16, '관찰한 결과', 13, '#64748b', 'center', 700);
    T(g.x + g.cs + 3 * g.rc + 1.5 * g.vc, g.y + 16, PHONE ? '들어 있는 물질' : '들어 있는 물질 (눌러서 표시)', 13, '#64748b', 'center', 700);
    SAMPLES.forEach((s, i) => {
      const y = g.y + g.hdr + i * g.rh;
      if (i % 2 === 0) { ctx.fillStyle = '#f6faf8'; ctx.fillRect(g.x, y, W, g.rh); }
      if (S.tbl.bad[i]) { D.roundRect(g.x + 2, y + 1, W - 4, g.rh - 2, 8); ctx.strokeStyle = '#e2464b'; ctx.lineWidth = 2; ctx.stroke(); }
      const sh = S.tbl.shake[i] > 0 && !RM ? Math.sin(t * 60) * 3 * S.tbl.shake[i] : 0;
      ctx.save(); ctx.translate(sh, 0);
      T(g.x + 10, y + g.rh / 2 + 5, s.n.join(' '), PHONE ? 13 : 14.5, '#26324a', 'left', 800);
      REAG.forEach((rg, c) => {
        const st = S.lab.t[c][i], cx = g.x + g.cs + c * g.rc + g.rc / 2;
        const done = st.added && st.prog > 0.95 && (c !== 1 || st.heat > 0.99);
        if (!done) { T(cx, y + g.rh / 2 + 5, st.added ? '…' : '미검사', PHONE ? 12 : 13, '#94a3b8', 'center', 700); return; }
        let col, txt;
        if (c === 0) { col = s.iod ? IOD_NAVY : IOD_AMB; txt = s.iod ? '청람색' : '황갈색'; }
        else if (c === 1) { col = BEN[s.ben]; txt = ['청색', '녹색', '노랑', '주황', '벽돌색'][s.ben]; }
        else { col = s.sud ? SUD_RED : '#cbd5e1'; txt = ['변화 없음', '조금', '붉은 방울', '붉게'][s.sud]; }
        D.sphere(PHONE ? cx : cx - g.rc * 0.34, y + g.rh / 2, 8.5, col, { gloss: true });
        if (!PHONE) TF(cx - g.rc * 0.34 + 14, y + g.rh / 2 + 5, txt, g.rc * 0.62, 13, 11, '#334155', 'left', 700);
      });
      for (let c = 0; c < 3; c++) {
        const cx = g.x + g.cs + 3 * g.rc + c * g.vc + g.vc / 2, on = S.tbl.v[i][c];
        D.roundRect(cx - g.vc / 2 + 6, y + 5, g.vc - 12, g.rh - 10, 10);
        ctx.fillStyle = on ? (S.tbl.bad[i] ? '#fdeceb' : '#dcfce7') : '#f1f5f9'; ctx.fill();
        ctx.strokeStyle = on ? (S.tbl.bad[i] ? '#e2464b' : '#16a34a') : '#cbd5e1'; ctx.lineWidth = on ? 2.5 : 1.5; ctx.stroke();
        if (on) D.check(cx, y + g.rh / 2, 9, 1, { color: S.tbl.bad[i] ? '#e2464b' : '#16a34a' });
      }
      ctx.restore();
    });
    const by = g.y + g.hdr + SAMPLES.length * g.rh + 22;
    textBlock(g.x + 10, by, W - 20, '변하지 않은 시료는 칸을 비워 둬요. 환원당 = 베네딕트 용액과 가열하면 색이 변하는 당이에요.', PHONE ? 13 : 14, '#475569', 19, 700);
  }
  const tblPT = {
    down(p) {
      const c = tblCell(p); if (!c) return false;
      S.tbl.v[c.i][c.c] = !S.tbl.v[c.i][c.c]; S.tbl.bad[c.i] = false; S.tbl.note = ''; Sound.tick(); updateCtl(); return false;
    },
    hover(p) { return tblCell(p) ? 'pointer' : 'default'; },
  };
  function tblCheck() {
    const bad = [];
    SAMPLES.forEach((s, i) => { const v = S.tbl.v[i]; const wrong = [0, 1, 2].filter((c) => !!v[c] !== !!s.truth[c]); if (wrong.length) bad.push({ i, wrong }); });
    return bad;
  }


  /* =========================================================
     ④ 가상 현미경 : 감자(녹말 알갱이 - 아이오딘), 땅콩(지방 방울 - 수단 Ⅲ), 양파 표피(아이오딘)
     ========================================================= */
  const MIC = PHONE ? { cx: 240, cy: 232, R: 214 } : { cx: 256, cy: 280, R: 240 };
  const FOVS = [1800, 450, 180];            // 시야 지름(µm): ×100, ×400, ×1000
  const MAGS = [100, 400, 1000];
  const SPECS = {
    potato: { name: '감자 단면', stainName: '아이오딘', col: '#4b3bb5' },
    peanut: { name: '땅콩 절편', stainName: '수단 Ⅲ', col: '#e0371a' },
    onion: { name: '양파 표피', stainName: '아이오딘', col: '#a16207' },
  };
  S.mic = { spec: 'potato', zi: 1, sc: 1, px: 0, py: 0, stain: { potato: 0, peanut: 0, onion: 0 }, stainOn: { potato: false, peanut: false, onion: false }, found: { potato: new Set(), peanut: new Set() }, sel: null, dropT: -1, pan: null, flash: [], seenZoom: [false, true, false] };
  S.mic.sc = (2 * MIC.R) / FOVS[1];
  const scOf = (zi) => (2 * MIC.R) / FOVS[zi];
  function hashSeed(a, b, c) { return ((Math.imul(a + 1000, 73856093) ^ Math.imul(b + 1000, 19349663) ^ Math.imul(c, 83492791)) >>> 0); }
  const CELLCACHE = new Map();
  function cellData(spec, ix, iy) {
    const key = spec + ':' + ix + ',' + iy;
    let c = CELLCACHE.get(key); if (c) return c;
    if (CELLCACHE.size > 2500) CELLCACHE.clear();
    const rr = mulberry(hashSeed(ix, iy, spec === 'potato' ? 1 : spec === 'peanut' ? 2 : 3));
    if (spec === 'potato') {
      const cx = ix * 130 + (iy & 1) * 65 + (rr() - 0.5) * 20, cy = iy * 112.6 + (rr() - 0.5) * 20;
      const items = [], n = 2 + Math.floor(rr() * 3);
      for (let k = 0, tries = 0; items.length < n && tries < 40; tries++) {
        const a = 10 + rr() * 20, b = a * (0.58 + rr() * 0.18), d = rr() * (46 - a * 0.9), th = rr() * TAU, ang = rr() * Math.PI;
        const x = cx + Math.cos(th) * d, y = cy + Math.sin(th) * d;
        if (items.every((o) => Math.hypot(o.x - x, o.y - y) > (o.a + a) * 0.92)) { items.push({ k: items.length, x, y, a, b, ang, hx: (rr() - 0.5) * 0.5 }); }
      }
      c = { cx, cy, R: 64, items }; c.hex = true;
    } else if (spec === 'peanut') {
      const cx = ix * 38 + (iy & 1) * 19 + (rr() - 0.5) * 5, cy = iy * 33 + (rr() - 0.5) * 5;
      const items = [], n = 12 + Math.floor(rr() * 6), bodies = [];
      for (let k = 0; k < n; k++) { const th = rr() * TAU, d = Math.sqrt(rr()) * 14; items.push({ k, x: cx + Math.cos(th) * d, y: cy + Math.sin(th) * d, r: 0.55 + rr() * 2.0 }); }
      for (let k = 0; k < 5; k++) { const th = rr() * TAU, d = Math.sqrt(rr()) * 13; bodies.push({ x: cx + Math.cos(th) * d, y: cy + Math.sin(th) * d, r: 1.7 + rr() * 1.4 }); }
      c = { cx, cy, R: 18.5, items, bodies }; c.hex = true;
    } else {
      const cx = ix * 250 + (iy & 1) * 125, cy = iy * 90;
      c = { cx, cy, items: [], nuc: { x: cx + (rr() - 0.5) * 120, y: cy + (rr() - 0.5) * 24, a: 15, b: 10 }, rect: true };
    }
    CELLCACHE.set(key, c); return c;
  }
  function hexPath(cx, cy, R, rot) { ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = rot + i * TAU / 6; const x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); } ctx.closePath(); }
  function micRange(spec, sc) {
    const half = MIC.R / sc + 90, px = S.mic.px, py = S.mic.py;
    if (spec === 'potato') return { ix0: Math.floor((px - half) / 130) - 1, ix1: Math.ceil((px + half) / 130) + 1, iy0: Math.floor((py - half) / 112.6) - 1, iy1: Math.ceil((py + half) / 112.6) + 1 };
    if (spec === 'peanut') return { ix0: Math.floor((px - half) / 38) - 1, ix1: Math.ceil((px + half) / 38) + 1, iy0: Math.floor((py - half) / 33) - 1, iy1: Math.ceil((py + half) / 33) + 1 };
    return { ix0: Math.floor((px - half) / 250) - 1, ix1: Math.ceil((px + half) / 250) + 1, iy0: Math.floor((py - half) / 90) - 1, iy1: Math.ceil((py + half) / 90) + 1 };
  }
  const W2S = (x, y) => ({ x: MIC.cx + (x - S.mic.px) * S.mic.sc, y: MIC.cy + (y - S.mic.py) * S.mic.sc });
  const foundKey = (ix, iy, k) => ix + ',' + iy + ',' + k;

  /* 낮은 배율 땅콩 세포 무늬 (한 칸을 만들어 두고 반복) */
  const PEA = { key: '', pat: null };
  function peaPattern(sc, st) {
    const key = sc.toFixed(3) + '|' + st.toFixed(2);
    if (PEA.key === key && PEA.pat) return PEA.pat;
    const W = Math.max(8, Math.round(38 * sc * 4)), H = Math.max(8, Math.round(66 * sc * 4));
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d'); g.scale(W / 38, H / 66);
    g.fillStyle = C.rgba(C.mix('#faf1d2', '#f0a48a', st * 0.55), 1); g.fillRect(-2, -2, 44, 70);
    g.strokeStyle = 'rgba(150,128,84,.8)'; g.lineWidth = Math.max(1.2, 1.2 / sc); g.lineJoin = 'round';
    for (let iy = -1; iy <= 3; iy++) for (let ix = -1; ix <= 2; ix++) {
      const x = ix * 38 + (iy & 1) * 19, y = iy * 33;
      g.beginPath(); for (let k = 0; k < 6; k++) { const ang = Math.PI / 6 + k * TAU / 6, px = x + Math.cos(ang) * 18.5, py = y + Math.sin(ang) * 18.5; if (k) g.lineTo(px, py); else g.moveTo(px, py); } g.closePath(); g.stroke();
    }
    const pat = ctx.createPattern(c, 'repeat');
    if (pat.setTransform && typeof DOMMatrix !== 'undefined') pat.setTransform(new DOMMatrix([38 * sc / W, 0, 0, 66 * sc / H, 0, 0]));
    PEA.key = key; PEA.pat = pat; return pat;
  }
  function micDraw(dt, t) {
    const m = S.mic, sp = m.spec, sc = m.sc, st = m.stain[sp];
    bgFill('#2b303c', '#1d212b');
    ctx.save();
    ctx.beginPath(); ctx.arc(MIC.cx, MIC.cy, MIC.R, 0, TAU); ctx.clip();
    ctx.fillStyle = sp === 'onion' ? C.mix('#fbfaf3', '#f2e3b0', st * 0.7) : sp === 'peanut' ? '#fbf6e6' : '#fcfbf6'; ctx.fillRect(MIC.cx - MIC.R, MIC.cy - MIC.R, MIC.R * 2, MIC.R * 2);
    const rg = micRange(sp, sc);
    const wallW = clamp(2.4 * sc, 1, 3.4);
    const foundSet = m.found[sp];
    const vis = [];   // 보이는 세포 [cell, 화면좌표]
    const lowPea = sp === 'peanut' && sc < 0.5;
    if (lowPea) {
      // 낮은 배율의 땅콩: 세포가 수천 개라서 한 칸 무늬를 반복해서 그려요
      const pat = peaPattern(sc, st), ox = MIC.cx - m.px * sc, oy = MIC.cy - m.py * sc;
      ctx.save(); ctx.translate(ox, oy); ctx.fillStyle = pat; ctx.fillRect(MIC.cx - MIC.R - ox, MIC.cy - MIC.R - oy, MIC.R * 2, MIC.R * 2); ctx.restore();
    } else {
      for (let iy = rg.iy0; iy <= rg.iy1; iy++) for (let ix = rg.ix0; ix <= rg.ix1; ix++) {
        const c = cellData(sp, ix, iy), p = W2S(c.cx, c.cy);
        if (Math.hypot(p.x - MIC.cx, p.y - MIC.cy) > MIC.R + (c.R || 130) * sc) continue;
        vis.push(c, p, ix, iy);
      }
      if (sp === 'onion') {
        for (let v = 0; v < vis.length; v += 4) {
          const c = vis[v], p = vis[v + 1], w = 250 * sc, h = 90 * sc;
          D.roundRect(p.x - w / 2 + 1, p.y - h / 2 + 1, w - 2, h - 2, 6 * sc); ctx.fillStyle = C.rgba(C.mix('#f9f6e8', '#f3df98', st * 0.85), 0.85); ctx.fill();
          ctx.strokeStyle = 'rgba(130,120,80,.8)'; ctx.lineWidth = wallW; ctx.stroke();
          const nu = W2S(c.nuc.x, c.nuc.y);
          ctx.fillStyle = C.mix('#b8c0bd', '#8a5a14', st); ctx.beginPath(); ctx.ellipse(nu.x, nu.y, c.nuc.a * sc, c.nuc.b * sc, 0, 0, TAU); ctx.fill();
          if (sc > 0.9) { ctx.strokeStyle = 'rgba(80,70,40,.5)'; ctx.lineWidth = 1; ctx.stroke(); }
        }
      } else {
        ctx.beginPath();
        for (let v = 0; v < vis.length; v += 4) { const c = vis[v], p = vis[v + 1]; for (let k = 0; k < 6; k++) { const ang = Math.PI / 6 + k * TAU / 6, px = p.x + Math.cos(ang) * c.R * sc, py = p.y + Math.sin(ang) * c.R * sc; if (k) ctx.lineTo(px, py); else ctx.moveTo(px, py); } ctx.closePath(); }
        ctx.fillStyle = sp === 'potato' ? C.rgba(C.mix('#f6f1df', '#ead9a3', st * 0.35), 0.8) : C.rgba('#faf1d2', 0.65); ctx.fill();
        ctx.strokeStyle = 'rgba(150,128,84,.72)'; ctx.lineWidth = wallW; ctx.lineJoin = 'round'; ctx.stroke();
      }
    }
    // 알갱이 · 방울
    if (sp === 'potato' && vis.length) {
      if (sc < 0.6) {
        ctx.beginPath();
        for (let v = 0; v < vis.length; v += 4) vis[v].items.forEach((g) => { const q = W2S(g.x, g.y), a = Math.max(1.4, g.a * sc), b = Math.max(1, g.b * sc); ctx.moveTo(q.x + a * Math.cos(g.ang), q.y + a * Math.sin(g.ang)); ctx.ellipse(q.x, q.y, a, b, g.ang, 0, TAU); });
        ctx.fillStyle = C.rgba(C.mix('#e9e6dc', '#3f33a0', st), 0.4 + 0.6 * st); ctx.fill();
      } else {
        for (let v = 0; v < vis.length; v += 4) {
          const ix = vis[v + 2], iy = vis[v + 3];
          vis[v].items.forEach((g) => {
            const p = W2S(g.x, g.y), a = g.a * sc, b = g.b * sc;
            if (p.x < MIC.cx - MIC.R - a || p.x > MIC.cx + MIC.R + a || p.y < MIC.cy - MIC.R - a || p.y > MIC.cy + MIC.R + a) return;
            ctx.strokeStyle = 'rgba(205,175,95,.45)'; ctx.lineWidth = Math.max(1, 1.2 * sc); ctx.beginPath(); ctx.ellipse(p.x, p.y, a + 2.4 * sc, b + 2.4 * sc, g.ang, 0, TAU); ctx.stroke();
            if (st < 0.98) { ctx.globalAlpha = 1 - st; ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.strokeStyle = 'rgba(120,120,105,.30)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(p.x, p.y, a, b, g.ang, 0, TAU); ctx.fill(); ctx.stroke(); }
            if (st > 0.01) {
              ctx.globalAlpha = st;
              ctx.fillStyle = '#3f33a0'; ctx.beginPath(); ctx.ellipse(p.x, p.y, a, b, g.ang, 0, TAU); ctx.fill();
              ctx.fillStyle = '#6a5bd0'; ctx.beginPath(); ctx.ellipse(p.x - Math.cos(g.ang) * a * 0.12 - Math.sin(g.ang) * b * 0.15, p.y - Math.sin(g.ang) * a * 0.12 + Math.cos(g.ang) * b * 0.15 * -1, a * 0.78, b * 0.72, g.ang, 0, TAU); ctx.fill();
              if (sc > 1.6) { ctx.strokeStyle = 'rgba(190,180,255,.28)'; ctx.lineWidth = 1; for (let q = 1; q <= 3; q++) { ctx.beginPath(); ctx.ellipse(p.x, p.y, a * (0.25 + q * 0.2), b * (0.25 + q * 0.2), g.ang, 0, TAU); ctx.stroke(); } }
              ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.beginPath(); ctx.ellipse(p.x - a * 0.35, p.y - b * 0.4, a * 0.25, b * 0.14, g.ang - 0.2, 0, TAU); ctx.fill();
            }
            ctx.globalAlpha = 1;
            if (foundSet.has(foundKey(ix, iy, g.k))) { ctx.strokeStyle = '#16a34a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(p.x, p.y, a + 6, 0, TAU); ctx.stroke(); D.check(p.x + a + 5, p.y - a - 5, 8, 1); }
          });
        }
      }
    } else if (sp === 'peanut' && !lowPea && vis.length) {
      // 회색빛 알갱이 (지방이 아님)
      ctx.beginPath();
      for (let v = 0; v < vis.length; v += 4) vis[v].bodies.forEach((bd) => { const q = W2S(bd.x, bd.y), r = bd.r * sc; if (r < 0.8) return; ctx.moveTo(q.x + r, q.y); ctx.arc(q.x, q.y, r, 0, TAU); });
      ctx.fillStyle = 'rgba(190,186,150,.55)'; ctx.fill();
      // 지방 방울: 염색 전(옅은 노랑)과 염색 후(붉은색)를 한 번에 그려요
      if (st < 0.98) { ctx.beginPath(); for (let v = 0; v < vis.length; v += 4) vis[v].items.forEach((g) => { const q = W2S(g.x, g.y), r = Math.max(1.3, g.r * sc); ctx.moveTo(q.x + r, q.y); ctx.arc(q.x, q.y, r, 0, TAU); }); ctx.globalAlpha = 1 - st * 0.9; ctx.fillStyle = 'rgba(250,224,140,.55)'; ctx.fill(); ctx.globalAlpha = 1; }
      if (st > 0.01) { ctx.beginPath(); for (let v = 0; v < vis.length; v += 4) vis[v].items.forEach((g) => { const q = W2S(g.x, g.y), r = Math.max(1.3, g.r * sc); ctx.moveTo(q.x + r, q.y); ctx.arc(q.x, q.y, r, 0, TAU); }); ctx.globalAlpha = st; ctx.fillStyle = '#e0371a'; ctx.fill(); ctx.globalAlpha = 1; }
      for (let v = 0; v < vis.length; v += 4) {
        const ix = vis[v + 2], iy = vis[v + 3];
        vis[v].items.forEach((g) => { if (!foundSet.has(foundKey(ix, iy, g.k))) return; const p = W2S(g.x, g.y), r = Math.max(1.3, g.r * sc); ctx.strokeStyle = '#16a34a'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(8, r + 5), 0, TAU); ctx.stroke(); });
      }
    }
    // 방금 누른 곳 표시
    m.flash.forEach((f) => { const a = 1 - f.age / 0.7; ctx.strokeStyle = f.ok ? 'rgba(22,163,74,' + a + ')' : 'rgba(226,70,75,' + a + ')'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(f.x, f.y, 10 + f.age * 40, 0, TAU); ctx.stroke(); });
    // 떨어지는 시약 방울
    if (m.dropT >= 0 && m.dropT < 0.6) { const k = m.dropT / 0.6; D.sphere(MIC.cx, lerp(MIC.cy - MIC.R + 10, MIC.cy, k * k), 9, SPECS[sp].col, { gloss: true }); }
    // 비네팅
    const vg = ctx.createRadialGradient(MIC.cx, MIC.cy, MIC.R * 0.8, MIC.cx, MIC.cy, MIC.R); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.22)'); ctx.fillStyle = vg; ctx.fillRect(MIC.cx - MIC.R, MIC.cy - MIC.R, MIC.R * 2, MIC.R * 2);
    ctx.restore();
    ctx.beginPath(); ctx.arc(MIC.cx, MIC.cy, MIC.R, 0, TAU); ctx.strokeStyle = '#0f131b'; ctx.lineWidth = 6; ctx.stroke(); ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 2; ctx.stroke();
    // 눈금자 (마이크로미터)
    const nice = [10, 20, 50, 100, 200, 500]; let bl = nice[0]; nice.forEach((n) => { if (n * sc >= 38 && n * sc <= 140 && bl * sc < 38) bl = n; }); nice.forEach((n) => { if (n * sc >= 38 && n * sc <= 140) bl = n; });
    const bx = MIC.cx - MIC.R * 0.62, by = MIC.cy + MIC.R * 0.82;
    D.roundRect(bx - 12, by - 22, bl * sc + 24, 40, 10); ctx.fillStyle = 'rgba(255,255,255,.88)'; ctx.fill();
    ctx.fillStyle = '#111827'; ctx.fillRect(bx, by - 2, bl * sc, 5); ctx.fillRect(bx, by - 8, 2, 17); ctx.fillRect(bx + bl * sc - 2, by - 8, 2, 17);
    T(bx + bl * sc / 2, by - 10, bl + ' µm', 13, '#111827', 'center', 800);
    // 오른쪽(또는 아래) 정보 패널
    const P = PHONE ? { x: 10, y: 462, w: 460, h: 170 } : { x: MIC.cx + MIC.R + 18, y: 14, w: VW - (MIC.cx + MIC.R + 18) - 14, h: VH - 28 };
    panel(P.x, P.y, P.w, P.h, 16, '#ffffff');
    let y = P.y + 30; const x = P.x + 16, w = P.w - 32, fs = PHONE ? 14 : 15, lh = PHONE ? 19 : 21;
    T(x, y, SPECS[sp].name, PHONE ? 17 : 19, '#14532d', 'left', 800); y += PHONE ? 22 : 26;
    T(x, y, '배율 ×' + MAGS[m.zi] + '  ·  시야 지름 약 ' + FOVS[m.zi] + ' µm', fs - 1, '#475569', 'left', 700); y += lh + 4;
    const stainTxt = st > 0.9 ? SPECS[sp].stainName + ' 염색 후' : st > 0.05 ? '염색 중…' : '염색 전 (무색에 가까워요)';
    D.label(x, y + 2, stainTxt, { bg: st > 0.9 ? SPECS[sp].col : '#64748b', size: 13, align: 'left' }); y += lh + 12;
    if (sp === 'potato') { textBlock(x, y, w, '녹말 알갱이는 색소체 안에 있고, 타원 모양에 길이는 약 20~60 µm예요.', fs - 1, '#334155', lh - 2, 700); }
    else if (sp === 'peanut') { textBlock(x, y, w, '지방 방울은 세포질에 흩어져 있고, 지름은 약 1~5 µm예요. 회색빛 알갱이는 지방이 아니에요.', fs - 1, '#334155', lh - 2, 700); }
    else { textBlock(x, y, w, '양파 표피 세포에는 녹말 알갱이가 거의 없어요. 아이오딘을 떨어뜨려도 청자색 알갱이가 보이지 않아요.', fs - 1, '#334155', lh - 2, 700); }
    if (!PHONE) { y = P.y + 190; D.roundRect(x - 4, y - 4, w + 8, 112, 12); ctx.fillStyle = '#f4faf6'; ctx.fill(); T(x + 6, y + 18, '🔍 현미경 사용 순서', 14, '#14532d', 'left', 800); textBlock(x + 6, y + 40, w - 8, '① 낮은 배율(×100)로 시료를 찾아요. ② 높은 배율(×400)로 바꿔 자세히 봐요. ③ 슬라이드를 끌어 옮겨요.', 13, '#475569', 17.5, 700); }
    y = P.y + P.h - (PHONE ? 42 : 112);
    if (sp !== 'onion') {
      const need = 3, fc = m.found[sp].size;
      T(x, y, (sp === 'potato' ? '찾은 녹말 알갱이 ' : '찾은 지방 방울 ') + Math.min(fc, need) + ' / ' + need, PHONE ? 15 : 16, fc >= need ? '#15803d' : '#1f2d44', 'left', 800);
      if (!PHONE) { y += 26; for (let k = 0; k < need; k++) { ctx.fillStyle = k < fc ? '#16a34a' : '#e2e8f0'; ctx.beginPath(); ctx.arc(x + 12 + k * 30, y, 11, 0, TAU); ctx.fill(); if (k < fc) D.check(x + 12 + k * 30, y, 8, 1); } }
    }
    if (m.sel && !PHONE) { y = P.y + P.h - 56; textBlock(x, y, w, m.sel, 13.5, '#7c2d12', 18, 800); }
    else if (m.sel && PHONE) { textBlock(x, P.y + P.h - 18, w, m.sel, 13, '#7c2d12', 17, 800); }
    if (m.msg) { D.label(MIC.cx, MIC.cy - MIC.R - 0 + 26, m.msg, { bg: 'rgba(15,19,27,.82)', size: 13, pad: 10 }); }
  }
  function micUpdate(dt) {
    const m = S.mic;
    m.sc = RM ? scOf(m.zi) : approach(m.sc, scOf(m.zi), dt, 7);
    if (m.dropT >= 0) { m.dropT += dt; if (m.dropT > 0.9) m.dropT = -1; }
    const sp = m.spec;
    const dropping = m.dropT >= 0 && m.dropT < 0.55;
    const target = m.stainOn[sp] ? (dropping ? m.stain[sp] : 1) : 0;
    m.stain[sp] = approach(m.stain[sp], target, dt, RM ? 60 : 1.3);
    m.flash.forEach((f) => { f.age += dt; }); m.flash = m.flash.filter((f) => f.age < 0.7);
    if (m.msgT > 0) { m.msgT -= dt; if (m.msgT <= 0) m.msg = ''; }
  }
  function micMsg(s) { S.mic.msg = s; S.mic.msgT = 2.4; }
  function micStainToggle() {
    const m = S.mic, sp = m.spec;
    if (m.stainOn[sp]) { m.stainOn[sp] = false; Sound.click(); }
    else { m.stainOn[sp] = true; m.dropT = 0; Sound.tick(); }
    updateCtl();
  }
  function micSetSpec(sp) { const m = S.mic; if (m.spec === sp) return; m.spec = sp; m.px = 0; m.py = 0; m.sel = null; m.msg = ''; Sound.click(); updateCtl(); }
  function micSetZoom(zi) { S.mic.zi = zi; Sound.click(); updateCtl(); }
  function micTap(p) {
    const m = S.mic, sp = m.spec, sc = m.sc;
    const wx = m.px + (p.x - MIC.cx) / sc, wy = m.py + (p.y - MIC.cy) / sc;
    if (Math.hypot(p.x - MIC.cx, p.y - MIC.cy) > MIC.R) return;
    if (sp === 'onion') { m.flash.push({ x: p.x, y: p.y, age: 0, ok: false }); m.sel = '양파는 녹말 알갱이가 거의 없어요. (저장 탄수화물이 녹말이 아니에요)'; micMsg('청자색 알갱이가 보이지 않아요'); return; }
    const rg = micRange(sp, sc); let best = null, bd = 1e9;
    for (let iy = rg.iy0; iy <= rg.iy1; iy++) for (let ix = rg.ix0; ix <= rg.ix1; ix++) {
      const c = cellData(sp, ix, iy);
      c.items.forEach((g) => {
        const q = W2S(g.x, g.y), rpx = (sp === 'potato' ? g.a : g.r) * sc, hit = Math.max(sp === 'potato' ? rpx : 0, sp === 'potato' ? 12 : 12);
        const d = Math.hypot(p.x - q.x, p.y - q.y);
        if (d <= hit && d < bd) { bd = d; best = { ix, iy, g }; }
      });
    }
    if (m.stain[sp] < 0.9) { m.flash.push({ x: p.x, y: p.y, age: 0, ok: false }); micMsg('염색 전에는 잘 보이지 않아요. 먼저 💧 염색해 보세요'); return; }
    if (m.zi < 1) { m.flash.push({ x: p.x, y: p.y, age: 0, ok: false }); micMsg('배율을 ×400 이상으로 높여서 찾아요'); return; }
    if (!best) { m.flash.push({ x: p.x, y: p.y, age: 0, ok: false }); micMsg(sp === 'potato' ? '청자색 타원 알갱이를 눌러요' : '붉은 방울을 눌러요'); return; }
    const key = foundKey(best.ix, best.iy, best.g.k), q = W2S(best.g.x, best.g.y);
    m.flash.push({ x: q.x, y: q.y, age: 0, ok: true });
    if (sp === 'potato') m.sel = '녹말 알갱이 길이 약 ' + Math.round(best.g.a * 2) + ' µm (색소체 안)'; else m.sel = '지방 방울 지름 약 ' + (Math.round(best.g.r * 2 * 10) / 10).toFixed(1) + ' µm (세포질)';
    if (!m.found[sp].has(key)) { m.found[sp].add(key); parts.burst(q.x, q.y, { count: 14, speed: 130, colors: ['#16a34a', '#fbbf24', '#8b5cf6'] }); Sound.success(); }
    else Sound.tick();
  }
  const micPT = {
    down(p) {
      if (Math.hypot(p.x - MIC.cx, p.y - MIC.cy) > MIC.R) return false;
      S.mic.pan = { sx: p.x, sy: p.y, px0: S.mic.px, py0: S.mic.py, moved: false }; return true;
    },
    move(p) {
      const a = S.mic.pan; if (!a) return;
      if (Math.hypot(p.x - a.sx, p.y - a.sy) > 7) a.moved = true;
      if (a.moved) { S.mic.px = clamp(a.px0 - (p.x - a.sx) / S.mic.sc, -2500, 2500); S.mic.py = clamp(a.py0 - (p.y - a.sy) / S.mic.sc, -2500, 2500); }
    },
    up(p) { const a = S.mic.pan; S.mic.pan = null; if (a && !a.moved) micTap(p); },
    hover(p) { return Math.hypot(p.x - MIC.cx, p.y - MIC.cy) <= MIC.R ? 'grab' : 'default'; },
  };


  /* =========================================================
     화면 전환 · 조작 연결
     ========================================================= */
  const MODE_NAMES = { blocks: '🧱 블록 상자', sort: '🗂 분류 카드', energy: '⚖ 에너지 저장', match: '🔗 기능 연결', lab: '🧪 실험대', table: '📋 결과표', micro: '🔬 현미경' };
  function setMode(m, sub) {
    if (m === 'blocks' && sub) S.sub = sub;
    if (S.mode !== m) S.fade = 1;
    S.mode = m;
    PT = m === 'blocks' ? (S.sub === 'carb' ? carbPT : lipPT) : m === 'sort' ? sortPT : m === 'match' ? matchPT : m === 'lab' ? labPT : m === 'table' ? tblPT : m === 'micro' ? micPT : null;
    hideHint(); updateCtl();
  }
  const ctlNodes = $$('#ctrlCard .control');
  function updateCtl() {
    const fr = game ? game.free : false, lvNow = game ? game.level : 0;
    ctlNodes.forEach((n) => {
      const modes = (n.dataset.modes || '').split(' '); let on = modes.indexOf(S.mode) >= 0;
      if (on && n.dataset.sub) on = n.dataset.sub === S.sub;
      n.hidden = !on;
    });
    modeButtons(S.mode, lvNow, fr);
    chipSet($('#subSeg'), S.sub);
    chipSet($('#shapeSel'), S.carb.shape);
    const n = chainOf().length;
    $$('#shapeSel button').forEach((b) => { b.disabled = b.dataset.v !== 'line' && n < 5; });
    $('#carbNote').innerHTML = n < 5 ? '고리를 <b>5개 이상</b> 이으면 다당류 모양을 바꿔 볼 수 있어요. (지금 ' + n + '개)' : '같은 포도당 고리라도 <b>이어진 모양</b>이 다르면 쓰임이 달라져요.';
    chipSet($('#lipSel'), S.lip.type);
    const pl = S.lip.type === 'pl', done = lipDone();
    $('#lipWater').hidden = !pl; $('#lipWater').disabled = !done; $('#lipWater').textContent = S.lip.waterOn ? '↩ 물에서 꺼내기' : '💧 물에 넣어 보기';
    $('#lipNote').innerHTML = ({ tg: '꼬리 <b>3개</b>를 글리세롤에 연결해요. 연결할 때마다 물 1분자가 빠져나가요.', pl: pl && !done ? '머리 <b>1개</b>와 꼬리 <b>2개</b>를 연결해요.' : pl ? '완성했어요! <b>물에 넣어</b> 인지질이 어떻게 모이는지 봐요.' : '', st: '스테로이드는 <b>고리 4개</b>가 붙은 모양이에요.', wx: '왁스는 식물 잎 표면을 덮어 물이 새는 것을 막아요.' })[S.lip.type];
    $('#lipReset').hidden = !(S.lip.type === 'tg' || S.lip.type === 'pl');
    // 에너지
    $('#oEnergy').textContent = S.en.E + ' kcal';
    // 실험
    $$('#reagSel button').forEach((b) => { b.classList.toggle('on', +b.dataset.v === S.lab.r); const rr = +b.dataset.v; b.classList.toggle('seen', labAdded(rr) === 9); });
    $('#labAll').textContent = '💧 ' + REAG[S.lab.r].short + ' 9개 모두 넣기';
    $('#labAll').disabled = labAdded(S.lab.r) === 9;
    $('#labHeat').hidden = S.lab.r !== 1;
    $('#labHeat').disabled = S.lab.bath.on;
    $('#labHeat').textContent = S.lab.bath.on ? '🔥 가열하는 중…' : '🔥 물중탕으로 가열하기';
    $('#labNote').innerHTML = ({ 0: '시험관을 <b>눌러서</b> 아이오딘 용액을 한 방울 넣어요. 녹말이 있으면 색이 변해요.', 1: '시험관을 눌러 베네딕트 용액(청색)을 넣고 <b>가열</b>해요. 환원당이 있으면 색이 단계적으로 변해요.', 2: '시험관을 눌러 수단 Ⅲ 용액을 넣어요. 지질은 붉은 주황색으로 염색돼요.' })[S.lab.r];
    // 현미경
    chipSet($('#specSel'), S.mic.spec); chipSet($('#zoomSel'), S.mic.zi);
    $('#stainBtn').textContent = S.mic.stainOn[S.mic.spec] ? '↩ 염색 전 모습 보기' : '💧 ' + SPECS[S.mic.spec].stainName + ' 용액 떨어뜨리기';
    $('#micNote').innerHTML = '슬라이드를 <b>끌어서</b> 옮기고, 염색한 뒤 <b>×400 이상</b>에서 알갱이를 눌러 찾아요.';
  }
  bindModeSeg((m) => setMode(m, m === 'blocks' ? S.sub : undefined));
  $$('#subSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.sub = b.dataset.v; setMode('blocks'); }));
  $$('#shapeSel button').forEach((b) => b.addEventListener('click', () => setShape(b.dataset.v)));
  $('#carbReset').addEventListener('click', () => { Sound.click(); carbReset(); });
  $$('#lipSel button').forEach((b) => b.addEventListener('click', () => setLipType(b.dataset.v)));
  $('#lipWater').addEventListener('click', () => lipSetWater(!S.lip.waterOn));
  $('#lipReset').addEventListener('click', () => { Sound.click(); lipReset(); });
  $('#sEnergy').addEventListener('input', (e) => { S.en.E = +e.target.value; updateCtl(); });
  $$('#reagSel button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.lab.r = +b.dataset.v; updateCtl(); }));
  $('#labAll').addEventListener('click', () => labApplyAll(S.lab.r));
  $('#labHeat').addEventListener('click', labHeat);
  $$('#specSel button').forEach((b) => b.addEventListener('click', () => micSetSpec(b.dataset.v)));
  $$('#zoomSel button').forEach((b) => b.addEventListener('click', () => micSetZoom(+b.dataset.v)));
  $('#stainBtn').addEventListener('click', micStainToggle);
  $('#sortReset').addEventListener('click', () => { Sound.click(); sorter.reset(); });
  $('#matchReset').addEventListener('click', () => { Sound.click(); matcher.reset(); });
  ['inCarb', 'inFat'].forEach((id) => $('#' + id).addEventListener('input', () => { const o = energyCalcOk(); $('#inCarb').classList.toggle('ok', o.c); $('#inFat').classList.toggle('ok', o.f); }));

  function resetBuild() {
    carbReset(); S.carb.di = false; S.carb.poly = false; S.carb.shapes = { helix: false, branch: false, bundle: false };
    S.lip.tgDone = false; S.lip.plDone = false; S.lip.waterSeen = false; S.lip.waterOn = false; S.lip.water = 0; S.lip.stSeen = false; S.lip.wxSeen = false;
    S.lip.type = 'tg'; lipBuild(); FX.clear();
  }

  /* =========================================================
     미션
     ========================================================= */
  const levels = [
    {
      title: '종류와 구조', short: '종류와 구조', icon: '🧱', phase: '모형',
      intro: '<p class="si-q">❓ 탐구 질문: 감자와 땅콩 속에는 어떤 물질이 들어 있고, 어떻게 알아낼 수 있을까?</p><p>🔗 <b>통합과학·생명과학</b>에서 탄수화물, 단백질, 지질, 핵산이 생명체를 이루는 기본 물질이라고 배웠어요. 이 차시에서는 탄수화물과 지질의 <b>종류와 기능</b>을 알아보고, 시약과 현미경으로 <b>직접 확인</b>해 봐요.</p><p>💡 화학식 대신 <b>고리 · 사슬 · 막대 블록</b>으로 간단하게 나타내요.</p>',
      features: ['blocks', 'sort'],
      setup() { setMode('blocks', 'carb'); },
      recap: '탄수화물은 단당류 · 이당류 · 다당류로, 지질은 중성 지방 · 인지질 · 스테로이드 · 왁스로 나뉘어요. 같은 포도당 단위체라도 이어진 모양이 달라 녹말 · 글리코젠 · 셀룰로스의 쓰임이 달라요.',
      summary: '<ul><li><b>탄수화물</b>: 단당류(포도당 · 과당 · 갈락토스, 고리 1개) → 이당류(엿당 · 설탕 · 젖당, 고리 2개) → 다당류(녹말 · 글리코젠 · 셀룰로스, 고리 수백~수천 개). 단위체가 <b>물이 빠지며</b> 연결돼요.</li><li>다당류 모양: 녹말은 <b>나선</b>, 글리코젠은 <b>가지가 많은</b> 모양, 셀룰로스는 <b>곧은 가닥이 다발</b>로 모여요. 단위체는 모두 포도당이에요.</li><li><b>지질</b>: 중성 지방(글리세롤 1 + 지방산 3), 인지질(머리 1 + 꼬리 2, 머리는 물을 좋아하고 꼬리는 싫어함), 스테로이드(고리 4개: 콜레스테롤 · 성호르몬), 왁스(잎 표면의 큐티클).</li></ul>',
      missions: [
        {
          id: 'build', title: '고리 · 지질 블록 조립',
          goal: '<b>탄수화물</b>: 이당류와 다당류(5개 이상)를 만들고 세 모양을 모두 보세요. <b>지질</b>: 중성 지방과 인지질을 만들고 인지질을 물에 넣어 보세요.',
          hint: '탄수화물에서 고리를 2개, 그다음 5개 이상 이은 뒤 녹말 · 글리코젠 · 셀룰로스 버튼을 눌러요. 지질에서는 조각을 모두 글리세롤에 연결해요.',
          setup() { resetBuild(); setMode('blocks', 'carb'); },
          check: () => S.carb.di && S.carb.poly && S.carb.shapes.helix && S.carb.shapes.branch && S.carb.shapes.bundle && S.lip.tgDone && S.lip.plDone && S.lip.waterSeen, hold: 0.6,
          status: () => [mark(S.carb.di) + ' 이당류', mark(S.carb.poly) + ' 다당류', mark(S.carb.shapes.helix && S.carb.shapes.branch && S.carb.shapes.bundle) + ' 세 모양', mark(S.lip.tgDone) + ' 중성 지방', mark(S.lip.plDone) + ' 인지질', mark(S.lip.waterSeen) + ' 물에 넣기'].join(' &nbsp; '),
          explain: '단당류 고리가 <b>물이 빠지며</b> 연결되면 이당류, 더 많이 이어지면 다당류가 돼요. 녹말 · 글리코젠 · 셀룰로스는 모두 포도당이 단위체지만 <b>이어진 모양</b>이 달라요. 중성 지방은 글리세롤에 지방산 꼬리 3개가, 인지질은 머리 1개와 꼬리 2개가 붙은 것이고, 인지질은 물속에서 머리는 바깥, 꼬리는 안쪽으로 모여요.',
        },
        {
          id: 'sort', title: '탄수화물과 지질 분류', manual: true,
          goal: '카드 8장을 알맞은 상자에 넣어 <b>세부 종류</b>를 분류하세요.',
          hint: '고리가 1개면 단당류, 2개면 이당류, 아주 많이 이어지면 다당류예요. 지질은 꼬리 수와 고리 모양으로 구분해요.',
          setup() { setMode('sort'); sorter.reset(); },
          check() {
            if (sorter.placed < 8) { sorter.markBad([]); return '카드를 모두 상자에 넣어 주세요. (' + sorter.placed + ' / 8)'; }
            const w = sortWrong();
            if (!w.length) { sorter.markBad([]); return true; }
            sorter.markBad(w.map((c) => c.id));
            return KIND[w[0].id][0] + (josa(KIND[w[0].id][0], '은', '는')) + ' 그 상자가 아니에요. ' + KIND[w[0].id][2];
          },
          explain: '포도당은 <b>단당류</b>, 설탕은 <b>이당류</b>, 녹말 · 글리코젠 · 셀룰로스는 <b>다당류</b>예요. 중성 지방 · 인지질 · 콜레스테롤은 지질로, 각각 <b>중성 지방 · 인지질 · 스테로이드</b>에 속해요.',
        },
        {
          type: 'quiz', title: '같은 포도당, 다른 다당류',
          goal: '녹말과 셀룰로스는 둘 다 <b>포도당</b>으로 이루어져 있는데 모양과 쓰임이 달라요. 그 까닭은?',
          setup() { setMode('blocks', 'carb'); },
          choices: ['단위체의 종류가 서로 다르기 때문이다', '포도당이 연결되는 방식과 사슬이 이루는 모양이 다르기 때문이다', '녹말에서만 연결될 때 물이 빠져나가기 때문이다', '셀룰로스는 탄수화물이 아니라 지질이기 때문이다'],
          answer: 1,
          feedback: ['둘 다 단위체는 포도당이에요.', '', '다당류는 모두 단위체가 연결될 때 물이 빠져나가요.', '셀룰로스도 포도당이 이어진 탄수화물(다당류)이에요.'],
          explain: '녹말(나선) · 글리코젠(가지) · 셀룰로스(곧은 가닥 다발)는 모두 포도당이 단위체지만 <b>연결 방식과 사슬 모양</b>이 달라서 쓰임이 달라요. 녹말과 글리코젠은 에너지 저장, 셀룰로스는 식물 세포벽을 이뤄요.',
        },
      ],
    },
    {
      title: '주요 기능', short: '주요 기능', icon: '⚖️', phase: '설명',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 탄수화물과 지질의 종류와 구조를 블록으로 만들었어요.</div><p>이제 이 물질들이 <b>무슨 일을 하는지</b> 알아봐요. 먼저 에너지를 저장하는 데 필요한 질량을 비교하고, 기능 카드를 알맞은 물질과 연결해요.</p>',
      features: ['energy', 'match'],
      setup() { setMode('energy'); },
      recap: '탄수화물은 에너지원(1 g당 약 4 kcal)이자 저장(녹말 · 글리코젠)과 구조(셀룰로스) 물질이고, 중성 지방은 1 g당 약 9 kcal로 장기 에너지 저장 · 단열을 해요. 인지질은 세포막, 스테로이드는 호르몬과 막의 재료예요.',
      summary: '<ul><li><b>탄수화물</b>: 에너지원(1 g당 약 4 kcal), 에너지 저장(식물 <b>녹말</b>, 동물 간 · 근육 <b>글리코젠</b>), 구조(식물 세포벽의 <b>셀룰로스</b>).</li><li><b>중성 지방</b>: 1 g당 약 9 kcal로 탄수화물의 약 2.25배 → 같은 에너지를 더 가볍게 저장하는 <b>장기 에너지 저장</b>, 단열 · 충격 흡수.</li><li><b>인지질</b>은 세포막의 기본 뼈대(이중층), <b>스테로이드</b>는 호르몬(성호르몬)과 막 구성(콜레스테롤)에 쓰여요.</li><li>1000 kcal 저장: 탄수화물 250 g, 중성 지방 약 111 g.</li></ul>',
      missions: [
        {
          id: 'energy', title: '같은 에너지, 다른 질량',
          goal: '저장할 에너지를 <b>1000 kcal</b>로 맞추고, 필요한 질량을 계산해 입력하세요. (1 g당 탄수화물 약 4 kcal, 중성 지방 약 9 kcal)',
          hint: '질량 = 저장할 에너지 / 1 g당 에너지. 중성 지방은 1000 / 9 = 111.1 이니까 소수 첫째 자리에서 반올림해요.',
          setup() { setMode('energy'); S.en.E = 600; $('#sEnergy').value = 600; $('#inCarb').value = ''; $('#inFat').value = ''; $('#inCarb').classList.remove('ok'); $('#inFat').classList.remove('ok'); updateCtl(); },
          check: () => { const o = energyCalcOk(); return o.c && o.f; }, hold: 0.5,
          status: () => { const o = energyCalcOk(); return mark(S.en.E === 1000) + ' 1000 kcal &nbsp; ' + mark(o.c) + ' 탄수화물 250 g &nbsp; ' + mark(o.f) + ' 중성 지방 약 111 g'; },
          explain: '탄수화물 1000 / 4 = <b>250 g</b>, 중성 지방 1000 / 9 ≈ <b>111 g</b>이에요. 지방은 같은 에너지를 절반 이하의 질량으로 저장하니, 곰의 겨울잠 · 낙타의 혹 · 철새의 장거리 이동처럼 오래 쓸 에너지는 지방으로 모아 둬요. (운동 직후에는 간 · 근육의 글리코젠이 먼저 쓰이고, 오래 걷거나 굶을 때는 지방이 많이 쓰여요.)',
        },
        {
          id: 'match', title: '기능 카드 연결', manual: true,
          goal: '기능 카드 6장을 알맞은 <b>물질 상자</b>에 한 장씩 넣으세요.',
          hint: '식물은 녹말, 동물은 글리코젠으로 저장해요. 세포막의 뼈대는 인지질, 호르몬의 재료는 콜레스테롤이에요.',
          setup() { setMode('match'); matcher.reset(); },
          check() {
            if (matcher.placed < 6) { matcher.markBad([]); return '카드를 모두 상자에 넣어 주세요. (' + matcher.placed + ' / 6)'; }
            const w = matchWrong();
            const dup = matcher.boxes.some((b) => matcher.cards.filter((c) => c.zone === b.id).length > 1);
            if (!w.length && !dup) { matcher.markBad([]); return true; }
            matcher.markBad(w.map((c) => c.id));
            if (dup) return '한 상자에는 카드를 한 장씩만 넣어요.';
            return '\'' + FUNC[w[0].id].func + '\' 카드는 그 상자와 맞지 않아요. 다시 생각해 보세요.';
          },
          explain: '<b>녹말</b>은 식물, <b>글리코젠</b>은 동물(간 · 근육)의 에너지 저장 물질, <b>셀룰로스</b>는 식물 세포벽의 주성분이에요. <b>중성 지방</b>은 장기 에너지 저장과 단열, <b>인지질</b>은 세포막의 기본 뼈대, <b>콜레스테롤</b>(스테로이드)은 성호르몬 같은 호르몬의 재료예요.',
        },
      ],
    },
    {
      title: '검출 반응', short: '검출 반응', icon: '🧪', phase: '실험',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 탄수화물과 지질의 종류와 기능을 알았어요.</div><p>이제 시료 속에 어떤 물질이 들어 있는지 <b>검출 시약의 색 변화</b>로 알아내요. 아이오딘 · 베네딕트 · 수단 Ⅲ 세 가지를 써요.</p><p>🥽 <b>실험 안전</b>: 보안경을 쓰고, 가열할 때 시험관 입구를 사람 쪽으로 향하지 말고, 사용한 폐액은 따로 모아 처리해요.</p>',
      features: ['lab', 'table'],
      setup() { setMode('lab'); },
      recap: '녹말은 아이오딘 용액에서 청람색, 환원당은 베네딕트 용액을 가열하면 청색에서 녹색 · 노란색 · 주황색 · 벽돌색으로, 지질은 수단 Ⅲ 용액에서 붉은 주황색으로 나타나요.',
      summary: '<ul><li><b>아이오딘–아이오딘화 칼륨 용액</b>: 녹말이 있으면 <b>청람색</b>(포도당 · 설탕은 반응 X).</li><li><b>베네딕트 용액</b>(청색)을 넣고 <b>가열</b>: <b>환원당</b>(포도당 · 과당 · 엿당 · 젖당)이 있으면 청 → 녹 → 노랑 → 주황 → 벽돌색 앙금(당이 많을수록). 설탕은 환원당이 아니라 변화 X.</li><li><b>수단 Ⅲ 용액</b>: 지질(중성 지방)을 <b>붉은 주황색</b>으로 염색.</li><li>증류수 시험관은 <b>대조군</b>: 시약 자체의 색이 아니라 시료 속 물질 때문에 색이 변했는지 비교해요. 변화가 없다고 해서 그 물질이 전혀 없다고 단정할 수는 없어요.</li></ul>',
      missions: [
        {
          id: 'lab', title: '시료 9종 검사',
          goal: '세 시약을 시료 <b>9개</b>에 모두 넣어 보세요. 베네딕트 용액은 넣은 뒤 <b>물중탕으로 가열</b>해요.',
          hint: '시약을 고른 뒤 시험관을 눌러요. "9개 모두 넣기" 버튼을 써도 돼요. 베네딕트는 🔥 가열하기를 꼭 눌러요.',
          setup() { labReset(); setMode('lab'); S.lab.r = 0; S.lab.focus = null; updateCtl(); },
          check: () => labCount(0) === 9 && labCount(1) === 9 && labCount(2) === 9, hold: 0.8,
          status: () => REAG.map((r, i) => mark(labCount(i) === 9) + ' ' + r.short + ' ' + labCount(i) + '/9').join(' &nbsp; '),
          explain: '아이오딘은 <b>녹말</b>(감자 즙 · 녹말 용액)에서 청람색, 베네딕트는 가열하면 <b>환원당</b>(포도당 · 사과즙 · 우유의 젖당)에서 청색이 녹색 · 노란색 · 주황색으로 변하고, 수단 Ⅲ는 <b>지질</b>(식용유 · 땅콩 즙 · 우유)에서 붉은 주황색으로 염색해요. 증류수는 아무 변화가 없는 <b>대조군</b>이에요.',
        },
        {
          id: 'table', title: '들어 있는 물질 판정', manual: true,
          goal: '결과표를 보고, 시료마다 들어 있는 물질(<b>녹말 · 환원당 · 지질</b>)을 표시한 뒤 확인하세요.',
          hint: '청람색이면 녹말, 베네딕트 가열 후 색이 변하면 환원당, 수단 Ⅲ에 붉게 염색되면 지질이에요. 변하지 않으면 비워 둬요.',
          setup() { setMode('table'); },
          check() {
            for (let r = 0; r < 3; r++) if (labCount(r) < 9) return '먼저 실험대에서 ' + REAG[r].short + ' 검사를 시료 9개에 모두 해 주세요.';
            const bad = tblCheck();
            if (!bad.length) { S.tbl.bad.fill(false); return true; }
            bad.forEach((b) => { if (!S.tbl.bad[b.i]) { S.tbl.bad[b.i] = true; S.tbl.shake[b.i] = 1; } });
            const b0 = bad[0], s = SAMPLES[b0.i], nm = s.n.join(' ');
            if (s.id === 'water') return '증류수는 <b>대조군</b>이에요. 세 시약 모두 변하지 않으니 칸을 비워 두세요.';
            if (s.id === 'sucrose') return '설탕 용액은 세 시약 모두 변하지 않았어요. 설탕은 <b>환원당이 아니라서</b> 베네딕트 반응이 없어요. 칸을 비워 두세요.';
            return nm + ': ' + b0.wrong.map((c) => VERD[c]).join(' · ') + ' 판정을 다시 확인해 보세요. 시약 결과 색을 비교해요.';
          },
          explain: '<b>감자 즙</b>은 아이오딘에서 청람색(녹말), 베네딕트에서 약한 반응(소량의 환원당)이 나왔어요. <b>우유</b>는 젖당(환원당)과 지방이 있어요. 설탕은 당이지만 <b>비환원당</b>이라 베네딕트 반응이 없고, 증류수는 아무 반응이 없는 <b>대조군</b>이에요.',
        },
        {
          type: 'quiz', title: '설탕에 변화가 없다면?',
          goal: '설탕 용액에 베네딕트 용액을 넣고 가열해도 <b>색이 변하지 않았어요.</b> 이 결과를 바르게 해석한 것은?',
          setup() { setMode('lab'); S.lab.r = 1; updateCtl(); },
          choices: ['설탕 용액에는 당이 들어 있지 않다', '가열이 부족해서 반응이 일어나지 않았다', '설탕은 환원당이 아니라서 베네딕트 반응을 하지 않는다', '설탕은 녹말이라서 아이오딘으로만 검출된다'],
          answer: 2,
          feedback: ['설탕도 당이에요. 다만 베네딕트 용액과 반응하는 환원당이 아니에요.', '증류수 · 포도당과 같은 조건에서 가열했는데 포도당은 변했어요. 설탕은 환원당이 아니에요.', '', '설탕은 녹말이 아니라 이당류예요. 아이오딘에도 반응하지 않았어요.'],
          explain: '베네딕트 반응은 <b>환원당</b>만 검출해요. 설탕은 이당류지만 환원당이 아니라서 반응하지 않아요. 그래서 "반응이 없다 = 그 물질이 없다"로 바로 말하면 안 되고, <b>검출하려는 물질에 맞는 시약</b>을 써야 해요.',
        },
      ],
    },
    {
      title: '현미경 관찰', short: '현미경 관찰', icon: '🔬', phase: '관찰',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 시약의 색 변화로 시료 속 녹말 · 환원당 · 지질을 확인했어요.</div><p>이제 생물 재료를 얇게 잘라 <b>현미경</b>으로 보며 이 물질이 세포 안 <b>어디에</b> 있는지 찾아봐요. 슬라이드를 끌어서 옮기고 배율을 바꿔 보세요.</p><p>🥽 시약이 피부와 눈에 닿지 않게 조심하고, 사용한 슬라이드와 폐액은 따로 모아 처리해요.</p>',
      features: ['micro'],
      setup() { setMode('micro'); },
      recap: '감자 세포 속 색소체에는 녹말 알갱이(길이 약 20~60 µm)가 있어 아이오딘으로 청자색이 되고, 땅콩 세포의 세포질에는 지방 방울(지름 약 1~5 µm)이 있어 수단 Ⅲ로 붉게 보여요.',
      summary: '<ul><li>감자 단면 + 아이오딘 → 세포 안 <b>색소체</b>의 <b>녹말 알갱이</b>(타원형, 길이 약 20~60 µm)가 <b>청자색</b>으로 보여요. 염색 전에는 거의 무색이에요.</li><li>땅콩 · 참깨 절편 + 수단 Ⅲ → <b>세포질</b>에 있는 <b>지방 방울</b>(지름 약 1~5 µm)이 <b>붉은 점</b>으로 보여요.</li><li>양파 표피는 저장 탄수화물이 녹말이 아니라서 아이오딘 반응이 약해요.</li><li>시료는 빛이 통과하도록 <b>얇게</b> 자르고, 시약 처리 후 ×100 → ×400으로 배율을 높이며 관찰해요.</li></ul>',
      missions: [
        {
          id: 'micro', title: '알갱이와 방울 찾기',
          goal: '감자에서 <b>녹말 알갱이 3개</b>, 땅콩에서 <b>지방 방울 3개</b>를 염색한 뒤 ×400 이상에서 눌러 찾으세요.',
          hint: '표본을 고르고 💧 염색해요. 슬라이드를 끌어서 옮기며 청자색 타원(감자), 붉은 점(땅콩)을 눌러요. 회색빛 알갱이는 지방이 아니에요.',
          setup() { S.mic.found.potato.clear(); S.mic.found.peanut.clear(); S.mic.sel = null; S.mic.stainOn.potato = false; S.mic.stainOn.peanut = false; S.mic.stainOn.onion = false; S.mic.stain.potato = 0; S.mic.stain.peanut = 0; S.mic.stain.onion = 0; S.mic.spec = 'potato'; S.mic.zi = 1; S.mic.px = S.mic.py = 0; setMode('micro'); },
          check: () => S.mic.found.potato.size >= 3 && S.mic.found.peanut.size >= 3, hold: 0.6,
          status: () => mark(S.mic.found.potato.size >= 3) + ' 녹말 알갱이 ' + Math.min(3, S.mic.found.potato.size) + '/3 &nbsp; ' + mark(S.mic.found.peanut.size >= 3) + ' 지방 방울 ' + Math.min(3, S.mic.found.peanut.size) + '/3',
          explain: '염색 전에는 거의 무색이라 알갱이가 잘 보이지 않아요. 아이오딘으로 염색하면 <b>색소체 안의 녹말 알갱이</b>가 청자색 타원으로, 수단 Ⅲ로 염색하면 <b>세포질의 지방 방울</b>이 붉은 점으로 보여요. 현미경 시료는 빛이 통과하도록 <b>얇게</b> 잘라야 해요.',
        },
        {
          type: 'quiz', title: '양파 표피의 아이오딘 반응',
          goal: '양파 표피를 아이오딘 용액으로 염색했더니 청자색 알갱이가 <b>거의 보이지 않았어요.</b> 그 까닭은?',
          setup() { setMode('micro'); micSetSpec('onion'); },
          choices: ['양파 표피에는 세포가 없기 때문이다', '아이오딘은 식물 세포에는 반응하지 않기 때문이다', '양파 표피를 너무 두껍게 잘랐기 때문이다', '양파의 저장 탄수화물은 녹말이 아니라서 아이오딘 반응이 약하기 때문이다'],
          answer: 3,
          feedback: ['양파 표피도 뚜렷한 세포 구조를 가진 세포로 이루어져 있어요.', '감자 세포는 아이오딘에 청자색으로 반응했어요. 녹말이 있느냐가 중요해요.', '두껍게 자르면 오히려 빛이 덜 통과해 잘 안 보이지만, 청자색이 없는 까닭은 아니에요.', ''],
          explain: '아이오딘 반응은 <b>녹말</b>에서 나타나요. 양파는 저장 탄수화물로 녹말이 거의 없고 다른 당류(과당 중합체 등)를 저장해서 반응이 약해요.',
        },
        {
          type: 'quiz', title: '처음 보는 곡물 가루',
          goal: '처음 보는 곡물 가루 속에 <b>녹말과 지질</b>이 있는지 확인하는 방법으로 가장 알맞은 것은?',
          setup() { setMode('micro'); },
          choices: ['아이오딘 용액과 수단 Ⅲ 용액을 각각 가루에 떨어뜨려 색을 본다', '베네딕트 용액을 넣고 가열해 색을 본다', '물에 녹는지만 본다', '염색하지 않고 현미경으로만 본다'],
          answer: 0,
          feedback: ['', '베네딕트는 환원당만 검출해요. 녹말과 지질은 확인할 수 없어요.', '물에 녹는지만으로는 어떤 물질인지 알 수 없어요.', '염색하지 않으면 알갱이와 방울이 거의 무색이라 구분하기 어려워요.'],
          explain: '<b>녹말</b>은 아이오딘(청람색), <b>지질</b>은 수단 Ⅲ(붉은 주황색)로 확인해요. 검출하려는 물질마다 알맞은 시약을 골라 쓰고, 필요하면 현미경으로 세포 안 위치까지 관찰해요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hy-carb-lipid', mount: '#game', badge: '탄수화물 탐정', homeHref: '../../index.html#hy',
    featureLabels: { blocks: '🧱 블록 상자', sort: '🗂 분류 카드', energy: '⚖ 에너지 저장 비교', match: '🔗 기능 연결', lab: '🧪 검출 반응 실험대', table: '📋 결과표', micro: '🔬 가상 현미경' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 읽음 칸 ---------- */
  const carbKind = (n) => (n === 0 ? '—' : n === 1 ? '단당류' : n === 2 ? '이당류' : n < 5 ? '이어 가는 중' : '다당류');
  function readouts() {
    const m = S.mode;
    if (m === 'blocks' && S.sub === 'carb') { const n = chainOf().length; setReads(['연결한 고리', n + '개', '종류', carbKind(n), '빠져나간 물', Math.max(0, n - 1) + '분자']); }
    else if (m === 'blocks') { const ty = S.lip.type, nm = { tg: '중성 지방', pl: '인지질', st: '스테로이드', wx: '왁스' }[ty]; const tot = S.lip.pieces.length, k = S.lip.pieces.filter((q) => q.slot >= 0).length; setReads(['살펴보는 지질', nm, '붙인 조각', tot ? k + ' / ' + tot : '—', '물속에서', ty === 'pl' ? (S.lip.waterOn ? '이중층을 이뤄요' : '아직 안 넣었어요') : '—']); }
    else if (m === 'sort') setReads(['놓은 카드', sorter.placed + ' / 8', '남은 카드', (8 - sorter.placed) + '장', '상자', '6칸']);
    else if (m === 'match') setReads(['놓은 카드', matcher.placed + ' / 6', '남은 카드', (6 - matcher.placed) + '장', '상자', '6칸']);
    else if (m === 'energy') setReads(['저장할 에너지', S.en.E + ' kcal', '탄수화물 질량', Math.round(S.en.E / KCAL_C) + ' g', '중성 지방 질량', Math.round(S.en.E / KCAL_F) + ' g']);
    else if (m === 'lab') setReads(['사용하는 시약', REAG[S.lab.r].short, '넣은 시험관', labAdded(S.lab.r) + ' / 9', '물중탕', S.lab.bath.on ? '가열 중 ' + Math.round(S.lab.bath.temp) + ' °C' : '꺼짐']);
    else if (m === 'table') setReads(['표시한 칸', S.tbl.v.reduce((a, r) => a + r.filter(Boolean).length, 0) + '개', '검사 끝난 시약', [0, 1, 2].filter((r) => labCount(r) === 9).length + ' / 3', '틀린 줄', S.tbl.bad.filter(Boolean).length + '줄']);
    else if (m === 'micro') setReads(['표본', SPECS[S.mic.spec].name, '배율', '×' + MAGS[S.mic.zi], '찾은 개수', S.mic.spec === 'onion' ? '—' : S.mic.found[S.mic.spec].size + '개']);
  }

  /* ---------- 시작 ---------- */
  labReset();
  setMode('blocks', 'carb');
  let lastFree = false, lastLv = -1;
  SciSim.loop((dt, t) => {
    clock = t; S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (game && game.level !== lastLv) { lastLv = game.level; updateCtl(); }
    view.apply();
    FX.update(dt);
    ctx.clearRect(0, 0, VW, VH);
    switch (S.mode) {
      case 'blocks': bgFill('#eef4f2', '#e3ece8'); if (S.sub === 'carb') { carbUpdate(dt); carbDraw(dt, t); } else { lipUpdate(dt, t); lipDraw(dt, t); } break;
      case 'sort': bgFill('#eef4f2', '#e3ece8'); sortDraw(dt, t); break;
      case 'match': bgFill('#eef4f2', '#e3ece8'); matchDraw(dt, t); break;
      case 'energy': bgFill('#eef4f2', '#e3ece8'); energyDraw(dt, t); break;
      case 'lab': labUpdate(dt); labDraw(dt, t); break;
      case 'table': S.tbl.shake = S.tbl.shake.map((s) => Math.max(0, s - dt * 2.5)); tblDraw(dt, t); break;
      case 'micro': micUpdate(dt); micDraw(dt, t); break;
    }
    // 눈에 보이지 않는 장면의 상태도 부드럽게 이어 가도록 필요한 갱신
    if (S.mode !== 'lab') labUpdate(dt);
    if (S.mode !== 'micro') micUpdate(dt);
    FX.draw(); parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(241,246,243,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, PHONE, get game() { return game; }, levels, setMode, sorter, matcher, SAMPLES, REAG, KIND, FUNC, MIC, SPECS, FOVS,
    carbAttach, chainOf, setShape, setLipType, lipAttach, lipSetWater, lipDone, labApply, labApplyAll, labHeat, labCount, tubePos, tblGeom, tblCell, tblCheck,
    micTap, micStainToggle, micSetSpec, micSetZoom, cellData, W2S, micRange, updateCtl, carbReset, lipReset, WS, TRAY, RX, slotY, LT, energyCalcOk, resetBuild,
  };
})();
