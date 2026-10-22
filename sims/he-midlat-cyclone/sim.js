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
     지구과학 Ⅰ. 대기와 해양의 상호작용 - 중위도 저기압과 전선 [12지구01-03]
     ① 모형: 저기압 구조(전선·온난 구역·단면)   ② 분석: 전선 통과(풍향·기압·기온 시계열)
     ③ 탐구: 고기압 통과(기압·풍향·일교차)       ④ 분석: 일기도 읽기(이동 속도·도착 시각)
     ========================================================= */
  initStage('#e9f1f8', 800, 560, 600, 840, 1.3);

  /* ---------- 물리 모형 (북반구, 교육용으로 단순화한 예시) ---------- */
  const VCYC = 50;                                   // 저기압 이동 속도 (km/h)
  const COT_W = Math.sqrt(3), COT_C = 0.5;           // 온난 전선: 동쪽에서 30° 아래 / 한랭 전선: 남남서쪽 (동서 방향 ÷ 남북 방향 = 0.5)
  const DW = [Math.cos(30 * DEG), Math.sin(30 * DEG)];             // (동, 남) 방향 단위벡터: 중심에서 온난 전선 쪽
  const DC = [-1 / Math.sqrt(5), 2 / Math.sqrt(5)];                // 중심에서 한랭 전선 쪽
  const NW = [0.5, -Math.sqrt(3) / 2];               // 온난 전선이 나아가는 쪽 (찬 공기 쪽)
  const NC = [2 / Math.sqrt(5), 1 / Math.sqrt(5)];   // 한랭 전선이 나아가는 쪽
  const W_WARM = 150, W_COLD = 90;                   // 비 구역의 폭 (km): 전선에 수직인 방향
  const SPD_W = VCYC * NW[0], SPD_C = VCYC * NC[0];  // 전선의 속도(전선에 수직): 25, 약 45 km/h
  const OBS_D = 450 / (COT_W + COT_C);               // 관측점은 경로의 남쪽 약 200 km
  const T_W = 9, T_C = 18;                           // 두 전선이 관측점을 지나는 시각
  const cxAt = (t) => COT_C * OBS_D + VCYC * (t - T_C);        // 저기압 중심의 동서 위치(관측점 기준, km)
  const pLow = (r) => 1016 - 20 * Math.exp(-Math.pow(r / 430, 2));   // 저기압 중심에서 r km 떨어진 곳의 기압
  const pHigh = (r) => 1012 + 18 * Math.exp(-Math.pow(r / 450, 2));
  const isoLow = (p) => 430 * Math.sqrt(-Math.log((1016 - p) / 20));  // 등압선 반지름
  const isoHigh = (p) => 450 * Math.sqrt(-Math.log((p - 1012) / 18));
  /* 풍향 = 바람이 불어오는 방위(북 0, 동 90). 저기압: 중심 방위 + 45° (반시계 방향으로 불어 들어와요) */
  function windLow(rx, ry) {                         // rx: 중심에서 동쪽으로, ry: 남쪽으로 (km)
    if (ry > 0) { const xw = COT_W * ry, xc = -COT_C * ry; return rx > xw ? 135 : rx > xc ? 225 : 315; }   // 남쪽: 전선 앞 남동풍, 온난 구역 남서풍, 한랭 전선 뒤 북서풍
    return mod360(Math.atan2(rx, -ry) / DEG + 45);
  }
  const windHigh = (rx, ry) => mod360(Math.atan2(rx, -ry) / DEG + 225);   // 고기압: 시계 방향으로 불어 나가요 (방위 - 135°)
  const TS = [0, 3, 6, 9, 12, 15, 18, 21, 24];
  const windS = (t) => (t < T_W ? 135 : t < T_C ? 225 : 315);
  const windN = (t) => mod360(Math.atan2(-cxAt(t), OBS_D) / DEG + 45);
  const SER = {
    south: { p: [1012, 1009, 1006, 1004, 1003, 1002, 1000, 1005, 1010], tp: [7, 7, 7, 9, 14, 15, 15, 8, 6], w: TS.map(windS) },
    north: { p: TS.map((t) => Math.round(pLow(Math.hypot(cxAt(t), OBS_D)))), tp: [6, 6, 5, 5, 4, 4, 3, 3, 2], w: TS.map((t) => Math.round(windN(t))) },
  };
  /* 관측점이 전선의 비 구역 안에 있는지 (지오메트리로 계산): 약한 비 2, 소나기 15 (mm/h) */
  function rainAt(t, obs) {
    if (obs !== 'south') return 0;
    const rx = -cxAt(t), ry = OBS_D;                 // 중심에서 관측점으로
    const dw = rx * NW[0] + ry * NW[1], dc = rx * NC[0] + ry * NC[1];
    if (dw > 0 && dw <= W_WARM) return 2;
    if (Math.abs(dc) <= W_COLD / 2) return 15;
    return 0;
  }
  const valAt = (arr, xs, t) => {
    if (t <= xs[0]) return arr[0]; if (t >= xs[xs.length - 1]) return arr[arr.length - 1];
    let i = 0; while (i < xs.length - 2 && t > xs[i + 1]) i++;
    return lerp(arr[i], arr[i + 1], (t - xs[i]) / (xs[i + 1] - xs[i]));
  };
  /* 고기압 통과 */
  const VHI = 40, HD = 250;                           // 이동 속도(km/h), 관측점은 경로의 남쪽 250 km
  const cxh = (t) => VHI * (t - 24);
  const TSH = [0, 6, 12, 18, 24, 30, 36, 42, 48];
  const rH = (t) => Math.hypot(cxh(t), HD);
  const windHN = (t) => windHigh(-cxh(t), HD);       // 고기압 중심에서 본 관측점은 동쪽(-cx)·남쪽
  const SERH = { p: TSH.map((t) => Math.round(pHigh(rH(t)))), w: TSH.map((t) => Math.round(windHN(t))) };
  const DAYS = {
    A: { name: 'A날', sky: '☀️ 맑음', mean: 13.5, range: 17, col: '#ea580c' },
    B: { name: 'B날', sky: '☁️ 흐림', mean: 10.5, range: 5, col: '#64748b' },
    C: { name: 'C날', sky: '🌧️ 비', mean: 8.5, range: 3, col: '#2563eb' },
  };
  const dayT = (d, h) => d.mean + d.range / 2 * Math.cos(TAU * (h - 15) / 24);
  /* 일기도 (12시간 간격) */
  const CH = { c0: { x: 600, y: 400 }, c12: { x: 1200, y: 400 }, B: { x: 1500, y: 600 }, P: 996, speed: 600 / 12 };
  CH.crossC = CH.c12.x - COT_C * (CH.B.y - CH.c12.y);          // B와 같은 위도에서 한랭 전선이 있는 곳
  CH.dist = CH.B.x - CH.crossC;                                // 400 km
  CH.hours = CH.dist / CH.speed;                               // 8시간

  /* ---------- 상태 ---------- */
  const S = {
    mode: 'struct', sub: '', clock: 0,
    ab: 190, abv: 190, abDrag: false, scale: [null, null, null, null],
    t: 0, tv: 0, play: false, obs: 'south', tool: null, marks: { warm: null, cold: null }, dir: null, rainW: 3, rainC: 3,
    wang: 135, th: 0, thv: 0, playH: false, maxTH: 0, pred: null, day: null, dayView: 'pass', probeT: null,
    chart: 12, cv: 12, chartTouched: false, probe: null, cP: 1000, cDist: 300, cSpd: 30, cArr: 4, fade: 0,
  };
  const wangA = { v: 135 };

  /* ---------- 화면 배치 ---------- */
  const LAY = PHONE
    ? { map1: { x: 0, y: 0, w: 600, h: 400 }, tray: { x: 8, y: 404, w: 584, h: 50 }, sec: { x: 0, y: 460, w: 600, h: 240 },
        map2: { x: 0, y: 0, w: 600, h: 300 }, pl1: { x: 6, y: 306, w: 588, h: 260 }, pl2: { x: 6, y: 574, w: 588, h: 260 },
        map3: { x: 0, y: 0, w: 600, h: 300 }, plH: { x: 6, y: 306, w: 588, h: 300 }, rangeR: { x: 6, y: 8, w: 588, h: 700 },
        map4: { x: 0, y: 0, w: 600, h: 330 } }
    : { map1: { x: 0, y: 0, w: 800, h: 300 }, tray: { x: 8, y: 304, w: 784, h: 46 }, sec: { x: 0, y: 354, w: 800, h: 206 },
        map2: { x: 0, y: 0, w: 800, h: 288 }, pl1: { x: 8, y: 296, w: 388, h: 256 }, pl2: { x: 404, y: 296, w: 388, h: 256 },
        map3: { x: 0, y: 0, w: 800, h: 288 }, plH: { x: 8, y: 296, w: 784, h: 256 }, rangeR: { x: 8, y: 8, w: 784, h: 520 },
        map4: { x: 0, y: 0, w: 800, h: 430 } };
  function mkView(R, xmin, ymin, k) {
    return { R, xmin, ymin, k, sx: (wx) => R.x + (wx - xmin) * k, sy: (wy) => R.y + (wy - ymin) * k, wx: (px) => xmin + (px - R.x) / k, wy: (py) => ymin + (py - R.y) / k };
  }
  const MV1 = PHONE ? mkView(LAY.map1, -330, -100, 0.55) : mkView(LAY.map1, -600, -130, 800 / 1500);
  const MV2 = PHONE ? mkView(LAY.map2, -900, -300, 0.4) : mkView(LAY.map2, -900, -250, 800 / 1500);
  const MV3 = PHONE ? mkView(LAY.map3, -1000, -300, 0.3) : mkView(LAY.map3, -1000, -250, 0.4);
  const MV4 = PHONE ? mkView(LAY.map4, 200, -100, 0.375) : mkView(LAY.map4, 200, -100, 0.5);
  const dRange = () => ({ lo: 60, hi: Math.min(400, (MV1.wx(MV1.R.w) - 70) / COT_W, MV1.wy(MV1.R.h - 18)) });

  /* ---------- 이름표 카드 보드 (STEP 1) ---------- */
  const NAMES = [
    { id: 'cold', label: '한랭 전선', fill: '#dbeafe', border: '#2563eb', color: '#1e3a8a', at: () => ({ x: DC[0] * 230, y: DC[1] * 230 }) },
    { id: 'warm', label: '온난 전선', fill: '#fee2e2', border: '#dc2626', color: '#7f1d1d', at: () => ({ x: DW[0] * 300, y: DW[1] * 300 }) },
    { id: 'sector', label: '온난 구역', fill: '#ffedd5', border: '#ea580c', color: '#7c2d12', at: () => ({ x: 160, y: 260 }) },
  ];
  const ZW = PHONE ? 100 : 104, ZH = 36;
  const board = new Board({
    cw: PHONE ? 118 : 120, ch: 38, gap: 10, tray: LAY.tray,
    zones: NAMES.map((n) => {
      const p = n.at(), sx = MV1.sx(p.x), sy = MV1.sy(p.y);
      return { id: n.id, x: sx - ZW / 2, y: sy - ZH / 2, w: ZW, h: ZH, color: n.border, hint: '여기에' };
    }),
    onPlace: () => {}, onReject: () => {},
  });
  NAMES.forEach((n) => board.add({ id: n.id, label: n.label, fill: n.fill, border: n.border, color: n.color }));
  board.layout(true);
  const namedOK = (id) => { const c = board.cards.find((x) => x.id === id); return !!c && c.zone === id; };

  /* ---------- 그리기: 지도 바탕 · 저기압 · 고기압 ---------- */
  function clipRect(R) { ctx.beginPath(); ctx.rect(R.x, R.y, R.w, R.h); ctx.clip(); }
  function mapBase(mv) {
    const R = mv.R;
    ctx.save(); clipRect(R);
    const g = ctx.createLinearGradient(0, R.y, 0, R.y + R.h); g.addColorStop(0, '#dbeafe'); g.addColorStop(1, '#e8f3ee');
    ctx.fillStyle = g; ctx.fillRect(R.x, R.y, R.w, R.h);
    ctx.strokeStyle = 'rgba(100,116,139,.18)'; ctx.lineWidth = 1;
    for (let x = Math.ceil(mv.wx(R.x) / 500) * 500; mv.sx(x) < R.x + R.w; x += 500) { ctx.beginPath(); ctx.moveTo(mv.sx(x), R.y); ctx.lineTo(mv.sx(x), R.y + R.h); ctx.stroke(); }
    for (let y = Math.ceil(mv.wy(R.y) / 500) * 500; mv.sy(y) < R.y + R.h; y += 500) { ctx.beginPath(); ctx.moveTo(R.x, mv.sy(y)); ctx.lineTo(R.x + R.w, mv.sy(y)); ctx.stroke(); }
    ctx.restore();
  }
  /* 방위(N)와 거리 막대 */
  function mapDeco(mv, title) {
    const R = mv.R, bx = R.x + 12, by = R.y + R.h - 16;
    const len = 500 * mv.k;
    ctx.save(); ctx.strokeStyle = '#334155'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + len, by); ctx.moveTo(bx, by - 5); ctx.lineTo(bx, by + 5); ctx.moveTo(bx + len, by - 5); ctx.lineTo(bx + len, by + 5); ctx.stroke(); ctx.restore();
    T(bx + len / 2, by - 8, '500 km', { size: 12.5, weight: 800, color: '#334155', stroke: 'rgba(255,255,255,.8)', strokeWidth: 3 });
    D.arrow(R.x + R.w - 24, R.y + 44, R.x + R.w - 24, R.y + 18, { color: '#334155', width: 3, head: 9 });
    T(R.x + R.w - 24, R.y + 58 * FS, '북', { size: 13, weight: 800, color: '#334155' });
    if (title) { const w = 14 + title.length * 12.5 * FS; D.label(R.x + 10, R.y + 20 * FS, title, { bg: 'rgba(30,41,59,.82)', size: 13, align: 'left' }); }
  }
  /* 등압선 */
  function isobars(mv, c, levels, rfun, col) {
    const cx = mv.sx(c.x), cy = mv.sy(c.y);
    levels.forEach((p) => {
      const r = rfun(p) * mv.k;
      ctx.save(); ctx.strokeStyle = col || 'rgba(71,85,105,.75)'; ctx.lineWidth = 1.7; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke(); ctx.restore();
      const R = mv.R;
      for (const a of [-90, -45, 180, 0, 90, 135]) {
        const lx = cx + Math.cos(a * DEG) * r, ly = cy + Math.sin(a * DEG) * r;
        if (lx > R.x + 24 && lx < R.x + R.w - 24 && ly > R.y + 30 && ly < R.y + R.h - 24) { T(lx, ly + 4, String(p), { size: 12, weight: 800, color: '#475569', stroke: 'rgba(255,255,255,.9)', strokeWidth: 4 }); break; }
      }
    });
  }
  /* 전선 선과 기호 (기호는 세계 좌표에 붙어 있어서 저기압과 함께 움직여요) */
  function frontLine(mv, c, dir, len, N, kind, off) {
    const x0 = mv.sx(c.x), y0 = mv.sy(c.y), L = len * mv.k;
    const col = kind === 'cold' ? '#1d4ed8' : '#dc2626';
    ctx.save(); ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 3.6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0 + dir[0] * L, y0 + dir[1] * L); ctx.stroke();
    const step = 36;
    for (let s = 26 + off; s < L - 8; s += step) {
      const px = x0 + dir[0] * s, py = y0 + dir[1] * s;
      if (kind === 'cold') {
        ctx.beginPath(); ctx.moveTo(px - dir[0] * 9, py - dir[1] * 9); ctx.lineTo(px + dir[0] * 9, py + dir[1] * 9); ctx.lineTo(px + N[0] * 15, py + N[1] * 15); ctx.closePath(); ctx.fill();
      } else {
        const aN = Math.atan2(N[1], N[0]);
        ctx.beginPath(); ctx.arc(px, py, 9, aN - Math.PI / 2, aN + Math.PI / 2); ctx.closePath(); ctx.fill();
      }
    }
    ctx.restore();
  }
  function bandPoly(mv, c, pts) {
    ctx.beginPath();
    pts.forEach((p, i) => { const x = mv.sx(c.x + p[0]), y = mv.sy(c.y + p[1]); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
    ctx.closePath();
  }
  const windDots = [];
  function spawnDot(d) { const a = Math.random() * TAU, r = 40 + Math.sqrt(Math.random()) * 560; d.rx = Math.cos(a) * r; d.ry = Math.sin(a) * r; d.age = 0; d.life = rnd(3, 6); return d; }
  for (let i = 0; i < 70; i++) { const d = spawnDot({}); d.age = rnd(0, d.life); windDots.push(d); }
  function stepDots(dt) {
    windDots.forEach((d) => {
      d.age += dt;
      const h = (windLow(d.rx, d.ry) + 180) * DEG, sp = 60;
      d.rx += Math.sin(h) * sp * dt; d.ry += -Math.cos(h) * sp * dt;
      if (d.age > d.life || Math.hypot(d.rx, d.ry) < 25) spawnDot(d);
    });
  }
  /* 저기압 전체 그리기: 옵션 {iso, arrows, dots, bands, swirl, names, widths} */
  function drawLow(mv, c, o, t) {
    const R = mv.R, cx = mv.sx(c.x), cy = mv.sy(c.y), k = mv.k;
    ctx.save(); clipRect(R);
    // 온난 구역
    bandPoly(mv, c, [[0, 0], [DW[0] * 1500, DW[1] * 1500], [DC[0] * 1500 + DW[0] * 500, DC[1] * 1500 + DW[1] * 500 + 400], [DC[0] * 1500, DC[1] * 1500]]);
    ctx.fillStyle = 'rgba(253,186,116,.40)'; ctx.fill();
    // 비 구역
    if (o.bands) {
      const L = 1500;
      bandPoly(mv, c, [[0, 0], [DW[0] * L, DW[1] * L], [DW[0] * L + NW[0] * W_WARM, DW[1] * L + NW[1] * W_WARM], [NW[0] * W_WARM, NW[1] * W_WARM]]);
      ctx.fillStyle = 'rgba(56,189,248,.34)'; ctx.fill();
      const h = W_COLD / 2;
      bandPoly(mv, c, [[-NC[0] * h, -NC[1] * h], [-NC[0] * h + DC[0] * L, -NC[1] * h + DC[1] * L], [NC[0] * h + DC[0] * L, NC[1] * h + DC[1] * L], [NC[0] * h, NC[1] * h]]);
      ctx.fillStyle = 'rgba(30,120,200,.5)'; ctx.fill();
    }
    if (o.iso) isobars(mv, c, [1000, 1004, 1008, 1012], isoLow);
    // 소용돌이 구름 띠 (반시계 방향으로 천천히 회전)
    if (o.swirl) {
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        for (let s = 0; s <= 1.0001; s += 0.04) {
          const r = (190 - 170 * s) * k * (PHONE ? 1 : 1), th = i * TAU / 3 - t * 0.35 - s * 2.3 + 0.5;
          const x = cx + Math.cos(th) * r, y = cy + Math.sin(th) * r;
          s === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 15 * k + 4; ctx.lineCap = 'round'; ctx.stroke();
      }
    }
    // 바람: 격자 화살표 / 흐르는 점
    if (o.arrows) {
      const gap = PHONE ? 70 : 78;
      for (let gx = R.x + gap / 2; gx < R.x + R.w; gx += gap) for (let gy = R.y + gap / 2; gy < R.y + R.h; gy += gap) {
        const rx = (gx - cx) / k, ry = (gy - cy) / k;
        if (Math.hypot(rx, ry) < 90 || Math.hypot(rx, ry) > 760) continue;
        windArrow(gx, gy, windLow(rx, ry), 22, 'rgba(30,58,95,.78)', 2.4);
      }
    }
    if (o.dots && !RM) {
      ctx.save(); ctx.lineCap = 'round';
      windDots.forEach((d) => {
        const h = (windLow(d.rx, d.ry) + 180) * DEG, x = cx + d.rx * k, y = cy + d.ry * k, a = Math.min(1, d.age * 2, (d.life - d.age) * 2);
        ctx.strokeStyle = 'rgba(30,58,95,' + (0.55 * a) + ')'; ctx.lineWidth = 2.4;
        ctx.beginPath(); ctx.moveTo(x - Math.sin(h) * 9, y + Math.cos(h) * 9); ctx.lineTo(x, y); ctx.stroke();
      });
      ctx.restore();
    }
    frontLine(mv, c, DC, 1500, NC, 'cold', 0);
    frontLine(mv, c, DW, 1500, NW, 'warm', 0);
    // 중심
    D.shadow(() => { D.sphere(cx, cy, 15, '#dc2626', { gloss: true }); }, { blur: 6, y: 2 });
    T(cx, cy + 5.5, '저', { size: 16, weight: 900, color: '#fff' });
    ctx.restore();
  }
  /* 이름 (전선·온난 구역) 글자표 */
  function tag(x, y, text, col) { D.label(x, y, text, { bg: col, size: 13, pad: 7 }); }

  /* ---------- 단면 (STEP 1) ---------- */
  function cloudPuff(x, y, r, tone) {
    const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.1, x, y, r);
    g.addColorStop(0, shade('#ffffff', -0.02 - tone * 0.1)); g.addColorStop(1, shade('#d4dbe6', -0.1 - tone * 0.45));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  }
  function drawSection(R, mv, d, t) {
    const gy = R.y + R.h - 22, Hh = R.h - 46, top = gy - Hh;
    const xc = mv.sx(-COT_C * d), xw = mv.sx(COT_W * d);
    const sC = 1.5, sW = 0.2;
    ctx.save(); clipRect(R);
    ctx.fillStyle = '#fbe6cc'; ctx.fillRect(R.x, R.y, R.w, R.h);                      // 따뜻한 공기
    // 찬 공기 (서쪽: 한랭 전선 뒤)
    let g = ctx.createLinearGradient(0, top, 0, gy); g.addColorStop(0, '#b7d9f3'); g.addColorStop(1, '#8cc0ea');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(R.x - 10, gy); ctx.lineTo(xc, gy); ctx.lineTo(xc - Hh * 3 / sC, gy - Hh * 3); ctx.lineTo(R.x - 10, gy - Hh * 3); ctx.closePath(); ctx.fill();
    // 찬 공기 (동쪽: 온난 전선 앞)
    const xe = R.x + R.w + 10;
    ctx.beginPath(); ctx.moveTo(xw, gy); ctx.lineTo(xe, gy); ctx.lineTo(xe, gy - sW * (xe - xw)); ctx.closePath(); ctx.fill();
    // 온난 전선 앞의 층운형 구름 (경계면을 따라 넓게)
    const bh = (x) => sW * (x - xw);
    const layer = (x0, x1, off, th, col, al) => {
      ctx.beginPath(); ctx.moveTo(x0, gy - bh(x0) - off);
      for (let x = x0; x <= x1; x += 8) ctx.lineTo(x, gy - bh(x) - off - th * Math.sin(Math.PI * (x - x0) / (x1 - x0)) * 0.55 - 2);
      for (let x = x1; x >= x0; x -= 8) ctx.lineTo(x, gy - bh(x) - off - th * 0.15);
      ctx.closePath(); ctx.fillStyle = col; ctx.globalAlpha = al; ctx.fill(); ctx.globalAlpha = 1;
    };
    const xnb = xw + 300 * mv.k;                                                      // 난층운 끝 = 비 구역 끝
    layer(xw - 4, xnb, 4, 30, '#6b7a90', 0.9);                                         // 난층운
    layer(xw + 100 * mv.k, xw + 650 * mv.k, 34, 24, '#a7b2c2', 0.85);                  // 고층운
    layer(xw + 380 * mv.k, xw + 1400 * mv.k, 62, 16, '#e5ebf3', 0.9);                  // 권층운
    for (let i = 0; i < 4; i++) { const x = xw + (520 + i * 190) * mv.k; ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x, gy - bh(x) - 88 - i * 3); ctx.quadraticCurveTo(x + 22, gy - bh(x) - 96 - i * 3, x + 52, gy - bh(x) - 86 - i * 3); ctx.stroke(); }
    // 한랭 전선의 적란운
    for (let j = 0; j < 9; j++) {
      const h = 10 + j * (Hh - 40) / 8, px = xc + 14 - h / sC * 0.5 + Math.sin(j * 2.1) * 4, r = 17 + Math.sin(j * 1.3) * 3 + (j > 5 ? 5 : 0);
      cloudPuff(px, gy - h, r, 0.9 - j * 0.1);
    }
    for (let a = 0; a < 6; a++) cloudPuff(xc + 8 + a * 15, top + 22 + Math.sin(a) * 3, 15 - a * 0.9, 0.05);                 // 모루구름
    // 비
    const rain = (x0, x1, yTopFn, gap, col, w) => {
      ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round';
      for (let x = x0; x <= x1; x += gap) {
        const yt = yTopFn(x), len = gy - yt; if (len <= 6) continue;
        const ph = RM ? 0.3 : ((t * 1.3 + x * 0.071) % 1);
        for (let q = 0; q < 2; q++) {
          const f = (ph + q * 0.5) % 1, y0 = yt + f * len;
          ctx.beginPath(); ctx.moveTo(x - 2 * f, y0); ctx.lineTo(x - 2 * f - 1.5, Math.min(gy, y0 + 9)); ctx.stroke();
        }
      }
    };
    rain(mv.sx(-COT_C * d - W_COLD / 2 / 0.894), mv.sx(-COT_C * d + W_COLD / 2 / 0.894), () => gy - 70, 5, 'rgba(30,64,175,.85)', 2);
    rain(xw, xw + 300 * mv.k, (x) => gy - bh(x) - 4, 9, 'rgba(71,85,105,.75)', 1.5);
    // 경계면 선
    ctx.strokeStyle = '#1d4ed8'; ctx.lineWidth = 2.4; ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.moveTo(xc, gy); ctx.lineTo(xc - Hh / sC, top); ctx.stroke();
    ctx.strokeStyle = '#dc2626'; ctx.beginPath(); ctx.moveTo(xw, gy); ctx.lineTo(xe, gy - sW * (xe - xw)); ctx.stroke(); ctx.setLineDash([]);
    // 지면
    ctx.fillStyle = '#7c5a3a'; ctx.fillRect(R.x, gy, R.w, R.h - (gy - R.y)); ctx.fillStyle = '#5a8f4e'; ctx.fillRect(R.x, gy, R.w, 5);
    // 전선 위치 표시
    ctx.fillStyle = '#1d4ed8'; ctx.beginPath(); ctx.moveTo(xc - 8, gy + 18); ctx.lineTo(xc + 8, gy + 18); ctx.lineTo(xc, gy + 4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#dc2626'; ctx.beginPath(); ctx.arc(xw, gy + 12, 8, Math.PI, TAU); ctx.fill();
    ctx.restore();
    // 글자
    T(R.x + 10, R.y + 18 * FS, 'A', { size: 16, weight: 900, color: '#1e293b', align: 'left' });
    T(R.x + R.w - 10, R.y + 18 * FS, 'B', { size: 16, weight: 900, color: '#1e293b', align: 'right' });
    T(R.x + R.w / 2, R.y + 16 * FS, 'AB 단면 (서 → 동)', { size: 13, weight: 800, color: '#334155' });
    const lb = (x, y, s, col) => { if (x > R.x + 30 && x < R.x + R.w - 30) D.label(x, y, s, { bg: col, size: 12.5, pad: 6 }); };
    if (namedOK('cold')) lb(xc, gy - 12, '한랭 전선', '#1d4ed8'); else lb(xc, gy - 12, '전선 ㉮', '#475569');
    if (namedOK('warm')) lb(xw, gy - 12, '온난 전선', '#dc2626'); else lb(xw, gy - 12, '전선 ㉯', '#475569');
    lb(R.x + 52, gy - 22, '찬 공기', '#2563eb');
    lb(clamp((xc + xw) / 2, R.x + 80, R.x + R.w - 80), top + 6, '따뜻한 공기', '#ea580c');
    lb(xc - 62, top + 50, '적란운', '#334155');
    lb(xw + 150 * mv.k, gy - bh(xw + 150 * mv.k) - 54, '난층운 → 지속적인 비', '#475569');
    lb(xw + 480 * mv.k, gy - bh(xw + 480 * mv.k) - 82, '고층운', '#64748b');
    T(R.x + 8, R.y + R.h - 6, '※ 세로 방향을 크게 늘려 그렸어요', { size: 11.5, weight: 700, color: '#f1f5f9', align: 'left' });
  }

  /* ---------- 지도: STEP 1 · 2 · 3 · 4 ---------- */
  const C1 = { x: 0, y: 0 };
  function drawStruct(t) {
    mapBase(MV1); drawLow(MV1, C1, { iso: true, arrows: true, dots: true, bands: false, swirl: true }, t);
    mapDeco(MV1, '위에서 본 중위도 저기압 (예시)');
    // AB선과 손잡이
    const R = MV1.R, y = MV1.sy(S.abv), x0 = R.x + 22, x1 = R.x + R.w - 22;
    ctx.save(); clipRect(R);
    ctx.strokeStyle = '#111827'; ctx.lineWidth = 3; ctx.setLineDash([9, 6]); ctx.beginPath(); ctx.moveTo(R.x, y); ctx.lineTo(R.x + R.w, y); ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();
    [['A', x0], ['B', x1]].forEach(([s, x]) => { D.shadow(() => D.sphere(x, y, 13, '#111827', { gloss: false }), { blur: 4, y: 1 }); T(x, y + 5, s, { size: 14, weight: 900, color: '#fff' }); });
    D.label(x0 + 110, y - 14, '↕ AB선 끌기 · 중심에서 남쪽 ' + Math.round(S.abv) + ' km', { bg: 'rgba(17,24,39,.85)', size: 12.5, pad: 7 });
    // 이름표가 붙은 칸 (이름표를 놓은 곳)
    NAMES.forEach((n) => { const z = board.zones.find((q) => q.id === n.id); z.hidden = board.inZone(n.id).length > 0; });
    // 규모 안내 (휴대폰은 아래 빈 공간)
    if (PHONE) {
      const y0 = 712;
      note(10, y0, 285, '종관 규모 저기압\n약 1000 km · 며칠', 13.5, { bg: 'rgba(219,234,254,.95)', border: '#2563eb' });
      note(305, y0, 285, '중규모 저기압\n수십~수백 km · 수 시간', 13.5, { bg: 'rgba(254,243,199,.95)', border: '#d97706' });
    }
  }
  function drawObsMarker(mv, wx, wy, label, ang, t) {
    const x = mv.sx(wx), y = mv.sy(wy);
    D.ring(x, y, 12, t, { color: '#7c3aed', speed: 0.8, width: 2 });
    D.shadow(() => D.sphere(x, y, 8, '#7c3aed', { gloss: true }), { blur: 4, y: 1 });
    windArrow(x, y - 34, ang, 34, '#111827', 3.6);
    D.label(x, y + 24, label, { bg: '#6d28d9', size: 12.5, pad: 7 });
  }
  function drawPassMap(t) {
    const mv = MV2, c = { x: cxAt(S.tv), y: 0 };
    mapBase(mv);
    // 중심 경로
    const R = mv.R;
    ctx.save(); clipRect(R); D.dashedLine(R.x, mv.sy(0), R.x + R.w, mv.sy(0), { color: 'rgba(220,38,38,.55)', width: 2.5, dash: [10, 7] }); ctx.restore();
    drawLow(mv, c, { iso: false, arrows: false, dots: true, bands: true, swirl: true }, t);
    mapDeco(mv, '저기압의 이동 (예시) · ' + VCYC + ' km/h');
    T(mv.sx(-880), mv.sy(0) - 8, '중심 경로 →', { size: 12.5, weight: 800, color: '#b91c1c', align: 'left' });
    const wy = S.obs === 'south' ? OBS_D : -OBS_D;
    drawObsMarker(mv, 0, wy, S.obs === 'south' ? '서울 (경로 남쪽 약 ' + Math.round(OBS_D / 10) * 10 + ' km)' : '관측점 (경로 북쪽)', wangA.v, t);
    // 비 구역 폭 표시 (미션 2에서)
    if (S.sub === 'rain') {
      const cx0 = mv.sx(c.x), cy0 = mv.sy(0);
      const p0 = [cx0 + (DW[0] * 400) * mv.k, cy0 + (DW[1] * 400) * mv.k];
      D.arrow(p0[0], p0[1], p0[0] + NW[0] * W_WARM * mv.k, p0[1] + NW[1] * W_WARM * mv.k, { color: '#075985', width: 3, head: 9, label: '폭 ' + W_WARM + ' km', labelOffset: -2 });
      const q0 = [cx0 + DC[0] * 330 * mv.k - NC[0] * W_COLD / 2 * mv.k, cy0 + DC[1] * 330 * mv.k - NC[1] * W_COLD / 2 * mv.k];
      D.arrow(q0[0], q0[1], q0[0] + NC[0] * W_COLD * mv.k, q0[1] + NC[1] * W_COLD * mv.k, { color: '#0c4a6e', width: 3, head: 9, label: '폭 ' + W_COLD + ' km', labelOffset: 14 });
      // 전선 속도 화살표
      const w1 = [cx0 + DW[0] * 220 * mv.k, cy0 + DW[1] * 220 * mv.k];
      D.arrow(w1[0], w1[1], w1[0] + NW[0] * SPD_W * 0.9, w1[1] + NW[1] * SPD_W * 0.9, { color: '#b91c1c', width: 3.5, head: 10, label: Math.round(SPD_W) + ' km/h', labelOffset: -8 });
      const c1 = [cx0 + DC[0] * 220 * mv.k, cy0 + DC[1] * 220 * mv.k];
      D.arrow(c1[0], c1[1], c1[0] + NC[0] * SPD_C * 0.9, c1[1] + NC[1] * SPD_C * 0.9, { color: '#1e3a8a', width: 3.5, head: 10, label: Math.round(SPD_C) + ' km/h', labelOffset: 14 });
    }
  }
  /* 시계열 그래프 */
  const PLOT_X = [0, 24];
  function gaOf(R) { return { x: R.x + 46, y: R.y + 84, w: R.w - 46 - 14, h: R.h - 84 - 30 }; }
  function drawSeries(R, kind, t) {
    const ser = SER[S.obs], GA = gaOf(R), isP = kind === 'p';
    const yr = isP ? [997, 1015] : [0, 20], yticks = isP ? [1000, 1004, 1008, 1012] : [0, 5, 10, 15, 20];
    const ax = mkAx(GA, PLOT_X, yr);
    ctx.save(); D.shadow(() => { ctx.fillStyle = 'rgba(255,255,255,.85)'; rr(R.x, R.y, R.w, R.h, 12).fill(); }, { blur: 5, y: 2 }); ctx.restore();
    T(R.x + 10, R.y + 20 * FS, isP ? '기압 (hPa) · 풍향' : '기온 (°C) · 강수', { size: 14.5, weight: 800, color: '#1e293b', align: 'left' });
    drawAx(ax, { xticks: TS, yticks, xfmt: (v) => v + '시' });
    // 위쪽 띠: 풍향 화살표 / 강수
    const sy = R.y + 44;
    if (isP) {
      TS.forEach((tt, i) => {
        const x = ax.x(tt);
        windArrow(x, sy, ser.w[i], 22, '#0f172a', 2.8);
        T(x, sy + 26 * FS, ser.w[i] + '°', { size: 11.5, weight: 800, color: '#475569' });
      });
      T(R.x + 6, sy + 4, '풍향', { size: 11.5, weight: 800, color: '#64748b', align: 'left' });
    } else {
      const base = sy + 18;
      for (let tt = 0; tt < 24; tt += 0.25) {
        const r = rainAt(tt + 0.125, S.obs); if (!r) continue;
        const h = r > 5 ? 28 : 11;
        ctx.fillStyle = r > 5 ? '#1d4ed8' : '#7dd3fc'; ctx.fillRect(ax.x(tt), base - h, ax.x(tt + 0.25) - ax.x(tt) + 0.6, h);
      }
      ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(GA.x, base); ctx.lineTo(GA.x + GA.w, base); ctx.stroke();
      T(R.x + 6, sy - 4, '강수', { size: 11.5, weight: 800, color: '#64748b', align: 'left' });
      if (S.obs === 'south') {
        T(ax.x(6), base + 12 * FS, '약한 비', { size: 11.5, weight: 800, color: '#0369a1' });
        T(ax.x(18), base + 12 * FS, '소나기', { size: 11.5, weight: 800, color: '#1d4ed8' });
      } else T(ax.x(12), base + 12 * FS, '전선의 비 없음', { size: 11.5, weight: 800, color: '#64748b' });
    }
    const arr = isP ? ser.p : ser.tp;
    const pts = TS.map((tt, i) => [ax.x(tt), ax.y(arr[i])]);
    polyline(pts, isP ? '#7c3aed' : '#ea580c', 3.4);
    pts.forEach((p, i) => {
      ctx.fillStyle = '#fff'; ctx.strokeStyle = isP ? '#7c3aed' : '#ea580c'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(p[0], p[1], 5, 0, TAU); ctx.fill(); ctx.stroke();
      T(p[0] + (i === 0 ? 12 : i === TS.length - 1 ? -12 : 0), p[1] - 9, String(arr[i]), { size: 11.5, weight: 800, color: '#334155' });
    });
    // 사용자가 표시한 전선 통과 시각
    [['warm', '🔥', '#dc2626'], ['cold', '❄️', '#1d4ed8']].forEach(([k, ic, col]) => {
      const m = S.marks[k]; if (m == null) return;
      const x = ax.x(m);
      D.dashedLine(x, GA.y - 22, x, GA.y + GA.h, { color: col, width: 2.6, dash: [6, 5] });
      T(x, GA.y - 26, ic, { size: 15, weight: 800 });
    });
    // 시간 커서
    const cx = ax.x(clamp(S.tv, 0, 24));
    ctx.save(); ctx.strokeStyle = 'rgba(15,23,42,.75)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx, R.y + 28); ctx.lineTo(cx, GA.y + GA.h); ctx.stroke(); ctx.restore();
    const cv = valAt(arr, TS, S.tv);
    D.shadow(() => D.sphere(cx, ax.y(cv), 7, isP ? '#7c3aed' : '#ea580c', { gloss: true }), { blur: 4, y: 1 });
    return ax;
  }
  const plotAx = {};
  /* 고기압 지도 */
  function drawHighMap(t) {
    const mv = MV3, c = { x: cxh(S.thv), y: 0 }, R = mv.R, cx = mv.sx(c.x), cy = mv.sy(0), k = mv.k;
    mapBase(mv);
    ctx.save(); clipRect(R);
    D.dashedLine(R.x, cy, R.x + R.w, cy, { color: 'rgba(37,99,235,.55)', width: 2.5, dash: [10, 7] });
    // 맑은 하늘 (고기압 중심 부근)
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 420 * k); g.addColorStop(0, 'rgba(253,230,138,.5)'); g.addColorStop(1, 'rgba(253,230,138,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, 420 * k, 0, TAU); ctx.fill();
    isobars(mv, c, [1016, 1020, 1024], isoHigh, 'rgba(37,99,235,.8)');
    const gap = PHONE ? 62 : 70;
    for (let gx = R.x + gap / 2; gx < R.x + R.w; gx += gap) for (let gy = R.y + gap / 2; gy < R.y + R.h; gy += gap) {
      const rx = (gx - cx) / k, ry = (gy - cy) / k, r = Math.hypot(rx, ry);
      if (r < 120 || r > 700) continue;
      windArrow(gx, gy, windHigh(rx, ry), 20, 'rgba(30,58,95,.75)', 2.3);
    }
    D.shadow(() => { D.sphere(cx, cy, 15, '#2563eb', { gloss: true }); }, { blur: 6, y: 2 });
    T(cx, cy + 5.5, '고', { size: 16, weight: 900, color: '#fff' });
    ctx.restore();
    mapDeco(mv, '이동성 고기압 (예시) · ' + VHI + ' km/h');
    const ox = mv.sx(0), oy = mv.sy(HD);
    D.ring(ox, oy, 12, t, { color: '#7c3aed', speed: 0.8, width: 2 });
    D.shadow(() => D.sphere(ox, oy, 8, '#7c3aed', { gloss: true }), { blur: 4, y: 1 });
    windArrow(ox, oy - 34, wangA.v, 34, '#111827', 3.6);
    D.label(ox, oy + 24, '관측점 (경로 남쪽 ' + HD + ' km)', { bg: '#6d28d9', size: 12.5, pad: 7 });
  }
  function drawHighPlot(t) {
    const R = LAY.plH, GA = { x: R.x + 46, y: R.y + 84, w: R.w - 46 - 14, h: R.h - 84 - 30 };
    const ax = mkAx(GA, [0, 48], [1008, 1028]); plotAx.high = ax;
    D.shadow(() => { ctx.fillStyle = 'rgba(255,255,255,.85)'; rr(R.x, R.y, R.w, R.h, 12).fill(); }, { blur: 5, y: 2 });
    T(R.x + 10, R.y + 20 * FS, '기압 (hPa) · 풍향', { size: 14.5, weight: 800, color: '#1e293b', align: 'left' });
    drawAx(ax, { xticks: TSH, yticks: [1010, 1015, 1020, 1025], xfmt: (v) => v + '시간' });
    const sy = R.y + 44;
    TSH.forEach((tt, i) => {
      if (tt > S.thv + 0.01) return;
      const x = ax.x(tt);
      windArrow(x, sy, SERH.w[i], 22, '#0f172a', 2.8); T(x, sy + 26 * FS, SERH.w[i] + '°', { size: 11.5, weight: 800, color: '#475569' });
    });
    T(R.x + 6, sy + 4, '풍향', { size: 11.5, weight: 800, color: '#64748b', align: 'left' });
    // 지금까지의 기압만 그려요
    const pts = [];
    TSH.forEach((tt, i) => { if (tt <= S.thv) pts.push([ax.x(tt), ax.y(SERH.p[i])]); });
    if (S.thv > 0) { const tl = TSH.filter((tt) => tt <= S.thv).pop(), i0 = TSH.indexOf(tl); if (i0 < TSH.length - 1 && S.thv > tl) pts.push([ax.x(S.thv), ax.y(valAt(SERH.p, TSH, S.thv))]); }
    polyline(pts, '#2563eb', 3.6);
    TSH.forEach((tt, i) => {
      if (tt > S.thv + 0.01) return; const x = ax.x(tt), y = ax.y(SERH.p[i]);
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#2563eb'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(x, y, 5, 0, TAU); ctx.fill(); ctx.stroke();
      T(x + (i === 0 ? 12 : 0), y - 9, String(SERH.p[i]), { size: 11.5, weight: 800, color: '#334155' });
    });
    const cx = ax.x(S.thv);
    ctx.save(); ctx.strokeStyle = 'rgba(15,23,42,.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx, R.y + 28); ctx.lineTo(cx, GA.y + GA.h); ctx.stroke(); ctx.restore();
    D.shadow(() => D.sphere(cx, ax.y(valAt(SERH.p, TSH, S.thv)), 7, '#2563eb', { gloss: true }), { blur: 4, y: 1 });
    if (S.thv < 47.9) T(ax.x(36), ax.y(1014), '아직 그려지지 않았어요 → 시간을 흘려 보내요', { size: 12.5, weight: 800, color: '#94a3b8' });
  }
  /* 일교차 그래프 */
  function drawRange(t) {
    const R = LAY.rangeR, GA = { x: R.x + 46, y: R.y + 54, w: R.w - 46 - 14, h: PHONE ? 400 : R.h - 54 - 100 };
    const ax = mkAx(GA, [0, 24], [0, 25]); plotAx.range = ax;
    D.shadow(() => { ctx.fillStyle = 'rgba(255,255,255,.88)'; rr(R.x, R.y, R.w, PHONE ? 520 : R.h, 12).fill(); }, { blur: 5, y: 2 });
    T(R.x + 10, R.y + 22 * FS, '하루 동안의 기온 변화 (°C)', { size: 15, weight: 800, color: '#1e293b', align: 'left' });
    // 밤 구간
    ctx.fillStyle = 'rgba(30,41,59,.10)'; ctx.fillRect(ax.x(0), GA.y, ax.x(6) - ax.x(0), GA.h); ctx.fillRect(ax.x(18), GA.y, ax.x(24) - ax.x(18), GA.h);
    drawAx(ax, { xticks: [0, 3, 6, 9, 12, 15, 18, 21, 24], yticks: [0, 5, 10, 15, 20, 25], xfmt: (v) => v + '시' });
    T(ax.x(3), GA.y + 16 * FS, '🌙 밤', { size: 13, weight: 800, color: '#475569' }); T(ax.x(21), GA.y + 16 * FS, '🌙 밤', { size: 13, weight: 800, color: '#475569' });
    Object.keys(DAYS).forEach((k) => {
      const d = DAYS[k], pts = [];
      for (let h = 0; h <= 24.01; h += 0.5) pts.push([ax.x(h), ax.y(dayT(d, h))]);
      polyline(pts, d.col, k === S.day ? 5 : 3.4);
      const mx = ax.x(15), my = ax.y(dayT(d, 15)), nx = ax.x(3), ny = ax.y(dayT(d, 3));
      [[mx, my, f1(dayT(d, 15)).replace('.0', '') + ' °C', -9], [nx, ny, f1(dayT(d, 3)).replace('.0', '') + ' °C', 17]].forEach(([x, y, s, dy]) => {
        ctx.fillStyle = '#fff'; ctx.strokeStyle = d.col; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(x, y, 5, 0, TAU); ctx.fill(); ctx.stroke();
        T(x, y + dy, s, { size: 12.5, weight: 800, color: d.col });
      });
    });
    // 범례
    const ly = GA.y + GA.h + 36 * FS;
    Object.keys(DAYS).forEach((k, i) => {
      const d = DAYS[k], w = (R.w - 20) / 3, x = R.x + 10 + i * w;
      ctx.fillStyle = k === S.day ? 'rgba(254,243,199,1)' : 'rgba(241,245,249,1)'; rr(x + 2, ly - 16 * FS, w - 8, 44 * FS, 10).fill();
      ctx.strokeStyle = k === S.day ? '#f59e0b' : d.col; ctx.lineWidth = k === S.day ? 3.5 : 2; rr(x + 2, ly - 16 * FS, w - 8, 44 * FS, 10).stroke();
      T(x + w / 2 - 2, ly + 2, d.name + ' ' + d.sky, { size: 14, weight: 800, color: d.col });
      T(x + w / 2 - 2, ly + 20 * FS, 'tap해서 고르기', { size: 11.5, weight: 700, color: '#94a3b8' });
    });
  }

  /* ---------- 일기도 (STEP 4) ---------- */
  function drawChartMap(t) {
    const mv = MV4, R = mv.R, ch = S.cv, f = ch / 12;
    const c = { x: lerp(CH.c0.x, CH.c12.x, f), y: 400 };
    mapBase(mv);
    ctx.save(); clipRect(R);
    // 100 km 눈금선
    ctx.strokeStyle = 'rgba(71,85,105,.22)'; ctx.lineWidth = 1;
    for (let x = 200; x <= 1800; x += 100) { const sx = mv.sx(x); ctx.beginPath(); ctx.moveTo(sx, R.y); ctx.lineTo(sx, R.y + R.h); ctx.stroke(); }
    for (let y = 0; y <= 800; y += 100) { const sy = mv.sy(y); if (sy < R.y || sy > R.y + R.h) continue; ctx.beginPath(); ctx.moveTo(R.x, sy); ctx.lineTo(R.x + R.w, sy); ctx.stroke(); }
    ctx.restore();
    drawLow(mv, c, { iso: true, arrows: false, dots: false, bands: false, swirl: false }, t);
    // 눈금 숫자
    for (let x = 200; x <= 1800; x += 200) T(mv.sx(x), R.y + R.h - 4, String(x), { size: 11.5, weight: 800, color: '#334155', stroke: 'rgba(255,255,255,.8)', strokeWidth: 3 });
    // 다른 시각의 중심 (희미하게)
    const other = ch >= 6 ? CH.c0 : CH.c12;
    ctx.save(); ctx.globalAlpha = 0.6; const ox = mv.sx(other.x), oy = mv.sy(other.y);
    ctx.strokeStyle = '#dc2626'; ctx.lineWidth = 2.4; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.arc(ox, oy, 15, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();
    T(ox, oy - 21, ch >= 6 ? '00시 중심' : '12시 중심', { size: 12, weight: 800, color: '#b91c1c', stroke: 'rgba(255,255,255,.85)', strokeWidth: 3 });
    // 중심 기압 글자
    const cx = mv.sx(c.x), cy = mv.sy(c.y);
    D.label(cx, cy + 32, '저 ' + CH.P + ' hPa', { bg: '#b91c1c', size: 13, pad: 7 });
    mapDeco(mv, ((ch >= 6) ? '12' : '00') + '시 예시 일기도 · 등압선 4 hPa 간격');
    // 지점 B
    if (ch >= 6 || S.chartTouched) {
      const bx = mv.sx(CH.B.x), by = mv.sy(CH.B.y);
      D.shadow(() => D.sphere(bx, by, 9, '#7c3aed', { gloss: true }), { blur: 4, y: 1 });
      D.label(bx, by + 24, '지점 B', { bg: '#6d28d9', size: 13, pad: 7 });
      if (S.sub === 'arrive' && ch >= 6) {
        const fx = mv.sx(CH.crossC);
        D.arrow(fx, by - 14, bx - 12, by - 14, { color: '#0f172a', width: 3, head: 9 });
        D.label((fx + bx) / 2, by - 30, CH.dist + ' km', { bg: '#0f172a', size: 13, pad: 7 });
        ctx.fillStyle = '#1d4ed8'; ctx.beginPath(); ctx.arc(fx, by, 6, 0, TAU); ctx.fill();
      }
    }
    // 눌러 본 지점의 바람
    if (S.probe) {
      const p = S.probe, px = mv.sx(p.x), py = mv.sy(p.y);
      D.ring(px, py, 11, t, { color: '#0f766e', speed: 1, width: 2 });
      windArrow(px, py, p.deg, 46, '#065f46', 4);
      D.label(px, py + 28, windName(p.deg) + '풍 ' + Math.round(p.deg) + '°', { bg: '#065f46', size: 13, pad: 7 });
    }
    if (PHONE) {
      let y = 346;
      y += note(10, y, 580, '저기압과 전선은 12시간 동안 모양이 변하지 않고 같은 속도로 동쪽으로 이동한다고 가정해요.', 13.5) + 8;
      note(10, y, 580, '지도를 눌러 그 지점의 바람 방향을 알아봐요.', 13.5, { bg: 'rgba(204,251,241,.95)' });
    } else {
      note(10, 440, 780, '저기압과 전선은 모양이 변하지 않고 같은 속도로 동쪽으로 이동한다고 가정해요. 지도를 눌러 그 지점의 바람 방향을 알아봐요.', 13.5);
    }
  }

  /* ---------- 입력 ---------- */
  const abHit = (p) => Math.abs(p.y - MV1.sy(S.abv)) < 22 && p.x >= MV1.R.x && p.x <= MV1.R.x + MV1.R.w && p.y < MV1.R.y + MV1.R.h;
  SciSim.pointer(view, {
    down(p) {
      if (S.mode === 'struct') {
        if (board.down(p)) return true;
        if (abHit(p)) { S.abDrag = true; return true; }
        return false;
      }
      if (S.mode === 'pass') {
        const hitPlot = [LAY.pl1, LAY.pl2].find((R) => p.x >= R.x && p.x <= R.x + R.w && p.y >= R.y && p.y <= R.y + R.h);
        if (hitPlot) { clickPlot(p, hitPlot); return false; }
        return false;
      }
      if (S.mode === 'high') {
        if (S.dayView === 'range') {
          const R = LAY.rangeR, ly = R.y + 54 + (PHONE ? 400 : R.h - 54 - 100) + 36 * FS, w = (R.w - 20) / 3;
          if (p.y > ly - 18 * FS && p.y < ly + 30 * FS && p.x > R.x) { const i = Math.floor((p.x - R.x - 10) / w); if (i >= 0 && i < 3) { setDay(['A', 'B', 'C'][i]); } }
        }
        return false;
      }
      if (S.mode === 'chart') {
        const R = MV4.R;
        if (p.x >= R.x && p.x <= R.x + R.w && p.y >= R.y && p.y <= R.y + R.h) {
          const wx = MV4.wx(p.x), wy = MV4.wy(p.y), c = S.cv >= 6 ? CH.c12 : CH.c0;
          S.probe = { x: wx, y: wy, deg: windLow(wx - c.x, wy - c.y) }; S.probeN = (S.probeN || 0) + 1; Sound.tick();
        }
        return false;
      }
      return false;
    },
    move(p) {
      if (S.mode === 'struct') {
        if (board.drag) board.move(p);
        else if (S.abDrag) { const r = dRange(); S.ab = clamp(MV1.wy(p.y), r.lo, r.hi); }
      }
    },
    up(p) {
      if (S.mode === 'struct') { if (board.drag) board.up(p); S.abDrag = false; }
    },
    hover(p) { return S.mode === 'struct' && (board.hit(p) ? 'grab' : abHit(p) ? 'ns-resize' : 'default'); },
  });
  function clickPlot(p, R) {
    const ax = plotAx[R === LAY.pl1 ? 'p' : 't']; if (!ax) return;
    if (p.x < ax.R.x - 14 || p.x > ax.R.x + ax.R.w + 14) return;
    const tt = clamp(ax.inv(p.x), 0, 24), idx = Math.round(tt / 3), ts = TS[idx];
    setTime(ts);
    if (!S.tool) return;
    if (S.obs !== 'south') { say('북쪽 관측점에서는 전선이 지나가지 않아요. 경로 남쪽(서울)에서 표시해요.', true); return; }
    if (S.tool === 'clear') { S.marks.warm = S.marks.cold = null; return; }
    S.marks[S.tool] = ts; Sound.tick();
    parts.burst(ax.x(ts), ax.R.y + 40, { count: 8, speed: 80, size: 3, life: 0.5, colors: ['#f59e0b', '#fff'] });
  }

  /* ---------- 조작 ---------- */
  let game = null;
  const sTime = $('#sTime'), oTime = $('#oTime'), sTimeH = $('#sTimeH'), oTimeH = $('#oTimeH');
  SciSim.bindRange(sTime, oTime, (v) => (Math.round(v * 10) / 10).toFixed(1).replace('.0', '') + '시', (v) => { S.t = v; S.play = false; updPlay(); });
  SciSim.bindRange(sTimeH, oTimeH, (v) => (Math.round(v * 10) / 10).toFixed(1).replace('.0', '') + '시간', (v) => { S.th = v; S.playH = false; updPlay(); });
  function setTime(v) { S.t = v; sTime.value = v; SciSim.bindRange(sTime, oTime, (x) => (Math.round(x * 10) / 10).toFixed(1).replace('.0', '') + '시'); }
  function setTimeH(v) { S.th = v; sTimeH.value = v; SciSim.bindRange(sTimeH, oTimeH, (x) => (Math.round(x * 10) / 10).toFixed(1).replace('.0', '') + '시간'); }
  function updPlay() { $('#playBtn').textContent = S.play ? '⏸ 멈춤' : '▶ 재생'; $('#playBtnH').textContent = S.playH ? '⏸ 멈춤' : '▶ 재생'; }
  $('#playBtn').addEventListener('click', () => { Sound.click(); if (!S.play && S.t >= 23.9) setTime(0); S.play = !S.play; updPlay(); });
  $('#playBtnH').addEventListener('click', () => { Sound.click(); if (!S.playH && S.th >= 47.8) setTimeH(0); S.playH = !S.playH; updPlay(); });
  $$('#obsSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.obs = b.dataset.o; S.wang = S.obs === 'south' ? windS(S.t) : windN(S.t); updateCtl(); }));
  $$('#toolSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.tool = S.tool === b.dataset.tool && b.dataset.tool !== 'clear' ? null : b.dataset.tool; if (S.tool === 'clear') { S.marks.warm = S.marks.cold = null; S.tool = null; } updateCtl(); }));
  $$('#dirSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.dir = b.dataset.d; updateCtl(); }));
  $$('#predSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.pred = b.dataset.p; updateCtl(); }));
  function setDay(k) { S.day = k; Sound.click(); updateCtl(); }
  $$('#daySeg .opt').forEach((b) => b.addEventListener('click', () => setDay(b.dataset.day)));
  $$('#chartSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.chart = +b.dataset.c; S.chartTouched = true; S.probe = null; updateCtl(); }));
  $('#bResetCards').addEventListener('click', () => { Sound.click(); board.reset(); });
  const stRainW = makeStepper($('#rainBox'), { label: '🔥 온난 전선: 비가 내리는 시간', min: 0, max: 12, step: 1, value: S.rainW, unit: '시간', onChange: (v) => { S.rainW = v; } });
  const stRainC = makeStepper($('#rainBox'), { label: '❄️ 한랭 전선: 비가 내리는 시간', min: 0, max: 12, step: 1, value: S.rainC, unit: '시간', onChange: (v) => { S.rainC = v; } });
  const stP = makeStepper($('#speedBox'), { label: '🎯 저기압 중심 기압', min: 980, max: 1010, step: 1, value: S.cP, unit: 'hPa', onChange: (v) => { S.cP = v; } });
  const stDist = makeStepper($('#speedBox'), { label: '📏 12시간 동안 이동한 거리', min: 0, max: 1200, step: 100, value: S.cDist, unit: 'km', onChange: (v) => { S.cDist = v; } });
  const stSpd = makeStepper($('#speedBox'), { label: '💨 이동 속도', min: 0, max: 100, step: 5, value: S.cSpd, unit: 'km/h', onChange: (v) => { S.cSpd = v; } });
  const stArr = makeStepper($('#arriveBox'), { label: '⏱️ 한랭 전선이 지점 B에 도착하기까지', min: 0, max: 24, step: 1, value: S.cArr, unit: '시간', onChange: (v) => { S.cArr = v; } });

  /* 규모 분류 (HTML) */
  const SCALE_ITEMS = [
    { t: '전선을 동반하고 크기가 약 1000 km 이상, 며칠 동안 이어지는 저기압', a: 0 },
    { t: '여름 오후 소나기·스콜을 만드는 저기압 (수십~수백 km, 수 시간)', a: 1 },
    { t: '한랭 전선과 온난 전선이 함께 나타나는 저기압', a: 0 },
    { t: '좁은 지역에 짧고 강한 비를 내리는 저기압', a: 1 },
  ];
  const scaleBox = $('#scaleBox');
  SCALE_ITEMS.forEach((it, i) => {
    const row = document.createElement('div'); row.className = 'row-q'; row.id = 'sc' + i;
    row.innerHTML = '<span class="lab">' + (i + 1) + '. ' + it.t + '</span><div class="segmented"><button type="button" data-v="0">종관 규모</button><button type="button" data-v="1">중규모</button></div>';
    row.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.scale[i] = +b.dataset.v; row.classList.remove('bad'); updateCtl(); }));
    scaleBox.appendChild(row);
  });

  const MODE_LABEL = { struct: '🌀 중위도 저기압의 구조', pass: '📈 전선이 지나갈 때', high: '🌤️ 이동성 고기압', chart: '🗺️ 예시 일기도 읽기' };
  const MODE_LV = { struct: 0, pass: 1, high: 2, chart: 3 };
  function updateCtl() {
    $('#tbLabel').textContent = MODE_LABEL[S.mode];
    $$('#ctrlCard .control').forEach((c) => {
      const okMode = c.dataset.modes.split(' ').includes(S.mode);
      const okSub = !c.dataset.sub || (game && game.free) || c.dataset.sub === S.sub;
      c.hidden = !(okMode && okSub);
    });
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    const ms = $('#modeSeg'); if (ms) ms.hidden = !(game && game.free);
    $$('#obsSeg button').forEach((b) => b.classList.toggle('on', b.dataset.o === S.obs));
    $$('#toolSeg button').forEach((b) => b.classList.toggle('on', b.dataset.tool === S.tool));
    $$('#dirSeg button').forEach((b) => b.classList.toggle('on', b.dataset.d === S.dir));
    $$('#predSeg button').forEach((b) => b.classList.toggle('on', b.dataset.p === S.pred));
    $$('#daySeg .opt').forEach((b) => b.classList.toggle('on', b.dataset.day === S.day));
    $$('#chartSeg button').forEach((b) => b.classList.toggle('on', +b.dataset.c === S.chart));
    SCALE_ITEMS.forEach((it, i) => $$('#sc' + i + ' button').forEach((b) => b.classList.toggle('on', +b.dataset.v === S.scale[i])));
    const pn = $('#predNote');
    if (pn) pn.textContent = S.pred && S.maxTH >= 36 ? (S.pred === 'down' ? '그래프와 같아요! 중심이 지나가면 기압이 내려가요.' : '그래프와 달라요. 중심이 지나간 뒤 기압은 다시 내려갔어요.') : (S.pred ? '이제 시간을 36시간 이상까지 흘려 보내 확인해요.' : '');
  }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); enterLevel(MODE_LV[b.dataset.mode], true); }));
  function setMode(m, sub) {
    if (S.mode !== m) { S.fade = 1; parts.clear(); }
    S.mode = m; S.sub = sub || '';
    updateCtl();
  }

  /* ---------- 읽음 칸 ---------- */
  function readouts() {
    if (S.mode === 'struct') {
      const placed = board.cards.filter((c) => c.zone).length;
      setReadouts(['중심에서 AB선까지', '남쪽 ' + Math.round(S.ab) + ' km', '단면에서 온난 구역의 폭', Math.round((COT_W + COT_C) * S.ab) + ' km', '이름표', placed + ' / 3']);
    } else if (S.mode === 'pass') {
      const t = S.t, ser = SER[S.obs], w = S.obs === 'south' ? windS(t) : Math.round(windN(t));
      setReadouts(['시각 · 풍향 (불어오는 방향)', f1(t).replace('.0', '') + '시 · ' + windName(w) + ' ' + Math.round(w) + '°', '기압', Math.round(valAt(ser.p, TS, t)) + ' hPa', '기온', Math.round(valAt(ser.tp, TS, t) * 10) / 10 + ' °C']);
    } else if (S.mode === 'high') {
      if (S.dayView === 'range') {
        const k = S.day; const d = k ? DAYS[k] : null;
        setReadouts(['고른 날', k ? d.name + ' ' + d.sky : '아직 안 골랐어요', '최고 / 최저 기온', k ? (d.mean + d.range / 2) + ' / ' + (d.mean - d.range / 2) + ' °C' : '—', '일교차', k ? d.range + ' °C' : '—']);
      } else {
        const t = S.th, w = Math.round(windHN(t));
        setReadouts(['시간 · 풍향 (불어오는 방향)', f1(t).replace('.0', '') + '시간 · ' + windName(w) + ' ' + w + '°', '기압', Math.round(valAt(SERH.p, TSH, t)) + ' hPa', '중심까지 거리', Math.round(rH(t) / 10) * 10 + ' km']);
      }
    } else {
      setReadouts(['일기도 시각', (S.chart >= 6 ? '12' : '00') + '시', '저기압 중심', S.chart >= 6 ? '동쪽 ' + (CH.c12.x) + ' km 지점' : '동쪽 ' + (CH.c0.x) + ' km 지점', '눌러 본 지점의 풍향', S.probe ? windName(S.probe.deg) + ' ' + Math.round(S.probe.deg) + '°' : '지도를 눌러 보세요']);
    }
  }

  /* ---------- 단계 · 미션 ---------- */
  function enterLevel(li, fromSeg) {
    clearTimeout(hintTimer); S.play = S.playH = false; updPlay(); parts.clear();
    if (li === 0) { setMode('struct', 'label'); showHint('이름표를 끌어 점선 칸에 놓고, AB선을 위아래로 끌어 봐요', 5000); }
    else if (li === 1) { setMode('pass', 'mark'); S.obs = 'south'; setTime(0); S.tv = 0; S.wang = windS(0); wangA.v = S.wang; showHint('시각을 움직이면 저기압이 서에서 동으로 이동해요', 5000); }
    else if (li === 2) { setMode('high', 'pred'); S.dayView = 'pass'; setTimeH(0); S.thv = 0; S.maxTH = 0; S.pred = null; showHint('시간을 흘려 보내며 기압과 풍향을 살펴봐요', 5000); }
    else { setMode('chart', 'speed'); S.chart = 12; S.cv = 12; S.probe = null; showHint('눈금(100 km)으로 거리를 읽어 봐요', 5000); }
    updateCtl();
  }
  const recapPass = '<ul><li>저기압이 지나는 한 지점(경로 남쪽)에서는 <b>온난 전선 통과 → 남동풍에서 남서풍</b>, <b>한랭 전선 통과 → 남서풍에서 북서풍</b>으로 바뀌어요.</li></ul>';
  const levels = [
    {
      title: '저기압 구조: 전선과 온난 구역', short: '저기압 구조', icon: '🌀', phase: '모형', features: ['struct'],
      intro: '<p class="si-q">❓ 탐구 질문: 저기압이 지나가는 동안 한 지점의 바람과 기온은 어떻게 바뀔까?</p>' +
        '<div class="si-link">🔗 <b>중학교(날씨와 기후변화)에서</b> 한랭 전선 뒤에는 적운형 구름과 소나기, 온난 전선 앞에는 층운형 구름과 지속적인 비가 내린다고 배웠어요.</div>' +
        '<p>이번에는 우리나라 부근을 서에서 동으로 지나가는 <b>중위도 저기압</b>(mid-latitude Low)을 위에서 내려다보고(지도), 옆으로 잘라 봐요(단면). 저기압 중심에서 <b>남서쪽으로 한랭 전선</b>, <b>동쪽~남동쪽으로 온난 전선</b>이 뻗고, 두 전선 사이의 남쪽이 <b>온난 구역</b>이에요. 바람은 중심을 향해 반시계 방향으로 불어 들어와요. (교육용으로 단순화한 예시예요. 온대 저기압 대신 중위도 저기압이라고 불러요.)</p>',
      setup() { enterLevel(0); },
      recap: '중위도 저기압은 중심의 남서쪽에 한랭 전선, 동~남동쪽에 온난 전선이 있고 두 전선 사이가 온난 구역이에요. 바람은 중심을 향해 반시계 방향으로 불어 들어와요.',
      summary: '<ul><li><b>중위도 저기압</b>(mid-latitude Low): 편서풍을 타고 서 → 동으로 이동(약 40~60 km/h)하는 저기압. 중심 남서쪽에 <b>한랭 전선</b>, 동~남동쪽에 <b>온난 전선</b>, 사이에 <b>온난 구역</b>.</li>' +
        '<li>바람은 중심을 향해 <b>반시계 방향으로 불어 들어와요</b>(북반구 관측 사실).</li>' +
        '<li>단면: 한랭 전선은 경사가 급해 <b>적란운·소나기</b>, 온난 전선은 경사가 완만해 <b>난층운 → 고층운 → 권층운</b>이 넓게 퍼지고 <b>지속적인 비</b>.</li></ul>' +
        '<table class="mini"><tr><th>규모</th><th>크기</th><th>지속 시간</th><th>예</th></tr><tr><td>종관 규모</td><td>약 1000 km 이상</td><td>며칠</td><td>전선을 동반한 저기압</td></tr><tr><td>중규모</td><td>수십~수백 km</td><td>수 시간</td><td>소나기·스콜을 만드는 저기압</td></tr></table>',
      missions: [
        {
          title: '이름표와 규모 분류',
          goal: '이름표 3장을 알맞은 <b>점선 칸</b>에 놓고, 오른쪽의 4가지를 <b>종관 규모</b>와 <b>중규모</b>로 나눈 뒤 <b>✔ 확인하기</b>를 눌러요.',
          hint: '한랭 전선은 중심에서 남서쪽, 온난 전선은 동쪽~남동쪽으로 뻗고, 두 전선 사이가 온난 구역이에요. 전선을 동반한 저기압은 약 1000 km 이상이고 며칠 이어지며, 소나기를 만드는 저기압은 수 시간 이어지는 중규모예요.',
          manual: true,
          setup() { setMode('struct', 'label'); },
          status: () => mark(board.cards.every((c) => c.zone)) + ' 이름표 ' + board.cards.filter((c) => c.zone).length + ' / 3 · ' + mark(S.scale.every((v) => v != null)) + ' 규모 분류 ' + S.scale.filter((v) => v != null).length + ' / 4',
          check() {
            if (board.cards.some((c) => !c.zone)) return '이름표 ' + board.cards.filter((c) => !c.zone).length + '장이 아직 남았어요. 지도의 점선 칸에 놓아 주세요.';
            const bad = board.cards.filter((c) => c.zone !== c.id);
            if (bad.length) return '"' + bad[0].label + '" 이름표의 위치를 다시 확인해요. 힌트: 저기압 중심에서 어느 쪽으로 뻗었는지 봐요.';
            if (S.scale.some((v) => v == null)) return '규모 분류 4가지를 모두 골라 주세요.';
            const wi = SCALE_ITEMS.findIndex((it, i) => S.scale[i] !== it.a);
            if (wi >= 0) { $('#sc' + wi).classList.add('bad'); setTimeout(() => $('#sc' + wi) && $('#sc' + wi).classList.remove('bad'), 900); return (wi + 1) + '번 분류를 다시 생각해 봐요. 크기와 지속 시간을 보세요.'; }
            return true;
          },
          explain: '저기압 중심에서 <b>남서쪽으로 한랭 전선</b>(찬 공기가 따뜻한 공기 밑으로 파고들어요), <b>동~남동쪽으로 온난 전선</b>(따뜻한 공기가 찬 공기 위로 올라가요)이 뻗고 그 사이가 <b>온난 구역</b>이에요. 전선을 동반한 저기압은 약 1000 km 이상, 며칠 이어지는 <b>종관 규모</b>이고, 소나기·스콜을 만드는 저기압은 수십~수백 km, 수 시간 이어지는 <b>중규모</b>예요.',
        },
        {
          type: 'quiz', title: '저기압 주변의 바람',
          goal: '북반구 <b>중위도 저기압</b> 주변의 바람(지도의 화살표)은 어떻게 불까요?',
          setup() { setMode('struct', 'label'); },
          choices: ['중심에서 바깥쪽으로 시계 방향으로 불어 나가요', '중심을 향해 <b>반시계 방향</b>으로 불어 들어와요', '중심을 향해 시계 방향으로 불어 들어와요', '중심 주변에는 바람이 거의 불지 않아요'],
          answer: 1,
          feedback: ['그것은 고기압의 바람이에요. 저기압에서는 바람이 중심으로 모여요.', '', '북반구에서는 시계 방향이 아니라 반시계 방향이에요. 지도의 화살표를 따라가 봐요.', '저기압 중심 부근에서는 주변보다 기압이 낮아 바람이 중심으로 불어 들어와요.'],
          explain: '북반구의 저기압에서는 바람이 중심을 향해 <b>반시계 방향으로 불어 들어와요</b>. 모인 공기는 중심에서 올라가고(상승 기류), 올라간 공기가 식으며 구름이 생겨 날씨가 나빠요. (이 차시에서는 바람의 방향을 관측 사실로 다뤄요.)',
        },
      ],
    },
    {
      title: '전선 통과: 풍향·기압·기온의 변화', short: '전선 통과', icon: '📈', phase: '분석', features: ['pass'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 저기압 중심의 남서쪽에 한랭 전선, 동~남동쪽에 온난 전선이 있다는 것을 알았어요.</div>' +
        '<p>저기압이 서에서 동으로 약 <b>' + VCYC + ' km/h</b>로 지나갈 때, 중심 경로의 <b>남쪽</b>에 있는 한 지점(서울, 예시)에서는 24시간 동안 풍향·기압·기온·강수가 어떻게 바뀔까요? <b>시각 슬라이더</b>를 움직이면 지도에서 저기압이 이동하고, 두 그래프에 값이 읽혀요.</p>',
      setup() { enterLevel(1); },
      recap: '경로 남쪽의 한 지점에서는 온난 전선 통과 시 남동풍 → 남서풍, 한랭 전선 통과 시 남서풍 → 북서풍으로 풍향이 시계 방향으로 바뀌고, 한랭 전선 통과 후 기온이 급강하해요.',
      summary: '<table class="mini"><tr><th>시각</th><th>0</th><th>3</th><th>6</th><th>9</th><th>12</th><th>15</th><th>18</th><th>21</th><th>24</th></tr><tr><th>기압(hPa)</th><td>1012</td><td>1009</td><td>1006</td><td>1004</td><td>1003</td><td>1002</td><td>1000</td><td>1005</td><td>1010</td></tr><tr><th>기온(°C)</th><td>7</td><td>7</td><td>7</td><td>9</td><td>14</td><td>15</td><td>15</td><td>8</td><td>6</td></tr><tr><th>풍향</th><td>남동</td><td>남동</td><td>남동</td><td>남서</td><td>남서</td><td>남서</td><td>북서</td><td>북서</td><td>북서</td></tr></table>' +
        '<ul><li>풍향(불어오는 방향, 북 0°·동 90°·남 180°·서 270°): <b>135° → 225° → 315°</b>, 전선이 통과할 때마다 약 +90° = <b>시계 방향</b>.</li>' +
        '<li>온난 전선: 앞쪽 비 구역 폭 ' + W_WARM + ' km ÷ 속도 ' + SPD_W + ' km/h = <b>6시간</b>, 한랭 전선: ' + W_COLD + ' km ÷ ' + Math.round(SPD_C) + ' km/h = <b>2시간</b> 비.</li>' +
        '<li>한랭 전선이 지나면 찬 공기가 밀려와 기온이 <b>급강하</b>, 기압은 올라요.</li>' +
        '<li>관측점이 경로의 <b>북쪽</b>이면 전선이 지나가지 않고 풍향이 동 → 북 → 북서(<b>반시계 방향</b>)로 바뀌어요.</li></ul>',
      missions: [
        {
          title: '전선 통과 시각과 풍향 변화',
          goal: '서울(경로 남쪽)의 그래프에서 <b>풍향이 바뀐 첫 관측 시각</b>을 온난 전선·한랭 전선으로 각각 표시하고, 풍향이 바뀐 <b>방향</b>을 골라요.',
          hint: '풍향 화살표 줄을 보세요. 남동 → 남서로 처음 바뀐 시각이 온난 전선, 남서 → 북서로 바뀐 시각이 한랭 전선이에요. 각도는 135° → 225° → 315°로 커져요.',
          setup() { setMode('pass', 'mark'); S.obs = 'south'; S.tool = 'warm'; S.marks.warm = S.marks.cold = null; S.dir = null; updateCtl(); },
          check: () => S.marks.warm === T_W && S.marks.cold === T_C && S.dir === 'cw', hold: 0.5,
          status: () => mark(S.marks.warm === T_W) + ' 온난 전선 ' + (S.marks.warm == null ? '미표시' : S.marks.warm + '시') + ' · ' + mark(S.marks.cold === T_C) + ' 한랭 전선 ' + (S.marks.cold == null ? '미표시' : S.marks.cold + '시') + ' · ' + mark(S.dir === 'cw') + ' 풍향 변화 ' + (S.dir == null ? '미선택' : S.dir === 'cw' ? '시계 방향' : '반시계 방향(다시 확인)'),
          explain: '풍향은 <b>9시</b>에 남동(135°) → 남서(225°)로 바뀌어 <b>온난 전선</b>이 지나갔고, <b>18시</b>에 남서(225°) → 북서(315°)로 바뀌어 <b>한랭 전선</b>이 지나갔어요. 전선이 지날 때마다 약 +90°, 즉 <b>시계 방향</b>으로 변해요. 한랭 전선 통과 후에는 찬 공기가 밀려와 기온이 15 °C에서 8 °C로 급강하하고 기압은 올라요.',
        },
        {
          title: '비가 내리는 시간 계산',
          goal: '비 구역의 <b>폭 ÷ 전선의 속도</b>로, 서울에서 비가 내리는 시간을 온난 전선과 한랭 전선에 대해 각각 구해 입력해요.',
          hint: '지도의 파란 화살표가 비 구역의 폭, 붉은·푸른 화살표가 전선의 속도예요. 온난 전선: ' + W_WARM + ' ÷ ' + SPD_W + ', 한랭 전선: ' + W_COLD + ' ÷ ' + Math.round(SPD_C) + ' (km ÷ km/h = 시간)',
          setup() { setMode('pass', 'rain'); S.obs = 'south'; updateCtl(); },
          check: () => S.rainW === 6 && S.rainC === 2, hold: 0.5,
          status: () => mark(S.rainW === 6) + ' 온난 전선 ' + S.rainW + '시간 · ' + mark(S.rainC === 2) + ' 한랭 전선 ' + S.rainC + '시간',
          explain: '온난 전선은 폭 ' + W_WARM + ' km ÷ 속도 ' + SPD_W + ' km/h = <b>6시간</b> 동안 약한 비(3~9시), 한랭 전선은 폭 ' + W_COLD + ' km ÷ 속도 약 ' + Math.round(SPD_C) + ' km/h = <b>2시간</b> 동안 강한 소나기(17~19시)가 내려요. 온난 전선은 느리고 비 구역이 넓어 오래, 한랭 전선은 빠르고 좁아 짧고 강해요.',
        },
        {
          type: 'quiz', title: '관측점이 경로의 북쪽이라면',
          goal: '관측점을 <b>경로 북쪽</b>으로 바꾸고 시각을 흘려 보세요. 저기압이 지나가는 동안 풍향은 어떻게 변할까요?',
          setup() { setMode('pass', ''); S.obs = 'north'; S.tool = null; setTime(0); S.wang = windN(0); updateCtl(); },
          choices: ['남동 → 남서 → 북서 (시계 방향)', '동 → 북 → 북서 (반시계 방향)', '서 → 남 → 동 (시계 방향)', '풍향이 거의 변하지 않아요'],
          answer: 1,
          feedback: ['그 변화는 전선이 통과하는 경로 남쪽 관측점의 모습이에요.', '', '북쪽 관측점에서는 시계 방향으로 변하지 않아요. 그래프의 각도가 작아지는지 커지는지 확인해요.', '저기압 중심이 가까이 지나가므로 풍향이 뚜렷하게 변해요.'],
          explain: '경로의 북쪽에서는 <b>전선이 통과하지 않고</b>, 중심이 남쪽을 지나가면서 풍향이 <b>동 → 북 → 북서</b>로(각도는 90° → 0° → 315°) <b>반시계 방향</b>으로 변해요. 기온은 낮게 유지돼요. 한 지점의 풍향 변화가 시계 방향이면 중심이 북쪽, 반시계 방향이면 중심이 남쪽을 지나간 거예요.',
        },
      ],
    },
    {
      title: '고기압 통과: 맑음과 큰 일교차', short: '고기압 통과', icon: '🌤️', phase: '탐구', features: ['high'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 저기압이 지나면 풍향이 바뀌고 기압이 내려갔다 올라간다는 것을 확인했어요. 저기압 뒤에는 <b>이동성 고기압</b>이 따라와요.</div>' +
        '<p>양쯔강 기단에서 변질된 <b>이동성 고기압</b>은 서에서 동으로 이동하며 하강 기류 때문에 <b>맑고 바람이 약해요</b>. 경로의 남쪽 한 지점에서 기압과 풍향이 어떻게 변하는지 살펴보고, 맑은 날과 흐린 날의 <b>일교차</b>를 비교해요.</p>',
      setup() { enterLevel(2); },
      recap: '이동성 고기압이 지나는 동안 기압이 올랐다가 내려가고, 경로 남쪽에서는 풍향이 시계 방향으로 바뀌어요. 맑은 날은 구름이 없어 일교차가 커요.',
      summary: '<ul><li>이동성 고기압: 하강 기류로 <b>맑고 바람이 약해요</b>. 중심이 지나는 동안 기압이 <b>올랐다가 내려가요</b>.</li><li>관측점이 중심 경로의 남쪽이면 풍향이 <b>북서 → 북동 → 동 → 남동</b>으로 <b>시계 방향</b>(고기압은 바람이 시계 방향으로 불어 나가요).</li><li><b>일교차</b> = 최고 기온 − 최저 기온. 맑은 날(예: 22 °C·5 °C → 17 °C)은 구름이 없어 낮에 많이 가열되고 밤에 지표의 열이 우주로 잘 빠져나가 커요. 흐린 날은 약 5 °C로 작아요.</li><li>고기압이라고 해서 항상 추운 것은 아니에요. 기온은 기단의 성질과 계절, 하늘 상태에 따라 달라요. 다음 저기압이 접근하면 기압이 하강하고 구름이 늘어요.</li></ul>',
      missions: [
        {
          title: '고기압이 지난 뒤의 기압 예측',
          goal: '고기압 중심이 관측점의 북쪽을 지나간 <b>뒤</b>에 기압이 어떻게 될지 <b>예측을 고르고</b>, 시간을 <b>40시간 이상</b> 흘려 보내 그래프로 확인해요.',
          hint: '기압은 중심에 가까울수록 높아요. 중심이 멀어지면 어떻게 될까요? 슬라이더를 오른쪽 끝까지 끌거나 ▶ 재생을 눌러요.',
          setup() { setMode('high', 'pred'); S.dayView = 'pass'; S.pred = null; S.maxTH = 0; setTimeH(0); S.thv = 0; updateCtl(); },
          check: () => S.pred === 'down' && S.maxTH >= 40, hold: 0.5,
          status: () => mark(S.pred != null) + ' 예측 ' + (S.pred == null ? '선택 안 함' : S.pred === 'down' ? '내려가요' : S.pred === 'up' ? '계속 올라요' : '그대로') + ' · ' + mark(S.maxTH >= 40) + ' 확인한 시간 ' + Math.floor(S.maxTH) + ' / 40시간 · ' + mark(S.pred === 'down') + ' 예측이 그래프와 일치',
          explain: '고기압 중심이 가장 가까운 약 24시간에 기압이 가장 높고(1025 hPa), 중심이 멀어지면 기압이 <b>다시 내려가요</b>. 이어서 다음 저기압이 접근하면 기압이 더 내려가고 구름이 늘어요. 풍향은 북서 → 북동 → 동 → 남동으로 <b>시계 방향</b>으로 바뀌어요.',
        },
        {
          title: '일교차가 큰 날 고르기',
          goal: '세 날의 하루 기온 그래프를 보고 <b>일교차</b>가 가장 큰 날을 골라 <b>✔ 확인하기</b>를 눌러요.',
          hint: '각 곡선의 가장 높은 점(최고 기온)과 가장 낮은 점(최저 기온)의 차이를 구해 비교해요.',
          manual: true,
          setup() { setMode('high', 'range'); S.dayView = 'range'; S.day = null; updateCtl(); },
          status: () => mark(S.day != null) + ' 고른 날 ' + (S.day ? DAYS[S.day].name : '없음'),
          check() {
            if (!S.day) return '일교차가 가장 큰 날을 골라 주세요. (그래프 아래 카드나 오른쪽 버튼)';
            if (S.day !== 'A') return DAYS[S.day].name + '의 일교차는 ' + DAYS[S.day].range + ' °C예요. 최고·최저 기온의 차이가 더 큰 날이 있어요.';
            return true;
          },
          explain: 'A날은 최고 22 °C, 최저 5 °C로 일교차가 <b>17 °C</b>예요. 흐린 B날은 13 − 8 = 5 °C, 비 오는 C날은 3 °C 정도예요. 이동성 고기압이 지나는 <b>맑은 날</b>에 일교차가 커요.',
        },
        {
          type: 'quiz', title: '맑은 밤에 일교차가 큰 까닭',
          goal: '고기압이 지나는 <b>맑은 날</b>에 일교차가 큰 까닭으로 알맞은 것은?',
          setup() { setMode('high', 'range'); S.dayView = 'range'; updateCtl(); },
          choices: ['고기압에서는 언제나 기온이 낮기 때문이에요', '구름이 없어 낮에는 햇빛을 많이 받고, 밤에는 지표가 내보내는 열이 구름에 막히지 않고 빠져나가 복사 냉각이 크기 때문이에요', '고기압에서는 바람이 강해 열이 잘 섞이기 때문이에요', '맑은 날에는 밤에도 해가 떠 있기 때문이에요'],
          answer: 1,
          feedback: ['고기압이라고 항상 추운 것은 아니에요. 가을·겨울 맑은 날에도 낮에는 기온이 많이 올라요.', '', '고기압 중심 부근은 바람이 약해요. 바람이 약하면 오히려 복사 냉각이 잘 일어나요.', '밤에는 해가 지기 때문에 지표가 열을 잃어요.'],
          explain: '맑은 날은 낮에 햇빛이 구름에 가려지지 않아 기온이 많이 오르고, 밤에는 지표가 내보내는 복사 에너지를 구름이 막지 못해 <b>복사 냉각</b>으로 기온이 많이 내려가요. 구름이 있으면 낮에는 덜 오르고 밤에는 덜 내려가서 일교차가 작아요.',
        },
      ],
    },
    {
      title: '일기도 읽기: 속도와 도착 시각', short: '일기도 읽기', icon: '🗺️', phase: '분석', features: ['chart'],
      intro: '<div class="si-link">🔗 <b>앞 단계들에서</b> 저기압과 고기압이 지나갈 때 한 지점의 날씨가 어떻게 변하는지 시계열로 읽었어요. 이제 <b>일기도</b> 한 장에서 반대로 날씨 변화를 예측해 봐요.</div>' +
        '<p>두 장의 <b>예시 일기도</b>(00시, 12시)에는 등압선(4 hPa 간격)과 전선이 그려져 있어요. 12시간 동안 저기압 중심이 얼마나 움직였는지 눈금(100 km)으로 읽고, <b>이동 속도</b>를 구한 뒤 지점 B에 한랭 전선이 <b>몇 시간 뒤</b> 도착하는지 예측해요.</p>',
      setup() { enterLevel(3); },
      recap: '일기도 두 장에서 이동 거리와 시간으로 속도(600 km ÷ 12시간 = 50 km/h)를 구하고, 같은 속도로 이동한다고 가정해 도착 시각(400 km ÷ 50 km/h = 8시간)을 예측했어요.',
      summary: '<ul><li>일기도에서 읽을 것: <b>중심 기압</b>(예시 996 hPa), <b>등압선 간격</b>, <b>전선 기호</b>, <b>중심의 위치</b>.</li><li>이동 속도 = 이동 거리 ÷ 시간 = 600 km ÷ 12시간 = <b>50 km/h</b>.</li><li>도착 시각 = 거리 ÷ 속도 = 400 km ÷ 50 km/h = <b>8시간 뒤</b> (같은 모양으로 같은 속도로 이동한다고 가정).</li><li>등압선이 <b>촘촘할수록</b> 기압 차가 커서 바람이 세요.</li><li>실제 오늘의 일기도·위성·레이더 영상은 기상청 날씨누리에서 확인할 수 있어요.</li></ul>',
      missions: [
        {
          title: '중심 기압과 이동 속도 읽기',
          goal: '00시와 12시 일기도에서 <b>저기압 중심 기압</b>과 <b>12시간 동안 이동한 거리</b>를 읽고, <b>이동 속도</b>(km/h)를 구해 입력해요.',
          hint: '시각 버튼으로 두 일기도를 번갈아 보세요. 중심(저)의 가로 위치를 눈금(숫자는 km)에서 읽어 차이를 구하고, 거리 ÷ 시간으로 속도를 구해요.',
          setup() { setMode('chart', 'speed'); S.chartTouched = true; updateCtl(); },
          check: () => S.cP === CH.P && S.cDist === CH.speed * 12 && S.cSpd === CH.speed, hold: 0.5,
          status: () => mark(S.cP === CH.P) + ' 중심 기압 ' + S.cP + ' hPa · ' + mark(S.cDist === 600) + ' 이동 거리 ' + S.cDist + ' km · ' + mark(S.cSpd === CH.speed) + ' 속도 ' + S.cSpd + ' km/h',
          explain: '저기압 중심의 기압은 <b>996 hPa</b>이고, 00시에 동쪽으로 600 km 지점에 있던 중심이 12시에는 1200 km 지점에 있어요. 이동 거리 600 km ÷ 12시간 = <b>50 km/h</b>로 동쪽으로 이동했어요.',
        },
        {
          title: '지점 B에 한랭 전선이 도착하는 때',
          goal: '저기압과 전선이 같은 속도(' + CH.speed + ' km/h)로 같은 모양을 유지하며 이동한다고 해요. 12시 일기도에서 지점 B에 <b>한랭 전선</b>이 도착하는 때는 <b>몇 시간 뒤</b>일까요?',
          hint: '12시 일기도에서 B와 같은 위도의 한랭 전선까지의 거리를 눈금으로 읽어요. (파란 점이 한랭 전선의 위치예요.) 시간 = 거리 ÷ 속도',
          setup() { setMode('chart', 'arrive'); S.chart = 12; S.chartTouched = true; updateCtl(); },
          check: () => S.cArr === CH.hours, hold: 0.5,
          status: () => mark(S.cArr === CH.hours) + ' 도착까지 ' + S.cArr + '시간',
          explain: '12시 일기도에서 한랭 전선은 지점 B의 서쪽 <b>400 km</b>에 있어요. 전선이 ' + CH.speed + ' km/h로 이동하므로 400 km ÷ 50 km/h = <b>8시간 뒤</b>(20시)에 도착해요. 도착하면 B의 바람은 남서풍에서 북서풍으로 바뀌고 기온이 내려가요.',
        },
        {
          type: 'quiz', title: '등압선 간격과 바람의 세기',
          goal: '일기도에서 <b>등압선이 촘촘한 곳</b>의 바람은 어떨까요?',
          setup() { setMode('chart', ''); updateCtl(); },
          choices: ['등압선이 촘촘할수록 기압 차가 커서 바람이 세요', '등압선이 촘촘할수록 바람이 약해요', '등압선 간격과 바람 세기는 관계가 없어요', '등압선이 촘촘한 곳에서는 반드시 비가 와요'],
          answer: 0,
          feedback: ['', '반대예요. 가까운 거리에서 기압 차가 클수록 바람이 강해요.', '기압 차가 클수록 공기가 더 세게 움직여요. 등압선 간격과 관계가 있어요.', '바람의 세기와 비가 오는지는 별개예요. 비는 구름과 전선의 위치로 판단해요.'],
          explain: '등압선 간격이 좁으면 짧은 거리에서 기압이 크게 달라 <b>바람이 세요</b>. 그래서 저기압 중심 부근이나 전선 근처에서 바람이 강해요. 실제 오늘의 일기도는 <b>기상청 날씨누리</b>에서 확인해 보세요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'he-midlat-cyclone', mount: '#game', badge: '저기압 예보관', homeHref: '../../index.html#he',
    featureLabels: { struct: '🌀 저기압 지도 · AB 단면 · 이름표', pass: '📈 시각 슬라이더 · 관측점 · 시계열 그래프', high: '🌤️ 고기압 지도 · 기압 그래프 · 일교차', chart: '🗺️ 예시 일기도 · 눈금 · 바람 확인' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 루프 ---------- */
  let lastFree = false;
  SciSim.loop((dt, t) => {
    S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.play) { S.t = Math.min(24, S.t + dt * 1.2); sTime.value = S.t; SciSim.bindRange(sTime, oTime, (x) => (Math.round(x * 10) / 10).toFixed(1).replace('.0', '') + '시'); if (S.t >= 24) { S.play = false; updPlay(); } }
    if (S.playH) { S.th = Math.min(48, S.th + dt * 2.6); sTimeH.value = S.th; SciSim.bindRange(sTimeH, oTimeH, (x) => (Math.round(x * 10) / 10).toFixed(1).replace('.0', '') + '시간'); if (S.th >= 48) { S.playH = false; updPlay(); } }
    S.tv = approach(S.tv, S.t, dt, 12); S.thv = approach(S.thv, S.th, dt, 12); S.cv = approach(S.cv, S.chart, dt, 5);
    S.maxTH = Math.max(S.maxTH, S.th); S.abv = approach(S.abv, S.ab, dt, 14);
    const wtgt = S.obs === 'south' ? windS(S.t) : windN(S.t);
    wangA.v = angApproach(wangA.v, S.mode === 'high' ? windHN(S.th) : wtgt, dt, 7);
    if (!RM) stepDots(dt);
    if (S.mode === 'struct') board.update(dt);
    parts.update(dt);
    ctx.setTransform(view.scale * view.dpr, 0, 0, view.scale * view.dpr, 0, 0);
    ctx.fillStyle = '#e9f1f8'; ctx.fillRect(0, 0, VW, VH);
    if (S.mode === 'struct') {
      drawStruct(t);
      ctx.save(); ctx.fillStyle = 'rgba(255,255,255,.55)'; rr(LAY.tray.x, LAY.tray.y, LAY.tray.w, LAY.tray.h, 10).fill(); ctx.restore();
      if (!board.cards.some((c) => !c.zone)) T(LAY.tray.x + LAY.tray.w / 2, LAY.tray.y + LAY.tray.h / 2 + 5, '이름표를 모두 붙였어요 (잘못 붙인 것은 다시 끌어 옮길 수 있어요)', { size: 13.5, weight: 800, color: '#15803d' });
      drawSection(LAY.sec, MV1, S.abv, t);
      board.draw(t);
    } else if (S.mode === 'pass') {
      drawPassMap(t);
      plotAx.p = drawSeries(LAY.pl1, 'p', t); plotAx.t = drawSeries(LAY.pl2, 't', t);
    } else if (S.mode === 'high') {
      if (S.dayView === 'range') drawRange(t); else { drawHighMap(t); drawHighPlot(t); }
    } else drawChartMap(t);
    parts.draw(ctx);
    drawFlash(dt, 10);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(255,255,255,' + S.fade * 0.85 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : approach(S.fade, 0, dt, 9); }
    readouts();
  });
  enterLevel(0);

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, board, SER, SERH, DAYS, CH, LAY, MV1, MV2, MV3, MV4, windLow, windHigh, rainAt, cxAt, OBS_D, SPD_W, SPD_C, T_W, T_C, setTime, setTimeH, enterLevel,
    get game() { return game; },
    solveLabels() { board.cards.forEach((c) => { c.zone = c.id; }); board.layout(true); },
    solveScale() { SCALE_ITEMS.forEach((it, i) => { S.scale[i] = it.a; }); updateCtl(); },
    setSteppers(a) { if (a.rainW != null) stRainW.set(a.rainW); if (a.rainC != null) stRainC.set(a.rainC); if (a.cP != null) stP.set(a.cP); if (a.cDist != null) stDist.set(a.cDist); if (a.cSpd != null) stSpd.set(a.cSpd); if (a.cArr != null) stArr.set(a.cArr); },
  };

})();
