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
  function initStage(bg, tw, th, pw, ph, fs) {
    VW = PHONE ? pw : tw; VH = PHONE ? ph : th; FS = PHONE ? (fs || 1.25) : 1;
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
     통합과학2 Ⅱ. 환경과 에너지 - 엘니뇨·사막화와 대처
     [10통과2-02-03] 엘니뇨, 사막화 등의 현상이 지구 환경과 인간 생활에 미치는 영향과 대처 방안을 분석
     ① 모형: 엘니뇨(무역풍 → 따뜻한 물 → 용승 → 멸치)   ② 탐구: 사막화(강수량·방목·나무 심기)
     ③ 분석: 영향 지도와 영향 분류                     ④ 설계: 2100년 시나리오와 완화·적응
     ========================================================= */
  initStage('#dbeafe', 800, 560, 600, 840, 1.28);

  /* ---------- 상수 (본문의 숫자는 모두 여기서 가져와요) ---------- */
  const K = {
    // 엘니뇨
    THR: 0.5, MONTHS: 5, PERIOD: '2~7', SST_E: 22, SST_W: 29, EL_97: 2.4, EL_15: 2.6,
    A_PTS: [[0, 2.6], [30, 0.5], [40, 0.25], [60, -0.25], [70, -0.5], [100, -1.6]],     // 무역풍 세기 → 동태평양 수온 편차(°C)
    // 사막화
    COLS: 12, ROWS: 8, GROW: 0.6, GRAZE: 0.045, W0: 150, WSPAN: 450, FEED: 0.25, TREE_BOOST: 60, SEED: 0.06, SEED0: 0.03,
    V_DES: 0.15, ERODE: 0.05, RECOV: 0.012, TREE_V: 0.85, MAX_TREES: 10, YPS: 4, SIM_DT: 0.5,
    DES_OK: 20, DES_BAD: 40, RAIN_DRY: 400, RAIN_HARD: 300, LIVE_BAD: 6, LIVE_OK: 3,
    // 미래 시나리오 (2100년 전지구 기온 상승, 해수면 상승 모형)
    BASE: [1.8, 2.7, 4.4], ADJ_E: [-0.2, 0, 0.2], ADJ_F: [-0.1, 0, 0.1], DIFF: 0.5, SLR0: 0.1, SLR_K: 0.17, SEA_HIST: 20, SEA_FUT: '0.3~1',
  };
  const f1 = (x) => (Math.round(x * 10) / 10).toFixed(1);
  const n1 = (x) => Math.round(x * 10) / 10;
  const sg1 = (x) => (n1(x) >= 0 ? '+' : '−') + Math.abs(n1(x)).toFixed(1);
  const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

  /* ---------- 상태 ---------- */
  const S = {
    mode: 'enso', clock: 0, fade: 0,
    // 엘니뇨
    w: 50, wS: 50, aS: 0, dwell: { no: 0, el: 0, la: 0 }, seen: { no: false, el: false, la: false },
    // 사막화
    rain: 600, live: 2, yearT: 0, simAcc: 0, desOK: 0, desPeak: 0, hurtOnce: false,
    // 영향 분석
    subImp: 'map', visited: new Set(), sel: -1, impOK: 0,
    // 미래
    subFut: 'scen', pol: 1, en: 1, fo: 1, saved: [null, null], nextSlot: 0, evOrder: [], who: -1, why: -1, pledge: new Set(), mitOK: 0, futBad: 0,
  };
  const pS = new SciSim.Spring(0, { stiffness: 70, damping: 11 });

  /* =========================================================
     장면 1 : 엘니뇨 (무역풍 세기 → 따뜻한 물의 위치 → 용승 → 멸치)
     ========================================================= */
  function aOf(w) {
    const P = K.A_PTS; w = clamp(w, 0, 100);
    for (let i = 1; i < P.length; i++) if (w <= P[i][0]) return P[i - 1][1] + (P[i][1] - P[i - 1][1]) * (w - P[i - 1][0]) / (P[i][0] - P[i - 1][0]);
    return P[P.length - 1][1];
  }
  const catOf = (a) => (n1(a) >= K.THR ? 'el' : n1(a) <= -K.THR ? 'la' : 'no');
  const CAT = { no: '평상시', el: '엘니뇨', la: '라니냐' };
  const CATCOL = { no: '#16a34a', el: '#ea580c', la: '#2563eb' };
  const upOf = (a) => clamp(0.8 - 0.28 * a, 0.1, 1);              // 용승 세기 (평상시 0.8)
  const fishIdx = (a) => Math.round(100 * upOf(a) / upOf(0));       // 멸치 어획 지수 (평상시 = 100)
  const windName = (w) => (w <= 30 ? '약함' : w >= 70 ? '매우 강함' : '보통');

  const SC1 = PHONE ? 0.75 : 1;
  const O = { X0: 70, X1: 730, YS: 192, YB: 520 };
  const thermY = (xn, p) => {
    const dW = 0.52 - 0.14 * p, dE = 0.20 + 0.28 * p, sm = smoothstep(0.1, 0.9, xn);
    return O.YS + (O.YB - O.YS) * (dW + (dE - dW) * sm);
  };
  const SST_STOPS = [[20, '#1d4ed8'], [23, '#38bdf8'], [26, '#fde047'], [28, '#fb923c'], [30, '#dc2626']];
  function sstColor(T) {
    for (let i = 1; i < SST_STOPS.length; i++) if (T <= SST_STOPS[i][0]) return SciSim.color.mix(SST_STOPS[i - 1][1], SST_STOPS[i][1], (T - SST_STOPS[i - 1][0]) / (SST_STOPS[i][0] - SST_STOPS[i - 1][0]));
    return SST_STOPS[SST_STOPS.length - 1][1];
  }
  function sstAt(xn, a, p) {
    const xs = clamp(0.45 + 0.35 * p, 0.15, 0.85), f = (x) => smoothstep(xs - 0.3, xs + 0.3, x), fn = f(xn) / f(1);
    return K.SST_W + (K.SST_E + a - K.SST_W) * fn;
  }
  /* 멸치 떼 */
  const fish = [];
  for (let i = 0; i < 20; i++) fish.push({ ph: Math.random() * 6.3, bx: 0, by: 0, ox: rnd(-80, 80), oy: rnd(0, 70), sp: rnd(0.6, 1.2) });
  function drawFish(f, x, y, alpha, t) {
    if (alpha < 0.02) return;
    ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, y); ctx.scale(Math.sin(t * f.sp + f.ph) > 0 ? 1 : -1, 1);
    ctx.fillStyle = '#e2e8f0'; ctx.beginPath(); ctx.ellipse(0, 0, 8, 3.4, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#94a3b8'; ctx.beginPath(); ctx.moveTo(-7, 0); ctx.lineTo(-13, -4); ctx.lineTo(-13, 4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#0f172a'; ctx.beginPath(); ctx.arc(4.2, -0.8, 0.9, 0, TAU); ctx.fill();
    ctx.restore();
  }
  const fishLive = [];
  let upAcc = 0;
  function stepEnso(dt) {
    S.wS = approach(S.wS, S.w, dt, 5);
    S.aS = approach(S.aS, aOf(S.w), dt, 3.2);
    pS.target = clamp(S.aS / 2.6, -0.6, 1); pS.update(dt);
    // 이 상태를 충분히 오래 보여 줬는지 (화면이 바뀐 뒤 1초)
    const a = aOf(S.w), cat = catOf(a), settledV = Math.abs(S.aS - a) < 0.08 && Math.abs(S.wS - S.w) < 1.5;
    ['no', 'el', 'la'].forEach((c) => { S.dwell[c] = (cat === c && settledV) ? S.dwell[c] + dt : 0; if (S.dwell[c] >= 1) S.seen[c] = true; });
    // 용승하는 찬물 방울
    if (!RM) {
      const u = upOf(S.aS); upAcc += dt * u * 9;
      while (upAcc >= 1) { upAcc -= 1; const xn = rnd(0.86, 0.98); parts.emit({ x: (O.X0 + (O.X1 - O.X0) * xn) * SC1, y: (thermY(xn, pS.value) + 8) * SC1, vx: rnd(-6, 6), vy: -rnd(34, 58) * SC1, life: 1.9, size: 3 * SC1, color: '#bae6fd', shape: 'bubble' }); }
    }
  }
  function cloud(cx, cy, s, a) {
    ctx.save(); ctx.globalAlpha = a == null ? 1 : a; ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.ellipse(cx, cy, 60 * s, 20 * s, 0, 0, TAU); ctx.ellipse(cx - 30 * s, cy - 12 * s, 32 * s, 20 * s, 0, 0, TAU); ctx.ellipse(cx + 22 * s, cy - 15 * s, 34 * s, 22 * s, 0, 0, TAU); ctx.ellipse(cx - 2 * s, cy - 24 * s, 28 * s, 18 * s, 0, 0, TAU); ctx.fill();
    ctx.restore();
  }
  function drawEnso(t) {
    const a = S.aS, p = pS.value, u = upOf(a), w = S.wS, X0 = O.X0, X1 = O.X1, YS = O.YS, YB = O.YB, W = X1 - X0;
    const fontBase = D.font; if (PHONE) D.font = (n, w) => fontBase(Math.round(n * 1.38 * 10) / 10, w);
    ctx.save(); ctx.scale(SC1, SC1);
    // 하늘
    const sk = ctx.createLinearGradient(0, 0, 0, YS); sk.addColorStop(0, '#9ec9f2'); sk.addColorStop(1, '#e6f3fd'); ctx.fillStyle = sk; ctx.fillRect(0, 0, 800, YS);
    // 바다: 찬 깊은 물
    const dg = ctx.createLinearGradient(0, YS, 0, YB); dg.addColorStop(0, '#2563a8'); dg.addColorStop(1, '#0a2250');
    ctx.fillStyle = dg; ctx.fillRect(X0, YS, W, YB - YS);
    // 따뜻한 표층수 (수온 약층 위): 가로로 수온에 따라 색이 변해요
    const hg = ctx.createLinearGradient(X0, 0, X1, 0);
    for (let i = 0; i <= 12; i++) hg.addColorStop(i / 12, sstColor(sstAt(i / 12, a, p)));
    ctx.beginPath(); ctx.moveTo(X0, YS); ctx.lineTo(X1, YS);
    for (let x = X1; x >= X0; x -= 6) ctx.lineTo(x, thermY((x - X0) / W, p));
    ctx.lineTo(X0, thermY(0, p)); ctx.closePath(); ctx.fillStyle = hg; ctx.fill();
    // 깊이에 따라 약간 어둡게
    ctx.save(); ctx.clip(); const og = ctx.createLinearGradient(0, YS, 0, YB); og.addColorStop(0, 'rgba(255,255,255,.12)'); og.addColorStop(1, 'rgba(10,34,80,.45)'); ctx.fillStyle = og; ctx.fillRect(X0, YS, W, YB - YS); ctx.restore();
    // 수온 약층
    ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 3; ctx.setLineDash([9, 7]); ctx.beginPath();
    for (let x = X0; x <= X1; x += 6) { const y = thermY((x - X0) / W, p); x === X0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke(); ctx.setLineDash([]);
    D.text(X0 + 120, thermY(0.1, p) + 22, '수온 약층 (따뜻한 물 ↔ 찬 물)', { size: 13.5, weight: 800, color: '#fff', stroke: 'rgba(10,34,80,.7)', strokeWidth: 4 });
    D.text(X0 + 10, YB - 10, '서쪽 (인도네시아·호주)', { size: 13.5, weight: 800, color: '#bfdbfe', align: 'left' });
    D.text(X1 - 10, YB - 10, '동쪽 (페루 연안)', { size: 13.5, weight: 800, color: '#bfdbfe', align: 'right' });
    // 파도 (표면)
    ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 2; ctx.beginPath();
    for (let x = X0; x <= X1; x += 4) { const y = YS + 1.5 * Math.sin(x / 13 + (RM ? 0 : t * 2.2) * (0.4 + w / 120)); x === X0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke();
    // 표층 해류 (바람에 밀려 서쪽으로)
    for (let i = 0; i < 3; i++) flowArrowE(580 - i * 170, YS + 20, 470 - i * 170, YS + 20, 0.3 + w / 130, '#fef3c7', t);
    // 용승 (동쪽에서 찬물이 올라와요)
    [0.9, 0.95].forEach((xn, i) => { const x = X0 + W * (xn - 0.02 - i * 0.07), yb = thermY(xn - i * 0.07, p) + 26; flowArrowE(x, yb, x, YS + 20, u * 4.5, '#7dd3fc', t); });
    D.label(X1 - 108, YS + 120 + (thermY(0.95, p) - YS) * 0.0, '용승 ' + (u >= 0.9 ? '매우 활발' : u >= 0.6 ? '활발' : '약함'), { bg: u >= 0.6 ? '#0369a1' : '#64748b', size: 13.5, pad: 7 });
    // 멸치 떼 (용승이 활발할수록 많아요)
    const nF = u * 20;
    fish.forEach((f, i) => { const x = X1 - 100 + f.ox * 0.9 + Math.sin(t * f.sp + f.ph) * 10, y = YS + 40 + f.oy + Math.cos(t * 0.8 * f.sp + f.ph) * 6; drawFish(f, x, y, clamp(nF - i, 0, 1), t); });
    // 육지
    ctx.fillStyle = '#8d6e4a'; ctx.fillRect(0, YS - 4, X0, YB - YS + 4); ctx.fillStyle = '#5aa95a'; ctx.fillRect(0, YS - 10, X0, 10);
    ctx.fillStyle = '#8d6e4a'; ctx.fillRect(X1, YS - 4, 800 - X1, YB - YS + 4); ctx.fillStyle = '#5aa95a'; ctx.fillRect(X1, YS - 10, 800 - X1, 10);
    ctx.fillStyle = '#a8a29e'; ctx.beginPath(); ctx.moveTo(X1 + 8, YS - 10); ctx.lineTo(X1 + 36, YS - 62); ctx.lineTo(X1 + 62, YS - 22); ctx.lineTo(X1 + 78, YS - 48); ctx.lineTo(800, YS - 10); ctx.closePath(); ctx.fill();
    [30, 58].forEach((x) => { ctx.fillStyle = '#7a5230'; ctx.fillRect(x - 2, YS - 26, 4, 18); D.sphere(x, YS - 32, 11, '#2f9e57', { gloss: true }); });
    D.text(X0 / 2, YS + 30, '서', { size: 15, weight: 800, color: '#fff' }); D.text(X1 + (800 - X1) / 2, YS + 30, '동', { size: 15, weight: 800, color: '#fff' });
    // 구름과 비 (따뜻한 물 위로 상승 기류)
    const xc = X0 + W * (0.25 + 0.5 * (p + 0.6) / 1.6), drift = RM ? 0 : Math.sin(t * 0.4) * 6;
    cloud(xc + drift, 84, 1.25, 0.95); cloud(xc - 120 + drift * 0.5, 100, 0.8, 0.85); cloud(xc + 110 + drift * 0.6, 106, 0.7, 0.8);
    ctx.strokeStyle = 'rgba(37,99,235,.65)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    for (let i = 0; i < 16; i++) { const rx = xc - 60 + (i / 15) * 120, ph = (RM ? 0.3 : (t * 1.1 + i * 0.37) % 1), ry = 104 + ph * 70; ctx.beginPath(); ctx.moveTo(rx - 2, ry); ctx.lineTo(rx - 5, ry + 11); ctx.stroke(); }
    D.text(xc, 36, '비가 많이 내리는 곳', { size: 13.5, weight: 800, color: '#1e3a8a' });
    // 무역풍 화살표
    for (let i = 0; i < 3; i++) { const x0 = 740 - i * 190; flowArrowE(x0, 156, x0 - 150, 156, 0.5 + w / 22, '#475569', t, w); }
    D.label(630, 129, '무역풍 (동 → 서)', { bg: '#475569', size: 13.5, pad: 8 });
    // 수온 표시
    D.label(X0 + 100, YS - 20, '서쪽 바다 ' + K.SST_W + ' °C', { bg: '#dc2626', size: 13.5, pad: 7 });
    D.label(X1 - 110, YS - 20, '동쪽 바다 ' + f1(K.SST_E + aOf(S.w)) + ' °C', { bg: aOf(S.w) >= 0 ? '#ea580c' : '#2563eb', size: 13.5, pad: 7 });
    // 인과 사슬 칩
    const cat = catOf(aOf(S.w)), CH = {
      no: ['무역풍 평년 세기', '따뜻한 물이 서쪽에 모여요', '용승 활발', '멸치 많음'],
      el: ['무역풍 약해짐', '따뜻한 물이 동쪽으로 이동', '용승 약해짐', '멸치 줄어듦'],
      la: ['무역풍 매우 강함', '따뜻한 물이 서쪽에 더 쏠려요', '용승 더 활발', '멸치 더 많아짐'],
    }[cat];
    ctx.restore(); D.font = fontBase;
    const chips = (x, y, w2, h2, dx, dy) => CH.forEach((txt, i) => {
      const cx = x + i * dx, cy = y + i * dy;
      D.shadow(() => { ctx.fillStyle = '#fff'; rr(cx, cy, w2, h2, 11).fill(); }, { blur: 4, y: 1 });
      ctx.strokeStyle = CATCOL[cat]; ctx.lineWidth = 2.2; rr(cx, cy, w2, h2, 11).stroke();
      const lines = wrapLines(txt, w2 - 14, PHONE ? 15 : 13, 800); lines.forEach((l, j) => D.text(cx + w2 / 2, cy + h2 / 2 + 4.5 - (lines.length - 1) * 8 + j * 16 * FS * 0.95, l, { size: PHONE ? 15 : 13, weight: 800, color: '#1e293b' }));
      if (i < 3) D.text(cx + w2 + (dx - w2) / 2 + (dx === 0 ? 0 : 0), cy + (dy === 0 ? h2 / 2 + 5 : h2 + (dy - h2) / 2 + 5), dy === 0 ? '→' : '↓', { size: 17, weight: 800, color: CATCOL[cat] });
    });
    if (PHONE) { D.label(300, 436, '이렇게 이어져요', { bg: '#334155', size: 14, pad: 9 }); chips(60, 454, 480, 46, 0, 72); }
    else chips(30, 6, 176, 44, 188, 0);
    // 상태 이름표
    const L = D.label(PHONE ? 130 : 100, PHONE ? 38 : 66, CAT[cat], { bg: CATCOL[cat], size: 18, pad: 12 });
    if (!PHONE) { /* 넓은 화면은 칩이 위에 있어요 */ }
  }
  /* 두께가 값에 비례하는 화살표 (엘니뇨 장면용) */
  function flowArrowE(x1, y1, x2, y2, k, col, t, speedW) {
    const w = 2 + k * 2.2, head = 12 + w * 1.1, L = Math.hypot(x2 - x1, y2 - y1), ux = (x2 - x1) / L, uy = (y2 - y1) / L;
    D.arrow(x1, y1, x2, y2, { color: col, width: w, head });
    if (L > head + 14) {
      ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = Math.max(1.4, w * 0.22); ctx.setLineDash([6, 11]); ctx.lineDashOffset = RM ? 0 : -(t * (30 + (speedW == null ? 30 : speedW * 0.8)));
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2 - ux * head, y2 - uy * head); ctx.stroke(); ctx.restore();
    }
  }

  /* =========================================================
     장면 2 : 사막화 (강수량 · 방목 · 나무 심기 → 식생 → 토양 → 사막)
     ========================================================= */
  const NC = K.COLS * K.ROWS;
  const rngf = (seed) => () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const dr = rngf(7);
  const fert = Array.from({ length: NC }, () => 0.85 + 0.3 * dr());               // 칸마다 땅의 기름진 정도
  const tuft = Array.from({ length: NC }, () => Array.from({ length: 7 }, () => [dr(), dr()]));
  const NBR = Array.from({ length: NC }, (_, i) => {
    const x = i % K.COLS, y = Math.floor(i / K.COLS), out = [];
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; const xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < K.COLS && yy < K.ROWS) out.push(yy * K.COLS + xx); }
    return out;
  });
  const DS = { v: new Array(NC).fill(0.8), s: new Array(NC).fill(1), tree: new Array(NC).fill(false), reff: 600, meanV: 0.8, meanS: 1, des: 0, vis: new Array(NC).fill(0.8) };
  function desReset() {
    S.rain = 600; S.live = 2;
    DS.v.fill(0.8); DS.s.fill(1); DS.tree.fill(false); DS.vis.fill(0.8); S.yearT = 0; S.simAcc = 0; S.hurtOnce = false;
    for (let i = 0; i < 30; i++) stepDesert(K.SIM_DT, true);     // 처음에는 이미 자리 잡은 풀밭에서 시작해요
    S.yearT = 0; DS.vis = DS.v.slice(); sync2();
  }
  function stepDesert(dtYear, silent) {
    const mv = DS.v.reduce((a, b) => a + b, 0) / NC, reff = S.rain * (1 - K.FEED + K.FEED * mv);
    DS.reff = reff;
    const nv = DS.v.slice(), ns = DS.s.slice();
    for (let i = 0; i < NC; i++) {
      if (DS.tree[i]) { nv[i] = Math.max(DS.v[i], K.TREE_V); ns[i] = Math.min(1, DS.s[i] + K.RECOV * 3 * dtYear); continue; }
      const hasTree = NBR[i].some((j) => DS.tree[j]);
      const W = clamp((reff * fert[i] + (hasTree ? K.TREE_BOOST : 0) - K.W0) / K.WSPAN, 0, 1);
      const v = DS.v[i], s = DS.s[i], nvg = NBR[i].reduce((a, j) => a + DS.v[j], 0) / NBR[i].length;
      const dv = K.GROW * W * (0.3 + 0.7 * s) * (v + K.SEED * nvg + K.SEED0) * (1 - v) - K.GRAZE * S.live * v;
      nv[i] = clamp(v + dv * dtYear, 0, 1);
      const ds = v < 0.3 ? -K.ERODE * (0.3 - v) / 0.3 * (hasTree ? 0.5 : 1) + K.RECOV * 0.3 : K.RECOV;
      ns[i] = clamp(s + ds * dtYear, 0.1, 1);
    }
    DS.v = nv; DS.s = ns;
    DS.meanV = nv.reduce((a, b) => a + b, 0) / NC; DS.meanS = ns.reduce((a, b) => a + b, 0) / NC;
    DS.des = nv.filter((v) => v < K.V_DES).length / NC;
    if (!silent) S.yearT += dtYear;
  }
  const desPct = () => Math.round(100 * DS.des);                 // 화면에 보이는 사막 면적(%)
  const vegPct = () => Math.round(100 * DS.meanV);
  const soilPct = () => Math.round(100 * DS.meanS);
  const nTrees = () => DS.tree.filter(Boolean).length;
  const reffRound = () => Math.round(DS.reff / 10) * 10;
  /* 가축 */
  const sheep = Array.from({ length: 10 }, (_, i) => ({ cx: 0, cy: 0, x: 0, y: 0, t: rnd(0, 3), tx: 0, ty: 0, a: 0 }));
  const L2 = PHONE
    ? { gx: 24, gy: 126, cs: 46, sky: 116, gaug: { x: 14, y: 534, w: 572, h: 298 } }
    : { gx: 24, gy: 108, cs: 44, sky: 96, gaug: { x: 568, y: 108, w: 220, h: 352 } };
  const cellXY = (i) => ({ x: L2.gx + (i % K.COLS) * L2.cs, y: L2.gy + Math.floor(i / K.COLS) * L2.cs });
  function initSheep() { sheep.forEach((s) => { const i = Math.floor(Math.random() * NC), c = cellXY(i); s.cx = s.tx = c.x + L2.cs / 2; s.cy = s.ty = c.y + L2.cs / 2 + 4; s.x = s.cx; s.y = s.cy; }); }
  function stepSheep(dt) {
    for (let k = 0; k < sheep.length; k++) {
      const s = sheep[k]; s.a = approach(s.a, k < S.live ? 1 : 0, dt, 5);
      s.t -= dt;
      if (s.t <= 0) {
        s.t = rnd(2, 4);
        const ci = clamp(Math.floor((s.tx - L2.gx) / L2.cs), 0, K.COLS - 1) + clamp(Math.floor((s.ty - L2.gy) / L2.cs), 0, K.ROWS - 1) * K.COLS;
        const cand = NBR[ci].concat([ci]); let best = cand[Math.floor(Math.random() * cand.length)];
        for (let j = 0; j < 2; j++) { const c2 = cand[Math.floor(Math.random() * cand.length)]; if (DS.v[c2] > DS.v[best]) best = c2; }
        const c = cellXY(best); s.tx = c.x + rnd(0.3, 0.7) * L2.cs; s.ty = c.y + rnd(0.45, 0.8) * L2.cs;
      }
      s.x = approach(s.x, s.tx, dt, 1.2); s.y = approach(s.y, s.ty, dt, 1.2);
    }
  }
  function drawSheep(s, t) {
    if (s.a < 0.03) return;
    ctx.save(); ctx.globalAlpha = s.a; ctx.translate(s.x, s.y - Math.abs(Math.sin(t * 3 + s.x)) * 1.2 * (RM ? 0 : 1)); ctx.scale(0.55 + 0.45 * s.a, 0.55 + 0.45 * s.a);
    ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(0, 8, 10, 3, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#f8fafc'; [[-5, 0], [0, -2], [5, 0], [0, 2]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, 6, 0, TAU); ctx.fill(); });
    ctx.fillStyle = '#334155'; ctx.beginPath(); ctx.ellipse(9, -1, 3.8, 3.2, 0, 0, TAU); ctx.fill(); ctx.fillRect(-5, 5, 2, 5); ctx.fillRect(3, 5, 2, 5);
    ctx.restore();
  }
  function drawCell(i, t) {
    const c = cellXY(i), cs = L2.cs, v = DS.vis[i], s = DS.s[i];
    let col = SciSim.color.mix('#e5cb90', '#4f9f4b', smoothstep(0.08, 0.75, v));
    col = SciSim.color.mix(col, '#a98d5c', (1 - s) * 0.55 * (1 - v));
    ctx.fillStyle = col; ctx.fillRect(c.x, c.y, cs + 0.6, cs + 0.6);
    const n = Math.floor(v * 7.4);
    ctx.strokeStyle = SciSim.color.shade('#4f9f4b', -0.12 + 0.2 * (1 - v)); ctx.lineWidth = 2; ctx.lineCap = 'round';
    for (let k = 0; k < n; k++) { const x = c.x + 5 + tuft[i][k][0] * (cs - 10), y = c.y + 12 + tuft[i][k][1] * (cs - 16), sway = RM ? 0 : Math.sin(t * 2 + i + k) * 1.2; ctx.beginPath(); ctx.moveTo(x - 2, y); ctx.lineTo(x - 3 + sway, y - 7); ctx.moveTo(x + 2, y); ctx.lineTo(x + 3 + sway, y - 8); ctx.stroke(); }
    if (v < K.V_DES + 0.1) {
      ctx.strokeStyle = 'rgba(120,85,40,' + (0.7 * (1 - v / (K.V_DES + 0.1))) + ')'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(c.x + cs * 0.2, c.y + cs * 0.3); ctx.lineTo(c.x + cs * 0.45, c.y + cs * 0.5); ctx.lineTo(c.x + cs * 0.4, c.y + cs * 0.8); ctx.moveTo(c.x + cs * 0.45, c.y + cs * 0.5); ctx.lineTo(c.x + cs * 0.8, c.y + cs * 0.6); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(0,0,0,.07)'; ctx.lineWidth = 1; ctx.strokeRect(c.x + 0.5, c.y + 0.5, cs, cs);
  }
  let dustAcc = 0;
  function updateDesert(dt) {
    S.simAcc += dt * K.YPS;
    let guard = 0;
    while (S.simAcc >= K.SIM_DT && guard++ < 8) { S.simAcc -= K.SIM_DT; stepDesert(K.SIM_DT); }
    for (let i = 0; i < NC; i++) DS.vis[i] = approach(DS.vis[i], DS.v[i], dt, 6);
    stepSheep(dt);
    // 헐벗은 땅에서 흙먼지가 날려요
    if (!RM) {
      const dn = DS.v.filter((v) => v < K.V_DES).length; dustAcc += dt * dn * 0.25;
      while (dustAcc >= 1 && parts.count < 160) {
        dustAcc -= 1; let i = Math.floor(Math.random() * NC), tries = 0; while (DS.v[i] >= K.V_DES && tries++ < 20) i = Math.floor(Math.random() * NC);
        if (DS.v[i] < K.V_DES) { const c = cellXY(i); parts.emit({ x: c.x + rnd(0.2, 0.8) * L2.cs, y: c.y + rnd(0.3, 0.9) * L2.cs, vx: rnd(30, 60), vy: -rnd(4, 18), life: 2.2, size: 5, grow: 3, color: 'rgba(214,180,120,.7)', shape: 'smoke' }); }
      }
    }
  }
  function gaugeBar(x, y, w, h, frac, col, label, valStr, mark1) {
    D.text(x, y - 7, label, { size: 14, weight: 800, color: '#334155', align: 'left' });
    D.text(x + w, y - 7, valStr, { size: 15, weight: 800, color: '#0f172a', align: 'right' });
    ctx.fillStyle = '#e8edf3'; rr(x, y, w, h, h / 2).fill();
    const fw = clamp(frac, 0, 1) * w; if (fw > 0.5) { ctx.fillStyle = col; rr(x, y, Math.max(fw, h * 0.5), h, h / 2).fill(); }
    ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1.5; rr(x, y, w, h, h / 2).stroke();
    if (mark1 != null) { const mx = x + mark1.f * w; ctx.strokeStyle = '#2563eb'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(mx, y - 4); ctx.lineTo(mx, y + h + 4); ctx.stroke(); D.text(mx, y + h + 17, mark1.t, { size: 12.5, weight: 800, color: '#2563eb' }); }
  }
  function drawDesert(t) {
    // 하늘과 비
    const sg = ctx.createLinearGradient(0, 0, 0, L2.sky); sg.addColorStop(0, '#a5cdf2'); sg.addColorStop(1, '#e3f1fc'); ctx.fillStyle = sg; ctx.fillRect(0, 0, VW, L2.sky + 8);
    const rainK = clamp(DS.reff / 800, 0.05, 1), nCl = 1 + Math.round(rainK * 3);
    for (let i = 0; i < nCl; i++) { const cx = 80 + i * (PHONE ? 140 : 130) + (RM ? 0 : Math.sin(t * 0.3 + i) * 8), cy = 38 + (i % 2) * 14; cloud(cx, cy, 0.75, 0.55 + 0.4 * rainK); }
    ctx.strokeStyle = 'rgba(37,99,235,.55)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    for (let i = 0; i < nCl; i++) { const cx = 80 + i * (PHONE ? 140 : 130); for (let k = 0; k < Math.round(rainK * 10); k++) { const rx = cx - 36 + (k / 10) * 72, ph = RM ? 0.4 : (t * 1.1 + k * 0.31 + i * 0.2) % 1, ry = 52 + ph * (L2.sky - 56); ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx - 3, ry + 9); ctx.stroke(); } }
    D.label(PHONE ? 470 : 600, 26, '실제 비 ' + reffRound() + ' mm', { bg: '#2563eb', size: 14, pad: 9 });
    if (DS.reff < S.rain * 0.985) D.label(PHONE ? 470 : 600, 62, '식생↓ → 비↓ 되먹임', { bg: '#b45309', size: 13, pad: 8 });
    // 땅
    ctx.fillStyle = '#6b5a3a'; ctx.fillRect(L2.gx - 6, L2.gy - 6, K.COLS * L2.cs + 12, K.ROWS * L2.cs + 12);
    ctx.save(); ctx.beginPath(); ctx.rect(L2.gx, L2.gy, K.COLS * L2.cs, K.ROWS * L2.cs); ctx.clip();
    for (let i = 0; i < NC; i++) drawCell(i, t);
    // 나무
    for (let i = 0; i < NC; i++) if (DS.tree[i]) { const c = cellXY(i); ctx.fillStyle = '#7a5230'; ctx.fillRect(c.x + L2.cs / 2 - 2.5, c.y + L2.cs * 0.55, 5, L2.cs * 0.36); D.sphere(c.x + L2.cs / 2, c.y + L2.cs * 0.42, L2.cs * 0.3, '#1f8f4e', { gloss: true, shadow: true }); }
    sheep.forEach((s) => drawSheep(s, t));
    ctx.restore();
    // 흙먼지 방향 안내
    D.text(L2.gx + K.COLS * L2.cs - 6, L2.gy + K.ROWS * L2.cs + 22, '바람 →', { size: 13, weight: 800, color: '#7c6a45', align: 'right' });
    [['#4f9f4b', '풀밭'], ['#e5cb90', '헐벗은 땅(사막)'], ['#1f8f4e', '나무(방풍림)']].reduce((lx, [c, n]) => { ctx.fillStyle = c; rr(lx, L2.gy + K.ROWS * L2.cs + 11, 14, 14, 4).fill(); ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 1; rr(lx, L2.gy + K.ROWS * L2.cs + 11, 14, 14, 4).stroke(); D.text(lx + 20, L2.gy + K.ROWS * L2.cs + 23, n, { size: 13, weight: 800, color: '#475569', align: 'left' }); return lx + 34 + n.length * 13.5; }, L2.gx);
    // 게이지
    const G2 = L2.gaug;
    D.shadow(() => { ctx.fillStyle = 'rgba(255,255,255,.95)'; rr(G2.x, G2.y, G2.w, G2.h, 14).fill(); }, { blur: 6, y: 2 });
    if (PHONE) {
      const bw = 540, bx = G2.x + 16;
      gaugeBar(bx, G2.y + 40, bw, 20, DS.meanV, '#4f9f4b', '식생 피복률', vegPct() + ' %');
      gaugeBar(bx, G2.y + 98, bw, 20, DS.des, '#d97706', '사막 면적', desPct() + ' %', { f: K.DES_OK / 100, t: '목표 ≤ ' + K.DES_OK + ' %' });
      gaugeBar(bx, G2.y + 164, bw, 20, DS.meanS, '#8a6d3b', '토양 상태', soilPct() + ' %');
      gaugeBar(bx, G2.y + 222, bw, 20, DS.reff / 800, '#2563eb', '실제 강수량', reffRound() + ' mm/년', { f: S.rain / 800, t: '기본 ' + S.rain });
      D.text(G2.x + 16, G2.y + 280, '경과 시간 ' + Math.floor(S.yearT) + '년', { size: 15, weight: 800, color: '#334155', align: 'left' });
    } else {
      const bw = 188, bx = G2.x + 16;
      gaugeBar(bx, G2.y + 40, bw, 18, DS.meanV, '#4f9f4b', '식생 피복률', vegPct() + ' %');
      gaugeBar(bx, G2.y + 104, bw, 18, DS.des, '#d97706', '사막 면적', desPct() + ' %', { f: K.DES_OK / 100, t: '≤ ' + K.DES_OK + ' %' });
      gaugeBar(bx, G2.y + 178, bw, 18, DS.meanS, '#8a6d3b', '토양 상태', soilPct() + ' %');
      gaugeBar(bx, G2.y + 242, bw, 18, DS.reff / 800, '#2563eb', '실제 강수량', reffRound() + ' mm', { f: S.rain / 800, t: '기본 ' + S.rain });
      D.text(G2.x + 16, G2.y + 316, '경과 시간 ' + Math.floor(S.yearT) + '년', { size: 15, weight: 800, color: '#334155', align: 'left' });
      D.text(G2.x + 16, G2.y + 338, '가축 ' + S.live + '마리 · 나무 ' + nTrees() + '그루', { size: 14, weight: 800, color: '#475569', align: 'left' });
    }
  }
  function cellAt(p) {
    const x = Math.floor((p.x - L2.gx) / L2.cs), y = Math.floor((p.y - L2.gy) / L2.cs);
    return x >= 0 && y >= 0 && x < K.COLS && y < K.ROWS ? y * K.COLS + x : -1;
  }
  function toggleTree(i) {
    if (DS.tree[i]) { DS.tree[i] = false; Sound.tick(); }
    else if (nTrees() >= K.MAX_TREES) { Sound.fail(); say('나무는 최대 ' + K.MAX_TREES + '그루까지 심을 수 있어요. 다른 나무를 눌러 뽑아 보세요.', true); return; }
    else { DS.tree[i] = true; Sound.click(); const c = cellXY(i); parts.burst(c.x + L2.cs / 2, c.y + L2.cs / 2, { count: 8, speed: 80, size: 3, life: 0.6, colors: ['#16a34a', '#86efac', '#fff'] }); }
    $('#oTrees').textContent = nTrees() + ' / ' + K.MAX_TREES;
  }
  function sync2() { $('#oTrees').textContent = nTrees() + ' / ' + K.MAX_TREES; }

  /* =========================================================
     장면 3 : 영향 분석 (세계 지도 + 영향 분류)
     ========================================================= */
  const LAND = [
    [[-168, 66], [-140, 70], [-95, 72], [-80, 72], [-62, 60], [-56, 52], [-66, 44], [-76, 35], [-81, 25], [-90, 30], [-97, 26], [-97, 18], [-88, 16], [-83, 9], [-78, 8], [-86, 13], [-95, 16], [-105, 22], [-112, 30], [-110, 23], [-118, 33], [-124, 40], [-124, 48], [-135, 58], [-150, 60], [-165, 60]],
    [[-78, 8], [-72, 12], [-62, 10], [-52, 5], [-35, -6], [-38, -14], [-48, -26], [-58, -38], [-66, -46], [-70, -54], [-75, -48], [-73, -37], [-71, -18], [-77, -12], [-81, -5], [-80, 0]],
    [[-10, 36], [-9, 43], [-1, 46], [-5, 48], [5, 53], [10, 57], [20, 60], [28, 70], [45, 68], [70, 73], [100, 77], [140, 72], [170, 70], [180, 68], [180, 62], [160, 58], [142, 52], [135, 45], [128, 38], [122, 40], [121, 31], [119, 23], [108, 21], [106, 10], [100, 13], [103, 2], [98, 8], [92, 22], [80, 15], [77, 8], [72, 20], [67, 25], [57, 25], [51, 25], [56, 17], [44, 12], [35, 28], [34, 31], [27, 36], [36, 36], [26, 40], [23, 37], [18, 40], [12, 44], [8, 44], [3, 43], [-5, 36]],
    [[-17, 21], [-10, 30], [-5, 36], [10, 37], [20, 31], [32, 31], [35, 28], [43, 12], [51, 12], [40, -3], [40, -15], [33, -26], [20, -35], [14, -22], [12, -6], [9, 3], [-8, 5], [-17, 14]],
    [[114, -22], [122, -17], [131, -12], [137, -12], [142, -11], [147, -19], [153, -26], [150, -37], [141, -38], [131, -31], [115, -34]],
    [[-55, 60], [-45, 60], [-20, 70], [-20, 82], [-60, 82], [-72, 78]],
    [[95, 5], [100, 1], [106, -6], [103, -5], [98, 1]], [[109, 1], [118, 7], [119, 0], [114, -3], [110, -2]], [[106, -6], [114, -8], [114, -7.5], [107, -6.2]], [[131, -1], [141, -3], [150, -10], [141, -9], [134, -4]],
    [[130, 31], [141, 41], [142, 45], [135, 35]],
  ];
  const MARK = [
    { id: 'peru', lon: -77, lat: -8, cat: 'el', name: '페루·에콰도르 연안', text: '엘니뇨 때 동태평양 바다가 따뜻해지면 비구름이 이쪽으로 와서 <b>폭우와 홍수</b>가 잦아져요. 용승이 약해져 멸치 어장도 무너져요.' },
    { id: 'indo', lon: 118, lat: -4, cat: 'el', name: '인도네시아·호주 북부', text: '엘니뇨 때 따뜻한 바다와 비구름이 동쪽으로 옮겨 가요. 이쪽은 비가 줄어 <b>가뭄과 산불</b>이 늘어요.' },
    { id: 'korea', lon: 127, lat: 36.5, cat: 'both', name: '우리나라', text: '엘니뇨가 일어난 해에는 <b>여름 강수가 늘고 겨울 기온이 높아지는</b> 경향이 있어요(항상 같지는 않아요). 사막화 지역의 흙먼지는 <b>황사</b>로 날아와요.' },
    { id: 'sahel', lon: 5, lat: 15, cat: 'des', name: '사헬 지대(아프리카)', text: '가뭄과 과도한 방목·경작으로 식생이 줄며 사막이 넓어져요. 식량 생산이 줄어 <b>환경 난민</b>이 생겨요.' },
    { id: 'aral', lon: 60, lat: 45, cat: 'des', name: '아랄해(중앙아시아)', text: '농업용 관개로 물을 너무 많이 끌어 써서 호수가 크게 줄고, 소금기가 쌓인 땅이 <b>사막화</b>되었어요.' },
    { id: 'gobi', lon: 105, lat: 43, cat: 'des', name: '몽골·중국 북부', text: '사막화로 드러난 흙먼지가 바람을 타고 날아가 <b>황사</b>가 되고, 우리나라까지 와요.' },
    { id: 'maldv', lon: 73, lat: 3, cat: 'sea', name: '몰디브 같은 저지대 섬나라', text: '해수의 열팽창과 육지 얼음 융해로 <b>해수면이 상승</b>해 해안 침수 위험이 커져요. 1901~2018년에 약 ' + K.SEA_HIST + ' cm 올랐어요.' },
    { id: 'reef', lon: 150, lat: -17, cat: 'sea', name: '대보초(호주)', text: '바닷물 온도가 높아지면 산호가 공생하는 조류를 잃고 하얗게 변해요. 이것이 <b>산호 백화</b>예요. 엘니뇨가 오면 더 심해져요.' },
  ];
  const MCOL = { el: '#2563eb', des: '#d97706', sea: '#0d9488', both: '#7c3aed' };
  const MCAT = { el: '엘니뇨 영향', des: '사막화 영향', sea: '해수면·바다 영향', both: '엘니뇨와 사막화 영향' };
  const MP = PHONE ? { x: 10, y: 78, w: 580 } : { x: 20, y: 60, w: 760 };
  MP.h = MP.w * 136 / 360;
  const mproj = (lon, lat) => ({ x: MP.x + (lon + 180) / 360 * MP.w, y: MP.y + (78 - lat) / 136 * MP.h });
  function drawMap(t) {
    D.shadow(() => { ctx.fillStyle = '#cfe8fa'; rr(MP.x - 6, MP.y - 6, MP.w + 12, MP.h + 12, 14).fill(); }, { blur: 6, y: 2 });
    ctx.save(); rr(MP.x, MP.y, MP.w, MP.h, 10).clip();
    ctx.fillStyle = '#d6ecfb'; ctx.fillRect(MP.x, MP.y, MP.w, MP.h);
    ctx.strokeStyle = 'rgba(100,130,170,.25)'; ctx.lineWidth = 1;
    for (let lo = -120; lo <= 120; lo += 60) { const a = mproj(lo, 78), b = mproj(lo, -58); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
    for (let la = -30; la <= 60; la += 30) { const a = mproj(-180, la), b = mproj(180, la); ctx.setLineDash(la === 0 ? [6, 5] : []); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); ctx.setLineDash([]); }
    ctx.fillStyle = '#d3dfb4'; ctx.strokeStyle = '#8fa56f'; ctx.lineWidth = 1.5; ctx.lineJoin = 'round';
    LAND.forEach((poly) => { ctx.beginPath(); poly.forEach(([lo, la], i) => { const p = mproj(lo, la); i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); }); ctx.closePath(); ctx.fill(); ctx.stroke(); });
    // 적도 · 태평양 이름
    const eq = mproj(-178, 0); D.text(eq.x + 4, eq.y - 4, '적도', { size: 12.5, weight: 800, color: '#64748b', align: 'left' });
    const pc = mproj(-150, -22); D.text(pc.x, pc.y, '태평양', { size: 14, weight: 800, color: '#6b8fb5' });
    const ic = mproj(-30, -30); D.text(ic.x, ic.y, '대서양', { size: 14, weight: 800, color: '#6b8fb5' });
    ctx.restore();
    // 마커
    MARK.forEach((m, i) => {
      const p = mproj(m.lon, m.lat), vis = S.visited.has(i), sel = S.sel === i, r = (PHONE ? 11 : 10) * (sel ? 1.25 : 1);
      if (!vis) D.ring(p.x, p.y, r + 2, t + i * 0.3, { color: MCOL[m.cat], speed: 0.9, width: 2 });
      D.shadow(() => { ctx.fillStyle = MCOL[m.cat]; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU); ctx.fill(); }, { blur: 5, y: 2 });
      ctx.strokeStyle = sel ? '#facc15' : '#fff'; ctx.lineWidth = sel ? 3.5 : 2.5; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU); ctx.stroke();
      if (vis) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(p.x - 4, p.y); ctx.lineTo(p.x - 1, p.y + 3); ctx.lineTo(p.x + 4.5, p.y - 3); ctx.stroke(); }
    });
    // 안내 카드
    const cy0 = MP.y + MP.h + 16, ch = PHONE ? 250 : 552 - cy0, cw = MP.w;
    D.shadow(() => { ctx.fillStyle = 'rgba(255,255,255,.96)'; rr(MP.x, cy0, cw, ch, 14).fill(); }, { blur: 6, y: 2 });
    if (S.sel >= 0) {
      const m = MARK[S.sel];
      D.label(MP.x + 14, cy0 + 26, MCAT[m.cat], { bg: MCOL[m.cat], size: 14, pad: 8, align: 'left' });
      D.text(MP.x + 14, cy0 + 62, m.name, { size: PHONE ? 20 : 18, weight: 800, color: '#0f172a', align: 'left' });
      const plain = m.text.replace(/<[^>]+>/g, ''), fs = PHONE ? 16.5 : 15, lines = wrapLines(plain, cw - 28, fs, 700), lh = (fs + 7) * FS * 0.95;
      // 굵은 글씨 구간 표시: 간단히 문장 전체를 그리고 핵심어에 형광펜
      lines.forEach((l, i) => D.text(MP.x + 14, cy0 + 92 + i * lh, l, { size: fs, weight: 700, color: '#334155', align: 'left' }));
    } else {
      D.text(MP.x + cw / 2, cy0 + ch / 2 - 6, '지도의 점을 눌러 보세요', { size: 18, weight: 800, color: '#475569' });
      D.text(MP.x + cw / 2, cy0 + ch / 2 + 22, S.visited.size + ' / ' + MARK.length + '곳 확인했어요', { size: 15, weight: 700, color: '#64748b' });
    }
    // 범례
    const ly = cy0 + ch + (PHONE ? 22 : -2);
    if (PHONE) { let lx = 16; [['el', '엘니뇨'], ['des', '사막화'], ['sea', '해수면·바다'], ['both', '둘 다']].forEach(([k, n]) => { ctx.fillStyle = MCOL[k]; ctx.beginPath(); ctx.arc(lx, ly, 7, 0, TAU); ctx.fill(); D.text(lx + 12, ly + 5, n, { size: 13.5, weight: 800, color: '#334155', align: 'left' }); lx += 30 + n.length * 15; }); }
  }
  function markerAt(p) {
    let best = -1, bd = (PHONE ? 30 : 22);
    MARK.forEach((m, i) => { const q = mproj(m.lon, m.lat), d = Math.hypot(p.x - q.x, p.y - q.y); if (d < bd) { bd = d; best = i; } });
    return best;
  }

  /* ---------- 영향 분류 / 완화·적응 분류 보드 ---------- */
  const IMP_CARDS = [
    { label: '해수면 상승', t: 'env' }, { label: '사막 면적 확대', t: 'env' }, { label: '동태평양 수온 상승', t: 'env' },
    { label: '산호 백화', t: 'eco' }, { label: '산불로 숲 서식지 파괴', t: 'eco' }, { label: '멸치 떼 감소', t: 'eco' },
    { label: '곡물 가격 상승', t: 'hum' }, { label: '어획량 감소로 어민 소득 감소', t: 'hum' }, { label: '황사로 인한 호흡기 질환', t: 'hum' },
  ];
  const IMP_Z = { env: '지구 환경', eco: '생태계', hum: '인간 생활' };
  const IMP_DESC = { env: '바다·대기·땅의 변화', eco: '생물과 서식지의 변화', hum: '식량·건강·경제·삶터' };
  const MIT_CARDS = [
    { label: '재생 에너지 발전 확대', t: 'mit' }, { label: '건물 단열로 에너지 효율 높이기', t: 'mit' }, { label: '숲 보전과 나무 심기', t: 'mit' },
    { label: '해안 제방 높이기', t: 'ada' }, { label: '가뭄에 강한 작물 개발', t: 'ada' }, { label: '폭염·태풍 조기 경보 시스템', t: 'ada' },
  ];
  const MIT_Z = { mit: '완화', ada: '적응' };
  const MIT_DESC = { mit: '온실 기체 배출을 줄이거나 흡수를 늘려요', ada: '달라진 환경에 맞춰 피해를 줄여요' };
  const ZCOL = { env: '#0369a1', eco: '#15803d', hum: '#c2410c', mit: '#15803d', ada: '#b45309' };
  function mkBoard(cards, zoneIds, zdesc, zlab, wide) {
    const zc = zoneIds.length;
    const cw = PHONE ? (zc === 3 ? 172 : 176) : (zc === 3 ? 144 : 170), ch = PHONE ? 48 : 42;
    const zs = zoneIds.map((id, i) => {
      let x, y, w, h;
      if (PHONE) { y = 74; if (zc === 3) { w = 190; x = 8 + i * 195; h = 400; } else { w = 288; x = 8 + i * 296; h = 330; } }
      else { y = 62; if (zc === 3) { w = 244; x = 20 + i * 258; h = 292; } else { w = 372; x = 20 + i * 388; h = 240; } }
      return { id, x, y, w, h, color: ZCOL[id], fill: 'rgba(255,255,255,.8)', line: ZCOL[id], head: 50, label: zlab[id], lsize: 16, draw: (z) => D.text(z.x + 12, z.y + 40, zdesc[id], { size: 12.5, weight: 700, color: '#64748b', align: 'left' }) };
    });
    const ty = PHONE ? 74 + (zc === 3 ? 400 : 330) + 16 : 62 + (zc === 3 ? 292 : 240) + 16;
    const b = new Board({ zones: zs, tray: { x: PHONE ? 8 : 20, y: ty + 4, w: PHONE ? 584 : 760, cols: PHONE ? 3 : (zc === 3 ? 5 : 4) }, cw, ch, gap: 8, onDrop: () => true, onPlace: () => { clearBadB(b); } });
    cards.forEach((c, i) => b.add(Object.assign({ id: 'c' + i, fill: '#fff', border: '#cfd8e6' }, c)));
    b.layout(true); b.ty0 = ty;
    return b;
  }
  const clearBadB = (b) => b.cards.forEach((c) => { c.flagged = false; c.border = '#cfd8e6'; });
  const impBoard = mkBoard(IMP_CARDS, ['env', 'eco', 'hum'], IMP_DESC, IMP_Z);
  const mitBoard = mkBoard(MIT_CARDS, ['mit', 'ada'], MIT_DESC, MIT_Z);
  function checkBoard(b, names, label) {
    const un = b.cards.filter((c) => !c.zone);
    if (un.length) return '아직 놓지 않은 카드가 <b>' + un.length + '장</b> 있어요.';
    const wrong = b.cards.filter((c) => c.zone !== c.t);
    wrong.forEach((c) => { if (!c.flagged) { c.flagged = true; c.border = '#e2464b'; c.shake = 0.45; } });
    if (wrong.length) return '<b>' + wrong.length + '장</b>이 알맞지 않은 영역에 있어요(빨간 테두리). 예: "' + wrong[0].label + '"' + josa(wrong[0].label, '은/는') + ' <b>' + names[wrong[0].t] + '</b>에 가까워요.';
    return true;
  }
  const doneBoard = (b) => b.cards.every((c) => c.zone === c.t);

  /* =========================================================
     장면 4 : 미래 시나리오 (선택 → 2100년 지표) + 완화·적응
     ========================================================= */
  const POL = ['크게 줄이기', '현재 수준', '계속 늘리기'], ENR = ['빠르게', '보통', '느리게'], FOR = ['보전·복원', '현재대로', '더 줄어듦'];
  function scen(pol, en, fo) {
    const T = n1(K.BASE[pol] + K.ADJ_E[en] + K.ADJ_F[fo]);
    return { pol, en, fo, T, slr: Math.round((K.SLR0 + K.SLR_K * T) * 100) / 100, des: Math.round(100 + 15 * (T - 1.1)), coral: Math.round(100 * Math.exp(-0.6 * T)), food: Math.round(100 - 3.5 * Math.pow(T, 1.5)) };
  }
  const curScen = () => scen(S.pol, S.en, S.fo);
  const IND = [
    { k: 'T', name: '기온 상승', max: 5, f: (v) => sg1(v) + ' °C', col: '#dc2626' },
    { k: 'slr', name: '해수면 상승', max: 1, f: (v) => '+' + v.toFixed(2) + ' m', col: '#0284c7' },
    { k: 'des', name: '사막화 위험 지수', max: 200, f: (v) => String(Math.round(v)), col: '#d97706', base: 100 },
    { k: 'coral', name: '산호초 지수', max: 100, f: (v) => String(Math.round(v)), col: '#db2777' },
    { k: 'food', name: '식량 생산 지수', max: 100, f: (v) => String(Math.round(v)), col: '#ca8a04' },
  ];
  const barV = { T: 0, slr: 0, des: 100, coral: 100, food: 100 };
  const L4 = PHONE ? { y0: 70, rh: 128, ix: 14, iw: 150, bx: 180, bw: 396, foot: 716 } : { y0: 54, rh: 82, ix: 16, iw: 128, bx: 164, bw: 590, foot: 468 };
  function drawIcon(k, x, y, w, h, v, t) {
    ctx.save(); rr(x, y, w, h, 10).clip();
    if (k === 'T') {
      const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, '#fde68a'); g.addColorStop(1, '#fecaca'); ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
      D.thermometer(x + w * 0.3, y + 8, h - 38, clamp(v, 0, 5), 0, 5, { ticks: false });
      D.sphere(x + w * 0.72, y + h * 0.38, 10 + v * 2, '#f59e0b', { light: '#fff7ae' });
    } else if (k === 'slr') {
      ctx.fillStyle = '#d7ecfb'; ctx.fillRect(x, y, w, h);
      const lvl = y + h * (0.66 - 0.42 * clamp(v, 0, 1));
      ctx.fillStyle = '#c9a66b'; ctx.fillRect(x, y + h * 0.72, w * 0.55, h * 0.3);
      ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.moveTo(x + 10, y + h * 0.5); ctx.lineTo(x + 28, y + h * 0.3); ctx.lineTo(x + 46, y + h * 0.5); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#fef3c7'; ctx.fillRect(x + 14, y + h * 0.5, 28, h * 0.22);
      ctx.fillStyle = 'rgba(14,116,184,.82)'; ctx.fillRect(x + 8, lvl, w, y + h - lvl);
      ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2; ctx.beginPath(); for (let xx = x + 8; xx <= x + w; xx += 4) { const yy = lvl + 1.5 * Math.sin(xx / 7 + (RM ? 0 : t * 2)); xx === x + 8 ? ctx.moveTo(xx, yy) : ctx.lineTo(xx, yy); } ctx.stroke();
    } else if (k === 'des') {
      const f = clamp((v - 100) / 80, 0, 1) * 0.9;
      ctx.fillStyle = '#e8f3fb'; ctx.fillRect(x, y, w, h * 0.55);
      ctx.fillStyle = '#5fae5a'; ctx.fillRect(x, y + h * 0.55, w, h * 0.45);
      ctx.fillStyle = '#e5cb90'; ctx.fillRect(x + w * (1 - f), y + h * 0.55, w * f, h * 0.45);
      ctx.fillStyle = '#7a5230'; ctx.fillRect(x + 14, y + h * 0.42, 4, h * 0.2); D.sphere(x + 16, y + h * 0.38, 11, '#2f9e57', { gloss: true });
      ctx.fillStyle = '#4d8f3b'; ctx.fillRect(x + w - 20, y + h * 0.38, 5, h * 0.3);
    } else if (k === 'coral') {
      ctx.fillStyle = '#7fd0ee'; ctx.fillRect(x, y, w, h); ctx.fillStyle = '#e8d6a0'; ctx.fillRect(x, y + h * 0.82, w, h * 0.2);
      const hl = clamp(v / 100, 0, 1), cols = ['#f472b6', '#fb923c', '#a78bfa', '#f43f5e', '#facc15'];
      for (let i = 0; i < 5; i++) { const cx = x + 18 + i * (w - 36) / 4, hh = 22 + (i % 3) * 10; ctx.strokeStyle = SciSim.color.mix(cols[i], '#f1f5f9', 1 - hl); ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(cx, y + h * 0.85); ctx.lineTo(cx, y + h * 0.85 - hh); ctx.stroke(); ctx.beginPath(); ctx.moveTo(cx, y + h * 0.85 - hh * 0.55); ctx.lineTo(cx + 7, y + h * 0.85 - hh * 0.9); ctx.stroke(); }
    } else {
      ctx.fillStyle = '#fdf1c8'; ctx.fillRect(x, y, w, h); ctx.fillStyle = '#b98d5a'; ctx.fillRect(x, y + h * 0.82, w, h * 0.2);
      const hl = clamp(v / 100, 0.05, 1);
      for (let i = 0; i < 6; i++) { const cx = x + 14 + i * (w - 28) / 5, hh = (h * 0.62) * hl; ctx.strokeStyle = '#a16207'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx, y + h * 0.84); ctx.lineTo(cx, y + h * 0.84 - hh); ctx.stroke(); ctx.fillStyle = '#eab308'; ctx.beginPath(); ctx.ellipse(cx, y + h * 0.84 - hh - 5, 4.5, 8, 0, 0, TAU); ctx.fill(); }
    }
    ctx.restore(); ctx.strokeStyle = 'rgba(15,23,42,.18)'; ctx.lineWidth = 1.5; rr(x, y, w, h, 10).stroke();
  }
  const scnText = (s) => {
    const a = s.slr < 0.45 ? '해안 저지대 일부가 침수 위험에 놓여요' : s.slr < 0.7 ? '해안 도시 곳곳이 침수 위험에 놓여요' : '많은 해안 도시와 섬이 물에 잠길 위험이 커요';
    const b = s.coral >= 30 ? '산호초가 일부 남아요' : '산호초 대부분이 사라져요';
    const c = s.food >= 90 ? '식량 생산은 크게 줄지 않아요' : s.food >= 80 ? '식량 생산이 눈에 띄게 줄어요' : '식량 생산이 크게 줄어 가격이 오르기 쉬워요';
    return a + '. ' + b + '. ' + c + '.';
  };
  function drawFuture(t) {
    const s = curScen();
    D.text(L4.ix, L4.y0 - 22, '2100년의 지구 (전지구 평균)', { size: 17, weight: 800, color: '#0f172a', align: 'left' });
    D.label(VW - 12, L4.y0 - 26, POL[S.pol] + ' · ' + ENR[S.en] + ' · ' + FOR[S.fo], { bg: '#475569', size: 12.5, pad: 8, align: 'right' });
    IND.forEach((ind, i) => {
      const y = L4.y0 + i * L4.rh, v = barV[ind.k], iy = y + 4, ih = L4.rh - 12;
      D.shadow(() => { ctx.fillStyle = 'rgba(255,255,255,.95)'; rr(8, y, VW - 16, L4.rh - 6, 12).fill(); }, { blur: 4, y: 1 });
      drawIcon(ind.k, L4.ix + 4, iy + 2, L4.iw - 8, ih - 6, v, t);
      const bx = L4.bx, bw = L4.bw, by = PHONE ? y + 66 : y + 38, bh = PHONE ? 26 : 22;
      D.text(bx, PHONE ? y + 34 : y + 28, ind.name, { size: 15, weight: 800, color: '#334155', align: 'left' });
      D.text(bx + bw, PHONE ? y + 34 : y + 28, ind.f(s[ind.k]), { size: 18, weight: 800, color: '#0f172a', align: 'right' });
      ctx.fillStyle = '#e8edf3'; rr(bx, by, bw, bh, bh / 2).fill();
      const fw = clamp(v / ind.max, 0, 1) * bw; if (fw > 0.5) { ctx.fillStyle = ind.col; rr(bx, by, Math.max(fw, bh * 0.5), bh, bh / 2).fill(); }
      ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1.5; rr(bx, by, bw, bh, bh / 2).stroke();
      if (ind.base != null) { const gx = bx + ind.base / ind.max * bw; ctx.strokeStyle = '#334155'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(gx, by - 3); ctx.lineTo(gx, by + bh + 3); ctx.stroke(); D.text(gx, by - 6, '지금 ' + ind.base, { size: 12.5, weight: 800, color: '#334155' }); }
      // 저장한 시나리오 표시 (1: 파랑, 2: 주황)
      S.saved.forEach((sv, j) => { if (!sv) return; const gx = bx + clamp(sv[ind.k] / ind.max, 0, 1) * bw, col = j === 0 ? '#2563eb' : '#f97316'; ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(gx, by + bh + 1); ctx.lineTo(gx - 9, by + bh + 17); ctx.lineTo(gx + 9, by + bh + 17); ctx.closePath(); ctx.fill(); D.text(gx, by + bh + 15, String(j + 1), { size: 12, weight: 800, color: '#fff' }); });
    });
    // 이야기
    const fy = L4.foot;
    D.shadow(() => { ctx.fillStyle = '#fff7ed'; rr(8, fy, VW - 16, PHONE ? 112 : 76, 12).fill(); }, { blur: 4, y: 1 });
    const lines = wrapLines('2100년 이야기: ' + scnText(s), VW - 44, 14.5, 700);
    lines.forEach((l, i) => D.text(22, fy + 26 + i * 22 * FS * 0.95, l, { size: 14.5, weight: 700, color: '#7c2d12', align: 'left' }));
  }
  function stepFuture(dt) {
    const s = curScen();
    IND.forEach((ind) => { barV[ind.k] = approach(barV[ind.k], s[ind.k], dt, 7); });
  }

  /* =========================================================
     조작 · 화면 전환
     ========================================================= */
  const MODE_LV = { enso: 0, desert: 1, impact: 2, future: 3 };
  let game = null;
  const modeSeg = $('#modeSeg');
  const sWind = $('#sWind'), oWind = $('#oWind'), sRain = $('#sRain'), oRain = $('#oRain'), sLive = $('#sLive'), oLive = $('#oLive');
  const fmtWind = (v) => windName(+v) + ' (' + v + ')';
  SciSim.bindRange(sWind, oWind, fmtWind, (v) => { S.w = v; updateCtl(); });
  SciSim.bindRange(sRain, oRain, (v) => v + ' mm/년', (v) => { S.rain = v; });
  SciSim.bindRange(sLive, oLive, (v) => v + '마리', (v) => { S.live = v; });
  function setSlider(input, out, v, fmt) { input.value = v; input.style.setProperty('--pct', ((v - input.min) / (input.max - input.min)) * 100 + '%'); out.textContent = fmt(v); }
  const syncSliders = () => { setSlider(sWind, oWind, S.w, fmtWind); setSlider(sRain, oRain, S.rain, (v) => v + ' mm/년'); setSlider(sLive, oLive, S.live, (v) => v + '마리'); };
  const MODE_LABEL = { enso: '🌊 엘니뇨 모형', desert: '🏜️ 사막화 모형', impact: '🗺️ 영향 분석', future: '🔮 미래 시나리오' };
  const slotsFilled = () => S.saved.filter(Boolean);

  function updateCtl() {
    $('#tbLabel').textContent = MODE_LABEL[S.mode] + (S.mode === 'impact' ? (S.subImp === 'sort' ? ' · 분류' : ' · 지도') : S.mode === 'future' ? { scen: '', sort2: ' · 완화와 적응', pledge: ' · 내가 할 일' }[S.subFut] : '');
    $$('#ctrlCard > .control').forEach((c) => { c.hidden = c.dataset.modes !== S.mode; });
    $$('#ctrlCard [data-sub]').forEach((e) => {
      const mode = e.closest('.control').dataset.modes, cur = mode === 'impact' ? S.subImp : S.subFut;
      e.hidden = e.dataset.sub !== cur || (e.id === 'evBox' && slotsFilled().length < 2);
    });
    $$('#impSub .opt').forEach((b) => b.classList.toggle('on', b.dataset.go === S.subImp));
    $$('#futSub .opt').forEach((b) => b.classList.toggle('on', b.dataset.go === S.subFut));
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    $$('#windPre .opt').forEach((b) => b.classList.toggle('on', +b.dataset.w === S.w));
    $$('#gPol .opt').forEach((b) => b.classList.toggle('on', +b.dataset.i === S.pol));
    $$('#gEn .opt').forEach((b) => b.classList.toggle('on', +b.dataset.i === S.en));
    $$('#gFo .opt').forEach((b) => b.classList.toggle('on', +b.dataset.i === S.fo));
    $('#bSave').textContent = '📌 시나리오 ' + (S.nextSlot + 1) + '로 저장';
    $$('#evWho .opt').forEach((b) => b.classList.toggle('on', +b.dataset.i === S.who));
    $$('#evList .opt').forEach((b, i) => b.classList.toggle('on', i === S.why));
    if (modeSeg) modeSeg.hidden = !(game && game.free);
  }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); enterLevel(MODE_LV[b.dataset.mode]); }));
  $$('#windPre .opt').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.w = +b.dataset.w; syncSliders(); updateCtl(); }));
  $$('#impSub .opt').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.subImp = b.dataset.go; S.fade = 1; updateCtl(); }));
  $$('#futSub .opt').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.subFut = b.dataset.go; S.fade = 1; updateCtl(); }));
  $('#bDesReset').addEventListener('click', () => { Sound.click(); desReset(); syncSliders(); parts.clear(); });
  $('#bImpReset').addEventListener('click', () => { Sound.click(); impBoard.reset(); clearBadB(impBoard); });
  $('#bMitReset').addEventListener('click', () => { Sound.click(); mitBoard.reset(); clearBadB(mitBoard); });
  [['gPol', 'pol'], ['gEn', 'en'], ['gFo', 'fo']].forEach(([id, key]) => $$('#' + id + ' .opt').forEach((b) => b.addEventListener('click', () => { Sound.click(); S[key] = +b.dataset.i; updateCtl(); })));
  $('#bSave').addEventListener('click', () => {
    Sound.success(); S.saved[S.nextSlot] = curScen(); S.nextSlot = 1 - S.nextSlot; S.who = -1; S.why = -1; buildEv(); updateCtl();
    say('시나리오 ' + (2 - S.nextSlot) + '번에 저장했어요: ' + sg1(S.saved[1 - S.nextSlot].T) + ' °C', false, 2);
  });
  $('#bSaveClear').addEventListener('click', () => { Sound.click(); S.saved = [null, null]; S.nextSlot = 0; S.who = -1; S.why = -1; buildEv(); updateCtl(); });
  $$('#evWho .opt').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.who = +b.dataset.i; updateCtl(); }));
  /* 두 시나리오 비교: 근거 문장 (숫자는 저장한 시나리오에서 가져와요) */
  function betterIdx() { const a = S.saved[0], b = S.saved[1]; return a && b ? (a.T <= b.T ? 0 : 1) : -1; }
  function buildEv() {
    const el = $('#evList'); el.innerHTML = ''; S.evOrder = [];
    const a = S.saved[0], b = S.saved[1]; if (!a || !b) return;
    const bi = betterIdx(), wi = 1 - bi, B = S.saved[bi], W = S.saved[wi];
    const st = (x, y, i, j) => '시나리오 ' + (i + 1) + '의 기온 상승(' + sg1(x.T) + ' °C)과 해수면 상승(+' + x.slr.toFixed(2) + ' m)이 시나리오 ' + (j + 1) + '(' + sg1(y.T) + ' °C, +' + y.slr.toFixed(2) + ' m)보다 작아요';
    const all = [{ t: st(B, W, bi, wi), ok: true }, { t: st(W, B, wi, bi), ok: false }, { t: '두 시나리오의 2100년 결과는 거의 같아요', ok: false }];
    const k = (Math.round(a.T * 10) + Math.round(b.T * 10)) % 3;
    S.evOrder = all.map((_, i) => all[(i + k) % 3]);
    S.evOrder.forEach((e, i) => { const bt = document.createElement('button'); bt.type = 'button'; bt.className = 'opt'; bt.textContent = e.t; bt.addEventListener('click', () => { Sound.click(); S.why = i; $$('#evList .opt').forEach((x) => x.classList.remove('bad')); updateCtl(); }); el.appendChild(bt); });
  }
  /* 실천 카드 */
  const PLEDGES = [
    { t: '우리 가족: 안 쓰는 전기 끄고 여름철 실내 온도 지키기', ok: true },
    { t: '우리 학교: 재생 에너지와 고효율 조명을 쓰자고 제안하기', ok: true },
    { t: '가까운 거리는 걷거나 자전거·대중교통으로 이동하기', ok: true },
    { t: '음식물 쓰레기를 줄이고 분리배출하기', ok: true },
    { t: '기후변화는 막을 수 없으니 아무것도 하지 않기', ok: false },
    { t: '냉방 중에도 문을 활짝 열어 두기', ok: false },
  ];
  PLEDGES.forEach((a, i) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'opt'; b.textContent = a.t;
    b.addEventListener('click', () => { Sound.click(); if (S.pledge.has(i)) S.pledge.delete(i); else S.pledge.add(i); b.classList.toggle('on', S.pledge.has(i)); b.classList.remove('bad'); });
    $('#pledgeList').appendChild(b);
  });
  const resetPledge = () => { S.pledge.clear(); $$('#pledgeList .opt').forEach((b) => b.classList.remove('on', 'bad')); };

  function setMode(m) { if (S.mode !== m) { S.fade = 1; parts.clear(); } S.mode = m; updateCtl(); }

  /* ---------- 포인터 ---------- */
  const activeBoard = () => (S.mode === 'impact' && S.subImp === 'sort' ? impBoard : S.mode === 'future' && S.subFut === 'sort2' ? mitBoard : null);
  SciSim.pointer(view, {
    down(p) {
      if (S.mode === 'desert') { const i = cellAt(p); if (i >= 0) toggleTree(i); return false; }
      if (S.mode === 'impact' && S.subImp === 'map') {
        const i = markerAt(p);
        if (i >= 0) { S.sel = i; if (!S.visited.has(i)) { S.visited.add(i); const q = mproj(MARK[i].lon, MARK[i].lat); parts.burst(q.x, q.y, { count: 8, speed: 80, size: 3, life: 0.6, colors: [MCOL[MARK[i].cat], '#fff'] }); } Sound.tick(); }
        return false;
      }
      const b = activeBoard(); return b ? b.down(p) : false;
    },
    move(p) { const b = activeBoard(); if (b) b.move(p); },
    up(p) { const b = activeBoard(); if (b) b.up(p); },
    hover(p) {
      if (S.mode === 'desert') return cellAt(p) >= 0 ? 'pointer' : 'default';
      if (S.mode === 'impact' && S.subImp === 'map') return markerAt(p) >= 0 ? 'pointer' : 'default';
      const b = activeBoard(); return b && b.hit(p) ? 'grab' : 'default';
    },
  });

  /* ---------- 읽음 칸 ---------- */
  function readouts() {
    if (S.mode === 'enso') {
      const a = aOf(S.w);
      setReadouts(['무역풍 세기', windName(S.w) + ' (' + S.w + ')', '동태평양 수온 편차', sg1(a) + ' °C · ' + CAT[catOf(a)], '멸치 어획 지수 (평상시 100)', String(fishIdx(a))]);
    } else if (S.mode === 'desert') {
      setReadouts(['식생 피복률', vegPct() + ' %', '사막 면적', desPct() + ' %', '실제 강수량', reffRound() + ' mm/년']);
    } else if (S.mode === 'impact') {
      if (S.subImp === 'map') setReadouts(['확인한 지점', S.visited.size + ' / ' + MARK.length, '지금 보는 곳', S.sel >= 0 ? MARK[S.sel].name : '—', '영향 종류', S.sel >= 0 ? MCAT[MARK[S.sel].cat] : '—']);
      else setReadouts(['놓은 카드', impBoard.cards.filter((c) => c.zone).length + ' / ' + impBoard.cards.length, '맞게 놓은 카드', impBoard.cards.filter((c) => c.zone && c.zone === c.t).length + '장', '영역', '지구 환경 · 생태계 · 인간 생활']);
    } else {
      const s = curScen();
      if (S.subFut === 'scen') setReadouts(['2100년 기온 상승', sg1(s.T) + ' °C', '해수면 상승', '+' + s.slr.toFixed(2) + ' m', '저장한 시나리오', slotsFilled().length + ' / 2']);
      else if (S.subFut === 'sort2') setReadouts(['놓은 카드', mitBoard.cards.filter((c) => c.zone).length + ' / ' + mitBoard.cards.length, '맞게 놓은 카드', mitBoard.cards.filter((c) => c.zone && c.zone === c.t).length + '장', '영역', '완화 · 적응']);
      else setReadouts(['고른 실천', S.pledge.size + ' / 3', '배출을 줄이는 실천', [...S.pledge].filter((i) => PLEDGES[i].ok).length + '개', '도움이 안 되는 실천', [...S.pledge].filter((i) => !PLEDGES[i].ok).length + '개']);
    }
  }

  /* =========================================================
     단계 · 미션
     ========================================================= */
  function enterLevel(li) {
    clearTimeout(hintTimer);
    if (li === 0) { setMode('enso'); S.w = 50; S.wS = 50; S.aS = 0; pS.value = pS.target = 0; S.seen = { no: false, el: false, la: false }; S.dwell = { no: 0, el: 0, la: 0 }; syncSliders(); showHint('무역풍 세기 슬라이더를 움직여 봐요', 5000); }
    else if (li === 1) { setMode('desert'); desReset(); initSheep(); syncSliders(); parts.clear(); showHint('강수량과 가축 수를 바꾸고, 풀밭 칸을 눌러 나무를 심어 봐요', 6000); }
    else if (li === 2) { setMode('impact'); S.subImp = 'map'; S.sel = -1; showHint('지도의 점을 눌러 영향을 읽어 봐요', 5000); }
    else { setMode('future'); S.subFut = 'scen'; S.pol = 1; S.en = 1; S.fo = 1; showHint('카드를 골라 2100년의 모습을 만들어 봐요', 5000); }
    updateCtl();
  }
  const qA = (arr) => arr.join(' · ');

  const levels = [
    {
      title: '엘니뇨: 바다와 바람의 변화', short: '엘니뇨', icon: '🌊', phase: '모형', features: ['enso'],
      intro: '<p class="si-q">❓ 탐구 질문: 먼 바다의 수온 변화는 왜 우리의 날씨와 식탁까지 바꿀 수 있을까?</p>' +
        '<div class="si-link">🔗 <b>중학교에서 배운</b> 대기 대순환(<b>무역풍</b>)과 해류를 떠올려요. 무역풍은 적도 부근에서 동쪽에서 서쪽으로 늘 불어, 표층의 따뜻한 바닷물을 서쪽으로 밀어요.</div>' +
        '<p>태평양 단면 모형에서 <b>무역풍 세기</b>를 바꾸어 <b>평상시 · 엘니뇨 · 라니냐</b>를 만들어 봐요. 동태평양 표층 수온이 평년보다 <b>+' + K.THR.toFixed(1) + ' °C 이상 높은 상태가 ' + K.MONTHS + '개월 이상</b> 이어지면 엘니뇨라고 해요. 약 ' + K.PERIOD + '년마다 나타나요.</p>',
      setup() { enterLevel(0); },
      recap: '무역풍이 약해지면 서쪽의 따뜻한 물이 동쪽으로 퍼지고, 용승이 약해져 영양염이 줄어 멸치 어획량이 줄어요. 이것이 엘니뇨예요.',
      summary: '<table class="mini"><tr><th>상태</th><th>무역풍</th><th>따뜻한 물</th><th>용승</th><th>멸치</th></tr><tr><td>평상시</td><td>보통</td><td>서쪽에 모임</td><td>활발</td><td>많음</td></tr><tr><td>엘니뇨</td><td>약함</td><td>동쪽으로 퍼짐</td><td>약함</td><td>줄어듦</td></tr><tr><td>라니냐</td><td>매우 강함</td><td>서쪽에 더 쏠림</td><td>더 활발</td><td>더 많음</td></tr></table>' +
        '<ul><li>엘니뇨: 동태평양 수온이 평년보다 <b>+' + K.THR.toFixed(1) + ' °C 이상</b> 높은 상태가 <b>' + K.MONTHS + '개월 이상</b> 지속. 주기는 약 ' + K.PERIOD + '년. (예시 자료: 1997~98년 약 +' + K.EL_97.toFixed(1) + ' °C, 2015~16년 약 +' + K.EL_15.toFixed(1) + ' °C)</li><li>영향(경향): 페루·에콰도르 폭우와 홍수, 인도네시아·호주 가뭄과 산불, 멸치 어획 감소. 라니냐는 반대 경향.</li></ul>',
      missions: [
        {
          title: '평상시 · 엘니뇨 · 라니냐 만들기',
          goal: '무역풍 세기 슬라이더로 <b>평상시</b>, <b>엘니뇨</b>(약함), <b>라니냐</b>(매우 강함)를 각각 1초 이상 보여 줘요.',
          hint: '평상시는 가운데(35~65), 엘니뇨는 <b>30 이하</b>로 약하게, 라니냐는 <b>70 이상</b>으로 매우 강하게 해 보세요. 그림이 바뀐 뒤 1초쯤 기다려요.',
          setup() { setMode('enso'); S.seen = { no: false, el: false, la: false }; S.dwell = { no: 0, el: 0, la: 0 }; },
          check: () => S.seen.no && S.seen.el && S.seen.la, hold: 0.3,
          status: () => mark(S.seen.no) + ' 평상시 · ' + mark(S.seen.el) + ' 엘니뇨 · ' + mark(S.seen.la) + ' 라니냐 (지금 ' + CAT[catOf(aOf(S.w))] + ')',
          explain: '무역풍이 <b>약해지면</b>(엘니뇨) 서쪽에 모여 있던 따뜻한 물이 동쪽으로 퍼지고 비구름도 동쪽으로 옮겨 가요. 무역풍이 <b>매우 강해지면</b>(라니냐) 따뜻한 물이 서쪽으로 더 쏠리고 동쪽에서는 찬 심층수가 더 활발하게 올라와요.',
        },
        {
          type: 'quiz', title: '엘니뇨에 멸치가 줄어드는 까닭',
          goal: '엘니뇨가 일어나면 페루 앞바다의 <b>멸치 어획량이 줄어요</b>. 그 까닭으로 알맞은 것은?',
          setup() { setMode('enso'); },
          choices: ['따뜻한 바닷물에는 산소가 전혀 없어서', '무역풍이 약해져 용승이 약해지고, 영양염이 풍부한 찬 심층수가 올라오지 않아 먹이가 줄어서', '무역풍이 강해져 멸치가 서쪽으로 밀려가서', '비가 많이 와서 바닷물이 싱거워져서'],
          answer: 1,
          feedback: ['따뜻한 물에도 산소는 있어요. 줄어드는 것은 영양염(먹이의 바탕)이에요.', '', '엘니뇨에서는 무역풍이 약해져요. 강해지는 것은 라니냐예요.', '핵심 원인은 비가 아니라 찬 심층수의 용승이 약해지는 것이에요.'],
          explain: '평상시에는 무역풍이 표층의 따뜻한 물을 서쪽으로 밀어서, 동쪽에서는 영양염이 풍부한 <b>찬 심층수가 올라오는 용승</b>이 활발해요. 엘니뇨에는 무역풍이 약해져 <b>용승이 약해지므로</b> 먹이가 줄고 멸치 어획량이 줄어요.',
        },
      ],
    },
    {
      title: '사막화: 땅이 사막으로 변할 때', short: '사막화', icon: '🏜️', phase: '탐구', features: ['desert'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 바다의 변화가 비가 오는 곳과 가뭄이 드는 곳을 바꾸는 것을 봤어요. 이번에는 육지에서 일어나는 환경 변화예요.</div>' +
        '<p><b>사막화</b>는 건조한 지역에서 기후 요인(가뭄, 강수 감소, 기온 상승)과 인위적 요인(과도한 방목, 삼림 벌채, 과잉 경작)으로 땅이 황폐해져 식생이 사라지고 사막처럼 변하는 현상이에요. 풀밭 모형(12×8칸)에서 <b>강수량</b>, <b>가축 수</b>, <b>나무 심기</b>를 바꾸며 식생과 사막 면적이 어떻게 변하는지 봐요. 식생이 줄면 실제로 내리는 비도 줄어드는 <b>되먹임</b>이 있어요. (교육용 모형이에요.)</p>',
      setup() { enterLevel(1); },
      recap: '가뭄과 과도한 방목이 겹치면 식생과 토양이 급격히 나빠져 사막화가 일어나요. 가축을 줄이고 나무를 심으면 천천히 회복돼요.',
      summary: '<ul><li><b>원인</b>: 기후 요인(가뭄, 강수 감소, 기온 상승) + 인위적 요인(과도한 방목, 삼림 벌채, 과잉 경작, 관개로 인한 염분 축적).</li><li><b>과정</b>: 식생 감소 → 토양 침식(흙이 날려감) → 땅이 더 메마름 → 식생 더 감소. 식생이 줄면 실제 강수도 줄어요(되먹임).</li><li><b>영향</b>: 식량 생산 감소, <b>황사</b> 증가(우리나라에도 영향), 생태계 파괴, 환경 난민. 사례: 사헬 지대, 아랄해.</li><li><b>대처</b>: 방풍림 조성(나무 심기), 방목량 조절, 물 관리, 국제 협약.</li></ul>',
      missions: [
        {
          title: '사막화가 일어나게 해 보기',
          goal: '강수량을 줄이고 가축을 늘려, <b>사막 면적을 ' + K.DES_BAD + ' % 이상</b>으로 만들어요.',
          hint: '강수량을 <b>' + K.RAIN_HARD + ' mm 이하</b>로, 가축을 <b>' + K.LIVE_BAD + '마리 이상</b>으로 하고 몇 초 기다려 보세요. 풀이 줄어들며 땅이 드러나요.',
          setup() { setMode('desert'); },
          check: () => desPct() >= K.DES_BAD, hold: 0.6,
          status: () => mark(desPct() >= K.DES_BAD) + ' 사막 면적 ' + desPct() + ' % (' + K.DES_BAD + ' % 이상) · 강수 ' + S.rain + ' mm · 가축 ' + S.live + '마리',
          explain: '비가 적은데 가축이 풀을 많이 먹으면 풀이 다시 자랄 틈이 없어요. 풀이 줄면 <b>흙이 드러나 바람에 날려가고(토양 침식)</b>, 땅이 더 메말라 풀이 더 줄어드는 <b>악순환</b>이 생겨요.',
        },
        {
          title: '사막화된 땅 회복시키기',
          goal: '<b>강수량 ' + K.RAIN_DRY + ' mm 이하</b>인 건조한 환경에서 <b>가축 ' + K.LIVE_OK + '마리 이상</b>을 키우며 <b>사막 면적 ' + K.DES_OK + ' % 이하</b>를 3초 동안 유지해요.',
          hint: '먼저 가축을 0~1마리로 줄이고 풀밭 칸을 눌러 <b>나무를 심은 뒤</b>, 사막 면적이 줄어들 때까지 기다려요. 강수량은 <b>350~' + K.RAIN_DRY + ' mm</b>로 두고, 풀이 회복되면 가축을 ' + K.LIVE_OK + '마리로 늘려요.',
          setup() { setMode('desert'); },
          check: () => S.rain <= K.RAIN_DRY && S.live >= K.LIVE_OK && desPct() <= K.DES_OK, hold: 3,
          status: () => mark(S.rain <= K.RAIN_DRY) + ' 강수 ' + S.rain + ' mm · ' + mark(S.live >= K.LIVE_OK) + ' 가축 ' + S.live + '마리 · ' + mark(desPct() <= K.DES_OK) + ' 사막 ' + desPct() + ' %',
          explain: '가축 수를 줄이면 풀이 다시 자라고, <b>방풍림</b>은 바람에 의한 토양 침식을 줄이고 주변에 수분을 보태 줘요. 회복된 땅에서는 적당한 수의 가축을 키울 수 있어요. 사막화는 <b>방목량 조절 · 나무 심기 · 물 관리</b>로 막거나 늦출 수 있어요.',
        },
        {
          type: 'quiz', title: '사막화의 원인',
          goal: '다음 중 <b>사막화의 원인</b>으로 알맞게 짝지은 것은?',
          setup() { setMode('desert'); },
          choices: ['가뭄(강수 감소), 과도한 방목, 삼림 벌채와 과잉 경작', '강수량 증가, 방목 줄이기, 나무 심기', '해수면 상승, 지진, 화산 활동', '오존층 파괴, 산성비, 소음'],
          answer: 0,
          feedback: ['', '그 세 가지는 사막화를 막거나 늦추는 방법이에요.', '해수면 상승은 바닷가의 문제이고, 지진과 화산은 사막화의 주된 원인이 아니에요.', '이런 문제는 사막화와 직접 관련이 적어요.'],
          explain: '사막화는 <b>가뭄·강수 감소 같은 기후 요인</b>과 <b>과도한 방목·삼림 벌채·과잉 경작 같은 인위적 요인</b>이 함께 작용해 일어나요. 드러난 흙먼지는 바람을 타고 <b>황사</b>가 되어 우리나라에도 영향을 줘요.',
        },
      ],
    },
    {
      title: '영향 분석: 지도와 영향 분류', short: '영향 분석', icon: '🗺️', phase: '분석', features: ['impact'],
      intro: '<div class="si-link">🔗 <b>앞 단계들에서</b> 엘니뇨와 사막화가 일어나는 원인과 과정을 알았어요. 이제 그 영향이 어디에, 어떻게 나타나는지 분석해요.</div>' +
        '<p>세계 지도의 <b>' + MARK.length + '곳</b>을 눌러 엘니뇨, 사막화, 해수면 상승과 산호 백화의 영향을 읽어요. 그다음 영향 카드를 <b>지구 환경 · 생태계 · 인간 생활</b>로 분류해요. 영향은 경향이며 해마다 똑같지는 않아요.</p>',
      setup() { enterLevel(2); },
      recap: '엘니뇨·사막화·해수면 상승의 영향은 지구 환경, 생태계, 인간 생활로 이어져요. 한 가지 변화가 여러 영역에 연쇄적으로 영향을 줘요.',
      summary: '<table class="mini"><tr><th>영역</th><th>영향의 예</th></tr><tr><td>지구 환경</td><td>해수면 상승, 사막 면적 확대, 동태평양 수온 상승</td></tr><tr><td>생태계</td><td>산호 백화, 산불로 서식지 파괴, 멸치 떼 감소</td></tr><tr><td>인간 생활</td><td>곡물 가격 상승, 어민 소득 감소, 황사로 인한 호흡기 질환</td></tr></table>' +
        '<ul><li>엘니뇨는 자연적으로 반복되는 해수 순환의 변동이고, 지구 온난화는 온실 기체 증가로 인한 장기적인 기온 상승이에요. 서로 다른 현상이에요.</li><li>해수면 상승: 해수 열팽창 + 육지 얼음 융해. 1901~2018년 약 ' + K.SEA_HIST + ' cm 상승, 2100년 전망 약 ' + K.SEA_FUT + ' m(시나리오에 따라 달라요).</li></ul>',
      missions: [
        {
          title: '영향 지역 모두 확인하기',
          goal: '세계 지도의 점 <b>' + MARK.length + '곳을 모두</b> 눌러 어떤 영향이 나타나는지 읽어요.',
          hint: '파랑은 엘니뇨, 주황은 사막화, 청록은 해수면·바다 영향, 보라는 둘 다예요. 아직 안 누른 점은 고리가 반짝여요.',
          setup() { setMode('impact'); S.subImp = 'map'; updateCtl(); },
          check: () => S.visited.size >= MARK.length, hold: 0.3,
          status: () => mark(S.visited.size >= MARK.length) + ' 확인한 지점 ' + S.visited.size + ' / ' + MARK.length,
          explain: '엘니뇨는 페루·에콰도르(폭우·홍수)와 인도네시아·호주(가뭄·산불)처럼 <b>서로 다른 곳에 반대의 영향</b>을 줘요. 사막화는 사헬·중앙아시아·몽골에서 일어나고 그 먼지(황사)는 우리나라에까지 와요.',
        },
        {
          title: '영향 카드 분류하기',
          goal: '영향 카드 9장을 <b>지구 환경 · 생태계 · 인간 생활</b> 영역에 알맞게 놓고 <b>✔ 확인하기</b>를 눌러요.',
          hint: '지구 환경은 바다·대기·땅 자체의 변화, 생태계는 생물과 서식지의 변화, 인간 생활은 식량·경제·건강의 변화예요.',
          manual: true,
          setup() { setMode('impact'); S.subImp = 'sort'; updateCtl(); },
          status: () => mark(impBoard.cards.every((c) => c.zone)) + ' 놓은 카드 ' + impBoard.cards.filter((c) => c.zone).length + ' / ' + impBoard.cards.length,
          check() {
            const r = checkBoard(impBoard, IMP_Z); if (r === true && !S.impOK) { S.impOK = 1; impBoard.cards.forEach((c) => parts.burst(c.x, c.y, { count: 5, speed: 80, size: 3, life: 0.6 })); } return r;
          },
          explain: '한 가지 변화가 여러 영역으로 이어져요. 예를 들어 <b>멸치 떼 감소(생태계)</b>는 <b>어민 소득 감소(인간 생활)</b>로, <b>사막 면적 확대(지구 환경)</b>는 <b>황사(인간 생활)</b>로 이어져요.',
        },
        {
          type: 'quiz', title: '엘니뇨와 지구 온난화',
          goal: '<b>엘니뇨</b>와 <b>지구 온난화</b>의 관계로 알맞은 것은?',
          setup() { setMode('impact'); S.subImp = 'map'; updateCtl(); },
          choices: ['엘니뇨는 지구 온난화가 일으키는 현상이라 둘은 같은 것이에요', '엘니뇨는 자연적으로 반복되는 해수 순환의 변동이고, 지구 온난화는 온실 기체 증가로 인한 장기적 기온 상승이라 서로 달라요', '엘니뇨가 끝나면 지구 온난화도 끝나요', '지구 온난화가 없으면 엘니뇨도 사라져요'],
          answer: 1,
          feedback: ['엘니뇨는 온난화가 없던 때에도 일어났어요. 원인이 달라요.', '', '엘니뇨는 몇 년 주기로 끝나지만 온난화는 온실 기체가 쌓이는 한 계속돼요.', '엘니뇨는 자연적인 변동이라 온난화와 관계없이 나타나요.'],
          explain: '엘니뇨는 <b>수년 주기로 반복되는 자연 변동</b>이고, 지구 온난화는 <b>온실 기체 증가로 일어나는 오랜 기간의 기온 상승</b>이에요. 서로 다르지만, 온난화가 엘니뇨의 영향을 키울 수 있는지는 계속 연구하고 있어요.',
        },
      ],
    },
    {
      title: '미래 시나리오: 완화와 적응', short: '미래 시나리오', icon: '🔮', phase: '적용', features: ['future'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 엘니뇨, 사막화, 해수면 상승이 지구 환경과 생태계, 인간 생활에 영향을 주는 것을 분석했어요. 이제 어떤 미래를 선택할지 설계해요.</div>' +
        '<p><b>배출 정책 · 에너지 전환 속도 · 숲과 습지</b>를 골라 <b>2100년</b>의 기온, 해수면, 사막화, 산호초, 식량 지표가 어떻게 달라지는지 봐요. 두 시나리오를 저장해 비교하고, 대처 방안을 <b>완화</b>(배출을 줄이거나 흡수를 늘림)와 <b>적응</b>(피해를 줄임)으로 나누어 봐요. (교육용으로 단순화한 예시 값이에요.)</p>',
      setup() { enterLevel(3); },
      recap: '온실 기체 배출을 줄이는 완화와 달라진 환경에 대비하는 적응을 함께 해야 해요. 시나리오에 따라 2100년의 모습이 크게 달라져요.',
      summary: '<table class="mini"><tr><th>배출 정책</th><th>2100년 기온 상승</th></tr><tr><td>크게 줄이기</td><td>약 +' + K.BASE[0].toFixed(1) + ' °C</td></tr><tr><td>현재 수준</td><td>약 +' + K.BASE[1].toFixed(1) + ' °C</td></tr><tr><td>계속 늘리기</td><td>약 +' + K.BASE[2].toFixed(1) + ' °C</td></tr></table>' +
        '<ul><li><b>완화</b>: 온실 기체 배출을 줄이거나 흡수를 늘려요 (재생 에너지, 에너지 효율, 숲 보전).</li><li><b>적응</b>: 달라진 환경에 맞춰 피해를 줄여요 (제방 강화, 가뭄에 강한 작물, 조기 경보).</li><li>에너지 전환이 빠르고 숲을 보전하면 같은 정책에서도 상승폭이 더 작아져요.</li></ul>',
      missions: [
        {
          title: '두 시나리오 비교하고 고르기',
          goal: '서로 다른 시나리오 <b>두 개를 저장</b>(2100년 기온 차이 ' + K.DIFF.toFixed(1) + ' °C 이상)한 뒤, <b>더 나은 시나리오</b>와 그 <b>근거</b>를 골라 <b>✔ 확인하기</b>를 눌러요.',
          hint: '카드를 바꾸고 <b>📌 저장</b>을 두 번 눌러요. 예: 배출 "크게 줄이기"와 "계속 늘리기". 저장하면 아래에 근거 문장이 나타나요.',
          manual: true,
          setup() { setMode('future'); S.subFut = 'scen'; S.saved = [null, null]; S.nextSlot = 0; S.who = -1; S.why = -1; buildEv(); updateCtl(); },
          status: () => mark(slotsFilled().length === 2) + ' 저장 ' + slotsFilled().length + ' / 2 · ' + mark(S.who >= 0) + ' 고름 · ' + mark(S.why >= 0) + ' 근거',
          check() {
            const sv = slotsFilled();
            if (sv.length < 2) return '시나리오를 <b>두 개</b> 저장해야 해요. (지금 ' + sv.length + '개)';
            if (Math.abs(S.saved[0].T - S.saved[1].T) < K.DIFF - 1e-9) return '두 시나리오의 2100년 기온 차이가 <b>' + K.DIFF.toFixed(1) + ' °C 이상</b>이 되게 서로 다르게 골라 저장해 보세요.';
            if (S.who < 0) return '<b>어느 시나리오가 더 나은지</b> 골라 주세요.';
            if (S.who !== betterIdx()) return '2100년 기온 상승과 해수면 상승이 <b>더 작은</b> 시나리오를 고르는 것이 지구 환경에 더 좋아요. 다시 비교해 보세요.';
            if (S.why < 0) return '근거 문장을 하나 골라 주세요.';
            if (!S.evOrder[S.why].ok) { $$('#evList .opt').forEach((b, i) => b.classList.toggle('bad', i === S.why)); return '그 문장은 저장한 두 시나리오의 숫자와 맞지 않아요. 아래 바의 숫자를 다시 읽어 보세요.'; }
            return true;
          },
          explain: '시나리오를 고를 때는 <b>자료(숫자)를 근거로</b> 비교해요. 배출을 크게 줄이면 기온과 해수면 상승이 작고 산호초와 식량 지표가 더 높게 유지돼요. 어떤 선택이든 장단점이 있으니 근거와 함께 말하는 것이 중요해요.',
        },
        {
          title: '완화와 적응 구분하기',
          goal: '대처 방안 카드 6장을 <b>완화</b>와 <b>적응</b> 영역으로 나누고 <b>✔ 확인하기</b>를 눌러요.',
          hint: '배출을 줄이거나 흡수를 늘리는 것은 완화, 이미 달라진 환경에서 피해를 줄이는 것은 적응이에요.',
          manual: true,
          setup() { setMode('future'); S.subFut = 'sort2'; updateCtl(); },
          status: () => mark(mitBoard.cards.every((c) => c.zone)) + ' 놓은 카드 ' + mitBoard.cards.filter((c) => c.zone).length + ' / ' + mitBoard.cards.length,
          check() { const r = checkBoard(mitBoard, MIT_Z); if (r === true && !S.mitOK) { S.mitOK = 1; mitBoard.cards.forEach((c) => parts.burst(c.x, c.y, { count: 5, speed: 80, size: 3, life: 0.6 })); } return r; },
          explain: '<b>완화</b>는 원인(온실 기체)을 줄이는 일, <b>적응</b>은 이미 생기는 결과(해수면 상승, 가뭄, 폭염)에 대비하는 일이에요. 기후변화에 대처하려면 둘을 함께 해야 해요.',
        },
        {
          title: '내가 할 수 있는 일 정하기',
          goal: '배출을 줄이는 데 도움이 되는 실천을 <b>정확히 3개</b> 고르고 <b>✔ 확인하기</b>를 눌러요.',
          hint: '전기와 에너지를 아끼고, 이동 방법을 바꾸고, 쓰레기를 줄이는 행동 중에서 골라요. 도움이 되지 않는 행동은 고르지 않아요.',
          manual: true,
          setup() { setMode('future'); S.subFut = 'pledge'; resetPledge(); updateCtl(); },
          status: () => mark(S.pledge.size === 3) + ' 고른 실천 ' + S.pledge.size + ' / 3',
          check() {
            const sel = [...S.pledge], wrong = sel.filter((i) => !PLEDGES[i].ok);
            $$('#pledgeList .opt').forEach((b, i) => b.classList.toggle('bad', wrong.includes(i)));
            if (wrong.length) return '"' + PLEDGES[wrong[0]].t + '"' + josa(PLEDGES[wrong[0]].t, '은/는') + ' 배출을 줄이는 행동이 아니에요. 빨간 칸을 빼 보세요.';
            if (sel.length !== 3) return '정확히 <b>3개</b>를 골라 주세요. (지금 ' + sel.length + '개)';
            return true;
          },
          explain: '작은 실천도 모이면 큰 변화가 돼요. 개인의 실천과 함께 재생 에너지 확대, 에너지 효율 향상, 국제 협력 같은 <b>사회적 노력</b>이 함께 이루어져야 해요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'h1-climate-impact', mount: '#game', badge: '기후 분석가', homeHref: '../../index.html#h1b',
    featureLabels: { enso: '🌊 무역풍 슬라이더 · 태평양 단면', desert: '🏜️ 강수량·가축 슬라이더 · 나무 심기', impact: '🗺️ 세계 지도 · 영향 분류 카드', future: '🔮 시나리오 카드 · 완화·적응 분류' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 루프 ---------- */
  initSheep(); desReset(); buildEv();
  const BG = { enso: '#e1ecf8', desert: '#efe8d6', impact: '#e8f1fa', future: '#eef3fb' };
  let lastFree = false;
  SciSim.loop((dt, t) => {
    S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.mode === 'enso') stepEnso(dt);
    else if (S.mode === 'desert') updateDesert(dt);
    else if (S.mode === 'future') stepFuture(dt);
    const b = activeBoard(); if (b) b.update(dt);
    parts.update(dt);
    ctx.setTransform(view.scale * view.dpr, 0, 0, view.scale * view.dpr, 0, 0);
    ctx.fillStyle = BG[S.mode]; ctx.fillRect(0, 0, VW, VH);
    if (S.mode === 'enso') drawEnso(t);
    else if (S.mode === 'desert') drawDesert(t);
    else if (S.mode === 'impact') {
      if (S.subImp === 'map') drawMap(t);
      else { D.text(PHONE ? 300 : 400, 38, '영향 카드를 알맞은 영역에 놓아요', { size: 17, weight: 800, color: '#334155' }); impBoard.draw(t); }
    } else {
      if (S.subFut === 'scen' || S.subFut === 'pledge') drawFuture(t);
      else { D.text(PHONE ? 300 : 400, 38, '완화와 적응으로 나눠요', { size: 17, weight: 800, color: '#334155' }); mitBoard.draw(t); }
    }
    parts.draw(ctx);
    drawFlash(dt, 10);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(255,255,255,' + S.fade * 0.85 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, K, VW, VH, DS, MARK, impBoard, mitBoard, IND, enterLevel, scen, curScen, aOf, catOf, fishIdx, upOf, stepDesert, desPct, vegPct, markerAt, mproj, cellXY, cellAt, PLEDGES, buildEv, slotsFilled,
    get game() { return game; },
    solveImp() { impBoard.cards.forEach((c) => { c.zone = c.t; }); impBoard.layout(true); },
    solveMit() { mitBoard.cards.forEach((c) => { c.zone = c.t; }); mitBoard.layout(true); },
    setWind(w) { S.w = w; syncSliders(); updateCtl(); },
    setDes(r, l) { S.rain = r; S.live = l; syncSliders(); },
    simYears(y) { for (let i = 0; i < Math.round(y / K.SIM_DT); i++) { stepDesert(K.SIM_DT); } DS.vis = DS.v.slice(); },
    plantTrees(n) { const idx = [13, 16, 19, 25, 28, 31, 37, 40, 43, 46]; DS.tree.fill(false); idx.slice(0, n).forEach((i) => { DS.tree[i] = true; }); sync2(); },
    tap(i) { const q = mproj(MARK[i].lon, MARK[i].lat); return q; },
    pick(pol, en, fo) { S.pol = pol; S.en = en; S.fo = fo; updateCtl(); },
  };
})();
