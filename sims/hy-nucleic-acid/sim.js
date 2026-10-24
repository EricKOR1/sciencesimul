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
     고등학교 세포와 물질대사 · Ⅰ. 세포 - 핵산 모형 만들기 (단원 56, 2차시)
     성취기준 [12세포01-02] 핵산과 단백질의 기본 구조와 세포에서의 주요 기능을 조사하여 설명할 수 있다. (핵산 부분)
     ① 모형: 뉴클레오타이드 (인산 · 당 · 염기 블록, 한 가닥)  ② 모형: DNA 모형 (상보 가닥, 염기 비율)
     ③ 모형: RNA 모형 (전사, RNA 3종)  ④ 분석: 세포 속 역할 (위치, 실 감기, 비교표)
     ========================================================= */
  const S = { mode: 'nuc', fade: 0 };
  let game = null;
  const BASES = {
    A: { col: '#16a34a', name: '아데닌', pur: true }, T: { col: '#e11d48', name: '타이민', pur: false },
    G: { col: '#2563eb', name: '구아닌', pur: true }, C: { col: '#f59e0b', name: '사이토신', pur: false }, U: { col: '#a855f7', name: '유라실', pur: false },
  };
  const CMP_DNA = { A: 'T', T: 'A', G: 'C', C: 'G' };
  const CMP_RNA = { A: 'U', T: 'A', G: 'C', C: 'G' };   // 주형 DNA 염기 -> RNA 염기
  const SUG = { deoxy: { name: '디옥시리보스', col: '#4f9bf0', note: '산소 없음' }, ribo: { name: '리보스', col: '#19b9a6', note: '산소 있음' } };
  const PHOS_COL = '#f59e0b';
  const BS = { w: L(60, 44), nw: L(44, 34), h: L(44, 34) };    // 염기 블록 크기 (퓨린 / 피리미딘)
  const baseW = (b) => (BASES[b].pur ? BS.w : BS.nw);

  /* ---------- 블록 그리기 ---------- */
  function drawPhos(x, y, r, o) {
    o = o || {}; ctx.save(); ctx.globalAlpha = o.alpha == null ? 1 : o.alpha; ctx.translate(x, y); const s = o.scale || 1; ctx.scale(s, s);
    D.sphere(0, 0, r, PHOS_COL, { shadow: !o.flat, gloss: true });
    if (r >= 18) T(0, 5, '인산', 13, '#fff', 'center', 800, { stroke: 'rgba(120,53,15,.55)', strokeWidth: 3 });
    ctx.restore();
  }
  function pentPath(x, y, r) { ctx.beginPath(); for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + k * TAU / 5; const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r; if (k) ctx.lineTo(px, py); else ctx.moveTo(px, py); } ctx.closePath(); }
  function drawSugar(x, y, r, type, o) {
    o = o || {}; const col = SUG[type].col;
    ctx.save(); ctx.globalAlpha = o.alpha == null ? 1 : o.alpha; ctx.translate(x, y); const s = o.scale || 1; ctx.scale(s, s);
    D.shadow(() => { pentPath(0, 0, r); const g = ctx.createRadialGradient(-r * 0.3, -r * 0.4, r * 0.1, 0, 0, r * 1.1); g.addColorStop(0, C.shade(col, 0.5)); g.addColorStop(0.6, col); g.addColorStop(1, C.shade(col, -0.3)); ctx.fillStyle = g; ctx.fill(); }, { blur: o.flat ? 0 : 7, y: 3, color: 'rgba(0,40,80,.25)' });
    pentPath(0, 0, r); ctx.strokeStyle = C.shade(col, -0.5); ctx.lineWidth = 2.4; ctx.lineJoin = 'round'; ctx.stroke();
    // 왼쪽 아래 꼭짓점: 리보스는 산소(빨간 점)가 있고 디옥시리보스는 없어요
    const a = -Math.PI / 2 + 3 * TAU / 5, vx = Math.cos(a) * r, vy = Math.sin(a) * r;
    if (type === 'ribo') { ctx.strokeStyle = C.shade(col, -0.5); ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(vx, vy); ctx.lineTo(vx - r * 0.2, vy + r * 0.32); ctx.stroke(); D.sphere(vx - r * 0.24, vy + r * 0.4, r * 0.22, '#ef4444', { gloss: true }); }
    else { ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.beginPath(); ctx.arc(vx - r * 0.06, vy + r * 0.12, r * 0.09, 0, TAU); ctx.fill(); }
    ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.beginPath(); ctx.ellipse(-r * 0.3, -r * 0.35, r * 0.28, r * 0.13, -0.5, 0, TAU); ctx.fill();
    ctx.restore();
  }
  function drawBaseBlock(x, y, b, o) {
    o = o || {}; const w = (o.w || baseW(b)) * (o.scale || 1), h = (o.h || BS.h) * (o.scale || 1), col = BASES[b].col;
    ctx.save(); ctx.globalAlpha = o.alpha == null ? 1 : o.alpha;
    if (o.lift) { ctx.shadowColor = 'rgba(0,0,0,.3)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 6; }
    D.roundRect(x - w / 2, y - h / 2, w, h, 9);
    const g = ctx.createLinearGradient(0, y - h / 2, 0, y + h / 2); g.addColorStop(0, C.shade(col, 0.35)); g.addColorStop(1, col); ctx.fillStyle = g; ctx.fill();
    ctx.shadowColor = 'transparent'; ctx.strokeStyle = C.shade(col, -0.4); ctx.lineWidth = 2; ctx.stroke();
    // 퓨린(A, G)은 위쪽에 돌기
    if (BASES[b].pur) { ctx.fillStyle = C.shade(col, 0.15); ctx.strokeStyle = C.shade(col, -0.4); D.roundRect(x + w * 0.12, y - h / 2 - 5, w * 0.32, 8, 4); ctx.fill(); ctx.stroke(); }
    T(x, y + (o.fs || L(20, 17)) * 0.35, b, o.fs || L(20, 17), '#fff', 'center', 800, { stroke: 'rgba(0,0,0,.28)', strokeWidth: 3 });
    ctx.restore();
  }
  const bondLine = (x1, y1, x2, y2, w, col) => { ctx.save(); ctx.lineCap = 'round'; ctx.strokeStyle = '#7c2d12'; ctx.lineWidth = w + 3; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.strokeStyle = col || '#fbbf24'; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.restore(); };

  /* =========================================================
     ① 뉴클레오타이드 조립 (인산 + 당 + 염기)
     ========================================================= */
  const ASM = PHONE ? { x: 10, y: 10, w: 460, h: 244 } : { x: 14, y: 14, w: 420, h: 346 };
  const COLP = PHONE ? { x: 10, y: 262, w: 460, h: 160 } : { x: 446, y: 14, w: 340, h: 346 };
  const TRP = PHONE ? { x: 10, y: 430, w: 460, h: 200 } : { x: 14, y: 372, w: 772, h: 174 };
  const SL = PHONE
    ? { p: { x: ASM.x + 96, y: ASM.y + 112 }, s: { x: ASM.x + 236, y: ASM.y + 112 }, b: { x: ASM.x + 236, y: ASM.y + 194 } }
    : { p: { x: ASM.x + 92, y: ASM.y + 170 }, s: { x: ASM.x + 226, y: ASM.y + 170 }, b: { x: ASM.x + 226, y: ASM.y + 268 } };
  const PR = L(27, 21), SR = L(38, 30);
  const TRAY_IT = [{ k: 'p', id: 'p', nm: '인산' }, { k: 's', id: 'deoxy', nm: '디옥시리보스' }, { k: 's', id: 'ribo', nm: '리보스' }, { k: 'b', id: 'A', nm: '아데닌' }, { k: 'b', id: 'T', nm: '타이민' }, { k: 'b', id: 'G', nm: '구아닌' }, { k: 'b', id: 'C', nm: '사이토신' }, { k: 'b', id: 'U', nm: '유라실' }];
  TRAY_IT.forEach((t, i) => { t.x = PHONE ? TRP.x + 58 + (i % 4) * 114 : TRP.x + 54 + i * 95; t.y = PHONE ? TRP.y + 48 + Math.floor(i / 4) * 90 : TRP.y + 82; });
  const NUC_IDS = ['deoxy-A', 'deoxy-T', 'deoxy-G', 'deoxy-C', 'ribo-A', 'ribo-U', 'ribo-G', 'ribo-C'];
  NUC_IDS.forEach((id, i) => { /* 위치는 아래 colRect에서 */ });
  function colRect(i, panel, h0) {   // 수집 카드 위치 (패널 안)
    const grp = Math.floor(i / 4), k = i % 4;
    if (PHONE) { const w = (panel.w - 20 - 18) / 4; return { x: panel.x + 10 + k * (w + 6), y: panel.y + 52 + grp * 54, w, h: 40 }; }
    const w = (panel.w - 36) / 2; return { x: panel.x + 12 + (k % 2) * (w + 12), y: panel.y + 66 + grp * 146 + Math.floor(k / 2) * 60, w, h: 54 };
  }
  S.nuc = { pcs: [], slots: { p: null, s: null, b: null }, built: {}, msg: '', phase: 'build', t: 0, valid: false, lastId: '', glow: {} };
  S.str = { seq: [], msg: '', pop: [] };
  function nucReset() { S.nuc.pcs = []; S.nuc.slots = { p: null, s: null, b: null }; S.nuc.phase = 'build'; S.nuc.msg = ''; FX.clear(); }
  function nucBuiltAll(kind) { return NUC_IDS.filter((id) => id.indexOf(kind) === 0).every((id) => S.nuc.built[id]); }
  const nucCount = (kind) => NUC_IDS.filter((id) => id.indexOf(kind) === 0 && S.nuc.built[id]).length;

  function nucMake(it, x, y) { return { k: it.k, id: it.id, x, y, hx: it.x, hy: it.y, st: 'drag', moved: false, sx: x, sy: y, pop: 0, lift: 0, slot: null }; }
  function nucSeat(pc, key) {
    const sl = S.nuc.slots[key];
    if (sl && sl !== pc) { sl.st = 'ret'; sl.slot = null; }
    S.nuc.slots[key] = pc; pc.slot = key; pc.st = 'seat'; pc.pop = 1; Sound.click(); S.nuc.msg = '';
  }
  const slotKeyOf = (pc) => (pc.k === 'p' ? 'p' : pc.k === 's' ? 's' : 'b');
  function nucDrop(pc, p) {
    const key = slotKeyOf(pc), t = SL[key];
    if (!p || Math.hypot(p.x - t.x, p.y - t.y) < (PHONE ? 70 : 84)) nucSeat(pc, key);
    else { pc.st = 'ret'; Sound.tick(); }
  }
  function nucUpdate(dt) {
    const n = S.nuc;
    n.pcs.forEach((pc) => {
      pc.pop = approach(pc.pop, 0, dt, 7); pc.lift = approach(pc.lift, pc.st === 'drag' && pc.moved ? 1 : 0, dt, 14);
      if (pc.st === 'drag') return;
      let tx, ty;
      if (pc.st === 'seat') { tx = SL[pc.slot].x; ty = SL[pc.slot].y; }
      else if (pc.st === 'glue') { tx = pc.gx; ty = pc.gy; }
      else { tx = pc.hx; ty = pc.hy; }
      const rate = pc.st === 'glue' ? 6 : 11;
      if (RM) { pc.x = tx; pc.y = ty; } else { pc.x = approach(pc.x, tx, dt, rate); pc.y = approach(pc.y, ty, dt, rate); }
      if (pc.st === 'ret' && Math.hypot(pc.x - tx, pc.y - ty) < 3) pc.dead = true;
    });
    n.pcs = n.pcs.filter((pc) => !pc.dead);
    Object.keys(n.glow).forEach((k) => { n.glow[k] = Math.max(0, n.glow[k] - dt * 1.4); });
    // 세 칸이 모두 차면 판정
    if (n.phase === 'build' && n.slots.p && n.slots.s && n.slots.b && ['p', 's', 'b'].every((k) => Math.hypot(n.slots[k].x - SL[k].x, n.slots[k].y - SL[k].y) < 6)) {
      const sg = n.slots.s.id, bs = n.slots.b.id;
      const ok = sg === 'deoxy' ? bs !== 'U' : bs !== 'T';
      n.phase = ok ? 'glue' : 'bad'; n.t = 0; n.lastId = sg + '-' + bs;
      if (ok) { Sound.success(); parts.burst(SL.s.x, SL.s.y, { count: 22, speed: 190, colors: [PHOS_COL, SUG[sg].col, BASES[bs].col] }); }
      else {
        Sound.fail(); n.msg = sg === 'deoxy' ? 'DNA의 당(디옥시리보스)에는 유라실(U)이 아니라 타이민(T)이 짝이에요. RNA에서는 U를 써요.' : 'RNA의 당(리보스)에는 타이민(T)이 아니라 유라실(U)을 써요. T는 DNA에서 써요.';
        showHint(n.msg, 5200); n.slots.b.st = 'ret'; n.slots.b.slot = null; n.slots.b = null; n.phase = 'build';
      }
    }
    if (n.phase === 'glue') {
      n.t += dt;
      if (n.t > 1.0 && !n.flown) {
        n.flown = true;
        const i = NUC_IDS.indexOf(n.lastId), r = colRect(i, COLP);
        ['p', 's', 'b'].forEach((k, j) => { const pc = n.slots[k]; pc.st = 'glue'; pc.gx = r.x + (PHONE ? 22 : 24) + j * (PHONE ? 26 : 44) + (k === 'b' ? (PHONE ? 8 : 18) : 0); pc.gy = r.y + r.h / 2; });
      }
      if (n.t > 1.7) {
        n.built[n.lastId] = true; n.glow[n.lastId] = 1; n.flown = false;
        ['p', 's', 'b'].forEach((k) => { n.slots[k].dead = true; n.slots[k] = null; }); n.phase = 'build'; n.t = 0;
        updateCtl();
      }
    }
  }
  function nucMini(r, id, built, glow) {
    const [sg, bs] = id.split('-');
    D.roundRect(r.x, r.y, r.w, r.h, 10); ctx.fillStyle = built ? '#fff' : 'rgba(255,255,255,.55)'; ctx.fill();
    ctx.setLineDash(built ? [] : [5, 4]); ctx.strokeStyle = built ? C.mix('#cbd5e1', '#16a34a', Math.min(1, glow + 0.6)) : '#cbd5e1'; ctx.lineWidth = built ? 2.5 : 1.6; ctx.stroke(); ctx.setLineDash([]);
    const cy = r.y + r.h / 2, s = PHONE ? 0.5 : 0.62;
    if (built) {
      const px = r.x + (PHONE ? 22 : 24), sx = px + (PHONE ? 26 : 44), bx = sx + (PHONE ? 8 : 18) + 4;
      bondLine(px + 8 * s, cy, sx - 10 * s, cy, 3.5);
      if (glow > 0.02) D.glow(r.x + r.w / 2, cy, r.w * 0.6, '#22c55e', glow * 0.5);
      drawPhos(px, cy, PR * s * 0.9, { flat: true, scale: 1 });
      drawSugar(sx, cy, SR * s, sg, { flat: true });
      drawBaseBlock(bx + (PHONE ? 16 : 26), cy, bs, { scale: s * 0.9, fs: PHONE ? 13 : 15 });
    } else {
      T(r.x + r.w / 2, cy + 5, bs === 'U' || bs === 'T' ? (sg === 'deoxy' ? 'DNA ' : 'RNA ') + bs : (sg === 'deoxy' ? 'DNA ' : 'RNA ') + bs, PHONE ? 13 : 14, '#94a3b8', 'center', 800);
    }
  }
  function nucDraw(dt, t) {
    const n = S.nuc;
    panel(ASM.x, ASM.y, ASM.w, ASM.h, 18, '#fffdf6');
    panel(COLP.x, COLP.y, COLP.w, COLP.h, 18, '#f7fbff');
    panel(TRP.x, TRP.y, TRP.w, TRP.h, 18, '#ffffff');
    T(ASM.x + 18, ASM.y + 30, '뉴클레오타이드 조립대', L(18, 16), '#9a3412', 'left', 800);
    T(ASM.x + 18, ASM.y + 52, '인산 + 당 + 염기 세 블록을 알맞은 칸에 놓아요', L(14, 13), '#64748b', 'left', 700);
    // 칸
    const pulse = 0.6 + 0.4 * Math.sin(t * 4);
    [['p', '인산 칸'], ['s', '당 칸'], ['b', '염기 칸']].forEach(([k, nm]) => {
      const q = SL[k]; if (n.slots[k]) return;
      ctx.save(); ctx.globalAlpha = 0.9; ctx.setLineDash([6, 5]); ctx.lineWidth = 2.2; ctx.strokeStyle = '#d6b66a'; ctx.fillStyle = 'rgba(253,230,138,.22)';
      if (k === 'p') { ctx.beginPath(); ctx.arc(q.x, q.y, PR + 8, 0, TAU); ctx.fill(); ctx.stroke(); }
      else if (k === 's') { pentPath(q.x, q.y, SR + 8); ctx.fill(); ctx.stroke(); }
      else { D.roundRect(q.x - BS.w / 2 - 8, q.y - BS.h / 2 - 8, BS.w + 16, BS.h + 16, 12); ctx.fill(); ctx.stroke(); }
      ctx.setLineDash([]); ctx.restore();
      T(q.x, q.y + 5, nm, 13, '#b08a3a', 'center', 800);
    });
    // 결합선
    const have = (k) => n.slots[k];
    if (have('p') && have('s')) bondLine(SL.p.x + PR - 2, SL.p.y, SL.s.x - SR + 6, SL.s.y, 6);
    if (have('s') && have('b')) bondLine(SL.s.x, SL.s.y + SR * 0.7, SL.b.x, SL.b.y - BS.h / 2 + 2, 6);
    // 조각
    const ord = n.pcs.slice().sort((a, b) => (a.st === 'drag' ? 1 : 0) - (b.st === 'drag' ? 1 : 0));
    ord.forEach((pc) => {
      const sc = 1 + pc.pop * 0.18 + pc.lift * 0.12;
      if (pc.k === 'p') drawPhos(pc.x, pc.y, PR, { scale: sc });
      else if (pc.k === 's') drawSugar(pc.x, pc.y, SR, pc.id, { scale: sc });
      else drawBaseBlock(pc.x, pc.y, pc.id, { scale: sc, lift: pc.lift });
    });
    // 이름표 (놓인 조각)
    if (have('s')) D.label(SL.s.x, SL.s.y - SR - 20, SUG[n.slots.s.id].name + ' (' + SUG[n.slots.s.id].note + ')', { bg: '#e8f2ff', color: '#1e40af', border: '#93c5fd', size: 13 });
    if (have('b')) D.label(SL.b.x + (BS.w / 2) + 12, SL.b.y, BASES[n.slots.b.id].name, { bg: '#fff', color: '#334155', border: '#cbd5e1', size: 13, align: 'left' });
    if (n.phase === 'glue' && n.t < 1.0) D.label(ASM.x + ASM.w / 2, ASM.y + ASM.h - 26, (n.lastId.indexOf('deoxy') === 0 ? 'DNA' : 'RNA') + ' 뉴클레오타이드 완성!', { bg: '#15803d', size: 15 });
    // 수집 패널
    T(COLP.x + 16, COLP.y + L(26, 22), '만든 뉴클레오타이드 ' + Object.keys(n.built).length + ' / 8', PHONE ? 15 : 17, '#1e3a8a', 'left', 800);
    [['DNA의 뉴클레오타이드 (디옥시리보스)', 0], ['RNA의 뉴클레오타이드 (리보스)', 1]].forEach(([nm, g]) => { const r0 = colRect(g * 4, COLP); T(COLP.x + 16, r0.y - (PHONE ? 6 : 12), PHONE ? (g ? 'RNA (리보스)' : 'DNA (디옥시리보스)') : nm, 13.5, g ? '#0f766e' : '#1d4ed8', 'left', 800); });
    NUC_IDS.forEach((id, i) => nucMini(colRect(i, COLP), id, !!n.built[id], n.glow[id] || 0));
    // 트레이
    T(TRP.x + 16, TRP.y + 26, '블록을 끌어서(또는 눌러서) 조립대에 놓아요', L(16, 14), '#334155', 'left', 800);
    TRAY_IT.forEach((it) => {
      if (it.k === 'p') drawPhos(it.x, it.y, PR);
      else if (it.k === 's') drawSugar(it.x, it.y, SR * 0.9, it.id);
      else drawBaseBlock(it.x, it.y, it.id, {});
      const nmY = it.y + (it.k === 's' ? SR : it.k === 'p' ? PR : BS.h / 2) + (PHONE ? 20 : 24);
      TF(it.x, nmY, it.nm, 92, 13.5, 12, '#475569', 'center', 800);
      if (it.k === 's') TF(it.x, nmY + 16, SUG[it.id].note, 92, 13, 11, it.id === 'ribo' ? '#dc2626' : '#64748b', 'center', 700);
    });
    if (n.msg && !PHONE) textBlock(TRP.x + 16, TRP.y + TRP.h - 12, TRP.w - 32, '', 1, '#000', 1);
  }
  const nucPT = {
    down(p) {
      if (S.nuc.phase !== 'build') return false;
      // 놓인 조각을 누르면 빼기
      for (const k of ['p', 's', 'b']) { const pc = S.nuc.slots[k]; if (pc && Math.hypot(p.x - pc.x, p.y - pc.y) < (k === 'b' ? 34 : 34)) { S.nuc.slots[k] = null; pc.slot = null; pc.st = 'ret'; Sound.tick(); return false; } }
      for (const it of TRAY_IT) {
        const hw = it.k === 'b' ? baseW(it.id) / 2 + 6 : (it.k === 's' ? SR : PR) + 8, hh = it.k === 'b' ? BS.h / 2 + 8 : hw;
        if (Math.abs(p.x - it.x) < hw && Math.abs(p.y - it.y) < hh) {
          const pc = nucMake(it, p.x, p.y); pc.sx = p.x; pc.sy = p.y; S.nuc.pcs.push(pc); S.nuc.drag = pc; Sound.tick(); return true;
        }
      }
      return false;
    },
    move(p) { const pc = S.nuc.drag; if (!pc) return; if (Math.hypot(p.x - pc.sx, p.y - pc.sy) > 8) pc.moved = true; if (pc.moved) { pc.x = p.x; pc.y = p.y; } },
    up(p) {
      const pc = S.nuc.drag; if (!pc) return; S.nuc.drag = null;
      if (!pc.moved) { pc.x = pc.hx; pc.y = pc.hy; nucDrop(pc, null); } else nucDrop(pc, p);
    },
    hover(p) { return TRAY_IT.some((it) => Math.abs(p.x - it.x) < 40 && Math.abs(p.y - it.y) < 40) ? 'grab' : 'default'; },
  };

  /* ----- 한 가닥 만들기 ----- */
  const STR = PHONE ? { x: 10, y: 10, w: 460, h: 380 } : { x: 14, y: 14, w: 772, h: 330 };
  const STRT = PHONE ? { x: 10, y: 402, w: 460, h: 228 } : { x: 14, y: 356, w: 772, h: 190 };
  const SS = L(1, 0.64);
  const strX = (k) => STR.x + L(70, 50) + k * L(116, 70);
  function strCard(i) { const w = PHONE ? 105 : 86, h = PHONE ? 60 : 78; return PHONE ? { x: STRT.x + 8 + (i % 4) * (w + 6), y: STRT.y + 44 + Math.floor(i / 4) * (h + 8), w, h } : { x: STRT.x + 14 + i * (w + 8), y: STRT.y + 62, w, h }; }
  function strAdd(id) {
    const st = S.str;
    if (!S.nuc.built[id]) { st.msg = '이 뉴클레오타이드는 아직 만들지 않았어요. 조립대에서 먼저 만들어요.'; showHint(st.msg); return; }
    if (st.seq.length >= 6) { st.msg = '한 가닥은 6개까지 이어요. ↺ 지우기를 눌러 다시 만들어요.'; showHint(st.msg); return; }
    if (st.seq.length && st.seq[0].split('-')[0] !== id.split('-')[0]) { st.msg = '한 가닥은 DNA 뉴클레오타이드끼리, 또는 RNA 뉴클레오타이드끼리 이어요.'; showHint(st.msg); Sound.fail(); return; }
    const k = st.seq.length; st.seq.push(id); st.pop[k] = 1; Sound.click();
    if (k > 0) FX.add({ kind: 'water', x: strX(k) - L(34, 22), y: STR.y + L(178, 196) - 14, vx: 30, vy: -70, life: 1.3, delay: 0.25 });
  }
  function strDraw(dt, t) {
    const st = S.str;
    panel(STR.x, STR.y, STR.w, STR.h, 18, '#fffdf6'); panel(STRT.x, STRT.y, STRT.w, STRT.h, 18, '#ffffff');
    T(STR.x + 18, STR.y + 30, '뉴클레오타이드를 이어 한 가닥 만들기', L(18, 16), '#9a3412', 'left', 800);
    const first = st.seq[0] ? st.seq[0].split('-')[0] : null;
    T(STR.x + 18, STR.y + 54, st.seq.length ? (first === 'deoxy' ? 'DNA 한 가닥 (뉴클레오타이드 ' : 'RNA 한 가닥 (뉴클레오타이드 ') + st.seq.length + '개)' : '아래에서 뉴클레오타이드를 눌러 오른쪽으로 이어 붙여요', L(14.5, 13), '#64748b', 'left', 700);
    const yb = STR.y + L(178, 196);
    // 당-인산 뼈대 먼저
    st.seq.forEach((id, k) => {
      st.pop[k] = approach(st.pop[k] || 0, 0, dt, 5);
      const [sg, bs] = id.split('-'), px = strX(k), sx = px + L(46, 32);
      bondLine(px, yb, sx, yb, 7 * SS);
      if (k > 0) bondLine(strX(k - 1) + L(46, 32), yb, px, yb, 7 * SS, '#fb923c');
      bondLine(sx, yb + SR * SS * 0.7, sx, yb + L(64, 58), 5 * SS);
    });
    st.seq.forEach((id, k) => {
      const [sg, bs] = id.split('-'), px = strX(k), sx = px + L(46, 32), sc = 1 + (st.pop[k] || 0) * 0.2;
      drawPhos(px, yb, PR * SS, { scale: sc });
      drawSugar(sx, yb, SR * SS * 0.95, sg, { scale: sc });
      drawBaseBlock(sx, yb + L(86, 78), bs, { scale: SS * sc, fs: PHONE ? 15 : 20 });
    });
    if (st.seq.length >= 1) {
      D.label(strX(0), yb - L(60, 44), '인산', { bg: '#fff3d6', color: '#9a3412', border: '#fcd9a0', size: 13 });
      D.label(strX(0) + L(46, 32), yb - L(66, 48), '당', { bg: '#e8f2ff', color: '#1e40af', border: '#93c5fd', size: 13 });
    }
    if (st.seq.length >= 2) {
      callout(strX(1) - L(26, 16), yb + 2, strX(1) - L(26, 16), yb - L(84, 76), '당–인산 결합 (물이 빠져요)', { line: '#c2410c', border: '#fdba74' });
      D.label(STR.x + STR.w / 2, STR.y + STR.h - 20, '당–인산 뼈대는 길게, 염기는 곁으로 튀어나와요', { bg: '#15803d', size: 14 });
    }
    // 팔레트
    T(STRT.x + 16, STRT.y + 30, '이어 붙일 뉴클레오타이드 (만든 것만 눌러져요)', L(15, 13.5), '#334155', 'left', 800);
    NUC_IDS.forEach((id, i) => {
      const r = strCard(i), ok = !!S.nuc.built[id], [sg, bs] = id.split('-');
      D.roundRect(r.x, r.y, r.w, r.h, 12); ctx.fillStyle = ok ? '#f4faf6' : '#f1f5f9'; ctx.fill(); ctx.strokeStyle = ok ? '#86d9a6' : '#cbd5e1'; ctx.lineWidth = 2; ctx.stroke();
      ctx.save(); ctx.globalAlpha = ok ? 1 : 0.35;
      const cy = r.y + r.h / 2;
      drawPhos(r.x + 16, cy - 4, PR * 0.42, { flat: true });
      drawSugar(r.x + r.w / 2 - (PHONE ? 2 : 4), cy - 4, SR * 0.46, sg, { flat: true });
      drawBaseBlock(r.x + r.w - 26 + (PHONE ? 2 : 0), cy - 4, bs, { scale: 0.5, fs: 14 });
      ctx.restore();
      T(r.x + r.w / 2, r.y + r.h - 8, (sg === 'deoxy' ? 'DNA ' : 'RNA ') + bs, 13, ok ? '#334155' : '#94a3b8', 'center', 800);
    });
  }
  const strPT = {
    down(p) { for (let i = 0; i < 8; i++) { if (inRect(p.x, p.y, strCard(i))) { strAdd(NUC_IDS[i]); updateCtl(); return false; } } return false; },
    hover(p) { return NUC_IDS.some((id, i) => inRect(p.x, p.y, strCard(i))) ? 'pointer' : 'default'; },
  };
  function strReset() { S.str.seq = []; S.str.pop = []; S.str.msg = ''; FX.clear(); updateCtl(); }

  /* =========================================================
     ② DNA 모형 : 상보 가닥 완성 → 이중 나선
     ========================================================= */
  const TMPL = ['A', 'T', 'G', 'C', 'C', 'G', 'T', 'A'];
  const DP = PHONE ? { x: 10, y: 10, w: 460, h: 330 } : { x: 14, y: 14, w: 772, h: 330 };
  const DTR = PHONE ? { x: 10, y: 350, w: 460, h: 112 } : { x: 14, y: 354, w: 772, h: 100 };
  const DIP = PHONE ? { x: 10, y: 472, w: 460, h: 158 } : { x: 14, y: 464, w: 772, h: 82 };
  const dCol = (i) => DP.x + 34 + (i + 0.5) * ((DP.w - 68) / 8);
  const dCW = (DP.w - 68) / 8;
  const D_TOP = DP.y + L(86, 84), D_BOT = DP.y + DP.h - L(54, 52), D_MID = (D_TOP + D_BOT) / 2, D_H = (D_BOT - D_TOP) / 2;
  S.dna = { tok: 0, slots: Array(8).fill(null), done: false, tw: 0, rot: 0, wrong: 0, shake: Array(8).fill(0), pc: [], drag: null, msg: '' };
  const DNA_TRAY = ['A', 'T', 'G', 'C'].map((b, i) => ({ id: b, x: DTR.x + DTR.w / 2 + (i - 1.5) * L(120, 96), y: DTR.y + DTR.h / 2 - 6 }));
  function dnaReset() { S.dna.tok++; SciSim.tween(S.dna, { tw: 0 }, { duration: 0.0001 }); S.dna.slots = Array(8).fill(null); S.dna.done = false; S.dna.tw = 0; S.dna.wrong = 0; S.dna.pc = []; S.dna.msg = ''; updateCtl(); }
  const dnaFilled = () => S.dna.slots.filter(Boolean).length;
  function dnaPlace(b, i) {
    if (S.dna.slots[i]) return false;
    if (CMP_DNA[TMPL[i]] === b) {
      S.dna.slots[i] = b; Sound.click();
      FX.add({ kind: 'text', x: dCol(i), y: D_BOT + 34, text: TMPL[i] + '–' + b, life: 0.9, color: '#16a34a', size: 15 });
      if (dnaFilled() === 8) { S.dna.done = true; S.dna.tw = 0; SciSim.tween(S.dna, { tw: 1 }, { duration: RM ? 0.01 : 2.2, ease: 'inOutCubic' }); const tok = S.dna.tok; setTimeout(() => { if (tok !== S.dna.tok) return; Sound.success(); parts.burst(DP.x + DP.w / 2, D_MID, { count: 28, speed: 220, colors: ['#2563eb', '#16a34a', '#e11d48', '#f59e0b'] }); }, 700); }
      updateCtl(); return true;
    }
    S.dna.wrong++; S.dna.shake[i] = 1; Sound.fail();
    S.dna.msg = TMPL[i] + '의 짝은 ' + b + '가 아니에요. 염기쌍은 A–T, G–C예요.'; showHint(S.dna.msg, 4000);
    S.dna.pc.push({ x: dCol(i), y: D_BOT - 24, b, t: 0 });
    return false;
  }
  function dnaDraw(dt, t) {
    const d = S.dna;
    panel(DP.x, DP.y, DP.w, DP.h, 18, '#f4f9ff'); panel(DTR.x, DTR.y, DTR.w, DTR.h, 16, '#ffffff'); panel(DIP.x, DIP.y, DIP.w, DIP.h, 16, '#fffdf6');
    T(DP.x + 18, DP.y + 30, d.done ? '이중 가닥 DNA → 이중 나선' : '한 가닥 DNA의 상보 가닥 만들기', L(18, 16), '#1e3a8a', 'left', 800);
    T(DP.x + 18, DP.y + 52, d.done ? '두 가닥이 서로 꼬여 이중 나선이 돼요' : '위 가닥의 염기와 짝이 되는 염기를 아래 칸에 놓아요', L(14, 13), '#64748b', 'left', 700);
    if (!RM && d.done) d.rot += dt * 0.55;
    const tw = d.tw, rot = d.rot;
    const th = (i) => Math.PI / 2 + tw * (i * 0.78 + rot);
    // 뒤쪽 가닥과 사다리 → 앞쪽 가닥
    const pts1 = [], pts2 = [];
    for (let i = 0; i < 8; i++) { const a = th(i), s = Math.sin(a); pts1.push({ x: dCol(i), y: D_MID - D_H * s, z: Math.cos(a) }); pts2.push({ x: dCol(i), y: D_MID + D_H * s, z: -Math.cos(a) }); }
    const extend = (pts) => { const a = pts[0], b = pts[pts.length - 1]; return [{ x: DP.x + 20, y: a.y, z: a.z }, ...pts, { x: DP.x + DP.w - 20, y: b.y, z: b.z }]; };
    const strand = (pts, col, front) => { const e = extend(pts); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; for (let i = 0; i < e.length - 1; i++) { const z = (e[i].z + e[i + 1].z) / 2; if ((z >= 0) !== front) continue; ctx.strokeStyle = C.shade(col, -0.25); ctx.lineWidth = front ? 11 : 9; ctx.beginPath(); ctx.moveTo(e[i].x, e[i].y); ctx.lineTo(e[i + 1].x, e[i + 1].y); ctx.stroke(); ctx.strokeStyle = col; ctx.lineWidth = front ? 7 : 5.4; ctx.beginPath(); ctx.moveTo(e[i].x, e[i].y); ctx.lineTo(e[i + 1].x, e[i + 1].y); ctx.stroke(); } };
    strand(pts1, '#3b82f6', false); strand(pts2, '#7aa7f0', false);
    // 염기쌍
    for (let i = 0; i < 8; i++) {
      const p1 = pts1[i], p2 = pts2[i], x = dCol(i), b1 = TMPL[i], b2 = d.slots[i];
      const len = Math.abs(p2.y - p1.y), top = Math.min(p1.y, p2.y), mid = (p1.y + p2.y) / 2;
      const sh = d.shake[i] > 0 && !RM ? Math.sin(t * 50) * 4 * d.shake[i] : 0; d.shake[i] = Math.max(0, d.shake[i] - dt * 2.5);
      const bw = Math.min(dCW * 0.7, L(58, 40));
      const faceTop = p1.z >= 0;   // 위 가닥이 앞쪽이면 그 블록이 앞
      const drawHalf = (b, fromY, toY) => {
        const hgt = Math.abs(toY - fromY), cy = (fromY + toY) / 2;
        if (hgt < 3) return;
        D.roundRect(x - bw / 2 + sh, Math.min(fromY, toY), bw, hgt, Math.min(9, hgt / 2));
        const g = ctx.createLinearGradient(x - bw / 2, 0, x + bw / 2, 0); g.addColorStop(0, C.shade(BASES[b].col, 0.3)); g.addColorStop(1, BASES[b].col); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = C.shade(BASES[b].col, -0.4); ctx.lineWidth = 1.6; ctx.stroke();
        if (hgt > 24) T(x + sh, cy + 6, b, L(20, 16), '#fff', 'center', 800, { stroke: 'rgba(0,0,0,.28)', strokeWidth: 3 });
      };
      const g1 = 4;
      // 위 염기 (p1에서 가운데로), 아래 염기 (p2에서 가운데로)
      drawHalf(b1, p1.y + (mid > p1.y ? 5 : -5), mid + (mid > p1.y ? -g1 : g1));
      if (b2) drawHalf(b2, p2.y + (mid > p2.y ? 5 : -5), mid + (mid > p2.y ? -g1 : g1));
      else if (len > 24) { const y0 = mid + g1, y1 = p2.y - 5, on = i === dnaFilled(); D.roundRect(x - bw / 2, y0, bw, Math.max(10, y1 - y0), 9); ctx.fillStyle = on ? 'rgba(34,197,94,' + (0.1 + 0.08 * Math.sin(t * 4)) + ')' : 'rgba(255,255,255,.45)'; ctx.fill(); ctx.setLineDash([6, 5]); ctx.strokeStyle = on ? '#16a34a' : '#9fb3c8'; ctx.lineWidth = on ? 3 : 2; ctx.stroke(); ctx.setLineDash([]); T(x, (y0 + y1) / 2 + 7, '?', 20, on ? '#16a34a' : '#9fb3c8', 'center', 800); }
      // 수소 결합 점
      if (b2 && len > 14) { const n = (b1 === 'A' || b1 === 'T') ? 2 : 3; ctx.fillStyle = '#fff'; for (let k = 0; k < n; k++) { ctx.beginPath(); ctx.arc(x - (n - 1) * 3.5 + k * 7, mid, 2, 0, TAU); ctx.fill(); } }
    }
    strand(pts1, '#3b82f6', true); strand(pts2, '#7aa7f0', true);
    D.label(DP.x + DP.w - 64, D_TOP - 24, '주어진 가닥', { bg: '#dbeafe', color: '#1e40af', border: '#93c5fd', size: 13 });
    if (!d.done) D.label(DP.x + DP.w - 76, D_BOT + 28, '만들 상보 가닥', { bg: '#e8f0fe', color: '#3b5db8', border: '#b6c9f2', size: 13 });
    // 틀린 블록 튕김
    d.pc = d.pc.filter((q) => { q.t += dt; const k = q.t / 0.7; if (k >= 1) return false; drawBaseBlock(q.x + Math.sin(q.t * 30) * 4, q.y + 60 * k * k + 10 * k, q.b, { scale: 0.8, alpha: 1 - k }); return true; });
    // 트레이
    T(DTR.x + 16, DTR.y + 24, d.done ? '✨ 완성!' : '염기 블록', 15, '#334155', 'left', 800);
    DNA_TRAY.forEach((it) => { if (d.drag && d.drag.id === it.id) return; drawBaseBlock(it.x, it.y, it.id, { scale: 1.1 }); TF(it.x, it.y + BS.h / 2 + 18, BASES[it.id].name, 96, 13, 11, '#475569', 'center', 800); });
    if (d.drag) drawBaseBlock(d.drag.x, d.drag.y, d.drag.id, { scale: 1.2, lift: 1 });
    // 안내
    T(DIP.x + 16, DIP.y + 24, '염기쌍 규칙', 15, '#9a3412', 'left', 800);
    textBlock(DIP.x + 16, DIP.y + 46, DIP.w - 32, '아데닌(A)은 타이민(T)과 2개의 수소 결합, 구아닌(G)은 사이토신(C)과 3개의 수소 결합으로 짝을 이뤄요. 한 가닥의 서열이 정해지면 상보 가닥의 서열도 정해져요.', L(14, 13), '#475569', L(20, 18), 700);
  }
  const dnaPT = {
    down(p) {
      if (S.dna.done) return false;
      for (const it of DNA_TRAY) if (Math.abs(p.x - it.x) < 38 && Math.abs(p.y - it.y) < 30) { S.dna.drag = { id: it.id, x: p.x, y: p.y, sx: p.x, sy: p.y, moved: false }; Sound.tick(); return true; }
      return false;
    },
    move(p) { const d = S.dna.drag; if (!d) return; if (Math.hypot(p.x - d.sx, p.y - d.sy) > 8) d.moved = true; if (d.moved) { d.x = p.x; d.y = p.y; } },
    up(p) {
      const d = S.dna.drag; if (!d) return; S.dna.drag = null;
      if (!d.moved) { const i = S.dna.slots.findIndex((s) => !s); if (i >= 0) dnaPlace(d.id, i); return; }
      let best = -1, bd = 1e9; for (let i = 0; i < 8; i++) { const dd = Math.abs(p.x - dCol(i)); if (dd < bd) { bd = dd; best = i; } }
      if (best >= 0 && bd < dCW * 0.7 && p.y > D_MID - 30 && p.y < DP.y + DP.h) dnaPlace(d.id, best);
    },
    hover(p) { return DNA_TRAY.some((it) => Math.abs(p.x - it.x) < 38 && Math.abs(p.y - it.y) < 30) ? 'grab' : 'default'; },
  };

  /* ----- 염기 비율 계산 ----- */
  const RP = PHONE ? { x: 10, y: 10, w: 460, h: 410 } : { x: 14, y: 14, w: 772, h: 400 };
  S.ratio = { a: 25, tOk: false, gOk: false, tShow: 0, gShow: 0, cShow: 0 };
  const rNA = () => Math.round(400 * S.ratio.a / 100);
  const rExp = () => ({ t: rNA(), g: (400 - 2 * rNA()) / 2 });
  function ratioCheck() { const e = rExp(), t = numOf('inT'), g = numOf('inG'); return { t: t === e.t, g: g === e.g }; }
  function ratioDraw(dt, t) {
    const r = S.ratio, e = rExp(), ck = ratioCheck();
    r.tShow = approach(r.tShow, ck.t ? 1 : 0, dt, 5); r.gShow = approach(r.gShow, ck.g ? 1 : 0, dt, 5);
    panel(RP.x, RP.y, RP.w, RP.h, 18, '#f9fbff');
    T(RP.x + 20, RP.y + 34, '이중 가닥 DNA 200염기쌍 조각 (염기 400개)', L(19, 16), '#1e3a8a', 'left', 800);
    textBlock(RP.x + 20, RP.y + 58, RP.w - 40, 'A의 비율은 ' + r.a + ' %예요. T, G, C는 몇 개일까요? 아래 칸에 T와 G의 개수를 써 보세요.', L(15, 13.5), '#475569', L(21, 19), 700);
    const bx = RP.x + 24, bw = RP.w - 48, by = RP.y + L(124, 140), bh = L(60, 54);
    const nA = e.t, nG = e.g, seg = [['A', nA, 1], ['T', e.t, r.tShow], ['G', nG, r.gShow], ['C', nG, r.gShow]];
    let x = bx;
    seg.forEach(([b, n, show]) => {
      const w = bw * n / 400;
      D.roundRect(x, by, Math.max(0, w - 2), bh, 8);
      ctx.fillStyle = C.mix('#e5e9f0', BASES[b].col, show); ctx.fill(); ctx.strokeStyle = C.mix('#cbd5e1', C.shade(BASES[b].col, -0.3), show); ctx.lineWidth = 2; ctx.stroke();
      if (w > 30) T(x + w / 2 - 1, by + bh / 2 + 6, show > 0.5 ? b + ' ' + n + '개' : b + ' ?', L(16, 14), show > 0.5 ? '#fff' : '#64748b', 'center', 800, show > 0.5 ? { stroke: 'rgba(0,0,0,.3)', strokeWidth: 3 } : {});
      x += w;
    });
    D.label(bx + bw / 2, by - 22, '염기 400개 = 100 %', { bg: '#e8f0fe', color: '#1e3a8a', border: '#b6c9f2', size: 13 });
    // 비율 눈금
    for (let v = 0; v <= 100; v += 25) { const xx = bx + bw * v / 100; D.dashedLine(xx, by + bh + 4, xx, by + bh + 14, { color: '#94a3b8', width: 2, dash: [3, 3] }); T(xx, by + bh + 32, v + ' %', 13, '#64748b', 'center', 700); }
    // 규칙
    const ry = by + bh + L(66, 62);
    const lines = ['A = T  (A의 개수 = T의 개수)', 'G = C  (G의 개수 = C의 개수)', 'A + T + G + C = 400개'];
    lines.forEach((l, i) => { D.roundRect(RP.x + 20, ry + i * L(40, 38) - 18, RP.w - 40, L(34, 32), 10); ctx.fillStyle = i === 2 ? '#fff7e0' : '#eef5ff'; ctx.fill(); T(RP.x + 34, ry + i * L(40, 38) + 5, l, L(16, 14.5), '#1f2d44', 'left', 800); });
    const fin = ck.t && ck.g;
    if (fin) textBlock(RP.x + 20, ry + L(130, 122), RP.w - 40, 'A ' + r.a + ' % → T ' + r.a + ' %, G + C = ' + (100 - 2 * r.a) + ' % → G = C = ' + (50 - r.a) + ' %', L(16, 14.5), '#15803d', 22, 800);
    else textBlock(RP.x + 20, ry + L(130, 122), RP.w - 40, 'A = T 이므로 T의 개수를 먼저 구하고, 나머지를 G와 C가 똑같이 나눠 가져요.', L(14.5, 13.5), '#64748b', 20, 700);
  }


  /* =========================================================
     ③ RNA 모형 : 전사 모형 (DNA 한 가닥을 주형으로 mRNA 만들기) + RNA 3종
     ========================================================= */
  const CODING = ['A', 'T', 'G', 'C', 'C', 'G', 'T', 'A'];
  const TEMPL = CODING.map((b) => CMP_DNA[b]);                  // 주형 가닥: T A C G G C A T
  const MRNA = TEMPL.map((b) => CMP_RNA[b]);                    // mRNA: A U G C C G U A
  const NUCP = PHONE ? { x: 10, y: 10, w: 460, h: 312 } : { x: 14, y: 14, w: 560, h: 358 };
  const CYTP = PHONE ? { x: 10, y: 322, w: 460, h: 128 } : { x: 574, y: 14, w: 212, h: 358 };
  const RTR = PHONE ? { x: 10, y: 460, w: 460, h: 170 } : { x: 14, y: 384, w: 772, h: 162 };
  const rcw = (NUCP.w - 40) / 8;
  const rX = (i) => NUCP.x + 20 + (i + 0.5) * rcw;
  const R_YC = [L(140, 112), L(100, 86)], R_YT = [L(182, 148), L(214, 182)];   // [닫힘, 열림]
  const R_YR = L(280, 252);
  const RBW = L(46, 36), RBH = L(36, 30);
  const R_CX = NUCP.x + NUCP.w / 2;
  const PORE = PHONE ? { x: 240, y: NUCP.y + NUCP.h } : { x: NUCP.x + NUCP.w, y: R_YR + 24 };
  const RIB = PHONE ? { x: 240, y: CYTP.y + 70 } : { x: CYTP.x + CYTP.w / 2, y: R_YR + 24 };
  const RNA_TRAY = ['A', 'U', 'G', 'C'].map((b, i) => ({ id: b, x: RTR.x + RTR.w / 2 + (i - 1.5) * L(120, 100), y: RTR.y + L(68, 70) }));
  S.rna = { zip: 0, zipT: 0, slots: Array(8).fill(null), stage: 0, u: 0, wrong: 0, drag: null, pc: [], shake: Array(8).fill(0), done: false, opened: false, msg: '' };
  function rnaReset() { Object.assign(S.rna, { zip: 0, zipT: 0, slots: Array(8).fill(null), stage: 0, u: 0, wrong: 0, drag: null, pc: [], done: false, opened: false, msg: '' }); FX.clear(); updateCtl(); }
  const rnaFilled = () => S.rna.slots.filter(Boolean).length;
  function rnaOpen() { if (S.rna.opened) return; S.rna.opened = true; S.rna.zipT = 1; Sound.click(); }
  function rnaPlace(b, i) {
    const r = S.rna;
    if (!r.opened) { showHint('먼저 ✂ DNA 열기를 눌러 두 가닥을 풀어 주세요.'); return false; }
    if (r.stage > 0 || r.slots[i]) return false;
    if (MRNA[i] === b) {
      r.slots[i] = b; Sound.click();
      FX.add({ kind: 'text', x: rX(i), y: R_YR + 40, text: TEMPL[i] + '–' + b, life: 0.9, color: '#9333ea', size: 15 });
      if (rnaFilled() === 8) { r.stage = 1; r.u = 0; r.t1 = 0; r.zipT = 0; }
      updateCtl(); return true;
    }
    r.wrong++; r.shake[i] = 1; Sound.fail(); r.pc.push({ x: rX(i), y: R_YR - 18, b, t: 0 });
    r.msg = '주형의 ' + TEMPL[i] + '와 짝이 되는 RNA 염기가 아니에요. (T→A, A→U, G→C, C→G)'; showHint(r.msg, 4500);
    return false;
  }
  function rnaUpdate(dt) {
    const r = S.rna;
    r.zip = RM ? r.zipT : approach(r.zip, r.zipT, dt, 3.2);
    r.shake = r.shake.map((s) => Math.max(0, s - dt * 2.5));
    if (r.stage === 1) { r.t1 += dt; if (r.t1 > 1.0) { r.stage = 2; r.u = 0; Sound.click(); } }
    else if (r.stage === 2) { r.u = Math.min(1, r.u + dt / (RM ? 0.01 : 3.0)); if (r.u >= 1) { r.stage = 3; r.done = true; Sound.success(); parts.burst(RIB.x, RIB.y, { count: 26, speed: 200, colors: ['#9333ea', '#c084fc', '#16a34a', '#f59e0b'] }); updateCtl(); } }
  }
  function rnaBlock(x, y, b, o) { drawBaseBlock(x, y, b, Object.assign({ w: o && o.w || RBW, h: RBH, fs: L(18, 15) }, o || {})); }
  function rnaDraw(dt, t) {
    const r = S.rna, zp = smooth(r.zip);
    // 핵과 세포질
    D.roundRect(NUCP.x, NUCP.y, NUCP.w, NUCP.h, 22); ctx.fillStyle = '#f3ecfb'; ctx.fill();
    D.roundRect(CYTP.x, CYTP.y, CYTP.w, CYTP.h, 22); ctx.fillStyle = '#fbf6e2'; ctx.fill();
    ctx.save(); ctx.lineWidth = 5; ctx.strokeStyle = '#a78bd4'; D.roundRect(NUCP.x, NUCP.y, NUCP.w, NUCP.h, 22); ctx.stroke(); ctx.lineWidth = 2; ctx.strokeStyle = '#d9c8f3'; D.roundRect(NUCP.x + 6, NUCP.y + 6, NUCP.w - 12, NUCP.h - 12, 18); ctx.stroke(); ctx.restore();
    // 핵공 (통로)
    ctx.save(); ctx.fillStyle = PHONE ? '#f3ecfb' : '#f3ecfb';
    if (PHONE) { ctx.fillRect(PORE.x - 26, PORE.y - 4, 52, 10); D.sphere(PORE.x - 28, PORE.y + 1, 7, '#8b5cf6', { gloss: true }); D.sphere(PORE.x + 28, PORE.y + 1, 7, '#8b5cf6', { gloss: true }); }
    else { ctx.fillRect(PORE.x - 4, PORE.y - 26, 10, 52); D.sphere(PORE.x + 1, PORE.y - 28, 7, '#8b5cf6', { gloss: true }); D.sphere(PORE.x + 1, PORE.y + 28, 7, '#8b5cf6', { gloss: true }); }
    ctx.restore();
    T(NUCP.x + NUCP.w - 18, NUCP.y + 30, '핵 속 (전사)', L(18, 16), '#6d28d9', 'right', 800);
    T(PHONE ? CYTP.x + 18 : CYTP.x + CYTP.w / 2, CYTP.y + (PHONE ? 26 : 30), '세포질', L(18, 16), '#a16207', PHONE ? 'left' : 'center', 800);
    D.label(PHONE ? PORE.x + 70 : PORE.x + 60, PHONE ? PORE.y - 14 : PORE.y - 92, '핵공', { bg: '#ede9fe', color: '#6d28d9', border: '#c4b5fd', size: 13 });
    // DNA 두 가닥
    const yC = lerp(R_YC[0], R_YC[1], zp), yT = lerp(R_YT[0], R_YT[1], zp);
    const bb = (y, col) => { ctx.lineCap = 'round'; ctx.strokeStyle = C.shade(col, -0.3); ctx.lineWidth = 11; ctx.beginPath(); ctx.moveTo(NUCP.x + 22, y); ctx.lineTo(NUCP.x + NUCP.w - 22, y); ctx.stroke(); ctx.strokeStyle = col; ctx.lineWidth = 7; ctx.stroke(); };
    bb(yC - RBH / 2 - 10, '#3b82f6'); bb(yT + RBH / 2 + 10, '#7aa7f0');
    for (let i = 0; i < 8; i++) {
      const x = rX(i); const sh = r.shake[i] > 0 && !RM ? Math.sin(t * 50) * 4 * r.shake[i] : 0;
      rnaBlock(x, yC, CODING[i], {}); rnaBlock(x, yT, TEMPL[i], {});
      if (zp < 0.5) { const n = (CODING[i] === 'A' || CODING[i] === 'T') ? 2 : 3; ctx.fillStyle = '#fff'; for (let k = 0; k < n; k++) { ctx.beginPath(); ctx.arc(x - (n - 1) * 3.5 + k * 7, (yC + yT) / 2, 2, 0, TAU); ctx.fill(); } }
      if (zp > 0.9 && !r.slots[i] && r.stage === 0) {
        const on = i === rnaFilled();
        D.roundRect(x - RBW / 2 + sh, R_YR - RBH / 2, RBW, RBH, 9); ctx.fillStyle = on ? 'rgba(168,85,247,' + (0.1 + 0.08 * Math.sin(t * 4)) + ')' : 'rgba(255,255,255,.5)'; ctx.fill(); ctx.setLineDash([6, 5]); ctx.strokeStyle = on ? '#9333ea' : '#b9a6d8'; ctx.lineWidth = on ? 2.6 : 1.8; ctx.stroke(); ctx.setLineDash([]);
        T(x + sh, R_YR + 6, '?', 17, on ? '#9333ea' : '#b9a6d8', 'center', 800);
      }
      if (zp > 0.9 && r.stage === 0 && r.slots[i]) { ctx.fillStyle = '#fff'; const n = (TEMPL[i] === 'A' || TEMPL[i] === 'T') ? 2 : 3; for (let k = 0; k < n; k++) { ctx.beginPath(); ctx.arc(x - (n - 1) * 3.5 + k * 7, (yT + RBH / 2 + R_YR - RBH / 2) / 2, 2, 0, TAU); ctx.fill(); } }
    }
    D.label(NUCP.x + 52, yC - RBH / 2 - 28, 'DNA 코딩 가닥', { bg: '#dbeafe', color: '#1e40af', border: '#93c5fd', size: 13 });
    D.label(NUCP.x + 52, yT + RBH / 2 + 30, 'DNA 주형 가닥', { bg: '#e8f0fe', color: '#3b5db8', border: '#b6c9f2', size: 13 });
    if (zp > 0.9 && r.stage === 0) D.label(NUCP.x + 52, R_YR + RBH / 2 + 24, 'mRNA (만드는 중)', { bg: '#f3e8ff', color: '#6b21a8', border: '#d8b4fe', size: 13 });
    // 리보솜 (세포질)
    const ribA = r.stage >= 2 ? smooth(r.u) : 0;
    ctx.save(); ctx.globalAlpha = 0.55 + 0.45 * ribA;
    const rb = RIB, rs = L(1, 0.9);
    D.sphere(rb.x, rb.y - 34 * rs, 40 * rs, '#f0b44c', { gloss: true, shadow: true }); ctx.save(); ctx.translate(rb.x, rb.y + 28 * rs); ctx.scale(1.15, 0.7); D.sphere(0, 0, 36 * rs, '#e89a2e', { gloss: true, shadow: true }); ctx.restore();
    ctx.restore();
    T(rb.x, rb.y + (PHONE ? 70 : 90), '리보솜', 14, '#a16207', 'center', 800);
    // mRNA 가닥 (RNA 슬롯의 염기들)
    const k0 = r.stage >= 1 ? 1 : 0;
    let gx = R_CX, gy = R_YR, gs = 1;
    if (r.stage >= 1) {
      const rel = r.stage === 1 ? smooth(r.t1 / 1.0) : 1;
      gy = R_YR + 22 * rel;
      if (r.stage >= 2) { const u = smooth(r.u), e = PHONE ? { x: RIB.x, y: RIB.y - 4, s: 0.46 } : { x: RIB.x, y: RIB.y - 2, s: 0.37 }; gx = lerp(R_CX, e.x, u); gy = lerp(R_YR + 22, e.y, u); gs = lerp(1, e.s, u); }
    }
    const filled = r.slots.map((b, i) => (b ? i : -1)).filter((i) => i >= 0);
    if (filled.length) {
      const xs = (i) => gx + (rX(i) - R_CX) * gs;
      const y0 = gy;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#6b21a8'; ctx.lineWidth = 11 * gs + 2; ctx.beginPath(); ctx.moveTo(xs(filled[0]) - RBW / 2 * gs, y0 + RBH / 2 * gs + 10 * gs); ctx.lineTo(xs(filled[filled.length - 1]) + RBW / 2 * gs, y0 + RBH / 2 * gs + 10 * gs); ctx.stroke();
      ctx.strokeStyle = '#c084fc'; ctx.lineWidth = 7 * gs + 1; ctx.stroke();
      filled.forEach((i) => { const b = r.slots[i]; if (gs > 0.6) rnaBlock(xs(i), y0, b, { scale: gs }); else { D.roundRect(xs(i) - RBW * gs / 2, y0 - RBH * gs / 2, RBW * gs, RBH * gs, 4); ctx.fillStyle = BASES[b].col; ctx.fill(); ctx.strokeStyle = C.shade(BASES[b].col, -0.4); ctx.lineWidth = 1; ctx.stroke(); } });
      if (r.stage >= 2) D.label(gx, gy - 36 * gs - 6, 'mRNA', { bg: '#9333ea', size: 13 });
    }
    // 틀린 블록 튕김
    r.pc = r.pc.filter((q) => { q.t += dt; const k = q.t / 0.7; if (k >= 1) return false; rnaBlock(q.x + Math.sin(q.t * 30) * 4, q.y + 60 * k * k + 10 * k, q.b, { scale: 0.85, alpha: 1 - k }); return true; });
    // 트레이
    panel(RTR.x, RTR.y, RTR.w, RTR.h, 16, '#ffffff');
    T(RTR.x + 16, RTR.y + 28, r.done ? '✨ mRNA가 핵공을 지나 리보솜으로 갔어요!' : (r.stage > 0 ? 'mRNA가 DNA에서 떨어져 나가요…' : 'RNA 염기를 주형 가닥 아래 칸에 맞춰 놓아요'), L(16, 14), '#334155', 'left', 800);
    RNA_TRAY.forEach((it) => { if (r.drag && r.drag.id === it.id) return; drawBaseBlock(it.x, it.y, it.id, { scale: 1.1 }); TF(it.x, it.y + BS.h / 2 + 20, BASES[it.id].name, 96, 13, 11, '#475569', 'center', 800); });
    if (r.drag) drawBaseBlock(r.drag.x, r.drag.y, r.drag.id, { scale: 1.2, lift: 1 });
    textBlock(RTR.x + 16, RTR.y + RTR.h - L(16, 44), RTR.w - 32, 'RNA에는 타이민(T) 대신 유라실(U)을 써요. 짝: 주형의 T→A, A→U, G→C, C→G', L(14, 13), '#6b21a8', L(20, 18), 800);
  }
  const rnaPT = {
    down(p) {
      const r = S.rna; if (r.stage > 0) return false;
      for (const it of RNA_TRAY) if (Math.abs(p.x - it.x) < 38 && Math.abs(p.y - it.y) < 32) { r.drag = { id: it.id, x: p.x, y: p.y, sx: p.x, sy: p.y, moved: false }; Sound.tick(); return true; }
      return false;
    },
    move(p) { const d = S.rna.drag; if (!d) return; if (Math.hypot(p.x - d.sx, p.y - d.sy) > 8) d.moved = true; if (d.moved) { d.x = p.x; d.y = p.y; } },
    up(p) {
      const r = S.rna, d = r.drag; if (!d) return; r.drag = null;
      if (!d.moved) { const i = r.slots.findIndex((s) => !s); if (i >= 0) rnaPlace(d.id, i); return; }
      let best = -1, bd = 1e9; for (let i = 0; i < 8; i++) { const dd = Math.abs(p.x - rX(i)); if (dd < bd) { bd = dd; best = i; } }
      if (best >= 0 && bd < rcw * 0.7 && p.y > R_YR - 50 && p.y < NUCP.y + NUCP.h) rnaPlace(d.id, best);
    },
    hover(p) { return RNA_TRAY.some((it) => Math.abs(p.x - it.x) < 38 && Math.abs(p.y - it.y) < 32) ? 'grab' : 'default'; },
  };

  /* ----- RNA 3종 : 그림 상자에 역할 카드 끌어 넣기 ----- */
  function drawMRNAPic(b) {
    const cx = b.x + b.w / 2, cy = b.y + 98, n = PHONE ? 5 : 6, w = b.w - 30, seq = ['A', 'U', 'G', 'C', 'C', 'G'];
    ctx.save(); ctx.lineCap = 'round'; ctx.strokeStyle = '#6b21a8'; ctx.lineWidth = 8; ctx.beginPath();
    for (let k = 0; k <= 40; k++) { const x = b.x + 15 + w * k / 40, y = cy - 16 + Math.sin(k * 0.5) * 5; if (k) ctx.lineTo(x, y); else ctx.moveTo(x, y); } ctx.stroke(); ctx.strokeStyle = '#c084fc'; ctx.lineWidth = 4.5; ctx.stroke(); ctx.restore();
    for (let k = 0; k < n; k++) { const x = b.x + 15 + w * (k + 0.5) / n, y = cy - 16 + Math.sin((k + 0.5) / n * 40 * 0.5) * 5; D.roundRect(x - 13, y + 8, 26, 26, 6); ctx.fillStyle = BASES[seq[k]].col; ctx.fill(); T(x, y + 27, seq[k], 15, '#fff', 'center', 800); }
    T(cx, cy + 62, '한 가닥', 13, '#6b21a8', 'center', 800);
  }
  function drawTRNAPic(b) {
    const cx = b.x + b.w / 2, cy = b.y + 114, s = PHONE ? 0.8 : 1;
    ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s); ctx.lineCap = 'round'; ctx.lineWidth = 6; ctx.strokeStyle = '#0d9488';
    ctx.beginPath(); ctx.moveTo(-5, -52); ctx.lineTo(-5, 10); ctx.moveTo(5, -52); ctx.lineTo(5, 10); ctx.stroke();
    [[-30, -22], [30, -22]].forEach(([dx, dy]) => { ctx.beginPath(); ctx.moveTo(dx > 0 ? 5 : -5, dy); ctx.lineTo(dx * 0.7, dy); ctx.stroke(); ctx.beginPath(); ctx.arc(dx * 1.25, dy, 14, 0, TAU); ctx.fillStyle = '#99f6e4'; ctx.fill(); ctx.stroke(); });
    ctx.beginPath(); ctx.arc(0, 30, 18, 0, TAU); ctx.fillStyle = '#99f6e4'; ctx.fill(); ctx.stroke();
    ['U', 'A', 'C'].forEach((q, i) => { D.roundRect(-20 + i * 14, 46, 12, 16, 3); ctx.fillStyle = BASES[q].col; ctx.fill(); });
    D.sphere(0, -66, 13, '#7c3aed', { gloss: true });
    ctx.restore();
    T(cx + 22 * s, cy - 62 * s, '아미노산', 13, '#5b21b6', 'left', 800);
    T(cx, cy + 82 * s, '안티코돈 쪽', 12.5, '#0f766e', 'center', 800);
  }
  function drawRRNAPic(b) {
    const cx = b.x + b.w / 2, cy = b.y + 90, s = PHONE ? 0.8 : 1;
    ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s);
    D.sphere(0, -24, 40, '#f0b44c', { gloss: true, shadow: true }); ctx.save(); ctx.translate(0, 26); ctx.scale(1.15, 0.7); D.sphere(0, 0, 36, '#e89a2e', { gloss: true, shadow: true }); ctx.restore();
    ctx.strokeStyle = 'rgba(120,53,15,.55)'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); for (let k = 0; k <= 24; k++) { const x = -26 + k * 2.2, y = -24 + Math.sin(k * 0.9) * 8; if (k) ctx.lineTo(x, y); else ctx.moveTo(x, y); } ctx.stroke();
    ctx.restore();
    T(cx, cy + 66 * s, '리보솜(rRNA + 단백질)', PHONE ? 12.5 : 13, '#9a3412', 'center', 800);
  }
  function drawQPic(b) { T(b.x + b.w / 2, b.y + 70, '?', 40, '#94a3b8', 'center', 800); T(b.x + b.w / 2, b.y + 96, '카드 2장', 13.5, '#64748b', 'center', 700); }
  const KIND_CARDS = [
    { id: 'c_m', label: '리보솜으로 정보 전달', box: 'mrna' }, { id: 'c_t', label: '아미노산 운반', box: 'trna' }, { id: 'c_r', label: '리보솜의 구성 성분', box: 'rrna' },
    { id: 'c_d', label: '유전 정보를 저장 (DNA)', box: 'x' }, { id: 'c_p', label: '세포막의 뼈대 (인지질)', box: 'x' },
  ];
  function kindBoxes() {
    const bw = PHONE ? 224 : 185.5, bh = PHONE ? 176 : 262, gap = PHONE ? 12 : 10;
    const def = [['mrna', 'mRNA', '#9333ea', drawMRNAPic], ['trna', 'tRNA', '#0d9488', drawTRNAPic], ['rrna', 'rRNA', '#d97706', drawRRNAPic], ['x', 'RNA의 역할이 아니에요', '#64748b', drawQPic]];
    return def.map((d, i) => {
      const x = PHONE ? 10 + (i % 2) * (bw + gap) : 14 + i * (bw + gap), y = PHONE ? 10 + Math.floor(i / 2) * (bh + 10) : 14;
      const two = d[0] === 'x';
      return { id: d[0], label: d[1], col: d[2], x, y, w: bw, h: bh, cols: 1, hdr: two ? (PHONE ? 66 : 112) : bh - (PHONE ? 52 : 54), draw: d[3] };
    });
  }
  const KTRAY = PHONE ? { x: 10, y: 380, w: 460, h: 250 } : { x: 14, y: 288, w: 772, h: 258 };
  const kinds = new Sorter({
    cards: KIND_CARDS.map((c) => ({ id: c.id, label: c.label, col: '#7c3aed' })), boxes: kindBoxes(), cw: PHONE ? 214 : 240, ch: 44, kh: PHONE ? 38 : 40,
    tray: (i) => (PHONE ? { x: 16 + (i % 2) * 226, y: KTRAY.y + 52 + Math.floor(i / 2) * 56 } : { x: 28 + (i % 3) * 252, y: KTRAY.y + 66 + Math.floor(i / 3) * 62 }),
    onChange() { updateCtl(); },
  });
  const kindWrong = () => kinds.cards.filter((c) => c.zone && KIND_CARDS.find((k) => k.id === c.id).box !== c.zone);
  function kindsDraw(dt, t) {
    kinds.update(dt); kinds.drawBoxes();
    panel(KTRAY.x, KTRAY.y, KTRAY.w, KTRAY.h, 16, '#ffffff');
    T(KTRAY.x + 16, KTRAY.y + 30, '역할 카드를 알맞은 상자에 끌어 넣어요 (RNA가 아닌 카드도 있어요)', L(15, 13.5), '#334155', 'left', 800);
    kinds.drawCards();
  }
  const kindsPT = { down: (p) => kinds.down(p), move: (p) => kinds.move(p), up: (p) => kinds.up(p), hover: (p) => kinds.hover(p) };


  /* =========================================================
     ④ 세포 속 역할 : 세포 그림에서 DNA · RNA 위치 / 핵 속 DNA 실 감기 / 핵산 비교표
     ========================================================= */
  const CELLP = PHONE ? { x: 10, y: 10, w: 460, h: 366 } : { x: 14, y: 14, w: 530, h: 424 };
  const CINFO = PHONE ? { x: 10, y: 386, w: 460, h: 244 } : { x: 556, y: 14, w: 230, h: 532 };
  const CK = PHONE ? 0.86 : 1;
  const cx2 = (u) => CELLP.x + 10 + u * CK, cy2 = (v) => CELLP.y + 10 + v * CK;
  const ORGS = [
    { id: 'nuc', kind: 'nuc', name: '핵', x: 160, y: 150, a: 72, b: 72, rot: 0, dna: true, rna: true },
    { id: 'mi1', kind: 'mito', name: '미토콘드리아', x: 322, y: 78, a: 42, b: 21, rot: -0.35, dna: true, rna: true },
    { id: 'mi2', kind: 'mito', name: '미토콘드리아', x: 120, y: 318, a: 42, b: 21, rot: 0.4, dna: true, rna: true },
    { id: 'ch1', kind: 'chloro', name: '엽록체', x: 440, y: 112, a: 40, b: 23, rot: 0.55, dna: true, rna: true },
    { id: 'ch2', kind: 'chloro', name: '엽록체', x: 252, y: 346, a: 40, b: 23, rot: -0.15, dna: true, rna: true },
    { id: 'vac', kind: 'vac', name: '액포', x: 372, y: 246, a: 104, b: 74, rot: 0, dna: false, rna: false },
  ];
  const CELLW = { w: 510, h: 400 };
  const RIBO_DOTS = (() => {
    const rr = mulberry(21), out = [];
    for (let tries = 0; out.length < 70 && tries < 900; tries++) {
      const x = 24 + rr() * (CELLW.w - 48), y = 24 + rr() * (CELLW.h - 48);
      if (ORGS.every((o) => { const dx = x - o.x, dy = y - o.y, c = Math.cos(-o.rot), s = Math.sin(-o.rot), lx = dx * c - dy * s, ly = dx * s + dy * c; return (lx * lx) / ((o.a + 12) * (o.a + 12)) + (ly * ly) / ((o.b + 12) * (o.b + 12)) > 1; })) out.push({ x, y });
    }
    return out;
  })();
  S.cell = { tool: 'dna', marks: { dna: {}, rna: {} }, msg: '', msgT: 0, mx: 0, my: 0, thr: false };
  function cellHit(p) {
    const u = (p.x - cx2(0)) / CK, v = (p.y - cy2(0)) / CK;
    if (u < 0 || v < 0 || u > CELLW.w || v > CELLW.h) return null;
    for (const o of ORGS) { const dx = u - o.x, dy = v - o.y, c = Math.cos(-o.rot), s = Math.sin(-o.rot), lx = dx * c - dy * s, ly = dx * s + dy * c; if ((lx * lx) / (o.a * o.a) + (ly * ly) / (o.b * o.b) <= 1) return o; }
    return { id: 'cyto', kind: 'cyto', name: '세포질', x: u, y: v, dna: false, rna: true };
  }
  function cellTap(p) {
    const c = S.cell, o = cellHit(p); if (!o) return;
    const tool = c.tool, ok = tool === 'dna' ? o.dna : o.rna;
    if (!ok) {
      Sound.fail(); c.msg = tool === 'dna' ? (o.id === 'cyto' ? '세포질에는 DNA가 없어요. (리보솜과 RNA는 있어요)' : o.name + '에는 DNA가 없어요.') : o.name + '에는 RNA가 없어요.'; c.msgT = 2.8; c.mx = p.x; c.my = p.y; return;
    }
    const store = c.marks[tool];
    if (store[o.id] && o.id !== 'cyto') { delete store[o.id]; Sound.tick(); return; }
    store[o.id] = o.id === 'cyto' ? { x: (p.x - cx2(0)) / CK, y: (p.y - cy2(0)) / CK } : true;
    Sound.success(); parts.burst(p.x, p.y, { count: 12, speed: 120, colors: tool === 'dna' ? ['#2563eb', '#60a5fa'] : ['#9333ea', '#c084fc'] });
    c.msg = ''; c.msgT = 0; updateCtl();
  }
  const cellOk = () => {
    const d = S.cell.marks.dna, r = S.cell.marks.rna;
    return { dna: !!d.nuc && !!(d.mi1 || d.mi2) && !!(d.ch1 || d.ch2), rna: !!r.nuc && !!r.cyto };
  };
  function drawOrg(o) {
    ctx.save(); ctx.translate(cx2(o.x), cy2(o.y)); ctx.rotate(o.rot); ctx.scale(CK, CK);
    if (o.kind === 'nuc') {
      D.shadow(() => { ctx.beginPath(); ctx.arc(0, 0, o.a, 0, TAU); ctx.fillStyle = '#d9c5f2'; ctx.fill(); }, { blur: 8, y: 3, color: 'rgba(60,20,100,.25)' });
      ctx.strokeStyle = '#8b5cf6'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 0, o.a, 0, TAU); ctx.stroke(); ctx.strokeStyle = '#c4b5fd'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(0, 0, o.a - 6, 0, TAU); ctx.stroke();
      ctx.strokeStyle = 'rgba(91,33,182,.55)'; ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-34, -18); ctx.bezierCurveTo(-10, -44, 20, -8, 34, -24); ctx.moveTo(-40, 10); ctx.bezierCurveTo(-14, 26, 0, -2, 28, 20); ctx.moveTo(-18, 38); ctx.bezierCurveTo(0, 22, 12, 46, 30, 38); ctx.stroke();
      D.sphere(-12, -6, 12, '#7c3aed', { gloss: true });
      ctx.fillStyle = '#6d28d9'; [[0.4, 5], [2.3, 5], [4.1, 5]].forEach(([a, r]) => { ctx.beginPath(); ctx.arc(Math.cos(a) * (o.a + 1), Math.sin(a) * (o.a + 1), r, 0, TAU); ctx.fill(); });
    } else if (o.kind === 'mito') {
      ctx.beginPath(); ctx.ellipse(0, 0, o.a, o.b, 0, 0, TAU); ctx.fillStyle = '#fbb6a1'; ctx.fill(); ctx.strokeStyle = '#e0613f'; ctx.lineWidth = 3; ctx.stroke();
      ctx.strokeStyle = '#e8805f'; ctx.lineWidth = 2; ctx.beginPath(); for (let k = -3; k <= 3; k++) { ctx.moveTo(k * 10, -o.b + 3); ctx.lineTo(k * 10 + 4, 3 * (k % 2 ? 1 : -1)); } ctx.stroke();
    } else if (o.kind === 'chloro') {
      ctx.beginPath(); ctx.ellipse(0, 0, o.a, o.b, 0, 0, TAU); ctx.fillStyle = '#86d17a'; ctx.fill(); ctx.strokeStyle = '#2f8f3a'; ctx.lineWidth = 3; ctx.stroke();
      ctx.fillStyle = '#2f9e44'; for (let k = -2; k <= 2; k++) { D.roundRect(k * 14 - 5, -9, 10, 18, 3); ctx.fill(); }
    } else if (o.kind === 'vac') {
      const g = ctx.createRadialGradient(-20, -20, 6, 0, 0, o.a); g.addColorStop(0, '#e3f4ff'); g.addColorStop(1, '#a9d6f5'); ctx.beginPath(); ctx.ellipse(0, 0, o.a, o.b, 0, 0, TAU); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = '#6fb1e0'; ctx.lineWidth = 3; ctx.stroke();
    }
    ctx.restore();
  }
  function cellBadge(x, y, tool) { D.label(x, y, tool === 'dna' ? 'DNA' : 'RNA', { bg: tool === 'dna' ? '#2563eb' : '#9333ea', size: 13, pad: 7 }); }
  function cellDraw(dt, t) {
    const c = S.cell;
    panel(CELLP.x, CELLP.y, CELLP.w, CELLP.h, 18, '#f6fbf3'); panel(CINFO.x, CINFO.y, CINFO.w, CINFO.h, 18, '#ffffff');
    // 세포벽 / 세포막
    D.roundRect(cx2(0), cy2(0), CELLW.w * CK, CELLW.h * CK, 30 * CK); ctx.fillStyle = '#fffbe8'; ctx.fill(); ctx.strokeStyle = '#7a9a3a'; ctx.lineWidth = 6; ctx.stroke();
    D.roundRect(cx2(8), cy2(8), (CELLW.w - 16) * CK, (CELLW.h - 16) * CK, 24 * CK); ctx.strokeStyle = '#c9b97a'; ctx.lineWidth = 2; ctx.stroke();
    RIBO_DOTS.forEach((d) => { ctx.fillStyle = '#d9822b'; ctx.beginPath(); ctx.arc(cx2(d.x), cy2(d.y), 2.6 * CK + 0.4, 0, TAU); ctx.fill(); });
    ORGS.forEach(drawOrg);
    T(cx2(40), cy2(CELLW.h - 14), '● 세포질의 리보솜', 13, '#b45309', 'left', 800);
    // 이름표
    [['nuc', 160, 232], ['mi1', 322, 112], ['ch1', 440, 150], ['vac', 372, 246]].forEach(([id, ux, uy]) => { const o = ORGS.find((q) => q.id === id); T(cx2(ux), cy2(uy) + (id === 'vac' ? 5 : 0), o.name, PHONE ? 13 : 14, id === 'vac' ? '#2a6fa8' : '#374151', 'center', 800, { stroke: 'rgba(255,255,255,.85)', strokeWidth: 4 }); });
    T(cx2(120), cy2(354), '미토콘드리아', 13, '#374151', 'center', 800, { stroke: 'rgba(255,255,255,.85)', strokeWidth: 4 });
    T(cx2(252), cy2(382), '엽록체', 13, '#374151', 'center', 800, { stroke: 'rgba(255,255,255,.85)', strokeWidth: 4 });
    // 표시
    Object.keys(c.marks.dna).forEach((id) => { const o = ORGS.find((q) => q.id === id); const bx = cx2(o.x) - (id === 'nuc' ? 0 : 0), by = cy2(o.y) - (o.kind === 'nuc' ? 20 : 26) * CK; cellBadge(bx, by, 'dna'); });
    Object.keys(c.marks.rna).forEach((id) => {
      if (id === 'cyto') { const q = c.marks.rna.cyto; cellBadge(cx2(q.x), cy2(q.y), 'rna'); return; }
      const o = ORGS.find((q) => q.id === id); cellBadge(cx2(o.x), cy2(o.y) + (o.kind === 'nuc' ? 24 : 14) * CK, 'rna');
    });
    const ok = cellOk();
    if (c.marks.rna.nuc && c.marks.rna.cyto) { const a = ORGS[0]; D.arrow(cx2(a.x + 50), cy2(a.y + 40), cx2(a.x + 130), cy2(a.y + 120), { color: '#9333ea', width: 4, dash: [8, 6], label: 'mRNA 이동', labelColor: '#6b21a8' }); }
    if (c.msgT > 0 && c.msg) { c.msgT -= dt; D.label(clamp(c.mx, 130, VW - 130), c.my - 24, c.msg, { bg: 'rgba(31,41,55,.92)', size: 13, pad: 10 }); }
    // 정보 패널
    let y = CINFO.y + 32; const x = CINFO.x + 16, w = CINFO.w - 32;
    T(x, y, '세포 속 핵산의 위치', PHONE ? 16 : 17, '#1e3a8a', 'left', 800); y += 24;
    textBlock(x, y, w, '도구를 고른 뒤 세포 그림을 눌러 DNA와 RNA가 있는 곳에 표시해요.', 13.5, '#475569', 19, 700); y += PHONE ? 40 : 76;
    const row = (label, good, col) => { T(x, y, (good ? '✅ ' : '⬜ ') + label, 14.5, good ? '#15803d' : '#334155', 'left', 800); y += 24; };
    const d = c.marks.dna, r = c.marks.rna;
    T(x, y, 'DNA가 있는 곳', 14, '#2563eb', 'left', 800); y += 22;
    row('핵', !!d.nuc); row('미토콘드리아', !!(d.mi1 || d.mi2)); row('엽록체', !!(d.ch1 || d.ch2));
    y += 6; T(x, y, 'RNA가 있는 곳', 14, '#9333ea', 'left', 800); y += 22;
    row('핵 (RNA가 만들어지는 곳)', !!r.nuc); row('세포질 (리보솜이 있는 곳)', !!r.cyto);
    if (!PHONE && ok.dna && ok.rna) textBlock(x, y + 10, w, '핵 속 DNA의 정보를 옮긴 RNA가 세포질의 리보솜으로 가서 단백질 합성에 쓰여요.', 13.5, '#15803d', 19, 800);
  }
  const cellPT = {
    down(p) { cellTap(p); return false; },
    hover(p) { return cellHit(p) ? 'pointer' : 'default'; },
  };

  /* ----- 핵 속 DNA 실 감기 ----- */
  const THP = PHONE ? { x: 10, y: 10, w: 460, h: 620 } : { x: 14, y: 14, w: 772, h: 532 };
  S.thr = { km: 0, f: 0, seen: false };
  const BALL = PHONE ? { x: 240, y: 170, r: 96 } : { x: 230, y: 236, r: 112 };
  const SCRIB = (() => { const rr = mulberry(5), out = []; for (let i = 0; i < 300; i++) { const a = rr() * TAU, b = a + (0.9 + rr() * 2.4) * (rr() < 0.5 ? 1 : -1), k = 0.1 + rr() * 0.7, ca = (a + b) / 2 + (rr() - 0.5) * 0.8; out.push({ a, b, ca, k, c: i % 3 }); } return out; })();
  function threadDraw(dt, t) {
    const th = S.thr; th.f = approach(th.f, th.km / 20, dt, 6);
    panel(THP.x, THP.y, THP.w, THP.h, 18, '#fbf9ff');
    T(THP.x + 22, THP.y + 36, '핵 속에 DNA가 어떻게 들어갈까?', L(21, 17), '#4c1d95', 'left', 800);
    textBlock(THP.x + 22, THP.y + 62, THP.w - 44, '사람 세포 하나의 DNA는 펴면 약 2 m, 핵의 지름은 약 6 µm예요. 길이 비율은 약 3.3 × 10⁵ : 1이에요. 크기를 100만 배쯤 맞바꿔 실에 비유해 볼게요.', L(15, 13.5), '#475569', L(21, 19), 700);
    // 공 (핵) 과 실뭉치
    const b = BALL; const by = b.y + (PHONE ? 70 : 20);
    const bgd = ctx.createRadialGradient(b.x - b.r * 0.3, by - b.r * 0.35, 8, b.x, by, b.r); bgd.addColorStop(0, '#efe7fb'); bgd.addColorStop(1, '#d6c4f2');
    ctx.beginPath(); ctx.arc(b.x, by, b.r, 0, TAU); ctx.fillStyle = bgd; ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.arc(b.x, by, b.r - 1, 0, TAU); ctx.clip();
    const N = Math.round(th.f * SCRIB.length);
    ctx.lineWidth = 1.6; ctx.lineCap = 'round';
    for (let i = 0; i < N; i++) { const s = SCRIB[i], rr = b.r + 4; ctx.strokeStyle = ['rgba(109,40,217,.55)', 'rgba(59,130,246,.5)', 'rgba(168,85,247,.5)'][s.c]; ctx.beginPath(); ctx.moveTo(b.x + Math.cos(s.a) * rr, by + Math.sin(s.a) * rr); ctx.quadraticCurveTo(b.x + Math.cos(s.ca) * rr * s.k * 0.5, by + Math.sin(s.ca) * rr * s.k * 0.5, b.x + Math.cos(s.b) * rr, by + Math.sin(s.b) * rr); ctx.stroke(); }
    ctx.restore();
    ctx.beginPath(); ctx.arc(b.x, by, b.r, 0, TAU); ctx.strokeStyle = '#8b5cf6'; ctx.lineWidth = 5; ctx.stroke();
    D.label(b.x, by - b.r - 18, '핵 (지름 6 cm 공에 비유)', { bg: '#ede9fe', color: '#5b21b6', border: '#c4b5fd', size: 13.5 });
    // 남은 실 (오른쪽으로 길게)
    const left = 1 - th.f, x0 = b.x + b.r - 4, xmax = THP.x + THP.w - 30;
    if (!PHONE) {
      const Ltail = (xmax - x0) * left;
      if (Ltail > 2) { ctx.strokeStyle = '#7c3aed'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); for (let k = 0; k <= 60; k++) { const x = x0 + Ltail * k / 60, y = by + Math.sin(k * 0.6 + t * 2) * 6 * Math.min(1, k / 8); if (k) ctx.lineTo(x, y); else ctx.moveTo(x, y); } ctx.stroke(); }
      D.label(x0 + 10, by - 34, '남은 실: ' + (20 - th.km) + ' km', { bg: '#f3e8ff', color: '#6b21a8', border: '#d8b4fe', size: 13.5, align: 'left' });
    } else {
      const Ltail = 150 * left; if (Ltail > 2) { ctx.strokeStyle = '#7c3aed'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); for (let k = 0; k <= 50; k++) { const y = by + b.r - 4 + Ltail * k / 50, x = b.x + Math.sin(k * 0.6 + t * 2) * 7 * Math.min(1, k / 8); if (k) ctx.lineTo(x, y); else ctx.moveTo(x, y); } ctx.stroke(); }
      D.label(b.x, by + b.r + 8 + 150 * left * 0 + 14, '남은 실: ' + (20 - th.km) + ' km', { bg: '#f3e8ff', color: '#6b21a8', border: '#d8b4fe', size: 13.5 });
    }
    // 수치 비교
    const iy = PHONE ? THP.y + 450 : THP.y + 392;
    D.roundRect(THP.x + 20, iy, THP.w - 40, PHONE ? 160 : 132, 14); ctx.fillStyle = '#f4f0ff'; ctx.fill();
    const lines = [['실 길이 (감은 만큼)', (th.km) + ' / 20 km'], ['공 지름', '6 cm'], ['실제 핵 지름 : DNA 길이', '6 µm : 2 m ≈ 1 : 3.3 × 10⁵']];
    lines.forEach((l, i) => { T(THP.x + 38, iy + 34 + i * (PHONE ? 34 : 34), l[0], L(15, 13.5), '#475569', 'left', 700); T(THP.x + THP.w - 38, iy + 34 + i * (PHONE ? 34 : 34), l[1], L(16, 14), '#4c1d95', 'right', 800); });
    if (th.km >= 20) textBlock(THP.x + 38, iy + 34 + 3 * 34 - 4, THP.w - 76, '20 km의 실이 6 cm 공 안에 다 들어갔어요! DNA도 단백질에 감겨 접혀서 핵 속에 들어 있어요.', L(14.5, 13), '#15803d', 19, 800);
  }
  function thrSet(km) { S.thr.km = km; if (km >= 20) S.thr.seen = true; }

  /* ----- 핵산 비교표 ----- */
  const TAB_ROWS = [
    { k: '당', o: ['디옥시리보스', '리보스', '포도당'] },
    { k: '염기', o: ['A · T · G · C', 'A · U · G · C', 'A · T · U · C'] },
    { k: '가닥 수', o: ['보통 이중 가닥', '보통 한 가닥', '세 가닥'] },
    { k: '위치 (진핵세포)', ks: '위치', o: ['핵 (소량은 미토콘드리아 · 엽록체)', '핵과 세포질(리보솜)', '세포막'] },
    { k: '기능', o: ['유전 정보 저장', '유전 정보 전달 · 단백질 합성에 관여', '에너지 저장'] },
  ];
  const TAB = PHONE ? { x: 8, y: 10, w: 464, kw: 64, rh: 92, hh: 44 } : { x: 14, y: 14, w: 772, kw: 128, rh: 78, hh: 52 };
  S.tab = { c: TAB_ROWS.map(() => [0, 1]), pop: TAB_ROWS.map(() => [0, 0]), shake: TAB_ROWS.map(() => 0), bad: TAB_ROWS.map(() => false) };
  function tabInit() { const rr = mulberry(77); S.tab.c = TAB_ROWS.map(() => [1 + Math.floor(rr() * 2), rr() < 0.5 ? 0 : 2]); S.tab.bad = TAB_ROWS.map(() => false); }
  tabInit();
  const tabCW = () => (TAB.w - TAB.kw - 16) / 2;
  function tabCell(p) { for (let i = 0; i < TAB_ROWS.length; i++) for (let c = 0; c < 2; c++) { const x = TAB.x + TAB.kw + 8 + c * tabCW(), y = TAB.y + TAB.hh + i * TAB.rh; if (inRect(p.x, p.y, { x, y, w: tabCW(), h: TAB.rh })) return { i, c }; } return null; }
  function tabDraw(dt, t) {
    const T0 = S.tab, cw = tabCW();
    panel(TAB.x, TAB.y, TAB.w, TAB.hh + TAB.rh * TAB_ROWS.length + 44, 16, '#ffffff');
    D.label(TAB.x + TAB.kw + 8 + cw / 2, TAB.y + TAB.hh / 2 + 2, 'DNA', { bg: '#2563eb', size: 16, pad: 18 }); D.label(TAB.x + TAB.kw + 8 + cw * 1.5, TAB.y + TAB.hh / 2 + 2, 'RNA', { bg: '#9333ea', size: 16, pad: 18 });
    TAB_ROWS.forEach((row, i) => {
      const y = TAB.y + TAB.hh + i * TAB.rh;
      if (i % 2 === 0) { ctx.fillStyle = '#f6faf8'; ctx.fillRect(TAB.x + 2, y, TAB.w - 4, TAB.rh); }
      TF(TAB.x + 10, y + TAB.rh / 2 + 5, PHONE && row.ks ? row.ks : row.k, TAB.kw - 12, 15, 12.5, '#26324a', 'left', 800);
      T0.pop[i] = T0.pop[i].map((q) => approach(q, 0, dt, 7)); T0.shake[i] = Math.max(0, T0.shake[i] - dt * 2.5);
      for (let c = 0; c < 2; c++) {
        const x = TAB.x + TAB.kw + 8 + c * cw + 4, w = cw - 8, h = TAB.rh - 10, idx = T0.c[i][c];
        const sh = T0.bad[i] && T0.shake[i] > 0 && !RM ? Math.sin(t * 60) * 3 * T0.shake[i] : 0;
        ctx.save(); ctx.translate(x + w / 2 + sh, y + 5 + h / 2); const sc = 1 + T0.pop[i][c] * 0.06; ctx.scale(sc, sc);
        D.roundRect(-w / 2, -h / 2, w, h, 12); ctx.fillStyle = T0.bad[i] ? '#fdeceb' : (c ? '#f7efff' : '#eef5ff'); ctx.fill(); ctx.strokeStyle = T0.bad[i] ? '#e2464b' : (c ? '#c4a3f0' : '#9cc3f5'); ctx.lineWidth = 2; ctx.stroke();
        ctx.restore();
        const ls = wrap(row.o[idx], w - 20, PHONE ? 13 : 14.5, 800).slice(0, 3), ly0 = y + 5 + h / 2 - (ls.length - 1) * 9 + 5;
        ls.forEach((l, k) => T(x + w / 2 + sh, ly0 + k * (PHONE ? 17 : 19), l, PHONE ? 13 : 14.5, '#1f2d44', 'center', 800));
        for (let q = 0; q < 3; q++) { ctx.fillStyle = q === idx ? (c ? '#9333ea' : '#2563eb') : '#cbd5e1'; ctx.beginPath(); ctx.arc(x + w - 36 + q * 11, y + TAB.rh - 12, 3.4, 0, TAU); ctx.fill(); }
      }
    });
    T(TAB.x + 12, TAB.y + TAB.hh + TAB.rh * TAB_ROWS.length + 6 + (PHONE ? 22 : 24), '칸을 눌러 알맞은 내용으로 바꿔요', 13.5, '#64748b', 'left', 700);
  }
  const tabPT = {
    down(p) { const c = tabCell(p); if (!c) return false; const T0 = S.tab; T0.c[c.i][c.c] = (T0.c[c.i][c.c] + 1) % 3; T0.pop[c.i][c.c] = 1; T0.bad[c.i] = false; Sound.tick(); return false; },
    hover(p) { return tabCell(p) ? 'pointer' : 'default'; },
  };
  const tabWrong = () => TAB_ROWS.map((r, i) => (S.tab.c[i][0] === 0 && S.tab.c[i][1] === 1 ? -1 : i)).filter((i) => i >= 0);

  /* =========================================================
     화면 전환 · 조작 연결
     ========================================================= */
  function setMode(m) {
    if (S.mode !== m) S.fade = 1;
    S.mode = m;
    PT = { nuc: nucPT, strand: strPT, dna: dnaPT, ratio: null, rna: rnaPT, kinds: kindsPT, cell: cellPT, thread: null, table: tabPT }[m] || null;
    hideHint(); updateCtl();
  }
  const ctlNodes = $$('#ctrlCard .control');
  function updateCtl() {
    const fr = game ? game.free : false, lvNow = game ? game.level : 0;
    ctlNodes.forEach((n) => { n.hidden = (n.dataset.modes || '').split(' ').indexOf(S.mode) < 0; });
    modeButtons(S.mode, lvNow, fr);
    $('#oRatio').textContent = S.ratio.a + ' %';
    const ck = ratioCheck(); $('#inT').classList.toggle('ok', ck.t); $('#inG').classList.toggle('ok', ck.g);
    $('#oThr').textContent = S.thr.km + ' km';
    chipSet($('#toolSel'), S.cell.tool);
    $('#rnaZip').disabled = S.rna.opened; $('#rnaZip').textContent = S.rna.opened ? '✂ DNA가 열렸어요' : '✂ DNA 열기 (두 가닥 풀기)';
    $('#strNote').textContent = S.str.seq.length ? '이어 붙인 뉴클레오타이드: ' + S.str.seq.length + '개' : '만든 뉴클레오타이드를 눌러 오른쪽으로 이어요.';
  }
  bindModeSeg(setMode);
  $('#nucReset').addEventListener('click', () => { Sound.click(); nucReset(); });
  $('#strReset').addEventListener('click', () => { Sound.click(); strReset(); });
  $('#dnaReset').addEventListener('click', () => { Sound.click(); dnaReset(); });
  $('#rnaReset').addEventListener('click', () => { Sound.click(); rnaReset(); });
  $('#rnaZip').addEventListener('click', () => { rnaOpen(); updateCtl(); });
  $('#kindsReset').addEventListener('click', () => { Sound.click(); kinds.reset(); });
  $('#sRatio').addEventListener('input', (e) => { S.ratio.a = +e.target.value; updateCtl(); });
  ['inT', 'inG'].forEach((id) => $('#' + id).addEventListener('input', updateCtl));
  $('#sThr').addEventListener('input', (e) => { thrSet(+e.target.value); updateCtl(); });
  $$('#toolSel button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.cell.tool = b.dataset.v; updateCtl(); }));
  $('#cellReset').addEventListener('click', () => { Sound.click(); S.cell.marks = { dna: {}, rna: {} }; updateCtl(); });
  $('#tabReset').addEventListener('click', () => { Sound.click(); tabInit(); });

  /* =========================================================
     미션
     ========================================================= */
  const levels = [
    {
      title: '뉴클레오타이드', short: '뉴클레오타이드', icon: '🧱', phase: '모형',
      intro: '<p class="si-q">❓ 탐구 질문: DNA와 RNA는 겉모습이 닮았는데 왜 세포는 두 가지를 모두 쓸까?</p><p>🔗 <b>통합과학</b>에서 DNA가 A–T, G–C로 짝을 이룬 이중 나선이라고 배웠어요. 이번에는 핵산을 이루는 <b>뉴클레오타이드</b>를 직접 조립하고, DNA와 RNA를 <b>비교</b>해서 세포에서 하는 일까지 알아봐요.</p><p>💡 화학식 대신 <b>인산(원) · 당(오각형) · 염기(색 블록)</b>으로 나타내요.</p>',
      features: ['nuc', 'strand'],
      setup() { setMode('nuc'); },
      recap: '핵산의 단위체는 뉴클레오타이드(인산 + 당 + 염기)예요. DNA는 디옥시리보스와 A·T·G·C, RNA는 리보스와 A·U·G·C를 쓰고, 뉴클레오타이드가 이어지면 당–인산 뼈대에서 염기가 곁으로 나와요.',
      summary: '<ul><li><b>뉴클레오타이드</b> = <b>인산 + 당 + 염기</b>. 핵산(DNA · RNA)의 단위체예요.</li><li>DNA: 당 <b>디옥시리보스</b>(산소가 하나 적음), 염기 <b>A · T · G · C</b>. RNA: 당 <b>리보스</b>, 염기 <b>A · U · G · C</b>(타이민 대신 <b>유라실</b>).</li><li>같은 핵산에서 뉴클레오타이드끼리 당과 인산이 결합해(물이 빠져나감) <b>당–인산 뼈대</b>가 만들어지고, 염기는 곁으로 튀어나와요.</li><li>뉴클레오타이드 종류는 <b>염기</b>로 달라져요. 당과 인산은 같아요.</li></ul>',
      missions: [
        {
          id: 'build', title: '뉴클레오타이드 조립과 가닥',
          goal: '뉴클레오타이드를 <b>DNA용 4종</b>과 <b>RNA용 4종</b> 조립하고, 한 가닥으로 <b>4개 이상</b> 이어 보세요.',
          hint: '디옥시리보스에는 A · T · G · C, 리보스에는 A · U · G · C를 붙여요. 다 만든 뒤 🔗 가닥 화면에서 뉴클레오타이드를 눌러 이어요.',
          setup() { S.nuc.built = {}; S.nuc.glow = {}; nucReset(); strReset(); setMode('nuc'); },
          check: () => nucCount('deoxy') === 4 && nucCount('ribo') === 4 && S.str.seq.length >= 4, hold: 0.6,
          status: () => mark(nucCount('deoxy') === 4) + ' DNA용 ' + nucCount('deoxy') + '/4 &nbsp; ' + mark(nucCount('ribo') === 4) + ' RNA용 ' + nucCount('ribo') + '/4 &nbsp; ' + mark(S.str.seq.length >= 4) + ' 한 가닥 ' + S.str.seq.length + '개',
          explain: '뉴클레오타이드는 <b>인산 + 당 + 염기</b> 세 부분이에요. DNA는 <b>디옥시리보스</b>에 A · T · G · C, RNA는 <b>리보스</b>에 A · U · G · C가 붙어요. 이어질 때는 앞 뉴클레오타이드의 당과 다음 뉴클레오타이드의 인산이 결합(물이 빠져나감)해 <b>당–인산 뼈대</b>가 되고 염기는 곁으로 나와요.',
        },
        {
          type: 'quiz', title: 'DNA와 RNA를 구분하는 두 가지',
          goal: 'DNA 뉴클레오타이드와 RNA 뉴클레오타이드를 <b>구분하는 두 가지</b>는?',
          setup() { setMode('nuc'); },
          choices: ['인산이 있는지 없는지, 염기 G와 C', '당의 종류(디옥시리보스 · 리보스)와 염기 중 T와 U', '염기 A의 유무와 인산의 개수', '뉴클레오타이드가 아니라 아미노산으로 이루어졌는지'],
          answer: 1,
          feedback: ['둘 다 인산이 있고 G, C를 모두 써요.', '', '둘 다 A를 쓰고 인산이 하나씩 있어요.', '둘 다 핵산이라서 뉴클레오타이드로 이루어져 있어요.'],
          explain: 'DNA의 당은 <b>디옥시리보스</b>, RNA의 당은 <b>리보스</b>이고, 염기는 DNA에 <b>타이민(T)</b>, RNA에 <b>유라실(U)</b>이 쓰여요. 인산과 A · G · C는 두 핵산이 같아요.',
        },
        {
          type: 'quiz', title: '뉴클레오타이드 4종의 차이',
          goal: 'DNA 뉴클레오타이드 4종(A · T · G · C 뉴클레오타이드)을 서로 다르게 만드는 것은?',
          setup() { setMode('nuc'); },
          choices: ['당의 종류', '인산의 개수', '염기의 종류', '당 · 인산 · 염기 모두'],
          answer: 2,
          feedback: ['DNA 뉴클레오타이드는 모두 디옥시리보스예요.', '모두 인산이 하나예요.', '', '당과 인산은 같고 염기만 달라요.'],
          explain: 'DNA 뉴클레오타이드 4종은 <b>염기만 다르고</b> 당(디옥시리보스)과 인산은 같아요. 그래서 염기의 배열 순서가 유전 정보가 돼요.',
        },
      ],
    },
    {
      title: 'DNA 모형', short: 'DNA 모형', icon: '🧬', phase: '모형',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 뉴클레오타이드를 이어 한 가닥을 만들었어요.</div><p>이제 <b>두 가닥</b>을 만들어요. 통합과학에서 배운 염기쌍 규칙(A–T, G–C)으로 상보 가닥을 완성하고, 염기 비율을 계산해 봐요.</p>',
      features: ['dna', 'ratio'],
      setup() { setMode('dna'); },
      recap: '이중 가닥 DNA에서 A–T, G–C로 짝을 이루기 때문에 한 가닥이 정해지면 상보 가닥이 정해지고, A의 비율을 알면 T와 G + C의 비율도 알 수 있어요.',
      summary: '<ul><li>이중 가닥 DNA는 <b>A–T</b>(수소 결합 2개), <b>G–C</b>(수소 결합 3개)로 짝을 이뤄요. 한 가닥 ATGCCGTA의 상보 가닥은 <b>TACGGCAT</b>예요.</li><li>두 가닥은 서로 꼬여 <b>이중 나선</b>이 돼요.</li><li>염기 개수: <b>A = T</b>, <b>G = C</b> (이중 가닥 DNA에서만). 200염기쌍(염기 400개)에서 A가 25 %이면 T 25 % (100개), G + C = 50 %이므로 G = C = 25 % (100개)예요.</li></ul>',
      missions: [
        {
          id: 'dna', title: '상보 가닥 만들기',
          goal: '위 가닥 <b>A T G C C G T A</b>의 짝이 되는 염기를 아래에 8개 모두 놓아 이중 가닥을 완성하세요.',
          hint: 'A는 T, T는 A, G는 C, C는 G와 짝이에요. 염기 블록을 끌거나 눌러요. 틀리면 블록이 튕겨 나가요.',
          setup() { setMode('dna'); dnaReset(); },
          check: () => S.dna.done && S.dna.tw > 0.98, hold: 0.5,
          status: () => mark(dnaFilled() === 8) + ' 상보 염기 ' + dnaFilled() + ' / 8 &nbsp; ' + mark(S.dna.done && S.dna.tw > 0.98) + ' 이중 나선',
          explain: '이중 가닥 DNA에서는 <b>A–T, G–C</b>로 짝을 이뤄서 한 가닥이 정해지면 다른 가닥이 정해져요. 위 가닥 ATGCCGTA의 상보 가닥은 <b>TACGGCAT</b>이에요. 두 가닥은 꼬여서 이중 나선이 돼요.',
        },
        {
          id: 'ratio', title: '염기 비율 계산',
          goal: 'DNA 200염기쌍 조각(염기 400개)에서 A가 <b>25 %</b>일 때, <b>T</b>와 <b>G</b>의 개수를 구해 입력하세요.',
          hint: 'A = T 이니까 T도 25 %예요. 남은 50 %를 G와 C가 똑같이 나눠 가져요. 400개의 25 %는 100개예요.',
          setup() { S.ratio.a = 25; $('#sRatio').value = 25; $('#inT').value = ''; $('#inG').value = ''; setMode('ratio'); },
          check: () => { const c = ratioCheck(); return S.ratio.a === 25 && c.t && c.g; }, hold: 0.5,
          status: () => { const c = ratioCheck(); return mark(S.ratio.a === 25) + ' A = 25 % &nbsp; ' + mark(S.ratio.a === 25 && c.t) + ' T 100개 &nbsp; ' + mark(S.ratio.a === 25 && c.g) + ' G 100개'; },
          explain: '이중 가닥 DNA에서 <b>A = T</b>이므로 T도 25 %(100개)예요. 나머지 G + C = 50 %이고 <b>G = C</b>이므로 G = C = 25 %(100개)예요. 이 규칙은 <b>이중 가닥 DNA</b>에서만 성립해요.',
        },
      ],
    },
    {
      title: 'RNA 모형', short: 'RNA 모형', icon: '📜', phase: '모형',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> DNA의 두 가닥이 A–T, G–C로 짝을 이룬다는 것을 알았어요.</div><p>이제 <b>DNA 한 가닥을 본보기로 RNA를 만들어</b> 봐요. 이것이 <b>전사</b>예요. 만들어진 RNA는 핵 밖으로 나가요. 그리고 RNA의 종류 세 가지와 역할도 알아봐요.</p>',
      features: ['rna', 'kinds'],
      setup() { setMode('rna'); },
      recap: 'RNA는 DNA 한 가닥(주형)에 짝이 맞는 RNA 뉴클레오타이드가 붙어 만들어지고(T 자리에 A, A 자리에 U), 핵공을 지나 세포질로 가요. RNA에는 mRNA · tRNA · rRNA 세 가지가 있어요.',
      summary: '<ul><li><b>전사</b>: DNA 두 가닥이 풀리고, 한 가닥(주형)에 짝이 맞는 RNA 뉴클레오타이드가 붙어 RNA가 만들어져요. 주형 TACGGCAT → mRNA <b>AUGCCGUA</b> (주형의 T→A, A→U, G→C, C→G).</li><li>RNA는 DNA에서 떨어져 나와 <b>핵공</b>을 지나 세포질로 나가요.</li><li><b>mRNA</b>: 유전 정보를 리보솜으로 전달. <b>tRNA</b>: 아미노산을 리보솜으로 운반. <b>rRNA</b>: 리보솜을 이루는 성분.</li><li>RNA는 보통 <b>한 가닥</b>이고 A와 U의 수가 같을 필요가 없어요. (A = T, G = C 규칙은 이중 가닥 DNA에서만)</li></ul>',
      missions: [
        {
          id: 'trans', title: '전사 모형 만들기',
          goal: 'DNA를 열고, 주형 가닥 <b>T A C G G C A T</b>에 짝이 맞는 RNA 염기를 붙여 mRNA를 완성하세요. mRNA가 핵 밖으로 나가는 것까지 지켜봐요.',
          hint: '주형의 T에는 A, A에는 U, G에는 C, C에는 G를 붙여요. RNA에는 T가 없고 U를 써요.',
          setup() { setMode('rna'); rnaReset(); },
          check: () => S.rna.opened && rnaFilled() === 8 && S.rna.done, hold: 0.6,
          status: () => mark(S.rna.opened) + ' DNA 열기 &nbsp; ' + mark(rnaFilled() === 8) + ' mRNA ' + rnaFilled() + ' / 8 &nbsp; ' + mark(S.rna.done) + ' 핵공 통과',
          explain: 'DNA의 한 가닥(주형)에 짝이 맞는 RNA 뉴클레오타이드가 붙어 mRNA <b>AUGCCGUA</b>가 만들어져요. 이때 <b>T 자리에 A</b>, <b>A 자리에는 U</b>가 와요. mRNA는 DNA에서 떨어져 <b>핵공</b>을 지나 세포질의 리보솜으로 가요.',
        },
        {
          id: 'kinds', title: 'RNA 3종과 역할', manual: true,
          goal: '역할 카드를 알맞은 상자에 넣으세요. RNA의 역할이 아닌 카드는 마지막 상자에 넣어요.',
          hint: 'mRNA는 정보 전달, tRNA는 아미노산 운반(클로버 모양), rRNA는 리보솜의 성분이에요. 유전 정보 저장은 DNA, 세포막 뼈대는 인지질이에요.',
          setup() { setMode('kinds'); kinds.reset(); },
          check() {
            if (kinds.placed < 5) { kinds.markBad([]); return '카드를 모두 상자에 넣어 주세요. (' + kinds.placed + ' / 5)'; }
            const w = kindWrong();
            if (!w.length) { kinds.markBad([]); return true; }
            kinds.markBad(w.map((c) => c.id));
            const nm = w[0].label;
            return '\'' + nm + '\' 카드가 들어갈 상자를 다시 생각해 보세요. (mRNA · tRNA · rRNA의 그림과 이름을 보세요)';
          },
          explain: '<b>mRNA</b>는 DNA의 유전 정보를 리보솜으로 전달하고, <b>tRNA</b>는 아미노산을 리보솜으로 운반하며, <b>rRNA</b>는 단백질과 함께 리보솜을 이뤄요. 유전 정보를 저장하는 것은 DNA의 역할이고, 세포막의 뼈대는 인지질이에요.',
        },
        {
          type: 'quiz', title: 'RNA의 특징',
          goal: 'RNA에 대한 설명으로 옳은 것은?',
          setup() { setMode('rna'); },
          choices: ['RNA의 당은 디옥시리보스이다', 'RNA 한 가닥에서는 A와 U의 수가 반드시 같다', 'RNA에는 타이민(T) 대신 유라실(U)이 쓰인다', 'RNA는 보통 두 가닥이 꼬인 이중 나선이다'],
          answer: 2,
          feedback: ['RNA의 당은 리보스예요. 디옥시리보스는 DNA의 당이에요.', 'A = T 같은 짝 규칙은 이중 가닥 DNA의 규칙이에요. 한 가닥인 RNA는 A와 U의 수가 같을 필요가 없어요.', '', 'RNA는 보통 한 가닥이에요.'],
          explain: 'RNA는 당이 <b>리보스</b>, 염기가 <b>A · U · G · C</b>이고 보통 <b>한 가닥</b>이에요. 한 가닥이라 A와 U의 수가 같을 필요가 없어요. (샤가프 규칙 A = T, G = C는 이중 가닥 DNA에만 적용돼요.)',
        },
      ],
    },
    {
      title: '세포 속 역할', short: '세포 속 역할', icon: '🔬', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> DNA를 본보기로 mRNA를 만들고, RNA 세 종류를 알아봤어요.</div><p>이제 핵산이 <b>세포 어디에서 무슨 일</b>을 하는지 정리해요. 세포 그림에 위치를 표시하고, 핵 속에 들어 있는 DNA의 길이를 실에 비유해 보고, DNA와 RNA를 <b>비교표</b>로 정리해요.</p>',
      features: ['cell', 'thread', 'table'],
      setup() { setMode('cell'); },
      recap: 'DNA는 핵(소량은 미토콘드리아 · 엽록체)에서 유전 정보를 저장하고, RNA는 핵에서 만들어져 세포질의 리보솜으로 정보를 전달해요. 유전 정보의 흐름은 DNA → RNA → 단백질이에요.',
      summary: '<ul><li><b>DNA</b>: 유전 정보를 <b>저장</b>. 진핵세포의 핵에 있고 소량이 미토콘드리아 · 엽록체에도 있어요. 사람 세포 하나의 DNA는 약 2 m이고 핵 지름은 약 6 µm라서 단백질에 감겨 접혀 있어요.</li><li><b>RNA</b>: DNA의 정보를 <b>전달 · 발현</b>. 핵에서 만들어져 세포질의 리보솜으로 가요 (mRNA · tRNA · rRNA).</li><li>유전 정보의 흐름: <b>DNA → RNA → 단백질</b>.</li><li>비교: DNA(디옥시리보스 · A T G C · 보통 이중 가닥) / RNA(리보스 · A U G C · 보통 한 가닥).</li></ul>',
      missions: [
        {
          id: 'cell', title: '위치 찾기와 실 감기',
          goal: '세포 그림에서 <b>DNA</b>(핵 · 미토콘드리아 · 엽록체)와 <b>RNA</b>(핵 · 세포질)가 있는 곳을 표시하고, 🧵 실 감기를 끝까지 감아 보세요.',
          hint: '위의 도구로 DNA 표시 / RNA 표시를 바꿔가며 세포 그림을 눌러요. 실 감기 슬라이더를 20 km까지 올려요.',
          setup() { S.cell.marks = { dna: {}, rna: {} }; S.thr.km = 0; S.thr.f = 0; S.thr.seen = false; $('#sThr').value = 0; setMode('cell'); },
          check: () => { const o = cellOk(); return o.dna && o.rna && S.thr.seen; }, hold: 0.6,
          status: () => { const o = cellOk(), d = S.cell.marks.dna, r = S.cell.marks.rna; return mark(o.dna) + ' DNA ' + [d.nuc, d.mi1 || d.mi2, d.ch1 || d.ch2].filter(Boolean).length + '/3곳 &nbsp; ' + mark(o.rna) + ' RNA ' + [r.nuc, r.cyto].filter(Boolean).length + '/2곳 &nbsp; ' + mark(S.thr.seen) + ' 실 감기'; },
          explain: 'DNA는 <b>핵</b>과 소량이 <b>미토콘드리아 · 엽록체</b>에 있어요. RNA는 <b>핵에서 만들어져</b> 세포질의 <b>리보솜</b>으로 가서 일해요. 핵 속 DNA는 약 2 m인데 핵 지름은 약 6 µm라서, 지름 6 cm 공에 실 20 km를 감는 것처럼 단단히 감겨 접혀 있어요.',
        },
        {
          id: 'table', title: 'DNA와 RNA 비교표', manual: true,
          goal: '표의 칸을 눌러 <b>DNA</b>와 <b>RNA</b>에 알맞은 내용으로 맞추세요. (당 · 염기 · 가닥 수 · 위치 · 기능)',
          hint: 'DNA는 디옥시리보스와 A T G C, 보통 이중 가닥이며 유전 정보를 저장해요. RNA는 리보스와 A U G C, 보통 한 가닥이며 정보를 전달해요.',
          setup() { setMode('table'); tabInit(); },
          check() {
            const w = tabWrong();
            if (!w.length) { S.tab.bad = S.tab.bad.map(() => false); return true; }
            w.forEach((i) => { if (!S.tab.bad[i]) { S.tab.bad[i] = true; S.tab.shake[i] = 1; } });
            return '\'' + TAB_ROWS[w[0]].k + '\' 줄이 맞지 않아요. DNA와 RNA의 내용을 다시 비교해 보세요.';
          },
          explain: 'DNA는 <b>디옥시리보스 · A T G C · 보통 이중 가닥</b>이고 핵에서 유전 정보를 저장해요. RNA는 <b>리보스 · A U G C · 보통 한 가닥</b>이고 핵에서 만들어져 세포질에서 정보를 전달하고 단백질 합성에 관여해요.',
        },
        {
          type: 'quiz', title: '핵산의 역할',
          goal: '핵산에 대한 설명으로 옳은 것은?',
          setup() { setMode('cell'); },
          choices: ['RNA는 핵 안에서 DNA의 정보를 옮겨 적어 만들어지고, 세포질의 리보솜으로 전달된다', '핵이 없는 세포에는 DNA가 없다', '미토콘드리아의 DNA는 핵의 DNA와 달리 A · T · G · C를 쓰지 않는다', 'DNA는 세포질의 리보솜에서 단백질을 직접 만든다'],
          answer: 0,
          feedback: ['', '핵이 없는 원핵세포에도 DNA가 있어요. 모든 세포에서 유전 물질은 DNA예요.', '미토콘드리아 DNA도 같은 염기 A · T · G · C를 써요.', 'DNA는 핵에 있어요. 리보솜에서 단백질 합성에는 DNA의 정보를 옮긴 mRNA가 쓰여요.'],
          explain: 'DNA의 정보를 <b>RNA</b>가 옮겨 적어(전사) 세포질의 <b>리보솜</b>으로 전달하고, 거기서 단백질이 합성돼요. 핵이 없는 원핵세포를 포함해 <b>모든 세포</b>의 유전 물질은 DNA예요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hy-nucleic-acid', mount: '#game', badge: '핵산 모형 제작자', homeHref: '../../index.html#hy',
    featureLabels: { nuc: '🧱 뉴클레오타이드 조립대', strand: '🔗 한 가닥 만들기', dna: '🧬 DNA 상보 가닥', ratio: '🧮 염기 비율 계산', rna: '✂️ 전사 모형', kinds: '🗂 RNA 3종', cell: '🔬 세포 속 위치', thread: '🧵 실 감기', table: '📋 DNA · RNA 비교표' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 읽음 칸 ---------- */
  function readouts() {
    const m = S.mode;
    if (m === 'nuc') setReads(['만든 뉴클레오타이드', Object.keys(S.nuc.built).length + ' / 8', 'DNA용', nucCount('deoxy') + ' / 4', 'RNA용', nucCount('ribo') + ' / 4']);
    else if (m === 'strand') { const s = S.str.seq; setReads(['이어 붙인 개수', s.length + '개', '가닥 종류', s.length ? (s[0].indexOf('deoxy') === 0 ? 'DNA' : 'RNA') : '—', '염기 서열', s.length ? s.map((q) => q.split('-')[1]).join(' ') : '—']); }
    else if (m === 'dna') setReads(['놓은 상보 염기', dnaFilled() + ' / 8', '틀린 시도', S.dna.wrong + '번', '모양', S.dna.done ? '이중 나선' : '사다리 모양']);
    else if (m === 'ratio') { const e = rExp(), c = ratioCheck(); setReads(['A의 비율', S.ratio.a + ' % (' + rNA() + '개)', 'T의 개수', c.t ? e.t + '개' : '?', 'G의 개수', c.g ? e.g + '개' : '?']); }
    else if (m === 'rna') setReads(['DNA 상태', S.rna.opened ? '두 가닥이 풀렸어요' : '닫혀 있어요', '붙인 RNA 염기', rnaFilled() + ' / 8', 'mRNA 위치', S.rna.done ? '세포질 (리보솜)' : S.rna.stage >= 1 ? '이동 중' : '핵 속']);
    else if (m === 'kinds') setReads(['놓은 카드', kinds.placed + ' / 5', '남은 카드', (5 - kinds.placed) + '장', 'RNA 종류', '3가지']);
    else if (m === 'cell') { const d = Object.keys(S.cell.marks.dna).length, r = Object.keys(S.cell.marks.rna).length; setReads(['고른 도구', S.cell.tool === 'dna' ? 'DNA 표시' : 'RNA 표시', 'DNA 표시한 곳', d + '곳', 'RNA 표시한 곳', r + '곳']); }
    else if (m === 'thread') setReads(['감은 실', S.thr.km + ' / 20 km', '공 지름', '6 cm', '실제 비율', '1 : 3.3 × 10⁵']);
    else setReads(['맞는 줄', TAB_ROWS.length - tabWrong().length + ' / 5', '줄 수', '5줄', '비교 대상', 'DNA와 RNA']);
  }

  /* ---------- 시작 ---------- */
  nucReset(); S.nuc.built = {};
  setMode('nuc');
  let lastFree = false, lastLv = -1;
  SciSim.loop((dt, t) => {
    clock = t; S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (game && game.level !== lastLv) { lastLv = game.level; updateCtl(); }
    view.apply(); FX.update(dt); ctx.clearRect(0, 0, VW, VH);
    nucUpdate(dt); rnaUpdate(dt);
    switch (S.mode) {
      case 'nuc': bgFill('#eef4f2', '#e3ece8'); nucDraw(dt, t); break;
      case 'strand': bgFill('#eef4f2', '#e3ece8'); strDraw(dt, t); break;
      case 'dna': bgFill('#eef4f2', '#e3ece8'); dnaDraw(dt, t); break;
      case 'ratio': bgFill('#eef4f2', '#e3ece8'); ratioDraw(dt, t); break;
      case 'rna': bgFill('#eef4f2', '#e3ece8'); rnaDraw(dt, t); break;
      case 'kinds': bgFill('#eef4f2', '#e3ece8'); kindsDraw(dt, t); break;
      case 'cell': bgFill('#eef4f2', '#e3ece8'); cellDraw(dt, t); break;
      case 'thread': bgFill('#eef4f2', '#e3ece8'); threadDraw(dt, t); break;
      case 'table': bgFill('#eef4f2', '#e3ece8'); tabDraw(dt, t); break;
    }
    FX.draw(); parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(241,246,243,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, PHONE, get game() { return game; }, levels, setMode, SL, TRAY_IT, NUC_IDS, ASM, COLP, STRT, strCard, strAdd, nucReset, strReset, nucCount, colRect,
    dCol, dnaPlace, dnaReset, dnaFilled, TMPL, DNA_TRAY, DP, D_MID, D_BOT, ratioCheck, rExp,
    rX, rnaPlace, rnaOpen, rnaReset, rnaFilled, MRNA, TEMPL, RNA_TRAY, R_YR, kinds, kindBoxes, KIND_CARDS, kindWrong,
    ORGS, cx2, cy2, cellTap, cellOk, thrSet, TAB, tabCell, tabCW, TAB_ROWS, tabWrong, updateCtl,
  };
})();
