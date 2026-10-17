/* =========================================================
   중3 Ⅱ. 날씨와 기후변화 - 대기 대순환
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
        ctx.font = it.font || fnt(L, 15, 'bold'); ctx.fillText(it.label, 0, it.sub ? -8 * L.fs : 1);
        if (it.sub) { ctx.font = fnt(L, 12, '700'); ctx.fillStyle = 'rgba(255,255,255,.92)'; ctx.fillText(it.sub, 0, 11 * L.fs); }
        ctx.restore();
      });
    }
  }

  /* =========================================================
     [9과17-02] 대기 대순환 (탐구 흐름 4단계)
     ① 관찰: 손전등을 지구본에 비추어 위도별 단위 면적당 에너지, 위도별 흡수·방출 비교
     ② 모형: 북반구 단면의 세 순환(저위도·중위도·고위도) - 상승·하강 위치 표시
     ③ 탐구: 위도별 바람(무역풍·편서풍·극동풍) 카드를 위도 띠에 놓기
     ④ 적용: 저위도의 남는 열을 고위도로 운반(에너지 재분배), 우리나라 날씨의 서→동 이동
     범위: 북반구 기준. 전향력·지구가 자전하지 않는 경우는 다루지 않음(바람 방향은 관측 사실로 제시)
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

  /* ---------- 자료(단순화한 예시) ---------- */
  const Aenergy = (lat) => 25 + 100 * Math.pow(Math.cos(lat * DEG), 2);   // 흡수하는 태양 에너지(상대 값)
  const Eenergy = (lat) => 70 + 25 * Math.cos(lat * DEG);                   // 방출하는 지구 복사 에너지(상대 값)
  const CELLS = [
    { id: 'h', name: '저위도 순환', lat0: 0, lat1: 30, dir: 1, hf: 1.0 },
    { id: 'f', name: '중위도 순환', lat0: 30, lat1: 60, dir: -1, hf: 0.8 },
    { id: 'p', name: '고위도 순환', lat0: 60, lat1: 90, dir: 1, hf: 0.66 },
  ];
  const MARKS = [{ lat: 0, want: 'up', name: '적도(0°)' }, { lat: 30, want: 'down', name: '30°' }, { lat: 60, want: 'up', name: '60°' }, { lat: 90, want: 'down', name: '극(90°)' }];
  const WINDS = [
    { id: 'trade', band: 'low', label: '무역풍', sub: '북동풍', color: '#0ea5e9', dx: -0.7, dy: 0.7, lat: '0°~30°' },
    { id: 'west', band: 'mid', label: '편서풍', sub: '남서풍', color: '#8b5cf6', dx: 0.7, dy: -0.7, lat: '30°~60°' },
    { id: 'east', band: 'high', label: '극동풍', sub: '북동풍', color: '#f59e0b', dx: -0.7, dy: 0.7, lat: '60°~90°' },
  ];
  const BANDS = [{ id: 'low', name: '저위도', r: '0°~30°', c: '#38bdf8' }, { id: 'mid', name: '중위도', r: '30°~60°', c: '#a78bfa' }, { id: 'high', name: '고위도', r: '60°~90°', c: '#fbbf24' }];

  /* ---------- 상태 ---------- */
  const S = {
    lv: 0, free: false, scene: 'flash',
    lat: 0, latA: 0, visit: { lo: 0, mid: 0, hi: 0 }, seenLat: { lo: false, mid: false, hi: false },
    focus: 'all', marks: {}, markShake: {},
    circ: true, circA: 1, offT: 0, onT: 0, seenOff: false, seenOn: false, surp: [3, -2, -4], surpA: [3, -2, -4],
    parcels: [], packets: [], packAcc: 0, streaks: { low: [], mid: [], high: [] }, windOK: false, windA: 0,
  };
  { const r = rng(3); CELLS.forEach((c, ci) => { for (let i = 0; i < 34; i++) S.parcels.push({ c: ci, s: (i + r() * 0.5) / 34, j: (r() - 0.5) * 0.12 }); });
    ['low', 'mid', 'high'].forEach((b) => { for (let i = 0; i < 16; i++) S.streaks[b].push({ u: r(), v: r(), w: r(), sp: 0.8 + r() * 0.5 }); }); }
  const dnd = new DnD(WINDS.map((w) => ({ id: w.id, band: w.band, label: w.label, sub: w.sub, color: w.color, w: 124, h: 52 })));
  const slotBand = (it) => it.slot;
  let flagWind = new Set();
  const windSolved = () => dnd.items.every((it) => it.slot === it.band);

  /* ---------- 컨트롤 ---------- */
  const sLat = $('#sLat');
  const bLat = SciSim.bindRange(sLat, $('#oLat'), (v) => v + '°', (v) => { S.lat = +v; });
  $$('#focusSeg button').forEach((b) => b.addEventListener('click', () => { S.focus = b.dataset.f; Sound.click(); syncControls(); }));
  $$('#sceneSeg button').forEach((b) => b.addEventListener('click', () => { setScene(b.dataset.s); Sound.click(); }));
  $$('#circSeg button').forEach((b) => b.addEventListener('click', () => { S.circ = b.dataset.c === '1'; Sound.click(); syncControls(); }));
  function setScene(s) { S.scene = s; syncControls(); }
  function syncControls() {
    const sc = S.scene, lv = S.lv, free = S.free, l4 = lv >= 3 || free;
    const show = (id, on) => $(id).classList.toggle('is-off', !on);
    show('#cLat', sc === 'flash'); show('#cFocus', sc === 'cells');
    show('#cScene', l4 && (sc === 'role' || sc === 'sat')); show('#cCirc', sc === 'role' && l4);
    $$('#focusSeg button').forEach((b) => b.classList.toggle('on', b.dataset.f === S.focus));
    $$('#sceneSeg button').forEach((b) => b.classList.toggle('on', b.dataset.s === sc));
    $$('#circSeg button').forEach((b) => b.classList.toggle('on', (b.dataset.c === '1') === S.circ));
    $('#ctrlCard').classList.toggle('is-off', sc === 'wind');
  }

  /* ---------- 갱신 ---------- */
  const txtCache = {};
  function setTxt(id, html) { if (txtCache[id] !== html) { txtCache[id] = html; $('#' + id).innerHTML = html; } }
  const CYC = 9.5;
  function update(dt, t) {
    S.latA = approach(S.latA, S.lat, dt, 8);
    if (Math.abs(S.latA - S.lat) < 0.02) S.latA = S.lat;
    S.circA = approach(S.circA, S.circ ? 1 : 0, dt, 2.2);
    const tgt = S.circ ? [3, -2, -4] : [20, -12, -44];
    S.surpA = S.surpA.map((v, i) => approach(v, tgt[i], dt, 2.2));
    // 위도 방문 확인
    if (S.scene === 'flash') {
      const la = S.latA;
      S.visit.lo = la <= 10 ? S.visit.lo + dt : 0; S.visit.mid = la >= 38 && la <= 55 ? S.visit.mid + dt : 0; S.visit.hi = la >= 70 ? S.visit.hi + dt : 0;
      if (S.visit.lo > 0.5) S.seenLat.lo = true; if (S.visit.mid > 0.5) S.seenLat.mid = true; if (S.visit.hi > 0.5) S.seenLat.hi = true;
    }
    // 대순환 켜고 끄기 확인
    if (S.scene === 'role') {
      if (!S.circ && S.circA < 0.05 && Math.abs(S.surpA[2] + 44) < 4) S.offT += dt; else if (S.circ) S.offT = 0;
      if (S.offT > 1.4) S.seenOff = true;
      if (S.seenOff && S.circ && S.circA > 0.95) S.onT += dt; else S.onT = 0;
      if (S.onT > 1.2) S.seenOn = true;
    }
    // 공기 덩어리와 열 입자
    const sp = (S.scene === 'role' && !S.circ ? 0.15 : 1) * (S.scene === 'role' ? Math.max(0.1, S.circA) : 1);
    S.parcels.forEach((p) => { p.s += dt / CYC * sp; if (p.s > 1) p.s -= 1; });
    if (S.scene === 'role' && S.circA > 0.4) {
      S.packAcc += dt * S.circA;
      if (S.packAcc > 0.9) { S.packAcc = 0; S.packets.push({ u: 0 }); }
    }
    for (let i = S.packets.length - 1; i >= 0; i--) { S.packets[i].u += dt / 7.5 * (0.4 + 0.6 * S.circA); if (S.packets[i].u > 1) S.packets.splice(i, 1); }
    S.windA = approach(S.windA, S.scene === 'wind' && windSolved() ? 1 : 0, dt, 3);
    for (const b in S.streaks) S.streaks[b].forEach((q) => { q.u += dt * 0.5 * q.sp; if (q.u > 1) { q.u -= 1; q.v = Math.random(); q.w = Math.random(); } });
    dnd.enabled = S.scene === 'wind' && S.lv === 2 && !S.free;
    dnd.update(dt);
    views.forEach((V) => V.P.update(dt));
    const R = readouts();
    ['1', '2', '3'].forEach((i, k) => { setTxt('rL' + i, R[k][0]); setTxt('rV' + i, R[k][1]); });
  }
  const cosD = (lat) => Math.max(0.05, Math.cos(lat * DEG));
  function readouts() {
    const sc = S.scene;
    if (sc === 'flash') { const la = S.latA; return [['비추는 위도', Math.round(la) + '<small>°</small>'], ['빛이 퍼진 넓이', (1 / cosD(la)).toFixed(1) + '<small>배</small>'], ['단위 면적당 에너지', Math.round(cosD(la) * 100) + '<small>%</small>']]; }
    if (sc === 'cells') { const n = Object.values(S.marks).filter(Boolean).length; return [['표시한 위치', n + '<small>/ 4곳</small>'], ['상승 기류', '0°, 60°'], ['하강 기류', '30°, 90°']]; }
    if (sc === 'wind') { const n = dnd.items.filter((i) => i.slot != null).length; return [['놓은 바람 카드', n + '<small>/ 3장</small>'], ['0°~30°', (dnd.items.find((i) => i.slot === 'low') || {}).label || '?'], ['30°~60°', (dnd.items.find((i) => i.slot === 'mid') || {}).label || '?']]; }
    if (sc === 'role') { const f = (v) => (v >= 0 ? '+' : '') + Math.round(v); return [['저위도(남음)', f(S.surpA[0])], ['중위도', f(S.surpA[1])], ['고위도(부족)', f(S.surpA[2])]]; }
    return [['구름의 이동', '서 → 동'], ['바람', '편서풍'], ['우리나라', '중위도']];
  }

  /* ---------- 그리기: 공통 ---------- */
  function panelBox(V, r, title) {
    const ctx = V.ctx;
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,.07)'; roundRect(ctx, r.x, r.y, r.w, r.h, 16); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = 1.5; ctx.stroke();
    if (title) { ctx.fillStyle = '#e6edff'; ctx.font = fnt(V.L, 14, '800'); ctx.textAlign = 'center'; ctx.fillText(title, r.x + r.w / 2, r.y + 26 * V.L.fs); }
    ctx.restore();
  }
  function infoCards(V, P, items, o) {
    o = o || {};
    const { ctx, L } = V, fs = L.fs, n = items.length;
    ctx.save();
    items.forEach((it, i) => {
      const bw = L.w ? P.w - 24 : (P.w - 12 * (n + 1)) / n, bx = L.w ? P.x + 12 : P.x + 12 + i * (bw + 12), bh = L.w ? (o.bh || 84) : 84, by = L.w ? P.y + 48 + i * (bh + 12) : P.y + 50;
      ctx.fillStyle = 'rgba(255,255,255,.08)'; roundRect(ctx, bx, by, bw, bh, 12); ctx.fill();
      ctx.fillStyle = '#a5b4fc'; ctx.font = fnt(L, 12.5, '700'); ctx.textAlign = 'center';
      wrapLines(ctx, it[0], bw - 12).forEach((s, k) => ctx.fillText(s, bx + bw / 2, by + (20 + k * 15) * fs));
      ctx.fillStyle = it[2] || '#fff'; ctx.font = fnt(L, L.w ? 22 : 19, '800'); ctx.fillText(it[1], bx + bw / 2, by + bh - 16 * fs);
    });
    if (o.note) {
      ctx.fillStyle = '#c7d2fe'; ctx.font = fnt(L, 12.5, '600'); ctx.textAlign = 'center';
      const y0 = L.w ? P.y + 48 + n * ((o.bh || 84) + 12) + 22 : P.y + 164;
      wrapLines(ctx, o.note, P.w - 28).forEach((s, k) => ctx.fillText(s, P.x + P.w / 2, y0 + k * 18 * fs));
    }
    ctx.restore();
  }
  const warm = (lat) => mixc('#60a5fa', '#fb923c', Math.pow(clamp(1 - lat / 90, 0, 1), 0.8));
  const sgnpow = (v, p) => Math.sign(v) * Math.pow(Math.abs(v), p);

  /* ---------- 장면 ①: 손전등과 지구본 ---------- */
  const flashGeo = (M, L) => (L.w ? { R: 0.2 * M.w, gcx: 0.6 * M.w, gcy: 0.285 * M.h } : { R: 0.172 * M.w, gcx: 0.6 * M.w, gcy: 0.245 * M.h });
  function flashScene(V, G, t) {
    const { ctx, L, D } = V, fs = L.fs, W = G.M.w, H = G.M.h;
    const bg = ctx.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#0a1330'); bg.addColorStop(1, '#101c40'); ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    const FG = flashGeo({ w: W, h: H }, L), R = FG.R, gcx = FG.gcx, gcy = FG.gcy, la = S.latA, phi = la * DEG;
    // 지구본
    D.glow(gcx, gcy, R * 1.5, '#3b82f6', 0.18);
    const gg = ctx.createRadialGradient(gcx - R * 0.45, gcy - R * 0.4, R * 0.1, gcx, gcy, R); gg.addColorStop(0, '#5aa9f5'); gg.addColorStop(0.65, '#2563c0'); gg.addColorStop(1, '#0b2e72');
    ctx.fillStyle = gg; circle(ctx, gcx, gcy, R); ctx.fill();
    ctx.save(); circle(ctx, gcx, gcy, R); ctx.clip();
    ctx.fillStyle = 'rgba(86,170,96,.85)';
    [[-0.45, -0.25, 0.3, 0.2], [0.2, -0.45, 0.35, 0.14], [0.35, 0.15, 0.25, 0.28], [-0.2, 0.5, 0.3, 0.14], [-0.55, 0.25, 0.14, 0.1]].forEach((b) => { ctx.beginPath(); ctx.ellipse(gcx + b[0] * R, gcy + b[1] * R, b[2] * R, b[3] * R, 0.3, 0, TAU); ctx.fill(); });
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1.2; ctx.setLineDash([4, 5]);
    [0, 30, 60].forEach((a) => { const y = gcy - R * Math.sin(a * DEG), hw = R * Math.cos(a * DEG); ctx.beginPath(); ctx.moveTo(gcx - hw, y); ctx.lineTo(gcx + hw, y); ctx.stroke(); });
    ctx.setLineDash([]);
    ctx.restore();
    [0, 30, 60].forEach((a) => { const y = gcy - R * Math.sin(a * DEG); D.text(gcx + R * Math.cos(a * DEG) + 6, y + 4, a + '°' + (a === 0 ? ' 적도' : ''), { size: 12.5 * fs, color: '#bfdbfe', align: 'left', weight: 700 }); });
    // 손전등 빛(평행한 빛줄기 9개)
    const y0 = R * Math.sin(phi), fx = 0.1 * W, fy = gcy - y0, N = 5, sp = 0.012 * R;   // 가느다란 빛줄기: 높은 위도에서도 줄기 전체가 지구본에 닿아 ×배 값과 그림이 일치해요
    let minA = 9, maxA = -9, hits = 0;
    const rays = [];
    for (let i = 0; i < N; i++) {
      const ys = y0 + (i - 2) * sp;
      const hit = Math.abs(ys) < R * 0.998;
      const x = hit ? gcx - Math.sqrt(R * R - ys * ys) : gcx + R + 30;
      rays.push({ ys, hit, x, y: gcy - ys });
      if (hit) { const a = Math.asin(ys / R); minA = Math.min(minA, a); maxA = Math.max(maxA, a); hits++; }
    }
    // 빛이 비치는 부분(표면의 밝은 띠)
    if (hits) {
      ctx.save(); ctx.lineCap = 'butt';
      ctx.strokeStyle = 'rgba(255,224,102,.85)'; ctx.lineWidth = 7; ctx.shadowColor = '#fde047'; ctx.shadowBlur = 14;
      ctx.beginPath(); ctx.arc(gcx, gcy, R + 1, Math.PI + minA, Math.PI + maxA, false); ctx.stroke();
      ctx.restore();
    }
    ctx.save();
    rays.forEach((r) => {
      ctx.strokeStyle = r.hit ? 'rgba(255,236,150,.8)' : 'rgba(255,236,150,.3)'; ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.moveTo(fx + 34, r.y); ctx.lineTo(r.x, r.y); ctx.stroke();
      if (r.hit) D.glow(r.x, r.y, 9, '#fff6b0', 0.7);
    });
    ctx.restore();
    // 손전등
    ctx.save(); ctx.translate(fx, fy);
    const body = ctx.createLinearGradient(0, -14, 0, 14); body.addColorStop(0, '#94a3b8'); body.addColorStop(0.5, '#e2e8f0'); body.addColorStop(1, '#64748b');
    ctx.shadowColor = 'rgba(0,0,0,.4)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 3;
    ctx.fillStyle = body; roundRect(ctx, -34, -13, 50, 26, 6); ctx.fill();
    ctx.fillStyle = '#475569'; ctx.beginPath(); ctx.moveTo(16, -13); ctx.lineTo(34, -22); ctx.lineTo(34, 22); ctx.lineTo(16, 13); ctx.closePath(); ctx.fill();
    ctx.shadowColor = 'transparent'; ctx.fillStyle = '#fef08a'; ctx.beginPath(); ctx.ellipse(34, 0, 4, 20, 0, 0, TAU); ctx.fill();
    ctx.restore();
    D.glow(fx + 36, fy, 36, '#fde047', 0.6);
    pill(ctx, '손전등(태양)', fx + 4, fy - 36 * fs, { bg: 'rgba(15,23,42,.8)', font: fnt(L, 12.5, 'bold'), h: 22 * fs, pad: 8 });
    // 빛이 퍼진 정도 표시
    if (hits) {
      const ay = gcx - R - 16;
      const aMid = (minA + maxA) / 2, px = gcx - R * Math.cos(aMid) - 26, py = gcy - R * Math.sin(aMid);
      pill(ctx, '비친 넓이 ×' + (1 / cosD(la)).toFixed(1), Math.max(60 * fs, px - 40 * fs), clamp(py - 34 * fs, 20, H * 0.5), { bg: '#f59e0b', color: '#1f1300', font: fnt(L, 13, '800'), h: 24 * fs, pad: 10 });
    }
    D.text(gcx, gcy + R + 22 * fs, '같은 빛줄기가 위도에 따라 얼마나 넓게 퍼지는지 봐요', { size: 13 * fs, color: '#c7d2fe', weight: 700 });
    // ----- 위도별 흡수·방출 그래프 -----
    const cx0 = 52 * fs, cx1 = W - 16, cy0 = (L.w ? 0.6 : 0.5) * H + 18, cy1 = H - 50 * fs, ch = cy1 - cy0, cw = cx1 - cx0;
    ctx.fillStyle = 'rgba(8,14,38,.55)'; roundRect(ctx, 8, cy0 - 34 * fs, W - 16, cy1 - cy0 + 34 * fs + 40 * fs, 12); ctx.fill();
    D.text(cx0 - 36 * fs, cy0 - 12 * fs, '위도별 에너지(상대 값, 예시)', { size: 13.5 * fs, color: '#e6edff', align: 'left', weight: 800 });
    const X = (a) => cx0 + a / 90 * cw, Y = (v) => cy1 - v / 152 * ch;
    ctx.strokeStyle = 'rgba(255,255,255,.1)'; ctx.lineWidth = 1; ctx.fillStyle = '#c7d2fe'; ctx.font = fnt(L, 12, '600'); ctx.textAlign = 'center';
    [0, 30, 60, 90].forEach((a) => { ctx.beginPath(); ctx.moveTo(X(a), cy0); ctx.lineTo(X(a), cy1); ctx.stroke(); ctx.fillText(a + '°', X(a), cy1 + 16 * fs); });
    ['저위도', '중위도', '고위도'].forEach((s, i) => { ctx.fillStyle = BANDS[i].c; ctx.fillText(s, X(15 + i * 30), cy1 + 33 * fs); });
    // 남음/부족 채우기
    for (let a = 0; a < 90; a += 1) {
      const A0 = Aenergy(a), A1 = Aenergy(a + 1), E0 = Eenergy(a), E1 = Eenergy(a + 1);
      ctx.fillStyle = (A0 + A1) > (E0 + E1) ? 'rgba(74,222,128,.28)' : 'rgba(248,113,113,.26)';
      ctx.beginPath(); ctx.moveTo(X(a), Y(A0)); ctx.lineTo(X(a + 1), Y(A1)); ctx.lineTo(X(a + 1), Y(E1)); ctx.lineTo(X(a), Y(E0)); ctx.closePath(); ctx.fill();
    }
    const curve = (f, col) => { ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.beginPath(); for (let a = 0; a <= 90; a += 2) { a ? ctx.lineTo(X(a), Y(f(a))) : ctx.moveTo(X(a), Y(f(a))); } ctx.stroke(); };
    curve(Aenergy, '#fbbf24'); curve(Eenergy, '#f87171');
    pill(ctx, '흡수(태양 에너지)', X(4), Y(Aenergy(4)) - 14 * fs, { align: 'left', bg: '#f59e0b', color: '#1f1300', font: fnt(L, 12, '800'), h: 21 * fs, pad: 7 });
    pill(ctx, '방출(지구 복사)', X(58), Y(Eenergy(58)) - 16 * fs, { align: 'left', bg: '#ef4444', font: fnt(L, 12, '800'), h: 21 * fs, pad: 7 });
    D.text(X(14), Y(60) + 4 * fs, '남음', { size: 13 * fs, color: '#86efac', weight: 800 });
    D.text(X(66), Y(48) + 12 * fs, '부족', { size: 13 * fs, color: '#fca5a5', weight: 800 });
    // 커서
    const cxp = X(la);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.8; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(cxp, cy0 - 4); ctx.lineTo(cxp, cy1); ctx.stroke(); ctx.setLineDash([]);
    D.sphere(cxp, Y(Aenergy(la)), 5.5, '#fde68a', { gloss: false, outline: '#f59e0b' }); D.sphere(cxp, Y(Eenergy(la)), 5.5, '#fecaca', { gloss: false, outline: '#ef4444' });
    const diff = Aenergy(la) - Eenergy(la);
    pill(ctx, diff >= 0 ? '이 위도: 에너지 남음 +' + Math.round(diff) : '이 위도: 에너지 부족 ' + Math.round(diff), clamp(cxp, 80 * fs, W - 80 * fs), cy1 - 14 * fs, { bg: diff >= 0 ? '#16a34a' : '#dc2626', font: fnt(L, 13, '800'), h: 24 * fs, pad: 10 });
  }

  /* ---------- 장면 ②③: 세 순환 단면 ---------- */
  function cellRegion(W, H, mode) {
    // mode 'main': 큰 단면, 'role': 위쪽 작은 단면
    const tall = W < 560;
    return mode === 'role' ? { x0: 40, x1: W - (tall ? 40 : 46), gy: (tall ? 0.32 : 0.4) * H, ty: (tall ? 0.115 : 0.12) * H } : { x0: 40, x1: W - (tall ? 40 : 46), gy: 0.74 * H, ty: (tall ? 0.235 : 0.2) * H };
  }
  const LATX = (R, lat) => R.x0 + lat / 90 * (R.x1 - R.x0);
  function cellPos(R, c, s) {
    const cx = LATX(R, (c.lat0 + c.lat1) / 2), a = (LATX(R, c.lat1) - LATX(R, c.lat0)) / 2 * 0.84;
    const yb = R.gy - 10, yt = R.gy - (R.gy - R.ty) * c.hf, cy = (yb + yt) / 2, b = (yb - yt) / 2;
    const ph = c.dir * s * TAU + Math.PI * 0.5;
    return { x: cx + a * sgnpow(Math.cos(ph), 0.74), y: cy + b * sgnpow(Math.sin(ph), 0.74), cx, cy, a, b };
  }
  function drawCells(V, R, t, o) {
    o = o || {};
    const { ctx, L, D } = V, fs = L.fs;
    // 지표(온도 띠)
    const gx = ctx.createLinearGradient(R.x0, 0, R.x1, 0); gx.addColorStop(0, '#ef4444'); gx.addColorStop(0.3, '#f59e0b'); gx.addColorStop(0.6, '#7dd3fc'); gx.addColorStop(1, '#e0f2fe');
    ctx.fillStyle = gx; roundRect(ctx, R.x0, R.gy, R.x1 - R.x0, 16, 8); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(R.x0, R.gy + 14, R.x1 - R.x0, 4);
    D.text(R.x0 + 4, R.gy + 36 * fs, '뜨거운 지표', { size: 12.5 * fs, color: '#fca5a5', align: 'left', weight: 700 });
    D.text(R.x1 - 4, R.gy + 36 * fs, '차가운 지표', { size: 12.5 * fs, color: '#bae6fd', align: 'right', weight: 700 });
    // 위도 눈금
    [0, 30, 60, 90].forEach((a) => {
      const x = LATX(R, a);
      ctx.strokeStyle = 'rgba(255,255,255,.14)'; ctx.setLineDash([5, 6]); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x, R.ty - 10); ctx.lineTo(x, R.gy); ctx.stroke(); ctx.setLineDash([]);
      D.text(x, R.gy + 54 * fs, a + '°' + (a === 0 ? ' 적도' : a === 90 ? ' 극' : ''), { size: 13 * fs, color: '#e6edff', weight: 800 });
    });
    ['저위도', '중위도', '고위도'].forEach((s, i) => D.text(LATX(R, 15 + 30 * i), R.gy + 72 * fs, s, { size: 12.5 * fs, color: BANDS[i].c, weight: 700 }));
    // 순환 고리
    CELLS.forEach((c, ci) => {
      const dim = S.focus !== 'all' && S.focus !== c.id && !o.noFocus ? 0.18 : 1;
      const fa = (o.alpha != null ? o.alpha : 1) * dim;
      ctx.save(); ctx.globalAlpha = fa;
      const pos0 = cellPos(R, c, 0);
      // 고리 윤곽(옅게)
      ctx.strokeStyle = 'rgba(255,255,255,.16)'; ctx.lineWidth = 10; ctx.beginPath();
      for (let i = 0; i <= 60; i++) { const p = cellPos(R, c, i / 60); i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); } ctx.closePath(); ctx.stroke();
      // 방향 화살표
      for (let j = 0; j < 4; j++) { const s = 0.04 + j * 0.25 + 0.0, p1 = cellPos(R, c, s), p2 = cellPos(R, c, s + 0.035); D.arrow(p1.x, p1.y, p2.x, p2.y, { color: 'rgba(255,255,255,.9)', width: 4.5, head: 12 }); }
      ctx.restore();
      if (!o.noLabel) { ctx.save(); ctx.globalAlpha = fa; pill(ctx, c.name, pos0.cx, pos0.cy, { bg: 'rgba(8,14,38,.72)', font: fnt(L, 12.5, '800'), h: 22 * fs, pad: 8 }); ctx.restore(); }
    });
    // 공기 덩어리
    S.parcels.forEach((p) => {
      const c = CELLS[p.c], dim = S.focus !== 'all' && S.focus !== c.id && !o.noFocus ? 0.15 : 1;
      for (let k = 0; k < 5; k++) {
        const pos = cellPos(R, c, ((p.s - k * 0.013) % 1 + 1) % 1);
        const lat = (pos.x - R.x0) / (R.x1 - R.x0) * 90;
        ctx.globalAlpha = dim * (o.alpha != null ? o.alpha : 1) * (1 - k / 5) * 0.95;
        ctx.fillStyle = warm(lat); circle(ctx, pos.x, pos.y, 3.6 * (1 - k * 0.14)); ctx.fill();
      }
    });
    ctx.globalAlpha = 1;
  }
  function cellsScene(V, G, t) {
    const { ctx, L, D } = V, fs = L.fs, W = G.M.w, H = G.M.h, R = cellRegion(W, H, 'main');
    const bg = ctx.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#07112e'); bg.addColorStop(0.7, '#12306a'); bg.addColorStop(1, '#0a1330'); ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    D.text(W / 2, 28 * fs, '북반구 단면: 위도에 따른 공기의 순환', { size: 15 * fs, color: '#e6edff', weight: 800 });
    if (L.w) D.text(W / 2, 48 * fs, '(공기의 흐름 = 점과 화살표 · 색: 빨강 따뜻함 → 파랑 차가움)', { size: 12 * fs, color: '#94a3c8' });
    drawCells(V, R, t, {});
    // 상승·하강 표시 단추
    const cur = nowS();
    MARKS.forEach((m) => {
      const x = LATX(R, m.lat), y = R.ty - 26 * fs, v = S.marks[m.lat], sa = cur - (S.markShake[m.lat] || -9);
      let sx = 0; if (sa >= 0 && sa < 0.45) sx = Math.sin(sa * 46) * 5 * (1 - sa / 0.45);
      ctx.save(); ctx.translate(sx, 0);
      const rr = 20 * fs;
      if (!v) {
        ctx.fillStyle = 'rgba(255,255,255,.08)'; circle(ctx, x, y, rr); ctx.fill();
        ctx.setLineDash([5, 4]); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.stroke(); ctx.setLineDash([]);
        D.text(x, y + 6 * fs, '?', { size: 18 * fs, color: 'rgba(255,255,255,.9)', weight: 800 });
        if (S.lv === 1 && !S.free) D.ring(x, y, rr, t + m.lat * 0.01, { color: '#fde047', width: 2 });
      } else {
        const col = v === 'up' ? '#16a34a' : '#2563eb';
        D.sphere(x, y, rr, col, { outline: '#fff', outlineWidth: 2, gloss: false });
        D.text(x, y + 7 * fs, v === 'up' ? '↑' : '↓', { size: 22 * fs, color: '#fff', weight: 800 });
      }
      ctx.restore();
      D.text(x, y - rr - 7 * fs, v ? (v === 'up' ? '상승 기류' : '하강 기류') : m.name, { size: 12 * fs, color: v ? (v === 'up' ? '#86efac' : '#93c5fd') : '#c7d2fe', weight: 800 });
    });
    if (S.lv === 1 && !S.free && !Object.values(S.marks).some(Boolean)) pill(ctx, '위 동그라미를 눌러 ↑상승 / ↓하강 을 정해요', W / 2, H - 22 * fs, { bg: 'rgba(15,23,42,.85)', font: fnt(L, 14, '700'), h: 28 * fs, pad: 14 });
  }

  /* ---------- 장면 ④: 위도별 바람 지도 ---------- */
  const LAND = [
    [[-168, 66], [-140, 70], [-95, 72], [-80, 73], [-60, 60], [-55, 50], [-67, 45], [-76, 35], [-81, 25], [-97, 26], [-105, 22], [-118, 32], [-125, 48], [-135, 58], [-165, 60]],
    [[-55, 60], [-45, 60], [-20, 70], [-25, 82], [-60, 82], [-70, 76]],
    [[-97, 18], [-86, 14], [-80, 8], [-72, 12], [-62, 10], [-52, 5], [-50, 0], [-80, 0], [-84, 8]],
    [[-10, 36], [-9, 43], [0, 50], [5, 58], [10, 63], [20, 70], [40, 68], [60, 70], [100, 77], [140, 72], [170, 66], [180, 66], [165, 60], [140, 52], [135, 43], [122, 40], [122, 30], [110, 20], [105, 10], [100, 2], [95, 16], [80, 10], [72, 20], [60, 25], [50, 28], [37, 22], [35, 32], [26, 36], [10, 38]],
    [[-17, 15], [-10, 30], [-5, 36], [10, 37], [33, 31], [43, 12], [51, 12], [40, 0], [10, 0], [8, 5], [-8, 5]],
    [[130, 31], [131, 34], [135, 34], [139.5, 35], [141, 38], [141.8, 41.5], [145, 44], [142, 45.4], [140, 41], [138, 37], [133, 36]],
  ];
  function windGeo(V) {
    const G = geo(V.L), W = G.M.w, H = G.M.h, mx = 14, my = 54 * V.L.fs, mw = W - 28, mh = H - my - 16;
    const bh = mh / 3;
    const band = (id) => { const i = id === 'low' ? 2 : id === 'mid' ? 1 : 0; return { x: mx, y: my + i * bh, w: mw, h: bh }; };
    return { G, W, H, mx, my, mw, mh, bh, band };
  }
  function layoutWind(V) {
    const g = windGeo(V), L = V.L, P = g.G.P, homes = {}, slots = [];
    WINDS.forEach((w, i) => {
      const b = g.band(w.band);
      homes[w.id] = L.w ? { x: P.x + P.w / 2, y: P.y + 110 + i * 78 } : { x: P.x + P.w * (0.17 + 0.33 * i), y: P.y + 100 };
      slots.push({ id: w.band, x: g.G.M.x + b.x + 8, y: g.G.M.y + b.y + 8, w: 124 * (L.w ? 1 : 1.0), h: 52, hit: { x: g.G.M.x + b.x, y: g.G.M.y + b.y, w: b.w, h: b.h } });
    });
    dnd.items.forEach((it) => { it.w = L.w ? 132 : 128; it.h = 52; });
    slots.forEach((s) => { s.w = L.w ? 132 : 128; });
    dnd.layout(homes, slots);
  }
  function windScene(V, G, t) {
    const { ctx, L, D } = V, fs = L.fs, g = windGeo(V), { W, H, mx, my, mw, mh, bh } = g;
    const bg = ctx.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#0a1738'); bg.addColorStop(1, '#0c2147'); ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    D.text(W / 2, 24 * fs, '북반구 지도(북쪽이 위): 위도 띠마다 지상 바람이 달라요', { size: 14.5 * fs, color: '#e6edff', weight: 800 });
    // 바다와 대륙
    const mapY = (lat) => my + mh - lat / 90 * mh, mapX = (lon) => mx + (lon + 180) / 360 * mw;
    ctx.save(); roundRect(ctx, mx, my, mw, mh, 12); ctx.clip();
    const oc = ctx.createLinearGradient(0, my, 0, my + mh); oc.addColorStop(0, '#173b73'); oc.addColorStop(1, '#1c5aa0'); ctx.fillStyle = oc; ctx.fillRect(mx, my, mw, mh);
    ctx.fillStyle = 'rgba(94,160,100,.8)'; ctx.strokeStyle = 'rgba(210,235,210,.45)'; ctx.lineWidth = 1.2;
    LAND.forEach((poly) => { ctx.beginPath(); poly.forEach((p, i) => { const x = mapX(p[0]), y = mapY(Math.max(0, p[1])); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.closePath(); ctx.fill(); ctx.stroke(); });
    // 위도 띠
    BANDS.forEach((b, i) => {
      const r = g.band(b.id);
      ctx.fillStyle = rgba(b.c, 0.1 + 0.05 * (i % 2)); ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1.6; ctx.setLineDash([8, 6]); ctx.beginPath(); ctx.moveTo(r.x, r.y); ctx.lineTo(r.x + r.w, r.y); ctx.stroke(); ctx.setLineDash([]);
      ctx.save(); ctx.fillStyle = 'rgba(8,14,38,.7)'; roundRect(ctx, r.x + r.w - 118 * fs, r.y + r.h - 28 * fs, 112 * fs, 22 * fs, 11 * fs); ctx.fill(); ctx.restore();
      D.text(r.x + r.w - 62 * fs, r.y + r.h - 12 * fs, b.name + ' ' + b.r, { size: 12 * fs, color: b.c, weight: 800 });
    });
    // 바람 화살표
    if (S.windA > 0.02) {
      WINDS.forEach((w) => {
        const r = g.band(w.band), list = S.streaks[w.band];
        ctx.save(); ctx.globalAlpha = S.windA; ctx.strokeStyle = '#fff'; ctx.fillStyle = '#fff'; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
        list.forEach((q) => {
          const len = 26 * fs, travel = 70 * fs;
          const xx = r.x + 30 + q.v * (r.w - 130) + w.dx * q.u * travel, yy = r.y + 0.14 * r.h + q.w * r.h * 0.72 + w.dy * q.u * travel;
          const al = Math.sin(clamp(q.u, 0, 1) * Math.PI);
          ctx.globalAlpha = S.windA * al;
          const ex = xx + w.dx * len, ey = yy + w.dy * len;
          ctx.beginPath(); ctx.moveTo(xx, yy); ctx.lineTo(ex, ey); ctx.stroke();
          const hx = w.dx, hy = w.dy; ctx.beginPath(); ctx.moveTo(ex + hx * 7, ey + hy * 7); ctx.lineTo(ex - hy * 5 - hx * 2, ey + hx * 5 - hy * 2); ctx.lineTo(ex + hy * 5 - hx * 2, ey - hx * 5 - hy * 2); ctx.closePath(); ctx.fill();
        });
        ctx.restore();
      });
      // 바람 이름 표시
      WINDS.forEach((w) => { const r = g.band(w.band); ctx.save(); ctx.globalAlpha = S.windA; pill(ctx, w.label + ' (' + w.sub + ')', r.x + r.w / 2, r.y + r.h / 2 + 4, { bg: w.color, font: fnt(L, 14, '800'), h: 26 * fs, pad: 12 }); ctx.restore(); });
      // 날씨 아이콘
      const wy1 = mapY(11), wy2 = mapY(27);
      ctx.save(); ctx.globalAlpha = S.windA; ctx.font = Math.round(28 * fs) + 'px ' + FONT; ctx.textAlign = 'center';
      ctx.fillText('🌧️', mapX(-30), wy1 + 8); ctx.fillText('🏜️', mapX(15), wy2 + 8);
      pill(ctx, '상승 기류: 비 많음', mapX(-30), wy1 + 30 * fs, { bg: 'rgba(8,14,38,.8)', font: fnt(L, 12, '700'), h: 20 * fs, pad: 7 });
      pill(ctx, '하강 기류: 사막', mapX(15), wy2 + 30 * fs, { bg: 'rgba(8,14,38,.8)', font: fnt(L, 12, '700'), h: 20 * fs, pad: 7 });
      ctx.restore();
    }
    // 우리나라
    const kx = mapX(127), ky = mapY(37);
    D.glow(kx, ky, 18, '#fde047', 0.55); D.sphere(kx, ky, 5.5, '#ef4444', { outline: '#fff', outlineWidth: 2, gloss: false });
    D.text(kx - 8, ky - 10 * fs, '우리나라', { size: 12.5 * fs, color: '#fff', weight: 800, align: 'right', stroke: 'rgba(5,10,30,.8)' });
    ctx.restore();
    // 칸 안내(빈 칸)
    if (S.lv === 2 && !S.free) {
      WINDS.forEach((w) => {
        const s = dnd.slots.find((q) => q.id === w.band); if (!s || dnd.items.some((it) => it.slot === w.band)) return;
        const r = { x: s.x - G.M.x, y: s.y - G.M.y, w: s.w, h: s.h };
        ctx.save(); ctx.fillStyle = 'rgba(255,255,255,.1)'; roundRect(ctx, r.x, r.y, r.w, r.h, 12); ctx.fill(); ctx.setLineDash([6, 5]); ctx.lineWidth = 2; ctx.strokeStyle = dnd.sel ? '#fde047' : 'rgba(255,255,255,.75)'; ctx.stroke(); ctx.setLineDash([]);
        D.text(r.x + r.w / 2, r.y + r.h / 2 + 6 * fs, '? 바람', { size: 15 * fs, color: 'rgba(255,255,255,.85)', weight: 800 });
        ctx.restore();
      });
    }
  }

  /* ---------- 장면 ⑤: 열 운반(대순환의 역할) ---------- */
  function roleScene(V, G, t) {
    const { ctx, L, D } = V, fs = L.fs, W = G.M.w, H = G.M.h, R = cellRegion(W, H, 'role');
    const bg = ctx.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#07112e'); bg.addColorStop(1, '#0a1330'); ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    const ca = 0.25 + 0.75 * S.circA;
    drawCells(V, R, t, { alpha: ca, noLabel: true, noFocus: true });
    D.text(W / 2, 22 * fs, S.circ ? '대기 대순환이 열을 옮겨요' : '대기 대순환이 없다고 가정하면?', { size: 15 * fs, color: S.circ ? '#fcd34d' : '#fca5a5', weight: 800 });
    // 열 운반 입자(상층에서 저위도 → 고위도)
    S.packets.forEach((p) => {
      const u = p.u, lat = 4 + u * 82, x = LATX(R, lat), y = R.ty + 4 + u * (R.gy - R.ty) * 0.34 + Math.sin(u * 9) * 3;
      const a = Math.sin(u * Math.PI) * S.circA;
      ctx.save(); ctx.globalAlpha = a;
      D.glow(x, y, 18, '#fb923c', 0.85); D.sphere(x, y, 6.5, mixc('#ef4444', '#fde047', u), { gloss: false, outline: '#fff7ed', outlineWidth: 1.5 });
      ctx.restore();
    });
    if (S.circA > 0.5) pill(ctx, '🔥 저위도의 남는 열 → 고위도로', W / 2, R.ty + (R.gy - R.ty) * 0.5, { bg: 'rgba(120,53,15,.85)', font: fnt(L, 13.5, '800'), h: 26 * fs, pad: 12, alpha: S.circA });
    // 에너지 남음/부족 막대
    const pTop = R.gy + 86 * fs, base = pTop + 76 * fs, sc = 1.4;
    ctx.fillStyle = 'rgba(8,14,38,.55)'; roundRect(ctx, 8, pTop, W - 16, base + 116 * fs - pTop, 12); ctx.fill();
    D.text(W / 2, pTop + 22 * fs, '위도별 에너지 남음(+) / 부족(−)', { size: 13.5 * fs, color: '#e6edff', weight: 800 });
    ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(R.x0, base); ctx.lineTo(R.x1, base); ctx.stroke();
    [15, 45, 75].forEach((lat, i) => {
      const v = S.surpA[i], x = LATX(R, lat), bw = 56 * fs, hh = v * sc;
      const col = v >= 0 ? '#22c55e' : '#ef4444';
      const g = ctx.createLinearGradient(0, base, 0, base - hh); g.addColorStop(0, shade(col, -0.2)); g.addColorStop(1, shade(col, 0.25));
      ctx.fillStyle = g; roundRect(ctx, x - bw / 2, Math.min(base, base - hh), bw, Math.max(Math.abs(hh), 3), 8); ctx.fill();
      D.text(x, v >= 0 ? base - hh - 8 : base - hh + 18 * fs, (v >= 0 ? '+' : '') + Math.round(v), { size: 16 * fs, color: '#fff', weight: 800, stroke: 'rgba(5,10,30,.7)', strokeWidth: 4 });
      D.text(x, base + 104 * fs, BANDS[i].name, { size: 12.5 * fs, color: BANDS[i].c, weight: 800 });
    });
    // 상태 설명
    const txtY = base + 124 * fs;
    ctx.fillStyle = 'rgba(8,14,38,.8)'; roundRect(ctx, 14, txtY, W - 28, H - txtY - 10, 12); ctx.fill();
    ctx.strokeStyle = S.circ ? '#4ade80' : '#f87171'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#e6edff'; ctx.font = fnt(L, 14, '700'); ctx.textAlign = 'center';
    const msg = S.circ ? '남는 열이 고위도로 옮겨져 에너지가 고르게 나뉘고, 저위도는 덜 뜨겁고 고위도는 덜 차가워요.' : '열이 옮겨지지 않으면 저위도는 계속 뜨거워지고 고위도는 계속 차가워질 거예요.';
    const ml = wrapLines(ctx, msg, W - 56).slice(0, 3);
    ml.forEach((s, i) => ctx.fillText(s, W / 2, txtY + (H - txtY - 10) / 2 - (ml.length - 1) * 10 * fs + 5 + i * 20 * fs));
  }

  /* ---------- 장면 ⑥: 위성 영상 예시(우리나라 날씨의 서→동 이동) ---------- */
  const SPRC = {};
  function blobSprite(col) {
    if (SPRC[col]) return SPRC[col];
    const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, col + 'ff'); g.addColorStop(0.5, col + '88'); g.addColorStop(1, col + '00');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64); SPRC[col] = c; return c;
  }
  const SYS = (() => { const r = rng(41), a = []; for (let s = 0; s < 4; s++) { const c = { u0: [0.05, 0.3, 0.55, 0.8][s], v: [0.5, 0.3, 0.62, 0.42][s], sz: [1.1, 0.8, 1.0, 0.7][s], blobs: [] }; for (let i = 0; i < 24; i++) c.blobs.push({ du: (r() - 0.5) * 0.22, dv: (r() - 0.5) * 0.09 + (r() - 0.5) * (r() - 0.5) * 0.1, r: 16 + r() * 26, a: 0.4 + r() * 0.5 }); a.push(c); } return a; })();
  function satScene(V, G, t) {
    const { ctx, L, D } = V, fs = L.fs, W = G.M.w, H = G.M.h;
    const sx = (lon) => (lon - 95) / 55 * W, sy = (lat) => (58 - lat) / 36 * H;
    const bg = ctx.createLinearGradient(0, 0, W, H); bg.addColorStop(0, '#0e2a52'); bg.addColorStop(1, '#13396b'); ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    const land = [
      [[95, 30], [95, 42], [105, 48], [115, 50], [120, 53], [127, 50], [131, 43], [124, 40], [121, 39], [122, 32], [121, 28], [118, 24], [110, 21], [106, 23], [100, 22], [97, 26]],
      [[95, 45], [95, 58], [150, 58], [150, 52], [140, 50], [133, 48], [127, 50], [120, 53], [115, 50], [105, 48]],
      [[124.6, 38], [126.3, 37.9], [128.4, 38.6], [129.6, 37], [129.4, 35.4], [127.6, 34.5], [126.3, 34.6], [126.6, 36.5]],
      [[130, 31], [131, 34], [135, 34], [139.5, 35], [141, 38], [141.8, 41.5], [145, 44], [142, 45.4], [140, 41], [138, 37], [133, 36], [129.8, 33.5]],
    ];
    ctx.fillStyle = '#3b4a3e'; ctx.strokeStyle = 'rgba(200,220,200,.35)'; ctx.lineWidth = 1.2;
    land.forEach((poly) => { ctx.beginPath(); poly.forEach((p, i) => { const x = sx(p[0]), y = sy(p[1]); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.closePath(); ctx.fill(); ctx.stroke(); });
    // 구름: 서쪽에서 동쪽으로 이동
    const spr = blobSprite('#ffffff');
    SYS.forEach((s) => {
      const u = ((s.u0 + t * 0.022) % 1.4) - 0.2, cx = u * W, cy = s.v * H;
      ctx.save(); ctx.globalAlpha = 0.9;
      s.blobs.forEach((b) => { const r = b.r * s.sz * fs * (L.w ? 1.3 : 1.15); ctx.globalAlpha = b.a * Math.min(1, (u + 0.2) * 5, (1.2 - u) * 5); ctx.drawImage(spr, cx + b.du * W - r, cy + b.dv * H - r, r * 2, r * 2); });
      ctx.restore();
    });
    // 황사: 서쪽(고비 사막) → 우리나라
    const sand = blobSprite('#e0b050'), cyc = 16, p = (t % cyc) / cyc;
    {
      const gx = sx(104), gy = sy(42), kx = sx(127), ky = sy(37.2);
      const cx = lerp(gx, kx + 18, EZ.inOutQuad(p)), cy = lerp(gy, ky - 6, EZ.inOutQuad(p)), spread = 20 + p * 46;
      const r2 = rng(9), a = Math.sin(p * Math.PI);
      for (let i = 0; i < 26; i++) { const ox = (r2() - 0.5) * spread * 2.2 * fs + Math.sin(t * 0.6 + i) * 3, oy = (r2() - 0.5) * spread * 1.1 * fs; const r = (14 + r2() * 20) * fs; ctx.globalAlpha = a * (0.3 + 0.45 * r2()); ctx.drawImage(sand, cx + ox - r, cy + oy - r, r * 2, r * 2); }
      ctx.globalAlpha = 1;
      if (p < 0.9) D.text(gx, gy + 38 * fs, '황사 발원지(사막)', { size: 12 * fs, color: '#fde68a', weight: 700, stroke: 'rgba(5,10,30,.8)' });
    }
    // 우리나라 표시
    const kx = sx(127.4), ky = sy(36.6);
    D.glow(kx, ky, 22, '#fde047', 0.5); D.sphere(kx, ky, 6, '#ef4444', { outline: '#fff', outlineWidth: 2, gloss: false });
    pill(ctx, '우리나라 (중위도 약 37°N)', kx, ky + 30 * fs, { bg: 'rgba(8,14,38,.88)', font: fnt(L, 13, '800'), h: 24 * fs, pad: 10, stroke: '#fde047' });
    // 바람 방향
    D.arrow(W * 0.12, 54 * fs, W * 0.62, 54 * fs, { color: 'rgba(255,255,255,.9)', width: 5, head: 15 });
    pill(ctx, '편서풍: 서쪽 → 동쪽', W * 0.37, 28 * fs, { bg: '#8b5cf6', font: fnt(L, 14, '800'), h: 28 * fs, pad: 12 });
    D.text(W * 0.1, 80 * fs, '서', { size: 15 * fs, color: '#fff', weight: 800 }); D.text(W * 0.66, 62 * fs, '동', { size: 15 * fs, color: '#fff', weight: 800 });
    pill(ctx, '예시 위성 영상(단순화)', W - 12, H - 18 * fs, { align: 'right', bg: '#f59e0b', color: '#1f1300', font: fnt(L, 12, '800'), h: 22 * fs, pad: 8 });
    D.text(12, H - 30 * fs, '하양 = 구름', { size: 12.5 * fs, color: '#fff', align: 'left', weight: 700, stroke: 'rgba(5,10,30,.8)' });
    D.text(12, H - 12 * fs, '누런색 = 황사', { size: 12.5 * fs, color: '#fde68a', align: 'left', weight: 700, stroke: 'rgba(5,10,30,.8)' });
  }

  /* ---------- 패널 ---------- */
  function drawPanel(V, G, t) {
    const { ctx, L, D } = V, fs = L.fs, P = G.P, sc = S.scene;
    if (sc === 'flash') {
      panelBox(V, P, '위도마다 달라요');
      const la = S.latA, diff = Aenergy(la) - Eenergy(la);
      infoCards(V, P, [['빛이 퍼진 넓이', '×' + (1 / cosD(la)).toFixed(1), '#fde68a'], ['단위 면적당 받는 에너지', Math.round(cosD(la) * 100) + '%', '#fdba74'], [diff >= 0 ? '에너지 남음' : '에너지 부족', (diff >= 0 ? '+' : '') + Math.round(diff), diff >= 0 ? '#86efac' : '#fca5a5']], { note: '같은 빛이 넓게 퍼질수록 단위 면적당 에너지는 적어져요.' });
    } else if (sc === 'cells') {
      panelBox(V, P, '단면 읽기');
      infoCards(V, P, [['상승 기류 (구름·비)', '0°, 60°', '#86efac'], ['하강 기류 (맑고 건조)', '30°, 90°', '#93c5fd'], ['표시한 위치', Object.values(S.marks).filter(Boolean).length + ' / 4곳', '#fde68a']], { note: '공기는 상승 → 이동 → 하강 → 되돌아오는 고리를 돌아요.' });
    } else if (sc === 'wind') {
      panelBox(V, P, '바람 카드');
      ctx.save(); ctx.fillStyle = '#c7d2fe'; ctx.font = fnt(L, 12.5, '600'); ctx.textAlign = 'center';
      ctx.fillText(L.w ? '알맞은 위도 띠에 놓아요' : '알맞은 위도 띠에 끌어다 놓아요', P.x + P.w / 2, P.y + (L.w ? 52 : 52) * fs);
      ctx.restore();
      if (windSolved() && dnd.items.every((it) => Math.hypot(it.x - it.hx, it.y - it.hy) > 30)) {
        WINDS.slice().reverse().forEach((w, i) => {
          const bw = L.w ? P.w - 24 : (P.w - 48) / 3, bh = L.w ? 92 : 100, bx = L.w ? P.x + 12 : P.x + 12 + i * (bw + 12), by = L.w ? P.y + 70 + i * (bh + 10) : P.y + 66;
          ctx.save(); ctx.fillStyle = 'rgba(255,255,255,.08)'; roundRect(ctx, bx, by, bw, bh, 12); ctx.fill(); ctx.fillStyle = w.color; roundRect(ctx, bx, by, 6, bh, 3); ctx.fill();
          ctx.textAlign = 'center'; ctx.fillStyle = '#c7d2fe'; ctx.font = fnt(L, 12.5, '700'); ctx.fillText(w.lat, bx + bw / 2 + 3, by + 22 * fs);
          ctx.fillStyle = '#fff'; ctx.font = fnt(L, 19, '800'); ctx.fillText(w.label, bx + bw / 2 + 3, by + 52 * fs);
          ctx.fillStyle = '#fde68a'; ctx.font = fnt(L, 13.5, '700'); ctx.fillText(w.sub + ' (' + w.sub.slice(0, 2) + '쪽에서)', bx + bw / 2 + 3, by + 76 * fs);
          ctx.restore();
        });
      }
    } else if (sc === 'role') {
      panelBox(V, P, '에너지 재분배');
      const f = (v) => (v >= 0 ? '+' : '') + Math.round(v);
      infoCards(V, P, [['저위도', f(S.surpA[0]), S.surpA[0] >= 0 ? '#86efac' : '#fca5a5'], ['중위도', f(S.surpA[1]), S.surpA[1] >= 0 ? '#86efac' : '#fca5a5'], ['고위도', f(S.surpA[2]), S.surpA[2] >= 0 ? '#86efac' : '#fca5a5']], { note: S.circ ? '대순환이 남는 열을 고위도로 운반해요.' : '운반이 없으면 차이가 그대로 커져요.' });
    } else {
      panelBox(V, P, '위성 영상');
      infoCards(V, P, [['구름이 움직이는 방향', '서 → 동', '#c4b5fd'], ['황사가 오는 방향', '서 → 동', '#fde68a'], ['우리나라가 있는 곳', '중위도', '#fdba74']], { note: '중위도에서는 편서풍이 불어서 날씨가 서쪽에서 동쪽으로 옮겨 가요.' });
    }
  }

  /* ---------- 전체 그리기 ---------- */
  function draw(V, t) {
    const { ctx, L } = V, G = geo(L), sc = S.scene;
    V.v.clear(FRAME);
    ctx.save(); ctx.translate(G.M.x, G.M.y); roundRect(ctx, 0, 0, G.M.w, G.M.h, 16); ctx.clip();
    if (sc === 'flash') flashScene(V, G, t); else if (sc === 'cells') cellsScene(V, G, t); else if (sc === 'wind') windScene(V, G, t); else if (sc === 'role') roleScene(V, G, t); else satScene(V, G, t);
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = 1.5; roundRect(ctx, G.M.x, G.M.y, G.M.w, G.M.h, 16); ctx.stroke();
    drawPanel(V, G, t);
    if (sc === 'wind') { layoutWind(V); dnd.draw(V); }
    drawTip(V, G.M.y + G.M.h - 22 * L.fs);
    V.P.draw(ctx);
    if (game && game.isNew('views') && (sc === 'role' || sc === 'sat')) newRing(ctx, G.M.x + 4, G.M.y + 4, G.M.w - 8, G.M.h - 8);
  }

  /* ---------- 입력 ---------- */
  views.forEach((V) => {
    SciSim.pointer(V.v, {
      hover(p) {
        if (S.scene === 'wind' && dnd.enabled && dnd.itemAt(p)) return 'grab';
        if (S.scene === 'cells') { const G = geo(V.L), R = cellRegion(G.M.w, G.M.h, 'main'); if (MARKS.some((m) => Math.hypot(p.x - G.M.x - LATX(R, m.lat), p.y - G.M.y - (R.ty - 26 * V.L.fs)) < 28)) return 'pointer'; }
        if (S.scene === 'flash') return 'ns-resize';
        return null;
      },
      down(p) {
        const G = geo(V.L);
        if (S.scene === 'wind') { layoutWind(V); if (dnd.down(p)) { V.drag = 'dnd'; return true; } return false; }
        if (S.scene === 'cells') {
          const R = cellRegion(G.M.w, G.M.h, 'main');
          MARKS.forEach((m) => {
            if (Math.hypot(p.x - G.M.x - LATX(R, m.lat), p.y - G.M.y - (R.ty - 26 * V.L.fs)) < 30 * V.L.fs) {
              const cur = S.marks[m.lat]; S.marks[m.lat] = !cur ? 'up' : cur === 'up' ? 'down' : null; Sound.tick();
              if (S.marks[m.lat]) V.P.burst(p.x, p.y, { count: 6, colors: ['#fde047', '#fff'], speed: 70, size: 2.4, gravity: 40, life: 0.4 });
            }
          });
          return false;
        }
        if (S.scene === 'flash') {
          // 지구본 위를 끌어 위도 바꾸기
          const M = G.M, FG = flashGeo(M, V.L), R = FG.R, gcx = M.x + FG.gcx, gcy = M.y + FG.gcy;
          if (Math.hypot(p.x - gcx, p.y - gcy) < R * 1.25 || (p.x < gcx - R && p.y < gcy + R * 1.2)) { V.drag = 'lat'; setLatFromY(V, p.y); return true; }
        }
        return false;
      },
      move(p) { if (V.drag === 'dnd') dnd.move(p); else if (V.drag === 'lat') setLatFromY(V, p.y); },
      up(p) { if (V.drag === 'dnd') dnd.up(p); V.drag = null; },
    });
  });
  function setLatFromY(V, y) {
    const M = geo(V.L).M, FG = flashGeo(M, V.L), R = FG.R, gcy = M.y + FG.gcy;
    const s = clamp((gcy - y) / R, 0, 0.985), lat = Math.round(clamp(Math.asin(s) / DEG, 0, 75));
    S.lat = lat; bLat.set(lat);
  }

  /* ---------- 단계 준비 ---------- */
  function stage(lv) {
    S.lv = lv; S.free = false;
    if (lv === 0) { S.scene = 'flash'; S.lat = 0; S.latA = 0; S.seenLat = { lo: false, mid: false, hi: false }; S.visit = { lo: 0, mid: 0, hi: 0 }; bLat.set(0); }
    if (lv === 1) { S.scene = 'cells'; S.marks = {}; S.focus = 'all'; }
    if (lv === 2) { S.scene = 'wind'; dnd.reset(); flagWind = new Set(); }
    if (lv === 3) { S.scene = 'role'; S.circ = true; S.circA = 1; S.seenOff = S.seenOn = false; S.offT = S.onT = 0; S.packets = []; }
    syncControls();
  }
  const marksOK = () => MARKS.every((m) => S.marks[m.lat] === m.want);

  /* ---------- 미션 ---------- */
  game = SciSim.game({
    simId: 'm3-global-circulation',
    mount: '#game',
    badge: '대기 순환 탐험가',
    homeHref: '../../index.html#g3',
    featureLabels: { lat: '🔦 손전등 위도', focus: '🔎 순환 하나씩 보기', views: '🔭 화면·대순환 켜고 끄기' },
    onFeatures(set) { FEAT = set; syncControls(); },
    onMissionStart(m) { TIP.t0 = -99; if (S.lv !== m._level && !S.free) stage(m._level); },
    onComplete() { S.free = true; S.lv = 3; S.scene = 'role'; S.circ = true; syncControls(); },
    levels: [
      /* ---------- 1단계 · 관찰 ---------- */
      {
        title: '위도별 에너지: 손전등 비추기', short: '위도별 에너지', icon: '🔦', phase: '관찰',
        features: ['lat'],
        intro: '<p class="si-q">❓ 탐구 질문: 적도는 계속 뜨거워지고 극지방은 계속 차가워지지 않는 까닭은 무엇일까?</p>' +
          '<p>태양 빛을 <b>손전등</b>으로 생각해요. 손전등을 지구본의 <b>적도, 중위도, 극지방</b>에 차례로 비추고, 같은 빛이 <b>얼마나 넓게 퍼지는지</b> 비교해 봐요.</p>',
        setup() { stage(0); },
        recap: '고위도에서는 같은 빛이 <b>더 넓게 퍼져서</b> 단위 면적당 받는 에너지가 적어요. 그래서 저위도는 에너지가 <b>남고</b>, 고위도는 <b>부족해요</b>.',
        summary: '<ul><li>지구는 둥글어서 같은 양의 태양 빛이 <b>고위도</b>에서는 <b>더 넓은 면적</b>에 비스듬히 퍼져요. 그래서 단위 면적당 받는 에너지가 <b>적어요</b>.</li>' +
          '<li><b>저위도</b>는 흡수하는 태양 에너지가 방출하는 지구 복사 에너지보다 많아 에너지가 <b>남고</b>, <b>고위도</b>는 흡수가 방출보다 적어 에너지가 <b>부족해요</b>.</li>' +
          '<li>그런데 저위도는 계속 뜨거워지지 않고 고위도는 계속 차가워지지 않아요. 에너지를 옮겨 주는 무언가가 있다는 뜻이에요.</li></ul>',
        missions: [
          {
            title: '🔦 세 곳에 비추어 보기',
            goal: '지구본이나 슬라이더로 손전등이 비추는 위도를 <b>적도 가까이(10° 이하)</b>, <b>중위도(약 40~55°)</b>, <b>극 가까이(70° 이상)</b>로 옮기며 빛이 퍼진 정도를 비교해요.',
            hint: '지구본을 위아래로 끌어도 되고, 아래 슬라이더를 움직여도 돼요. 위도가 높을수록 빛이 닿은 노란 띠가 길어져요.',
            setup() { S.seenLat = { lo: false, mid: false, hi: false }; S.visit = { lo: 0, mid: 0, hi: 0 }; },
            check: () => S.seenLat.lo && S.seenLat.mid && S.seenLat.hi,
            hold: 0.3,
            status: () => chk(S.seenLat.lo, '적도 가까이') + ' · ' + chk(S.seenLat.mid, '중위도') + ' · ' + chk(S.seenLat.hi, '극 가까이'),
            explain: '위도가 높아질수록 같은 빛줄기가 닿는 면적이 <b>넓어져요</b>(적도에서 ×1.0, 45°에서 약 ×1.4, 60°에서 ×2.0, 75°에서 약 ×3.9). 그래서 단위 면적당 받는 에너지는 <b>적어져요</b>.',
          },
          {
            type: 'quiz', title: '💡 빛이 퍼지면?',
            goal: '고위도 지방이 저위도 지방보다 <b>단위 면적당 받는 태양 에너지가 적은</b> 까닭은?',
            choices: ['같은 양의 빛이 더 넓은 면적에 퍼지기 때문이다', '고위도가 태양에서 훨씬 더 멀기 때문이다', '고위도에는 햇빛이 전혀 닿지 않기 때문이다', '고위도의 땅이 빛을 모두 반사하기 때문이다'],
            answer: 0,
            feedback: [
              '',
              '지구와 태양 사이의 거리에 비하면 적도와 극의 거리 차이는 아주 작아요. 같은 빛줄기가 닿는 면적을 비교해 봐요.',
              '고위도에도 햇빛은 닿아요. 다만 비스듬히 닿아서 넓게 퍼져요.',
              '반사되는 비율도 영향을 주지만, 가장 큰 까닭은 비스듬히 비치는 빛이 넓게 퍼지는 거예요.',
            ],
            explain: '고위도에서는 햇빛이 <b>비스듬히</b> 닿아 같은 양의 빛이 <b>더 넓은 면적</b>에 퍼져요. 그래서 단위 면적당 에너지가 적고 기온이 낮아요.',
          },
          {
            type: 'quiz', title: '📊 남는 곳과 부족한 곳',
            goal: '그래프에서 흡수(노랑)와 방출(빨강)을 비교해요. 에너지가 <b>남는 곳</b>과 <b>부족한 곳</b>은 어디일까요?',
            setup() { bLat.set(S.lat); },
            choices: ['저위도는 남고, 고위도는 부족하다', '저위도는 부족하고, 고위도는 남는다', '모든 위도에서 남는다', '모든 위도에서 부족하다'],
            answer: 0,
            feedback: [
              '',
              '반대로 읽었어요. 저위도에서는 노랑(흡수)이 빨강(방출)보다 위에 있어요.',
              '고위도에서는 빨강(방출)이 노랑(흡수)보다 위에 있어요. 그곳은 에너지가 부족해요.',
              '저위도에서는 노랑(흡수)이 빨강(방출)보다 위에 있어요. 그곳은 에너지가 남아요.',
            ],
            explain: '<b>저위도</b>는 흡수하는 에너지가 방출하는 에너지보다 많아 <b>남고</b>, <b>고위도</b>는 흡수가 방출보다 적어 <b>부족해요</b>. 그런데 저위도는 계속 뜨거워지지 않아요. 에너지가 옮겨지기 때문일까요? 다음 단계에서 알아봐요!',
          },
        ],
      },
      /* ---------- 2단계 · 모형 ---------- */
      {
        title: '순환 모형: 세 개의 공기 고리', short: '순환 모형', icon: '🔄', phase: '모형',
        features: ['focus'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 저위도는 에너지가 남고 고위도는 부족하다는 것을 확인했어요.</div>' +
          '<p>대기는 이 에너지 차이 때문에 끊임없이 움직여요. 북반구를 위에서 옆으로 자른 <b>단면</b>에서 공기가 어떻게 순환하는지 살펴보고, 공기가 <b>올라가는 곳</b>과 <b>내려오는 곳</b>을 찾아봐요.</p>',
        setup() { stage(1); },
        recap: '적도 부근과 60° 부근에서는 공기가 <b>상승</b>하고, 30° 부근과 극에서는 <b>하강</b>해요. 이렇게 <b>3개의 순환</b>이 생겨요.',
        summary: '<ul><li>적도 부근(0°)에서 데워진 공기는 <b>상승</b>해 고위도 쪽으로 이동하다가 약 30°에서 <b>하강</b>하고, 지표 부근에서 다시 적도로 돌아와요. (저위도 순환)</li>' +
          '<li>북반구에는 <b>저위도·중위도·고위도 순환</b> 3개의 고리가 있어요. 상승 기류는 0°와 60° 부근, 하강 기류는 30° 부근과 극에 있어요.</li>' +
          '<li>상승 기류가 있는 곳에서는 구름과 비가 많고, 하강 기류가 있는 곳에서는 맑고 건조해요.</li></ul>',
        missions: [
          {
            title: '📍 상승·하강 위치 표시',
            goal: '단면 위쪽의 동그라미 4개(0°, 30°, 60°, 극)를 눌러 <b>↑ 상승 기류</b>인지 <b>↓ 하강 기류</b>인지 표시해요. (누를 때마다 바뀌어요)',
            hint: '공기 덩어리(점)가 위로 올라가는 곳은 ↑, 아래로 내려오는 곳은 ↓예요. 고리의 화살표를 따라가 봐요.',
            setup() { S.marks = {}; S.focus = 'all'; syncControls(); },
            check: () => marksOK(),
            hold: 0.6,
            status: () => MARKS.map((m) => chk(S.marks[m.lat] === m.want, m.name + (S.marks[m.lat] ? (S.marks[m.lat] === 'up' ? ' ↑' : ' ↓') : ''))).join(' · '),
            explain: '<b>0°</b>와 <b>60°</b> 부근에서는 공기가 올라가고(상승), <b>30°</b> 부근과 <b>극(90°)</b>에서는 내려와요(하강). 상승 기류는 구름이 많고, 하강 기류는 맑고 건조해요.',
          },
          {
            type: 'quiz', title: '🧭 지표 부근 공기의 이동(저위도 순환)',
            goal: '저위도 순환에서 <b>지표 부근</b>의 공기는 어느 쪽으로 움직일까요?',
            setup() { S.focus = 'h'; syncControls(); },
            choices: ['적도 쪽(위도가 낮은 쪽)으로', '고위도 쪽(극 쪽)으로', '위로 올라가기만 한다', '움직이지 않는다'],
            answer: 0,
            feedback: [
              '',
              '상공에서 고위도 쪽으로 이동하는 공기를 헷갈렸어요. 지표 부근의 점들이 어느 쪽으로 가는지 다시 봐요.',
              '공기는 계속 올라가기만 하지 않고, 올라간 만큼 다른 곳에서 내려와 고리를 이뤄요.',
              '공기는 고리를 따라 계속 돌아요. 점들이 움직이는 것을 봐요.',
            ],
            explain: '30° 부근에서 내려온 공기는 지표 부근에서 <b>적도 쪽</b>으로 이동하다가 적도에서 다시 올라가요. 이렇게 <b>하나의 고리</b>가 완성돼요.',
          },
          {
            type: 'quiz', title: '🔥 적도에서 올라간 공기는?',
            goal: '적도에서 데워져 상승한 공기는 높은 곳에서 어떻게 움직일까요?',
            setup() { S.focus = 'h'; syncControls(); },
            choices: ['고위도 쪽으로 이동하다가 30° 부근에서 내려온다', '적도 위에서 계속 올라간다', '바로 그 자리에서 내려온다', '반대쪽 극까지 곧바로 간다'],
            answer: 0,
            feedback: [
              '',
              '공기는 계속 올라가지 않아요. 상공에서 옆으로 이동해요.',
              '상승한 공기는 높은 곳에서 옆으로 이동한 뒤에 내려와요.',
              '저위도 순환은 30°까지예요. 극까지 가지 않아요.',
            ],
            explain: '적도에서 올라간 공기는 상공에서 <b>고위도 쪽(북쪽)</b>으로 이동해 약 <b>30°</b>에서 내려와요. 이 고리가 <b>저위도 순환</b>이에요.',
          },
        ],
      },
      /* ---------- 3단계 · 탐구 ---------- */
      {
        title: '위도별 바람 알아보기', short: '위도별 바람', icon: '💨', phase: '탐구',
        features: [],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 위도에 따라 상승·하강 기류가 있고, 지표 부근에서 공기가 이동하는 것을 봤어요.</div>' +
          '<p>지표에서 부는 바람은 위도마다 달라요. 북반구 지도에서 <b>위도 띠</b>마다 어떤 바람이 부는지 바람 카드를 놓아 찾아봐요. (바람의 방향은 관측된 사실로 알아봐요.)</p>',
        setup() { stage(2); },
        recap: '북반구 지표에서는 <b>0~30°에 무역풍(북동풍)</b>, <b>30~60°에 편서풍(남서풍)</b>, <b>60~90°에 극동풍(북동풍)</b>이 불어요.',
        summary: '<table class="cmp"><tr><th>위도(북반구)</th><th>지상 바람</th><th>부는 방향</th></tr>' +
          '<tr><td>0°~30°</td><td><b>무역풍</b></td><td>북동풍(북동쪽에서 불어와요)</td></tr>' +
          '<tr><td>30°~60°</td><td><b>편서풍</b></td><td>남서풍(남서쪽에서 불어와요)</td></tr>' +
          '<tr><td>60°~90°</td><td><b>극동풍</b></td><td>북동풍(북동쪽에서 불어와요)</td></tr></table>' +
          '<p>적도 부근은 상승 기류라 <b>구름과 비가 많고</b>, 30° 부근은 하강 기류라 <b>맑고 건조해서 사막이 많아요</b>.</p>',
        missions: [
          {
            title: '🧩 바람 카드 놓기', manual: true,
            goal: '바람 카드 3장(<b>무역풍·편서풍·극동풍</b>)을 알맞은 <b>위도 띠</b>에 끌어다 놓아요. 다 놓았으면 <b>확인하기</b>를 눌러요.',
            hint: '이름에 힌트가 있어요. 편서풍은 <b>서쪽</b>에서 불어오는 바람, 무역풍은 적도 가까이 불고, 극동풍은 극지방 가까이 불어요.',
            setup() { dnd.reset(); flagWind = new Set(); },
            status: () => BANDS.map((b) => chk(dnd.items.some((i) => i.slot === b.id), b.r)).join(' · '),
            check() {
              const un = dnd.items.filter((i) => i.slot == null);
              if (un.length) return '아직 놓지 않은 카드가 있어요: ' + un.map((i) => i.label).join(', ');
              const wrong = dnd.items.filter((i) => i.slot !== i.band), now = new Set(wrong.map((i) => i.id));
              dnd.items.forEach((i) => { i.bad = now.has(i.id); if (now.has(i.id) && !flagWind.has(i.id)) i.shake = nowS(); });
              flagWind = now;
              if (wrong.length) return '위치를 다시 생각해 볼 카드가 있어요(' + wrong.map((i) => i.label).join(', ') + '). 적도 가까운 띠부터 무역풍 → 편서풍 → 극동풍 순서예요.';
              return true;
            },
            explain: '<b>0~30°</b>에서는 <b>무역풍(북동풍)</b>, <b>30~60°</b>에서는 <b>편서풍(남서풍)</b>, <b>60~90°</b>에서는 <b>극동풍(북동풍)</b>이 불어요. 우리나라(약 37°N)는 편서풍 지역이에요.',
          },
          {
            type: 'quiz', title: '🏜️ 사막은 왜 30° 부근에 많을까?',
            goal: '지도에서 30° 부근에는 사막이 많아요. 그 까닭으로 알맞은 것은?',
            setup() { dnd.items.forEach((i) => { i.slot = i.band; i.bad = false; }); },
            choices: ['하강 기류가 있어서 구름이 잘 생기지 않고 맑고 건조하기 때문', '상승 기류가 있어서 비가 많이 오기 때문', '무역풍이 모래를 계속 실어 오기 때문', '바다에서 멀기 때문에 햇빛이 약하기 때문'],
            answer: 0,
            feedback: [
              '',
              '상승 기류가 있는 곳은 적도 부근과 60° 부근이에요. 30° 부근은 반대로 공기가 내려와요.',
              '바람이 모래를 나르는 것은 맞지만 사막이 생기는 주된 까닭은 아니에요. 공기가 어떻게 움직이는지 생각해 봐요.',
              '햇빛은 오히려 강해요. 공기가 내려오며 맑고 건조해지는 것과 관련 있어요.',
            ],
            explain: '30° 부근에서는 공기가 <b>하강</b>해요. 내려오는 공기는 구름이 생기기 어려워 <b>맑고 건조해서</b> 사막이 많아요. 반대로 적도 부근은 <b>상승 기류</b>라 구름과 비가 많아요.',
          },
        ],
      },
      /* ---------- 4단계 · 적용 ---------- */
      {
        title: '대순환의 역할과 우리나라 날씨', short: '대순환의 역할', icon: '🌀', phase: '적용',
        features: ['views'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 위도마다 순환과 바람이 다르다는 것을 배웠어요.</div>' +
          '<p>이 순환 전체를 <b>대기 대순환</b>이라고 해요. 대기 대순환이 에너지를 어떻게 나누는지 알아보고, 편서풍 때문에 <b>우리나라의 날씨와 황사</b>가 어떻게 움직이는지 살펴봐요.</p>',
        setup() { stage(3); },
        recap: '대기 대순환은 저위도의 남는 열에너지를 <b>고위도로 운반</b>해서 에너지를 고르게 나눠요. 우리나라 날씨는 편서풍 때문에 대체로 <b>서쪽에서 동쪽으로</b> 변해요.',
        summary: '<ul><li><b>대기 대순환</b>은 저위도에서 남는 열에너지를 고위도로 <b>운반</b>(에너지 재분배)해서, 저위도는 계속 뜨거워지지 않고 고위도는 계속 차가워지지 않게 해요.</li>' +
          '<li>대기 대순환이 없다면 저위도와 고위도의 온도 차이가 훨씬 커질 거예요.</li>' +
          '<li>우리나라는 중위도에 있어 <b>편서풍</b>이 불어요. 그래서 날씨가 대체로 <b>서쪽에서 동쪽으로</b> 옮겨 가고, 황사도 서쪽(중국 내륙)에서 우리나라로 날아와요.</li></ul>',
        missions: [
          {
            title: '🔥 열이 옮겨지는 모습 비교하기',
            goal: '<b>🔥 열 운반</b> 화면에서 <b>⏸ 대순환이 멈춘다고 가정</b>했을 때와 <b>🌀 작동</b>할 때를 모두 보고 남음/부족 막대를 비교해요.',
            hint: '먼저 ⏸ 멈춘다고 가정을 누르고 막대가 커질 때까지 기다린 뒤, 🌀 작동을 눌러요.',
            setup() { setScene('role'); S.seenOff = S.seenOn = false; S.offT = S.onT = 0; S.circ = true; syncControls(); },
            check: () => S.seenOff && S.seenOn,
            hold: 0.3,
            status: () => chk(S.seenOff, '대순환 멈춤(차이가 커져요)') + ' · ' + chk(S.seenOn, '대순환 작동(고르게 나눠요)'),
            explain: '대순환이 <b>작동</b>하면 저위도의 남는 열이 고위도로 운반되어 에너지가 <b>고르게 나뉘어요</b>. 멈춘다고 가정하면 저위도는 남고 고위도는 부족한 차이가 그대로 커져요.',
          },
          {
            type: 'quiz', title: '🌡️ 대기 대순환의 역할',
            goal: '대기 대순환이 하는 가장 중요한 역할은?',
            setup() { setScene('role'); },
            choices: ['저위도의 남는 열에너지를 고위도로 운반한다', '고위도의 열에너지를 저위도로 운반한다', '지구가 받는 태양 에너지의 양을 늘린다', '지구의 반사율을 높인다'],
            answer: 0,
            feedback: [
              '',
              '반대예요. 에너지가 남는 곳은 저위도이고 부족한 곳은 고위도예요.',
              '대순환은 받는 에너지의 총량을 바꾸지 않아요. 에너지를 위도 사이에서 옮겨 줘요.',
              '대순환은 에너지를 옮기는 역할을 해요. 지구가 빛을 반사하는 정도와는 관계가 없어요.',
            ],
            explain: '대기 대순환은 에너지가 <b>남는 저위도</b>의 열을 <b>부족한 고위도</b>로 운반해요. 이 <b>에너지 재분배</b> 덕분에 저위도는 덜 뜨겁고 고위도는 덜 차가워요.',
          },
          {
            type: 'quiz', title: '🛰️ 우리나라 날씨는 어느 쪽에서 올까?',
            goal: '위성 영상에서 구름과 <b>황사</b>가 움직이는 모습을 봐요. 우리나라(중위도)의 날씨 변화와 황사는 어느 쪽에서 오는 경우가 많을까요?',
            setup() { setScene('sat'); },
            choices: ['서쪽(중국 쪽)', '동쪽(태평양 쪽)', '남쪽 적도 쪽에서만', '북극에서만'],
            answer: 0,
            feedback: [
              '',
              '중위도에서는 서쪽에서 동쪽으로 부는 바람(편서풍)이 불어서 날씨가 동쪽으로 옮겨 가요.',
              '남쪽에서 오는 경우도 있지만, 중위도 지방의 날씨는 대체로 서쪽에서 동쪽으로 옮겨 가요.',
              '북쪽에서 오는 경우도 있지만, 대체로 서쪽에서 동쪽으로 옮겨 가요.',
            ],
            explain: '우리나라는 <b>편서풍</b> 지역이라서 날씨가 대체로 <b>서쪽에서 동쪽으로</b> 변해요. 황사도 서쪽에 있는 사막 지역에서 편서풍을 타고 우리나라로 날아와요.',
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
    S, dnd, MARKS, WINDS, game: () => game, view: activeView, setScene, Aenergy, Eenergy,
    client(x, y) { const V = activeView(), r = V.v.canvas.getBoundingClientRect(); return { x: r.left + x * r.width / V.L.vw, y: r.top + y * r.height / V.L.vh }; },
    markClient(lat) { const V = activeView(), G = geo(V.L), R = cellRegion(G.M.w, G.M.h, 'main'); return this.client(G.M.x + LATX(R, lat), G.M.y + R.ty - 26 * V.L.fs); },
    cardClient(id) { const it = dnd.get(id); return this.client(it.x, it.y); },
    bandClient(b) { const V = activeView(); layoutWind(V); const s = dnd.slots.find((q) => q.id === b); return this.client(s.x + s.w / 2, s.y + s.h / 2); },
    globeClient(lat) { const V = activeView(), M = geo(V.L).M, FG = flashGeo(M, V.L); return this.client(M.x + FG.gcx - FG.R * 0.5, M.y + FG.gcy - FG.R * Math.sin(lat * DEG)); },
    bench(n) { const V = activeView(); const t0 = performance.now(); for (let i = 0; i < n; i++) { draw(V, nowS()); V.ctx.getImageData(0, 0, 1, 1); } return (performance.now() - t0) / n; },
  };
})();
