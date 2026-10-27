/* =========================================================
   화학 Ⅱ. 물질의 구조와 성질 - 분자의 구조와 성질 [12화학02-04]
   ① 분석: 분자의 극성 (결합 쌍극자 화살표의 합 → 극성 / 무극성 분자)
   ② 실험: 물리적 성질 (물줄기 · 섞임 · 끓는점)
   ③ 분석: 화학적 성질 (이성질체 C₂H₆O · N≡N과 O=O)
   ④ 적용: 구조로 예측 (CCl₄ · CH₃OH · I₂ · NH₃ · CO₂ · 비누)
   ※ 분자 간 힘은 '극성이 크면 분자 사이 인력이 크다' 수준의 정성적 설명만 (수소 결합은 이름만)
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, lerp, Sound, toast } = SciSim;
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
  const mark = (b) => (b ? '✅' : '⬜');
  const fs = (n) => Math.round(n * FS);
  const smooth = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
  const rnd = (a, b) => a + Math.random() * (b - a);
  let game = null;
  let F = new Set();
  let DT = 0.016, NOW = performance.now() / 1000;
  const TY = PHONE ? 80 : 62;

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
  const ELC = { H: '#e5e7eb', C: '#475569', N: '#3867f4', O: '#e2464b', F: '#22b8a0', B: '#f59e0b', Cl: '#14a058', I: '#8b5cf6', Na: '#a78bfa' };
  const ELR = { H: 15, C: 21, N: 20, O: 20, F: 19, B: 21, Cl: 25, I: 28, Na: 22 };
  const EN = { H: 2.1, B: 2.0, C: 2.5, N: 3.0, O: 3.5, F: 4.0, Cl: 3.0, I: 2.5 };

  /* ---------- 3차원 수학 · 시점 ---------- */
  const vadd = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const vsub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const vmul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
  const vdot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const vcross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const vlen = (a) => Math.hypot(a[0], a[1], a[2]);
  const vnorm = (a) => { const l = vlen(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  function K4(k, ang) {
    const az = [90, 210, 330].map((a) => a * Math.PI / 180);
    const mk = (psi, i) => [Math.sin(psi) * Math.cos(az[i]), Math.cos(psi), Math.sin(psi) * Math.sin(az[i])];
    if (k === 0) { const psi = Math.acos(-1 / 3); return [mk(psi, 0), mk(psi, 1), mk(psi, 2), [0, 1, 0]]; }
    const a = ang * Math.PI / 180, c2 = (Math.cos(a) + 0.5) / 1.5, psi = Math.acos(-Math.sqrt(c2));
    return [mk(psi, 0), mk(psi, 1), mk(psi, 2), [0, 1, 0]];
  }
  function rotAbout(v, k, th) { const c = Math.cos(th), s_ = Math.sin(th); return vadd(vadd(vmul(v, c), vmul(vcross(k, v), s_)), vmul(k, vdot(k, v) * (1 - c))); }
  // 정사면체 꼭짓점 중 하나(3번)를 방향 e에 맞춰 돌린 집합
  function tetraAlong(e) {
    const T = K4(0, 109.4712), a = [0, 1, 0];
    let axis = vcross(a, e), th = Math.acos(clamp(vdot(a, e), -1, 1));
    if (vlen(axis) < 1e-6) { axis = [1, 0, 0]; th = vdot(a, e) > 0 ? 0 : Math.PI; } else axis = vnorm(axis);
    return T.map((v) => vnorm(rotAbout(v, axis, th)));
  }
  // 이미 결합한 방향 existing 에 더해 남은 정사면체 방향 (원자 하나가 결합 4개까지)
  function tetraFill(existing) {
    if (existing.length === 0) return K4(0, 109.4712);
    const T = tetraAlong(existing[0]);
    if (existing.length === 1) return [T[0], T[1], T[2]];
    // 둘째 방향에 가장 가까운 꼭짓점이 일치하도록 e1 둘레로 돌림
    const e1 = vnorm(existing[0]), e2 = vnorm(existing[1]);
    const proj = (v) => vnorm(vsub(v, vmul(e1, vdot(v, e1))));
    const pa = proj(T[0]), pb = proj(e2);
    const th = Math.atan2(vdot(e1, vcross(pa, pb)), vdot(pa, pb));
    const R = T.map((v) => vnorm(rotAbout(v, e1, th)));
    return [R[1], R[2]];
  }
  const VIEW = { yaw: 0.55, pitch: -0.3, vy: 0, drag: false };
  function rot(v) {
    const cy = Math.cos(VIEW.yaw), sy = Math.sin(VIEW.yaw), cp = Math.cos(VIEW.pitch), sp = Math.sin(VIEW.pitch);
    const x1 = v[0] * cy + v[2] * sy, z1 = -v[0] * sy + v[2] * cy;
    return [x1, v[1] * cp - z1 * sp, v[1] * sp + z1 * cp];
  }
  const proj = (C, S, v) => ({ x: C.x + S * v[0], y: C.y - S * v[1], z: v[2] });
  function ball(C, S, v, r, color, text, o) {
    o = o || {};
    const q = proj(C, S, v), k = 1 + v[2] / 900;
    D.sphere(q.x, q.y, r * S * k, color, { shadow: o.shadow !== false, text, textColor: color === ELC.H ? INK : '#fff', outline: 'rgba(30,30,60,.35)', outlineWidth: 1.2, textScale: 1.0 });
    return q;
  }
  function sticks(C, S, a, b, order, width) {
    const p = proj(C, S, a), q = proj(C, S, b);
    const dx = q.x - p.x, dy = q.y - p.y, L = Math.hypot(dx, dy) || 1, px = -dy / L, py = dx / L;
    for (let k = 0; k < order; k++) {
      const off = (k - (order - 1) / 2) * 9;
      ctx.save(); ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(40,40,70,.28)'; ctx.lineWidth = width + 3; ctx.beginPath(); ctx.moveTo(p.x + px * off, p.y + py * off); ctx.lineTo(q.x + px * off, q.y + py * off); ctx.stroke();
      ctx.strokeStyle = '#d1d5db'; ctx.lineWidth = width; ctx.beginPath(); ctx.moveTo(p.x + px * off, p.y + py * off); ctx.lineTo(q.x + px * off, q.y + py * off); ctx.stroke();
      ctx.restore();
    }
  }

  /* ---------- 장면 관리 ---------- */
  const S = { scene: 'polar', sceneA: 1 };
  const TB = { polar: '🧲 분자의 극성', stream: '💧 물줄기 실험', mix: '🧪 섞어 보기', bp: '📊 끓는점 비교', isomer: '🧬 같은 분자식, 다른 구조', bonds: '⛓️ N₂와 O₂의 결합', predict: '🔮 구조로 예측하기' };
  const SCENES = ['polar', 'stream', 'mix', 'bp', 'isomer', 'bonds', 'predict'];
  let obsShow = false, bondShow = false;
  function setScene(sc) {
    if (S.scene === sc) { updateUI(); return; }
    S.scene = sc; hintEl.classList.add('hide');
    S.sceneA = 0; tween(S, { sceneA: 1 }, { duration: 0.4, ease: 'outCubic' });
    updateUI();
  }
  function updateUI() {
    const sc = S.scene;
    SCENES.forEach((k) => { $('#cs-' + k).hidden = k !== sc; });
    $$('#sceneSeg button').forEach((b) => b.classList.toggle('on', b.dataset.scene === sc));
    const n = $$('#sceneSeg button').filter((b) => !b.hidden).length;
    $('#sceneSeg').hidden = n < 2;
    $('#sceneSeg').classList.toggle('compact', n > 4);
    $('#tbLabel').textContent = TB[sc]; $('#tbLabel').hidden = n >= 2 && n <= 4;
    $('#obsCard').hidden = !(obsShow && (sc === 'stream' || sc === 'mix' || sc === 'bp'));
    $('#bondCard').hidden = !(bondShow && (sc === 'isomer' || sc === 'bonds'));
  }

  /* =========================================================
     ① 분자의 극성: 결합 쌍극자 화살표의 합
     ========================================================= */
  const BL = 62;
  function geom(key, bend) {
    const H = 'H';
    if (key === 'H2O') { const a = 52.25 * Math.PI / 180; const d = [[-Math.sin(a), -Math.cos(a), 0], [Math.sin(a), -Math.cos(a), 0]]; return { atoms: [{ e: 'O', p: [0, 0, 0] }, { e: H, p: vmul(d[0], BL) }, { e: H, p: vmul(d[1], BL) }], bonds: [[0, 1, 1], [0, 2, 1]] }; }
    if (key === 'NH3') { const d = K4(1, 107); return { atoms: [{ e: 'N', p: [0, 0, 0] }, ...[0, 1, 2].map((i) => ({ e: H, p: vmul(d[i], BL) }))], bonds: [[0, 1, 1], [0, 2, 1], [0, 3, 1]] }; }
    if (key === 'CO2') { const h = (bend / 2) * Math.PI / 180; const d = [[-Math.sin(h), -Math.cos(h), 0], [Math.sin(h), -Math.cos(h), 0]]; return { atoms: [{ e: 'C', p: [0, 0, 0] }, { e: 'O', p: vmul(d[0], BL * 1.1) }, { e: 'O', p: vmul(d[1], BL * 1.1) }], bonds: [[0, 1, 2], [0, 2, 2]] }; }
    if (key === 'CH4') { const d = K4(0, 109.47); return { atoms: [{ e: 'C', p: [0, 0, 0] }, ...d.map((v) => ({ e: H, p: vmul(v, BL) }))], bonds: [[0, 1, 1], [0, 2, 1], [0, 3, 1], [0, 4, 1]] }; }
    if (key === 'BF3') { const d = [90, 210, 330].map((a) => [Math.cos(a * Math.PI / 180), Math.sin(a * Math.PI / 180), 0]); return { atoms: [{ e: 'B', p: [0, 0, 0] }, ...d.map((v) => ({ e: 'F', p: vmul(v, BL) }))], bonds: [[0, 1, 1], [0, 2, 1], [0, 3, 1]] }; }
    if (key === 'CH3Cl') { const d = K4(0, 109.47); return { atoms: [{ e: 'C', p: [0, 0, 0] }, { e: H, p: vmul(d[0], BL) }, { e: H, p: vmul(d[1], BL) }, { e: H, p: vmul(d[2], BL) }, { e: 'Cl', p: vmul(d[3], BL * 1.2) }], bonds: [[0, 1, 1], [0, 2, 1], [0, 3, 1], [0, 4, 1]] }; }
    return null;
  }
  // 결합 쌍극자: 전기 음성도가 큰 원자 쪽으로 향하는 화살표 (크기 ∝ Δχ)
  function dipoles(g) {
    const out = [];
    g.bonds.forEach(([a, b, o]) => {
      const ea = EN[g.atoms[a].e], eb = EN[g.atoms[b].e], d = Math.abs(ea - eb);
      if (d < 1e-9) return;
      const from = ea < eb ? a : b, to = ea < eb ? b : a;
      out.push({ a, b, from, to, d: Math.round(d * 10) / 10, o, dir: vnorm(vsub(g.atoms[to].p, g.atoms[from].p)) });
    });
    return out;
  }
  const netOf = (dp) => dp.reduce((s, x) => vadd(s, vmul(x.dir, x.d)), [0, 0, 0]);
  const PMOL = {
    H2O: { f: 'H₂O', html: 'H<sub>2</sub>O', name: '물', shape: '굽은형', polar: true },
    NH3: { f: 'NH₃', html: 'NH<sub>3</sub>', name: '암모니아', shape: '삼각뿔', polar: true },
    CO2: { f: 'CO₂', html: 'CO<sub>2</sub>', name: '이산화 탄소', shape: '직선형', polar: false },
    CH4: { f: 'CH₄', html: 'CH<sub>4</sub>', name: '메테인', shape: '정사면체', polar: false },
    BF3: { f: 'BF₃', html: 'BF<sub>3</sub>', name: '삼플루오린화 붕소', shape: '평면 삼각형', polar: false },
    CH3Cl: { f: 'CH₃Cl', html: 'CH<sub>3</sub>Cl', name: '염화 메틸', shape: '사면체(C–Cl이 달라요)', polar: true },
  };
  const PKEYS = ['H2O', 'NH3', 'CO2', 'CH4', 'BF3', 'CH3Cl'];
  const PL = { mol: 'H2O', bend: 180, arrows: [], chain: {}, judged: {}, drag: null, tok: 0, shake: -9, g: null, dp: null };
  const P3 = () => (PHONE ? { x: 280, y: 215 } : { x: 235, y: 330 });
  const PS = PHONE ? 1.15 : 1.5;
  const PNL = () => (PHONE ? { x: 24, y: 378, w: 512, h: 352 } : { x: 478, y: 108, w: 304, h: 430 });
  const PO = () => { const q = PNL(); return { x: q.x + q.w / 2, y: q.y + (PHONE ? 190 : 205) }; };
  function plBuild() {
    PL.g = geom(PL.mol, PL.bend); PL.dp = dipoles(PL.g);
    const dp = PL.dp, q = PNL(), O = PO();
    const dmax = Math.max(0.1, ...dp.map((x) => x.d)), sc = (PHONE ? 84 : 92) * (dp.length >= 4 ? 0.75 : 1) / dmax;
    PL.sc = sc;
    PL.arrows = dp.map((x, i) => {
      const v = [x.dir[0] * x.d * sc, -x.dir[1] * x.d * sc];
      const n = dp.length, rx = q.x + 46 + (i + 0.5) * ((q.w - 92) / n), ry = q.y + q.h - 78;
      return { v, att: i === 0, tail: { x: i === 0 ? O.x : rx - v[0] / 2, y: i === 0 ? O.y : ry - v[1] / 2 }, rest: { x: rx - v[0] / 2, y: ry - v[1] / 2 } };
    });
    PL.arrows[0].tail = { x: O.x, y: O.y };
    PL.drag = null; PL.tok++;
    $('#autoBtn').disabled = false;
  }
  const plNet = () => { const n = netOf(PL.dp); return vlen(n) < 1e-6 ? 0 : vlen(n); };
  const plDone = () => PL.arrows.every((a) => a.att);
  function plSelect(k) {
    PL.mol = k; PL.bend = 180;
    $('#sBend').value = 180; $('#oBend').textContent = '180°';
    $('#bendRow').hidden = k !== 'CO2';
    $$('#plSel .opt').forEach((b) => { b.classList.toggle('on', b.dataset.m === k); b.classList.toggle('done', !!PL.judged[b.dataset.m]); });
    plBuild();
  }
  function plBendTo(v) {
    PL.bend = v; $('#oBend').textContent = v + '°';
    plBuild();
  }
  function plTip(i) { const a = PL.arrows[i]; return { x: a.tail.x + a.v[0], y: a.tail.y + a.v[1] }; }
  function plAuto() {
    const tok = ++PL.tok; Sound.click();
    PL.arrows.forEach((a, i) => { if (i > 0) a.att = false; });
    PL.arrows.forEach((a, i) => {
      if (i === 0) return;
      tween({ t: 0 }, { t: 1 }, { duration: 0.01, delay: 0.1 + i * 0.55, onDone: () => { if (tok === PL.tok) { a.att = true; Sound.tick(); plCheckDone(); } } });
    });
  }
  function plCheckDone() {
    if (plDone() && !PL.chain[PL.mol + '|' + PL.bend]) {
      PL.chain[PL.mol + '|' + PL.bend] = true;
      if (PL.bend === 180) PL.chain[PL.mol] = true;
      // 화살표 꼬리는 아직 붙는 중일 수 있어서(움직이는 중), 화면 위치가 아니라 벡터 합으로 판정해요
      const O = PO(), zero = plNet() === 0;
      const tip = { x: O.x + PL.arrows.reduce((s_, a) => s_ + a.v[0], 0), y: O.y + PL.arrows.reduce((s_, a) => s_ + a.v[1], 0) };
      Sound.success();
      fx.burst(zero ? O.x : tip.x, zero ? O.y : tip.y, { count: 18, colors: zero ? ['#14a058', '#a7f3d0', '#fff'] : ['#7c3aed', '#c4b5fd', '#fff'], speed: 130, size: 3.5, gravity: 0 });
      showHint(zero ? '화살표가 제자리로 돌아왔어요: 합 = 0 → 무극성 분자' : '합이 0이 아니에요: 알짜 쌍극자 모멘트 → 극성 분자', 5500);
    }
  }
  const chainCount = () => ['H2O', 'CO2', 'BF3'].filter((k) => PL.chain[k]).length;
  function judge(polar) {
    const M = PMOL[PL.mol];
    if (PL.mol === 'CO2' && PL.bend !== 180) { PL.shake = NOW; Sound.fail(); showHint('CO₂의 실제 결합각은 180°예요. 슬라이더를 180°로 되돌려 판정해요', 4500); return; }
    const ok = M.polar === polar;
    if (!ok) { PL.shake = NOW; Sound.fail(); showHint(polar ? '화살표를 이어 붙이면 합이 0이 돼요. 무극성이에요. 다시 생각해 봐요' : '화살표의 합이 0이 아니에요. 극성 분자예요. 다시 살펴봐요', 5000); return; }
    if (!PL.judged[PL.mol]) {
      PL.judged[PL.mol] = true; Sound.success();
      const C = P3(); fx.burst(C.x, C.y, { count: 20, colors: ['#8b5cf6', '#34d399', '#fbbf24'], speed: 150, size: 3.5 });
      showHint(M.f + ': ' + (M.polar ? '극성 분자' : '무극성 분자') + ' (' + M.shape + ')', 4500);
      $$('#plSel .opt').forEach((b) => b.classList.toggle('done', !!PL.judged[b.dataset.m]));
    }
  }
  const judgedCount = () => PKEYS.filter((k) => PL.judged[k]).length;
  function segDist(p, a, b) {
    const dx = b.x - a.x, dy = b.y - a.y, L2 = dx * dx + dy * dy || 1, t = clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / L2, 0, 1);
    return Math.hypot(p.x - (a.x + dx * t), p.y - (a.y + dy * t));
  }
  function plHit(p) {
    for (let i = PL.arrows.length - 1; i >= 1; i--) {
      const a = PL.arrows[i]; if (a.att) continue;
      if (segDist(p, a.tail, plTip(i)) < 24) return i;
    }
    return -1;
  }
  function stepPolar(dt) {
    PL.arrows.forEach((a, i) => {
      if (i === 0) return;
      if (PL.drag && PL.drag.i === i) return;
      const t = a.att ? plTip(i - 1) : a.rest;
      if (!a.att && !PL.arrows[i - 1].att && false) return;
      a.tail.x = RM ? t.x : approach(a.tail.x, t.x, dt, a.att ? 12 : 8); a.tail.y = RM ? t.y : approach(a.tail.y, t.y, dt, a.att ? 12 : 8);
    });
  }
  function dipArrow(x1, y1, x2, y2, col, w) {
    D.arrow(x1, y1, x2, y2, { color: col, width: w, head: 9 + w * 1.2 });
    // 꼬리에 (+) 표시
    ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1, px = -dy / L, py = dx / L;
    ctx.beginPath(); ctx.moveTo(x1 + px * 6, y1 + py * 6); ctx.lineTo(x1 - px * 6, y1 - py * 6); ctx.stroke(); ctx.restore();
  }
  function drawMolecule3D(g, C, S_, opts) {
    opts = opts || {};
    const dp = opts.dp || dipoles(g), items = [];
    g.atoms.forEach((a, i) => { const rp = rot(a.p); items.push({ z: rp[2], f() { ball(C, S_, rp, ELR[a.e], ELC[a.e], a.e); } }); });
    g.bonds.forEach(([a, b, o]) => {
      const pa = rot(g.atoms[a].p), pb = rot(g.atoms[b].p);
      items.push({ z: (pa[2] + pb[2]) / 2 - 0.5, f() { sticks(C, S_, pa, pb, o, 5); } });
    });
    if (opts.arrows !== false) dp.forEach((x) => {
      const pf = rot(g.atoms[x.from].p), pt = rot(g.atoms[x.to].p);
      items.push({ z: (pf[2] + pt[2]) / 2 + 2, f() {
        const a = proj(C, S_, vadd(vmul(pf, 0.72), vmul(pt, 0.28))), b = proj(C, S_, vadd(vmul(pf, 0.28), vmul(pt, 0.72)));
        const off = 14;
        const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1;
        dipArrow(a.x + (-dy / L) * off, a.y + (dx / L) * off, b.x + (-dy / L) * off, b.y + (dx / L) * off, '#e2464b', 2.2 + x.d * 1.6);
      } });
    });
    items.sort((a, b) => a.z - b.z).forEach((it) => it.f());
    if (opts.delta) dp.forEach((x) => {
      const t = g.atoms[x.to], f = g.atoms[x.from];
      const tr = rot(t.p), fr = rot(f.p);
      if (g.atoms[x.to].p.every((v) => v === 0) || false) return;
      const qt = proj(C, S_, tr);
      if (vlen(t.p) > 1) D.label(qt.x + 20, qt.y - 22, 'δ−', { size: fs(13), bg: '#dbeafe', color: '#1e3a8a', pad: 5 });
      if (vlen(f.p) > 1) { const qf = proj(C, S_, fr); D.label(qf.x + 20, qf.y - 22, 'δ+', { size: fs(13), bg: '#fee2e2', color: '#991b1b', pad: 5 }); }
    });
  }
  function drawPolar(t) {
    const M = PMOL[PL.mol], C = P3(), g = PL.g, dp = PL.dp, q = PNL(), O = PO();
    D.text(C.x, TY, M.name + ' ' + M.f + ' · ' + (PL.mol === 'CO2' && PL.bend !== 180 ? '굽은 CO₂ (가상)' : M.shape), { size: fs(17), weight: 800, color: '#4c1d95' });
    // 분자 모형 + 결합 쌍극자
    drawMolecule3D(g, C, PS, { dp, delta: true });
    // 알짜 쌍극자 (화살표를 모두 이은 뒤에 나타남)
    const done = plDone(), net = netOf(dp), nl = vlen(net) < 1e-6 ? 0 : vlen(net);
    if (done) {
      if (nl > 0) { const r = rot(vnorm(net)), a = proj(C, PS, [0, 0, 0]); dipArrow(a.x, a.y, a.x + r[0] * (nl * 28 * PS), a.y - r[1] * (nl * 28 * PS), '#7c3aed', 8); D.label(a.x, a.y + 90 * (PHONE ? 0.8 : 1), '알짜 쌍극자 있음', { size: fs(13), bg: '#7c3aed', color: '#fff', pad: 8 }); }
      else D.label(C.x, C.y + (PHONE ? 100 : 128), '알짜 쌍극자 = 0', { size: fs(14), bg: '#14a058', color: '#fff', pad: 10 });
    }
    D.text(C.x, C.y + (PHONE ? 140 : 190), '화면을 끌어 돌려 보세요', { size: fs(12.5), weight: 700, color: MUTED });
    // 판
    ctx.save();
    D.shadow(() => { D.roundRect(q.x, q.y, q.w, q.h, 16); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: 10, y: 3 });
    ctx.restore();
    D.text(q.x + q.w / 2, q.y + 28, '화살표를 끌어 머리와 꼬리 잇기', { size: fs(14.5), weight: 800, color: '#4c1d95' });
    D.text(q.x + q.w / 2, q.y + 48, '(분자를 앞에서 본 화살표)', { size: fs(11.5), weight: 700, color: MUTED });
    ctx.save(); ctx.fillStyle = '#4c1d95'; ctx.beginPath(); ctx.arc(O.x, O.y, 6, 0, TAU); ctx.fill(); ctx.restore();
    D.text(O.x - 14, O.y + 20, 'O', { size: fs(12), weight: 800, color: '#4c1d95' });
    const shk = NOW - PL.shake < 0.4 && !RM ? Math.sin(NOW * 60) * 4 : 0;
    PL.arrows.forEach((a, i) => {
      const tip = plTip(i), drag = PL.drag && PL.drag.i === i;
      const nxt = !a.att && PL.arrows[i - 1] && PL.arrows[i - 1].att;
      if (nxt) { const pt = plTip(i - 1); ctx.save(); ctx.strokeStyle = 'rgba(124,58,237,' + (0.35 + 0.3 * Math.sin(t * 5)) + ')'; ctx.setLineDash([4, 4]); ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(pt.x, pt.y, 14, 0, TAU); ctx.stroke(); ctx.restore(); }
      if (drag) D.glow(a.tail.x + a.v[0] / 2, a.tail.y + a.v[1] / 2, 50, '#a78bfa', 0.4);
      dipArrow(a.tail.x + shk, a.tail.y, tip.x + shk, tip.y, ['#e2464b', '#f59e0b', '#3867f4', '#14a058', '#8b5cf6'][i % 5], 5);
      const bn = PL.dp[i];
      { const mx_ = (a.tail.x + tip.x) / 2, my_ = (a.tail.y + tip.y) / 2, dx_ = tip.x - a.tail.x, dy_ = tip.y - a.tail.y, L_ = Math.hypot(dx_, dy_) || 1;
        D.text(mx_ + shk + (-dy_ / L_) * 20, my_ + (dx_ / L_) * 20 + 4, g.atoms[bn.from].e + '→' + g.atoms[bn.to].e + ' ' + bn.d.toFixed(1), { size: fs(11.5), weight: 800, color: INK }); }
    });
    if (done) {
      const tip = plTip(PL.arrows.length - 1), zero = plNet() === 0;
      if (zero) { D.label(O.x, O.y + 38, '합 = 0', { size: fs(15), bg: '#14a058', color: '#fff', pad: 10 }); D.check(O.x + 56, O.y + 38, 12, 1); }
      else { D.arrow(O.x, O.y, tip.x, tip.y, { color: '#7c3aed', width: 6, dash: [8, 6], head: 14 }); D.label(O.x, O.y + 38, '합 ≠ 0 (화살표 합)', { size: fs(14), bg: '#7c3aed', color: '#fff', pad: 10 }); }
    }
    if (!done) D.text(q.x + q.w / 2, q.y + q.h - 14, '파란 점선 고리에 다음 화살표의 꼬리를 가져가요', { size: fs(11.5), weight: 700, color: MUTED });
  }

  /* =========================================================
     ② 물줄기 실험: 대전된 막대를 가까이 하면 극성 액체 줄기만 휘어요
     ========================================================= */
  const LIQ = {
    water: { name: '물', pol: 1.0, col: '#4aa8ff', mol: 'water' },
    ethanol: { name: '에탄올', pol: 0.7, col: '#6ee7b7', mol: 'ethanol' },
    hexane: { name: '헥세인', pol: 0, col: '#fbbf24', mol: 'hexane' },
  };
  const ST = { liq: 'water', chg: -1, rod: null, tested: {}, res: {}, near: 0, drag: false, gx: 0, gy: 0, bend: 0, pts: [], sp: 0 };
  const stL = PHONE
    ? { x0: 170, y0: 175, yEnd: 560, rodMin: 250, rodMax: 520, hw: 46, hh: 12, inset: { x: 405, y: 150, r: 78 }, rod0: { x: 400, y: 380 } }
    : { x0: 290, y0: 150, yEnd: 455, rodMin: 250, rodMax: 440, hw: 58, hh: 13, inset: { x: 655, y: 140, r: 95 }, rod0: { x: 540, y: 330 } };
  ST.rod = { x: stL.rod0.x, y: stL.rod0.y };
  function trace(liq) {
    const L = LIQ[liq], pts = [], r = ST.rod;
    const s = Math.sign(r.x - stL.x0) || 1;
    let x = stL.x0, vx = 0;
    const vy = 150, dy = 7;
    for (let y = stL.y0; y <= stL.yEnd; y += dy) {
      const dxr = r.x - x, dyr = r.y - y;
      const a = L.pol * 1.5e6 * dxr / Math.pow(dxr * dxr + dyr * dyr + 3600, 1.5);
      const dt = dy / vy; vx += a * dt; x += vx * dt;
      if (Math.abs(y - r.y) <= stL.hh + 3) { if (s > 0) x = Math.min(x, r.x - stL.hw - 7); else x = Math.max(x, r.x + stL.hw + 7); }
      pts.push({ x, y });
    }
    let bend = 0; pts.forEach((p) => { bend = Math.max(bend, Math.abs(p.x - stL.x0)); });
    return { pts, bend };
  }
  function stClampRod() {
    const r = ST.rod;
    r.y = clamp(r.y, stL.rodMin, stL.rodMax);
    r.x = clamp(r.x, stL.hw + 14, VW - stL.hw - 14);
    if (Math.abs(r.x - stL.x0) < stL.hw + 26) r.x = stL.x0 + (r.x >= stL.x0 ? 1 : -1) * (stL.hw + 26);
    r.x = clamp(r.x, stL.hw + 14, VW - stL.hw - 14);
  }
  function stSet(l) {
    ST.liq = l; ST.near = 0;
    $$('#liqSel button').forEach((b) => b.classList.toggle('on', b.dataset.l === l));
    Sound.click();
  }
  function stSetChg(c) {
    ST.chg = c;
    const b = $('#chgBtn');
    b.textContent = c < 0 ? '🔵 막대 전하: (−)  → 눌러 바꾸기' : '🔴 막대 전하: (+)  → 눌러 바꾸기';
  }
  const testedCount = () => ['water', 'ethanol', 'hexane'].filter((k) => ST.tested[k]).length;
  function stepStream(dt) {
    const tr = trace(ST.liq); ST.pts = tr.pts; ST.bend = tr.bend;
    const r = ST.rod, near = Math.abs(r.x - stL.x0) < 230 && r.y > stL.y0 + 20 && r.y < stL.yEnd;
    ST.near = near ? ST.near + dt : 0;
    if (ST.near > 1.0 && !ST.tested[ST.liq]) {
      ST.tested[ST.liq] = true; ST.res[ST.liq] = tr.bend > 10 ? '휨' : '안 휨'; Sound.success();
      const L = LIQ[ST.liq];
      showHint(L.name + ' 줄기는 ' + (tr.bend > 10 ? '막대 쪽으로 휘어요 (극성 분자)' : '휘지 않아요 (무극성 분자)'), 5000);
      fx.burst(r.x, r.y, { count: 16, colors: ['#fbbf24', '#60a5fa', '#fff'], speed: 120, size: 3, gravity: 0 });
    }
    ST.sp += dt;
    if (ST.sp > 0.04 && !RM) { ST.sp = 0; const e = ST.pts[ST.pts.length - 1]; fx.emit({ x: e.x + rnd(-6, 6), y: stL.yEnd + 26, vx: rnd(-40, 40), vy: rnd(-70, -20), life: 0.5, size: rnd(2, 3.5), color: LIQ[ST.liq].col, gravity: 300, shape: 'circle' }); }
  }
  // 분자 그림 (축 방향: 부분 음전하(δ−) 쪽이 ang 방향)
  function molGlyph(kind, x, y, ang, sc, o) {
    o = o || {};
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.scale(sc, sc);
    if (kind === 'water') {
      const h1 = [-14, -13], h2 = [-14, 13];
      ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(h1[0], h1[1]); ctx.moveTo(0, 0); ctx.lineTo(h2[0], h2[1]); ctx.stroke();
      D.sphere(h1[0], h1[1], 6, '#e5e7eb', { shadow: false }); D.sphere(h2[0], h2[1], 6, '#e5e7eb', { shadow: false }); D.sphere(0, 0, 10, '#e2464b', { shadow: false });
      if (o.pm) { D.text(8, 4, '−', { size: 12, weight: 800, color: '#1e3a8a' }); D.text(-24, 4, '+', { size: 12, weight: 800, color: '#991b1b' }); }
    } else if (kind === 'ethanol') {
      ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-26, 4); ctx.lineTo(-13, -4); ctx.lineTo(0, 4); ctx.lineTo(12, -4); ctx.lineTo(20, 6); ctx.stroke();
      D.sphere(-26, 4, 7, '#475569', { shadow: false }); D.sphere(-13, -4, 7, '#475569', { shadow: false }); D.sphere(0, 4, 7.5, '#475569', { shadow: false });
      D.sphere(12, -4, 8.5, '#e2464b', { shadow: false }); D.sphere(21, 8, 5, '#e5e7eb', { shadow: false });
      if (o.pm) { D.text(26, -6, '−', { size: 12, weight: 800, color: '#1e3a8a' }); D.text(-34, 0, '+', { size: 12, weight: 800, color: '#991b1b' }); }
    } else if (kind === 'hexane') {
      ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 3; ctx.beginPath(); for (let i = 0; i < 6; i++) { const px = -30 + i * 12, py = i % 2 ? -5 : 5; if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); } ctx.stroke();
      for (let i = 0; i < 6; i++) D.sphere(-30 + i * 12, i % 2 ? -5 : 5, 5.5, '#64748b', { shadow: false, gloss: false });
    } else if (kind === 'iodine') {
      ctx.strokeStyle = '#6d28d9'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(8, 0); ctx.stroke();
      D.sphere(-10, 0, 9, '#8b5cf6', { shadow: false }); D.sphere(10, 0, 9, '#8b5cf6', { shadow: false });
    }
    ctx.restore();
  }
  function drawStream(t) {
    const L = LIQ[ST.liq], r = ST.rod, ins = stL.inset;
    D.text(stL.x0, TY, '대전된 막대를 줄기 가까이로', { size: fs(15), weight: 800, color: '#4c1d95' });
    // 노즐 (뷰렛)
    ctx.save();
    D.roundRect(stL.x0 - 14, stL.y0 - 78, 28, 70, 8); ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.fill(); ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 3; ctx.stroke();
    D.roundRect(stL.x0 - 9, stL.y0 - 74, 18, 62, 6); ctx.fillStyle = CO.rgba(L.col, 0.55); ctx.fill();
    ctx.fillStyle = '#64748b'; ctx.fillRect(stL.x0 - 6, stL.y0 - 10, 12, 10);
    ctx.restore();
    D.label(stL.x0 + 62, stL.y0 - 44, L.name, { size: fs(13), bg: L.col, color: '#1b2333', pad: 9 });
    // 비커
    { const tx = 24, tw = VW - 48, ty = stL.yEnd + 6;
      ctx.save(); D.roundRect(tx, ty + 18, tw, 70, 14); ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fill(); ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 3; ctx.stroke();
      ctx.save(); D.roundRect(tx + 3, ty + 40, tw - 6, 45, 11); ctx.clip(); ctx.fillStyle = CO.rgba(L.col, 0.55); ctx.beginPath(); ctx.moveTo(tx, ty + 44); for (let i = 0; i <= 30; i++) ctx.lineTo(tx + tw * i / 30, ty + 42 + Math.sin(t * 2.4 + i * 0.6) * 1.8); ctx.lineTo(tx + tw, ty + 90); ctx.lineTo(tx, ty + 90); ctx.closePath(); ctx.fill(); ctx.restore();
      ctx.restore(); D.text(tx + tw - 10, ty + 14, '받는 그릇', { size: fs(11.5), weight: 700, color: MUTED, align: 'right' }); }
    // 줄기
    const pts = ST.pts;
    if (pts.length) {
      ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.strokeStyle = CO.rgba(L.col, 0.95); ctx.lineWidth = 8;
      ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.65)'; ctx.lineWidth = 2.5; ctx.setLineDash([10, 14]); ctx.lineDashOffset = RM ? 0 : -t * 90;
      ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p.x - 1.5, p.y) : ctx.moveTo(p.x - 1.5, p.y))); ctx.stroke();
      ctx.restore();
    }
    // 막대
    ctx.save();
    ctx.translate(r.x, r.y);
    const hw = stL.hw, hh = stL.hh;
    D.shadow(() => { D.roundRect(-hw, -hh, hw * 2, hh * 2, hh); const g = ctx.createLinearGradient(0, -hh, 0, hh); g.addColorStop(0, '#fde68a'); g.addColorStop(0.5, '#fbbf24'); g.addColorStop(1, '#b45309'); ctx.fillStyle = g; ctx.fill(); }, { blur: 8, y: 4 });
    ctx.fillStyle = ST.chg < 0 ? '#1d4ed8' : '#dc2626';
    for (let i = -3; i <= 3; i++) D.text(i * (hw / 3.6), 5, ST.chg < 0 ? '−' : '+', { size: 17, weight: 900, color: ST.chg < 0 ? '#1e3a8a' : '#991b1b' });
    ctx.restore();
    D.label(r.x, r.y - hh - 18, '대전된 막대 (' + (ST.chg < 0 ? '−' : '+') + ')', { size: fs(12), bg: ST.chg < 0 ? '#1d4ed8' : '#dc2626', color: '#fff', pad: 7 });
    if (ST.near > 0 && !ST.tested[ST.liq]) { ctx.save(); ctx.fillStyle = 'rgba(124,58,237,.18)'; D.roundRect(VW / 2 - 90, stL.yEnd + 134, 180, 8, 4); ctx.fill(); ctx.fillStyle = '#7c3aed'; D.roundRect(VW / 2 - 90, stL.yEnd + 134, 180 * clamp(ST.near / 1.0, 0, 1), 8, 4); ctx.fill(); ctx.restore(); }
    // 입자 모형 확대창
    ctx.save();
    D.shadow(() => { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ins.x, ins.y, ins.r, 0, TAU); ctx.fill(); }, { blur: 10, y: 3 });
    ctx.strokeStyle = '#a78bfa'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(ins.x, ins.y, ins.r, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.arc(ins.x, ins.y, ins.r - 2, 0, TAU); ctx.clip();
    const prox = clamp(1 - Math.abs(r.x - stL.x0) / 240, 0, 1) * (r.y > stL.y0 && r.y < stL.yEnd ? 1 : 0.4);
    const toRod = Math.atan2(r.y - (stL.y0 + stL.yEnd) / 2, r.x - stL.x0);
    const dAng = ST.chg < 0 ? toRod + Math.PI : toRod;      // δ− 쪽이 향하는 방향 (막대가 (−)이면 δ−는 멀어짐)
    const gl = L.mol === 'hexane' ? 'hexane' : L.mol;
    const spots = [[-0.45, -0.4], [0.35, -0.5], [-0.1, 0.0], [0.5, 0.1], [-0.5, 0.45], [0.2, 0.5]];
    spots.forEach((s, i) => {
      const tumble = t * (0.6 + i * 0.13) + i * 1.7;
      const a = L.pol > 0 ? lerp(tumble, dAng, clamp(prox * L.pol * 1.3, 0, 1)) : tumble;
      const jx = RM ? 0 : Math.sin(t * 1.3 + i) * 3, jy = RM ? 0 : Math.cos(t * 1.1 + i * 2) * 3;
      molGlyph(gl, ins.x + s[0] * ins.r * 0.95 + jx, ins.y + s[1] * ins.r * 0.95 + jy, a, 0.72 * (PHONE ? 0.9 : 1), { pm: L.pol > 0 });
    });
    ctx.restore();
    D.text(ins.x, ins.y + ins.r + 18, '🔍 입자 모형 · ' + (L.pol > 0 ? '극성 분자는 방향을 맞춰요' : '무극성 분자는 그대로'), { size: fs(11.5), weight: 800, color: '#4c1d95' });
    const bendTxt = ST.near > 0 || ST.tested[ST.liq] ? (ST.bend > 10 ? '막대 쪽으로 휘어요 ↗' : '휘지 않아요 ↓') : '막대를 가까이 가져가요';
    D.label(VW / 2, stL.yEnd + 120, L.name + ': ' + bendTxt, { size: fs(14), bg: '#fff', color: ST.bend > 10 && ST.near > 0 ? '#7c3aed' : MUTED, border: '#cbd5e1', pad: 12 });
  }

  /* =========================================================
     ② 섞어 보기: 극성은 극성끼리, 무극성은 무극성끼리
     ========================================================= */
  const MXD = {
    we: { name: '물 + 에탄올', res: '섞여요', why: '극성 + 극성', base: 'water', add: 'ethanol' },
    wh: { name: '물 + 헥세인', res: '층이 나뉘어요', why: '극성 / 무극성', base: 'water', add: 'hexane' },
    wi: { name: '물 + 아이오딘', res: '거의 녹지 않아요', why: '극성 / 무극성', base: 'water', add: 'iodine' },
    hi: { name: '헥세인 + 아이오딘', res: '잘 녹아요(보라색)', why: '무극성 + 무극성', base: 'hexane', add: 'iodine' },
  };
  const MX = { x: 'we', running: false, p: 0, results: {}, parts: [], fallY: [] };
  const MXL = PHONE ? { bx: 170, by: 205, bw: 150, bh: 200, ix: 40, iy: 470, iw: 480, ih: 250 } : { bx: 175, by: 235, bw: 170, bh: 230, ix: 460, iy: 130, iw: 300, ih: 330 };
  function mxReset(x) {
    if (x) MX.x = x;
    if (MX.tw) MX.tw.cancel();
    MX.running = false; MX.p = 0; MX.tok = (MX.tok || 0) + 1;
    $$('#mixSel .opt').forEach((b) => { b.classList.toggle('on', b.dataset.x === MX.x); b.classList.toggle('done', !!MX.results[b.dataset.x]); });
    $('#mixGo').disabled = false; $('#mixGo').textContent = '🧪 넣고 흔들기';
    mxParticles();
  }
  const mxMixP = () => smooth((MX.p - 0.25) / 0.5);
  // 입자 목록: 종류별 (가로 위치, 세로 위치(0~1), 속도)
  function mxParticles() {
    const d = MXD[MX.x], list = [];
    const add = (k, n) => { for (let i = 0; i < n; i++) list.push({ k, x: rnd(0.1, 0.9), y: rnd(0.25, 0.95), u: rnd(0, 1), vx: 0, vy: 0, ph: rnd(0, 6) }); };
    if (MX.x === 'we') { add('water', 12); add('ethanol', 7); }
    else if (MX.x === 'wh') { add('water', 12); add('hexane', 6); }
    else if (MX.x === 'wi') { add('water', 14); add('iodine', 6); }
    else { add('hexane', 12); add('iodine', 6); }
    MX.parts = list; void d;
  }
  // 입자의 목표 세로 구간 (0 위 ~ 1 아래)
  function mxZone(k) {
    const m = mxMixP(), emul = Math.sin(clamp((MX.p - 0.2) / 0.5, 0, 1) * Math.PI);   // 흔드는 동안 잠깐 섞임
    if (MX.x === 'we') { if (k === 'water') return [lerp(0.5, 0.2, m), 1]; return [0.2, lerp(0.5, 1, m)]; }
    if (MX.x === 'wh') { if (k === 'water') return [lerp(0.5, 0.2, emul), 1]; return [0.2, lerp(0.5, 1, emul)]; }
    if (MX.x === 'wi') { if (k === 'water') return [0.2, 1]; return [0.9, 1]; }
    if (k === 'hexane') return [0.2, 1];
    return [lerp(0.9, 0.2, m), 1];
  }
  function mxGo() {
    if (MX.running) return;
    mxReset(); MX.running = true;
    $('#mixGo').disabled = true; $('#mixGo').textContent = '관찰 중…';
    Sound.click();
    const tok = MX.tok, d = MXD[MX.x];
    MX.tw = tween(MX, { p: 1 }, { duration: RM ? 0.05 : 5.2, ease: 'linear', onDone: () => {
      if (tok !== MX.tok) return;
      MX.running = false; MX.results[MX.x] = true; Sound.success();
      $('#mixGo').disabled = false; $('#mixGo').textContent = '🧪 다시 해 보기';
      $$('#mixSel .opt').forEach((b) => b.classList.toggle('done', !!MX.results[b.dataset.x]));
      if (S.scene === 'mix') showHint(d.name + ': ' + d.res + ' (' + d.why + ')', 5500);
    } });
  }
  const mxCount = () => Object.keys(MX.results).filter((k) => MX.results[k]).length;
  function stepMix(dt) {
    const L = MXL;
    MX.parts.forEach((q) => {
      const z = mxZone(q.k), ya = z[0], yb = z[1];
      q.vx += rnd(-1, 1) * 140 * dt; q.vy += rnd(-1, 1) * 140 * dt;
      q.vx *= Math.exp(-2.2 * dt); q.vy *= Math.exp(-2.2 * dt);
      q.x += q.vx * dt / L.iw; q.y += q.vy * dt / L.ih;
      if (q.x < 0.08) { q.x = 0.08; q.vx = Math.abs(q.vx); } if (q.x > 0.92) { q.x = 0.92; q.vx = -Math.abs(q.vx); }
      const target = clamp(ya + 0.04 + (yb - ya - 0.08) * q.u + Math.sin(NOW * 0.9 + q.ph) * 0.015, ya + 0.04, yb - 0.04);
      q.y = RM ? target : approach(q.y, target, dt, 3.5);
      if (q.k === 'iodine' && MX.x === 'wi') { q.x = approach(q.x, 0.5 + Math.sin(q.ph) * 0.3, dt, 0.6); }
    });
  }
  function drawMixBeaker(t) {
    const L = MXL, m = mxMixP(), p = MX.p, d = MXD[MX.x];
    const shake = MX.running && p > 0.2 && p < 0.7 && !RM ? Math.sin(t * 38) * 5 * Math.sin(clamp((p - 0.2) / 0.5, 0, 1) * Math.PI) : 0;
    ctx.save(); ctx.translate(shake, 0);
    const x = L.bx, y = L.by, w = L.bw, h = L.bh;
    D.beaker(x, y, w, h, { level: 0 });
    ctx.save();
    D.roundRect(x + 3, y, w - 6, h - 3, 8); ctx.clip();
    const bottom = y + h - 6, lvl = h * 0.74;
    const emul = Math.sin(clamp((p - 0.2) / 0.5, 0, 1) * Math.PI);
    const layer = (y0, y1, col, a) => { ctx.fillStyle = CO.rgba(col, a); ctx.fillRect(x, y0, w, y1 - y0); };
    if (MX.x === 'we') {
      const wy = bottom - lvl * 0.68, top = bottom - lvl;
      const mixed = CO.mix('#7cc4ff', '#a7f3d0', 0.3);
      layer(wy, bottom, CO.mix('#7cc4ff', mixed, m), 0.8);
      const added = clamp(p / 0.12, 0, 1);
      layer(top + (1 - added) * 12, wy, CO.mix('#a7f3d0', mixed, m), 0.8 * added);
      if (m < 0.98) { ctx.strokeStyle = 'rgba(255,255,255,' + (0.8 * (1 - m)) + ')'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, wy); ctx.lineTo(x + w, wy); ctx.stroke(); }
    } else if (MX.x === 'wh') {
      const wy = bottom - lvl * 0.68, top = bottom - lvl;
      layer(wy, bottom, '#7cc4ff', 0.8);
      const added = clamp(p / 0.12, 0, 1);
      layer(top + (1 - added) * 12, wy, '#fde68a', 0.7 * added);
      ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, wy); ctx.lineTo(x + w, wy); ctx.stroke();
      // 흔드는 동안 작은 방울
      if (emul > 0.05) for (let i = 0; i < 46; i++) { const px = x + ((i * 53 + Math.sin(t * 3 + i) * 10) % w + w) % w, py = top + 14 + ((i * 37 + t * 40 * (i % 3 + 1)) % (lvl - 24)); ctx.fillStyle = (i % 2 ? 'rgba(253,230,138,' : 'rgba(124,196,255,') + (0.7 * emul) + ')'; ctx.beginPath(); ctx.arc(px, py, 3 + (i % 3), 0, TAU); ctx.fill(); }
    } else if (MX.x === 'wi') {
      const top = bottom - lvl;
      layer(top, bottom, CO.mix('#7cc4ff', '#d6a35c', 0.18 * m), 0.8);
    } else {
      const top = bottom - lvl;
      const col = CO.mix('#fde68a', '#7e22ce', m);
      layer(top, bottom, col, 0.78 + 0.1 * m);
    }
    // 아이오딘 고체 조각
    if (MX.x === 'wi' || MX.x === 'hi') {
      const fall = smooth(clamp((p - 0.04) / 0.2, 0, 1));
      const dis = MX.x === 'hi' ? m : 0.05 * m;
      for (let i = 0; i < 7; i++) {
        const px = x + w * (0.25 + 0.5 * ((i * 0.37) % 1)) + Math.sin(i * 3) * 8, py = lerp(y - 10, bottom - 8 - (i % 2) * 5, fall);
        ctx.save(); ctx.translate(px, py); ctx.rotate(i * 0.9); ctx.globalAlpha *= (1 - 0.95 * dis);
        ctx.fillStyle = '#3b0764'; ctx.beginPath(); ctx.moveTo(-7, -4); ctx.lineTo(5, -6); ctx.lineTo(8, 3); ctx.lineTo(-3, 7); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(-4, -3, 4, 2);
        ctx.restore();
      }
    }
    ctx.restore();
    ctx.restore();
    D.text(x + w / 2, y + h + 30, d.name, { size: fs(15), weight: 800, color: '#4c1d95' });
  }
  const KIND_NAME = { water: '물', ethanol: '에탄올', hexane: '헥세인', iodine: '아이오딘(I₂)' };
  function drawMix(t) {
    const L = MXL, d = MXD[MX.x], p = MX.p;
    D.text(VW / 2, TY, '극성끼리, 무극성끼리 잘 섞여요', { size: fs(17), weight: 800, color: '#4c1d95' });
    drawMixBeaker(t);
    // 입자 모형 창
    ctx.save();
    D.shadow(() => { D.roundRect(L.ix, L.iy, L.iw, L.ih, 16); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: 10, y: 3 });
    D.text(L.ix + L.iw / 2, L.iy + 22, '🔍 입자 모형으로 보기', { size: fs(14), weight: 800, color: '#4c1d95' });
    D.roundRect(L.ix + 8, L.iy + 36, L.iw - 16, L.ih - 44, 10); ctx.clip();
    const bx = L.ix + 8, by = L.iy + 36 - 0, bw = L.iw - 16, bh = L.ih - 44;
    // 층 배경 (구역): 극성 용매는 파랑, 무극성 용매는 노랑
    [['water', '#7cc4ff'], ['hexane', '#fde68a']].forEach(([k, c]) => { const q0 = MX.parts.find((q) => q.k === k); if (!q0) return; const z = mxZone(k); ctx.fillStyle = CO.rgba(c, 0.22); ctx.fillRect(bx, by + 0.05 * bh + z[0] * bh * 0.95, bw, (z[1] - z[0]) * bh * 0.95); });
    // 극성 분자 사이 인력선
    const pos = MX.parts.map((q) => ({ q, x: bx + q.x * bw, y: by + 0.05 * bh + q.y * bh * 0.95 }));
    ctx.lineCap = 'round';
    for (let i = 0; i < pos.length; i++) for (let j = i + 1; j < pos.length; j++) {
      const a = pos[i], b = pos[j];
      const ap = a.q.k === 'water' || a.q.k === 'ethanol', bp = b.q.k === 'water' || b.q.k === 'ethanol';
      if (!(ap && bp)) continue;
      const dd = Math.hypot(a.x - b.x, a.y - b.y);
      if (dd < (PHONE ? 70 : 60)) { ctx.strokeStyle = 'rgba(124,58,237,' + (0.5 * (1 - dd / 70)) + ')'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
    }
    pos.forEach((o) => {
      const k = o.q.k, ang = k === 'water' || k === 'ethanol' ? Math.sin(t * 0.8 + o.q.ph) * 0.5 + (k === 'ethanol' ? 0 : Math.PI) : t * 0.4 + o.q.ph;
      molGlyph(k, o.x, o.y, ang, PHONE ? 0.62 : 0.6, { pm: false });
    });
    ctx.restore();
    // 범례
    const kinds = [d.base, d.add];
    ctx.save();
    kinds.forEach((k, i) => {
      const pol = k === 'water' || k === 'ethanol';
      D.label(L.ix + L.iw * (0.28 + i * 0.44), L.iy + L.ih + 20, KIND_NAME[k] + (pol ? ' · 극성' : ' · 무극성'), { size: fs(12), bg: pol ? '#ede9fe' : '#f1f5f9', color: pol ? '#5b21b6' : '#334155', border: pol ? '#8b5cf6' : '#94a3b8', pad: 7 });
    });
    ctx.restore();
    if (MX.results[MX.x] && !MX.running) D.label(L.bx + L.bw / 2, L.by - 30, d.res + ' · ' + d.why, { size: fs(14), bg: '#dcfce7', color: '#0b6b39', border: '#14a058', pad: 11 });
    else if (!MX.running && p === 0) D.text(L.bx + L.bw / 2, L.by - 22, '“넣고 흔들기”를 눌러요', { size: fs(13.5), weight: 800, color: '#7c3aed' });
  }

  /* =========================================================
     ② 끓는점 그래프
     ========================================================= */
  const BPD = [
    { k: 'CH4', f: 'CH₄', bp: -162, M: 16, polar: false, grp: 0 },
    { k: 'NH3', f: 'NH₃', bp: -33, M: 17, polar: true, grp: 0 },
    { k: 'H2O', f: 'H₂O', bp: 100, M: 18, polar: true, grp: 0 },
    { k: 'F2', f: 'F₂', bp: -188, M: 38, polar: false, grp: 1 },
    { k: 'HCl', f: 'HCl', bp: -85, M: 36.5, polar: true, grp: 1 },
  ];
  const BP = { sel: 'H2O', pol: false, k: 1, seen: {} };
  const BPL = PHONE ? { x: 50, y: 120, w: 460, h: 330, ix: 60, iy: 520, iw: 440, ih: 200 } : { x: 60, y: 108, w: 450, h: 340, ix: 540, iy: 120, iw: 230, ih: 300 };
  const bpY = (v) => BPL.y + BPL.h - (v + 200) / 320 * BPL.h;
  function bpBarX(i) { const slot = BPL.w / 5.6; return BPL.x + 18 + slot * (i + (i >= 3 ? 0.6 : 0)) + slot * 0.1; }
  const bpBarW = () => (BPL.w / 5.6) * 0.72;
  function bpEnter() { BP.k = 0; tween(BP, { k: 1 }, { duration: RM ? 0.01 : 1.1, ease: 'outCubic' }); }
  function bpHit(p) {
    for (let i = 0; i < BPD.length; i++) { const x = bpBarX(i), w = bpBarW(); if (p.x >= x - 6 && p.x <= x + w + 6 && p.y >= BPL.y - 20 && p.y <= BPL.y + BPL.h + 50) return BPD[i]; }
    return null;
  }
  function bpSelect(k) { BP.sel = k; BP.seen[k] = true; Sound.tick(); }
  function drawBP(t) {
    D.text(VW / 2, TY - 4, '분자량이 비슷해도 끓는점이 달라요', { size: fs(17), weight: 800, color: '#4c1d95' });
    // 축
    ctx.save(); ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1.5; ctx.fillStyle = MUTED;
    [-200, -150, -100, -50, 0, 50, 100].forEach((v) => {
      const y = bpY(v); ctx.beginPath(); ctx.moveTo(BPL.x, y); ctx.lineTo(BPL.x + BPL.w, y); ctx.setLineDash(v === 0 ? [] : [4, 5]); ctx.strokeStyle = v === 0 ? '#64748b' : '#d5dbe6'; ctx.stroke();
      D.text(BPL.x - 8, y + 4, String(v), { size: fs(11.5), weight: 700, color: MUTED, align: 'right' });
    });
    ctx.restore();
    D.text(BPL.x - 30, BPL.y - 14, '끓는점(°C)', { size: fs(12), weight: 800, color: MUTED, align: 'left' });
    BPD.forEach((b, i) => {
      const x = bpBarX(i), w = bpBarW(), top = bpY(b.bp), base = bpY(-200), h = (base - top) * BP.k, y = base - h;
      const col = BP.pol ? (b.polar ? '#8b5cf6' : '#94a3b8') : '#60a5fa';
      ctx.save();
      D.shadow(() => { D.roundRect(x, y, w, Math.max(0, h), 6); const g = ctx.createLinearGradient(0, y, 0, base); g.addColorStop(0, CO.shade(col, 0.25)); g.addColorStop(1, col); ctx.fillStyle = g; ctx.fill(); }, { blur: 6, y: 2 });
      if (BP.sel === b.k) { ctx.strokeStyle = '#1b2333'; ctx.lineWidth = 3; D.roundRect(x, y, w, Math.max(0, h), 6); ctx.stroke(); }
      ctx.restore();
      D.text(x + w / 2, y - 7, String(Math.round(b.bp * BP.k)), { size: fs(14), weight: 800, color: INK });
      D.text(x + w / 2, base + 18, b.f, { size: fs(14), weight: 800, color: INK });
      D.text(x + w / 2, base + 34, '분자량 ' + b.M, { size: fs(11), weight: 700, color: MUTED });
      if (BP.pol) D.label(x + w / 2, base + 54, b.polar ? '극성' : '무극성', { size: fs(11.5), bg: b.polar ? '#ede9fe' : '#f1f5f9', color: b.polar ? '#5b21b6' : '#334155', border: b.polar ? '#8b5cf6' : '#94a3b8', pad: 6 });
    });
    // 입자 모형 창 (선택한 물질)
    const b = BPD.find((q) => q.k === BP.sel), L = BPL;
    ctx.save();
    D.shadow(() => { D.roundRect(L.ix, L.iy, L.iw, L.ih, 14); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: 10, y: 3 });
    D.text(L.ix + L.iw / 2, L.iy + 22, '🔍 ' + b.f + ' 입자 모형', { size: fs(14), weight: 800, color: '#4c1d95' });
    const gap = b.polar ? 38 : 52, cols = 3, rows = 3;
    const cx0 = L.ix + L.iw / 2 - gap * (cols - 1) / 2, cy0 = L.iy + 36 + (L.ih - 90) / 2 + 22;
    const pts = [];
    for (let r_ = 0; r_ < rows; r_++) for (let c_ = 0; c_ < cols; c_++) {
      const jit = (b.polar ? 2.5 : 6.5), i = r_ * cols + c_;
      pts.push({ x: cx0 + c_ * gap + (RM ? 0 : Math.sin(t * 2.1 + i * 1.9) * jit), y: cy0 + r_ * gap + (RM ? 0 : Math.cos(t * 1.7 + i * 2.3) * jit) });
    }
    pts.forEach((a, i) => pts.forEach((c, j) => {
      if (j <= i) return;
      const dd = Math.hypot(a.x - c.x, a.y - c.y);
      if (dd < gap * 1.25) { ctx.strokeStyle = b.polar ? 'rgba(124,58,237,.75)' : 'rgba(100,116,139,.35)'; ctx.lineWidth = b.polar ? 3 : 1.2; ctx.setLineDash(b.polar ? [] : [3, 4]); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(c.x, c.y); ctx.stroke(); ctx.setLineDash([]); }
    }));
    pts.forEach((a, i) => {
      if (b.polar) { ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(i % 2 ? 0 : Math.PI); ctx.beginPath(); ctx.arc(0, 0, 13, Math.PI / 2, -Math.PI / 2); ctx.fillStyle = '#fca5a5'; ctx.fill(); ctx.beginPath(); ctx.arc(0, 0, 13, -Math.PI / 2, Math.PI / 2); ctx.fillStyle = '#93c5fd'; ctx.fill(); ctx.strokeStyle = '#64748b'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 0, 13, 0, TAU); ctx.stroke(); ctx.restore(); }
      else D.sphere(a.x, a.y, 13, '#94a3b8', { shadow: false });
    });
    D.text(L.ix + L.iw / 2, L.iy + L.ih - 22, b.polar ? '극성 분자: 분자 사이 인력이 커요' : '무극성 분자: 분자 사이 인력이 작아요', { size: fs(12), weight: 800, color: b.polar ? '#5b21b6' : '#334155' });
    if (b.k === 'H2O' || b.k === 'NH3') D.text(L.ix + L.iw / 2, L.iy + L.ih - 6, '(수소 결합 · 이름만 알아 둬요)', { size: fs(11), weight: 700, color: MUTED });
    ctx.restore();
  }

  /* ---------- 물리적 성질 관찰표 ---------- */
  const OBS = [
    ['we', '물 + 에탄올', ['섞여요', '층이 나뉘어요', '거의 녹지 않아요', '잘 녹아요(보라색)'], '섞여요'],
    ['wh', '물 + 헥세인', ['섞여요', '층이 나뉘어요', '거의 녹지 않아요', '잘 녹아요(보라색)'], '층이 나뉘어요'],
    ['wi', '물 + 아이오딘', ['섞여요', '층이 나뉘어요', '거의 녹지 않아요', '잘 녹아요(보라색)'], '거의 녹지 않아요'],
    ['hi', '헥세인 + 아이오딘', ['섞여요', '층이 나뉘어요', '거의 녹지 않아요', '잘 녹아요(보라색)'], '잘 녹아요(보라색)'],
    ['bp1', 'CH₄ · NH₃ · H₂O 중 끓는점이 가장 높은 것', ['CH₄', 'NH₃', 'H₂O'], 'H₂O'],
    ['bp2', 'F₂와 HCl 중 끓는점이 더 높은 것', ['F₂', 'HCl'], 'HCl'],
  ];
  function buildSelTable(body, rows, extra) {
    rows.forEach((r) => {
      const tr = document.createElement('tr');
      tr.innerHTML = '<td style="width:44%">' + r[1] + '</td><td><select data-k="' + r[0] + '" aria-label="' + r[1] + '"><option value="">?</option>' + r[2].map((o) => '<option>' + o + '</option>').join('') + '</select></td>';
      body.appendChild(tr);
    });
    $$('select', body).forEach((sel) => sel.addEventListener('change', () => {
      Sound.click();
      const r = rows.find((q) => q[0] === sel.dataset.k);
      sel.classList.remove('ok', 'bad');
      if (sel.value !== '') sel.classList.add(sel.value === r[3] ? 'ok' : 'bad');
      extra && extra();
    }));
  }
  function selCheck(body, rows, msgMiss, msgWrong) {
    let miss = 0, wrong = 0;
    $$('select', body).forEach((sel) => { const r = rows.find((q) => q[0] === sel.dataset.k); if (sel.value === '') miss++; else if (sel.value !== r[3]) wrong++; });
    if (miss) return msgMiss.replace('N', miss);
    if (wrong) return msgWrong.replace('N', wrong);
    return true;
  }
  const obsFilled = () => $$('#obsBody select').filter((s) => s.value !== '').length;
  const obsCheck = () => selCheck($('#obsBody'), OBS, '표의 빈칸이 N칸 남았어요. 섞기 실험과 끓는점 그래프를 살펴봐요.', '빨간색 칸이 N곳 틀렸어요. 극성은 극성끼리, 무극성은 무극성끼리 잘 섞이고 극성이 크면 끓는점이 높아요.');

  /* =========================================================
     ③ 같은 분자식 C₂H₆O, 다른 구조: 에탄올과 다이메틸 에터
     ========================================================= */
  // 사슬 구조 만들기: 뼈대 원소 목록 + 수소 수 (정사면체 각도)
  function buildChain(elems, hCounts) {
    const th = 35.2644 * Math.PI / 180, L = 74, atoms = [], bonds = [];
    const heavy = elems.map((e, i) => [i * L * Math.cos(th) - (elems.length - 1) * L * Math.cos(th) / 2, (i % 2 ? 1 : -1) * L * Math.sin(th) / 2, 0]);
    elems.forEach((e, i) => atoms.push({ e, p: heavy[i] }));
    for (let i = 0; i < elems.length - 1; i++) bonds.push([i, i + 1, 1]);
    elems.forEach((e, i) => {
      const ex = [];
      if (i > 0) ex.push(vnorm(vsub(heavy[i - 1], heavy[i])));
      if (i < elems.length - 1) ex.push(vnorm(vsub(heavy[i + 1], heavy[i])));
      const fill = tetraFill(ex);
      for (let k = 0; k < hCounts[i]; k++) { atoms.push({ e: 'H', p: vadd(heavy[i], vmul(fill[k], 48)) }); bonds.push([i, atoms.length - 1, 1]); }
    });
    return { atoms, bonds };
  }
  const ISO = {
    eth: { f: 'CH₃CH₂OH', name: '에탄올', g: buildChain(['C', 'C', 'O'], [3, 2, 1]), bp: '78 °C (액체)', rx: true },
    dme: { f: 'CH₃OCH₃', name: '다이메틸 에터', g: buildChain(['C', 'O', 'C'], [3, 0, 3]), bp: '−24 °C (상온에서 기체)', rx: false },
  };
  const IS = { sel: 'eth', tested: {}, na: -1, bub: [] };
  const ISL = PHONE ? { lx: 150, ly: 300, cx: 410, cy: 190 } : { lx: 190, ly: 330, cx: 590, cy: 300 };
  function isSet(k) {
    IS.sel = k; IS.na = -1; IS.bub = [];
    $$('#isoSel button').forEach((b) => b.classList.toggle('on', b.dataset.i === k));
    $('#naBtn').disabled = false; $('#naBtn').textContent = '🧂 나트륨 조각 넣기';
    Sound.click();
  }
  function isNa() {
    if (IS.na >= 0) { IS.na = -1; IS.bub = []; }
    IS.na = 0; Sound.tick(); $('#naBtn').textContent = '🔄 다시 넣기';
  }
  const isCount = () => ['eth', 'dme'].filter((k) => IS.tested[k]).length;
  function stepIso(dt) {
    if (IS.na >= 0) {
      IS.na += dt;
      const I = ISO[IS.sel];
      if (I.rx && IS.na > 0.6 && !RM) { IS.bub.push({ x: rnd(-22, 22), y: 0, v: rnd(40, 90), r: rnd(2, 5), a: 1 }); }
      if (I.rx) IS.bub = IS.bub.filter((b) => { b.y += b.v * dt; b.a -= dt * 0.9; return b.a > 0 && b.y < 80; });
      if (IS.na > 2.2 && !IS.tested[IS.sel]) {
        IS.tested[IS.sel] = true; Sound.success();
        showHint(I.rx ? '에탄올 + 나트륨 → 수소(H₂) 기체 발생! O–H 결합이 있어서 반응해요' : '다이메틸 에터는 나트륨과 반응하지 않아요 (O–H 결합 없음)', 5500);
        fx.burst(ISL.lx, ISL.ly - 40, { count: 14, colors: I.rx ? ['#fbbf24', '#fff', '#93c5fd'] : ['#cbd5e1', '#fff'], speed: 100, size: 3, gravity: 0 });
      }
    }
  }
  const naPiece = (x, y, s) => { ctx.save(); ctx.translate(x, y); D.shadow(() => { D.roundRect(-14 * s, -10 * s, 28 * s, 20 * s, 4); ctx.fillStyle = '#cbd5e1'; ctx.fill(); }, { blur: 4, y: 2 }); ctx.strokeStyle = '#64748b'; ctx.lineWidth = 1.5; D.roundRect(-14 * s, -10 * s, 28 * s, 20 * s, 4); ctx.stroke(); D.text(0, 4, 'Na', { size: 11 * s + 2, weight: 800, color: '#475569' }); ctx.restore(); };
  function drawIso(t) {
    const I = ISO[IS.sel], C = { x: ISL.cx, y: ISL.cy }, lx = ISL.lx, ly = ISL.ly;
    D.text(VW / 2, TY, '분자식은 C₂H₆O로 같아요', { size: fs(17), weight: 800, color: '#4c1d95' });
    // 실험 장면
    const bw = 150, bh = 170, bx = lx - bw / 2, by = ly - 70;
    if (I.rx) {
      D.beaker(bx, by, bw, bh, { level: 0.5, liquid: '#c4b5fd', t });
    } else {
      D.beaker(bx, by, bw, bh, { level: 0 });
      // 기체 입자
      for (let i = 0; i < 16; i++) { const px = bx + 14 + ((i * 47 + t * 30 * (1 + (i % 3) * 0.4)) % (bw - 28)), py = by + 20 + ((i * 61 + Math.sin(t * 1.6 + i) * 20 + t * 22 * ((i % 4) + 1)) % (bh - 40)); ctx.fillStyle = 'rgba(167,139,250,.55)'; ctx.beginPath(); ctx.arc(px, py, 4.5, 0, TAU); ctx.fill(); }
    }
    D.label(lx, by + bh + 26, I.name + ' · ' + I.bp, { size: fs(13), bg: '#fff', color: INK, border: '#c4b5fd', pad: 10 });
    // 나트륨 조각 + 반응
    if (IS.na >= 0) {
      const dropT = clamp(IS.na / 0.6, 0, 1);
      if (I.rx) {
        const surf = by + bh - bh * 0.5, sink = by + bh - 8;
        const s = clamp(1 - Math.max(0, IS.na - 0.6) / 4, 0.35, 1);
        const y = lerp(by - 40, surf - 4, smooth(dropT)) + (RM ? 0 : Math.sin(IS.na * 12) * 2 * (dropT >= 1 ? 1 : 0)), x = lx + (RM ? 0 : Math.sin(IS.na * 3) * 10);
        naPiece(x, y, s * 1.35);
        IS.bub.forEach((b) => { ctx.save(); ctx.globalAlpha = Math.max(0, b.a); ctx.strokeStyle = '#60a5fa'; ctx.lineWidth = 1.6; ctx.fillStyle = 'rgba(255,255,255,.65)'; ctx.beginPath(); ctx.arc(x + b.x, surf - 4 - b.y, b.r, 0, TAU); ctx.fill(); ctx.stroke(); ctx.restore(); });
        if (IS.na > 0.8) D.label(x + 60, surf - 70, 'H₂ 기체 발생', { size: fs(12.5), bg: '#2563eb', color: '#fff', pad: 8 });
        void sink;
      } else {
        const y = lerp(by - 40, by + bh - 22, smooth(dropT));
        naPiece(lx, y, 1.3);
        if (IS.na > 1.0) D.label(lx + 4, by + bh - 66, '반응 없음', { size: fs(12.5), bg: '#64748b', color: '#fff', pad: 8 });
      }
    }
    if (IS.na < 0) D.text(lx, by - 22, '나트륨을 넣어 볼까요?', { size: fs(13), weight: 800, color: '#7c3aed' });
    // 분자 구조
    drawMolecule3D(I.g, C, PHONE ? 1.15 : 1.55, { arrows: false });
    const oi = I.g.atoms.findIndex((a) => a.e === 'O');
    if (IS.sel === 'eth') {
      const hi = I.g.atoms.findIndex((a, i) => a.e === 'H' && I.g.bonds.some(([x, y]) => (x === oi && y === i) || (y === oi && x === i)));
      const q = proj(C, PHONE ? 1.15 : 1.55, vmul(rot(vadd(I.g.atoms[oi].p, I.g.atoms[hi].p)), 0.5));
      ctx.save(); ctx.strokeStyle = 'rgba(245,158,11,' + (0.6 + 0.3 * Math.sin(t * 5)) + ')'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(q.x, q.y, 26, 0, TAU); ctx.stroke(); ctx.restore();
      D.label(q.x, q.y - 42, 'O–H 결합', { size: fs(12.5), bg: '#f59e0b', color: '#fff', pad: 8 });
    } else {
      const q = proj(C, PHONE ? 1.15 : 1.55, rot(I.g.atoms[oi].p));
      D.label(q.x, q.y - 42, 'C–O–C (O–H 없음)', { size: fs(12.5), bg: '#64748b', color: '#fff', pad: 8 });
    }
    D.text(C.x, C.y + (PHONE ? 115 : 160), I.f + ' · 화면을 끌어 돌려 보세요', { size: fs(12.5), weight: 700, color: MUTED });
  }

  /* =========================================================
     ③ N≡N 과 O=O: 결합 수와 반응성
     ========================================================= */
  const BD = { g: 'N2', sp: -1, tested: {} };
  const bdL = PHONE ? { mx: 280, my: 190, jx: 280, jy: 420 } : { mx: 400, my: 175, jx: 400, jy: 330 };
  function bdSet(g) { BD.g = g; BD.sp = -1; $$('#gasSel button').forEach((b) => b.classList.toggle('on', b.dataset.g === g)); $('#splintBtn').textContent = '🔥 꺼져 가는 불씨 넣기'; Sound.click(); }
  function bdSplint() { BD.sp = 0; Sound.tick(); $('#splintBtn').textContent = '🔄 다시 넣기'; }
  const bdCount = () => ['N2', 'O2'].filter((k) => BD.tested[k]).length;
  function stepBonds(dt) {
    if (BD.sp >= 0) {
      BD.sp += dt;
      if (BD.sp > 2.4 && !BD.tested[BD.g]) {
        BD.tested[BD.g] = true; Sound.success();
        showHint(BD.g === 'O2' ? 'O₂에서는 불씨가 활활 타올라요: 반응성이 커요 (연소에 참여)' : 'N₂에서는 불씨가 꺼져요: 삼중 결합이라 반응성이 매우 낮아요', 5500);
      }
    }
  }
  function drawBonds(t) {
    const g = BD.g, L = bdL, n = g === 'N2' ? 3 : 2, col = g === 'N2' ? '#3867f4' : '#e2464b';
    D.text(VW / 2, TY, g === 'N2' ? '질소 N≡N: 공유 전자쌍 3쌍' : '산소 O=O: 공유 전자쌍 2쌍', { size: fs(17), weight: 800, color: '#4c1d95' });
    // 분자 막대-공
    const ax = L.mx - 62, bx = L.mx + 62;
    for (let k = 0; k < n; k++) {
      const off = (k - (n - 1) / 2) * 20;
      D.roundRect(ax + 20, L.my + off - 8, bx - ax - 40, 16, 8); ctx.fillStyle = 'rgba(20,160,88,.16)'; ctx.fill(); ctx.strokeStyle = '#14a058'; ctx.lineWidth = 2; ctx.stroke();
      D.sphere(L.mx - 8, L.my + off, 4.8, '#34d399', { shadow: false }); D.sphere(L.mx + 8, L.my + off, 4.8, '#34d399', { shadow: false });
    }
    D.sphere(ax, L.my, 30, col, { shadow: true, text: g === 'N2' ? 'N' : 'O', textColor: '#fff' }); D.sphere(bx, L.my, 30, col, { shadow: true, text: g === 'N2' ? 'N' : 'O', textColor: '#fff' });
    D.text(L.mx, L.my + 70, (g === 'N2' ? 'N≡N 삼중 결합' : 'O=O 이중 결합') + ' · 결합 전자쌍 ' + n + '쌍', { size: fs(13.5), weight: 800, color: INK });
    // 반응성 막대
    const mx0 = L.mx - 130, my0 = L.my + 98, mw = 260;
    D.text(mx0, my0 - 6, '반응성', { size: fs(12), weight: 800, color: MUTED, align: 'left' });
    D.roundRect(mx0 + 52, my0 - 16, mw - 52, 14, 7); ctx.fillStyle = '#e2e8f0'; ctx.fill();
    D.roundRect(mx0 + 52, my0 - 16, (mw - 52) * (g === 'N2' ? 0.08 : 0.8), 14, 7); ctx.fillStyle = g === 'N2' ? '#3867f4' : '#e2464b'; ctx.fill();
    D.text(mx0 + mw + 6, my0 - 4, g === 'N2' ? '매우 낮음' : '큼', { size: fs(12), weight: 800, color: INK, align: 'left' });
    // 기체 집기병
    const jw = 130, jh = 150, jx = L.jx - jw / 2, jy = L.jy + (PHONE ? 20 : 20);
    D.beaker(jx, jy, jw, jh, { level: 0 });
    ctx.save(); ctx.fillStyle = col === '#3867f4' ? 'rgba(96,165,250,.12)' : 'rgba(248,113,113,.12)'; ctx.fillRect(jx + 3, jy + 4, jw - 6, jh - 8); ctx.restore();
    for (let i = 0; i < 14; i++) { const px = jx + 14 + ((i * 41 + t * 24 * (1 + (i % 3) * 0.3)) % (jw - 28)), py = jy + 16 + ((i * 53 + Math.sin(t * 1.3 + i) * 14 + t * 18 * ((i % 4) + 1)) % (jh - 30)); D.sphere(px, py, 6, col, { shadow: false, gloss: false }); D.sphere(px + 9, py + 2, 6, col, { shadow: false, gloss: false }); }
    D.label(L.jx, jy + jh + 24, (g === 'N2' ? '질소(N₂) 기체' : '산소(O₂) 기체') + '가 든 병', { size: fs(13), bg: '#fff', color: INK, border: '#cbd5e1', pad: 10 });
    // 불씨
    const sy0 = jy - 90, sy1 = jy + 62;
    if (BD.sp >= 0) {
      const dropT = smooth(clamp(BD.sp / 1.0, 0, 1)), y = lerp(sy0, sy1, dropT), sx = L.jx + 6;
      ctx.save(); ctx.strokeStyle = '#a16207'; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(sx - 4, y - 80); ctx.lineTo(sx, y); ctx.stroke(); ctx.restore();
      if (g === 'O2') {
        const flare = clamp((BD.sp - 1.0) / 0.5, 0, 1);
        D.flame(sx, y + 4, 24 + 52 * flare, t, {});
        if (flare > 0.3) D.glow(sx, y - 20, 90 * flare, '#fb923c', 0.4);
      } else {
        const fade = clamp(1 - (BD.sp - 1.0) / 0.9, 0, 1);
        ctx.save(); ctx.globalAlpha = 0.25 + 0.75 * fade; ctx.fillStyle = fade > 0.2 ? '#fb923c' : '#475569'; ctx.beginPath(); ctx.arc(sx, y + 2, 5 + 3 * fade, 0, TAU); ctx.fill(); ctx.restore();
        if (BD.sp > 1.2 && BD.sp < 2.4 && !RM) fx.emit({ x: sx + rnd(-3, 3), y: y - 4, vx: rnd(-10, 10), vy: rnd(-40, -15), life: 1, size: rnd(5, 9), color: 'rgba(100,116,139,.5)', shape: 'smoke', gravity: -10 });
      }
      if (BD.sp > 1.5) D.label(L.jx + 90, jy + 30, g === 'O2' ? '불씨가 되살아나요!' : '불씨가 꺼져요', { size: fs(13), bg: g === 'O2' ? '#e2464b' : '#3867f4', color: '#fff', pad: 9 });
    } else D.text(L.jx, jy - 24, '불씨를 넣어 반응성을 확인해요', { size: fs(13), weight: 800, color: '#7c3aed' });
    if (BD.tested[g] && g === 'N2') D.label(L.jx, jy + jh + 56, '그래서 과자 봉지에 질소를 넣어요 🍪', { size: fs(12.5), bg: '#dbeafe', color: '#1e3a8a', border: '#3867f4', pad: 10 });
  }
  const BOND_ROWS = [
    ['r1', '나트륨과 반응해 H₂를 내는 것', ['에탄올', '다이메틸 에터'], '에탄올'],
    ['r2', '끓는점이 더 높은 것', ['에탄올', '다이메틸 에터'], '에탄올'],
    ['r3', 'N≡N의 공유 전자쌍 수', ['2쌍', '3쌍'], '3쌍'],
    ['r4', 'O=O의 공유 전자쌍 수', ['2쌍', '3쌍'], '2쌍'],
    ['r5', '반응성이 매우 낮아 식품 포장에 쓰는 것', ['N₂', 'O₂'], 'N₂'],
    ['r6', '불씨를 되살리는(연소에 참여하는) 것', ['N₂', 'O₂'], 'O₂'],
  ];
  const bondFilled = () => $$('#bondBody select').filter((s) => s.value !== '').length;
  const bondCheck = () => selCheck($('#bondBody'), BOND_ROWS, '표의 빈칸이 N칸 남았어요. 이성질체와 N₂ · O₂ 실험을 살펴봐요.', '빨간색 칸이 N곳 틀렸어요. O–H 결합이 있으면 나트륨과 반응하고, 결합 수가 많을수록 반응성이 낮아요.');

  /* =========================================================
     ④ 구조로 예측: 구조 → 극성 → 물과 섞이는가
     ========================================================= */
  function geomX(key) {
    if (key === 'CCl4') { const d = K4(0, 109.47); return { atoms: [{ e: 'C', p: [0, 0, 0] }, ...d.map((v) => ({ e: 'Cl', p: vmul(v, BL * 1.25) }))], bonds: [[0, 1, 1], [0, 2, 1], [0, 3, 1], [0, 4, 1]] }; }
    if (key === 'CH3OH') {
      const O = vmul([0, 1, 0], BL), hs = tetraFill([[0, 1, 0]]), hO = tetraFill([[0, -1, 0]])[0];
      return { atoms: [{ e: 'C', p: [0, 0, 0] }, { e: 'O', p: O }, ...hs.map((v) => ({ e: 'H', p: vmul(v, BL * 0.8) })), { e: 'H', p: vadd(O, vmul(hO, BL * 0.7)) }], bonds: [[0, 1, 1], [0, 2, 1], [0, 3, 1], [0, 4, 1], [1, 5, 1]] };
    }
    if (key === 'I2') return { atoms: [{ e: 'I', p: [-BL * 0.95, 0, 0] }, { e: 'I', p: [BL * 0.95, 0, 0] }], bonds: [[0, 1, 1]] };
    if (key === 'NH3') return geom('NH3');
    if (key === 'CO2') return geom('CO2', 180);
    return null;
  }
  const PRD = {
    CCl4: { f: 'CCl₄', name: '사염화 탄소', polar: false, mix: false, test: 'sink', why: 'C–Cl 결합은 극성이지만 정사면체 대칭이라 쌍극자가 상쇄돼요 → 무극성 분자. 극성인 물과 섞이지 않고, 물보다 무거워 아래로 가라앉아요.' },
    CH3OH: { f: 'CH₃OH', name: '메탄올', polar: true, mix: true, test: 'mix', why: 'C–O, O–H 극성 결합이 대칭을 이루지 않아 쌍극자가 합쳐져요 → 극성 분자. 극성인 물과 잘 섞여요.' },
    I2: { f: 'I₂', name: '아이오딘', polar: false, mix: false, test: 'solid', why: '같은 원자끼리의 I–I 결합이라 극성이 없어요 → 무극성 분자. 극성인 물에는 거의 녹지 않아요 (무극성 헥세인에는 잘 녹아요).' },
    NH3: { f: 'NH₃', name: '암모니아', polar: true, mix: true, test: 'gasdis', why: '삼각뿔 모양이라 N–H 쌍극자가 합쳐져요 → 극성 분자. 극성인 물에 매우 잘 녹아요.' },
    CO2: { f: 'CO₂', name: '이산화 탄소', polar: false, mix: false, test: 'gasup', why: '직선형이라 두 C=O 쌍극자가 상쇄돼요 → 무극성 분자. 극성인 물에 잘 섞이지 않고 대부분 기포로 올라가요.' },
    soap: { f: '비누', name: '비누 분자', soap: true, why: '머리는 극성이라 물과, 꼬리는 무극성이라 기름과 잘 섞여요. 꼬리가 기름때를 감싸고 머리가 물을 향해 기름때가 물에 씻겨 나가요.' },
  };
  const PKEYS4 = ['CCl4', 'CH3OH', 'I2', 'NH3', 'CO2', 'soap'];
  PKEYS4.forEach((k) => { if (k !== 'soap') PRD[k].g = geomX(k); });
  const PR = { c: 'CCl4', ans: {}, done: {}, hit: {}, t: -1 };
  PKEYS4.forEach((k) => { PR.ans[k] = { q1: '', q2: '' }; });
  const prQ = (c) => (c === 'soap'
    ? { l1: '🔮 비누 머리(−COO⁻)의 성질은?', o1: ['극성(물과 잘 섞여요)', '무극성(기름과 잘 섞여요)'], a1: '극성(물과 잘 섞여요)', l2: '🔮 긴 탄화수소 꼬리는 무엇과 잘 섞일까요?', o2: ['물', '기름'], a2: '기름' }
    : { l1: '🔮 분자의 극성을 예측해요', o1: ['극성 분자', '무극성 분자'], a1: PRD[c].polar ? '극성 분자' : '무극성 분자', l2: '🔮 물과 잘 섞일까요?', o2: ['물과 잘 섞여요', '물과 잘 섞이지 않아요'], a2: PRD[c].mix ? '물과 잘 섞여요' : '물과 잘 섞이지 않아요' });
  function prSelect(c) {
    PR.c = c; PR.t = -1;
    const q = prQ(c), a = PR.ans[c];
    $('#q1Lab').textContent = q.l1; $('#q2Lab').textContent = q.l2;
    $('#q1Sel').innerHTML = '<option value="">고르기</option>' + q.o1.map((o) => '<option>' + o + '</option>').join('');
    $('#q2Sel').innerHTML = '<option value="">고르기</option>' + q.o2.map((o) => '<option>' + o + '</option>').join('');
    $('#q1Sel').value = a.q1; $('#q2Sel').value = a.q2;
    $$('#cardSel .opt').forEach((b) => { b.classList.toggle('on', b.dataset.c === c); b.classList.toggle('done', !!PR.done[b.dataset.c]); });
    prUI();
  }
  function prUI() { $('#verifyBtn').disabled = !(PR.ans[PR.c].q1 && PR.ans[PR.c].q2); }
  function prVerify() {
    const c = PR.c, a = PR.ans[c], q = prQ(c);
    if (!(a.q1 && a.q2)) return;
    PR.t = 0; Sound.tick();
    const ok = a.q1 === q.a1 && a.q2 === q.a2;
    PR.done[c] = true; PR.hit[c] = ok;
    $$('#cardSel .opt').forEach((b) => b.classList.toggle('done', !!PR.done[b.dataset.c]));
    if (ok) { Sound.success(); fx.burst(PRC().x, PRC().y, { count: 22, colors: ['#8b5cf6', '#34d399', '#fbbf24'], speed: 160, size: 3.5 }); }
    else Sound.fail();
    showHint(ok ? '예측이 맞았어요!' : '예측과 달라요. 구조 → 극성 → 섞임 순서로 다시 생각해 봐요', 5000);
  }
  const prDoneCount = () => PKEYS4.filter((k) => PR.done[k]).length;
  const PRC = () => (PHONE ? { x: 280, y: 190 } : { x: 215, y: 300 });
  const PRW = PHONE ? { x: 150, y: 420, w: 260, h: 250 } : { x: 470, y: 150, w: 270, h: 320 };
  function drawWaterTest(kind, t, x, y, w, h) {
    ctx.save();
    D.beaker(x, y, w, h, { level: 0.72, liquid: '#9bd0ff', t: NOW });
    const wl = y + h - h * 0.72, bottom = y + h - 6;
    ctx.save(); D.roundRect(x + 3, y, w - 6, h - 3, 8); ctx.clip();
    if (t >= 0) {
      if (kind === 'mix') {
        const m = smooth((t - 1.0) / 2.2), drop = clamp(t / 0.8, 0, 1);
        ctx.fillStyle = CO.rgba('#bbf7d0', 0.8 * (1 - m)); ctx.fillRect(x, wl, w, 34 * drop * (1 - 0.0));
        ctx.fillStyle = CO.rgba('#a7f3d0', 0.5 * m); ctx.fillRect(x, wl, w, bottom - wl);
        if (t < 0.8) { ctx.fillStyle = '#bbf7d0'; ctx.beginPath(); ctx.arc(x + w / 2, lerp(y - 14, wl, drop), 6, 0, TAU); ctx.fill(); }
      } else if (kind === 'sink') {
        const fall = clamp(t / 1.4, 0, 1), grow = smooth((t - 0.8) / 1.6);
        if (fall < 1) for (let i = 0; i < 5; i++) { ctx.fillStyle = 'rgba(148,163,184,.9)'; ctx.beginPath(); ctx.arc(x + w * (0.3 + 0.1 * i), lerp(y - 10, bottom - 10, clamp(fall * 1.3 - i * 0.05, 0, 1)), 5, 0, TAU); ctx.fill(); }
        const hh = 46 * grow; ctx.fillStyle = 'rgba(148,163,184,.75)'; ctx.fillRect(x, bottom - hh, w, hh);
        if (grow > 0.2) { ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, bottom - hh); ctx.lineTo(x + w, bottom - hh); ctx.stroke(); }
      } else if (kind === 'solid') {
        const fall = smooth(clamp(t / 1.5, 0, 1));
        for (let i = 0; i < 6; i++) { ctx.save(); ctx.translate(x + w * (0.25 + 0.1 * i), lerp(y - 10, bottom - 8 - (i % 2) * 5, fall)); ctx.rotate(i); ctx.fillStyle = '#3b0764'; ctx.beginPath(); ctx.moveTo(-6, -4); ctx.lineTo(4, -6); ctx.lineTo(7, 3); ctx.lineTo(-3, 6); ctx.closePath(); ctx.fill(); ctx.restore(); }
        ctx.fillStyle = 'rgba(180,120,40,' + 0.08 * smooth((t - 1.5) / 2) + ')'; ctx.fillRect(x, wl, w, bottom - wl);
      } else if (kind === 'gasdis' || kind === 'gasup') {
        for (let i = 0; i < 7; i++) {
          const ph = ((t * 0.45 + i / 7) % 1), by_ = lerp(bottom - 4, wl, ph), bx_ = x + w * (0.3 + 0.07 * i) + Math.sin(t * 3 + i) * 6;
          const r = kind === 'gasdis' ? 7 * (1 - ph) : 6;
          if (kind === 'gasdis' && ph > 0.8) continue;
          ctx.strokeStyle = 'rgba(100,116,139,.9)'; ctx.lineWidth = 1.6; ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.arc(bx_, by_, Math.max(0.5, r), 0, TAU); ctx.fill(); ctx.stroke();
        }
        if (kind === 'gasdis') { ctx.fillStyle = 'rgba(147,197,253,' + 0.25 * smooth((t - 1) / 3) + ')'; ctx.fillRect(x, wl, w, bottom - wl); }
        else if (!RM && Math.random() < 0.15) fx.emit({ x: x + w * rnd(0.3, 0.8), y: wl - 2, vx: rnd(-30, 30), vy: rnd(-60, -20), life: 0.5, size: rnd(2, 3), color: '#cbd5e1', gravity: 200 });
      }
    }
    ctx.restore();
    ctx.restore();
  }
  function soapGlyph(x, y, ang, sc, o) {
    o = o || {};
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.scale(sc, sc);
    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 3.2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-8, 0);
    for (let i = 1; i <= 6; i++) ctx.lineTo(-8 - i * 6, i % 2 ? -4 : 4); ctx.stroke();
    D.sphere(0, 0, 8, '#60a5fa', { shadow: false, text: o.pm ? '−' : undefined, textColor: '#fff' });
    ctx.restore();
  }
  function drawPredict(t) {
    const c = PR.c, P = PRD[c], q = prQ(c), a = PR.ans[c], W_ = PRW;
    const ver = PR.t >= 0;
    D.text(VW / 2, TY, P.name + ' ' + (P.soap ? '' : P.f), { size: fs(18), weight: 800, color: '#4c1d95' });
    if (!P.soap) {
      const C = PRC(), S_ = PHONE ? 1.2 : 1.6;
      drawMolecule3D(P.g, C, S_, { arrows: ver });
      D.text(C.x, C.y + (PHONE ? 110 : 150), '화면을 끌어 돌려 구조를 살펴봐요', { size: fs(12.5), weight: 700, color: MUTED });
      if (ver) {
        const dp = dipoles(P.g), nl = vlen(netOf(dp));
        const pol = nl > 1e-6;
        D.label(C.x, C.y + (PHONE ? 134 : 172), pol ? '결합 쌍극자의 합 ≠ 0 → 극성 분자' : (dp.length ? '결합 쌍극자가 상쇄 → 무극성 분자' : '극성 결합이 없어요 → 무극성 분자'), { size: fs(13.5), bg: pol ? '#7c3aed' : '#14a058', color: '#fff', pad: 11 });
        if (pol) { const r = rot(vnorm(netOf(dp))), a0 = proj(C, S_, [0, 0, 0]); dipArrow(a0.x, a0.y, a0.x + r[0] * nl * 26 * S_, a0.y - r[1] * nl * 26 * S_, '#7c3aed', 8); }
      }
      // 물 시험
      D.text(W_.x + W_.w / 2, W_.y - 14, '💧 물에 넣어 보면?', { size: fs(14), weight: 800, color: '#4c1d95' });
      drawWaterTest(P.test, ver ? PR.t : -1, W_.x + W_.w / 2 - 70, W_.y + 10, 140, W_.h - 90);
      if (ver && PR.t > 2.2) D.label(W_.x + W_.w / 2, W_.y + W_.h - 56, P.mix ? '물과 잘 섞여요 (극성 + 극성)' : '물과 잘 섞이지 않아요', { size: fs(13), bg: P.mix ? '#dcfce7' : '#fee2e2', color: P.mix ? '#0b6b39' : '#991b1b', border: P.mix ? '#14a058' : '#e2464b', pad: 10 });
    } else drawSoap(t, ver);
    if (ver) {
      const ok1 = a.q1 === q.a1, ok2 = a.q2 === q.a2;
      D.label(VW / 2, PHONE ? VH - 24 : VH - fs(44), '예측 ' + (ok1 ? '✅' : '❌') + ' · ' + (ok2 ? '✅' : '❌') + '   ' + (ok1 && ok2 ? '모두 맞았어요!' : '결과를 비교해 봐요'), { size: fs(14), bg: ok1 && ok2 ? '#dcfce7' : '#fff7e0', color: ok1 && ok2 ? '#0b6b39' : '#92400e', border: ok1 && ok2 ? '#14a058' : '#f59e0b', pad: 12 });
      if (PR.t > 1.0) wrapText(P.why, VW / 2, PHONE ? VH - 112 : VH - 90, PHONE ? 520 : 720, PHONE ? 16 : 13.5, PHONE ? 20 : 19, '#334155');
    } else D.text(VW / 2, VH - fs(40), '구조를 보고 예측을 고른 뒤 🔬 확인하기를 눌러요', { size: fs(13), weight: 800, color: '#7c3aed' });
  }
  function wrapText(text, x, y, maxW, size, lh, color) {
    ctx.save(); ctx.font = D.font(size, 700);
    const words = text.split(' '), lines = []; let cur = '';
    words.forEach((w_) => { const tt = cur ? cur + ' ' + w_ : w_; if (ctx.measureText(tt).width > maxW && cur) { lines.push(cur); cur = w_; } else cur = tt; });
    if (cur) lines.push(cur);
    ctx.restore();
    lines.forEach((ln, i) => D.text(x, y + i * lh, ln, { size, weight: 700, color }));
  }
  const SOAPN = 12;
  const soapSeed = Array.from({ length: SOAPN }, (_, i) => ({ a: rnd(0, TAU), rx: rnd(0.08, 0.92), ry: rnd(0.1, 0.55), ph: rnd(0, 6) }));
  function drawSoap(t, ver) {
    const W_ = PRW, s = ver ? smooth(clamp(PR.t / 4.5, 0, 1)) : 0, lift = ver ? smooth(clamp((PR.t - 4.6) / 2.2, 0, 1)) : 0;
    // 왼쪽: 비누 분자 모형
    const lx = PHONE ? 140 : 190, ly = PHONE ? 200 : 290;
    ctx.save(); ctx.translate(lx, ly); ctx.rotate(-0.0);
    soapGlyph(70, 0, 0, 2.3, { pm: true });
    ctx.restore();
    D.label(lx + 70, ly - 52, '머리: 극성 (물과 잘 섞여요)', { size: fs(12.5), bg: '#dbeafe', color: '#1e3a8a', border: '#3b82f6', pad: 8 });
    D.label(lx - 10, ly + 50, '꼬리: 무극성 (기름과 잘 섞여요)', { size: fs(12.5), bg: '#f1f5f9', color: '#334155', border: '#94a3b8', pad: 8 });
    // 오른쪽: 물속 옷감과 기름때
    const x = W_.x, y = PHONE ? 330 : 120, w = PHONE ? 440 : 300, h = PHONE ? 230 : 340;
    const bxx = PHONE ? 60 : x;
    ctx.save();
    D.roundRect(bxx, y, w, h, 14); ctx.fillStyle = 'rgba(147,197,253,.35)'; ctx.fill(); ctx.strokeStyle = '#93c5fd'; ctx.lineWidth = 2.5; ctx.stroke(); ctx.clip();
    // 옷감
    ctx.fillStyle = '#e5e7eb'; ctx.fillRect(bxx, y + h - 46, w, 46);
    ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 2; for (let i = 0; i < w; i += 14) { ctx.beginPath(); ctx.moveTo(bxx + i, y + h - 46); ctx.lineTo(bxx + i, y + h); ctx.stroke(); }
    const ox = bxx + w * 0.5, oy0 = y + h - 46 - 30, R = 38;
    const oy = oy0 - lift * (h * 0.7), oxx = ox + lift * 40;
    // 비누 분자들
    for (let i = 0; i < SOAPN; i++) {
      const sd = soapSeed[i], th = i / SOAPN * TAU;
      const fx0 = bxx + sd.rx * w + (RM ? 0 : Math.sin(t * 0.9 + sd.ph) * 10), fy0 = y + 20 + sd.ry * (h - 120) + (RM ? 0 : Math.cos(t * 0.8 + sd.ph) * 8);
      const tx = oxx + Math.cos(th) * (R + 12), ty = oy + Math.sin(th) * (R + 12);
      const px = lerp(fx0, tx, s), py = lerp(fy0, ty, s), ang = lerp(sd.a + t * 0.5, th, s);
      soapGlyph(px, py, ang, 0.75);
    }
    // 기름 방울
    ctx.save(); const g = ctx.createRadialGradient(oxx - 10, oy - 12, 4, oxx, oy, R); g.addColorStop(0, '#fde68a'); g.addColorStop(1, '#d97706'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(oxx, oy, R, 0, TAU); ctx.fill(); ctx.restore();
    D.text(oxx, oy + 5, '기름때', { size: fs(13), weight: 800, color: '#78350f' });
    ctx.restore();
    D.text(bxx + w / 2, y - 10, '💧 비누물 속 옷감의 기름때', { size: fs(13), weight: 800, color: '#4c1d95' });
    if (ver && PR.t > 1.2 && PR.t < 4.5) D.label(bxx + w / 2, y + 20, '꼬리가 기름 속으로, 머리는 물 쪽으로', { size: fs(12.5), bg: '#7c3aed', color: '#fff', pad: 9 });
    if (ver && lift > 0.4) D.label(bxx + w / 2, y + 20, '기름때가 물에 씻겨 나가요 ✨', { size: fs(13), bg: '#14a058', color: '#fff', pad: 10 });
  }

  /* =========================================================
     읽기 창 · 포인터 · 연결
     ========================================================= */
  function updateReadouts() {
    const sc = S.scene;
    if (sc === 'polar') {
      const M = PMOL[PL.mol];
      setRO(1, '분자', M.html + ' ' + M.name);
      setRO(2, '모양', PL.mol === 'CO2' && PL.bend !== 180 ? '굽은형 (가상)' : M.shape);
      const done = plDone();
      setRO(3, '결합 쌍극자의 합', done ? (plNet() === 0 ? '0 → 무극성' : '≠ 0 → 극성') : '화살표를 이어 보세요');
    } else if (sc === 'stream') {
      const L = LIQ[ST.liq];
      setRO(1, '액체', L.name);
      setRO(2, '줄기', ST.near > 0 || ST.tested[ST.liq] ? (ST.bend > 10 ? '막대 쪽으로 휘어요' : '휘지 않아요') : '막대를 가까이');
      setRO(3, '시험한 액체', testedCount() + ' / 3');
    } else if (sc === 'mix') {
      const d = MXD[MX.x];
      setRO(1, '조합', d.name);
      setRO(2, '관찰 결과', MX.results[MX.x] ? d.res : MX.running ? '관찰 중…' : '넣고 흔들어 봐요');
      setRO(3, '해 본 조합', mxCount() + ' / 4');
    } else if (sc === 'bp') {
      const b = BPD.find((q) => q.k === BP.sel);
      setRO(1, '선택한 물질', b.f);
      setRO(2, '끓는점', b.bp + ' °C');
      setRO(3, '분자량 · 극성', b.M + ' · ' + (b.polar ? '극성' : '무극성'));
    } else if (sc === 'isomer') {
      const I = ISO[IS.sel];
      setRO(1, '분자', I.name);
      setRO(2, '끓는점', I.bp);
      setRO(3, '나트륨과 반응', IS.tested[IS.sel] ? (I.rx ? 'H₂ 발생 (O–H 있음)' : '반응 없음') : '넣어 봐요');
    } else if (sc === 'bonds') {
      setRO(1, '기체', BD.g === 'N2' ? '질소 N≡N' : '산소 O=O');
      setRO(2, '공유 전자쌍', BD.g === 'N2' ? '3쌍 (삼중 결합)' : '2쌍 (이중 결합)');
      setRO(3, '불씨 시험', BD.tested[BD.g] ? (BD.g === 'O2' ? '되살아나요' : '꺼져요') : '해 봐요');
    } else {
      const P = PRD[PR.c];
      setRO(1, '카드', P.soap ? '비누 분자' : P.f + ' ' + P.name);
      setRO(2, '이 카드', PR.done[PR.c] ? (PR.hit[PR.c] ? '예측 적중 ✅' : '확인함 🔎') : '예측 전');
      setRO(3, '확인한 카드', prDoneCount() + ' / 6');
    }
  }
  let lastP = null, rotating = false;
  function rodHit(p) { const r = ST.rod; return Math.abs(p.x - r.x) < stL.hw + 12 && Math.abs(p.y - r.y) < stL.hh + 18; }
  SciSim.pointer(view, {
    down(p) {
      const sc = S.scene;
      if (sc === 'polar') {
        const i = plHit(p);
        if (i >= 0) { const a = PL.arrows[i]; PL.drag = { i, gx: a.tail.x - p.x, gy: a.tail.y - p.y }; Sound.tick(); return true; }
      } else if (sc === 'stream') {
        if (rodHit(p)) { ST.drag = true; ST.gx = ST.rod.x - p.x; ST.gy = ST.rod.y - p.y; return true; }
        return false;
      } else if (sc === 'bp') { const b = bpHit(p); if (b) bpSelect(b.k); return false; }
      else if (sc === 'mix' || sc === 'bonds') return false;
      else if (sc === 'predict' && PR.c === 'soap') return false;
      rotating = true; VIEW.drag = true; VIEW.vy = 0; lastP = p;
      return true;
    },
    move(p) {
      if (S.scene === 'polar' && PL.drag) { const a = PL.arrows[PL.drag.i]; a.tail.x = p.x + PL.drag.gx; a.tail.y = p.y + PL.drag.gy; return; }
      if (S.scene === 'stream' && ST.drag) { ST.rod.x = p.x + ST.gx; ST.rod.y = p.y + ST.gy; stClampRod(); return; }
      if (!rotating || !lastP) return;
      const dx = p.x - lastP.x, dy = p.y - lastP.y;
      VIEW.yaw += dx * 0.012; VIEW.pitch = clamp(VIEW.pitch + dy * 0.009, -1.2, 1.2);
      VIEW.vy = dx * 0.012 / Math.max(DT, 0.008);
      lastP = p;
    },
    up() {
      if (S.scene === 'polar' && PL.drag) {
        const i = PL.drag.i, a = PL.arrows[i], pv = PL.arrows[i - 1], tip = plTip(i - 1);
        PL.drag = null;
        if (pv.att && Math.hypot(a.tail.x - tip.x, a.tail.y - tip.y) < 30) { a.att = true; Sound.tick(); plCheckDone(); }
        return;
      }
      if (ST.drag) { ST.drag = false; return; }
      rotating = false; VIEW.drag = false; lastP = null; VIEW.vy = clamp(VIEW.vy, -3, 3);
    },
    hover(p) {
      const sc = S.scene;
      if (sc === 'polar') return plHit(p) >= 0 ? 'grab' : 'grab';
      if (sc === 'stream') return rodHit(p) ? 'grab' : null;
      if (sc === 'bp') return bpHit(p) ? 'pointer' : null;
      if (sc === 'isomer' || sc === 'predict') return 'grab';
      return null;
    },
  });
  if (PHONE) {
    view.canvas.style.touchAction = 'pan-y';
    view.canvas.addEventListener('touchstart', (e) => {
      const t0 = e.touches[0]; if (!t0) return;
      const p = view.toLocal(t0), sc = S.scene;
      if ((sc === 'polar' && (plHit(p) >= 0 || Math.hypot(p.x - P3().x, p.y - P3().y) < 170)) || (sc === 'stream' && rodHit(p)) || (sc === 'isomer' && Math.hypot(p.x - ISL.cx, p.y - ISL.cy) < 160) || (sc === 'predict' && PR.c !== 'soap' && Math.hypot(p.x - PRC().x, p.y - PRC().y) < 170)) e.preventDefault();
    }, { passive: false });
  }
  $$('#plSel .opt').forEach((b) => b.addEventListener('click', () => { Sound.click(); plSelect(b.dataset.m); }));
  $('#sBend').addEventListener('input', (e) => { const v = +e.target.value; e.target.style.setProperty('--pct', ((v - 100) / 80 * 100) + '%'); plBendTo(v); });
  $('#jPolar').addEventListener('click', () => judge(true));
  $('#jNon').addEventListener('click', () => judge(false));
  $('#autoBtn').addEventListener('click', plAuto);
  $$('#liqSel button').forEach((b) => b.addEventListener('click', () => stSet(b.dataset.l)));
  $('#chgBtn').addEventListener('click', () => { Sound.click(); stSetChg(-ST.chg); });
  $$('#mixSel .opt').forEach((b) => b.addEventListener('click', () => { Sound.click(); mxReset(b.dataset.x); }));
  $('#mixGo').addEventListener('click', mxGo);
  $('#polBtn').addEventListener('click', () => { Sound.click(); BP.pol = !BP.pol; $('#polBtn').classList.toggle('sw-on', BP.pol); $('#polBtn').textContent = BP.pol ? '🧲 극성 표시 중' : '🧲 분자의 극성 표시하기'; });
  $$('#isoSel button').forEach((b) => b.addEventListener('click', () => isSet(b.dataset.i)));
  $('#naBtn').addEventListener('click', isNa);
  $$('#gasSel button').forEach((b) => b.addEventListener('click', () => bdSet(b.dataset.g)));
  $('#splintBtn').addEventListener('click', bdSplint);
  $$('#cardSel .opt').forEach((b) => b.addEventListener('click', () => { Sound.click(); prSelect(b.dataset.c); }));
  $('#q1Sel').addEventListener('change', (e) => { PR.ans[PR.c].q1 = e.target.value; Sound.click(); prUI(); });
  $('#q2Sel').addEventListener('change', (e) => { PR.ans[PR.c].q2 = e.target.value; Sound.click(); prUI(); });
  $('#verifyBtn').addEventListener('click', prVerify);
  $$('#sceneSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.scene); if (b.dataset.scene === 'bp') bpEnter(); }));
  $('#resetBtn').addEventListener('click', () => {
    Sound.click();
    const sc = S.scene;
    if (sc === 'polar') { plSelect(PL.mol); }
    else if (sc === 'stream') { ST.rod = { x: stL.rod0.x, y: stL.rod0.y }; ST.near = 0; }
    else if (sc === 'mix') mxReset();
    else if (sc === 'bp') { BP.pol = false; $('#polBtn').classList.remove('sw-on'); $('#polBtn').textContent = '🧲 분자의 극성 표시하기'; bpEnter(); }
    else if (sc === 'isomer') isSet(IS.sel);
    else if (sc === 'bonds') bdSet(BD.g);
    else { PR.t = -1; PR.ans[PR.c] = { q1: '', q2: '' }; prSelect(PR.c); }
  });

  function bgFill() {
    const g = ctx.createLinearGradient(0, 0, 0, VH);
    g.addColorStop(0, '#f7f4fe'); g.addColorStop(1, '#ece7f9');
    ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
  }
  function draw(t) {
    view.clear(BG);
    bgFill();
    ctx.save();
    ctx.globalAlpha = 0.35 + 0.65 * clamp(S.sceneA, 0, 1);
    const sc = S.scene;
    if (sc === 'polar') drawPolar(t);
    else if (sc === 'stream') drawStream(t);
    else if (sc === 'mix') drawMix(t);
    else if (sc === 'bp') drawBP(t);
    else if (sc === 'isomer') drawIso(t);
    else if (sc === 'bonds') drawBonds(t);
    else drawPredict(t);
    fx.draw(ctx);
    ctx.restore();
  }

  /* ---------- 문제 그림 ---------- */
  function figCO2() {
    return '<svg class="fig-box" viewBox="0 0 320 120" width="320" height="120" role="img" aria-label="CO₂ 분자: 두 C=O 결합 쌍극자 화살표가 서로 반대 방향">' +
      '<circle cx="60" cy="52" r="20" fill="#fff" stroke="#e2464b" stroke-width="3"/><text x="60" y="60" text-anchor="middle" font-size="22" font-weight="800" fill="#1b2333">O</text>' +
      '<circle cx="160" cy="52" r="20" fill="#fff" stroke="#475569" stroke-width="3"/><text x="160" y="60" text-anchor="middle" font-size="22" font-weight="800" fill="#1b2333">C</text>' +
      '<circle cx="260" cy="52" r="20" fill="#fff" stroke="#e2464b" stroke-width="3"/><text x="260" y="60" text-anchor="middle" font-size="22" font-weight="800" fill="#1b2333">O</text>' +
      '<line x1="132" y1="30" x2="86" y2="30" stroke="#e2464b" stroke-width="4"/><polygon points="80,30 94,23 94,37" fill="#e2464b"/>' +
      '<line x1="188" y1="30" x2="234" y2="30" stroke="#e2464b" stroke-width="4"/><polygon points="240,30 226,23 226,37" fill="#e2464b"/>' +
      '<text x="160" y="108" text-anchor="middle" font-size="13" font-weight="700" fill="#5d6879">두 C=O 결합 쌍극자 화살표의 방향은?</text></svg>';
  }

  /* ---------- 미션 ---------- */
  const levels = [
    /* ---------- 1단계 · 분석 ---------- */
    {
      title: '결합 쌍극자를 합쳐요', short: '분자의 극성', icon: '🧲', phase: '분석',
      features: ['polar'],
      intro: '<p class="si-q">❓ 탐구 질문: 분자의 모양이 달라지면 성질도 달라질까? 물과 기름은 왜 섞이지 않을까?</p>' +
        '<div class="si-link">🔗 <b>앞 차시들에서</b> 결합의 극성(쌍극자 모멘트 화살표)과 분자의 구조(CO₂ 직선형 · H₂O 굽은형 · CH₄ 정사면체 …)를 배웠어요. 이제 둘을 합쳐 <b>분자 전체</b>가 극성인지 알아봐요.</div>' +
        '<p><b>분자의 극성 = 결합 쌍극자 화살표의 합</b>이에요. 대칭이어서 화살표가 서로 상쇄되면 <b>무극성 분자</b>, 합이 남으면 <b>극성 분자</b>예요.</p>',
      setup() { setScene('polar'); plSelect('H2O'); showHint('화살표를 끌어 머리와 꼬리를 이어 보세요', 4500); },
      recap: '결합 쌍극자 화살표를 모두 이은 <b>합이 0이면 무극성 분자</b>(CO₂ · CH₄ · BF₃), <b>합이 남으면 극성 분자</b>(H₂O · NH₃ · CH₃Cl)예요. 극성 결합이 있어도 구조가 대칭이면 무극성이에요.',
      summary: '<ul><li><b>분자의 극성</b>: 결합 쌍극자(δ+ → δ− 화살표)의 합으로 정해져요 (정성적).</li><li>합 = 0 → <b>무극성 분자</b>: CO₂ (직선), CH₄ (정사면체), BF₃ (평면 삼각형), O₂ · N₂</li><li>합 ≠ 0 → <b>극성 분자</b>: H₂O (굽은형), NH₃ (삼각뿔), HCl, CH₃Cl</li></ul>' +
        '<p>구조(대칭성)가 달라지면 극성도 달라져요 (CO₂를 굽히면 극성).</p>',
      missions: [
        {
          title: '분자 6개의 극성 판정하기',
          goal: '<b>H₂O · NH₃ · CO₂ · CH₄ · BF₃ · CH₃Cl</b>의 쌍극자 화살표를 살펴보고 극성 / 무극성을 판정해요.',
          hint: '분자를 고르고 화살표를 이어 붙여 봐요 (또는 ➡️ 자동으로 잇기). 제자리로 돌아오면 합이 0이라 무극성이에요.',
          setup() { PL.judged = {}; plSelect(PL.mol); setScene('polar'); },
          check: () => judgedCount() === 6,
          hold: 0.5,
          status: () => PKEYS.map((k) => mark(!!PL.judged[k]) + ' ' + PMOL[k].f).join(' · '),
          explain: 'H₂O · NH₃ · CH₃Cl은 쌍극자 화살표를 이어도 제자리로 돌아오지 않아 <b>극성 분자</b>예요. CO₂ · CH₄ · BF₃는 대칭이라 화살표가 서로 상쇄되어 합이 0인 <b>무극성 분자</b>예요.',
        },
        {
          title: '화살표 합 그리기', manual: true,
          goal: '<b>H₂O · CO₂ · BF₃</b>의 결합 쌍극자 화살표를 끌어 머리와 꼬리를 이어 붙여 합을 직접 확인해요.',
          hint: '파란 점선 고리가 나타나면 다음 화살표의 꼬리를 거기로 끌어 놓아요. 세 분자 모두 해야 해요.',
          setup() { PL.chain = {}; plSelect(PL.mol); setScene('polar'); },
          check: () => (chainCount() === 3 ? true : '아직 화살표를 모두 잇지 않은 분자가 있어요: ' + ['H2O', 'CO2', 'BF3'].filter((k) => !PL.chain[k]).map((k) => PMOL[k].f).join(', ')),
          status: () => ['H2O', 'CO2', 'BF3'].map((k) => mark(!!PL.chain[k]) + ' ' + PMOL[k].f).join(' · '),
          explain: 'H₂O는 두 O–H 화살표가 굽은 모양이라 합이 남아요. CO₂는 두 화살표가 반대 방향이라 합이 0, BF₃는 세 화살표가 120°씩 벌어져 있어 이어 붙이면 삼각형이 닫혀 합이 0이에요.',
        },
        {
          type: 'quiz', title: 'CO₂는 왜 무극성일까?',
          get figure() { return figCO2(); },
          goal: 'C=O 결합은 극성인데도 CO₂ 분자가 <b>무극성</b>인 까닭은?',
          choices: ['직선형이라 두 C=O 결합 쌍극자의 크기는 같고 방향은 반대여서 서로 상쇄되기 때문이에요', 'C=O 결합의 전기 음성도 차가 0이기 때문이에요', 'CO₂의 C에 비공유 전자쌍이 있기 때문이에요', 'O가 전자를 완전히 가져가 이온이 되기 때문이에요'],
          answer: 0,
          feedback: ['', 'C와 O의 전기 음성도는 2.5와 3.5로 달라서 C=O 결합은 극성 결합이에요.', 'CO₂의 C에는 비공유 전자쌍이 없어요. 직선형인 까닭은 전자 영역이 2개이기 때문이에요.', 'C=O는 전자를 공유하는 공유 결합이에요. 이온이 되지 않아요.'],
          explain: 'CO₂는 <b>직선형</b>이라 두 C=O 결합 쌍극자의 크기가 같고 방향이 반대예요. 합이 0이라 분자는 무극성이에요. CO₂를 굽히면(슬라이더) 합이 남아 극성이 돼요.',
        },
      ],
    },
    /* ---------- 2단계 · 실험 ---------- */
    {
      title: '극성에 따라 성질이 달라져요', short: '물리적 성질', icon: '🧪', phase: '실험',
      features: ['phys'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 분자가 극성인지 무극성인지 판정했어요. 이 극성은 분자 사이의 인력과 섞임 같은 <b>물리적 성질</b>을 결정해요.</div>' +
        '<p>💧 <b>물줄기</b> → 🧪 <b>섞기</b> → 📊 <b>끓는점</b> 세 가지를 살펴봐요. 핵심은 <b>극성이 크면 분자 사이 인력이 크다</b>, 그리고 <b>극성은 극성끼리, 무극성은 무극성끼리 잘 섞인다</b>예요.</p>',
      setup() { setScene('stream'); stSet('water'); showHint('막대를 끌어 흘러내리는 줄기 가까이로 가져가 보세요', 4500); },
      recap: '극성 분자(물 · 에탄올)의 줄기는 대전된 막대 쪽으로 휘고 무극성 분자(헥세인)는 휘지 않아요. 극성은 극성끼리, 무극성은 무극성끼리 잘 섞이고, 극성이 크면 분자 사이 인력이 커서 끓는점이 높아요.',
      summary: '<table class="mini"><tr><th>실험</th><th>결과</th></tr><tr><td>물줄기 + 대전 막대</td><td>물 · 에탄올 휨 / 헥세인 안 휨</td></tr><tr><td>물 + 에탄올</td><td>섞임 (극성 + 극성)</td></tr><tr><td>물 + 헥세인</td><td>층 분리 (극성 / 무극성)</td></tr><tr><td>I₂</td><td>물에 거의 안 녹음, 헥세인에 잘 녹음(보라색)</td></tr></table>' +
        '<p>끓는점(°C): CH₄ −162 &lt; NH₃ −33 &lt; H₂O 100, F₂ −188 &lt; HCl −85. 분자량이 비슷해도 <b>극성이 크면 끓는점이 높아요</b> (수소 결합은 이름만).</p>',
      missions: [
        {
          title: '물줄기 3가지 시험',
          goal: '<b>물 · 에탄올 · 헥세인</b>의 줄기에 대전된 막대를 1초쯤 가까이 해서 휘는지 시험해요.',
          hint: '액체를 고른 뒤 막대를 끌어 줄기 옆(가로 230 이내)으로 가져가요. 보라색 막대가 다 차면 시험이 기록돼요.',
          setup() { ST.tested = {}; ST.res = {}; ST.near = 0; setScene('stream'); },
          check: () => testedCount() === 3,
          hold: 0.4,
          status: () => ['water', 'ethanol', 'hexane'].map((k) => mark(!!ST.tested[k]) + ' ' + LIQ[k].name + (ST.tested[k] ? '(' + ST.res[k] + ')' : '')).join(' · '),
          explain: '물과 에탄올은 극성 분자라 (+) 쪽과 (−) 쪽이 막대의 전하에 이끌려 방향을 맞추고 줄기가 휘어요. 헥세인은 무극성이라 막대에 이끌리지 않아 줄기가 휘지 않아요. 막대의 전하가 (+)이든 (−)이든 극성 분자는 이끌려요.',
        },
        {
          title: '관찰표 채우기', manual: true,
          goal: '🧪 섞기 실험과 📊 끓는점 그래프를 살펴보고 관찰표를 채워요.',
          hint: '섞기 화면에서 네 조합을 모두 해 보고, 끓는점 화면에서 막대를 눌러 값을 읽어요. 극성이 크면 끓는점이 높아요.',
          setup() { obsShow = true; $$('#obsBody select').forEach((q) => { q.value = ''; q.classList.remove('ok', 'bad'); }); MX.results = {}; mxReset(); setScene('mix'); updateUI(); },
          check: () => obsCheck(),
          status: () => '📋 채운 칸 ' + obsFilled() + ' / 6 · 해 본 조합 ' + mxCount() + ' / 4',
          explain: '물 + 에탄올은 섞이고(극성 + 극성), 물 + 헥세인은 층이 나뉘어요(극성 / 무극성). I₂는 물에 거의 녹지 않고 헥세인에는 잘 녹아 보라색이 돼요. 끓는점은 H₂O(100 °C)가 가장 높고, F₂(−188 °C)보다 극성인 HCl(−85 °C)이 높아요.',
        },
        {
          type: 'quiz', title: '아이오딘이 헥세인에 잘 녹는 까닭',
          goal: '아이오딘(I₂)은 물에 거의 녹지 않지만 <b>헥세인에는 잘 녹아요</b>. 그 까닭은?',
          choices: ['I₂와 헥세인은 둘 다 무극성이라 서로 잘 섞이기 때문이에요', 'I₂와 물은 둘 다 극성이라 서로 잘 섞이기 때문이에요', '헥세인이 물보다 밀도가 커서 I₂를 끌어당기기 때문이에요', 'I₂가 헥세인과 반응해 이온이 되기 때문이에요'],
          answer: 0,
          feedback: ['', 'I₂는 같은 원자끼리의 결합이라 무극성이에요. 물(극성)과는 잘 섞이지 않아요.', '밀도가 아니라 분자의 극성이 섞임을 정해요. 헥세인은 오히려 물보다 가벼워 위에 떠요.', '헥세인에 녹은 I₂는 화학 반응 없이 분자 그대로 흩어져 있어요.'],
          explain: 'I₂는 무극성 분자이고 헥세인도 무극성 분자라서 서로 잘 섞여 <b>보라색 용액</b>이 돼요. 극성인 물과는 분자 사이의 힘의 종류가 달라 거의 섞이지 않아요. <b>극성은 극성끼리, 무극성은 무극성끼리</b> 잘 섞여요.',
        },
      ],
    },
    /* ---------- 3단계 · 분석 ---------- */
    {
      title: '구조가 화학적 성질을 정해요', short: '화학적 성질', icon: '⚗️', phase: '분석',
      features: ['chem'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 극성이 끓는점과 섞임 같은 <b>물리적 성질</b>을 정하는 것을 봤어요. 그렇다면 분자식이 <b>같은데</b> 구조가 다르면 어떨까요? 결합의 수는 반응성에 어떤 영향을 줄까요?</div>' +
        '<p>🧬 같은 분자식 <b>C₂H₆O</b>인 에탄올과 다이메틸 에터에 나트륨을 넣어 보고, ⛓️ <b>N≡N</b>과 <b>O=O</b>의 결합 수와 반응성을 비교해요.</p>',
      setup() { setScene('isomer'); isSet('eth'); showHint('에탄올과 다이메틸 에터에 나트륨 조각을 넣어 보세요', 4500); },
      recap: '같은 분자식이어도 구조가 다르면 결합이 달라 성질이 달라요. <b>O–H 결합</b>이 있는 에탄올만 나트륨과 반응해요. 결합 수가 많은 <b>N≡N</b>(공유 3쌍)은 반응성이 매우 낮고, O=O(공유 2쌍)는 연소에 참여해요.',
      summary: '<table class="mini"><tr><th></th><th>에탄올 CH₃CH₂OH</th><th>다이메틸 에터 CH₃OCH₃</th></tr><tr><td>끓는점</td><td>78 °C (액체)</td><td>−24 °C (기체)</td></tr><tr><td>Na와 반응</td><td>H₂ 발생 (O–H)</td><td>반응 없음</td></tr></table>' +
        '<ul><li><b>이성질체</b>: 분자식은 같고 구조가 다른 분자 → 성질이 달라요.</li><li>N≡N(공유 전자쌍 3쌍)은 반응성이 매우 낮아 식품 포장에 쓰고, O=O(2쌍)는 연소에 참여해요.</li></ul>',
      missions: [
        {
          title: '두 구조 시험하기',
          goal: '<b>에탄올</b>과 <b>다이메틸 에터</b>에 각각 나트륨 조각을 넣어 반응하는지 확인해요.',
          hint: '분자를 고르고 🧂 나트륨 조각 넣기를 눌러요. 2초쯤 지켜보면 결과가 기록돼요.',
          setup() { IS.tested = {}; isSet(IS.sel); setScene('isomer'); },
          check: () => isCount() === 2,
          hold: 0.4,
          status: () => mark(!!IS.tested.eth) + ' 에탄올 · ' + mark(!!IS.tested.dme) + ' 다이메틸 에터',
          explain: '에탄올에는 O–H 결합이 있어서 나트륨과 반응해 수소 기체가 나와요. 다이메틸 에터는 같은 C₂H₆O이지만 O–H 결합이 없어 나트륨과 반응하지 않아요. 끓는점도 78 °C와 −24 °C로 크게 달라요.',
        },
        {
          title: '결합 · 반응성 연결하기', manual: true,
          goal: '이성질체와 N₂ · O₂ 실험 결과를 <b>결합 · 반응성 표</b>로 정리해요.',
          hint: '⛓️ N₂·O₂ 화면에서 N≡N은 공유 전자쌍 3쌍, O=O는 2쌍이에요. 불씨를 넣어 반응성을 확인해 봐요.',
          setup() { bondShow = true; $$('#bondBody select').forEach((q) => { q.value = ''; q.classList.remove('ok', 'bad'); }); setScene('bonds'); updateUI(); },
          check: () => bondCheck(),
          status: () => '📋 채운 칸 ' + bondFilled() + ' / 6',
          explain: 'O–H 결합이 있는 에탄올이 나트륨과 반응하고 끓는점도 높아요. N≡N은 삼중 결합(공유 3쌍)이라 반응성이 매우 낮아 식품 포장에 쓰고, O=O는 이중 결합(공유 2쌍)이라 불씨를 되살리는 등 연소에 참여해요.',
        },
        {
          type: 'quiz', title: '분자식이 같으면 성질도 같을까?',
          goal: '에탄올과 다이메틸 에터는 분자식이 C₂H₆O로 같아요. <b>성질도 같을까요?</b>',
          choices: ['아니요. 분자식이 같아도 구조가 다르면 결합과 극성이 달라 성질이 달라요', '네. 원자의 종류와 수가 같으면 성질도 같아요', '네. 구조가 달라도 같은 원소로 이루어져 있으면 성질이 같아요', '아니요. 분자식이 같으면 항상 끓는점만 달라요'],
          answer: 0,
          feedback: ['', '에탄올은 나트륨과 반응하지만 다이메틸 에터는 반응하지 않았어요. 원자의 종류와 수가 같아도 성질은 달라요.', '구조가 다르면 O–H 같은 결합의 유무가 달라져서 성질도 달라요.', '끓는점뿐 아니라 나트륨과의 반응성 같은 화학적 성질도 달라요.'],
          explain: '성질을 정하는 것은 원자의 종류와 수만이 아니라 <b>어떻게 결합했는가(구조)</b>예요. 에탄올은 O–H 결합 때문에 나트륨과 반응하고 끓는점이 높지만, 다이메틸 에터는 반응하지 않고 상온에서 기체예요.',
        },
      ],
    },
    /* ---------- 4단계 · 적용 ---------- */
    {
      title: '구조로 성질을 예측해요', short: '구조로 예측', icon: '🔮', phase: '적용',
      features: ['apply'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 구조 → 극성 → 성질의 흐름을 확인했어요. 처음 보는 분자도 같은 순서로 <b>예측</b>할 수 있어요.</div>' +
        '<p>분자 카드를 고르고 <b>구조 → 극성 → 물과 섞이는가</b>를 먼저 예측한 뒤 🔬 <b>확인하기</b>로 맞는지 봐요. 마지막 카드 🧼 <b>비누</b>는 한 분자 안에 극성인 머리와 무극성인 꼬리가 함께 있어요.</p>',
      setup() { setScene('predict'); prSelect('CCl4'); showHint('구조를 돌려 보고 예측을 고른 뒤 확인해 보세요', 4500); },
      recap: '분자 구조로 극성을 판단하면 성질을 예측할 수 있어요. 극성 분자(CH₃OH · NH₃)는 물과 잘 섞이고, 무극성 분자(CCl₄ · I₂ · CO₂)는 물과 섞이지 않아요. 비누는 극성 머리와 무극성 꼬리로 기름때를 씻어 내요.',
      summary: '<table class="mini"><tr><th>분자</th><th>구조</th><th>극성</th><th>물과</th></tr><tr><td>CCl₄</td><td>정사면체</td><td>무극성</td><td>안 섞임</td></tr><tr><td>CH₃OH</td><td>비대칭</td><td>극성</td><td>섞임</td></tr><tr><td>I₂</td><td>직선</td><td>무극성</td><td>안 섞임</td></tr><tr><td>NH₃</td><td>삼각뿔</td><td>극성</td><td>섞임</td></tr><tr><td>CO₂</td><td>직선형</td><td>무극성</td><td>안 섞임</td></tr></table>' +
        '<p><b>비누</b>: 극성 머리(물 쪽) + 무극성 꼬리(기름 쪽) → 꼬리가 기름때를 감싸 물에 씻겨 나가요.</p>',
      missions: [
        {
          title: '예측하고 확인하기',
          goal: '분자 카드 <b>4개 이상</b>에서 극성과 물과의 섞임을 먼저 예측한 뒤 🔬 확인해요.',
          hint: '카드를 고르고 구조를 돌려 봐요. 대칭이면 화살표가 상쇄돼 무극성, 비대칭이면 극성이에요. 두 예측을 고르면 확인 버튼이 켜져요.',
          setup() { PR.done = {}; PR.hit = {}; PKEYS4.forEach((k) => { PR.ans[k] = { q1: '', q2: '' }; }); prSelect(PR.c); setScene('predict'); },
          check: () => prDoneCount() >= 4,
          hold: 0.6,
          status: () => PKEYS4.map((k) => (PR.done[k] ? (PR.hit[k] ? '✅' : '🔎') : '⬜') + ' ' + PRD[k].f).join(' · ') + ' (' + prDoneCount() + '/4)',
          explain: '구조를 보고 쌍극자의 합으로 극성을 판단하면 물과 섞이는지 예측할 수 있어요. CH₃OH와 NH₃는 극성이라 물과 잘 섞이고, CCl₄ · I₂ · CO₂는 무극성이라 섞이지 않아요. 비누는 극성 머리와 무극성 꼬리를 모두 가진 분자예요.',
        },
        {
          type: 'quiz', title: 'CCl₄가 물과 섞이지 않는 까닭',
          goal: '<b>CCl₄</b>가 물과 섞이지 않는 까닭으로 알맞은 것은?',
          choices: ['C–Cl 결합은 극성이지만 정사면체 대칭이라 쌍극자가 상쇄되어 무극성 분자이기 때문이에요', 'C–Cl 결합이 극성이 없는 무극성 결합이기 때문이에요', 'CCl₄가 이온 결합 물질이기 때문이에요', 'CCl₄는 분자량이 작아서 물에 녹지 않기 때문이에요'],
          answer: 0,
          feedback: ['', 'C의 전기 음성도는 2.5, Cl은 3.0이라 C–Cl 결합은 극성 결합이에요. 하지만 구조가 대칭이에요.', 'CCl₄는 비금속끼리 전자를 공유한 분자예요.', '분자량이 아니라 분자의 극성이 섞임을 정해요.'],
          explain: 'CCl₄의 C–Cl 결합은 극성이지만 네 결합이 정사면체로 대칭이라 쌍극자가 서로 상쇄돼요. 분자 전체는 <b>무극성</b>이라 극성인 물과 섞이지 않고 층으로 나뉘어요.',
        },
      ],
    },
  ];

  buildSelTable($('#obsBody'), OBS); buildSelTable($('#bondBody'), BOND_ROWS);
  setProt0();
  function setProt0() { stSetChg(-1); }
  plSelect('H2O'); mxReset('we'); prSelect('CCl4'); isSet('eth'); bdSet('N2');
  game = SciSim.game({
    simId: 'hc-structure-property',
    mount: '#game',
    badge: '구조와 성질 박사',
    homeHref: '../../index.html#hc',
    featureLabels: { polar: '🧲 결합 쌍극자 · 벡터 합', phys: '💧🧪📊 물줄기 · 섞기 · 끓는점', chem: '🧬⛓️ 이성질체 · N₂와 O₂', apply: '🔮 구조로 예측 · 비누' },
    onFeatures(set) { F = new Set(set); updateUI(); },
    levels,
  });
  updateUI();
  SciSim.loop((dt, t) => {
    DT = dt; NOW = t;
    if (!VIEW.drag && !RM) { VIEW.yaw += VIEW.vy * dt; VIEW.vy *= Math.exp(-3 * dt); }
    const sc = S.scene;
    if (sc === 'polar') stepPolar(dt);
    else if (sc === 'stream') stepStream(dt);
    else if (sc === 'mix') stepMix(dt);
    else if (sc === 'isomer') stepIso(dt);
    else if (sc === 'bonds') stepBonds(dt);
    else if (sc === 'predict' && PR.t >= 0) PR.t += dt;
    fx.update(dt);
    updateReadouts();
    draw(t);
  });

  window.__sim = {
    S, PL, ST, MX, BP, IS, BD, PR, VIEW, game, levels, VW, VH, stL, MXL, PRW,
    setScene, plSelect, plBendTo, plAuto, judge, plTip, plDone, plHit, plCheckDone, stSet, stSetChg, trace, mxReset, mxGo, bpEnter, bpSelect, bpBarX, bpBarW, bpY, BPD, isSet, isNa, bdSet, bdSplint, prSelect, prVerify, prQ, PRD, geom, dipoles, netOf, geomX, ISO, buildChain, tetraFill,
    toClient: (x, y) => { const r = view.canvas.getBoundingClientRect(); return { x: r.left + x * r.width / VW, y: r.top + y * r.height / VH }; },
  };
})();
