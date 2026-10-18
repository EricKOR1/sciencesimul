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
    const dmax = Math.max(0.1, ...dp.map((x) => x.d)), sc = (PHONE ? 64 : 62) / dmax;
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
      const O = PO(), tip = plTip(PL.arrows.length - 1);
      const zero = Math.hypot(tip.x - O.x, tip.y - O.y) < 2;
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
      D.text((a.tail.x + tip.x) / 2 + shk, Math.min(a.tail.y, tip.y) - 10, g.atoms[bn.from].e + '→' + g.atoms[bn.to].e + ' ' + bn.d.toFixed(1), { size: fs(11.5), weight: 800, color: INK });
    });
    if (done) {
      const tip = plTip(PL.arrows.length - 1), zero = Math.hypot(tip.x - O.x, tip.y - O.y) < 2;
      if (zero) { D.label(O.x, O.y - 34, '합 = 0', { size: fs(15), bg: '#14a058', color: '#fff', pad: 10 }); D.check(O.x + 52, O.y - 34, 12, 1); }
      else { D.arrow(O.x, O.y, tip.x, tip.y, { color: '#7c3aed', width: 6, dash: [8, 6], head: 14 }); D.label((O.x + tip.x) / 2 + 40, (O.y + tip.y) / 2, '합 ≠ 0', { size: fs(15), bg: '#7c3aed', color: '#fff', pad: 10 }); }
    }
    if (!done) D.text(q.x + q.w / 2, q.y + q.h - 14, '파란 점선 고리에 다음 화살표의 꼬리를 가져가요', { size: fs(11.5), weight: 700, color: MUTED });
  }
