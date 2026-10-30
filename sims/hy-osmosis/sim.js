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
     고등학교 세포와 물질대사 · Ⅰ. 세포 - 세포에서 삼투 관찰 (단원 56, 9차시)
     성취기준 [12세포01-05] 세포막의 구조와 특성을 이해하고, 세포막을 통한 물질 수송 과정을 추론할 수 있다. (삼투)
     ① 모형: 삼투 모형 (U자관)  ② 관찰: 세포 관찰 (적혈구 · 양파 표피)  ③ 분석: 농도 추정  ④ 적용: 삼투 적용
     ========================================================= */
  const S = { mode: 'utube', fade: 0 };
  let game = null;
  const BG2 = '#eef4f2', BG3 = '#e3ece8';
  const WATERC = '#60a5fa', SOLC = '#f59e0b';
  const fmtM = (v) => v.toFixed(1) + ' M';

  /* =========================================================
     ① 삼투 모형 : U자관과 반투과성 막
     ========================================================= */
  const UTP = PHONE ? { x: 10, y: 10, w: 460, h: 380 } : { x: 14, y: 14, w: 540, h: 410 };
  const UTI = PHONE ? { x: 10, y: 400, w: 460, h: 118 } : { x: 566, y: 14, w: 220, h: 410 };
  const UTC = PHONE ? { x: 10, y: 528, w: 460, h: 102 } : { x: 14, y: 436, w: 772, h: 110 };
  const DMAX = 60;                              // 수면 높이 차의 최대(화면 길이): 6.0 cm (1 cm = 10 화면 길이)
  const CM = 10, KDELTA = 120;                  // Δ* (화면 길이) = 120 × (왼쪽 농도 − 오른쪽 농도)  →  12 cm / M
  const WN = 24;                                // 칸마다 물 분자 수
  function utG() {
    const P = UTP, aw = PHONE ? 100 : 110, x0 = P.x + (PHONE ? 40 : 70), x1 = P.x + P.w - (PHONE ? 40 : 70);
    return { x0, x1, cx: (x0 + x1) / 2, aw, top: P.y + (PHONE ? 62 : 64), yc: P.y + (PHONE ? 220 : 236), yb: P.y + (PHONE ? 340 : 366), base: P.y + (PHONE ? 140 : 150) };
  }
  S.ut = { cL: 0.3, cR: 0, eL: 0.3, eR: 0, perm: false, d: 0, ps: [], seen: { left: false, right: false, same: false, perm: false }, same: 0, permT: 0, acc: 0, freeze: false, shake: 0 };
  const utDStar = () => (S.ut.perm ? 0 : KDELTA * (S.ut.eL - S.ut.eR));
  const utB = () => (S.ut.freeze ? 0 : clamp((utDStar() - S.ut.d) / DMAX, -1, 1));
  const utDcm = () => Math.round(S.ut.d / CM * 10) / 10;
  function utSolCount(side) { return Math.round((side < 0 ? S.ut.eL : S.ut.eR) * 40); }
  function utSpawn(type, side, fade) {
    const g = utG(), rr = Math.random, sp = 40 + rr() * 40, a = rr() * TAU, xa = side < 0 ? g.x0 + 8 : g.cx + 8, xb = side < 0 ? g.cx - 8 : g.x1 - 8;
    return { type, side, x: xa + rr() * (xb - xa), y: g.yc + 10 + rr() * (g.yb - g.yc - 20), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, a: fade ? 0 : 1, cd: 0 };
  }
  function utRebuild() {
    S.ut.ps = [];
    [-1, 1].forEach((side) => { for (let i = 0; i < WN; i++) S.ut.ps.push(utSpawn('w', side, false)); for (let i = 0; i < utSolCount(side); i++) S.ut.ps.push(utSpawn('s', side, false)); });
  }
  function utSync() {
    // 농도가 바뀌면 용질 알갱이 수를 맞춰요 (서서히)
    [-1, 1].forEach((side) => {
      const want = utSolCount(side), have = S.ut.ps.filter((p) => p.type === 's' && p.side === side && !p.dying);
      if (have.length < want) S.ut.ps.push(utSpawn('s', side, true));
      else if (have.length > want) have[0].dying = true;
    });
  }
  function utReset() { S.ut.eL = S.ut.cL; S.ut.eR = S.ut.cR; S.ut.d = 0; S.ut.same = 0; S.ut.permT = 0; utRebuild(); updateCtl(); }
  function utUpdate(dt) {
    const U = S.ut, g = utG(), b = utB(), PB = 0.5, beta = 0.7;
    const prl = U.perm ? PB : clamp(PB * (1 + beta * b), 0.02, 0.95), plr = U.perm ? PB : clamp(PB * (1 - beta * b), 0.02, 0.95);
    U.prl = prl; U.plr = plr;
    if (U.perm) { const m = (U.eL + U.eR) / 2; U.eL = approach(U.eL, m, dt, 0.45); U.eR = approach(U.eR, m, dt, 0.45); } else { U.eL = approach(U.eL, U.cL, dt, 4); U.eR = approach(U.eR, U.cR, dt, 4); }
    U.d = approach(U.d, utDStar() * (U.freeze ? 0 : 1), dt, U.freeze ? 99 : 0.7);
    utSync();
    U.ps.forEach((p) => {
      if (p.dying) { p.a -= dt * 2; return; }
      p.a = Math.min(1, p.a + dt * 2.5); p.cd = Math.max(0, p.cd - dt);
      p.vx += (Math.random() - 0.5) * 360 * dt; p.vy += (Math.random() - 0.5) * 360 * dt;
      const sp = Math.hypot(p.vx, p.vy) || 1, tgt = clamp(sp, 35, 85); p.vx *= tgt / sp; p.vy *= tgt / sp;
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.y < g.yc + 6) { p.y = g.yc + 6; p.vy = Math.abs(p.vy); } if (p.y > g.yb - 6) { p.y = g.yb - 6; p.vy = -Math.abs(p.vy); }
      if (p.x < g.x0 + 6 && p.side < 0) { p.x = g.x0 + 6; p.vx = Math.abs(p.vx); } if (p.x > g.x1 - 6 && p.side > 0) { p.x = g.x1 - 6; p.vx = -Math.abs(p.vx); }
      // 막
      const hitL = p.side < 0 && p.x > g.cx - 4, hitR = p.side > 0 && p.x < g.cx + 4;
      if (hitL || hitR) {
        const can = (p.type === 'w' || U.perm) && p.cd <= 0, pr = hitR ? prl : plr;      // 오른쪽에서 왼쪽으로 건너려면 prl
        if (can && Math.random() < pr) { p.side = -p.side; p.cd = 0.25; p.x = g.cx + (p.side < 0 ? -6 : 6); p.vx = (p.side < 0 ? -1 : 1) * Math.abs(p.vx); }
        else { p.x = g.cx + (hitL ? -4 : 4); p.vx = (hitL ? -1 : 1) * Math.abs(p.vx); }
      }
    });
    U.ps = U.ps.filter((p) => !(p.dying && p.a <= 0));
    // 칸마다 물 분자 수를 일정하게 (수면이 올라가는 만큼 관 속 물이 채워 줘요)
    U.acc += dt;
    if (U.acc > 0.3) {
      U.acc = 0;
      [-1, 1].forEach((side) => {
        const ws = U.ps.filter((p) => p.type === 'w' && p.side === side && !p.dying);
        if (ws.length > WN + 2) { const far = ws.sort((a, c) => Math.abs(c.x - g.cx) - Math.abs(a.x - g.cx))[0]; far.dying = true; }
        else if (ws.length < WN - 2) U.ps.push(utSpawn('w', side, true));
      });
    }
    // 관찰 기록
    if (!U.perm) {
      if (U.d >= 20) U.seen.left = true; if (U.d <= -20) U.seen.right = true;
      if (Math.abs(U.eL - U.eR) < 0.01 && U.eL > 0.005 && Math.abs(U.d) < 2) U.same += dt; else U.same = 0;
      if (U.same > 1.5) U.seen.same = true; U.permT = 0;
    } else { U.same = 0; if (Math.abs(U.cL - U.cR) >= 0.01 && Math.abs(U.d) < 2) U.permT += dt; else U.permT = 0; if (U.permT > 1.5) U.seen.perm = true; }
    U.shake = Math.max(0, U.shake - dt * 3);
  }
  function utPath(g) {
    const r = 26; ctx.beginPath(); ctx.moveTo(g.x0, g.top); ctx.lineTo(g.x0 + g.aw, g.top); ctx.lineTo(g.x0 + g.aw, g.yc); ctx.lineTo(g.x1 - g.aw, g.yc); ctx.lineTo(g.x1 - g.aw, g.top); ctx.lineTo(g.x1, g.top); ctx.lineTo(g.x1, g.yb - r); ctx.quadraticCurveTo(g.x1, g.yb, g.x1 - r, g.yb); ctx.lineTo(g.x0 + r, g.yb); ctx.quadraticCurveTo(g.x0, g.yb, g.x0, g.yb - r); ctx.closePath();
  }
  function utDraw(dt, t, qmode) {
    utUpdate(dt);
    const U = S.ut, g = utG(), P = UTP, b = utB();
    panel(P.x, P.y, P.w, P.h, 18, '#f4f9fc');
    // U자관 유리
    utPath(g); ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.fill();
    const yL = g.base - U.d / 2, yR = g.base + U.d / 2;
    ctx.save(); utPath(g); ctx.clip();
    const lg = ctx.createLinearGradient(0, g.top, 0, g.yb), sc = C.mix('#fde68a', '#f59e0b', clamp(U.eL / 0.5, 0, 1) * 0.8);
    lg.addColorStop(0, C.rgba(sc, 0.55)); lg.addColorStop(1, C.rgba(sc, 0.8));
    ctx.fillStyle = U.eL > 0.03 ? lg : 'rgba(186,223,248,.75)'; ctx.fillRect(g.x0, yL, g.cx - g.x0, g.yb - yL);
    if (U.cL > 0) { ctx.fillStyle = 'rgba(186,223,248,.0)'; }
    const rg = ctx.createLinearGradient(0, g.top, 0, g.yb), sc2 = C.mix('#fde68a', '#f59e0b', clamp(U.eR / 0.5, 0, 1) * 0.8);
    rg.addColorStop(0, C.rgba(sc2, 0.55)); rg.addColorStop(1, C.rgba(sc2, 0.8));
    ctx.fillStyle = U.eR > 0.03 ? rg : 'rgba(186,223,248,.75)'; ctx.fillRect(g.cx, yR, g.x1 - g.cx, g.yb - yR);
    // 물결
    ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 2.4;
    [[g.x0, g.x0 + g.aw, yL], [g.x1 - g.aw, g.x1, yR]].forEach((s) => { ctx.beginPath(); for (let x = s[0]; x <= s[1]; x += 4) { const yy = s[2] + Math.sin(t * 2.4 + x * 0.12) * 1.6; if (x === s[0]) ctx.moveTo(x, yy); else ctx.lineTo(x, yy); } ctx.stroke(); });
    // 입자
    U.ps.forEach((p) => {
      if (p.a <= 0) return; ctx.globalAlpha = clamp(p.a, 0, 1);
      if (p.type === 'w') { D.sphere(p.x, p.y, 3.8, WATERC, { gloss: false }); }
      else D.sphere(p.x, p.y, 6.4, SOLC, { gloss: true });
      ctx.globalAlpha = 1;
    });
    ctx.restore();
    ctx.strokeStyle = '#7b8aa0'; ctx.lineWidth = 4; ctx.lineJoin = 'round'; utPath(g); ctx.stroke();
    // 막
    ctx.save(); ctx.strokeStyle = U.perm ? 'rgba(120,53,15,.55)' : '#78350f'; ctx.lineWidth = 5; ctx.setLineDash(U.perm ? [20, 22] : [6, 5]); ctx.beginPath(); ctx.moveTo(g.cx, g.yc - 4); ctx.lineTo(g.cx, g.yb); ctx.stroke(); ctx.restore();
    T(g.cx, g.yb + 22, U.perm ? '용질도 통과하는 막' : '반투과성 막', 13.5, '#78350f', 'center', 800);
    // 처음 수면 · 수면 높이 차
    D.dashedLine(g.x0 - 18, g.base, g.x1 + 18, g.base, { color: '#94a3b8', width: 1.4, dash: [5, 5] }); if (!PHONE) T(g.x0 - 20, g.base - 6, '처음 수면', 11.5, '#64748b', 'right', 700);
    if (Math.abs(U.d) > 2) {
      const hi = U.d > 0 ? yL : yR, lo = U.d > 0 ? yR : yL, bx = U.d > 0 ? g.x0 + g.aw + 14 : g.x1 - g.aw - 14;
      ctx.strokeStyle = '#dc2626'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(g.cx - 40, hi); ctx.lineTo(g.cx + 40, hi); ctx.moveTo(g.cx - 40, lo); ctx.lineTo(g.cx + 40, lo); ctx.stroke();
      D.arrow(g.cx, lo, g.cx, hi, { color: '#dc2626', width: 2.4 }); D.label(g.cx + (PHONE ? 46 : 50), (hi + lo) / 2, 'Δh ' + Math.abs(utDcm()).toFixed(1) + ' cm', { bg: '#dc2626', size: 13 });
    }
    // 이름표
    D.label(g.x0 + g.aw / 2, g.top - 14, '왼쪽 ' + (U.eL > 0.04 ? '설탕 용액 ' + fmtM(U.eL) : '물 0.0 M'), { bg: '#b45309', size: PHONE ? 12.5 : 13.5 });
    D.label(g.x1 - g.aw / 2, g.top - 14, '오른쪽 ' + (U.eR > 0.04 ? '설탕 용액 ' + fmtM(U.eR) : '물 0.0 M'), { bg: '#0369a1', size: PHONE ? 12.5 : 13.5 });
    // 물 이동 화살표 (막 위쪽)
    if (!U.freeze) {
      const ay = g.yc + 24 - 0, rl = U.perm ? 0.5 : U.prl, lr = U.perm ? 0.5 : U.plr, ww = (v) => 2 + 11 * v;
      ctx.save(); ctx.globalAlpha = 0.9;
      D.arrow(g.cx + 52, g.yc - 34, g.cx - 52, g.yc - 34, { color: '#2563eb', width: ww(rl) });
      D.arrow(g.cx - 52, g.yc - 14, g.cx + 52, g.yc - 14, { color: '#2563eb', width: ww(lr) });
      ctx.restore();
      T(g.cx, g.top + 16, '물 분자 이동 (굵을수록 많아요)', 12, '#1e40af', 'center', 800, { stroke: 'rgba(255,255,255,.85)', strokeWidth: 3 });
    }
    // 정보 패널
    panel(UTI.x, UTI.y, UTI.w, UTI.h, 18, '#ffffff');
    const I = UTI, msg = U.freeze ? '물은 어느 쪽으로 이동할까요?' : (U.perm ? (Math.abs(U.eL - U.eR) < 0.01 ? '양쪽 농도가 같아요. 오가는 수가 같아요.' : '용질도 막을 지나가서 양쪽 농도가 같아지고 수면도 같아져요.') : (Math.abs(b) < 0.04 ? (Math.abs(U.eL - U.eR) < 0.01 ? '양쪽 농도가 같아요. 순 이동이 없어요.' : '수면 차이가 삼투압과 맞서서 순 이동이 멈췄어요. (분자는 계속 오가요)') : (b > 0 ? '물이 오른쪽 → 왼쪽으로 더 많이 이동해요.' : '물이 왼쪽 → 오른쪽으로 더 많이 이동해요.')));
    if (!PHONE) {
      T(I.x + 16, I.y + 32, '삼투 관찰', 17, '#334155', 'left', 800);
      T(I.x + 16, I.y + 66, '왼쪽 ' + fmtM(U.eL), 15, '#b45309', 'left', 800); T(I.x + 16, I.y + 90, '오른쪽 ' + fmtM(U.eR), 15, '#0369a1', 'left', 800);
      T(I.x + 16, I.y + 128, '수면 높이 차', 14, '#475569', 'left', 800);
      T(I.x + 16, I.y + 164, Math.abs(utDcm()).toFixed(1) + ' cm', 28, '#dc2626', 'left', 800);
      T(I.x + 16, I.y + 188, Math.abs(U.d) < 2 ? '두 수면의 높이가 같아요' : (U.d > 0 ? '왼쪽 수면이 더 높아요' : '오른쪽 수면이 더 높아요'), 13.5, '#475569', 'left', 800);
      textBlock(I.x + 16, I.y + 224, I.w - 32, msg, 14, '#15803d', 20, 800);
      textBlock(I.x + 16, I.y + 330, I.w - 32, '삼투 = 물의 확산. 물은 용질이 적은 쪽 → 많은 쪽으로 순 이동해요. 용질(주황)은 막을 지나지 못해요.', 12.5, '#64748b', 17.5, 700);
    } else {
      TF(I.x + 14, I.y + 26, '왼쪽 ' + fmtM(U.eL) + ' · 오른쪽 ' + fmtM(U.eR) + ' · 수면 차 ' + Math.abs(utDcm()).toFixed(1) + ' cm', I.w - 28, 14.5, 12, '#334155', 'left', 800);
      textBlock(I.x + 14, I.y + 58, I.w - 28, msg, 14, '#15803d', 20, 800);
    }
    panel(UTC.x, UTC.y, UTC.w, UTC.h, 16, '#ffffff');
    if (qmode) {
      const q = S.uq, Q = UQS[q.i];
      T(UTC.x + 16, UTC.y + 28, '문제 ' + (q.i + 1) + ' / 3', 15, '#334155', 'left', 800);
      textBlock(UTC.x + 16, UTC.y + 52, UTC.w - 32, q.state === 'ask' ? (q.msg || '왼쪽 ' + fmtM(Q.cL) + ' · 오른쪽 ' + fmtM(Q.cR) + '. 물은 어느 쪽으로 순 이동할까요? (반투과성 막)') : q.msg, L(15, 14), q.bad ? '#b91c1c' : (q.state === 'show' ? '#15803d' : '#334155'), L(21, 20), 800);
    } else {
      textBlock(UTC.x + 16, UTC.y + 30, UTC.w - 32, '슬라이더로 왼쪽 · 오른쪽 설탕 용액의 농도를 바꿔 보세요. 반투과성 막은 물만 지나가고 설탕(용질)은 지나가지 못해요.', L(15, 13.5), '#475569', L(21, 19), 800);
      ['left', 'right', 'same', 'perm'].forEach((k, i) => {
        const nm = { left: '왼쪽 수면 상승', right: '오른쪽 수면 상승', same: '농도가 같으면 변화 없음', perm: '용질이 통과하는 막' }[k];
        const x = UTC.x + 16 + (PHONE ? (i % 2) * 220 : i * 190), y = UTC.y + L(84, 72) + (PHONE ? Math.floor(i / 2) * 22 : 0);
        TF(x, y, (U.seen[k] ? '✅ ' : '⬜ ') + nm, PHONE ? 210 : 184, 13.5, 11.5, U.seen[k] ? '#15803d' : '#64748b', 'left', 800);
      });
    }
  }

  /* ----- 물 이동 방향 맞추기 ----- */
  const UQS = [{ cL: 0.4, cR: 0.1, ans: 'L' }, { cL: 0.2, cR: 0.5, ans: 'R' }, { cL: 0.3, cR: 0.3, ans: '0' }];
  S.uq = { i: 0, state: 'ask', solved: [false, false, false], msg: '', bad: false, timer: 0 };
  function uqLoad(i) {
    const q = S.uq, Q = UQS[i]; q.i = i; q.state = 'ask'; q.msg = ''; q.bad = false;
    S.ut.cL = Q.cL; S.ut.cR = Q.cR; S.ut.eL = Q.cL; S.ut.eR = Q.cR; S.ut.perm = false; S.ut.freeze = true; S.ut.d = 0; utRebuild(); updateCtl();
  }
  function uqReset() { S.uq.solved = [false, false, false]; uqLoad(0); }
  function uqAnswer(a) {
    const q = S.uq; if (q.state !== 'ask') return;
    const Q = UQS[q.i];
    if (a === Q.ans) {
      q.solved[q.i] = true; q.state = 'show'; q.bad = false; S.ut.freeze = false; Sound.success(); parts.burst(UTP.x + UTP.w / 2, UTP.y + 200, { count: 12, speed: 140, size: 3 });
      q.msg = Q.ans === '0' ? '맞아요! 농도가 같아서 순 이동이 없어요. 물 분자는 양방향으로 같은 수만큼 오가요.' : '맞아요! 물은 용질이 적은 쪽(' + (Q.ans === 'L' ? '오른쪽' : '왼쪽') + ')에서 많은 쪽(' + (Q.ans === 'L' ? '왼쪽' : '오른쪽') + ')으로 이동해서 그쪽 수면이 올라가요.';
      q.timer = 4.5;
    } else {
      q.bad = true; Sound.fail(); S.ut.shake = 1;
      q.msg = a === '0' ? '두 농도가 달라요. 물은 용질이 적은 쪽에서 많은 쪽으로 순 이동해요.' : '반대예요. 물은 용질이 적은(물이 많은) 쪽에서 용질이 많은 쪽으로 이동해요.';
    }
    updateCtl();
  }
  function uqTick(dt) {
    const q = S.uq; if (q.state !== 'show') return;
    q.timer -= dt; if (q.timer <= 0) { if (q.i < 2) uqLoad(q.i + 1); else { q.state = 'done'; q.msg = '세 문제를 모두 맞혔어요!'; S.ut.freeze = false; updateCtl(); } }
  }


  /* =========================================================
     ② 세포 관찰 : 가상 현미경 (적혈구 · 양파 표피) + 결과 정리 표
     ========================================================= */
  const SOLS = {
    rbc: [{ name: '0.3 % NaCl', col: '#dbeafe', vt: 1.75 }, { name: '0.9 % NaCl', col: '#e0f2fe', vt: 1.0 }, { name: '2.0 % NaCl', col: '#bae6fd', vt: 0.68 }],
    onion: [{ name: '증류수', col: '#f1f5f9', c: 0 }, { name: '0.3 M 설탕', col: '#fef3c7', c: 0.3 }, { name: '0.5 M 설탕', col: '#fde68a', c: 0.5 }],
  };
  const SC_L = PHONE ? { x: 10, y: 10, w: 460, h: 302 } : { x: 14, y: 14, w: 392, h: 400 };
  const SC_R = PHONE ? { x: 10, y: 320, w: 460, h: 196 } : { x: 418, y: 14, w: 368, h: 400 };
  const SC_C = PHONE ? { x: 10, y: 524, w: 460, h: 106 } : { x: 14, y: 426, w: 772, h: 120 };
  const LENS = PHONE ? { x: SC_L.x + SC_L.w / 2, y: SC_L.y + SC_L.h / 2 + 8, r: 134 } : { x: SC_L.x + SC_L.w / 2, y: SC_L.y + SC_L.h / 2 + 4, r: 172 };
  const LS = LENS.r / 172;
  /* 슬라이드(오른쪽) 위치 */
  function slideG() {
    const R = SC_R, sw = PHONE ? 300 : 320, sx = R.x + (R.w - sw) / 2, sy = R.y + (PHONE ? 40 : 80), sh = PHONE ? 56 : 80, cw = PHONE ? 100 : 116;
    return { sx, sy, sw, sh, cx: sx + (sw - cw) / 2, cw, cy: sy + 10, ch: sh - 20, dz: { x: sx, y: sy, w: (sw - cw) / 2, h: sh }, pz: { x: sx + (sw + cw) / 2, y: sy, w: (sw - cw) / 2, h: sh } };
  }
  const TOOLP = () => { const R = SC_R, y = R.y + (PHONE ? 160 : 252); return { dropper: { x: R.x + R.w * 0.28, y }, paper: { x: R.x + R.w * 0.72, y } }; };
  S.sc = { spec: 'rbc', sol: 1, phase: 'idle', flow: 0, settle: 0, cells: [], obs: { rbc: [false, false, false], onion: [false, false, false] }, tools: { dropper: { x: 0, y: 0, lift: 0 }, paper: { x: 0, y: 0, lift: 0 } }, drag: null, drop: 0, msg: '' };
  const ONION_T = [0.35, 0.25, 0.35, 0.15, 0.25, 0.35, 0.25, 0.45, 0.25, 0.35, 0.25, 0.35];   // 0.2 M: 1개, 0.3 M: 6개, 0.4 M: 11개, 0.5 M: 12개가 원형질 분리
  function scBuild() {
    const Sx = S.sc, rr = mulberry(808); Sx.cells = [];
    if (Sx.spec === 'rbc') {
      const r0 = 21 * LS, minD = r0 * 2.15;
      let guard = 0;
      while (Sx.cells.length < 17 && guard++ < 4000) {
        const a = rr() * TAU, d = Math.sqrt(rr()) * (LENS.r - r0 * 1.7), x = LENS.x + Math.cos(a) * d, y = LENS.y + Math.sin(a) * d;
        if (Sx.cells.every((c) => Math.hypot(c.x - x, c.y - y) > minD)) Sx.cells.push({ x, y, v: 1, vt: 1, burst: false, bt: 0, r0, ph: rr() * TAU });
      }
    } else {
      const cw = 0.34 * LENS.r, ch = 0.42 * LENS.r, gx = 4, gy = 3;
      for (let j = 0; j < gy; j++) for (let i = 0; i < gx; i++) {
        const k = j * gx + i; Sx.cells.push({ x: LENS.x + (i - (gx - 1) / 2) * (cw + 2), y: LENS.y + (j - (gy - 1) / 2) * (ch + 2), w: cw, h: ch, f: 1, ft: 1, thr: ONION_T[k] });
      }
    }
    Sx.phase = 'idle'; Sx.flow = 0; Sx.settle = 0; Sx.drop = 0; Sx.msg = '';
    const tp = TOOLP(); ['dropper', 'paper'].forEach((k) => { Sx.tools[k].x = tp[k].x; Sx.tools[k].y = tp[k].y; Sx.tools[k].lift = 0; });
    Sx.drag = null; updateCtl();
  }
  function scNew() { scBuild(); }
  function scSetSpec(sp) { S.sc.spec = sp; S.sc.sol = sp === 'rbc' ? 1 : 0; scBuild(); }
  function scSetSol(i) { S.sc.sol = i; scBuild(); }
  function scDrop() {
    const Sx = S.sc;
    if (Sx.phase !== 'idle') { showHint(Sx.phase === 'dropped' ? '이미 용액을 떨어뜨렸어요. 이제 반대쪽에 거름종이를 대 보세요.' : '[↺ 새 시료로]를 눌러 다시 시작해요.', 3200); return; }
    Sx.phase = 'dropped'; Sx.drop = 0; Sound.click(); showHint('용액이 덮개 유리 옆에 닿았어요. 이제 반대쪽에 거름종이를 대 보세요.', 3800); updateCtl();
  }
  function scPaper() {
    const Sx = S.sc;
    if (Sx.phase === 'idle') { showHint('먼저 덮개 유리 한쪽에 용액을 떨어뜨려요.', 3200); return; }
    if (Sx.phase !== 'dropped') return;
    Sx.phase = 'flowing'; Sx.flow = 0; Sound.click(); updateCtl();
  }
  const scObsCount = () => S.sc.obs.rbc.filter(Boolean).length + S.sc.obs.onion.filter(Boolean).length;
  function scUpdate(dt) {
    const Sx = S.sc, sol = SOLS[Sx.spec][Sx.sol];
    Sx.drop = Math.min(1, Sx.drop + dt / 0.9);
    Object.values(Sx.tools).forEach((t) => { t.lift = approach(t.lift, 0, dt, 10); });
    if (Sx.phase === 'flowing') {
      Sx.flow = Math.min(1, Sx.flow + dt / (RM ? 0.8 : 2.4));
      if (Sx.flow >= 1) { Sx.phase = 'done'; Sx.settle = 0; Sound.success(); updateCtl(); }
    }
    if (Sx.phase === 'done') { Sx.settle += dt; if (Sx.settle > (Sx.spec === 'rbc' ? 3.6 : 2.8) && !Sx.obs[Sx.spec][Sx.sol]) { Sx.obs[Sx.spec][Sx.sol] = true; Sound.success(); updateCtl(); } }
    const fx = LENS.x - LENS.r + 2 * LENS.r * (Sx.phase === 'done' ? 1.05 : Sx.phase === 'flowing' ? smooth(Sx.flow) : -0.05);
    Sx.cells.forEach((c) => {
      if (c.x <= fx) {
        if (Sx.spec === 'rbc') c.vt = sol.vt;
        else c.ft = sol.c >= c.thr ? Math.max(0.45, 0.82 - 1.2 * (sol.c - c.thr)) : 1;
      }
      if (Sx.spec === 'rbc') {
        if (c.burst) { c.bt += dt; return; }
        c.v = approach(c.v, c.vt, dt, c.vt > c.v ? 0.55 : 0.8);
        if (c.v > 1.5) { c.burst = true; c.bt = 0; for (let k = 0; k < 9; k++) { const a = k / 9 * TAU + Math.random() * 0.5; parts.emit({ x: c.x, y: c.y, vx: Math.cos(a) * 70, vy: Math.sin(a) * 70, life: 0.9, size: 3 + Math.random() * 2, color: '#ef4444', drag: 2.5, shape: 'circle' }); } Sound.click(); }
      } else c.f = approach(c.f, c.ft, dt, 1.4);
    });
  }
  function drawRBC(c) {
    const v = c.v, r = c.r0 * (0.78 + 0.22 * clamp(v, 0.6, 1.5));
    if (c.burst) {
      ctx.save(); ctx.globalAlpha = 0.5 * Math.max(0.55, 1 - c.bt * 0.1); ctx.strokeStyle = '#f87171'; ctx.lineWidth = 2; ctx.fillStyle = 'rgba(254,226,226,.55)'; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.arc(c.x, c.y, c.r0 * 1.12, 0, TAU); ctx.fill(); ctx.stroke(); ctx.restore(); return;
    }
    ctx.save(); ctx.translate(c.x, c.y);
    const crn = clamp((0.9 - v) / 0.3, 0, 1), sph = clamp((v - 1.1) / 0.35, 0, 1);
    ctx.beginPath();
    if (crn > 0.02) { const n = 16; for (let k = 0; k < n * 2; k++) { const a = k / (n * 2) * TAU + c.ph, rr = r * (k % 2 ? 0.93 : 1 + 0.2 * crn); ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } ctx.closePath(); }
    else ctx.arc(0, 0, r, 0, TAU);
    const g = ctx.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r * 1.05);
    g.addColorStop(0, C.mix('#fca5a5', '#fecaca', sph)); g.addColorStop(0.7, C.mix('#ef4444', '#f87171', sph)); g.addColorStop(1, '#b91c1c');
    ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = '#991b1b'; ctx.lineWidth = 1.8; ctx.stroke();
    const dim = clamp((1.18 - v) / 0.3, 0, 1);
    if (dim > 0.02) { ctx.globalAlpha = 0.85 * dim; const dg = ctx.createRadialGradient(0, 0, 1, 0, 0, r * 0.55); dg.addColorStop(0, '#fecaca'); dg.addColorStop(1, 'rgba(254,202,202,0)'); ctx.fillStyle = dg; ctx.beginPath(); ctx.arc(0, 0, r * 0.55, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; }
    if (sph > 0.05) { ctx.fillStyle = 'rgba(255,255,255,' + 0.5 * sph + ')'; ctx.beginPath(); ctx.ellipse(-r * 0.3, -r * 0.35, r * 0.25, r * 0.14, -0.6, 0, TAU); ctx.fill(); }
    ctx.restore();
  }
  function drawOnion(c) {
    const x = c.x - c.w / 2, y = c.y - c.h / 2;
    ctx.save();
    ctx.fillStyle = '#e8f1f8'; ctx.fillRect(x, y, c.w, c.h);
    const pw = (c.w - 9) * (0.55 + 0.45 * c.f), ph = (c.h - 9) * c.f, rad = Math.min(14, 6 + (1 - c.f) * 30);
    const g = ctx.createLinearGradient(c.x - pw / 2, 0, c.x + pw / 2, 0); g.addColorStop(0, '#d8b4fe'); g.addColorStop(0.5, '#a855f7'); g.addColorStop(1, '#7e22ce');
    D.roundRect(c.x - pw / 2, c.y - ph / 2, pw, ph, rad); ctx.fillStyle = g; ctx.globalAlpha = 0.82; ctx.fill(); ctx.globalAlpha = 1; ctx.strokeStyle = '#6b21a8'; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.fillStyle = 'rgba(88,28,135,.55)'; ctx.beginPath(); ctx.arc(c.x - pw * 0.12, c.y + ph * 0.1, 4 * LS + 1, 0, TAU); ctx.fill();
    ctx.lineJoin = 'miter'; ctx.strokeStyle = '#8b6b2f'; ctx.lineWidth = 4.5 * LS + 0.5; ctx.strokeRect(x, y, c.w, c.h);
    ctx.restore();
  }
  function drawSlideScene(t) {
    const Sx = S.sc, R = SC_R, G = slideG(), sol = SOLS[Sx.spec][Sx.sol];
    panel(R.x, R.y, R.w, R.h, 18, '#f6fafc');
    T(R.x + 16, R.y + 26, '슬라이드 만들기', L(15, 14), '#334155', 'left', 800);
    // 유리 슬라이드
    D.shadow(() => { D.roundRect(G.sx, G.sy, G.sw, G.sh, 6); ctx.fillStyle = 'rgba(200,225,240,.7)'; ctx.fill(); }, { blur: 6, y: 3 });
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; D.roundRect(G.sx, G.sy, G.sw, G.sh, 6); ctx.stroke();
    // 용액 (왼쪽에서 오른쪽으로 번져요)
    let front = G.sx - 10;
    if (Sx.phase === 'dropped') front = G.cx;
    if (Sx.phase === 'flowing') front = lerp(G.cx, G.cx + G.cw, smooth(Sx.flow));
    if (Sx.phase === 'done') front = G.cx + G.cw;
    if (Sx.phase !== 'idle') {
      ctx.save(); ctx.globalAlpha = 0.75; ctx.fillStyle = sol.col; ctx.strokeStyle = 'rgba(30,90,150,.5)'; ctx.lineWidth = 2;
      const wob = RM ? 0 : Math.sin(t * 4) * 2; ctx.beginPath(); ctx.moveTo(G.sx + 4, G.sy + 6); ctx.lineTo(front, G.sy + 6 + wob); ctx.lineTo(front, G.sy + G.sh - 6 - wob); ctx.lineTo(G.sx + 4, G.sy + G.sh - 6); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
    }
    // 덮개 유리 + 시료
    ctx.save(); ctx.globalAlpha = 0.65; D.roundRect(G.cx, G.cy, G.cw, G.ch, 3); ctx.fillStyle = '#eaf5fb'; ctx.fill(); ctx.strokeStyle = '#64748b'; ctx.lineWidth = 1.6; ctx.stroke(); ctx.restore();
    T(G.cx + G.cw / 2, G.cy + G.ch / 2 + 4, Sx.spec === 'rbc' ? '적혈구' : '양파 표피', 12, '#475569', 'center', 800);
    T(G.cx + G.cw / 2, G.sy - 8, '덮개 유리', 12, '#64748b', 'center', 700);
    // 구역 표시
    [[G.dz, '① 용액', Sx.phase === 'idle'], [G.pz, '② 거름종이', Sx.phase === 'dropped']].forEach(([z, lb, on]) => {
      ctx.save(); ctx.setLineDash([5, 4]); ctx.strokeStyle = on ? '#16a34a' : 'rgba(100,116,139,.5)'; ctx.lineWidth = on ? 3 : 1.6; D.roundRect(z.x + 2, z.y + 2, z.w - 4, z.h - 4, 6); ctx.stroke(); ctx.restore();
      T(z.x + z.w / 2, z.y + z.h + 17, lb, 12.5, on ? '#15803d' : '#64748b', 'center', 800);
    });
    // 떨어지는 방울
    if (Sx.phase === 'dropped' && Sx.drop < 1) { const q = Sx.drop; ctx.save(); ctx.globalAlpha = 1 - q * q; ctx.fillStyle = sol.col; ctx.strokeStyle = '#2a6fbf'; ctx.beginPath(); ctx.arc(G.dz.x + G.dz.w / 2, lerp(G.sy - 40, G.sy + 18, q), 6, 0, TAU); ctx.fill(); ctx.stroke(); ctx.restore(); }
    // 도구 (스포이트 · 거름종이)
    const tp = TOOLP();
    ['dropper', 'paper'].forEach((k) => {
      const tl = Sx.tools[k], dragging = Sx.drag && Sx.drag.k === k && Sx.drag.moved;
      const x = tl.x, y = tl.y, s = (1 + tl.lift * 0.12) * (PHONE ? 0.72 : 1); ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
      if (tl.lift > 0.1) { ctx.shadowColor = 'rgba(0,0,0,.3)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 6; }
      if (k === 'dropper') {
        ctx.fillStyle = '#fee2e2'; ctx.strokeStyle = '#b91c1c'; ctx.lineWidth = 2; D.roundRect(-9, -50, 18, 20, 8); ctx.fill(); ctx.stroke();
        ctx.fillStyle = sol.col; ctx.strokeStyle = '#64748b'; D.roundRect(-6, -30, 12, 52, 4); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-6, 22); ctx.lineTo(0, 36); ctx.lineTo(6, 22); ctx.closePath(); ctx.fillStyle = sol.col; ctx.fill(); ctx.stroke();
      } else {
        ctx.rotate(-0.15); ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; D.roundRect(-34, -22, 68, 44, 4); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1; for (let i = -4; i <= 4; i++) { ctx.beginPath(); ctx.moveTo(-30, i * 4.4); ctx.lineTo(30, i * 4.4 + 2); ctx.stroke(); }
      }
      ctx.restore();
      if (!dragging) T(tp[k].x, tp[k].y + (PHONE ? 30 : 54), k === 'dropper' ? '스포이트 (용액)' : '거름종이', 12.5, '#475569', 'center', 800);
    });
    if (!PHONE) T(R.x + R.w / 2, R.y + R.h - 12, '끌어서 놓거나, 눌러서 해도 돼요', 12, '#94a3b8', 'center', 700);
    if (!PHONE) {
      const dn = SOLS[Sx.spec].map((s, i) => (Sx.obs[Sx.spec][i] ? '✅ ' : '⬜ ') + s.name);
      T(R.x + 16, R.y + R.h - 64, '관찰한 조건 (' + (Sx.spec === 'rbc' ? '적혈구' : '양파 표피') + ')', 13.5, '#334155', 'left', 800);
      dn.forEach((s, i) => T(R.x + 16 + i * 118, R.y + R.h - 42, s, 12.5, Sx.obs[Sx.spec][i] ? '#15803d' : '#64748b', 'left', 800));
    }
  }
  function scDraw(dt, t) {
    scUpdate(dt);
    const Sx = S.sc, L0 = SC_L, sol = SOLS[Sx.spec][Sx.sol], G = slideG();
    panel(L0.x, L0.y, L0.w, L0.h, 18, '#1f2937');
    // 시야
    ctx.save(); ctx.beginPath(); ctx.arc(LENS.x, LENS.y, LENS.r, 0, TAU); ctx.clip();
    const bg = ctx.createRadialGradient(LENS.x, LENS.y, 10, LENS.x, LENS.y, LENS.r); bg.addColorStop(0, '#f4f9fd'); bg.addColorStop(1, '#d3e6f3'); ctx.fillStyle = bg; ctx.fillRect(LENS.x - LENS.r, LENS.y - LENS.r, LENS.r * 2, LENS.r * 2);
    const fx = LENS.x - LENS.r + 2 * LENS.r * (Sx.phase === 'done' ? 1.05 : Sx.phase === 'flowing' ? smooth(Sx.flow) : -0.05);
    if (Sx.phase !== 'idle' && Sx.phase !== 'dropped') { ctx.fillStyle = C.rgba(sol.col === '#f1f5f9' ? '#bae6fd' : sol.col, 0.28); ctx.fillRect(LENS.x - LENS.r, LENS.y - LENS.r, fx - (LENS.x - LENS.r), LENS.r * 2); }
    if (Sx.phase === 'flowing') { ctx.strokeStyle = 'rgba(37,99,235,.45)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(fx, LENS.y - LENS.r); ctx.lineTo(fx, LENS.y + LENS.r); ctx.stroke(); }
    Sx.cells.forEach((c) => { if (Sx.spec === 'rbc') drawRBC(c); else drawOnion(c); });
    ctx.restore();
    ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 12; ctx.beginPath(); ctx.arc(LENS.x, LENS.y, LENS.r + 5, 0, TAU); ctx.stroke(); ctx.strokeStyle = '#475569'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(LENS.x, LENS.y, LENS.r - 1, 0, TAU); ctx.stroke();
    D.label(L0.x + 62, L0.y + 24, '현미경 400배', { bg: 'rgba(15,23,42,.85)', size: 12.5 });
    D.label(L0.x + L0.w - 82, L0.y + 24, Sx.phase === 'idle' ? '처음 상태' : sol.name, { bg: Sx.phase === 'idle' ? '#475569' : '#0369a1', size: 12.5 });
    // 슬라이드
    drawSlideScene(t);
    // 설명
    panel(SC_C.x, SC_C.y, SC_C.w, SC_C.h, 16, '#ffffff');
    let msg;
    if (Sx.phase === 'idle') msg = '먼저 스포이트로 덮개 유리 한쪽에 용액을 떨어뜨리세요. (고른 용액: ' + sol.name + ')';
    else if (Sx.phase === 'dropped') msg = '이제 덮개 유리 반대쪽에 거름종이를 대 용액을 빨아들이세요.';
    else if (Sx.phase === 'flowing') msg = '용액이 덮개 유리 밑으로 퍼지며 세포에 닿고 있어요…';
    else if (!Sx.obs[Sx.spec][Sx.sol]) msg = '세포가 어떻게 변하는지 잠시 지켜보세요.';
    else msg = Sx.spec === 'rbc' ? ['적혈구가 부풀다가 터졌어요(용혈).', '적혈구가 양면이 오목한 원반 모양 그대로예요.', '적혈구가 쭈글쭈글 오그라들었어요.'][Sx.sol] : ['세포가 터지지 않고 세포벽까지 꽉 차 팽팽해졌어요.', '세포의 약 절반(12개 중 6개)에서 원형질이 세포벽에서 떨어졌어요.', '모든 세포에서 원형질이 세포벽에서 떨어지고 크기가 줄었어요.'][Sx.sol];
    textBlock(SC_C.x + 16, SC_C.y + 32, SC_C.w - 32, msg, L(16, 14.5), '#1f2d44', L(22, 20), 800);
    if (PHONE) { SOLS[Sx.spec].forEach((s, i) => TF(SC_C.x + 16 + i * 148, SC_C.y + SC_C.h - 14, (Sx.obs[Sx.spec][i] ? '✅ ' : '⬜ ') + s.name, 142, 12.5, 11, Sx.obs[Sx.spec][i] ? '#15803d' : '#64748b', 'left', 800)); }
  }
  const scPT = {
    down(p) {
      const Sx = S.sc, tp = TOOLP();
      for (const k of ['dropper', 'paper']) { const tl = Sx.tools[k]; if (Math.abs(p.x - tl.x) < (PHONE ? 34 : 42) && Math.abs(p.y - tl.y) < (PHONE ? 42 : 54)) { Sx.drag = { k, sx: p.x, sy: p.y, moved: false }; SciSim.tween(tl, { x: tl.x }, { duration: 0.0001 }); Sound.tick(); return true; } }
      return false;
    },
    move(p) { const Sx = S.sc, d = Sx.drag; if (!d) return; if (Math.hypot(p.x - d.sx, p.y - d.sy) > 8) d.moved = true; if (d.moved) { const tl = Sx.tools[d.k]; tl.x = clamp(p.x, 20, VW - 20); tl.y = clamp(p.y, 20, VH - 20); tl.lift = 1; } },
    up(p) {
      const Sx = S.sc, d = Sx.drag; if (!d) return; Sx.drag = null; const tl = Sx.tools[d.k], G = slideG(), tp = TOOLP();
      const back = () => SciSim.tween(tl, { x: tp[d.k].x, y: tp[d.k].y }, { duration: RM ? 0.01 : 0.35, ease: 'outBack' });
      if (!d.moved) { if (d.k === 'dropper') scDrop(); else scPaper(); return; }
      back();
      if (d.k === 'dropper' && inRect(p.x, p.y, { x: G.dz.x - 14, y: G.dz.y - 30, w: G.dz.w + 28, h: G.dz.h + 60 })) scDrop();
      else if (d.k === 'paper' && inRect(p.x, p.y, { x: G.pz.x - 14, y: G.pz.y - 30, w: G.pz.w + 28, h: G.pz.h + 60 })) scPaper();
      else if (d.k === 'dropper' || d.k === 'paper') showHint(d.k === 'dropper' ? '스포이트는 덮개 유리 왼쪽 점선 칸 위에서 놓아요.' : '거름종이는 덮개 유리 오른쪽 점선 칸 위에서 놓아요.', 3200);
    },
    hover(p) { const Sx = S.sc; return ['dropper', 'paper'].some((k) => Math.abs(p.x - Sx.tools[k].x) < (PHONE ? 34 : 42) && Math.abs(p.y - Sx.tools[k].y) < (PHONE ? 42 : 54)) ? 'grab' : 'default'; },
  };

  /* ----- 결과 정리 표 (칸을 눌러 바꿔요) ----- */
  const TB_ROWS = [
    { who: '적혈구', sol: '0.3 % NaCl', t: 0, r: 0 }, { who: '적혈구', sol: '0.9 % NaCl', t: 1, r: 1 }, { who: '적혈구', sol: '2.0 % NaCl', t: 2, r: 2 },
    { who: '양파 표피 세포', sol: '증류수', t: 0, r: 3 }, { who: '양파 표피 세포', sol: '0.3 M 설탕', t: 1, r: 4 }, { who: '양파 표피 세포', sol: '0.5 M 설탕', t: 2, r: 5 },
  ];
  const TB_T = ['저장 용액', '등장 용액', '고장 용액'];
  const TB_R = ['부풀어 터짐', '원래 모양 유지', '쭈그러듦', '팽팽해짐(터지지 않음)', '일부 원형질 분리 시작', '모든 세포 원형질 분리'];
  const TBP = PHONE ? { x: 10, y: 10, w: 460, h: 470 } : { x: 14, y: 14, w: 772, h: 420 };
  const TBX = PHONE ? [10, 150, 270] : [14, 270, 470];     // 열 시작 (조건 · 용액 종류 · 세포의 변화)
  const TBW = PHONE ? [140, 120, 200] : [256, 200, 316];
  const TBH = PHONE ? 56 : 48, TB_Y0 = TBP.y + (PHONE ? 76 : 76);
  S.tb = { sel: TB_ROWS.map(() => [-1, -1]), bad: TB_ROWS.map(() => [false, false]) };
  function tbReset() { S.tb.sel = TB_ROWS.map(() => [-1, -1]); S.tb.bad = TB_ROWS.map(() => [false, false]); updateCtl(); }
  const tbDone = () => S.tb.sel.every((s) => s[0] >= 0 && s[1] >= 0);
  const tbWrong = () => { const w = []; TB_ROWS.forEach((q, i) => { const s = S.tb.sel[i]; if (s[0] >= 0 && s[0] !== q.t) w.push([i, 0]); if (s[1] >= 0 && s[1] !== q.r) w.push([i, 1]); }); return w; };
  function tbMarkBad(list) { S.tb.bad = TB_ROWS.map(() => [false, false]); list.forEach((q) => { S.tb.bad[q[0]][q[1]] = true; }); }
  function tbDraw(dt, t) {
    panel(TBP.x, TBP.y, TBP.w, TBP.h, 18, '#ffffff');
    T(TBP.x + 16, TBP.y + 30, '관찰 결과 정리 – 칸을 눌러 알맞은 말로 바꿔요', L(16, 14), '#334155', 'left', 800);
    ['조건', '용액 종류', '세포의 변화'].forEach((h, i) => { D.roundRect(TBX[i] + 4, TB_Y0 - 22, TBW[i] - 8, 26, 8); ctx.fillStyle = '#eef2f7'; ctx.fill(); T(TBX[i] + TBW[i] / 2, TB_Y0 - 4, h, 14, '#475569', 'center', 800); });
    TB_ROWS.forEach((q, i) => {
      const y = TB_Y0 + 10 + i * TBH + (i >= 3 ? 8 : 0);
      D.roundRect(TBX[0] + 4, y, TBW[0] - 8, TBH - 8, 10); ctx.fillStyle = i < 3 ? '#fff1f2' : '#f5f3ff'; ctx.fill();
      T(TBX[0] + 14, y + (TBH - 8) / 2 - 2, q.who, L(14.5, 13), '#26324a', 'left', 800); T(TBX[0] + 14, y + (TBH - 8) / 2 + 16, q.sol, L(14, 12.5), '#475569', 'left', 700);
      [0, 1].forEach((c) => {
        const sel = S.tb.sel[i][c], bad = S.tb.bad[i][c], x = TBX[c + 1] + 4, w = TBW[c + 1] - 8;
        D.roundRect(x, y, w, TBH - 8, 10); ctx.fillStyle = bad ? '#fdeceb' : sel >= 0 ? '#ecfdf5' : '#ffffff'; ctx.fill(); ctx.setLineDash(sel >= 0 ? [] : [6, 4]); ctx.strokeStyle = bad ? '#e2464b' : sel >= 0 ? '#16a34a' : '#94a3b8'; ctx.lineWidth = bad ? 3 : 2; ctx.stroke(); ctx.setLineDash([]);
        const label = sel >= 0 ? (c === 0 ? TB_T : TB_R)[sel] : '눌러서 고르기';
        TF(x + w / 2, y + (TBH - 8) / 2 + 5, label, w - 16, L(15, 13.5), 11, sel >= 0 ? '#14532d' : '#94a3b8', 'center', 800);
      });
    });
    TF(TBP.x + 16, TBP.y + TBP.h - 14, '적혈구는 0.9 % NaCl, 양파 표피 세포는 세포액과 농도가 비슷한 설탕 용액을 보며 생각해 봐요.', TBP.w - 32, L(13, 12), 10.5, '#64748b', 'left', 700);
  }
  function tbHit(p) {
    for (let i = 0; i < TB_ROWS.length; i++) {
      const y = TB_Y0 + 10 + i * TBH + (i >= 3 ? 8 : 0);
      for (let c = 0; c < 2; c++) if (p.x >= TBX[c + 1] + 4 && p.x <= TBX[c + 1] + TBW[c + 1] - 4 && p.y >= y && p.y <= y + TBH - 8) return [i, c];
    }
    return null;
  }
  const tbPT = {
    down(p) { const h = tbHit(p); if (h) { S.tb.dn = h; return true; } return false; },
    up(p) { const d = S.tb.dn; S.tb.dn = null; if (!d) return; const h = tbHit(p); if (!h || h[0] !== d[0] || h[1] !== d[1]) return; const n = d[1] === 0 ? TB_T.length : TB_R.length; S.tb.sel[d[0]][d[1]] = (S.tb.sel[d[0]][d[1]] + 1) % n; S.tb.bad[d[0]][d[1]] = false; Sound.click(); updateCtl(); },
    hover(p) { return tbHit(p) ? 'pointer' : 'default'; },
  };


  /* =========================================================
     ③ 농도 추정 : 양파 표피 한계 원형질 분리 농도, 감자 막대, 오차 줄이기
     ========================================================= */
  const LM_C = [0.1, 0.2, 0.3, 0.4, 0.5];
  const GRD = PHONE ? { x: 10, y: 10, w: 460, h: 298 } : { x: 14, y: 14, w: 306, h: 346 };
  const LGR = PHONE ? { x: 10, y: 316, w: 460, h: 224 } : { x: 330, y: 14, w: 456, h: 346 };
  const LCP = PHONE ? { x: 10, y: 548, w: 460, h: 82 } : { x: 14, y: 372, w: 772, h: 174 };
  /* 세포 100개: 한계 농도가 0.15(8개) · 0.25(42개) · 0.35(42개) · 0.45(8개) → 0.2 M 8 %, 0.3 M 50 %, 0.4 M 92 %, 0.5 M 100 % */
  const LM_THR = (() => { const a = []; [[0.15, 8], [0.25, 42], [0.35, 42], [0.45, 8]].forEach(([v, n]) => { for (let i = 0; i < n; i++) a.push(v); }); const rr = mulberry(31); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rr() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; })();
  const lmCountAt = (c) => LM_THR.filter((v) => c >= v).length;
  S.lm = { ci: 0, f: LM_THR.map(() => 1), sweep: -1, cnt: 0, rec: {}, cur: 0.2, est: null, drag: false, msg: '', shake: 0 };
  const lmRecCount = () => Object.keys(S.lm.rec).length;
  function lmPick(ci) { if (S.lm.sweep >= 0) return; S.lm.ci = ci; Sound.click(); updateCtl(); }
  function lmCount() {
    if (S.lm.sweep >= 0) return; S.lm.sweep = 0; S.lm.cnt = 0; Sound.click(); updateCtl();
  }
  function lmReset() { S.lm.rec = {}; S.lm.est = null; S.lm.sweep = -1; S.lm.cnt = 0; S.lm.msg = ''; updateCtl(); }
  function lmEstimate() {
    const q = S.lm;
    if (lmRecCount() < 5) { q.msg = '먼저 5가지 농도에서 모두 세어 기록해요. (' + lmRecCount() + ' / 5)'; showHint(q.msg, 3600); return; }
    if (Math.abs(q.cur - 0.3) <= 0.0101) { q.est = Math.round(q.cur * 100) / 100; q.msg = '세포액 농도를 약 ' + q.est.toFixed(2) + ' M로 추정했어요.'; Sound.success(); parts.burst(LGR.x + LGR.w / 2, LGR.y + LGR.h / 2, { count: 16, speed: 170 }); }
    else { q.est = null; q.shake = 1; Sound.fail(); q.msg = '커서 위치(' + q.cur.toFixed(2) + ' M)에서는 세포의 ' + lmPctAt(q.cur) + ' %가 원형질 분리를 했어요. 50 %가 되는 농도를 찾아요.'; showHint(q.msg, 4200); }
    updateCtl();
  }
  function lmPctAt(x) {
    const pts = LM_C.filter((c) => S.lm.rec[c] != null).map((c) => [c, S.lm.rec[c]]);
    if (pts.length < 2) return null;
    if (x <= pts[0][0]) return pts[0][1]; if (x >= pts[pts.length - 1][0]) return pts[pts.length - 1][1];
    for (let i = 0; i < pts.length - 1; i++) if (x >= pts[i][0] && x <= pts[i + 1][0]) return Math.round(lerp(pts[i][1], pts[i + 1][1], (x - pts[i][0]) / (pts[i + 1][0] - pts[i][0])));
    return null;
  }
  function lmUpdate(dt) {
    const q = S.lm, c = LM_C[q.ci];
    q.f.forEach((f, i) => { const tgt = c >= LM_THR[i] ? 0.55 : 1; q.f[i] = approach(f, tgt, dt, 4); });
    if (q.sweep >= 0) {
      q.sweep += dt * (RM ? 200 : 38);
      const n = Math.min(100, Math.floor(q.sweep)); let k = 0; for (let i = 0; i < n; i++) if (c >= LM_THR[i]) k++; q.cnt = k;
      if (q.sweep >= 100) { q.rec[c] = lmCountAt(c); q.sweep = -1; q.cnt = q.rec[c]; Sound.success(); parts.burst(LGR.x + LGR.w * 0.5, LGR.y + LGR.h * 0.5, { count: 8, speed: 130, size: 3 }); updateCtl(); }
    }
    q.shake = Math.max(0, q.shake - dt * 3);
  }
  function lmCS() { return 24; }
  function lmCell(i) { const cs = lmCS(), gx = GRD.x + (PHONE ? 18 : (GRD.w - 10 * cs) / 2), gy = GRD.y + 46; return { x: gx + (i % 10) * cs, y: gy + Math.floor(i / 10) * cs, cs }; }
  /* 공통 그래프 틀 (x: 농도, y: 값) */
  function plotFrame(R, xmax, ymin, ymax, xt, yt, xl, yl) {
    const x0 = R.x + 52, x1 = R.x + R.w - 20, y0 = R.y + R.h - 38, y1 = R.y + 44;
    const X = (v) => lerp(x0, x1, v / xmax), Y = (v) => lerp(y0, y1, (v - ymin) / (ymax - ymin));
    ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1;
    yt.forEach((v) => { ctx.beginPath(); ctx.moveTo(x0, Y(v)); ctx.lineTo(x1, Y(v)); ctx.stroke(); T(x0 - 7, Y(v) + 4, String(v), 12, '#64748b', 'right', 700); });
    xt.forEach((v) => { ctx.beginPath(); ctx.moveTo(X(v), y0); ctx.lineTo(X(v), y0 + 4); ctx.stroke(); T(X(v), y0 + 16, v.toFixed(1), 12, '#64748b', 'center', 700); });
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(x0, y1 - 4); ctx.lineTo(x0, y0 + (ymin < 0 ? 0 : 0)); ctx.lineTo(x1, y0); ctx.stroke();
    T((x0 + x1) / 2, R.y + R.h - 6, xl, 12.5, '#64748b', 'center', 700); T(R.x + 8, R.y + 56, yl, 12.5, '#64748b', 'left', 700);
    return { x0, x1, y0, y1, X, Y, xOf: (px) => (px - x0) / (x1 - x0) * xmax };
  }
  function lmDraw(dt, t) {
    lmUpdate(dt);
    const q = S.lm, c = LM_C[q.ci];
    panel(GRD.x, GRD.y, GRD.w, GRD.h, 16, '#ffffff');
    T(GRD.x + 14, GRD.y + 26, '양파 표피 세포 100개 · 설탕 ' + fmtM(c), L(14.5, 13.5), '#334155', 'left', 800);
    for (let i = 0; i < 100; i++) {
      const cc = lmCell(i), f = q.f[i], pl = c >= LM_THR[i];
      ctx.fillStyle = '#e8f1f8'; ctx.fillRect(cc.x, cc.y, cc.cs - 2, cc.cs - 2);
      const s = (cc.cs - 6) * f, g = (cc.cs - 2) / 2;
      D.roundRect(cc.x + g - s / 2, cc.y + g - s / 2, s, s, 3 + (1 - f) * 8); ctx.fillStyle = '#a855f7'; ctx.globalAlpha = 0.85; ctx.fill(); ctx.globalAlpha = 1;
      ctx.strokeStyle = '#8b6b2f'; ctx.lineWidth = 1.6; ctx.strokeRect(cc.x, cc.y, cc.cs - 2, cc.cs - 2);
      if (q.sweep >= 0 && i < q.sweep && pl) { ctx.fillStyle = '#facc15'; ctx.beginPath(); ctx.arc(cc.x + g, cc.y + g, 3.4, 0, TAU); ctx.fill(); }
    }
    if (q.sweep >= 0) { const cc = lmCell(Math.min(99, Math.floor(q.sweep))); ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 3; ctx.strokeRect(cc.x - 2, cc.y - 2, cc.cs + 2, cc.cs + 2); }
    const done = q.rec[c] != null, shownCnt = q.sweep >= 0 ? q.cnt : (done ? q.rec[c] : null);
    if (!PHONE) {
      T(GRD.x + 16, GRD.y + GRD.h - 46, '원형질 분리한 세포', 14, '#475569', 'left', 800);
      T(GRD.x + GRD.w - 16, GRD.y + GRD.h - 12, shownCnt == null ? '— / 100' : shownCnt + ' / 100', 26, shownCnt == null ? '#94a3b8' : '#7c3aed', 'right', 800);
    } else {
      T(GRD.x + GRD.w - 14, GRD.y + 74, '원형질 분리한 세포', 14, '#475569', 'right', 800);
      T(GRD.x + GRD.w - 14, GRD.y + 112, shownCnt == null ? '— / 100' : shownCnt + ' / 100', 28, shownCnt == null ? '#94a3b8' : '#7c3aed', 'right', 800);
      textBlock(GRD.x + 290, GRD.y + 140, 160, '보라색 속이 세포벽에서 떨어진 세포를 세요.', 13, '#64748b', 18, 700);
    }
    // 그래프
    panel(LGR.x, LGR.y, LGR.w, LGR.h, 16, '#ffffff');
    T(LGR.x + 14, LGR.y + 24, '원형질 분리 세포 비율 (%) – 설탕 용액 농도 (M)', L(14.5, 13), '#334155', 'left', 800);
    const gf = plotFrame(LGR, 0.6, 0, 100, [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6], [0, 25, 50, 75, 100], '설탕 용액 농도 (M)', '%');
    D.dashedLine(gf.x0, gf.Y(50), gf.x1, gf.Y(50), { color: '#16a34a', width: 1.8, dash: [6, 5] }); T(gf.x1, gf.Y(50) - 6, '50 %', 12.5, '#15803d', 'right', 800);
    const pts = LM_C.filter((v) => q.rec[v] != null).map((v) => [v, q.rec[v]]);
    if (pts.length > 1) { ctx.strokeStyle = '#7c3aed'; ctx.lineWidth = 2.6; ctx.lineJoin = 'round'; ctx.beginPath(); pts.forEach((p, i) => { if (i) ctx.lineTo(gf.X(p[0]), gf.Y(p[1])); else ctx.moveTo(gf.X(p[0]), gf.Y(p[1])); }); ctx.stroke(); }
    pts.forEach((p) => { D.sphere(gf.X(p[0]), gf.Y(p[1]), 6.5, '#7c3aed', { gloss: true }); T(gf.X(p[0]), gf.Y(p[1]) - 12, p[1] + '', 12, '#5b21b6', 'center', 800); });
    // 커서
    const cx = gf.X(q.cur); ctx.save(); ctx.strokeStyle = q.shake > 0 ? '#dc2626' : '#f97316'; ctx.lineWidth = 2.6; ctx.setLineDash([2, 0]); ctx.beginPath(); ctx.moveTo(cx, gf.y1 - 4); ctx.lineTo(cx, gf.y0); ctx.stroke(); ctx.restore();
    D.sphere(cx, gf.y0, 8, '#f97316', { gloss: true, shadow: true });
    const pv = lmPctAt(q.cur);
    D.label(clamp(cx, gf.x0 + 70, gf.x1 - 70), gf.y1 + 6, '커서 ' + q.cur.toFixed(2) + ' M · ' + (pv == null ? '—' : pv + ' %'), { bg: '#f97316', size: 12.5 });
    if (q.est != null) D.label((gf.x0 + gf.x1) / 2, gf.y1 + 38, '추정: 세포액 ≈ ' + q.est.toFixed(2) + ' M', { bg: '#16a34a', size: 13.5 });
    // 설명
    panel(LCP.x, LCP.y, LCP.w, LCP.h, 16, '#ffffff');
    if (!PHONE) {
      T(LCP.x + 16, LCP.y + 30, '한계 원형질 분리 농도로 세포액의 농도 추정하기', 15.5, '#334155', 'left', 800);
      const rows = LM_C.map((v) => (q.rec[v] != null ? '✅ ' : '⬜ ') + fmtM(v) + (q.rec[v] != null ? ': ' + q.rec[v] + ' %' : ''));
      rows.forEach((s, i) => T(LCP.x + 16 + i * 150, LCP.y + 60, s, 14, q.rec[LM_C[i]] != null ? '#15803d' : '#64748b', 'left', 800));
      textBlock(LCP.x + 16, LCP.y + 92, LCP.w - 32, q.est != null ? '세포의 50 %가 원형질 분리를 일으키는 농도(한계 원형질 분리 농도)는 약 0.30 M이에요. 이 농도의 용액이 세포액과 등장이라서 양파 세포액의 농도는 약 0.3 M(설탕 용액 기준)이에요.' : '① 농도를 고르고 [🔍 세어서 기록]을 눌러요. 5가지를 모두 기록한 뒤, ② 그래프에서 커서를 끌어 50 % 지점에 놓고 [✔ 추정값으로 정하기]를 눌러요.', 14.5, q.est != null ? '#15803d' : '#475569', 21, 800);
    } else {
      textBlock(LCP.x + 12, LCP.y + 24, LCP.w - 24, q.est != null ? '한계 원형질 분리 농도 약 0.30 M → 세포액 ≈ 0.3 M (설탕 용액 기준)' : '5가지 농도를 모두 세어 기록하고, 그래프 커서를 50 % 지점에 놓아요.', 13.5, q.est != null ? '#15803d' : '#475569', 19, 800);
    }
  }
  const lmCursorFromPt = (p) => { const gf = { x0: LGR.x + 52, x1: LGR.x + LGR.w - 20 }; return clamp(Math.round((p.x - gf.x0) / (gf.x1 - gf.x0) * 0.6 * 100) / 100, 0.05, 0.55); };
  const lmPT = {
    down(p) { if (inRect(p.x, p.y, LGR) && p.y > LGR.y + 36) { S.lm.drag = true; S.lm.cur = lmCursorFromPt(p); return true; } return false; },
    move(p) { if (S.lm.drag) S.lm.cur = lmCursorFromPt(p); },
    up(p) { if (S.lm.drag) { S.lm.drag = false; S.lm.cur = lmCursorFromPt(p); Sound.tick(); updateCtl(); } },
    hover(p) { return inRect(p.x, p.y, LGR) ? 'ew-resize' : 'default'; },
  };

  /* ----- 감자 막대 질량 변화 ----- */
  const PT_X = [0, 0.1, 0.2, 0.3, 0.4, 0.5], PT_Y = [12, 7, 2, -4, -10, -15];
  const PTG = PHONE ? { x: 10, y: 10, w: 460, h: 420 } : { x: 14, y: 14, w: 772, h: 370 };
  const PTC = PHONE ? { x: 10, y: 440, w: 460, h: 190 } : { x: 14, y: 396, w: 772, h: 150 };
  S.pt = { cur: 0.1, est: null, drag: false, msg: '', shake: 0 };
  function ptAt(x) { for (let i = 0; i < PT_X.length - 1; i++) if (x >= PT_X[i] && x <= PT_X[i + 1]) return lerp(PT_Y[i], PT_Y[i + 1], (x - PT_X[i]) / (PT_X[i + 1] - PT_X[i])); return x < 0 ? PT_Y[0] : PT_Y[PT_Y.length - 1]; }
  function ptEstimate() {
    const q = S.pt;
    if (Math.abs(ptAt(q.cur)) <= 1.6) { q.est = Math.round(q.cur * 100) / 100; q.msg = '질량 변화가 0에 가까운 농도, 약 0.23 M로 추정했어요.'; Sound.success(); parts.burst(PTG.x + PTG.w / 2, PTG.y + PTG.h / 2, { count: 16, speed: 170 }); }
    else { q.est = null; q.shake = 1; Sound.fail(); const v = ptAt(q.cur); q.msg = '커서 위치(' + q.cur.toFixed(2) + ' M)에서는 질량이 ' + (v >= 0 ? '+' : '') + v.toFixed(1) + ' % 변해요. 질량 변화가 0이 되는 농도를 찾아요.'; showHint(q.msg, 4200); }
    updateCtl();
  }
  function ptDraw(dt, t) {
    const q = S.pt; q.shake = Math.max(0, q.shake - dt * 3);
    panel(PTG.x, PTG.y, PTG.w, PTG.h, 16, '#ffffff');
    T(PTG.x + 16, PTG.y + 28, '감자 막대의 질량 변화(%) – 설탕 용액 농도(M)', L(15.5, 14), '#334155', 'left', 800);
    const gf = plotFrame(PTG, 0.55, -20, 20, [0, 0.1, 0.2, 0.3, 0.4, 0.5], [-20, -10, 0, 10, 20], '설탕 용액 농도 (M)', '%');
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(gf.x0, gf.Y(0)); ctx.lineTo(gf.x1, gf.Y(0)); ctx.stroke(); T(gf.x1, gf.Y(0) - 6, '변화 0', 12.5, '#334155', 'right', 800);
    ctx.fillStyle = 'rgba(22,163,74,.08)'; ctx.fillRect(gf.x0, gf.y1 - 4, gf.x1 - gf.x0, gf.Y(0) - gf.y1 + 4); T(gf.x1 - 8, gf.y1 + 14, '질량 증가 (물이 들어옴)', 12.5, '#15803d', 'right', 800);
    ctx.fillStyle = 'rgba(220,38,38,.07)'; ctx.fillRect(gf.x0, gf.Y(0), gf.x1 - gf.x0, gf.y0 - gf.Y(0)); T(gf.x0 + 12, gf.y0 - 8, '질량 감소 (물이 빠져나감)', 12.5, '#b91c1c', 'left', 800);
    ctx.strokeStyle = '#2563eb'; ctx.lineWidth = 2.8; ctx.lineJoin = 'round'; ctx.beginPath(); PT_X.forEach((x, i) => { if (i) ctx.lineTo(gf.X(x), gf.Y(PT_Y[i])); else ctx.moveTo(gf.X(x), gf.Y(PT_Y[i])); }); ctx.stroke();
    PT_X.forEach((x, i) => { D.sphere(gf.X(x), gf.Y(PT_Y[i]), 6.5, '#2563eb', { gloss: true }); T(gf.X(x), gf.Y(PT_Y[i]) + (PT_Y[i] >= 0 ? -12 : 20), (PT_Y[i] > 0 ? '+' : '') + PT_Y[i] + ' %', 12.5, '#1e3a8a', 'center', 800); });
    const cx = gf.X(q.cur); ctx.save(); ctx.strokeStyle = q.shake > 0 ? '#dc2626' : '#f97316'; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(cx, gf.y1 - 4); ctx.lineTo(cx, gf.y0); ctx.stroke(); ctx.restore();
    D.sphere(cx, gf.Y(0), 8, '#f97316', { gloss: true, shadow: true });
    const v = ptAt(q.cur);
    D.label(clamp(cx, gf.x0 + 90, gf.x1 - 90), gf.y1 + 34, '커서 ' + q.cur.toFixed(2) + ' M · 질량 ' + (v >= 0 ? '+' : '') + v.toFixed(1) + ' %', { bg: '#f97316', size: 12.5 });
    if (q.est != null) D.label(clamp(cx, gf.x0 + 100, gf.x1 - 100), gf.Y(0) + 38, '추정: 감자 세포액 ≈ 0.23 M', { bg: '#16a34a', size: 13.5 });
    panel(PTC.x, PTC.y, PTC.w, PTC.h, 16, '#ffffff');
    const dn = S.lm.est != null;
    textBlock(PTC.x + 16, PTC.y + 30, PTC.w - 32, q.est != null ? '질량 변화가 0이 되는 농도는 0.2 M와 0.3 M 사이, 약 0.23 M이에요. 이 농도의 용액이 감자 세포액과 등장이에요.' + (dn ? ' 양파(약 0.30 M)와 감자(약 0.23 M)는 세포액의 농도가 서로 달라요.' : '') : '질량이 늘다가 줄어드는 그래프가 x축(변화 0)과 만나는 곳으로 커서를 끌어서 놓고 [✔ 0이 되는 농도로 정하기]를 눌러요.', L(15, 14), q.est != null ? '#15803d' : '#475569', L(21, 20), 800);
    if (q.est != null) textBlock(PTC.x + 16, PTC.y + L(106, 126), PTC.w - 32, '0.3 M 용액에서 질량이 4 % 줄어든 것은 감자 세포액이 0.3 M 용액보다 묽어서 물이 세포 밖으로 빠져나갔기 때문이에요.', L(14, 13.5), '#475569', L(20, 19), 700);
  }
  const ptCursorFromPt = (p) => clamp(Math.round((p.x - (PTG.x + 52)) / ((PTG.x + PTG.w - 20) - (PTG.x + 52)) * 0.55 * 100) / 100, 0, 0.5);
  const ptPT = {
    down(p) { if (inRect(p.x, p.y, PTG) && p.y > PTG.y + 36) { S.pt.drag = true; S.pt.cur = ptCursorFromPt(p); return true; } return false; },
    move(p) { if (S.pt.drag) S.pt.cur = ptCursorFromPt(p); },
    up(p) { if (S.pt.drag) { S.pt.drag = false; S.pt.cur = ptCursorFromPt(p); Sound.tick(); updateCtl(); } },
    hover(p) { return inRect(p.x, p.y, PTG) ? 'ew-resize' : 'default'; },
  };

  /* ----- 오차를 줄이는 방법 고르기 (카드를 상자에 넣기) ----- */
  const ERRS = [
    { id: 'n', label: '관찰하는 세포 수를 늘려요', short: '세포 수 늘리기', z: 'good' },
    { id: 'tm', label: '모든 시료를 같은 시간 동안 담가요', short: '같은 시간 담그기', z: 'good' },
    { id: 'rep', label: '같은 조건에서 여러 번 재어 평균을 내요', short: '반복해 평균 내기', z: 'good' },
    { id: 'gap', label: '농도 간격을 촘촘하게 나눠요', short: '농도 간격 촘촘히', z: 'good' },
    { id: 'tm2', label: '시료마다 담그는 시간을 다르게 해요', short: '시간을 다르게', z: 'bad' },
    { id: 'few', label: '세포 10개만 세고 끝내요', short: '세포 10개만 세기', z: 'bad' },
  ];
  const ERR = {}; ERRS.forEach((e) => { ERR[e.id] = e; });
  const EBX = PHONE ? { x: 10, y: 10, w: 460, h: 232 } : { x: 14, y: 14, w: 772, h: 236 };
  const ETRAY = PHONE ? { x: 10, y: 252, w: 460, h: 378 } : { x: 14, y: 262, w: 772, h: 284 };
  const errS = new Sorter({
    cards: [4, 0, 5, 2, 1, 3].map((i) => ({ id: ERRS[i].id, label: ERRS[i].label, short: ERRS[i].short, col: '#0d9488' })),
    boxes: [['good', '오차를 줄이는 방법', '#16a34a'], ['bad', '오차를 키우는 방법', '#dc2626']].map((b, i) => { const gap = 12, bw = (EBX.w - gap) / 2; return { id: b[0], label: b[1], col: b[2], x: EBX.x + i * (bw + gap), y: EBX.y, w: bw, h: EBX.h, cols: 1, hdr: 34 }; }),
    cw: PHONE ? 440 : 360, ch: 52, kh: PHONE ? 34 : 38,
    tray: (i) => (PHONE ? { x: 20, y: 300 + i * 52 } : { x: 28 + (i % 2) * 378, y: 306 + Math.floor(i / 2) * 68 }),
    onChange() { updateCtl(); },
  });
  const errWrong = () => errS.cards.filter((c) => c.zone && c.zone !== ERR[c.id].z);
  function errDraw(dt, t) {
    errS.update(dt); errS.drawBoxes();
    panel(ETRAY.x, ETRAY.y, ETRAY.w, ETRAY.h, 16, '#ffffff');
    T(ETRAY.x + 16, ETRAY.y + 28, '실험의 오차를 줄이는 방법과 키우는 방법을 나눠요', L(15, 13.5), '#334155', 'left', 800);
    errS.drawCards();
  }
  const errPT = { down: (p) => errS.down(p), move: (p) => errS.move(p), up: (p) => errS.up(p), hover: (p) => errS.hover(p) };


  /* =========================================================
     ④ 삼투 적용 : 생활 속 삼투 상황 판단
     ========================================================= */
  const CARDS = [
    { id: 'cab', short: '배추 절이기', label: '배추를 소금에 절여요', z: 'hyper', out: '굵은 소금을 뿌려 아주 진한 소금물이 돼요.', inn: '배추 세포의 세포액은 그보다 훨씬 묽어요.', res: '배추 세포에서 물이 빠져나와 배추의 숨이 죽어요(원형질 분리).' },
    { id: 'fer', short: '비료 많은 화분', label: '비료를 너무 많이 준 화분이 시들어요', z: 'hyper', out: '흙 속 비료 용액의 농도가 아주 높아요.', inn: '뿌리털 세포의 세포액이 더 묽어요.', res: '뿌리 세포에서 물이 빠져나가 식물이 시들어요.' },
    { id: 'sea', short: '바닷물 마시면', label: '바닷물을 마시면 갈증이 나요', z: 'hyper', out: '바닷물(약 3.5 %)이 체액(약 0.9 %)보다 훨씬 진해요.', inn: '몸의 세포액은 약 0.9 % 수준이에요.', res: '세포에서 물이 빠져나가 세포가 쭈그러들고 갈증이 나요.' },
    { id: 'iv', short: '정맥 주사 용액', label: '정맥 주사 용액은 생리 식염수예요', z: 'iso', out: '생리 식염수는 0.9 % NaCl 용액이에요.', inn: '적혈구와 체액의 농도도 약 0.9 %예요.', res: '물의 순 이동이 없어서 적혈구가 모양을 그대로 유지해요.' },
    { id: 'let', short: '시든 상추', label: '시든 상추를 물에 담가요', z: 'hypo', out: '용질이 거의 없는 맹물이에요.', inn: '상추 세포의 세포액이 더 진해요.', res: '물이 세포 안으로 들어와 팽압이 커지고 상추가 빳빳해져요.' },
    { id: 'fish', short: '민물고기 바닷물', label: '민물고기를 바닷물에 넣어요', z: 'hyper', out: '바닷물(약 3.5 %)이에요.', inn: '민물고기 체액(약 0.9 %)이 훨씬 묽어요.', res: '몸의 세포에서 물이 빠져나가 쭈그러들어요.' },
  ];
  const CARD = {}; CARDS.forEach((c) => { CARD[c.id] = c; });
  const CDZ = { hypo: '저장 용액 상황', iso: '등장 용액 상황', hyper: '고장 용액 상황' };
  const CDB = PHONE ? { x: 10, y: 10, w: 460, h: 196 } : { x: 14, y: 14, w: 772, h: 178 };
  const CDD = PHONE ? { x: 10, y: 214, w: 460, h: 150 } : { x: 14, y: 202, w: 772, h: 100 };
  const CDT = PHONE ? { x: 10, y: 372, w: 460, h: 258 } : { x: 14, y: 312, w: 772, h: 234 };
  S.cd = { sel: null };
  const cardsS = new Sorter({
    cards: [4, 0, 3, 5, 1, 2].map((i) => ({ id: CARDS[i].id, label: CARDS[i].label, short: CARDS[i].short, col: '#0d9488' })),
    boxes: [['hypo', '저장 용액 상황', '#2563eb'], ['iso', '등장 용액 상황', '#16a34a'], ['hyper', '고장 용액 상황', '#dc2626']].map((b, i) => { const gap = 10, bw = (CDB.w - gap * 2) / 3; return { id: b[0], label: b[1], col: b[2], x: CDB.x + i * (bw + gap), y: CDB.y, w: bw, h: CDB.h, cols: 1, hdr: 34 }; }),
    cw: PHONE ? 214 : 244, ch: 50, kh: PHONE ? 34 : 32,
    tray: (i) => (PHONE ? { x: 16 + (i % 2) * 226, y: 418 + Math.floor(i / 2) * 60 } : { x: 22 + (i % 3) * 256, y: 366 + Math.floor(i / 3) * 62 }),
    isSel: (c) => S.cd.sel === c.id,
    onTap(c) { S.cd.sel = c.id; Sound.click(); },
    onChange() { updateCtl(); },
  });
  const cardsWrong = () => cardsS.cards.filter((c) => c.zone && c.zone !== CARD[c.id].z);
  function cardsDraw(dt, t) {
    cardsS.update(dt); cardsS.drawBoxes();
    panel(CDD.x, CDD.y, CDD.w, CDD.h, 16, '#fffdf5');
    const sc = S.cd.sel ? CARD[S.cd.sel] : null;
    if (!sc) textBlock(CDD.x + 16, CDD.y + 34, CDD.w - 32, '카드를 눌러 상황을 읽어 보세요. 바깥 용액과 세포액 중 어느 쪽이 더 진한지 비교해요.', L(15, 14), '#92400e', L(21, 20), 800);
    else {
      T(CDD.x + 16, CDD.y + 28, sc.label, L(16, 14.5), '#1f2d44', 'left', 800);
      const placed = cardsS.cards.find((c) => c.id === sc.id).zone === sc.z;
      textBlock(CDD.x + 16, CDD.y + 52, CDD.w - 32, '바깥: ' + sc.out + '\n세포 안: ' + sc.inn + (placed ? '\n→ ' + sc.res : ''), L(14, 13), placed ? '#15803d' : '#475569', L(19, 18), 700);
    }
    panel(CDT.x, CDT.y, CDT.w, CDT.h, 16, '#ffffff');
    T(CDT.x + 16, CDT.y + 28, '상황 카드 6장을 저장 · 등장 · 고장 용액 상황으로 나눠요', L(15, 13.5), '#334155', 'left', 800);
    cardsS.drawCards();
  }
  const cardsPT = { down: (p) => cardsS.down(p), move: (p) => cardsS.move(p), up: (p) => cardsS.up(p), hover: (p) => cardsS.hover(p) };

  /* =========================================================
     화면 전환 · 조작 연결
     ========================================================= */
  const MODE_PT = { utube: null, utq: null, scope: scPT, tbl: tbPT, limit: lmPT, potato: ptPT, err: errPT, cards: cardsPT };
  function setMode(m) {
    if (S.mode !== m) S.fade = 1;
    S.mode = m; PT = MODE_PT[m] || null;
    if (m === 'utq') { if (S.uq.state === 'done') { /* 이미 끝남 */ } else uqLoad(S.uq.i); }
    else if (m === 'utube') { S.ut.freeze = false; }
    hideHint(); updateCtl();
  }
  const ctlNodes = $$('#ctrlCard .control');
  function netDir() { const b = utB(); return S.ut.perm ? '용질도 이동' : (Math.abs(b) < 0.04 ? '없음' : b > 0 ? '오른쪽 → 왼쪽' : '왼쪽 → 오른쪽'); }
  function updateCtl() {
    const fr = game ? game.free : false, lvNow = game ? game.level : 0;
    ctlNodes.forEach((n) => { n.hidden = (n.dataset.modes || '').split(' ').indexOf(S.mode) < 0; });
    modeButtons(S.mode, lvNow, fr);
    $('#sUL').value = S.ut.cL; $('#sUR').value = S.ut.cR; $('#oUL').textContent = fmtM(S.ut.cL); $('#oUR').textContent = fmtM(S.ut.cR); chipSet($('#memSel'), S.ut.perm ? 1 : 0); $('#sUL').disabled = S.ut.perm; $('#sUR').disabled = S.ut.perm;
    const q = S.uq; $('#uqNote').innerHTML = q.state === 'done' ? '세 문제를 모두 맞혔어요! 🎉' : '문제 <b>' + (q.i + 1) + ' / 3</b> · 맞힌 문제 <b>' + q.solved.filter(Boolean).length + '개</b><br>왼쪽 <b>' + fmtM(S.ut.cL) + '</b> · 오른쪽 <b>' + fmtM(S.ut.cR) + '</b> (반투과성 막)';
    ['#uqL', '#uqR', '#uq0'].forEach((id) => { $(id).disabled = q.state !== 'ask'; });
    $$('#scSpec button').forEach((b) => b.classList.toggle('on', b.dataset.v === S.sc.spec));
    $$('#scSol button').forEach((b) => { const i = +b.dataset.v; b.textContent = SOLS[S.sc.spec][i].name; b.classList.toggle('on', i === S.sc.sol); b.classList.toggle('seen', !!S.sc.obs[S.sc.spec][i]); });
    $('#scDrop').disabled = S.sc.phase !== 'idle'; $('#scPaper').disabled = S.sc.phase !== 'dropped';
    $('#scNote').innerHTML = '관찰한 조건 <b>' + scObsCount() + ' / 6</b> · 단계: <b>' + ({ idle: '① 용액 떨어뜨리기', dropped: '② 거름종이 대기', flowing: '용액이 퍼지는 중', done: '관찰 중 / 완료' })[S.sc.phase] + '</b>';
    $$('#lmSel button').forEach((b) => { b.classList.toggle('on', +b.dataset.v === S.lm.ci); b.classList.toggle('seen', S.lm.rec[LM_C[+b.dataset.v]] != null); b.disabled = S.lm.sweep >= 0; });
    $('#lmCount').disabled = S.lm.sweep >= 0; $('#lmCount').textContent = S.lm.sweep >= 0 ? '세는 중…' : '🔍 세어서 기록';
    $('#lmNote').innerHTML = '기록한 농도 <b>' + lmRecCount() + ' / 5</b> · 추정값 <b>' + (S.lm.est != null ? S.lm.est.toFixed(2) + ' M' : '아직') + '</b>';
    $('#ptNote').innerHTML = '커서 <b>' + S.pt.cur.toFixed(2) + ' M</b> · 추정값 <b>' + (S.pt.est != null ? S.pt.est.toFixed(2) + ' M' : '아직') + '</b>';
  }
  bindModeSeg(setMode);
  $('#sUL').addEventListener('input', (e) => { if (S.mode === 'utq') return; S.ut.cL = +e.target.value; updateCtl(); });
  $('#sUR').addEventListener('input', (e) => { if (S.mode === 'utq') return; S.ut.cR = +e.target.value; updateCtl(); });
  $$('#memSel button').forEach((b) => b.addEventListener('click', () => { const nv = b.dataset.v === '1'; if (S.ut.perm && !nv) { S.ut.cL = Math.round(S.ut.eL * 10) / 10; S.ut.cR = Math.round(S.ut.eR * 10) / 10; } S.ut.perm = nv; Sound.click(); updateCtl(); }));
  $('#utReset').addEventListener('click', () => { Sound.click(); utReset(); });
  $('#uqL').addEventListener('click', () => uqAnswer('L')); $('#uqR').addEventListener('click', () => uqAnswer('R')); $('#uq0').addEventListener('click', () => uqAnswer('0'));
  $('#uqReset').addEventListener('click', () => { Sound.click(); uqReset(); });
  $$('#scSpec button').forEach((b) => b.addEventListener('click', () => { if (S.sc.phase === 'flowing') return; Sound.click(); scSetSpec(b.dataset.v); }));
  $$('#scSol button').forEach((b) => b.addEventListener('click', () => { if (S.sc.phase === 'flowing') return; Sound.click(); scSetSol(+b.dataset.v); }));
  $('#scDrop').addEventListener('click', scDrop); $('#scPaper').addEventListener('click', scPaper);
  $('#scNew').addEventListener('click', () => { if (S.sc.phase === 'flowing') return; Sound.click(); scNew(); });
  $('#tbReset').addEventListener('click', () => { Sound.click(); tbReset(); });
  $$('#lmSel button').forEach((b) => b.addEventListener('click', () => lmPick(+b.dataset.v)));
  $('#lmCount').addEventListener('click', lmCount); $('#lmEst').addEventListener('click', lmEstimate); $('#lmReset').addEventListener('click', () => { Sound.click(); lmReset(); });
  $('#ptEst').addEventListener('click', ptEstimate);
  $('#errReset').addEventListener('click', () => { Sound.click(); errS.reset(); });
  $('#cdReset').addEventListener('click', () => { Sound.click(); S.cd.sel = null; cardsS.reset(); });

  /* =========================================================
     미션
     ========================================================= */
  const levels = [
    {
      title: '삼투 모형: U자관', short: '삼투 모형', icon: '🧪', phase: '모형',
      intro: '<p class="si-q">❓ 탐구 질문: 같은 세포인데도 용액의 진하기에 따라 왜 부풀거나 쭈그러들까? 세포액의 진하기는 어떻게 알아낼 수 있을까?</p><p>🔗 <b>통합과학</b>에서 <b>삼투</b>(물이 반투과성 막을 통해 용질이 적은 쪽 → 많은 쪽으로 이동)를 정성적으로 배웠어요. 앞 차시에서는 물이 <b>아쿠아포린</b>을 통해 촉진 확산으로 빠르게 지나갈 수 있다는 것도 봤어요. 즉 <b>삼투는 물의 확산</b>이에요.</p><p>먼저 U자관으로 용질의 농도와 물의 이동, 수면의 높이를 살펴봐요. 이 차시에서 <b>삼투압</b>은 \'용액이 진할수록 물을 끌어당기는 힘이 크다\'는 정성적인 뜻으로만 써요.</p>',
      features: ['utube', 'utq'],
      setup() { setMode('utube'); },
      recap: '삼투는 반투과성 막을 사이에 두고 물이 용질이 적은 쪽에서 많은 쪽으로 순 이동하는 현상이에요. 수면이 올라가다 높이 차가 삼투압과 맞서면 순 이동이 멈추고, 농도가 같으면 순 이동이 없어요.',
      summary: '<ul><li><b>삼투</b>: 반투과성 막(물은 통과, 용질은 통과 못 함)을 사이에 두고 물이 <b>용질 농도가 낮은 쪽 → 높은 쪽</b>(물 농도가 높은 쪽 → 낮은 쪽)으로 이동. 삼투 = 물의 확산.</li><li>U자관에서 진한 쪽의 수면이 올라가다가 <b>수면 높이 차가 삼투압에 맞서면</b> 순 이동이 멈춰요.</li><li>용질도 통과하는 막이면 양쪽 농도가 같아져 수면도 같아져요.</li><li>농도가 같은 두 용액에서는 물 분자가 양방향으로 같은 수만큼 오가서 <b>순 이동이 0</b>이에요. (분자의 이동은 계속)</li></ul>',
      missions: [
        {
          id: 'levels', title: '농도를 바꾸며 수면 변화 관찰',
          goal: '🧪 화면의 슬라이더를 바꿔서 <b>왼쪽 수면 상승 · 오른쪽 수면 상승 · 농도가 같을 때 변화 없음 · 용질이 통과하는 막</b> 네 장면을 모두 관찰하세요.',
          hint: '왼쪽 0.3 M, 오른쪽 0.0 M이면 왼쪽 수면이 올라가요. 두 슬라이더를 반대로 바꾸면 오른쪽이 올라가요. 둘 다 0.3 M으로 같게 하면 수면이 그대로예요. 농도를 다시 다르게(예: 왼쪽 0.3 M, 오른쪽 0.0 M) 한 뒤 [용질도 통과하는 막]으로 바꾸면 용질이 이동해 수면이 같아져요.',
          setup() { setMode('utube'); S.ut.cL = 0.3; S.ut.cR = 0; S.ut.eL = 0.3; S.ut.eR = 0; S.ut.perm = false; S.ut.seen = { left: false, right: false, same: false, perm: false }; S.ut.same = 0; S.ut.permT = 0; utReset(); },
          check: () => S.ut.seen.left && S.ut.seen.right && S.ut.seen.same && S.ut.seen.perm, hold: 0.5,
          status: () => ['left', 'right', 'same', 'perm'].map((k) => mark(S.ut.seen[k]) + ' ' + { left: '왼쪽 수면 상승', right: '오른쪽 수면 상승', same: '농도 같음 · 변화 없음', perm: '용질이 통과하는 막' }[k]).join(' &nbsp; '),
          explain: '진한 쪽으로 물이 이동해서 <b>그쪽 수면이 올라가요</b>. 두 용액의 농도가 같으면 순 이동이 없어 수면이 그대로예요. 용질도 통과하는 막에서는 용질이 이동해 양쪽 농도가 같아지므로 수면도 같아져요. 삼투가 일어나려면 <b>용질이 통과하지 못하는 반투과성 막</b>이 필요해요.',
        },
        {
          id: 'dir3', title: '물이 이동하는 방향 맞히기',
          goal: '❓ 화면에서 문제 3개의 <b>물의 순 이동 방향</b>을 맞히세요. (반투과성 막)',
          hint: '물은 용질이 적은 쪽(물이 많은 쪽)에서 용질이 많은 쪽으로 이동해요. 두 농도가 같으면 순 이동이 없어요.',
          setup() { uqReset(); setMode('utq'); },
          check: () => S.uq.solved.every(Boolean), hold: 0.5,
          status: () => S.uq.solved.map((b, i) => mark(b) + ' 문제 ' + (i + 1)).join(' &nbsp; '),
          explain: '물은 용질 농도가 <b>낮은 쪽 → 높은 쪽</b>으로 순 이동해요. 문제 1(왼쪽이 진함)은 오른쪽 → 왼쪽, 문제 2(오른쪽이 진함)는 왼쪽 → 오른쪽, 문제 3(농도가 같음)은 순 이동이 없어요.',
        },
        {
          type: 'quiz', title: '같은 농도라면?',
          goal: '농도가 같은 두 용액을 반투과성 막 사이에 두면 물의 이동은 어떻게 될까요?',
          setup() { setMode('utube'); },
          choices: ['물 분자의 이동이 완전히 멈춘다', '물 분자는 양방향으로 계속 오가지만 순 이동은 0이다', '용질이 대신 막을 지나 이동한다', '막이 사라진다'],
          answer: 1,
          feedback: ['물 분자는 열운동으로 계속 막을 오가요.', '', '반투과성 막은 용질이 지나가지 못해요.', '막은 그대로 있어요.'],
          explain: '농도가 같으면 양방향으로 오가는 <b>물 분자의 수가 같아서 순 이동이 0</b>이에요. 분자가 멈추는 것이 아니라 오고 가는 수가 같아 겉으로 변화가 없어 보이는 거예요.',
        },
      ],
    },
    {
      title: '세포 관찰: 적혈구와 양파 표피', short: '세포 관찰', icon: '🔬', phase: '관찰',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 물이 용질이 적은 쪽에서 많은 쪽으로 순 이동하는 것을 확인했어요.</div><p>세포 안의 용액(세포액)과 바깥 용액의 농도 관계에 따라 용액을 <b>저장 용액</b>(바깥이 더 묽음) · <b>등장 용액</b>(농도가 같음) · <b>고장 용액</b>(바깥이 더 진함)이라고 해요.</p><p>가상 현미경으로 <b>적혈구</b>(동물 세포)와 <b>양파 표피</b>(식물 세포)를 서로 다른 농도의 용액에 넣고 관찰해요. 덮개 유리 한쪽에 용액을 떨어뜨리고 반대쪽에서 거름종이로 빨아들이면 용액이 시료 밑으로 퍼져요.</p><p>🧪 <b>안전</b>: 실제 실험에서는 면도날 · 커터에 주의하고, 쓴 시료는 분리해서 버려요.</p>',
      features: ['scope', 'tbl'],
      setup() { setMode('scope'); scBuild(); },
      recap: '동물 세포는 저장 용액에서 부풀어 터지고 고장 용액에서 쭈그러들며 등장 용액에서는 변하지 않아요. 식물 세포는 세포벽이 있어 터지지 않고 팽팽해지고, 고장 용액에서는 원형질 분리가 일어나요.',
      summary: '<ul><li>적혈구(0.9 % NaCl이 등장): 0.3 %(저장) → <b>부풀어 터짐(용혈)</b>, 0.9 %(등장) → 원래 모양(양면 오목 원반), 2.0 %(고장) → <b>쭈그러듦</b>.</li><li>양파 표피(식물 세포): 증류수(저장) → 터지지 않고 <b>팽압</b>으로 팽팽해짐(팽만), 0.3 M 설탕(약한 고장~등장) → 일부 세포가 <b>원형질 분리</b>, 0.5 M 설탕(고장) → 모든 세포가 원형질 분리(세포막과 원형질이 세포벽에서 떨어지고 액포가 줄어듦).</li><li>식물 세포가 저장 용액에서 터지지 않는 것은 <b>세포벽</b> 덕분이에요.</li></ul>',
      missions: [
        {
          id: 'obs6', title: '6가지 조건 관찰',
          goal: '🔬 화면에서 <b>적혈구 3가지</b>(0.3 · 0.9 · 2.0 % NaCl)와 <b>양파 표피 3가지</b>(증류수 · 0.3 M · 0.5 M 설탕)를 모두 관찰하세요. 용액을 떨어뜨린 뒤 거름종이를 대고, 세포가 변하는 것을 끝까지 지켜봐요.',
          hint: '용액 버튼으로 조건을 고르고, 스포이트를 덮개 유리 왼쪽 점선 칸에 끌어 놓은 뒤 거름종이를 오른쪽 점선 칸에 끌어 놓아요. (누르기만 해도 돼요.) 용액이 퍼진 뒤 몇 초 더 지켜보면 관찰이 기록돼요. 다른 조건은 [새 시료로] 후에 시작해요.',
          setup() { S.sc.obs = { rbc: [false, false, false], onion: [false, false, false] }; setMode('scope'); scSetSpec('rbc'); },
          check: () => S.sc.obs.rbc.every(Boolean) && S.sc.obs.onion.every(Boolean), hold: 0.5,
          status: () => '🩸 ' + SOLS.rbc.map((s, i) => mark(S.sc.obs.rbc[i]) + s.name).join(' ') + ' &nbsp; 🧅 ' + SOLS.onion.map((s, i) => mark(S.sc.obs.onion[i]) + s.name).join(' '),
          explain: '적혈구는 <b>0.3 %에서 부풀어 터지고</b>, <b>0.9 %에서는 그대로</b>, <b>2.0 %에서는 쭈그러들어요</b>. 양파 표피는 <b>증류수에서 터지지 않고 팽팽해지며</b>, <b>0.3 M에서는 일부</b>, <b>0.5 M에서는 모든 세포</b>가 원형질 분리를 해요.',
        },
        {
          id: 'tbl', title: '관찰 결과 표 완성', manual: true,
          goal: '📋 화면의 표에서 6가지 조건마다 <b>용액의 종류</b>(저장 · 등장 · 고장)와 <b>세포의 변화</b>를 알맞게 고르세요.',
          hint: '적혈구는 0.9 % NaCl이 등장 용액이에요. 그보다 묽으면 저장, 진하면 고장 용액이에요. 양파 세포액은 약 0.3 M 설탕 용액과 농도가 비슷해요(약 절반의 세포에서 원형질 분리가 시작됐어요).',
          setup() { setMode('tbl'); tbReset(); },
          check() {
            if (!tbDone()) { tbMarkBad([]); const n = S.tb.sel.reduce((a, s) => a + (s[0] >= 0 ? 1 : 0) + (s[1] >= 0 ? 1 : 0), 0); return '표의 모든 칸을 채워 주세요. (' + n + ' / 12)'; }
            const w = tbWrong(); if (!w.length) { tbMarkBad([]); return true; }
            tbMarkBad(w); const q = TB_ROWS[w[0][0]]; return q.who + '의 ' + q.sol + ' 행에서 ' + (w[0][1] === 0 ? '용액의 종류' : '세포의 변화') + '가 맞지 않아요. 관찰한 모습을 떠올려 보세요.';
          },
          explain: '<b>적혈구</b>: 0.3 %는 저장(부풀어 터짐), 0.9 %는 등장(원래 모양), 2.0 %는 고장(쭈그러듦). <b>양파 표피</b>: 증류수는 저장(팽팽해짐, 터지지 않음), 0.3 M 설탕은 세포액과 농도가 비슷한 등장(일부 원형질 분리 시작), 0.5 M 설탕은 고장(모든 세포 원형질 분리).',
        },
        {
          type: 'quiz', title: '식물 세포는 왜 안 터질까?',
          goal: '식물 세포를 증류수에 넣어도 <b>터지지 않는</b> 까닭은?',
          setup() { setMode('scope'); },
          choices: ['식물 세포에는 세포막이 없어서 물이 들어오지 않기 때문이다', '세포막 바깥의 단단한 세포벽이 팽창을 막아 팽압이 생기기 때문이다', '증류수에는 물이 들어 있지 않기 때문이다', '식물 세포에서는 삼투가 일어나지 않기 때문이다'],
          answer: 1,
          feedback: ['식물 세포에도 세포막이 있고, 물이 들어와요.', '', '증류수는 물만 들어 있는 가장 묽은 용액이에요.', '식물 세포에서도 삼투가 일어나요.'],
          explain: '물이 들어오면 세포가 부풀지만 <b>세포벽</b>이 더 이상 늘어나지 않게 막아서 <b>팽압</b>이 생기고, 세포가 팽팽한 상태(팽만)가 돼요. 동물 세포에는 세포벽이 없어 저장 용액에서 터져요.',
        },
      ],
    },
    {
      title: '농도 추정: 한계 원형질 분리', short: '농도 추정', icon: '📈', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 양파 세포가 0.3 M 설탕 용액에서 약 절반만 원형질 분리를 하는 것을 봤어요.</div><p>세포의 <b>50 %가 원형질 분리를 일으키는 농도</b>를 <b>한계 원형질 분리 농도</b>라고 해요. 이 농도의 용액은 세포액과 <b>등장</b>이라서, 세포액의 농도를 알아낼 수 있어요.</p><p>양파 표피를 설탕 용액 0.1 ~ 0.5 M 5가지에 넣고 세포 100개를 세어 비율 그래프를 그리고, 감자 막대의 질량 변화 자료로도 같은 방법을 써 봐요. 실험의 오차를 줄이는 방법도 생각해 봐요.</p>',
      features: ['limit', 'potato', 'err'],
      setup() { setMode('limit'); },
      recap: '한계 원형질 분리 농도(세포의 50 %가 원형질 분리)는 세포액과 농도가 거의 같으므로 세포액의 농도를 추정할 수 있어요. 양파는 약 0.3 M, 감자는 질량 변화가 0이 되는 약 0.23 M이고, 세포 수를 늘리고 조건을 같게 하면 오차가 줄어요.',
      summary: '<ul><li>양파 표피(설탕 용액, 세포 100개): 0.1 M 0 % · 0.2 M 8 % · 0.3 M 50 % · 0.4 M 92 % · 0.5 M 100 % → <b>한계 원형질 분리 농도 = 0.3 M</b> → 양파 세포액 ≈ 0.3 M(설탕 용액 기준).</li><li>감자 막대 질량 변화: 0 M +12 % · 0.1 M +7 % · 0.2 M +2 % · 0.3 M −4 % · 0.4 M −10 % · 0.5 M −15 % → 그래프가 x축과 만나는 곳 ≈ <b>0.23 M</b>. 0.3 M에서 질량이 줄어든 것은 감자 세포액이 그 용액보다 묽기 때문이에요.</li><li>오차를 줄이는 방법: <b>관찰 세포 수 늘리기</b>, <b>같은 시간 담그기</b>, 같은 조건으로 반복해 평균 내기, 농도 간격 촘촘히 하기.</li></ul>',
      missions: [
        {
          id: 'onion', title: '양파 세포액 농도 추정',
          goal: '🧅 화면에서 설탕 용액 <b>5가지 농도</b> 각각에서 [🔍 세어서 기록]을 하고, 그래프에서 커서를 <b>50 %</b> 지점에 놓아 [✔ 추정값으로 정하기]를 누르세요.',
          hint: '농도 버튼을 하나 고르고 [세어서 기록]을 눌러요. 5개를 모두 기록하면 점들이 이어져요. 그래프의 초록 점선(50 %)과 만나는 곳으로 주황 커서를 끌어요(0.3 M 근처).',
          setup() { lmReset(); S.lm.ci = 0; S.lm.cur = 0.2; setMode('limit'); },
          check: () => lmRecCount() === 5 && S.lm.est != null, hold: 0.6,
          status: () => mark(lmRecCount() === 5) + ' 세어서 기록 ' + lmRecCount() + ' / 5 &nbsp; ' + mark(S.lm.est != null) + ' 50 % 지점 추정 ' + (S.lm.est != null ? S.lm.est.toFixed(2) + ' M' : '—'),
          explain: '0.1 M 0 %, 0.2 M 8 %, <b>0.3 M 50 %</b>, 0.4 M 92 %, 0.5 M 100 %예요. 세포의 50 %가 원형질 분리를 일으키는 <b>한계 원형질 분리 농도 0.3 M</b>의 용액은 세포액과 거의 <b>등장</b>이므로, 양파 세포액의 농도는 약 <b>0.3 M</b>(설탕 용액 기준)이라고 추정해요.',
        },
        {
          id: 'potato', title: '감자 세포액 농도 추정',
          goal: '🥔 화면의 그래프에서 감자 막대의 <b>질량 변화가 0</b>이 되는 농도에 커서를 놓고 [✔ 0이 되는 농도로 정하기]를 누르세요.',
          hint: '질량이 늘다가(+) 줄어드는(−) 구간에서 파란 선이 검은 선(변화 0)과 만나는 곳을 찾아요. 0.2 M(+2 %)과 0.3 M(−4 %) 사이예요.',
          setup() { S.pt.est = null; S.pt.cur = 0.1; setMode('potato'); },
          check: () => S.pt.est != null, hold: 0.6,
          status: () => mark(S.pt.est != null) + ' 질량 변화 0인 농도 ' + (S.pt.est != null ? S.pt.est.toFixed(2) + ' M' : '—'),
          explain: '감자 막대는 0.2 M에서 +2 %, 0.3 M에서 −4 %이므로 질량 변화가 0이 되는 곳은 <b>0.2 ~ 0.25 M 사이, 약 0.23 M</b>예요. 이 농도가 감자 세포액과 등장인 농도예요. 양파(약 0.3 M)와 감자(약 0.23 M)의 세포액 농도는 서로 달라요. 0.3 M 용액에서 질량이 줄어든 감자는 <b>세포액이 용액보다 묽어서</b> 물이 빠져나간 거예요.',
        },
        {
          id: 'err', title: '오차를 줄이는 방법', manual: true,
          goal: '⚖ 화면에서 카드 6장을 <b>오차를 줄이는 방법</b>과 <b>오차를 키우는 방법</b> 상자에 나누어 넣으세요.',
          hint: '실험 조건을 같게 하고, 관찰하는 세포를 많이 하면 결과가 더 믿을 만해져요. 시료마다 조건이 다르거나 세포를 너무 적게 세면 오차가 커져요.',
          setup() { setMode('err'); errS.reset(); },
          check() {
            if (errS.placed < 6) { errS.markBad([]); return '카드를 모두 상자에 넣어 주세요. (' + errS.placed + ' / 6)'; }
            const w = errWrong(); if (!w.length) { errS.markBad([]); return true; }
            errS.markBad(w.map((c) => c.id)); return '\'' + ERR[w[0].id].short + '\' 카드가 맞지 않아요. 결과가 믿을 만해지는 쪽인지 생각해 보세요.';
          },
          explain: '<b>오차를 줄이는 방법</b>: 관찰하는 세포 수 늘리기, 모든 시료를 같은 시간 동안 담그기, 같은 조건에서 여러 번 재어 평균 내기, 농도 간격을 촘촘히 하기. <b>오차를 키우는 방법</b>: 시료마다 담그는 시간을 다르게 하기, 세포를 적게 세고 끝내기.',
        },
      ],
    },
    {
      title: '삼투 적용: 생활 속 삼투', short: '삼투 적용', icon: '🏠', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 세포액과 바깥 용액의 농도를 비교해 세포가 어떻게 변하는지 추정했어요.</div><p>생활 속 여러 상황도 같은 방법으로 설명할 수 있어요. 바깥 용액과 세포액 중 <b>어느 쪽이 더 진한지</b> 비교하면 물이 어느 쪽으로 이동하는지 알 수 있어요.</p><p>상황 카드 6장을 눌러 읽고 저장 · 등장 · 고장 용액 상황으로 판단해 봐요.</p>',
      features: ['cards'],
      setup() { setMode('cards'); },
      recap: '바깥 용액이 세포액보다 진하면(고장) 세포에서 물이 빠져나가고, 묽으면(저장) 물이 들어오며, 같으면(등장) 순 이동이 없어요. 정맥 주사액으로 생리 식염수를 쓰는 것도 이 때문이에요.',
      summary: '<ul><li><b>고장 용액</b>: 배추 절이기 · 비료를 많이 준 화분의 시듦 · 바닷물을 마시면 갈증 · 민물고기를 바닷물에 넣기 → 세포에서 물이 빠져나가 쭈그러들거나 원형질 분리.</li><li><b>등장 용액</b>: 생리 식염수(0.9 % NaCl) 정맥 주사 → 적혈구가 모양을 유지.</li><li><b>저장 용액</b>: 시든 상추를 물에 담그기 → 물이 들어와 팽압으로 빳빳해짐.</li><li>설탕이나 소금을 뿌린 과일에서 물이 나오는 것도 <b>고장 용액</b>이 과일 세포의 물을 빼내기 때문이에요.</li></ul>',
      missions: [
        {
          id: 'cards', title: '생활 속 삼투 상황 판단', manual: true,
          goal: '🏠 화면에서 상황 카드 6장을 <b>저장 · 등장 · 고장 용액 상황</b> 상자에 나누어 넣으세요.',
          hint: '카드를 눌러 바깥 용액과 세포액의 진하기를 비교해요. 바깥이 더 진하면 고장, 더 묽으면 저장, 비슷하면 등장 상황이에요.',
          setup() { setMode('cards'); S.cd.sel = null; cardsS.reset(); },
          check() {
            if (cardsS.placed < 6) { cardsS.markBad([]); return '카드를 모두 상자에 넣어 주세요. (' + cardsS.placed + ' / 6)'; }
            const w = cardsWrong(); if (!w.length) { cardsS.markBad([]); return true; }
            cardsS.markBad(w.map((c) => c.id)); return '\'' + CARD[w[0].id].short + '\' 카드가 맞지 않아요. 바깥 용액과 세포액 중 어느 쪽이 더 진한지 다시 비교해 보세요.';
          },
          explain: '<b>고장</b>(바깥이 더 진함): 배추 절이기, 비료 많은 화분, 바닷물 마시기, 민물고기를 바닷물에 넣기 → 세포에서 물이 빠져나가요. <b>등장</b>: 생리 식염수 정맥 주사 → 변화 없음. <b>저장</b>(바깥이 더 묽음): 시든 상추를 물에 담그기 → 물이 들어와 빳빳해져요.',
        },
        {
          type: 'quiz', title: '탈수 환자에게 증류수를?',
          goal: '탈수 환자에게 <b>증류수를 직접 주사하면 안 되는</b> 까닭은?',
          setup() { setMode('cards'); },
          choices: ['증류수는 혈액보다 묽은 저장 용액이라 적혈구에 물이 들어가 부풀어 터지기(용혈) 때문이다', '증류수는 혈액보다 진해서 적혈구가 쭈그러들기 때문이다', '증류수에는 산소가 없어서 호흡을 못 하기 때문이다', '증류수는 몸 안에서 바로 얼기 때문이다'],
          answer: 0,
          feedback: ['', '증류수는 용질이 거의 없어서 혈액보다 훨씬 묽어요.', '문제는 산소가 아니라 농도 차이예요.', '체온 때문에 얼지 않아요.'],
          explain: '증류수는 혈액(약 0.9 %)보다 훨씬 묽은 <b>저장 용액</b>이라서 물이 적혈구로 들어가 <b>부풀어 터져요(용혈)</b>. 그래서 주사액은 혈액과 농도가 같은 <b>생리 식염수</b>를 써요. 설탕이나 소금을 뿌린 과일에서 물이 나오는 것은 반대로 <b>고장 용액</b>이 과일 세포의 물을 빼내기 때문이에요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hy-osmosis', mount: '#game', badge: '삼투 관찰 박사', homeHref: '../../index.html#hy',
    featureLabels: { utube: '🧪 U자관 삼투 모형', utq: '❓ 물 이동 방향 맞히기', scope: '🔬 가상 현미경', tbl: '📋 관찰 결과 표', limit: '🧅 양파 한계 원형질 분리', potato: '🥔 감자 막대 자료', err: '⚖ 오차 줄이기', cards: '🏠 생활 속 삼투 판단' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 읽음 칸 ---------- */
  function readouts() {
    const m = S.mode;
    if (m === 'utube') setReads(['왼쪽 · 오른쪽 농도', fmtM(S.ut.eL) + ' · ' + fmtM(S.ut.eR), '수면 높이 차', Math.abs(utDcm()).toFixed(1) + ' cm', '물의 순 이동', netDir()]);
    else if (m === 'utq') setReads(['문제', (S.uq.i + 1) + ' / 3', '맞힌 문제', S.uq.solved.filter(Boolean).length + '개', '물의 순 이동', S.uq.state === 'ask' ? '맞혀 보세요' : netDir()]);
    else if (m === 'scope') setReads(['시료', S.sc.spec === 'rbc' ? '적혈구' : '양파 표피', '용액', S.sc.phase === 'idle' ? '처음 상태' : SOLS[S.sc.spec][S.sc.sol].name, '관찰한 조건', scObsCount() + ' / 6']);
    else if (m === 'tbl') setReads(['채운 칸', S.tb.sel.reduce((a, s) => a + (s[0] >= 0 ? 1 : 0) + (s[1] >= 0 ? 1 : 0), 0) + ' / 12', '조건', '6가지', '용액 종류', '3가지']);
    else if (m === 'limit') { const c = LM_C[S.lm.ci]; setReads(['설탕 용액', fmtM(c), '원형질 분리 세포', S.lm.sweep >= 0 ? S.lm.cnt + ' / 100' : (S.lm.rec[c] != null ? S.lm.rec[c] + ' / 100' : '—'), '기록한 농도', lmRecCount() + ' / 5']); }
    else if (m === 'potato') { const v = ptAt(S.pt.cur); setReads(['커서 농도', S.pt.cur.toFixed(2) + ' M', '질량 변화', (v >= 0 ? '+' : '') + v.toFixed(1) + ' %', '추정값', S.pt.est != null ? S.pt.est.toFixed(2) + ' M' : '아직']); }
    else if (m === 'err') setReads(['놓은 카드', errS.placed + ' / 6', '남은 카드', (6 - errS.placed) + '장', '분류 상자', '2칸']);
    else setReads(['놓은 카드', cardsS.placed + ' / 6', '남은 카드', (6 - cardsS.placed) + '장', '용액 상황', '3가지']);
  }

  /* ---------- 시작 ---------- */
  utRebuild(); scBuild(); uqLoad(0); S.ut.freeze = false; S.ut.cL = 0.3; S.ut.cR = 0; S.ut.eL = 0.3; S.ut.eR = 0; utRebuild();
  setMode('utube');
  let lastFree = false, lastLv = -1;
  SciSim.loop((dt, t) => {
    clock = t; S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (game && game.level !== lastLv) { lastLv = game.level; updateCtl(); }
    view.apply(); FX.update(dt); ctx.clearRect(0, 0, VW, VH);
    switch (S.mode) {
      case 'utube': bgFill(BG2, BG3); utDraw(dt, t, false); break;
      case 'utq': bgFill(BG2, BG3); uqTick(dt); utDraw(dt, t, true); break;
      case 'scope': bgFill(BG2, BG3); scDraw(dt, t); break;
      case 'tbl': bgFill(BG2, BG3); tbDraw(dt, t); break;
      case 'limit': bgFill(BG2, BG3); lmDraw(dt, t); break;
      case 'potato': bgFill(BG2, BG3); ptDraw(dt, t); break;
      case 'err': bgFill(BG2, BG3); errDraw(dt, t); break;
      case 'cards': bgFill(BG2, BG3); cardsDraw(dt, t); break;
    }
    FX.draw(); parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(241,246,243,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, PHONE, get game() { return game; }, levels, setMode, utG, utB, utDStar, utDcm, utReset, uqAnswer, uqLoad, uqReset, UQS, scBuild, scDrop, scPaper, scSetSpec, scSetSol, scNew, SOLS, scObsCount, slideG, TOOLP,
    tbReset, tbHit, TB_ROWS, TB_T, TB_R, TBX, TBW, TBH, TB_Y0, lmPick, lmCount, lmEstimate, lmCountAt, LM_C, LM_THR, lmCS, lmCell, ptEstimate, ptAt, errS, cardsS, CARDS, ERRS, updateCtl, utUpdate, lmReset, lmUpdate, LGR, PTG, LENS,
  };
})();
