/* hb-digest-enzyme · 3D 효소와 기질 (열쇠-자물쇠 모형)
   2D 차시의 소화제(아밀레이스·프로테이스·라이페이스)와 녹말·단백질(흰자)·지방(우유), 온도(0·37·60 °C)·pH(2·7·11) 조건과 같은 값으로 맞춰요.
   소화 효소는 활성 부위 모양이 맞는 기질에만 작용하고(기질 특이성), 온도가 너무 높으면 단백질인 효소의 모양이 변해 작용하지 못해요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const narrow = window.innerWidth < 600 || window.innerHeight > window.innerWidth * 1.1;
  const ENZ = [
    { name: '아밀레이스', color: 0x2a62d8, shape: 'sphere' },
    { name: '프로테이스', color: 0x8a3fc8, shape: 'cube' },
    { name: '라이페이스', color: 0x12907a, shape: 'cone' },
  ];
  const SUB = [
    { name: '녹말', color: 0xf2b84a, prod: 0xc9e07a, shape: 'sphere', pn: '엿당' },
    { name: '단백질', color: 0xe76a5a, prod: 0xf6a58f, shape: 'cube', pn: '아미노산' },
    { name: '지방', color: 0xf0d84a, prod: 0xf6efa0, shape: 'cone', pn: '지방산·모노글리세리드' },
  ];

  window.SciSim3D.attach({
    title: '소화 효소 3D 모형 (열쇠-자물쇠)',
    hint: '효소와 기질을 바꿔 보고, 온도(0~60 °C)·pH(2~11)를 바꿔 봐요 · 2D의 선택도 따라가요',
    camera: { dist: narrow ? 13 : 10.2, theta: 0.5, phi: 1.2, min: 5, max: 20, target: [0.7, 0.5, 0] },
    autoRotate: 0.12,
    levels: [2],
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const V = THREE.Vector3;
      const std = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.4, metalness: 0.03 }, o || {}));
      const R = 1.55, C = new V(1, 0.9, 0).normalize(), PHI0 = 0.66, DEP = 0.62;

      /* 효소 : 공 한쪽에 기질 모양의 홈(활성 부위)을 파요 */
      const eGeo = new THREE.SphereGeometry(1, 72, 48), base = Float32Array.from(eGeo.attributes.position.array);
      const eMat = std(ENZ[0].color, { roughness: 0.32, emissive: 0x000000 });
      const enzyme = new THREE.Mesh(eGeo, eMat); root.add(enzyme);
      function shapeEnzyme(kind, den) {
        const p = eGeo.attributes.position, u = new V();
        for (let i = 0; i < p.count; i++) {
          u.set(base[i * 3], base[i * 3 + 1], base[i * 3 + 2]).normalize();
          const ph = Math.acos(Math.min(1, u.dot(C))) / PHI0; let d = 0;
          if (ph < 1) d = kind === 'sphere' ? Math.sqrt(1 - ph * ph) : kind === 'cube' ? 1 - Math.pow(ph, 6) : 1 - ph;
          d *= DEP * (1 - den * 0.92);
          const lump = den * (0.2 * Math.sin(u.x * 5 + 1) * Math.sin(u.y * 4) + 0.12 * Math.sin(u.z * 7 + u.x * 3));
          const rr = R - d + lump + den * (ph < 1.5 ? 0.12 : 0);
          p.setXYZ(i, u.x * rr, u.y * rr, u.z * rr);
        }
        p.needsUpdate = true; eGeo.computeVertexNormals();
      }
      /* 기질 한 단위 */
      function unitGeo(shape) {
        if (shape === 'sphere') return new THREE.SphereGeometry(0.42, 28, 20);
        if (shape === 'cube') return new THREE.BoxGeometry(0.66, 0.66, 0.66, 2, 2, 2);
        return new THREE.ConeGeometry(0.46, 0.85, 28);
      }
      const dimer = new THREE.Group(), uA = new THREE.Mesh(unitGeo('sphere'), std(0xffffff)), uB = new THREE.Mesh(unitGeo('sphere'), std(0xffffff));
      const bond = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1, 10), std(0xdfe6f3));
      dimer.add(uA, uB, bond); root.add(dimer);
      const water = new THREE.Mesh(new THREE.SphereGeometry(0.14, 14, 10), std(0x5ab8ff, { emissive: 0x2a7ac8, emissiveIntensity: 0.5 })); root.add(water);

      const lE = label('효소', enzyme, { offset: [-0.2, 2.0, 0] });
      const lS = label('기질', uB, { offset: [0, 0.8, 0] });
      const lH = label('활성 부위', enzyme, { offset: [1.5, 1.35, 0.9], color: 'rgba(255,170,0,.92)' }); lH.el.style.color = '#1b2333';
      const lP = label('분해 산물', uA, { offset: [0, 0.8, 0] }); lP.show(false);
      const lT = label('', enzyme, { offset: [0, -2.2, 0], color: 'rgba(40,50,80,.9)' });

      let ei = 0, si = 0, temp = 37, den = 0, count = 0, clock = 0, lastKey = '', denShown = -1;
      function applySub() {
        const s = SUB[si];
        [uA, uB].forEach((m) => { m.geometry.dispose(); m.geometry = unitGeo(s.shape); m.material.color.set(s.color); m.rotation.set(0, 0, 0); });
        uA.rotation.z = s.shape === 'cone' ? -Math.PI / 2 - 0.0 : 0; uB.rotation.z = uA.rotation.z;
        lS.set(s.name + ' (기질)');
      }
      function applyEnz() { eMat.color.set(ENZ[ei].color); lE.set(ENZ[ei].name); denShown = -1; }
      const segE0 = null;
      const segE2 = controls.segment('효소', ENZ.map((e, i) => ({ label: e.name, value: i })), 0, (v) => { ei = v; applyEnz(); restart(); });
      const segS = controls.segment('기질', SUB.map((s, i) => ({ label: s.name, value: i })), 0, (v) => { si = v; applySub(); restart(); });
      const rT = controls.range('온도', 0, 60, 1, 37, (v) => { temp = v; }, (v) => v + ' °C');
      const rP = controls.range('pH', 2, 11, 1, 7, (v) => { pHv = v; }, (v) => 'pH ' + v);
      let pHv = 7;
      const NUT = ['starch', 'egg', 'milk'], CT = [0, 37, 60], CP = [2, 7, 11];
      let seen = { nut: null, tk: null, ts: -2, ps: -2 };
      function follow2D() { // 2D 차시의 선택을 따라가요 (기질·온도·pH)
        const L = window.__sim; if (!L) return;
        const S2 = L.S, ni = NUT.indexOf(S2.lab.nut);
        if (ni >= 0 && seen.nut !== S2.lab.nut) { seen.nut = S2.lab.nut; si = ni; ei = ni; applySub(); applyEnz(); segE2.set(ei); segS.set(si); restart(); }
        const sel = S2.cond.sel;
        if (sel.temp !== seen.ts) { seen.ts = sel.temp; if (sel.temp >= 0) { temp = CT[sel.temp]; rT.set(temp); } }
        if (sel.ph !== seen.ps) { seen.ps = sel.ph; if (sel.ph >= 0) { pHv = CP[sel.ph]; rP.set(pHv); } }
      }
      function restart() { clock = 0; }

      function ease(x) { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); }
      const far = C.clone().multiplyScalar(3.7).add(new V(0.9, 0.7, 1.1));
      const hover = C.clone().multiplyScalar(R + 1.15);
      const dock = C.clone().multiplyScalar(R - 0.02);
      const lerpV = (a, b, t) => a.clone().lerp(b, t);
      let pulse = 0;
      const CYC = 6.4;
      shapeEnzyme(ENZ[0].shape, 0); applySub(); applyEnz();

      return {
        update(dt, t) {
          follow2D();
          const hot = Math.max(0, (temp - 37) / 43), cold = temp < 37 ? 1 - temp / 37 : 0;
          den = Math.max(0, Math.min(1, (temp - 44) / 20)); den = den * den * (3 - 2 * den);
          const phf = Math.max(0.3, 1 - Math.abs(pHv - 7) / 5 * 0.7);
          const sp = (temp < 37 ? 0.2 + 0.8 * (1 - cold * cold) : 1 + hot * 0.6) * phf;
          const before = clock; clock += dt * sp;
          const cyc = Math.floor(clock / CYC), ph = (clock % CYC);
          if (Math.abs(den - denShown) > 0.01) { shapeEnzyme(ENZ[ei].shape, den); denShown = den; eMat.color.set(ENZ[ei].color).lerp(new THREE.Color(0x5a5f6b), den); }
          const match = ei === si && den < 0.55;
          const s = SUB[si];
          let pA, pB, prodA = false, prodB = false, showWater = false;
          const dir = C;
          const perp = new V(0, 0, 1);
          if (ph < 2.0) { // 다가오기
            const k = ease(ph / 2.0); pA = lerpV(far, hover, k); pB = pA.clone().add(dir.clone().multiplyScalar(0.95));
          } else if (ph < 3.2) {
            if (match) { const k = ease((ph - 2.0) / 1.2); pA = lerpV(hover, dock, k); pB = pA.clone().add(dir.clone().multiplyScalar(0.95)); }
            else { const k = ease((ph - 2.0) / 1.2), w = Math.sin((ph - 2.0) * 22) * 0.07 * (1 - k); pA = lerpV(hover, far, k * 0.35).add(new V(w, 0, w)); pB = pA.clone().add(dir.clone().multiplyScalar(0.95)); }
          } else if (ph < 4.2) {
            if (match) { // 결합 끊기
              const k = ease((ph - 3.2) / 1.0); pA = dock.clone(); pB = dock.clone().add(dir.clone().multiplyScalar(0.95 + k * 0.9)).add(perp.clone().multiplyScalar(k * 0.5)); prodA = k > 0.3; prodB = k > 0.3; showWater = k < 0.6;
              pulse = 1 - Math.abs(k - 0.4) * 1.5;
            } else { const k = ease((ph - 3.2) / 1.0); pA = lerpV(lerpV(hover, far, 0.35), far, k); pB = pA.clone().add(dir.clone().multiplyScalar(0.95)); }
          } else if (ph < 5.6) {
            if (match) { const k = ease((ph - 4.2) / 1.4); pA = lerpV(dock, dock.clone().add(new V(-0.6, 2.8, -1.8)), k); pB = lerpV(dock.clone().add(dir.clone().multiplyScalar(1.85)).add(perp.clone().multiplyScalar(0.5)), far.clone().add(new V(1.2, 1.2, 1.8)), k); prodA = prodB = true; }
            else { pA = far.clone(); pB = pA.clone().add(dir.clone().multiplyScalar(0.95)); }
          } else { pA = far.clone(); pB = pA.clone().add(dir.clone().multiplyScalar(0.95)); }
          // 분해 횟수 (한 주기에 한 번)
          if (match && Math.floor((before - 0.0) / CYC) === cyc && before % CYC < 3.8 && ph >= 3.8) count++;
          uA.position.copy(pA); uB.position.copy(pB);
          if (s.shape === 'cone') { uA.quaternion.setFromUnitVectors(new V(0, 1, 0), dir.clone().multiplyScalar(-1)); uB.quaternion.setFromUnitVectors(new V(0, 1, 0), dir.clone().multiplyScalar(-1)); }
          else { uA.rotation.set(0.3, t * (match && ph > 2 && ph < 4.2 ? 0 : 0.5), 0.2); uB.rotation.copy(uA.rotation); }
          uA.material.color.set(prodA ? s.prod : s.color); uB.material.color.set(prodB ? s.prod : s.color);
          const bd = pB.clone().sub(pA), L = bd.length();
          bond.visible = !(prodA && prodB && (ph >= 3.5)); bond.scale.set(1, Math.max(0.01, L), 1);
          bond.position.copy(pA).add(pB).multiplyScalar(0.5); bond.quaternion.setFromUnitVectors(new V(0, 1, 0), bd.normalize());
          water.visible = showWater; water.position.copy(dock).add(dir.clone().multiplyScalar(0.55)).add(new V(0.3, 0.25, 0.4));
          // 효소 반짝
          pulse = Math.max(0, pulse - dt * 1.4);
          eMat.emissive.set(match ? 0xfff0a0 : 0x000000); eMat.emissiveIntensity = match ? pulse * 0.5 : 0;
          const prodNow = prodA && prodB && match;
          lP.show(prodNow); lP.obj = uA; lS.show(!prodNow); lH.show(den < 0.5);
          lS.obj = uB;
          // 효소 떨림 (뜨거울수록)
          enzyme.position.set(Math.sin(t * 40) * 0.01 * (1 + hot * 3), Math.cos(t * 37) * 0.01 * (1 + hot * 3), 0);
          const key = ei + '|' + si + '|' + (den > 0.55 ? 'd' : temp < 15 ? 'c' : 'n') + '|' + (pHv === 7 ? 'p' : pHv < 7 ? 'a' : 'b') + '|' + count;
          if (key !== lastKey) {
            lastKey = key;
            let l1 = ei === si ? '<b>' + ENZ[ei].name + '</b>의 활성 부위와 <b>' + s.name + '</b>의 모양이 맞아요.' : '모양이 맞지 않아 <b>' + SUB[si].name + '</b>은 분해되지 않아요.';
            let l2 = pHv !== 7 && den <= 0.55 ? 'pH ' + pHv + '는 최적 pH(7)에서 멀어 효소의 활성이 낮아요.' : den > 0.55 ? '높은 온도에서 효소의 모양이 변해 작용하지 못해요 (변성).' : temp < 15 ? '온도가 낮아 반응이 느려요.' : ei === si ? '분해 산물: ' + s.pn + ' (분해 ' + count + '번)' : '효소는 한 가지 기질에만 작용해요(기질 특이성).';
            info(l1 + '<br>' + l2);
            lT.set(den > 0.55 ? '변성된 효소' : ei === si ? (temp > 30 && temp < 42 ? '최적 온도 부근' : '') : '');
            lT.show(den > 0.55 || (ei === si && temp > 30 && temp < 42));
          }
        },
        sync() {},
      };
    },
  });
})();
