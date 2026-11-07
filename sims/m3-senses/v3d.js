/* m3-senses · 3D 눈과 귀의 구조
   눈: 홍채가 동공 크기로 빛의 양을, 수정체의 두께가 초점(거리)을 조절해요. 상은 망막에 거꾸로 맺혀요.
   귀: 소리(공기의 진동) → 고막 → 귓속뼈 → 달팽이관 → 청각 신경 → 뇌 */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHN = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  window.SciSim3D.attach({
    host: '.stage-card',
    title: '눈과 귀의 구조 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: PHN ? 17 : 12.5, theta: 0.0, phi: 1.3, min: 5, max: 26, target: [-1.2, 0, 0] },
    autoRotate: 0,
    levels: [1],              // 2단계(눈의 조절: 밝기 · 거리 슬라이더)만 3D. 맹점 실험(● 끌기) · 감각 세포 이름표 누르기 · 감각 기관 칸 고르기는 2D. 3D 단계에서는 맹점 장면 단추를 숨겨요(only2d)
    build(ctx) {
      const { THREE, root, label, info, controls, orbit } = ctx;
      const V3 = THREE.Vector3;
      let mode = 'eye', bright = 50, dist = 50, loud = 60, names = true;
      const sm = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.45, metalness: 0, side: THREE.DoubleSide }, o || {}));
      const eye = new THREE.Group(), ear = new THREE.Group(); root.add(eye, ear);
      const labs = { eye: [], ear: [] };
      const L = (grp, text, pos, col) => { const l = label(text, pos, { size: 12, color: col || 'rgba(15,23,42,.9)' }); labs[grp].push(l); return l; };
      const half = (geo) => geo; // z<0 쪽 반만 만들어서 단면을 보여 줘요
      /* ================= 눈 ================= */
      const R = 1.7;
      const sc = new THREE.SphereGeometry(R, 64, 40, Math.PI, Math.PI); sc.rotateZ(-Math.PI / 2);
      eye.add(new THREE.Mesh(sc, sm(0xf1efe8, { roughness: 0.6 })));
      const ch = new THREE.SphereGeometry(R - 0.05, 64, 40, Math.PI, Math.PI, 0, 2.05); ch.rotateZ(-Math.PI / 2);
      eye.add(new THREE.Mesh(ch, sm(0x5b2b2b, { roughness: 0.7 })));
      const rt = new THREE.SphereGeometry(R - 0.1, 64, 40, Math.PI, Math.PI, 0, 1.75); rt.rotateZ(-Math.PI / 2);
      eye.add(new THREE.Mesh(rt, sm(0xf08a8a, { roughness: 0.55, emissive: 0x5a1a1a, emissiveIntensity: 0.35 })));
      const cornea = new THREE.Mesh(new THREE.SphereGeometry(0.95, 40, 28, Math.PI, Math.PI), sm(0xbfe9ff, { transparent: true, opacity: 0.38, roughness: 0.05, depthWrite: false })); cornea.position.set(-0.8, 0, 0); eye.add(cornea);
      const vit = new THREE.Mesh(new THREE.SphereGeometry(R - 0.12, 40, 28, Math.PI, Math.PI), sm(0xc7f0ff, { transparent: true, opacity: 0.1, depthWrite: false })); eye.add(vit);
      let iris = null;
      function makeIris() { if (iris) { eye.remove(iris); iris.geometry.dispose(); } const pr = 0.12 + (1 - bright / 100) * 0.34 + 0.08; const g = new THREE.RingGeometry(pr, 0.92, 48, 1, Math.PI, Math.PI); g.rotateY(Math.PI / 2); iris = new THREE.Mesh(g, sm(0x3b82c4, { roughness: 0.35 })); iris.position.x = -0.92; eye.add(iris); return pr; }
      const lens = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 28, Math.PI, Math.PI), sm(0xfde68a, { transparent: true, opacity: 0.62, roughness: 0.15, depthWrite: false })); lens.position.x = -0.55; eye.add(lens);
      const cil = [-1, 1].map((s) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.24), sm(0xb45309)); m.position.set(-0.6, s * 0.95, -0.12); eye.add(m); return m; });
      const nerve = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.2, 1.8, 20), sm(0xfacc15, { roughness: 0.5 })); nerve.rotation.z = Math.PI / 2; nerve.position.set(R + 0.7, -0.35, -0.05); eye.add(nerve);
      const nerveEnd = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), sm(0xfacc15)); nerveEnd.position.set(R + 1.6, -0.35, -0.05); eye.add(nerveEnd);
      /* 물체와 상 */
      const obj = new THREE.Group(); const om = sm(0xef4444, { roughness: 0.4 });
      const oS = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.2, 12), om); oS.position.y = 0.6; const oH = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.4, 16), om); oH.position.y = 1.4; obj.add(oS, oH); obj.position.set(-6.2, -0.2, -0.0); eye.add(obj);
      const img = obj.clone(); img.scale.set(0.3, -0.3, 0.3); img.position.set(R - 0.2, 0.35, -0.0); eye.add(img);
      const rayM = new THREE.MeshBasicMaterial({ color: 0xfde047 }); const rays = new THREE.Group(); eye.add(rays);
      function setRays(pr) {
        while (rays.children.length) { rays.children[0].geometry.dispose(); rays.remove(rays.children[0]); }
        const P0 = new V3(obj.position.x, 1.2 + obj.position.y, 0), F = new V3(R - 0.2, 1.4 * 0.3 * -1 + 0.35 + 0.0, 0).setY(img.position.y - 1.4 * 0.3);
        const lensX = lens.position.x;
        [-0.55, -0.28, 0, 0.28, 0.55].forEach((yi) => {
          const blocked = Math.abs(yi) > pr + 0.02;
          const pts = blocked ? [P0, new V3(-0.92, yi, 0)] : [P0, new V3(-0.92, P0.y + (yi - P0.y) * (P0.x + 0.92) / (P0.x - lensX), 0), new V3(lensX, yi, 0), F];
          const c = new THREE.CatmullRomCurve3(pts.length > 2 ? [pts[0], pts[1].clone().lerp(pts[0], 0.0), pts[2], pts[3]] : pts, false, 'catmullrom', 0);
          const g = new THREE.TubeGeometry(new THREE.LineCurve3(pts[0], pts[1]), 2, 0.016, 5, false); const m = new THREE.Mesh(g, rayM); rays.add(m);
          if (!blocked) { rays.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.LineCurve3(pts[1], pts[2]), 2, 0.016, 5, false), rayM)); rays.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.LineCurve3(pts[2], pts[3]), 2, 0.016, 5, false), rayM)); }
        });
      }
      let sharpNow = null;
      function eyeUpdate() {
        const pr = makeIris();
        const near = dist / 100;                         // 0: 먼 곳, 1: 가까운 곳
        lens.scale.set(0.2 + 0.2 * near, 0.62, 0.62); cil.forEach((m) => { m.position.y = Math.sign(m.position.y) * (0.95 - 0.12 * near); });
        obj.position.x = -6.4 + (1 - near) * -0 + near * 2.6; const s = 1 - near * 0.1; obj.scale.setScalar(1);
        setRays(pr - 0.06);
        info('<b>눈</b> · 어두우면 동공이 커지고, 밝으면 작아져요.<br>가까운 물체를 볼 때 수정체가 <b>두꺼워져요</b>(섬모체 수축).<br>상은 망막에 <b>거꾸로</b> 맺혀 시각 신경으로 가요.' + (sharpNow == null ? '' : '<br>망막의 상: ' + (sharpNow ? '<b style="color:#86efac">선명해요!</b>' : '<b style="color:#fcd34d">흐릿해요</b> (수정체 두께가 바뀌는 중)')));
      }
      [['각막', [-1.75, 0.35, -0.2]], ['홍채', [-0.95, 1.0, -0.2]], ['수정체', [-0.55, 0.0, 0.0]], ['섬모체', [-0.6, -1.12, -0.12]], ['망막', [R * 0.7, -1.18, 0.0]], ['시각 신경', [R + 1.0, -0.35, 0.0]]].forEach(([t, p]) => L('eye', t, p));
      /* ================= 귀 ================= */
      const tube = (pts, r, c, o) => { const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new V3(p[0], p[1], p[2]))), 64, r, 12, false), sm(c, o)); return m; };
      const pinna = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.2, 14, 40, 4.6), sm(0xf3b79a)); pinna.rotation.y = Math.PI / 2; pinna.rotation.z = 0.9; pinna.position.set(-5.3, 0.1, 0); ear.add(pinna);
      const funnel = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.82, 0.9, 28, 1, true), sm(0xf3b79a, { transparent: true, opacity: 0.8 })); funnel.rotation.z = Math.PI / 2; funnel.position.set(-5.0, 0, 0); ear.add(funnel);
      const canal = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 2.6, 28, 1, true), sm(0xf3b79a, { transparent: true, opacity: 0.45, depthWrite: false })); canal.rotation.z = Math.PI / 2; canal.position.set(-3.6, 0, 0); ear.add(canal);
      const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.05, 32), sm(0xe9d5ff, { emissive: 0x6d28d9, emissiveIntensity: 0.25 })); drum.rotation.z = Math.PI / 2; drum.position.set(-2.3, 0, 0); ear.add(drum);
      const cav = new THREE.Mesh(new THREE.SphereGeometry(1.0, 32, 24), sm(0xfda4af, { transparent: true, opacity: 0.2, depthWrite: false })); cav.scale.set(1.15, 1, 0.9); cav.position.set(-1.35, 0.0, 0); ear.add(cav);
      const bone = (x, y, w, h, c) => { const m = new THREE.Mesh(new THREE.CapsuleGeometry(w, h, 4, 12), sm(c, { roughness: 0.3, metalness: 0.2 })); m.position.set(x, y, 0); return m; };
      const b1 = bone(-2.0, 0, 0.07, 0.35, 0xfef08a), b2 = bone(-1.45, 0.2, 0.09, 0.3, 0xfde047), b3 = bone(-0.95, 0.0, 0.07, 0.3, 0xfacc15); b1.rotation.z = 0.2; b2.rotation.z = Math.PI / 2 - 0.3; b3.rotation.z = Math.PI / 2; ear.add(b1, b2, b3);
      const eust = tube([[-1.3, -0.7, 0], [-1.6, -1.4, 0.1], [-2.2, -2.2, 0.2], [-2.5, -2.8, 0.3]], 0.16, 0x93c5fd, { transparent: true, opacity: 0.6 }); ear.add(eust);
      /* 달팽이관 */
      const cochlea = new THREE.Group(); const sp = []; for (let i = 0; i <= 120; i++) { const a = i / 120 * Math.PI * 5, r = 0.85 - i / 120 * 0.5; sp.push(new V3(Math.cos(a) * r, i / 120 * 0.9, Math.sin(a) * r)); }
      const spC = new THREE.CatmullRomCurve3(sp); cochlea.add(new THREE.Mesh(new THREE.TubeGeometry(spC, 200, 0.16, 12, false), sm(0xfb923c, { roughness: 0.35 }))); cochlea.position.set(0.7, -0.55, 0); ear.add(cochlea);
      const bead = new THREE.Mesh(new THREE.SphereGeometry(0.12, 14, 10), new THREE.MeshBasicMaterial({ color: 0xffffff })); cochlea.add(bead);
      const canals = new THREE.Group(); [[0, 0, 0], [Math.PI / 2, 0, 0], [0, Math.PI / 2, 0]].forEach((r, i) => { const t = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.065, 12, 36), sm(0x34d399)); t.rotation.set(r[0], r[1], r[2]); t.rotation.x += i === 0 ? 0 : 0; canals.add(t); }); canals.position.set(0.2, 1.3, 0); canals.rotation.set(0.3, 0.5, 0.2); ear.add(canals);
      const vest = new THREE.Mesh(new THREE.SphereGeometry(0.3, 20, 14), sm(0x34d399)); vest.position.set(0.3, 0.7, 0); ear.add(vest);
      const cnPts = [[1.3, -0.1, 0], [2.2, 0.2, 0], [3.2, 0.5, 0], [4.0, 0.6, 0]], cn = tube(cnPts, 0.1, 0xfacc15); ear.add(cn);
      const cnC = new THREE.CatmullRomCurve3(cnPts.map((p) => new V3(p[0], p[1], p[2]))), pulse = new THREE.Mesh(new THREE.SphereGeometry(0.17, 14, 10), new THREE.MeshBasicMaterial({ color: 0xffffff })); pulse.visible = false; ear.add(pulse);
      const brain = new THREE.Mesh(new THREE.SphereGeometry(1.5, 40, 28), sm(0xf9a8d4, { transparent: true, opacity: 0.55, roughness: 0.6, depthWrite: false })); brain.scale.set(1, 0.85, 0.9); brain.position.set(5.2, 0.7, 0); ear.add(brain);
      [['귓바퀴', [-5.35, 1.15, 0]], ['외이도', [-3.6, 0.55, 0]], ['고막', [-2.3, 0.6, 0]], ['귓속뼈', [-1.45, 0.62, 0]], ['반고리관', [0.2, 2.1, 0]], ['전정 기관', [0.3, 1.15, 0]], ['달팽이관', [1.1, -0.7, 0.9]], ['청각 신경', [3.0, 0.9, 0]], ['뇌', [5.2, 2.0, 0]]].forEach(([t, p]) => L('ear', t, p));
      /* 소리 파동 */
      const waves = []; for (let i = 0; i < 5; i++) { const w = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.025, 8, 36), new THREE.MeshBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.8 })); w.rotation.y = Math.PI / 2; ear.add(w); waves.push(w); }
      function earUpdate() { info('<b>귀</b> · 소리 → <b>고막</b> 진동 → <b>귓속뼈</b>가 진동을 키워 전달 → <b>달팽이관</b>에서 신호로 바뀌어 <b>청각 신경</b> → 뇌예요.<br>반고리관·전정 기관은 몸의 회전과 기울어짐(평형)을 느껴요.'); }

      /* ===== 코·혀 · 피부 · 자극의 전달 (2D와 같은 상태·좌표) ===== */
      const MS = 0.0145, X = (x) => (x - 520) * MS, Y = (y) => -(y - 250) * MS;
      const p3 = (pts, z) => pts.map((q) => new V3(X(q[0]), Y(q[1]), z || 0));
      const mkTube = (pts, r, col, o, z) => new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(p3(pts, z)), 40, r, 8, false), sm(col, o));
      const polyShape = (pts) => new THREE.Shape(new THREE.CatmullRomCurve3(p3(pts), true, 'catmullrom', 0.5).getPoints(70).map((q) => new THREE.Vector2(q.x, q.y)));
      const mkSlab = (pts, depth, col, o) => { const g = new THREE.ExtrudeGeometry(polyShape(pts), { depth, bevelEnabled: false }); g.translate(0, 0, -depth / 2); return new THREE.Mesh(g, sm(col, o)); };
      const nsG = new THREE.Group(), skG = new THREE.Group(), paG = new THREE.Group(); root.add(nsG, skG, paG); [nsG, skG, paG].forEach((g) => { g.visible = false; });
      const nlabs = [], slabs = [], plabs = [];
      const NL = (arr, txt, pos, col) => { const l = label(txt, pos, { size: 12, color: col || 'rgba(15,23,42,.9)' }); l.show(false); arr.push(l); return l; };
      const gold = 0xe9c46a, goldG = sm(0xfacc15, { emissive: 0xfacc15, emissiveIntensity: 0.15 });
      /* -- 코와 혀 -- */
      const HEADP = [[470, 66], [420, 94], [408, 140], [404, 176], [372, 214], [350, 240], [366, 258], [392, 260], [398, 284], [388, 300], [394, 314], [392, 338], [408, 368], [440, 396], [500, 420], [600, 430], [672, 380], [690, 260], [668, 140], [610, 84], [540, 60]];
      nsG.add(mkSlab(HEADP, 2.0, 0xf6dcc3, { transparent: true, opacity: 0.3, depthWrite: false, roughness: 0.6 }));
      const nBrain = new THREE.Mesh(new THREE.SphereGeometry(1, 36, 26), sm(0xf9a8d4, { roughness: 0.5, emissive: 0xf472b6, emissiveIntensity: 0 })); nBrain.scale.set(1.25, 0.95, 0.9); nBrain.position.set(X(548), Y(148), 0); nsG.add(nBrain);
      nsG.add(mkSlab([[372, 248], [392, 236], [440, 226], [500, 230], [526, 250], [522, 278], [470, 284], [420, 280], [384, 268]], 0.9, 0xf8b9b9, { roughness: 0.6 }));
      const OLF = [[432, 230], [462, 226], [492, 230], [510, 240]]; nsG.add(mkTube(OLF, 0.1, 0xfacc15, { emissive: 0xca8a04, emissiveIntensity: 0.3 }, 0.3));
      const NERVE_SMELL = [[470, 228], [472, 196], [488, 170], [514, 156]], NERVE_TASTE = [[506, 330], [560, 326], [598, 296], [610, 238], [594, 186]];
      nsG.add(mkTube(NERVE_SMELL, 0.07, gold, { roughness: 0.4 }, 0.1)); nsG.add(mkTube(NERVE_TASTE, 0.07, gold, { roughness: 0.4 }, 0.1));
      nsG.add(mkSlab([[394, 300], [430, 292], [500, 294], [534, 306], [522, 338], [470, 348], [420, 342], [396, 326]], 0.8, 0xc85a74, { roughness: 0.6 }));
      const tongue = mkSlab([[400, 324], [432, 308], [472, 302], [510, 308], [524, 332], [490, 344], [440, 344], [408, 338]], 0.9, 0xfb9cb8, { roughness: 0.5 }); tongue.position.z = 0.05; nsG.add(tongue);
      [[418, 316], [438, 308], [458, 304], [478, 304], [498, 309]].forEach((b) => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 8), sm(0xfcd34d, { emissive: 0xb45309, emissiveIntensity: 0.3 })); m.position.set(X(b[0]), Y(b[1]) + 0.04, 0.45); nsG.add(m); });
      nsG.add(mkTube([[394, 286], [384, 300], [394, 316]], 0.06, 0xc2415e, {}, 0.1));
      const throat = mkTube([[494, 240], [536, 258], [546, 288], [518, 316], [470, 322]], 0.12, 0xf4a3b0, { transparent: true, opacity: 0.8 }, 0); nsG.add(throat);
      const eyeN = new THREE.Mesh(new THREE.SphereGeometry(0.14, 14, 10), sm(0xffffff)); eyeN.position.set(X(430), Y(150), 0.95); nsG.add(eyeN);
      const plate = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 0.08, 28), sm(0xe2e8f0)); plate.position.set(X(150), Y(462), 0); nsG.add(plate);
      const foodG = new THREE.Group(); nsG.add(foodG);
      const apple = new THREE.Group(); { const a = new THREE.Mesh(new THREE.SphereGeometry(0.42, 22, 16), sm(0xdc2626, { roughness: 0.35 })); a.scale.y = 0.92; apple.add(a); const st = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.2, 6), sm(0x7c4a2d)); st.position.y = 0.45; apple.add(st); const lf = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), sm(0x4ade80)); lf.scale.set(1.5, 0.3, 0.8); lf.position.set(0.14, 0.5, 0); apple.add(lf); }
      const onion = new THREE.Group(); { const a = new THREE.Mesh(new THREE.SphereGeometry(0.42, 22, 16), sm(0xe8b98c, { roughness: 0.5 })); a.scale.set(1, 1.1, 1); onion.add(a); const t2 = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.35, 10), sm(0x86a352)); t2.position.y = 0.55; onion.add(t2); }
      foodG.add(apple, onion);
      const SO = new THREE.CatmullRomCurve3(p3([[190, 396], [250, 336], [316, 288], [366, 258], [420, 250], [458, 238]], 0.2)), SB = new THREE.CatmullRomCurve3(p3([[470, 322], [518, 316], [546, 288], [536, 258], [494, 240]], 0.2)), FM = new THREE.CatmullRomCurve3(p3([[150, 424], [236, 372], [330, 330], [402, 312]], 0.2));
      const NSP = 14, smellI = new THREE.InstancedMesh(new THREE.SphereGeometry(0.07, 8, 6), new THREE.MeshBasicMaterial({ color: 0x4ade80 }), NSP); nsG.add(smellI);
      const NTM = 6, tasteI = new THREE.InstancedMesh(new THREE.SphereGeometry(0.06, 8, 6), new THREE.MeshBasicMaterial({ color: 0xfb923c }), NTM); nsG.add(tasteI);
      const NBK = 6, backI = new THREE.InstancedMesh(new THREE.SphereGeometry(0.06, 8, 6), new THREE.MeshBasicMaterial({ color: 0x4ade80 }), NBK); nsG.add(backI);
      const pinch = new THREE.Group(); { const a = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.5), sm(0xef4444)); const b = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 0.5), sm(0xb91c1c)); b.position.y = -0.12; pinch.add(a, b); pinch.position.set(X(364), Y(248), 0); pinch.rotation.z = 0.35; nsG.add(pinch); }
      const plsT = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 8), new THREE.MeshBasicMaterial({ color: 0xf97316 })), plsS = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 8), new THREE.MeshBasicMaterial({ color: 0x22c55e })); nsG.add(plsT, plsS);
      const nT = [NL(nlabs, '대뇌', [X(548), Y(148) - 1.2, 0.8], 'rgba(157,23,77,.92)'), NL(nlabs, '후각 세포', [X(432), Y(222), 0.8], 'rgba(113,63,18,.92)'), NL(nlabs, '혀 (맛봉오리)', [X(458), Y(360), 0.8], 'rgba(190,24,93,.92)'), NL(nlabs, '후각 신경', [X(470), Y(180), 0.8], 'rgba(113,63,18,.92)'), NL(nlabs, '미각 신경', [X(612), Y(270), 0.8], 'rgba(113,63,18,.92)')];
      const nRes = NL(nlabs, '', [X(610), Y(70), 0.8], 'rgba(22,163,74,.95)');
      const ctlHost = ctx.controls.text('').parentNode;
      const tail = (fn) => { const n0 = ctlHost.children.length; fn(); return Array.from(ctlHost.children).slice(n0); };
      let ignN = false, actN = -9, lastN = -9, tnow = 0, nSig = '';
      const foodSeg = []; let foodS = null;
      const noseEls = tail(() => {
        foodS = controls.segment('음식', [{ value: 'apple', label: '🍎 사과' }, { value: 'onion', label: '🧅 양파' }], 'apple', (v) => { const b = document.querySelector('#foodSeg button[data-food="' + v + '"]'); if (b) b.click(); });
        const pb = controls.button('👃 코 막기', () => { const b = document.getElementById('btnPinch'); if (b) b.click(); }); pb.id = 'v3pinch';
        controls.button('😋 맛보기', () => { const b = document.getElementById('btnTaste'); if (b && !b.disabled) b.click(); });
      });
      const noseRow = tail(() => { }); 
      let noseP = null; const noseP_ = tail(() => { noseP = controls.player({ duration: 7, loop: false, label: '맛보기', phases: [[0, '음식을 입에 넣어요'], [0.14, '맛·냄새가 퍼져요'], [0.27, '신경으로 신호가 가요'], [0.49, '대뇌가 알아차려요']], onFrame() { if (!ignN) actN = tnow; } }); });
      function noseFrame(L, t) {
        const N = L.S.nose, tt = Math.max(0, N.t), mv = N.t >= 0 ? Math.max(0, Math.min(1, tt / 0.9)) : 0, eaten = N.t >= 0 && tt > 1.0;
        foodG.visible = !eaten; apple.visible = N.food === 'apple'; onion.visible = N.food !== 'apple';
        if (!eaten) { const q = mv > 0 ? FM.getPointAt(mv) : new V3(X(150), Y(426) + Math.sin(t * 2) * 0.03, 0.2); foodG.position.copy(q); foodG.scale.setScalar(1 - 0.3 * mv); }
        const col = N.food === 'apple' ? 0x4ade80 : 0xc084fc; smellI.material.color.setHex(col); backI.material.color.setHex(col);
        for (let i = 0; i < NSP; i++) { const p = (N.sp || [])[i]; if (p && !eaten) { const k = Math.max(0, Math.min(1, p.k)); const q = SO.getPointAt(Math.min(0.999, k)); dm.position.set(q.x, q.y + Math.sin(t * 3 + p.ph) * 0.07 * (1 - k), q.z); dm.scale.setScalar(1); } else { dm.position.set(0, 0, 0); dm.scale.setScalar(0.0001); } dm.updateMatrix(); smellI.setMatrixAt(i, dm.matrix); } smellI.instanceMatrix.needsUpdate = true;
        const tasting = N.t >= 1.0 && N.t < 3.6;
        for (let i = 0; i < NTM; i++) { const ph = (tt * 20 + i * 7) % 20; dm.position.set(X(420 + i * 16), Y(316 - 4) + ph / 20 * 0.35, 0.5); dm.scale.setScalar(tasting ? 1 - ph / 20 : 0.0001); dm.updateMatrix(); tasteI.setMatrixAt(i, dm.matrix); } tasteI.instanceMatrix.needsUpdate = true;
        for (let i = 0; i < NBK; i++) { const kk = Math.max(0, Math.min(1, (tt - 1.1) / 1.4 - i * 0.1)), on = tasting && !N.pinched && kk > 0 && kk < 1; const q = SB.getPointAt(Math.min(0.999, kk)); dm.position.copy(q); dm.scale.setScalar(on ? 1 : 0.0001); dm.updateMatrix(); backI.setMatrixAt(i, dm.matrix); } backI.instanceMatrix.needsUpdate = true;
        pinch.visible = N.pinch > 0.02; pinch.position.x = X(364) - (1 - N.pinch) * 0.35; pinch.scale.setScalar(Math.max(0.01, N.pinch));
        const tp = N.t >= 1.9 && N.t < 4.6 ? Math.max(0, Math.min(0.999, (tt - 1.9) / 1.4)) : -1; plsT.visible = tp >= 0; if (tp >= 0) plsT.position.copy(new THREE.CatmullRomCurve3(p3(NERVE_TASTE, 0.1)).getPointAt(tp));
        const sp2 = N.t >= 2.0 && N.t < 4.6 && !N.pinched ? Math.max(0, Math.min(0.999, (tt - 2.0) / 1.0)) : -1; plsS.visible = sp2 >= 0; if (sp2 >= 0) plsS.position.copy(new THREE.CatmullRomCurve3(p3(NERVE_SMELL, 0.1)).getPointAt(sp2));
        const bgl = N.t >= 3 ? Math.max(0, Math.min(1, 1 - Math.abs(tt - 3.8) / 1.8)) : 0; nBrain.material.emissiveIntensity = 0.8 * bgl;
        nT.forEach((l) => l.show(names)); const rs = N.result && L.S.nose.resultAt != null;
        const resTxt = N.result === 'blur' ? '❓ 음… 무슨 맛이지? 맛이 흐릿해요' : N.result === 'apple' ? '🍎 사과 맛이야! (맛 + 향)' : N.result === 'onion' ? '🧅 양파 맛이야! (맛 + 향)' : '';
        nRes.set(resTxt); nRes.show(!!resTxt && N.t >= 3.4); nRes.el.style.background = N.result === 'blur' ? 'rgba(180,83,9,.95)' : 'rgba(22,163,74,.95)';
        foodS.set(N.food);
        const nk = N.food + '|' + N.pinched + '|' + (N.t >= 0 ? 1 : 0) + '|' + (N.t >= 3.4 ? 1 : 0);
        if (nk !== nSig) { nSig = nk; info('<b>코와 혀</b> · 맛은 <b>혀(미각)</b>와 <b>코(후각)</b>가 함께 느껴요.<br>' + (N.pinched ? '코를 막으면 냄새(기체)가 후각 세포에 닿지 못해 맛이 흐릿해요.' : '냄새(기체)는 코 안 <b>후각 세포</b>로, 맛(액체)은 혀의 <b>맛봉오리</b>로 받아들여요.') + '<br>' + (N.t >= 3.4 ? '신호가 대뇌에 도착했어요!' : '😋 맛보기를 눌러 보세요.')); }
        const driving = tnow - actN < 1.2;
        if (driving && noseP.playing) { if (N.t < 0 && noseP.p > 0.02 && tnow - lastN > 1.0) { lastN = tnow; const b = document.getElementById('btnTaste'); if (b && !b.disabled) b.click(); } }
        else if (!driving && !noseP.playing) { const want = N.t >= 0 ? Math.min(1, N.t / 7) : 0; if (Math.abs(noseP.p - want) > 0.02) { ignN = true; noseP.set(want); ignN = false; } }
      }
      /* -- 피부 (두 점 식별) -- */
      const skin = new THREE.Group(); skG.add(skin);
      const layer = (y0, y1, col, o) => { const m = new THREE.Mesh(new THREE.BoxGeometry(14, y1 - y0, 3), sm(col, Object.assign({ transparent: true, opacity: 0.5, depthWrite: false }, o || {}))); m.position.set(0, (y0 + y1) / 2, 0); skin.add(m); return m; };
      const epi = layer(-0.35, 0, 0xf2c6a4), derm = layer(-2.0, -0.35, 0xf5a99a, {}), fat = layer(-3.6, -2.0, 0xfde8a6);
      const NRC = 9, recI = new THREE.InstancedMesh(new THREE.SphereGeometry(0.2, 14, 10), sm(0xfacc15, { emissive: 0xb45309, emissiveIntensity: 0.2 }), NRC); skin.add(recI);
      const recNerve = Array.from({ length: NRC }, () => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1, 6), sm(0xe9c46a, { roughness: 0.4 })); skin.add(m); return m; });
      const pins = [0, 1].map(() => { const g = new THREE.Group(), c = new THREE.Mesh(new THREE.ConeGeometry(0.16, 1.4, 14), sm(0x94a3b8, { metalness: 0.5, roughness: 0.3 })); c.rotation.z = Math.PI; c.position.y = 0.7; g.add(c); skG.add(g); return g; });
      const sT = [NL(slabs, '', [0, 0.1, 1.6], 'rgba(15,23,42,.92)'), NL(slabs, '표피', [-5.6, -0.18, 1.6], 'rgba(120,53,15,.9)'), NL(slabs, '진피 (감각점)', [-5.4, -1.2, 1.6], 'rgba(159,18,57,.9)'), NL(slabs, '지방층', [-5.4, -2.8, 1.6], 'rgba(120,83,9,.9)'), NL(slabs, '', [0, 3.0, 0], 'rgba(15,23,42,.92)')];
      const skinSeg = []; let regS = null;
      const skinEls = tail(() => { regS = controls.segment('부위', [{ value: 'finger', label: '☝️ 손끝' }, { value: 'back', label: '🧍 등' }], 'finger', (v) => { const b = document.querySelector('#regionSeg button[data-region="' + v + '"]'); if (b) b.click(); }); });
      let gapS = null; const gapEls = [];
      let skSig = '', gapSig = '';
      const REGD = { finger: { name: '손끝', rho: 2.5, gaps: [1, 2, 3, 5, 8], uPerMm: 1 }, back: { name: '등', rho: 35, gaps: [10, 20, 30, 40, 50], uPerMm: 0.1 } };
      function buildGap(L, reg) { /* 간격 버튼은 2D 것을 눌러요 */ const gb = Array.from(document.querySelectorAll('#gapSeg button')); gapEls.forEach((e) => e.remove()); gapEls.length = 0; gb.forEach((b, i) => { const x = controls.button(b.textContent, () => { const bb = Array.from(document.querySelectorAll('#gapSeg button'))[i]; if (bb) bb.click(); }); x.dataset.v3gap = '1'; gapEls.push(x); }); }
      function skinFrame(L, t) {
        const K = L.S.skin, R = REGD[K.region], two = K.gap > R.rho;
        if (skSig !== K.region) { skSig = K.region; regS.set(K.region); buildGap(L, K.region); }
        gapEls.forEach((e, i) => { const gb = document.querySelectorAll('#gapSeg button')[i]; e.classList.toggle('on', !!(gb && gb.classList.contains('on'))); if (gb) e.textContent = gb.textContent; });
        const u = R.uPerMm, sp = R.rho * u, gapU = K.gap * u, press = K.press == null ? 0 : K.press;
        for (let i = 0; i < NRC; i++) { const x = (i - (NRC - 1) / 2) * sp; const hit = Math.abs(Math.abs(x) - gapU / 2) < sp * 0.5 || (!two && Math.abs(x) < sp * 0.5 + gapU / 2); dm.position.set(x, -0.9, 0); dm.scale.setScalar(Math.abs(x) <= 6.8 ? 1 : 0.0001); dm.updateMatrix(); recI.setMatrixAt(i, dm.matrix); recI.setColorAt(i, new THREE.Color(hit && press > 0.5 ? 0xff7a1a : 0xfacc15));
          const n = recNerve[i]; n.position.set(x, -1.9, 0); n.scale.set(1, 1.9, 1); n.position.y = -0.95; n.visible = Math.abs(x) <= 6.8; n.material.emissive.setHex(hit && press > 0.5 ? 0xf97316 : 0x000000); }
        recI.instanceMatrix.needsUpdate = true; if (recI.instanceColor) recI.instanceColor.needsUpdate = true;
        pins.forEach((g, i) => { const x = (i ? 1 : -1) * gapU / 2; g.position.set(x, 1.4 - 1.4 * press + 0.0, 0.0); g.visible = true; });
        const seen = K.obs && K.obs[K.region] && (K.obs[K.region].one[K.gap] || K.obs[K.region].two[K.gap]);
        sT[0].set('간격 ' + K.gap + ' mm'); sT[0].obj = [0, 2.2, 1.5]; sT[4].set(press > 0.9 ? (two ? '두 점으로 느껴요 ✌️' : '한 점으로 느껴요 ☝️') : '자극하는 중…'); sT[4].obj = [0, 3.4, 0]; sT.forEach((l, i) => l.show(i === 4 ? press > 0.5 : true));
        const kk = K.region + '|' + K.gap + '|' + (press > 0.9 ? 1 : 0);
        if (kk !== gSig2) { gSig2 = kk; info('<b>피부의 두 점 식별</b> · ' + R.name + '<br>감각점 사이의 간격은 약 <b>' + R.rho + ' mm</b>예요. 두 점 사이가 ' + (two ? '<b>그보다 멀어서</b> 서로 다른 감각점이 자극돼요 → <b>두 점</b>으로 느껴요.' : '<b>그보다 가까워서</b> 같은 감각점이 자극돼요 → <b>한 점</b>으로 느껴요.') + '<br><small>손끝은 감각점이 촘촘하고, 등은 듬성듬성해요.</small>'); }
      }
      let gSig2 = '';
      /* -- 자극의 전달: 자극 → 감각 기관 → 감각 세포 → 감각 신경 → 대뇌 -- */
      const headG = new THREE.Mesh(new THREE.SphereGeometry(2.3, 36, 26), sm(0xf6dcc3, { transparent: true, opacity: 0.25, depthWrite: false })); headG.scale.set(1.0, 1.1, 0.95); paG.add(headG);
      const pBrain = new THREE.Mesh(new THREE.SphereGeometry(1, 36, 26), sm(0xf9a8d4, { roughness: 0.5, emissive: 0xf472b6, emissiveIntensity: 0 })); pBrain.scale.set(1.4, 0.95, 1.0); pBrain.position.set(0.2, 0.9, 0); paG.add(pBrain);
      const STIMS = [
        { t: '빛', organ: '눈', cell: '시각 세포', nerve: '시각 신경', col: 0xf59e0b, pos: [-2.0, 0.6, 0.6] }, { t: '소리', organ: '귀', cell: '청각 세포', nerve: '청각 신경', col: 0x3b82f6, pos: [0.2, -0.1, 2.0] },
        { t: '냄새(기체)', organ: '코', cell: '후각 세포', nerve: '후각 신경', col: 0x22c55e, pos: [-2.2, -0.7, 0] }, { t: '맛(액체)', organ: '혀', cell: '미각 세포', nerve: '미각 신경', col: 0xf97316, pos: [-1.5, -1.5, 0.2] }, { t: '온도(열)', organ: '피부', cell: '온점·냉점', nerve: '감각 신경', col: 0xef4444, pos: [-0.2, -3.6, 0.2] },
      ];
      const org = [];
      STIMS.forEach((q, i) => {
        const o = new THREE.Mesh(i === 0 ? new THREE.SphereGeometry(0.4, 18, 14) : i === 1 ? new THREE.TorusGeometry(0.4, 0.12, 10, 20, 4.6) : i === 2 ? new THREE.ConeGeometry(0.3, 0.7, 14) : i === 3 ? new THREE.CapsuleGeometry(0.17, 0.6, 4, 10) : new THREE.BoxGeometry(1.2, 0.7, 0.6), sm(q.col, { roughness: 0.4 }));
        if (i === 2) o.rotation.z = Math.PI / 2; if (i === 3) o.rotation.z = Math.PI / 2; if (i === 1) o.rotation.y = Math.PI / 2; o.position.set(...q.pos); paG.add(o);
        const from = new V3(...q.pos), to = new V3(0.2 + (i - 2) * 0.35, 0.9, (i === 1 ? 0.5 : 0)), mid = from.clone().lerp(to, 0.5).add(new V3(i === 4 ? 0.8 : -0.1, 0, 0.3));
        const cu = new THREE.CatmullRomCurve3([from, mid, to]); const tube = new THREE.Mesh(new THREE.TubeGeometry(cu, 30, 0.05, 8, false), sm(0xe9c46a, { roughness: 0.4, transparent: true, opacity: 0.35 })); paG.add(tube);
        const pl = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), new THREE.MeshBasicMaterial({ color: q.col })); pl.visible = false; paG.add(pl);
        const lb = NL(plabs, q.organ + ' · ' + q.cell, [q.pos[0] - 1.2, q.pos[1] + (i === 4 ? 0.6 : 0.5), q.pos[2] + 0.5], 'rgba(15,23,42,.9)');
        org.push({ q, o, cu, tube, pl, lb });
      });
      const pBrL = NL(plabs, '대뇌', [0.2, 2.3, 0], 'rgba(157,23,77,.92)');
      const sendB = tail(() => { controls.button('⚡ 자극 보내기', () => { const b = document.getElementById('btnSend'); if (b && !b.disabled) b.click(); }); });
      let pSig = '';
      function pathFrame(L, t) {
        const P = L.S.path, ok = (i) => { const r = P.rows[i]; return r && r.organ === i && r.cell === i; };
        const arrive = P.sendT >= 0 ? Math.max(0, Math.min(1, (P.sendT - 1.6) / 0.6)) * Math.max(0, Math.min(1, (4.2 - P.sendT) / 0.8)) : 0; pBrain.material.emissiveIntensity = 0.9 * arrive;
        let nok = 0;
        org.forEach((g, i) => { const k = ok(i); if (k) nok++; g.tube.material.opacity = k ? 1 : 0.35; g.lb.show(names && k); g.lb.set('<b>' + g.q.t + '</b> → ' + g.q.organ + ' → ' + g.q.cell + ' → ' + g.q.nerve); g.o.visible = true;
          const head = P.sendT >= 0 && k ? Math.max(0, Math.min(1, (P.sendT - i * 0.12) / 2.2)) : -1; g.pl.visible = head > 0 && head < 1 && P.sendT < 4.2; if (g.pl.visible) g.pl.position.copy(g.cu.getPointAt(Math.min(0.999, head))); });
        pBrL.show(names);
        const pk = nok + '|' + (P.sendT >= 0 ? 1 : 0);
        if (pk !== pSig) { pSig = pk; info('<b>자극의 전달</b>: 자극 → <b>감각 기관</b> → <b>감각 세포</b> → <b>감각 신경</b> → <b>대뇌</b><br>감각 기관·세포를 맞게 고른 길(' + nok + ' / 5)만 이어져요. ⚡ 자극 보내기로 신호를 보내 봐요.'); }
      }

      function setMode(m) { mode = m; eye.visible = m === 'eye'; ear.visible = m === 'ear'; orbit.tx = m === 'eye' ? -1.2 : 0.2; orbit.dist = m === 'eye' ? (PHN ? 17 : 12.5) : (PHN ? 20 : 15); showNames(); m === 'eye' ? eyeUpdate() : earUpdate(); sl.style.display = ''; }
      function showNames() { labs.eye.forEach((l) => l.show(names && mode === 'eye')); labs.ear.forEach((l) => l.show(names && mode === 'ear')); }
      /* 2D 차시와 같은 값을 읽어요: 눈의 조절(주변 밝기 · 물체까지 거리) · 귀(소리 전달) */
      let sig = '', infoK = '';
      const dm = new THREE.Object3D();
      const nb = controls.button('이름 ✓', () => { names = !names; nb.textContent = '이름 ' + (names ? '✓' : '✕'); showNames(); }); nb.classList.add('on');
      /* ▶ 재생: 눈 → 밝기·거리를 바꿔 보여 줘요(2D 슬라이더도 같이 움직여요) · 귀 → 소리가 뇌까지 가는 길 */
      let first = true, pEar = 0;
      const pEye = controls.player({
        duration: 10, loop: true, label: '눈의 조절',
        phases: [[0, '아주 밝아요 · 동공↓'], [0.15, '어두워져요 · 동공↑'], [0.25, '아주 어두워요'], [0.4, '다시 밝아져요'], [0.5, '멀리 봐요 · 수정체 얇게'], [0.65, '가까이 봐요 · 수정체 두껍게'], [0.85, '다시 멀리 봐요']],
        onFrame(p) {
          if (first) return;
          const L = ctx.lesson(); if (!L || !L.S || L.S.scene !== 'eye') return;
          const b = p < 0.5 ? 0.5 + 0.5 * Math.cos(p * 4 * Math.PI) : 0.5, o = p < 0.5 ? 0.5 : 0.5 + 0.5 * Math.cos((p - 0.5) * 4 * Math.PI);
          L.S.adj.bright = b; L.S.adj.obj = o; L.bBright.set(b); L.bObj.set(o);
        },
      });
      const pEarP = controls.player({
        duration: 6, loop: true, label: '소리 전달',
        phases: [[0, '귓바퀴·외이도'], [0.22, '고막이 떨려요'], [0.4, '귓속뼈'], [0.52, '달팽이관'], [0.72, '청각 신경'], [0.88, '뇌']],
        onFrame(p) { if (first) return; const L = ctx.lesson(); if (L && L.S && L.S.ear.t < 0 && p < 0.06 && L.startSound) L.startSound(); },
      });
      first = false;
      const host = nb.parentNode, rows = Array.from(host.querySelectorAll('.v3-player')); const eyeRow = rows[1], earRow = rows[2];
      const allEls = () => Array.from(ctx.controls.text('').parentNode.children);
      function setMode(m) { mode = m; eye.visible = m === 'eye'; ear.visible = m === 'ear'; nsG.visible = m === 'nose'; skG.visible = m === 'skin'; paG.visible = m === 'path';
        orbit.tx = m === 'eye' ? -1.2 : m === 'ear' ? 0.2 : m === 'nose' ? 0 : 0; orbit.ty = m === 'skin' ? 0.5 : m === 'path' ? -0.7 : 0; orbit.dist = m === 'eye' ? (PHN ? 17 : 12.5) : m === 'ear' ? (PHN ? 20 : 15) : m === 'nose' ? (PHN ? 14 : 10.5) : m === 'skin' ? (PHN ? 20 : 15) : (PHN ? 14 : 11);
        showNames(); eyeRow.style.display = m === 'eye' ? '' : 'none'; earRow.style.display = m === 'ear' ? '' : 'none'; sig = ''; infoK = '';
        nlabs.forEach((l) => l.show(false)); slabs.forEach((l) => l.show(false)); plabs.forEach((l) => l.show(false));
        noseEls.concat(noseP_).forEach((e) => { e.style.display = m === 'nose' ? '' : 'none'; }); skinEls.concat(gapEls).forEach((e) => { e.style.display = m === 'skin' ? '' : 'none'; }); sendB.forEach((e) => { e.style.display = m === 'path' ? '' : 'none'; });
        nb.style.display = m === 'skin' ? 'none' : ''; nSig = ''; gSig2 = ''; skSig = ''; pSig = '';
        const hasPl = m === 'eye' || m === 'ear'; }
      setMode('eye'); eyeUpdate();
      return {
        update(dt, t) {
          const L = ctx.lesson(); if (!L || !L.S) return;
          const S = L.S, m = S.scene === 'blind' || S.scene === 'adjust' ? 'eye' : S.scene === 'nose' ? 'nose' : S.scene === 'skin' ? 'skin' : S.scene === 'path' ? 'path' : 'ear';
          tnow += dt;
          if (m !== mode) setMode(m);
          if (mode === 'nose') { noseFrame(L, t); return; }
          if (mode === 'skin') { skinFrame(L, t); return; }
          if (mode === 'path') { pathFrame(L, t); return; }
          if (mode === 'eye') {
            const b = Math.round(S.adj.bright * 100), d = Math.round(S.adj.lens.value * 100);
            const k = b + '|' + d + '|' + (S.adj.sharp ? 1 : 0); sharpNow = S.scene === 'adjust' ? !!S.adj.sharp : null;
            if (k !== sig) { sig = k; bright = b; dist = d; eyeUpdate(); }
            const nn = S.scene === 'blind' ? '<br><span style="color:#fcd34d">맹점: 시각 신경이 모여 눈 밖으로 나가는 곳이라 상이 맺혀도 보이지 않아요.</span>' : '';
            if (nn !== infoK) { infoK = nn; eyeUpdate(); if (nn) info('<b>눈</b> · 어두우면 동공이 커지고, 밝으면 작아져요.<br>가까운 물체를 볼 때 수정체가 <b>두꺼워져요</b>(섬모체 수축).<br>상은 망막에 <b>거꾸로</b> 맺혀 시각 신경으로 가요.' + nn); }
          } else {
            const playing = S.ear.t >= 0;
            if (playing && !pEarP.playing) pEarP.set(Math.min(1, S.ear.t / 5.6));
            pEar = playing ? Math.min(1, S.ear.t / 5.6) : pEarP.p;
            const A = 0.6, ph = pEar * 140, act = pEar > 0.2 && pEar < 0.85 ? 1 : 0;
            drum.position.x = -2.3 + Math.sin(ph) * 0.07 * A * act; b1.rotation.z = 0.2 + Math.sin(ph) * 0.15 * A * act; b2.rotation.z = Math.PI / 2 - 0.3 + Math.sin(ph) * 0.1 * A * act; b3.position.x = -0.95 + Math.sin(ph) * 0.05 * A * act;
            const wu = Math.min(1, pEar / 0.25);
            waves.forEach((w, i) => { const u = (wu + i * 0.12) % 1, x = -6.2 + Math.min(1, u) * 3.9; w.position.set(x, 0, 0); const sc2 = x < -4.6 ? 1.6 - (x + 6.2) / 1.6 * 0.9 + 0.3 : 0.65; w.scale.setScalar(Math.max(0.5, sc2)); w.material.opacity = 0.7 * (1 - Math.abs(u - 0.5) * 0.9); w.visible = pEar > 0.005 && pEar < 0.28 && i < 1 + Math.floor(wu * 5); });
            const uu = Math.max(0, Math.min(1, (pEar - 0.5) / 0.25)); const pt = spC.getPoint(uu * 0.999); bead.position.copy(pt); bead.visible = pEar > 0.5 && pEar < 0.76;
            const nu = Math.max(0, Math.min(1, (pEar - 0.72) / 0.18)); pulse.visible = pEar > 0.72 && pEar < 0.92; pulse.position.copy(cnC.getPoint(nu * 0.999));
            brain.material.emissive.setHex(pEar > 0.88 ? 0xf472b6 : 0x000000);
            const ik = Math.round(pEar * 20) + '|' + playing; if (ik !== infoK) { infoK = ik; earUpdate(); }
          }
        },
      };
    },
  });
})();
