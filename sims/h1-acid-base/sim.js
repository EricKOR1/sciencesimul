(function () {
  'use strict';
  const { $, $$, clamp, lerp, Sound } = SciSim;
  const { tween, approach, Spring, Particles } = SciSim;

  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const VW = PHONE ? 560 : 800, VH = PHONE ? 760 : 600;
  const FS = PHONE ? 1.3 : 1;
  const RM = SciSim.reduceMotion;
  const BG = '#f3f0fb';
  const view = SciSim.stage($('#cv'), { width: VW, height: VH, background: BG });
  const ctx = view.ctx;
  const D = SciSim.draw(ctx);
  const CO = SciSim.color;
  const fx = new Particles();
  const TAU = Math.PI * 2;
  const INK = '#1b2333', MUTED = '#5d6879';
  const HPC = '#e2464b', OHC = '#3867f4', NAC = '#f59e0b', CLC = '#14a058';
  let game = null;
  let F = new Set();
  const has = (f) => F.has(f);
  const mark = (b) => (b ? '✅' : '⬜');
  const rnd = (a, b) => a + Math.random() * (b - a);
  const smooth = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
  const seg = (p, a, b) => clamp((p - a) / (b - a), 0, 1);
  const fs = (n) => Math.round(n * FS);
  const shade = (c, a) => CO.shade(c, a);
  const mixc = (a, b, t) => CO.mix(a, b, clamp(t, 0, 1));
  const rgba = (c, a) => CO.rgba(c, a);

  /* ---------- 안내 말풍선 · 계기판 ---------- */
  const hintEl = $('#stageHint');
  function showHint(text, ms) {
    hintEl.textContent = text; hintEl.classList.remove('hide');
    clearTimeout(showHint.t); showHint.t = setTimeout(() => hintEl.classList.add('hide'), ms || 4500);
  }
  const roCache = {};
  function setRO(i, label, value) {
    const k = label + '|' + value;
    if (roCache[i] === k) return;
    roCache[i] = k;
    $('#roL' + i).textContent = label;
    $('#roV' + i).innerHTML = value;
  }

  /* ---------- 그리기 도우미 ---------- */
  const pill = (x, y, text, o) => D.label(x, y, text, Object.assign({ size: fs(13) }, o));
  function lines(x, y, arr, o) {
    o = o || {};
    arr.forEach((s, i) => D.text(x, y + i * (o.lh || fs(20)), s, Object.assign({ size: fs(14), weight: 700, color: INK }, o)));
  }
  function bgFill(c0, c1) {
    const g = ctx.createLinearGradient(0, 0, 0, VH);
    g.addColorStop(0, c0); g.addColorStop(1, c1);
    ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
  }
  function panel(x, y, w, h, o) {
    o = o || {};
    D.shadow(() => { D.roundRect(x, y, w, h, o.r || 14); ctx.fillStyle = o.fill || 'rgba(255,255,255,.92)'; ctx.fill(); }, { blur: o.blur != null ? o.blur : 8, y: 2 });
    if (o.stroke) { D.roundRect(x, y, w, h, o.r || 14); ctx.strokeStyle = o.stroke; ctx.lineWidth = o.lw || 2; ctx.stroke(); }
  }
  // 글자 크기를 폭에 맞춰 줄여서 쓰기
  function fitText(x, y, str, maxW, size, o) {
    o = o || {};
    ctx.save(); ctx.font = D.font(size, o.weight || 800);
    const w = ctx.measureText(str).width; ctx.restore();
    const sz = w > maxW ? Math.max(9, size * maxW / w) : size;
    D.text(x, y, str, Object.assign({}, o, { size: sz }));
  }
  function wrapText(x, y, str, maxW, size, lh, o) {
    o = o || {};
    ctx.save(); ctx.font = D.font(size, o.weight || 700);
    const words = str.split(' '); const out = []; let cur = '';
    words.forEach((w) => {
      const t = cur ? cur + ' ' + w : w;
      if (ctx.measureText(t).width > maxW && cur) { out.push(cur); cur = w; } else cur = t;
    });
    if (cur) out.push(cur);
    ctx.restore();
    out.forEach((s, i) => D.text(x, y + i * lh, s, Object.assign({ size }, o)));
    return out.length;
  }
  // 이온·분자 문자열 (유니코드 위·아래 첨자)
  const SUPS = { '+': '⁺', '-': '⁻' };
  const ionBall = (x, y, r, color, text, o) => {
    o = o || {};
    if (o.alpha != null) { ctx.save(); ctx.globalAlpha *= o.alpha; }
    D.sphere(x, y, r, color, { shadow: o.shadow === true, gloss: r > 7 });
    if (text && r >= 6) D.text(x, y + r * 0.34, text, { size: Math.max(9, r * (o.ts || 1.15)), weight: 800, color: '#fff', stroke: shade(color, -0.45), strokeWidth: 3 });
    if (o.alpha != null) ctx.restore();
  };
  const tap = (el, fn) => el.addEventListener('click', fn);


  /* =========================================================
     카드 분류판: 카드를 끌어서 상자에 넣어요 (놓는 위치는 포인터 위치로 판정, 탭으로도 가능)
     cfg = { items:[{id,...}], bins:[{id,...}], layout(){ bins:{id:rect}, tray:rect, cw, ch, gap, headH },
             drawItem(it,w,h,st), drawBin(bin,rect,st), drawTray(rect), onChange(it), onTap(it) }
     ========================================================= */
  function makeBoard(cfg) {
    const B = { items: [], sel: null, drag: null, ord: 0, hot: null, cfg };
    cfg.items.forEach((it, i) => B.items.push(Object.assign({ idx: i, bin: null, x: 0, y: 0, ord: 0, sc: 1, shake: 0, mark: null, init: false }, it)));
    function grid(rect, n, L, headH) {
      const gap = L.gap, cw = L.cw, ch = L.ch;
      const cols = Math.max(1, Math.floor((rect.w - gap) / (cw + gap)));
      const rows = Math.max(1, Math.ceil(n / cols));
      const availH = rect.h - headH - gap * 2;
      const stepY = rows > 1 ? Math.min(ch + gap, (availH - ch) / (rows - 1)) : 0;
      const used = Math.min(n, cols) * (cw + gap) - gap;
      const x0 = rect.x + (rect.w - Math.max(used, cw)) / 2 + cw / 2;
      const out = [];
      for (let i = 0; i < n; i++) out.push({ x: x0 + (i % cols) * (cw + gap), y: rect.y + headH + gap + ch / 2 + Math.floor(i / cols) * stepY });
      return out;
    }
    B.inBin = (id) => B.items.filter((it) => it.bin === id);
    B.placed = () => B.items.filter((it) => it.bin);
    B.update = function (dt) {
      const L = cfg.layout();
      const drag = B.drag && B.drag.moved ? B.drag.it : null;
      const setT = (list, rect, headH) => {
        const pos = grid(rect, list.length, L, headH);
        list.forEach((it, i) => { it.tx = pos[i].x; it.ty = pos[i].y; });
      };
      cfg.bins.forEach((b) => setT(B.items.filter((it) => it.bin === b.id && it !== drag).sort((a, c) => a.ord - c.ord), L.bins[b.id], L.headH));
      setT(B.items.filter((it) => !it.bin && it !== drag), L.tray, L.trayHead || 0);
      B.items.forEach((it) => {
        if (it === drag) return;
        if (!it.init) { it.x = it.tx; it.y = it.ty; it.init = true; }
        it.x = approach(it.x, it.tx, dt, 14); it.y = approach(it.y, it.ty, dt, 14);
        it.sc = approach(it.sc, it.sel ? 1.06 : 1, dt, 14);
        if (it.shake > 0) it.shake = Math.max(0, it.shake - dt * 2.5);
      });
      B.items.forEach((it) => { it.sel = B.sel === it; });
      if (drag) drag.sc = approach(drag.sc, 1.1, dt, 20);
    };
    B.hit = function (p) {
      const L = cfg.layout();
      const list = B.items.slice().sort((a, c) => (a.bin ? a.ord : -1) - (c.bin ? c.ord : -1)).reverse();
      return list.find((it) => Math.abs(p.x - it.x) <= L.cw / 2 && Math.abs(p.y - it.y) <= L.ch / 2) || null;
    };
    B.binAt = function (p) {
      const L = cfg.layout();
      return cfg.bins.find((b) => { const r = L.bins[b.id]; return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h; }) || null;
    };
    B.assign = function (it, binId, silent) {
      it.bin = binId; it.mark = null;
      if (binId) it.ord = ++B.ord;
      B.sel = null;
      if (!silent) {
        Sound.tick();
        fx.burst(it.x, it.y, { count: 8, colors: ['#fff', '#c9b6f5'], speed: 90, size: 3, gravity: 0, life: 0.45 });
      }
      cfg.onChange && cfg.onChange(it);
    };
    B.down = function (p) {
      const it = B.hit(p);
      if (it) {
        B.drag = { it, dx: it.x - p.x, dy: it.y - p.y, sx: p.x, sy: p.y, moved: false };
        Sound.click();
        return true;
      }
      const b = B.binAt(p);
      if (b && B.sel) { B.assign(B.sel, b.id); }
      return false;
    };
    B.move = function (p) {
      const d = B.drag; if (!d) return;
      if (!d.moved && Math.hypot(p.x - d.sx, p.y - d.sy) > 8) d.moved = true;
      if (d.moved) { d.it.x = p.x + d.dx; d.it.y = p.y + d.dy; B.hot = B.binAt(p); }
    };
    B.up = function (p) {
      const d = B.drag; if (!d) return;
      B.drag = null; B.hot = null;
      const it = d.it;
      if (!d.moved) {
        if (it.bin) { cfg.onTap && cfg.onTap(it); }
        else { B.sel = B.sel === it ? null : it; Sound.click(); }
        return;
      }
      const b = B.binAt(p);
      if (b) B.assign(it, b.id);
      else if (it.bin) { it.bin = null; it.mark = null; cfg.onChange && cfg.onChange(it); }
    };
    B.reset = function () {
      B.drag = null; B.sel = null; B.hot = null;
      B.items.forEach((it) => { it.bin = null; it.mark = null; it.shake = 0; });
    };
    B.draw = function (t) {
      const L = cfg.layout();
      cfg.drawTray && cfg.drawTray(L.tray);
      cfg.bins.forEach((b) => {
        const r = L.bins[b.id];
        cfg.drawBin(b, r, { count: B.inBin(b.id).length, hot: B.hot === b || (B.sel && !B.drag), t });
      });
      const drag = B.drag && B.drag.moved ? B.drag.it : null;
      const order = B.items.slice().sort((a, c) => (a.bin ? a.ord : -1) - (c.bin ? c.ord : -1));
      order.filter((it) => it !== drag).concat(drag ? [drag] : []).forEach((it) => {
        ctx.save();
        const off = it.shake > 0 ? Math.sin(it.shake * 30) * 5 * it.shake : 0;
        ctx.translate(it.x + off, it.y); ctx.scale(it.sc, it.sc);
        if (it === drag) D.shadow(() => { D.roundRect(-L.cw / 2, -L.ch / 2, L.cw, L.ch, 10); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: 16, y: 8, color: 'rgba(40,20,90,.3)' });
        cfg.drawItem(it, L.cw, L.ch, { drag: it === drag, sel: B.sel === it, t });
        ctx.restore();
      });
    };
    return B;
  }


  /* =========================================================
     입자(이온·분자) 그리기와 비커 속 입자 상자
     ========================================================= */
  const MS = PHONE ? 1.2 : 1;
  const HWHITE = '#f2f4f8', CGREY = '#6b7280', OXY = '#ef6a6a', SUCC = '#d9b88a';
  function sphereAt(x, y, r, c, text, ts) {
    D.sphere(x, y, r, c, { shadow: false, gloss: r > 6 });
    if (text) D.text(x, y + r * 0.36, text, { size: ts || r * 1.1, weight: 800, color: '#fff', stroke: shade(c, -0.45), strokeWidth: 3 });
  }
  /* kind: H+ Cl- Na+ OH- HCl NaOH suc CH4 MeOH H2O */
  function drawMol(kind, x, y, rot, s, alpha, t) {
    s = (s || 1) * MS;
    ctx.save();
    if (alpha != null) ctx.globalAlpha *= alpha;
    ctx.translate(x, y); ctx.rotate(rot || 0); ctx.scale(s, s);
    const rr = (a, b) => ({ x: Math.cos(a) * b, y: Math.sin(a) * b });
    if (kind === 'H+') sphereAt(0, 0, 9, HPC, '+', 14);
    else if (kind === 'Cl-') sphereAt(0, 0, 11.5, CLC, '−', 14);
    else if (kind === 'Na+') sphereAt(0, 0, 11, NAC, '+', 14);
    else if (kind === 'OH-') { sphereAt(0, 0, 12, OHC); ctx.save(); ctx.rotate(-(rot || 0)); D.text(0, 3.4, 'OH⁻', { size: 10, weight: 800, color: '#fff', stroke: shade(OHC, -0.45), strokeWidth: 3 }); ctx.restore(); }
    else if (kind === 'HCl') { sphereAt(-12, 0, 5.5, HWHITE); sphereAt(2, 0, 11.5, CLC); }
    else if (kind === 'NaOH') { sphereAt(-11, 0, 11, NAC); sphereAt(8, 0, 9.5, OHC); ctx.save(); ctx.rotate(-(rot || 0)); D.text(8, 3.2, 'OH', { size: 9, weight: 800, color: '#fff', stroke: shade(OHC, -0.45), strokeWidth: 2.5 }); ctx.restore(); }
    else if (kind === 'suc') {
      [[-9, -6, 9], [8, -5, 8.5], [-2, 8, 9.5], [12, 8, 6.5], [-14, 7, 6]].forEach((b) => D.sphere(b[0], b[1], b[2], SUCC, { shadow: false, gloss: false }));
      [[-9, -6], [8, -5], [-2, 8]].forEach((b) => D.sphere(b[0] + 2, b[1] + 2, 3.6, OXY, { shadow: false, gloss: false }));
    } else if (kind === 'CH4') {
      for (let i = 0; i < 4; i++) { const q = rr(Math.PI / 4 + i * Math.PI / 2, 11); sphereAt(q.x, q.y, 4.2, HWHITE); }
      sphereAt(0, 0, 8, CGREY);
    } else if (kind === 'MeOH') {
      for (let i = 0; i < 3; i++) { const q = rr(Math.PI * 0.55 + i * 1.05, 11); sphereAt(q.x - 4, q.y, 4, HWHITE); }
      sphereAt(-4, 0, 8, CGREY);
      sphereAt(11, -1, 6.5, OXY); sphereAt(19, 5, 4, HWHITE);
      ctx.strokeStyle = 'rgba(56,103,244,.8)'; ctx.lineWidth = 1.6; ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.ellipse(14.5, 2, 12, 9, 0.4, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    } else if (kind === 'H2O') {
      sphereAt(0, 0, 7, OXY);
      [-0.9, 0.9].forEach((a) => { const q = rr(a + Math.PI / 2, 9.5); sphereAt(q.x, q.y, 4.2, HWHITE); });
    }
    ctx.restore();
  }
  const CHARGE = { 'H+': 1, 'Na+': 1, 'Cl-': -1, 'OH-': -1 };
  const RAD = { 'H+': 8, 'Cl-': 11.5, 'Na+': 11, 'OH-': 12, HCl: 14, NaOH: 16, suc: 18, CH4: 14, MeOH: 17, H2O: 11 };

  /* 비커 + 입자 상자.  box = 비커 바깥 상자, level = 물의 높이(0~1) */
  function makeTank(box, level, opts) {
    opts = opts || {};
    const T = { box, level, ps: [], timers: [], drift: 0, elec: !!opts.elec, liquid: opts.liquid || '#8cc8ff', fade: 1, pops: 0 };
    const water = () => ({ x: box.x + 5, y: box.y + box.h * (1 - T.level), w: box.w - 10, h: Math.max(8, box.h * T.level - 6) });
    T.water = water;
    T.ex = () => [box.x + box.w * 0.17, box.x + box.w * 0.83];
    T.elecRects = function () {
      if (!T.elec) return [];
      const w = water(); const e = T.ex();
      return e.map((cx) => ({ x: cx - 6, y: box.y - 30, w: 12, h: (w.y + w.h * 0.8) - (box.y - 30) }));
    };
    T.add = function (k, x, y, o) {
      const p = Object.assign({ k, x, y, ang: rnd(0, TAU), spd: rnd(14, 30), rot: rnd(0, TAU), vr: rnd(-0.6, 0.6), a: 0, age: 0, vx: 0, vy: 0, enter: 0 }, o || {});
      T.ps.push(p); return p;
    };
    T.later = function (sec, fn) { T.timers.push({ t: sec, fn }); };
    T.clear = function () { T.ps.length = 0; T.timers.length = 0; };
    T.fadeOutAll = function () { T.ps.forEach((p) => { p.dying = true; }); T.timers.length = 0; };
    T.count = (k) => T.ps.filter((p) => p.k === k && !p.dying).length;
    T.update = function (dt) {
      for (let i = T.timers.length - 1; i >= 0; i--) { T.timers[i].t -= dt; if (T.timers[i].t <= 0) { const f = T.timers.splice(i, 1)[0].fn; f(); } }
      const w = water(), els = T.elecRects();
      for (let i = T.ps.length - 1; i >= 0; i--) {
        const p = T.ps[i];
        p.age += dt;
        p.a = p.dying ? p.a - dt * 2.5 : Math.min(1, p.a + dt * 3);
        if (p.dying && p.a <= 0) { T.ps.splice(i, 1); continue; }
        p.rot += p.vr * dt;
        const r = (RAD[p.k] || 10) * MS;
        if (p.split && p.age >= p.split.at && !p.dying) {
          const sp = p.split;
          const a = Math.random() * TAU, ca = Math.cos(a), sa = Math.sin(a);
          const q1 = T.add(sp.a, p.x - ca * 6, p.y - sa * 6, { a: 1, vx: -ca * 150, vy: -sa * 150 });
          const q2 = T.add(sp.b, p.x + ca * 6, p.y + sa * 6, { a: 1, vx: ca * 150, vy: sa * 150 });
          if (p.onSplit) p.onSplit(q1, q2);
          fx.burst(p.x, p.y, { count: 7, colors: ['#fff6c2', '#ffd34d'], speed: 80, size: 2.6, gravity: 0, life: 0.4 });
          T.ps.splice(i, 1); continue;
        }
        if (p.enter) { // 위에서 물속으로 떨어지는 중
          p.vy = Math.min(p.vy + 400 * dt, 170); p.y += p.vy * dt;
          if (p.y > w.y + r + 14) p.enter = 0;
          p.x = clamp(p.x, w.x + r, w.x + w.w - r);
          continue;
        }
        if (p.rise) { // 물에 녹지 않는 기체: 떠올라 공기 중으로
          p.x += Math.sin(p.age * 3 + p.ang) * 14 * dt; p.y -= 62 * dt;
          if (p.y < w.y + 2) { fx.burst(p.x, w.y, { count: 5, colors: ['#ffffff', '#cfe8ff'], speed: 50, size: 2, gravity: 80, life: 0.4, shape: 'bubble' }); T.ps.splice(i, 1); T.pops++; }
          p.x = clamp(p.x, w.x + r, w.x + w.w - r);
          continue;
        }
        if (p.lock) { p.x = approach(p.x, p.lock.x, dt, 4); p.y = approach(p.y, p.lock.y, dt, 4); continue; }
        if (p.hold) continue;
        // 무작위 운동 + (회로가 켜지면) 전극 쪽으로 이동
        p.ang += (Math.random() - 0.5) * 4 * dt;
        let vx = Math.cos(p.ang) * p.spd + p.vx, vy = Math.sin(p.ang) * p.spd + p.vy;
        p.vx *= Math.exp(-3 * dt); p.vy *= Math.exp(-3 * dt);
        const q = CHARGE[p.k] || 0;
        if (T.drift && q) vx += -q * T.drift * 30;
        p.x += vx * dt; p.y += vy * dt;
        if (p.x < w.x + r) { p.x = w.x + r; p.ang = Math.PI - p.ang; }
        if (p.x > w.x + w.w - r) { p.x = w.x + w.w - r; p.ang = Math.PI - p.ang; }
        if (p.y < w.y + r + 6) { p.y = w.y + r + 6; p.ang = -p.ang; }
        if (p.y > w.y + w.h - r) { p.y = w.y + w.h - r; p.ang = -p.ang; }
        els.forEach((e) => { // 전극 막대 밖으로 밀어내기
          const cx = clamp(p.x, e.x, e.x + e.w), cy = clamp(p.y, e.y, e.y + e.h);
          const dx = p.x - cx, dy = p.y - cy, d = Math.hypot(dx, dy);
          if (d < r) {
            if (d > 0.001) { p.x = cx + dx / d * r; p.y = cy + dy / d * r; }
            else p.x = p.x < e.x + e.w / 2 ? e.x - r : e.x + e.w + r;
            p.ang = Math.atan2(dy || 0.1, dx || 0.1) + rnd(-0.5, 0.5);
          }
        });
      }
    };
    T.drawBeaker = function (t) {
      D.beaker(box.x, box.y, box.w, box.h, { level: T.level, liquid: T.liquid, t, wave: 1.4 });
    };
    T.drawElectrodes = function () {
      T.elecRects().forEach((e, i) => {
        D.shadow(() => { D.roundRect(e.x, e.y, e.w, e.h, 4); ctx.fillStyle = '#8a95a8'; ctx.fill(); }, { blur: 5, y: 2 });
        const g = ctx.createLinearGradient(e.x, 0, e.x + e.w, 0); g.addColorStop(0, 'rgba(255,255,255,.55)'); g.addColorStop(0.5, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(0,0,0,.18)');
        D.roundRect(e.x, e.y, e.w, e.h, 4); ctx.fillStyle = g; ctx.fill();
        D.sphere(e.x + e.w / 2, e.y + 2, 11, i ? HPC : OHC, { gloss: false, shadow: false });
        D.text(e.x + e.w / 2, e.y + 7, i ? '+' : '−', { size: 16, weight: 800, color: '#fff' });
      });
    };
    T.drawParticles = function (t) {
      T.ps.forEach((p) => { drawMol(p.k, p.x, p.y, p.rot, p.sc || 1, clamp(p.a, 0, 1), t); });
    };
    /* 전지와 전구 회로. bright: 0~1 */
    T.drawCircuit = function (bright, t) {
      const e = T.ex(); const yw = box.y - 52; const xm = box.x + box.w / 2;
      const top = box.y - 30;
      ctx.save(); ctx.strokeStyle = '#8a96ab'; ctx.lineWidth = 4; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(e[0], top); ctx.lineTo(e[0], yw); ctx.lineTo(xm - 62, yw);
      ctx.moveTo(xm - 14, yw); ctx.lineTo(xm + 24, yw);
      ctx.moveTo(xm + 66, yw); ctx.lineTo(e[1], yw); ctx.lineTo(e[1], top); ctx.stroke();
      ctx.restore();
      // 전지: 짧은 판(−)이 왼쪽, 긴 판(+)이 오른쪽
      D.roundRect(xm - 62, yw - 16, 48, 32, 8); ctx.fillStyle = '#34415a'; ctx.fill();
      D.roundRect(xm - 56, yw - 12, 22, 24, 5); ctx.fillStyle = '#4b5d80'; ctx.fill();
      D.text(xm - 45, yw + 6, '−', { size: 17, weight: 800, color: '#fff' });
      D.text(xm - 24, yw + 6, '+', { size: 17, weight: 800, color: '#ffd34d' });
      // 전구
      const lx = xm + 45, ly = yw - 8;
      if (bright > 0.02) D.glow(lx, ly, 52 + bright * 24, '#ffd34d', 0.75 * bright);
      D.shadow(() => { ctx.beginPath(); ctx.arc(lx, ly, 18, 0, TAU); ctx.fillStyle = mixc('#e9eef6', '#fff0a8', bright); ctx.fill(); }, { blur: 6, y: 2 });
      ctx.strokeStyle = '#a7b2c5'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(lx, ly, 18, 0, TAU); ctx.stroke();
      ctx.strokeStyle = bright > 0.1 ? '#f59e0b' : '#9aa5b6'; ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.moveTo(lx - 6, ly + 14); ctx.lineTo(lx - 5, ly - 1); ctx.lineTo(lx, ly + 4); ctx.lineTo(lx + 5, ly - 1); ctx.lineTo(lx + 6, ly + 14); ctx.stroke();
      D.roundRect(lx - 10, ly + 15, 20, 12, 3); ctx.fillStyle = '#7b8799'; ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.65)'; ctx.beginPath(); ctx.ellipse(lx - 7, ly - 9, 4.5, 2.6, -0.6, 0, TAU); ctx.fill();
      if (bright > 0.3) for (let i = 0; i < 8; i++) { const a = i * TAU / 8 + t; ctx.strokeStyle = 'rgba(245,158,11,' + (0.7 * bright) + ')'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(lx + Math.cos(a) * 26, ly + Math.sin(a) * 26); ctx.lineTo(lx + Math.cos(a) * 33, ly + Math.sin(a) * 33); ctx.stroke(); }
    };
    return T;
  }


  /* =========================================================
     통합과학2 Ⅰ. 변화와 다양성 - 산과 염기 [10통과2-01-04]
     ① 관찰: 지시약 검사 (시료 8종 × 지시약 4종, 색 기록표, 3분류)
     ② 실험: 성질 실험 (마그네슘 · 달걀 껍데기 · 단백질 · 전구 회로)
     ③ 모형: 이온 모형 (아레니우스 정의: 산 = H⁺, 염기 = OH⁻)
     ④ 적용: 생활 속 물질 분류 · 안전
     ※ 산·염기 정의는 아레니우스 정의만. pH 값·세기·계산은 다루지 않고 지시약 색만 사용.
     ========================================================= */
  const KIND = { acid: '산성', neutral: '중성', base: '염기성' };
  const KCOL = { acid: '#e2464b', neutral: '#14a058', base: '#3867f4' };
  const RED_P = '#e0364f', BLUE_P = '#3a68d8';

  const SAMPLES = [
    { id: 'hcl', name: '염산', kind: 'acid', tint: '#e9f2ff', taste: '실험실 시약이에요. 맛보거나 만지지 않아요.' },
    { id: 'vin', name: '식초', kind: 'acid', tint: '#f8efd2', taste: '신맛이 나요.' },
    { id: 'lem', name: '레몬즙', kind: 'acid', tint: '#fff08a', taste: '신맛이 나요.' },
    { id: 'soda', name: '탄산음료', kind: 'acid', tint: '#ecdcc0', taste: '톡 쏘는 신맛이 나요.' },
    { id: 'water', name: '증류수', kind: 'neutral', tint: '#e6f2ff', taste: '맛이 없어요.' },
    { id: 'sugar', name: '설탕물', kind: 'neutral', tint: '#f0f5ff', taste: '단맛이 나요.' },
    { id: 'soap', name: '비눗물', kind: 'base', tint: '#f3f2ea', taste: '쓴맛이 나고, 만지면 미끌거려요.' },
    { id: 'naoh', name: '묽은 수산화 나트륨 수용액', short: '묽은 NaOH 수용액', chip: 'NaOH 수용액', kind: 'base', tint: '#e9f2ff', taste: '실험실 시약이에요. 피부를 상하게 하므로 만지지 않아요.' },
  ];
  const INDS = [
    { id: 'litB', name: '푸른 리트머스', sub: '종이', type: 'paper', base: BLUE_P },
    { id: 'litR', name: '붉은 리트머스', sub: '종이', type: 'paper', base: RED_P },
    { id: 'btb', name: 'BTB', sub: '용액', type: 'drop', drop: '#3aa84e' },
    { id: 'pp', name: '페놀프탈레인', sub: '용액', type: 'drop', drop: '#d9d9e4' },
  ];
  // 지시약 색: 산성 / 중성 / 염기성
  function resultOf(kind, id) {
    if (id === 'litB') return kind === 'acid' ? { c: RED_P, w: '붉게 변함' } : { c: BLUE_P, w: '변화 없음' };
    if (id === 'litR') return kind === 'base' ? { c: BLUE_P, w: '푸르게 변함' } : { c: RED_P, w: '변화 없음' };
    if (id === 'btb') return kind === 'acid' ? { c: '#f2cf1d', w: '노란색' } : kind === 'neutral' ? { c: '#43b95a', w: '초록색' } : { c: '#2d66dc', w: '파란색' };
    return kind === 'base' ? { c: '#ff3f93', w: '붉은색(분홍)' } : { c: null, w: '무색' };
  }

  const S = { scene: 'test', sel: 0, sceneA: 1, propsSeen: false, exp: 'mg', applyShown: false };
  const TB = { test: '🧪 지시약 검사대', sort: '🗂️ 산성 · 중성 · 염기성 분류', props: '⚗️ 산과 염기의 성질 실험', ion: '🔬 이온 모형: 물에 녹여 보기', apply: '🏠 생활 속 물질 분류' };
  function setScene(sc) {
    S.scene = sc; hintEl.classList.add('hide');
    S.sceneA = 0; tween(S, { sceneA: 1 }, { duration: 0.4, ease: 'outCubic' });
    updateUI();
  }
  function updateUI() {
    ['test', 'sort', 'props', 'ion', 'apply'].forEach((k) => { $('#cs-' + k).hidden = k !== S.scene; });
    $('#tbLabel').textContent = TB[S.scene];
    $('#sceneSeg').hidden = F.size < 2;
    $$('#sceneSeg button').forEach((b) => b.classList.toggle('on', b.dataset.scene === S.scene));
    if (S.scene === 'props') syncProps();
  }

  /* =========================================================
     ① 지시약 검사대
     ========================================================= */
  const TL = PHONE ? { x0: 5, hw: 150, cw: 100, hy: 46, hh: 100, ry: 152, rh: 62 } : { x0: 20, hw: 226, cw: 132, hy: 50, hh: 68, ry: 124, rh: 50 };
  const T = { cells: SAMPLES.map(() => INDS.map(() => ({ used: false, p: 0, h: null, fxd: false }))), count: 0, hover: null };
  const cellRect = (s, i) => ({ x: TL.x0 + TL.hw + i * TL.cw, y: TL.ry + s * TL.rh, w: TL.cw, h: TL.rh });
  const cellShown = (s, i) => T.cells[s][i].used && T.cells[s][i].p >= 1;
  const testedSamples = () => SAMPLES.filter((_, s) => INDS.some((_, i) => cellShown(s, i))).length;
  const cellCount = () => T.cells.reduce((a, row) => a + row.filter((c) => c.used).length, 0);
  function applyTest(s, i, delay) {
    const c = T.cells[s][i];
    S.sel = s;
    if (c.used) return false;
    c.used = true; c.p = 0; c.fxd = false;
    c.h = tween(c, { p: 1 }, { duration: RM ? 0.01 : 1.4, ease: 'linear', delay: delay || 0 });
    T.count++;
    if (!delay) Sound.tick();
    return true;
  }
  function applyRow(s) {
    let k = 0;
    INDS.forEach((_, i) => { if (applyTest(s, i, k * 0.45)) k++; });
    S.sel = s;
  }
  function resetTest() {
    T.cells.forEach((row) => row.forEach((c) => { if (c.h) c.h.cancel(); c.used = false; c.p = 0; c.fxd = false; c.h = null; }));
    T.count = 0;
  }
  function cellAt(p) {
    for (let s = 0; s < SAMPLES.length; s++) for (let i = 0; i < INDS.length; i++) {
      const r = cellRect(s, i);
      if (p.x >= r.x && p.x < r.x + r.w && p.y >= r.y && p.y < r.y + r.h) return { s, i };
    }
    return null;
  }
  function rowHeadAt(p) {
    for (let s = 0; s < SAMPLES.length; s++) {
      const y = TL.ry + s * TL.rh;
      if (p.x >= TL.x0 && p.x < TL.x0 + TL.hw && p.y >= y && p.y < y + TL.rh) return s;
    }
    return -1;
  }
  function drawIndIcon(i, cx, cy, sc) {
    const ind = INDS[i];
    ctx.save(); ctx.translate(cx, cy); ctx.scale(sc, sc);
    if (ind.type === 'paper') {
      D.shadow(() => { D.roundRect(-9, -22, 18, 44, 3); ctx.fillStyle = ind.base; ctx.fill(); }, { blur: 4, y: 2 });
      ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(-6, -19, 3, 38);
    } else {
      D.shadow(() => { D.roundRect(-13, -8, 26, 30, 7); ctx.fillStyle = i === 2 ? '#3aa84e' : '#eef0f6'; ctx.fill(); }, { blur: 4, y: 2 });
      ctx.strokeStyle = '#8a95a8'; ctx.lineWidth = 1.6; D.roundRect(-13, -8, 26, 30, 7); ctx.stroke();
      D.roundRect(-6, -16, 12, 9, 3); ctx.fillStyle = i === 2 ? '#2a6f35' : '#ff3f93'; ctx.fill();
      ctx.beginPath(); ctx.moveTo(-3, -16); ctx.lineTo(0, -24); ctx.lineTo(3, -16); ctx.fillStyle = '#eceff6'; ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(-9, -3, 3, 20);
    }
    ctx.restore();
  }
  function miniBeaker(s, cx, cy, t) {
    const sm = SAMPLES[s];
    D.beaker(cx - 13, cy - 17, 26, 34, { level: 0.7, liquid: mixc(sm.tint, '#8cc8ff', 0.4), t, wave: 0.8, glass: '#8fa3bd' });
    if (sm.id === 'soda') for (let k = 0; k < 3; k++) { const bt = (t * 0.7 + k * 0.33) % 1; ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.beginPath(); ctx.arc(cx - 5 + k * 5, cy + 12 - bt * 20, 1.5, 0, TAU); ctx.fill(); }
  }
  function drawCell(s, i, t) {
    const r = cellRect(s, i), c = T.cells[s][i], ind = INDS[i], sm = SAMPLES[s], res = resultOf(sm.kind, ind.id);
    D.roundRect(r.x + 3, r.y + 3, r.w - 6, r.h - 6, 10);
    ctx.fillStyle = c.used ? '#ffffff' : 'rgba(255,255,255,.55)'; ctx.fill();
    ctx.save();
    if (!c.used) ctx.setLineDash([5, 5]);
    ctx.strokeStyle = c.used ? '#cdbff1' : '#c8c0dd'; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.restore();
    const wr = PHONE ? 15 : Math.min(r.h * 0.34, 17), wx = PHONE ? r.x + r.w / 2 : r.x + 33, wy = PHONE ? r.y + 25 : r.y + r.h / 2;
    const bloom = c.used ? smooth((c.p - 0.38) / 0.5) : 0;
    // 홈(웰)
    const liq = ind.type === 'drop' ? mixc(sm.tint, res.c || sm.tint, bloom) : sm.tint;
    ctx.save();
    ctx.beginPath(); ctx.arc(wx, wy, wr, 0, TAU); ctx.fillStyle = liq; ctx.fill();
    const g = ctx.createRadialGradient(wx - wr * 0.3, wy - wr * 0.35, 1, wx, wy, wr);
    g.addColorStop(0, 'rgba(255,255,255,.5)'); g.addColorStop(1, 'rgba(0,0,0,.04)');
    ctx.fillStyle = g; ctx.fill();
    ctx.restore();
    ctx.strokeStyle = '#9fb0c9'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(wx, wy, wr, 0, TAU); ctx.stroke();
    if (c.used && ind.type === 'paper') {
      // 리트머스 종이: 위에서 내려와 반쯤 잠겨요. 젖은 아랫부분의 색이 바뀌어요
      const dip = smooth(c.p / 0.3);
      const top = wy - wr - 30 + dip * 24, len = 40;
      const wet = mixc(ind.base, res.c, bloom);
      ctx.save(); ctx.translate(wx + 2, 0);
      D.roundRect(-5, top, 10, len, 2); ctx.fillStyle = ind.base; ctx.fill();
      ctx.save(); D.roundRect(-5, top, 10, len, 2); ctx.clip();
      ctx.fillStyle = wet; ctx.fillRect(-6, wy - 2, 12, 40);
      ctx.restore();
      ctx.strokeStyle = 'rgba(0,0,0,.18)'; ctx.lineWidth = 1; D.roundRect(-5, top, 10, len, 2); ctx.stroke();
      ctx.restore();
    }
    if (c.used && ind.type === 'drop' && c.p < 0.5) {
      // 점적병과 떨어지는 방울
      const q = c.p / 0.5;
      const dx = wx, dy = wy - wr - 34 + Math.min(q * 4, 1) * 4;
      ctx.save(); ctx.translate(dx, dy); ctx.scale(0.55, 0.55);
      D.roundRect(-9, -26, 18, 26, 5); ctx.fillStyle = i === 2 ? '#3aa84e' : '#eef0f6'; ctx.fill(); ctx.strokeStyle = '#8a95a8'; ctx.lineWidth = 2; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-5, 0); ctx.lineTo(0, 12); ctx.lineTo(5, 0); ctx.fillStyle = '#cfd6e4'; ctx.fill();
      ctx.restore();
      const dropT = seg(c.p, 0.08, 0.36);
      if (dropT > 0 && dropT < 1) { ctx.fillStyle = i === 2 ? '#3aa84e' : '#cfd6e4'; ctx.beginPath(); ctx.ellipse(wx, dy + 8 + dropT * (wy - dy - 6), 3, 4.2, 0, 0, TAU); ctx.fill(); }
    }
    if (c.used && c.p > 0.36 && !c.fxd) {
      c.fxd = true;
      if (ind.type === 'drop') fx.burst(wx, wy, { count: 8, colors: [res.c || '#ffffff', '#ffffff'], speed: 60, size: 2.4, gravity: 60, life: 0.45 });
    }
    if (c.used && ind.type === 'drop' && c.p > 0.36 && c.p < 0.8) {
      const k = (c.p - 0.36) / 0.44;
      ctx.strokeStyle = 'rgba(255,255,255,' + (0.9 * (1 - k)) + ')'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(wx, wy, wr * (0.3 + 0.7 * k), 0, TAU); ctx.stroke();
    }
    // 결과 글자
    const tx = PHONE ? r.x + r.w / 2 : wx + wr + 10, ty = PHONE ? r.y + r.h - 8 : wy + 5, al = PHONE ? 'center' : 'left';
    if (c.used) {
      const a = smooth((c.p - 0.6) / 0.35);
      fitText(tx, ty, res.w, PHONE ? r.w - 10 : r.w - 50, PHONE ? 13 : 13, { weight: 800, color: c.p >= 0.6 && ind.type === 'drop' && res.c ? shade(res.c, -0.35) : INK, align: al, alpha: a });
    } else {
      D.text(tx, ty, '눌러요', { size: PHONE ? 13 : 12, weight: 700, color: '#a79ec5', align: al });
    }
  }
  const STRIP = [['#d7263d', '붉은색'], ['#e0609b', '분홍색'], ['#8f63c9', '보라색'], ['#3f6fd6', '푸른색'], ['#2fb59a', '청록색'], ['#8cc63f', '연두색'], ['#f2d43a', '노란색']];
  function drawTest(t) {
    D.text(VW / 2, PHONE ? fs(26) : 30, '칸을 눌러 지시약을 떨어뜨려요', { size: fs(15), weight: 800, color: '#4c1d95' });
    // 열 머리글: 지시약
    for (let i = 0; i < 4; i++) {
      const r = cellRect(0, i); const cx = r.x + r.w / 2;
      panel(r.x + 3, TL.hy, r.w - 6, TL.hh, { r: 12, blur: 4, fill: 'rgba(255,255,255,.85)' });
      drawIndIcon(i, cx, TL.hy + (PHONE ? 34 : 26), PHONE ? 0.95 : 0.8);
      D.text(cx, TL.hy + TL.hh - (PHONE ? 30 : 22), INDS[i].name, { size: fs(i === 3 ? 11.5 : 12.5), weight: 800, color: INK });
      D.text(cx, TL.hy + TL.hh - (PHONE ? 11 : 7), INDS[i].sub, { size: fs(11.5), weight: 700, color: MUTED });
    }
    D.text(TL.x0 + TL.hw / 2, TL.hy + TL.hh / 2 + 5, '시료', { size: fs(15), weight: 800, color: MUTED });
    // 행
    SAMPLES.forEach((sm, s) => {
      const y = TL.ry + s * TL.rh;
      const sel = S.sel === s;
      D.roundRect(TL.x0 + 2, y + 2, TL.hw - 6, TL.rh - 4, 10);
      ctx.fillStyle = sel ? '#ede6ff' : 'rgba(255,255,255,.85)'; ctx.fill();
      ctx.strokeStyle = sel ? '#8b5cf6' : '#d9d0ef'; ctx.lineWidth = sel ? 2.4 : 1.4; ctx.stroke();
      miniBeaker(s, TL.x0 + 24, y + TL.rh / 2, t);
      fitText(TL.x0 + 46, y + TL.rh / 2 + 5, PHONE && sm.short ? sm.short : sm.short || sm.name, TL.hw - 56, fs(14), { weight: 800, color: INK, align: 'left' });
      for (let i = 0; i < 4; i++) drawCell(s, i, t);
    });
    // 처음 시작 안내 링
    if (T.count === 0 && !RM) { const r = cellRect(0, 2); D.ring(r.x + r.w / 2, r.y + r.h / 2, Math.min(r.h, 54) * 0.5 + 4, t, { color: '#8b5cf6' }); }
    // 붉은 양배추 지시약 색 띠 (참고)
    const sy = TL.ry + 8 * TL.rh + (PHONE ? 14 : 10), sh = PHONE ? 78 : 56;
    panel(TL.x0, sy, VW - TL.x0 * 2, sh, { r: 12, blur: 4 });
    D.text(TL.x0 + 12, sy + fs(18), '🥬 붉은 양배추 지시약 색 띠 (참고)', { size: fs(13), weight: 800, color: '#4c1d95', align: 'left' });
    const bx = TL.x0 + 12, bw = VW - TL.x0 * 2 - 24, bh = PHONE ? 18 : 14, by = sy + fs(26);
    const sw = bw / STRIP.length;
    STRIP.forEach((c, k) => { ctx.fillStyle = c[0]; D.roundRect(bx + k * sw + 1, by, sw - 2, bh, k === 0 ? 7 : k === STRIP.length - 1 ? 7 : 2); ctx.fill(); });
    STRIP.forEach((c, k) => D.text(bx + k * sw + sw / 2, by + bh + fs(14), c[1], { size: fs(11), weight: 700, color: MUTED }));
    D.text(PHONE ? VW - 22 : VW - 24, sy + fs(18), '산성  ←   →  염기성', { size: fs(12), weight: 800, color: MUTED, align: 'right' });
  }

  /* =========================================================
     분류판 ① — 시료 8개를 산성 / 중성 / 염기성으로
     ========================================================= */
  const SB_BINS = [{ id: 'acid', label: '산성' }, { id: 'neutral', label: '중성' }, { id: 'base', label: '염기성' }];
  function sbLayout() {
    if (PHONE) {
      const bins = {}; SB_BINS.forEach((b, i) => { bins[b.id] = { x: 6 + i * 182, y: 8, w: 176, h: 520 }; });
      return { bins, tray: { x: 6, y: 536, w: 548, h: 216 }, cw: 166, ch: 56, gap: 6, headH: 40, trayHead: 22 };
    }
    const bins = {}; SB_BINS.forEach((b, i) => { bins[b.id] = { x: 16 + i * 259, y: 42, w: 250, h: 388 }; });
    return { bins, tray: { x: 16, y: 438, w: 768, h: 154 }, cw: 182, ch: 44, gap: 7, headH: 36, trayHead: 18 };
  }
  function dotAt(x, y, r, s, i) {
    const c = T.cells[s][i], shown = c.used && c.p >= 1, ind = INDS[i];
    if (!shown) {
      ctx.save(); ctx.setLineDash([3, 3]); ctx.strokeStyle = '#b7aed6'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke(); ctx.restore();
      return;
    }
    const res = resultOf(SAMPLES[s].kind, ind.id);
    ctx.fillStyle = res.c || '#ffffff';
    if (ind.type === 'paper') D.roundRect(x - r * 0.7, y - r, r * 1.4, r * 2, 2); else { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); }
    ctx.fill();
    ctx.strokeStyle = res.c ? shade(res.c, -0.3) : '#9aa5b6'; ctx.lineWidth = 1.5; ctx.stroke();
  }
  function drawSampleChip(it, w, h, st) {
    const s = it.idx, sm = SAMPLES[s];
    D.roundRect(-w / 2, -h / 2, w, h, 10);
    ctx.fillStyle = '#fff'; ctx.fill();
    ctx.strokeStyle = it.mark === 'bad' ? '#e2464b' : st.sel ? '#8b5cf6' : '#cdbff1'; ctx.lineWidth = it.mark === 'bad' ? 3 : st.sel ? 3 : 1.6; ctx.stroke();
    ctx.fillStyle = sm.tint; D.roundRect(-w / 2 + 5, -h / 2 + 5, 10, h - 10, 4); ctx.fill();
    ctx.strokeStyle = '#9fb0c9'; ctx.lineWidth = 1.2; ctx.stroke();
    if (PHONE) {
      fitText(-w / 2 + 22, -6, sm.chip || sm.short || sm.name, w - 28, fs(11.5), { weight: 800, color: INK, align: 'left' });
      for (let i = 0; i < 4; i++) dotAt(-w / 2 + 30 + i * 30, 14, 7, s, i);
    } else {
      fitText(-w / 2 + 22, 5, sm.chip || sm.short || sm.name, w - 22 - 4 * 17 - 14, 13.5, { weight: 800, color: INK, align: 'left' });
      for (let i = 0; i < 4; i++) dotAt(w / 2 - 12 - (3 - i) * 17, 0, 6, s, i);
    }
    if (it.mark === 'bad') D.text(w / 2 - 4, -h / 2 + 12, '✕', { size: 14, weight: 800, color: '#e2464b', align: 'right' });
  }
  function drawBinGeneric(b, r, st, label, col, sub) {
    D.roundRect(r.x, r.y, r.w, r.h, 16);
    ctx.fillStyle = rgba(col, st.hot ? 0.2 : 0.1); ctx.fill();
    ctx.save(); ctx.setLineDash([8, 6]); ctx.strokeStyle = rgba(col, st.hot ? 0.95 : 0.55); ctx.lineWidth = st.hot ? 3 : 2; ctx.stroke(); ctx.restore();
    D.text(r.x + r.w / 2, r.y + fs(24), label, { size: fs(17), weight: 800, color: shade(col, -0.25) });
    if (sub) D.text(r.x + r.w / 2, r.y + fs(24) + fs(15), sub, { size: fs(11.5), weight: 700, color: MUTED });
    if (st.count === 0) D.text(r.x + r.w / 2, r.y + r.h / 2, '여기에 놓아요', { size: fs(13), weight: 700, color: rgba(col, 0.55) });
  }
  const SB = makeBoard({
    items: SAMPLES.map((s) => ({ id: s.id })),
    bins: SB_BINS,
    layout: sbLayout,
    drawItem: drawSampleChip,
    drawBin: (b, r, st) => drawBinGeneric(b, r, st, b.label + ' 물질', KCOL[b.id], null),
    drawTray: (r) => { D.roundRect(r.x, r.y, r.w, r.h, 14); ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fill(); D.text(r.x + 12, r.y + fs(15), '시료 카드', { size: fs(12), weight: 800, color: MUTED, align: 'left' }); },
  });
  const sbWrong = () => SB.items.filter((it) => it.bin && it.bin !== SAMPLES[it.idx].kind);
  const sbAllOk = () => SB.items.every((it) => it.bin === SAMPLES[it.idx].kind);
  function sortCheck() {
    const placed = SB.items.filter((it) => it.bin).length;
    if (placed < SAMPLES.length) return '아직 상자에 넣지 않은 시료가 ' + (SAMPLES.length - placed) + '개 있어요.';
    const wrong = sbWrong();
    if (!wrong.length) return true;
    wrong.forEach((it) => { if (it.mark !== 'bad') { it.mark = 'bad'; it.shake = 1; } });
    const untested = wrong.filter((it) => !INDS.some((_, i) => cellShown(it.idx, i)));
    if (untested.length) return '✕ 표시된 카드를 다시 봐요. 점이 비어 있는 시료는 🧪 검사에서 먼저 검사해야 알 수 있어요.';
    return '✕ 표시된 카드를 다시 봐요. 색 점을 떠올려요: BTB는 노랑·초록·파랑으로 세 가지를 모두 구별해 줘요.';
  }


  /* =========================================================
     ② 성질 실험: 마그네슘 · 달걀 껍데기 · 단백질 · 전구 회로
     ========================================================= */
  const smp = (id) => SAMPLES.find((s) => s.id === id);
  const PO = { mg: ['hcl', 'vin', 'water', 'naoh'], egg: ['hcl', 'vin', 'water', 'naoh'], pro: ['naoh', 'soap', 'vin', 'water'], lamp: ['hcl', 'naoh', 'water', 'sugar'] };
  const PN = { mg: '마그네슘 리본 + 시료', egg: '달걀 껍데기 + 시료', pro: '단백질(삶은 달걀흰자) + 시료', lamp: '전구 회로 + 시료' };
  const PSHORT = { mg: '🧲 마그네슘', egg: '🥚 달걀 껍데기', pro: '🍳 단백질', lamp: '💡 전구 회로' };
  const P = { exp: 'mg', pick: { mg: 'hcl', egg: 'hcl', pro: 'naoh', lamp: 'hcl' }, done: { mg: false, egg: false, pro: false, lamp: false }, res: { mg: {}, egg: {}, pro: {}, lamp: {} }, lampSeen: {} };
  const X = { running: false, t: 0, g: 0, gv: 0, m: 0, shrink: 0, lift: 0, seq: 0, seqT: 0, flash: 0, lampB: 0, bub: 0, popPlayed: false, yi: 160 };
  const RUN = 6;
  const OX = 20, OY = PHONE ? 62 : 54;
  const wx = (x) => OX + x, wy = (y) => OY + y;
  const PT = makeTank({ x: 130, y: 196, w: 260, h: 184 }, 0.8, { elec: true });
  const liqCol = (sm) => mixc(sm.tint, '#8cc8ff', 0.5);
  const doneCount = () => Object.keys(P.done).filter((k) => P.done[k]).length;
  const curSample = () => smp(P.pick[P.exp]);

  function resetRun() {
    X.running = false; X.t = 0; X.g = 0; X.gv = 0; X.m = 0; X.shrink = 0; X.lift = 0; X.seq = 0; X.seqT = 0; X.flash = 0; X.lampB = 0; X.popPlayed = false; X.yi = 160;
    PT.clear(); PT.drift = 0;
    const sm = curSample(); PT.liquid = liqCol(sm);
  }
  function setRes(text) { P.res[P.exp][P.pick[P.exp]] = text; }
  function startRun() {
    resetRun();
    X.running = true; Sound.click();
    const sm = curSample();
    if (P.exp === 'lamp') {
      const w = PT.water();
      const add = (k, n) => { for (let i = 0; i < n; i++) PT.add(k, rnd(w.x + 30, w.x + w.w - 30), rnd(w.y + 20, w.y + w.h - 20), { a: 0 }); };
      if (sm.id === 'hcl') { add('H+', 6); add('Cl-', 6); }
      else if (sm.id === 'naoh') { add('Na+', 6); add('OH-', 6); }
      else if (sm.id === 'water') add('H2O', 9);
      else { add('suc', 4); add('H2O', 6); }
    }
    syncProps();
  }
  function syncProps() {
    const e = P.exp;
    $$('#expBtns .opt').forEach((b) => { b.classList.toggle('on', b.dataset.e === e); b.classList.toggle('done', !!P.done[b.dataset.e]); });
    $('#smpBtns').innerHTML = PO[e].map((id) => '<button type="button" class="opt' + (P.pick[e] === id ? ' on' : '') + '" data-s="' + id + '">' + (smp(id).short || smp(id).name) + '</button>').join('');
    $$('#smpBtns .opt').forEach((b) => b.addEventListener('click', () => { Sound.click(); P.pick[e] = b.dataset.s; resetRun(); syncProps(); }));
    $('#smpTitle').textContent = '시료 고르기 (' + PN[e].replace(' + 시료', '') + ' 실험)';
    $('#matchBtn').hidden = e !== 'mg';
    $('#matchBtn').disabled = !(e === 'mg' && X.g >= 0.5 && X.seq === 0);
    $('#runBtn').textContent = X.running ? '⏳ 실험 중…' : '▶ 실험하기';
    $('#runBtn').disabled = X.running;
    const notes = {
      mg: '시료를 고르고 ▶ 실험하기. 기체가 모이면 🔥 성냥불을 가까이 해 봐요.',
      egg: '시료를 고르고 ▶ 실험하기. 나온 기체를 석회수에 통과시켜요.',
      pro: '시료를 고르고 ▶ 실험하기. 삶은 달걀흰자 조각이 어떻게 되는지 봐요. 🧤 실제로는 보안경·장갑을 껴요.',
      lamp: '시료를 고르고 ▶ 실험하기. 전구가 켜지는 시료와 꺼진 채인 시료를 비교해 봐요. (네 가지를 모두 해 봐요)',
    };
    $('#propNote').textContent = notes[e];
  }

  function stepProps(dt) {
    const e = P.exp, sm = curSample();
    const acid = sm.kind === 'acid', base = sm.kind === 'base';
    if (X.running) {
      X.t += dt;
      if (X.t >= RUN) {
        X.running = false;
        if (e === 'mg') setRes(acid ? '기포(기체)가 계속 생겨요. 성냥불을 가까이 해 봐요.' : '변화 없음');
        if (e === 'egg') setRes(acid ? '기포(기체)가 생기고, 석회수가 뿌옇게 흐려져요.' : '변화 없음');
        if (e === 'pro') setRes(base ? '단백질이 녹아 미끈거려요.' : '변화 없음');
        if (e === 'lamp') setRes(sm.kind === 'acid' || sm.id === 'naoh' ? '전구가 켜져요 (이온이 있어요).' : '전구가 켜지지 않아요.');
        syncProps();
      }
    }
    X.flash = Math.max(0, X.flash - dt * 2.2);
    X.gv = approach(X.gv, X.g, dt, 5);
    { const lf = X.lift * 55; X.yi = approach(X.yi, X.lift > 0.25 ? 378 - lf : IFACE_Y(X.gv) - lf, dt, 8); }
    const run = X.running;
    if (e === 'mg') {
      if (run && acid && X.seq === 0 && X.t < RUN - 0.4) {
        X.g = Math.min(1, X.g + dt / 5.2);
        X.bub += dt * 16;
        while (X.bub >= 1) {
          X.bub -= 1;
          const sx = wx(100 + rnd(-14, 14)), sy = wy(352 + rnd(-6, 6));
          fx.emit({ x: sx, y: sy, vx: rnd(-6, 6), vy: -rnd(55, 85), life: 1.5, size: rnd(2.4, 4.2), color: '#ffffff', shape: 'bubble', fade: false });
        }
        if (Math.random() < dt * 9) {
          const yi = wy(IFACE_Y(X.gv));
          fx.emit({ x: wx(340) + rnd(-8, 8), y: wy(384), vx: 0, vy: -90, life: Math.max(0.2, (384 - IFACE_Y(X.gv)) / 90), size: rnd(2.5, 3.8), color: '#ffffff', shape: 'bubble', fade: false });
        }
      }
      if (X.seq > 0) {
        X.seqT += dt;
        const s = X.seqT;
        X.lift = s < 0.5 ? s / 0.5 : s < 1.55 ? 1 : Math.max(0, 1 - (s - 1.55) / 0.55);
        if (s >= 1.1 && !X.popPlayed) {
          X.popPlayed = true; X.flash = 1; X.g = 0; P.done.mg = true;
          Sound.tone(180, 0.12, 'square', 0.18); Sound.tone(90, 0.2, 'sawtooth', 0.12, 0.03);
          const m = { x: wx(340), y: wy(375 - 55) };
          fx.burst(m.x, m.y, { count: 14, colors: ['#fff6c2', '#ffd34d', '#ff9f43'], speed: 150, size: 3.5, gravity: 0, life: 0.45 });
          showHint('퍽! 소리가 났어요. 이 기체는 수소(H₂)예요.', 4200);
          setRes('기포(기체)가 생기고, 성냥불에 "퍽!" 소리 → 수소 기체');
          syncProps();
        }
        if (s >= 2.1) { X.seq = 0; X.lift = 0; syncProps(); }
      }
    } else if (e === 'egg') {
      if (run && acid && X.t < RUN - 0.4) {
        X.m = Math.min(1, X.m + dt / 4.8);
        X.bub += dt * 14;
        while (X.bub >= 1) {
          X.bub -= 1;
          fx.emit({ x: wx(100 + rnd(-18, 18)), y: wy(360 + rnd(-6, 4)), vx: rnd(-6, 6), vy: -rnd(55, 85), life: 1.45, size: rnd(2.4, 4), color: '#ffffff', shape: 'bubble', fade: false });
          fx.emit({ x: wx(340) + rnd(-6, 6), y: wy(352), vx: 0, vy: -rnd(60, 90), life: 1.5, size: rnd(2.5, 3.8), color: '#ffffff', shape: 'bubble', fade: false });
        }
      }
      if (X.m >= 0.98 && !P.done.egg) { P.done.egg = true; Sound.success(); showHint('석회수가 뿌옇게 흐려졌어요. 이산화 탄소(CO₂)가 나왔다는 뜻이에요.', 4500); syncProps(); }
    } else if (e === 'pro') {
      if (run && base) {
        X.shrink = Math.min(1, X.shrink + dt / 5.3);
        if (Math.random() < dt * 10) fx.emit({ x: wx(260 + rnd(-40, 40)), y: wy(300 + rnd(-20, 10)), vx: rnd(-10, 10), vy: rnd(5, 18), life: 1.6, size: rnd(1.6, 3), color: 'rgba(255,255,250,.9)', shape: 'circle' });
      }
      if (X.shrink >= 0.98 && !P.done.pro) { P.done.pro = true; Sound.success(); showHint('단백질이 녹아 미끈미끈해졌어요. 염기는 피부의 단백질도 녹여요!', 4500); syncProps(); }
    } else {
      const ionic = sm.kind === 'acid' || sm.id === 'naoh';
      X.lampB = approach(X.lampB, run && ionic && X.t > 0.5 ? 1 : 0, dt, 5);
      PT.drift = approach(PT.drift, run ? 1 : 0, dt, 3);
      PT.update(dt);
      if (run && X.t >= 1.8 && !P.lampSeen[sm.id]) {
        P.lampSeen[sm.id] = true;
        if (Object.keys(P.lampSeen).length >= 4 && !P.done.lamp) { P.done.lamp = true; Sound.success(); syncProps(); }
      }
    }
    // 단추 상태
    const mb = $('#matchBtn');
    const mbOff = !(e === 'mg' && X.g >= 0.5 && X.seq === 0);
    if (mb.disabled !== mbOff) mb.disabled = mbOff;
    const rb = $('#runBtn'); if (rb.disabled !== X.running) { rb.disabled = X.running; rb.textContent = X.running ? '⏳ 실험 중…' : '▶ 실험하기'; }
  }
  const IFACE_Y = (g) => lerp(160, 336, clamp(g, 0, 1));

  function benchTop() {
    const g = ctx.createLinearGradient(0, wy(396), 0, wy(430));
    g.addColorStop(0, '#d9c3a5'); g.addColorStop(1, '#b89b78');
    D.roundRect(wx(-10), wy(396), 560, 30, 8); ctx.fillStyle = g; ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.fillRect(wx(-4), wy(398), 548, 3);
  }
  function tubePathInv(cx, top, w, mouth) {
    ctx.beginPath(); ctx.moveTo(cx - w / 2, mouth); ctx.lineTo(cx - w / 2, top + w / 2); ctx.arc(cx, top + w / 2, w / 2, Math.PI, 0); ctx.lineTo(cx + w / 2, mouth);
  }
  function glassTube(pts, w) {
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(140,160,190,.9)'; ctx.lineWidth = w + 3;
    ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke();
    ctx.strokeStyle = 'rgba(235,244,255,.95)'; ctx.lineWidth = w - 1;
    ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke();
    ctx.restore();
  }
  function cork(cx, y) {
    D.shadow(() => { D.roundRect(cx - 19, y - 8, 38, 20, 5); ctx.fillStyle = '#c28a52'; ctx.fill(); }, { blur: 4, y: 2 });
    ctx.fillStyle = 'rgba(0,0,0,.14)'; for (let i = 0; i < 4; i++) ctx.fillRect(cx - 14 + i * 8, y - 3, 3, 3);
  }
  function drawTroughAndTube(t, sm) {
    // 물 수조
    D.roundRect(222, 332, 252, 66, 10); ctx.fillStyle = 'rgba(205,225,245,.55)'; ctx.fill();
    ctx.save(); D.roundRect(226, 340, 244, 54, 6); ctx.clip();
    const g = ctx.createLinearGradient(0, 340, 0, 394); g.addColorStop(0, 'rgba(110,185,245,.7)'); g.addColorStop(1, 'rgba(70,150,225,.85)');
    ctx.fillStyle = g; ctx.fillRect(226, 340, 244, 54); ctx.restore();
    ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 3; D.roundRect(222, 332, 252, 66, 10); ctx.stroke();
    // 거꾸로 세운 시험관
    const lift = X.lift * 55, cx = 340, top = 150 - lift, mouth = 378 - lift, w = 56;
    ctx.save(); tubePathInv(cx, top, w, mouth); ctx.clip();
    const yi = X.yi;
    ctx.fillStyle = 'rgba(120,190,250,.55)'; ctx.fillRect(cx - w, yi, w * 2, mouth - yi + 4);
    ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.fillRect(cx - w, top, w * 2, yi - top);
    ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(cx - w, yi - 1, w * 2, 3);
    ctx.restore();
    ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 3; tubePathInv(cx, top, w, mouth); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx - w / 2 + 6, top + 22); ctx.lineTo(cx - w / 2 + 6, mouth - 22); ctx.stroke();
    if (X.gv > 0.12) D.text(cx, top + 40, '기체', { size: 13, weight: 800, color: '#5d6879', alpha: clamp(X.gv * 3, 0, 1) });
    // 성냥
    if (X.seq > 0) {
      const s = X.seqT, k = smooth(seg(s, 0.5, 1.1)), mx = lerp(cx + 130, cx + 6, k), my = mouth + 24 + (1 - k) * 8;
      ctx.save(); ctx.translate(mx, my); ctx.rotate(-0.5);
      D.roundRect(-4, -2, 66, 5, 2); ctx.fillStyle = '#d9a35c'; ctx.fill();
      ctx.restore();
      if (s < 1.55) D.flame(mx - 4, my - 4, 22, t);
      if (X.flash > 0) {
        D.glow(cx, mouth + 6, 70 * X.flash + 20, '#ffd34d', 0.8 * X.flash);
        D.text(cx + 64, mouth - 18, '퍽!', { size: 26, weight: 800, color: '#e8590c', stroke: '#fff', strokeWidth: 5, alpha: clamp(X.flash * 1.6, 0, 1) });
      }
    }
  }
  function drawProps(t) {
    const e = P.exp, sm = curSample();
    ctx.save();
    benchTop();
    D.text(wx(260), wy(-14), '⚗️ ' + PN[e].replace('시료', sm.short || sm.name), { size: fs(15), weight: 800, color: '#4c1d95' });
    if (e === 'mg' || e === 'egg') {
      // 반응 시험관
      const lc = liqCol(sm);
      ctx.save(); ctx.translate(wx(0), wy(0));
      glassTube([[100, 128], [100, 70], e === 'mg' ? [430, 70] : [340, 70]].concat(e === 'mg' ? [[430, 388], [340, 388]] : [[340, 352]]), 7);
      D.testTube(100, 140, 62, 240, { level: 0.6, liquid: lc });
      cork(100, 130);
      if (e === 'mg') {
        const sz = P.exp === 'mg' && curSample().kind === 'acid' ? 1 - 0.35 * smooth(X.t / RUN) : 1;
        ctx.save(); ctx.translate(100, 345); ctx.rotate(-0.12);
        D.roundRect(-5, -34 * sz, 10, 70 * sz, 3); ctx.fillStyle = '#c4cad3'; ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillRect(-3, -32 * sz, 3, 64 * sz);
        ctx.restore();
        drawTroughAndTube(t, sm);
      } else {
        for (let i = 0; i < 6; i++) { // 달걀 껍데기 조각
          const px = 100 + (i - 2.5) * 8, py = 366 - (i % 2) * 7;
          ctx.save(); ctx.translate(px, py); ctx.rotate(i * 0.9);
          ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(-2, -7); ctx.lineTo(8, -2); ctx.lineTo(4, 6); ctx.lineTo(-6, 5); ctx.closePath();
          ctx.fillStyle = '#fbf6ea'; ctx.fill(); ctx.strokeStyle = '#d6c9aa'; ctx.lineWidth = 1.2; ctx.stroke(); ctx.restore();
        }
        // 석회수 시험관 (이산화 탄소를 통과시키면 뿌옇게)
        const milk = mixc('#cfe6fb', '#f6f6f2', smooth(X.m));
        D.testTube(340, 150, 58, 230, { level: 0.62, liquid: milk });
        D.text(340, 138, '석회수', { size: 13, weight: 800, color: '#4c1d95' });
      }
      D.text(100, 114, e === 'mg' ? '마그네슘 리본' : '달걀 껍데기', { size: 13, weight: 800, color: '#4c1d95' });
      ctx.restore();
    } else if (e === 'pro') {
      ctx.save(); ctx.translate(wx(0), wy(0));
      const lc = liqCol(sm);
      D.beaker(150, 150, 220, 232, { level: 0.64, liquid: lc, t, wave: 1.5 });
      // 단백질 조각
      const k = X.shrink, sc = 1 - 0.8 * smooth(k);
      ctx.save(); ctx.translate(260, 330 - 20 * k); ctx.scale(sc, sc);
      ctx.globalAlpha = 1 - 0.55 * smooth(k);
      D.shadow(() => { ctx.beginPath(); ctx.ellipse(0, 0, 54, 30, 0, 0, TAU); ctx.fillStyle = '#fbfaf3'; ctx.fill(); }, { blur: 8, y: 3 });
      ctx.strokeStyle = '#e4dcc0'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(0, 0, 54, 30, 0, 0, TAU); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.ellipse(-16, -10, 18, 7, -0.3, 0, TAU); ctx.fill();
      ctx.restore();
      if (k > 0.35) { // 미끌미끌한 막
        ctx.save(); ctx.globalAlpha = smooth((k - 0.35) / 0.4) * 0.8;
        for (let i = 0; i < 4; i++) { ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(190 + i * 38, 238 + Math.sin(t * 2 + i) * 2); ctx.quadraticCurveTo(205 + i * 38, 232, 218 + i * 38, 240); ctx.stroke(); }
        ctx.restore();
        D.text(260, 214, '미끈미끈', { size: 18, weight: 800, color: '#7c3aed', alpha: smooth((k - 0.35) / 0.4) });
      }
      D.text(260, 134, '삶은 달걀흰자 조각', { size: 13, weight: 800, color: '#4c1d95' });
      ctx.restore();
    } else {
      ctx.save(); ctx.translate(wx(0), wy(0));
      PT.liquid = liqCol(sm);
      PT.drawBeaker(t);
      PT.drawElectrodes();
      PT.drawParticles(t);
      PT.drawCircuit(X.lampB, t);
      ctx.restore();
      if (X.running || X.t > 0) {
        const msg = sm.kind === 'acid' || sm.id === 'naoh' ? '이온이 있고 움직여요 → 전류가 흘러요' : sm.id === 'sugar' ? '설탕 분자는 이온이 아니에요 → 전류 없음' : '이온이 거의 없어요 → 전류 없음';
        pill(wx(260), PHONE ? wy(414) : wy(440), msg, { bg: '#fff', color: INK, border: '#c9b6f5', size: fs(13) });
      }
    }
    ctx.restore();
    if (e === 'pro') pill(wx(260), PHONE ? wy(414) : wy(440), '🧤 실제 실험에서는 보안경과 장갑을 껴요', { bg: '#fff4dc', color: '#7a4a00', border: '#f3d38a', size: fs(13) });
    drawObsPanel();
  }
  function drawObsPanel() {
    const e = P.exp;
    const r = PHONE ? { x: 12, y: 500, w: 536, h: 250 } : { x: 568, y: 40, w: 222, h: 420 };
    panel(r.x, r.y, r.w, r.h, { r: 14, stroke: '#d9cffa' });
    D.text(r.x + 14, r.y + fs(24), '📋 관찰 기록', { size: fs(15), weight: 800, color: '#4c1d95', align: 'left' });
    const rowH = (r.h - fs(44) - (PHONE ? 8 : 70)) / 4;
    PO[e].forEach((id, k) => {
      const y = r.y + fs(36) + k * rowH, sm = smp(id), txt = P.res[e][id];
      const cur = P.pick[e] === id;
      D.roundRect(r.x + 8, y + 2, r.w - 16, rowH - 4, 9); ctx.fillStyle = cur ? '#f1ebff' : '#f8f8fc'; ctx.fill();
      D.text(r.x + 16, y + fs(18), sm.short || sm.name, { size: fs(12.5), weight: 800, color: INK, align: 'left' });
      if (txt) wrapText(r.x + 16, y + fs(18) + fs(15), txt, r.w - 34, fs(11.5), fs(14), { weight: 700, color: txt.indexOf('변화 없음') === 0 || txt.indexOf('켜지지') >= 0 ? MUTED : '#0b6b39', align: 'left' });
      else D.text(r.x + 16, y + fs(18) + fs(15), '아직 안 해 봤어요', { size: fs(11.5), weight: 700, color: '#a79ec5', align: 'left' });
    });
    if (P.done[e]) {
      const concl = { mg: '산은 마그네슘과 반응해 수소 기체를 내요.', egg: '산은 탄산 칼슘(달걀 껍데기)과 반응해 이산화 탄소를 내요.', pro: '염기는 단백질을 녹여요 (미끈거림).', lamp: '산·염기 수용액에는 이온이 있어 전류가 흘러요.' }[e];
      const cy = r.y + r.h - (PHONE ? 8 : 62);
      if (!PHONE) { D.roundRect(r.x + 8, cy, r.w - 16, 54, 9); ctx.fillStyle = '#e2f6eb'; ctx.fill(); wrapText(r.x + 16, cy + 18, '✅ ' + concl, r.w - 32, 12, 15, { weight: 800, color: '#0b6b39', align: 'left' }); }
    }
  }


  /* =========================================================
     ③ 이온 모형: 물질 카드를 물에 녹여 보기
     ========================================================= */
  const ICARDS = [
    { id: 'hcl', f: 'HCl', name: '염화 수소', mol: 'HCl', ions: ['H+', 'Cl-'], n: 6, lamp: true, res: 'H⁺ + Cl⁻' },
    { id: 'naoh', f: 'NaOH', name: '수산화 나트륨', mol: 'NaOH', ions: ['Na+', 'OH-'], n: 6, lamp: true, res: 'Na⁺ + OH⁻' },
    { id: 'suc', f: 'C₁₂H₂₂O₁₁', name: '설탕', mol: 'suc', n: 4, lamp: false, res: '이온 없음 (분자 그대로 녹아요)' },
    { id: 'ch4', f: 'CH₄', name: '메테인', mol: 'CH4', n: 6, lamp: false, res: '물에 거의 녹지 않아요', gas: true },
    { id: 'meoh', f: 'CH₃OH', name: '메탄올', mol: 'MeOH', n: 6, lamp: false, res: '이온 없음 (분자 그대로 녹아요)' },
  ];
  const IL = PHONE
    ? { box: { x: 150, y: 128, w: 260, h: 220 }, level: 0.8, cards: { y: 558, x0: 16, cw: 100, ch: 76, gap: 8, cols: 5 }, info: { x: 14, y: 372, w: 532, h: 176 } }
    : { box: { x: 222, y: 196, w: 250, h: 236 }, level: 0.8, cards: { x: 14, y0: 70, cw: 166, ch: 64, gap: 10 }, info: { x: 514, y: 70, w: 276, h: 360 } };
  const IT = makeTank(IL.box, IL.level, { elec: true });
  const IO = { cur: null, t: 0, tried: {}, lamp: 0, drag: null, hover: false };
  const cardPos = (i) => (PHONE
    ? { x: IL.cards.x0 + IL.cards.cw / 2 + i * (IL.cards.cw + IL.cards.gap), y: IL.cards.y + IL.cards.ch / 2 }
    : { x: IL.cards.x + IL.cards.cw / 2, y: IL.cards.y0 + IL.cards.ch / 2 + i * (IL.cards.ch + IL.cards.gap) });
  const inBeaker = (p) => p.x >= IL.box.x - 10 && p.x <= IL.box.x + IL.box.w + 10 && p.y >= IL.box.y - 60 && p.y <= IL.box.y + IL.box.h;
  const ionTriedCount = () => ICARDS.filter((c) => IO.tried[c.id]).length;
  function startDissolve(id) {
    const c = ICARDS.find((q) => q.id === id);
    IO.cur = id; IO.t = 0;
    IT.fadeOutAll();
    Sound.tick();
    const w = IT.water();
    for (let i = 0; i < c.n; i++) {
      IT.later(0.5 + i * 0.2, () => {
        const x = rnd(w.x + 50, w.x + w.w - 50);
        const o = { enter: 1, a: 1, vy: 60, spd: rnd(14, 26) };
        if (c.ions) o.split = { at: 1.2 + i * 0.12, a: c.ions[0], b: c.ions[1] };
        if (c.gas) o.rise = true;
        IT.add(c.mol, x, w.y - 36, o);
      });
    }
    if (c.id === 'naoh' || c.id === 'hcl') showHint(c.f + ' 분자가 물에 들어가면 어떻게 될까요?', 3000);
  }
  function stepIon(dt) {
    if (IO.cur) {
      IO.t += dt;
      const c = ICARDS.find((q) => q.id === IO.cur);
      if (IO.t > 3.4 && !IO.tried[c.id]) {
        IO.tried[c.id] = true; Sound.success();
        showHint(c.id === 'hcl' ? 'HCl → H⁺ + Cl⁻ : 수소 이온(H⁺)이 나왔어요!' : c.id === 'naoh' ? 'NaOH → Na⁺ + OH⁻ : 수산화 이온(OH⁻)이 나왔어요!' : c.res, 4200);
      }
    }
    const ions = IT.ps.filter((p) => CHARGE[p.k] && !p.dying).length;
    IO.lamp = approach(IO.lamp, ions >= 8 ? 1 : 0, dt, 4);
    IT.drift = approach(IT.drift, ions >= 4 ? 1 : 0, dt, 3);
    IT.update(dt);
  }
  function drawIonCard(c, x, y, w, h, o) {
    o = o || {};
    ctx.save(); ctx.translate(x, y); if (o.drag) ctx.scale(1.08, 1.08);
    if (o.drag) D.shadow(() => { D.roundRect(-w / 2, -h / 2, w, h, 12); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: 16, y: 8, color: 'rgba(40,20,90,.3)' });
    else D.shadow(() => { D.roundRect(-w / 2, -h / 2, w, h, 12); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: 6, y: 2 });
    D.roundRect(-w / 2, -h / 2, w, h, 12); ctx.strokeStyle = IO.cur === c.id ? '#8b5cf6' : '#cdbff1'; ctx.lineWidth = IO.cur === c.id ? 3 : 1.8; ctx.stroke();
    drawMol(c.mol, PHONE ? 0 : -w / 2 + 28, PHONE ? -h / 2 + 22 : 0, 0, PHONE ? 0.75 : 0.8, 1, 0);
    if (PHONE) {
      fitText(0, 8, c.f, w - 8, fs(13), { weight: 800, color: INK });
      D.text(0, 8 + fs(14), c.name, { size: fs(10.5), weight: 700, color: MUTED });
    } else {
      fitText(18, -3, c.f, w - 70, 17, { weight: 800, color: INK });
      D.text(18, 17, c.name, { size: 12.5, weight: 700, color: MUTED });
    }
    if (IO.tried[c.id]) D.text(w / 2 - 14, -h / 2 + 16, '✓', { size: 15, weight: 800, color: '#14a058' });
    ctx.restore();
  }
  function drawIon(t) {
    // 안내
    D.text(PHONE ? VW / 2 : 338, PHONE ? fs(24) : 40, '물질 카드를 끌어 물에 넣어 봐요', { size: fs(15), weight: 800, color: '#4c1d95' });
    if (!PHONE) D.text(100, 56, '🃏 물질 카드', { size: 13, weight: 800, color: MUTED });
    ICARDS.forEach((c, i) => {
      const p = cardPos(i);
      if (IO.drag && IO.drag.id === c.id) { ctx.save(); ctx.globalAlpha = 0.3; drawIonCard(c, p.x, p.y, IL.cards.cw, IL.cards.ch); ctx.restore(); }
      else drawIonCard(c, p.x, p.y, IL.cards.cw, IL.cards.ch);
    });
    // 비커 + 입자
    if (IO.hover) { D.roundRect(IL.box.x - 12, IL.box.y - 40, IL.box.w + 24, IL.box.h + 48, 16); ctx.strokeStyle = 'rgba(139,92,246,.7)'; ctx.lineWidth = 3; ctx.setLineDash([8, 6]); ctx.stroke(); ctx.setLineDash([]); }
    IT.drawBeaker(t); IT.drawElectrodes(); IT.drawParticles(t); IT.drawCircuit(IO.lamp, t);
    D.text(IL.box.x + IL.box.w / 2, IL.box.y + IL.box.h + fs(22), '물', { size: fs(13), weight: 800, color: MUTED });
    // 설명판
    const r = IL.info;
    panel(r.x, r.y, r.w, r.h, { r: 14, stroke: '#d9cffa' });
    D.text(r.x + 14, r.y + fs(24), '🔍 입자 돋보기', { size: fs(15), weight: 800, color: '#4c1d95', align: 'left' });
    const c = ICARDS.find((q) => q.id === IO.cur);
    if (!c) {
      wrapText(r.x + 14, r.y + fs(54), '물질 카드를 물에 넣으면 물속에서 어떤 입자가 되는지 볼 수 있어요.', r.w - 28, fs(13.5), fs(19), { weight: 700, color: MUTED, align: 'left' });
    } else {
      D.text(r.x + 14, r.y + fs(54), c.f + ' 카드를 물에 넣었어요', { size: fs(14), weight: 800, color: INK, align: 'left' });
      const done = IO.t > 3.4;
      let line = c.res;
      if (c.ions) {
        const cnt = (k) => IT.count(k);
        line = c.ions[0].replace('+', '⁺') + ' ' + cnt(c.ions[0]) + '개 + ' + c.ions[1].replace('-', '⁻') + ' ' + cnt(c.ions[1]) + '개';
      }
      fitText(r.x + 14, r.y + fs(80), '물속의 입자: ' + line, r.w - 24, fs(13.5), { weight: 800, color: c.ions ? '#b3262b' : '#0b6b39', align: 'left' });
      const why = {
        hcl: '산 : 수용액에서 수소 이온(H⁺)을 내놓는 물질',
        naoh: '염기 : 수용액에서 수산화 이온(OH⁻)을 내놓는 물질',
        suc: '수소(H)가 들어 있어도 H⁺을 내놓지 않아요. 산이 아니에요.',
        ch4: '수소(H)가 들어 있어도 H⁺을 내놓지 않아요. 산이 아니에요.',
        meoh: 'OH가 붙어 있어도 OH⁻로 떨어지지 않아요. 염기가 아니에요.',
      }[c.id];
      if (done) {
        const hh = PHONE ? 46 : 78;
        D.roundRect(r.x + 10, r.y + fs(96), r.w - 20, hh, 10); ctx.fillStyle = c.ions ? '#fff4f4' : '#eefaf2'; ctx.fill();
        wrapText(r.x + 20, r.y + fs(96) + fs(20), why, r.w - 40, fs(13), fs(17), { weight: 800, color: INK, align: 'left' });
      }
      if (!PHONE) {
        D.text(r.x + 14, r.y + 240, '전구', { size: 13, weight: 800, color: MUTED, align: 'left' });
        D.text(r.x + 14 + 44, r.y + 240, IO.lamp > 0.5 ? '켜짐 💡 (이온이 전류를 날라요)' : '꺼짐 (이온이 없어요)', { size: 13, weight: 800, color: IO.lamp > 0.5 ? '#b45309' : MUTED, align: 'left' });
      }
    }
    // 범례
    const ly = PHONE ? VH - 60 : VH - 40, items = [['H+', 'H⁺'], ['OH-', 'OH⁻'], ['Na+', 'Na⁺'], ['Cl-', 'Cl⁻']];
    const lx0 = PHONE ? 70 : 250;
    items.forEach((it, i) => { drawMol(it[0], lx0 + i * (PHONE ? 108 : 100), ly, 0, 0.75, 1, 0); D.text(lx0 + i * (PHONE ? 108 : 100) + 20, ly + 5, it[1], { size: fs(13), weight: 800, color: MUTED, align: 'left' }); });
  }
  function ionPointer(p, type) {
    if (type === 'down') {
      for (let i = 0; i < ICARDS.length; i++) {
        const c = cardPos(i);
        if (Math.abs(p.x - c.x) <= IL.cards.cw / 2 && Math.abs(p.y - c.y) <= IL.cards.ch / 2) {
          IO.drag = { id: ICARDS[i].id, x: p.x, y: p.y, sx: p.x, sy: p.y, moved: false }; Sound.click(); return true;
        }
      }
      return false;
    }
    const d = IO.drag; if (!d) return true;
    if (type === 'move') { d.x = p.x; d.y = p.y; if (Math.hypot(p.x - d.sx, p.y - d.sy) > 8) d.moved = true; IO.hover = d.moved && inBeaker(p); }
    else if (type === 'up') {
      IO.hover = false; IO.drag = null;
      if (!d.moved || inBeaker(p)) startDissolve(d.id);
      else showHint('카드를 비커의 물 위에 놓아요', 2600);
    }
    return true;
  }
  function drawIonDrag() {
    if (!IO.drag || !IO.drag.moved) return;
    const c = ICARDS.find((q) => q.id === IO.drag.id);
    drawIonCard(c, IO.drag.x, IO.drag.y, IL.cards.cw, IL.cards.ch, { drag: true });
  }
  function defCheck() {
    const a = $('#defAcid').value, b = $('#defBase').value;
    if (!a || !b) return '두 빈칸을 모두 골라요.';
    if (a === 'H+' && b === 'OH-') return true;
    if (a !== 'H+' && b !== 'OH-') return '둘 다 다시 생각해 봐요. 앞에서 HCl과 NaOH를 물에 녹였을 때 어떤 이온이 나왔나요?';
    if (a !== 'H+') return '산에서 나온 이온을 다시 봐요. HCl이 물에서 어떻게 갈라졌나요?';
    return '염기에서 나온 이온을 다시 봐요. NaOH가 물에서 어떻게 갈라졌나요?';
  }
  ['defAcid', 'defBase'].forEach((id) => $('#' + id).addEventListener('change', (e) => {
    const ok = id === 'defAcid' ? e.target.value === 'H+' : e.target.value === 'OH-';
    e.target.classList.toggle('ok', ok && !!e.target.value); e.target.classList.toggle('bad', !ok && !!e.target.value);
    if (ok) Sound.click();
  }));
  function resetIon() {
    IT.clear(); IO.cur = null; IO.t = 0; IO.lamp = 0; IT.drift = 0; IO.drag = null; IO.hover = false;
  }

  /* =========================================================
     ④ 생활 속 물질 분류
     ========================================================= */
  const AITEMS = [
    { n: '비누', e: '🧼', k: 'base' }, { n: '식초', e: '🍶', k: 'acid' }, { n: '제산제', e: '💊', k: 'base' }, { n: '레몬', e: '🍋', k: 'acid' },
    { n: '세제', e: '🧴', k: 'base' }, { n: '산성비', e: '🌧️', k: 'acid' }, { n: '석회수', e: '🥛', k: 'base' }, { n: '탄산음료', e: '🥤', k: 'acid' },
    { n: '하수구 세정제', e: '🪣', k: 'base' }, { n: '위액', e: '💧', k: 'acid' }, { n: '치약', e: '🪥', k: 'base' }, { n: '산성 세정제', e: '🚽', k: 'acid' },
  ];
  const AB_BINS = [{ id: 'acid', label: '산성' }, { id: 'base', label: '염기성' }];
  function abLayout() {
    if (PHONE) {
      return { bins: { acid: { x: 8, y: 8, w: 270, h: 400 }, base: { x: 282, y: 8, w: 270, h: 400 } }, tray: { x: 8, y: 416, w: 544, h: 336 }, cw: 126, ch: 52, gap: 6, headH: 44, trayHead: 22 };
    }
    return { bins: { acid: { x: 16, y: 42, w: 380, h: 340 }, base: { x: 404, y: 42, w: 380, h: 340 } }, tray: { x: 16, y: 392, w: 768, h: 200 }, cw: 176, ch: 46, gap: 7, headH: 40, trayHead: 18 };
  }
  const AB = makeBoard({
    items: AITEMS.map((a) => ({ id: a.n })),
    bins: AB_BINS,
    layout: abLayout,
    drawItem(it, w, h, st) {
      const a = AITEMS[it.idx];
      D.roundRect(-w / 2, -h / 2, w, h, 10); ctx.fillStyle = '#fff'; ctx.fill();
      ctx.strokeStyle = it.mark === 'bad' ? '#e2464b' : st.sel ? '#8b5cf6' : '#cdbff1'; ctx.lineWidth = it.mark === 'bad' || st.sel ? 3 : 1.6; ctx.stroke();
      ctx.font = D.font(fs(20), 700); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = INK;
      ctx.fillText(a.e, -w / 2 + fs(20), 2);
      ctx.textBaseline = 'alphabetic';
      fitText(-w / 2 + fs(38), 5, a.n, w - fs(38) - 8, fs(14), { weight: 800, color: INK, align: 'left' });
      if (it.mark === 'bad') D.text(w / 2 - 4, -h / 2 + 12, '✕', { size: 14, weight: 800, color: '#e2464b', align: 'right' });
    },
    drawBin: (b, r, st) => drawBinGeneric(b, r, st, b.label + ' 물질', KCOL[b.id], b.id === 'acid' ? '산 : H⁺을 내놓아요' : '염기 : OH⁻을 내놓아요'),
    drawTray: (r) => { D.roundRect(r.x, r.y, r.w, r.h, 14); ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fill(); D.text(r.x + 12, r.y + fs(15), '생활 속 물질 카드', { size: fs(12), weight: 800, color: MUTED, align: 'left' }); },
  });
  const abWrong = () => AB.items.filter((it) => it.bin && it.bin !== AITEMS[it.idx].k);
  function applyCheck() {
    const placed = AB.items.filter((it) => it.bin).length;
    if (placed < AITEMS.length) return '아직 상자에 넣지 않은 카드가 ' + (AITEMS.length - placed) + '장 있어요.';
    const wrong = abWrong();
    if (wrong.length) {
      wrong.forEach((it) => { if (it.mark !== 'bad') { it.mark = 'bad'; it.shake = 1; } });
      return '✕ 표시된 카드를 다시 봐요. 신맛이 나고 금속을 녹이는 것은 산성, 미끌거리고 단백질을 녹이는 것은 염기성이에요.';
    }
    const ai = $('#rsAcidIon').value, ap = $('#rsAcidPr').value, bi = $('#rsBaseIon').value, bp = $('#rsBasePr').value;
    if (!ai || !ap || !bi || !bp) return '카드는 모두 맞았어요! 이제 아래 4개의 선택칸도 채워요.';
    if (ai !== 'H+' || bi !== 'OH-') return '공통 이온을 다시 골라 봐요. 산은 H⁺, 염기는 OH⁻을 내놓았지요.';
    if (ap !== 'a' || bp !== 'b') return '성질을 다시 골라 봐요. 산은 마그네슘과 반응해 수소 기체를, 염기는 단백질을 녹여 미끌거렸어요.';
    return true;
  }
  ['rsAcidIon', 'rsAcidPr', 'rsBaseIon', 'rsBasePr'].forEach((id) => $('#' + id).addEventListener('change', (e) => {
    const want = { rsAcidIon: 'H+', rsAcidPr: 'a', rsBaseIon: 'OH-', rsBasePr: 'b' }[id];
    const v = e.target.value; e.target.classList.toggle('ok', v === want); e.target.classList.toggle('bad', !!v && v !== want);
    if (v === want) Sound.click();
  }));


  /* =========================================================
     읽기판 · 입력 · 그리기 · 반복
     ========================================================= */
  function updateReadouts() {
    const sc = S.scene;
    if (sc === 'test') {
      const sm = SAMPLES[S.sel];
      setRO(1, '선택한 시료', sm.name);
      setRO(2, '검사한 칸', cellCount() + ' / ' + SAMPLES.length * INDS.length);
      setRO(3, '성질 카드 (맛·촉감)', sm.taste);
    } else if (sc === 'sort') {
      const c = (k) => SB.inBin(k).length;
      setRO(1, '분류한 시료', SB.placed().length + ' / ' + SAMPLES.length);
      setRO(2, '산성 · 중성 · 염기성', c('acid') + ' · ' + c('neutral') + ' · ' + c('base') + '개');
      setRO(3, '도움말', '카드를 누르고 상자를 눌러도 돼요');
    } else if (sc === 'props') {
      const sm = curSample();
      setRO(1, '실험', PSHORT[P.exp].slice(3));
      setRO(2, '시료', sm.short || sm.name);
      setRO(3, '끝낸 실험', doneCount() + ' / 4');
    } else if (sc === 'ion') {
      const c = ICARDS.find((q) => q.id === IO.cur);
      setRO(1, '물에 넣은 물질', c ? c.f + ' (' + c.name + ')' : '-');
      setRO(2, '물속의 입자', c ? (c.ions ? c.res : c.res.indexOf('이온') === 0 ? '이온 없음' : '녹지 않음') : '-');
      setRO(3, '녹여 본 카드', ionTriedCount() + ' / ' + ICARDS.length);
    } else {
      const ok = AB.items.filter((it) => it.bin && it.bin === AITEMS[it.idx].k).length;
      setRO(1, '분류한 카드', AB.placed().length + ' / ' + AITEMS.length);
      setRO(2, '산성 · 염기성', AB.inBin('acid').length + ' · ' + AB.inBin('base').length + '장');
      setRO(3, '맞게 놓은 카드', ok + ' / ' + AITEMS.length);
    }
  }

  SciSim.pointer(view, {
    down(p) {
      if (S.scene === 'sort') return SB.down(p);
      if (S.scene === 'apply') return AB.down(p);
      if (S.scene === 'ion') return ionPointer(p, 'down');
      return false;
    },
    move(p) { if (S.scene === 'sort') SB.move(p); else if (S.scene === 'apply') AB.move(p); else if (S.scene === 'ion') ionPointer(p, 'move'); },
    up(p) { if (S.scene === 'sort') SB.up(p); else if (S.scene === 'apply') AB.up(p); else if (S.scene === 'ion') ionPointer(p, 'up'); },
    hover(p) {
      if (S.scene === 'test') return cellAt(p) || rowHeadAt(p) >= 0 ? 'pointer' : null;
      if (S.scene === 'sort') return SB.hit(p) ? 'grab' : null;
      if (S.scene === 'apply') return AB.hit(p) ? 'grab' : null;
      if (S.scene === 'ion') return ICARDS.some((c, i) => { const q = cardPos(i); return Math.abs(p.x - q.x) <= IL.cards.cw / 2 && Math.abs(p.y - q.y) <= IL.cards.ch / 2; }) ? 'grab' : null;
      return null;
    },
  });
  view.canvas.addEventListener('click', (e) => {
    if (S.scene !== 'test') return;
    const p = view.toLocal(e);
    const rh = rowHeadAt(p);
    if (rh >= 0) { applyRow(rh); return; }
    const c = cellAt(p);
    if (c) applyTest(c.s, c.i);
  });
  // 휴대폰: 끌 수 있는 물체를 누를 때만 페이지 스크롤을 막아요
  if (PHONE) {
    view.canvas.style.touchAction = 'pan-y';
    view.canvas.addEventListener('touchstart', (e) => {
      const t0 = e.touches[0]; if (!t0) return;
      const p = view.toLocal(t0);
      let hit = false;
      if (S.scene === 'sort') hit = !!SB.hit(p);
      else if (S.scene === 'apply') hit = !!AB.hit(p);
      else if (S.scene === 'ion') hit = ICARDS.some((c, i) => { const q = cardPos(i); return Math.abs(p.x - q.x) <= IL.cards.cw / 2 + 4 && Math.abs(p.y - q.y) <= IL.cards.ch / 2 + 4; });
      if (hit) e.preventDefault();
    }, { passive: false });
  }
  $$('#expBtns .opt').forEach((b) => b.addEventListener('click', () => { Sound.click(); P.exp = b.dataset.e; resetRun(); syncProps(); }));
  $('#runBtn').addEventListener('click', startRun);
  $('#matchBtn').addEventListener('click', () => { if (P.exp === 'mg' && X.g >= 0.5 && X.seq === 0) { X.seq = 1; X.seqT = 0; X.popPlayed = false; Sound.click(); syncProps(); } });
  $('#clearBtn').addEventListener('click', () => { Sound.click(); resetIon(); });
  $$('#sceneSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.scene); }));
  $('#resetBtn').addEventListener('click', () => {
    Sound.click();
    if (S.scene === 'test') resetTest();
    else if (S.scene === 'sort') SB.reset();
    else if (S.scene === 'props') { resetRun(); syncProps(); }
    else if (S.scene === 'ion') resetIon();
    else { AB.reset(); ['rsAcidIon', 'rsAcidPr', 'rsBaseIon', 'rsBasePr'].forEach((id) => { const s = $('#' + id); s.value = ''; s.classList.remove('ok', 'bad'); }); }
  });
  // ion 비커를 눌러서도 (카드를 먼저 고른 경우는 없고) 안내만
  function draw(t) {
    view.clear(BG);
    bgFill('#f7f4fe', '#ece7f9');
    ctx.save();
    ctx.globalAlpha = 0.35 + 0.65 * clamp(S.sceneA, 0, 1);
    if (S.scene === 'test') drawTest(t);
    else if (S.scene === 'sort') {
      SB.draw(t);
      if (!PHONE) {
        D.text(16, 24, '카드의 점 순서', { size: 12.5, weight: 800, color: MUTED, align: 'left' });
        INDS.forEach((ind, i) => { const x = 128 + i * 150; const res = resultOf('acid', ind.id); ctx.fillStyle = ind.type === 'paper' ? ind.base : i === 2 ? '#43b95a' : '#ffffff'; ctx.strokeStyle = '#8a95a8'; ctx.lineWidth = 1.4; if (ind.type === 'paper') D.roundRect(x - 5, 17, 10, 14, 2); else { ctx.beginPath(); ctx.arc(x, 24, 7, 0, TAU); } ctx.fill(); ctx.stroke(); D.text(x + 12, 29, ind.name, { size: 12.5, weight: 700, color: INK, align: 'left' }); });
      }
    }
    else if (S.scene === 'props') drawProps(t);
    else if (S.scene === 'ion') drawIon(t);
    else AB.draw(t);
    fx.draw(ctx);
    if (S.scene === 'ion') drawIonDrag();
    ctx.restore();
  }

  /* ---------- 미션 ---------- */
  const MIX = 'class="mini"';
  const levels = [
    /* ---------- 1단계 · 관찰 ---------- */
    {
      title: '지시약으로 구별해요', short: '지시약 검사', icon: '🧪', phase: '관찰',
      features: ['test', 'sort'],
      intro: '<p class="si-q">❓ 탐구 질문: 신맛이 나는 식초와 미끌거리는 비누는 무엇이 다를까?</p>' +
        '<div class="si-link">🔗 <b>중학교에서</b> 물질이 물에 녹아 이온이 되면 수용액에 전류가 흐른다고 배웠어요. 통합과학1에서 본 소금물처럼요. 이번 차시에서는 이온 중에서도 <b>산과 염기</b>를 알아봐요.</div>' +
        '<p>생활 속 물질 8가지(시료)에 <b>지시약</b>을 떨어뜨려 봐요. 지시약은 산성·중성·염기성에서 <b>색이 다르게</b> 변하는 물질이에요. 결과를 표에 기록하고 세 가지로 나눠요.</p>',
      setup() { setScene('test'); showHint('표의 칸을 눌러 지시약을 떨어뜨려 봐요', 4500); },
      recap: '지시약은 색 변화로 산성·중성·염기성을 구별해 줘요. BTB 용액은 산성에서 노란색, 중성에서 초록색, 염기성에서 파란색이에요.',
      summary: '<table ' + MIX + '><tr><th>지시약</th><th>산성</th><th>중성</th><th>염기성</th></tr>' +
        '<tr><td>푸른 리트머스 종이</td><td>붉은색</td><td>변화 없음</td><td>변화 없음</td></tr>' +
        '<tr><td>붉은 리트머스 종이</td><td>변화 없음</td><td>변화 없음</td><td>푸른색</td></tr>' +
        '<tr><td>BTB 용액</td><td>노란색</td><td>초록색</td><td>파란색</td></tr>' +
        '<tr><td>페놀프탈레인 용액</td><td>무색</td><td>무색</td><td>붉은색</td></tr></table>' +
        '<p class="note">산성 물질은 신맛, 염기성 물질은 쓴맛과 미끌거림이 있지만 실험실에서는 맛보거나 만지지 않아요.</p>',
      missions: [
        {
          title: '시료 검사하기',
          goal: '표의 칸을 눌러 시료 <b>6가지 이상</b>에 지시약을 써 보세요. 시료 이름을 누르면 4가지가 한꺼번에 검사돼요.',
          hint: '칸 하나를 누르면 그 지시약 방울이 떨어져요. 시료 이름 칸을 누르면 한 줄이 모두 검사돼요.',
          setup() { setScene('test'); },
          check: () => testedSamples() >= 6,
          hold: 0.5,
          status: () => mark(testedSamples() >= 6) + ' 검사한 시료 ' + testedSamples() + ' / ' + SAMPLES.length + ' (6가지 이상)',
          explain: '리트머스 종이, BTB 용액, 페놀프탈레인 용액은 <b>색이 변하는 모습</b>으로 산성·중성·염기성을 알려 줘요. 산성에서는 푸른 리트머스 종이가 붉게, 염기성에서는 붉은 리트머스 종이가 푸르게 변해요.',
        },
        {
          title: '세 가지로 분류하기', manual: true,
          goal: '시료 8가지를 <b>산성 · 중성 · 염기성</b> 상자에 끌어 넣어요. 검사하지 않은 시료는 먼저 검사해야 알 수 있어요.',
          hint: 'BTB 용액은 산성에서 노란색, 중성에서 초록색, 염기성에서 파란색이에요. 한 가지 지시약만으로도 세 가지를 구별할 수 있어요.',
          setup() { setScene('sort'); },
          check: () => sortCheck(),
          explain: '산성: 염산·식초·레몬즙·탄산음료. 중성: 증류수·설탕물. 염기성: 비눗물·묽은 수산화 나트륨 수용액이에요. 지시약은 이처럼 <b>색</b>으로 용액의 성질을 알려 줘요.',
        },
        {
          type: 'quiz', title: '지시약의 색',
          goal: '어떤 용액에 BTB 용액을 떨어뜨렸더니 <b>노란색</b>이 되었어요. 이 용액에 푸른 리트머스 종이와 페놀프탈레인 용액을 쓰면?',
          setup() { setScene('test'); },
          choices: ['푸른 리트머스 종이는 붉게 변하고, 페놀프탈레인 용액은 색이 없어요', '푸른 리트머스 종이는 변하지 않고, 페놀프탈레인 용액은 붉은색이 돼요', '푸른 리트머스 종이는 붉게 변하고, 페놀프탈레인 용액은 붉은색이 돼요', '두 지시약 모두 변하지 않아요'],
          answer: 0,
          feedback: ['', 'BTB가 노란색이면 산성이에요. 페놀프탈레인을 붉게 만드는 것은 염기성이에요.', '페놀프탈레인 용액은 염기성에서만 붉은색이 돼요. 산성에서는 색이 없어요.', '산성에서는 푸른 리트머스 종이가 붉게 변해요. 표의 염산 줄을 다시 봐요.'],
          explain: 'BTB 용액의 노란색은 <b>산성</b>이라는 뜻이에요. 산성에서는 푸른 리트머스 종이가 붉게 변하고, 페놀프탈레인 용액은 색이 변하지 않아요(무색).',
        },
      ],
    },
    /* ---------- 2단계 · 실험 ---------- */
    {
      title: '산과 염기는 이렇게 달라요', short: '성질 실험', icon: '⚗️', phase: '실험',
      features: ['props'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 지시약의 색으로 시료를 산성·중성·염기성으로 나눴어요.</div>' +
        '<p>색 말고도 산과 염기는 서로 다른 성질을 보여요. <b>마그네슘 · 달걀 껍데기 · 단백질 · 전구 회로</b>로 실험하고 그 성질을 정리해 봐요.</p>',
      setup() { setScene('props'); P.exp = 'mg'; resetRun(); syncProps(); showHint('시료를 고르고 ▶ 실험하기를 눌러요', 4500); },
      recap: '산은 마그네슘과 반응해 수소 기체를, 달걀 껍데기와 반응해 이산화 탄소를 내요. 염기는 단백질을 녹여 미끌거려요. 산과 염기의 수용액은 모두 전류가 흘러요.',
      summary: '<table ' + MIX + '><tr><th>실험</th><th>산</th><th>염기</th></tr>' +
        '<tr><td>마그네슘 리본</td><td>수소 기체 발생</td><td>변화 없음</td></tr>' +
        '<tr><td>달걀 껍데기</td><td>이산화 탄소 발생</td><td>변화 없음</td></tr>' +
        '<tr><td>단백질</td><td>변화 없음</td><td>녹아 미끌거림</td></tr>' +
        '<tr><td>전기 전도성</td><td>전류가 흐름</td><td>전류가 흐름</td></tr></table>' +
        '<p class="note">설탕물·증류수처럼 이온이 없는 용액은 전류가 흐르지 않아요.</p>',
      missions: [
        {
          title: '성질 실험 하기',
          goal: '네 가지 실험 중 <b>세 가지 이상</b>을 끝까지 해 보세요. 실험을 끝내면 ✓ 표시가 붙어요.',
          hint: '마그네슘은 기체가 모이면 🔥 성냥불을 가까이 해요. 달걀 껍데기는 석회수가 뿌옇게 될 때까지, 단백질은 조각이 녹을 때까지 기다려요. 전구는 4가지 시료를 모두 해 봐야 ✓가 붙어요.',
          setup() { setScene('props'); },
          check: () => doneCount() >= 3,
          hold: 0.5,
          status: () => mark(P.done.mg) + ' 마그네슘 · ' + mark(P.done.egg) + ' 달걀 껍데기 · ' + mark(P.done.pro) + ' 단백질 · ' + mark(P.done.lamp) + ' 전구',
          explain: '산은 마그네슘 같은 금속과 반응해 <b>수소 기체</b>를, 탄산 칼슘이 든 달걀 껍데기와 반응해 <b>이산화 탄소</b>를 내요. 염기는 <b>단백질을 녹이기</b> 때문에 만지면 미끌거리고 피부에 위험해요. 산과 염기의 수용액은 모두 <b>전류가 흘러요</b>.',
        },
        {
          type: 'quiz', title: '기체의 정체',
          goal: '산에 마그네슘을 넣어 생긴 기체에 성냥불을 가까이 하니 "퍽!" 소리가 났어요. 산에 달걀 껍데기를 넣어 생긴 기체는 석회수를 뿌옇게 했어요. 두 기체는?',
          setup() { setScene('props'); },
          choices: ['마그네슘: 수소 / 달걀 껍데기: 이산화 탄소', '마그네슘: 산소 / 달걀 껍데기: 이산화 탄소', '마그네슘: 수소 / 달걀 껍데기: 수소', '마그네슘: 이산화 탄소 / 달걀 껍데기: 산소'],
          answer: 0,
          feedback: ['', '산소는 불을 더 잘 타게 해요. "퍽!" 소리를 내며 타는 기체는 수소예요.', '석회수를 뿌옇게 하는 기체는 이산화 탄소예요. 수소는 석회수를 뿌옇게 하지 않아요.', '"퍽!" 소리는 수소의 특징이고, 석회수를 뿌옇게 하는 것은 이산화 탄소예요.'],
          explain: '산 + 마그네슘 → <b>수소</b> 기체(성냥불에 "퍽!"). 산 + 달걀 껍데기(탄산 칼슘) → <b>이산화 탄소</b>(석회수가 뿌옇게 흐려짐)예요.',
        },
        {
          type: 'quiz', title: '설탕물에 전류가 안 흐르는 까닭',
          goal: '염산과 수산화 나트륨 수용액은 전구가 켜졌고, 증류수와 설탕물은 켜지지 않았어요. 설탕물에 전류가 흐르지 않는 까닭은?',
          setup() { setScene('props'); },
          choices: ['설탕은 물에 녹아도 이온이 생기지 않기 때문이에요', '설탕은 물에 녹지 않기 때문이에요', '설탕물은 산성이기 때문이에요', '설탕물에는 물 분자가 없기 때문이에요'],
          answer: 0,
          feedback: ['', '설탕은 물에 잘 녹아요. 녹은 뒤에도 분자 그대로 흩어져 있을 뿐이에요.', '설탕물은 BTB 용액이 초록색인 중성이에요. 이온이 없어서 전류가 흐르지 않아요.', '설탕물에도 물 분자가 많아요. 전류를 나르는 것은 이온이에요.'],
          explain: '전류가 흐르려면 <b>자유롭게 움직이는 이온</b>이 있어야 해요. 설탕은 분자 그대로 녹아 이온이 없으므로 전구가 켜지지 않아요. 산과 염기 수용액에는 이온이 있어 전류가 흘러요.',
        },
      ],
    },
    /* ---------- 3단계 · 모형 ---------- */
    {
      title: '산과 염기의 정체: 이온', short: '이온 모형', icon: '🔬', phase: '모형',
      features: ['ion'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 산과 염기 수용액은 모두 전류가 흘렀어요. 이온이 있다는 뜻이지요. 그런데 산과 염기의 성질이 서로 다른 까닭은 뭘까요?</div>' +
        '<p>물질 카드 5장을 물에 녹여 봐요. 물속에서 <b>어떤 이온</b>이 나오는지 보면 산과 염기를 정의할 수 있어요.</p>' +
        '<p class="note">이 단원에서는 산과 염기를 <b>아레니우스 정의</b>로만 이야기해요.</p>',
      setup() { setScene('ion'); resetIon(); showHint('카드를 끌어 비커의 물에 넣어 봐요', 4500); },
      recap: '산은 수용액에서 H⁺을, 염기는 수용액에서 OH⁻을 내놓아요. 수소(H)나 OH가 들어 있다고 모두 산·염기인 것은 아니에요.',
      summary: '<ul><li><b>산</b>: 수용액에서 <b>수소 이온(H⁺)</b>을 내놓는 물질<br>HCl → H⁺ + Cl⁻</li>' +
        '<li><b>염기</b>: 수용액에서 <b>수산화 이온(OH⁻)</b>을 내놓는 물질<br>NaOH → Na⁺ + OH⁻</li></ul>' +
        '<p>산의 공통 성질은 <b>H⁺</b> 때문에, 염기의 공통 성질은 <b>OH⁻</b> 때문에 나타나요. 이온이 있어서 전류도 흘러요.</p>' +
        '<p class="note">CH₄, 설탕, 메탄올은 H나 OH가 들어 있어도 H⁺·OH⁻을 내놓지 않아 산도 염기도 아니에요.</p>',
      missions: [
        {
          title: '물에 녹여 보기',
          goal: '물질 카드 <b>5장</b>을 모두 물에 넣고, 물속에서 어떤 입자가 되는지 살펴보세요.',
          hint: '카드를 끌어 비커의 물에 놓거나, 카드를 한 번 눌러도 돼요. 3~4초 기다리면 카드에 ✓가 붙어요.',
          setup() { setScene('ion'); },
          check: () => ionTriedCount() >= ICARDS.length,
          hold: 0.5,
          status: () => ICARDS.map((c) => mark(IO.tried[c.id]) + ' ' + c.f).join(' · '),
          explain: 'HCl은 물에서 <b>H⁺과 Cl⁻</b>으로, NaOH는 <b>Na⁺과 OH⁻</b>으로 나뉘어요. 설탕과 메탄올은 분자 그대로 녹고, 메테인은 거의 녹지 않아요. 그래서 이 세 물질은 이온이 생기지 않아요.',
        },
        {
          title: '산과 염기의 정의', manual: true,
          goal: '빈칸을 채워 산과 염기를 정의해 보세요.',
          hint: 'HCl에서 나온 이온은 H⁺, NaOH에서 나온 이온은 OH⁻이었어요. (Na⁺, Cl⁻은 산과 염기의 이름을 정하지 않아요.)',
          setup() { setScene('ion'); },
          check: () => defCheck(),
          explain: '<b>산</b>은 수용액에서 수소 이온(H⁺)을 내놓는 물질, <b>염기</b>는 수용액에서 수산화 이온(OH⁻)을 내놓는 물질이에요. 산의 공통 성질은 H⁺ 때문에, 염기의 공통 성질은 OH⁻ 때문에 나타나요.',
        },
        {
          type: 'quiz', title: '이런 물질도 산이나 염기일까?',
          goal: '메테인(CH₄)에는 수소(H)가 있고, 메탄올(CH₃OH)에는 OH가 있어요. 두 물질에 대한 설명으로 옳은 것은?',
          setup() { setScene('ion'); },
          choices: ['둘 다 물에서 H⁺이나 OH⁻을 내놓지 않으므로 산도 염기도 아니에요', '메테인은 H가 있으므로 산이고, 메탄올은 OH가 있으므로 염기예요', '메탄올은 OH가 있으므로 염기이고, 메테인은 산도 염기도 아니에요', '둘 다 수소를 포함하므로 산이에요'],
          answer: 0,
          feedback: ['', '수소를 포함하기만 해서는 산이 아니에요. 물에서 H⁺을 내놓아야 산이에요.', '메탄올의 OH는 분자에 붙은 채로 있어요. 물에서도 OH⁻으로 떨어지지 않아서 염기가 아니에요.', '설탕, 메테인처럼 수소를 포함해도 H⁺을 내놓지 않는 물질이 많아요.'],
          explain: '산·염기를 가르는 기준은 <b>수용액에서 H⁺을 내놓는가, OH⁻을 내놓는가</b>예요. 분자 속에 H나 OH가 들어 있다는 것만으로는 산·염기가 아니에요.',
        },
      ],
    },
    /* ---------- 4단계 · 적용 ---------- */
    {
      title: '생활 속 산과 염기', short: '분류·안전', icon: '🏠', phase: '적용',
      features: ['apply'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 산은 H⁺을, 염기는 OH⁻을 내놓는 물질이라는 것을 알았어요.</div>' +
        '<p>우리 주변의 물질을 <b>산성</b>과 <b>염기성</b>으로 나누고, 왜 그런 성질이 나타나는지 이온으로 설명해 봐요. 안전하게 쓰는 방법도 생각해요.</p>',
      setup() { setScene('apply'); showHint('카드를 끌어 산성 · 염기성 상자에 넣어요', 4500); },
      recap: '산성 물질은 H⁺ 때문에 신맛이 나고 금속과 반응하며, 염기성 물질은 OH⁻ 때문에 미끌거리고 단백질을 녹여요. 세정제는 섞어 쓰지 않아요.',
      summary: '<table ' + MIX + '><tr><th>구분</th><th>생활 속 예</th><th>공통 이온</th></tr>' +
        '<tr><td>산성</td><td>식초, 레몬, 탄산음료, 위액, 산성비, 산성 세정제</td><td>H⁺</td></tr>' +
        '<tr><td>염기성</td><td>비누, 세제, 하수구 세정제, 제산제, 석회수, 치약</td><td>OH⁻</td></tr></table>' +
        '<p class="note">산성 세정제와 염소계 표백제(락스)를 섞으면 유독 기체가 나와요. 섞지 않고, 환기하며 써요.</p>',
      missions: [
        {
          title: '생활 속 물질 분류하기', manual: true,
          goal: '카드 <b>12장</b>을 산성 · 염기성 상자로 나누고, 공통 이온과 성질을 골라요.',
          hint: '식초·레몬·탄산음료는 신맛이 나는 산성, 비누·세제는 미끌거리는 염기성이에요. 산성비와 위액은 산성, 제산제·석회수·치약·하수구 세정제는 염기성이에요.',
          setup() { setScene('apply'); },
          check: () => applyCheck(),
          explain: '산성 물질에는 공통으로 <b>H⁺</b>이 있어 신맛이 나고 금속을 녹여요(마그네슘과 반응해 수소 기체). 염기성 물질에는 공통으로 <b>OH⁻</b>이 있어 미끌거리고 단백질을 녹여요.',
        },
        {
          type: 'quiz', title: '안전하게 쓰기',
          goal: '산성 세정제와 염소계 표백제(락스, 염기성)를 섞어 쓰면 안 돼요. 그 까닭은?',
          setup() { setScene('apply'); },
          choices: ['섞이면 유독 기체가 나와 위험하기 때문이에요', '섞으면 세정 효과가 두 배가 되어 너무 잘 닦이기 때문이에요', '두 물질 모두 중성이라 효과가 없기 때문이에요', '섞으면 색이 변해 보기 흉하기 때문이에요'],
          answer: 0,
          feedback: ['', '효과가 커지는 것이 아니라 위험한 기체가 생겨요. 라벨의 "섞지 마세요"를 지켜요.', '하나는 산성, 하나는 염기성이에요. 섞는 것이 위험한 까닭은 중성이 되어서가 아니에요.', '색이 문제가 아니라 건강에 해로운 기체가 나오는 것이 문제예요.'],
          explain: '산성 세정제와 염소계 표백제를 섞으면 <b>독성이 있는 염소 기체</b>가 나와 위험해요. 세정제는 따로 쓰고, 사용할 때는 환기하며 장갑·보안경을 써요.',
        },
      ],
    },
  ];

  SB.reset(); AB.reset(); resetRun(); syncProps();
  game = SciSim.game({
    simId: 'h1-acid-base',
    mount: '#game',
    badge: '산·염기 박사',
    homeHref: '../../index.html#h1b',
    featureLabels: { test: '🧪 지시약 검사대 · 분류판', props: '⚗️ 성질 실험대', ion: '🔬 이온 모형 (물에 녹이기)', apply: '🏠 생활 속 물질 분류' },
    onFeatures(set) { F = new Set(set); updateUI(); },
    levels,
  });

  updateUI();
  SciSim.loop((dt, t) => {
    if (S.scene === 'props') stepProps(dt);
    if (S.scene === 'ion') stepIon(dt);
    SB.update(dt); AB.update(dt);
    fx.update(dt);
    updateReadouts();
    draw(t);
  });

  window.__sim = {
    S, T, SB, AB, P, X, IO, PT, IT, ICARDS, SAMPLES, INDS, AITEMS, game, levels, setScene, applyTest, applyRow, startRun, startDissolve, resetRun, resetIon, syncProps, cellAt, rowHeadAt, cellRect, sbLayout, abLayout, cardPos, IL, testedSamples, doneCount, ionTriedCount,
    toClient: (x, y) => { const r = view.canvas.getBoundingClientRect(); return { x: r.left + x * r.width / VW, y: r.top + y * r.height / VH }; },
    sortAll() { SB.items.forEach((it) => SB.assign(it, SAMPLES[it.idx].kind, true)); },
    applyAll() { AB.items.forEach((it) => AB.assign(it, AITEMS[it.idx].k, true)); },
  };
})();
