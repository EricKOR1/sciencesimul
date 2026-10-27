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

  initStage('#eaf3fb', 800, 560, 600, 840);
  const SUBJ = '#0ea5e9';
  const chk = (ok, label) => mark(ok) + ' ' + label;

  /* =========================================================
     자료 (교육용 예시 · 단순화한 값)
     ========================================================= */
  // 마을 수요(MW) · 태양광 100 MW 맑은 날 출력(MW) · 풍력 100 MW 평균 출력(MW), 0~23시
  const DEM = [40, 40, 40, 40, 40, 40, 60, 100, 100, 80, 80, 80, 80, 80, 80, 80, 80, 110, 130, 130, 130, 130, 90, 50];
  const SOL = [0, 0, 0, 0, 0, 0, 5, 20, 40, 60, 75, 85, 90, 88, 80, 65, 45, 20, 5, 0, 0, 0, 0, 0];
  const WIN = [45, 45, 45, 45, 45, 45, 30, 30, 30, 30, 30, 15, 15, 15, 15, 15, 15, 35, 35, 35, 35, 35, 35, 35];
  const ETA = 0.9, CO2_PER = 0.5;                       // 배터리 충전·방전 효율, 가스 발전 CO₂(톤/MWh)
  const WEATHER = {
    sun: { name: '맑은 날', icon: '☀️', sf: 1, wf: 1 },
    cloud: { name: '흐린 날', icon: '☁️', sf: 0.3, wf: 1 },
    calm: { name: '바람 약한 날', icon: '🍃', sf: 1, wf: 0.4 },
  };
  const WKEYS = ['sun', 'cloud', 'calm'];
  const DEM_SUM = DEM.reduce((a, b) => a + b, 0);       // 1910 MWh
  const CO2_ALLGAS = DEM_SUM * CO2_PER;                  // 955 t
  const EV_FROM = 18, EV_TO = 21;
  const COST_REF = 130;                                   // 경제 점수 기준(비용 점수 130이면 0점)
  const COST = { sol: 0.10, win: 0.10, bat: 0.08, gas: 0.03 };
  const costOf = (P) => Math.round((P.solar * COST.sol + P.wind * COST.win + P.batt * COST.bat + P.gas * COST.gas) * 10) / 10;

  function gridSim(P) {
    const sf = WEATHER[P.wx].sf, wf = WEATHER[P.wx].wf;
    const o = { h: [], gasMWh: 0, waste: 0, unmetH: 0, unmet: 0, evening: 0, charged: 0, disch: 0, ren: 0 };
    let st = 0;
    for (let h = 0; h < 24; h++) {
      const s = SOL[h] * P.solar / 100 * sf, w = WIN[h] * P.wind / 100 * wf, ren = s + w, d = DEM[h];
      let ch = 0, dis = 0, gas = 0, waste = 0, un = 0;
      if (ren >= d) { const sur = ren - d; const room = Math.max(0, (P.batt - st) / ETA); ch = Math.min(sur, room); st += ch * ETA; waste = sur - ch; }
      else { let def = d - ren; dis = Math.min(def, st * ETA); st -= dis / ETA; def -= dis; gas = Math.min(def, P.gas); def -= gas; un = def < 1e-9 ? 0 : def; }
      o.h.push({ s, w, ren, d, ch, dis, gas, waste, un, st });
      o.gasMWh += gas; o.waste += waste; o.unmet += un; o.charged += ch; o.disch += dis; o.ren += ren;
      if (un > 0) o.unmetH++;
      if (h >= EV_FROM && h <= EV_TO) o.evening += un;
    }
    o.co2 = o.gasMWh * CO2_PER;
    return o;
  }
  const gcache = new Map();
  function calc(P) {
    const k = [P.wx, P.solar, P.wind, P.batt, P.gas].join('|');
    let r = gcache.get(k); if (!r) { r = gridSim(P); if (gcache.size > 400) gcache.clear(); gcache.set(k, r); } return r;
  }
  const R1 = (x) => Math.round(x);
  const eveR = (P) => R1(calc(P).evening);

  // 장치(2단계) 모형
  const SUN_ELEV = 50, SUN_ZEN = 90 - SUN_ELEV;               // 태양 고도 50° → 최적 패널 각도 40°
  function solarModel(angle, cloud) {
    const inc = Math.abs(SUN_ZEN - angle);
    const irr = Math.max(0, 1000 * Math.cos(inc * Math.PI / 180) * (1 - 0.75 * cloud / 100));   // 받는 햇빛(W, 패널 1 m²)
    return { inc, irr: Math.round(irr), p: Math.round(irr * 0.2) };
  }
  function windModel(v) { const p = v < 3 ? 0 : v >= 12 ? 2 : 2 * Math.pow(v / 12, 3); return Math.round(p * 100) / 100; }
  function fcModel(h2, o2) { const p = o2 ? h2 / 100 : 0; return { p: Math.round(p * 100) / 100, fuel: o2 ? Math.round(h2) / 100 * 2 : 0 }; }

  // 미션·설명에 쓰는 숫자 (모형에서 직접 계산)
  const M2_TARGET = 50, M2_SOL = 300, M2_BAT = 400;
  const EV_BEST = eveR({ wx: 'sun', solar: M2_SOL, wind: 100, batt: M2_BAT, gas: 0 });
  const EV_BASE = eveR({ wx: 'sun', solar: 100, wind: 100, batt: 0, gas: 0 });
  const EV_CLOUD = eveR({ wx: 'cloud', solar: M2_SOL, wind: 100, batt: M2_BAT, gas: 0 });
  const PLAN_CO2_MAX = 100, PLAN_COST_MAX = 90;
  const planScore = (P) => {
    const ws = WKEYS.map((w) => calc(Object.assign({}, P, { wx: w })));
    const avgCo2 = ws.reduce((a, o) => a + o.co2, 0) / 3, avgH = ws.reduce((a, o) => a + o.unmetH, 0) / 3;
    const cost = costOf(P);
    return {
      ws, cost, co2: ws.map((o) => R1(o.co2)), hrs: ws.map((o) => o.unmetH),
      env: clamp(R1(100 * (1 - avgCo2 / CO2_ALLGAS)), 0, 100), eco: clamp(R1(100 * (1 - cost / COST_REF)), 0, 100), soc: clamp(R1(100 * (1 - avgH / 24)), 0, 100),
    };
  };

  /* 신재생 에너지 도감 (7장) */
  const SRC = [
    { id: 'solar', icon: '☀️', name: '태양광', kind: 're', desc: '햇빛을 반도체 태양 전지가 직접 전기로 바꿔요. 햇빛은 계속 오기 때문에 다 쓰고 없어지지 않아요.',
      chain: [{ i: '☀️', n: '햇빛', e: '빛에너지' }, { i: '🔲', n: '태양 전지', e: '빛 → 전기' }, { i: '⚡', n: '전기', e: '전기 에너지' }] },
    { id: 'wind', icon: '🌬️', name: '풍력', kind: 're', desc: '바람의 운동 에너지로 날개를 돌리고, 발전기에서 전기로 바꿔요. 바람은 계속 생겨요.',
      chain: [{ i: '🌬️', n: '바람', e: '운동 에너지' }, { i: '🌀', n: '날개 회전', e: '운동 에너지' }, { i: '⚙️', n: '발전기', e: '전자기 유도' }, { i: '⚡', n: '전기', e: '전기 에너지' }] },
    { id: 'hydro', icon: '💧', name: '수력', kind: 're', desc: '높은 곳의 물이 흘러내리는 에너지로 터빈을 돌려요. 물은 비로 다시 채워져요.',
      chain: [{ i: '🏞️', n: '높은 곳의 물', e: '위치 에너지' }, { i: '🌊', n: '흘러내리는 물', e: '운동 에너지' }, { i: '🌀', n: '터빈', e: '운동 에너지' }, { i: '⚙️', n: '발전기', e: '전자기 유도' }, { i: '⚡', n: '전기', e: '전기 에너지' }] },
    { id: 'geo', icon: '🌋', name: '지열', kind: 're', desc: '땅속의 뜨거운 열로 물을 데워 증기를 만들고 터빈을 돌려요. 땅속 열은 계속 공급돼요.',
      chain: [{ i: '🌋', n: '땅속의 열', e: '열에너지' }, { i: '♨️', n: '뜨거운 증기', e: '열에너지' }, { i: '🌀', n: '터빈', e: '운동 에너지' }, { i: '⚙️', n: '발전기', e: '전자기 유도' }, { i: '⚡', n: '전기', e: '전기 에너지' }] },
    { id: 'bio', icon: '🌿', name: '바이오', kind: 're', desc: '식물·가축 분뇨·음식물 쓰레기 같은 생물 자원을 태우거나 발효시켜 열과 가스를 얻어요. 생물은 다시 자라요.',
      chain: [{ i: '🌿', n: '생물 자원', e: '화학 에너지' }, { i: '🔥', n: '연소·발효', e: '열에너지' }, { i: '🌀', n: '증기 터빈', e: '운동 에너지' }, { i: '⚙️', n: '발전기', e: '전자기 유도' }, { i: '⚡', n: '전기', e: '전기 에너지' }] },
    { id: 'tidal', icon: '🌊', name: '조력', kind: 're', desc: '밀물과 썰물로 생기는 바닷물의 흐름으로 터빈을 돌려요. 해양 에너지의 한 가지예요.',
      chain: [{ i: '🌊', n: '밀물·썰물', e: '운동 에너지' }, { i: '🌀', n: '터빈', e: '운동 에너지' }, { i: '⚙️', n: '발전기', e: '전자기 유도' }, { i: '⚡', n: '전기', e: '전기 에너지' }] },
    { id: 'fc', icon: '🔋', name: '연료 전지', kind: 'new', desc: '수소와 산소가 반응해 전기와 물을 만들어요. 태우지 않고 전기를 만드는 새로운 방식이라 신에너지예요.',
      chain: [{ i: '💨', n: '수소 + 산소', e: '화학 에너지', note: '수소는 만들 때 에너지가 필요해요' }, { i: '🔋', n: '연료 전지', e: '산화·환원 반응', note: '물(H₂O)만 생겨요' }, { i: '⚡', n: '전기', e: '전기 에너지' }] },
  ];
  const SRC_BY = {}; SRC.forEach((s) => { SRC_BY[s.id] = s; });
  const KIND_NAME = { new: '신에너지', re: '재생 에너지' };

  /* =========================================================
     상태
     ========================================================= */
  let game = null;
  let F = new Set();
  const free = () => !!(game && game.free);
  const hasF = (f) => F.has(f) || free();
  const isNewF = (f) => !!(game && game.isNew(f));
  const S = { mode: 'cat', t: 0, fade: 0, ph: '', okAt: -9 };
  const CAT = { sel: null, opened: new Set(), selT: -9 };
  const DV = { sub: 'solar', angle: 0, cloud: 60, wind: 3, h2: 0, o2: false, hit: { solar: false, wind: false, fc: false }, bladeAng: 0, omega: 0, water: 0 };
  const G = { wx: 'sun', solar: 100, wind: 100, batt: 0, gas: 0, marks: new Set(), play: false, ph: 12, paint: null, pop: new Map() };
  const PL = { solar: 100, wind: 100, batt: 100, gas: 100, pickA: null, pickB: null, pickC: null, pres: false, found: new Set() };
  const gridP = () => (S.mode === 'plan' ? { wx: G.wx, solar: PL.solar, wind: PL.wind, batt: PL.batt, gas: PL.gas } : { wx: G.wx, solar: G.solar, wind: G.wind, batt: G.batt, gas: G.gas });

  /* =========================================================
     장면 공통: NEW 표시, 전환 페이드
     ========================================================= */
  function newTag() {
    const x = VW - 62, y = 5, a = 0.5 + 0.5 * Math.sin(S.t * 6);
    ctx.save(); ctx.fillStyle = '#ef4444'; rr(x, y, 46, 20, 10).fill();
    ctx.globalAlpha = 0.35 + a * 0.4; ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 3; rr(x - 3, y - 3, 52, 26, 13).stroke();
    ctx.globalAlpha = 1; ctx.fillStyle = '#fff'; ctx.font = D.font(12, 800); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('NEW', x + 23, y + 11); ctx.restore();
  }
  function flowDots(pts, t, n, col, speed, size) {
    // 꺾은선 pts를 따라 흐르는 점
    let tot = 0; const seg = [];
    for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(l); tot += l; }
    for (let k = 0; k < n; k++) {
      let d = ((t * speed + (k / n) * tot) % tot + tot) % tot, i = 0;
      while (i < seg.length - 1 && d > seg[i]) { d -= seg[i]; i++; }
      const u = seg[i] ? d / seg[i] : 0, x = lerp(pts[i][0], pts[i + 1][0], u), y = lerp(pts[i][1], pts[i + 1][1], u);
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, size || 3.5, 0, TAU); ctx.fill();
    }
  }
  function polyLen(pts) { let s = 0; for (let i = 1; i < pts.length; i++) s += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return s; }
  function sky(y0, h, top, bot) { const g = ctx.createLinearGradient(0, y0, 0, y0 + h); g.addColorStop(0, top); g.addColorStop(1, bot); ctx.fillStyle = g; ctx.fillRect(0, y0, VW, h); }
  function cloudShape(x, y, s, a) {
    ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = '#fff';
    [[0, 0, 26], [28, -8, 32], [60, 0, 26], [30, 10, 30], [-14, 8, 20], [74, 8, 18]].forEach((c) => { ctx.beginPath(); ctx.arc(x + c[0] * s, y + c[1] * s, c[2] * s, 0, TAU); ctx.fill(); });
    ctx.fillStyle = 'rgba(148,163,184,.35)'; ctx.beginPath(); ctx.ellipse(x + 30 * s, y + 24 * s, 56 * s, 9 * s, 0, 0, TAU); ctx.fill();
    ctx.restore();
  }

  /* =========================================================
     ① 도감: 카드 7장 + 에너지 전환 사슬
     ========================================================= */
  const CAT_L = PHONE
    ? { cw: 274, ch: 50, gx: 10, gy: 8, cols: 2, x0: 21, y0: 52, panelY: 304 }
    : { cw: 176, ch: 54, gx: 10, gy: 10, cols: 4, x0: 33, y0: 50, panelY: 190 };
  function catCardRect(i) {
    const c = i % CAT_L.cols, r = Math.floor(i / CAT_L.cols);
    return { x: CAT_L.x0 + c * (CAT_L.cw + CAT_L.gx), y: CAT_L.y0 + r * (CAT_L.ch + CAT_L.gy), w: CAT_L.cw, h: CAT_L.ch };
  }
  function catSelect(id) {
    if (CAT.sel === id) return;
    CAT.sel = id; CAT.selT = S.t; CAT.burst = false;
    if (!CAT.opened.has(id)) { CAT.opened.add(id); Sound.tick(); }
    const r = catCardRect(SRC.findIndex((s) => s.id === id));
    parts.burst(r.x + r.w - 22, r.y + 16, { count: 8, speed: 90, life: 0.5, size: 3 });
  }
  const catHover = { i: -1 };
  function chainLayout(n) {
    const y0 = CAT_L.panelY + 56, list = [];
    if (PHONE) {
      const nh = 62, gap = n > 4 ? 20 : 26, x = 40, w = VW - 80;
      for (let i = 0; i < n; i++) list.push({ x, y: y0 + 8 + i * (nh + gap), w, h: nh });
    } else {
      const gap = 36, w = Math.min(130, (VW - 60 - gap * (n - 1)) / n), tw = w * n + gap * (n - 1), x0 = (VW - tw) / 2, h = 150;
      for (let i = 0; i < n; i++) list.push({ x: x0 + i * (w + gap), y: y0 + 18, w, h });
    }
    return list;
  }
  function drawCat(t, dt) {
    sky(0, VH, '#e8f2fc', '#f6fafe');
    caption('📖 신재생 에너지 도감');
    // 카드 7장
    SRC.forEach((s, i) => {
      const r = catCardRect(i), sel = CAT.sel === s.id, op = CAT.opened.has(s.id), hv = catHover.i === i;
      const lift = sel ? -3 : hv ? -2 : 0;
      ctx.save(); ctx.translate(0, lift);
      D.shadow(() => { ctx.fillStyle = sel ? '#fff' : '#f8fafc'; rr(r.x, r.y, r.w, r.h, 12).fill(); }, { blur: sel ? 14 : 6, y: sel ? 5 : 2, color: 'rgba(15,23,42,.24)' });
      ctx.strokeStyle = sel ? SUBJ : (op ? '#86efac' : '#cbd5e1'); ctx.lineWidth = sel ? 3.5 : 2; rr(r.x, r.y, r.w, r.h, 12).stroke();
      TX(r.x + 30, r.y + r.h / 2 + 9, s.icon, { size: 26, align: 'center' });
      TX(r.x + 56, r.y + r.h / 2 + 6, s.name, { size: PHONE ? 15 : 16, align: 'left', weight: 800, color: '#1e293b' });
      if (op) { ctx.fillStyle = '#16a34a'; ctx.beginPath(); ctx.arc(r.x + r.w - 17, r.y + 17, 10, 0, TAU); ctx.fill(); TX(r.x + r.w - 17, r.y + 22, '✓', { size: 14, color: '#fff', weight: 800 }); }
      else { const a = 0.5 + 0.5 * Math.sin(t * 4 + i); ctx.fillStyle = rgba('#f59e0b', 0.25 + 0.3 * a); ctx.beginPath(); ctx.arc(r.x + r.w - 17, r.y + 17, 10, 0, TAU); ctx.fill(); TX(r.x + r.w - 17, r.y + 22, '?', { size: 14, color: '#92400e', weight: 800 }); }
      ctx.restore();
    });
    // 사슬 패널
    const py = CAT_L.panelY, ph = VH - py - 12;
    ctx.save(); D.shadow(() => { ctx.fillStyle = '#fff'; rr(12, py, VW - 24, ph, 16).fill(); }, { blur: 10, y: 3, color: 'rgba(15,23,42,.14)' }); ctx.restore();
    const s = SRC_BY[CAT.sel];
    if (!s) {
      TX(VW / 2, py + ph / 2 - 6, '위의 카드를 눌러 보세요', { size: 20, color: '#64748b', weight: 800 });
      TX(VW / 2, py + ph / 2 + 22, '에너지가 전기로 바뀌는 과정이 나타나요', { size: 14.5, color: '#94a3b8', weight: 700 });
      return;
    }
    TX(26, py + 32, s.icon + ' ' + s.name + ' — 에너지 전환 과정', { size: 18, align: 'left', weight: 800, color: '#0f172a' });
    const nodes = chainLayout(s.chain.length), k = (t - CAT.selT);
    const appear = (i) => smooth((k - i * 0.28) / 0.4);
    // 화살표 + 흐르는 점
    for (let i = 0; i < nodes.length - 1; i++) {
      const a = nodes[i], b = nodes[i + 1], ap = Math.min(appear(i), appear(i + 1));
      if (ap <= 0) continue;
      const p1 = PHONE ? [a.x + a.w / 2, a.y + a.h + 2] : [a.x + a.w + 3, a.y + a.h / 2], p2 = PHONE ? [b.x + b.w / 2, b.y - 3] : [b.x - 4, b.y + b.h / 2];
      ctx.save(); ctx.globalAlpha = ap; D.arrow(p1[0], p1[1], lerp(p1[0], p2[0], ap), lerp(p1[1], p2[1], ap), { color: '#94a3b8', width: 3, head: 11 });
      ctx.fillStyle = SUBJ; const nd = 3;
      for (let q = 0; q < nd; q++) { const u = ((t * 0.7 + q / nd) % 1); ctx.beginPath(); ctx.arc(lerp(p1[0], p2[0], u), lerp(p1[1], p2[1], u), 3.4, 0, TAU); ctx.fill(); }
      ctx.restore();
    }
    nodes.forEach((n, i) => {
      const nd = s.chain[i], ap = appear(i); if (ap <= 0) return;
      const sc = RM ? 1 : 0.7 + 0.3 * SciSim.ease.outBack(clamp((k - i * 0.28) / 0.4, 0, 1));
      const last = i === nodes.length - 1;
      ctx.save(); ctx.globalAlpha = ap; ctx.translate(n.x + n.w / 2, n.y + n.h / 2); ctx.scale(sc, sc); ctx.translate(-n.w / 2, -n.h / 2);
      D.shadow(() => { ctx.fillStyle = last ? '#fffbe6' : '#f1f5f9'; rr(0, 0, n.w, n.h, 14).fill(); }, { blur: 8, y: 3, color: 'rgba(15,23,42,.2)' });
      ctx.strokeStyle = last ? '#f59e0b' : '#cbd5e1'; ctx.lineWidth = 2.5; rr(0, 0, n.w, n.h, 14).stroke();
      if (PHONE) {
        TX(34, n.h / 2 + 11, nd.i, { size: 30 });
        TX(68, n.h / 2 - 2, nd.n, { size: 16, align: 'left', weight: 800, color: '#0f172a' });
        D.label(68, n.h / 2 + 20, nd.e, { size: 12.5, bg: last ? '#f59e0b' : '#e0f2fe', color: last ? '#fff' : '#075985', align: 'left', pad: 8 });
      } else {
        TX(n.w / 2, 52, nd.i, { size: 38 });
        TX(n.w / 2, 88, nd.n, { size: 15.5, weight: 800, color: '#0f172a' });
        D.label(n.w / 2, 116, nd.e, { size: 12.5, bg: last ? '#f59e0b' : '#e0f2fe', color: last ? '#fff' : '#075985', pad: 8 });
      }
      ctx.restore();
      if (nd.note && ap > 0.9) {
        const ny = PHONE ? n.y + n.h + 11 : n.y + n.h + 18;
        if (!PHONE) drawWrap(n.x + n.w / 2, ny, nd.note, n.w + 30, 12.5, { color: '#b45309', weight: 700 });
        else TX(n.x + n.w - 4, n.y - 2, nd.note, { size: 11.5, color: '#b45309', weight: 700, align: 'right' });
      }
    });
    // 설명
    const dy = PHONE ? nodes[nodes.length - 1].y + nodes[nodes.length - 1].h + 34 : py + ph - 52;
    const ap2 = smooth((k - nodes.length * 0.28 - 0.1) / 0.5);
    ctx.save(); ctx.globalAlpha = ap2;
    drawWrap(VW / 2, dy, s.desc, VW - 70, PHONE ? 14 : 15, { color: '#334155' });
    ctx.restore();
    if (!CAT.burst && k > nodes.length * 0.28 + 0.4) { CAT.burst = true; const ln = nodes[nodes.length - 1]; okBurst(ln.x + ln.w / 2, ln.y + ln.h / 2, { count: 14, speed: 140, colors: ['#fbbf24', '#38bdf8', '#fde047'] }); }
  }

  /* =========================================================
     ① 분류: 신에너지 / 재생 에너지
     ========================================================= */
  let sortBoard = null;
  const SORT_W = PHONE ? 174 : 168, SORT_H = PHONE ? 50 : 52;
  function buildSort() {
    sortBoard = new Board({ onChange() { sortBoard.items.forEach((c) => { c.ok = false; c.bad = false; c.warned = false; }); }, onTap(c) { showHint(c.src.icon + ' ' + c.src.name + ': ' + c.src.desc, 6000); } });
    const cols = PHONE ? 2 : 4;
    const slots = PHONE
      ? [{ id: 'new', x: 300, y: 436, w: 560, h: 150, cols: 3, label: '🔋 신에너지', sub: '새로운 방식으로 얻는 에너지', color: '#8b5cf6' },
         { id: 're', x: 300, y: 650, w: 560, h: 240, cols: 3, label: '♻️ 재생 에너지', sub: '자연에서 다시 얻을 수 있는 에너지', color: '#16a34a' }]
      : [{ id: 'new', x: 162, y: 400, w: 300, h: 280, cols: 2, label: '🔋 신에너지', sub: '새로운 방식으로 얻는 에너지', color: '#8b5cf6' },
         { id: 're', x: 555, y: 400, w: 466, h: 280, cols: 3, label: '♻️ 재생 에너지', sub: '자연에서 다시 얻을 수 있는 에너지', color: '#16a34a' }];
    slots.forEach((s) => { const gw = (s.w - 16) / s.cols; sortBoard.addSlot(Object.assign({ cap: 7, top: 52, gh: PHONE ? 58 : 54, isc: Math.min(0.9, (gw - 6) / SORT_W), pad: 8 }, s)); });
    // 카드를 섞어서 홈 위치에 놓기
    const order = SRC.map((s, i) => i);
    const rd = rng(7 + Math.floor(Math.random() * 1000)); order.sort(() => rd() - 0.5);
    order.forEach((si, k) => {
      const s = SRC[si], c = k % cols, r = Math.floor(k / cols);
      const hx = (VW - (cols * SORT_W + (cols - 1) * 12)) / 2 + SORT_W / 2 + c * (SORT_W + 12);
      const hy = (PHONE ? 90 : 96) + r * ((PHONE ? SORT_H + 12 : SORT_H + 14));
      sortBoard.addItem({ id: s.id, kind: s.kind, w: SORT_W, h: SORT_H, hx, hy, label: s.name, src: s,
        paint(cc) { TX(-cc.w / 2 + 26, 9, s.icon, { size: 24 }); TX(-cc.w / 2 + 50, 6, s.name, { size: 16.5, weight: 800, align: 'left', color: '#1e293b' }); } });
    });
  }
  function sortReset() { if (!sortBoard) buildSort(); else sortBoard.home(); sortBoard.items.forEach((c) => { c.ok = false; c.bad = false; c.warned = false; }); }
  function drawSortScene(t, dt) {
    sky(0, VH, '#eef4fb', '#f8fbff');
    caption('🗂️ 신에너지와 재생 에너지로 나누기');
    TX(VW - 14, 56, '카드를 끌어다 알맞은 칸에 놓아요 (눌러서 고르고 칸을 눌러도 돼요)', { size: PHONE ? 11.5 : 12.5, align: 'right', color: '#64748b', weight: 700 });
    sortBoard.step(dt);
    const hv = sortBoard.drag ? sortBoard.slotAtPoint({ x: sortBoard.drag.c.x, y: sortBoard.drag.c.y }) : null;
    sortBoard.slots.forEach((s) => { s._h = approach(s._h || 0, hv === s ? 1 : 0, dt, 14); drawSlot(s, { hover: s._h }); });
    sortBoard.items.forEach((c) => { if (!sortBoard.drag || sortBoard.drag.c !== c) sortBoard.drawItem(c); });
    if (sortBoard.drag) sortBoard.drawItem(sortBoard.drag.c);
  }
  function sortCheck() {
    const items = sortBoard.items, un = items.filter((c) => !c.slot);
    if (un.length) return '아직 칸에 놓지 않은 카드가 ' + un.length + '장 있어요.';
    const bad = items.filter((c) => c.slot.id !== c.kind);
    if (bad.length) {
      bad.forEach((c) => { if (!c.warned) { c.warned = true; c.bad = true; c.shake = 0.5; } });
      return '<b>' + bad[0].src.name + '</b> 카드를 다시 생각해 봐요. 도감에서 그 에너지가 어떻게 얻어지는지 읽어 보세요.';
    }
    items.forEach((c) => { if (!c.ok) { c.ok = true; c.pop = 1; okBurst(c.x, c.y, { count: 6, speed: 90, life: 0.5, size: 3 }); } });
    return true;
  }
  /* =========================================================
     ② 장치: 태양광 · 풍력 · 연료 전지
     ========================================================= */
  const DL = PHONE ? { sh: 452, by: 466, bh: 366 } : { sh: 350, by: 362, bh: 192 };
  const NRM = { x: -Math.cos(SUN_ELEV * Math.PI / 180), y: -Math.sin(SUN_ELEV * Math.PI / 180) };      // 태양 쪽 단위 벡터
  function devHitCheck() {
    if (DV.sub === 'solar' && solarModel(DV.angle, DV.cloud).p >= 190) DV.hit.solar = true;
    if (DV.sub === 'wind' && windModel(DV.wind) >= 2) DV.hit.wind = true;
    if (DV.sub === 'fc' && fcModel(DV.h2, DV.o2).p >= 1) DV.hit.fc = true;
  }
  function energyBar(x, y, w, h, parts2, max, title) {
    // 가로 막대: 구간별 값. 값은 모두 그려진 길이에 비례
    TX(x, y - 8, title, { size: 14, align: 'left', weight: 800, color: '#334155' });
    ctx.save(); ctx.fillStyle = '#e2e8f0'; rr(x, y, w, h, 8).fill(); ctx.restore();
    let cx = x;
    ctx.save(); rr(x, y, w, h, 8).clip();
    parts2.forEach((p) => {
      const pw = clamp(p.v / max, 0, 1) * w; if (pw < 0.5) return;
      const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, shade(p.c, 0.28)); g.addColorStop(1, p.c);
      ctx.fillStyle = g; ctx.fillRect(cx, y, pw, h); ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(cx, y + 1, pw, h * 0.32);
      cx += pw;
    });
    ctx.restore();
    // 구간 이름과 값 (막대 아래 한 줄)
    let lx = x; const ly = y + h + 18;
    parts2.forEach((p) => {
      ctx.fillStyle = p.c; rr(lx, ly - 9, 11, 11, 3).fill();
      TX(lx + 16, ly + 1, p.l + ' ' + p.t, { size: 13.5, align: 'left', weight: 800, color: '#334155' });
      ctx.save(); ctx.font = D.font(13.5, 800); lx += 16 + ctx.measureText(p.l + ' ' + p.t).width + 18; ctx.restore();
    });
  }

  /* --- 태양광 --- */
  function drawSolar(t, dt) {
    sky(0, DL.sh, '#8fcdf7', '#e3f3ff');
    const gy = DL.sh - 50, pv = { x: VW * (PHONE ? 0.58 : 0.55), y: gy - (PHONE ? 78 : 70) };
    const L = PHONE ? 118 : 128, th = DV.angle * Math.PI / 180, u = { x: Math.cos(th), y: -Math.sin(th) };
    const sm = solarModel(DV.angle, DV.cloud), cf = 1 - 0.75 * DV.cloud / 100;
    const R = (pv.y - 62) / -NRM.y, sun = { x: pv.x + NRM.x * R, y: pv.y + NRM.y * R };
    const dir = { x: -NRM.x, y: -NRM.y }, perp = { x: -NRM.y, y: NRM.x };
    // 언덕 · 땅
    ctx.fillStyle = '#7ccf8a'; ctx.beginPath(); ctx.moveTo(0, gy + 10); ctx.quadraticCurveTo(VW * 0.3, gy - 22, VW * 0.6, gy + 6); ctx.quadraticCurveTo(VW * 0.85, gy - 6, VW, gy + 8); ctx.lineTo(VW, DL.sh); ctx.lineTo(0, DL.sh); ctx.fill();
    ctx.fillStyle = '#5fb873'; ctx.fillRect(0, gy + 26, VW, DL.sh - gy - 26);
    // 태양
    D.glow(sun.x, sun.y, 70, '#fde047', 0.55 * (0.55 + 0.45 * cf)); D.sphere(sun.x, sun.y, 24, '#fbbf24', { gloss: false });
    // 구름 (구름 비율에 따라 커지고 진해져요)
    const cc = { x: sun.x + dir.x * 140, y: sun.y + dir.y * 140 };
    if (DV.cloud > 0) { const a = clamp(DV.cloud / 40, 0, 1), sc = 0.5 + DV.cloud / 100 * 0.9; [-1, 0, 1].forEach((k) => cloudShape(cc.x + perp.x * k * 62 * sc - 34 * sc + Math.sin(t * 0.4 + k) * 5, cc.y + perp.y * k * 62 * sc - 6 + k * 4, sc * 0.9, a * 0.96)); }
    // 빛줄기
    for (let k = -4; k <= 4; k++) {
      const o = k * 19, p0 = { x: sun.x + perp.x * o, y: sun.y + perp.y * o };
      // 패널 선과의 교점: p0 + s*dir = pv + tt*u
      const det = dir.x * -u.y - dir.y * -u.x; let hit = null;
      if (Math.abs(det) > 1e-6) {
        const bx = pv.x - p0.x, by = pv.y - p0.y;
        const sK = (bx * -u.y - by * -u.x) / det, tt = (dir.x * by - dir.y * bx) / det;
        if (sK > 0 && Math.abs(tt) <= L / 2) hit = { s: sK, tt };
      }
      const endS = hit ? hit.s : (gy + 20 - p0.y) / dir.y, sCl = Math.min(endS, 150);
      ctx.save(); ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(250,204,21,.9)'; ctx.lineWidth = 3; ctx.setLineDash([12, 7]); ctx.lineDashOffset = -t * 40;
      ctx.beginPath(); ctx.moveTo(p0.x + dir.x * 30, p0.y + dir.y * 30); ctx.lineTo(p0.x + dir.x * sCl, p0.y + dir.y * sCl); ctx.stroke();
      if (endS > sCl) { ctx.strokeStyle = 'rgba(250,204,21,' + (0.9 * cf).toFixed(3) + ')'; ctx.beginPath(); ctx.moveTo(p0.x + dir.x * sCl, p0.y + dir.y * sCl); ctx.lineTo(p0.x + dir.x * endS, p0.y + dir.y * endS); ctx.stroke(); }
      ctx.restore();
      if (hit && cf > 0.3 && !RM && Math.random() < dt * 5 * cf) parts.emit({ x: p0.x + dir.x * endS, y: p0.y + dir.y * endS, vx: -dir.x * 20 + (Math.random() - .5) * 30, vy: -30 - Math.random() * 20, life: 0.5, size: 2.5, color: '#fde047', shape: 'star' });
    }
    // 받침대 · 패널
    ctx.fillStyle = '#64748b'; rr(pv.x - 5, pv.y + 8, 10, gy + 24 - pv.y - 8, 3).fill();
    ctx.fillStyle = '#475569'; rr(pv.x - 26, gy + 18, 52, 10, 4).fill();
    ctx.save(); ctx.translate(pv.x, pv.y); ctx.rotate(-th);
    D.shadow(() => { const g = ctx.createLinearGradient(-L / 2, 0, L / 2, 0); g.addColorStop(0, '#1e3a8a'); g.addColorStop(1, '#2563eb'); ctx.fillStyle = g; rr(-L / 2, -7, L, 14, 3).fill(); }, { blur: 8, y: 3, color: 'rgba(0,0,0,.3)' });
    ctx.strokeStyle = 'rgba(191,219,254,.8)'; ctx.lineWidth = 1.2; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * L / 5 + L / 10, -7); ctx.lineTo(i * L / 5 + L / 10, 7); ctx.stroke(); }
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(-L / 2 + 3, -6, L - 6, 3);
    ctx.restore();
    // 입사각 표시
    const nvec = { x: -Math.sin(th), y: -Math.cos(th) };
    ctx.save(); ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(pv.x, pv.y); ctx.lineTo(pv.x + nvec.x * 74, pv.y + nvec.y * 74); ctx.stroke(); ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(pv.x, pv.y); ctx.lineTo(pv.x + NRM.x * 74, pv.y + NRM.y * 74); ctx.strokeStyle = 'rgba(15,23,42,.35)'; ctx.stroke();
    const a1 = Math.atan2(nvec.y, nvec.x), a2 = Math.atan2(NRM.y, NRM.x); let dd = a2 - a1; while (dd > Math.PI) dd -= TAU; while (dd < -Math.PI) dd += TAU;
    if (sm.inc > 0) { ctx.strokeStyle = '#e2464b'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(pv.x, pv.y, 46, a1, a1 + dd, dd < 0); ctx.stroke(); }
    const am = a1 + dd / 2; TX(pv.x + Math.cos(am) * 66 - (sm.inc > 0 ? 6 : 0), pv.y + Math.sin(am) * 66 + 5, '입사각 ' + sm.inc + '°', { size: 14, weight: 800, color: '#b91c1c', stroke: 'rgba(255,255,255,.85)', strokeWidth: 4 });
    ctx.restore();
    TX(pv.x + nvec.x * 74 + (nvec.x >= 0 ? 6 : -6), pv.y + nvec.y * 74 - 4, '수직선', { size: 12, color: '#0f172a', align: nvec.x >= 0 ? 'left' : 'right', stroke: 'rgba(255,255,255,.8)', strokeWidth: 3 });
    // 전선 · 전구
    const bx = VW - (PHONE ? 78 : 104), by = gy - 46;
    const wire = [[pv.x, gy + 24], [bx, gy + 24], [bx, by + 22]];
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 3; ctx.beginPath(); wire.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); ctx.stroke();
    const pw = sm.p / 200; if (pw > 0) flowDots(wire, t, Math.max(2, Math.round(pw * 9)), '#facc15', 40 + pw * 120, 3.6);
    D.glow(bx, by, 14 + 56 * pw, '#fde047', 0.15 + 0.7 * pw); D.sphere(bx, by, 17, mixc('#cbd5e1', '#fde047', pw), { gloss: true });
    ctx.fillStyle = '#64748b'; rr(bx - 9, by + 14, 18, 12, 3).fill();
    TX(bx, by - 28, '전구', { size: 12.5, color: '#475569' });
    // 아래 패널: 받는 햇빛 = 전기 + 손실
    const bY = DL.by;
    ctx.save(); D.shadow(() => { ctx.fillStyle = '#fff'; rr(10, bY, VW - 20, DL.bh, 14).fill(); }, { blur: 8, y: 2, color: 'rgba(15,23,42,.15)' }); ctx.restore();
    const px = 28, pw2 = VW - 56;
    TX(px, bY + 28, '☀️ 패널 1 m²가 받는 햇빛 = 1000 W × cos(입사각) × 구름 보정', { size: PHONE ? 13.5 : 14.5, align: 'left', weight: 800, color: '#0f172a' });
    TX(px, bY + 52, 'cos(' + sm.inc + '°) = ' + Math.cos(sm.inc * Math.PI / 180).toFixed(2) + '   ·   구름 보정 ×' + cf.toFixed(2) + '   →   ' + sm.irr + ' W', { size: 14, align: 'left', weight: 700, color: '#475569' });
    energyBar(px, bY + (PHONE ? 100 : 88), pw2, 30, [{ v: sm.p, c: '#16a34a', l: '전기', t: sm.p + ' W' }, { v: sm.irr - sm.p, c: '#f59e0b', l: '열 등 손실', t: (sm.irr - sm.p) + ' W' }], 1000, '들어오는 빛 ' + sm.irr + ' W  (눈금 0 ~ 1000 W)');
    drawWrap(px, bY + DL.bh - (PHONE ? 40 : 26), '태양 전지의 효율은 약 20 %라서 받은 빛의 일부만 전기가 돼요. (교육용 예시)', pw2, 13, { align: 'left', weight: 700, color: '#64748b' });
  }

  /* --- 풍력 --- */
  const WS = { streaks: [], seeded: false };
  function drawWind(t, dt) {
    const v = DV.wind, P = windModel(v);
    sky(0, DL.sh, '#a7d8f5', '#eaf6ff');
    const gy = DL.sh - 44, hx = VW * 0.5, towerH = PHONE ? 250 : 190, hy = gy - towerH, Lb = PHONE ? 118 : 108;
    ctx.fillStyle = '#86d29a'; ctx.beginPath(); ctx.moveTo(0, gy + 8); ctx.quadraticCurveTo(VW * 0.25, gy - 26, VW * 0.5, gy - 4); ctx.quadraticCurveTo(VW * 0.8, gy - 28, VW, gy + 6); ctx.lineTo(VW, DL.sh); ctx.lineTo(0, DL.sh); ctx.fill();
    ctx.fillStyle = '#62b878'; ctx.fillRect(0, gy + 24, VW, DL.sh - gy - 24);
    // 바람 줄기
    if (!WS.seeded) { for (let i = 0; i < 16; i++) WS.streaks.push({ x: Math.random() * VW, y: 50 + Math.random() * (gy - 80), l: 28 + Math.random() * 40 }); WS.seeded = true; }
    const sp = v * 22;
    WS.streaks.forEach((s) => {
      s.x += sp * dt; if (s.x - s.l > VW) { s.x = -s.l; s.y = 50 + Math.random() * (gy - 80); }
      if (v > 0.5) { ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,' + clamp(0.25 + v / 30, 0, 0.8) + ')'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(s.x - s.l, s.y); ctx.quadraticCurveTo(s.x - s.l / 2, s.y - 6, s.x, s.y); ctx.stroke(); ctx.restore(); }
    });
    D.arrow(24, 74, 24 + 10 + v * 8, 74, { color: '#0369a1', width: 6, head: 16, label: '바람 ' + v + ' m/s', labelOffset: -22 });
    // 탑 · 날개
    const grad = ctx.createLinearGradient(hx - 8, 0, hx + 8, 0); grad.addColorStop(0, '#f8fafc'); grad.addColorStop(1, '#cbd5e1');
    ctx.fillStyle = grad; ctx.beginPath(); ctx.moveTo(hx - 7, hy); ctx.lineTo(hx + 7, hy); ctx.lineTo(hx + 11, gy + 8); ctx.lineTo(hx - 11, gy + 8); ctx.fill();
    const wt = v < 3 ? 0.12 * v : 0.28 * Math.min(v, 12);
    DV.omega = approach(DV.omega, wt, dt, 1.4); DV.bladeAng += DV.omega * dt;
    for (let b = 0; b < 3; b++) {
      const a = DV.bladeAng + b * TAU / 3;
      ctx.save(); ctx.translate(hx, hy); ctx.rotate(a);
      const g = ctx.createLinearGradient(0, -5, 0, 5); g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#cbd5e1');
      D.shadow(() => { ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, -6); ctx.quadraticCurveTo(Lb * 0.4, -12, Lb, -2); ctx.lineTo(Lb, 2); ctx.quadraticCurveTo(Lb * 0.4, 8, 0, 6); ctx.closePath(); ctx.fill(); }, { blur: 5, y: 2, color: 'rgba(0,0,0,.2)' });
      ctx.restore();
    }
    if (P > 0) D.glow(hx, hy, 34, '#fde047', 0.35 + 0.15 * P);
    D.sphere(hx, hy, 12, '#e2e8f0', { shadow: true });
    // 전기 → 집
    const hxh = VW * (PHONE ? 0.84 : 0.82);
    const wire = [[hx, gy + 4], [hx, gy + 22], [hxh, gy + 22], [hxh, gy - 14]];
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 3; ctx.beginPath(); wire.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); ctx.stroke();
    if (P > 0) flowDots(wire, t, Math.max(2, Math.round(P * 5)), '#facc15', 50 + P * 70, 3.6);
    ctx.fillStyle = '#fca5a5'; rr(hxh - 24, gy - 40, 48, 30, 3).fill(); ctx.fillStyle = '#b91c1c'; ctx.beginPath(); ctx.moveTo(hxh - 30, gy - 40); ctx.lineTo(hxh, gy - 62); ctx.lineTo(hxh + 30, gy - 40); ctx.fill();
    ctx.fillStyle = P > 0 ? '#fde047' : '#475569'; rr(hxh - 8, gy - 32, 16, 14, 2).fill(); if (P > 0) D.glow(hxh, gy - 25, 30, '#fde047', 0.5);
    if (v < 3) pill(VW - 14, gy - 84, '풍속이 3 m/s보다 약하면 발전을 시작하지 못해요', { size: 13, bg: 'rgba(30,41,59,.85)', color: '#fff', border: null, pad: 10, align: 'right' });
    else if (v >= 12) pill(VW - 14, gy - 84, '풍속 12 m/s 이상: 정격 출력 2.00 MW', { size: 13, bg: '#16a34a', color: '#fff', border: null, pad: 10, align: 'right' });
    // 아래 패널: 출력 곡선
    const bY = DL.by;
    ctx.save(); D.shadow(() => { ctx.fillStyle = '#fff'; rr(10, bY, VW - 20, DL.bh, 14).fill(); }, { blur: 8, y: 2, color: 'rgba(15,23,42,.15)' }); ctx.restore();
    TX(28, bY + 26, '🌬️ 풍속에 따른 터빈 한 대의 출력', { size: 14.5, align: 'left', weight: 800, color: '#0f172a' });
    const gx0 = 72, gx1 = VW - 38, gy0 = bY + DL.bh - 38, gy1 = bY + (PHONE ? 66 : 52);
    const X = (vv) => gx0 + (vv / 20) * (gx1 - gx0), Y = (pp) => gy0 - (pp / 2) * (gy0 - gy1);
    ctx.save(); ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1; ctx.fillStyle = '#64748b'; ctx.font = D.font(12, 700);
    [0, 0.5, 1, 1.5, 2].forEach((pp) => { ctx.beginPath(); ctx.moveTo(gx0, Y(pp)); ctx.lineTo(gx1, Y(pp)); ctx.stroke(); ctx.textAlign = 'right'; ctx.fillText(pp.toFixed(1), gx0 - 6, Y(pp) + 4); });
    [0, 4, 8, 12, 16, 20].forEach((vv) => { ctx.textAlign = 'center'; ctx.fillText(String(vv), X(vv), gy0 + 16); });
    ctx.textAlign = 'left'; ctx.fillText('출력 (MW)', gx0 - 40, gy1 - 8); ctx.textAlign = 'right'; ctx.fillText('풍속 (m/s)', gx1, gy0 + 32);
    ctx.restore();
    ctx.strokeStyle = SUBJ; ctx.lineWidth = 4; ctx.lineJoin = 'round'; ctx.beginPath();
    for (let vv = 0; vv <= 20; vv += 0.25) { const pp = windModel(vv), x = X(vv), y = Y(pp); if (vv === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
    ctx.stroke();
    [6, 12].forEach((vv) => { ctx.fillStyle = '#94a3b8'; ctx.beginPath(); ctx.arc(X(vv), Y(windModel(vv)), 4.5, 0, TAU); ctx.fill(); if (Math.abs(v - vv) < 2.5) return; TX(X(vv) + (vv === 12 ? -8 : 8), Y(windModel(vv)) - 9, vv + ' m/s → ' + windModel(vv).toFixed(2) + ' MW', { size: 12.5, color: '#475569', align: vv === 12 ? 'right' : 'left', weight: 800 }); });
    const cx = X(v), cy = Y(P);
    ctx.save(); ctx.setLineDash([5, 4]); ctx.strokeStyle = 'rgba(15,23,42,.45)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(cx, gy0); ctx.lineTo(cx, cy); ctx.lineTo(gx0, cy); ctx.stroke(); ctx.restore();
    D.sphere(cx, cy, 8, '#e2464b', { shadow: true });
    TX(Math.min(cx + 14, gx1 - 60), Math.max(cy - 14, gy1 + 6), P.toFixed(2) + ' MW', { size: 15, weight: 800, color: '#b91c1c', align: 'left', stroke: '#fff', strokeWidth: 4 });
    TX(gx0, gy0 + 32, '풍속이 2배(6→12 m/s)가 되면 출력은 ' + Math.round(windModel(12) / windModel(6)) + '배', { size: 12.5, align: 'left', color: '#9a3412', weight: 800 });
  }

  /* --- 연료 전지 --- */
  const FCL = PHONE
    ? { cx: 300, y0: 190, y1: 366, ch: 114, pl: 9, mem: 46 }
    : { cx: 400, y0: 148, y1: 298, ch: 134, pl: 8, mem: 44 };
  const FCG = (() => {
    const a = FCL.cx - FCL.mem / 2 - FCL.pl, c = FCL.cx + FCL.mem / 2 + FCL.pl;
    return { chL: [a - FCL.ch, a], anode: [a, a + FCL.pl], mem: [a + FCL.pl, c - FCL.pl], cath: [c - FCL.pl, c], chR: [c, c + FCL.ch], y0: FCL.y0, y1: FCL.y1,
      wire: [[a + FCL.pl / 2, FCL.y0 - 2], [a + FCL.pl / 2, FCL.y0 - 44], [FCL.cx - 24, FCL.y0 - 44], [FCL.cx + 24, FCL.y0 - 44], [c - FCL.pl / 2, FCL.y0 - 44], [c - FCL.pl / 2, FCL.y0 - 2]] };
  })();
  const FC = { h2: [], o2: [], tok: [], water: [], pendE: 0, pendH: 0, timer: 0, init: false, drop: [] };
  const fcRand = (a, b) => a + Math.random() * (b - a);
  function fcInit() {
    FC.h2.length = 0; FC.o2.length = 0; FC.tok.length = 0; FC.water.length = 0; FC.pendE = 0; FC.pendH = 0; FC.drop.length = 0; DV.water = 0; FC.init = true;
    for (let i = 0; i < 2; i++) FC.o2.push({ x: fcRand(FCG.chR[0] + 14, FCG.chR[1] - 14), y: fcRand(FCG.y0 + 14, FCG.y1 - 14), vx: fcRand(-30, 30), vy: fcRand(-30, 30), r: 0 });
  }
  const wireLen = polyLen(FCG.wire);
  function wirePos(u) {
    let d = u; for (let i = 1; i < FCG.wire.length; i++) {
      const a = FCG.wire[i - 1], b = FCG.wire[i], l = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (d <= l) return [lerp(a[0], b[0], d / l), lerp(a[1], b[1], d / l)]; d -= l;
    }
    return FCG.wire[FCG.wire.length - 1];
  }
  function fcStep(dt) {
    if (!FC.init) fcInit();
    const h = DV.h2 / 100, nH = Math.round(h * 14), nO = DV.o2 ? 6 : 0;
    // 분자 수 맞추기 (입구에서 들어오고, 줄이면 사라짐)
    while (FC.h2.length < nH) FC.h2.push({ x: FCG.chL[0] + 4, y: fcRand(FCG.y0 + 30, FCG.y1 - 30), vx: fcRand(40, 70), vy: fcRand(-30, 30), rot: Math.random() * 6, a: 0 });
    while (FC.h2.length > nH) { const m = FC.h2.findIndex((q) => !q.react); if (m < 0) break; FC.h2.splice(m, 1); }
    while (FC.o2.length < nO) FC.o2.push({ x: FCG.chR[1] - 4, y: fcRand(FCG.y0 + 30, FCG.y1 - 30), vx: -fcRand(40, 70), vy: fcRand(-30, 30), rot: 0, a: 0 });
    while (FC.o2.length > nO) FC.o2.pop();
    const box = (m, b) => { const rad = 9; const x0 = b[0] + rad, x1 = b[1] - rad, y0 = FCG.y0 + rad, y1 = FCG.y1 - rad; m.x += m.vx * dt; m.y += m.vy * dt; if (m.x < x0) { m.x = x0; m.vx = Math.abs(m.vx); } if (m.x > x1) { m.x = x1; m.vx = -Math.abs(m.vx); } if (m.y < y0) { m.y = y0; m.vy = Math.abs(m.vy); } if (m.y > y1) { m.y = y1; m.vy = -Math.abs(m.vy); } };
    FC.h2.forEach((m) => {
      m.rot += dt * 2; m.a = Math.min(1, m.a + dt * 3);
      if (m.react) { // 연료극 쪽으로 이동 후 반응
        const tx = FCG.chL[1] - 9, ty = m.ry; m.x = approach(m.x, tx, dt, 8); m.y = approach(m.y, ty, dt, 8);
        if (Math.abs(m.x - tx) < 3) { m.done = true; }
        return;
      }
      if (Math.hypot(m.vx, m.vy) < 25) { m.vx += fcRand(-60, 60); m.vy += fcRand(-60, 60); }
      if (Math.random() < dt * 1.5) { m.vx += fcRand(-30, 30); m.vy += fcRand(-30, 30); const sp = Math.hypot(m.vx, m.vy); if (sp > 80) { m.vx *= 80 / sp; m.vy *= 80 / sp; } }
      box(m, FCG.chL);
    });
    FC.o2.forEach((m) => {
      if (Math.hypot(m.vx, m.vy) < 22) { m.vx += fcRand(-50, 50); m.vy += fcRand(-50, 50); }
      if (Math.random() < dt * 1.2) { m.vx += fcRand(-25, 25); m.vy += fcRand(-25, 25); const sp = Math.hypot(m.vx, m.vy); if (sp > 70) { m.vx *= 70 / sp; m.vy *= 70 / sp; } }
      m.rot += dt; box(m, FCG.chR);
    });
    // 반응: 수소 1분자 → 전자 2개(외부 회로) + 수소 이온 2개(막)
    for (let i = FC.h2.length - 1; i >= 0; i--) {
      const m = FC.h2[i];
      if (m.done) {
        FC.h2.splice(i, 1);
        for (let k = 0; k < 2; k++) {
          FC.tok.push({ t: 'e', u: -k * 22, y: 0 });
          FC.tok.push({ t: 'H', x: FCG.mem[0] + 3, y: clamp(m.y + (k ? 12 : -12), FCG.y0 + 12, FCG.y1 - 12), vx: 70 + k * 10, delay: k * 0.15 });
        }
        parts.burst(FCG.chL[1], m.y, { count: 6, speed: 60, life: 0.4, size: 2.5, colors: ['#93c5fd', '#fff'] });
      }
    }
    if (DV.o2 && h > 0) {
      FC.timer += dt * 2.6 * h;
      if (FC.timer >= 1) {
        FC.timer = 0;
        const cand = FC.h2.filter((q) => !q.react && q.a > 0.9).sort((a, b) => b.x - a.x)[0];
        if (cand) { cand.react = true; cand.ry = cand.y; }
      }
    }
    // 입자(토큰) 이동
    for (let i = FC.tok.length - 1; i >= 0; i--) {
      const q = FC.tok[i];
      if (q.t === 'e') { q.u += 170 * dt; if (q.u >= wireLen) { FC.tok.splice(i, 1); FC.pendE++; } }
      else { if (q.delay > 0) { q.delay -= dt; continue; } q.x += q.vx * dt; if (q.x >= FCG.mem[1] - 2) { FC.tok.splice(i, 1); FC.pendH++; } }
    }
    while (FC.pendE >= 2 && FC.pendH >= 2) {
      FC.pendE -= 2; FC.pendH -= 2;
      FC.water.push({ x: FCG.cath[1] + 12, y: fcRand(FCG.y0 + 30, FCG.y1 - 24), vy: 0, phase: 0 });
      parts.burst(FCG.cath[1] + 8, FC.water[FC.water.length - 1].y, { count: 8, speed: 70, life: 0.45, size: 3, colors: ['#60a5fa', '#bfdbfe'] });
    }
    const outX = FCG.chR[0] + FCL.ch * 0.86;
    for (let i = FC.water.length - 1; i >= 0; i--) {
      const w = FC.water[i];
      if (w.phase === 0) { w.vy += 260 * dt; w.y += w.vy * dt; if (w.y >= FCG.y1 - 9) { w.y = FCG.y1 - 9; w.phase = 1; w.vy = 0; } }
      else if (w.phase === 1) { w.x = approach(w.x, outX, dt, 4); if (Math.abs(w.x - outX) < 3) { w.x = outX; w.phase = 2; } }
      else { w.vy += 300 * dt; w.y += w.vy * dt; if (w.y > FCG.y1 + 28) { FC.water.splice(i, 1); DV.water++; FC.drop.push({ x: outX, y: FCG.y1 + 28, t: 0 }); } }
    }
    for (let i = FC.drop.length - 1; i >= 0; i--) { FC.drop[i].t += dt; if (FC.drop[i].t > 0.5) FC.drop.splice(i, 1); }
  }
  function mol(x, y, rot, c1, a) {
    ctx.save(); ctx.globalAlpha = a == null ? 1 : a; ctx.translate(x, y); ctx.rotate(rot);
    D.sphere(-5, 0, 5.6, c1, { gloss: true }); D.sphere(5, 0, 5.6, c1, { gloss: true }); ctx.restore();
  }
  function drawFC(t, dt) {
    fcStep(dt);
    sky(0, DL.sh, '#eef3f9', '#f8fbff');
    const h = DV.h2 / 100, md = fcModel(DV.h2, DV.o2), g = FCG;
    // 공급관
    const ypipe = (g.y0 + g.y1) / 2 + 10;
    ctx.fillStyle = '#cbd5e1'; ctx.fillRect(PHONE ? 10 : 34, ypipe - 12, g.chL[0] - (PHONE ? 10 : 34), 24); ctx.fillRect(g.chR[1], ypipe - 12, (PHONE ? VW - 10 : VW - 34) - g.chR[1], 24);
    ctx.fillStyle = '#94a3b8'; ctx.fillRect(PHONE ? 10 : 34, ypipe - 12, g.chL[0] - (PHONE ? 10 : 34), 4); ctx.fillRect(g.chR[1], ypipe - 12, (PHONE ? VW - 10 : VW - 34) - g.chR[1], 4);
    TX(PHONE ? 12 : 36, ypipe - 20, '수소(H₂) 공급', { size: 13.5, align: 'left', weight: 800, color: '#1d4ed8' });
    TX(PHONE ? VW - 12 : VW - 36, ypipe - 20, '공기(산소 O₂) 공급', { size: 13.5, align: 'right', weight: 800, color: '#b91c1c' });
    if (!DV.o2) { ctx.save(); ctx.strokeStyle = '#dc2626'; ctx.lineWidth = 5; ctx.lineCap = 'round'; const vx = g.chR[1] + 40; ctx.beginPath(); ctx.moveTo(vx - 12, ypipe - 12); ctx.lineTo(vx + 12, ypipe + 12); ctx.moveTo(vx + 12, ypipe - 12); ctx.lineTo(vx - 12, ypipe + 12); ctx.stroke(); ctx.restore(); }
    // 방(유리 상자)
    const chamber = (b, tint) => { ctx.save(); D.shadow(() => { ctx.fillStyle = rgba(tint, 0.1); rr(b[0], g.y0, b[1] - b[0], g.y1 - g.y0, 6).fill(); }, { blur: 8, y: 3 }); ctx.strokeStyle = rgba(tint, 0.65); ctx.lineWidth = 3; rr(b[0], g.y0, b[1] - b[0], g.y1 - g.y0, 6).stroke(); ctx.restore(); };
    chamber(g.chL, '#3b82f6'); chamber(g.chR, '#ef4444');
    // 막 · 전극
    const mg = ctx.createLinearGradient(g.mem[0], 0, g.mem[1], 0); mg.addColorStop(0, '#fde68a'); mg.addColorStop(1, '#fbbf24');
    ctx.fillStyle = mg; ctx.fillRect(g.mem[0], g.y0, g.mem[1] - g.mem[0], g.y1 - g.y0);
    ctx.fillStyle = 'rgba(180,83,9,.25)'; for (let y = g.y0 + 8; y < g.y1; y += 12) ctx.fillRect(g.mem[0] + 3, y, g.mem[1] - g.mem[0] - 6, 2);
    ctx.fillStyle = '#374151'; ctx.fillRect(g.anode[0], g.y0, g.anode[1] - g.anode[0], g.y1 - g.y0); ctx.fillRect(g.cath[0], g.y0, g.cath[1] - g.cath[0], g.y1 - g.y0);
    TX((g.chL[0] + g.chL[1]) / 2, g.y1 + 20, '연료극 (−)', { size: 14, weight: 800, color: '#1d4ed8' });
    TX(PHONE ? g.chR[0] + FCL.ch * 0.36 : (g.chR[0] + g.chR[1]) / 2, g.y1 + 20, '공기극 (+)', { size: 14, weight: 800, color: '#b91c1c' });
    TX((g.mem[0] + g.mem[1]) / 2, g.y1 + 20, '전해질막', { size: 13, weight: 800, color: '#92400e' });
    // 외부 회로 · 전구
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 3; ctx.beginPath(); g.wire.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); ctx.stroke();
    const lamp = g.wire[2], lx = (lamp[0] + g.wire[3][0]) / 2, ly = lamp[1];
    D.glow(lx, ly - 4, 20 + 60 * md.p, '#fde047', 0.1 + 0.75 * md.p);
    D.sphere(lx, ly - 4, 17, mixc('#cbd5e1', '#fde047', md.p), { gloss: true });
    // 분자 · 토큰
    FC.h2.forEach((m) => mol(m.x, m.y, m.rot, '#60a5fa', m.a));
    FC.o2.forEach((m) => mol(m.x, m.y, m.rot, '#f87171', 1));
    FC.tok.forEach((q) => {
      if (q.t === 'e') { if (q.u < 0) return; const p = wirePos(q.u); D.sphere(p[0], p[1], 5, '#facc15', { gloss: false }); TX(p[0], p[1] - 8, 'e⁻', { size: 10.5, color: '#92400e', weight: 800 }); }
      else if (q.delay <= 0) { D.sphere(q.x, q.y, 5.5, '#f472b6', { gloss: false }); TX(q.x, q.y - 8, 'H⁺', { size: 10.5, color: '#9d174d', weight: 800 }); }
    });
    FC.water.forEach((w) => { ctx.save(); ctx.fillStyle = '#38bdf8'; ctx.beginPath(); ctx.moveTo(w.x, w.y - 8); ctx.quadraticCurveTo(w.x + 7, w.y + 2, w.x, w.y + 7); ctx.quadraticCurveTo(w.x - 7, w.y + 2, w.x, w.y - 8); ctx.fill(); ctx.restore(); });
    // 배수구
    const outX = g.chR[0] + FCL.ch * 0.86;
    ctx.fillStyle = '#cbd5e1'; ctx.fillRect(outX - 9, g.y1 - 1, 18, 34); ctx.fillStyle = '#e0f2fe'; ctx.fillRect(outX - 5, g.y1 - 1, 10, 34);
    TX(outX + 16, g.y1 + 30, '물(H₂O)', { size: 13.5, align: 'left', weight: 800, color: '#0369a1' });
    FC.drop.forEach((d) => { ctx.save(); ctx.globalAlpha = 1 - d.t * 2; ctx.fillStyle = '#38bdf8'; ctx.beginPath(); ctx.arc(d.x, d.y + d.t * 40, 4, 0, TAU); ctx.fill(); ctx.restore(); });
    // 설명
    drawWrap(VW / 2, PHONE ? 76 : 58, DV.o2 ? '수소는 연료극에서 전자를 잃고(산화), 전자는 외부 회로로 흘러 전기를 만들어요. 산소는 전자를 얻어(환원) 수소 이온과 만나 물이 돼요.' : '공기(산소)가 들어오지 않으면 반응이 일어나지 않아 전자가 흐르지 못해요.', VW - (PHONE ? 40 : 160), PHONE ? 13 : 13.5, { color: DV.o2 ? '#334155' : '#b91c1c', weight: 800 });
    // 아래 패널
    const bY = DL.by;
    ctx.save(); D.shadow(() => { ctx.fillStyle = '#fff'; rr(10, bY, VW - 20, DL.bh, 14).fill(); }, { blur: 8, y: 2, color: 'rgba(15,23,42,.15)' }); ctx.restore();
    const fuel = DV.o2 ? 2 * h : 0;
    drawWrap(28, bY + 28, '🔋 연료 전지 한 개: 수소를 최대로 공급하면 수소가 2.00 kW의 에너지를 줘요', VW - 56, PHONE ? 13.5 : 14.5, { align: 'left', weight: 800, color: '#0f172a' });
    energyBar(28, bY + (PHONE ? 100 : 80), VW - 56, 30, [{ v: md.p, c: '#16a34a', l: '전기', t: md.p.toFixed(2) + ' kW' }, { v: fuel - md.p, c: '#f59e0b', l: '열', t: (fuel - md.p).toFixed(2) + ' kW' }], 2, '쓰이는 수소의 에너지 ' + fuel.toFixed(2) + ' kW  (눈금 0 ~ 2.00 kW)');
    drawWrap(28, bY + DL.bh - (PHONE ? 44 : 30), '효율은 약 50 %예요. 수소를 만들 때도 에너지가 필요해서, 수소는 에너지를 저장·운반하는 수단이기도 해요. (교육용 예시)', VW - 56, 12.5, { align: 'left', weight: 700, color: '#64748b' });
    if (!DV.o2) pill(g.chR[0] + FCL.ch / 2, g.y0 + 24, '✕ 산소가 없어요', { size: 13, bg: '#fee2e2', color: '#b91c1c', border: '#fca5a5', pad: 10 });
  }
  function drawDev(t, dt) {
    if (DV.sub === 'solar') drawSolar(t, dt); else if (DV.sub === 'wind') drawWind(t, dt); else drawFC(t, dt);
    caption(DV.sub === 'solar' ? '☀️ 태양광 발전' : DV.sub === 'wind' ? '🌬️ 풍력 발전' : '🔋 연료 전지');
    devHitCheck();
  }
  /* =========================================================
     ③④ 하루 전기 · 마을 설계
     ========================================================= */
  const GL = PHONE
    ? { town: 140, panelY: 146, panelH: 336, leg: [160, 180], ch: { x: 46, y: 204, w: 540, h: 232 }, lab: 456, soc: { y: 490, h: 54 }, bot: { y: 556, h: 276 } }
    : { town: 100, panelY: 106, panelH: 266, leg: [118], ch: { x: 52, y: 140, w: 722, h: 196 }, lab: 354, soc: { y: 378, h: 38 }, bot: { y: 424, h: 130 } };
  const CW24 = GL.ch.w / 24;
  const GA = { ymax: 150, h: [], soc: [] };
  for (let h = 0; h < 24; h++) { GA.h.push({ s: 0, w: 0, dis: 0, gas: 0, un: 0, ch: 0, waste: 0, d: DEM[h] }); GA.soc.push(0); }
  const hatchCache = {};
  function hatch(col) {
    if (hatchCache[col]) return hatchCache[col];
    const c = document.createElement('canvas'); c.width = c.height = 8; const x = c.getContext('2d');
    x.strokeStyle = col; x.lineWidth = 2; x.beginPath(); x.moveTo(-2, 10); x.lineTo(10, -2); x.moveTo(-2, 6); x.lineTo(6, -2); x.moveTo(2, 10); x.lineTo(10, 2); x.stroke();
    return (hatchCache[col] = ctx.createPattern(c, 'repeat'));
  }
  const nice = (v) => { const L = [150, 200, 250, 300, 400, 500]; for (const n of L) if (v <= n) return n; return 600; };
  const hourOf = (p) => (p.x >= GL.ch.x && p.x < GL.ch.x + GL.ch.w && p.y >= GL.ch.y - 6 && p.y <= GL.lab + 8 ? clamp(Math.floor((p.x - GL.ch.x) / CW24), 0, 23) : -1);

  function drawTown(t, dt, res, P) {
    const H = GL.town, hi = Math.floor(G.ph) % 24, hr = res.h[hi], hf = G.ph % 24;
    const day = clamp(Math.sin((hf - 6) / 12 * Math.PI) * 1.7, 0, 1);
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, mixc('#0b1437', '#5fb4ee', day)); g.addColorStop(1, mixc('#27346e', '#d7efff', day));
    ctx.fillStyle = g; ctx.fillRect(0, 0, VW, H);
    if (day < 0.5) { ctx.fillStyle = 'rgba(255,255,255,' + (0.8 - day * 1.6) + ')'; for (let i = 0; i < 26; i++) { const sx = (i * 97.3) % VW, sy = (i * 41.7) % (H - 30); ctx.fillRect(sx, sy, 2, 2); } }
    // 해 · 달
    if (hf >= 6 && hf <= 18) { const u = (hf - 6) / 12, sx = lerp(34, VW - 34, u), sy = H - 24 - Math.sin(Math.PI * u) * (H - 48); D.glow(sx, sy, 34, '#fde68a', 0.6 * (hr.s > 0 || day > 0.4 ? 1 : 0.5)); D.sphere(sx, sy, 12, '#fbbf24', { gloss: false }); }
    else { const u = (((hf + 6) % 24)) / 12, sx = lerp(34, VW - 34, u), sy = H - 24 - Math.sin(Math.PI * clamp(u, 0, 1)) * (H - 48); D.sphere(sx, sy, 10, '#e2e8f0', { gloss: false }); }
    if (P.wx === 'cloud' && day > 0.1) { cloudShape(VW * 0.18 + Math.sin(t * 0.2) * 10, 30, 0.42, 0.95); cloudShape(VW * 0.55, 22, 0.36, 0.9); cloudShape(VW * 0.84, 34, 0.4, 0.92); }
    // 언덕
    ctx.fillStyle = mixc('#14532d', '#4ade80', day * 0.7); ctx.beginPath(); ctx.moveTo(0, H); ctx.lineTo(0, H - 14); ctx.quadraticCurveTo(VW * 0.25, H - 30, VW * 0.5, H - 12); ctx.quadraticCurveTo(VW * 0.78, H - 30, VW, H - 12); ctx.lineTo(VW, H); ctx.fill();
    // 풍력 터빈
    const nT = P.wind > 0 ? clamp(Math.ceil(P.wind / 100), 1, 4) : 0, wfrac = WIN[hi] * WEATHER[P.wx].wf / 100;
    for (let i = 0; i < nT; i++) {
      const tx = (PHONE ? 176 : 150) + i * (PHONE ? 26 : 28), th = H - 14, tH = H - 62;
      ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(tx, th); ctx.lineTo(tx, th - tH); ctx.stroke();
      const a = t * (0.3 + 9 * wfrac) + i * 1.3; ctx.strokeStyle = '#f8fafc'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      for (let b = 0; b < 3; b++) { const ang = a + b * TAU / 3; ctx.beginPath(); ctx.moveTo(tx, th - tH); ctx.lineTo(tx + Math.cos(ang) * 17, th - tH + Math.sin(ang) * 17); ctx.stroke(); }
    }
    // 집 8채
    const hx0 = VW * (PHONE ? 0.4 : 0.33), hw = (VW * (PHONE ? 0.34 : 0.38)) / 8, served = hr.d > 0 ? (hr.d - hr.un) / hr.d : 1, lit = Math.round(served * 16);
    const nS = P.solar > 0 ? clamp(Math.ceil(P.solar / 100), 1, 4) : 0, sunNow = SOL[hi] * WEATHER[P.wx].sf / 90;
    for (let i = 0; i < 8; i++) {
      const x = hx0 + i * hw + hw / 2, y = H - 14, w = hw - 6, h = 24;
      ctx.fillStyle = mixc('#64748b', '#f8fafc', day * 0.5); rr(x - w / 2, y - h, w, h, 3).fill();
      ctx.fillStyle = i < nS ? '#1d4ed8' : '#b45309'; ctx.beginPath(); ctx.moveTo(x - w / 2 - 3, y - h); ctx.lineTo(x, y - h - 12); ctx.lineTo(x + w / 2 + 3, y - h); ctx.fill();
      if (i < nS && sunNow > 0.05) { ctx.fillStyle = 'rgba(253,224,71,' + (0.25 + 0.5 * sunNow) + ')'; ctx.beginPath(); ctx.moveTo(x - w / 2 - 3, y - h); ctx.lineTo(x, y - h - 12); ctx.lineTo(x + w / 2 + 3, y - h); ctx.fill(); }
      for (let k = 0; k < 2; k++) {
        const on = i * 2 + k < lit; ctx.fillStyle = on ? '#fde047' : '#1e293b';
        if (on) D.glow(x - w / 4 + k * w / 2, y - h / 2, 11, '#fde047', 0.3 + 0.3 * (1 - day));
        rr(x - w / 2 + 3 + k * (w / 2 - 1), y - h + 6, w / 2 - 5, 9, 2).fill();
      }
    }
    // 가스 발전소 · 배터리
    const gx = VW * (PHONE ? 0.84 : 0.84);
    if (P.gas > 0 || S.mode === 'plan') {
      ctx.fillStyle = '#6b7280'; rr(gx - 18, H - 36, 34, 24, 3).fill(); ctx.fillStyle = '#4b5563'; ctx.fillRect(gx + 6, H - 54, 8, 20);
      if (hr.gas > 0.5 && !RM && Math.random() < dt * (2 + hr.gas / 12)) parts.emit({ x: gx + 10, y: H - 56, vx: 8 + Math.random() * 10, vy: -22, life: 1.1, size: 6, color: '#9ca3af', shape: 'smoke', fade: true, grow: 7 });
    }
    if (P.batt > 0) {
      const bx = VW * 0.94, frac = clamp(hr.st / P.batt, 0, 1);
      ctx.fillStyle = '#e2e8f0'; rr(bx - 12, H - 38, 24, 26, 4).fill(); ctx.fillStyle = '#e2e8f0'; ctx.fillRect(bx - 4, H - 42, 8, 5);
      ctx.fillStyle = '#16a34a'; rr(bx - 9, H - 35 + 20 * (1 - frac), 18, 20 * frac, 2).fill();
    }
    // 시각 표시
    pill(12, 17, WEATHER[P.wx].icon + ' ' + WEATHER[P.wx].name + ' · ' + String(hi).padStart(2, '0') + '시', { size: 13, bg: 'rgba(15,23,42,.72)', color: '#fff', border: null, align: 'left', pad: 10 });
    if (S.mode === 'plan' && planOk(P)) pill(VW * 0.5, 17, '✅ 세 날씨 모두 조건 달성', { size: 13, bg: '#16a34a', color: '#fff', border: null, pad: 12 });
    else if (hr.un > 0.01 && G.showGap) { const bl = 0.5 + 0.5 * Math.sin(t * 8); pill(VW / 2 + (PHONE ? 0 : 0), 17, '⚠️ 정전 ' + Math.round(hr.un) + ' MW 부족', { size: 13, bg: rgba('#dc2626', 0.75 + 0.2 * bl), color: '#fff', border: null, pad: 12 }); }
  }

  function gridStep(dt, res, P) {
    // 값이 목표를 향해 부드럽게 움직여요
    let peak = 130;
    res.h.forEach((o, h) => {
      const a = GA.h[h];
      a.s = approach(a.s, o.s, dt, 12); a.w = approach(a.w, o.w, dt, 12); a.dis = approach(a.dis, o.dis, dt, 12); a.gas = approach(a.gas, o.gas, dt, 12);
      a.un = approach(a.un, o.un, dt, 12); a.ch = approach(a.ch, o.ch, dt, 12); a.waste = approach(a.waste, o.waste, dt, 12); a.d = o.d;
      GA.soc[h] = approach(GA.soc[h], o.st, dt, 12);
      peak = Math.max(peak, o.ren, o.d);
    });
    GA.ymax = approach(GA.ymax, nice(peak * 1.04), dt, 8);
    if (G.play) { G.ph += dt * 2; if (G.ph >= 24) { G.ph = 0; } }
  }

  function legendRow(items, y) {
    let total = 0; ctx.save(); ctx.font = D.font(13, 800);
    const ws = items.map((it) => 22 + ctx.measureText(it.l).width + 12); ctx.restore();
    total = ws.reduce((a, b) => a + b, 0);
    let x = (VW - total) / 2 + 4;
    items.forEach((it, i) => {
      if (it.line) { ctx.strokeStyle = it.c; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 16, y); ctx.stroke(); }
      else { ctx.fillStyle = it.hatch ? rgba(it.c, 0.12) : it.c; rr(x, y - 7, 15, 14, 3).fill(); if (it.hatch) { ctx.fillStyle = hatch(it.c); rr(x, y - 7, 15, 14, 3).fill(); } }
      TX(x + 21, y + 5, it.l, { size: 13, align: 'left', weight: 800, color: '#334155' });
      x += ws[i];
    });
  }
  function infoCard(x, y, w, h, title, big, sub, col) {
    ctx.save(); D.shadow(() => { ctx.fillStyle = '#fff'; rr(x, y, w, h, 14).fill(); }, { blur: 8, y: 2, color: 'rgba(15,23,42,.15)' }); ctx.restore();
    ctx.strokeStyle = col || '#e2e8f0'; ctx.lineWidth = 2.5; rr(x, y, w, h, 14).stroke();
    TX(x + w / 2, y + 24, title, { size: PHONE ? 12.5 : 13.5, weight: 800, color: '#475569' });
    TX(x + w / 2, y + h * 0.66, big, { size: PHONE ? 22 : 27, weight: 800, color: col || '#0f172a' });
    if (sub) drawWrap(x + w / 2, y + h - 14, sub, w - 12, 12, { color: '#64748b', weight: 700 });
  }
  const planOk = (P) => { const sc = planScore(P); return sc.hrs.every((x) => x === 0) && sc.co2.every((x) => x <= PLAN_CO2_MAX) && sc.cost <= PLAN_COST_MAX; };

  function drawGrid(t, dt) {
    const P = gridP(), res = calc(P);
    gridStep(dt, res, P);
    drawTown(t, dt, res, P);
    const pY = GL.panelY, ch = GL.ch;
    ctx.save(); D.shadow(() => { ctx.fillStyle = '#fff'; rr(8, pY, VW - 16, GL.panelH, 14).fill(); }, { blur: 8, y: 2, color: 'rgba(15,23,42,.15)' }); ctx.restore();
    const items = [{ l: '태양광', c: '#fbbf24' }, { l: '풍력', c: '#2dd4bf' }];
    if (P.batt > 0) items.push({ l: '배터리 방전', c: '#60a5fa' });
    if (S.mode === 'plan' || P.gas > 0) items.push({ l: '가스 발전', c: '#6b7280' });
    items.push({ l: '수요', c: '#0f172a', line: true });
    if (G.showGap) items.push({ l: '부족', c: '#ef4444', hatch: true });
    if (P.batt > 0) items.push({ l: '저장', c: '#2563eb', hatch: true });
    items.push({ l: '버려짐', c: '#64748b', hatch: true });
    if (PHONE) { legendRow(items.slice(0, 4), GL.leg[0]); legendRow(items.slice(4), GL.leg[1]); } else legendRow(items, GL.leg[0]);
    // 눈금
    const Y = (v) => ch.y + ch.h - (v / GA.ymax) * ch.h;
    ctx.save(); ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1; ctx.fillStyle = '#64748b'; ctx.font = D.font(12, 700); ctx.textAlign = 'right';
    const stepV = GA.ymax > 300 ? 100 : GA.ymax > 150 ? 50 : 50;
    for (let v = 0; v <= GA.ymax + 0.1; v += stepV) { ctx.beginPath(); ctx.moveTo(ch.x, Y(v)); ctx.lineTo(ch.x + ch.w, Y(v)); ctx.stroke(); ctx.fillText(String(v), ch.x - 6, Y(v) + 4); }
    ctx.textAlign = 'left'; ctx.fillText('MW', ch.x - 40, ch.y - 8);
    ctx.textAlign = 'center'; for (let h = 0; h <= 24; h += 3) ctx.fillText(h === 24 ? '24' : String(h), ch.x + h * CW24, GL.lab);
    ctx.fillText('시', ch.x + ch.w + 14, GL.lab);
    ctx.restore();
    // 막대
    const blink = 0.5 + 0.5 * Math.sin(t * 6);
    for (let h = 0; h < 24; h++) {
      const a = GA.h[h], x = ch.x + h * CW24 + 1, w = CW24 - 2;
      let b = 0; const seg = (v, c) => { if (v < 0.01) return; const y1 = Y(b + v), y0 = Y(b); const gr = ctx.createLinearGradient(0, y1, 0, y0); gr.addColorStop(0, shade(c, 0.2)); gr.addColorStop(1, c); ctx.fillStyle = gr; ctx.fillRect(x, y1, w, y0 - y1); b += v; };
      seg(a.s, '#fbbf24'); seg(a.w, '#2dd4bf'); seg(a.dis, '#60a5fa'); seg(a.gas, '#6b7280');
      if (a.un > 0.05 && G.showGap) { const y0 = Y(b + a.un), y1 = Y(b); ctx.fillStyle = rgba('#ef4444', 0.18 + 0.2 * blink); ctx.fillRect(x, y0, w, y1 - y0); ctx.fillStyle = hatch('#dc2626'); ctx.fillRect(x, y0, w, y1 - y0); }
      if (a.ch > 0.05) { const y0 = Y(a.d + a.ch), y1 = Y(a.d); ctx.fillStyle = 'rgba(37,99,235,.35)'; ctx.fillRect(x, y0, w, y1 - y0); ctx.fillStyle = hatch('#1d4ed8'); ctx.fillRect(x, y0, w, y1 - y0); }
      if (a.waste > 0.05) { const y0 = Y(a.d + a.ch + a.waste), y1 = Y(a.d + a.ch); ctx.fillStyle = 'rgba(100,116,139,.22)'; ctx.fillRect(x, y0, w, y1 - y0); ctx.fillStyle = hatch('#475569'); ctx.fillRect(x, y0, w, y1 - y0); }
    }
    // 수요선
    ctx.save(); ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 3; ctx.lineJoin = 'miter'; ctx.beginPath();
    for (let h = 0; h < 24; h++) { const x0 = ch.x + h * CW24, y = Y(DEM[h]); if (h === 0) ctx.moveTo(x0, y); else ctx.lineTo(x0, y); ctx.lineTo(x0 + CW24, y); }
    ctx.stroke(); ctx.restore();
    // 표시한 시간 · 현재 시각
    G.marks.forEach((h) => { const x = ch.x + h * CW24; ctx.strokeStyle = '#f97316'; ctx.lineWidth = 3; rr(x + 0.5, ch.y - 3, CW24 - 1, ch.h + 8, 4).stroke(); TX(x + CW24 / 2, ch.y - 7, '🚩', { size: 12 }); });
    const px = ch.x + (G.ph / 24) * ch.w; ctx.save(); ctx.strokeStyle = 'rgba(15,23,42,.8)'; ctx.lineWidth = 2; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(px, ch.y - 4); ctx.lineTo(px, ch.y + ch.h); ctx.stroke(); ctx.restore();
    ctx.fillStyle = '#0f172a'; ctx.beginPath(); ctx.moveTo(px - 6, ch.y - 10); ctx.lineTo(px + 6, ch.y - 10); ctx.lineTo(px, ch.y - 2); ctx.fill();
    // 배터리 저장량
    const sc = GL.soc;
    ctx.save(); D.shadow(() => { ctx.fillStyle = '#fff'; rr(8, sc.y, VW - 16, sc.h, 12).fill(); }, { blur: 6, y: 2, color: 'rgba(15,23,42,.12)' }); ctx.restore();
    if (P.batt > 0) {
      const bh = sc.h - (PHONE ? 30 : 10), by = sc.y + sc.h - 6;
      for (let h = 0; h < 24; h++) { const f = clamp(GA.soc[h] / P.batt, 0, 1); ctx.fillStyle = '#93c5fd'; rr(ch.x + h * CW24 + 2, by - bh * f, CW24 - 4, Math.max(1, bh * f), 2).fill(); }
      ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(ch.x, by); ctx.lineTo(ch.x + ch.w, by); ctx.stroke();
      TX(16, sc.y + (PHONE ? 22 : 17), '🔋 배터리 저장량', { size: PHONE ? 12 : 12.5, align: 'left', weight: 800, color: '#334155', stroke: '#fff', strokeWidth: 4 });
      TX(ch.x + ch.w, sc.y + (PHONE ? 22 : 17), '최대 ' + P.batt + ' MWh', { size: 12, align: 'right', weight: 800, color: '#475569', stroke: '#fff', strokeWidth: 4 });
    } else TX(VW / 2, sc.y + sc.h / 2 + 5, '🔋 배터리가 없어요 (남는 전기는 버려져요)', { size: 13.5, weight: 800, color: '#94a3b8' });
    // 아래 카드
    const b = GL.bot;
    if (S.mode === 'grid') {
      const cw3 = (VW - 16 - 2 * 10) / 3;
      const eve = R1(res.evening);
      infoCard(8, b.y, cw3, b.h, '공급이 모자란 시간', G.showGap ? res.unmetH + '시간' : '?', G.showGap ? (res.unmetH ? '하루 24시간 중' : '하루 내내 충분해요') : '그래프를 보고 직접 찾아요', G.showGap ? (res.unmetH ? '#dc2626' : '#16a34a') : '#64748b');
      infoCard(8 + cw3 + 10, b.y, cw3, b.h, EV_FROM + '~' + EV_TO + '시 부족한 전기', G.showGap ? eve + ' MWh' : '?', '수요 130 MW가 이어지는 저녁', G.showGap ? (eve > M2_TARGET ? '#dc2626' : '#16a34a') : '#64748b');
      infoCard(8 + 2 * (cw3 + 10), b.y, cw3, b.h, '남아서 버려진 전기', R1(res.waste) + ' MWh', '저장한 전기 ' + R1(res.charged) + ' MWh', res.waste > 0 ? '#b45309' : '#16a34a');
    } else drawPlanBottom(t, dt, P, res);
  }

  /* 마을 설계 아래 영역: 날씨별 표 · 비용 · 점수 */
  function drawPlanBottom(t, dt, P, res) {
    const b = GL.bot, sc = planScore(P);
    const ok = planOk(P);
    const tw = PHONE ? VW - 16 : 336, th = PHONE ? 104 : b.h, tx = 8, ty = b.y;
    ctx.save(); D.shadow(() => { ctx.fillStyle = '#fff'; rr(tx, ty, tw, th, 14).fill(); }, { blur: 8, y: 2, color: 'rgba(15,23,42,.15)' }); ctx.restore();
    const rowH = (th - 30) / 3, c1 = tx + 14, c2 = tx + tw * 0.46, c3 = tx + tw * 0.74;
    TX(c1, ty + 19, '날씨', { size: 12, align: 'left', weight: 800, color: '#64748b' }); TX(c2, ty + 19, 'CO₂', { size: 12, align: 'left', weight: 800, color: '#64748b' }); TX(c3, ty + 19, '정전 시간', { size: 12, align: 'left', weight: 800, color: '#64748b' });
    WKEYS.forEach((w, i) => {
      const y = ty + 28 + i * rowH, cur = G.wx === w;
      if (cur) { ctx.fillStyle = 'rgba(14,165,233,.12)'; rr(tx + 6, y, tw - 12, rowH - 2, 8).fill(); }
      TX(c1, y + rowH / 2 + 4, WEATHER[w].icon + ' ' + WEATHER[w].name, { size: 13.5, align: 'left', weight: 800, color: '#1e293b' });
      TX(c2, y + rowH / 2 + 4, sc.co2[i] + ' t', { size: 14, align: 'left', weight: 800, color: sc.co2[i] <= PLAN_CO2_MAX ? '#166534' : '#b45309' });
      TX(c3, y + rowH / 2 + 4, sc.hrs[i] + '시간', { size: 14, align: 'left', weight: 800, color: sc.hrs[i] === 0 ? '#166534' : '#dc2626' });
    });
    const cx = PHONE ? 8 : tx + tw + 10, cy = PHONE ? ty + th + 10 : ty, cw = PHONE ? (VW - 16 - 10) * 0.4 : 150, chh = PHONE ? b.h - th - 10 : b.h;
    infoCard(cx, cy, cw, chh, '💰 비용 점수', sc.cost.toFixed(1), '목표 ' + PLAN_COST_MAX + ' 이하', sc.cost <= PLAN_COST_MAX ? '#16a34a' : '#dc2626');
    const sx = cx + cw + 10, sw = VW - 8 - sx;
    ctx.save(); D.shadow(() => { ctx.fillStyle = '#fff'; rr(sx, cy, sw, chh, 14).fill(); }, { blur: 8, y: 2, color: 'rgba(15,23,42,.15)' }); ctx.restore();
    const rows = [['🌍 환경', sc.env, '#16a34a'], ['💰 경제', sc.eco, '#f59e0b'], ['🔌 사회', sc.soc, '#0ea5e9']];
    TX(sx + 12, cy + 19, '균형 점수 (세 날씨 평균, 100점 만점)', { size: PHONE ? 11.5 : 12, align: 'left', weight: 800, color: '#64748b' });
    rows.forEach((r, i) => {
      const y = cy + 28 + i * ((chh - 34) / 3) + 4, bw = sw - 124;
      TX(sx + 12, y + 14, r[0], { size: 13.5, align: 'left', weight: 800, color: '#1e293b' });
      G.sc = G.sc || [0, 0, 0]; G.sc[i] = approach(G.sc[i], r[1], dt, 8);
      glossBar(sx + 74, y + 2, bw, 15, G.sc[i] / 100, r[2]);
      TX(sx + sw - 12, y + 15, String(r[1]), { size: 14, align: 'right', weight: 800, color: '#1e293b' });
    });
  }

  // 그리드 포인터: 클릭하면 시각 이동, 눌러 끌면 '부족한 시간' 표시 (하루 전기 화면)
  function gridDown(p) {
    const h = hourOf(p);
    if (h < 0) {
      if (S.mode === 'plan') { // 날씨 표 행 누르기
        const b = GL.bot, th = PHONE ? 104 : b.h, tw = PHONE ? VW - 16 : 336;
        if (p.x >= 8 && p.x <= 8 + tw && p.y >= b.y + 28 && p.y <= b.y + th) { const i = clamp(Math.floor((p.y - b.y - 28) / ((th - 30) / 3)), 0, 2); setWeather(WKEYS[i]); Sound.tick(); }
      }
      return false;
    }
    G.ph = h + 0.5; G.play = false; ctlUpdate();
    if (S.mode === 'grid') { G.paint = G.marks.has(h) ? 'off' : 'on'; applyPaint(h); return true; }
    return false;
  }
  function applyPaint(h) {
    if (G.paint === 'on' && !G.marks.has(h)) { G.marks.add(h); Sound.tick(); G.pop.set(h, S.t); }
    else if (G.paint === 'off' && G.marks.has(h)) { G.marks.delete(h); Sound.tick(); }
  }
  function gridMove(p) { if (!G.paint) return; const h = hourOf(p); if (h >= 0) { applyPaint(h); G.ph = h + 0.5; } }
  function gridUp() { G.paint = null; }
  function shortHours(P) { const r = calc(P); const s = new Set(); r.h.forEach((o, h) => { if (o.un > 0) s.add(h); }); return s; }
  /* =========================================================
     화면 전환 · 조작 연결
     ========================================================= */
  const MODE_LABEL = { cat: '📖 신재생 에너지 도감', sort: '🗂️ 신에너지 · 재생 에너지 분류', dev: '🔧 발전 장치 만져 보기', grid: '📈 하루 24시간 전기 수요와 공급', plan: '🏘️ 우리 마을 에너지 계획' };
  const MODE_FEAT = { cat: 'cat', sort: 'sort', dev: 'dev', grid: 'grid', plan: 'plan' };
  const MODE_HINT = {
    cat: '카드를 눌러 에너지가 전기로 바뀌는 과정을 봐요',
    sort: '카드를 끌어 알맞은 칸에 놓아요',
    dev: '슬라이더를 움직여 출력이 어떻게 변하는지 봐요',
    grid: '막대 위를 눌러 시각을 옮기고, 눌러 끌면 부족한 시간을 표시해요',
    plan: '설비를 바꾸면 하루 전기가 다시 계산돼요. 날씨 표의 줄을 눌러도 날씨가 바뀌어요',
  };
  let snapCv = null;
  function setMode(m) {
    if (!MODE_FEAT[m] || (!hasF(MODE_FEAT[m]) && game)) return;
    if (m === S.mode) { ctlUpdate(); return; }
    S.mode = m; S.fade = 1;
    if (m === 'sort' && !sortBoard) buildSort();
    G.paint = null;
    $('#tbLabel').textContent = MODE_LABEL[m];
    showHint(MODE_HINT[m], 4200); ctlUpdate();
  }
  function ensure(m, sub) { if (sub) DV.sub = sub; if (m !== S.mode) { hideHint(); S.mode = m; S.fade = 1; if (m === 'sort' && !sortBoard) buildSort(); $('#tbLabel').textContent = MODE_LABEL[m]; } G.paint = null; ctlUpdate(); }
  function setWeather(w) { G.wx = w; ctlUpdate(); }
  function setDev(d) { DV.sub = d; ctlUpdate(); }
  const SLIDERS = {};
  function ctlUpdate() {
    const mode = S.mode, sub = mode === 'dev' ? DV.sub : '';
    $$('#ctrlCard [data-show]').forEach((el) => {
      const toks = el.dataset.show.split(/\s+/);
      let on = toks.some((x) => x === mode || (sub && x === mode + ':' + sub));
      if (el.id === 'presBox') on = mode === 'plan' && (PL.pres || free());
      el.hidden = !on;
    });
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === mode));
    $$('#devSeg button').forEach((b) => b.classList.toggle('on', b.dataset.dev === DV.sub));
    $$('.wxSeg button').forEach((b) => b.classList.toggle('on', b.dataset.wx === G.wx));
    $$('#capSeg button').forEach((b) => b.classList.toggle('on', +b.dataset.cap === G.solar));
    $$('.opt[data-g]').forEach((b) => b.classList.toggle('on', PL['pick' + b.dataset.g] === b.dataset.v));
    const bo = $('#bO2'); if (bo) { bo.textContent = DV.o2 ? '💨 공기(산소) 공급: 켜짐' : '💨 공기(산소) 공급: 꺼짐'; bo.classList.toggle('on', DV.o2); }
    const bp = $('#bPlay'); if (bp) bp.textContent = G.play ? '⏸ 하루 멈춤' : '▶ 하루 재생';
    const so = $('#oOpen'); if (so) so.textContent = CAT.opened.size + ' / 7';
    const sl = $('#oSorted'); if (sl) sl.textContent = (sortBoard ? sortBoard.placed() : 0) + ' / 7';
    // 슬라이더 값 동기화
    const sync = (id, v) => { const s = SLIDERS[id]; if (s) s.set(v); };
    sync('sAngle', DV.angle); sync('sCloud', DV.cloud); sync('sWind', DV.wind); sync('sH2', DV.h2);
    sync('sBatt', G.batt); sync('pSol', PL.solar); sync('pWin', PL.wind); sync('pBatt', PL.batt); sync('pGas', PL.gas);
  }
  function bindUI() {
    const OUT = { sAngle: 'oAngle', sCloud: 'oCloud', sWind: 'oWind', sH2: 'oH2', sBatt: 'oBatt', pSol: 'oPSol', pWin: 'oPWin', pBatt: 'oPBatt', pGas: 'oPGas' };
    const bind = (id, fmt, fn) => { const inp = $('#' + id), out = $('#' + OUT[id]); if (!inp) return; SLIDERS[id] = SciSim.bindRange(inp, out, fmt, (v) => { fn(v); }); };
    bind('sAngle', (v) => v + '°', (v) => { DV.angle = v; });
    bind('sCloud', (v) => v + ' %', (v) => { DV.cloud = v; });
    bind('sWind', (v) => v + ' m/s', (v) => { DV.wind = v; });
    bind('sH2', (v) => v + ' %', (v) => { DV.h2 = v; });
    bind('sBatt', (v) => v + ' MWh', (v) => { G.batt = v; });
    bind('pSol', (v) => v + ' MW', (v) => { PL.solar = v; });
    bind('pWin', (v) => v + ' MW', (v) => { PL.wind = v; });
    bind('pBatt', (v) => v + ' MWh', (v) => { PL.batt = v; });
    bind('pGas', (v) => v + ' MW', (v) => { PL.gas = v; });
    $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setMode(b.dataset.mode); }));
    $$('#devSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setDev(b.dataset.dev); }));
    $$('.wxSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setWeather(b.dataset.wx); }));
    $$('#capSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); G.solar = +b.dataset.cap; ctlUpdate(); }));
    $('#bO2').addEventListener('click', () => { Sound.click(); DV.o2 = !DV.o2; ctlUpdate(); });
    $('#bSortReset').addEventListener('click', () => { Sound.click(); sortReset(); ctlUpdate(); });
    $('#bClearMarks').addEventListener('click', () => { Sound.click(); G.marks.clear(); });
    $$('.bPlay').forEach((b) => b.addEventListener('click', () => { Sound.click(); G.play = !G.play; if (G.play && G.ph >= 23.9) G.ph = 0; ctlUpdate(); }));
    $$('.opt[data-g]').forEach((b) => b.addEventListener('click', () => { Sound.click(); PL['pick' + b.dataset.g] = b.dataset.v; ctlUpdate(); }));
    SciSim.pointer(view, {
      down(p) {
        if (S.mode === 'cat') { for (let i = 0; i < SRC.length; i++) { const r = catCardRect(i); if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) { catSelect(SRC[i].id); Sound.click(); ctlUpdate(); break; } } return false; }
        if (S.mode === 'sort') return sortBoard ? sortBoard.onDown(p) : false;
        if (S.mode === 'grid' || S.mode === 'plan') return gridDown(p);
        return false;
      },
      move(p) { if (S.mode === 'sort' && sortBoard) sortBoard.move(p); else if (S.mode === 'grid') gridMove(p); },
      up(p) { if (S.mode === 'sort' && sortBoard) { sortBoard.up(p); ctlUpdate(); } else gridUp(); },
      hover(p) {
        if (S.mode === 'cat') { catHover.i = -1; for (let i = 0; i < SRC.length; i++) { const r = catCardRect(i); if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) catHover.i = i; } return catHover.i >= 0 ? 'pointer' : 'default'; }
        if (S.mode === 'sort' && sortBoard) return sortBoard.pick(p) ? 'grab' : 'default';
        if (S.mode === 'grid' || S.mode === 'plan') return hourOf(p) >= 0 ? 'pointer' : 'default';
        return 'default';
      },
    });
  }

  /* =========================================================
     판독값
     ========================================================= */
  function doReadouts() {
    const m = S.mode;
    if (m === 'cat') {
      const s = SRC_BY[CAT.sel];
      readouts([['열어 본 카드', CAT.opened.size + ' / 7'], ['고른 에너지원', s ? s.icon + ' ' + s.name : '—'], ['전환 단계', s ? s.chain.length + '단계' : '—']]);
    } else if (m === 'sort') {
      const nb = sortBoard ? sortBoard.slots.map((s) => s.items.length) : [0, 0];
      readouts([['분류한 카드', (sortBoard ? sortBoard.placed() : 0) + ' / 7'], ['신에너지 칸', nb[0] + '장'], ['재생 에너지 칸', nb[1] + '장']]);
    } else if (m === 'dev') {
      if (DV.sub === 'solar') { const sm = solarModel(DV.angle, DV.cloud); readouts([['입사각', sm.inc + '°'], ['받는 햇빛 (1 m²)', sm.irr + ' W'], ['전기 출력', sm.p + ' W']]); }
      else if (DV.sub === 'wind') { const P = windModel(DV.wind); readouts([['풍속', DV.wind + ' m/s'], ['터빈 출력', P.toFixed(2) + ' MW'], ['상태', DV.wind < 3 ? '정지 (너무 약함)' : DV.wind >= 12 ? '정격 출력' : '발전 중']]); }
      else { const fm = fcModel(DV.h2, DV.o2); readouts([['수소 공급', DV.h2 + ' %'], ['전기 출력', fm.p.toFixed(2) + ' kW'], ['만들어진 물', DV.water + ' 방울']]); }
    } else {
      const P = gridP(), r = calc(P);
      if (m === 'grid') readouts([['공급이 모자란 시간', G.showGap ? r.unmetH + '시간' : '? (그래프로 찾기)'], [EV_FROM + '~' + EV_TO + '시 부족한 전기', G.showGap ? R1(r.evening) + ' MWh' : '?'], ['버려진 전기', R1(r.waste) + ' MWh']]);
      else { const sc = planScore(P); const i = WKEYS.indexOf(G.wx); readouts([[WEATHER[G.wx].name + ' CO₂', sc.co2[i] + ' t'], ['비용 점수', sc.cost.toFixed(1)], [WEATHER[G.wx].name + ' 정전', sc.hrs[i] + '시간']]); }
    }
  }

  /* =========================================================
     미션
     ========================================================= */
  const TARGET_SOLAR = 190;
  const WIND_RATIO = Math.round(windModel(12) / windModel(6));
  const catChips = () => SRC.map((s) => (CAT.opened.has(s.id) ? '✅ ' : '⬜ ') + s.icon).join(' ');
  const devReset = () => { DV.angle = 0; DV.cloud = 60; DV.wind = 3; DV.h2 = 0; DV.o2 = false; DV.hit.solar = DV.hit.wind = DV.hit.fc = false; DV.omega = 0; DV.water = 0; FC.init = false; };
  const gridReset = () => { G.wx = 'sun'; G.solar = 100; G.wind = 100; G.batt = 0; G.gas = 0; G.marks.clear(); G.ph = 12; G.play = false; G.showGap = true; };
  G.showGap = true;
  const planReset = () => { PL.solar = 100; PL.wind = 100; PL.batt = 100; PL.gas = 100; PL.pickA = PL.pickB = PL.pickC = null; };
  const planStatus = () => {
    const P = { wx: 'sun', solar: PL.solar, wind: PL.wind, batt: PL.batt, gas: PL.gas }, sc = planScore(P);
    return WKEYS.map((w, i) => chk(sc.hrs[i] === 0, WEATHER[w].icon + ' 정전 ' + sc.hrs[i] + '시간')).join(' · ') + '<br>' +
      chk(sc.co2.every((x) => x <= PLAN_CO2_MAX), 'CO₂ ' + sc.co2.map((x) => x + ' t').join(' / ') + ' (각 ' + PLAN_CO2_MAX + ' t 이하)') + ' · ' + chk(sc.cost <= PLAN_COST_MAX, '비용 <b>' + sc.cost.toFixed(1) + '</b> (' + PLAN_COST_MAX + ' 이하)');
  };
  const VAL = { env: '환경 (이산화 탄소를 적게)', eco: '경제 (비용을 적게)', soc: '사회 (정전 없는 안정 공급)' };
  const levels = [
    {
      title: '신재생 에너지에는 어떤 것이 있을까요?', short: '신재생 종류', icon: '🌱', phase: '관찰', features: ['cat', 'sort'],
      intro: '<p class="si-q">❓ 탐구 질문: 해가 지고 바람이 멈추면 재생 에너지만으로 마을의 전기를 쓸 수 있을까?</p>' +
        '<div class="si-link">🔗 <b>앞 차시에서</b> 화석 연료는 쓸 때 열로 많이 버려지고(낮은 에너지 효율), 이산화 탄소를 내보내 온실 효과를 강화한다는 것을 배웠어요. 그래서 <b>지속가능한 대안</b>이 필요해요.</div>' +
        '<p>먼저 <b>신재생 에너지</b> 7가지가 어떻게 전기를 만드는지 <b>도감</b>에서 살펴보고, <b>신에너지</b>와 <b>재생 에너지</b>로 나눠 봐요.</p>',
      setup() { ensure('cat'); },
      recap: '신재생 에너지는 <b>신에너지</b>(연료 전지 등)와 <b>재생 에너지</b>(태양광·풍력·수력·지열·바이오·해양)로 나뉘고, 모두 어떤 에너지를 <b>전기 에너지로 전환</b>해서 얻어요.',
      summary: '<ul><li><b>신재생 에너지</b> = <b>신에너지</b>(연료 전지, 수소 에너지) + <b>재생 에너지</b>(태양광·태양열, 풍력, 수력, 지열, 바이오, 해양 에너지).</li>' +
        '<li><b>재생 에너지</b>는 자연에서 <b>계속 다시 얻을 수 있어</b> 고갈 걱정이 적고, 온실 기체 배출이 적어요.</li>' +
        '<li>태양광은 빛을 <b>직접</b> 전기로, 풍력·수력·지열·바이오·조력은 <b>터빈과 발전기</b>를 거쳐 전기로, 연료 전지는 수소와 산소의 <b>화학 반응</b>으로 전기를 만들어요.</li></ul>',
      missions: [
        {
          id: 'open7', title: '도감 카드 7장 모두 열어 보기', goal: '카드를 눌러 에너지가 <b>전기로 바뀌는 과정</b>을 <b>7장 모두</b> 살펴봐요.',
          hint: '✓ 표시가 없는 카드(? 표시)를 눌러 보세요.', hold: 0.3,
          setup() { CAT.opened.clear(); CAT.sel = null; ensure('cat'); },
          check: () => CAT.opened.size >= 7, status: () => '열어 본 카드 <b>' + CAT.opened.size + ' / 7</b><br>' + catChips(),
          explain: '모든 발전은 <b>어떤 에너지를 전기 에너지로 전환</b>하는 과정이에요. 풍력·수력·지열·바이오·조력은 <b>터빈과 발전기</b>(전자기 유도)를 거치고, 태양광은 반도체 태양 전지가 빛을 <b>직접</b> 전기로 바꾸며, 연료 전지는 수소와 산소의 <b>화학 반응</b>에서 바로 전기를 얻어요.',
        },
        {
          id: 'sort', title: '신에너지와 재생 에너지로 나누기', manual: true,
          goal: '카드 7장을 <b>신에너지</b>와 <b>재생 에너지</b> 칸으로 나눈 뒤 <b>✔ 확인하기</b>를 눌러요.',
          hint: '카드를 누르면 도감 설명이 나와요. "자연에서 다시 얻는가?" "새로운 방식으로 전기를 만드는가?"를 따져 봐요.',
          setup() { ensure('sort'); sortReset(); },
          check: () => sortCheck(),
          explain: '연료 전지는 수소와 산소를 <b>화학 반응</b>시켜 태우지 않고 전기를 만드는 새로운 방식이라 <b>신에너지</b>예요. 나머지 6가지는 햇빛, 바람, 물, 땅속 열, 생물 자원, 바닷물의 흐름처럼 <b>자연에서 다시 얻을 수 있어</b> 재생 에너지예요.',
        },
        {
          type: 'quiz', title: '재생 에너지의 "재생"이란?', goal: '재생 에너지의 "재생"은 어떤 뜻일까요?',
          setup() { ensure('cat'); },
          choices: ['한 번 쓰면 없어지지만 값이 싼 에너지', '자연에서 계속 다시 얻을 수 있어 고갈될 걱정이 적은 에너지', '쓰고 남은 폐기물을 가공해서 만드는 에너지', '밤낮과 날씨에 관계없이 항상 일정한 양이 나오는 에너지'],
          answer: 1,
          feedback: ['값이 싼지가 아니라 다시 얻을 수 있는지가 기준이에요.', '', '폐기물 재활용과는 다른 뜻이에요. 햇빛, 바람, 물처럼 자연에서 계속 보충되는 것을 말해요.', '재생 에너지는 오히려 날씨와 시간에 따라 양이 달라져요. 이 점을 뒤 단계에서 살펴봐요.'],
          explain: '<b>재생 에너지</b>는 햇빛·바람·물처럼 자연에서 <b>계속 다시 얻을 수 있어</b> 고갈될 걱정이 적은 에너지예요. 다만 항상 일정하게 나오지는 않아서, 날씨와 시간에 따라 발전량이 변하는 <b>간헐성</b>이 있어요. 다음 단계에서 장치를 직접 만져 봐요.',
        },
      ],
    },
    {
      title: '장치마다 최대로 전기를 만들려면?', short: '원리와 효율', icon: '🔧', phase: '실험', features: ['dev'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 신재생 에너지 7가지가 에너지를 전기로 바꾸는 과정을 살펴봤어요.</div>' +
        '<p>이번에는 <b>태양광 · 풍력 · 연료 전지</b> 세 장치를 직접 만져 보며 어떤 조건에서 전기가 가장 많이 나오는지 찾아봐요. 장치 아래 판에서 <b>들어온 에너지가 전기와 열로 나뉘는 모습</b>도 볼 수 있어요. (숫자는 모두 교육용 예시예요)</p>',
      setup() { devReset(); ensure('dev', 'solar'); },
      recap: '태양광은 빛이 <b>수직</b>으로 많이 닿을수록, 풍력은 <b>풍속이 클수록</b>(출력은 풍속의 세제곱에 비례), 연료 전지는 <b>수소와 산소가 모두 공급될 때</b> 전기가 많이 나와요.',
      summary: '<ul><li><b>태양광</b>: 받는 빛 = 1000 W/m² × cos(입사각) × 구름 보정. 효율은 약 20 %이고, 나머지는 열 등으로 사라져요.</li>' +
        '<li><b>풍력</b>: 풍속이 3 m/s보다 약하면 발전하지 못하고, 3~12 m/s에서는 출력이 풍속의 <b>세제곱</b>에 비례해 급증하며, 12 m/s 이상에서는 정격 출력(2.00 MW)이에요.</li>' +
        '<li><b>연료 전지</b>: 수소 + 산소 → 물 + 전기. 수소는 전자를 잃고(산화), 산소는 전자를 얻어(환원) 전자가 외부 회로로 흘러요. 효율 약 50 %.</li>' +
        '<li>에너지는 전환되어도 총량이 보존되고, 전기가 되지 못한 에너지는 열 등으로 나가요.</li></ul>',
      missions: [
        {
          id: 'maxout', title: '세 장치의 최대 출력 조건 찾기',
          goal: '<b>태양광 ' + TARGET_SOLAR + ' W 이상</b>, <b>풍력 2.00 MW</b>, <b>연료 전지 1.00 kW</b>를 장치마다 한 번씩 만들어요.',
          hint: '태양광은 햇빛이 패널에 수직으로 닿게(입사각 0° 가까이) 각도를 맞추고 구름을 없애요. 풍력은 풍속을 올려요. 연료 전지는 수소를 가득 넣고 공기(산소)도 켜요.',
          hold: 0.5,
          setup() { devReset(); ensure('dev', 'solar'); },
          check: () => DV.hit.solar && DV.hit.wind && DV.hit.fc,
          status: () => chk(DV.hit.solar, '☀️ 태양광 ' + TARGET_SOLAR + ' W 이상 (지금 ' + (DV.sub === 'solar' ? solarModel(DV.angle, DV.cloud).p + ' W' : '확인') + ')') + '<br>' + chk(DV.hit.wind, '🌬️ 풍력 2.00 MW') + ' · ' + chk(DV.hit.fc, '🔋 연료 전지 1.00 kW'),
          explain: '태양광은 햇빛이 패널에 <b>수직</b>으로 닿을수록(입사각이 작을수록), 구름이 적을수록 출력이 커져요. 풍력은 출력이 풍속의 <b>세제곱</b>에 비례해서 풍속이 2배(6 → 12 m/s)가 되면 출력은 ' + WIND_RATIO + '배(' + windModel(6).toFixed(2) + ' → ' + windModel(12).toFixed(2) + ' MW)가 돼요. 연료 전지는 수소와 산소가 <b>모두</b> 있을 때만 전기를 만들고, 부산물은 물뿐이에요.',
        },
        {
          type: 'quiz', title: '태양광이 한낮에 가장 많은 까닭', goal: '하루 중 태양광 발전량은 한낮에 가장 많아요. 그 까닭으로 알맞은 것은?',
          setup() { ensure('dev', 'solar'); },
          choices: ['한낮에는 태양이 지구에 가장 가까워지기 때문이다', '한낮에는 태양 고도가 높아 햇빛이 패널에 거의 수직으로 닿아, 같은 면적이 받는 빛이 많기 때문이다', '한낮에는 바람이 많이 불어 패널이 식기 때문이다', '한낮에는 구름이 항상 없기 때문이다'],
          answer: 1,
          feedback: ['태양과 지구 사이의 거리는 하루 동안 거의 변하지 않아요.', '', '패널 온도보다 햇빛이 닿는 각도가 더 큰 까닭이에요. 입사각 슬라이더로 확인했죠?', '한낮에도 구름이 낄 수 있어요. 구름 슬라이더로 확인했죠?'],
          explain: '한낮에는 태양 고도가 높아 햇빛이 지표면에 <b>거의 수직</b>으로 닿아요. 입사각이 작으면 cos(입사각)이 커서 같은 면적이 받는 빛이 많아져요. 그래서 태양광 발전량은 한낮에 최대가 되고, 해가 지면 0이 돼요.',
        },
      ],
    },
    {
      title: '날씨와 시간에 따라 변하는 발전량', short: '간헐성', icon: '📈', phase: '분석', features: ['grid'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 태양광은 햇빛의 세기에, 풍력은 풍속에 따라 출력이 달라지는 것을 확인했어요.</div>' +
        '<p>이번에는 하루 24시간 동안 마을의 <b>전기 수요</b>(검은 선)와 태양광·풍력의 <b>공급</b>(색 막대)을 겹쳐 보며 부족한 시간을 찾고, <b>배터리</b>에 남는 전기를 저장해 저녁에 쓰는 방법을 살펴봐요. 마을 수요는 가장 많을 때 130 MW예요. (교육용 예시 자료)</p>',
      setup() { gridReset(); ensure('grid'); },
      recap: '재생 에너지는 날씨와 시간에 따라 발전량이 변하는 <b>간헐성</b>이 있어서, 수요가 가장 큰 저녁에 모자랄 수 있어요. 낮에 남는 전기를 <b>저장</b>하면 보완할 수 있어요.',
      summary: '<ul><li><b>간헐성</b>: 태양광은 밤에 0이고 흐린 날 줄며, 풍력은 바람이 약하면 줄어요. 발전량이 수요와 같은 시간에 늘 맞지는 않아요.</li>' +
        '<li>이 마을은 저녁(' + EV_FROM + '~' + EV_TO + '시)에 수요가 130 MW로 가장 크지만 태양광은 거의 0이에요.</li>' +
        '<li><b>에너지 저장</b>(배터리, 양수 발전)으로 낮의 남는 전기를 저녁에 써요. 충전·방전 효율이 ' + (ETA * 100) + ' %라서 저장한 전기가 모두 돌아오지는 않아요.</li>' +
        '<li><b>스마트 그리드</b>는 전기의 수요와 공급을 정보 통신으로 조절해요.</li></ul>',
      missions: [
        {
          id: 'mark', title: '공급이 모자란 시간 찾기', manual: true,
          goal: '태양광 100 MW · 풍력 100 MW인 <b>맑은 날</b>이에요. 색 막대가 검은 수요선보다 <b>낮은 시간</b>을 모두 표시하고 확인해요.',
          hint: '막대 위를 눌러 끌면 여러 시간을 한꺼번에 표시할 수 있어요. 한 번 더 누르면 표시가 지워져요. 15시는 막대와 수요선의 높이가 같아요.',
          setup() { gridReset(); G.showGap = false; G.paintDone = false; ensure('grid'); },
          check() {
            const P = gridP(), want = shortHours(P);
            if (!G.marks.size) return '공급이 모자란 시간을 눌러서 표시해 보세요.';
            const extra = [...G.marks].filter((h) => !want.has(h)), miss = [...want].filter((h) => !G.marks.has(h));
            if (extra.length) return '<b>' + extra.sort((a, b) => a - b)[0] + '시</b>는 공급이 수요를 채우고 있어요. 막대가 수요선보다 낮은 시간만 표시해요.';
            if (miss.length) return '모자란 시간이 더 있어요. 새벽, 아침, 오후, 저녁의 막대와 수요선을 비교해 보세요. (표시한 시간 ' + G.marks.size + '개 / 더 필요)';
            return true;
          },
          explain: '맑은 날에도 태양광은 해가 뜨기 전과 진 뒤에 0이고, 풍력도 낮에는 약해서 <b>아침(6~8시)</b>과 <b>오후~밤(16~23시)</b>에 공급이 수요보다 낮아요. 반대로 한낮(9~14시)에는 공급이 수요보다 많아서 전기가 <b>남아요</b>.',
        },
        {
          id: 'evening', title: '저녁 부족분 줄이기',
          goal: '<b>맑은 날</b> 태양광 설치량과 배터리를 조절해서 <b>' + EV_FROM + '~' + EV_TO + '시에 부족한 전기</b>를 <b>' + M2_TARGET + ' MWh 이하</b>로 줄여요.',
          hint: '태양광 설치량(MW)을 늘리면 낮에 남는 전기가 많아져요. 배터리를 키워 그 전기를 저장했다가 저녁에 써요. 지금 저녁 부족분은 ' + EV_BASE + ' MWh예요.',
          hold: 0.6,
          setup() { gridReset(); G.showGap = true; ensure('grid'); },
          check: () => G.wx === 'sun' && eveR(gridP()) <= M2_TARGET,
          status: () => chk(G.wx === 'sun', '맑은 날') + ' · 태양광 <b>' + G.solar + ' MW</b> · 배터리 <b>' + G.batt + ' MWh</b><br>' + chk(eveR(gridP()) <= M2_TARGET, EV_FROM + '~' + EV_TO + '시 부족 <b>' + eveR(gridP()) + ' MWh</b> (목표 ' + M2_TARGET + ' 이하)'),
          explain: '낮에 남는 전기를 <b>저장</b>했다가 저녁에 쓰면 부족분이 줄어요. 태양광 ' + M2_SOL + ' MW와 배터리 ' + M2_BAT + ' MWh면 저녁 부족분은 ' + EV_BEST + ' MWh까지 줄어요. 하지만 충전·방전 효율이 ' + (ETA * 100) + ' %라서 저장한 만큼 다 돌려받지는 못해요. 같은 설비라도 <b>흐린 날</b>로 바꾸면 저녁 부족분이 ' + EV_CLOUD + ' MWh로 크게 늘어나요.',
        },
        {
          type: 'quiz', title: '저녁에 왜 모자랄까', goal: '재생 에너지 중 태양광만으로는 저녁 수요를 채울 수 없어요. 그 까닭과 해결 방법으로 알맞은 것은?',
          setup() { ensure('grid'); },
          choices: ['저녁에는 태양광 패널이 고장 나기 때문이다. 패널을 새로 설치해야 한다', '저녁에는 해가 져서 태양광 발전량이 거의 0인데 수요는 가장 크다. 낮에 남는 전기를 저장해 쓰거나 다른 발전을 함께 써야 한다', '저녁에는 전기 수요가 줄어서 발전소가 멈추기 때문이다', '태양광은 설치량을 늘려도 낮의 발전량이 늘지 않기 때문이다'],
          answer: 1,
          feedback: ['패널이 고장 난 것이 아니라 햇빛이 없는 거예요.', '', '그래프를 다시 봐요. 저녁(18~21시)의 수요선이 하루 중 가장 높아요.', '설치량을 늘리면 낮 발전량도 늘어요. 하지만 밤의 발전량은 여전히 0이에요.'],
          explain: '저녁에는 해가 져서 <b>태양광 발전량이 0에 가깝고</b> 수요는 <b>가장 커요</b>. 그래서 낮에 남는 전기를 배터리 같은 <b>저장 장치</b>에 모아 두었다가 쓰거나, 풍력처럼 <b>시간대가 다른 발전</b>과 보조 발전을 함께 써야 해요.',
        },
      ],
    },
    {
      title: '우리 마을 에너지 계획', short: '마을 설계', icon: '🏘️', phase: '적용', features: ['plan'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 태양광·풍력만으로는 저녁에 전기가 모자라고, 흐린 날이나 바람이 약한 날에는 더 모자란다는 것을 알았어요.</div>' +
        '<p><b>태양광, 풍력, 배터리, 천연가스 보조 발전</b>의 크기를 정해 <b>맑은 날 · 흐린 날 · 바람 약한 날</b> 모두 정전 없는 마을을 만들어요. 천연가스 발전은 전기 1 MWh마다 이산화 탄소를 약 ' + CO2_PER + '톤 내보내요. <b>환경 · 경제 · 사회</b> 세 가지를 함께 따져 봐요.</p>',
      setup() { planReset(); PL.pres = false; ensure('plan'); },
      recap: '지속가능한 발전은 <b>환경 · 경제 · 사회</b>의 균형이에요. 재생 에너지에 <b>저장</b>과 <b>보조 발전</b>을 알맞게 섞으면 정전 없이 이산화 탄소를 크게 줄일 수 있지만, 비용이 늘어나는 점도 따져야 해요.',
      summary: '<ul><li><b>지속가능한 발전</b>: 현재 세대의 필요를 충족하면서 미래 세대가 필요를 충족할 능력을 해치지 않는 발전. 환경 · 경제 · 사회의 균형이 필요해요.</li>' +
        '<li>재생 에너지는 <b>태양광(낮)</b>과 <b>풍력(밤)</b>처럼 시간대가 다른 것을 섞고, <b>배터리</b>로 저장하며, 부족분은 보조 발전으로 보완해요.</li>' +
        '<li>한 가지를 올리면 다른 하나가 나빠지는 <b>선택(트레이드오프)</b>이 생겨요. 예) 이산화 탄소를 줄이려면 배터리·설비 비용이 늘어요.</li>' +
        '<li>개인도 <b>전기를 아껴 쓰고, 에너지 효율이 높은 제품을 고르는</b> 일로 참여할 수 있어요.</li></ul>',
      missions: [
        {
          id: 'plan', title: '정전 없고 CO₂ 적은 계획 만들기',
          goal: '세 날씨 모두 <b>정전 0시간</b>, 날씨마다 <b>CO₂ ' + PLAN_CO2_MAX + ' t 이하</b>, <b>비용 점수 ' + PLAN_COST_MAX + ' 이하</b>인 계획을 찾아요.',
          hint: '태양광만 늘리면 밤에, 풍력만 늘리면 한낮 수요에 모자랄 수 있어요. 둘을 섞고 배터리를 더한 뒤, 가스 발전은 마지막 보조로만 쓰세요. 날씨를 바꿔 가며 확인해요.',
          hold: 0.8,
          setup() { planReset(); PL.pres = false; G.showGap = true; G.wx = 'sun'; ensure('plan'); },
          check: () => planOk({ wx: 'sun', solar: PL.solar, wind: PL.wind, batt: PL.batt, gas: PL.gas }),
          status: () => planStatus(),
          explain: '태양광은 낮에, 풍력은 밤에 많이 만들어서 <b>시간대가 서로 보완</b>돼요. 여기에 <b>배터리</b>가 남는 전기를 저녁으로 옮겨 주고, <b>가스 발전</b>은 그래도 모자란 만큼만 채워 이산화 탄소를 줄여요. 설비를 늘릴수록 비용이 늘어서 <b>환경과 경제 사이의 선택</b>이 필요해요.',
        },
        {
          id: 'present', title: '계획 발표 카드 만들기', manual: true,
          goal: '내 계획에서 <b>가장 잘 지킨 가치</b>와 <b>가장 많이 양보한 가치</b>, 그리고 <b>내가 할 수 있는 일</b> 하나를 골라 확인해요.',
          hint: '오른쪽 아래 균형 점수 막대에서 가장 높은 것과 가장 낮은 것을 찾아봐요. 환경 · 경제 · 사회 중 고르면 돼요.',
          setup() { PL.pres = true; PL.pickA = PL.pickB = PL.pickC = null; ensure('plan'); },
          check() {
            const sc = planScore({ wx: 'sun', solar: PL.solar, wind: PL.wind, batt: PL.batt, gas: PL.gas });
            if (!PL.pickA || !PL.pickB || !PL.pickC) return '세 가지 항목(잘 지킨 가치, 양보한 가치, 내가 할 수 있는 일)을 모두 골라 주세요.';
            if (PL.pickA === PL.pickB) return '잘 지킨 가치와 양보한 가치는 서로 달라야 해요.';
            const s = { env: sc.env, eco: sc.eco, soc: sc.soc }, vals = Object.values(s), mx = Math.max.apply(null, vals), mn = Math.min.apply(null, vals);
            if (s[PL.pickA] < mx - 3) return '균형 점수 막대를 봐요. <b>' + VAL[PL.pickA].split(' ')[0] + '</b> 점수는 ' + s[PL.pickA] + '점으로, 가장 잘 지킨 값이 아니에요. (환경 ' + s.env + ' · 경제 ' + s.eco + ' · 사회 ' + s.soc + ')';
            if (s[PL.pickB] > mn + 3) return '균형 점수 막대를 봐요. <b>' + VAL[PL.pickB].split(' ')[0] + '</b> 점수는 ' + s[PL.pickB] + '점으로, 가장 많이 양보한 값이 아니에요. (환경 ' + s.env + ' · 경제 ' + s.eco + ' · 사회 ' + s.soc + ')';
            return true;
          },
          explain: '내 계획의 점수는 <b>환경 · 경제 · 사회</b>가 서로 달라요. 모든 가치를 100점으로 만들기는 어렵기 때문에, <b>무엇을 가장 중요하게 지키고 무엇을 양보했는지</b> 이유와 함께 밝히는 것이 계획을 설명하는 방법이에요. 개인의 실천도 이 균형에 힘을 보태요.',
        },
        {
          type: 'quiz', title: '지속가능한 발전이란?', goal: '지속가능한 발전의 뜻으로 알맞은 것은?',
          setup() { ensure('plan'); },
          choices: ['현재 세대가 자원을 최대한 빨리 많이 써서 발전하는 것', '현재 세대의 필요를 충족하면서 미래 세대가 필요를 충족할 능력을 해치지 않는 발전으로, 환경 · 경제 · 사회의 균형이 필요하다', '환경을 지키기 위해 경제 활동을 모두 멈추는 것', '신재생 에너지 설비만 늘리고 전기 사용량은 신경 쓰지 않는 것'],
          answer: 1,
          feedback: ['자원을 지금 다 쓰면 미래 세대가 쓸 몫이 없어져요.', '', '경제와 사회도 함께 지켜야 해요. 어느 한쪽만 극단적으로 선택하는 것은 균형이 아니에요.', '설비를 늘려도 쓰는 양이 계속 늘면 부담이 커져요. 아껴 쓰는 것도 중요해요.'],
          explain: '<b>지속가능한 발전</b>은 지금 우리의 필요를 채우면서도 <b>미래 세대의 몫을 남겨 두는</b> 발전이에요. 환경(이산화 탄소 줄이기), 경제(비용), 사회(안정 공급과 공정함)를 <b>함께</b> 고려해야 해요.',
        },
      ],
    },
  ];

  /* =========================================================
     시작
     ========================================================= */
  bindUI();
  game = SciSim.game({
    simId: 'h1-renewable', mount: '#game', badge: '마을 에너지 설계자', homeHref: '../../index.html#h1b',
    featureLabels: { cat: '📖 신재생 에너지 도감', sort: '🗂️ 신에너지 · 재생 에너지 분류', dev: '🔧 태양광 · 풍력 · 연료 전지 장치', grid: '📈 하루 24시간 수요와 공급 · 배터리', plan: '🏘️ 마을 설계 (태양광 · 풍력 · 배터리 · 가스)' },
    onFeatures(set) { F = set; ctlUpdate(); },
    levels,
  });
  buildSort();
  ctlUpdate();
  showHint(MODE_HINT.cat, 5000);

  let lastFree = false;
  SciSim.loop((dt, t) => {
    S.t = t;
    if (game && game.free !== lastFree) { lastFree = game.free; ctlUpdate(); }
    const ph = game ? game.phase : '';
    if (ph === 'success' && S.ph !== 'success') { S.okAt = t; parts.burst(VW - 40, 40, { count: 28, speed: 210 }); const cm = game.current(); if (cm && cm.id === 'mark') { G.showGap = true; G.marks.forEach((h) => parts.burst(GL.ch.x + (h + 0.5) * CW24, GL.ch.y + GL.ch.h * 0.5, { count: 4, speed: 80, life: 0.5, size: 3 })); } }
    S.ph = ph;
    parts.update(dt);
    view.clear('#eaf3fb');
    ctx.setTransform(view.scale * view.dpr, 0, 0, view.scale * view.dpr, 0, 0);
    if (S.mode === 'cat') drawCat(t, dt);
    else if (S.mode === 'sort') drawSortScene(t, dt);
    else if (S.mode === 'dev') drawDev(t, dt);
    else drawGrid(t, dt);
    parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(255,255,255,' + S.fade * 0.85 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : approach(S.fade, 0, dt, 9); }
    // 새 도구 표시
    if (MODE_FEAT[S.mode] && isNewF(MODE_FEAT[S.mode])) newTag();
    const k = t - S.okAt;
    if (k >= 0 && k < 1.6) { ctx.save(); ctx.globalAlpha = 1 - clamp((k - 1.1) / 0.5, 0, 1); D.check(VW - 40, 40, 22 * SciSim.ease.outBack(Math.min(1, k / 0.4)), Math.min(1, k / 0.45)); ctx.restore(); }
    doReadouts();
    if (S.mode === 'cat' || S.mode === 'sort') { const so = $('#oSorted'); if (so && sortBoard) so.textContent = sortBoard.placed() + ' / 7'; const oo = $('#oOpen'); if (oo) oo.textContent = CAT.opened.size + ' / 7'; }
    if (S.mode === 'dev' && !DV._w) DV._w = 1;
  });

  window.__sim = {
    S, CAT, DV, G, PL, SRC, DEM, SOL, WIN, VW, VH, get game() { return game; }, get sortBoard() { return sortBoard; },
    setMode, ensure, setDev, setWeather, calc, gridP, planScore, planOk, solarModel, windModel, fcModel, eveR, shortHours, catSelect, sortCheck, ctlUpdate, hourOf, GL, FC,
    EV_BASE, EV_BEST, EV_CLOUD, GA, catCardRect,
    solveSort() { sortBoard.items.forEach((c) => { const s = sortBoard.slots.find((q) => q.id === c.kind); sortBoard.place(c, s); }); ctlUpdate(); },
  };
})();
