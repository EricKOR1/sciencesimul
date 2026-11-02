/* h1-enzyme · 3D 효소와 기질 (열쇠-자물쇠 모형)
   기질이 딱 맞는 활성 부위에 결합하면 생성물로 바뀌고, 효소는 변하지 않고 다시 쓰여요.
   온도가 너무 높으면 효소 모양이 변해(변성) 활성 부위가 맞지 않고, 모양이 다른 기질은 결합하지 못해요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHN = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const PX = 1.2, DR = 0.5; // 활성 부위 위치/반지름
  const CA = [PX + 0.05, 0.42, 0], CB = [PX + 0.05, -0.42, 0];
  const CAD = [PX + 0.0, 0.85, 0.15], CBD = [PX - 0.1, -0.2, 0.75]; // 변성된 활성 부위

  window.SciSim3D.attach({
    title: '효소와 기질 3D',
    camera: { dist: PHN ? 13 : 9.5, theta: 0.8, phi: 1.32, target: [1.1, 0, 0], min: 4, max: 20 },
    levels: [2],
    autoRotate: 0,
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const std = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.4, metalness: 0.05 }, o || {}));
      let mode = 'ok', T0 = 0;
      function enzymeGeo(denat) {
        const g = new THREE.SphereGeometry(1.7, 96, 64), pos = g.attributes.position, v = new THREE.Vector3();
        const centers = (denat ? [CAD, CBD] : [CA, CB]).map((c) => new THREE.Vector3(...c));
        for (let i = 0; i < pos.count; i++) {
          v.fromBufferAttribute(pos, i);
          { const nn = Math.sin(v.x * 2.3 + v.z * 1.7) * Math.cos(v.y * 2.9 - v.x) * 0.09 + Math.sin(v.z * 4.1 + v.y * 3.3) * 0.035; v.multiplyScalar(1 + nn); }
          if (denat) { // 변성: 울퉁불퉁하게 일그러짐
            const n = Math.sin(v.x * 3.1 + v.y * 2.3) * Math.cos(v.z * 2.7 + v.x) * 0.16 + Math.sin(v.y * 5 + v.z * 4) * 0.05;
            v.multiplyScalar(1 + n); v.x *= 1.1; v.y *= 0.92;
          }
          centers.forEach((c) => { const d = v.distanceTo(c); if (d < DR) v.copy(c).add(v.clone().sub(c).normalize().multiplyScalar(DR)); });
          pos.setXYZ(i, v.x, v.y, v.z);
        }
        g.computeVertexNormals(); return g;
      }
      const gOK = enzymeGeo(false), gDN = enzymeGeo(true);
      const enz = new THREE.Mesh(gOK, std(0x2fb8a6, { roughness: 0.35, emissive: 0x0b4a42, emissiveIntensity: 0.4 })); root.add(enz);
      const lE = label('효소', [-0.6, 1.8, 0], { color: 'rgba(20,120,110,.92)' });
      const lAS = label('활성 부위', enz, { offset: [PX + 0.6, 1.25, 0.2], size: 12 });
      // 기질 (두 조각이 이어진 분자)
      const sub = new THREE.Group(); root.add(sub);
      const sA = new THREE.Mesh(new THREE.SphereGeometry(0.42, 32, 24), std(0xff9f43, { roughness: 0.3 })), sB = new THREE.Mesh(new THREE.SphereGeometry(0.42, 32, 24), std(0x6fd36b, { roughness: 0.3 }));
      sA.position.set(0, 0.42, 0); sB.position.set(0, -0.42, 0); sub.add(sA, sB);
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.6, 12), std(0xe8e8e8)); sub.add(neck);
      const lS = label('기질', sub, { offset: [0.0, 1.05, 0], color: 'rgba(200,110,20,.92)' });
      const lP = label('생성물', sub, { offset: [0, 1.4, 0], color: 'rgba(30,140,60,.92)' }); lP.show(false);
      // 다른 모양 기질
      const alt = new THREE.Mesh(new THREE.OctahedronGeometry(0.7, 0), std(0xff6bd6, { roughness: 0.3 })); root.add(alt);
      const heat = []; for (let i = 0; i < 10; i++) { const h = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.025, 8, 20), new THREE.MeshBasicMaterial({ color: 0xff7a3c })); root.add(h); heat.push(h); }
      const sm = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
      const lerp = (a, b, k) => a + (b - a) * k;
      const msg = { ok: '<b>정상 효소</b>: 기질이 활성 부위에 딱 맞게 결합해 생성물로 나뉘어요. 효소는 그대로라 계속 반응시켜요.', hot: '<b>온도가 너무 높아요</b>: 효소의 입체 구조가 변해(변성) 활성 부위가 기질과 맞지 않아요. 반응이 잘 안 일어나요.', other: '<b>모양이 다른 기질</b>: 활성 부위에 맞지 않아 결합하지 못해요. 효소는 자기에게 맞는 기질에만 작용해요(기질 특이성).' };
      function setMode(m) {
        mode = m; T0 = 0; enz.geometry = m === 'hot' ? gDN : gOK; enz.material.color.setHex(m === 'hot' ? 0x9aa6a2 : 0x2fb8a6); enz.material.emissive.setHex(m === 'hot' ? 0x2a1208 : 0x0b4a42);
        alt.visible = m === 'other'; sub.visible = m !== 'other'; lS.obj = m === 'other' ? alt : sub; lAS.show(m !== 'hot'); heat.forEach((h) => { h.visible = m === 'hot'; });
        info(msg[m]); seg.set(m);
      }
      const seg = controls.segment('상황', [{ value: 'ok', label: '정상 반응' }, { value: 'hot', label: '온도가 높을 때' }, { value: 'other', label: '다른 기질' }], mode, setMode);
      setMode('ok');
      const Q = new THREE.Vector3();
      return {
        update(dt, t) {
          T0 += dt; const P = 9, tt = T0 % P;
          if (mode === 'ok') {
            const approach = sm(0.4, 2.4, tt), bind = sm(2.4, 3.1, tt), split = sm(4.0, 6.2, tt);
            // 기질: 오른쪽 위에서 비스듬히 다가와 활성 부위에 들어감
            const sx = lerp(5.2, PX + 0.05, approach), sy = lerp(1.8, 0, approach) + Math.sin(tt * 2) * 0.05 * (1 - approach), sz = lerp(0.9, 0, approach);
            sub.position.set(sx, sy, sz); sub.rotation.set(0, 0, lerp(1.2, 0, approach) * (1 - bind));
            const sc = 1 + 0.02 * bind * (1 - split); enz.scale.setScalar(sc);
            // 분해: 두 조각이 따로 떨어져 나가요
            sA.position.set(0, 0.42 + split * 1.6, split * 0.9); sB.position.set(split * 0.5, -0.42 - split * 1.3, -split * 0.6); neck.visible = split < 0.02; neck.scale.y = 1;
            sA.material.color.setHex(split > 0.3 ? 0xffc766 : 0xff9f43); lS.show(tt < 3.4); lP.show(tt > 5.0 && tt < 8.5); lP.obj = [PX + 2, 2, 0.5];
            sub.visible = tt < 8.0 || true; const fade = 1 - sm(7.2, 8.6, tt); sA.scale.setScalar(fade); sB.scale.setScalar(fade);
            if (tt < 0.05) { sA.scale.setScalar(1); sB.scale.setScalar(1); }
          } else if (mode === 'hot') {
            const a = (tt < 4.4 ? sm(0.3, 2.2, tt) : 1 - sm(4.4, 7.0, tt));
            sub.position.set(lerp(5.2, PX + 1.0, a), lerp(1.8, 0.2, a) + Math.sin(t * 9) * 0.04, lerp(0.9, 0.3, a)); sub.rotation.z = Math.sin(t * 3) * 0.4; sA.position.set(0, 0.42, 0); sB.position.set(0, -0.42, 0); neck.visible = true; sA.scale.setScalar(1); sB.scale.setScalar(1);
            enz.scale.setScalar(1 + Math.sin(t * 14) * 0.01); lS.show(true); lP.show(false);
            heat.forEach((h, i) => { const a2 = i / heat.length * 6.283 + t * 1.5; h.position.set(Math.cos(a2) * 2.2 + 0.1, Math.sin(a2 * 1.3) * 1.7, Math.sin(a2) * 1.2); h.lookAt(Q.set(0, 0, 0)); h.scale.setScalar(1 + Math.sin(t * 6 + i) * 0.3); });
          } else {
            const a = (tt < 4.4 ? sm(0.3, 2.2, tt) : 1 - sm(4.4, 7.0, tt));
            alt.position.set(lerp(5.4, PX + 0.95, a), lerp(1.8, 0.0, a) + Math.sin(t * 2) * 0.04, lerp(0.9, 0.2, a)); alt.rotation.set(t * 0.8, t * 0.6, 0); enz.scale.setScalar(1); lS.show(true); lP.show(false);
          }
        },
        sync() {},
      };
    },
  });
})();
