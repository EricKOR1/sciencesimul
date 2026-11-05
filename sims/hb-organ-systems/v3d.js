/* hb-organ-systems · 3D 사람 몸과 기관계의 통합적 작용
   소화계 · 순환계 · 호흡계 · 배설계를 몸속 위치대로 입체로 보고, 2D 차시와 같은 운동 강도(0 안정 ~ 100 달리기)에 따라
   심박수 70→150회/분 · 호흡수 14→35회/분 · 체온 37.0→38.5 °C · 땀 · 오줌 생성이 함께 바뀌는 것을 확인해요. 2D의 강도 슬라이더와 양방향으로 맞물려요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const narrow = window.innerWidth < 600 || window.innerHeight > window.innerWidth * 1.1;

  window.SciSim3D.attach({
    title: '사람 몸의 기관계 3D',
    hint: '기관계를 골라 보고 운동 강도를 바꿔 봐요',
    camera: { dist: narrow ? 15 : 12.5, theta: 0.35, phi: 1.4, min: 6, max: 22, target: [0, 0.6, 0] },
    autoRotate: 0.12,
    levels: [],   // 모든 단계에 캔버스 조작이 필요해요(측정표 ▲▼ · 산소 운반 표 읽기 · 연결선 잇기 · 사례 글 읽기). 그래서 2D로 해요
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const V = THREE.Vector3, V3 = (x, y, z) => new V(x, y, z || 0);
      const std = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.5, metalness: 0.02 }, o || {}));
      const sph = (r, m, x, y, z, sx, sy, sz) => { const o = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 22), m); o.position.set(x || 0, y || 0, z || 0); if (sx) o.scale.set(sx, sy, sz); return o; };
      const tubeM = (pts, r, m, seg) => new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), seg || 60, r, 10), m);
      const SYS = { dig: [], cir: [], res: [], exc: [] }, SM = { dig: [], cir: [], res: [], exc: [] };
      function reg(sys, mesh) { SYS[sys].push(mesh); if (SM[sys].indexOf(mesh.material) < 0) SM[sys].push(mesh.material); return mesh; }

      /* 몸 윤곽 */
      const bodyM = std(0x9fc4ff, { transparent: true, opacity: 0.11, depthWrite: false, roughness: 0.2, side: THREE.DoubleSide });
      const torso = new THREE.Mesh(new THREE.CapsuleGeometry(1.5, 3.6, 10, 32), bodyM); torso.scale.z = 0.62; torso.position.y = 0.0; root.add(torso);
      root.add(sph(0.88, bodyM, 0, 4.55, 0), new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 0.7, 20), bodyM));
      root.children[root.children.length - 1].position.y = 3.65;
      [-1, 1].forEach((s) => { const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.34, 3.0, 6, 16), bodyM); arm.position.set(s * 2.05, 0.9, 0); arm.rotation.z = s * 0.12; root.add(arm); });

      /* 호흡계 */
      const lungM = std(0xf08aa3, { roughness: 0.55 }), lungs = [];
      [-1, 1].forEach((s) => { const l = reg('res', sph(1, lungM, s * 0.78, 1.55, 0.05, 0.62, 1.05, 0.5)); l.rotation.z = s * 0.1; root.add(l); lungs.push(l); });
      const airM = std(0xd9e6f2, { roughness: 0.4 });
      reg('res', tubeM([V3(0, 3.7, 0.05), V3(0, 2.6, 0.05), V3(0, 2.2, 0.05)], 0.14, airM, 20));
      [-1, 1].forEach((s) => reg('res', tubeM([V3(0, 2.25, 0.05), V3(s * 0.3, 2.05, 0.05), V3(s * 0.62, 1.55, 0.05)], 0.08, airM, 20)));
      SYS.res.slice(-3).forEach((m) => root.add(m));

      /* 소화계 */
      const dg = new THREE.Group(); dg.position.set(0, -0.95, -0.12); dg.scale.setScalar(0.7); root.add(dg);
      function varTube(pts, segs, rf, rad) {
        rad = rad || 20; const curve = new THREE.CatmullRomCurve3(pts), fr = curve.computeFrenetFrames(segs, false), pos = [], idx = [];
        for (let i = 0; i <= segs; i++) { const t = i / segs, P = curve.getPointAt(t), N = fr.normals[i], B = fr.binormals[i], r = rf(t); for (let j = 0; j <= rad; j++) { const a = j / rad * Math.PI * 2, c = Math.cos(a) * r, s = Math.sin(a) * r; pos.push(P.x + c * N.x + s * B.x, P.y + c * N.y + s * B.y, P.z + c * N.z + s * B.z); } }
        for (let i = 0; i < segs; i++) for (let j = 0; j < rad; j++) { const a = i * (rad + 1) + j, b = a + rad + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
        const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
      }
      const eso = reg('dig', tubeM([V3(-0.1, 5.7), V3(-0.1, 4.0), V3(0.2, 2.3), V3(0.5, 1.75)], 0.17, std(0xd9776e), 40)); dg.add(eso);
      const stM = std(0xe8918a, { roughness: 0.42 });
      const stomach = reg('dig', new THREE.Mesh(varTube([V3(-0.5, 2.1), V3(-0.7, 1.3), V3(-0.35, 0.2), V3(0.45, -0.85), V3(1.5, -1.2), V3(2.5, -0.8)], 60, (t) => 0.2 + 0.85 * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.1)), 0.7) * (t < 0.55 ? 1 : 1 - (t - 0.55) * 0.9)), stM));
      stomach.scale.setScalar(0.5); stomach.position.set(0.3, 1.9, 0); stomach.rotation.z = -0.2; dg.add(stomach);
      const liver = reg('dig', sph(1, std(0x9c4f36, { roughness: 0.4 }), -0.9, 1.6, 0, 1.55, 0.65, 0.75)); liver.rotation.z = 0.2; dg.add(liver);
      dg.add(reg('dig', sph(0.2, std(0x4caf50), -0.15, 1.1, 0.5, 1, 1.4, 1)));
      const pts = [], N = 6;
      for (let r = 0; r < N; r++) { const y = 0.4 - r * 0.42, d = r % 2 ? -1 : 1; for (let k = 0; k <= 4; k++) { const x = d * (-1.0 + k * 0.5); pts.push(V3(x, y + Math.sin(k * 1.7 + r) * 0.07, Math.sin(k + r * 2) * 0.16)); } }
      const smInt = reg('dig', new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 220, 0.15, 12), std(0xf2b79a, { roughness: 0.45 }))); dg.add(smInt);
      const lgInt = reg('dig', tubeM([V3(-1.5, -1.9), V3(-1.62, -0.6), V3(-1.6, 0.8), V3(-0.8, 1.05), V3(0.8, 1.05), V3(1.6, 0.8), V3(1.62, -0.6), V3(1.5, -1.9), V3(0.9, -2.3), V3(0.1, -2.5), V3(0, -3.1)], 0.26, std(0xc98f6b, { roughness: 0.55 }), 120)); dg.add(lgInt);
      // 흡수된 영양소가 소장 곁에서 반짝여요
      const nutM = std(0xffd34d, { emissive: 0xffb300, emissiveIntensity: 0.6 });
      const NN = 14, nut = new THREE.InstancedMesh(new THREE.SphereGeometry(0.06, 10, 8), nutM, NN); dg.add(nut);

      /* 배설계 */
      const kM = std(0x8e2b3b, { roughness: 0.45 }), ureM = std(0xe6c35a, { roughness: 0.5 });
      [-1, 1].forEach((s) => {
        const k = reg('exc', sph(1, kM, s * 0.82, -0.2, -0.38, 0.27, 0.5, 0.25)); k.rotation.z = -s * 0.25; root.add(k);
        root.add(reg('exc', tubeM([V3(s * 0.7, -0.35, -0.35), V3(s * 0.62, -1.2, -0.3), V3(s * 0.28, -2.55, -0.1)], 0.045, ureM, 30)));
      });
      const bladder = reg('exc', sph(0.36, std(0xf0dc8a, { roughness: 0.4 }), 0, -2.8, -0.05)); root.add(bladder);

      /* 순환계 : 심장 + 혈관 + 적혈구 */
      const heartM = std(0xd7263d, { roughness: 0.38 });
      const heart = reg('cir', sph(0.62, heartM, 0.22, 0.95, 0.38, 1, 1.15, 0.9)); heart.rotation.z = -0.35; root.add(heart);
      const artM = std(0xe5483f, { roughness: 0.4 }), venM = std(0x5b6fd1, { roughness: 0.4 });
      const artery = new THREE.CatmullRomCurve3([V3(0.1, 1.25, 0.3), V3(0.0, 2.2, 0.2), V3(-0.4, 2.3, 0.1), V3(-0.6, 1.2, -0.05), V3(-0.62, -0.5, -0.1), V3(-0.55, -2.0, -0.05), V3(-0.3, -3.0, 0)]);
      const vein = new THREE.CatmullRomCurve3([V3(0.3, -3.0, 0), V3(0.65, -2.0, -0.05), V3(0.7, -0.5, -0.1), V3(0.62, 0.8, 0.05), V3(0.45, 1.1, 0.3)]);
      const pulA = new THREE.CatmullRomCurve3([V3(0.3, 1.1, 0.4), V3(-0.3, 1.5, 0.45), V3(-0.78, 1.6, 0.35)]), pulB = new THREE.CatmullRomCurve3([V3(0.3, 1.1, 0.4), V3(0.5, 1.6, 0.45), V3(0.9, 1.7, 0.35)]);
      [[artery, artM, 0.075], [vein, venM, 0.085], [pulA, venM, 0.05], [pulB, venM, 0.05]].forEach((c) => root.add(reg('cir', new THREE.Mesh(new THREE.TubeGeometry(c[0], 60, c[2], 10), c[1]))));
      // 팔 쪽 순환 가지
      [-1, 1].forEach((s) => { const a = new THREE.CatmullRomCurve3([V3(s * 0.3, 2.1, 0.1), V3(s * 1.6, 1.9, 0.05), V3(s * 2.0, 0.6, 0), V3(s * 2.05, -0.4, 0)]); root.add(reg('cir', new THREE.Mesh(new THREE.TubeGeometry(a, 40, 0.05, 8), s < 0 ? artM : venM))); });
      const NB = 52, rbcM = std(0xff5a4d, { roughness: 0.35, emissive: 0x551008, emissiveIntensity: 0.4 });
      const rbc = reg('cir', new THREE.InstancedMesh(new THREE.SphereGeometry(0.075, 12, 8), rbcM, NB)); root.add(rbc);
      const rbcV = reg('cir', new THREE.InstancedMesh(new THREE.SphereGeometry(0.075, 12, 8), std(0x7f4fb0, { roughness: 0.35 }), NB)); root.add(rbcV);

      /* 이름표 */
      const LB = {
        res: label('폐', lungs[1], { offset: [0.5, 0.8, 0.4] }), tra: label('기관', null, { offset: [0, 3.0, 0.2] }),
        cir: label('심장', heart, { offset: [0.2, -0.25, 0.7] }), art: label('동맥', null, { offset: [-0.7, -1.3, 0.1] }), ven: label('정맥', null, { offset: [0.75, -1.3, 0.1] }),
        sto: label('위', stomach, { offset: [0.6, 0, 0.4] }), liv: label('간', liver, { offset: [-1.0, 0.1, 0.5] }), sm: label('소장', smInt, { offset: [0, -0.1, 0.5] }), lg: label('대장', lgInt, { offset: [-1.2, -1.0, 0.3] }),
        kid: label('콩팥', null, { offset: [1.2, -0.2, -0.35] }), bla: label('방광', bladder, { offset: [0.55, -0.05, 0.1] }), ure: label('오줌관', null, { offset: [-0.65, -1.5, -0.3] }),
      };
      const LSET = { all: ['res', 'cir', 'sm', 'kid'], dig: ['sto', 'liv', 'sm', 'lg'], cir: ['cir', 'art', 'ven'], res: ['res', 'tra'], exc: ['kid', 'bla', 'ure'] };

      let mode = 'all', ex = 0, phH = 0, phB = 0, bpm = 70, bpr = 14, lastTxt = '';
      const INFO = {
        all: '소화·순환·호흡·배설계가 서로 연결되어 함께 일해요.<br>달리기 강도를 올려 보세요.',
        dig: '<b>소화계</b>: 음식물을 분해하고 영양소를 흡수해 순환계로 보내요.',
        cir: '<b>순환계</b>: 심장이 혈액을 보내 영양소·산소·이산화 탄소·노폐물을 운반해요.',
        res: '<b>호흡계</b>: 폐에서 산소를 얻고 이산화 탄소를 내보내요.',
        exc: '<b>배설계</b>: 콩팥이 혈액 속 노폐물을 걸러 오줌으로 내보내요.',
      };
      function setMode(m) {
        mode = m;
        Object.keys(SYS).forEach((k) => { const on = m === 'all' || m === k; SM[k].forEach((mt) => { mt.transparent = !on; mt.opacity = on ? 1 : 0.1; mt.depthWrite = on; mt.needsUpdate = true; }); });
        Object.keys(LB).forEach((k) => LB[k].show(LSET[m].indexOf(k) >= 0));
        lastTxt = '';
      }
      controls.segment('', [{ label: '전체', value: 'all' }, { label: '소화계', value: 'dig' }, { label: '순환계', value: 'cir' }, { label: '호흡계', value: 'res' }, { label: '배설계', value: 'exc' }], 'all', setMode);
      const L2 = () => window.__sim || null;
      let plGuard = false;
      const rI = controls.range('달리기 강도', 0, 100, 1, 0, (v) => { const L = L2(); if (L) L.setInt(v); ex = v / 100; }, (v) => v + ' % ' + (v < 20 ? '(안정)' : v >= 90 ? '(달리기)' : ''));
      /* ▶ 안정 → 달리기 → 회복 : 강도를 한 주기 동안 0 → 100 → 0으로 바꿔 줘요 (2D 슬라이더도 함께 움직여요) */
      const pl = controls.player({
        duration: 12, loop: true, autoplay: false, label: '안정 → 달리기',
        phases: [[0, '안정'], [0.12, '달리기 시작'], [0.4, '달리는 중'], [0.7, '회복']],
        onFrame(p) { const L = L2(); if (!L || plGuard) return; const I = p < 0.12 ? 0 : p < 0.4 ? 100 * (p - 0.12) / 0.28 : p < 0.7 ? 100 : 100 * (1 - (p - 0.7) / 0.3); L.setInt(Math.round(I)); },
      });
      setMode('all');

      const D = new THREE.Object3D(), tmp = new V();
      const tgt = { bpm: 70, bpr: 14 };
      return {
        update(dt, t) {
          const L = L2(), R = L && L.S.run;
          if (R) { ex = R.I / 100; if (Math.abs(rI.value - R.I) > 0.5) rI.set(R.I); bpm = R.hr; bpr = R.rr; }
          else { tgt.bpm = 70 + 80 * ex; tgt.bpr = 14 + 21 * ex; bpm += (tgt.bpm - bpm) * Math.min(1, dt * 2.5); bpr += (tgt.bpr - bpr) * Math.min(1, dt * 2.5); }
          const slow = 0.45;
          phH += dt * slow * bpm / 60 * Math.PI * 2; phB += dt * slow * bpr / 60 * Math.PI * 2;
          const beat = Math.pow(Math.max(0, Math.sin(phH)), 6), br = 0.5 + 0.5 * Math.sin(phB);
          heart.scale.set(1 + beat * 0.16, 1.15 + beat * 0.18, 0.9 + beat * 0.14);
          heartM.emissive.set(0x7a0a18); heartM.emissiveIntensity = beat * 0.7;
          lungs.forEach((l, i) => l.scale.set(0.62 + br * 0.09, 1.05 + br * 0.1, 0.5 + br * 0.09));
          // 적혈구 흐름
          const sp = slow * bpm / 60 * 0.28;
          for (let i = 0; i < NB; i++) {
            const u = (i / NB + t * sp) % 1;
            let cur = artery; let k = u;
            if (i % 4 === 3) { cur = i % 8 === 3 ? pulA : pulB; k = (u * 2) % 1; }
            cur.getPointAt(k, tmp); D.position.copy(tmp); D.scale.setScalar(1); D.updateMatrix(); rbc.setMatrixAt(i, D.matrix);
            vein.getPointAt((u * 1.0 + 0.37) % 1, tmp); D.position.copy(tmp); D.updateMatrix(); rbcV.setMatrixAt(i, D.matrix);
          }
          rbc.instanceMatrix.needsUpdate = true; rbcV.instanceMatrix.needsUpdate = true;
          // 영양소 반짝임
          for (let i = 0; i < NN; i++) { const a = (i / NN + t * 0.08) % 1; D.position.set(-1.0 + a * 2.0, 0.4 - (i % 6) * 0.42 + 0.18, 0.2 + Math.sin(t * 3 + i) * 0.05); D.scale.setScalar(0.6 + 0.4 * Math.sin(t * 4 + i * 2)); D.updateMatrix(); nut.setMatrixAt(i, D.matrix); }
          nut.instanceMatrix.needsUpdate = true;
          // 이름표 위치 (동맥·정맥 등 점 위치)
          LB.tra.obj = [0, 3.0, 0.2]; LB.art.obj = [-0.62, -1.3, 0.1]; LB.ven.obj = [0.7, -1.3, 0.1]; LB.kid.obj = [0.82, -0.2, -0.38]; LB.ure.obj = [-0.45, -1.4, -0.25];
          LB.art.off = [0, 0, 0]; LB.ven.off = [0, 0, 0]; LB.tra.off = [0, 0, 0]; LB.kid.off = [0.6, 0, 0]; LB.ure.off = [0, 0, 0];
          const SW = (s) => (s < 0.1 ? '거의 없음' : s < 0.6 ? '조금 나요' : '많이 나요'), UR = (u) => (u > 0.9 ? '보통' : u > 0.6 ? '조금 줄어듦' : '적음');
          const tp = R ? R.temp.toFixed(1) : (37 + 1.5 * ex).toFixed(1), sw = R ? SW(R.sweat) : SW(ex), ur = R ? UR(R.urine) : UR(1 - 0.6 * ex);
          const txt = mode + '|' + Math.round(bpm) + '|' + Math.round(bpr) + '|' + tp + sw + ur;
          if (txt !== lastTxt) { lastTxt = txt; info(INFO[mode] + '<br>강도 ' + Math.round(ex * 100) + ' % · 심박수 ' + Math.round(bpm) + '회/분 · 호흡수 ' + Math.round(bpr) + '회/분 · 체온 ' + tp + ' °C<br>땀 ' + sw + ' · 오줌 생성량 ' + ur); }
        },
        sync() {},
      };
    },
  });
})();
