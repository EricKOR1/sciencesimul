/* =========================================================
   중3 Ⅱ. 날씨와 기후변화 - 복사 평형과 온실 효과
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, Sound, clamp, lerp } = SciSim;
  const TAU = Math.PI * 2, DEG = Math.PI / 180;
  const FONT = '"Pretendard", "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", sans-serif';
  const DISPLAY = '"Jua", ' + FONT;
  const RM = !!SciSim.reduceMotion;
  const shade = SciSim.color.shade, rgba = SciSim.color.rgba, mixc = SciSim.color.mix;
  const EZ = SciSim.ease, approach = SciSim.approach;
  const nowS = () => performance.now() / 1000;
  const FRAME = '#0a1330';

  /* ---------- 공통 그리기 도우미 ---------- */
  function rng(seed) {
    return function () {
      seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function roundRect(ctx, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function circle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, Math.max(0.01, r), 0, TAU); }
  const fnt = (L, px, weight) => (weight ? weight + ' ' : '') + Math.round(px * L.fs * 10) / 10 + 'px ' + FONT;
  const dfnt = (L, px) => Math.round(px * L.fs) + 'px ' + DISPLAY;
  function pill(ctx, text, x, y, o) {
    o = o || {};
    ctx.font = o.font || 'bold 13px ' + FONT;
    const w = ctx.measureText(text).width, h = o.h || 24, pad = o.pad || 10;
    const bx = o.align === 'left' ? x : o.align === 'right' ? x - w - pad * 2 : x - w / 2 - pad;
    ctx.save();
    if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    ctx.fillStyle = o.bg || 'rgba(6,10,26,.78)';
    roundRect(ctx, bx, y - h / 2, w + pad * 2, h, h / 2); ctx.fill();
    if (o.stroke) { ctx.strokeStyle = o.stroke; ctx.lineWidth = o.lw || 1.4; ctx.stroke(); }
    ctx.fillStyle = o.color || '#fff'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(text, bx + pad, y + 0.5);
    ctx.restore();
    return { x: bx, y: y - h / 2, w: w + pad * 2, h };
  }
  function wrapLines(ctx, text, maxW) {
    const words = text.split(' '), lines = [];
    let line = '';
    words.forEach((w) => {
      const test = line ? line + ' ' + w : w;
      if (ctx.measureText(test).width <= maxW || !line) {
        if (!line && ctx.measureText(w).width > maxW) {
          let part = '';
          for (const ch of w) { if (ctx.measureText(part + ch).width > maxW && part) { lines.push(part); part = ch; } else part += ch; }
          line = part;
        } else line = test;
      } else { lines.push(line); line = w; }
    });
    if (line) lines.push(line);
    return lines;
  }
  function drawWrapped(ctx, text, x, y, maxW, lh, maxLines) {
    const lines = wrapLines(ctx, text, maxW), n = maxLines ? Math.min(maxLines, lines.length) : lines.length;
    for (let i = 0; i < n; i++) ctx.fillText(lines[i], x, y + i * lh);
    return n;
  }
  const pulse = () => 0.5 + 0.5 * Math.sin(performance.now() / 160);
  const chk = (ok, label) => (ok ? '✅ ' : '⬜ ') + label;
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const inRect = (p, r, pad) => p.x >= r.x - (pad || 0) && p.x <= r.x + r.w + (pad || 0) && p.y >= r.y - (pad || 0) && p.y <= r.y + r.h + (pad || 0);

  /* 화면(가로형 태블릿 / 세로형 휴대폰) 만들기 */
  function makeViews(layouts) {
    return ['wide', 'tall'].map((k) => {
      const L = layouts[k];
      const v = SciSim.stage($(k === 'wide' ? '#cvWide' : '#cvTall'), { width: L.vw, height: L.vh, background: FRAME });
      return { v, L, ctx: v.ctx, P: new SciSim.Particles(), D: SciSim.draw(v.ctx), key: k };
    });
  }
  const activeOf = (views) => views.find((V) => V.v.canvas.offsetWidth > 0) || views[0];

  /* 캔버스 아래쪽 한 줄 안내 */
  const TIP = { text: '', t0: -99 };
  function tip(text) { TIP.text = text; TIP.t0 = nowS(); }
  function drawTip(V, y) {
    const age = nowS() - TIP.t0;
    if (age > 3.4 || !TIP.text) return;
    const a = Math.min(1, age / 0.2, (3.4 - age) / 0.4);
    const ctx = V.ctx;
    ctx.save(); ctx.font = fnt(V.L, 14, 'bold');
    pill(ctx, TIP.text, V.L.vw / 2, y, { bg: 'rgba(15,23,42,.92)', stroke: '#fbbf24', h: 32 * V.L.fs, pad: 14, alpha: a, font: fnt(V.L, 14, 'bold') });
    ctx.restore();
  }
  /* 새로 열린 도구를 알리는 맥박 테두리 */
  function newRing(ctx, x, y, w, h, col) {
    const a = 0.45 + 0.4 * pulse();
    ctx.save(); ctx.strokeStyle = rgba(col || '#fde047', a); ctx.lineWidth = 3;
    roundRect(ctx, x - 3, y - 3, w + 6, h + 6, 12); ctx.stroke(); ctx.restore();
  }

  /* 끌어다 놓기(DnD): 토큰을 끌어 칸(slot)에 놓거나, 토큰을 누른 뒤 칸을 눌러 놓기 */
  class DnD {
    constructor(items, onChange) {
      this.items = items.map((it) => Object.assign({ x: 0, y: 0, vx: 0, vy: 0, slot: null, lift: 0, shake: -9, hx: 0, hy: 0, init: false, bad: false }, it));
      this.drag = null; this.sel = null; this.slots = []; this.onChange = onChange || (() => {}); this.enabled = true;
    }
    get(id) { return this.items.find((i) => i.id === id); }
    layout(homes, slots) {
      this.slots = slots;
      this.items.forEach((it, i) => {
        const h = homes[it.id] || homes[i]; if (!h) return;
        it.hx = h.x; it.hy = h.y;
        if (!it.init) { it.x = h.x; it.y = h.y; it.init = true; }
      });
    }
    reset() { this.items.forEach((it) => { it.slot = null; it.bad = false; }); this.sel = null; this.drag = null; this.onChange(); }
    slotOf(id) { return this.slots.find((s) => s.id === id); }
    itemAt(p) {
      for (let i = this.items.length - 1; i >= 0; i--) {
        const it = this.items[i];
        if (Math.abs(p.x - it.x) <= it.w / 2 + 4 && Math.abs(p.y - it.y) <= it.h / 2 + 4) return it;
      }
      return null;
    }
    slotAtPoint(p, pad) {
      let best = null, bd = 1e9;
      this.slots.forEach((s) => {
        const r = s.hit || s;
        if (p.x >= r.x - pad && p.x <= r.x + r.w + pad && p.y >= r.y - pad && p.y <= r.y + r.h + pad) {
          const d = Math.hypot(p.x - (s.x + s.w / 2), p.y - (s.y + s.h / 2));
          if (d < bd) { bd = d; best = s; }
        }
      });
      return best;
    }
    place(it, slot) {
      this.items.forEach((o) => { if (o !== it && o.slot === slot.id) { o.slot = null; o.bad = false; } });
      it.slot = slot.id; it.bad = false; this.sel = null;
      Sound.tone(660, 0.07, 'triangle', 0.07);
      this.onChange();
    }
    release(it) { it.slot = null; it.bad = false; this.sel = null; Sound.tick(); this.onChange(); }
    down(p) {
      if (!this.enabled) return false;
      const it = this.itemAt(p);
      if (it) {
        this.drag = { it, dx: p.x - it.x, dy: p.y - it.y, x0: p.x, y0: p.y, moved: false };
        this.items.splice(this.items.indexOf(it), 1); this.items.push(it);
        Sound.tick(); return true;
      }
      if (this.sel) { const s = this.slotAtPoint(p, 6); if (s) { this.place(this.sel, s); return false; } }
      return false;
    }
    move(p) {
      const d = this.drag; if (!d) return;
      if (Math.hypot(p.x - d.x0, p.y - d.y0) > 7) d.moved = true;
      d.it.x = p.x - d.dx; d.it.y = p.y - d.dy; d.it.vx = d.it.vy = 0;
    }
    up(p) {
      const d = this.drag; if (!d) return; this.drag = null;
      const it = d.it;
      if (!d.moved) {
        if (it.slot != null) this.release(it); else { this.sel = this.sel === it ? null : it; Sound.click(); }
        return;
      }
      const s = this.slotAtPoint({ x: it.x, y: it.y }, 14) || this.slotAtPoint(p, 10);
      if (s) this.place(it, s);
      else { if (it.slot != null) { it.slot = null; this.onChange(); } it.bad = false; }
    }
    update(dt) {
      this.items.forEach((it) => {
        const dragging = this.drag && this.drag.it === it;
        it.lift = approach(it.lift, dragging ? 1 : (this.sel === it ? 0.6 : 0), dt, 14);
        if (dragging) return;
        let tx = it.hx, ty = it.hy;
        if (it.slot != null) { const s = this.slotOf(it.slot); if (s) { tx = s.x + s.w / 2; ty = s.y + s.h / 2; } }
        if (RM) { it.x = tx; it.y = ty; it.vx = it.vy = 0; return; }
        const n = Math.max(1, Math.ceil(dt / 0.01)), h = dt / n;
        for (let i = 0; i < n; i++) {
          it.vx += (190 * (tx - it.x) - 22 * it.vx) * h; it.vy += (190 * (ty - it.y) - 22 * it.vy) * h;
          it.x += it.vx * h; it.y += it.vy * h;
        }
      });
    }
    /* 기본 모양으로 그리기 */
    draw(V, o) {
      o = o || {};
      const ctx = V.ctx, L = V.L, t = nowS();
      this.items.forEach((it) => {
        const w = it.w * (1 + 0.07 * it.lift), h = it.h * (1 + 0.07 * it.lift);
        let sx = 0;
        const sa = t - it.shake;
        if (sa >= 0 && sa < 0.45) sx = Math.sin(sa * 46) * 6 * (1 - sa / 0.45);
        ctx.save(); ctx.translate(it.x + sx, it.y - it.lift * 6);
        ctx.shadowColor = 'rgba(0,0,0,' + (0.25 + 0.15 * it.lift) + ')'; ctx.shadowBlur = 6 + it.lift * 12; ctx.shadowOffsetY = 2 + it.lift * 6;
        const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
        const c = it.color || '#3b82f6';
        g.addColorStop(0, shade(c, 0.25)); g.addColorStop(1, shade(c, -0.12));
        ctx.fillStyle = g; roundRect(ctx, -w / 2, -h / 2, w, h, Math.min(12, h / 2)); ctx.fill();
        ctx.shadowColor = 'transparent';
        const sel = this.sel === it;
        ctx.lineWidth = sel ? 3.5 : 2;
        ctx.strokeStyle = it.bad ? '#ef4444' : sel ? '#fde047' : 'rgba(255,255,255,.7)';
        roundRect(ctx, -w / 2, -h / 2, w, h, Math.min(12, h / 2)); ctx.stroke();
        ctx.fillStyle = it.textColor || '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = it.font || fnt(L, 15, 'bold'); ctx.fillText(it.label, 0, 1);
        if (it.sub) { ctx.font = fnt(L, 11.5, '600'); ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.fillText(it.sub, 0, h / 2 - 8 * L.fs); }
        ctx.restore();
      });
    }
  }

  /* =========================================================
     [9과17-01] 복사 평형과 온실 효과 (탐구 흐름 4단계)
     ① 실험: 적외선 램프 + 검은 컵 → 흡수 에너지 = 방출 에너지가 되면 온도가 일정(복사 평형)
     ② 모형: 지구의 복사 평형(태양 복사 100 = 반사 30 + 흡수 70, 흡수 70 = 방출 70) 채우기
     ③ 모형: 온실 효과(적외선이 온실 기체에 흡수·재방출 → 대기 없을 때 -18 °C, 있을 때 15 °C)
     ④ 분석: CO2 농도와 기온 편차 자료(예시), 온실 기체 증가 → 복사 평형 변화 → 온난화, 실천
     범위: 파장별 흡수 스펙트럼·복사 법칙 계산은 다루지 않음
     ========================================================= */
  const LAYOUTS = {
    wide: { key: 'wide', vw: 800, vh: 640, fs: 1, w: true },
    tall: { key: 'tall', vw: 520, vh: 846, fs: 1.18, w: false },
  };
  function geo(L) {
    return L.w ? { M: { x: 10, y: 10, w: 606, h: 620 }, P: { x: 626, y: 10, w: 164, h: 620 } }
      : { M: { x: 8, y: 8, w: 504, h: 570 }, P: { x: 8, y: 586, w: 504, h: 252 } };
  }
  const views = makeViews(LAYOUTS);
  const activeView = () => activeOf(views);
  let game = null, FEAT = new Set();
  const has = (f) => FEAT.has(f);

  /* ---------- 물리 모델(단순화) ---------- */
  const A0 = 4.926e9, CAP = 5.5e8, TROOM = 293.15;                 // 램프 30 cm일 때 A=A0*(40/30)^2
  const lampA = (d) => A0 * Math.pow(40 / d, 2);
  const emitE = (T) => Math.pow(T + 273.15, 4) - Math.pow(TROOM, 4);
  const A30 = lampA(30);
  const rel = (x) => Math.max(0, x) / A30 * 100;                    // 막대·읽기용 상대 값(0~100)
  const hGas = (g) => (1 - Math.exp(-3 * g)) / (1 - Math.exp(-3));
  const Ttarget = (atm, g) => (!atm ? -18 : g <= 1 ? -18 + 33 * hGas(g) : 15 + 2 * Math.log2(g));
  const CO2_ANCH = [[1958, 315], [1960, 317], [1970, 326], [1980, 339], [1990, 354], [2000, 370], [2010, 390], [2020, 414], [2023, 420]];
  const DT_ANCH = [[1958, 0.1], [1965, 0.0], [1975, 0.1], [1985, 0.4], [1995, 0.6], [2005, 0.9], [2015, 1.1], [2023, 1.4]];
  function interp(A, x) {
    if (x <= A[0][0]) return A[0][1];
    for (let i = 1; i < A.length; i++) if (x <= A[i][0]) { const a = A[i - 1], b = A[i], u = (x - a[0]) / (b[0] - a[0]); const s = u * u * (3 - 2 * u) * 0.35 + u * 0.65; return a[1] + (b[1] - a[1]) * s; }
    return A[A.length - 1][1];
  }
  const co2Base = (y) => interp(CO2_ANCH, y);
  const co2At = (y) => co2Base(y) + 3.2 * Math.cos((y % 1 - 0.38) * TAU);   // 계절 변동(톱니)
  const NOISE = (() => { const r = rng(11), a = []; for (let i = 0; i < 70; i++) a.push((r() - 0.5) * 0.2); return a; })();
  const dtAt = (y) => interp(DT_ANCH, y) + NOISE[Math.round(clamp(y - 1958, 0, 69))];

  /* ---------- 상태 ---------- */
  const S = {
    lv: 0, free: false, scene: 'lamp',
    d: 50, dA: 50, T: 20, simT: 0, hist: [], histAcc: 0, eqHold: 0, eqNow: false, eqRec: [], eqTip: false, eqFlash: -9,
    atm: true, g: 1, gA: 1, Tm: 15, noT: 0, yesT: 0, seenNo: false, seenYes: false, atmA: 1,
    photons: [], mols: [], emitAcc: 0, back: 0, escaped: 0, surfGlow: 0,
    year: 2023, yearA: 2023, dataP: 0, yearMax: 2023, yearMin: 2023,
    cards: new Set(), flagCard: new Set(), cardShake: {},
  };
  const dnd = new DnD([
    { id: 'a', v: 30, label: '30', color: '#3b82f6', w: 64, h: 40 },
    { id: 'b', v: 70, label: '70', color: '#f59e0b', w: 64, h: 40 },
    { id: 'c', v: 70, label: '70', color: '#ef4444', w: 64, h: 40 },
    { id: 'd', v: 100, label: '100', color: '#8b5cf6', w: 64, h: 40 },
  ]);
  const SLOTS = [{ id: 'ref', want: 30, name: '반사' }, { id: 'abs', want: 70, name: '흡수' }, { id: 'emit', want: 70, name: '지구 복사 방출' }];
  const slotVal = (id) => { const it = dnd.items.find((i) => i.slot === id); return it ? it.v : null; };
  const slotsOK = () => SLOTS.every((s) => slotVal(s.id) === s.want);
  let flagSlots = new Set();

  /* ---------- 컨트롤 ---------- */
  const sDist = $('#sDist'), sGas = $('#sGas'), sYear = $('#sYear');
  const bDist = SciSim.bindRange(sDist, $('#oDist'), (v) => v + ' cm', (v) => { S.d = +v; });
  const bGas = SciSim.bindRange(sGas, $('#oGas'), (v) => (+v).toFixed(2).replace(/0$/, '') + '배 (' + Math.round(280 * v) + ' ppm)', (v) => { S.g = +v; Sound.tick(); });
  const bYear = SciSim.bindRange(sYear, $('#oYear'), (v) => v + '년', (v) => { S.year = +v; S.yearMax = Math.max(S.yearMax, S.year); S.yearMin = Math.min(S.yearMin, S.year); });
  $('#resetBtn').addEventListener('click', () => { Sound.click(); S.T = 20; S.simT = 0; S.hist = []; S.eqHold = 0; S.eqNow = false; S.coolFx = nowS(); });
  $$('#atmSeg button').forEach((b) => b.addEventListener('click', () => { setAtm(b.dataset.a === '1'); Sound.click(); }));
  $$('#sceneSeg button').forEach((b) => b.addEventListener('click', () => { setScene(b.dataset.s); Sound.click(); }));
  function setAtm(on) { S.atm = !!on; syncControls(); }
  function setScene(s) {
    S.scene = s;
    if (s === 'data') { S.dataP = 0; S.yearMax = S.year; S.yearMin = S.year; }
    syncControls();
  }
  const SCENE_LV = ['lamp', 'earth', 'model'];
  function syncControls() {
    const lv = S.lv, free = S.free, sc = S.scene;
    const inL4 = lv >= 3 || free;
    const show = (id, on) => $(id).classList.toggle('is-off', !on);
    show('#cDist', sc === 'lamp'); show('#cReset', sc === 'lamp');
    show('#cAtm', sc === 'model' && !inL4);
    show('#cScene', inL4);
    show('#cGas', inL4 && sc === 'model');
    show('#cYear', inL4 && sc === 'data');
    $$('#atmSeg button').forEach((b) => b.classList.toggle('on', (b.dataset.a === '1') === S.atm));
    $$('#sceneSeg button').forEach((b) => b.classList.toggle('on', b.dataset.s === sc));
    $('#ctrlCard').classList.toggle('is-off', sc === 'earth');
  }
  function syncSliders() { bDist.set(S.d); bGas.set(S.g); bYear.set(S.year); }

  /* ---------- 분자 스프라이트와 광자 ---------- */
  const SPR = {};
  function sprite(type) {
    if (SPR[type]) return SPR[type];
    const c = document.createElement('canvas'); c.width = c.height = 96;
    const x = c.getContext('2d'), D = SciSim.draw(x);
    x.translate(48, 48); x.scale(2, 2);
    const O = '#ef4444', C = '#475569', H = '#f1f5f9';
    if (type === 'co2') { D.sphere(-13, 0, 7.5, O); D.sphere(13, 0, 7.5, O); D.sphere(0, 0, 8.5, C); }
    else if (type === 'h2o') { D.sphere(-10, -7, 5, H); D.sphere(10, -7, 5, H); D.sphere(0, 1, 9, O); }
    else { D.sphere(-9, -8, 4.6, H); D.sphere(9, -8, 4.6, H); D.sphere(-8, 9, 4.6, H); D.sphere(9, 8, 4.6, H); D.sphere(0, 0, 8.5, C); }
    SPR[type] = c; return c;
  }
  const MTYPES = ['co2', 'h2o', 'ch4', 'co2', 'h2o', 'co2'];
  const MNAME = { co2: 'CO₂ 이산화 탄소', h2o: 'H₂O 수증기', ch4: 'CH₄ 메테인' };
  (function initMols() {
    const r = rng(23);
    for (let i = 0; i < 26; i++) S.mols.push({ u: 0.06 + r() * 0.88, v: 0.1 + r() * 0.8, type: MTYPES[i % MTYPES.length], ph: r() * 6, rot: (r() - 0.5) * 1.2, k: 0, ex: 0, emitAt: -1 });
    // 빈 곳이 없도록 간단히 격자 느낌으로 흩어 놓기
    const cols = 7, rows = 4;
    S.mols.forEach((m, i) => { const cx = i % cols, cy = Math.floor(i / cols) % rows; m.u = (cx + 0.5 + (r() - 0.5) * 0.7) / cols; m.v = (cy + 0.5 + (r() - 0.5) * 0.7) / rows; });
    for (let i = S.mols.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const a = S.mols[i], b = S.mols[j]; const tu = a.u, tv = a.v; a.u = b.u; a.v = b.v; b.u = tu; b.v = tv; }
  })();
  const molTarget = () => (S.atm ? Math.round(12 * S.g) : 0);

  /* ---------- 갱신 ---------- */
  const txtCache = {};
  function setTxt(id, html) { if (txtCache[id] !== html) { txtCache[id] = html; $('#' + id).innerHTML = html; } }
  function outBal() { return clamp(70 + 0.9 * (S.Tm - Ttarget(S.atm, S.g)), 25, 115); }
  function update(dt, t) {
    const sc = S.scene;
    S.dA = approach(S.dA, S.d, dt, 9);
    // 램프 실험: 램프가 켜져 있는 동안 계속 계산
    {
      const n = Math.max(1, Math.ceil(dt / 0.01)), h = dt / n, A = lampA(S.d);
      for (let i = 0; i < n; i++) S.T += (A - emitE(S.T)) / CAP * h * 1.3;
      if (sc === 'lamp') {
        S.simT += dt; S.histAcc += dt;
        if (S.histAcc >= 0.2) { S.histAcc = 0; S.hist.push({ t: S.simT, T: S.T }); if (S.hist.length > 1500) S.hist.shift(); }
      }
      const E = emitE(S.T);
      S.eqNow = S.simT > 1.5 && Math.abs(A - E) < 0.02 * A;
      if (sc === 'lamp') {
        if (S.eqNow) S.eqHold += dt; else S.eqHold = 0;
        if (S.eqHold > 1.5) {
          const ex = S.eqRec.find((r) => Math.abs(r.d - S.d) < 8);
          if (!ex) { S.eqRec.push({ d: S.d, T: S.T, t: S.simT }); S.eqFlash = nowS(); Sound.success(); views.forEach((V) => { const g = geo(V.L); V.P.burst(g.M.x + g.M.w * 0.76, g.M.y + 150, { count: 14, colors: ['#fde047', '#f87171', '#fff'], speed: 130, size: 3, gravity: 80 }); }); if (!S.eqTip) { S.eqTip = true; tip('복사 평형! 램프 거리를 바꾸면 평형 온도가 달라질까요?'); } }
          else if (Math.abs(ex.T - S.T) > 0.05) { ex.T = S.T; ex.t = S.simT; }
        }
      }
    }
    // 지구 온실 모형
    S.gA = approach(S.gA, S.g, dt, 6);
    S.atmA = approach(S.atmA, S.atm ? 1 : 0, dt, 4);
    const Tt = Ttarget(S.atm, S.g);
    S.Tm = approach(S.Tm, Tt, dt, 0.9);
    if (Math.abs(S.Tm - Tt) < 0.02) S.Tm = Tt;
    if (sc === 'model' || sc === 'act') {
      if (!S.atm && Math.abs(S.Tm + 18) < 1.5) S.noT += dt; else if (!S.atm) S.noT = 0;
      if (S.noT > 1) S.seenNo = true;
      if (S.atm && S.seenNo && Math.abs(S.Tm - 15) < 1.5) S.yesT += dt; else S.yesT = 0;
      if (S.yesT > 1) S.seenYes = true;
    }
    if (sc === 'model') updatePhotons(dt, t);
    S.surfGlow = approach(S.surfGlow, 0, dt, 2.5);
    // 자료
    S.yearA = approach(S.yearA, S.year, dt, 8);
    S.dataP = approach(S.dataP, sc === 'data' ? 1 : 0, dt, 1.4);
    if (S.scene === 'data' && S.dataP > 0.995) S.dataP = 1;
    // 끌어다 놓기
    dnd.enabled = S.scene === 'earth' && S.lv === 1 && !S.free;
    dnd.update(dt);
    views.forEach((V) => V.P.update(dt));
    // 읽기창
    const R = readouts();
    ['1', '2', '3'].forEach((i, k) => { setTxt('rL' + i, R[k][0]); setTxt('rV' + i, R[k][1]); });
  }
  function readouts() {
    const sc = S.scene;
    if (sc === 'lamp') return [['컵의 온도', Math.round(S.T * 10) / 10 + '<small>°C</small>'], ['들어오는 에너지', Math.round(rel(lampA(S.d))) + '<small>(상대)</small>'], ['나가는 에너지', Math.round(rel(emitE(S.T))) + '<small>(상대)</small>']];
    if (sc === 'earth') { const f = (id) => { const v = slotVal(id); return v == null ? '?' : v; }; return [['반사한 에너지', f('ref') + '<small>(태양 복사 100 중)</small>'], ['흡수한 에너지', f('abs') + '<small></small>'], ['방출하는 에너지', f('emit') + '<small></small>']]; }
    if (sc === 'data') { const y = Math.round(S.yearA); return [['연도', y + '<small>년</small>'], ['CO₂ 농도(예시)', Math.round(co2Base(y)) + '<small>ppm</small>'], ['기온 편차(예시)', (dtAt(y) >= 0 ? '+' : '') + dtAt(y).toFixed(1) + '<small>°C</small>']]; }
    if (sc === 'act') return [['고른 카드', S.cards.size + '<small>장</small>'], ['온실 기체 양', S.g.toFixed(2) + '<small>배</small>'], ['지표 평균 기온', Math.round(S.Tm * 10) / 10 + '<small>°C</small>']];
    return [['지표 평균 기온', Math.round(S.Tm * 10) / 10 + '<small>°C</small>'], ['받는 에너지', '70'], ['우주로 나가는 에너지', Math.round(outBal()) + '']];
  }

  /* ---------- 지구 복사(적외선) 입자 ---------- */
  function modelGeo(G) {
    const W = G.M.w, H = G.M.h;
    return { W, H, surfY: H * 0.80, a0: H * 0.27, a1: H * 0.73 };
  }
  function updatePhotons(dt, t) {
    const V = activeView(), G = geo(V.L), mg = modelGeo(G), W = mg.W, H = mg.H;
    const sp = 128 * (W / 600);
    // 분자 개수
    const nT = molTarget();
    S.mols.forEach((m, i) => { m.k = approach(m.k, i < nT ? 1 : 0, dt, 5); if (m.ex > 0) m.ex -= dt; if (m.emitAt > 0 && nowS() >= m.emitAt) { m.emitAt = -1; emitFrom(m, mg); } });
    // 지표에서 지구 복사 방출 (온도가 높을수록 많이)
    S.emitAcc += (5 + (S.Tm + 18) * 0.3) * dt;
    while (S.emitAcc >= 1) {
      S.emitAcc -= 1;
      if (S.photons.length < 150) { const a = -Math.PI / 2 + (Math.random() - 0.5) * 0.5; S.photons.push({ x: W * (0.04 + Math.random() * 0.92), y: mg.surfY, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, skip: null, age: 0 }); }
    }
    const pAbs = clamp(0.4 + 0.45 * S.g, 0, 0.95);
    for (let i = S.photons.length - 1; i >= 0; i--) {
      const p = S.photons[i];
      p.x += p.vx * dt; p.y += p.vy * dt; p.age += dt;
      if (p.y < -12 || p.x < -14 || p.x > W + 14) { if (p.y < -12) S.escaped++; S.photons.splice(i, 1); continue; }
      if (p.y >= mg.surfY && p.vy > 0) { S.photons.splice(i, 1); S.back++; S.surfGlow = 1; V.P.emit({ x: G.M.x + p.x, y: G.M.y + mg.surfY, vx: (Math.random() - 0.5) * 40, vy: -30 - Math.random() * 30, life: 0.5, size: 3, color: '#fdba74', shape: 'circle' }); continue; }
      if (S.atm && p.y > mg.a0 && p.y < mg.a1) {
        for (let k = 0; k < S.mols.length; k++) {
          const m = S.mols[k];
          if (m.k < 0.7 || m === p.skip || m.emitAt > 0) continue;
          const mx = m.u * W, my = mg.a0 + m.v * (mg.a1 - mg.a0);
          if (Math.hypot(p.x - mx, p.y - my) < 20) {
            if (Math.random() < pAbs) { S.photons.splice(i, 1); m.ex = 0.5; m.emitAt = nowS() + 0.32; Sound.tone(900, 0.03, 'sine', 0.02); }
            else p.skip = m;
            break;
          }
        }
      }
    }
  }
  function emitFrom(m, mg) {
    const W = mg.W, a = Math.random() * TAU, sp = 128 * (W / 600);
    if (S.photons.length < 170) S.photons.push({ x: m.u * W, y: mg.a0 + m.v * (mg.a1 - mg.a0), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, skip: m, age: 0 });
    m.ex = 0.4;
  }

  /* ---------- 그리기: 공통 ---------- */
  function panelBox(V, r, title, o) {
    const ctx = V.ctx;
    ctx.save();
    ctx.fillStyle = (o && o.bg) || 'rgba(255,255,255,.07)'; roundRect(ctx, r.x, r.y, r.w, r.h, 16); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = 1.5; ctx.stroke();
    if (title) { ctx.fillStyle = '#e6edff'; ctx.font = fnt(V.L, 14, '800'); ctx.textAlign = 'center'; ctx.fillText(title, r.x + r.w / 2, r.y + 26 * V.L.fs); }
    ctx.restore();
  }
  // 세로 막대 비교
  function drawBars(V, r, bars, o) {
    o = o || {};
    const { ctx, L, D } = V, fs = L.fs;
    const top = r.y + (o.top != null ? o.top : 70 * fs), bot = r.y + r.h - (o.bot != null ? o.bot : 62 * fs), n = bars.length;
    const bw = Math.min(L.w ? 46 : 70, (r.w - 24) / n - 16), gap = (r.w - bw * n) / (n + 1);
    ctx.save();
    bars.forEach((b, i) => {
      const x = r.x + gap * (i + 1) + bw * i, hh = (bot - top) * clamp(b.v / (o.max || 100), 0, 1.15);
      ctx.fillStyle = 'rgba(255,255,255,.09)'; roundRect(ctx, x, top, bw, bot - top, 10); ctx.fill();
      const g = ctx.createLinearGradient(0, bot - hh, 0, bot); g.addColorStop(0, shade(b.color, 0.25)); g.addColorStop(1, b.color);
      ctx.fillStyle = g; roundRect(ctx, x, bot - hh, bw, Math.max(hh, 2), 10); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fillRect(x + 5, bot - hh + 4, 4, Math.max(0, hh - 12));
      D.text(x + bw / 2, Math.min(bot - hh - 7, bot - 6), b.text != null ? b.text : String(Math.round(b.v)), { size: 15 * fs, color: '#fff', weight: 800, stroke: 'rgba(5,10,30,.7)', strokeWidth: 4 });
      ctx.fillStyle = '#dbe4ff'; ctx.font = fnt(L, 12.5, '700'); ctx.textAlign = 'center';
      const ls = b.label.split('|'); ls.forEach((s, k) => ctx.fillText(s, x + bw / 2, bot + (16 + k * 15) * fs));
    });
    ctx.restore();
  }
  function starsBg(ctx, W, H, t, a0) {
    const r = rng(5);
    for (let i = 0; i < 40; i++) {
      const x = r() * W, y = r() * H * 0.5, s = 0.6 + r() * 1.2, ph = r() * 6;
      ctx.fillStyle = 'rgba(255,255,255,' + (a0 * (0.35 + 0.35 * Math.sin(t * 1.6 + ph))).toFixed(3) + ')'; circle(ctx, x, y, s); ctx.fill();
    }
  }
  function flowDots(ctx, x1, y1, x2, y2, t, col, n, sz) {
    for (let i = 0; i < n; i++) {
      const u = ((t * 0.35 + i / n) % 1), x = lerp(x1, x2, u), y = lerp(y1, y2, u);
      ctx.fillStyle = col; ctx.globalAlpha = Math.sin(u * Math.PI); circle(ctx, x, y, sz); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  function thickArrow(D, x1, y1, x2, y2, w, color, label) {
    D.arrow(x1, y1, x2, y2, { color, width: Math.max(2, w), head: Math.max(12, w * 1.5 + 6), label });
  }

  /* ---------- 장면 ①: 적외선 램프와 검은 컵 ---------- */
  function lampScene(V, G, t) {
    const { ctx, L, D } = V, fs = L.fs, W = G.M.w, H = G.M.h;
    const hs = (L.w ? 0.58 : 0.55) * H;
    // 배경(실험실 벽)과 탁자
    const bg = ctx.createLinearGradient(0, 0, 0, hs); bg.addColorStop(0, '#162347'); bg.addColorStop(1, '#22335f');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, hs + 10);
    const tableY = hs - 18;
    const tg = ctx.createLinearGradient(0, tableY, 0, hs + 10); tg.addColorStop(0, '#b98550'); tg.addColorStop(1, '#8a5a30');
    ctx.fillStyle = tg; ctx.fillRect(0, tableY, W, 28);
    ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(0, tableY, W, 3);
    const A = lampA(S.dA), E = emitE(S.T), Au = rel(A), Eu = rel(E);
    const I = 0.3 + 0.7 * Math.sqrt(Au / 100);
    const cupW = Math.min(86, 0.14 * W), cupH = cupW * 0.86, cupX = 0.77 * W, cupTop = tableY - cupH;
    const px = lerp(0.2 * W, 0.6 * W, (S.dA - 30) / 40);
    const lx = cupX - px, ly = 0.27 * hs;
    const tx = cupX - cupW * 0.25, ty = cupTop + cupH * 0.15;
    const ang = Math.atan2(ty - ly, tx - lx), dx = Math.cos(ang), dy = Math.sin(ang), nx = -dy, ny = dx;
    // 램프 줄과 갓
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(lx, 0); ctx.lineTo(lx, ly - 14); ctx.stroke();
    // 빛줄기(원뿔)와 물결
    const mx = lx + dx * 30, my = ly + dy * 30, len = Math.hypot(tx - mx, ty - my);
    const hw0 = 12, hw1 = cupW * 0.6;
    const bgr = ctx.createLinearGradient(mx, my, tx, ty); bgr.addColorStop(0, 'rgba(255,90,40,' + 0.36 * I + ')'); bgr.addColorStop(1, 'rgba(255,150,60,' + 0.12 * I + ')');
    ctx.fillStyle = bgr; ctx.beginPath(); ctx.moveTo(mx + nx * hw0, my + ny * hw0); ctx.lineTo(tx + nx * hw1, ty + ny * hw1); ctx.lineTo(tx - nx * hw1, ty - ny * hw1); ctx.lineTo(mx - nx * hw0, my - ny * hw0); ctx.closePath(); ctx.fill();
    ctx.lineWidth = 1.8; ctx.lineCap = 'round';
    for (let k = -2; k <= 2; k++) {
      ctx.strokeStyle = 'rgba(255,120,70,' + (0.55 * I) + ')'; ctx.beginPath();
      for (let i = 0; i <= 28; i++) {
        const u = i / 28, off = lerp(k * 5, k * hw1 * 0.5, u) + Math.sin(u * len / 9 - t * 9) * 2.6;
        const x = lerp(mx, tx, u) + nx * off, y = lerp(my, ty, u) + ny * off;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke();
    }
    ctx.save(); ctx.translate(lx, ly); ctx.rotate(ang);
    const dome = ctx.createLinearGradient(-26, -26, 20, 26); dome.addColorStop(0, '#e2e8f0'); dome.addColorStop(0.5, '#94a3b8'); dome.addColorStop(1, '#475569');
    ctx.fillStyle = dome; ctx.beginPath(); ctx.arc(0, 0, 27, Math.PI / 2, Math.PI * 1.5); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.restore();
    D.glow(lx + dx * 18, ly + dy * 18, 38, '#ff6a3d', 0.55 * I);
    D.sphere(lx + dx * 17, ly + dy * 17, 11, '#ff7a4d', { gloss: false, light: '#ffe0c8', dark: '#c2410c' });
    pill(ctx, '적외선 램프', lx, ly - 40 * fs, { bg: 'rgba(15,23,42,.75)', font: fnt(L, 12.5, 'bold'), h: 22 * fs, pad: 8 });
    // 온도계 (컵 속)
    const thX = cupX + cupW * 0.14, thY0 = cupTop - 100 * fs;
    D.thermometer(thX, thY0, cupTop + 6 - thY0, S.T, 10, 100, { ticks: false, color: '#ef4444' });
    // 컵
    {
      const cg = ctx.createLinearGradient(cupX - cupW / 2, 0, cupX + cupW / 2, 0);
      cg.addColorStop(0, '#4b5563'); cg.addColorStop(0.35, '#1f2937'); cg.addColorStop(1, '#0b0f19');
      const heat = clamp((S.T - 22) / 70, 0, 1);
      D.glow(cupX, cupTop + cupH * 0.5, cupW * 1.1, '#fb7185', 0.12 + 0.35 * heat);
      D.shadow(() => { ctx.fillStyle = cg; ctx.beginPath(); ctx.moveTo(cupX - cupW / 2, cupTop); ctx.lineTo(cupX - cupW * 0.4, tableY); ctx.lineTo(cupX + cupW * 0.4, tableY); ctx.lineTo(cupX + cupW / 2, cupTop); ctx.closePath(); ctx.fill(); }, { blur: 10, y: 5, color: 'rgba(0,0,0,.45)' });
      ctx.fillStyle = mixc('#1f2937', '#9a3412', heat * 0.6); ctx.beginPath(); ctx.ellipse(cupX, cupTop, cupW / 2, cupW * 0.1, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.1)'; ctx.fillRect(cupX - cupW * 0.38, cupTop + 6, 5, cupH - 14);
      D.text(cupX, cupTop + cupH * 0.58, '검은 컵', { size: 12.5 * fs, color: 'rgba(255,255,255,.75)' });
    }
    // 열 아지랑이
    if (S.T > 32) {
      ctx.strokeStyle = 'rgba(255,170,120,' + clamp((S.T - 32) / 80, 0, 0.5) + ')'; ctx.lineWidth = 2;
      for (let k = -1; k <= 1; k++) { ctx.beginPath(); for (let i = 0; i <= 12; i++) { const yy = cupTop - 6 - i * 4, xx = cupX + k * 18 + Math.sin(i * 0.9 + t * 4 + k) * 4; i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); } ctx.stroke(); }
    }
    // 온도 읽기
    pill(ctx, S.T.toFixed(1) + ' °C', thX + 38 * fs, thY0 + 20 * fs, { bg: '#ef4444', color: '#fff', font: fnt(L, 15, '800'), h: 26 * fs, pad: 9 });
    // 에너지 화살표: 들어오는(노랑) / 나가는(빨강)
    {
      const off = hw1 + 22 * fs, ux = tx - dx * len * 0.6, uy = ty - dy * len * 0.6;
      const wIn = 2 + 0.13 * Au;
      thickArrow(D, ux + nx * off, uy + ny * off, tx - dx * 6 + nx * off, ty - dy * 6 + ny * off, wIn, '#fbbf24');
      pill(ctx, '들어오는 에너지', ux + nx * (off + 30 * fs) + dx * 30, uy + ny * (off + 30 * fs) + dy * 30, { bg: '#f59e0b', color: '#1f1300', font: fnt(L, 12.5, '800'), h: 22 * fs, pad: 8 });
      const wOut = 2 + 0.07 * Eu, ox = cupX + cupW / 2 + 4, oy = cupTop + cupH * 0.5;
      [-40, 0, 40].forEach((a) => { const r = a * DEG; thickArrow(D, ox, oy, ox + Math.cos(r) * 52 * fs, oy + Math.sin(r) * 52 * fs, wOut, '#f87171'); });
      pill(ctx, '나가는 에너지', Math.min(W - 58 * fs, ox + 30 * fs), oy - 64 * fs, { bg: '#ef4444', font: fnt(L, 12.5, '800'), h: 22 * fs, pad: 8 });
    }
    // 복사 평형 표시
    if (S.eqNow) {
      pill(ctx, '⚖️ 들어오는 에너지 = 나가는 에너지 → 복사 평형', W / 2, 22 * fs, { bg: 'rgba(22,163,74,.92)', font: fnt(L, 14, '800'), h: 30 * fs, pad: 14 });
      D.ring(thX, thY0 - 6, 16 * fs, t, { color: '#4ade80' });
    }
    // ----- 온도-시간 그래프 -----
    const pTop = hs + 14, gx = 50 * fs, gy = pTop + 32 * fs, gw = W - gx - 14, gh = H - gy - 34 * fs;
    ctx.fillStyle = 'rgba(8,14,38,.55)'; roundRect(ctx, 8, pTop, W - 16, H - pTop - 6, 12); ctx.fill();
    D.text(gx - 30 * fs, pTop + 20 * fs, '컵의 온도–시간 그래프', { size: 13.5 * fs, color: '#e6edff', align: 'left', weight: 800 });
    const tmax = 60, t0 = Math.max(0, S.simT - tmax);
    const X = (tt) => gx + (tt - t0) / tmax * gw, Y = (T) => gy + gh - (T - 10) / 90 * gh;
    ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = 1; ctx.fillStyle = '#c7d2fe'; ctx.font = fnt(L, 12, '600'); ctx.textAlign = 'right';
    for (let T = 20; T <= 100; T += 20) { ctx.beginPath(); ctx.moveTo(gx, Y(T)); ctx.lineTo(gx + gw, Y(T)); ctx.stroke(); ctx.fillText(String(T), gx - 6, Y(T) + 4); }
    ctx.textAlign = 'center';
    for (let k = Math.ceil(t0 / 10); k * 10 <= t0 + tmax; k++) { const xx = X(k * 10); ctx.beginPath(); ctx.moveTo(xx, gy); ctx.lineTo(xx, gy + gh); ctx.stroke(); ctx.fillText(String(k * 10), xx, gy + gh + 16 * fs); }
    D.text(gx + gw, gy + gh + 30 * fs, '시간(분) →', { size: 12 * fs, color: '#c7d2fe', align: 'right' });
    ctx.restore();
    ctx.save(); ctx.beginPath(); ctx.rect(gx, gy - 4, gw, gh + 8); ctx.clip();
    if (S.eqNow) D.dashedLine(gx, Y(S.T), gx + gw, Y(S.T), { color: 'rgba(74,222,128,.85)', width: 2, offset: -t * 14 });
    if (S.hist.length > 1) {
      ctx.strokeStyle = '#fb923c'; ctx.lineWidth = 3.2; ctx.lineJoin = 'round'; ctx.shadowColor = 'rgba(251,146,60,.6)'; ctx.shadowBlur = 6;
      ctx.beginPath(); S.hist.forEach((p, i) => { const x = X(p.t), y = Y(p.T); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.lineTo(X(S.simT), Y(S.T)); ctx.stroke(); ctx.shadowBlur = 0;
    }
    S.eqRec.forEach((r, i) => {
      const x = X(r.t), y = Y(r.T); if (x < gx - 4) return;
      ctx.fillStyle = '#4ade80'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y - 8); ctx.lineTo(x + 8, y); ctx.lineTo(x, y + 8); ctx.lineTo(x - 8, y); ctx.closePath(); ctx.fill(); ctx.stroke();
    });
    ctx.restore();
    S.eqRec.forEach((r, i) => { const x = X(r.t), y = Y(r.T); if (x < gx) return; pill(ctx, '평형 ' + (i + 1) + ': ' + Math.round(r.T) + ' °C (' + Math.round(r.d) + ' cm)', Math.min(x, gx + gw - 70), y - 20 * fs, { bg: '#16a34a', font: fnt(L, 12, '800'), h: 21 * fs, pad: 7 }); });
    D.glow(X(S.simT), Y(S.T), 14, '#fdba74', 0.7);
    D.sphere(X(S.simT), Y(S.T), 5.5, '#fff1d6', { gloss: false, outline: '#f97316' });
  }

  /* ---------- 장면 ②: 지구의 복사 평형 ---------- */
  function earthGeoL(G, L) {
    const W = G.M.w, H = G.M.h, fs = L.fs;
    const ex = (L.w ? 0.64 : 0.62) * W, ey = (L.w ? 0.4 : 0.38) * H, r = (L.w ? 0.155 : 0.165) * W;
    const sx = 0.1 * W, sr = 0.075 * W;
    const u = (L.w ? 0.26 : 0.22);
    const sw = 78 * (L.w ? 1 : 0.95), sh = 40 * fs;
    const mk = (cx, cy) => ({ x: G.M.x + cx - sw / 2, y: G.M.y + cy - sh / 2, w: sw, h: sh });
    const tipRef = { x: ex - r * 0.92 - 52, y: ey - r * 0.4 - 52 };
    return {
      W, H, ex, ey, r, sx, sr, u, sw, sh,
      slot: { ref: mk(tipRef.x - 6, tipRef.y - 34), abs: mk(ex - r - 62, ey + 56 + sh * 0.2), emit: mk(ex + r + 62, ey - 62) },
    };
  }
  function layoutEarth(V) {
    const G = geo(V.L), E = earthGeoL(G, V.L), P = G.P, homes = {}, L = V.L;
    const ids = ['a', 'b', 'c', 'd'];
    ids.forEach((id, i) => { homes[id] = L.w ? { x: P.x + P.w * (i % 2 ? 0.7 : 0.3), y: P.y + 104 + Math.floor(i / 2) * 58 } : { x: P.x + P.w * (0.125 + 0.25 * i), y: P.y + 88 }; });
    dnd.items.forEach((it) => { it.w = 64 * (L.w ? 1 : 1.1); it.h = 40 * (L.w ? 1 : 1.1); });
    dnd.layout(homes, SLOTS.map((s) => Object.assign({ id: s.id }, E.slot[s.id])));
    return E;
  }
  function earthScene(V, G, t) {
    const { ctx, L, D } = V, fs = L.fs, E = earthGeoL(G, L), { W, H, ex, ey, r, sx, sr, u } = E;
    const bg = ctx.createLinearGradient(0, 0, W, H); bg.addColorStop(0, '#050a1c'); bg.addColorStop(1, '#0b1a40');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H); starsBg(ctx, W, H, t, 1);
    // 태양
    D.glow(sx, ey, sr * 3, '#fbbf24', 0.5);
    D.sphere(sx, ey, sr, '#ffd24a', { light: '#fff6c8', dark: '#f59e0b', gloss: false });
    D.text(sx, ey + sr + 22 * fs, '태양', { size: 14 * fs, color: '#fde68a', weight: 800 });
    // 지구
    {
      const g = ctx.createRadialGradient(ex - r * 0.4, ey - r * 0.4, r * 0.1, ex, ey, r);
      g.addColorStop(0, '#6cb7ff'); g.addColorStop(0.6, '#2b73d6'); g.addColorStop(1, '#0d3a8a');
      D.glow(ex, ey, r * 1.4, '#60a5fa', 0.28);
      ctx.fillStyle = g; circle(ctx, ex, ey, r); ctx.fill();
      ctx.save(); circle(ctx, ex, ey, r); ctx.clip();
      ctx.fillStyle = 'rgba(74,170,90,.9)';
      [[-0.35, -0.2, 0.34, 0.2], [0.25, 0.25, 0.3, 0.26], [0.05, -0.55, 0.28, 0.12], [-0.5, 0.45, 0.2, 0.14]].forEach((b) => { ctx.beginPath(); ctx.ellipse(ex + b[0] * r, ey + b[1] * r, b[2] * r, b[3] * r, 0.4, 0, TAU); ctx.fill(); });
      ctx.fillStyle = 'rgba(255,255,255,.75)';
      [[-0.1, 0.05, 0.3, 0.07], [0.35, -0.35, 0.22, 0.06], [-0.4, 0.62, 0.25, 0.06]].forEach((b) => { ctx.beginPath(); ctx.ellipse(ex + (b[0] + Math.sin(t * 0.1) * 0.03) * r, ey + b[1] * r, b[2] * r, b[3] * r, -0.2, 0, TAU); ctx.fill(); });
      const sh = ctx.createRadialGradient(ex - r * 0.5, ey - r * 0.5, r * 0.3, ex + r * 0.3, ey + r * 0.3, r * 1.3); sh.addColorStop(0, 'rgba(255,255,255,0)'); sh.addColorStop(1, 'rgba(0,0,20,.45)');
      ctx.fillStyle = sh; ctx.fillRect(ex - r, ey - r, r * 2, r * 2);
      ctx.restore();
      D.text(ex, ey + r * 0.12, '지구', { size: 16 * fs, color: '#fff', weight: 800, stroke: 'rgba(5,20,60,.7)' });
    }
    // 화살표 (칸에 숫자가 놓이면 굵기가 바뀌어요)
    const vRef = slotVal('ref'), vAbs = slotVal('abs'), vEm = slotVal('emit');
    const sunIn = ey, x1 = sx + sr + 10, x2 = ex - r;
    thickArrow(D, x1, sunIn, x2, sunIn, 100 * u, '#fbbf24');
    D.text((x1 + x2) / 2, sunIn - 100 * u / 2 - 22 * fs, '태양 복사 에너지', { size: 13.5 * fs, color: '#fde68a', weight: 800 });
    pill(ctx, '100', (x1 + x2) / 2, sunIn - 100 * u / 2 - 2 * fs, { bg: '#8b5cf6', h: 26 * fs, font: fnt(L, 16, '800'), pad: 14 });
    flowDots(ctx, x1, sunIn, x2, sunIn, t, '#fff7d6', 4, 3);
    // 반사
    const p0 = { x: ex - r * 0.92, y: ey - r * 0.4 };
    const wR = vRef == null ? 3 : vRef * u;
    ctx.save(); if (vRef == null) ctx.globalAlpha = 0.55;
    thickArrow(D, p0.x, p0.y, p0.x - 52, p0.y - 52, wR, '#e0f2fe');
    ctx.restore();
    // 흡수
    const wA = vAbs == null ? 3 : vAbs * u;
    ctx.save(); if (vAbs == null) ctx.globalAlpha = 0.55;
    thickArrow(D, ex - r + 4, ey + 4, ex - r * 0.1, ey + 4, wA, '#fb923c');
    ctx.restore();
    // 방출(적외선)
    const wE = vEm == null ? 3 : vEm * u;
    ctx.save(); if (vEm == null) ctx.globalAlpha = 0.55;
    thickArrow(D, ex + r - 4, ey, ex + r + 82, ey - 8, wE, '#f87171');
    ctx.restore();
    if (vEm != null) { ctx.strokeStyle = 'rgba(255,200,180,.7)'; ctx.lineWidth = 1.6; ctx.beginPath(); for (let i = 0; i <= 20; i++) { const x = ex + r + 6 + i * 3.6, y = ey - 2 - i * 0.1 + Math.sin(i * 0.9 - t * 8) * 3; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); }
    // 칸 이름
    SLOTS.forEach((s) => {
      const r2 = E.slot[s.id], lx = r2.x - G.M.x + r2.w / 2, ly = r2.y - G.M.y;
      D.text(lx, ly - 5 * fs, s.name, { size: 13 * fs, color: '#e6edff', weight: 800, stroke: 'rgba(5,10,30,.7)' });
    });
    // 식
    const done = slotsOK();
    const lines = [];
    if (vRef != null && vAbs != null && vRef + vAbs === 100) lines.push('100 = 반사 ' + vRef + ' + 흡수 ' + vAbs);
    if (vAbs != null && vEm != null && vAbs === vEm) lines.push('흡수 ' + vAbs + ' = 방출 ' + vEm + '  →  ⚖️ 복사 평형');
    ctx.textAlign = 'center';
    const baseY = H - 70 * fs;
    ctx.font = fnt(L, 14, '700');
    const msg = lines.length ? lines : wrapLines(ctx, '숫자 카드를 끌어다 칸에 놓아요. 카드를 누른 뒤 칸을 눌러도 돼요.', W - 70);
    ctx.fillStyle = 'rgba(8,14,38,.85)'; roundRect(ctx, 14, baseY - 22 * fs, W - 28, 26 * fs * msg.length + 18 * fs, 12); ctx.fill();
    ctx.strokeStyle = done ? '#4ade80' : 'rgba(255,255,255,.2)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = done ? '#bbf7d0' : '#c7d2fe'; ctx.font = fnt(L, lines.length ? 15 : 14, '800');
    msg.forEach((s, i) => ctx.fillText(s, W / 2, baseY + 2 + i * 24 * fs));
  }

  /* ---------- 장면 ③: 온실 효과 ---------- */
  function modelScene(V, G, t) {
    const { ctx, L, D } = V, fs = L.fs, mg = modelGeo(G), { W, H, surfY, a0, a1 } = mg;
    // 우주 → 대기 → 지표
    const bg = ctx.createLinearGradient(0, 0, 0, surfY); bg.addColorStop(0, '#04081a'); bg.addColorStop(0.3, '#08112e'); bg.addColorStop(1, '#16407a');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H); starsBg(ctx, W, H, t, 0.9);
    // 대기층
    if (S.atmA > 0.01) {
      const ag = ctx.createLinearGradient(0, a0 - 30, 0, surfY); ag.addColorStop(0, 'rgba(120,190,255,0)'); ag.addColorStop(0.35, 'rgba(120,190,255,' + 0.16 * S.atmA + ')'); ag.addColorStop(1, 'rgba(160,215,255,' + 0.34 * S.atmA + ')');
      ctx.fillStyle = ag; ctx.fillRect(0, a0 - 30, W, surfY - a0 + 30);
      ctx.strokeStyle = 'rgba(180,225,255,' + 0.5 * S.atmA + ')'; ctx.setLineDash([8, 7]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, a0); ctx.lineTo(W, a0); ctx.stroke(); ctx.setLineDash([]);
      D.text(W - 10, a0 - 8 * fs, '대기', { size: 13.5 * fs, color: 'rgba(200,232,255,' + S.atmA + ')', align: 'right', weight: 800 });
    }
    // 태양 빛 (대기를 그대로 통과)
    D.glow(0.06 * W, 0.05 * H, 70, '#fde047', 0.6);
    D.sphere(0.06 * W, 0.05 * H, 24, '#ffd24a', { light: '#fff6c8', dark: '#f59e0b', gloss: false });
    for (let i = 0; i < 4; i++) {
      const x1 = 0.12 * W + i * 0.1 * W, y1 = 0.08 * H, x2 = x1 + 0.22 * W, y2 = surfY - 6;
      D.arrow(x1, y1, x2, y2, { color: 'rgba(253,224,71,.85)', width: 3.4, head: 13, dash: [10, 8] });
      flowDots(ctx, x1, y1, x2, y2, t + i * 0.2, '#fff7c2', 3, 3);
    }
    D.text(0.28 * W, 0.1 * H, '태양 빛', { size: 13.5 * fs, color: '#fde68a', weight: 800, align: 'left' });
    // 지표
    {
      const tg = ctx.createLinearGradient(0, surfY, 0, H); tg.addColorStop(0, mixc('#2d7a46', '#c2410c', clamp((S.Tm - 15) / 14, 0, 1) * 0.5 + S.surfGlow * 0.18)); tg.addColorStop(1, '#14452c');
      ctx.fillStyle = tg; ctx.beginPath(); ctx.moveTo(0, H); ctx.lineTo(0, surfY);
      for (let i = 0; i <= 20; i++) ctx.lineTo(W * i / 20, surfY + Math.sin(i * 1.1) * 3 + Math.sin(i * 0.4 + 1) * 3);
      ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(56,134,214,.9)'; ctx.fillRect(W * 0.5, surfY + 8, W * 0.3, 8);
      D.text(10, surfY + 30 * fs, '지표', { size: 14 * fs, color: '#d1fae5', weight: 800, align: 'left' });
      if (S.surfGlow > 0.02) D.glow(W / 2, surfY, W * 0.5, '#fb923c', 0.18 * S.surfGlow);
      // 지표 온도 표시
      pill(ctx, '지표 평균 기온 ' + (Math.round(S.Tm * 10) / 10).toFixed(1) + ' °C', W / 2, surfY + 38 * fs, { bg: mixc('#2563eb', '#dc2626', clamp((S.Tm + 18) / 40, 0, 1)), font: fnt(L, 16, '800'), h: 30 * fs, pad: 14 });
    }
    // 온실 기체 분자
    S.mols.forEach((m, i) => {
      if (m.k < 0.02) return;
      const x = m.u * W + Math.sin(t * 0.5 + m.ph) * 4, y = a0 + m.v * (a1 - a0) + Math.cos(t * 0.45 + m.ph) * 3.5;
      const sc = (L.w ? 0.55 : 0.5) * (0.4 + 0.6 * m.k) * (L.w ? 1 : 1) * (1 + (m.ex > 0 ? 0.18 * Math.sin(m.ex * 30) : 0));
      ctx.save(); ctx.translate(x, y); ctx.rotate(m.rot + Math.sin(t * 0.6 + m.ph) * 0.15); ctx.globalAlpha = m.k * Math.min(1, S.atmA * 1.2);
      if (m.ex > 0) { ctx.globalAlpha = 1; D.glow(0, 0, 38, '#fb923c', 0.85 * clamp(m.ex / 0.4, 0, 1)); }
      ctx.drawImage(sprite(m.type), -48 * sc, -48 * sc, 96 * sc, 96 * sc);
      ctx.restore();
    });
    // 적외선(지구 복사) 입자
    ctx.save(); ctx.lineCap = 'round'; ctx.lineWidth = 2.4;
    S.photons.forEach((p) => {
      const sp = Math.hypot(p.vx, p.vy) || 1, ux = p.vx / sp, uy = p.vy / sp, nx = -uy, ny = ux;
      ctx.strokeStyle = p.skip ? '#fdba74' : '#fb7185'; ctx.beginPath();
      for (let i = 0; i <= 6; i++) { const s = (i - 3) * 3.4, o = Math.sin(i * 1.7 + p.age * 18) * 2.8; const x = p.x + ux * s + nx * o, y = p.y + uy * s + ny * o; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.stroke();
    });
    ctx.restore();
    // 설명 이름표
    if (S.atm && S.atmA > 0.5) {
      const types = ['co2', 'h2o', 'ch4'];
      types.forEach((ty, i) => {
        const lx = 10, ly = surfY - 18 * fs - (2 - i) * 24 * fs;
        ctx.save(); ctx.fillStyle = 'rgba(8,14,38,.78)'; ctx.font = fnt(L, 12.5, '700'); const w = ctx.measureText(MNAME[ty]).width + 40;
        roundRect(ctx, lx, ly - 11 * fs, w, 22 * fs, 11 * fs); ctx.fill();
        ctx.drawImage(sprite(ty), lx + 1, ly - 12 * fs, 24 * fs, 24 * fs);
        ctx.fillStyle = '#e6edff'; ctx.textAlign = 'left'; ctx.fillText(MNAME[ty], lx + 28 * fs, ly + 4); ctx.restore();
      });
    }
    if ((S.lv >= 3 || S.free) && S.Tm > 15.05) pill(ctx, '해수면 약 +' + Math.round((S.Tm - 15) * 18) + ' cm (예시)', L.w ? W - 10 : W / 2, surfY + (L.w ? 38 : 76) * fs, { align: L.w ? 'right' : 'center', bg: 'rgba(14,116,144,.9)', font: fnt(L, 13.5, '800'), h: 28 * fs, pad: 12 });
    // 처음 안내
    if (!S.atm && S.atmA < 0.1) pill(ctx, '대기가 없으면 지구 복사가 그대로 우주로 빠져나가요', W / 2, a0 + 60 * fs, { bg: 'rgba(15,23,42,.85)', font: fnt(L, 14, '700'), h: 28 * fs, pad: 14 });
    else if (S.atm && S.atmA > 0.9 && S.photons.some((p) => p.skip)) { /* 재방출 중 */ }
    D.text(W - 10, surfY - 12 * fs, '붉은 물결 = 지구 복사(적외선)', { size: 12.5 * fs, color: '#fda4af', align: 'right', weight: 700 });
  }

  /* ---------- 장면 ④: 자료 그래프 ---------- */
  function dataScene(V, G, t) {
    const { ctx, L, D } = V, fs = L.fs, W = G.M.w, H = G.M.h;
    const bg = ctx.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#0f1b3d'); bg.addColorStop(1, '#0a1330'); ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    const gx = 52 * fs, gw = W - gx - 18, y0 = 54 * fs, hh = (H - y0 - 122 * fs) / 2;
    const prog = EZ.inOutCubic(S.dataP);
    const X = (y) => gx + (y - 1958) / (2024 - 1958) * gw;
    const yr = S.yearA;
    function graph(gy, title, ymin, ymax, ticks, fmt, series, col, base) {
      D.text(gx, gy - 14 * fs, title, { size: 14 * fs, color: '#e6edff', align: 'left', weight: 800 });
      pill(ctx, '예시 자료', gx + gw - 4, gy - 16 * fs, { align: 'right', bg: '#f59e0b', color: '#1f1300', font: fnt(L, 12, '800'), h: 22 * fs, pad: 8 });
      ctx.fillStyle = 'rgba(255,255,255,.05)'; roundRect(ctx, gx, gy, gw, hh, 10); ctx.fill();
      const Y = (v) => gy + hh - (v - ymin) / (ymax - ymin) * hh;
      ctx.strokeStyle = 'rgba(255,255,255,.1)'; ctx.lineWidth = 1; ctx.fillStyle = '#c7d2fe'; ctx.font = fnt(L, 12, '600'); ctx.textAlign = 'right';
      ticks.forEach((v) => { ctx.beginPath(); ctx.moveTo(gx, Y(v)); ctx.lineTo(gx + gw, Y(v)); ctx.stroke(); ctx.fillText(fmt(v), gx - 6, Y(v) + 4); });
      ctx.textAlign = 'center';
      for (let y = 1960; y <= 2020; y += 20) { ctx.fillText(String(y), X(y), gy + hh + 16 * fs); ctx.beginPath(); ctx.moveTo(X(y), gy); ctx.lineTo(X(y), gy + hh); ctx.stroke(); }
      if (base != null) { D.dashedLine(gx, Y(base.v), gx + gw, Y(base.v), { color: 'rgba(147,197,253,.8)', width: 1.6 }); D.text(gx + 6, Y(base.v) - 6, base.t, { size: 12 * fs, color: '#bfdbfe', align: 'left', weight: 700 }); }
      ctx.save(); ctx.beginPath(); ctx.rect(gx, gy - 2, gw * prog + 2, hh + 4); ctx.clip();
      ctx.strokeStyle = col; ctx.lineWidth = 2.4; ctx.lineJoin = 'round'; ctx.beginPath();
      series.forEach((p, i) => { const x = X(p[0]), y = Y(p[1]); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke();
      ctx.restore();
      // 커서
      const cx = X(yr);
      if (S.dataP > 0.5) {
        ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(cx, gy); ctx.lineTo(cx, gy + hh); ctx.stroke();
        const vy = series.reduce((b, p) => (Math.abs(p[0] - yr) < Math.abs(b[0] - yr) ? p : b), series[0]);
        D.glow(cx, Y(vy[1]), 16, col, 0.7); D.sphere(cx, Y(vy[1]), 5.5, '#fff', { gloss: false, outline: col });
      }
    }
    const co2s = [], dts = [];
    for (let m = 0; m <= 65 * 12 + 9; m++) { const y = 1958 + m / 12; co2s.push([y, co2At(y)]); }
    for (let y = 1958; y <= 2023; y += 0.5) dts.push([y, dtAt(Math.min(2023, y))]);
    graph(y0, '대기 중 이산화 탄소 농도 (ppm)', 270, 440, [300, 340, 380, 420], (v) => String(v), co2s, '#f87171', { v: 280, t: '산업 혁명 이전 약 280' });
    graph(y0 + hh + 54 * fs, '지구 평균 기온 편차 (°C, 산업화 이전 대비)', -0.4, 1.8, [0, 0.5, 1, 1.5], (v) => (v > 0 ? '+' : '') + v.toFixed(1), dts, '#38bdf8', { v: 0, t: '산업화 이전 = 0' });
    // 읽기 말풍선
    const y = Math.round(yr);
    pill(ctx, y + '년: CO₂ 약 ' + Math.round(co2Base(y)) + ' ppm · 기온 편차 ' + (dtAt(y) >= 0 ? '+' : '') + dtAt(y).toFixed(1) + ' °C', W / 2, H - 20 * fs, { bg: 'rgba(8,14,38,.9)', stroke: '#fbbf24', font: fnt(L, 14, '800'), h: 30 * fs, pad: 14 });
    D.text(W / 2, 22 * fs, '1958년 이후 하와이 관측을 단순화한 예시 자료', { size: 12.5 * fs, color: '#94a3c8' });
  }

  /* ---------- 장면 ⑤: 실천 카드 ---------- */
  const CARDS = [
    { id: 'save', icon: '💡', t: '전기와 에너지 아껴 쓰기', ok: true, c: '#16a34a' },
    { id: 'bus', icon: '🚌', t: '대중교통·자전거 타기', ok: true, c: '#0ea5e9' },
    { id: 'tree', icon: '🌳', t: '나무 심고 숲 가꾸기', ok: true, c: '#22c55e' },
    { id: 'solar', icon: '☀️', t: '재생 에너지 사용 늘리기', ok: true, c: '#f59e0b' },
    { id: 'trash', icon: '🥤', t: '일회용품 많이 쓰기', ok: false, c: '#ef4444' },
    { id: 'aircon', icon: '🌡️', t: '아무도 없는 방에 냉난방 켜 두기', ok: false, c: '#f97316' },
  ];
  function cardRects(G, L) {
    const W = G.M.w, H = G.M.h, cols = 2, rows = 3, pad = 14, top = 70 * L.fs;
    const cw = (W - pad * (cols + 1)) / cols, ch = Math.min(130, (H - top - 30 - pad * (rows - 1)) / rows);
    return CARDS.map((c, i) => ({ x: pad + (i % cols) * (cw + pad), y: top + Math.floor(i / cols) * (ch + pad), w: cw, h: ch }));
  }
  function actScene(V, G, t) {
    const { ctx, L, D } = V, fs = L.fs, W = G.M.w, H = G.M.h;
    const bg = ctx.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#0f2a2e'); bg.addColorStop(1, '#0a1330'); ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    D.text(W / 2, 30 * fs, '지구 온난화를 줄이는 실천 카드를 골라요', { size: 16 * fs, color: '#e6fffa', weight: 800 });
    D.text(W / 2, 52 * fs, '온실 기체를 줄이는 카드 4장 (나머지 2장은 온실 기체를 늘려요)', { size: 12.5 * fs, color: '#99f6e4' });
    const R = cardRects(G, L);
    CARDS.forEach((c, i) => {
      const r = R[i], sel = S.cards.has(c.id), sa = nowS() - (S.cardShake[c.id] || -9);
      let sx = 0; if (sa >= 0 && sa < 0.45) sx = Math.sin(sa * 46) * 6 * (1 - sa / 0.45);
      ctx.save(); ctx.translate(sx, 0);
      ctx.shadowColor = 'rgba(0,0,0,.4)'; ctx.shadowBlur = sel ? 16 : 8; ctx.shadowOffsetY = sel ? 6 : 3;
      const g = ctx.createLinearGradient(0, r.y, 0, r.y + r.h); g.addColorStop(0, sel ? shade(c.c, -0.1) : '#1c2a4f'); g.addColorStop(1, sel ? shade(c.c, -0.35) : '#14203e');
      ctx.fillStyle = g; roundRect(ctx, r.x, r.y - (sel ? 3 : 0), r.w, r.h, 16); ctx.fill(); ctx.shadowColor = 'transparent';
      ctx.lineWidth = sel ? 3.5 : 1.8; ctx.strokeStyle = S.flagCard.has(c.id) ? '#ef4444' : sel ? '#fde047' : 'rgba(255,255,255,.25)'; ctx.stroke();
      ctx.font = Math.round(38 * fs) + 'px ' + FONT; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.fillText(c.icon, r.x + r.w / 2, r.y + r.h * 0.45);
      ctx.font = fnt(L, 14.5, '800'); ctx.fillStyle = '#fff'; ctx.textBaseline = 'alphabetic';
      const lines = wrapLines(ctx, c.t, r.w - 20); lines.slice(0, 2).forEach((s, k) => ctx.fillText(s, r.x + r.w / 2, r.y + r.h * 0.72 + k * 18 * fs));
      if (sel) D.check(r.x + r.w - 20, r.y + 20, 12, 1, { color: '#16a34a' });
      ctx.restore();
    });
  }

  /* ---------- 패널(오른쪽/아래) ---------- */
  function drawPanel(V, G, t) {
    const { ctx, L, D } = V, fs = L.fs, P = G.P, sc = S.scene;
    if (sc === 'lamp') {
      panelBox(V, P, '에너지 비교(상대 값)');
      drawBars(V, P, [{ label: '들어오는|에너지', v: rel(lampA(S.dA)), color: '#f59e0b' }, { label: '나가는|에너지', v: rel(emitE(S.T)), color: '#ef4444' }], { max: 100 });
      if (S.eqNow) D.text(P.x + P.w / 2, P.y + 44 * fs, '= 같아요!', { size: 16 * fs, color: '#86efac', weight: 800 });
    } else if (sc === 'earth') {
      panelBox(V, P, '숫자 카드');
      ctx.save(); ctx.fillStyle = '#c7d2fe'; ctx.font = fnt(L, 12.5, '600'); ctx.textAlign = 'center';
      ctx.fillText(L.w ? '알맞은 칸에 놓아요' : '알맞은 칸에 끌어다 놓아요', P.x + P.w / 2, P.y + (L.w ? 52 : 50) * fs);
      ctx.restore();
      const done = slotsOK();
      if (L.w) {
        ctx.save(); ctx.font = fnt(L, 14, '800'); ctx.textAlign = 'left'; ctx.fillStyle = '#e6edff';
        const rows = [['받은 에너지', '100'], ['− 반사', slotVal('ref') == null ? '?' : String(slotVal('ref'))], ['= 흡수', slotVal('abs') == null ? '?' : String(slotVal('abs'))], ['방출', slotVal('emit') == null ? '?' : String(slotVal('emit'))]];
        rows.forEach((r, i) => { const y = P.y + 270 + i * 40; ctx.fillStyle = 'rgba(255,255,255,.07)'; roundRect(ctx, P.x + 12, y - 22, P.w - 24, 32, 10); ctx.fill(); ctx.fillStyle = '#c7d2fe'; ctx.textAlign = 'left'; ctx.fillText(r[0], P.x + 22, y); ctx.textAlign = 'right'; ctx.fillStyle = r[1] === '?' ? '#64748b' : '#fff'; ctx.fillText(r[1], P.x + P.w - 22, y); });
        if (done) { ctx.textAlign = 'center'; ctx.fillStyle = '#86efac'; ctx.fillText('흡수 = 방출', P.x + P.w / 2, P.y + 460); ctx.fillText('⚖️ 복사 평형!', P.x + P.w / 2, P.y + 484); }
        ctx.restore();
      } else if (done) D.text(P.x + P.w / 2, P.y + 190 * fs, '흡수 = 방출 → ⚖️ 복사 평형!', { size: 16 * fs, color: '#86efac', weight: 800 });
    } else if (sc === 'model') {
      panelBox(V, P, '지구 전체의 에너지');
      D.text(P.x + P.w / 2, P.y + (L.w ? 58 : 52) * fs, '평균 기온 ' + (Math.round(S.Tm * 10) / 10).toFixed(1) + ' °C', { size: 15 * fs, color: mixc('#7dd3fc', '#fca5a5', clamp((S.Tm + 18) / 40, 0, 1)), weight: 800 });
      drawBars(V, P, [{ label: '받는|에너지', v: 70, color: '#f59e0b' }, { label: '우주로 나가는|에너지', v: outBal(), color: '#ef4444' }], { max: 120, top: 76 * fs });
      const bal = Math.abs(outBal() - 70) < 1.2;
      if (bal && S.Tm > -50) D.text(P.x + P.w / 2, P.y + P.h - 8 * fs, bal ? '⚖️ 같아요(복사 평형)' : '', { size: 12.5 * fs, color: '#86efac', weight: 800 });
    } else if (sc === 'data') {
      panelBox(V, P, '자료 읽기');
      const y = Math.round(S.yearA), items = [['연도', y + '년', '#e6edff'], ['CO₂ 농도', Math.round(co2Base(y)) + ' ppm', '#fca5a5'], ['기온 편차', (dtAt(y) >= 0 ? '+' : '') + dtAt(y).toFixed(1) + ' °C', '#7dd3fc']];
      ctx.save();
      items.forEach((it, i) => {
        const bw = L.w ? P.w - 24 : (P.w - 48) / 3, bx = L.w ? P.x + 12 : P.x + 12 + i * (bw + 12), by = L.w ? P.y + 54 + i * 86 : P.y + 54, bh = L.w ? 74 : 80;
        ctx.fillStyle = 'rgba(255,255,255,.07)'; roundRect(ctx, bx, by, bw, bh, 12); ctx.fill();
        ctx.fillStyle = '#a5b4fc'; ctx.font = fnt(L, 12.5, '700'); ctx.textAlign = 'center'; ctx.fillText(it[0], bx + bw / 2, by + 24 * fs);
        ctx.fillStyle = it[2]; ctx.font = fnt(L, L.w ? 20 : 17, '800'); ctx.fillText(it[1], bx + bw / 2, by + 54 * fs);
      });
      ctx.fillStyle = '#c7d2fe'; ctx.font = fnt(L, 12.5, '600'); ctx.textAlign = 'center';
      const msg = '연도를 움직이며 두 그래프를 비교해요. (예시 자료)';
      const ll = wrapLines(ctx, msg, P.w - 28); ll.forEach((s, i) => ctx.fillText(s, P.x + P.w / 2, (L.w ? P.y + 330 : P.y + 168) + i * 18 * fs));
      ctx.restore();
    } else {
      panelBox(V, P, '실천으로 줄여요');
      const msg = '일상에서 온실 기체를 줄이는 행동을 찾아서 4장을 골라 보세요. 이미 쌓인 온실 기체는 오랫동안 남아 있어서, 지금부터 줄이는 것이 중요해요.';
      ctx.save(); ctx.fillStyle = '#dbe4ff'; ctx.font = fnt(L, 13.5, '600'); ctx.textAlign = 'center';
      wrapLines(ctx, msg, P.w - 28).forEach((s, i) => ctx.fillText(s, P.x + P.w / 2, P.y + 60 * fs + i * 20 * fs));
      ctx.font = fnt(L, 20, '800'); ctx.fillStyle = '#fde68a'; ctx.fillText('고른 카드 ' + S.cards.size + ' / 4', P.x + P.w / 2, P.y + P.h - 22 * fs);
      ctx.restore();
    }
  }

  /* ---------- 전체 그리기 ---------- */
  function draw(V, t) {
    const { ctx, L } = V, G = geo(L);
    V.v.clear(FRAME);
    const sc = S.scene;
    ctx.save(); ctx.translate(G.M.x, G.M.y); roundRect(ctx, 0, 0, G.M.w, G.M.h, 16); ctx.clip();
    if (sc === 'lamp') lampScene(V, G, t); else if (sc === 'earth') earthScene(V, G, t); else if (sc === 'model') modelScene(V, G, t); else if (sc === 'data') dataScene(V, G, t); else actScene(V, G, t);
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = 1.5; roundRect(ctx, G.M.x, G.M.y, G.M.w, G.M.h, 16); ctx.stroke();
    drawPanel(V, G, t);
    if (sc === 'earth') {
      const E = layoutEarth(V);
      SLOTS.forEach((s) => {
        const r = E.slot[s.id], filled = dnd.items.some((i) => i.slot === s.id);
        if (filled) return;
        ctx.save(); ctx.fillStyle = 'rgba(255,255,255,.1)'; roundRect(ctx, r.x, r.y, r.w, r.h, 12); ctx.fill();
        ctx.setLineDash([6, 5]); ctx.lineWidth = 2; ctx.strokeStyle = dnd.sel ? '#fde047' : 'rgba(255,255,255,.7)'; ctx.stroke(); ctx.setLineDash([]);
        V.D.text(r.x + r.w / 2, r.y + r.h / 2 + 6 * L.fs, '?', { size: 20 * L.fs, color: 'rgba(255,255,255,.8)', weight: 800 });
        ctx.restore();
      });
      dnd.draw(V);
    }
    drawTip(V, G.M.y + G.M.h - 24 * L.fs);
    V.P.draw(ctx);
    if (game) {
      if (game.isNew('atm') && sc === 'model') newRing(ctx, G.M.x + 4, G.M.y + 4, G.M.w - 8, G.M.h - 8);
    }
  }

  /* ---------- 입력 ---------- */
  views.forEach((V) => {
    SciSim.pointer(V.v, {
      hover(p) {
        if (S.scene === 'earth' && dnd.enabled && dnd.itemAt(p)) return 'grab';
        if (S.scene === 'act') { const G = geo(V.L), R = cardRects(G, V.L); if (R.some((r) => inRect({ x: p.x - G.M.x, y: p.y - G.M.y }, r))) return 'pointer'; }
        if (S.scene === 'data') return 'ew-resize';
        return null;
      },
      down(p) {
        const G = geo(V.L);
        if (S.scene === 'earth') { layoutEarth(V); if (dnd.down(p)) { V.drag = 'dnd'; return true; } return false; }
        if (S.scene === 'act') {
          const R = cardRects(G, V.L), q = { x: p.x - G.M.x, y: p.y - G.M.y };
          CARDS.forEach((c, i) => { if (inRect(q, R[i])) { if (S.cards.has(c.id)) S.cards.delete(c.id); else S.cards.add(c.id); S.flagCard.delete(c.id); Sound.tick(); } });
          return false;
        }
        if (S.scene === 'data') {
          const gx = 52 * V.L.fs + G.M.x, gw = G.M.w - 52 * V.L.fs - 18;
          if (p.x >= G.M.x && p.x <= G.M.x + G.M.w && p.y >= G.M.y && p.y <= G.M.y + G.M.h) { V.drag = 'year'; setYearFromX(V, p.x); return true; }
        }
        return false;
      },
      move(p) { if (V.drag === 'dnd') dnd.move(p); else if (V.drag === 'year') setYearFromX(V, p.x); },
      up(p) { if (V.drag === 'dnd') dnd.up(p); V.drag = null; },
    });
  });
  function setYearFromX(V, x) {
    const G = geo(V.L), gx = 52 * V.L.fs + G.M.x, gw = G.M.w - 52 * V.L.fs - 18;
    const y = Math.round(clamp(1958 + (x - gx) / gw * (2024 - 1958), 1958, 2023));
    S.year = y; S.yearMax = Math.max(S.yearMax, y); S.yearMin = Math.min(S.yearMin, y); bYear.set(y);
  }

  /* ---------- 단계 준비 ---------- */
  function stage(lv) {
    S.lv = lv; S.free = false;
    if (lv === 0) { S.scene = 'lamp'; S.d = 50; S.T = 20; S.simT = 0; S.hist = []; S.eqRec = []; S.eqHold = 0; S.eqTip = false; }
    if (lv === 1) { S.scene = 'earth'; dnd.reset(); flagSlots = new Set(); }
    if (lv === 2) { S.scene = 'model'; S.atm = true; S.atmA = 1; S.g = 1; S.gA = 1; S.Tm = 15; S.seenNo = S.seenYes = false; S.noT = S.yesT = 0; S.photons = []; }
    if (lv === 3) { S.scene = 'data'; S.atm = true; S.atmA = 1; S.g = 1; S.Tm = 15; S.year = 2023; S.yearA = 2023; S.yearMax = S.yearMin = 2023; S.cards = new Set(); S.flagCard = new Set(); S.dataP = 0; }
    syncSliders(); syncControls();
  }

  /* ---------- 미션 ---------- */
  game = SciSim.game({
    simId: 'm3-greenhouse',
    mount: '#game',
    badge: '복사 평형 박사',
    homeHref: '../../index.html#g3',
    featureLabels: { dist: '💡 램프 거리 조절', atm: '☁️ 대기 켜고 끄기', views: '🔭 화면 바꾸기', gas: '🏭 온실 기체 슬라이더' },
    onFeatures(set) { FEAT = set; syncControls(); },
    onMissionStart(m) { TIP.t0 = -99; if (S.lv !== m._level && !S.free) stage(m._level); },
    onComplete() { S.free = true; S.lv = 3; S.scene = 'model'; S.atm = true; syncControls(); },
    levels: [
      /* ---------- 1단계 · 실험 ---------- */
      {
        title: '복사 평형: 램프와 검은 컵', short: '복사 평형', icon: '💡', phase: '실험',
        features: ['dist'],
        intro: '<p class="si-q">❓ 탐구 질문: 햇빛을 계속 받는데 지구의 온도는 왜 끝없이 올라가지 않을까?</p>' +
          '<p>먼저 간단한 실험으로 알아봐요. <b>적외선 램프</b> 아래 <b>검은 컵</b>을 두고 온도를 재요. 컵은 램프의 에너지를 <b>흡수</b>하고, 뜨거워지면 에너지를 <b>방출</b>해요. 온도가 어떻게 변하는지 지켜봐요.</p>',
        setup() { stage(0); },
        recap: '흡수하는 에너지와 방출하는 에너지가 <b>같아지면</b> 온도가 일정해져요. 이것이 <b>복사 평형</b>이에요.',
        summary: '<ul><li>물체는 에너지를 흡수해 온도가 오르고, 뜨거워질수록 에너지를 더 많이 <b>방출</b>해요.</li>' +
          '<li>흡수하는 에너지양과 방출하는 에너지양이 <b>같아지면</b> 온도가 더 변하지 않고 일정해져요. 이 상태를 <b>복사 평형</b>이라고 해요.</li>' +
          '<li>램프를 가까이 하면 흡수하는 에너지가 많아져서, 더 높은 온도에서 평형이 돼요. 멀리 하면 더 낮은 온도에서 평형이 돼요.</li></ul>',
        missions: [
          {
            title: '⚖️ 복사 평형 만들기',
            goal: '컵의 온도가 오르다가 <b>일정해질 때까지</b> 기다려요. 들어오는 에너지와 나가는 에너지가 <b>같아지면</b> 성공!',
            hint: '🧊 버튼으로 컵을 식힌 뒤 다시 시작해도 돼요. 오른쪽 막대 두 개가 같은 높이가 되는지 지켜봐요.',
            setup() { S.eqRec = []; },
            check: () => S.eqNow,
            hold: 1.5,
            status: () => (S.eqNow ? '✅ 복사 평형! 온도 ' + S.T.toFixed(1) + ' °C' : '⬜ 온도 ' + S.T.toFixed(1) + ' °C — 막대 두 개가 같아지면 평형이에요'),
            explain: '처음에는 <b>들어오는 에너지 > 나가는 에너지</b>여서 온도가 올라가요. 온도가 높아지면 나가는 에너지도 늘어나다가, 둘이 <b>같아지면</b> 온도가 일정해져요. 이것이 <b>복사 평형</b>이에요.',
          },
          {
            title: '💡 램프 거리를 바꿔 보기',
            goal: '램프와 컵 사이 <b>거리를 바꿔서</b>, <b>서로 다른 두 거리</b>에서 복사 평형을 만들어 평형 온도를 비교해요.',
            hint: '평형이 되면 초록 마름모가 그래프에 찍혀요. 슬라이더를 15 cm 이상 옮겨서 다시 기다려요.',
            setup() { S.eqRec = []; S.eqHold = 0; },
            check: () => S.eqRec.length >= 2 && Math.max(...S.eqRec.map((r) => r.d)) - Math.min(...S.eqRec.map((r) => r.d)) >= 14,
            hold: 0.4,
            status: () => [0, 1].map((i) => chk(!!S.eqRec[i], '평형 ' + (i + 1) + (S.eqRec[i] ? ' (' + Math.round(S.eqRec[i].d) + ' cm, ' + S.eqRec[i].T.toFixed(1) + ' °C)' : ''))).join(' · ') + (S.eqRec.length >= 2 ? '' : '  ※ 거리는 15 cm 이상 차이 나게'),
            explain: '램프가 <b>가까울수록</b> 컵이 흡수하는 에너지가 많아져서 <b>더 높은 온도</b>에서 평형이 돼요. 멀수록 평형 온도가 낮아요. 평형 온도는 <b>흡수하는 에너지의 양</b>에 따라 정해져요.',
          },
          {
            type: 'quiz', title: '🤔 온도가 일정해지는 까닭',
            goal: '램프는 계속 켜져 있는데, 컵의 온도는 왜 어느 순간부터 <b>더 오르지 않고 일정해질까요</b>?',
            setup() { S.scene = 'lamp'; syncControls(); },
            choices: ['들어오는 에너지와 나가는 에너지가 같아졌기 때문', '램프가 점점 약해졌기 때문', '컵이 더 이상 에너지를 흡수하지 못하기 때문', '컵이 에너지를 전혀 내보내지 않기 때문'],
            answer: 0,
            feedback: [
              '',
              '램프의 세기는 그대로예요(막대로도 확인할 수 있어요). 달라진 것은 컵 쪽이에요.',
              '컵은 평형에서도 계속 에너지를 흡수하고 있어요. 흡수하는 만큼 내보내서 온도가 일정한 거예요.',
              '컵은 온도가 올라갈수록 에너지를 더 많이 내보내요. 나가는 막대가 점점 커지는 것을 봤나요?',
            ],
            explain: '컵은 에너지를 <b>계속 흡수</b>하면서 <b>그만큼 방출</b>해요. 흡수하는 양과 방출하는 양이 같아서 온도가 일정하게 유지돼요. 지구도 같은 원리로 평균 기온이 유지돼요.',
          },
        ],
      },
      /* ---------- 2단계 · 모형 ---------- */
      {
        title: '지구의 복사 평형', short: '지구의 복사 평형', icon: '🌍', phase: '모형',
        features: [],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 흡수하는 에너지와 방출하는 에너지가 같으면 온도가 일정하다는 것을 알았어요.</div>' +
          '<p>지구에도 같은 원리가 적용돼요. 태양 복사 에너지를 <b>100</b>이라고 할 때, 지구가 <b>반사</b>하는 양, <b>흡수</b>하는 양, 우주로 <b>방출</b>하는 양을 숫자 카드로 채워 봐요.</p>',
        setup() { stage(1); },
        recap: '태양 복사 에너지 100 중 약 <b>30은 반사</b>되고 약 <b>70은 흡수</b>돼요. 지구는 흡수한 70만큼을 우주로 <b>방출</b>해서 복사 평형을 이뤄요.',
        summary: '<ul><li>지구에 도달한 태양 복사 에너지를 <b>100</b>이라고 하면, 약 <b>30</b>은 구름·지표 등에 의해 <b>반사</b>되고, 약 <b>70</b>은 지구가 <b>흡수</b>해요.</li>' +
          '<li>지구는 흡수한 만큼인 약 <b>70</b>을 <b>지구 복사 에너지</b>(적외선)로 우주에 <b>방출</b>해요.</li>' +
          '<li>흡수량(70) = 방출량(70)이므로 지구는 <b>복사 평형</b>을 이루고, 평균 기온이 일정하게 유지돼요.</li></ul>',
        missions: [
          {
            title: '🧩 에너지 화살표 채우기', manual: true,
            goal: '숫자 카드를 끌어다 알맞은 칸에 놓아요. 태양 복사 100 중 <b>반사</b>, <b>흡수</b>, 우주로 <b>방출</b>은 각각 얼마일까요? 다 놓았으면 <b>확인하기</b>를 눌러요.',
            hint: '반사된 에너지는 지구에 들어오지 못해요. 100 − 반사 = 흡수예요. 복사 평형이면 방출은 흡수와 같아요.',
            setup() { dnd.reset(); flagSlots = new Set(); },
            status: () => SLOTS.map((s) => chk(slotVal(s.id) != null, s.name)).join(' · '),
            check() {
              const un = SLOTS.filter((s) => slotVal(s.id) == null);
              if (un.length) return '아직 숫자를 놓지 않은 칸이 있어요: ' + un.map((s) => s.name).join(', ');
              const wrong = SLOTS.filter((s) => slotVal(s.id) !== s.want), now = new Set(wrong.map((s) => s.id));
              dnd.items.forEach((it) => { const bad = now.has(it.slot); it.bad = bad; if (bad && !flagSlots.has(it.slot)) it.shake = nowS(); });
              flagSlots = now;
              if (wrong.length) return '다시 생각해 볼 칸이 있어요(' + wrong.map((s) => s.name).join(', ') + '). 반사 + 흡수 = 100이에요. 복사 평형이면 흡수 = 방출이에요.';
              return true;
            },
            explain: '태양 복사 에너지 <b>100</b> 중 <b>30</b>은 반사되고 <b>70</b>이 흡수돼요. 복사 평형에서는 흡수한 <b>70</b>을 그대로 우주로 <b>방출</b>해요.',
          },
          {
            type: 'quiz', title: '🌡️ 지구의 평균 기온이 일정한 까닭',
            goal: '지구는 태양 에너지를 계속 흡수하는데도 평균 기온이 오랫동안 거의 일정해요. 그 까닭은?',
            setup() { dnd.items.forEach((it) => { if (it.slot == null) { const s = SLOTS.find((q) => q.want === it.v && !dnd.items.some((o) => o.slot === q.id)); if (s) it.slot = s.id; } }); },
            choices: ['흡수한 에너지만큼 지구도 에너지를 우주로 방출하기 때문', '지구가 받은 에너지를 모두 반사하기 때문', '받은 에너지가 지구 속에 계속 쌓이기 때문', '밤에는 태양 에너지가 전혀 없기 때문'],
            answer: 0,
            feedback: [
              '',
              '반사되는 것은 약 30뿐이에요. 나머지 약 70은 지구가 흡수해요.',
              '에너지가 계속 쌓이면 온도가 계속 올라갈 거예요. 하지만 지구의 평균 기온은 거의 일정해요.',
              '밤과 낮은 하루 동안의 변화예요. 오랜 기간의 평균 기온이 일정한 까닭은 에너지의 출입이 같기 때문이에요.',
            ],
            explain: '지구는 흡수하는 에너지(약 70)와 우주로 방출하는 에너지(약 70)가 같아서 <b>복사 평형</b> 상태예요. 그래서 평균 기온이 일정하게 유지돼요.',
          },
        ],
      },
      /* ---------- 3단계 · 모형 ---------- */
      {
        title: '온실 효과: 대기가 있을 때와 없을 때', short: '온실 효과', icon: '☁️', phase: '모형',
        features: ['atm'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 지구가 흡수한 에너지만큼 우주로 방출하면서 복사 평형을 이룬다는 것을 배웠어요.</div>' +
          '<p>그런데 지구 복사(적외선)가 곧바로 우주로 나가지 못하게 하는 것이 있어요. 대기 속 <b>온실 기체</b>예요. 대기를 껐다 켜며 <b>지표 평균 기온</b>이 어떻게 달라지는지 살펴봐요.</p>',
        setup() { stage(2); },
        recap: '<b>온실 기체</b>가 지구 복사 에너지를 흡수했다가 다시 방출해서, 대기가 없을 때(−18 °C)보다 지표가 따뜻한 15 °C가 유지돼요. 이것이 <b>온실 효과</b>예요.',
        summary: '<ul><li><b>온실 기체</b>(수증기, 이산화 탄소, 메테인 등)는 지표가 방출한 지구 복사 에너지의 일부를 <b>흡수</b>했다가 사방으로 <b>다시 방출</b>해요. 그중 일부는 지표로 되돌아와 지표를 데워요.</li>' +
          '<li>이것을 <b>온실 효과</b>라고 해요. 대기가 없다면 지구 평균 기온은 약 <b>−18 °C</b>이지만, 온실 효과 덕분에 약 <b>15 °C</b>가 유지돼요.</li>' +
          '<li>온실 효과는 생명이 살 수 있게 해 주는 <b>꼭 필요한 현상</b>이에요. 문제는 온실 효과가 <b>너무 강해지는 것</b>이에요.</li></ul>',
        missions: [
          {
            title: '🔄 대기 없음 ↔ 대기 있음',
            goal: '<b>🚫 대기 없음</b>으로 바꾸고 기온이 <b>−18 °C</b>가 될 때까지 기다린 뒤, 다시 <b>☁️ 온실 기체 대기</b>로 바꿔 <b>15 °C</b>가 되는 것을 확인해요.',
            hint: '붉은 물결이 지구 복사(적외선)예요. 대기가 있을 때 물결이 분자에 부딪혀 어떻게 되는지 보세요. 기온이 바뀌는 데 몇 초 걸려요.',
            setup() { S.seenNo = S.seenYes = false; S.noT = S.yesT = 0; },
            check: () => S.seenNo && S.seenYes,
            hold: 0.3,
            status: () => chk(S.seenNo, '대기 없음 −18 °C') + ' · ' + chk(S.seenYes, '다시 대기 있음 15 °C'),
            explain: '대기가 없으면 지구 복사가 우주로 그대로 빠져나가 평균 기온이 약 <b>−18 °C</b>예요. 온실 기체가 있는 대기에서는 지구 복사의 일부가 지표로 되돌아와서 약 <b>15 °C</b>가 유지돼요.',
          },
          {
            type: 'quiz', title: '🔁 온실 기체가 하는 일',
            goal: '온실 기체 분자가 지표에서 올라온 <b>지구 복사 에너지(적외선)</b>를 만나면 어떤 일이 일어날까요?',
            setup() { S.atm = true; syncControls(); },
            choices: ['흡수했다가 사방으로 다시 방출하고, 그중 일부가 지표로 돌아와 지표를 데운다', '에너지가 사라진다', '모두 우주로 바로 나간다', '태양 빛을 막아서 지표를 차갑게 한다'],
            answer: 0,
            feedback: [
              '',
              '에너지는 사라지지 않아요. 분자가 흡수한 뒤에 다시 내보내요.',
              '그렇다면 대기가 없을 때와 같을 거예요. 온실 기체는 지구 복사를 한 번 붙잡았다가 내보내요.',
              '온실 기체는 태양 빛은 거의 그대로 통과시키고, 지표에서 나오는 지구 복사(적외선)에 작용해요.',
            ],
            explain: '온실 기체는 지구 복사 에너지를 <b>흡수</b>했다가 <b>사방으로 다시 방출</b>해요. 이 중 일부가 <b>지표로 되돌아오기 때문에</b> 지표가 더 따뜻해져요.',
          },
          {
            type: 'quiz', title: '🌱 온실 효과는 나쁜 것일까?',
            goal: '온실 효과에 대한 설명으로 알맞은 것은?',
            setup() { S.atm = true; syncControls(); },
            choices: ['온실 효과가 없다면 지구는 너무 추워서 생명이 살기 어려워요. 문제는 온실 효과가 강해지는 것이에요', '온실 효과는 모두 해로운 현상이에요', '온실 효과는 사람이 만든 현상이에요', '온실 기체는 태양 빛을 반사해서 우주로 보내요'],
            answer: 0,
            feedback: [
              '',
              '온실 효과가 없다면 평균 기온이 약 −18 °C가 돼요. 자연적인 온실 효과는 생명에 꼭 필요해요.',
              '자연적인 온실 효과는 사람이 나타나기 전부터 있었어요. 사람의 활동으로 온실 기체가 더 늘어난 것이 문제예요.',
              '온실 기체가 하는 일은 태양 빛의 반사가 아니라, 지표에서 나오는 지구 복사를 흡수했다가 다시 방출하는 거예요.',
            ],
            explain: '<b>자연적인 온실 효과</b>는 지구를 15 °C 정도로 유지해 주는 꼭 필요한 현상이에요. 사람의 활동으로 온실 기체가 늘어 온실 효과가 <b>강화</b>되는 것이 지구 온난화의 원인이에요.',
          },
        ],
      },
      /* ---------- 4단계 · 분석 ---------- */
      {
        title: '지구 온난화: 자료 분석', short: '지구 온난화', icon: '🌡️', phase: '분석',
        features: ['views', 'gas'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 온실 효과가 지표를 따뜻하게 유지해 준다는 것을 배웠어요.</div>' +
          '<p>화석 연료를 많이 쓰면서 대기 중 <b>온실 기체</b>가 늘고 있어요. <b>📈 자료</b>에서 이산화 탄소 농도와 기온 변화를 비교하고, <b>🌍 모형</b>에서 온실 기체가 늘 때 복사 평형이 어떻게 바뀌는지 살펴봐요.</p>',
        setup() { stage(3); },
        recap: '온실 기체가 늘면 온실 효과가 <b>강화</b>되어 복사 평형이 깨지고, 새로운 평형에 이를 때까지 지구 평균 기온이 <b>상승</b>해요. 이것이 <b>지구 온난화</b>예요.',
        summary: '<ul><li>대기 중 이산화 탄소 농도는 1960년 약 317 ppm에서 2023년 약 420 ppm으로 늘었어요(산업 혁명 이전 약 280 ppm). 지구 평균 기온도 산업화 이전보다 약 <b>1.1 °C</b> 올랐어요(예시 자료).</li>' +
          '<li>화석 연료 사용 등으로 온실 기체가 늘면 <b>온실 효과가 강화</b>돼요. 처음엔 우주로 나가는 에너지가 줄어 <b>복사 평형이 깨지고</b>, 지구가 따뜻해지다가 더 높은 기온에서 <b>새로운 복사 평형</b>이 돼요.</li>' +
          '<li>지구 온난화는 빙하가 녹고 바닷물이 열팽창해 <b>해수면 상승</b>, <b>이상 기후</b>, 생태계 변화를 일으켜요. 에너지 절약, 대중교통 이용, 나무 심기 등으로 온실 기체를 줄이는 노력이 필요해요.</li></ul>',
        missions: [
          {
            type: 'quiz', title: '📈 두 자료를 비교하기',
            goal: '📈 자료에서 연도 슬라이더를 움직여 보세요. 1958년 이후 <b>이산화 탄소 농도</b>와 <b>지구 평균 기온 편차</b>는 어떤 경향을 보이나요?',
            setup() { setScene('data'); },
            choices: ['둘 다 대체로 함께 증가하는 경향이 있다', '이산화 탄소 농도는 늘었지만 기온은 계속 내려갔다', '두 자료는 서로 아무 관련이 없다', '이산화 탄소 농도는 거의 변하지 않았다'],
            answer: 0,
            feedback: [
              '',
              '기온 편차 그래프를 다시 봐요. 해마다 오르내리지만 전체적으로는 위로 올라가고 있어요.',
              '두 그래프가 모두 오른쪽으로 갈수록 올라가는 경향이에요. 이런 관련성을 근거로 온실 기체와 기온을 연결해 볼 수 있어요.',
              '농도 그래프는 1958년 약 315 ppm에서 2023년 약 420 ppm으로 크게 올랐어요. 톱니 모양은 계절에 따른 변화예요.',
            ],
            explain: '이산화 탄소 농도(톱니 모양은 계절 변동)와 지구 평균 기온 편차는 <b>함께 증가하는 경향</b>이 있어요. 온실 기체 증가와 기온 상승이 관련 있다는 것을 보여 줘요.',
          },
          {
            title: '🏭 온실 기체를 늘려 보기',
            goal: '🌍 모형에서 <b>온실 기체 양</b> 슬라이더를 산업화 이전의 <b>2배</b> 가까이 올리고, 기온이 새로운 값에서 안정될 때까지 지켜봐요.',
            hint: '슬라이더를 올리면 우주로 나가는 에너지(오른쪽 막대)가 잠깐 줄어요. 기온이 오르면 다시 70이 돼요.',
            setup() { setScene('model'); },
            check: () => S.g >= 1.9 && Math.abs(S.Tm - Ttarget(true, S.g)) < 0.1,
            hold: 1.2,
            status: () => '온실 기체 ' + S.g.toFixed(2) + '배 · 기온 ' + S.Tm.toFixed(1) + ' °C · 해수면 약 +' + Math.round(Math.max(0, S.Tm - 15) * 18) + ' cm(예시)' + (S.g >= 1.9 ? '' : ' (1.9배 이상으로)'),
            explain: '온실 기체가 늘면 지표 복사가 우주로 덜 빠져나가 <b>나가는 에너지 &lt; 들어오는 에너지</b>가 돼요. 지구는 따뜻해지고, 기온이 올라가면 나가는 에너지가 다시 늘어 <b>새로운 복사 평형</b>(더 높은 기온)에 이르러요.',
          },
          {
            title: '🌱 실천 카드 고르기', manual: true,
            goal: '🌱 실천 화면에서 온실 기체를 <b>줄이는</b> 카드 <b>4장</b>을 골라요. 골랐으면 <b>확인하기</b>를 눌러요.',
            hint: '에너지를 아끼고, 화석 연료를 덜 쓰고, 이산화 탄소를 흡수하는 나무를 가꾸는 행동을 골라요.',
            setup() { setScene('act'); S.cards = new Set(); S.flagCard = new Set(); },
            status: () => '고른 카드 ' + S.cards.size + ' / 4장',
            check() {
              const wrong = CARDS.filter((c) => S.cards.has(c.id) && !c.ok), miss = CARDS.filter((c) => !S.cards.has(c.id) && c.ok);
              const now = new Set(wrong.map((c) => c.id));
              now.forEach((id) => { if (!S.flagCard.has(id)) S.cardShake[id] = nowS(); });
              S.flagCard = now;
              if (wrong.length) return '온실 기체를 늘리는 카드가 섞여 있어요(' + wrong.map((c) => c.t).join(', ') + '). 다시 골라 봐요.';
              if (miss.length) return '아직 고르지 않은 실천이 있어요. 온실 기체를 줄이는 카드는 모두 4장이에요.';
              return true;
            },
            explain: '에너지 절약, 대중교통과 자전거 이용, 나무 심기, 재생 에너지 확대는 모두 <b>온실 기체를 줄이는 실천</b>이에요. 일회용품과 불필요한 냉난방은 에너지를 더 쓰게 해서 온실 기체를 늘려요. 환경과 사람이 함께 살아가는 방법을 찾아가요.',
          },
        ],
      },
    ],
  });
  syncControls();

  /* ---------- 실행 ---------- */
  SciSim.loop((dt, t) => {
    try {
      update(dt, t);
      views.forEach((V) => { if (V.v.canvas.offsetWidth > 0) draw(V, t); });
    } catch (e) { console.error(e); }
  });

  /* ---------- 점검용 ---------- */
  window.__sim = {
    S, dnd, SLOTS, CARDS, game: () => game, view: activeView, setScene, setAtm, Ttarget, lampA, emitE, rel,
    client(x, y) { const V = activeView(), r = V.v.canvas.getBoundingClientRect(); return { x: r.left + x * r.width / V.L.vw, y: r.top + y * r.height / V.L.vh }; },
    chipClient(id) { const it = dnd.get(id); return this.client(it.x, it.y); },
    slotClient(id) { const V = activeView(); const E = layoutEarth(V); const r = E.slot[id]; return this.client(r.x + r.w / 2, r.y + r.h / 2); },
    cardClient(id) { const V = activeView(), G = geo(V.L), R = cardRects(G, V.L), i = CARDS.findIndex((c) => c.id === id); return this.client(G.M.x + R[i].x + R[i].w / 2, G.M.y + R[i].y + R[i].h / 2); },
    yearClient(y) { const V = activeView(), G = geo(V.L), gx = 52 * V.L.fs + G.M.x, gw = G.M.w - 52 * V.L.fs - 18; return this.client(gx + (y - 1958) / (2024 - 1958) * gw, G.M.y + G.M.h * 0.3); },
    bench(n) { const V = activeView(); const t0 = performance.now(); for (let i = 0; i < n; i++) { draw(V, nowS()); V.ctx.getImageData(0, 0, 1, 1); } return (performance.now() - t0) / n; },
  };
})();
