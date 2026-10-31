/* hy-protein · 3D 단백질 구조 (1차 → 4차, 변성)
   아미노산 12개 구슬(소수성 주황 · 친수성 파랑 · 전하 초록)이 이어진 사슬이 나선·병풍으로, 입체 구조로, 4개가 모인 헤모글로빈으로 접히는 모습 */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
/* 12잔기 배치: 1차(일렬) · 2차(나선 + 병풍) · 변성(무작위 사슬) */
const NRES = 12, BOND = 0.62;
function confPrimary(snake) {
  if (snake) return Array.from({ length: NRES }, (_, i) => { const r = Math.floor(i / 4), c = i % 4; return [((r % 2 ? 3 - c : c) - 1.5) * 0.8, (1 - r) * 1.05, 0]; });
  return Array.from({ length: NRES }, (_, i) => [(i - 5.5) * 0.6, ((i % 2) ? 0.1 : -0.1), 0]); }
function confSecondary() {
  const out = [], r = 0.38, rise = 0.22, x0 = -2.9;
  for (let i = 0; i < 6; i++) { const a = i * 100 * Math.PI / 180; out.push([x0 + i * rise, r * Math.cos(a), r * Math.sin(a)]); }
  // 병풍(β 가닥): 지그재그
  const xs = out[5][0] + 0.55;
  for (let j = 0; j < 6; j++) out.push([xs + j * 0.5, (j % 2 ? 0.18 : -0.18) - 0.05, 0.0]);
  return out;
}
function confCoil(seed, scale) {
  let s = seed >>> 0; const rnd = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
  const P = [[0, 0, 0]]; let d = [1, 0, 0];
  for (let i = 1; i < NRES; i++) {
    for (let tries = 0; tries < 60; tries++) {
      const a = [rnd() * 2 - 1, rnd() * 2 - 1, rnd() * 2 - 1], L = Math.hypot(...a) || 1;
      const nd = [d[0] * 1.3 + a[0] / L, d[1] * 1.3 + a[1] / L, d[2] * 1.3 + a[2] / L], M = Math.hypot(...nd);
      const q = P[i - 1].map((v, k) => v + nd[k] / M * BOND * 1.12);
      if (P.every((p) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]) > 0.58)) { P.push(q); d = nd.map((v) => v / M); break; }
      if (tries === 59) { P.push(q); d = nd.map((v) => v / M); }
    }
  }
  const c = [0, 0, 0]; P.forEach((p) => { c[0] += p[0] / NRES; c[1] += p[1] / NRES; c[2] += p[2] / NRES; });
  return P.map((p) => [(p[0] - c[0]) * (scale || 1), (p[1] - c[1]) * (scale || 1), (p[2] - c[2]) * (scale || 1)]);
}

