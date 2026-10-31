/* hx-water-hbond · 3D 얼음의 수소 결합 구조와 액체 물
   얼음에서는 물 분자 하나가 이웃 4개와 수소 결합(점선)으로 이어져 6각 고리가 뚫린 '빈 구조'를 이뤄요.
   슬라이더로 녹이면 구조가 무너져 분자가 가까워지고(부피 약 8 % 감소) 밀도가 커져요.
   ※ 분자 수준의 입체 모형(스케치): O–O 간격을 1로 두고 그렸어요. 결합 길이·각은 얼음 Ih의 이상적인 값이에요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const OH = 0.348;                                  // O–H 공유 결합 길이 (O···O = 1)
  const HB_C = 0xff5a5f;
  const SHRINK = Math.cbrt(0.9167 / 0.9998);         // 선형 수축 (녹을 때 부피 0.917배)
  const RHO_ICE = 0.9167, RHO_WATER = 0.9998;

  function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

  // 휴대폰에서는 단계에 따라 도구 줄이 사라지므로 화면 오른쪽 아래의 떠 있는 버튼을 써요.
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const v3 = window.SciSim3D.attach({
    button: PHONE ? null : undefined,
    title: '얼음의 수소 결합 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: 11, theta: 0.6, phi: 1.25, min: 5, max: 22 },
    autoRotate: 0.2,
    build(ctx) {
      const { THREE, root, label, info, controls, orbit } = ctx;
      const R = rng(20260);
      const g = new THREE.Group(); root.add(g);
      const UP = new THREE.Vector3(0, 1, 0);
      const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

      /* ---------- 얼음 Ih의 산소 자리 (우르츠광형 배치, O–O = 1) ---------- */
      const a = Math.sqrt(8 / 3), c = 8 / 3 * 1.0;
      const A1 = V3(a, 0, 0), A2 = V3(-a / 2, 0, a * Math.sqrt(3) / 2), CC = V3(0, c, 0);
      const BASIS = [[0, 0, 0], [0, 0, 3 / 8], [1 / 3, 2 / 3, 1 / 2], [1 / 3, 2 / 3, 7 / 8]];
      const sites = [];
      for (let i = -3; i <= 3; i++) for (let j = -3; j <= 3; j++) for (let k = -1; k <= 2; k++) BASIS.forEach((b) => {
        sites.push(A1.clone().multiplyScalar(i + b[0]).add(A2.clone().multiplyScalar(j + b[1])).add(CC.clone().multiplyScalar(k + b[2])));
      });
      const yc = c * 0.5 + c * 3 / 16, RAD = 2.05, HALF = 2.05;
      const inCl = (p) => Math.hypot(p.x, p.z) <= RAD && Math.abs(p.y - yc) <= HALF;
      const cl = sites.filter(inCl).map((p) => p.clone().setY(p.y - yc));
      const N = cl.length;
      const nbrOf = (p) => { const out = []; sites.forEach((q) => { const d = q.distanceTo(p); if (d > 0.9 && d < 1.1) out.push(q); }); return out; };
      /* 사이트별 이웃 방향(4개): 군집 안 이웃이면 index, 아니면 -1 */
      const key = (p) => Math.round(p.x * 50) + ',' + Math.round(p.y * 50) + ',' + Math.round(p.z * 50);
      const idx = new Map(); cl.forEach((p, i) => idx.set(key(p.clone().setY(p.y + yc)), i));
      const dirsOf = cl.map((p) => nbrOf(p.clone().setY(p.y + yc)).map((q) => ({ d: q.clone().sub(p.clone().setY(p.y + yc)).normalize(), j: idx.has(key(q)) ? idx.get(key(q)) : -1 })));
      /* 얼음 규칙(분자마다 H 2개 주고 2개 받기)을 만족하도록 방향 정하기 */
      const edges = [];                                   // {u, ui, v|-1, vi, don}  don: 0이면 u가 주는 쪽
      dirsOf.forEach((ds, u) => ds.forEach((n, ui) => { if (n.j === -1) edges.push({ u, ui, v: -1, don: R() < 0.5 ? 0 : 1 }); else if (n.j > u) { const vi = dirsOf[n.j].findIndex((m) => m.j === u); edges.push({ u, ui, v: n.j, vi, don: R() < 0.5 ? 0 : 1 }); } }));
      const inc = cl.map(() => []); edges.forEach((e, k) => { inc[e.u].push(k); if (e.v >= 0) inc[e.v].push(k); });
      const outDeg = (m) => inc[m].reduce((s, k) => { const e = edges[k]; return s + ((e.u === m ? e.don === 0 : e.don === 1) ? 1 : 0); }, 0);
      for (let it = 0; it < 40000; it++) {
        const m = (R() * N) | 0, o = outDeg(m);
        if (o === 2) continue;
        const cand = inc[m].filter((k) => { const e = edges[k], isOut = e.u === m ? e.don === 0 : e.don === 1; return o > 2 ? isOut : !isOut; });
        if (!cand.length) continue;
        const k = cand[(R() * cand.length) | 0]; edges[k].don ^= 1;
      }
      /* 분자마다 H 방향 두 개 */
      const H0 = cl.map(() => []);
      edges.forEach((e) => {
        const donor = e.don === 0 ? e.u : e.v, di = e.don === 0 ? e.ui : e.vi;
        if (donor >= 0) H0[donor].push(dirsOf[donor][di].d.clone());
      });
      /* 아직 H가 2개가 아닌 분자(가장자리)는 비어 있는 방향으로 채움 */
      H0.forEach((hs, m) => { if (hs.length < 2) dirsOf[m].forEach((n) => { if (hs.length < 2 && !hs.some((h) => h.distanceTo(n.d) < 0.01)) hs.push(n.d.clone()); }); if (hs.length > 2) hs.length = 2; });

      /* ---------- 액체 물 스냅샷 ---------- */
      const P0 = cl.map((p) => p.clone()), P1 = [];
      for (let i = 0; i < N; i++) {
        let best = null;
        for (let tr = 0; tr < 60; tr++) {
          const gx = () => (R() + R() + R() - 1.5) * 0.7;
          const q = P0[i].clone().multiplyScalar(SHRINK).add(V3(gx(), gx(), gx()).multiplyScalar(0.55));
          if (P1.every((o) => o.distanceTo(q) > 0.86)) { best = q; break; }
          best = q;
        }
        P1.push(best);
      }
      function randQ() { const u1 = R(), u2 = R() * 2 * Math.PI, u3 = R() * 2 * Math.PI, s1 = Math.sqrt(1 - u1), s2 = Math.sqrt(u1); return new THREE.Quaternion(s1 * Math.sin(u2), s1 * Math.cos(u2), s2 * Math.sin(u3), s2 * Math.cos(u3)); }
      function hbondsOf(P, Hd) {
        const cand = [];
        for (let m = 0; m < N; m++) for (let h = 0; h < 2; h++) {
          const d = Hd[m][h]; if (!d) continue;
          const Hp = P[m].clone().addScaledVector(d, OH);
          for (let n = 0; n < N; n++) {
            if (n === m) continue;
            const dist = Hp.distanceTo(P[n]); if (dist > 0.8) continue;
            const v1 = P[m].clone().sub(Hp).normalize(), v2 = P[n].clone().sub(Hp).normalize();
            if (v1.dot(v2) < -0.766) cand.push({ m, h, n, Hp, dist });          // 각 O–H···O ≥ 140°
          }
        }
        cand.sort((x, y) => x.dist - y.dist);
        const used = new Set(), acc = new Array(N).fill(0), out = [];
        cand.forEach((c) => { const k = c.m * 2 + c.h; if (used.has(k) || acc[c.n] >= 2) return; used.add(k); acc[c.n]++; out.push(c); }); // 받는 자리는 O마다 2개까지
        return out;
      }
      const Q1 = cl.map(() => new THREE.Quaternion());
      const rmax = Math.max(...cl.map((p) => p.length())), thr = cl.map((p) => 0.9 * (0.55 * p.length() / rmax + 0.45 * R()));
      /* 액체 방향 최적화: 이웃과 수소 결합을 가장 많이 만드는 회전을 고르기 */
      (function () {
        for (let m = 0; m < N; m++) Q1[m] = randQ();
        const total = () => { const Hd = H0.map((hs, m) => hs.map((d) => d.clone().applyQuaternion(Q1[m]))); return hbondsOf(P1, Hd).length; };
        let cur = total();
        for (let sweep = 0; sweep < 3; sweep++) for (let m = 0; m < N; m++) {
          const old = Q1[m];
          let bestQ = old, bestS = cur;
          for (let tr = 0; tr < 36; tr++) { Q1[m] = randQ(); const sc = total(); if (sc > bestS) { bestS = sc; bestQ = Q1[m]; } }
          Q1[m] = bestQ; cur = bestS;
        }
      })();

      /* ---------- 그리기 도구 ---------- */
      const mO = new THREE.MeshStandardMaterial({ color: 0xe23b3b, roughness: 0.4 }), mH = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.4 });
      const mS = new THREE.MeshStandardMaterial({ color: 0xd5deee, roughness: 0.6 });
      const gO = new THREE.SphereGeometry(0.2, 22, 16), gH = new THREE.SphereGeometry(0.11, 16, 12), gC = new THREE.CylinderGeometry(1, 1, 1, 8);
      const mols = P0.map(() => { const o = new THREE.Mesh(gO, mO), h = [0, 1].map(() => new THREE.Mesh(gH, mH)), s = [0, 1].map(() => new THREE.Mesh(gC, mS)); g.add(o, ...h, ...s); return { o, h, s }; });
      const MAXD = 480, dashes = new THREE.InstancedMesh(gC, new THREE.MeshBasicMaterial({ color: HB_C }), MAXD); dashes.frustumCulled = false; g.add(dashes);
      const dummy = new THREE.Object3D();
      let showHB = true, showRing = true, w = 0;
      // 6각 고리 하나 찾기 (가운데 근처, 군집 안 이웃만)
      const adj = cl.map((p, i) => dirsOf[i].filter((n) => n.j >= 0).map((n) => n.j));
      let ring = null;
      (function () {
        const order = cl.map((p, i) => i).sort((x, y) => Math.hypot(cl[x].x, cl[x].z) + Math.abs(cl[x].y) * 0.5 - Math.hypot(cl[y].x, cl[y].z) - Math.abs(cl[y].y) * 0.5);
        let bestR = null, bestScore = 1e9;
        order.slice(0, 14).forEach((s) => {
          const path = [s];
          (function dfs() {
            const cur = path[path.length - 1];
            if (path.length === 6) { if (adj[cur].includes(s)) { const cen = path.reduce((q, i) => q.add(cl[i]), V3(0, 0, 0)).multiplyScalar(1 / 6); const sc = Math.hypot(cen.x, cen.z) + Math.abs(cen.y) * 0.3; const lay = Math.max(...path.map((i) => cl[i].y)) - Math.min(...path.map((i) => cl[i].y)); if (lay > 0.2 && sc < bestScore) { bestScore = sc; bestR = path.slice(); } } return; }
            adj[cur].forEach((n) => { if (!path.includes(n)) { path.push(n); dfs(); path.pop(); } });
          })();
        });
        ring = bestR;
      })();
      let ringMesh = null;
      const ringMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, transparent: true, opacity: 0.55, roughness: 0.3, emissive: 0x7a5d00 });
      const anchorHB = new THREE.Object3D(); g.add(anchorHB);
      const labMol = label('물 분자 1개', mols[0].o, { color: 'rgba(30,64,175,.95)' }), labHB = label('수소 결합 (점선)', anchorHB, { color: 'rgba(200,40,50,.95)' }), labRing = label('6각 고리', [0, 0, 0], { color: 'rgba(161,98,7,.95)' });
      let hbCount = 0, innerAvg = 0;
      const inner = cl.map((p, i) => i).filter((i) => cl[i].length() < 1.25);
      // 중심 근처의 분자 하나를 이름표 대상으로
      const cIdx = cl.map((p, i) => i).filter((i) => Math.abs(cl[i].y) < 1.2).sort((x, y) => (cl[y].x + cl[y].z * 0.3) - (cl[x].x + cl[x].z * 0.3))[0];
      labMol.obj = mols[cIdx].o; labMol.off = [0, 0.5, 0]; labHB.off = [0, -0.35, 0]; labRing.off = [0, 0.3, 0];

      const cyl = new THREE.CylinderGeometry(1, 1, 1, 8);
      function setStick(m, p, q, r) { const d = q.clone().sub(p), len = Math.max(1e-4, d.length()); m.position.copy(p).add(q).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(UP, d.normalize()); m.scale.set(r, len, r); }
      function layout() {
        // 표면 쪽 분자부터 차례로 액체 상태로 바뀌어요 (분자마다 녹는 시점이 달라요)
        const sm = (m) => { const x = Math.max(0, Math.min(1, (w - thr[m]) / 0.1)); return x * x * (3 - 2 * x); };
        const P = P0.map((p, i) => p.clone().lerp(P1[i], sm(i)));
        const qT = new THREE.Quaternion();
        const Hd = H0.map((hs, m) => { qT.identity().slerp(Q1[m], sm(m)); return hs.map((d) => d.clone().applyQuaternion(qT)); });
        P.forEach((p, m) => {
          mols[m].o.position.copy(p);
          [0, 1].forEach((h) => {
            const d = Hd[m][h];
            if (!d) { mols[m].h[h].visible = false; mols[m].s[h].visible = false; return; }
            const Hp = p.clone().addScaledVector(d, OH);
            mols[m].h[h].visible = mols[m].s[h].visible = true;
            mols[m].h[h].position.copy(Hp); setStick(mols[m].s[h], p, Hp, 0.035);
          });
        });
        const hb = hbondsOf(P, Hd);
        hbCount = hb.length; let ni = 0;
        innerAvg = inner.length ? hb.reduce((n, b) => n + (inner.includes(b.m) ? 1 : 0) + (inner.includes(b.n) ? 1 : 0), 0) / inner.length : 0;
        hb.forEach((b) => {
          const A = b.Hp, B = P[b.n], L = A.distanceTo(B), nd = B.clone().sub(A).normalize(), nDash = 3, step = L / nDash;
          for (let k = 0; k < nDash && ni < MAXD; k++) {
            const s0 = k * step + step * 0.15, s1 = (k + 1) * step - step * 0.15, p0 = A.clone().addScaledVector(nd, s0), p1 = A.clone().addScaledVector(nd, s1);
            dummy.position.copy(p0).add(p1).multiplyScalar(0.5); dummy.quaternion.setFromUnitVectors(UP, nd); dummy.scale.set(0.028, s1 - s0, 0.028); dummy.updateMatrix(); dashes.setMatrixAt(ni++, dummy.matrix);
          }
        });
        dashes.count = ni; dashes.instanceMatrix.needsUpdate = true; dashes.visible = showHB;
        if (hb.length) { const b = hb.slice().sort((x, y) => (x.Hp.x + x.Hp.z * 0.3) - (y.Hp.x + y.Hp.z * 0.3))[0]; anchorHB.position.copy(b.Hp.clone().add(P[b.n]).multiplyScalar(0.5)); }
        labHB.show(showHB && hb.length > 0 && w < 0.98);
        // 6각 고리
        if (ringMesh) { g.remove(ringMesh); ringMesh.geometry.dispose(); ringMesh = null; }
        const showR = showRing && ring && w < 0.4;
        if (showR) {
          const curve = new THREE.CatmullRomCurve3(ring.map((i) => P[i].clone()), true, 'catmullrom', 0.3);
          ringMesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 48, 0.06, 8, true), ringMat); g.add(ringMesh);
          labRing.obj = ring.reduce((q, i) => q.add(P[i]), V3(0, 0, 0)).multiplyScalar(1 / 6).toArray();
        }
        labRing.show(!!showR);
        text();
      }
      const frac = (v) => Math.round(v * 100);
      function text() {
        const V = 1 - (1 - 0.9167 / 0.9998) * w, rho = RHO_ICE / V;
        const per = innerAvg.toFixed(1);
        const state = w < 0.05 ? '얼음' : w > 0.95 ? '물 (액체)' : '녹는 중';
        info('<b>' + state + '</b> · 분자 ' + N + '개를 그린 모형<br>' + (w < 0.05
          ? '분자 하나가 이웃 4개와 <span style="color:#ff8a8f">수소 결합</span>(점선)을 해서 <b>6각 고리</b>와 빈 공간이 생겨요.'
          : w > 0.95 ? '수소 결합이 끊어지고 이어지기를 반복하며 분자들이 빈 공간으로 들어와 가까워져요.' : '수소 결합이 하나씩 끊어지며 구조가 무너지고 있어요.') +
          '<br>같은 분자 수의 부피 <b>' + (V * 100).toFixed(0) + '%</b> → 밀도 약 <b>' + rho.toFixed(3) + ' g/cm³</b>' + '<br>가운데 분자 하나의 수소 결합: ' + (w < 0.05 ? '<b>4개</b> (주는 자리 2 + 받는 자리 2)' : w > 0.95 ? '평균 <b>약 ' + per + '개</b> (끊어졌다 이어졌다 해요)' : '하나씩 끊어지는 중…'));
      }
      const sl = controls.range('상태', 0, 1, 0.01, 0, (v) => { w = v; layout(); }, (v) => (v < 0.03 ? '얼음' : v > 0.97 ? '물' : '녹는 중 ' + frac(v) + '%'));
      controls.segment('시점', [{ value: 'side', label: '옆에서' }, { value: 'top', label: '위에서 (고리 구멍)' }], 'side', (v) => { orbit.phi = v === 'top' ? 0.1 : 1.25; });
      const hbB = controls.button('수소 결합 ✓', () => { showHB = !showHB; hbB.classList.toggle('on', showHB); hbB.textContent = '수소 결합 ' + (showHB ? '✓' : '✕'); layout(); }); hbB.classList.add('on');
      const rgB = controls.button('6각 고리 ✓', () => { showRing = !showRing; rgB.classList.toggle('on', showRing); rgB.textContent = '6각 고리 ' + (showRing ? '✓' : '✕'); layout(); }); rgB.classList.add('on');
      { const vv = ctx.renderer.domElement, asp = Math.max(0.3, vv.clientWidth / Math.max(1, vv.clientHeight)); if (asp < 1) orbit.dist = Math.max(orbit.dist, 3.4 / (0.414 * asp)); }
      const api = {
        sync() { // 2D '얼음의 밀도'가 물 상태이면 물로 시작 (읽기 전용)
          try { const s = window.__sim; if (s && s.S && s.S.mode === 'dens' && s.S.dens && (s.S.dens.frozen ? 0 : 1) !== Math.round(w)) { w = s.S.dens.frozen ? 0 : 1; sl.set(w); layout(); } } catch (e) { /* 무시 */ }
        },
      };
      api.sync();
      layout();
      return api;
    },
  });
  if (v3 && PHONE) { v3.button.style.top = 'auto'; v3.button.style.bottom = '10px'; }
})();
