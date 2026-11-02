/* m2-breathing · 3D 호흡 기관 · 호흡 운동 · 폐포의 기체 교환
   들숨: 갈비뼈가 올라가고 가로막이 내려가요 → 가슴 속 부피↑ 압력↓ → 공기가 들어와요. 날숨은 반대예요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHN = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);

  window.SciSim3D.attach({
    title: '호흡계 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: PHN ? 14 : 10.5, theta: 0.35, phi: 1.3, min: 4, max: 24, target: [0, 0.4, 0] },
    autoRotate: 0,
    levels: [0, 2, 3],
    build(ctx) {
      const { THREE, root, label, info, controls, orbit } = ctx;
      const V3 = THREE.Vector3;
      const mat = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.55, metalness: 0.02 }, o || {}));
      const sm = () => window.__sim;
      const organ = new THREE.Group(), alv = new THREE.Group(); root.add(organ, alv);

      /* ================= 호흡 기관 ================= */
      // 폐 (오른쪽 · 왼쪽)
      const lungM = mat(0xf2a0b2, { transparent: true, opacity: 0.42, roughness: 0.4, depthWrite: false });
      const lungR = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 28), lungM), lungL = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 28), lungM);
      lungR.position.set(-1.45, 0.2, 0); lungL.position.set(1.45, 0.2, 0); lungR.renderOrder = lungL.renderOrder = 2;
      organ.add(lungR, lungL);
      // 기관 · 기관지 · 세기관지 (가지 뻗기)
      const airM = mat(0xd9e4f5, { roughness: 0.35, transparent: true, opacity: 0.95 });
      const paths = [];
      function tube(pts, r, m) { const c = new THREE.CatmullRomCurve3(pts); const me = new THREE.Mesh(new THREE.TubeGeometry(c, 24, r, 10, false), m || airM); me.castShadow = true; organ.add(me); return c; }
      const nose = new THREE.Mesh(new THREE.SphereGeometry(0.4, 20, 14), mat(0xf2c9a0)); nose.scale.set(0.8, 0.9, 1.3); nose.position.set(0, 3.55, 0.7); organ.add(nose);
      const trachea = tube([new V3(0, 3.5, 0.6), new V3(0, 3.0, 0.15), new V3(0, 2.0, 0), new V3(0, 1.4, 0)], 0.17);
      // 가는 가지(재귀)
      const tips = [];
      function branch(p, dir, len, r, depth, side) {
        const q = p.clone().addScaledVector(dir, len);
        const mid = p.clone().lerp(q, 0.5); mid.add(new V3(0.05 * side, -0.05, 0.05));
        tube([p, mid, q], r);
        if (depth <= 0) { tips.push(q); return; }
        const rot = (a, b) => { const d = dir.clone(); d.applyAxisAngle(new V3(0, 0, 1), a); d.applyAxisAngle(new V3(0, 1, 0), b); return d.normalize(); };
        branch(q, rot(0.55 * side + 0.3, 0.5), len * 0.72, r * 0.72, depth - 1, side);
        branch(q, rot(-0.35 * side + 0.3, -0.55), len * 0.7, r * 0.72, depth - 1, side);
      }
      [-1, 1].forEach((sd) => {
        const p0 = new V3(0, 1.4, 0), pe = new V3(sd * 0.7, 0.85, 0);
        tube([p0, new V3(sd * 0.3, 1.2, 0), pe], 0.12);
        branch(pe, new V3(sd * 0.55, -0.8, 0).normalize(), 0.75, 0.085, 3, sd);
      });
      // 끝에 폐포 송이
      const alvTipM = mat(0xff9bb0, { roughness: 0.4 });
      tips.forEach((t) => { for (let i = 0; i < 3; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), alvTipM); s.position.copy(t).add(new V3((i - 1) * 0.06, (i % 2) * 0.05, (i - 1) * 0.05)); organ.add(s); } });
      // 갈비뼈
      const ribs = new THREE.Group(); organ.add(ribs);
      const boneM = mat(0xe8dcc0, { roughness: 0.6 });
      for (let i = 0; i < 6; i++) {
        const y = 1.7 - i * 0.62, w = 2.55 - Math.abs(i - 2) * 0.12 - (i > 3 ? (i - 3) * 0.12 : 0), d = 1.25;
        const pts = []; for (let k = 0; k <= 24; k++) { const a = -Math.PI * 0.82 + k / 24 * Math.PI * 1.64; pts.push(new V3(Math.sin(a) * w, y - 0.12 * Math.cos(a) * 0 - (Math.abs(Math.sin(a)) * 0.22), Math.cos(a) * d * 0.9 - 0.1)); }
        const rb = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.07, 8, false), boneM); rb.castShadow = true; ribs.add(rb);
      }
      const ster = new THREE.Mesh(new THREE.BoxGeometry(0.28, 3.0, 0.1), boneM); ster.position.set(0, 0.5, 1.0); organ.add(ster);
      // 가로막 (돔)
      const dia = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 16, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xb5453f, { roughness: 0.6, side: THREE.DoubleSide, transparent: true, opacity: 0.92 }));
      dia.scale.set(2.5, 1, 1.25); organ.add(dia);
      // 공기 알갱이
      const NA = 70;
      const airI = new THREE.InstancedMesh(new THREE.SphereGeometry(0.06, 8, 6), new THREE.MeshBasicMaterial({ color: 0x9fe8ff }), NA); airI.frustumCulled = false; organ.add(airI);
      const flows = [];
      [[-1, 0], [1, 0]].forEach(([sd]) => { const pts = [new V3(0, 3.5, 0.6), new V3(0, 3.0, 0.15), new V3(0, 1.4, 0), new V3(sd * 0.7, 0.85, 0), new V3(sd * 1.1, 0.3, 0), new V3(sd * 1.5, -0.4, 0)]; flows.push(new THREE.CatmullRomCurve3(pts)); });
      const lOrg = [label('코', nose, { offset: [0, 0.5, 0] }), label('기관', [0, 2.4, 0.2]), label('기관지', [0.75, 1.15, 0.3]), label('폐', lungL, { offset: [0.2, 0.9, 0.9] }), label('가로막', dia, { offset: [0, -0.2, 1.1] }), label('갈비뼈', [-2.5, 0.9, 0.5])];

      /* ================= 폐포 ================= */
      const wallM = mat(0xffb0c0, { transparent: true, opacity: 0.28, roughness: 0.3, depthWrite: false, side: THREE.DoubleSide });
      const AP = [[0, 0.2, 0], [1.3, -0.5, 0.5], [-1.2, -0.6, 0.6], [0.2, -1.3, -0.9], [-0.1, 1.2, -0.9], [1.1, 0.9, -0.5]];
      const caps = [], alvS = [];
      alv.add(Object.assign(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new V3(0, 4.0, 0), new V3(0, 2.5, 0), new V3(0, 0.9, 0)]), 20, 0.2, 12), airM)));
      AP.forEach((p, i) => {
        const s = new THREE.Mesh(new THREE.SphereGeometry(0.72, 36, 24), wallM); s.position.set(...p); s.renderOrder = 2; alv.add(s); alvS.push(s);
        const k1 = new THREE.Mesh(new THREE.TorusKnotGeometry(0.76, 0.05, 120, 8, 3, 4), mat(0xff5a5a, { emissive: 0xaa1010, emissiveIntensity: 0.3, roughness: 0.35 }));
        const k2 = new THREE.Mesh(new THREE.TorusKnotGeometry(0.76, 0.05, 120, 8, 4, 3), mat(0x4a78ff, { emissive: 0x1a3ab0, emissiveIntensity: 0.3, roughness: 0.35 }));
        [k1, k2].forEach((k) => { k.position.set(...p); k.rotation.set(i, i * 2, i * 0.5); alv.add(k); });
      });
      // 모세 혈관 가지 (폐동맥쪽 파랑, 폐정맥쪽 빨강)
      alv.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new V3(-3.4, -2.2, 0.5), new V3(-2.2, -1.5, 0.6), new V3(-1.2, -0.6, 0.6)]), 20, 0.1, 8), mat(0x4a78ff, { emissive: 0x1a3ab0, emissiveIntensity: 0.3 })));
      alv.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new V3(1.3, -0.5, 0.5), new V3(2.4, -1.2, 0.4), new V3(3.4, -2.2, 0.2)]), 20, 0.1, 8), mat(0xff5a5a, { emissive: 0xaa1010, emissiveIntensity: 0.3 })));
      // 기체 알갱이: 산소(→ 혈액), 이산화 탄소(→ 폐포)
      const NG = AP.length * 5;
      const gO = new THREE.InstancedMesh(new THREE.SphereGeometry(0.075, 10, 8), new THREE.MeshBasicMaterial({ color: 0xbff4ff }), NG);
      const gC = new THREE.InstancedMesh(new THREE.SphereGeometry(0.075, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffa24a }), NG);
      gO.frustumCulled = gC.frustumCulled = false; alv.add(gO, gC);
      const lAlv = [label('폐포', alvS[1], { offset: [0, 0.95, 0] }), label('모세 혈관', alvS[2], { offset: [-0.2, -1.0, 0.2] }), label('산소 (O₂)', [2.7, 1.4, 0.3], { color: 'rgba(30,140,170,.95)' }), label('이산화 탄소 (CO₂)', [-2.9, 1.4, 0.3], { color: 'rgba(190,100,20,.95)' }), label('기관지', [0.9, 3.0, 0])];
      alv.visible = false;

      /* ================= 조작 ================= */
      let mode = 'organ', breath = 'auto', rate = 0.5, vol = 0.5, volT = 0.5, T = 0.75, labs = true;
      function txt() {
        if (mode === 'alv') info('폐포 속 <b>산소</b>는 폐포 → <b>모세 혈관</b>으로, 혈액 속 <b>이산화 탄소</b>는 모세 혈관 → 폐포로 <b>확산</b>돼요.');
        else {
          const ph = vol > 0.5 ? '들숨' : '날숨';
          info(breath === 'auto' ? '<b>숨 쉬는 중!</b> 가로막이 내려가고 갈비뼈가 올라가면 <b>들숨</b>, 반대면 <b>날숨</b>이에요.' : breath === 'in' ? '<b>들숨</b>: 갈비뼈↑ 가로막↓ → 가슴 속 부피↑ 압력↓ → 공기가 폐로 들어와요.' : '<b>날숨</b>: 갈비뼈↓ 가로막↑ → 가슴 속 부피↓ 압력↑ → 공기가 폐에서 나가요.');
        }
      }
      function apply() {
        organ.visible = mode === 'organ'; alv.visible = mode === 'alv';
        lOrg.forEach((l) => l.show(labs && mode === 'organ')); lAlv.forEach((l) => l.show(labs && mode === 'alv'));
        orbit.tx = 0; orbit.ty = mode === 'organ' ? 0.4 : -0.3; orbit.dist = mode === 'organ' ? (PHN ? 14 : 10.5) : (PHN ? 14 : 10.5);
        txt();
      }
      const sg = controls.segment('보기', [{ label: '호흡 기관', value: 'organ' }, { label: '폐포 확대', value: 'alv' }], mode, (v) => { mode = v; apply(); });
      controls.segment('호흡', [{ label: '자동', value: 'auto' }, { label: '들숨', value: 'in' }, { label: '날숨', value: 'out' }], breath, (v) => { breath = v; txt(); });
      controls.button('이름표', () => { labs = !labs; apply(); });
      apply();
      const dm = new THREE.Object3D(); let k0 = 0, lastSc = '';
      function readScene() { const s = sm() && sm().S && sm().S.scene; if (!s || s === lastSc) return; lastSc = s; const m = s === 'alveoli' ? 'alv' : 'organ'; if (m !== mode) { mode = m; sg.set(m); apply(); } if (s === 'chest' && breath === 'out') { /* 그대로 */ } }
      return {
        sync() { lastSc = ''; readScene(); },
        update(dt, t) {
          if ((k0++ % 15) === 0) readScene();
          if (breath === 'auto') { T += dt * rate; volT = 0.5 - 0.5 * Math.cos((T % 1) * Math.PI * 2); }
          else volT = breath === 'in' ? 1 : 0;
          vol += (volT - vol) * Math.min(1, dt * 6);
          if (mode === 'organ') {
            const s = 1 + 0.16 * vol;
            lungR.scale.set(1.05 * s, 1.85 * (1 + 0.12 * vol), 1.0 * s); lungL.scale.set(1.0 * s, 1.75 * (1 + 0.12 * vol), 0.95 * s);
            ribs.scale.set(1 + 0.07 * vol, 1, 1 + 0.07 * vol); ribs.position.y = 0.16 * vol; ster.position.z = 1.0 + 0.1 * vol; ster.position.y = 0.5 + 0.12 * vol;
            dia.scale.set(2.45, 1.05 - 0.75 * vol, 1.25); dia.position.y = -1.55 - 0.45 * vol;
            lungR.position.y = lungL.position.y = 0.2 - 0.05 * vol;
            // 공기 알갱이: 부피가 커질 때 들어가요
            for (let i = 0; i < NA; i++) {
              const br = i % 2, off = (i / NA * 2 + (i * 0.37) % 0.3) % 1, u = (off + 0.9 * vol) % 1;
              flows[br].getPoint(u * 0.98, dm.position); dm.position.x += Math.sin(i * 12.3) * 0.05; dm.position.z += Math.cos(i * 7.7) * 0.05;
              dm.scale.setScalar(0.9 + 0.2 * Math.sin(i)); dm.updateMatrix(); airI.setMatrixAt(i, dm.matrix);
            }
            airI.instanceMatrix.needsUpdate = true;
            if (breath === 'auto' && (k0 % 20) === 0) txt();
          } else {
            alvS.forEach((s, i) => s.scale.setScalar(0.95 + 0.1 * vol));
            // 확산: 산소는 폐포 가운데 → 모세 혈관, 이산화 탄소는 반대로
            for (let i = 0; i < NG; i++) {
              const a = i % AP.length, c = AP[a], ph = ((t * 0.35 + i * 0.173) % 1);
              const ang = i * 2.399 + a, dir = new V3(Math.sin(ang * 1.3) * Math.cos(ang), Math.sin(ang * 0.9 + 1), Math.sin(ang * 1.3) * Math.sin(ang)).normalize();
              const inOut = ph < 0.5 ? ph / 0.5 : 1 - (ph - 0.5) / 0.5;           // 0(가운데) → 1(벽 바깥) → 0
              const r = 0.1 + 0.7 * ph;
              dm.position.set(c[0] + dir.x * r * 0.9, c[1] + dir.y * r * 0.9, c[2] + dir.z * r * 0.9); dm.scale.setScalar(1); dm.updateMatrix(); gO.setMatrixAt(i, dm.matrix);
              const r2 = 0.95 - 0.8 * ph; const d2 = dir.clone().multiplyScalar(-1).applyAxisAngle(new V3(0, 1, 0), 1.1);
              dm.position.set(c[0] + d2.x * r2, c[1] + d2.y * r2, c[2] + d2.z * r2); dm.updateMatrix(); gC.setMatrixAt(i, dm.matrix);
            }
            gO.instanceMatrix.needsUpdate = gC.instanceMatrix.needsUpdate = true;
          }
        },
      };
    },
  });
})();
