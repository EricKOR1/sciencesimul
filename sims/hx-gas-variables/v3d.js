/* hx-gas-variables · 3D 피스톤 속 기체 입자
   2D 실험의 부피·온도·몰수에 맞춰, 입자가 벽에 부딪혀 압력을 만드는 모습을 입체로 보여 줘요.
   입자 수 ∝ 몰수, 입자 속도 ∝ √T, 피스톤 높이 ∝ 부피예요 (모형 스케치). */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const HW = 2, FLOOR = -3.2, PER_MOL = 40, MAXN = 80, R_P = 0.2;

  window.SciSim3D.attach({
    title: '피스톤 속 기체 입자 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: PHONE ? 15 : 12.5, theta: 0.7, phi: 1.25, min: 6, max: 26, target: [0, 0.2, 0] },
    autoRotate: 0.18,
    levels: [2],   // 3단계(몰수 · 부피 기록). 1 · 2단계는 기록표 · 그래프(외삽)를 읽고, 4단계는 식 카드를 끌어 놓아서 2D 화면이에요
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const V3 = THREE.Vector3;
      const st0 = () => { try { return window.__sim && window.__sim.st ? window.__sim.st() : null; } catch (e) { return null; } };
      let colorBySpeed = true, flashOn = true;

      /* 용기 */
      const glass = new THREE.MeshStandardMaterial({ color: 0xbfe3ff, transparent: true, opacity: 0.16, roughness: 0.1, metalness: 0, depthWrite: false, side: THREE.DoubleSide });
      const body = new THREE.Mesh(new THREE.BoxGeometry(HW * 2, 1, HW * 2), glass); root.add(body);
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)), new THREE.LineBasicMaterial({ color: 0x9fc8ee, transparent: true, opacity: 0.8 }));
      edges.scale.set(HW * 2, 1, HW * 2); body.add(edges);
      const base = new THREE.Mesh(new THREE.BoxGeometry(HW * 2 + 0.4, 0.3, HW * 2 + 0.4), new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.5, metalness: 0.4 }));
      base.position.y = FLOOR - 0.15; root.add(base);
      /* 피스톤 */
      const pis = new THREE.Group(); root.add(pis);
      const plate = new THREE.Mesh(new THREE.BoxGeometry(HW * 2 + 0.05, 0.28, HW * 2 + 0.05), new THREE.MeshStandardMaterial({ color: 0xa8b3c4, roughness: 0.3, metalness: 0.7 }));
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 1.4, 20), new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.25, metalness: 0.85 }));
      rod.position.y = 0.85;
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.42, 24, 16), new THREE.MeshStandardMaterial({ color: 0xef6a5b, roughness: 0.4 }));
      knob.position.y = 1.7;
      pis.add(plate, rod, knob);
      /* 입자 */
      const geo = new THREE.SphereGeometry(R_P, 18, 14);
      const mesh = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35, metalness: 0.05 }), MAXN);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); mesh.frustumCulled = false; root.add(mesh);
      const P = [];
      for (let i = 0; i < MAXN; i++) {
        const d = new V3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
        P.push({ x: (Math.random() * 2 - 1) * (HW - 0.3), y: FLOOR + 0.4 + Math.random() * 2, z: (Math.random() * 2 - 1) * (HW - 0.3), d, f: 0.6 + Math.random() * 0.8, fl: 0 });
      }
      /* 압력 표시 (피스톤을 누르는 화살표 + 이름표) */
      const arrows = new THREE.Group(); root.add(arrows);
      const amat = new THREE.MeshStandardMaterial({ color: 0xffb454, roughness: 0.4, emissive: 0x663300, emissiveIntensity: 0.4 });
      const arrM = [];
      for (let i = 0; i < 4; i++) {
        const a = new THREE.Group();
        a.add(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1, 12), amat), new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.4, 16), amat));
        arrows.add(a); arrM.push(a);
      }
      const labP = label('', knob, { color: 'rgba(239,106,91,.92)', offset: [0, 0.7, 0] });
      const labV = label('', [HW + 0.1, FLOOR, HW], { color: 'rgba(56,134,214,.92)' });

      const cur = { n: 0.5, T: 300, V: 12.3, P: 1, h: 5, kind: 'gen', mode: 'boyle', sub: 'charles' }; let h = 5, lastTxt = '';
      const tmpM = new THREE.Matrix4(), tmpC = new THREE.Color();
      function read() {
        const s = st0();
        if (s) { cur.n = s.n; cur.T = s.T; cur.V = s.V; cur.P = s.P; cur.kind = s.kind; }
        try { const S = window.__sim.S; cur.mode = S.mode; cur.sub = S.sub.temp; } catch (e) { /* 무시 */ }
        return cur;
      }
      function layout(dt) {
        const c = read(), th = Math.max(0.9, c.V * 0.4);
        h += (th - h) * Math.min(1, dt * 6);
        body.scale.set(1, h, 1); body.position.y = FLOOR + h / 2;
        pis.position.y = FLOOR + h + 0.14;
        arrM.forEach((a, i) => {
          const ang = (i / 4) * Math.PI * 2 + 0.78, rx = Math.cos(ang) * 1.1, rz = Math.sin(ang) * 1.1;
          const L = 0.5 + 0.5 * Math.min(2.5, c.P);
          a.position.set(rx, FLOOR + h + 0.3 + L / 2 + 0.55, rz);
          a.children[0].scale.set(1, L, 1); a.children[1].position.y = -L / 2 - 0.18; a.children[1].rotation.x = Math.PI;
        });
        labV.obj = [HW, FLOOR + h / 2, HW];
      }
      function stepParticles(dt) {
        const c = cur, nShow = Math.max(1, Math.min(MAXN, Math.round(c.n * PER_MOL)));
        const sp = 2.3 * Math.sqrt(c.T / 300), top = FLOOR + h - R_P, bot = FLOOR + R_P, w = HW - R_P;
        for (let i = 0; i < MAXN; i++) {
          const p = P[i];
          if (i >= nShow) { tmpM.makeScale(0.0001, 0.0001, 0.0001); mesh.setMatrixAt(i, tmpM); continue; }
          const v = sp * p.f * dt;
          p.x += p.d.x * v; p.y += p.d.y * v; p.z += p.d.z * v;
          if (p.x > w) { p.x = w; p.d.x *= -1; p.fl = 1; } else if (p.x < -w) { p.x = -w; p.d.x *= -1; p.fl = 1; }
          if (p.z > w) { p.z = w; p.d.z *= -1; p.fl = 1; } else if (p.z < -w) { p.z = -w; p.d.z *= -1; p.fl = 1; }
          if (p.y > top) { p.y = top; p.d.y = -Math.abs(p.d.y); p.fl = 1; } else if (p.y < bot) { p.y = bot; p.d.y = Math.abs(p.d.y); p.fl = 1; }
          p.fl = Math.max(0, p.fl - dt * 4);
          tmpM.makeTranslation(p.x, p.y, p.z); const sc = 1 + (flashOn ? p.fl * 0.5 : 0); tmpM.scale(new V3(sc, sc, sc)); mesh.setMatrixAt(i, tmpM);
          if (colorBySpeed && c.kind === 'gen') { const k = Math.min(1, Math.max(0, (sp * p.f / 2.3 - 0.3) / 1.4)); tmpC.setHSL(0.62 - 0.62 * k, 0.85, 0.58); }
          else tmpC.setHex((KIND[c.kind] || KIND.gen)[1]);
          if (flashOn && p.fl > 0.4) tmpC.lerp(new THREE.Color(0xffffff), p.fl);
          mesh.setColorAt(i, tmpC);
        }
        mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      }
      const KIND = { gen: ['기체', 0x7cc4ff], he: ['He', 0xf2b705], n2: ['N₂', 0x3867f4], co2: ['CO₂', 0x9ca3af] };
      function text() {
        const c = cur, nm = (KIND[c.kind] || KIND.gen)[0];
        let line;
        if (c.mode === 'boyle' || c.mode === 'unify') line = '온도 300 K · 몰수 0.50 mol 고정<br>P × V = ' + (c.P * c.V).toFixed(1) + ' atm·L (일정)';
        else if (c.mode === 'temp' && c.sub === 'gay') line = '부피 12.30 L 고정 · 온도가 오르면 압력이 커져요';
        else if (c.mode === 'temp') line = '압력 1.00 atm 고정 · 온도가 오르면 부피가 커져요';
        else line = nm + ' · 300 K, 1.00 atm 고정 · 몰수가 늘면 부피가 커져요';
        const t = '<b>P = ' + c.P.toFixed(2) + ' atm</b> · V = ' + c.V.toFixed(1) + ' L<br>T = ' + Math.round(c.T) + ' K · n = ' + c.n.toFixed(2) + ' mol<br>' + line + '<br>입자가 벽을 더 자주·세게 때리면 압력이 커져요.';
        if (t !== lastTxt) { lastTxt = t; info(t); labP.set('P ' + c.P.toFixed(2) + ' atm'); labV.set('V ' + c.V.toFixed(1) + ' L'); }
      }
      controls.segment('입자 색', [{ value: 'spd', label: '속도 색' }, { value: 'one', label: '한 가지 색' }], 'spd', (v) => { colorBySpeed = v === 'spd'; });
      const fb = controls.button('충돌 반짝임 ✓', () => { flashOn = !flashOn; fb.classList.toggle('on', flashOn); fb.textContent = '충돌 반짝임 ' + (flashOn ? '✓' : '✕'); }); fb.classList.add('on');
      controls.text('온도·부피·몰수는 옆 조작판에서 바꿔요.');
      layout(1); h = Math.max(0.9, cur.V * 0.4);
      return {
        update(dt) { dt = Math.min(dt, 0.05); layout(dt); stepParticles(dt); text(); },
        sync() { lastTxt = ''; },
      };
    },
  });
})();
