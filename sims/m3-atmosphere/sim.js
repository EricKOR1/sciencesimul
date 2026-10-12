/* =========================================================
   중3 Ⅱ. 날씨와 기후변화 - 기권의 층 구조
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
     [9과17-01] 기권의 층 구조  (탐구 흐름 4단계)
     ① 관찰: 관측 기구를 띄워 높이에 따른 기온 읽기 (0·5·11 km 기록)
     ② 기록: 0~100 km 측정점을 찍어 높이-기온 그래프 완성, 꺾이는 점 3개 찾기
     ③ 설명: 꺾이는 점을 경계로 네 권역(대류권·성층권·중간권·열권)에 이름표 붙이기
     ④ 적용: 비행기 항로, 기상 현상, 유성·오로라 위치
     ========================================================= */
  const LAYOUTS = {
    wide: { key: 'wide', vw: 800, vh: 640, fs: 1, w: true },
    tall: { key: 'tall', vw: 520, vh: 846, fs: 1.18, w: false },
  };
  function geo(L) {
    if (L.w) return { sx0: 12, sx1: 318, ax: 353, gx0: 388, gx1: 788, yTop: 56, yBot: 546, tagW: 108, tagH: 32, tagHome: (i) => ({ x: 452, y: 290 + i * 46 }), info: { x: 12, y: 588, w: 776, h: 46 }, tickY: 566 };
    return { sx0: 8, sx1: 152, ax: 179, gx0: 206, gx1: 512, yTop: 64, yBot: 690, tagW: 116, tagH: 34, tagHome: (i) => ({ x: 66 + i * 129, y: 744 }), info: { x: 8, y: 772, w: 504, h: 68 }, tickY: 712 };
  }

  /* ---------- 자료: 높이에 따른 기온 (단순화한 대표값) ---------- */
  const PROF = [[0, 15], [11, -56], [50, -2], [80, -90], [100, 0]];
  function Tat(h) {
    h = clamp(h, 0, 100);
    for (let i = 1; i < PROF.length; i++) {
      if (h <= PROF[i][0]) { const a = PROF[i - 1], b = PROF[i]; return a[1] + (b[1] - a[1]) * (h - a[0]) / (b[0] - a[0]); }
    }
    return PROF[PROF.length - 1][1];
  }
  const BOUND = [0, 11, 50, 80, 100];
  const bandOf = (h) => (h < 11 ? 0 : h < 50 ? 1 : h < 80 ? 2 : 3);
  const LAYER = [
    { name: '대류권', col: '#38bdf8', range: '지표~약 11 km', info: '올라갈수록 기온이 낮아져요. 대류가 활발하고 수증기가 있어서 구름·비·눈 같은 기상 현상이 일어나요.' },
    { name: '성층권', col: '#34d399', range: '약 11~50 km', info: '올라갈수록 기온이 높아져요(오존층이 자외선을 흡수). 대류가 없어 안정해서 비행기가 다녀요.' },
    { name: '중간권', col: '#a78bfa', range: '약 50~80 km', info: '올라갈수록 기온이 낮아져요. 수증기가 거의 없어 기상 현상이 없고, 유성(별똥별)이 보여요.' },
    { name: '열권', col: '#fb7185', range: '약 80 km 이상', info: '올라갈수록 기온이 급격히 높아져요. 공기가 아주 희박하고, 오로라가 나타나며 인공위성이 돌아요.' },
  ];
  const SAMP = [0, 5, 11, 20, 30, 40, 50, 65, 80, 90, 100];
  const KINK = [{ h: 11, i: '①' }, { h: 50, i: '②' }, { h: 80, i: '③' }];
  const volOf = (h) => Math.exp(h / 7) * (Tat(h) + 273) / 288;       // 기구 부피(지표의 몇 배): 기압이 낮아지면 커져요
  const POP_H = 32;                                                   // 기구가 터지는 높이(이 위는 관측 로켓)

  /* ---------- 상태 ---------- */
  let game = null, FEAT = new Set();
  const has = (f) => FEAT.has(f);
  const S = {
    lv: 0, free: false,
    alt: 0, altT: 0, hMax: 14, hMaxT: 14, altMax: 12, auto: false, dir: 1, maxAlt: 0,
    pts: [], kinks: new Set(), kinkOn: false,
    bandsOn: false, bandT0: 0, sel: -1, seen: new Set(),
    flagTag: new Set(), balloonK: 1, popAt: -9, dragSky: false, ripple: [], meteors: [], nextMeteor: 2,
    clouds: [{ h: 1.8, u: 0.2, s: 1, v: 0.012 }, { h: 4.6, u: 0.7, s: 1.25, v: -0.009 }, { h: 7.6, u: 0.45, s: 0.9, v: 0.014 }, { h: 3.0, u: 0.95, s: 0.8, v: -0.011 }],
    plane: 0.1, stars: [], rain: [],
  };
  { const r = rng(7); for (let i = 0; i < 46; i++) S.stars.push({ u: r(), v: r(), s: 0.6 + r() * 1.3, ph: r() * 6 }); for (let i = 0; i < 16; i++) S.rain.push({ k: r(), o: r() }); }
  const views = makeViews(LAYOUTS);
  const activeView = () => activeOf(views);

  /* ---------- 이름표 끌어다 놓기 ---------- */
  const tags = new DnD(LAYER.map((l, i) => ({ id: i, band: i, label: l.name, color: l.col, w: 108, h: 32 })), () => {});
  const bandOfTag = (t) => (t.slot == null ? -1 : t.slot);
  const tagOK = (i) => { const t = tags.get(i); return !!t && t.slot === i; };
  const nameShown = (i) => S.lv >= 3 || S.free || tagOK(i);
  function layoutTags(V) {
    const G = geo(V.L), hm = S.hMax, ppk = (G.yBot - G.yTop) / hm;
    const homes = {}, slots = [];
    const yOf = (h) => G.yBot - h * ppk;
    LAYER.forEach((l, i) => {
      homes[i] = G.tagHome(i);
      const y0 = Math.max(G.yTop - 10, yOf(BOUND[i + 1])), y1 = Math.min(G.yBot + 10, yOf(BOUND[i]));
      const cy = (y0 + y1) / 2;
      slots.push({ id: i, x: G.sx0 + 6, y: cy - G.tagH / 2, w: G.tagW, h: G.tagH, hit: { x: G.sx0, y: y0, w: G.gx1 - G.sx0, h: y1 - y0 } });
    });
    tags.items.forEach((it) => { it.w = G.tagW; it.h = G.tagH; });
    tags.layout(homes, slots);
  }

  /* ---------- 측정점 ---------- */
  function addPoint(h, quiet) {
    h = Math.round(h * 10) / 10;
    if (S.pts.some((p) => Math.abs(p.h - h) < 0.15)) return false;
    S.pts.push({ h, T: Tat(h), born: quiet ? -9 : nowS(), oh: S.alt });
    S.pts.sort((a, b) => a.h - b.h);
    if (!quiet) { Sound.tone(520 + Math.min(500, h * 6), 0.09, 'triangle', 0.08); S.ripple.push({ h, t0: nowS() }); }
    return true;
  }
  const sampleCount = () => SAMP.filter((s) => S.pts.some((p) => Math.abs(p.h - s) < 0.45)).length;
  function fillAll(quiet) { SAMP.forEach((s) => addPoint(s, quiet !== false)); S.maxAlt = Math.max(S.maxAlt, 100); }
  const hasPt = (h) => S.pts.some((p) => Math.abs(p.h - h) < 0.7);

  /* ---------- 컨트롤 ---------- */
  const sAlt = $('#sAlt'), oAlt = $('#oAlt'), autoBtn = $('#autoBtn'), recBtn = $('#recBtn');
  let sliderDown = false;
  const sliderB = SciSim.bindRange(sAlt, oAlt, (v) => (+v).toFixed(1) + ' km', (v) => { S.altT = v; S.auto = false; syncControls(); });
  ['pointerdown', 'touchstart'].forEach((e) => sAlt.addEventListener(e, () => { sliderDown = true; }, { passive: true }));
  ['pointerup', 'touchend', 'pointercancel', 'change'].forEach((e) => sAlt.addEventListener(e, () => { sliderDown = false; }));
  autoBtn.addEventListener('click', () => {
    Sound.click();
    if (S.auto) { S.auto = false; }
    else {
      if (S.altT >= S.altMax - 0.05) S.dir = -1; else if (S.altT <= 0.05) S.dir = 1;
      S.auto = true;
    }
    syncControls();
  });
  recBtn.addEventListener('click', () => {
    if (!addPoint(S.alt)) { Sound.tick(); tip('이 높이는 이미 기록했어요. 다른 높이로 올려 보세요'); }
    syncControls();
  });
  let lastAutoTxt = '';
  function syncControls() {
    const hm = S.altMax;
    if (+sAlt.max !== hm) { sAlt.max = hm; sAlt.step = hm > 20 ? 0.5 : 0.1; sliderB.refresh(); }
    const txt = S.auto ? '⏸ 멈추기' : S.altT >= hm - 0.05 ? '⬇ 내려오기' : '🎈 올라가기';
    if (txt !== lastAutoTxt) { autoBtn.textContent = txt; lastAutoTxt = txt; }
    autoBtn.classList.toggle('on-state', S.auto);
    recBtn.classList.toggle('is-off', S.lv >= 1);
  }
  function setAlt(h, instant) {
    S.altT = clamp(h, 0, S.altMax); S.auto = false;
    if (instant) S.alt = S.altT;
    sliderB.set(S.altT); syncControls();
  }

  /* ---------- 갱신 ---------- */
  let txtCache = {};
  function setTxt(id, html) { if (txtCache[id] !== html) { txtCache[id] = html; $('#' + id).innerHTML = html; } }
  function update(dt, t) {
    S.hMax = approach(S.hMax, S.hMaxT, dt, 3.4);
    if (Math.abs(S.hMax - S.hMaxT) < 0.01) S.hMax = S.hMaxT;
    if (S.altT > S.altMax) S.altT = S.altMax;
    if (S.auto) {
      S.altT += S.dir * (S.altMax / 12) * dt;
      if (S.altT >= S.altMax) { S.altT = S.altMax; S.auto = false; S.dir = -1; syncControls(); }
      else if (S.altT <= 0) { S.altT = 0; S.auto = false; S.dir = 1; syncControls(); }
    }
    const prev = S.alt;
    S.alt = RM ? S.altT : approach(S.alt, S.altT, dt, S.auto ? 14 : 5);
    if (Math.abs(S.alt - S.altT) < 0.003) S.alt = S.altT;
    S.maxAlt = Math.max(S.maxAlt, S.alt);
    if (!sliderDown && Math.abs(+sAlt.value - S.altT) > 0.06) sliderB.set(S.altT);
    // 지나가는 높이에서 측정점 자동 기록 (2단계부터)
    if (S.lv >= 1 || S.free) {
      const a = Math.min(prev, S.alt) - 0.05, b = Math.max(prev, S.alt) + 0.05;
      SAMP.forEach((s) => { if (s >= a && s <= b && !S.pts.some((p) => Math.abs(p.h - s) < 0.15)) addPoint(s); });
    }
    // 기구가 터지는 높이
    if (prev < POP_H && S.alt >= POP_H) {
      S.popAt = nowS(); Sound.tone(300, 0.1, 'sawtooth', 0.08);
      views.forEach((V) => { const g = geo(V.L), ppk = (g.yBot - g.yTop) / S.hMax; V.P.burst((g.sx0 + g.sx1) / 2, g.yBot - POP_H * ppk - 20, { count: 16, colors: ['#ef4444', '#f87171', '#fecaca'], speed: 120, gravity: 120, size: 3 }); });
    }
    S.balloonK = approach(S.balloonK, S.alt < POP_H ? 1 : 0, dt, 7);
    // 권역 띠가 하나씩 나타나기
    if (has('bands') && !S.bandsOn) { S.bandsOn = true; S.bandT0 = nowS(); }
    if (!has('bands') && S.bandsOn) S.bandsOn = false;
    if (S.bandsOn) S.seen.add(bandOf(S.alt));
    // 유성
    if (S.bandsOn) {
      S.nextMeteor -= dt;
      if (S.nextMeteor <= 0) {
        S.nextMeteor = 1.6 + Math.random() * 2.2;
        S.meteors.push({ u: 0.25 + Math.random() * 0.7, h: 70 + Math.random() * 12, vu: -0.35 - Math.random() * 0.2, vh: -14 - Math.random() * 6, age: 0, life: 0.9 });
      }
    }
    for (let i = S.meteors.length - 1; i >= 0; i--) { const m = S.meteors[i]; m.age += dt; m.u += m.vu * dt; m.h += m.vh * dt; if (m.age > m.life) S.meteors.splice(i, 1); }
    S.clouds.forEach((c) => { c.u += c.v * dt; if (c.u > 1.15) c.u = -0.15; if (c.u < -0.15) c.u = 1.15; });
    S.plane += dt * 0.05; if (S.plane > 1.25) S.plane = -0.25;
    tags.enabled = S.lv === 2 && !S.free;
    tags.update(dt);
    views.forEach((V) => V.P.update(dt));
    // 읽기창
    const T = Tat(S.alt);
    setTxt('rH', S.alt.toFixed(1) + '<small>km</small>');
    setTxt('rT', Math.round(T) + '<small>°C</small>');
    setTxt('rV', S.alt >= POP_H ? '터짐<small>(30 km 위)</small>' : volOf(S.alt).toFixed(1) + '<small>배</small>');
  }

  /* ---------- 그리기 ---------- */
  const SKY = [[0, '#9bd6ff'], [4, '#6bb8f5'], [11, '#3b82d6'], [20, '#2a4fa8'], [35, '#1c2f77'], [50, '#131c4f'], [80, '#0a0f33'], [100, '#04061a']];
  function skyAt(h) {
    for (let i = 1; i < SKY.length; i++) if (h <= SKY[i][0]) return mixc(SKY[i - 1][1], SKY[i][1], (h - SKY[i - 1][0]) / (SKY[i][0] - SKY[i - 1][0]));
    return SKY[SKY.length - 1][1];
  }
  function drawCloud(ctx, x, y, w, a) {
    ctx.save(); ctx.globalAlpha = a;
    const puffs = [[-0.28, 0.05, 0.22], [-0.08, -0.1, 0.28], [0.16, -0.04, 0.26], [0.34, 0.07, 0.18], [0.05, 0.08, 0.26]];
    ctx.fillStyle = 'rgba(120,150,190,.35)';
    puffs.forEach((p) => { circle(ctx, x + p[0] * w, y + p[1] * w + w * 0.05, p[2] * w); ctx.fill(); });
    puffs.forEach((p) => {
      const g = ctx.createRadialGradient(x + p[0] * w - p[2] * w * 0.3, y + p[1] * w - p[2] * w * 0.4, 1, x + p[0] * w, y + p[1] * w, p[2] * w);
      g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#e3edf8');
      ctx.fillStyle = g; circle(ctx, x + p[0] * w, y + p[1] * w, p[2] * w); ctx.fill();
    });
    ctx.restore();
  }
  function drawPlane(ctx, x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s / 26, s / 26);
    const g = ctx.createLinearGradient(-60, 0, -14, 0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,255,255,.55)');
    ctx.fillStyle = g; ctx.fillRect(-60, -1.2, 46, 2.4);
    ctx.fillStyle = '#f1f5f9'; ctx.beginPath(); ctx.ellipse(0, 0, 17, 4.2, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#cbd5e1'; ctx.beginPath(); ctx.moveTo(-3, 1); ctx.lineTo(-11, 11); ctx.lineTo(-6, 11); ctx.lineTo(5, 1); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#94a3b8'; ctx.beginPath(); ctx.moveTo(-13, -1); ctx.lineTo(-18, -9); ctx.lineTo(-13, -9); ctx.lineTo(-8, -1); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#38bdf8'; ctx.beginPath(); ctx.ellipse(11, -1, 3.4, 1.4, 0, 0, TAU); ctx.fill();
    ctx.restore();
  }
  function drawBalloon(ctx, x, y, r, k, t) {
    // (x, y): 아래 매달린 상자 위치
    ctx.save();
    const cy = y - 16 - r * k;
    ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(x, y - 6); ctx.lineTo(x, cy + r * k * 0.95); ctx.stroke();
    // 풍선
    const rx = r * k * 0.88, ry = r * k;
    const g = ctx.createRadialGradient(x - rx * 0.35, cy - ry * 0.4, ry * 0.1, x, cy, ry * 1.05);
    g.addColorStop(0, '#fecaca'); g.addColorStop(0.5, '#ef4444'); g.addColorStop(1, '#991b1b');
    ctx.shadowColor = 'rgba(0,0,0,.3)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 3;
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, cy, rx, ry, 0, 0, TAU); ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.ellipse(x - rx * 0.35, cy - ry * 0.45, rx * 0.22, ry * 0.12, -0.6, 0, TAU); ctx.fill();
    ctx.restore();
    // 상자(라디오존데)
    ctx.save(); ctx.fillStyle = '#f8fafc'; roundRect(ctx, x - 6, y - 7, 12, 11, 2); ctx.fill();
    ctx.fillStyle = '#0ea5e9'; ctx.fillRect(x - 4, y - 4, 8, 3);
    ctx.strokeStyle = '#f8fafc'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x + 4, y - 7); ctx.lineTo(x + 8, y - 13); ctx.stroke();
    ctx.restore();
  }
  function drawRocket(ctx, x, y, s, t) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    const f = 10 + Math.sin(t * 30) * 3;
    const g = ctx.createLinearGradient(0, 4, 0, 4 + f); g.addColorStop(0, '#fde047'); g.addColorStop(1, 'rgba(249,115,22,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-3.5, 4); ctx.lineTo(0, 4 + f); ctx.lineTo(3.5, 4); ctx.fill();
    ctx.fillStyle = '#e2e8f0'; roundRect(ctx, -4.5, -16, 9, 21, 3); ctx.fill();
    ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.moveTo(-4.5, -13); ctx.quadraticCurveTo(0, -26, 4.5, -13); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#38bdf8'; circle(ctx, 0, -6, 2.2); ctx.fill();
    ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.moveTo(-4.5, 1); ctx.lineTo(-9, 7); ctx.lineTo(-4.5, 5); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(4.5, 1); ctx.lineTo(9, 7); ctx.lineTo(4.5, 5); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  function draw(V, t) {
    const { ctx, L, D } = V, G = geo(L), fs = L.fs;
    V.v.clear(FRAME);
    const hm = S.hMax, ppk = (G.yBot - G.yTop) / hm;
    const yOf = (h) => G.yBot - h * ppk;
    const xOf = (T) => G.gx0 + (T + 100) / 130 * (G.gx1 - G.gx0);
    const scW = G.sx1 - G.sx0, cx = (G.sx0 + G.sx1) / 2;
    const bandA = (i) => (S.bandsOn ? clamp((nowS() - S.bandT0 - 0.4 * i) / 0.8, 0, 1) : 0);
    const yClip0 = G.yTop - 14, yClip1 = G.yBot + 26;

    /* ===== 장면(왼쪽): 하늘 ===== */
    ctx.save();
    roundRect(ctx, G.sx0, yClip0, scW, yClip1 - yClip0, 14); ctx.clip();
    const sg = ctx.createLinearGradient(0, G.yBot, 0, G.yTop);
    [0, 4, 11, 20, 35, 50, 80, 100].forEach((h) => { if (h < hm) sg.addColorStop(h / hm, skyAt(h)); });
    sg.addColorStop(1, skyAt(hm));
    ctx.fillStyle = skyAt(hm); ctx.fillRect(G.sx0, yClip0, scW, yClip1 - yClip0);
    ctx.fillStyle = sg; ctx.fillRect(G.sx0, G.yTop, scW, G.yBot - G.yTop + 2);
    // 별
    S.stars.forEach((s) => {
      const h = (1 - s.v) * hm; const a = smooth(28, 60, h) * (0.5 + 0.5 * Math.sin(t * 2 + s.ph));
      if (a < 0.03) return;
      ctx.fillStyle = 'rgba(255,255,255,' + a.toFixed(3) + ')'; circle(ctx, G.sx0 + s.u * scW, G.yTop + s.v * (G.yBot - G.yTop), s.s * 0.9); ctx.fill();
    });
    // 권역 색 띠
    LAYER.forEach((l, i) => {
      const a = bandA(i); if (a <= 0) return;
      const y0 = Math.max(G.yTop, yOf(BOUND[i + 1])), y1 = Math.min(G.yBot, yOf(BOUND[i]));
      ctx.fillStyle = rgba(l.col, a * (S.sel === i ? 0.34 : 0.17)); ctx.fillRect(G.sx0, y0, scW, y1 - y0);
    });
    // 오존층(약 20~30 km)
    if (bandA(1) > 0 && 20 < hm) {
      const y0 = yOf(30), y1 = yOf(20), a = bandA(1);
      const og = ctx.createLinearGradient(0, y0, 0, y1);
      og.addColorStop(0, 'rgba(110,231,183,0)'); og.addColorStop(0.5, 'rgba(110,231,183,' + (0.5 * a) + ')'); og.addColorStop(1, 'rgba(110,231,183,0)');
      ctx.fillStyle = og; ctx.fillRect(G.sx0, y0, scW, y1 - y0);
      ctx.fillStyle = 'rgba(167,243,208,' + (0.35 * a) + ')';
      for (let i = 0; i < 14; i++) { const px = G.sx0 + ((i * 53 + t * 18) % scW); circle(ctx, px, (y0 + y1) / 2 + Math.sin(t * 2 + i) * 4, 1.6); ctx.fill(); }
      D.text(G.sx1 - 8, (y0 + y1) / 2 + 4, '오존층', { size: 13 * fs, color: '#d1fae5', align: 'right', stroke: 'rgba(6,40,30,.7)' });
    }
    // 오로라(열권)
    if (bandA(3) > 0) {
      const a = bandA(3);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 5; k++) {
        const bx = G.sx0 + scW * (0.1 + k * 0.2), top = G.yTop + 2, hh = Math.min(70 * fs, 16 * ppk + 24);
        const ag = ctx.createLinearGradient(0, top, 0, top + hh);
        const cg = k % 2 ? '74,222,128' : '45,212,191';
        ag.addColorStop(0, 'rgba(' + cg + ',0)'); ag.addColorStop(0.25, 'rgba(' + cg + ',' + (0.42 * a) + ')'); ag.addColorStop(1, 'rgba(' + cg + ',0)');
        ctx.fillStyle = ag; ctx.beginPath(); ctx.moveTo(bx - 34, top);
        for (let i = 0; i <= 8; i++) ctx.lineTo(bx - 34 + i * 8.5, top + Math.sin(t * 1.4 + i * 0.7 + k) * 5);
        ctx.lineTo(bx + 34, top + hh); ctx.lineTo(bx - 34, top + hh); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
      // 인공위성
      const sx = G.sx0 + scW * (0.72 + 0.04 * Math.sin(t * 0.5)), sy = yOf(Math.min(92, hm - 4)) + 6;
      ctx.save(); ctx.globalAlpha = a; ctx.translate(sx, sy); ctx.rotate(0.3);
      ctx.fillStyle = '#cbd5e1'; roundRect(ctx, -5, -4, 10, 8, 2); ctx.fill();
      ctx.fillStyle = '#3b82f6'; ctx.fillRect(-17, -2.5, 10, 5); ctx.fillRect(7, -2.5, 10, 5);
      ctx.restore();
    }
    // 유성
    S.meteors.forEach((m) => {
      const a = Math.sin(clamp(m.age / m.life, 0, 1) * Math.PI);
      const x = G.sx0 + m.u * scW, y = yOf(m.h);
      if (m.h > hm) return;
      const dx = -m.vu * scW * 0.5, dy = -m.vh * ppk * 0.5;
      const mg = ctx.createLinearGradient(x, y, x + dx, y + dy);
      mg.addColorStop(0, 'rgba(255,255,255,' + a + ')'); mg.addColorStop(1, 'rgba(255,200,120,0)');
      ctx.strokeStyle = mg; ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + dx, y + dy); ctx.stroke();
      D.glow(x, y, 7, '#fff1c2', 0.8 * a);
    });
    // 구름·비 (대류권)
    const cs = clamp(ppk / 9, 0.55, 1.15);
    S.clouds.forEach((c, i) => {
      if (c.h > hm - 0.5) return;
      const x = G.sx0 + c.u * scW, y = yOf(c.h), w = 64 * c.s * cs * fs;
      if (i === 1 && c.h < hm) {
        ctx.strokeStyle = 'rgba(147,197,253,.75)'; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
        const gy = G.yBot - 2, top = y + w * 0.18, len = Math.max(0, gy - top);
        S.rain.forEach((r, k) => {
          const ph = (t * 0.9 + r.o * 2) % 1, yy = top + ph * len, xx = x + (r.k - 0.5) * w * 0.8 - ph * 6;
          if (len > 8) { ctx.beginPath(); ctx.moveTo(xx, yy); ctx.lineTo(xx - 2, Math.min(gy, yy + 8)); ctx.stroke(); }
        });
      }
      drawCloud(ctx, x, y, w, 0.95);
    });
    // 비행기 (약 10.5 km)
    if (10.5 < hm - 0.3) drawPlane(ctx, G.sx0 + S.plane * scW, yOf(10.5), clamp(ppk * 0.9, 13, 28) * fs);
    // 땅
    {
      const gy = G.yBot;
      const gg = ctx.createLinearGradient(0, gy - 4, 0, yClip1); gg.addColorStop(0, '#5cb85c'); gg.addColorStop(1, '#2e7d4a');
      ctx.fillStyle = gg; ctx.beginPath(); ctx.moveTo(G.sx0, yClip1); ctx.lineTo(G.sx0, gy + 2);
      for (let i = 0; i <= 12; i++) ctx.lineTo(G.sx0 + scW * i / 12, gy - 2 + Math.sin(i * 1.3) * 3 + 2);
      ctx.lineTo(G.sx1, yClip1); ctx.closePath(); ctx.fill();
      const hx = G.sx0 + scW * 0.18;
      ctx.fillStyle = '#fef3c7'; ctx.fillRect(hx - 12, gy - 14, 24, 14);
      ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.moveTo(hx - 15, gy - 14); ctx.lineTo(hx, gy - 26); ctx.lineTo(hx + 15, gy - 14); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#92400e'; ctx.fillRect(hx - 3, gy - 8, 6, 8);
      ctx.fillStyle = '#16a34a'; const tx = G.sx0 + scW * 0.84; ctx.fillRect(tx - 2, gy - 12, 4, 12); circle(ctx, tx, gy - 18, 9); ctx.fill();
    }
    ctx.restore();

    /* ===== 축 · 눈금 ===== */
    const tickStep = [2, 5, 10, 20].find((s) => s * ppk >= 30 * fs) || 20;
    ctx.save();
    D.text(G.ax, G.yTop - 26 * fs, '높이(km)', { size: 13 * fs, color: '#cbd5f5', weight: 800 });
    for (let h = 0; h <= hm + 0.01; h += tickStep) {
      const y = yOf(h);
      D.text(G.ax, y + 4.5 * fs, String(h), { size: 13 * fs, color: '#dbe4ff' });
      ctx.strokeStyle = 'rgba(255,255,255,.28)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(G.ax + 14 * fs, y); ctx.lineTo(G.gx0 - 4, y); ctx.stroke();
    }
    ctx.restore();

    /* ===== 그래프 판 ===== */
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,.055)'; roundRect(ctx, G.gx0 - 6, yClip0, G.gx1 - G.gx0 + 12, yClip1 - yClip0, 14); ctx.fill();
    ctx.beginPath(); ctx.rect(G.gx0 - 6, G.yTop - 12, G.gx1 - G.gx0 + 12, G.yBot - G.yTop + 24); ctx.clip();
    // 권역 띠
    LAYER.forEach((l, i) => {
      const a = bandA(i); if (a <= 0) return;
      const y0 = Math.max(G.yTop, yOf(BOUND[i + 1])), y1 = Math.min(G.yBot, yOf(BOUND[i]));
      ctx.fillStyle = rgba(l.col, a * (S.sel === i ? 0.3 : 0.16)); ctx.fillRect(G.gx0 - 6, y0, G.gx1 - G.gx0 + 12, y1 - y0);
    });
    // 격자
    ctx.strokeStyle = 'rgba(255,255,255,.1)'; ctx.lineWidth = 1;
    for (let h = 0; h <= hm + 0.01; h += tickStep) { const y = yOf(h); ctx.beginPath(); ctx.moveTo(G.gx0 - 6, y); ctx.lineTo(G.gx1 + 6, y); ctx.stroke(); }
    for (let T = -100; T <= 30; T += 20) { const x = xOf(T); ctx.beginPath(); ctx.moveTo(x, G.yTop - 12); ctx.lineTo(x, G.yBot + 12); ctx.stroke(); }
    // 0 °C
    D.dashedLine(xOf(0), G.yTop - 12, xOf(0), G.yBot + 12, { color: 'rgba(125,211,252,.6)', width: 1.6 });
    // 권역 경계선
    [11, 50, 80].forEach((h, i) => {
      const a = bandA(i + 1); if (a <= 0 || h > hm) return;
      D.dashedLine(G.sx0, yOf(h), G.gx1 + 6, yOf(h), { color: 'rgba(255,255,255,' + 0.7 * a + ')', width: 1.8, offset: t * 12 });
    });
    ctx.restore();
    // 가로축 눈금
    ctx.save();
    for (let T = -100; T <= 20; T += 20) D.text(xOf(T), G.tickY + 4, String(T), { size: 12.5 * fs, color: '#dbe4ff' });
    D.text(G.gx1 - 4, G.yTop - 20, '기온 (°C) →', { size: 13.5 * fs, color: '#cbd5f5', align: 'right', weight: 800 });
    ctx.restore();

    /* ===== 측정 경로(점선)와 곡선 ===== */
    ctx.save();
    ctx.beginPath(); ctx.rect(G.gx0 - 6, G.yTop - 12, G.gx1 - G.gx0 + 12, G.yBot - G.yTop + 24); ctx.clip();
    if (S.maxAlt > 0.05 && (S.lv >= 1 || S.free)) {
      ctx.strokeStyle = 'rgba(251,191,36,.38)'; ctx.lineWidth = 2; ctx.setLineDash([3, 5]);
      ctx.beginPath(); ctx.moveTo(xOf(Tat(0)), yOf(0));
      PROF.forEach((p) => { if (p[0] > 0 && p[0] < S.maxAlt) ctx.lineTo(xOf(p[1]), yOf(p[0])); });
      ctx.lineTo(xOf(Tat(Math.min(S.maxAlt, 100))), yOf(Math.min(S.maxAlt, 100)));
      ctx.stroke(); ctx.setLineDash([]);
    }
    const landed = S.pts.filter((p) => nowS() - p.born > 0.45);
    if (landed.length > 1) {
      ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 3.4; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.shadowColor = 'rgba(251,191,36,.6)'; ctx.shadowBlur = 8;
      ctx.beginPath(); landed.forEach((p, i) => { const x = xOf(p.T), y = yOf(p.h); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke();
      ctx.shadowBlur = 0;
    }
    ctx.restore();

    /* ===== 점(측정값)과 기록 날아가기 ===== */
    const pr = G.sx0 + scW / 2;
    S.pts.forEach((p) => {
      const age = nowS() - p.born, e = clamp(age / 0.45, 0, 1), ee = EZ.outCubic(e);
      const tx = xOf(p.T), ty = yOf(p.h);
      const ox = pr + 10, oy = yOf(p.oh);
      const x = lerp(ox, tx, ee), y = lerp(oy, ty, ee) - Math.sin(e * Math.PI) * 24;
      const col = nameShownBand(p.h) ? LAYER[bandOf(p.h)].col : '#fbbf24';
      D.sphere(x, y, (6.5 + (1 - e) * 3) * (fs > 1 ? 1.1 : 1), col, { outline: '#fff', outlineWidth: 2, gloss: false });
      if (age >= 0.45 && age < 1.1) {
        const k = (age - 0.45) / 0.65; ctx.strokeStyle = 'rgba(255,255,255,' + 0.7 * (1 - k) + ')'; ctx.lineWidth = 2; circle(ctx, tx, ty, 8 + 16 * k); ctx.stroke();
      }
      if (S.lv === 0 && !S.free && e >= 1) {
        const left = tx > xOf(-20);
        pill(ctx, p.h + ' km · ' + Math.round(p.T) + ' °C', left ? tx - 12 : tx + 12, ty, { align: left ? 'right' : 'left', bg: 'rgba(15,23,42,.88)', h: 22 * fs, font: fnt(L, 12.5, 'bold'), pad: 8 });
      }
    });
    function nameShownBand(h) { return S.bandsOn && bandA(bandOf(h)) > 0.5; }

    /* ===== 꺾이는 점 ===== */
    KINK.forEach((k, i) => {
      const p = S.pts.find((q) => Math.abs(q.h - k.h) < 0.2);
      if (!p || nowS() - p.born < 0.5) return;
      const x = xOf(p.T), y = yOf(p.h);
      if (S.kinks.has(i)) {
        D.check(x, y, 11 * fs, 1, { color: '#16a34a' });
        pill(ctx, '꺾이는 점 ' + k.i, x + (p.T > -30 ? -18 : 18), y - 16 * fs, { align: p.T > -30 ? 'right' : 'left', bg: '#16a34a', h: 22 * fs, font: fnt(L, 12.5, 'bold'), pad: 8 });
      } else if (S.kinkOn) {
        D.ring(x, y, 15 * fs, t, { color: '#fde047', speed: 1.1 });
      }
    });

    /* ===== 권역 이름 (그래프 오른쪽) ===== */
    LAYER.forEach((l, i) => {
      const a = bandA(i); if (a <= 0 || !nameShown(i)) return;
      const y0 = Math.max(G.yTop, yOf(BOUND[i + 1])), y1 = Math.min(G.yBot, yOf(BOUND[i]));
      ctx.save(); ctx.globalAlpha = a;
      D.text(G.gx1 - 12, (y0 + y1) / 2 + 6 * fs, l.name, { size: 19 * fs, color: shade(l.col, 0.45), align: 'right', weight: 800, stroke: 'rgba(5,10,30,.65)', strokeWidth: 4 });
      ctx.restore();
    });
    // 경계 높이 표시
    [11, 50, 80].forEach((h, i) => {
      const a = bandA(i + 1); if (a <= 0 || h > hm) return;
      pill(ctx, '약 ' + h + ' km', G.gx1 - 4, yOf(h), { align: 'right', bg: 'rgba(15,23,42,.8)', h: 20 * fs, font: fnt(L, 12, 'bold'), pad: 7, alpha: a });
    });

    /* ===== 기구(탐사체) ===== */
    const ay = yOf(S.alt), sway = Math.sin(t * 1.1) * 3 + Math.sin(S.alt * 0.25) * 9 * (S.alt > 0.3 ? 1 : 0);
    const bx = pr + sway;
    const r0 = clamp(320 / hm, 7, 15) * fs;
    const vol = volOf(Math.min(S.alt, POP_H - 0.001));
    ctx.save();
    ctx.beginPath(); ctx.rect(G.sx0, yClip0, scW, yClip1 - yClip0); ctx.clip();
    // 전파(데이터 송신)
    const py = ay - 5;
    for (let i = 0; i < 2; i++) {
      const k = ((t * 0.9) + i * 0.5) % 1;
      ctx.strokeStyle = 'rgba(255,255,255,' + (0.5 * (1 - k)) + ')'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.arc(bx, py, 6 + k * 22 * fs, -0.9, 0.9); ctx.stroke();
    }
    if (S.balloonK > 0.02) drawBalloon(ctx, bx, py, r0 * Math.cbrt(vol), S.balloonK, t);
    if (S.balloonK < 0.98) { ctx.save(); ctx.globalAlpha = 1 - S.balloonK; drawRocket(ctx, bx, py - 12, 0.9 * fs, t); ctx.restore(); }
    ctx.restore();
    // 기구 높이에서 그래프로 이어지는 점선
    const lx = xOf(Tat(S.alt));
    ctx.save();
    ctx.beginPath(); ctx.rect(G.sx1 - 2, G.yTop - 12, G.gx1 - G.sx1 + 10, G.yBot - G.yTop + 24); ctx.clip();
    D.dashedLine(bx + 12, ay, lx, ay, { color: 'rgba(255,255,255,.55)', width: 1.6, offset: -t * 20 });
    ctx.restore();
    D.glow(lx, ay, 20 * fs, '#fde047', 0.55);
    D.sphere(lx, ay, 7 * fs, '#fff7b0', { outline: '#f59e0b', outlineWidth: 2.4, gloss: false });
    {
      const T = Math.round(Tat(S.alt)), right = lx < xOf(-30);
      pill(ctx, T + ' °C', lx + (right ? 16 : -16), ay - 16 * fs, { align: right ? 'left' : 'right', bg: '#f59e0b', color: '#1f1300', h: 22 * fs, font: fnt(L, 13, '800'), pad: 8 });
    }

    /* ===== 이름표와 빈 칸 ===== */
    if (S.lv >= 2 || S.free) {
      layoutTags(V);
      LAYER.forEach((l, i) => {
        const s = tags.slots[i]; if (!s) return;
        const a = bandA(i);
        if (!tags.items.some((it) => it.slot === i) && a > 0.3 && S.lv === 2 && !S.free) {
          ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.setLineDash([6, 5]); ctx.lineWidth = 2;
          roundRect(ctx, s.x, s.y, s.w, s.h, 10); ctx.stroke(); ctx.setLineDash([]);
          D.text(s.x + s.w / 2, s.y + s.h / 2 + 5 * fs, '?', { size: 17 * fs, color: 'rgba(255,255,255,.85)', weight: 800 });
          ctx.restore();
        }
        if (tags.items.every((it) => it.slot == null) && i === 0 && S.lv === 2 && !S.free && a > 0.9) D.ring(s.x + s.w / 2, s.y + s.h / 2, 24, t, { color: '#fde047' });
      });
      tags.draw(V);
    }

    /* ===== 안내 막대 ===== */
    {
      const I = G.info;
      ctx.save();
      const bi = S.bandsOn ? (S.sel >= 0 ? S.sel : bandOf(S.alt)) : -1;
      ctx.fillStyle = 'rgba(8,14,38,.88)'; roundRect(ctx, I.x, I.y, I.w, I.h, 12); ctx.fill();
      ctx.strokeStyle = bi >= 0 ? LAYER[bi].col : 'rgba(255,255,255,.18)'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#e6edff'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      ctx.font = fnt(L, 14.2, '600');
      let txt;
      if (bi >= 0) txt = (nameShown(bi) ? LAYER[bi].name : '이 구간') + '(' + LAYER[bi].range + '): ' + LAYER[bi].info;
      else if (S.lv === 0) txt = '🎈 기구를 끌어 올리거나 슬라이더를 움직여 높이를 바꾸고, 📍 기온 기록하기를 눌러요.';
      else txt = '🎈 올라가기를 누르거나 기구를 끌어 올려요. 지나가는 높이마다 측정점이 찍혀요.';
      if (bi >= 0) { ctx.fillStyle = LAYER[bi].col; roundRect(ctx, I.x + 8, I.y + 8, 6, I.h - 16, 3); ctx.fill(); ctx.fillStyle = '#e6edff'; }
      const maxL = L.w ? 2 : 3, lh = 18.5 * fs, tx0 = I.x + (bi >= 0 ? 24 : 16);
      const n = Math.min(maxL, wrapLines(ctx, txt, I.w - (tx0 - I.x) - 14).length);
      drawWrapped(ctx, txt, tx0, I.y + I.h / 2 - (n - 1) * lh / 2 + 5 * fs, I.w - (tx0 - I.x) - 14, lh, maxL);
      ctx.restore();
      drawTip(V, I.y - 22);
    }
    V.P.draw(ctx);
    if (game && game.isNew('bands')) { newRing(ctx, G.sx0, yClip0, G.gx1 - G.sx0 + 6, yClip1 - yClip0); }
  }

  /* ---------- 입력 ---------- */
  function altFromY(V, y) { const G = geo(V.L); return clamp((G.yBot - y) / (G.yBot - G.yTop) * S.hMax, 0, S.altMax); }
  views.forEach((V) => {
    SciSim.pointer(V.v, {
      hover(p) {
        const G = geo(V.L);
        if (tags.enabled && tags.itemAt(p)) return 'grab';
        if (p.x < G.gx0 - 10 && p.y > G.yTop - 14 && p.y < G.yBot + 26) return 'ns-resize';
        return null;
      },
      down(p) {
        const G = geo(V.L);
        layoutTags(V);
        if (tags.enabled && tags.down(p)) { V.drag = 'tag'; return true; }
        if (tags.enabled && tags.sel) return false;
        // 꺾이는 점 누르기
        if (S.lv >= 1 || S.free) {
          const hm = S.hMax, ppk = (G.yBot - G.yTop) / hm;
          for (let i = 0; i < KINK.length; i++) {
            const k = KINK[i], x = G.gx0 + (Tat(k.h) + 100) / 130 * (G.gx1 - G.gx0), y = G.yBot - k.h * ppk;
            if (Math.hypot(p.x - x, p.y - y) < 26 * V.L.fs && S.pts.some((q) => Math.abs(q.h - k.h) < 0.2)) {
              if (!S.kinks.has(i)) { S.kinks.add(i); Sound.success(); const x2 = x; V.P.burst(x2, y, { count: 14, colors: ['#fde047', '#16a34a', '#fff'], speed: 130, size: 3 }); }
              return false;
            }
          }
        }
        // 그래프 판 누르기 → 권역 고르기
        if (S.bandsOn && p.x >= G.gx0 - 6 && p.x <= G.gx1 + 6 && p.y > G.yTop - 12 && p.y < G.yBot + 12) {
          const h = altFromY(V, p.y) ; const b = bandOf(clamp((G.yBot - p.y) / (G.yBot - G.yTop) * S.hMax, 0, 100));
          S.sel = S.sel === b ? -1 : b; S.seen.add(b); Sound.tick(); return false;
        }
        // 하늘 장면: 기구 끌기
        if (p.x < G.gx0 - 10 && p.y > G.yTop - 16 && p.y < G.yBot + 26) {
          V.drag = 'sky'; S.auto = false; S.sel = -1; setAlt(altFromY(V, p.y)); return true;
        }
        return false;
      },
      move(p) {
        if (V.drag === 'tag') tags.move(p);
        else if (V.drag === 'sky') setAlt(altFromY(V, p.y));
      },
      up(p) {
        if (V.drag === 'tag') tags.up(p);
        V.drag = null;
      },
    });
  });

  /* ---------- 단계 준비 ---------- */
  function resetTags() { tags.reset(); S.flagTag = new Set(); tags.items.forEach((it) => { it.bad = false; }); }
  function solveTags() { tags.items.forEach((it) => { it.slot = it.band; it.bad = false; }); }
  function stage(lv) {
    S.lv = lv; S.free = false; S.sel = -1; S.auto = false;
    S.hMaxT = lv === 0 ? 14 : 100; S.altMax = lv === 0 ? 12 : 100;
    if (lv === 0) { S.pts = []; S.maxAlt = 0; S.kinks = new Set(); S.kinkOn = false; setAlt(0); }
    if (lv === 1) { [0, 5, 11].forEach((h) => addPoint(h, true)); S.kinks = new Set(); S.kinkOn = false; if (S.altT < 11) setAlt(11); }
    if (lv >= 2) { fillAll(); S.kinks = new Set([0, 1, 2]); S.kinkOn = false; }
    if (lv === 2) { resetTags(); S.seen = new Set(); }
    if (lv >= 3) { solveTags(); S.seen = new Set([0, 1, 2, 3]); }
    syncControls();
  }

  /* ---------- 미션 ---------- */
  const REC3 = [{ h: 0, n: '지표(0 km)' }, { h: 5, n: '5 km' }, { h: 11, n: '11 km' }];
  game = SciSim.game({
    simId: 'm3-atmosphere',
    mount: '#game',
    badge: '기권 탐험가',
    homeHref: '../../index.html#g3',
    featureLabels: { alt: '🎈 관측 기구', rec: '📍 기온 기록', full: '📈 0~100 km 그래프', bands: '🌈 권역 색 띠' },
    onFeatures(set) { FEAT = set; syncControls(); },
    onMissionStart(m) { TIP.t0 = -99; if (S.lv !== m._level) stage(m._level); },
    onComplete() {
      S.free = true; S.lv = 3; S.hMaxT = 100; S.altMax = 100; fillAll(); solveTags(); S.kinks = new Set([0, 1, 2]); S.sel = -1; S.bandsOn = false; syncControls();
    },
    levels: [
      /* ---------- 1단계 · 관찰 ---------- */
      {
        title: '기온 측정: 높이 올라가면?', short: '기온 측정', icon: '🎈', phase: '관찰',
        features: ['alt', 'rec'],
        intro: '<p class="si-q">❓ 탐구 질문: 하늘 높이 올라갈수록 기온은 계속 낮아질까?</p>' +
          '<p>온도계를 단 <b>기상 관측 기구(라디오존데)</b>를 하늘로 띄워요. 높이를 바꾸며 그 높이의 <b>기온</b>을 읽고 기록해 봐요. 올라갈수록 기구가 <b>커지는 것</b>도 살펴보세요.</p>',
        setup() { stage(0); },
        recap: '대류권에서는 높이 올라갈수록 기온이 <b>낮아져요</b>. 지표 약 15 °C, 11 km에서는 약 −56 °C예요.',
        summary: '<ul><li><b>기상 관측 기구(라디오존데)</b>에 온도계를 달아 띄우면, 높이마다 기온을 알 수 있어요.</li>' +
          '<li>지표에서 약 11 km까지는 높이 올라갈수록 기온이 <b>낮아져요</b>(약 15 °C → −56 °C). 1 km 올라갈 때마다 약 6.5 °C씩 내려가요.</li>' +
          '<li>높이 올라갈수록 공기가 희박해져서(기압이 낮아져서) 관측 기구는 <b>점점 커져요</b>.</li></ul>',
        missions: [
          {
            title: '📍 세 곳에서 기온 기록하기',
            goal: '기구를 <b>지표(0 km)</b>, <b>5 km</b>, <b>11 km</b>까지 올리고, 각 높이에서 <b>📍 기온 기록하기</b>를 눌러요.',
            hint: '슬라이더를 움직이거나 기구를 손가락으로 끌어 올려요. 높이 숫자가 0.0, 5.0, 11.0 km에 가까울 때 눌러요.',
            check: () => REC3.every((r) => hasPt(r.h)),
            hold: 0.4,
            status: () => REC3.map((r) => chk(hasPt(r.h), r.n)).join(' · '),
            explain: '지표 약 <b>15 °C</b> → 5 km 약 <b>−17 °C</b> → 11 km 약 <b>−56 °C</b>. 높이 올라갈수록 기온이 점점 낮아져요.',
          },
          {
            type: 'quiz', title: '🌡️ 높이와 기온',
            goal: '0~11 km 사이에서 높이 올라갈수록 기온은 어떻게 변했나요?',
            choices: ['기온이 낮아진다', '태양에 가까워지니까 기온이 높아진다', '높이와 상관없이 기온이 일정하다', '5 km까지는 낮아지다가 그 위는 높아진다'],
            answer: 0,
            feedback: [
              '',
              '높이 올라가도 태양까지 거리는 거의 그대로예요(약 1억 5천만 km). 대류권의 공기는 <b>지표에서 데워지기</b> 때문에, 지표에서 멀어질수록 기온이 낮아져요.',
              '기록한 값을 다시 봐요. 15 °C → −17 °C → −56 °C로 계속 변했어요.',
              '기록한 세 점은 계속 내려가고 있어요. 5 km 위에서도 11 km까지 계속 낮아졌어요.',
            ],
            explain: '대류권에서는 높이 올라갈수록 기온이 <b>낮아져요</b>. 공기는 햇빛보다 <b>따뜻한 지표</b>에서 열을 받아 데워지기 때문이에요. 그럼 11 km보다 더 높은 곳은 어떨까요? 다음 단계에서 알아봐요!',
          },
        ],
      },
      /* ---------- 2단계 · 기록 ---------- */
      {
        title: '높이–기온 그래프 그리기', short: '그래프 그리기', icon: '📈', phase: '기록',
        features: ['full'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 11 km 높이까지 기온이 계속 낮아지는 것을 봤어요.</div>' +
          '<p>이번에는 <b>100 km</b> 높이까지 올라가며 기온을 재요. 가로축은 <b>기온</b>, 세로축은 <b>높이</b>예요. 측정점을 이어 <b>높이–기온 그래프</b>를 완성해 봐요.</p>',
        setup() { stage(1); },
        recap: '높이–기온 그래프는 약 <b>11 km, 50 km, 80 km</b>에서 꺾여요. 기온 변화가 달라지는 곳이에요.',
        summary: '<ul><li>높이–기온 그래프에서 세로축은 <b>높이</b>, 가로축은 <b>기온</b>이에요.</li>' +
          '<li>기온은 계속 낮아지지 않아요. 약 <b>11 km, 50 km, 80 km</b>에서 그래프가 꺾여 <b>낮아짐 → 높아짐 → 낮아짐 → 높아짐</b>으로 바뀌어요.</li>' +
          '<li>관측 기구는 약 30 km까지 올라가요. 그 위는 관측 로켓과 인공위성으로 측정해요.</li></ul>',
        missions: [
          {
            title: '📈 측정점 11개 찍기',
            goal: '<b>🎈 올라가기</b>를 누르거나 기구를 끌어 <b>100 km</b>까지 올라가요. 지나가는 높이마다 측정점이 찍혀 <b>11개</b>가 되면 성공!',
            hint: '🎈 올라가기 버튼을 누르면 저절로 올라가면서 점이 찍혀요. 약 30 km 위에서는 기구가 터지고 관측 로켓이 이어서 재요.',
            check: () => sampleCount() >= SAMP.length,
            hold: 0.8,
            status: () => '찍은 측정점 ' + sampleCount() + ' / ' + SAMP.length + '개',
            explain: '측정점을 이으면 <b>높이–기온 그래프</b>가 돼요. 그래프가 한 방향으로 쭉 이어지지 않고 <b>여러 번 꺾이는 것</b>이 보이나요?',
          },
          {
            title: '🔍 꺾이는 점 3개 찾기',
            goal: '그래프의 선이 <b>방향을 바꾸며 꺾이는 점</b> 3곳을 눌러 보세요.',
            hint: '기온이 낮아지다가 높아지는 곳, 높아지다가 낮아지는 곳, 또 낮아지다가 높아지는 곳을 찾아요. 깜빡이는 고리를 눌러도 돼요.',
            setup() { S.kinks = new Set(); S.kinkOn = true; if (sampleCount() < SAMP.length) fillAll(false); },
            check: () => S.kinks.size >= 3,
            hold: 0.3,
            status: () => KINK.map((k, i) => chk(S.kinks.has(i), '꺾이는 점 ' + k.i)).join(' · '),
            explain: '그래프는 약 <b>11 km</b>(−56 °C), <b>50 km</b>(−2 °C), <b>80 km</b>(−90 °C)에서 꺾여요. 이 세 점을 경계로 기온이 변하는 모습이 달라져요.',
          },
          {
            type: 'quiz', title: '📊 그래프 읽기',
            goal: '11 km에서 50 km 사이 그래프를 읽어요. 이 구간에서 높이 올라갈수록 기온은 어떻게 변하나요?',
            setup() { S.kinkOn = false; if (sampleCount() < SAMP.length) fillAll(false); S.kinks = new Set([0, 1, 2]); },
            choices: ['낮아진다', '높아진다', '일정하다', '알 수 없다'],
            answer: 1,
            feedback: [
              '0~11 km 구간과 헷갈렸나 봐요. 11 km 점에서 50 km 점 쪽으로 선이 오른쪽(기온이 높은 쪽)으로 가고 있어요.',
              '',
              '선이 세로로 곧게 서 있지 않고 오른쪽으로 기울어 있어요. 기온이 변하고 있어요.',
              '그래프에서 읽을 수 있어요. 11 km(−56 °C)에서 50 km(−2 °C)로 기온이 올라갔어요.',
            ],
            explain: '11 km에서 50 km까지는 높이 올라갈수록 기온이 <b>높아져요</b>(약 −56 °C → −2 °C). 이 구간의 기온이 높아지는 까닭은 다음 단계에서 알아봐요.',
          },
        ],
      },
      /* ---------- 3단계 · 설명 ---------- */
      {
        title: '네 권역: 대류권부터 열권까지', short: '네 권역', icon: '🏷️', phase: '설명',
        features: ['bands'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 그래프가 11 km, 50 km, 80 km에서 꺾이는 것을 찾았어요.</div>' +
          '<p>기온 변화가 달라지는 <b>꺾이는 점</b>을 경계로 기권을 <b>4개의 권역</b>으로 나눠요. 색 띠가 나타나면 권역마다 이름표를 붙이고, 각 권역의 <b>특징</b>도 읽어 봐요.</p>',
        setup() { stage(2); },
        recap: '기권은 기온 변화를 기준으로 <b>대류권·성층권·중간권·열권</b> 4개 권역으로 나눠요.',
        summary: '<table class="cmp"><tr><th>권역</th><th>높이</th><th>기온 변화</th><th>특징</th></tr>' +
          '<tr><td><b>대류권</b></td><td>지표~약 11 km</td><td>높이 ↑ 기온 ↓</td><td>대류 활발, 수증기 있음 → 구름·비·눈</td></tr>' +
          '<tr><td><b>성층권</b></td><td>약 11~50 km</td><td>높이 ↑ 기온 ↑</td><td>오존층(약 20~30 km)이 자외선 흡수, 대류 없음 → 안정(비행기 항로)</td></tr>' +
          '<tr><td><b>중간권</b></td><td>약 50~80 km</td><td>높이 ↑ 기온 ↓</td><td>수증기 거의 없음 → 기상 현상 없음, 유성</td></tr>' +
          '<tr><td><b>열권</b></td><td>약 80 km 이상</td><td>높이 ↑ 기온 ↑↑</td><td>공기 매우 희박, 오로라, 인공위성</td></tr></table>',
        missions: [
          {
            title: '🏷️ 권역 이름표 붙이기', manual: true,
            goal: '꺾이는 점을 경계로 나눈 <b>네 구간</b>에 이름표 <b>대류권·성층권·중간권·열권</b>을 끌어다 놓아요. 다 놓았으면 <b>확인하기</b>를 눌러요.',
            hint: '지표 가까운 쪽부터 <b>대류권 → 성층권 → 중간권 → 열권</b> 순서예요. 이름표를 누른 뒤 빈 칸을 눌러도 붙어요.',
            setup() { resetTags(); },
            status: () => LAYER.map((l, i) => chk(tags.items.some((t) => t.slot === i), l.range.split('~')[0].replace('지표', '0 km'))).join(' · '),
            check() {
              const un = tags.items.filter((t) => t.slot == null);
              if (un.length) return '아직 붙이지 않은 이름표가 있어요: ' + un.map((t) => t.label).join(', ');
              const wrong = tags.items.filter((t) => t.slot !== t.band), now = new Set(wrong.map((t) => t.id));
              tags.items.forEach((t) => { t.bad = now.has(t.id); if (now.has(t.id) && !S.flagTag.has(t.id)) t.shake = nowS(); });
              S.flagTag = now;
              if (wrong.length) return '다시 생각해 볼 이름표가 있어요(' + wrong.map((t) => t.label).join(', ') + '). 지표에서 가까운 구간부터 순서대로 놓아 봐요.';
              return true;
            },
            explain: '지표에서부터 차례로 <b>대류권(약 11 km까지) → 성층권(약 50 km까지) → 중간권(약 80 km까지) → 열권</b>이에요.',
          },
          {
            title: '📖 권역의 특징 읽기',
            goal: '<b>🎈 올라가기</b>로 기구를 100 km까지 올리거나 그래프의 색 띠를 눌러서, <b>네 권역의 특징</b>을 모두 읽어요.',
            hint: '기구가 있는 권역의 설명이 아래 안내 막대에 나와요. 그래프의 색 띠를 눌러도 돼요.',
            setup() { S.seen = new Set(); S.sel = -1; },
            check: () => S.seen.size >= 4,
            hold: 0.5,
            status: () => LAYER.map((l, i) => chk(S.seen.has(i), l.name)).join(' · '),
            explain: '<b>대류권</b>에서만 구름·비·눈이 생기고, <b>성층권</b>에는 오존층이 있어요. <b>중간권</b>에서는 유성이, <b>열권</b>에서는 오로라가 보여요.',
          },
          {
            type: 'quiz', title: '☀️ 성층권은 왜 따뜻해질까?',
            goal: '성층권에서는 높이 올라갈수록 기온이 <b>높아져요</b>. 그 까닭은 무엇일까요?',
            choices: ['오존층이 태양의 자외선을 흡수하기 때문', '태양에 더 가까워지기 때문', '대류가 활발해서 지표의 열이 올라오기 때문', '구름이 열을 가두기 때문'],
            answer: 0,
            feedback: [
              '',
              '높이 몇십 km 올라가도 태양까지 거리는 거의 달라지지 않아요(약 1억 5천만 km). 이유는 따로 있어요.',
              '성층권은 대류가 거의 없고 안정한 층이에요. 대류권에서 위로 열이 올라오는 것이 아니에요.',
              '성층권에는 수증기가 거의 없어서 구름이 생기지 않아요.',
            ],
            explain: '성층권(약 20~30 km)에 있는 <b>오존층</b>이 태양의 <b>자외선</b>을 흡수하면서 열을 내요. 그래서 위로 갈수록 기온이 높아져요.',
          },
        ],
      },
      /* ---------- 4단계 · 적용 ---------- */
      {
        title: '권역마다 다른 모습', short: '적용', icon: '🏠', phase: '적용',
        features: [],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 기권의 네 권역과 특징을 배웠어요.</div>' +
          '<p>배운 내용으로 <b>비행기</b>, <b>구름과 비</b>, <b>유성과 오로라</b>가 어느 권역에서 일어나는지 설명해 봐요. 그림에서 기구를 움직이며 확인해도 좋아요.</p>',
        setup() { stage(3); },
        recap: '기상 현상은 <b>대류권</b>에서 일어나고, 유성은 <b>중간권</b>, 오로라는 <b>열권</b>에서 볼 수 있어요.',
        summary: '<ul><li>비행기는 구름 위쪽, 안정한 <b>성층권 아래쪽</b> 가까이를 날아요. 흔들림이 적어요.</li>' +
          '<li>구름·비·눈 같은 <b>기상 현상</b>은 대류가 있고 수증기가 많은 <b>대류권</b>에서만 일어나요.</li>' +
          '<li><b>유성</b>은 중간권에서, <b>오로라</b>와 인공위성은 <b>열권</b>에서 볼 수 있어요.</li>' +
          '<li>높이 올라간다고 태양에 가까워져 따뜻해지는 것이 아니에요. 권역마다 기온이 변하는 까닭이 달라요.</li></ul>',
        missions: [
          {
            type: 'quiz', title: '✈️ 비행기가 날아가는 곳',
            goal: '여객기는 대류권 위쪽, <b>성층권 아래쪽</b> 가까이(약 10~12 km)를 날아요. 그 까닭으로 알맞은 것은?',
            choices: ['공기가 안정해서 흔들림이 적고 날씨의 영향이 작기 때문', '위로 갈수록 기온이 계속 높아져 따뜻하기 때문', '태양에 가까워서 연료가 덜 들기 때문', '오로라를 보기 위해서'],
            answer: 0,
            feedback: [
              '',
              '성층권 아래쪽의 기온은 약 −56 °C로 아주 차가워요. 따뜻해서 날아가는 것이 아니에요.',
              '태양까지의 거리는 거의 달라지지 않아요. 날씨 변화와 관계가 있어요.',
              '오로라는 약 80 km 이상의 열권에서 보여요. 비행기는 그렇게 높이 날지 못해요.',
            ],
            explain: '구름이 생기는 <b>대류권</b> 위쪽은 날씨가 거칠지만, 그 위 <b>성층권</b>은 대류가 없어서 공기가 안정해요. 그래서 비행기가 흔들림이 적은 높이를 따라 날아요.',
          },
          {
            type: 'quiz', title: '☔ 구름과 비는 어디에서?',
            goal: '구름·비·눈 같은 기상 현상은 왜 <b>대류권</b>에서만 일어날까요?',
            choices: ['대류가 활발하고 수증기가 많기 때문', '기온이 가장 높은 권역이기 때문', '오존층이 있기 때문', '공기가 가장 희박하기 때문'],
            answer: 0,
            feedback: [
              '',
              '대류권은 높이 올라갈수록 기온이 낮아져요. 기온이 가장 높은 권역이라서가 아니에요.',
              '오존층은 성층권에 있고, 자외선을 흡수하는 일을 해요. 구름과는 관계가 없어요.',
              '공기가 가장 희박한 곳은 열권이에요. 대류권은 공기가 가장 많은 곳이에요.',
            ],
            explain: '대류권은 공기가 <b>위아래로 활발히 움직이고(대류)</b>, 지표에서 증발한 <b>수증기</b>가 있어서 구름·비·눈 같은 기상 현상이 일어나요.',
          },
          {
            type: 'quiz', title: '🌠 유성과 오로라',
            goal: '밤하늘의 <b>유성(별똥별)</b>과 <b>오로라</b>가 나타나는 권역을 차례로 고르면?',
            choices: ['중간권, 열권', '대류권, 성층권', '성층권, 중간권', '열권, 대류권'],
            answer: 0,
            feedback: [
              '',
              '대류권과 성층권에서는 유성이나 오로라가 보이지 않아요. 더 높은 곳을 찾아봐요.',
              '유성은 중간권이 맞아요. 하지만 오로라는 성층권이 아니라 더 높은 곳에서 나타나요.',
              '순서가 바뀌었고 오로라는 대류권에서 볼 수 없어요. 그림에서 오로라가 있는 곳을 찾아봐요.',
            ],
            explain: '우주에서 날아온 돌이 대기와 부딪혀 타는 <b>유성</b>은 <b>중간권</b>(약 50~80 km)에서 보여요. <b>오로라</b>는 <b>열권</b>(약 80 km 이상)에서 나타나요.',
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
    S, tags, SAMP, KINK, LAYER, Tat, game: () => game, view: activeView, setAlt, addPoint, fillAll, sampleCount,
    client(x, y) { const V = activeView(), r = V.v.canvas.getBoundingClientRect(); return { x: r.left + x * r.width / V.L.vw, y: r.top + y * r.height / V.L.vh }; },
    kinkClient(i) { const V = activeView(), G = geo(V.L), k = KINK[i], ppk = (G.yBot - G.yTop) / S.hMax; return this.client(G.gx0 + (Tat(k.h) + 100) / 130 * (G.gx1 - G.gx0), G.yBot - k.h * ppk); },
    tagClient(i) { const it = tags.get(i); return this.client(it.x, it.y); },
    slotClient(i) { const V = activeView(); layoutTags(V); const s = tags.slots[i]; return this.client(s.x + s.w / 2, s.y + s.h / 2); },
    skyClient(h) { const V = activeView(), G = geo(V.L); return this.client((G.sx0 + G.sx1) / 2, G.yBot - h * (G.yBot - G.yTop) / S.hMax); },
    bench(n) { const V = activeView(); const t0 = performance.now(); for (let i = 0; i < n; i++) { draw(V, nowS()); V.ctx.getImageData(0, 0, 1, 1); } return (performance.now() - t0) / n; },
  };
})();
