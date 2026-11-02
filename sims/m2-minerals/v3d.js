/* m2-minerals · 3D 광물 표본 (결정 모양 · 겉보기 색 · 조흔색 · 자성)
   금 · 황동석 · 황철석 · 석영 · 방해석 · 자철석을 돌려 보며 생김새를 살펴봐요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHN = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const KEYS = ['gold', 'chalco', 'pyrite', 'quartz', 'calcite', 'magnetite'];
  const NM = { gold: '금', chalco: '황동석', pyrite: '황철석', quartz: '석영', calcite: '방해석', magnetite: '자철석' };
  const COLOR = { gold: '노란색', chalco: '노란색', pyrite: '노란색', quartz: '투명한 흰색', calcite: '투명한 흰색', magnetite: '검은색' };
  const STREAK = { gold: ['노란색', '#e8b800'], chalco: ['녹흑색', '#25382c'], pyrite: ['검은색', '#2a2a30'], quartz: ['흰색', '#f1f1ec'], calcite: ['흰색', '#f1efe6'], magnetite: ['검은색', '#2a2a30'] };
  const NOTE = {
    gold: '불규칙한 덩어리예요. 조흔색도 노란색이에요.',
    chalco: '놋쇠 같은 노란색이에요. 조흔색은 녹흑색이에요.',
    pyrite: '정육면체 결정이 잘 생겨요. 조흔색은 검은색이에요.',
    quartz: '육각 기둥 모양이에요. 방해석을 긁을 수 있어요.',
    calcite: '마름모꼴로 쪼개져요. 묽은 염산에서 거품이 나요.',
    magnetite: '팔면체 결정이에요. 클립이 붙는 자성이 있어요.',
  };

  window.SciSim3D.attach({
    title: '광물 표본 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: PHN ? 11 : 8.6, theta: 0.5, phi: 1.15, min: 4, max: 20, target: [0, 0.6, 0] },
    autoRotate: 0.25,
    levels: [0],
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const sm = () => window.__sim;
      const V3 = THREE.Vector3;
      const mat = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.4, metalness: 0.05 }, o || {}));
      const flat = (g) => { const n = g.toNonIndexed(); n.computeVertexNormals(); return n; };
      function dispIco(r, seed, amp, sx, sy, sz) {
        const g = new THREE.SphereGeometry(r, 56, 40); const p = g.attributes.position, v = new V3();
        for (let i = 0; i < p.count; i++) {
          v.fromBufferAttribute(p, i); const n = v.clone().normalize();
          const k = 1 + amp * (Math.sin(n.x * 4.1 + seed) * Math.cos(n.y * 3.7 - seed) + 0.6 * Math.sin(n.z * 5.3 + seed * 2));
          p.setXYZ(i, n.x * r * k * sx, n.y * r * k * sy, n.z * r * k * sz);
        }
        g.computeVertexNormals(); return g;
      }
      const spec = {};
      const add = (k, g) => { spec[k] = g; g.visible = false; root.add(g); return g; };
      // 금: 울퉁불퉁한 덩어리
      { const g = new THREE.Group(); const m = mat(0xe6b422, { metalness: 1, roughness: 0.28 });
        const a = new THREE.Mesh(dispIco(1.0, 1, 0.16, 1.25, 0.75, 1), m); a.position.y = 0.75;
        const b = new THREE.Mesh(dispIco(0.55, 4, 0.2, 1, 0.8, 1), m); b.position.set(0.9, 0.5, 0.3);
        const c = new THREE.Mesh(dispIco(0.4, 7, 0.2, 1, 0.9, 1), m); c.position.set(-0.8, 0.4, -0.5);
        g.add(a, b, c); add('gold', g); }
      // 황동석: 쐐기 모양(정사면체에 가까운 결정)이 모인 덩어리
      { const g = new THREE.Group(); const m = mat(0xcfa83a, { metalness: 0.85, roughness: 0.38 });
        [[0, 0.7, 0, 1.1, 0.2], [0.9, 0.4, 0.4, 0.7, 1.3], [-0.8, 0.45, -0.3, 0.75, 2.2], [0.1, 0.35, -0.9, 0.6, 3]].forEach((q) => {
          const t = new THREE.Mesh(flat(new THREE.TetrahedronGeometry(q[3], 0)), m); t.position.set(q[0], q[1], q[2]); t.rotation.set(0.6 + q[4], q[4], 0.3); g.add(t);
        }); add('chalco', g); }
      // 황철석: 정육면체 결정
      { const g = new THREE.Group(); const m = mat(0xdcc55a, { metalness: 0.9, roughness: 0.3 });
        [[0, 0.8, 0, 1.4, 0.3], [1.15, 0.45, 0.4, 0.9, 0.8], [-0.95, 0.4, -0.5, 0.8, 1.9]].forEach((q) => {
          const b = new THREE.Mesh(new THREE.BoxGeometry(q[3], q[3], q[3]), m); b.position.set(q[0], q[1], q[2]); b.rotation.y = q[4]; b.castShadow = true; g.add(b);
          // 가는 줄무늬 (황철석 결정면의 줄무늬)
          for (let i = -2; i <= 2; i++) { const s = new THREE.Mesh(new THREE.BoxGeometry(q[3] * 1.005, 0.012, q[3] * 1.005), mat(0xa88f28, { metalness: 0.9, roughness: 0.4 })); s.position.set(0, i * q[3] * 0.17, 0); b.add(s); }
        }); add('pyrite', g); }
      // 석영: 육각 기둥 + 뾰족한 끝
      { const g = new THREE.Group(); const m = mat(0xeaf4fb, { roughness: 0.06, metalness: 0, transparent: true, opacity: 0.62, depthWrite: false });
        [[0, 0, 0, 0.55, 2.0, 0.15, 0], [0.8, 0, 0.3, 0.4, 1.4, 0.15, 0.35], [-0.7, 0, -0.35, 0.4, 1.2, -0.2, 0.2]].forEach((q) => {
          const c = new THREE.Group();
          const body = new THREE.Mesh(flat(new THREE.CylinderGeometry(q[3], q[3], q[4], 6)), m); body.position.y = q[4] / 2;
          const tip = new THREE.Mesh(flat(new THREE.CylinderGeometry(q[3] * 0.18, q[3], q[3] * 0.9, 6)), m); tip.position.y = q[4] + q[3] * 0.45;
          c.add(body, tip); c.position.set(q[0], 0.05, q[2]); c.rotation.set(q[5], q[6], q[5] * 0.5); g.add(c);
        }); add('quartz', g); }
      // 방해석: 마름모꼴 (정육면체를 대각선 방향으로 눌러 찌그러뜨림)
      { const g = new THREE.Group(); const m = mat(0xf2ede0, { roughness: 0.18, transparent: true, opacity: 0.86 });
        const geo = new THREE.BoxGeometry(1.5, 1.5, 1.5); const p = geo.attributes.position; const d = new V3(1, 1, 1).normalize();
        for (let i = 0; i < p.count; i++) { const v = new V3().fromBufferAttribute(p, i); const k = v.dot(d); v.addScaledVector(d, k * -0.38); p.setXYZ(i, v.x, v.y, v.z); }
        geo.computeVertexNormals();
        const r = new THREE.Mesh(geo, m); r.rotation.y = 0; r.castShadow = true;
        const wrap = new THREE.Group(); wrap.add(r);
        wrap.quaternion.setFromUnitVectors(d, new V3(0, 1, 0)); const o = new THREE.Group(); o.add(wrap); o.position.y = 1.0; g.add(o);
        add('calcite', g); }
      // 자철석: 팔면체 + 클립
      let clip;
      { const g = new THREE.Group(); const m = mat(0x3a3d4a, { metalness: 0.85, roughness: 0.32 });
        [[0, 0.95, 0, 1.0, 0.3], [0.95, 0.5, 0.45, 0.55, 1.1], [-0.85, 0.45, -0.4, 0.5, 2]].forEach((q) => {
          const o = new THREE.Mesh(flat(new THREE.OctahedronGeometry(q[3], 0)), m); o.position.set(q[0], q[1], q[2]); o.rotation.y = q[4]; o.castShadow = true; g.add(o);
        });
        // 종이 클립
        const pts = [[-0.3, 0.1], [0.3, 0.1], [0.3, -0.35], [-0.2, -0.35], [-0.2, 0.0], [0.15, 0.0], [0.15, -0.25]].map((q) => new V3(q[0], q[1], 0));
        clip = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.2), 60, 0.028, 8), mat(0xc9ced8, { metalness: 0.9, roughness: 0.25 }));
        clip.scale.setScalar(1.1); g.add(clip); g.userData.clip = clip; add('magnetite', g); }
      // 조흔판 (흰색 타일 + 긁힌 선)
      const plate = new THREE.Group(); root.add(plate);
      const tile = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.1, 1.2), mat(0xf4f1ea, { roughness: 0.85 })); tile.receiveShadow = true; plate.add(tile);
      const strk = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.02, 0.2), mat(0xe8b800, { roughness: 0.9 })); strk.position.set(0, 0.06, 0); plate.add(strk);
      plate.position.set(2.6, 0.05, 1.9); plate.rotation.y = -0.6; plate.scale.setScalar(0.85);
      const labS = label('조흔색', plate, { offset: [0, 0.4, 0.8] });
      const labN = label('', [0, 2.4, 0], { color: 'rgba(255,211,77,.92)' }); labN.el.style.color = '#1b2333'; labN.el.style.fontSize = '15px';
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.3, 0.1, 48), mat(0x0e1530, { roughness: 1, metalness: 0 }));
      ring.position.y = -0.04; ring.receiveShadow = true; root.add(ring);

      let sel = 'pyrite', mag = false, clipT = 0;
      function setSel(k) {
        sel = k; KEYS.forEach((q) => { spec[q].visible = q === k; });
        const st = STREAK[k]; strk.material.color.set(st[1]);
        const ms = window.__sim && window.__sim.MINERALS; const m = ms && ms.find((q) => q.id === k);
        info(`<b>${NM[k]}</b> · 겉보기 색 ${COLOR[k]}<br>조흔색 <b>${st[0]}</b> (아래 흰 판)<br>${NOTE[k]}`);
        labN.set(NM[k]);
        clipBtn.style.display = k === 'magnetite' ? '' : 'none'; mag = false;
      }
      const seg = controls.segment('광물', KEYS.map((k) => ({ label: NM[k], value: k })), 'pyrite', setSel);
      const clipBtn = controls.button('🧲 클립 대 보기', () => { mag = !mag; });
      setSel(window.__sim && window.__sim.S && KEYS.includes(window.__sim.S.sel) ? window.__sim.S.sel : 'pyrite'); seg.set(sel);
      return {
        sync() { const s = window.__sim && window.__sim.S; if (s && KEYS.includes(s.sel) && s.sel !== sel) { setSel(s.sel); seg.set(sel); } },
        update(dt, t) {
          const g = spec[sel]; g.rotation.y = 0;
          if (sel === 'magnetite') {
            clipT += ((mag ? 1 : 0) - clipT) * Math.min(1, dt * 4);
            const c = g.userData.clip; c.position.set(1.2 - 1.2 * clipT + 0.9 * (1 - clipT), 1.8 * (1 - clipT) + 0.45 * clipT + 0.15 * (1 - clipT) * Math.sin(t * 2), 0.6 * (1 - clipT) + 0.2 * clipT);
            c.rotation.z = 0.5 * (1 - clipT) - 0.3 * clipT;
            c.position.y = 0.3 + (1 - clipT) * 2.0 + (clipT * 0.5);
            c.position.x = 2.0 * (1 - clipT) + 0.55 * clipT;
          }
          spec[sel].position.y = 0.0;
        },
      };
    },
  });
})();
