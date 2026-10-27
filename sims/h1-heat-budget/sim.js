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
     통합과학2 Ⅱ. 환경과 에너지 - 온실 효과 강화와 열수지
     [10통과2-02-03] 온실효과 강화로 인한 지구온난화의 메커니즘 이해 (열수지 탐구)
     ① 분석: 지구 열수지 숫자 채우기   ② 탐구: 온실 기체 농도 → 불균형 → 새 평형
     ③ 탐구: 되먹임 켜고 끄기 비교     ④ 분석: 배출과 흡수 (2100년까지)
     ========================================================= */
  initStage('#dcecf8', 800, 560, 600, 840, 1.28);
  const FONT_SCALE = FS;

  /* ---------- 상수 (본문에 쓰는 숫자는 모두 여기서 가져와요) ---------- */
  const K = {
    C0: 280, CNOW: 420, C2X: 560,        // 이산화 탄소 농도 (ppm)
    F2: 1.08,                             // 농도 2배일 때 불균형(강제력), 입사 100 기준
    LAM0: 0.9, LAM_VAP: 0.21, LAM_ICE: 0.33,   // 기온 1 °C 오를 때 불균형이 줄어드는 정도 (되먹임이 없을 때 / 각 되먹임이 줄이는 몫)
    CS: 0.65,                             // 지표의 열용량(상대값): 클수록 천천히 데워져요
    OBS: 1.1,                             // 지금까지 실제로 관측된 기온 상승 (°C)
    NOGH: -18, NOW_T: 15,                 // 온실 효과가 없을 때 / 있을 때 지구 평균 기온
    ICE_MELT: 0.2,                        // 기온 1 °C 상승당 줄어드는 빙하 비율 (되먹임이 켜졌을 때)
    VAP_RISE: 0.07,                       // 기온 1 °C 상승당 늘어나는 수증기 비율
    // 열수지 기준값 (입사 100)
    IN: 100, REFL: 30, AABS: 20, SABS: 50, RS: 114, BACK: 92, OUT: 70, EVAP: 22, CONV: 6,
    // 배출과 흡수 (2025 → 2100)
    Y0: 2025, Y1: 2100, GT_PPM: 7.8, SINK_K: 0.0183, TAU: 30, E_NOW: 40, TARGET: 2.0,
  };
  K.LAMF = K.LAM0 - K.LAM_VAP - K.LAM_ICE;          // 되먹임을 모두 켰을 때
  K.SENS = K.F2 / K.LAMF;                            // 농도가 2배일 때 평형 기온 상승 (되먹임 포함)
  K.SENS0 = K.F2 / K.LAM0;                           // 되먹임이 없을 때
  K.REFL_AFTER = Math.round(K.REFL - K.LAM_ICE * K.SENS);   // 560 ppm에서 빙하가 줄어든 뒤의 반사
  const f1 = (x) => (Math.round(x * 10) / 10).toFixed(1);
  const sg1 = (x) => (Math.round(x * 10) / 10 >= 0 ? '+' : '−') + Math.abs(Math.round(x * 10) / 10).toFixed(1);
  const n1 = (x) => Math.round(x * 10) / 10;

  /* 강제력 F(c): 농도가 2배가 될 때마다 F2씩 (로그) */
  const forcing = (c) => K.F2 * Math.log2(Math.max(c, 1) / K.C0);
  const lamOf = (v, i) => K.LAM0 - K.LAM_VAP * v - K.LAM_ICE * i;
  const eqT = (c, v, i) => forcing(c) / lamOf(v, i);
  /* 열수지: 상태(기온 변화 dT, 불균형 N, 빙하 되먹임 가중치 ice) → 화살표 값 (연속값) */
  function budgetC(dT, N, ice) {
    const R = K.REFL - K.LAM_ICE * ice * dT, Sa = K.IN - R - K.AABS;
    const Rs = K.RS + (5 / 3) * dT, E = K.EVAP + (2 / 3) * dT;
    return { R, Aa: K.AABS, Sa, Rs, E, C: K.CONV, B: Rs + E + K.CONV + N - Sa, O: K.IN - R - N, N };
  }
  /* 화면에 쓰는 정수 열수지: 각 항을 반올림하고, 불균형도 정수로 반올림해 합이 항상 맞아요 */
  function budgetI(dT, N, ice) {
    const R = Math.round(K.REFL - K.LAM_ICE * ice * dT), Sa = K.IN - R - K.AABS;
    const Rs = Math.round(K.RS + (5 / 3) * dT), E = Math.round(K.EVAP + (2 / 3) * dT), Ni = Math.round(N);
    return { R, Aa: K.AABS, Sa, Rs, E, C: K.CONV, B: Rs + E + K.CONV + Ni - Sa, O: K.IN - R - Ni, Ni };
  }
  const BASE = budgetI(0, 0, 0);

  /* 배출 · 흡수 모형 (해마다 계산) */
  const dTeqC = (c) => K.SENS * Math.log2(c / K.C0);
  function emitRun(e, forest) {
    let c = K.CNOW, T = K.OBS; const out = [{ y: K.Y0, c, T, sink: K.SINK_K * (c - K.C0) * K.GT_PPM + forest, e }];
    for (let y = K.Y0; y < K.Y1; y++) {
      const sink = K.SINK_K * (c - K.C0) * K.GT_PPM + forest;
      c = Math.max(K.C0, c + (e - sink) / K.GT_PPM);
      T += (dTeqC(c) - T) / K.TAU;
      out.push({ y: y + 1, c, T, sink: K.SINK_K * (c - K.C0) * K.GT_PPM + forest, e });
    }
    return out;
  }

  /* ---------- 상태 ---------- */
  const S = {
    mode: 'budget', clock: 0,
    c: K.C0, cs: K.C0,                // 슬라이더 농도 / 화면에 쓰는(부드럽게 따라가는) 농도
    vap: 1, ice: 1, vapS: 1, iceS: 1, // 되먹임 (목표 / 부드러운 값)
    dT: 0, N: 0, Nd: 0,               // 기온 변화, 불균형, 화면용 불균형 (스프링)
    t: 0, hist: [],                   // 경과 시간, 기록 [{t, dT}]
    rows: {},                         // 되먹임 비교표 { 'vi': {...} }
    e: K.E_NOW, forest: 0, run: null, yr: K.Y0, yrPlay: false, gOK: 0,
    solved: false, solveT: 0, okFlash: 0,
    fade: 0, acts: new Set(), actOK: 0,
    seen2: false,
  };
  S.ndSpring = new SciSim.Spring(0, { stiffness: 140, damping: 16 });
  const disp = { dT: 0 };           // 온도계 액주 (스프링)
  const thSpring = new SciSim.Spring(0, { stiffness: 120, damping: 15 });

  /* 한 번에 한 칸씩 시간이 흘러요: 불균형 N = 강제력 − λ·ΔT, ΔT는 N 만큼 데워져요 */
  function stepClimate(dt) {
    S.cs = approach(S.cs, S.c, dt, 7);
    S.vapS = approach(S.vapS, S.vap, dt, 5); S.iceS = approach(S.iceS, S.ice, dt, 5);
    const lam = lamOf(S.vapS, S.iceS);
    S.N = forcing(S.cs) - lam * S.dT;
    S.dT += (S.N / K.CS) * dt;
    if (S.dT < 0) S.dT = 0;
    S.t += dt;
    if (!S.hist.length || S.t - S.hist[S.hist.length - 1].t >= 0.1) { S.hist.push({ t: S.t, dT: S.dT, N: S.N }); if (S.hist.length > 400) S.hist.shift(); }
  }
  const settled = () => Math.abs(S.cs - S.c) < 0.5 && Math.abs(S.vapS - S.vap) < 0.02 && Math.abs(S.iceS - S.ice) < 0.02;
  const nowEq = () => eqT(S.c, S.vap, S.ice);
  const nDisp = () => Math.abs(n1(S.N));                  // 화면에 보이는 불균형 크기 (0.1 단위)
  function resetClimate(c, v, i) {
    S.c = S.cs = c; S.vap = S.vapS = v; S.ice = S.iceS = i; S.dT = 0; S.N = 0; S.t = 0; S.hist.length = 0;
    S.ndSpring.value = S.ndSpring.target = 0; thSpring.value = thSpring.target = 0;
  }

  /* ======================================================
     화면 배치
     ====================================================== */
  const DW = 600, DH = 560;
  const PAN = PHONE ? { x: 0, y: 560, w: 600, h: 280 } : { x: 600, y: 0, w: 200, h: 560 };
  const G = {
    atmTop: 96, atmBot: 400,
    sun: { x: 44, y: 44, r: 24 },
    P: { x: 168, y: 96 }, beamX: 168, Qy: 250,
    xRs: 290, xB: 382, xO: 456, xE: 506, xC: 566,
    rsTop: 240, topY: 22,
  };
  const COL = { sun: '#f59e0b', sunL: '#fbbf24', ir: '#e11d48', back: '#be123c', evap: '#0ea5e9', conv: '#ea580c' };
  const wid = (v) => 1.6 + Math.max(0, v) * 0.1;                  // 값에 비례한 화살표 굵기
  /* 슬롯(번호칸)과 태그의 위치 (화살표 중간) */
  const SLOT = {
    R:  { x: 209, y: 62,  name: '반사',        ans: 30,  col: '#92700c', dark: true },
    Aa: { x: 112, y: 250, name: '대기 흡수',   ans: 20,  col: '#92700c' },
    Sa: { x: 168, y: 336, name: '지표 흡수',   ans: 50,  col: '#92700c' },
    Rs: { x: 290, y: 322, name: '지표 복사',   ans: 114, col: '#be123c' },
    B:  { x: 382, y: 322, name: '되돌아오는 복사', ans: 92, col: '#be123c', two: true },
    O:  { x: 456, y: 132, name: '우주로 방출', ans: 70,  col: '#be123c' },
  };
  const SLOT_IDS = ['R', 'Aa', 'Sa', 'Rs', 'B', 'O'];
  const FIXED = {
    IN:   { x: 117, y: 78, name: '입사', val: () => K.IN, col: '#92700c' },
    E:    { x: G.xE, y: 322, name: '증발', col: '#0369a1' },
    C:    { x: G.xC - 10, y: 372, name: '대류·전도', col: '#c2410c' },
  };

  /* ======================================================
     분자(온실 기체)와 적외선 광자
     ====================================================== */
  const mols = [], photons = [];
  const MREG = { x0: 232, x1: 584, y0: 124, y1: 380 };
  const N_H2O0 = 12, N_CO2_BASE = 18;
  function addMol(kind) {
    const m = { kind, x: rnd(MREG.x0, MREG.x1), y: rnd(MREG.y0, MREG.y1), vx: rnd(-8, 8), vy: rnd(-6, 6), rot: rnd(0, TAU), vr: rnd(-0.5, 0.5), s: 0, tgt: 1, glow: 0, pend: [] };
    mols.push(m); return m;
  }
  function syncMols() {
    const wantCO2 = Math.round(N_CO2_BASE * S.cs / K.C0);
    const wantH2O = Math.round(N_H2O0 * (1 + K.VAP_RISE * S.vapS * S.dT));
    ['co2', 'h2o'].forEach((kind) => {
      const want = kind === 'co2' ? wantCO2 : wantH2O;
      const live = mols.filter((m) => m.kind === kind && m.tgt === 1);
      for (let i = live.length; i < want; i++) addMol(kind);
      for (let i = live.length; i > want; i--) { const m = live[Math.floor(Math.random() * live.length)]; if (m.tgt === 1) m.tgt = 0; live.splice(live.indexOf(m), 1); }
    });
  }
  function updateMols(dt) {
    for (let i = mols.length - 1; i >= 0; i--) {
      const m = mols[i];
      m.s = approach(m.s, m.tgt, dt, 6);
      if (m.tgt === 0 && m.s < 0.03) { mols.splice(i, 1); continue; }
      if (!RM) {
        m.vx += rnd(-14, 14) * dt; m.vy += rnd(-14, 14) * dt;
        m.vx = clamp(m.vx, -12, 12); m.vy = clamp(m.vy, -9, 9);
        m.x += m.vx * dt; m.y += m.vy * dt; m.rot += m.vr * dt;
        if (m.x < MREG.x0) { m.x = MREG.x0; m.vx = Math.abs(m.vx); } if (m.x > MREG.x1) { m.x = MREG.x1; m.vx = -Math.abs(m.vx); }
        if (m.y < MREG.y0) { m.y = MREG.y0; m.vy = Math.abs(m.vy); } if (m.y > MREG.y1) { m.y = MREG.y1; m.vy = -Math.abs(m.vy); }
      }
      m.glow = Math.max(0, m.glow - dt * 2.2);
      // 흡수한 광자를 잠시 뒤에 다시 내보내요
      for (let k = m.pend.length - 1; k >= 0; k--) {
        m.pend[k].t -= dt;
        if (m.pend[k].t <= 0) { const p = m.pend.splice(k, 1)[0]; photons.push({ x: m.x, y: m.y, dir: p.dir, v: 150, st: 'fly' }); m.glow = 1; }
      }
    }
  }
  let photAcc = 0;
  function updatePhotons(dt) {
    const bc = budgetC(S.dT, S.N, S.iceS), W = 6;
    if (S.mode === 'emit') { photons.length = 0; return; }
    const rate = 5 * bc.Rs / K.RS;
    photAcc += dt * rate;
    const alive = mols.filter((m) => m.tgt === 1 && m.y > 150 && m.y < 360);
    while (photAcc >= 1) {
      photAcc -= 1;
      if (photons.length > 60) break;
      const pa = (bc.Rs - W) / bc.Rs;
      if (Math.random() < pa && alive.length) {
        const m = alive[Math.floor(Math.random() * alive.length)];
        photons.push({ x: m.x, y: G.atmBot - 2, dir: -1, v: 160, st: 'up', target: m });
      } else photons.push({ x: rnd(262, 500), y: G.atmBot - 2, dir: -1, v: 160, st: 'fly' });
    }
    for (let i = photons.length - 1; i >= 0; i--) {
      const p = photons[i];
      if (p.st === 'up' && p.target) {
        p.y -= p.v * dt; p.x = p.target.x;
        if (p.y <= p.target.y || p.target.tgt === 0) {
          const m = p.target; m.glow = 1; photons.splice(i, 1);
          // 대기가 내보내는 복사(되돌아오는 복사 B + 우주로 가는 복사)를 흡수한 광자 수로 나눈 만큼 다시 내보내요
          const back = bc.B, up = bc.O - W, absorbed = bc.Rs - W;
          const rr = Math.max(0.2, (back + up) / absorbed), fd = back / (back + up);
          let n = Math.floor(rr) + (Math.random() < rr - Math.floor(rr) ? 1 : 0);
          for (let k = 0; k < n; k++) m.pend.push({ t: 0.18 + 0.2 * k + Math.random() * 0.25, dir: Math.random() < fd ? 1 : -1 });
        }
        continue;
      }
      p.y += p.dir * p.v * dt;
      if (p.y < -20) photons.splice(i, 1);
      else if (p.y >= G.atmBot) {
        // 지표에 도달: 지표가 데워져요
        if (!RM) for (let k = 0; k < 2; k++) parts.emit({ x: p.x, y: G.atmBot + 2, vx: rnd(-30, 30), vy: rnd(-50, -15), life: 0.5, size: 2.4, color: '#fb7185', gravity: 80, shape: 'circle' });
        photons.splice(i, 1);
      }
    }
  }
  /* 분자 그리기 */
  function drawMol(m) {
    const s = m.s; if (s < 0.02) return;
    ctx.save(); ctx.translate(m.x, m.y); ctx.rotate(m.rot * 0.6); ctx.scale(s, s);
    if (m.glow > 0) { ctx.globalAlpha = m.glow; D.glow(0, 0, 22, '#fb7185', 0.85); ctx.globalAlpha = 1; }
    if (m.kind === 'co2') {
      D.sphere(-8, 0, 5, '#ef4444', { gloss: false }); D.sphere(8, 0, 5, '#ef4444', { gloss: false }); D.sphere(0, 0, 6, '#475569', { gloss: true });
    } else {
      D.sphere(-5.5, 5, 3.6, '#f8fafc', { gloss: false, dark: '#cbd5e1' }); D.sphere(5.5, 5, 3.6, '#f8fafc', { gloss: false, dark: '#cbd5e1' }); D.sphere(0, -1, 6, '#38bdf8', { gloss: true });
    }
    ctx.restore();
  }
  /* 광자 그리기 (물결 모양 짧은 선) */
  function drawPhoton(p) {
    const L = 17, amp = 2.6;
    ctx.save(); ctx.strokeStyle = '#e11d48'; ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.beginPath();
    for (let s = 0; s <= L; s += 2) { const yy = p.y + (s - L / 2); const xx = p.x + amp * Math.sin(s / 17 * TAU * 1.5 + p.y * 0.2); s === 0 ? ctx.moveTo(xx, yy) : ctx.lineTo(xx, yy); }
    ctx.stroke(); ctx.restore();
  }

  /* ======================================================
     화살표 · 태그
     ====================================================== */
  /* 굵기가 값에 비례하는 직선 화살표 (+ 흐름 점선) */
  function flowArrow(x1, y1, x2, y2, v, col, t, o) {
    o = o || {};
    const w = wid(v), head = 15 + w * 0.9;
    ctx.save(); ctx.globalAlpha = o.alpha == null ? 1 : o.alpha;
    D.arrow(x1, y1, x2, y2, { color: col, width: w, head });
    const L = Math.hypot(x2 - x1, y2 - y1), ux = (x2 - x1) / L, uy = (y2 - y1) / L;
    if (L > head + 10) {
      ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = Math.max(1.4, w * 0.2); ctx.lineCap = 'butt';
      ctx.setLineDash([6, 12]); ctx.lineDashOffset = RM ? 0 : -(S.clock * 46);
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2 - ux * head, y2 - uy * head); ctx.stroke(); ctx.setLineDash([]);
    }
    ctx.restore();
  }
  /* 물결치는 화살표 (적외선 · 증발) */
  function wavyArrow(x1, y1, x2, y2, v, col, t, o) {
    o = o || {};
    const w = wid(v), head = 15 + w * 0.9;
    const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
    const body = Math.max(0, L - head * 0.85), amp = o.amp != null ? o.amp : 3.2, wl = 24, ph = RM ? 0 : (t * 70) / wl * TAU;
    ctx.save(); ctx.globalAlpha = o.alpha == null ? 1 : o.alpha;
    ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath();
    for (let s = 0; s <= body; s += 3) {
      const off = amp * Math.sin(s / wl * TAU - ph);
      const px = x1 + ux * s + nx * off, py = y1 + uy * s + ny * off;
      s === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.fillStyle = col; ctx.beginPath();
    ctx.moveTo(x2, y2); ctx.lineTo(x2 - ux * head + nx * head * 0.62, y2 - uy * head + ny * head * 0.62); ctx.lineTo(x2 - ux * head - nx * head * 0.62, y2 - uy * head - ny * head * 0.62);
    ctx.closePath(); ctx.fill(); ctx.restore();
  }
  /* 이름 + 숫자 태그 */
  function tag(x, y, name, valStr, o) {
    o = o || {};
    ctx.save(); ctx.font = D.font(13, 800);
    const lines = String(name).split('\n'), nw = Math.max.apply(null, lines.map((l) => ctx.measureText(l).width));
    ctx.font = D.font(17, 800); const vw = ctx.measureText(valStr).width;
    const w = Math.max(nw, vw, 34) + 16, lh = 14 * FS, h = lines.length * lh + 26 * FS * 0.82 + 6;
    const ch = o.changed;
    D.shadow(() => { ctx.fillStyle = ch ? '#fff3d1' : 'rgba(255,255,255,.95)'; rr(x - w / 2, y - h / 2, w, h, 11).fill(); }, { blur: 5, y: 2 });
    ctx.strokeStyle = o.col || '#94a3b8'; ctx.lineWidth = ch ? 2.8 : 2; rr(x - w / 2, y - h / 2, w, h, 11).stroke();
    lines.forEach((l, i) => D.text(x, y - h / 2 + 4 + (i + 0.82) * lh - 1, l, { size: 13, weight: 800, color: o.col || '#475569' }));
    D.text(x, y + h / 2 - 8, valStr, { size: 17, weight: 800, color: '#0f172a' });
    ctx.restore();
    return { w, h };
  }
  /* 칸 위에 이름만 쓰기 (카드가 놓이는 칸) */
  function slotName(id, dark) {
    const s = SLOT[id], lines = s.name.split(' ');
    const txt = s.two ? ['되돌아오는', '복사'] : [s.name];
    txt.forEach((l, i) => D.text(s.x, s.y - 26 - (txt.length - 1 - i) * 15 * FS, l, { size: 13.5, weight: 800, color: dark ? '#fff7d6' : s.col, stroke: dark ? 'rgba(15,23,42,.65)' : 'rgba(255,255,255,.9)', strokeWidth: 4 }));
  }

  /* ======================================================
     배경: 우주 · 대기 · 지표
     ====================================================== */
  function drawBackdrop(t) {
    // 우주
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, DW, G.atmTop); ctx.clip();
    D.space(0, 0, DW, G.atmTop, t, { stars: 38, top: '#26397a', bottom: '#0a1030' });
    ctx.restore();
    // 대기
    const ag = ctx.createLinearGradient(0, G.atmTop, 0, G.atmBot);
    ag.addColorStop(0, '#9cc4ee'); ag.addColorStop(0.55, '#bfe0fb'); ag.addColorStop(1, '#e3f2fd');
    ctx.fillStyle = ag; ctx.fillRect(0, G.atmTop, DW, G.atmBot - G.atmTop);
    // 대기 경계선
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2; ctx.setLineDash([8, 7]); ctx.beginPath(); ctx.moveTo(0, G.atmTop); ctx.lineTo(DW, G.atmTop); ctx.stroke(); ctx.setLineDash([]);
    D.text(12, G.atmTop - 8, '우주', { size: 13.5, color: '#c7d2fe', align: 'left', weight: 800 });
    D.text(12, G.atmTop + 20, '대기', { size: 14, color: '#1e3a8a', align: 'left', weight: 800 });
    // 구름 몇 개
    [[330, 150], [520, 190]].forEach(([cx, cy], i) => { ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.ellipse(cx, cy, 52, 14, 0, 0, TAU); ctx.ellipse(cx - 24, cy - 8, 26, 14, 0, 0, TAU); ctx.ellipse(cx + 22, cy - 7, 24, 12, 0, 0, TAU); ctx.fill(); });
    // 지표: 땅 + 바다
    const gy = G.atmBot, gh = DH - gy;
    const lg = ctx.createLinearGradient(0, gy, 0, gy + gh); lg.addColorStop(0, '#7cc576'); lg.addColorStop(0.14, '#5aa95a'); lg.addColorStop(0.15, '#b98d5a'); lg.addColorStop(1, '#8a6238');
    ctx.fillStyle = lg; ctx.fillRect(0, gy, 330, gh);
    const og = ctx.createLinearGradient(0, gy, 0, gy + gh); og.addColorStop(0, '#38a3d8'); og.addColorStop(1, '#0b4f8a');
    ctx.fillStyle = og; ctx.fillRect(330, gy, DW - 330, gh);
    // 파도
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 2; ctx.beginPath();
    for (let x = 330; x <= DW; x += 4) { const y = gy + 3 + 2.2 * Math.sin(x / 14 + (RM ? 0 : t * 2.2)); x === 330 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
    ctx.stroke();
    // 나무
    [[198, 0.9], [244, 1.1], [296, 0.85]].forEach(([x, s]) => { ctx.fillStyle = '#7a5230'; ctx.fillRect(x - 2.5 * s, gy - 8 * s, 5 * s, 10 * s); D.sphere(x, gy - 16 * s, 11 * s, '#2f9e57', { gloss: true }); });
    // 빙하 (기온이 오를수록, 빙하 되먹임이 켜져 있을 때 줄어들어요)
    const iceF = clamp(1 - K.ICE_MELT * S.iceS * S.dT, 0.15, 1), iw = 118 * iceF;
    D.shadow(() => { ctx.fillStyle = '#f1f9ff'; rr(6, gy - 15, iw, 19, 8).fill(); }, { blur: 4, y: 1 });
    ctx.fillStyle = 'rgba(147,197,253,.6)'; rr(10, gy - 8, Math.max(0, iw - 8), 6, 3).fill();
    D.text(8, gy + 24, '얼음', { size: 13, color: '#f8fafc', align: 'left', weight: 800, stroke: 'rgba(30,64,40,.55)', strokeWidth: 3 });
    D.text(DW - 10, gy + 24, '바다', { size: 13, color: '#e0f2fe', align: 'right', weight: 800, stroke: 'rgba(7,50,92,.5)', strokeWidth: 3 });
    // 따뜻한 정도에 따라 지표에 붉은 기운
    const warm = clamp(S.dT / 3.5, 0, 1);
    if (warm > 0.01) { const wg = ctx.createLinearGradient(0, gy - 30, 0, gy + 50); wg.addColorStop(0, 'rgba(244,63,94,0)'); wg.addColorStop(0.5, 'rgba(244,63,94,' + (0.32 * warm) + ')'); wg.addColorStop(1, 'rgba(244,63,94,0)'); ctx.fillStyle = wg; ctx.fillRect(0, gy - 30, DW, 80); }
    // 태양
    D.glow(G.sun.x, G.sun.y, 56, '#fde68a', 0.7);
    if (!RM) for (let i = 0; i < 10; i++) { const a = i / 10 * TAU + t * 0.3; ctx.strokeStyle = 'rgba(253,224,71,.8)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(G.sun.x + Math.cos(a) * 31, G.sun.y + Math.sin(a) * 31); ctx.lineTo(G.sun.x + Math.cos(a) * 40, G.sun.y + Math.sin(a) * 40); ctx.stroke(); }
    D.sphere(G.sun.x, G.sun.y, G.sun.r, '#fbbf24', { light: '#fff7ae', dark: '#f59e0b' });
  }

  /* ======================================================
     열수지 다이어그램 (값은 모두 budgetC / budgetI에서)
     ====================================================== */
  const prevTag = {};
  function drawDiagram(t, withBoard) {
    drawBackdrop(t);
    const bc = budgetC(S.dT, S.N, S.iceS), bi = budgetI(S.dT, S.N, S.iceS);
    // 분자
    mols.forEach(drawMol);
    // 증발 입자
    // 태양 복사 (왼쪽): 입사 → 반사 + 대기 흡수 + 지표 흡수
    flowArrow(66, 58, G.P.x, G.P.y, K.IN, COL.sun, t);
    flowArrow(G.P.x, G.P.y, 262, 22, bc.R, COL.sunL, t);
    flowArrow(G.beamX, G.P.y, G.beamX, G.Qy, K.IN - bc.R, COL.sun, t);
    flowArrow(G.beamX, G.Qy, 56, G.Qy, bc.Aa, '#f97316', t);
    flowArrow(G.beamX, G.Qy, G.beamX, G.atmBot - 2, bc.Sa, COL.sun, t);
    // 적외선 (오른쪽)
    wavyArrow(G.xRs, G.atmBot - 2, G.xRs, G.rsTop, bc.Rs, COL.ir, t);
    wavyArrow(G.xB, G.rsTop, G.xB, G.atmBot - 2, bc.B, COL.back, t);
    wavyArrow(G.xO, G.rsTop, G.xO, G.topY, bc.O, COL.ir, t);
    wavyArrow(G.xE, G.atmBot - 6, G.xE, 292, bc.E, '#38bdf8', t, { amp: 2.4 });
    flowArrow(G.xC, G.atmBot - 6, G.xC, 326, bc.C, COL.conv, t);
    // 적외선 광자
    photons.forEach(drawPhoton);
    // 이름표 · 숫자 태그
    const ch = (id) => bi[id] !== BASE[id];
    if (!withBoard) {
      SLOT_IDS.forEach((id) => { const s = SLOT[id]; tag(s.x, s.y, s.two ? '되돌아오는\n복사' : s.name, String(bi[id]), { col: s.col, changed: ch(id) }); });
    } else {
      SLOT_IDS.forEach((id) => slotName(id, SLOT[id].dark));
    }
    tag(FIXED.IN.x, FIXED.IN.y, '입사', String(K.IN), { col: FIXED.IN.col });
    tag(FIXED.E.x, FIXED.E.y, '증발', String(bi.E), { col: FIXED.E.col, changed: ch('E') });
    tag(FIXED.C.x, FIXED.C.y, '대류·전도', String(bi.C), { col: FIXED.C.col });
    // 범례
    legend(14, 372);
  }
  function legend(x, y) {
    D.sphere(x + 8, y - 4, 6, '#475569', { gloss: false }); D.text(x + 20, y, 'CO₂', { size: 13, align: 'left', color: '#1e293b', weight: 800 });
    D.sphere(x + 66, y - 4, 6, '#38bdf8', { gloss: false }); D.text(x + 78, y, '수증기', { size: 13, align: 'left', color: '#1e293b', weight: 800 });
  }

  /* ======================================================
     오른쪽(휴대폰은 아래) 패널: 온도계 · 불균형 막대 · 기온 그래프
     ====================================================== */
  const PL = PHONE
    ? { th: { x: 70, y: PAN.y + 48, h: 120 }, bar: { x: 160, y: PAN.y + 56, w: 40, h: 130 }, g: { x: 262, y: PAN.y + 34, w: 322, h: 206 }, txt: PAN.y + 238 }
    : { th: { x: PAN.x + 72, y: 64, h: 172 }, bar: { x: PAN.x + 140, y: 76, w: 38, h: 164 }, g: { x: PAN.x + 18, y: 350, w: 168, h: 176 }, txt: 296 };
  const TMAX = 4;
  const yOfT = (v) => PL.th.y + PL.th.h - (PL.th.h - 10) * (clamp(v, 0, TMAX) / TMAX);
  function panelCard(title) {
    D.shadow(() => { ctx.fillStyle = 'rgba(255,255,255,.96)'; rr(PAN.x + 6, PAN.y + 8, PAN.w - 12, PAN.h - 16, 14).fill(); }, { blur: 6, y: 2 });
    if (title) D.text(PAN.x + 16, PAN.y + 32, title, { size: 15, weight: 800, color: '#334155', align: 'left' });
  }
  function drawPanelClimate(t) {
    panelCard('');
    const th = PL.th, br = PL.bar, g = PL.g;
    D.text(th.x, PAN.y + 32, '지표 기온', { size: 14.5, weight: 800, color: '#334155' });
    D.text(br.x + br.w / 2, PAN.y + 32, '불균형', { size: 14.5, weight: 800, color: '#334155' });
    // 온도계 (산업화 이전 대비 기온 변화)
    D.thermometer(th.x, th.y, th.h, thSpring.value, 0, TMAX, { step: 1, unit: '°', color: thSpring.value > 2.2 ? '#dc2626' : '#ef4444' });
    const eq = nowEq(), ye = yOfT(eq);
    ctx.save(); ctx.strokeStyle = '#7c3aed'; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(th.x - 14, ye); ctx.lineTo(th.x + 12, ye); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#7c3aed'; ctx.beginPath(); ctx.moveTo(th.x - 11, ye); ctx.lineTo(th.x - 22, ye - 6); ctx.lineTo(th.x - 22, ye + 6); ctx.closePath(); ctx.fill(); ctx.restore();
    // 불균형 막대 (들어오는 − 나가는)
    const cy = br.y + br.h / 2, sc = (br.h / 2) / 1.2, v = clamp(S.ndSpring.value, -1.2, 1.2);
    ctx.fillStyle = '#eef2f7'; rr(br.x, br.y, br.w, br.h, 10).fill(); ctx.strokeStyle = '#c3ccd9'; ctx.lineWidth = 2; rr(br.x, br.y, br.w, br.h, 10).stroke();
    ctx.save(); rr(br.x, br.y, br.w, br.h, 10).clip();
    ctx.fillStyle = v >= 0 ? '#f97316' : '#3b82f6'; ctx.fillRect(br.x, v >= 0 ? cy - v * sc : cy, br.w, Math.abs(v) * sc);
    ctx.restore();
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(br.x - 6, cy); ctx.lineTo(br.x + br.w + 6, cy); ctx.stroke();
    D.text(br.x - 8, br.y + 14, '+', { size: 15, color: '#c2410c', align: 'right', weight: 800 }); D.text(br.x - 9, cy + 5, '0', { size: 13, color: '#475569', align: 'right', weight: 800 }); D.text(br.x - 8, br.y + br.h - 3, '−', { size: 15, color: '#1d4ed8', align: 'right', weight: 800 });
    // 수치
    D.text(th.x + 4, PL.txt, '지금 ' + sg1(S.dT) + ' °C', { size: 15, weight: 800, color: '#b91c1c' });
    D.text(th.x + 4, PL.txt + 20 * FS * 0.95, '평형 ' + sg1(eq) + ' °C', { size: 14, weight: 800, color: '#7c3aed' });
    D.text(br.x + br.w / 2, PL.txt, sg1(S.N), { size: 15, weight: 800, color: '#0f172a' });
    // 기온 그래프
    ctx.fillStyle = '#f8fafc'; rr(g.x, g.y, g.w, g.h, 10).fill(); ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1.5; rr(g.x, g.y, g.w, g.h, 10).stroke();
    const px0 = g.x + 34, px1 = g.x + g.w - 10, py0 = g.y + 20, py1 = g.y + g.h - 28;
    const tw = 16, t1 = Math.max(tw, S.t), t0 = t1 - tw;
    const gx = (tt) => px0 + (px1 - px0) * ((tt - t0) / tw), gy = (v) => py1 - (py1 - py0) * clamp(v / TMAX, 0, 1);
    D.text(g.x + 12, g.y + 15, '기온 변화(°C)', { size: 12.5, weight: 800, color: '#475569', align: 'left' });
    for (let k = 0; k <= TMAX; k++) { const yy = gy(k); ctx.strokeStyle = k === 0 ? '#64748b' : '#e2e8f0'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(px0, yy); ctx.lineTo(px1, yy); ctx.stroke(); D.text(px0 - 6, yy + 4.5, String(k), { size: 12.5, color: '#64748b', align: 'right', weight: 700 }); }
    D.text((px0 + px1) / 2, g.y + g.h - 8, '시간 →', { size: 12.5, color: '#64748b', weight: 700 });
    ctx.save(); ctx.beginPath(); ctx.rect(px0, py0 - 6, px1 - px0, py1 - py0 + 12); ctx.clip();
    ctx.strokeStyle = '#7c3aed'; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(px0, gy(eq)); ctx.lineTo(px1, gy(eq)); ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = '#e11d48'; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.beginPath(); let first = true;
    S.hist.forEach((h) => { if (h.t < t0 - 0.2) return; const x = gx(h.t), y = gy(h.dT); first ? ctx.moveTo(x, y) : ctx.lineTo(x, y); first = false; });
    ctx.lineTo(gx(S.t), gy(S.dT)); ctx.stroke(); ctx.restore();
    D.sphere(clamp(gx(S.t), px0, px1), gy(S.dT), 5, '#e11d48', { gloss: false });
  }

  /* ======================================================
     STEP 1 : 숫자 카드 보드
     ====================================================== */
  const TRAY = PHONE ? { x: 10, y: PAN.y + 40, w: 250, cols: 4 } : { x: PAN.x + 10, y: 52, w: 184, cols: 3 };
  const board = new Board({
    zones: SLOT_IDS.map((id) => ({ id, x: SLOT[id].x - 31, y: SLOT[id].y - 19, w: 62, h: 38, center: true, cap: 1, color: SLOT[id].col, fill: 'rgba(255,255,255,.72)', line: '#94a3b8' })),
    tray: TRAY, cw: 56, ch: 34, gap: 8,
    onDrop: () => true,
    onPlace: () => { clearBad(); S.okFlash = 0; },
  });
  const CARD_VALUES = [114, 30, 92, 20, 60, 70, 50, 40];
  function initCards() {
    board.cards.length = 0; board.selected = null; board.drag = null;
    CARD_VALUES.forEach((v, i) => board.add({ id: 'n' + v, v, label: String(v), fill: '#fff7ed', border: '#f1c9a0', x: TRAY.x + 40, y: TRAY.y + 20 }));
    board.layout(true);
    S.solved = false; S.solveT = 0;
  }
  function clearBad() { board.cards.forEach((c) => { c.flagged = false; c.border = '#f1c9a0'; }); }
  const slotVal = (id) => { const c = board.inZone(id)[0]; return c ? c.v : null; };
  const EQS = [
    { n: '①', name: '우주 쪽', L: [K.IN], R: ['R', 'O'] },
    { n: '②', name: '입사 나누기', L: [K.IN], R: ['R', 'Aa', 'Sa'] },
    { n: '③', name: '지표 수지', L: ['Sa', 'B'], R: ['Rs', K.EVAP, K.CONV] },
    { n: '④', name: '대기 수지', L: ['Rs', 'Aa', K.EVAP, K.CONV], R: ['B', 'O'] },
  ];
  function evalEq(e) {
    const val = (x) => (typeof x === 'number' ? x : slotVal(x));
    const l = e.L.map(val), r = e.R.map(val);
    const known = l.concat(r).every((x) => x != null);
    const ls = l.reduce((a, b) => a + (b || 0), 0), rs = r.reduce((a, b) => a + (b || 0), 0);
    const txt = (arr) => arr.map((x) => (x == null ? '?' : String(x))).join(' + ');
    return { known, ok: known && ls === rs, text: txt(l) + ' = ' + txt(r), ls, rs };
  }
  function drawEquations() {
    const x0 = PHONE ? 276 : PAN.x + 16, y0 = PHONE ? PAN.y + 32 : 238, w = PHONE ? 310 : 172;
    D.text(x0, y0, '합계 확인', { size: 15, weight: 800, color: '#334155', align: 'left' });
    let y = y0 + 22 * FS * 0.95;
    EQS.forEach((e, i) => {
      const r = evalEq(e), col = r.ok ? '#15803d' : r.known ? '#dc2626' : '#475569';
      D.text(x0, y, e.n + ' ' + e.name + ' ' + (r.ok ? '✅' : r.known ? '❌' : ''), { size: 13.5, weight: 800, color: col, align: 'left' });
      const lines = r.text.length > 22 ? r.text.split(' = ').map((s, k) => (k ? '= ' : '') + s) : [r.text]; lines.forEach((l, j) => D.text(x0 + 4, y + 17 * FS * 0.95 + j * 17 * FS * 0.95, l, { size: 14, weight: 800, color: col, align: 'left' }));
      y += (lines.length * 17 + 30) * FS * 0.95 * (PHONE ? 0.9 : 1);
    });
  }
  function drawPanelBudget(t) {
    panelCard('');
    D.text(PHONE ? 135 : PAN.x + 100, PAN.y + 32, '숫자 카드', { size: 15, weight: 800, color: '#334155' });
    // 카드 놓는 자리
    const rows = Math.ceil(CARD_VALUES.length / TRAY.cols), th = rows * 34 + (rows - 1) * 8 + 10;
    ctx.fillStyle = '#fef3e2'; rr(TRAY.x - 4, TRAY.y - 6, TRAY.w + 8, th, 12).fill();
    drawEquations();
  }
  /* 미션 1 확인: 모든 칸이 알맞은 숫자인지 */
  function checkBudgetBoard() {
    const un = SLOT_IDS.filter((id) => slotVal(id) == null);
    if (un.length) return '아직 비어 있는 칸이 <b>' + un.length + '곳</b> 있어요. 숫자 카드를 모두 놓아 보세요.';
    const wrong = SLOT_IDS.filter((id) => slotVal(id) !== SLOT[id].ans);
    wrong.forEach((id) => { const c = board.inZone(id)[0]; if (!c.flagged) { c.flagged = true; c.border = '#e2464b'; c.shake = 0.45; } });
    if (wrong.length) {
      const bad = EQS.filter((e) => !evalEq(e).ok).map((e) => e.n);
      return '숫자가 맞지 않는 칸이 있어요(빨간 테두리). ' + (bad.length ? '오른쪽 <b>합계 확인</b>에서 ❌인 식(' + bad.join(', ') + ')을 보며 고쳐 보세요.' : '입사 100 = 반사 30 + 우주로 방출임을 떠올려 보세요.');
    }
    if (!S.solved) {
      S.solved = true; S.solveT = S.clock;
      SLOT_IDS.forEach((id) => parts.burst(SLOT[id].x, SLOT[id].y, { count: 8, speed: 110, size: 3, life: 0.7 }));
    }
    return true;
  }

  /* ======================================================
     STEP 4 : 배출과 흡수 (2025 → 2100)
     ====================================================== */
  const EM = PHONE
    ? { sch: { x: 6, y: 6, w: 588, h: 246 }, g1: { x: 8, y: 262, w: 584, h: 274 }, g2: { x: 8, y: 546, w: 584, h: 284 },
        fac: { x: 20, y: 104 }, cloud: { x: 300, y: 92, w: 230, h: 112 }, sinks: [{ x: 142, y: 212 }, { x: 310, y: 212 }, { x: 490, y: 212 }] }
    : { sch: { x: 8, y: 8, w: 784, h: 196 }, g1: { x: 10, y: 214, w: 386, h: 336 }, g2: { x: 404, y: 214, w: 386, h: 336 },
        fac: { x: 28, y: 44 }, cloud: { x: 330, y: 62, w: 230, h: 92 }, sinks: [{ x: 220, y: 166 }, { x: 330, y: 166 }, { x: 440, y: 166 }] };
  const EV = { c: new Array(K.Y1 - K.Y0 + 1).fill(K.CNOW), T: new Array(K.Y1 - K.Y0 + 1).fill(K.OBS), init: false };
  function emitRecalc(jump) {
    S.run = emitRun(S.e, S.forest);
    if (jump || !EV.init) { S.run.forEach((r, i) => { EV.c[i] = r.c; EV.T[i] = r.T; }); EV.init = true; }
  }
  const finalT = () => n1(S.run[S.run.length - 1].T);          // 화면에 보이는 2100년 기온 상승
  const finalC = () => Math.round(S.run[S.run.length - 1].c);
  function runAt(yr) { const i = clamp(Math.round(yr - K.Y0), 0, S.run.length - 1); return S.run[i]; }
  function stepEmit(dt) {
    const n = S.run.length;
    for (let i = 0; i < n; i++) { EV.c[i] = approach(EV.c[i], S.run[i].c, dt, 9); EV.T[i] = approach(EV.T[i], S.run[i].T, dt, 9); }
    if (S.yrPlay) { S.yr += dt * 14; if (S.yr >= K.Y1) { S.yr = K.Y1; S.yrPlay = false; } }
  }
  function replayEmit() { S.yr = K.Y0; S.yrPlay = true; }

  function lineGraph(R, o) {
    ctx.fillStyle = '#fff'; rr(R.x, R.y, R.w, R.h, 14).fill(); ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1.5; rr(R.x, R.y, R.w, R.h, 14).stroke();
    D.text(R.x + 14, R.y + 24, o.title, { size: 15, weight: 800, color: '#334155', align: 'left' });
    const x0 = R.x + 56, x1 = R.x + R.w - 18, y0 = R.y + 44, y1 = R.y + R.h - 36;
    const gx = (yr) => x0 + (x1 - x0) * ((yr - K.Y0) / (K.Y1 - K.Y0)), gy = (v) => y1 - (y1 - y0) * clamp((v - o.min) / (o.max - o.min), 0, 1);
    for (let v = o.min; v <= o.max + 1e-6; v += o.step) {
      const yy = gy(v); ctx.strokeStyle = v === o.min ? '#64748b' : '#e8edf3'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(x0, yy); ctx.lineTo(x1, yy); ctx.stroke();
      D.text(x0 - 8, yy + 4.5, String(Math.round(v * 10) / 10), { size: 13, color: '#64748b', align: 'right', weight: 700 });
    }
    [2025, 2050, 2075, 2100].forEach((yr) => { const xx = gx(yr); ctx.strokeStyle = '#e8edf3'; ctx.beginPath(); ctx.moveTo(xx, y0); ctx.lineTo(xx, y1); ctx.stroke(); D.text(xx, y1 + 18 * FS * 0.9, String(yr), { size: 13, color: '#64748b', weight: 700 }); });
    (o.refs || []).forEach((r) => { const yy = gy(r.v); ctx.strokeStyle = r.col; ctx.lineWidth = 2; ctx.setLineDash([7, 5]); ctx.beginPath(); ctx.moveTo(x0, yy); ctx.lineTo(x1, yy); ctx.stroke(); ctx.setLineDash([]); D.text(r.left ? x0 + 6 : x1 - 4, yy - 6, r.label, { size: 13, color: r.col, align: r.left ? 'left' : 'right', weight: 800 }); });
    ctx.save(); ctx.beginPath(); ctx.rect(x0 - 2, y0 - 8, x1 - x0 + 4, y1 - y0 + 12); ctx.clip();
    // 지금까지 지나온 해는 진하게, 앞으로 갈 해는 연하게
    const yrI = clamp(Math.round(S.yr - K.Y0), 0, o.data.length - 1);
    ctx.lineJoin = 'round'; ctx.lineWidth = 3.4;
    ctx.strokeStyle = o.col; ctx.globalAlpha = 0.28; ctx.beginPath(); o.data.forEach((v, i) => { const x = gx(K.Y0 + i), y = gy(v); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke(); ctx.globalAlpha = 1;
    ctx.beginPath(); for (let i = 0; i <= yrI; i++) { const x = gx(K.Y0 + i), y = gy(o.data[i]); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke();
    ctx.restore();
    const mx = gx(K.Y0 + yrI), my = gy(o.data[yrI]);
    ctx.strokeStyle = 'rgba(71,85,105,.5)'; ctx.lineWidth = 1.5; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(mx, y0); ctx.lineTo(mx, y1); ctx.stroke(); ctx.setLineDash([]);
    D.sphere(mx, my, 6, o.col, { gloss: false, outline: '#fff', outlineWidth: 2 });
    // 2100년 값
    const ex = gx(K.Y1), ey = gy(o.data[o.data.length - 1]);
    D.sphere(ex, ey, 5, o.col, { gloss: false, outline: '#fff', outlineWidth: 2 });
    D.label(clamp(ex - 36, x0 + 30, x1 - 44), clamp(ey - 22, y0 + 8, y1 - 10), o.endLabel, { bg: o.col, size: 14, pad: 7 });
    D.text(R.x + R.w - 14, R.y + 24, o.unit, { size: 13, weight: 700, color: '#64748b', align: 'right' });
  }
  /* 공장 그림 */
  function drawFactory(x, y, t) {
    D.shadow(() => { ctx.fillStyle = '#64748b'; rr(x, y + 28, 86, 52, 6).fill(); }, { blur: 6, y: 3 });
    ctx.fillStyle = '#475569'; ctx.fillRect(x + 12, y - 10, 14, 40); ctx.fillRect(x + 44, y - 22, 14, 52);
    ctx.fillStyle = '#334155'; ctx.fillRect(x + 10, y - 12, 18, 6); ctx.fillRect(x + 42, y - 24, 18, 6);
    ctx.fillStyle = '#fde68a'; [0, 1, 2].forEach((i) => ctx.fillRect(x + 12 + i * 26, y + 42, 16, 14));
    D.text(x + 43, y + 100, '배출', { size: 14, weight: 800, color: '#334155' });
  }
  function drawEmit(t) {
    const Sc = EM.sch, r = runAt(S.yr), e = r.e;
    // 배경: 하늘 판
    const sg = ctx.createLinearGradient(0, Sc.y, 0, Sc.y + Sc.h); sg.addColorStop(0, '#cfe6fb'); sg.addColorStop(1, '#eaf4fd');
    ctx.fillStyle = sg; rr(Sc.x, Sc.y, Sc.w, Sc.h, 16).fill();
    ctx.fillStyle = '#7cc576'; ctx.save(); rr(Sc.x, Sc.y, Sc.w, Sc.h, 16).clip(); ctx.fillRect(Sc.x, Sc.y + Sc.h - (PHONE ? 70 : 34), Sc.w, 80); ctx.restore();
    const natural = K.SINK_K * (r.c - K.C0) * K.GT_PPM, ocean = natural / 2, land = natural / 2, rest = S.forest;
    const sink = natural + rest, net = e - sink;
    const fac = EM.fac; drawFactory(fac.x, fac.y, t);
    const cl = EM.cloud;
    // 대기(구름): 이산화 탄소 입자 수는 농도에 비례
    const dots = Math.round((r.c - 250) / 8);
    D.shadow(() => { ctx.fillStyle = 'rgba(255,255,255,.92)'; ctx.beginPath(); ctx.ellipse(cl.x, cl.y, cl.w / 2, cl.h / 2, 0, 0, TAU); ctx.ellipse(cl.x - 70, cl.y + 8, 60, 38, 0, 0, TAU); ctx.ellipse(cl.x + 72, cl.y + 6, 58, 36, 0, 0, TAU); ctx.fill(); }, { blur: 8, y: 3 });
    for (let i = 0; i < dots; i++) {
      const lobe = i % 2 ? 1 : -1, k = Math.floor(i / 2), a = k * 2.399 + t * 0.15 * lobe, rr0 = Math.sqrt((k + 0.5) / 30) * 40;
      D.sphere(cl.x + lobe * 76 + Math.cos(a) * rr0 * 1.1, cl.y + 10 + Math.sin(a) * rr0 * 0.8, 3.2, '#64748b', { gloss: false });
    }
    D.text(cl.x, cl.y - 24, '대기 CO₂', { size: 14, weight: 800, color: '#334155' });
    D.text(cl.x, cl.y - 4, Math.round(r.c) + ' ppm', { size: 21, weight: 800, color: '#0f172a' });
    // 연도
    D.label(Sc.x + Sc.w - 56, Sc.y + (PHONE ? 22 : 176), Math.round(K.Y0 + clamp(Math.round(S.yr - K.Y0), 0, K.Y1 - K.Y0)) + '년', { bg: '#1e293b', size: 15, pad: 9 });
    if (!PHONE) {
      const cx0 = 552, cy1 = 36, cw = 226, ch2 = 140;
      D.shadow(() => { ctx.fillStyle = 'rgba(255,255,255,.95)'; rr(cx0, cy1, cw, ch2, 14).fill(); }, { blur: 6, y: 2 });
      D.text(cx0 + 14, cy1 + 26, '이 해의 이산화 탄소 수지', { size: 14, weight: 800, color: '#334155', align: 'left' });
      const rows = [['배출', (Math.round(e * 10) / 10).toFixed(1), '#475569'], ['− 흡수', (Math.round(sink * 10) / 10).toFixed(1), '#15803d']];
      rows.forEach((rw, i) => { D.text(cx0 + 14, cy1 + 54 + i * 26, rw[0], { size: 15, weight: 800, color: rw[2], align: 'left' }); D.text(cx0 + cw - 14, cy1 + 54 + i * 26, rw[1], { size: 17, weight: 800, color: '#0f172a', align: 'right' }); });
      ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx0 + 12, cy1 + 92); ctx.lineTo(cx0 + cw - 12, cy1 + 92); ctx.stroke();
      D.text(cx0 + 14, cy1 + 118, '= 대기에 쌓임', { size: 15, weight: 800, color: net > 0.05 ? '#dc2626' : '#2563eb', align: 'left' });
      D.text(cx0 + cw - 14, cy1 + 118, (net >= 0 ? '+' : '−') + Math.abs(Math.round(net * 10) / 10).toFixed(1), { size: 18, weight: 800, color: net > 0.05 ? '#dc2626' : '#2563eb', align: 'right' });
    }
    // 배출 화살표 (공장 → 대기), 굵기는 배출량에 비례
    const ax1 = PHONE ? fac.x + 100 : fac.x + 96, ay1 = PHONE ? fac.y + 10 : fac.y + 8;
    flowArrow(ax1, ay1, cl.x - 118, cl.y - 10, e * 0.9, '#475569', t);
    D.label((ax1 + cl.x - 118) / 2, ay1 - 24, '배출 ' + Math.round(e) + ' Gt/년', { bg: '#475569', size: 14, pad: 8 });
    // 흡수 화살표 (대기 → 바다 · 육지 · 복원한 숲)
    const sk = EM.sinks, cy0 = cl.y + 42;
    const srcX = [cl.x - 70, cl.x, cl.x + 70];
    const vals = [ocean, land, rest], cols = ['#0284c7', '#15803d', '#16a34a'], names = ['바다', '육지', '복원한 숲'];
    sk.forEach((s, i) => {
      const v = vals[i];
      if (i === 2 && v < 0.05) { D.text(s.x, s.y - 4, '복원한 숲 없음', { size: 13, weight: 700, color: '#64748b' }); return; }
      const by = s.y - 30;
      flowArrow(PHONE ? srcX[i] : s.x, PHONE ? cy0 + 12 : cl.y + 36, s.x, by, v * 1.2, cols[i], t);
      D.label(s.x, s.y - 12, names[i] + ' ' + (Math.round(v * 10) / 10).toFixed(1), { bg: cols[i], size: 13.5, pad: 7 });
    });
    // 그림 속 아이콘 (바다 · 숲)
    const oc = sk[0], lc = sk[1], rc = sk[2];
    ctx.fillStyle = '#38a3d8'; rr(oc.x - 40, oc.y + (PHONE ? 8 : 4), 80, 26, 8).fill(); ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2; ctx.beginPath(); for (let x = oc.x - 40; x <= oc.x + 40; x += 4) { const y = oc.y + (PHONE ? 14 : 8) + 2 * Math.sin(x / 6 + t * 2); x === oc.x - 40 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke();
    [-24, 0, 24].forEach((dx) => { ctx.fillStyle = '#7a5230'; ctx.fillRect(lc.x + dx - 2, oc.y + (PHONE ? 22 : 16), 4, 12); D.sphere(lc.x + dx, oc.y + (PHONE ? 14 : 8), 11, '#2f9e57', { gloss: true }); });
    if (S.forest >= 0.05) [-16, 16].forEach((dx) => { ctx.fillStyle = '#7a5230'; ctx.fillRect(rc.x + dx - 2, oc.y + (PHONE ? 22 : 16), 4, 12); D.sphere(rc.x + dx, oc.y + (PHONE ? 14 : 8), 11, '#16a34a', { gloss: true }); });
    // 그래프 두 개
    lineGraph(EM.g1, { title: '대기 CO₂ 농도', unit: 'ppm', min: 250, max: 700, step: 150, data: EV.c, col: '#475569', endLabel: finalC() + ' ppm', refs: [{ v: K.CNOW, col: '#16a34a', label: '현재 ' + K.CNOW }] });
    lineGraph(EM.g2, { title: '산업화 이전 대비 기온 상승', unit: '°C', min: 0, max: 5, step: 1, data: EV.T, col: '#dc2626', endLabel: sg1(finalT()) + ' °C', refs: [{ v: K.TARGET, col: '#2563eb', label: '목표 ' + K.TARGET.toFixed(0) + ' °C', left: true }] });
  }

  /* ======================================================
     조작 · 화면 전환
     ====================================================== */
  const MODE_LABEL = { budget: '🌍 지구 열수지', gh: '☁️ 온실 기체가 늘면', fb: '🔁 되먹임 비교', emit: '🏭 배출과 흡수' };
  const MODE_LV = { budget: 0, gh: 1, fb: 2, emit: 3 };
  let game = null;
  const modeSeg = $('#modeSeg');
  const sCo2 = $('#sCo2'), oCo2 = $('#oCo2'), sEmit = $('#sEmit'), oEmit = $('#oEmit'), sForest = $('#sForest'), oForest = $('#oForest');
  const rCo2 = SciSim.bindRange(sCo2, oCo2, (v) => v + ' ppm', (v) => { S.c = v; });
  SciSim.bindRange(sEmit, oEmit, (v) => v + ' Gt/년', (v) => { S.e = v; emitRecalc(false); replayEmit(); });
  SciSim.bindRange(sForest, oForest, (v) => v + ' Gt/년', (v) => { S.forest = v; emitRecalc(false); replayEmit(); });

  function updateCtl() {
    $('#tbLabel').textContent = MODE_LABEL[S.mode];
    $$('#ctrlCard .control').forEach((c) => { c.hidden = !c.dataset.modes.split(' ').includes(S.mode) || (c.id === 'actBox' && !actOn); });
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    if (modeSeg) modeSeg.hidden = !(game && game.free);
    $$('#presets .opt').forEach((b) => b.classList.toggle('on', +b.dataset.c === S.c));
    $$('#fbBtns .opt').forEach((b) => b.classList.toggle('on', !!S[b.dataset.fb]));
    $$('#fbBtns .opt').forEach((b) => { b.textContent = (b.dataset.fb === 'vap' ? '💧 수증기 증가 ' : '🧊 빙하 감소 ') + (S[b.dataset.fb] ? '켬' : '끔'); });
    renderTable();
  }
  let actOn = false;
  function setSlider(input, out, v, fmt) { input.value = v; input.style.setProperty('--pct', ((v - input.min) / (input.max - input.min)) * 100 + '%'); out.textContent = fmt(v); }
  function setMode(m) {
    if (S.mode !== m) { S.fade = 1; parts.clear(); }
    S.mode = m; updateCtl();
  }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); enterLevel(MODE_LV[b.dataset.mode]); }));
  $$('#presets .opt').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.c = +b.dataset.c; setSlider(sCo2, oCo2, S.c, (v) => v + ' ppm'); updateCtl(); }));
  sCo2.addEventListener('input', () => updateCtl());
  $('#bRestart').addEventListener('click', () => { Sound.click(); resetClimate(K.C0, S.vap, S.ice); setSlider(sCo2, oCo2, K.C0, (v) => v + ' ppm'); updateCtl(); });
  $('#bResetCards').addEventListener('click', () => { Sound.click(); initCards(); });
  $$('#fbBtns .opt').forEach((b) => b.addEventListener('click', () => { Sound.click(); S[b.dataset.fb] = S[b.dataset.fb] ? 0 : 1; updateCtl(); }));
  $('#bFbRestart').addEventListener('click', () => { Sound.click(); resetClimate(K.C0, S.vap, S.ice); S.c = K.C2X; updateCtl(); });
  $('#bRecord').addEventListener('click', () => {
    if (!(S.c === K.C2X && settled() && nDisp() <= 0.1)) { Sound.fail(); say('아직 새 평형이 아니에요. 불균형이 0.0~0.1이 될 때까지 기다린 뒤 기록해요.', true); return; }
    Sound.success();
    // 표에는 '평형 값'을 적어요(불균형이 0.1 남은 지금 값이 아니라 불균형 0일 때의 기온·열수지)
    const dEq = nowEq(), bi = budgetI(dEq, 0, S.iceS), key = '' + S.vap + S.ice;
    S.rows[key] = { dT: n1(dEq), Rs: bi.Rs, E: bi.E, B: bi.B, R: bi.R };
    renderTable(); say('기록했어요! 되먹임 ' + (key === '00' ? '모두 끔' : key === '11' ? '모두 켬' : key === '10' ? '수증기만 켬' : '빙하만 켬') + ' → 평형 ' + sg1(dEq) + ' °C', false, 2.2);
  });
  $('#bReplay').addEventListener('click', () => { Sound.click(); replayEmit(); });

  /* 되먹임 비교표 */
  const ROWS = [['00', '모두 끔'], ['10', '수증기'], ['01', '빙하'], ['11', '모두 켬']];
  function renderTable() {
    const el = $('#fbTable'); if (!el) return;
    const cur = '' + S.vap + S.ice;
    el.innerHTML = '<table class="mini"><tr><th>되먹임</th><th>평형 기온</th><th>지표 복사</th><th>증발</th><th>되돌아옴</th></tr>' +
      ROWS.map(([k, n]) => {
        const r = S.rows[k], cls = k === cur ? ' class="now"' : '';
        return r ? '<tr><td' + cls + '>' + n + '</td><td' + cls + '>' + sg1(r.dT) + ' °C</td><td' + cls + '>' + r.Rs + '</td><td' + cls + '>' + r.E + '</td><td' + cls + '>' + r.B + '</td></tr>'
          : '<tr><td' + cls + '>' + n + '</td><td class="none" colspan="4">아직 기록 안 함</td></tr>';
      }).join('') + '</table>';
  }

  /* 내가 할 수 있는 일 (STEP 4) */
  const ACTS = [
    { t: '안 쓰는 전등과 플러그 끄기 (전기 절약)', ok: true },
    { t: '가까운 거리는 걷거나 대중교통·자전거로 이동하기', ok: true },
    { t: '재생 에너지 요금제와 고효율 가전 선택하기', ok: true },
    { t: '일회용품을 줄이고 분리배출하기', ok: true },
    { t: '가까운 거리도 승용차로 이동하기', ok: false },
    { t: '창문을 열어 둔 채 에어컨 세게 켜기', ok: false },
  ];
  const actList = $('#actList');
  ACTS.forEach((a, i) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'opt'; b.textContent = a.t;
    b.addEventListener('click', () => { Sound.click(); if (S.acts.has(i)) S.acts.delete(i); else S.acts.add(i); b.classList.toggle('on', S.acts.has(i)); b.classList.remove('bad'); });
    actList.appendChild(b);
  });
  function resetActs() { S.acts.clear(); $$('#actList .opt').forEach((b) => b.classList.remove('on', 'bad')); }

  /* 포인터 (STEP 1 보드) */
  SciSim.pointer(view, {
    down(p) { return S.mode === 'budget' ? board.down(p) : false; },
    move(p) { if (S.mode === 'budget') board.move(p); },
    up(p) { if (S.mode === 'budget') board.up(p); },
    hover(p) { return S.mode === 'budget' && board.hit(p) ? 'grab' : 'default'; },
  });

  /* ---------- 읽음 칸 ---------- */
  function readouts() {
    if (S.mode === 'budget') {
      const filled = SLOT_IDS.filter((id) => slotVal(id) != null).length, okEq = EQS.filter((e) => evalEq(e).ok).length;
      setReadouts(['입사 (태양 복사)', '100', '놓은 카드', filled + ' / 6', '맞는 합계 식', okEq + ' / 4']);
    } else if (S.mode === 'gh') {
      setReadouts(['이산화 탄소 농도', Math.round(S.c) + ' ppm', '기온 (지금 → 평형)', sg1(S.dT) + ' → ' + sg1(nowEq()) + ' °C', '에너지 불균형', sg1(S.N)]);
    } else if (S.mode === 'fb') {
      setReadouts(['되먹임', (S.vap ? '수증기 켬' : '수증기 끔') + ' · ' + (S.ice ? '빙하 켬' : '빙하 끔'), '평형 기온 (560 ppm)', sg1(nowEq()) + ' °C', '지금 기온 · 불균형', sg1(S.dT) + ' °C · ' + sg1(S.N)]);
    } else {
      const r = runAt(S.yr), nat = K.SINK_K * (r.c - K.C0) * K.GT_PPM + S.forest, net = r.e - nat;
      setReadouts([Math.round(r.y) + '년 배출', Math.round(r.e) + ' Gt/년', '흡수 합계', (Math.round(nat * 10) / 10).toFixed(1) + ' Gt/년', '대기에 쌓이는 양', (net >= 0 ? '+' : '−') + Math.abs(Math.round(net * 10) / 10).toFixed(1) + ' Gt/년']);
    }
  }

  /* ======================================================
     단계 · 미션
     ====================================================== */
  function enterLevel(li) {
    actOn = false; clearTimeout(hintTimer);
    if (li === 0) { setMode('budget'); resetClimate(K.C0, 0, 0); initCards(); showHint('숫자 카드를 끌어 빈칸에 놓아 봐요', 5000); }
    else if (li === 1) { setMode('gh'); resetClimate(K.C0, 1, 1); setSlider(sCo2, oCo2, K.C0, (v) => v + ' ppm'); rCo2.refresh(); showHint('이산화 탄소 농도 슬라이더를 올려 봐요', 5000); }
    else if (li === 2) { setMode('fb'); S.rows = {}; resetClimate(K.C0, 1, 1); S.c = K.C2X; showHint('되먹임을 켜고 끄며 평형 기온을 비교해요', 5000); }
    else { setMode('emit'); S.e = K.E_NOW; S.forest = 0; setSlider(sEmit, oEmit, S.e, (v) => v + ' Gt/년'); setSlider(sForest, oForest, 0, (v) => v + ' Gt/년'); emitRecalc(false); replayEmit(); resetActs(); showHint('배출량 슬라이더를 움직여 2100년 기온을 봐요', 5000); }
    updateCtl();
  }
  const tracked = { eq560: false };

  const levels = [
    {
      title: '지구 열수지: 에너지의 출입', short: '지구 열수지', icon: '🌍', phase: '분석', features: ['budget'],
      intro: '<p class="si-q">❓ 탐구 질문: 온실 기체가 조금 늘어나면 지구의 에너지 균형은 어떻게 바뀔까?</p>' +
        '<div class="si-link">🔗 <b>중학교(복사 평형과 온실 효과)에서</b> 태양 복사 에너지 ' + K.IN + ' 중 약 ' + K.REFL + '이 반사되고 약 ' + (K.IN - K.REFL) + '이 흡수되며, 지구는 흡수한 만큼을 우주로 내보내 <b>복사 평형</b>을 이룬다고 배웠어요. 온실 효과 덕분에 평균 기온이 약 −' + Math.abs(K.NOGH) + ' °C에서 약 ' + K.NOW_T + ' °C가 되었어요.</div>' +
        '<p>이번에는 에너지의 출입을 숫자로 나눈 <b>지구 열수지</b> 그림을 완성해요. 태양 복사 에너지를 ' + K.IN + '으로 두고 반사·흡수, 지표 복사, 대기가 돌려보내는 복사, 증발, 대류를 따라가요. (교육용으로 단순화한 예시 값이에요.)</p>',
      setup() { enterLevel(0); },
      recap: '입사 ' + K.IN + ' = 반사 ' + K.REFL + ' + 우주로 방출 ' + K.OUT + ' (복사 평형). 지표는 태양에서 ' + K.SABS + '만 받지만, 대기가 돌려보내는 복사 ' + K.BACK + ' 덕분에 ' + K.RS + '를 복사할 수 있어요.',
      summary: '<table class="mini"><tr><th>화살표</th><th>크기(입사 ' + K.IN + ')</th></tr><tr><td>반사</td><td>' + K.REFL + '</td></tr><tr><td>대기 흡수</td><td>' + K.AABS + '</td></tr><tr><td>지표 흡수</td><td>' + K.SABS + '</td></tr><tr><td>지표 복사</td><td>' + K.RS + '</td></tr><tr><td>대기가 되돌려 보내는 복사</td><td>' + K.BACK + '</td></tr><tr><td>증발 / 대류·전도</td><td>' + K.EVAP + ' / ' + K.CONV + '</td></tr><tr><td>우주로 방출</td><td>' + K.OUT + '</td></tr></table>' +
        '<ul><li><b>우주 쪽</b>: 입사 ' + K.IN + ' = 반사 ' + K.REFL + ' + 우주로 방출 ' + K.OUT + ' → <b>복사 평형</b></li><li><b>지표</b>: ' + K.SABS + ' + ' + K.BACK + ' = ' + K.RS + ' + ' + K.EVAP + ' + ' + K.CONV + ' (들어오는 양 = 나가는 양)</li></ul>',
      missions: [
        {
          title: '열수지 그림 완성하기',
          goal: '숫자 카드 8장 중 <b>6장</b>을 골라 그림의 빈칸 6곳에 놓고 <b>✔ 확인하기</b>를 눌러요. (필요 없는 카드도 있어요.)',
          hint: '오른쪽 <b>합계 확인</b>의 식이 모두 ✅가 되게 해 보세요. 입사 ' + K.IN + ' = 반사 + 우주로 방출이고, 지표는 들어오는 양 = 나가는 양이에요.',
          manual: true,
          setup() { setMode('budget'); },
          status: () => mark(SLOT_IDS.every((id) => slotVal(id) != null)) + ' 칸 ' + SLOT_IDS.filter((id) => slotVal(id) != null).length + ' / 6 · ' + mark(EQS.every((e) => evalEq(e).ok)) + ' 합계 식 ' + EQS.filter((e) => evalEq(e).ok).length + ' / 4',
          check: checkBudgetBoard,
          explain: '입사 ' + K.IN + '은 <b>반사 ' + K.REFL + '</b>, <b>대기 흡수 ' + K.AABS + '</b>, <b>지표 흡수 ' + K.SABS + '</b>으로 나뉘어요. 지표는 ' + K.RS + '를 복사하고, 그중 일부를 대기가 흡수했다가 <b>' + K.BACK + '</b>를 다시 지표로 돌려보내요. 우주로는 <b>' + K.OUT + '</b>이 나가서 입사 ' + K.IN + ' = 출사 ' + K.IN + '(반사 ' + K.REFL + ' + 방출 ' + K.OUT + ')이에요.',
        },
        {
          type: 'quiz', title: '지표 복사가 지표 흡수보다 큰 까닭',
          goal: '지표가 태양에서 흡수한 에너지는 ' + K.SABS + '인데, 지표가 복사하는 에너지는 <b>' + K.RS + '</b>예요. 왜 더 클까요?',
          setup() { setMode('budget'); },
          choices: ['지표가 태양 빛을 반사하기 때문이에요', '지표가 태양 에너지뿐 아니라 대기가 돌려보내는 복사(' + K.BACK + ')도 받기 때문이에요', '지표가 스스로 에너지를 새로 만들어 내기 때문이에요', '증발이 열에너지를 만들어 내기 때문이에요'],
          answer: 1,
          feedback: ['반사된 빛은 지표에 흡수되지 않아요. 오히려 흡수하는 양을 줄여요.', '', '에너지는 새로 만들어지지 않아요. 지표가 내보내는 양만큼 어딘가에서 받아야 해요.', '증발은 지표의 열을 가져가는 과정이에요. 열을 만들어 내지 않아요.'],
          explain: '지표가 받는 에너지는 <b>태양 ' + K.SABS + ' + 대기가 돌려보낸 복사 ' + K.BACK + ' = ' + (K.SABS + K.BACK) + '</b>이고, 내보내는 에너지는 <b>복사 ' + K.RS + ' + 증발 ' + K.EVAP + ' + 대류 ' + K.CONV + ' = ' + (K.RS + K.EVAP + K.CONV) + '</b>이에요. 대기가 돌려보내는 복사가 바로 <b>온실 효과</b>예요.',
        },
      ],
    },
    {
      title: '온실 강화: 늘어난 기체와 새 평형', short: '온실 강화', icon: '☁️', phase: '탐구', features: ['gh'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 지표는 대기가 돌려보내는 복사 ' + K.BACK + ' 덕분에 따뜻하게 유지된다는 것을 열수지로 확인했어요.</div>' +
        '<p>이산화 탄소 같은 <b>온실 기체</b>가 늘면 대기가 지표 복사를 더 많이 흡수했다가 지표로 되돌려 보내요. 농도 슬라이더를 <b>' + K.C0 + ' ppm(산업화 이전) → ' + K.CNOW + ' ppm(현재) → ' + K.C2X + ' ppm(두 배)</b>로 올리면서, 들어오는 에너지와 나가는 에너지의 <b>불균형</b>과 지표 기온이 시간에 따라 어떻게 변하는지 관찰해요.</p>',
      setup() { enterLevel(1); },
      recap: '온실 기체가 늘면 일시적으로 들어오는 에너지가 나가는 에너지보다 많아져 지표가 데워지고, 기온이 올라 지표 복사가 늘면서 불균형이 0으로 돌아와 새 평형에 이르러요.',
      summary: '<ul><li>온실 기체 증가 → 대기가 돌려보내는 복사 증가 → <b>불균형</b>(들어오는 에너지 &gt; 나가는 에너지) → 지표 온도 상승 → 지표 복사 증가 → 불균형이 줄어 <b>새 평형</b>.</li><li>평형에 다시 이르면 입사 = 출사이지만 <b>지표 온도는 더 높은 곳에서</b> 평형이 돼요.</li><li>이 모형에서 농도가 2배(' + K.C0 + ' → ' + K.C2X + ' ppm)가 되면 평형 기온이 약 ' + f1(K.SENS) + ' °C 올라요. (현재 ' + K.CNOW + ' ppm의 평형값은 약 ' + sg1(eqT(K.CNOW, 1, 1)) + ' °C이고, 실제 관측은 바다가 열을 흡수해 늦춰져 약 ' + sg1(K.OBS) + ' °C예요.)</li><li>온실 효과 자체는 생명에 필요해요(' + K.NOGH + ' °C → ' + K.NOW_T + ' °C). 문제는 <b>강화</b>예요.</li></ul>',
      missions: [
        {
          title: '농도를 올리고 새 평형까지',
          goal: '이산화 탄소 농도를 <b>' + K.C2X + ' ppm</b>으로 올리고, 에너지 <b>불균형이 0.1 이하</b>가 되는 새 평형까지 기다려요.',
          hint: '슬라이더를 오른쪽 끝(' + K.C2X + ')까지 올린 뒤 오른쪽 그래프의 기온 선이 보라색 점선(평형)에 가까워질 때까지 몇 초 기다려요.',
          setup() { setMode('gh'); },
          check: () => S.c === K.C2X && settled() && nDisp() <= 0.1, hold: 0.8,
          status: () => mark(S.c === K.C2X) + ' 농도 ' + Math.round(S.c) + ' / ' + K.C2X + ' ppm · ' + mark(S.c === K.C2X && nDisp() <= 0.1) + ' 불균형 ' + f1(Math.abs(n1(S.N))) + ' (0.1 이하)',
          explain: '농도를 올리자 대기가 돌려보내는 복사가 늘어 <b>불균형</b>이 생겼고(' + sg1(forcing(K.C2X)) + '), 지표가 데워지며 지표 복사와 증발이 늘어 불균형이 줄었어요. 불균형이 0이 되면 입사 = 출사인 <b>새 평형</b>이고, 이때 기온은 약 <b>' + sg1(eqT(K.C2X, 1, 1)) + ' °C</b> 높은 곳에 있어요.',
        },
        {
          type: 'quiz', title: '새 평형에서의 에너지와 기온',
          goal: '온실 기체가 늘어 <b>새 평형</b>에 이르렀어요. 에너지 출입과 지표 기온은 어떨까요?',
          setup() { setMode('gh'); },
          choices: ['나가는 에너지가 계속 모자라서 기온이 한없이 올라가요', '들어오는 양과 나가는 양이 다시 같아지지만, 기온은 처음보다 높은 곳에서 안정돼요', '기온이 처음 ' + K.C0 + ' ppm 때의 값으로 되돌아와요', '들어오는 태양 에너지가 줄어들어 평형이 돼요'],
          answer: 1,
          feedback: ['기온이 오르면 지표 복사가 늘어 나가는 에너지도 늘어요. 그래서 한없이 오르지는 않아요.', '', '온실 기체가 많은 채로 있으면 처음보다 더 높은 기온에서 균형이 맞아요.', '입사하는 태양 에너지는 그대로이고 달라지는 것은 지표 기온과 지표 복사예요.'],
          explain: '불균형이 0이 되면 <b>입사 = 출사</b>로 다시 평형이 되지만, 이를 위해 지표 복사가 늘어야 하므로 <b>더 높은 기온</b>에서 평형이 돼요.',
        },
        {
          type: 'quiz', title: '온실 효과는 나쁜 것일까?',
          goal: '다음 중 <b>온실 효과</b>에 대한 설명으로 알맞은 것은?',
          setup() { setMode('gh'); },
          choices: ['온실 효과는 해롭기만 해서 없는 편이 좋아요', '온실 효과는 지구를 생물이 살기 알맞게 따뜻하게 해 주고, 문제는 그것이 지나치게 <b>강해지는 것</b>이에요', '온실 효과는 산업화 이후에 처음 생긴 현상이에요', '온실 효과가 강해지면 지구가 차가워져요'],
          answer: 1,
          feedback: ['온실 효과가 없다면 지구 평균 기온은 약 −' + Math.abs(K.NOGH) + ' °C가 되어 생물이 살기 어려워요.', '', '온실 효과는 지구 대기에 원래 있던 자연 현상이에요. 산업화 이후 인간 활동으로 <b>강화</b>된 거예요.', '대기가 돌려보내는 복사가 늘어 오히려 더 따뜻해져요.'],
          explain: '온실 효과 덕분에 평균 기온이 약 ' + K.NOGH.toString().replace('-', '−') + ' °C에서 약 ' + K.NOW_T + ' °C가 되어 생명이 살 수 있어요. 인간 활동으로 온실 기체가 늘어 온실 효과가 <b>강화</b>되는 것이 지구온난화의 원인이에요.',
        },
      ],
    },
    {
      title: '열수지 변동: 되먹임의 힘', short: '열수지 변동', icon: '🔁', phase: '탐구', features: ['fb'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 온실 기체가 늘어도 결국 새 평형에 이르고, 이때 기온이 더 높은 곳에 있다는 것을 알았어요. 그 높이는 무엇에 따라 달라질까요?</div>' +
        '<p>기온이 오르면 다시 기온을 올리는 <b>되먹임</b>이 생겨요. <b>수증기 증가</b>(따뜻한 공기는 수증기를 더 많이 품어 온실 효과가 더 강해져요)와 <b>빙하 감소</b>(얼음이 녹으면 반사가 줄어 흡수가 늘어요)를 켜고 끄며, 같은 농도(' + K.C2X + ' ppm)에서 평형 기온과 열수지 숫자를 <b>표</b>로 비교해요.</p>',
      setup() { enterLevel(2); },
      recap: '수증기 증가와 빙하 감소는 처음 변화를 더 키우는 양의 되먹임이에요. 되먹임이 있으면 같은 농도에서 평형 기온이 훨씬 높고, 지표 복사·증발·되돌아오는 복사도 더 커요.',
      summary: '<ul><li><b>양의 되먹임</b>: 처음의 변화를 <b>더 키우는</b> 방향의 되먹임. 수증기 증가(온실 효과 추가 강화), 빙하 감소(반사 ' + K.REFL + ' → 약 ' + K.REFL_AFTER + ', 흡수 증가)가 예예요.</li><li>같은 ' + K.C2X + ' ppm에서 평형 기온: 되먹임 없음 약 ' + sg1(eqT(K.C2X, 0, 0)) + ' °C, 모두 있음 약 ' + sg1(eqT(K.C2X, 1, 1)) + ' °C (없을 때의 약 ' + Math.round(eqT(K.C2X, 0, 0) / eqT(K.C2X, 1, 1) * 100) + ' %).</li><li>되먹임이 있으면 지표 복사, 증발(물의 순환이 활발해짐), 되돌아오는 복사가 모두 더 커져요.</li></ul>',
      missions: [
        {
          title: '되먹임을 끄고 켜서 비교하기',
          goal: '<b>' + K.C2X + ' ppm</b>에서 새 평형에 이르면 <b>📝 평형 값 기록</b>을 눌러요. 되먹임을 <b>모두 켠 경우</b>와 <b>모두 끈 경우</b> 두 가지를 기록하세요.',
          hint: '먼저 둘 다 켠 채로 평형을 기다려 기록해요. 그다음 두 버튼을 눌러 둘 다 끄고, 기온이 새 평형에 이를 때까지 기다려 다시 기록해요. 처음부터 보고 싶으면 <b>다시</b>를 눌러요.',
          setup() { setMode('fb'); },
          check: () => !!(S.rows['11'] && S.rows['00'] && S.rows['11'].dT > S.rows['00'].dT), hold: 0.3,
          status: () => mark(!!S.rows['11']) + ' 모두 켬 ' + (S.rows['11'] ? sg1(S.rows['11'].dT) + ' °C' : '미기록') + ' · ' + mark(!!S.rows['00']) + ' 모두 끔 ' + (S.rows['00'] ? sg1(S.rows['00'].dT) + ' °C' : '미기록'),
          explain: '같은 ' + K.C2X + ' ppm인데도 되먹임을 모두 켜면 평형 기온이 약 <b>' + sg1(eqT(K.C2X, 1, 1)) + ' °C</b>, 모두 끄면 약 <b>' + sg1(eqT(K.C2X, 0, 0)) + ' °C</b>예요. 되먹임이 기온 상승을 키우고, 그만큼 지표 복사·증발·되돌아오는 복사도 더 커져요.',
        },
        {
          type: 'quiz', title: '양의 되먹임이란?',
          goal: '수증기 증가와 빙하 감소는 <b>양의 되먹임</b>이에요. 양의 되먹임이란 무엇일까요?',
          setup() { setMode('fb'); },
          choices: ['처음 변화를 줄여서 원래대로 돌리는 방향의 되먹임', '처음 변화를 <b>더 키우는</b> 방향의 되먹임', '처음 변화와 아무 관계가 없는 되먹임', '변화를 멈추게 하는 되먹임'],
          answer: 1,
          feedback: ['그것은 음의 되먹임이에요. 수증기와 빙하는 반대로 변화를 키워요.', '', '수증기와 빙하의 변화는 기온 상승 때문에 생기고, 다시 기온 상승에 영향을 줘요.', '표에서 되먹임이 있을 때 기온이 더 많이 올랐어요. 변화를 멈추지 않고 키워요.'],
          explain: '기온 상승 → 수증기 증가 → 온실 효과 추가 강화 → 기온 상승, 기온 상승 → 빙하 감소 → 반사 감소 → 기온 상승처럼 <b>처음의 변화를 더 키우는</b> 것이 양의 되먹임이에요.',
        },
      ],
    },
    {
      title: '배출과 흡수: 2100년의 지구', short: '배출과 흡수', icon: '🏭', phase: '분석', features: ['emit'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 온실 기체 농도가 높을수록 평형 기온이 높고, 되먹임이 그 상승을 키운다는 것을 알았어요. 그렇다면 대기 중 이산화 탄소 농도는 무엇이 결정할까요?</div>' +
        '<p>화석 연료 연소 등으로 <b>배출</b>된 이산화 탄소의 약 절반은 바다와 육상 생태계가 <b>흡수</b>하고, 나머지가 대기에 쌓여요. 연간 배출량(현재 약 ' + K.E_NOW + ' Gt/년)과 숲·습지 복원으로 늘리는 흡수를 조절해 <b>2100년</b>까지 농도와 기온이 어떻게 달라지는지 그래프로 확인해요. (교육용으로 단순화한 모형이에요.)</p>',
      setup() { enterLevel(3); },
      recap: '대기 CO₂ 농도는 배출과 흡수의 차이가 쌓여 결정돼요. 배출을 줄이면 농도와 기온 상승이 완만해지고, 숲·습지 복원은 흡수를 늘려 도와요.',
      summary: '<ul><li>대기에 쌓이는 CO₂ = <b>배출 − 흡수</b>. 배출의 약 절반은 바다·육상 생태계가 흡수해요(예시, 단순화).</li><li>배출이 흡수보다 많으면 농도가 늘고, 농도가 높을수록 평형 기온이 올라요. 실제 기온은 바다가 열을 흡수해 평형값보다 늦게 따라 올라요.</li><li>이 모형에서 현재(' + K.E_NOW + ' Gt/년) 수준이 이어지면 2100년 기온 상승은 약 ' + sg1(emitRun(K.E_NOW, 0)[K.Y1 - K.Y0].T) + ' °C, 배출을 25 Gt/년으로 줄이면 약 ' + sg1(emitRun(25, 0)[K.Y1 - K.Y0].T) + ' °C예요.</li><li>내가 할 수 있는 일: 에너지 절약, 대중교통 이용, 재생 에너지 선택.</li></ul>',
      missions: [
        {
          title: '2100년 기온 상승을 ' + K.TARGET.toFixed(0) + ' °C 아래로',
          goal: '배출량과 숲·습지 복원 슬라이더를 조절해, <b>2100년 기온 상승을 +' + K.TARGET.toFixed(1) + ' °C보다 낮게</b> 만들어요. (그래프 오른쪽 끝의 값)',
          hint: '연간 배출량을 현재(' + K.E_NOW + ')의 절반 남짓인 <b>25 Gt/년 이하</b>로 줄이면 돼요. 숲·습지 복원을 늘리면 배출을 조금 더 많이 해도 돼요.',
          setup() { setMode('emit'); },
          check: () => finalT() < K.TARGET, hold: 0.8,
          status: () => mark(finalT() < K.TARGET) + ' 2100년 기온 ' + sg1(finalT()) + ' °C (목표 +' + K.TARGET.toFixed(1) + ' 미만) · 2100년 농도 ' + finalC() + ' ppm',
          explain: '배출을 줄이면 대기에 쌓이는 CO₂가 줄어 2100년 농도가 낮아지고, 평형 기온과 실제 기온 상승도 작아져요. 반대로 현재 수준이 이어지면 약 ' + sg1(emitRun(K.E_NOW, 0)[K.Y1 - K.Y0].T) + ' °C까지 올라요.',
        },
        {
          title: '내가 할 수 있는 일 고르기',
          goal: '온실 기체 배출을 줄이는 데 도움이 되는 실천을 <b>3개 이상</b> 고르고 <b>✔ 확인하기</b>를 눌러요. 도움이 되지 않는 것은 고르지 않아요.',
          hint: '에너지를 아끼거나, 화석 연료를 덜 쓰거나, 재생 에너지를 쓰는 행동을 찾아보세요.',
          manual: true,
          setup() { setMode('emit'); actOn = true; resetActs(); updateCtl(); },
          status: () => mark(S.acts.size >= 3) + ' 고른 실천 ' + S.acts.size + '개',
          check() {
            const sel = [...S.acts], wrong = sel.filter((i) => !ACTS[i].ok);
            $$('#actList .opt').forEach((b, i) => b.classList.toggle('bad', wrong.includes(i)));
            if (wrong.length) return '"' + ACTS[wrong[0]].t + '"' + josa(ACTS[wrong[0]].t, '은/는') + ' 오히려 배출을 늘려요. 빨간 칸을 빼 보세요.';
            if (sel.length < 3) return '3개 이상 골라 주세요. (지금 ' + sel.length + '개)';
            return true;
          },
          explain: '전기를 아끼고 대중교통·자전거를 타고 재생 에너지를 선택하면 화석 연료 사용이 줄어 배출이 줄어요. 한 사람의 실천은 작아 보여도 사회 전체의 노력과 함께하면 큰 변화를 만들어요.',
        },
        {
          type: 'quiz', title: '농도가 계속 늘어나는 까닭',
          goal: '대기 중 CO₂ 농도가 해마다 <b>계속 늘어나는</b> 까닭으로 알맞은 것은?',
          setup() { setMode('emit'); actOn = false; updateCtl(); },
          choices: ['배출된 CO₂가 하나도 흡수되지 않고 모두 대기에 남아서', '배출량이 바다·육상 생태계의 흡수량보다 많아서 그 차이가 대기에 쌓이기 때문에', '지구가 점점 커져서', '태양이 점점 밝아져서'],
          answer: 1,
          feedback: ['배출의 약 절반은 바다와 육상 생태계가 흡수해요. 흡수되고 남은 만큼이 쌓여요.', '', '농도는 대기 중 기체의 양과 관련이 있고 지구 크기와는 관계없어요.', '이 모형에서 농도 변화는 배출과 흡수의 차이로 설명돼요.'],
          explain: '대기에 쌓이는 CO₂ = <b>배출 − 흡수</b>예요. 배출이 흡수보다 많으면 농도가 늘고, 배출을 흡수와 같은 수준까지 줄이면 농도 증가가 멈춰요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'h1-heat-budget', mount: '#game', badge: '열수지 탐험가', homeHref: '../../index.html#h1b',
    featureLabels: { budget: '🌍 열수지 그림 · 숫자 카드 · 합계 확인', gh: '☁️ 농도 슬라이더 · 불균형 막대 · 기온 그래프', fb: '🔁 되먹임 버튼 · 비교표', emit: '🏭 배출·흡수 슬라이더 · 2100년 그래프' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 루프 ---------- */
  initCards(); resetClimate(K.C0, 0, 0); emitRecalc(true);
  let lastFree = false, evAcc = 0, smokeAcc = 0;
  SciSim.loop((dt, t) => {
    S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    const diag = S.mode !== 'emit';
    if (S.mode === 'gh' || S.mode === 'fb') stepClimate(dt);
    if (diag) {
      syncMols(); updateMols(dt); updatePhotons(dt);
      thSpring.target = S.dT; thSpring.update(dt); S.ndSpring.target = S.N; S.ndSpring.update(dt);
      if (!RM) {
        const bc = budgetC(S.dT, S.N, S.iceS); evAcc += dt * bc.E / K.EVAP * 2.4;
        while (evAcc >= 1) { evAcc -= 1; parts.emit({ x: rnd(420, 592), y: G.atmBot + 3, vx: rnd(-6, 6), vy: -rnd(34, 52), life: 1.7, size: 3.2, color: '#7dd3fc', shape: 'bubble' }); }
      }
    } else {
      stepEmit(dt);
      if (!RM) { smokeAcc += dt * (runAt(S.yr).e / K.E_NOW) * 6; while (smokeAcc >= 1) { smokeAcc -= 1; const f = EM.fac; [[f.x + 19, f.y - 12], [f.x + 51, f.y - 24]].forEach(([sx, sy]) => parts.emit({ x: sx, y: sy, vx: rnd(8, 22), vy: -rnd(26, 40), life: 1.8, size: 7, grow: 6, color: 'rgba(100,116,139,.75)', shape: 'smoke' })); } }
    }
    if (S.mode === 'budget') board.update(dt);
    parts.update(dt);
    ctx.setTransform(view.scale * view.dpr, 0, 0, view.scale * view.dpr, 0, 0);
    ctx.fillStyle = '#dcecf8'; ctx.fillRect(0, 0, VW, VH);
    if (diag) {
      drawDiagram(t, S.mode === 'budget');
      if (S.mode === 'budget') { drawPanelBudget(t); board.draw(t); } else drawPanelClimate(t);
    } else drawEmit(t);
    parts.draw(ctx);
    drawFlash(dt, diag ? 10 : 10);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(255,255,255,' + S.fade * 0.85 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, K, VW, VH, board, SLOT, SLOT_IDS, EQS, mols, photons, budgetI, budgetC, eqT, emitRun, nowEq, settled, finalT, finalC, enterLevel, setMode, EM, ACTS,
    get game() { return game; },
    solveBoard() { SLOT_IDS.forEach((id) => { const c = board.cards.find((x) => x.v === SLOT[id].ans); c.zone = id; }); board.layout(true); },
    setC(v) { S.c = v; setSlider(sCo2, oCo2, v, (x) => x + ' ppm'); updateCtl(); },
    settleNow() { for (let i = 0; i < 2000; i++) stepClimate(0.05); },
    setEmit(e, f) { S.e = e; S.forest = f; setSlider(sEmit, oEmit, e, (v) => v + ' Gt/년'); setSlider(sForest, oForest, f, (v) => v + ' Gt/년'); emitRecalc(false); },
  };
})();
