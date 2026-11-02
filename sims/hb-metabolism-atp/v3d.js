/* hb-metabolism-atp · 3D ATP 분자 모형
   아데닌 + 리보스 + 인산 3개로 이루어진 ATP, 끝 인산이 떨어질 때 에너지가 나오고(ADP + Pi), 세포 호흡의 에너지로 다시 ATP가 만들어져요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const narrow = window.innerWidth < 600 || window.innerHeight > window.innerWidth * 1.1;

  window.SciSim3D.attach({
    title: 'ATP 분자 3D 모형',
    hint: '드래그: 돌리기 · 슬라이더로 끝 인산을 떼어 봐요',
    camera: { dist: narrow ? 10.2 : 8.4, theta: 0.3, phi: 0.92, min: 5, max: 20 },
    autoRotate: 0.18,
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const std = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.42, metalness: 0.04 }, o || {}));
      const mol = new THREE.Group(); mol.position.x = -0.7; root.add(mol);

      /* 평면 고리 (납작한 입체) */
      function ring(shapes, color, depth) {
        const g = new THREE.ExtrudeGeometry(shapes, { depth, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.05, bevelSegments: 4, curveSegments: 16 });
        const m = new THREE.Mesh(g, std(color, { roughness: 0.38 })); m.rotation.x = -Math.PI / 2; m.position.y = -depth / 2; return m;
      }
      const r = 0.55, hex = new THREE.Shape();
      for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + k * Math.PI / 3; k ? hex.lineTo(r * Math.cos(a), r * Math.sin(a)) : hex.moveTo(r * Math.cos(a), r * Math.sin(a)); }
      hex.closePath();
      const pent = new THREE.Shape(), cx = 0.866 * r + 0.688 * r;
      for (let k = 0; k < 5; k++) { const a = (144 + 72 * k) * Math.PI / 180, x = cx + 0.851 * r * Math.cos(a), y = 0.851 * r * Math.sin(a); k ? pent.lineTo(x, y) : pent.moveTo(x, y); }
      pent.closePath();
      const adenine = new THREE.Group(); adenine.add(ring(hex, 0x2f6fe0, 0.22), ring(pent, 0x4a88f0, 0.22)); adenine.position.set(-4.4, 0, 0); mol.add(adenine);
      const rb = new THREE.Shape(), R = 0.62;
      for (let k = 0; k < 5; k++) { const a = (90 + 72 * k) * Math.PI / 180, x = R * Math.cos(a), y = R * Math.sin(a); k ? rb.lineTo(x, y) : rb.moveTo(x, y); }
      rb.closePath();
      const ribose = ring(rb, 0x1f9d55, 0.22); ribose.position.x = -1.95; mol.add(ribose);

      function bar(x0, x1, col, r0, wavy) {
        const pts = [];
        for (let i = 0; i <= 24; i++) { const t = i / 24; pts.push(new THREE.Vector3(x0 + (x1 - x0) * t, 0, wavy ? Math.sin(t * Math.PI * 4) * 0.13 : 0)); }
        const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, r0, 10, false), std(col, wavy ? { emissive: 0xffa800, emissiveIntensity: 0.55, roughness: 0.3 } : { roughness: 0.5 }));
        return m;
      }
      mol.add(bar(-3.1, -2.4, 0xcfd8e8, 0.07), bar(-1.4, -0.9, 0xcfd8e8, 0.07));

      /* 인산 3개 */
      function phosphate(x) {
        const g = new THREE.Group(); g.position.x = x;
        const p = new THREE.Mesh(new THREE.SphereGeometry(0.52, 36, 24), std(0xff8a3d, { roughness: 0.35 })); g.add(p);
        const oM = std(0xe5483f, { roughness: 0.4 });
        [[0.46, 0.2, 0.15], [-0.36, 0.3, 0.3], [0.0, -0.1, 0.55], [0.1, 0.45, -0.3]].forEach((q) => {
          const o = new THREE.Mesh(new THREE.SphereGeometry(0.17, 18, 12), oM); o.position.set(q[0], q[1], q[2]).normalize().multiplyScalar(0.62); g.add(o);
        });
        return g;
      }
      const P1 = phosphate(-0.35), P2 = phosphate(1.4), P3 = phosphate(3.15);
      mol.add(P1, P2, P3);
      const hi1 = bar(0.17, 0.88, 0xffd34d, 0.065, true), hi2g = new THREE.Group(), hi2 = bar(0, 1, 0xffd34d, 0.065, true);
      hi2g.add(hi2); hi2g.position.x = 1.92; mol.add(hi1, hi2g);

      /* 에너지 알갱이 */
      const NS = 28, sparkM = std(0xffd34d, { emissive: 0xffc933, emissiveIntensity: 0.9, roughness: 0.3 });
      const sparks = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.1, 1), sparkM, NS); mol.add(sparks);
      const sp = Array.from({ length: NS }, () => ({ life: 0, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0 }));
      const dummy = new THREE.Object3D();
      let sparkMode = 0, sparkAcc = 0;
      function spawn(x, mode) {
        const s = sp.find((q) => q.life <= 0); if (!s) return;
        const a = Math.random() * Math.PI * 2, b = (Math.random() - 0.3) * 1.4, v = 1.2 + Math.random() * 1.2;
        s.life = 1; s.x = x; s.y = 0.2; s.z = 0;
        if (mode > 0) { s.vx = Math.cos(a) * v; s.vy = 0.8 + Math.random() * 1.4; s.vz = Math.sin(a) * v * 0.6 + b * 0.3; }
        else { s.x = x + Math.cos(a) * 2.4; s.y = 1.8 + Math.random(); s.z = Math.sin(a) * 1.6; s.vx = (x - s.x) * 0.9; s.vy = (0.2 - s.y) * 0.9; s.vz = -s.z * 0.9; }
      }

      /* 이름표 */
      const L = {
        ade: label('아데닌', adenine, { offset: [0.4, 0.5, 0.6] }),
        rib: label('리보스', ribose, { offset: [0, 0.5, 0.75] }),
        p1: label('인산', P1, { offset: [0, 0.8, 0] }),
        p2: label('인산', P2, { offset: [0, 0.8, 0] }),
        p3: label('인산', P3, { offset: [0, 0.8, 0] }),
        bond: label('고에너지 인산 결합', hi2g, { offset: [0.3, -0.45, 0.6], color: 'rgba(255,170,0,.92)' }),
        name: label('ATP', mol, { offset: [-0.2, 2.3, 0], size: 18, color: 'rgba(49,130,246,.92)' }),
      };
      L.bond.el.style.color = '#1b2333';

      let sep = 0, dir = 0, auto = false, hold = 0;
      const rng = controls.range('끝 인산 분리', 0, 1, 0.01, 0, (v) => { sep = v; auto = false; autoBtn.classList.remove('on'); hold = 0; }, (v) => (v < 0.05 ? 'ATP' : v > 0.95 ? 'ADP + Pi' : Math.round(v * 100) + '%'));
      const autoBtn = controls.button('▶ ATP ⇄ ADP 순환', () => { auto = !auto; autoBtn.classList.toggle('on', auto); dir = 0; if (auto && sep > 0.95) dir = -1; else if (auto) dir = 1; });
      controls.button('이름표 숨김/보임', () => { const on = !L.ade.visible; ['ade', 'rib', 'p1', 'p2', 'bond'].forEach((k) => L[k].show(on)); });

      function setInfo() {
        if (sep < 0.06) info('<b>ATP</b>: 아데닌 + 리보스 + 인산 3개예요.<br>끝쪽 인산 결합에 에너지가 저장돼 있어요.');
        else if (sep > 0.94) info('<b>ADP + Pi</b>: 끝 인산이 떨어지며 에너지가 나와 생명 활동에 쓰여요.');
        else if (dir < 0) info('세포 호흡의 에너지로 ADP에 인산이 붙어 <b>ATP 합성</b>(에너지 저장)');
        else info('<b>ATP 가수 분해</b>: 인산이 떨어지며 에너지가 방출돼요.');
      }
      setInfo();
      let lastTxt = '';
      return {
        update(dt, t) {
          if (auto) {
            if (hold > 0) hold -= dt;
            else {
              sep += dir * dt * 0.38;
              if (sep >= 1) { sep = 1; dir = -1; hold = 1.6; }
              if (sep <= 0) { sep = 0; dir = 1; hold = 1.2; }
              rng.set(sep);
            }
          }
          const e = sep * sep * (3 - 2 * sep);
          P3.position.set(3.15 + e * 2.3, e * 1.5 + Math.sin(t * 2) * 0.05 * e, e * 0.7);
          P3.rotation.y = e * 1.2;
          hi2g.scale.x = Math.max(0.001, 1 - e * 1.4); hi2g.visible = e < 0.7;
          hi2.visible = true;
          // 에너지 알갱이
          const releasing = (auto ? dir > 0 : false) && hold <= 0 && sep > 0.05 && sep < 0.95;
          const absorbing = (auto ? dir < 0 : false) && hold <= 0 && sep > 0.05 && sep < 0.95;
          if (releasing || absorbing) {
            sparkAcc += dt * 14;
            sparkM.color.set(absorbing ? 0x6ee0a0 : 0xffd34d); sparkM.emissive.set(absorbing ? 0x2fd08a : 0xffc933);
            sparkMode = absorbing ? -1 : 1;
            while (sparkAcc > 1) { sparkAcc -= 1; spawn(P3.position.x - 0.8, sparkMode); }
          }
          sp.forEach((s, i) => {
            if (s.life > 0) {
              s.life -= dt * 0.8; s.x += s.vx * dt; s.y += s.vy * dt; s.z += s.vz * dt;
              if (sparkMode > 0) s.vy -= dt * 0.8;
              dummy.position.set(s.x, s.y, s.z); dummy.scale.setScalar(Math.max(0.01, s.life));
            } else { dummy.position.set(0, -50, 0); dummy.scale.setScalar(0.001); }
            dummy.updateMatrix(); sparks.setMatrixAt(i, dummy.matrix);
          });
          sparks.instanceMatrix.needsUpdate = true;
          L.p3.el.textContent = sep > 0.5 ? '떨어진 인산(Pi)' : '인산';
          L.name.set(sep < 0.06 ? 'ATP' : sep > 0.94 ? 'ADP + Pi' : 'ATP ⇄ ADP + Pi');
          L.p3.show(true);
          const k = sep < 0.06 ? 0 : sep > 0.94 ? 2 : dir < 0 ? 3 : 1;
          if (k !== lastTxt) { lastTxt = k; setInfo(); }
        },
        sync() {},
      };
    },
  });
})();
