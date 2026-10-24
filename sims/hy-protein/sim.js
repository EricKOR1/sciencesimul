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
     고등학교 세포와 물질대사 · Ⅰ. 세포 - 단백질의 구조와 기능 (단원 56, 3차시)
     성취기준 [12세포01-02] 핵산과 단백질의 기본 구조와 세포에서의 주요 기능을 조사하여 설명할 수 있다. (단백질 부분)
     ① 모형: 아미노산 (R기의 성질)  ② 모형: 펩타이드 사슬 (구슬 연결, 경우의 수)
     ③ 탐구: 접힘과 구조 (1차~4차, 낫 모양 적혈구 빈혈)  ④ 적용: 기능과 변성
     ========================================================= */
  const S = { mode: 'aa', fade: 0 };
  let game = null;
  const AA = {
    ser: { name: '세린', ab: 'Ser', cls: 'phil', col: '#3b82f6', codon: 'UCU' },
    gln: { name: '글루타민', ab: 'Gln', cls: 'phil', col: '#2f6fe0', codon: 'CAA' },
    leu: { name: '류신', ab: 'Leu', cls: 'phob', col: '#f97316', codon: 'CUG' },
    val: { name: '발린', ab: 'Val', cls: 'phob', col: '#ea8a1e', codon: 'GUU' },
    lys: { name: '리신', ab: 'Lys', cls: 'chg', col: '#22b455', codon: 'AAA', sign: '+' },
    glu: { name: '글루탐산', ab: 'Glu', cls: 'chg', col: '#139a47', codon: 'GAA', sign: '−' },
  };
  const AAKEYS = ['ser', 'gln', 'leu', 'val', 'lys', 'glu'];
  const CLS = { phil: { name: '친수성 R기', col: '#3b82f6', soft: '#dbeafe', txt: '물을 좋아해요' }, phob: { name: '소수성 R기', col: '#f97316', soft: '#ffedd5', txt: '물을 싫어해요' }, chg: { name: '전하를 띤 R기', col: '#22b455', soft: '#dcfce7', txt: '전하를 띠어요' } };
  const BASEC = { A: '#16a34a', U: '#a855f7', G: '#2563eb', C: '#f59e0b' };
  const R0 = L(16, 13);

  /* 아미노산 구슬: 공통 부분(회색 구) + 곁사슬 R기(색 구). (x, y)가 공통 부분의 중심, rot 방향으로 R기가 나와요 */
  function drawAA(x, y, key, o) {
    o = o || {}; const a = AA[key], s = (o.scale || 1) * R0 / 16;
    ctx.save(); ctx.globalAlpha = o.alpha == null ? 1 : o.alpha; ctx.translate(x, y); ctx.rotate(o.rot || 0);
    if (o.lift) { ctx.shadowColor = 'rgba(0,0,0,.28)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 6; }
    // R기 줄기
    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 3.4 * s; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(10 * s, 0); ctx.lineTo(22 * s, 0); ctx.stroke();
    D.sphere(0, 0, 16 * s, '#d8dee8', { gloss: true, shadow: !o.flat });
    // 아미노기(파랑)와 카복실기(빨강) 표시
    D.sphere(-8 * s, -9 * s, 4.2 * s, '#3b82f6', { gloss: false }); D.sphere(-8 * s, 9 * s, 4.2 * s, '#ef4444', { gloss: false });
    D.sphere(29 * s, 0, 11 * s, a.col, { gloss: true });
    ctx.shadowColor = 'transparent';
    if (a.sign) { ctx.save(); ctx.translate(29 * s, 0); ctx.rotate(-(o.rot || 0)); T(0, 5.5 * s, a.sign, 16 * s, '#fff', 'center', 800); ctx.restore(); }
    ctx.restore();
    if (o.halo && a.cls !== 'phob') {   // 물 분자가 R기를 둘러싸요
      const rx = x + Math.cos(o.rot || 0) * 29 * s, ry = y + Math.sin(o.rot || 0) * 29 * s;
      for (let k = 0; k < 5; k++) { const ang = (o.t || 0) * 0.9 + k * TAU / 5; ctx.fillStyle = 'rgba(80,160,235,.75)'; ctx.beginPath(); ctx.arc(rx + Math.cos(ang) * 19 * s, ry + Math.sin(ang) * 19 * s, 3.2 * s, 0, TAU); ctx.fill(); }
    }
  }

  /* =========================================================
     ① 아미노산 : 물속에서 R기의 성질 확인
     ========================================================= */
  const TANK = PHONE ? { x: 10, y: 10, w: 460, h: 312 } : { x: 14, y: 14, w: 520, h: 384 };
  const AINFO = PHONE ? { x: 10, y: 332, w: 460, h: 118 } : { x: 546, y: 14, w: 240, h: 384 };
  const ATRAY = PHONE ? { x: 10, y: 460, w: 460, h: 170 } : { x: 14, y: 410, w: 772, h: 136 };
  const ATI = AAKEYS.map((k, i) => ({ key: k, x: PHONE ? ATRAY.x + 56 + (i % 3) * 140 : ATRAY.x + 70 + i * 124, y: PHONE ? ATRAY.y + 56 + Math.floor(i / 3) * 62 : ATRAY.y + 62 }));
  S.aa = { beads: [], thrown: {}, drag: null, t: 0 };
  const aaCount = () => Object.keys(S.aa.thrown).length;
  function aaClear() { S.aa.beads = []; S.aa.thrown = {}; S.aa.drag = null; }
  function aaAdd(key, x, y) {
    if (S.aa.beads.length >= 14) { S.aa.beads.shift(); }
    const rr = Math.random;
    S.aa.beads.push({ key, x: x == null ? TANK.x + TANK.w * (0.3 + rr() * 0.4) : x, y: y == null ? TANK.y + 50 : y, vx: (rr() - 0.5) * 30, vy: 40, rot: rr() * TAU, ph: rr() * TAU, splash: 1 });
    S.aa.thrown[key] = true; Sound.click(); updateCtl();
  }
  function aaUpdate(dt) {
    const B = S.aa.beads, rc = R0 * 1.7, ph = B.filter((b) => AA[b.key].cls === 'phob');
    S.aa.t += dt;
    B.forEach((b, i) => {
      const cls = AA[b.key].cls; let fx = 0, fy = 0;
      b.splash = approach(b.splash, 0, dt, 3);
      fx += Math.sin(S.aa.t * 1.7 + b.ph * 3) * 14; fy += Math.cos(S.aa.t * 1.3 + b.ph * 2) * 14;   // 물 분자와의 충돌(떨림)
      B.forEach((c, j) => {
        if (i === j) return; const dx = c.x - b.x, dy = c.y - b.y, d = Math.hypot(dx, dy) || 0.01, ux = dx / d, uy = dy / d, cc = AA[c.key].cls;
        if (d < rc * 2) { const f = (rc * 2 - d) * 18; fx -= ux * f; fy -= uy * f; }
        if (cls === 'phob' && cc === 'phob' && d < 260) { const f = 70 * (1 - d / 260); fx += ux * f; fy += uy * f; }       // 소수성끼리 뭉쳐요
        else if (cls !== 'phob' && d < 120) { const f = 42 * (1 - d / 120); fx -= ux * f; fy -= uy * f; }                    // 친수성은 물과 닿으려고 흩어져요
        else if (cls === 'phob' && cc !== 'phob' && d < 100) { const f = 20 * (1 - d / 100); fx -= ux * f; fy -= uy * f; }
      });
      // 벽
      const m = rc + 6;
      if (b.x < TANK.x + m) { b.x = TANK.x + m; b.vx = Math.abs(b.vx) * 0.5; } if (b.x > TANK.x + TANK.w - m) { b.x = TANK.x + TANK.w - m; b.vx = -Math.abs(b.vx) * 0.5; }
      if (b.y < TANK.y + 60) { fy += (TANK.y + 60 - b.y) * 6; } if (b.y > TANK.y + TANK.h - m - 4) { b.y = TANK.y + TANK.h - m - 4; b.vy = -Math.abs(b.vy) * 0.4; }
      fy += 12 + (TANK.y + TANK.h * 0.55 - b.y) * 0.5; fx += (TANK.x + TANK.w / 2 - b.x) * 0.25;   // 약한 중력과 가운데로 모이려는 경향(물 분자의 흐름)
      b.vx = (b.vx + fx * dt) * 0.93; b.vy = (b.vy + fy * dt) * 0.93;
      if (!RM) { b.x += b.vx * dt; b.y += b.vy * dt; }
      // R기 방향: 소수성은 이웃 소수성 쪽(안쪽), 친수성은 물 쪽(바깥)
      let tr = b.rot;
      if (cls === 'phob') { const nb = ph.filter((c) => c !== b && Math.hypot(c.x - b.x, c.y - b.y) < 260); if (nb.length) { const cx = nb.reduce((a, c) => a + c.x, 0) / nb.length, cy = nb.reduce((a, c) => a + c.y, 0) / nb.length; tr = Math.atan2(cy - b.y, cx - b.x); } else tr = b.rot + dt * 0.4; }
      else { const mx = TANK.x + TANK.w / 2, my = TANK.y + TANK.h / 2; tr = Math.atan2(b.y - my, b.x - mx) + Math.sin(S.aa.t + b.ph) * 0.6; }
      let d = tr - b.rot; d = Math.atan2(Math.sin(d), Math.cos(d)); b.rot += d * Math.min(1, dt * 5);
    });
  }
  function aaClump() {
    const ph = S.aa.beads.filter((b) => AA[b.key].cls === 'phob'); if (ph.length < 2) return 0;
    let best = 0; ph.forEach((b) => { const n = ph.filter((c) => Math.hypot(c.x - b.x, c.y - b.y) < R0 * 5).length; best = Math.max(best, n); }); return best;
  }
  function aaDraw(dt, t) {
    panel(TANK.x, TANK.y, TANK.w, TANK.h, 20, '#eaf6ff');
    // 물
    ctx.save(); D.roundRect(TANK.x + 4, TANK.y + 4, TANK.w - 8, TANK.h - 8, 17); ctx.clip();
    const g = ctx.createLinearGradient(0, TANK.y, 0, TANK.y + TANK.h); g.addColorStop(0, '#cfe9fb'); g.addColorStop(1, '#a9d4f2'); ctx.fillStyle = g; ctx.fillRect(TANK.x, TANK.y, TANK.w, TANK.h);
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.moveTo(TANK.x, TANK.y + 46); for (let x = TANK.x; x <= TANK.x + TANK.w; x += 12) ctx.lineTo(x, TANK.y + 46 + Math.sin(t * 2 + x * 0.04) * 2); ctx.lineTo(TANK.x + TANK.w, TANK.y); ctx.lineTo(TANK.x, TANK.y); ctx.fill();
    // 물 분자 점들
    for (let k = 0; k < 46; k++) { const rx = ((k * 97) % 100) / 100, ry = ((k * 53) % 100) / 100; ctx.fillStyle = 'rgba(80,150,225,.22)'; ctx.beginPath(); ctx.arc(TANK.x + 14 + rx * (TANK.w - 28) + Math.sin(t + k) * 4, TANK.y + 60 + ry * (TANK.h - 76) + Math.cos(t * 0.8 + k) * 4, 3, 0, TAU); ctx.fill(); }
    ctx.restore();
    T(TANK.x + 18, TANK.y + 30, '💧 물이 든 통', L(17, 15), '#1d4f91', 'left', 800);
    T(TANK.x + TANK.w - 16, TANK.y + 30, S.aa.beads.length ? '구슬 ' + S.aa.beads.length + '개' : '구슬을 넣어 보세요', 13.5, '#1d4f91', 'right', 700);
    // 소수성 뭉침 표시
    const ph = S.aa.beads.filter((b) => AA[b.key].cls === 'phob');
    if (ph.length >= 2) { const cx = ph.reduce((a, b) => a + b.x, 0) / ph.length, cy = ph.reduce((a, b) => a + b.y, 0) / ph.length; ctx.save(); ctx.globalAlpha = Math.min(0.35, aaClump() * 0.08); D.glow(cx, cy, 70, '#f97316', 0.7); ctx.restore(); }
    S.aa.beads.slice().sort((a, b) => a.y - b.y).forEach((b) => {
      drawAA(b.x, b.y, b.key, { rot: b.rot, halo: true, t, scale: 1 + b.splash * 0.25 });
      T(b.x, b.y + R0 * 2.1, AA[b.key].name, 13, '#12395f', 'center', 800, { stroke: 'rgba(255,255,255,.8)', strokeWidth: 3 });
    });
    if (S.aa.drag) drawAA(S.aa.drag.x, S.aa.drag.y, S.aa.drag.key, { rot: 0, lift: 1, scale: 1.25 });
    // 설명 패널
    panel(AINFO.x, AINFO.y, AINFO.w, AINFO.h, 18, '#ffffff');
    if (PHONE) {
      T(AINFO.x + 14, AINFO.y + 24, '곁사슬 R기의 성질 (색깔)', 14.5, '#334155', 'left', 800);
      ['phil', 'phob', 'chg'].forEach((c, i) => { const y = AINFO.y + 46 + i * 24; D.sphere(AINFO.x + 22, y - 4, 7, CLS[c].col, { gloss: true }); T(AINFO.x + 38, y, CLS[c].name + ': ' + CLS[c].txt, 13.5, '#1f2d44', 'left', 800); });
    } else {
      T(AINFO.x + 16, AINFO.y + 30, '곁사슬 R기의 성질', 16, '#334155', 'left', 800);
      textBlock(AINFO.x + 16, AINFO.y + 54, AINFO.w - 32, '아미노산은 공통 부분(회색)이 같고, 곁사슬 R기(색 구)만 달라요.', 13.5, '#64748b', 19, 700);
      ['phil', 'phob', 'chg'].forEach((c, i) => { const y = AINFO.y + 148 + i * 54; D.sphere(AINFO.x + 28, y - 4, 10, CLS[c].col, { gloss: true }); T(AINFO.x + 48, y - 3, CLS[c].name, 14.5, '#1f2d44', 'left', 800); T(AINFO.x + 48, y + 16, CLS[c].txt, 13.5, '#64748b', 'left', 700); });
      const n = aaClump();
      if (n >= 2) textBlock(AINFO.x + 16, AINFO.y + AINFO.h - 54, AINFO.w - 32, '소수성 구슬 ' + n + '개가 R기를 안쪽으로 모으며 뭉쳤어요!', 13.5, '#c2410c', 19, 800);
      else textBlock(AINFO.x + 16, AINFO.y + AINFO.h - 54, AINFO.w - 32, '친수성 · 전하 R기는 물 분자가 둘러싸요. (파란 점)', 13.5, '#1d4f91', 19, 800);
    }
    // 트레이
    panel(ATRAY.x, ATRAY.y, ATRAY.w, ATRAY.h, 18, '#ffffff');
    T(ATRAY.x + 16, ATRAY.y + 26, '아미노산 구슬을 눌러(또는 끌어서) 물에 넣어요 · ' + aaCount() + ' / 6종', L(15, 13.5), '#334155', 'left', 800);
    ATI.forEach((it) => {
      if (S.aa.drag && S.aa.drag.key === it.key && S.aa.drag.moved) { }
      drawAA(it.x, it.y, it.key, { rot: -0.4 });
      T(it.x + (PHONE ? 4 : 6), it.y + R0 * 2.2 + (PHONE ? 2 : 4), AA[it.key].name, 13.5, '#26324a', 'center', 800);
      if (S.aa.thrown[it.key]) D.check(it.x + R0 * 2, it.y - R0 * 1.4, 8, 1);
    });
  }
  const aaPT = {
    down(p) { for (const it of ATI) if (Math.hypot(p.x - it.x - 8, p.y - it.y) < R0 * 2.6) { S.aa.drag = { key: it.key, x: p.x, y: p.y, sx: p.x, sy: p.y, moved: false }; Sound.tick(); return true; } return false; },
    move(p) { const d = S.aa.drag; if (!d) return; if (Math.hypot(p.x - d.sx, p.y - d.sy) > 8) d.moved = true; if (d.moved) { d.x = p.x; d.y = p.y; } },
    up(p) { const d = S.aa.drag; if (!d) return; S.aa.drag = null; if (!d.moved) aaAdd(d.key); else if (inRect(p.x, p.y, TANK)) aaAdd(d.key, p.x, p.y); },
    hover(p) { return ATI.some((it) => Math.hypot(p.x - it.x - 8, p.y - it.y) < R0 * 2.6) ? 'grab' : 'default'; },
  };

  /* ----- R기 분류 (카드를 상자에 넣기) ----- */
  const SB = PHONE ? { x: 10, y: 10, w: 460, h: 210 } : { x: 14, y: 14, w: 772, h: 230 };
  const sortAA = new Sorter({
    cards: AAKEYS.map((k) => ({ id: k, label: AA[k].name, col: '#64748b', sub: AA[k].ab })),
    boxes: ['phil', 'phob', 'chg'].map((c, i) => { const gap = 10, bw = (SB.w - gap * 2) / 3; return { id: c, label: CLS[c].name, col: CLS[c].col, x: SB.x + i * (bw + gap), y: SB.y, w: bw, h: SB.h, cols: 1, hdr: 34 }; }),
    cw: PHONE ? 140 : 190, ch: 48, kh: PHONE ? 40 : 44,
    tray: (i) => (PHONE ? { x: 14 + (i % 3) * 154, y: 316 + Math.floor(i / 3) * 62 } : { x: 28 + (i % 3) * 252, y: 346 + Math.floor(i / 3) * 70 }),
    onChange() { updateCtl(); },
  });
  const sortAAWrong = () => sortAA.cards.filter((c) => c.zone && c.zone !== AA[c.id].cls);
  function sortAADraw(dt, t) {
    sortAA.update(dt); sortAA.drawBoxes();
    panel(PHONE ? 10 : 14, PHONE ? 232 : 256, PHONE ? 460 : 772, PHONE ? 398 : 290, 16, '#ffffff');
    T((PHONE ? 10 : 14) + 16, (PHONE ? 232 : 256) + 30, '물속에서 관찰한 성질로 구슬 6종을 분류해요', L(16, 14), '#334155', 'left', 800);
    textBlock((PHONE ? 10 : 14) + 16, (PHONE ? 232 : 256) + 54, (PHONE ? 460 : 772) - 32, '친수성 R기는 물 가까이 흩어지고, 소수성 R기는 모여 뭉쳤어요. 전하를 띤 R기는 +나 −를 띠어요.', L(14, 13), '#64748b', 19, 700);
    sortAA.drawCards();
  }
  const sortAAPT = { down: (p) => sortAA.down(p), move: (p) => sortAA.move(p), up: (p) => sortAA.up(p), hover: (p) => sortAA.hover(p) };

  /* =========================================================
     ② 펩타이드 사슬 : mRNA 코돈 순서대로 아미노산 구슬 연결
     ========================================================= */
  const CODONS = ['UCU', 'CUG', 'GUU', 'AAA', 'GAA'];
  const CHAIN_SEQ = CODONS.map((c) => AAKEYS.find((k) => AA[k].codon === c));
  const CHP = PHONE ? { x: 10, y: 10, w: 460, h: 340 } : { x: 14, y: 14, w: 772, h: 340 };
  const CHT = PHONE ? { x: 10, y: 360, w: 460, h: 270 } : { x: 14, y: 366, w: 772, h: 180 };
  const chX = (i) => CHP.x + CHP.w / 2 + (i - 2) * L(132, 84), chY = () => CHP.y + L(214, 228);
  const CTI = AAKEYS.map((k, i) => ({ key: k, x: PHONE ? CHT.x + 60 + (i % 3) * 150 : CHT.x + 74 + i * 124, y: PHONE ? CHT.y + 66 + Math.floor(i / 3) * 96 : CHT.y + 78 }));
  S.ch = { tok: 0, pcs: [], seated: [], wrong: 0, drag: null, msg: '', done: false, flash: 0 };
  function chReset() { S.ch.tok++; S.ch.pcs = []; S.ch.seated = []; S.ch.wrong = 0; S.ch.done = false; S.ch.drag = null; FX.clear(); updateCtl(); }
  function chPlace(key, from) {
    const c = S.ch, i = c.seated.length;
    if (i >= 5) return false;
    if (CHAIN_SEQ[i] !== key) {
      c.wrong++; Sound.fail(); c.msg = (i + 1) + '번째 코돈 ' + CODONS[i] + '에 맞는 아미노산이 아니에요. 코돈표를 보세요.'; showHint(c.msg, 4500);
      c.pcs.push({ key, x: from ? from.x : chX(i), y: from ? from.y : chY(i) - 40, st: 'bad', t: 0, slot: -1 });
      return false;
    }
    const pc = { key, x: from ? from.x : CTI[AAKEYS.indexOf(key)].x, y: from ? from.y : CTI[AAKEYS.indexOf(key)].y, st: 'seat', slot: i, pop: 1 };
    c.pcs.push(pc); c.seated.push(pc); Sound.click();
    if (i >= 1) FX.add({ kind: 'water', x: (chX(i - 1) + chX(i)) / 2, y: chY(i) - 22, vx: 26, vy: -80, life: 1.3, delay: 0.25 });
    if (c.seated.length === 5) { c.done = true; c.flash = 1; const tok = c.tok; setTimeout(() => { if (tok !== c.tok) return; Sound.success(); parts.burst(chX(2), chY(2), { count: 26, speed: 200, colors: ['#3b82f6', '#f97316', '#22b455', '#a855f7'] }); }, 450); }
    updateCtl(); return true;
  }
  function chDraw(dt, t) {
    const c = S.ch;
    panel(CHP.x, CHP.y, CHP.w, CHP.h, 18, '#fbfcff'); panel(CHT.x, CHT.y, CHT.w, CHT.h, 18, '#ffffff');
    T(CHP.x + 18, CHP.y + 30, 'mRNA의 코돈 순서대로 아미노산을 연결해요', L(18, 15.5), '#1e3a8a', 'left', 800);
    T(CHP.x + 18, CHP.y + 54, c.done ? '폴리펩타이드 완성! 이 순서가 단백질의 1차 구조(아미노산 서열)예요.' : '코돈 하나(염기 3개)가 아미노산 하나를 정해요.', L(14, 13), '#64748b', 'left', 700);
    // mRNA 줄
    const my = CHP.y + L(110, 112);
    ctx.save(); ctx.lineCap = 'round'; ctx.strokeStyle = '#6b21a8'; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(chX(0) - L(70, 46), my + 24); ctx.lineTo(chX(4) + L(70, 46), my + 24); ctx.stroke(); ctx.strokeStyle = '#c084fc'; ctx.lineWidth = 5.5; ctx.stroke(); ctx.restore();
    T(CHP.x + 18, my + 56, 'mRNA', 13.5, '#6b21a8', 'left', 800);
    CODONS.forEach((cd, i) => {
      const x = chX(i), on = i === c.seated.length && !c.done, w = L(84, 56);
      for (let k = 0; k < 3; k++) { const bx = x - w / 2 + (k + 0.5) * w / 3; D.roundRect(bx - w / 6 + 1, my - 12, w / 3 - 2, 32, 5); ctx.fillStyle = BASEC[cd[k]]; ctx.fill(); T(bx, my + 10, cd[k], L(16, 13), '#fff', 'center', 800); }
      if (on) { D.ring(x, my + 4, w / 2 + 6, t, { color: '#9333ea', width: 2.5 }); }
      T(x, my - 20, (i + 1) + '번 코돈', 13, on ? '#9333ea' : '#64748b', 'center', 800);
      D.arrow(x, my + 38, x, chY(i) - R0 * 2.2 - 2, { color: on ? '#9333ea' : '#cbd5e1', width: 3, head: 9 });
    });
    // 사슬 칸
    for (let i = 0; i < 5; i++) { if (c.seated[i]) continue; ctx.save(); ctx.setLineDash([6, 5]); ctx.strokeStyle = i === c.seated.length ? '#9333ea' : '#cbd5e1'; ctx.lineWidth = i === c.seated.length ? 2.8 : 2; ctx.beginPath(); ctx.arc(chX(i), chY(i), R0 * 1.55, 0, TAU); ctx.stroke(); ctx.setLineDash([]); ctx.restore(); T(chX(i), chY(i) + 5, '?', 18, '#b0b9c9', 'center', 800); }
    // 결합선 (펩타이드 결합)
    for (let i = 1; i < c.seated.length; i++) { const a = c.seated[i - 1], b = c.seated[i]; ctx.save(); ctx.lineCap = 'round'; ctx.strokeStyle = '#7c2d12'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(a.x + R0 * 0.6, a.y); ctx.lineTo(b.x - R0 * 0.6, b.y); ctx.stroke(); ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 4.4; ctx.stroke(); ctx.restore(); }
    c.seated.forEach((pc, i) => { pc.pop = approach(pc.pop, 0, dt, 6); pc.x = approach(pc.x, chX(i), dt, 12); pc.y = approach(pc.y, chY(i), dt, 12); });
    c.pcs = c.pcs.filter((pc) => { if (pc.st === 'bad') { pc.t += dt; const k = pc.t / 0.7; if (k >= 1) return false; drawAA(pc.x + Math.sin(pc.t * 30) * 4, pc.y + 60 * k * k, pc.key, { alpha: 1 - k, rot: 0 }); return true; } return true; });
    c.seated.forEach((pc, i) => { drawAA(pc.x, pc.y - 0, pc.key, { rot: -Math.PI / 2, scale: 1 + pc.pop * 0.22 }); T(pc.x, chY(i) + R0 * 3.1, AA[pc.key].name, 13, '#26324a', 'center', 800); });
    c.flash = approach(c.flash, 0, dt, 1.2);
    if (c.seated.length >= 2) callout(chX(0) + (chX(1) - chX(0)) / 2, chY(0) - 2, chX(0) + (chX(1) - chX(0)) / 2, chY(0) + R0 * 4.6, '펩타이드 결합 (물이 빠져요)', { line: '#c2410c', border: '#fdba74' });
    if (S.ch.drag) drawAA(S.ch.drag.x, S.ch.drag.y, S.ch.drag.key, { rot: 0, lift: 1, scale: 1.25 });
    // 코돈표 + 트레이
    T(CHT.x + 16, CHT.y + 26, '코돈표 · 구슬을 눌러(또는 끌어서) 칸에 연결해요', L(15, 13.5), '#334155', 'left', 800);
    CTI.forEach((it) => {
      drawAA(it.x, it.y, it.key, { rot: -0.4 });
      T(it.x + 4, it.y + R0 * 2.2, AA[it.key].name, 13.5, '#26324a', 'center', 800);
      const cd = AA[it.key].codon, cy = it.y + R0 * 2.2 + 22;
      for (let k = 0; k < 3; k++) { D.roundRect(it.x - 30 + k * 20, cy - 13, 19, 22, 4); ctx.fillStyle = BASEC[cd[k]]; ctx.fill(); T(it.x - 20.5 + k * 20, cy + 3, cd[k], 13, '#fff', 'center', 800); }
    });
  }
  const chPT = {
    down(p) { if (S.ch.done) return false; for (const it of CTI) if (Math.hypot(p.x - it.x - 8, p.y - it.y) < R0 * 2.6) { S.ch.drag = { key: it.key, x: p.x, y: p.y, sx: p.x, sy: p.y, moved: false }; Sound.tick(); return true; } return false; },
    move(p) { const d = S.ch.drag; if (!d) return; if (Math.hypot(p.x - d.sx, p.y - d.sy) > 8) d.moved = true; if (d.moved) { d.x = p.x; d.y = p.y; } },
    up(p) { const d = S.ch.drag; if (!d) return; S.ch.drag = null; const it = CTI.find((q) => q.key === d.key); if (!d.moved || inRect(p.x, p.y, CHP)) chPlace(d.key, d.moved ? { x: p.x, y: p.y } : { x: it.x, y: it.y }); },
    hover(p) { return CTI.some((it) => Math.hypot(p.x - it.x - 8, p.y - it.y) < R0 * 2.6) ? 'grab' : 'default'; },
  };

  /* ----- 경우의 수 계산기 ----- */
  const CAP = PHONE ? { x: 10, y: 10, w: 460, h: 420 } : { x: 14, y: 14, w: 772, h: 420 };
  S.calc = { n: 5, ok: false };
  const POW20 = [1, 20, 400, 8000, 160000, 3200000, 64000000];
  function pow20Text(n) {
    if (n <= 6) return POW20[n].toLocaleString('en-US');
    const v = [1.28e9, 2.56e10, 5.12e11, 1.024e13][n - 7], e = Math.floor(Math.log10(v)), m = v / Math.pow(10, e);
    return '약 ' + (Math.round(m * 100) / 100) + ' × 10' + String(e).split('').map((d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[+d]).join('');
  }
  function calcDraw(dt, t) {
    const n = S.calc.n;
    panel(CAP.x, CAP.y, CAP.w, CAP.h, 18, '#fbfcff');
    T(CAP.x + 20, CAP.y + 34, '아미노산 ' + n + '개로 만들 수 있는 사슬의 수', L(20, 16.5), '#1e3a8a', 'left', 800);
    textBlock(CAP.x + 20, CAP.y + 58, CAP.w - 40, '자리마다 20가지 아미노산 중 하나가 올 수 있어요. 순서가 다르면 다른 사슬이에요.', L(15, 13.5), '#64748b', L(21, 19), 700);
    const per = PHONE ? 5 : 10, rows = Math.ceil(n / per), bw = PHONE ? 66 : 62, gap = PHONE ? 8 : 10, tot = Math.min(n, per) * bw + (Math.min(n, per) - 1) * gap, x0 = CAP.x + (CAP.w - tot) / 2;
    for (let i = 0; i < n; i++) { const r = Math.floor(i / per), c = i % per, rowN = Math.min(per, n - r * per), rt = rowN * bw + (rowN - 1) * gap, xx = CAP.x + (CAP.w - rt) / 2 + c * (bw + gap), yy = CAP.y + 100 + r * 74;
      D.shadow(() => { D.roundRect(xx, yy, bw, 56, 12); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: 6, y: 2 }); ctx.strokeStyle = '#93c5fd'; ctx.lineWidth = 2; D.roundRect(xx, yy, bw, 56, 12); ctx.stroke();
      T(xx + bw / 2, yy + 26, '20', 22, '#1e40af', 'center', 800); T(xx + bw / 2, yy + 46, '가지', 13, '#64748b', 'center', 700);
      if (i < n - 1 && (i % per) < per - 1) T(xx + bw + gap / 2, yy + 34, '×', 18, '#64748b', 'center', 800); }
    const ey = CAP.y + 100 + rows * 74 + 14;
    const sup = (v) => String(v).split('').map((d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[+d]).join('');
    const expr = n <= 4 ? Array(n).fill('20').join(' × ') + ' = ' + pow20Text(n) : '20' + sup(n) + ' = ' + pow20Text(n);
    D.roundRect(CAP.x + 20, ey, CAP.w - 40, PHONE ? 96 : 84, 14); ctx.fillStyle = '#eef5ff'; ctx.fill();
    textBlock(CAP.x + 34, ey + 32, CAP.w - 68, expr, L(22, 18), '#1e3a8a', 26, 800);
    T(CAP.x + 34, ey + (PHONE ? 78 : 68), n <= 4 ? '자리 수만큼 20을 곱해서 구해요' : '20을 ' + n + '번 곱한 값이에요', 13.5, '#64748b', 'left', 700);
    if (n === 10) textBlock(CAP.x + 20, ey + (PHONE ? 112 : 102), CAP.w - 40, '겨우 10개만 이어도 약 10조 가지예요. 그래서 아미노산이 20종뿐이어도 단백질은 아주 다양해요.', L(15, 13.5), '#15803d', 20, 800);
  }
  function calcOk() { return S.calc.n === 3 && numOf('inCalc') === 8000; }


  /* =========================================================
     ③ 접힘과 구조 : 1차 → 2차 → 3차(물속에서 접힘) → 4차 / 낫 모양 적혈구 빈혈
     ========================================================= */
  const SEQ12 = ['ser', 'leu', 'val', 'lys', 'gln', 'leu', 'glu', 'val', 'leu', 'gln', 'lys', 'val'];
  const isPh = (k) => AA[k].cls === 'phob';
  const FD = PHONE ? { x: 10, y: 10, w: 460, h: 360 } : { x: 14, y: 14, w: 772, h: 372 };
  const FINFO = PHONE ? { x: 10, y: 380, w: 460, h: 250 } : { x: 14, y: 398, w: 772, h: 148 };
  const FR = R0 * 1.25, FB = 2 * FR * 1.08, FSC = FR / R0;
  const FCX = FD.x + FD.w / 2, FCY = FD.y + FD.h / 2 + L(14, 4);
  S.fold = { stage: 1, P: [], V: [], rot: [], run: false, runT: 0, folded: false, coreOk: false, seen: [false, false, false, false], sub: [], subT: 0, ratio: 1 };
  function foldLayout(stage) {
    const out = [];
    if (stage === 1) { SEQ12.forEach((k, i) => out.push({ x: FCX + (i - 5.5) * FB * 0.98, y: FCY, rot: i % 2 ? Math.PI / 2 : -Math.PI / 2 })); }
    else {   // 2차: 앞 6개는 나선, 뒤 6개는 병풍(지그재그)
      let x = FCX - FB * 5.2;
      SEQ12.forEach((k, i) => {
        if (i < 6) { const a = i * 1.15; out.push({ x: x + i * FB * 0.62, y: FCY - FB * 0.5 + Math.sin(a) * FB * 0.62, rot: Math.cos(a) > 0 ? -Math.PI / 2 : Math.PI / 2 }); }
        else { const j = i - 6; out.push({ x: x + 6 * FB * 0.62 + FB * 0.4 + j * FB * 0.84, y: FCY + FB * 0.4 + (j % 2 ? 0.55 : -0.55) * FB, rot: j % 2 ? Math.PI / 2 : -Math.PI / 2 }); }
      });
    }
    return out;
  }
  function foldInit(stage) {
    const lay = foldLayout(stage);
    S.fold.P = lay.map((p) => ({ x: p.x, y: p.y })); S.fold.V = lay.map(() => ({ x: 0, y: 0 })); S.fold.rot = lay.map((p) => p.rot); S.fold.run = false; S.fold.folded = false; S.fold.coreOk = false;
  }
  foldInit(1);
  function foldCentroid() { let x = 0, y = 0; S.fold.P.forEach((p) => { x += p.x; y += p.y; }); return { x: x / 12, y: y / 12 }; }
  function foldMetric() {
    const c = foldCentroid(); let dp = 0, np = 0, dq = 0, nq = 0;
    S.fold.P.forEach((p, i) => { const d = Math.hypot(p.x - c.x, p.y - c.y); if (isPh(SEQ12[i])) { dp += d; np++; } else { dq += d; nq++; } });
    return { ph: dp / np, po: dq / nq, ratio: (dp / np) / (dq / nq) };
  }
  function foldSetStage(s) {
    const f = S.fold;
    if (s === 4 && !f.folded) { showHint('먼저 3차 구조를 완성해야 4차 구조를 볼 수 있어요.'); return; }
    if (s === f.stage) { f.seen[s - 1] = true; return; }
    const prev = f.stage; f.stage = s; f.seen[s - 1] = true; Sound.click();
    if (s <= 2) { f.run = false; f.folded = false; f.coreOk = false; f.V.forEach((v) => { v.x = 0; v.y = 0; }); }
    if (s === 3 && prev !== 4 && !f.folded) { /* 접기 전 모습(2차 배치)에서 시작 */ if (prev === 1) { const lay = foldLayout(2); f.P = lay.map((p) => ({ x: p.x, y: p.y })); f.rot = lay.map((p) => p.rot); } }
    if (s === 4) { f.subT = 0; f.sub = [0, 1, 2, 3].map((k) => ({ x: FCX + (k % 2 ? 1 : -1) * (FD.w * 0.42), y: FCY + (k < 2 ? -1 : 1) * (FD.h * 0.42), rot: k })); }
    updateCtl();
  }
  function foldStart() {
    const f = S.fold; if (f.stage !== 3) { foldSetStage(3); }
    if (f.run) return;
    // 접기 전: 2차 배치에서 시작하되 아주 작은 흔들림을 줘요
    const lay = foldLayout(2), rr = mulberry(9);
    f.P = lay.map((p) => ({ x: p.x + (rr() - 0.5) * 3, y: p.y + (rr() - 0.5) * 3 })); f.V = lay.map(() => ({ x: 0, y: 0 })); f.rot = lay.map((p) => p.rot);
    f.run = true; f.runT = 0; f.folded = false; f.coreOk = false; Sound.click(); updateCtl();
  }
  function foldPhys(dtSub) {
    const f = S.fold, n = 12, R = FR, b = FB, P = f.P, V = f.V, ph = SEQ12.map(isPh), F = P.map(() => ({ x: 0, y: 0 }));
    let cx = 0, cy = 0, px = 0, py = 0, np = 0; P.forEach((p, i) => { cx += p.x; cy += p.y; if (ph[i]) { px += p.x; py += p.y; np++; } }); cx /= n; cy /= n; px /= np; py /= np;
    for (let i = 0; i < n; i++) {
      const p = P[i];
      if (ph[i]) { F[i].x += (px - p.x) * 55; F[i].y += (py - p.y) * 55; }
      else {
        F[i].x += (cx - p.x) * 10; F[i].y += (cy - p.y) * 10;
        const dx = p.x - px, dy = p.y - py, d = Math.hypot(dx, dy) || 1, r0 = 2.3 * R; if (d < r0) { const k = (r0 - d) * 120; F[i].x += dx / d * k; F[i].y += dy / d * k; }
      }
      for (let j = i + 1; j < n; j++) { const dx = P[j].x - p.x, dy = P[j].y - p.y, d = Math.hypot(dx, dy) || 0.01, m = 2 * R * 1.04; if (d < m) { const k = (m - d) * 900; F[i].x -= dx / d * k; F[i].y -= dy / d * k; F[j].x += dx / d * k; F[j].y += dy / d * k; } }
      if (i < n - 1) { const q = P[i + 1], dx = q.x - p.x, dy = q.y - p.y, d = Math.hypot(dx, dy) || 0.01, k = (d - b) * 900; F[i].x += dx / d * k; F[i].y += dy / d * k; F[i + 1].x -= dx / d * k; F[i + 1].y -= dy / d * k; }
    }
    for (let i = 0; i < n; i++) { V[i].x = (V[i].x + F[i].x * dtSub) * 0.93; V[i].y = (V[i].y + F[i].y * dtSub) * 0.93; P[i].x += V[i].x * dtSub; P[i].y += V[i].y * dtSub; }
  }
  function foldUpdate(dt) {
    const f = S.fold;
    if (f.run) {
      f.runT += dt;
      if (RM) { for (let k = 0; k < 450; k++) foldPhys(1 / 90); f.runT = 99; } else { for (let k = 0; k < 2; k++) foldPhys(1 / 90); }
      // 중심을 무대 가운데로
      const c = foldCentroid(); f.P.forEach((p) => { p.x += (FCX - c.x) * Math.min(1, dt * 3); p.y += (FCY - c.y) * Math.min(1, dt * 3); });
      if (f.runT > 4.2) { f.run = false; f.V.forEach((v) => { v.x = 0; v.y = 0; }); f.folded = true; const m = foldMetric(); f.ratio = m.ratio; f.coreOk = m.ratio < 0.85; Sound.success(); const cc = foldCentroid(); parts.burst(cc.x, cc.y, { count: 24, speed: 190, colors: ['#f97316', '#3b82f6', '#22b455'] }); updateCtl(); }
    } else if (f.stage <= 2) {
      const lay = foldLayout(f.stage);
      f.P.forEach((p, i) => { p.x = approach(p.x, lay[i].x, dt, 7); p.y = approach(p.y, lay[i].y, dt, 7); });
      f.rot.forEach((r, i) => { let d = lay[i].rot - r; d = Math.atan2(Math.sin(d), Math.cos(d)); f.rot[i] = r + d * Math.min(1, dt * 7); });
    }
    if (f.stage >= 3) {
      const c = foldCentroid(), folded = f.run || f.folded;
      f.rot.forEach((r, i) => { const p = f.P[i], ang = Math.atan2(p.y - c.y, p.x - c.x); const tgt = folded ? (isPh(SEQ12[i]) ? ang + Math.PI : ang) : r; let d = tgt - r; d = Math.atan2(Math.sin(d), Math.cos(d)); f.rot[i] = r + d * Math.min(1, dt * 6); });
    }
    if (f.stage === 4) {
      f.subT += dt;
      const anchors = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
      f.sub.forEach((s, k) => { const tx = FCX + anchors[k][0] * L(120, 86), ty = FD.y + FD.h * 0.5 + anchors[k][1] * L(80, 66) - 4; s.x = approach(s.x, tx, dt, 3.2); s.y = approach(s.y, ty, dt, 3.2); });
    }
  }
  function drawChain(P, rot, o) {
    o = o || {};
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = '#7c2d12'; ctx.lineWidth = (o.sc || 1) * 9; ctx.beginPath(); P.forEach((p, i) => { if (i) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); }); ctx.stroke();
    ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = (o.sc || 1) * 5; ctx.stroke(); ctx.restore();
  }
  function foldDraw(dt, t) {
    const f = S.fold, st = f.stage;
    panel(FD.x, FD.y, FD.w, FD.h, 18, st >= 3 ? '#eaf5ff' : '#fbfcff'); panel(FINFO.x, FINFO.y, FINFO.w, FINFO.h, 18, '#ffffff');
    if (st >= 3) { ctx.save(); D.roundRect(FD.x + 4, FD.y + 4, FD.w - 8, FD.h - 8, 15); ctx.clip(); const g = ctx.createLinearGradient(0, FD.y, 0, FD.y + FD.h); g.addColorStop(0, '#d6ecfc'); g.addColorStop(1, '#b6dcf5'); ctx.fillStyle = g; ctx.fillRect(FD.x, FD.y, FD.w, FD.h); for (let k = 0; k < 50; k++) { ctx.fillStyle = 'rgba(80,150,225,.2)'; ctx.beginPath(); ctx.arc(FD.x + 20 + ((k * 89) % 100) / 100 * (FD.w - 40) + Math.sin(t + k) * 4, FD.y + 50 + ((k * 47) % 100) / 100 * (FD.h - 70) + Math.cos(t * 0.9 + k) * 4, 3, 0, TAU); ctx.fill(); } ctx.restore(); }
    const titles = ['1차 구조 (아미노산 서열)', '2차 구조 (나선 · 병풍)', f.folded ? '3차 구조 (입체 구조)' : (f.run ? '물속에서 접히는 중…' : '3차 구조 만들기'), '4차 구조 (폴리펩타이드 4개)'];
    T(FD.x + 18, FD.y + 32, titles[st - 1], L(19, 16), st >= 3 ? '#1d4f91' : '#1e3a8a', 'left', 800);
    const subs = ['아미노산이 펩타이드 결합으로 이어진 순서예요.', '사슬 일부가 규칙적으로 접혀요.', f.folded ? '소수성 R기는 안쪽에, 친수성 R기는 물과 닿는 바깥쪽에 있어요.' : '아래 버튼으로 물속에 풀어 놓으면 사슬이 접혀요.', '폴리펩타이드 2개 이상이 모여 하나의 단백질이 돼요.'];
    T(FD.x + 18, FD.y + 56, subs[st - 1], L(14.5, 13), '#64748b', 'left', 700);
    if (st <= 3) {
      drawChain(f.P, f.rot);
      f.P.forEach((p, i) => drawAA(p.x, p.y, SEQ12[i], { rot: f.rot[i], scale: FSC, flat: false, halo: (f.folded || f.run) && !isPh(SEQ12[i]), t }));
      if (st === 1) f.P.forEach((p, i) => T(p.x, p.y + (i % 2 ? -1 : 1) * FR * 2.5 + (i % 2 ? -6 : 14), AA[SEQ12[i]].name, 13, '#26324a', 'center', 800, { stroke: 'rgba(255,255,255,.8)', strokeWidth: 3 }));
      if (st === 2) { D.label(f.P[2].x, f.P[2].y - FB * 1.5, '나선 모양', { bg: '#ede9fe', color: '#5b21b6', border: '#c4b5fd', size: 13 }); D.label((f.P[8].x + f.P[9].x) / 2, f.P[9].y + FB * 1.8, '병풍 모양', { bg: '#ccfbf1', color: '#0f766e', border: '#99f6e4', size: 13 }); }
      if (st === 3 && (f.folded || f.run)) {
        const c = foldCentroid();
        if (f.folded) { callout(c.x - 4, c.y - 4, c.x - L(190, 130), c.y - L(104, 92), '소수성 R기: 안쪽에 모여요', { line: '#ea580c', border: '#fdba74', bg: '#fff7ed', color: '#c2410c' }); callout(c.x + FB * 1.8, c.y + FB * 1.3, c.x + L(170, 100), c.y + L(120, 106), '친수성 · 전하 R기: 바깥(물과 닿음)', { line: '#2563eb', border: '#93c5fd', bg: '#eff6ff', color: '#1d4ed8' }); }
        else { const k = Math.min(1, f.runT / 4.2); D.roundRect(FD.x + 18, FD.y + FD.h - 28, (FD.w - 36), 8, 4); ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fill(); D.roundRect(FD.x + 18, FD.y + FD.h - 28, (FD.w - 36) * k, 8, 4); ctx.fillStyle = '#f97316'; ctx.fill(); }
      }
    } else {
      // 4차: 폴리펩타이드 4개가 모여요 (3차 구조 모양을 축소해서)
      const c = foldCentroid(), rel = f.P.map((p) => ({ x: p.x - c.x, y: p.y - c.y })), sc = L(0.56, 0.5);
      f.sub.forEach((s, k) => {
        const col = ['#3b82f6', '#3b82f6', '#06b6d4', '#06b6d4'][k]; T(s.x, s.y + L(60, 54), (k < 2 ? 'α 사슬 ' : 'β 사슬 ') + (k % 2 + 1), 13, k < 2 ? '#1d4ed8' : '#0e7490', 'center', 800);
        ctx.save(); ctx.globalAlpha = 0.24; D.glow(s.x, s.y, 92 * (PHONE ? 0.75 : 1), col, 0.9); ctx.restore();
        const P2 = rel.map((p) => ({ x: s.x + p.x * sc, y: s.y + p.y * sc }));
        drawChain(P2, null, { sc: 0.55 });
        P2.forEach((p, i) => { const ang = Math.atan2(rel[i].y, rel[i].x); drawAA(p.x, p.y, SEQ12[i], { rot: isPh(SEQ12[i]) ? ang + Math.PI : ang, scale: FSC * sc, flat: true }); });
        D.sphere(s.x, s.y, 7, '#dc2626', { gloss: true });
      });
      D.label(FCX, FD.y + FD.h - 26, '헤모글로빈 = 폴리펩타이드 4개 (4차 구조)', { bg: '#1e3a8a', size: L(15, 13.5) });
      T(FD.x + FD.w - 18, FD.y + 32, '● 붉은 점: 헴(산소와 결합)', 13, '#b91c1c', 'right', 800);
    }
    // 서열 칩
    T(FINFO.x + 16, FINFO.y + 28, '아미노산 서열 (1차 구조)', L(15, 14), '#334155', 'left', 800);
    const cw = (FINFO.w - 32 - 11 * 4) / 12;
    SEQ12.forEach((k, i) => { const x = FINFO.x + 16 + i * (cw + 4); D.roundRect(x, FINFO.y + 40, cw, 34, 7); ctx.fillStyle = CLS[AA[k].cls].soft; ctx.fill(); ctx.strokeStyle = CLS[AA[k].cls].col; ctx.lineWidth = 2; ctx.stroke(); T(x + cw / 2, FINFO.y + 63, AA[k].ab, PHONE ? 11.5 : 13, '#1f2d44', 'center', 800); });
    const msgs = [
      '1차 구조: 아미노산의 종류 · 수 · 배열 순서 그 자체예요. 이 서열이 단백질의 모양을 결정해요.',
      '2차 구조: 사슬이 나선(코일 모양)이나 병풍(주름 모양)으로 규칙적으로 접혀요.',
      '3차 구조: R기끼리의 상호작용으로 폴리펩타이드 전체가 입체적으로 접혀요. 소수성 R기는 물을 피해 안쪽에 모여요.',
      '4차 구조: 폴리펩타이드 2개 이상이 모인 구조예요. 헤모글로빈은 폴리펩타이드 4개로 이루어져 있어요.',
    ];
    textBlock(FINFO.x + 16, FINFO.y + 100, FINFO.w - 32, msgs[st - 1], L(15, 13.5), '#475569', L(21, 19), 700);
    if (st === 3 && f.folded) { const m = foldMetric(); T(FD.x + 18, FD.y + FD.h - 14, '중심까지 평균 거리: 소수성 ' + (m.ph / FR).toFixed(1) + ' / 친수성 · 전하 ' + (m.po / FR).toFixed(1) + ' (구슬 반지름의 배수)', 13, f.coreOk ? '#15803d' : '#b91c1c', 'left', 800); }
  }

  /* ----- 낫 모양 적혈구 빈혈 ----- */
  const SK = PHONE ? { x: 10, y: 10, w: 460, h: 620 } : { x: 14, y: 14, w: 772, h: 532 };
  const SEQ_N = [['Val', 'phob'], ['His', 'chg'], ['Leu', 'phob'], ['Thr', 'phil'], ['Pro', 'phob'], ['Glu', 'chg'], ['Glu', 'chg'], ['Lys', 'chg']];
  S.sk = { mut: false, low: false, poly: 0, sick: 0, seen: { n: true, m: false, s: false }, mols: [] };
  function skInit() { const rr = mulberry(31); S.sk.mols = []; for (let i = 0; i < 6; i++) S.sk.mols.push({ x: 0, y: 0, ox: rr() * TAU, oy: rr() * TAU, fx: 0.5 + rr() * 0.5 }); }
  skInit();
  function skSet(mut, low) {
    const k = S.sk; if (mut != null) k.mut = mut; if (low != null) k.low = low; Sound.click();
    if (k.mut) k.seen.m = true;
    updateCtl();
  }
  function skUpdate(dt, t) {
    const k = S.sk, poly = k.mut && k.low ? 1 : 0;
    k.poly = approach(k.poly, poly, dt, RM ? 60 : 1.2); k.sick = approach(k.sick, poly, dt, RM ? 60 : 0.9);
    if (k.mut && k.low && k.sick > 0.95) k.seen.s = true;
  }
  function drawRBC(cx, cy, r, m) {
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(-0.5 * m);
    const sm = smooth(m), R = r * (1 + 0.15 * sm), ox = sm * R * 0.62, ir = sm * R * 0.92;
    ctx.save(); ctx.shadowColor = 'rgba(120,20,20,.35)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 4; ctx.fillStyle = '#b91c1c';
    ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.fill(); ctx.restore();
    ctx.save(); ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.clip();
    // 안쪽 원을 뺀 부분만 칠해요 (초승달 모양)
    ctx.beginPath(); ctx.rect(-3 * R, -3 * R, 6 * R, 6 * R); if (ir > 1) { ctx.moveTo(ox + ir, 0); ctx.arc(ox, 0, ir, 0, TAU, true); }
    const g = ctx.createRadialGradient(-R * 0.3, -R * 0.3, R * 0.1, 0, 0, R * 1.2); g.addColorStop(0, '#f87171'); g.addColorStop(1, '#b91c1c');
    ctx.globalCompositeOperation = 'source-over';
    // 바닥(그림자용 원)이 안쪽 원 부분에 남지 않도록 배경색으로 한 번 덮어요
    ctx.fillStyle = '#fffbfb'; ctx.beginPath(); if (ir > 1) { ctx.arc(ox, 0, ir, 0, TAU); ctx.fill(); }
    ctx.beginPath(); ctx.rect(-3 * R, -3 * R, 6 * R, 6 * R); if (ir > 1) { ctx.moveTo(ox + ir, 0); ctx.arc(ox, 0, ir, 0, TAU, true); }
    ctx.fillStyle = g; ctx.fill('evenodd'); ctx.restore();
    const da = Math.max(0, 1 - 2 * sm);
    if (da > 0.01) { ctx.fillStyle = 'rgba(120,20,20,' + (0.28 * da) + ')'; ctx.beginPath(); ctx.arc(0, 0, R * 0.5, 0, TAU); ctx.fill(); }
    ctx.restore();
  }
  function skDraw(dt, t) {
    skUpdate(dt, t);
    const k = S.sk, m = k.mut;
    panel(SK.x, SK.y, SK.w, SK.h, 18, '#fffbfb');
    // (1) 서열
    T(SK.x + 20, SK.y + 32, m ? '변이 헤모글로빈 β 사슬 (처음 8개)' : '정상 헤모글로빈 β 사슬 (처음 8개)', L(18, 15), m ? '#b91c1c' : '#1e3a8a', 'left', 800);
    const cw = (SK.w - 40 - 7 * 6) / 8, y0 = SK.y + 48;
    SEQ_N.forEach((q, i) => {
      const x = SK.x + 20 + i * (cw + 6), six = i === 5, nm = six && m ? ['Val', 'phob'] : q, cl = CLS[nm[1]];
      D.roundRect(x, y0, cw, 46, 9); ctx.fillStyle = cl.soft; ctx.fill(); ctx.strokeStyle = six ? (m ? '#dc2626' : '#2563eb') : cl.col; ctx.lineWidth = six ? 4 : 2; ctx.stroke();
      T(x + cw / 2, y0 + 28, nm[0], L(17, 14), '#1f2d44', 'center', 800); T(x + cw / 2, y0 + 62, String(i + 1), 12.5, '#94a3b8', 'center', 700);
    });
    D.label(SK.x + 20 + 5 * (cw + 6) + cw / 2, y0 + 82, m ? '6번째: 글루탐산 → 발린 (친수성 → 소수성)' : '6번째: 글루탐산 (친수성, 전하)', { bg: m ? '#fee2e2' : '#dbeafe', color: m ? '#b91c1c' : '#1d4ed8', border: m ? '#fca5a5' : '#93c5fd', size: 13 });
    // (2) 헤모글로빈 분자
    const my = SK.y + L(206, 218), mx0 = SK.x + 50, mw = SK.w - 100, r = L(30, 24);
    T(SK.x + 20, my - 52, '산소가 ' + (k.low ? '적을 때' : '많을 때') + '의 헤모글로빈 분자들', L(16, 14), '#334155', 'left', 800);
    k.mols.forEach((o, i) => {
      const wx = mx0 + mw * (i + 0.5) / 6 + Math.sin(t * o.fx + o.ox) * 8, wy = my + Math.cos(t * o.fx * 0.8 + o.oy) * 14;
      const lx = mx0 + 20 + i * (2 * r + 2) + (mw - 6 * (2 * r + 2)) / 2, ly = my;    // 달라붙으면 한 줄로 이어져요
      const tx = lerp(wx, lx, k.poly), ty = lerp(wy, ly, k.poly); o.x = tx; o.y = ty;
    });
    if (k.poly > 0.2) { ctx.save(); ctx.globalAlpha = k.poly; ctx.strokeStyle = '#f97316'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); k.mols.forEach((o, i) => { if (i) ctx.lineTo(o.x, o.y); else ctx.moveTo(o.x, o.y); }); ctx.stroke(); ctx.restore(); }
    k.mols.forEach((o) => {
      D.sphere(o.x, o.y, r, k.low ? '#9db9dc' : '#bfdbfe', { gloss: true, shadow: true });
      D.sphere(o.x, o.y, r * 0.28, k.low ? '#7f1d1d' : '#dc2626', { gloss: true });
      if (m) { D.sphere(o.x + r * 0.95, o.y, r * 0.3, '#f97316', { gloss: true }); }
      if (!k.low) { ctx.fillStyle = 'rgba(220,38,38,.85)'; ctx.beginPath(); ctx.arc(o.x - r * 0.45, o.y - r * 0.4, 3, 0, TAU); ctx.fill(); }
    });
    if (m) D.label(SK.x + SK.w - 24, my - 50, '주황 돌기: 표면의 소수성 발린', { bg: '#ffedd5', color: '#c2410c', border: '#fdba74', size: 13, align: 'right' });
    D.label(SK.x + SK.w / 2, my + r + 26, k.poly > 0.8 ? '분자들이 서로 달라붙어 길게 이어져요' : (m ? '산소가 많을 때는 따로 떨어져 있어요' : '분자들이 따로따로 있어요'), { bg: k.poly > 0.8 ? '#fee2e2' : '#f1f5f9', color: k.poly > 0.8 ? '#b91c1c' : '#475569', border: k.poly > 0.8 ? '#fca5a5' : '#cbd5e1', size: 13.5 });
    // (3) 적혈구
    const ry = SK.y + SK.h - L(124, 200);
    drawRBC(SK.x + SK.w * L(0.28, 0.3), ry, L(64, 54), k.sick);
    T(SK.x + SK.w * L(0.28, 0.3), ry + L(92, 82), k.sick > 0.5 ? '낫 모양 적혈구' : '둥근 원반 모양 적혈구', 15, k.sick > 0.5 ? '#b91c1c' : '#1e3a8a', 'center', 800);
    const msg = !m ? '서열이 정상이면 접힘도 정상이라, 산소가 적어도 헤모글로빈이 따로 있고 적혈구는 둥근 모양이에요.' : (k.low ? '글루탐산 하나가 발린으로 바뀌면 접힘이 달라져요. 산소가 적을 때 헤모글로빈이 달라붙어 적혈구가 낫 모양이 돼요.' : '서열이 바뀌어도 산소가 많을 때는 모양이 거의 정상이에요. 산소를 줄여 보세요.');
    textBlock(SK.x + SK.w * L(0.5, 0.05), ry - L(56, -112), SK.w * L(0.46, 0.9), msg, L(15, 13.5), '#475569', L(21, 19), 700);
  }


  /* =========================================================
     ④ 기능과 변성
     ========================================================= */
  const FUNCS = [
    { id: 'amy', box: '아밀레이스', desc: '침 속에서 녹말을 분해해요', card: '효소', sub: '화학 반응을 도와요' },
    { id: 'hb', box: '헤모글로빈', desc: '적혈구 속에서 산소와 결합해요', card: '운반', sub: '물질을 옮겨요' },
    { id: 'col', box: '콜라젠', desc: '피부 · 뼈 · 힘줄에 많아요', card: '구조', sub: '몸을 이루고 지탱해요' },
    { id: 'ins', box: '인슐린', desc: '혈당을 낮추라고 알리는 호르몬', card: '신호 · 조절', sub: '다른 세포에 신호를 줘요' },
    { id: 'ab', box: '항체', desc: '병원체에 달라붙어요', card: '방어', sub: '몸을 지켜요' },
    { id: 'act', box: '액틴과 미오신', desc: '근육 세포 속 섬유예요', card: '운동', sub: '근육을 수축시켜요' },
  ];
  const FBOX = PHONE ? { w: 224, h: 122, g: 12 } : { w: 250, h: 132, g: 11 };
  const funcS = new Sorter({
    cards: [3, 0, 5, 2, 4, 1].map((i) => ({ id: FUNCS[i].id, label: FUNCS[i].card, sub: FUNCS[i].sub, col: '#7c3aed' })),
    boxes: FUNCS.map((f, i) => ({ id: f.id, label: f.box, col: '#16a34a', x: PHONE ? 10 + (i % 2) * (FBOX.w + FBOX.g) : 14 + (i % 3) * (FBOX.w + FBOX.g), y: PHONE ? 10 + Math.floor(i / 2) * (FBOX.h + 10) : 14 + Math.floor(i / 3) * (FBOX.h + 12), w: FBOX.w, h: FBOX.h, cols: 1, hdr: PHONE ? 76 : 82, draw: (b) => { textBlock(b.x + 12, b.y + 44, b.w - 24, f.desc, 13.5, '#475569', 18, 700); } })),
    cw: PHONE ? 214 : 236, ch: 48, kh: 44,
    tray: (i) => (PHONE ? { x: 16 + (i % 2) * 226, y: 452 + Math.floor(i / 2) * 58 } : { x: 28 + (i % 3) * 252, y: 332 + Math.floor(i / 3) * 62 }),
    onChange() { updateCtl(); },
  });
  const funcWrong = () => funcS.cards.filter((c) => c.zone && c.zone !== c.id);
  const FTRAY = PHONE ? { x: 10, y: 404, w: 460, h: 226 } : { x: 14, y: 290, w: 772, h: 256 };
  function funcDraw(dt, t) {
    funcS.update(dt); funcS.drawBoxes();
    panel(FTRAY.x, FTRAY.y, FTRAY.w, FTRAY.h, 16, '#ffffff');
    T(FTRAY.x + 16, FTRAY.y + 30, '기능 카드 6장을 알맞은 단백질 상자에 한 장씩 넣어요', L(15, 13.5), '#334155', 'left', 800);
    funcS.drawCards();
  }
  const funcPT = { down: (p) => funcS.down(p), move: (p) => funcS.move(p), up: (p) => funcS.up(p), hover: (p) => funcS.hover(p) };

  /* ----- 변성 실험 ----- */
  const SEQ16 = ['ser', 'leu', 'val', 'lys', 'gln', 'leu', 'glu', 'val', 'leu', 'gln', 'lys', 'val', 'ser', 'leu', 'glu', 'val'];
  const ENZ = PHONE ? { x: 10, y: 10, w: 460, h: 280 } : { x: 14, y: 14, w: 490, h: 396 };
  const TUBEP = PHONE ? { x: 10, y: 298, w: 460, h: 190 } : { x: 516, y: 14, w: 270, h: 396 };
  const SEQP = PHONE ? { x: 10, y: 498, w: 460, h: 132 } : { x: 14, y: 422, w: 772, h: 124 };
  const ECX = ENZ.x + ENZ.w * 0.44, ECY = ENZ.y + ENZ.h * 0.52 + L(8, 0), ERR = L(98, 68), ECR = L(13.5, 9.5);
  const FOLDP = SEQ16.map((k, i) => { const a = (38 + i * (284 / 15)) * Math.PI / 180; return { x: ECX + Math.cos(a) * ERR, y: ECY + Math.sin(a) * ERR }; });
  const UNFOLDP = (() => { const rr = mulberry(41); return SEQ16.map((k, i) => ({ x: ENZ.x + 34 + i * (ENZ.w - 68) / 15, y: ECY + Math.sin(i * 1.9) * L(34, 26) + (rr() - 0.5) * L(40, 26) })); })();
  S.dn = { T: 25, acid: false, alc: false, f: 1, fmin: 1, bu: 0, buOn: false, buDen: false, bub: [] };
  function dnReset() { Object.assign(S.dn, { T: 25, acid: false, alc: false, f: 1, fmin: 1, bu: 0, buOn: false, buDen: false, bub: [] }); const e = $('#sTemp'); if (e) e.value = 25; updateCtl(); }
  const fHeat = (T) => 1 - smooth((T - 45) / 25);
  function dnUpdate(dt) {
    const d = S.dn, tgt = Math.min(fHeat(d.T), d.acid ? 0 : 1, d.alc ? 0 : 1);
    d.fmin = Math.min(d.fmin, tgt);                       // 변성은 되돌아오지 않아요
    d.f = RM ? d.fmin : approach(d.f, d.fmin, dt, 2.0);
    if (d.buOn) d.bu = approach(d.bu, 1, dt, RM ? 60 : 0.9);
    if (d.buOn && d.bu > 0.9 && d.fmin < 0.02) d.buDen = true;
    if (d.T > 52 && !RM && Math.random() < dt * (d.T - 50) * 0.5) parts.emit({ x: TUBEP.x + TUBEP.w / 2 + (Math.random() - 0.5) * 30, y: TUBEP.y + L(300, 120), vx: 0, vy: -40 - Math.random() * 30, life: 1.0, size: 2.5 + Math.random() * 2, color: 'rgba(255,255,255,.85)', shape: 'bubble' });
  }
  function drawEnzyme(f, t) {
    const P = FOLDP.map((p, i) => { const u = UNFOLDP[i], j = (1 - f) * 3.2; return { x: lerp(u.x, p.x, f) + Math.sin(t * 2.2 + i) * j, y: lerp(u.y, p.y, f) + Math.cos(t * 1.9 + i * 1.3) * j }; });
    drawChain(P, null, { sc: 0.85 });
    P.forEach((p, i) => { const c = { x: ECX, y: ECY }, ang = Math.atan2(p.y - c.y, p.x - c.x); drawAA(p.x, p.y, SEQ16[i], { rot: f > 0.5 ? ang : i * 0.9, scale: ECR / R0, flat: true }); });
    // 활성 부위와 기질
    const sx = ECX + ERR * 0.42, sy = ECY, per = 4.4, u = (t % per) / per;
    if (f > 0.35) { ctx.save(); ctx.globalAlpha = smooth((f - 0.35) / 0.65); ctx.setLineDash([5, 5]); ctx.strokeStyle = '#16a34a'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(sx, sy, 28, 0, TAU); ctx.stroke(); ctx.setLineDash([]); D.label(sx + 6, sy - 44, '활성 부위', { bg: '#dcfce7', color: '#15803d', border: '#86efac', size: 13 }); ctx.restore(); }
    const far = { x: ENZ.x + ENZ.w - 44, y: ECY - L(120, 90) }, fit = f > 0.85;
    let bx, by, prod = 0;
    if (u < 0.35) { const k = smooth(u / 0.35); bx = lerp(far.x, sx + (fit ? 0 : 52), k); by = lerp(far.y, sy - (fit ? 0 : 6), k); }
    else if (fit) { bx = sx; by = sy; prod = u > 0.55 ? (u - 0.55) / 0.45 : 0; }
    else { const k = smooth((u - 0.35) / 0.4); bx = lerp(sx + 52, far.x + 30, Math.min(1, k)); by = lerp(sy - 6, far.y + 40, Math.min(1, k)); }
    const sub = (x, y, a, rot) => { ctx.save(); ctx.translate(x, y); ctx.rotate(rot || 0); ctx.globalAlpha = a; D.shadow(() => { ctx.beginPath(); ctx.moveTo(0, -13); ctx.lineTo(13, 0); ctx.lineTo(0, 13); ctx.lineTo(-13, 0); ctx.closePath(); ctx.fillStyle = '#fbbf24'; ctx.fill(); }, { blur: 5, y: 2 }); ctx.strokeStyle = '#b45309'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore(); };
    if (prod > 0) { sub(bx + 40 * prod, by - 26 * prod, 1 - prod, 0.4); sub(bx + 46 * prod, by + 30 * prod, 1 - prod, -0.4); } else sub(bx, by, 1, t * 0.8);
    if (!fit && u >= 0.35 && u < 0.5 && f > 0.02) T(sx + 66, sy - 30, '맞지 않아요', 13, '#dc2626', 'center', 800);
    if (fit && u > 0.35 && u < 0.62) D.glow(sx, sy, 44, '#fbbf24', 0.5);
    return P;
  }
  function drawEggTube(d, t) {
    const cx = TUBEP.x + TUBEP.w / 2, top = TUBEP.y + L(56, 40), h = L(250, 110), w = L(66, 40);
    const cloud = 1 - d.f, base = C.mix('#e5f2fb', '#fffdf3', cloud);
    let liq = base; if (d.bu > 0.01) { const blue = C.mix(base, '#4b8fe0', Math.min(1, d.bu * 3)), vio = '#8a4fc7'; liq = d.bu < 0.4 ? blue : C.mix('#4b8fe0', vio, (d.bu - 0.4) / 0.6); }
    const path = () => { ctx.beginPath(); ctx.moveTo(cx - w / 2, top); ctx.lineTo(cx - w / 2, top + h - w / 2); ctx.arc(cx, top + h - w / 2, w / 2, Math.PI, 0, true); ctx.lineTo(cx + w / 2, top); };
    ctx.save(); path(); ctx.closePath(); ctx.clip(); const lv = 0.7; ctx.fillStyle = C.rgba(liq, 0.95); ctx.fillRect(cx - w, top + h * (1 - lv), w * 2, h * lv + 4);
    if (cloud > 0.3) { for (let k = 0; k < 14; k++) { ctx.fillStyle = 'rgba(255,255,255,' + 0.5 * cloud + ')'; ctx.beginPath(); ctx.arc(cx - w / 2 + 6 + ((k * 37) % 100) / 100 * (w - 12), top + h * 0.4 + ((k * 61) % 100) / 100 * h * 0.55, 3 + (k % 3), 0, TAU); ctx.fill(); } }
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(cx - w / 2 + 4, top + 6, 3.5, h - 12); ctx.restore();
    ctx.save(); path(); ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 3; ctx.stroke(); ctx.restore();
    const T0 = d.T, ag = d.acid ? '강산' : d.alc ? '알코올' : T0 > 40 ? '가열' : '';
    T(cx, top + h + L(32, 22), '달걀 흰자 용액 (단백질)', L(14.5, 13.5), '#334155', 'center', 800);
    T(cx, top + h + L(54, 42), d.f > 0.95 ? '투명해요' : d.f > 0.1 ? '뿌옇게 변하는 중' : '하얗게 굳었어요', 13.5, d.f > 0.95 ? '#64748b' : '#b45309', 'center', 800);
    if (d.bu > 0.9) D.label(PHONE ? TUBEP.x + TUBEP.w - 86 : cx, PHONE ? TUBEP.y + 70 : top + h + 78, '뷰렛 반응: 보라색', { bg: '#7c3aed', size: 13.5 });
    if (PHONE) { /* 폰은 튜브를 왼쪽에 두고 글을 오른쪽에 */ }
    if (T0 > 40) D.flame(cx, top + h + L(8, 4), clamp((T0 - 35) / 55, 0, 1) * L(34, 22), t);
  }
  function dnDraw(dt, t) {
    dnUpdate(dt);
    const d = S.dn;
    panel(ENZ.x, ENZ.y, ENZ.w, ENZ.h, 18, '#fbfdf9'); panel(TUBEP.x, TUBEP.y, TUBEP.w, TUBEP.h, 18, '#eef3f8'); panel(SEQP.x, SEQP.y, SEQP.w, SEQP.h, 18, '#ffffff');
    T(ENZ.x + 18, ENZ.y + 32, '효소 단백질과 기질', L(19, 16), '#14532d', 'left', 800);
    T(ENZ.x + 18, ENZ.y + 56, d.f > 0.85 ? '입체 구조가 그대로라서 기질이 활성 부위에 꼭 맞아요.' : d.f > 0.1 ? '입체 구조가 풀리는 중이에요.' : '입체 구조가 풀려 기질이 맞지 않아요.', L(14, 13), d.f > 0.85 ? '#15803d' : '#b45309', 'left', 700);
    drawEnzyme(d.f, t);
    // 활성 막대 (실제 값)
    const act = Math.round(d.f * 100), bx = ENZ.x + 20, bw = ENZ.w - 40, by = ENZ.y + ENZ.h - 40;
    T(bx, by - 8, '효소 활성 ' + act + ' %', L(16, 14.5), act > 50 ? '#15803d' : act > 0 ? '#b45309' : '#b91c1c', 'left', 800);
    D.roundRect(bx, by, bw, 14, 7); ctx.fillStyle = '#e5e7eb'; ctx.fill(); if (d.f > 0.004) { D.roundRect(bx, by, Math.max(14, bw * d.f), 14, 7); ctx.fillStyle = act > 50 ? '#22c55e' : act > 0 ? '#f59e0b' : '#ef4444'; ctx.fill(); }
    T(TUBEP.x + 18, TUBEP.y + 32, '처리: ' + (d.acid ? '강산' : d.alc ? '알코올' : '열 ' + d.T + ' °C'), L(17, 15), '#1e3a8a', 'left', 800);
    drawEggTube(d, t);
    // 서열 (변하지 않음)
    T(SEQP.x + 16, SEQP.y + 28, '아미노산 서열 (1차 구조): 변성되어도 그대로예요', L(15, 13.5), '#334155', 'left', 800);
    const n = 16, cw = (SEQP.w - 32 - (n - 1) * 3) / n;
    SEQ16.forEach((k, i) => { const x = SEQP.x + 16 + i * (cw + 3); D.roundRect(x, SEQP.y + 40, cw, PHONE ? 30 : 34, 6); ctx.fillStyle = CLS[AA[k].cls].soft; ctx.fill(); ctx.strokeStyle = CLS[AA[k].cls].col; ctx.lineWidth = 1.6; ctx.stroke(); T(x + cw / 2, SEQP.y + (PHONE ? 60 : 63), AA[k].ab.slice(0, PHONE ? 1 : 3), PHONE ? 12.5 : 12.5, '#1f2d44', 'center', 800); });
    textBlock(SEQP.x + 16, SEQP.y + (PHONE ? 90 : 96), SEQP.w - 32, d.fmin < 0.5 ? '변성된 단백질은 식혀도 원래 모양으로 돌아오지 않아요. 서열은 그대로지만 입체 구조가 풀려 기능을 잃었어요.' : '열 · 강산 · 알코올 · 중금속은 입체 구조를 풀어 기능을 잃게 해요. (변성)', L(14.5, 13), '#475569', L(20, 18), 700);
  }


  /* =========================================================
     화면 전환 · 조작 연결
     ========================================================= */
  function setMode(m) {
    if (S.mode !== m) S.fade = 1;
    S.mode = m;
    PT = { aa: aaPT, sortaa: sortAAPT, chain: chPT, calc: null, fold: null, sickle: null, func: funcPT, denat: null }[m] || null;
    if (m === 'sickle' && !S.sk.seen.n) S.sk.seen.n = true;
    hideHint(); updateCtl();
  }
  const ctlNodes = $$('#ctrlCard .control');
  function updateCtl() {
    const fr = game ? game.free : false, lvNow = game ? game.level : 0;
    ctlNodes.forEach((n) => { n.hidden = (n.dataset.modes || '').split(' ').indexOf(S.mode) < 0; });
    modeButtons(S.mode, lvNow, fr);
    $('#aaNote').innerHTML = '구슬을 <b>눌러서</b> 물에 넣어요. 지금까지 <b>' + aaCount() + ' / 6종</b> 넣었어요.';
    $('#oCalc').textContent = 'n = ' + S.calc.n;
    $('#inCalc').classList.toggle('ok', calcOk());
    chipSet($('#stageSel'), S.fold.stage);
    $('#foldBtn').hidden = S.fold.stage !== 3; $('#foldBtn').disabled = S.fold.run; $('#foldBtn').textContent = S.fold.run ? '💧 접히는 중…' : S.fold.folded ? '↺ 다시 풀어서 접기' : '💧 물에 풀어 접기';
    $('#foldNote').innerHTML = ({ 1: '구슬 12개가 <b>1차 구조</b>(아미노산 서열)예요.', 2: '사슬의 일부가 <b>나선</b>과 <b>병풍</b>으로 접혀요.', 3: S.fold.folded ? '소수성 R기(주황)가 <b>안쪽</b>에 모였어요!' : '버튼을 눌러 사슬을 물에 풀어 놓아요.', 4: '완성한 단백질 <b>4개</b>가 모여 4차 구조가 돼요.' })[S.fold.stage];
    chipSet($('#sickSeg'), S.sk.mut ? 'm' : 'n'); chipSet($('#oxySeg'), S.sk.low ? 'low' : 'hi');
    $('#oTemp').textContent = S.dn.T + ' °C';
    $('#btnAcid').classList.toggle('on', S.dn.acid); $('#btnAlc').classList.toggle('on', S.dn.alc);
    $('#btnAcid').textContent = S.dn.acid ? '🍋 강산 넣었어요' : '🍋 강산 넣기'; $('#btnAlc').textContent = S.dn.alc ? '🧴 알코올 넣었어요' : '🧴 알코올 넣기';
    $('#btnBiu').disabled = S.dn.buOn;
  }
  bindModeSeg(setMode);
  $('#aaClear').addEventListener('click', () => { Sound.click(); aaClear(); updateCtl(); });
  $('#sortAAReset').addEventListener('click', () => { Sound.click(); sortAA.reset(); });
  $('#chReset').addEventListener('click', () => { Sound.click(); chReset(); });
  $('#sCalc').addEventListener('input', (e) => { S.calc.n = +e.target.value; updateCtl(); });
  $('#inCalc').addEventListener('input', updateCtl);
  $$('#stageSel button').forEach((b) => b.addEventListener('click', () => foldSetStage(+b.dataset.v)));
  $('#foldBtn').addEventListener('click', foldStart);
  $$('#sickSeg button').forEach((b) => b.addEventListener('click', () => skSet(b.dataset.v === 'm', null)));
  $$('#oxySeg button').forEach((b) => b.addEventListener('click', () => skSet(null, b.dataset.v === 'low')));
  $('#funcReset').addEventListener('click', () => { Sound.click(); funcS.reset(); });
  $('#sTemp').addEventListener('input', (e) => { S.dn.T = +e.target.value; updateCtl(); });
  $('#btnAcid').addEventListener('click', () => { S.dn.acid = !S.dn.acid; Sound.click(); updateCtl(); });
  $('#btnAlc').addEventListener('click', () => { S.dn.alc = !S.dn.alc; Sound.click(); updateCtl(); });
  $('#btnBiu').addEventListener('click', () => { S.dn.buOn = true; Sound.click(); updateCtl(); });
  $('#dnReset').addEventListener('click', () => { Sound.click(); dnReset(); });

  /* =========================================================
     미션
     ========================================================= */
  const levels = [
    {
      title: '아미노산', short: '아미노산', icon: '🧩', phase: '모형',
      intro: '<p class="si-q">❓ 탐구 질문: 같은 아미노산으로 만들어도 어떤 단백질은 효소가 되고 어떤 단백질은 근육이 되는 까닭은?</p><p>🔗 <b>통합과학</b>에서 DNA의 정보(mRNA의 코돈)가 <b>아미노산의 순서</b>를 정해 단백질이 만들어진다고 배웠어요. 이번에는 아미노산 구슬을 직접 만져 보고, 사슬이 <b>어떻게 접혀서</b> 기능을 갖게 되는지 알아봐요.</p><p>💡 화학식 대신 <b>구슬(공통 부분 + 곁사슬 R기 색)과 연결 막대</b>로 나타내요.</p>',
      features: ['aa', 'sortaa'],
      setup() { setMode('aa'); },
      recap: '아미노산은 20종이고 공통 부분은 같으며 곁사슬 R기만 달라요. R기는 친수성 · 소수성 · 전하를 띤 것으로 나뉘고, 아미노산의 종류 · 수 · 배열 순서가 달라져 수많은 단백질이 만들어져요.',
      summary: '<ul><li>단백질의 단위체는 <b>아미노산</b>(20종). 공통 부분은 같고 <b>곁사슬(R기)</b>만 달라요.</li><li>R기의 성질: <b>친수성</b>(물을 좋아함, 물 가까이) · <b>소수성</b>(물을 싫어함, 서로 뭉침) · <b>전하를 띤</b> R기(+ 또는 −).</li><li>아미노산이 20종뿐이어도 <b>종류 · 수 · 배열 순서</b>가 달라서 수많은 단백질이 만들어져요.</li></ul>',
      missions: [
        {
          id: 'throw', title: '구슬을 물에 넣어 보기',
          goal: '아미노산 구슬 <b>6종을 모두</b> 물이 든 통에 넣고 R기가 어떻게 행동하는지 관찰하세요.',
          hint: '아래 구슬을 눌러(또는 끌어서) 통에 넣어요. 같은 종류를 여러 개 넣어도 돼요. 주황색 구슬끼리 모이는지 보세요.',
          setup() { aaClear(); setMode('aa'); },
          check: () => aaCount() === 6, hold: 0.8,
          status: () => AAKEYS.map((k) => mark(!!S.aa.thrown[k]) + ' ' + AA[k].name).join(' &nbsp; '),
          explain: '<b>친수성</b> R기(세린 · 글루타민)는 물 분자와 잘 어울려 물 가까이 흩어지고, <b>소수성</b> R기(류신 · 발린)는 물을 피해 서로 뭉치며, <b>전하를 띤</b> R기(리신 +, 글루탐산 −)는 물 분자가 둘러싸요.',
        },
        {
          id: 'sort', title: 'R기의 성질 분류', manual: true,
          goal: '물속에서 관찰한 행동을 떠올리며 구슬 6종을 <b>친수성 · 소수성 · 전하를 띤</b> R기 상자에 넣으세요.',
          hint: '물 가까이 흩어진 것은 친수성, 서로 뭉친 것(주황)은 소수성, +나 −를 띤 것(초록)은 전하를 띤 R기예요.',
          setup() { setMode('sortaa'); sortAA.reset(); },
          check() {
            if (sortAA.placed < 6) { sortAA.markBad([]); return '구슬을 모두 상자에 넣어 주세요. (' + sortAA.placed + ' / 6)'; }
            const w = sortAAWrong();
            if (!w.length) { sortAA.markBad([]); return true; }
            sortAA.markBad(w.map((c) => c.id));
            const nm = AA[w[0].id].name; return nm + josa(nm, '은', '는') + ' 그 상자가 아니에요. 물속에서 ' + nm + ' 구슬이 어떻게 행동했는지 떠올려 보세요.';
          },
          explain: '세린 · 글루타민은 <b>친수성</b>, 류신 · 발린은 <b>소수성</b>, 리신(+) · 글루탐산(−)은 <b>전하를 띤</b> R기예요. 이 성질 차이가 나중에 사슬이 접히는 방식을 정해요.',
        },
        {
          type: 'quiz', title: '20종으로 수천 종을?',
          goal: '아미노산은 20종뿐인데 단백질은 <b>수천 종</b>이나 될 수 있는 까닭은?',
          setup() { setMode('aa'); },
          choices: ['아미노산의 종류가 계속 새로 생겨나기 때문이다', '아미노산의 종류 · 수 · 배열 순서가 달라지기 때문이다', '단백질마다 아미노산 대신 포도당을 쓰기 때문이다', '아미노산의 공통 부분이 단백질마다 다르기 때문이다'],
          answer: 1,
          feedback: ['아미노산은 20종으로 정해져 있어요.', '', '단백질의 단위체는 포도당이 아니라 아미노산이에요.', '공통 부분은 모든 아미노산이 같고 R기만 달라요.'],
          explain: '글자 20개로 수많은 단어를 만들듯, 아미노산 20종의 <b>종류 · 수 · 배열 순서</b>를 바꾸면 아주 많은 단백질이 만들어져요.',
        },
      ],
    },
    {
      title: '펩타이드 사슬', short: '펩타이드 사슬', icon: '🔗', phase: '모형',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 아미노산 구슬의 R기가 서로 다르다는 것을 알았어요.</div><p>이제 구슬을 <b>이어 사슬</b>을 만들어요. 통합과학에서 배운 번역을 떠올리면, mRNA의 <b>코돈</b> 3개가 아미노산 1개를 정해요. 아미노산이 이어질 때마다 물이 빠져나가는 <b>펩타이드 결합</b>이 생겨요.</p>',
      features: ['chain', 'calc'],
      setup() { setMode('chain'); },
      recap: '아미노산은 펩타이드 결합(물이 빠짐)으로 이어져 폴리펩타이드가 되고, 서열의 수는 20ⁿ가지예요. 아미노산 3개면 8000가지, 10개면 약 10조 가지예요.',
      summary: '<ul><li>아미노산이 <b>펩타이드 결합</b>으로 이어지면서 <b>물이 빠져나가요</b>. 이어진 사슬이 <b>폴리펩타이드</b>예요.</li><li>mRNA의 <b>코돈</b> 순서대로 아미노산이 이어져요. (예: UCU – CUG – GUU – AAA – GAA → 세린 – 류신 – 발린 – 리신 – 글루탐산)</li><li>아미노산 n개로 만들 수 있는 사슬은 <b>20ⁿ</b>가지: n = 2 → 400, n = 3 → 8000, n = 10 → 약 1 × 10¹³.</li></ul>',
      missions: [
        {
          id: 'chain', title: '코돈 순서대로 5개 연결',
          goal: 'mRNA의 코돈 <b>5개</b> 순서대로 알맞은 아미노산 구슬을 코돈표에서 찾아 사슬에 연결하세요.',
          hint: '코돈 UCU는 세린이에요. 아래 코돈표에서 코돈 글자가 같은 구슬을 찾아요. 틀리면 구슬이 튕겨 나가요.',
          setup() { setMode('chain'); chReset(); },
          check: () => S.ch.done, hold: 0.8,
          status: () => mark(S.ch.seated.length === 5) + ' 연결한 구슬 ' + S.ch.seated.length + ' / 5 &nbsp; ' + mark(S.ch.seated.length >= 2) + ' 펩타이드 결합 ' + Math.max(0, S.ch.seated.length - 1) + '개',
          explain: 'UCU – CUG – GUU – AAA – GAA 순서대로 <b>세린 – 류신 – 발린 – 리신 – 글루탐산</b>이 이어졌어요. 구슬이 하나 이어질 때마다 <b>물 1분자가 빠져나가는 펩타이드 결합</b>이 생겨 4개의 결합이 만들어졌고, 이 서열이 <b>1차 구조</b>예요.',
        },
        {
          id: 'calc', title: '서열의 경우의 수',
          goal: '슬라이더를 <b>n = 3</b>으로 맞추고, 아미노산 3개로 만들 수 있는 서열의 수를 입력하세요.',
          hint: '자리마다 20가지를 고를 수 있으니까 20 × 20 × 20 이에요.',
          setup() { S.calc.n = 5; $('#sCalc').value = 5; $('#inCalc').value = ''; setMode('calc'); },
          check: () => calcOk(), hold: 0.5,
          status: () => mark(S.calc.n === 3) + ' n = 3 &nbsp; ' + mark(calcOk()) + ' 8000가지',
          explain: '자리마다 20가지이므로 20 × 20 × 20 = <b>8000</b>가지예요. n = 2이면 400가지, n = 10이면 약 1 × 10¹³(10조)가지로, 몇 개만 이어도 어마어마하게 많은 서열이 가능해요.',
        },
      ],
    },
    {
      title: '접힘과 구조', short: '접힘과 구조', icon: '🧶', phase: '탐구',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 아미노산을 이어 폴리펩타이드(1차 구조)를 만들었어요.</div><p>사슬은 곧게 뻗어 있지 않고 <b>접혀서 입체 구조</b>를 이뤄요. R기의 성질이 접힘을 정해요: <b>소수성 R기는 안쪽으로</b>, 친수성 R기는 물과 닿는 <b>바깥쪽으로</b> 가요. 1차 → 4차 구조를 차례로 살펴보고, 서열이 한 칸 바뀌면 어떻게 되는지 봐요.</p>',
      features: ['fold', 'sickle'],
      setup() { setMode('fold'); },
      recap: '단백질은 1차(서열) → 2차(나선 · 병풍) → 3차(전체 입체 구조) → 4차(폴리펩타이드 여러 개) 구조를 이뤄요. 서열이 바뀌면 접힘이 바뀌고 기능이 바뀔 수 있어요.',
      summary: '<ul><li><b>1차</b>: 아미노산 서열. <b>2차</b>: 나선 · 병풍 모양의 규칙적 접힘. <b>3차</b>: R기 상호작용으로 폴리펩타이드 전체가 접힌 입체 구조. <b>4차</b>: 폴리펩타이드 2개 이상이 모인 구조(헤모글로빈 = 폴리펩타이드 4개).</li><li>접힘의 원리: <b>소수성 R기는 안쪽</b>에 모이고 <b>친수성 R기는 물과 닿는 바깥쪽</b>에 있어요.</li><li><b>낫 모양 적혈구 빈혈</b>: 헤모글로빈 β 사슬 146개 중 6번째 한 개(글루탐산 → 발린, 친수성 → 소수성)가 바뀌어 산소가 적을 때 헤모글로빈이 달라붙고 적혈구가 낫 모양이 돼요. <b>서열이 바뀌면 접힘이 바뀌고, 기능이 바뀌어요.</b></li></ul>',
      missions: [
        {
          id: 'fold', title: '사슬 접어 보기',
          goal: '사슬을 <b>물에 풀어 3차 구조로 접고</b>, 소수성 R기가 안쪽에 모이는지 확인하세요. 1차부터 4차까지 모두 살펴봐요.',
          hint: '1차~4차 버튼을 차례로 누르고, 3차에서 💧 물에 풀어 접기를 눌러요. 4차는 3차를 완성해야 볼 수 있어요.',
          setup() { foldInit(1); S.fold.stage = 1; S.fold.seen = [true, false, false, false]; setMode('fold'); },
          check: () => S.fold.folded && S.fold.coreOk && S.fold.seen.every(Boolean), hold: 0.6,
          status: () => mark(S.fold.folded) + ' 접힘 완료 &nbsp; ' + mark(S.fold.folded && S.fold.coreOk) + ' 소수성이 안쪽 &nbsp; ' + mark(S.fold.seen.every(Boolean)) + ' 1~4차 보기 ' + S.fold.seen.filter(Boolean).length + '/4',
          explain: '물속에서 <b>소수성</b> R기(류신 · 발린)는 물을 피해 사슬 안쪽으로 모이고, <b>친수성</b> · 전하를 띤 R기는 물과 닿는 바깥쪽에 놓여 <b>3차 구조</b>가 만들어져요. 폴리펩타이드 여러 개가 모이면 <b>4차 구조</b>(예: 헤모글로빈)가 돼요.',
        },
        {
          id: 'sickle', title: '서열 한 칸이 바뀌면?',
          goal: '정상과 변이 헤모글로빈 β 사슬을 비교하고, <b>산소가 적을 때</b> 변이 사슬의 적혈구가 낫 모양이 되는 것을 확인하세요.',
          hint: '정상 → 변이 β 사슬을 차례로 고르고, 변이에서 산소를 "적음"으로 바꿔요. 6번째 아미노산이 달라진 것에 주목해요.',
          setup() { S.sk.mut = false; S.sk.low = false; S.sk.poly = 0; S.sk.sick = 0; S.sk.seen = { n: true, m: false, s: false }; setMode('sickle'); },
          check: () => S.sk.seen.n && S.sk.seen.m && S.sk.seen.s, hold: 0.6,
          status: () => mark(S.sk.seen.n) + ' 정상 사슬 &nbsp; ' + mark(S.sk.seen.m) + ' 변이 사슬 &nbsp; ' + mark(S.sk.seen.s) + ' 산소 적을 때 낫 모양',
          explain: '헤모글로빈 β 사슬 146개 중 <b>6번째 한 개</b>가 글루탐산(친수성)에서 발린(소수성)으로 바뀌면, 산소가 적을 때 소수성 발린 때문에 헤모글로빈 분자들이 달라붙어 적혈구가 낫 모양이 돼요. <b>서열이 바뀌면 → 접힘이 바뀌고 → 기능이 바뀌어요.</b>',
        },
        {
          type: 'quiz', title: '단백질의 모양을 정하는 것',
          goal: '단백질의 <b>입체 구조(모양)</b>를 결정하는 것은?',
          setup() { setMode('fold'); },
          choices: ['단백질이 만들어진 세포의 크기', '아미노산 서열(R기의 성질에 따라 접힘이 정해져요)', '단백질 속에 든 포도당의 개수', '핵의 지름'],
          answer: 1,
          feedback: ['세포의 크기와 단백질 모양은 관계가 없어요.', '', '단백질은 포도당이 아니라 아미노산으로 이루어져요.', '핵의 크기는 단백질 모양을 정하지 않아요.'],
          explain: '아미노산 <b>서열(1차 구조)</b>에 따라 R기의 성질이 정해지고, 소수성은 안쪽 · 친수성은 바깥쪽으로 접히면서 입체 구조가 결정돼요. 그래서 서열이 달라지면 모양과 기능이 달라질 수 있어요.',
        },
      ],
    },
    {
      title: '기능과 변성', short: '기능과 변성', icon: '🔥', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 단백질의 모양(입체 구조)이 아미노산 서열로 정해지는 것을 알았어요.</div><p>모양이 달라지면 기능도 달라져요. 먼저 단백질의 <b>기능 6가지</b>를 예와 연결하고, 열 · 강산 · 알코올로 입체 구조를 풀어 <b>변성</b>시키면 기능이 어떻게 되는지 확인해요.</p>',
      features: ['func', 'denat'],
      setup() { setMode('func'); },
      recap: '단백질은 효소 · 운반 · 구조 · 신호와 조절 · 방어 · 운동 기능을 해요. 열 · 강산 · 강염기 · 중금속 · 알코올은 입체 구조를 풀어(변성) 기능을 잃게 하지만 아미노산 서열은 그대로예요.',
      summary: '<ul><li>단백질의 기능: <b>효소</b>(아밀레이스), <b>운반</b>(헤모글로빈), <b>구조</b>(콜라젠 · 케라틴), <b>신호 · 조절</b>(인슐린, 수용체), <b>방어</b>(항체), <b>운동</b>(액틴 · 미오신).</li><li><b>변성</b>: 열 · 강산 · 강염기 · 중금속 · 알코올이 입체 구조를 풀어 <b>기능을 잃게</b> 해요. (달걀을 삶으면 흰자가 굳어요.) 아미노산 서열(1차 구조)은 그대로예요.</li><li><b>뷰렛 반응</b>(수산화 나트륨 + 황산 구리(Ⅱ)): 단백질이 있으면 청색 → <b>보라색</b>. 변성된 단백질도 펩타이드 결합이 남아 있어 보라색이에요.</li></ul>',
      missions: [
        {
          id: 'func', title: '단백질 기능 연결', manual: true,
          goal: '기능 카드 6장을 알맞은 <b>단백질 예</b> 상자에 한 장씩 넣으세요.',
          hint: '아밀레이스는 소화 효소, 헤모글로빈은 산소 운반, 콜라젠은 몸을 이루는 구조 단백질이에요. 인슐린은 호르몬, 항체는 방어, 액틴 · 미오신은 근육 수축이에요.',
          setup() { setMode('func'); funcS.reset(); },
          check() {
            if (funcS.placed < 6) { funcS.markBad([]); return '카드를 모두 상자에 넣어 주세요. (' + funcS.placed + ' / 6)'; }
            const w = funcWrong(), dup = funcS.boxes.some((b) => funcS.cards.filter((c) => c.zone === b.id).length > 1);
            if (!w.length && !dup) { funcS.markBad([]); return true; }
            funcS.markBad(w.map((c) => c.id)); if (dup) return '한 상자에는 카드를 한 장씩만 넣어요.';
            const f = FUNCS.find((q) => q.id === w[0].id); return '\'' + f.card + '\' 카드는 그 단백질과 맞지 않아요. 상자의 설명을 다시 읽어 보세요.';
          },
          explain: '<b>아밀레이스</b>는 효소, <b>헤모글로빈</b>은 산소 운반, <b>콜라젠</b>은 구조, <b>인슐린</b>은 신호 · 조절, <b>항체</b>는 방어, <b>액틴과 미오신</b>은 운동(근육 수축) 기능을 해요. 기능이 다양한 까닭은 아미노산 서열에 따라 접힌 모양이 다르기 때문이에요.',
        },
        {
          id: 'denat', title: '열로 변성시키기',
          goal: '효소와 달걀 흰자 단백질을 <b>70 °C 이상으로 가열</b>(또는 강산 · 알코올)해 변성시키고, 변성 후에 <b>뷰렛 반응</b>도 확인하세요.',
          hint: '온도 슬라이더를 70 °C 이상으로 올려요. 입체 구조가 풀리고 효소 활성이 0 %가 돼요. 그 뒤에 🧪 뷰렛 시약을 넣어요.',
          setup() { dnReset(); setMode('denat'); },
          check: () => S.dn.fmin < 0.02 && S.dn.f < 0.005 && S.dn.buDen, hold: 0.8,
          status: () => mark(S.dn.fmin < 0.02) + ' 변성 &nbsp; ' + mark(S.dn.f < 0.005) + ' 활성 ' + Math.round(S.dn.f * 100) + ' % &nbsp; ' + mark(S.dn.buDen) + ' 변성 후 뷰렛 반응',
          explain: '70 °C 이상에서 효소의 <b>입체 구조가 풀려</b> 활성 부위가 사라지고 기질이 맞지 않아 활성이 0 %가 돼요. 하지만 <b>아미노산 서열은 그대로</b>이고 <b>펩타이드 결합</b>도 남아 있어서 뷰렛 반응은 변성된 단백질도 <b>보라색</b>이에요. 식혀도 풀린 구조는 대부분 되돌아오지 않아요.',
        },
        {
          type: 'quiz', title: '달걀을 삶았을 때',
          goal: '달걀을 삶으면 흰자 단백질에서 <b>변한 것</b>과 <b>변하지 않은 것</b>을 바르게 말한 것은?',
          setup() { setMode('denat'); },
          choices: ['아미노산 서열이 변하고, 입체 구조는 그대로이다', '입체 구조가 변하고, 아미노산 서열은 그대로이다', '단백질이 모두 포도당으로 분해된다', '펩타이드 결합이 모두 끊겨 아미노산이 된다'],
          answer: 1,
          feedback: ['반대예요. 삶아도 서열은 그대로고 입체 구조가 풀려요.', '', '단백질이 포도당으로 바뀌지는 않아요.', '변성은 입체 구조가 풀리는 것이지 펩타이드 결합이 끊기는 것이 아니에요.'],
          explain: '가열하면 <b>입체 구조(2~4차)</b>가 풀리지만 <b>아미노산 서열(1차 구조)</b>은 그대로예요. 풀린 사슬이 서로 엉겨 붙어 흰자가 하얗게 굳고, 한번 풀린 구조는 식혀도 원래대로 돌아오지 않아요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hy-protein', mount: '#game', badge: '단백질 건축가', homeHref: '../../index.html#hy',
    featureLabels: { aa: '🧩 아미노산 구슬과 물통', sortaa: '🗂 R기 분류', chain: '🔗 펩타이드 사슬', calc: '🧮 경우의 수', fold: '🧶 접힘과 구조', sickle: '🔴 낫 모양 적혈구', func: '🗂 기능 연결', denat: '🔥 변성 실험' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 읽음 칸 ---------- */
  function readouts() {
    const m = S.mode;
    if (m === 'aa') setReads(['물속 구슬', S.aa.beads.length + '개', '넣어 본 종류', aaCount() + ' / 6', '뭉친 소수성 구슬', aaClump() >= 2 ? aaClump() + '개' : '—']);
    else if (m === 'sortaa') setReads(['놓은 구슬', sortAA.placed + ' / 6', '남은 구슬', (6 - sortAA.placed) + '개', '분류 상자', '3칸']);
    else if (m === 'chain') setReads(['연결한 구슬', S.ch.seated.length + ' / 5', '펩타이드 결합', Math.max(0, S.ch.seated.length - 1) + '개', '빠져나간 물', Math.max(0, S.ch.seated.length - 1) + '분자']);
    else if (m === 'calc') setReads(['아미노산 수 n', S.calc.n + '개', '서열의 수', pow20Text(S.calc.n) + '가지', '식', '20ⁿ']);
    else if (m === 'fold') { const f = S.fold, nm = ['1차 구조', '2차 구조', '3차 구조', '4차 구조'][f.stage - 1]; setReads(['보는 구조', nm, '접힘', f.stage < 3 ? '—' : f.run ? '접히는 중' : f.folded ? '완료' : '아직', '살펴본 구조', f.seen.filter(Boolean).length + ' / 4']); }
    else if (m === 'sickle') setReads(['β 사슬', S.sk.mut ? '변이 (6번째 발린)' : '정상 (6번째 글루탐산)', '산소', S.sk.low ? '적음' : '많음', '적혈구', S.sk.sick > 0.5 ? '낫 모양' : '둥근 모양']);
    else if (m === 'func') setReads(['놓은 카드', funcS.placed + ' / 6', '남은 카드', (6 - funcS.placed) + '장', '단백질 예', '6가지']);
    else setReads(['처리', S.dn.acid ? '강산' : S.dn.alc ? '알코올' : S.dn.T + ' °C', '효소 활성', Math.round(S.dn.f * 100) + ' %', '아미노산 서열', '그대로']);
  }

  /* ---------- 시작 ---------- */
  setMode('aa');
  let lastFree = false, lastLv = -1;
  SciSim.loop((dt, t) => {
    clock = t; S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (game && game.level !== lastLv) { lastLv = game.level; updateCtl(); }
    view.apply(); FX.update(dt); ctx.clearRect(0, 0, VW, VH);
    foldUpdate(dt);
    if (S.mode !== 'denat') dnUpdate(dt);
    switch (S.mode) {
      case 'aa': bgFill('#eef4f2', '#e3ece8'); aaUpdate(dt); aaDraw(dt, t); break;
      case 'sortaa': bgFill('#eef4f2', '#e3ece8'); sortAADraw(dt, t); break;
      case 'chain': bgFill('#eef4f2', '#e3ece8'); chDraw(dt, t); break;
      case 'calc': bgFill('#eef4f2', '#e3ece8'); calcDraw(dt, t); break;
      case 'fold': bgFill('#eef4f2', '#e3ece8'); foldDraw(dt, t); break;
      case 'sickle': bgFill('#eef4f2', '#e3ece8'); skDraw(dt, t); break;
      case 'func': bgFill('#eef4f2', '#e3ece8'); funcDraw(dt, t); break;
      case 'denat': bgFill('#eef4f2', '#e3ece8'); dnDraw(dt, t); break;
    }
    FX.draw(); parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(241,246,243,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, PHONE, get game() { return game; }, levels, setMode, AA, AAKEYS, ATI, aaAdd, aaClear, aaCount, sortAA, CTI, CHAIN_SEQ, CODONS, chPlace, chReset, chX, chY,
    foldSetStage, foldStart, foldMetric, SEQ12, skSet, funcS, FUNCS, dnReset, updateCtl, calcOk, pow20Text, TANK, CHP, FD,
  };
})();
