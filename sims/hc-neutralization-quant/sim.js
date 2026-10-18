(function () {
  'use strict';
  const CFG = { tw: 800, th: 560, pw: 480, ph: 700, bg: '#f4f1fb' };
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

  /* ===================== 중화 반응의 양적 관계 [12화학04-03] =====================
     ① 모형: 알짜 이온식(구경꾼 이온)  ② 탐구: 완전 중화(aMV = bM′V′)
     ③ 분석: 남은 이온(농도 · pH, 한 지점씩)  ④ 적용: 폐수 중화
     강산–강염기만 다루고 중화 적정 곡선은 그리지 않아요. 모든 용액은 25 °C. */
  const MODE_LABEL = { ion: '🧩 이온 모형', mol: '⚖️ 완전 중화', rest: '🔬 남은 이온', waste: '🏭 폐수 중화' };
  const LIQ_A = '#ffc4c4', LIQ_B = '#bdd1ff', LIQ_C = '#d6cff6';
  const S = {
    mode: 'ion', t: 0, fade: 0, gate: '',
    ion: { nH: 6, nOH: 6, phase: 'sep', pr: { v: 0 }, queue: [], moved: 0, eq3: { v: 0 } },
    mol: { si: 0, v: [0, 0, 0, 0], ach: [false, false, false, false], neu: [0, 0, 0, 0], col: { t: 0 }, tilt: SPR(0, 90, 8), bH: 0, bOH: 0, dropAcc: 0, lastV: [0, 0, 0, 0], ripples: [] },
    rest: { si: 0, inp: [{ sel: '', c: '', ph: '' }, { sel: '', c: '', ph: '' }], cancel: { v: 0 }, pt: SPR(7, 80, 12), shownPh: 7 },
    waste: { ag: 0, calc: [false, false], ach: [false, false], neu: [0, 0], dose: 0, col: { t: 0 }, lastDose: 0, pt: SPR(2, 80, 12), inpOK: [{}, {}] },
  };
  let game = null;
  const nudgeBtns = {};

  /* ---------- 그리기 도우미: 반응식 한 줄 ---------- */
  function eqRow(cx, y, items, size) {
    ctx.save(); ctx.font = D.font(size, 800);
    const ws = items.map((it) => ctx.measureText(it.t).width), tot = ws.reduce((a, b) => a + b, 0);
    let x = cx - tot / 2; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    items.forEach((it, i) => {
      ctx.globalAlpha = it.a != null ? it.a : 1; ctx.fillStyle = it.c || INK; ctx.fillText(it.t, x, y);
      if (it.x) { ctx.strokeStyle = BAD; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x - 1, y - size * 0.32); ctx.lineTo(x - 1 + (ws[i] + 2) * it.x, y - size * 0.32); ctx.stroke(); }
      x += ws[i];
    });
    ctx.restore();
  }
  const IC = { H: ION['H+'].c, OH: ION['OH-'].c, Na: ION['Na+'].c, Cl: ION['Cl-'].c };
  const dk = (c) => CO.shade(c, -0.15);
  const PL = ' + ', AR = ' → ';

  /* =========================================================
     ① 이온 모형 scene
     ========================================================= */
  const LA = PHONE
    ? { eq: rect(6, 6, 468, 98), A: rect(18, 112, 200, 130), B: rect(262, 112, 200, 130), C: rect(95, 314, 290, 200), leg: rect(6, 522, 468, 172) }
    : { eq: rect(8, 8, 784, 98), A: rect(40, 128, 200, 168), B: rect(560, 128, 200, 168), C: rect(265, 308, 270, 234), legL: rect(8, 348, 240, 200), legR: rect(552, 348, 240, 200) };
  const boxA = new IonBox(rect(0, 0, 10, 10)), boxB = new IonBox(rect(0, 0, 10, 10)), boxC = new IonBox(rect(0, 0, 10, 10));
  function beakerBox(R, level) {
    const bottom = R.y + R.h - 7, surf = R.y + R.h - R.h * level, top = Math.min(surf + 5, bottom - 16);
    return rect(R.x + 8, top, R.w - 16, bottom - top);
  }
  const lvA = () => 0.62 * (1 - smooth(S.ion.pr.v)), lvC = () => 0.65 * smooth(S.ion.pr.v);
  function updateIonBoxes() { boxA.r = beakerBox(LA.A, lvA()); boxB.r = beakerBox(LA.B, lvA()); boxC.r = beakerBox(LA.C, Math.max(lvC(), 0.06)); }
  boxC.onMerge = (x, y) => { parts.burst(x, y, { count: 8, speed: 70, size: 2.6, gravity: 0, life: 0.55, colors: ['#7cc4ff', '#ffffff', '#3867f4'], shape: 'circle' }); Sound.tick(); };
  function resetIon(nH, nOH) {
    cancelTws(); const I = S.ion;
    I.nH = nH; I.nOH = nOH; I.phase = 'sep'; I.pr.v = 0; I.queue = []; I.moved = 0; I.eq3.v = 0;
    boxA.clear(); boxB.clear(); boxC.clear(); parts.clear();
    updateIonBoxes();
    for (let k = 0; k < nH; k++) { boxA.add('H+', { a: 1 }); boxA.add('Cl-', { a: 1 }); }
    for (let k = 0; k < nOH; k++) { boxB.add('Na+', { a: 1 }); boxB.add('OH-', { a: 1 }); }
    updateCtl();
  }
  function pourIon() {
    const I = S.ion; if (I.phase !== 'sep') return;
    I.phase = 'pour'; I.moved = 0;
    const q = boxA.ions.concat(boxB.ions).filter((i) => !i.dying);
    for (let i = q.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = q[i]; q[i] = q[j]; q[j] = t; }
    I.queue = q; Sound.click();
    tw(I.pr, { v: 1 }, { duration: 2.2, ease: 'linear', onDone: () => { I.phase = 'mixed'; updateCtl(); } });
    updateCtl();
  }
  function reactIon() {
    const I = S.ion; if (I.phase !== 'mixed') return;
    I.phase = 'reacting'; Sound.click();
    boxC.react(Math.min(boxC.n('H+'), boxC.n('OH-')), 0.1);
    updateCtl();
  }
  function stepIon(dt) {
    const I = S.ion;
    updateIonBoxes();
    if (I.phase === 'sep') {
      boxA.setCount('H+', I.nH, 1); boxA.setCount('Cl-', I.nH, 1); boxB.setCount('Na+', I.nOH, 1); boxB.setCount('OH-', I.nOH, 1);
    } else if (I.phase === 'pour') {
      const tgt = Math.floor(clamp(I.pr.v / 0.7, 0, 1) * I.queue.length + 1e-9);
      while (I.moved < tgt) {
        const q = I.queue[I.moved++]; if (!q || q.dying) continue;
        q.dying = true; boxC.add(q.kind, { a: 0 });
      }
    } else if (I.phase === 'reacting' && !boxC.pending()) {
      I.phase = 'done'; tw(I.eq3, { v: 1 }, { duration: 0.8 }); Sound.success();
      parts.burst(LA.C.x + LA.C.w / 2, LA.C.y + LA.C.h * 0.5, { count: 14, speed: 120, size: 3, colors: ['#7cc4ff', '#14a058', '#ffb400'] });
      updateCtl();
    }
    boxA.update(dt); boxB.update(dt); boxC.update(dt);
  }
  function drawBeakerLabel(R, name, sub, c) {
    T(R.x + R.w / 2, R.y + R.h + 22, name, 15.5, c || INK, 'center', 800);
    if (sub) T(R.x + R.w / 2, R.y + R.h + 40, sub, 12.5, MUTED, 'center', 700);
  }
  function drawIonEq() {
    const E = LA.eq, I = S.ion, k = I.eq3.v;
    panel(E.x, E.y, E.w, E.h, 14);
    const sz = PHONE ? 15 : 20, lx = E.x + 14, cx = PHONE ? E.x + E.w / 2 + 40 : E.x + E.w / 2 + 50;
    const ys = [E.y + (PHONE ? 26 : 30), E.y + (PHONE ? 56 : 62), E.y + (PHONE ? 86 : 91)];
    ['반응식', '이온식', '알짜 이온식'].forEach((s, i) => T(lx, ys[i], s, PHONE ? 12 : 13.5, i === 2 ? '#0b7a41' : MUTED, 'left', 800));
    eqRow(cx, ys[0], [{ t: 'HCl' }, { t: PL, c: MUTED }, { t: 'NaOH' }, { t: AR, c: VIO }, { t: 'NaCl' }, { t: PL, c: MUTED }, { t: 'H₂O' }], sz);
    const sp = (c) => ({ c: k > 0.05 ? CO.mix(c, '#b7bdd0', k * 0.8) : c, x: k > 0.5 ? clamp((k - 0.5) * 2, 0, 1) : 0 });
    eqRow(cx, ys[1], [{ t: 'H⁺', c: IC.H }, { t: PL, c: MUTED }, Object.assign({ t: 'Cl⁻' }, sp(IC.Cl)), { t: PL, c: MUTED }, Object.assign({ t: 'Na⁺' }, sp(IC.Na)), { t: PL, c: MUTED }, { t: 'OH⁻', c: IC.OH }, { t: AR, c: VIO },
      Object.assign({ t: 'Na⁺' }, sp(IC.Na)), { t: PL, c: MUTED }, Object.assign({ t: 'Cl⁻' }, sp(IC.Cl)), { t: PL, c: MUTED }, { t: 'H₂O' }], sz);
    eqRow(cx, ys[2], [{ t: 'H⁺', c: IC.H, a: 0.2 + 0.8 * k }, { t: PL, c: MUTED, a: 0.2 + 0.8 * k }, { t: 'OH⁻', c: IC.OH, a: 0.2 + 0.8 * k }, { t: AR, c: VIO, a: 0.2 + 0.8 * k }, { t: 'H₂O', a: 0.2 + 0.8 * k }], sz);
    if (k > 0.5 && !PHONE) T(E.x + E.w - 12, E.y + 16, 'Na⁺ · Cl⁻ = 구경꾼 이온 (지워짐)', 12.5, '#b45309', 'right', 800, { alpha: clamp((k - 0.5) * 2, 0, 1) });
  }
  function drawIonScene() {
    const I = S.ion;
    drawIonEq();
    // 비커
    const sA = LA.A, sB = LA.B, c = LA.C;
    D.beaker(sA.x, sA.y, sA.w, sA.h, { level: lvA(), liquid: LIQ_A, t: S.t, wave: 1.2 });
    D.beaker(sB.x, sB.y, sB.w, sB.h, { level: lvA(), liquid: LIQ_B, t: S.t, wave: 1.2 });
    D.beaker(c.x, c.y, c.w, c.h, { level: lvC(), liquid: LIQ_C, t: S.t, wave: 1.5 });
    drawBeakerLabel(sA, 'HCl(aq)', I.phase === 'sep' ? 'H⁺ ' + I.nH + '개 · Cl⁻ ' + I.nH + '개' : '', IC.H);
    drawBeakerLabel(sB, 'NaOH(aq)', I.phase === 'sep' ? 'Na⁺ ' + I.nOH + '개 · OH⁻ ' + I.nOH + '개' : '', IC.OH);
    T(c.x + c.w / 2, c.y - 10, '혼합 용액', 15.5, VIO, 'center', 800);
    // 쏟아지는 줄기
    const pv = I.pr.v, sa = smooth(Math.min(pv / 0.08, 1)) * (1 - smooth((pv - 0.72) / 0.2));
    if (sa > 0.01 && I.phase === 'pour') {
      const surf = c.y + c.h - c.h * Math.max(lvC(), 0.04) + 2;
      const xa = PHONE ? c.x + c.w / 2 - 8 : c.x + 78, xb = PHONE ? c.x + c.w / 2 + 8 : c.x + c.w - 78;
      [[sA.x + sA.w + 6, sA.y + 16, xa, LIQ_A], [sB.x - 6, sB.y + 16, xb, LIQ_B]].forEach(([x0, y0, x1, col]) => {
        ctx.save(); ctx.globalAlpha = sa * 0.85; ctx.strokeStyle = col; ctx.lineWidth = PHONE ? 5 : 7; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo((x0 + x1) / 2 + (x1 > x0 ? 1 : -1) * (PHONE ? 4 : 22), y0 + 12, x1, surf); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
      });
    }
    boxA.draw(); boxB.draw(); boxC.draw();
    // 범례
    const legend = (R, title, rowsFn) => { panel(R.x, R.y, R.w, R.h, 14); T(R.x + 14, R.y + 24, title, 14.5, INK, 'left', 800); rowsFn(R); };
    const species = [['H+', 'H⁺'], ['OH-', 'OH⁻'], ['Na+', 'Na⁺'], ['Cl-', 'Cl⁻'], ['H2O', 'H₂O']];
    const cnt = (k) => boxA.nAll(k) + boxB.nAll(k) + boxC.nAll(k);
    const L1 = PHONE ? LA.leg : LA.legL, L2 = PHONE ? null : LA.legR;
    legend(L1, '용액 속 입자 수 (전체)', (R) => {
      species.forEach(([k, nm], i) => {
        const col = PHONE ? i % 3 : 0, row = PHONE ? Math.floor(i / 3) : i;
        const x = R.x + 28 + col * (PHONE ? 150 : 0), y = R.y + (PHONE ? 62 : 54) + row * (PHONE ? 52 : 31);
        drawIon(k, x, y, { s: 0.85 });
        T(x + 22, y + 5, nm, 15, INK, 'left', 800); T(x + (PHONE ? 100 : 170), y + 5, cnt(k) + '개', 15, INK, 'right', 800);
      });
    });
    if (L2) legend(L2, '알아 두기', (R) => {
      let y = R.y + 48;
      y += textBlock(R.x + 14, y, R.w - 28, '• H⁺ 1개와 OH⁻ 1개가 만나 H₂O 1분자가 돼요.', 14, INK, 20, 800) + 8;
      y += textBlock(R.x + 14, y, R.w - 28, '• Na⁺와 Cl⁻는 반응 전후에 그대로예요.', 14, INK, 20, 800) + 8;
      textBlock(R.x + 14, y, R.w - 28, I.phase === 'done' ? (boxC.n('H+') > 0 ? '→ 산 쪽이 많아 H⁺가 남았어요.' : boxC.n('OH-') > 0 ? '→ 염기 쪽이 많아 OH⁻가 남았어요.' : '→ H⁺와 OH⁻가 모두 H₂O가 됐어요.') : '• 같은 수일 때 서로를 완전히 없애요.', 14, '#0b6b39', 20, 800);
    });
    // 단계 안내
    if (I.phase === 'sep') T(c.x + c.w / 2, c.y + c.h / 2 + 4, '🥣 섞기를 눌러요', 15, MUTED, 'center', 800, { alpha: 0.7 });
  }

  /* =========================================================
     ② 완전 중화 scene (뷰렛 · 플라스크 · 몰수 막대 · 저울)
     ========================================================= */
  const SM = [
    { id: '①', label: '① 0.10 M HCl 20 mL', flask: { kind: 'acid', f: 'HCl', n: 1, M: 0.10, Ms: '0.10', V: 20 }, bur: { f: 'NaOH', n: 1, M: 0.10, Ms: '0.10' }, max: 40, veq: 20 },
    { id: '②', label: '② 0.10 M HCl 20 mL', flask: { kind: 'acid', f: 'HCl', n: 1, M: 0.10, Ms: '0.10', V: 20 }, bur: { f: 'NaOH', n: 1, M: 0.20, Ms: '0.20' }, max: 20, veq: 10 },
    { id: '③', label: '③ 0.10 M H₂SO₄ 10 mL', flask: { kind: 'acid', f: 'H₂SO₄', n: 2, M: 0.10, Ms: '0.10', V: 10 }, bur: { f: 'NaOH', n: 1, M: 0.10, Ms: '0.10' }, max: 40, veq: 20 },
    { id: '④', label: '④ 0.050 M Ca(OH)₂ 20 mL', flask: { kind: 'base', f: 'Ca(OH)₂', n: 2, M: 0.050, Ms: '0.050', V: 20 }, bur: { f: 'HCl', n: 1, M: 0.10, Ms: '0.10' }, max: 40, veq: 20 },
  ];
  SM.forEach((s) => { s.fm = r6(s.flask.n * s.flask.M * s.flask.V); s.veqCalc = r6(s.fm / (s.bur.n * s.bur.M)); });
  function molCalc(i, v) {
    const s = SM[i], f = s.flask, b = s.bur, fm = s.fm, bm = r6(b.n * b.M * v), fu = r6(f.M * f.V), bu = r6(b.M * v);
    const nH = f.kind === 'acid' ? fm : bm, nOH = f.kind === 'acid' ? bm : fm;
    const o = { nH, nOH, fm, bm, H: r6(Math.max(0, nH - nOH)), OH: r6(Math.max(0, nOH - nH)), Na: 0, Cl: 0, Ca: 0, SO4: 0, Vtot: f.V + v };
    if (f.kind === 'acid') { o.Na = bu; if (f.f === 'HCl') o.Cl = fu; else o.SO4 = fu; } else { o.Ca = fu; o.Cl = bu; }
    o.neutral = Math.abs(nH - nOH) < 1e-6;
    o.state = o.neutral ? 1 : nH > nOH ? 0 : 2;
    return o;
  }
  const curV = () => S.mol.v[S.mol.si];
  const LM = PHONE
    ? { eq: rect(6, 6, 468, 104), ap: rect(6, 116, 214, 372), lens: rect(226, 116, 248, 372), bal: rect(6, 494, 468, 200) }
    : { eq: rect(8, 8, 784, 90), ap: rect(8, 106, 264, 446), bal: rect(280, 106, 250, 446), lens: rect(538, 106, 254, 290), leg: rect(538, 404, 254, 148) };
  const boxM = new IonBox(rect(0, 0, 10, 10));
  const ION_UNIT = 0.25;
  const cntU = (x, u) => (x > 1e-9 ? Math.max(1, Math.round(x / u)) : 0);
  boxM.onDie = (q) => { if (q.kind === 'H+' || q.kind === 'OH-') parts.burst(q.x, q.y, { count: 5, speed: 50, size: 2.2, gravity: 0, life: 0.45, colors: ['#7cc4ff', '#fff'] }); };
  function molGeom() {
    const R = LM.ap, cx = R.x + (PHONE ? 118 : 138);
    const y0 = R.y + (PHONE ? 80 : 70), h = PHONE ? 96 : 150;
    const tipY = y0 + h + 44;
    const fw = PHONE ? 118 : 150, fh = PHONE ? 84 : 122, by = R.y + R.h - (PHONE ? 52 : 62);
    return { R, cx, y0, h, tipY, fw, fh, by };
  }
  function molLevel(vtot) { return 0.30 + 0.5 * clamp(vtot / 60, 0, 1); }
  function flaskSurface(g, vtot) { const neckH = g.fh * 0.32; return g.by - (g.fh - neckH) * molLevel(vtot); }
  function stepMol(dt) {
    const M = S.mol, i = M.si, v = M.v[i], c = molCalc(i, v);
    // 색 · 저울 · 막대
    M.col.t = SciSim.approach(M.col.t, c.state, dt, 7);
    M.tilt.target = clamp((c.nOH - c.nH) / 4 * 0.5, -0.4, 0.4); M.tilt.update(dt);
    M.bH = SciSim.approach(M.bH, c.nH, dt, 8); M.bOH = SciSim.approach(M.bOH, c.nOH, dt, 8);
    // 입자
    boxM.r = boxOf(LM.lens, 32, 38);
    boxM.setCount('H+', cntU(c.H, ION_UNIT), 2); boxM.setCount('OH-', cntU(c.OH, ION_UNIT), 2);
    boxM.setCount('Na+', cntU(c.Na, ION_UNIT), 2); boxM.setCount('Cl-', cntU(c.Cl, ION_UNIT), 2);
    boxM.setCount('Ca2+', cntU(c.Ca, ION_UNIT), 2); boxM.setCount('SO4', cntU(c.SO4, ION_UNIT), 2);
    boxM.update(dt);
    // 방울
    const dv = v - M.lastV[i]; M.lastV[i] = v;
    if (dv > 0) M.dropAcc += dv; else if (dv < 0) M.dropAcc = 0;
    const g = molGeom();
    let n = 0;
    while (M.dropAcc >= 0.5 && n < 3) {
      M.dropAcc -= 0.5; n++;
      const sy = flaskSurface(g, c.Vtot);
      parts.emit({ x: g.cx, y: g.tipY - 4, vx: 0, vy: 40, gravity: 900, size: 3.4, life: Math.max(0.12, Math.sqrt(2 * Math.max(10, sy - g.tipY) / 900)), color: SM[i].flask.kind === 'acid' ? '#7aa8ff' : '#ff8f8f', fade: false });
      M.ripples.push({ x: g.cx, y: sy, r: 2, a: 0.8, wait: Math.sqrt(2 * Math.max(10, sy - g.tipY) / 900) });
    }
    M.ripples.forEach((r) => { if (r.wait > 0) r.wait -= dt; else { r.r += dt * 40; r.a -= dt * 1.6; } });
    M.ripples = M.ripples.filter((r) => r.a > 0);
    // 중화 유지 시간
    for (let k = 0; k < 4; k++) {
      const ck = molCalc(k, M.v[k]);
      if (ck.neutral && k === M.si && game && game.phase === 'active') { if (M.neu[k] < 5) M.neu[k] += dt; } else if (!ck.neutral || k !== M.si) M.neu[k] = 0;
      if (M.neu[k] >= 0.6 && !M.ach[k]) {
        M.ach[k] = true;
        const gg = molGeom(); parts.burst(gg.cx, flaskSurface(gg, ck.Vtot) - 20, { count: 16, speed: 130, size: 3.2, colors: ['#4cb86a', '#ffb400', '#fff'] }); Sound.success();
      }
    }
  }
  function drawMolEq(c) {
    const E = LM.eq, s = SM[S.mol.si], f = s.flask, b = s.bur, v = curV();
    panel(E.x, E.y, E.w, E.h, 14);
    const acidSide = f.kind === 'acid' ? { n: f.n, M: f.Ms, V: String(f.V), who: f.f } : { n: b.n, M: b.Ms, V: v.toFixed(1), who: b.f };
    const baseSide = f.kind === 'acid' ? { n: b.n, M: b.Ms, V: v.toFixed(1), who: b.f } : { n: f.n, M: f.Ms, V: String(f.V), who: f.f };
    const sz = PHONE ? 14 : 18, mid = E.x + E.w / 2;
    const half = (cx, label, col, sd, mm) => {
      T(cx, E.y + (PHONE ? 20 : 24), label, PHONE ? 12 : 13.5, col, 'center', 800);
      T(cx, E.y + (PHONE ? 46 : 52), sd.n + ' × ' + sd.M + ' M × ' + sd.V + ' mL', sz, INK, 'center', 800);
      T(cx, E.y + (PHONE ? 74 : 79), '= ' + f2(mm) + ' mmol', sz + 1, col, 'center', 800);
    };
    const qx = PHONE ? 110 : 190;
    half(mid - qx, 'a M V   (산의 H⁺ 몰수)', IC.H, acidSide, c.nH);
    half(mid + qx, 'b M′ V′   (염기의 OH⁻ 몰수)', IC.OH, baseSide, c.nOH);
    const sign = c.neutral ? '=' : c.nH > c.nOH ? '>' : '<';
    ctx.save(); ctx.translate(mid, E.y + E.h / 2 + 4);
    const k = c.neutral ? 1 : 0.9;
    D.sphere(0, 0, PHONE ? 20 : 24, c.neutral ? GOOD : '#9aa3b5', { gloss: true, text: sign, textScale: 1.3 });
    ctx.restore();
  }
  function drawMolApparatus(c) {
    const g = molGeom(), R = g.R, M = S.mol, s = SM[M.si], v = curV();
    panel(R.x, R.y, R.w, R.h, 14);
    if (!PHONE) T(R.x + 14, R.y + 24, '뷰렛과 플라스크', 14.5, INK, 'left', 800);
    // 스탠드
    drawStand(R.x + 26, R.x + 12, g.cx + 74, g.by, g.y0 - 20, g.y0 + 30, g.cx);
    // 뷰렛
    const burCol = s.flask.kind === 'acid' ? '#a9c3ff' : '#ffb3b3';
    drawBurette(g.cx, g.y0, g.h, v, { max: 50, liquid: burCol, w: PHONE ? 22 : 26 });
    D.label(g.cx, g.y0 - 30, s.bur.Ms + ' M ' + s.bur.f, { bg: s.flask.kind === 'acid' ? IC.OH : IC.H, size: PHONE ? 12 : 13.5, pad: 8 });
    T(g.cx + (PHONE ? 20 : 26), g.y0 + g.h + 30, '눈금 ' + v.toFixed(1) + ' mL', PHONE ? 12 : 13.5, INK, 'left', 800);
    // 플라스크
    const lvl = molLevel(c.Vtot), liq = btbColor(M.col.t);
    drawFlaskAt(g.cx, g.by, g.fw, g.fh, lvl, liq, S.t);
    D.label(g.cx, g.by + 24, s.flask.Ms + ' M ' + s.flask.f + ' ' + s.flask.V + ' mL + BTB', { bg: '#475569', size: PHONE ? 11.5 : 12.5, pad: 8 });
    // 파문
    M.ripples.forEach((r) => { if (r.wait > 0) return; ctx.save(); ctx.globalAlpha = r.a; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(r.x, r.y, r.r * 1.4, r.r * 0.45, 0, 0, TAU); ctx.stroke(); ctx.restore(); });
    // 중화 링
    if (c.neutral) D.ring(g.cx, g.by - g.fh * 0.3, g.fw * 0.5 + 6, S.t, { color: GOOD, width: 3 });
    // BTB 설명
    const names = ['산성(노랑)', '중성(초록)', '염기성(파랑)'];
    const cc = [BTB.Y, BTB.G, BTB.B];
    if (PHONE) D.label(R.x + 10, R.y + 20, 'BTB: ' + names[c.state], { bg: cc[c.state], color: c.state === 0 ? '#5b4300' : '#fff', size: 11.5, align: 'left', pad: 7 });
    else D.label(R.x + R.w - 12, R.y + 24, 'BTB: ' + names[c.state], { bg: cc[c.state], color: c.state === 0 ? '#5b4300' : '#fff', size: 12.5, align: 'right', pad: 7 });
  }
  function drawBalance(c, cx, py, Lb, top, baseY, maxH) {
    const M = S.mol, th = M.tilt.value;
    // 받침
    ctx.save(); ctx.fillStyle = '#9ca3af'; ctx.beginPath(); ctx.moveTo(cx - 24, py + 78); ctx.lineTo(cx + 24, py + 78); ctx.lineTo(cx + 5, py); ctx.lineTo(cx - 5, py); ctx.closePath(); ctx.fill();
    D.roundRect(cx - 40, py + 76, 80, 8, 4); ctx.fillStyle = '#6b7280'; ctx.fill(); ctx.restore();
    // 가로대 + 접시
    const ex = Math.cos(th) * Lb, ey = Math.sin(th) * Lb, lx = cx - ex, ly = py - ey, rx = cx + ex, ry = py + ey;
    ctx.save(); ctx.strokeStyle = '#475569'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(rx, ry); ctx.stroke(); ctx.restore();
    [[lx, ly, c.nH, IC.H, 'H⁺'], [rx, ry, c.nOH, IC.OH, 'OH⁻']].forEach(([x, y, val, col, nm]) => {
      const sl = 34;
      ctx.save(); ctx.strokeStyle = '#64748b'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 26, y + sl); ctx.moveTo(x, y); ctx.lineTo(x + 26, y + sl); ctx.stroke(); ctx.restore();
      D.roundRect(x - 32, y + sl, 64, 7, 3); ctx.fillStyle = '#94a3b8'; ctx.fill();
      const hh = (val / 4) * 30;
      if (hh > 0.5) { D.roundRect(x - 18, y + sl - hh, 36, hh, 3); ctx.fillStyle = col; ctx.fill(); }
      T(x, y + sl + 24, nm + ' ' + f2(val), PHONE ? 12 : 13, col, 'center', 800);
    });
    D.sphere(cx, py, 7, '#475569', { gloss: true });
    // 막대
    const bx = [top - 44, top + 44]; // 중심 x
    const vals = [[M.bH, c.nH, IC.H, 'H⁺'], [M.bOH, c.nOH, IC.OH, 'OH⁻']];
    ctx.save(); ctx.strokeStyle = '#d5d9e6'; ctx.lineWidth = 1.2;
    for (let m = 0; m <= 4; m++) { const y = baseY - (m / 4) * maxH; ctx.beginPath(); ctx.moveTo(top - 78, y); ctx.lineTo(top + 78, y); ctx.stroke(); T(top - 82, y + 4, String(m), 11.5, MUTED, 'right', 800); }
    ctx.restore();
    T(top - 82, baseY - maxH - 12, 'mmol', 11.5, MUTED, 'right', 800);
    vals.forEach(([cur, tgt, col, nm], i) => {
      const hh = clamp(cur, 0, 4) / 4 * maxH;
      if (hh > 0.3) { D.shadow(() => { D.roundRect(bx[i] - 23, baseY - hh, 46, hh, 6); ctx.fillStyle = col; ctx.fill(); }, { blur: 5, y: 2 }); }
      T(bx[i], baseY - hh - 8, f2(tgt), PHONE ? 13 : 14, col, 'center', 800);
      T(bx[i], baseY + 18, nm + ' 몰수', 13, col, 'center', 800);
    });
  }
  function drawMolBalance(c) {
    const R = LM.bal; panel(R.x, R.y, R.w, R.h, 14);
    T(R.x + 14, R.y + 24, '⚖️ H⁺ 몰수 vs OH⁻ 몰수', 14.5, INK, 'left', 800);
    if (PHONE) drawBalance(c, R.x + 108, R.y + 68, 74, R.x + 330, R.y + R.h - 34, 120);
    else drawBalance(c, R.x + R.w / 2, R.y + 84, 82, R.x + R.w / 2, R.y + R.h - 36, 168);
    if (c.neutral) D.label(PHONE ? R.x + 108 : R.x + R.w / 2, R.y + R.h - 14, '몰수가 같아요 → 완전 중화', { bg: GOOD, size: 12.5, pad: 9 });
  }
  function drawMolLens(c) {
    const R = LM.lens; lens(R, '입자 모형으로 보기', '플라스크 속');
    boxM.draw();
    T(R.x + R.w / 2, R.y + R.h - 14, '● 1개 ≈ ' + ION_UNIT + ' mmol (0.25 미만도 1개로 표시)', 11.5, MUTED, 'center', 800);
    if (!PHONE) {
      const L = LM.leg; panel(L.x, L.y, L.w, L.h, 14); T(L.x + 14, L.y + 24, '플라스크 속 이온 (mmol)', 14, INK, 'left', 800);
      const rows = [['H+', 'H⁺', c.H], ['OH-', 'OH⁻', c.OH], ['Na+', 'Na⁺', c.Na], ['Cl-', 'Cl⁻', c.Cl], ['Ca2+', 'Ca²⁺', c.Ca], ['SO4', 'SO₄²⁻', c.SO4]].filter((r) => r[2] > 1e-9);
      rows.slice(0, 5).forEach((r, i) => { const y = L.y + 48 + i * 19; drawIon(r[0], L.x + 24, y - 4, { s: 0.55 }); T(L.x + 44, y, r[1], 13.5, INK, 'left', 800); T(L.x + L.w - 16, y, f2(r[2]), 13.5, INK, 'right', 800); });
    }
  }
  function drawMol() {
    const c = molCalc(S.mol.si, curV());
    drawMolEq(c); drawMolApparatus(c); drawMolBalance(c); drawMolLens(c);
  }

  /* =========================================================
     ③ 남은 이온 scene
     ========================================================= */
  const RS = [
    { id: '⑤', acid: { M: 0.10, Ms: '0.10', V: 30 }, base: { M: 0.10, Ms: '0.10', V: 20 } },
    { id: '⑥', acid: { M: 0.10, Ms: '0.10', V: 10 }, base: { M: 0.10, Ms: '0.10', V: 30 } },
    { id: '⑦', acid: { M: 0.10, Ms: '0.10', V: 20 }, base: { M: 0.10, Ms: '0.10', V: 20 } },
  ];
  RS.forEach((r) => {
    r.nH = r6(r.acid.M * r.acid.V); r.nOH = r6(r.base.M * r.base.V); r.Vt = r.acid.V + r.base.V;
    r.H = r6(Math.max(0, r.nH - r.nOH)); r.OH = r6(Math.max(0, r.nOH - r.nH));
    r.Na = r.nOH; r.Cl = r.nH;
    r.cH = r6(r.H / r.Vt); r.cOH = r6(r.OH / r.Vt); r.cNa = r6(r.Na / r.Vt); r.cCl = r6(r.Cl / r.Vt);
    r.rest = r.H > 1e-9 ? 'H' : r.OH > 1e-9 ? 'OH' : 'none';
    r.cRest = r.rest === 'H' ? r.cH : r.rest === 'OH' ? r.cOH : 0;
    r.pOH = r.rest === 'OH' ? -Math.log10(r.cOH) : NaN;
    r.ph = r.rest === 'H' ? -Math.log10(r.cH) : r.rest === 'OH' ? 14 - r.pOH : 7;
  });
  const LR = PHONE
    ? { pre: rect(6, 6, 468, 176), lens: rect(6, 188, 468, 226), tab: rect(6, 420, 468, 274) }
    : { pre: rect(8, 8, 784, 170), lens: rect(8, 186, 384, 366), tab: rect(400, 186, 392, 366) };
  const boxR = new IonBox(rect(0, 0, 10, 10));
  const phTxt = (v) => v.toFixed(2);
  function restOK(i) {
    if (i === 2) return true;
    const r = RS[i], p = S.rest.inp[i]; if (!p) return false;
    return p.sel === r.rest && near(parseNum(p.c), r.cRest, 0.03, 0) && !isNaN(parseNum(p.ph)) && Math.abs(parseNum(p.ph) - r.ph) <= 0.06;
  }
  const restConcOK = (i) => i === 2 || (S.rest.inp[i].sel === RS[i].rest && near(parseNum(S.rest.inp[i].c), RS[i].cRest, 0.03, 0));
  function stepRest(dt) {
    const R = S.rest, r = RS[R.si];
    boxR.r = boxOf(LR.lens, 32, 30);
    boxR.setCount('H+', cntU(r.H, ION_UNIT), 2); boxR.setCount('OH-', cntU(r.OH, ION_UNIT), 2);
    boxR.setCount('Na+', cntU(r.Na, ION_UNIT), 2); boxR.setCount('Cl-', cntU(r.Cl, ION_UNIT), 2);
    boxR.update(dt);
    R.pt.target = restOK(R.si) ? r.ph : 7; R.pt.update(dt);
  }
  function drawRest() {
    const R = S.rest, r = RS[R.si], P = LR.pre;
    panel(P.x, P.y, P.w, P.h, 14);
    T(P.x + 14, P.y + 24, '섞기 전 몰수 (1 mmol = 10⁻³ mol)', 14.5, INK, 'left', 800);
    const sq = PHONE ? 15 : 20, gap = PHONE ? 3 : 4, unit = ION_UNIT, nHs = Math.round(r.nH / unit), nOs = Math.round(r.nOH / unit), pairs = Math.min(nHs, nOs), cv = R.cancel.v;
    const rows = [
      { y: P.y + (PHONE ? 52 : 56), n: nHs, col: IC.H, txt: 'HCl ' + r.acid.Ms + ' M × ' + r.acid.V + ' mL → H⁺ ' + f2(r.nH) + ' mmol', lead: r.H },
      { y: P.y + (PHONE ? 106 : 112), n: nOs, col: IC.OH, txt: 'NaOH ' + r.base.Ms + ' M × ' + r.base.V + ' mL → OH⁻ ' + f2(r.nOH) + ' mmol', lead: r.OH },
    ];
    rows.forEach((row) => {
      T(P.x + 16, row.y - 8, row.txt, PHONE ? 12.5 : 14.5, INK, 'left', 800);
      for (let k = 0; k < row.n; k++) {
        const x = P.x + 16 + k * (sq + gap), y = row.y;
        const matched = k < pairs, a = matched ? 1 - 0.72 * cv : 1;
        ctx.save(); ctx.globalAlpha = a; D.roundRect(x, y, sq, sq, 4); ctx.fillStyle = matched && cv > 0.5 ? '#b7bdd0' : row.col; ctx.fill();
        if (matched && cv > 0.3) { ctx.strokeStyle = '#475569'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 2, y + sq - 3); ctx.lineTo(x + sq - 2, y + 3); ctx.stroke(); }
        ctx.restore();
      }
      if (row.lead > 1e-9 && cv > 0.8) T(P.x + 16 + row.n * (sq + gap) + 8, row.y + sq * 0.8, '← ' + (row.col === IC.H ? 'H⁺' : 'OH⁻') + ' ' + f2(row.lead) + ' mmol 남음', PHONE ? 12 : 14, row.col, 'left', 800);
    });
    T(P.x + 16, P.y + P.h - 14, '■ 1칸 = ' + unit + ' mmol · 같은 수끼리 H⁺ + OH⁻ → H₂O (✕ 표시)', PHONE ? 11.5 : 13, MUTED, 'left', 800);
    // 입자 모형
    const L = LR.lens; lens(L, '섞은 뒤 용액 속 이온 ' + RS[R.si].id, '총 ' + r.Vt + ' mL');
    boxR.draw();
    T(L.x + L.w / 2, L.y + L.h - 11, '● 1개 ≈ ' + unit + ' mmol', 11.5, MUTED, 'center', 800);
    // 표
    const Tb = LR.tab; panel(Tb.x, Tb.y, Tb.w, Tb.h, 14);
    T(Tb.x + 14, Tb.y + 24, '이온의 몰수와 농도 (농도 = 몰수 ÷ 총 부피)', PHONE ? 13 : 14.5, INK, 'left', 800);
    const reveal = restConcOK(R.si);
    const cols = [Tb.x + 16, Tb.x + Tb.w * 0.4, Tb.x + Tb.w * 0.72];
    ['이온', '몰수(mmol)', '농도(M)'].forEach((s, i) => T(cols[i], Tb.y + 52, s, 13, MUTED, 'left', 800));
    const list = [['Na+', 'Na⁺', r.Na, r.cNa], ['Cl-', 'Cl⁻', r.Cl, r.cCl]];
    if (r.rest === 'H') list.push(['H+', 'H⁺', r.H, r.cH]); else if (r.rest === 'OH') list.push(['OH-', 'OH⁻', r.OH, r.cOH]);
    list.forEach((it, i) => {
      const y = Tb.y + 82 + i * (PHONE ? 28 : 32);
      drawIon(it[0], cols[0] + 10, y - 5, { s: 0.6 }); T(cols[0] + 28, y, it[1], 15, INK, 'left', 800);
      T(cols[1], y, f2(it[2]), 15, INK, 'left', 800);
      T(cols[2], y, reveal ? it[3].toFixed(3) : '?', 15, reveal ? INK : MUTED, 'left', 800);
    });
    const yy = Tb.y + 82 + list.length * (PHONE ? 28 : 32) + 6;
    if (r.rest === 'none') T(Tb.x + 16, yy, '남은 H⁺, OH⁻ 없음 (모두 H₂O가 됨)', 13.5, '#0b6b39', 'left', 800);
    if (reveal) {
      const pos = r6(r.cNa + r.cH), neg = r6(r.cCl + r.cOH);
      T(Tb.x + 16, yy + 22, '양전하 합 ' + pos.toFixed(3) + ' M = 음전하 합 ' + neg.toFixed(3) + ' M', 13, '#0b6b39', 'left', 800);
    } else T(Tb.x + 16, yy + 22, r.id === '⑦' ? '' : '남은 이온 · 농도 · pH를 채우면 농도가 나타나요.', 13, MUTED, 'left', 700);
    // pH 눈금
    const bx = Tb.x + 22, bw = Tb.w - 44, by = Tb.y + Tb.h - (PHONE ? 50 : 56);
    const grad = ctx.createLinearGradient(bx, 0, bx + bw, 0); grad.addColorStop(0, '#e2464b'); grad.addColorStop(0.5, '#4cb86a'); grad.addColorStop(1, '#3867f4');
    D.roundRect(bx, by, bw, 14, 7); ctx.fillStyle = grad; ctx.fill();
    [0, 7, 14].forEach((p) => T(bx + (p / 14) * bw, by + 32, String(p), 12.5, MUTED, 'center', 800));
    T(bx - 2, by - 8, 'pH', 12.5, MUTED, 'left', 800);
    if (reveal) {
      const px = bx + clamp(R.pt.value, 0, 14) / 14 * bw;
      ctx.save(); ctx.fillStyle = INK; ctx.beginPath(); ctx.moveTo(px, by + 16); ctx.lineTo(px - 7, by + 30); ctx.lineTo(px + 7, by + 30); ctx.closePath(); ctx.fill(); ctx.restore();
      D.label(bx + bw, by - 10, 'pH = ' + phTxt(r.ph), { bg: INK, size: 13, align: 'right', pad: 8 });
    }
  }

  /* =========================================================
     ④ 폐수 중화 scene
     ========================================================= */
  const WCONF = 10;                       // 폐수 1000 L × 0.010 M = 10 mol H⁺
  const AG = [
    { f: 'NaOH', nm: 'NaOH', Mm: 40, k: 1, mol: 10, g: 400 },
    { f: 'Ca(OH)₂', nm: 'Ca(OH)₂', Mm: 74, k: 2, mol: 5, g: 370 },
  ];
  const wOH = (a, g) => r6(AG[a].k * g / AG[a].Mm);
  function wCalc(a, g) {
    const OH = wOH(a, g), d = r6(WCONF - OH);
    const H = Math.max(0, d), OHleft = Math.max(0, -d);
    const o = { OH, H, OHleft, neutral: Math.abs(d) < 1e-6, state: Math.abs(d) < 1e-6 ? 1 : d > 0 ? 0 : 2 };
    o.mol = r6(g / AG[a].Mm);
    o.ph = o.neutral ? 7 : H > 0 ? -Math.log10(H / 1000) : 14 + Math.log10(OHleft / 1000);
    return o;
  }
  const LW = PHONE
    ? { tank: rect(6, 6, 468, 330), sen: rect(6, 342, 468, 100), tab: rect(6, 448, 468, 246) }
    : { tank: rect(8, 8, 470, 544), sen: rect(486, 8, 306, 170), tab: rect(486, 186, 306, 366) };
  const boxW = new IonBox(rect(0, 0, 10, 10));
  const W_UNIT = 0.5;
  boxW.onDie = (q) => { if (q.kind === 'H+' || q.kind === 'OH-') parts.burst(q.x, q.y, { count: 4, speed: 45, size: 2, gravity: 0, life: 0.4, colors: ['#7cc4ff', '#fff'] }); };
  const wGeom = () => {
    const T0 = LW.tank, x0 = T0.x + 22, x1 = T0.x + T0.w - 22, top = T0.y + (PHONE ? 78 : 118), bot = T0.y + T0.h - (PHONE ? 46 : 70);
    return { x0, x1, top, bot, liq: rect(x0 + 6, top + 6, x1 - x0 - 12, bot - top - 12) };
  };
  function stepWaste(dt) {
    const W = S.waste, c = wCalc(W.ag, W.dose);
    W.col.t = SciSim.approach(W.col.t, c.state, dt, 6);
    boxW.r = wGeom().liq;
    boxW.setCount('H+', cntU(c.H, W_UNIT), 2); boxW.setCount('OH-', cntU(c.OHleft, W_UNIT), 2);
    boxW.setCount('Cl-', WCONF / W_UNIT, 1);
    boxW.setCount('Na+', W.ag === 0 ? cntU(c.mol, W_UNIT) : 0, 2); boxW.setCount('Ca2+', W.ag === 1 ? cntU(c.mol, W_UNIT) : 0, 2);
    boxW.update(dt);
    W.pt.target = c.ph; W.pt.update(dt);
    // 가루 떨어뜨리기
    const dd = W.dose - W.lastDose; W.lastDose = W.dose;
    if (dd > 0 && !RM) {
      const g = wGeom(), n = Math.min(10, 2 + Math.floor(dd / 20));
      for (let i = 0; i < n; i++) parts.emit({ x: (g.x0 + g.x1) / 2 + rnd(-10, 10), y: LW.tank.y + (PHONE ? 44 : 70), vx: rnd(-14, 14), vy: rnd(40, 90), gravity: 500, size: rnd(2, 3.5), life: 0.5, color: '#f8fafc', shape: 'square', fade: true });
    }
    // 중화 유지
    if (c.neutral && game && game.phase === 'active' && W.calc[W.ag]) { if (W.neu[W.ag] < 5) W.neu[W.ag] += dt; } else W.neu[W.ag] = 0;
    for (let a = 0; a < 2; a++) if (W.neu[a] >= 0.6 && !W.ach[a]) { W.ach[a] = true; const g = wGeom(); parts.burst((g.x0 + g.x1) / 2, g.top + 30, { count: 18, speed: 140, size: 3.2, colors: ['#4cb86a', '#ffb400', '#fff'] }); Sound.success(); }
  }
  function drawWaste() {
    const W = S.waste, c = wCalc(W.ag, W.dose), T0 = LW.tank, g = wGeom();
    panel(T0.x, T0.y, T0.w, T0.h, 14);
    T(T0.x + 14, T0.y + 24, '산성 폐수 탱크 1000 L · [H⁺] = 0.010 M', PHONE ? 13 : 14.5, INK, 'left', 800);
    // 투입구
    const cxm = (g.x0 + g.x1) / 2, hy = T0.y + (PHONE ? 38 : 48);
    ctx.save(); ctx.fillStyle = '#94a3b8'; ctx.beginPath(); ctx.moveTo(cxm - 44, hy); ctx.lineTo(cxm + 44, hy); ctx.lineTo(cxm + 10, hy + (PHONE ? 26 : 38)); ctx.lineTo(cxm - 10, hy + (PHONE ? 26 : 38)); ctx.closePath(); ctx.fill(); ctx.restore();
    D.label(cxm, hy + 12, AG[W.ag].nm + ' 가루', { bg: '#475569', size: 12.5, pad: 8 });
    // 탱크
    ctx.save();
    D.roundRect(g.x0, g.top, g.x1 - g.x0, g.bot - g.top, 14); ctx.fillStyle = 'rgba(210,225,240,.35)'; ctx.fill();
    ctx.save(); D.roundRect(g.x0 + 3, g.top + 3, g.x1 - g.x0 - 6, g.bot - g.top - 6, 12); ctx.clip();
    const liq = btbColor(W.col.t); const lg = ctx.createLinearGradient(0, g.top, 0, g.bot); lg.addColorStop(0, CO.rgba(liq, 0.5)); lg.addColorStop(1, CO.rgba(liq, 0.85));
    ctx.fillStyle = lg; ctx.fillRect(g.x0, g.top + 4, g.x1 - g.x0, g.bot - g.top); ctx.restore();
    ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 4; D.roundRect(g.x0, g.top, g.x1 - g.x0, g.bot - g.top, 14); ctx.stroke(); ctx.restore();
    boxW.draw();
    // 범례
    const ly = T0.y + T0.h - (PHONE ? 22 : 34);
    const kinds = ['H+', 'Cl-', W.ag === 0 ? 'Na+' : 'Ca2+', 'OH-'];
    const nmk = { 'H+': 'H⁺', 'Cl-': 'Cl⁻', 'Na+': 'Na⁺', 'Ca2+': 'Ca²⁺', 'OH-': 'OH⁻' };
    kinds.forEach((k, i) => { const x = T0.x + 20 + i * (PHONE ? 76 : 88); drawIon(k, x, ly - 3, { s: 0.6 }); T(x + 14, ly + 2, nmk[k], 13, INK, 'left', 800); });
    T(T0.x + T0.w - 14, ly + 2, '● 1개 = ' + W_UNIT + ' mol', 12.5, MUTED, 'right', 800);
    // 센서
    const Sn = LW.sen; panel(Sn.x, Sn.y, Sn.w, Sn.h, 14);
    T(Sn.x + 14, Sn.y + 24, '🧪 pH 센서', 14.5, INK, 'left', 800);
    const phv = W.pt.value, shown = c.ph;
    const bx = Sn.x + 22, bw = Sn.w - 44, by = Sn.y + Sn.h - (PHONE ? 38 : 50);
    const grad = ctx.createLinearGradient(bx, 0, bx + bw, 0); grad.addColorStop(0, '#e2464b'); grad.addColorStop(0.5, '#4cb86a'); grad.addColorStop(1, '#3867f4');
    D.roundRect(bx, by, bw, 14, 7); ctx.fillStyle = grad; ctx.fill();
    [0, 7, 14].forEach((p) => T(bx + (p / 14) * bw, by + 31, String(p), 12.5, MUTED, 'center', 800));
    const px = bx + clamp(phv, 0, 14) / 14 * bw;
    ctx.save(); ctx.fillStyle = INK; ctx.beginPath(); ctx.moveTo(px, by + 16); ctx.lineTo(px - 7, by + 29); ctx.lineTo(px + 7, by + 29); ctx.closePath(); ctx.fill(); ctx.restore();
    T(Sn.x + Sn.w - 14, Sn.y + (PHONE ? 30 : 46), 'pH ' + shown.toFixed(1), PHONE ? 22 : 30, c.neutral ? '#0b7a41' : INK, 'right', 800);
    T(Sn.x + 14, Sn.y + (PHONE ? 52 : 70), c.neutral ? '중성(pH 7)' : c.state === 0 ? '산성' : '염기성', 14, c.neutral ? '#0b7a41' : MUTED, 'left', 800);
    if (c.neutral) D.ring(Sn.x + Sn.w - 40, Sn.y + 30, 14, S.t, { color: GOOD, width: 2.5 });
    // 표
    const Tb = LW.tab; panel(Tb.x, Tb.y, Tb.w, Tb.h, 14);
    T(Tb.x + 14, Tb.y + 24, '필요한 염기의 양', 14.5, INK, 'left', 800);
    let y = Tb.y + 50;
    T(Tb.x + 14, y, 'H⁺ 몰수 = 0.010 M × 1000 L = ' + (W.inpOK[0].h ? '10 mol' : '?'), 13.5, INK, 'left', 800); y += 28;
    AG.forEach((a, i) => {
      const ok = W.calc[i];
      ctx.save(); if (i === W.ag) { D.roundRect(Tb.x + 8, y - 20, Tb.w - 16, 74, 10); ctx.fillStyle = '#f3efff'; ctx.fill(); } ctx.restore();
      T(Tb.x + 16, y, a.nm + ' (' + a.Mm + ' g/mol, OH⁻ ' + a.k + '개씩)', 13.5, INK, 'left', 800);
      T(Tb.x + 16, y + 22, '필요: ' + (ok ? a.mol + ' mol' : '? mol') + ' = ' + (ok ? a.g + ' g' : '? g'), 14, ok ? '#0b6b39' : MUTED, 'left', 800);
      T(Tb.x + 16, y + 44, W.ach[i] ? '✅ 중화 완료 (pH 7)' : '', 13, '#0b6b39', 'left', 800);
      y += 82;
    });
    T(Tb.x + 14, Tb.y + Tb.h - 30, '지금 ' + AG[W.ag].nm + ' ' + W.dose + ' g → OH⁻ ' + fT(c.OH, 2) + ' mol 넣음', 13.5, INK, 'left', 800);
    T(Tb.x + 14, Tb.y + Tb.h - 10, '남은 H⁺ ' + fT(c.H, 2) + ' mol' + (c.OHleft > 1e-6 ? ' · 남은 OH⁻ ' + fT(c.OHleft, 2) + ' mol' : ''), 13.5, c.neutral ? '#0b6b39' : INK, 'left', 800);
  }

  /* ---------- 컨트롤 연결 ---------- */
  const el = (id) => document.getElementById(id);
  function setScene(mode) {
    if (S.mode !== mode) { S.fade = 1; parts.clear(); }
    S.mode = mode; $('#tbLabel').textContent = MODE_LABEL[mode];
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
    const I = S.ion;
    el('nHnum').textContent = I.nH; el('nOHnum').textContent = I.nOH;
    ['hMinus', 'hPlus', 'ohMinus', 'ohPlus'].forEach((id) => { el(id).disabled = I.phase !== 'sep'; });
    el('hMinus').disabled = I.phase !== 'sep' || I.nH <= 1; el('hPlus').disabled = I.phase !== 'sep' || I.nH >= 8;
    el('ohMinus').disabled = I.phase !== 'sep' || I.nOH <= 1; el('ohPlus').disabled = I.phase !== 'sep' || I.nOH >= 8;
    el('bMix').disabled = I.phase !== 'sep'; el('bReact').disabled = I.phase !== 'mixed';
    // 완전 중화
    const M = S.mol, s = SM[M.si];
    refreshChips(el('smChips'), M.si, (i) => M.ach[i]);
    const rg = el('vRange'); rg.max = s.max; rg.value = M.v[M.si]; vBind.refresh();
    el('vHead').textContent = '💧 뷰렛에서 넣은 ' + s.bur.f + ' (' + s.bur.Ms + ' M) 부피';
    el('vMinus').disabled = M.v[M.si] <= 0; el('vPlus').disabled = M.v[M.si] >= s.max;
    el('vNote').textContent = '0 ~ ' + s.max + ' mL · 0.5 mL씩. 뷰렛 눈금을 되돌리면 처음부터 다시 넣은 것으로 봐요.';
    // 남은 이온
    const R = S.rest;
    refreshChips(el('rsChips'), R.si, (i) => (i === 2 ? false : restOK(i)));
    el('rsInputs').hidden = el('rsInputs').hidden || R.si === 2;
    el('rsNeutral').hidden = el('rsNeutral').hidden || R.si !== 2;
    const ip = R.inp[R.si] || { sel: '', c: '', ph: '' };
    el('rsSel').value = ip.sel; el('rsC').value = ip.c; el('rsPh').value = ip.ph;
    el('rsCLab').textContent = ip.sel === 'OH' ? '[OH⁻] 농도' : '[H⁺] 농도';
    // 폐수
    const W = S.waste;
    refreshChips(el('agChips'), W.ag, (i) => W.ach[i]);
    el('wDose').hidden = el('wDose').hidden || !W.calc[W.ag];
    el('wCalcBox').hidden = el('wCalcBox').hidden || W.calc[W.ag];
    el('wMinus').disabled = W.dose <= 0; el('wPlus').disabled = W.dose >= 500;
    if (W.calc[W.ag]) { el('wRange').value = W.dose; wBind.refresh(); }
  }
  // 입자 수 조절
  const setN = (k, d) => { const I = S.ion; if (I.phase !== 'sep') return; I[k] = clamp(I[k] + d, 1, 8); Sound.click(); updateCtl(); };
  el('hMinus').addEventListener('click', () => setN('nH', -1)); el('hPlus').addEventListener('click', () => setN('nH', 1));
  el('ohMinus').addEventListener('click', () => setN('nOH', -1)); el('ohPlus').addEventListener('click', () => setN('nOH', 1));
  el('bMix').addEventListener('click', pourIon); el('bReact').addEventListener('click', reactIon);
  el('bRedoIon').addEventListener('click', () => { Sound.click(); resetIon(S.ion.nH, S.ion.nOH); });
  SciSim.pointer(view, {
    down(p) {
      const I = S.ion;
      if (S.mode === 'ion' && I.phase !== 'sep' && I.phase !== 'pour') { const q = boxC.pick(p); if (q && !q.pair) { q.mark = !q.mark; Sound.click(); } }
      return false;
    },
    hover(p) { return S.mode === 'ion' && S.ion.phase !== 'sep' && S.ion.phase !== 'pour' && boxC.pick(p) ? 'pointer' : 'default'; },
  });
  // 완전 중화
  chipsTo(el('smChips'), SM.map((s) => s.id + ' ' + (s.flask.f === 'Ca(OH)₂' ? 'Ca(OH)₂' : s.flask.f)), 0, (i) => { S.mol.si = i; updateCtl(); }, (i) => S.mol.ach[i]);
  const vBind = SciSim.bindRange(el('vRange'), el('vOut'), (v) => (+v).toFixed(1) + ' mL', (v) => { S.mol.v[S.mol.si] = v; updateCtl(); });
  const nudgeV = (d) => { const M = S.mol, s = SM[M.si]; M.v[M.si] = clamp(r6(M.v[M.si] + d), 0, s.max); Sound.tick(); updateCtl(); };
  el('vMinus').addEventListener('click', () => nudgeV(-0.5)); el('vPlus').addEventListener('click', () => nudgeV(0.5));
  // 남은 이온
  chipsTo(el('rsChips'), RS.map((r) => r.id + ' ' + (r.id === '⑦' ? '완전 중화' : r.id === '⑤' ? '산 과량' : '염기 과량')), 0, (i) => { S.rest.si = i; S.rest.cancel.v = 0; tw(S.rest.cancel, { v: 1 }, { duration: 1.0, delay: 0.3 }); updateCtl(); }, () => false);
  ['rsSel', 'rsC', 'rsPh'].forEach((id) => el(id).addEventListener('input', () => {
    const R = S.rest, ip = R.inp[R.si]; if (!ip) return;
    ip.sel = el('rsSel').value; ip.c = el('rsC').value; ip.ph = el('rsPh').value;
    el('rsCLab').textContent = ip.sel === 'OH' ? '[OH⁻] 농도' : '[H⁺] 농도';
    el(id).classList.remove('bad', 'ok');
    refreshChips(el('rsChips'), R.si, (i) => (i === 2 ? false : restOK(i)));
  }));
  // 폐수
  chipsTo(el('agChips'), AG.map((a) => a.nm), 0, (i) => { S.waste.ag = i; S.waste.dose = 0; S.waste.lastDose = 0; ['wH', 'wMol', 'wG'].forEach((k) => { el(k).value = ''; el(k).classList.remove('ok', 'bad'); }); updateCtl(); }, (i) => S.waste.ach[i]);
  const wBind = SciSim.bindRange(el('wRange'), el('wOut'), (v) => v + ' g', (v) => { S.waste.dose = v; updateCtl(); });
  const nudgeW = (d) => { const W = S.waste; W.dose = clamp(W.dose + d, 0, 500); Sound.tick(); updateCtl(); };
  el('wMinus').addEventListener('click', () => nudgeW(-10)); el('wPlus').addEventListener('click', () => nudgeW(10));
  function checkWaste() {
    const W = S.waste, a = W.ag, A = AG[a];
    const vh = parseNum(el('wH').value), vm = parseNum(el('wMol').value), vg = parseNum(el('wG').value);
    const okH = near(vh, WCONF, 0.01, 0), okM = near(vm, A.mol, 0.01, 0), okG = near(vg, A.g, 0.01, 0);
    [['wH', okH], ['wMol', okM], ['wG', okG]].forEach(([id, ok]) => { const n = el(id); n.classList.toggle('ok', ok); if (!ok) shakeEl(n); else n.classList.remove('bad'); });
    if (okH && okM && okG) {
      W.calc[a] = true; W.inpOK[0].h = true; Sound.success();
      parts.burst(LW.tab.x + LW.tab.w / 2, LW.tab.y + 80, { count: 12, speed: 110, size: 3, colors: ['#8b5cf6', '#14a058', '#ffb400'] });
      showHint(A.nm + ' ' + A.mol + ' mol = ' + A.g + ' g이 필요해요. 이제 투입량을 조절해 pH 7을 만들어요.', 4500);
    } else {
      Sound.fail();
      let m = '';
      if (!okH) m = 'H⁺ 몰수 = 농도 × 부피 = 0.010 M × 1000 L를 계산해요.';
      else if (!okM) m = a === 0 ? 'NaOH는 OH⁻를 1개씩 내놓으니 필요한 NaOH의 몰수 = H⁺ 몰수예요.' : 'Ca(OH)₂는 OH⁻를 2개씩 내놓으니 필요한 몰수는 H⁺ 몰수의 절반이에요.';
      else m = '질량 = 몰수 × 몰질량(' + A.Mm + ' g/mol)이에요.';
      showHint(m, 5200);
    }
    updateCtl();
  }
  el('wCheck').addEventListener('click', checkWaste);
  ['wH', 'wMol', 'wG'].forEach((id) => el(id).addEventListener('keydown', (e) => { if (e.key === 'Enter') checkWaste(); }));

  function resetWaste() {
    const W = S.waste; W.ag = 0; W.dose = 0; W.lastDose = 0; W.calc = [false, false]; W.ach = [false, false]; W.neu = [0, 0]; W.inpOK = [{}, {}];
    ['wH', 'wMol', 'wG'].forEach((k) => { el(k).value = ''; el(k).classList.remove('ok', 'bad'); });
    el('wRange').value = 0; wBind.refresh();
  }
  function resetMolPair() { const M = S.mol; [2, 3].forEach((k) => { M.ach[k] = false; M.neu[k] = 0; M.v[k] = 0; M.lastV[k] = 0; }); }

  /* ---------- 읽음 칸 ---------- */
  function readouts() {
    if (S.mode === 'ion') {
      const I = S.ion; setRO(1, 'HCl 쪽 H⁺', I.nH + '개'); setRO(2, 'NaOH 쪽 OH⁻', I.nOH + '개');
      setRO(3, '생긴 H₂O', boxC.nAll('H2O') + '분자');
    } else if (S.mode === 'mol') {
      const M = S.mol, c = molCalc(M.si, curV());
      setRO(1, '넣은 부피', curV().toFixed(1) + ' mL'); setRO(2, 'H⁺ / OH⁻ 몰수', f2(c.nH) + ' / ' + f2(c.nOH) + ' mmol');
      setRO(3, '액성 (BTB)', c.neutral ? '중성 · 초록' : c.state === 0 ? '산성 · 노랑' : '염기성 · 파랑');
    } else if (S.mode === 'rest') {
      const R = S.rest, r = RS[R.si], ok = restOK(R.si);
      setRO(1, '총 부피', r.Vt + ' mL'); setRO(2, '남은 이온', r.rest === 'H' ? 'H⁺ ' + f2(r.H) + ' mmol' : r.rest === 'OH' ? 'OH⁻ ' + f2(r.OH) + ' mmol' : '없음');
      setRO(3, 'pH', ok ? phTxt(r.ph) : '?');
    } else {
      const W = S.waste, c = wCalc(W.ag, W.dose);
      setRO(1, '투입한 ' + AG[W.ag].nm, W.dose + ' g'); setRO(2, '남은 H⁺', fT(c.H, 2) + ' mol'); setRO(3, 'pH', c.ph.toFixed(1));
    }
  }

  /* ================= 미션 ================= */
  const R5 = RS[0], R6 = RS[1], R7 = RS[2];
  const caseTxt = (r) => fT(r.cNa, 3) + ' + ' + fT(r.cH, 3);
  const levels = [
    {
      title: '알짜 이온식: 구경꾼 이온', short: '알짜 이온식', icon: '🧩', phase: '모형',
      intro: '<p class="si-q">❓ 탐구 질문: 산과 염기는 어떤 비로 만나야 서로를 완전히 없앨까? 섞은 뒤 용액 속에는 무엇이 남을까?</p>' +
        '<div class="si-link">🔗 <b>통합과학2에서</b> 산과 염기를 섞으면 서로의 성질을 잃는 중화 반응(H⁺ + OH⁻ → H₂O)이 일어나는 것을 색과 온도 변화로 봤어요. 이제 <b>이온의 개수와 몰수</b>로 따져 봐요.</div>' +
        '<p>염산(HCl)과 수산화 나트륨(NaOH)은 물에서 거의 모두 이온으로 갈라지는 <b>강산 · 강염기</b>예요. 두 용액을 섞으면 어느 이온이 반응하고, 어느 이온은 가만히 있을까요? (이 차시는 강산과 강염기의 중화만 다뤄요.)</p>',
      features: ['ion'],
      setup() { resetIon(6, 6); setScene('ion'); },
      recap: '중화 반응에서 실제로 반응하는 것은 H⁺ + OH⁻ → H₂O뿐이고, Na⁺와 Cl⁻ 같은 구경꾼 이온은 변하지 않아요.',
      summary: '<ul><li>HCl + NaOH → NaCl + H₂O (반응식)</li><li>H⁺ + Cl⁻ + Na⁺ + OH⁻ → Na⁺ + Cl⁻ + H₂O (이온식)</li><li><b>알짜 이온 반응식: H⁺ + OH⁻ → H₂O</b></li><li>반응에 참여하지 않는 Na⁺, Cl⁻는 <b>구경꾼 이온</b>이에요.</li><li>H⁺와 OH⁻는 1 : 1의 개수로 만나므로, 개수(몰수)가 같을 때 서로를 모두 없애요.</li></ul>',
      missions: [
        {
          title: '구경꾼 이온 찾기', manual: true,
          goal: '<b>🥣 섞기</b>를 누른 뒤, 반응하지 않고 그대로 있는 이온을 <b>모두 눌러 표시</b>하고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '반응해서 H₂O가 되는 이온은 H⁺와 OH⁻예요. 나머지 두 종류의 이온을 눌러 보세요. (⚡ 반응 보기로 확인할 수 있어요.)',
          setup() { resetIon(6, 6); setScene('ion'); },
          check() {
            const I = S.ion;
            if (I.phase === 'sep' || I.phase === 'pour') return '먼저 🥣 섞기를 눌러 두 용액을 섞어 보세요.';
            const al = boxC.ions.filter((q) => !q.dying);
            const mk = al.filter((q) => q.mark);
            if (!mk.length) return '섞은 용액 속 이온을 눌러 구경꾼 이온을 표시해 보세요.';
            if (mk.some((q) => q.kind === 'H+' || q.kind === 'OH-')) return 'H⁺와 OH⁻는 서로 만나 H₂O가 되니까 구경꾼이 아니에요.';
            if (mk.some((q) => q.kind === 'H2O')) return 'H₂O는 반응으로 새로 생긴 분자예요. 구경꾼 이온은 반응 전후에 변함없는 이온이에요.';
            const need = al.filter((q) => q.kind === 'Na+' || q.kind === 'Cl-');
            if (mk.length < need.length) return 'Na⁺와 Cl⁻를 하나도 빠짐없이 표시해요. (지금 ' + mk.length + '개 / ' + need.length + '개)';
            return true;
          },
          explain: 'Na⁺와 Cl⁻는 반응 전후에 모양도 개수도 그대로예요. 이렇게 반응에 참여하지 않는 이온을 <b>구경꾼 이온</b>이라고 해요. 실제로 일어난 변화는 <b>H⁺ + OH⁻ → H₂O</b> 하나뿐이고, 이것을 알짜 이온 반응식이라고 해요.',
        },
        {
          title: '입자 수 맞추기',
          goal: 'HCl 쪽과 NaOH 쪽 입자 수를 조절해 <b>H⁺ 6개와 OH⁻ 6개</b>로 맞춘 뒤, 섞고 반응시키세요. 남는 H⁺와 OH⁻가 없어야 해요.',
          hint: '➕ ➖로 HCl 쪽 H⁺를 6개, NaOH 쪽 OH⁻를 6개로 맞춰요. 그다음 🥣 섞기 → ⚡ 반응 보기 순서로 눌러요.',
          setup() { resetIon(4, 6); setScene('ion'); },
          check: () => S.ion.phase === 'done' && S.ion.nH === 6 && S.ion.nOH === 6 && boxC.n('H+') === 0 && boxC.n('OH-') === 0,
          hold: 0.8,
          status: () => { const I = S.ion; return mark(I.nH === 6) + ' H⁺ 6개 &nbsp; ' + mark(I.nOH === 6) + ' OH⁻ 6개 &nbsp; ' + mark(I.phase === 'done' && boxC.n('H+') === 0 && boxC.n('OH-') === 0) + ' 남는 이온 없이 H₂O'; },
          explain: 'H⁺ 6개와 OH⁻ 6개가 1 : 1로 만나 H₂O 6분자가 되었어요. 한쪽이 더 많으면 반응하지 못한 이온이 남아요. 산과 염기는 <b>H⁺와 OH⁻의 개수(몰수)가 같을 때</b> 서로를 완전히 없애요.',
        },
        {
          type: 'quiz', title: '산의 음이온과 염기의 양이온',
          goal: '중화 반응에서 산의 음이온(Cl⁻)과 염기의 양이온(Na⁺)은 어떤 역할을 할까요?',
          setup() { setScene('ion'); },
          choices: ['H⁺와 OH⁻가 만나도록 돕는 촉매예요', '반응에 참여하지 않고 용액 속에 그대로 남아 있어요', 'H⁺, OH⁻와 결합해 H₂O를 만들어요', '반응하면서 모두 없어져요'],
          answer: 1,
          feedback: ['촉매가 아니에요. 이 이온들은 반응 과정에 아무 역할도 하지 않아요.', '', 'H₂O를 만드는 것은 H⁺와 OH⁻뿐이에요.', '입자 모형에서 Na⁺와 Cl⁻의 개수는 반응 전후에 그대로였어요.'],
          explain: 'Na⁺와 Cl⁻는 <b>구경꾼 이온</b>이라서 용액 속에 그대로 남아 있어요. 물을 증발시키면 이 이온들이 결합해 염(NaCl)이 얻어져요.',
        },
      ],
    },
    {
      title: '완전 중화: a M V = b M′ V′', short: '완전 중화', icon: '⚖️', phase: '탐구',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> H⁺와 OH⁻가 1 : 1로 만나는 것을 입자 모형으로 봤어요. 그러면 <b>얼마만큼</b> 섞어야 개수(몰수)가 같아질까요?</div>' +
        '<p>몰수는 <b>몰 농도(M) × 부피(L)</b>예요. 부피를 mL로 쓰면 mmol(= 10⁻³ mol)이 돼요. 그리고 H₂SO₄처럼 H⁺를 2개씩 내놓는 산이나 Ca(OH)₂처럼 OH⁻를 2개씩 내놓는 염기는 <b>2를 곱해야</b> 해요.</p>' +
        '<p>완전 중화 조건: <b>산이 내놓은 H⁺ 몰수 = 염기가 내놓은 OH⁻ 몰수</b>, 즉 <b>a M V = b M′ V′</b> (a, b = 산의 H⁺ 수, 염기의 OH⁻ 수). BTB 용액은 산성에서 노랑, 중성에서 초록, 염기성에서 파랑이에요.</p>',
      features: ['mol'],
      setup() { S.mol.si = 0; S.mol.v = [0, 0, 0, 0]; S.mol.ach = [false, false, false, false]; S.mol.neu = [0, 0, 0, 0]; S.mol.lastV = [0, 0, 0, 0]; setScene('mol'); },
      recap: '완전 중화는 H⁺ 몰수 = OH⁻ 몰수일 때예요. a M V = b M′ V′이고, 2가 산 · 2가 염기는 2를 곱해요.',
      summary: '<ul><li>중화 반응의 양적 관계: <b>산의 H⁺ 몰수 = 염기의 OH⁻ 몰수</b> → <b>a M V = b M′ V′</b></li><li>② 0.10 M HCl 20 mL + 0.20 M NaOH: 1 × 0.10 × 20 = 1 × 0.20 × V′ → <b>V′ = 10 mL</b></li><li>③ 0.10 M H₂SO₄ 10 mL: 2 × 0.10 × 10 = 2.0 mmol → 0.10 M NaOH <b>20 mL</b></li><li>④ 0.050 M Ca(OH)₂ 20 mL: 2 × 0.050 × 20 = 2.0 mmol → 0.10 M HCl <b>20 mL</b></li><li>완전 중화에서 BTB는 초록색이고, 강산과 강염기의 중화는 pH 7(25 °C)이에요.</li></ul>',
      missions: [
        {
          title: '② 완전 중화 부피 찾기',
          goal: '시료 <b>②</b>(0.10 M HCl 20 mL를 <b>0.20 M NaOH</b>로 적정)를 고르고, 두 몰수가 같아져 BTB가 <b>초록색</b>이 되는 NaOH 부피를 찾으세요.',
          hint: 'H⁺ 몰수는 0.10 × 20 = 2.0 mmol이에요. OH⁻ 몰수 0.20 × V가 2.0 mmol이 되는 V를 찾아요. (슬라이더는 0.5 mL씩 움직여요.)',
          setup() { S.mol.si = 0; setScene('mol'); },
          check: () => S.mol.si === 1 && molCalc(1, S.mol.v[1]).neutral,
          hold: 0.8,
          status: () => { const M = S.mol; return mark(M.si === 1) + ' 시료 ② &nbsp; ' + mark(M.si === 1 && M.v[1] === 10) + ' 10 mL &nbsp; ' + mark(M.si === 1 && molCalc(1, M.v[1]).neutral) + ' 몰수 같음 · BTB 초록'; },
          explain: '1 × 0.10 × 20 = 1 × 0.20 × V′ → <b>V′ = 10 mL</b>. NaOH가 더 진해서 절반의 부피로 같은 OH⁻ 몰수(2.0 mmol)가 돼요. 10 mL보다 적으면 H⁺가 남아 노랑, 많으면 OH⁻가 남아 파랑이에요.',
        },
        {
          title: '③ ④ 2가 산 · 2가 염기',
          goal: '시료 <b>③</b>(H₂SO₄)과 <b>④</b>(Ca(OH)₂)도 BTB가 초록색이 되는 부피를 각각 찾으세요.',
          hint: '③은 H₂SO₄가 H⁺를 2개씩 내놓아 2 × 0.10 × 10 = 2.0 mmol이에요. ④는 Ca(OH)₂가 OH⁻를 2개씩 내놓아 2 × 0.050 × 20 = 2.0 mmol이에요.',
          setup() { resetMolPair(); S.mol.si = 2; setScene('mol'); },
          check: () => S.mol.ach[2] && S.mol.ach[3],
          hold: 0.2,
          status: () => mark(S.mol.ach[2]) + ' ③ 완전 중화 &nbsp; ' + mark(S.mol.ach[3]) + ' ④ 완전 중화',
          explain: '③ 2 × 0.10 × 10 = 1 × 0.10 × V′ → <b>V′ = 20 mL</b>. ④ 1 × 0.10 × V = 2 × 0.050 × 20 → <b>V = 20 mL</b>. 2가 산이나 2가 염기의 H⁺, OH⁻ 몰수를 구할 때는 <b>2를 곱해요</b>.',
        },
        {
          type: 'quiz', title: 'H₂SO₄ 10 mL를 중화하는 NaOH',
          goal: '0.10 M H₂SO₄ 10 mL를 완전히 중화하는 0.10 M NaOH의 부피가 20 mL인 까닭은?',
          setup() { S.mol.si = 2; setScene('mol'); },
          choices: ['H₂SO₄ 1개가 H⁺ 2개를 내놓아서 H⁺ 몰수가 2배(2.0 mmol)이기 때문이에요', 'H₂SO₄가 NaOH보다 약한 산이기 때문이에요', '황산이 물을 흡수하기 때문이에요', 'NaOH가 H₂SO₄보다 질량이 작기 때문이에요'],
          answer: 0,
          feedback: ['', 'H₂SO₄는 강산이에요. 몰수를 비교할 때는 산의 세기가 아니라 내놓은 H⁺의 개수가 중요해요.', '물 흡수와 중화 반응의 양적 관계는 상관이 없어요.', '질량이 아니라 H⁺와 OH⁻의 몰수가 같아야 해요.'],
          explain: 'H₂SO₄ 0.10 M × 10 mL = 1.0 mmol인데 H⁺는 2개씩이라 <b>H⁺ 2.0 mmol</b>이에요. NaOH 0.10 M × V′가 2.0 mmol이 되려면 V′ = 20 mL예요.',
        },
      ],
    },
    {
      title: '남은 이온: 농도와 pH', short: '남은 이온', icon: '🔬', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> H⁺ 몰수와 OH⁻ 몰수가 같을 때 완전 중화되는 것을 확인했어요. 이번에는 <b>한쪽이 더 많은</b> 혼합 용액에서 어느 이온이 남는지 찾고, 총 부피로 나누어 농도와 pH를 구해요.</div>' +
        '<p>이온의 농도는 <b>몰수 ÷ 섞은 뒤의 총 부피</b>예요. (1 mmol ÷ 1 mL = 1 M) pH = −log[H⁺]이고, 염기성이 남으면 pOH = −log[OH⁻], <b>pH = 14 − pOH</b>예요(25 °C). log 2 ≈ 0.30을 써요.</p>' +
        '<p>pH–부피 그래프는 그리지 않고, 몇 개의 지점에서만 계산해요.</p>',
      features: ['rest'],
      setup() { S.rest.si = 0; S.rest.cancel.v = 0; tw(S.rest.cancel, { v: 1 }, { duration: 1.0, delay: 0.4 }); setScene('rest'); },
      recap: '남은 이온의 몰수를 총 부피로 나눈 것이 농도예요. 산이 남으면 pH = −log[H⁺], 염기가 남으면 pH = 14 − pOH이고, 완전 중화한 강산–강염기 용액은 pH 7이에요.',
      summary: '<ul><li>⑤ 0.10 M HCl 30 mL + 0.10 M NaOH 20 mL: H⁺ 1.0 mmol 남음, 총 50 mL → [H⁺] = <b>0.020 M</b>, pH = 2 − log 2 = <b>1.70</b> (Na⁺ 0.040, Cl⁻ 0.060 M)</li><li>⑥ 0.10 M HCl 10 mL + 0.10 M NaOH 30 mL: OH⁻ 2.0 mmol 남음, 총 40 mL → [OH⁻] = <b>0.050 M</b>, pOH 1.30, pH = <b>12.70</b> (Na⁺ 0.075, Cl⁻ 0.025 M)</li><li>⑦ 완전 중화: Na⁺, Cl⁻만 남고 <b>pH 7</b></li><li>양전하 농도의 합 = 음전하 농도의 합</li></ul>',
      missions: [
        {
          title: '⑤ ⑥ 남은 이온과 pH', manual: true,
          goal: '시료 <b>⑤</b>와 <b>⑥</b>에서 <b>남은 이온 · 그 농도(M) · pH</b>를 채우세요. 모두 맞으면 <b>✔ 확인하기</b>를 누르세요.',
          hint: '⑤는 H⁺ 3.0 − OH⁻ 2.0 = 1.0 mmol이 남아 총 50 mL로 나눠요. ⑥은 OH⁻가 남아 pOH를 먼저 구하고 pH = 14 − pOH예요. log 2 ≈ 0.30이에요.',
          setup() { S.rest.inp = [{ sel: '', c: '', ph: '' }, { sel: '', c: '', ph: '' }]; S.rest.si = 0; setScene('rest'); },
          check() {
            for (let i = 0; i < 2; i++) {
              if (restOK(i)) continue;
              const r = RS[i], p = S.rest.inp[i], tag = r.id + ' 시료: ';
              if (!p.sel) return tag + '남은 이온을 골라요.';
              if (p.sel !== r.rest) return tag + (r.rest === 'H' ? '산(H⁺)이 더 많이 들어갔어요. 남은 이온을 다시 골라요.' : '염기(OH⁻)가 더 많이 들어갔어요. 남은 이온을 다시 골라요.');
              const c = parseNum(p.c);
              if (isNaN(c)) return tag + '남은 이온의 농도(M)를 써요.';
              if (!near(c, r.cRest, 0.03, 0)) return tag + '농도 = 남은 몰수 ' + f2(r.rest === 'H' ? r.H : r.OH) + ' mmol ÷ 총 부피 ' + r.Vt + ' mL로 계산해요. (1 mmol ÷ 1 mL = 1 M)';
              const ph = parseNum(p.ph);
              if (isNaN(ph)) return tag + 'pH를 써요.';
              if (r.rest === 'OH' && Math.abs(ph - r.pOH) <= 0.06) return tag + '그 값은 pOH예요. pH = 14 − pOH로 바꿔요.';
              return tag + (r.rest === 'H' ? 'pH = −log[H⁺]예요. 0.020 = 2 × 10⁻²이므로 pH = 2 − log 2예요.' : 'pOH = −log[OH⁻]를 구하고 pH = 14 − pOH로 바꿔요.');
            }
            return true;
          },
          explain: '⑤ H⁺ 3.0 − 2.0 = 1.0 mmol ÷ 50 mL = <b>0.020 M</b> → pH = 2 − log 2 = <b>1.70</b>. ⑥ OH⁻ 3.0 − 1.0 = 2.0 mmol ÷ 40 mL = <b>0.050 M</b> → pOH = 1.30 → pH = 14 − 1.30 = <b>12.70</b>. 시료 ⑦(완전 중화)은 Na⁺, Cl⁻만 남아 pH 7이에요.',
        },
        {
          type: 'quiz', title: '산을 더 넣은 혼합 용액 ⑤',
          goal: '⑤(0.10 M HCl 30 mL + 0.10 M NaOH 20 mL)에서 농도가 가장 큰 이온은?',
          setup() { S.rest.si = 0; setScene('rest'); },
          choices: ['Na⁺', 'Cl⁻', 'H⁺', 'OH⁻'],
          answer: 1,
          feedback: ['Na⁺는 0.040 M이에요. Cl⁻는 0.060 M로 더 커요.', '', '남은 H⁺는 0.020 M이에요. 산을 더 넣었지만 대부분의 H⁺는 이미 OH⁻와 반응했어요.', '이 용액은 산성이라 OH⁻는 거의 없어요.'],
          explain: 'Cl⁻는 넣은 HCl 전부(3.0 mmol)가 남아 있어 0.060 M로 가장 커요. Na⁺ 0.040 M, H⁺ 0.020 M이고, 양전하 0.040 + 0.020 = 0.060 M = 음전하 0.060 M로 전하가 맞아요.',
        },
      ],
    },
    {
      title: '폐수 중화: 필요한 염기의 양', short: '폐수 중화', icon: '🏭', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 몰수를 비교해 남은 이온과 pH를 구했어요. 공장에서는 이 계산으로 산성 폐수에 넣을 염기의 양을 정해 중화한 뒤 내보내요.</div>' +
        '<p>묽은 염산 성분이 든 산성 폐수 <b>1000 L</b>의 [H⁺]는 <b>0.010 M</b>이에요. NaOH(몰질량 40 g/mol)와 Ca(OH)₂(74 g/mol)로 각각 중화하려면 몇 g이 필요할까요?</p>' +
        '<p>⚠️ 산 · 염기를 다룰 때는 보안경과 장갑을 끼고, 남은 물질은 폐수 처리 기준과 방법에 따라 처리해야 해요.</p>',
      features: ['waste'],
      setup() { S.gate = ''; resetWaste(); setScene('waste'); },
      recap: '폐수 속 H⁺ 몰수 = 농도 × 부피 = 10 mol을 구하고, 같은 몰수의 OH⁻를 내놓을 염기량을 계산해요. Ca(OH)₂는 OH⁻를 2개씩 내놓아 필요한 몰수가 절반이에요.',
      summary: '<ul><li>산성 폐수 1000 L, [H⁺] 0.010 M → H⁺ <b>10 mol</b></li><li>NaOH(OH⁻ 1개): 10 mol × 40 g/mol = <b>400 g</b></li><li>Ca(OH)₂(OH⁻ 2개): 5 mol × 74 g/mol = <b>370 g</b></li><li>중화 뒤 pH 센서로 7을 확인하고, 폐수 처리 기준에 따라 처리해요. 염기를 지나치게 넣으면 염기성 폐수가 돼요.</li></ul>',
      missions: [
        {
          title: '필요량 계산하고 중화하기',
          goal: 'NaOH와 Ca(OH)₂ 각각 <b>필요한 양을 계산</b>해 ✔ 확인한 뒤, 투입량을 맞춰 <b>pH 7</b>이 되게 하세요.',
          hint: 'H⁺ = 0.010 × 1000 = 10 mol. NaOH는 10 mol(× 40 g), Ca(OH)₂는 OH⁻가 2개씩이라 5 mol(× 74 g)이에요. 슬라이더는 10 g씩 움직여요.',
          setup() { S.gate = ''; resetWaste(); setScene('waste'); },
          check: () => S.waste.ach[0] && S.waste.ach[1],
          hold: 0.2,
          status: () => mark(S.waste.ach[0]) + ' NaOH 400 g으로 pH 7 &nbsp; ' + mark(S.waste.ach[1]) + ' Ca(OH)₂ 370 g으로 pH 7',
          explain: 'H⁺ 10 mol을 없애려면 OH⁻도 10 mol이 필요해요. NaOH는 10 mol × 40 = <b>400 g</b>, Ca(OH)₂는 5 mol × 74 = <b>370 g</b>이에요. 적게 넣으면 산성이 남고, 많이 넣으면 염기성 폐수가 돼요.',
        },
        {
          title: '산성 폐수 처리 방법 고르기', manual: true,
          goal: '산성 폐수를 안전하게 처리하는 방법을 <b>모두</b> 골라 ✔ 확인하기를 누르세요.',
          hint: '위험한 약품이니 보호 장비가 필요하고, 염기는 조금씩 넣으며 pH를 확인해야 해요. 기준 없이 그냥 버리면 안 돼요.',
          setup() { S.gate = 'chk'; setScene('waste'); },
          check() {
            const sel = wasteChecks();
            const good = [0, 1, 2], bad = [3, 4];
            if (sel.some((i) => bad.indexOf(i) >= 0)) return sel.indexOf(3) >= 0 ? '산성 폐수를 그냥 흘려보내면 환경이 오염돼요. 다시 골라 보세요.' : '염기를 너무 많이 넣으면 염기성 폐수가 돼요. pH 7 근처로 맞춰야 해요.';
            if (good.some((i) => sel.indexOf(i) < 0)) return '안전하고 알맞은 방법이 더 있어요. 나머지도 골라 보세요.';
            return true;
          },
          explain: '보안경 · 장갑을 끼고, 염기를 조금씩 넣으며 pH 센서로 7 근처인지 확인한 뒤, 폐수 처리 기준과 방법에 따라 처리해요. 그냥 버리거나 염기를 지나치게 넣는 것은 모두 안 돼요.',
        },
        {
          type: 'quiz', title: 'Ca(OH)₂가 더 적게 드는 까닭',
          goal: '같은 폐수를 중화하는 데 Ca(OH)₂는 370 g, NaOH는 400 g이 들어요. 몰질량은 Ca(OH)₂(74 g/mol)가 더 큰데 질량이 더 작은 까닭은?',
          setup() { S.gate = ''; setScene('waste'); },
          choices: ['Ca(OH)₂는 1 mol이 OH⁻ 2 mol을 내놓아 필요한 몰수가 절반(5 mol)이기 때문이에요', 'Ca(OH)₂가 NaOH보다 더 강한 산이기 때문이에요', 'Ca(OH)₂는 물에 녹지 않기 때문이에요', 'NaOH는 H⁺와 반응하지 못하기 때문이에요'],
          answer: 0,
          feedback: ['', 'Ca(OH)₂는 산이 아니라 염기예요.', '필요한 양은 용해 여부가 아니라 내놓는 OH⁻의 몰수로 정해요.', 'NaOH도 OH⁻를 내놓아 H⁺를 중화해요.'],
          explain: 'NaOH 10 mol(400 g)과 Ca(OH)₂ 5 mol(370 g)은 모두 OH⁻ 10 mol을 내놓아요. 몰질량은 Ca(OH)₂가 크지만 필요한 몰수가 절반이라 전체 질량은 조금 더 작아요.',
        },
      ],
    },
  ];
  // 폐수 처리 체크 목록
  const WCHK = ['보안경 · 장갑을 끼고 안전 수칙에 따라 다뤄요', '염기를 조금씩 넣으며 pH를 확인해요', '중화 뒤 pH를 확인하고 폐수 처리 기준에 따라 처리해요', '산성 폐수를 그대로 하수구로 흘려보내요', '염기를 아주 많이 넣어 pH를 최대한 높여요'];
  const wcBox = el('wChecks');
  WCHK.forEach((s, i) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chk'; b.dataset.i = i; b.textContent = s; b.addEventListener('click', () => { Sound.click(); b.classList.toggle('on'); b.classList.remove('bad', 'good'); }); wcBox.appendChild(b); });
  const wasteChecks = () => Array.from(wcBox.children).map((b, i) => (b.classList.contains('on') ? i : -1)).filter((i) => i >= 0);

  game = SciSim.game({
    simId: 'hc-neutralization-quant', mount: '#game', badge: '중화 양적 관계 박사', homeHref: '../../index.html#hc',
    featureLabels: { ion: '🧩 이온 입자 모형 · 반응식', mol: '⚖️ 뷰렛 · 몰수 막대 · 저울', rest: '🔬 남은 이온 · 농도 · pH', waste: '🏭 폐수 탱크 · pH 센서' },
    onFeatures() { updateCtl(); },
    onMissionStart() { $$('#wChecks button').forEach((b) => b.classList.remove('on', 'bad', 'good')); },
    levels,
  });

  /* ---------- 시작 ---------- */
  resetIon(6, 6);
  setScene(S.mode);
  let lastFree = false, lastMode = '';
  SciSim.loop((dt, t) => {
    S.t = t;
    if (S.gate && game && game.phase !== 'active') { S.gate = ''; updateCtl(); }
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.mode !== lastMode) { lastMode = S.mode; updateCtl(); }
    view.apply();
    ctx.fillStyle = BGC; ctx.fillRect(0, 0, VW, VH);
    // 모든 장면의 입자는 화면에 보이지 않아도 상태가 맞게 유지돼요
    if (S.mode === 'ion') { stepIon(dt); drawIonScene(); }
    else if (S.mode === 'mol') { stepMol(dt); drawMol(); }
    else if (S.mode === 'rest') { stepRest(dt); drawRest(); }
    else { stepWaste(dt); drawWaste(); }
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(244,241,251,' + S.fade * 0.85 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    readouts();
  });

  window.__sim = {
    S, SM, RS, AG, VW, VH, LA, LM, LR, LW, boxA, boxB, boxC, boxM, boxR, boxW, molCalc, wCalc, restOK, setScene, resetIon, pourIon, reactIon, updateCtl,
    get game() { return game; },
  };

})();