/* 12잔기 사슬을 물속에서 접는 간이 모형: 소수성(Leu, Val)은 안쪽 뭉침, 친수성 · 전하는 바깥 */
function foldChain(start, phob, seed) {
  let s = seed >>> 0; const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const n = start.length, B = 0.62, D = 0.6;
  const P = start.map((p) => [p[0] + (rnd() - 0.5) * 0.3, p[1] + (rnd() - 0.5) * 0.3, p[2] + (rnd() - 0.5) * 0.3]);
  const V = P.map(() => [0, 0, 0]);
  for (let it = 0; it < 1400; it++) {
    const F = P.map(() => [0, 0, 0]);
    const c = [0, 0, 0]; P.forEach((p) => { c[0] += p[0] / n; c[1] += p[1] / n; c[2] += p[2] / n; });
    const hc = [0, 0, 0]; let hn = 0; P.forEach((p, i) => { if (phob[i]) { hc[0] += p[0]; hc[1] += p[1]; hc[2] += p[2]; hn++; } }); hc[0] /= hn; hc[1] /= hn; hc[2] /= hn;
    for (let i = 0; i < n; i++) {
      const p = P[i];
      if (phob[i]) { for (let k = 0; k < 3; k++) F[i][k] += (hc[k] - p[k]) * 40; }
      else { const d = [p[0] - hc[0], p[1] - hc[1], p[2] - hc[2]], L = Math.hypot(...d) || 1, r0 = 1.55; if (L < r0) for (let k = 0; k < 3; k++) F[i][k] += d[k] / L * (r0 - L) * 140; for (let k = 0; k < 3; k++) F[i][k] += (c[k] - p[k]) * 6; }
      for (let j = i + 1; j < n; j++) {
        const d = [P[j][0] - p[0], P[j][1] - p[1], P[j][2] - p[2]], L = Math.hypot(...d) || 0.01;
        if (L < D) { const f = (D - L) * 600; for (let k = 0; k < 3; k++) { F[i][k] -= d[k] / L * f; F[j][k] += d[k] / L * f; } }
        if (j === i + 1) { const f = (L - B) * 900; for (let k = 0; k < 3; k++) { F[i][k] += d[k] / L * f; F[j][k] -= d[k] / L * f; } }
      }
    }
    const dt = 1 / 120;
    for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) { V[i][k] = (V[i][k] + F[i][k] * dt) * 0.9; P[i][k] += V[i][k] * dt; }
  }
  const c = [0, 0, 0]; P.forEach((p) => { c[0] += p[0] / n; c[1] += p[1] / n; c[2] += p[2] / n; });
  P.forEach((p) => { p[0] -= c[0]; p[1] -= c[1]; p[2] -= c[2]; });
  let dp = 0, np = 0, dq = 0, nq = 0, maxb = 0;
  P.forEach((p, i) => { const d = Math.hypot(...p); if (phob[i]) { dp += d; np++; } else { dq += d; nq++; } if (i) maxb = Math.max(maxb, Math.hypot(p[0] - P[i - 1][0], p[1] - P[i - 1][1], p[2] - P[i - 1][2])); });
  let minD = 9; for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) minD = Math.min(minD, Math.hypot(P[i][0] - P[j][0], P[i][1] - P[j][1], P[i][2] - P[j][2]));
  return { P, ratio: (dp / np) / (dq / nq), maxb, minD };
}


  const PHONE = window.innerWidth < 600;
  /* 2D 차시(SEQ12)와 같은 서열 · 이름 · 색 */
  const AAI = {
    ser: { name: '세린', ab: 'Ser', col: 0x3b82f6, cls: 'phil' }, gln: { name: '글루타민', ab: 'Gln', col: 0x2f6fe0, cls: 'phil' },
    leu: { name: '류신', ab: 'Leu', col: 0xf97316, cls: 'phob' }, val: { name: '발린', ab: 'Val', col: 0xea8a1e, cls: 'phob' },
    lys: { name: '리신', ab: 'Lys', col: 0x22b455, cls: 'chg' }, glu: { name: '글루탐산', ab: 'Glu', col: 0x139a47, cls: 'chg' },
  };
  const SEQ = ['ser', 'leu', 'val', 'lys', 'gln', 'leu', 'glu', 'val', 'leu', 'gln', 'lys', 'val'];
  const PHOB = SEQ.map((k) => AAI[k].cls === 'phob');
  const HEX = (n) => '#' + n.toString(16).padStart(6, '0');
  const SUBC = [0x3b82f6, 0x3b82f6, 0x06b6d4, 0x06b6d4];
  const SUBN = ['α 사슬 1', 'α 사슬 2', 'β 사슬 1', 'β 사슬 2'];
  const TET = [[-1, 1, 1], [1, -1, 1], [1, 1, -1], [-1, -1, -1]];

  window.SciSim3D.attach({
    title: '단백질 구조 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: 7, theta: 0.15, phi: 1.4, fov: 40, min: 3, max: 30, target: [0, PHONE ? 0.5 : 0, 0] },
    autoRotate: 0,
    build(ctx) {
      const { THREE, root, label, info, controls, orbit, camera } = ctx;
      const N = SEQ.length;
      const prim = confPrimary(PHONE), secd = confSecondary();
      /* 접힌 3차 구조: 소수성 구슬은 안쪽에 뭉치고 친수성 · 전하 구슬은 바깥으로 */
      let fold = null;
      for (let sd = 1; sd <= 14; sd++) {
        const r = foldChain(confCoil(sd * 7 + 3, 0.8), PHOB, sd);
        const ext = [0, 1, 2].map((k) => { const v = r.P.map((p) => p[k]); return Math.max(...v) - Math.min(...v); }).sort((a, b) => b - a);
        const sc = (ext[2] / ext[0]) - (r.ratio > 0.8 || r.maxb > 0.75 || r.minD < 0.5 ? 9 : 0);
        if (!fold || sc > fold.sc) fold = { sc, P: r.P };
      }
      const FOLD = fold.P;
      const COIL = [1, 2, 3, 4].map((k) => confCoil(k * 11 + 5, 1));

      /* 구슬 · 사슬 (구조 4개 분량) */
      const subs = [];
      const beadGeo = new THREE.SphereGeometry(0.28, 28, 18), stickGeo = new THREE.CylinderGeometry(0.07, 0.07, 1, 10);
      const chainMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.5 });
      const mats = SEQ.map((k) => new THREE.MeshStandardMaterial({ color: AAI[k].col, roughness: 0.35, metalness: 0.05 }));
      const Yv = new THREE.Vector3(0, 1, 0), tv = new THREE.Vector3();
      for (let s = 0; s < 4; s++) {
        const g = new THREE.Group(); root.add(g);
        const beads = SEQ.map((k, i) => { const m = new THREE.Mesh(beadGeo, mats[i]); g.add(m); return m; });
        const sticks = []; for (let i = 0; i < N - 1; i++) { const m = new THREE.Mesh(stickGeo, chainMat); g.add(m); sticks.push(m); }
        const env = new THREE.Mesh(new THREE.SphereGeometry(1.45, 28, 18), new THREE.MeshStandardMaterial({ color: SUBC[s], transparent: true, opacity: 0.16, roughness: 0.4, depthWrite: false }));
        g.add(env);
        const heme = new THREE.Mesh(new THREE.SphereGeometry(0.17, 20, 14), new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.3, emissive: 0x7f1d1d, emissiveIntensity: 0.5 }));
        g.add(heme);
        const core = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), new THREE.MeshStandardMaterial({ color: 0xf97316, transparent: true, opacity: 0.2, roughness: 0.5, depthWrite: false }));
        g.add(core);
        const cur = prim.map((p) => p.slice());
        subs.push({ g, beads, sticks, env, heme, core, cur, vis: s === 0 ? 1 : 0, envS: 0, hemeS: 0, coreS: 0, anchor: new THREE.Object3D() });
        g.add(subs[s].anchor);
      }

      /* 2차 구조 보조물: 수소 결합 점선, 이웃 가닥 (병풍), 병풍 면 */
      const dashPairs = [], dashG = new THREE.Group(); root.add(dashG);
      const dotGeo = new THREE.SphereGeometry(0.035, 8, 6), dotMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      function mkDash() { const arr = []; for (let k = 0; k < 4; k++) { const m = new THREE.Mesh(dotGeo, dotMat); dashG.add(m); arr.push(m); } return arr; }
      const shX = secd[6][0];
      const ghostPos = []; for (let j = 0; j < 6; j++) ghostPos.push([secd[6 + j][0], secd[6 + j][1], 0.95]);
      const ghostMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, transparent: true, opacity: 0.55, roughness: 0.5 });
      const ghosts = ghostPos.map((p) => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 10), ghostMat); m.position.set(...p); dashG.add(m); return m; });
      const ghostSticks = []; for (let j = 0; j < 5; j++) { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1, 8), ghostMat); dashG.add(m); const a = new THREE.Vector3(...ghostPos[j]), b = new THREE.Vector3(...ghostPos[j + 1]); tv.subVectors(b, a); const L = tv.length(); m.position.addVectors(a, b).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(Yv, tv.normalize()); m.scale.set(1, L, 1); ghostSticks.push(m); }
      const sheet = new THREE.Mesh(new THREE.PlaneGeometry(secd[11][0] - secd[6][0] + 0.6, 1.2), new THREE.MeshStandardMaterial({ color: 0x14b8a6, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false }));
      sheet.rotation.x = -Math.PI / 2; sheet.position.set((secd[6][0] + secd[11][0]) / 2, -0.05, 0.47); dashG.add(sheet);
      const dashSpec = [[0, 4, 'h'], [1, 5, 'h']]; for (let j = 0; j < 6; j++) dashSpec.push([6 + j, j, 'g']);
      dashSpec.forEach((d) => dashPairs.push({ a: d[0], b: d[1], t: d[2], dots: mkDash() }));
      let dashS = 0;

      /* 이름표 */
      const resLabs = SEQ.map((k, i) => { const l = label(AAI[k].name + (i === 0 ? ' · N 말단' : i === N - 1 ? ' · C 말단' : ''), subs[0].beads[i], { color: 'rgba(15,23,42,.82)', size: PHONE ? 11 : 12.5, offset: [0, PHONE ? 0.58 : (i % 2 ? -1 : 1) * 0.62, 0] }); l.el.style.borderLeft = '4px solid ' + HEX(AAI[k].col); return l; });
      const nL = label('N 말단', subs[0].beads[0], { color: 'rgba(71,85,105,.92)', size: 11.5, offset: [0, -0.6, 0] }), cL = label('C 말단', subs[0].beads[N - 1], { color: 'rgba(71,85,105,.92)', size: 11.5, offset: [0, PHONE ? -0.6 : 0.62, 0] });
      const helL = label('나선 모양 (α 나선)', subs[0].beads[2], { color: 'rgba(124,58,237,.93)', offset: [0, 0.95, 0] });
      const shL = label('병풍 모양 (β 병풍)', subs[0].beads[9], { color: 'rgba(15,118,110,.93)', offset: [0, 0.8, 0] });
      const gL = label('이웃 가닥', ghosts[3], { color: 'rgba(71,85,105,.92)', size: 11.5, offset: [0, -0.5, 0] });
      const hbA = new THREE.Object3D(); hbA.position.set((secd[0][0] + secd[4][0]) / 2, 0, 0); root.add(hbA);
      const hbL = label('수소 결합 (점선)', hbA, { color: 'rgba(15,23,42,.9)', offset: [0, -0.95, 0] });
      const coreA = subs[0].anchor, wetA = subs[0].beads[6];
      const coreL = label('소수성 R기 (주황): 안쪽에 모여요', coreA, { color: 'rgba(194,65,12,.93)', offset: [0, 1.65, 0] });
      const wetL = label('친수성 · 전하 R기: 바깥', wetA, { color: 'rgba(29,78,216,.93)', offset: [0, -0.7, 0] });
      const subL = subs.map((s, k) => label(SUBN[k], s.anchor, { color: k < 2 ? 'rgba(29,78,216,.93)' : 'rgba(14,116,144,.93)', offset: [0, 1.35, 0] }));
      const hemeL = label('● 헴 (산소와 결합)', subs[1].heme, { color: 'rgba(185,28,28,.93)', offset: [0, -0.45, 0] });

      /* 상태 */
      let stage = 1, denat = false, replay = 0, T = 0, fitNeeded = true, camGo = 0, infoT = 0;
      const targetFor = (s) => {
        if (stage === 1) return prim;
        if (denat) return COIL[s];
        return stage === 2 ? secd : FOLD;
      };
      function snapAll() { subs.forEach((S, s) => { const t = targetFor(s); S.cur = t.map((p) => p.slice()); }); }

      /* 사슬 · 구슬 위치 반영 */
      function poseSub(S, t) {
        const wob = denat && stage > 1 ? 0.07 : 0;
        S.beads.forEach((b, i) => {
          const c = S.cur[i];
          b.position.set(c[0] + (wob ? Math.sin(t * 5 + i * 1.7) * wob : 0), c[1] + (wob ? Math.sin(t * 4.3 + i * 2.3) * wob : 0), c[2] + (wob ? Math.cos(t * 4.7 + i) * wob : 0));
        });
        S.sticks.forEach((m, i) => { const a = S.beads[i].position, b = S.beads[i + 1].position; tv.subVectors(b, a); const L = tv.length(); m.position.addVectors(a, b).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(Yv, tv.normalize()); m.scale.set(1, L, 1); });
      }
      const ap = (a, b, dt, r) => a + (b - a) * (1 - Math.exp(-r * dt));
      const FIT = { 1: PHONE ? [1.8, 1.6] : [3.5, 1.3], 2: PHONE ? [2.6, 1.8] : [3.4, 1.7], 3: [1.9, 2.0], 4: [3.0, 2.9] };
      function fit() {
        let [hw, hh] = FIT[stage];
        if (denat && stage > 1) { hw = stage === 4 ? 3.9 : 2.7; hh = stage === 4 ? 3.6 : 2.5; }
        const tn = Math.tan(20 * Math.PI / 180), asp = camera.aspect || 1.6;
        const need = Math.max(hh / tn, hw / (tn * asp)) * 1.18 + 1.0;
        orbit.dist = Math.max(4, Math.min(30, need));
      }

      /* 평균 거리 (소수성 vs 친수성 · 전하) */
      function metric() {
        const P = subs[0].cur; const c = [0, 0, 0]; P.forEach((p) => { c[0] += p[0] / N; c[1] += p[1] / N; c[2] += p[2] / N; });
        let dp = 0, np = 0, dq = 0, nq = 0; P.forEach((p, i) => { const d = Math.hypot(p[0] - c[0], p[1] - c[1], p[2] - c[2]) / 0.28; if (PHOB[i]) { dp += d; np++; } else { dq += d; nq++; } });
        return [dp / np, dq / nq];
      }
      const seqRow = SEQ.map((k) => '<span style="display:inline-block;margin:1px;padding:0 4px;border-radius:5px;background:' + HEX(AAI[k].col) + ';color:#fff;font-size:' + (PHONE ? 10 : 11) + 'px">' + AAI[k].ab + '</span>').join('');
      function refreshInfo() {
        const W = PHONE ? 215 : 262;
        const t = {
          1: '<b>1차 구조</b>: 아미노산 서열<br>구슬 12개가 <b>펩타이드 결합</b>(노란 막대)으로 이어졌어요.',
          2: '<b>2차 구조</b>: <b>나선</b>과 <b>병풍</b><br>사슬 일부가 <b>수소 결합</b>(흰 점선)으로 규칙적으로 접혀요.',
          3: '<b>3차 구조</b>: 입체 구조<br>R기끼리의 상호작용으로 접혀요. 소수성 R기(주황)는 안쪽, 친수성·전하 R기는 물과 닿는 바깥쪽.',
          4: '<b>4차 구조</b>: 폴리펩타이드 4개<br>헤모글로빈 = α 사슬 2개 + β 사슬 2개 (헴 4개).',
        }[stage];
        let extra = '';
        if (stage === 3 && !denat) { const m = metric(); extra = '<br><span style="color:#fdba74">중심까지 평균 거리: 소수성 ' + m[0].toFixed(1) + ' / 친수성·전하 ' + m[1].toFixed(1) + '</span>'; }
        if (denat) extra = stage === 1 ? '<br><span style="color:#fca5a5">🔥 서열은 변성되어도 그대로예요.</span>' : '<br><span style="color:#fca5a5">🔥 변성: 입체 구조가 풀려 기능을 잃어요. 서열 · 펩타이드 결합은 그대로!</span>';
        info('<div style="max-width:' + W + 'px">' + t + extra + '<div style="margin-top:3px">' + seqRow + '</div></div>');
      }
      function applyLabels() {
        const d = denat && stage > 1;
        resLabs.forEach((l) => l.show(stage === 1)); nL.show(stage === 2 && !d && !PHONE); cL.show(stage === 2 && !d && !PHONE);
        gL.show(stage === 2 && !d); helL.show(stage === 2 && !d); shL.show(stage === 2 && !d); hbL.show(stage === 2 && !d);
        coreL.show(stage === 3 && !d); wetL.show(stage === 3 && !d);
        subL.forEach((l, k) => l.show(stage === 4)); hemeL.show(stage === 4 && !d);
      }
      function setStage(v, quiet) {
        if (v === stage && !quiet) return; stage = v; fitNeeded = true; camGo = 1.3;
        replay = 0;
        segCtl.set(stage); refreshInfo(); applyLabels(); denB.style.display = '';
        foldB.style.display = stage === 3 ? '' : 'none';
        if (stage === 4) subs.forEach((S, s) => { if (s > 0) { S.cur = targetFor(s).map((p) => p.slice()); } });
      }
      const segCtl = controls.segment('구조 단계', [{ value: 1, label: '1차' }, { value: 2, label: '2차' }, { value: 3, label: '3차' }, { value: 4, label: '4차' }], 1, (v) => setStage(v));
      const denB = controls.button('🔥 변성', () => { denat = !denat; denB.classList.toggle('on', denat); denB.textContent = denat ? '↺ 원래 모양' : '🔥 변성'; fitNeeded = true; refreshInfo(); applyLabels(); });
      const foldB = controls.button('▶ 접기 다시 보기', () => { if (denat) { denat = false; denB.classList.remove('on'); denB.textContent = '🔥 변성'; } subs[0].cur = secd.map((p) => p.slice()); replay = 2.6; refreshInfo(); applyLabels(); });
      foldB.style.display = 'none';

      function lessonStage() { try { const s = window.__sim && window.__sim.S; if (s && s.fold && s.fold.stage >= 1 && s.fold.stage <= 4) return s.fold.stage; } catch (e) {} return null; }
      { const ls = lessonStage(); if (ls) stage = ls; }
      segCtl.set(stage); snapAll(); foldB.style.display = stage === 3 ? '' : 'none'; refreshInfo(); applyLabels();

      /* 구조 4개 위치 · 크기 */
      const grp = subs.map(() => ({ x: 0, y: 0, z: 0, s: 1 }));
      function groupTarget(s) {
        if (stage < 4) return s === 0 ? { x: 0, y: 0, z: 0, s: 1, vis: 1 } : { x: 0, y: 0, z: 0, s: 0.01, vis: 0 };
        const k = denat ? 1.6 : 1, sc = denat ? 0.62 : 0.56, q = TET[s];
        return { x: q[0] * 0.95 * k, y: q[1] * 0.95 * k, z: q[2] * 0.95 * k, s: sc, vis: 1 };
      }
      subs.forEach((S, s) => { const g0 = groupTarget(s); Object.assign(grp[s], g0); S.g.position.set(g0.x, g0.y, g0.z); S.g.scale.setScalar(g0.s); S.g.visible = g0.vis > 0; });

      function centroidOf(pts, sel) { const c = [0, 0, 0]; let n = 0; pts.forEach((p, i) => { if (!sel || sel(i)) { c[0] += p[0]; c[1] += p[1]; c[2] += p[2]; n++; } }); return c.map((v) => v / n); }
      const foldCore = centroidOf(FOLD, (i) => PHOB[i]);
      const hdir = (() => { const c = centroidOf(FOLD); const d = [FOLD[6][0] - c[0], FOLD[6][1] - c[1], FOLD[6][2] - c[2]], L = Math.hypot(...d) || 1; return d.map((v) => v / L); })();

      return {
        update(dt, t) {
          T = t;
          if (fitNeeded && camera.aspect) { fit(); fitNeeded = false; }
          if (camGo > 0) { camGo -= dt; const ct = stage === 1 ? 0.12 : stage === 2 ? 0.7 : 0.85, cp = stage === 1 ? 1.42 : stage === 2 ? 1.1 : 1.12; orbit.theta += (ct - orbit.theta) * Math.min(1, dt * 3); orbit.phi += (cp - orbit.phi) * Math.min(1, dt * 3); }
          infoT -= dt; if (infoT < 0) { infoT = 0.3; if (stage === 3 && !denat) refreshInfo(); }
          const folded3 = stage >= 3 && !denat;
          subs.forEach((S, s) => {
            const tg = targetFor(s), rate = replay > 0 ? 1.6 : 3.2;
            S.cur.forEach((c, i) => { for (let k = 0; k < 3; k++) c[k] = ap(c[k], tg[i][k], dt, rate); });
            const g = groupTarget(s), G = grp[s];
            ['x', 'y', 'z', 's'].forEach((k) => { G[k] = ap(G[k], g[k], dt, 3.5); });
            S.vis = ap(S.vis, g.vis, dt, 5);
            S.g.visible = S.vis > 0.02 || g.vis > 0; S.g.position.set(G.x, G.y, G.z); S.g.scale.setScalar(Math.max(0.01, G.s * (g.vis ? 1 : S.vis)));
            S.g.rotation.y = stage === 4 ? [0, 2.4, 1.2, 3.6][s] : 0;
            S.envS = ap(S.envS, stage === 4 && !denat ? 1 : 0, dt, 4); S.env.visible = S.envS > 0.03; S.env.scale.setScalar(Math.max(0.01, S.envS));
            S.hemeS = ap(S.hemeS, stage === 4 && !denat ? 1 : 0, dt, 4); S.heme.visible = S.hemeS > 0.03; S.heme.scale.setScalar(Math.max(0.01, S.hemeS));
            S.heme.position.set(foldCore[0] + hdir[0] * 1.15, foldCore[1] + hdir[1] * 1.15, foldCore[2] + hdir[2] * 1.15);
            S.coreS = ap(S.coreS, folded3 && stage === 3 ? 1 : 0, dt, 4); S.core.visible = S.coreS > 0.03;
            const cc = centroidOf(S.cur, (i) => PHOB[i]); S.core.position.set(cc[0], cc[1], cc[2]); S.core.scale.setScalar(Math.max(0.01, 0.95 * S.coreS));
            S.anchor.position.set(...centroidOf(S.cur));
            poseSub(S, t);
          });
          if (replay > 0) replay -= dt;
          // 2차 구조 보조물
          dashS = ap(dashS, stage === 2 && !denat ? 1 : 0, dt, 5); dashG.visible = dashS > 0.03; dashG.scale.setScalar(Math.max(0.01, dashS));
          if (dashG.visible) {
            const S0 = subs[0], gp = [];
            dashPairs.forEach((d) => {
              const a = S0.beads[d.a].position, b = d.t === 'h' ? S0.beads[d.b].position : ghosts[d.b].position;
              d.dots.forEach((m, k) => { const f = (k + 1) / 5; m.position.set(a.x + (b.x - a.x) * f, a.y + (b.y - a.y) * f, a.z + (b.z - a.z) * f); });
            });
          }
        },
        sync() { const ls = lessonStage(); if (ls && ls !== stage) setStage(ls); },
      };
    },
  });
})();
