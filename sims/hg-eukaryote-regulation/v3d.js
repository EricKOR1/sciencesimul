/* hg-eukaryote-regulation · 3D 진핵생물의 전사 조절 (염색질 · 전사 인자 · 인핸서)
   DNA는 히스톤에 감긴 뉴클레오솜(염주 모양 염색질)으로 닫혀 있어요. 전사 인자가 인핸서에 붙으면 염색질이 풀리고,
   DNA가 고리처럼 휘어 인핸서와 프로모터가 가까워지고(매개 단백질), RNA 중합 효소가 전사를 시작해요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const narrow = window.innerWidth < 600 || window.innerHeight > window.innerWidth * 1.1;
  const X0 = -6, X1 = 6, E = -3.0, P = 2.2, GEND = 5.6, NUC_N = 13, NUC_DX = 0.95;

  window.SciSim3D.attach({
    title: '진핵생물의 유전자 발현 조절 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: narrow ? 13 : 11.5, theta: 0.2, phi: 1.28, target: narrow ? [-0.8, 0, 0] : [0, 0.8, 0], min: 6, max: 24 },
    autoRotate: 0,
    levels: [0, 1, 2],
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const V = THREE.Vector3, M4 = new THREE.Matrix4();
      if (narrow) root.rotation.z = Math.PI / 2;      // 휴대폰(세로 화면)에서는 눕혀 둔 모형을 세워서 보여 줘요
      const std = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.42, metalness: 0.04 }, o || {}));
      const ease = (k) => { k = Math.max(0, Math.min(1, k)); return k * k * (3 - 2 * k); };
      const lerp = (a, b, k) => a + (b - a) * k;
      const An = (x, y, z) => { const o = new THREE.Object3D(); o.position.set(x, y, z); root.add(o); return o; };
      let step = 0, loop = 0, open = 0, tfk = 0, polk = 0, ph = 0;

      /* DNA 경로: 인핸서와 프로모터 사이 DNA가 (길이는 그대로) 둥근 고리로 말려 두 곳이 가까워져요 */
      function posAt(x, L, out) {
        const w = P - E, o = out || new V();
        if (L < 0.01 || (x <= E)) return o.set(x, 0, 0);
        const d = w * (1 - 0.82 * L), r = d / w;
        let lo = 0.0001, hi = Math.PI;
        for (let i = 0; i < 28; i++) { const m = (lo + hi) / 2; if (Math.sin(m) / m > r) lo = m; else hi = m; }
        const th = (lo + hi) / 2, R = w / (2 * th);
        if (x >= P) return o.set(x - (w - d), 0, 0);
        const ph = -th + 2 * th * ((x - E) / w);
        return o.set(E + d / 2 + R * Math.sin(ph), R * (Math.cos(ph) - Math.cos(th)), 0);
      }
      const dnaMat = std(0x60a5fa, { roughness: 0.35 });
      let dnaMesh = null;
      function buildDNA() {
        if (dnaMesh) { root.remove(dnaMesh); dnaMesh.geometry.dispose(); }
        const pts = []; for (let x = X0; x <= X1 + 1e-6; x += 0.2) pts.push(posAt(x, loop));
        dnaMesh = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 160, 0.09, 8, false), dnaMat); root.add(dnaMesh);
      }
      // 구간 표지
      const eBlock = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.3, 0.3), std(0xf97316, { emissive: 0x4a1e00 })), pBlock = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.3, 0.3), std(0x84cc16, { emissive: 0x1f3300 }));
      const gBlock = new THREE.Mesh(new THREE.BoxGeometry(GEND - 2.7, 0.2, 0.26), std(0x3b82f6, { emissive: 0x0a1e4a })); root.add(eBlock, pBlock, gBlock);

      /* 뉴클레오솜 */
      const nucs = [];
      for (let i = 0; i < NUC_N; i++) {
        const g = new THREE.Group(), x = X0 + 0.5 + i * NUC_DX;
        const core = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.5, 28), std(0x2dd4bf, { roughness: 0.4 })); core.rotation.x = Math.PI / 2; g.add(core);
        [-0.1, 0.1].forEach((z) => { const t = new THREE.Mesh(new THREE.TorusGeometry(0.41, 0.06, 12, 36), dnaMat); t.position.z = z; g.add(t); });
        root.add(g); nucs.push({ g, x, away: (x > E - 1.3 && x < E + 1.0) || (x > P - 1.0 && x < P + 1.8) });
      }
      /* 전사 인자 · 매개 단백질 · RNA 중합 효소 */
      const tfs = [0xfb923c, 0xf472b6, 0xfacc15].map((c, i) => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.24, 20, 14), std(c, { roughness: 0.35 })); root.add(m); return m; });
      const med = new THREE.Mesh(new THREE.SphereGeometry(0.55, 28, 20), std(0xa855f7, { roughness: 0.4, transparent: true, opacity: 0.85 })); root.add(med); med.scale.set(1.6, 0.8, 1);
      const pol = new THREE.Group(); root.add(pol);
      { const b = new THREE.Mesh(new THREE.SphereGeometry(0.7, 30, 22), std(0x14b8a6, { transparent: true, opacity: 0.55, depthWrite: false, roughness: 0.3 })); b.scale.set(1.0, 0.9, 0.9); pol.add(b);
        const c = new THREE.Mesh(new THREE.SphereGeometry(0.34, 18, 14), std(0x0d9488)); c.position.set(0.1, 0.2, -0.2); pol.add(c); }
      const basal = [0, 1].map(() => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 12), std(0xa3e635)); root.add(m); return m; });
      const rnaMax = 50, rna = new THREE.InstancedMesh(new THREE.SphereGeometry(0.09, 12, 10), std(0xfb923c, { emissive: 0x3a1a00, roughness: 0.35 }), rnaMax); root.add(rna);

      const L = {
        enh: label('인핸서', eBlock, { color: '#9a3412', offset: [0, -0.55, 0] }), pro: label('프로모터', pBlock, { color: '#3f6212', offset: [0, -0.55, 0] }), gene: label('유전자', gBlock, { color: '#1e3a8a', offset: [0, -0.5, 0] }),
        nuc: label('뉴클레오솜 (히스톤 + DNA)', nucs[2].g, { color: '#0f766e', offset: [0, 0.85, 0] }), tf: label('전사 인자', tfs[0], { color: '#9a3412', offset: [0, 0.5, 0] }), med: label('매개 단백질', med, { color: '#6b21a8', offset: [0, 0.75, 0] }),
        pol: label('RNA 중합 효소', pol, { color: '#0f766e', offset: [0, 1.0, 0] }), mrna: label('mRNA', null, { color: '#9a3412' }),
      };
      const rnaAnchor = An(0, 0, 0); L.mrna.obj = rnaAnchor;
      const TXT = [
        '<b>① 염색질이 닫혀 있어요</b><br>DNA가 히스톤에 감긴 뉴클레오솜이라 RNA 중합 효소가 프로모터에 접근할 수 없어요. 전사가 꺼져 있어요.',
        '<b>② 전사 인자 결합</b><br>전사 인자가 인핸서에 붙고 염색질이 풀려요(뉴클레오솜이 밀려나요).',
        '<b>③ DNA 고리</b><br>DNA가 휘어 먼 곳의 인핸서가 프로모터와 가까워지고, 매개 단백질이 둘을 이어 줘요.',
        '<b>④ 전사 시작</b><br>RNA 중합 효소가 프로모터에 붙어 유전자를 전사해요. 인핸서가 전사 속도를 높여요.',
      ];
      function setStep(s) { step = s; info(TXT[s]); }
      controls.segment('단계', [{ value: 0, label: '① 닫힘' }, { value: 1, label: '② 전사 인자' }, { value: 2, label: '③ DNA 고리' }, { value: 3, label: '④ 전사' }], 0, setStep);
      setStep(0); buildDNA();

      const V1 = new V(), V2 = new V(), Qt = new THREE.Quaternion();
      let lastLoop = -1, lastSim = null, rnaN = 0;
      return {
        update(dt, t) {
          dt = Math.min(dt, 0.05) * (window.__v3dTS || 1);
          const ap = (cur, tg, r) => cur + (tg - cur) * Math.min(1, dt * r);
          open = ap(open, step >= 1 ? 1 : 0, 2.2); tfk = ap(tfk, step >= 1 ? 1 : 0, 1.8); loop = ap(loop, step >= 2 ? 1 : 0, 1.5); polk = ap(polk, step >= 3 ? 1 : 0, 1.8);
          if (Math.abs(loop - lastLoop) > 0.002) { lastLoop = loop; buildDNA(); }
          // 구간 표지
          posAt(E, loop, V1); eBlock.position.set(V1.x, V1.y + 0.0, 0.0);
          posAt(P, loop, V1); pBlock.position.set(V1.x, V1.y, 0);
          posAt((P + GEND) / 2 + 0.3, loop, V1); gBlock.position.set(V1.x, V1.y, 0);
          // 뉴클레오솜 (염색질이 풀리면 인핸서·프로모터 근처 뉴클레오솜이 아래로 밀려나요)
          nucs.forEach((n) => {
            const k = n.away ? ease(open) : 0; posAt(n.x, loop, V1);
            n.g.position.set(V1.x + (n.x < 0 ? -1 : 1) * k * 0.15, V1.y - k * 1.9, k * 0.5); n.g.scale.setScalar(1 - 0.25 * k);
          });
          // 전사 인자: 인핸서 위에 모여요
          posAt(E, loop, V1);
          tfs.forEach((m, i) => { const k = ease(tfk * 1.2 - i * 0.2); m.position.set(V1.x + (i - 1) * 0.28, V1.y + lerp(2.6, 0.38 + (i === 1 ? 0.2 : 0), k), (i - 1) * 0.15); m.visible = tfk > 0.01; });
          // 기본 전사 인자(프로모터) · 매개 단백질
          posAt(P, loop, V1); V2.copy(V1);
          basal.forEach((m, i) => { m.position.set(V2.x + (i - 0.5) * 0.35, V2.y + 0.3, 0); m.visible = open > 0.5; });
          posAt(E, loop, V1);
          med.visible = loop > 0.55; med.position.set((V1.x + V2.x) / 2, 0.55, 0.0); med.scale.set(Math.max(0.01, (Math.abs(V1.x - V2.x) + 0.8) * 0.75), 0.8, 1); med.scale.x = Math.max(0.01, med.scale.x * ease((loop - 0.55) / 0.45));
          // RNA 중합 효소 (프로모터에서 시작해 유전자를 따라 움직여요)
          const trans = polk > 0.97, run = trans ? ((t * 0.12) % 1) : 0;
          const pxd = trans ? lerp(P, GEND - 0.3, run) : P;
          posAt(pxd, loop, V1);
          pol.position.set(V1.x, lerp(3.2, V1.y + 0.55, ease(polk)), lerp(1.0, 0, ease(polk))); pol.visible = polk > 0.01;
          rnaN = trans ? Math.min(rnaMax, Math.floor((pxd - P) / 0.1) + 1) : 0;
          for (let i = 0; i < rnaMax; i++) {
            if (i >= rnaN) { M4.makeScale(0, 0, 0); rna.setMatrixAt(i, M4); continue; }
            const s2 = i * 0.1; M4.makeTranslation(V1.x - 0.1 - s2 * 0.9, V1.y - 0.55 - Math.min(s2, 1.8) * 0.45 + 0.1 * Math.sin(s2 * 4), 0.35); rna.setMatrixAt(i, M4);
          }
          rna.instanceMatrix.needsUpdate = true;
          rnaAnchor.position.set(V1.x - 1.2, V1.y - 1.5, 0.35);
          // 이름표
          L.enh.show(true); L.pro.show(true); L.gene.show(true); L.nuc.show(open < 0.5); L.tf.show(tfk > 0.8); L.med.show(loop > 0.9); L.pol.show(polk > 0.8); L.mrna.show(rnaN > 8);
        },
        sync() {},
      };
    },
  });
})();
