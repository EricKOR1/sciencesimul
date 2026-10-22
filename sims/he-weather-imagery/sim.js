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
     지구과학 Ⅰ. 대기와 해양의 상호작용 - 일기도·위성·레이더 [12지구01-03]
     ① 관찰: 위성 영상(가시·적외)   ② 분석: 레이더 영상(dBZ·에코 이동)
     ③ 모형: 소나기 저기압(중규모)   ④ 예측: 세 가지 자료를 겹쳐 날씨 예측
     ========================================================= */
  initStage('#e9f1f8', 800, 560, 600, 840, 1.3);

  /* ---------- 자료 (모두 교육용 예시) ---------- */
  const T_SURF = 15, LAPSE = 6.5;                         // 지표 기온(°C), 기온 감률(°C/km)
  const hOf = (Ttop) => (T_SURF - Ttop) / LAPSE;
  const irGray = (T) => clamp((20 - T) / 80, 0, 1);       // 적외 영상: 온도가 낮을수록 밝게 (+20 °C 검정 ... -60 °C 흰색)
  const CLOUD = {
    A: { id: 'A', name: '적란운', refl: 0.97, T: -60, u: 0.30, v: 0.36, ph: 0.4,
         blobs: [[0, 0, 0.115], [-0.06, 0.045, 0.075], [0.065, -0.03, 0.08], [0.02, 0.075, 0.07], [-0.03, -0.07, 0.06]] },
    B: { id: 'B', name: '권운', refl: 0.38, T: -45, u: 0.70, v: 0.19, ph: 1.7,
         blobs: [-3, -2, -1, 0, 1, 2, 3].map((i) => [i * 0.052, Math.sin(i * 1.3) * 0.018 - i * 0.006, 0.05]) },
    C: { id: 'C', name: '층운·안개', refl: 0.82, T: 5, u: 0.62, v: 0.70, ph: 3.0,
         blobs: [[-0.12, 0, 0.1], [-0.04, 0.02, 0.11], [0.05, -0.01, 0.11], [0.13, 0.02, 0.1], [0.0, 0.07, 0.09]] },
  };
  const CIDS = ['A', 'B', 'C'];
  const SURF = { sea: { T: 17, vis: 0.10, nm: '바다' }, land: { T: 20, vis: 0.22, nm: '육지' } };
  const LAND = [   // 이미지 안의 비율 좌표 (예시 지도)
    [[0, 0], [0.46, 0], [0.46, 0.10], [0.38, 0.22], [0.36, 0.32], [0.30, 0.42], [0.20, 0.48], [0.12, 0.58], [0, 0.64]],
    [[0.46, 0.18], [0.52, 0.22], [0.54, 0.32], [0.53, 0.46], [0.50, 0.57], [0.47, 0.50], [0.46, 0.40], [0.44, 0.28]],
    [[0.74, 0.24], [0.82, 0.20], [0.91, 0.30], [0.96, 0.42], [0.92, 0.50], [0.84, 0.52], [0.77, 0.44], [0.73, 0.34]],
  ];
  /* 레이더: dBZ → 강수 강도 (Z = 200 R^1.6 근사, 예시) */
  const DBZ_MM = [[20, 1], [35, 6], [45, 24], [55, 100]];
  const DBZ_STOPS = [[5, [165, 243, 252]], [15, [56, 189, 248]], [20, [34, 197, 94]], [30, [163, 230, 53]], [35, [250, 204, 21]], [40, [251, 146, 60]], [45, [239, 68, 68]], [50, [185, 28, 28]], [55, [162, 28, 175]], [62, [240, 171, 252]]];
  function dbzRGB(d) {
    if (d < DBZ_STOPS[0][0]) return null;
    for (let i = 0; i < DBZ_STOPS.length - 1; i++) {
      const a = DBZ_STOPS[i], b = DBZ_STOPS[i + 1];
      if (d <= b[0]) { const f = (d - a[0]) / (b[0] - a[0]); return [0, 1, 2].map((k) => Math.round(a[1][k] + (b[1][k] - a[1][k]) * f)); }
    }
    return DBZ_STOPS[DBZ_STOPS.length - 1][1];
  }
  const SPEED = 48, STEP_KM = 8, CITY_D = 40;             // 에코 이동: 10분에 8 km = 48 km/h, 도시까지 40 km → 50분
  const sq = (x) => x * x;
  const peakAt = (tm) => 62 - 0.2 * tm;
  const coreX = (tm) => 8 + (SPEED / 60) * tm, CORE_Y = 18;
  function radarField(x, y, tm) {
    const cx = coreX(tm), cy = CORE_Y, pk = peakAt(tm);
    const core = pk * Math.exp(-(sq((x - cx) / 7) + sq((y - cy) / 5)));
    const c2 = (pk - 14) * Math.exp(-(sq((x - cx + 8) / 5) + sq((y - cy - 4) / 4)));
    const c3 = (pk - 18) * Math.exp(-(sq((x - cx - 6) / 4) + sq((y - cy + 5) / 3.5)));
    const skirt = 26 * Math.exp(-(sq((x - cx + 3) / 13) + sq((y - cy) / 9)));
    return Math.max(core, c2, c3, skirt);
  }
  /* 지점 P: 가장 최근(10시 20분) 영상에서 정확히 45 dBZ가 되는, 핵의 남쪽 지점 */
  const P_PT = (() => {
    let lo = 0, hi = 12;
    for (let i = 0; i < 60; i++) { const mid = (lo + hi) / 2; if (radarField(coreX(20), CORE_Y + mid, 20) > 45) lo = mid; else hi = mid; }
    return { x: coreX(20), y: CORE_Y + (lo + hi) / 2 };
  })();
  const ECHO_T = 20;                                       // 마지막 영상 시각 (분)
  /* 소나기 (STEP 3): 14:00부터의 분 */
  const NS = 19, QT = Array.from({ length: NS }, (_, i) => i * 10);
  const Q = {
    T: [31, 31, 31, 31, 31, 31, 31, 29, 25, 24, 24, 24.5, 25, 25.5, 26, 26.5, 27, 27.5, 28],
    P: [1006, 1006, 1006, 1006, 1006, 1006, 1006, 1007.2, 1008, 1007.6, 1007, 1006.6, 1006.4, 1006.3, 1006.2, 1006.2, 1006.1, 1006.1, 1006],
    W: [225, 225, 225, 225, 225, 225, 225, 20, 10, 350, 330, 310, 300, 300, 300, 300, 300, 300, 300],
    V: [3, 3, 3, 3, 3, 3, 3, 11, 14, 9, 6, 5, 4, 4, 4, 4, 4, 4, 4],
  };
  const SQ_V = 30, XC0 = -10 - 0.5 * 70;                  // 소나기 구름 이동 속도 30 km/h = 0.5 km/분, 15:10(70분)에 앞쪽 가장자리가 관측점에 도착
  const xcAt = (tm) => -10 + 0.5 * (tm - 70);             // 비 구역의 중심 위치 (관측점 x = 0)
  const rainOff = (off) => (Math.abs(off) <= 10 ? 45 * Math.exp(-sq(off / 8)) : 0);
  Q.R = QT.map((tm) => Math.round(rainOff(-xcAt(tm))));    // 관측점에서 본 강수(mm/h): 구름 중심에서 관측점까지의 거리
  const Q_PASS = Q.T.findIndex((v) => v < Q.T[0]);        // 기온이 처음 떨어진 관측 인덱스 = 7 (15:10)
  const clock = (tm) => { const m = Math.round(tm); return (14 + Math.floor(m / 60)) + ':' + String(m % 60).padStart(2, '0'); };
  const devOf = (tm) => (tm < 45 ? smooth(tm / 45) : tm < 115 ? 1 : 1 - 0.85 * smooth((tm - 115) / 55));
  const stageOf = (tm) => (tm < 45 ? '적운 단계 · 상승 기류' : tm < 115 ? '성숙 단계 · 상승·하강 기류, 강한 비' : '소멸 단계 · 하강 기류 우세');
  /* 일기도·위성·레이더 종합 (STEP 4) */
  const PR = { seoul: { x: 480, y: 220 }, lineX0: 360, slope: -0.3, low: { x: 387, y: 130 }, v: 40, dist: 120, hours: 3 };
  const frontX = (y, th) => PR.lineX0 + PR.v * th + PR.slope * (y - 220);      // 시각 th(시간)에서 위도(y)에 있는 한랭 전선의 x
  const seoulWind = (th) => (th < PR.hours ? 225 : 315);
  const seoulT = (th) => (th < 2.8 ? 18 : th > 3.5 ? 11 : lerp(18, 11, (th - 2.8) / 0.7));
  const seoulP = (th) => (th < 3 ? 1004 - 0.5 * th : 1002.5 + 6.5 * smooth((th - 3) / 1.5));

  /* ---------- 상태 ---------- */
  const S = {
    mode: 'sat', sub: '', clock: 0,
    band: 'vis', irv: 0, night: 0, nightv: 0, probe: null, probedB: false, match: [null, null, null], hKm: 5,
    rt: 20, rtv: 20, playR: false, rainPick: null, dKm: 4, vKmh: 24, tMin: 20,
    sqv: 'cell', qt: 0, qtv: 0, playQ: false, qMark: null, qCls: [null, null, null], size: 30, sizev: 30,
    layers: { chart: true, sat: false, radar: false }, pt: 0, ptv: 0, playP: false, arrH: 1, after: [null, null, null], solved4: false, fade: 0,
  };
  const windA = { v: 225 };

  /* ---------- 화면 배치 ---------- */
  const LAY = PHONE
    ? { img: { x: 10, y: 10, w: 580, h: 470 }, leg: { x: 10, y: 488, w: 580, h: 160 },
        rad: { x: 10, y: 10, w: 580, h: 300 }, radLeg: { x: 10, y: 318, w: 580, h: 130 },
        sec: { x: 10, y: 10, w: 580, h: 300 }, pl1: { x: 10, y: 318, w: 580, h: 250 }, pl2: { x: 10, y: 576, w: 580, h: 250 }, scale: { x: 10, y: 10, w: 580, h: 700 },
        pm: { x: 10, y: 10, w: 580, h: 350 }, pinfo: { x: 10, y: 368, w: 580, h: 112 } }
    : { img: { x: 10, y: 10, w: 520, h: 430 }, leg: { x: 540, y: 10, w: 250, h: 430 },
        rad: { x: 10, y: 10, w: 780, h: 400 }, radLeg: { x: 10, y: 418, w: 780, h: 132 },
        sec: { x: 10, y: 10, w: 780, h: 250 }, pl1: { x: 10, y: 268, w: 385, h: 282 }, pl2: { x: 405, y: 268, w: 385, h: 282 }, scale: { x: 10, y: 10, w: 780, h: 540 },
        pm: { x: 10, y: 10, w: 780, h: 420 }, pinfo: { x: 10, y: 438, w: 780, h: 112 } };
  function clipRect(R) { ctx.beginPath(); ctx.rect(R.x, R.y, R.w, R.h); ctx.clip(); }
  const gstr = (g, a) => { const v = Math.round(clamp(g, 0, 1) * 255); return 'rgba(' + v + ',' + v + ',' + v + ',' + (a == null ? 1 : a) + ')'; };

  /* ======================================================
     STEP 1: 위성 영상 (가시 / 적외)
     ====================================================== */
  function cloudPos(c, t) { return { u: c.u + 0.014 * Math.sin(t * 0.25 + c.ph), v: c.v + 0.006 * Math.cos(t * 0.2 + c.ph) }; }
  function satLayer(R, isIR, t) {
    const nf = 1 - 0.94 * S.nightv;                                    // 밤에는 가시 영상이 어두워요
    ctx.fillStyle = gstr(isIR ? irGray(SURF.sea.T) : SURF.sea.vis * nf); ctx.fillRect(R.x, R.y, R.w, R.h);
    const landG = isIR ? irGray(SURF.land.T - 8 * S.nightv) : SURF.land.vis * nf;
    LAND.forEach((poly) => {
      ctx.beginPath(); poly.forEach((p, i) => { const x = R.x + p[0] * R.w, y = R.y + p[1] * R.h; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.closePath();
      ctx.fillStyle = gstr(landG); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.28)'; ctx.lineWidth = 1.6; ctx.stroke();
    });
    CIDS.forEach((id) => {
      const c = CLOUD[id], pos = cloudPos(c, t), g = isIR ? irGray(c.T) : c.refl * nf;
      const al = isIR ? 0.95 : (id === 'B' ? 0.7 : 0.95);
      c.blobs.forEach((b) => {
        const x = R.x + (pos.u + b[0]) * R.w, y = R.y + (pos.v + b[1]) * R.h, r = b[2] * R.w;
        const gr = ctx.createRadialGradient(x, y, 0, x, y, r);
        gr.addColorStop(0, gstr(g, al)); gr.addColorStop(0.62, gstr(g, al * 0.78)); gr.addColorStop(1, gstr(g, 0));
        ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
      });
    });
  }
  /* 눌러 본 곳: 가장 가까운 구름 (없으면 바다/육지) */
  function satHit(p, t) {
    const R = LAY.img;
    if (p.x < R.x || p.x > R.x + R.w || p.y < R.y || p.y > R.y + R.h) return null;
    let best = null, bd = 1e9;
    CIDS.forEach((id) => {
      const c = CLOUD[id], pos = cloudPos(c, t);
      c.blobs.forEach((b) => {
        const x = R.x + (pos.u + b[0]) * R.w, y = R.y + (pos.v + b[1]) * R.h, r = b[2] * R.w, d = Math.hypot(p.x - x, p.y - y) / r;
        if (d < 0.95 && d < bd) { bd = d; best = id; }
      });
    });
    if (best) return { id: best, x: p.x, y: p.y };
    const u = (p.x - R.x) / R.w, v = (p.y - R.y) / R.h;
    const land = LAND.some((poly) => { let inside = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a[1] > v) !== (b[1] > v) && u < (b[0] - a[0]) * (v - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside; } return inside; });
    return { id: land ? 'land' : 'sea', x: p.x, y: p.y };
  }
  function drawRamp(x, y, w, h, vertical, band) {
    const g = vertical ? ctx.createLinearGradient(0, y, 0, y + h) : ctx.createLinearGradient(x, 0, x + w, 0);
    if (band === 'ir') { g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#000000'); } else { g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#000000'); }
    ctx.fillStyle = g; rr(x, y, w, h, 6).fill(); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5; rr(x, y, w, h, 6).stroke();
  }
  function drawSatLegend(t) {
    const L = LAY.leg, ir = S.band === 'ir';
    D.shadow(() => { ctx.fillStyle = 'rgba(255,255,255,.95)'; rr(L.x, L.y, L.w, L.h, 12).fill(); }, { blur: 5, y: 2 });
    const probeText = () => {
      const pr = S.probe; if (!pr) return ['영상을 눌러 보세요', ''];
      const nm = pr.id === 'sea' || pr.id === 'land' ? SURF[pr.id].nm : '구름 ' + pr.id + ' (' + CLOUD[pr.id].name + ')';
      if (ir) { const T0 = pr.id === 'sea' || pr.id === 'land' ? SURF[pr.id].T - (pr.id === 'land' ? 8 * S.night : 0) : CLOUD[pr.id].T; return [nm, '표면·꼭대기 온도 ' + Math.round(T0) + ' °C']; }
      const g = pr.id === 'sea' || pr.id === 'land' ? SURF[pr.id].vis : CLOUD[pr.id].refl;
      return [nm, S.night > 0.5 ? '밤: 햇빛이 없어 거의 보이지 않아요' : '햇빛 반사 약 ' + Math.round(g * 100) + ' %'];
    };
    if (PHONE) {
      T(L.x + L.w / 2, L.y + 22, ir ? '적외 영상: 밝기 → 구름 꼭대기 온도' : '가시 영상: 밝기 → 햇빛 반사 정도', { size: 14, weight: 800, color: '#1e293b' });
      drawRamp(L.x + 40, L.y + 36, L.w - 80, 24, false, S.band);
      const ticks = ir ? [[-60, '−60 °C'], [-40, '−40'], [-20, '−20'], [0, '0'], [20, '+20 °C']] : [[1, '많음'], [0.5, ''], [0, '적음']];
      ticks.forEach(([v, s], i) => { const f = ir ? (v + 60) / 80 : 1 - v; T(L.x + 40 + f * (L.w - 80), L.y + 78, s, { size: 12.5, weight: 800, color: '#475569' }); });
      T(L.x + 40, L.y + 96, ir ? '← 밝다 = 차갑다 = 높다' : '← 밝다 = 반사가 많다 = 두껍다', { size: 12.5, weight: 800, color: '#0369a1', align: 'left' });
      const [a, b] = probeText(); T(L.x + 14, L.y + 124, a + (b ? ' · ' + b : ''), { size: 13.5, weight: 800, color: '#0f172a', align: 'left' });
    } else {
      T(L.x + L.w / 2, L.y + 24, ir ? '적외 영상: 온도 → 밝기' : '가시 영상: 반사 → 밝기', { size: 14.5, weight: 800, color: '#1e293b' });
      drawRamp(L.x + 22, L.y + 42, 34, 240, true, S.band);
      const ticks = ir ? [-60, -40, -20, 0, 20] : [1, 0.5, 0];
      ticks.forEach((v) => { const f = ir ? (v + 60) / 80 : 1 - v; const y = L.y + 42 + f * 240; ctx.strokeStyle = '#64748b'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(L.x + 56, y); ctx.lineTo(L.x + 64, y); ctx.stroke(); T(L.x + 68, y + 4, ir ? (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v) + ' °C' : (v === 1 ? '반사 많음' : v === 0 ? '반사 적음' : '반사 50 %'), { size: 12.5, weight: 800, color: '#475569', align: 'left' }); });
      drawWrap(L.x + L.w / 2, L.y + 300, ir ? '밝다 = 꼭대기가 차갑다 = 구름이 높다' : '밝다 = 햇빛을 많이 반사 = 구름이 두껍다', L.w - 30, 13.5, { color: '#0369a1', weight: 800 });
      ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(L.x + 14, L.y + 346); ctx.lineTo(L.x + L.w - 14, L.y + 346); ctx.stroke();
      const [a, b] = probeText();
      T(L.x + 16, L.y + 372, a, { size: 14.5, weight: 800, color: '#0f172a', align: 'left' });
      if (b) drawWrap(L.x + 16, L.y + 394, b, L.w - 30, 13.5, { color: '#334155', align: 'left' });
    }
  }
  function drawSat(t) {
    const R = LAY.img;
    ctx.save(); clipRect(R);
    ctx.fillStyle = '#000'; ctx.fillRect(R.x, R.y, R.w, R.h);
    if (S.irv < 0.99) { ctx.globalAlpha = 1; satLayer(R, false, t); }
    if (S.irv > 0.01) { ctx.globalAlpha = S.irv; satLayer(R, true, t); ctx.globalAlpha = 1; }
    if (S.nightv > 0.5 && S.irv < 0.5) { for (let i = 0; i < 30; i++) { const x = R.x + ((i * 97) % 520) / 520 * R.w, y = R.y + ((i * 53) % 430) / 430 * R.h; ctx.fillStyle = 'rgba(255,255,255,' + (0.15 + 0.1 * Math.sin(t * 2 + i)) + ')'; ctx.fillRect(x, y, 2, 2); } }
    ctx.restore();
    // 구름 이름표 A B C
    CIDS.forEach((id) => {
      const c = CLOUD[id], pos = cloudPos(c, t), lx = R.x + (pos.u + (id === 'B' ? 0 : 0)) * R.w, ly = R.y + (pos.v - (id === 'A' ? 0.17 : id === 'B' ? 0.08 : 0.15)) * R.h;
      D.shadow(() => { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(lx, ly, 13, 0, TAU); ctx.fill(); }, { blur: 4, y: 1 });
      T(lx, ly + 5.5, id, { size: 15, weight: 900, color: '#0f172a' });
    });
    if (S.probe) { D.ring(S.probe.x, S.probe.y, 12, t, { color: '#facc15', speed: 1, width: 2.5 }); }
    D.label(R.x + 10, R.y + 20 * FS, (S.band === 'ir' ? '적외' : '가시') + ' 영상 · ' + (S.night > 0.5 ? '밤' : '낮') + ' (예시)', { bg: 'rgba(15,23,42,.8)', size: 13, align: 'left' });
    if (S.nightv > 0.5 && S.irv < 0.5) T(R.x + R.w / 2, R.y + R.h / 2, '해가 없어서 가시 영상이 어두워요', { size: 15, weight: 800, color: '#cbd5e1' });
    drawSatLegend(t);
    if (PHONE) { note(10, 656, 580, S.band === 'ir' ? '적외 영상은 구름 꼭대기 온도를 보여 줘서 밤에도 볼 수 있어요.' : '가시 영상은 구름이 햇빛을 반사하는 정도를 보여 줘서 낮에만 볼 수 있어요.', 13.5); }
    else note(10, 448, 520, S.band === 'ir' ? '적외 영상: 구름 꼭대기 온도가 낮을수록 밝게 나타내요. 밤에도 볼 수 있어요.' : '가시 영상: 구름이 햇빛을 반사하는 정도(구름의 두께)가 밝게 나타나요. 낮에만 볼 수 있어요.', 13.5);
  }

  /* ======================================================
     STEP 2: 레이더 영상
     ====================================================== */
  const RC = { cols: PHONE ? 96 : 130, rows: PHONE ? 54 : 64 };
  const radCv = document.createElement('canvas'); radCv.width = RC.cols; radCv.height = RC.rows;
  const radCtx = radCv.getContext('2d'), radImg = radCtx.createImageData(RC.cols, RC.rows);
  const RK = () => LAY.rad.w / 80;                                    // 픽셀/km
  const rX = (x) => LAY.rad.x + x * RK(), rY = (y) => LAY.rad.y + y * RK();
  function drawRadar(t) {
    const R = LAY.rad, k = RK(), tm = S.rtv;
    ctx.save(); clipRect(R);
    // 바탕: 바다(왼쪽) · 육지(오른쪽)
    ctx.fillStyle = '#dbeafe'; ctx.fillRect(R.x, R.y, R.w, R.h);
    ctx.fillStyle = '#e7efe0'; ctx.beginPath(); ctx.moveTo(rX(42), R.y);
    for (let y = 0; y <= R.h / k + 1; y += 1) ctx.lineTo(rX(42 + 2.2 * Math.sin(y / 4.3)), rY(y));
    ctx.lineTo(R.x + R.w, R.y + R.h + 10); ctx.lineTo(R.x + R.w, R.y); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(71,85,105,.25)'; ctx.lineWidth = 1;
    for (let x = 0; x <= 80; x += 4) { ctx.beginPath(); ctx.moveTo(rX(x), R.y); ctx.lineTo(rX(x), R.y + R.h); ctx.stroke(); }
    for (let y = 0; y * k <= R.h; y += 4) { ctx.beginPath(); ctx.moveTo(R.x, rY(y)); ctx.lineTo(R.x + R.w, rY(y)); ctx.stroke(); }
    // 에코 (작은 이미지에 그린 뒤 부드럽게 확대)
    const d = radImg.data;
    for (let j = 0; j < RC.rows; j++) for (let i = 0; i < RC.cols; i++) {
      const x = (i + 0.5) / RC.cols * 80, y = (j + 0.5) / RC.rows * (R.h / k), dz = radarField(x, y, tm) + (Math.sin(i * 1.7 + j * 2.3) + Math.sin(i * 0.6 - j * 1.1)) * 0.9;
      const c = dbzRGB(dz), o = (j * RC.cols + i) * 4;
      if (c) { d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = Math.round(clamp((dz - 3) / 6, 0, 1) * 235); } else d[o + 3] = 0;
    }
    radCtx.putImageData(radImg, 0, 0);
    ctx.imageSmoothingEnabled = true; ctx.drawImage(radCv, R.x, R.y, R.w, R.h);
    ctx.restore();
    // 눈금 숫자
    for (let x = 0; x <= 80; x += 8) T(rX(x), R.y + R.h - 5, String(x), { size: 11.5, weight: 800, color: '#334155', stroke: 'rgba(255,255,255,.85)', strokeWidth: 3 });
    T(R.x + R.w - 6, R.y + R.h - 18, 'km (눈금 4 km)', { size: 11.5, weight: 800, color: '#334155', align: 'right', stroke: 'rgba(255,255,255,.85)', strokeWidth: 3 });
    // 핵(가장 강한 곳)의 자취 ✚
    [0, 10, 20].forEach((tt) => {
      if (tt > tm + 0.01) return;
      const x = rX(coreX(tt)), y = rY(CORE_Y), now = Math.abs(tt - tm) < 0.26;
      ctx.save(); ctx.strokeStyle = '#0f172a'; ctx.lineWidth = now ? 3.4 : 2.6; ctx.beginPath(); ctx.moveTo(x - 9, y); ctx.lineTo(x + 9, y); ctx.moveTo(x, y - 9); ctx.lineTo(x, y + 9); ctx.stroke(); ctx.restore();
      D.label(x, y - 26, '10:' + String(tt).padStart(2, '0'), { bg: 'rgba(15,23,42,.82)', size: 12.5, pad: 6 });
    });
    if (tm >= 9.99) D.arrow(rX(coreX(0)) + 12, rY(CORE_Y) + 22, rX(coreX(Math.min(tm, 20))) - 6, rY(CORE_Y) + 22, { color: '#0f172a', width: 3, head: 9 });
    // 도시
    const cx = rX(coreX(0) + 56), cy = rY(CORE_Y);
    D.shadow(() => D.sphere(cx, cy, 9, '#7c3aed', { gloss: true }), { blur: 4, y: 1 });
    D.label(cx, cy + 24, '도시', { bg: '#6d28d9', size: 13, pad: 7 });
    if (S.sub === 'move' && tm >= 19.9) {
      const x0 = rX(coreX(20)), y0 = rY(CORE_Y + 9);
      D.arrow(x0, y0, cx - 10, y0, { color: '#6d28d9', width: 3, head: 9 });
      D.label((x0 + cx) / 2, y0 - 18, '도시까지 ' + CITY_D + ' km', { bg: '#6d28d9', size: 13, pad: 7 });
    }
    if (S.sub === 'read') {
      const px = rX(P_PT.x), py = rY(P_PT.y);
      D.ring(px, py, 12, t, { color: '#0f172a', speed: 0.9, width: 2.5 });
      ctx.fillStyle = '#0f172a'; ctx.beginPath(); ctx.arc(px, py, 4.5, 0, TAU); ctx.fill();
      D.label(px + 40, py + 20, '지점 P (' + (tm >= 19.9 ? Math.round(radarField(P_PT.x, P_PT.y, 20)) + ' dBZ' : '10:20 영상에서 읽어요') + ')', { bg: '#0f172a', size: 13, pad: 7 });
    }
    D.label(R.x + 10, R.y + 20 * FS, '레이더 영상 · 10분 간격 (예시)', { bg: 'rgba(15,23,42,.8)', size: 13, align: 'left' });
    D.label(R.x + R.w - 10, R.y + 20 * FS, '10:' + String(Math.round(tm)).padStart(2, '0'), { bg: '#0f172a', size: 14, align: 'right' });
    // 색 막대와 강수 강도 표
    const L = LAY.radLeg, bx = L.x + 20, bw = L.w - 40, by = L.y + 30, bh = 22;
    D.shadow(() => { ctx.fillStyle = 'rgba(255,255,255,.95)'; rr(L.x, L.y, L.w, L.h, 12).fill(); }, { blur: 5, y: 2 });
    T(L.x + 14, L.y + 20 * FS, '반사도 (dBZ) → 강수 강도', { size: 14, weight: 800, color: '#1e293b', align: 'left' });
    for (let i = 0; i < bw; i++) { const dz = 5 + i / bw * 57, c = dbzRGB(dz); ctx.fillStyle = 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')'; ctx.fillRect(bx + i, by, 1.5, bh); }
    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 1.5; ctx.strokeRect(bx, by, bw, bh);
    for (let dz = 10; dz <= 60; dz += 10) { const x = bx + (dz - 5) / 57 * bw; T(x, by + bh + 16 * FS, String(dz), { size: 12.5, weight: 800, color: '#475569' }); }
    DBZ_MM.forEach(([dz, mm]) => {
      const x = bx + (dz - 5) / 57 * bw;
      ctx.fillStyle = '#0f172a'; ctx.beginPath(); ctx.moveTo(x, by - 1); ctx.lineTo(x - 5, by - 9); ctx.lineTo(x + 5, by - 9); ctx.closePath(); ctx.fill();
      D.label(x, by + bh + 46 * FS, dz + ' dBZ ≈ ' + mm + ' mm/h', { bg: dz >= 45 ? '#b91c1c' : '#475569', size: 12, pad: 6 });
    });
  }

  /* ======================================================
     STEP 3: 소나기 저기압 (여름 오후 단면 + 관측 시계열)
     ====================================================== */
  const SECK = () => LAY.sec.w / 100;                                   // 픽셀/km, 가로 −45 ~ +55 km
  const sxK = (x) => LAY.sec.x + (x + 45) * SECK();
  const secGround = () => LAY.sec.y + LAY.sec.h - 28;
  const kmY = () => (LAY.sec.h - 40) / 11;                              // 픽셀/km (세로)
  const thermals = [];
  function stepSq(dt) {
    const tm = S.qtv, dev = devOf(tm), xc = xcAt(tm);
    if (S.mode !== 'sq' || S.sqv !== 'cell' || RM) return;
    if (Math.random() < dt * (10 + 22 * dev)) thermals.push({ x: xc + rnd(-6, 26), y: 0, v: rnd(0.9, 1.8), life: 1, w: rnd(0.9, 1.5) });
    for (let i = thermals.length - 1; i >= 0; i--) { const q = thermals[i]; q.y += q.v * dt * (1.4 + dev); q.life -= dt * 0.18; if (q.y > 1.6 + 8.5 * dev || q.life <= 0) thermals.splice(i, 1); }
  }
  function drawSection(t) {
    const R = LAY.sec, gy = secGround(), ky = kmY(), tm = S.qtv, dev = devOf(tm), xc = xcAt(tm);
    ctx.save(); clipRect(R);
    const sk = ctx.createLinearGradient(0, R.y, 0, gy); sk.addColorStop(0, '#7dc4f5'); sk.addColorStop(1, '#cfe9fb'); ctx.fillStyle = sk; ctx.fillRect(R.x, R.y, R.w, R.h);
    // 지표 가열 (태양 · 아지랑이)
    const preHeat = 1 - smooth(tm / 90) * 0.0;
    D.glow(R.x + 60, R.y + 36, 70, '#fde047', 0.9); D.sphere(R.x + 60, R.y + 36, 20, '#fbbf24', { gloss: false });
    ctx.fillStyle = 'rgba(239,68,68,' + (0.18 * preHeat) + ')'; ctx.fillRect(R.x, gy - 12, R.w, 12);
    // 차가운 공기 (하강 기류가 퍼진 곳)
    if (dev > 0.35) {
      const x0 = sxK(xc - 16), x1 = sxK(xc + 10);
      const g = ctx.createLinearGradient(0, gy - ky * 1.1, 0, gy); g.addColorStop(0, 'rgba(59,130,246,0)'); g.addColorStop(1, 'rgba(59,130,246,' + 0.55 * Math.min(1, dev * 1.1) + ')');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x0, gy); ctx.quadraticCurveTo(x0, gy - ky * 1.1, (x0 + x1) / 2, gy - ky * 1.1); ctx.quadraticCurveTo(x1 + 4, gy - ky * 1.1, x1 + 6, gy); ctx.closePath(); ctx.fill();
    }
    // 구름: 적운 → 적란운 (발달 정도 dev)
    const baseY = gy - ky * 1.6, topH = 1.6 + 8.6 * dev, wBase = 8 + 8 * dev;
    const puffs = [];
    for (let j = 0; j <= 12; j++) {
      const f = j / 12, h = 1.6 + (topH - 1.6) * f, r = SECK() * (2.3 + 2.1 * dev * (1 - 0.35 * f)) * (0.8 + 0.25 * Math.sin(Math.PI * Math.min(1, f * 0.8 + 0.2))) + Math.sin(j * 1.7) * 2.5;
      puffs.push({ x: xc + 6 + Math.sin(j * 2.3) * 1.0, y: gy - h * ky, r: Math.max(8, r), f });
      if (f < 0.65 && dev > 0.3) { puffs.push({ x: xc + 6 - 4.2 * (1 - f), y: gy - (h - 0.4) * ky, r: Math.max(8, r * 0.8), f }); puffs.push({ x: xc + 6 + 4.2 * (1 - f), y: gy - (h - 0.4) * ky, r: Math.max(8, r * 0.8), f }); }
    }
    puffs.forEach((p) => { const px = sxK(p.x); const tone = 0.15 + 0.85 * (1 - p.f) * (dev > 0.5 ? 1 : 0.4); const gr = ctx.createRadialGradient(px - p.r * 0.3, p.y - p.r * 0.35, p.r * 0.1, px, p.y, p.r); gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, shade('#cbd5e1', -0.5 * tone * dev)); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(px, p.y, p.r, 0, TAU); ctx.fill(); });
    if (dev > 0.55) { const ay = gy - topH * ky + 8; for (let a = 0; a < 9; a++) { const px = sxK(xc + 6 + a * 1.9), r = 12 - a * 0.7; ctx.fillStyle = 'rgba(241,245,249,.95)'; ctx.beginPath(); ctx.arc(px, ay + Math.sin(a) * 2, Math.max(4, r), 0, TAU); ctx.fill(); } }
    // 비
    if (dev > 0.3) {
      const x0 = sxK(xc - 10), x1 = sxK(xc + 10), top = baseY + 10;
      for (let x = x0; x <= x1; x += 6) {
        const off = (x - sxK(xc)) / SECK(), inten = rainOff(off) / 45 * Math.min(1, dev * 1.15);
        if (inten < 0.05) continue;
        ctx.strokeStyle = 'rgba(30,64,175,' + (0.35 + 0.6 * inten) + ')'; ctx.lineWidth = 1.2 + 1.8 * inten; ctx.lineCap = 'round';
        const len = gy - top, ph = RM ? 0.4 : ((t * 1.6 + x * 0.113) % 1);
        for (let q = 0; q < 3; q++) { const f = (ph + q / 3) % 1, y0 = top + f * len; ctx.beginPath(); ctx.moveTo(x - 2 * f, y0); ctx.lineTo(x - 2 * f - 1.5, Math.min(gy, y0 + 10)); ctx.stroke(); }
      }
    }
    // 상승 기류 입자와 화살표
    thermals.forEach((q) => { const px = sxK(q.x), py = gy - q.y * ky; ctx.fillStyle = 'rgba(239,68,68,' + (0.7 * q.life) + ')'; ctx.beginPath(); ctx.arc(px, py, 2.6 * q.w, 0, TAU); ctx.fill(); });
    if (dev > 0.05) { const ax = sxK(xc + 18); D.arrow(ax, gy - ky * 0.6, ax, gy - ky * (1.4 + 2.6 * dev), { color: '#dc2626', width: 3.5, head: 10 }); T(ax + 6, gy - ky * 1.0, '상승', { size: 12.5, weight: 800, color: '#b91c1c', align: 'left' }); }
    if (dev > 0.5) {
      const ax = sxK(xc);
      D.arrow(ax, gy - ky * 5.5, ax, gy - ky * 2.2, { color: '#1d4ed8', width: 3.5, head: 10 }); T(ax + 6, gy - ky * 4, '하강', { size: 12.5, weight: 800, color: '#1d4ed8', align: 'left' });
      D.arrow(sxK(xc - 2), gy - ky * 0.45, sxK(xc - 14), gy - ky * 0.45, { color: '#1d4ed8', width: 3, head: 9 });
      D.arrow(sxK(xc + 2), gy - ky * 0.45, sxK(xc + 12), gy - ky * 0.45, { color: '#1d4ed8', width: 3, head: 9 });
      T(sxK(xc + 12), gy - ky * 0.95, '돌풍', { size: 12.5, weight: 800, color: '#1d4ed8' });
    }
    // 지면과 관측점
    ctx.fillStyle = '#7c5a3a'; ctx.fillRect(R.x, gy, R.w, R.h - (gy - R.y)); ctx.fillStyle = '#5a8f4e'; ctx.fillRect(R.x, gy, R.w, 5);
    ctx.restore();
    const sx0 = sxK(0);
    ctx.fillStyle = '#334155'; ctx.fillRect(sx0 - 2, gy - 34, 4, 34); ctx.fillStyle = '#7c3aed'; rr(sx0 - 11, gy - 46, 22, 14, 4).fill();
    D.label(sx0, gy + 15, '관측점', { bg: '#6d28d9', size: 12.5, pad: 6 });
    // 크기 표시 (비 구역 폭)
    if (dev > 0.5) { D.arrow(sxK(xc - 10), gy + 17, sxK(xc + 10), gy + 17, { color: '#fde68a', width: 2.5, head: 7 }); }
    D.label(R.x + 10, R.y + 20 * FS, '여름 오후 소나기 (예시) · ' + clock(tm), { bg: 'rgba(15,23,42,.82)', size: 13, align: 'left' });
    D.label(R.x + R.w - 10, R.y + 20 * FS, stageOf(tm), { bg: dev >= 1 ? '#b91c1c' : dev > 0.4 ? '#d97706' : '#15803d', size: 13, align: 'right' });
    T(R.x + R.w - 8, R.y + R.h - 8, '서 → 동 · 구름이 동쪽으로 ' + SQ_V + ' km/h로 이동해요', { size: 11.5, weight: 700, color: '#f1f5f9', align: 'right' });
  }
  function gaQ(R) { return { x: R.x + 46, y: R.y + 84, w: R.w - 46 - 14, h: R.h - 84 - 30 }; }
  const plotQ = {};
  function drawQPlot(R, kind, t) {
    const isT = kind === 'T', GA = gaQ(R), arr = isT ? Q.T : Q.P;
    const ax = mkAx(GA, [0, 180], isT ? [22, 34] : [1004, 1010]); plotQ[kind] = ax;
    D.shadow(() => { ctx.fillStyle = 'rgba(255,255,255,.9)'; rr(R.x, R.y, R.w, R.h, 12).fill(); }, { blur: 5, y: 2 });
    T(R.x + 10, R.y + 20 * FS, isT ? '기온 (°C) · 강수' : '기압 (hPa) · 풍향·풍속', { size: 14.5, weight: 800, color: '#1e293b', align: 'left' });
    drawAx(ax, { xticks: [0, 30, 60, 90, 120, 150, 180], yticks: isT ? [24, 28, 32] : [1005, 1007, 1009], xfmt: (v) => clock(v) });
    const sy = R.y + 52;
    if (isT) {
      const base = sy + 22;
      QT.forEach((tm, i) => { const r = Q.R[i]; if (!r) return; const h = Math.max(3, r / 45 * 26); ctx.fillStyle = r > 20 ? '#1d4ed8' : '#7dd3fc'; ctx.fillRect(ax.x(tm - 5), base - h, ax.x(5) - ax.x(-5) + 0.6, h); });
      ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(GA.x, base); ctx.lineTo(GA.x + GA.w, base); ctx.stroke();
      T(R.x + 6, sy - 6, '강수', { size: 11.5, weight: 800, color: '#64748b', align: 'left' });
    } else {
      QT.forEach((tm, i) => { if (i % 2) return; windArrow(ax.x(tm), sy + 4, Q.W[i], 10 + Q.V[i] * 1.5, '#0f172a', 2.4); });
      T(R.x + 6, sy - 6, '바람 (길이 = 풍속)', { size: 11.5, weight: 800, color: '#64748b', align: 'left' });
    }
    const pts = QT.map((tm, i) => [ax.x(tm), ax.y(arr[i])]);
    polyline(pts, isT ? '#ea580c' : '#7c3aed', 3.2);
    pts.forEach((p, i) => { ctx.fillStyle = '#fff'; ctx.strokeStyle = isT ? '#ea580c' : '#7c3aed'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p[0], p[1], i === S.qMark && isT ? 6 : 3.8, 0, TAU); ctx.fill(); ctx.stroke(); });
    if (S.qMark != null && isT) { const x = ax.x(QT[S.qMark]); D.dashedLine(x, GA.y - 20, x, GA.y + GA.h, { color: '#dc2626', width: 2.4, dash: [6, 5] }); T(x, GA.y - 24, '📌 ' + clock(QT[S.qMark]), { size: 12.5, weight: 800, color: '#b91c1c' }); }
    const cx = ax.x(clamp(S.qtv, 0, 180));
    ctx.save(); ctx.strokeStyle = 'rgba(15,23,42,.75)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx, R.y + 30); ctx.lineTo(cx, GA.y + GA.h); ctx.stroke(); ctx.restore();
    D.shadow(() => D.sphere(cx, ax.y(valAt(arr, QT, S.qtv)), 6.5, isT ? '#ea580c' : '#7c3aed', { gloss: true }), { blur: 4, y: 1 });
  }
  const valAt = (arr, xs, x) => { if (x <= xs[0]) return arr[0]; if (x >= xs[xs.length - 1]) return arr[arr.length - 1]; let i = 0; while (i < xs.length - 2 && x > xs[i + 1]) i++; return lerp(arr[i], arr[i + 1], (x - xs[i]) / (xs[i + 1] - xs[i])); };
  const sampleAt = (tm) => clamp(Math.round(tm / 10), 0, NS - 1);
  /* 크기 비교 보기 */
  const sizeOf = (v) => 10 * Math.pow(300, v / 100);
  function drawScale(t) {
    const R = LAY.scale, k = PHONE ? 0.125 : 0.18, cx = R.x + R.w / 2, cy = R.y + (PHONE ? 330 : R.h / 2 - 10), size = S.sizev;
    D.shadow(() => { ctx.fillStyle = 'rgba(255,255,255,.95)'; rr(R.x, R.y, R.w, PHONE ? 640 : R.h, 14).fill(); }, { blur: 5, y: 2 });
    ctx.save(); rr(R.x + 6, R.y + 6, R.w - 12, (PHONE ? 640 : R.h) - 12, 10).clip();
    ctx.fillStyle = '#e7efe0'; ctx.fillRect(R.x, R.y, R.w, R.h + 200);
    ctx.strokeStyle = 'rgba(100,116,139,.2)'; for (let x = -4000; x <= 4000; x += 500) { ctx.beginPath(); ctx.moveTo(cx + x * k, R.y); ctx.lineTo(cx + x * k, R.y + 900); ctx.stroke(); }
    for (let y = -3000; y <= 3000; y += 500) { ctx.beginPath(); ctx.moveTo(R.x, cy + y * k); ctx.lineTo(R.x + R.w, cy + y * k); ctx.stroke(); }
    // 한반도 (1000 km 비교용, 예시)
    const KR = [[0.30, 0], [0.55, 0.05], [0.62, 0.2], [0.55, 0.35], [0.7, 0.55], [0.6, 0.75], [0.42, 0.95], [0.3, 0.8], [0.25, 0.55], [0.2, 0.3]];
    const kx0 = cx - 520 * k, ky0 = cy - 560 * k;
    ctx.beginPath(); KR.forEach((p, i) => { const x = kx0 + p[0] * 1000 * k, y = ky0 + p[1] * 1100 * k; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.closePath();
    ctx.fillStyle = '#bcd9a8'; ctx.fill(); ctx.strokeStyle = '#6b8f5a'; ctx.lineWidth = 2; ctx.stroke();
    ctx.restore();
    // 저기압 원
    const r = size * k / 2, col = size >= 1000 ? '#2563eb' : size < 200 ? '#d97706' : '#7c3aed';
    ctx.save(); rr(R.x + 6, R.y + 6, R.w - 12, (PHONE ? 640 : R.h) - 12, 10).clip();
    ctx.fillStyle = rgba(col, 0.22); ctx.beginPath(); ctx.arc(cx, cy, Math.max(r, 2.5), 0, TAU); ctx.fill();
    ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, Math.max(r, 2.5), 0, TAU); ctx.stroke();
    ctx.restore();
    if (r < 12) { D.arrow(cx + 70, cy - 50, cx + 8, cy - 4, { color: col, width: 3, head: 9 }); }
    // 거리 막대
    const bx = R.x + 20, by = R.y + (PHONE ? 600 : R.h - 24);
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + 500 * k, by); ctx.stroke(); T(bx + 250 * k, by - 8, '500 km', { size: 12.5, weight: 800, color: '#334155' });
    D.label(R.x + 14, R.y + 22 * FS, '같은 눈금으로 크기 비교 (예시)', { bg: 'rgba(15,23,42,.82)', size: 13, align: 'left' });
    T(kx0 + 0.45 * 1000 * k, ky0 + 0.5 * 1100 * k + 24, '한반도(약 1000 km)', { size: 12.5, weight: 800, color: '#365314' });
    // 설명 카드
    const dur = size / 40, durTxt = dur < 1.5 ? Math.round(dur * 60) + '분' : dur < 36 ? f1(dur) + '시간' : f1(dur / 24) + '일 (' + Math.round(dur) + '시간)';
    const cls = size >= 1000 ? '종관 규모 저기압' : size < 200 ? '중규모 저기압' : '중규모와 종관 규모 사이 (경계)';
    const cy2 = R.y + (PHONE ? 650 : 0);
    if (PHONE) { note(R.x, 652, R.w, '크기 약 ' + Math.round(size) + ' km → ' + cls + '\n한 지점을 지나는 데 약 ' + durTxt + ' (크기 ÷ 이동 속도 40 km/h)', 13.5, { border: col }); }
    else {
      D.shadow(() => { ctx.fillStyle = 'rgba(255,255,255,.96)'; rr(R.x + R.w - 250, R.y + 40, 238, 120, 12).fill(); }, { blur: 5, y: 2 });
      ctx.strokeStyle = col; ctx.lineWidth = 2.5; rr(R.x + R.w - 250, R.y + 40, 238, 120, 12).stroke();
      T(R.x + R.w - 238, R.y + 66, '크기 약 ' + Math.round(size) + ' km', { size: 15, weight: 800, color: '#0f172a', align: 'left' });
      T(R.x + R.w - 238, R.y + 90, cls, { size: 14, weight: 800, color: col, align: 'left' });
      drawWrap(R.x + R.w - 238, R.y + 116, '지나가는 데 약 ' + durTxt + '\n(크기 ÷ 이동 속도 40 km/h)', 220, 13, { align: 'left' });
    }
  }

  /* ======================================================
     STEP 4: 일기도 + 위성 + 레이더 겹쳐 보기
     ====================================================== */
  const PK = () => (PHONE ? LAY.pm.w / 700 : 1.0);
  const pX = (x) => LAY.pm.x + (PHONE ? 0 : 40) + x * PK(), pY = (y) => LAY.pm.y + y * PK();
  const KOREA = [[440, 0], [700, 0], [700, 420], [472, 420], [452, 350], [432, 280], [448, 222], [426, 150], [442, 90]];
  const echoBlobs = (() => {                                       // 레이더: 한랭 전선을 따라 늘어선 강한 에코 + 뒤쪽의 약한 에코
    const a = []; let seed = 7; const rd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (let y = 120; y <= 420; y += 12) { const dz = 40 + rd() * 14; a.push({ dx: rd() * 8 - 4, y, r: 13 + rd() * 6, dz }); }
    for (let i = 0; i < 40; i++) { const y = 140 + rd() * 280; a.push({ dx: -(18 + rd() * 90), y, r: 10 + rd() * 14, dz: 14 + rd() * 14 }); }
    return a;
  })();
  const irBlobs = (() => {                                         // 적외: 전선 서쪽의 폭 넓은 밝은 구름 띠
    const a = []; let seed = 11; const rd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (let i = 0; i < 70; i++) { const y = 100 + rd() * 330; a.push({ dx: -(rd() * 120 - 20), y, r: 22 + rd() * 26, g: 0.6 + rd() * 0.4 }); }
    return a;
  })();
  function drawPred(t) {
    const M = LAY.pm, k = PK(), th = S.ptv, L = S.layers;
    ctx.save(); clipRect(M);
    ctx.fillStyle = L.sat ? '#1e293b' : '#cfe3f6'; ctx.fillRect(M.x, M.y, M.w, M.h);
    ctx.beginPath(); KOREA.forEach((p, i) => (i ? ctx.lineTo(pX(p[0]), pY(p[1])) : ctx.moveTo(pX(p[0]), pY(p[1])))); ctx.closePath();
    ctx.fillStyle = L.sat ? '#334155' : '#dfe9d2'; ctx.fill(); ctx.strokeStyle = L.sat ? '#64748b' : '#8aa078'; ctx.lineWidth = 2; ctx.stroke();
    ctx.strokeStyle = 'rgba(71,85,105,.2)'; ctx.lineWidth = 1;
    for (let x = 0; x <= 700; x += 100) { ctx.beginPath(); ctx.moveTo(pX(x), M.y); ctx.lineTo(pX(x), M.y + M.h); ctx.stroke(); }
    for (let y = 0; y <= 420; y += 100) { ctx.beginPath(); ctx.moveTo(M.x, pY(y)); ctx.lineTo(M.x + M.w, pY(y)); ctx.stroke(); }
    const sh = PR.v * th;
    // 적외 위성: 차가운(높은) 구름 = 밝게
    if (L.sat) {
      irBlobs.forEach((b) => {
        const x = pX(frontX(b.y, th) + b.dx), y = pY(b.y), r = b.r * k * 1.5, gr = ctx.createRadialGradient(x, y, 0, x, y, r);
        gr.addColorStop(0, 'rgba(255,255,255,' + 0.7 * b.g + ')'); gr.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
      });
    }
    // 일기도: 등압선 · 저기압 · 한랭 전선
    if (L.chart) {
      const lx = PR.low.x + sh, ly = PR.low.y;
      [[1000, 60], [1004, 105], [1008, 150], [1012, 200]].forEach(([p, r]) => {
        ctx.strokeStyle = 'rgba(71,85,105,.7)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(pX(lx), pY(ly), r * k, 0, TAU); ctx.stroke();
        T(pX(lx) - r * k * 0.7, pY(ly) - r * k * 0.7 + 4, String(p), { size: 11.5, weight: 800, color: '#475569', stroke: 'rgba(255,255,255,.85)', strokeWidth: 3 });
      });
      const y1 = 420, x1 = frontX(y1, th);
      ctx.save(); ctx.strokeStyle = '#1d4ed8'; ctx.fillStyle = '#1d4ed8'; ctx.lineWidth = 3.6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(pX(lx), pY(ly)); ctx.lineTo(pX(x1), pY(y1)); ctx.stroke();
      const len = Math.hypot((x1 - lx) * k, (y1 - ly) * k), dx = (x1 - lx) * k / len, dy = (y1 - ly) * k / len, ex = dy, ey = -dx;   // ex, ey: 전선이 나아가는 동쪽 방향의 수직 벡터
      for (let s = 30; s < len - 10; s += 34) {
        const px = pX(lx) + dx * s, py = pY(ly) + dy * s;
        ctx.beginPath(); ctx.moveTo(px - dx * 9, py - dy * 9); ctx.lineTo(px + dx * 9, py + dy * 9); ctx.lineTo(px + ex * 15, py + ey * 15); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
      D.shadow(() => D.sphere(pX(lx), pY(ly), 14, '#dc2626', { gloss: true }), { blur: 5, y: 2 }); T(pX(lx), pY(ly) + 5.5, '저', { size: 15, weight: 900, color: '#fff' });
      D.label(pX(lx), pY(ly) + 30, '1000 hPa', { bg: '#b91c1c', size: 12, pad: 6 });
    }
    // 레이더 에코: 강한 에코 선
    if (L.radar) {
      echoBlobs.forEach((b) => {
        const x = pX(frontX(b.y, th) + b.dx), y = pY(b.y), r = b.r * k, c = dbzRGB(b.dz); if (!c) return;
        const gr = ctx.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(' + c.join(',') + ',.95)'); gr.addColorStop(0.7, 'rgba(' + c.join(',') + ',.7)'); gr.addColorStop(1, 'rgba(' + c.join(',') + ',0)');
        ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
      });
    }
    ctx.restore();
    // 서울과 거리 · 속도
    const sx = pX(PR.seoul.x), sy = pY(PR.seoul.y);
    const fx = pX(frontX(PR.seoul.y, th));
    if (L.radar || L.chart) {
      D.arrow(pX(frontX(PR.seoul.y, 0)), sy + 36 * k + 14, sx - 12, sy + 36 * k + 14, { color: '#0f172a', width: 2.6, head: 8 });
      D.label((pX(frontX(PR.seoul.y, 0)) + sx) / 2, sy + 36 * k + 32, '서울까지 약 ' + PR.dist + ' km', { bg: '#0f172a', size: 12.5, pad: 6 });
    }
    if (L.radar) { D.arrow(pX(frontX(300, 0)) + 6, pY(300) - 24, pX(frontX(300, 0)) + 56, pY(300) - 24, { color: '#7f1d1d', width: 3, head: 9 }); D.label(pX(frontX(300, 0)) + 30, pY(300) - 42, '에코 동진 ' + PR.v + ' km/h', { bg: '#7f1d1d', size: 12.5, pad: 6 }); }
    D.ring(sx, sy, 12, t, { color: '#7c3aed', speed: 0.8, width: 2 });
    D.shadow(() => D.sphere(sx, sy, 8, '#7c3aed', { gloss: true }), { blur: 4, y: 1 });
    D.label(sx + 22, sy - 14, '서울', { bg: '#6d28d9', size: 13, pad: 7, align: 'left' });
    windArrow(sx + 16, sy + 22, windA.v, 30, '#111827', 3.4);
    const rainNow = L.radar && Math.abs(th - PR.hours) < 0.25;
    if (rainNow && !RM) for (let i = 0; i < 2; i++) parts.emit({ x: sx + rnd(-14, 14), y: sy - 8, vx: -6, vy: rnd(60, 100), life: 0.6, size: 1.8, color: '#1d4ed8', shape: 'circle', fade: true });
    D.label(M.x + 10, M.y + 20 * FS, '서쪽 하늘에서 오는 비구름 (예시)', { bg: 'rgba(15,23,42,.82)', size: 13, align: 'left' });
    const on = ['chart', 'sat', 'radar'].filter((q) => L[q]).length;
    if (!on) T(M.x + M.w / 2, M.y + M.h / 2, '겹쳐 볼 자료를 켜 보세요', { size: 16, weight: 800, color: '#475569' });
    // 정보 패널: 서울의 날씨 (시간에 따라)
    const I = LAY.pinfo, w = seoulWind(th);
    D.shadow(() => { ctx.fillStyle = 'rgba(255,255,255,.95)'; rr(I.x, I.y, I.w, I.h, 12).fill(); }, { blur: 5, y: 2 });
    T(I.x + 14, I.y + 24, '서울의 날씨 (예시 예측) · 지금부터 ' + fmtP(th), { size: 14.5, weight: 800, color: '#1e293b', align: 'left' });
    const cols = PHONE ? 1 : 3;
    const items = [['풍향', windName(w) + ' ' + w + '°'], ['기온', f1(seoulT(th)) + ' °C'], ['기압', f1(seoulP(th)) + ' hPa']];
    items.forEach((it, i) => { const bx = I.x + 14 + i * (I.w - 28) / 3, bw = (I.w - 28) / 3 - 10; ctx.fillStyle = '#f1f5f9'; rr(bx, I.y + 34, bw, 48, 10).fill(); T(bx + bw / 2, I.y + 51, it[0], { size: 12.5, weight: 800, color: '#64748b' }); T(bx + bw / 2, I.y + 73, it[1], { size: 15.5, weight: 800, color: '#0f172a' }); });
    if (PHONE) {
      let y = I.y + I.h + 10;
      [['🗺️ 일기도 = 저기압·전선의 위치 (기압계)', '#dbeafe'], ['🛰️ 위성 영상 = 구름의 분포와 높이', '#e2e8f0'], ['📡 레이더 영상 = 지금 실제로 내리는 비', '#fee2e2']].forEach(([tx, bg]) => { y += note(10, y, 580, tx, 13.5, { bg }) + 8; });
    }
    if (S.solved4) {
      const remain = Math.round(Math.max(0, (PR.dist - PR.v * th) / PR.v * 60)), mm = Math.floor(remain / 60), ss = remain % 60;
      T(I.x + I.w / 2, I.y + I.h - 12, remain > 0 ? '한랭 전선 도착까지 ' + mm + '시간 ' + String(ss).padStart(2, '0') + '분' : '한랭 전선이 서울을 지나갔어요', { size: 15, weight: 800, color: remain > 0 ? '#b91c1c' : '#15803d' });
    } else T(I.x + I.w / 2, I.y + I.h - 12, '시간을 흘려 보내며 어떻게 바뀌는지 확인해요', { size: 13, weight: 700, color: '#94a3b8' });
  }

  /* ---------- 입력 ---------- */
  SciSim.pointer(view, {
    down(p) {
      if (S.mode === 'sat') { const h = satHit(p, S.clock); if (h) { S.probe = h; if (h.id === 'B' && S.band === 'ir') S.probedB = true; Sound.tick(); } return false; }
      if (S.mode === 'sq' && S.sqv === 'cell') {
        const R = LAY.pl1, ax = plotQ.T; if (!ax) return false;
        if (p.x >= R.x && p.x <= R.x + R.w && p.y >= R.y && p.y <= R.y + R.h && p.x > ax.R.x - 12 && p.x < ax.R.x + ax.R.w + 12) {
          const i = sampleAt(clamp(ax.inv(p.x), 0, 180)); S.qMark = i; setQt(QT[i]); Sound.tick();
          parts.burst(ax.x(QT[i]), ax.R.y + 30, { count: 8, speed: 80, size: 3, life: 0.5, colors: ['#f59e0b', '#fff'] });
        }
      }
      return false;
    },
  });

  /* ---------- 조작 ---------- */
  let game = null;
  const fmtR = (v) => '10:' + String(Math.round(v)).padStart(2, '0');
  const sTimeR = $('#sTimeR'), oTimeR = $('#oTimeR'), sTimeQ = $('#sTimeQ'), oTimeQ = $('#oTimeQ'), sTimeP = $('#sTimeP'), oTimeP = $('#oTimeP'), sSize = $('#sSize'), oSize = $('#oSize');
  const fmtP = (v) => { const m = Math.round(v * 60); return Math.floor(m / 60) + '시간 ' + (m % 60) + '분 뒤'; };
  const bR = SciSim.bindRange(sTimeR, oTimeR, fmtR, (v) => { S.rt = v; S.playR = false; updPlay(); });
  const bQ = SciSim.bindRange(sTimeQ, oTimeQ, clock, (v) => { S.qt = v; S.playQ = false; updPlay(); });
  const bP = SciSim.bindRange(sTimeP, oTimeP, fmtP, (v) => { S.pt = v; S.playP = false; updPlay(); });
  const bS = SciSim.bindRange(sSize, oSize, (v) => Math.round(sizeOf(v)) + ' km', (v) => { S.size = sizeOf(v); });
  function setRt(v) { S.rt = v; bR.set(v); }
  function setQt(v) { S.qt = v; bQ.set(v); }
  function setPt(v) { S.pt = v; bP.set(v); }
  function setSize(km) { S.size = km; bS.set(Math.round(Math.log(km / 10) / Math.log(300) * 100)); }
  function updPlay() { $('#playBtnR').textContent = S.playR ? '⏸ 멈춤' : '▶ 재생'; $('#playBtnQ').textContent = S.playQ ? '⏸ 멈춤' : '▶ 재생'; $('#playBtnP').textContent = S.playP ? '⏸ 멈춤' : '▶ 재생'; }
  $('#playBtnR').addEventListener('click', () => { Sound.click(); if (!S.playR && S.rt >= 19.9) setRt(0); S.playR = !S.playR; updPlay(); });
  $('#playBtnQ').addEventListener('click', () => { Sound.click(); if (!S.playQ && S.qt >= 179) setQt(0); S.playQ = !S.playQ; updPlay(); });
  $('#playBtnP').addEventListener('click', () => { Sound.click(); if (!S.playP && S.pt >= 3.95) setPt(0); S.playP = !S.playP; updPlay(); });
  $$('#bandSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.band = b.dataset.b; S.probe = null; updateCtl(); }));
  $$('#dnSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.night = +b.dataset.n; updateCtl(); }));
  $$('#rainOpts .opt').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.rainPick = +b.dataset.r; updateCtl(); }));
  $$('#sqView button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.sqv = b.dataset.v; thermals.length = 0; updateCtl(); }));
  $$('#sizeOpts .opt').forEach((b) => b.addEventListener('click', () => { Sound.click(); setSize(+b.dataset.s); }));
  $$('#layerBox .opt').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.layers[b.dataset.l] = !S.layers[b.dataset.l]; updateCtl(); }));
  const stH = makeStepper($('#heightBox'), { label: '☁️ 구름 B 꼭대기의 높이', min: 0, max: 16, step: 0.1, dec: 1, value: S.hKm, unit: 'km', onChange: (v) => { S.hKm = v; } });
  const stD = makeStepper($('#moveBox'), { label: '📏 에코 핵이 10분 동안 이동한 거리', min: 0, max: 20, step: 1, value: S.dKm, unit: 'km', onChange: (v) => { S.dKm = v; } });
  const stV = makeStepper($('#moveBox'), { label: '💨 에코의 이동 속도', min: 0, max: 100, step: 4, value: S.vKmh, unit: 'km/h', onChange: (v) => { S.vKmh = v; } });
  const stM = makeStepper($('#moveBox'), { label: '⏱️ 도시에 도착하기까지', min: 0, max: 120, step: 10, value: S.tMin, unit: '분', onChange: (v) => { S.tMin = v; } });
  const stA = makeStepper($('#arriveBox'), { label: '⏱️ 한랭 전선이 서울을 지나는 때는 지금부터', min: 0, max: 8, step: 1, value: S.arrH, unit: '시간 뒤', onChange: (v) => { S.arrH = v; } });
  /* 짝짓기 · 분류 · 예측 줄 (HTML) */
  const TYPES = ['적란운', '권운', '층운·안개'];
  const matchBox = $('#matchBox');
  matchBox.innerHTML = '<span class="seg-label" style="margin-top:0">🔎 영상 속 구름 A·B·C는 어떤 구름일까요?</span>';
  CIDS.forEach((id, i) => {
    const row = document.createElement('div'); row.id = 'mt' + i; row.style.marginTop = '6px';
    row.innerHTML = '<span class="seg-label" style="margin-bottom:2px">구름 ' + id + '</span><div class="segmented dense">' + TYPES.map((tp, j) => '<button type="button" data-v="' + j + '">' + tp + '</button>').join('') + '</div>';
    row.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.match[i] = +b.dataset.v; updateCtl(); }));
    matchBox.appendChild(row);
  });
  const CLS_ITEMS = [
    { t: '여름 오후 갑자기 생겨 스콜을 만드는 저기압 (수십~수백 km, 수 시간)', a: 0 },
    { t: '서해에서 다가오는 한랭 전선을 동반한 저기압 (약 1000 km, 며칠)', a: 1 },
    { t: '좁은 지역에 1~2시간 강한 비를 내리고 사라지는 구름 무리', a: 0 },
  ];
  const sqRows = $('#sqRows');
  CLS_ITEMS.forEach((it, i) => {
    const row = document.createElement('div'); row.className = 'row-q'; row.id = 'cl' + i;
    row.innerHTML = '<span class="lab">' + (i + 1) + '. ' + it.t + '</span><div class="segmented"><button type="button" data-v="0">중규모</button><button type="button" data-v="1">종관 규모</button></div>';
    row.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.qCls[i] = +b.dataset.v; row.classList.remove('bad'); updateCtl(); }));
    sqRows.appendChild(row);
  });
  const afterBox = $('#afterBox');
  const AFTER_Q = [
    { q: '🧭 전선이 지난 뒤 서울의 풍향은?', o: ['남서풍 → 북서풍', '북서풍 → 남서풍', '변화 없음'], a: 0 },
    { q: '🌡️ 전선이 지난 뒤 서울의 기온은?', o: ['내려가요', '올라가요'], a: 0 },
    { q: '📈 전선이 지난 뒤 서울의 기압은?', o: ['올라가요', '내려가요'], a: 0 },
  ];
  afterBox.innerHTML = '<span class="seg-label" style="margin-top:0">🔮 한랭 전선이 지나간 뒤 서울의 날씨를 예측해요</span>';
  AFTER_Q.forEach((q, i) => {
    const row = document.createElement('div'); row.id = 'af' + i; row.style.marginTop = '6px';
    row.innerHTML = '<span class="seg-label" style="margin-bottom:2px">' + q.q + '</span><div class="segmented dense">' + q.o.map((o, j) => '<button type="button" data-v="' + j + '">' + o + '</button>').join('') + '</div>';
    row.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.after[i] = +b.dataset.v; row.classList.remove('bad'); updateCtl(); }));
    afterBox.appendChild(row);
  });

  const MODE_LABEL = { sat: '🛰️ 위성 영상 (가시·적외)', radar: '📡 레이더 영상', sq: '⛈️ 소나기를 만드는 중규모 저기압', pred: '🎯 세 자료를 겹쳐 날씨 예측' };
  const MODE_LV = { sat: 0, radar: 1, sq: 2, pred: 3 };
  function updateCtl() {
    $('#tbLabel').textContent = MODE_LABEL[S.mode];
    $$('#ctrlCard .control').forEach((c) => {
      const okMode = c.dataset.modes.split(' ').includes(S.mode);
      const okSub = !c.dataset.sub || (game && game.free) || c.dataset.sub === S.sub;
      const okView = !c.dataset.view || c.dataset.view === S.sqv;
      c.hidden = !(okMode && okSub && okView);
    });
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    const ms = $('#modeSeg'); if (ms) ms.hidden = !(game && game.free);
    $$('#bandSeg button').forEach((b) => b.classList.toggle('on', b.dataset.b === S.band));
    $$('#dnSeg button').forEach((b) => b.classList.toggle('on', +b.dataset.n === S.night));
    $$('#rainOpts .opt').forEach((b) => b.classList.toggle('on', +b.dataset.r === S.rainPick));
    $$('#sqView button').forEach((b) => b.classList.toggle('on', b.dataset.v === S.sqv));
    $$('#layerBox .opt').forEach((b) => b.classList.toggle('on', !!S.layers[b.dataset.l]));
    CIDS.forEach((id, i) => $$('#mt' + i + ' button').forEach((b) => b.classList.toggle('on', +b.dataset.v === S.match[i])));
    CLS_ITEMS.forEach((it, i) => $$('#cl' + i + ' button').forEach((b) => b.classList.toggle('on', +b.dataset.v === S.qCls[i])));
    AFTER_Q.forEach((q, i) => $$('#af' + i + ' button').forEach((b) => b.classList.toggle('on', +b.dataset.v === S.after[i])));
  }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); enterLevel(MODE_LV[b.dataset.mode]); }));
  function setMode(m, sub) { if (S.mode !== m) { S.fade = 1; parts.clear(); } S.mode = m; S.sub = sub || ''; updateCtl(); }

  /* ---------- 읽음 칸 ---------- */
  function readouts() {
    if (S.mode === 'sat') {
      const pr = S.probe;
      const a = pr ? (pr.id === 'sea' || pr.id === 'land' ? SURF[pr.id].nm : '구름 ' + pr.id) : '눌러 보세요';
      const T0 = pr ? (pr.id === 'sea' || pr.id === 'land' ? SURF[pr.id].T : CLOUD[pr.id].T) : null;
      setReadouts(['영상', (S.band === 'ir' ? '적외' : '가시') + ' · ' + (S.night > 0.5 ? '밤' : '낮'), '눌러 본 곳', a, '적외 영상의 온도', pr && S.band === 'ir' ? Math.round(T0) + ' °C' : (pr ? '적외 영상으로 바꾸면 읽어요' : '—')]);
    } else if (S.mode === 'radar') {
      const tm = S.rt, dz = radarField(P_PT.x, P_PT.y, tm);
      setReadouts(['시각', fmtR(tm), '에코 핵의 위치', f1(coreX(tm)) + ' km', '지점 P의 반사도', Math.round(dz) + ' dBZ']);
    } else if (S.mode === 'sq') {
      if (S.sqv === 'scale') setReadouts(['저기압의 크기', '약 ' + Math.round(S.size) + ' km', '지나가는 데 걸리는 시간', f1(S.size / 40) + '시간', '분류', S.size >= 1000 ? '종관 규모' : S.size < 200 ? '중규모' : '경계']);
      else { const i = sampleAt(S.qt); setReadouts(['시각', clock(S.qt), '기온 · 기압', f1(valAt(Q.T, QT, S.qt)) + ' °C · ' + f1(valAt(Q.P, QT, S.qt)) + ' hPa', '바람', windName(Q.W[i]) + ' ' + Q.W[i] + '° · ' + Q.V[i] + ' m/s']); }
    } else {
      const th = S.pt;
      setReadouts(['지금부터', fmtP(th), '서울의 바람', windName(seoulWind(th)) + ' ' + seoulWind(th) + '°', '겹쳐 본 자료', ['chart', 'sat', 'radar'].filter((q) => S.layers[q]).length + ' / 3']);
    }
  }

  /* ---------- 단계 · 미션 ---------- */
  function enterLevel(li) {
    clearTimeout(hintTimer); S.playR = S.playQ = S.playP = false; updPlay(); parts.clear(); thermals.length = 0;
    if (li === 0) { setMode('sat', 'match'); S.band = 'vis'; S.night = 0; S.probe = null; showHint('영상 속 구름을 눌러 값을 읽어 봐요', 5000); }
    else if (li === 1) { setMode('radar', 'read'); setRt(20); S.rtv = 20; showHint('시각 슬라이더로 10분 간격 영상을 넘겨 봐요', 5000); }
    else if (li === 2) { setMode('sq', 'mark'); S.sqv = 'cell'; setQt(0); S.qtv = 0; S.qMark = null; showHint('시각을 흘려 보내며 소나기 구름의 한살이를 봐요', 5000); }
    else { setMode('pred', 'arrive'); S.layers = { chart: true, sat: false, radar: false }; setPt(0); S.ptv = 0; showHint('세 가지 자료를 하나씩 켜서 겹쳐 봐요', 5000); }
    updateCtl();
  }
  const levels = [
    {
      title: '위성 영상: 가시와 적외', short: '위성 영상', icon: '🛰️', phase: '관찰', features: ['sat'],
      intro: '<p class="si-q">❓ 탐구 질문: 지금 서쪽에서 오는 구름 띠가 몇 시에 우리 동네에 비를 뿌릴까?</p>' +
        '<div class="si-link">🔗 <b>앞 차시(중위도 저기압과 전선)에서</b> 일기도로 저기압과 전선의 위치를 읽었어요. 이번에는 <b>위성 영상</b>과 <b>레이더 영상</b>까지 더해 날씨를 예측해요. 중3에서 배운 구름의 종류(적란운·권운·층운)도 떠올려 봐요.</div>' +
        '<p>기상위성은 두 가지 영상을 보내 줘요. <b>가시 영상</b>은 구름이 <b>햇빛을 반사하는 정도</b>(구름의 두께)를 보여 주고 낮에만 볼 수 있어요. <b>적외 영상</b>은 구름 <b>꼭대기의 온도</b>(높이)를 보여 주고 밤낮으로 볼 수 있으며, 온도가 낮을수록 밝게 나타내요. 같은 구름 3가지를 두 영상으로 비교해 봐요. (모든 영상은 교육용 예시 자료예요.)</p>',
      setup() { enterLevel(0); },
      recap: '가시 영상은 구름이 햇빛을 반사하는 정도(두께)를, 적외 영상은 구름 꼭대기 온도(높이)를 보여 줘요. 적외 영상에서 밝을수록 꼭대기가 차갑고 높아요.',
      summary: '<table class="mini"><tr><th>구름</th><th>가시 영상</th><th>적외 영상</th></tr><tr><td>두꺼운 적란운</td><td>매우 밝음</td><td>매우 밝음 (−60 °C)</td></tr><tr><td>얇은 권운</td><td>흐릿함</td><td>밝음 (−45 °C)</td></tr><tr><td>낮은 층운·안개</td><td>밝음</td><td>어두움 (+5 °C)</td></tr></table>' +
        '<ul><li><b>가시 영상</b>: 반사된 햇빛 → 구름의 두께, <b>낮에만</b>. <b>적외 영상</b>: 구름 꼭대기에서 나오는 열(적외선) → 꼭대기 온도, <b>밤낮 모두</b>. 표시는 온도가 낮을수록 밝게.</li>' +
        '<li>구름 꼭대기 높이 = (지표 기온 − 꼭대기 온도) ÷ 기온 감률 6.5 °C/km. 예: 지표 15 °C, 꼭대기 −45 °C → 60 ÷ 6.5 ≈ <b>9.2 km</b>.</li>' +
        '<li>실제 위성 영상은 기상청 날씨누리에서 볼 수 있어요.</li></ul>',
      missions: [
        {
          title: '구름 3종 짝짓기',
          goal: '가시 영상과 적외 영상을 번갈아 보며, 영상 속 구름 <b>A·B·C</b>가 각각 <b>적란운·권운·층운(안개)</b> 중 무엇인지 짝지은 뒤 <b>✔ 확인하기</b>를 눌러요.',
          hint: '가시에서 밝고 적외에서도 아주 밝으면 두껍고 높은 구름(적란운), 가시에서 흐릿하지만 적외에서 밝으면 얇고 높은 구름(권운), 가시에서 밝고 적외에서 어두우면 두껍고 낮은 구름(층운·안개)이에요.',
          manual: true,
          setup() { setMode('sat', 'match'); },
          status: () => mark(S.match.every((v) => v != null)) + ' 짝지은 구름 ' + S.match.filter((v) => v != null).length + ' / 3',
          check() {
            if (S.match.some((v) => v == null)) return '구름 A, B, C를 모두 골라 주세요.';
            const bad = CIDS.findIndex((id, i) => S.match[i] !== i);
            if (bad >= 0) return '구름 ' + CIDS[bad] + '의 영상을 가시와 적외에서 다시 비교해 봐요. 밝기가 어떻게 다른가요?';
            return true;
          },
          explain: '<b>A</b>는 가시에서도 적외에서도 아주 밝은 <b>적란운</b>(두껍고 키가 커서 꼭대기가 아주 차가워요), <b>B</b>는 가시에서 흐릿하고 적외에서 밝은 <b>권운</b>(얇지만 높아서 꼭대기가 차가워요), <b>C</b>는 가시에서 밝고 적외에서 어두운 <b>낮은 층운·안개</b>(두껍지만 낮아서 지표와 온도가 비슷해요)예요.',
        },
        {
          title: '적외 영상으로 구름 높이 계산',
          goal: '<b>적외 영상</b>에서 구름 <b>B</b>를 눌러 꼭대기 온도를 읽고, 지표 기온 15 °C, 기온 감률 6.5 °C/km로 <b>꼭대기 높이</b>를 구해 입력해요.',
          hint: '적외 영상 버튼을 누른 뒤 구름 B를 눌러요. 높이 = (15 − 꼭대기 온도) ÷ 6.5 (km)',
          setup() { setMode('sat', 'height'); S.band = 'ir'; S.probe = null; S.probedB = false; updateCtl(); },
          check: () => S.probedB && Math.abs(S.hKm - 9.2) < 0.05, hold: 0.5,
          status: () => mark(S.probedB) + ' 적외 영상에서 B 읽기 · ' + mark(Math.abs(S.hKm - 9.2) < 0.05) + ' 높이 ' + f1(S.hKm) + ' km',
          explain: '구름 B의 꼭대기 온도는 <b>−45 °C</b>예요. 높이 = (15 − (−45)) ÷ 6.5 = 60 ÷ 6.5 ≈ <b>9.2 km</b>. 꼭대기 온도가 낮을수록 구름이 높아요. (예: −10 °C이면 25 ÷ 6.5 ≈ 3.8 km)',
        },
        {
          type: 'quiz', title: '적외 영상에서 밝다는 것',
          goal: '<b>밤</b>에 구름을 보려면 어떤 영상을 써야 하고, 적외 영상에서 구름이 <b>밝게</b> 보이면 무엇을 뜻할까요? (낮/밤 버튼으로 확인해 봐요.)',
          setup() { setMode('sat', 'quiz'); updateCtl(); },
          choices: ['가시 영상을 쓰고, 밝으면 꼭대기가 따뜻해 낮게 있는 구름이에요', '적외 영상을 쓰고, 밝으면 꼭대기가 차가워 높이 솟은 구름이에요', '적외 영상을 쓰고, 밝으면 햇빛을 많이 반사하는 구름이에요', '밤에는 어떤 영상으로도 구름을 볼 수 없어요'],
          answer: 1,
          feedback: ['가시 영상은 햇빛이 필요해서 밤에는 어두워요. 적외 영상은 표시를 온도가 낮을수록 밝게 해요.', '', '햇빛 반사를 보여 주는 것은 가시 영상이에요. 적외 영상은 온도를 나타내요.', '적외 영상은 구름과 지표가 내보내는 열을 보므로 밤에도 구름을 볼 수 있어요.'],
          explain: '적외 영상은 구름 꼭대기가 내보내는 적외선(열)을 측정하므로 <b>밤에도</b> 쓸 수 있어요. 온도가 낮을수록 밝게 나타내므로, 밝다 = 꼭대기가 <b>차갑다</b> = 구름이 <b>높다</b>는 뜻이에요.',
        },
      ],
    },
    {
      title: '레이더 영상: 강수 강도와 에코의 이동', short: '레이더 영상', icon: '📡', phase: '분석', features: ['radar'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 위성 영상으로 구름의 두께와 높이를 알았어요. 하지만 구름이 있다고 모두 비가 오는 것은 아니에요. 실제로 <b>비가 내리는 곳</b>은 어떻게 알까요?</div>' +
        '<p>레이더는 전파를 쏘아 <b>강수 입자에 반사되어 돌아오는 전파의 세기(반사도, dBZ)</b>로 강수 강도를 추정해요. 색이 붉고 dBZ가 클수록 비가 강해요. 10분 간격 영상에서 비구름(<b>에코</b>)의 이동 거리와 속도를 구하면 언제 도착할지 알 수 있어요. (예시 자료)</p>',
      setup() { enterLevel(1); },
      recap: '레이더 영상은 강수 입자의 양(반사도 dBZ)을 보여 줘요. 10분 간격 영상에서 에코의 이동 거리로 속도를 구해 도착 시각을 예측할 수 있어요.',
      summary: '<table class="mini"><tr><th>반사도</th><th>20 dBZ</th><th>35 dBZ</th><th>45 dBZ</th><th>55 dBZ</th></tr><tr><th>강수 강도</th><td>약 1 mm/h</td><td>약 6</td><td>약 24</td><td>약 100 (우박 가능)</td></tr></table>' +
        '<ul><li>레이더가 알려 주는 것은 구름의 두께가 아니라 <b>강수 입자의 양</b>이에요.</li><li>에코 이동 속도 = 이동 거리 ÷ 시간 = 8 km ÷ 10분 = <b>48 km/h</b>. 도착 시간 = 거리 ÷ 속도 = 40 km ÷ 48 km/h = 50분.</li><li>에코가 약해지는 것은 비구름이 소멸하며 강수 입자가 줄어든다는 뜻이에요.</li></ul>',
      missions: [
        {
          title: '한 지점의 강수 강도 읽기',
          goal: '가장 최근(10:20) 영상에서 <b>지점 P</b>의 반사도를 읽고 아래 색 막대의 표로 <b>강수 강도</b>를 골라요.',
          hint: '지점 P의 이름표에 적힌 dBZ를 색 막대의 표(20, 35, 45, 55 dBZ)와 비교해요.',
          setup() { setMode('radar', 'read'); setRt(20); S.rainPick = null; updateCtl(); },
          check: () => S.rainPick === 24 && Math.abs(S.rt - 20) < 0.5, hold: 0.5,
          status: () => mark(Math.abs(S.rt - 20) < 0.5) + ' 10:20 영상 · ' + mark(S.rainPick === 24) + ' 강수 강도 ' + (S.rainPick == null ? '미선택' : '약 ' + S.rainPick + ' mm/h'),
          explain: '지점 P의 반사도는 <b>45 dBZ</b>이고, 45 dBZ는 약 <b>24 mm/h</b>의 강한 비에 해당해요. (Z = 200R<sup>1.6</sup>로 계산한 예시 근사)',
        },
        {
          title: '에코 이동 속도와 도착 시각',
          goal: '10분 간격 영상 3장에서 에코 핵(✚)이 <b>10분 동안 이동한 거리</b>를 눈금(4 km)으로 읽어 <b>속도</b>를 구하고, 도시까지 40 km 남은 에코가 <b>몇 분 뒤</b> 도착할지 입력해요.',
          hint: '시각 슬라이더를 10:00, 10:10, 10:20으로 맞추며 ✚의 위치를 비교해요. 속도 = 거리 ÷ 시간(10분 = 1/6시간), 도착 시간 = 40 km ÷ 속도',
          setup() { setMode('radar', 'move'); setRt(20); updateCtl(); },
          check: () => S.dKm === STEP_KM && S.vKmh === SPEED && S.tMin === 50, hold: 0.5,
          status: () => mark(S.dKm === STEP_KM) + ' 이동 거리 ' + S.dKm + ' km · ' + mark(S.vKmh === SPEED) + ' 속도 ' + S.vKmh + ' km/h · ' + mark(S.tMin === 50) + ' 도착 ' + S.tMin + '분 뒤',
          explain: '에코 핵은 10분마다 <b>8 km</b>씩 이동했어요. 속도 = 8 km ÷ (10/60 h) = <b>48 km/h</b>. 도시까지 40 km이므로 40 ÷ 48 = 5/6시간 = <b>50분 뒤</b>에 도착해요.',
        },
        {
          type: 'quiz', title: '레이더 영상이 알려 주는 것',
          goal: '<b>레이더 영상</b>의 색(dBZ)이 알려 주는 것은 무엇일까요?',
          setup() { setMode('radar', ''); updateCtl(); },
          choices: ['구름의 두께', '비구름 속 강수 입자에 반사된 전파의 세기, 즉 강수 입자의 양', '구름 꼭대기의 온도', '구름이 햇빛을 반사하는 정도'],
          answer: 1,
          feedback: ['구름의 두께는 가시 영상에서 짐작할 수 있어요. 레이더는 비를 만드는 입자에 반사된 전파를 봐요.', '', '꼭대기 온도는 적외 영상이 보여 줘요.', '햇빛 반사는 가시 영상이 보여 줘요.'],
          explain: '레이더는 <b>강수 입자에 반사된 전파의 세기</b>로 강수 강도를 추정해요. 같은 두꺼운 구름이라도 비가 내리지 않으면 에코가 약해요. 에코가 점점 약해지는 것은 비구름이 소멸하며 강수 입자가 줄어들고 있다는 뜻이에요.',
        },
      ],
    },
    {
      title: '소나기 저기압: 중규모의 짧고 강한 비', short: '소나기 저기압', icon: '⛈️', phase: '모형', features: ['sq'],
      intro: '<div class="si-link">🔗 <b>앞 단계들에서</b> 위성 영상으로 구름의 높이를, 레이더 영상으로 비가 내리는 곳과 이동 속도를 읽었어요. 여름 오후의 소나기는 전선을 동반한 저기압과 어떻게 다를까요?</div>' +
        '<p>여름 오후에는 지표가 가열되고 대기가 불안정해 <b>적운 → 적란운</b>이 급히 발달하고, <b>수십~수백 km 크기로 몇 시간</b> 지나가는 <b>중규모 저기압</b>이 소나기·스콜을 만들어요. 단면과 관측점의 시계열을 함께 보며 기온·기압·풍향의 급변을 찾아봐요. (예시 자료)</p>',
      setup() { enterLevel(2); },
      recap: '소나기를 만드는 중규모 저기압은 수십 km 크기로 수 시간 지나가며, 하강 기류가 퍼져 나가 통과 때 기온 급강하·기압 일시 상승·풍향 급변이 나타나요.',
      summary: '<ul><li><b>중규모 저기압</b>(소나기·스콜): 지표 가열 → 상승 → 적운 → 적란운 → 강한 비 + 하강 기류. 크기 수십~수백 km, 수 시간.</li><li>통과할 때 관측점에서는 <b>기온 급강하(31 → 24 °C)</b>, <b>기압 일시 상승(약 +2 hPa)</b>, <b>풍향 급변</b>, 짧고 강한 비가 나타나요.</li><li>종관 규모 저기압은 약 1000 km 이상, 며칠. 지나가는 시간 = 크기 ÷ 이동 속도.</li></ul>',
      missions: [
        {
          title: '소나기 통과 시각과 규모 분류',
          goal: '기온 그래프에서 소나기가 도착해 <b>기온이 떨어지기 시작한 관측 시각</b>을 눌러 표시하고, 오른쪽 3가지를 <b>중규모</b>와 <b>종관 규모</b>로 분류한 뒤 <b>✔ 확인하기</b>를 눌러요.',
          hint: '시각 슬라이더를 흘려 보내면 단면의 구름이 관측점에 가까워져요. 기온이 처음 31 °C보다 낮아진 관측점을 눌러요. 분류는 크기 비교 보기에서 도움을 받을 수 있어요.',
          manual: true,
          setup() { setMode('sq', 'mark'); S.sqv = 'cell'; updateCtl(); },
          status: () => mark(S.qMark === Q_PASS) + ' 도착 시각 ' + (S.qMark == null ? '미표시' : clock(QT[S.qMark])) + ' · ' + mark(S.qCls.every((v) => v != null)) + ' 분류 ' + S.qCls.filter((v) => v != null).length + ' / 3',
          check() {
            if (S.qMark == null) return '기온 그래프의 관측점을 눌러 소나기가 도착한 시각을 표시해 주세요.';
            if (S.qMark !== Q_PASS) return clock(QT[S.qMark]) + '은(는) 아직 기온이 31 °C인 때이거나 이미 떨어진 뒤예요. 기온이 처음 떨어지기 시작한 관측점을 찾아요.';
            if (S.qCls.some((v) => v == null)) return '규모 분류 3가지를 모두 골라 주세요.';
            const wi = CLS_ITEMS.findIndex((it, i) => S.qCls[i] !== it.a);
            if (wi >= 0) { const el = $('#cl' + wi); if (el) { el.classList.add('bad'); setTimeout(() => el.classList.remove('bad'), 900); } return (wi + 1) + '번 분류를 다시 생각해 봐요. 크기와 지속 시간을 보세요.'; }
            return true;
          },
          explain: '기온은 <b>15:10</b>에 31 °C에서 29 °C로 내려가기 시작해 15:30에 24 °C까지 떨어졌어요. 이때 기압은 약 2 hPa 올랐고(1006 → 1008), 풍향이 남서(225°)에서 북(10°) 쪽으로 급변했어요. 소나기를 만드는 저기압은 <b>중규모</b>이고, 전선을 동반한 저기압은 <b>종관 규모</b>예요.',
        },
        {
          type: 'quiz', title: '소나기가 좁은 지역에 짧게 내리는 까닭',
          goal: '소나기가 <b>좁은 지역에 짧은 시간</b> 내리는 까닭으로 알맞은 것은?',
          setup() { setMode('sq', ''); updateCtl(); },
          choices: ['소나기를 만드는 적란운은 크기가 수십 km로 작고 수 시간 안에 지나가거나 사라지기 때문이에요', '소나기구름이 하늘 전체를 며칠 동안 덮기 때문이에요', '전선이 한곳에 오래 머물기 때문이에요', '해가 지면 구름이 모두 사라지기 때문이에요'],
          answer: 0,
          feedback: ['', '며칠 동안 넓게 덮는 것은 종관 규모 저기압의 특징이에요. 소나기는 훨씬 작아요.', '전선이 오래 머무는 것은 장마처럼 비가 오래 오는 경우예요. 소나기는 구름 하나가 빨리 지나가요.', '구름은 해가 지는 것과 관계없이 대기가 불안정해서 생겨요. 지나가는 시간은 구름의 크기와 이동 속도로 정해져요.'],
          explain: '비 구역의 크기가 약 20 km이고 30 km/h로 지나가면 한 지점에는 <b>약 40분</b>만 비가 내려요. 지나가는 시간 = 크기 ÷ 이동 속도이므로 크기가 작을수록 좁은 지역에 짧게 내려요. 약 1000 km 크기의 종관 규모 저기압은 40 km/h로 지나가도 하루 이상 걸려요.',
        },
      ],
    },
    {
      title: '날씨 예측: 세 자료를 함께 읽기', short: '날씨 예측', icon: '🎯', phase: '예측', features: ['pred'],
      intro: '<div class="si-link">🔗 <b>앞 단계들에서</b> 위성 영상(구름의 높이), 레이더 영상(비의 세기와 이동), 소나기 저기압의 특징을 배웠어요. 이제 이 자료를 모두 모아 <b>종합 예측</b>을 해요.</div>' +
        '<p>서해에 <b>한랭 전선을 동반한 저기압</b>이 있어요. 일기도(기압계의 위치), 적외 위성 영상(서쪽의 폭 넓은 밝은 구름 띠), 레이더 영상(강한 에코 선이 서울 서쪽 120 km, 동쪽으로 40 km/h)을 겹쳐 보고 <b>서울의 3시간 뒤 날씨</b>를 예측해요. (예시 자료)</p>',
      setup() { enterLevel(3); },
      recap: '일기도로 기압계의 위치, 위성 영상으로 구름의 분포, 레이더 영상으로 실제 비를 알아요. 에코 선이 120 km ÷ 40 km/h = 3시간 뒤 서울에 도착하고, 그 뒤 풍향은 북서, 기온은 하강, 기압은 상승해요.',
      summary: '<ul><li><b>일기도</b> = 기압계(저기압·전선)의 위치, <b>위성 영상</b> = 구름의 분포, <b>레이더 영상</b> = 실제 내리는 비. 세 자료를 함께 쓰면 예측이 정확해져요.</li><li>한랭 전선 통과 시각 = 거리 ÷ 속도 = 120 km ÷ 40 km/h = <b>3시간 뒤</b>.</li><li>통과 후 서울: 풍향 <b>남서 → 북서</b>, 기온 <b>하강</b>(18 → 11 °C), 기압 <b>상승</b>, 소나기 후 맑아져요.</li><li>과거 사례(봄 저기압 통과, 여름 소나기, 겨울 서해안 눈)의 영상은 기상청 날씨누리·기상자료개방포털에서 확인해 보세요.</li></ul>',
      missions: [
        {
          title: '한랭 전선이 도착하는 시각',
          goal: '일기도·적외 위성·레이더를 <b>모두 겹쳐</b> 본 뒤, 에코 선이 서울에서 얼마나 떨어져 있고 얼마의 속도로 오는지 읽어 <b>한랭 전선이 서울을 지나는 때</b>를 예측해요.',
          hint: '세 자료를 모두 켜면 서울까지의 거리(120 km)와 에코의 이동 속도(40 km/h)가 나타나요. 시간 = 거리 ÷ 속도',
          setup() { setMode('pred', 'arrive'); S.layers = { chart: true, sat: true, radar: true }; setPt(0); S.solved4 = false; updateCtl(); },
          check: () => S.arrH === PR.hours && S.layers.chart && S.layers.sat && S.layers.radar, hold: 0.5,
          status: () => mark(S.layers.chart && S.layers.sat && S.layers.radar) + ' 세 자료 겹쳐 보기 · ' + mark(S.arrH === PR.hours) + ' 도착 ' + S.arrH + '시간 뒤',
          explain: '일기도에서 한랭 전선의 위치, 위성에서 서쪽의 두꺼운 구름 띠, 레이더에서 <b>서울 서쪽 120 km</b>의 강한 에코 선과 <b>40 km/h</b>의 이동 속도를 읽어요. 120 km ÷ 40 km/h = <b>3시간 뒤</b>에 전선(소나기)이 서울을 지나가요.',
        },
        {
          title: '전선이 지난 뒤의 날씨 예측',
          goal: '한랭 전선이 지나간 뒤 서울의 <b>풍향·기온·기압</b>이 어떻게 변할지 고르고 <b>✔ 확인하기</b>를 눌러요. 시간을 흘려 보내 결과를 확인해도 좋아요.',
          hint: '한랭 전선 뒤에는 찬 공기가 들어와요. 찬 공기가 오면 기온은 어떻게 될까요? 앞 차시에서 풍향은 시계 방향으로 바뀌었어요.',
          manual: true,
          setup() { S.solved4 = true; setMode('pred', 'after'); S.after = [null, null, null]; updateCtl(); },
          status: () => mark(S.after.every((v) => v != null)) + ' 선택 ' + S.after.filter((v) => v != null).length + ' / 3',
          check() {
            if (S.after.some((v) => v == null)) return '풍향·기온·기압 세 가지를 모두 골라 주세요.';
            const wi = AFTER_Q.findIndex((q, i) => S.after[i] !== q.a);
            if (wi >= 0) { const el = $('#af' + wi); if (el) { el.classList.add('bad'); setTimeout(() => el.classList.remove('bad'), 900); } return ['풍향', '기온', '기압'][wi] + ' 예측을 다시 생각해 봐요. 시간을 흘려 서울의 값이 어떻게 바뀌는지 확인해도 좋아요.'; }
            return true;
          },
          explain: '한랭 전선이 지나가면 찬 공기가 밀려와 풍향은 <b>남서 → 북서</b>로(시계 방향) 바뀌고, 기온은 <b>내려가며</b>(18 → 11 °C), 기압은 <b>올라가요</b>. 소나기가 그친 뒤에는 대체로 맑아져요.',
        },
        {
          type: 'quiz', title: '세 가지 자료를 함께 쓰는 까닭',
          goal: '날씨를 예측할 때 일기도, 위성 영상, 레이더 영상을 <b>함께</b> 쓰는 까닭으로 알맞은 것은?',
          setup() { setMode('pred', ''); updateCtl(); },
          choices: ['세 자료는 모두 같은 정보를 보여 주기 때문이에요', '일기도는 기압계의 위치, 위성 영상은 구름의 분포, 레이더 영상은 실제 내리는 비를 알려 주어 서로 보완하기 때문이에요', '레이더 영상만 있으면 충분하기 때문이에요', '일기도는 비가 오는지 직접 보여 주기 때문이에요'],
          answer: 1,
          feedback: ['세 자료는 서로 다른 정보를 줘요. 그래서 함께 봐야 해요.', '', '레이더는 비의 위치와 세기는 알려 주지만 기압계의 위치나 구름의 높이는 알려 주지 못해요.', '일기도는 기압과 전선의 위치를 보여 줘요. 실제로 비가 오는 곳은 레이더가 보여 줘요.'],
          explain: '<b>일기도</b>는 저기압·전선의 위치(기압계), <b>위성 영상</b>은 구름의 분포와 높이, <b>레이더 영상</b>은 지금 실제로 비가 오는 곳과 세기를 알려 줘요. 세 자료를 겹쳐 보면 비구름이 어디서 오고 언제 도착할지 더 정확히 예측할 수 있어요. 실제 자료는 기상청 날씨누리·기상자료개방포털에서 확인해 보세요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'he-weather-imagery', mount: '#game', badge: '영상 예보관', homeHref: '../../index.html#he',
    featureLabels: { sat: '🛰️ 가시·적외 영상 · 구름 읽기', radar: '📡 레이더 영상 · dBZ 색 막대 · 시각 슬라이더', sq: '⛈️ 소나기 단면 · 시계열 · 크기 비교', pred: '🎯 일기도·위성·레이더 겹쳐 보기 · 시간 흘리기' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 루프 ---------- */
  let lastFree = false;
  SciSim.loop((dt, t) => {
    S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.playR) { S.rt = Math.min(20, S.rt + dt * 4); bR.set(S.rt); if (S.rt >= 20) { S.playR = false; updPlay(); } }
    if (S.playQ) { S.qt = Math.min(180, S.qt + dt * 14); bQ.set(Math.round(S.qt)); if (S.qt >= 180) { S.playQ = false; updPlay(); } }
    if (S.playP) { S.pt = Math.min(4, S.pt + dt * 0.45); bP.set(S.pt); if (S.pt >= 4) { S.playP = false; updPlay(); } }
    S.rtv = approach(S.rtv, S.rt, dt, 14); S.qtv = approach(S.qtv, S.qt, dt, 12); S.ptv = approach(S.ptv, S.pt, dt, 12);
    S.irv = approach(S.irv, S.band === 'ir' ? 1 : 0, dt, 7); S.nightv = approach(S.nightv, S.night, dt, 6); S.sizev = approach(S.sizev, S.size, dt, 9);
    windA.v = angApproach(windA.v, S.mode === 'pred' ? seoulWind(S.ptv) : 225, dt, 6);
    stepSq(dt);
    parts.update(dt);
    ctx.setTransform(view.scale * view.dpr, 0, 0, view.scale * view.dpr, 0, 0);
    ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, VW, VH);
    ctx.fillStyle = '#e9f1f8'; ctx.fillRect(0, 0, VW, VH);
    if (S.mode === 'sat') drawSat(t);
    else if (S.mode === 'radar') drawRadar(t);
    else if (S.mode === 'sq') { if (S.sqv === 'scale') drawScale(t); else { drawSection(t); drawQPlot(LAY.pl1, 'T', t); drawQPlot(LAY.pl2, 'P', t); } }
    else drawPred(t);
    parts.draw(ctx);
    drawFlash(dt, 10);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(255,255,255,' + S.fade * 0.85 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : approach(S.fade, 0, dt, 9); }
    readouts();
  });
  enterLevel(0);

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, Q, QT, Q_PASS, P_PT, CLOUD, PR, LAY, radarField, plotQ, satHit, setRt, setQt, setPt, setSize, enterLevel, coreX, seoulWind, seoulT, seoulP, hOf,
    get game() { return game; },
    setSteppers(a) { if (a.h != null) stH.set(a.h); if (a.d != null) stD.set(a.d); if (a.v != null) stV.set(a.v); if (a.m != null) stM.set(a.m); if (a.a != null) stA.set(a.a); },
    solveMatch() { S.match = [0, 1, 2]; updateCtl(); },
    solveCls() { CLS_ITEMS.forEach((it, i) => { S.qCls[i] = it.a; }); updateCtl(); },
    solveAfter() { AFTER_Q.forEach((q, i) => { S.after[i] = q.a; }); updateCtl(); },
  };

})();
