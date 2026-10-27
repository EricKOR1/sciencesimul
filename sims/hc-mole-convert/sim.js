/* =========================================================
   화학 Ⅰ. 화학의 언어 - 몰 환산과 기체 부피 [12화학01-02]
   ① 관찰: 기체 1몰 (같은 온도·압력에서 같은 부피의 기체 = 같은 분자 수, 1몰의 부피 22.4 L / 24.5 L)
   ② 모형: 환산 허브 (질량 ÷ M, 부피 ÷ 22.4, 입자 수 ÷ 6.02×10²³ ↔ 몰) · 용액은 단원 36에서
   ③ 분석: 환산 연습 (같은 질량 · 같은 부피 · 같은 분자 수의 기체)
   ④ 적용: 종합 도전 (드라이아이스 22 g의 부피, 기체의 밀도 = M ÷ 22.4)
   이상 기체 방정식(PV = nRT)은 다루지 않아요.
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, Sound } = SciSim;
  const C = SciSim.color;

  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const VW = PHONE ? 480 : 800, VH = PHONE ? 760 : 560;
  const RM = SciSim.reduceMotion;
  const mark = (b) => (b ? '✅' : '⬜');
  const TAU = Math.PI * 2;
  const INK = '#26324a', MUTED = '#5a6679', PUR = '#8b5cf6';
  const BG = '#f3f0fb';

  const view = SciSim.stage($('#cv'), { width: VW, height: VH, background: BG });
  const ctx = view.ctx;
  const D = SciSim.draw(ctx);
  const parts = new SciSim.Particles();
  const T = (x, y, s, size, color, align, weight, extra) => D.text(x, y, s, Object.assign({ size, color, align, weight }, extra));
  function wrap(str, maxW, size, weight) {
    ctx.save(); ctx.font = D.font(size, weight || 700);
    const out = []; let line = '';
    String(str).split('\n').forEach((ln, li) => {
      if (li) { out.push(line.trimEnd()); line = ''; }
      const toks = ln.match(/[가-힣]|\s+|[^\s가-힣]+/g) || [];
      for (const tk of toks) {
        if (tk.trim() === '') { if (line) line += tk; continue; }
        const t = line + tk;
        if (ctx.measureText(t).width > maxW && line.trim()) { out.push(line.trimEnd()); line = tk; } else line = t;
      }
    });
    if (line) out.push(line.trimEnd());
    ctx.restore(); return out;
  }
  function panel(x, y, w, h, r, fill) { D.shadow(() => { D.roundRect(x, y, w, h, r || 14); ctx.fillStyle = fill || '#fff'; ctx.fill(); }, { blur: 8, y: 2 }); }
  function textBlock(x, y, maxW, str, size, color, lh, weight, align) {
    const ls = wrap(str, maxW, size, weight || 700); ls.forEach((l, i) => T(x, y + i * lh, l, size, color, align || 'left', weight || 700)); return ls.length * lh;
  }
  let hintTimer = 0;
  function showHint(msg, ms) {
    const h = $('#stageHint'); if (!h) return;
    h.textContent = msg; h.classList.remove('hide'); clearTimeout(hintTimer); hintTimer = setTimeout(() => h.classList.add('hide'), ms || 4200);
  }
  const parseNum = (s) => { const t = String(s).replace(',', '.').replace(/[^0-9.\-]/g, ''); return t === '' || isNaN(+t) ? NaN : +t; };
  const near = (v, a, tol) => !isNaN(v) && Math.abs(v - a) <= tol;
  const sm = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };

  /* ---------- 숫자 표기 ---------- */
  const NA = 6.02e23;
  const SUPD = '⁰¹²³⁴⁵⁶⁷⁸⁹';
  const supStr = (n) => String(n).split('').map((c) => (c === '-' ? '⁻' : SUPD[+c])).join('');
  function sciParts(x, dig) {
    if (!(x > 0)) return ['0', 0];
    let e = Math.floor(Math.log10(x)), m = +(x / Math.pow(10, e)).toPrecision(dig || 4);
    if (m >= 10) { m = +(m / 10).toPrecision(dig || 4); e++; }
    return [String(m), e];
  }
  const sci = (x, dig) => { const q = sciParts(x, dig); return q[0] + '×10' + supStr(q[1]); };
  const fm = (v, d) => String(+v.toFixed(d == null ? 3 : d));
  const f1 = (v) => v.toFixed(1);

  /* ---------- 자료 ---------- */
  const V0 = 22.4;                                       // 0 °C, 1기압에서 기체 1 mol의 부피 (L)
  const vmAt = (t) => Math.round(V0 * (273 + t) / 273 * 10) / 10;       // 온도에 따른 1 mol의 부피 (소수 첫째 자리) : 0 °C 22.4, 25 °C 24.5
  const VM25 = vmAt(25);
  const GAS = {
    h2: { f: 'H₂', name: '수소', M: 2, c: '#60a5fa' }, o2: { f: 'O₂', name: '산소', M: 32, c: '#f87171' }, co2: { f: 'CO₂', name: '이산화 탄소', M: 44, c: '#a78bfa' },
    n2: { f: 'N₂', name: '질소', M: 28, c: '#34d399' }, ch4: { f: 'CH₄', name: '메테인', M: 16, c: '#fbbf24' },
  };
  const AIR_M = 29;
  const dens = (M) => M / V0;
  const fd = (d) => (d >= 1 ? d.toFixed(2) : d.toFixed(3));
  const ICE = { w: 22, M: 44 }; ICE.n = ICE.w / ICE.M;
  const iceV = (t) => ICE.n * vmAt(t);

  /* ---------- 상태 ---------- */
  const S = {
    mode: 'balloon', t: 0, fade: 0, gate: '', sub: { balloon: 'bal', drill: 'q1', final: 'dry' },
    bw: { v: { h2: 11.2, o2: 5.6, co2: 16.8 }, vd: { h2: 11.2, o2: 5.6, co2: 16.8 }, sel: 'o2', eq: false, T: 0, Td: 0, got: {}, shake: 0 },
    hb: { gas: 'co2', m: 11, op: [null, null, null], sel: 0, d: { m: 11, n: 0, V: 0, N: 0 }, off: 0, ok: false },
    dr: { pred: [], revealed: false, bars: [0, 0, 0], msg: '', ok: [false, false, false, false], val: [NaN, NaN, NaN, NaN], shake: 0, fill: [0, 0, 0, 0] },
    fn: { T: 0, p: 0, run: false, okT: { 0: false, 25: false }, level: 0, levelT: 0, dOK: false, dry: { vd: 0 }, flame: 1, shake: 0 },
  };
  let game = null;
  const v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3'), l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3');
  const MODE_LABEL = { balloon: '🎈 기체 1몰', hub: '🔄 환산 허브', drill: '📝 환산 연습', final: '🧊 종합 도전' };

  /* ---------- 공통 UI ---------- */
  function setScene(mode) {
    if (S.mode !== mode) { S.fade = 1; parts.clear(); }
    S.mode = mode;
    $('#tbLabel').textContent = MODE_LABEL[mode];
    updateCtl();
  }
  function updateCtl() {
    $$('#ctrlCard [data-modes]').forEach((n) => {
      let on = n.getAttribute('data-modes').split(' ').indexOf(S.mode) >= 0;
      if (on && n.hasAttribute('data-gate')) on = S.gate === n.getAttribute('data-gate');
      if (on && n.hasAttribute('data-gate-off')) on = S.gate !== n.getAttribute('data-gate-off');
      if (on && n.hasAttribute('data-sub')) on = S.sub[S.mode] === n.getAttribute('data-sub');
      n.hidden = !on;
    });
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    $$('#bwView button').forEach((b) => b.classList.toggle('on', b.dataset.v === S.sub.balloon));
    $$('#drView button').forEach((b) => b.classList.toggle('on', b.dataset.v === S.sub.drill));
    $$('#fnView button').forEach((b) => b.classList.toggle('on', b.dataset.v === S.sub.final));
    $$('#blSel button').forEach((b) => b.classList.toggle('on', b.dataset.v === S.bw.sel));
    $$('#hbSub button').forEach((b) => b.classList.toggle('on', b.dataset.v === S.hb.gas));
    $$('#fnT button').forEach((b) => { b.classList.toggle('on', +b.dataset.v === S.fn.T); b.classList.toggle('done', !!S.fn.okT[b.dataset.v]); });
    $$('#tChips button').forEach((b) => b.classList.toggle('on', +b.dataset.v === S.bw.T));
    const bv = S.bw.v[S.bw.sel];
    $('#oBl').textContent = f1(bv) + ' L'; $('#sBl').value = Math.round(bv * 10);
    $('#oT').textContent = S.bw.T + ' °C'; $('#sT').value = S.bw.T;
    $('#oHb').textContent = S.hb.m + ' g'; $('#sHb').value = S.hb.m;
    $('#tMinus').disabled = S.bw.T <= 0; $('#tPlus').disabled = S.bw.T >= 50;
    $('#bSub').disabled = S.fn.run; $('#fnLab').textContent = '기체의 부피 (L), ' + S.fn.T + ' °C';
    hubOptUI();
  }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.mode); }));
  [['o2', '산소 O₂'], ['co2', '이산화 탄소 CO₂']].forEach(([k, n]) => { const b = document.createElement('button'); b.type = 'button'; b.dataset.v = k; b.textContent = n; $('#blSel').appendChild(b); });
  ['co2', 'o2', 'h2', 'ch4'].forEach((k) => { const b = document.createElement('button'); b.type = 'button'; b.dataset.v = k; b.textContent = GAS[k].name + ' ' + GAS[k].f; $('#hbSub').appendChild(b); });

  /* ---------- 기체 분자 그리기 ---------- */
  function molecule(g, x, y, s, rot) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot || 0);
    const sp = (px, py, r, col, o) => D.sphere(px, py, r, col, Object.assign({ gloss: r > 4.5 }, o || {}));
    if (g === 'h2') { sp(-3.2 * s, 0, 3 * s, '#eef1f7', { outline: '#8a95a6', outlineWidth: 0.8 }); sp(3.2 * s, 0, 3 * s, '#eef1f7', { outline: '#8a95a6', outlineWidth: 0.8 }); }
    else if (g === 'o2') { sp(-4.4 * s, 0, 4.4 * s, '#e2464b'); sp(4.4 * s, 0, 4.4 * s, '#e2464b'); }
    else if (g === 'co2') { sp(-8 * s, 0, 3.9 * s, '#e2464b'); sp(0, 0, 4.3 * s, '#475569'); sp(8 * s, 0, 3.9 * s, '#e2464b'); }
    else if (g === 'n2') { sp(-4.2 * s, 0, 4.2 * s, '#3867f4'); sp(4.2 * s, 0, 4.2 * s, '#3867f4'); }
    else if (g === 'ch4') { sp(0, 0, 4.4 * s, '#475569'); [[-6, -6], [6, -6], [-6, 6], [6, 6]].forEach((q) => sp(q[0] * s, q[1] * s, 2.7 * s, '#eef1f7', { outline: '#8a95a6', outlineWidth: 0.7 })); }
    ctx.restore();
  }
  function hexPts(n, sp0) {
    const all = [];
    for (let q = -6; q <= 6; q++) for (let r = -6; r <= 6; r++) { const x = sp0 * (q + r / 2), y = sp0 * (r * 0.866); all.push({ x, y, d: Math.round(Math.hypot(x, y) * 1000) / 1000, a: Math.atan2(y, x) }); }
    const groups = {}; all.forEach((p) => { (groups[p.d] = groups[p.d] || []).push(p); });
    const out = [];
    Object.keys(groups).map(Number).sort((u, v) => u - v).forEach((d) => {
      const g = groups[d].sort((u, v) => u.a - v.a), m = g.length;
      if (m === 1) { out.push(g[0]); return; }
      let st = 5; while (m % st === 0 && st < m) st += 2;
      for (let i = 0; i < m; i++) out.push(g[(i * st) % m]);
    });
    return out.slice(0, n).map((p) => [p.x, p.y, p.d]);
  }
  const HEX = hexPts(40, 1);
  const rotOf = (i) => ((i * 2.399) % 3.1416) - 1.5;
  function drawBalloon(cx, cy, r, color, label, t, dashed) {
    // 풍선 몸체: (cx, cy)가 중심, 아래에 매듭과 끈
    const g = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.1, cx, cy, r * 1.05);
    g.addColorStop(0, C.shade(color, 0.55)); g.addColorStop(0.6, color); g.addColorStop(1, C.shade(color, -0.25));
    if (dashed) { ctx.save(); ctx.strokeStyle = 'rgba(80,90,110,.55)'; ctx.lineWidth = 2; ctx.setLineDash([6, 5]); ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke(); ctx.restore(); return; }
    D.shadow(() => { ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(cx, cy, r, r * 1.05, 0, 0, TAU); ctx.fill(); }, { blur: 10, y: 4 });
    ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.beginPath(); ctx.ellipse(cx - r * 0.38, cy - r * 0.45, r * 0.22, r * 0.12, -0.6, 0, TAU); ctx.fill();
    ctx.fillStyle = C.shade(color, -0.3); ctx.beginPath(); ctx.moveTo(cx - 6, cy + r * 1.05 + 5); ctx.lineTo(cx + 6, cy + r * 1.05 + 5); ctx.lineTo(cx, cy + r * 1.05 - 1); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#8a95a6'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(cx, cy + r * 1.05 + 5); ctx.quadraticCurveTo(cx + 8, cy + r * 1.05 + 18, cx - 2, cy + r * 1.05 + 30); ctx.stroke();
  }

  /* ================= ① 기체 1몰 ================= */
  const BA = PHONE ? { x: 8, y: 52, w: 464, h: 500 } : { x: 12, y: 52, w: 776, h: 344 };
  const BB = PHONE ? { x: 8, y: 560, w: 464, h: 190 } : { x: 12, y: 404, w: 776, h: 146 };
  const BKEYS = ['h2', 'o2', 'co2'];
  const rK = PHONE ? 14.5 : 20;
  const bwSet = (v) => { const k = S.bw.sel; S.bw.v[k] = clamp(Math.round(v * 10) / 10, 0.1, 24); updateCtl(); };
  const bwEqual = () => Math.abs(S.bw.v.o2 - S.bw.v.h2) <= 0.05 && Math.abs(S.bw.v.co2 - S.bw.v.h2) <= 0.05;
  function drawBalloons(t) {
    const bw = S.bw;
    T(14, 26, '🎈 같은 온도 · 같은 압력(0 °C, 1기압)의 풍선', PHONE ? 14 : 17, INK, 'left', 800);
    panel(BA.x, BA.y, BA.w, BA.h, 14);
    BKEYS.forEach((k, i) => {
      const g = GAS[k], vd = bw.vd[k], n = vd / V0, reps = Math.round(vd / 1.12), sel = k === bw.sel;
      const cx = PHONE ? BA.x + 96 : BA.x + BA.w * (1 / 6 + i / 3), cy = PHONE ? BA.y + 86 + i * 164 : BA.y + 118;
      const icx = PHONE ? BA.x + 340 : cx, icy = PHONE ? cy + 4 : BA.y + 262, ir = 60;
      if (sel && k !== 'h2') { ctx.strokeStyle = 'rgba(139,92,246,.5)'; ctx.lineWidth = 3; ctx.setLineDash([6, 5]); D.roundRect(PHONE ? BA.x + 8 : cx - BA.w / 6 + 6, PHONE ? cy - 76 : BA.y + 8, PHONE ? BA.w - 16 : BA.w / 3 - 12, PHONE ? 158 : 330, 12); ctx.stroke(); ctx.setLineDash([]); }
      T(cx, PHONE ? cy - 62 : BA.y + 34, g.name + ' ' + g.f + (PHONE && k === 'h2' ? ' (기준 11.2 L)' : ''), 15, INK, 'center', 800);
      const r = rK * Math.cbrt(Math.max(vd, 0.05)), bob = RM ? 0 : Math.sin(t * 1.4 + i) * 2;
      drawBalloon(cx, cy + bob, r, g.c, '', t);
      T(cx, cy + bob + 5, f1(vd) + ' L', PHONE ? 16 : 18, '#fff', 'center', 800, { stroke: 'rgba(40,40,70,.5)', strokeWidth: 3 });
      if (k === 'h2' && !PHONE) T(cx, BA.y + 62, '(기준: 11.2 L)', 13, MUTED, 'center', 800);
      // 분자 모형 (대표 입자)
      ctx.save(); ctx.fillStyle = '#f7f4ff'; ctx.strokeStyle = '#cdbdf5'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(icx, icy, ir, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(icx, icy, ir - 2, 0, TAU); ctx.clip();
      const sp = PHONE ? 19.5 : 18.5, pts = HEX.slice(0, Math.min(reps, 26));
      pts.forEach((p, j) => { const jx = RM ? 0 : Math.sin(t * 1.3 + j * 1.7) * 1.2, jy = RM ? 0 : Math.cos(t * 1.1 + j * 2.1) * 1.2; molecule(k, icx + p[0] * sp + jx, icy + p[1] * sp + jy, 1.0, rotOf(j) + (RM ? 0 : Math.sin(t * 0.8 + j) * 0.15)); });
      ctx.restore();
      T(icx, icy + ir + 15, '대표 입자 ' + reps + '개 (한 개 = 0.05 mol)', 13, MUTED, 'center', 700);
    });
    if (bw.shake > 0) { ctx.fillStyle = 'rgba(226,70,75,' + bw.shake * 0.25 + ')'; D.roundRect(BA.x, BA.y, BA.w, BA.h, 14); ctx.fill(); }
    // 분자 수 비교
    panel(BB.x, BB.y, BB.w, BB.h, 14);
    T(BB.x + 16, BB.y + 26, '🔢 기체 분자 수 N = (V / 22.4) × 6.02×10²³', 14.5, INK, 'left', 800);
    const eq = bwEqual();
    BKEYS.forEach((k, i) => {
      const g = GAS[k], v = bw.v[k], n = v / V0, N = n * NA;
      if (PHONE) { const y = BB.y + 58 + i * 40; T(BB.x + 16, y, g.f + ' ' + f1(v) + ' L', 15, INK, 'left', 800); T(BB.x + 140, y, fm(n, 3) + ' mol', 14.5, '#b45309', 'left', 800); T(BB.x + BB.w - 14, y, sci(N, 4) + '개', 15, '#5b21b6', 'right', 800); }
      else { const cx = BB.x + BB.w * (1 / 6 + i / 3); T(cx, BB.y + 62, g.f + ' ' + f1(v) + ' L', 15, INK, 'center', 800); T(cx, BB.y + 86, 'n = ' + fm(n, 3) + ' mol', 14.5, '#b45309', 'center', 800); T(cx, BB.y + 114, sci(N, 4) + '개', 18, '#5b21b6', 'center', 800); }
    });
    if (!PHONE) { T(BB.x + BB.w / 3, BB.y + 112, eq ? '=' : '≠', 26, eq ? '#14a058' : '#e2464b', 'center', 800); T(BB.x + BB.w * 2 / 3, BB.y + 112, eq ? '=' : '≠', 26, eq ? '#14a058' : '#e2464b', 'center', 800); }
    T(BB.x + BB.w / 2, BB.y + BB.h - 14, eq ? '✅ 부피가 같으면 기체의 종류와 관계없이 분자 수가 같아요!' : '부피가 다르면 분자 수도 달라요. 부피를 맞춰 보세요.', PHONE ? 13.5 : 14.5, eq ? '#14803f' : MUTED, 'center', 800);
  }
  function drawTemp(t) {
    const bw = S.bw, Td = bw.Td, vm = Math.round(V0 * (273 + Td) / 273 * 10) / 10;
    T(14, 26, '🌡️ 온도가 높아지면 1 mol의 부피는?', PHONE ? 15 : 17, INK, 'left', 800);
    const H = PHONE ? 420 : BA.h;
    panel(BA.x, BA.y, BA.w, H, 14);
    const bx = BA.x + (PHONE ? 70 : 90);
    D.thermometer(bx, BA.y + 54, H - (PHONE ? 176 : 130), Td, 0, 50, { step: 10, unit: '°' });
    T(bx, BA.y + 34, Math.round(Td) + ' °C', 16, '#b4231f', 'center', 800);
    const cx = BA.x + (PHONE ? BA.w / 2 + 26 : BA.w * 0.46), cy = BA.y + H * 0.46;
    const k = PHONE ? 33 : 34, r = k * Math.cbrt(vm), r0 = k * Math.cbrt(V0);
    const bob = RM ? 0 : Math.sin(t * 1.4) * 2;
    drawBalloon(cx, cy + bob, r, '#f87171', '', t);
    const sp = (PHONE ? 25 : 30) * Math.cbrt(vm / V0);
    ctx.save(); ctx.beginPath(); ctx.ellipse(cx, cy + bob, r - 3, r * 1.05 - 3, 0, 0, TAU); ctx.clip();
    HEX.slice(0, 19).forEach((p, j) => molecule('o2', cx + p[0] * sp, cy + bob + p[1] * sp, 1.1, rotOf(j) + (RM ? 0 : Math.sin(t * 0.8 + j) * 0.15)));
    ctx.restore();
    drawBalloon(cx, cy, r0, '#f87171', '', t, true);          // 0 °C일 때 크기 (점선) - 풍선 위에 그려서 항상 보이게
    T(cx, BA.y + 34, '1 mol 기체: 분자 ' + sci(NA, 3) + '개', 14.5, INK, 'center', 800);
    T(cx + r0 + 6, cy - 4, '0 °C 크기', 13, '#394258', 'left', 800, { stroke: '#fff', strokeWidth: 4 });
    // 부피 막대
    const vx = BA.x + (PHONE ? 24 : BA.w - 190), vw = PHONE ? BA.w - 48 : 170, vy = BA.y + (PHONE ? H - 54 : 100), maxV = 30;
    T(vx, vy - 20, '1 mol의 부피 (막대 끝 = 30 L)', 13.5, INK, 'left', 800);
    D.roundRect(vx, vy, vw, 24, 8); ctx.fillStyle = '#eef1f7'; ctx.fill();
    ctx.save(); D.roundRect(vx, vy, vw, 24, 8); ctx.clip(); ctx.fillStyle = PUR; ctx.fillRect(vx, vy, vw * clamp(vm / maxV, 0, 1), 24); ctx.restore();
    [[V0, '22.4'], [VM25, '24.5']].forEach((q, i) => { const x = vx + vw * q[0] / maxV; ctx.strokeStyle = i ? '#b45309' : '#516079'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, vy - 4); ctx.lineTo(x, vy + 30); ctx.stroke(); T(x + (i ? 2 : -2), vy + 46, q[1], 13, i ? '#b45309' : '#516079', i ? 'left' : 'right', 800); });
    T(vx + vw / 2, vy + 18, f1(vm) + ' L', 15, '#fff', 'center', 800);
    const by = PHONE ? 480 : BB.y;
    panel(BB.x, by, BB.w, PHONE ? 270 : BB.h, 14);
    T(BB.x + 16, by + 28, '📏 1 mol의 부피: 0 °C → ' + V0 + ' L, 25 °C → ' + VM25 + ' L', 14.5, INK, 'left', 800);
    textBlock(BB.x + 16, by + 58, BB.w - 32, '온도가 높아지면 분자가 더 빨리 움직여서 분자 사이의 거리가 멀어지고, 같은 1 mol의 부피가 커져요. 분자의 수는 그대로예요. 지금: ' + Math.round(Td) + ' °C에서 1 mol = ' + f1(vm) + ' L', 14.5, MUTED, 20, 700);
    textBlock(BB.x + 16, by + (PHONE ? 150 : 128), BB.w - 32, '이 단원에서는 0 °C와 25 °C의 값(22.4 L, 24.5 L)을 써요.', 13.5, '#5b21b6', 19, 800);
  }
  function stepBalloon(dt) {
    const bw = S.bw;
    BKEYS.forEach((k) => { bw.vd[k] = SciSim.approach(bw.vd[k], bw.v[k], dt, 9); if (Math.abs(bw.vd[k] - bw.v[k]) < 0.005) bw.vd[k] = bw.v[k]; });
    bw.Td = SciSim.approach(bw.Td, bw.T, dt, 8); if (Math.abs(bw.Td - bw.T) < 0.02) bw.Td = bw.T;
    bw.shake = Math.max(0, bw.shake - dt);
  }
  $('#bwView').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; Sound.click(); S.sub.balloon = b.dataset.v; S.fade = 0.5; updateCtl(); });
  $('#blSel').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; Sound.click(); S.bw.sel = b.dataset.v; updateCtl(); });
  $('#sBl').addEventListener('input', (e) => bwSet(+e.target.value / 10));
  [['#bM1', -1], ['#bM01', -0.1], ['#bP01', 0.1], ['#bP1', 1]].forEach(([id, d]) => $(id).addEventListener('click', () => { Sound.tick(); bwSet(S.bw.v[S.bw.sel] + d); }));
  const setT = (v) => { S.bw.T = clamp(Math.round(v), 0, 50); S.bw.got[S.bw.T] = true; updateCtl(); };
  $('#sT').addEventListener('input', (e) => setT(+e.target.value));
  $('#tMinus').addEventListener('click', () => { Sound.tick(); setT(S.bw.T - 1); });
  $('#tPlus').addEventListener('click', () => { Sound.tick(); setT(S.bw.T + 1); });
  $('#tChips').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; Sound.click(); setT(+b.dataset.v); });

  /* ================= ② 환산 허브 ================= */
  const HP = PHONE ? { x: 8, y: 52, w: 464, h: 520 } : { x: 12, y: 52, w: 776, h: 336 };
  const HI = PHONE ? { x: 8, y: 580, w: 464, h: 170 } : { x: 12, y: 396, w: 776, h: 154 };
  const HN = PHONE
    ? { mass: { x: 240, y: 116, w: 200, h: 84 }, mol: { x: 240, y: 270, r: 46 }, vol: { x: 122, y: 430, w: 210, h: 84 }, num: { x: 358, y: 430, w: 210, h: 84 }, sol: { x: 240, y: 538, w: 400, h: 50 } }
    : { mass: { x: 130, y: 200, w: 190, h: 100 }, mol: { x: 394, y: 200, r: 50 }, vol: { x: 394, y: 326, w: 220, h: 72 }, num: { x: 658, y: 200, w: 190, h: 100 }, sol: { x: 394, y: 100, w: 230, h: 48 } };
  const OPSET = [
    { dir: 'div', b: 'M' }, { dir: 'mul', b: 'M' }, { dir: 'div', b: 'Vm' }, { dir: 'mul', b: 'Vm' }, { dir: 'div', b: 'NA' }, { dir: 'mul', b: 'NA' },
  ];
  const OK_OP = [OPSET[0], OPSET[3], OPSET[5]];
  const baseOf = (b) => (b === 'M' ? GAS[S.hb.gas].M : b === 'Vm' ? V0 : NA);
  const baseTxt = (b) => (b === 'M' ? fm(GAS[S.hb.gas].M) : b === 'Vm' ? '22.4' : '6.02×10²³');
  const opTxt = (o) => (o ? (o.dir === 'div' ? '/ ' : '× ') + baseTxt(o.b) : '?');
  const opSame = (a, b) => !!a && !!b && a.dir === b.dir && a.b === b.b;
  const EDGE_NAME = ['① 질량 → 몰', '② 몰 → 기체 부피', '③ 몰 → 입자 수'];
  const applyOp = (o, x) => (o ? (o.dir === 'div' ? x / baseOf(o.b) : x * baseOf(o.b)) : NaN);
  function hubVals() {
    const h = S.hb, n = applyOp(h.op[0], h.m);
    return { n, V: applyOp(h.op[1], n), N: applyOp(h.op[2], n) };
  }
  const hubOK = () => S.hb.gas === 'co2' && S.hb.m === 11 && OK_OP.every((o, i) => opSame(S.hb.op[i], o));
  function hubOptUI() {
    const box = $('#hbOpt'); if (!box) return;
    const h = S.hb, key = h.sel + '|' + h.gas + '|' + JSON.stringify(h.op[h.sel]);
    $('#hbSelLab').textContent = EDGE_NAME[h.sel];
    if (box.dataset.key === key) return; box.dataset.key = key; box.innerHTML = '';
    OPSET.forEach((o, i) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'opt' + (opSame(h.op[h.sel], o) ? ' on' : '');
      b.textContent = (o.dir === 'div' ? '÷ ' : '× ') + baseTxt(o.b) + (o.b === 'M' ? ' (몰질량)' : o.b === 'Vm' ? ' (L/mol)' : ' (아보가드로 수)');
      b.addEventListener('click', () => { Sound.click(); const i = S.hb.sel; S.hb.op[i] = o; if (opSame(o, OK_OP[i]) && i < 2) S.hb.sel = i + 1; updateCtl(); });
      box.appendChild(b);
    });
  }
  function edgeGeom(i) {
    const m = HN.mass, c = HN.mol, v = HN.vol, n = HN.num;
    if (PHONE) {
      if (i === 0) return { x1: m.x, y1: m.y + m.h / 2 + 4, x2: c.x, y2: c.y - c.r - 4, lx: m.x + 16, ly: (m.y + m.h / 2 + c.y - c.r) / 2 + 4, al: 'left' };
      if (i === 1) return { x1: c.x - c.r * 0.6, y1: c.y + c.r * 0.8, x2: v.x + 30, y2: v.y - v.h / 2 - 4, lx: (c.x + v.x) / 2 - 24, ly: (c.y + v.y - v.h / 2) / 2 + 10, al: 'right' };
      return { x1: c.x + c.r * 0.6, y1: c.y + c.r * 0.8, x2: n.x - 30, y2: n.y - n.h / 2 - 4, lx: (c.x + n.x) / 2 + 24, ly: (c.y + n.y - n.h / 2) / 2 + 10, al: 'left' };
    }
    if (i === 0) return { x1: m.x + m.w / 2 + 6, y1: m.y, x2: c.x - c.r - 6, y2: c.y, lx: (m.x + m.w / 2 + c.x - c.r) / 2, ly: m.y - 14, al: 'center' };
    if (i === 1) return { x1: c.x, y1: c.y + c.r + 4, x2: v.x, y2: v.y - v.h / 2 - 4, lx: c.x + 14, ly: (c.y + c.r + v.y - v.h / 2) / 2 + 6, al: 'left' };
    return { x1: c.x + c.r + 6, y1: c.y, x2: n.x - n.w / 2 - 6, y2: n.y, lx: (c.x + c.r + n.x - n.w / 2) / 2, ly: n.y - 14, al: 'center' };
  }
  function nodeBox(x, y, w, h, title, val, st, sub) {
    D.shadow(() => { D.roundRect(x - w / 2, y - h / 2, w, h, 14); ctx.fillStyle = st === 'ok' ? '#fff' : st === 'bad' ? '#fff5f5' : '#f7f3ff'; ctx.fill(); }, { blur: 7, y: 3 });
    ctx.strokeStyle = st === 'ok' ? '#14a058' : st === 'bad' ? '#e2464b' : PUR; ctx.lineWidth = 2.6; if (st === 'none') ctx.setLineDash([7, 5]); D.roundRect(x - w / 2, y - h / 2, w, h, 14); ctx.stroke(); ctx.setLineDash([]);
    T(x, y - h / 2 + 22, title, 13.5, MUTED, 'center', 800);
    T(x, y + h / 2 - (sub ? 28 : 18), val, val.length > 12 ? 17 : 21, st === 'bad' ? '#b4231f' : st === 'none' ? '#9aa5b6' : INK, 'center', 800);
    if (sub) T(x, y + h / 2 - 10, sub, 12.5, MUTED, 'center', 700);
  }
  function drawHub(t) {
    const h = S.hb, g = GAS[h.gas], vals = hubVals(), d = h.d;
    T(14, 26, '🔄 몰을 가운데에 두고 바꾸기', PHONE ? 15 : 17, INK, 'left', 800);
    panel(HP.x, HP.y, HP.w, HP.h, 14);
    // 용액 (잠김)
    const s = HN.sol;
    ctx.strokeStyle = '#b4bfcf'; ctx.lineWidth = 2; ctx.setLineDash([6, 6]); D.roundRect(s.x - s.w / 2, s.y - s.h / 2, s.w, s.h, 12); ctx.stroke(); ctx.setLineDash([]);
    T(s.x, s.y - 4, '🔒 용액: 부피 × 몰 농도', 14, '#8a95a6', 'center', 800); T(s.x, s.y + 16, '단원 36에서 배워요', 13, '#9aa5b6', 'center', 700);
    ctx.strokeStyle = '#d6dcea'; ctx.lineWidth = 2; ctx.setLineDash([4, 5]); ctx.beginPath(); ctx.moveTo(PHONE ? s.x : HN.mol.x, PHONE ? s.y - s.h / 2 : HN.mol.y - HN.mol.r); ctx.lineTo(PHONE ? s.x : HN.mol.x, PHONE ? HN.vol.y + HN.vol.h / 2 + 4 : s.y + s.h / 2); ctx.stroke(); ctx.setLineDash([]);
    // 중심 원 (몰)
    const c = HN.mol;
    D.glow(c.x, c.y, c.r + 26, '#ffd447', 0.35);
    D.shadow(() => { ctx.fillStyle = '#fff3c4'; ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, TAU); ctx.fill(); }, { blur: 10, y: 3 });
    ctx.strokeStyle = '#e0a100'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, TAU); ctx.stroke();
    T(c.x, c.y - 10, '몰', 17, '#b45309', 'center', 800); T(c.x, c.y + 14, isNaN(vals.n) ? '?' : fm(d.n, 4) + ' mol', 15.5, INK, 'center', 800);
    // 노드
    const m = HN.mass, v = HN.vol, nn = HN.num;
    nodeBox(m.x, m.y, m.w, m.h, g.name + ' ' + g.f + ' 질량', fm(h.m) + ' g', 'ok', 'M = ' + fm(g.M) + ' g/mol');
    const stV = !h.op[1] ? 'none' : opSame(h.op[1], OK_OP[1]) && opSame(h.op[0], OK_OP[0]) ? 'ok' : 'bad';
    const stN = !h.op[2] ? 'none' : opSame(h.op[2], OK_OP[2]) && opSame(h.op[0], OK_OP[0]) ? 'ok' : 'bad';
    nodeBox(v.x, v.y, v.w, v.h, '기체 부피 (0 °C, 1기압)', !h.op[1] || !h.op[0] ? '?' : (d.V >= 1000 ? sci(d.V, 3) : fm(d.V, 2)) + ' L', !h.op[0] ? 'none' : stV);
    nodeBox(nn.x, nn.y, nn.w, nn.h, '입자 수', !h.op[2] || !h.op[0] ? '?' : sci(d.N) + '개', !h.op[0] ? 'none' : stN);
    // 화살표 + 흐름 점
    for (let i = 0; i < 3; i++) {
      const e = edgeGeom(i), o = h.op[i], good = opSame(o, OK_OP[i]), sel = h.sel === i;
      D.arrow(e.x1, e.y1, e.x2, e.y2, { color: good ? '#14a058' : sel ? PUR : '#b4a3e8', width: sel ? 6 : 4.5, head: 14 });
      if (good) { const len = Math.hypot(e.x2 - e.x1, e.y2 - e.y1); for (let q = 0; q < 3; q++) { const u = ((h.off + q / 3) % 1); D.sphere(e.x1 + (e.x2 - e.x1) * u, e.y1 + (e.y2 - e.y1) * u, 4, '#ffb400', { gloss: false }); } void len; }
      const lw = 11 + opTxt(o).length * 8.4;
      const lbx = e.al === 'center' ? e.lx - lw / 2 : e.al === 'left' ? e.lx : e.lx - lw;
      D.roundRect(lbx, e.ly - 14, lw, 26, 13); ctx.fillStyle = sel ? '#ede6ff' : '#fff'; ctx.fill(); ctx.strokeStyle = good ? '#14a058' : sel ? PUR : '#cdbdf5'; ctx.lineWidth = sel ? 3 : 1.8; ctx.stroke();
      T(lbx + lw / 2, e.ly + 5, opTxt(o), 14, good ? '#14803f' : '#5b21b6', 'center', 800);
    }
    if (!PHONE) T(HP.x + HP.w - 14, HP.y + HP.h - 12, '화살표나 그 위의 이름표를 눌러 곱하기 · 나누기를 골라요', 13, MUTED, 'right', 700);
    // 아래 풀이 판
    panel(HI.x, HI.y, HI.w, HI.h, 14);
    const row = (y, txt, ok) => T(HI.x + 16, y, txt, PHONE ? 13.5 : 15, ok ? '#14803f' : INK, 'left', 800);
    const okI = [opSame(h.op[0], OK_OP[0]), opSame(h.op[1], OK_OP[1]), opSame(h.op[2], OK_OP[2])];
    T(HI.x + 16, HI.y + 26, '🧮 계산 과정 (' + g.f + ' ' + fm(h.m) + ' g)', 14.5, INK, 'left', 800);
    row(HI.y + 56, h.op[0] ? '① ' + fm(h.m) + ' ' + opTxt(h.op[0]) + ' = ' + (okI[0] ? fm(vals.n, 4) + ' mol ✅' : fm(vals.n, 4) + ' ← 다시') : '① 질량을 몰로 바꿔요', okI[0]);
    row(HI.y + 84, h.op[1] ? '② ' + fm(vals.n, 4) + ' mol ' + opTxt(h.op[1]) + ' = ' + (vals.V >= 1000 ? sci(vals.V, 3) : fm(vals.V, 2)) + ' L' + (okI[1] ? ' ✅' : ' ← 다시') : '② 몰을 기체 부피로 바꿔요', okI[1]);
    row(HI.y + 112, h.op[2] ? '③ ' + fm(vals.n, 4) + ' mol ' + opTxt(h.op[2]) + ' = ' + sci(vals.N) + '개' + (okI[2] ? ' ✅' : ' ← 다시') : '③ 몰을 입자 수로 바꿔요', okI[2]);
    if (!PHONE) T(HI.x + HI.w - 16, HI.y + HI.h - 14, '거꾸로 갈 때는 곱하기와 나누기를 서로 바꿔요', 13.5, MUTED, 'right', 700);
  }
  function stepHub(dt) {
    const h = S.hb, vals = hubVals();
    const tg = { n: isFinite(vals.n) ? vals.n : 0, V: isFinite(vals.V) ? vals.V : 0, N: isFinite(vals.N) ? vals.N : 0 };
    ['n', 'V', 'N'].forEach((k) => { h.d[k] = SciSim.approach(h.d[k], tg[k], dt, 9); if (Math.abs(h.d[k] - tg[k]) < Math.abs(tg[k]) * 1e-4 + 1e-9) h.d[k] = tg[k]; });
    h.off = (h.off + dt * 0.6) % 1;
  }
  function hubHit(p) {
    for (let i = 0; i < 3; i++) { const e = edgeGeom(i); const dx = e.x2 - e.x1, dy = e.y2 - e.y1, l2 = dx * dx + dy * dy; const u = clamp(((p.x - e.x1) * dx + (p.y - e.y1) * dy) / l2, 0, 1); const d1 = Math.hypot(p.x - (e.x1 + dx * u), p.y - (e.y1 + dy * u)); const lw = 11 + opTxt(S.hb.op[i]).length * 8.4, lbx = e.al === 'center' ? e.lx - lw / 2 : e.al === 'left' ? e.lx : e.lx - lw; const inL = p.x >= lbx - 4 && p.x <= lbx + lw + 4 && p.y >= e.ly - 18 && p.y <= e.ly + 16; if (d1 <= 22 || inL) return i; }
    return -1;
  }
  $('#hbSub').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; Sound.click(); S.hb.gas = b.dataset.v; updateCtl(); hubOptUI(); });
  $('#sHb').addEventListener('input', (e) => { S.hb.m = +e.target.value; updateCtl(); });

  /* ================= ③ 환산 연습 ================= */
  const Q8 = ['h2', 'ch4', 'o2'].map((k) => ({ k, n: 8 / GAS[k].M, V: 8 / GAS[k].M * V0 }));
  const Q8ORDER = Q8.slice().sort((a, b) => b.V - a.V).map((q) => q.k);       // 부피가 큰 순서
  const Q8SHOW = ['o2', 'h2', 'ch4'];                                           // 카드가 보이는 순서 (정답 순서와 다르게)
  const QA = PHONE ? { x: 8, y: 52, w: 464, h: 440 } : { x: 12, y: 52, w: 776, h: 336 };
  const QB = PHONE ? { x: 8, y: 500, w: 464, h: 250 } : { x: 12, y: 396, w: 776, h: 154 };
  const cardQ = (i) => (PHONE ? { x: QA.x + 12, y: QA.y + 44 + i * 78, w: QA.w - 24, h: 70 } : { x: QA.x + 20 + i * 250, y: QA.y + 48, w: 236, h: 106 });
  function drawQ1(t) {
    const q = S.dr;
    T(14, 26, '🎯 같은 질량 8 g, 부피가 큰 순서는?', PHONE ? 15 : 17, INK, 'left', 800);
    panel(QA.x, QA.y, QA.w, QA.h, 14);
    Q8SHOW.forEach((k, i) => {
      const r = cardQ(i), g = GAS[k], num = q.pred.indexOf(k);
      D.shadow(() => { D.roundRect(r.x, r.y, r.w, r.h, 14); ctx.fillStyle = num >= 0 ? '#f3edff' : '#fff'; ctx.fill(); }, { blur: num >= 0 ? 8 : 3, y: 2 });
      ctx.strokeStyle = num >= 0 ? PUR : '#d6dcea'; ctx.lineWidth = num >= 0 ? 3 : 1.6; D.roundRect(r.x, r.y, r.w, r.h, 14); ctx.stroke();
      if (num >= 0) D.sphere(r.x + 24, r.y + 24, 15, PUR, { text: String(num + 1), textScale: 1 });
      else { ctx.strokeStyle = '#c8d0df'; ctx.lineWidth = 2; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.arc(r.x + 24, r.y + 24, 15, 0, TAU); ctx.stroke(); ctx.setLineDash([]); }
      molecule(k, r.x + r.w - (PHONE ? 40 : 46), r.y + (PHONE ? 35 : 34), PHONE ? 1.6 : 2.1, 0.3);
      T(r.x + 50, r.y + (PHONE ? 30 : 36), g.name + ' ' + g.f, 15.5, INK, 'left', 800);
      const z = Q8.find((a) => a.k === k);
      T(r.x + 50, r.y + (PHONE ? 54 : 62), q.revealed && PHONE ? 'n = 8 / ' + g.M + ' = ' + fm(z.n, 2) + ' mol' : '8 g · M = ' + g.M + ' g/mol', 13.5, q.revealed && PHONE ? '#5b21b6' : '#b45309', 'left', 800);
      if (q.revealed && !PHONE) T(r.x + 16, r.y + r.h - 14, 'n = 8 / ' + g.M + ' = ' + fm(z.n, 2) + ' mol', 13.5, '#5b21b6', 'left', 800);
    });
    // 막대 (V, 눈금 끝 90 L)
    const bx = QA.x + 24, bw = QA.w - 48, by0 = PHONE ? QA.y + 296 : QA.y + 190, rh = PHONE ? 44 : 38;
    T(bx, by0 - 12, q.revealed ? '계산한 기체 부피 V = n × 22.4 (막대 끝 = 90 L)' : '계산으로 확인하면 부피가 막대로 나타나요', 14, INK, 'left', 800);
    Q8ORDER.forEach((k, i) => {
      const z = Q8.find((a) => a.k === k), y = by0 + i * rh, g = GAS[k];
      q.bars[i] = SciSim.approach(q.bars[i], q.revealed ? z.V / 90 : 0, 1 / 60, 6);
      T(bx, y + 22, g.f, 14, INK, 'left', 800);
      D.roundRect(bx + 44, y + 4, bw - 44, 24, 8); ctx.fillStyle = '#eef1f7'; ctx.fill();
      if (q.bars[i] > 0.002) { ctx.save(); D.roundRect(bx + 44, y + 4, bw - 44, 24, 8); ctx.clip(); ctx.fillStyle = g.c; ctx.fillRect(bx + 44, y + 4, (bw - 44) * clamp(q.bars[i], 0, 1), 24); ctx.restore(); }
      if (q.revealed) T(Math.min(bx + 44 + (bw - 44) * clamp(q.bars[i], 0, 1) + 8, bx + bw - 80), y + 22, fm(z.V, 1) + ' L', 14, INK, 'left', 800, { alpha: 1 });
    });
    panel(QB.x, QB.y, QB.w, QB.h, 14);
    T(QB.x + 16, QB.y + 28, '📐 부피 V = (질량 / 몰질량) × 22.4 L/mol', 14.5, INK, 'left', 800);
    textBlock(QB.x + 16, QB.y + 58, QB.w - 32, q.msg || '카드를 부피가 큰 순서대로 눌러 예측한 뒤, 계산으로 확인해요.', 14.5, q.revealed ? '#5b21b6' : MUTED, 20, 800);
    if (q.shake > 0) { ctx.fillStyle = 'rgba(226,70,75,' + q.shake * 0.25 + ')'; D.roundRect(QA.x, QA.y, QA.w, QA.h, 14); ctx.fill(); }
  }
  function q1Tap(p) {
    for (let i = 0; i < 3; i++) {
      const r = cardQ(i);
      if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) {
        const k = Q8SHOW[i], n = S.dr.pred.indexOf(k);
        if (n >= 0) S.dr.pred.length = n; else S.dr.pred.push(k);
        Sound.click(); updateCtl(); return;
      }
    }
  }
  function q1Reveal() {
    const q = S.dr;
    if (q.pred.length < 3) { showHint('먼저 세 카드를 모두 눌러 순서를 예측해요.', 3000); Sound.fail(); return; }
    q.revealed = true; Sound.success();
    const right = q.pred.every((k, i) => k === Q8ORDER[i]);
    q.msg = right ? '✅ 예측이 맞았어요! 같은 질량이면 몰질량이 작을수록 몰수가 많고 부피도 커요.' : '예측과 달라요. 같은 질량이면 몰질량이 작을수록 몰수가 커서 부피가 커져요. 순서를 다시 예측해 보세요.';
    if (right) parts.burst(PHONE ? 240 : 400, PHONE ? 330 : 190, { count: 16, speed: 150, size: 3, colors: ['#ffb400', '#14a058', '#8b5cf6'] });
  }
  const q1OK = () => S.dr.revealed && S.dr.pred.length === 3 && S.dr.pred.every((k, i) => k === Q8ORDER[i]);
  $('#bQ1').addEventListener('click', q1Reveal);
  $('#bQ1c').addEventListener('click', () => { Sound.click(); S.dr.pred = []; S.dr.revealed = false; S.dr.msg = ''; updateCtl(); });
  // 질량 · 부피 · 분자 수 계산 문제
  const DQ = [
    { id: '#dqO', k: 'o2', ans: 16 }, { id: '#dqC', k: 'co2', ans: 22 }, { id: '#dqN', k: 'n2', ans: 14 }, { id: '#dqV', k: null, ans: 1.12 },
  ];
  const Q3N = 3.01e22, Q3n = Q3N / NA, Q3V = Q3n * V0;
  function dqEval(i) {
    const q = S.dr, inp = $(DQ[i].id), v = parseNum(inp.value), was = q.ok[i];
    q.val[i] = v; q.ok[i] = near(v, DQ[i].ans, i === 3 ? 0.015 : 0.15);
    inp.classList.remove('ok', 'bad');
    if (q.ok[i]) { inp.classList.add('ok'); if (!was) { Sound.success(); parts.burst(PHONE ? 240 : 160 + i * 120, PHONE ? 200 + i * 80 : 200, { count: 10, speed: 110, size: 2.8, colors: ['#14a058', '#8b5cf6', '#ffb400'] }); } }
    else if (!isNaN(v) && inp.value.length >= 2) inp.classList.add('bad');
  }
  DQ.forEach((q, i) => $(q.id).addEventListener('input', () => dqEval(i)));
  const JAR = PHONE ? { x: QA.x + 12, y: QA.y + 36, w: 140, h: 200, gap: 12 } : { x: QA.x + 14, y: QA.y + 40, w: 156, h: 190, gap: 12 };
  function drawCalc(t) {
    const q = S.dr;
    T(14, 26, '📝 부피 11.2 L의 기체 3가지와 분자 3.01×10²²개', PHONE ? 13.5 : 17, INK, 'left', 800);
    panel(QA.x, QA.y, QA.w, QA.h, 14);
    ['o2', 'co2', 'n2'].forEach((k, i) => {
      const g = GAS[k], x = JAR.x + i * (JAR.w + JAR.gap), y = JAR.y, ok = q.ok[i];
      q.fill[i] = SciSim.approach(q.fill[i], ok ? 1 : 0, 1 / 60, 7);
      D.shadow(() => { D.roundRect(x, y, JAR.w, JAR.h, 16); ctx.fillStyle = C.mix(g.c, '#ffffff', 0.85); ctx.fill(); }, { blur: 6, y: 2 });
      ctx.strokeStyle = ok ? '#14a058' : '#cdbdf5'; ctx.lineWidth = ok ? 3.4 : 2; D.roundRect(x, y, JAR.w, JAR.h, 16); ctx.stroke();
      T(x + JAR.w / 2, y + 24, g.name + ' ' + g.f, 14.5, INK, 'center', 800);
      T(x + JAR.w / 2, y + 44, '11.2 L = 0.5 mol', 13.5, '#b45309', 'center', 800);
      ctx.save(); D.roundRect(x + 6, y + 54, JAR.w - 12, JAR.h - 116, 10); ctx.clip();
      HEX.slice(0, 10).forEach((p, j) => molecule(k, x + JAR.w / 2 + p[0] * (PHONE ? 20 : 22), y + 54 + (JAR.h - 116) / 2 + p[1] * (PHONE ? 20 : 22), 1.0, rotOf(j) + (RM ? 0 : Math.sin(t + j) * 0.12)));
      ctx.restore();
      T(x + JAR.w / 2, y + JAR.h - 40, 'M = ' + g.M + ' g/mol', 13.5, MUTED, 'center', 800);
      T(x + JAR.w / 2, y + JAR.h - 14, ok ? DQ[i].ans + ' g' : '? g', 20, ok ? '#14803f' : '#9aa5b6', 'center', 800);
    });
    // 분자 3.01×10²² → 부피
    const px = PHONE ? QA.x + 12 : QA.x + 14 + 3 * (JAR.w + JAR.gap) + 6, py = PHONE ? QA.y + 252 : QA.y + 40, pw = PHONE ? QA.w - 24 : QA.x + QA.w - px - 14, ph = PHONE ? 176 : 190, ok = q.ok[3];
    q.fill[3] = SciSim.approach(q.fill[3], ok ? 1 : 0, 1 / 60, 7);
    D.shadow(() => { D.roundRect(px, py, pw, ph, 16); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: 6, y: 2 });
    ctx.strokeStyle = ok ? '#14a058' : '#cdbdf5'; ctx.lineWidth = ok ? 3.4 : 2; D.roundRect(px, py, pw, ph, 16); ctx.stroke();
    T(px + pw / 2, py + 26, '분자 ' + sci(Q3N, 3) + '개', 15, '#5b21b6', 'center', 800);
    T(px + pw / 2, py + 50, 'n = N / 6.02×10²³', 13.5, MUTED, 'center', 800);
    T(px + pw / 2, py + 74, ok ? '= ' + fm(Q3n, 3) + ' mol' : '= ? mol', 16, ok ? INK : '#9aa5b6', 'center', 800);
    T(px + pw / 2, py + 108, 'V = n × 22.4', 13.5, MUTED, 'center', 800);
    T(px + pw / 2, py + 140, ok ? '= ' + fm(Q3V, 2) + ' L' : '= ? L', 22, ok ? '#14803f' : '#9aa5b6', 'center', 800);
    if (ok) { ctx.fillStyle = 'rgba(91,180,245,.6)'; ctx.fillRect(px + pw / 2 - 40, py + ph - 14 - 10 * q.fill[3], 80, 10 * q.fill[3]); }
    if (q.shake > 0) { ctx.fillStyle = 'rgba(226,70,75,' + q.shake * 0.25 + ')'; D.roundRect(QA.x, QA.y, QA.w, QA.h, 14); ctx.fill(); }
    panel(QB.x, QB.y, QB.w, QB.h, 14);
    T(QB.x + 16, QB.y + 28, '📐 같은 부피 → 같은 몰수 → 질량은 몰질량에 비례', 14.5, INK, 'left', 800);
    textBlock(QB.x + 16, QB.y + 58, QB.w - 32, '부피 11.2 L는 0.5 mol이에요. 질량 w = n × M이라서 같은 부피라도 몰질량이 큰 기체가 더 무거워요. 분자 수는 n = N / 6.02×10²³으로 몰수를 구한 뒤 V = n × 22.4로 부피를 구해요.', 14, MUTED, 19, 700);
    T(QB.x + 16, QB.y + QB.h - 16, '맞힌 칸 ' + q.ok.filter(Boolean).length + ' / 4', 14.5, q.ok.every(Boolean) ? '#14803f' : INK, 'left', 800);
  }
  $('#drView').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; Sound.click(); S.sub.drill = b.dataset.v; S.fade = 0.5; updateCtl(); });

  /* ================= ④ 종합 도전 ================= */
  const FA = PHONE ? { x: 8, y: 52, w: 464, h: 440 } : { x: 12, y: 52, w: 500, h: 336 };
  const FR = PHONE ? { x: 8, y: 500, w: 464, h: 250 } : { x: 524, y: 52, w: 264, h: 336 };
  const FB = PHONE ? { x: 8, y: 500, w: 464, h: 250 } : { x: 12, y: 396, w: 776, h: 154 };
  const fnV = () => iceV(S.fn.T);
  function drawDry(t) {
    const fn = S.fn, vt = fnV();
    T(14, 26, '🧊 드라이아이스가 모두 기체가 되면?', PHONE ? 15 : 17, INK, 'left', 800);
    panel(FA.x, FA.y, FA.w, FA.h, 14);
    const cx = FA.x + FA.w / 2, by = FA.y + FA.h - 28, fw = PHONE ? 150 : 130, fh = PHONE ? 130 : 112;
    // 플라스크
    D.flask(cx, by, fw, fh, { level: 0, glass: '#8fa3bd', t });
    const neckTop = by - fh;
    // 드라이아이스 조각 (남은 질량에 비례)
    const left = 1 - clamp(fn.p, 0, 1), sz = (PHONE ? 38 : 32) * Math.cbrt(Math.max(left, 0));
    if (sz > 1.5) { ctx.save(); ctx.translate(cx, by - 18 - sz / 2); ctx.rotate(0.08); const g = ctx.createLinearGradient(-sz / 2, -sz / 2, sz / 2, sz / 2); g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#bfd8ea'); ctx.fillStyle = g; ctx.strokeStyle = '#8fb3cf'; ctx.lineWidth = 2; D.roundRect(-sz / 2 - 6, -sz / 2, sz + 12, sz, 5); ctx.fill(); ctx.stroke(); ctx.restore(); }
    // 풍선: 부피가 커질수록 반지름이 커져요 (r ∝ ∛V)
    const vcur = fn.dry.vd, kk = PHONE ? 31 : 29, r = kk * Math.cbrt(Math.max(vcur, 0.02));
    ctx.fillStyle = '#9aa5b6'; D.roundRect(cx - 14, neckTop - 8, 28, 12, 3); ctx.fill();
    if (vcur > 0.02) drawBalloon(cx, neckTop - 8 - r * 1.05, r, '#f9a8d4', '', t);
    const lbl = fn.okT[fn.T] ? fm(vt, 2) + ' L' : '? L';
    if (vcur > 0.5) T(cx, neckTop - 8 - r * 1.05 + 6, lbl, 18, '#fff', 'center', 800, { stroke: 'rgba(40,40,70,.5)', strokeWidth: 3 });
    T(FA.x + 16, FA.y + 28, '드라이아이스 ' + ICE.w + ' g (CO₂)', 14.5, INK, 'left', 800);
    T(FA.x + 16, FA.y + 50, '몰질량 44 g/mol, ' + fn.T + ' °C, 1기압', 13.5, '#b45309', 'left', 800);
    if (fn.run || fn.p > 0) T(FA.x + FA.w - 16, FA.y + 28, '승화 ' + Math.round(fn.p * 100) + ' %', 14.5, '#0e7490', 'right', 800);
    if (fn.shake > 0) { ctx.fillStyle = 'rgba(226,70,75,' + fn.shake * 0.25 + ')'; D.roundRect(FA.x, FA.y, FA.w, FA.h, 14); ctx.fill(); }
    // 결과 판
    const rr = PHONE ? { x: FR.x, y: FR.y + 0, w: FR.w, h: FR.h } : FR;
    if (!PHONE) {
      panel(rr.x, rr.y, rr.w, rr.h, 14);
      T(rr.x + 16, rr.y + 28, '📋 온도별 1 mol의 부피', 14.5, INK, 'left', 800);
      [0, 25].forEach((tt, i) => {
        const y = rr.y + 60 + i * 120, ok = fn.okT[tt];
        D.roundRect(rr.x + 10, y - 8, rr.w - 20, 106, 12); ctx.fillStyle = fn.T === tt ? 'rgba(139,92,246,.1)' : '#f7f8fc'; ctx.fill();
        T(rr.x + 20, y + 14, tt + ' °C: ' + vmAt(tt) + ' L/mol', 14.5, INK, 'left', 800);
        T(rr.x + 20, y + 40, 'n = 22 / 44 = ' + fm(ICE.n, 2) + ' mol', 13.5, MUTED, 'left', 800);
        T(rr.x + 20, y + 64, 'V = ' + fm(ICE.n, 2) + ' × ' + vmAt(tt), 13.5, MUTED, 'left', 800);
        T(rr.x + 20, y + 90, ok ? '= ' + fm(iceV(tt), 2) + ' L' + (tt === 25 ? ' ≈ ' + fm(iceV(tt), 1) + ' L' : '') : '= ? L', 17, ok ? '#14803f' : '#9aa5b6', 'left', 800);
      });
    }
    panel(FB.x, FB.y, FB.w, FB.h, 14);
    T(FB.x + 16, FB.y + 28, '🧊 → 💨 고체 CO₂가 기체가 되면 부피가 엄청 커져요', 14.5, INK, 'left', 800);
    textBlock(FB.x + 16, FB.y + 58, FB.w - 32, '드라이아이스 22 g = 0.5 mol이에요. 기체의 부피 V = n × 1 mol의 부피예요. 온도가 높을수록 1 mol의 부피(22.4 L → 24.5 L)가 커져서 부피도 커져요.', 14, MUTED, 19, 700);
    if (PHONE) {
      [0, 25].forEach((tt, i) => { const y = FB.y + 134 + i * 52; T(FB.x + 16, y, tt + ' °C: 0.5 × ' + vmAt(tt) + ' = ' + (fn.okT[tt] ? fm(iceV(tt), 2) + ' L' : '? L'), 14.5, fn.okT[tt] ? '#14803f' : INK, 'left', 800); });
    }
  }
  function drawDens(t) {
    const fn = S.fn;
    T(14, 26, '🕯️ 이산화 탄소는 아래로 깔려요', PHONE ? 15 : 17, INK, 'left', 800);
    panel(FA.x, FA.y, FA.w, PHONE ? 330 : FA.h, 14);
    const H = PHONE ? 330 : FA.h;
    const tx = FA.x + (PHONE ? 60 : 90), tw = FA.w - (PHONE ? 120 : 180), ty = FA.y + 70, th = H - 100, tb = ty + th;
    // 수조(유리 상자)
    ctx.fillStyle = '#f4f9ff'; D.roundRect(tx, ty, tw, th, 8); ctx.fill();
    const lv = clamp(fn.level, 0, 1), top = tb - th * lv;
    // 촛불 (불꽃 높이가 이산화 탄소 층 아래면 꺼져요)
    const ccx = tx + tw / 2, chh = 62, cb = tb - 6, ctop = cb - chh, flameBase = ctop - 4, flameTop = flameBase - 26;
    ctx.fillStyle = '#fff6dd'; ctx.strokeStyle = '#d6b678'; ctx.lineWidth = 2; D.roundRect(ccx - 13, ctop, 26, chh, 4); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#394258'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(ccx, ctop); ctx.lineTo(ccx, flameBase); ctx.stroke();
    const covered = top <= flameTop - 2;
    if (covered && fn.flame > 0.02) fn.flame = Math.max(0, fn.flame - 1 / 60 * 3);
    if (!covered && fn.flame < 1) fn.flame = Math.min(1, fn.flame + 1 / 60 * 4);
    if (fn.flame > 0.05) D.flame(ccx, flameBase, 28 * fn.flame, t);
    else if (!RM && lv > 0.003) { for (let q = 0; q < 2; q++) { const ph = (t * 0.7 + q * 0.5) % 1; ctx.fillStyle = 'rgba(120,120,130,' + (0.4 * (1 - ph)) + ')'; ctx.beginPath(); ctx.arc(ccx + Math.sin(ph * 6 + q) * 4, flameBase - ph * 40, 4 + ph * 5, 0, TAU); ctx.fill(); } }
    // 이산화 탄소 층 (촛불 위에 덮여요)
    if (lv > 0.003) {
      ctx.save(); D.roundRect(tx, ty, tw, th, 8); ctx.clip();
      const g = ctx.createLinearGradient(0, top, 0, tb); g.addColorStop(0, 'rgba(160,140,230,.45)'); g.addColorStop(1, 'rgba(130,110,215,.7)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(tx, tb);
      for (let i = 0; i <= 24; i++) ctx.lineTo(tx + tw * i / 24, top + (RM ? 0 : Math.sin(t * 2.4 + i * 0.7) * 1.8));
      ctx.lineTo(tx + tw, tb); ctx.closePath(); ctx.fill(); ctx.restore();
    }
    ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 3.5; D.roundRect(tx, ty, tw, th, 8); ctx.stroke();
    // 병에서 붓기
    const bx = tx + tw - 10, by2 = ty - 36;
    ctx.save(); ctx.translate(bx + 22, by2); ctx.rotate(fn.pour > 0.02 ? -0.7 : -0.2); ctx.fillStyle = '#e9d5ff'; ctx.strokeStyle = '#a78bfa'; ctx.lineWidth = 2.4; D.roundRect(-22, -22, 44, 56, 8); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#a78bfa'; D.roundRect(-9, -32, 18, 12, 3); ctx.fill(); T(0, 12, 'CO₂', 13, '#5b21b6', 'center', 800); ctx.restore();
    T(tx + tw / 2, ty - 14, covered ? '불꽃이 이산화 탄소에 덮였어요 → 꺼져요' : lv > 0.003 ? '이산화 탄소가 바닥부터 차올라요' : '촛불이 타고 있어요', 13.5, covered ? '#b4231f' : MUTED, 'center', 800);
    T(tx - 10, tb - th * lv + 4, lv > 0.003 ? 'CO₂ 층' : '', 13, '#5b21b6', 'right', 800);
    // 밀도 막대
    const rx = FR.x, ry = PHONE ? FA.y + 338 : FR.y, rw = FR.w, rh = PHONE ? 168 : FR.h;
    panel(rx, ry, rw, rh, 14);
    T(rx + 16, ry + 28, '기체의 밀도 = M / 22.4 (g/L)', 14, INK, 'left', 800);
    const items = [['H₂', 2, '#60a5fa'], ['공기', AIR_M, '#94a3b8'], ['CO₂', 44, '#a78bfa']];
    items.forEach((it, i) => {
      const y = ry + 52 + i * (PHONE ? 32 : 56), d = dens(it[1]), bw = rw - 100, bl = rx + 56;
      T(rx + 14, y + 16, it[0], 13.5, INK, 'left', 800);
      D.roundRect(bl, y + 2, bw, 20, 7); ctx.fillStyle = '#eef1f7'; ctx.fill();
      ctx.save(); D.roundRect(bl, y + 2, bw, 20, 7); ctx.clip(); ctx.fillStyle = it[2]; ctx.fillRect(bl, y + 2, bw * clamp(d / 2.2, 0, 1), 20); ctx.restore();
      T(bl + Math.min(bw * clamp(d / 2.2, 0, 1) + 6, bw - 40), y + 17, fd(d), 13, INK, 'left', 800);
      if (!PHONE) T(bl, y + 40, 'M = ' + it[1] + (it[0] === '공기' ? ' (평균)' : ''), 12.5, MUTED, 'left', 700);
    });
    T(rx + rw - 14, ry + rh - 10, '막대 끝 = 2.2 g/L', 12.5, MUTED, 'right', 700);
    if (!PHONE) {
      panel(FB.x, FB.y, FB.w, FB.h, 14);
      T(FB.x + 16, FB.y + 28, '🔎 CO₂가 아래로 깔리는 까닭', 14.5, INK, 'left', 800);
      textBlock(FB.x + 16, FB.y + 58, FB.w - 32, 'CO₂의 밀도(' + fd(dens(44)) + ' g/L)가 공기(' + fd(dens(AIR_M)) + ' g/L)보다 커서 아래로 가라앉아요. 같은 온도와 압력에서 기체의 밀도는 몰질량 M에 비례해요. 그래서 이산화 탄소 소화기는 불을 덮어 꺼요.', 14, MUTED, 19, 700);
    } else {
      panel(FB.x, FA.y + 514, FB.w, 184, 14);
      textBlock(FB.x + 16, FA.y + 546, FB.w - 32, 'CO₂의 밀도(' + fd(dens(44)) + ' g/L)가 공기(' + fd(dens(AIR_M)) + ' g/L)보다 커서 아래로 가라앉아요. 같은 온도와 압력에서 기체의 밀도는 몰질량 M에 비례해요.', 14, MUTED, 19, 700);
    }
  }
  function stepFinal(dt) {
    const fn = S.fn;
    if (fn.run) { fn.p = Math.min(1, fn.p + dt / 4.2); if (fn.p >= 1) { fn.run = false; Sound.click(); updateCtl(); } if (!RM && fn.p < 1 && Math.random() < dt * 24) parts.emit({ x: (PHONE ? FA.x + FA.w / 2 : FA.x + FA.w / 2) + (Math.random() - 0.5) * 30, y: FA.y + FA.h - 60, vx: (Math.random() - 0.5) * 30, vy: -25 - Math.random() * 20, life: 1.4, size: 9, color: '#dbeafe', shape: 'smoke', gravity: -4 }); }
    fn.dry.vd = SciSim.approach(fn.dry.vd, fn.p * fnV(), dt, 6);
    fn.level = SciSim.approach(fn.level, fn.levelT, dt, 2.6);
    fn.pour = SciSim.approach(fn.pour || 0, Math.abs(fn.level - fn.levelT) > 0.01 ? 1 : 0, dt, 8);
    if (Math.abs(fn.level - fn.levelT) > 0.01 && !RM && Math.random() < dt * 40) parts.emit({ x: FA.x + FA.w - (PHONE ? 78 : 118) + Math.random() * 8, y: FA.y + 70, vx: -10 - Math.random() * 12, vy: 40 + Math.random() * 30, life: 1.0, size: 6, color: '#c4b5fd', shape: 'smoke', gravity: 90 });
    fn.shake = Math.max(0, fn.shake - dt);
  }
  function fnReset() { const fn = S.fn; fn.run = false; fn.p = 0; updateCtl(); }
  $('#fnView').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; Sound.click(); S.sub.final = b.dataset.v; S.fade = 0.5; updateCtl(); });
  $('#fnT').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; Sound.click(); S.fn.T = +b.dataset.v; S.fn.run = false; S.fn.p = 0; $('#fnV').value = ''; $('#fnV').classList.remove('ok', 'bad'); updateCtl(); });
  $('#bSub').addEventListener('click', () => { if (S.fn.run) return; Sound.click(); S.fn.p = 0; S.fn.run = true; updateCtl(); });
  $('#bSubR').addEventListener('click', () => { Sound.click(); fnReset(); });
  $('#bPour').addEventListener('click', () => { Sound.click(); S.fn.levelT = clamp(S.fn.levelT + 0.2, 0, 1); });
  $('#bPourR').addEventListener('click', () => { Sound.click(); S.fn.levelT = 0; });
  function fnVEval() {
    const fn = S.fn, v = parseNum($('#fnV').value), inp = $('#fnV');
    inp.classList.remove('ok', 'bad');
    if (isNaN(v)) return null;
    if (near(v, iceV(fn.T), 0.06)) { inp.classList.add('ok'); if (!fn.okT[fn.T]) { fn.okT[fn.T] = true; Sound.success(); parts.burst(PHONE ? 240 : 262, PHONE ? 160 : 140, { count: 18, speed: 150, size: 3.2, colors: ['#ffb400', '#14a058', '#8b5cf6'] }); updateCtl(); } return true; }
    return false;
  }
  $('#fnV').addEventListener('input', () => { fnVEval(); });

  /* ---------- 입력 ---------- */
  SciSim.pointer(view, {
    down(p) {
      if (S.mode === 'hub') { const i = hubHit(p); if (i >= 0) { S.hb.sel = i; Sound.click(); updateCtl(); } return false; }
      if (S.mode === 'drill' && S.sub.drill === 'q1') { q1Tap(p); return false; }
      return false;
    },
    hover(p) { if (S.mode === 'hub') return hubHit(p) >= 0 ? 'pointer' : 'default'; return S.mode === 'drill' && S.sub.drill === 'q1' ? 'pointer' : 'default'; },
  });

  /* ---------- 읽음 칸 ---------- */
  let rlast = '';
  function readouts() {
    let a, b, c, L1, L2, L3;
    if (S.mode === 'balloon') {
      if (S.sub.balloon === 'bal') { L1 = '풍선 부피 (H₂ · O₂ · CO₂)'; a = f1(S.bw.v.h2) + ' · ' + f1(S.bw.v.o2) + ' · ' + f1(S.bw.v.co2) + ' L'; L2 = '분자 수'; b = bwEqual() ? '모두 ' + sci(S.bw.v.h2 / V0 * NA, 4) + '개' : '서로 달라요'; L3 = '1 mol의 부피'; c = '22.4 L (0 °C)'; }
      else { const vm = vmAt(S.bw.T); L1 = '온도'; a = S.bw.T + ' °C'; L2 = '1 mol의 부피'; b = f1(vm) + ' L'; L3 = '분자 수'; c = sci(NA, 3) + '개 (그대로)'; }
    } else if (S.mode === 'hub') {
      const h = S.hb, v = hubVals();
      L1 = GAS[h.gas].f + ' ' + fm(h.m) + ' g'; a = isNaN(v.n) ? '몰수 ?' : fm(v.n, 4) + ' mol';
      L2 = '기체 부피'; b = isNaN(v.V) ? '?' : (v.V >= 1000 ? sci(v.V, 3) : fm(v.V, 2)) + ' L'; L3 = '입자 수'; c = isNaN(v.N) ? '?' : sci(v.N) + '개';
    } else if (S.mode === 'drill') {
      if (S.sub.drill === 'q1') { L1 = '예측한 순서'; a = S.dr.pred.length ? S.dr.pred.map((k) => GAS[k].f).join(' > ') : '아직 없어요'; L2 = '계산으로 확인'; b = S.dr.revealed ? (q1OK() ? '예측이 맞아요' : '예측과 달라요') : '아직'; L3 = '같은 질량'; c = '8 g'; }
      else { L1 = '맞힌 칸'; a = S.dr.ok.filter(Boolean).length + ' / 4'; L2 = '11.2 L의 몰수'; b = '0.5 mol'; L3 = '1 mol의 부피'; c = '22.4 L'; }
    } else {
      const fn = S.fn;
      if (S.sub.final === 'dry') { L1 = '드라이아이스'; a = '22 g = ' + fm(ICE.n, 2) + ' mol'; L2 = fn.T + ' °C에서 1 mol'; b = vmAt(fn.T) + ' L'; L3 = '기체 부피'; c = fn.okT[fn.T] ? fm(iceV(fn.T), 2) + ' L' : '?'; }
      else { L1 = 'CO₂ 밀도'; a = fd(dens(44)) + ' g/L'; L2 = '공기 밀도'; b = fd(dens(AIR_M)) + ' g/L'; L3 = 'CO₂ 층 높이'; c = Math.round(S.fn.level * 100) + ' %'; }
    }
    const key = [L1, a, L2, b, L3, c].join('|');
    if (key === rlast) return; rlast = key;
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
  }

  /* ================= 미션 ================= */
  const levels = [
    {
      title: '기체 1몰: 같은 부피, 같은 분자 수', short: '기체 1몰', icon: '🎈', phase: '관찰',
      intro: '<p class="si-q">❓ 탐구 질문: 분자의 크기와 질량이 모두 다른데, 왜 같은 부피 속 기체 분자 수는 같을까?</p>' +
        '<div class="si-link">🔗 <b>중학교에서</b> 기체 반응에서 기체의 부피비가 반응식의 계수비(= 분자 수의 비)와 같다는 것을 배웠어요. 이제 이것을 <b>같은 온도와 압력에서 같은 부피의 기체는 종류에 관계없이 같은 수의 분자</b>가 들어 있다는 <b>아보가드로 법칙</b>으로 일반화해 봐요.</div>' +
        '<p>수소 · 산소 · 이산화 탄소 풍선의 부피를 같게 맞추어 분자 수를 비교하고, 온도에 따라 기체 <b>1 mol의 부피</b>가 어떻게 달라지는지 살펴봐요.</p>',
      features: ['balloon'],
      setup() { S.gate = ''; S.sub.balloon = 'bal'; S.bw.v = { h2: 11.2, o2: 5.6, co2: 16.8 }; S.bw.sel = 'o2'; S.bw.T = 0; S.bw.got = {}; setScene('balloon'); },
      recap: '같은 온도와 압력에서 같은 부피의 기체에는 종류와 관계없이 같은 수의 분자가 들어 있어요. 0 °C, 1기압에서 기체 1 mol의 부피는 22.4 L이고, 25 °C에서는 24.5 L예요.',
      summary: '<ul><li><b>아보가드로 법칙</b>: 같은 온도 · 압력에서 같은 부피의 기체는 종류에 관계없이 같은 수의 분자를 가져요. (중3의 기체 반응 법칙: 부피비 = 분자 수의 비)</li><li>기체의 부피는 분자의 크기가 아니라 <b>분자 사이의 거리</b>가 정해요.</li><li>기체 <b>1 mol</b>의 부피: 0 °C, 1기압에서 <b>22.4 L</b>, 25 °C, 1기압에서 <b>24.5 L</b> (온도가 높을수록 커요)</li><li>11.2 L = 0.5 mol = 분자 3.01×10²³개</li></ul>',
      missions: [
        {
          title: '풍선 부피 맞추기',
          goal: '수소 풍선은 <b>11.2 L</b>예요. <b>산소 풍선과 이산화 탄소 풍선</b>도 부피를 <b>11.2 L</b>로 맞추어 분자 수가 같은지 확인하세요.',
          hint: '위에서 풍선을 고르고 슬라이더로 부피를 바꿔요. 11.2 L는 슬라이더의 112칸이에요. ±0.1, ±1 단추로 다듬어요.',
          setup() { S.gate = ''; S.sub.balloon = 'bal'; S.bw.sel = 'o2'; setScene('balloon'); },
          check: () => bwEqual() && Math.abs(S.bw.v.h2 - 11.2) < 0.05, hold: 0.8,
          status: () => 'O₂ ' + mark(Math.abs(S.bw.v.o2 - 11.2) <= 0.05) + ' ' + f1(S.bw.v.o2) + ' L &nbsp; CO₂ ' + mark(Math.abs(S.bw.v.co2 - 11.2) <= 0.05) + ' ' + f1(S.bw.v.co2) + ' L',
          explain: '세 풍선의 부피가 모두 <b>11.2 L</b>이면 분자 수는 모두 <b>0.5 mol = 3.01×10²³개</b>로 같아요. 분자의 종류, 크기, 질량이 달라도 같은 온도 · 압력에서 같은 부피에는 같은 수의 분자가 들어 있어요(아보가드로 법칙).',
        },
        {
          title: '온도를 올려 1 mol의 부피 읽기',
          goal: '<b>온도</b>를 <b>25 °C</b>로 올려 기체 1 mol의 부피를 읽어 보세요.',
          hint: '화면 위쪽에서 "온도와 부피"를 고르고 슬라이더나 25 °C 단추를 눌러요. 0 °C에서는 22.4 L였어요.',
          setup() { S.gate = ''; S.sub.balloon = 'temp'; S.bw.T = 0; S.bw.got = {}; setScene('balloon'); },
          check: () => S.bw.T === 25 && S.bw.Td > 24.9, hold: 0.8,
          status: () => '온도 ' + S.bw.T + ' °C &nbsp; 1 mol = ' + f1(vmAt(S.bw.T)) + ' L &nbsp; ' + mark(S.bw.T === 25),
          explain: '25 °C, 1기압에서 기체 1 mol의 부피는 <b>' + VM25 + ' L</b>예요. 0 °C의 22.4 L보다 커요. 온도가 높으면 분자가 빨리 움직여 분자 사이 거리가 멀어지지만 분자 수는 6.02×10²³개로 그대로예요.',
        },
        {
          type: 'quiz', title: '같은 부피에 같은 분자 수인 까닭',
          goal: '분자의 크기가 서로 다른데도 같은 부피 속 기체 분자 수가 같은 까닭은?',
          setup() { S.gate = ''; S.sub.balloon = 'bal'; setScene('balloon'); },
          choices: ['큰 분자는 부피를 많이 차지하므로 적게 들어 있어야 해요', '기체의 부피는 분자 크기보다 분자 사이의 거리가 정해서, 종류와 관계없이 같은 부피에 같은 수가 들어 있어요', '모든 기체 분자의 질량이 같기 때문이에요', '기체는 종류마다 1 mol의 부피가 다르기 때문이에요'],
          answer: 1,
          feedback: ['기체에서는 분자 자체의 부피보다 분자 사이 빈 공간이 훨씬 커요. 크기 차이는 거의 영향을 주지 않아요.', '', '기체 분자의 질량은 종류마다 달라요. 그래도 분자 수는 같아요.', '같은 온도와 압력에서는 모든 기체의 1 mol 부피가 같아요(0 °C, 1기압에서 22.4 L).'],
          explain: '기체의 부피는 <b>분자 사이의 거리</b>가 거의 다 정해요. 같은 온도 · 압력에서는 분자 사이 거리가 같아서, 분자 크기와 질량이 달라도 같은 부피에 같은 수의 분자가 들어 있어요.',
        },
      ],
    },
    {
      title: '환산 허브: 몰을 가운데에 두기', short: '환산 허브', icon: '🔄', phase: '모형',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 기체 1 mol의 부피를 알았고, <b>앞 차시에서</b> 질량 ÷ 몰질량 = 몰수, 입자 수 ÷ 6.02×10²³ = 몰수임을 배웠어요. 이제 질량 · 입자 수 · 기체 부피를 <b>몰을 중심으로</b> 이어 봐요.</div>' +
        '<p>가운데 <b>몰</b>에서 세 가지가 이어져요. <b>질량 ÷ 몰질량 = 몰</b>, <b>기체 부피 ÷ 22.4 L/mol = 몰</b>, <b>입자 수 ÷ 6.02×10²³ = 몰</b>. 화살표마다 곱하기 · 나누기와 숫자를 골라요. (용액은 단원 36에서 이어져요.)</p>',
      features: ['hub'],
      setup() { S.gate = ''; S.hb.gas = 'co2'; S.hb.m = 11; S.hb.op = [null, null, null]; S.hb.sel = 0; setScene('hub'); },
      recap: '질량, 기체 부피, 입자 수는 모두 몰을 거쳐 서로 바뀌어요. 몰은 질량 · 부피 · 입자 수를 이어 주는 공통 단위예요.',
      summary: '<ul><li>질량 ⇄ 몰: 몰수 = 질량 ÷ 몰질량 (질량 = 몰수 × 몰질량)</li><li>기체 부피 ⇄ 몰: 몰수 = 부피 ÷ 22.4 L/mol (0 °C, 1기압) (25 °C는 ÷ 24.5)</li><li>입자 수 ⇄ 몰: 몰수 = 입자 수 ÷ 6.02×10²³</li><li>예) CO<sub>2</sub> 11 g = 0.25 mol = <b>5.6 L</b> = 분자 <b>1.505×10²³개</b></li><li>용액의 부피 × 몰 농도 = 몰수 (단원 36)</li></ul>',
      missions: [
        {
          title: 'CO₂ 11 g의 부피와 입자 수 읽기',
          goal: '허브에 <b>CO₂ 11 g</b>이 올려져 있어요. 화살표 <b>① ② ③</b>의 곱하기 · 나누기를 알맞게 골라 <b>부피와 입자 수</b>를 읽으세요.',
          hint: '① 질량을 몰로: ÷ 44(몰질량). ② 몰을 부피로: × 22.4. ③ 몰을 입자 수로: × 6.02×10²³이에요. 그림의 화살표 이름표를 눌러 골라요.',
          setup() { S.gate = 'hubfix'; S.hb.gas = 'co2'; S.hb.m = 11; S.hb.op = [null, null, null]; S.hb.sel = 0; setScene('hub'); },
          check: () => hubOK(), hold: 0.8,
          status: () => EDGE_NAME.map((n, i) => mark(opSame(S.hb.op[i], OK_OP[i])) + ' ' + n.slice(0, 1)).join(' &nbsp; '),
          explain: 'CO₂ 11 g ÷ 44 g/mol = <b>0.25 mol</b>이에요. 부피는 0.25 × 22.4 = <b>5.6 L</b>, 분자 수는 0.25 × 6.02×10²³ = <b>1.505×10²³개</b>예요. 몰을 거치면 질량에서 부피와 입자 수를 모두 구할 수 있어요.',
        },
        {
          type: 'quiz', title: '질량에서 부피로 갈 때 몰을 거치는 까닭',
          goal: '질량에서 기체의 부피를 구할 때 <b>몰을 거치면</b> 편한 까닭은?',
          setup() { S.gate = ''; setScene('hub'); },
          choices: ['질량과 부피는 직접 곱하면 되기 때문이에요', '몰이 질량 · 부피 · 입자 수를 이어 주는 공통 단위이기 때문이에요', '몰수가 항상 1이기 때문이에요', '몰은 질량의 단위이기 때문이에요'],
          answer: 1,
          feedback: ['질량(g)과 부피(L)는 단위가 달라서 바로 바꿀 수 없어요. 몰이 다리가 돼요.', '', '몰수는 물질의 양에 따라 달라요.', '몰은 질량이 아니라 입자 수(물질의 양)의 단위예요.'],
          explain: '질량은 몰질량으로, 부피는 22.4 L/mol로, 입자 수는 6.02×10²³개/mol로 <b>몰과 연결</b>돼요. 그래서 어떤 양에서 출발해도 몰로 바꾼 다음 원하는 양으로 바꿀 수 있어요.',
        },
      ],
    },
    {
      title: '환산 연습: 질량 · 부피 · 분자 수', short: '환산 연습', icon: '📝', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 몰을 가운데에 두고 질량 · 부피 · 입자 수를 이었어요. 이제 <b>같은 질량, 같은 부피, 같은 분자 수</b>인 기체를 비교하며 연습해요.</div>' +
        '<p>먼저 같은 질량의 기체 3가지 중 부피가 가장 큰 것을 <b>예측</b>하고 <b>계산으로 확인</b>해요. 그다음 같은 부피의 기체 질량과, 분자 수로 주어진 기체의 부피를 구해요.</p>',
      features: ['drill'],
      setup() { S.gate = ''; S.sub.drill = 'q1'; S.dr.pred = []; S.dr.revealed = false; S.dr.msg = ''; setScene('drill'); },
      recap: '같은 질량이면 몰질량이 작은 기체가 몰수도 부피도 커요. 같은 부피이면 몰수가 같아서 질량은 몰질량에 비례해요. 질량이 큰 기체가 부피도 큰 것은 아니에요.',
      summary: '<ul><li>같은 질량 8 g (0 °C, 1기압): H<sub>2</sub> 4 mol = <b>89.6 L</b> ≫ CH<sub>4</sub> 0.5 mol = <b>11.2 L</b> > O<sub>2</sub> 0.25 mol = <b>5.6 L</b></li><li>같은 부피 11.2 L = 0.5 mol: O<sub>2</sub> <b>16 g</b>, CO<sub>2</sub> <b>22 g</b>, N<sub>2</sub> <b>14 g</b> (질량 = 0.5 × 몰질량)</li><li>분자 3.01×10²²개 = 0.05 mol → <b>1.12 L</b></li></ul>',
      missions: [
        {
          title: '같은 질량의 기체, 부피 순서 예측하기', manual: true,
          goal: '<b>8 g</b>씩의 H₂, CH₄, O₂를 <b>부피가 큰 순서</b>대로 눌러 예측하고 <b>🔍 계산으로 확인</b>한 뒤 <b>✔ 확인하기</b>를 누르세요.',
          hint: '부피는 몰수에 비례해요. 몰수 = 8 ÷ 몰질량이므로 몰질량이 작을수록 몰수가 커요. 예측과 달라도 계산 결과를 보고 다시 예측해요.',
          setup() { S.gate = ''; S.sub.drill = 'q1'; S.dr.pred = []; S.dr.revealed = false; S.dr.msg = ''; setScene('drill'); },
          check() {
            const q = S.dr;
            if (q.pred.length < 3) return '세 카드를 부피가 큰 순서대로 모두 눌러 주세요.';
            if (!q.revealed) return '먼저 🔍 계산으로 확인을 눌러요.';
            if (!q1OK()) return '예측한 순서가 계산 결과와 달라요. 몰수 = 8 ÷ 몰질량을 보고 다시 예측해 보세요.';
            return true;
          },
          status: () => '예측 ' + S.dr.pred.length + ' / 3 &nbsp; 계산 확인 ' + mark(S.dr.revealed) + ' &nbsp; 순서 ' + mark(q1OK()),
          explain: '8 g의 몰수는 H₂ <b>4 mol</b>(89.6 L), CH₄ <b>0.5 mol</b>(11.2 L), O₂ <b>0.25 mol</b>(5.6 L)예요. 같은 질량에서는 <b>몰질량이 작을수록</b> 몰수와 부피가 커서 H₂ ≫ CH₄ > O₂예요.',
        },
        {
          title: '같은 부피의 질량 · 분자 수에서 부피', manual: true,
          goal: '부피 <b>11.2 L</b>인 O₂, CO₂, N₂의 <b>질량</b>과 분자 <b>3.01×10²²개</b>의 <b>부피</b>를 쓰고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '11.2 L ÷ 22.4 L/mol = 0.5 mol이에요. 질량 = 0.5 × 몰질량(O₂ 32, CO₂ 44, N₂ 28). 분자 수는 ÷ 6.02×10²³으로 몰수를 구한 뒤 × 22.4예요.',
          setup() { S.gate = ''; S.sub.drill = 'calc'; DQ.forEach((q) => { $(q.id).value = ''; $(q.id).classList.remove('ok', 'bad'); }); S.dr.ok = [false, false, false, false]; S.dr.val = [NaN, NaN, NaN, NaN]; setScene('drill'); },
          check() {
            const bad = S.dr.ok.map((o, i) => (o ? -1 : i)).filter((i) => i >= 0);
            if (!bad.length) return true;
            const i = bad[0], names = ['산소의 질량을', '이산화 탄소의 질량을', '질소의 질량을', '3.01×10²²개의 부피를'];
            return isNaN(S.dr.val[i]) ? names[i] + ' 써 주세요.' : names[i] + ' 다시 계산해 보세요. ' + (i < 3 ? '0.5 mol × 몰질량이에요.' : '3.01×10²² ÷ 6.02×10²³ = 0.05 mol이에요.');
          },
          status: () => 'O₂ ' + mark(S.dr.ok[0]) + ' CO₂ ' + mark(S.dr.ok[1]) + ' N₂ ' + mark(S.dr.ok[2]) + ' 부피 ' + mark(S.dr.ok[3]),
          explain: '11.2 L는 <b>0.5 mol</b>이에요. 질량은 O₂ 0.5 × 32 = <b>16 g</b>, CO₂ 0.5 × 44 = <b>22 g</b>, N₂ 0.5 × 28 = <b>14 g</b>이에요. 분자 3.01×10²²개는 0.05 mol이라서 부피는 0.05 × 22.4 = <b>1.12 L</b>예요.',
        },
        {
          type: 'quiz', title: '질량이 크면 부피도 클까?',
          goal: '같은 온도와 압력에서 "<b>질량이 가장 큰 기체가 부피도 가장 크다</b>"는 설명은?',
          setup() { S.gate = ''; setScene('drill'); },
          choices: ['항상 맞아요', '틀려요. 부피는 몰수에 비례하고, 같은 질량이면 몰질량이 작은 기체의 몰수가 커요', '틀려요. 부피는 질량과 아무 관계가 없어요', '맞아요. 부피는 질량에 비례해요'],
          answer: 1,
          feedback: ['같은 질량 8 g일 때 가장 가벼운 H₂의 부피(89.6 L)가 가장 컸어요.', '', '부피는 몰수에 비례하고, 몰수는 질량 ÷ 몰질량이라서 질량과 관계가 있어요. 몰질량도 함께 따져야 해요.', '질량이 같으면 몰질량에 따라 부피가 달라져요.'],
          explain: '기체의 부피는 <b>몰수</b>에 비례해요. 몰수는 질량 ÷ 몰질량이라서, 질량이 같다면 몰질량이 작은 기체의 부피가 더 커요. 8 g에서 H₂(89.6 L)가 O₂(5.6 L)보다 훨씬 커요.',
        },
      ],
    },
    {
      title: '종합 도전: 드라이아이스와 기체의 밀도', short: '종합 도전', icon: '🧊', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 질량 · 부피 · 분자 수를 몰로 바꿨어요. 이제 <b>생활 속 기체</b>에 적용해요.</div>' +
        '<p>드라이아이스 <b>22 g</b>이 모두 기체가 되면 부피는 얼마일까요? 온도에 따라 1 mol의 부피가 달라요. 또 이산화 탄소가 공기보다 <b>무거워</b> 아래로 깔리는 까닭을 기체의 <b>밀도 = M ÷ 22.4</b>로 설명해 봐요.</p>',
      features: ['final'],
      setup() { S.gate = ''; S.sub.final = 'dry'; S.fn.T = 25; S.fn.run = false; S.fn.p = 0; S.fn.okT = { 0: false, 25: false }; $('#fnV').value = ''; $('#fnV').classList.remove('ok', 'bad'); setScene('final'); },
      recap: '드라이아이스 22 g(0.5 mol)이 기체가 되면 0 °C에서 11.2 L, 25 °C에서 12.25 L ≈ 12.3 L예요. 기체의 밀도는 몰질량에 비례해서 CO₂는 공기보다 밀도가 커요.',
      summary: '<ul><li>드라이아이스 22 g = 0.5 mol → 기체 부피: 0 °C <b>11.2 L</b>, 25 °C <b>12.25 L ≈ 12.3 L</b></li><li>기체의 밀도 = M ÷ 22.4 (g/L, 0 °C, 1기압): CO<sub>2</sub> <b>' + fd(dens(44)) + '</b>, 공기(M ≈ 29) <b>' + fd(dens(AIR_M)) + '</b>, H<sub>2</sub> <b>' + fd(dens(2)) + '</b></li><li>CO<sub>2</sub>는 공기보다 밀도가 커서 아래로 깔려요. 이산화 탄소 소화기는 불을 덮어 꺼요.</li></ul>',
      missions: [
        {
          title: '25 °C에서 드라이아이스 22 g의 기체 부피', manual: true,
          goal: '<b>25 °C, 1기압</b>에서 드라이아이스 <b>22 g</b>이 모두 기체가 되면 부피는 몇 L일까요? 계산해서 쓰고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '22 g ÷ 44 g/mol = 0.5 mol이에요. 25 °C에서 1 mol은 24.5 L이므로 0.5 × 24.5를 계산해요. 💨 승화시키기로 풍선이 부푸는 모습도 볼 수 있어요.',
          setup() { S.gate = ''; S.sub.final = 'dry'; S.fn.T = 25; S.fn.run = false; S.fn.p = 0; S.fn.okT = { 0: false, 25: false }; $('#fnV').value = ''; $('#fnV').classList.remove('ok', 'bad'); setScene('final'); },
          check() {
            if (S.fn.T !== 25) return '온도를 25 °C로 맞춰 주세요.';
            const v = parseNum($('#fnV').value);
            if (isNaN(v)) return '부피를 L 단위의 숫자로 써 주세요.';
            if (near(v, iceV(25), 0.06)) return true;
            if (near(v, iceV(0), 0.06)) return '11.2 L는 0 °C일 때의 값이에요. 25 °C에서 1 mol은 24.5 L예요.';
            return '다시 계산해 보세요. 0.5 mol × 24.5 L/mol이에요.';
          },
          status: () => '온도 ' + S.fn.T + ' °C ' + mark(S.fn.T === 25) + ' &nbsp; 부피 ' + mark(S.fn.okT[25] && S.fn.T === 25),
          explain: '드라이아이스 22 g은 22 ÷ 44 = <b>0.5 mol</b>이에요. 25 °C에서 부피는 0.5 × 24.5 = <b>12.25 L ≈ 12.3 L</b>이고, 0 °C에서는 0.5 × 22.4 = <b>11.2 L</b>예요. 온도가 높을수록 부피가 커요.',
        },
        {
          title: '이산화 탄소의 밀도 구하기', manual: true,
          goal: '0 °C, 1기압에서 <b>CO₂ 기체의 밀도</b>(g/L)를 구해 쓰고 <b>✔ 확인하기</b>를 누르세요. 소수 둘째 자리까지 써요.',
          hint: '밀도 = 질량 ÷ 부피예요. CO₂ 1 mol의 질량은 44 g, 부피는 22.4 L이므로 44 ÷ 22.4예요. CO₂ 붓기로 촛불이 꺼지는 모습도 봐요.',
          setup() { S.gate = ''; S.sub.final = 'dens'; $('#fnD').value = ''; $('#fnD').classList.remove('ok', 'bad'); setScene('final'); },
          check() {
            const v = parseNum($('#fnD').value);
            if (isNaN(v)) return '밀도를 숫자로 써 주세요. (단위 g/L)';
            if (near(v, dens(44), 0.02)) return true;
            if (near(v, 44, 0.5)) return '44는 1 mol의 질량이에요. 1 L의 질량을 구하려면 22.4 L로 나눠야 해요.';
            return '다시 계산해 보세요. 44 g ÷ 22.4 L예요.';
          },
          status: () => (isNaN(parseNum($('#fnD').value)) ? '밀도를 써 주세요' : '쓴 값 ' + $('#fnD').value + ' g/L ' + mark(near(parseNum($('#fnD').value), dens(44), 0.02))),
          explain: 'CO₂의 밀도는 44 ÷ 22.4 = <b>' + fd(dens(44)) + ' g/L</b>이고, 공기(평균 M ≈ 29)는 29 ÷ 22.4 = <b>' + fd(dens(AIR_M)) + ' g/L</b>예요. CO₂가 더 커서 공기 아래로 깔려요. 그래서 촛불을 덮어 꺼요.',
        },
        {
          type: 'quiz', title: '기체의 밀도가 몰질량에 비례하는 까닭',
          goal: '같은 온도와 압력에서 기체의 <b>밀도가 몰질량 M에 비례</b>하는 까닭은?',
          setup() { S.gate = ''; S.sub.final = 'dens'; setScene('final'); },
          choices: ['기체 1 mol의 부피가 종류와 관계없이 같고, 1 mol의 질량이 M이기 때문이에요', '기체 분자의 크기가 M에 비례하기 때문이에요', '기체의 분자 수가 M에 비례하기 때문이에요', '온도가 M에 비례하기 때문이에요'],
          answer: 0,
          feedback: ['', '밀도를 정하는 것은 분자의 크기가 아니라 1 L 속 분자의 질량이에요.', '같은 부피에는 같은 수의 분자가 들어 있어요. 분자 수는 M과 관계없어요.', '비교할 때는 온도를 같게 해요. 온도는 M과 관계없어요.'],
          explain: '같은 온도 · 압력에서 1 mol의 부피는 <b>22.4 L</b>로 같고, 1 mol의 질량은 <b>M</b>이에요. 그래서 밀도 = M ÷ 22.4가 되어 M에 비례해요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hc-mole-convert', mount: '#game', badge: '환산 달인', homeHref: '../../index.html#hc',
    featureLabels: { balloon: '🎈 풍선 3개 · 1 mol의 부피', hub: '🔄 몰 환산 허브', drill: '📝 질량 · 부피 · 분자 수 연습', final: '🧊 드라이아이스 · 기체의 밀도' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  setScene(S.mode);
  function stepAll1(dt) {
    S.dr.shake = Math.max(0, S.dr.shake - dt);
    stepBalloon(dt); stepHub(dt); stepFinal(dt);
  }
  let lastFree = false, lastMode = '';
  SciSim.loop((dt, t) => {
    S.t = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.mode !== lastMode) { lastMode = S.mode; updateCtl(); }
    if (S.gate && game && game.phase !== 'active') { S.gate = ''; updateCtl(); }
    view.apply();
    stepAll1(dt);
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    if (S.mode === 'balloon') { if (S.sub.balloon === 'bal') drawBalloons(t); else drawTemp(t); }
    else if (S.mode === 'hub') drawHub(t);
    else if (S.mode === 'drill') { if (S.sub.drill === 'q1') drawQ1(t); else drawCalc(t); }
    else { if (S.sub.final === 'dry') drawDry(t); else drawDens(t); }
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(243,240,251,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, GAS, Q8, Q8ORDER, Q8SHOW, OPSET, OK_OP, HN, V0, VM25, ICE, get game() { return game; },
    setScene, bwSet, setT, hubVals, hubOK, edgeGeom, hubHit, cardQ, q1Tap, q1Reveal, q1OK, fnVEval, vmAt, iceV, dens, sci, fm,
    stepAll(sec) { const n = Math.ceil(sec / 0.02); for (let i = 0; i < n; i++) { S.t += 0.02; stepAll1(0.02); parts.update(0.02); } },
  };
})();
