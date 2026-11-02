/* m2-circuit · 3D 전기 회로 (전지 · 스위치 · 전구 · 도선)
   스위치를 닫으면 도선 속 전자가 (−)극에서 (+)극 쪽으로 흐르고, 전류의 방향은 그 반대(+극에서 −극)로 약속해요.
   전지의 전압(V)이 클수록 전류가 세고 전구가 더 밝아요. 2D 실험의 스위치·전압을 따라가요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHN = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);

  window.SciSim3D.attach({
    title: '전기 회로 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: PHN ? 13.5 : 12, theta: 0.3, phi: 1.0, min: 6, max: 24, target: [0, 0, 0] },
    autoRotate: 0,
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const V3 = THREE.Vector3;
      const sm = () => window.__sim;
      const mat = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.5, metalness: 0.1 }, o || {}));
      const board = new THREE.Mesh(new THREE.BoxGeometry(11.6, 0.3, 7.4), mat(0x26324f, { roughness: 0.85, metalness: 0 })); board.position.y = -0.2; board.receiveShadow = true; root.add(board);

      /* ----- 도선 경로 (전류 방향: 전지 (+) → 전구 → 스위치 → 전지 (−)) ----- */
      const HX = 4.6, HZ = 2.5, Y = 0.55, RC = 0.7;
      const pts = [];
      function arc(cx, cz, a0) { for (let k = 0; k <= 5; k++) { const a = a0 + k / 5 * Math.PI / 2; pts.push(new V3(cx + Math.cos(a) * RC, Y, cz + Math.sin(a) * RC)); } }
      function line(x0, z0, x1, z1) { const n = Math.max(2, Math.ceil(Math.hypot(x1 - x0, z1 - z0) / 0.5)); for (let k = 1; k < n; k++) pts.push(new V3(x0 + (x1 - x0) * k / n, Y, z0 + (z1 - z0) * k / n)); }
      // 뒤쪽 줄(−z) 왼→오, 오른쪽 줄(+x) 뒤→앞, 앞쪽 줄(+z) 오→왼, 왼쪽 줄(−x) 앞→뒤
      pts.push(new V3(-HX + RC, Y, -HZ));
      line(-HX + RC, -HZ, HX - RC, -HZ);
      arc(HX - RC, -HZ + RC, -Math.PI / 2);
      line(HX, -HZ + RC, HX, HZ - RC);
      arc(HX - RC, HZ - RC, 0);
      line(HX - RC, HZ, -HX + RC, HZ);
      arc(-HX + RC, HZ - RC, Math.PI / 2);
      line(-HX, HZ - RC, -HX, -HZ + RC);
      arc(-HX + RC, -HZ + RC, Math.PI);
      const curve = new THREE.CatmullRomCurve3(pts, true, 'centripetal');
      const wire = new THREE.Mesh(new THREE.TubeGeometry(curve, 400, 0.07, 10, true), mat(0xe39a45, { metalness: 0.5, roughness: 0.35 })); wire.castShadow = true; root.add(wire);

      /* ----- 전지 (뒤쪽 줄 왼쪽) ----- */
      const batt = new THREE.Group(); batt.position.set(-2.6, 0.55, -HZ); root.add(batt);
      const cell = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 2.6, 36), mat(0x2f6df6, { roughness: 0.35, metalness: 0.3 })); cell.rotation.z = Math.PI / 2; cell.castShadow = true; batt.add(cell);
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.64, 0.64, 0.5, 36), mat(0xffd34d, { roughness: 0.3, metalness: 0.4 })); band.rotation.z = Math.PI / 2; band.position.x = -0.9; batt.add(band);
      const capP = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.3, 20), mat(0xdfe6f2, { metalness: 0.9, roughness: 0.2 })); capP.rotation.z = Math.PI / 2; capP.position.x = 1.4; batt.add(capP);
      const mkTxt = (t, col) => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); g.fillStyle = col; g.font = '900 54px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(t, 32, 36); const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthTest: false })); s.scale.setScalar(0.7); s.renderOrder = 10; return s; };
      const plus = mkTxt('+', '#ff6a6a'), minus = mkTxt('−', '#9fb8ff'); plus.position.set(1.0, 0.95, 0); minus.position.set(-1.0, 0.95, 0); batt.add(plus, minus);
      // 전지의 (+)는 오른쪽, (−)는 왼쪽: 전류는 (+)에서 시작 → 뒤쪽 줄을 따라 전구로

      /* ----- 전구 (오른쪽, 뒤쪽 줄) ----- */
      const bulb = new THREE.Group(); bulb.position.set(2.2, 0.55, -HZ); root.add(bulb);
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.45, 0.5, 24), mat(0xb7bcc7, { metalness: 0.9, roughness: 0.3 })); base.position.y = 0.2; bulb.add(base);
      const glass = new THREE.Mesh(new THREE.SphereGeometry(0.85, 36, 24), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.28, roughness: 0.05, metalness: 0, depthWrite: false, emissive: 0xffd34d, emissiveIntensity: 0 })); glass.position.y = 1.2; glass.renderOrder = 3; bulb.add(glass);
      const fil = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.03, 8, 20, Math.PI * 1.7), new THREE.MeshStandardMaterial({ color: 0xffb347, emissive: 0xff8a00, emissiveIntensity: 0.2 })); fil.position.y = 1.15; bulb.add(fil);
      const glow = new THREE.PointLight(0xffd980, 0, 9, 2); glow.position.set(0, 1.2, 0); bulb.add(glow);
      const halo = new THREE.Mesh(new THREE.SphereGeometry(1.6, 24, 16), new THREE.MeshBasicMaterial({ color: 0xffe08a, transparent: true, opacity: 0, depthWrite: false })); halo.position.y = 1.2; bulb.add(halo);

      /* ----- 스위치 (앞쪽 줄 가운데) ----- */
      const sw = new THREE.Group(); sw.position.set(0, Y, HZ); root.add(sw);
      const swBase = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.3, 0.9), mat(0x56627e, { roughness: 0.6 })); swBase.position.y = -0.2; sw.add(swBase);
      const hinge = new THREE.Group(); hinge.position.set(-0.8, 0.05, 0); sw.add(hinge);
      const lever = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.1, 0.22), mat(0xc9ced8, { metalness: 0.9, roughness: 0.25 })); lever.position.x = 0.85; hinge.add(lever);
      const knobS = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), mat(0xe2464b, { roughness: 0.4 })); knobS.position.set(1.7, 0.12, 0); hinge.add(knobS);
      [-0.8, 0.8].forEach((x) => { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.2, 16), mat(0xdfe6f2, { metalness: 0.9, roughness: 0.2 })); p.position.set(x, 0.0, 0); sw.add(p); });
      // 스위치가 열려 있을 때는 도선이 끊긴 것처럼 보이도록 가운데 구간을 가리는 판은 쓰지 않고 레버로만 표현

      /* ----- 전자 · 전류 화살표 ----- */
      const NE = 64;
      const eInst = new THREE.InstancedMesh(new THREE.SphereGeometry(0.1, 12, 8), new THREE.MeshStandardMaterial({ color: 0x3f78ff, emissive: 0x2a4fd0, emissiveIntensity: 0.9, roughness: 0.3 }), NE); eInst.frustumCulled = false; root.add(eInst);
      const NI = 12;
      const iInst = new THREE.InstancedMesh(new THREE.ConeGeometry(0.17, 0.46, 14), new THREE.MeshBasicMaterial({ color: 0xff7a6a }), NI); iInst.frustumCulled = false; root.add(iInst);
      const LB = [label('전지', batt, { offset: [0, 1.2, 0] }), label('전구', bulb, { offset: [0, 2.6, 0] }), label('스위치', sw, { offset: [0, 0.8, 0.2] })];
      const lE = label('전자의 이동 방향', [-HX, 0.8, 0], { color: 'rgba(40,80,200,.95)' }), lI = label('전류의 방향', [HX, 0.8, 0], { color: 'rgba(200,70,60,.95)' });

      let showE = true, showI = true, uPh = 0, lastInfo = '', glowV = 0, swA = 0, labs = true;
      function inf(closed, V) {
        const I = (V / 10).toFixed(2);
        const k = (closed ? 'c' : 'o') + V.toFixed(1);
        if (k === lastInfo) return; lastInfo = k;
        info(closed ? `<b>닫힌 회로</b>: 전자(파랑)가 <b>(−)극 → (+)극</b> 쪽으로 흘러요.<br>전류의 방향은 반대로 <b>(+)극 → (−)극</b>이에요.<br>전지 ${V.toFixed(1)} V → 전구 ${V > 4.2 ? '아주 밝아요' : V > 2.4 ? '밝아요' : '어두워요'}` : '<b>열린 회로</b>: 스위치가 열려 있어서 전자가 이어지지 않아 <b>전류가 흐르지 않아요</b>. 전구도 꺼져 있어요.');
      }
      controls.button('🔌 스위치 열기/닫기', () => { const s = sm(); if (s) s.setClosed(!s.S.closed); });
      const vr = controls.range('전지 전압', 0.5, 6, 0.5, 3, (v) => { const s = sm(); if (s) s.setV(v); }, (v) => v.toFixed(1) + ' V');
      controls.button('전자 보기', () => { showE = !showE; });
      controls.button('전류 방향 보기', () => { showI = !showI; });
      controls.button('이름표', () => { labs = !labs; LB.forEach((l) => l.show(labs)); lE.show(labs); lI.show(labs); });
      const dm = new THREE.Object3D(), p = new V3(), tg = new V3(), upv = new V3(0, 1, 0);
      let lastV = -1;
      return {
        update(dt, t) {
          const s = sm() && sm().S; const closed = s ? !!s.closed : false, V = s ? s.V : 3;
          if (V !== lastV) { lastV = V; vr.set(V); }
          const I = closed ? V / 10 : 0;
          swA += ((closed ? 0 : 0.8) - swA) * Math.min(1, dt * 10); hinge.rotation.z = swA;
          const target = closed ? Math.pow(V / 6, 1.2) : 0; glowV += (target - glowV) * Math.min(1, dt * 5);
          glass.material.emissiveIntensity = glowV * 1.6; fil.material.emissiveIntensity = 0.2 + glowV * 3; glow.intensity = glowV * 18; halo.material.opacity = glowV * 0.22;
          uPh = (uPh + dt * I * 0.55) % 1;
          // 전자는 전류의 반대 방향으로 이동 (곡선 매개변수가 전류 방향)
          for (let i = 0; i < NE; i++) {
            const u = ((i / NE - uPh) % 1 + 1) % 1; curve.getPointAt(u, p); p.y += Math.sin(i * 7) * 0.02;
            dm.position.copy(p); dm.scale.setScalar(closed && showE ? 1 : 0.001); dm.updateMatrix(); eInst.setMatrixAt(i, dm.matrix);
          }
          for (let i = 0; i < NI; i++) {
            const u = (i / NI + uPh) % 1; curve.getPointAt(u, p); curve.getTangentAt(u, tg); p.y += 0.28;
            dm.position.copy(p); dm.quaternion.setFromUnitVectors(upv, tg); dm.scale.setScalar(closed && showI ? 1 : 0.001); dm.updateMatrix(); iInst.setMatrixAt(i, dm.matrix);
          }
          eInst.instanceMatrix.needsUpdate = true; iInst.instanceMatrix.needsUpdate = true; dm.quaternion.identity();
          inf(closed, V);
        },
      };
    },
  });
})();
