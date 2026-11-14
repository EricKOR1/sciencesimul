/* hr-practical-cell · 3D 실용 전지의 구조 (2D '구조 비교'의 세 전지 + '전지 분류'의 방전 · 충전)
   2D에서 고른 전지(망가니즈 건전지 · 납 축전지 · 리튬 이온 전지)와 방전/충전을 그대로 따라가요.
   '전지 분류' 단계에서는 학생이 2D에서 전자 방향을 고르기 전까지 전자의 흐름을 멈춰 두고, ▶ 재생을 누르면 방전 ↔ 충전을 번갈아 보여 줘요.
   ① 망가니즈 건전지(1차 전지): 아연 통(−극) · 전해질 풀 · MnO₂+탄소(+극 물질) · 탄소 막대(+극 단자). 반쪽을 잘라 단면을 보여 줘요.
   ② 리튬 이온 전지(2차 전지): 흑연(−) | 분리막 | 리튬 코발트 산화물(+). 방전·충전할 때 Li⁺와 전자의 이동 방향이 반대로 바뀌어요.
   1단계(발전 과정): 2D에서 고른 카드의 전지 구조(볼타 · 다니엘 · 납 · 망가니즈 · 알칼리 · 리튬 이온)를 보여 줘요. 순서 놓기는 2D에서 해요.
   3단계(효율 탐색): 2D의 금속 쌍 · 전해질 · 거리 · 판 크기에 따라 전구 · 전류 · 전압이 같은 값으로 바뀌어요.
   4단계의 쓰임새 카드(상자 분류)는 끌고 있는 카드에 알맞은 전지 구조를 보여 줘요.
   크기와 입자 수는 모형 스케치예요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);

  window.SciSim3D.attach({
    title: '실용 전지의 구조 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: PHONE ? 17 : 12.5, theta: 0.35, phi: 1.2, min: 6, max: 26, target: [0, 0.6, 0] },
    autoRotate: 0.07,
    levels: [2],   // 3단계 '효율 탐색'(금속 쌍 · 전해질 · 거리 · 크기를 3D 막대에서도 바꾸고 기록해요). 1 · 2 · 4단계는 카드 놓기 · 색칠이 캔버스에서 필요해서 2D
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const V3 = THREE.Vector3;
      const MT = ctx.mats;
      const rbox = (w, h, d, r) => { r = Math.min(r, w / 2 - 1e-3, h / 2 - 1e-3, d / 2 - 1e-3); const s = new THREE.Shape(), x = w / 2 - r, y = h / 2 - r; s.absarc(x, y, r, 0, Math.PI / 2); s.absarc(-x, y, r, Math.PI / 2, Math.PI); s.absarc(-x, -y, r, Math.PI, 1.5 * Math.PI); s.absarc(x, -y, r, 1.5 * Math.PI, 2 * Math.PI); const g = new THREE.ExtrudeGeometry(s, { depth: d - 2 * r, bevelEnabled: true, bevelThickness: r, bevelSize: r, bevelOffset: -r, bevelSegments: 3, curveSegments: 6 }); g.translate(0, 0, -(d - 2 * r) / 2); return g; };   // 모서리가 둥근 상자
      const rslab = (w, d, t, r) => { const g = rbox(w, d, t, r); g.rotateX(Math.PI / 2); return g; };   // 눕힌 판 (윗면에 무늬가 고르게)
      // 금속(metalness ≥ 0.7)은 반사가 또렷한 금속 재질로, 나머지는 그대로
      const mat = (c, o) => { o = o || {}; if (o.metalness >= 0.7 && !o.transparent) { const m = MT.metal(c, { roughness: o.roughness }); if (o.side) m.side = o.side; return m; } return new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.45, metalness: 0.05 }, o)); };
      const A = new THREE.Group(), B = new THREE.Group(), C = new THREE.Group(); root.add(A, B, C);
      let kind = 'mn', mode = 'dis', showLab = true;
      const M = new THREE.Matrix4(), hide = (m, i) => { M.makeScale(0.0001, 0.0001, 0.0001); m.setMatrixAt(i, M); };
      const hideLab = [];

      /* ---------- ① 망가니즈 건전지 단면 ---------- */
      const H = 5, Y0 = -2.6;
      const layers = [[1.6, 1.7, 0xb6bfcc, '아연 통 (−극)', -1.0], [1.5, 1.6, 0xf1f5f9, '분리막', 0], [1.2, 1.5, 0xe9d8a6, '전해질 풀 NH₄Cl', 0.9], [0.36, 1.2, 0x6b5f57, 'MnO₂ + 탄소 가루', 0.5], [0, 0.36, 0x9aa3b5, '탄소 막대 (+극)', 0]];
      layers.forEach(([ri, ro, col, name]) => {
        const half = (r, open) => new THREE.Mesh(new THREE.CylinderGeometry(r, r, H, 48, 1, open, Math.PI / 2, Math.PI), mat(col, { side: THREE.DoubleSide, metalness: col === 0xb6bfcc ? 0.8 : 0.05, roughness: col === 0xb6bfcc ? 0.3 : 0.7 }));
        const o = half(ro, true), i = ri > 0 ? half(ri, true) : null; o.position.y = Y0 + H / 2; A.add(o); if (i) { i.position.y = Y0 + H / 2; A.add(i); }
        // 단면(앞쪽 평면): 오른쪽 · 왼쪽 띠
        [1, -1].forEach((s) => { const w = ro - ri; const p = new THREE.Mesh(new THREE.PlaneGeometry(w, H), mat(col, { roughness: 0.8, side: THREE.DoubleSide })); p.position.set(s * (ri + w / 2), Y0 + H / 2, 0.0); A.add(p); });
        // 위·아래 덮개 (반원 고리)
        [Y0, Y0 + H].forEach((y) => { const c = new THREE.Mesh(new THREE.RingGeometry(ri, ro, 48, 1, Math.PI, Math.PI), mat(col, { side: THREE.DoubleSide })); c.rotation.x = -Math.PI / 2; c.rotation.z = 0; c.position.y = y; A.add(c); });
      });
      const capT = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.42, 32), mat(0xe8c15a, { metalness: 0.85, roughness: 0.28 })); capT.position.y = Y0 + H + 0.18; A.add(capT);
      const capB = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.35, 0.16, 40), mat(0xc4ccd8, { metalness: 0.85, roughness: 0.3 })); capB.position.y = Y0 - 0.08; A.add(capB);
      // 외부 회로 + 전구
      const WX = 3.7, WTop = Y0 + H + 1.6, WBot = Y0 - 0.9;
      const wpts = [new V3(0, Y0 + H + 0.4, 0), new V3(0, WTop, 0), new V3(WX, WTop, 0), new V3(WX, WBot, 0), new V3(0, WBot, 0), new V3(0, Y0 - 0.16, 0)];
      const wcur = new THREE.CatmullRomCurve3(wpts, false, 'catmullrom', 0.02);
      const wire = new THREE.Mesh(new THREE.TubeGeometry(wcur, 80, 0.06, 10, false), mat(0xd18a3a, { metalness: 0.7, roughness: 0.35 })); A.add(wire);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.55, 40, 28), MT.glass({ tint: 0xfff3c4, opacity: 0.85, extra: { emissive: 0xffc83d, emissiveIntensity: 0.9, side: THREE.FrontSide } })); bulb.position.set(WX, (WTop + WBot) / 2, 0); A.add(bulb);
      const bl = ctx.halo(bulb, 0xffcf5a, 4.2, 0.6);   // 전구 빛 번짐
      const NE = 10, em = new THREE.InstancedMesh(new THREE.SphereGeometry(0.13, 12, 10), mat(0x42e8ff, { emissive: 0x00a9c0, emissiveIntensity: 0.9 }), NE); em.frustumCulled = false; A.add(em);
      const labsA = [
        label('+극 (탄소 막대)', capT, { color: 'rgba(220,38,38,.92)', offset: [0, 0.7, 0] }), label('아연 통 (−극)', [-1.7, Y0 + 1.2, 0], { color: 'rgba(37,99,235,.92)' }),
        label('전해질 풀', [1.35, Y0 + 3.9, 0.0], { color: 'rgba(30,41,59,.9)' }), label('MnO₂ + 탄소', [0.8, Y0 + 2.1, 0.0], { color: 'rgba(30,41,59,.9)' }),
      ];

      /* ---------- ② 리튬 이온 전지 ---------- */
      const SX = 2.6, SH = 4.2, SZ = 3.0;
      const slab = (x, col, n) => {
        const g = new THREE.Group(); g.position.x = x;
        for (let i = 0; i < n; i++) { const p = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.2, SZ), mat(col, { metalness: 0.2, roughness: 0.5 })); p.position.y = -SH / 2 + 0.35 + i * (SH - 0.7) / (n - 1); g.add(p); }
        const foil = new THREE.Mesh(new THREE.BoxGeometry(0.1, SH, SZ), mat(x < 0 ? 0xd9824c : 0xcbd5e1, { metalness: 0.85, roughness: 0.3 })); foil.position.x = (x < 0 ? -1 : 1) * 0.95; g.add(foil);
        return g;
      };
      const anode = slab(-SX, 0x78839a, 9), cathode = slab(SX, 0x4f7cff, 9); B.add(anode, cathode);
      const sep = new THREE.Mesh(new THREE.BoxGeometry(0.1, SH, SZ), mat(0xf1f5f9, { transparent: true, opacity: 0.55, depthWrite: false })); B.add(sep);
      const liq = new THREE.Mesh(new THREE.BoxGeometry(SX * 2 + 1.7, SH, SZ), mat(0xffe9a8, { transparent: true, opacity: 0.1, depthWrite: false })); B.add(liq);
      const ctop = SH / 2 + 1.3;
      const wB = new THREE.CatmullRomCurve3([new V3(-SX - 0.95, SH / 2, 0), new V3(-SX - 0.95, ctop, 0), new V3(-1.0, ctop, 0), new V3(1.0, ctop, 0), new V3(SX + 0.95, ctop, 0), new V3(SX + 0.95, SH / 2, 0)], false, 'catmullrom', 0.02);
      B.add(new THREE.Mesh(new THREE.TubeGeometry(wB, 80, 0.06, 10, false), mat(0xd18a3a, { metalness: 0.7, roughness: 0.35 })));
      const dev = new THREE.Mesh(rbox(1.5, 0.7, 0.8, 0.08), MT.plastic(0x3a4558)); dev.position.set(0, ctop, 0); B.add(dev);
      const devL = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), mat(0xffc83d, { emissive: 0xffc83d, emissiveIntensity: 0.9 })); devL.position.set(0, ctop + 0.45, 0); B.add(devL);
      const NL = 16, lm = new THREE.InstancedMesh(new THREE.SphereGeometry(0.17, 18, 14), mat(0xc084fc, { emissive: 0x7c3aed, emissiveIntensity: 0.45, roughness: 0.3 }), NL); lm.frustumCulled = false; B.add(lm);
      const eB = new THREE.InstancedMesh(new THREE.SphereGeometry(0.13, 12, 10), mat(0x42e8ff, { emissive: 0x00a9c0, emissiveIntensity: 0.9 }), NE); eB.frustumCulled = false; B.add(eB);
      const LP = Array.from({ length: NL }, (_, i) => ({ u: i / NL, y: -SH / 2 + 0.4 + Math.random() * (SH - 0.8), z: (Math.random() - 0.5) * (SZ - 0.6) }));
      const labsB = [
        label('흑연 (−극 물질)', [-SX, -SH / 2 - 0.45, 0], { color: 'rgba(100,116,139,.95)' }), label('리튬 코발트 산화물 (+극)', [SX, -SH / 2 - 0.45, 0], { color: 'rgba(37,99,235,.95)' }),
        label('분리막 · 전해질', [0, -SH / 2 - 0.45, 0], { color: 'rgba(30,41,59,.9)' }), label('Li⁺', [0, 0.3, SZ / 2], { color: 'rgba(124,58,237,.95)' }), label('e⁻', [-2, ctop + 0.55, 0], { color: 'rgba(8,145,178,.92)' }),
      ];
      /* ---------- ③ 납 축전지 (Pb | 묽은 황산 | PbO₂) ---------- */
      const acid = new THREE.Mesh(new THREE.BoxGeometry(SX * 2 + 1.7, SH, SZ), mat(0xf7e08a, { transparent: true, opacity: 0.2, depthWrite: false })); C.add(acid);
      const mkPlates = (x, col, n) => { const g = new THREE.Group(); g.position.x = x; for (let i = 0; i < 3; i++) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.35, SH - 0.7, SZ - 0.5), mat(col, { metalness: 0.35, roughness: 0.6 })); p.position.set((i - 1) * 0.55, -0.05, 0); g.add(p); } const bar = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.18, 0.5), mat(0x94a3b8, { metalness: 0.85, roughness: 0.3 })); bar.position.set(0, SH / 2 - 0.2, 0); g.add(bar); return g; };
      C.add(mkPlates(-SX, 0x8b95a7), mkPlates(SX, 0x6b4a3a));
      const sepC = new THREE.Mesh(new THREE.BoxGeometry(0.1, SH - 0.4, SZ - 0.3), mat(0xf1f5f9, { transparent: true, opacity: 0.55, depthWrite: false })); C.add(sepC);
      C.add(new THREE.Mesh(new THREE.TubeGeometry(wB, 80, 0.06, 10, false), mat(0xd18a3a, { metalness: 0.7, roughness: 0.35 })));
      const devC = new THREE.Mesh(rbox(1.5, 0.7, 0.8, 0.08), MT.plastic(0x3a4558)); devC.position.set(0, ctop, 0); C.add(devC);
      const devLC = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), mat(0xffc83d, { emissive: 0xffc83d, emissiveIntensity: 0.9 })); devLC.position.set(0, ctop + 0.45, 0); C.add(devLC);
      const eC = new THREE.InstancedMesh(new THREE.SphereGeometry(0.13, 12, 10), mat(0x42e8ff, { emissive: 0x00a9c0, emissiveIntensity: 0.9 }), NE); eC.frustumCulled = false; C.add(eC);
      const NI = 14, hI = new THREE.InstancedMesh(new THREE.SphereGeometry(0.13, 14, 10), mat(0xf8fafc, { emissive: 0x94a3b8, emissiveIntensity: 0.4 }), NI), sI = new THREE.InstancedMesh(new THREE.SphereGeometry(0.2, 16, 12), mat(0xfbbf24, { emissive: 0xb45309, emissiveIntensity: 0.35 }), NI);
      hI.frustumCulled = false; sI.frustumCulled = false; C.add(hI, sI);
      const IP = Array.from({ length: NI }, (_, i) => ({ u: i / NI, y: -SH / 2 + 0.5 + Math.random() * (SH - 1), z: (Math.random() - 0.5) * (SZ - 0.8) }));
      const labsC = [
        label('Pb판 (−극 물질)', [-SX, -SH / 2 - 0.45, 0], { color: 'rgba(100,116,139,.95)' }), label('PbO₂판 (+극 물질)', [SX, -SH / 2 - 0.45, 0], { color: 'rgba(120,70,40,.95)' }),
        label('분리막 · 묽은 황산(전해질)', [0, -SH / 2 - 0.45, 0], { color: 'rgba(30,41,59,.9)' }), label('e⁻', [-2, ctop + 0.55, 0], { color: 'rgba(8,145,178,.92)' }),
      ];
      function setKind(k) { kind = k; A.visible = k === 'mn'; B.visible = k === 'li'; C.visible = k === 'pb'; showL(); }
      function showL() { labsA.forEach((l) => l.show(showLab && kind === 'mn')); labsB.forEach((l) => l.show(showLab && kind === 'li')); labsC.forEach((l) => l.show(showLab && kind === 'pb')); }
      const lb = controls.button('이름표 ✓', () => { showLab = !showLab; lb.classList.toggle('on', showLab); lb.textContent = '이름표 ' + (showLab ? '✓' : '✕'); showL(); }); lb.classList.add('on');
      setKind('mn');

      /* ================= 1단계 발전 과정(timeline) · 3단계 효율 탐색(explore) · 4단계 쓰임새 카드(classify · sort) ================= */
      const probe = controls.text(''); probe.style.display = 'none'; const ctlEl = probe.parentElement;
      const myEls = [probe]; const baseEls = { get list() { return Array.prototype.filter.call(ctlEl.children, (e) => myEls.indexOf(e) < 0); } };
      const grab = (fn) => { const n0 = ctlEl.children.length; const r = fn(); const els = Array.prototype.slice.call(ctlEl.children, n0); els.forEach((e) => myEls.push(e)); return { r, els }; };
      const D = new THREE.Group(), E = new THREE.Group(), X = new THREE.Group(); root.add(D, E, X); D.visible = E.visible = X.visible = false;
      const stdw = (c, o) => mat(c, o);
      const wireM = () => MT.metal('copper');
      const bulbOf = (grp, x, y) => { const b = new THREE.Mesh(new THREE.SphereGeometry(0.5, 40, 28), MT.glass({ tint: 0xfff3c4, opacity: 0.85, extra: { emissive: 0xffc83d, emissiveIntensity: 0.9, side: THREE.FrontSide } })); b.position.set(x, y, 0); grp.add(b); b.userData.h = ctx.halo(b, 0xffcf5a, 3.8, 0.5); const ft = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.3, 0.34, 28), MT.metal('brass')); ft.position.y = -0.6; b.add(ft); return b; };
      const eInst = (grp, n) => { const m = new THREE.InstancedMesh(new THREE.SphereGeometry(0.12, 12, 8), mat(0x42e8ff, { emissive: 0x00a9c0, emissiveIntensity: 0.9 }), n); m.frustumCulled = false; grp.add(m); return m; };
      /* 볼타 전지: Zn · 소금물 천 · Cu 를 쌓은 더미 */
      const VR = 1.5, VY0 = -2.4, LAY = [[0.2, 0xaab4c2, 'Zn'], [0.38, 0xe6d6a8, '소금물 천'], [0.2, 0xd9824c, 'Cu']];
      let vy = VY0; const vpts = [];
      for (let k = 0; k < 4; k++) LAY.forEach(([h, c]) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(VR, VR, h, 40), mat(c, { metalness: c === 0xe6d6a8 ? 0.05 : 0.8, roughness: c === 0xe6d6a8 ? 0.9 : 0.35 })); m.position.y = vy + h / 2; D.add(m); vy += h; });
      const vTop = vy;
      const vw = new THREE.CatmullRomCurve3([new V3(VR, VY0 + 0.1, 0), new V3(VR + 1.4, VY0 + 0.1, 0), new V3(VR + 1.4, vTop + 0.9, 0), new V3(0.6, vTop + 0.9, 0), new V3(0.6, vTop + 0.1, 0)], false, 'catmullrom', 0.02);
      D.add(new THREE.Mesh(new THREE.TubeGeometry(vw, 60, 0.05, 8, false), wireM()));
      const vb = bulbOf(D, VR + 1.4, (VY0 + vTop) / 2 + 0.2); const vE = eInst(D, 9);
      const labD = [label('Cu판', [VR + 0.1, vTop - 0.1, 0], { color: 'rgba(217,119,6,.95)' }), label('소금물 적신 천', [-VR - 0.3, (VY0 + vTop) / 2, 0], { color: 'rgba(120,90,30,.95)' }), label('Zn판', [-VR - 0.1, VY0 + 0.3, 0], { color: 'rgba(100,116,139,.95)' })];
      /* 다니엘 전지 */
      const DX = 2.5, DR = 1.25, DH = 3.0, DY = -2.2;
      [[-DX, 0xd9dfe8, 0.25, 0xaab4c2], [DX, 0x4aa8ff, 0.5, 0xd9824c]].forEach(([x, c, o, pc]) => {
        const gl = new THREE.Mesh(new THREE.CylinderGeometry(DR, DR, DH, 56, 1, true), MT.glass({ tint: 0xcfe8ff, opacity: 0.2 })); gl.position.set(x, DY + DH / 2, 0); E.add(gl);
        const li = new THREE.Mesh(new THREE.CylinderGeometry(DR - 0.04, DR - 0.04, DH * 0.78, 56), MT.liquid(c, { opacity: o })); li.position.set(x, DY + DH * 0.39, 0); E.add(li);
        const pl2 = new THREE.Mesh(new THREE.BoxGeometry(0.26, 3.6, 1.2), mat(pc, { metalness: 0.85, roughness: 0.32 })); pl2.position.set(x + (x < 0 ? -0.2 : 0.2), DY + 1.4, 0); E.add(pl2);
      });
      const dbp = [new V3(-DX + 0.5, DY + 1.0, 0), new V3(-DX + 0.7, DY + DH + 0.6, 0), new V3(-1.0, DY + DH + 1.0, 0), new V3(1.0, DY + DH + 1.0, 0), new V3(DX - 0.7, DY + DH + 0.6, 0), new V3(DX - 0.5, DY + 1.0, 0)];
      const dbc = new THREE.CatmullRomCurve3(dbp, false, 'catmullrom', 0.3);
      E.add(new THREE.Mesh(new THREE.TubeGeometry(dbc, 72, 0.3, 24, false), MT.glass({ tint: 0xfff1b8, opacity: 0.42 })));
      const dwY = DY + DH + 2.4, dw = new THREE.CatmullRomCurve3([new V3(-DX - 0.2, DY + 3.2, 0), new V3(-DX - 0.2, dwY, 0), new V3(-0.8, dwY, 0), new V3(0.8, dwY, 0), new V3(DX + 0.2, dwY, 0), new V3(DX + 0.2, DY + 3.2, 0)], false, 'catmullrom', 0.02);
      E.add(new THREE.Mesh(new THREE.TubeGeometry(dw, 60, 0.05, 8, false), wireM()));
      const db = bulbOf(E, 0, dwY + 0.05); const dE = eInst(E, 10);
      const labE = [label('Zn판 · ZnSO₄(aq)', [-DX, DY - 0.5, 0], { color: 'rgba(100,116,139,.95)' }), label('Cu판 · CuSO₄(aq)', [DX, DY - 0.5, 0], { color: 'rgba(217,119,6,.95)' }), label('염다리', [0, DY + DH + 1.5, 0], { color: 'rgba(161,98,7,.92)' })];
      [...labD, ...labE].forEach((l) => l.show(false));
      /* 효율 탐색: 한 용기에 금속판 두 개 + 전구 */
      const XW = 7.4, XD = 3.0, XH = 3.6, XY = -2.4, XLV = 0.7;
      { const bx = new THREE.Mesh(new THREE.BoxGeometry(XW, XH, XD), MT.glass({ tint: 0xcfe8ff, opacity: 0.16 })); bx.position.set(0, XY + XH / 2, 0); X.add(bx);
        const bn = new THREE.Mesh(rslab(XW + 5, XD + 4, 0.36, 0.08), MT.wood(0xa88962, { repeat: 0.22 })); bn.position.set(0, XY - 0.2, 0); bn.userData.v3bg = true; X.add(bn);   // 실험대
        const ed = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(XW, XH, XD)), new THREE.LineBasicMaterial({ color: 0x8aa0c8 })); ed.position.copy(bx.position); X.add(ed); }
      const xLiq = new THREE.Mesh(new THREE.BoxGeometry(XW - 0.1, XH * XLV, XD - 0.1), MT.liquid(0xbfdbfe, { opacity: 0.45 })); xLiq.position.set(0, XY + XH * XLV / 2, 0); X.add(xLiq);
      const PC3 = { Zn: 0xaab4c2, Mg: 0xd6dde6, Cu: 0xc8743a, Fe: 0x7f8a99 };
      const xP = [0, 1].map(() => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.28, 1, 1.5), MT.metal(0xaab4c2, { brushed: true })); X.add(m); return m; });
      const xWire = new THREE.Mesh(new THREE.BoxGeometry(1, 0.06, 0.06), MT.metal('copper')); X.add(xWire);
      const xW1 = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1, 12), MT.metal('copper')), xW2 = xW1.clone(); X.add(xW1, xW2);
      const xb = bulbOf(X, 0, XY + XH + 1.9); const xE = eInst(X, 14);
      const NIX = 36, xI = new THREE.InstancedMesh(new THREE.SphereGeometry(0.12, 12, 8), mat(0xffffff), NIX); xI.frustumCulled = false; xI.instanceMatrix.setUsage(THREE.DynamicDrawUsage); X.add(xI);
      const XIP = Array.from({ length: NIX }, () => ({ x: Math.random(), y: Math.random(), z: Math.random(), ph: Math.random() * 6.28, sp: 0.4 + Math.random() * 0.8 }));
      const lXn = label('', [0, 0, 0], { color: 'rgba(220,38,38,.92)' }), lXp = label('', [0, 0, 0], { color: 'rgba(37,99,235,.92)' }), lXi = label('', [-2.6, XY + XH + 2.8, 0], { color: 'rgba(29,78,216,.92)' }), lXv = label('', [2.6, XY + XH + 2.8, 0], { color: 'rgba(185,28,28,.92)' }), lXe = label('', [0, XY - 0.6, 0], { color: 'rgba(30,41,59,.92)' }), lXb = label('전구 R = 10 Ω', [0, XY + XH + 2.6, 0], { color: 'rgba(30,41,59,.9)' });
      [lXn, lXp, lXi, lXv, lXe, lXb].forEach((l) => l.show(false));
      const Mx = new THREE.Matrix4(), Cx = new THREE.Color();
      const xcl = (sel, v) => { const b = document.querySelector(sel); if (b) b.click(); };
      function updExplore(w, t) {
        const e = w.S.ex, P = w.PAIRS[e.pair], El = w.ELS[e.el], A = { S: 5, M: 10, L: 20 }[e.size], r = w.exR(), I = w.exI(), V = w.exV();
        const sep = (e.d / 4) * (XW - 2.6) * 0.8 + 0.8, px = [-sep / 2, sep / 2], ph = 0.5 * Math.sqrt(A) * 0.9 + 0.2, top = XY + XH + 0.5, ymin = XY + 0.25;
        [P.a, P.b].forEach((m, i) => { const pm = xP[i], hh = top - ymin; pm.scale.set(1, hh, { S: 0.62, M: 0.95, L: 1.35 }[e.size]); pm.position.set(px[i], ymin + hh / 2, 0); pm.material.color.setHex(PC3[m]); });
        // 판 크기 = 잠긴 부분의 높이: 얇은 띠로 표시 (잠긴 길이 ph)
        const wy = XY + XH + 1.0;
        xW1.scale.set(1, 1.0, 1); xW1.position.set(px[0], top + 0.5, 0); xW2.scale.set(1, 1.0, 1); xW2.position.set(px[1], top + 0.5, 0);
        xWire.scale.set(sep + 0.1, 1, 1); xWire.position.set(0, top + 1.0, 0);
        xLiq.material.color.setHex(e.el === 'lemon' ? 0xfde68a : e.el === 'dist' ? 0xe0f2fe : 0xbfdbfe); xLiq.material.opacity = e.el === 'dist' ? 0.25 : 0.45;
        xb.position.set(0, top + 1.0, 0); const lit = Math.max(0, Math.min(1, Math.sqrt(e.I * e.I * 10 / 0.1)));
        xb.material.emissiveIntensity = 0.1 + 0.9 * lit; xb.material.opacity = 0.5 + 0.35 * lit; xb.userData.h.material.opacity = 0.7 * lit;
        const path = [new V3(px[0], top + 0.5, 0), new V3(px[0], top + 1.0, 0), new V3(-0.55, top + 1.0, 0), new V3(0.55, top + 1.0, 0), new V3(px[1], top + 1.0, 0), new V3(px[1], top + 0.5, 0)];
        const seg = []; let tot = 0; for (let i = 1; i < path.length; i++) { const d = path[i].distanceTo(path[i - 1]); seg.push(d); tot += d; }
        const nE = Math.round(6 + 8 * Math.min(1, e.flow));
        for (let i = 0; i < 14; i++) {
          if (i >= nE || e.flow < 0.03) { Mx.makeScale(0.0001, 0.0001, 0.0001); xE.setMatrixAt(i, Mx); continue; }
          let d = (((i / nE) + t * 0.2 * e.flow) % 1) * tot, k = 0; while (k < seg.length - 1 && d > seg[k]) { d -= seg[k]; k++; }
          const a = path[k], b = path[k + 1], f = seg[k] ? d / seg[k] : 0; Mx.makeTranslation(a.x + (b.x - a.x) * f, a.y + (b.y - a.y) * f, 0.15); xE.setMatrixAt(i, Mx);
        }
        xE.instanceMatrix.needsUpdate = true;
        const nI = Math.min(NIX, El.ions * 2);
        XIP.forEach((q, i) => {
          if (i >= nI) { Mx.makeScale(0.0001, 0.0001, 0.0001); xI.setMatrixAt(i, Mx); return; }
          const x = (q.x - 0.5) * (XW - 0.6) + Math.sin(t * q.sp + q.ph) * 0.15, y = XY + 0.3 + q.y * (XH * XLV - 0.6) + Math.cos(t * q.sp * 1.2 + q.ph) * 0.1, z = (q.z - 0.5) * (XD - 0.5);
          Mx.makeTranslation(x, y, z); xI.setMatrixAt(i, Mx); xI.setColorAt(i, Cx.setHex(i % 2 ? 0xa855f7 : 0xf59e0b));
        });
        xI.instanceMatrix.needsUpdate = true; if (xI.instanceColor) xI.instanceColor.needsUpdate = true;
        lXn.show(true); lXn.obj = [px[0], top + 0.1, 0]; lXn.set('− ' + P.a); lXp.show(true); lXp.obj = [px[1], top + 0.1, 0]; lXp.set('+ ' + P.b);
        lXi.show(true); lXi.set('전류 I = ' + w.fI(I) + ' A'); lXv.show(true); lXv.set('전압 V = ' + w.fV(V) + ' V');
        lXe.show(true); lXe.set(El.name + ' · 극 사이 ' + e.d + ' cm · 판 ' + ({ S: '작게', M: '보통', L: '크게' })[e.size]); lXb.show(true); lXb.obj = [0, top + 1.7, 0];
        return '<b>' + P.label + ' · ' + El.name + '</b><br>기전력 E ' + P.E.toFixed(2) + ' V (금속 쌍이 정해요)<br>내부 저항 r ' + (Math.round(r * 10) / 10) + ' Ω (이온 · 거리 · 크기가 정해요)<br>I = E / (R + r) = ' + w.fI(I) + ' A · 기록한 조건 ' + e.rec.length + '개';
      }
      const exPair = grab(() => controls.segment('금속 쌍', [{ value: 'ZnCu', label: 'Zn–Cu' }, { value: 'MgCu', label: 'Mg–Cu' }, { value: 'ZnFe', label: 'Zn–Fe' }, { value: 'FeCu', label: 'Fe–Cu' }], 'ZnCu', (v) => xcl('#exPair button[data-v="' + v + '"]')));
      const exEl = grab(() => controls.segment('전해질', [{ value: 'dist', label: '증류수' }, { value: 'lemon', label: '레몬즙' }, { value: 'brine', label: '소금물' }, { value: 'brine2', label: '진한 소금물' }], 'brine2', (v) => xcl('#exEl button[data-v="' + v + '"]')));
      const exD = grab(() => controls.range('극 사이 거리', 1, 4, 1, 2, (v) => { const i = document.getElementById('exD'); if (i) { i.value = v; i.dispatchEvent(new Event('input')); } }, (v) => v + ' cm'));
      const exSz = grab(() => controls.segment('판 크기', [{ value: 'S', label: '작게' }, { value: 'M', label: '보통' }, { value: 'L', label: '크게' }], 'M', (v) => xcl('#exSize button[data-v="' + v + '"]')));
      const exRec = grab(() => controls.button('📝 기록하기', () => { const b = document.getElementById('bExRec'); if (b) b.click(); }));
      const vis = (g, on) => g.els.forEach((e) => { e.style.display = on ? '' : 'none'; });
      const KIND_OF = { volta: 'volta', daniell: 'daniell', lead: 'pb', mn: 'mn', alk: 'mn', li: 'li' };
      const USK = { car: 'pb', remote: 'mn', clock: 'mn', phone: 'li', ev: 'li' };
      const TLINFO = { volta: 'Zn판 · 소금물 적신 천 · Cu판을 번갈아 쌓은 더미예요.', daniell: '두 용액을 분리하고 염다리로 이은 전지예요.', lead: 'Pb판 · PbO₂판 · 묽은 황산으로 된 충전식 전지예요.', mn: 'Zn 통 · MnO₂ · NH₄Cl 풀로 된 건전지예요.', alk: 'Zn · MnO₂ · KOH 전해질로 된 건전지예요 (구조는 망가니즈 건전지와 비슷해요).', li: '흑연 | 분리막 | 리튬 코발트 산화물로 된 충전식 전지예요.' };
      let scene = '', lastUse = 'pb', lastTl = 'volta';
      function applyScene(sc, k) {
        const key = sc + ':' + k; if (key === scene) return; scene = key;
        const ex = sc === 'explore', vd = k === 'volta', ed = k === 'daniell';
        D.visible = !ex && vd; E.visible = !ex && ed; X.visible = ex;
        A.visible = !ex && k === 'mn'; B.visible = !ex && k === 'li'; C.visible = !ex && k === 'pb';
        if (!ex && !vd && !ed) kind = k;
        baseEls.list.forEach((e2) => { e2.style.display = ex || vd || ed ? 'none' : ''; });
        [exPair, exEl, exD, exSz, exRec].forEach((g2) => vis(g2, ex));
        labD.forEach((l) => l.show(!ex && vd)); labE.forEach((l) => l.show(!ex && ed));
        [lXn, lXp, lXi, lXv, lXe, lXb].forEach((l) => l.show(ex));
        labsA.forEach((l) => l.show(!ex && showLab && k === 'mn')); labsB.forEach((l) => l.show(!ex && showLab && k === 'li')); labsC.forEach((l) => l.show(!ex && showLab && k === 'pb'));
        const o = ctx.orbit; if (ex) { o.dist = PHONE ? 15 : 13.5; o.tx = 0; o.ty = 0.2; o.theta = 0.2; o.phi = 1.3; } else { o.dist = PHONE ? 17 : 12.5; o.tx = 0; o.ty = 0.6; o.theta = 0.35; o.phi = 1.2; }
        txt = '';
      }
      function updFlowSimple(t, tgtE, curve, n, active) { for (let i = 0; i < n; i++) { if (!active) { Mx.makeScale(0.0001, 0.0001, 0.0001); tgtE.setMatrixAt(i, Mx); continue; } const u = (((i / n) + t * 0.12) % 1 + 1) % 1, p = curve.getPointAt(u); Mx.makeTranslation(p.x, p.y, p.z); tgtE.setMatrixAt(i, Mx); } tgtE.instanceMatrix.needsUpdate = true; }
      let txt = '', demoMode = null;
      const pl = controls.player({
        duration: 8, loop: true, autoplay: false, label: '방전 ↔ 충전 재생',
        phases: [[0, '방전 (사용)'], [0.5, '충전']],
        onFrame(p) { demoMode = p < 0.5 ? 'dis' : 'chg'; },
      });
      const demoOn = () => pl.playing || pl.p > 0.0005;
      const KMAP = { mn: 'mn', alk: 'mn', pb: 'pb', lead: 'pb', li: 'li' };
      const NAME = { mn: '망가니즈 건전지', pb: '납 축전지', li: '리튬 이온 전지' };
      function read2D() {
        const w = window.__sim, S2 = w && w.S; const r = { md: '', k: kind, mode: 'dis', chosen: true, alk: false };
        if (!S2) return r;
        r.md = S2.mode;
        if (S2.mode === 'compare' && S2.cm) { r.k = KMAP[S2.cm.cell] || kind; }
        else if (S2.mode === 'classify' && S2.cf && S2.cf.sub === 'cycle') {
          const c = S2.cf; r.k = KMAP[c.bat] || kind; r.mode = c.mode === 'chg' ? 'chg' : 'dis'; r.alk = c.bat === 'alk';
          r.chosen = !!(c.dir && c.dir[c.bat] && c.dir[c.bat][c.mode]);
        }
        return r;
      }
      const ionLoop = (inst, arr, dir, fn) => arr.forEach((q, i) => { q.u = ((q.u + dir * 0.0016) % 1 + 1) % 1; fn(q, i, inst); });
      /* 📝 기록 표 (2D 오른쪽 아래 표와 같아요): “기록하기”를 누를 때마다 한 줄씩 채워져요 */
      const recEl = document.createElement('div'); recEl.className = 'hpc-rec'; ctx.renderer.domElement.parentElement.appendChild(recEl);
      if (!document.getElementById('hpc-rec-css')) { const cs = document.createElement('style'); cs.id = 'hpc-rec-css'; cs.textContent =
        '.hpc-rec{position:absolute;right:10px;bottom:36px;max-width:62%;padding:6px 8px;border-radius:12px;background:rgba(8,12,24,.8);color:#e5e7eb;font-size:11.5px;font-weight:700;pointer-events:none;z-index:3}' +
        '.hpc-rec .h{font-weight:900;margin-bottom:3px;color:#fde68a}.hpc-rec table{border-collapse:collapse}.hpc-rec th,.hpc-rec td{padding:1px 5px;text-align:left;white-space:nowrap}.hpc-rec th{color:#94a3b8;font-weight:800}.hpc-rec .e{color:#94a3b8}' +
        '@media (max-width:599px){.hpc-rec{font-size:10px;right:6px;bottom:30px;max-width:72%;padding:4px 5px}.hpc-rec th,.hpc-rec td{padding:0 3px}}';
        document.head.appendChild(cs); }
      let recSig = null;
      function drawRec(on, w2) {
        const e = on && w2 && w2.S && w2.S.ex, sig = e ? JSON.stringify(e.rec) : ''; if (sig === recSig) return; recSig = sig;
        if (!e) { recEl.style.display = 'none'; return; }
        recEl.style.display = '';
        const P = w2.PAIRS, E2 = w2.ELS, Z = { S: '작게', M: '보통', L: '크게' }, rows = e.rec.slice(-(PHONE ? 3 : 4));
        recEl.innerHTML = '<div class="h">📝 기록 ' + e.rec.length + '개 · 금속 쌍 ' + w2.exPairsN() + '종 · 내부 저항 ' + w2.exRN() + '가지</div>' + (rows.length ? '<table><tr><th>금속 쌍</th><th>전해질</th>' + (PHONE ? '' : '<th>거리</th><th>크기</th>') + '<th>r(Ω)</th><th>I(A)</th><th>V(V)</th></tr>' +
          rows.map((q) => '<tr><td>' + P[q.pair].label.replace(/ /g, '') + '</td><td>' + E2[q.el].name + '</td>' + (PHONE ? '' : '<td>' + q.d + ' cm</td><td>' + Z[q.size] + '</td>') + '<td>' + (Math.round(q.r * 10) / 10) + '</td><td>' + w2.fI(q.I) + '</td><td>' + w2.fV(q.V) + '</td></tr>').join('') + '</table>' : '<div class="e">조건을 정하고 [📝 기록하기]를 눌러 표를 채워요.</div>');
      }
      return {
        update(dt, t) {
          dt = Math.min(dt, 0.05);
          const r = read2D(), w2 = window.__sim, S2 = w2 && w2.S;
          drawRec(r.md === 'explore', w2);
          let sc = r.md === 'explore' ? 'explore' : 'bat', kk = r.k;
          if (r.md === 'timeline' && S2 && S2.tl) { const tid = S2.tl.drag ? S2.tl.drag.c.id : S2.tl.sel; if (tid) lastTl = tid; kk = KIND_OF[lastTl] || 'volta'; }
          else if (r.md === 'classify' && S2 && S2.cf && S2.cf.sub !== 'cycle') { if (S2.cf.drag && S2.cf.drag.c) lastUse = USK[S2.cf.drag.c.id] || lastUse; kk = lastUse; }
          applyScene(sc, kk);
          if (sc === 'explore') { const h = updExplore(w2, t); if (h !== txt) { txt = h; info(h); } const e = S2.ex; exPair.r.set(e.pair); exEl.r.set(e.el); exD.r.set(e.d); exSz.r.set(e.size); return; }
          if (kk === 'volta' || kk === 'daniell') {
            const flowOn = true;
            if (kk === 'volta') { updFlowSimple(t, vE, vw, 9, flowOn); vb.material.emissiveIntensity = 0.5 + 0.2 * Math.sin(t * 5); }
            else { updFlowSimple(t, dE, dw, 10, flowOn); db.material.emissiveIntensity = 0.8; }
            const tx2 = '<b>' + (kk === 'volta' ? '볼타 전지' : '다니엘 전지') + ' 구조</b><br>' + TLINFO[kk] + '<br>전자: (−)극 Zn판 → 도선 → (+)극 Cu판';
            if (tx2 !== txt) { txt = tx2; info(tx2); }
            return;
          }
          if (r.md === 'timeline') { if (kk !== kind) setKind(kk); }
          else if (r.md === 'classify' && S2.cf.sub !== 'cycle') { if (kk !== kind) setKind(kk); }
          else if (r.k !== kind) { setKind(r.k); }
          if (r.md === 'timeline') r.chosen = true;
          if (r.md === 'classify' && S2.cf.sub !== 'cycle') r.chosen = true;
          let mode = r.mode, active = r.chosen;
          if (demoOn() && demoMode) { mode = demoMode; active = true; }
          const primary = kind === 'mn';
          if (primary && mode === 'chg') active = false;          // 1차 전지는 충전할 수 없어요
          const dir = mode === 'dis' ? 1 : -1;
          if (kind === 'mn') {
            for (let i = 0; i < NE; i++) { if (!active) { hide(em, i); continue; } const u = ((((i / NE) - t * 0.12) % 1) + 1) % 1; const p = wcur.getPointAt(Math.min(1, 1 - u)); M.makeTranslation(p.x, p.y, p.z); em.setMatrixAt(i, M); }
            em.instanceMatrix.needsUpdate = true;
            bulb.material.emissiveIntensity = active ? 0.8 + 0.2 * Math.sin(t * 6) : 0.08; bl.material.opacity = active ? 0.65 : 0.04;
          } else if (kind === 'li') {
            for (let i = 0; i < NE; i++) { if (!active) { hide(eB, i); continue; } const u = ((((i / NE) + dir * t * 0.14) % 1) + 1) % 1; const p = wB.getPointAt(u); M.makeTranslation(p.x, p.y, p.z); eB.setMatrixAt(i, M); }
            eB.instanceMatrix.needsUpdate = true;
            LP.forEach((q, i) => { if (active) q.u = ((q.u + dir * dt * 0.1) % 1 + 1) % 1; const x = -SX + 0.95 + (SX * 2 - 1.9) * q.u; M.makeTranslation(x, q.y + Math.sin(t * 2 + i) * 0.1, q.z); lm.setMatrixAt(i, M); });
            lm.instanceMatrix.needsUpdate = true;
            devL.material.emissiveIntensity = active ? (mode === 'dis' ? 0.9 : 0.1) : 0.05; devL.material.color.setHex(mode === 'dis' ? 0xffc83d : 0x5de08a);
          } else {
            for (let i = 0; i < NE; i++) { if (!active) { hide(eC, i); continue; } const u = ((((i / NE) + dir * t * 0.14) % 1) + 1) % 1; const p = wB.getPointAt(u); M.makeTranslation(p.x, p.y, p.z); eC.setMatrixAt(i, M); }
            eC.instanceMatrix.needsUpdate = true;
            IP.forEach((q, i) => {
              if (active) q.u = ((q.u + dir * dt * 0.1) % 1 + 1) % 1;
              const xh = -SX + 0.95 + (SX * 2 - 1.9) * q.u, xs = SX - 0.95 - (SX * 2 - 1.9) * q.u;      // H⁺: (−) → (+), SO₄²⁻: (+) → (−) (방전)
              M.makeTranslation(xh, q.y + Math.sin(t * 2 + i) * 0.1, q.z); hI.setMatrixAt(i, M);
              M.makeTranslation(xs, q.y + 0.2 + Math.cos(t * 2 + i) * 0.1, -q.z); sI.setMatrixAt(i, M);
            });
            hI.instanceMatrix.needsUpdate = true; sI.instanceMatrix.needsUpdate = true;
            devLC.material.emissiveIntensity = active ? (mode === 'dis' ? 0.9 : 0.1) : 0.05; devLC.material.color.setHex(mode === 'dis' ? 0xffc83d : 0x5de08a);
          }
          let tx;
          if (kind === 'mn') tx = '<b>망가니즈 건전지 (1차 전지)</b><br>(−)극 아연 통이 산화돼 전자를 내보내고, (+)극 MnO₂ + 탄소 막대 쪽에서 전자를 받아요.<br>한 번 쓰면 충전할 수 없어요.' + (r.alk ? '<br>알칼리 건전지도 Zn–MnO₂ 1차 전지예요.' : '') + (mode === 'chg' ? '<br><b style="color:#fca5a5">1차 전지는 충전할 수 없어요. 충전하면 위험해요.</b>' : '');
          else if (kind === 'pb') tx = mode === 'dis' ? '<b>납 축전지 · 방전 (2차 전지)</b><br>(−)극 Pb, (+)극 PbO₂, 전해질 묽은 황산<br>전자: (−)극 → 외부 회로 → (+)극' : '<b>납 축전지 · 충전</b><br>충전기가 전자를 거꾸로 밀어 줘요.<br>전자와 이온이 모두 방전 때와 반대로 움직여요.';
          else tx = mode === 'dis' ? '<b>리튬 이온 전지 · 방전 (2차 전지)</b><br>Li⁺: 흑연 → 리튬 코발트 산화물 (분리막 통과)<br>전자: (−)극 → 외부 회로 → (+)극' : '<b>리튬 이온 전지 · 충전</b><br>충전기가 전자를 거꾸로 밀어 줘요.<br>Li⁺와 전자 모두 방전 때와 반대로 움직여요 (2차 전지).';
          if (r.md === 'classify' && !r.chosen && !demoOn()) tx += '<br><span style="color:#ffd34d">전자의 이동 방향을 고르면 전자 흐름을 보여 줘요.</span>';
          else if (r.md === 'timeline') tx += '<br><span style="color:#9fb0d4">카드를 고르면 그 전지의 구조를 보여 줘요.</span>';
          else if (r.md === 'classify' && S2.cf.sub !== 'cycle') tx += '<br><span style="color:#9fb0d4">끌고 있는 쓰임새 카드에 알맞은 전지 구조예요.</span>';
          if (tx !== txt) { txt = tx; info(tx); }
        },
      };
    },
  });
})();
