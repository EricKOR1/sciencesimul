/* hr-galvanic-cell · 3D 다니엘 전지 (아연–구리)
   (−)극 Zn판: Zn → Zn²⁺ + 2e⁻ (산화). 전자는 도선을 따라 (+)극 Cu판으로 가요.
   (+)극 Cu판: Cu²⁺ + 2e⁻ → Cu (환원). 염다리의 이온이 이동해 양쪽 용액의 전하 균형을 맞춰 줘요.
   입자 수와 속도는 모형 스케치예요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const BX = 3.0, BR = 2.0, BH = 3.4, FY = -2.2, PY = FY + BH + 1.0;

  window.SciSim3D.attach({
    title: '다니엘 전지 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: PHONE ? 20 : 14.5, theta: 0.3, phi: 1.25, min: 8, max: 30, target: [0, 1.0, 0] },
    autoRotate: 0.06,
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const V3 = THREE.Vector3;
      const mat = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.4, metalness: 0.05 }, o || {}));
      let on = true, showLab = true, wear = 0;

      /* 비커와 용액 */
      [[-BX, 0xd9dfe8, 0.5], [BX, 0x4aa8ff, 0.7]].forEach(([x, c, o], i) => {
        const gl = new THREE.Mesh(new THREE.CylinderGeometry(BR, BR, BH, 48, 1, true), new THREE.MeshStandardMaterial({ color: 0xcfe8ff, transparent: true, opacity: 0.16, roughness: 0.08, side: THREE.DoubleSide, depthWrite: false }));
        gl.position.set(x, FY + BH / 2, 0); root.add(gl);
        const bt = new THREE.Mesh(new THREE.CylinderGeometry(BR, BR, 0.12, 48), mat(0xbcd0e6, { transparent: true, opacity: 0.5 })); bt.position.set(x, FY, 0); root.add(bt);
        const li = new THREE.Mesh(new THREE.CylinderGeometry(BR - 0.04, BR - 0.04, BH * 0.78, 48), mat(c, { transparent: true, opacity: i ? 0.42 : 0.22, roughness: 0.15, depthWrite: false }));
        li.position.set(x, FY + BH * 0.39, 0); root.add(li);
      });
      /* 금속판 */
      const zn = new THREE.Mesh(new THREE.BoxGeometry(0.3, 4.4, 1.6), mat(0x9aa4b2, { metalness: 0.85, roughness: 0.32 })); zn.position.set(-BX - 0.3, FY + 1.6, 0); root.add(zn);
      const cu = new THREE.Mesh(new THREE.BoxGeometry(0.3, 4.4, 1.6), mat(0xd9824c, { metalness: 0.85, roughness: 0.3 })); cu.position.set(BX + 0.3, FY + 1.6, 0); root.add(cu);
      const znTop = FY + 1.6 + 2.2, cuTop = znTop;
      /* 염다리 (U자 관) */
      const sbPts = [new V3(-BX + 0.7, FY + 1.0, 0.0), new V3(-BX + 0.9, PY - 0.6, 0.0), new V3(-BX * 0.45, PY + 0.1, 0.0), new V3(BX * 0.45, PY + 0.1, 0.0), new V3(BX - 0.9, PY - 0.6, 0.0), new V3(BX - 0.7, FY + 1.0, 0.0)];
      const sbCurve = new THREE.CatmullRomCurve3(sbPts, false, 'catmullrom', 0.3);
      const sb = new THREE.Mesh(new THREE.TubeGeometry(sbCurve, 80, 0.42, 20, false), new THREE.MeshStandardMaterial({ color: 0xfff1b8, transparent: true, opacity: 0.42, roughness: 0.2, depthWrite: false })); root.add(sb);
      const sbIn = new THREE.Mesh(new THREE.TubeGeometry(sbCurve, 80, 0.32, 16, false), mat(0xfde68a, { transparent: true, opacity: 0.7, roughness: 0.6 })); root.add(sbIn);
      /* 도선 (Zn → 전구/전압계 → Cu) */
      const WY = PY + 1.6;
      const wp = [new V3(-BX - 0.3, znTop, 0), new V3(-BX - 0.3, WY, 0), new V3(-1.1, WY, 0), new V3(1.1, WY, 0), new V3(BX + 0.3, WY, 0), new V3(BX + 0.3, cuTop, 0)];
      const wcurve = new THREE.CatmullRomCurve3(wp, false, 'catmullrom', 0.02);
      const wire = new THREE.Mesh(new THREE.TubeGeometry(wcurve, 100, 0.07, 10, false), mat(0xd18a3a, { metalness: 0.7, roughness: 0.35 })); root.add(wire);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.55, 28, 22), mat(0xfff3c4, { transparent: true, opacity: 0.8, emissive: 0xffc83d, emissiveIntensity: 0.9, roughness: 0.2 })); bulb.position.set(0, WY + 0.55, 0); root.add(bulb);
      const sock = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.35, 20), mat(0x64748b, { metalness: 0.6, roughness: 0.4 })); sock.position.set(0, WY + 0.05, 0); root.add(sock);
      const bulbL = new THREE.PointLight(0xffc83d, 0.9, 7); bulbL.position.copy(bulb.position); root.add(bulbL);
      const swb = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.18, 0.5), mat(0xef6a5b)); swb.position.set(-2.0, WY + 0.09, 0); root.add(swb);

      /* 전자 */
      const NE = 14, em = new THREE.InstancedMesh(new THREE.SphereGeometry(0.15, 14, 10), mat(0x42e8ff, { emissive: 0x00a9c0, emissiveIntensity: 0.9 }), NE); em.frustumCulled = false; root.add(em);
      /* 이온: Zn²⁺(왼쪽), Cu²⁺(오른쪽), 염다리의 음이온·양이온 */
      const mkIon = (n, r, c) => { const m = new THREE.InstancedMesh(new THREE.SphereGeometry(r, 18, 14), mat(c, { roughness: 0.3, emissive: c, emissiveIntensity: 0.18 }), n); m.frustumCulled = false; root.add(m); return m; };
      const NZ = 12, NC = 12, NB = 8;
      const zi = mkIon(NZ, 0.2, 0x8fa0b8), ci = mkIon(NC, 0.2, 0x1e6fe0), an = mkIon(NB, 0.17, 0xffb020), ca = mkIon(NB, 0.17, 0xc084fc);
      const zs = Array.from({ length: NZ }, (_, i) => ({ t: i / NZ, a: Math.random() * 6.28, r: Math.random() })), cs = Array.from({ length: NC }, (_, i) => ({ t: i / NC, a: Math.random() * 6.28, r: Math.random() }));
      const M = new THREE.Matrix4(), hide = (m, i) => { M.makeScale(0.0001, 0.0001, 0.0001); m.setMatrixAt(i, M); };
      const labs = [
        label('(−)극 Zn판 · 산화', zn, { color: 'rgba(100,116,139,.95)', offset: [-0.2, 2.9, 0] }),
        label('(+)극 Cu판 · 환원', cu, { color: 'rgba(217,119,6,.95)', offset: [0.2, 2.9, 0] }),
        label('염다리', [0, PY + 0.5, 0], { color: 'rgba(161,98,7,.92)' }),
        label('e⁻ →', [-2.1, WY + 0.65, 0], { color: 'rgba(8,145,178,.92)' }),
        label('ZnSO₄(aq)', [-BX, FY + 0.2, BR], { color: 'rgba(30,41,59,.85)' }),
        label('CuSO₄(aq)', [BX, FY + 0.2, BR], { color: 'rgba(30,41,59,.85)' }),
      ];
      const labA = label('Zn²⁺', [-BX - 1.1, FY + 2.0, 0], { color: 'rgba(100,116,139,.95)' }), labB = label('Cu²⁺', [BX + 1.3, FY + 2.0, 0], { color: 'rgba(30,111,224,.95)' });
      const showL = (v) => { labs.forEach((l) => l.show(v)); labA.show(v); labB.show(v); };
      const swBtn = controls.button('스위치 ON ✓', () => { on = !on; swBtn.classList.toggle('on', on); swBtn.textContent = '스위치 ' + (on ? 'ON ✓' : 'OFF ✕'); }); swBtn.classList.add('on');
      const lb = controls.button('이름표 ✓', () => { showLab = !showLab; lb.classList.toggle('on', showLab); lb.textContent = '이름표 ' + (showLab ? '✓' : '✕'); showL(showLab); }); lb.classList.add('on');
      controls.button('↺ 판 새로 갈기', () => { wear = 0; });
      let flow = 0, txt = '';
      return {
        update(dt, t) {
          dt = Math.min(dt, 0.05);
          flow += ((on ? 1 : 0) - flow) * Math.min(1, dt * 4);
          if (on) wear = Math.min(1, wear + dt * 0.01);
          zn.scale.x = 1 - 0.55 * wear; cu.scale.x = 1 + 0.9 * wear;
          bulb.material.emissiveIntensity = 0.1 + 0.9 * flow; bulbL.intensity = 0.9 * flow; bulb.material.opacity = 0.5 + 0.3 * flow;
          swb.position.y = WY + (on ? 0.09 : 0.45); swb.rotation.z = on ? 0 : 0.5;
          /* 전자: 도선을 Zn → 전구 → Cu 방향으로 */
          for (let i = 0; i < NE; i++) { const u = ((i / NE) + t * 0.12 * flow) % 1; const p = wcurve.getPointAt(u); if (flow < 0.05) { hide(em, i); continue; } M.makeTranslation(p.x, p.y, p.z); em.setMatrixAt(i, M); }
          em.instanceMatrix.needsUpdate = true;
          /* Zn²⁺: Zn판에서 나와 용액으로 퍼지다 사라짐 / Cu²⁺: 용액에서 Cu판으로 모여 석출 */
          const sp = 0.16 * (0.35 + flow);
          zs.forEach((q, i) => { q.t = (q.t + dt * sp) % 1; const rr = 0.3 + q.t * 0.9 + q.r * 0.2, y = FY + 0.6 + q.r * 2.2; if (flow < 0.05 && false) hide(zi, i); const s = Math.sin(Math.PI * Math.min(1, q.t * 1.3)); M.makeScale(Math.max(0.001, s), Math.max(0.001, s), Math.max(0.001, s)); M.setPosition(-BX - 0.5 + (-rr * Math.abs(Math.cos(q.a))) * 0.8, y, Math.sin(q.a) * rr * 0.9); zi.setMatrixAt(i, M); });
          cs.forEach((q, i) => { q.t = (q.t + dt * sp) % 1; const rr = 1.3 - q.t * 1.0 + q.r * 0.15, y = FY + 0.6 + q.r * 2.2; const s = Math.sin(Math.PI * Math.min(1, q.t * 1.15 + 0.0)); M.makeScale(Math.max(0.001, s), Math.max(0.001, s), Math.max(0.001, s)); M.setPosition(BX + 0.5 + rr * Math.abs(Math.cos(q.a)), y, Math.sin(q.a) * rr * 0.9); ci.setMatrixAt(i, M); });
          zi.instanceMatrix.needsUpdate = true; ci.instanceMatrix.needsUpdate = true;
          /* 염다리: 음이온은 Zn쪽으로, 양이온은 Cu쪽으로 */
          for (let i = 0; i < NB; i++) {
            const ua = (1 - ((i / NB + t * 0.05 * flow) % 1)), uc = (i / NB + t * 0.05 * flow) % 1;
            const pa = sbCurve.getPointAt(ua), pc = sbCurve.getPointAt(uc);
            if (flow < 0.05) { hide(an, i); hide(ca, i); continue; }
            M.makeTranslation(pa.x, pa.y, pa.z + 0.1); an.setMatrixAt(i, M); M.makeTranslation(pc.x, pc.y, pc.z - 0.1); ca.setMatrixAt(i, M);
          }
          an.instanceMatrix.needsUpdate = true; ca.instanceMatrix.needsUpdate = true;
          const tx = on ? '<b>전지가 작동해요</b><br>전자: Zn판 → 도선 → Cu판 (전류는 반대)<br>염다리의 음이온 → Zn쪽, 양이온 → Cu쪽' : '<b>스위치가 열려 있어요</b><br>회로가 끊겨 전자가 흐르지 못해요. 반응도 멈춰요.';
          if (tx !== txt) { txt = tx; info(tx); }
        },
      };
    },
  });
})();
