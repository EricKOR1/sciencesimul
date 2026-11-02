/* h1-stellar-fusion · 3D 별의 단면 (태양 같은 별 · 무거운 별 양파 껍질) + 중심핵 핵융합 확대
   중심에서 수소 4개가 헬륨 1개로 바뀌며 에너지를 내요. 무거운 별은 층마다 다른 원소를 만들어 철까지 가요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHN = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const R = 3.0;
  const SUN = [ // 안쪽에서 바깥으로 [바깥 반지름 비율, 색, 이름, 발광]
    { r: 0.25, c: 0xffe27a, n: '중심핵', em: 0.45 },
    { r: 0.70, c: 0xffb347, n: '복사층', em: 0.35 },
    { r: 1.00, c: 0xe8602c, n: '대류층', em: 0.25 },
  ];
  const BIG = [
    { r: 0.10, c: 0xc9ced8, n: '철 (Fe)', em: 0.6 },
    { r: 0.22, c: 0xe9d6ff, n: '규소 (Si)', em: 0.5 },
    { r: 0.36, c: 0xff9ec1, n: '산소·네온', em: 0.4 },
    { r: 0.52, c: 0xffc15e, n: '탄소 (C)', em: 0.35 },
    { r: 0.72, c: 0x6fd6ff, n: '헬륨 (He)', em: 0.3 },
    { r: 1.00, c: 0x5b7dff, n: '수소 (H)', em: 0.22 },
  ];

  window.SciSim3D.attach({
    title: '별의 속 구조 3D',
    camera: { dist: PHN ? 17 : 12.5, theta: -2.35, phi: 1.2, min: 6, max: 26 },
    levels: [2],
    autoRotate: 0,
    build(ctx) {
      const { THREE, root, label, info, controls, orbit } = ctx;
      const lvNow = () => (typeof window.SciSimLevel === 'number' ? window.SciSimLevel : 0);
      let kind = lvNow() === 2 ? 'big' : 'sun', zoomOn = true;
      const std = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.55, metalness: 0.0, side: THREE.DoubleSide }, o || {}));
      const star = new THREE.Group(); star.position.x = -2.4; root.add(star);
      const body = new THREE.Group(); star.add(body);
      const labs = [];
      let scale = 1;

      function build(kindKey) {
        while (body.children.length) { const o = body.children[0]; body.remove(o); }
        labs.forEach((l) => l.show(false));
        const L = kindKey === 'sun' ? SUN : BIG;
        scale = kindKey === 'sun' ? 1 : 1.1;
        const wedge = 3 * Math.PI / 2;
        let prev = 0;
        L.forEach((ly, i) => {
          const rr = ly.r * R;
          // 바깥 곡면 (쐐기가 잘려 나간 구)
          const sph = new THREE.Mesh(new THREE.SphereGeometry(rr, 64, 40, 0, wedge), std(ly.c, { emissive: ly.c, emissiveIntensity: ly.em * (i === L.length - 1 ? 0.5 : 0.25), roughness: i === L.length - 1 ? 0.8 : 0.5 }));
          if (i === L.length - 1) body.add(sph);
          // 단면(두 평면): 층의 고리 모양
          [Math.PI / 2, Math.PI].forEach((rot) => {
            const ring = new THREE.Mesh(new THREE.RingGeometry(prev * R, rr, 64, 1, -Math.PI / 2, Math.PI), std(ly.c, { emissive: ly.c, emissiveIntensity: ly.em }));
            ring.rotation.y = rot; body.add(ring);
          });
          // 안쪽 층의 구 표면도 쐐기 속에서 보이도록 (각 층 구의 잘린 부분)
          if (i < L.length - 1) { const inner = new THREE.Mesh(new THREE.SphereGeometry(rr, 48, 32, 0, wedge), std(ly.c, { emissive: ly.c, emissiveIntensity: ly.em })); inner.visible = true; body.add(inner); }
          prev = ly.r;
        });
        // 라벨: 단면 위에 놓기 (x<0 평면: z=0, x<0)
        L.forEach((ly, i) => {
          const rmid = ((i ? L[i - 1].r : 0) + ly.r) / 2 * R;
          if (!labs[i]) labs[i] = label('', [0, 0, 0], { size: 12 });
          labs[i].set(ly.n); labs[i].obj = body; labs[i].off = [-rmid * 0.0 - 0, 0, 0];
          const a = 0.35 + 0.0 * i;
          labs[i].off = [-rmid, (i % 2 ? 1 : -1) * Math.min(rmid * 0.12 + 0.2, 0.5) * (kindKey === 'sun' ? 1 : 1), 0.05];
          labs[i].show(true);
        });
        if (kindKey === 'sun') {
          info('<b>태양 같은 별</b>: 중심핵에서 수소 핵융합이 일어나고, 에너지는 복사층·대류층을 지나 표면으로 나와요.');
        } else {
          info('<b>무거운 별</b>은 중심이 아주 뜨거워 헬륨→탄소→산소→…→<b>철</b>까지 층층이 핵융합해요. 철은 더 이상 에너지를 내지 못해요.');
        }
        orbit.dist = PHN ? 18 : 13;
        zoomGroup.visible = zoomOn && kindKey === 'sun'; zoomLab.show(zoomOn && kindKey === 'sun'); fuLab.show(zoomOn && kindKey === 'sun');
      }

      /* ---------- 핵융합 확대 (태양형 별만) ---------- */
      const zoomGroup = new THREE.Group(); zoomGroup.position.set(5.6, 0.3, 0.5); root.add(zoomGroup);
      const bubble = new THREE.Mesh(new THREE.SphereGeometry(1.7, 40, 28), new THREE.MeshStandardMaterial({ color: 0xffe9a0, transparent: true, opacity: 0.12, depthWrite: false, roughness: 0.2, emissive: 0xffc04a, emissiveIntensity: 0.25 }));
      zoomGroup.add(bubble);
      const zoomLab = label('중심핵 확대', zoomGroup, { offset: [0, 2.2, 0], color: 'rgba(200,120,0,.92)' });
      const fuLab = label('수소 4개 → 헬륨 1개 + 에너지', zoomGroup, { offset: [0, -2.2, 0], size: 12 });
      const hGeo = new THREE.SphereGeometry(0.26, 24, 16);
      const hMat = std(0xff6b5e, { emissive: 0x7a1710, emissiveIntensity: 0.5, roughness: 0.3 });
      const nMat = std(0x7a8cff, { emissive: 0x1b2a7a, emissiveIntensity: 0.4, roughness: 0.3 });
      const hs = [];
      for (let i = 0; i < 4; i++) { const m = new THREE.Mesh(hGeo, hMat); zoomGroup.add(m); hs.push(m); }
      const heG = new THREE.Group(); zoomGroup.add(heG);
      [[0.18, 0.18, 0.18, 0], [-0.18, -0.18, 0.18, 1], [-0.18, 0.18, -0.18, 0], [0.18, -0.18, -0.18, 1]].forEach((p) => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.24, 24, 16), p[3] ? nMat : hMat); m.position.set(p[0], p[1], p[2]); heG.add(m); });
      const heLab = label('헬륨 He', heG, { offset: [0, 0.8, 0] });
      const flash = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), new THREE.MeshBasicMaterial({ color: 0xfff3b0, transparent: true, opacity: 0, depthWrite: false })); zoomGroup.add(flash);
      const pho = []; const pGeo = new THREE.SphereGeometry(0.07, 10, 8), pMat = new THREE.MeshBasicMaterial({ color: 0xffe066 });
      for (let i = 0; i < 18; i++) { const m = new THREE.Mesh(pGeo, pMat); m.userData.d = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize(); zoomGroup.add(m); pho.push(m); }
      const startP = [[1.0, 0.6, 0.3], [-0.9, 0.8, -0.4], [-0.7, -0.9, 0.6], [0.8, -0.8, -0.5]].map((a) => new THREE.Vector3(...a));
      const sm = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

      const segK = controls.segment('별 종류', [{ value: 'sun', label: '태양 같은 별' }, { value: 'big', label: '무거운 별' }], kind, (v) => { kind = v; build(v); });
      const bz = controls.button('핵융합 확대 ✓', () => { zoomOn = !zoomOn; bz.classList.toggle('on', zoomOn); bz.textContent = '핵융합 확대 ' + (zoomOn ? '✓' : '✕'); build(kind); }); bz.classList.add('on');
      segK.set(kind); build(kind);

      return {
        update(dt, t) {
          body.rotation.y = Math.sin(t * 0.35) * 0.35;
          if (!zoomGroup.visible) return;
          const T = (t % 7);
          hs.forEach((m, i) => {
            const j = new THREE.Vector3(Math.sin(t * 7 + i * 2.1), Math.cos(t * 6 + i), Math.sin(t * 5 + i * 3)).multiplyScalar(0.07 * (1 - sm(2.5, 3.6, T)));
            const k = sm(2.2, 3.6, T);
            m.position.copy(startP[i]).multiplyScalar(1 - k).add(j); m.visible = T < 3.6;
          });
          heG.visible = T >= 3.6; const hk = sm(3.6, 4.2, T); heG.scale.setScalar(0.4 + 0.6 * hk); heG.rotation.y = t * 1.5; heLab.show(T >= 4);
          const f = T > 3.5 && T < 4.6 ? 1 - Math.abs(T - 3.9) / 0.7 : 0; flash.material.opacity = Math.max(0, f) * 0.8; flash.scale.setScalar(0.5 + Math.max(0, f) * 1.6);
          pho.forEach((m, i) => { const q = T - 3.8; m.visible = q > 0 && q < 3; const r = Math.max(0, q) * 0.5; m.position.copy(m.userData.d).multiplyScalar(0.3 + r); m.material.opacity = 1; });
        },
        sync() { const k = lvNow() === 2 ? 'big' : 'sun'; if (k !== kind) { kind = k; segK.set(k); build(k); } },
      };
    },
  });
})();
