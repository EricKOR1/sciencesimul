(function () {
  'use strict';
  const { $, $$, clamp, Sound, toast } = SciSim;

  /* ---------- 상수 · 도우미 ---------- */
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const RM = SciSim.reduceMotion;
  const TAU = Math.PI * 2;
  const mark = (b) => (b ? '✅' : '⬜');
  const smooth = (x) => { const t = clamp(x, 0, 1); return t * t * (3 - 2 * t); };
  const lerp = (a, b, t) => a + (b - a) * t;
  const comma = (n) => String(Math.round(n)).replace(/(\d)(?=(\d{3})+$)/g, '$1,');
  const approach = (cur, tgt, dt, rate) => (RM ? tgt : SciSim.approach(cur, tgt, dt, rate));
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const shuffle = (a) => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
  // 받침 유무에 따라 조사 고르기: josa('사과', '이/가') -> '가'
  const josa = (word, pair) => {
    const s = String(word); const ch = s.charCodeAt(s.length - 1);
    const has = ch >= 0xac00 && ch <= 0xd7a3 && (ch - 0xac00) % 28 !== 0;
    const [a, b] = pair.split('/');
    return has ? a : b;
  };

  let view, ctx, D, VW, VH, FS;
  const parts = new SciSim.Particles();
  function initStage(bg, tw, th, pw, ph) {
    VW = PHONE ? pw : tw; VH = PHONE ? ph : th; FS = PHONE ? 1.15 : 1;
    view = SciSim.stage($('#cv'), { width: VW, height: VH, background: bg });
    ctx = view.ctx; D = SciSim.draw(ctx);
    const f0 = D.font; D.font = (n, w) => f0(Math.round(n * FS * 10) / 10, w);
  }
  const rr = (x, y, w, h, r) => { D.roundRect(x, y, w, h, r); return ctx; };
  const shade = (c, a) => SciSim.color.shade(c, a);
  const rgba = (c, a) => SciSim.color.rgba(c, a);
  const mixc = (a, b, t) => SciSim.color.mix(a, b, clamp(t, 0, 1));
  const TX = (x, y, s, o) => D.text(x, y, s, o);

  /* 글자 줄바꿈 (한국어: 공백 단위, 너무 긴 단어는 글자 단위) */
  function wrapLines(text, maxW, size, weight) {
    ctx.save(); ctx.font = D.font(size, weight || 700);
    const out = []; let line = '';
    String(text).split('\n').forEach((para, pi) => {
      if (pi > 0) { out.push(line); line = ''; }
      para.split(' ').forEach((w) => {
        const cand = line ? line + ' ' + w : w;
        if (ctx.measureText(cand).width <= maxW) { line = cand; return; }
        if (line) { out.push(line); line = ''; }
        if (ctx.measureText(w).width <= maxW) { line = w; return; }
        let cur = '';
        for (const ch of w) { if (ctx.measureText(cur + ch).width > maxW) { out.push(cur); cur = ch; } else cur += ch; }
        line = cur;
      });
    });
    out.push(line); ctx.restore();
    return out;
  }
  /* 줄바꿈해서 그리기: 반환 = 마지막 줄의 y */
  function drawWrap(x, y, text, maxW, size, o) {
    o = o || {};
    const lines = wrapLines(text, maxW, size, o.weight), lh = size * FS * (o.lh || 1.3);
    lines.forEach((l, i) => D.text(x, y + i * lh, l, { size, weight: o.weight || 700, color: o.color || '#334155', align: o.align || 'center', alpha: o.alpha }));
    return y + (lines.length - 1) * lh;
  }
  const wrapH = (text, maxW, size, o) => wrapLines(text, maxW, size, o && o.weight).length * size * FS * ((o && o.lh) || 1.3);

  /* 알약 라벨 · 캡션 · NEW 표시 · 예시 자료 표시 */
  function pill(x, y, text, o) { return D.label(x, y, text, Object.assign({ bg: 'rgba(255,255,255,.94)', color: '#1b2333', border: '#cbd5e1', size: 13 }, o || {})); }
  function caption(text) { pill(14, 26, text, { bg: 'rgba(30,41,59,.86)', color: '#fff', border: null, size: 14.5, pad: 12, align: 'left' }); }
  function exampleTag(x, y, text) { pill(x, y, text || '※ 교육용 예시 자료', { bg: '#fff7ed', color: '#9a3412', border: '#fdba74', size: 12.5, weight: 800, align: 'right' }); }
  function glossBar(x, y, w, h, frac, col, o) {
    o = o || {};
    ctx.save(); ctx.fillStyle = o.track || '#e2e8f0'; rr(x, y, w, h, h / 2).fill();
    const fw = clamp(frac, 0, 1) * w;
    if (fw > 0.5) {
      const ww = Math.max(fw, 0); ctx.save(); rr(x, y, w, h, h / 2).clip();
      const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, shade(col, 0.25)); g.addColorStop(1, col);
      ctx.fillStyle = g; ctx.fillRect(x, y, ww, h);
      ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.fillRect(x, y + 1, ww, h * 0.35);
      ctx.restore();
    }
    ctx.restore();
  }

  /* 무대 위 안내 말풍선 (HTML) */
  let hintTimer = 0;
  function showHint(text, ms) {
    const h = $('#stageHint'); if (!h) return;
    h.textContent = text; h.classList.remove('hide');
    clearTimeout(hintTimer);
    if (ms) hintTimer = setTimeout(() => h.classList.add('hide'), ms);
  }
  function hideHint() { clearTimeout(hintTimer); const h = $('#stageHint'); if (h) h.classList.add('hide'); }

  /* 아래 판독값 세 칸 */
  const roCache = [];
  function readouts(list) {
    list.forEach((r, i) => {
      const key = r[0] + '|' + r[1];
      if (roCache[i] === key) return;
      roCache[i] = key;
      const l = $('#l' + (i + 1)), v = $('#v' + (i + 1));
      if (l) l.textContent = r[0];
      if (v) v.innerHTML = r[1];
    });
  }

  /* ======================================================
     끌어 놓기 판 (카드와 칸) — 놓는 위치는 포인터 위치로 판단
     ====================================================== */
  class Board {
    constructor(opts) { this.items = []; this.slots = []; this.drag = null; this.sel = null; this.ver = 0; this.o = opts || {}; this.down0 = null; }
    reset() { this.items.length = 0; this.slots.length = 0; this.drag = null; this.sel = null; this.ver++; }
    addSlot(o) { const s = Object.assign({ items: [], cap: 1, cols: 1, top: 0, pad: 8 }, o); this.slots.push(s); return s; }
    addItem(o) {
      const c = Object.assign({ lift: 0, shake: 0, slot: null, free: false, sc: 1, tsc: 1, bad: false, ok: false, pop: 0 }, o);
      c.x = c.tx = c.hx; c.y = c.ty = c.hy; this.items.push(c); return c;
    }
    pick(p) {
      for (let i = this.items.length - 1; i >= 0; i--) {
        const c = this.items[i], w = c.w * c.sc, h = c.h * c.sc;
        if (Math.abs(p.x - c.x) <= w / 2 + 2 && Math.abs(p.y - c.y) <= h / 2 + 2) return c;
      }
      return null;
    }
    slotAtPoint(p) {
      let best = null, bd = 1e9;
      this.slots.forEach((s) => {
        if (p.x >= s.x - s.w / 2 - 4 && p.x <= s.x + s.w / 2 + 4 && p.y >= s.y - s.h / 2 - 4 && p.y <= s.y + s.h / 2 + 4) {
          const d = Math.abs(p.x - s.x) / s.w + Math.abs(p.y - s.y) / s.h; if (d < bd) { bd = d; best = s; }
        }
      });
      return best;
    }
    start(c, p) {
      this.drag = { c, ox: p.x - c.x, oy: p.y - c.y, sx: p.x, sy: p.y, moved: false, prev: c.slot, pi: c.slot ? c.slot.items.indexOf(c) : -1 };
      if (c.slot) { const s = c.slot; s.items.splice(s.items.indexOf(c), 1); c.slot = null; this.layout(s); }
      const i = this.items.indexOf(c); if (i >= 0) { this.items.splice(i, 1); this.items.push(c); }
      c.free = true; c.tsc = 1; SciSim.tween(c, { lift: 1 }, { duration: 0.12 }); Sound.click(); this.ver++;
    }
    move(p) {
      const d = this.drag; if (!d) return;
      if (Math.hypot(p.x - d.sx, p.y - d.sy) > 7) d.moved = true;
      d.c.x = p.x - d.ox; d.c.y = p.y - d.oy;
    }
    layout(s) {
      s.items.forEach((c, i) => {
        c.free = false; c.tsc = s.isc || 1;
        if (s.cap === 1) { c.tx = s.x + (s.ix || 0); c.ty = s.y + (s.iy || 0); }
        else {
          const cols = s.cols, col = i % cols, row = Math.floor(i / cols), gw = s.gw || (s.w - s.pad * 2) / cols, gh = s.gh || 40;
          c.tx = s.x - s.w / 2 + s.pad + gw * (col + 0.5); c.ty = s.y - s.h / 2 + s.top + gh * (row + 0.5);
        }
      });
    }
    sendHome(c) { c.free = false; c.tsc = 1; c.tx = c.hx; c.ty = c.hy; c.bad = false; }
    place(c, s) {
      if (c.slot) { c.slot.items.splice(c.slot.items.indexOf(c), 1); const o = c.slot; c.slot = null; this.layout(o); }
      if (s.cap === 1 && s.items.length) { const o = s.items[0]; s.items.length = 0; o.slot = null; this.sendHome(o); }
      s.items.push(c); c.slot = s; c.bad = false; this.layout(s); this.ver++;
      this.o.onChange && this.o.onChange(c, s);
    }
    up(p) {
      const d = this.drag; if (!d) return null; this.drag = null;
      const c = d.c; SciSim.tween(c, { lift: 0 }, { duration: 0.2 });
      if (!d.moved) { // 눌렀다 뗐을 뿐: 선택(탭) — 카드를 먼저 누르고 칸을 누르는 방식도 가능
        if (d.prev) { d.prev.items.splice(Math.max(0, d.pi), 0, c); c.slot = d.prev; this.layout(d.prev); } else this.sendHome(c);
        this.sel = this.sel === c ? null : c; Sound.tick(); this.ver++;
        this.o.onTap && this.o.onTap(c); return null;
      }
      const s = this.slotAtPoint(p);
      if (s && (s.cap === 1 || s.items.length < s.cap) && (!s.accept || s.accept(c))) { this.place(c, s); Sound.tick(); this.sel = null; }
      else { this.sendHome(c); if (s) c.shake = 0.4; this.ver++; this.o.onChange && this.o.onChange(c, null); }
      return s;
    }
    // 포인터 연결용
    onDown(p) {
      const c = this.pick(p);
      if (c) { this.start(c, p); return true; }
      if (this.sel) {
        const s = this.slotAtPoint(p);
        if (s && (s.cap === 1 || s.items.length < s.cap) && (!s.accept || s.accept(this.sel))) { const c2 = this.sel; this.sel = null; this.place(c2, s); Sound.tick(); return false; }
        this.sel = null; this.ver++;
      }
      return false;
    }
    step(dt) {
      this.items.forEach((c) => {
        if (c.shake > 0) c.shake = Math.max(0, c.shake - dt);
        c.pop = Math.max(0, c.pop - dt * 2.5);
        if (RM) c.sc = c.tsc; else c.sc = SciSim.approach(c.sc, c.tsc, dt, 14);
        if (c.free) return;
        if (RM) { c.x = c.tx; c.y = c.ty; } else { c.x = SciSim.approach(c.x, c.tx, dt, 14); c.y = SciSim.approach(c.y, c.ty, dt, 14); }
      });
    }
    placed() { return this.items.filter((c) => c.slot).length; }
    home() { this.items.forEach((c) => { if (c.slot) { c.slot.items.splice(c.slot.items.indexOf(c), 1); c.slot = null; } this.sendHome(c); c.x = c.hx; c.y = c.hy; }); this.slots.forEach((s) => { s.items.length = 0; }); this.drag = null; this.sel = null; this.ver++; }
    // 카드 한 장 그리기
    drawItem(c, o) {
      o = o || {};
      const lift = c.lift || 0, sc = c.sc * (1 + lift * 0.07 + c.pop * 0.12), sh = c.shake > 0 ? Math.sin(c.shake * 40) * 5 * Math.min(1, c.shake * 3) : 0;
      ctx.save(); ctx.translate(c.x + sh, c.y); ctx.scale(sc, sc);
      D.shadow(() => { ctx.fillStyle = c.fill || '#fff'; rr(-c.w / 2, -c.h / 2, c.w, c.h, 11).fill(); }, { blur: 5 + lift * 14, y: 2 + lift * 7, color: 'rgba(15,23,42,' + (0.26 + lift * 0.12) + ')' });
      const selected = this.sel === c;
      ctx.strokeStyle = c.bad ? '#e2464b' : (c.ok ? '#16a34a' : (selected ? '#f59e0b' : (c.stroke || '#94a3b8'))); ctx.lineWidth = c.bad || c.ok || selected ? 3 : 2;
      rr(-c.w / 2, -c.h / 2, c.w, c.h, 11).stroke();
      if (c.paint) c.paint(c);
      else {
        const lines = wrapLines(c.label, c.w - 12, c.size || 14, 800), lh = (c.size || 14) * FS * 1.22;
        const y0 = -((lines.length - 1) * lh) / 2 + (c.size || 14) * 0.35 * FS;
        lines.forEach((l, i) => TX(0, y0 + i * lh, l, { size: c.size || 14, color: c.color || '#1b2333', weight: 800 }));
      }
      ctx.restore();
    }
  }
  function drawSlot(s, o) {
    o = o || {};
    const a = o.hover || 0;
    ctx.save();
    ctx.fillStyle = rgba(s.color || '#94a3b8', 0.12 + 0.12 * a); rr(s.x - s.w / 2, s.y - s.h / 2, s.w, s.h, 12).fill();
    ctx.strokeStyle = rgba(s.color || '#94a3b8', 0.75); ctx.lineWidth = 2; ctx.setLineDash([7, 5]); rr(s.x - s.w / 2, s.y - s.h / 2, s.w, s.h, 12).stroke(); ctx.setLineDash([]);
    if (s.label) TX(s.x, s.y - s.h / 2 + 19 * FS, s.label, { size: s.lsize || 14, weight: 800, color: shade(s.color || '#64748b', -0.35) });
    if (s.sub) TX(s.x, s.y - s.h / 2 + 35 * FS, s.sub, { size: 11.5, weight: 700, color: '#64748b' });
    ctx.restore();
  }
  // 보드를 캔버스 포인터에 연결
  function bindBoard(getBoard, enabled) {
    SciSim.pointer(view, {
      down(p) { const b = getBoard(); if (!b || (enabled && !enabled())) return false; return b.onDown(p); },
      move(p) { const b = getBoard(); b && b.move(p); },
      up(p) { const b = getBoard(); b && b.up(p); },
    });
  }

  /* 정답 확인 순간의 효과 */
  const flash = { t: -9, x: 0, y: 0 };
  function okBurst(x, y, o) { parts.burst(x, y, Object.assign({ count: 26, speed: 200 }, o || {})); }
  function snapTween(obj, to, ms) { return SciSim.tween(obj, to, { duration: ms || 0.4, ease: 'outBack' }); }

  initStage('#f1f6f2', 800, 560, 600, 840);
  const SUBJ = '#16a34a';
  const chk = (ok, label) => mark(ok) + ' ' + label;
  const f2 = (n) => n.toFixed(2);

  /* =========================================================
     자료 (가상 병원체 · 교육용 모형)
     ========================================================= */
  const BASECOL = { A: '#16a34a', T: '#e11d48', G: '#f59e0b', C: '#2563eb' };
  const PATH = {
    A: { id: 'A', name: '병원체 A', kind: '바이러스', col: '#14b8a6', shape: 'circle', shapeName: '동그란 머리', seq: 'ATGGCTAAGCTTGACCTGAA' },
    B: { id: 'B', name: '병원체 B', kind: '바이러스', col: '#a855f7', shape: 'tri', shapeName: '세모 머리', seq: 'ATGCCATTGACGGATCCTAA' },
    C: { id: 'C', name: '병원체 C', kind: '세균', col: '#f59e0b', shape: 'square', shapeName: '네모 머리', seq: 'ATGAAGGTCTCAGGTTACGA' },
  };
  const PKEYS = ['A', 'B', 'C'];
  const SHAPE_SYM = { circle: '●', tri: '▲', square: '■' };
  const FRAG_LEN = 8;
  // 단서 조각: 한 병원체의 서열에만 들어 있는 8글자
  function pickClue() {
    for (let tries = 0; tries < 200; tries++) {
      const t = PKEYS[Math.floor(Math.random() * 3)], s = 2 + Math.floor(Math.random() * (PATH[t].seq.length - FRAG_LEN - 3));
      const frag = PATH[t].seq.substr(s, FRAG_LEN);
      if (PKEYS.every((k) => k === t || PATH[k].seq.indexOf(frag) < 0)) return { target: t, start: s, frag };
    }
    return { target: 'A', start: 8, frag: PATH.A.seq.substr(8, FRAG_LEN) };
  }

  /* PCR 모형 (상대 단위) */
  const TC = Math.pow(2, 30);                      // 기준선(형광 50 %)을 넘는 목표 DNA 양
  const MAXC = 40;                                   // 최대 사이클
  const SAMPLE_ROLES = [
    { path: 'A', n0: 1024, desc: '병원체 A 많음' },
    { path: 'A', n0: 1, desc: '병원체 A 적음' },
    { path: null, n0: 0, desc: '병원체 없음' },
    { path: 'B', n0: 1024, desc: '병원체 B 많음' },
  ];
  const copiesAt = (s, n, primer) => (s.path && s.path === primer ? s.n0 * Math.pow(2, n) : 0);
  const fluoOf = (c) => (c <= 0 ? 0 : 100 * c / (c + TC));
  function ctOf(s, primer) {
    if (!s.path || s.path !== primer) return null;
    for (let n = 0; n <= MAXC; n++) if (copiesAt(s, n, primer) >= TC) return n;
    return null;
  }
  const CT_HI = ctOf({ path: 'A', n0: 1024 }, 'A'), CT_LO = ctOf({ path: 'A', n0: 1 }, 'A');
  function bigKo(x) {
    if (x < 10000) return comma(x);
    const U = [[1e12, '조'], [1e8, '억'], [1e4, '만']];
    for (const [u, nm] of U) if (x >= u) { const v = x / u, k = Math.pow(10, Math.floor(Math.log10(v))); return Math.round(v / k) * k + nm; }
    return comma(x);
  }
  const foldLabel = (n) => '×' + (n <= 13 ? comma(Math.pow(2, n)) : '약 ' + bigKo(Math.pow(2, n)));
  const SAMPLE_COL = ['#ef4444', '#f59e0b', '#64748b', '#8b5cf6'];

  /* 항원 검사 모형 */
  const RAPID_MIN = 15;                               // 실제 약 15분을 화면에서는 약 7초로 보여 줘요
  const RAPID_SEC = 7;

  /* 상태 */
  let game = null;
  let F = new Set();
  const free = () => !!(game && game.free);
  const hasF = (f) => F.has(f) || free();
  const isNewF = (f) => !!(game && game.isNew(f));
  const S = { mode: 'path', t: 0, fade: 0, ph: '', okAt: -9 };
  const PA = { sel: null, viewed: new Set(), rot: { A: 0, B: 0, C: 0 }, clue: pickClue(), reveal: false, hover: null, selT: -9, wrongShake: 0 };
  const PC = { primer: 'A', n: 0, queue: 0, u: -1, fast: false, temp: 25, sel: 1, judge: [null, null, null, null], roles: shuffle([0, 1, 2, 3]), revealed: false, bump: 0, anim: [0, 0, 0, 0] };
  const sampleOf = (i) => { const r = SAMPLE_ROLES[PC.roles[i]]; return { idx: i, name: '환자 ' + (i + 1), path: r.path, n0: r.n0, desc: r.desc, col: SAMPLE_COL[i] }; };
  const RP = { truth: shuffle(['pos', 'pos', 'neg', 'inv']), sel: 0, run: null, rec: [null, null, null, null], judge: [null, null, null, null] };
  const CM = { sub: 'table', tableBoard: null, caseBoard: null };

  /* =========================================================
     공통 그리기
     ========================================================= */
  function newTag() {
    const x = 12, y = 8, a = 0.5 + 0.5 * Math.sin(S.t * 6);
    ctx.save(); ctx.fillStyle = '#ef4444'; rr(x, y, 46, 20, 10).fill();
    ctx.globalAlpha = 0.35 + a * 0.4; ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 3; rr(x - 3, y - 3, 52, 26, 13).stroke();
    ctx.globalAlpha = 1; ctx.fillStyle = '#fff'; ctx.font = D.font(12, 800); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('NEW', x + 23, y + 11); ctx.restore();
  }
  function panel(x, y, w, h, o) {
    o = o || {};
    ctx.save(); D.shadow(() => { ctx.fillStyle = o.fill || '#fff'; rr(x, y, w, h, o.r || 14).fill(); }, { blur: 8, y: 2, color: 'rgba(15,23,42,.14)' });
    if (o.stroke) { ctx.strokeStyle = o.stroke; ctx.lineWidth = o.lw || 2.5; rr(x, y, w, h, o.r || 14).stroke(); }
    ctx.restore();
  }
  function modelTag() { exampleTag(VW - 12, PHONE ? 52 : 26, '가상 병원체 · 교육용 모형'); }
  function shapeIcon(x, y, shape, r, col) {
    ctx.save(); ctx.fillStyle = col; ctx.beginPath();
    if (shape === 'circle') ctx.arc(x, y, r, 0, TAU);
    else if (shape === 'tri') { ctx.moveTo(x, y - r * 1.1); ctx.lineTo(x + r * 1.05, y + r * 0.8); ctx.lineTo(x - r * 1.05, y + r * 0.8); ctx.closePath(); }
    else { ctx.rect(x - r * 0.9, y - r * 0.9, r * 1.8, r * 1.8); }
    ctx.fill(); ctx.restore();
  }
  function baseChip(x, y, ch, w, h, o) {
    o = o || {};
    ctx.save(); ctx.globalAlpha = o.alpha == null ? 1 : o.alpha;
    const c = BASECOL[ch] || '#64748b';
    ctx.fillStyle = o.dim ? rgba(c, 0.18) : c; rr(x - w / 2, y - h / 2, w, h, 6).fill();
    if (o.outline) { ctx.strokeStyle = o.outline; ctx.lineWidth = 3; rr(x - w / 2 - 1.5, y - h / 2 - 1.5, w + 3, h + 3, 7).stroke(); }
    TX(x, y + h * 0.18, ch, { size: h * 0.62 / FS, weight: 800, color: o.dim ? '#475569' : '#fff' });
    ctx.restore();
  }

  /* =========================================================
     ① 병원체 모형: 돌려 보고, 염기 서열 · 표면 단백질 살펴보기
     ========================================================= */
  const PL = PHONE
    ? { clue: { x: 10, y: 80, w: 580, h: 112 }, cy: 276, r: 56, xs: [100, 300, 500], nameY: 376, det: { x: 10, y: 410, w: 580, h: 418 }, seqCols: 10, seqW: 46, seqH: 46 }
    : { clue: { x: 20, y: 52, w: 760, h: 68 }, cy: 194, r: 54, xs: [150, 400, 650], nameY: 292, det: { x: 20, y: 326, w: 760, h: 224 }, seqCols: 20, seqW: 31, seqH: 36 };
  function pathPos(k) { return { x: PL.xs[PKEYS.indexOf(k)], y: PL.cy }; }

  function drawSpikeHead(x, y, shape, s, col, a) {
    ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = col;
    if (shape === 'circle') { ctx.beginPath(); ctx.arc(x, y, s, 0, TAU); ctx.fill(); }
    else if (shape === 'tri') { ctx.beginPath(); ctx.moveTo(x, y - s * 1.2); ctx.lineTo(x + s * 1.1, y + s * 0.85); ctx.lineTo(x - s * 1.1, y + s * 0.85); ctx.closePath(); ctx.fill(); }
    else { ctx.fillRect(x - s, y - s, s * 2, s * 2); }
    ctx.restore();
  }
  const FIB = []; for (let i = 0; i < 30; i++) { const y = 1 - (i + 0.5) / 15, r0 = Math.sqrt(Math.max(0, 1 - y * y)), th = i * 2.399963; FIB.push([Math.cos(th) * r0, y, Math.sin(th) * r0]); }

  function drawPathogen(k, t, selected, hover) {
    const P = PATH[k], pos = pathPos(k), R = PL.r, rot = PA.rot[k];
    ctx.save(); ctx.translate(pos.x, pos.y);
    // 받침 그림자 · 선택 고리
    if (selected) { ctx.strokeStyle = rgba(P.col, 0.85); ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 0, R + 24, 0, TAU); ctx.stroke(); ctx.strokeStyle = rgba(P.col, 0.25); ctx.lineWidth = 12; ctx.beginPath(); ctx.arc(0, 0, R + 24, 0, TAU); ctx.stroke(); }
    else if (hover) { ctx.strokeStyle = rgba(P.col, 0.5); ctx.lineWidth = 3; ctx.setLineDash([6, 5]); ctx.beginPath(); ctx.arc(0, 0, R + 22, 0, TAU); ctx.stroke(); ctx.setLineDash([]); }
    const sc = selected ? 1.06 : 1; ctx.scale(sc, sc);
    if (k === 'A') {
      // 둥근 바이러스 + 동그란 머리 돌기 (y축으로 회전)
      const pts = FIB.map((p) => { const x = p[0] * Math.cos(rot) + p[2] * Math.sin(rot), z = -p[0] * Math.sin(rot) + p[2] * Math.cos(rot); return { x, y: p[1], z }; }).sort((a, b) => a.z - b.z);
      const rb = R * 0.62;
      const drawSp = (p) => { const a = 0.35 + 0.65 * (p.z + 1) / 2, x1 = p.x * rb, y1 = p.y * rb, x2 = p.x * (rb + 20), y2 = p.y * (rb + 20); ctx.strokeStyle = rgba(P.col, a); ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); drawSpikeHead(x2, y2, 'circle', 5.4, shade(P.col, -0.15), a); };
      pts.filter((p) => p.z < 0).forEach(drawSp);
      D.sphere(0, 0, rb, P.col, { shadow: true });
      pts.filter((p) => p.z >= 0).forEach(drawSp);
    } else if (k === 'B') {
      // 육각형 바이러스 + 세모 머리 돌기 (천천히 돌아요)
      const rb = R * 0.6;
      ctx.rotate(rot);
      const verts = []; for (let i = 0; i < 6; i++) verts.push([Math.cos(i * TAU / 6) * rb, Math.sin(i * TAU / 6) * rb]);
      for (let i = 0; i < 12; i++) {
        const a = i * TAU / 12 + TAU / 24, x1 = Math.cos(a) * rb * 0.95, y1 = Math.sin(a) * rb * 0.95, x2 = Math.cos(a) * (rb + 20), y2 = Math.sin(a) * (rb + 20);
        ctx.strokeStyle = rgba(P.col, 0.9); ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        ctx.save(); ctx.translate(x2, y2); ctx.rotate(a + Math.PI / 2); drawSpikeHead(0, -2, 'tri', 5.6, shade(P.col, -0.15), 1); ctx.restore();
      }
      ctx.save(); D.shadow(() => { const g = ctx.createLinearGradient(-rb, -rb, rb, rb); g.addColorStop(0, shade(P.col, 0.45)); g.addColorStop(0.55, P.col); g.addColorStop(1, shade(P.col, -0.3)); ctx.fillStyle = g; ctx.beginPath(); verts.forEach((v, i) => (i ? ctx.lineTo(v[0], v[1]) : ctx.moveTo(v[0], v[1]))); ctx.closePath(); ctx.fill(); }, { blur: 8, y: 4, color: 'rgba(0,0,0,.25)' });
      ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 1.5; ctx.beginPath(); verts.forEach((v) => { ctx.moveTo(0, 0); ctx.lineTo(v[0], v[1]); }); ctx.stroke(); ctx.restore();
    } else {
      // 막대 세균 + 네모 머리 돌기 + 꼬리(편모)
      const w = R * 1.55, h = R * 0.62;
      ctx.rotate(-0.35);
      ctx.strokeStyle = rgba(P.col, 0.8); ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath();
      for (let i = 0; i <= 16; i++) { const x = w / 2 + 4 + i * 3.4, y = Math.sin(t * 6 + i * 0.55) * 6 * (i / 16); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke();
      ctx.save(); D.shadow(() => { const g = ctx.createLinearGradient(0, -h, 0, h); g.addColorStop(0, shade(P.col, 0.5)); g.addColorStop(0.5, P.col); g.addColorStop(1, shade(P.col, -0.3)); ctx.fillStyle = g; rr(-w / 2, -h, w, h * 2, h).fill(); }, { blur: 8, y: 4, color: 'rgba(0,0,0,.25)' }); ctx.restore();
      ctx.fillStyle = 'rgba(255,255,255,.35)'; rr(-w / 2 + 10, -h + 6, w - 20, 8, 4).fill();
      for (let i = 0; i < 7; i++) {
        const u = ((i / 7 + rot * 0.16) % 1 + 1) % 1, x = -w / 2 + h * 0.8 + u * (w - h * 1.6);
        [-1, 1].forEach((sgn) => { const a = 0.55 + 0.45 * Math.cos(u * 6 + (sgn < 0 ? 0 : 3)); ctx.strokeStyle = rgba(P.col, a); ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x, sgn * (h - 1)); ctx.lineTo(x, sgn * (h + 14)); ctx.stroke(); drawSpikeHead(x, sgn * (h + 17), 'square', 4.6, shade(P.col, -0.2), a); });
      }
    }
    ctx.restore();
    // 이름표
    TX(pos.x, PL.nameY, P.name, { size: 18, weight: 800, color: '#0f172a' });
    TX(pos.x, PL.nameY + 20 * FS, P.kind + ' · 표면 단백질 ' + SHAPE_SYM[P.shape], { size: 13, weight: 700, color: '#475569' });
    if (PA.viewed.has(k)) { ctx.fillStyle = '#16a34a'; ctx.beginPath(); ctx.arc(pos.x + R + 6, pos.y - R - 4, 11, 0, TAU); ctx.fill(); TX(pos.x + R + 6, pos.y - R + 1, '✓', { size: 14, color: '#fff', weight: 800 }); }
  }

  function seqStrip(seq, x0, y0, o) {
    o = o || {};
    const cols = o.cols || PL.seqCols, cw = o.cw || PL.seqW, ch = o.ch || PL.seqH, t = S.t;
    for (let i = 0; i < seq.length; i++) {
      const c = i % cols, r = Math.floor(i / cols), x = x0 + cw * (c + 0.5), y = y0 + r * (ch + 12) + Math.sin(t * 3 + i * 0.5) * 2.2 * (o.wave === false ? 0 : 1);
      const inHL = o.hl && i >= o.hl[0] && i < o.hl[0] + o.hl[1];
      baseChip(x, y, seq[i], cw - 4, ch, { outline: inHL ? '#16a34a' : null, dim: o.hl && !inHL && o.dimOthers });
    }
  }

  function drawPath(t, dt) {
    ctx.fillStyle = '#f1f6f2'; ctx.fillRect(0, 0, VW, VH);
    // 단서 카드
    const c = PL.clue;
    panel(c.x, c.y, c.w, c.h, { stroke: '#fbbf24', fill: '#fffbeb' });
    const T = PA.clue;
    if (PHONE) {
      TX(c.x + 16, c.y + 28, '🧪 환자 검체에서 찾은 단서', { size: 15, align: 'left', weight: 800, color: '#92400e' });
      TX(c.x + 16, c.y + 54, '① 염기 서열 조각', { size: 13, align: 'left', weight: 800, color: '#475569' });
      for (let i = 0; i < FRAG_LEN; i++) baseChip(c.x + 160 + i * 30, c.y + 49, T.frag[i], 27, 30);
      TX(c.x + 16, c.y + 90, '② 표면 단백질 모양', { size: 13, align: 'left', weight: 800, color: '#475569' });
      shapeIcon(c.x + 172, c.y + 85, PATH[T.target].shape, 9, '#64748b'); TX(c.x + 190, c.y + 91, PATH[T.target].shapeName, { size: 13, align: 'left', weight: 800, color: '#334155' });
    } else {
      TX(c.x + 18, c.y + 29, '🧪 환자 검체에서 찾은 단서', { size: 15.5, align: 'left', weight: 800, color: '#92400e' });
      TX(c.x + 18, c.y + 53, '어떤 병원체일까요? 단서와 맞는 것을 찾아요.', { size: 13, align: 'left', weight: 700, color: '#64748b' });
      TX(c.x + 380, c.y + 29, '① 염기 서열 조각', { size: 13, align: 'left', weight: 800, color: '#475569' });
      for (let i = 0; i < FRAG_LEN; i++) baseChip(c.x + 396 + i * 31, c.y + 50, T.frag[i], 28, 30);
      TX(c.x + 650, c.y + 29, '② 표면 단백질', { size: 13, align: 'left', weight: 800, color: '#475569' });
      shapeIcon(c.x + 664, c.y + 50, PATH[T.target].shape, 10, '#64748b'); TX(c.x + 682, c.y + 55, PATH[T.target].shapeName, { size: 13, align: 'left', weight: 800, color: '#334155' });
    }
    // 병원체 3종
    PKEYS.forEach((k) => {
      const spin = PA.sel === k || PA.drag === k ? 0 : (RM ? 0 : dt * 0.55);
      PA.rot[k] += (k === 'C' ? dt * 0.9 : (k === 'B' ? dt * 0.35 : dt * 0.8)) * (RM ? 0 : 1);
      drawPathogen(k, t, PA.sel === k, PA.hover === k);
    });
    // 자세히 보기
    const d = PL.det;
    panel(d.x, d.y, d.w, d.h);
    if (!PA.sel) {
      TX(d.x + d.w / 2, d.y + d.h / 2 - 4, '병원체를 눌러 보세요', { size: 20, weight: 800, color: '#64748b' });
      TX(d.x + d.w / 2, d.y + d.h / 2 + 24, '끌면 돌려 볼 수 있어요. 염기 서열과 표면 단백질을 비교해요.', { size: 14, weight: 700, color: '#94a3b8' });
    } else {
      const P = PATH[PA.sel], k = t - PA.selT, ap = smooth(k / 0.4);
      ctx.save(); ctx.globalAlpha = ap;
      TX(d.x + 20, d.y + 32, '🧬 ' + P.name + ' (가상 ' + P.kind + ')의 염기 서열 (일부)', { size: 16.5, align: 'left', weight: 800, color: '#0f172a' });
      const sx = d.x + (d.w - PL.seqCols * PL.seqW) / 2;
      const hl = PA.reveal && PA.clue.target === PA.sel ? [PA.clue.start, FRAG_LEN] : null;
      seqStrip(P.seq, sx, d.y + (PHONE ? 80 : 70), { hl, dimOthers: !!hl });
      const ly = d.y + (PHONE ? 200 : 128);
      TX(d.x + 20, ly, '표면 단백질(항원) 모양', { size: 14.5, align: 'left', weight: 800, color: '#475569' });
      shapeIcon(d.x + 36, ly + 30, P.shape, 13, P.col); TX(d.x + 62, ly + 36, P.shapeName + ' ' + SHAPE_SYM[P.shape], { size: 15.5, align: 'left', weight: 800, color: '#0f172a' });
      drawWrap(d.x + 20, ly + (PHONE ? 80 : 66), '모든 병원체는 자기만의 염기 서열(핵산)과 표면 단백질을 가져요. 이 둘이 병원체를 구별하는 지문이에요.', d.w - 40, 13.5, { align: 'left', color: '#334155', weight: 700 });
      if (PA.reveal) pill(d.x + d.w - 20, d.y + 28, PA.clue.target === PA.sel ? '✅ 단서와 같은 서열과 단백질' : '단서와 다른 병원체', { size: 13, bg: PA.clue.target === PA.sel ? '#dcfce7' : '#f1f5f9', color: PA.clue.target === PA.sel ? '#166534' : '#475569', border: PA.clue.target === PA.sel ? '#86efac' : '#cbd5e1', align: 'right', pad: 10 });
      ctx.restore();
    }
    modelTag();
  }
  function pathAt(p) { for (const k of PKEYS) { const q = pathPos(k); if (Math.hypot(p.x - q.x, p.y - q.y) <= PL.r + 26) return k; } return null; }
  function pathSelect(k) { if (PA.sel !== k) { PA.sel = k; PA.selT = S.t; Sound.click(); } PA.viewed.add(k); }
  /* =========================================================
     ② PCR: 변성 → 결합 → 신장 사이클, 형광 곡선
     ========================================================= */
  const PCL = PHONE
    ? { card: (i) => ({ x: 10 + (i % 2) * 295, y: 52 + Math.floor(i / 2) * 104, w: 285, h: 96 }), zoom: { x: 10, y: 264, w: 580, h: 250 }, graph: { x: 10, y: 524, w: 580, h: 306 }, rowSp: 38 }
    : { card: (i) => ({ x: 20 + i * 194, y: 52, w: 180, h: 92 }), zoom: { x: 20, y: 152, w: 760, h: 182 }, graph: { x: 20, y: 342, w: 760, h: 208 }, rowSp: 27 };
  const PHASES = [['① 변성', 95, '95 °C: 이중 가닥이 두 가닥으로 풀려요'], ['② 결합', 55, '55 °C: 프라이머가 짝이 맞는 자리에 붙어요'], ['③ 신장', 72, '72 °C: 프라이머에서 새 가닥이 만들어져요']];
  const phaseOf = (u) => (u < 0.3 ? 0 : u < 0.62 ? 1 : 2);
  const cycDur = () => (PC.fast ? 0.4 : 2.5);
  function pcrPrimerKey() { return PC.primer; }
  function pcrReset() { PC.n = 0; PC.queue = 0; PC.u = -1; PC.judge = [null, null, null, null]; PC.revealed = false; PC.temp = 25; PC.bump = 0; }
  function pcrNewRoles() { PC.roles = shuffle([0, 1, 2, 3]); pcrReset(); }
  function pcrRun(k, fast) { if (PC.n + PC.queue + (PC.u >= 0 ? 1 : 0) >= MAXC) return; PC.fast = !!fast; PC.queue = Math.min(k, MAXC - PC.n - (PC.u >= 0 ? 1 : 0)); Sound.click(); }
  function pcrSetPrimer(k) { if (PC.primer === k) return; PC.primer = k; pcrReset(); Sound.click(); }
  function pcrStep(dt) {
    if (PC.u < 0 && PC.queue > 0 && PC.n < MAXC) { PC.u = 0; PC.queue--; }
    let target = 25;
    if (PC.u >= 0) {
      PC.u += dt / cycDur();
      target = PHASES[phaseOf(PC.u)][1];
      if (PC.u >= 1) { PC.n++; PC.u = -1; PC.bump = 1; if (PC.queue === 0) target = 25; }
    }
    PC.temp = approach(PC.temp, target, dt, PC.fast ? 18 : 7);
    PC.bump = Math.max(0, PC.bump - dt * 3);
    const frac = PC.u >= 0 ? smooth((PC.u - 0.62) / 0.3) : 0;
    for (let i = 0; i < 4; i++) { const s = sampleOf(i); PC.anim[i] = approach(PC.anim[i], fluoOf(copiesAt(s, PC.n, PC.primer)) * (1 - frac) + fluoOf(copiesAt(s, PC.n + 1, PC.primer)) * frac, dt, 14); }
  }
  const fluoAt = (i, n) => fluoOf(copiesAt(sampleOf(i), n, PC.primer));

  function drawTube(x, y, w, h, glow, col) {
    // 시험관: (x, y)=위 가운데
    ctx.save();
    if (glow > 0.02) D.glow(x, y + h * 0.7, 36, '#4ade80', 0.55 * glow);
    ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(x - w / 2, y); ctx.lineTo(x - w / 2, y + h - w / 2); ctx.arc(x, y + h - w / 2, w / 2, Math.PI, 0, true); ctx.lineTo(x + w / 2, y); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.save(); ctx.beginPath(); ctx.moveTo(x - w / 2 + 2, y + h * 0.3); ctx.lineTo(x - w / 2 + 2, y + h - w / 2); ctx.arc(x, y + h - w / 2, w / 2 - 2, Math.PI, 0, true); ctx.lineTo(x + w / 2 - 2, y + h * 0.3); ctx.closePath(); ctx.clip();
    const g = ctx.createLinearGradient(0, y + h * 0.3, 0, y + h); g.addColorStop(0, mixc('#dbeafe', '#86efac', glow)); g.addColorStop(1, mixc('#93c5fd', '#16a34a', glow)); ctx.fillStyle = g; ctx.fillRect(x - w / 2, y + h * 0.3, w, h);
    ctx.restore();
    ctx.fillStyle = col; rr(x - w / 2 - 3, y - 6, w + 6, 8, 3).fill();
    ctx.restore();
  }

  function strandBar(x0, x1, y, col, th, a) { ctx.save(); ctx.globalAlpha = a == null ? 1 : a; ctx.strokeStyle = col; ctx.lineWidth = th; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke(); ctx.restore(); }
  function rungs(x0, x1, y0, y1, n, a, seq, from, to) {
    // 염기쌍 가로대. from~to (0~1)만 그려요
    ctx.save(); ctx.globalAlpha = a; ctx.lineWidth = 2.5; ctx.lineCap = 'butt';
    for (let i = 0; i < n; i++) {
      const u = (i + 0.5) / n; if (u < from || u > to) continue;
      ctx.strokeStyle = BASECOL[seq[i % seq.length]] || '#94a3b8'; const x = lerp(x0, x1, u);
      ctx.beginPath(); ctx.moveTo(x, y0 + 2); ctx.lineTo(x, y1 - 2); ctx.stroke();
    }
    ctx.restore();
  }

  function drawZoom(t, dt, i) {
    const Z = PCL.zoom, s = sampleOf(i), match = s.path && s.path === PC.primer;
    panel(Z.x, Z.y, Z.w, Z.h);
    const tx = Z.x + 40, th = Z.h - 84;
    D.thermometer(tx, Z.y + 38, th, PC.temp, 20, 100, { color: PC.temp > 80 ? '#ef4444' : PC.temp > 62 ? '#f59e0b' : '#3b82f6', ticks: true, step: 20 });
    const ph = PC.u >= 0 ? phaseOf(PC.u) : -1;
    // 단계 칩
    const cx0 = Z.x + 106, cw = (PHONE ? 148 : 150);
    PHASES.forEach((p, k) => {
      const on = ph === k, x = cx0 + k * (cw + 8);
      ctx.fillStyle = on ? SUBJ : '#e2e8f0'; rr(x, Z.y + 10, cw, 28, 14).fill();
      TX(x + cw / 2, Z.y + 29, p[0] + ' ' + p[1] + '°C', { size: 13.5, weight: 800, color: on ? '#fff' : '#64748b' });
    });
    // 분자 영역
    const mx0 = Z.x + 112, mx1 = Z.x + Z.w - (PHONE ? 18 : 196), L = mx1 - mx0, sp = PCL.rowSp, cyc = Z.y + (PHONE ? 112 : 92);
    const tgtCol = s.path ? PATH[s.path].col : '#94a3b8';
    const cB = copiesAt(s, PC.n, PC.primer);
    const rb = match ? clamp(Math.round(Math.min(4, Math.max(1, cB))), 1, 4) : (s.path ? Math.min(4, Math.max(1, s.n0 >= 4 ? 4 : s.n0)) : 2);
    const ra = match ? Math.min(4, rb * 2) : rb;
    const u = PC.u;
    const sep = u < 0 ? 0 : (match ? smooth((u - 0.03) / 0.2) : smooth((u - 0.03) / 0.2) * (1 - smooth((u - 0.66) / 0.24)));
    const att = u < 0 ? 0 : (match ? smooth((u - 0.32) / 0.2) : smooth((u - 0.32) / 0.14) * (1 - smooth((u - 0.5) / 0.1)));
    const ext = u < 0 || !match ? 0 : smooth((u - 0.64) / 0.26);
    const settle = u < 0 || !match ? 0 : smooth((u - 0.9) / 0.1);
    const g = [0, 16, 10, 8, 7.5][rb];
    const seq = s.path ? PATH[s.path].seq : 'GATTACAGATTACA';
    const primerCol = PATH[PC.primer].col;
    const rowY = (r, n) => cyc + (r - (n - 1) / 2) * sp;
    const drawDuplex = (yc, a, col1, col2) => { // 가닥 두 개 + 염기쌍
      strandBar(mx0, mx1, yc - 4, col1, 5, a); strandBar(mx0, mx1, yc + 4, col2, 5, a); rungs(mx0, mx1, yc - 4, yc + 4, 14, a, seq, 0, 1);
    };
    const sat = match && rb === 4 ? true : false;
    for (let r = 0; r < rb; r++) {
      const yc = rowY(r, rb);
      if (u < 0) { drawDuplex(yc, 1, shade(tgtCol, -0.1), tgtCol); continue; }
      const gap = lerp(4, g, sep), yT = yc - gap, yB = yc + gap, a1 = 1;
      if (!match || ext <= 0) {
        // 변성 중 · 결합 중 (붙지 못하는 경우 포함)
        strandBar(mx0, mx1, yT, shade(tgtCol, -0.1), 5);
        strandBar(mx0, mx1, yB, tgtCol, 5);
        if (sep < 0.55) rungs(mx0, mx1, yT, yB, 14, 1 - sep / 0.55, seq, 0, 1);
        else { rungs(mx0, mx1, yT, yT + 7, 14, 0.9, seq, 0, 1); rungs(mx0, mx1, yB - 7, yB, 14, 0.9, seq, 0, 1); }
        // 프라이머: 짝이 맞으면 붙고, 맞지 않으면 다가왔다가 떨어져요
        if (att > 0.01) {
          const pl = L * 0.17, off = (1 - att) * 16, wob = match ? 0 : Math.sin(t * 22 + r) * 3 * att + (1 - att) * 0;
          strandBar(mx0 + 2, mx0 + 2 + pl, yT + 8 + off + wob, primerCol, 5, Math.min(1, att * 1.6));
          strandBar(mx1 - 2 - pl, mx1 - 2, yB - 8 - off - wob, primerCol, 5, Math.min(1, att * 1.6));
          if (!match && att > 0.4 && r === 0) { const q = pill(mx0 + L / 2, yc - gap - 16 - (rb > 1 ? 0 : 0), '✕ 짝이 안 맞아 붙지 못해요', { size: 12.5, bg: '#fee2e2', color: '#b91c1c', border: '#fca5a5', pad: 9 }); }
        }
      } else {
        // 신장: 새 가닥이 자라요 (위 가닥은 왼쪽에서, 아래 가닥은 오른쪽에서)
        strandBar(mx0, mx1, yT, shade(tgtCol, -0.1), 5); strandBar(mx0, mx1, yB, tgtCol, 5);
        const L1 = L * ext;
        strandBar(mx0, mx0 + L1, yT + 8, mixc(tgtCol, '#ffffff', 0.45), 5); rungs(mx0, mx0 + L1, yT, yT + 8, 14, 1, seq, 0, 1);
        strandBar(mx1 - L1, mx1, yB - 8, mixc(tgtCol, '#ffffff', 0.45), 5); rungs(mx1 - L1, mx1, yB - 8, yB, 14, 1, seq, 0, 1);
        strandBar(mx0, mx0 + L * 0.17, yT + 8, primerCol, 5); strandBar(mx1 - L * 0.17, mx1, yB - 8, primerCol, 5);
        if (ext < 0.98) { D.sphere(mx0 + L1, yT + 8, 6, '#f97316', { gloss: false }); D.sphere(mx1 - L1, yB - 8, 6, '#f97316', { gloss: false }); }
      }
    }
    // 신장이 끝나면 한 개가 두 개로 갈라져요 (눈에 보이는 분자는 최대 4줄)
    if (match && settle > 0 && u >= 0) {
      // 위의 신장 장면을 덮어 한 개 → 두 개로 이동하는 모습을 다시 그림
      ctx.fillStyle = '#fff'; ctx.fillRect(mx0 - 8, cyc - 2 * sp - 18, L + 16, 4 * sp + 36);
      for (let r = 0; r < rb; r++) {
        const yc = rowY(r, rb), gap = g;
        const y1s = yc - gap + 4, y2s = yc + gap - 4;
        const doubled = ra === rb * 2;
        const y1e = doubled ? rowY(2 * r, ra) : yc, y2e = doubled ? rowY(2 * r + 1, ra) : yc;
        drawDuplex(lerp(y1s, y1e, settle), 1, shade(tgtCol, -0.1), mixc(tgtCol, '#ffffff', 0.45));
        drawDuplex(lerp(y2s, y2e, settle), doubled ? 1 : 1 - settle, mixc(tgtCol, '#ffffff', 0.45), tgtCol);
      }
    }
    if (match && cB >= 4) TX(mx0 + L / 2, Z.y + Z.h - 30, '그림은 분자를 4줄까지만 그려요 (실제 개수는 증폭 배수로 나타내요)', { size: 12, weight: 700, color: '#94a3b8' });
    // 설명 · 개수
    const infoY = Z.y + Z.h - (PHONE ? 52 : 8);
    TX(mx0, infoY, ph >= 0 ? PHASES[ph][2] : (PC.n === 0 ? '버튼을 눌러 사이클을 시작해요' : '대기 중 · ' + PC.n + '사이클을 마쳤어요'), { size: 13.5, align: 'left', weight: 800, color: '#334155' });
    const ix = Z.x + Z.w - 178, iy = Z.y + Z.h - 10;
    if (PHONE) { TX(Z.x + Z.w - 14, iy, s.name + ' · 목표 DNA ' + (match ? foldLabel(PC.n) : '증폭 없음'), { size: 13.5, align: 'right', weight: 800, color: match ? '#166534' : '#b91c1c' }); }
    else {
      TX(ix, Z.y + 62, '선택한 검체', { size: 12.5, align: 'left', weight: 800, color: '#64748b' });
      TX(ix, Z.y + 84, s.name, { size: 17, align: 'left', weight: 800, color: '#0f172a' });
      TX(ix, Z.y + 112, '목표 DNA 증폭 배수', { size: 12.5, align: 'left', weight: 800, color: '#64748b' });
      TX(ix, Z.y + 136, match ? foldLabel(PC.n) : '증폭 없음', { size: 19 + PC.bump * 3, align: 'left', weight: 800, color: match ? '#166534' : '#b91c1c' });
      TX(ix, Z.y + 158, '사이클 ' + PC.n + ' / ' + MAXC + (match ? '  (2의 ' + PC.n + '제곱)' : ''), { size: 12.5, align: 'left', weight: 700, color: '#475569' });
    }
    if (!match && s.path) TX(mx0 + L / 2, Z.y + Z.h - (PHONE ? 30 : 30), '이 검체는 ' + PATH[s.path].name + '의 DNA라서 프라이머 ' + PC.primer + '가 붙지 못해요', { size: 12.5, weight: 700, color: '#b91c1c' });
    else if (!s.path) TX(mx0 + L / 2, Z.y + Z.h - (PHONE ? 30 : 30), '병원체가 없는 검체: 사람의 DNA(회색)만 있어요', { size: 12.5, weight: 700, color: '#64748b' });
  }

  function drawGraph(t) {
    const G0 = PCL.graph;
    panel(G0.x, G0.y, G0.w, G0.h);
    const px0 = G0.x + 58, px1 = G0.x + G0.w - 22, py0 = G0.y + G0.h - 62, py1 = G0.y + (PHONE ? 70 : 54);
    TX(G0.x + 16, G0.y + 26, '📈 형광 곡선 (목표 DNA가 늘수록 형광이 세져요)', { size: 14, align: 'left', weight: 800, color: '#0f172a' });
    const X = (n) => px0 + (n / MAXC) * (px1 - px0), Y = (f) => py0 - (f / 100) * (py0 - py1);
    ctx.save(); ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1; ctx.fillStyle = '#64748b'; ctx.font = D.font(12, 700);
    [0, 25, 50, 75, 100].forEach((f) => { ctx.beginPath(); ctx.moveTo(px0, Y(f)); ctx.lineTo(px1, Y(f)); ctx.stroke(); ctx.textAlign = 'right'; ctx.fillText(String(f), px0 - 6, Y(f) + 4); });
    [0, 10, 20, 30, 40].forEach((n) => { ctx.textAlign = 'center'; ctx.fillText(String(n), X(n), py0 + 16); });
    ctx.textAlign = 'center'; ctx.fillText('사이클 수', (px0 + px1) / 2, py0 + 34); ctx.textAlign = 'left'; ctx.fillText('형광 (%)', G0.x + 10, py1 - 10);
    ctx.restore();
    ctx.save(); ctx.strokeStyle = '#dc2626'; ctx.lineWidth = 2; ctx.setLineDash([7, 5]); ctx.beginPath(); ctx.moveTo(px0, Y(50)); ctx.lineTo(px1, Y(50)); ctx.stroke(); ctx.restore();
    TX(px1 - 2, Y(50) - 6, '기준선 (50 %)', { size: 12, align: 'right', weight: 800, color: '#dc2626' });
    const nvis = PC.n + (PC.u >= 0 ? smooth((PC.u - 0.62) / 0.3) : 0);
    for (let i = 0; i < 4; i++) {
      const s = sampleOf(i), sel = PC.sel === i;
      ctx.save(); ctx.strokeStyle = s.col; ctx.lineWidth = sel ? 4.5 : 3; ctx.globalAlpha = sel ? 1 : 0.75; ctx.lineJoin = 'round'; ctx.beginPath();
      const nmax = Math.floor(nvis);
      for (let n = 0; n <= nmax; n++) { const x = X(n), y = Y(fluoAt(i, n)); n ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      if (nvis > nmax && nmax < MAXC) { const f = nvis - nmax, v = lerp(fluoAt(i, nmax), fluoAt(i, nmax + 1), f); ctx.lineTo(X(nvis), Y(v)); }
      ctx.stroke(); ctx.restore();
      const ct = ctOf(s, PC.primer);
      if (ct != null && PC.n >= ct) { ctx.save(); ctx.strokeStyle = s.col; ctx.setLineDash([3, 4]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(X(ct), Y(50)); ctx.lineTo(X(ct), py0); ctx.stroke(); ctx.restore(); D.sphere(X(ct), Y(50), 6, s.col, { shadow: true }); TX(X(ct) + 8, py0 - 6 - i * 0, 'Ct ' + ct, { size: 12.5, align: 'left', weight: 800, color: s.col, stroke: '#fff', strokeWidth: 4 }); }
    }
    // 범례
    let lx = G0.x + 16; const ly = G0.y + G0.h - 8;
    for (let i = 0; i < 4; i++) { const s = sampleOf(i); ctx.fillStyle = s.col; rr(lx, ly - 11, 14, 5, 2).fill(); TX(lx + 20, ly - 5, s.name, { size: 12.5, align: 'left', weight: 800, color: '#334155' }); lx += PHONE ? 134 : 150; }
  }

  function drawPCR(t, dt) {
    pcrStep(dt);
    ctx.fillStyle = '#f1f6f2'; ctx.fillRect(0, 0, VW, VH);
    for (let i = 0; i < 4; i++) {
      const c = PCL.card(i), s = sampleOf(i), sel = PC.sel === i, F = PC.anim[i], ct = ctOf(s, PC.primer);
      panel(c.x, c.y, c.w, c.h, { stroke: sel ? SUBJ : null, lw: 3.5 });
      drawTube(c.x + 30, c.y + 14, 22, c.h - 28, clamp(F / 100, 0, 1), s.col);
      TX(c.x + 60, c.y + 26, s.name, { size: 16, align: 'left', weight: 800, color: '#0f172a' });
      TX(c.x + 60, c.y + 46, '형광 ' + Math.round(F) + ' %', { size: 14, align: 'left', weight: 800, color: F > 50 ? '#166534' : '#64748b' });
      TX(c.x + 60, c.y + 64, ct != null && PC.n >= ct ? 'Ct ' + ct : (PC.n === 0 ? '검사 전' : '기준선 못 넘음'), { size: 13.5, align: 'left', weight: 700, color: ct != null && PC.n >= ct ? s.col : '#64748b' });
      const j = PC.judge[i];
      if (j) pill(c.x + c.w - 10, c.y + 20, j === 'pos' ? '양성' : '음성', { size: 13, bg: j === 'pos' ? '#fee2e2' : '#dbeafe', color: j === 'pos' ? '#b91c1c' : '#1d4ed8', border: null, align: 'right', pad: 9 });
      else pill(c.x + c.w - 10, c.y + 20, '판정 ?', { size: 12.5, bg: '#f1f5f9', color: '#64748b', border: '#cbd5e1', align: 'right', pad: 8 });
      TX(c.x + 60, c.y + c.h - 9, PC.revealed ? s.desc : '병원체 ?', { size: 12, align: 'left', weight: 700, color: PC.revealed ? '#92400e' : '#94a3b8' });
    }
    drawZoom(t, dt, PC.sel);
    drawGraph(t);
  }
  function pcrCardAt(p) { for (let i = 0; i < 4; i++) { const c = PCL.card(i); if (p.x >= c.x && p.x <= c.x + c.w && p.y >= c.y && p.y <= c.y + c.h) return i; } return -1; }
  function pcrCheck() {
    if (PC.primer !== 'A') return '이번 검사는 병원체 A를 찾는 검사예요. 프라이머를 <b>A</b>로 골라 주세요.';
    if (PC.n < MAXC) return '아직 ' + PC.n + '사이클이에요. <b>' + MAXC + '사이클</b>까지 반복한 뒤 판정해요.';
    const un = PC.judge.map((j, i) => (j ? -1 : i)).filter((i) => i >= 0);
    if (un.length) return '아직 판정하지 않은 검체가 있어요: ' + un.map((i) => '환자 ' + (i + 1)).join(', ');
    const bad = [];
    for (let i = 0; i < 4; i++) { const s = sampleOf(i), want = ctOf(s, 'A') != null ? 'pos' : 'neg'; if (PC.judge[i] !== want) bad.push([i, want, s]); }
    if (bad.length) {
      const [i, want, s] = bad[0];
      if (want === 'neg') return '<b>환자 ' + (i + 1) + '</b>의 형광은 ' + MAXC + '사이클이 되어도 기준선(50 %)을 넘지 못했어요. 기준선을 넘지 못하면 <b>음성</b>이에요.' + (s.path === 'B' ? ' (이 환자는 병원체 B를 가졌지만, 프라이머 A로는 B의 DNA를 늘릴 수 없어요.)' : '');
      return '<b>환자 ' + (i + 1) + '</b>의 형광이 기준선(50 %)을 넘었어요 (Ct ' + ctOf(s, 'A') + '). 기준선을 넘으면 <b>양성</b>이에요.';
    }
    return true;
  }
  /* =========================================================
     ③ 항원 검사 키트: 모세관 현상, 항체–항원 결합, T선 · C선
     ========================================================= */
  const RL = PHONE
    ? { card: (i) => ({ x: 10 + (i % 2) * 295, y: 52 + Math.floor(i / 2) * 74, w: 285, h: 66 }), cass: { x: 14, y: 206, w: 572, h: 130 }, stripX0: 34, stripX1: 566, stripY: 262, stripH: 44, inset: { x: 10, y: 372, w: 580, h: 228 }, legend: { x: 10, y: 608, w: 580, h: 226 } }
    : { card: (i) => ({ x: 20 + i * 194, y: 52, w: 180, h: 70 }), cass: { x: 30, y: 132, w: 740, h: 130 }, stripX0: 62, stripX1: 738, stripY: 188, stripH: 48, inset: { x: 20, y: 292, w: 372, h: 256 }, legend: { x: 404, y: 292, w: 376, h: 256 } };
  const SU = { pad1: 0.12, pad2: 0.27, memEnd: 0.92, T: 0.50, C: 0.72, padMid: 0.19 };
  const sxOf = (u) => RL.stripX0 + u * (RL.stripX1 - RL.stripX0);
  const JNAME = { pos: '양성', neg: '음성', inv: '무효' };
  function makeRun(idx) {
    const truth = RP.truth[idx], N = 40, nCx = truth === 'neg' ? 0 : 28, parts2 = [];
    const rd = rng(1000 + idx * 77 + Math.floor(Math.random() * 1000));
    for (let j = 0; j < N; j++) {
      const cx = j < nCx, n = cx ? nCx : N - nCx, i = cx ? j : j - nCx;
      parts2.push({ cx, k: 0.55 + 0.4 * (i + 0.5) / n, y: rd(), jit: (rd() - 0.5) * 5, ph: rd() * 6, u0: SU.pad1 + 0.02 + rd() * (SU.pad2 - SU.pad1 - 0.04) });
    }
    return { idx, truth, tau: 0, parts: parts2, T: 0, C: 0, done: false, fmax: truth === 'inv' ? 0.66 : 1 };
  }
  function runStep(dt) {
    const r = RP.run; if (!r) return;
    if (!r.done) { r.tau = Math.min(1, r.tau + dt / RAPID_SEC); if (r.tau >= 1) { r.done = true; RP.rec[r.idx] = { T: r.T, C: r.C, truth: r.truth }; Sound.tick(); } }
    r.front = SU.pad1 * 0.4 + (r.fmax - SU.pad1 * 0.4) * Math.sqrt(r.tau);
    let capT = 0, capC = 0;
    r.parts.forEach((p) => {
      const raw = SU.padMid + (r.front - SU.padMid) * p.k, moving = r.front > p.u0;
      let u = moving ? Math.max(p.u0, raw) : p.u0;
      if (moving && p.cx && raw >= SU.T) { u = SU.T + p.jit / 600; capT++; }
      else if (moving && !p.cx && raw >= SU.C) { u = SU.C + p.jit / 600; capC++; }
      p.u = u;
    });
    const tT = clamp(capT / 12, 0, 1), tC = clamp(capC / 6, 0, 1);
    r.T = RM ? tT : approach(r.T, tT, dt, 6); r.C = RM ? tC : approach(r.C, tC, dt, 6);
    if (r.done) { r.T = tT; r.C = tC; if (RP.rec[r.idx]) { RP.rec[r.idx].T = tT; RP.rec[r.idx].C = tC; } }
  }
  function miniStrip(x, y, w, h, T, C, o) {
    o = o || {};
    ctx.save(); ctx.fillStyle = '#f8fafc'; rr(x, y, w, h, h / 2).fill(); ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1.5; rr(x, y, w, h, h / 2).stroke();
    const lw = Math.max(3, h * 0.2);
    if (T > 0.02) { ctx.fillStyle = rgba('#be123c', clamp(T, 0, 1)); ctx.fillRect(x + w * 0.46, y + 3, lw, h - 6); }
    if (C > 0.02) { ctx.fillStyle = rgba('#be123c', clamp(C, 0, 1)); ctx.fillRect(x + w * 0.7, y + 3, lw, h - 6); }
    if (o.labels) { TX(x + w * 0.46 + lw / 2, y - 3, 'T', { size: 11.5, weight: 800, color: '#64748b' }); TX(x + w * 0.7 + lw / 2, y - 3, 'C', { size: 11.5, weight: 800, color: '#64748b' }); }
    ctx.restore();
  }

  function drawRapid(t, dt) {
    runStep(dt);
    ctx.fillStyle = '#f1f6f2'; ctx.fillRect(0, 0, VW, VH);
    // 환자 카드
    for (let i = 0; i < 4; i++) {
      const c = RL.card(i), sel = RP.sel === i, rec = RP.rec[i], run = RP.run && RP.run.idx === i;
      panel(c.x, c.y, c.w, c.h, { stroke: sel ? SUBJ : null, lw: 3.5 });
      TX(c.x + 14, c.y + 26, '환자 ' + (i + 1), { size: 16, align: 'left', weight: 800, color: '#0f172a' });
      TX(c.x + 14, c.y + 48, run && !RP.run.done ? '검사 중…' : rec ? '결과 나옴' : '검사 전', { size: 13, align: 'left', weight: 700, color: rec ? '#166534' : '#64748b' });
      miniStrip(c.x + c.w - 82, c.y + 14, 70, 14, rec ? rec.T : 0, rec ? rec.C : 0);
      const j = RP.judge[i];
      if (j) pill(c.x + c.w - 12, c.y + c.h - 18, j === 'pos' ? '양성' : j === 'neg' ? '음성' : '무효', { size: 12.5, bg: j === 'pos' ? '#fee2e2' : j === 'neg' ? '#dbeafe' : '#fef3c7', color: j === 'pos' ? '#b91c1c' : j === 'neg' ? '#1d4ed8' : '#92400e', border: null, align: 'right', pad: 9 });
      else if (rec) pill(c.x + c.w - 12, c.y + c.h - 18, '판정 ?', { size: 12.5, bg: '#f1f5f9', color: '#64748b', border: '#cbd5e1', align: 'right', pad: 8 });
    }
    // 키트
    const K = RL.cass, r = RP.run, y0 = RL.stripY, h = RL.stripH;
    panel(K.x, K.y, K.w, K.h, { fill: '#e8edf3', r: 20, stroke: '#cbd5e1' });
    TX(K.x + 20, K.y + 24, '🧪 항원 검사 키트 (단면 모형)', { size: 14.5, align: 'left', weight: 800, color: '#334155' });
    // 패드와 막
    const seg = (u0, u1, col, lab) => { ctx.fillStyle = col; ctx.fillRect(sxOf(u0), y0, sxOf(u1) - sxOf(u0), h); if (lab) TX((sxOf(u0) + sxOf(u1)) / 2, y0 + h + 17, lab, { size: 12.5, weight: 700, color: '#64748b' }); };
    ctx.save(); rr(RL.stripX0, y0, RL.stripX1 - RL.stripX0, h, 6).clip();
    seg(0, SU.pad1, '#fde8e8'); seg(SU.pad1, SU.pad2, '#fbe4c8'); seg(SU.pad2, SU.memEnd, '#ffffff'); seg(SU.memEnd, 1, '#e5e7eb');
    // 액체
    if (r) { const fx = sxOf(r.front); const g = ctx.createLinearGradient(0, y0, 0, y0 + h); g.addColorStop(0, 'rgba(96,165,250,.45)'); g.addColorStop(1, 'rgba(59,130,246,.35)'); ctx.fillStyle = g; ctx.fillRect(RL.stripX0, y0, fx - RL.stripX0, h); ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(fx - 3, y0, 3, h); }
    ctx.restore();
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; rr(RL.stripX0, y0, RL.stripX1 - RL.stripX0, h, 6).stroke();
    TX((sxOf(0) + sxOf(SU.pad1)) / 2, y0 + h + 17, '검체 패드', { size: 12.5, weight: 700, color: '#64748b' });
    TX((sxOf(SU.pad1) + sxOf(SU.pad2)) / 2, y0 + h + 17, '항체-금 입자', { size: 12.5, weight: 700, color: '#b45309' });
    TX((sxOf(SU.pad2) + sxOf(SU.memEnd)) / 2 - 40, y0 + h + 17, '막 (모세관 현상으로 액체가 이동)', { size: 12.5, weight: 700, color: '#64748b' });
    TX((sxOf(SU.memEnd) + sxOf(1)) / 2, y0 + h + 17, PHONE ? '흡수' : '흡수 패드', { size: 12.5, weight: 700, color: '#64748b' });
    // 시험선 자리 · 선
    const Tx = sxOf(SU.T), Cx = sxOf(SU.C), lw = 6;
    const Ti = r ? r.T : (RP.rec[RP.sel] ? RP.rec[RP.sel].T : 0), Ci = r ? r.C : (RP.rec[RP.sel] ? RP.rec[RP.sel].C : 0);
    ctx.save(); ctx.setLineDash([3, 3]); ctx.strokeStyle = 'rgba(100,116,139,.45)'; ctx.lineWidth = 1.5; ctx.strokeRect(Tx - 5, y0 + 3, lw + 4, h - 6); ctx.strokeRect(Cx - 5, y0 + 3, lw + 4, h - 6); ctx.restore();
    if (Ti > 0.01) { ctx.fillStyle = rgba('#be123c', Ti * 0.95); ctx.fillRect(Tx - 3, y0 + 3, lw, h - 6); }
    if (Ci > 0.01) { ctx.fillStyle = rgba('#be123c', Ci * 0.95); ctx.fillRect(Cx - 3, y0 + 3, lw, h - 6); }
    TX(Tx, y0 - 8, 'T (시험선)', { size: 13, weight: 800, color: '#334155' }); TX(Cx, y0 - 8, 'C (대조선)', { size: 13, weight: 800, color: '#334155' });
    // 입자
    const parts3 = r ? r.parts : null;
    ctx.save(); rr(RL.stripX0 + 2, y0 + 2, RL.stripX1 - RL.stripX0 - 4, h - 4, 5).clip();
    if (parts3) {
      parts3.forEach((p) => {
        const x = sxOf(p.u) + (p.u < SU.T - 0.01 && r.front > p.u0 ? Math.sin(t * 5 + p.ph) * 1.5 : 0), y = y0 + 8 + p.y * (h - 16);
        const capd = p.u >= (p.cx ? SU.T : SU.C) - 0.002 && r.front > p.u0;
        ctx.save(); ctx.globalAlpha = capd ? 0.45 : 1; D.sphere(x, y, capd ? 3 : 3.8, '#d97706', { gloss: true }); ctx.restore();
        if (p.cx && r.front > p.u0) { ctx.fillStyle = PATH.A.col; ctx.beginPath(); ctx.arc(x + 4, y - 4, 2.6, 0, TAU); ctx.fill(); }
      });
    } else {
      for (let j = 0; j < 40; j++) { const rd2 = ((j * 9301 + 49297) % 233280) / 233280, rd3 = ((j * 1103 + 777) % 9973) / 9973; D.sphere(sxOf(SU.pad1 + 0.02 + rd2 * (SU.pad2 - SU.pad1 - 0.04)), y0 + 8 + rd3 * (h - 16), 3.6, '#d97706', { gloss: true }); }
    }
    ctx.restore();
    // 검체 방울 · 웰
    const wx = sxOf(SU.pad1 / 2), wy = y0 - 40;
    ctx.save(); ctx.fillStyle = '#cbd5e1'; ctx.beginPath(); ctx.ellipse(wx, y0 + h * 0.5, 15, 15, 0, 0, TAU); ctx.fillStyle = 'rgba(100,116,139,.35)'; ctx.fill(); ctx.restore();
    TX(wx, y0 - 8, 'S (검체)', { size: 13, weight: 800, color: '#334155' });
    if (r && r.tau < 0.07) { const k = r.tau / 0.07; ctx.save(); ctx.fillStyle = '#3b82f6'; ctx.beginPath(); const dy = lerp(-36, 0, k * k); ctx.moveTo(wx, y0 + h * 0.5 + dy - 9); ctx.quadraticCurveTo(wx + 8, y0 + h * 0.5 + dy + 3, wx, y0 + h * 0.5 + dy + 8); ctx.quadraticCurveTo(wx - 8, y0 + h * 0.5 + dy + 3, wx, y0 + h * 0.5 + dy - 9); ctx.fill(); ctx.restore(); }
    // 진행 표시
    const tauShow = r ? r.tau : 0, mins = Math.round(tauShow * RAPID_MIN);
    TX(K.x + K.w - 18, K.y + 24, '⏱ ' + mins + '분 / 약 ' + RAPID_MIN + '분', { size: 14, align: 'right', weight: 800, color: '#334155' });
    glossBar(K.x + K.w - 188, K.y + 32, 170, 7, tauShow, '#3b82f6');
    if (r && r.done) {
      const T2 = r.T > 0.5, C2 = r.C > 0.5;
      const lab = T2 && C2 ? '두 줄 (T선 + C선)' : C2 ? 'C선만' : T2 ? 'T선만 (C선 없음)' : '선이 없어요';
      pill(K.x + K.w / 2, K.y + K.h + 16, '결과: ' + lab + ' → 판정은 아래 버튼으로', { size: 13.5, bg: '#fff', color: '#0f172a', border: '#cbd5e1', pad: 12 });
    } else if (!r) pill(K.x + K.w / 2, K.y + K.h + 16, '환자를 고르고 💧 검체 떨어뜨리기를 눌러요', { size: 13.5, bg: '#fff', color: '#475569', border: '#cbd5e1', pad: 12 });
    drawInset(t); drawLegend(t);
    exampleTag(VW - 12, PHONE ? 40 : 28, '교육용 모형 · 실제 진단이 아니에요');
  }

  function drawInset(t) {
    const I = RL.inset;
    panel(I.x, I.y, I.w, I.h);
    TX(I.x + 16, I.y + 26, '🔍 입자 모형으로 보기: 항체와 항원', { size: 14.5, align: 'left', weight: 800, color: '#0f172a' });
    const cx = I.x + I.w * 0.32, cy = I.y + I.h * 0.45, tt = RM ? 2.5 : (t % 8);
    // 금 입자가 붙은 항체 (Y 모양)
    ctx.save(); ctx.translate(cx, cy);
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-40, 44); ctx.lineTo(-40, 6); ctx.moveTo(-40, 6); ctx.lineTo(-68, -26); ctx.moveTo(-40, 6); ctx.lineTo(-12, -26); ctx.stroke();
    // 결합 자리(오목한 동그라미)
    ctx.fillStyle = '#e2e8f0'; ctx.strokeStyle = '#334155'; ctx.lineWidth = 3;
    [[-68, -26], [-12, -26]].forEach((p, i) => { ctx.beginPath(); ctx.arc(p[0], p[1] - 4, 11, 0, TAU); ctx.fill(); ctx.stroke(); });
    D.sphere(-40, 52, 11, '#d97706', { gloss: true });
    TX(-40, 80, '항체 + 금 입자', { size: 12.5, weight: 800, color: '#92400e' });
    ctx.restore();
    // 항원: 첫 절반은 모양이 맞는 항원(●), 나머지는 다른 병원체의 항원(▲)
    const site = { x: cx - 12, y: cy - 30 };
    let ax, ay, label, col = PATH.A.col, shape = 'circle', bound = false, rej = false, alpha = 1, sc = 1;
    if (tt < 4.4) {
      const k = clamp(tt / 1.6, 0, 1), e = SciSim.ease.outCubic(k);
      ax = lerp(site.x + 150, site.x, e); ay = lerp(site.y - 40, site.y - 4, e);
      bound = k >= 1; if (bound) sc = 1 + 0.25 * Math.max(0, 1 - (tt - 1.6) * 3) * Math.sin((tt - 1.6) * 14);
      label = bound ? '✅ 모양이 맞아서 결합해요 (특이적 결합)' : '병원체 A의 항원 ●';
      alpha = tt > 4 ? 1 - (tt - 4) / 0.4 : 1;
    } else if (tt < 8) {
      shape = 'tri'; col = PATH.B.col; const k = clamp((tt - 4.6) / 1.4, 0, 1);
      const ap = SciSim.ease.outCubic(k), bounce = tt > 6.0 ? clamp((tt - 6.0) / 0.9, 0, 1) : 0;
      ax = lerp(site.x + 150, site.x + 26, ap) + bounce * 70 * SciSim.ease.outCubic(bounce); ay = lerp(site.y - 40, site.y - 8, ap) - bounce * 26;
      rej = tt > 6.0; label = rej ? '✕ 모양이 달라서 결합하지 못해요' : '병원체 B의 항원 ▲';
      alpha = tt > 7.4 ? 1 - (tt - 7.4) / 0.6 : 1;
      if (rej && bounce < 0.5) ax += Math.sin(tt * 60) * 2;
    } else { ax = site.x + 150; ay = site.y - 40; alpha = 0; label = ''; }
    if (alpha > 0.01) {
      ctx.save(); ctx.globalAlpha = alpha; ctx.translate(ax, ay); ctx.scale(sc, sc);
      if (bound) D.glow(0, 0, 34, '#22c55e', 0.5);
      shapeIcon(0, 0, shape, 10, col); ctx.restore();
    }
    drawWrap(I.x + I.w / 2, I.y + I.h - 22, label, I.w - 30, 13.5, { color: rej ? '#b91c1c' : '#166534', weight: 800 });
  }

  function drawLegend(t) {
    const Lg = RL.legend;
    panel(Lg.x, Lg.y, Lg.w, Lg.h);
    TX(Lg.x + 16, Lg.y + 26, '📖 결과 읽는 법', { size: 14.5, align: 'left', weight: 800, color: '#0f172a' });
    const rows = [['양성', 1, 1, 'T선 + C선 두 줄', '#b91c1c'], ['음성', 0, 1, 'C선만 보여요', '#1d4ed8'], ['무효', 1, 0, 'C선이 없어요 (T선만 보여도 무효) → 새 키트로 다시', '#92400e']];
    rows.forEach((r, i) => {
      const y = Lg.y + (PHONE ? 36 : 42) + i * (PHONE ? 52 : 58);
      miniStrip(Lg.x + 18, y + 12, 112, 22, r[1], r[2], { labels: true });
      TX(Lg.x + 146, y + 22, r[0], { size: 16, align: 'left', weight: 800, color: r[4] });
      drawWrap(Lg.x + 146, y + 42, r[3], Lg.w - 160, 12.5, { align: 'left', color: '#475569', weight: 700 });
    });
    drawWrap(Lg.x + Lg.w / 2, Lg.y + Lg.h - (PHONE ? 10 : 14), '📌 C선은 검사가 제대로 되었는지 확인하는 선이에요.', Lg.w - 30, 12.5, { color: '#64748b', weight: 800 });
  }
  function rapidStart() {
    if (!RP.sel && RP.sel !== 0) return;
    RP.run = makeRun(RP.sel); RP.rec[RP.sel] = null; RP.judge[RP.sel] = null; Sound.click();
  }
  function rapidSelect(i) {
    if (RP.sel === i) return;
    RP.sel = i; Sound.click();
    if (RP.rec[i]) { const r = makeRun(i); r.tau = 1; r.done = true; RP.run = r; runStep(0); } else RP.run = null;
  }
  function rapidNewKit() { RP.run = null; RP.rec[RP.sel] = null; RP.judge[RP.sel] = null; Sound.click(); }
  function rapidReset() { RP.truth = shuffle(['pos', 'pos', 'neg', 'inv']); RP.run = null; RP.rec = [null, null, null, null]; RP.judge = [null, null, null, null]; RP.sel = 0; }
  function rapidCardAt(p) { for (let i = 0; i < 4; i++) { const c = RL.card(i); if (p.x >= c.x && p.x <= c.x + c.w && p.y >= c.y && p.y <= c.y + c.h) return i; } return -1; }
  function rapidCheck() {
    const unrun = [0, 1, 2, 3].filter((i) => !RP.rec[i] || (RP.run && RP.run.idx === i && !RP.run.done));
    if (unrun.length) return '아직 검사를 끝내지 않은 환자가 있어요: ' + unrun.map((i) => '환자 ' + (i + 1)).join(', ');
    const un = [0, 1, 2, 3].filter((i) => !RP.judge[i]);
    if (un.length) return '아직 판정하지 않은 환자가 있어요: ' + un.map((i) => '환자 ' + (i + 1)).join(', ');
    const bad = [0, 1, 2, 3].filter((i) => RP.judge[i] !== RP.truth[i]);
    if (bad.length) {
      const i = bad[0], tr = RP.truth[i];
      return '<b>환자 ' + (i + 1) + '</b>의 키트를 다시 봐요. ' + (tr === 'pos' ? 'T선과 C선이 <b>모두</b> 보이면 양성이에요.' : tr === 'neg' ? 'C선만 보이면 음성이에요.' : 'C선이 없으면 T선이 보여도 <b>무효</b>예요. 검사가 제대로 되지 않았으니 새 키트로 다시 해야 해요.');
    }
    return true;
  }
  /* =========================================================
     ④ 결과 해석: 비교표 · 환자 사례
     ========================================================= */
  const TBL_ROWS = [['time', '⏱ 걸리는 시간'], ['place', '📍 검사 장소'], ['sens', '🎯 초기 감염 찾기'], ['prep', '🧰 준비물']];
  const TBL_CARDS = [
    { row: 'time', col: 'pcr', label: '수 시간' }, { row: 'time', col: 'ag', label: '약 15분' },
    { row: 'place', col: 'pcr', label: '검사실 (장비·검사 인력)' }, { row: 'place', col: 'ag', label: '현장 (검사소·집)' },
    { row: 'sens', col: 'pcr', label: '높음: 적은 양도 찾아요' }, { row: 'sens', col: 'ag', label: '낮음: 초기엔 놓칠 수 있어요' },
    { row: 'prep', col: 'pcr', label: '프라이머 · PCR 장비' }, { row: 'prep', col: 'ag', label: '항체가 붙은 키트' },
  ];
  const CASES = [
    { id: 'contact', want: 'pcr', label: '증상은 없지만 확진자와 접촉한 사람 (감염 초기일 수 있어요)' },
    { id: 'early', want: 'pcr', label: '감염 초기라 몸속 바이러스가 아주 적은 사람' },
    { id: 'peak', want: 'ag', label: '발병 3일째라 바이러스가 많은 환자 (빨리 확인하고 싶어요)' },
    { id: 'event', want: 'ag', label: '행사장 입구에서 많은 사람을 현장에서 빠르게 가려내야 해요' },
  ];
  const TCOL = { pcr: '#16a34a', ag: '#0ea5e9' };
  const TL = PHONE
    ? { hy: 108, rowY: [176, 250, 324, 398], colX: { pcr: 232, ag: 460 }, cw: 220, ch: 62, labX: 62, pool: (k) => ({ x: 150 + (k % 2) * 300, y: 492 + Math.floor(k / 2) * 68 }), cardW: 270, cardH: 56 }
    : { hy: 76, rowY: [128, 196, 264, 332], colX: { pcr: 380, ag: 640 }, cw: 250, ch: 58, labX: 135, pool: (k) => ({ x: 130 + (k % 4) * 180, y: 438 + Math.floor(k / 4) * 68 }), cardW: 168, cardH: 52 };
  function buildTable() {
    const b = new Board({ onChange() { b.items.forEach((c) => { c.ok = false; c.bad = false; c.warned = false; }); } });
    TBL_ROWS.forEach((r, ri) => ['pcr', 'ag'].forEach((c) => b.addSlot({ id: r[0] + '-' + c, row: r[0], col: c, x: TL.colX[c], y: TL.rowY[ri], w: TL.cw, h: TL.ch, cap: 1, color: TCOL[c] })));
    const order = shuffle(TBL_CARDS.map((c, i) => i));
    order.forEach((ci, k) => { const c = TBL_CARDS[ci], p = TL.pool(k); b.addItem({ id: c.row + '-' + c.col, row: c.row, col: c.col, w: TL.cardW, h: TL.cardH, hx: p.x, hy: p.y, label: c.label, size: PHONE ? 14 : 14, stroke: '#94a3b8' }); });
    CM.tableBoard = b;
  }
  const CL = PHONE
    ? { pool: (k) => ({ x: 150 + (k % 2) * 300, y: 124 + Math.floor(k / 2) * 84 }), cw: 276, chh: 74, slots: [{ id: 'pcr', x: 300, y: 380, w: 580, h: 200 }, { id: 'ag', x: 300, y: 600, w: 580, h: 200 }], cols: 2, gh: 70, top: 54 }
    : { pool: (k) => ({ x: 205 + (k % 2) * 390, y: 116 + Math.floor(k / 2) * 76 }), cw: 366, chh: 62, slots: [{ id: 'pcr', x: 205, y: 395, w: 380, h: 300 }, { id: 'ag', x: 595, y: 395, w: 380, h: 300 }], cols: 1, gh: 62, top: 52 };
  function buildCases() {
    const b = new Board({ onChange() { b.items.forEach((c) => { c.ok = false; c.bad = false; c.warned = false; }); } });
    CL.slots.forEach((s) => b.addSlot(Object.assign({ cap: 4, cols: CL.cols, gh: CL.gh, top: CL.top, pad: 8, color: TCOL[s.id], isc: PHONE ? 0.96 : 0.96, label: s.id === 'pcr' ? '🧬 핵산 진단 (PCR)' : '🧪 단백질 진단 (항원 검사)', sub: s.id === 'pcr' ? '적은 양도 찾아내요 · 수 시간' : '현장에서 약 15분' }, s)));
    const order = shuffle(CASES.map((c, i) => i));
    order.forEach((ci, k) => { const c = CASES[ci], p = CL.pool(k); b.addItem({ id: c.id, want: c.want, w: CL.cw, h: CL.chh, hx: p.x, hy: p.y, label: c.label, size: PHONE ? 12.5 : 13.5, stroke: '#94a3b8' }); });
    CM.caseBoard = b;
  }
  function cmpBoard() { return CM.sub === 'table' ? CM.tableBoard : CM.caseBoard; }
  function drawBoardScene(b, dt) {
    b.step(dt);
    const hv = b.drag ? b.slotAtPoint({ x: b.drag.c.x, y: b.drag.c.y }) : null;
    b.slots.forEach((s) => { s._h = approach(s._h || 0, hv === s ? 1 : 0, dt, 14); });
  }
  function drawCmp(t, dt) {
    ctx.fillStyle = '#f1f6f2'; ctx.fillRect(0, 0, VW, VH);
    const b = cmpBoard(); drawBoardScene(b, dt);
    if (CM.sub === 'table') {
      TX(TL.labX, TL.hy, '비교 항목', { size: 14, weight: 800, color: '#64748b' });
      [['pcr', '🧬 핵산 진단 (PCR)'], ['ag', '🧪 항원 검사']].forEach((c) => { D.label(TL.colX[c[0]], TL.hy - 6, c[1], { size: 14.5, bg: TCOL[c[0]], color: '#fff', pad: 12 }); });
      TBL_ROWS.forEach((r, i) => { D.label(TL.labX, TL.rowY[i], r[1], { size: 14, bg: '#fff', color: '#334155', border: '#cbd5e1', pad: 12 }); });
      TX(PHONE ? 300 : 400, PHONE ? 458 : 390, '카드를 끌어 알맞은 칸에 놓아요', { size: 13.5, weight: 800, color: '#64748b' });
    } else {
      TX(PHONE ? 300 : 400, PHONE ? 76 : 70, '환자 사례 카드를 끌어 더 알맞은 검사 칸에 놓아요', { size: 14, weight: 800, color: '#334155' });
    }
    b.slots.forEach((s) => drawSlot(s, { hover: s._h }));
    b.items.forEach((c) => { if (!b.drag || b.drag.c !== c) b.drawItem(c); });
    if (b.drag) b.drawItem(b.drag.c);
    exampleTag(VW - 12, PHONE ? 40 : 26, '교육용 모형');
  }
  function tableCheck() {
    const b = CM.tableBoard, un = b.items.filter((c) => !c.slot);
    if (un.length) return '아직 칸에 놓지 않은 카드가 ' + un.length + '장 있어요.';
    const bad = b.items.filter((c) => c.slot.row !== c.row || c.slot.col !== c.col);
    if (bad.length) {
      bad.forEach((c) => { if (!c.warned) { c.warned = true; c.bad = true; c.shake = 0.5; } });
      const c = bad[0];
      return '<b>"' + c.label + '"</b> 카드가 놓인 칸을 다시 봐요. 검사에 걸리는 시간, 장소, 필요한 것은 두 검사에서 서로 달라요. (PCR: 수 시간 · 장비 필요 · 적은 양도 찾아요 / 항원 검사: 약 15분 · 현장 · 초기에는 놓칠 수 있어요)';
    }
    b.items.forEach((c) => { if (!c.ok) { c.ok = true; c.pop = 1; okBurst(c.x, c.y, { count: 5, speed: 80, life: 0.5, size: 3 }); } });
    return true;
  }
  function casesCheck() {
    const b = CM.caseBoard, un = b.items.filter((c) => !c.slot);
    if (un.length) return '아직 칸에 놓지 않은 환자 카드가 ' + un.length + '장 있어요.';
    const bad = b.items.filter((c) => c.slot.id !== c.want);
    if (bad.length) {
      bad.forEach((c) => { if (!c.warned) { c.warned = true; c.bad = true; c.shake = 0.5; } });
      const c = bad[0];
      return c.want === 'pcr' ? '빨간 테두리 카드는 몸속 바이러스가 아주 적을 수 있는 사례예요. 적은 양도 찾아내는 검사가 더 알맞아요.' : '빨간 테두리 카드는 바이러스가 많거나, 많은 사람을 빨리 현장에서 가려내야 하는 사례예요. 빠르고 현장에서 쓰는 검사가 더 알맞아요.';
    }
    b.items.forEach((c) => { if (!c.ok) { c.ok = true; c.pop = 1; okBurst(c.x, c.y, { count: 5, speed: 80, life: 0.5, size: 3 }); } });
    return true;
  }
  /* =========================================================
     화면 전환 · 조작 연결
     ========================================================= */
  const MODE_LABEL = { path: '🦠 가상 병원체 관찰', pcr: '🧬 핵산 진단 (PCR)', rapid: '🧪 단백질 진단 (항원 검사)', cmp: '📊 두 검사 비교와 선택' };
  const MODE_HINT = { path: '병원체를 눌러 보고, 끌어서 돌려 봐요', pcr: '환자 카드를 눌러 고르고, 사이클 버튼으로 DNA를 늘려요', rapid: '환자를 고르고 검체를 떨어뜨려 결과를 읽어요', cmp: '카드를 끌어 알맞은 칸에 놓아요' };
  function setMode(m) {
    if (!MODE_LABEL[m] || (game && !hasF(m))) return;
    if (m === S.mode) { ctlUpdate(); return; }
    S.mode = m; S.fade = 1; $('#tbLabel').textContent = MODE_LABEL[m]; showHint(MODE_HINT[m], 4200); ctlUpdate();
  }
  function ensure(m, sub) {
    if (m !== S.mode) { S.mode = m; S.fade = 1; $('#tbLabel').textContent = MODE_LABEL[m]; }
    if (sub) CM.sub = sub;
    ctlUpdate();
  }
  const mkB = () => { if (!CM.tableBoard) buildTable(); if (!CM.caseBoard) buildCases(); };
  function ctlUpdate() {
    const mode = S.mode;
    $$('#ctrlCard [data-show]').forEach((el) => { el.hidden = !el.dataset.show.split(/\s+/).includes(mode); });
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === mode));
    $$('#prSeg button').forEach((b) => b.classList.toggle('on', b.dataset.pr === PC.primer));
    $$('#rpSel button').forEach((b) => { b.classList.toggle('on', +b.dataset.rp === RP.sel); b.classList.toggle('done', !!RP.judge[+b.dataset.rp]); });
    $$('#cmSeg button').forEach((b) => b.classList.toggle('on', b.dataset.cm === CM.sub));
    const set = (id, v) => { const e = $('#' + id); if (e) e.textContent = v; };
    set('oViewed', PA.viewed.size + ' / 3'); set('oPrimer', PC.primer + '용'); set('oCyc', PC.n + ' / ' + MAXC);
    set('pcJTitle', '환자 ' + (PC.sel + 1) + ' 판정' + (PC.judge[PC.sel] ? ' (' + (PC.judge[PC.sel] === 'pos' ? '양성' : '음성') + ')' : ''));
    set('rpJTitle', '환자 ' + (RP.sel + 1) + ' 판정' + (RP.judge[RP.sel] ? ' (' + JNAME[RP.judge[RP.sel]] + ')' : ''));
    [['bJpos', PC.judge[PC.sel] === 'pos'], ['bJneg', PC.judge[PC.sel] === 'neg'], ['bRpos', RP.judge[RP.sel] === 'pos'], ['bRneg', RP.judge[RP.sel] === 'neg'], ['bRinv', RP.judge[RP.sel] === 'inv']].forEach((a) => { const b = $('#' + a[0]); if (b) b.classList.toggle('on', a[1]); });
    const busy = PC.u >= 0 || PC.queue > 0;
    [['bRun1', PC.n >= MAXC || busy], ['bRun10', PC.n >= MAXC || busy], ['bRun40', PC.n >= MAXC || busy]].forEach((a) => { const b = $('#' + a[0]); if (b) b.disabled = !!a[1]; });
    const bd = $('#bDrop'); if (bd) bd.disabled = !!(RP.run && !RP.run.done);
  }
  function bindUI() {
    $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setMode(b.dataset.mode); }));
    $$('#prSeg button').forEach((b) => b.addEventListener('click', () => { pcrSetPrimer(b.dataset.pr); ctlUpdate(); }));
    $('#bRun1').addEventListener('click', () => { pcrRun(1, false); ctlUpdate(); });
    $('#bRun10').addEventListener('click', () => { pcrRun(10, true); ctlUpdate(); });
    $('#bRun40').addEventListener('click', () => { pcrRun(MAXC - PC.n, true); ctlUpdate(); });
    $('#bPcReset').addEventListener('click', () => { Sound.click(); pcrReset(); ctlUpdate(); });
    $('#bJpos').addEventListener('click', () => { Sound.click(); PC.judge[PC.sel] = 'pos'; ctlUpdate(); });
    $('#bJneg').addEventListener('click', () => { Sound.click(); PC.judge[PC.sel] = 'neg'; ctlUpdate(); });
    $$('#rpSel button').forEach((b) => b.addEventListener('click', () => { rapidSelect(+b.dataset.rp); ctlUpdate(); }));
    $('#bDrop').addEventListener('click', () => { rapidStart(); ctlUpdate(); });
    $('#bKit').addEventListener('click', () => { rapidNewKit(); ctlUpdate(); });
    [['bRpos', 'pos'], ['bRneg', 'neg'], ['bRinv', 'inv']].forEach((a) => $('#' + a[0]).addEventListener('click', () => {
      if (!RP.rec[RP.sel]) { toast('먼저 이 환자의 검사를 끝내 주세요', 'bad', 1600); Sound.fail(); return; }
      if (RP.run && !RP.run.done && RP.run.idx === RP.sel) { toast('결과가 나올 때까지 기다려 주세요', 'bad', 1400); return; }
      Sound.click(); RP.judge[RP.sel] = a[1]; ctlUpdate();
    }));
    $$('#cmSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); CM.sub = b.dataset.cm; ctlUpdate(); }));
    $('#bCmReset').addEventListener('click', () => { Sound.click(); if (CM.sub === 'table') buildTable(); else buildCases(); ctlUpdate(); });
    SciSim.pointer(view, {
      down(p) {
        if (S.mode === 'path') { const k = pathAt(p); if (k) { pathSelect(k); PA.drag = k; PA.dragX = p.x; ctlUpdate(); return true; } return false; }
        if (S.mode === 'pcr') { const i = pcrCardAt(p); if (i >= 0) { PC.sel = i; Sound.click(); ctlUpdate(); } return false; }
        if (S.mode === 'rapid') { const i = rapidCardAt(p); if (i >= 0) { rapidSelect(i); ctlUpdate(); } return false; }
        if (S.mode === 'cmp') return cmpBoard().onDown(p);
        return false;
      },
      move(p) { if (S.mode === 'path' && PA.drag) { PA.rot[PA.drag] += (p.x - PA.dragX) * 0.03; PA.dragX = p.x; } else if (S.mode === 'cmp') cmpBoard().move(p); },
      up(p) { if (S.mode === 'path') PA.drag = null; else if (S.mode === 'cmp') { cmpBoard().up(p); ctlUpdate(); } },
      hover(p) {
        if (S.mode === 'path') { PA.hover = pathAt(p); return PA.hover ? 'grab' : 'default'; }
        if (S.mode === 'pcr') return pcrCardAt(p) >= 0 ? 'pointer' : 'default';
        if (S.mode === 'rapid') return rapidCardAt(p) >= 0 ? 'pointer' : 'default';
        if (S.mode === 'cmp') return cmpBoard().pick(p) ? 'grab' : 'default';
        return 'default';
      },
    });
  }

  function doReadouts() {
    const m = S.mode;
    if (m === 'path') {
      const s = PA.sel ? PATH[PA.sel] : null;
      readouts([['살펴본 병원체', PA.viewed.size + ' / 3'], ['선택한 병원체', s ? s.name + ' (' + s.kind + ')' : '—'], ['표면 단백질', s ? SHAPE_SYM[s.shape] + ' ' + s.shapeName : '—']]);
    } else if (m === 'pcr') {
      const s = sampleOf(PC.sel), match = s.path && s.path === PC.primer, ct = ctOf(s, PC.primer);
      readouts([['사이클 / 온도', PC.n + ' / ' + MAXC + ' · ' + Math.round(PC.temp) + ' °C'], [s.name + ' 증폭 배수', match ? foldLabel(PC.n) : '증폭 없음'], [s.name + ' 형광 / Ct', Math.round(fluoAt(PC.sel, PC.n)) + ' % / ' + (ct != null && PC.n >= ct ? 'Ct ' + ct : '—')]]);
    } else if (m === 'rapid') {
      const r = RP.run, mins = r ? Math.round(r.tau * RAPID_MIN) : 0;
      readouts([['검사 시간', r ? mins + '분 / 약 ' + RAPID_MIN + '분' : '대기'], ['T선 (시험선)', r ? (r.T > 0.5 ? '보임' : '없음') : '—'], ['C선 (대조선)', r ? (r.C > 0.5 ? '보임' : '없음') : '—']]);
    } else {
      const b = cmpBoard();
      readouts([['놓은 카드', b.placed() + ' / ' + b.items.length + '장'], ['활동', CM.sub === 'table' ? '비교표 완성' : '검사 고르기'], ['PCR · 항원 검사', '수 시간 · 약 ' + RAPID_MIN + '분']]);
    }
  }

  /* =========================================================
     미션
     ========================================================= */
  const RATIO = Math.pow(2, CT_LO - CT_HI);
  const levels = [
    {
      title: '병원체는 무엇으로 구별할까요?', short: '병원체 특징', icon: '🦠', phase: '관찰', features: ['path'],
      intro: '<p class="si-q">❓ 탐구 질문: 아주 작은 병원체가 몸속에 있는지 어떻게 알아낼 수 있을까?</p>' +
        '<div class="si-link">🔗 <b>통합과학1에서</b> DNA의 <b>염기 서열</b>(A · T · G · C)에 유전 정보가 담기고, 그 정보에 따라 <b>단백질</b>이 만들어진다는 것을 배웠어요. 병원체도 자기만의 염기 서열과 단백질을 가져요.</div>' +
        '<p>가상 병원체 A · B · C를 돌려 보며 서로 다른 점을 찾고, 환자 검체에서 나온 <b>단서</b>와 맞는 병원체를 찾아봐요. (가상 병원체로 만든 <b>교육용 모형</b>이에요. 실제 진단이나 치료 조언이 아니에요.)</p>',
      setup() { ensure('path'); },
      recap: '병원체마다 <b>염기 서열(핵산)</b>과 <b>표면 단백질(항원)</b>이 달라서, 이 둘이 병원체를 알아내는 <b>지문(단서)</b>이 돼요.',
      summary: '<ul><li>병원체(바이러스, 세균)는 <b>고유한 핵산 염기 서열</b>과 <b>표면 단백질(항원)</b>을 가져요. 이것이 병원체의 지문이에요.</li>' +
        '<li>진단 기술은 이 지문을 찾는 방법이에요: <b>핵산 진단</b>(염기 서열을 찾아요)과 <b>단백질 진단</b>(항원을 찾아요).</li>' +
        '<li>염기 서열의 일부만 같아도 같은 병원체라고 할 수 있어서, 짧은 조각만 찾아도 병원체를 구별할 수 있어요.</li></ul>',
      missions: [
        {
          id: 'identify', title: '검체 속 병원체 찾기', manual: true,
          goal: '병원체 3종을 모두 눌러 살펴본 뒤, 환자 검체의 <b>단서(염기 서열 조각 + 표면 단백질 모양)</b>와 맞는 병원체를 골라 <b>✔ 확인하기</b>를 눌러요.',
          hint: '병원체를 누르면 염기 서열이 나와요. 단서 조각의 글자가 같은 순서로 이어진 곳이 있는지 찾아봐요. 표면 단백질 모양도 비교해요.',
          setup() { PA.viewed.clear(); PA.sel = null; PA.reveal = false; PA.clue = pickClue(); ensure('path'); },
          check() {
            if (PA.viewed.size < 3) return '병원체 3종을 모두 눌러 살펴본 뒤에 골라 주세요. (지금 ' + PA.viewed.size + ' / 3)';
            if (!PA.sel) return '단서와 맞는 병원체를 눌러서 고른 뒤 확인해 주세요.';
            const P = PATH[PA.sel];
            if (PA.sel === PA.clue.target) return true;
            return '<b>' + P.name + '</b>의 염기 서열 안에서는 단서 조각(<b>' + PA.clue.frag + '</b>)을 찾을 수 없어요.' + (PATH[PA.clue.target].shape !== P.shape ? ' 표면 단백질 모양도 단서(' + PATH[PA.clue.target].shapeName + ')와 달라요.' : '') + ' 다른 병원체의 서열도 비교해 봐요.';
          },
          explain: '염기 서열과 표면 단백질 모양은 <b>병원체마다 달라요</b>. 서열이 다르면 다른 병원체이고, 일부 조각이 같으면 같은 병원체예요. 그래서 짧은 서열 조각이나 표면 단백질 하나만 찾아도 병원체를 알아낼 수 있어요.',
        },
        {
          type: 'quiz', title: '진단의 단서', goal: '병원체를 구별해서 알아내는 단서로 알맞은 것은?',
          setup() { ensure('path'); },
          choices: ['모든 병원체는 염기 서열이 같아서 단서가 될 수 없다', '병원체마다 염기 서열(핵산)과 표면 단백질이 달라서, 이것들이 병원체를 알아내는 단서가 된다', '병원체는 크기만 다르고 핵산과 단백질은 같다', '병원체는 색깔로만 구별할 수 있다'],
          answer: 1,
          feedback: ['A · B · C의 염기 서열을 다시 비교해 봐요. 서로 달라요.', '', '핵산과 단백질이 병원체마다 다르다는 것을 봤어요.', '병원체는 너무 작아서 색깔로는 구별하기 어려워요. 핵산과 단백질이 단서예요.'],
          explain: '병원체마다 <b>염기 서열</b>과 <b>표면 단백질</b>이 고유해요. 그래서 이 중 하나를 찾아내면 어떤 병원체가 몸속에 있는지 알 수 있어요. 다음 단계에서 핵산을 찾는 <b>PCR 검사</b>를 해 봐요.',
        },
      ],
    },
    {
      title: '핵산으로 찾는 PCR 검사', short: '핵산 진단', icon: '🧬', phase: '실험', features: ['pcr'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 병원체마다 고유한 염기 서열을 가진다는 것을 알았어요.</div>' +
        '<p>환자 검체 속 병원체의 DNA는 너무 적어서 그대로는 찾기 어려워요. <b>PCR</b>은 찾으려는 서열과 짝이 맞는 짧은 DNA 조각(<b>프라이머</b>)을 넣고 <b>변성(95 °C) → 결합(55 °C) → 신장(72 °C)</b>을 반복해, 그 DNA만 늘려서 찾아요. 형광이 기준선을 넘으면 <b>양성</b>이에요. 환자 4명의 검체를 검사해요. (RNA 바이러스는 RNA를 DNA로 바꾸는 단계가 먼저 필요하지만 여기서는 생략해요.)</p>',
      setup() { pcrNewRoles(); PC.primer = 'A'; PC.sel = 0; ensure('pcr'); },
      recap: 'PCR은 사이클마다 목표 DNA가 <b>2배</b>씩 늘어나고, 프라이머는 짝이 맞는 서열에만 붙어요. 형광이 기준선을 넘는 <b>Ct</b>가 작을수록 처음 병원체가 많았다는 뜻이에요.',
      summary: '<ul><li><b>PCR</b> 한 사이클: <b>변성</b> 약 95 °C(이중 가닥이 두 가닥으로) → <b>결합</b> 약 55 °C(프라이머가 짝 염기에 붙음) → <b>신장</b> 약 72 °C(새 가닥 합성).</li>' +
        '<li>한 사이클마다 목표 DNA가 <b>2배</b>: 10회에 약 1000배(2¹⁰ = 1024), 30회에 약 10억 배(2³⁰).</li>' +
        '<li>프라이머가 맞는 병원체의 DNA만 증폭돼요. 형광이 기준선을 넘으면 양성이고, 넘는 사이클 수 <b>Ct</b>가 작을수록 처음 양이 많아요.</li>' +
        '<li>장점: 적은 양도 찾아내요(민감도 높음). 단점: 장비와 검사 인력이 필요하고 수 시간이 걸려요.</li></ul>',
      missions: [
        {
          id: 'pcr', title: 'PCR로 검체 4개 판정하기', manual: true,
          goal: '프라이머 <b>A</b>로 <b>' + MAXC + '사이클</b>까지 증폭한 뒤, 형광 곡선을 보고 환자 4명이 <b>양성</b>인지 <b>음성</b>인지 판정하고 확인해요.',
          hint: '환자 카드를 눌러 고르고, 오른쪽 위 판정 버튼을 눌러요. 형광이 기준선(50 %)을 넘으면 양성이에요. 병원체 B를 가진 환자는 어떨까요?',
          setup() { pcrNewRoles(); PC.primer = 'A'; PC.sel = 0; ensure('pcr'); },
          check: () => pcrCheck(),
          explain: '병원체 A의 프라이머는 <b>A의 염기 서열에만 붙어요</b>. 그래서 A를 가진 환자의 검체만 사이클마다 2배씩 늘어 기준선을 넘고, 병원체가 없거나 <b>다른 병원체(B)</b>를 가진 환자는 ' + MAXC + '사이클이 되어도 증폭되지 않아요. 처음 양이 많은 환자는 Ct가 ' + CT_HI + ', 적은 환자는 Ct가 ' + CT_LO + '로 나타나요.',
        },
        {
          type: 'quiz', title: 'Ct 값 읽기', goal: '두 양성 환자 중 한 명은 <b>Ct ' + CT_HI + '</b>, 다른 한 명은 <b>Ct ' + CT_LO + '</b>이었어요. (Ct: 형광이 기준선을 넘는 사이클 수) 처음 병원체의 양은 어땠을까요?',
          setup() { ensure('pcr'); },
          choices: ['Ct ' + CT_LO + '인 환자가 약 ' + comma(RATIO) + '배 많았다', 'Ct ' + CT_HI + '인 환자가 약 ' + comma(RATIO) + '배(2의 ' + (CT_LO - CT_HI) + '제곱) 많았다. 한 사이클마다 2배씩 늘어나서 기준선에 먼저 닿으려면 처음 양이 많아야 한다', 'Ct ' + CT_HI + '인 환자가 약 ' + (CT_LO - CT_HI) + '배 많았다', '두 환자의 처음 양은 같다. Ct는 검사 시간일 뿐이다'],
          answer: 1,
          feedback: ['Ct가 큰 쪽은 기준선에 늦게 닿았어요. 처음 양이 어땠을지 생각해 봐요.', '', '사이클마다 2배씩 곱해져요. 10사이클 차이면 몇 배일까요?', 'Ct는 형광이 기준선을 넘는 사이클 수로, 처음 양과 관련이 있어요.'],
          explain: '목표 DNA는 사이클마다 <b>2배</b>가 돼요. Ct가 ' + (CT_LO - CT_HI) + '만큼 작은 환자는 처음 양이 2<sup>' + (CT_LO - CT_HI) + '</sup> = ' + comma(RATIO) + '배, 즉 약 1000배 많았다는 뜻이에요. 30사이클이면 2<sup>30</sup> ≈ 10억 배로 늘어나서, 아주 적은 양도 찾을 수 있어요.',
        },
        {
          type: 'quiz', title: '프라이머가 맞지 않으면?', goal: '병원체 A의 프라이머로는 병원체 B의 DNA가 늘어나지 않았어요. 그 까닭은?',
          setup() { ensure('pcr'); },
          choices: ['프라이머는 어떤 DNA에나 붙기 때문에 증폭이 잘 된다', '프라이머는 찾으려는 염기 서열과 짝이 맞는 자리에만 붙고, 붙어야 새 가닥이 만들어지기 때문이다', 'B의 DNA는 온도가 올라가면 모두 파괴되기 때문이다', '병원체 B에는 DNA가 없기 때문이다'],
          answer: 1,
          feedback: ['프라이머가 어디에나 붙으면 병원체를 구별할 수 없어요. 결합 단계를 다시 봐요.', '', '변성 단계에서는 모든 DNA가 두 가닥으로 풀릴 뿐이에요.', '병원체 B도 고유한 염기 서열의 핵산을 가져요.'],
          explain: '프라이머는 <b>짝이 맞는 염기 서열에만</b> 붙어요. 붙지 못하면 새 가닥이 만들어지지 않아 증폭되지 않지요. 이 성질 덕분에 PCR은 <b>찾으려는 병원체만</b> 정확히 알아낼 수 있어요. 새 병원체의 염기 서열이 알려지면 그 서열에 맞는 프라이머만 새로 만들면 되어서, 빠르게 진단 시약을 개발할 수 있어요.',
        },
      ],
    },
    {
      title: '단백질로 찾는 항원 검사', short: '단백질 진단', icon: '🧪', phase: '실험', features: ['rapid'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> PCR은 핵산(염기 서열)을 늘려서 병원체를 찾았어요.</div>' +
        '<p>이번에는 병원체의 <b>표면 단백질(항원)</b>을 찾는 <b>항원 검사 키트</b>예요. 검체가 <b>모세관 현상</b>으로 막을 따라 이동하며, 금 입자가 붙은 <b>항체</b>와 항원이 결합해요. <b>시험선(T)</b>과 <b>대조선(C)</b>에 나타난 색 선으로 결과를 읽어요. 환자 4명을 검사해요. (실제 키트는 약 ' + RAPID_MIN + '분이 걸리고, 화면에서는 약 ' + RAPID_SEC + '초로 줄여 보여 줘요.)</p>',
      setup() { rapidReset(); ensure('rapid'); },
      recap: '항원 검사는 <b>항체와 항원의 특이적 결합</b>으로 색 선을 만들어요. <b>T선 + C선</b>은 양성, <b>C선만</b>은 음성, <b>C선이 없으면</b> 무효예요.',
      summary: '<ul><li><b>항원 검사</b>: 키트의 시험선(T)에 병원체의 <b>항원</b>과 결합하는 <b>항체</b>가 붙어 있어요. 항원과 항체는 열쇠와 자물쇠처럼 <b>모양이 맞는 것끼리만</b>(특이적으로) 결합해요.</li>' +
        '<li>결과 읽기: <b>T선 + C선 두 줄</b> = 양성 · <b>C선만</b> = 음성 · <b>C선 없음</b> = 무효(다시 검사). C선은 검사가 제대로 되었는지 확인하는 선이에요.</li>' +
        '<li>장점: 약 15분 안에 현장에서 결과를 알 수 있어요. 단점: 바이러스가 적은 초기에는 놓칠 수 있어요(<b>위음성</b>).</li></ul>',
      missions: [
        {
          id: 'rapid', title: '항원 검사 4명 판정하기', manual: true,
          goal: '환자 4명을 모두 검사하고 결과를 읽어 <b>양성 · 음성 · 무효</b>로 판정한 뒤 확인해요.',
          hint: '환자를 고르고 💧 검체 떨어뜨리기를 눌러요. T선과 C선이 모두 보이면 양성, C선만 보이면 음성, C선이 없으면 무효예요.',
          setup() { rapidReset(); ensure('rapid'); },
          check: () => rapidCheck(),
          explain: '병원체의 항원이 있으면 금 입자 항체와 결합한 항원이 <b>T선</b>에서 붙잡혀 색 선이 생겨요. 항원이 없어도 남은 금 입자 항체는 <b>C선</b>에서 붙잡혀요. 그래서 <b>C선은 검사가 제대로 되었을 때 항상</b> 나타나요. C선이 없으면 T선이 보여도 결과를 믿을 수 없어서 <b>무효</b>예요.',
        },
        {
          type: 'quiz', title: 'C선이 없다면?', goal: '키트에 T선이 선명하게 보이는데 C선이 없어요. 올바른 판단은?',
          setup() { ensure('rapid'); },
          choices: ['T선이 보이니 양성이다', 'C선이 없으면 검사가 제대로 되지 않은 것이라 결과를 믿을 수 없다. 새 키트로 다시 검사해야 한다', 'C선이 없으니 음성이다', 'T선이 보이면 C선은 없어도 된다'],
          answer: 1,
          feedback: ['C선이 없으면 T선의 결과도 믿을 수 없어요. 검사가 제대로 되었는지 확인하는 선이 C선이에요.', '', 'C선이 있어야 음성도 믿을 수 있어요. C선이 없으면 어떤 결과도 확정할 수 없어요.', 'C선은 항상 나타나야 하는 선이에요.'],
          explain: '<b>C선(대조선)</b>은 검체가 막을 따라 제대로 이동했는지 확인해 주는 선이에요. C선이 없으면 검체가 부족하거나 키트에 문제가 있어서 <b>결과를 믿을 수 없으므로</b> 새 키트로 다시 검사해야 해요.',
        },
        {
          type: 'quiz', title: '항원과 항체의 결합', goal: '항체가 병원체의 항원에만 결합하는 까닭으로 알맞은 것은?',
          setup() { ensure('rapid'); },
          choices: ['항체는 어떤 단백질에나 달라붙기 때문이다', '항체는 모양이 맞는 특정 항원에만 결합하기 때문이다 (열쇠와 자물쇠처럼 특이적 결합)', '항원과 항체는 서로 밀어내기 때문이다', '항체는 핵산에만 결합하기 때문이다'],
          answer: 1,
          feedback: ['아무 단백질에나 붙으면 병원체를 구별할 수 없어요. 입자 모형을 다시 봐요.', '', '▲ 모양의 항원은 결합하지 못하고 튕겨 나갔어요.', '항체는 단백질과 결합해요.'],
          explain: '항체의 결합 자리는 <b>특정 항원의 모양에만</b> 맞아서, 모양이 다른 항원은 결합하지 못해요. 이런 <b>특이적 결합</b> 덕분에 항원 검사는 찾으려는 병원체의 단백질만 가려낼 수 있어요.',
        },
      ],
    },
    {
      title: '두 검사, 어떻게 골라 쓸까요?', short: '결과 해석', icon: '📊', phase: '분석', features: ['cmp'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> PCR(핵산)과 항원 검사(단백질)로 병원체를 찾아봤어요. 두 검사는 장단점이 서로 달라요.</div>' +
        '<p>두 검사를 비교하는 표를 완성하고, 환자 사례마다 어떤 검사가 더 알맞은지 골라요. 마지막으로 <b>"검사가 음성이면 감염되지 않은 것이다"</b>라는 말을 <b>자료 점검</b>의 눈으로 따져 봐요. (과학이 감염병 문제를 푸는 데 어떻게 쓰이는지 정리하는 단계예요.)</p>',
      setup() { mkB(); ensure('cmp', 'table'); },
      recap: '<b>PCR</b>은 민감하지만 시간이 걸리고 장비가 필요하고, <b>항원 검사</b>는 빠르고 현장에서 쓰지만 초기에는 놓칠 수 있어요. 상황에 맞는 검사를 고르고, 한 번의 결과를 지나치게 믿지 않아야 해요.',
      summary: '<table class="mini"><tr><th></th><th>핵산 진단 (PCR)</th><th>항원 검사</th></tr>' +
        '<tr><th>시간</th><td>수 시간</td><td>약 15분</td></tr><tr><th>장소</th><td>검사실</td><td>현장</td></tr><tr><th>초기 감염</th><td>높음</td><td>낮음</td></tr><tr><th>준비물</th><td>프라이머 · 장비</td><td>항체 키트</td></tr></table>' +
        '<ul><li>증상이 없는 접촉자, 감염 초기처럼 <b>바이러스가 적을 때</b>는 PCR이, 많은 사람을 <b>빠르게 현장에서</b> 가릴 때는 항원 검사가 알맞아요.</li>' +
        '<li><b>위음성</b>: 감염되었는데 검사에서 음성이 나오는 것. 신속 검사가 음성이어도 감염을 배제할 수 없어서 증상 · 접촉 여부를 함께 보고, 필요하면 PCR로 다시 확인해요.</li>' +
        '<li>병원체의 염기 서열이 공개되면 프라이머만 새로 만들어 진단 시약을 빨리 만들 수 있어요. (코로나19 유전체 서열(약 3만 염기)이 공개된 뒤 수 주 만에 진단 시약이 개발된 사례)</li></ul>',
      missions: [
        {
          id: 'table', title: '두 검사 비교표 완성하기', manual: true,
          goal: '카드 8장을 끌어 두 검사의 <b>시간 · 장소 · 초기 감염 찾기 · 준비물</b> 칸에 놓고 <b>✔ 확인하기</b>를 눌러요.',
          hint: 'PCR은 정확하지만 장비와 시간이 필요해요. 항원 검사는 빠르고 간편하지만 바이러스가 적은 초기에는 놓칠 수 있어요.',
          setup() { mkB(); buildTable(); ensure('cmp', 'table'); },
          check: () => tableCheck(),
          explain: '<b>PCR</b>은 DNA를 수십억 배로 늘려서 적은 양도 찾아내지만, 장비와 검사 인력이 필요하고 수 시간이 걸려요. <b>항원 검사</b>는 약 15분 만에 현장에서 결과를 알 수 있지만, 병원체가 적은 초기에는 항원이 모자라 놓칠 수 있어요.',
        },
        {
          id: 'cases', title: '환자에게 알맞은 검사 고르기', manual: true,
          goal: '환자 사례 4장을 더 알맞은 검사 칸(PCR / 항원 검사)에 나눠 놓고 확인해요.',
          hint: '바이러스가 적을 수 있는 사람에게는 적은 양도 찾는 검사가, 빨리 많은 사람을 가려내야 할 때는 빠른 현장 검사가 알맞아요.',
          setup() { mkB(); buildCases(); ensure('cmp', 'cases'); },
          check: () => casesCheck(),
          explain: '증상이 없는 접촉자나 감염 초기의 사람은 몸속 바이러스가 적을 수 있어서 <b>PCR</b>이 알맞아요. 바이러스가 많은 환자나 행사장에서 많은 사람을 빨리 가릴 때는 <b>항원 검사</b>가 알맞아요. 이렇게 병원체의 핵산과 단백질의 특징을 이용한 진단 기술은 감염병을 빠르게 찾아내는 데 과학이 얼마나 쓸모 있는지 보여 줘요.',
        },
        {
          type: 'quiz', title: '자료 점검: 음성이면 안전할까?', goal: '"신속 항원 검사에서 음성이 나왔으니 감염되지 않은 것이 확실하다"는 말의 문제점으로 알맞은 것은?',
          setup() { mkB(); ensure('cmp'); },
          choices: ['문제없다. 검사는 항상 정확하다', '바이러스가 적은 초기에는 항원 검사가 놓칠 수 있어서(위음성), 음성이어도 감염되지 않았다고 단정할 수 없다. 증상과 접촉 여부를 함께 보고 필요하면 PCR로 다시 확인한다', '항원 검사의 양성 결과는 믿을 수 없다는 뜻이다', '신속 검사는 병원체와 관계없이 아무 단백질에나 반응해서 믿을 수 없다'],
          answer: 1,
          feedback: ['검사마다 놓칠 수 있는 경우가 있어요. 표의 "초기 감염 찾기" 칸을 다시 봐요.', '', '문제는 음성 결과를 지나치게 믿는 데 있어요.', '항원 검사는 특정 항원에만 결합해요. 문제는 양이 적을 때 놓칠 수 있다는 점이에요.'],
          explain: '항원 검사는 바이러스가 적은 초기에는 항원이 모자라 <b>놓칠 수 있어요(위음성)</b>. 하나의 검사 결과로 단정하지 않고 <b>증상, 접촉 여부, 검사 방법의 한계</b>를 함께 따져 보는 것이 자료를 비판적으로 평가하는 태도예요. 이렇게 과학적 근거를 바탕으로 판단하는 것이 감염병 대응에 과학이 필요한 까닭이에요.',
        },
      ],
    },
  ];

  /* =========================================================
     시작
     ========================================================= */
  mkB();
  bindUI();
  game = SciSim.game({
    simId: 'h1-diagnosis', mount: '#game', badge: '감염병 진단 탐정', homeHref: '../../index.html#h1b',
    featureLabels: { path: '🦠 가상 병원체 3종 · 단서 비교', pcr: '🧬 PCR 장치 · 형광 곡선', rapid: '🧪 항원 검사 키트 · 입자 모형', cmp: '📊 비교표 · 환자 사례' },
    onFeatures(set) { F = set; ctlUpdate(); },
    levels,
  });
  ctlUpdate();
  showHint(MODE_HINT.path, 5000);

  let lastFree = false, lastKey = '';
  SciSim.loop((dt, t) => {
    S.t = t;
    if (game && game.free !== lastFree) { lastFree = game.free; ctlUpdate(); }
    const ph = game ? game.phase : '';
    if (ph === 'success' && S.ph !== 'success') {
      S.okAt = t; parts.burst(VW - 40, 40, { count: 28, speed: 210 });
      const cm = game.current();
      if (cm && cm.id === 'identify') PA.reveal = true;
      if (cm && cm.id === 'pcr') PC.revealed = true;
    }
    S.ph = ph;
    const key = [PC.n, PC.u >= 0, PC.queue, RP.run && RP.run.done, RP.sel, PC.sel, CM.sub, PA.viewed.size, S.mode].join('|');
    if (key !== lastKey) { lastKey = key; ctlUpdate(); }
    parts.update(dt);
    view.clear('#f1f6f2');
    ctx.setTransform(view.scale * view.dpr, 0, 0, view.scale * view.dpr, 0, 0);
    if (S.mode === 'path') drawPath(t, dt); else if (S.mode === 'pcr') drawPCR(t, dt); else if (S.mode === 'rapid') drawRapid(t, dt); else drawCmp(t, dt);
    parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(255,255,255,' + S.fade * 0.85 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : approach(S.fade, 0, dt, 9); }
    if (isNewF(S.mode)) newTag();
    const k = t - S.okAt;
    if (k >= 0 && k < 1.6) { ctx.save(); ctx.globalAlpha = 1 - clamp((k - 1.1) / 0.5, 0, 1); D.check(VW - 40, 40, 22 * SciSim.ease.outBack(Math.min(1, k / 0.4)), Math.min(1, k / 0.45)); ctx.restore(); }
    doReadouts();
  });

  window.__sim = {
    S, PA, PC, RP, CM, PATH, SAMPLE_ROLES, VW, VH, MAXC, CT_HI, CT_LO, get game() { return game; },
    setMode, ensure, ctlUpdate, sampleOf, ctOf, copiesAt, fluoOf, pcrRun, pcrReset, pcrSetPrimer, rapidStart, rapidSelect, pathSelect, pathPos, pcrCardAt, rapidCardAt, PCL, RL, TL, CL, foldLabel, bigKo, cmpBoard,
    solveTable() { const b = CM.tableBoard; b.items.forEach((c) => { const s = b.slots.find((q) => q.row === c.row && q.col === c.col); b.place(c, s); }); },
    solveCases() { const b = CM.caseBoard; b.items.forEach((c) => { const s = b.slots.find((q) => q.id === c.want); b.place(c, s); }); },
    pcrFinish() { PC.n = MAXC; PC.u = -1; PC.queue = 0; },
  };
})();
