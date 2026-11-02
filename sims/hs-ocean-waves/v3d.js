/* hs-ocean-waves · 3D 해파 (심해파 · 천해파) 물 입자의 운동
   주기 T와 수심 h를 바꾸면 파장 λ와 입자의 궤도(원 → 납작한 타원)가 어떻게 달라지는지 입체로 봐요.
   분산 관계 ω² = g·k·tanh(kh)를 그대로 풀어요.  h/λ > 1/2 : 심해파(원운동, c = gT/2π),  h/λ < 1/20 : 천해파(납작한 타원, c = √(gh)).
   물결의 높이는 보기 좋게 줄여 그렸어요. 2D 실험의 단계(심해파·천해파·전이파)에서 값을 읽어 시작해요(읽기 전용). */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const G = 9.8, TAU = Math.PI * 2, LX = 10, LZ = 3.2, LV = 4.2;     // 수조 길이 · 폭 · 보이는 파장
  const HS = [5, 10, 20, 40, 100, 200, 400, 1000, 4000];             // 고를 수 있는 수심(m)

  function waveOf(T, h) {                                            // 분산 관계 풀기
    const w = TAU / T; let k = w * w / G;
    for (let i = 0; i < 60; i++) { const f = G * k * Math.tanh(k * h) - w * w, d = G * Math.tanh(k * h) + G * k * h / Math.pow(Math.cosh(k * h), 2); k -= f / d; if (!(k > 0)) k = w * w / G; }
    return { k, L: TAU / k, c: w / k, hl: h * k / TAU };
  }
  const cls = (hl) => (hl > 0.5 ? 'deep' : hl < 0.05 ? 'shallow' : 'trans');

  window.SciSim3D.attach({
    title: '해파와 물 입자의 궤도 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    levels: [1, 2, 3],
    camera: { dist: PHONE ? 15 : 11.2, theta: 0.4, phi: 1.22, min: 6, max: 26, target: [0, -0.9, 0] },
    autoRotate: 0,
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const st = { T: 8, hi: 8, orb: true, t: 0, mode: null };
      const H = () => HS[st.hi];
      const sr = () => { try { return window.__sim && window.__sim.S; } catch (e) { return null; } };

      /* 수조: 바닥 + 뒷벽 + 물 */
      const floorMat = new THREE.MeshStandardMaterial({ color: 0xb89a62, roughness: 0.95 });
      const floor = new THREE.Mesh(new THREE.BoxGeometry(LX + 0.6, 0.4, LZ + 0.6), floorMat); root.add(floor);
      const body = new THREE.Mesh(new THREE.BoxGeometry(LX, 1, LZ), new THREE.MeshStandardMaterial({ color: 0x1d6fb8, roughness: 0.15, transparent: true, opacity: 0.13, depthWrite: false })); root.add(body);
      const surfGeo = new THREE.PlaneGeometry(LX, LZ, 120, 10); surfGeo.rotateX(-Math.PI / 2);
      const surf = new THREE.Mesh(surfGeo, new THREE.MeshStandardMaterial({ color: 0x3aa0e8, roughness: 0.12, metalness: 0.1, transparent: true, opacity: 0.62, side: THREE.DoubleSide, depthWrite: false })); root.add(surf);
      const sp = surfGeo.attributes.position, sx = new Float32Array(sp.count); for (let i = 0; i < sp.count; i++) sx[i] = sp.getX(i);

      /* 입자: 궤도 6개 열 × 깊이 */
      const NXC = 7, NZ = 3, ND = 6;
      const parts = []; const pg = new THREE.SphereGeometry(0.075, 12, 9);
      const pm = new THREE.MeshStandardMaterial({ color: 0xffd166, roughness: 0.35, emissive: 0x7a5200, emissiveIntensity: 0.4 });
      const pmB = new THREE.MeshStandardMaterial({ color: 0xff6b6b, roughness: 0.35, emissive: 0x6b1010, emissiveIntensity: 0.5 });
      const im = new THREE.InstancedMesh(pg, pm, NXC * NZ * ND); im.frustumCulled = false; root.add(im);
      const imB = new THREE.InstancedMesh(new THREE.SphereGeometry(0.11, 14, 10), pmB, ND); imB.frustumCulled = false; root.add(imB);
      const orbG = new THREE.Group(); root.add(orbG);
      const dummy = new THREE.Object3D();
      let W = waveOf(st.T, H()), sc = 1, depthS = 2, yTop = 0.9;
      const labS = label('해수면', [LX / 2 - 0.3, 0.4, LZ / 2], { color: 'rgba(14,90,160,.9)', size: 11.5 });
      const labF = label('해저', [LX / 2 - 0.2, -2, LZ / 2], { color: 'rgba(120,85,30,.92)', size: 11.5 });

      function rebuild() {
        W = waveOf(st.T, H()); sc = LV / W.L;                                    // 장면 길이 / 실제 길이
        const hl = W.hl;
        depthS = Math.min(Math.max(hl, 0.04), 0.62) * LV * 1.0 + 0.0;            // 바닥 깊이(장면)
        depthS = Math.max(depthS, 0.45);
        floor.position.y = -depthS - 0.2; body.scale.y = depthS; body.position.y = -depthS / 2;
        labF.obj = [LX / 2 - 0.2, -depthS + 0.0, LZ / 2 + 0.3];
        /* 궤도 타원 */
        while (orbG.children.length) { const o = orbG.children.pop(); o.geometry.dispose(); }
        const kS = TAU / LV, a = Math.min(0.4, 0.7 * Math.tanh(W.k * H()));      // 표면 진폭(보기용)
        st.a = a;
        for (let d = 0; d < ND; d++) {
          const z = -d / (ND - 1) * depthS * 0.96;                                // 장면 깊이 (0 = 수면)
          const zr = z / sc;                                                      // 실제 깊이(음수)
          const ch = Math.cosh(W.k * (zr + H())) / Math.sinh(W.k * H()), sh = Math.sinh(W.k * (zr + H())) / Math.sinh(W.k * H());
          const ah = a * ch, av = a * sh;
          parts[d] = { z, ah, av };
          if (st.orb) {
            const pts = []; for (let i = 0; i < 48; i++) { const q = i / 48 * TAU; pts.push(new THREE.Vector3(ah * Math.cos(q), av * Math.sin(q), 0)); }
            const tg = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 48, 0.02, 5, true);
            [0].forEach(() => { const m = new THREE.Mesh(tg, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 })); m.position.set(-LX / 2 + LV * 0.5 + 1.6 * LV, z, 0); m.userData.d = d; orbG.add(m); });
          }
        }
        /* 궤도 고리는 가운데 한 곳(x0)에서만 보여요 */
        orbG.children.forEach((m) => { m.position.x = 0; m.position.z = LZ / 2 + 0.25; });
        classify();
      }
      function classify() {
        const c = cls(W.hl), nm = c === 'deep' ? '심해파' : c === 'shallow' ? '천해파' : '전이파';
        const cs = c === 'deep' ? 'c = gT/2π' : c === 'shallow' ? 'c = √(gh)' : '두 식의 중간';
        info('<b>' + nm + '</b> · 주기 ' + st.T + ' s, 수심 ' + H() + ' m<br>파장 λ ≈ ' + (W.L >= 100 ? Math.round(W.L) : W.L.toFixed(1)) + ' m · 파속 ≈ ' + W.c.toFixed(1) + ' m/s<br>h/λ = ' + (W.hl >= 1 ? W.hl.toFixed(1) : W.hl.toFixed(2)) + ' → ' + (c === 'deep' ? '입자가 <b>원</b>을 그려요' : c === 'shallow' ? '입자가 <b>납작한 타원</b>을 그려요 (바닥은 앞뒤로만)' : '타원이 점점 납작해져요') + '<br><span style="opacity:.85">' + cs + '</span>');
      }

      const rT = controls.range('주기 T', 4, 20, 1, st.T, (v) => { st.T = v; rebuild(); }, (v) => v + ' s');
      const rH = controls.range('수심 h', 0, HS.length - 1, 1, st.hi, (v) => { st.hi = v; rebuild(); }, (v) => HS[v] + ' m');
      const bo = controls.button('궤도 고리 ✓', () => { st.orb = !st.orb; bo.classList.toggle('on', st.orb); bo.textContent = '궤도 고리 ' + (st.orb ? '✓' : '✕'); rebuild(); }); bo.classList.add('on');

      function follow() {                                                         // 2D 단계에 맞춰 시작값 읽기
        const S = sr(); if (!S) return;
        const key = S.mode + '|' + S.T2 + '|' + S.h3 + '|' + S.h4;
        if (key === st.key) return; st.key = key;
        if (S.mode === 'deep') { st.T = S.T2; st.hi = HS.indexOf(4000); }
        else if (S.mode === 'shallow') { st.T = 20; st.hi = HS.indexOf(HS.reduce((b, v) => (Math.abs(v - S.h3) < Math.abs(b - S.h3) ? v : b), 4000)); if (S.h3 <= 100) st.T = 20; }
        else if (S.mode === 'trans') { st.T = 10; st.hi = HS.indexOf(HS.reduce((b, v) => (Math.abs(v - S.h4) < Math.abs(b - S.h4) ? v : b), 400)); }
        else return;
        if (S.mode === 'shallow') st.T = 20;
        rT.set(st.T); rH.set(st.hi); rebuild();
      }
      follow(); rebuild();

      const sx0 = LX / 2;
      return {
        update(dt) {
          follow();
          st.t += dt; const w = TAU / (st.T * 3), k = TAU / LV;                    // 보기 좋게 3배 느리게
          const a = st.a, ph = -w * st.t;
          for (let i = 0; i < sp.count; i++) { const x = sx[i]; sp.setY(i, a * Math.cos(k * x + ph)); }
          sp.needsUpdate = true; surfGeo.computeVertexNormals();
          let n = 0;
          for (let ix = 0; ix < NXC; ix++) for (let iz = 0; iz < NZ; iz++) for (let d = 0; d < ND; d++) {
            const x0 = -sx0 + 0.55 + ix * (LX - 1.1) / (NXC - 1), z0 = (iz - 1) * (LZ * 0.7 / 2), p = parts[d];
            const th = k * x0 + ph;
            dummy.position.set(x0 - p.ah * Math.sin(th), p.z + p.av * Math.cos(th), z0); dummy.updateMatrix(); im.setMatrixAt(n++, dummy.matrix);
          }
          im.instanceMatrix.needsUpdate = true;
          for (let d = 0; d < ND; d++) {                                         // 붉은 추적 입자 (궤도 고리 위)
            const p = parts[d], th = ph; dummy.position.set(-p.ah * Math.sin(th), p.z + p.av * Math.cos(th), LZ / 2 + 0.25); dummy.updateMatrix(); imB.setMatrixAt(d, dummy.matrix);
          }
          imB.instanceMatrix.needsUpdate = true;
        },
        sync() { st.key = null; follow(); },
      };
    },
  });
})();
