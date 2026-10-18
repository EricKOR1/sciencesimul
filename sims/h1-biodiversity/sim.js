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
  const rnd = (a, b) => a + Math.random() * (b - a);
  const approach = (cur, tgt, dt, rate) => (RM ? tgt : SciSim.approach(cur, tgt, dt, rate));
  // 받침 유무에 따라 조사 고르기: josa('사과', '이/가') -> '가'
  const josa = (word, pair) => {
    const ch = String(word).charCodeAt(String(word).length - 1);
    const has = ch >= 0xac00 && ch <= 0xd7a3 && (ch - 0xac00) % 28 !== 0;
    const [a, b] = pair.split('/');
    return has ? a : b;
  };

  let view, ctx, D, VW, VH, FS;
  const parts = new SciSim.Particles();
  function initStage(bg, tw, th, pw, ph) {
    VW = PHONE ? pw : tw; VH = PHONE ? ph : th; FS = PHONE ? 1.14 : 1;
    view = SciSim.stage($('#cv'), { width: VW, height: VH, background: bg });
    ctx = view.ctx; D = SciSim.draw(ctx);
    const f0 = D.font; D.font = (n, w) => f0(Math.round(n * FS * 10) / 10, w);
  }
  const rr = (x, y, w, h, r) => { D.roundRect(x, y, w, h, r); return ctx; };
  const shade = (c, a) => SciSim.color.shade(c, a);
  const rgba = (c, a) => SciSim.color.rgba(c, a);
  const mixc = (a, b, t) => SciSim.color.mix(a, b, clamp(t, 0, 1));

  /* 글자 줄바꿈 (한국어: 공백 단위, 너무 긴 단어는 글자 단위) */
  function wrapLines(text, maxW, size, weight) {
    ctx.save(); ctx.font = D.font(size, weight || 700);
    const out = []; let line = '';
    String(text).split('\n').forEach((para, pi) => {
      if (pi > 0) { out.push(line); line = ''; }
      para.split(' ').forEach((w) => {
        let cand = line ? line + ' ' + w : w;
        if (ctx.measureText(cand).width <= maxW) { line = cand; return; }
        if (line) { out.push(line); line = ''; }
        if (ctx.measureText(w).width <= maxW) { line = w; return; }
        let cur = '';
        for (const ch of w) { if (ctx.measureText(cur + ch).width > maxW) { out.push(cur); cur = ch; } else cur += ch; }
        line = cur;
      });
    });
    out.push(line); ctx.restore();
    return out.filter((l, i) => l !== '' || i < out.length - 1);
  }
  /* 줄바꿈해서 그리기: align center/left, 반환 = 마지막 y */
  function drawWrap(x, y, text, maxW, size, o) {
    o = o || {};
    const lines = wrapLines(text, maxW, size, o.weight), lh = size * FS * (o.lh || 1.3);
    lines.forEach((l, i) => D.text(x, y + i * lh, l, { size, weight: o.weight || 700, color: o.color || '#334155', align: o.align || 'center', alpha: o.alpha }));
    return y + (lines.length - 1) * lh;
  }
  /* 말풍선(안내 글) : 반투명 흰 판 + 글 */
  function note(x, y, w, text, size, o) {
    o = o || {};
    const lines = wrapLines(text, w - 24, size, 700), lh = size * FS * 1.32, h = lines.length * lh + 14;
    D.shadow(() => { ctx.fillStyle = o.bg || 'rgba(255,255,255,.92)'; rr(x, y, w, h, 12).fill(); }, { blur: 5, y: 2 });
    if (o.border) { ctx.strokeStyle = o.border; ctx.lineWidth = 2; rr(x, y, w, h, 12).stroke(); }
    lines.forEach((l, i) => D.text(x + w / 2, y + 12 + size * FS * 0.8 + i * lh, l, { size, weight: 700, color: o.color || '#334155' }));
    return h;
  }

  /* ======================================================
     카드 보드: 카드를 칸(zone)에 끌어다 놓기 / 눌러서 고르고 칸 누르기
     ====================================================== */
  class Board {
    constructor(o) {
      this.zones = o.zones || []; this.tray = o.tray; this.cw = o.cw; this.ch = o.ch; this.gap = o.gap == null ? 8 : o.gap;
      this.onDrop = o.onDrop || (() => true); this.onPlace = o.onPlace || (() => {}); this.onReject = o.onReject || (() => {});
      this.onTap = o.onTap || null; this.vertical = !!o.vertical; this.cards = []; this.drag = null; this.selected = null; this.hoverZone = null;
      this.enabled = true; this.trayLabel = o.trayLabel || '';
    }
    add(c) {
      c.w = c.w || this.cw; c.h = c.h || this.ch; c.zone = c.zone || null; c.lift = 0; c.shake = 0; c.pop = 1;
      c.ord = this.cards.length; c.size = 15; const tw = this.vertical ? c.w - 10 : c.w - (c.draw ? c.h + 6 : 16);
      const maxLines = this.vertical ? 2 : 3;
      for (let s = 15; s >= 13; s--) { c.size = s; c.lines = wrapLines(c.label, tw, s, 800); if (c.lines.length <= maxLines && c.lines.length * s * FS * 1.25 <= (this.vertical ? c.h - (c.draw ? 36 : 8) : c.h - 6)) break; }
      c.x = c.tx = c.x || 0; c.y = c.ty = c.y || 0; this.cards.push(c); return c;
    }
    zone(id) { return this.zones.find((z) => z.id === id); }
    inZone(id) { return this.cards.filter((c) => c.zone === id); }
    layout(snap) {
      const trayCards = this.cards.filter((c) => !c.zone).sort((a, b) => a.ord - b.ord);
      const T = this.tray;
      if (T) {
        const cols = T.cols || Math.max(1, Math.floor((T.w + this.gap) / (this.cw + this.gap)));
        trayCards.forEach((c, i) => {
          const col = i % cols, row = Math.floor(i / cols), n = Math.min(cols, trayCards.length - row * cols);
          const rowW = n * this.cw + (n - 1) * this.gap;
          c.tx = T.x + (T.w - (cols * this.cw + (cols - 1) * this.gap)) / 2 + this.cw / 2 + col * (this.cw + this.gap);
          c.ty = T.y + this.ch / 2 + row * (this.ch + this.gap);
        });
      }
      this.zones.forEach((z) => {
        const zc = this.inZone(z.id), head = z.head == null ? 28 : z.head;
        const cols = z.cols || Math.max(1, Math.floor((z.w - 8 + this.gap) / (this.cw + this.gap)));
        zc.forEach((c, i) => {
          const col = i % cols, row = Math.floor(i / cols);
          c.tx = z.x + (z.w - (cols * this.cw + (cols - 1) * this.gap)) / 2 + this.cw / 2 + col * (this.cw + this.gap);
          c.ty = z.center ? z.y + z.h / 2 : z.y + head + 4 + this.ch / 2 + row * (this.ch + this.gap);
        });
      });
      if (snap || RM) this.cards.forEach((c) => { if (!(this.drag && this.drag.c === c)) { c.x = c.tx; c.y = c.ty; } });
    }
    reset() { this.cards.forEach((c) => { c.zone = null; c.sel = false; }); this.selected = null; this.drag = null; this.layout(true); }
    update(dt) {
      this.cards.forEach((c) => {
        const dragging = this.drag && this.drag.c === c;
        if (!dragging) { c.x = approach(c.x, c.tx, dt, 14); c.y = approach(c.y, c.ty, dt, 14); }
        c.lift = approach(c.lift, dragging ? 1 : 0, dt, 16);
        if (c.shake > 0) c.shake = Math.max(0, c.shake - dt);
      });
    }
    hit(p) {
      for (let i = this.cards.length - 1; i >= 0; i--) {
        const c = this.cards[i];
        if (c.fixed) continue;
        if (Math.abs(p.x - c.x) <= c.w / 2 && Math.abs(p.y - c.y) <= c.h / 2) return c;
      }
      return null;
    }
    zoneAt(p) {
      for (let i = this.zones.length - 1; i >= 0; i--) {
        const z = this.zones[i];
        if (p.x >= z.x - 4 && p.x <= z.x + z.w + 4 && p.y >= z.y - 4 && p.y <= z.y + z.h + 4) return z;
      }
      return null;
    }
    down(p) {
      if (!this.enabled) return false;
      const c = this.hit(p);
      if (c) {
        const i = this.cards.indexOf(c); this.cards.splice(i, 1); this.cards.push(c);
        this.drag = { c, ox: p.x - c.x, oy: p.y - c.y, sx: p.x, sy: p.y, moved: false };
        Sound.click(); return true;
      }
      if (this.selected) { const z = this.zoneAt(p); if (z) { this.place(this.selected, z, p); this.selected.sel = false; this.selected = null; } }
      return false;
    }
    move(p) {
      const d = this.drag; if (!d) return;
      d.c.x = p.x - d.ox; d.c.y = p.y - d.oy;
      if (Math.hypot(p.x - d.sx, p.y - d.sy) > 9) d.moved = true;
      this.hoverZone = d.moved ? this.zoneAt(p) : null;
    }
    up(p) {
      const d = this.drag; if (!d) return; this.drag = null; this.hoverZone = null;
      const c = d.c;
      if (!d.moved) {
        if (this.selected === c) { c.sel = false; this.selected = null; }
        else { if (this.selected) this.selected.sel = false; this.selected = c; c.sel = true; }
        this.onTap && this.onTap(c);
        return;
      }
      if (this.selected) { this.selected.sel = false; this.selected = null; }
      const z = this.zoneAt(p);
      if (z) this.place(c, z, p); else { c.zone = null; this.layout(); }
    }
    place(c, z, p) {
      const res = this.onDrop(c, z);
      if (res === 'keep') { c.zone = null; this.layout(); return; }
      if (res !== true) { c.shake = 0.45; Sound.fail(); this.onReject(c, z, typeof res === 'string' ? res : ''); this.layout(); return; }
      if (z.cap) {
        const occ = this.inZone(z.id).filter((x) => x !== c);
        if (occ.length >= z.cap) {
          if (z.cap === 1) occ[0].zone = null;
          else { c.shake = 0.45; Sound.fail(); this.onReject(c, z, '이 칸은 가득 찼어요'); this.layout(); return; }
        }
      }
      c.zone = z.id; this.layout();
      Sound.tick();
      parts.burst(c.tx, c.ty, { count: 8, speed: 90, size: 3, life: 0.5, colors: [z.color || '#16a34a', '#fff'] });
      this.onPlace(c, z);
    }
    drawCard(c, t) {
      const sc = 1 + c.lift * 0.07, sh = c.shake > 0 ? Math.sin(c.shake * 50) * 5 : 0;
      ctx.save(); ctx.translate(c.x + sh, c.y - c.lift * 3); ctx.scale(sc, sc);
      const w = c.w, h = c.h;
      D.shadow(() => { ctx.fillStyle = c.fill || '#fff'; rr(-w / 2, -h / 2, w, h, 11).fill(); }, { blur: 3 + c.lift * 9, y: 2 + c.lift * 4 });
      ctx.strokeStyle = c.sel ? '#f59e0b' : c.border || '#cfd8e6'; ctx.lineWidth = c.sel ? 3.5 : 2; rr(-w / 2, -h / 2, w, h, 11).stroke();
      let tx = 0, ty0 = 0, tw = w - 14;
      if (c.draw) {
        if (this.vertical) { c.draw(0, -h / 2 + 22, 30, t); ty0 = 16; }
        else { const iw = h - 6; ctx.save(); rr(-w / 2 + 4, -h / 2 + 4, iw - 2, h - 8, 8).clip(); ctx.fillStyle = c.iconBg || 'rgba(0,0,0,.04)'; ctx.fillRect(-w / 2 + 4, -h / 2 + 4, iw, h - 8); c.draw(-w / 2 + 4 + (iw - 2) / 2, 0, h - 14, t); ctx.restore(); tx = (iw + 2) / 2; tw = w - iw - 12; }
      }
      const lh = c.size * FS * 1.22, n = c.lines.length, y0 = ty0 - ((n - 1) * lh) / 2 + c.size * FS * 0.36;
      c.lines.forEach((l, i) => D.text(tx, y0 + i * lh, l, { size: c.size, weight: 800, color: c.color || '#1e293b' }));
      if (c.badge) D.text(w / 2 - 12, -h / 2 + 15, c.badge, { size: 14, weight: 800, color: c.badgeColor || '#16a34a' });
      ctx.restore();
    }
    draw(t) {
      this.zones.forEach((z) => {
        const hv = this.hoverZone === z;
        const sel = this.selected;
        ctx.save();
        D.shadow(() => { ctx.fillStyle = z.fill || 'rgba(255,255,255,.75)'; rr(z.x, z.y, z.w, z.h, 14).fill(); }, { blur: 4, y: 1 });
        ctx.setLineDash(hv ? [] : [7, 5]); ctx.strokeStyle = hv ? (z.color || '#16a34a') : (z.line || '#b6c3d4'); ctx.lineWidth = hv ? 3.5 : 2.2; rr(z.x, z.y, z.w, z.h, 14).stroke(); ctx.setLineDash([]);
        ctx.restore();
        if (z.label) D.text(z.x + 12, z.y + 20, z.label, { size: z.lsize || 14.5, weight: 800, color: z.color || '#334155', align: 'left' });
        if (z.sub) D.text(z.x + z.w - 10, z.y + 20, z.sub, { size: 13, weight: 700, color: '#64748b', align: 'right' });
        if (sel && !this.drag) D.ring(z.x + z.w / 2, z.y + z.h / 2, Math.min(z.w, z.h) * 0.18, t, { color: z.color || '#16a34a', speed: 0.9, width: 2 });
        if (z.draw) z.draw(z, t);
      });
      const dragC = this.drag && this.drag.c;
      this.cards.forEach((c) => { if (c !== dragC) this.drawCard(c, t); });
      if (dragC) this.drawCard(dragC, t);
    }
  }

  /* 읽음 칸 3개 */
  const rdEls = [1, 2, 3].map((i) => [$('#l' + i), $('#v' + i)]);
  let rdLast = '';
  function setReadouts(a) {
    const key = a.join('|'); if (key === rdLast) return; rdLast = key;
    for (let i = 0; i < 3; i++) { rdEls[i][0].textContent = a[i * 2]; rdEls[i][1].textContent = a[i * 2 + 1]; }
  }
  let hintTimer = null;
  function showHint(msg, ms) { const h = $('#stageHint'); if (!h) return; h.textContent = msg; h.classList.remove('hide'); clearTimeout(hintTimer); hintTimer = setTimeout(() => h.classList.add('hide'), ms || 4200); }
  /* 캔버스 위 일시 메시지 */
  const flash = { text: '', t: 0, bg: '#15803d' };
  function say(text, bad, sec) { flash.text = text; flash.t = sec || 2.8; flash.bg = bad ? '#b91c1c' : '#15803d'; }
  function drawFlash(dt, y) {
    if (flash.t <= 0) return;
    flash.t -= dt;
    const a = clamp(flash.t / 0.4, 0, 1);
    const lines = wrapLines(flash.text, VW - 60, PHONE ? 13 : 14.5, 800), lh = (PHONE ? 13 : 14.5) * FS * 1.3, h = lines.length * lh + 14;
    ctx.save(); ctx.globalAlpha = a;
    D.shadow(() => { ctx.fillStyle = flash.bg; rr(VW / 2 - (VW - 40) / 2, y, VW - 40, h, 12).fill(); }, { blur: 6, y: 2 });
    lines.forEach((l, i) => D.text(VW / 2, y + 7 + (PHONE ? 13 : 14.5) * FS * 0.95 + i * lh, l, { size: PHONE ? 13 : 14.5, weight: 800, color: '#fff' }));
    ctx.restore();
  }


  /* =========================================================
     통합과학2 Ⅰ. 변화와 다양성 - 진화와 생물다양성 (단원 4차시)
     성취기준 [10통과2-01-02] 변이의 발생과 자연선택 과정을 통해 생물의 진화가 일어나고, 진화의 과정을 통해
     생물다양성이 형성되었음을 추론할 수 있다.
     ① 모형: 종의 분화 (격리 + 서로 다른 환경의 자연선택 + 시간 → 생식적 격리)
     ② 분석: 세 가지 다양성 (유전적 · 종 · 생태계)
     ③ 분석: 다양성 위기 (서식지 파괴·분단, 외래종, 오염)
     ④ 적용: 보전 실천
     ※ 분자 진화, 계통수, 종 정의 논쟁은 다루지 않음
     ========================================================= */
  initStage('#eef7ee', 800, 560, 520, 820);
  const SCALEF = PHONE ? 1 : 1;

  /* ---------- 모형 상수 (글에 나오는 숫자는 모두 이 상수에서 가져와요) ---------- */
  const POP_N = 200, B_MIN = 4, B_MAX = 14, BIN_W = 0.5, NBIN = Math.round((B_MAX - B_MIN) / BIN_W);
  const START_MEAN = 9, START_SD = 1.0, OPT_SEED = 12, OPT_INSECT = 6, OPT_MIX = 9;
  const SEL_SIG = 7, MUT_SD = 0.2, GEN_DT = 0.07, GEN_GOAL = 100;
  const MATE_TOL = 1.5, ISO_PCT = 10, SEEDS = [3, 6, 10, 1, 9];
  const Y_MAX = 40; // 그래프 세로축 최대(%)
  const f1 = (v) => (Math.round(v * 10) / 10).toFixed(1);

  function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function gaussR(r) { let u = 0; while (!u) u = r(); const v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v); }
  const mean = (a) => a.reduce((s, x) => s + x, 0) / Math.max(1, a.length);

  /* ======================================================
     ① 종의 분화
     ====================================================== */
  const SP = { seedIdx: 0, rng: null, gen: 0, split: false, gap: 0, play: false, acc: 0, U: [], A: [], B: [], p0: [], pU: [], pA: [], pB: [], dU: [], dA: [], dB: [],
    birds: { U: [], A: [], B: [] }, merge: false, mergeT: 0, pairs: [], ratePct: 0, mA: START_MEAN, mB: START_MEAN, flowT: 0, mergedAtGen: -1, msg: '', msgT: 0, tested: false };
  function binsOf(pop) {
    const c = new Array(NBIN).fill(0);
    pop.forEach((b) => { c[clamp(Math.floor((b - B_MIN) / BIN_W), 0, NBIN - 1)]++; });
    return c.map((n) => (n / pop.length) * 100);
  }
  function spReset(keepSeed) {
    if (!keepSeed) SP.seedIdx = (SP.seedIdx + 1) % SEEDS.length;
    SP.rng = mulberry32(SEEDS[SP.seedIdx]);
    SP.U = []; for (let i = 0; i < POP_N; i++) SP.U.push(clamp(START_MEAN + gaussR(SP.rng) * START_SD, B_MIN, B_MAX));
    SP.A = []; SP.B = []; SP.gen = 0; SP.split = false; SP.play = false; SP.acc = 0; SP.merge = false; SP.mergeT = 0; SP.pairs = []; SP.ratePct = 0; SP.tested = false;
    SP.p0 = binsOf(SP.U); SP.pU = SP.p0.slice(); SP.pA = SP.p0.slice(); SP.pB = SP.p0.slice();
    SP.dU = SP.p0.slice(); SP.dA = SP.p0.slice(); SP.dB = SP.p0.slice();
    SP.mA = SP.mB = mean(SP.U); SP.msg = ''; SP.msgT = 0; SP.mergedAtGen = -1;
    SP.gap = 0; spBirdsSync(true);
  }
  function selStep(pop, opt) {
    const w = pop.map((b) => Math.exp(-((b - opt) * (b - opt)) / (2 * SEL_SIG * SEL_SIG)));
    const tot = w.reduce((a, b) => a + b, 0), out = [];
    for (let i = 0; i < POP_N; i++) {
      let x = SP.rng() * tot, k = 0;
      while (k < POP_N - 1 && x > w[k]) { x -= w[k]; k++; }
      out.push(clamp(pop[k] + gaussR(SP.rng) * MUT_SD, B_MIN, B_MAX));
    }
    return out;
  }
  function spStep() {
    if (SP.split) { SP.A = selStep(SP.A, OPT_SEED); SP.B = selStep(SP.B, OPT_INSECT); SP.pA = binsOf(SP.A); SP.pB = binsOf(SP.B); SP.mA = mean(SP.A); SP.mB = mean(SP.B); SP.ratePct = Math.round(spRate() * 100); }
    else { SP.U = selStep(SP.U, OPT_MIX); SP.pU = binsOf(SP.U); SP.mA = SP.mB = mean(SP.U); }
    SP.gen++; spBirdsSync(false);
  }
  function spRate() {
    let c = 0;
    for (let i = 0; i < SP.A.length; i++) for (let j = 0; j < SP.B.length; j++) if (Math.abs(SP.A[i] - SP.B[j]) <= MATE_TOL) c++;
    return c / (SP.A.length * SP.B.length);
  }
  function spSplit() {
    if (SP.split) return;
    SP.split = true; SP.A = SP.U.slice(); SP.B = SP.U.slice();
    SP.pA = binsOf(SP.A); SP.pB = binsOf(SP.B); SP.mA = mean(SP.A); SP.mB = mean(SP.B); SP.ratePct = Math.round(spRate() * 100);
    SP.msg = '강이 생겼어요! 두 집단은 이제 서로 만나지 못해요'; SP.msgT = 3.2; Sound.click();
    spBirdsSync(false);
    const L = spLay(); parts.burst(L.mid, L.waterY, { count: 16, speed: 120, size: 3.5, life: 0.8, colors: ['#7dd3fc', '#bae6fd', '#fff'], gravity: 160 });
  }
  const QN = () => (PHONE ? 5 : 7);
  function quantiles(pop, n) { const s = pop.slice().sort((a, b) => a - b); const out = []; for (let i = 0; i < n; i++) out.push(s[Math.floor(((i + 0.5) / n) * s.length)]); return out; }
  function spBirdsSync(snap) {
    const n = QN();
    const set = (key, pop) => {
      const q = quantiles(pop, key === 'U' ? n + (PHONE ? 1 : 2) : n);
      const arr = SP.birds[key];
      q.forEach((v, i) => { if (!arr[i]) arr[i] = { v, t: v, x: 0, tx: 0, bob: Math.random() * 6 }; arr[i].t = v; if (snap) arr[i].v = v; });
      arr.length = q.length;
    };
    set('U', SP.split ? SP.U : SP.U); if (SP.split) { set('A', SP.A); set('B', SP.B); }
  }
  function spLay() {
    return PHONE
      ? { sc: { x: 0, y: 0, w: 520, h: 340 }, waterY: 268, hump: 84, x0: 20, x1: 500, mid: 260, pl: { x: 52, y: 430, w: 440, h: 238 } }
      : { sc: { x: 0, y: 0, w: 800, h: 270 }, waterY: 214, hump: 78, x0: 30, x1: 770, mid: 400, pl: { x: 58, y: 322, w: 716, h: 176 } };
  }
  function landY(L, x) {
    const u = clamp((x - L.x0) / (L.x1 - L.x0), 0, 1);
    const hump = Math.pow(Math.sin(Math.PI * u), 0.75);
    const valley = Math.exp(-Math.pow((x - L.mid) / (PHONE ? 20 : 26), 2));
    return L.waterY - L.hump * hump + L.hump * 1.35 * SP.gap * valley;
  }
  /* 되새(핀치) 그림: 부리 두께 mm가 그대로 부리의 굵기가 돼요 */
  function finch(x, y, s, mm, face, col, o) {
    o = o || {};
    ctx.save(); ctx.translate(x, y); ctx.scale(face * s, s);
    if (o.alpha != null) ctx.globalAlpha = o.alpha;
    // 다리
    ctx.strokeStyle = '#7c5a2e'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-3, -3); ctx.lineTo(-4, 4); ctx.moveTo(4, -3); ctx.lineTo(4, 4); ctx.stroke();
    // 꼬리
    ctx.fillStyle = shade(col, -0.25); ctx.beginPath(); ctx.moveTo(-12, -14); ctx.lineTo(-26, -9); ctx.lineTo(-24, -17); ctx.closePath(); ctx.fill();
    // 몸
    const g = ctx.createRadialGradient(-4, -20, 2, 0, -14, 17); g.addColorStop(0, shade(col, 0.4)); g.addColorStop(1, shade(col, -0.2));
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, -13, 16, 11, 0, 0, TAU); ctx.fill();
    // 머리
    ctx.beginPath(); ctx.arc(11, -21, 8.5, 0, TAU); ctx.fillStyle = g; ctx.fill();
    // 부리 (굵기 = 부리 두께)
    const depth = (2 + 0.8 * mm), len = 7 + 0.25 * mm;
    ctx.fillStyle = '#f59e0b'; ctx.strokeStyle = '#b45309'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(17, -21 - depth / 2); ctx.lineTo(17 + len, -21); ctx.lineTo(17, -21 + depth / 2); ctx.closePath(); ctx.fill(); ctx.stroke();
    // 눈
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(13, -23, 2.6, 0, TAU); ctx.fill(); ctx.fillStyle = '#111827'; ctx.beginPath(); ctx.arc(13.6, -23, 1.4, 0, TAU); ctx.fill();
    ctx.restore();
  }
  function drawLand(L, t) {
    // 하늘 + 바다 + 땅
    D.sky(L.sc.x, L.sc.y, L.sc.w, L.sc.h, '#bfe3ff', '#f1f9ff');
    D.glow(L.sc.w * 0.86, 40, 70, '#fde68a', 0.7);
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, L.sc.w, L.sc.h); ctx.clip();
    // 땅 (골짜기가 깊어지면 강이 생겨요)
    ctx.beginPath(); ctx.moveTo(L.x0 - 10, L.waterY + 40);
    for (let x = L.x0 - 10; x <= L.x1 + 10; x += 4) ctx.lineTo(x, landY(L, x));
    ctx.lineTo(L.x1 + 10, L.waterY + 40); ctx.closePath();
    const lg = ctx.createLinearGradient(0, L.waterY - L.hump, 0, L.waterY + 20); lg.addColorStop(0, '#86d36f'); lg.addColorStop(0.55, '#5fb356'); lg.addColorStop(1, '#a8865a');
    ctx.fillStyle = lg; ctx.fill(); ctx.strokeStyle = '#3f8f45'; ctx.lineWidth = 2; ctx.stroke();
    // 바다/강 (땅 앞쪽 물)
    const wg = ctx.createLinearGradient(0, L.waterY, 0, L.sc.h); wg.addColorStop(0, 'rgba(56,160,230,.92)'); wg.addColorStop(1, 'rgba(20,100,190,.96)');
    ctx.fillStyle = wg; ctx.fillRect(0, L.waterY, L.sc.w, L.sc.h - L.waterY);
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 2;
    for (let k = 0; k < 4; k++) { const y = L.waterY + 8 + k * ((L.sc.h - L.waterY - 10) / 4); ctx.beginPath(); for (let x = 0; x <= L.sc.w; x += 8) ctx.lineTo(x, y + Math.sin(x * 0.04 + t * 1.6 + k) * 2.5); ctx.stroke(); }
    // 강물이 흐르는 줄무늬 (골짜기 안)
    if (SP.gap > 0.05) {
      ctx.save(); ctx.beginPath(); ctx.rect(L.mid - 60, L.waterY - 40, 120, 60); ctx.clip();
      ctx.fillStyle = 'rgba(90,180,240,' + (0.75 * SP.gap) + ')';
      ctx.beginPath(); ctx.moveTo(L.mid - 60, L.waterY + 2); for (let x = L.mid - 60; x <= L.mid + 60; x += 4) ctx.lineTo(x, Math.min(L.waterY + 2, landY(L, x) - 1)); ctx.lineTo(L.mid + 60, L.waterY + 2); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2;
      for (let k = 0; k < 3; k++) { const yy = L.waterY - 6 - k * 9; const off = (t * 40 + k * 17) % 24; ctx.beginPath(); for (let x = L.mid - 40 - off; x < L.mid + 40; x += 24) { if (x > L.mid - 40) { ctx.moveTo(x, yy); ctx.lineTo(x + 12, yy); } } ctx.stroke(); }
      ctx.restore();
    }
    ctx.restore();
  }
  function drawSeedsInsects(L, t) {
    // 먹이 그림: 단단한 씨앗(왼쪽 섬) / 곤충(오른쪽 섬) / 섞여 있음(나뉘기 전)
    const sp = L.x1 - L.x0, a = SP.gap;
    const seedAt = (x, y) => { D.sphere(x, y, 6, '#92400e', { gloss: false }); ctx.strokeStyle = '#451a03'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(x, y, 6, 0.3, 2.2); ctx.stroke(); };
    const bugAt = (x, y, ph) => { const w = Math.sin(t * 5 + ph) * 1.5; ctx.fillStyle = '#7c3aed'; ctx.beginPath(); ctx.ellipse(x, y + w * 0.3, 6, 3.6, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = '#4c1d95'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x - 4, y + 2); ctx.lineTo(x - 6, y + 5 + w); ctx.moveTo(x + 1, y + 3); ctx.lineTo(x + 1, y + 6 - w); ctx.moveTo(x + 5, y + 2); ctx.lineTo(x + 7, y + 5 + w); ctx.stroke(); D.sphere(x + 5, y - 1, 2.6, '#a78bfa', { gloss: false }); };
    const n = PHONE ? 5 : 8;
    for (let i = 0; i < n; i++) {
      const u1 = 0.1 + 0.3 * ((i * 0.37 + 0.11) % 1), u2 = 0.6 + 0.3 * ((i * 0.53 + 0.2) % 1);
      const xs = L.x0 + sp * u1, xi = L.x0 + sp * u2;
      const xsU = L.x0 + sp * (0.1 + 0.8 * ((i * 0.37 + 0.11) % 1)), xiU = L.x0 + sp * (0.1 + 0.8 * ((i * 0.61 + 0.37) % 1));
      const sx = lerp(xsU, xs, a), ix = lerp(xiU, xi, a);
      seedAt(sx, landY(L, sx) + 11 + (i % 3) * 5); bugAt(ix, landY(L, ix) + 11 + ((i + 1) % 3) * 5, i);
    }
    if (a > 0.6) {
      D.label(L.x0 + sp * 0.25, L.sc.y + 22, '🌰 딱딱한 씨앗 섬', { bg: '#b45309', size: 13.5 });
      D.label(L.x0 + sp * 0.75, L.sc.y + 22, '🪲 곤충 섬', { bg: '#6d28d9', size: 13.5 });
    } else D.label(L.mid, L.sc.y + 22, '🌰 씨앗과 🪲 곤충이 섞여 있는 섬', { bg: '#15803d', size: 13.5 });
  }
  function drawBirds(L, t, dt) {
    const place = (arr, x0, x1, col, face) => {
      arr.forEach((b, i) => {
        const tx = x0 + (x1 - x0) * (arr.length === 1 ? 0.5 : i / (arr.length - 1));
        b.tx = tx; b.x = b.x ? approach(b.x, tx, dt, 5) : tx; b.v = approach(b.v, b.t, dt, 8);
        const y = landY(L, b.x) + 2 + Math.sin(t * 2.6 + b.bob) * (RM ? 0 : 1.6);
        finch(b.x, y, PHONE ? 0.9 : 1.05, b.v, face, col);
        D.text(b.x, y + (PHONE ? 20 : 20), f1(b.t), { size: 13, weight: 800, color: '#14532d', stroke: 'rgba(255,255,255,.85)' });
      });
    };
    if (!SP.split) place(SP.birds.U, L.x0 + 60, L.x1 - 60, '#a8794a', 1);
    else {
      place(SP.birds.A, L.x0 + 40, L.mid - 50, '#d97706', 1);
      place(SP.birds.B, L.mid + 50, L.x1 - 40, '#2f78c4', -1);
    }
    D.text(L.sc.w - 12, L.sc.h - 8, '새 아래 숫자 = 부리 두께(mm)', { size: 12, weight: 700, color: 'rgba(255,255,255,.95)', align: 'right' });
  }
  /* 합쳐서 짝짓기 시험 */
  function spMakePairs() {
    const r = mulberry32(5000 + SP.gen * 7 + (SP.pairs.length ? 3 : 0)); const out = [];
    for (let i = 0; i < 6; i++) { const a = SP.A[Math.floor(r() * SP.A.length)], b = SP.B[Math.floor(r() * SP.B.length)]; out.push({ a, b, ok: Math.abs(a - b) <= MATE_TOL, t: -i * 0.18 }); }
    SP.pairs = out; SP.ratePct = Math.round(spRate() * 100); SP.mergeT = 0;
  }
  function spMerge(on) {
    if (on) { if (!SP.split || SP.gen < 1) return; SP.play = false; SP.merge = true; spMakePairs(); SP.mergedAtGen = SP.gen; Sound.click(); }
    else { SP.merge = false; Sound.click(); }
    ctlUpdate();
  }
  const isolated = () => SP.split && SP.ratePct < ISO_PCT;
  function drawMerge(L, t, dt) {
    D.sky(L.sc.x, L.sc.y, L.sc.w, L.sc.h, '#d6ecff', '#f7fbff');
    const gy = L.sc.h - 40;
    ctx.fillStyle = '#9bd484'; rr(0, gy - 6, L.sc.w, L.sc.h - gy + 6, 0).fill();
    D.text(L.sc.w / 2, 26, '두 집단을 한 섬에 모았어요: 짝이 될 수 있을까?', { size: 15.5, weight: 800, color: '#14532d' });
    D.text(L.sc.w / 2, 46, '부리 두께 차이가 ' + MATE_TOL + ' mm 이하일 때만 짝으로 받아들인다고 가정해요', { size: 13, weight: 700, color: '#475569' });
    SP.mergeT += dt;
    const cols = PHONE ? 3 : 6, rows = PHONE ? 2 : 1, cw = L.sc.w / cols, ch = PHONE ? 100 : 120;
    SP.pairs.forEach((p, i) => {
      const c = i % cols, r = Math.floor(i / cols), cx = cw * (c + 0.5), cy = (PHONE ? 92 : 108) + r * (ch + 10) + 40;
      const k = clamp((SP.mergeT + p.t) / 0.5, 0, 1), e = SciSim.ease.outBack(k);
      ctx.save(); ctx.globalAlpha = clamp(k * 2, 0, 1);
      const off = (PHONE ? 38 : 40) * (1 - 0.35 * e);
      finch(cx - off, cy + 6, PHONE ? 0.78 : 0.88, p.a, 1, '#d97706');
      finch(cx + off, cy + 6, PHONE ? 0.78 : 0.88, p.b, -1, '#2f78c4');
      D.text(cx - off, cy + 28, f1(p.a), { size: 13, weight: 800, color: '#92400e' });
      D.text(cx + off, cy + 28, f1(p.b), { size: 13, weight: 800, color: '#1d4ed8' });
      if (k >= 1) {
        if (p.ok) { D.text(cx, cy - 22 + Math.sin(t * 4 + i) * 2, '♥', { size: 24, weight: 800, color: '#e11d48' }); D.text(cx, cy + 46, '짝 성공', { size: 13, weight: 800, color: '#15803d' }); }
        else { D.text(cx, cy - 20, '✗', { size: 24, weight: 800, color: '#64748b' }); D.text(cx, cy + 46, '교배 불가', { size: 13, weight: 800, color: '#b91c1c' }); }
      }
      ctx.restore();
    });
    const msg = isolated() ? '교배 가능한 쌍 ' + SP.ratePct + ' % → 생식적 격리: 서로 다른 종이 되었어요' : '교배 가능한 쌍 ' + SP.ratePct + ' % → 아직 짝이 되는 쌍이 많아요 (같은 종으로 볼 수 있어요)';
    D.label(L.sc.w / 2, L.sc.h - 16, msg, { bg: isolated() ? '#15803d' : '#b45309', size: PHONE ? 12 : 14 });
  }
  function drawHist(L, t, dt) {
    const P = L.pl, x2px = (b) => P.x + ((b - B_MIN) / (B_MAX - B_MIN)) * P.w, y2px = (v) => P.y + P.h - (clamp(v, 0, Y_MAX) / Y_MAX) * P.h;
    // 판
    D.shadow(() => { ctx.fillStyle = 'rgba(255,255,255,.92)'; rr(P.x - 44, P.y - 34, P.w + 58, P.h + 82, 12).fill(); }, { blur: 5, y: 2 });
    D.text(P.x - 30, P.y - 14, '비율(%)', { size: 12.5, weight: 700, color: '#64748b', align: 'left' });
    ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1;
    for (let v = 0; v <= Y_MAX; v += 10) { ctx.beginPath(); ctx.moveTo(P.x, y2px(v)); ctx.lineTo(P.x + P.w, y2px(v)); ctx.stroke(); D.text(P.x - 6, y2px(v) + 4, String(v), { size: 12, weight: 700, color: '#64748b', align: 'right' }); }
    for (let b = B_MIN; b <= B_MAX; b += 2) { D.text(x2px(b), P.y + P.h + 17, String(b), { size: 12.5, weight: 700, color: '#475569' }); ctx.beginPath(); ctx.moveTo(x2px(b), P.y + P.h); ctx.lineTo(x2px(b), P.y + P.h + 4); ctx.strokeStyle = '#94a3b8'; ctx.stroke(); }
    D.text(P.x + P.w / 2, P.y + P.h + 36, '부리 두께 (mm)', { size: 13, weight: 800, color: '#334155' });
    // 곡선들 (표시값 approach)
    const tgtU = SP.pU, tgtA = SP.pA, tgtB = SP.pB;
    for (let i = 0; i < NBIN; i++) { SP.dU[i] = approach(SP.dU[i], tgtU[i], dt, 9); SP.dA[i] = approach(SP.dA[i], tgtA[i], dt, 9); SP.dB[i] = approach(SP.dB[i], tgtB[i], dt, 9); }
    const curve = (arr, col, fillA, dash) => {
      const pts = arr.map((v, i) => [x2px(B_MIN + (i + 0.5) * BIN_W), y2px(v)]);
      ctx.beginPath(); ctx.moveTo(pts[0][0], P.y + P.h); ctx.lineTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length - 1; i++) { const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2; ctx.quadraticCurveTo(pts[i][0], pts[i][1], mx, my); }
      ctx.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1]); ctx.lineTo(pts[pts.length - 1][0], P.y + P.h);
      if (fillA) { ctx.fillStyle = rgba(col, fillA); ctx.fill(); }
      ctx.save(); if (dash) ctx.setLineDash(dash); ctx.strokeStyle = col; ctx.lineWidth = dash ? 2 : 3; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length - 1; i++) { const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2; ctx.quadraticCurveTo(pts[i][0], pts[i][1], mx, my); }
      ctx.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1]); ctx.stroke(); ctx.restore();
    };
    ctx.save(); ctx.beginPath(); ctx.rect(P.x, P.y - 2, P.w, P.h + 2); ctx.clip();
    curve(SP.p0, '#94a3b8', 0, [6, 5]);
    if (!SP.split) curve(SP.dU, '#16a34a', 0.28);
    else { curve(SP.dA, '#d97706', 0.28); curve(SP.dB, '#2f78c4', 0.28); }
    ctx.restore();
    // 평균 표시
    const tri = (m, col, lab) => { const x = x2px(clamp(m, B_MIN, B_MAX)); ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x, P.y + P.h); ctx.lineTo(x - 7, P.y + P.h + 11); ctx.lineTo(x + 7, P.y + P.h + 11); ctx.closePath(); ctx.fill(); ctx.strokeStyle = rgba(col, 0.6); ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(x, P.y + P.h); ctx.lineTo(x, P.y + 4); ctx.stroke(); ctx.setLineDash([]); D.label(x, P.y + 10, lab, { bg: col, size: 12.5 }); };
    if (!SP.split) tri(SP.mA, '#16a34a', '평균 ' + f1(SP.mA)); else { tri(SP.mA, '#d97706', '씨앗 ' + f1(SP.mA)); tri(SP.mB, '#2f78c4', '곤충 ' + f1(SP.mB)); }
    // 범례 + 유리한 두께
    D.text(P.x + P.w, P.y - 14, '┅ 처음 집단(0세대)', { size: 12.5, weight: 700, color: '#64748b', align: 'right' });
    D.text(x2px(OPT_INSECT), P.y + P.h - 6, '얇은 부리 유리', { size: 12, weight: 700, color: SP.split ? '#1d4ed8' : 'rgba(0,0,0,0)' });
    D.text(x2px(OPT_SEED), P.y + P.h - 6, '두꺼운 부리 유리', { size: 12, weight: 700, color: SP.split ? '#b45309' : 'rgba(0,0,0,0)' });
  }
  function drawSpeci(t, dt) {
    const L = spLay();
    ctx.fillStyle = '#eef7ee'; ctx.fillRect(0, 0, VW, VH);
    SP.gap = approach(SP.gap, SP.split ? 1 : 0, dt, 1.8);
    if (SP.merge) drawMerge(L, t, dt);
    else { drawLand(L, t); drawSeedsInsects(L, t); drawBirds(L, t, dt); }
    drawHist(L, t, dt);
    if (SP.msgT > 0) { SP.msgT -= dt; if (!SP.merge) D.label(L.sc.w / 2, L.sc.h - (PHONE ? 38 : 30) - 0, SP.msg, { bg: 'rgba(21,128,61,.95)', size: PHONE ? 12 : 14 }); }
    // 세대 표시
    D.label(L.pl.x + L.pl.w / 2, L.pl.y - 16, SP.gen + '세대', { bg: 'rgba(30,41,59,.88)', size: 14 });
  }
  function stepSpeci(dt) {
    SP.flowT += dt;
    if (SP.play && !SP.merge) {
      SP.acc += dt;
      while (SP.acc >= GEN_DT) { SP.acc -= GEN_DT; spStep(); }
    }
  }

  /* ======================================================
     카드 보드 만들기 도우미 + 채점
     ====================================================== */
  function boardCheck(b, want, noun) {
    const un = b.cards.filter((c) => !c.zone).length;
    if (un) return '아직 놓지 않은 카드가 <b>' + un + '장</b> 있어요. 모든 카드를 칸에 놓은 뒤 확인해요.';
    const bad = b.cards.filter((c) => c.zone !== want(c));
    b.cards.forEach((c) => { const isBad = bad.includes(c); if (isBad && c.badge !== '✗') c.shake = 0.45; c.badge = isBad ? '✗' : ''; c.badgeColor = '#dc2626'; });
    if (bad.length) return '<b>' + bad.length + '장</b>이 알맞지 않은 칸에 있어요. ✗ 표시가 붙은 카드를 다시 생각해 봐요.';
    return true;
  }

  /* ======================================================
     ② 세 가지 다양성
     ====================================================== */
  const PATS = [
    { shell: '#dc2626', spot: '#111827', n: 6 }, { shell: '#f59e0b', spot: '#111827', n: 2 },
    { shell: '#1f2937', spot: '#ef4444', n: 2 }, { shell: '#facc15', spot: '#78350f', n: 4 },
  ];
  const VULN = 0, GN_N = 24;
  const GN = { run: false, t: 0, did: false, bugs: { A: [], B: [] }, germT: 0, msg: '' };
  const SPOT_XY = [[-0.45, -0.35], [0.45, -0.35], [-0.55, 0.15], [0.55, 0.15], [-0.28, 0.55], [0.28, 0.55]];
  function gnInit() {
    const r = mulberry32(77), order = [];
    for (let i = 0; i < GN_N; i++) order.push(i % 4);
    for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    GN.bugs.A = order.map((p, i) => ({ p, rot: (r() - 0.5) * 0.7, ph: r() * 6, die: 0, inf: 0 }));
    GN.bugs.B = order.map((p, i) => ({ p: VULN, rot: (r() - 0.5) * 0.7, ph: r() * 6, die: 0, inf: 0 }));
    ['A', 'B'].forEach((k) => { let n = 0; GN.bugs[k].forEach((b) => { if (b.p === VULN) { b.inf = 0.5 + n * 0.09; n++; } }); });
    GN.run = false; GN.t = 0; GN.did = false; GN.msg = '';
  }
  const gnAlive = (k) => GN.bugs[k].filter((b) => !(GN.run && b.p === VULN && GN.t >= b.inf + 1.1)).length;
  function ladybug(x, y, r, pat, o) {
    o = o || {};
    ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot || 0);
    if (o.flip) ctx.scale(1, -1);
    if (o.alpha != null) ctx.globalAlpha = o.alpha;
    const sick = o.sick || 0, base = sick > 0 ? SciSim.color.mix(pat.shell, '#9ca3af', sick) : pat.shell;
    ctx.fillStyle = '#111827'; ctx.beginPath(); ctx.arc(0, -r * 0.82, r * 0.38, 0, TAU); ctx.fill();
    const g = ctx.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r * 1.05); g.addColorStop(0, shade(base, 0.35)); g.addColorStop(1, shade(base, -0.2));
    D.shadow(() => { ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, r * 0.88, r, 0, 0, TAU); ctx.fill(); }, { blur: 4, y: 2 });
    ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(0, -r * 0.95); ctx.lineTo(0, r * 0.98); ctx.stroke();
    ctx.fillStyle = sick > 0 ? SciSim.color.mix(pat.spot, '#6b7280', sick) : pat.spot;
    for (let i = 0; i < pat.n; i++) { const s = SPOT_XY[i]; ctx.beginPath(); ctx.arc(s[0] * r, s[1] * r, r * 0.17, 0, TAU); ctx.fill(); }
    ctx.restore();
  }
  function gnPanels() {
    return PHONE
      ? { A: { x: 10, y: 28, w: 500, h: 372 }, B: { x: 10, y: 412, w: 500, h: 372 }, cw: 78, ch: 58, gy: 46 }
      : { A: { x: 14, y: 44, w: 378, h: 430 }, B: { x: 408, y: 44, w: 378, h: 430 }, cw: 58, ch: 70, gy: 62 };
  }
  function drawGene(t, dt) {
    const P = gnPanels();
    ctx.fillStyle = '#f2f8ee'; ctx.fillRect(0, 0, VW, VH);
    if (GN.run) GN.t += dt;
    // 병균
    if (GN.run && GN.t < 2.2 && !RM && Math.random() < dt * 40) {
      ['A', 'B'].forEach((k) => { const pn = P[k]; parts.emit({ x: pn.x + 20 + Math.random() * (pn.w - 40), y: pn.y + 10, vx: (Math.random() - 0.5) * 30, vy: 70 + Math.random() * 60, life: 1.8, size: 3 + Math.random() * 2, color: '#65a30d', gravity: 0, shape: 'circle', fade: true }); });
    }
    const titles = { A: 'A 무늬가 다양한 집단', B: 'B 무늬가 한 가지인 집단' };
    ['A', 'B'].forEach((k) => {
      const pn = P[k];
      D.shadow(() => { ctx.fillStyle = '#ffffff'; rr(pn.x, pn.y, pn.w, pn.h, 16).fill(); }, { blur: 6, y: 2 });
      ctx.strokeStyle = '#cfe3c8'; ctx.lineWidth = 2; rr(pn.x, pn.y, pn.w, pn.h, 16).stroke();
      D.text(pn.x + pn.w / 2, pn.y + 28, titles[k], { size: 16, weight: 800, color: '#14532d' });
      const cols = 6, gx0 = pn.x + (pn.w - cols * P.cw) / 2 + P.cw / 2;
      GN.bugs[k].forEach((b, i) => {
        const c = i % cols, r = Math.floor(i / cols), x = gx0 + c * P.cw, y = pn.y + P.gy + r * P.ch + P.ch / 2 - 8;
        const dying = GN.run && b.p === VULN && GN.t >= b.inf, dead = dying && GN.t >= b.inf + 1.1;
        const sick = dying ? clamp((GN.t - b.inf) / 0.9, 0, 1) : 0;
        const wob = dying && !dead ? Math.sin(GN.t * 18 + b.ph) * 0.25 : 0;
        const alpha = dead ? 0.28 : 1;
        ladybug(x, y + (RM ? 0 : Math.sin(t * 1.6 + b.ph) * 1.2), PHONE ? 20 : 19, PATS[b.p], { rot: b.rot + wob, flip: dead, sick, alpha });
        if (dead) D.text(x, y + 6, '✗', { size: 15, weight: 800, color: '#b91c1c' });
      });
      const al = gnAlive(k);
      const done = GN.run && GN.t > 3.6;
      D.text(pn.x + pn.w / 2, pn.y + pn.h - (PHONE ? 46 : 40), '무늬 ' + (k === 'A' ? '4' : '1') + '가지 · 모두 ' + GN_N + '마리', { size: 13.5, weight: 700, color: '#475569' });
      D.label(pn.x + pn.w / 2, pn.y + pn.h - (PHONE ? 20 : 16), GN.run ? '살아남은 개체 ' + al + ' / ' + GN_N : '전염병 실험 전 ' + GN_N + ' / ' + GN_N, { bg: GN.run ? (al === 0 ? '#b91c1c' : '#15803d') : '#475569', size: 14 });
      if (done && k === 'B' && al === 0) D.text(pn.x + pn.w / 2, pn.y + P.gy + 4 * P.ch + (PHONE ? 16 : 4), '모두 같은 무늬여서 한꺼번에 사라졌어요', { size: 13.5, weight: 800, color: '#b91c1c' });
      if (done && k === 'A') D.text(pn.x + pn.w / 2, pn.y + P.gy + 4 * P.ch + (PHONE ? 16 : 4), '다른 무늬는 병에 걸리지 않아 살아남았어요', { size: 13.5, weight: 800, color: '#15803d' });
    });
    if (!GN.run) {
      // 표준 무늬 안내 (병에 취약한 무늬)
      const pn = P.A; ladybug(pn.x + 24, pn.y + pn.h - 84, 11, PATS[VULN], {});
    }
    if (GN.run && GN.t >= 3.6 && !GN.did) { GN.did = true; Sound.success(); ctlUpdate(); }
  }

  /* --- 종 다양성: 숲 A B --- */
  const SPC = [{ n: '다람쥐', e: '🐿️', c: '#a16207' }, { n: '박새', e: '🐦', c: '#2563eb' }, { n: '고라니', e: '🦌', c: '#ea8a1a' }, { n: '여우', e: '🦊', c: '#dc2626' }];
  const FORESTS = [{ name: '숲 A', counts: [25, 25, 25, 25] }, { name: '숲 B', counts: [91, 3, 3, 3] }];
  const SPX = { hi: [-1, -1], dots: [], t: 0, seen: [false, false] };
  function spxInit() {
    SPX.dots = FORESTS.map((f, fi) => {
      const arr = []; f.counts.forEach((n, s) => { for (let i = 0; i < n; i++) arr.push(s); });
      const r = mulberry32(31 + fi * 17); for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
      return arr.map((s) => ({ s, ph: r() * 6 }));
    });
  }
  function spcPanels() {
    return PHONE
      ? [{ x: 10, y: 24, w: 500, h: 372 }, { x: 10, y: 408, w: 500, h: 372 }]
      : [{ x: 14, y: 36, w: 378, h: 508 }, { x: 408, y: 36, w: 378, h: 508 }];
  }
  function spcLegendRect(fi, s) {
    const p = spcPanels()[fi];
    return PHONE ? { x: p.x + 262, y: p.y + 62 + s * 56, w: 230, h: 48 } : { x: p.x + 14, y: p.y + 348 + s * 29, w: p.w - 28, h: 26 };
  }
  function drawSpecies(t, dt) {
    ctx.fillStyle = '#f2f8ee'; ctx.fillRect(0, 0, VW, VH);
    spcPanels().forEach((p, fi) => {
      const F = FORESTS[fi], kinds = F.counts.filter((n) => n > 0).length, top = Math.max.apply(null, F.counts), total = F.counts.reduce((a, b) => a + b, 0);
      D.shadow(() => { ctx.fillStyle = '#fff'; rr(p.x, p.y, p.w, p.h, 16).fill(); }, { blur: 6, y: 2 });
      ctx.strokeStyle = '#cfe3c8'; ctx.lineWidth = 2; rr(p.x, p.y, p.w, p.h, 16).stroke();
      D.text(p.x + (PHONE ? 130 : p.w / 2), p.y + 28, F.name + ' · 동물 ' + total + '마리', { size: 16, weight: 800, color: '#14532d' });
      const sp = PHONE ? 23 : 27.5, gx = PHONE ? p.x + 14 : p.x + (p.w - 10 * sp) / 2, gy = p.y + (PHONE ? 46 : 52);
      ctx.fillStyle = '#e8f5e0'; rr(gx - 4, gy - 4, 10 * sp + 8, 10 * sp + 8, 10).fill();
      SPX.dots[fi].forEach((d, i) => {
        const c = i % 10, r = Math.floor(i / 10), x = gx + c * sp + sp / 2, y = gy + r * sp + sp / 2;
        const hi = SPX.hi[fi], dim = hi >= 0 && hi !== d.s;
        const pulse = hi === d.s ? 1 + 0.18 * Math.sin(t * 7 + d.ph) : 1;
        ctx.save(); ctx.globalAlpha = dim ? 0.22 : 1;
        D.sphere(x, y, (sp * 0.38) * pulse, SPC[d.s].c, { gloss: true });
        ctx.restore();
      });
      // 범례 (눌러서 강조)
      F.counts.forEach((n, s) => {
        const R = spcLegendRect(fi, s), on = SPX.hi[fi] === s;
        ctx.fillStyle = on ? 'rgba(22,163,74,.14)' : 'rgba(241,245,249,.9)'; rr(R.x, R.y, R.w, R.h, 10).fill();
        if (on) { ctx.strokeStyle = '#16a34a'; ctx.lineWidth = 2; rr(R.x, R.y, R.w, R.h, 10).stroke(); }
        D.sphere(R.x + 16, R.y + R.h / 2, 8, SPC[s].c, { gloss: false });
        D.text(R.x + 32, R.y + R.h / 2 + 5, SPC[s].e + ' ' + SPC[s].n, { size: 14, weight: 800, color: '#1e293b', align: 'left' });
        const bw = PHONE ? 70 : 100, bx = R.x + R.w - bw - 52;
        ctx.fillStyle = '#e2e8f0'; rr(bx, R.y + R.h / 2 - 5, bw, 10, 5).fill();
        ctx.fillStyle = SPC[s].c; rr(bx, R.y + R.h / 2 - 5, Math.max(0, bw * n / 100), 10, 5).fill();
        D.text(R.x + R.w - 8, R.y + R.h / 2 + 5, n + ' %', { size: 14, weight: 800, color: '#334155', align: 'right' });
      });
      const dom = top >= 50;
      const tagY = PHONE ? p.y + p.h - 44 : p.y + p.h - 36;
      if (PHONE) D.text(p.x + 262 + 115, p.y + 50, '(눌러 보세요)', { size: 12, weight: 700, color: '#94a3b8' });
      D.label(p.x + p.w / 2, tagY, '종 수 ' + kinds + '종 · 가장 많은 종 ' + top + ' %', { bg: '#334155', size: 14 });
      D.text(p.x + p.w / 2, tagY + 24, dom ? '한 종이 대부분 → 종 다양성 낮음' : '고르게 사는 4종 → 종 다양성 높음', { size: 13.5, weight: 800, color: dom ? '#b91c1c' : '#15803d' });
    });
  }

  /* --- 생태계 다양성 지도 --- */
  const ECO = [{ k: 'F', n: '숲', e: '🌲', c: '#6fbf5d' }, { k: 'W', n: '습지', e: '🌾', c: '#3fb8a0' }, { k: 'T', n: '갯벌', e: '🦀', c: '#c8a77a' }, { k: 'D', n: '사막', e: '🏜️', c: '#f1cf72' }, { k: 'S', n: '바다', e: '🌊', c: '#4aa3e8' }, { k: 'G', n: '초원', e: '🌿', c: '#b6dc6a' }];
  const ECOMAP = ['FFFGGDDD', 'FFWGGDDD', 'FWWGGGDD', 'SSTTGGGF', 'SSSTTFFF'];
  const EC = { hi: -1, tiles: [] };
  const ecoCount = (k) => ECOMAP.join('').split('').filter((c) => c === k).length;
  function ecoLay() {
    return PHONE ? { x: 20, y: 56, tw: 60, th: 56, lx: 20, ly: 392, lw: 240, lh: 46 } : { x: 56, y: 62, tw: 86, th: 62, lx: 56, ly: 408, lw: 232, lh: 42 };
  }
  function ecoLegendRect(i) {
    const L = ecoLay(), cols = PHONE ? 2 : 3, c = i % cols, r = Math.floor(i / cols);
    return { x: L.lx + c * (L.lw + (PHONE ? 0 : 8)), y: L.ly + r * (L.lh + 6), w: L.lw - 4, h: L.lh };
  }
  function drawEco(t, dt) {
    ctx.fillStyle = '#f2f8ee'; ctx.fillRect(0, 0, VW, VH);
    const L = ecoLay();
    D.text(VW / 2, PHONE ? 30 : 36, '🗺️ 한 나라의 생태계 지도 (칸 1개 = 생태계 한 곳)', { size: PHONE ? 14.5 : 17, weight: 800, color: '#14532d' });
    ECOMAP.forEach((row, r) => row.split('').forEach((k, c) => {
      const i = ECO.findIndex((e) => e.k === k), e = ECO[i], x = L.x + c * L.tw, y = L.y + r * L.th, dim = EC.hi >= 0 && EC.hi !== i;
      ctx.save(); ctx.globalAlpha = dim ? 0.28 : 1;
      const g = ctx.createLinearGradient(0, y, 0, y + L.th); g.addColorStop(0, shade(e.c, 0.2)); g.addColorStop(1, shade(e.c, -0.12));
      ctx.fillStyle = g; rr(x + 2, y + 2, L.tw - 4, L.th - 4, 10).fill();
      ctx.font = D.font(PHONE ? 22 : 26, 700); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#000'; ctx.fillText(e.e, x + L.tw / 2, y + L.th / 2 + 2); ctx.textBaseline = 'alphabetic';
      ctx.restore();
      if (EC.hi === i) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; rr(x + 2, y + 2, L.tw - 4, L.th - 4, 10).stroke(); D.ring(x + L.tw / 2, y + L.th / 2, Math.min(L.tw, L.th) * 0.5, t + c * 0.1, { color: '#16a34a', speed: 1, width: 2 }); }
    }));
    ECO.forEach((e, i) => {
      const R = ecoLegendRect(i), on = EC.hi === i;
      ctx.fillStyle = on ? 'rgba(22,163,74,.14)' : '#fff'; rr(R.x, R.y, R.w, R.h, 10).fill();
      ctx.strokeStyle = on ? '#16a34a' : '#d7e3da'; ctx.lineWidth = on ? 2.5 : 1.6; rr(R.x, R.y, R.w, R.h, 10).stroke();
      ctx.fillStyle = e.c; rr(R.x + 8, R.y + R.h / 2 - 9, 18, 18, 5).fill();
      D.text(R.x + 36, R.y + R.h / 2 + 5, e.e + ' ' + e.n, { size: 14.5, weight: 800, color: '#1e293b', align: 'left' });
      D.text(R.x + R.w - 10, R.y + R.h / 2 + 5, ecoCount(e.k) + '칸', { size: 14, weight: 800, color: '#475569', align: 'right' });
    });
    const kinds = ECO.filter((e) => ecoCount(e.k) > 0).length;
    D.label(VW / 2, PHONE ? 574 : 524, '서로 다른 생태계 ' + kinds + '가지가 있어요 → 생태계 다양성', { bg: '#14532d', size: PHONE ? 13 : 14.5 });
  }

  /* ======================================================
     ③ 다양성 위기
     ====================================================== */
  const S0 = 40, K_H = 0.5, K_A = 0.35, K_P = 0.4, TEST_LV = 60, GC = 10, GR = 8, GT = GC * GR;
  const spCount = (h, a, p) => Math.round(S0 * (1 - K_H * h / 100) * (1 - K_A * a / 100) * (1 - K_P * p / 100));
  const clearedN = (h) => Math.round(GT * K_H * h / 100);
  const RK = { h: 0, a: 0, p: 0, dots: [], rank: [], order: [], inv: [], tested: { h: null, a: null, p: null }, haze: 0, clr: 0, ph: 0 };
  function rkInit() {
    const r = mulberry32(2024), seen = new Set(), ord = [];
    const add = (c, rw) => { const i = rw * GC + c; if (!seen.has(i)) { seen.add(i); ord.push(i); } };
    for (let rw = 0; rw < GR; rw++) add(4, rw);
    for (let c = 0; c < GC; c++) add(c, 3);
    for (let rw = 0; rw < GR; rw++) add(7, rw);
    for (let c = 0; c < GC; c++) add(c, 6);
    const rest = []; for (let i = 0; i < GT; i++) if (!seen.has(i)) rest.push(i);
    for (let i = rest.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [rest[i], rest[j]] = [rest[j], rest[i]]; }
    RK.order = ord.concat(rest);
    const never = RK.order.slice(Math.round(GT * K_H)); // 끝까지 숲으로 남는 칸
    RK.inv = never.slice(0, 10);
    RK.rank = []; for (let i = 0; i < S0; i++) RK.rank.push(i);
    for (let i = S0 - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [RK.rank[i], RK.rank[j]] = [RK.rank[j], RK.rank[i]]; }
    RK.dots = RK.rank.map(() => ({ a: 1 }));
    RK.tested = { h: null, a: null, p: null };
  }
  const RK_ANI = ['🦌', '🐦', '🦊', '🐿️', '🦎', '🦋', '🐢', '🦉'];
  function rkPatches() {
    const clr = new Set(RK.order.slice(0, clearedN(RK.h)));
    const seen = new Set(); let patches = 0, biggest = 0;
    for (let i = 0; i < GT; i++) {
      if (clr.has(i) || seen.has(i)) continue;
      patches++; let n = 0; const st = [i]; seen.add(i);
      while (st.length) {
        const q = st.pop(); n++; const c = q % GC, rw = Math.floor(q / GC);
        [[c - 1, rw], [c + 1, rw], [c, rw - 1], [c, rw + 1]].forEach(([cc, rr2]) => { if (cc < 0 || cc >= GC || rr2 < 0 || rr2 >= GR) return; const j = rr2 * GC + cc; if (!clr.has(j) && !seen.has(j)) { seen.add(j); st.push(j); } });
      }
      biggest = Math.max(biggest, n);
    }
    return { patches, biggest, forest: GT - clr.size, clr };
  }
  function rkLay() {
    return PHONE
      ? { map: { x: 110, y: 40, t: 30 }, dots: { x: 10, y: 334, w: 500, h: 108, cols: 10 }, chart: { x: 10, y: 450, w: 500, h: 168 }, bars: { x: 10, y: 626, w: 500, h: 176, rh: 31 } }
      : { map: { x: 14, y: 46, t: 32 }, dots: { x: 354, y: 40, w: 432, h: 118, cols: 10 }, chart: { x: 354, y: 168, w: 432, h: 174 }, bars: { x: 14, y: 366, w: 772, h: 188, rh: 38 } };
  }
  const RF = [{ k: 'h', n: '서식지 파괴·분단', c: '#b45309' }, { k: 'a', n: '외래종 유입', c: '#dc2626' }, { k: 'p', n: '환경 오염', c: '#6d28d9' }];
  function drawRisk(t, dt) {
    ctx.fillStyle = '#f2f8ee'; ctx.fillRect(0, 0, VW, VH);
    const L = rkLay();
    ['h', 'a', 'p'].forEach((k) => { /* 슬라이더 값으로 부드럽게 */ });
    const pa = rkPatches();
    RK.clr = approach(RK.clr, pa.clr.size, dt, 8);
    // --- 지도
    const M = L.map, mw = GC * M.t, mh = GR * M.t;
    D.text(M.x + mw / 2, M.y - 12, '🌲 숲 서식지 (칸 1개 = 같은 넓이)', { size: 14.5, weight: 800, color: '#14532d' });
    D.shadow(() => { ctx.fillStyle = '#e9f5e1'; rr(M.x - 4, M.y - 4, mw + 8, mh + 8, 10).fill(); }, { blur: 5, y: 2 });
    for (let i = 0; i < GT; i++) {
      const c = i % GC, rw = Math.floor(i / GC), x = M.x + c * M.t, y = M.y + rw * M.t, cl = pa.clr.has(i);
      if (cl) {
        ctx.fillStyle = '#9aa3ad'; ctx.fillRect(x, y, M.t, M.t);
        ctx.fillStyle = '#f8fafc'; ctx.fillRect(x + M.t * 0.46, y + 3, 3, M.t * 0.3); ctx.fillRect(x + M.t * 0.46, y + M.t * 0.6, 3, M.t * 0.3);
      } else {
        const g = ctx.createLinearGradient(0, y, 0, y + M.t); g.addColorStop(0, '#8ed17a'); g.addColorStop(1, '#5fae55');
        ctx.fillStyle = g; ctx.fillRect(x, y, M.t, M.t);
        D.sphere(x + M.t * 0.5, y + M.t * 0.52, M.t * 0.3, '#2f8f46', { gloss: false });
      }
    }
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1;
    for (let c = 0; c <= GC; c++) { ctx.beginPath(); ctx.moveTo(M.x + c * M.t, M.y); ctx.lineTo(M.x + c * M.t, M.y + mh); ctx.stroke(); }
    for (let rw = 0; rw <= GR; rw++) { ctx.beginPath(); ctx.moveTo(M.x, M.y + rw * M.t); ctx.lineTo(M.x + mw, M.y + rw * M.t); ctx.stroke(); }
    // 외래종
    const nInv = Math.round(RK.a / 10);
    for (let i = 0; i < nInv; i++) {
      const q = RK.inv[i], c = q % GC, rw = Math.floor(q / GC), x = M.x + c * M.t + M.t / 2, y = M.y + rw * M.t + M.t / 2 + (RM ? 0 : Math.sin(t * 4 + i) * 1.5);
      D.sphere(x, y, M.t * 0.36, '#ef4444', { gloss: true }); D.text(x, y + 5, '!', { size: 14, weight: 800, color: '#fff' });
    }
    // 오염
    RK.haze = approach(RK.haze, RK.p / 100, dt, 5);
    if (RK.haze > 0.01) {
      ctx.fillStyle = 'rgba(88,70,40,' + (0.5 * RK.haze) + ')'; rr(M.x - 4, M.y - 4, mw + 8, mh + 8, 10).fill();
      const nd = Math.round(RK.haze * 14);
      for (let i = 0; i < nd; i++) { const px = M.x + ((i * 53) % mw), py = M.y + (((i * 37) + t * 22 * (1 + (i % 3) * 0.3)) % mh); ctx.fillStyle = 'rgba(40,30,15,.55)'; ctx.beginPath(); ctx.arc(px, py, 3.2, 0, TAU); ctx.fill(); }
    }
    ctx.textAlign = 'center';
    D.text(M.x + mw / 2, M.y + mh + 24, '숲 조각 ' + pa.patches + '개 · 숲 ' + pa.forest + '칸 · 가장 큰 조각 ' + pa.biggest + '칸', { size: 13.5, weight: 800, color: '#334155' });
    D.text(M.x + mw / 2, M.y + mh + 44, '조각당 평균 ' + (pa.forest / pa.patches).toFixed(1) + '칸 (넓이에 비례해 개체 수도 줄어요)', { size: 12.5, weight: 700, color: '#64748b' });
    // --- 종 점
    const cnt = spCount(RK.h, RK.a, RK.p), Dt = L.dots;
    D.shadow(() => { ctx.fillStyle = '#fff'; rr(Dt.x, Dt.y, Dt.w, Dt.h, 12).fill(); }, { blur: 5, y: 2 });
    D.text(Dt.x + 14, Dt.y + 22, '이 지역에 사는 종 (그림 1개 = 1종)', { size: 13.5, weight: 800, color: '#14532d', align: 'left' });
    D.label(Dt.x + Dt.w - 62, Dt.y + 18, cnt + '종 / ' + S0 + '종', { bg: cnt < S0 ? '#b45309' : '#15803d', size: 13.5 });
    const rows = Math.ceil(S0 / Dt.cols), sx = (Dt.w - 20) / Dt.cols, sy = (Dt.h - 44) / rows;
    RK.rank.forEach((rk, i) => {
      const present = rk < cnt; RK.dots[i].a = approach(RK.dots[i].a, present ? 1 : 0.1, dt, 7);
      const c = i % Dt.cols, rw = Math.floor(i / Dt.cols), x = Dt.x + 10 + c * sx + sx / 2, y = Dt.y + 40 + rw * sy + sy / 2;
      ctx.save(); ctx.globalAlpha = RK.dots[i].a; ctx.font = D.font(PHONE ? 15 : 17, 700); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#000'; ctx.fillText(RK_ANI[i % RK_ANI.length], x, y); ctx.restore();
    });
    // --- 꺾은선 그래프
    const C = L.chart, px0 = C.x + 46, py0 = C.y + 40, pw = C.w - 66, ph = C.h - 82;
    D.shadow(() => { ctx.fillStyle = '#fff'; rr(C.x, C.y, C.w, C.h, 12).fill(); }, { blur: 5, y: 2 });
    D.text(C.x + 14, C.y + 20, '요인의 크기(%)에 따른 종 수 (한 가지씩만 작용)', { size: 13, weight: 800, color: '#14532d', align: 'left' });
    RF.forEach((f, i) => { const lx = C.x + 52 + i * (PHONE ? 100 : 118); ctx.fillStyle = f.c; ctx.fillRect(lx - 14, py0 + ph + 26, 10, 10); D.text(lx, py0 + ph + 36, f.n.replace('서식지 ', ''), { size: 12, weight: 700, color: '#475569', align: 'left' }); });
    const X = (v) => px0 + (v / 100) * pw, Y = (n) => py0 + ph - (clamp(n, 0, S0) / S0) * ph;
    ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1;
    [0, 10, 20, 30, 40].forEach((n) => { ctx.beginPath(); ctx.moveTo(px0, Y(n)); ctx.lineTo(px0 + pw, Y(n)); ctx.stroke(); D.text(px0 - 6, Y(n) + 4, String(n), { size: 12, weight: 700, color: '#64748b', align: 'right' }); });
    [0, 20, 40, 60, 80, 100].forEach((v) => D.text(X(v), py0 + ph + 16, String(v), { size: 12, weight: 700, color: '#475569' }));
    
    D.text(px0 - 6, py0 - 16, '종 수', { size: 12, weight: 700, color: '#64748b', align: 'right' });
    RF.forEach((f) => {
      ctx.strokeStyle = f.c; ctx.lineWidth = 2.6; ctx.beginPath();
      for (let v = 0; v <= 100; v += 10) { const n = f.k === 'h' ? spCount(v, 0, 0) : f.k === 'a' ? spCount(0, v, 0) : spCount(0, 0, v); v ? ctx.lineTo(X(v), Y(n)) : ctx.moveTo(X(v), Y(n)); }
      ctx.stroke();
      const cv = RK[f.k], n = f.k === 'h' ? spCount(cv, 0, 0) : f.k === 'a' ? spCount(0, cv, 0) : spCount(0, 0, cv);
      D.sphere(X(cv), Y(n), 6, f.c, { gloss: false, outline: '#fff', outlineWidth: 2 });
    });
    ctx.save(); ctx.setLineDash([6, 5]); ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(px0, Y(cnt)); ctx.lineTo(px0 + pw, Y(cnt)); ctx.stroke(); ctx.restore();
    D.label(px0 + pw - 52, Y(cnt) - 12 < py0 ? Y(cnt) + 14 : Y(cnt) - 12, '함께: ' + cnt + '종', { bg: '#0f172a', size: 12.5 });
    // --- 막대 비교
    const B = L.bars;
    D.shadow(() => { ctx.fillStyle = '#fff'; rr(B.x, B.y, B.w, B.h, 12).fill(); }, { blur: 5, y: 2 });
    D.text(B.x + 14, B.y + 22, '요인별로 사라진 종 수 (지금 슬라이더 값, 한 가지씩만 작용할 때)', { size: 13, weight: 800, color: '#14532d', align: 'left' });
    const lw = PHONE ? 120 : 150, bx = B.x + 14 + lw, bw = B.w - 28 - lw - 62;
    const loss = { h: S0 - spCount(RK.h, 0, 0), a: S0 - spCount(0, RK.a, 0), p: S0 - spCount(0, 0, RK.p), all: S0 - cnt };
    RK.dbar = RK.dbar || { h: 0, a: 0, p: 0, all: 0 };
    [...RF, { k: 'all', n: '세 요인이 함께', c: '#0f172a' }].forEach((f, i) => {
      RK.dbar[f.k] = approach(RK.dbar[f.k], loss[f.k], dt, 8);
      const y = B.y + 40 + i * B.rh;
      D.text(B.x + 14, y + B.rh * 0.5 + 2, f.n + (f.k === 'all' ? '' : ' ' + RK[f.k] + '%'), { size: PHONE ? 12.5 : 14, weight: 800, color: '#1e293b', align: 'left' });
      ctx.fillStyle = '#eef2f7'; rr(bx, y + 4, bw, B.rh - 12, 6).fill();
      const w = bw * clamp(RK.dbar[f.k], 0, S0) / S0; if (w > 0.5) { ctx.fillStyle = f.c; rr(bx, y + 4, w, B.rh - 12, Math.min(6, w / 2)).fill(); }
      D.text(B.x + B.w - 14, y + B.rh * 0.5 + 2, '−' + loss[f.k] + '종', { size: 14, weight: 800, color: f.c, align: 'right' });
    });
  }

  /* ======================================================
     ④ 보전 실천
     ====================================================== */
  const DTYPE = { gene: '유전적 다양성', spc: '종 다양성', eco: '생태계 다양성' };
  const DCOL = { gene: '#7c3aed', spc: '#d97706', eco: '#0891b2' };
  const CASES = [
    { id: 'wet', label: '습지 보호', t: 'eco', e: '🦆', pos: [0.46, 0.66], what: '순천만 습지처럼 서식지를 통째로 보호해요.', why: '습지라는 <b>생태계</b>와 그 안의 생물이 함께 지켜져요.' },
    { id: 'corr', label: '생태 통로 설치', t: 'gene', e: '🌉', pos: [0.37, 0.3], what: '도로로 끊긴 서식지를 이어서 동물이 오가며 짝을 만나게 해요.', why: '고립된 집단 사이에 유전자가 섞여 <b>유전적 다양성</b>이 유지돼요.' },
    { id: 'bear', label: '반달가슴곰 복원', t: 'spc', e: '🐻', pos: [0.13, 0.55], what: '지리산에서 거의 사라진 멸종 위기종을 다시 방사해요.', why: '그 지역의 <b>종</b>이 사라지지 않게 지켜요.' },
    { id: 'seed', label: '종자 은행', t: 'gene', e: '🏛️', pos: [0.62, 0.3], what: '여러 품종의 씨앗을 안전한 저장고에 보관해요.', why: '품종마다 다른 유전자(<b>유전적 다양성</b>)를 병충해나 기후 변화에서 지킬 수 있어요.' },
    { id: 'inv', label: '외래종 퇴치', t: 'spc', e: '🐸', pos: [0.26, 0.82], what: '황소개구리·가시박 같은 외래종을 줄여요.', why: '토종 <b>종</b>이 사라지는 것을 막아요.' },
    { id: 'traf', label: '야생 동물 불법 거래 근절', t: 'spc', e: '🛑', pos: [0.8, 0.34], what: '야생 동물의 불법 포획과 거래를 막아요.', why: '멸종 위기 <b>종</b>이 줄어드는 것을 막아요.' },
    { id: 'disp', label: '일회용품 줄이기', t: 'eco', e: '♻️', pos: [0.9, 0.72], what: '바다와 갯벌에 쌓이는 쓰레기를 줄여요.', why: '바다·갯벌 같은 <b>생태계</b>가 오염으로 망가지는 것을 막아요.' },
    { id: 'cert', label: '인증 제품 구매', t: 'eco', e: '🌳', pos: [0.1, 0.22], what: '산림·수산 자원 보전 인증이 붙은 제품을 골라 사요.', why: '숲과 바다 같은 <b>생태계</b>(서식지)를 지키는 일에 보탬이 돼요.' },
  ];
  const BASE_IDX = 40, PICK_GAIN = 20, MAX_PICK = 3;
  const AC = { sel: null, picks: [], dbar: { gene: BASE_IDX, spc: BASE_IDX, eco: BASE_IDX }, pop: {} };
  const idxOf = (t) => Math.min(100, BASE_IDX + PICK_GAIN * AC.picks.filter((id) => CASES.find((c) => c.id === id).t === t).length);
  const planTypes = () => new Set(AC.picks.map((id) => CASES.find((c) => c.id === id).t)).size;
  function planLay() {
    return PHONE
      ? { sc: { x: 10, y: 30, w: 500, h: 168 }, chip: { x: 10, y: 214, w: 246, h: 52, gx: 8, gy: 8, cols: 2 }, bars: { x: 10, y: 482, w: 500, h: 168 } }
      : { sc: { x: 14, y: 36, w: 772, h: 172 }, chip: { x: 14, y: 226, w: 186, h: 58, gx: 9, gy: 9, cols: 4 }, bars: { x: 14, y: 366, w: 772, h: 176 } };
  }
  function chipRect(i) { const C = planLay().chip, c = i % C.cols, r = Math.floor(i / C.cols); return { x: C.x + c * (C.w + C.gx), y: C.y + r * (C.h + C.gy), w: C.w, h: C.h }; }
  function togglePick(i) {
    const id = CASES[i].id, k = AC.picks.indexOf(id);
    if (k >= 0) { AC.picks.splice(k, 1); Sound.click(); }
    else if (AC.picks.length >= MAX_PICK) { AC.pop.full = 2; Sound.fail(); say('예산 ' + MAX_PICK + '칸을 모두 썼어요. 하나를 취소한 뒤 골라요', true); }
    else { AC.picks.push(id); AC.pop[id] = 0; Sound.tick(); const L = planLay(), p = CASES[i].pos; parts.burst(L.sc.x + L.sc.w * p[0], L.sc.y + L.sc.h * p[1], { count: 12, speed: 120, size: 3.5, life: 0.7, colors: [DCOL[CASES[i].t], '#fff'] }); }
    ctlUpdate();
  }
  function drawPlan(t, dt) {
    ctx.fillStyle = '#f2f8ee'; ctx.fillRect(0, 0, VW, VH);
    const L = planLay(), S = L.sc;
    // 우리 지역 그림
    ctx.save(); rr(S.x, S.y, S.w, S.h, 14).clip();
    D.sky(S.x, S.y, S.w, S.h * 0.55, '#bfe3ff', '#e7f6ff');
    ctx.fillStyle = '#86d36f'; ctx.fillRect(S.x, S.y + S.h * 0.5, S.w * 0.74, S.h * 0.5);
    ctx.fillStyle = '#4aa3e8'; ctx.fillRect(S.x + S.w * 0.74, S.y + S.h * 0.5, S.w * 0.26, S.h * 0.5);
    ctx.fillStyle = '#9ad8c4'; ctx.beginPath(); ctx.ellipse(S.x + S.w * 0.46, S.y + S.h * 0.8, S.w * 0.1, S.h * 0.1, 0, 0, TAU); ctx.fill();
    for (let i = 0; i < 12; i++) D.sphere(S.x + 16 + i * (S.w * 0.28 / 12) + (i % 2) * 6, S.y + S.h * 0.5 + 8 + (i % 3) * 14, 10, '#2f8f46', { gloss: false });
    ctx.fillStyle = '#8a929b'; ctx.fillRect(S.x + S.w * 0.355, S.y, S.w * 0.04, S.h); ctx.fillStyle = '#f8fafc'; for (let y = S.y + 6; y < S.y + S.h; y += 22) ctx.fillRect(S.x + S.w * 0.372, y, 3, 10);
    ctx.restore();
    D.label(S.x + 8, S.y + 14, '우리 지역 (도로가 숲을 끊고, 외래종이 늘고, 갯벌이 오염돼요)', { bg: 'rgba(30,41,59,.85)', size: PHONE ? 11.5 : 13, align: 'left' });
    CASES.forEach((c) => {
      if (!AC.picks.includes(c.id)) return;
      AC.pop[c.id] = Math.min(1, (AC.pop[c.id] || 0) + dt * 2.4);
      const k = SciSim.ease.outBack(AC.pop[c.id]), x = S.x + S.w * c.pos[0], y = S.y + S.h * c.pos[1] + (RM ? 0 : Math.sin(t * 2 + c.pos[0] * 9) * 2);
      D.shadow(() => { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, 20 * k, 0, TAU); ctx.fill(); }, { blur: 6, y: 2 });
      ctx.strokeStyle = DCOL[c.t]; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, 20 * k, 0, TAU); ctx.stroke();
      ctx.font = D.font(22 * k, 700); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#000'; ctx.fillText(c.e, x, y + 1); ctx.textBaseline = 'alphabetic';
    });
    // 사례 카드
    CASES.forEach((c, i) => {
      const R = chipRect(i), on = AC.picks.includes(c.id);
      D.shadow(() => { ctx.fillStyle = on ? '#e8f7ec' : '#fff'; rr(R.x, R.y, R.w, R.h, 12).fill(); }, { blur: on ? 7 : 3, y: 2 });
      ctx.strokeStyle = on ? '#16a34a' : '#cfd8e6'; ctx.lineWidth = on ? 3 : 2; rr(R.x, R.y, R.w, R.h, 12).stroke();
      ctx.font = D.font(22, 700); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#000'; ctx.fillText(c.e, R.x + 24, R.y + R.h / 2 + 1); ctx.textBaseline = 'alphabetic';
      const lines = wrapLines(c.label, R.w - 62, 13.5, 800), lh = 13.5 * FS * 1.2;
      lines.forEach((l, j) => D.text(R.x + 44, R.y + R.h / 2 + 4 - ((lines.length - 1) * lh) / 2 + j * lh, l, { size: 13.5, weight: 800, color: '#1e293b', align: 'left' }));
      if (on) D.check(R.x + R.w - 14, R.y + 14, 9, 1);
    });
    // 예산 + 막대
    const B = L.bars;
    D.shadow(() => { ctx.fillStyle = '#fff'; rr(B.x, B.y, B.w, B.h, 12).fill(); }, { blur: 5, y: 2 });
    D.text(B.x + 14, B.y + 24, '예산', { size: 14, weight: 800, color: '#14532d', align: 'left' });
    for (let i = 0; i < MAX_PICK; i++) { ctx.fillStyle = i < AC.picks.length ? '#16a34a' : '#e2e8f0'; rr(B.x + 64 + i * 34, B.y + 10, 28, 24, 7).fill(); }
    D.text(B.x + 64 + MAX_PICK * 34 + 10, B.y + 28, AC.picks.length + ' / ' + MAX_PICK + '칸 사용', { size: 13.5, weight: 700, color: '#475569', align: 'left' });
    D.text(B.x + B.w - 14, B.y + 24, '다양성 점수(예시)', { size: 13, weight: 700, color: '#64748b', align: 'right' });
    ['gene', 'spc', 'eco'].forEach((k, i) => {
      AC.dbar[k] = approach(AC.dbar[k], idxOf(k), dt, 7);
      const y = B.y + 48 + i * 40, lw = PHONE ? 118 : 150, bx = B.x + 14 + lw, bw = B.w - 28 - lw - 50;
      D.text(B.x + 14, y + 20, DTYPE[k], { size: PHONE ? 13 : 14, weight: 800, color: DCOL[k], align: 'left' });
      ctx.fillStyle = '#eef2f7'; rr(bx, y + 4, bw, 22, 7).fill();
      const w = bw * clamp(AC.dbar[k], 0, 100) / 100; if (w > 0.5) { ctx.fillStyle = DCOL[k]; rr(bx, y + 4, w, 22, Math.min(7, w / 2)).fill(); }
      D.text(B.x + B.w - 14, y + 21, String(idxOf(k)), { size: 15, weight: 800, color: '#1e293b', align: 'right' });
    });
  }
  /* 연결(카드 분류) 판 */
  function drawMatchNote(t) {
    const c = AC.sel, y = PHONE ? 594 : 494, w = VW - 28;
    let txt = '카드를 누르면 설명이 나와요. 그 활동이 지키는 다양성 칸에 놓아요.', bd = '#cfd8e6';
    if (c) {
      const card = aBoard.cards.find((x) => x.id === c.id), ok = card && card.zone === c.t;
      txt = c.label + ': ' + c.what + (ok ? ' ' + c.why.replace(/<\/?b>/g, '') : ''); bd = ok ? DCOL[c.t] : '#cfd8e6';
    }
    note(14, y, w, txt, PHONE ? 13.5 : 14, { bg: 'rgba(255,255,255,.95)', border: bd });
  }

  /* ======================================================
     카드 보드 2개: ② 사례 9장 분류, ④ 보전 사례 8장 연결
     ====================================================== */
  const DCARDS = [
    { id: 'g1', label: '무늬가 제각각인 무당벌레', t: 'gene' }, { id: 's1', label: '새·곤충·짐승 종류가 많은 숲', t: 'spc' }, { id: 'e1', label: '산·습지·갯벌·바다가 있는 우리나라', t: 'eco' },
    { id: 's2', label: '열대 우림은 침엽수림보다 종이 많다', t: 'spc' }, { id: 'g2', label: '한 품종만 심은 감자밭의 마름병', t: 'gene' }, { id: 'e2', label: '사막·초원·숲이 있는 대륙', t: 'eco' },
    { id: 'g3', label: '사람마다 다른 눈동자 색', t: 'gene' }, { id: 'e3', label: '하천·호수·논이 어우러진 농촌', t: 'eco' }, { id: 's3', label: '외래종 하나가 뒤덮은 호수', t: 'spc' },
  ];
  let dBoard = null, aBoard = null;
  function zoneDefs(ids, o) {
    return ids.map((id, i) => Object.assign({ id, label: o.labels[i], color: DCOL[id], fill: rgba(DCOL[id], 0.1), line: rgba(DCOL[id], 0.6), cap: 4, lsize: PHONE ? 13 : 15 }, o.pos[i]));
  }
  function buildDBoard() {
    const cw = PHONE ? 160 : 240, ch = PHONE ? 72 : 48;
    const ids = ['gene', 'spc', 'eco'], labels = ['🧬 유전적 다양성', '🐾 종 다양성', '🗺️ 생태계 다양성'];
    const pos = PHONE ? [{ x: 6, y: 304, w: 168, h: 330 }, { x: 176, y: 304, w: 168, h: 330 }, { x: 346, y: 304, w: 168, h: 330 }] : [{ x: 12, y: 262, w: 252, h: 236 }, { x: 274, y: 262, w: 252, h: 236 }, { x: 536, y: 262, w: 252, h: 236 }];
    dBoard = new Board({ zones: zoneDefs(ids, { labels, pos }), tray: PHONE ? { x: 14, y: 52, w: 492, cols: 3 } : { x: 12, y: 62, w: 776, cols: 3 }, cw, ch, gap: PHONE ? 6 : 8, vertical: PHONE, onPlace: () => { dBoard.cards.forEach((c) => { c.badge = ''; }); ctlUpdate(); } });
    [0, 3, 6, 1, 4, 7, 2, 5, 8].forEach((i) => dBoard.add({ id: DCARDS[i].id, label: DCARDS[i].label, t: DCARDS[i].t }));
    dBoard.layout(true);
  }
  function buildABoard() {
    const cw = PHONE ? 160 : 186, ch = PHONE ? 62 : 46;
    const ids = ['gene', 'spc', 'eco'], labels = ['🧬 유전적 다양성', '🐾 종 다양성', '🗺️ 생태계 다양성'];
    const pos = PHONE ? [{ x: 6, y: 282, w: 168, h: 300 }, { x: 176, y: 282, w: 168, h: 300 }, { x: 346, y: 282, w: 168, h: 300 }] : [{ x: 12, y: 190, w: 252, h: 296 }, { x: 274, y: 190, w: 252, h: 296 }, { x: 536, y: 190, w: 252, h: 296 }];
    aBoard = new Board({ zones: zoneDefs(ids, { labels, pos }), tray: PHONE ? { x: 14, y: 46, w: 492, cols: 3 } : { x: 14, y: 46, w: 772, cols: 4 }, cw, ch, gap: PHONE ? 6 : 8, vertical: PHONE,
      onTap: (c) => { AC.sel = CASES.find((x) => x.id === c.id); },
      onPlace: (c) => { AC.sel = CASES.find((x) => x.id === c.id); aBoard.cards.forEach((k) => { k.badge = ''; }); ctlUpdate(); } });
    [4, 0, 6, 2, 7, 1, 5, 3].forEach((i) => aBoard.add({ id: CASES[i].id, label: CASES[i].label, t: CASES[i].t }));
    aBoard.layout(true);
  }
  function drawSort(t, dt) {
    ctx.fillStyle = '#f2f8ee'; ctx.fillRect(0, 0, VW, VH);
    D.text(VW / 2, PHONE ? 28 : 34, '🗂️ 사례 카드를 알맞은 다양성 칸에 놓아요', { size: PHONE ? 14.5 : 17, weight: 800, color: '#14532d' });
    dBoard.update(dt); dBoard.draw(t);
    if (!PHONE) D.text(VW / 2, 252, '▲ 아직 놓지 않은 카드', { size: 12.5, weight: 700, color: '#94a3b8' });
    drawFlash(dt, PHONE ? 620 : 510);
  }
  function drawMatch(t, dt) {
    ctx.fillStyle = '#f2f8ee'; ctx.fillRect(0, 0, VW, VH);
    D.text(VW / 2, PHONE ? 28 : 32, '🔗 보전 활동 카드를 그 활동이 지키는 다양성 칸에 놓아요', { size: PHONE ? 13.5 : 16.5, weight: 800, color: '#14532d' });
    aBoard.update(dt); aBoard.draw(t);
    drawMatchNote(t);
    drawFlash(dt, PHONE ? 690 : 12);
  }

  /* ======================================================
     화면 전환 · 조작판
     ====================================================== */
  let MODE = 'speci', SUB = '', game = null;
  const MODE_LABEL = { speci: '🐦 종의 분화', div: '🌈 세 가지 다양성', risk: '⚠️ 다양성 위기', act: '🌱 보전 실천' };
  function setMode(m, sub) {
    MODE = m; SUB = sub || (m === 'div' ? (SUB && MODE_PREV === 'div' ? SUB : 'gene') : m === 'act' ? (MODE_PREV === 'act' && SUB ? SUB : 'match') : '');
    MODE_PREV = m;
    [dBoard, aBoard].forEach((b) => { if (b) { b.drag = null; b.hoverZone = null; } });
    $('#tbLabel').textContent = MODE_LABEL[m];
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === m));
    S_fade = 1; { const h = $('#stageHint'); if (h) h.classList.add('hide'); }
    ctlUpdate();
  }
  let MODE_PREV = '', S_fade = 0;
  function setSub(s) { SUB = s; ctlUpdate(); }
  function ctlUpdate() {
    const key = MODE + ':' + SUB;
    $$('#ctrlCard [data-show]').forEach((n) => { const k = n.dataset.show; n.hidden = !(k === MODE || k === key); });
    $$('#subDiv button').forEach((b) => b.classList.toggle('on', b.dataset.sub === SUB));
    $$('#subAct button').forEach((b) => b.classList.toggle('on', b.dataset.sub === SUB));
    $('#modeSeg').hidden = !(game && game.free);
    $('#oGen').textContent = SP.gen + '세대';
    $('#bSplit').disabled = SP.split; $('#bSplit').classList.toggle('done', SP.split);
    $('#bSplit').textContent = SP.split ? '✓ 서식지가 나뉘었어요' : '🌊 강으로 서식지 나누기';
    $('#bPlay').textContent = SP.play ? '⏸ 멈추기' : '▶ 세대 진행'; $('#bPlay').classList.toggle('on', SP.play);
    $('#bPlay').disabled = SP.merge; $('#bSkip').disabled = SP.merge;
    $('#bMerge').disabled = !SP.split || SP.gen < 1;
    $('#bMerge').textContent = SP.merge ? '↩ 섬으로 돌아가기' : '🤝 두 집단 합쳐 짝짓기';
    $('#spNote').innerHTML = !SP.split ? '나누지 않으면 한 집단이 그대로예요. 먼저 <b>강으로 서식지를 나누고</b> 세대를 진행해 보세요.' : SP.merge ? '쌍마다 부리 두께 차이가 <b>' + MATE_TOL + ' mm 이하</b>면 짝 성공(♥)이에요. 전체 쌍 중 교배 가능한 비율이 <b>' + ISO_PCT + ' % 미만</b>이면 생식적 격리로 봐요.' : '왼쪽 섬은 딱딱한 씨앗(유리한 부리 두께 ' + OPT_SEED + ' mm), 오른쪽 섬은 곤충(' + OPT_INSECT + ' mm)이에요. <b>' + GEN_GOAL + '세대</b>까지 진행해 봐요.';
    $('#oDis').textContent = GN.run ? (GN.did ? '결과 확인' : '진행 중') : '대기';
    $('#bDisease').disabled = GN.run;
    $('#oSort').textContent = dBoard ? dBoard.cards.filter((c) => c.zone).length + ' / 9' : '0 / 9';
    $('#oMatch').textContent = aBoard ? aBoard.cards.filter((c) => c.zone).length + ' / 8' : '0 / 8';
    $('#oPlan').textContent = AC.picks.length + ' / ' + MAX_PICK + '칸';
    $('#oSpc').textContent = '종 수 4 · 4'; $('#oEco').textContent = ECO.length + '가지';
    ['h', 'a', 'p'].forEach((k) => { const o = $('#o' + k.toUpperCase()); if (o) o.textContent = RK[k] + ' %'; });
  }
  let hintTimer2 = null;
  function enterLevel(li) {
    GN.run = false; SP.play = false; S_fade = 1;
    if (li === 0) { spReset(); setMode('speci'); showHint('먼저 🌊 강으로 서식지를 나눈 뒤 ▶ 세대 진행을 눌러요', 6000); }
    else if (li === 1) { gnInit(); spxInit(); SPX.hi = [-1, -1]; EC.hi = -1; dBoard.reset(); setMode('div', 'gene'); }
    else if (li === 2) { RK.h = RK.a = RK.p = 0; RK.tested = { h: null, a: null, p: null }; ['rH', 'rA', 'rP'].forEach((id) => { $('#' + id).value = 0; sl[id].refresh(); }); setMode('risk'); }
    else { AC.picks = []; AC.sel = null; aBoard.reset(); setMode('act', 'match'); }
  }
  const sl = {};
  [['rH', 'h'], ['rA', 'a'], ['rP', 'p']].forEach(([id, k]) => { sl[id] = SciSim.bindRange($('#' + id), $('#o' + k.toUpperCase()), (v) => v + ' %', (v) => { RK[k] = v; trackRisk(); }); });
  function trackRisk() {
    const { h, a, p } = RK;
    if (h >= TEST_LV && !a && !p) RK.tested.h = S0 - spCount(h, 0, 0);
    if (a >= TEST_LV && !h && !p) RK.tested.a = S0 - spCount(0, a, 0);
    if (p >= TEST_LV && !h && !a) RK.tested.p = S0 - spCount(0, 0, p);
  }
  $('#bRiskReset').addEventListener('click', () => { Sound.click(); RK.h = RK.a = RK.p = 0; ['rH', 'rA', 'rP'].forEach((id) => { $('#' + id).value = 0; sl[id].refresh(); }); ctlUpdate(); });
  $('#bSplit').addEventListener('click', () => { spSplit(); ctlUpdate(); });
  $('#bPlay').addEventListener('click', () => { Sound.click(); SP.play = !SP.play; ctlUpdate(); });
  $('#bSkip').addEventListener('click', () => { Sound.click(); for (let i = 0; i < 10; i++) spStep(); ctlUpdate(); });
  $('#bMerge').addEventListener('click', () => spMerge(!SP.merge));
  $('#bSpReset').addEventListener('click', () => { Sound.click(); spReset(); ctlUpdate(); });
  $('#bDisease').addEventListener('click', () => { if (GN.run) return; Sound.click(); GN.run = true; GN.t = 0; GN.did = false; ctlUpdate(); });
  $('#bDisReset').addEventListener('click', () => { Sound.click(); gnInit(); ctlUpdate(); });
  $('#bSortReset').addEventListener('click', () => { Sound.click(); dBoard.reset(); ctlUpdate(); });
  $('#bMatchReset').addEventListener('click', () => { Sound.click(); aBoard.reset(); AC.sel = null; ctlUpdate(); });
  $('#bPlanReset').addEventListener('click', () => { Sound.click(); AC.picks = []; ctlUpdate(); });
  $('#subDiv').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { Sound.click(); setSub(b.dataset.sub); } });
  $('#subAct').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { Sound.click(); setSub(b.dataset.sub); } });
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setMode(b.dataset.mode); }));

  function showHint(msg, ms) { const h = $('#stageHint'); if (!h) return; h.textContent = msg; h.classList.remove('hide'); clearTimeout(hintTimer2); hintTimer2 = setTimeout(() => h.classList.add('hide'), ms || 4500); }

  /* ---------- 포인터 ---------- */
  const inR = (p, R) => p.x >= R.x && p.x <= R.x + R.w && p.y >= R.y && p.y <= R.y + R.h;
  SciSim.pointer(view, {
    down(p) {
      if (MODE === 'div') {
        if (SUB === 'sort') return dBoard.down(p);
        if (SUB === 'species') { for (let fi = 0; fi < 2; fi++) for (let s = 0; s < 4; s++) if (inR(p, spcLegendRect(fi, s))) { SPX.hi[fi] = SPX.hi[fi] === s ? -1 : s; SPX.seen[fi] = true; Sound.tick(); return false; } }
        if (SUB === 'eco') { for (let i = 0; i < ECO.length; i++) if (inR(p, ecoLegendRect(i))) { EC.hi = EC.hi === i ? -1 : i; Sound.tick(); return false; } }
      } else if (MODE === 'act') {
        if (SUB === 'match') return aBoard.down(p);
        for (let i = 0; i < CASES.length; i++) if (inR(p, chipRect(i))) { togglePick(i); return false; }
      }
      return false;
    },
    move(p) { if (MODE === 'div' && SUB === 'sort') dBoard.move(p); else if (MODE === 'act' && SUB === 'match') aBoard.move(p); },
    up(p) { if (MODE === 'div' && SUB === 'sort') { dBoard.up(p); ctlUpdate(); } else if (MODE === 'act' && SUB === 'match') { aBoard.up(p); ctlUpdate(); } },
    hover(p) {
      if (MODE === 'div' && SUB === 'sort') return dBoard.hit(p) ? 'grab' : 'default';
      if (MODE === 'act' && SUB === 'match') return aBoard.hit(p) ? 'grab' : 'default';
      if (MODE === 'act' && SUB === 'plan') { for (let i = 0; i < CASES.length; i++) if (inR(p, chipRect(i))) return 'pointer'; }
      return 'default';
    },
  });

  /* ---------- 읽음 칸 ---------- */
  function readouts() {
    if (MODE === 'speci') setReadouts(['세대', SP.gen + '세대', '평균 부리 두께', SP.split ? '씨앗 ' + f1(SP.mA) + ' · 곤충 ' + f1(SP.mB) + ' mm' : f1(SP.mA) + ' mm', '교배 가능한 쌍', SP.split ? SP.ratePct + ' %' : '—']);
    else if (MODE === 'div') {
      if (SUB === 'gene') setReadouts(['A 다양한 집단', '생존 ' + gnAlive('A') + ' / ' + GN_N, 'B 한 가지 무늬', '생존 ' + gnAlive('B') + ' / ' + GN_N, '병에 걸리는 무늬', '빨강·점 6개']);
      else if (SUB === 'species') setReadouts(['숲 A', '4종 · 최대 25 %', '숲 B', '4종 · 최대 91 %', '비교', '종 수 같음']);
      else if (SUB === 'eco') setReadouts(['생태계 종류', ECO.length + '가지', '전체 칸', ECOMAP.join('').length + '칸', '가장 넓은 것', (() => { let b = ECO[0]; ECO.forEach((e) => { if (ecoCount(e.k) > ecoCount(b.k)) b = e; }); return b.n + ' ' + ecoCount(b.k) + '칸'; })()]);
      else setReadouts(['놓은 카드', dBoard.cards.filter((c) => c.zone).length + ' / 9', '유전적', dBoard.inZone('gene').length + '장', '종 · 생태계', dBoard.inZone('spc').length + '장 · ' + dBoard.inZone('eco').length + '장']);
    } else if (MODE === 'risk') {
      const pa = rkPatches();
      setReadouts(['지역의 종 수', spCount(RK.h, RK.a, RK.p) + ' / ' + S0 + '종', '숲 조각', pa.patches + '개 · 가장 큰 ' + pa.biggest + '칸', '외래종', Math.round(RK.a / 10) + '곳에서 발견']);
    } else if (SUB === 'match') setReadouts(['연결한 카드', aBoard.cards.filter((c) => c.zone).length + ' / 8', '유전적 · 종', aBoard.inZone('gene').length + '장 · ' + aBoard.inZone('spc').length + '장', '생태계', aBoard.inZone('eco').length + '장']);
    else setReadouts(['고른 사례', AC.picks.length + ' / ' + MAX_PICK + '칸', '지키는 다양성', planTypes() + '종류', '점수 합계', idxOf('gene') + idxOf('spc') + idxOf('eco')]);
  }

  /* ======================================================
     단계 · 미션
     ====================================================== */
  const ensure = (m, s) => { if (MODE !== m || (s != null && SUB !== s)) setMode(m, s); };
  const forestFig = (() => {
    const W = 300, bars = [FORESTS[0], FORESTS[1]];
    let svg = '<svg viewBox="0 0 ' + W + ' 110" width="100%" style="max-width:340px" role="img" aria-label="숲 A는 네 종이 25 %씩, 숲 B는 한 종이 91 %이고 나머지 세 종이 3 %씩">';
    bars.forEach((F, i) => {
      const y = 12 + i * 48; let x = 40;
      svg += '<text x="0" y="' + (y + 20) + '" font-size="13" font-weight="800" fill="#334155">' + F.name + '</text>';
      F.counts.forEach((n, s) => { const w = (W - 50) * n / 100; svg += '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="28" fill="' + SPC[s].c + '" rx="3"/>'; if (n >= 10) svg += '<text x="' + (x + w / 2) + '" y="' + (y + 19) + '" font-size="12" font-weight="800" fill="#fff" text-anchor="middle">' + n + ' %</text>'; x += w; });
    });
    return svg + '</svg>';
  })();
  const L60 = { h: S0 - spCount(TEST_LV, 0, 0), a: S0 - spCount(0, TEST_LV, 0), p: S0 - spCount(0, 0, TEST_LV) };
  const testedChips = () => RF.map((f) => mark(RK.tested[f.k] != null) + ' ' + f.n + (RK.tested[f.k] != null ? ' −' + RK.tested[f.k] + '종' : '')).join(' · ');
  const levels = [
    {
      title: '종의 분화: 갈라지는 핀치', short: '종의 분화', icon: '🐦', phase: '모형',
      features: ['speci'],
      intro: '<p class="si-q">❓ 탐구 질문: 지구에는 어떻게 이렇게 많은 종류의 생물이 생겼고, 우리는 무엇을 지켜야 할까?</p>' +
        '<div class="si-link">🔗 <b>중학교에서</b> 같은 종 안에도 변이가 있고 생물다양성이 중요하다고 배웠어요. <b>앞 차시</b>에서는 환경에 유리한 변이를 가진 개체가 더 많이 살아남는 <b>자연선택</b>을 모의실험했어요.</div>' +
        '<p>한 섬에 사는 핀치 집단이 강으로 둘로 나뉘면 어떻게 될까요? 한쪽 섬에는 <b>딱딱한 씨앗</b>, 다른 쪽에는 <b>곤충</b>이 많아요. 세대를 거듭하며 <b>부리 두께</b>의 분포가 어떻게 달라지는지 보고, 두 집단이 다시 만났을 때 짝이 될 수 있는지 확인해요.</p>',
      setup() { enterLevel(0); },
      recap: '지리적 격리로 나뉜 집단이 서로 다른 환경에서 자연선택을 받으며 오랜 세대 동안 차이가 쌓이면, 다시 만나도 교배하지 못하는 서로 다른 종이 될 수 있어요.',
      summary: '<ul><li><b>종 분화</b>: ① 지리적 격리(강·바다·산맥) → ② 서로 다른 환경에서 각각 자연선택 → ③ 오랜 세대 동안 형질 차이 누적 → ④ 다시 만나도 교배·번식 못 함(<b>생식적 격리</b>) → 서로 다른 종.</li><li>예: 갈라파고스 핀치의 부리 모양은 먹이(딱딱한 씨앗 · 곤충 · 선인장)에 따라 달라졌어요.</li><li>이렇게 <b>진화</b>가 쌓여 지구에 다양한 종이 생겼어요(생물다양성의 형성).</li></ul>',
      missions: [
        {
          title: '강으로 나누고 ' + GEN_GOAL + '세대',
          goal: '<b>🌊 강으로 서식지를 나누고</b> <b>▶ 세대 진행</b>으로 <b>' + GEN_GOAL + '세대</b> 이상 진행해 보세요.',
          hint: '세대 진행이 느리면 ⏭ 10세대 버튼을 눌러도 돼요. 부리 두께 분포가 서로 반대쪽으로 움직이는 모습을 지켜봐요.',
          setup() { ensure('speci'); if (SP.merge) spMerge(false); },
          check: () => SP.split && SP.gen >= GEN_GOAL, hold: 0.4,
          status: () => mark(SP.split) + ' 서식지 나눔 · ' + mark(SP.gen >= GEN_GOAL) + ' ' + Math.min(SP.gen, GEN_GOAL) + ' / ' + GEN_GOAL + '세대',
          explain: '씨앗 섬에서는 <b>두꺼운 부리</b>, 곤충 섬에서는 <b>얇은 부리</b>를 가진 개체가 더 잘 살아남아 번식했어요. 두 집단이 섞이지 못하니 차이가 계속 쌓여 분포가 서로 반대쪽으로 이동했어요. 나뉘지 않은 집단은 분포가 거의 그대로예요.',
        },
        {
          title: '합쳐서 짝짓기 시험',
          goal: '<b>🤝 두 집단 합쳐 짝짓기</b>를 눌러, ' + GEN_GOAL + '세대 뒤 두 집단이 짝이 될 수 있는지 확인하세요. (교배 가능한 쌍 ' + ISO_PCT + ' % 미만이 되어야 해요)',
          hint: '아직 ' + GEN_GOAL + '세대가 안 되었다면 합치기를 취소(↩)하고 더 진행해요. 세대가 적으면 짝이 되는 쌍이 많아요.',
          setup() { ensure('speci'); },
          check: () => SP.merge && SP.gen >= GEN_GOAL && isolated(), hold: 0.8,
          status: () => mark(SP.merge) + ' 합쳐 보기 · ' + mark(SP.gen >= GEN_GOAL) + ' ' + SP.gen + '세대 · ' + mark(SP.merge && isolated()) + ' 교배 가능한 쌍 ' + (SP.split ? SP.ratePct : '—') + ' %',
          explain: '오랜 세대가 지나 부리 두께 차이가 크게 벌어져, 두 집단은 더 이상 서로를 짝으로 받아들이지 못해요. 이렇게 <b>교배해도 자손을 남길 수 없는 상태(생식적 격리)</b>가 되면 서로 다른 종이에요. 세대가 적을 때는 짝이 되는 쌍이 많아 아직 같은 종이에요.',
        },
        {
          type: 'quiz', title: '새로운 종이 생기려면',
          goal: '한 집단이 서로 다른 두 종으로 갈라지려면 무엇이 필요할까요?',
          setup() { ensure('speci'); },
          choices: ['한쪽 집단이 먹이를 먹으려고 노력해서 부리를 키우면 된다', '두 집단이 계속 섞여 짝짓기를 하며 같은 환경에서 산다', '지리적 격리, 서로 다른 환경에서의 자연선택, 오랜 세대가 필요하다', '강으로 나뉘기만 하면 곧바로 서로 다른 종이 된다'],
          answer: 2,
          feedback: ['노력해서 얻은 형질은 자손에게 유전되지 않아요. 유전되는 변이 중 유리한 것이 선택돼요.', '계속 섞이면 유전자가 섞여 차이가 쌓이지 못해요.', '', '격리만으로는 부족해요. 서로 다른 환경에서의 자연선택과 오랜 시간이 함께 필요해요.'],
          explain: '<b>격리</b>로 유전자가 섞이지 않고, <b>다른 환경의 자연선택</b>으로 형질 차이가 쌓이고, <b>오랜 시간</b>이 지나 생식적 격리가 생기면 새로운 종이 돼요. 이런 과정이 반복되어 종이 많아지고 생물다양성이 만들어졌어요.',
        },
      ],
    },
    {
      title: '세 가지 다양성', short: '세 가지 다양성', icon: '🌈', phase: '분석',
      features: ['div'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 격리와 자연선택이 쌓여 종이 갈라지는 것을 봤어요. 이렇게 만들어진 <b>생물다양성</b>은 한 가지가 아니에요.</div>' +
        '<p>생물다양성은 <b>유전적 다양성</b>(같은 종 안의 유전자 차이), <b>종 다양성</b>(종의 수와 고른 정도), <b>생태계 다양성</b>(서로 다른 생태계)으로 나누어 설명해요. 관찰 3가지를 하고, 사례 카드를 알맞게 분류해 봐요.</p>',
      setup() { enterLevel(1); },
      recap: '생물다양성은 같은 종 안의 유전자 차이(유전적), 종의 수와 고른 정도(종), 서로 다른 생태계(생태계)로 나누어 설명해요.',
      summary: '<ul><li><b>유전적 다양성</b>: 같은 종 안에서 유전자(형질)가 다양한 정도. 많을수록 환경 변화나 전염병에서 일부가 살아남아요 (단일 품종 작물의 병충해, 아일랜드 감자 기근).</li><li><b>종 다양성</b>: 일정 지역에 사는 <b>종의 수</b>와 각 종이 <b>고르게 분포하는 정도</b>. 종 수가 같아도 한 종이 대부분이면 낮아요.</li><li><b>생태계 다양성</b>: 숲 · 습지 · 갯벌 · 사막 · 바다처럼 서로 다른 생태계가 다양한 정도.</li></ul>',
      missions: [
        {
          title: '전염병이 퍼지면?',
          goal: '🧬 유전적 화면에서 <b>🦠 전염병 퍼뜨리기</b>를 눌러 두 집단의 생존 수를 비교하세요.',
          hint: '병은 빨간 바탕에 까만 점 6개 무당벌레만 죽여요. 끝날 때까지 지켜봐요.',
          setup() { ensure('div', 'gene'); },
          check: () => GN.did, hold: 0.3,
          status: () => mark(GN.run) + ' 전염병 시작 · ' + mark(GN.did) + ' 결과 확인 (A 생존 ' + gnAlive('A') + ' · B 생존 ' + gnAlive('B') + ')',
          explain: '무늬(유전자)가 다양한 집단 A는 병에 약한 무늬만 사라지고 나머지는 살아남았어요. 모두 같은 무늬인 집단 B는 <b>전부</b> 사라졌어요. <b>유전적 다양성</b>이 높으면 환경 변화나 전염병에서 일부 개체가 살아남을 가능성이 커요.',
        },
        {
          title: '사례 카드 9장 분류',
          goal: '사례 카드 <b>9장</b>을 <b>유전적 · 종 · 생태계</b> 다양성 칸에 놓고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '같은 종 안의 차이면 유전적, 사는 종의 수와 고른 정도면 종, 서로 다른 환경 종류면 생태계 다양성이에요.',
          manual: true,
          setup() { ensure('div', 'sort'); },
          check: () => boardCheck(dBoard, (c) => c.t),
          explain: '<b>같은 종 안의 차이</b>(무늬, 품종, 눈동자 색)는 유전적 다양성, <b>종의 수와 고른 정도</b>(숲의 동식물 종류, 한 종이 뒤덮은 호수)는 종 다양성, <b>서로 다른 생태계</b>(산·습지·갯벌·바다, 사막·초원·숲)는 생태계 다양성이에요.',
        },
        {
          type: 'quiz', title: '종 수가 같다면?', figure: forestFig,
          goal: '숲 A와 B에는 모두 <b>4종</b>이 살아요. 종 다양성이 더 높은 숲과 그 까닭은?',
          setup() { ensure('div', 'species'); },
          choices: ['숲 B: 가장 많은 종의 개체가 91마리나 되기 때문이다', '숲 A: 4종이 같은 비율로 고르게 살기 때문이다', '두 숲은 종 수가 같으므로 종 다양성도 똑같다', '숲 B: 개체 수가 더 많기 때문이다'],
          answer: 1,
          feedback: ['한 종이 대부분을 차지하면 종이 고르지 않아 종 다양성이 낮아요.', '', '종 다양성은 종의 수뿐 아니라 각 종이 고르게 분포하는 정도도 함께 봐요.', '두 숲의 전체 개체 수는 100마리로 같아요.'],
          explain: '종 다양성은 <b>종의 수</b>와 <b>고른 정도</b>로 판단해요. 숲 A는 4종이 25 %씩이라 고르고, 숲 B는 한 종이 91 %라서 사실상 한 종이 지배해요. 그래서 종 수가 같아도 A의 종 다양성이 더 높아요.',
        },
      ],
    },
    {
      title: '다양성 위기: 무엇이 종을 없앨까', short: '다양성 위기', icon: '⚠️', phase: '분석',
      features: ['risk'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 유전적 · 종 · 생태계 다양성을 구분했어요. 그런데 이 다양성이 지금 빠르게 줄고 있어요.</div>' +
        '<p>다양성이 줄어드는 주된 원인은 <b>서식지 파괴와 분단</b>(도로·개발), <b>외래종 유입</b>, <b>환경 오염</b>(남획·기후 변화도 있어요)이에요. 슬라이더를 올리며 한 지역의 종 수가 어떻게 달라지는지 요인별로 비교해요. (예시 모형이에요.)</p>',
      setup() { enterLevel(2); },
      recap: '서식지 파괴·분단, 외래종, 오염은 모두 종을 줄여요. 서식지가 조각나면 개체군이 작아져 유전적 다양성이 줄고 멸종 위험이 커져요.',
      summary: '<ul><li>생물다양성 감소의 주요 원인: <b>서식지 파괴와 분단</b>, <b>외래종 유입</b>, <b>남획·불법 포획</b>, <b>환경 오염</b>, <b>기후 변화</b>.</li><li>서식지가 도로·개발로 <b>조각</b>나면 조각마다 개체 수가 줄어 → 근친 교배로 <b>유전적 다양성 감소</b> → 환경 변화에 약해져 <b>멸종 위험 증가</b>.</li><li>외래종은 토종 생물을 잡아먹거나 먹이·서식지를 빼앗아요 (황소개구리 · 뉴트리아 · 가시박).</li></ul>',
      missions: [
        {
          title: '요인을 한 가지씩 올려 비교',
          goal: '<b>다른 요인은 0 %</b>로 두고, 요인을 하나씩 <b>' + TEST_LV + ' % 이상</b> 올려 종 수가 얼마나 줄어드는지 세 요인 모두 비교하세요.',
          hint: '서식지 파괴·분단을 ' + TEST_LV + ' %까지 올려 보고, 0 %로 되돌린 뒤 외래종, 그다음 환경 오염을 같은 방법으로 해 봐요.',
          setup() { ensure('risk'); },
          check: () => RF.every((f) => RK.tested[f.k] != null), hold: 0.5,
          status: () => testedChips(),
          explain: '같은 크기(' + TEST_LV + ' %)로 올렸을 때 사라진 종은 <b>서식지 파괴·분단 ' + L60.h + '종</b>, 환경 오염 ' + L60.p + '종, 외래종 ' + L60.a + '종이에요. 이 모형에서는 서식지 파괴·분단의 영향이 가장 컸고, 세 요인이 겹치면 피해가 더 커져요.',
        },
        {
          type: 'quiz', title: '서식지가 조각나면',
          goal: '도로와 개발로 숲 서식지가 <b>작은 조각</b>으로 나뉘면 어떤 일이 이어질까요?',
          setup() { ensure('risk'); },
          choices: ['조각마다 숲이 넓어져서 개체 수가 오히려 늘어난다', '조각마다 개체 수가 줄어 유전적 다양성이 줄고, 멸종 위험이 커진다', '서식지가 나뉘어도 종 다양성에는 아무 영향이 없다', '조각난 숲에서는 외래종만 사라진다'],
          answer: 1,
          feedback: ['조각이 되면 한 조각의 넓이가 줄어 살 수 있는 개체 수도 줄어요.', '', '개체군이 작아지고 서로 오가지 못해 종이 사라질 수 있어요.', '외래종은 오히려 교란된 곳에서 더 잘 퍼지는 경우가 많아요.'],
          explain: '서식지가 조각나면 <b>개체군이 작아지고 서로 고립</b>돼요. 작은 집단은 유전자 조합이 줄어(유전적 다양성 감소) 전염병·환경 변화에 약해지고, 한 번의 사고로도 사라질 수 있어 <b>멸종 위험</b>이 커져요.',
        },
      ],
    },
    {
      title: '보전 실천: 우리 지역 지키기', short: '보전 실천', icon: '🌱', phase: '적용',
      features: ['act'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 서식지 파괴, 외래종, 오염이 다양성을 줄이는 것을 확인했어요. 이제 <b>어떻게 지킬지</b> 생각해 봐요.</div>' +
        '<p>보전 사례를 그것이 지키는 다양성과 연결하고, 예산 <b>' + MAX_PICK + '칸</b>으로 우리 지역에 필요한 사례를 골라 계획을 세워요.</p>',
      setup() { enterLevel(3); },
      recap: '서식지 보호, 생태 통로, 종 복원, 종자 은행, 외래종 관리, 불법 거래 근절, 개인의 실천은 각각 지키는 다양성이 달라서 함께 해야 효과적이에요.',
      summary: '<ul><li>보전 사례: <b>습지 보호 · 인증 제품 구매 · 일회용품 줄이기</b>(생태계), <b>생태 통로 · 종자 은행</b>(유전적), <b>반달가슴곰 복원 · 외래종 퇴치 · 불법 거래 근절</b>(종).</li><li>한 가지 다양성만 지키면 부족해요. 서로 다른 다양성을 함께 지키는 계획이 필요해요.</li><li>개인 실천: 일회용품 줄이기, 인증 제품 고르기, 야생 동물 불법 거래 신고하기, 기르던 외래 동물을 야생에 풀어 주지 않기.</li></ul>',
      missions: [
        {
          title: '보전 사례 연결하기',
          goal: '보전 사례 카드 <b>8장</b>을 그 활동이 지키는 <b>다양성</b> 칸에 놓고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '카드를 누르면 활동 설명이 나와요. 서식지 자체를 지키면 생태계, 특정 생물의 종류를 지키면 종, 품종·집단의 유전자를 지키면 유전적 다양성이에요.',
          manual: true,
          setup() { ensure('act', 'match'); },
          check: () => boardCheck(aBoard, (c) => c.t),
          explain: '습지 보호 · 일회용품 줄이기 · 인증 제품은 <b>생태계</b>를, 반달가슴곰 복원 · 외래종 퇴치 · 불법 거래 근절은 <b>종</b>을, 생태 통로(집단 사이 유전자 교류) · 종자 은행(품종 보관)은 <b>유전적 다양성</b>을 지켜요.',
        },
        {
          title: '우리 지역 보전 계획',
          goal: '예산 <b>' + MAX_PICK + '칸</b>으로 사례 <b>' + MAX_PICK + '개</b>를 고르되, <b>서로 다른 다양성을 2종류 이상</b> 지키게 하세요.',
          hint: '📋 우리 지역 계획 화면에서 카드를 눌러 고르거나 취소해요. 오른쪽 점수 막대가 어떤 다양성을 올리는지 봐요.',
          setup() { ensure('act', 'plan'); },
          check: () => AC.picks.length === MAX_PICK && planTypes() >= 2, hold: 0.8,
          status: () => mark(AC.picks.length === MAX_PICK) + ' ' + AC.picks.length + ' / ' + MAX_PICK + '칸 사용 · ' + mark(planTypes() >= 2) + ' 지키는 다양성 ' + planTypes() + '종류',
          explain: '지역의 문제는 한 가지가 아니에요. 서식지를 이어 주는 일, 사라지는 종을 지키는 일, 생태계를 보호하는 일은 <b>각각 다른 다양성</b>을 지켜요. 그래서 한쪽에만 쓰기보다 서로 다른 다양성을 함께 챙기는 계획이 효과적이에요.',
        },
        {
          type: 'quiz', title: '내가 할 수 있는 실천',
          goal: '생물다양성을 지키는 개인의 실천으로 <b>알맞지 않은 것</b>은?',
          setup() { ensure('act', 'plan'); },
          choices: ['일회용품 사용 줄이기', '보전 인증이 붙은 제품 고르기', '야생 동물의 불법 거래를 목격하면 신고하기', '키우던 외래 동물이 싫증나면 야생에 풀어 주기'],
          answer: 3,
          feedback: ['쓰레기를 줄이면 바다·갯벌 생태계의 오염이 줄어요.', '인증 제품은 숲·바다 같은 서식지를 지키는 데 도움이 돼요.', '불법 거래를 막으면 멸종 위기종을 지킬 수 있어요.', ''],
          explain: '외래 동물을 야생에 풀어 주면 토종 생물을 잡아먹거나 먹이를 빼앗아 <b>종 다양성</b>을 해쳐요. 황소개구리, 뉴트리아가 그런 예예요. 키우던 동물은 끝까지 책임지거나 정해진 방법으로 돌려보내야 해요.',
        },
      ],
    },
  ];

  gnInit(); spxInit(); rkInit(); spReset(true); buildDBoard(); buildABoard();
  game = SciSim.game({
    simId: 'h1-biodiversity', mount: '#game', badge: '생물다양성 지킴이', homeHref: '../../index.html#h1b',
    featureLabels: { speci: '🐦 핀치 섬 · 부리 두께 분포 · 짝짓기 시험', div: '🌈 무당벌레 · 두 숲 · 생태계 지도 · 사례 분류', risk: '⚠️ 3가지 요인 슬라이더 · 종 수 그래프', act: '🌱 보전 사례 연결 · 우리 지역 계획' },
    onFeatures() { ctlUpdate(); },
    levels,
  });

  /* ---------- 루프 ---------- */
  let lastKey = '', lastFree = false;
  const GEN_MAX = 300;
  SciSim.loop((dt, t) => {
    if (game && game.free !== lastFree) { lastFree = game.free; ctlUpdate(); }
    if (MODE === 'speci') { stepSpeci(dt); if (SP.gen >= GEN_MAX) SP.play = false; }
    const key = [SP.gen, SP.play, SP.split, SP.merge, GN.run, GN.did, dBoard.cards.filter((c) => c.zone).length, aBoard.cards.filter((c) => c.zone).length, AC.picks.length, MODE, SUB].join('|');
    if (key !== lastKey) { lastKey = key; ctlUpdate(); }
    parts.update(dt);
    ctx.setTransform(view.scale * view.dpr, 0, 0, view.scale * view.dpr, 0, 0);
    if (MODE === 'speci') drawSpeci(t, dt);
    else if (MODE === 'div') { if (SUB === 'gene') drawGene(t, dt); else if (SUB === 'species') drawSpecies(t, dt); else if (SUB === 'eco') drawEco(t, dt); else drawSort(t, dt); }
    else if (MODE === 'risk') drawRisk(t, dt);
    else if (SUB === 'match') drawMatch(t, dt); else drawPlan(t, dt);
    parts.draw(ctx);
    if (MODE === 'act' && SUB === 'plan') drawFlash(dt, 214 > 0 ? (PHONE ? 270 : 296) : 0);
    if (S_fade > 0.005) { ctx.fillStyle = 'rgba(255,255,255,' + S_fade * 0.85 + ')'; ctx.fillRect(0, 0, VW, VH); S_fade = RM ? 0 : approach(S_fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    SP, GN, RK, AC, SPX, EC, VW, VH, get game() { return game; }, get dBoard() { return dBoard; }, get aBoard() { return aBoard; },
    spStep, spSplit, spMerge, spReset, gnAlive, spCount, rkPatches, setMode, setSub, togglePick, chipRect, spcLegendRect, ecoLegendRect, isolated, trackRisk, ctlUpdate, CASES, DCARDS,
    get MODE() { return MODE; }, get SUB() { return SUB; },
    solveSort() { dBoard.cards.forEach((c) => { c.zone = c.t; }); dBoard.layout(true); ctlUpdate(); },
    solveMatch() { aBoard.cards.forEach((c) => { c.zone = c.t; }); aBoard.layout(true); ctlUpdate(); },
  };
})();
