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

  initStage('#f1f4f8', 800, 560, 600, 840);
  const SUBJ = '#64748b';
  const chk = (ok, label) => mark(ok) + ' ' + label;

  /* =========================================================
     자료 (가상 마을 · 단순화한 교육용 예시)
     ========================================================= */
  const BASECOL = { A: '#16a34a', T: '#e11d48', G: '#f59e0b', C: '#2563eb' };
  const REF = 'ATGCCTAGGTCAACGTTGCA';
  const withEdits = (base, edits) => { const a = base.split(''); edits.forEach((e) => { a[e[0]] = e[1]; }); return a.join(''); };
  const V1 = withEdits(REF, [[5, 'G']]), V2 = withEdits(REF, [[12, 'C']]), V3 = withEdits(V1, [[16, 'C']]), V4 = withEdits(V2, [[2, 'T']]);
  const VX = withEdits(REF, [[0, 'G'], [4, 'T'], [8, 'A'], [11, 'T'], [14, 'C'], [18, 'G']]);
  const VARS = [
    { name: '기준과 같음', short: 'V0', col: '#f59e0b' }, { name: '변이 ①', short: 'V1', col: '#3b82f6' }, { name: '변이 ②', short: 'V2', col: '#10b981' },
    { name: '변이 ①+', short: 'V3', col: '#8b5cf6' }, { name: '변이 ②+', short: 'V4', col: '#f97316' }, { name: '많이 다름', short: 'VX', col: '#ef4444' },
  ];
  // 확진자 12명: id → 확진일(6월), 증상 시작일, 서열, 변이 번호
  const CASE = {
    18: { day: 9, onset: null, seq: REF, v: 0 },
    7: { day: 5, onset: 4, seq: V1, v: 1 }, 22: { day: 7, onset: 6, seq: V1, v: 1 }, 3: { day: 8, onset: 7, seq: V1, v: 1 }, 41: { day: 8, onset: 7, seq: V1, v: 1 }, 9: { day: 11, onset: 10, seq: V1, v: 1 }, 15: { day: 10, onset: 9, seq: V1, v: 1 },
    35: { day: 6, onset: 5, seq: V2, v: 2 }, 12: { day: 9, onset: 8, seq: V2, v: 2 },
    29: { day: 10, onset: 9, seq: V3, v: 3 }, 44: { day: 10, onset: 9, seq: V4, v: 4 },
    26: { day: 7, onset: 6, seq: VX, v: 5 },
  };
  const ROOT = 18, FIRST = 7, IMPORT = 26;
  const diffN = (a, b) => { let n = 0; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) n++; return n; };
  const CLUSTERS = [
    { name: '🏠 동네', kind: '가족·이웃', m: [18, 7, 22, 3, 1, 2, 4, 5, 6, 8], c: [150, 158] },
    { name: '🏫 학교·학원', kind: '학교·학원', m: [41, 9, 29, 15, 10, 11, 13, 14, 16, 17], c: [418, 150] },
    { name: '🛒 시장', kind: '시장', m: [35, 12, 44, 19, 20, 21, 23, 24], c: [132, 408] },
    { name: '🏢 직장', kind: '직장', m: [25, 27, 28, 30, 31, 32, 33, 34, 36, 37], c: [424, 416] },
    { name: '☕ 카페·모임', kind: '카페·모임', m: [26, 38, 39, 40, 42, 43, 45, 46, 47, 48, 49, 50], c: [282, 282] },
  ];
  const CL_OF = {}; CLUSTERS.forEach((c, ci) => c.m.forEach((id) => { CL_OF[id] = ci; }));
  const TREE = [[18, 7], [18, 22], [18, 35], [7, 3], [7, 41], [22, 29], [22, 15], [35, 12], [35, 44], [41, 9]];
  // 접촉 관계 만들기 (고정된 난수)
  const EDGES = [];
  const edgeKey = (a, b) => (a < b ? a + '-' + b : b + '-' + a);
  const EDGE_SET = new Set();
  function addEdge(a, b, kind) { if (a === b) return; const k = edgeKey(a, b); if (EDGE_SET.has(k)) return; EDGE_SET.add(k); EDGES.push({ a, b, kind: kind || (CL_OF[a] === CL_OF[b] ? CLUSTERS[CL_OF[a]].kind : '기타 모임'), day: 0 }); }
  (function buildEdges() {
    const rd = rng(20231);
    TREE.forEach((e) => addEdge(e[0], e[1]));
    CLUSTERS.forEach((c) => { c.m.forEach((id, i) => { addEdge(id, c.m[(i + 1) % c.m.length]); const j = Math.floor(rd() * c.m.length); if (!(CASE[id] && CASE[c.m[j]] && id !== ROOT)) addEdge(id, c.m[j]); }); });
    // 마을 안 다른 모임을 이어 주는 접촉 (수입 사례 26번은 확진자와 이어지지 않아요)
    const cross = [[1, 25], [10, 19], [24, 37], [5, 36], [16, 40], [14, 27], [21, 30], [2, 11], [8, 20], [45, 33], [38, 31], [43, 23], [47, 4], [49, 13]];
    cross.forEach((e) => addEdge(e[0], e[1]));
    EDGES.forEach((e) => { const h = (e.a * 31 + e.b * 17) % 9; e.day = 1 + h; });
  })();
  const NEIGH = {}; for (let i = 1; i <= 50; i++) NEIGH[i] = [];
  EDGES.forEach((e) => { NEIGH[e.a].push({ id: e.b, kind: e.kind, day: e.day }); NEIGH[e.b].push({ id: e.a, kind: e.kind, day: e.day }); });
  const isCase = (id) => !!CASE[id];

  /* 확산 모형 */
  const R0_BASE = 3.0;
  const GENS = 9;                                              // 0~8일
  const Ngen = (R, g) => Math.pow(R, g);
  const fmtN = (v) => (v >= 100 ? comma(v) : v.toFixed(1));
  const FACT = { m: 0.7, d: 0.6, i: [0.5, 0.6, 0.75], t: 0.8 };
  const COSTS = { m: 5, d: 40, i: 20, t: 15 };
  const COST_MAX = COSTS.m + COSTS.d + COSTS.i + COSTS.t;
  const IDELAY_LABEL = ['당일', '1일 늦음', '2일 이상 늦음'];
  const MEAS = [
    { id: 'm', icon: '😷', name: '마스크', short: '마스크', desc: '비말을 줄여요' },
    { id: 'd', icon: '↔️', name: '거리두기', short: '거리두기', desc: '접촉을 줄여요' },
    { id: 'i', icon: '🧪', name: '신속 진단 + 격리', short: '진단 + 격리', desc: '빨리 찾아 분리해요' },
    { id: 't', icon: '📞', name: '접촉자 추적', short: '접촉자 추적', desc: '접촉한 사람을 찾아요' },
  ];

  /* 상태 */
  let game = null;
  let F = new Set();
  const free = () => !!(game && game.free);
  const hasF = (f) => F.has(f) || free();
  const isNewF = (f) => !!(game && game.isNew(f));
  const S = { mode: 'trace', t: 0, fade: 0, ph: '', okAt: -9 };
  const TR = { sel: null, hover: null, varOn: false, replay: null, popAt: {}, wrongShake: {} };
  const SP = { R: 1.5, disp: [], hit: { grow: false, flat: false, stop: false } };
  for (let g = 0; g < GENS; g++) SP.disp.push(Ngen(1.5, g));
  const MS = { on: { m: false, d: false, i: false, t: false }, delay: 0, found: [], foundKeys: new Set(), t: 9, rdisp: R0_BASE, pops: {} };
  const AR = { board: null, shown: false };
  const factorsOf = (on, delay) => { const f = []; if (on.m) f.push(['마스크', FACT.m]); if (on.d) f.push(['거리두기', FACT.d]); if (on.i) f.push(['신속 진단 + 격리', FACT.i[delay]]); if (on.t) f.push(['접촉자 추적', FACT.t]); return f; };
  const Rof = (on, delay) => factorsOf(on, delay).reduce((r, x) => r * x[1], R0_BASE);
  const costOfOn = (on) => (on.m ? COSTS.m : 0) + (on.d ? COSTS.d : 0) + (on.i ? COSTS.i : 0) + (on.t ? COSTS.t : 0);
  const keyOf = (on) => ['m', 'd', 'i', 't'].filter((k) => on[k]).join('');
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
  function baseChip(x, y, ch, w, h, o) {
    o = o || {};
    ctx.save(); const c = BASECOL[ch] || '#64748b';
    ctx.fillStyle = c; rr(x - w / 2, y - h / 2, w, h, 5).fill();
    if (o.outline) { ctx.strokeStyle = rgba('#0f172a', 0.6 + 0.4 * Math.sin(S.t * 6)); ctx.lineWidth = 2.5; rr(x - w / 2 - 1.5, y - h / 2 - 1.5, w + 3, h + 3, 6).stroke(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(x - 4, y + h / 2 + 9); ctx.lineTo(x + 4, y + h / 2 + 9); ctx.lineTo(x, y + h / 2 + 3); ctx.fill(); }
    TX(x, y + h * 0.2, ch, { size: h * 0.62 / FS, weight: 800, color: '#fff' });
    ctx.restore();
  }
  function exampleNote() { exampleTag(VW - 12, PHONE ? 42 : 26, '교육용 예시 · 단순화한 가정'); }
  const dayLabel = (d) => '6월 ' + d + '일';

  /* =========================================================
     ① 감염 경로: 가상 마을 접촉 네트워크 + 염기 서열 비교
     ========================================================= */
  const MAP = PHONE ? { x: 6, y: 52, w: 588, h: 516 } : { x: 8, y: 50, w: 540, h: 498 };
  const CENTERS = PHONE ? [[148, 162], [446, 160], [138, 424], [458, 432], [298, 296]] : CLUSTERS.map((c) => c.c);
  const NODE_R = PHONE ? 14.5 : 14;
  const POS = {};
  (function layout() {
    CLUSTERS.forEach((c, ci) => {
      const n = c.m.length, nIn = n >= 12 ? 4 : n >= 10 ? 3 : 2, nOut = n - nIn, ctr = CENTERS[ci];
      c.m.forEach((id, i) => {
        if (i < nIn) { const a = (i / nIn) * TAU + 0.6 + ci; POS[id] = { x: ctr[0] + Math.cos(a) * 33, y: ctr[1] + Math.sin(a) * 33 }; }
        else { const k = i - nIn, a = (k / nOut) * TAU + ci * 0.5 - 1.2; POS[id] = { x: ctr[0] + Math.cos(a) * 80, y: ctr[1] + Math.sin(a) * 80 }; }
      });
    });
  })();
  const INFO = PHONE ? { x: 6, y: 576, w: 588, h: 254 } : { x: 556, y: 50, w: 238, h: 498 };
  const nodeAt = (p) => { let best = null, bd = 1e9; for (let id = 1; id <= 50; id++) { const q = POS[id], d = Math.hypot(p.x - q.x, p.y - q.y); if (d <= NODE_R + 9 && d < bd) { bd = d; best = id; } } return best; };
  function traceSelect(id) { TR.sel = id; TR.selT = S.t; Sound.click(); }
  function replayStart() { TR.replay = { day: 3, tick: 0 }; Sound.click(); }
  const isRedAt = (id) => { if (!isCase(id)) return false; return !TR.replay || CASE[id].day <= TR.replay.day; };

  function drawTrace(t, dt) {
    ctx.fillStyle = '#f1f4f8'; ctx.fillRect(0, 0, VW, VH);
    if (TR.replay) { TR.replay.tick += dt; if (TR.replay.tick > 0.9) { TR.replay.tick = 0; TR.replay.day++; if (TR.replay.day > 12) { TR.replay = null; } } }
    // 마을 판
    panel(MAP.x, MAP.y, MAP.w, MAP.h, { fill: '#f8fafc' });
    CLUSTERS.forEach((c, ci) => {
      const ctr = CENTERS[ci];
      ctx.save(); ctx.fillStyle = rgba('#94a3b8', 0.1); ctx.beginPath(); ctx.arc(ctr[0], ctr[1], 104, 0, TAU); ctx.fill(); ctx.setLineDash([5, 5]); ctx.strokeStyle = rgba('#94a3b8', 0.4); ctx.lineWidth = 1.5; ctx.stroke(); ctx.restore();
      TX(ctr[0], ctr[1] - 112, c.name, { size: 13.5, weight: 800, color: '#64748b' });
    });
    const sel = TR.sel;
    const neigh = sel ? new Set(NEIGH[sel].map((q) => q.id)) : null;
    // 접촉 선
    EDGES.forEach((e) => {
      const a = POS[e.a], b = POS[e.b], hot = sel && (e.a === sel || e.b === sel);
      ctx.save();
      if (hot) { ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 2.6; ctx.setLineDash([7, 5]); ctx.lineDashOffset = -t * 30; }
      else { ctx.strokeStyle = 'rgba(100,116,139,.22)'; ctx.lineWidth = 1.2; }
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); ctx.restore();
    });
    // 계통 선: 서열이 한 글자만 다르고 접촉한 확진자끼리
    if (TR.varOn) {
      EDGES.forEach((e) => {
        if (!isCase(e.a) || !isCase(e.b)) return;
        if (diffN(CASE[e.a].seq, CASE[e.b].seq) !== 1) return;
        const a = POS[e.a], b = POS[e.b];
        ctx.save(); ctx.strokeStyle = '#7c3aed'; ctx.lineWidth = 4; ctx.globalAlpha = 0.85; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); ctx.restore();
      });
    }
    // 사람
    for (let id = 1; id <= 50; id++) {
      const p = POS[id], cs = CASE[id], red = isRedAt(id), isSel = sel === id, near = neigh && neigh.has(id);
      let col = '#cbd5e1', edge = '#94a3b8';
      if (red) { col = TR.varOn ? VARS[cs.v].col : '#ef4444'; edge = shade(col, -0.35); }
      ctx.save();
      if (near && !isSel) { ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 2; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.arc(p.x, p.y, NODE_R + 5, 0, TAU); ctx.stroke(); ctx.setLineDash([]); }
      if (isSel) { const k = 0.5 + 0.5 * Math.sin(t * 5); ctx.strokeStyle = rgba('#0f172a', 0.9); ctx.lineWidth = 3.5; ctx.beginPath(); ctx.arc(p.x, p.y, NODE_R + 6 + k * 2, 0, TAU); ctx.stroke(); }
      if (red && TR.replay && CASE[id].day === TR.replay.day) D.glow(p.x, p.y, 30, '#ef4444', 0.55 * (1 - TR.replay.tick / 0.9));
      D.sphere(p.x, p.y, NODE_R, col, { shadow: red, outline: edge, outlineWidth: 1.5 });
      TX(p.x, p.y + 4.6, String(id), { size: 12.5, weight: 800, color: red ? '#fff' : '#334155' });
      ctx.restore();
    }
    // 변이 범례
    if (TR.varOn) {
      let lx = MAP.x + 10; const ly = MAP.y + MAP.h - 14;
      VARS.forEach((v) => { ctx.fillStyle = v.col; ctx.beginPath(); ctx.arc(lx + 6, ly - 4, 6, 0, TAU); ctx.fill(); TX(lx + 16, ly, v.name, { size: 11.5, align: 'left', weight: 800, color: '#334155' }); ctx.save(); ctx.font = D.font(11.5, 800); lx += 26 + ctx.measureText(v.name).width; ctx.restore(); });
    } else pill(MAP.x + 10, MAP.y + MAP.h - 16, '🔴 확진자  ⚪ 그 밖의 사람 (확진 전)', { size: 12, bg: 'rgba(255,255,255,.9)', color: '#334155', border: '#cbd5e1', align: 'left', pad: 9 });
    if (TR.replay) pill(MAP.x + MAP.w / 2, MAP.y + 18, '📅 ' + dayLabel(TR.replay.day) + ' · 확진자 ' + Object.keys(CASE).filter((k) => CASE[k].day <= TR.replay.day).length + '명', { size: 14, bg: '#0f172a', color: '#fff', border: null, pad: 12 });
    drawInfoCard(t);
    exampleNote();
  }

  function drawInfoCard(t) {
    const I = INFO, id = TR.sel;
    panel(I.x, I.y, I.w, I.h);
    if (!id) {
      TX(I.x + I.w / 2, I.y + I.h / 2 - 12, '사람을 눌러 보세요', { size: 17, weight: 800, color: '#64748b' });
      drawWrap(I.x + I.w / 2, I.y + I.h / 2 + 14, '확진자를 누르면 접촉 기록과 바이러스의 염기 서열이 나와요.', I.w - 30, 13, { color: '#94a3b8', weight: 700 });
      return;
    }
    const cs = CASE[id];
    let y = I.y + 28;
    TX(I.x + 14, y, id + '번 ' + (cs ? '확진자' : '접촉자'), { size: 18, align: 'left', weight: 800, color: cs ? '#b91c1c' : '#334155' });
    y += 24;
    if (cs) {
      TX(I.x + 14, y, '확진일: ' + dayLabel(cs.day), { size: 13.5, align: 'left', weight: 700, color: '#334155' }); y += 20;
      TX(I.x + 14, y, cs.onset ? '증상 시작: ' + dayLabel(cs.onset) + ' (발열·기침)' : '증상 없음 (접촉자 검사로 확인)', { size: 13.5, align: 'left', weight: 700, color: '#334155' }); y += 24;
    } else { TX(I.x + 14, y, '검사 결과: 음성 또는 검사 전', { size: 13.5, align: 'left', weight: 700, color: '#475569' }); y += 24; }
    TX(I.x + 14, y, '📋 최근 접촉 기록', { size: 14, align: 'left', weight: 800, color: '#0f172a' }); y += 8;
    const list = NEIGH[id].slice().sort((a, b) => a.day - b.day).slice(0, PHONE ? 4 : 6);
    list.forEach((q) => { y += 19; const red = isCase(q.id); TX(I.x + 18, y, (red ? '🔴 ' : '⚪ ') + q.id + '번 · ' + q.kind + ' · ' + q.day + '일 전', { size: 12.5, align: 'left', weight: 700, color: red ? '#b91c1c' : '#475569' }); });
    y += 28;
    if (cs) {
      const bx = PHONE ? I.x + 300 : I.x + 14;
      if (PHONE) y = I.y + 34;
      TX(bx, y, '🧬 바이러스 염기 서열', { size: 14, align: 'left', weight: 800, color: '#0f172a' }); y += 14;
      const cw = PHONE ? 26 : 19, chh = PHONE ? 26 : 22, x0 = bx + cw / 2;
      const seqRow = (seq, ref, yy) => { for (let r = 0; r < 2; r++) for (let i = 0; i < 10; i++) { const k = r * 10 + i; baseChip(x0 + i * (cw + 1), yy + r * (chh + 6), seq[k], cw, chh, { outline: ref && seq[k] !== ref[k] }); } };
      TX(bx, y + 4, '기준 서열', { size: 12, align: 'left', weight: 800, color: '#64748b' });
      seqRow(REF, null, y + 18);
      y += 2 * (chh + 6) + 24;
      TX(bx, y + 4, id + '번 확진자의 서열 (다른 글자는 테두리)', { size: 12, align: 'left', weight: 800, color: '#64748b' });
      seqRow(cs.seq, REF, y + 18);
      y += 2 * (chh + 6) + 28;
      const dn = diffN(cs.seq, REF);
      TX(bx, y + 6, '기준 서열과 다른 글자: ' + dn + '개', { size: 14, align: 'left', weight: 800, color: dn === 0 ? '#166534' : dn >= 4 ? '#b91c1c' : '#1d4ed8' });
      if (TR.varOn) TX(bx, y + 26, '변이: ' + VARS[cs.v].name, { size: 12.5, align: 'left', weight: 800, color: VARS[cs.v].col });
    }
  }
  function traceCheck() {
    if (!TR.sel) return '첫 감염원이라고 생각하는 확진자를 눌러서 골라 주세요.';
    if (!isCase(TR.sel)) return '확진자 중에서 골라 주세요. (🔴 빨간 사람)';
    if (TR.sel === ROOT) return true;
    const dn = diffN(CASE[TR.sel].seq, REF);
    if (TR.sel === FIRST) return '<b>' + FIRST + '번</b>은 가장 먼저 확진되었지만(' + dayLabel(CASE[FIRST].day) + '), 서열이 기준과 ' + dn + '글자 달라요. 먼저 확진된 사람이 반드시 첫 감염원은 아니에요. 서열을 비교해 봐요.';
    if (TR.sel === IMPORT) return '<b>' + IMPORT + '번</b>은 서열이 기준과 ' + dn + '글자나 다르고, 다른 확진자와 접촉 기록으로 이어지지도 않아요. 마을 안의 첫 감염원은 아니에요.';
    return '<b>' + TR.sel + '번</b>의 서열은 기준과 ' + dn + '글자 달라요. 바이러스는 퍼지면서 서열이 조금씩 바뀌어요. 기준 서열과 <b>같은</b> 확진자를 찾아봐요. (🧬 변이 색으로 보기를 눌러도 좋아요)';
  }
  /* =========================================================
     ② 확산 그래프: R = 감염자 1명이 평균 감염시키는 사람 수
     ========================================================= */
  const GEN_COL = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', '#0ea5e9'];
  const niceMax = (v) => { if (v <= 2) return 2; const e = Math.pow(10, Math.floor(Math.log10(v))), m = v / e; return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * e; };
  const SPL = PHONE
    ? { dots: { x: 6, y: 52, w: 588, h: 248 }, cap: 22, sp: 21, dx: 92, rowH: 33, charts: { y: 310, h: 300 }, info: { y: 620, h: 210 } }
    : { dots: { x: 8, y: 50, w: 784, h: 230 }, cap: 36, sp: 14.8, dx: 108, rowH: 31, charts: { y: 290, h: 258 }, info: null };

  function spreadStep(dt, R) { for (let g = 0; g < GENS; g++) SP.disp[g] = approach(SP.disp[g], Ngen(R, g), dt, 9); }
  function drawDot(x, y, f, col) {
    ctx.fillStyle = '#e2e8f0'; ctx.beginPath(); ctx.arc(x, y, 5.6, 0, TAU); ctx.fill();
    if (f > 0.02) { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y, 5.6, -Math.PI / 2, -Math.PI / 2 + TAU * Math.min(1, f)); ctx.closePath(); ctx.fill(); }
  }
  function barChart(x, y, w, h, title, vals, ymaxTarget, o) {
    // 막대 그래프: 값은 그려진 높이에 비례 (최소 높이를 억지로 주지 않아요)
    o = o || {};
    panel(x, y, w, h);
    TX(x + 14, y + 24, title, { size: 14, align: 'left', weight: 800, color: '#0f172a' });
    const px0 = x + 48, px1 = x + w - 16, py0 = y + h - 34, py1 = y + 46;
    const ym = Math.max(ymaxTarget, 1e-6), Y = (v) => py0 - clamp(v / ym, 0, 1) * (py0 - py1);
    ctx.save(); ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1; ctx.fillStyle = '#64748b'; ctx.font = D.font(11.5, 700); ctx.textAlign = 'right';
    for (let k = 0; k <= 4; k++) { const v = ym * k / 4; ctx.beginPath(); ctx.moveTo(px0, Y(v)); ctx.lineTo(px1, Y(v)); ctx.stroke(); ctx.fillText(v >= 100 ? comma(v) : (Math.round(v * 10) / 10).toString(), px0 - 5, Y(v) + 4); }
    ctx.textAlign = 'center'; const n = vals.length, bw = (px1 - px0) / n;
    for (let i = 0; i < n; i++) ctx.fillText(String(i), px0 + bw * (i + 0.5), py0 + 16);
    ctx.fillText('일', px1 - 2, py0 + 30); ctx.restore();
    if (o.one) { ctx.save(); ctx.setLineDash([5, 4]); ctx.strokeStyle = '#dc2626'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(px0, Y(1)); ctx.lineTo(px1, Y(1)); ctx.stroke(); ctx.restore(); TX(px1 - 2, Y(1) - 5, '1명', { size: 11.5, align: 'right', weight: 800, color: '#dc2626' }); }
    for (let i = 0; i < n; i++) {
      const v = vals[i], x0 = px0 + bw * i + bw * 0.14, ww = bw * 0.72, top = Y(v);
      if (o.line) continue;
      const gr = ctx.createLinearGradient(0, top, 0, py0); gr.addColorStop(0, shade(o.col || '#0ea5e9', 0.2)); gr.addColorStop(1, o.col || '#0ea5e9'); ctx.fillStyle = gr; ctx.fillRect(x0, top, ww, py0 - top);
      if (py0 - top > 15 && bw > 28) TX(x0 + ww / 2, top - 4, fmtN(v), { size: 11, weight: 800, color: '#0f172a' });
    }
    if (o.line) {
      ctx.save(); ctx.strokeStyle = o.col || '#7c3aed'; ctx.lineWidth = 3.5; ctx.lineJoin = 'round'; ctx.beginPath();
      for (let i = 0; i < n; i++) { const xx = px0 + bw * (i + 0.5), yy = Y(vals[i]); i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); } ctx.stroke();
      for (let i = 0; i < n; i++) { const xx = px0 + bw * (i + 0.5), yy = Y(vals[i]); D.sphere(xx, yy, 4.2, o.col || '#7c3aed', { gloss: false }); }
      ctx.restore();
    }
    return { px0, px1, py0, py1, ym, Y };
  }
  const chartSt = { daily: null, cum: null, ms: null };
  function drawSpread(t, dt) {
    ctx.fillStyle = '#f1f4f8'; ctx.fillRect(0, 0, VW, VH);
    const R = SP.R; spreadStep(dt, R);
    const D0 = SPL.dots;
    panel(D0.x, D0.y, D0.w, D0.h);
    TX(D0.x + 16, D0.y + 24, '👥 하루 새 감염자 (점 1개 = 1명)', { size: PHONE ? 12.5 : 14, align: 'left', weight: 800, color: '#0f172a' });
    for (let g = 0; g < 6; g++) {
      const v = SP.disp[g], y = D0.y + 48 + g * SPL.rowH;
      TX(D0.x + 18, y + 4, g + '일째', { size: 12.5, align: 'left', weight: 800, color: GEN_COL[g] });
      const n = Math.ceil(v - 1e-6), shown = Math.min(n, SPL.cap);
      for (let i = 0; i < shown; i++) drawDot(D0.x + SPL.dx + i * SPL.sp, y, clamp(v - i, 0, 1), GEN_COL[g]);
      if (n > SPL.cap) TX(D0.x + SPL.dx + SPL.cap * SPL.sp + 4, y + 4, '… +' + comma(Math.round(v - SPL.cap)) + '명', { size: 12, align: 'left', weight: 800, color: '#64748b' });
      TX(D0.x + D0.w - 14, y + 4, fmtN(v) + '명', { size: 13.5, align: 'right', weight: 800, color: '#0f172a' });
    }
    // 차트 두 개
    const C0 = SPL.charts, cw = (VW - 16 - 10) / 2, vals = [], cum = []; let acc = 0;
    for (let g = 0; g < GENS; g++) { vals.push(SP.disp[g]); acc += SP.disp[g]; cum.push(acc); }
    chartSt.daily = chartSt.daily || { ymax: 2 }; chartSt.cum = chartSt.cum || { ymax: 2 };
    const dmax = niceMax(Math.max.apply(null, vals) * 1.02), cmax = niceMax(Math.max.apply(null, cum) * 1.02);
    chartSt.daily.ymax = approach(chartSt.daily.ymax, dmax, dt, 8); chartSt.cum.ymax = approach(chartSt.cum.ymax, cmax, dt, 8);
    const g1 = barChart(8, C0.y, cw, C0.h, '📊 하루 새 확진자 (명)', vals, chartSt.daily.ymax, { col: R > 1.001 ? '#ef4444' : R < 0.999 ? '#10b981' : '#0ea5e9', one: true });
    barChart(8 + cw + 10, C0.y, cw, C0.h, '📈 누적 확진자 (명)', cum, chartSt.cum.ymax, { col: '#7c3aed', line: true });
    TX(8 + cw - 12, C0.y + 24, '8일째 ' + fmtN(vals[GENS - 1]) + '명', { size: 12.5, align: 'right', weight: 800, color: '#475569' });
    TX(8 + 2 * cw - 2, C0.y + 24, '8일째까지 ' + fmtN(cum[GENS - 1]) + '명', { size: 12.5, align: 'right', weight: 800, color: '#475569' });
    // R 안내 줄
    const kind = R > 1.001 ? ['늘어나요', '#b91c1c'] : R < 0.999 ? ['줄어들어 멈춰요', '#166534'] : ['똑같이 유지돼요', '#1d4ed8'];
    pill(D0.x + D0.w - 12, D0.y + 22, PHONE ? 'R = ' + R.toFixed(1) + ' · ' + kind[0] : 'R = ' + R.toFixed(1) + ' → 새 감염자가 ' + kind[0], { size: 13.5, bg: '#fff', color: kind[1], border: kind[1], pad: 12, align: 'right' });
    if (PHONE) {
      const I = SPL.info; panel(I.x || 8, I.y, VW - 16, I.h);
      TX(24, I.y + 28, '📌 R(감염 재생산 수)의 뜻', { size: 15, align: 'left', weight: 800, color: '#0f172a' });
      drawWrap(24, I.y + 56, 'R은 감염자 1명이 평균 몇 명을 감염시키는지를 나타내요. 처음 감염자는 1명이에요.', VW - 48, 13, { align: 'left', color: '#334155', weight: 700 });
      [['R > 1', '새 감염자가 갈수록 늘어요', '#b91c1c'], ['R = 1', '새 감염자가 늘 같아요', '#1d4ed8'], ['R < 1', '새 감염자가 줄어 결국 멈춰요', '#166534']].forEach((r, i) => { TX(30, I.y + 112 + i * 30, r[0], { size: 15, align: 'left', weight: 800, color: r[2] }); TX(100, I.y + 112 + i * 30, r[1], { size: 13.5, align: 'left', weight: 700, color: '#334155' }); });
    }
    exampleNote();
    // 판정 래치
    if (R >= 2.0) SP.hit.grow = true;
    if (Math.abs(R - 1) < 0.01) SP.hit.flat = true;
    if (R <= 0.9) SP.hit.stop = true;
  }
  const SP_FIG = (() => {
    const mk = (R, label, col) => {
      const vals = []; for (let g = 0; g < 6; g++) vals.push(Math.pow(R, g)); const mx = Math.max.apply(null, vals);
      let bars = ''; vals.forEach((v, i) => { const h = Math.max(0, v / mx * 52); bars += '<rect x="' + (10 + i * 22) + '" y="' + (62 - h) + '" width="16" height="' + h + '" rx="2" fill="' + col + '"/>'; });
      return '<svg viewBox="0 0 150 90" width="30%" style="max-width:150px"><rect x="0" y="0" width="150" height="90" rx="8" fill="#f8fafc" stroke="#cbd5e1"/>' + bars + '<line x1="6" y1="62" x2="146" y2="62" stroke="#94a3b8"/><text x="75" y="80" font-size="11" text-anchor="middle" fill="#0f172a" font-weight="800">' + label + '</text></svg>';
    };
    return '<div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap">' + mk(2.5, 'R = 2.5', '#ef4444') + mk(1, 'R = 1.0', '#3b82f6') + mk(0.8, 'R = 0.8', '#10b981') + '</div>';
  })();

  /* =========================================================
     ③ 방역 효과: 수단 카드 4장으로 R 계산
     ========================================================= */
  const MLP = PHONE
    ? { card: (i) => ({ x: 8 + (i % 2) * 296, y: 52 + Math.floor(i / 2) * 118, w: 288, h: 110 }), gauge: { x: 8, y: 292, w: 584, h: 122 }, chart: { x: 8, y: 424, w: 352, h: 250 }, cost: { x: 368, y: 424, w: 224, h: 250 }, found: { x: 8, y: 684, w: 584, h: 146 } }
    : { card: (i) => ({ x: 8 + (i % 2) * 196, y: 50 + Math.floor(i / 2) * 116, w: 188, h: 108 }), gauge: { x: 408, y: 50, w: 384, h: 224 }, chart: { x: 8, y: 288, w: 410, h: 262 }, cost: { x: 426, y: 288, w: 366, h: 120 }, found: { x: 426, y: 418, w: 366, h: 132 } };
  function msToggle(id) { MS.on[id] = !MS.on[id]; MS.t = 0; MS.pops[id] = 1; Sound.tick(); msRecord(); }
  function msRecord() {
    const R = Rof(MS.on, MS.delay), k = keyOf(MS.on);
    if (R < 1 && k && !MS.foundKeys.has(k)) { MS.foundKeys.add(k); MS.found.push({ key: k, R, cost: costOfOn(MS.on), on: Object.assign({}, MS.on), delay: MS.delay }); okBurst(MLP.gauge.x + MLP.gauge.w / 2, MLP.gauge.y + 60, { count: 18, speed: 150 }); }
  }
  function msReset() { MS.on = { m: false, d: false, i: false, t: false }; MS.delay = 0; MS.t = 0; Sound.click(); }
  function drawMeasures(t, dt) {
    ctx.fillStyle = '#f1f4f8'; ctx.fillRect(0, 0, VW, VH);
    MS.t = Math.min(9, MS.t + dt * 4);
    const R = Rof(MS.on, MS.delay); MS.rdisp = approach(MS.rdisp, R, dt, 9);
    // 카드
    MEAS.forEach((m, i) => {
      const c = MLP.card(i), on = MS.on[m.id], pop = MS.pops[m.id] || 0; MS.pops[m.id] = Math.max(0, pop - dt * 4);
      const f = m.id === 'i' ? FACT.i[MS.delay] : FACT[m.id];
      ctx.save(); ctx.translate(c.x + c.w / 2, c.y + c.h / 2); ctx.scale(1 + pop * 0.05, 1 + pop * 0.05); ctx.translate(-c.w / 2, -c.h / 2);
      D.shadow(() => { ctx.fillStyle = on ? '#f0fdf4' : '#fff'; rr(0, 0, c.w, c.h, 14).fill(); }, { blur: on ? 12 : 7, y: on ? 4 : 2, color: 'rgba(15,23,42,.18)' });
      ctx.strokeStyle = on ? '#16a34a' : '#cbd5e1'; ctx.lineWidth = on ? 3.5 : 2; rr(0, 0, c.w, c.h, 14).stroke();
      TX(28, 46, m.icon, { size: 28 }); TX(54, 30, PHONE ? m.name : m.short, { size: 15, align: 'left', weight: 800, color: '#0f172a' });
      TX(54, 50, m.desc, { size: 12, align: 'left', weight: 700, color: '#64748b' });
      D.label(c.w - 12, 80, '×' + f, { size: 14.5, bg: on ? '#16a34a' : '#e2e8f0', color: on ? '#fff' : '#334155', align: 'right', pad: 10 });
      D.label(12, 80, '활동 제한 +' + COSTS[m.id], { size: 12, bg: '#fff7ed', color: '#9a3412', border: '#fdba74', align: 'left', pad: 8 });
      if (on) { ctx.fillStyle = '#16a34a'; ctx.beginPath(); ctx.arc(c.w - 14, 14, 10, 0, TAU); ctx.fill(); TX(c.w - 14, 19, '✓', { size: 13, color: '#fff', weight: 800 }); }
      ctx.restore();
    });
    // R 계기
    const G0 = MLP.gauge; panel(G0.x, G0.y, G0.w, G0.h);
    const fs = factorsOf(MS.on, MS.delay);
    TX(G0.x + 16, G0.y + 26, '🧮 방역을 하면 R이 이렇게 바뀌어요', { size: 14.5, align: 'left', weight: 800, color: '#0f172a' });
    const formula = 'R = ' + R0_BASE.toFixed(1) + fs.map((x) => ' × ' + x[1]).join('') + ' = ' + R.toFixed(2);
    drawWrap(G0.x + G0.w / 2, G0.y + 58, formula, G0.w - 24, PHONE ? 16 : 18, { color: R < 1 ? '#166534' : '#b91c1c', weight: 800 });
    const gx0 = G0.x + 24, gx1 = G0.x + G0.w - 24, gy = G0.y + (PHONE ? 92 : 108), RMAX = 3.2;
    const X = (v) => gx0 + clamp(v / RMAX, 0, 1) * (gx1 - gx0);
    const gr = ctx.createLinearGradient(gx0, 0, gx1, 0); gr.addColorStop(0, '#86efac'); gr.addColorStop(X(1) > gx0 ? (X(1) - gx0) / (gx1 - gx0) : 0.3, '#fde68a'); gr.addColorStop(1, '#fca5a5');
    ctx.fillStyle = gr; rr(gx0, gy, gx1 - gx0, 16, 8).fill();
    ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(X(1), gy - 6); ctx.lineTo(X(1), gy + 22); ctx.stroke();
    TX(X(1), gy + 38, 'R = 1', { size: 12.5, weight: 800, color: '#0f172a' }); TX(gx0, gy + 38, '0', { size: 12, align: 'left', weight: 700, color: '#64748b' }); TX(gx1, gy + 38, '3.2', { size: 12, align: 'right', weight: 700, color: '#64748b' });
    const mx = X(MS.rdisp); ctx.fillStyle = R < 1 ? '#16a34a' : '#dc2626'; ctx.beginPath(); ctx.moveTo(mx, gy - 2); ctx.lineTo(mx - 9, gy - 18); ctx.lineTo(mx + 9, gy - 18); ctx.closePath(); ctx.fill();
    TX(mx, gy - 24, 'R ' + MS.rdisp.toFixed(2), { size: 13, weight: 800, color: R < 1 ? '#166534' : '#b91c1c', stroke: '#fff', strokeWidth: 4 });
    pill(G0.x + G0.w / 2, G0.y + G0.h - 22, R < 1 ? '✅ R < 1: 새 감염자가 줄어요' : '⚠️ R > 1: 새 감염자가 늘어요', { size: 13.5, bg: R < 1 ? '#dcfce7' : '#fee2e2', color: R < 1 ? '#166534' : '#b91c1c', border: R < 1 ? '#86efac' : '#fca5a5', pad: 12 });
    // 하루 새 감염자 그래프 (재실행 애니메이션)
    const C0 = MLP.chart; panel(C0.x, C0.y, C0.w, C0.h);
    TX(C0.x + 14, C0.y + 24, '📊 하루 새 확진자 (처음 1명에서 시작)', { size: 14, align: 'left', weight: 800, color: '#0f172a' });
    const vals = []; for (let g = 0; g < GENS; g++) vals.push(Ngen(R, g));
    const ymT = niceMax(Math.max.apply(null, vals) * 1.02); chartSt.ms = chartSt.ms || { ymax: ymT }; chartSt.ms.ymax = approach(chartSt.ms.ymax, ymT, dt, 7);
    const px0 = C0.x + 46, px1 = C0.x + C0.w - 14, py0 = C0.y + C0.h - 32, py1 = C0.y + 44, ym = chartSt.ms.ymax, Y = (v) => py0 - clamp(v / ym, 0, 1) * (py0 - py1);
    ctx.save(); ctx.strokeStyle = '#e2e8f0'; ctx.fillStyle = '#64748b'; ctx.font = D.font(11.5, 700); ctx.textAlign = 'right';
    for (let k = 0; k <= 4; k++) { const v = ym * k / 4; ctx.beginPath(); ctx.moveTo(px0, Y(v)); ctx.lineTo(px1, Y(v)); ctx.stroke(); ctx.fillText(v >= 100 ? comma(v) : (Math.round(v * 10) / 10).toString(), px0 - 5, Y(v) + 4); }
    ctx.textAlign = 'center'; const bw = (px1 - px0) / GENS; for (let i = 0; i < GENS; i++) ctx.fillText(String(i), px0 + bw * (i + 0.5), py0 + 16); ctx.fillText('일', px1 - 2, py0 + 30);
    ctx.setLineDash([5, 4]); ctx.strokeStyle = '#dc2626'; ctx.beginPath(); ctx.moveTo(px0, Y(1)); ctx.lineTo(px1, Y(1)); ctx.stroke(); ctx.restore();
    const nShow = RM ? GENS - 1 : Math.min(GENS - 1, MS.t), nf = Math.floor(nShow), xi = (i) => px0 + bw * (i + 0.5);
    ctx.save(); ctx.strokeStyle = R < 1 ? '#16a34a' : '#ef4444'; ctx.lineWidth = 3.5; ctx.lineJoin = 'round'; ctx.beginPath();
    for (let i = 0; i <= nf; i++) { const xx = xi(i), yy = Y(vals[i]); i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); }
    if (nShow > nf && nf < GENS - 1) { const f = nShow - nf; ctx.lineTo(lerp(xi(nf), xi(nf + 1), f), Y(lerp(vals[nf], vals[nf + 1], f))); }
    ctx.stroke(); ctx.restore();
    for (let i = 0; i <= nf; i++) D.sphere(xi(i), Y(vals[i]), 4.4, R < 1 ? '#16a34a' : '#ef4444', { gloss: false });
    TX(px1 - 4, py1 - 2, '8일째 ' + fmtN(vals[GENS - 1]) + '명', { size: 12.5, align: 'right', weight: 800, color: '#475569' });
    // 활동 제한 정도
    const K0 = MLP.cost; panel(K0.x, K0.y, K0.w, K0.h);
    const cost = costOfOn(MS.on);
    TX(K0.x + 14, K0.y + 24, '💰 활동 제한 정도 (사회·경제적 비용)', { size: 13.5, align: 'left', weight: 800, color: '#0f172a' });
    ctx.fillStyle = '#e2e8f0'; rr(K0.x + 14, K0.y + 40, K0.w - 28, 22, 11).fill();
    ctx.save(); rr(K0.x + 14, K0.y + 40, K0.w - 28, 22, 11).clip(); let cx = K0.x + 14;
    const SEGC = { m: '#38bdf8', d: '#f97316', i: '#a855f7', t: '#14b8a6' };
    ['m', 'd', 'i', 't'].forEach((k) => { if (!MS.on[k]) return; const w = COSTS[k] / COST_MAX * (K0.w - 28); ctx.fillStyle = SEGC[k]; ctx.fillRect(cx, K0.y + 40, w, 22); cx += w; });
    ctx.restore();
    TX(K0.x + 14, K0.y + 86, cost + ' / ' + COST_MAX, { size: 20, align: 'left', weight: 800, color: cost >= 60 ? '#b91c1c' : cost >= 30 ? '#b45309' : '#166534' });
    drawWrap(K0.x + K0.w - 14, K0.y + (PHONE ? 86 : 84), 'R을 낮추는 방법이 여러 가지여도 비용은 서로 달라요.', K0.w * 0.5, 12, { align: 'right', color: '#64748b', weight: 700 });
    // 찾은 조합
    const FD = MLP.found; panel(FD.x, FD.y, FD.w, FD.h);
    TX(FD.x + 14, FD.y + 24, '🔎 R < 1이 된 조합 ' + MS.found.length + '가지', { size: 14, align: 'left', weight: 800, color: '#0f172a' });
    if (!MS.found.length) TX(FD.x + 14, FD.y + 52, '카드를 눌러 조합해 보세요. R이 1보다 작아지면 여기에 기록돼요.', { size: 12.5, align: 'left', weight: 700, color: '#94a3b8' });
    MS.found.slice(-4).forEach((f, i) => { const names = ['m', 'd', 'i', 't'].filter((k) => f.on[k]).map((k) => MEAS.find((q) => q.id === k).name).join(' + '); TX(FD.x + 14, FD.y + 48 + i * 20, '✅ ' + names + ' → R ' + f.R.toFixed(2) + ' · 비용 ' + f.cost, { size: PHONE ? 12 : 12, align: 'left', weight: 700, color: '#166534' }); });
    exampleNote();
  }
  function msCardAt(p) { for (let i = 0; i < 4; i++) { const c = MLP.card(i); if (p.x >= c.x && p.x <= c.x + c.w && p.y >= c.y && p.y <= c.y + c.h) return i; } return -1; }
  /* =========================================================
     ④ 논증하기: 주장 – 근거 – 추론 – 한계·반론
     ========================================================= */
  const CLAIM = '미래 사회의 문제를 풀 때 과학이 필요하다';
  const ACARDS = [
    { id: 'e1', type: 'ev', label: '바이러스 서열이 공개된 지 수 주 만에 진단 시약이 개발되었다' },
    { id: 'e2', type: 'ev', label: '접촉자 추적과 확산 모의실험으로 R을 1 아래로 낮출 수 있었다' },
    { id: 'e3', type: 'ev', label: '핵산 기반 백신이 약 1년 이내에 개발된 사례가 있다 (보통은 10년 이상)' },
    { id: 'e4', type: 'evx', label: '인터넷 글에서 "이 방법이면 100 % 예방된다"고 했다 (출처 불분명)' },
    { id: 'r1', type: 'rs', label: '과학은 자료와 모형으로 원인을 알고 해결책의 효과를 미리 따져 볼 수 있게 해 주므로 필요하다' },
    { id: 'r2', type: 'rsx', label: '과학은 언제나 정확하게 예측하므로 다른 노력은 필요 없다' },
    { id: 'l1', type: 'lim', label: '변이가 계속 나와서 진단 · 백신을 계속 바꿔야 한다' },
    { id: 'l2', type: 'lim', label: '모의실험의 예측은 가정에 따라 달라 불확실하다' },
    { id: 'l3', type: 'lim', label: '동선 정보 활용은 개인정보 · 비용 문제가 있고 협력이 필요하다' },
  ];
  const ASLOT = [
    { id: 'ev1', type: 'ev', label: '근거 ① (자료 · 사실)', color: '#0ea5e9' },
    { id: 'ev2', type: 'ev', label: '근거 ② (자료 · 사실)', color: '#0ea5e9' },
    { id: 'rs', type: 'rs', label: '추론 (근거가 주장을 지지하는 이유)', color: '#8b5cf6' },
    { id: 'lim', type: 'lim', label: '한계 · 반론 대응', color: '#f59e0b' },
  ];
  const AL = PHONE
    ? { slot: (i) => ({ x: 154 + (i % 2) * 292, y: 166 + Math.floor(i / 2) * 134, w: 284, h: 126 }), card: { w: 276, h: 64 }, pool: (k) => ({ x: 150 + (k % 2) * 300, y: 436 + Math.floor(k / 2) * 68 }), text: { y: 752 } }
    : { slot: (i) => ({ x: 206, y: 148 + i * 80, w: 388, h: 74 }), card: { w: 360, h: 46 }, pool: (k) => ({ x: 600, y: 108 + k * 49.5 }), text: { y: 470 } };
  function buildArgue() {
    const b = new Board({ onChange() { b.items.forEach((c) => { c.ok = false; c.bad = false; c.warned = false; }); AR.shown = false; } });
    ASLOT.forEach((s, i) => { const q = AL.slot(i); b.addSlot({ id: s.id, type: s.type, x: q.x, y: q.y, w: q.w, h: q.h, cap: 1, color: s.color, label: s.label, lsize: 12.5, iy: PHONE ? 20 : 11 }); });
    const order = shuffle(ACARDS.map((c, i) => i));
    order.forEach((ci, k) => { const c = ACARDS[ci], p = AL.pool(k); b.addItem({ id: c.id, type: c.type, w: AL.card.w, h: AL.card.h, hx: p.x, hy: p.y, label: c.label, size: PHONE ? 12 : 12.5, stroke: c.type.startsWith('ev') ? '#7dd3fc' : c.type.startsWith('rs') ? '#c4b5fd' : '#fcd34d' }); });
    AR.board = b; AR.shown = false;
  }
  function drawArgue(t, dt) {
    ctx.fillStyle = '#f1f4f8'; ctx.fillRect(0, 0, VW, VH);
    const b = AR.board; b.step(dt);
    const hv = b.drag ? b.slotAtPoint({ x: b.drag.c.x, y: b.drag.c.y }) : null;
    b.slots.forEach((s) => { s._h = approach(s._h || 0, hv === s ? 1 : 0, dt, 14); });
    // 주장 띠
    panel(8, 48, PHONE ? 584 : 392, PHONE ? 62 : 48, { fill: '#0f172a', r: 12 });
    TX(22, PHONE ? 72 : 70, '주장', { size: 12.5, align: 'left', weight: 800, color: '#fbbf24' });
    drawWrap(22 + 40, PHONE ? 72 : 70, CLAIM, PHONE ? 520 : 330, PHONE ? 15 : 14.5, { align: 'left', color: '#fff', weight: 800 });
    if (!PHONE) TX(598, 70, '📦 카드 9장 (알맞지 않은 카드도 섞여 있어요)', { size: 13.5, weight: 800, color: '#475569', align: 'center' });
    b.slots.forEach((s) => drawSlot(s, { hover: s._h }));
    b.items.forEach((c) => { if (!b.drag || b.drag.c !== c) b.drawItem(c); });
    if (b.drag) b.drawItem(b.drag.c);
    // 완성된 논증문
    if (AR.shown) {
      const y0 = AL.text.y, get = (id) => ACARDS.find((c) => c.id === b.slots.find((q) => q.id === id).items[0].id).label;
      const txt = '주장: ' + CLAIM + '. 근거: ' + get('ev1') + ' / ' + get('ev2') + '. 추론: ' + get('rs') + '. 한계: ' + get('lim') + '.';
      if (PHONE) panel(8, y0 - 6, 584, 88, { fill: '#f0fdf4', stroke: '#86efac' }); else panel(8, y0 - 22, 392, 104, { fill: '#f0fdf4', stroke: '#86efac' });
      drawWrap(20, y0 + (PHONE ? 12 : 0), '✅ ' + txt, PHONE ? 562 : 368, PHONE ? 10.5 : 11.5, { align: 'left', color: '#14532d', weight: 700, lh: 1.22 });
    }
    exampleNote();
  }
  function argueCheck() {
    const b = AR.board, sl = (id) => b.slots.find((s) => s.id === id), it = (id) => sl(id).items[0] || null;
    const empty = b.slots.filter((s) => !s.items.length);
    if (empty.length) return '아직 비어 있는 칸이 ' + empty.length + '개 있어요: ' + empty.map((s) => s.label.split(' (')[0]).join(', ');
    const bad = [];
    b.slots.forEach((s) => {
      const c = s.items[0];
      const ok = (s.type === 'ev' && c.type === 'ev') || (s.type === 'rs' && c.type === 'rs') || (s.type === 'lim' && c.type === 'lim');
      if (!ok) bad.push([s, c]);
    });
    if (bad.length) {
      bad.forEach(([s, c]) => { if (!c.warned) { c.warned = true; c.bad = true; c.shake = 0.5; } });
      const [s, c] = bad[0];
      if (c.type === 'evx') return '<b>출처가 불분명한 글</b>은 근거로 쓸 수 없어요. 누가·언제·어떤 자료로 말했는지 확인할 수 있는 사실이어야 해요.';
      if (c.type === 'rsx') return '<b>"언제나 정확하다"</b>는 과장된 말이에요. 과학에도 한계가 있어요. 한계는 "한계 · 반론" 칸에 들어가고, 추론에는 근거가 주장을 지지하는 <b>이유</b>가 들어가요.';
      if (s.type === 'ev') return '<b>근거</b> 칸에는 자료나 사실(사례)이 들어가요. 이 카드는 ' + (c.type === 'rs' ? '근거가 왜 주장을 지지하는지 설명하는 <b>추론</b>이에요.' : '<b>한계</b>에 가까워요.');
      if (s.type === 'rs') return '<b>추론</b> 칸에는 "그래서 왜 주장이 맞는가"를 설명하는 문장이 들어가요. 이 카드는 ' + (c.type === 'ev' ? '자료·사실(<b>근거</b>)이에요.' : '<b>한계</b>에 가까워요.');
      return '<b>한계 · 반론 대응</b> 칸에는 주장에 부족하거나 조심할 점이 들어가요. 이 카드는 ' + (c.type === 'ev' ? '근거' : '추론') + '에 가까워요.';
    }
    b.items.forEach((c) => { if (c.slot && !c.ok) { c.ok = true; c.pop = 1; okBurst(c.x, c.y, { count: 6, speed: 90, life: 0.5, size: 3 }); } });
    return true;
  }
  /* =========================================================
     화면 전환 · 조작 연결
     ========================================================= */
  const MODE_LABEL = { trace: '🔎 가상 마을의 감염 경로', spread: '📈 R에 따른 확산', measures: '🛡️ 방역 수단과 R', argue: '⚖️ 과학이 필요한 까닭 논증하기' };
  const MODE_HINT = { trace: '사람을 눌러 접촉 기록과 염기 서열을 비교해요', spread: '슬라이더로 R을 바꿔 보세요', measures: '카드를 눌러 방역 수단을 조합해요', argue: '카드를 끌어 알맞은 칸에 놓아요' };
  function setMode(m) {
    if (!MODE_LABEL[m] || (game && !hasF(m))) return;
    if (m === S.mode) { ctlUpdate(); return; }
    S.mode = m; S.fade = 1; $('#tbLabel').textContent = MODE_LABEL[m]; showHint(MODE_HINT[m], 4200); ctlUpdate();
  }
  function ensure(m) { if (m !== S.mode) { S.mode = m; S.fade = 1; $('#tbLabel').textContent = MODE_LABEL[m]; } ctlUpdate(); }
  function setR(v) { SP.R = Math.round(clamp(v, 0.5, 3) * 10) / 10; ctlUpdate(); }
  let rSlider = null;
  function ctlUpdate() {
    const mode = S.mode;
    $$('#ctrlCard [data-show]').forEach((el) => { el.hidden = !el.dataset.show.split(/\s+/).includes(mode); });
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === mode));
    $$('#dlSeg button').forEach((b) => b.classList.toggle('on', +b.dataset.dl === MS.delay));
    const bv = $('#bVar'); if (bv) { bv.classList.toggle('on', TR.varOn); bv.textContent = TR.varOn ? '🧬 변이 색 끄기' : '🧬 변이 색으로 보기'; }
    $$('[data-rq]').forEach((b) => b.classList.toggle('on', Math.abs(+b.dataset.rq - SP.R) < 0.01));
    if (rSlider) rSlider.set(SP.R);
  }
  function bindUI() {
    $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setMode(b.dataset.mode); }));
    rSlider = SciSim.bindRange($('#sR'), $('#oR'), (v) => (+v).toFixed(1), (v) => { SP.R = Math.round(v * 10) / 10; ctlUpdate(); });
    $$('[data-rq]').forEach((b) => b.addEventListener('click', () => { Sound.click(); setR(+b.dataset.rq); }));
    $('#bVar').addEventListener('click', () => { Sound.click(); TR.varOn = !TR.varOn; ctlUpdate(); });
    $('#bReplay').addEventListener('click', () => { replayStart(); });
    $$('#dlSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); MS.delay = +b.dataset.dl; MS.t = 0; msRecord(); ctlUpdate(); }));
    $('#bMsReset').addEventListener('click', () => { msReset(); ctlUpdate(); });
    $('#bArReset').addEventListener('click', () => { Sound.click(); buildArgue(); ctlUpdate(); });
    SciSim.pointer(view, {
      down(p) {
        if (S.mode === 'trace') { const id = nodeAt(p); if (id) { traceSelect(id); ctlUpdate(); } return false; }
        if (S.mode === 'measures') { const i = msCardAt(p); if (i >= 0) { msToggle(MEAS[i].id); ctlUpdate(); } return false; }
        if (S.mode === 'argue') return AR.board.onDown(p);
        return false;
      },
      move(p) { if (S.mode === 'argue') AR.board.move(p); },
      up(p) { if (S.mode === 'argue') { AR.board.up(p); ctlUpdate(); } },
      hover(p) {
        if (S.mode === 'trace') return nodeAt(p) ? 'pointer' : 'default';
        if (S.mode === 'measures') return msCardAt(p) >= 0 ? 'pointer' : 'default';
        if (S.mode === 'argue') return AR.board.pick(p) ? 'grab' : 'default';
        return 'default';
      },
    });
  }

  function doReadouts() {
    const m = S.mode;
    if (m === 'trace') {
      const id = TR.sel, cs = id && CASE[id];
      readouts([['확진자', Object.keys(CASE).length + '명 / 50명'], ['선택한 사람', id ? id + '번' + (cs ? ' (확진)' : '') : '—'], ['기준 서열과 다른 글자', cs ? diffN(cs.seq, REF) + '개' : '—']]);
    } else if (m === 'spread') {
      let cum = 0; for (let g = 0; g < GENS; g++) cum += Ngen(SP.R, g);
      readouts([['R', SP.R.toFixed(1)], ['5일째 새 감염자', fmtN(Ngen(SP.R, 5)) + '명'], ['8일째까지 누적', fmtN(cum) + '명']]);
    } else if (m === 'measures') {
      const R = Rof(MS.on, MS.delay);
      readouts([['R', R.toFixed(2)], ['활동 제한 정도', costOfOn(MS.on) + ' / ' + COST_MAX], ['R < 1 조합', MS.found.length + '가지']]);
    } else {
      const b = AR.board; readouts([['놓은 카드', b.placed() + ' / 4칸'], ['주장', '과학이 필요하다'], ['고른 근거', b.slots.filter((s) => s.type === 'ev' && s.items.length).length + ' / 2']]);
    }
  }

  /* =========================================================
     미션
     ========================================================= */
  const N5 = Ngen(2.5, 5);
  const rChips = () => chk(SP.hit.grow, 'R ≥ 2.0 (늘어나요)') + ' · ' + chk(SP.hit.flat, 'R = 1.0 (일정해요)') + ' · ' + chk(SP.hit.stop, 'R ≤ 0.9 (줄어들어요)') + '<br>지금 R = <b>' + SP.R.toFixed(1) + '</b>';
  const levels = [
    {
      title: '감염 경로는 어떻게 찾을까요?', short: '감염 경로', icon: '🔎', phase: '관찰', features: ['trace'],
      intro: '<p class="si-q">❓ 탐구 질문: 감염병이 퍼지는 것을 어떻게 알아내고 막을 수 있을까? 미래의 문제를 풀 때 과학이 왜 필요할까?</p>' +
        '<div class="si-link">🔗 <b>앞 차시에서</b> 진단 기술로 병원체를 찾아낼 수 있다는 것을 알았어요. 진단 결과는 <b>추적과 방역의 출발점</b>이에요. <b>중학교 3학년</b>에서는 이동량 · 마스크 · 예방 접종에 따라 감염자 수 곡선이 달라지는 확산 모형을 분석했어요.</div>' +
        '<p>가상 마을(50명)의 확진자 12명을 살펴봐요. 확진자의 <b>접촉 기록</b>으로 누구와 만났는지 추적하고, 바이러스의 <b>염기 서열</b>을 비교해 첫 감염원을 찾아요. 바이러스는 사람 사이에 퍼지면서 서열이 조금씩 바뀌어서, 처음 퍼진 서열(<b>기준 서열</b>)과 같은 사람이 맨 처음에 가까워요. (가상 자료 · 단순화한 교육용 예시)</p>',
      setup() { ensure('trace'); },
      recap: '<b>접촉자 추적</b>과 <b>유전체(염기 서열) 분석</b>으로 감염의 연결을 알아낼 수 있어요. 서열이 거의 같으면 같은 계통, 크게 다르면 다른 경로일 가능성이 커요.',
      summary: '<ul><li><b>접촉자 추적</b>: 확진자의 동선과 접촉 기록으로 감염될 수 있는 사람을 찾아요.</li>' +
        '<li><b>유전체 분석</b>: 바이러스의 염기 서열은 퍼지면서 조금씩 바뀌어요(변이). 서열이 <b>거의 같으면 같은 계통</b>, <b>많이 다르면 다른 경로</b>일 가능성이 있어요.</li>' +
        '<li>가장 먼저 확진된 사람이 <b>첫 감염원</b>이라고 단정할 수 없어요. 증상이 없으면 늦게 발견되기도 해요.</li></ul>' +
        '<p style="font-size:13px;color:var(--muted)">※ 가상 마을과 서열은 모두 단순화한 예시예요.</p>',
      missions: [
        {
          id: 'identify', title: '첫 감염원 찾기', manual: true,
          goal: '확진자 12명(🔴) 중 마을의 <b>첫 감염원</b>을 눌러서 고르고 <b>✔ 확인하기</b>를 눌러요.',
          hint: '확진자를 눌러 접촉 기록과 염기 서열을 봐요. "🧬 변이 색으로 보기"를 누르면 같은 변이는 같은 색이에요. 기준 서열과 다른 글자 수가 <b>0개</b>인 사람을 찾아봐요.',
          setup() { TR.sel = null; TR.varOn = false; TR.replay = null; ensure('trace'); },
          check: () => traceCheck(),
          explain: '<b>' + ROOT + '번</b>은 서열이 기준과 <b>똑같아요</b>. 그 뒤로 퍼진 사람들은 글자가 하나씩 바뀐 서열(변이 ①, ②)을 가졌고, 더 뒤의 사람들은 변이가 한 번 더 쌓였어요. 서열의 차이를 이어 보면 ' + ROOT + '번 → ' + [7, 22, 35].join('·') + '번 → … 로 이어지는 <b>계통</b>이 보여요. ' + ROOT + '번은 증상이 없어서 ' + dayLabel(CASE[ROOT].day) + '에야 확인되었기 때문에, 가장 먼저 확진된 ' + FIRST + '번(' + dayLabel(CASE[FIRST].day) + ')이 첫 감염원은 아니었어요.',
        },
        {
          type: 'quiz', title: '서열 차이 해석하기', goal: '<b>' + IMPORT + '번</b> 확진자의 서열은 기준과 <b>' + diffN(CASE[IMPORT].seq, REF) + '글자</b>나 다르고, 마을 안 다른 확진자와 접촉 기록으로 이어지지도 않아요. 알맞은 해석은?',
          setup() { TR.sel = IMPORT; ensure('trace'); },
          choices: ['마을의 첫 감염원이다', '다른 확진자들과 같은 계통이다', '서열이 많이 다르므로 마을 밖에서 들어온 다른 경로의 감염일 가능성이 크다', '서열 차이는 의미가 없어서 해석할 수 없다'],
          answer: 2,
          feedback: ['첫 감염원은 기준 서열과 같은 사람이에요. 이 사람은 서열이 크게 달라요.', '같은 계통이면 서열이 거의 같아요. 이 사람은 ' + diffN(CASE[IMPORT].seq, REF) + '글자나 달라요.', '', '서열은 바이러스의 계통을 알려 주는 중요한 단서예요.'],
          explain: '같은 곳에서 퍼진 바이러스는 서열이 <b>거의 같고</b>, 서열이 크게 다르면 <b>다른 경로</b>에서 왔을 가능성이 커요. ' + IMPORT + '번은 접촉 기록도 마을 안 확진자와 이어지지 않아 외부에서 들어온 감염으로 볼 수 있어요. 이렇게 접촉 기록과 서열이라는 <b>두 가지 자료를 함께</b> 볼수록 더 믿을 만한 결론이 나와요.',
        },
      ],
    },
    {
      title: '확산의 규칙: R', short: '확산 그래프', icon: '📈', phase: '분석', features: ['spread'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 감염이 사람에서 사람으로 이어지는 경로를 추적했어요.</div>' +
        '<p><b>R</b>(감염 재생산 수)은 <b>감염자 1명이 평균 몇 명을 감염시키는지</b>를 뜻해요. 하루에 한 세대가 지나는 단순한 모형에서 처음 감염자 1명이 R명을 감염시키고, 그 사람들이 다시 R명씩 감염시켜요. 슬라이더로 R을 바꾸며 <b>하루 새 감염자</b>와 <b>누적 확진자</b>를 살펴봐요. (인구 제한이 없는 큰 도시라고 가정한 단순 계산이에요)</p>',
      setup() { SP.R = 1.5; SP.hit.grow = SP.hit.flat = SP.hit.stop = false; ensure('spread'); },
      recap: '<b>R > 1</b>이면 새 감염자가 갈수록 빠르게 늘고, <b>R = 1</b>이면 일정하고, <b>R < 1</b>이면 줄어서 확산이 멈춰요.',
      summary: '<ul><li><b>R</b>: 감염자 1명이 평균 감염시키는 사람 수. n일째 새 감염자 ≈ R<sup>n</sup>명.</li>' +
        '<li>R = 2.5이면 1 → 2.5 → 6.3 → 15.6 → 39 → 98명 … 처럼 <b>급격히 늘어요</b>. (5일째 약 98명)</li>' +
        '<li>R = 1이면 매일 같고, R = 0.8이면 1 → 0.8 → 0.64 → … 로 줄어들어요.</li>' +
        '<li>확산을 멈추려면 <b>R을 1보다 작게</b> 만들어야 해요.</li></ul>',
      missions: [
        {
          id: 'rvals', title: '세 가지 R 만들어 보기',
          goal: '슬라이더로 <b>R ≥ 2.0</b>(늘어남), <b>R = 1.0</b>(일정), <b>R ≤ 0.9</b>(줄어듦)를 각각 한 번씩 만들어 그래프 모양을 비교해요.',
          hint: '아래 R = 0.8 · 1.0 · 2.5 버튼을 눌러도 돼요.', hold: 0.4,
          setup() { SP.R = 1.5; SP.hit.grow = SP.hit.flat = SP.hit.stop = false; ensure('spread'); ctlUpdate(); },
          check: () => SP.hit.grow && SP.hit.flat && SP.hit.stop, status: () => rChips(),
          explain: 'R이 <b>1보다 크면</b> 감염자 1명이 1명 넘게 감염시켜서 새 감염자가 점점 늘고, <b>1이면</b> 매일 같은 수가 유지돼요. <b>1보다 작으면</b> 새 감염자가 줄어들다가 결국 사라져요. 그래서 방역의 목표는 R을 1 아래로 낮추는 거예요.',
        },
        {
          type: 'quiz', title: 'R과 그래프 모양', figure: SP_FIG, goal: '그림은 R이 다른 세 경우의 하루 새 감염자 수(6일간)예요. R과 그래프 모양의 관계로 알맞은 것은?',
          setup() { ensure('spread'); },
          choices: ['R이 1보다 크면 새 감염자가 줄어들고, 1보다 작으면 늘어난다', 'R이 1보다 크면 새 감염자가 갈수록 가파르게 늘고, R이 1보다 작으면 줄어들어 확산이 멈춘다', 'R이 1일 때 새 감염자는 매일 2배가 된다', 'R이 클수록 확산이 느려진다'],
          answer: 1,
          feedback: ['반대로 생각했어요. 그림에서 R = 2.5와 R = 0.8의 막대를 비교해 봐요.', '', 'R = 1이면 감염자 1명이 평균 1명을 감염시켜서 매일 같은 수가 유지돼요.', 'R이 클수록 한 사람이 더 많은 사람을 감염시켜서 확산이 빨라져요.'],
          explain: '<b>R > 1</b>이면 곡선이 가파르게 올라가고, <b>R = 1</b>이면 평평하고, <b>R < 1</b>이면 내려가서 0에 가까워져요. 방역은 R을 1 아래로 낮추는 일이에요.',
        },
        {
          type: 'quiz', title: '5일 뒤 새 감염자 수', goal: 'R = 2.5일 때 처음 감염자 1명에서 시작하면, <b>5일째</b>에 하루 새로 감염되는 사람은 약 몇 명일까요?',
          setup() { ensure('spread'); setR(2.5); },
          choices: ['약 12명 (2.5 × 5)', '약 25명', '약 98명 (2.5를 5번 곱해요)', '약 250명'],
          answer: 2,
          feedback: ['5일 동안 2.5씩 "더하는" 것이 아니라, 매일 2.5배씩 "곱해져요".', '2.5를 2번 곱한 값과 비슷해요. 5번 곱해 봐요.', '', '2.5를 5번 곱한 값이에요. 너무 크게 계산했어요.'],
          explain: '새 감염자는 매일 2.5배가 돼요: 1 → 2.5 → 6.3 → 15.6 → 39.1 → <b>' + fmtN(N5) + '명</b> (2.5<sup>5</sup> ≈ 98). 처음엔 적어 보여도 곱해지면서 <b>갑자기 폭발적으로</b> 늘어요. 그래서 초기에 R을 낮추는 것이 중요해요.',
        },
      ],
    },
    {
      title: '방역은 R을 어떻게 낮출까요?', short: '방역 효과', icon: '🛡️', phase: '실험', features: ['measures'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> R을 1보다 작게 만들어야 확산이 멈춘다는 것을 알았어요.</div>' +
        '<p>방역 수단마다 R을 <b>곱해서 줄이는 정도</b>가 달라요. 방역이 없을 때 R은 <b>3.0</b>이에요. 수단 카드를 눌러 조합하고, R이 어떻게 변하는지 계산해 봐요. 수단을 쓸수록 <b>활동이 제한되는 정도</b>(사회·경제적 비용)도 커져요. (모든 수치는 단순화한 가정 값이에요)</p>',
      setup() { msReset(); MS.found = []; MS.foundKeys.clear(); ensure('measures'); },
      recap: '한 가지 방법만으로는 R이 1보다 작아지기 어려워서 여러 수단을 <b>함께</b> 써요. 진단 · 격리가 빠를수록 효과가 커요. 같은 효과라도 비용이 달라서 선택에는 <b>한 가지 정답</b>만 있지 않아요.',
      summary: '<ul><li>방역 수단의 효과(가정 값): 마스크 ×0.7, 거리두기 ×0.6, 신속 진단 + 격리 ×0.5, 접촉자 추적 ×0.8. 기본 R = 3.0에 곱해요.</li>' +
        '<li>마스크 + 거리두기만으로는 R ≈ 1.26(1보다 큼)이지만, 신속 진단 + 격리를 더하면 R ≈ 0.63으로 1보다 작아져요.</li>' +
        '<li>진단 · 격리가 <b>늦으면</b> 효과가 줄어요 (×0.5 → ×0.6 → ×0.75).</li>' +
        '<li>R이 1보다 작은 조합이 여러 가지여도 활동 제한 정도(비용)는 달라요. 과학은 선택지를 비교할 <b>근거</b>를 줘요.</li></ul>',
      missions: [
        {
          id: 'combos', title: 'R < 1이 되는 조합 3가지 찾기',
          goal: '수단 카드를 켜고 꺼서 <b>R이 1보다 작아지는 서로 다른 조합 3가지</b>를 찾아요.',
          hint: 'R = 3.0 × (켠 카드의 값). 한 가지만으로는 1보다 작아지지 않아요. 신속 진단 + 격리(×0.5)를 넣고, 거리두기나 마스크를 더해 봐요.', hold: 0.4,
          setup() { msReset(); MS.found = []; MS.foundKeys.clear(); ensure('measures'); },
          check: () => MS.found.length >= 3,
          status: () => chk(MS.found.length >= 3, '찾은 조합 <b>' + MS.found.length + ' / 3</b> (R < 1)') + '<br>지금 R = <b>' + Rof(MS.on, MS.delay).toFixed(2) + '</b> · 활동 제한 ' + costOfOn(MS.on) + ' / ' + COST_MAX,
          explain: '진단 · 격리(×0.5)를 포함한 조합들이 R < 1이 되었어요. 예를 들어 마스크 + 거리두기 + 진단 · 격리는 3.0 × 0.7 × 0.6 × 0.5 = 0.63이에요. 하지만 R < 1인 조합마다 <b>활동 제한 정도</b>가 달라서(예: 마스크 + 진단 · 격리 + 추적은 40, 거리두기 + 진단 · 격리는 60) 어떤 조합을 고를지는 과학적 사실과 함께 <b>사회의 가치 판단</b>도 필요해요.',
        },
        {
          id: 'late', title: '진단이 늦어도 R < 1 만들기',
          goal: '진단 · 격리 시점을 <b>2일 이상 늦음(×' + FACT.i[2] + ')</b>으로 바꾸고도 R이 1보다 작은 조합을 만들어요.',
          hint: '진단이 늦으면 격리의 효과가 줄어요. 다른 수단을 더 많이 함께 써야 해요. 마스크 · 거리두기 · 진단 · 격리를 모두 켜 봐요.', hold: 0.5,
          setup() { MS.on = { m: false, d: false, i: false, t: false }; MS.delay = 2; MS.t = 0; ensure('measures'); },
          check: () => MS.delay === 2 && Rof(MS.on, MS.delay) < 1,
          status: () => chk(MS.delay === 2, '진단 · 격리 2일 이상 늦음') + ' · ' + chk(Rof(MS.on, MS.delay) < 1, 'R < 1 (지금 <b>' + Rof(MS.on, MS.delay).toFixed(2) + '</b>)'),
          explain: '진단 · 격리가 2일 이상 늦으면 효과가 ×' + FACT.i[2] + '로 줄어서, 같은 카드를 켜도 R이 커져요. 그래도 마스크 + 거리두기 + 진단 · 격리(3.0 × 0.7 × 0.6 × 0.75 = ' + (3 * 0.7 * 0.6 * 0.75).toFixed(2) + ')처럼 <b>여러 수단을 더 많이</b> 써야 R < 1이 돼요. 그만큼 활동 제한도 커져요.',
        },
        {
          type: 'quiz', title: '왜 일찍 진단해야 할까?', goal: '여러 방역 수단을 함께 쓰는 까닭과, 진단 · 격리를 일찍 할수록 효과가 큰 까닭으로 알맞은 것은?',
          setup() { ensure('measures'); },
          choices: ['진단이 늦어도 격리의 효과는 똑같다', '한 가지 수단만으로는 R이 1보다 작아지기 어려워 함께 쓰고, 감염자를 빨리 찾아 분리할수록 다른 사람을 감염시키기 전에 막을 수 있어 R이 더 크게 줄어든다', '마스크 하나만 써도 R이 1보다 작아지므로 다른 수단은 필요 없다', '진단을 일찍 하면 R이 오히려 커진다'],
          answer: 1,
          feedback: ['시점 선택에서 ×0.5, ×0.6, ×0.75로 효과가 달라지는 것을 봤어요.', '', '마스크만 쓰면 R = 3.0 × 0.7 = 2.1로 아직 1보다 커요.', '일찍 진단하면 감염자를 빨리 분리해서 R이 줄어요.'],
          explain: '감염자는 격리되기 전까지 주변 사람을 계속 감염시켜요. 그래서 <b>빨리 찾아 분리</b>할수록 감염되는 사람이 줄고 R이 더 크게 내려가요. 또 수단 하나하나의 효과는 제한적이라 <b>여러 수단을 곱해서</b> 써야 R < 1이 돼요. 일찍 진단하는 데에는 앞 차시의 진단 기술이 쓰여요.',
        },
      ],
    },
    {
      title: '과학이 필요한 까닭을 논증해요', short: '논증하기', icon: '⚖️', phase: '설명', features: ['argue'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 진단 · 추적 · 모의실험으로 감염병 확산을 막는 과정을 살펴봤어요.</div>' +
        '<p>이제 <b>"' + CLAIM + '"</b>는 주장을 <b>논증</b>으로 써 봐요. 좋은 논증은 <b>주장 – 근거(자료·사실) – 추론(근거가 주장을 지지하는 이유) – 한계 · 반론 대응</b>이 모두 있어요. 카드 9장 중 알맞은 것을 골라 칸에 놓아요. <b>출처가 불분명한 글</b>은 근거가 될 수 없어요.</p>',
      setup() { if (!AR.board) buildArgue(); ensure('argue'); },
      recap: '좋은 논증은 <b>믿을 만한 근거</b>와 그 근거가 주장을 지지하는 <b>추론</b>, 그리고 <b>한계에 대한 대응</b>까지 갖춰요. 과학은 문제를 푸는 데 필요하지만 한계도 있어서 협력과 사회적 합의가 함께 필요해요.',
      summary: '<ul><li>논증의 틀: <b>주장 → 근거(자료·사실) → 추론(왜 근거가 주장을 지지하는가) → 한계 · 반론 대응</b>.</li>' +
        '<li>과학이 필요한 근거 예: 서열 공개 후 수 주 만에 진단 시약 개발, 추적과 모의실험으로 R을 낮춤, 핵산 기반 백신의 빠른 개발(약 1년 이내, 과거에는 흔히 10년 이상).</li>' +
        '<li>한계 예: 변이가 계속 나옴, 예측은 불확실함, 개인정보 · 사회적 비용 문제, 과학만으로는 해결되지 않고 협력이 필요함.</li>' +
        '<li><b>자료 점검</b>: 출처가 불분명한 정보는 누가 · 언제 · 어떤 자료로 말했는지 확인하고 다른 자료와 비교해요. <b>사실 판단</b>(자료로 확인)과 <b>가치 판단</b>(무엇이 바람직한가)을 구분해요.</li></ul>',
      missions: [
        {
          id: 'argue', title: '주장 · 근거 · 추론 · 한계로 논증하기', manual: true,
          goal: '카드 9장 중 알맞은 4장을 골라 <b>근거 2개, 추론 1개, 한계 1개</b> 칸에 놓고 <b>✔ 확인하기</b>를 눌러요.',
          hint: '근거는 서열 공개 · 모의실험 · 백신 같은 사례(사실)예요. 출처가 불분명한 글과 "언제나 정확하다"는 과장된 말은 쓰지 않아요.',
          setup() { buildArgue(); ensure('argue'); },
          check: () => argueCheck(),
          explain: '<b>근거</b>는 확인할 수 있는 사실(사례)이고, <b>추론</b>은 그 사실이 왜 주장을 지지하는지 이어 주는 설명이에요. 그리고 <b>한계</b>를 솔직하게 밝히고 대응책(협력, 계속 연구하기 등)을 생각하면 논증이 더 믿을 만해져요.',
        },
        {
          type: 'quiz', title: '자료 점검: 출처가 불분명한 정보', goal: '인터넷에서 본 출처가 불분명한 정보를 걸러 내는 기준으로 알맞은 것은?',
          setup() { ensure('argue'); },
          choices: ['많은 사람이 공유했거나 "좋아요"가 많으면 믿을 만하다', '누가 · 언제 · 어떤 자료를 근거로 썼는지 확인하고, 믿을 만한 다른 자료와 비교한다', '내 생각과 같은 내용이면 믿어도 된다', '글이 길고 전문 용어가 많으면 믿을 만하다'],
          answer: 1,
          feedback: ['공유 횟수나 "좋아요"는 사실 여부와 관계가 없어요.', '', '내 생각과 같다고 해서 사실은 아니에요. 비판적으로 평가해야 해요.', '전문 용어가 많아도 근거가 없을 수 있어요.'],
          explain: '정보의 <b>출처</b>(누가 · 언제), <b>근거 자료</b>, <b>표본 수와 측정 방법</b>을 확인하고 <b>다른 믿을 만한 자료와 비교</b>하는 것이 정보를 비판적으로 평가하는 방법이에요.',
        },
        {
          type: 'quiz', title: '사실 판단과 가치 판단', goal: '다음 중 과학적 사실만으로 답할 수 없고, <b>사회의 가치 판단</b>이 필요한 질문은?',
          setup() { ensure('argue'); },
          choices: ['마스크를 쓰면 R이 얼마나 줄어드는가?', '신속 진단 후 격리하면 확산이 줄어드는가?', '확진자의 동선 정보를 방역을 위해 어디까지 공개해도 되는가?', '핵산 기반 백신을 개발하는 데 걸린 시간은 얼마인가?'],
          answer: 2,
          feedback: ['모의실험이나 자료로 확인할 수 있는 사실에 관한 질문이에요.', '자료로 확인할 수 있는 사실에 관한 질문이에요.', '', '기록으로 확인할 수 있는 사실에 관한 질문이에요.'],
          explain: '효과나 걸린 시간처럼 <b>자료로 확인할 수 있는 것은 사실 판단</b>이에요. 하지만 개인정보를 어디까지 공개할지는 <b>방역의 이익과 사생활 보호 중 무엇을 우선할지</b> 정해야 해서 <b>가치 판단</b>이 필요해요. 과학은 선택의 근거를 주지만 결정은 사회가 함께 해요.',
        },
      ],
    },
  ];

  /* =========================================================
     시작
     ========================================================= */
  buildArgue();
  bindUI();
  game = SciSim.game({
    simId: 'h1-epidemic', mount: '#game', badge: '방역 분석가', homeHref: '../../index.html#h1b',
    featureLabels: { trace: '🔎 가상 마을 접촉 네트워크 · 염기 서열', spread: '📈 R 슬라이더 · 확산 그래프', measures: '🛡️ 방역 수단 카드 · R 계산', argue: '⚖️ 논증 카드 9장' },
    onFeatures(set) { F = set; ctlUpdate(); },
    levels,
  });
  ctlUpdate();
  showHint(MODE_HINT.trace, 5000);

  let lastFree = false;
  SciSim.loop((dt, t) => {
    S.t = t;
    if (game && game.free !== lastFree) { lastFree = game.free; ctlUpdate(); }
    const ph = game ? game.phase : '';
    if (ph === 'success' && S.ph !== 'success') {
      S.okAt = t; parts.burst(VW - 40, 40, { count: 28, speed: 210 });
      const cm = game.current();
      if (cm && cm.id === 'argue') AR.shown = true;
      if (cm && cm.id === 'identify' && TR.sel) { TR.varOn = true; ctlUpdate(); const q = POS[TR.sel]; parts.burst(q.x, q.y, { count: 22, speed: 160 }); }
    }
    S.ph = ph;
    parts.update(dt);
    view.clear('#f1f4f8');
    ctx.setTransform(view.scale * view.dpr, 0, 0, view.scale * view.dpr, 0, 0);
    if (S.mode === 'trace') drawTrace(t, dt); else if (S.mode === 'spread') drawSpread(t, dt); else if (S.mode === 'measures') drawMeasures(t, dt); else drawArgue(t, dt);
    parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(255,255,255,' + S.fade * 0.85 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : approach(S.fade, 0, dt, 9); }
    if (isNewF(S.mode)) newTag();
    const k = t - S.okAt;
    if (k >= 0 && k < 1.6) { ctx.save(); ctx.globalAlpha = 1 - clamp((k - 1.1) / 0.5, 0, 1); D.check(VW - 40, 40, 22 * SciSim.ease.outBack(Math.min(1, k / 0.4)), Math.min(1, k / 0.45)); ctx.restore(); }
    doReadouts();
  });

  window.__sim = {
    S, TR, SP, MS, AR, CASE, POS, EDGES, ROOT, FIRST, IMPORT, REF, VW, VH, ACARDS, get game() { return game; },
    setMode, ensure, ctlUpdate, setR, Rof, costOfOn, msToggle, msReset, nodeAt, traceSelect, MEAS, MLP, SPL, Ngen, diffN, buildArgue,
    solveArgue() { const b = AR.board; const pick = { ev1: 'e1', ev2: 'e2', rs: 'r1', lim: 'l1' }; Object.keys(pick).forEach((sid) => { const c = b.items.find((x) => x.id === pick[sid]); b.place(c, b.slots.find((s) => s.id === sid)); }); },
  };
})();
