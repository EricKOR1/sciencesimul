(function () {
  'use strict';
  /* ===== 공통 도우미 (이 차시 안에 포함) ===== */
  const { $, $$, clamp, Sound } = SciSim;
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const RM = SciSim.reduceMotion;
  const TAU = Math.PI * 2, DEG = Math.PI / 180;
  const mark = (b) => (b ? '✅' : '⬜');
  const smooth = (x) => { const t = clamp(x, 0, 1); return t * t * (3 - 2 * t); };
  const lerp = (a, b, t) => a + (b - a) * t;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const approach = (cur, tgt, dt, rate) => (RM ? tgt : SciSim.approach(cur, tgt, dt, rate));
  const josa = (word, pair) => {
    const ch = String(word).charCodeAt(String(word).length - 1);
    const has = ch >= 0xac00 && ch <= 0xd7a3 && (ch - 0xac00) % 28 !== 0;
    const [a, b] = pair.split('/');
    return has ? a : b;
  };
  const mod360 = (a) => ((a % 360) + 360) % 360;
  const angDiff = (a, b) => ((b - a + 540) % 360) - 180;           // a에서 b로 가는 가장 짧은 각 차이
  const angApproach = (cur, tgt, dt, rate) => (RM ? mod360(tgt) : mod360(cur + angDiff(cur, tgt) * (1 - Math.exp(-rate * dt))));
  const COMPASS = ['북', '북동', '동', '남동', '남', '남서', '서', '북서'];
  const windName = (deg) => COMPASS[Math.round(mod360(deg) / 45) % 8];
  const f1 = (x) => (Math.round(x * 10) / 10).toFixed(1);
  const sg = (x) => (x >= 0 ? '+' : '−') + Math.abs(x);

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
  const T = (x, y, s, o) => D.text(x, y, s, o);                    // 짧은 글자 그리기

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
    return out.filter((l, i) => l !== '' || i < out.length - 1);
  }
  function drawWrap(x, y, text, maxW, size, o) {
    o = o || {};
    const lines = wrapLines(text, maxW, size, o.weight), lh = size * FS * (o.lh || 1.3);
    lines.forEach((l, i) => D.text(x, y + i * lh, l, { size, weight: o.weight || 700, color: o.color || '#334155', align: o.align || 'center', alpha: o.alpha }));
    return y + (lines.length - 1) * lh;
  }
  /* 말풍선: 반투명 흰 판 + 글, 높이를 돌려줘요 */
  function note(x, y, w, text, size, o) {
    o = o || {};
    const lines = wrapLines(text, w - 22, size, 700), lh = size * FS * 1.3, h = lines.length * lh + 12;
    D.shadow(() => { ctx.fillStyle = o.bg || 'rgba(255,255,255,.93)'; rr(x, y, w, h, 11).fill(); }, { blur: 5, y: 2 });
    if (o.border) { ctx.strokeStyle = o.border; ctx.lineWidth = 2; rr(x, y, w, h, 11).stroke(); }
    lines.forEach((l, i) => D.text(x + w / 2, y + 8 + size * FS * 0.82 + i * lh, l, { size, weight: 700, color: o.color || '#334155' }));
    return h;
  }

  /* ===== 카드 보드: 카드를 칸(zone)에 끌어다 놓기 / 눌러서 고르고 칸 누르기 ===== */
  class Board {
    constructor(o) {
      this.zones = o.zones || []; this.tray = o.tray; this.cw = o.cw; this.ch = o.ch; this.gap = o.gap == null ? 8 : o.gap;
      this.onDrop = o.onDrop || (() => true); this.onPlace = o.onPlace || (() => {}); this.onReject = o.onReject || (() => {});
      this.cards = []; this.drag = null; this.selected = null; this.hoverZone = null; this.enabled = true;
    }
    add(c) {
      c.w = c.w || this.cw; c.h = c.h || this.ch; c.zone = c.zone || null; c.lift = 0; c.shake = 0;
      c.ord = this.cards.length; c.size = 15;
      for (let s = 15; s >= 13; s--) { c.size = s; c.lines = wrapLines(c.label, c.w - 14, s, 800); if (c.lines.length <= 2) break; }
      c.x = c.tx = c.x || 0; c.y = c.ty = c.y || 0; this.cards.push(c); return c;
    }
    inZone(id) { return this.cards.filter((c) => c.zone === id); }
    layout(snap) {
      const trayCards = this.cards.filter((c) => !c.zone).sort((a, b) => a.ord - b.ord), Tr = this.tray;
      if (Tr) {
        const n = trayCards.length, tot = n * this.cw + (n - 1) * this.gap;
        trayCards.forEach((c, i) => { c.tx = Tr.x + (Tr.w - tot) / 2 + this.cw / 2 + i * (this.cw + this.gap); c.ty = Tr.y + Tr.h / 2; });
      }
      this.zones.forEach((z) => { this.inZone(z.id).forEach((c) => { c.tx = z.x + z.w / 2; c.ty = z.y + z.h / 2; }); });
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
        if (Math.abs(p.x - c.x) <= c.w / 2 && Math.abs(p.y - c.y) <= c.h / 2) return c;
      }
      return null;
    }
    zoneAt(p) {
      for (let i = this.zones.length - 1; i >= 0; i--) {
        const z = this.zones[i];
        if (p.x >= z.x - 6 && p.x <= z.x + z.w + 6 && p.y >= z.y - 6 && p.y <= z.y + z.h + 6) return z;
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
      if (this.selected) { const z = this.zoneAt(p); if (z) { const s = this.selected; s.sel = false; this.selected = null; this.place(s, z); return true; } }
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
        return;
      }
      if (this.selected) { this.selected.sel = false; this.selected = null; }
      const z = this.zoneAt(p);                                     // 놓는 곳은 포인터 위치로 판정
      if (z) this.place(c, z); else { c.zone = null; this.layout(); }
    }
    place(c, z) {
      const res = this.onDrop(c, z);
      if (res !== true) { c.zone = null; c.shake = 0.45; Sound.fail(); this.onReject(c, z, typeof res === 'string' ? res : ''); this.layout(); return; }
      this.inZone(z.id).filter((x) => x !== c).forEach((x) => { x.zone = null; });   // 한 칸에는 카드 한 장
      c.zone = z.id; this.layout();
      Sound.tick();
      parts.burst(c.tx, c.ty, { count: 8, speed: 90, size: 3, life: 0.5, colors: [z.color || '#16a34a', '#fff'] });
      this.onPlace(c, z);
    }
    drawCard(c) {
      const sc = 1 + c.lift * 0.07, sh = c.shake > 0 ? Math.sin(c.shake * 50) * 5 : 0;
      ctx.save(); ctx.translate(c.x + sh, c.y - c.lift * 3); ctx.scale(sc, sc);
      const w = c.w, h = c.h;
      D.shadow(() => { ctx.fillStyle = c.fill || '#fff'; rr(-w / 2, -h / 2, w, h, 10).fill(); }, { blur: 3 + c.lift * 9, y: 2 + c.lift * 4 });
      ctx.strokeStyle = c.sel ? '#f59e0b' : c.border || '#cfd8e6'; ctx.lineWidth = c.sel ? 3.5 : 2; rr(-w / 2, -h / 2, w, h, 10).stroke();
      const lh = c.size * FS * 1.22, n = c.lines.length, y0 = -((n - 1) * lh) / 2 + c.size * FS * 0.36;
      c.lines.forEach((l, i) => D.text(0, y0 + i * lh, l, { size: c.size, weight: 800, color: c.color || '#1e293b' }));
      ctx.restore();
    }
    draw(t) {
      this.zones.forEach((z) => {
        if (z.hidden) return;
        const hv = this.hoverZone === z;
        ctx.save();
        ctx.fillStyle = hv ? 'rgba(255,255,255,.85)' : 'rgba(255,255,255,.55)'; rr(z.x, z.y, z.w, z.h, 10).fill();
        ctx.setLineDash(hv ? [] : [7, 5]); ctx.strokeStyle = hv ? (z.color || '#16a34a') : (z.line || '#475569'); ctx.lineWidth = hv ? 3.5 : 2.2; rr(z.x, z.y, z.w, z.h, 10).stroke(); ctx.setLineDash([]);
        ctx.restore();
        if (this.selected && !this.drag && !this.inZone(z.id).length) D.ring(z.x + z.w / 2, z.y + z.h / 2, Math.min(z.w, z.h) * 0.3, t, { color: z.color || '#16a34a', speed: 0.9, width: 2 });
        if (!this.inZone(z.id).length && z.hint) D.text(z.x + z.w / 2, z.y + z.h / 2 + 5, z.hint, { size: 13, weight: 800, color: '#64748b' });
      });
      const dragC = this.drag && this.drag.c;
      this.cards.forEach((c) => { if (c !== dragC) this.drawCard(c); });
      if (dragC) this.drawCard(dragC);
    }
  }

  /* ===== 읽음 칸 · 안내 · 캔버스 위 일시 메시지 ===== */
  const rdEls = [1, 2, 3].map((i) => [$('#l' + i), $('#v' + i)]);
  let rdLast = '';
  function setReadouts(a) {
    const key = a.join('|'); if (key === rdLast) return; rdLast = key;
    for (let i = 0; i < 3; i++) { rdEls[i][0].textContent = a[i * 2]; rdEls[i][1].textContent = a[i * 2 + 1]; }
  }
  let hintTimer = null;
  function showHint(msg, ms) { const h = $('#stageHint'); if (!h) return; h.textContent = msg; h.classList.remove('hide'); clearTimeout(hintTimer); hintTimer = setTimeout(() => h.classList.add('hide'), ms || 4200); }
  const flash = { text: '', t: 0, bg: '#15803d' };
  function say(text, bad, sec) { flash.text = text; flash.t = sec || 2.8; flash.bg = bad ? '#b91c1c' : '#15803d'; }
  function drawFlash(dt, y) {
    if (flash.t <= 0) return;
    flash.t -= dt;
    const a = clamp(flash.t / 0.4, 0, 1), fs = PHONE ? 13 : 14.5;
    const lines = wrapLines(flash.text, VW - 70, fs, 800), lh = fs * FS * 1.3, h = lines.length * lh + 14;
    ctx.save(); ctx.globalAlpha = a;
    D.shadow(() => { ctx.fillStyle = flash.bg; rr(20, y, VW - 40, h, 12).fill(); }, { blur: 6, y: 2 });
    lines.forEach((l, i) => D.text(VW / 2, y + 7 + fs * FS * 0.95 + i * lh, l, { size: fs, weight: 800, color: '#fff' }));
    ctx.restore();
  }

  /* ===== 좌표축 (그래프) ===== */
  function mkAx(R, xr, yr) {
    return { R, xr, yr, x: (v) => R.x + (v - xr[0]) / (xr[1] - xr[0]) * R.w, y: (v) => R.y + R.h - (v - yr[0]) / (yr[1] - yr[0]) * R.h,
      inv: (px) => xr[0] + (px - R.x) / R.w * (xr[1] - xr[0]) };
  }
  function drawAx(ax, o) {
    const R = ax.R;
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,.94)'; rr(R.x, R.y, R.w, R.h, 6).fill();
    ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1;
    (o.yticks || []).forEach((v) => { const y = ax.y(v); ctx.beginPath(); ctx.moveTo(R.x, y); ctx.lineTo(R.x + R.w, y); ctx.stroke(); T(R.x - 5, y + 4, (o.yfmt ? o.yfmt(v) : v), { size: 12.5, weight: 700, color: '#64748b', align: 'right' }); });
    (o.xticks || []).forEach((v) => { const x = ax.x(v); ctx.beginPath(); ctx.moveTo(x, R.y); ctx.lineTo(x, R.y + R.h); ctx.stroke(); T(x, R.y + R.h + 15 * FS, (o.xfmt ? o.xfmt(v) : v), { size: 12.5, weight: 700, color: '#64748b' }); });
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.6; ctx.strokeRect(R.x, R.y, R.w, R.h);
    ctx.restore();
  }
  /* 단계(계단)·꺾은선 그리기: pts = [[x,y],...] 화면 좌표 */
  function polyline(pts, color, w, dash) {
    if (pts.length < 2) return;
    ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = w || 3; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; if (dash) ctx.setLineDash(dash);
    ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke(); ctx.restore();
  }
  /* 바람 화살표: fromDeg = 바람이 불어오는 방위 (북 0, 동 90). 화살은 바람이 불어 가는 쪽을 가리켜요 */
  function windArrow(x, y, fromDeg, len, color, w) {
    const h = (fromDeg + 180) * DEG, dx = Math.sin(h), dy = -Math.cos(h);
    const x1 = x - dx * len / 2, y1 = y - dy * len / 2, x2 = x + dx * len / 2, y2 = y + dy * len / 2;
    ctx.save(); ctx.strokeStyle = ctx.fillStyle = color || '#0f172a'; ctx.lineWidth = w || 2.6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2 - dx * 5, y2 - dy * 5); ctx.stroke();
    const hl = Math.max(7, len * 0.3), hw = hl * 0.62;
    ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x2 - dx * hl - dy * hw, y2 - dy * hl + dx * hw); ctx.lineTo(x2 - dx * hl + dy * hw, y2 - dy * hl - dx * hw); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  /* 숫자 입력(+/-) 만들기 */
  function makeStepper(box, o) {
    const wrap = document.createElement('div'); wrap.className = 'stp';
    wrap.innerHTML = '<span class="stp-l"></span><button type="button" class="stp-b" aria-label="줄이기">−</button><output class="stp-v"></output><button type="button" class="stp-b" aria-label="늘리기">+</button>';
    wrap.querySelector('.stp-l').innerHTML = o.label;
    const out = wrap.querySelector('output'), [bm, bp] = wrap.querySelectorAll('button');
    const st = { value: o.value, min: o.min, max: o.max, step: o.step || 1, el: wrap };
    const dec = o.dec || 0;
    const fmt = (v) => v.toFixed(dec) + (o.unit ? ' ' + o.unit : '');
    const set = (v, silent) => { st.value = clamp(Math.round(v / st.step) * st.step, st.min, st.max); st.value = +st.value.toFixed(dec + 2); out.textContent = fmt(st.value); if (!silent && o.onChange) o.onChange(st.value); };
    bm.addEventListener('click', () => { Sound.click(); set(st.value - st.step); });
    bp.addEventListener('click', () => { Sound.click(); set(st.value + st.step); });
    st.set = set; set(o.value, true);
    box.appendChild(wrap); return st;
  }

  /* =========================================================
     지구과학 Ⅰ. 대기와 해양의 상호작용 - 태풍의 일생과 영향 [12지구01-04]
     ① 관찰: 발생 조건(표층 수온·위도)   ② 모형: 태풍의 구조(눈·눈벽·해수면 상승)
     ③ 예측: 이동과 소멸(북태평양 고기압)   ④ 분석: 영향권 날씨(위험 반원·안전 반원)
     (모든 지도·수치는 교육용으로 단순화한 예시 자료예요)
     ========================================================= */
  initStage('#e9f1f8', 800, 560, 600, 900, 1.3);
  const sqr = (x) => x * x;

  /* ---------- 태풍 모형 (북반구, 반시계 방향으로 회전하며 중심으로 불어 들어와요) ---------- */
  const VMAX = 40, R_E = 40, R_M = 100;                         // 최대 풍속 40 m/s, 눈의 반지름 40 km, 최대 풍속 반지름 100 km (예시)
  const gProf = (r) => (r < R_E ? 0.2 * r / R_E : r <= R_M ? 0.2 + 0.8 * smooth((r - R_E) / (R_M - R_E)) : Math.pow(R_M / r, 0.8));
  const vRot = (r) => VMAX * gProf(r);                          // 중심에서 r km 떨어진 곳의 회전 풍속 (m/s)
  const rainProf = (r) => smooth((r - 25) / 25) * (90 * Math.exp(-sqr((r - 80) / 42)) + 25 * Math.exp(-sqr((r - 220) / 50)));
  const VMOVE = 8;                                              // 이동 속도 30 km/h = 약 8 m/s
  const SPD_KMH = 30;
  const windFromTy = (rx, ry) => mod360(Math.atan2(rx, ry) / DEG + 65);     // rx 동쪽, ry 북쪽 (중심에서 관측점까지, km). 불어오는 방위 = 방위 + 65°
  const CLASSES = [[17, '약'], [25, '중'], [33, '강'], [44, '매우 강']];
  const clsOf = (v) => { let c = v >= 17 ? '약' : '태풍 아님'; CLASSES.forEach(([th, n]) => { if (v >= th) c = n; }); return c; };

  /* ---------- 표층 수온 · 육지 · 지도 (예시) ---------- */
  const LON0 = 108, LON1 = 158, LAT0 = 0, LAT1 = 42;
  const sstAt = (lat, lon) => {
    const base = 29.8 - 0.0062 * lat * lat;
    const warm = 1.5 * Math.exp(-(sqr((lat - 22) / 8) + sqr((lon - 132) / 18)));
    const cold = -3.5 * Math.exp(-(sqr((lat - 33) / 6) + sqr((lon - 150) / 12)));
    const scs = 0.5 * Math.exp(-(sqr((lat - 12) / 8) + sqr((lon - 114) / 6)));
    return base + warm + cold + scs;
  };
  const LANDS = [
    [[108, 42], [134, 42], [131, 39], [129.5, 37.2], [129.2, 35.2], [127, 34.5], [126.3, 34.7], [126.5, 36.8], [126, 37.8], [125, 37.6], [124.8, 38.5], [125.5, 39.5], [124, 39.8], [121.5, 40.5], [121, 38.8], [122, 37.2], [119, 37.2], [119.5, 35.5], [121.5, 33], [121.9, 30.8], [122, 29], [121, 27], [119, 25.2], [116.5, 23], [113.5, 22], [110.5, 21.2], [109.7, 21.5], [108, 21.5]],
    [[108, 21.5], [108.2, 17], [109.3, 13.5], [109, 11.5], [108, 10.8]],
    [[120.1, 23], [121, 25.2], [122, 25], [121.5, 22.5], [120.8, 21.9]],
    [[120.2, 18.5], [122.3, 18.4], [122, 16], [121.5, 14], [124, 13], [124.2, 11], [125.5, 9.5], [126.5, 7], [126, 6], [125, 6.2], [124, 8.5], [123, 9.5], [122.5, 10.5], [121, 12], [120.5, 14.5]],
    [[130, 31.3], [131.5, 31.2], [132, 33], [134.2, 33.6], [135.2, 33.5], [136.8, 34.5], [138.5, 34.6], [140, 35], [141, 36.5], [141.5, 38.5], [142, 40], [141.5, 41.4], [140, 41], [139.8, 40], [139.5, 38], [137.5, 37], [136, 36], [133, 35.5], [131, 34.5], [129.8, 33.5], [129.9, 32.5]],
    [[140, 42], [145, 42], [145.5, 43.3], [141.5, 43.5]],
    [[108, 0], [108, 1.8], [110, 2], [112, 3.2], [114, 4.8], [116, 6.6], [117, 7], [118.5, 6], [119, 5], [117.5, 4], [116, 2.8], [115, 1], [114, 0]],
  ];
  const inPoly = (poly, lon, lat) => { let inside = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a[1] > lat) !== (b[1] > lat) && lon < (b[0] - a[0]) * (lat - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside; } return inside; };
  const onLand = (lon, lat) => LANDS.some((p) => inPoly(p, lon, lat));
  const SST_STOPS = [[14, [49, 54, 149]], [18, [69, 117, 180]], [22, [116, 173, 209]], [25.9, [171, 217, 233]], [26, [254, 224, 144]], [27.5, [253, 174, 97]], [29, [244, 109, 67]], [30.6, [215, 48, 39]]];
  function sstRGB(v) {
    if (v <= SST_STOPS[0][0]) return SST_STOPS[0][1];
    for (let i = 0; i < SST_STOPS.length - 1; i++) { const a = SST_STOPS[i], b = SST_STOPS[i + 1]; if (v <= b[0]) { const f = (v - a[0]) / (b[0] - a[0]); return [0, 1, 2].map((k) => Math.round(a[1][k] + (b[1][k] - a[1][k]) * f)); } }
    return SST_STOPS[SST_STOPS.length - 1][1];
  }
  const sstCv = document.createElement('canvas'); sstCv.width = 220; sstCv.height = 184;
  (() => {
    const c = sstCv.getContext('2d'), im = c.createImageData(220, 184);
    for (let j = 0; j < 184; j++) for (let i = 0; i < 220; i++) {
      const lon = LON0 + (i + 0.5) / 220 * (LON1 - LON0), lat = LAT1 - (j + 0.5) / 184 * (LAT1 - LAT0), v = sstAt(lat, lon), col = sstRGB(v), o = (j * 220 + i) * 4;
      const edge = Math.abs(v - 26) < 0.075;
      im.data[o] = edge ? 255 : col[0]; im.data[o + 1] = edge ? 255 : col[1]; im.data[o + 2] = edge ? 255 : col[2]; im.data[o + 3] = 255;
    }
    c.putImageData(im, 0, 0);
  })();
  /* 열대 저기압 씨앗 6개: 수온 26 °C 이상이고 위도 5° 이상인 곳에서만 발달 */
  const SEEDS = [[150, 3], [140, 13], [127, 20], [150, 30], [116, 12], [134, 29]].map(([lon, lat], i) => ({ n: i + 1, lon, lat, sst: sstAt(lat, lon), dev: sstAt(lat, lon) >= 26 && lat >= 5 }));
  const SEED_REASON = (s) => (s.lat < 5 ? '위도 5° 미만' : s.sst < 26 ? '수온 26 °C 미만' : '수온·위도 조건 만족');

  /* ---------- 경로 (북태평양 고기압의 세력별, 예시) ---------- */
  const WPS = [
    [[138, 13], [136, 18], [134, 23.5], [133, 27.5], [133.4, 31], [135.6, 34.4], [138.4, 37], [143, 40.5]],           // 약함 → 일본 쪽
    [[138, 13], [133, 17.5], [129, 22.5], [126.5, 27.5], [125.8, 31.5], [126.9, 34.9], [128.8, 38.2], [132.5, 41.5]], // 보통 → 우리나라 부근
    [[138, 13], [133, 16], [127, 19.5], [121, 22.5], [117, 23.8], [113.5, 25]],                                          // 강함 → 중국 쪽
  ];
  const DEST = ['일본 쪽', '우리나라 부근', '중국 쪽'];
  function catmull(wp, n) {
    const out = [], P = [wp[0]].concat(wp, [wp[wp.length - 1]]);
    for (let i = 1; i < P.length - 2; i++) for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t;
      const f = (a, b, c, d) => 0.5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(P[i - 1][0], P[i][0], P[i + 1][0], P[i + 2][0]), f(P[i - 1][1], P[i][1], P[i + 1][1], P[i + 2][1])]);
    }
    out.push(wp[wp.length - 1]);
    return out;
  }
  function buildTrack(wp) {
    const dense = catmull(wp, 14), km = (a, b) => Math.hypot((b[0] - a[0]) * 111 * Math.cos((a[1] + b[1]) / 2 * DEG), (b[1] - a[1]) * 111);
    const spd = (lat) => (lat < 20 ? 20 : lat < 30 ? 26 : 38);
    // 6시간마다 위치
    const samp = [{ lon: dense[0][0], lat: dense[0][1] }]; let acc = 0, need = 6 * spd(dense[0][1]);
    for (let i = 1; i < dense.length; i++) {
      let d = km(dense[i - 1], dense[i]);
      while (d >= need - acc && d > 0) { const f = (need - acc) / d; const lon = lerp(dense[i - 1][0], dense[i][0], f), lat = lerp(dense[i - 1][1], dense[i][1], f); samp.push({ lon, lat }); dense[i - 1] = [lon, lat]; d = km(dense[i - 1], dense[i]); acc = 0; need = 6 * spd(lat); }
      acc += d;
    }
    samp.push({ lon: wp[wp.length - 1][0], lat: wp[wp.length - 1][1] });
    // 강도 변화
    let V = 18, landIdx = -1, endIdx = samp.length - 1, endType = 'path';
    samp.forEach((s, i) => {
      s.land = onLand(s.lon, s.lat); s.sst = sstAt(s.lat, s.lon); s.t = i * 6;
      if (i > 0) {
        if (s.land) V *= 0.78;
        else { const vp = s.sst >= 26 ? 20 + 8 * (s.sst - 26) : 20 - 5 * (26 - s.sst); V += 0.22 * (clamp(vp, 0, 48) - V); }
      }
      s.V = V;
      if (s.land && landIdx < 0) landIdx = i;
    });
    if (endType === 'path' && samp[samp.length - 1].land) endType = 'land';
    for (let i = 1; i < samp.length; i++) {
      if (samp[i].land && samp[i].V < 12) { endIdx = i; endType = 'land'; break; }
      if (!samp[i].land && samp[i].lat >= 38 && landIdx >= 0) { endIdx = i; endType = 'extra'; break; }
    }
    const land = landIdx >= 0 ? samp[landIdx] : null;
    const dest = land ? (land.lon < 122 ? 2 : land.lon < 130.5 ? 1 : 0) : -1;
    return { samp: samp.slice(0, endIdx + 1), landIdx, endType, dest };
  }
  const TRACKS = WPS.map(buildTrack);

  /* ---------- 상태 ---------- */
  const S = {
    mode: 'gen', sub: '', clock: 0,
    sel: new Set(), p: 0, run: false, ran: false, seedInfo: null, energy: null,
    view: 'top', marks: { w1: null, eye: null, w2: null }, tool: null, probeT: null, pres: 1010, surgeCm: 0, surgeCmV: 0, wind: false, tide: false, windV: 0, tideV: 0,
    str: 1, strv: 1, tp: 0, tpOn: false, viewed: new Set(), pred: [null, null, null],
    ti: -10, tiv: -10, playI: false, judge: { A: null, B: null }, maxA: 40, maxB: 40, dirA: null, cases: [null, null, null, null], reveal: false, fade: 0,
  };

  /* ---------- 화면 배치 ---------- */
  const LAY = PHONE
    ? { map: { x: 10, y: 10, w: 580, h: 540 }, side: { x: 10, y: 558, w: 580, h: 330 },
        swirl: { x: 10, y: 10, w: 580, h: 262 }, sec: { x: 10, y: 280, w: 580, h: 270 }, gr: { x: 10, y: 558, w: 580, h: 332 },
        sg: { x: 10, y: 10, w: 580, h: 520 }, sgb: { x: 10, y: 538, w: 580, h: 350 },
        imap: { x: 10, y: 10, w: 580, h: 420 }, ipA: { x: 10, y: 438, w: 580, h: 222 }, ipB: { x: 10, y: 668, w: 580, h: 222 } }
    : { map: { x: 10, y: 10, w: 560, h: 500 }, side: { x: 580, y: 10, w: 210, h: 500 },
        swirl: { x: 10, y: 10, w: 300, h: 300 }, sec: { x: 320, y: 10, w: 470, h: 300 }, gr: { x: 10, y: 318, w: 780, h: 232 },
        sg: { x: 10, y: 10, w: 520, h: 530 }, sgb: { x: 540, y: 10, w: 250, h: 530 },
        imap: { x: 10, y: 10, w: 330, h: 540 }, ipA: { x: 350, y: 10, w: 440, h: 265 }, ipB: { x: 350, y: 285, w: 440, h: 265 } };
  function clipRect(R) { ctx.beginPath(); ctx.rect(R.x, R.y, R.w, R.h); ctx.clip(); }
  const mx = (lon) => LAY.map.x + (lon - LON0) / (LON1 - LON0) * LAY.map.w;
  const my = (lat) => LAY.map.y + (LAT1 - lat) / (LAT1 - LAT0) * LAY.map.h;

  /* 태풍 그림 (반시계 방향으로 회전하는 나선 구름 띠와 눈) */
  function drawTy(x, y, r, t, alpha, eyeOn) {
    if (r < 1.5) return;
    ctx.save(); ctx.globalAlpha = alpha == null ? 1 : alpha;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r * 1.15); g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(0.7, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 1.15, 0, TAU); ctx.fill();
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      for (let s = 0; s <= 1.001; s += 0.05) { const rr0 = r * (1.05 - 0.8 * s), th = i * TAU / 4 - t * 0.9 - s * 2.6; const px = x + Math.cos(th) * rr0, py = y + Math.sin(th) * rr0; s === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py); }
      ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = Math.max(1.5, r * 0.16); ctx.lineCap = 'round'; ctx.stroke();
    }
    if (eyeOn !== false && r > 7) { ctx.fillStyle = 'rgba(30,58,95,.85)'; ctx.beginPath(); ctx.arc(x, y, Math.max(2, r * 0.13), 0, TAU); ctx.fill(); }
    ctx.restore();
  }
  function mapBase(R, alpha, lonf, latf) {
    ctx.save(); clipRect(R);
    ctx.globalAlpha = alpha; ctx.imageSmoothingEnabled = true; ctx.drawImage(sstCv, R.x, R.y, R.w, R.h); ctx.globalAlpha = 1;
    LANDS.forEach((poly) => { ctx.beginPath(); poly.forEach((p, i) => { const x = lonf(p[0]), y = latf(p[1]); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.closePath(); ctx.fillStyle = '#cdd6bb'; ctx.fill(); ctx.strokeStyle = '#7c8a67'; ctx.lineWidth = 1.5; ctx.stroke(); });
    ctx.strokeStyle = 'rgba(15,23,42,.22)'; ctx.lineWidth = 1;
    for (let lon = 110; lon < LON1; lon += 10) { ctx.beginPath(); ctx.moveTo(lonf(lon), R.y); ctx.lineTo(lonf(lon), R.y + R.h); ctx.stroke(); }
    for (let lat = 10; lat < LAT1; lat += 10) { ctx.beginPath(); ctx.moveTo(R.x, latf(lat)); ctx.lineTo(R.x + R.w, latf(lat)); ctx.stroke(); }
    ctx.restore();
    for (let lon = 110; lon < LON1; lon += 10) T(lonf(lon), R.y + R.h - 4, lon + '°E', { size: 11.5, weight: 800, color: '#0f172a', stroke: 'rgba(255,255,255,.8)', strokeWidth: 3 });
    for (let lat = 10; lat < LAT1; lat += 10) T(R.x + 4, latf(lat) - 3, lat + '°N', { size: 11.5, weight: 800, color: '#0f172a', align: 'left', stroke: 'rgba(255,255,255,.8)', strokeWidth: 3 });
  }
  function drawSstLegend(x, y, w, h) {
    const g = ctx.createLinearGradient(0, y + h, 0, y);
    for (let v = 14; v <= 30.6; v += 0.4) g.addColorStop((v - 14) / 16.6, 'rgb(' + sstRGB(v).join(',') + ')');
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h); ctx.strokeStyle = '#64748b'; ctx.lineWidth = 1.5; ctx.strokeRect(x, y, w, h);
    [16, 20, 24, 28].forEach((v) => { const yy = y + h - (v - 14) / 16.6 * h; T(x + w + 5, yy + 4, v + '', { size: 11.5, weight: 800, color: '#475569', align: 'left' }); });
    const y26 = y + h - 12 / 16.6 * h; ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - 4, y26); ctx.lineTo(x + w + 4, y26); ctx.stroke();
    T(x + w + 5, y26 + 4, '26', { size: 12.5, weight: 900, color: '#b91c1c', align: 'left' });
  }

  /* ======================================================
     STEP 1: 발생 조건
     ====================================================== */
  const seedPx = (s) => [mx(s.lon), my(s.lat)];
  function drawGen(t) {
    const R = LAY.map;
    mapBase(R, 1, mx, my);
    // 위도 5° 선
    ctx.save(); clipRect(R); D.dashedLine(R.x, my(5), R.x + R.w, my(5), { color: '#0f172a', width: 2.4, dash: [8, 6] }); ctx.restore();
    T(R.x + R.w - 6, my(5) - 5, '위도 5°', { size: 12.5, weight: 800, color: '#0f172a', align: 'right', stroke: 'rgba(255,255,255,.85)', strokeWidth: 3 });
    SEEDS.forEach((s) => {
      const [x, y] = seedPx(s), picked = S.sel.has(s.n), p = S.p;
      let r = 12, alpha = 1;
      if (p > 0) { r = s.dev ? 10 + 22 * smooth(p) : 12 * (1 - 0.75 * smooth(p)); alpha = s.dev ? 1 : 1 - 0.65 * smooth(p); }
      if (p > 0) {
        drawTy(x, y, r, t, alpha, s.dev && p > 0.6);
        if (s.dev && p > 0.25 && !RM) for (let k = 0; k < 3; k++) { const f = ((t * 0.8 + k / 3 + s.n * 0.13) % 1); parts.emit({ x: x + rnd(-14, 14), y: y + 26 - f * 6, vx: 0, vy: -26, life: 0.7, size: 2.2, color: '#ef4444', shape: 'circle' }); }
        if (p > 0.9) D.label(x, y + r + 20, s.dev ? '발달!' : '약해져 사라져요', { bg: s.dev ? '#b91c1c' : '#64748b', size: 12.5, pad: 6 });
      } else {
        D.shadow(() => D.sphere(x, y, 11, '#fff', { gloss: false, dark: '#cbd5e1' }), { blur: 4, y: 1 });
        T(x, y + 5, String(s.n), { size: 13.5, weight: 900, color: '#0f172a' });
      }
      if (picked) { D.ring(x, y, p > 0 ? r + 8 : 17, t, { color: '#7c3aed', speed: 0.9, width: 3 }); if (p === 0) T(x, y - 22, '✔', { size: 16, weight: 900, color: '#7c3aed', stroke: '#fff', strokeWidth: 3 }); }
      if (S.seedInfo === s.n) { ctx.strokeStyle = '#facc15'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, 18, 0, TAU); ctx.stroke(); }
    });
    // 오른쪽(또는 아래) 안내판
    const P = LAY.side;
    D.shadow(() => { ctx.fillStyle = 'rgba(255,255,255,.96)'; rr(P.x, P.y, P.w, P.h, 12).fill(); }, { blur: 5, y: 2 });
    const L = PHONE ? { x: P.x + 14, y: P.y + 36, w: 22, h: 200 } : { x: P.x + 16, y: P.y + 44, w: 22, h: 230 };
    T(P.x + 12, P.y + 22 * FS, '표층 수온 (°C)', { size: 14, weight: 800, color: '#1e293b', align: 'left' });
    drawSstLegend(L.x, L.y, L.w, L.h);
    const ix = L.x + 70, iw = P.w - (ix - P.x) - 10;
    T(ix, L.y + 8, '흰 선 = 26 °C', { size: 13, weight: 800, color: '#334155', align: 'left' });
    T(ix, L.y + 28, '발달 조건', { size: 13, weight: 800, color: '#b91c1c', align: 'left' });
    drawWrap(ix, L.y + 48, '수온 26 °C 이상\n위도 5° 이상', iw, 13, { align: 'left', weight: 800 });
    const info = S.seedInfo ? SEEDS[S.seedInfo - 1] : null;
    const iy = L.y + L.h + (PHONE ? 22 : 30);
    if (info) {
      T(P.x + 12, iy, '씨앗 ' + info.n + ' (' + info.lon + '°E, ' + info.lat + '°N)', { size: 14, weight: 800, color: '#0f172a', align: 'left' });
      T(P.x + 12, iy + 24 * FS, '표층 수온 ' + f1(info.sst) + ' °C', { size: 14, weight: 800, color: info.sst >= 26 ? '#b91c1c' : '#1d4ed8', align: 'left' });
      T(P.x + 12, iy + 46 * FS, '위도 ' + info.lat + '°' + (info.lat >= 5 ? ' (5° 이상)' : ' (5° 미만)'), { size: 14, weight: 800, color: info.lat >= 5 ? '#15803d' : '#b91c1c', align: 'left' });
    } else drawWrap(P.x + P.w / 2, iy, '씨앗을 눌러\n위도와 수온을\n확인해 봐요', P.w - 20, 13.5, { color: '#64748b' });
    if (S.run || S.p > 0.99) T(P.x + P.w / 2, P.y + P.h - 14, S.p > 0.99 ? '결과를 확인했어요' : '시간이 흐르는 중…', { size: 13, weight: 800, color: '#7c3aed' });
  }

  /* ======================================================
     STEP 2: 태풍의 구조 (위성 영상 · 단면 · 풍속 그래프 · 해수면)
     ====================================================== */
  const SWK = () => (PHONE ? 0.4 : 0.5);                 // 위성 영상의 px/km
  function drawSwirl(t) {
    const R = LAY.swirl, cx = R.x + R.w / 2, cy = R.y + R.h / 2, k = SWK();
    ctx.save(); clipRect(R);
    ctx.fillStyle = '#0f2a5e'; ctx.fillRect(R.x, R.y, R.w, R.h);
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 300 * k); g.addColorStop(0, 'rgba(255,255,255,.55)'); g.addColorStop(0.4, 'rgba(255,255,255,.3)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, 300 * k, 0, TAU); ctx.fill();
    for (let i = 0; i < 5; i++) {                           // 나선 구름 띠 (반시계 방향으로 회전)
      ctx.beginPath();
      for (let s = 0; s <= 1.001; s += 0.02) { const r = (290 - 230 * s) * k, th = i * TAU / 5 - t * 0.25 - s * 3.4; const x = cx + Math.cos(th) * r, y = cy + Math.sin(th) * r; s === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
      ctx.strokeStyle = 'rgba(255,255,255,' + (0.7 - i * 0.04) + ')'; ctx.lineWidth = 22 * k; ctx.lineCap = 'round'; ctx.stroke();
    }
    // 눈벽(밝은 고리)과 눈
    const wr = (R_E + 25) * k;
    const wg = ctx.createRadialGradient(cx, cy, R_E * k, cx, cy, (R_M - 5) * k); wg.addColorStop(0, 'rgba(255,255,255,.98)'); wg.addColorStop(1, 'rgba(255,255,255,.55)');
    ctx.fillStyle = wg; ctx.beginPath(); ctx.arc(cx, cy, (R_M - 5) * k, 0, TAU); ctx.arc(cx, cy, R_E * k, 0, TAU, true); ctx.fill();
    ctx.fillStyle = '#16315f'; ctx.beginPath(); ctx.arc(cx, cy, R_E * k, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.15)'; ctx.beginPath(); ctx.arc(cx + 4, cy - 3, R_E * k * 0.5, 0, TAU); ctx.fill();
    // 눌러 본 시각의 위치
    if (S.probeT != null) { const x = cx + SPD_KMH * S.probeT * k; ctx.strokeStyle = '#facc15'; ctx.lineWidth = 2.5; ctx.setLineDash([6, 5]); ctx.beginPath(); ctx.moveTo(x, R.y); ctx.lineTo(x, R.y + R.h); ctx.stroke(); ctx.setLineDash([]); }
    ctx.restore();
    D.label(R.x + 10, R.y + 20 * FS, '위성 영상 (예시)', { bg: 'rgba(15,23,42,.8)', size: 13, align: 'left' });
    D.label(cx, cy + 4, '눈', { bg: 'rgba(15,23,42,.65)', size: 13, pad: 6 });
    D.label(cx + (R_E + 8) * k * 1.5 + 14, cy - (R_E + 25) * k - 8, '눈벽', { bg: '#b91c1c', size: 13, pad: 6 });
    D.label(cx - 150 * k - 36, cy - 190 * k - 6, '나선 구름 띠', { bg: '#475569', size: 13, pad: 6 });
    // 지름 눈금
    D.arrow(cx - 50 * k - 2, R.y + R.h - 16, cx + 50 * k + 2, R.y + R.h - 16, { color: '#fde68a', width: 2.2, head: 7 });
    T(cx, R.y + R.h - 22, '100 km', { size: 11.5, weight: 800, color: '#fde68a', stroke: 'rgba(15,23,42,.7)', strokeWidth: 3 });
  }
  const secK = () => LAY.sec.w / 640;
  const dotsLoop = [];
  for (let i = 0; i < 46; i++) dotsLoop.push({ s: i / 46 });
  function loopPos(s) {                                   // 순환 경로: 바다 위 안쪽으로 → 눈벽을 따라 위로 → 위에서 바깥으로 → (먼 곳에서) 내려와 다시
    const pts = [[300, 0.4], [150, 0.5], [60, 0.7], [58, 4], [64, 9], [72, 13], [150, 13.4], [300, 13], [300, 6], [300, 0.4]];
    const segs = []; let tot = 0;
    for (let i = 0; i < pts.length - 1; i++) { const d = Math.hypot((pts[i + 1][0] - pts[i][0]) * 0.03, pts[i + 1][1] - pts[i][1]) + 0.01; segs.push(d); tot += d; }
    let q = s * tot, i = 0; while (i < segs.length - 1 && q > segs[i]) { q -= segs[i]; i++; }
    const f = q / segs[i]; return { r: lerp(pts[i][0], pts[i + 1][0], f), h: lerp(pts[i][1], pts[i + 1][1], f), seg: i };
  }
  function drawSection(t) {
    const R = LAY.sec, k = secK(), cx = R.x + R.w / 2, gy = R.y + R.h - 38, ky = (R.h - 70) / 15;
    ctx.save(); clipRect(R);
    const sk = ctx.createLinearGradient(0, R.y, 0, gy); sk.addColorStop(0, '#bcd6ef'); sk.addColorStop(1, '#e8f1fa'); ctx.fillStyle = sk; ctx.fillRect(R.x, R.y, R.w, R.h);
    // 눈벽 구름 (바깥쪽으로 기울어진 적란운 벽)
    const wall = (sgn) => { ctx.beginPath(); ctx.moveTo(cx + sgn * R_E * k, gy); ctx.lineTo(cx + sgn * (R_E + 46) * k, gy); ctx.lineTo(cx + sgn * (R_E + 96) * k, gy - 13 * ky); ctx.lineTo(cx + sgn * (R_E + 46) * k, gy - 13 * ky); ctx.closePath(); const g = ctx.createLinearGradient(0, gy, 0, gy - 13 * ky); g.addColorStop(0, '#4b5563'); g.addColorStop(1, '#f8fafc'); ctx.fillStyle = g; ctx.fill(); };
    wall(1); wall(-1);
    // 바깥 구름 띠 (작은 적란운)
    [-1, 1].forEach((sg) => [150, 225].forEach((r, i) => { const x = cx + sg * r * k, h = (6 - i * 2) * ky; const g = ctx.createLinearGradient(0, gy, 0, gy - h); g.addColorStop(0, '#64748b'); g.addColorStop(1, '#f1f5f9'); ctx.fillStyle = g; rr(x - 14 * k * 1.6, gy - h, 28 * k * 1.6, h, 10).fill(); }));
    // 위쪽 퍼진 구름(권운)
    ctx.fillStyle = 'rgba(255,255,255,.9)'; rr(cx - 300 * k, gy - 14.2 * ky, 600 * k, 1.1 * ky, 8).fill();
    // 눈: 하강 기류
    [-14, 0, 14].forEach((dx) => D.arrow(cx + dx * k * 1.2, gy - 11 * ky, cx + dx * k * 1.2, gy - 3 * ky, { color: '#2563eb', width: 3, head: 9 }));
    T(cx, gy - 12.2 * ky, '하강 기류', { size: 12.5, weight: 800, color: '#1d4ed8' });
    // 바다
    ctx.fillStyle = '#2f7fc1'; ctx.fillRect(R.x, gy, R.w, R.h - (gy - R.y));
    ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 2; ctx.beginPath(); for (let x = R.x; x <= R.x + R.w; x += 4) { const y = gy + 2 + 1.6 * Math.sin(x / 9 + t * 2); x === R.x ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke();
    // 순환하는 수증기 · 공기 (열 에너지)
    dotsLoop.forEach((d) => {
      const s = (d.s + (RM ? 0 : t * 0.045)) % 1, p = loopPos(s);
      if (p.seg >= 7) return;
      [-1, 1].forEach((sg) => { const x = cx + sg * p.r * k, y = gy - p.h * ky; ctx.fillStyle = p.seg <= 1 ? 'rgba(14,165,233,.95)' : p.seg <= 4 ? 'rgba(249,115,22,.95)' : 'rgba(100,116,139,.85)'; ctx.beginPath(); ctx.arc(x, y, 3.2, 0, TAU); ctx.fill(); });
    });
    // 바다에서 올라오는 열(증발) 화살표
    [-1, 1].forEach((sg) => [100, 130].forEach((r) => D.arrow(cx + sg * r * k, gy + 20, cx + sg * r * k, gy + 4, { color: '#fde047', width: 2.6, head: 8 })));
    ctx.restore();
    T(cx, R.y + R.h - 6, '바다에서 열과 수증기 공급', { size: 12.5, weight: 800, color: '#fde68a', stroke: 'rgba(15,23,42,.55)', strokeWidth: 3 });
    D.label(R.x + 10, R.y + 20 * FS, '태풍의 단면 (예시)', { bg: 'rgba(15,23,42,.8)', size: 13, align: 'left' });
    D.label(cx + (R_E + 36) * k + 40, gy - 7 * ky, '눈벽 (적란운)', { bg: '#b91c1c', size: 12.5, pad: 6 });
    D.label(cx - 190 * k - 30, gy - 3.4 * ky, '나선 구름 띠', { bg: '#475569', size: 12.5, pad: 6 });
    T(R.x + R.w - 8, R.y + 20 * FS, '아래: 안쪽으로(파랑) → 위: 바깥으로', { size: 11.5, weight: 800, color: '#334155', align: 'right' });
    if (S.probeT != null) { const x = cx + SPD_KMH * S.probeT * k; ctx.save(); clipRect(R); ctx.strokeStyle = '#facc15'; ctx.lineWidth = 2.5; ctx.setLineDash([6, 5]); ctx.beginPath(); ctx.moveTo(x, R.y); ctx.lineTo(x, gy); ctx.stroke(); ctx.restore(); }
  }
  /* 풍속·강수 그래프: 관측점 위로 태풍의 중심이 지나갈 때 (시간 -10 ~ +10 시간, 거리 = 30 km/h × 시간) */
  const grAx = {};
  const rOfT = (tt) => SPD_KMH * Math.abs(tt);
  function drawStGraph(t) {
    const R = LAY.gr, GA = { x: R.x + 46, y: R.y + 40, w: R.w - 46 - 46, h: R.h - 40 - 34 };
    const ax = mkAx(GA, [-10, 10], [0, 50]); grAx.ax = ax;
    D.shadow(() => { ctx.fillStyle = 'rgba(255,255,255,.93)'; rr(R.x, R.y, R.w, R.h, 12).fill(); }, { blur: 5, y: 2 });
    T(R.x + 10, R.y + 22 * FS, '태풍이 관측점 위를 지나갈 때 (예시) · 풍속(m/s)과 강수(mm/h)', { size: 14, weight: 800, color: '#1e293b', align: 'left' });
    // 강수 막대
    for (let tt = -10; tt < 10; tt += 0.25) { const r = rainProf(rOfT(tt + 0.125)); if (r < 1) continue; const h = r / 100 * GA.h; ctx.fillStyle = 'rgba(37,150,235,.6)'; ctx.fillRect(ax.x(tt), GA.y + GA.h - h, ax.x(0.25) - ax.x(0) + 0.6, h); }
    drawAx(ax, { xticks: [-10, -8, -6, -4, -2, 0, 2, 4, 6, 8, 10], yticks: [0, 10, 20, 30, 40, 50], xfmt: (v) => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v) });
    [0, 50, 100].forEach((v) => T(GA.x + GA.w + 5, ax.y(v * 0.5) + 4, String(v), { size: 11.5, weight: 800, color: '#0369a1', align: 'left' }));
    T(GA.x + GA.w + 5, GA.y - 8, 'mm/h', { size: 11.5, weight: 800, color: '#0369a1', align: 'left' });
    T(GA.x + GA.w / 2, R.y + R.h - 4, '시간 (h): 0 = 중심이 관측점 바로 위 · 왼쪽 → 오른쪽으로 흘러요', { size: 12, weight: 700, color: '#64748b' });
    const pts = []; for (let tt = -10; tt <= 10.001; tt += 0.2) pts.push([ax.x(tt), ax.y(vRot(rOfT(tt)))]);
    polyline(pts, '#ea580c', 3.6);
    // 사용자가 표시한 구간
    const MK = { w1: ['눈벽 ①', '#b91c1c'], eye: ['눈', '#2563eb'], w2: ['눈벽 ②', '#b91c1c'] };
    Object.keys(MK).forEach((k) => { const v = S.marks[k]; if (v == null) return; const x = ax.x(v); D.dashedLine(x, GA.y, x, GA.y + GA.h, { color: MK[k][1], width: 3, dash: [7, 5] }); D.label(x, GA.y + 14, MK[k][0], { bg: MK[k][1], size: 12.5, pad: 6 }); });
    if (S.probeT != null) { const x = ax.x(S.probeT); ctx.strokeStyle = '#facc15'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x, GA.y); ctx.lineTo(x, GA.y + GA.h); ctx.stroke(); D.shadow(() => D.sphere(x, ax.y(vRot(rOfT(S.probeT))), 6.5, '#ea580c', { gloss: true }), { blur: 4, y: 1 }); }
  }
  /* 해수면 상승 (폭풍 해일) */
  const WALL_CM = 200, WIND_CM = 80, TIDE_CM = 100;
  function drawSurge(t) {
    const R = LAY.sg, B = LAY.sgb, kc = PHONE ? 1.05 : 1.12, gy = R.y + R.h - 36, sx = (x) => R.x + (x + 300) / 600 * R.w;
    // 단면
    D.shadow(() => { ctx.fillStyle = 'rgba(255,255,255,.93)'; rr(R.x, R.y, R.w, R.h, 12).fill(); }, { blur: 5, y: 2 });
    ctx.save(); rr(R.x, R.y, R.w, R.h, 12).clip();
    const sky = ctx.createLinearGradient(0, R.y, 0, gy); sky.addColorStop(0, '#9ec5e8'); sky.addColorStop(1, '#e2eef9'); ctx.fillStyle = sky; ctx.fillRect(R.x, R.y, R.w, R.h);
    const base = gy - 70, A = S.surgeCmV, ws = S.windV, td = S.tideV;
    const hAt = (x) => td + ws * smooth((x + 100) / 340) + A * Math.exp(-sqr((x - 240) / 150));
    // 태풍(구름)
    drawTy(sx(240), R.y + 60, 42, t, 0.95, true);
    // 바다
    ctx.beginPath(); ctx.moveTo(R.x, gy + 40); for (let x = -300; x <= 300; x += 6) ctx.lineTo(sx(x), base - hAt(x) * kc + 1.2 * Math.sin(x / 14 + t * 2)); ctx.lineTo(R.x + R.w, gy + 40); ctx.closePath();
    const wg = ctx.createLinearGradient(0, base - 160, 0, gy); wg.addColorStop(0, '#4aa3df'); wg.addColorStop(1, '#1d5f9a'); ctx.fillStyle = wg; ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2; ctx.stroke();
    // 평상시 해수면(점선)
    D.dashedLine(R.x, base, R.x + R.w, base, { color: '#0f172a', width: 1.6, dash: [6, 5] }); T(R.x + 8, base - 6, '평상시 해수면', { size: 12, weight: 800, color: '#0f172a', align: 'left' });
    // 육지 · 방파제
    const cxw = sx(262);
    ctx.fillStyle = '#9a8a6a'; ctx.fillRect(cxw, base - WALL_CM * kc, R.x + R.w - cxw, gy + 40 - (base - WALL_CM * kc)); ctx.fillStyle = '#5a8f4e'; ctx.fillRect(cxw, base - WALL_CM * kc - 4, R.x + R.w - cxw, 5);
    ctx.restore();
    const total = hAt(240);
    if (total > WALL_CM) { D.label(cxw - 10, base - WALL_CM * kc - 34, '넘쳐요!', { bg: '#b91c1c', size: 13, pad: 7, align: 'right' }); if (!RM) parts.emit({ x: cxw + 4, y: base - WALL_CM * kc, vx: rnd(10, 40), vy: -rnd(20, 60), life: 0.7, size: 3, color: '#38bdf8', gravity: 160 }); }
    D.dashedLine(sx(240) - 40, base - WALL_CM * kc, R.x + R.w - 6, base - WALL_CM * kc, { color: '#b91c1c', width: 2.2, dash: [7, 5] });
    T(R.x + R.w - 8, base - WALL_CM * kc - 10, '방파제 ' + WALL_CM + ' cm', { size: 12, weight: 800, color: '#b91c1c', align: 'right', stroke: 'rgba(255,255,255,.85)', strokeWidth: 3 });
    // 눈금자 (cm): 해일이 가장 높은 곳(태풍 중심 아래)
    const rx0 = sx(232), top = base - 200 * kc;
    ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(rx0, base); ctx.lineTo(rx0, top); ctx.stroke();
    for (let c = 0; c <= 200; c += 10) { const y = base - c * kc; ctx.beginPath(); ctx.moveTo(rx0 - (c % 50 === 0 ? 12 : 7), y); ctx.lineTo(rx0, y); ctx.stroke(); if (c % 50 === 0 && c > 0) T(rx0 - 16, y + 4, c + '', { size: 11.5, weight: 800, color: '#0f172a', align: 'right', stroke: 'rgba(255,255,255,.8)', strokeWidth: 3 }); }
    T(rx0 - 16, base + 16, 'cm', { size: 11.5, weight: 800, color: '#0f172a', align: 'right' });
    D.label(R.x + 10, R.y + 20 * FS, '태풍이 해안에 다가올 때의 해수면 (세로 확대, 예시)', { bg: 'rgba(15,23,42,.82)', size: 12.5, align: 'left' });
    D.label(R.x + R.w - 10, R.y + 112, '태풍 중심 ' + S.pres + ' hPa · 주변 1010 hPa', { bg: '#b91c1c', size: 12.5, pad: 7, align: 'right' });
    // 막대: 기압 + 바람 쏠림 + 만조
    D.shadow(() => { ctx.fillStyle = 'rgba(255,255,255,.95)'; rr(B.x, B.y, B.w, B.h, 12).fill(); }, { blur: 5, y: 2 });
    T(B.x + 12, B.y + 22 * FS, '해안의 해수면 상승 (cm)', { size: 14, weight: 800, color: '#1e293b', align: 'left' });
    const bx = B.x + (PHONE ? 90 : 70), bw = PHONE ? 110 : 80, by = B.y + B.h - 50, bk = (B.h - 130) / 260;
    ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1; for (let c = 0; c <= 250; c += 50) { const y = by - c * bk; ctx.beginPath(); ctx.moveTo(bx - 40, y); ctx.lineTo(bx + bw + 20, y); ctx.stroke(); T(bx - 44, y + 4, String(c), { size: 11.5, weight: 800, color: '#64748b', align: 'right' }); }
    let acc = 0;
    [[A, '#b91c1c', '기압'], [ws, '#0d9488', '바람'], [td, '#6366f1', '만조']].forEach(([v, col, nm]) => { if (v < 0.5) return; const h = v * bk; ctx.fillStyle = col; ctx.fillRect(bx, by - (acc + v) * bk, bw, h); if (h > 16) T(bx + bw / 2, by - (acc + v / 2) * bk + 4, nm + ' ' + Math.round(v), { size: 12, weight: 800, color: '#fff' }); acc += v; });
    const wy = by - WALL_CM * bk; ctx.strokeStyle = '#b91c1c'; ctx.lineWidth = 2.5; ctx.setLineDash([7, 5]); ctx.beginPath(); ctx.moveTo(bx - 40, wy); ctx.lineTo(bx + bw + 40, wy); ctx.stroke(); ctx.setLineDash([]);
    T(bx + bw + 4, wy - 5, '방파제', { size: 11.5, weight: 800, color: '#b91c1c', align: 'left' });
    T(bx + bw / 2, by - acc * bk - 8, '합계 ' + Math.round(acc) + ' cm', { size: 13, weight: 800, color: acc > WALL_CM ? '#b91c1c' : '#0f172a' });
    T(B.x + B.w / 2, B.y + B.h - 18, acc > WALL_CM ? '방파제를 넘어 침수 위험!' : '방파제 안쪽은 안전해요', { size: 13, weight: 800, color: acc > WALL_CM ? '#b91c1c' : '#15803d' });
  }

  /* ======================================================
     STEP 3: 이동과 소멸
     ====================================================== */
  const HIGH = [{ cx: 150, rx: 17 }, { cx: 148, rx: 24 }, { cx: 148, rx: 33 }];       // 북태평양 고기압: 세력(약·보통·강)에 따른 크기 (경도 반지름)
  function trackPos(tr, f) { const n = tr.samp.length - 1, i = Math.min(n - 1, Math.floor(f)), q = f - i; const a = tr.samp[i], b = tr.samp[Math.min(n, i + 1)]; return { lon: lerp(a.lon, b.lon, q), lat: lerp(a.lat, b.lat, q), V: lerp(a.V, b.V, q), land: q < 0.5 ? a.land : b.land }; }
  function drawTrack(t) {
    const R = LAY.map, sv = S.strv, si = Math.round(sv);
    mapBase(R, 0.55, mx, my);
    // 북태평양 고기압
    const hi = Math.floor(clamp(sv, 0, 1.999)), hf = sv - hi, H = { cx: lerp(HIGH[hi].cx, HIGH[hi + 1 > 2 ? 2 : hi + 1].cx, hf), rx: lerp(HIGH[hi].rx, HIGH[hi + 1 > 2 ? 2 : hi + 1].rx, hf) };
    ctx.save(); clipRect(R);
    const hx = mx(H.cx), hy = my(30), hrx = H.rx / (LON1 - LON0) * R.w, hry = 11 / (LAT1 - LAT0) * R.h;
    const g = ctx.createRadialGradient(hx, hy, 0, hx, hy, hrx); g.addColorStop(0, 'rgba(250,204,21,.38)'); g.addColorStop(1, 'rgba(250,204,21,.1)');
    ctx.save(); ctx.translate(hx, hy); ctx.scale(1, hry / hrx); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, hrx, 0, TAU); ctx.fill(); ctx.setLineDash([8, 6]); ctx.strokeStyle = '#a16207'; ctx.lineWidth = 2.5 / (hry / hrx > 0 ? 1 : 1); ctx.stroke(); ctx.setLineDash([]); ctx.restore();
    ctx.restore();
    D.label(hx, hy, '북태평양 고기압', { bg: '#a16207', size: 13, pad: 7 });
    // 경로
    const tr = TRACKS[si], tpn = S.tp, n = tr.samp.length - 1;
    ctx.save(); clipRect(R);
    ctx.strokeStyle = '#7f1d1d'; ctx.lineWidth = 3.4; ctx.lineJoin = 'round'; ctx.beginPath();
    const upto = Math.min(tpn, n);
    for (let i = 0; i <= Math.floor(upto); i++) { const s = tr.samp[i]; i ? ctx.lineTo(mx(s.lon), my(s.lat)) : ctx.moveTo(mx(s.lon), my(s.lat)); }
    const cur = trackPos(tr, upto); ctx.lineTo(mx(cur.lon), my(cur.lat)); ctx.stroke();
    tr.samp.forEach((s, i) => { if (i > upto) return; ctx.fillStyle = i === 0 ? '#16a34a' : '#fff'; ctx.strokeStyle = '#7f1d1d'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(mx(s.lon), my(s.lat), i === 0 ? 6 : 4, 0, TAU); ctx.fill(); ctx.stroke(); });
    ctx.restore();
    // 태풍 아이콘 (강도에 비례해 크게)
    const v = cur.V, r = 8 + v * 0.55, alive = !(tpn >= n && tr.endType !== 'path');
    drawTy(mx(cur.lon), my(cur.lat), alive ? r : r * 0.6, t, alive ? 1 : 0.55, v >= 25);
    D.label(mx(cur.lon), my(cur.lat) - r - 14, Math.round(v) + ' m/s · ' + clsOf(v), { bg: v >= 33 ? '#b91c1c' : v >= 17 ? '#d97706' : '#64748b', size: 12.5, pad: 6 });
    // 사건 이름표
    if (tr.landIdx >= 0 && tpn >= tr.landIdx) { const s = tr.samp[tr.landIdx]; D.label(mx(s.lon), my(s.lat) + 22, '상륙', { bg: '#7f1d1d', size: 12.5, pad: 6 }); }
    if (tpn >= n && tr.endType !== 'path') { const s = tr.samp[n]; D.label(mx(s.lon), my(s.lat) + (tr.landIdx >= 0 ? 44 : 22), tr.endType === 'land' ? '소멸 (상륙 후 약화)' : '중위도 저기압으로 변질', { bg: '#475569', size: 12.5, pad: 6 }); }
    D.label(R.x + 10, R.y + 20 * FS, '태풍의 이동 경로 (예시)', { bg: 'rgba(15,23,42,.82)', size: 13, align: 'left' });
    // 강도 변화 곡선
    const P = LAY.side;
    D.shadow(() => { ctx.fillStyle = 'rgba(255,255,255,.96)'; rr(P.x, P.y, P.w, PHONE ? 330 : 270, 12).fill(); }, { blur: 5, y: 2 });
    T(P.x + 10, P.y + 22 * FS, '최대 풍속 (m/s)', { size: 14, weight: 800, color: '#1e293b', align: 'left' });
    const GA = { x: P.x + 40, y: P.y + 40, w: P.w - 40 - 12, h: (PHONE ? 330 : 270) - 40 - 34 };
    const maxT = Math.max(...TRACKS.map((q) => q.samp.length - 1)) * 6 / 24;       // 일
    const axd = mkAx(GA, [0, Math.ceil(maxT * 2) / 2], [0, 50]);
    drawAx(axd, { xticks: [0, 1, 2, 3, 4, 5, 6, 7].filter((q) => q <= axd.xr[1]), yticks: [0, 17, 25, 33, 44], xfmt: (q) => q + '일' });
    [[17, '약'], [25, '중'], [33, '강'], [44, '매우 강']].forEach(([q, nm]) => { T(GA.x + GA.w - 2, axd.y(q) - 3, nm, { size: 11, weight: 800, color: '#94a3b8', align: 'right' }); });
    const vp = []; for (let i = 0; i <= Math.floor(upto); i++) vp.push([axd.x(i * 6 / 24), axd.y(tr.samp[i].V)]);
    vp.push([axd.x(upto * 6 / 24), axd.y(cur.V)]);
    polyline(vp, '#ea580c', 3.4);
    D.shadow(() => D.sphere(axd.x(upto * 6 / 24), axd.y(cur.V), 6, '#ea580c', { gloss: true }), { blur: 4, y: 1 });
    T(P.x + P.w / 2, P.y + (PHONE ? 330 : 270) - 8, '지나간 시간 (일)', { size: 11.5, weight: 700, color: '#64748b' });
    // 정보
    const iy = P.y + (PHONE ? 330 : 270) + 14;
    if (!PHONE) {
      D.shadow(() => { ctx.fillStyle = 'rgba(255,255,255,.96)'; rr(P.x, iy, P.w, P.h - 270 - 14 + 40, 12).fill(); }, { blur: 5, y: 2 });
      drawWrap(P.x + P.w / 2, iy + 22, ['고기압이 약해요', '고기압이 보통이에요', '고기압이 강해요'][si] + '\n경로: ' + DEST[tr.dest], P.w - 20, 13.5, { weight: 800 });
      drawWrap(P.x + P.w / 2, iy + 62, '수온이 높은 바다 위에서 강해지고, 상륙하면 약해져요', P.w - 20, 12.5, { color: '#475569' });
    }
  }

  /* ======================================================
     STEP 4: 영향권 날씨
     ====================================================== */
  const IK = () => (PHONE ? 0.62 : 0.66);
  const iMx = (x) => LAY.imap.x + LAY.imap.w / 2 + x * IK() - (PHONE ? 0 : 0), iMy = (y) => LAY.imap.y + LAY.imap.h / 2 - y * IK() + (PHONE ? 0 : 0);
  const obsOf = { A: 100, B: -100 };
  const spdOf = (who, tt) => vRot(Math.hypot(obsOf[who], SPD_KMH * tt)) + (who === 'A' ? VMOVE : -VMOVE);
  const dirOf = (who, tt) => windFromTy(obsOf[who], -SPD_KMH * tt);
  const SEC_T = [-10, -8, -6, -4, -2, 0, 2, 4, 6, 8, 10];
  const impAx = {};
  function drawImpactMap(t) {
    const R = LAY.imap, tt = S.tiv, cy = SPD_KMH * tt;
    ctx.save(); clipRect(R);
    ctx.fillStyle = '#cfe3f6'; ctx.fillRect(R.x, R.y, R.w, R.h);
    ctx.fillStyle = '#dfe9d2'; ctx.beginPath(); ctx.moveTo(iMx(170), R.y);
    for (let y = 450; y >= -450; y -= 15) ctx.lineTo(iMx(170 + 18 * Math.sin(y / 60)), iMy(y));
    ctx.lineTo(R.x + R.w, R.y + R.h); ctx.lineTo(R.x + R.w, R.y); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(71,85,105,.2)'; ctx.lineWidth = 1;
    for (let x = -400; x <= 400; x += 100) { ctx.beginPath(); ctx.moveTo(iMx(x), R.y); ctx.lineTo(iMx(x), R.y + R.h); ctx.stroke(); }
    for (let y = -400; y <= 400; y += 100) { ctx.beginPath(); ctx.moveTo(R.x, iMy(y)); ctx.lineTo(R.x + R.w, iMy(y)); ctx.stroke(); }
    // 위험 반원 · 안전 반원 (확인한 뒤에만 색으로 보여 줘요)
    if (S.reveal || (game && game.free)) {
      ctx.fillStyle = 'rgba(239,68,68,.22)'; ctx.beginPath(); ctx.moveTo(iMx(0), iMy(cy)); ctx.arc(iMx(0), iMy(cy), 260 * IK(), -Math.PI / 2, Math.PI / 2); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(37,99,235,.18)'; ctx.beginPath(); ctx.moveTo(iMx(0), iMy(cy)); ctx.arc(iMx(0), iMy(cy), 260 * IK(), Math.PI / 2, 3 * Math.PI / 2); ctx.closePath(); ctx.fill();
    }
    // 경로
    D.dashedLine(iMx(0), R.y, iMx(0), R.y + R.h, { color: 'rgba(127,29,29,.6)', width: 2.5, dash: [9, 7] });
    [100, 200].forEach((r) => { ctx.strokeStyle = 'rgba(71,85,105,.35)'; ctx.lineWidth = 1.4; ctx.setLineDash([3, 5]); ctx.beginPath(); ctx.arc(iMx(0), iMy(cy), r * IK(), 0, TAU); ctx.stroke(); ctx.setLineDash([]); });
    ctx.restore();
    if (S.reveal || (game && game.free)) {
      T(iMx(70), iMy(cy) + 150 * IK() + 4, '위험 반원', { size: 13, weight: 800, color: '#b91c1c', stroke: 'rgba(255,255,255,.85)', strokeWidth: 3 });
      T(iMx(-70), iMy(cy) + 150 * IK() + 4, '안전 반원', { size: 13, weight: 800, color: '#1d4ed8', stroke: 'rgba(255,255,255,.85)', strokeWidth: 3 });
    }
    drawTy(iMx(0), iMy(cy), 36 * IK() + 14, t, 1, true);
    D.arrow(iMx(0), iMy(cy) - 44 * IK() - 8, iMx(0), iMy(cy) - 44 * IK() - 40, { color: '#7f1d1d', width: 4, head: 11 });
    D.label(iMx(0) + 8, iMy(cy) - 44 * IK() - 52, '이동 ' + SPD_KMH + ' km/h', { bg: '#7f1d1d', size: 12.5, pad: 6, align: 'left' });
    ['A', 'B'].forEach((who) => {
      const x = iMx(obsOf[who]), y = iMy(0), sp = spdOf(who, tt);
      D.ring(x, y, 12, t, { color: '#7c3aed', speed: 0.8, width: 2 });
      D.shadow(() => D.sphere(x, y, 9, who === 'A' ? '#ea580c' : '#2563eb', { gloss: true }), { blur: 4, y: 1 });
      T(x, y + 4.5, who, { size: 12.5, weight: 900, color: '#fff' });
      windArrow(x + (who === 'A' ? 28 : -28), y - 30, dirAng[who], 12 + sp * 0.8, '#111827', 3.4);
    });
    D.label(R.x + 10, R.y + 20 * FS, '서해안을 따라 북상하는 태풍 (예시)', { bg: 'rgba(15,23,42,.82)', size: 12.5, align: 'left' });
    T(R.x + R.w - 8, R.y + R.h - 6, '눈금 100 km · 점선 원: 중심에서 100·200 km', { size: 11.5, weight: 700, color: '#334155', align: 'right', stroke: 'rgba(255,255,255,.8)', strokeWidth: 3 });
    T(iMx(135), R.y + 40, '육지', { size: 13, weight: 800, color: '#65a30d' }); T(iMx(-160), R.y + 40, '서해', { size: 13, weight: 800, color: '#2563eb' });
  }
  const dirAng = { A: 83, B: 47 };
  function drawImpactPlot(R, who) {
    const GA = { x: R.x + 46, y: R.y + 84, w: R.w - 46 - 14, h: R.h - 84 - 30 }, ax = mkAx(GA, [-10, 10], [0, 55]); impAx[who] = ax;
    const col = who === 'A' ? '#ea580c' : '#2563eb';
    D.shadow(() => { ctx.fillStyle = 'rgba(255,255,255,.93)'; rr(R.x, R.y, R.w, R.h, 12).fill(); }, { blur: 5, y: 2 });
    T(R.x + 10, R.y + 20 * FS, '지점 ' + who + ' (경로의 ' + (who === 'A' ? '동쪽' : '서쪽') + ' 100 km) · 풍속(m/s)·풍향', { size: 13.5, weight: 800, color: '#1e293b', align: 'left' });
    drawAx(ax, { xticks: [-10, -5, 0, 5, 10], yticks: [0, 10, 20, 30, 40, 50], xfmt: (v) => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v) + '시간' });
    const pts = []; for (let tt = -10; tt <= 10.001; tt += 0.2) pts.push([ax.x(tt), ax.y(spdOf(who, tt))]);
    polyline(pts, col, 3.6);
    SEC_T.forEach((tt) => { const x = ax.x(tt); windArrow(x, R.y + 52, dirOf(who, tt), 20, '#0f172a', 2.6); T(x, R.y + 52 + 24 * FS, Math.round(dirOf(who, tt)) + '°', { size: 11, weight: 800, color: '#475569' }); });
    T(R.x + 6, R.y + 40, '풍향', { size: 11.5, weight: 800, color: '#64748b', align: 'left' });
    const x = ax.x(clamp(S.tiv, -10, 10)); ctx.save(); ctx.strokeStyle = 'rgba(15,23,42,.75)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, R.y + 30); ctx.lineTo(x, GA.y + GA.h); ctx.stroke(); ctx.restore();
    D.shadow(() => D.sphere(x, ax.y(spdOf(who, S.tiv)), 6.5, col, { gloss: true }), { blur: 4, y: 1 });
  }

  /* ---------- 입력 ---------- */
  SciSim.pointer(view, {
    down(p) {
      if (S.mode === 'gen') {
        let best = null, bd = 28;
        SEEDS.forEach((s) => { const [x, y] = seedPx(s), d = Math.hypot(p.x - x, p.y - y); if (d < bd) { bd = d; best = s; } });
        if (best) {
          S.seedInfo = best.n; Sound.tick();
          if (S.sub === 'pick' || (game && game.free)) { if (S.sel.has(best.n)) S.sel.delete(best.n); else S.sel.add(best.n); S.p = 0; S.run = false; S.ran = false; }
          updateCtl();
        }
        return false;
      }
      if (S.mode === 'struct' && S.view === 'top') {
        const ax = grAx.ax, R = LAY.gr;
        if (ax && p.x >= ax.R.x - 4 && p.x <= ax.R.x + ax.R.w + 4 && p.y >= R.y && p.y <= R.y + R.h) {
          const tt = clamp(ax.inv(p.x), -10, 10); S.probeT = tt;
          if (S.tool) { S.marks[S.tool] = Math.round(tt * 10) / 10; Sound.tick(); parts.burst(ax.x(tt), ax.R.y + 30, { count: 8, speed: 80, size: 3, life: 0.5, colors: ['#f59e0b', '#fff'] }); }
        }
      }
      return false;
    },
  });

  /* ---------- 조작 ---------- */
  let game = null;
  const sTimeI = $('#sTimeI'), oTimeI = $('#oTimeI'), sPres = $('#sPres'), oPres = $('#oPres');
  const fmtI = (v) => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(Math.round(v * 10) / 10).toFixed(1).replace('.0', '') + '시간';
  const bI = SciSim.bindRange(sTimeI, oTimeI, fmtI, (v) => { S.ti = v; S.playI = false; updPlay(); });
  const bPres = SciSim.bindRange(sPres, oPres, (v) => v + ' hPa', (v) => { S.pres = v; });
  const setTi = (v) => { S.ti = v; bI.set(v); };
  function updPlay() { $('#playBtnI').textContent = S.playI ? '⏸ 멈춤' : '▶ 재생'; }
  $('#playBtnI').addEventListener('click', () => { Sound.click(); if (!S.playI && S.ti >= 9.9) setTi(-10); S.playI = !S.playI; updPlay(); });
  $('#bRun').addEventListener('click', () => { Sound.click(); if (S.sel.size === 0 && S.sub === 'pick') say('먼저 발달할 것 같은 씨앗을 눌러 표시해요', true); S.p = 0; S.run = true; S.ran = false; updateCtl(); });
  $('#bRunReset').addEventListener('click', () => { Sound.click(); S.p = 0; S.run = false; S.ran = false; parts.clear(); updateCtl(); });
  $('#bReplay').addEventListener('click', () => { Sound.click(); S.tp = 0; S.tpOn = true; });
  $('#bMarkClear').addEventListener('click', () => { Sound.click(); S.marks = { w1: null, eye: null, w2: null }; });
  $$('#markSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.tool = b.dataset.m; updateCtl(); }));
  $$('#stView button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.view = b.dataset.v; S.sub = S.view === 'top' ? 'eye' : 'surge'; updateCtl(); }));
  $$('#strSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.str = +b.dataset.s; S.viewed.add(S.str); S.tp = 0; S.tpOn = true; updateCtl(); }));
  $$('#surgeOpts .opt').forEach((b) => b.addEventListener('click', () => { Sound.click(); S[b.dataset.s] = !S[b.dataset.s]; updateCtl(); }));
  const stSurge = makeStepper($('#surgeAns'), { label: '📏 눈금으로 읽은 해수면 상승(기압 효과)', min: 0, max: 150, step: 5, value: 0, unit: 'cm', onChange: (v) => { S.surgeAns = v; } });
  S.surgeAns = 0;
  const stA = makeStepper($('#judgeBox'), { label: '🅰️ 지점 A의 최대 풍속', min: 20, max: 60, step: 2, value: S.maxA, unit: 'm/s', onChange: (v) => { S.maxA = v; } });
  const stB = makeStepper($('#judgeBox'), { label: '🅱️ 지점 B의 최대 풍속', min: 20, max: 60, step: 2, value: S.maxB, unit: 'm/s', onChange: (v) => { S.maxB = v; } });
  /* 에너지원 · 예측 · 판단 · 사례 (HTML) */
  const ENERGY = ['따뜻한 바다에서 증발한 수증기가 응결하며 내놓는 열', '바다 표면과 공기의 마찰열', '지구 자전이 만드는 에너지', '태양 빛이 구름을 직접 가열하는 열'];
  const energyBox = $('#energyBox');
  ENERGY.forEach((e, i) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'opt'; b.textContent = e; b.addEventListener('click', () => { Sound.click(); S.energy = i; updateCtl(); }); energyBox.appendChild(b); });
  const predBox = $('#predBox');
  predBox.innerHTML = '<span class="seg-label" style="margin-top:0">🔮 북태평양 고기압의 세력별 태풍 경로를 예측해요</span>';
  ['약해요', '보통이에요', '강해요'].forEach((nm, i) => {
    const row = document.createElement('div'); row.id = 'pr' + i; row.style.marginTop = '6px';
    row.innerHTML = '<span class="seg-label" style="margin-bottom:2px">☀️ 고기압이 ' + nm + '</span><div class="segmented dense">' + DEST.map((d, j) => '<button type="button" data-v="' + j + '">' + d + '</button>').join('') + '</div>';
    row.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.pred[i] = +b.dataset.v; row.classList.remove('bad'); updateCtl(); }));
    predBox.appendChild(row);
  });
  const judgeBox = $('#judgeBox');
  ['A', 'B'].forEach((who, i) => {
    const row = document.createElement('div'); row.id = 'jg' + who; row.style.marginTop = '4px';
    row.innerHTML = '<span class="seg-label" style="margin-bottom:2px">지점 ' + who + '는 (경로의 ' + (who === 'A' ? '동쪽' : '서쪽') + ')</span><div class="segmented dense"><button type="button" data-v="hz">위험 반원</button><button type="button" data-v="sf">안전 반원</button></div>';
    row.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.judge[who] = b.dataset.v; row.classList.remove('bad'); updateCtl(); }));
    judgeBox.insertBefore(row, stA.el);
  });
  const dirRow = document.createElement('div'); dirRow.id = 'jgDir'; dirRow.style.marginTop = '8px';
  dirRow.innerHTML = '<span class="seg-label" style="margin-bottom:2px">🧭 지점 A의 풍향은 어느 방향으로 변하나요?</span><div class="segmented dense"><button type="button" data-v="cw">↻ 시계 방향</button><button type="button" data-v="ccw">↺ 반시계 방향</button></div>';
  dirRow.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.dirA = b.dataset.v; updateCtl(); }));
  judgeBox.appendChild(dirRow);
  const CASES = [
    { t: '산지를 만난 비구름이 강제로 올라가 호우가 심해져요', a: 1 },
    { t: '중심 기압이 낮아 해수면이 올라가고 만조가 겹쳐 침수돼요', a: 0 },
    { t: '강풍이 간판과 비닐하우스 같은 시설물을 부숴요', a: 1 },
    { t: '태풍이 지나간 바다의 표층 수온이 내려가 뒤따르는 태풍이 약해져요', a: 0 },
  ];
  const caseBox = $('#caseBox');
  caseBox.innerHTML = '<span class="seg-label" style="margin-top:0">🗂️ 사례를 알맞은 상호작용으로 분류해요</span>';
  CASES.forEach((c, i) => {
    const row = document.createElement('div'); row.className = 'row-q'; row.id = 'cs' + i;
    row.innerHTML = '<span class="lab">' + (i + 1) + '. ' + c.t + '</span><div class="segmented"><button type="button" data-v="0">대기-해양</button><button type="button" data-v="1">대기-육지</button></div>';
    row.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.cases[i] = +b.dataset.v; row.classList.remove('bad'); updateCtl(); }));
    caseBox.appendChild(row);
  });

  const MODE_LABEL = { gen: '🌊 태풍의 발생 조건', struct: '🌀 태풍의 구조', track: '🧭 태풍의 이동과 소멸', impact: '💨 태풍 영향권의 날씨' };
  const MODE_LV = { gen: 0, struct: 1, track: 2, impact: 3 };
  function updateCtl() {
    $('#tbLabel').textContent = MODE_LABEL[S.mode];
    $$('#ctrlCard .control').forEach((c) => {
      const okMode = c.dataset.modes.split(' ').includes(S.mode);
      const okSub = !c.dataset.sub || (game && game.free) || c.dataset.sub === S.sub;
      c.hidden = !(okMode && okSub) || (c.dataset.free && !(game && game.free));
    });
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    const ms = $('#modeSeg'); if (ms) ms.hidden = !(game && game.free);
    $$('#stView button').forEach((b) => b.classList.toggle('on', b.dataset.v === S.view));
    $$('#markSeg button').forEach((b) => b.classList.toggle('on', b.dataset.m === S.tool));
    $$('#strSeg button').forEach((b) => b.classList.toggle('on', +b.dataset.s === S.str));
    $$('#surgeOpts .opt').forEach((b) => b.classList.toggle('on', !!S[b.dataset.s]));
    $$('#energyBox .opt').forEach((b, i) => b.classList.toggle('on', S.energy === i));
    [0, 1, 2].forEach((i) => $$('#pr' + i + ' button').forEach((b) => b.classList.toggle('on', +b.dataset.v === S.pred[i])));
    ['A', 'B'].forEach((w) => $$('#jg' + w + ' button').forEach((b) => b.classList.toggle('on', b.dataset.v === S.judge[w])));
    $$('#jgDir button').forEach((b) => b.classList.toggle('on', b.dataset.v === S.dirA));
    CASES.forEach((c, i) => $$('#cs' + i + ' button').forEach((b) => b.classList.toggle('on', +b.dataset.v === S.cases[i])));
    const gn = $('#genNote'); if (gn) gn.textContent = S.sel.size ? '발달할 것 같다고 표시한 씨앗: ' + [...S.sel].sort().join(', ') + '번 (' + S.sel.size + '개)' : '아직 표시한 씨앗이 없어요.';
  }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); enterLevel(MODE_LV[b.dataset.mode]); }));
  function setMode(m, sub) { if (S.mode !== m) { S.fade = 1; parts.clear(); } S.mode = m; S.sub = sub || ''; updateCtl(); }

  /* ---------- 읽음 칸 ---------- */
  function readouts() {
    if (S.mode === 'gen') {
      const n = S.seedInfo ? SEEDS[S.seedInfo - 1] : null;
      setReadouts(['눌러 본 씨앗', n ? n.n + '번 · ' + n.lat + '°N' : '씨앗을 눌러요', '표층 수온', n ? f1(n.sst) + ' °C' : '—', '발달 조건', n ? (n.dev ? '충족' : SEED_REASON(n)) : '—']);
    } else if (S.mode === 'struct') {
      if (S.view === 'surge') setReadouts(['중심 기압', S.pres + ' hPa', '기압 하강', (1010 - S.pres) + ' hPa', '해수면 상승(기압 효과)', Math.round(1010 - S.pres) + ' cm']);
      else { const tt = S.probeT, r = tt == null ? null : rOfT(tt); setReadouts(['눌러 본 시각', tt == null ? '그래프를 눌러요' : fmtI(tt), '중심까지 거리', r == null ? '—' : Math.round(r) + ' km', '회전 풍속', r == null ? '—' : Math.round(vRot(r)) + ' m/s']); }
    } else if (S.mode === 'track') {
      const tr = TRACKS[Math.round(S.strv)];
      setReadouts(['북태평양 고기압', ['약해요', '보통이에요', '강해요'][S.str], '경로', DEST[tr.dest], '가장 강했을 때', Math.round(Math.max(...tr.samp.map((s) => s.V))) + ' m/s (' + clsOf(Math.max(...tr.samp.map((s) => s.V))) + ')']);
    } else {
      const tt = S.ti;
      setReadouts(['시간', fmtI(tt), 'A의 풍속', Math.round(spdOf('A', tt)) + ' m/s', 'B의 풍속', Math.round(spdOf('B', tt)) + ' m/s']);
    }
  }

  /* ---------- 단계 · 미션 ---------- */
  const sameSet = () => { const truth = SEEDS.filter((s) => s.dev).map((s) => s.n); return truth.length === S.sel.size && truth.every((n) => S.sel.has(n)); };
  function enterLevel(li) {
    clearTimeout(hintTimer); S.playI = false; updPlay(); parts.clear();
    if (li === 0) { setMode('gen', 'pick'); S.p = 0; S.run = false; S.ran = false; showHint('씨앗을 눌러 위도와 수온을 확인해 봐요', 5000); }
    else if (li === 1) { setMode('struct', 'eye'); S.view = 'top'; S.probeT = null; showHint('그래프를 눌러 구간을 표시해요', 5000); }
    else if (li === 2) { setMode('track', 'pred'); S.tp = 0; S.tpOn = true; showHint('고기압의 세력을 바꾸며 경로를 비교해요', 5000); }
    else { setMode('impact', 'judge'); setTi(-10); S.tiv = -10; showHint('시간을 흘려 두 지점의 바람을 비교해요', 5000); }
    updateCtl();
  }
  const levels = [
    {
      title: '발생 조건: 따뜻한 바다와 위도', short: '발생 조건', icon: '🌊', phase: '관찰', features: ['gen'],
      intro: '<p class="si-q">❓ 탐구 질문: 태풍은 어디서 에너지를 얻고, 같은 태풍인데 왜 지역마다 바람이 다를까?</p>' +
        '<div class="si-link">🔗 <b>앞 차시(일기도·위성·레이더)에서</b> 위성과 레이더로 구름과 비를 읽었어요. 이번에는 <b>태풍</b>이 어디서 어떻게 생겨 영향을 주는지 알아봐요. <b>태풍</b>은 북서 태평양에서 발생한 <b>열대 저기압</b> 중 중심 부근 최대 풍속이 <b>17 m/s 이상</b>인 것이에요.</div>' +
        '<p>북서 태평양의 <b>표층 수온 지도</b>(예시)에 열대 저기압 씨앗 6개가 있어요. 표층 수온이 약 <b>26 °C 이상</b>이고, 적도에서 <b>위도 5° 이상</b> 떨어진 곳에서만 발달해요. 씨앗을 눌러 확인하고, 시간을 흘려 보내 예상이 맞는지 확인해요.</p>',
      setup() { enterLevel(0); },
      recap: '태풍은 표층 수온 약 26 °C 이상, 적도에서 위도 약 5° 이상 떨어진 바다에서 발생해요. 에너지원은 따뜻한 바다에서 증발한 수증기가 응결하며 내놓는 열이에요.',
      summary: '<ul><li><b>태풍</b>: 북서 태평양에서 발생한 열대 저기압 중 중심 부근 최대 풍속 <b>17 m/s 이상</b>. 강도: 약 17~25, 중 25~33, 강 33~44, 매우 강 44 m/s 이상.</li><li><b>발생 조건</b>: 표층 수온 약 <b>26~27 °C 이상</b>(수증기 공급), 적도에서 약 <b>5° 이상</b> 떨어진 바다.</li><li><b>에너지원</b>: 바다에서 증발한 수증기가 응결하며 내놓는 열. 수온이 낮은 바다 위에서는 수증기 공급이 줄어 약해져요.</li><li>이 단원의 모든 지도·수치는 예시 자료예요. 실제 자료는 기상청 날씨누리·국가태풍센터에서 확인해요.</li></ul>',
      missions: [
        {
          title: '발달 가능한 씨앗 고르기',
          goal: '씨앗 6개 중 <b>발달할 것 같은 씨앗</b>을 모두 눌러 표시하고 <b>▶ 시간 흘리기</b>로 예상이 맞는지 확인해요.',
          hint: '씨앗을 눌러 위도와 표층 수온을 확인해요. 수온 26 °C 이상이고 위도 5° 이상인 두 조건을 모두 만족해야 해요. 표시를 바꾸면 시간을 다시 흘려 보내야 해요.',
          setup() { setMode('gen', 'pick'); S.sel = new Set(); S.p = 0; S.run = false; S.ran = false; updateCtl(); },
          check: () => sameSet() && S.ran, hold: 0.4,
          status: () => mark(S.sel.size > 0) + ' 표시한 씨앗 ' + S.sel.size + '개 · ' + mark(S.ran) + ' 시간 흘려 확인 · ' + mark(sameSet() && S.ran) + ' 예상과 결과 일치',
          explain: '씨앗 ' + SEEDS.filter((s) => s.dev).map((s) => s.n).join('·') + '번은 수온 26 °C 이상, 위도 5° 이상이라 발달해요. 1번은 수온은 높지만 적도에서 너무 가까워(위도 5° 미만), 4번과 6번은 바다가 너무 차가워(26 °C 미만) 발달하지 못해요.',
        },
        {
          title: '태풍의 에너지원',
          goal: '발달하는 태풍에 붉은 화살표로 들어오는 <b>에너지</b>는 무엇일까요? 알맞은 카드를 골라 <b>✔ 확인하기</b>를 눌러요.',
          hint: '바닷물이 증발해 수증기가 되었다가 구름이 될 때(응결) 열을 내놓아요. 중3에서 배운 구름의 생성을 떠올려 봐요.',
          manual: true,
          setup() { setMode('gen', 'energy'); S.energy = null; S.p = 0.5; updateCtl(); },
          status: () => mark(S.energy != null) + ' 고른 카드 ' + (S.energy == null ? '없음' : (S.energy + 1) + '번'),
          check() { if (S.energy == null) return '에너지원 카드를 골라 주세요.'; if (S.energy !== 0) return ['', '마찰은 오히려 바람을 약하게 해요. 에너지를 공급하는 것은 아니에요.', '지구 자전은 에너지를 주지 않아요. 에너지원은 바다에서 와요.', '태풍은 구름 속에서 응결하는 수증기의 열이 에너지원이에요. 태양이 구름을 직접 가열하는 것이 아니에요.'][S.energy]; return true; },
          explain: '따뜻한 바다에서 <b>증발한 수증기</b>가 올라가 구름이 될 때 <b>응결하며 내놓는 열</b>이 태풍의 에너지원이에요. 수온이 높을수록 수증기가 많이 공급되어 태풍이 강해져요.',
        },
        {
          type: 'quiz', title: '태풍의 발생과 약화',
          goal: '태풍이 <b>찬 바다 위에서 약해지는 까닭</b>과 <b>발생하는 곳</b>에 대한 설명으로 알맞은 것은?',
          setup() { setMode('gen', ''); updateCtl(); },
          choices: ['수증기 공급이 줄어 약해져요. 적도에서 약 5° 이상 떨어진 바다에서 발생해요', '찬 바다 위에서 오히려 더 강해져요', '적도 바로 위의 바다에서 가장 많이 발생해요', '바다의 온도와 관계없이 어디서든 발생해요'],
          answer: 0,
          feedback: ['', '찬 바다에서는 수증기가 적게 공급되어 에너지가 부족해져요.', '적도에서 약 5° 이내에서는 회전하는 저기압 소용돌이가 만들어지지 않는 것이 관측 사실이에요.', '수온 약 26 °C 이상의 따뜻한 바다가 필요해요.'],
          explain: '태풍은 <b>수온 약 26 °C 이상</b>의 따뜻한 바다에서 수증기를 공급받아요. 찬 바다 위로 가면 수증기 공급이 줄어 약해져요. 또 적도에서 <b>약 5° 이상</b> 떨어진 곳에서만 회전하는 소용돌이로 발달해요.',
        },
      ],
    },
    {
      title: '태풍의 구조: 눈·눈벽과 해수면', short: '태풍의 구조', icon: '🌀', phase: '모형', features: ['struct'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 태풍은 따뜻한 바다에서 수증기의 응결열을 받아 발달한다는 것을 알았어요.</div>' +
        '<p>태풍의 중심에는 구름이 없고 바람이 약한 <b>눈</b>(하강 기류)이 있고, 그 둘레에 적란운이 둘러싼 <b>눈벽</b>(풍속·강수 최대), 바깥에는 <b>나선 모양 구름 띠</b>가 있어요. 바람은 중심을 향해 <b>반시계 방향</b>으로 불어 들어와요. 태풍이 관측점을 지날 때의 풍속·강수 그래프를 읽고, 낮은 기압이 만드는 <b>해수면 상승</b>도 알아봐요. (예시 자료)</p>',
      setup() { enterLevel(1); },
      recap: '태풍은 눈(바람 약함) – 눈벽(풍속·강수 최대) – 나선 구름 띠의 구조예요. 눈이 지나가면 바람이 잦아들었다가 반대쪽 눈벽에서 다시 강해져요. 기압이 1 hPa 낮아지면 해수면이 약 1 cm 올라요.',
      summary: '<ul><li><b>눈</b>: 하강 기류, 구름이 없고 바람이 약함. <b>눈벽</b>: 적란운이 둘러싼 곳, 풍속·강수 최대. <b>나선 구름 띠</b>: 바깥의 비구름 띠.</li><li>바람은 중심을 향해 <b>반시계 방향</b>으로 불어 들어와요(관측 사실).</li><li><b>폭풍 해일</b>: 기압 1 hPa 하강 ≈ 해수면 1 cm 상승. 주변 1010 hPa, 중심 950 hPa → 약 <b>60 cm</b>. 여기에 바람 쏠림과 만조가 겹치면 피해가 커져요.</li></ul>',
      missions: [
        {
          title: '눈과 눈벽 구간 표시하기',
          goal: '풍속 그래프에서 풍속이 가장 큰 <b>눈벽 ①</b>, 풍속이 급감하는 <b>눈</b>, 다시 풍속이 큰 <b>눈벽 ②</b>를 순서대로 눌러 표시하고 <b>✔ 확인하기</b>를 눌러요.',
          hint: '표시 도구(눈벽 ① → 눈 → 눈벽 ②)를 고른 뒤 그래프를 눌러요. 눈은 풍속이 거의 0에 가까워지는 가운데, 눈벽은 풍속이 가장 큰 양쪽이에요.',
          manual: true,
          setup() { setMode('struct', 'eye'); S.view = 'top'; S.tool = 'w1'; S.marks = { w1: null, eye: null, w2: null }; updateCtl(); },
          status: () => mark(S.marks.w1 != null) + ' 눈벽 ① · ' + mark(S.marks.eye != null) + ' 눈 · ' + mark(S.marks.w2 != null) + ' 눈벽 ②',
          check() {
            const m = S.marks;
            if (m.w1 == null || m.eye == null || m.w2 == null) return '눈벽 ①, 눈, 눈벽 ②를 모두 표시해 주세요.';
            if (!(m.w1 <= -2.6 && m.w1 >= -4.8)) return '눈벽 ①이 알맞지 않아요. 눈 앞쪽에서 풍속이 가장 큰 구간(약 −2.6시간 ~ −4.8시간)을 눌러 보세요.';
            if (!(Math.abs(m.eye) <= 1.3)) return '눈은 풍속이 거의 0에 가까워지는 가운데 구간이에요.';
            if (!(m.w2 >= 2.6 && m.w2 <= 4.8)) return '눈벽 ②가 알맞지 않아요. 눈이 지난 뒤 풍속이 다시 가장 커지는 구간을 눌러 보세요.';
            return true;
          },
          explain: '태풍이 관측점 위를 지나갈 때 풍속은 <b>눈벽(강풍·호우) → 눈(바람이 잦아듦) → 눈벽(다시 강풍)</b> 순서로 변해요. 눈 안쪽은 하강 기류라 구름이 없고 바람이 약하지만, 곧 반대쪽 눈벽이 와서 다시 강한 바람이 불어요.',
        },
        {
          title: '중심 기압과 해수면 상승',
          goal: '태풍 중심 기압을 <b>950 hPa</b>로 맞추고, 눈금자(cm)에서 읽은 <b>해수면 상승(기압 효과)</b>을 입력해요. (주변 기압 1010 hPa)',
          hint: '슬라이더를 950 hPa에 맞추면 해수면이 솟아올라요. 눈금자의 높이를 읽어요. 기압이 1 hPa 내려가면 해수면은 약 1 cm 올라요.',
          setup() { setMode('struct', 'surge'); S.view = 'surge'; bPres.set(1010); S.pres = 1010; S.wind = S.tide = false; stSurge.set(0); updateCtl(); },
          check: () => S.pres === 950 && S.surgeAns === 60, hold: 0.6,
          status: () => mark(S.pres === 950) + ' 중심 기압 ' + S.pres + ' hPa · ' + mark(S.surgeAns === 60) + ' 입력 ' + S.surgeAns + ' cm',
          explain: '주변 1010 hPa에서 중심 950 hPa이면 기압이 <b>60 hPa</b> 낮아요. 1 hPa 하강 ≈ 해수면 1 cm 상승이므로 <b>약 60 cm</b> 올라요. 여기에 <b>바람 쏠림</b>(+80 cm)과 <b>만조</b>(+100 cm)가 겹치면 합계가 방파제(200 cm)를 넘어 침수 피해가 커져요.',
        },
        {
          type: 'quiz', title: '눈이 지나갈 때의 바람',
          goal: '태풍의 <b>눈</b>이 관측점을 지나가는 동안 바람이 갑자기 <b>약해지는 까닭</b>과 그 뒤의 날씨는?',
          setup() { setMode('struct', ''); S.view = 'top'; updateCtl(); },
          choices: ['눈에서는 하강 기류가 있어 구름이 없고 바람이 약해요. 곧 반대쪽 눈벽이 와서 다시 강풍이 불어요', '태풍이 소멸해서 더 이상 바람이 불지 않아요', '눈에서는 가장 센 바람이 불어요', '눈이 지나가면 반대쪽에서는 비가 오지 않아요'],
          answer: 0,
          feedback: ['', '눈이 지나갔다고 태풍이 끝난 것이 아니에요. 눈벽이 바로 뒤에 있어요.', '풍속이 가장 센 곳은 눈벽이에요. 눈 안쪽은 약해요.', '눈이 지나가면 반대쪽 눈벽에서 강한 비바람이 다시 와요.'],
          explain: '눈은 중심의 하강 기류 때문에 구름이 없고 바람이 약해요. 하지만 눈이 지나가면 <b>반대쪽 눈벽</b>이 와서 풍향이 반대로 바뀐 강풍과 호우가 다시 나타나요. 눈이 지나갔다고 안심하면 위험해요!',
        },
      ],
    },
    {
      title: '이동과 소멸: 북태평양 고기압', short: '이동·소멸', icon: '🧭', phase: '예측', features: ['track'],
      intro: '<div class="si-link">🔗 <b>앞 단계들에서</b> 태풍이 따뜻한 바다 위에서 에너지를 얻고, 눈과 눈벽의 구조를 가진다는 것을 알았어요. 그렇다면 태풍은 어느 길로 갈까요?</div>' +
        '<p>태풍은 발생 후 무역풍을 따라 <b>서북서</b>로 가다가 <b>북태평양 고기압의 가장자리</b>를 따라 북상하고, 편서풍 영역에서 <b>북동</b>으로 방향을 바꿔요. 고기압의 세력(약·보통·강)에 따라 경로가 달라져요. 상륙하거나 찬 바다로 가거나 중위도 저기압으로 변질되며 소멸해요. (예시 경로)</p>',
      setup() { enterLevel(2); },
      recap: '북태평양 고기압이 강하면 중국 쪽, 보통이면 우리나라 부근, 약하면 일본 쪽으로 가요. 태풍은 상륙하거나 찬 바다 위로 가거나 중위도 저기압으로 변질되며 소멸해요.',
      summary: '<table class="mini"><tr><th>북태평양 고기압</th><th>태풍 경로</th></tr><tr><td>강함</td><td>중국 쪽</td></tr><tr><td>보통</td><td>우리나라 부근</td></tr><tr><td>약함</td><td>일본 쪽</td></tr></table>' +
        '<ul><li>이동: 무역풍을 따라 서북서진 → 북태평양 고기압 가장자리를 따라 북상 → 편서풍 영역에서 북동진.</li><li>소멸 원인: <b>상륙</b>(수증기 공급 차단·마찰), <b>찬 바다</b>(26 °C 미만), <b>중위도 저기압으로 변질</b>.</li><li>우리나라에는 <b>7~9월</b>에 북태평양 고기압의 가장자리가 우리나라 부근에 걸쳐서 태풍이 많이 와요.</li></ul>',
      missions: [
        {
          title: '고기압 세력별 경로 예측',
          goal: '북태평양 고기압이 <b>약할 때·보통일 때·강할 때</b> 태풍이 향하는 곳을 각각 예측한 뒤, 세력을 바꾸며 경로를 <b>모두 확인</b>해요.',
          hint: '고기압이 강하면 태풍이 고기압 아래쪽을 따라 서쪽으로 더 멀리 가고, 약하면 일찍 북상해요. 세력 버튼으로 경로를 직접 확인해 보세요.',
          setup() { setMode('track', 'pred'); S.pred = [null, null, null]; S.viewed = new Set([S.str]); updateCtl(); },
          check: () => S.pred[0] === 0 && S.pred[1] === 1 && S.pred[2] === 2 && S.viewed.size === 3, hold: 0.5,
          status: () => mark(S.pred.every((v) => v != null)) + ' 예측 ' + S.pred.filter((v) => v != null).length + ' / 3 · ' + mark(S.viewed.size === 3) + ' 확인한 경로 ' + S.viewed.size + ' / 3 · ' + mark(S.pred[0] === 0 && S.pred[1] === 1 && S.pred[2] === 2) + ' 예측이 경로와 일치',
          explain: '고기압이 <b>강하면 중국 쪽</b>, <b>보통이면 우리나라 부근</b>, <b>약하면 일본 쪽</b>으로 가요. 태풍은 북태평양 고기압의 가장자리를 따라 이동하기 때문이에요.',
        },
        {
          type: 'quiz', title: '소멸 원인과 7~9월',
          goal: '태풍이 <b>소멸하는 원인</b>과 우리나라에 <b>7~9월</b>에 오는 까닭으로 알맞은 것은?',
          setup() { setMode('track', ''); updateCtl(); },
          choices: ['상륙해 수증기 공급이 끊기고 마찰을 받거나, 찬 바다 위로 가서 약해져요. 7~9월에는 북태평양 고기압의 가장자리가 우리나라 부근에 걸쳐요', '상륙하면 오히려 수증기가 많아져 더 강해져요. 7~9월에는 우리나라 부근에서 태풍이 발생해요', '찬 바다에서도 강해지지만 상륙하면 소멸해요. 7~9월에는 편서풍이 약해요', '소멸하지 않고 계속 같은 세기로 이동해요'],
          answer: 0,
          feedback: ['', '상륙하면 바다의 수증기 공급이 끊겨 약해져요. 또 태풍은 따뜻한 바다에서 발생하며 우리나라 부근에서 생기지 않아요.', '찬 바다 위에서는 에너지원인 수증기가 부족해 약해져요.', '모든 태풍은 상륙·찬 바다·변질 중 하나로 결국 소멸해요.'],
          explain: '태풍은 <b>상륙</b>하면 수증기 공급이 끊기고 마찰을 받아, <b>찬 바다(26 °C 미만)</b> 위에서는 에너지가 부족해, 또는 <b>중위도 저기압으로 변질</b>되며 소멸해요. 7~9월에는 북태평양 고기압이 확장해 그 가장자리가 우리나라 부근에 걸치므로 태풍이 우리나라로 오기 쉬워요.',
        },
      ],
    },
    {
      title: '영향권 날씨: 위험 반원과 안전 반원', short: '영향권 날씨', icon: '💨', phase: '분석', features: ['impact'],
      intro: '<div class="si-link">🔗 <b>앞 단계들에서</b> 태풍의 구조와 이동 경로를 알았어요. 이제 같은 태풍인데 <b>지역마다 바람이 다른 까닭</b>을 풀어요.</div>' +
        '<p>북반구에서 태풍은 반시계 방향으로 회전해요. 진행 방향의 <b>오른쪽 반원</b>에서는 회전 풍속에 <b>이동 속도가 더해져</b>(위험 반원), <b>왼쪽 반원</b>에서는 <b>빼져서</b>(안전 반원) 바람이 약해요. 이동 속도 30 km/h는 약 8 m/s이고 최대 풍속은 40 m/s예요. 경로에서 동쪽 100 km의 <b>A</b>와 서쪽 100 km의 <b>B</b>를 비교해요. (예시)</p>',
      setup() { enterLevel(3); },
      recap: '진행 방향의 오른쪽은 위험 반원(풍속 48 m/s = 40 + 8), 왼쪽은 안전 반원(32 m/s = 40 − 8)이에요. 오른쪽 지점은 풍향이 시계 방향, 왼쪽 지점은 반시계 방향으로 바뀌어요.',
      summary: '<ul><li><b>위험 반원</b>: 진행 방향의 오른쪽. 풍속 = 회전 풍속 + 이동 속도 = 40 + 8 = <b>48 m/s</b>. <b>안전(가항) 반원</b>: 왼쪽. 풍속 = 40 − 8 = <b>32 m/s</b>.</li><li>풍향 변화(태풍이 북상할 때): 경로 오른쪽 지점은 동 → 남동 → 남 → 남서(<b>시계 방향</b>), 왼쪽 지점은 북동 → 북 → 북서 → 서(<b>반시계 방향</b>).</li><li>대기-해양: 해수면 상승(폭풍 해일)과 만조, 태풍이 지난 뒤 표층 수온 하강(뒤따르는 태풍 약화). 대기-육지: 산지에서의 호우, 강풍에 의한 시설물 피해.</li><li>배는 풍속이 약한 안전 반원 쪽으로 피해요. 눈이 지나갔다고 끝난 것이 아니에요.</li></ul>',
      missions: [
        {
          title: '위험 반원과 안전 반원 판정',
          goal: '시간을 흘려 두 지점의 풍속과 풍향을 비교하고, A·B가 <b>위험 반원</b>인지 <b>안전 반원</b>인지 고르고, 두 지점의 <b>최대 풍속</b>과 A의 <b>풍향 변화 방향</b>을 입력해요.',
          hint: '북쪽으로 가는 태풍의 오른쪽(동쪽)이 위험 반원이에요. 최대 풍속은 그래프의 꼭대기 값을 읽고, 풍향 화살표의 각도가 커지면 시계 방향이에요.',
          setup() { setMode('impact', 'judge'); S.judge = { A: null, B: null }; S.dirA = null; S.reveal = false; stA.set(40); stB.set(40); setTi(-10); updateCtl(); },
          check: () => S.judge.A === 'hz' && S.judge.B === 'sf' && S.maxA === 48 && S.maxB === 32 && S.dirA === 'cw', hold: 0.5,
          status: () => mark(S.judge.A === 'hz' && S.judge.B === 'sf') + ' 반원 판정 ' + ['A', 'B'].filter((w) => S.judge[w]).length + ' / 2 · ' + mark(S.maxA === 48 && S.maxB === 32) + ' 최대 풍속 A ' + S.maxA + ' · B ' + S.maxB + ' · ' + mark(S.dirA === 'cw') + ' A 풍향 ' + (S.dirA == null ? '미선택' : S.dirA === 'cw' ? '시계 방향' : '반시계 방향(다시 확인)'),
          explain: '태풍의 오른쪽(동쪽)인 <b>A는 위험 반원</b>이에요. 회전 풍속 40 m/s에 이동 속도 8 m/s가 더해져 <b>48 m/s</b>예요. 왼쪽(서쪽)인 <b>B는 안전 반원</b>이라 40 − 8 = <b>32 m/s</b>예요. A의 풍향은 동 → 남동 → 남 → 남서로 <b>시계 방향</b>으로 변해요.',
        },
        {
          title: '태풍 피해 사례 분류',
          goal: '4가지 사례를 <b>대기-해양 상호작용</b>과 <b>대기-육지 상호작용</b>으로 나누고 <b>✔ 확인하기</b>를 눌러요.',
          hint: '바다와 관련된 것(해수면, 해수 온도)은 대기-해양, 땅·산·시설물과 관련된 것은 대기-육지예요.',
          manual: true,
          setup() { S.reveal = true; setMode('impact', 'cases'); S.cases = [null, null, null, null]; updateCtl(); },
          status: () => mark(S.cases.every((v) => v != null)) + ' 분류 ' + S.cases.filter((v) => v != null).length + ' / 4',
          check() {
            if (S.cases.some((v) => v == null)) return '4가지 사례를 모두 분류해 주세요.';
            const wi = CASES.findIndex((c, i) => S.cases[i] !== c.a);
            if (wi >= 0) { const el = $('#cs' + wi); if (el) { el.classList.add('bad'); setTimeout(() => el.classList.remove('bad'), 900); } return (wi + 1) + '번 사례를 다시 생각해 봐요. 바다와 관련된 현상인가요, 땅과 관련된 현상인가요?'; }
            return true;
          },
          explain: '<b>대기-해양</b>: 낮은 기압과 바람이 해수면을 올리는 해일(만조와 겹치면 침수), 태풍이 바닷물을 섞어 표층 수온을 낮추어 뒤따르는 태풍을 약하게 해요. <b>대기-육지</b>: 산지에서 비구름이 강제로 올라가 호우가 늘어나고, 강풍이 시설물을 파손해요. 상륙하면 수증기 공급이 끊겨 약해져요.',
        },
        {
          type: 'quiz', title: '눈이 지나갔으니 끝났다고요?',
          goal: '한 학생이 "태풍의 눈이 지나갔으니 이제 안전해!"라고 말했어요. 알맞은 설명은?',
          setup() { setMode('impact', ''); updateCtl(); },
          choices: ['눈이 지나가도 반대쪽 눈벽이 와서 바람이 다시 강해져요. 배는 풍속이 약한 안전 반원 쪽으로 피해요', '눈이 지나가면 태풍이 소멸한 것이라 안전해요', '눈이 지나간 뒤에는 바람 방향만 바뀌고 세기는 약해져요', '위험 반원과 안전 반원은 바람의 세기가 같아요'],
          answer: 0,
          feedback: ['', '눈이 지나갔다고 태풍이 소멸한 것은 아니에요. 다시 강한 눈벽이 와요.', '눈 뒤의 눈벽에서는 풍속이 다시 가장 세져요.', '위험 반원은 이동 속도가 더해져 풍속이 더 세고, 안전 반원은 빼져서 약해요.'],
          explain: '눈이 지나가도 <b>반대쪽 눈벽</b>이 오면서 강한 바람과 호우가 다시 나타나요. 배가 <b>안전 반원</b> 쪽으로 피하는 까닭은 회전 풍속에서 이동 속도가 빠져 풍속이 약하고, 태풍의 진행 방향으로 밀려가지 않기 때문이에요. 실제 태풍 정보는 기상청 날씨누리·국가태풍센터에서 확인해요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'he-typhoon', mount: '#game', badge: '태풍 예보관', homeHref: '../../index.html#he',
    featureLabels: { gen: '🌊 표층 수온 지도 · 씨앗 · 시간 흘리기', struct: '🌀 위성 영상 · 단면 · 풍속 그래프 · 해수면', track: '🧭 고기압 세력 · 경로 · 강도 곡선', impact: '💨 두 지점의 풍속·풍향 그래프 · 반원 판정' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 루프 ---------- */
  let lastFree = false;
  SciSim.loop((dt, t) => {
    S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.run) { S.p = Math.min(1, S.p + dt / 4.2); if (S.p >= 1) { S.run = false; S.ran = true; updateCtl(); } }
    if (S.tpOn) { const n = TRACKS[Math.round(S.str)].samp.length - 1; S.tp = Math.min(n, S.tp + dt * 2.2); if (S.tp >= n) S.tpOn = false; }
    if (S.playI) { S.ti = Math.min(10, S.ti + dt * 2.2); bI.set(S.ti); if (S.ti >= 10) { S.playI = false; updPlay(); } }
    S.tiv = approach(S.tiv, S.ti, dt, 12); S.strv = approach(S.strv, S.str, dt, 6);
    S.surgeCm = Math.max(0, 1010 - S.pres); S.surgeCmV = approach(S.surgeCmV, S.surgeCm, dt, 7);
    S.windV = approach(S.windV, S.wind ? WIND_CM : 0, dt, 6); S.tideV = approach(S.tideV, S.tide ? TIDE_CM : 0, dt, 6);
    dirAng.A = angApproach(dirAng.A, dirOf('A', S.ti), dt, 8); dirAng.B = angApproach(dirAng.B, dirOf('B', S.ti), dt, 8);
    parts.update(dt);
    ctx.setTransform(view.scale * view.dpr, 0, 0, view.scale * view.dpr, 0, 0);
    ctx.fillStyle = '#e9f1f8'; ctx.fillRect(0, 0, VW, VH);
    if (S.mode === 'gen') drawGen(t);
    else if (S.mode === 'struct') { if (S.view === 'surge') drawSurge(t); else { drawSwirl(t); drawSection(t); drawStGraph(t); } }
    else if (S.mode === 'track') drawTrack(t);
    else { drawImpactMap(t); drawImpactPlot(LAY.ipA, 'A'); drawImpactPlot(LAY.ipB, 'B'); }
    parts.draw(ctx);
    drawFlash(dt, 10);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(255,255,255,' + S.fade * 0.85 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : approach(S.fade, 0, dt, 9); }
    readouts();
  });
  enterLevel(0);

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, SEEDS, TRACKS, DEST, LAY, grAx, impAx, vRot, spdOf, dirOf, sstAt, setTi, enterLevel, onLand, mx, my, seedPx,
    get game() { return game; },
    pick(ns) { S.sel = new Set(ns); S.p = 0; S.run = false; S.ran = false; updateCtl(); },
    finishRun() { S.p = 1; S.run = false; S.ran = true; updateCtl(); },
    setPres(v) { S.pres = v; bPres.set(v); }, setSurgeAns(v) { stSurge.set(v); },
    setImp(a) { if (a.a != null) stA.set(a.a); if (a.b != null) stB.set(a.b); },
    solveCases() { CASES.forEach((c, i) => { S.cases[i] = c.a; }); updateCtl(); },
    solvePred() { S.pred = [0, 1, 2]; S.viewed = new Set([0, 1, 2]); updateCtl(); },
  };

})();
