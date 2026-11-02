/* he-planet-motion · 3D 행성의 겉보기 운동
   위에서 본 태양계 모형에 '지구에서 본 하늘 고리'를 붙여요. 지구에서 행성으로 그은 시선이 하늘 고리와 만나는 점이
   별자리 사이를 어떻게 움직이는지(순행·역행)를 입체로 봐요. 2D 실험의 시각(S.t)과 고른 행성을 그대로 따라가요(읽기 전용). */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const DEG = Math.PI / 180;
  const CONST = [['물고기', 10], ['양', 41], ['황소', 71], ['쌍둥이', 104], ['게', 128], ['사자', 156], ['처녀', 196], ['천칭', 229], ['전갈', 253], ['궁수', 283], ['염소', 314], ['물병', 340]];
  const NAMES = { mercury: '수성', venus: '금성', mars: '화성', jupiter: '목성', saturn: '토성' };
  const RING = 1.25;

  window.SciSim3D.attach({
    title: '행성의 겉보기 운동 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: PHONE ? 19 : 12.5, theta: 0.5, phi: 0.95, min: 5, max: 30 },
    autoRotate: 0,
    build(ctx) {
      if (ctx.THREE.ColorManagement) ctx.THREE.ColorManagement.legacyMode = false;     // 색을 보이는 그대로(sRGB) 쓰도록 맞춰요
      const { THREE, scene, root, label, info, controls } = ctx;
      const SIM = () => window.__sim;
      const mat = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.55, metalness: 0.05 }, o || {}));
      const gl = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,235,150,1)'); gr.addColorStop(0.3, 'rgba(255,190,60,.5)'); gr.addColorStop(1, 'rgba(255,150,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();

      /* 별 배경 */
      { let s = 11; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; }, pos = [];
        for (let i = 0; i < 420; i++) { const u = r() * 2 - 1, a = r() * 6.283, q = Math.sqrt(1 - u * u); pos.push(Math.cos(a) * q * 40, u * 40, Math.sin(a) * q * 40); }
        const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        root.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xaab8e8, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0.6 }))); }

      scene.traverse((o) => { if (o.isDirectionalLight) { o.position.set(0, 20, 0); o.intensity = 0.6; } if (o.isHemisphereLight) o.intensity = 0.55; });
      const sunLight = new THREE.PointLight(0xfff1c8, 2.6, 0, 0); root.add(sunLight);
      const sun = new THREE.Mesh(new THREE.SphereGeometry(0.5, 40, 28), new THREE.MeshBasicMaterial({ color: 0xffd23f })); root.add(sun);
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: gl, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); glow.scale.set(3.4, 3.4, 1); root.add(glow);
      label('태양', sun, { offset: [0, 0.8, 0], size: 12.5 });

      const earth = new THREE.Mesh(new THREE.SphereGeometry(0.2, 32, 20), mat(0x3b82f6, { roughness: 0.6 })); root.add(earth);
      const pl = new THREE.Mesh(new THREE.SphereGeometry(0.2, 32, 20), mat(0xe0653a)); root.add(pl);
      const eLab = label('지구', earth, { offset: [0, 0.4, 0], size: 12.5 });
      const pLab = label('', pl, { offset: [0, 0.4, 0], size: 12.5 });

      /* 궤도 (고른 행성이 바뀔 때 다시 만들어요) */
      const orbG = new THREE.Group(); root.add(orbG);
      function orbit(a, k, col) {
        const pts = []; for (let i = 0; i <= 120; i++) { const t = i / 120 * 6.2832; pts.push(new THREE.Vector3(Math.cos(t) * a * k, 0, -Math.sin(t) * a * k)); }
        const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 160, 0.018, 6, true), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.55 })); orbG.add(m);
      }

      /* 지구에서 본 하늘 고리: 지구를 따라다녀요 (별은 아주 멀어서 방향만 중요해요) */
      const sky = new THREE.Group(); root.add(sky);
      sky.add(new THREE.Mesh(new THREE.TorusGeometry(RING, 0.022, 8, 120), new THREE.MeshBasicMaterial({ color: 0x9db4ff, transparent: true, opacity: 0.85 })).rotateX(Math.PI / 2));
      sky.add(new THREE.Mesh(new THREE.CylinderGeometry(RING, RING, 0.5, 72, 1, true), new THREE.MeshBasicMaterial({ color: 0x4a62b8, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false })));
      const cLabs = CONST.map(([n, lam]) => {
        const o = new THREE.Object3D(); o.position.set(Math.cos(lam * DEG) * RING, 0, -Math.sin(lam * DEG) * RING); sky.add(o);
        const tk = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), new THREE.MeshBasicMaterial({ color: 0xdbe5ff })); o.add(tk);
        const L = label(n + '자리', o, { offset: [Math.cos(lam * DEG) * 0.32, 0.05, -Math.sin(lam * DEG) * 0.32], size: 11, color: 'rgba(30,45,110,.88)' }); L.lam = lam; return L;
      });
      /* 시선 + 하늘 고리 위의 행성 점 + 지난 자취 */
      const sight = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1, 8), new THREE.MeshBasicMaterial({ color: 0xffe28a })); root.add(sight);
      const mark = new THREE.Mesh(new THREE.SphereGeometry(0.1, 20, 14), new THREE.MeshBasicMaterial({ color: 0xffffff })); sky.add(mark);
      const K = 90, trail = new THREE.InstancedMesh(new THREE.SphereGeometry(0.045, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }), K); sky.add(trail);
      const dm = new THREE.Object3D(), colF = new THREE.Color(0xf6e27f), colR = new THREE.Color(0xff5b5b);
      const mkLab = label('', mark, { offset: [0, 0.3, 0], size: 12 });

      /* 상태 */
      let id = 'venus', k = 3.8, off = 0, play = false, names = true, cur = null;
      const read = () => {
        const s = SIM(); if (!s) return null; const S = s.S, v = S.view;
        const p = v === 'inner' ? S.inner : v === 'outer' ? S.outer : v === 'retro' ? S.pl4 : S.sel;
        return { id: s.PL[p] && p !== 'earth' ? p : null, t: S.t || 0, S, s };
      };
      function setPlanet(p) {
        id = p; const s = SIM(), a = s.PL[p].a; k = 3.8 / Math.max(1, a);
        while (orbG.children.length) { const c = orbG.children.pop(); c.geometry.dispose(); }
        orbit(1, k, 0x6fa8ff); orbit(a, k, new THREE.Color(s.PL[p].col).getHex());
        pl.material.color.set(s.PL[p].col); pl.scale.setScalar(p === 'jupiter' || p === 'saturn' ? 1.5 : p === 'mercury' ? 0.7 : 1);
        pLab.set(NAMES[p]); mkLab.set(NAMES[p]); segPl.set(p);
      }
      const segPl = controls.segment('행성', Object.keys(NAMES).map((v) => ({ value: v, label: NAMES[v] })), id, (v) => { setPlanet(v); lastSim = v; });
      let lastSim = null;
      controls.button('▶ 시간 흐르기', function () { play = !play; this.textContent = play ? '⏸ 멈춤' : '▶ 시간 흐르기'; });
      controls.button('⟲ 처음', () => { off = 0; });
      const nb = controls.button('별자리 이름 ✓', () => { names = !names; nb.classList.toggle('on', names); nb.textContent = '별자리 이름 ' + (names ? '✓' : '✕'); }); nb.classList.add('on');

      const up = new THREE.Vector3(0, 1, 0), a3 = new THREE.Vector3(), b3 = new THREE.Vector3(), d3 = new THREE.Vector3();
      const w3 = (h) => new THREE.Vector3(h.x * k, h.z * k * 4, -h.y * k);
      function constAt(lam) { const L = ((lam % 360) + 360) % 360; let best = CONST[0], bd = 999; CONST.forEach((c) => { const d = Math.abs(((L - c[1] + 540) % 360) - 180); if (d < bd) { bd = d; best = c; } }); return best[0] + '자리'; }
      function frame(dt) {
        const r = read(); if (!r) return;
        if (r.id && r.id !== lastSim) { lastSim = r.id; if (r.id !== id) setPlanet(r.id); }
        if (!cur) { cur = 1; setPlanet(id); }
        const s = r.s;
        if (play) off += s.synodicD(id) / 14 * dt;
        const t = r.t + off;
        const he = s.helio(s.PL.earth, t), hp = s.helio(s.PL[id], t);
        a3.copy(w3(he)); b3.copy(w3(hp)); earth.position.copy(a3); pl.position.copy(b3); sky.position.copy(a3);
        d3.subVectors(b3, a3); d3.y = 0; const dist = d3.length(); d3.normalize();
        sight.position.copy(a3).addScaledVector(d3, (dist + RING) / 2); sight.scale.set(1, dist + RING, 1); sight.quaternion.setFromUnitVectors(up, d3);
        const g = s.geo(id, t), retro = s.dlam(id, t) < 0;
        mark.position.set(d3.x * RING, 0, d3.z * RING); mark.material.color.set(retro ? 0xff5b5b : 0xf6e27f);
        const stepD = Math.max(4, Math.min(s.synodicD(id) * 0.5, 600) / K);
        for (let i = 0; i < K; i++) {
          const q = s.geo(id, t - i * stepD), rr = s.dlam(id, t - i * stepD) < 0;
          dm.position.set(Math.cos(q.lam * DEG) * RING, 0, -Math.sin(q.lam * DEG) * RING); dm.scale.setScalar(1 - i / K * 0.55); dm.updateMatrix();
          trail.setMatrixAt(i, dm.matrix); trail.setColorAt(i, rr ? colR : colF);
        }
        trail.instanceMatrix.needsUpdate = true; if (trail.instanceColor) trail.instanceColor.needsUpdate = true;
        cLabs.forEach((L) => { const d = Math.abs(((g.lam - L.lam + 540) % 360) - 180); L.show(names && d < 62); });
        info('<b>' + NAMES[id] + '</b>은(는) 별자리 <b>' + constAt(g.lam) + '</b> 쪽에 보여요.<br>' +
          (retro ? '<span style="color:#ff9d9d"><b>지금은 역행 중</b></span> · 별자리 사이를 거꾸로 가요.' : '지금은 <b>순행</b> 중 · 별자리 사이를 앞으로 가요.') +
          '<br><span style="opacity:.8">노란 점 순행 · 빨간 점 역행 (지난 자취)</span>');
      }
      return { update(dt, t) { frame(dt); sun.rotation.y += dt * 0.2; glow.scale.setScalar(3.4 + 0.12 * Math.sin(t * 2)); earth.rotation.y += dt; }, sync() {} };
    },
  });
})();
