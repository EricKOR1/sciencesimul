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
     통합과학2 Ⅰ. 변화와 다양성 - 중화 반응 [10통과2-01-04]
     ① 관찰: 색 변화 (뷰렛으로 NaOH를 넣으며 BTB·페놀프탈레인 색 관찰)
     ② 실험: 온도 그래프 (5 mL씩 넣고 온도를 재어 점 찍기 → 꼭짓점)
     ③ 모형: 중화 모형 (H⁺ + OH⁻ → H₂O, 염: NaCl 결정)
     ④ 적용: 생활 속 중화 (위장과 제산제, 생활 사례 연결)
     ※ 중화 과정의 변화는 지시약의 색과 용액의 온도 변화만 다뤄요. (pH 곡선·이온 수 그래프·전기 전도도·적정 계산 없음)
     ========================================================= */
  const CONC_A = 1.0, V_A = 20;                       // 염산 1.0 M 20 mL
  const T0 = 25.0;                                    // 처음 온도 (°C)
  const DATA = [25.0, 27.7, 29.5, 30.9, 31.8, 31.1, 30.5, 30.0, 29.6]; // 1.0 M NaOH를 5 mL씩 넣었을 때 (0 ~ 40 mL)
  const STEP_ML = 5, V_MAX = 40;
  const veq = (c) => V_A * CONC_A / c;                // 완전 중화에 필요한 NaOH 수용액의 부피 (mL)
  const fmtV = (n) => (n / 10).toFixed(1);
  const YEL = '#f2cf1d', GRN = '#43b95a', BLU = '#2d66dc', PINK = '#ff3f93', CLEAR = '#eef6ff';
  // 0.5 M: 1.0 M 자료와 같은 원리(반응한 H⁺ 양에 비례해 열이 나고, 전체 용액이 늘어나면 오르는 온도가 줄어요)로 만든 예시.
  // 1.0 M 자료는 오른 온도 = 13.5 × (반응한 양 mmol) / (전체 부피 mL)에 거의 맞아요. (소수 첫째 자리로 반올림)
  const T_K = 13.5;
  function interp(v) { const x = clamp(v / STEP_ML, 0, DATA.length - 1), i = Math.min(DATA.length - 2, Math.floor(x)); return DATA[i] + (DATA[i + 1] - DATA[i]) * (x - i); }
  const tempAt = (c, v) => (c === 1 ? DATA[Math.round(v / STEP_ML)] : Math.round((T0 + T_K * Math.min(V_A * CONC_A, c * v) / (V_A + v)) * 10) / 10);

  const S = { scene: 'buret', sceneA: 1 };
  const TB = { buret: '🧴 지시약의 색 변화', graph: '🌡️ 온도 변화와 그래프', ions: '🔬 중화 모형: H⁺ + OH⁻ → H₂O', stomach: '🏥 위장과 제산제', cases: '🏠 생활 속 중화' };
  function setScene(sc) {
    S.scene = sc; hintEl.classList.add('hide'); BU.flow = false;
    S.sceneA = 0; tween(S, { sceneA: 1 }, { duration: 0.4, ease: 'outCubic' });
    updateUI();
  }
  function updateUI() {
    ['buret', 'graph', 'ions', 'stomach', 'cases'].forEach((k) => { $('#cs-' + k).hidden = k !== S.scene; });
    $('#tbLabel').textContent = TB[S.scene];
    $('#sceneSeg').hidden = F.size < 2;
    $$('#sceneSeg button').forEach((b) => b.classList.toggle('on', b.dataset.scene === S.scene));
  }

  /* 지시약 색: d = (넣은 양) − (완전 중화에 필요한 양), 단위 0.1 mL */
  function btbS(d) { if (d <= -6) return -1; if (d < -1) return -1 + (d + 6) / 5; if (d <= 1) return 0; if (d < 6) return (d - 1) / 5; return 1; }
  const btbCol = (s) => (s < 0 ? mixc(GRN, YEL, -s) : mixc(GRN, BLU, s));
  const ppT = (d) => (d <= 0 ? 0 : d >= 4 ? 1 : d / 4);
  const ppCol = (t) => mixc(CLEAR, PINK, t);
  function btbName(d) { const s = btbS(d); return s <= -1 ? '노란색' : s < 0 ? '연두색 (노란색 → 초록색)' : s === 0 ? '초록색' : s < 1 ? '청록색 (초록색 → 파란색)' : '파란색'; }
  function ppName(d) { const t = ppT(d); return t === 0 ? '무색' : t < 1 ? '연한 분홍색' : '붉은색 (분홍)'; }
  const natureOf = (d) => (d <= -2 ? '산성' : d >= 2 ? '염기성' : '중성 부근');

  /* =========================================================
     ① 뷰렛 · 지시약 색 변화
     ========================================================= */
  const BL = PHONE
    ? { x: 200, top: 56, len: 300, fx: 200, fby: 498, fw: 190, fh: 160, info: { x: 12, y: 566, w: 536, h: 150 } }
    : { x: 230, top: 66, len: 300, fx: 230, fby: 566, fw: 200, fh: 176, info: { x: 410, y: 60, w: 380, h: 440 } };
  const mlY = (v) => BL.top + (v / 50) * BL.len;
  const BU = { n: 0, ind: 'btb', flow: false, acc: 0, col: CLEAR, colS: 0, handle: 0, streamA: 0, seenPink: false, maxN: 0 };
  const dOf = (n) => n - Math.round(veq(1.0) * 10);
  const buTarget = () => (BU.ind === 'btb' ? btbCol(btbS(dOf(BU.n))) : ppCol(ppT(dOf(BU.n))));
  const buGreen = () => BU.ind === 'btb' && Math.abs(dOf(BU.n)) <= 1;
  const buPink = () => BU.ind === 'pp' && dOf(BU.n) >= 4;
  function buAdd(k) {
    if (BU.n >= V_MAX * 10) return false;
    BU.n = Math.min(V_MAX * 10, BU.n + k);
    BU.maxN = Math.max(BU.maxN, BU.n);
    return true;
  }
  function buDrop() {
    if (!buAdd(1)) { showHint('뷰렛에는 ' + V_MAX + ' mL까지만 넣을 수 있어요. ↺로 다시 시작해요.', 3200); return; }
    Sound.tick();
    const tip = tipPos();
    fx.emit({ x: tip.x, y: tip.y + 4, vx: 0, vy: 40, gravity: 700, life: 0.5, size: 3.6, color: '#7fb4f0', shape: 'circle', fade: false });
    BU.dropT = 0.5;
  }
  function resetBuret(ind) {
    if (ind) BU.ind = ind;
    BU.n = 0; BU.flow = false; BU.acc = 0; BU.maxN = 0; BU.col = buTarget(); BU.handle = 0;
    $$('#indSeg button').forEach((b) => b.classList.toggle('on', b.dataset.i === BU.ind));
    $('#buretNote').textContent = BU.ind === 'btb'
      ? 'BTB 용액은 산성에서 노란색, 중성에서 초록색, 염기성에서 파란색이에요. 초록색이 되는 구간이 좁으니 한 방울씩 천천히 넣어요.'
      : '페놀프탈레인 용액은 산성과 중성에서 무색이고, 염기성이 되면 붉은색(분홍)이 돼요.';
  }
  const tipPos = () => ({ x: BL.x, y: mlY(50) + 34 });
  function stepBuret(dt) {
    if (BU.flow && BU.n < V_MAX * 10) {
      BU.acc += dt * 60;
      let k = 0; while (BU.acc >= 1) { BU.acc -= 1; k++; }
      if (k) buAdd(k);
      if (Math.random() < dt * 14) { const tip = tipPos(); fx.emit({ x: tip.x + rnd(-1, 1), y: tip.y + 6, vx: 0, vy: 60, gravity: 500, life: 0.3, size: 2.4, color: '#7fb4f0', shape: 'circle', fade: false }); }
    } else if (BU.flow && BU.n >= V_MAX * 10) BU.flow = false;
    BU.handle = approach(BU.handle, BU.flow ? 1 : 0, dt, 18);
    BU.streamA = approach(BU.streamA, BU.flow ? 1 : 0, dt, 12);
    if (BU.dropT > 0) BU.dropT -= dt;
    // 색은 목표 색으로 부드럽게
    BU.col = mixc(BU.col, buTarget(), 1 - Math.exp(-7 * dt));
    if (buPink()) BU.seenPink = true;
  }
  function drawBurette(x, o) {
    o = o || {};
    const top = BL.top, len = BL.len, w = 28;
    // 관
    const lvl = mlY(BU.n / 10);
    D.shadow(() => { D.roundRect(x - w / 2, top - 10, w, len + 22, 6); ctx.fillStyle = 'rgba(235,243,252,.9)'; ctx.fill(); }, { blur: 6, y: 2 });
    ctx.save(); D.roundRect(x - w / 2 + 3, top - 10, w - 6, len + 22, 4); ctx.clip();
    ctx.fillStyle = 'rgba(150,196,245,.75)'; ctx.fillRect(x - w, lvl, w * 2, len + 24);
    ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(x - w / 2 + 3, lvl - 1, w - 6, 3);
    ctx.restore();
    ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 3; D.roundRect(x - w / 2, top - 10, w, len + 22, 6); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillRect(x - w / 2 + 6, top, 3, len - 6);
    // 눈금
    for (let v = 0; v <= 50; v += 5) {
      const y = mlY(v), big = v % 10 === 0;
      ctx.strokeStyle = '#4b5870'; ctx.lineWidth = big ? 2 : 1.2;
      ctx.beginPath(); ctx.moveTo(x + w / 2 - (big ? 12 : 7), y); ctx.lineTo(x + w / 2, y); ctx.stroke();
      if (big) D.text(x + w / 2 + 6, y + 4, String(v), { size: fs(12), weight: 700, color: MUTED, align: 'left' });
    }
    D.text(x - w / 2 - 6, top - 14, 'mL', { size: fs(12), weight: 800, color: MUTED, align: 'right' });
    // 현재 눈금 표시
    D.arrow(x - w / 2 - 44, lvl, x - w / 2 - 6, lvl, { color: '#7c3aed', width: 3, head: 10 });
    pill(x - w / 2 - 64, lvl - 16, fmtV(BU.n) + ' mL', { bg: '#7c3aed', color: '#fff', size: fs(13), align: 'right' });
    // 꼭지(스톱콕)와 끝
    const sy = top + len + 20;
    ctx.fillStyle = '#9aa5b6'; D.roundRect(x - 5, sy - 4, 10, 26, 3); ctx.fill();
    ctx.save(); ctx.translate(x, sy + 8); ctx.rotate(BU.handle * Math.PI / 2);
    D.roundRect(-22, -4, 44, 8, 4); ctx.fillStyle = BU.flow ? '#14a058' : '#e2464b'; ctx.fill();
    ctx.restore();
    D.sphere(x, sy + 8, 6, '#6b7a90', { gloss: false, shadow: false });
    const tip = tipPos();
    ctx.fillStyle = '#9fb0c9'; ctx.beginPath(); ctx.moveTo(x - 5, sy + 22); ctx.lineTo(x + 5, sy + 22); ctx.lineTo(x + 1.5, tip.y); ctx.lineTo(x - 1.5, tip.y); ctx.fill();
    // 흐르는 줄
    if (BU.streamA > 0.05) {
      const fy = flaskSurface();
      ctx.strokeStyle = 'rgba(127,180,240,' + BU.streamA + ')'; ctx.lineWidth = 3.2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x, tip.y); ctx.lineTo(x, fy); ctx.stroke();
    }
  }
  const flaskLevel = () => 0.3 + 0.2 * (BU.n / (V_MAX * 10));
  const flaskSurface = () => BL.fby - (BL.fh - BL.fh * 0.32) * flaskLevel();
  function drawFlaskScene(t) {
    D.flask(BL.fx, BL.fby, BL.fw, BL.fh, { level: flaskLevel(), liquid: BU.col, t, glass: '#8fa3bd' });
    // 색 번짐(떨어진 자리) 효과: 액체 위쪽 빛
    D.text(BL.fx, BL.fby + 28, BU.ind === 'btb' ? '염산 + BTB 용액' : '염산 + 페놀프탈레인 용액', { size: fs(13), weight: 800, color: '#4c1d95' });
  }
  function drawBuretInfo(t) {
    const r = BL.info;
    panel(r.x, r.y, r.w, r.h, { r: 14, stroke: '#d9cffa' });
    const d = dOf(BU.n);
    D.text(r.x + 16, r.y + (PHONE ? 26 : fs(26)), '🧴 ' + (BU.ind === 'btb' ? 'BTB 용액' : '페놀프탈레인 용액') + '의 색 변화', { size: fs(16), weight: 800, color: '#4c1d95', align: 'left' });
    D.text(r.x + 16, r.y + (PHONE ? 52 : fs(54)), '플라스크: 염산(HCl) ' + CONC_A.toFixed(1) + ' M ' + V_A + ' mL', { size: fs(13.5), weight: 700, color: INK, align: 'left' });
    D.text(r.x + 16, r.y + (PHONE ? 76 : fs(76)), '뷰렛: 수산화 나트륨 수용액 ' + CONC_A.toFixed(1) + ' M', { size: fs(13.5), weight: 700, color: INK, align: 'left' });
    // 색 띠
    const by = r.y + (PHONE ? 104 : fs(108)), bx = r.x + 20, bw = r.w - 40, bh = 20;
    const g = ctx.createLinearGradient(bx, 0, bx + bw, 0);
    if (BU.ind === 'btb') { g.addColorStop(0, YEL); g.addColorStop(0.5, GRN); g.addColorStop(1, BLU); } else { g.addColorStop(0, CLEAR); g.addColorStop(0.5, CLEAR); g.addColorStop(1, PINK); }
    D.roundRect(bx, by, bw, bh, 10); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = '#aab6cc'; ctx.lineWidth = 1.5; ctx.stroke();
    const mx = bx + bw * (BU.ind === 'btb' ? 0.5 + 0.5 * btbS(d) : ppT(d) === 0 ? 0.25 : 0.5 + 0.5 * ppT(d));
    ctx.fillStyle = INK; ctx.beginPath(); ctx.moveTo(mx, by + bh + 3); ctx.lineTo(mx - 7, by + bh + 14); ctx.lineTo(mx + 7, by + bh + 14); ctx.fill();
    const labs = BU.ind === 'btb' ? ['산성 쪽 (노란색)', '중성 (초록색)', '염기성 쪽 (파란색)'] : ['산성·중성 (무색)', '', '염기성 (붉은색)'];
    D.text(bx, by - 6, labs[0], { size: fs(11.5), weight: 700, color: MUTED, align: 'left' });
    D.text(bx + bw / 2, by - 6, labs[1], { size: fs(11.5), weight: 700, color: MUTED });
    D.text(bx + bw, by - 6, labs[2], { size: fs(11.5), weight: 700, color: MUTED, align: 'right' });
    if (PHONE) { if (buGreen()) pill(r.x + r.w - 80, r.y + 28, '✔ 중화점 근처!', { bg: '#14a058', color: '#fff', size: fs(12) }); return; }
    const ty = by + fs(58);
    D.text(r.x + 16, ty, '넣은 양', { size: fs(13), weight: 700, color: MUTED, align: 'left' });
    D.text(r.x + 16 + fs(70), ty, fmtV(BU.n) + ' mL', { size: fs(20), weight: 800, color: INK, align: 'left' });
    D.text(r.x + 16, ty + fs(28), '지금 색', { size: fs(13), weight: 700, color: MUTED, align: 'left' });
    ctx.fillStyle = BU.col; ctx.beginPath(); ctx.arc(r.x + 16 + fs(80), ty + fs(22), 9, 0, TAU); ctx.fill(); ctx.strokeStyle = '#8a95a8'; ctx.lineWidth = 1.5; ctx.stroke();
    D.text(r.x + 16 + fs(96), ty + fs(28), BU.ind === 'btb' ? btbName(d) : ppName(d), { size: fs(14.5), weight: 800, color: INK, align: 'left' });
    D.text(r.x + 16, ty + fs(56), '용액의 성질', { size: fs(13), weight: 700, color: MUTED, align: 'left' });
    D.text(r.x + 16 + fs(80), ty + fs(56), natureOf(d), { size: fs(14.5), weight: 800, color: KC[natureOf(d)], align: 'left' });
    if (buGreen()) pill(r.x + r.w - 76, ty + fs(4), '✔ 중화점 근처!', { bg: '#14a058', color: '#fff', size: fs(13) });
  }
  const KC = { '산성': '#b3262b', '중성 부근': '#0b6b39', '염기성': '#2547b5' };
  function drawBuretScene(t) {
    D.text(PHONE ? VW / 2 : 330, PHONE ? 26 : 34, '뷰렛의 꼭지를 열어 수산화 나트륨 수용액을 넣어요', { size: fs(14), weight: 800, color: '#4c1d95' });
    drawBurette(BL.x);
    drawFlaskScene(t);
    // 꼭지 안내
    if (BU.n === 0 && !RM) { D.ring(BL.x, BL.top + BL.len + 28, 26, t, { color: '#8b5cf6' }); }
    drawBuretInfo(t);
  }
  function handleHit(p) { return Math.hypot(p.x - BL.x, p.y - (BL.top + BL.len + 28)) < 34; }


  /* =========================================================
     ② 온도 그래프
     ========================================================= */
  const GL = PHONE
    ? { x0: 78, x1: 534, y0: 400, y1: 692, fx: 330, fby: 296, fw: 150, fh: 130, pour: { x: 330, y: 96 }, therm: { x: 14, y: 176 } }
    : { x0: 392, x1: 772, y0: 92, y1: 420, fx: 170, fby: 530, fw: 196, fh: 184, pour: { x: 178, y: 190 }, therm: { x: 16, y: 330 } };
  const TMIN = 24, TMAX = 34;
  const gX = (v) => GL.x0 + (GL.x1 - GL.x0) * (v / V_MAX);
  const gY = (T) => GL.y1 - (GL.y1 - GL.y0) * ((T - TMIN) / (TMAX - TMIN));
  const GC = { 1: '#f26b3a', 0.5: '#2f7de1' };
  const G = { conc: 1, vol: 0, volVis: 0, Tv: T0, Tt: T0, adding: false, tilt: 0, pts: { 1: [], 0.5: [] }, peak: false, hot: 0 };
  const gPts = (c) => G.pts[c || G.conc];
  const plotted1 = () => G.pts[1].filter((p) => p.a >= 1).length;
  const settled = () => Math.abs(G.Tv - G.Tt) < 0.05;
  function gAdd() {
    if (G.adding || G.vol >= V_MAX) { if (G.vol >= V_MAX) showHint('뷰렛 눈금 ' + V_MAX + ' mL까지 모두 넣었어요.', 2800); return; }
    G.adding = true; Sound.click();
    const from = G.vol; G.vol += STEP_ML;
    const K = { k: 0 };
    G.h = tween(K, { k: 1 }, {
      duration: RM ? 0.01 : 1.9, ease: 'linear',
      onUpdate: () => {
        const k = K.k;
        G.tilt = smooth(k / 0.18) * (1 - smooth((k - 0.8) / 0.18));
        G.volVis = from + STEP_ML * smooth((k - 0.12) / 0.6);
        if (k > 0.4) G.Tt = tempAt(G.conc, G.vol);
      },
      onDone: () => { G.tilt = 0; G.volVis = G.vol; G.adding = false; syncGraph(); },
    });
    syncGraph();
  }
  function gPlot() {
    if (G.adding || !settled()) return;
    const arr = gPts();
    if (arr.some((p) => p.v === G.vol)) { showHint('이 지점은 이미 점을 찍었어요. 5 mL를 더 넣어요.', 2800); return; }
    const pt = { v: G.vol, T: tempAt(G.conc, G.vol), a: 0, sx: GL.therm.x + 60, sy: GL.therm.y + 26 };
    arr.push(pt); Sound.tick();
    tween(pt, { a: 1 }, { duration: RM ? 0.01 : 0.7, ease: 'outCubic', onDone: () => { fx.burst(gX(pt.v), gY(pt.T), { count: 8, colors: [GC[G.conc], '#fff'], speed: 90, size: 3, gravity: 0, life: 0.5 }); syncGraph(); } });
    syncGraph();
  }
  function resetGraph(keepPts) {
    if (G.h) G.h.cancel();
    G.vol = 0; G.volVis = 0; G.Tv = T0; G.Tt = T0; G.adding = false; G.tilt = 0;
    if (!keepPts) { G.pts[1].length = 0; G.pts[0.5].length = 0; G.peak = false; }
    syncGraph();
  }
  function setConc(c) { G.conc = c; resetGraph(true); $$('#concSeg button').forEach((b) => b.classList.toggle('on', +b.dataset.c === c)); }
  function syncGraph() {
    $('#addBtn').disabled = G.adding || G.vol >= V_MAX;
    const dup = gPts().some((p) => p.v === G.vol);
    $('#plotBtn').disabled = G.adding || !settled() || dup;
    const n = plotted1();
    $('#graphNote').textContent = G.conc !== 1 ? '자유 탐구: 0.5 M로 바꾸면 꼭짓점이 어디로 옮겨 갈까요? 5 mL씩 넣으며 점을 찍어 봐요.'
      : n < 9 ? '① 처음 온도(0 mL)에도 점을 찍어요 → ② 5 mL 넣기 → ③ 점 찍기를 반복해요. 그래프의 가장 높은 점(꼭짓점)을 눌러 찾아요.'
        : G.peak ? '꼭짓점을 찾았어요! 0.5 M로 바꿔 꼭짓점이 어디로 가는지도 살펴봐요.' : '점 9개를 모두 찍었어요. 그래프에서 온도가 가장 높은 점을 눌러요.';
  }
  function stepGraph(dt) {
    G.Tv = approach(G.Tv, G.Tt, dt, 3.2);
    if (Math.abs(G.Tv - G.Tt) < 0.02) G.Tv = G.Tt;
    if (G.Tt > G.Tv + 0.05 && Math.random() < dt * 22) fx.emit({ x: GL.fx + rnd(-GL.fw * 0.3, GL.fw * 0.3), y: GL.fby - GL.fh * 0.4, vx: rnd(-8, 8), vy: -rnd(30, 60), life: 1.1, size: rnd(2.5, 4), color: '#ff9f43', shape: 'circle' });
    const ok = settled() && !G.adding;
    const pb = $('#plotBtn'); const want = !(ok && !gPts().some((p) => p.v === G.vol));
    if (pb.disabled !== want) pb.disabled = want;
  }
  function drawGraph(t) {
    // ---- 왼쪽: 플래스크와 붓는 비커
    const d = Math.round(G.volVis * 10) - Math.round(veq(G.conc) * 10);
    const col = btbCol(btbS(d));
    D.flask(GL.fx, GL.fby, GL.fw, GL.fh, { level: 0.3 + 0.12 * (G.volVis / V_MAX), liquid: col, t });
    D.text(GL.fx, GL.fby + 26, '염산 ' + V_A + ' mL + BTB 용액', { size: fs(13), weight: 800, color: '#4c1d95' });
    // 붓는 비커
    ctx.save(); ctx.translate(GL.pour.x, GL.pour.y); ctx.rotate(-0.15 - G.tilt * 0.75);
    D.beaker(-78, -10, 84, 96, { level: 0.65 - 0.4 * (G.volVis / V_MAX), liquid: '#a8cdf5', t, wave: 0.6, glass: '#8fa3bd' });
    ctx.restore();
    D.text(GL.pour.x - 52, GL.pour.y - 22, 'NaOH 수용액 ' + G.conc.toFixed(1) + ' M', { size: fs(12.5), weight: 800, color: '#2f5fb8' });
    if (G.tilt > 0.3) { ctx.strokeStyle = 'rgba(127,180,240,.9)'; ctx.lineWidth = 3.2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(GL.pour.x + 8, GL.pour.y + 6); ctx.quadraticCurveTo(GL.pour.x + 12, GL.pour.y + 40, GL.fx + 2, GL.fby - GL.fh + 6); ctx.stroke(); }
    // 디지털 온도계
    const th = GL.therm;
    D.roundRect(th.x, th.y, 124, 56, 10); ctx.fillStyle = '#1e2a3a'; ctx.fill();
    D.roundRect(th.x + 6, th.y + 6, 112, 44, 6); ctx.fillStyle = '#0f1a26'; ctx.fill();
    D.text(th.x + 62, th.y + 38, G.Tv.toFixed(1) + ' °C', { size: 24, weight: 800, color: G.Tt > G.Tv + 0.05 ? '#ffb86b' : '#6bffb0' });
    ctx.strokeStyle = '#6b7a90'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(th.x + 124, th.y + 28); ctx.quadraticCurveTo(GL.fx - 40, th.y + 28, GL.fx - 20, GL.fby - GL.fh * 0.4); ctx.stroke();
    D.sphere(GL.fx - 20, GL.fby - GL.fh * 0.35, 5, '#c0392b', { gloss: false, shadow: false });
    D.text(th.x + 62, th.y - 8, '🌡️ 디지털 온도계', { size: fs(12.5), weight: 800, color: MUTED });
    if (!PHONE) D.text(GL.fx, GL.fby + 48, '넣은 양 ' + G.vol + ' mL', { size: fs(15), weight: 800, color: INK });
    if (G.vol === 0 && gPts().length === 0 && !G.adding && !RM) D.ring(GL.x0 - 0, gY(T0), 16, t, { color: '#8b5cf6' });
    // ---- 그래프
    const gx0 = GL.x0, gx1 = GL.x1, gy0 = GL.y0, gy1 = GL.y1;
    panel(gx0 - (PHONE ? 62 : 56), gy0 - (PHONE ? 38 : 50), gx1 - gx0 + (PHONE ? 76 : 76) + 6, gy1 - gy0 + (PHONE ? 84 : 100), { r: 14, stroke: '#d9cffa' });
    D.text((gx0 + gx1) / 2, gy0 - (PHONE ? 16 : 28), '온도(°C) — 넣은 NaOH 수용액의 양(mL)', { size: fs(14), weight: 800, color: '#4c1d95' });
    if (!PHONE) D.text((gx0 + gx1) / 2, gy0 - 10, '열 손실을 무시한 이상적인 조건의 예시 자료예요', { size: 11.5, weight: 700, color: MUTED });
    ctx.save();
    for (let T = TMIN; T <= TMAX; T += 2) {
      ctx.strokeStyle = T === TMIN ? '#8a95a8' : '#e3e8f1'; ctx.lineWidth = T === TMIN ? 2 : 1;
      ctx.beginPath(); ctx.moveTo(gx0, gY(T)); ctx.lineTo(gx1, gY(T)); ctx.stroke();
      D.text(gx0 - 8, gY(T) + 4, String(T), { size: fs(12), weight: 700, color: MUTED, align: 'right' });
    }
    for (let v = 0; v <= V_MAX; v += STEP_ML) {
      ctx.strokeStyle = v === 0 ? '#8a95a8' : '#eef1f7'; ctx.lineWidth = v === 0 ? 2 : 1;
      ctx.beginPath(); ctx.moveTo(gX(v), gy0); ctx.lineTo(gX(v), gy1); ctx.stroke();
      D.text(gX(v), gy1 + fs(17), String(v), { size: fs(12), weight: 700, color: MUTED });
    }
    ctx.restore();
    D.text((gx0 + gx1) / 2, gy1 + fs(36), '넣은 양 (mL)', { size: fs(12.5), weight: 800, color: MUTED });
    // 선과 점
    [1, 0.5].forEach((c) => {
      const arr = gPts(c).filter((p) => p.a >= 1).sort((a, b) => a.v - b.v);
      if (arr.length > 1) { ctx.strokeStyle = rgba(GC[c], c === G.conc ? 0.7 : 0.3); ctx.lineWidth = 2.5; ctx.lineJoin = 'round'; ctx.beginPath(); arr.forEach((p, i) => (i ? ctx.lineTo(gX(p.v), gY(p.T)) : ctx.moveTo(gX(p.v), gY(p.T)))); ctx.stroke(); }
    });
    [1, 0.5].forEach((c) => gPts(c).forEach((p) => {
      const tx = gX(p.v), ty = gY(p.T);
      const a = p.a, x = lerp(p.sx, tx, a), y = lerp(p.sy, ty, a) - Math.sin(a * Math.PI) * 60;
      ctx.globalAlpha = c === G.conc ? 1 : 0.4;
      D.sphere(x, y, 7 + (a < 1 ? 2 : 0), GC[c], { shadow: a >= 1 });
      ctx.globalAlpha = 1;
      if (a >= 1 && c === G.conc && (p === arrLast(gPts(c)) || (c === 1 && G.peak && p.T === Math.max.apply(null, G.pts[1].map((q) => q.T))))) D.label(tx, ty - fs(18), p.T.toFixed(1), { bg: '#fff', color: INK, border: GC[c], size: fs(12) });
    }));
    if (G.peak) {
      const pk = G.pts[1].reduce((m, q) => (q.T > m.T ? q : m), G.pts[1][0]);
      D.ring(gX(pk.v), gY(pk.T), 14, t, { color: '#14a058' });
      pill(gX(pk.v), gY(pk.T) - fs(42), '꼭짓점: ' + pk.v + ' mL, ' + pk.T.toFixed(1) + ' °C', { bg: '#14a058', color: '#fff', size: fs(12.5) });
      D.dashedLine(gX(pk.v), gY(pk.T) + 10, gX(pk.v), gy1, { color: '#14a058', width: 2 });
      pill(gX(pk.v), gy1 - fs(14), 'BTB 초록색', { bg: '#e2f6eb', color: '#0b6b39', size: fs(12) });
    }
    // 범례
    D.sphere(gx1 - 132, gy0 + 14, 6, GC[1], { gloss: false, shadow: false }); D.text(gx1 - 122, gy0 + 19, '1.0 M', { size: fs(12), weight: 700, color: MUTED, align: 'left' });
    D.sphere(gx1 - 62, gy0 + 14, 6, GC[0.5], { gloss: false, shadow: false }); D.text(gx1 - 52, gy0 + 19, '0.5 M', { size: fs(12), weight: 700, color: MUTED, align: 'left' });
  }
  const arrLast = (a) => a[a.length - 1];
  function graphClick(p) {
    if (G.conc !== 1 || plotted1() < 9 || G.peak) return;
    let best = null, bd = 26;
    G.pts[1].forEach((q) => { const d = Math.hypot(p.x - gX(q.v), p.y - gY(q.T)); if (d < bd) { bd = d; best = q; } });
    if (!best) return;
    const mx = Math.max.apply(null, G.pts[1].map((q) => q.T));
    if (best.T === mx) { G.peak = true; Sound.success(); fx.burst(gX(best.v), gY(best.T), { count: 16, speed: 150, size: 4 }); syncGraph(); }
    else { Sound.fail(); showHint('꼭짓점은 온도가 가장 높은 점이에요. 더 높은 점을 찾아봐요.', 3200); }
  }


  /* =========================================================
     ③ 중화 모형: H⁺ + OH⁻ → H₂O, 남은 Na⁺·Cl⁻ = 염(NaCl)
     ========================================================= */
  const ACID_U = 6, MAXU = 9;                         // 염산 6묶음(H⁺ 6, Cl⁻ 6), NaOH는 최대 9묶음
  const NL = PHONE
    ? { box: { x: 120, y: 120, w: 280, h: 250 }, th: { x: 448, y: 130, h: 190 }, info: { x: 12, y: 392, w: 536, h: 316 }, flameY: 420 }
    : { box: { x: 150, y: 200, w: 280, h: 250 }, th: { x: 478, y: 150, h: 190 }, info: { x: 540, y: 56, w: 252, h: 470 }, flameY: 506 };
  const NT = makeTank(NL.box, 0.8, { elec: false });
  const IN = { units: 0, water: 0, tv: T0, col: YEL, evap: false, evapK: 0, crystal: false, drag: null, h: null };
  const hCount = () => NT.ps.filter((p) => p.k === 'H+' && !p.dying).length;
  const oCount = () => NT.ps.filter((p) => p.k === 'OH-' && !p.dying).length;
  const inComplete = () => IN.units === ACID_U && IN.water === ACID_U && hCount() === 0 && oCount() === 0;
  const evapEff = () => (Math.min(IN.water, ACID_U) / ACID_U) * V_A + Math.max(0, IN.units - ACID_U) * (V_A / ACID_U);
  const inNet = () => oCount() - hCount();
  function inColName() {
    const n = inNet();
    return n <= -2 ? '노란색 (산성)' : n < 0 ? '연두색' : n === 0 ? '초록색 (중성)' : n < 2 ? '청록색' : '파란색 (염기성)';
  }
  function resetIons() {
    if (IN.h) IN.h.cancel();
    NT.clear(); NT.level = 0.8;
    IN.units = 0; IN.water = 0; IN.tv = T0; IN.evap = false; IN.evapK = 0; IN.crystal = false; IN.drag = null; IN.h = null;
    const w = NT.water();
    for (let i = 0; i < ACID_U; i++) {
      NT.add('H+', rnd(w.x + 24, w.x + w.w - 24), rnd(w.y + 24, w.y + w.h - 24), { a: 1 });
      NT.add('Cl-', rnd(w.x + 24, w.x + w.w - 24), rnd(w.y + 24, w.y + w.h - 24), { a: 1 });
    }
    IN.col = YEL; NT.liquid = YEL;
    syncIons();
  }
  function addNaOH() {
    if (IN.units >= MAXU || IN.evap) return;
    IN.units++; Sound.tick();
    const w = NT.water();
    const x = rnd(w.x + 40, w.x + w.w - 40);
    NT.add('Na+', x + rnd(-20, 20), w.y - 40, { enter: 1, a: 1, vy: 50 });
    NT.add('OH-', x + rnd(-20, 20), w.y - 70, { enter: 1, a: 1, vy: 50 });
    syncIons();
  }
  function linkPair(oh, h) {
    oh.pairTo = h; h.pairTo = oh; oh.hold = true; h.hold = true;
  }
  function unlink(p) {
    if (p.pairTo) { p.pairTo.pairTo = null; p.pairTo.hold = false; p.pairTo = null; }
    p.hold = false;
  }
  function stepIons(dt) {
    // OH⁻ 이온은 잠시 뒤 가장 가까운 H⁺ 쪽으로 끌려가요 (또는 끌어서 짝지어 줄 수 있어요)
    NT.ps.forEach((p) => {
      if (p.k !== 'OH-' || p.dying || p.enter || p.pairTo || p.hold || p.age < 2.4) return;
      let best = null, bd = 1e9;
      NT.ps.forEach((q) => { if (q.k === 'H+' && !q.pairTo && !q.hold && !q.dying && !q.enter) { const d = Math.hypot(q.x - p.x, q.y - p.y); if (d < bd) { bd = d; best = q; } } });
      if (best) linkPair(p, best);
    });
    for (let i = NT.ps.length - 1; i >= 0; i--) {
      const p = NT.ps[i];
      if (!p || p.k !== 'OH-' || !p.pairTo || IN.drag === p) continue;
      const q = p.pairTo;
      const dx = q.x - p.x, dy = q.y - p.y, d = Math.hypot(dx, dy);
      if (d < 16) { // 결합 → 물 분자
        const mx = (p.x + q.x) / 2, my = (p.y + q.y) / 2;
        NT.ps.splice(NT.ps.indexOf(p), 1); NT.ps.splice(NT.ps.indexOf(q), 1);
        NT.add('H2O', mx, my, { a: 1, vx: rnd(-40, 40), vy: rnd(-40, 40) });
        IN.water++; Sound.success();
        for (let k = 0; k < 9; k++) fx.emit({ x: mx, y: my, vx: rnd(-50, 50), vy: -rnd(30, 90), life: 0.9, size: rnd(2.2, 3.6), color: k % 2 ? '#ff9f43' : '#ffd34d', gravity: -20, shape: 'circle' });
        fx.emit({ x: mx, y: my, vx: 0, vy: -20, life: 0.6, size: 6, grow: 40, color: 'rgba(255,170,60,.6)', shape: 'smoke' });
        syncIons();
        continue;
      }
      const sp = 85 * dt / d;
      p.x += dx * sp; p.y += dy * sp; q.x -= dx * sp; q.y -= dy * sp;
    }
    // BTB 색: 남은 OH⁻ − 남은 H⁺
    const n = inNet();
    const s = clamp(n / 1.5, -1, 1);
    IN.col = mixc(IN.col, btbCol(s), 1 - Math.exp(-5 * dt));
    NT.liquid = IN.col;
    // 열 (모형)
    IN.tv = approach(IN.tv, interp(evapEff()), dt, 3);
    // 증발
    if (IN.evap) {
      const k = IN.evapK;
      NT.level = lerp(0.8, 0.07, smooth(k / 0.78));
      NT.ps.forEach((p) => { if (p.k === 'H2O' && !p.rise && !p.dying && k > p.vanishAt) { p.rise = true; } });
      if (k < 0.8 && Math.random() < dt * 26) fx.emit({ x: NL.box.x + NL.box.w / 2 + rnd(-90, 90), y: NL.box.y - 6, vx: rnd(-8, 8), vy: -rnd(30, 60), life: 1.4, size: rnd(8, 14), grow: 14, color: 'rgba(255,255,255,.7)', shape: 'smoke' });
      if (k >= 0.8 && !IN.crystal) {
        IN.crystal = true; Sound.success();
        const cx = NL.box.x + NL.box.w / 2, by = NL.box.y + NL.box.h - 18;
        let i = 0;
        NT.ps.forEach((p) => {
          if (p.k !== 'Na+' && p.k !== 'Cl-') return;
          p.hold = false; p.pairTo = null;
        });
        const na = NT.ps.filter((p) => p.k === 'Na+'), cl = NT.ps.filter((p) => p.k === 'Cl-');
        for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) {
          const isNa = (r + c) % 2 === 0, p = (isNa ? na : cl).shift();
          if (p) p.lock = { x: cx + (c - 1.5) * 28, y: by - r * 27 };
          i++;
        }
        fx.burst(cx, by - 30, { count: 20, colors: ['#ffffff', '#cfe8ff', '#f59e0b'], speed: 120, size: 3.2, gravity: 40, life: 0.8 });
        showHint('물이 모두 증발하고 Na⁺과 Cl⁻이 규칙적으로 쌓여 소금(NaCl) 결정이 되었어요!', 5200);
        syncIons();
      }
    }
    if (IN.crystal) NT.level = approach(NT.level, 0, dt, 3);
    NT.update(dt);
  }
  function startEvap() {
    if (!inComplete() || IN.evap) return;
    IN.evap = true; Sound.click();
    NT.ps.forEach((p) => { if (p.k === 'H2O') p.vanishAt = rnd(0.08, 0.7); });
    const K = { k: 0 };
    IN.h = tween(K, { k: 1 }, { duration: RM ? 0.5 : 8, ease: 'linear', onUpdate: () => { IN.evapK = K.k; }, onDone: () => { IN.evapK = 1; syncIons(); } });
    syncIons();
  }
  function syncIons() {
    $('#naohBtn').disabled = IN.units >= MAXU || IN.evap;
    $('#evapBtn').disabled = !inComplete() || IN.evap;
    const o = $('#ionNote');
    if (IN.evap) o.textContent = IN.crystal ? '물이 증발한 자리에 염(NaCl)의 결정이 남았어요. ↺로 처음부터 다시 해 봐요.' : '물을 가열해 증발시키는 중이에요…';
    else if (IN.units === 0) o.textContent = 'NaOH 한 묶음을 넣으면 OH⁻이 H⁺ 쪽으로 끌려가요. OH⁻을 끌어 H⁺ 가까이 가져가도 돼요.';
    else if (inComplete()) o.textContent = 'H⁺ ' + ACID_U + '개와 OH⁻ ' + ACID_U + '개가 모두 짝을 이뤄 물이 되었어요! 🔥 물 증발시키기로 염을 얻어 봐요.';
    else if (IN.units > ACID_U) o.textContent = 'OH⁻이 남아 염기성이 됐어요. 이때는 증발시켜도 순수한 염이 아니에요. ↺로 다시 해 봐요.';
    else o.textContent = '아직 H⁺이 남아 있어요. NaOH를 더 넣어 봐요. (증발은 중화가 끝난 뒤에만 할 수 있어요.)';
  }
  function drawIons(t) {
    D.text(PHONE ? VW / 2 : 290, PHONE ? 26 : 40, 'OH⁻을 끌어 H⁺에 가져가면 물이 만들어져요', { size: fs(14), weight: 800, color: '#4c1d95' });
    // 가열
    if (IN.evap && IN.evapK < 0.95) {
      const fxx = NL.box.x + NL.box.w / 2;
      ctx.strokeStyle = '#6b7a90'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(fxx - 70, NL.box.y + NL.box.h + 6); ctx.lineTo(fxx - 90, NL.flameY + 34); ctx.moveTo(fxx + 70, NL.box.y + NL.box.h + 6); ctx.lineTo(fxx + 90, NL.flameY + 34); ctx.stroke();
      D.roundRect(fxx - 34, NL.flameY + 6, 68, 26, 8); ctx.fillStyle = '#a7b2c5'; ctx.fill();
      D.flame(fxx, NL.flameY + 8, 46, t);
    }
    NT.drawBeaker(t);
    // 비커 속 안내 글자
    NT.drawParticles(t);
    if (IN.drag) D.glow(IN.drag.x, IN.drag.y, 26, '#7aa2ff', 0.6);
    // 온도계 (모형의 열)
    D.thermometer(NL.th.x, NL.th.y, NL.th.h, IN.tv, 24, 34, { color: '#e2464b', step: 2, unit: '°' });
    D.text(NL.th.x + 8, NL.th.y - 12, '🌡️ ' + IN.tv.toFixed(1) + ' °C', { size: fs(13), weight: 800, color: '#b3262b', align: 'center' });
    if (IN.water > 0 && IN.water < ACID_U + 1 && !IN.evap) pill(NL.box.x + NL.box.w / 2, NL.box.y - fs(14), '열이 나와요 (발열)', { bg: '#fff1e4', color: '#b85a00', size: fs(12.5) });
    if (IN.crystal) {
      const cx = NL.box.x + NL.box.w / 2;
      pill(cx, NL.box.y + NL.box.h - 106, '염: NaCl 결정', { bg: '#14a058', color: '#fff', size: fs(14) });
    }
    // 설명판
    const r = NL.info;
    panel(r.x, r.y, r.w, r.h, { r: 14, stroke: '#d9cffa' });
    D.text(r.x + 14, r.y + fs(26), '🔍 입자 돋보기', { size: fs(15), weight: 800, color: '#4c1d95', align: 'left' });
    const ex = r.x + (PHONE ? 60 : 40), ey = r.y + fs(70);
    const q = PHONE ? 1.15 : 1;
    drawMol('H+', ex, ey, 0, 1.1 * q, 1, t); D.text(ex + 22 * q, ey + 6, '+', { size: fs(18), weight: 800, color: INK });
    drawMol('OH-', ex + 56 * q, ey, 0, 1.1 * q, 1, t); D.text(ex + 82 * q, ey + 6, '→', { size: fs(20), weight: 800, color: INK });
    drawMol('H2O', ex + 116 * q, ey, 0.6, 1.2 * q, 1, t); D.text(ex + 140 * q, ey + 6, '물', { size: fs(15), weight: 800, color: INK, align: 'left' });
    D.text(r.x + 14, ey + fs(34), 'H⁺ + OH⁻ → H₂O', { size: fs(15), weight: 800, color: '#b3262b', align: 'left' });
    drawMol('Na+', r.x + 30, ey + fs(66), 0, 0.85, 1, t); drawMol('Cl-', r.x + 66, ey + fs(66), 0, 0.85, 1, t);
    wrapText(r.x + 92, ey + fs(62), 'Na⁺과 Cl⁻은 그대로 남아요 → 염(NaCl)', r.w - 104, fs(12.5), fs(16), { weight: 700, color: INK, align: 'left' });
    const n = inNet(), msgY = ey + fs(104);
    let msg, mc = INK;
    if (IN.evap && IN.crystal) { msg = '물이 증발하자 Na⁺과 Cl⁻이 번갈아 쌓인 소금(NaCl) 결정이 생겼어요.'; mc = '#0b6b39'; }
    else if (inComplete()) { msg = '모든 H⁺과 OH⁻이 짝을 이뤄 물이 되었어요. 용액은 중성이에요.'; mc = '#0b6b39'; }
    else if (IN.units === 0) { msg = 'NaOH 한 묶음을 넣고 H⁺과 OH⁻이 만나는 모습을 관찰해요.'; mc = MUTED; }
    else if (n > 0 && hCount() === 0) { msg = 'OH⁻이 남았어요. 가한 NaOH가 많아서 용액은 염기성이에요.'; mc = '#2547b5'; }
    else if (hCount() > 0) { msg = 'H⁺이 아직 남아 있어요. 중화 반응이 일어났지만 용액은 아직 산성이에요.'; mc = '#b3262b'; }
    else { msg = '이온이 짝을 찾는 중…'; mc = MUTED; }
    const nl = wrapText(r.x + 14, msgY, msg, r.w - 28, fs(13), fs(18), { weight: 800, color: mc, align: 'left' });
    const by2 = PHONE ? msgY + nl * fs(18) + fs(10) : r.y + r.h - fs(48);
    D.text(r.x + 14, by2, 'BTB 색', { size: fs(12.5), weight: 700, color: MUTED, align: 'left' });
    ctx.fillStyle = IN.col; ctx.beginPath(); ctx.arc(r.x + 14 + fs(60), by2 - fs(5), 9, 0, TAU); ctx.fill(); ctx.strokeStyle = '#8a95a8'; ctx.lineWidth = 1.5; ctx.stroke();
    D.text(r.x + 14 + fs(76), by2, inColName(), { size: fs(13.5), weight: 800, color: INK, align: 'left' });
    D.text(r.x + 14, by2 + fs(26), '만들어진 물 분자 ' + IN.water + '개', { size: fs(13.5), weight: 800, color: '#2f5fb8', align: 'left' });
    // 범례
    const ly = PHONE ? VH - 22 : VH - 26;
    [['H+', 'H⁺'], ['OH-', 'OH⁻'], ['Na+', 'Na⁺'], ['Cl-', 'Cl⁻'], ['H2O', 'H₂O']].forEach((it, i) => { const lx = (PHONE ? 50 : 150) + i * (PHONE ? 102 : 100); drawMol(it[0], lx, ly, 0, 0.7, 1, 0); D.text(lx + 18, ly + 5, it[1], { size: fs(12.5), weight: 800, color: MUTED, align: 'left' }); });
  }
  function ionsPointer(p, type) {
    if (type === 'down') {
      let best = null, bd = 28;
      NT.ps.forEach((q) => { if (q.k === 'OH-' && !q.enter && !q.dying) { const d = Math.hypot(q.x - p.x, q.y - p.y); if (d < bd) { bd = d; best = q; } } });
      if (!best || IN.evap) return false;
      unlink(best); IN.drag = best; best.hold = true; Sound.click(); return true;
    }
    const d = IN.drag; if (!d) return true;
    const w = NT.water();
    if (type === 'move') { d.x = clamp(p.x, w.x + 14, w.x + w.w - 14); d.y = clamp(p.y, w.y + 14, w.y + w.h - 14); }
    else if (type === 'up') {
      IN.drag = null;
      let best = null, bd = 56;
      NT.ps.forEach((q) => { if (q.k === 'H+' && !q.pairTo && !q.hold && !q.dying) { const dd = Math.hypot(q.x - d.x, q.y - d.y); if (dd < bd) { bd = dd; best = q; } } });
      if (best) linkPair(d, best); else d.hold = false;
    }
    return true;
  }
  function saltCheck() {
    const a = $('#salt1').value, b = $('#salt2').value;
    if (!a || !b) return '두 빈칸을 모두 골라요.';
    if (a === 'NaCl' && b === 'CaCl2') return true;
    if (a !== 'NaCl' && b !== 'CaCl2') return '둘 다 다시 생각해 봐요. 염은 염기의 양이온과 산의 음이온이 만나 생겨요.';
    return a !== 'NaCl' ? 'HCl + NaOH에서 남는 이온은 Na⁺과 Cl⁻이에요. 이 둘이 만든 염을 골라요.' : '수산화 칼슘 Ca(OH)₂의 양이온은 Ca²⁺, 염산의 음이온은 Cl⁻이에요.';
  }
  ['salt1', 'salt2'].forEach((id) => $('#' + id).addEventListener('change', (e) => {
    const want = id === 'salt1' ? 'NaCl' : 'CaCl2', v = e.target.value;
    e.target.classList.toggle('ok', v === want); e.target.classList.toggle('bad', !!v && v !== want);
    if (v === want) Sound.click();
  }));


  /* =========================================================
     ④ 위장과 제산제
     ========================================================= */
  const PATS = [6, 8, 10];                           // 환자별 위산의 양 (제산제 스푼 수에 해당)
  const ST = { pat: 0, dose: 0, doseVis: 0, col: GRN, fxT: 0 };
  const stD2 = () => Math.round(ST.dose * 2) - 2 * PATS[ST.pat];
  const stYW = () => clamp((-1 - stD2()) / 3, 0, 1);
  const stBW = () => clamp((stD2() - 1) / 3, 0, 1);
  const stOk = () => Math.abs(stD2()) <= 1;
  const stTarget = () => (stBW() > 0 ? mixc(GRN, BLU, stBW()) : mixc(GRN, YEL, stYW()));
  function stName() { const y = stYW(), b = stBW(); return y >= 1 ? '노란색 (아직 산성)' : y > 0 ? '연두색 (산성이 조금 남음)' : b >= 1 ? '파란색 (염기성)' : b > 0 ? '청록색 (염기성에 가까움)' : '초록색 (중성 범위)'; }
  function setDose(v, silent) {
    const old = ST.dose; ST.dose = v;
    $('#sDose').value = v; $('#sDose').style.setProperty('--pct', (v / 16 * 100) + '%');
    $('#oDose').textContent = v.toFixed(1) + ' 스푼';
    if (!silent && v > old) { // 제산제가 쏟아져 들어가요
      for (let i = 0; i < Math.min(14, (v - old) * 6 + 3); i++) fx.emit({ x: STL.cx + rnd(-30, 30), y: STL.cy - 150, vx: rnd(-15, 15), vy: rnd(40, 120), gravity: 380, life: 0.9, size: rnd(2.5, 4.5), color: '#ffffff', shape: 'circle' });
      Sound.tick();
    }
  }
  const STL = PHONE ? { cx: 270, cy: 260, s: 1.0 } : { cx: 250, cy: 320, s: 1.12 };
  function stomachPath(cx, cy, s) {
    ctx.beginPath();
    ctx.moveTo(cx - 40 * s, cy - 150 * s);
    ctx.bezierCurveTo(cx + 40 * s, cy - 150 * s, cx + 110 * s, cy - 120 * s, cx + 150 * s, cy - 40 * s);
    ctx.bezierCurveTo(cx + 190 * s, cy + 50 * s, cx + 120 * s, cy + 140 * s, cx + 20 * s, cy + 140 * s);
    ctx.bezierCurveTo(cx - 90 * s, cy + 140 * s, cx - 150 * s, cy + 60 * s, cx - 120 * s, cy - 30 * s);
    ctx.bezierCurveTo(cx - 100 * s, cy - 90 * s, cx - 90 * s, cy - 120 * s, cx - 40 * s, cy - 150 * s);
    ctx.closePath();
  }
  function stepStomach(dt) {
    ST.doseVis = approach(ST.doseVis, ST.dose, dt, 6);
    ST.col = mixc(ST.col, stTarget(), 1 - Math.exp(-6 * dt));
  }
  function drawStomach(t) {
    const { cx, cy, s } = STL;
    D.text(PHONE ? VW / 2 : 300, PHONE ? 28 : 40, '위산이 많아 속이 쓰려요. 제산제로 위산을 중화해요', { size: fs(14), weight: 800, color: '#4c1d95' });
    // 식도
    D.roundRect(cx - 66 * s, cy - 205 * s, 34 * s, 80 * s, 14); ctx.fillStyle = '#f0a79b'; ctx.fill(); ctx.strokeStyle = '#d97b6c'; ctx.lineWidth = 3; ctx.stroke();
    // 위 (바깥)
    D.shadow(() => { stomachPath(cx, cy, s); ctx.fillStyle = '#f8c9bd'; ctx.fill(); }, { blur: 14, y: 6 });
    stomachPath(cx, cy, s); ctx.strokeStyle = '#d97b6c'; ctx.lineWidth = 5; ctx.stroke();
    // 위 속 액체
    const bottom = cy + 140 * s, level = 0.42 + 0.08 * (ST.doseVis / 16);
    const ly = bottom - 290 * s * level;
    ctx.save(); stomachPath(cx, cy, s); ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(cx - 220, cy - 160 * s, 440, 320 * s);
    const g = ctx.createLinearGradient(0, ly, 0, bottom); g.addColorStop(0, rgba(ST.col, 0.72)); g.addColorStop(1, rgba(ST.col, 0.95));
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(cx - 220, bottom + 10);
    for (let i = 0; i <= 30; i++) { const px = cx - 220 + (440 * i) / 30; ctx.lineTo(px, ly + Math.sin(t * 2.2 + i * 0.5) * 2.2); }
    ctx.lineTo(cx + 220, bottom + 10); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fillRect(cx - 220, ly - 1, 440, 3);
    // 거품 (제산제 입자)
    if (ST.doseVis > 0.2) for (let i = 0; i < 9; i++) { const bx = cx - 80 * s + ((i * 53) % 160) * s, by = bottom - 20 - ((t * 20 + i * 37) % (bottom - ly - 20)); ctx.fillStyle = 'rgba(255,255,255,' + Math.min(0.6, ST.doseVis / 12) + ')'; ctx.beginPath(); ctx.arc(bx, by, 3 + (i % 3), 0, TAU); ctx.fill(); }
    ctx.restore();
    D.text(cx + 8 * s, cy + 30 * s, 'BTB 용액을 넣은 위 속 액체', { size: fs(12.5), weight: 800, color: 'rgba(30,40,60,.7)' });
    // 숟가락 (슬라이더 아래 제산제)
    const sp = ST.dose > ST.doseVis + 0.15;
    ctx.save(); ctx.translate(cx + 20 * s, cy - 175 * s); ctx.rotate(sp ? 0.5 : 0.1);
    D.roundRect(-4, -6, 90, 8, 4); ctx.fillStyle = '#b7c0cf'; ctx.fill();
    ctx.beginPath(); ctx.ellipse(-10, -2, 22, 14, 0, 0, TAU); ctx.fillStyle = '#c9d1de'; ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(-10, -6, 17, 7, 0, 0, TAU); ctx.fill();
    ctx.restore();
    // 얼굴
    const face = stOk() ? '😊' : stBW() > 0 ? '😵' : '😖';
    ctx.font = D.font(fs(44), 700); ctx.textAlign = 'center'; ctx.fillText(face, PHONE ? VW - 60 : 640, PHONE ? 90 : 120);
    pill(PHONE ? VW - 60 : 640, PHONE ? 130 : 160, stOk() ? '편안해요' : stBW() > 0 ? '너무 많이 먹었어요' : '속이 쓰려요', { bg: '#fff', color: INK, border: '#c9b6f5', size: fs(13) });
    // 색 띠
    const bx = PHONE ? 30 : 470, by = PHONE ? 500 : 230, bw = PHONE ? 500 : 300;
    panel(bx - 14, by - 40, bw + 28, 112 + (PHONE ? 10 : 0), { r: 14, stroke: '#d9cffa' });
    D.text(bx, by - 14, '위 속 BTB 용액의 색', { size: fs(14), weight: 800, color: '#4c1d95', align: 'left' });
    const gg = ctx.createLinearGradient(bx, 0, bx + bw, 0); gg.addColorStop(0, YEL); gg.addColorStop(0.5, GRN); gg.addColorStop(1, BLU);
    D.roundRect(bx, by, bw, 18, 9); ctx.fillStyle = gg; ctx.fill(); ctx.strokeStyle = '#aab6cc'; ctx.lineWidth = 1.5; ctx.stroke();
    const sMark = stBW() > 0 ? stBW() : -stYW();
    const mx = bx + bw * (0.5 + 0.5 * sMark);
    ctx.fillStyle = INK; ctx.beginPath(); ctx.moveTo(mx, by + 21); ctx.lineTo(mx - 7, by + 33); ctx.lineTo(mx + 7, by + 33); ctx.fill();
    D.text(bx, by + 52, '너무 적어요', { size: fs(12), weight: 700, color: MUTED, align: 'left' });
    D.text(bx + bw / 2, by + 52, '알맞아요', { size: fs(12), weight: 800, color: '#0b6b39' });
    D.text(bx + bw, by + 52, '너무 많아요', { size: fs(12), weight: 700, color: MUTED, align: 'right' });
    if (stOk()) pill(bx + bw - 60, by - 18, '✔ 초록색 범위', { bg: '#14a058', color: '#fff', size: fs(12.5) });
  }

  /* =========================================================
     ④ 생활 속 중화 사례 연결
     ========================================================= */
  const CASES = [
    { id: 'ac', e: '😖', t: '속이 쓰려요 (위산 과다)', m: 'antacid', tg: '산성인 위산' },
    { id: 'soil', e: '🌱', t: '산성으로 변한 토양', m: 'lime', tg: '산성인 토양' },
    { id: 'lake', e: '🏞️', t: '산성비로 산성이 된 호수', m: 'lime', tg: '산성인 호숫물' },
    { id: 'ant', e: '🐜', t: '개미에게 물렸어요 (산성 물질)', m: 'balm', tg: '산성인 개미 독' },
    { id: 'fish', e: '🐟', t: '생선 비린내 (염기성 물질)', m: 'lemon', tg: '염기성인 비린내 물질' },
    { id: 'teeth', e: '🦷', t: '입안에 산이 생겼어요', m: 'paste', tg: '입안의 산' },
    { id: 'waste', e: '🏭', t: '산성 폐수를 내보내기 전에', m: 'neut', tg: '산성인 폐수' },
    { id: 'hair', e: '💇', t: '염기성 샴푸로 감은 머리', m: 'rinse', tg: '남은 염기성 성분' },
  ];
  const MATS = [
    { id: 'antacid', n: '제산제', sub: '수산화 마그네슘', e: '💊' }, { id: 'lime', n: '석회 가루', sub: '수산화 칼슘', e: '⚪' },
    { id: 'balm', n: '염기성 약', sub: '바르는 약', e: '🩹' }, { id: 'lemon', n: '레몬즙', sub: '약한 산성', e: '🍋' },
    { id: 'paste', n: '치약', sub: '염기성', e: '🪥' }, { id: 'neut', n: '염기성 중화제', sub: '수산화 나트륨 등', e: '🧪' },
    { id: 'rinse', n: '린스', sub: '약한 산성(구연산)', e: '🫧' },
  ];
  const CS = { assign: {}, mark: {}, shake: {}, selRow: null, selMat: null, drag: null, done: false, hotRow: null };
  const csRow = (i) => (PHONE ? { x: 8, y: 36 + i * 52, w: 544, h: 46 } : { x: 14, y: 54 + i * 62, w: 506, h: 56 });
  const csMat = (i) => (PHONE ? { x: 8 + (i % 2) * 282, y: 480 + Math.floor(i / 2) * 56, w: 262, h: 50 } : { x: 546, y: 54 + i * 66, w: 240, h: 58 });
  const csSlot = (i) => { const r = csRow(i); const w = PHONE ? 220 : 206; return { x: r.x + r.w - w - 8, y: r.y + 6, w, h: r.h - 12 }; };
  const inR = (p, r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
  const csPlaced = () => CASES.filter((c) => CS.assign[c.id]).length;
  function csSet(caseId, matId) {
    CS.assign[caseId] = matId; CS.mark[caseId] = null; CS.selRow = null; CS.selMat = null; CS.done = false;
    Sound.tick();
    const i = CASES.findIndex((c) => c.id === caseId), s = csSlot(i);
    fx.burst(s.x + s.w / 2, s.y + s.h / 2, { count: 8, colors: ['#fff', '#c9b6f5'], speed: 90, size: 3, gravity: 0, life: 0.45 });
  }
  function casesCheck() {
    if (csPlaced() < CASES.length) return '아직 물질을 놓지 않은 상황이 ' + (CASES.length - csPlaced()) + '개 있어요.';
    const wrong = CASES.filter((c) => CS.assign[c.id] !== c.m);
    if (!wrong.length) { CS.done = true; return true; }
    wrong.forEach((c) => { if (!CS.mark[c.id]) { CS.mark[c.id] = 'bad'; CS.shake[c.id] = 1; } });
    return '✕ 표시된 상황을 다시 봐요. 산성인 것에는 염기성 물질을, 염기성인 것에는 산성 물질을 써서 중화해요.';
  }
  function resetCases() { CS.assign = {}; CS.mark = {}; CS.selRow = null; CS.selMat = null; CS.drag = null; CS.done = false; }
  function drawMatChip(m, r, o) {
    o = o || {};
    ctx.save();
    if (o.drag) D.shadow(() => { D.roundRect(r.x, r.y, r.w, r.h, 12); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: 16, y: 8, color: 'rgba(40,20,90,.3)' });
    else D.shadow(() => { D.roundRect(r.x, r.y, r.w, r.h, 12); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: 5, y: 2 });
    D.roundRect(r.x, r.y, r.w, r.h, 12); ctx.strokeStyle = o.sel ? '#8b5cf6' : '#cdbff1'; ctx.lineWidth = o.sel ? 3 : 1.6; ctx.stroke();
    ctx.font = D.font(fs(22), 700); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = INK; ctx.fillText(m.e, r.x + fs(24), r.y + r.h / 2 + 1); ctx.textBaseline = 'alphabetic';
    fitText(r.x + fs(46), r.y + r.h / 2 - (PHONE ? 2 : 1), m.n, r.w - fs(54), fs(14.5), { weight: 800, color: INK, align: 'left' });
    fitText(r.x + fs(46), r.y + r.h / 2 + fs(15), m.sub, r.w - fs(54), fs(11.5), { weight: 700, color: MUTED, align: 'left' });
    ctx.restore();
  }
  function drawCases(t) {
    D.text(PHONE ? VW / 2 : 266, PHONE ? 22 : 32, '상황마다 알맞은 물질 카드를 놓아요', { size: fs(14), weight: 800, color: '#4c1d95' });
    CASES.forEach((c, i) => {
      const r = csRow(i), s = csSlot(i), mk = CS.mark[c.id];
      if (CS.shake[c.id] > 0) CS.shake[c.id] = Math.max(0, CS.shake[c.id] - 0.03);
      const off = CS.shake[c.id] > 0 ? Math.sin(CS.shake[c.id] * 30) * 5 * CS.shake[c.id] : 0;
      ctx.save(); ctx.translate(off, 0);
      D.shadow(() => { D.roundRect(r.x, r.y, r.w, r.h, 12); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: 5, y: 2 });
      D.roundRect(r.x, r.y, r.w, r.h, 12); ctx.strokeStyle = mk === 'bad' ? '#e2464b' : CS.selRow === c.id ? '#8b5cf6' : '#e0d8f5'; ctx.lineWidth = mk === 'bad' || CS.selRow === c.id ? 3 : 1.4; ctx.stroke();
      ctx.font = D.font(fs(22), 700); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = INK; ctx.fillText(c.e, r.x + fs(22), r.y + r.h / 2 + 1); ctx.textBaseline = 'alphabetic';
      fitText(r.x + fs(42), r.y + r.h / 2 + 5, c.t, r.w - s.w - fs(54) - 16, fs(13.5), { weight: 800, color: INK, align: 'left' });
      // 놓는 칸
      const hot = CS.hotRow === c.id;
      D.roundRect(s.x, s.y, s.w, s.h, 10);
      const m = MATS.find((q) => q.id === CS.assign[c.id]);
      ctx.fillStyle = m ? '#f1ebff' : hot ? 'rgba(139,92,246,.18)' : '#faf8ff'; ctx.fill();
      ctx.save(); if (!m) ctx.setLineDash([6, 5]); ctx.strokeStyle = hot ? '#8b5cf6' : mk === 'bad' ? '#e2464b' : '#c9b6f5'; ctx.lineWidth = hot ? 2.6 : 1.8; ctx.stroke(); ctx.restore();
      if (m) {
        ctx.font = D.font(fs(18), 700); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = INK; ctx.fillText(m.e, s.x + fs(18), s.y + s.h / 2 + 1); ctx.textBaseline = 'alphabetic';
        fitText(s.x + fs(34), s.y + s.h / 2 + 5, m.n, s.w - fs(42), fs(13.5), { weight: 800, color: INK, align: 'left' });
      } else D.text(s.x + s.w / 2, s.y + s.h / 2 + 5, '여기에 놓아요', { size: fs(12.5), weight: 700, color: '#a79ec5' });
      if (CS.done && m) D.text(r.x + r.w - 10, r.y + 12, '✔ ' + c.tg + ' 중화', { size: fs(11), weight: 800, color: '#0b6b39', align: 'right' });
      ctx.restore();
    });
    if (!PHONE) D.text(666, 40, '🧰 물질 카드', { size: 13, weight: 800, color: MUTED });
    MATS.forEach((m, i) => drawMatChip(m, csMat(i), { sel: CS.selMat === m.id }));
    if (CS.drag && CS.drag.moved) { const r = csMat(0); drawMatChip(MATS.find((q) => q.id === CS.drag.id), { x: CS.drag.x - r.w / 2, y: CS.drag.y - r.h / 2, w: r.w, h: r.h }, { drag: true }); }
  }
  function casesPointer(p, type) {
    if (type === 'down') {
      for (let i = 0; i < MATS.length; i++) if (inR(p, csMat(i))) { CS.drag = { id: MATS[i].id, x: p.x, y: p.y, sx: p.x, sy: p.y, moved: false }; Sound.click(); return true; }
      for (let i = 0; i < CASES.length; i++) if (inR(p, csRow(i))) {
        const c = CASES[i];
        if (CS.selMat) csSet(c.id, CS.selMat); else { CS.selRow = CS.selRow === c.id ? null : c.id; Sound.click(); }
        return false;
      }
      return false;
    }
    const d = CS.drag; if (!d) return true;
    if (type === 'move') { d.x = p.x; d.y = p.y; if (Math.hypot(p.x - d.sx, p.y - d.sy) > 8) d.moved = true; const hr = CASES.find((c, i) => inR(p, csRow(i))); CS.hotRow = d.moved && hr ? hr.id : null; }
    else if (type === 'up') {
      CS.drag = null; CS.hotRow = null;
      if (!d.moved) { if (CS.selRow) csSet(CS.selRow, d.id); else CS.selMat = CS.selMat === d.id ? null : d.id; return true; }
      const hr = CASES.find((c, i) => inR(p, csRow(i)));
      if (hr) csSet(hr.id, d.id); else showHint('물질 카드를 상황 칸 위에 놓아요', 2600);
    }
    return true;
  }


  /* =========================================================
     읽기판 · 입력 · 그리기 · 반복
     ========================================================= */
  function updateReadouts() {
    const sc = S.scene;
    if (sc === 'buret') {
      const d = dOf(BU.n);
      setRO(1, '넣은 NaOH 수용액', fmtV(BU.n) + '<small>mL</small>');
      setRO(2, BU.ind === 'btb' ? 'BTB 용액의 색' : '페놀프탈레인의 색', BU.ind === 'btb' ? btbName(d) : ppName(d));
      setRO(3, '용액의 성질', natureOf(d));
    } else if (sc === 'graph') {
      setRO(1, '넣은 양', G.vol + '<small>mL</small>');
      setRO(2, '용액의 온도', G.Tv.toFixed(1) + '<small>°C</small>');
      setRO(3, '찍은 점 (' + G.conc.toFixed(1) + ' M)', gPts().filter((p) => p.a >= 1).length + ' / ' + (V_MAX / STEP_ML + 1));
    } else if (sc === 'ions') {
      setRO(1, '만들어진 물(H₂O)', IN.water + '개');
      setRO(2, 'BTB 용액의 색', inColName());
      setRO(3, '용액의 온도(모형)', IN.tv.toFixed(1) + '<small>°C</small>');
    } else if (sc === 'stomach') {
      setRO(1, '환자', '환자 ' + 'ABC'[ST.pat]);
      setRO(2, '제산제', ST.dose.toFixed(1) + '<small>스푼</small>');
      setRO(3, 'BTB 용액의 색', stName());
    } else {
      const ok = CASES.filter((c) => CS.assign[c.id] === c.m).length;
      setRO(1, '물질을 놓은 상황', csPlaced() + ' / ' + CASES.length);
      setRO(2, '알맞게 놓은 것', ok + ' / ' + CASES.length);
      setRO(3, '도움말', '카드를 누르고 칸을 눌러도 돼요');
    }
  }

  SciSim.pointer(view, {
    down(p) {
      if (S.scene === 'buret') { if (handleHit(p)) { BU.flow = true; Sound.click(); return true; } return false; }
      if (S.scene === 'ions') return ionsPointer(p, 'down');
      if (S.scene === 'cases') return casesPointer(p, 'down');
      return false;
    },
    move(p) { if (S.scene === 'ions') ionsPointer(p, 'move'); else if (S.scene === 'cases') casesPointer(p, 'move'); },
    up(p) { if (S.scene === 'buret') BU.flow = false; else if (S.scene === 'ions') ionsPointer(p, 'up'); else if (S.scene === 'cases') casesPointer(p, 'up'); },
    hover(p) {
      if (S.scene === 'buret') return handleHit(p) ? 'pointer' : null;
      if (S.scene === 'ions') return NT.ps.some((q) => q.k === 'OH-' && !q.enter && Math.hypot(q.x - p.x, q.y - p.y) < 26) ? 'grab' : null;
      if (S.scene === 'cases') return MATS.some((m, i) => inR(p, csMat(i))) ? 'grab' : null;
      if (S.scene === 'graph') return G.pts[1].some((q) => Math.hypot(p.x - gX(q.v), p.y - gY(q.T)) < 20) ? 'pointer' : null;
      return null;
    },
  });
  view.canvas.addEventListener('click', (e) => { if (S.scene === 'graph') graphClick(view.toLocal(e)); });
  if (PHONE) {
    view.canvas.style.touchAction = 'pan-y';
    view.canvas.addEventListener('touchstart', (e) => {
      const t0 = e.touches[0]; if (!t0) return;
      const p = view.toLocal(t0);
      let hit = false;
      if (S.scene === 'buret') hit = handleHit(p);
      else if (S.scene === 'ions') hit = NT.ps.some((q) => q.k === 'OH-' && !q.enter && Math.hypot(q.x - p.x, q.y - p.y) < 34);
      else if (S.scene === 'cases') hit = MATS.some((m, i) => inR(p, csMat(i)));
      if (hit) e.preventDefault();
    }, { passive: false });
  }
  $$('#indSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); resetBuret(b.dataset.i); }));
  const dropBtn = $('#dropBtn');
  dropBtn.addEventListener('click', buDrop);
  const flowBtn = $('#flowBtn');
  const flowOn = (e) => { e.preventDefault(); if (BU.n < V_MAX * 10) { BU.flow = true; Sound.click(); } };
  const flowOff = () => { BU.flow = false; };
  flowBtn.addEventListener('pointerdown', flowOn);
  ['pointerup', 'pointerleave', 'pointercancel', 'blur'].forEach((ev) => flowBtn.addEventListener(ev, flowOff));
  flowBtn.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); BU.flow = true; } });
  flowBtn.addEventListener('keyup', flowOff);
  $$('#concSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setConc(+b.dataset.c); }));
  $('#addBtn').addEventListener('click', gAdd);
  $('#plotBtn').addEventListener('click', gPlot);
  $('#naohBtn').addEventListener('click', addNaOH);
  $('#evapBtn').addEventListener('click', startEvap);
  $$('#patSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); ST.pat = +b.dataset.p; $$('#patSeg button').forEach((x) => x.classList.toggle('on', x === b)); setDose(0, true); ST.doseVis = 0; }));
  $('#sDose').addEventListener('input', (e) => setDose(+e.target.value));
  $$('#sceneSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.scene); }));
  $('#resetBtn').addEventListener('click', () => {
    Sound.click();
    if (S.scene === 'buret') resetBuret();
    else if (S.scene === 'graph') { resetGraph(false); }
    else if (S.scene === 'ions') resetIons();
    else if (S.scene === 'stomach') { setDose(0, true); ST.doseVis = 0; }
    else { resetCases(); }
  });

  function draw(t) {
    view.clear(BG);
    bgFill('#f7f4fe', '#ece7f9');
    ctx.save();
    ctx.globalAlpha = 0.35 + 0.65 * clamp(S.sceneA, 0, 1);
    if (S.scene === 'buret') drawBuretScene(t);
    else if (S.scene === 'graph') drawGraph(t);
    else if (S.scene === 'ions') drawIons(t);
    else if (S.scene === 'stomach') drawStomach(t);
    else drawCases(t);
    fx.draw(ctx);
    ctx.restore();
  }

  /* ---------- 미션 ---------- */
  const MIX = 'class="mini"';
  const stOkNow = () => stOk();
  const levels = [
    /* ---------- 1단계 · 관찰 ---------- */
    {
      title: '섞으면 색이 변해요', short: '색 변화', icon: '🧴', phase: '관찰',
      features: ['buret'],
      intro: '<p class="si-q">❓ 탐구 질문: 산성 용액과 염기성 용액을 섞으면 어떤 일이 일어날까?</p>' +
        '<div class="si-link">🔗 <b>앞 차시에서</b> 산은 H⁺을, 염기는 OH⁻을 내놓는 물질이고, BTB 용액의 색으로 산성·중성·염기성을 구별할 수 있다는 것을 배웠어요.</div>' +
        '<p>염산(산) ' + V_A + ' mL에 <b>수산화 나트륨 수용액</b>(염기)을 <b>뷰렛</b>으로 조금씩 넣으며 지시약의 색이 어떻게 변하는지 관찰해요. 이처럼 산과 염기가 섞여 서로의 성질을 잃는 반응이 <b>중화 반응</b>이에요.</p>',
      setup() { setScene('buret'); resetBuret('btb'); showHint('뷰렛의 꼭지(빨간 손잡이)나 버튼으로 수산화 나트륨 수용액을 넣어요', 5000); },
      recap: '염산에 수산화 나트륨 수용액을 넣으면 BTB 용액은 노란색 → 초록색 → 파란색으로, 페놀프탈레인 용액은 무색 → 붉은색으로 변해요. 초록색은 산성과 염기성이 서로 상쇄된 중성이에요.',
      summary: '<ul><li><b>중화 반응</b>: 산과 염기가 섞여 서로의 성질을 잃는 반응.</li></ul>' +
        '<table ' + MIX + '><tr><th>넣은 NaOH 수용액</th><th>BTB 용액</th><th>페놀프탈레인</th></tr>' +
        '<tr><td>적을 때 (산성)</td><td>노란색</td><td>무색</td></tr>' +
        '<tr><td>알맞을 때 (중성)</td><td>초록색</td><td>무색</td></tr>' +
        '<tr><td>많을 때 (염기성)</td><td>파란색</td><td>붉은색</td></tr></table>' +
        '<p class="note">중성이 되는 구간은 아주 좁아서 한 방울씩 천천히 넣어야 초록색을 만들 수 있어요.</p>',
      missions: [
        {
          title: '초록색으로 만들기',
          goal: '<b>BTB 용액</b>을 넣은 염산에 수산화 나트륨 수용액을 넣어 용액을 <b>초록색</b>으로 만들어 보세요.',
          hint: '처음에는 꼭지로 빠르게 넣다가, 연두색이 보이면 "한 방울" 버튼으로 천천히 넣어요. 지나치면 ↺로 다시 시작해요.',
          setup() { setScene('buret'); resetBuret('btb'); },
          check: () => buGreen(),
          hold: 0.6,
          status: () => mark(buGreen()) + ' BTB 초록색 · 지금 ' + fmtV(BU.n) + ' mL (' + btbName(dOf(BU.n)).split(' ')[0] + ')',
          explain: '염산의 H⁺과 수산화 나트륨 수용액의 OH⁻이 서로 반응해 줄어들면 산성이 약해지고, 둘이 딱 맞게 반응하면 <b>중성(초록색)</b>이 돼요. 이 구간이 아주 좁아서 한 방울씩 넣어야 해요.',
        },
        {
          title: '페놀프탈레인으로도 해 보기',
          goal: '<b>페놀프탈레인 용액</b>을 골라 같은 방법으로 넣어요. 무색이던 용액이 <b>붉은색</b>이 되게 해 보세요.',
          hint: '처음에는 무색이에요. 중화점을 지나 염기성이 되면 분홍색이 나타나고, 더 넣으면 붉은색이 돼요.',
          setup() { setScene('buret'); resetBuret('pp'); },
          check: () => buPink(),
          hold: 0.6,
          status: () => mark(buPink()) + ' 붉은색 · 지금 ' + fmtV(BU.n) + ' mL (' + ppName(dOf(BU.n)) + ')',
          explain: '페놀프탈레인 용액은 산성과 중성에서는 <b>무색</b>이고 염기성에서 <b>붉은색</b>이에요. 붉은색이 나타났다는 것은 중화점을 지나 OH⁻이 남았다는 뜻이에요.',
        },
        {
          type: 'quiz', title: '지시약의 색은 무엇을 알려 줄까?',
          goal: '염산에 수산화 나트륨 수용액을 넣으며 BTB 용액을 관찰했더니 노란색 → 초록색 → 파란색으로 변했어요. 지시약의 색이 알려 주는 것은?',
          setup() { setScene('buret'); },
          choices: ['용액이 산성·중성·염기성 중 어느 쪽인지', '용액의 온도가 몇 도인지', '용액에 녹아 있는 물질의 질량', '용액이 얼마나 오래 섞였는지'],
          answer: 0,
          feedback: ['', '지시약은 온도를 재는 도구가 아니에요. 온도는 다음 단계에서 온도계로 재요.', '지시약의 색은 질량이 아니라 용액의 성질(산성·중성·염기성)에 따라 달라져요.', '시간이 아니라 용액이 산성인지 염기성인지에 따라 색이 달라져요.'],
          explain: '지시약의 색은 용액이 <b>산성인지, 중성인지, 염기성인지</b>를 알려 줘요. BTB 용액의 노란색은 산성, 초록색은 중성, 파란색은 염기성이에요.',
        },
      ],
    },
    /* ---------- 2단계 · 실험 ---------- */
    {
      title: '섞으면 온도도 변해요', short: '온도 그래프', icon: '🌡️', phase: '실험',
      features: ['graph'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 산과 염기를 섞으면 색이 변했어요. <b>중학교에서</b> 배운 것처럼 화학 반응에서는 열이 나오거나 흡수될 수 있어요. 중화 반응에서는 온도가 어떻게 변할까요?</div>' +
        '<p>염산 ' + V_A + ' mL(처음 ' + T0.toFixed(1) + ' °C)에 같은 온도의 수산화 나트륨 수용액을 <b>' + STEP_ML + ' mL씩</b> 넣고 온도를 재어 <b>그래프</b>로 나타내요. 같은 지점에서 BTB 용액의 색도 확인해요.</p>' +
        '<p class="note">열 손실이 없는 이상적인 조건의 예시 자료예요.</p>',
      setup() { setScene('graph'); setConc(1); showHint('처음 온도(0 mL)에도 점을 찍는 것을 잊지 마요', 4500); },
      recap: '산과 염기를 섞으면 열이 나와 온도가 올라가요(발열 반응). 온도는 H⁺과 OH⁻이 모두 반응하는 꼭짓점(' + V_A + ' mL, ' + Math.max.apply(null, DATA).toFixed(1) + ' °C)에서 가장 높고, 이때 BTB 용액은 초록색이에요.',
      summary: '<ul><li>중화 반응은 열을 내보내는 <b>발열 반응</b>이에요.</li>' +
        '<li>온도 그래프의 <b>꼭짓점</b>(' + V_A + ' mL, ' + Math.max.apply(null, DATA).toFixed(1) + ' °C)은 산과 염기가 <b>모두 반응한 지점</b>(완전 중화)이고, BTB 용액은 초록색이에요.</li>' +
        '<li>꼭짓점 이후에는 더 이상 열이 나오지 않고, 같은 온도의 용액을 계속 넣는 만큼 온도가 내려가요.</li></ul>' +
        '<p class="note">염기의 농도를 0.5 M로 바꾸면 같은 양의 수산화 나트륨을 넣으려면 부피가 두 배 필요해서 꼭짓점이 ' + (V_A * 2) + ' mL로 옮겨 가요. 전체 용액이 더 많아져서 꼭짓점의 온도는 더 낮아요.</p>',
      missions: [
        {
          title: '점 찍고 꼭짓점 찾기',
          goal: '0 mL부터 ' + V_MAX + ' mL까지 <b>점 9개</b>를 찍고, 온도가 가장 높은 <b>꼭짓점</b>을 눌러요.',
          hint: '5 mL를 넣고 온도가 멈추면 📍 점 찍기를 눌러요. 0 mL(처음 온도)에도 점을 찍어야 9개가 돼요. 그래프에서 가장 높은 점을 눌러요.',
          setup() { setScene('graph'); setConc(1); },
          check: () => plotted1() >= 9 && G.peak,
          hold: 0.5,
          status: () => mark(plotted1() >= 9) + ' 점 ' + plotted1() + ' / 9 · ' + mark(G.peak) + ' 꼭짓점 찾기',
          explain: '산과 염기가 반응할 때 열이 나와 온도가 올라가요. ' + V_A + ' mL에서 H⁺과 OH⁻이 모두 반응해 온도가 가장 높고(' + Math.max.apply(null, DATA).toFixed(1) + ' °C), 이 지점에서 BTB 용액은 초록색이에요.',
        },
        {
          type: 'quiz', title: '꼭짓점 이후에 온도가 내려가는 까닭',
          goal: '꼭짓점을 지난 뒤에는 수산화 나트륨 수용액을 넣을수록 온도가 내려갔어요. 그 까닭으로 알맞은 것은?',
          setup() { setScene('graph'); },
          choices: ['더 이상 반응이 일어나지 않아 열이 나오지 않고, 넣은 용액이 온도를 낮추기 때문이에요', '중화 반응이 열을 흡수하는 반응으로 바뀌기 때문이에요', '수산화 나트륨이 열을 모두 빼앗아 가기 때문이에요', '온도계가 산성 용액에서만 정확하기 때문이에요'],
          answer: 0,
          feedback: ['', '중화 반응은 처음부터 끝까지 열을 내보내는 발열 반응이에요. 꼭짓점 이후에는 반응할 H⁺이 없을 뿐이에요.', '수산화 나트륨은 열을 빼앗는 것이 아니라, 반응할 대상이 없어 열을 만들지 못해요.', '온도계는 어떤 용액에서도 같은 방식으로 온도를 재요.'],
          explain: '꼭짓점에서 H⁺이 모두 OH⁻과 반응했기 때문에 그 뒤에 넣는 수산화 나트륨 수용액은 <b>반응할 대상이 없어</b> 더 이상 열이 나오지 않아요. 같은 온도의 용액을 계속 넣으니 오히려 온도가 조금씩 내려가요.',
        },
      ],
    },
    /* ---------- 3단계 · 모형 ---------- */
    {
      title: '이온이 만나 물이 돼요', short: '중화 모형', icon: '🔬', phase: '모형',
      features: ['ions'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 꼭짓점에서는 BTB 용액이 초록색이었어요. 용액 속에서는 어떤 일이 일어난 걸까요?</div>' +
        '<p>입자 돋보기로 용액 속 이온을 들여다봐요. 산의 <b>H⁺</b>(빨강)과 염기의 <b>OH⁻</b>(파랑)이 만나면 어떻게 될까요? 남은 이온은 무엇이 될까요?</p>' +
        '<p class="note">이온의 개수를 세거나 전기 전도도·pH를 계산하지는 않고, 이온이 결합하는 모습만 살펴봐요.</p>',
      setup() { setScene('ions'); resetIons(); showHint('NaOH 한 묶음을 넣고 OH⁻을 H⁺ 쪽으로 끌어 봐요', 4500); },
      recap: '중화 반응은 산의 H⁺과 염기의 OH⁻이 1 : 1로 결합해 물(H₂O)이 되는 반응이에요. 남은 음이온과 양이온이 만드는 물질이 염이에요(HCl + NaOH → NaCl + H₂O). 한쪽이 남으면 용액은 중성이 아니에요.',
      summary: '<ul><li>중화 반응: <b>H⁺ + OH⁻ → H₂O</b> (열이 나와요)</li>' +
        '<li><b>염</b>: 산의 음이온과 염기의 양이온이 만든 물질<br>HCl + NaOH → <b>NaCl</b> + H₂O (염화 나트륨)<br>염산 + 수산화 칼슘 → <b>염화 칼슘</b> + 물</li>' +
        '<li>물을 증발시키면 염의 결정이 남아요.</li>' +
        '<li>H⁺과 OH⁻ 중 한쪽이 남으면 용액은 산성 또는 염기성이에요. (넣은 양에 따라 색이 달라요.)</li></ul>',
      missions: [
        {
          title: '짝지어 물 만들기',
          goal: 'NaOH 묶음을 넣어 H⁺과 OH⁻을 짝지어 <b>물 분자 ' + ACID_U + '개</b>를 만들어 보세요.',
          hint: '"NaOH 한 묶음 넣기"를 ' + ACID_U + '번 눌러요. OH⁻은 잠시 뒤 H⁺ 쪽으로 끌려가고, 파란 OH⁻을 끌어서 빨간 H⁺ 가까이 놓아 줘도 돼요.',
          setup() { setScene('ions'); },
          check: () => IN.water >= ACID_U,
          hold: 0.6,
          status: () => mark(IN.water >= ACID_U) + ' 물 분자 ' + IN.water + ' / ' + ACID_U + ' · BTB ' + inColName().split(' ')[0],
          explain: '산의 <b>H⁺</b>과 염기의 <b>OH⁻</b>이 1 : 1로 결합해 <b>물(H₂O)</b>이 돼요. 이때 열이 나와요. Na⁺과 Cl⁻은 반응하지 않고 그대로 남아 있다가, 물을 증발시키면 소금(NaCl) 결정이 돼요.',
        },
        {
          title: '염의 이름 맞히기', manual: true,
          goal: '<b>염</b>은 염기의 양이온과 산의 음이온이 만나 생겨요. 두 반응에서 생기는 염의 이름을 골라요.',
          hint: 'HCl + NaOH에서는 Na⁺과 Cl⁻이 남아요. 수산화 칼슘 Ca(OH)₂의 양이온은 Ca²⁺이에요.',
          setup() { setScene('ions'); },
          check: () => saltCheck(),
          explain: '염산(HCl)의 음이온 Cl⁻과 수산화 나트륨의 양이온 Na⁺이 만나 <b>염화 나트륨(NaCl)</b>, 염산의 Cl⁻과 수산화 칼슘의 양이온 Ca²⁺이 만나 <b>염화 칼슘(CaCl₂)</b>이 돼요.',
        },
        {
          type: 'quiz', title: '중화 반응이 일어나면 항상 중성일까?',
          goal: '염산 ' + V_A + ' mL에 같은 농도(' + CONC_A.toFixed(1) + ' M)의 수산화 나트륨 수용액을 10 mL만 넣었어요. 중화 반응은 일어났어요. 이 용액에 BTB 용액을 떨어뜨리면?',
          setup() { setScene('ions'); },
          choices: ['노란색 — H⁺이 남아서 아직 산성이에요', '초록색 — 중화 반응이 일어났으므로 항상 중성이에요', '파란색 — 염기를 넣었으므로 염기성이에요', '색이 변하지 않아요 — 반응이 일어나지 않았어요'],
          answer: 0,
          feedback: ['', '중화 반응이 일어나도 H⁺과 OH⁻ 중 한쪽이 남으면 중성이 아니에요. 넣은 양이 ' + V_A + ' mL에 못 미치면 H⁺이 남아요.', '넣은 OH⁻보다 H⁺이 더 많이 남아 있어서 용액은 아직 산성이에요.', 'H⁺과 OH⁻이 만나 물이 되는 중화 반응은 일어났어요. 다만 H⁺이 남았을 뿐이에요.'],
          explain: '염산의 H⁺ 중 절반만 OH⁻과 반응했으므로 <b>H⁺이 남아 산성</b>이고, BTB 용액은 노란색이에요. 중화 반응이 일어나는 것과 용액이 중성이 되는 것은 달라요. 넣은 양에 따라 색이 달라져요.',
        },
      ],
    },
    /* ---------- 4단계 · 적용 ---------- */
    {
      title: '생활 속 중화 반응', short: '생활 속 중화', icon: '🏠', phase: '적용',
      features: ['stomach', 'cases'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> H⁺과 OH⁻이 만나 물이 되는 것이 중화 반응이고, 한쪽이 남으면 중성이 아니라는 것을 알았어요.</div>' +
        '<p>중화 반응은 생활 곳곳에서 쓰여요. <b>위산이 너무 많은 위</b>에서 제산제의 양을 맞춰 보고, 여러 <b>생활 속 중화 사례</b>를 정리해요.</p>' +
        '<div class="safety">⚠️ 강한 산과 강한 염기를 직접 섞으면 열이 많이 나서 위험해요.</div>',
      setup() { setScene('stomach'); setDose(0, true); ST.doseVis = 0; showHint('제산제 슬라이더를 조금씩 움직여 봐요', 4500); },
      recap: '위산 과다에는 제산제(염기), 산성 토양과 호수에는 석회, 개미 물림에는 염기성 약, 생선 비린내에는 레몬즙처럼 중화 반응으로 생활 문제를 해결해요. 너무 적거나 너무 많으면 안 돼요.',
      summary: '<table ' + MIX + '><tr><th>상황</th><th>중화에 쓰는 물질</th></tr>' +
        '<tr><td>위산 과다</td><td>제산제(염기성)</td></tr><tr><td>산성 토양·호수·폐수</td><td>석회 가루 등 염기성 물질</td></tr>' +
        '<tr><td>개미 물림 / 입안의 산</td><td>염기성 약 / 치약</td></tr><tr><td>생선 비린내(염기성)</td><td>레몬즙(산성)</td></tr></table>' +
        '<p class="note">제산제를 너무 많이 먹으면 위가 염기성이 되어 좋지 않아요. 강한 산과 강한 염기를 직접 섞으면 열이 많이 나서 위험해요.</p>',
      missions: [
        {
          title: '제산제 양 맞추기',
          goal: '<b>위산이 과다한 위</b>에 제산제를 넣어 BTB 색이 <b>초록색 범위</b>가 되게 맞춰요. 너무 적으면 노란색, 너무 많으면 파란색이에요.',
          hint: '슬라이더를 조금씩 움직여 봐요. 환자마다 위산의 양이 달라서 필요한 제산제의 양도 달라요.',
          setup() { setScene('stomach'); },
          check: () => stOkNow(),
          hold: 0.8,
          status: () => mark(stOkNow()) + ' 환자 ' + 'ABC'[ST.pat] + ' · 제산제 ' + ST.dose.toFixed(1) + ' 스푼 · ' + stName().split(' ')[0],
          explain: '제산제(염기)의 OH⁻이 위산의 H⁺과 반응해 물이 돼요(중화). 너무 적으면 산이 남아 속이 쓰리고, 너무 많으면 위가 염기성이 되어 소화에 좋지 않아요. 그래서 <b>알맞은 양</b>이 중요해요.',
        },
        {
          title: '생활 속 중화 사례 연결하기', manual: true,
          goal: '상황 8가지에 쓰는 <b>중화용 물질 카드</b>를 끌어 놓아요.',
          hint: '산성인 것(위산·토양·호수·개미의 산·입안의 산·폐수)은 염기성 물질로, 염기성인 것(생선 비린내, 샴푸)은 산성 물질로 중화해요.',
          setup() { setScene('cases'); },
          check: () => casesCheck(),
          explain: '산성인 것은 <b>염기성 물질</b>(제산제, 석회, 염기성 약, 치약, 중화제)로, 염기성인 것은 <b>산성 물질</b>(레몬즙, 린스)로 중화해요. 모두 H⁺과 OH⁻이 만나 물이 되는 같은 원리예요.',
        },
        {
          type: 'quiz', title: '직접 섞으면 위험한 까닭',
          goal: '강한 산과 강한 염기를 그냥 섞으면 위험해서 조심해야 해요. 그 까닭은?',
          setup() { setScene('cases'); },
          choices: ['중화 반응으로 열이 많이 나서 용액이 튀거나 화상을 입을 수 있어요', '두 물질이 섞이면 모두 사라져 버려요', '중화 반응이 일어나면 반드시 폭발해요', '섞으면 산성도 염기성도 더 강해져요'],
          answer: 0,
          feedback: ['', '물질이 사라지는 것이 아니라 물과 염이 돼요. 위험한 까닭은 나오는 열 때문이에요.', '폭발하는 것은 아니에요. 열이 많이 나서 용액이 튀거나 뜨거워질 수 있어요.', '산과 염기는 서로의 성질을 약하게 해요. 다만 그 과정에서 열이 많이 나요.'],
          explain: '중화 반응은 <b>발열 반응</b>이라 센 산과 센 염기를 직접 섞으면 열이 많이 나요. 실험은 선생님과 함께 보안경을 쓰고, 묽은 용액으로 조금씩 해요.',
        },
      ],
    },
  ];

  resetBuret('btb'); resetIons(); resetGraph(false); resetCases(); setDose(0, true);
  game = SciSim.game({
    simId: 'h1-neutralization',
    mount: '#game',
    badge: '중화 반응 박사',
    homeHref: '../../index.html#h1b',
    featureLabels: { buret: '🧴 뷰렛 · 지시약', graph: '🌡️ 온도계 · 그래프', ions: '🔬 이온 돋보기 · 증발 접시', stomach: '🏥 위장 · 제산제', cases: '🏠 생활 속 사례 카드' },
    onFeatures(set) { F = new Set(set); updateUI(); },
    levels,
  });

  updateUI();
  SciSim.loop((dt, t) => {
    if (S.scene === 'buret') stepBuret(dt);
    else if (S.scene === 'graph') stepGraph(dt);
    else if (S.scene === 'ions') stepIons(dt);
    else if (S.scene === 'stomach') stepStomach(dt);
    fx.update(dt);
    updateReadouts();
    draw(t);
  });

  window.__sim = {
    S, BU, G, IN, NT, ST, CS, CASES, MATS, DATA, game, levels, setScene, buDrop, buAdd, resetBuret, gAdd, gPlot, setConc, resetGraph, resetIons, addNaOH, startEvap, setDose, csSet, csRow, csMat, csSlot, plotted1, dOf, inComplete, hCount, oCount, stOk, graphClick, gX, gY, handleHit, BL, GL, NL, interp, tempAt,
    toClient: (x, y) => { const r = view.canvas.getBoundingClientRect(); return { x: r.left + x * r.width / VW, y: r.top + y * r.height / VH }; },
    fillCases() { CASES.forEach((c) => { CS.assign[c.id] = c.m; }); },
  };
})();
