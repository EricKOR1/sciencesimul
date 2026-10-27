/* =========================================================
   화학 Ⅱ. 물질의 구조와 성질 - 전자쌍 반발과 분자 구조 [12화학02-03 뒷부분]
   ① 모형: 풍선 모형 (전자 영역 2 · 3 · 4개 → 직선형 180° · 평면 삼각형 120° · 정사면체 109.5°)
   ② 탐구: 구조 표 만들기 (BeCl₂ · BF₃ · CH₄ · CO₂ · HCN · CCl₄, 다중 결합은 영역 1개)
   ③ 설명: 비공유 전자쌍 (CH₄ 109.5° → NH₃ 107° → H₂O 104.5°)
   ④ 적용: 분자 모델링 (막대-공 모형 조립 · 구조 최적화 · 각도 측정, 미지 분자 추론)
   ※ 중심 원자는 2·3주기 전형 원소 중 Be, B와 옥텟 규칙을 따르는 경우로 한정 (전자 영역 2~4개)
     옥텟 확장(5·6 영역), 혼성 오비탈, 공명은 다루지 않음
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
  // 각도 표기: 정수에 가까우면 정수, 아니면 소수 첫째 자리 (109.4712 → 109.5)
  const fa = (x) => (Math.abs(x - Math.round(x)) < 0.05 ? String(Math.round(x)) : x.toFixed(1));
  const ELC = { H: '#e5e7eb', Be: '#84cc16', B: '#f59e0b', C: '#475569', N: '#3867f4', O: '#e2464b', F: '#22b8a0', P: '#fb923c', Cl: '#14a058' };
  const ELR = { H: 15, Be: 20, B: 20, C: 20, N: 20, O: 20, F: 19, P: 24, Cl: 24 };

  /* ---------- 3차원 수학 ---------- */
  const vadd = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const vsub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const vmul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
  const vdot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const vcross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const vlen = (a) => Math.hypot(a[0], a[1], a[2]);
  const vnorm = (a) => { const l = vlen(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  const angDeg = (a, b) => Math.acos(clamp(vdot(vnorm(a), vnorm(b)), -1, 1)) * 180 / Math.PI;
  const rndDir = () => vnorm([Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5]);

  /* 이상적인 방향 집합: k = 비공유 전자쌍 수 (전자 영역 4개), ang = 결합각 */
  function K4(k, ang) {
    const az = [90, 210, 330].map((a) => a * Math.PI / 180);
    const mk = (psi, i) => [Math.sin(psi) * Math.cos(az[i]), Math.cos(psi), Math.sin(psi) * Math.sin(az[i])];
    if (k === 0) { const psi = Math.acos(-1 / 3); return [mk(psi, 0), mk(psi, 1), mk(psi, 2), [0, 1, 0]]; }
    const a = ang * Math.PI / 180, c2 = (Math.cos(a) + 0.5) / 1.5, psi = Math.acos(-Math.sqrt(c2));
    const base = [mk(psi, 0), mk(psi, 1), mk(psi, 2), [0, 1, 0]];
    if (k === 1) return base;
    const b = vnorm(vadd(base[0], base[1])), u = vnorm(vsub(base[0], base[1])), h = a / 2;
    return [vadd(vmul(b, Math.cos(h)), vmul(u, Math.sin(h))), vsub(vmul(b, Math.cos(h)), vmul(u, Math.sin(h))), base[2], base[3]];
  }
  const IDEAL = { 2: 180, 3: 120, 4: Math.acos(-1 / 3) * 180 / Math.PI };
  const SHAPE_BY_N = { 2: '직선형', 3: '평면 삼각형', 4: '정사면체' };

  /* ---------- 회전 시점 ---------- */
  const VIEW = { yaw: 0.55, pitch: -0.3, vy: 0, vp: 0, drag: false };
  function rot(v) {
    const cy = Math.cos(VIEW.yaw), sy = Math.sin(VIEW.yaw), cp = Math.cos(VIEW.pitch), sp = Math.sin(VIEW.pitch);
    const x1 = v[0] * cy + v[2] * sy, z1 = -v[0] * sy + v[2] * cy;
    return [x1, v[1] * cp - z1 * sp, v[1] * sp + z1 * cp];
  }
  const proj = (C, S, v) => ({ x: C.x + S * v[0], y: C.y - S * v[1], z: v[2] });

  /* ---------- 3차원 그리기 도구 ---------- */
  // 길쭉한 풍선(타원체): 중심에서 dr 방향으로 뻗음 (dr: 회전된 단위 벡터), h: 반길이, R: 반지름
  function spheroid(C, S, dr, h, R, color, alpha, wob) {
    const x = dr[0], y = dr[1], p = Math.hypot(x, y);
    const w = 1 + (wob || 0);
    const cx = C.x + S * h * x, cy = C.y - S * h * y;
    const a = S * Math.sqrt(R * R + (h * h - R * R) * p * p) * w, b = S * R / Math.sqrt(w);
    const ang = p < 1e-3 ? 0 : Math.atan2(-y, x);
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.translate(cx, cy); ctx.rotate(ang);
    ctx.save(); ctx.scale(a, b);
    const g = ctx.createRadialGradient(-0.35, -0.4, 0.05, 0, 0, 1.05);
    g.addColorStop(0, CO.shade(color, 0.65)); g.addColorStop(0.55, color); g.addColorStop(1, CO.shade(color, -0.3));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 1, 0, TAU); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = CO.rgba(CO.shade(color, -0.45), 0.7); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(0, 0, a, b, 0, 0, TAU); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    ctx.beginPath(); ctx.ellipse(-a * 0.35, -b * 0.42, a * 0.2, b * 0.12, 0, 0, TAU); ctx.fill();
    ctx.restore();
  }
  function ball(C, S, v, r, color, text, o) {
    o = o || {};
    const q = proj(C, S, v), k = 1 + v[2] / 900;
    D.sphere(q.x, q.y, r * S * k, color, { shadow: o.shadow !== false, text, textColor: o.textColor || (color === ELC.H ? INK : '#fff'), outline: o.outline || 'rgba(30,30,60,.35)', outlineWidth: 1.2, textScale: 1.0 });
    return q;
  }
  function stick(C, S, a, b, width, color) {
    const p = proj(C, S, a), q = proj(C, S, b);
    ctx.save(); ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(40,40,70,.25)'; ctx.lineWidth = width + 3; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
    ctx.strokeStyle = color || '#cbd5e1'; ctx.lineWidth = width; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
    ctx.restore();
  }
  // 두 방향 사이의 각도 호 (u, v: 회전된 단위 벡터)
  function arc3(C, S, u, v, rad, color, label, o) {
    o = o || {};
    const cosA = clamp(vdot(u, v), -1, 1), th = Math.acos(cosA);
    let w = vsub(v, vmul(u, cosA));
    if (vlen(w) < 1e-3) { w = vcross(u, [0, 0, 1]); if (vlen(w) < 1e-3) w = vcross(u, [0, 1, 0]); }
    w = vnorm(w);
    const pts = [];
    for (let k = 0; k <= 28; k++) { const t = k / 28 * th; pts.push(proj(C, S, vmul(vadd(vmul(u, Math.cos(t)), vmul(w, Math.sin(t))), rad))); }
    ctx.save();
    ctx.strokeStyle = color; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
    ctx.beginPath(); pts.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y))); ctx.stroke();
    const m = th / 2, mid = vadd(vmul(u, Math.cos(m)), vmul(w, Math.sin(m)));
    const lp = proj(C, S, vmul(mid, rad + (o.off || 26)));
    ctx.restore();
    if (label) D.label(lp.x, lp.y, label, { size: fs(o.size || 15), bg: color, color: '#fff', pad: 8 });
    return lp;
  }

  /* =========================================================
     전자 영역 클러스터: 같은 전하끼리 밀어내 구 위에서 가장 멀어지는 배치
     ========================================================= */
  function makeCluster() {
    const c = { dirs: [], vel: [], n: 0, sz: { 0: 0, 1: 0, 2: 0, 3: 0 }, calm: 0, settled: false, speed: 0, minAng: 0 };
    for (let i = 0; i < 4; i++) { c.dirs.push(rndDir()); c.vel.push([0, 0, 0]); }
    return c;
  }
  function clSetN(c, n) {
    for (let i = 0; i < 4; i++) {
      if (i < n && i >= c.n) { c.dirs[i] = rndDir(); c.vel[i] = [0, 0, 0]; }
      const to = i < n ? 1 : 0;
      tween(c.sz, { [i]: to }, { duration: RM ? 0.01 : 0.5, ease: to ? 'outBack' : 'outCubic' });
    }
    c.n = n; c.calm = 0; c.settled = false;
  }
  function clShake(c) {
    for (let i = 0; i < c.n; i++) { c.vel[i] = vadd(c.vel[i], vmul(rndDir(), 2.4)); c.dirs[i] = vnorm(vadd(c.dirs[i], vmul(rndDir(), 0.9))); }
    c.calm = 0; c.settled = false;
  }
  function clStep(c, dt) {
    const n = c.n;
    if (n >= 2) {
      const sub = 4, h = Math.min(dt, 0.05) / sub;
      for (let s = 0; s < sub; s++) {
        for (let i = 0; i < n; i++) {
          let f = [0, 0, 0];
          for (let j = 0; j < n; j++) {
            if (i === j) continue;
            const df = vsub(c.dirs[i], c.dirs[j]), L = vlen(df) + 1e-4;
            f = vadd(f, vmul(df, 60 / (L * L * L)));
          }
          f = vsub(f, vmul(c.dirs[i], vdot(f, c.dirs[i])));
          c.vel[i] = vmul(vadd(c.vel[i], vmul(f, h)), Math.exp(-7 * h));
        }
        for (let i = 0; i < n; i++) {
          c.dirs[i] = vnorm(vadd(c.dirs[i], vmul(c.vel[i], h)));
          c.vel[i] = vsub(c.vel[i], vmul(c.dirs[i], vdot(c.vel[i], c.dirs[i])));
        }
      }
      let sp = 0, mn = 180;
      for (let i = 0; i < n; i++) { sp += vlen(c.vel[i]); for (let j = i + 1; j < n; j++) mn = Math.min(mn, angDeg(c.dirs[i], c.dirs[j])); }
      c.speed = sp; c.minAng = mn;
      if (sp < 0.5) clAlign(c, dt);
      const ok = sp < 0.03 && Math.abs(mn - IDEAL[n]) < 0.25;
      c.calm = ok ? c.calm + dt : 0;
      c.settled = c.calm > 0.3;
    } else { c.speed = 0; c.minAng = 0; c.calm = 0; c.settled = false; }
  }
  // 전체를 한 덩어리로 천천히 돌려 보기 좋은 방향으로 맞춰 줘요 (상대 각도는 그대로)
  const CANON = { 2: [[-1, 0, 0], [1, 0, 0]], 3: [90, 210, 330].map((a) => [Math.cos(a * Math.PI / 180), Math.sin(a * Math.PI / 180), 0]), 4: K4(0, IDEAL[4]) };
  function frameOf(a, b) {
    const e1 = vnorm(a); let e2 = vsub(b, vmul(e1, vdot(b, e1)));
    if (vlen(e2) < 1e-3) return null;
    e2 = vnorm(e2); return [e1, e2, vcross(e1, e2)];
  }
  function rotAbout(v, k, th) { const c = Math.cos(th), s_ = Math.sin(th); return vadd(vadd(vmul(v, c), vmul(vcross(k, v), s_)), vmul(k, vdot(k, v) * (1 - c))); }
  function clAlign(c, dt) {
    const n = c.n; if (n < 2 || c.speed > 0.6 || RM) return;
    const can = CANON[n]; let axis, th;
    const fc = n > 2 ? frameOf(c.dirs[0], c.dirs[1]) : null, fk = n > 2 ? frameOf(can[0], can[1]) : null;
    if (fc && fk) {
      const R = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
      for (let k = 0; k < 3; k++) for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) R[i][j] += fk[k][i] * fc[k][j];
      const tr = R[0][0] + R[1][1] + R[2][2];
      th = Math.acos(clamp((tr - 1) / 2, -1, 1));
      axis = [R[2][1] - R[1][2], R[0][2] - R[2][0], R[1][0] - R[0][1]];
    } else {
      th = Math.acos(clamp(vdot(c.dirs[0], can[0]), -1, 1));
      axis = vcross(c.dirs[0], can[0]);
      if (vlen(axis) < 1e-3) axis = [0, 0, 1];
    }
    if (th < 1e-3 || vlen(axis) < 1e-6) return;
    const k = vnorm(axis), f = 1 - Math.exp(-2.5 * Math.min(dt, 0.05));
    for (let i = 0; i < n; i++) { c.dirs[i] = vnorm(rotAbout(c.dirs[i], k, th * f)); }
  }
  // 화면에 보이는 각도: 정렬이 끝나면 이상값, 아니면 지금 측정값
  const clAngle = (c) => (c.settled ? IDEAL[c.n] : c.minAng);
  const clPair = (c) => { let bi = 0, bj = 1, mn = 999; for (let i = 0; i < c.n; i++) for (let j = i + 1; j < c.n; j++) { const a = angDeg(c.dirs[i], c.dirs[j]); if (a < mn) { mn = a; bi = i; bj = j; } } return [bi, bj]; };

  /* ---------- 장면 관리 ---------- */
  const S = { scene: 'balloon', sceneA: 1 };
  const TB = { balloon: '🎈 풍선 모형', table: '📋 구조 표 만들기', lone: '💧 비공유 전자쌍', model: '🧩 분자 모델링' };
  function setScene(sc) {
    if (S.scene === sc) { updateUI(); return; }
    S.scene = sc; hintEl.classList.add('hide');
    S.sceneA = 0; tween(S, { sceneA: 1 }, { duration: 0.4, ease: 'outCubic' });
    updateUI();
  }
  function updateUI() {
    const sc = S.scene;
    ['balloon', 'table', 'lone', 'model'].forEach((k) => { $('#cs-' + k).hidden = k !== sc; });
    $$('#sceneSeg button').forEach((b) => b.classList.toggle('on', b.dataset.scene === sc));
    const n = $$('#sceneSeg button').filter((b) => !b.hidden).length;
    $('#sceneSeg').hidden = n < 2;
    $('#tbLabel').textContent = TB[sc]; $('#tbLabel').hidden = n >= 2;
    $('#tabTable').hidden = !(sc === 'table' && TT.show);
    $('#lpTable').hidden = !(sc === 'lone' && LP.show);
  }

  /* =========================================================
     ① 풍선 모형
     ========================================================= */
  const C3 = () => ({ x: VW / 2, y: PHONE ? 350 : 322 });
  const BAL_COL = ['#fb7185', '#38bdf8', '#fbbf24', '#34d399'];
  const B = { n: 3, cl: makeCluster(), prot: false, seen: {}, calmT: { 2: 0, 3: 0, 4: 0 } };
  function setBalN(n) {
    B.n = n; clSetN(B.cl, n);
    $$('#nSeg button').forEach((b) => b.classList.toggle('on', +b.dataset.n === n));
    Sound.click();
  }
  function setProt(on) { B.prot = on; $('#protBtn').classList.toggle('sw-on', on); $('#protBtn').textContent = on ? '📐 각도 재는 중' : '📐 각도 재기'; }
  function resetBalloon() {
    B.cl = makeCluster(); B.calmT = { 2: 0, 3: 0, 4: 0 };
    clSetN(B.cl, B.n);
    setProt(false);
  }
  function stepBalloon(dt) {
    clStep(B.cl, dt);
    const n = B.n;
    if (B.cl.settled && B.prot) { B.calmT[n] += dt; if (B.calmT[n] > 0.5 && !B.seen[n]) { B.seen[n] = true; Sound.success(); const c = C3(); fx.burst(c.x, c.y, { count: 20, colors: ['#fb7185', '#38bdf8', '#fbbf24', '#34d399'], speed: 160, size: 3.5 }); showHint(n + '개의 풍선 → ' + SHAPE_BY_N[n] + ', 각도 ' + fa(IDEAL[n]) + '°', 4500); } }
    else B.calmT[n] = 0;
  }
  function drawBalloon(t) {
    const C = C3(), S_ = PHONE ? 1.1 : 1.3, cl = B.cl;
    D.text(VW / 2, TY, '전자 영역 = 풍선 · 중심에서 서로 밀어내요', { size: fs(18), weight: 800, color: '#4c1d95' });
    // 바닥 그림자
    ctx.save(); ctx.fillStyle = 'rgba(80,60,140,.10)'; ctx.beginPath(); ctx.ellipse(C.x, C.y + 175, 150, 22, 0, 0, TAU); ctx.fill(); ctx.restore();
    const items = [];
    for (let i = 0; i < 4; i++) {
      const sz = cl.sz[i];
      if (sz < 0.02) continue;
      const dr = rot(cl.dirs[i]);
      items.push({ z: dr[2] * 62, f() { const wob = RM ? 0 : Math.sin(t * 11 + i * 1.7) * Math.min(0.09, cl.speed * 0.05); spheroid(C, S_, dr, 62 * sz, 27 * sz, BAL_COL[i], 0.86, wob); } });
    }
    items.push({ z: 0, f() { D.sphere(C.x, C.y, 16, '#7c3aed', { shadow: true, text: '중심', textScale: 0.62 }); } });
    items.sort((a, b) => a.z - b.z).forEach((it) => it.f());
    if (B.prot && cl.n >= 2) {
      const [i, j] = clPair(cl);
      const val = cl.settled ? fa(IDEAL[cl.n]) : fa(cl.minAng);
      arc3(C, S_, rot(cl.dirs[i]), rot(cl.dirs[j]), 58, '#1f2937', val + '°');
    }
    // 상태 표시
    const msg = cl.settled ? SHAPE_BY_N[B.n] + ' (' + B.n + '개 풍선)' : '정렬 중…';
    D.label(VW / 2, VH - fs(44), msg, { size: fs(16), bg: cl.settled ? '#dcfce7' : '#fff', color: cl.settled ? '#0b6b39' : MUTED, border: cl.settled ? '#14a058' : '#cbd5e1', pad: 12 });
    D.text(VW / 2, VH - fs(78), '화면을 끌어 돌려 보세요', { size: fs(12.5), weight: 700, color: MUTED });
  }

  /* =========================================================
     ② 구조 표 만들기: 루이스 구조의 전자 영역을 눌러 풍선으로 바꾸기
     ========================================================= */
  const o_ = (e, x, y, o, lp) => ({ e, x, y, o, lp });
  const VM = {
    BeCl2: { f: 'BeCl₂', html: 'BeCl<sub>2</sub>', name: '염화 베릴륨', c: 'Be', outer: [o_('Cl', -1, 0, 1, 3), o_('Cl', 1, 0, 1, 3)], n: 2, shape: '직선형', ang: 180 },
    BF3:   { f: 'BF₃',   html: 'BF<sub>3</sub>',   name: '삼플루오린화 붕소', c: 'B', outer: [o_('F', -1, 0, 1, 3), o_('F', 1, 0, 1, 3), o_('F', 0, 1, 1, 3)], n: 3, shape: '평면 삼각형', ang: 120 },
    CH4:   { f: 'CH₄',   html: 'CH<sub>4</sub>',   name: '메테인', c: 'C', outer: [o_('H', -1, 0, 1, 0), o_('H', 1, 0, 1, 0), o_('H', 0, -1, 1, 0), o_('H', 0, 1, 1, 0)], n: 4, shape: '정사면체', ang: IDEAL[4] },
    CO2:   { f: 'CO₂',   html: 'CO<sub>2</sub>',   name: '이산화 탄소', c: 'C', outer: [o_('O', -1, 0, 2, 2), o_('O', 1, 0, 2, 2)], n: 2, shape: '직선형', ang: 180 },
    HCN:   { f: 'HCN',   html: 'HCN',              name: '사이안화 수소', c: 'C', outer: [o_('H', -1, 0, 1, 0), o_('N', 1, 0, 3, 1)], n: 2, shape: '직선형', ang: 180 },
    CCl4:  { f: 'CCl₄',  html: 'CCl<sub>4</sub>',  name: '사염화 탄소', c: 'C', outer: [o_('Cl', -1, 0, 1, 3), o_('Cl', 1, 0, 1, 3), o_('Cl', 0, -1, 1, 3), o_('Cl', 0, 1, 1, 3)], n: 4, shape: '정사면체', ang: IDEAL[4] },
  };
  const VM_KEYS = ['BeCl2', 'BF3', 'CH4', 'CO2', 'HCN', 'CCl4'];
  const SIDE = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  const TT = { mol: 'BeCl2', sel: {}, built: {}, cl: makeCluster(), calm: 0, show: false };
  VM_KEYS.forEach((k) => { TT.sel[k] = []; });
  const LC = () => (PHONE ? { x: 280, y: 232 } : { x: 205, y: 318 });
  const U2 = PHONE ? 96 : 92;
  const TC = () => (PHONE ? { x: 280, y: 548 } : { x: 598, y: 330 });
  const T3S = PHONE ? 0.78 : 0.82;
  const ttM = () => VM[TT.mol];
  function ttSelect(k) {
    TT.mol = k;
    TT.cl = makeCluster(); clSetN(TT.cl, TT.sel[k].length); TT.calm = 0;
    $$('#molSel .opt').forEach((b) => { b.classList.toggle('on', b.dataset.m === k); b.classList.toggle('done', !!TT.built[b.dataset.m]); });
  }
  function ttReset() {
    VM_KEYS.forEach((k) => { TT.sel[k] = []; });
    ttSelect(TT.mol);
  }
  const ttPos = (i) => { const c = LC(), a = ttM().outer[i]; return { x: c.x + a.x * U2, y: c.y + a.y * U2 }; };
  const ttMid = (i) => { const c = LC(), p = ttPos(i); return { x: (c.x + p.x) / 2, y: (c.y + p.y) / 2 }; };
  function ttTap(p) {
    const M = ttM(), sel = TT.sel[TT.mol];
    for (let i = 0; i < M.outer.length; i++) {
      const m = ttMid(i);
      if (Math.hypot(p.x - m.x, p.y - m.y) < 36) {
        const at_ = sel.indexOf(i);
        if (at_ >= 0) sel.splice(at_, 1); else sel.push(i);
        clSetN(TT.cl, sel.length); TT.calm = 0;
        Sound.tick();
        if (at_ < 0) fx.burst(m.x, m.y, { count: 8, colors: ['#a78bfa', '#c4b5fd', '#fff'], speed: 80, size: 3, gravity: 0, life: 0.5 });
        return true;
      }
    }
    return false;
  }
  function stepTable(dt) {
    const M = ttM(), sel = TT.sel[TT.mol];
    clStep(TT.cl, dt);
    if (sel.length === M.outer.length && TT.cl.settled) {
      TT.calm += dt;
      if (TT.calm > 0.4 && !TT.built[TT.mol]) {
        TT.built[TT.mol] = true; Sound.success();
        const c = TC(); fx.burst(c.x, c.y, { count: 24, colors: ['#fb7185', '#38bdf8', '#fbbf24', '#34d399'], speed: 170, size: 3.5 });
        showHint(M.f + ': 전자 영역 ' + M.n + '개 → ' + M.shape, 5000);
        $$('#molSel .opt').forEach((b) => b.classList.toggle('done', !!TT.built[b.dataset.m]));
      }
    } else TT.calm = 0;
  }
  const builtCount = () => VM_KEYS.filter((k) => TT.built[k]).length;
  function lewisAtom(x, y, e, r, o) {
    o = o || {};
    ctx.save();
    D.shadow(() => { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }, { blur: 7, y: 2, color: 'rgba(60,40,120,.22)' });
    ctx.strokeStyle = ELC[e] === ELC.H ? '#94a3b8' : ELC[e]; ctx.lineWidth = o.ring || 3.5; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
    D.text(x, y + 1, e, { size: Math.round(r * (e.length > 1 ? 0.92 : 1.1)), weight: 800, color: INK, baseline: 'middle' });
    ctx.restore();
  }
  function lpDots(x, y, side, r) {
    const sx = SIDE[side][0], sy = SIDE[side][1], px = -sy, py = sx;
    for (const g of [-1, 1]) { D.sphere(x + sx * (r + 9) + px * 6 * g, y + sy * (r + 9) + py * 6 * g, 4.2, '#3867f4', { shadow: false, gloss: false, outline: 'rgba(20,40,120,.55)', outlineWidth: 1 }); }
  }
  function drawLewisT(t) {
    const M = ttM(), c = LC(), sel = TT.sel[TT.mol], r = PHONE ? 20 : 22;
    if (PHONE) D.text(78, c.y - 104, '루이스 구조', { size: fs(15), weight: 800, color: MUTED }); else D.text(c.x, c.y - 205, '루이스 구조', { size: fs(15), weight: 800, color: MUTED });
    const need = sel.length < M.outer.length;
    M.outer.forEach((a, i) => {
      const p = ttPos(i), dx = p.x - c.x, dy = p.y - c.y, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L, px = -uy, py = ux;
      const idx = sel.indexOf(i), on = idx >= 0, m = ttMid(i);
      // 영역 강조 (눌린 영역은 보라색 알약)
      ctx.save();
      ctx.translate(m.x, m.y); ctx.rotate(Math.atan2(dy, dx));
      const pw = (L - 2 * r) - 8 + 0, ph = 14 + a.o * 12;
      D.roundRect(-pw / 2, -ph / 2, pw, ph, ph / 2);
      if (on) { ctx.fillStyle = 'rgba(124,58,237,.16)'; ctx.fill(); ctx.strokeStyle = '#7c3aed'; ctx.lineWidth = 2.5; ctx.stroke(); }
      else { ctx.setLineDash([5, 5]); ctx.lineDashOffset = -t * 10; ctx.strokeStyle = 'rgba(124,58,237,' + (0.35 + 0.3 * Math.sin(t * 4 + i)) + ')'; ctx.lineWidth = 2; ctx.stroke(); }
      ctx.restore();
      // 결합선 (단일 · 이중 · 삼중)
      for (let k = 0; k < a.o; k++) {
        const off = (k - (a.o - 1) / 2) * 9;
        ctx.strokeStyle = '#14a058'; ctx.lineWidth = 4; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(c.x + ux * (r + 4) + px * off, c.y + uy * (r + 4) + py * off); ctx.lineTo(p.x - ux * (r + 4) + px * off, p.y - uy * (r + 4) + py * off); ctx.stroke();
      }
      if (on) { const vert = Math.abs(uy) > Math.abs(ux), qx = -uy, qy = ux; D.label(vert ? m.x + qx * 64 : m.x, vert ? m.y : m.y + qy * (ph / 2 + (qy < 0 ? 12 : 16)), '영역 ' + (idx + 1), { size: fs(12), bg: '#7c3aed', color: '#fff', pad: 6 }); }
    });
    M.outer.forEach((a, i) => {
      const p = ttPos(i);
      lewisAtom(p.x, p.y, a.e, r);
      const cs = sideTo2(a, { x: 0, y: 0 });
      const free = [0, 2, 1, 3].filter((s) => s !== cs).slice(0, a.lp);
      free.forEach((s) => lpDots(p.x, p.y, s, r));
    });
    lewisAtom(c.x, c.y, M.c, r + 2, { ring: 4.5 });
    D.label(c.x, c.y - r - (PHONE ? 30 : 22), '중심 원자', { size: fs(12), bg: '#7c3aed', color: '#fff', pad: 7 });
    if (need) D.text(c.x, c.y + (PHONE ? 140 : 168), '중심 원자 둘레의 전자 영역(보라 점선)을 눌러요', { size: fs(13.5), weight: 800, color: '#7c3aed' });
    else D.text(c.x, c.y + (PHONE ? 140 : 168), '영역을 모두 풍선으로 바꿨어요!', { size: fs(13.5), weight: 800, color: '#0b6b39' });
    D.text(c.x, c.y + (PHONE ? 164 : 190), '결합은 단일 · 이중 · 삼중 모두 영역 1개', { size: fs(12.5), weight: 700, color: MUTED });
  }
  function sideTo2(a, b) { const dx = b.x - a.x, dy = b.y - a.y; return Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0); }
  function drawTable(t) {
    const M = ttM(), cl = TT.cl, sel = TT.sel[TT.mol], C = TC(), S_ = T3S;
    D.text(VW / 2, TY - 6, M.name + ' ' + M.f, { size: fs(20), weight: 800, color: TT.built[TT.mol] ? '#0b6b39' : '#4c1d95' });
    drawLewisT(t);
    // 화살표
    if (!PHONE) D.arrow(LC().x + 160, LC().y, C.x - 170, C.y, { color: '#c4b5fd', width: 5 });
    // 3D 모형
    const items = [];
    for (let i = 0; i < 4; i++) {
      const sz = cl.sz[i];
      if (sz < 0.02 || i >= sel.length) continue;
      const a = M.outer[sel[i]], dr = rot(cl.dirs[i]), col = BAL_COL[i];
      items.push({ z: dr[2] * 62, f() { const wob = RM ? 0 : Math.sin(t * 11 + i * 1.7) * Math.min(0.09, cl.speed * 0.05); spheroid(C, S_, dr, 62 * sz, 27 * sz, col, 0.74, wob); } });
      items.push({ z: dr[2] * 124 + 1, f() { ball(C, S_, vmul(dr, 118 * sz), ELR[a.e] * 1.15 * sz, ELC[a.e], a.e, {}); } });
    }
    items.push({ z: 0, f() { ball(C, S_, [0, 0, 0], ELR[M.c] * 1.25, ELC[M.c], M.c, {}); } });
    items.sort((a, b) => a.z - b.z).forEach((it) => it.f());
    if (sel.length >= 2 && cl.settled) {
      const [i, j] = clPair(cl);
      arc3(C, S_, rot(cl.dirs[i]), rot(cl.dirs[j]), 60, '#1f2937', fa(IDEAL[cl.n]) + '°', { size: 14, off: 24 });
    }
    const lab = sel.length === 0 ? '영역을 눌러 풍선을 만들어요' : TT.built[TT.mol] ? M.shape + ' · 전자 영역 ' + M.n + '개' : '전자 영역 ' + sel.length + '개 선택';
    D.label(C.x, C.y + (PHONE ? 150 : 195), lab, { size: fs(14.5), bg: TT.built[TT.mol] ? '#dcfce7' : '#fff', color: TT.built[TT.mol] ? '#0b6b39' : MUTED, border: TT.built[TT.mol] ? '#14a058' : '#cbd5e1', pad: 12 });
    if (TT.built[TT.mol]) D.check(VW - fs(40), TY - 6, 20 * pop('ttStamp' + TT.mol, 0.6), 1);
  }
  // 팝 효과
  const popT = {};
  function pop(key, dur) { if (popT[key] == null) popT[key] = NOW; return RM ? 1 : Math.max(0.05, SciSim.ease.outBack(clamp((NOW - popT[key]) / (dur || 0.4), 0, 1))); }

  /* ---------- 구조 표 입력 ---------- */
  const SHAPES = ['직선형', '평면 삼각형', '정사면체'];
  function buildTabTable() {
    const body = $('#tabBody');
    VM_KEYS.forEach((k) => {
      const tr = document.createElement('tr');
      tr.innerHTML = '<td>' + VM[k].html + '</td><td><select data-k="' + k + '" data-t="n" aria-label="' + VM[k].f + ' 전자 영역 수"><option value="">?</option><option value="2">2개</option><option value="3">3개</option><option value="4">4개</option></select></td>' +
        '<td><select data-k="' + k + '" data-t="s" aria-label="' + VM[k].f + ' 분자 모양"><option value="">?</option>' + SHAPES.map((s) => '<option>' + s + '</option>').join('') + '</select></td>';
      body.appendChild(tr);
    });
    $$('#tabBody select').forEach((sel) => sel.addEventListener('change', () => {
      Sound.click();
      const M = VM[sel.dataset.k], want = sel.dataset.t === 'n' ? String(M.n) : M.shape;
      sel.classList.remove('ok', 'bad');
      if (sel.value !== '') sel.classList.add(sel.value === want ? 'ok' : 'bad');
    }));
  }
  function tabCheck() {
    let miss = 0, wrong = 0;
    $$('#tabBody select').forEach((sel) => {
      const M = VM[sel.dataset.k], want = sel.dataset.t === 'n' ? String(M.n) : M.shape;
      if (sel.value === '') miss++; else if (sel.value !== want) wrong++;
    });
    if (miss) return '표의 빈칸이 ' + miss + '칸 남았어요. 분자마다 전자 영역을 눌러 풍선 모형을 만들어 보세요.';
    if (wrong) return '빨간색 칸이 ' + wrong + '곳 틀렸어요. 다중 결합은 영역 1개로 세는 것을 기억해요.';
    return true;
  }
  const tabFilled = () => $$('#tabBody select').filter((s) => s.value !== '').length;

  /* =========================================================
     ③ 비공유 전자쌍: CH₄ → NH₃ → H₂O (전자 영역 4개, 비공유 전자쌍 0 · 1 · 2쌍)
     ========================================================= */
  const LANG = [IDEAL[4], 107, 104.5];
  const KS = [K4(0, LANG[0]), K4(1, LANG[1]), K4(2, LANG[2])];
  const LMOL = [{ f: 'CH₄', html: 'CH<sub>4</sub>', name: '메테인', c: 'C', shape: '정사면체', ang: LANG[0] }, { f: 'NH₃', html: 'NH<sub>3</sub>', name: '암모니아', c: 'N', shape: '삼각뿔', ang: LANG[1] }, { f: 'H₂O', html: 'H<sub>2</sub>O', name: '물', c: 'O', shape: '굽은형', ang: LANG[2] }];
  const LP = { k: 0, sp: new Spring(0, { stiffness: 70, damping: 9 }), seen: {}, hold: [0, 0, 0], show: false };
  const L3 = () => ({ x: VW / 2, y: PHONE ? 360 : 330 });
  function lpDirs() {
    const s = clamp(LP.sp.value, 0, 2), kf = Math.min(1, Math.floor(s)), fr = clamp(s - kf, 0, 1);
    return [0, 1, 2, 3].map((i) => vnorm(vadd(vmul(KS[kf][i], 1 - fr), vmul(KS[kf + 1][i], fr))));
  }
  const lpW = () => { const s = LP.sp.value; return [0, 0, clamp(s - 1, 0, 1), clamp(s, 0, 1)]; };
  function lpAngleNow() {
    const s = LP.sp.value, r = Math.round(s);
    if (Math.abs(s - r) < 0.004) return LANG[clamp(r, 0, 2)];
    const d = lpDirs();
    return angDeg(d[0], d[1]);
  }
  function setLP(k) {
    LP.k = k; LP.sp.target = k;
    $$('#lpSeg button').forEach((b) => b.classList.toggle('on', +b.dataset.k === k));
    Sound.click();
    if (RM) LP.sp.value = k;
  }
  function stepLone(dt) {
    LP.sp.update(dt);
    const r = Math.round(LP.sp.value), ok = Math.abs(LP.sp.value - r) < 0.02 && Math.abs(LP.sp.velocity) < 0.05;
    for (let k = 0; k < 3; k++) {
      LP.hold[k] = ok && r === k ? LP.hold[k] + dt : 0;
      if (LP.hold[k] > 0.6 && !LP.seen[k]) {
        LP.seen[k] = true; Sound.success();
        const c = L3(); fx.burst(c.x, c.y, { count: 18, colors: ['#fb7185', '#60a5fa', '#fbbf24'], speed: 150, size: 3.5 });
        showHint(LMOL[k].f + ': 비공유 전자쌍 ' + k + '쌍 → ' + LMOL[k].shape + ', ' + fa(LANG[k]) + '°', 4500);
      }
    }
  }
  const lpSeenCount = () => [0, 1, 2].filter((k) => LP.seen[k]).length;
  function drawLone(t) {
    const C = L3(), LS = PHONE ? 1.0 : 1.2, s = LP.sp.value, dirs = lpDirs(), w = lpW();
    const kk = clamp(Math.round(s), 0, 2), M = LMOL[kk];
    D.text(VW / 2, TY - 4, '전자 영역 4개 = 결합 전자쌍 ' + (4 - kk) + '개 + 비공유 전자쌍 ' + kk + '개', { size: fs(17), weight: 800, color: '#4c1d95' });
    ctx.save(); ctx.fillStyle = 'rgba(80,60,140,.10)'; ctx.beginPath(); ctx.ellipse(C.x, C.y + 168, 150, 22, 0, 0, TAU); ctx.fill(); ctx.restore();
    const items = [];
    for (let i = 0; i < 4; i++) {
      const dr = rot(dirs[i]), wi = w[i];
      const h = lerp(60, 70, wi), R = lerp(26, 40, wi);
      const col = CO.mix('#fb7185', '#3b82f6', wi);
      const wob = RM ? 0 : Math.sin(t * 9 + i) * Math.max(0, 0.05 * (1 - Math.abs(Math.cos(Math.PI * s)) * 0) * Math.min(1, Math.abs(LP.sp.velocity) * 2));
      items.push({ z: dr[2] * h, f() { spheroid(C, LS, dr, h, R, col, 0.8, wob); } });
      if (wi < 0.98) items.push({ z: dr[2] * 2 * h + 1, f() { ball(C, LS, vmul(dr, 120), 15 * (1 - wi), ELC.H, 'H', {}); } });
    }
    items.push({ z: 0, f() { ball(C, LS, [0, 0, 0], 22, ELC[M.c], M.c, {}); } });
    items.sort((a, b) => a.z - b.z).forEach((it) => it.f());
    // 결합각 호 (결합 전자쌍 0번 · 1번 사이)
    const ang = lpAngleNow();
    arc3(C, LS, rot(dirs[0]), rot(dirs[1]), 62, '#1f2937', fa(ang) + '°', { size: 15 });
    // 비공유 전자쌍 이름표
    for (let i = 2; i < 4; i++) if (w[i] > 0.9) { const q = proj(C, LS, vmul(rot(dirs[i]), 128)); D.label(q.x, q.y - 4, '비공유 전자쌍', { size: fs(12), bg: '#1d4ed8', color: '#fff', pad: 6 }); }
    D.label(VW / 2, VH - fs(44), M.name + ' ' + M.f + ' · ' + M.shape + ' · ' + fa(M.ang) + '°', { size: fs(16), bg: '#fff', color: '#4c1d95', border: '#c4b5fd', pad: 12 });
    D.text(VW / 2, VH - fs(78), '화면을 끌어 돌려 보세요 · 비공유 전자쌍(파랑)은 더 크게 퍼져요', { size: fs(12.5), weight: 700, color: MUTED });
  }
  // 모양 · 각도 표
  const LP_SHAPES = ['정사면체', '삼각뿔', '굽은형', '직선형', '평면 삼각형'];
  const LP_ANGS = ['109.5°', '107°', '104.5°', '120°', '180°'];
  function buildLpTable() {
    const body = $('#lpBody');
    LMOL.forEach((m, k) => {
      const tr = document.createElement('tr');
      tr.innerHTML = '<td>' + m.html + '</td><td><select data-k="' + k + '" data-t="s" aria-label="' + m.f + ' 분자 모양"><option value="">?</option>' + LP_SHAPES.map((s) => '<option>' + s + '</option>').join('') + '</select></td>' +
        '<td><select data-k="' + k + '" data-t="a" aria-label="' + m.f + ' 결합각"><option value="">?</option>' + LP_ANGS.map((s) => '<option>' + s + '</option>').join('') + '</select></td>';
      body.appendChild(tr);
    });
    $$('#lpBody select').forEach((sel) => sel.addEventListener('change', () => {
      Sound.click();
      const m = LMOL[+sel.dataset.k], want = sel.dataset.t === 's' ? m.shape : fa(m.ang) + '°';
      sel.classList.remove('ok', 'bad');
      if (sel.value !== '') sel.classList.add(sel.value === want ? 'ok' : 'bad');
    }));
  }
  function lpCheck() {
    let miss = 0, wrong = 0;
    $$('#lpBody select').forEach((sel) => {
      const m = LMOL[+sel.dataset.k], want = sel.dataset.t === 's' ? m.shape : fa(m.ang) + '°';
      if (sel.value === '') miss++; else if (sel.value !== want) wrong++;
    });
    if (miss) return '표의 빈칸이 ' + miss + '칸 남았어요. 비공유 전자쌍을 0 · 1 · 2쌍으로 바꾸며 모양과 각도를 살펴봐요.';
    if (wrong) return '빨간색 칸이 ' + wrong + '곳 틀렸어요. 비공유 전자쌍이 많을수록 결합각이 작아져요.';
    return true;
  }
  const lpFilled = () => $$('#lpBody select').filter((s) => s.value !== '').length;

  /* =========================================================
     ④ 분자 모델링: 막대-공 모형 조립 → 구조 최적화 → 각도 측정
     ========================================================= */
  const mo_ = (e, o) => ({ e, o });
  const MODEL = {
    BF3: { f: 'BF₃', name: '삼플루오린화 붕소', c: 'B', outer: [mo_('F', 1), mo_('F', 1), mo_('F', 1)], lp: 0, ang: 120, shape: '평면 삼각형' },
    NH3: { f: 'NH₃', name: '암모니아', c: 'N', outer: [mo_('H', 1), mo_('H', 1), mo_('H', 1)], lp: 1, ang: 107, shape: '삼각뿔' },
    H2O: { f: 'H₂O', name: '물', c: 'O', outer: [mo_('H', 1), mo_('H', 1)], lp: 2, ang: 104.5, shape: '굽은형' },
    CO2: { f: 'CO₂', name: '이산화 탄소', c: 'C', outer: [mo_('O', 2), mo_('O', 2)], lp: 0, ang: 180, shape: '직선형' },
    CH4: { f: 'CH₄', name: '메테인', c: 'C', outer: [mo_('H', 1), mo_('H', 1), mo_('H', 1), mo_('H', 1)], lp: 0, ang: IDEAL[4], shape: '정사면체' },
    A: { f: 'PCl₃', name: '미지 분자 A', c: 'P', outer: [mo_('Cl', 1), mo_('Cl', 1), mo_('Cl', 1)], lp: 1, ang: 100, shape: '삼각뿔', unknown: true, info: '중심 P 1개 · Cl 3개 · 총 원자가 전자 26개 (P–Cl 단일 결합 3개)' },
    B: { f: 'HCN', name: '미지 분자 B', c: 'C', outer: [mo_('H', 1), mo_('N', 3)], lp: 0, ang: 180, shape: '직선형', unknown: true, info: '중심 C 1개 · H 1개 · N 1개 · 총 원자가 전자 10개 (H–C 단일 결합, C–N 다중 결합)' },
  };
  const MKEYS = ['BF3', 'NH3', 'H2O', 'CO2', 'CH4'];
  const MD = { key: 'NH3', atoms: [], opt: false, ghostA: 0, pred: {}, good: {}, rec: {}, meas: false, sel: [], drag: -1, optDone: {} };
  const MC3 = () => ({ x: VW / 2, y: PHONE ? 330 : 262 });
  const MS3 = PHONE ? 1.25 : 1.75;
  const mdM = () => MODEL[MD.key];
  const Lb = (e, c) => (ELR[c] + ELR[e] + 46);
  function mdDirs(M) {
    const n = M.outer.length + M.lp;
    if (n === 2) return [[1, 0, 0], [-1, 0, 0]];
    if (n === 3) return [90, 210, 330].map((a) => [Math.cos(a * Math.PI / 180), Math.sin(a * Math.PI / 180), 0]);
    return K4(M.lp, M.ang);
  }
  function mdFlat(i, n, M) {
    const ang = n === 2 ? [50, 130][i] : n === 4 ? 45 + 90 * i : 90 + 120 * i;
    const a = ang * Math.PI / 180, L = Lb(M.outer[i].e, M.c);
    return [Math.cos(a) * L, Math.sin(a) * L, 0];
  }
  function trayPos(i, n) { return { x: VW / 2 + (i - (n - 1) / 2) * (PHONE ? 86 : 104), y: VH - (PHONE ? 78 : 76) }; }
  function mdReset(key) {
    if (key) MD.key = key;
    const M = mdM(), n = M.outer.length;
    MD.atoms = M.outer.map((o, i) => { const tp = trayPos(i, n); return { e: o.e, o: o.o, st: 'tray', x: tp.x, y: tp.y, hx: tp.x, hy: tp.y, a: 0, p: mdFlat(i, n, M).slice(), tgt: mdFlat(i, n, M) }; });
    MD.opt = false; MD.ghostA = 0; MD.sel = []; MD.drag = -1; MD.meas = false;
    $$('#modSel .opt').forEach((b) => { b.classList.toggle('on', b.dataset.m === MD.key); b.classList.toggle('done', !!(MD.rec[b.dataset.m] || MD.good[b.dataset.m])); });
    $('#predRow').hidden = !M.unknown;
    $('#predSel').value = MD.pred[key || MD.key] || ''; $('#predSel').disabled = false;
    mdUI();
  }
  const mdAttached = () => MD.atoms.every((a) => a.st === 'attached');
  function mdUI() {
    const M = mdM(), nb = $('#optBtn'), mb = $('#measBtn'), note = $('#asmNote');
    const att = MD.atoms.filter((a) => a.st === 'attached').length, n = MD.atoms.length;
    let msg;
    if (!mdAttached()) msg = (M.unknown ? '<b>' + M.name + '</b>: ' + M.info + '.<br>' : '') + '아래 부품 상자의 공을 끌어 중심 원자 ' + M.c + '에 붙여요. (' + att + ' / ' + n + ')';
    else if (!MD.opt) msg = M.unknown && !MD.pred[MD.key] ? '모두 붙였어요. 먼저 🔮 모양을 예측한 뒤 ✨ 구조 최적화를 눌러요.' : '모두 붙였어요! ✨ <b>구조 최적화</b>를 눌러 전자쌍이 가장 멀어지는 모양으로 바꿔요.';
    else msg = '<b>' + M.shape + '</b>이 되었어요. 📐 <b>각도 재기</b>를 켜고 바깥 원자 두 개를 눌러 결합각을 읽어요.' + (M.lp ? ' (비공유 전자쌍 ' + M.lp + '쌍은 파란 풍선)' : '');
    note.innerHTML = msg;
    nb.textContent = MD.opt ? '↺ 다시 조립' : '✨ 구조 최적화';
    nb.disabled = MD.opt ? false : !(mdAttached() && (!M.unknown || MD.pred[MD.key]));
    mb.disabled = !MD.opt;
    mb.classList.toggle('sw-on', MD.meas);
    mb.textContent = MD.meas ? '📐 각도 재는 중' : '📐 각도 재기';
  }
  function mdOptimize() {
    const M = mdM();
    if (MD.opt) { Sound.click(); mdReset(); return; }
    if (!mdAttached() || (M.unknown && !MD.pred[MD.key])) return;
    MD.opt = true; Sound.success();
    const dirs = mdDirs(M);
    MD.atoms.forEach((a, i) => { a.tgt = vmul(dirs[i], Lb(a.e, M.c)); });
    tween(MD, { ghostA: 1 }, { duration: 0.8, delay: 0.3 });
    MD.optDone[MD.key] = true;
    if (M.unknown) {
      const ok = MD.pred[MD.key] === M.shape;
      MD.good[MD.key] = ok || MD.good[MD.key];
      $('#predSel').disabled = true;
      showHint(ok ? '예측이 맞았어요! ' + M.shape : '예측과 달라요. 실제 모양은 ' + M.shape + '이에요. 비공유 전자쌍을 세어 보세요', 5500);
      if (!ok) Sound.fail();
    }
    const c = MC3(); fx.burst(c.x, c.y, { count: 22, colors: ['#fb7185', '#38bdf8', '#fbbf24', '#34d399'], speed: 160, size: 3.5 });
    $$('#modSel .opt').forEach((b) => b.classList.toggle('done', !!(MD.rec[b.dataset.m] || MD.good[b.dataset.m])));
    mdUI();
  }
  function stepModel(dt) {
    MD.atoms.forEach((a) => {
      if (a.st === 'attached') {
        for (let k = 0; k < 3; k++) a.p[k] = RM ? a.tgt[k] : approach(a.p[k], a.tgt[k], dt, MD.opt ? 5 : 8);
      }
    });
  }
  function mdAtomScreen(a) {
    const C = MC3();
    if (a.st === 'attached') {
      const q = proj(C, MS3, rot(a.p));
      return { x: lerp(a.x, q.x, clamp(a.a, 0, 1)), y: lerp(a.y, q.y, clamp(a.a, 0, 1)) };
    }
    return { x: a.x, y: a.y };
  }
  function mdAttach(i) {
    const a = MD.atoms[i], C = MC3();
    a.st = 'attached'; a.a = 0; Sound.tick();
    const q = proj(C, MS3, rot(a.p));
    a.x = a.x; a.y = a.y;
    tween(a, { a: 1 }, { duration: 0.45, ease: 'outBack' });
    fx.burst(q.x, q.y, { count: 10, colors: ['#a78bfa', '#c4b5fd', '#fff'], speed: 90, size: 3, gravity: 0, life: 0.5 });
    mdUI();
  }
  function drawModel(t) {
    const M = mdM(), C = MC3(), S_ = MS3;
    D.text(VW / 2, TY - 6, M.name + (M.unknown ? '' : ' ' + M.f) + (MD.opt ? ' · ' + M.shape : ''), { size: fs(19), weight: 800, color: MD.opt ? '#0b6b39' : '#4c1d95' });
    if (M.unknown && !MD.opt) D.text(VW / 2, TY + fs(20), M.info, { size: fs(12.5), weight: 700, color: '#7c3aed' });
    // 부품 상자
    const n = MD.atoms.length, tp0 = trayPos(0, n), tp1 = trayPos(n - 1, n);
    if (MD.atoms.some((a) => a.st !== 'attached')) {
      ctx.save();
      D.roundRect(tp0.x - 62, tp0.y - 52, tp1.x - tp0.x + 124, 104, 18);
      ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fill(); ctx.setLineDash([7, 6]); ctx.strokeStyle = '#c4b5fd'; ctx.lineWidth = 2; ctx.stroke();
      ctx.restore();
      D.text(VW / 2, tp0.y + 70 - 6, '부품 상자', { size: fs(12), weight: 800, color: MUTED });
    }
    // 3차원 모형
    const items = [];
    const optDirs = mdDirs(M);
    if (MD.opt && M.lp > 0) {
      for (let j = 0; j < M.lp; j++) {
        const dr = rot(optDirs[M.outer.length + j]);
        items.push({ z: dr[2] * 40, f() { ctx.save(); const wob = RM ? 0 : Math.sin(t * 4 + j) * 0.03; spheroid(C, S_, dr, 44, 30, '#3b82f6', 0.5 * MD.ghostA, wob); ctx.restore(); } });
        items.push({ z: dr[2] * 40 + 1, f() { if (MD.ghostA > 0.6) { const q = proj(C, S_, vmul(dr, 92)); D.label(q.x, q.y, '비공유 전자쌍', { size: fs(11.5), bg: '#1d4ed8', color: '#fff', pad: 5 }); } } });
      }
    }
    MD.atoms.forEach((a, i) => {
      if (a.st !== 'attached') return;
      const rp = rot(a.p), show = clamp(a.a, 0, 1);
      items.push({ z: rp[2] / 2, f() {
        const q0 = proj(C, S_, [0, 0, 0]), q1 = proj(C, S_, vmul(rp, show));
        const dx = q1.x - q0.x, dy = q1.y - q0.y, L = Math.hypot(dx, dy) || 1, px = -dy / L, py = dx / L;
        for (let k = 0; k < a.o; k++) {
          const off = (k - (a.o - 1) / 2) * 9;
          ctx.save(); ctx.lineCap = 'round';
          ctx.strokeStyle = 'rgba(40,40,70,.3)'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(q0.x + px * off, q0.y + py * off); ctx.lineTo(q1.x + px * off, q1.y + py * off); ctx.stroke();
          ctx.strokeStyle = '#d1d5db'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(q0.x + px * off, q0.y + py * off); ctx.lineTo(q1.x + px * off, q1.y + py * off); ctx.stroke();
          ctx.restore();
        }
      } });
      items.push({ z: rp[2], f() {
        const sc = mdAtomScreen(a), sel = MD.sel.indexOf(i) >= 0;
        if (sel) D.glow(sc.x, sc.y, 52, '#7c3aed', 0.5);
        D.sphere(sc.x, sc.y, ELR[a.e] * S_ * (1 + rp[2] / 900) * (0.7 + 0.3 * show), ELC[a.e], { shadow: true, text: a.e, textColor: a.e === 'H' ? INK : '#fff', outline: sel ? '#7c3aed' : 'rgba(30,30,60,.35)', outlineWidth: sel ? 3 : 1.2, textScale: 1.0 });
        if (MD.meas && MD.opt) D.ring(sc.x, sc.y, ELR[a.e] * S_ + 8, t + i * 0.3, { color: '#a78bfa', width: 2 });
      } });
    });
    items.push({ z: 0, f() { ball(C, S_, [0, 0, 0], ELR[M.c] * 1.2, ELC[M.c], M.c, {}); } });
    items.sort((a, b) => a.z - b.z).forEach((it) => it.f());
    // 각도 호
    if (MD.opt && MD.sel.length === 2) {
      const a = MD.atoms[MD.sel[0]], b = MD.atoms[MD.sel[1]];
      const val = angDeg(a.tgt, b.tgt);
      arc3(C, S_, rot(vnorm(a.p)), rot(vnorm(b.p)), 52 * S_ / 1.1, '#1f2937', fa(val) + '°', { size: 16, off: 30 });
    }
    // 끌고 있는 공 · 상자 속 공
    MD.atoms.forEach((a, i) => {
      if (a.st === 'attached') return;
      const dragging = MD.drag === i;
      if (dragging) D.glow(a.x, a.y, 56, '#a78bfa', 0.4);
      D.sphere(a.x, a.y - (dragging ? 6 : 0), ELR[a.e] * 1.5 * (dragging ? 1.12 : 1), ELC[a.e], { shadow: true, text: a.e, textColor: a.e === 'H' ? INK : '#fff', outline: 'rgba(30,30,60,.35)', outlineWidth: 1.2 });
    });
    if (!mdAttached() && !MD.atoms.some((a) => a.st === 'attached') && MD.drag < 0) D.ring(C.x, C.y, 54, t, { color: '#a78bfa' });
    if (MD.opt) D.text(VW / 2, VH - fs(40), '화면을 끌어 돌려 보세요', { size: fs(12.5), weight: 700, color: MUTED });
  }

  /* =========================================================
     포인터 · 읽기 창 · 연결
     ========================================================= */
  function updateReadouts() {
    const sc = S.scene;
    if (sc === 'balloon') {
      const cl = B.cl;
      setRO(1, '풍선(전자 영역) 수', B.n + '개');
      setRO(2, '모양', cl.settled ? SHAPE_BY_N[B.n] : '정렬 중…');
      setRO(3, '풍선 사이 각도', B.prot ? (cl.settled ? fa(IDEAL[B.n]) + '°' : fa(cl.minAng) + '° (정렬 중)') : '📐 각도 재기를 켜요');
    } else if (sc === 'table') {
      const M = ttM(), n = TT.sel[TT.mol].length;
      setRO(1, '분자', M.html + ' ' + M.name);
      setRO(2, '선택한 전자 영역 수', n + '개');
      setRO(3, '모양', TT.built[TT.mol] ? M.shape + ' · ' + fa(M.ang) + '°' : '영역을 모두 눌러요');
    } else if (sc === 'lone') {
      const k = clamp(Math.round(LP.sp.value), 0, 2), M = LMOL[k];
      setRO(1, '분자', M.html + ' ' + M.name);
      setRO(2, '모양', M.shape);
      setRO(3, '결합각', fa(lpAngleNow()) + '°');
    } else {
      const M = mdM(), att = MD.atoms.filter((a) => a.st === 'attached').length;
      setRO(1, '분자', M.unknown ? M.name : M.f + ' ' + M.name);
      setRO(2, '진행', MD.opt ? '최적화 완료' : att === MD.atoms.length ? '조립 완료 → 최적화' : '조립 ' + att + ' / ' + MD.atoms.length);
      setRO(3, '잰 결합각', MD.rec[MD.key] || '—');
    }
  }
  let lastP = null;
  function mdHit(p) {
    for (let i = 0; i < MD.atoms.length; i++) { const a = MD.atoms[i]; if (a.st !== 'tray') continue; if (Math.hypot(p.x - a.x, p.y - a.y) < ELR[a.e] * 1.5 + 16) return i; }
    return -1;
  }
  function mdAttachedHit(p) {
    for (let i = 0; i < MD.atoms.length; i++) { const a = MD.atoms[i]; if (a.st !== 'attached') continue; const q = mdAtomScreen(a); if (Math.hypot(p.x - q.x, p.y - q.y) < ELR[a.e] * MS3 + 14) return i; }
    return -1;
  }
  function mdSelect(i) {
    const at_ = MD.sel.indexOf(i);
    if (at_ >= 0) MD.sel.splice(at_, 1); else { MD.sel.push(i); if (MD.sel.length > 2) MD.sel.shift(); }
    Sound.tick();
    if (MD.sel.length === 2 && MD.opt) {
      const a = MD.atoms[MD.sel[0]], b = MD.atoms[MD.sel[1]];
      MD.rec[MD.key] = fa(angDeg(a.tgt, b.tgt)) + '°';
      $$('#modSel .opt').forEach((bb) => bb.classList.toggle('done', !!(MD.rec[bb.dataset.m] || MD.good[bb.dataset.m])));
    }
  }
  SciSim.pointer(view, {
    down(p) {
      const sc = S.scene;
      if (sc === 'table' && ttTap(p)) return false;
      if (sc === 'model') {
        const i = mdHit(p);
        if (i >= 0) { MD.drag = i; MD.atoms[i].x = p.x; MD.atoms[i].y = p.y; Sound.tick(); return true; }
        if (MD.meas && MD.opt) { const j = mdAttachedHit(p); if (j >= 0) { mdSelect(j); return false; } }
      }
      VIEW.drag = true; VIEW.vy = 0; VIEW.vp = 0; lastP = p;
      return true;
    },
    move(p) {
      if (S.scene === 'model' && MD.drag >= 0) { const a = MD.atoms[MD.drag]; a.x = clamp(p.x, 20, VW - 20); a.y = clamp(p.y, 40, VH - 20); return; }
      if (!VIEW.drag || !lastP) return;
      const dx = p.x - lastP.x, dy = p.y - lastP.y;
      VIEW.yaw += dx * 0.012; VIEW.pitch = clamp(VIEW.pitch + dy * 0.009, -1.2, 1.2);
      VIEW.vy = dx * 0.012 / Math.max(DT, 0.008);
      lastP = p;
    },
    up() {
      if (S.scene === 'model' && MD.drag >= 0) {
        const i = MD.drag, a = MD.atoms[i], C = MC3();
        MD.drag = -1;
        if (Math.hypot(a.x - C.x, a.y - C.y) < 150) mdAttach(i);
        else tween(a, { x: a.hx, y: a.hy }, { duration: 0.4, ease: 'outBack' });
        return;
      }
      VIEW.drag = false; lastP = null;
      VIEW.vy = clamp(VIEW.vy, -3, 3);
    },
    hover(p) {
      const sc = S.scene;
      if (sc === 'table') { const M = ttM(); for (let i = 0; i < M.outer.length; i++) { const m = ttMid(i); if (Math.hypot(p.x - m.x, p.y - m.y) < 36) return 'pointer'; } }
      if (sc === 'model' && mdHit(p) >= 0) return 'grab';
      return 'grab';
    },
  });
  if (PHONE) {
    view.canvas.style.touchAction = 'pan-y';
    view.canvas.addEventListener('touchstart', (e) => {
      const t0 = e.touches[0]; if (!t0) return;
      const p = view.toLocal(t0), C = (S.scene === 'balloon' ? C3() : S.scene === 'lone' ? L3() : S.scene === 'table' ? TC() : MC3());
      if (S.scene === 'model' && mdHit(p) >= 0) e.preventDefault();
      else if (Math.hypot(p.x - C.x, p.y - C.y) < 190) e.preventDefault();
    }, { passive: false });
  }
  $$('#nSeg button').forEach((b) => b.addEventListener('click', () => setBalN(+b.dataset.n)));
  $('#protBtn').addEventListener('click', () => { Sound.click(); setProt(!B.prot); });
  $('#shakeBtn').addEventListener('click', () => { Sound.click(); clShake(B.cl); });
  $$('#molSel .opt').forEach((b) => b.addEventListener('click', () => { Sound.click(); ttSelect(b.dataset.m); }));
  $$('#lpSeg button').forEach((b) => b.addEventListener('click', () => setLP(+b.dataset.k)));
  $$('#modSel .opt').forEach((b) => b.addEventListener('click', () => { Sound.click(); mdReset(b.dataset.m); }));
  $('#predSel').addEventListener('change', (e) => { Sound.click(); MD.pred[MD.key] = e.target.value; mdUI(); });
  $('#optBtn').addEventListener('click', mdOptimize);
  $('#measBtn').addEventListener('click', () => { Sound.click(); MD.meas = !MD.meas; if (!MD.meas) MD.sel = []; mdUI(); });
  $$('#sceneSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.scene); }));
  $('#resetBtn').addEventListener('click', () => {
    Sound.click();
    const sc = S.scene;
    if (sc === 'balloon') resetBalloon();
    else if (sc === 'table') ttReset();
    else if (sc === 'lone') setLP(0);
    else mdReset();
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
    if (sc === 'balloon') drawBalloon(t);
    else if (sc === 'table') drawTable(t);
    else if (sc === 'lone') drawLone(t);
    else drawModel(t);
    fx.draw(ctx);
    ctx.restore();
  }

  /* ---------- 미션 ---------- */
  const levels = [
    /* ---------- 1단계 · 모형 ---------- */
    {
      title: '풍선으로 전자쌍 반발을 봐요', short: '풍선 모형', icon: '🎈', phase: '모형',
      features: ['balloon'],
      intro: '<p class="si-q">❓ 탐구 질문: 분자는 왜 평평한 그림이 아니라 입체적인 모양일까? 물은 왜 일직선이 아니라 굽어 있을까?</p>' +
        '<div class="si-link">🔗 <b>앞 차시(루이스 전자점식)에서</b> 공유 전자쌍과 비공유 전자쌍을 점으로 그렸어요. 그런데 평면 그림에는 분자의 <b>모양</b>이 나타나지 않아요.</div>' +
        '<p>전자쌍은 모두 (−)전하를 띠어서 서로 <b>밀어내요</b>. 중심 원자 둘레의 전자쌍(전자 영역)을 <b>풍선</b>으로 바꿔 한곳에서 묶으면 어떤 모양이 될까요?</p>',
      setup() { setScene('balloon'); resetBalloon(); showHint('풍선 수를 바꾸고 📐 각도 재기를 켜 보세요', 4500); },
      recap: '전자 영역(전자쌍)은 서로 밀어내 가장 멀어지는 배치가 돼요. 2개는 <b>직선형 180°</b>, 3개는 <b>평면 삼각형 120°</b>, 4개는 <b>정사면체 109.5°</b>예요.',
      summary: '<ul><li><b>전자쌍 반발 이론</b>: 중심 원자 둘레의 전자 영역은 (−)전하끼리 반발해 서로 가장 멀리 떨어진 배치를 해요.</li></ul>' +
        '<table class="mini"><tr><th>전자 영역</th><th>배치</th><th>각도</th></tr><tr><td>2개</td><td>직선형</td><td>180°</td></tr><tr><td>3개</td><td>평면 삼각형</td><td>120°</td></tr><tr><td>4개</td><td>정사면체</td><td>109.5°</td></tr></table>',
      missions: [
        {
          title: '풍선 2 · 3 · 4개 묶고 각도 재기',
          goal: '풍선을 <b>2개 · 3개 · 4개</b>로 바꾸며 <b>📐 각도 재기</b>를 켜고, 정렬이 끝나 각도가 나올 때까지 기다려요.',
          hint: '풍선 수 버튼을 누르고 📐 각도 재기를 켜요. 풍선이 흔들리다 멈추면 각도가 확정돼요. 🎈 흔들기로 다시 정렬해 볼 수 있어요.',
          setup() { B.seen = {}; B.calmT = { 2: 0, 3: 0, 4: 0 }; setScene('balloon'); },
          check: () => !!(B.seen[2] && B.seen[3] && B.seen[4]),
          hold: 0.3,
          status: () => [[2, '2개 180°'], [3, '3개 120°'], [4, '4개 109.5°']].map(([n, l]) => mark(!!B.seen[n]) + ' ' + l).join(' · '),
          explain: '풍선 2개는 반대쪽으로 벌어진 <b>직선형(180°)</b>, 3개는 한 평면에서 <b>평면 삼각형(120°)</b>, 4개는 입체적인 <b>정사면체(109.5°)</b>가 돼요. 풍선끼리 서로 가장 멀어지는 배치예요.',
        },
        {
          type: 'quiz', title: '풍선이 서로 멀어지는 까닭',
          goal: '전자쌍(전자 영역)이 서로 가장 멀어지려는 까닭은?',
          choices: ['전자쌍은 모두 (−)전하를 띠어 서로 반발하기 때문이에요', '전자쌍이 원자핵에 끌려 한쪽으로 모이기 때문이에요', '전자쌍끼리 서로 끌어당겨 뭉치기 때문이에요', '중심 원자가 모든 전자쌍을 밀어내기 때문이에요'],
          answer: 0,
          feedback: ['', '전자쌍은 핵에 끌리지만, 전자쌍끼리 가까워지면 반발해요. 모양을 정하는 것은 전자쌍 사이의 힘이에요.', '같은 전하(−)끼리는 끌어당기지 않고 밀어내요.', '중심 원자(핵)는 전자쌍을 끌어당기는 쪽이에요. 서로 밀어내는 것은 전자쌍들이에요.'],
          explain: '전자쌍은 모두 (−)전하를 띠므로 서로 <b>정전기적으로 반발</b>해요. 그래서 전자쌍들은 가능한 한 멀리 떨어진 배치가 되고, 이것이 분자의 모양을 결정해요.',
        },
      ],
    },
    /* ---------- 2단계 · 탐구 ---------- */
    {
      title: '전자 영역을 세어 구조 표를 만들어요', short: '구조 표', icon: '📋', phase: '탐구',
      features: ['table'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 풍선 2 · 3 · 4개가 직선형 · 평면 삼각형 · 정사면체가 되는 것을 봤어요. 실제 분자에서는 중심 원자 둘레의 전자 영역이 몇 개일까요?</div>' +
        '<p>루이스 구조에서 <b>결합 하나는 단일 · 이중 · 삼중이어도 전자 영역 1개</b>로 세요. 중심 원자 둘레의 영역을 눌러 풍선으로 바꾸고, 분자 모양을 <b>구조 표</b>로 정리해요.</p>',
      setup() { setScene('table'); TT.show = false; ttSelect('BeCl2'); updateUI(); showHint('보라색 점선 영역을 눌러 풍선으로 바꿔요', 4500); },
      recap: '전자 영역 수 = 중심 원자에 붙은 <b>결합의 수(다중 결합도 1개) + 비공유 전자쌍 수</b>예요. 2개는 직선형, 3개는 평면 삼각형, 4개는 정사면체 배열이에요.',
      summary: '<table class="mini"><tr><th>분자</th><th>전자 영역</th><th>모양</th></tr><tr><td>BeCl₂</td><td>2</td><td>직선형</td></tr><tr><td>CO₂ · HCN</td><td>2</td><td>직선형</td></tr><tr><td>BF₃</td><td>3</td><td>평면 삼각형</td></tr><tr><td>CH₄ · CCl₄</td><td>4</td><td>정사면체</td></tr></table>' +
        '<p><b>다중 결합은 전자 영역 1개</b>로 세요 (CO₂의 C=O 2개 → 영역 2개).</p>',
      missions: [
        {
          title: '6개 분자의 풍선 모형 만들기',
          goal: '<b>BeCl₂ · BF₃ · CH₄ · CO₂ · HCN · CCl₄</b> 모두 중심 원자 둘레의 영역을 눌러 풍선 모형을 완성해요.',
          hint: '분자를 고르고 루이스 구조의 보라색 점선 영역을 하나씩 눌러요. 이중 · 삼중 결합도 한 번만 누르면 영역 1개예요.',
          setup() { TT.built = {}; ttReset(); setScene('table'); },
          check: () => builtCount() === 6,
          hold: 0.5,
          status: () => VM_KEYS.map((k) => mark(!!TT.built[k]) + ' ' + VM[k].f).join(' · '),
          explain: 'CO₂의 C=O 이중 결합 2개는 전자 영역 2개, HCN의 H–C 단일 결합과 C≡N 삼중 결합도 영역 2개라서 모두 직선형이에요. BF₃는 영역 3개(평면 삼각형), CH₄ · CCl₄는 영역 4개(정사면체)예요.',
        },
        {
          title: '구조 표 완성하기', manual: true,
          goal: '6개 분자의 <b>전자 영역 수</b>와 <b>분자 모양</b>을 표에 채워요.',
          hint: '앞에서 만든 풍선 모형을 떠올려요. 영역 2개 → 직선형, 3개 → 평면 삼각형, 4개 → 정사면체예요.',
          setup() { $$('#tabBody select').forEach((q) => { q.value = ''; q.classList.remove('ok', 'bad'); }); setScene('table'); TT.show = true; updateUI(); },
          check: () => tabCheck(),
          status: () => '📋 채운 칸 ' + tabFilled() + ' / 12',
          explain: 'BeCl₂ · CO₂ · HCN은 영역 2개로 직선형, BF₃는 영역 3개로 평면 삼각형, CH₄ · CCl₄는 영역 4개로 정사면체예요. 영역 수가 같으면 모양도 같아요.',
        },
        {
          type: 'quiz', title: 'CO₂가 직선형인 까닭',
          goal: 'CO₂ 분자가 직선형인 까닭으로 알맞은 것은?',
          choices: ['C=O 이중 결합 2개가 전자 영역 2개로 서로 가장 멀어지기 때문이에요', 'C 둘레에 비공유 전자쌍이 2쌍 있기 때문이에요', '이중 결합은 영역 2개로 세므로 전자 영역이 4개이기 때문이에요', 'O 원자가 C 원자보다 훨씬 무겁기 때문이에요'],
          answer: 0,
          feedback: ['', 'CO₂의 C에는 비공유 전자쌍이 없어요. 결합 영역만 2개예요.', '이중 결합은 영역 1개로 세요. 그래서 CO₂의 전자 영역은 2개예요.', '원자의 무게가 아니라 전자 영역 사이의 반발이 모양을 정해요.'],
          explain: 'CO₂에서 C 둘레에는 C=O 이중 결합이 2개 있고, <b>다중 결합은 전자 영역 1개</b>로 세므로 영역이 2개예요. 두 영역이 가장 멀어지는 배치가 <b>직선형(180°)</b>이에요.',
        },
      ],
    },
    /* ---------- 3단계 · 설명 ---------- */
    {
      title: '비공유 전자쌍이 모양을 바꿔요', short: '비공유쌍', icon: '💧', phase: '설명',
      features: ['lone'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 중심 원자에 비공유 전자쌍이 없는 분자의 모양을 정리했어요. 그런데 NH₃나 H₂O의 중심 원자에는 <b>비공유 전자쌍</b>이 있어요.</div>' +
        '<p>CH₄ · NH₃ · H₂O는 전자 영역이 모두 <b>4개</b>예요. 그런데 모양은 서로 달라요. 비공유 전자쌍을 0 → 1 → 2쌍으로 바꿔 보며 모양과 결합각을 비교해요.</p>' +
        '<p class="note">비공유 전자쌍은 결합 전자쌍보다 더 크게 퍼져 있어서 더 세게 밀어내요. 반발의 세기: 비공유–비공유 &gt; 비공유–결합 &gt; 결합–결합</p>',
      setup() { setScene('lone'); LP.show = false; setLP(0); updateUI(); showHint('비공유 전자쌍을 0 · 1 · 2쌍으로 바꿔 보세요', 4500); },
      recap: '전자 영역은 4개로 같아도 비공유 전자쌍이 늘면 모양이 <b>정사면체 → 삼각뿔 → 굽은형</b>으로 바뀌고, 결합각은 <b>109.5° → 107° → 104.5°</b>로 작아져요.',
      summary: '<table class="mini"><tr><th>분자</th><th>비공유쌍</th><th>모양</th><th>결합각</th></tr><tr><td>CH₄</td><td>0</td><td>정사면체</td><td>109.5°</td></tr><tr><td>NH₃</td><td>1</td><td>삼각뿔</td><td>107°</td></tr><tr><td>H₂O</td><td>2</td><td>굽은형</td><td>104.5°</td></tr></table>' +
        '<p>비공유 전자쌍은 결합 전자쌍보다 더 크게 퍼져 밀어내서 결합각이 줄어요. (분자의 모양은 <b>원자</b>의 배열만 말해요.)</p>',
      missions: [
        {
          title: '비공유 전자쌍 0 · 1 · 2쌍 살펴보기',
          goal: '비공유 전자쌍을 <b>0쌍 · 1쌍 · 2쌍</b>으로 바꾸며 모양과 결합각이 바뀌는 것을 살펴봐요.',
          hint: '버튼을 눌러 CH₄ → NH₃ → H₂O로 바꾸고, 풍선이 멈출 때까지 잠깐 기다려요. 파란 풍선이 비공유 전자쌍이에요.',
          setup() { LP.seen = {}; LP.hold = [0, 0, 0]; setLP(0); setScene('lone'); },
          check: () => lpSeenCount() === 3,
          hold: 0.3,
          status: () => LMOL.map((m, k) => mark(!!LP.seen[k]) + ' ' + m.f + ' ' + fa(m.ang) + '°').join(' · '),
          explain: '비공유 전자쌍이 0쌍이면 정사면체(109.5°), 1쌍이면 삼각뿔(107°), 2쌍이면 굽은형(104.5°)이에요. 파란 풍선(비공유 전자쌍)이 더 크게 퍼져 결합 전자쌍을 밀어내기 때문이에요.',
        },
        {
          title: '세 분자의 모양 · 각도 매기기', manual: true,
          goal: 'CH₄ · NH₃ · H₂O의 <b>분자 모양</b>과 <b>결합각</b>을 표에 채워요.',
          hint: '비공유 전자쌍이 0쌍이면 정사면체, 1쌍이면 삼각뿔, 2쌍이면 굽은형이에요. 비공유 전자쌍이 많을수록 결합각이 작아져요.',
          setup() { $$('#lpBody select').forEach((q) => { q.value = ''; q.classList.remove('ok', 'bad'); }); setScene('lone'); LP.show = true; updateUI(); },
          check: () => lpCheck(),
          status: () => '📋 채운 칸 ' + lpFilled() + ' / 6',
          explain: 'CH₄ 정사면체 109.5°, NH₃ 삼각뿔 107°, H₂O 굽은형 104.5°예요. 전자 영역(4개)의 배열은 모두 정사면체인데, 비공유 전자쌍이 차지한 자리를 빼고 <b>원자의 배열</b>만 보면 모양이 달라져요.',
        },
        {
          type: 'quiz', title: 'NH₃가 삼각뿔인 까닭',
          goal: 'NH₃ 분자가 평면이 아니라 <b>삼각뿔</b>인 까닭은?',
          choices: ['N에 비공유 전자쌍이 1쌍 있어 전자 영역 4개가 정사면체로 배열하고, 한 자리를 비공유 전자쌍이 차지하기 때문이에요', 'N–H 결합이 모두 이중 결합이기 때문이에요', 'H 원자 3개가 서로 끌어당겨 한쪽으로 모이기 때문이에요', 'N에는 전자 영역이 3개뿐이라 평면 삼각형이어야 하지만 예외이기 때문이에요'],
          answer: 0,
          feedback: ['', 'NH₃의 N–H 결합은 모두 단일 결합이에요.', 'H 원자들 사이의 인력이 아니라 전자 영역 사이의 반발이 모양을 정해요.', 'N 둘레의 전자 영역은 결합 3개 + 비공유 전자쌍 1개 = 4개예요. 예외가 아니에요.'],
          explain: 'NH₃의 N 둘레 전자 영역은 결합 3개 + 비공유 전자쌍 1개 = <b>4개</b>예요. 4개가 정사면체 방향으로 배열하는데 한 자리를 비공유 전자쌍이 차지해서, 나머지 H 3개가 만드는 모양은 <b>삼각뿔</b>이에요.',
        },
      ],
    },
    /* ---------- 4단계 · 적용 ---------- */
    {
      title: '분자를 직접 모델링해요', short: '분자 모델링', icon: '🧩', phase: '적용',
      features: ['model'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 전자 영역 수와 비공유 전자쌍 수로 분자의 모양과 결합각을 설명했어요.</div>' +
        '<p>분자 모델링 소프트웨어처럼 <b>부품 상자</b>의 공을 끌어 중심 원자에 붙여 막대–공 모형을 조립해요. ✨ <b>구조 최적화</b>로 전자쌍 반발에 따른 모양을 만들고, 📐 <b>각도 재기</b>로 결합각을 읽어 예측값과 비교해요.</p>' +
        '<p>마지막에는 원자와 전자 수만 알려 주는 <b>미지 분자 A · B</b>의 모양을 먼저 예측한 뒤 모델링으로 확인해요.</p>',
      setup() { setScene('model'); mdReset('NH3'); showHint('공을 끌어 중심 원자에 붙여 보세요', 4500); },
      recap: '분자 구조는 <b>루이스 구조 → 전자 영역 수 → 비공유 전자쌍 수</b> 순서로 추론하고, 모델링으로 확인해요. BF₃ 120°, NH₃ 107°, H₂O 104.5°, CO₂ 180°, CH₄ 109.5°예요.',
      summary: '<table class="mini"><tr><th>분자</th><th>모양</th><th>결합각</th></tr><tr><td>BF₃</td><td>평면 삼각형</td><td>120°</td></tr><tr><td>NH₃</td><td>삼각뿔</td><td>107°</td></tr><tr><td>H₂O</td><td>굽은형</td><td>104.5°</td></tr><tr><td>CO₂</td><td>직선형</td><td>180°</td></tr><tr><td>CH₄</td><td>정사면체</td><td>109.5°</td></tr></table>' +
        '<p>구조 추론 순서: ① 루이스 구조 ② 중심 원자 둘레 전자 영역 수 세기(다중 결합 = 1) ③ 비공유 전자쌍 수 확인 ④ 모양 · 결합각.</p>',
      missions: [
        {
          title: '분자 3개 이상 조립하고 각도 기록',
          goal: '<b>BF₃ · NH₃ · H₂O · CO₂ · CH₄</b> 중 3개 이상을 조립해 최적화하고, 📐 바깥 원자 두 개를 눌러 결합각을 재요.',
          hint: '공을 모두 중심에 붙이고 ✨ 구조 최적화를 누른 뒤, 📐 각도 재기를 켜서 바깥 원자 두 개를 차례로 눌러요.',
          setup() { MD.rec = {}; setScene('model'); mdReset('NH3'); },
          check: () => MKEYS.filter((k) => MD.rec[k]).length >= 3,
          hold: 0.5,
          status: () => MKEYS.map((k) => mark(!!MD.rec[k]) + ' ' + MODEL[k].f + (MD.rec[k] ? ' ' + MD.rec[k] : '')).join(' · ') + ' (' + MKEYS.filter((k) => MD.rec[k]).length + '/3)',
          explain: '모델링으로 잰 각도는 BF₃ 120°, NH₃ 107°, H₂O 104.5°, CO₂ 180°, CH₄ 109.5°로 이론 값과 같아요. 비공유 전자쌍이 있는 NH₃와 H₂O는 109.5°보다 작아요.',
        },
        {
          title: '미지 분자 A · B 추론하기',
          goal: '<b>미지 분자 A · B</b>를 모양을 예측한 뒤 조립 · 최적화해서 예측이 맞는지 확인해요.',
          hint: '중심 원자의 원자가 전자 중 결합에 쓰고 남은 전자로 비공유 전자쌍 수를 구해요. A: P(5개) − 3 = 2개 → 1쌍. B: 결합 영역이 2개뿐이에요.',
          setup() { MD.good = {}; MD.pred = {}; setScene('model'); mdReset('A'); },
          check: () => !!MD.good.A && !!MD.good.B,
          hold: 0.5,
          status: () => mark(!!MD.good.A) + ' 미지 A · ' + mark(!!MD.good.B) + ' 미지 B',
          explain: '미지 분자 A는 P 둘레에 Cl 3개와 비공유 전자쌍 1쌍(전자 영역 4개)이라 <b>삼각뿔</b>(PCl₃, 약 100°)이에요. B는 H–C 단일 결합과 C≡N 삼중 결합 2개뿐(전자 영역 2개)이라 <b>직선형</b>(HCN, 180°)이에요.',
        },
        {
          type: 'quiz', title: '물이 굽은 모양인 까닭',
          goal: '물 분자가 직선이 아니라 <b>굽은 모양</b>인 까닭으로 알맞은 것은?',
          choices: ['중심 O 둘레의 비공유 전자쌍 2쌍이 결합 전자쌍을 밀어, 정사면체 배열의 두 자리만 H가 차지하기 때문이에요', 'O 원자가 H 원자보다 크기 때문이에요', 'H 원자 두 개가 서로 끌어당기기 때문이에요', 'O 둘레의 전자 영역이 2개뿐이기 때문이에요'],
          answer: 0,
          feedback: ['', '원자의 크기가 아니라 전자 영역 사이의 반발이 모양을 정해요.', 'H 원자 사이의 인력이 아니라 O 둘레 전자쌍들의 반발이 모양을 정해요.', 'O 둘레의 전자 영역은 결합 2개 + 비공유 전자쌍 2쌍 = 4개예요.'],
          explain: 'H₂O의 O 둘레에는 결합 영역 2개와 <b>비공유 전자쌍 2쌍</b>이 있어 전자 영역이 4개(정사면체 배열)예요. 비공유 전자쌍이 결합 전자쌍을 더 세게 밀어서 H–O–H 각도는 109.5°보다 작은 <b>104.5°</b>의 굽은형이 돼요.',
        },
      ],
    },
  ];

  buildTabTable(); buildLpTable();
  resetBalloon(); clSetN(B.cl, 3); ttSelect('BeCl2'); mdReset('NH3'); setProt(false);
  game = SciSim.game({
    simId: 'hc-vsepr',
    mount: '#game',
    badge: '분자 구조 박사',
    homeHref: '../../index.html#hc',
    featureLabels: { balloon: '🎈 풍선 모형 · 각도기', table: '📋 전자 영역 세기 · 구조 표', lone: '💧 비공유 전자쌍 바꾸기', model: '🧩 분자 모델링 소프트웨어' },
    onFeatures(set) { F = new Set(set); updateUI(); },
    levels,
  });
  updateUI();
  SciSim.loop((dt, t) => {
    DT = dt; NOW = t;
    if (!VIEW.drag && !RM) { VIEW.yaw += VIEW.vy * dt; VIEW.vy *= Math.exp(-3 * dt); }
    const sc = S.scene;
    if (sc === 'balloon') stepBalloon(dt);
    else if (sc === 'table') stepTable(dt);
    else if (sc === 'lone') stepLone(dt);
    else stepModel(dt);
    fx.update(dt);
    updateReadouts();
    draw(t);
  });

  window.__sim = {
    S, B, TT, LP, MD, VIEW, game, levels, VW, VH, VM, MODEL, LMOL,
    setScene, setBalN, setProt, resetBalloon, ttSelect, ttTap, ttMid, setLP, lpAngleNow, mdReset, mdAttach, mdOptimize, mdSelect, mdAtomScreen, MC3, trayPos,
    clAngle, clSetN, builtCount, lpSeenCount, mdDirs, K4, IDEAL, fa, angDeg,
    toClient: (x, y) => { const r = view.canvas.getBoundingClientRect(); return { x: r.left + x * r.width / VW, y: r.top + y * r.height / VH }; },
  };
})();
