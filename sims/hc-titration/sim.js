(function () {
  'use strict';
  const CFG = { tw: 800, th: 560, pw: 480, ph: 760, bg: '#f4f1fb' };
  /* ===================== 공통 코어 (세 차시가 같이 쓰는 도우미) ===================== */
  const { $, $$, clamp, Sound } = SciSim;
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const VW = PHONE ? CFG.pw : CFG.tw, VH = PHONE ? CFG.ph : CFG.th;
  const RM = SciSim.reduceMotion;
  const TAU = Math.PI * 2;
  const mark = (b) => (b ? '✅' : '⬜');
  const INK = '#1b2333', MUTED = '#5d6879', VIO = '#7c3aed', AMB = '#d97706', GOOD = '#14a058', BAD = '#e2464b', BLU = '#3867f4';
  const BGC = CFG.bg;
  const CO = SciSim.color;

  const view = SciSim.stage($('#cv'), { width: VW, height: VH, background: BGC });
  const ctx = view.ctx;
  const D = SciSim.draw(ctx);
  const parts = new SciSim.Particles();
  const T = (x, y, s, size, color, align, weight, extra) => D.text(x, y, s, Object.assign({ size, color, align, weight }, extra));
  const rnd = (a, b) => a + Math.random() * (b - a);
  const smooth = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
  function wrap(str, maxW, size, weight) {
    ctx.save(); ctx.font = D.font(size, weight || 700);
    const out = [], W = (t) => ctx.measureText(t).width;
    str.split('\n').forEach((para) => {
      let line = '';
      para.split(' ').forEach((w) => {
        const t = line ? line + ' ' + w : w;
        if (W(t) <= maxW || !line) line = t; else { out.push(line); line = w; }
        if (W(line) > maxW) { let cur = ''; for (const ch of line) { if (W(cur + ch) > maxW && cur) { out.push(cur); cur = ch; } else cur += ch; } line = cur; }
      });
      out.push(line);
    });
    ctx.restore(); return out;
  }
  function textBlock(x, y, maxW, str, size, color, lh, weight, align) {
    const ls = wrap(str, maxW, size, weight || 700); ls.forEach((l, i) => T(x, y + i * lh, l, size, color, align || 'left', weight || 700)); return ls.length * lh;
  }
  function panel(x, y, w, h, r, fill) { D.shadow(() => { D.roundRect(x, y, w, h, r || 14); ctx.fillStyle = fill || '#fff'; ctx.fill(); }, { blur: 8, y: 2 }); }
  let hintTimer = 0;
  function showHint(msg, ms) {
    const h = $('#stageHint'); if (!h) return;
    h.textContent = msg; h.classList.remove('hide'); clearTimeout(hintTimer); hintTimer = setTimeout(() => h.classList.add('hide'), ms || 4200);
  }
  const r6 = (v) => Math.round(v * 1e6) / 1e6;
  const fT = (v, d) => String(+(+v).toFixed(d == null ? 3 : d));    // 끝의 0은 생략
  const f2 = (v) => (+v).toFixed(2);
  const fx = (v, d) => (+v).toFixed(d);
  const parseNum = (s) => {
    s = String(s).trim().replace(/,/g, '.').replace(/[×x]\s*10\s*\^?\s*(-?\d+)/i, 'e$1').replace(/\s+/g, '');
    const fr = /^(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/.exec(s); if (fr && +fr[2] !== 0) return +fr[1] / +fr[2];
    const t = s.replace(/[^0-9.\-eE+]/g, ''); return t === '' || isNaN(+t) ? NaN : +t;
  };
  const near = (v, e, relTol, absTol) => !isNaN(v) && Math.abs(v - e) <= Math.max(absTol || 0, Math.abs(e) * (relTol == null ? 0.02 : relTol));
  const tws = [];
  function tw(o, to, opts) { const h = SciSim.tween(o, to, opts); tws.push(h); if (tws.length > 80) tws.splice(0, 40); return h; }
  const cancelTws = () => { tws.forEach((h) => h.cancel && h.cancel()); tws.length = 0; };
  const rect = (x, y, w, h) => ({ x, y, w, h });
  const inR = (p, r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
  function shakeEl(el) { el.classList.remove('bad'); void el.offsetWidth; el.classList.add('bad'); }
  const SPR = (v, k, d) => new SciSim.Spring(v, { stiffness: k || 120, damping: d || 15 });

  /* 읽음 칸 */
  const roCache = {};
  function setRO(i, label, value) {
    const k = label + '|' + value; if (roCache[i] === k) return; roCache[i] = k;
    $('#l' + i).textContent = label; $('#v' + i).textContent = value;
  }

  /* ---------- 이온 · 분자 그리기 ---------- */
  const ION = {
    'H+': { c: '#e2464b', r: 9, t: '+', name: 'H⁺' },
    'OH-': { c: '#3867f4', r: 12, t: 'OH⁻', name: 'OH⁻' },
    'Na+': { c: '#f59e0b', r: 11, t: '+', name: 'Na⁺' },
    'Cl-': { c: '#14a058', r: 11.5, t: '−', name: 'Cl⁻' },
    'Ca2+': { c: '#8b5cf6', r: 12.5, t: '2+', name: 'Ca²⁺' },
    'SO4': { c: '#c2410c', r: 13, t: '2−', name: 'SO₄²⁻' },
    'H2O': { c: '#ef6a6a', r: 12, t: '', name: 'H₂O' },
  };
  const MS = PHONE ? 1.15 : 1;
  const ionR = (k) => ION[k].r * MS;
  function sph(x, y, r, c, text, ts) {
    D.sphere(x, y, r, c, { shadow: false, gloss: r > 6 });
    if (text) D.text(x, y + r * 0.36, text, { size: ts || r * 1.05, weight: 800, color: '#fff', stroke: CO.shade(c, -0.45), strokeWidth: 3 });
  }
  function drawIon(kind, x, y, o) {
    o = o || {};
    const s = (o.s || 1) * MS;
    ctx.save();
    if (o.a != null) ctx.globalAlpha *= clamp(o.a, 0, 1);
    ctx.translate(x, y); ctx.scale(s, s);
    if (kind === 'H2O') {
      sph(0, 0, 7.5, '#ef6a6a');
      [-0.95, 0.95].forEach((a) => sph(Math.cos(a + Math.PI / 2) * 10, Math.sin(a + Math.PI / 2) * 10, 4.4, '#f2f4f8'));
    } else if (kind === 'OH-') { sph(0, 0, 12, ION[kind].c); D.text(0, 3.4, 'OH⁻', { size: 10, weight: 800, color: '#fff', stroke: CO.shade(ION[kind].c, -0.45), strokeWidth: 3 }); }
    else sph(0, 0, ION[kind].r, ION[kind].c, ION[kind].t, kind === 'Ca2+' || kind === 'SO4' ? 12 : 14);
    ctx.restore();
  }

  /* ---------- 이온 상자: 입자가 그려진 용기 안에서만 움직여요 ---------- */
  class IonBox {
    constructor(r, o) { this.r = r; this.ions = []; this.sp = (o && o.speed) || 20; this.onMerge = null; this.t = 0; }
    inside(kind) { const rad = ionR(kind) + 2, r = this.r; return { x: rnd(r.x + rad, r.x + r.w - rad), y: rnd(r.y + rad, r.y + r.h - rad) }; }
    add(kind, o) {
      o = o || {};
      const p = o.x != null ? { x: o.x, y: o.y } : this.inside(kind), a = rnd(0, TAU), sp = this.sp * rnd(0.4, 1);
      const ion = { kind, x: p.x, y: p.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, a: o.a != null ? o.a : 0, dying: false, mark: false, pop: o.pop || 0, pair: null, wait: 0, mx: 0, my: 0, rot: rnd(0, TAU) };
      this.ions.push(ion); return ion;
    }
    n(kind) { let c = 0; this.ions.forEach((i) => { if (i.kind === kind && !i.dying && !i.pair) c++; }); return c; }
    nAll(kind) { let c = 0; this.ions.forEach((i) => { if (i.kind === kind && !i.dying) c++; }); return c; }
    setCount(kind, n, max) {
      max = max || 2;
      let cur = this.n(kind);
      if (cur < n) { for (let k = 0; k < Math.min(max, n - cur); k++) this.add(kind); }
      else if (cur > n) {
        let rem = Math.min(max, cur - n);
        for (let i = this.ions.length - 1; i >= 0 && rem > 0; i--) { const q = this.ions[i]; if (q.kind === kind && !q.dying && !q.pair) { q.dying = true; rem--; this.onDie && this.onDie(q); } }
      }
    }
    settled(kind, n) { return this.n(kind) === n && this.ions.every((i) => !(i.kind === kind && i.dying)); }
    clear() { this.ions.length = 0; }
    // H⁺ 와 OH⁻ 를 가까운 것끼리 짝지어 H₂O 로 합쳐요
    react(count, stagger) {
      const hs = this.ions.filter((i) => i.kind === 'H+' && !i.dying && !i.pair), os = this.ions.filter((i) => i.kind === 'OH-' && !i.dying && !i.pair);
      let started = 0;
      while (started < count && hs.length && os.length) {
        const h = hs.shift();
        let bi = 0, bd = 1e9; os.forEach((o, k) => { const d = Math.hypot(o.x - h.x, o.y - h.y); if (d < bd) { bd = d; bi = k; } });
        const o = os.splice(bi, 1)[0];
        const rad = ionR('OH-') + 2;
        h.pair = o; o.pair = h;
        h.mx = o.mx = clamp((h.x + o.x) / 2, this.r.x + rad, this.r.x + this.r.w - rad); h.my = o.my = clamp((h.y + o.y) / 2, this.r.y + rad, this.r.y + this.r.h - rad);
        h.wait = o.wait = started * (stagger != null ? stagger : 0.12);
        started++;
      }
      return started;
    }
    pending() { return this.ions.some((i) => i.pair); }
    update(dt) {
      this.t += dt;
      const L = this.ions, r = this.r;
      for (let i = L.length - 1; i >= 0; i--) {
        const q = L[i];
        if (q.dying) { q.a -= dt * 4; if (q.a <= 0.02) { L.splice(i, 1); continue; } }
        else q.a = Math.min(1, q.a + dt * 4);
        q.pop = Math.max(0, q.pop - dt * 2.5);
        if (q.pair) {
          if (L.indexOf(q.pair) < 0) { q.pair = null; continue; }
          if (q.wait > 0) { q.wait -= dt; }
          else {
            q.x += (q.mx - q.x) * (1 - Math.exp(-4 * dt)); q.y += (q.my - q.y) * (1 - Math.exp(-4 * dt));
            const p = q.pair;
            if (Math.hypot(q.x - q.mx, q.y - q.my) < 5 && Math.hypot(p.x - q.mx, p.y - q.my) < 5 && p.wait <= 0 && q.kind === 'H+') {
              L.splice(L.indexOf(p), 1); const k = L.indexOf(q); if (k >= 0) L.splice(k, 1);
              this.add('H2O', { x: q.mx, y: q.my, a: 1, pop: 1 });
              this.onMerge && this.onMerge(q.mx, q.my);
              i = Math.min(i, L.length);
            }
          }
          continue;
        }
        // 느린 무작위 운동
        q.vx += rnd(-1, 1) * this.sp * 5 * dt; q.vy += rnd(-1, 1) * this.sp * 5 * dt;
        const v = Math.hypot(q.vx, q.vy), vmax = this.sp * 1.3, vmin = this.sp * 0.35;
        if (v > vmax) { q.vx *= vmax / v; q.vy *= vmax / v; } else if (v < vmin && v > 0) { q.vx *= vmin / v; q.vy *= vmin / v; } else if (v === 0) { q.vx = vmin; }
        if (RM) { q.vx *= 0.4; q.vy *= 0.4; }
        q.x += q.vx * dt; q.y += q.vy * dt;
      }
      // 서로 겹치지 않게 살짝 밀어내기
      for (let a = 0; a < L.length; a++) {
        const p = L[a]; if (p.pair) continue;
        for (let b = a + 1; b < L.length; b++) {
          const q = L[b]; if (q.pair) continue;
          const dx = q.x - p.x, dy = q.y - p.y, min = ionR(p.kind) + ionR(q.kind) - 2, d2 = dx * dx + dy * dy;
          if (d2 < min * min && d2 > 0.01) { const d = Math.sqrt(d2), k = (min - d) * 0.5 / d; p.x -= dx * k; p.y -= dy * k; q.x += dx * k; q.y += dy * k; }
        }
      }
      L.forEach((q) => {
        const rad = ionR(q.kind) + 1;
        if (q.x < r.x + rad) { q.x = r.x + rad; q.vx = Math.abs(q.vx); } else if (q.x > r.x + r.w - rad) { q.x = r.x + r.w - rad; q.vx = -Math.abs(q.vx); }
        if (q.y < r.y + rad) { q.y = r.y + rad; q.vy = Math.abs(q.vy); } else if (q.y > r.y + r.h - rad) { q.y = r.y + r.h - rad; q.vy = -Math.abs(q.vy); }
      });
    }
    draw(opts) {
      opts = opts || {};
      this.ions.forEach((q) => {
        const wob = q.pair || RM ? 0 : Math.sin(this.t * 3 + q.rot * 5) * 0.8;
        drawIon(q.kind, q.x + wob, q.y, { a: q.a, s: 1 + q.pop * 0.5 });
        if (q.mark) {
          ctx.save(); ctx.strokeStyle = '#7c3aed'; ctx.lineWidth = 2.5; ctx.setLineDash([4, 3]); ctx.lineDashOffset = -this.t * 10;
          ctx.beginPath(); ctx.arc(q.x, q.y, ionR(q.kind) + 5, 0, TAU); ctx.stroke(); ctx.restore();
        }
      });
    }
    pick(p) {
      let best = null, bd = 1e9;
      this.ions.forEach((q) => { if (q.dying) return; const d = Math.hypot(q.x - p.x, q.y - p.y); if (d < ionR(q.kind) + 8 && d < bd) { bd = d; best = q; } });
      return best;
    }
  }

  /* ---------- 유리 기구 ---------- */
  const BTB = { Y: '#f2cf2e', G: '#4cb86a', B: '#2f6fd0' };
  function btbColor(t) { return t <= 1 ? CO.mix(BTB.Y, BTB.G, clamp(t, 0, 1)) : CO.mix(BTB.G, BTB.B, clamp(t - 1, 0, 1)); }
  // 스탠드에 매단 뷰렛. x = 가운데, y0 = 눈금 0의 높이, h = 눈금 0~max 의 길이, reading = 액면 눈금(mL)
  function drawBurette(x, y0, h, reading, o) {
    o = o || {};
    const max = o.max || 50, w = o.w || 26, liquid = o.liquid || '#9fd4ff', top = y0 - 14, bot = y0 + h + 6;
    const yOf = (v) => y0 + (v / max) * h;
    ctx.save();
    // 유리관 + 액체
    const path = () => { D.roundRect(x - w / 2, top, w, bot - top, 8); };
    ctx.save(); path(); ctx.clip();
    const ly = yOf(clamp(reading, 0, max));
    const g = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0); g.addColorStop(0, CO.rgba(liquid, 0.95)); g.addColorStop(0.5, CO.rgba(CO.shade(liquid, 0.3), 0.8)); g.addColorStop(1, CO.rgba(liquid, 0.95));
    ctx.fillStyle = g; ctx.fillRect(x - w / 2, ly, w, bot - ly);
    ctx.restore();
    ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 2.5; path(); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - w / 2 + 5, top + 8); ctx.lineTo(x - w / 2 + 5, bot - 8); ctx.stroke();
    // 눈금
    for (let v = 0; v <= max; v += 1) {
      const major = v % 10 === 0, mid = v % 5 === 0, yy = yOf(v);
      if (h / max < 4 && !mid) continue;
      ctx.strokeStyle = '#4b5563'; ctx.lineWidth = major ? 1.6 : 1; ctx.beginPath(); ctx.moveTo(x + w / 2 - (major ? 12 : mid ? 8 : 5), yy); ctx.lineTo(x + w / 2, yy); ctx.stroke();
      if (major && ((h / max) * 10 >= 15 || v === 0 || v === max)) T(x + w / 2 + 5, yy + 4, String(v), 12, MUTED, 'left', 800);
    }
    // 밸브 + 끝
    const vy = bot + 6;
    D.roundRect(x - 4, bot, 8, 16, 2); ctx.fillStyle = '#9ca3af'; ctx.fill();
    ctx.save(); ctx.translate(x, vy + 6); ctx.rotate(o.open ? -1.2 : 0); D.roundRect(-13, -4, 26, 8, 4); ctx.fillStyle = o.open ? '#e2464b' : '#6b7280'; ctx.fill(); ctx.restore();
    ctx.fillStyle = '#9ca3af'; ctx.beginPath(); ctx.moveTo(x - 4, vy + 16); ctx.lineTo(x + 4, vy + 16); ctx.lineTo(x + 1.5, vy + 32); ctx.lineTo(x - 1.5, vy + 32); ctx.closePath(); ctx.fill();
    ctx.restore();
    return { tipY: vy + 32, yOf };
  }
  function drawStand(poleX, bx0, bx1, baseY, topY, clampY, burX) {
    ctx.save();
    D.roundRect(bx0, baseY, bx1 - bx0, 12, 6); ctx.fillStyle = '#6b7280'; ctx.fill();
    D.roundRect(poleX - 4, topY, 8, baseY - topY + 4, 3); ctx.fillStyle = '#9ca3af'; ctx.fill();
    ctx.strokeStyle = '#6b7280'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(poleX, clampY); ctx.lineTo(burX - 8, clampY); ctx.stroke();
    ctx.restore();
  }
  // 삼각 플라스크 (액체 색은 hex 문자열)
  function drawFlaskAt(cx, by, w, h, level, liquid, t, swirl) {
    ctx.save();
    if (swirl) { ctx.translate(cx, by); ctx.rotate(Math.sin(t * 14) * 0.035 * swirl); ctx.translate(-cx, -by); }
    D.flask(cx, by, w, h, { level, liquid, t });
    ctx.restore();
  }
  // 입자 상자용 둥근 사각 창 (확대경 느낌)
  function lens(r, title, sub) {
    panel(r.x, r.y, r.w, r.h, 14, '#fbfaff');
    ctx.save(); ctx.strokeStyle = '#c4b5fd'; ctx.lineWidth = 2; D.roundRect(r.x, r.y, r.w, r.h, 14); ctx.stroke(); ctx.restore();
    T(r.x + 12, r.y + 21, '🔍 ' + title, 13.5, '#5b21b6', 'left', 800);
    if (sub) T(r.x + r.w - 10, r.y + 21, sub, 12, MUTED, 'right', 800);
  }
  // 입자 상자 영역(제목 아래)
  const boxOf = (r, top, bottom) => rect(r.x + 8, r.y + (top == null ? 32 : top), r.w - 16, r.h - (top == null ? 32 : top) - (bottom == null ? 8 : bottom));

  function chipsTo(box, items, cur, cb, doneFn) {
    box.innerHTML = '';
    items.forEach((it, i) => {
      const b = document.createElement('button'); b.type = 'button'; b.dataset.v = i; b.textContent = it;
      b.addEventListener('click', () => { Sound.click(); cb(i); });
      box.appendChild(b);
    });
    refreshChips(box, cur, doneFn);
  }
  function refreshChips(box, cur, doneFn) {
    Array.from(box.children).forEach((b, i) => { b.classList.toggle('on', i === cur); b.classList.toggle('done', !!(doneFn && doneFn(i))); });
  }

  /* ===================== 적정 엔진 (hc-titration · hc-vinegar-titration 공용) =====================
     뷰렛 NaOH(0.100 M)를 한 방울(0.05 mL)씩 넣어 삼각 플라스크 시료를 적정해요.
     종말점 = 페놀프탈레인의 연한 붉은색이 30초 유지될 때(화면에서는 6배 빠르게 감아 보여 줘요). */
  const el = (id) => document.getElementById(id);
  const DROP = 0.05, TIMER_FULL = 30, TIMER_SPEED = 6;
  const r2 = (v) => Math.round(v * 100) / 100;
  const PINK = '#ff3d9a';
  const TT = {
    cfg: null, ready: false, start: 0, n: 0, flow: 'none', acc: 0, timer: 0, flash: 0, swirlHold: false, swirlA: 0, lock: 0, endpt: false, msg: '',
    rd: { r: 0 }, fill: { v: 0 }, pinkA: 0, runs: {}, indQ: 0, shake: 0, valve: 0,
  };
  const tV = () => r6(TT.n * DROP);
  const tVeq = () => (TT.cfg ? r6(TT.cfg.conc * TT.cfg.vol / TT.cfg.titrant) : 15);
  const tE = () => r6(tV() - tVeq());
  function tRuns(key) { key = key || (TT.cfg && TT.cfg.key) || 'x'; return TT.runs[key] || (TT.runs[key] = { rough: null, fine: [] }); }
  const tValid = (key) => tRuns(key).fine.filter((r) => r.ok);
  const tMean = (key) => { const v = tValid(key).slice(0, 3); return v.length ? r2(v.reduce((a, r) => a + r.used, 0) / v.length) : NaN; };
  function tNextStart() {
    const R = tRuns(); if (!R.rough) return 0;
    const k = R.fine.length % 3;
    return k === 0 ? 0.2 : k === 1 ? r2(R.fine[R.fine.length - 1].end) : 0;
  }
  function tStopFlow() { TT.flow = 'none'; TT.swirlHold = false; TT.acc = 0; ['tFast', 'tSlow', 'tSwirl'].forEach((id) => { const b = el(id); b && b.classList.remove('held'); }); }
  function tReset(full) {
    tStopFlow(); TT.n = 0; TT.timer = 0; TT.flash = 0; TT.pinkA = 0; TT.endpt = false; TT.lock = 0; TT.msg = '';
    TT.start = tNextStart(); TT.rd.r = TT.start; if (full) { TT.ready = false; TT.fill.v = 0; }
    tws.forEach((h) => h.cancel && h.cancel()); tws.length = 0;
    if (TT.ready) { TT.fill.v = 0; tw(TT.fill, { v: 1 }, { duration: 0.7 }); }
  }
  function tSet(cfg, fullReset) {
    const changed = !TT.cfg || TT.cfg.key !== cfg.key;
    TT.cfg = cfg;
    if (changed || fullReset) { TT.ready = false; tReset(true); }
  }
  function tPrepare() {
    if (TT.ready || TT.lock > 0) return;
    if (TT.canPrep && !TT.canPrep()) { Sound.fail(); showHint(TT.prepMsg || '', 4200); return; }
    TT.ready = true; TT.fill.v = 0; TT.indQ = 3; TT.lock = 1.2; Sound.click();
    tw(TT.fill, { v: 1 }, { duration: 0.9, ease: 'outCubic' });
  }
  function tRecord() {
    if (!TT.ready || TT.timer < TIMER_FULL || TT.lock > 0) return false;
    const R = tRuns(), kind = R.rough ? 'fine' : 'rough', used = tV(), e = tE();
    const ok = kind === 'rough' ? e <= 1.5 + 1e-9 : e <= 0.2 + 1e-9;
    const run = { kind, start: r2(TT.start), end: r2(TT.start + used), used: r2(used), ok };
    if (kind === 'rough') { if (ok) R.rough = run; R.last = run; } else R.fine.push(run);
    tStopFlow();
    if (ok) { Sound.success(); const g = TT.geom; g && parts.burst(g.cx, g.by - g.fh * 0.4, { count: 16, speed: 120, size: 3, colors: [PINK, '#ffb400', '#14a058'] }); }
    else { Sound.fail(); TT.shake = 0.5; }
    TT.msg = ok ? '' : kind === 'rough' ? '너무 많이 지나쳤어요(1.5 mL 넘게). 다시 해 보세요.' : '종말점을 0.2 mL 넘게 지나쳤어요. 이 회는 쓸 수 없어요.';
    TT.lock = 1.1;
    setTimeout(() => { if (!TT.cfg) return; TT.n = 0; TT.timer = 0; TT.flash = 0; TT.pinkA = 0; TT.endpt = false; TT.start = tNextStart(); TT.fill.v = 0; tw(TT.fill, { v: 1 }, { duration: 0.7 }); }, RM ? 10 : 600);
    return ok;
  }
  function tAgain() { if (TT.lock > 0) return; tStopFlow(); TT.n = 0; TT.timer = 0; TT.flash = 0; TT.pinkA = 0; TT.endpt = false; TT.msg = ''; TT.fill.v = 0; if (TT.ready) tw(TT.fill, { v: 1 }, { duration: 0.6 }); Sound.click(); }
  function tAddDrops(k, visual) {
    const R = tRuns(); let maxN = Math.floor((50 - TT.start) / DROP + 1e-9);
    if (R.rough && TT.flow === 'fast') maxN = Math.min(maxN, Math.floor(Math.max(0, R.rough.used - 1.0) / DROP + 1e-9));
    const before = TT.n; TT.n = Math.min(TT.n + k, maxN);
    const added = TT.n - before;
    if (TT.flow === 'fast' && added === 0 && k > 0 && R.rough) { TT.flow = 'none'; showHint('여기서부터는 천천히! 대략 적정 값보다 1 mL 앞이에요. 💧 천천히나 한 방울을 써요.', 4500); }
    if (added > 0) {
      TT.timer = 0; TT.endpt = false;
      const e = tE(), d = tVeq() - tV();
      if (e <= 1e-9) TT.flash = Math.max(TT.flash, clamp(1 - d / 2.0, 0.1, 0.9)); else TT.flash = 0;
      if (visual && TT.geom && !RM) {
        const g = TT.geom, sy = tSurface(g);
        const life = Math.sqrt(2 * Math.max(10, sy - g.tipY) / 900);
        parts.emit({ x: g.cx, y: g.tipY - 2, vx: 0, vy: 30, gravity: 900, size: 3.2, life, color: '#9ec7ff', fade: false });
      }
    }
    return added;
  }
  function tSurface(g) { const neckH = g.fh * 0.32; return g.by - (g.fh - neckH) * (0.22 + 0.2 * TT.fill.v + 0.12 * clamp(tV() / 30, 0, 1)); }
  function stepTitr(dt) {
    const T0 = TT; if (!T0.cfg) return;
    T0.swirlA = SciSim.approach(T0.swirlA, T0.swirlHold ? 1 : 0, dt, 10);
    if (T0.lock > 0) T0.lock = Math.max(0, T0.lock - dt);
    if (T0.shake > 0) T0.shake -= dt;
    let rate = 0;
    if (T0.ready && T0.lock <= 0) rate = T0.flow === 'fast' ? 60 : T0.flow === 'slow' ? 6 : 0;
    if (rate) {
      T0.acc += rate * dt; const k = Math.floor(T0.acc); T0.acc -= k;
      if (k > 0) tAddDrops(k, T0.flow === 'slow');
      else if (T0.flow === 'fast' && !RM) { /* 줄기는 그림에서 표현 */ }
    }
    T0.valve = SciSim.approach(T0.valve, rate ? 1 : 0, dt, 18);
    const e = tE();
    const target = e > 1e-9 ? 0.30 + 0.55 * clamp(e / 0.5, 0, 1) : 0;
    T0.pinkA = SciSim.approach(T0.pinkA, target, dt, 6);
    const decay = (T0.swirlA > 0.5 ? 3.2 : 1.5) * (0.7 + clamp(tVeq() - tV(), 0, 6) * 0.3);
    T0.flash = Math.max(0, T0.flash - decay * dt * (e > 1e-9 ? 4 : 1));
    if (e > 1e-9 && T0.ready && T0.lock <= 0) { T0.timer = Math.min(TIMER_FULL, T0.timer + dt * TIMER_SPEED); if (T0.timer >= TIMER_FULL && !T0.endpt) { T0.endpt = true; Sound.success(); const g = T0.geom; g && parts.burst(g.cx, g.by - g.fh * 0.5, { count: 14, speed: 110, size: 3, colors: [PINK, '#fff', '#ffb400'] }); } }
    else if (e <= 1e-9) { T0.timer = 0; T0.endpt = false; }
    T0.rd.r = SciSim.approach(T0.rd.r, T0.start + tV(), dt, 12);
    if (T0.indQ > 0 && !RM) { T0.indQ -= dt * 3; if (T0.geom && Math.random() < dt * 14) { const g = T0.geom; parts.emit({ x: g.cx + rnd(-3, 3), y: g.tipY + 10, vx: 0, vy: 40, gravity: 700, size: 2.4, life: 0.35, color: PINK, fade: false }); } }
  }
  function tLiquid() {
    const c = TT.cfg, a = Math.max(TT.pinkA, TT.flash * 0.9);
    return CO.mix(c.base, PINK, clamp(a, 0, 1));
  }
  function titrGeom(R) {
    if (PHONE) { const cx = R.x + 118, y0 = R.y + 62, h = 116; return { R, cx, y0, h, tipY: y0 + h + 44, fw: 118, fh: 84, by: R.y + R.h - 40 }; }
    const cx = R.x + 150, y0 = R.y + 66, h = 230;
    return { R, cx, y0, h, tipY: y0 + h + 44, fw: 150, fh: 118, by: R.y + R.h - 60 };
  }
  function drawTitrApp(R) {
    const g = titrGeom(R); TT.geom = g; const c = TT.cfg;
    panel(R.x, R.y, R.w, R.h, 14);
    if (!PHONE) T(R.x + 14, R.y + 24, '🧪 적정 장치', 14.5, INK, 'left', 800);
    drawStand(R.x + 30, R.x + 12, g.cx + 90, g.by, g.y0 - 24, g.y0 + 34, g.cx);
    D.label(g.cx, g.y0 - 30, c.titrantLabel, { bg: IC_OH, size: PHONE ? 11.5 : 13, pad: 8 });
    const b = drawBurette(g.cx, g.y0, g.h, TT.rd.r, { max: 50, liquid: '#a9c8ff', w: PHONE ? 22 : 26, open: TT.valve > 0.5 });
    // 줄기 · 방울
    const sy = tSurface(g);
    if (TT.flow === 'fast' && TT.valve > 0.5 && TT.ready) { ctx.save(); ctx.strokeStyle = 'rgba(158,199,255,.9)'; ctx.lineWidth = 3; ctx.setLineDash([6, 4]); ctx.lineDashOffset = -S.t * 120; ctx.beginPath(); ctx.moveTo(g.cx, g.tipY); ctx.lineTo(g.cx, sy); ctx.stroke(); ctx.restore(); }
    // 흰 종이 + 플라스크
    D.shadow(() => { ctx.save(); ctx.translate(g.cx, g.by + 6); ctx.rotate(-0.03); D.roundRect(-g.fw * 0.78, -4, g.fw * 1.56, 30, 4); ctx.fillStyle = '#fff'; ctx.fill(); ctx.restore(); }, { blur: 5, y: 2 });
    T(g.cx - g.fw * 0.74, g.by + 24, '흰 종이', 11, '#94a3b8', 'left', 800);
    const lvl = TT.ready ? (0.22 + 0.2 * TT.fill.v + 0.12 * clamp(tV() / 30, 0, 1)) : 0;
    if (TT.ready || TT.fill.v > 0.01) {
      ctx.save(); if (TT.shake > 0) ctx.translate(Math.sin(S.t * 60) * 3, 0);
      drawFlaskAt(g.cx, g.by, g.fw, g.fh, lvl, tLiquid(), S.t, TT.swirlA);
      // 방울이 떨어지는 자리에 번지는 붉은 구름
      if (TT.flash > 0.03 && TT.pinkA < 0.1) { ctx.save(); ctx.globalAlpha = clamp(TT.flash, 0, 1) * 0.8; D.glow(g.cx, sy + 6, g.fw * 0.28, PINK, 0.8); ctx.restore(); }
      ctx.restore();
    } else drawFlaskAt(g.cx, g.by, g.fw, g.fh, 0, '#cfe8f7', S.t, 0);
    D.label(g.cx, g.by + (PHONE ? 22 : 48), TT.ready ? c.flaskLabel : '빈 삼각 플라스크', { bg: '#475569', size: PHONE ? 11.5 : 12.5, pad: 8 });
    // 30초 타이머 링
    if (TT.timer > 0 && TT.ready) {
      const rx = g.cx + g.fw * 0.62, ry = g.by - g.fh * 0.55, p = TT.timer / TIMER_FULL;
      ctx.save(); ctx.lineWidth = 6; ctx.strokeStyle = '#e5e7eb'; ctx.beginPath(); ctx.arc(rx, ry, 21, 0, TAU); ctx.stroke();
      ctx.strokeStyle = p >= 1 ? GOOD : PINK; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(rx, ry, 21, -Math.PI / 2, -Math.PI / 2 + TAU * p); ctx.stroke(); ctx.restore();
      T(rx, ry + 5, p >= 1 ? '✓' : String(Math.round(TT.timer)), 14, p >= 1 ? GOOD : INK, 'center', 800);
      T(rx, ry + 38, '30초 유지', 11.5, MUTED, 'center', 800);
      if (p >= 1) D.ring(rx, ry, 24, S.t, { color: GOOD, width: 2 });
    }
    if (!TT.ready) T(g.cx, g.by - g.fh * 0.55, '🧪 시료 준비를 눌러요', PHONE ? 12.5 : 14, MUTED, 'center', 800);
    return g;
  }
  const IC_OH = '#3867f4';
  // 눈금 확대 창: 액면 ±1 mL
  function drawZoom(Rz) {
    lens(Rz, '눈금 읽기', '0.1 mL 눈금');
    const cx = Rz.x + 62, midY = Rz.y + 32 + (Rz.h - 40) / 2, ppm = (Rz.h - 56) / 2.4, w = 54, r = TT.rd.r;
    ctx.save(); D.roundRect(Rz.x + 10, Rz.y + 32, Rz.w - 20, Rz.h - 40, 8); ctx.clip();
    const yOf = (v) => midY + (v - r) * ppm;
    // 관
    ctx.fillStyle = 'rgba(200,215,235,.35)'; ctx.fillRect(cx - w / 2, Rz.y, w, Rz.h);
    const ly = yOf(r);
    const lg = ctx.createLinearGradient(cx - w / 2, 0, cx + w / 2, 0); lg.addColorStop(0, 'rgba(120,170,255,.9)'); lg.addColorStop(0.5, 'rgba(190,215,255,.85)'); lg.addColorStop(1, 'rgba(120,170,255,.9)');
    ctx.fillStyle = lg; ctx.fillRect(cx - w / 2, ly, w, Rz.y + Rz.h - ly);
    ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(cx - w / 2, Rz.y); ctx.lineTo(cx - w / 2, Rz.y + Rz.h); ctx.moveTo(cx + w / 2, Rz.y); ctx.lineTo(cx + w / 2, Rz.y + Rz.h); ctx.stroke();
    // 오목한 액면
    ctx.strokeStyle = '#2f5fb0'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(cx - w / 2, ly - 3); ctx.quadraticCurveTo(cx, ly + 6, cx + w / 2, ly - 3); ctx.stroke();
    // 눈금
    const v0 = Math.floor(r - 1.4), v1 = Math.ceil(r + 1.4);
    for (let k = Math.round(v0 * 10); k <= Math.round(v1 * 10); k++) {
      const v = k / 10, y = yOf(v); if (v < 0 || v > 50) continue;
      const major = k % 10 === 0, half = k % 5 === 0;
      ctx.strokeStyle = '#475569'; ctx.lineWidth = major ? 2 : 1.2; ctx.beginPath(); ctx.moveTo(cx + w / 2, y); ctx.lineTo(cx + w / 2 - (major ? 22 : half ? 15 : 9), y); ctx.stroke();
      if (major) T(cx + w / 2 + 8, y + 5, String(v), 14, INK, 'left', 800);
    }
    ctx.restore();
    D.arrow(Rz.x + Rz.w - 14, midY, cx + w / 2 + 34, midY, { color: BAD, width: 3, head: 10 });
    D.label(Rz.x + Rz.w - 10, Rz.y + Rz.h - 20, TT.cfg ? r2(TT.start + tV()).toFixed(2) + ' mL' : '', { bg: INK, size: 14, align: 'right', pad: 9 });
  }
  function drawRuns(Rt, title) {
    panel(Rt.x, Rt.y, Rt.w, Rt.h, 14);
    T(Rt.x + 14, Rt.y + 24, title || '📋 뷰렛 눈금 기록표', 14.5, INK, 'left', 800);
    const R = tRuns(), cols = [Rt.x + 14, Rt.x + Rt.w * 0.30, Rt.x + Rt.w * 0.50, Rt.x + Rt.w * 0.72];
    ['회차', '처음(mL)', '나중(mL)', '사용 부피(mL)'].forEach((s, i) => T(cols[i], Rt.y + 50, s, 12.5, MUTED, 'left', 800));
    const rows = [];
    rows.push(R.rough ? { n: '대략', r: R.rough, ok: true, ex: true } : { n: '대략', r: null });
    for (let i = 0; i < Math.max(3, R.fine.length); i++) rows.push({ n: '정밀 ' + (i + 1), r: R.fine[i] || null, ok: R.fine[i] ? R.fine[i].ok : null });
    const lh = PHONE ? 30 : 26, shown = rows.slice(0, PHONE ? 7 : 8);
    shown.forEach((row, i) => {
      const y = Rt.y + 76 + i * lh;
      T(cols[0], y, row.n, 13.5, row.ex ? MUTED : INK, 'left', 800);
      if (row.r) {
        T(cols[1], y, row.r.start.toFixed(2), 13.5, INK, 'left', 800); T(cols[2], y, row.r.end.toFixed(2), 13.5, INK, 'left', 800);
        T(cols[3], y, row.r.used.toFixed(2) + (row.ex ? ' (평균 제외)' : row.ok ? ' ✓' : ' ✗ 지나침'), 13.5, row.ok === false ? BAD : row.ex ? MUTED : '#0b6b39', 'left', 800);
      } else { ['-', '-', '-'].forEach((s, k) => T(cols[k + 1], y, s, 13.5, '#b7bdd0', 'left', 800)); }
    });
    const m = tMean(), yb = Rt.y + 76 + shown.length * lh + 6;
    T(cols[0], yb, '평균 (정밀 ' + Math.min(3, tValid().length) + '회)', 13.5, INK, 'left', 800);
    T(cols[3], yb, isNaN(m) ? '?' : m.toFixed(2) + ' mL', 14, isNaN(m) ? MUTED : VIO, 'left', 800);
    if (TT.msg) T(Rt.x + 14, Rt.y + Rt.h - 12, TT.msg, 12.5, BAD, 'left', 800);
  }
  function holdBtn(id, on, off) {
    const b = el(id); if (!b) return;
    const dn = (e) => { e.preventDefault(); try { b.setPointerCapture(e.pointerId); } catch (x) { /* 무시 */ } b.classList.add('held'); on(); };
    const up = () => { b.classList.remove('held'); off(); };
    b.addEventListener('pointerdown', dn);
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((ev) => b.addEventListener(ev, up));
    b.addEventListener('keydown', (e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); b.classList.add('held'); on(); } });
    b.addEventListener('keyup', (e) => { if (e.key === ' ' || e.key === 'Enter') { b.classList.remove('held'); off(); } });
  }
  function bindTitr() {
    holdBtn('tFast', () => { if (TT.ready && TT.lock <= 0) { TT.flow = 'fast'; } else if (!TT.ready) showHint('먼저 🧪 시료 준비를 눌러요.', 2500); }, () => { if (TT.flow === 'fast') TT.flow = 'none'; });
    holdBtn('tSlow', () => { if (TT.ready && TT.lock <= 0) { TT.flow = 'slow'; } else if (!TT.ready) showHint('먼저 🧪 시료 준비를 눌러요.', 2500); }, () => { if (TT.flow === 'slow') TT.flow = 'none'; });
    holdBtn('tSwirl', () => { TT.swirlHold = true; }, () => { TT.swirlHold = false; });
    el('tDrop').addEventListener('click', () => { if (!TT.ready) { showHint('먼저 🧪 시료 준비를 눌러요.', 2500); return; } if (TT.lock > 0) return; Sound.tick(); tAddDrops(1, true); });
    el('tRecord').addEventListener('click', () => { if (!TT.ready) return; if (TT.timer < TIMER_FULL) { Sound.fail(); showHint(tE() > 1e-9 ? '연한 붉은색이 30초 유지될 때까지 기다려요. (타이머 링을 보세요)' : '아직 종말점이 아니에요. 연한 붉은색이 남을 때까지 넣어요.', 3500); return; } tRecord(); });
    el('tAgain').addEventListener('click', tAgain);
    el('tPrep').addEventListener('click', tPrepare);
  }
  let tCtlKey = '';
  function updateTitrCtl() {
    const R = tRuns(), kind = R.rough ? 'fine' : 'rough';
    const key = [TT.ready, TT.timer >= TIMER_FULL, TT.lock > 0, kind, R.fine.length, !!R.rough].join('|');
    if (key === tCtlKey) return; tCtlKey = key;
    el('tPrep').disabled = TT.ready || TT.lock > 0;
    el('tRecord').disabled = !(TT.ready && TT.lock <= 0);
    ['tFast', 'tSlow', 'tDrop', 'tSwirl', 'tAgain'].forEach((id) => { el(id).disabled = !TT.ready; });
    el('tRunKind').textContent = kind === 'rough' ? '지금: 대략 적정' : '지금: 정밀 적정 ' + (R.fine.length + 1) + '회째';
  }

  /* ===================== 중화 적정 실험 [12화학04-04] =====================
     ① 예측: 적정 계획(도구 짝짓기 · 실험 순서)  ② 실험: 적정 조작(뷰렛 · 종말점)
     ③ 분석: 농도 계산(aMV = bM′V′)  ④ 확인: 오차 평가
     중화 적정 곡선(pH–부피 그래프)은 다루지 않아요. 종말점은 지시약의 색 변화로만 판단해요. */
  const MODE_LABEL = { tools: '🔧 도구 짝짓기', order: '🃏 실험 순서', titr: '🧪 적정 조작', calc: '🧮 농도 계산', err: '⚠️ 오차 평가' };
  const IC = { H: ION['H+'].c, OH: ION['OH-'].c };
  const S = {
    mode: 'tools', t: 0, fade: 0, gate: '',
    tools: { map: [-1, -1, -1, -1], sel: null, shake: 0 },
    order: { picks: [], shuf: [4, 0, 6, 2, 5, 1, 3], done: false, shake: 0 },
    calc: { pi: 0, stage: [0, 0], wrong: [0, 0], pop: [{ v: 0 }, { v: 0 }, { v: 0 }] },
    err: { sel: ['', '', '', ''], calc: '', bar: { v: 0 } },
  };
  let game = null;
  const CFG_B = { key: 'hcl', conc: 0.0750, vol: 20.00, titrant: 0.100, base: '#cfe8f7', titrantLabel: '0.100 M NaOH', flaskLabel: 'HCl 20.00 mL + 페놀프탈레인' };
  const TRUE_M = 0.0750;
  const boxT = new IonBox(rect(0, 0, 10, 10));
  const UNIT_T = 0.1;
  const cntU = (x, u) => (x > 1e-9 ? Math.max(1, Math.round(x / u)) : 0);
  boxT.onDie = (q) => { if (q.kind === 'H+' || q.kind === 'OH-') parts.burst(q.x, q.y, { count: 4, speed: 45, size: 2, gravity: 0, life: 0.4, colors: ['#7cc4ff', '#fff'] }); };

  /* ---------- 그림 도우미 ---------- */
  function banner(R) {
    panel(R.x, R.y, R.w, R.h, 14);
    textBlock(R.x + 16, R.y + (PHONE ? 26 : 28), R.w - 32, '중화 적정: 농도를 아는 NaOH 표준 용액을 뷰렛으로 조금씩 넣어, H⁺ 몰수 = OH⁻ 몰수가 되는 순간(종말점)의 부피로 시료 HCl의 농도를 구해요.  a M V = b M′ V′', PHONE ? 13.5 : 15, INK, PHONE ? 20 : 22, 800);
  }
  function pipetteIcon(cx, y0, h, filled) {
    ctx.save(); ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 2.5; ctx.lineJoin = 'round';
    const top = y0 + 26, bot = y0 + h, bul = y0 + h * 0.46;
    D.sphere(cx, y0 + 12, 12, '#e2464b', { gloss: true });
    D.roundRect(cx - 2, y0 + 20, 4, 14, 2); ctx.fillStyle = '#6b7280'; ctx.fill();
    ctx.beginPath(); ctx.moveTo(cx - 3.5, top); ctx.lineTo(cx - 3.5, bul - 16); ctx.quadraticCurveTo(cx - 17, bul - 8, cx - 17, bul + 8); ctx.quadraticCurveTo(cx - 17, bul + 24, cx - 3.5, bul + 32);
    ctx.lineTo(cx - 3.5, bot - 14); ctx.lineTo(cx, bot); ctx.lineTo(cx + 3.5, bot - 14); ctx.lineTo(cx + 3.5, bul + 32); ctx.quadraticCurveTo(cx + 17, bul + 24, cx + 17, bul + 8); ctx.quadraticCurveTo(cx + 17, bul - 8, cx + 3.5, bul - 16); ctx.lineTo(cx + 3.5, top);
    ctx.fillStyle = filled ? 'rgba(160,200,255,.55)' : 'rgba(220,232,245,.35)'; ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx - 6, top + 14); ctx.lineTo(cx + 6, top + 14); ctx.stroke();
    ctx.restore();
  }
  function toolIcon(id, x, y, w, h) {
    const cx = x + w / 2;
    if (id === 'burette') drawBurette(cx, y + 24, Math.max(70, h - 92), 3, { max: 50, liquid: '#a9c8ff', w: 22 });
    else if (id === 'pipette') pipetteIcon(cx, y + 8, h - 40, true);
    else if (id === 'flask') { D.flask(cx, y + h - 22, 100, 96, { level: 0.4, liquid: '#cfe8f7', t: S.t }); }
    else { drawStand(x + w * 0.3, x + w * 0.14, x + w * 0.86, y + h - 24, y + 14, y + 50, x + w * 0.62); ctx.save(); ctx.strokeStyle = '#6b7280'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x + w * 0.3, y + 50); ctx.lineTo(x + w * 0.62 + 2, y + 50); ctx.stroke(); ctx.restore(); D.roundRect(x + w * 0.62 - 3, y + 38, 10, 24, 3); ctx.fillStyle = '#9ca3af'; ctx.fill(); }
  }

  /* =========================================================
     ① 도구 짝짓기
     ========================================================= */
  const TOOLS = [
    { id: 'flask', name: 3, desc: '삼각 플라스크: 시료와 지시약을 담고 흔들어 섞어요.' },
    { id: 'burette', name: 2, desc: '뷰렛: 표준 용액을 한 방울씩 넣고, 넣은 부피를 눈금으로 읽어요.' },
    { id: 'pipette', name: 1, desc: '피펫: 시료의 부피(20.00 mL)를 정확히 취해요. 안전 피펫 필러로 빨아올려요.' },
    { id: 'stand', name: 0, desc: '스탠드: 뷰렛을 수직으로 고정해요.' },
  ];
  const NAMES = ['스탠드', '피펫', '뷰렛', '삼각 플라스크'];
  const LT = PHONE
    ? { ban: rect(6, 6, 468, 92), t: (i) => rect(6 + (i % 2) * 236, 104 + Math.floor(i / 2) * 194, 232, 188), n: (j) => rect(6 + (j % 2) * 236, 496 + Math.floor(j / 2) * 54, 232, 48), desc: rect(6, 604, 468, 150) }
    : { ban: rect(8, 8, 784, 70), t: (i) => rect(8 + i * 198, 88, 188, 244), n: (j) => rect(8 + j * 198, 342, 188, 54), desc: rect(8, 406, 784, 146) };
  const toolsDone = () => TOOLS.every((t, i) => S.tools.map[i] === t.name);
  function drawTools() {
    const Tl = S.tools; banner(LT.ban);
    TOOLS.forEach((tl, i) => {
      const r = LT.t(i), nm = Tl.map[i], sel = Tl.sel && Tl.sel.kind === 't' && Tl.sel.i === i, sh = Tl.shake > 0 && nm >= 0 && nm !== tl.name ? Math.sin(S.t * 60) * 3 : 0;
      ctx.save(); ctx.translate(sh, 0);
      panel(r.x, r.y, r.w, r.h, 14);
      ctx.strokeStyle = sel ? VIO : nm >= 0 ? (toolsDone() ? GOOD : '#a78bfa') : '#d5d9e6'; ctx.lineWidth = sel ? 4 : 2.5; D.roundRect(r.x, r.y, r.w, r.h, 14); ctx.stroke();
      D.sphere(r.x + 22, r.y + 22, 14, VIO, { gloss: true, text: String(i + 1) });
      toolIcon(tl.id, r.x, r.y + 16, r.w, r.h - 50);
      if (nm >= 0) D.label(r.x + r.w / 2, r.y + r.h - 20, NAMES[nm], { bg: toolsDone() ? GOOD : VIO, size: PHONE ? 13 : 14, pad: 9 });
      else T(r.x + r.w / 2, r.y + r.h - 16, '이름을 짝지어요', 13, MUTED, 'center', 700);
      if (sel) D.ring(r.x + r.w / 2, r.y + r.h / 2, Math.min(r.w, r.h) * 0.45, S.t, { color: VIO, width: 3 });
      ctx.restore();
    });
    NAMES.forEach((nm, j) => {
      const r = LT.n(j), used = Tl.map.indexOf(j), sel = Tl.sel && Tl.sel.kind === 'n' && Tl.sel.i === j;
      D.shadow(() => { D.roundRect(r.x, r.y, r.w, r.h, 27); ctx.fillStyle = used >= 0 ? '#f3efff' : '#fff'; ctx.fill(); }, { blur: 6, y: 2 });
      ctx.strokeStyle = sel ? VIO : used >= 0 ? '#a78bfa' : '#d5d9e6'; ctx.lineWidth = sel ? 4 : 2; D.roundRect(r.x, r.y, r.w, r.h, 27); ctx.stroke();
      T(r.x + r.w / 2, r.y + r.h / 2 + 6, nm, PHONE ? 16 : 18, INK, 'center', 800);
      if (used >= 0) D.sphere(r.x + 26, r.y + r.h / 2, 13, VIO, { gloss: true, text: String(used + 1), textScale: 1.05 });
    });
    const d = LT.desc; panel(d.x, d.y, d.w, d.h, 14);
    if (toolsDone()) {
      T(d.x + 14, d.y + 26, '✅ 모두 맞았어요! 도구가 하는 일', 14.5, '#0b6b39', 'left', 800);
      TOOLS.forEach((tl, i) => textBlock(d.x + 16, d.y + 52 + i * (PHONE ? 31 : 22), d.w - 32, tl.desc, PHONE ? 12.5 : 13.5, INK, 17, 700));
    } else {
      T(d.x + 14, d.y + 26, '이렇게 해요', 14.5, INK, 'left', 800);
      textBlock(d.x + 16, d.y + 52, d.w - 32, '그림(①~④)을 누른 다음, 알맞은 이름을 눌러 짝지어요. 이름을 먼저 눌러도 돼요. 짝지은 그림을 다시 누르면 짝이 풀려요.', PHONE ? 13 : 14, MUTED, 20, 700);
    }
  }
  function toolsDown(p) {
    const Tl = S.tools;
    for (let i = 0; i < 4; i++) if (inR(p, LT.t(i))) {
      Sound.click();
      if (Tl.sel && Tl.sel.kind === 'n') { const n = Tl.sel.i, o = Tl.map.indexOf(n); if (o >= 0) Tl.map[o] = -1; Tl.map[i] = n; Tl.sel = null; }
      else if (Tl.map[i] >= 0) { Tl.map[i] = -1; Tl.sel = { kind: 't', i }; } else Tl.sel = { kind: 't', i };
      return true;
    }
    for (let j = 0; j < 4; j++) if (inR(p, LT.n(j))) {
      Sound.click();
      if (Tl.sel && Tl.sel.kind === 't') { const o = Tl.map.indexOf(j); if (o >= 0) Tl.map[o] = -1; Tl.map[Tl.sel.i] = j; Tl.sel = null; }
      else { const o = Tl.map.indexOf(j); if (o >= 0) { Tl.map[o] = -1; } Tl.sel = { kind: 'n', i: j }; }
      return true;
    }
    return false;
  }

  /* =========================================================
     ① 실험 순서 카드
     ========================================================= */
  const ORD = [
    { t: '뷰렛은 표준 용액으로, 피펫은 시료로 헹군다', why: '남은 물방울 때문에 농도가 변하지 않게 사용할 용액으로 헹궈요.' },
    { t: '뷰렛에 NaOH 표준 용액을 채우고 눈금을 읽는다', why: '처음 눈금을 읽어 두어야 사용한 부피를 알 수 있어요.' },
    { t: '피펫으로 HCl 시료 20.00 mL를 삼각 플라스크에 취한다', why: '시료의 부피 V를 정확히 알아야 해요.' },
    { t: '페놀프탈레인을 2~3방울 넣는다', why: '지시약의 색 변화로 종말점을 알아요.' },
    { t: '대략 적정으로 종말점의 부피를 알아 둔다', why: '정밀 적정에서 어디부터 한 방울씩 넣을지 알 수 있어요.' },
    { t: '한 방울씩 정밀 적정을 3회 한다', why: '반복해서 평균을 내면 우연 오차가 줄어요.' },
    { t: '평균 부피로 a M V = b M′ V′를 풀어 농도를 구한다', why: '시료의 H⁺ 몰수 = 넣은 OH⁻ 몰수예요.' },
  ];
  const LO = PHONE
    ? { ban: rect(6, 6, 468, 92), c: (k) => rect(6 + (k % 2) * 236, 104 + Math.floor(k / 2) * 104, 232, 98), box: rect(6, 524, 468, 230) }
    : { ban: rect(8, 8, 784, 70), c: (k) => (k < 4 ? rect(8 + k * 198, 88, 188, 136) : rect(8 + (k - 4) * 198, 232, 188, 136)), box: rect(8, 380, 784, 172) };
  function drawOrder() {
    const O = S.order; banner(LO.ban);
    for (let k = 0; k < 7; k++) {
      const r = LO.c(k), id = O.shuf[k], c = ORD[id], at = O.picks.indexOf(id), sh = O.shake > 0 && at >= 0 && at !== id ? Math.sin(S.t * 60) * 3 : 0;
      ctx.save(); ctx.translate(sh, 0);
      D.shadow(() => { D.roundRect(r.x, r.y, r.w, r.h, 12); ctx.fillStyle = at >= 0 ? '#f3efff' : '#fff'; ctx.fill(); }, { blur: 6, y: 2 });
      ctx.strokeStyle = at >= 0 ? (O.done ? GOOD : VIO) : '#d5d9e6'; ctx.lineWidth = at >= 0 ? 3 : 2; D.roundRect(r.x, r.y, r.w, r.h, 12); ctx.stroke();
      textBlock(r.x + 12, r.y + (PHONE ? 24 : 28), r.w - 52, c.t, PHONE ? 13 : 14.5, INK, PHONE ? 18 : 20, 800);
      if (at >= 0) D.sphere(r.x + r.w - 20, r.y + 20, 15, O.done ? GOOD : VIO, { gloss: true, text: String(at + 1) });
      ctx.restore();
    }
    const b = LO.box; panel(b.x, b.y, b.w, b.h, 14);
    if (O.done) {
      T(b.x + 14, b.y + 26, '✅ 순서가 맞아요! 단계마다 하는 이유', 14.5, '#0b6b39', 'left', 800);
      let y = b.y + 52;
      ORD.forEach((c, i) => { const h = textBlock(b.x + 16, y, b.w - 32, (i + 1) + '. ' + c.why, PHONE ? 12.5 : 13.5, INK, PHONE ? 17 : 19, 700); y += h + (PHONE ? 4 : 2); });
    } else {
      T(b.x + 14, b.y + 26, '먼저 할 일부터 차례로 눌러요 (' + O.picks.length + ' / 7)', 14.5, INK, 'left', 800);
      textBlock(b.x + 16, b.y + 54, b.w - 32, '누른 카드에 순서 번호가 붙어요. 다시 누르면 취소돼요. 틀리면 카드가 흔들려요.', PHONE ? 13 : 14, MUTED, 20, 700);
    }
  }
  function orderDown(p) {
    for (let k = 0; k < 7; k++) if (inR(p, LO.c(k))) {
      const id = S.order.shuf[k], pk = S.order.picks, at = pk.indexOf(id); Sound.click();
      if (at >= 0) pk.splice(at, 1); else if (pk.length < 7) pk.push(id);
      S.order.done = false; return true;
    }
    return false;
  }

  /* =========================================================
     ② 적정 조작 scene
     ========================================================= */
  const LTI = PHONE
    ? { app: rect(6, 6, 468, 356), zoom: rect(246, 14, 222, 168), lens: rect(246, 188, 222, 168), runs: rect(6, 368, 468, 300) }
    : { app: rect(8, 8, 330, 544), zoom: rect(346, 8, 220, 214), lens: rect(574, 8, 218, 214), runs: rect(346, 230, 446, 322) };
  function stepTitrB(dt) {
    stepTitr(dt);
    const V = tV(), nH0 = r6(CFG_B.conc * CFG_B.vol), nOH = r6(0.100 * V), c = boxOf(LTI.lens, 32, 24);
    boxT.r = c;
    const H = Math.max(0, r6(nH0 - nOH)), OH = Math.max(0, r6(nOH - nH0));
    if (TT.ready && TT.fill.v > 0.6) {
      boxT.setCount('H+', cntU(H, UNIT_T), 2); boxT.setCount('Cl-', cntU(nH0, UNIT_T), 1); boxT.setCount('Na+', cntU(nOH, UNIT_T), 2); boxT.setCount('OH-', cntU(OH, UNIT_T), 2);
    } else { ['H+', 'Cl-', 'Na+', 'OH-'].forEach((k) => boxT.setCount(k, 0, 3)); }
    boxT.update(dt);
  }
  function drawTitrB() {
    drawTitrApp(LTI.app); drawZoom(LTI.zoom);
    lens(LTI.lens, '입자 모형', '플라스크 속');
    boxT.draw();
    T(LTI.lens.x + LTI.lens.w / 2, LTI.lens.y + LTI.lens.h - 8, '● 1개 ≈ ' + UNIT_T + ' mmol', 11.5, MUTED, 'center', 800);
    drawRuns(LTI.runs);
  }

  /* =========================================================
     ③ 농도 계산 scene
     ========================================================= */
  const PB = [
    { id: 'hcl', name: 'HCl', a: 1, Vs: '20.00', rows: [[0.20, 15.10, 14.90], [15.10, 30.20, 15.10], [0.00, 15.00, 15.00]], rough: [0.00, 16.20, 16.20], mean: 15.0, M: 0.0750, Vn: 15.0 },
    { id: 'h2so4', name: 'H₂SO₄', a: 2, Vs: '10.0', rows: [[0.00, 24.00, 24.00]], mean: 24.0, M: 0.120, Vn: 24.0 },
  ];
  PB[0].mean = r6((14.90 + 15.10 + 15.00) / 3);
  PB[0].M = r6(1 * 0.100 * 15.0 / 20.00); PB[1].M = r6(0.100 * 24.0 / (2 * 10.0));
  const LC = PHONE
    ? { data: rect(6, 6, 468, 244), chain: rect(6, 256, 468, 498), card: (i) => rect(14, 330 + i * 140, 452, 126) }
    : { data: rect(8, 8, 784, 218), chain: rect(8, 234, 784, 318), card: (i) => rect(20 + i * 258, 318, 238, 170) };
  const calcSolved = (i) => S.calc.stage[i] >= 2;
  function drawCalc() {
    const C = S.calc, p = PB[C.pi], st = C.stage[C.pi], D0 = LC.data;
    panel(D0.x, D0.y, D0.w, D0.h, 14);
    T(D0.x + 14, D0.y + 24, '📋 ' + (C.pi === 0 ? '적정 기록표 (한 학생의 모범 자료)' : '2가 산의 적정 자료'), 14.5, INK, 'left', 800);
    const cols = [D0.x + 18, D0.x + D0.w * 0.2, D0.x + D0.w * 0.4, D0.x + D0.w * 0.62];
    ['회차', '처음 눈금(mL)', '나중 눈금(mL)', '사용한 부피(mL)'].forEach((s, i) => T(cols[i], D0.y + 54, s, PHONE ? 11.5 : 13, MUTED, 'left', 800));
    let y = D0.y + 82;
    const rowsDraw = [];
    if (p.rough) rowsDraw.push({ n: '대략', r: p.rough, ex: true });
    p.rows.forEach((r, i) => rowsDraw.push({ n: p.rows.length > 1 ? '정밀 ' + (i + 1) : '1회', r }));
    rowsDraw.forEach((row) => {
      T(cols[0], y, row.n, 14, row.ex ? MUTED : INK, 'left', 800);
      T(cols[1], y, row.r[0].toFixed(2), 14, row.ex ? MUTED : INK, 'left', 800); T(cols[2], y, row.r[1].toFixed(2), 14, row.ex ? MUTED : INK, 'left', 800);
      T(cols[3], y, row.r[2].toFixed(2) + (row.ex ? ' (평균 제외)' : ''), 14, row.ex ? MUTED : '#0b6b39', 'left', 800);
      y += PHONE ? 26 : 28;
    });
    if (C.pi === 0) T(D0.x + 18, y + 8, '평균에는 대략 적정 값을 넣지 않아요. (표의 사용한 부피 = 나중 − 처음)', PHONE ? 12 : 13, MUTED, 'left', 700);
    else T(D0.x + 18, y + 8, '시료 H₂SO₄ 10.0 mL, 표준 용액 0.100 M NaOH', PHONE ? 12 : 13, MUTED, 'left', 700);
    // 식 카드
    const Ch = LC.chain; panel(Ch.x, Ch.y, Ch.w, Ch.h, 14);
    T(Ch.x + 14, Ch.y + 24, '🧮 a M V = b M′ V′  (a = 산의 H⁺ 수, b = 염기의 OH⁻ 수)', PHONE ? 13 : 14.5, INK, 'left', 800);
    const eqv = st >= 1 || C.pi === 1 && st >= 1;
    const vTxt = C.pi === 0 ? (st >= 1 ? fx(p.mean, 1) : '?') : p.Vn.toFixed(1);
    const aTxt = C.pi === 0 ? '1' : (st >= 1 ? '2' : '?');
    const mTxt = st >= 2 ? fx(p.M, 4) : 'M';
    T(Ch.x + Ch.w / 2, Ch.y + 52, aTxt + ' × ' + mTxt + ' × ' + p.Vs + ' mL  =  1 × 0.100 × ' + vTxt + ' mL', PHONE ? 15 : 19, VIO, 'center', 800);
    const titles = C.pi === 0 ? ['① 평균 NaOH 부피', '② 몰수 비교 식', '③ HCl 농도 M'] : ['① H⁺ 수 a', '② 몰수 비교 식', '③ H₂SO₄ 농도 M'];
    const lines = C.pi === 0
      ? [['(14.90 + 15.10 + 15.00) ÷ 3', '= ' + (st >= 1 ? fx(p.mean, 1) : '?') + ' mL'], ['1 × M × 20.00 = 1 × 0.100 × V′', 'V′ = ' + (st >= 1 ? fx(p.mean, 1) : '?') + ' mL'], ['M = 0.100 × ' + (st >= 1 ? fx(p.mean, 1) : '15.0') + ' ÷ 20.00', '= ' + (st >= 2 ? fx(p.M, 4) : '?') + ' M']]
      : [['H₂SO₄ 1개가 내놓는 H⁺', '= ' + (st >= 1 ? '2' : '?') + '개'], ['a × M × 10.0 = 1 × 0.100 × 24.0', (st >= 1 ? '2' : 'a') + ' × M × 10.0 = 2.40'], ['M = 0.100 × 24.0 ÷ (' + (st >= 1 ? '2' : 'a') + ' × 10.0)', '= ' + (st >= 2 ? fx(p.M, 3) : '?') + ' M']];
    for (let i = 0; i < 3; i++) {
      const r = LC.card(i), done = i < st || (i === 1 && st >= 1) && false, filled = i === 0 ? st >= 1 : i === 1 ? st >= 1 : st >= 2, act = !filled && (i === 0 ? st === 0 : i === 2 ? st === 1 : false);
      if (i < 2) { const r2_ = LC.card(i + 1); if (PHONE) D.arrow(r.x + r.w / 2, r.y + r.h + 1, r2_.x + r2_.w / 2, r2_.y - 1, { color: '#b7bdd0', width: 3, head: 9 }); else D.arrow(r.x + r.w + 2, r.y + r.h / 2, r2_.x - 2, r.y + r.h / 2, { color: '#b7bdd0', width: 3, head: 9 }); }
      D.shadow(() => { D.roundRect(r.x, r.y, r.w, r.h, 12); ctx.fillStyle = filled ? '#eefbf3' : '#fff'; ctx.fill(); }, { blur: 6, y: 2 });
      ctx.strokeStyle = filled ? GOOD : act ? VIO : '#d5d9e6'; ctx.lineWidth = act ? 3 : 2; D.roundRect(r.x, r.y, r.w, r.h, 12); ctx.stroke();
      if (act) { const k = (S.t * 1.2) % 1; ctx.save(); ctx.strokeStyle = CO.rgba(VIO, 0.5 * (1 - k)); ctx.lineWidth = 3; D.roundRect(r.x - k * 7, r.y - k * 7, r.w + k * 14, r.h + k * 14, 12 + k * 7); ctx.stroke(); ctx.restore(); }
      T(r.x + 14, r.y + 28, titles[i], PHONE ? 15 : 15.5, filled ? '#0b6b39' : act ? '#5b21b6' : MUTED, 'left', 800);
      lines[i].forEach((ln, k) => T(r.x + 14, r.y + (PHONE ? 62 : 70) + k * (PHONE ? 30 : 36), ln, PHONE ? 14 : 15, k === 1 ? (filled ? '#0b6b39' : MUTED) : INK, 'left', 800));
      const pop = C.pop[i].v; if (pop > 0.01) D.glow(r.x + r.w / 2, r.y + r.h / 2, 60 * pop, '#14a058', 0.35 * (1 - pop * 0.5));
    }
    if (calcSolved(C.pi)) D.label(Ch.x + Ch.w / 2, Ch.y + Ch.h - 22, C.pi === 0 ? '✅ 미지 HCl의 농도 = ' + fx(p.M, 4) + ' M' : '✅ 미지 H₂SO₄의 농도 = ' + fx(p.M, 3) + ' M', { bg: GOOD, size: 14, pad: 10 });
  }
  function refreshCalc() {
    const C = S.calc, p = PB[C.pi], st = C.stage[C.pi];
    let h = '', unit = '';
    if (C.pi === 0) {
      if (st === 0) { h = '<span class="k">① 평균 부피</span><br>세 번 사용한 NaOH 부피 14.90, 15.10, 15.00 mL의 평균은?'; unit = 'mL'; }
      else if (st === 1) { h = '<span class="k">② ③ 농도 구하기</span><br>1 × M × 20.00 = 1 × 0.100 × ' + fx(p.mean, 1) + '에서 HCl의 농도 M은?'; unit = 'M'; }
      else h = '<div class="calc-done">🎉 HCl 20.00 mL를 중화하는 데 0.100 M NaOH가 평균 ' + fx(p.mean, 1) + ' mL 들었으니 M = <b>' + fx(p.M, 4) + ' M</b></div>';
    } else {
      if (st === 0) { h = '<span class="k">① H⁺ 수 a</span><br>H₂SO₄ 1개는 물에서 H⁺를 몇 개 내놓을까요?'; unit = '개'; }
      else if (st === 1) { h = '<span class="k">② ③ 농도 구하기</span><br>2 × M × 10.0 = 1 × 0.100 × 24.0에서 H₂SO₄의 농도 M은?'; unit = 'M'; }
      else h = '<div class="calc-done">🎉 H₂SO₄ 10.0 mL를 중화하는 데 NaOH 24.0 mL가 들었으니 M = <b>' + fx(p.M, 3) + ' M</b></div>';
    }
    $('#cPrompt').innerHTML = h; $('#cUnit').textContent = unit; $('#cRow').style.display = st < 2 ? '' : 'none';
    $('#bCalc').disabled = st >= 2; $('#cIn').disabled = st >= 2; $('#cIn').value = '';
    $('#cNote').textContent = st < 2 ? '답을 쓰고 ✔ 확인을 눌러요.' : '다른 시료도 풀어 볼까요?';
  }
  function checkCalc() {
    const C = S.calc, pi = C.pi, p = PB[pi], st = C.stage[pi]; if (st >= 2) return;
    const v = parseNum($('#cIn').value), want = pi === 0 ? (st === 0 ? p.mean : p.M) : (st === 0 ? 2 : p.M);
    if (isNaN(v)) { Sound.fail(); showHint('답을 숫자로 써 주세요.', 2600); return; }
    if (near(v, want, 0.02, 0)) {
      C.stage[pi]++; Sound.success(); const r = LC.card(C.stage[pi] === 1 ? 0 : 2); C.pop[C.stage[pi] === 1 ? 0 : 2].v = 1; tw(C.pop[C.stage[pi] === 1 ? 0 : 2], { v: 0 }, { duration: 0.9 });
      parts.burst(r.x + r.w / 2, r.y + r.h / 2, { count: 12, speed: 110, size: 3, colors: ['#8b5cf6', '#14a058', '#ffb400'] });
      refreshCalc(); updateCtl();
    } else {
      C.wrong[pi]++; Sound.fail(); shakeEl($('#cIn'));
      let m = '';
      if (pi === 0 && st === 0) m = near(v, 45.0, 0.02, 0) ? '합이에요. 3회로 나누어 평균을 구해요.' : '세 값을 더해 3으로 나누어요. (14.90 + 15.10 + 15.00) ÷ 3';
      else if (pi === 0) m = near(v, r6(0.100 * 20 / p.mean), 0.03, 0) ? 'V와 V′의 자리를 바꿨어요. 시료는 20.00 mL, NaOH는 평균 부피예요.' : 'M × 20.00 = 0.100 × ' + fx(p.mean, 1) + '에서 M = 0.100 × ' + fx(p.mean, 1) + ' ÷ 20.00이에요.';
      else if (st === 0) m = v === 1 ? 'H₂SO₄ → 2H⁺ + SO₄²⁻이에요. 한 개가 H⁺를 두 개 내놓아요.' : 'H₂SO₄의 화학식에서 H의 개수를 보세요.';
      else m = near(v, 0.060, 0.03, 0) ? 'H⁺가 2개씩이라는 것(a = 2)을 곱하지 않았어요. 산 쪽에 2를 곱해요.' : near(v, 0.240, 0.03, 0) ? '2는 산 쪽(H₂SO₄)에 곱해요. M = 0.100 × 24.0 ÷ (2 × 10.0)이에요.' : '2 × M × 10.0 = 1 × 0.100 × 24.0에서 M을 구해요.';
      showHint(m, 5200);
    }
  }
  $('#bCalc').addEventListener('click', checkCalc);
  $('#cIn').addEventListener('keydown', (e) => { if (e.key === 'Enter') checkCalc(); });
  $('#cIn').addEventListener('input', () => $('#cIn').classList.remove('bad'));

  /* =========================================================
     ④ 오차 평가 scene
     ========================================================= */
  const ERR = [
    { t: '종말점을 지나쳐 NaOH를 너무 많이 넣었다', ans: 'up', why: '넣은 NaOH 부피 V′가 실제 종말점 부피보다 커서 계산한 농도가 높게 나와요.', fb: '실제보다 NaOH가 더 많이 들어간 것으로 계산하게 돼요. 많이 들어가면 농도가 어떻게 나올까요?' },
    { t: '뷰렛 끝의 공기 방울이 적정 중에 빠졌다', ans: 'up', why: '방울이 빠진 만큼 눈금은 더 내려가지만 그만큼은 용액이 아니에요. 읽은 부피가 실제보다 커서 높게 나와요.', fb: '공기 방울이 빠지면 눈금이 더 많이 내려가요. 읽은 NaOH 부피가 실제보다 어떻게 되나요?' },
    { t: '피펫을 물로 헹구고 그대로 시료를 취했다', ans: 'down', why: '피펫 속 물 때문에 시료가 묽어져 H⁺ 몰수가 줄고 NaOH가 적게 들어 낮게 나와요.', fb: '물이 시료를 묽게 만들어요. 그러면 H⁺ 몰수와 필요한 NaOH 부피가 어떻게 되나요?' },
    { t: '삼각 플라스크가 물에 젖어 있었다', ans: 'none', why: '플라스크 속 물은 시료의 H⁺ 몰수를 바꾸지 않아요. 종말점 부피는 그대로예요.', fb: '플라스크 안의 물은 시료의 H⁺ 몰수를 바꾸지 않아요. 적정에 든 NaOH 부피가 달라질까요?' },
  ];
  const LE = PHONE
    ? { card: (i) => rect(6, 6 + i * 130, 468, 124), res: rect(6, 530, 468, 224) }
    : { card: (i) => rect(8 + (i % 2) * 396, 8 + Math.floor(i / 2) * 198, 388, 192), res: rect(8, 410, 784, 142) };
  const VERD = { up: ['높게 ↑', BAD], down: ['낮게 ↓', BLU], none: ['영향 없음 =', '#6b7280'] };
  const eCalcOK = () => near(parseNum(S.err.calc), r6(0.100 * 15.4 / 20.00), 0.01, 0);
  const errOK = (i) => S.err.sel[i] === ERR[i].ans;
  function errIcon(i, cx, cy) {
    ctx.save(); ctx.translate(cx, cy); if (PHONE) ctx.scale(0.72, 0.72);
    if (i === 0) { D.flask(0, 44, 76, 76, { level: 0.5, liquid: CO.mix('#cfe8f7', PINK, 0.85), t: S.t }); D.label(0, -46, '15.40 mL', { bg: '#475569', size: 12, pad: 7 }); D.arrow(0, -34, 0, -6, { color: IC.OH, width: 3, head: 8 }); }
    else if (i === 1) {
      const w = 22; ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 2.5; ctx.fillStyle = 'rgba(169,200,255,.8)';
      D.roundRect(-w / 2, -50, w, 80, 6); ctx.fill(); ctx.stroke();
      D.sphere(0, 20, 8, '#ffffff', { gloss: false, outline: '#8fa3bd', outlineWidth: 1.6 });
      ctx.fillStyle = '#9ca3af'; ctx.beginPath(); ctx.moveTo(-4, 30); ctx.lineTo(4, 30); ctx.lineTo(1.5, 52); ctx.lineTo(-1.5, 52); ctx.closePath(); ctx.fill();
      D.label(0, -64, '공기 방울', { bg: '#475569', size: 11.5, pad: 6 });
    } else if (i === 2) { pipetteIcon(0, -56, 112, true); [[-20, 18], [22, 4], [-24, -10]].forEach(([x, y]) => D.sphere(x, y, 5, '#7cc4ff', { gloss: true })); D.label(0, 64, '물방울', { bg: '#0ea5e9', size: 11.5, pad: 6 }); }
    else { D.flask(0, 44, 76, 76, { level: 0, liquid: '#cfe8f7', t: S.t }); [[-18, 28], [-12, 12], [16, 22], [20, 6], [-6, 36]].forEach(([x, y]) => D.sphere(x, y, 3.4, '#7cc4ff', { gloss: false })); D.label(0, -46, '물에 젖음', { bg: '#0ea5e9', size: 11.5, pad: 6 }); }
    ctx.restore();
  }
  function drawErr() {
    ERR.forEach((e, i) => {
      const r = LE.card(i), v = S.err.sel[i], ok = errOK(i);
      panel(r.x, r.y, r.w, r.h, 14);
      ctx.strokeStyle = ok ? GOOD : '#d5d9e6'; ctx.lineWidth = ok ? 3 : 1.5; D.roundRect(r.x, r.y, r.w, r.h, 14); ctx.stroke();
      D.sphere(r.x + 20, r.y + 20, 13, VIO, { gloss: true, text: String(i + 1) });
      errIcon(i, r.x + (PHONE ? 62 : 80), r.y + (PHONE ? 66 : 88));
      const tx = r.x + (PHONE ? 118 : 160);
      const tw_ = r.x + r.w - tx - 12;
      const th = textBlock(tx, r.y + (PHONE ? 36 : 44), tw_, e.t, PHONE ? 13.5 : 15, INK, PHONE ? 18 : 20, 800);
      if (ok && !PHONE) textBlock(tx, r.y + 44 + th + 8, tw_, e.why, 12, '#0b6b39', 16, 700);
      if (v) D.label(tx, r.y + r.h - (PHONE ? 18 : 20), '결과: ' + VERD[v][0], { bg: ok ? VERD[v][1] : '#9aa3b5', size: PHONE ? 13 : 14, align: 'left', pad: 9 });
      else T(tx, r.y + r.h - (PHONE ? 14 : 16), '영향을 골라요 →', PHONE ? 12 : 13, MUTED, 'left', 700);
    });
    const R = LE.res; panel(R.x, R.y, R.w, R.h, 14);
    T(R.x + 14, R.y + 24, '🧮 종말점을 지나쳐 NaOH 15.4 mL가 들어갔다면', PHONE ? 13 : 14.5, INK, 'left', 800);
    const ok = eCalcOK(), val = r6(0.100 * 15.4 / 20.00);
    const bx = R.x + (PHONE ? 90 : 130), bw = R.w - (PHONE ? 110 : 160), sc = 0.1;
    [['참값', TRUE_M, '#14a058'], ['내 계산', val, BAD]].forEach((b, i) => {
      const y = R.y + (PHONE ? 58 : 46) + i * (PHONE ? 52 : 38), w = (ok || i === 0 ? b[1] / sc : 0) * bw;
      T(bx - 10, y + 17, b[0], 13.5, INK, 'right', 800);
      ctx.save(); ctx.strokeStyle = '#d5d9e6'; ctx.setLineDash([4, 4]); D.roundRect(bx, y, bw, 24, 6); ctx.stroke(); ctx.restore();
      if (i === 0 || ok) { const grow = i === 1 ? S.err.bar.v : 1; if (w * grow > 0.5) { D.roundRect(bx, y, w * grow, 24, 6); ctx.fillStyle = b[2]; ctx.fill(); } }
      T(bx + (i === 0 || ok ? b[1] / sc * bw : 0) + 8, y + 18, i === 0 || ok ? b[1].toFixed(4) + ' M' : '?', 13.5, i === 1 ? BAD : INK, 'left', 800);
    });
    textBlock(R.x + 14, R.y + (PHONE ? 176 : 126), R.w - 28, ok ? '높게 나왔어요 (0.0770 > 0.0750). 3회 반복해 평균을 내고 종말점을 지나친 회는 빼야 해요.' : '가운데 조작판의 칸에 M = 0.100 × 15.4 ÷ 20.00 의 값을 써 보세요.', PHONE ? 12.5 : 13.5, ok ? '#0b6b39' : MUTED, 18, 700);
  }

  /* ---------- 컨트롤 · 장면 전환 ---------- */
  function setScene(mode) {
    if (S.mode !== mode) { S.fade = 1; parts.clear(); tStopFlow(); }
    S.mode = mode; $('#tbLabel').textContent = MODE_LABEL[mode];
    if (mode === 'titr') tSet(CFG_B);
    updateCtl();
  }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.mode); }));
  function updateCtl() {
    $$('#ctrlCard [data-modes]').forEach((n) => {
      let on = n.getAttribute('data-modes').split(' ').indexOf(S.mode) >= 0;
      if (on && n.hasAttribute('data-gate')) on = S.gate === n.getAttribute('data-gate');
      if (on && n.hasAttribute('data-gate-off')) on = S.gate !== n.getAttribute('data-gate-off');
      n.hidden = !on;
    });
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    refreshChips(el('pbChips'), S.calc.pi, (i) => calcSolved(i));
    tCtlKey = '';
    ['eS0', 'eS1', 'eS2', 'eS3'].forEach((id, i) => { el(id).value = S.err.sel[i]; });
  }
  $('#bToolsClear').addEventListener('click', () => { Sound.click(); S.tools.map = [-1, -1, -1, -1]; S.tools.sel = null; });
  $('#bOrderClear').addEventListener('click', () => { Sound.click(); S.order.picks = []; S.order.done = false; });
  chipsTo(el('pbChips'), ['HCl (1가 산)', 'H₂SO₄ (2가 산)'], 0, (i) => { S.calc.pi = i; refreshCalc(); updateCtl(); }, (i) => calcSolved(i));
  ['eS0', 'eS1', 'eS2', 'eS3'].forEach((id, i) => el(id).addEventListener('change', () => { S.err.sel[i] = el(id).value; el(id).classList.remove('bad', 'ok'); Sound.click(); }));
  el('eCalc').addEventListener('input', () => { S.err.calc = el('eCalc').value; el('eCalc').classList.remove('bad'); if (eCalcOK()) tw(S.err.bar, { v: 1 }, { duration: 0.8, ease: 'outCubic' }); else { S.err.bar.v = 0; } });
  bindTitr();
  SciSim.pointer(view, {
    down(p) { if (S.mode === 'tools') toolsDown(p); else if (S.mode === 'order') orderDown(p); return false; },
    hover(p) {
      if (S.mode === 'tools') { for (let i = 0; i < 4; i++) if (inR(p, LT.t(i)) || inR(p, LT.n(i))) return 'pointer'; }
      if (S.mode === 'order') { for (let k = 0; k < 7; k++) if (inR(p, LO.c(k))) return 'pointer'; }
      return 'default';
    },
  });

  /* ---------- 읽음 칸 ---------- */
  function readouts() {
    if (S.mode === 'tools') { const n = S.tools.map.filter((m) => m >= 0).length; setRO(1, '짝지은 도구', n + ' / 4'); setRO(2, '핵심', '뷰렛 · 피펫'); setRO(3, '표준 용액', '0.100 M NaOH'); }
    else if (S.mode === 'order') { setRO(1, '정한 순서', S.order.picks.length + ' / 7'); setRO(2, '핵심', '대략 → 정밀'); setRO(3, '반복', '정밀 적정 3회'); }
    else if (S.mode === 'titr') {
      const R = tRuns(), m = tMean();
      setRO(1, '뷰렛 눈금', r2(TT.start + tV()).toFixed(2) + ' mL'); setRO(2, '넣은 NaOH', tV().toFixed(2) + ' mL');
      setRO(3, '기록', R.rough ? '대략 ' + R.rough.used.toFixed(2) + ' · 평균 ' + (isNaN(m) ? '?' : m.toFixed(2)) : '대략 적정 전');
    } else if (S.mode === 'calc') {
      const C = S.calc, p = PB[C.pi]; setRO(1, '시료', p.name + ' ' + p.Vs + ' mL'); setRO(2, 'NaOH 부피', C.stage[C.pi] >= 1 || C.pi === 1 ? fx(p.Vn || p.mean, 1) + ' mL' : '? mL'); setRO(3, '구한 농도', calcSolved(C.pi) ? fx(p.M, C.pi === 0 ? 4 : 3) + ' M' : '?');
    } else {
      const n = ERR.filter((e, i) => errOK(i)).length; setRO(1, '맞게 분류', n + ' / 4'); setRO(2, '참값', '0.0750 M'); setRO(3, '15.4 mL일 때', eCalcOK() ? '0.0770 M (높게)' : '?');
    }
  }

  /* ================= 미션 ================= */
  const levels = [
    {
      title: '적정 계획: 도구와 순서', short: '적정 계획', icon: '📝', phase: '예측',
      intro: '<p class="si-q">❓ 탐구 질문: 병 속 염산의 농도를 열어 보지 않고 어떻게 알 수 있을까?</p>' +
        '<div class="si-link">🔗 <b>앞 차시(중화 반응의 양적 관계)에서</b> H⁺ 몰수 = OH⁻ 몰수일 때 완전 중화되고 a M V = b M′ V′가 성립하는 것을 배웠어요. 이 식을 거꾸로 쓰면, 농도를 아는 용액을 넣어 중화시킬 때의 부피로 <b>모르는 용액의 농도</b>를 구할 수 있어요.</div>' +
        '<p>이것이 <b>중화 적정</b>이에요. 농도를 아는 NaOH <b>표준 용액</b>을 뷰렛으로 조금씩 넣어 H⁺ 몰수 = OH⁻ 몰수가 되는 순간(<b>종말점</b>)을 지시약의 색 변화로 찾아요. (pH–부피 그래프인 적정 곡선은 다루지 않아요.)</p>' +
        '<p>⚠️ 보안경 · 장갑을 끼고 산 · 염기가 피부에 닿으면 바로 물로 씻어요. 실험 뒤 폐액은 폐수 처리 기준에 따라 처리해요.</p>',
      features: ['tools', 'order'],
      setup() { S.gate = ''; setScene('tools'); },
      recap: '중화 적정은 농도를 아는 표준 용액을 뷰렛으로 넣어 종말점의 부피를 구하고 a M V = b M′ V′로 미지 농도를 알아내는 실험이에요.',
      summary: '<ul><li><b>중화 적정</b>: 표준 용액(0.100 M NaOH)을 뷰렛으로 넣어 시료(HCl 20.00 mL)와 H⁺ 몰수 = OH⁻ 몰수가 되는 <b>종말점</b>을 찾아요.</li><li>도구: 뷰렛(표준 용액, 넣은 부피 읽기), 피펫(시료 부피 정확히 취하기), 삼각 플라스크, 스탠드</li><li>순서: 헹굼 → 표준 용액 채움 → 시료 취함 → 지시약 → 대략 적정 → 정밀 적정 3회 → 계산</li><li>뷰렛과 피펫은 사용할 용액으로 헹궈요.</li></ul>',
      missions: [
        {
          title: '도구 이름 짝짓기', manual: true,
          goal: '그림 ①~④의 도구와 이름을 짝지은 뒤 <b>✔ 확인하기</b>를 누르세요. (그림을 누르고 이름을 눌러요.)',
          hint: '눈금이 새겨진 긴 유리관은 뷰렛, 가운데가 볼록하고 위에 고무 기구가 달린 가는 관은 피펫이에요.',
          setup() { S.tools.map = [-1, -1, -1, -1]; S.tools.sel = null; S.tools.lastBad = null; setScene('tools'); },
          check() {
            const m = S.tools.map; if (m.some((v) => v < 0)) return '네 도구에 모두 이름을 짝지어요. (지금 ' + m.filter((v) => v >= 0).length + '개)';
            const bad = TOOLS.findIndex((t, i) => m[i] !== t.name);
            if (bad >= 0) { if (S.tools.lastBad !== bad) { S.tools.lastBad = bad; S.tools.shake = 0.6; setTimeout(() => { S.tools.shake = 0; }, 600); } const hints = { flask: '넓은 바닥에 좁은 목이 있는 유리 용기예요.', burette: '눈금이 있고 아래에 밸브(마개)가 달린 긴 유리관이에요.', pipette: '가운데가 볼록하고 위쪽에 고무 필러가 달린 가는 관이에요.', stand: '뷰렛을 고정하는 받침과 기둥이에요.' }; return (bad + 1) + '번 그림이 알맞지 않아요. ' + hints[TOOLS[bad].id]; }
            return true;
          },
          explain: '<b>뷰렛</b>은 표준 용액을 한 방울씩 넣고 넣은 부피를 읽고, <b>피펫</b>은 시료의 부피를 정확히 취해요. <b>삼각 플라스크</b>에 시료를 담아 흔들고, <b>스탠드</b>가 뷰렛을 수직으로 잡아 줘요.',
        },
        {
          title: '실험 순서 정하기', manual: true,
          goal: '카드 7장을 <b>먼저 할 일부터</b> 차례로 눌러 적정 실험 순서를 정한 뒤 <b>✔ 확인하기</b>를 누르세요.',
          hint: '용액을 준비(헹굼 → 채움 → 시료 → 지시약)하고, 적정(대략 → 정밀 3회)한 뒤, 마지막에 계산해요.',
          setup() { S.order.picks = []; S.order.done = false; S.order.lastBad = null; setScene('order'); },
          check() {
            const q = S.order.picks; if (q.length < 7) return '카드 7장을 모두 눌러 순서를 정해요. (지금 ' + q.length + '장)';
            for (let i = 0; i < 7; i++) if (q[i] !== i) { if (S.order.lastBad !== i) { S.order.lastBad = i; S.order.shake = 0.6; setTimeout(() => { S.order.shake = 0; }, 600); } return (i + 1) + '번째 순서가 알맞지 않아요. 흔들리는 카드를 다시 생각해 보세요.'; }
            S.order.done = true; return true;
          },
          explain: '시료와 표준 용액을 정확하게 준비한 뒤, <b>대략 적정</b>으로 종말점 부피를 알아 두고 <b>정밀 적정</b>을 3회 해서 평균을 내요. 마지막에 a M V = b M′ V′로 계산해요.',
        },
        {
          type: 'quiz', title: '뷰렛에는 표준 용액, 플라스크에는 시료',
          goal: '농도를 아는 NaOH를 뷰렛에 넣고, 농도를 모르는 HCl 시료는 피펫으로 정확히 취해 삼각 플라스크에 넣는 까닭은?',
          setup() { setScene('order'); },
          choices: ['a M V = b M′ V′에서 시료의 부피 V와 넣은 표준 용액의 부피 V′를 정확히 알아야 하기 때문이에요', '뷰렛이 피펫보다 값이 싸기 때문이에요', '삼각 플라스크가 산을 중화시켜 주기 때문이에요', '표준 용액은 시료보다 항상 더 진해야 하기 때문이에요'],
          answer: 0,
          feedback: ['', '값이 싼 도구를 고르는 것이 아니라 부피를 정확히 알 수 있는 도구를 고르는 거예요.', '플라스크는 용기일 뿐이에요. 중화는 H⁺와 OH⁻가 반응해서 일어나요.', '표준 용액의 농도는 꼭 시료보다 진할 필요가 없어요. 부피와 농도를 정확히 아는 것이 중요해요.'],
          explain: '시료의 부피 V는 <b>피펫</b>으로 정확히, 넣은 표준 용액의 부피 V′는 <b>뷰렛 눈금</b>으로 정확히 읽어요. 모르는 것은 시료의 농도 M 하나뿐이라 식에서 구할 수 있어요.',
        },
      ],
    },
    {
      title: '적정 조작: 종말점 찾기', short: '적정 조작', icon: '🧪', phase: '실험',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 도구와 순서를 계획했어요. 이제 가상 뷰렛으로 직접 적정해요. 시료는 농도를 모르는 HCl 20.00 mL, 뷰렛에는 0.100 M NaOH가 들어 있어요.</div>' +
        '<p>시료에 <b>페놀프탈레인</b>을 넣으면 산성에서는 무색이에요. 종말점을 지나 NaOH가 아주 조금 많아지면 <b>연한 붉은색</b>이 나타나고, <b>30초 동안 유지</b>되면 종말점이에요. (화면에서는 30초를 6배 빠르게 감아 보여 줘요.) 흰 종이 위에서 색을 확인해요.</p>' +
        '<p><b>대략 적정</b>(빠르게)으로 종말점의 대략적인 부피를 알아낸 뒤, <b>정밀 적정</b>은 그보다 1 mL 앞에서부터 한 방울(약 0.05 mL)씩 넣어요. 눈금은 확대 창에서 0.01 mL까지 읽어요.</p>',
      features: ['titr'],
      setup() { S.gate = ''; TT.runs = {}; setScene('titr'); tSet(CFG_B, true); },
      recap: '대략 적정으로 종말점 부피를 알아낸 뒤 정밀 적정을 3회 해요. 연한 붉은색이 30초 유지될 때가 종말점이고, 사용 부피 = 나중 눈금 − 처음 눈금이에요.',
      summary: '<ul><li>시료 HCl 20.00 mL + 페놀프탈레인(산성에서 무색) → 0.100 M NaOH 적정</li><li><b>종말점</b>: 연한 붉은색이 30초 유지될 때</li><li>대략 적정(빠르게) → 정밀 적정(종말점 1 mL 앞부터 한 방울씩) 3회</li><li>사용한 부피 = 나중 눈금 − 처음 눈금 (0.01 mL까지 읽기)</li><li>한 방울(약 0.05 mL)을 넘기면 결과가 커져요.</li></ul>',
      missions: [
        {
          title: '대략 적정하기',
          goal: '<b>🧪 시료 준비</b> 후 <b>⏬ 빠르게</b>를 누르고 있다가 색이 변하면 놓으세요. 연한 붉은색이 <b>30초 유지</b>되면 <b>📝 눈금 기록</b>을 누르세요.',
          hint: '⏬ 빠르게는 누르는 동안만 흘러요. 번지는 분홍색이 잘 사라지지 않기 시작하면 놓고, 💧 한 방울로 연한 붉은색을 만들어요. 너무 많이 넘으면 다시 해요.',
          setup() { setScene('titr'); },
          check: () => !!tRuns().rough,
          hold: 0.3,
          status: () => { const R = tRuns(); return mark(TT.ready) + ' 시료 준비 &nbsp; ' + mark(tE() > 1e-9 || !!R.rough) + ' 연한 붉은색 &nbsp; ' + mark(TT.timer >= 30 || !!R.rough) + ' 30초 유지 &nbsp; ' + mark(!!R.rough) + ' 눈금 기록'; },
          explain: '대략 적정은 종말점 부피를 <b>대충</b> 알아 두는 단계예요. 정밀 적정에서 이 값보다 1 mL 앞까지는 빠르게, 그다음부터는 한 방울씩 넣어 종말점을 정확히 찾아요.',
        },
        {
          title: '정밀 적정 3회',
          goal: '대략 적정 값보다 1 mL 앞까지는 빠르게, 그 뒤로는 <b>💧 천천히</b>나 <b>· 한 방울</b>로 넣어 종말점을 찾고 기록하세요. <b>3회</b> 반복해요.',
          hint: '종말점을 0.2 mL 넘게 지나치면 그 회는 쓸 수 없어요. 연한 붉은색이 처음 나타나는 한 방울에서 멈추고, 흔들기(🌀)로 색이 사라지는지 보며 30초 유지를 확인해요.',
          setup() { setScene('titr'); },
          check: () => tValid().length >= 3,
          hold: 0.4,
          status: () => { const n = tValid().length; return mark(n >= 1) + ' 1회 &nbsp; ' + mark(n >= 2) + ' 2회 &nbsp; ' + mark(n >= 3) + ' 3회'; },
          get explain() { const m = tMean(); return '정밀 적정 3회의 평균 사용 부피는 <b>' + (isNaN(m) ? '?' : m.toFixed(2)) + ' mL</b>예요. 한 방울(0.05 mL)을 넘기면 종말점 부피보다 조금 커져요. 같은 실험을 반복해 평균을 내면 우연한 오차가 줄어요.'; },
        },
        {
          type: 'quiz', title: '종말점에서의 색 변화',
          goal: '시료 HCl에 페놀프탈레인을 넣고 NaOH로 적정할 때, 종말점에서 나타나는 색 변화는?',
          setup() { setScene('titr'); },
          choices: ['노란색 → 초록색', '무색 → 연한 붉은색(30초 유지)', '붉은색 → 무색', '파란색 → 보라색'],
          answer: 1,
          feedback: ['노랑 → 초록은 BTB 용액의 색 변화예요. 이 실험의 지시약은 페놀프탈레인이에요.', '', '반대예요. 산성에서 무색이고 염기성이 되면 붉은색이에요.', '페놀프탈레인은 파란색이 되지 않아요.'],
          explain: '페놀프탈레인은 산성에서 <b>무색</b>이고, 염기성이 되면 붉은색을 띠어요. 종말점에서 NaOH가 한 방울 넘으면 <b>연한 붉은색</b>이 나타나 30초 동안 유지돼요.',
        },
      ],
    },
    {
      title: '농도 계산: a M V = b M′ V′', short: '농도 계산', icon: '🧮', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 적정으로 NaOH 사용 부피를 기록했어요. 이제 이 자료로 시료의 농도를 계산해요. 계산에는 한 학생의 <b>모범 기록</b>을 써요. (내 기록과 비슷한가요?)</div>' +
        '<p>① 정밀 적정 사용 부피의 평균을 구해요. (대략 적정은 제외) ② H⁺ 몰수 = OH⁻ 몰수이므로 <b>a M V = b M′ V′</b> ③ 모르는 농도 M을 구해요. a, b는 산이 내놓는 H⁺ 수, 염기가 내놓는 OH⁻ 수예요.</p>',
      features: ['calc'],
      setup() { S.gate = ''; S.calc.pi = 0; S.calc.stage = [0, 0]; S.calc.wrong = [0, 0]; setScene('calc'); refreshCalc(); },
      recap: '사용 부피의 평균을 구해 a M V = b M′ V′에 넣으면 미지 농도를 알 수 있어요. 2가 산이면 산 쪽에 2를 곱해요.',
      summary: '<ul><li>사용 부피 (14.90 + 15.10 + 15.00) ÷ 3 = <b>15.0 mL</b></li><li>1 × M × 20.00 = 1 × 0.100 × 15.0 → <b>M = 0.0750 M</b></li><li>H₂SO₄ 10.0 mL를 0.100 M NaOH 24.0 mL로 적정: 2 × M × 10.0 = 1 × 0.100 × 24.0 → <b>M = 0.120 M</b></li><li>산이 내놓는 H⁺ 수 a를 꼭 곱해요.</li></ul>',
      missions: [
        {
          title: '평균 부피와 HCl 농도',
          goal: '<b>HCl</b> 시료의 기록표로 <b>평균 NaOH 부피</b>와 <b>HCl의 몰 농도</b>를 차례로 구하세요.',
          hint: '평균 = (14.90 + 15.10 + 15.00) ÷ 3 = 15.0 mL예요. 1 × M × 20.00 = 1 × 0.100 × 15.0에서 M을 구해요.',
          setup() { S.calc.pi = 0; setScene('calc'); refreshCalc(); updateCtl(); },
          check: () => calcSolved(0), hold: 0.5,
          status: () => mark(S.calc.stage[0] >= 1) + ' ① 평균 부피 &nbsp; ' + mark(S.calc.stage[0] >= 2) + ' ③ 농도 M',
          get explain() { const m = tMean(); return '평균 (14.90 + 15.10 + 15.00) ÷ 3 = <b>15.0 mL</b>. 1 × M × 20.00 = 1 × 0.100 × 15.0 → M = 1.50 ÷ 20.00 = <b>0.0750 M</b>이에요.' + (isNaN(m) ? '' : ' (앞 단계에서 내가 잰 평균은 ' + m.toFixed(2) + ' mL였어요.)'); },
        },
        {
          title: '2가 산 H₂SO₄ 적정',
          goal: '<b>H₂SO₄ 10.0 mL</b>를 0.100 M NaOH <b>24.0 mL</b>로 적정했어요. H⁺ 수 a를 쓰고 H₂SO₄의 몰 농도를 구하세요.',
          hint: 'H₂SO₄ → 2H⁺ + SO₄²⁻이므로 a = 2예요. 2 × M × 10.0 = 1 × 0.100 × 24.0에서 M을 구해요.',
          setup() { S.calc.pi = 1; setScene('calc'); refreshCalc(); updateCtl(); },
          check: () => calcSolved(1), hold: 0.5,
          status: () => mark(S.calc.stage[1] >= 1) + ' ① H⁺ 수 a &nbsp; ' + mark(S.calc.stage[1] >= 2) + ' ③ 농도 M',
          explain: '2 × M × 10.0 = 1 × 0.100 × 24.0 → M = 2.40 ÷ 20.0 = <b>0.120 M</b>이에요. 2를 곱하지 않으면 0.240 M(2배)이 되고, 반대로 곱하면 값이 틀려요.',
        },
        {
          type: 'quiz', title: 'H₂SO₄ 식에 2를 곱하는 까닭',
          goal: 'H₂SO₄를 적정할 때 식 a M V = b M′ V′에서 산 쪽에 2를 곱하는 까닭은?',
          setup() { S.calc.pi = 1; setScene('calc'); updateCtl(); },
          choices: ['H₂SO₄ 1 mol이 H⁺ 2 mol을 내놓아 같은 몰 농도라도 H⁺ 몰수가 2배이기 때문이에요', 'H₂SO₄의 부피가 2배이기 때문이에요', 'NaOH가 OH⁻를 2개 내놓기 때문이에요', 'H₂SO₄가 약산이기 때문이에요'],
          answer: 0,
          feedback: ['', '부피는 문제에 10.0 mL로 주어졌어요. 곱하는 2는 H⁺의 개수예요.', 'NaOH는 OH⁻를 1개씩 내놓아요(b = 1).', 'H₂SO₄는 강산이에요. 약하고 강한 것과 상관없이 내놓는 H⁺ 수가 중요해요.'],
          explain: 'H₂SO₄ 0.120 M × 10.0 mL = 1.20 mmol인데 H⁺는 2개씩이라 <b>H⁺ 2.40 mmol</b>이에요. OH⁻ 0.100 × 24.0 = 2.40 mmol과 같아요.',
        },
      ],
    },
    {
      title: '오차 평가: 결과가 달라지는 까닭', short: '오차 평가', icon: '⚠️', phase: '확인',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 모범 자료로 농도를 계산했어요(참값 0.0750 M). 그런데 실험에서 실수를 하면 계산한 농도는 참값보다 커질까요, 작아질까요?</div>' +
        '<p>네 가지 실수 사례가 결과를 <b>높게</b> 또는 <b>낮게</b> 하는지, <b>영향이 없는지</b> 몰수의 관점으로 생각해 봐요. 시료의 H⁺ 몰수가 달라지는지, 읽은 NaOH 부피가 달라지는지 보면 돼요.</p>',
      features: ['err'],
      setup() { S.gate = ''; S.err.sel = ['', '', '', '']; S.err.calc = ''; S.err.bar.v = 0; el('eCalc').value = ''; setScene('err'); },
      recap: '종말점을 지나치거나 공기 방울이 빠지면 높게, 피펫을 물로 헹구면 낮게 나오고, 젖은 삼각 플라스크는 영향이 없어요. 반복해서 평균을 내면 우연 오차가 줄어요.',
      summary: '<ul><li>종말점을 지나침 → NaOH 부피가 커서 <b>높게</b> (15.4 mL → 0.100 × 15.4 ÷ 20.00 = 0.0770 M)</li><li>뷰렛 끝의 공기 방울이 빠짐 → 읽은 부피가 실제보다 커서 <b>높게</b></li><li>피펫을 물로 헹굼 → 시료가 묽어져 <b>낮게</b></li><li>삼각 플라스크가 젖음 → 시료의 몰수가 같아 <b>영향 없음</b></li><li>뷰렛 · 피펫은 사용할 용액으로 헹구고, 3회 반복해 평균을 내요.</li></ul>',
      missions: [
        {
          title: '영향 분류와 오차 계산', manual: true,
          goal: '네 가지 사례가 결과에 미치는 영향을 <b>높게 / 낮게 / 영향 없음</b>으로 고르고, NaOH 15.4 mL로 계산한 농도(M)도 쓴 뒤 <b>✔ 확인하기</b>를 누르세요.',
          hint: '계산에는 M = 0.100 × 15.4 ÷ 20.00을 써요. 영향은 시료의 H⁺ 몰수가 변하는지, 읽은 NaOH 부피가 변하는지로 따져요.',
          setup() { S.err.sel = ['', '', '', '']; S.err.calc = ''; S.err.bar.v = 0; S.err.lastBad = null; el('eCalc').value = ''; setScene('err'); },
          check() {
            const e = S.err; const un = e.sel.findIndex((v) => !v);
            if (un >= 0) return (un + 1) + '번 사례의 영향을 골라 주세요.';
            const bad = ERR.findIndex((x, i) => !errOK(i));
            if (bad >= 0) { if (S.err.lastBad !== bad) { S.err.lastBad = bad; shakeEl(el('eS' + bad)); } return (bad + 1) + '번 사례를 다시 생각해 보세요. ' + ERR[bad].fb; }
            if (!e.calc) return 'NaOH 15.4 mL로 계산한 농도(M)를 써요.';
            if (!eCalcOK()) { if (S.err.lastBad !== 'c') { S.err.lastBad = 'c'; shakeEl(el('eCalc')); } return 'M = 0.100 × 15.4 ÷ 20.00이에요. (시료 20.00 mL, a = b = 1)'; }
            return true;
          },
          explain: '<b>높게</b>: 종말점을 지나침(15.4 mL → 0.0770 M), 공기 방울이 빠짐. <b>낮게</b>: 피펫을 물로 헹굼. <b>영향 없음</b>: 젖은 삼각 플라스크. 같은 실험을 3회 반복해 평균을 내면 한 방울 정도의 우연한 차이를 줄일 수 있어요.',
        },
        {
          type: 'quiz', title: '젖은 삼각 플라스크는 왜 괜찮을까?',
          goal: '삼각 플라스크가 물에 젖어 있어도 적정 결과에 영향이 없는 까닭은?',
          setup() { setScene('err'); },
          choices: ['물이 NaOH와 반응해서 사라지기 때문이에요', '시료의 H⁺ 몰수는 그대로이고 종말점의 NaOH 부피도 그대로이기 때문이에요', '물이 시료의 농도를 높여 주기 때문이에요', '삼각 플라스크는 적정에 쓰이지 않기 때문이에요'],
          answer: 1,
          feedback: ['물은 적정 반응에 참여하지 않아요.', '', '물은 시료의 농도를 바꿀 뿐 H⁺ 몰수는 바꾸지 않아요. 중요한 것은 몰수예요.', '삼각 플라스크는 시료를 담는 중요한 도구예요.'],
          explain: '피펫이나 뷰렛이 젖으면 용액 속 몰수 자체가 달라지지만, 삼각 플라스크에 이미 넣은 시료의 <b>H⁺ 몰수는 불변</b>이라 필요한 NaOH 부피가 같아요. 그래서 뷰렛과 피펫만 사용할 용액으로 헹궈요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hc-titration', mount: '#game', badge: '적정 박사', homeHref: '../../index.html#hc',
    featureLabels: { tools: '🔧 도구 짝짓기', order: '🃏 실험 순서 카드', titr: '🧪 가상 뷰렛 · 눈금 확대 · 입자 모형', calc: '🧮 계산 카드', err: '⚠️ 오차 사례 카드' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  setScene(S.mode);
  let lastFree = false, lastMode = '';
  SciSim.loop((dt, t) => {
    S.t = t;
    if (S.gate && game && game.phase !== 'active') { S.gate = ''; updateCtl(); }
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.mode !== lastMode) { lastMode = S.mode; updateCtl(); }
    view.apply();
    ctx.fillStyle = BGC; ctx.fillRect(0, 0, VW, VH);
    if (S.mode === 'tools') drawTools();
    else if (S.mode === 'order') drawOrder();
    else if (S.mode === 'titr') { stepTitrB(dt); drawTitrB(); updateTitrCtl(); }
    else if (S.mode === 'calc') drawCalc();
    else drawErr();
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(244,241,251,' + S.fade * 0.85 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    readouts();
  });

  window.__sim = {
    S, TT, PB, ERR, VW, VH, LT, LO, LTI, LC, LE, boxT, tSet, tPrepare, tRecord, tV, tVeq, tE, tRuns, tValid, tMean, tAddDrops, stepTitr, setScene, checkCalc, refreshCalc, updateCtl,
    get game() { return game; },
    stepAll(sec) { const n = Math.ceil(sec / 0.02); for (let i = 0; i < n; i++) { S.t += 0.02; stepTitrB(0.02); parts.update(0.02); } },
  };

})();
