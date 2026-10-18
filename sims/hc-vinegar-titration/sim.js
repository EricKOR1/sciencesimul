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

  /* ===================== 식초 속 아세트산 함량 [12화학04-04] =====================
     ① 예측: 희석 계획(원액은 뷰렛 용량 초과 → 10배)  ② 실험: 희석 조작 + 적정
     ③ 분석: 함량 계산(희석 배수 보정)              ④ 확인: 결과 평가
     아세트산(CH₃COOH)은 1가 산으로 NaOH와 1 : 1로 반응한다는 사실만 써요. 약산의 pH · 이온화 상수 · 적정 곡선은 다루지 않아요. */
  const MODE_LABEL = { plan: '📝 희석 계획', prep: '🧫 희석 조작', titr: '🧪 적정', calc: '🧮 함량 계산', eval: '📊 결과 평가' };
  const MM_AC = 60;
  const SAMP = {
    A: { key: 'A', name: '식초 A', c0: 0.900, tint: '#efd9a0', data: [17.9, 18.0, 18.1] },
    B: { key: 'B', name: '식초 B (사과 식초)', c0: 0.750, tint: '#e2b24c', data: [14.9, 15.0, 15.1] },
  };
  Object.values(SAMP).forEach((s) => {
    s.mean = r6(s.data.reduce((a, b) => a + b, 0) / 3);
    s.cDil = r6(0.100 * s.mean / 20.00); s.cOrig = r6(s.cDil * 10); s.gL = r6(s.cOrig * MM_AC); s.g100 = r6(s.gL / 10);
    s.cDilTrue = r6(s.c0 / 10);
    s.cfg = { key: s.key, conc: s.cDilTrue, vol: 20.00, titrant: 0.100, base: CO.mix('#cfe8f7', s.tint, s.key === 'A' ? 0.22 : 0.45), titrantLabel: '0.100 M NaOH', flaskLabel: '희석 ' + s.name.split(' ')[0] + ' ' + s.key + ' 20.00 mL + 지시약' };
    s.cfg.flaskLabel = '희석 식초 ' + s.key + ' 20.00 mL + 지시약';
  });
  const S = {
    mode: 'plan', t: 0, fade: 0, gate: '', sample: 'A',
    plan: { stage: 0, pop: { v: 0 }, pip: '' },
    calc: { stage: { A: 0, B: 0 }, pop: [{ v: 0 }, { v: 0 }, { v: 0 }, { v: 0 }, { v: 0 }] },
    eval: { sel: ['', '', '', ''], more: '', diff: '', bars: { a: SPR(0, 70, 11), b: SPR(0, 70, 11) }, lastBad: null },
  };
  let game = null;
  const IC_H = ION['H+'].c;

  /* =========================================================
     ① 희석 계획 scene
     ========================================================= */
  const NEED_ML = r6(0.900 * 20.00 / 0.100);             // 180 mL
  const NMMOL = r6(0.900 * 20.00);                       // 18.0 mmol
  const PLAN_ROWS = [
    { f: 1, lab: '희석 안 함 (원액 20.00 mL)', pip: null },
    { f: 5, lab: '5배 (피펫 20.00 mL → 100 mL)', pip: '20' },
    { f: 10, lab: '10배 (피펫 10.00 mL → 100 mL)', pip: '10' },
    { f: 20, lab: '20배 (피펫 5.00 mL → 100 mL)', pip: '5' },
  ];
  PLAN_ROWS.forEach((r) => { r.ml = r6(NEED_ML / r.f); });
  const LP = PHONE
    ? { rx: rect(6, 6, 468, 124), left: rect(6, 136, 468, 312), right: rect(6, 454, 468, 300) }
    : { rx: rect(8, 8, 784, 84), left: rect(8, 100, 384, 452), right: rect(400, 100, 392, 452) };
  function drawPlan() {
    const P = S.plan, R0 = LP.rx;
    panel(R0.x, R0.y, R0.w, R0.h, 14);
    T(R0.x + 14, R0.y + 24, '식초 속 아세트산과 NaOH의 반응', 14, MUTED, 'left', 800);
    eqRowC(R0.x + R0.w / 2, R0.y + (PHONE ? 58 : 58), [{ t: 'CH₃COOH' }, { t: ' + ', c: MUTED }, { t: 'NaOH' }, { t: ' → ', c: VIO }, { t: 'CH₃COONa' }, { t: ' + ', c: MUTED }, { t: 'H₂O' }], PHONE ? 18 : 24);
    D.label(R0.x + R0.w - 12, R0.y + 24, '몰수비 1 : 1', { bg: VIO, size: 13, align: 'right', pad: 9 });
    textBlock(R0.x + 14, R0.y + R0.h - (PHONE ? 38 : 12), R0.w - 28, '아세트산은 1가 산이에요. (약산이라는 이름만 알아 두고, 약산의 pH는 계산하지 않아요.)', PHONE ? 12 : 13, MUTED, 17, 700);
    // 원액 계산
    const L = LP.left; panel(L.x, L.y, L.w, L.h, 14);
    T(L.x + 14, L.y + 24, '식초 A 원액 20.00 mL를 바로 적정하면?', PHONE ? 13.5 : 14.5, INK, 'left', 800);
    const s1 = P.stage >= 1, s2 = P.stage >= 2;
    const lines = [['식초 A 원액 속 아세트산', '0.900 M (= 54.0 g/L 로 가정)'], ['아세트산 몰수', '0.900 M × 20.00 mL = ' + (s1 ? fx(NMMOL, 1) + ' mmol' : '? mmol')], ['필요한 NaOH (0.100 M)', fx(NMMOL, 1) + ' mmol ÷ 0.100 M = ' + (s2 ? fx(NEED_ML, 0) + ' mL' : '? mL')]];
    lines.forEach((ln, i) => { const y = L.y + 56 + i * (PHONE ? 46 : 54); T(L.x + 16, y, ln[0], PHONE ? 12.5 : 13.5, MUTED, 'left', 800); T(L.x + 16, y + 22, ln[1], PHONE ? 14.5 : 16, i === 2 && s2 ? BAD : INK, 'left', 800); });
    // 뷰렛 용량 막대 (0 ~ 200 mL)
    const bx = L.x + 20, bw = L.w - 40, by = L.y + (PHONE ? 214 : L.h - 150), sc = 200;
    T(bx, by - 18, '필요한 NaOH 부피와 뷰렛 용량(50 mL) 비교', PHONE ? 12.5 : 13.5, INK, 'left', 800);
    D.roundRect(bx, by, bw, 28, 8); ctx.fillStyle = '#eef0f6'; ctx.fill();
    const cap = bw * 50 / sc;
    D.roundRect(bx, by, cap, 28, 8); ctx.fillStyle = '#cfe8d8'; ctx.fill();
    if (s2) { const w = bw * NEED_ML / sc; D.roundRect(bx, by, w, 28, 8); ctx.fillStyle = BAD; ctx.globalAlpha = 0.85; ctx.fill(); ctx.globalAlpha = 1; }
    ctx.strokeStyle = GOOD; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(bx + cap, by - 6); ctx.lineTo(bx + cap, by + 34); ctx.stroke();
    T(bx + cap + 6, by + 62, '▲ 뷰렛 50 mL', 12.5, '#0b6b39', 'left', 800);
    [0, 50, 100, 150, 200].forEach((v) => T(bx + bw * v / sc, by + 44, v + '', 11.5, MUTED, 'center', 700));
    if (s2) D.label(bx + Math.min(bw - 40, bw * NEED_ML / sc), by + 14, fx(NEED_ML, 0) + ' mL!', { bg: BAD, size: 13, pad: 8 });
    else T(bx + 4, by + 19, '아직 계산 전', 13, MUTED, 'left', 800);
    if (s2) textBlock(L.x + 16, by + 84, L.w - 32, '뷰렛 용량 50 mL를 훨씬 넘어요! 그래서 식초를 묽혀서 적정해요.', PHONE ? 12.5 : 14, BAD, 19, 800);
    // 희석 계획
    const Rr = LP.right; panel(Rr.x, Rr.y, Rr.w, Rr.h, 14);
    T(Rr.x + 14, Rr.y + 24, '희석하면 NaOH가 얼마나 들까? (희석 식초 20.00 mL)', PHONE ? 13 : 14.5, INK, 'left', 800);
    const gx = Rr.x + 16, gw = Rr.w - 32, gy = Rr.y + 56, rowH = PHONE ? 54 : 62;
    T(gx, gy - 6, '※ 알맞은 범위: 뷰렛 눈금의 절반 안팎 15 ~ 25 mL', PHONE ? 11.5 : 12.5, '#0b6b39', 'left', 800);
    if (s2) { const bw2 = gw - 70, x50 = gx + bw2 * 50 / 200; ctx.save(); ctx.strokeStyle = GOOD; ctx.lineWidth = 2.5; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(x50, gy + 10); ctx.lineTo(x50, gy + 14 + 4 * rowH - 10); ctx.stroke(); ctx.restore(); T(x50 + 4, gy + 14 + 4 * rowH - 2, '뷰렛 50 mL', 11.5, '#0b6b39', 'left', 800); }
    PLAN_ROWS.forEach((r, i) => {
      const y = gy + 14 + i * rowH, tx = gx, bw2 = gw - 70, w = s2 ? bw2 * clamp(r.ml / 200, 0, 1) : 0;
      const sel = r.pip && P.pip === r.pip;
      ctx.save(); if (sel) { D.roundRect(gx - 6, y - 4, gw + 12, rowH - 4, 10); ctx.fillStyle = '#f3efff'; ctx.fill(); ctx.strokeStyle = VIO; ctx.lineWidth = 2.5; ctx.stroke(); } ctx.restore();
      T(tx, y + 12, r.lab, PHONE ? 12 : 13, INK, 'left', 800);
      D.roundRect(gx, y + 20, bw2, 20, 6); ctx.fillStyle = '#eef0f6'; ctx.fill();
      // 알맞은 범위 띠
      ctx.fillStyle = 'rgba(20,160,88,.18)'; ctx.fillRect(gx + bw2 * 15 / 200, y + 20, bw2 * 10 / 200, 20);
      if (s2 && w > 0.5) { const inRange = r.ml >= 15 && r.ml <= 25; D.roundRect(gx, y + 20, w, 20, 6); ctx.fillStyle = r.ml > 50 ? BAD : inRange ? GOOD : '#f59e0b'; ctx.fill(); }
      T(gx + bw2 + 8, y + 36, s2 ? fx(r.ml, 0) + ' mL' : '?', 13.5, INK, 'left', 800);
    });
    if (!s2) T(Rr.x + Rr.w / 2, Rr.y + Rr.h / 2 + 6, '먼저 왼쪽의 계산을 끝내요', 14, MUTED, 'center', 800);
    // 선택한 홀피펫 결과
    if (s2 && P.pip) { const r = PLAN_ROWS.find((q) => q.pip === P.pip); T(Rr.x + 14, Rr.y + Rr.h - 14, '선택: 피펫 ' + P.pip + '.00 mL → ' + r.f + '배 → NaOH ' + fx(r.ml, 0) + ' mL', PHONE ? 12.5 : 13.5, VIO, 'left', 800); }
  }
  function eqRowC(cx, y, items, size) {
    ctx.save(); ctx.font = D.font(size, 800);
    const ws = items.map((it) => ctx.measureText(it.t).width), tot = ws.reduce((a, b) => a + b, 0);
    let x = cx - tot / 2; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    items.forEach((it, i) => { ctx.fillStyle = it.c || INK; ctx.fillText(it.t, x, y); x += ws[i]; });
    ctx.restore();
  }
  function refreshPlan() {
    const P = S.plan, st = P.stage; let h = '', unit = '';
    if (st === 0) { h = '<span class="k">① 아세트산의 몰수</span><br>식초 A 원액(0.900 M) 20.00 mL 속 아세트산의 몰수는? (1 mL × 1 M = 1 mmol)'; unit = 'mmol'; }
    else if (st === 1) { h = '<span class="k">② 필요한 NaOH 부피</span><br>아세트산 ' + fx(NMMOL, 1) + ' mmol과 1 : 1로 반응하는 0.100 M NaOH의 부피는?'; unit = 'mL'; }
    else h = '<div class="calc-done">🎉 원액 20.00 mL를 바로 적정하면 NaOH <b>' + fx(NEED_ML, 0) + ' mL</b>가 필요해요. 뷰렛(50.00 mL)을 훨씬 넘어요!</div>';
    $('#pcPrompt').innerHTML = h; $('#pcUnit').textContent = unit; $('#pcRow').style.display = st < 2 ? '' : 'none';
    $('#pcCheck').disabled = st >= 2; $('#pcIn').disabled = st >= 2; $('#pcIn').value = '';
    $('#pcNote').textContent = st < 2 ? '답을 쓰고 ✔ 확인을 눌러요.' : '이제 어떻게 묽힐지 계획해 봐요.';
  }
  function checkPlan() {
    const P = S.plan, st = P.stage; if (st >= 2) return;
    const v = parseNum($('#pcIn').value), want = st === 0 ? NMMOL : NEED_ML;
    if (isNaN(v)) { Sound.fail(); showHint('답을 숫자로 써 주세요.', 2600); return; }
    if (near(v, want, 0.01, 0)) {
      P.stage++; Sound.success(); P.pop.v = 1; tw(P.pop, { v: 0 }, { duration: 1.0 });
      parts.burst(LP.left.x + LP.left.w / 2, LP.left.y + 80, { count: 14, speed: 120, size: 3, colors: ['#8b5cf6', '#14a058', '#ffb400'] });
      refreshPlan(); updateCtl();
    } else {
      Sound.fail(); shakeEl($('#pcIn'));
      showHint(st === 0 ? (near(v, 0.900, 0.02, 0) || near(v, 20, 0.02, 0) ? '농도와 부피를 곱해야 몰수가 돼요: 0.900 mmol/mL × 20.00 mL.' : '몰수 = 몰 농도 × 부피예요. (M × mL = mmol)') : (near(v, NMMOL, 0.02, 0) ? '몰수를 NaOH의 농도 0.100 M로 나누어야 부피(mL)가 돼요.' : '1 : 1 반응이라 NaOH 몰수 = 아세트산 몰수예요. 부피 = 몰수 ÷ 0.100 M.'), 5200);
    }
  }
  $('#pcCheck').addEventListener('click', checkPlan);
  $('#pcIn').addEventListener('keydown', (e) => { if (e.key === 'Enter') checkPlan(); });
  $('#pcIn').addEventListener('input', () => $('#pcIn').classList.remove('bad'));
  $('#pipSel').addEventListener('change', () => { S.plan.pip = $('#pipSel').value; Sound.click(); });

  /* =========================================================
     ② 희석 조작 scene (홀피펫 → 100 mL 부피 플라스크)
     ========================================================= */
  const newPrep = () => ({ step: 0, vol: 0, vin: 0, mix: { v: 0 }, over: false, w: 'none', acc: 0, busy: false });
  const PREP = { A: newPrep(), B: newPrep() };
  const PIP = { px: { v: 0 }, py: { v: 0 }, fill: { v: 0 } };
  const cur = () => PREP[S.sample];
  const GP = PHONE
    ? { jar: rect(34, 470, 124, 130), fx: 340, fby: 690, R: 64, nw: 24, nh: 150, wash: { x: 420, y: 250 }, pipH: 190 }
    : { jar: rect(60, 330, 160, 130), fx: 560, fby: 520, R: 80, nw: 28, nh: 130, wash: { x: 706, y: 150 }, pipH: 200 };
  function flaskGeom() {
    const g = GP, cy = g.fby - g.R, dy = Math.sqrt(g.R * g.R - (g.nw / 2) * (g.nw / 2)), nb = cy - dy, nt = nb - g.nh, mk = nb - g.nh * 0.55;
    return { cx: g.fx, cy, R: g.R, nw: g.nw, nb, nt, mk, by: g.fby };
  }
  function yOfVol(v, g) {
    if (v <= 90) return g.by - (v / 90) * (g.by - g.nb);
    if (v <= 100) return g.nb - ((v - 90) / 10) * (g.nb - g.mk);
    return g.mk - ((v - 100) / 5) * (g.mk - g.nt) * 0.4;
  }
  GP.pipTipRest = GP.pipH + 74;                                // 쉬는 자리에서 피펫 끝의 높이
  const jarDipY = () => GP.jar.y + GP.jar.h * 0.55;            // 식초 안으로 들어간 높이
  const flaskDipY = () => flaskGeom().nt + 70;                 // 부피 플라스크 목 안
  const tipYNow = () => { const up = GP.pipTipRest; const dip = PIP.px.v < 0.5 ? jarDipY() : flaskDipY(); return up + (dip - up) * PIP.py.v; };
  function prepStep(dt) {
    const P = cur(), g = flaskGeom();
    if (P.w !== 'none' && (P.step === 2 || P.step === 3) && !P.over) {
      const rate = P.w === 'fast' ? 24 : 3;
      P.acc += rate * dt; let k = Math.floor(P.acc); P.acc -= k;
      while (k-- > 0) {
        if (P.w === 'fast' && P.vol >= 90) { P.w = 'none'; showHint('표선 가까이에서는 스포이트로 한 방울씩! 💧 한 방울을 써요.', 4200); break; }
        P.vol = r6(P.vol + 0.5);
        if (P.vol > 100.0001) { P.over = true; P.w = 'none'; P.step = 2; Sound.fail(); showHint('표선을 넘었어요! ↺ 다시 만들기를 눌러요.', 5000); updateCtl(); break; }
        if (Math.abs(P.vol - 100) < 1e-6) { P.step = 3; Sound.success(); showHint('표선에 딱 맞았어요! 손을 떼요.', 3000); parts.burst(g.cx, g.mk, { count: 14, speed: 100, size: 3, colors: ['#0ea5e9', '#14a058', '#fff'] }); updateCtl(); }
      }
    }
    if (P.w !== 'none' && (P.step === 2 || P.step === 3) && !P.over && !RM && Math.random() < dt * (P.w === 'fast' ? 40 : 7)) {
      const wa = GP.wash; parts.emit({ x: P.w === 'fast' ? wa.x - 30 + rnd(-2, 2) : g.cx + rnd(-2, 2), y: P.w === 'fast' ? wa.y + 40 : g.nt - 10, vx: P.w === 'fast' ? (g.cx - wa.x + 30) * 1.3 : 0, vy: P.w === 'fast' ? -60 : 40, gravity: 900, size: P.w === 'fast' ? 3.2 : 2.6, life: 0.4, color: '#7cc4ff', fade: false });
    }
  }
  function prepReset(k) {
    cancelTws(); const P = PREP[k || S.sample]; Object.assign(P, newPrep()); P.mix = { v: 0 };
    PIP.px.v = 0; PIP.py.v = 0; PIP.fill.v = 0; updateCtl();
  }
  function seq(steps) { // 순서대로 실행하는 작은 연출 도구
    let i = 0; const go = () => { if (i >= steps.length) return; const s = steps[i++]; s(go); }; go();
  }
  function actPipette() {
    const P = cur(); if (P.step !== 0 || P.busy) return; P.busy = true; Sound.click();
    const sm = SAMP[S.sample];
    seq([
      (n) => tw(PIP.py, { v: 1 }, { duration: 0.6, ease: 'inOutSine', onDone: n }),
      (n) => tw(PIP.fill, { v: 1 }, { duration: 0.8, ease: 'outCubic', onDone: n }),
      (n) => tw(PIP.py, { v: 0 }, { duration: 0.6, ease: 'inOutSine', onDone: n }),
      () => { P.step = 1; P.busy = false; updateCtl(); },
    ]);
  }
  function actPour() {
    const P = cur(); if (P.step !== 1 || P.busy) return; P.busy = true; Sound.click();
    seq([
      (n) => tw(PIP.px, { v: 1 }, { duration: 0.8, ease: 'inOutCubic', onDone: n }),
      (n) => tw(PIP.py, { v: 1 }, { duration: 0.6, ease: 'inOutSine', onDone: n }),
      (n) => tw(PIP.fill, { v: 0 }, { duration: 1.0, ease: 'inOutQuad', onUpdate: () => { P.vin = r6(10 * (1 - PIP.fill.v)); P.vol = P.vin; }, onDone: n }),
      (n) => { P.vin = 10; P.vol = 10; tw(PIP.py, { v: 0 }, { duration: 0.6, ease: 'inOutSine', onDone: n }); },
      (n) => tw(PIP.px, { v: 0 }, { duration: 0.8, ease: 'inOutCubic', onDone: n }),
      () => { P.step = 2; P.busy = false; Sound.success(); updateCtl(); },
    ]);
  }
  function actMix() {
    const P = cur(); if (P.step !== 3 || P.busy) return; P.busy = true; Sound.click();
    tw(P.mix, { v: 1 }, { duration: 1.6, ease: 'inOutSine', onDone: () => { P.step = 4; P.busy = false; Sound.success(); const g = flaskGeom(); parts.burst(g.cx, g.cy, { count: 18, speed: 130, size: 3.2, colors: [SAMP[S.sample].tint, '#fff', '#14a058'] }); updateCtl(); } });
  }
  function drawPipV(cx, tipY, h, fill, color) {
    ctx.save();
    const top = tipY - h, bul = tipY - h * 0.42;
    const path = () => {
      ctx.beginPath(); ctx.moveTo(cx - 3.5, top); ctx.lineTo(cx - 3.5, bul - 20); ctx.quadraticCurveTo(cx - 17, bul - 12, cx - 17, bul + 6); ctx.quadraticCurveTo(cx - 17, bul + 24, cx - 3.5, bul + 36);
      ctx.lineTo(cx - 3.5, tipY - 18); ctx.lineTo(cx, tipY); ctx.lineTo(cx + 3.5, tipY - 18); ctx.lineTo(cx + 3.5, bul + 36); ctx.quadraticCurveTo(cx + 17, bul + 24, cx + 17, bul + 6); ctx.quadraticCurveTo(cx + 17, bul - 12, cx + 3.5, bul - 20); ctx.lineTo(cx + 3.5, top); ctx.closePath();
    };
    path(); ctx.fillStyle = 'rgba(220,232,245,.4)'; ctx.fill();
    if (fill > 0.001) { ctx.save(); path(); ctx.clip(); const ringY = top + 22, ly = tipY - (tipY - ringY) * fill; ctx.fillStyle = CO.rgba(color, 0.9); ctx.fillRect(cx - 20, ly, 40, tipY - ly + 2); ctx.restore(); }
    path(); ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 2.5; ctx.lineJoin = 'round'; ctx.stroke();
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx - 6, top + 22); ctx.lineTo(cx + 6, top + 22); ctx.stroke();
    D.sphere(cx, top - 12, 13, '#e2464b', { gloss: true });
    D.roundRect(cx - 2.5, top - 2, 5, 12, 2); ctx.fillStyle = '#6b7280'; ctx.fill();
    ctx.restore();
  }
  function drawFlaskV(P, sm) {
    const g = flaskGeom(); ctx.save();
    const closed = () => { ctx.beginPath(); ctx.moveTo(g.cx - g.nw / 2, g.nt); ctx.lineTo(g.cx - g.nw / 2, g.nb); ctx.arc(g.cx, g.cy, g.R, Math.atan2(g.nb - g.cy, -g.nw / 2), Math.atan2(g.nb - g.cy, g.nw / 2), true); ctx.lineTo(g.cx + g.nw / 2, g.nt); ctx.closePath(); };
    closed(); ctx.fillStyle = 'rgba(220,232,245,.35)'; ctx.fill();
    if (P.vol > 0.01) {
      ctx.save(); closed(); ctx.clip();
      const yl = yOfVol(P.vol, g), yv = yOfVol(P.vin, g), m = P.mix.v, dilFrac = P.vin / Math.max(P.vol, 0.01);
      const wat = '#bfe3f7', vin = sm.tint, uni = CO.mix('#cfe8f7', sm.tint, clamp(dilFrac, 0, 1));
      ctx.globalAlpha = 1 - m; ctx.fillStyle = CO.rgba(wat, 0.7); ctx.fillRect(g.cx - g.R, yl, g.R * 2, yv - yl); ctx.fillStyle = CO.rgba(vin, 0.9); ctx.fillRect(g.cx - g.R, yv, g.R * 2, g.by - yv + 2);
      ctx.globalAlpha = m; ctx.fillStyle = CO.rgba(uni, 0.75); ctx.fillRect(g.cx - g.R, yl, g.R * 2, g.by - yl + 2);
      ctx.globalAlpha = 1; ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(g.cx - g.nw / 2, yl - 1, g.nw, 3);
      ctx.restore();
    }
    // 유리 테두리 + 반사
    ctx.beginPath(); ctx.moveTo(g.cx - g.nw / 2, g.nt); ctx.lineTo(g.cx - g.nw / 2, g.nb); ctx.arc(g.cx, g.cy, g.R, Math.atan2(g.nb - g.cy, -g.nw / 2), Math.atan2(g.nb - g.cy, g.nw / 2), true); ctx.lineTo(g.cx + g.nw / 2, g.nt);
    ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 3.5; ctx.lineJoin = 'round'; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(g.cx, g.cy, g.R - 9, Math.PI * 0.62, Math.PI * 0.95); ctx.stroke();
    // 표선
    ctx.strokeStyle = '#e2464b'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(g.cx - g.nw / 2 - 8, g.mk); ctx.lineTo(g.cx + g.nw / 2 + 8, g.mk); ctx.stroke();
    T(g.cx + g.nw / 2 + 12, g.mk + 5, '표선 100 mL', 13, BAD, 'left', 800);
    ctx.restore();
    return g;
  }
  function drawJar(sm) {
    const j = GP.jar; ctx.save();
    const lvl = 0.62, ly = j.y + j.h * (1 - lvl);
    D.roundRect(j.x, j.y, j.w, j.h, 14); ctx.fillStyle = 'rgba(220,232,245,.35)'; ctx.fill();
    ctx.save(); D.roundRect(j.x + 3, j.y, j.w - 6, j.h - 3, 12); ctx.clip(); ctx.fillStyle = CO.rgba(sm.tint, 0.95); ctx.fillRect(j.x, ly, j.w, j.h); ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fillRect(j.x, ly - 1, j.w, 3); ctx.restore();
    D.roundRect(j.x, j.y, j.w, j.h, 14); ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 3.5; ctx.stroke();
    D.roundRect(j.x + 14, j.y + j.h * 0.5 - 4, j.w - 28, 38, 8); ctx.fillStyle = '#fff'; ctx.fill();
    T(j.x + j.w / 2, j.y + j.h * 0.5 + 22, sm.key === 'A' ? '식초 A' : '식초 B', 17, INK, 'center', 800);
    T(j.x + j.w / 2, j.y + j.h + 22, '식초 원액', 13.5, MUTED, 'center', 800);
    ctx.restore();
  }
  function drawWash() {
    const w = GP.wash, P = cur(); ctx.save(); ctx.translate(w.x, w.y); ctx.rotate(P.w === 'fast' ? -0.5 : -0.12);
    D.roundRect(-22, -34, 44, 78, 12); ctx.fillStyle = '#e8f4ff'; ctx.fill(); ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = '#7cc4ff'; ctx.fillRect(-18, -4, 36, 44);
    D.roundRect(-8, -50, 16, 18, 4); ctx.fillStyle = '#9ca3af'; ctx.fill();
    ctx.strokeStyle = '#9ca3af'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, -48); ctx.lineTo(-24, -54); ctx.lineTo(-30, -42); ctx.stroke();
    ctx.restore();
    T(w.x, w.y + 66, '증류수', 13, MUTED, 'center', 800);
  }
  function drawPrep() {
    const sm = SAMP[S.sample], P = cur(), g = flaskGeom();
    panel(8, 8, VW - 16, VH - 16, 14);
    // 단계 표시
    const labs = ['① 취하기', '② 넣기', '③ 표선까지', '④ 섞기'], px0 = 24, pw = (VW - 48) / 4;
    labs.forEach((s, i) => { const on = P.step === i, done = P.step > i; D.label(px0 + pw * i + pw / 2, 30, s, { bg: done ? GOOD : on ? VIO : '#c9cfdd', size: PHONE ? 12.5 : 14, pad: PHONE ? 8 : 12 }); });
    drawJar(sm); drawWash();
    drawFlaskV(P, sm);
    // 액량 표시
    D.label(g.cx, g.nt - 26, P.vol > 0 ? '액량 ' + P.vol.toFixed(1) + ' mL' : '빈 부피 플라스크 (100 mL)', { bg: P.over ? BAD : '#475569', size: PHONE ? 12.5 : 13.5, pad: 9 });
    // 피펫
    const x0 = GP.jar.x + GP.jar.w / 2, x = x0 + (g.cx - x0) * PIP.px.v, tip = tipYNow();
    drawPipV(x, tip, GP.pipH, PIP.fill.v, sm.tint);
    if (PIP.fill.v > 0.02) D.label(x + (PHONE ? 44 : 52), tip - GP.pipH * 0.4, '홀피펫 ' + (10 * PIP.fill.v).toFixed(2) + ' mL', { bg: VIO, size: PHONE ? 11.5 : 12.5, pad: 7, align: 'left' });
    else if (P.step === 0) T(x + 24, tip - GP.pipH * 0.4, '홀피펫 10.00 mL', PHONE ? 12 : 13, MUTED, 'left', 800);
    // 안내
    const msg = P.over ? '표선을 넘었어요! ↺ 다시 만들기를 눌러요.' : P.step === 0 ? '① 홀피펫으로 식초 ' + sm.key + ' 10.00 mL를 취해요.' : P.step === 1 ? '② 취한 식초를 100 mL 부피 플라스크에 넣어요.' : P.step === 2 ? '③ 증류수를 표선(100 mL)까지 채워요. 가까워지면 한 방울씩!' : P.step === 3 ? '④ 마개를 닫고 거꾸로 뒤집으며 섞어요.' : '✅ 10배 묽힌 식초 ' + sm.key + ' 100 mL가 준비됐어요! (식초 ' + fx(P.vin, 2) + ' mL → ' + fx(P.vol, 1) + ' mL)';
    textBlock(PHONE ? 20 : 26, PHONE ? 650 : 518, PHONE ? 150 : 440, msg, PHONE ? 13 : 15, P.over ? BAD : INK, PHONE ? 18 : 21, 800);
    if (P.step === 4) D.check(g.cx + g.R + (PHONE ? 4 : 20), g.cy - 40, 18, 1);
  }

  /* =========================================================
     ③ 적정 scene (C)
     ========================================================= */
  const LTI = PHONE
    ? { app: rect(6, 6, 468, 356), zoom: rect(246, 14, 222, 168), info: rect(246, 188, 222, 168), runs: rect(6, 368, 468, 300) }
    : { app: rect(8, 8, 330, 544), zoom: rect(346, 8, 220, 214), info: rect(574, 8, 218, 214), runs: rect(346, 230, 446, 322) };
  function drawTitrC() {
    const sm = SAMP[S.sample];
    drawTitrApp(LTI.app); drawZoom(LTI.zoom);
    const I = LTI.info; panel(I.x, I.y, I.w, I.h, 14);
    T(I.x + 12, I.y + 22, '📋 이 적정의 시료', 13.5, INK, 'left', 800);
    let y = I.y + 44;
    [sm.name + '을 10배 묽힌 식초', '20.00 mL (홀피펫)', 'CH₃COOH + NaOH', '→ CH₃COONa + H₂O (1 : 1)', '표준 용액 0.100 M NaOH'].forEach((s, i) => { T(I.x + 12, y, s, PHONE ? 12 : 13, i === 3 ? VIO : INK, 'left', 800); y += PHONE ? 20 : 24; });
    textBlock(I.x + 12, y + 6, I.w - 24, '식초가 색을 띠어도 흰 종이 위에서 연한 붉은색을 확인해요.', PHONE ? 11.5 : 12.5, MUTED, 16, 700);
    drawRuns(LTI.runs, '📋 뷰렛 눈금 기록표 (' + sm.name.split(' ')[0] + ' ' + sm.key + ')');
  }

  /* =========================================================
     ④ 함량 계산 scene
     ========================================================= */
  const LCC = PHONE
    ? { data: rect(6, 6, 468, 112), card: (i) => rect(6, 124 + i * 90, 468, 84), sum: rect(6, 580, 468, 174) }
    : { data: rect(8, 8, 784, 118), card: (i) => rect(8 + i * 158, 134, 150, 238), sum: rect(8, 380, 784, 172) };
  const CSTAGE = [
    { t: '① 평균 NaOH 부피', u: 'mL', f: () => '(' + SAMP[S.sample].data.map((v) => v.toFixed(1)).join(' + ') + ') ÷ 3', v: (s) => s.mean, dec: 1, tag: '평균' },
    { t: '② 희석 식초의 M', u: 'M', f: () => '0.100 × V′ ÷ 20.00', v: (s) => s.cDil, dec: 4, tag: '1 : 1 몰수비' },
    { t: '③ 원액의 M', u: 'M', f: () => '× 10 (희석 배수)', v: (s) => s.cOrig, dec: 3, tag: '희석 보정' },
    { t: '④ 질량 농도', u: 'g/L', f: () => '× 60 g/mol', v: (s) => s.gL, dec: 1, tag: '몰 → 질량' },
    { t: '⑤ 100 mL당', u: 'g/100 mL', f: () => '÷ 10 (L → 100 mL)', v: (s) => s.g100, dec: 2, tag: '단위 바꾸기' },
  ];
  const cDone = (k) => S.calc.stage[k] >= 5;
  function drawCalc() {
    const sm = SAMP[S.sample], st = S.calc.stage[S.sample], D0 = LCC.data;
    panel(D0.x, D0.y, D0.w, D0.h, 14);
    T(D0.x + 14, D0.y + 24, '📋 ' + sm.name + ' · 희석 식초 20.00 mL 적정 기록 (한 학생의 모범 자료)', PHONE ? 12.5 : 14.5, INK, 'left', 800);
    sm.data.forEach((v, i) => { const x = D0.x + 20 + i * (PHONE ? 150 : 180), y = D0.y + (PHONE ? 54 : 58); D.label(x + 40, y, (i + 1) + '회  ' + v.toFixed(1) + ' mL', { bg: '#ede9fe', color: '#4c1d95', size: PHONE ? 13 : 15, pad: 10 }); });
    T(D0.x + 20, D0.y + D0.h - 16, '식초 원액을 10.00 mL → 100 mL로 묽혔어요 (희석 배수 10) · 대략 적정 값은 평균에서 제외', PHONE ? 11 : 13, MUTED, 'left', 700);
    for (let i = 0; i < 5; i++) {
      const r = LCC.card(i), cs = CSTAGE[i], filled = st > i, act = st === i;
      if (i < 4) { const r2_ = LCC.card(i + 1); if (PHONE) D.arrow(r.x + 30, r.y + r.h + 1, r2_.x + 30, r2_.y - 1, { color: '#b7bdd0', width: 3, head: 8 }); else D.arrow(r.x + r.w + 1, r.y + r.h / 2, r2_.x - 1, r.y + r.h / 2, { color: '#b7bdd0', width: 3, head: 7 }); }
      D.shadow(() => { D.roundRect(r.x, r.y, r.w, r.h, 12); ctx.fillStyle = filled ? '#eefbf3' : '#fff'; ctx.fill(); }, { blur: 6, y: 2 });
      ctx.strokeStyle = filled ? GOOD : act ? VIO : '#d5d9e6'; ctx.lineWidth = act ? 3 : 2; D.roundRect(r.x, r.y, r.w, r.h, 12); ctx.stroke();
      if (act) { const k = (S.t * 1.2) % 1; ctx.save(); ctx.strokeStyle = CO.rgba(VIO, 0.5 * (1 - k)); ctx.lineWidth = 3; D.roundRect(r.x - k * 6, r.y - k * 6, r.w + k * 12, r.h + k * 12, 12 + k * 6); ctx.stroke(); ctx.restore(); }
      const val = filled ? fx(cs.v(sm), cs.dec) : '?', pop = S.calc.pop[i].v;
      if (PHONE) {
        T(r.x + 12, r.y + 24, cs.t, 14.5, filled ? '#0b6b39' : act ? '#5b21b6' : MUTED, 'left', 800);
        T(r.x + 12, r.y + 48, cs.f(), 13, INK, 'left', 800);
        T(r.x + 12, r.y + 70, '= ' + val + ' ' + cs.u, 15, filled ? '#0b6b39' : MUTED, 'left', 800);
        D.label(r.x + r.w - 12, r.y + 22, cs.tag, { bg: '#8b5cf6', size: 11, align: 'right', pad: 6 });
      } else {
        T(r.x + 10, r.y + 26, cs.t, 14, filled ? '#0b6b39' : act ? '#5b21b6' : MUTED, 'left', 800);
        textBlock(r.x + 10, r.y + 58, r.w - 20, cs.f(), 13, INK, 18, 800);
        T(r.x + 10, r.y + 140, '= ' + val, 19, filled ? '#0b6b39' : MUTED, 'left', 800);
        T(r.x + 10, r.y + 164, cs.u, 14, filled ? '#0b6b39' : MUTED, 'left', 800);
        D.label(r.x + 10, r.y + r.h - 24, cs.tag, { bg: '#8b5cf6', size: 11.5, align: 'left', pad: 7 });
      }
      if (pop > 0.01) D.glow(r.x + r.w / 2, r.y + r.h / 2, 70 * pop, '#14a058', 0.35 * (1 - pop * 0.4));
    }
    const sU = LCC.sum; panel(sU.x, sU.y, sU.w, sU.h, 14);
    T(sU.x + 14, sU.y + 24, '단위를 따라가며 확인', 14, INK, 'left', 800);
    const chain = ['mL', 'M', 'M', 'g/L', 'g/100 mL'], cw = (sU.w - 28) / 5;
    chain.forEach((u, i) => { const ok = st > i; D.label(sU.x + 14 + cw * i + cw / 2, sU.y + 58, u, { bg: ok ? GOOD : '#c9cfdd', size: PHONE ? 11.5 : 13.5, pad: PHONE ? 6 : 10 }); });
    if (cDone(S.sample)) {
      D.label(sU.x + sU.w / 2, sU.y + 104, sm.name.split(' ')[0] + ' ' + sm.key + ' 100 mL 속 아세트산 ' + fx(sm.g100, 2) + ' g (원액 ' + fx(sm.cOrig, 3) + ' M)', { bg: GOOD, size: PHONE ? 13 : 16, pad: 12 });
      T(sU.x + sU.w / 2, sU.y + 142, '희석 배수 10을 곱했기 때문에 원액의 값이에요.', PHONE ? 12 : 13.5, '#0b6b39', 'center', 800);
    } else T(sU.x + sU.w / 2, sU.y + 112, '단계마다 단위가 바뀌어요. 마지막은 g/100 mL예요.', PHONE ? 12 : 14, MUTED, 'center', 800);
  }
  function refreshCalc() {
    const sm = SAMP[S.sample], st = S.calc.stage[S.sample], nm = sm.name.split(' ')[0] + ' ' + sm.key;
    let h = '', unit = '';
    if (st >= 5) h = '<div class="calc-done">🎉 ' + nm + ' 100 mL에는 아세트산이 <b>' + fx(sm.g100, 2) + ' g</b> 들어 있어요. (원액 ' + fx(sm.cOrig, 3) + ' M = ' + fx(sm.gL, 1) + ' g/L)</div>';
    else {
      unit = CSTAGE[st].u;
      const q = [
        '<span class="k">① 평균 부피</span><br>NaOH 소비량 ' + sm.data.map((v) => v.toFixed(1)).join(', ') + ' mL의 평균은?',
        '<span class="k">② 희석 식초의 몰 농도</span><br>아세트산 : NaOH = 1 : 1이므로 M × 20.00 = 0.100 × ' + fx(sm.mean, 1) + '. M은?',
        '<span class="k">③ 원액의 몰 농도</span><br>식초를 10배 묽혔어요. 원액의 몰 농도는?',
        '<span class="k">④ 질량 농도</span><br>원액 ' + fx(sm.cOrig, 3) + ' mol/L에 아세트산의 몰질량 60 g/mol을 곱하면?',
        '<span class="k">⑤ 100 mL당 질량</span><br>' + fx(sm.gL, 1) + ' g/L를 g/100 mL로 바꾸면?',
      ];
      h = q[st];
    }
    $('#fcPrompt').innerHTML = h; $('#fcUnit').textContent = unit; $('#fcRow').style.display = st < 5 ? '' : 'none';
    $('#fcCheck').disabled = st >= 5; $('#fcIn').disabled = st >= 5; $('#fcIn').value = '';
    $('#fcNote').textContent = st < 5 ? '답을 쓰고 ✔ 확인을 눌러요. (단위: ' + (unit || '-') + ')' : '다른 식초도 계산해 볼까요?';
  }
  function checkCalc() {
    const k = S.sample, sm = SAMP[k], st = S.calc.stage[k]; if (st >= 5) return;
    const v = parseNum($('#fcIn').value), want = CSTAGE[st].v(sm);
    if (isNaN(v)) { Sound.fail(); showHint('답을 숫자로 써 주세요.', 2600); return; }
    if (near(v, want, 0.015, 0)) {
      S.calc.stage[k]++; Sound.success(); const pi = st, p = S.calc.pop[pi]; p.v = 1; tw(p, { v: 0 }, { duration: 0.9 });
      const r = LCC.card(pi); parts.burst(r.x + r.w / 2, r.y + r.h / 2, { count: 12, speed: 110, size: 3, colors: ['#8b5cf6', '#14a058', '#ffb400'] });
      refreshCalc(); updateCtl();
    } else {
      Sound.fail(); shakeEl($('#fcIn'));
      let m = '';
      if (st === 0) m = near(v, r6(sm.data.reduce((a, b) => a + b, 0)), 0.02, 0) ? '합이에요. 3회로 나누어 평균을 구해요.' : '세 값을 더해 3으로 나누어요.';
      else if (st === 1) m = near(v, r6(0.100 * sm.mean / 20), 0.5, 0) && !near(v, want, 0.03, 0) ? 'M × 20.00 mL = 0.100 M × ' + fx(sm.mean, 1) + ' mL (1 : 1)이에요. M = 0.100 × ' + fx(sm.mean, 1) + ' ÷ 20.00.' : 'M × 20.00 = 0.100 × ' + fx(sm.mean, 1) + '에서 M을 구해요.';
      else if (st === 2) m = near(v, sm.cDil, 0.03, 0) ? '희석 배수 10을 곱하지 않았어요! 원액은 희석 식초보다 10배 진해요.' : '원액의 몰 농도 = 희석 식초의 몰 농도 × 10이에요.';
      else if (st === 3) m = near(v, sm.cOrig, 0.03, 0) ? '몰 농도에 몰질량 60 g/mol을 곱해야 g/L가 돼요.' : '질량 농도(g/L) = 몰 농도(mol/L) × 몰질량(g/mol)이에요.';
      else m = near(v, sm.gL, 0.03, 0) ? '1 L = 1000 mL이므로 100 mL당 값은 g/L의 1/10이에요. 10으로 나눠요.' : near(v, r6(sm.gL * 10), 0.03, 0) ? '곱하는 것이 아니라 나누어요. 100 mL는 1 L의 1/10이에요.' : 'g/L를 10으로 나누면 g/100 mL예요.';
      showHint(m, 5200);
    }
  }
  $('#fcCheck').addEventListener('click', checkCalc);
  $('#fcIn').addEventListener('keydown', (e) => { if (e.key === 'Enter') checkCalc(); });
  $('#fcIn').addEventListener('input', () => $('#fcIn').classList.remove('bad'));

  /* =========================================================
     ⑤ 결과 평가 scene
     ========================================================= */
  const CAUSES = [
    { t: '종말점을 지나쳐 NaOH를 너무 많이 넣었다', ans: 'up', tip: '한 방울씩 넣고, 연한 붉은색이 처음 30초 유지되면 멈춰요.' },
    { t: '희석 식초를 취하는 피펫을 물로 헹구고 그대로 썼다', ans: 'down', tip: '피펫은 사용할 용액(희석 식초)으로 헹궈서 써요.' },
    { t: '부피 플라스크에 표선을 넘게 물을 넣었다', ans: 'down', tip: '눈높이에서 표선에 맞추고, 넘으면 다시 만들어요.' },
    { t: '식초에 아세트산 말고 다른 산 성분도 들어 있다', ans: 'up', tip: '이 실험은 산 전체를 아세트산으로 계산한 값이에요. 다른 산도 NaOH를 소비해요.' },
  ];
  const LEV = PHONE
    ? { bars: rect(6, 6, 468, 196), cause: rect(6, 208, 468, 336), talk: rect(6, 550, 468, 204), row: (i) => 208 + 44 + i * 70 }
    : { bars: rect(8, 8, 384, 238), talk: rect(400, 8, 392, 238), cause: rect(8, 254, 784, 298), row: (i) => 254 + 46 + i * 62 };
  const eCauseOK = (i) => S.eval.sel[i] === CAUSES[i].ans;
  const eConclOK = () => S.eval.more === 'A' && near(parseNum(S.eval.diff), r6(SAMP.A.g100 - SAMP.B.g100), 0.03, 0);
  function stepEval(dt) { S.eval.bars.a.update(dt); S.eval.bars.b.update(dt); }
  function drawEval() {
    const E = S.eval, A = SAMP.A, B = SAMP.B, R0 = LEV.bars; panel(R0.x, R0.y, R0.w, R0.h, 14);
    T(R0.x + 14, R0.y + 24, '📊 100 mL당 아세트산 질량 (g/100 mL)', PHONE ? 13.5 : 14.5, INK, 'left', 800);
    const bx = R0.x + (PHONE ? 100 : 120), bw = R0.w - (PHONE ? 130 : 160), sc = 6;
    [['식초 A', A, E.bars.a, '#8b5cf6'], ['식초 B', B, E.bars.b, '#f59e0b']].forEach(([nm, s, sp, col], i) => {
      const y = R0.y + 52 + i * (PHONE ? 62 : 74), w = clamp(sp.value, 0, sc) / sc * bw;
      T(bx - 10, y + 24, nm, 14, INK, 'right', 800);
      ctx.save(); ctx.strokeStyle = '#d5d9e6'; ctx.setLineDash([4, 4]); D.roundRect(bx, y, bw, 40, 8); ctx.stroke(); ctx.restore();
      if (w > 0.5) D.shadow(() => { D.roundRect(bx, y, w, 40, 8); ctx.fillStyle = col; ctx.fill(); }, { blur: 5, y: 2 });
      T(bx + w + 8 > bx + bw - 60 ? bx + w - 10 : bx + w + 8, y + 26, fx(s.g100, 2), 16, bx + w + 8 > bx + bw - 60 ? '#fff' : INK, bx + w + 8 > bx + bw - 60 ? 'right' : 'left', 800);
    });
    [0, 2, 4, 6].forEach((v) => T(bx + v / sc * bw, R0.y + R0.h - (PHONE ? 12 : 16), String(v), 12, MUTED, 'center', 700));
    // 토의
    const Tk = LEV.talk; panel(Tk.x, Tk.y, Tk.w, Tk.h, 14);
    T(Tk.x + 14, Tk.y + 24, '💬 토의 카드', 14.5, INK, 'left', 800);
    let y = Tk.y + 52;
    ['식초 병에 적힌 산도(예: 5 % 안팎)와 내 결과 5.40 g/100 mL(밀도 약 1.0 g/mL이면 약 5.4 %)를 비교해 봐요.', '값이 같으면 어떤 점이 잘 지켜졌을까요? 다르다면 어떤 오차 때문일까요?', '3회 반복해 평균을 내고, 희석 배수 10을 곱하는 것을 잊지 않았나요?'].forEach((s) => { y += textBlock(Tk.x + 14, y, Tk.w - 28, '• ' + s, PHONE ? 12.5 : 13.5, INK, PHONE ? 17 : 19, 700) + 8; });
    // 오차 원인
    const C = LEV.cause; panel(C.x, C.y, C.w, C.h, 14);
    T(C.x + 14, C.y + 24, '⚠️ 오차 원인과 개선 방안', 14.5, INK, 'left', 800);
    CAUSES.forEach((c, i) => {
      const y0 = LEV.row(i), v = E.sel[i], ok = eCauseOK(i);
      T(C.x + 16, y0 + 10, (i + 1) + '. ' + c.t, PHONE ? 12.5 : 14, INK, 'left', 800);
      if (v) D.label(C.x + 16, y0 + (PHONE ? 38 : 34), VERD[v][0], { bg: ok ? VERD[v][1] : '#9aa3b5', size: PHONE ? 12 : 13, align: 'left', pad: 8 });
      else T(C.x + 16, y0 + (PHONE ? 42 : 38), '영향을 골라요 →', 12.5, MUTED, 'left', 700);
      if (ok) textBlock(C.x + (PHONE ? 130 : 130), y0 + (PHONE ? 34 : 30), C.w - (PHONE ? 146 : 150), '개선: ' + c.tip, PHONE ? 11.5 : 12.5, '#0b6b39', 16, 700);
    });
    if (eConclOK()) D.label(C.x + C.w - 14, C.y + 22, PHONE ? '결론: A가 ' + fx(r6(A.g100 - B.g100), 2) + ' g 더 많아요' : '결론: 식초 A가 100 mL당 ' + fx(r6(A.g100 - B.g100), 2) + ' g 더 많아요', { bg: GOOD, size: PHONE ? 11.5 : 13.5, align: 'right', pad: 10 });
  }
  const VERD = { up: ['높게 ↑', BAD], down: ['낮게 ↓', BLU], none: ['영향 없음 =', '#6b7280'] };

  /* ---------- 컨트롤 · 장면 ---------- */
  function setSample(k) {
    S.sample = k; tSet(SAMP[k].cfg, false); updateCtl();
    if (S.mode === 'calc') refreshCalc();
  }
  function setScene(mode) {
    if (S.mode !== mode) { S.fade = 1; parts.clear(); tStopFlow(); P_stop(); }
    S.mode = mode; $('#tbLabel').textContent = MODE_LABEL[mode];
    if (mode === 'titr') tSet(SAMP[S.sample].cfg, false);
    if (mode === 'plan') refreshPlan();
    if (mode === 'calc') refreshCalc();
    updateCtl();
  }
  function P_stop() { const P = cur(); P.w = 'none'; }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.mode); }));
  function updateCtl() {
    $$('#ctrlCard [data-modes]').forEach((n) => {
      let on = n.getAttribute('data-modes').split(' ').indexOf(S.mode) >= 0;
      if (on && n.hasAttribute('data-gate')) on = S.gate === n.getAttribute('data-gate');
      if (on && n.hasAttribute('data-gate-off')) on = S.gate !== n.getAttribute('data-gate-off');
      n.hidden = !on;
    });
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    const P = cur(), idx = S.sample === 'A' ? 0 : 1;
    refreshChips(el('smpChips'), idx, (i) => PREP[i ? 'B' : 'A'].step >= 4);
    refreshChips(el('vsChips'), idx, (i) => cDone(i ? 'B' : 'A'));
    el('bPip').disabled = P.step !== 0 || P.busy; el('bPour').disabled = P.step !== 1 || P.busy;
    const filling = (P.step === 2 || P.step === 3) && !P.over && !P.busy; el('wFast').disabled = !filling; el('wSlow').disabled = !filling;
    el('bMixV').disabled = P.step !== 3 || P.busy || P.over;
    el('bPrepRedo').disabled = P.busy;
    el('pipSel').value = S.plan.pip;
    ['cs0', 'cs1', 'cs2', 'cs3'].forEach((id, i) => { el(id).value = S.eval.sel[i]; });
    tCtlKey = '';
  }
  chipsTo(el('smpChips'), ['식초 A', '식초 B (사과 식초)'], 0, (i) => setSample(i ? 'B' : 'A'), (i) => PREP[i ? 'B' : 'A'].step >= 4);
  chipsTo(el('vsChips'), ['식초 A', '식초 B (사과 식초)'], 0, (i) => { setSample(i ? 'B' : 'A'); refreshCalc(); }, (i) => cDone(i ? 'B' : 'A'));
  el('bPip').addEventListener('click', actPipette); el('bPour').addEventListener('click', actPour); el('bMixV').addEventListener('click', actMix);
  el('bPrepRedo').addEventListener('click', () => { Sound.click(); prepReset(); });
  holdBtn('wFast', () => { const P = cur(); if ((P.step === 2 || P.step === 3) && !P.over) P.w = 'fast'; }, () => { const P = cur(); if (P.w === 'fast') P.w = 'none'; });
  holdBtn('wSlow', () => { const P = cur(); if ((P.step === 2 || P.step === 3) && !P.over) { P.w = 'slow'; P.acc = 1; } }, () => { const P = cur(); if (P.w === 'slow') P.w = 'none'; });
  ['cs0', 'cs1', 'cs2', 'cs3'].forEach((id, i) => el(id).addEventListener('change', () => { S.eval.sel[i] = el(id).value; el(id).classList.remove('bad'); Sound.click(); }));
  el('cMore').addEventListener('change', () => { S.eval.more = el('cMore').value; el('cMore').classList.remove('bad'); });
  el('cDiff').addEventListener('input', () => { S.eval.diff = el('cDiff').value; el('cDiff').classList.remove('bad'); });
  bindTitr();
  TT.canPrep = () => PREP[S.sample].step >= 4;
  TT.prepMsg = '먼저 🧫 희석 조작에서 식초를 10배 묽혀야 해요.';

  /* ---------- 읽음 칸 ---------- */
  function readouts() {
    const sm = SAMP[S.sample];
    if (S.mode === 'plan') { setRO(1, '식초 A 원액 속 아세트산', '0.900 M (가정)'); setRO(2, '원액 20.00 mL 적정 시', S.plan.stage >= 2 ? fx(NEED_ML, 0) + ' mL NaOH' : '?'); setRO(3, '뷰렛 용량', '50 mL'); }
    else if (S.mode === 'prep') { const P = cur(); setRO(1, '취한 식초 ' + sm.key, P.step >= 2 ? '10.00 mL' : P.step === 1 ? '10.00 mL (피펫 속)' : '아직'); setRO(2, '액량', P.vol.toFixed(1) + ' mL'); setRO(3, '희석 배수', P.step >= 4 ? '10배' : '—'); }
    else if (S.mode === 'titr') { const R = tRuns(), m = tMean(); setRO(1, '뷰렛 눈금', r2(TT.start + tV()).toFixed(2) + ' mL'); setRO(2, '넣은 NaOH', tV().toFixed(2) + ' mL'); setRO(3, '기록', R.rough ? '대략 ' + R.rough.used.toFixed(2) + ' · 평균 ' + (isNaN(m) ? '?' : m.toFixed(2)) : '대략 적정 전'); }
    else if (S.mode === 'calc') { const st = S.calc.stage[S.sample]; setRO(1, sm.name.split(' ')[0] + ' ' + sm.key + ' 평균', st >= 1 ? fx(sm.mean, 1) + ' mL' : '?'); setRO(2, '원액의 M', st >= 3 ? fx(sm.cOrig, 3) + ' M' : '?'); setRO(3, '100 mL당', st >= 5 ? fx(sm.g100, 2) + ' g' : '?'); }
    else { setRO(1, '식초 A', fx(SAMP.A.g100, 2) + ' g/100 mL'); setRO(2, '식초 B', fx(SAMP.B.g100, 2) + ' g/100 mL'); setRO(3, '맞게 분류', CAUSES.filter((c, i) => eCauseOK(i)).length + ' / 4'); }
  }

  /* ================= 미션 ================= */
  const levels = [
    {
      title: '희석 계획: 왜 묽혀야 할까?', short: '희석 계획', icon: '📝', phase: '예측',
      intro: '<p class="si-q">❓ 탐구 질문: 식초병에 적힌 산 함량은 정말 맞을까? 눈금 하나 넘지 않고 어떻게 잴까?</p>' +
        '<div class="si-link">🔗 <b>앞 차시(중화 적정 실험)에서</b> 표준 용액 NaOH로 미지 시료의 농도를 구했어요. 이번에는 우리 주변의 <b>식초 속 아세트산(CH₃COOH)</b> 함량을 구해요.</div>' +
        '<p>아세트산은 1가 산이라 <b>CH₃COOH + NaOH → CH₃COONa + H₂O</b>로 NaOH와 <b>1 : 1 몰수비</b>로 모두 중화돼요. (아세트산은 약산이에요. 이 차시에서는 1 : 1로 반응한다는 사실만 쓰고, 약산의 pH나 적정 곡선은 다루지 않아요.)</p>' +
        '<p>식초 A 원액의 아세트산이 <b>0.900 M</b>이라고 가정하고, 원액 20.00 mL를 그대로 적정할 수 있는지 계산해 봐요. ⚠️ 보안경 · 장갑을 끼고, 폐액은 폐수 처리 기준에 따라 처리해요.</p>',
      features: ['plan'],
      setup() { S.gate = 'calc'; S.plan.stage = 0; S.plan.pip = ''; setScene('plan'); refreshPlan(); },
      recap: '식초 원액을 그대로 적정하면 NaOH가 180 mL나 필요해 뷰렛(50 mL)을 넘어요. 그래서 10배 묽히고, 계산할 때 희석 배수 10을 곱해 줘요.',
      summary: '<ul><li>CH₃COOH + NaOH → CH₃COONa + H₂O: <b>1 : 1 몰수비</b></li><li>식초 A 원액 20.00 mL(0.900 M): 아세트산 0.900 × 20.00 = <b>18.0 mmol</b> → NaOH 0.100 M <b>180 mL</b> (뷰렛 50 mL 초과)</li><li>그래서 <b>10배 희석</b>: 식초 10.00 mL(홀피펫) → 100 mL 부피 플라스크 → 표선 → NaOH 약 18 mL</li><li>희석해도 아세트산의 <b>몰수는 그대로</b>이고 농도만 1/10이 돼요.</li></ul>',
      missions: [
        {
          title: '뷰렛 용량 초과 확인',
          goal: '식초 A 원액(0.900 M) <b>20.00 mL</b>의 아세트산 몰수와, 이를 중화하는 <b>0.100 M NaOH의 부피</b>를 차례로 구하세요.',
          hint: '몰수 = 몰 농도 × 부피 = 0.900 × 20.00 mmol이에요. 1 : 1 반응이므로 NaOH 몰수도 같고, 부피 = 몰수 ÷ 0.100 M이에요.',
          setup() { S.gate = 'calc'; setScene('plan'); refreshPlan(); },
          check: () => S.plan.stage >= 2, hold: 0.5,
          status: () => mark(S.plan.stage >= 1) + ' 아세트산 몰수 &nbsp; ' + mark(S.plan.stage >= 2) + ' NaOH 부피',
          explain: '아세트산 0.900 M × 20.00 mL = <b>18.0 mmol</b>이에요. NaOH도 18.0 mmol이 필요하니 18.0 ÷ 0.100 = <b>180 mL</b>예요. 뷰렛 용량(50 mL)보다 훨씬 많아 그대로는 적정할 수 없어요.',
        },
        {
          title: '희석 배수 정하기', manual: true,
          goal: '100 mL 부피 플라스크에 넣을 <b>홀피펫의 부피</b>를 골라, 희석한 식초 20.00 mL를 적정하는 NaOH가 <b>15 ~ 25 mL</b>(뷰렛의 절반 안팎)가 되게 하세요. 고른 뒤 <b>✔ 확인하기</b>를 누르세요.',
          hint: '희석 배수 = 100 mL ÷ 피펫 부피예요. NaOH 부피는 180 mL ÷ 희석 배수이고, 10배면 18 mL예요.',
          setup() { S.gate = 'pip'; S.plan.pip = ''; el('pipSel').value = ''; setScene('plan'); },
          check() {
            const v = S.plan.pip;
            if (!v) return '홀피펫의 부피를 골라요.';
            const r = PLAN_ROWS.find((q) => q.pip === v);
            if (v === '10') return true;
            return v === '20' ? '피펫 20.00 mL면 ' + r.f + '배 희석이라 NaOH가 ' + fx(r.ml, 0) + ' mL나 필요해요. 15 ~ 25 mL보다 많아요.' : '피펫 5.00 mL면 ' + r.f + '배 희석이라 NaOH가 ' + fx(r.ml, 0) + ' mL뿐이에요. 너무 적으면 눈금 읽기 오차의 비율이 커져요.';
          },
          explain: '피펫 10.00 mL를 100 mL로 묽히면 <b>10배 희석</b>이에요. 희석한 식초 20.00 mL를 적정하는 NaOH는 180 ÷ 10 = <b>18 mL</b>로, 뷰렛 눈금의 절반 안팎이라 읽기 좋아요.',
        },
        {
          type: 'quiz', title: '식초를 묽히면 아세트산은?',
          goal: '식초 10.00 mL를 100 mL로 묽혔어요. 아세트산에 대해 옳은 설명은?',
          setup() { S.gate = ''; setScene('plan'); },
          choices: ['아세트산의 몰수와 농도가 모두 10분의 1이 돼요', '아세트산의 총 몰수는 그대로이고, 부피가 10배가 되어 농도만 10분의 1이 돼요', '아세트산의 몰수가 10배로 늘어요', '아세트산이 물과 반응해 사라져요'],
          answer: 1,
          feedback: ['몰수가 줄어드는 것이 아니에요. 물만 더 넣었을 뿐 아세트산 입자는 그대로예요.', '', '물을 넣는다고 아세트산이 더 생기지 않아요.', '물을 넣어도 아세트산이 없어지지 않아요. 더 넓게 퍼질 뿐이에요.'],
          explain: '물을 더 넣어도 아세트산 입자의 수(<b>몰수</b>)는 그대로이고, 부피가 10배가 되어 <b>농도만 1/10</b>이 돼요. 그래서 계산 마지막에 희석 배수 10을 곱해 원액의 농도로 돌려놓아요.',
        },
      ],
    },
    {
      title: '식초 적정: 묽히고 적정하기', short: '식초 적정', icon: '🍶', phase: '실험',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 식초를 10배 묽히기로 계획했어요. 이제 <b>식초 A 또는 B</b>를 골라 직접 묽히고 적정해요.</div>' +
        '<p><b>희석 조작</b>: 홀피펫으로 식초 10.00 mL → 100 mL 부피 플라스크에 넣기 → 증류수를 표선까지(가까워지면 스포이트로 한 방울씩) → 마개를 닫고 섞기.</p>' +
        '<p><b>적정</b>: 희석한 식초 20.00 mL(피펫)에 페놀프탈레인을 넣고 0.100 M NaOH로 대략 적정 후 정밀 적정을 3회 해요. 식초가 색을 띠어도 흰 종이 위에서 연한 붉은색이 30초 유지되는지 확인해요. ⚠️ 눈높이에서 표선을 읽고, 보안경 · 장갑을 껴요.</p>',
      features: ['prep', 'titr'],
      setup() { S.gate = ''; prepReset('A'); prepReset('B'); TT.runs = {}; S.sample = 'A'; tSet(SAMP.A.cfg, true); setScene('prep'); },
      recap: '식초 10.00 mL를 100 mL로 정확히 묽힌 뒤, 희석 식초 20.00 mL를 NaOH로 적정해 종말점 부피를 3회 기록해요.',
      summary: '<ul><li>희석: 홀피펫 10.00 mL → 100 mL 부피 플라스크 → 표선까지 증류수 → 섞기 (<b>10배</b>)</li><li>적정: 희석 식초 20.00 mL + 페놀프탈레인 → 0.100 M NaOH, 대략 → 정밀 3회</li><li>종말점: 연한 붉은색이 30초 유지 (색이 있는 식초는 <b>흰 종이</b> 위에서 확인)</li><li>식초 A 자료: 17.9, 18.0, 18.1 mL (평균 18.0 mL), 식초 B: 14.9, 15.0, 15.1 mL (평균 15.0 mL)</li></ul>',
      missions: [
        {
          title: '식초 10배 묽히기',
          goal: '식초 A를 고르고 ① 홀피펫으로 <b>10.00 mL</b> 취하기 → ② 플라스크에 넣기 → ③ 증류수를 <b>표선(100 mL)</b>까지 → ④ 섞기를 차례로 하세요.',
          hint: '💧 붓기(꾹)는 90 mL까지 채워 줘요. 그다음 💧 한 방울(꾹)로 액량이 정확히 100.0 mL가 될 때 놓아요. 넘으면 ↺ 다시 만들기!',
          setup() { S.gate = ''; setScene('prep'); },
          check: () => PREP.A.step >= 4 || PREP.B.step >= 4, hold: 0.4,
          status: () => { const P = cur(); return mark(P.step >= 1) + ' 10.00 mL 취함 &nbsp; ' + mark(P.step >= 2) + ' 플라스크에 넣음 &nbsp; ' + mark(P.step >= 3) + ' 표선 100.0 mL &nbsp; ' + mark(P.step >= 4) + ' 섞음'; },
          explain: '식초 10.00 mL가 100 mL가 되어 <b>10배 희석</b>이에요. 아세트산의 몰수는 그대로이고 농도만 1/10이 돼요. 표선을 넘으면 더 묽어져 결과가 낮게 나오므로 다시 만들어야 해요.',
        },
        {
          title: '대략 적정 후 정밀 적정 3회',
          goal: '🧪 시료 준비(희석 식초 20.00 mL + 지시약) 뒤 <b>대략 적정</b>, 이어서 <b>정밀 적정 3회</b>를 기록하세요. (식초 A 또는 B, 묽힌 식초로 해요.)',
          hint: '⏬ 빠르게로 종말점을 대략 찾고, 정밀 적정에서는 그 값보다 1 mL 앞부터 💧 천천히나 한 방울로 넣어요. 연한 붉은색이 30초 유지되면 📝 눈금 기록!',
          setup() { setScene('titr'); },
          check: () => tValid(S.sample).length >= 3, hold: 0.4,
          status: () => { const R = tRuns(), n = tValid().length; return mark(!!R.rough) + ' 대략 &nbsp; ' + mark(n >= 1) + ' 1회 &nbsp; ' + mark(n >= 2) + ' 2회 &nbsp; ' + mark(n >= 3) + ' 3회'; },
          get explain() { const m = tMean(S.sample); return '정밀 적정 3회의 평균 NaOH 소비량은 <b>' + (isNaN(m) ? '?' : m.toFixed(2)) + ' mL</b>예요. (한 방울 0.05 mL만큼 종말점을 넘어서 읽는 것이 보통이에요.) 다음 단계에서는 한 학생의 모범 자료로 함량을 계산해 봐요.'; },
        },
        {
          type: 'quiz', title: '흰 종이 위에서 색을 보는 까닭',
          goal: '식초가 색을 띠어도 적정할 때 삼각 플라스크를 흰 종이 위에 두고 지시약의 색을 확인하는 까닭은?',
          setup() { setScene('titr'); },
          choices: ['흰 종이가 반응을 빠르게 해 주기 때문이에요', '흰 바탕에서 보면 연한 붉은색의 변화를 용액의 색이나 배경에 방해받지 않고 알아보기 쉽기 때문이에요', '흰 종이가 용액의 산성을 약하게 하기 때문이에요', '종이가 지시약 역할을 하기 때문이에요'],
          answer: 1,
          feedback: ['종이는 화학 반응에 참여하지 않아요.', '', '종이는 용액의 액성에 영향을 주지 않아요.', '지시약은 페놀프탈레인이에요. 종이는 배경일 뿐이에요.'],
          explain: '종말점은 <b>연한 붉은색</b>의 출현으로 판단해요. 식초가 약간 색을 띠므로 흰 종이를 받치고 보면 색이 바뀌는 순간을 정확히 알아볼 수 있어요.',
        },
      ],
    },
    {
      title: '함량 계산: 희석 배수 보정', short: '함량 계산', icon: '🧮', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 묽힌 식초를 적정해 NaOH 소비량을 기록했어요. 이제 <b>희석 배수를 보정</b>해 원래 식초 속 아세트산 함량을 구해요. 계산에는 한 학생의 <b>모범 자료</b>를 써요.</div>' +
        '<p>계산 사슬: NaOH 평균 소비 부피 → <b>희석 식초의 몰 농도</b>(1 : 1이므로 M × 20.00 = 0.100 × V′) → <b>× 10</b>(원액) → <b>× 60 g/mol</b>(질량 농도 g/L) → <b>÷ 10</b>(g/100 mL). 단계마다 <b>단위</b>가 맞는지 살펴봐요.</p>',
      features: ['calc'],
      setup() { S.gate = ''; S.calc.stage = { A: 0, B: 0 }; S.sample = 'A'; setScene('calc'); refreshCalc(); },
      recap: '희석 식초의 몰 농도에 희석 배수 10을 곱해 원액으로 돌리고, 몰질량 60 g/mol을 곱해 g/L, 10으로 나누어 g/100 mL로 나타내요.',
      summary: '<ul><li>식초 A: 평균 18.0 mL → 희석 0.100 × 18.0 ÷ 20.00 = <b>0.0900 M</b> → 원액 <b>0.900 M</b> → 54.0 g/L → <b>5.40 g/100 mL</b></li><li>식초 B: 평균 15.0 mL → 0.0750 M → 원액 <b>0.750 M</b> → 45.0 g/L → <b>4.50 g/100 mL</b></li><li>희석 배수 10을 곱하지 않으면 값이 <b>10분의 1</b>이 돼요.</li></ul>',
      missions: [
        {
          title: '식초 A 함량 계산',
          goal: '식초 <b>A</b>의 NaOH 소비량(17.9, 18.0, 18.1 mL)으로 계산 사슬 5단계를 차례로 풀어 <b>100 mL당 아세트산의 질량</b>을 구하세요.',
          hint: '평균 18.0 mL → 0.100 × 18.0 ÷ 20.00 = 0.0900 M → × 10 → × 60 → ÷ 10 순서예요. 단위를 확인해요.',
          setup() { S.sample = 'A'; setScene('calc'); refreshCalc(); updateCtl(); },
          check: () => cDone('A'), hold: 0.5,
          status: () => { const st = S.calc.stage.A; return mark(st >= 1) + ' 평균 &nbsp; ' + mark(st >= 2) + ' 희석 M &nbsp; ' + mark(st >= 3) + ' 원액 M &nbsp; ' + mark(st >= 4) + ' g/L &nbsp; ' + mark(st >= 5) + ' g/100 mL'; },
          explain: '평균 (17.9 + 18.0 + 18.1) ÷ 3 = <b>18.0 mL</b> → 희석 식초 0.100 × 18.0 ÷ 20.00 = <b>0.0900 M</b> → 원액 × 10 = <b>0.900 M</b> → × 60 g/mol = <b>54.0 g/L</b> → ÷ 10 = <b>5.40 g/100 mL</b>(밀도를 약 1.0 g/mL로 보면 약 5.4 %)예요.',
        },
        {
          title: '식초 B 함량 계산',
          goal: '사과 식초 <b>B</b>(14.9, 15.0, 15.1 mL)도 같은 방법으로 <b>100 mL당 아세트산의 질량</b>을 구하세요.',
          hint: '평균 15.0 mL → 0.0750 M → 원액 0.750 M → 45.0 g/L → 4.50 g/100 mL예요.',
          setup() { S.sample = 'B'; setScene('calc'); refreshCalc(); updateCtl(); },
          check: () => cDone('B'), hold: 0.5,
          status: () => { const st = S.calc.stage.B; return mark(st >= 1) + ' 평균 &nbsp; ' + mark(st >= 2) + ' 희석 M &nbsp; ' + mark(st >= 3) + ' 원액 M &nbsp; ' + mark(st >= 4) + ' g/L &nbsp; ' + mark(st >= 5) + ' g/100 mL'; },
          explain: '평균 15.0 mL → 0.100 × 15.0 ÷ 20.00 = <b>0.0750 M</b> → 원액 <b>0.750 M</b> → <b>45.0 g/L</b> → <b>4.50 g/100 mL</b>예요. 식초 B는 A보다 묽어요.',
        },
        {
          type: 'quiz', title: '희석 배수를 곱하지 않으면?',
          goal: '식초 A 계산에서 희석 배수 10을 곱하는 단계를 빠뜨리고 계산하면 100 mL당 질량은 얼마로 나올까요?',
          setup() { S.gate = ''; S.sample = 'A'; setScene('calc'); },
          choices: ['5.40 g/100 mL (변함없어요)', '0.54 g/100 mL (참값의 10분의 1)', '54.0 g/100 mL (10배)', '0.054 g/100 mL (100분의 1)'],
          answer: 1,
          feedback: ['곱하기를 빠뜨리면 값이 달라져요. 희석한 용액의 농도가 계산된 것이에요.', '', '곱하지 않았으니 10배가 되지 않아요. 오히려 작아져요.', '10분의 1이에요. 100분의 1이 아니에요.'],
          explain: '희석 식초의 농도 0.0900 M에서 바로 계산하면 5.4 g/L = <b>0.54 g/100 mL</b>로 참값 5.40의 10분의 1이에요. 묽힌 용액의 농도를 <b>원액의 농도로 돌려놓으려면</b> 희석 배수를 꼭 곱해야 해요.',
        },
      ],
    },
    {
      title: '결과 평가: 두 식초 비교', short: '결과 평가', icon: '📊', phase: '확인',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 두 식초의 아세트산 함량을 구했어요(A 5.40, B 4.50 g/100 mL). 이제 결과를 비교하고, 값이 달라질 수 있는 <b>오차 원인</b>과 <b>개선 방안</b>을 생각해 봐요.</div>' +
        '<p>실험 결과는 <b>높게 / 낮게 / 영향 없음</b>으로 오차의 방향을 따져 보고, 두 식초를 비교하는 <b>결론 문장</b>을 완성해요. 병에 적힌 표시값과도 비교해 보는 토의를 해 봐요.</p>',
      features: ['eval'],
      setup() { S.gate = ''; S.eval.sel = ['', '', '', '']; S.eval.more = ''; S.eval.diff = ''; S.eval.lastBad = null; el('cMore').value = ''; el('cDiff').value = ''; [S.eval.bars.a, S.eval.bars.b].forEach((q) => { q.value = 0; q.velocity = 0; q.target = 0; }); setScene('eval'); S.eval.bars.a.target = SAMP.A.g100; S.eval.bars.b.target = SAMP.B.g100; },
      recap: '식초 A(5.40 g/100 mL)가 B(4.50)보다 아세트산이 많아요. 종말점을 지나치거나 다른 산이 있으면 높게, 피펫을 물로 헹구거나 표선을 넘으면 낮게 나와요.',
      summary: '<ul><li>식초 A <b>5.40 g/100 mL</b> > 식초 B <b>4.50 g/100 mL</b> (차이 0.90 g/100 mL)</li><li>높게: 종말점을 지나침, 다른 산 성분 · 낮게: 피펫을 물로 헹굼, 표선을 넘게 물을 넣음</li><li>개선: 한 방울씩 종말점 확인, 사용할 용액으로 헹굼, 표선 정확히 맞추기, 3회 반복해 평균</li><li>NaOH를 15.4 mL 넣었다면 식초 B는 0.100 × 15.4 ÷ 20.00 × 10 × 6.0 = 4.62 g/100 mL로 높게 나와요.</li></ul>',
      missions: [
        {
          title: '오차 방향 분류와 결론 쓰기', manual: true,
          goal: '네 가지 오차 원인이 결과를 <b>높게 / 낮게</b> 하는지 고르고, 결론에서 <b>함량이 더 많은 식초</b>와 두 식초의 <b>차이(g/100 mL)</b>를 쓴 뒤 <b>✔ 확인하기</b>를 누르세요.',
          hint: '시료가 묽어지거나 희석이 더 되면 NaOH가 적게 들어 낮게, NaOH가 더 많이 소비되면 높게 나와요. 차이는 5.40 − 4.50이에요.',
          setup() { S.eval.sel = ['', '', '', '']; S.eval.more = ''; S.eval.diff = ''; S.eval.lastBad = null; el('cMore').value = ''; el('cDiff').value = ''; setScene('eval'); },
          check() {
            const E = S.eval, un = E.sel.findIndex((v) => !v);
            if (un >= 0) return (un + 1) + '번 원인의 영향을 골라 주세요.';
            const bad = CAUSES.findIndex((c, i) => !eCauseOK(i));
            if (bad >= 0) { if (E.lastBad !== bad) { E.lastBad = bad; shakeEl(el('cs' + bad)); } return (bad + 1) + '번 원인을 다시 생각해 보세요. NaOH의 소비량이 많아지는지 적어지는지 따져 봐요.'; }
            if (!E.more) return '결론: 함량이 더 많은 식초를 골라 주세요.';
            if (E.more !== 'A') { if (E.lastBad !== 'm') { E.lastBad = 'm'; shakeEl(el('cMore')); } return '두 식초의 100 mL당 함량(A 5.40, B 4.50)을 비교해 보세요.'; }
            if (!eConclOK()) { if (E.lastBad !== 'd') { E.lastBad = 'd'; shakeEl(el('cDiff')); } return '차이 = 5.40 − 4.50 (g/100 mL)이에요.'; }
            return true;
          },
          explain: '<b>높게</b>: 종말점을 지나침, 아세트산 외의 다른 산 성분. <b>낮게</b>: 피펫을 물로 헹굼, 표선을 넘게 물을 넣음. 식초 A가 B보다 100 mL당 <b>0.90 g</b> 더 많아요. 병에 적힌 표시값과 비교할 때도 이런 오차의 가능성을 함께 생각해야 해요.',
        },
        {
          type: 'quiz', title: 'NaOH를 15.4 mL 넣었다면?',
          goal: '식초 B를 적정할 때 종말점(15.0 mL)을 지나쳐 NaOH를 <b>15.4 mL</b> 넣고 계산하면, 100 mL당 질량은 참값 4.50 g보다 어떻게 될까요?',
          setup() { setScene('eval'); },
          choices: ['4.62 g/100 mL로 더 커요', '4.38 g/100 mL로 더 작아요', '4.50 g/100 mL로 같아요', '0.462 g/100 mL로 훨씬 작아요'],
          answer: 0,
          feedback: ['', 'NaOH를 더 많이 넣었으니 값이 커져요.', '종말점을 지나치면 소비량이 커지므로 결과가 달라져요.', '희석 배수를 곱하지 않은 값이에요. 지나치게 넣으면 오히려 커져요.'],
          explain: 'M = 0.100 × 15.4 ÷ 20.00 = 0.0770 M → 원액 0.770 M → × 60 = 46.2 g/L → <b>4.62 g/100 mL</b>예요. 참값 4.50보다 <b>높게</b> 나와요. 그래서 한 방울씩 종말점을 확인하고 3회 반복해요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hc-vinegar-titration', mount: '#game', badge: '식초 적정 박사', homeHref: '../../index.html#hc',
    featureLabels: { plan: '📝 희석 계획 · 뷰렛 용량 막대', prep: '🧫 홀피펫 · 부피 플라스크 희석', titr: '🧪 가상 뷰렛 · 눈금 확대', calc: '🧮 계산 사슬 카드', eval: '📊 함량 막대 · 오차 카드' },
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
    if (S.mode === 'plan') drawPlan();
    else if (S.mode === 'prep') { prepStep(dt); drawPrep(); }
    else if (S.mode === 'titr') { stepTitr(dt); drawTitrC(); updateTitrCtl(); }
    else if (S.mode === 'calc') drawCalc();
    else { stepEval(dt); drawEval(); }
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(244,241,251,' + S.fade * 0.85 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    readouts();
  });

  window.__sim = {
    S, TT, SAMP, PREP, PIP, VW, VH, GP, LP, LCC, LEV, CAUSES, PLAN_ROWS, tSet, tPrepare, tRecord, tV, tVeq, tE, tRuns, tValid, tMean, tAddDrops, setScene, setSample, flaskGeom, updateCtl,
    get game() { return game; },
  };

})();
