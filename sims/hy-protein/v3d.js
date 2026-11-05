/* hy-protein · 3D 단백질 구조 (1차 → 4차, 변성)
   아미노산 12개 구슬(소수성 주황 · 친수성 파랑 · 전하 초록)이 이어진 사슬이 나선·병풍으로, 입체 구조로, 4개가 모인 헤모글로빈으로 접히는 모습
   1단계(아미노산 구슬 · 물속 R기의 성질), 2단계(mRNA 코돈 순서대로 구슬 연결), 3단계 낫 모양 적혈구(정상 · 변이 β 사슬, 산소 많음 · 적음)도 2D와 같은 값으로 보여 줘요.
   (분류 카드 놓기 · 경우의 수 계산은 2D에서 해요.) */
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
    levels: [2, 3],   // 1·2단계(구슬 · 사슬)는 2D에서 끌어 놓는 활동이라 2D로 시작하고, 3D 단추로 같은 장면을 볼 수 있어요. 접힘 · 낫 모양 · 변성 단계에서 3D로 시작
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
      let stage = 1, denat = false, foldedFlag = false, playing = false, lastLs = {}, replay = 0, T = 0, fitNeeded = true, camGo = 0, infoT = 0;
      const targetFor = (s) => {
        if (stage === 1) return prim;
        if (denat) return COIL[s];
        if (stage === 2) return secd;
        return stage === 4 || foldedFlag ? FOLD : secd;   // 3차: 2D처럼 '물에 풀어 접기' 전에는 접히기 전 모습
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
        const W = PHONE ? 215 : 262, L = ctx.lesson(), mode = L && L.S ? L.S.mode : 'fold';
        const t = {
          1: '<b>1차 구조</b>: 아미노산 서열<br>구슬 12개가 <b>펩타이드 결합</b>(노란 막대)으로 이어졌어요.',
          2: '<b>2차 구조</b>: <b>나선</b>과 <b>병풍</b><br>사슬 일부가 <b>수소 결합</b>(흰 점선)으로 규칙적으로 접혀요.',
          3: '<b>3차 구조</b>: 입체 구조<br>R기끼리의 상호작용으로 접혀요. 소수성 R기(주황)는 안쪽, 친수성·전하 R기는 물과 닿는 바깥쪽.' + (foldedFlag || denat ? '' : '<br><span style="color:#fcd34d">💧 물에 풀어 접기를 눌러 보세요.</span>'),
          4: '<b>4차 구조</b>: 폴리펩타이드 4개<br>헤모글로빈 = α 사슬 2개 + β 사슬 2개 (헴 4개).',
        }[stage];
        let extra = '';
        if (stage === 3 && !denat && foldedFlag) { const m = metric(); extra = '<br><span style="color:#fdba74">중심까지 평균 거리: 소수성 ' + m[0].toFixed(1) + ' / 친수성·전하 ' + m[1].toFixed(1) + '</span>'; }
        if (mode === 'denat' && L && L.S.dn) { const d = L.S.dn; extra = '<br><span style="color:#fca5a5">처리: ' + (d.acid ? '강산' : d.alc ? '알코올' : d.T + ' °C') + ' · 효소 활성 ' + Math.round(d.f * 100) + ' %' + (denat ? '<br>🔥 변성: 입체 구조가 풀려 기능을 잃어요. 서열 · 펩타이드 결합은 그대로!' : '<br>열 · 강산 · 알코올로 변성시켜 보세요 (왼쪽 조작).') + '</span>'; }
        else if (mode === 'sickle') extra = '<br><span style="color:#fcd34d">🔴 낫 모양 화면은 ▦ 2D에서 정상 · 변이 β 사슬을 비교해 보세요. (6번째 아미노산 하나가 바뀌어요)</span>';
        else if (mode !== 'fold') extra = '<br><span style="color:#fcd34d">이 단계의 구슬 · 사슬 실험은 ▦ 2D에서 해요. 3D는 접힘 · 변성에서 2D와 함께 움직여요.</span>';
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
        replay = 0; if (stage <= 2) foldedFlag = false;
        segCtl.set(stage); refreshInfo(); applyLabels();
        foldB.style.display = stage === 3 && !foldedFlag ? '' : 'none';
        if (stage === 4) subs.forEach((S, s) => { if (s > 0) { S.cur = targetFor(s).map((p) => p.slice()); } });
      }
      /* 3D에서 단계를 고르면 2D도 같은 단계로 (4차는 2D처럼 3차를 접은 뒤에만) */
      function userStage(v) {
        const L = ctx.lesson();
        if (player && player.playing) player.pause();
        if (L && L.foldSetStage && L.S.mode === 'fold') {
          L.foldSetStage(v);
          if (L.S.fold.stage !== v) { segCtl.set(stage); info('<div style="max-width:250px">4차 구조는 먼저 3차 구조를 완성해야 볼 수 있어요.<br><span style="color:#fcd34d">💧 물에 풀어 접기를 눌러 보세요.</span></div>'); infoT = 2.5; return; }
          lastLs.stage = v;
        }
        setStage(v);
      }
      const segCtl = controls.segment('구조 단계', [{ value: 1, label: '1차' }, { value: 2, label: '2차' }, { value: 3, label: '3차' }, { value: 4, label: '4차' }], 1, userStage);
      const foldB = controls.button('💧 물에 풀어 접기', () => {
        const L = ctx.lesson();
        if (player && player.playing) player.pause();
        if (L && L.foldStart && L.S.mode === 'fold') { L.foldStart(); lastLs.stage = L.S.fold.stage; }
        if (stage !== 3) setStage(3);
        foldedFlag = true; subs[0].cur = secd.map((p) => p.slice()); replay = 2.6; foldB.style.display = 'none'; refreshInfo(); applyLabels();
      });
      foldB.style.display = 'none';

      /* ▶ 한 번 접히는 과정 보기: 1차 → 2차 → 3차(접힘) → 4차 */
      let pStage = 0;
      const player = controls.player({
        duration: 10, loop: true, autoplay: false, label: '구조 단계',
        phases: [[0, '1차 · 서열'], [0.25, '2차 · 나선 · 병풍'], [0.5, '3차 · 접힘'], [0.75, '4차 · 헤모글로빈']],
        onFrame(p) {
          const v = p < 0.25 ? 1 : p < 0.5 ? 2 : p < 0.75 ? 3 : 4;
          if (v !== pStage) { pStage = v; denat = false; if (v === 3) { foldedFlag = true; } setStage(v); }
          if (v === 3 && !foldedFlag) foldedFlag = true;
        },
      });

      function lessonStage() { try { const s = window.__sim && window.__sim.S; if (s && s.fold && s.fold.stage >= 1 && s.fold.stage <= 4) return s.fold.stage; } catch (e) {} return null; }
      /* 2D가 바뀌면 3D도 따라가요 (2D → 3D) */
      function followLesson() {
        const L = ctx.lesson(); if (!L || !L.S) return;
        const mode = L.S.mode;
        if (mode !== lastLs.mode) { lastLs.mode = mode; lastLs.stage = null; if (denat !== false && mode !== 'denat') denat = false; applyLabels(); refreshInfo(); }
        if (mode === 'denat') {
          const d = L.S.dn, dn = d.f < 0.5;
          if (!foldedFlag || stage !== 3 || dn !== denat) { foldedFlag = true; denat = dn; if (stage !== 3) setStage(3, true); fitNeeded = true; applyLabels(); refreshInfo(); foldB.style.display = 'none'; }
          lastInfo.f = d.f;
          return;
        }
        if (denat) { denat = false; fitNeeded = true; applyLabels(); refreshInfo(); }
        const st = lessonStage();
        if (mode === 'fold' && st && st !== lastLs.stage) { lastLs.stage = st; if (st !== stage) { if (st === 3 && L.S.fold.folded) foldedFlag = true; setStage(st); } }
        if (mode === 'fold' && L.S.fold && (L.S.fold.run || L.S.fold.folded) && stage === 3 && !foldedFlag) { foldedFlag = true; foldB.style.display = 'none'; refreshInfo(); }
      }
      const lastInfo = {};
      { const ls = lessonStage(); if (ls) { stage = ls; lastLs.stage = ls; } const L0 = ctx.lesson(); if (L0 && L0.S && L0.S.fold && (L0.S.fold.folded || L0.S.fold.run)) foldedFlag = true; }
      segCtl.set(stage); snapAll(); foldB.style.display = stage === 3 && !foldedFlag ? '' : 'none'; refreshInfo(); applyLabels();

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


      /* ================= 1·2단계 구슬(aa · sortaa · chain · calc) · 3단계 낫 모양 적혈구(sickle) ================= */
      const gOld = new THREE.Group(); while (root.children.length) gOld.add(root.children[0]); root.add(gOld);
      const gAA = new THREE.Group(), gCH = new THREE.Group(), gSK = new THREE.Group(); root.add(gAA, gCH, gSK); gAA.visible = gCH.visible = gSK.visible = false;
      const probe = controls.text(''); probe.style.display = 'none'; const ctlEl = probe.parentElement;
      const oldEls = Array.prototype.filter.call(ctlEl.children, (e) => e !== probe);
      const grab = (fn) => { const n0 = ctlEl.children.length; const r = fn(); return { r, els: Array.prototype.slice.call(ctlEl.children, n0) }; };
      const sh = (g2, on) => g2.els.forEach((e) => { e.style.display = on ? '' : 'none'; });
      const W = () => window.__sim || null;
      const stdM = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.38, metalness: 0.05 }, o || {}));
      const KEYS6 = ['ser', 'gln', 'leu', 'val', 'lys', 'glu'];
      /* 아미노산 구슬: 공통 부분(회색) + 아미노기(파랑) · 카복실기(빨강) + 곁사슬 R기(색) — 2D의 drawAA와 같아요 */
      function mkBead() {
        const g = new THREE.Group();
        g.add(new THREE.Mesh(new THREE.SphereGeometry(0.3, 28, 20), stdM(0xd8dee8)));
        const n = new THREE.Mesh(new THREE.SphereGeometry(0.1, 14, 10), stdM(0x3b82f6)); n.position.set(-0.19, 0.2, 0.08); g.add(n);
        const c = new THREE.Mesh(new THREE.SphereGeometry(0.1, 14, 10), stdM(0xef4444)); c.position.set(-0.19, -0.2, 0.08); g.add(c);
        const st = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.4, 8), stdM(0x64748b)); st.rotation.z = Math.PI / 2; st.position.x = 0.4; g.add(st);
        const R = new THREE.Mesh(new THREE.SphereGeometry(0.27, 24, 18), stdM(0xf97316)); R.position.x = 0.72; g.add(R);
        const sgH = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.05, 0.05), stdM(0xffffff, { emissive: 0xffffff, emissiveIntensity: 0.4 })), sgV = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.26, 0.05), stdM(0xffffff, { emissive: 0xffffff, emissiveIntensity: 0.4 }));
        sgH.position.set(0.72, 0, 0.27); sgV.position.set(0.72, 0, 0.27); g.add(sgH, sgV);
        const wat = []; for (let i = 0; i < 5; i++) { const w = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), stdM(0x50a0eb, { transparent: true, opacity: 0.8 })); g.add(w); wat.push(w); }
        return { g, R, sgH, sgV, wat, key: '' };
      }
      function setBead(B, key, withWater, t, ph) {
        const a = AAI[key]; if (B.key !== key) { B.key = key; B.R.material.color.setHex(a.col); B.sgH.visible = a.cls === 'chg'; B.sgV.visible = key === 'lys'; }
        B.wat.forEach((w, i) => { w.visible = withWater && a.cls !== 'phob'; if (w.visible) { const an = t * 0.9 + i * 6.283 / 5 + ph; w.position.set(0.72 + Math.cos(an) * 0.52, Math.sin(an) * 0.52, Math.sin(an * 0.7) * 0.2); } });
      }
      /* --- aa: 물속에서 R기의 성질 (2D의 S.aa.beads를 그대로) --- */
      const TW = 7.2, TH = 4.6, TD = 2.6;
      const waterM = [];
      { const gl = new THREE.Mesh(new THREE.BoxGeometry(TW, TH, TD), new THREE.MeshPhysicalMaterial({ color: 0xcfe6ff, transparent: true, opacity: 0.08, roughness: 0.03, clearcoat: 1, depthWrite: false })); gAA.add(gl);
        /* 물 부피 + 물결 표면 */
        const WH = TH - 0.4, wv = new THREE.Mesh(new THREE.BoxGeometry(TW - 0.12, WH, TD - 0.12), new THREE.MeshPhysicalMaterial({ color: 0x3f8fe0, transparent: true, opacity: 0.2, roughness: 0.05, clearcoat: 0.8, depthWrite: false })); wv.position.y = -TH / 2 + WH / 2 + 0.02; gAA.add(wv);
        const surfG = new THREE.PlaneGeometry(TW - 0.12, TD - 0.12, 36, 10); surfG.rotateX(-Math.PI / 2);
        const surf = new THREE.Mesh(surfG, new THREE.MeshPhysicalMaterial({ color: 0xbfe0ff, transparent: true, opacity: 0.45, roughness: 0.03, metalness: 0.1, clearcoat: 1, depthWrite: false, side: THREE.DoubleSide })); surf.position.y = -TH / 2 + WH + 0.02; gAA.add(surf);
        const sBase = Float32Array.from(surfG.attributes.position.array);
        gAA.userData.surf = () => { const t = performance.now() / 1000, pa = surfG.attributes.position; for (let i = 0; i < pa.count; i++) { const x = sBase[i * 3], z = sBase[i * 3 + 2]; pa.setY(i, Math.sin(x * 1.6 + t * 1.4) * 0.03 + Math.cos(z * 2.4 + t * 1.1) * 0.025); } pa.needsUpdate = true; };
        /* 유리 수조 모서리 + 받침 */
        const steel = stdM(0x8791a3, { metalness: 0.85, roughness: 0.28 });
        [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach((q) => { const v = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, TH, 10), steel); v.position.set(q[0] * TW / 2, 0, q[1] * TD / 2); gAA.add(v); });
        [-1, 1].forEach((yy) => { [-1, 1].forEach((zz) => { const h = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, TW, 10), steel); h.rotation.z = Math.PI / 2; h.position.set(0, yy * TH / 2, zz * TD / 2); gAA.add(h); }); [-1, 1].forEach((xx) => { const d = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, TD, 10), steel); d.rotation.x = Math.PI / 2; d.position.set(xx * TW / 2, yy * TH / 2, 0); gAA.add(d); }); });
        const fl = new THREE.Mesh(new THREE.BoxGeometry(TW + 0.5, 0.2, TD + 0.5), steel); fl.position.y = -TH / 2 - 0.1; gAA.add(fl);
        /* 실험대 + 뒷벽 */
        const c = document.createElement('canvas'); c.width = 512; c.height = 512; const x = c.getContext('2d');
        x.fillStyle = '#7d5a3c'; x.fillRect(0, 0, 512, 512);
        for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? 'rgba(60,35,15,.12)' : 'rgba(255,220,170,.06)'; x.fillRect(0, i * 64, 512, 64); x.fillStyle = 'rgba(30,16,6,.6)'; x.fillRect(0, i * 64, 512, 2); }
        for (let i = 0; i < 240; i++) { x.strokeStyle = 'rgba(40,22,8,' + (0.05 + Math.random() * 0.1) + ')'; x.lineWidth = 0.6 + Math.random(); const y = Math.random() * 512; x.beginPath(); x.moveTo(0, y); x.bezierCurveTo(150, y + Math.random() * 6 - 3, 350, y + Math.random() * 6 - 3, 512, y + Math.random() * 4 - 2); x.stroke(); }
        const wt = new THREE.CanvasTexture(c); wt.wrapS = wt.wrapT = THREE.RepeatWrapping; wt.repeat.set(2.4, 1.4);
        const bench = new THREE.Mesh(new THREE.BoxGeometry(18, 0.5, 9), new THREE.MeshStandardMaterial({ map: wt, color: 0x9a7d62, roughness: 0.6 })); bench.position.y = -TH / 2 - 0.45; gAA.add(bench);
        const c2 = document.createElement('canvas'); c2.width = 64; c2.height = 256; const x2 = c2.getContext('2d'); const gr = x2.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#25365e'); gr.addColorStop(1, '#0d1630'); x2.fillStyle = gr; x2.fillRect(0, 0, 64, 256);
        const wall = new THREE.Mesh(new THREE.PlaneGeometry(26, 12), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c2) })); wall.position.set(0, 1.2, -4.4); gAA.add(wall);
        /* 물 분자 (H₂O) 가득 */
        const NW = 170, om = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 8), stdM(0xe0524a, { transparent: true, opacity: 0.8 }), NW), hm = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 6), stdM(0xe8f0ff, { transparent: true, opacity: 0.8 }), NW * 2);
        om.frustumCulled = hm.frustumCulled = false; gAA.add(om, hm);
        const wp = Array.from({ length: NW }, (_, i) => { const r = (k) => { const v = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return v - Math.floor(v); }; return { x: (r(1) - 0.5) * (TW - 0.5), y: -TH / 2 + 0.25 + r(2) * (WH - 0.5), z: (r(3) - 0.5) * (TD - 0.4), ph: r(4) * 6.28, sp: 0.4 + r(5) * 0.8, ax: r(6) * 6.28 }; });
        const dm = new THREE.Object3D(), qa = new THREE.Quaternion();
        gAA.userData.water = (t) => {
          wp.forEach((q, i) => {
            const px = q.x + Math.sin(t * q.sp + q.ph) * 0.18, py = q.y + Math.cos(t * q.sp * 1.2 + q.ph) * 0.14, pz = q.z + Math.sin(t * q.sp * 0.8 + q.ph * 2) * 0.12, a = q.ax + t * q.sp;
            dm.position.set(px, py, pz); dm.rotation.set(0, 0, a); dm.scale.setScalar(0.085); dm.updateMatrix(); om.setMatrixAt(i, dm.matrix);
            [-1, 1].forEach((sd, k) => { dm.position.set(px + Math.cos(a + sd * 0.91) * 0.11, py + Math.sin(a + sd * 0.91) * 0.11, pz); dm.rotation.set(0, 0, 0); dm.scale.setScalar(0.05); dm.updateMatrix(); hm.setMatrixAt(i * 2 + k, dm.matrix); });
          });
          om.instanceMatrix.needsUpdate = true; hm.instanceMatrix.needsUpdate = true;
        };
        const lW = label('물 분자 (H₂O)', [TW / 2 - 0.9, -TH / 2 + 0.5, TD / 2], { color: 'rgba(30,64,120,.9)', size: 11.5, offset: [0, 0, 0.3] }); lW.show(false); gAA.userData.lW = lW;
      }
      const aaPool = Array.from({ length: 14 }, () => { const b = mkBead(); b.g.visible = false; gAA.add(b.g); return b; });
      const sortPool = KEYS6.map((k, i) => { const b = mkBead(); setBead(b, k, false, 0, 0); b.g.visible = false; b.g.position.set(((i % 3) - 1) * 2.6 - 0.3, i < 3 ? 0.9 : -1.1, 0); gAA.add(b.g); return b; });
      const sortLab = KEYS6.map((k, i) => { const l = label(AAI[k].name + ' (' + AAI[k].ab + ')', sortPool[i].g, { color: 'rgba(15,23,42,.85)', offset: [0.35, -0.75, 0] }); l.show(false); return l; });
      const lTank = label('물속 (확대)', [0, TH / 2 + 0.4, 0], { color: 'rgba(30,64,120,.9)' }); lTank.show(false);
      const aaBtns = grab(() => KEYS6.map((k) => controls.button('+ ' + AAI[k].name, () => { const w = W(); if (w) w.aaAdd(k); })));
      const aaClr = grab(() => controls.button('↺ 비우기', () => { const w = W(); if (w) w.aaClear(); }));
      /* --- chain: mRNA 코돈 순서대로 구슬 연결 --- */
      const CODS = ['UCU', 'CUG', 'GUU', 'AAA', 'GAA'], BC = { A: 0x16a34a, U: 0xa855f7, G: 0x2563eb, C: 0xf59e0b };
      const CX = (i) => (i - 2) * 1.95, CYM = 2.0, CYB = -0.3;
      { const strand = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 10.2, 8), stdM(0x94a3b8)); strand.rotation.z = Math.PI / 2; strand.position.set(0, CYM, 0); gCH.add(strand);
        CODS.forEach((cd, i) => cd.split('').forEach((ch, j) => { const bs = new THREE.Mesh(new THREE.SphereGeometry(0.17, 14, 10), stdM(BC[ch])); bs.position.set(CX(i) + (j - 1) * 0.5, CYM, 0); gCH.add(bs); }));
        for (let i = 0; i < 5; i++) { const ring = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.02, 8, 32), stdM(0x94a3b8, { transparent: true, opacity: 0.6 })); ring.position.set(CX(i), CYB, 0); gCH.add(ring); } }
      const lCod = CODS.map((cd, i) => { const l = label(cd, [CX(i), CYM + 0.55, 0], { color: 'rgba(30,58,138,.9)' }); l.show(false); return l; });
      const lmR = label('mRNA', [-5.4, CYM, 0], { color: 'rgba(71,85,105,.9)' }); lmR.show(false);
      const chPool = Array.from({ length: 5 }, () => { const b = mkBead(); b.g.visible = false; gCH.add(b.g); return b; });
      const chBond = Array.from({ length: 4 }, () => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 1, 10), stdM(0xfbbf24, { emissive: 0x7a5a00, emissiveIntensity: 0.4 })); m.rotation.z = Math.PI / 2; m.visible = false; gCH.add(m); return m; });
      const chWat = Array.from({ length: 4 }, () => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 8), stdM(0x50a0eb, { transparent: true, opacity: 0.9, emissive: 0x2255aa, emissiveIntensity: 0.4 })); m.visible = false; gCH.add(m); return m; });
      const chW = [0, 0, 0, 0]; let chN = 0;
      const lPep = label('펩타이드 결합 + 물 분자(H₂O) 하나 빠져나가요', [0, CYB - 1.3, 0], { color: 'rgba(120,80,0,.92)' }); lPep.show(false);
      const chBtns = grab(() => KEYS6.map((k) => controls.button(AAI[k].name, () => { const w = W(); if (w) w.chPlace(k); })));
      const chClr = grab(() => controls.button('↺ 다시', () => { const w = W(); if (w) w.chReset(); }));
      /* --- sickle: 정상 · 변이 헤모글로빈 β 사슬 / 산소 많음 · 적음 / 적혈구 모양 --- */
      const SEQN = [['Val', 'phob'], ['His', 'chg'], ['Leu', 'phob'], ['Thr', 'phil'], ['Pro', 'phob'], ['Glu', 'chg'], ['Glu', 'chg'], ['Lys', 'chg']];
      const CLC = { phob: 0xf97316, phil: 0x3b82f6, chg: 0x22b455 };
      const skBeads = SEQN.map((q, i) => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.3, 24, 16), stdM(CLC[q[1]])); m.position.set((i - 3.5) * 0.9, 3.7, 0); gSK.add(m); return m; });
      for (let i = 0; i < 7; i++) { const st = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.6, 8), stdM(0xfbbf24)); st.rotation.z = Math.PI / 2; st.position.set((i - 3) * 0.9, 3.7, 0); gSK.add(st); }
      const skRing = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.04, 10, 36), stdM(0x2563eb, { emissive: 0x2563eb, emissiveIntensity: 0.5 })); skRing.position.copy(skBeads[5].position); gSK.add(skRing);
      const skLab = SEQN.map((q, i) => { const l = label(q[0], skBeads[i], { color: 'rgba(15,23,42,.82)', size: 11.5, offset: [0, -0.55, 0] }); l.show(false); return l; });
      const lSeq = label('', [0, 5.2, 0], { color: 'rgba(30,58,138,.92)' }), lSix = label('', [skBeads[5].position.x + 0.2, 4.45, 0], { color: 'rgba(37,99,235,.92)' }); lSeq.show(false); lSix.show(false);
      const HB = Array.from({ length: 6 }, () => { const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.SphereGeometry(0.55, 28, 20), stdM(0xbfdbfe, { roughness: 0.3 })); g.add(b); const h = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), stdM(0xdc2626, { emissive: 0x7f1d1d, emissiveIntensity: 0.4 })); h.position.set(-0.2, 0.15, 0.5); g.add(h); const kn = new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 12), stdM(0xf97316, { emissive: 0x9a3412, emissiveIntensity: 0.4 })); kn.position.set(0.55, 0, 0); g.add(kn); gSK.add(g); return { g, b, kn }; });
      const fib = Array.from({ length: 5 }, () => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1, 10), stdM(0xf97316, { emissive: 0x9a3412, emissiveIntensity: 0.4, transparent: true, opacity: 0 })); m.rotation.z = Math.PI / 2; gSK.add(m); return m; });
      const lHb = label('', [-3.8, 1.2, 0], { color: 'rgba(51,65,85,.9)' }), lHb2 = label('', [0, -3.9, 0], { color: 'rgba(120,40,40,.92)' }), lKn = label('주황 돌기: 표면의 소수성 발린', [3.6, 0.7, 0], { color: 'rgba(194,65,12,.92)' }); [lHb, lHb2, lKn].forEach((l) => l.show(false));
      /* 적혈구: 오목한 원반 → 낫 모양 (정점을 매 프레임 바꿔요) */
      const rbcGeo = new THREE.SphereGeometry(1, 48, 32), rbcBase = Float32Array.from(rbcGeo.attributes.position.array);
      const rbc = new THREE.Mesh(rbcGeo, stdM(0xb91c1c, { roughness: 0.4 })); rbc.position.set(0, -2.1, 0); gSK.add(rbc);
      let rbcM = -1;
      function shapeRBC(m) {
        if (Math.abs(m - rbcM) < 0.004) return; rbcM = m; const pa = rbcGeo.attributes.position, R = 1.15, T = 0.34, e = m * m * (3 - 2 * m);
        for (let i = 0; i < pa.count; i++) {
          const px = rbcBase[i * 3], py = rbcBase[i * 3 + 1], pz = rbcBase[i * 3 + 2], rho2 = Math.min(1, px * px + pz * pz);
          let x = R * px, z = R * pz, y = py * T * (0.3 + 0.9 * rho2);
          x *= 1 + 1.0 * e; z *= 1 - 0.45 * e; const u = x / (R * 2);
          y *= 1 - 0.55 * e * Math.min(1, u * u * 3);
          z += 0.9 * e * u * u * R * 1.3;
          pa.setXYZ(i, x, y + 0.0, z);
        }
        pa.needsUpdate = true; rbcGeo.computeVertexNormals();
      }
      shapeRBC(0);
      const skMut = grab(() => controls.segment('β 사슬', [{ value: false, label: '정상' }, { value: true, label: '변이' }], false, (v) => { const w = W(); if (w) w.skSet(v, null); }));
      const skLow = grab(() => controls.segment('산소', [{ value: false, label: '많음' }, { value: true, label: '적음' }], false, (v) => { const w = W(); if (w) w.skSet(null, v); }));
      const Mn = new THREE.Matrix4();
      function updSickle(w, t) {
        const k = w.S.sk, m = k.mut;
        skBeads[5].material.color.setHex(m ? CLC.phob : CLC.chg); skRing.material.color.setHex(m ? 0xdc2626 : 0x2563eb); skRing.material.emissive.setHex(m ? 0xdc2626 : 0x2563eb);
        skLab[5].set(m ? 'Val' : 'Glu');
        lSeq.set(m ? '변이 헤모글로빈 β 사슬 (처음 8개)' : '정상 헤모글로빈 β 사슬 (처음 8개)'); lSix.set(m ? '6번째: 글루탐산 → 발린 (친수성 → 소수성)' : '6번째: 글루탐산 (친수성, 전하)');
        HB.forEach((o, i) => {
          const xf = (i - 2.5) * 1.2 + Math.sin(t * (0.5 + i * 0.07) + i * 2.1) * 0.35, yf = Math.cos(t * (0.4 + i * 0.05) + i) * 0.35, xl = (i - 2.5) * 1.25, p = k.poly;
          o.g.position.set(xf + (xl - xf) * p, 0.1 + yf * (1 - p), Math.sin(t * 0.6 + i * 1.7) * 0.4 * (1 - p)); o.g.rotation.y = i * 0.9 + t * 0.2 * (1 - p);
          o.b.material.color.setHex(k.low ? 0x9db9dc : 0xbfdbfe); o.kn.visible = m; if (m) o.kn.position.set(0.55, 0, 0);
        });
        fib.forEach((f, i) => { const a = HB[i].g.position, b = HB[i + 1].g.position; f.position.set((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2); f.scale.set(1, Math.max(0.01, a.distanceTo(b)), 1); f.rotation.set(0, 0, Math.atan2(b.y - a.y, b.x - a.x) - Math.PI / 2 + Math.PI); f.material.opacity = Math.min(0.9, k.poly * 1.2); f.visible = k.poly > 0.2; });
        shapeRBC(k.sick); rbc.rotation.x = 1.2;
        rbc.material.color.setHex(0xc43030);
        lHb.set('산소가 ' + (k.low ? '적을 때' : '많을 때') + '의 헤모글로빈 분자들');
        lHb2.set(k.sick > 0.5 ? '낫 모양 적혈구' : '둥근 원반 모양 적혈구');
        const msg = !m ? '서열이 정상이면 접힘도 정상이라, 산소가 적어도 헤모글로빈이 따로 있고 적혈구는 둥근 모양이에요.' : (k.low ? '글루탐산 하나가 발린으로 바뀌면 접힘이 달라져요. 산소가 적으면 표면의 소수성 돌기끼리 달라붙어 긴 섬유가 되고 적혈구가 낫 모양이 돼요.' : '변이가 있어도 산소가 많을 때는 따로 떨어져 있어요. 산소를 적게 해 보세요.');
        return '<b>' + (m ? '변이' : '정상') + ' 헤모글로빈 · 산소 ' + (k.low ? '적음' : '많음') + '</b><br>' + msg;
      }
      const lastEl = { v: '' };
      function updBeads(w, md, dt, t) {
        const aa = w.S.aa, TK = w.TANK;
        if (md === 'aa') {
          aaPool.forEach((B, i) => {
            const b = aa.beads[i]; B.g.visible = !!b; if (!b) return;
            setBead(B, b.key, true, t, b.ph);
            B.g.position.set((b.x - (TK.x + TK.w / 2)) / TK.w * TW, -(b.y - (TK.y + TK.h * 0.5)) / TK.h * TH, Math.sin(i * 12.9 + 1.3) * (TD / 2 - 0.6));
            B.g.rotation.z = -b.rot; B.g.scale.setScalar(1 + 0.25 * b.splash);
          });
          const ph = aa.beads.filter((b) => AAI[b.key].cls === 'phob').length, ot = aa.beads.length - ph;
          return '<b>물속에서 아미노산 R기의 성질</b><br>구슬 ' + aa.beads.length + '개 (소수성 R기 ' + ph + ' · 그 밖의 R기 ' + ot + ')<br>소수성 R기(주황)끼리는 모여 뭉치고, 친수성 R기(파랑)와 전하를 띤 R기(초록)는 물 분자(작은 파랑 구)와 닿으려고 흩어져요.';
        }
        sortPool.forEach((B, i) => { B.g.rotation.y = Math.sin(t * 0.6 + i) * 0.5; });
        return '<b>아미노산 6종</b><br>구슬마다 R기(색 구)가 달라요. 물속에서 본 성질로 분류하는 일은 ▦ 2D에서 해요.<br>파랑: 친수성 · 주황: 소수성 · 초록: 전하를 띠어요';
      }
      function updChain(w, md, dt, t) {
        const c = w.S.ch, n = c.seated.length;
        chPool.forEach((B, i) => { const pc = c.seated[i]; B.g.visible = !!pc; if (!pc) return; setBead(B, pc.key, false, t, 0); B.g.position.set(CX(i) - 0.3, CYB, 0); B.g.scale.setScalar(1 + 0.3 * (pc.pop || 0)); });
        chBond.forEach((m, i) => { m.visible = n > i + 1; if (m.visible) { m.scale.set(1, 0.9, 1); m.position.set((CX(i) + CX(i + 1)) / 2 - 0.3 + 0.0, CYB + 0.0, 0); } });
        if (n > chN) { for (let k = chN; k < n; k++) if (k >= 1) chW[k - 1] = 1.3; } chN = n;
        chWat.forEach((m, i) => { chW[i] = Math.max(0, chW[i] - dt); m.visible = chW[i] > 0; if (m.visible) { const f = 1 - chW[i] / 1.3; m.position.set((CX(i) + CX(i + 1)) / 2 - 0.3 + f * 0.9, CYB - 0.2 + f * 1.4, 0.3); m.scale.setScalar(1 - 0.3 * f); } });
        lPep.show(n >= 2); lPep.obj = [0, CYB - 1.2, 0];
        const msg = c.done ? '폴리펩타이드 완성! 이 순서가 단백질의 1차 구조(아미노산 서열)예요.' : '다음은 ' + (n + 1) + '번째 코돈 <b>' + CODS[n] + '</b>에 맞는 아미노산이에요.' + (c.wrong ? '<br>틀린 횟수 ' + c.wrong + '번 · 코돈표는 ▦ 2D에서 봐요.' : '');
        return '<b>mRNA 코돈 순서대로 연결해요</b><br>연결한 구슬 ' + n + ' / 5 · 펩타이드 결합 ' + Math.max(0, n - 1) + '개<br>' + msg + (md === 'calc' ? '<br><span style="color:#9fb0d4">경우의 수 계산(20ⁿ)은 ▦ 2D에서 해요. 아미노산은 20종이라서 구슬 n개의 서열은 20ⁿ가지예요.</span>' : '');
      }
      let curNew = '';
      function applyNew(md) {
        if (md === curNew) return; const was = curNew; curNew = md;
        const isNew = md === 'aa' || md === 'sortaa' || md === 'chain' || md === 'calc' || md === 'sickle';
        gOld.visible = !isNew; gAA.visible = md === 'aa' || md === 'sortaa'; gCH.visible = md === 'chain' || md === 'calc'; gSK.visible = md === 'sickle';
        oldEls.forEach((e) => { e.style.display = isNew ? 'none' : ''; });
        sh(aaBtns, md === 'aa'); sh(aaClr, md === 'aa'); sh(chBtns, md === 'chain'); sh(chClr, md === 'chain'); sh(skMut, md === 'sickle'); sh(skLow, md === 'sickle');
        lTank.show(md === 'aa'); gAA.userData.lW.show(md === 'aa'); sortPool.forEach((B) => { B.g.visible = md === 'sortaa'; }); sortLab.forEach((l) => l.show(md === 'sortaa'));
        lCod.forEach((l) => l.show(md === 'chain' || md === 'calc')); lmR.show(md === 'chain' || md === 'calc'); if (md !== 'chain' && md !== 'calc') lPep.show(false);
        skLab.forEach((l) => l.show(md === 'sickle')); [lSeq, lSix, lHb, lHb2].forEach((l) => l.show(md === 'sickle')); lKn.show(false);
        if (isNew) { resLabs.concat([nL, cL, helL, shL, gL, hbL, coreL, wetL, hemeL], subL).forEach((l) => l.show(false)); orbit.theta = 0.1; orbit.phi = 1.4; orbit.tx = 0; orbit.ty = md === 'sickle' ? 0.9 : 0.3; orbit.tz = 0; orbit.dist = md === 'sickle' ? (PHONE ? 24 : 17.5) : (PHONE ? 17 : 12.5); }
        else if (was) { fitNeeded = true; camGo = 1.3; lastLs.mode = null; applyLabels(); }
        lastEl.v = '';
      }
      return {
        update(dt, t) {
          T = t;
          const Lw = W(), mdN = Lw && Lw.S ? Lw.S.mode : 'fold';
          applyNew(mdN);
          if (mdN === 'aa' || mdN === 'sortaa' || mdN === 'chain' || mdN === 'calc' || mdN === 'sickle') {
            dt = Math.min(dt, 0.05); let h;
            if (gAA.visible) { gAA.userData.water(t); gAA.userData.surf(); }
            if (mdN === 'sickle') { h = updSickle(Lw, t); skMut.r.set(!!Lw.S.sk.mut); skLow.r.set(!!Lw.S.sk.low); }
            else if (mdN === 'chain' || mdN === 'calc') h = updChain(Lw, mdN, dt, t);
            else h = updBeads(Lw, mdN, dt, t);
            if (h !== lastEl.v) { lastEl.v = h; info('<div style="max-width:' + (PHONE ? 215 : 280) + 'px">' + h + '</div>'); }
            return;
          }
          if (!player.playing) followLesson(); else lastLs.stage = lessonStage();
          if (fitNeeded && camera.aspect) { fit(); fitNeeded = false; }
          if (camGo > 0) { camGo -= dt; const ct = stage === 1 ? 0.12 : stage === 2 ? 0.7 : 0.85, cp = stage === 1 ? 1.42 : stage === 2 ? 1.1 : 1.12; orbit.theta += (ct - orbit.theta) * Math.min(1, dt * 3); orbit.phi += (cp - orbit.phi) * Math.min(1, dt * 3); }
          infoT -= dt; if (infoT < 0) { infoT = 0.3; if ((stage === 3 && !denat) || denat || (ctx.lesson() && ctx.lesson().S.mode === 'denat')) refreshInfo(); }
          const folded3 = stage >= 3 && !denat && (foldedFlag || stage === 4);
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
        sync() { followLesson(); },
      };
    },
  });
})();
