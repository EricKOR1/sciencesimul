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
    levels: [1],              // 단계 2(눈의 조절: 홍채와 수정체)에서 3D로 시작해요. 맹점 실험·감각 기관 이름표는 2D 화면에서 해요
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
      function eyeUpdate() {
        const pr = makeIris();
        const near = dist / 100;                         // 0: 먼 곳, 1: 가까운 곳
        lens.scale.set(0.2 + 0.2 * near, 0.62, 0.62); cil.forEach((m) => { m.position.y = Math.sign(m.position.y) * (0.95 - 0.12 * near); });
        obj.position.x = -6.4 + (1 - near) * -0 + near * 2.6; const s = 1 - near * 0.1; obj.scale.setScalar(1);
        setRays(pr - 0.06);
        info('<b>눈</b> · 어두우면 동공이 커지고, 밝으면 작아져요.<br>가까운 물체를 볼 때 수정체가 <b>두꺼워져요</b>(섬모체 수축).<br>상은 망막에 <b>거꾸로</b> 맺혀 시각 신경으로 가요.');
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
      function setMode(m) { mode = m; eye.visible = m === 'eye'; ear.visible = m === 'ear'; orbit.tx = m === 'eye' ? -1.2 : 0.2; orbit.dist = m === 'eye' ? (PHN ? 17 : 12.5) : (PHN ? 20 : 15); showNames(); m === 'eye' ? eyeUpdate() : earUpdate(); sl.style.display = ''; }
      function showNames() { labs.eye.forEach((l) => l.show(names && mode === 'eye')); labs.ear.forEach((l) => l.show(names && mode === 'ear')); }
      /* 2D 차시와 같은 값을 읽어요: 눈의 조절(주변 밝기 · 물체까지 거리) · 귀(소리 전달) */
      let sig = '', infoK = '';
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
      const host = nb.parentNode, rows = Array.from(host.querySelectorAll('.v3-player')); const eyeRow = rows[0], earRow = rows[1];
      function setMode(m) { mode = m; eye.visible = m === 'eye'; ear.visible = m === 'ear'; orbit.tx = m === 'eye' ? -1.2 : 0.2; orbit.dist = m === 'eye' ? (PHN ? 17 : 12.5) : (PHN ? 20 : 15); showNames(); eyeRow.style.display = m === 'eye' ? '' : 'none'; earRow.style.display = m === 'ear' ? '' : 'none'; sig = ''; }
      setMode('eye'); eyeUpdate();
      return {
        update(dt, t) {
          const L = ctx.lesson(); if (!L || !L.S) return;
          const S = L.S, m = S.scene === 'eye' || S.scene === 'blind' ? 'eye' : 'ear';
          if (m !== mode) setMode(m);
          if (mode === 'eye') {
            const b = Math.round(S.adj.bright * 100), d = Math.round(S.adj.lens.value * 100);
            const k = b + '|' + d;
            if (k !== sig) { sig = k; bright = b; dist = d; eyeUpdate(); }
            const nn = S.scene === 'blind' ? '<br><span style="color:#fcd34d">맹점: 시각 신경이 모여 눈 밖으로 나가는 곳이라 상이 맺혀도 보이지 않아요. (맹점 실험은 2D 화면에서 해요)</span>' : '';
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
