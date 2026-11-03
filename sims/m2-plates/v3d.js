/* m2-plates · 3D 판의 움직임 모형 (서로 멀어지는 · 서로 가까워지는 · 서로 어긋나는 경계)
   2D 4단계 '판은 어떻게 움직일까요?'와 같은 내용: 두 판이 경계에서 화살표 방향으로 움직이고, 경계를 따라 지진이 일어나요.
   (판 경계의 세부 지질 구조는 이 차시에서 다루지 않아요.) ▶ 재생으로 판의 움직임을 반복해서 봐요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHN = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const KINDS = ['div', 'conv', 'trans'];
  // 2D 차시의 PL_MARK와 같은 이름 · 위치 · 설명 (2D가 내보내면 그것을 그대로 써요)
  const FALLBACK = {
    div: { name: '서로 멀어지는 경계', where: '태평양 동쪽 바다 한가운데', text: '두 판이 반대 방향으로 움직여서 서로 멀어져요. 대서양도 이렇게 넓어졌어요.' },
    conv: { name: '서로 가까워지는 경계', where: '남아메리카 서쪽 바닷가', text: '두 판이 서로를 향해 움직여서 가까워져요.' },
    trans: { name: '서로 어긋나는 경계', where: '미국 캘리포니아', text: '두 판이 서로 반대 방향으로 스쳐 지나가며 어긋나요.' },
  };
  const PM = (k) => { const s = window.__sim; return (s && s.PL_MARK && s.PL_MARK[k]) || FALLBACK[k]; };
  const SW = 3.4, SD = 3.0, SH = 0.8;      // 판 하나의 가로 · 세로 · 두께

  window.SciSim3D.attach({
    title: '판의 움직임 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: PHN ? 15 : 11.5, theta: 0.45, phi: 0.95, min: 6, max: 24, target: [0, 0, 0] },
    autoRotate: 0.08,
    levels: [],                               // 4단계 미션은 2D 지도에서 해요 (3D는 [🧊 3D]로 열어요)
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const V3 = THREE.Vector3;
      const std = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.7, metalness: 0.02 }, o || {}));
      const A = 0x7aa7e8, B = 0xf0a96a;     // 2D 모형의 두 판 색

      // 바닥
      const floor = new THREE.Mesh(new THREE.CylinderGeometry(5.6, 5.8, 0.2, 56), new THREE.MeshBasicMaterial({ color: 0x1d2a4a }));
      floor.position.y = -SH / 2 - 0.2; root.add(floor);

      function plate(col) {
        const g = new THREE.Group();
        const m = std(col, { transparent: true, opacity: 1, roughness: 0.55 });
        const b = new THREE.Mesh(new THREE.BoxGeometry(SW, SH, SD), m); b.castShadow = b.receiveShadow = true; g.add(b);
        g.userData.mat = m; return g;
      }
      function arrow(dir) {          // dir: 진행 방향 단위 벡터 (판 위에 놓인 화살표)
        const grp = new THREE.Group();
        const m = new THREE.MeshStandardMaterial({ color: 0x1b2333, emissive: 0x1b2333, emissiveIntensity: 0.3, roughness: 0.4, transparent: true });
        const L = 1.7;
        const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, L - 0.5, 12), m); sh.position.y = (L - 0.5) / 2;
        const hd = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.5, 18), m); hd.position.y = L - 0.25;
        grp.add(sh, hd);
        grp.quaternion.setFromUnitVectors(new V3(0, 1, 0), dir);
        // 화살표 중심이 판 위 가운데에 오도록
        grp.position.sub(dir.clone().multiplyScalar(L / 2));
        const w = new THREE.Group(); w.add(grp); w.userData.mat = m; w.position.y = SH / 2 + 0.12; return w;
      }
      const X = new V3(1, 0, 0), Z = new V3(0, 0, 1);
      const pa = plate(A), pb = plate(B); root.add(pa, pb);
      const ar = { a: null, b: null };
      function setArrows(k) {
        [ar.a, ar.b].forEach((w) => { if (w) { w.parent && w.parent.remove(w); } });
        if (k === 'div') { ar.a = arrow(X.clone().negate()); ar.b = arrow(X.clone()); }
        else if (k === 'conv') { ar.a = arrow(X.clone()); ar.b = arrow(X.clone().negate()); }
        else { ar.a = arrow(Z.clone().negate()); ar.b = arrow(Z.clone()); }
        pa.add(ar.a); pb.add(ar.b);
      }

      // 판 경계선 (2D 범례의 '판 경계' 붉은 선) 과 지진 (붉은 점)
      const bline = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, SD + 0.8), new THREE.MeshBasicMaterial({ color: 0xc1121f }));
      bline.position.y = -SH / 2 - 0.08; root.add(bline);
      const quakes = [];
      for (let i = 0; i < 5; i++) {
        const s = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 12), new THREE.MeshBasicMaterial({ color: 0xe11d48, transparent: true, opacity: 0.9 }));
        s.position.set(0, SH / 2 + 0.2, (i - 2) * 0.6); s.userData.ph = i * 0.9; root.add(s); quakes.push(s);
      }
      const labQ = label('지진', quakes[2], { offset: [0, 0.5, 0], color: 'rgba(225,29,72,.9)' });
      const labB = label('판 경계', bline, { offset: [0, -0.2, SD / 2 + 0.5], color: 'rgba(193,18,31,.9)' });
      const labA = label('판', pa, { offset: [0, 0.9, 0] }), labBp = label('판', pb, { offset: [0, 0.9, 0] });

      let kind = 'conv', p = 0, labsOn = true, pl = null;
      function layout(pp) {
        if (!ar.a) return;
        const fade = Math.min(1, pp * 7, (1 - pp) * 7);       // 한 번 움직이고 나면 살짝 사라졌다가 처음부터 (2D와 같아요)
        let ax = 0, az = 0, bx = 0, bz = 0;
        if (kind === 'div') { const d = 0.15 + pp * 1.4; ax = -(SW / 2 + d); bx = SW / 2 + d; }
        else if (kind === 'conv') { const d = 1.5 - pp * 1.3; ax = -(SW / 2 + d); bx = SW / 2 + d; }
        else { const d = (0.5 - pp) * 1.6; ax = -(SW / 2 + 0.06); bx = SW / 2 + 0.06; az = -d; bz = d; }
        pa.position.set(ax, 0, az); pb.position.set(bx, 0, bz);
        [pa, pb].forEach((g) => { g.userData.mat.opacity = fade; });
        [ar.a, ar.b].forEach((w) => { w.userData.mat.opacity = fade; });
        labA.el.style.opacity = labBp.el.style.opacity = fade;
      }
      function setKind(k, push) {
        kind = k; setArrows(k);
        const m = PM(k);
        info(`<b>${m.name}</b><br>${m.where}<br>${m.text}<br><span style="color:#ffd34d">화살표 방향으로 판이 움직여요. 경계에서 지진이 일어나요.</span>`);
        layout(p);
        if (push) { // 3D에서 고른 경계를 2D 지도 해설창에도 보여 줘요 (지도 화면일 때만)
          const s = window.__sim && window.__sim.S, P = s && s.pl;
          if (P && P.view === 2 && !(P.inset && P.inset.kind === k)) { P.inset = { kind: k, t0: performance.now() / 1000 }; lastI = k; }
        }
      }
      function applyLabs() { [labQ, labB, labA, labBp].forEach((l) => l.show(labsOn)); }

      let lastI = null;
      const seg = controls.segment('경계', KINDS.map((k) => ({ label: PM(k).name.replace('서로 ', '').replace(' 경계', ''), value: k })), kind, (v) => setKind(v, true));
      pl = controls.player({
        duration: 6, loop: true, autoplay: true, label: '판 움직임',
        phases: [[0, '움직이기 시작'], [0.3, '판이 움직이는 중'], [0.85, '처음으로']],
        onFrame(pp) { p = pp; layout(pp); },
      });
      controls.button('이름표', () => { labsOn = !labsOn; applyLabs(); });
      setKind(kind); applyLabs();

      function from2D() {
        const s = window.__sim && window.__sim.S, ik = s && s.pl && s.pl.inset && s.pl.inset.kind;
        if (ik && KINDS.includes(ik) && ik !== lastI) { lastI = ik; setKind(ik); seg.set(ik); }
      }
      return {
        sync: from2D,
        update(dt, t) {
          from2D();
          quakes.forEach((q) => { const u = 0.5 + 0.5 * Math.sin(t * 4 + q.userData.ph); q.scale.setScalar(0.7 + 0.8 * u); q.material.opacity = 0.45 + 0.5 * u; });
        },
      };
    },
  });
})();
