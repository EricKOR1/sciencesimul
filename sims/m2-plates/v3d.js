/* m2-plates · 3D 판 경계 단면 모형 (멀어지는 · 가까워지는 · 어긋나는 경계)
   판 위에서 일어나는 일(해령, 해구와 화산, 변환 단층)을 블록 모형으로 돌려 봐요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHN = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const KINDS = ['div', 'conv', 'trans'];
  const TXT = {
    div: ['멀어지는 경계 (해령)', '두 판이 서로 <b>멀어져요</b>. 틈으로 마그마가 올라와 새 바다 지각이 생겨요.'],
    conv: ['가까워지는 경계 (해구 · 화산)', '바다 판이 대륙 판 <b>아래로 들어가요</b>. 깊은 해구가 생기고 지진과 화산이 일어나요.'],
    trans: ['어긋나는 경계 (변환 단층)', '두 판이 <b>옆으로 어긋나요</b>. 힘이 쌓였다가 풀리면 지진이 일어나요.'],
  };
  const D = 4.2;

  window.SciSim3D.attach({
    title: '판의 경계 3D 단면',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: PHN ? 17 : 13, theta: 0.55, phi: 1.1, min: 6, max: 28, target: [0, -0.8, 0] },
    autoRotate: 0.1,
    levels: [3],
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const V3 = THREE.Vector3;
      const mat = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.75, metalness: 0.02 }, o || {}));
      function poly(pts, depth, m) {
        const sh = new THREE.Shape(); pts.forEach((p, i) => i ? sh.lineTo(p[0], p[1]) : sh.moveTo(p[0], p[1]));
        const g = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: false }); g.translate(0, 0, -depth / 2);
        const me = new THREE.Mesh(g, m); me.castShadow = true; me.receiveShadow = true; return me;
      }
      const at = (m, x, y, z) => { m.position.set(x, y, z); return m; };
      const cMantle = 0xc4481c, cOcean = 0x43597d, cCont = 0x6e5539, cSlab = 0x6f7f9c;
      const mMantle = mat(cMantle, { emissive: 0xb03a10, emissiveIntensity: 0.5, roughness: 0.6 });
      const mOc = mat(cOcean, { roughness: 0.7 });
      const mCont = mat(cCont, { roughness: 0.9 });
      const mLith = mat(0x56688a, { roughness: 0.8 });
      const water = () => new THREE.MeshStandardMaterial({ color: 0x2f8fd8, transparent: true, opacity: 0.3, roughness: 0.1, depthWrite: false });
      const G = { div: new THREE.Group(), conv: new THREE.Group(), trans: new THREE.Group() };
      KINDS.forEach((k) => { G[k].visible = false; root.add(G[k]); });
      const labs = [];
      const L = (t, obj, off) => { const l = label(t, obj, { offset: off }); labs.push(l); l.show(false); return l; };
      const arrows = [];
      function arrow(g, from, to, col) {
        const a = new V3(...from), b = new V3(...to), d = b.clone().sub(a), len = d.length();
        const grp = new THREE.Group(); const m = new THREE.MeshStandardMaterial({ color: col || 0xffd34d, emissive: col || 0xffd34d, emissiveIntensity: 0.35, roughness: 0.4 });
        const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, len - 0.45, 12), m); sh.position.y = (len - 0.45) / 2;
        const hd = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.45, 16), m); hd.position.y = len - 0.225;
        grp.add(sh, hd); grp.position.copy(a); grp.quaternion.setFromUnitVectors(new V3(0, 1, 0), d.normalize()); g.add(grp); return grp;
      }

      /* ---------- 멀어지는 경계 ---------- */
      const stripes = [];
      {
        const g = G.div;
        g.add(at(new THREE.Mesh(new THREE.BoxGeometry(9.4, 2.4, D - 0.08), mMantle), 0, -2.55, 0));
        const plL = new THREE.Mesh(new THREE.BoxGeometry(4.4, 1.0, D), mLith); plL.position.set(-2.4, -0.85, 0); plL.castShadow = plL.receiveShadow = true;
        const plR = plL.clone(); plR.position.x = 2.4; g.add(plL, plR);
        // 해령: 가운데로 오를수록 높은 산맥
        const rg = poly([[-1.9, -0.35], [-0.9, 0.15], [-0.25, 0.45], [0, 0.25], [0.25, 0.45], [0.9, 0.15], [1.9, -0.35]], D, mat(0x6b5a5a, { roughness: 0.9 }));
        rg.position.z = 0; g.add(rg);
        const mag = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.6, D - 0.1), mat(0xff7a2a, { emissive: 0xff5a1a, emissiveIntensity: 0.9 })); mag.position.set(0, -0.9, 0); g.add(mag);
        const sea = new THREE.Mesh(new THREE.BoxGeometry(9.4, 0.7, D), water()); sea.position.set(0, 0.15, 0); sea.renderOrder = 3; g.add(sea);
        // 해저 줄무늬(나이): 해령에서 생겨 양쪽으로 퍼져 나가요
        for (let i = 0; i < 12; i++) {
          [-1, 1].forEach((s) => { const b = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.07, D - 0.05), mat(0x777777)); b.userData = { s, u: i / 12 }; g.add(b); stripes.push(b); });
        }
        arrow(g, [-0.4, 1.2, D / 2 + 0.2], [-2.6, 1.2, D / 2 + 0.2]);
        arrow(g, [0.4, 1.2, D / 2 + 0.2], [2.6, 1.2, D / 2 + 0.2]);
        L('해령', rg, [0, 0.9, 0]); L('마그마', mag, [0, -0.5, D / 2]); L('판', plL, [0, 0.9, 0.6]); L('맨틀', g, [3.3, -2.6, D / 2]);
      }
      const magSpheres = [];
      for (let i = 0; i < 10; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 10), new THREE.MeshBasicMaterial({ color: 0xffc36b })); G.div.add(s); magSpheres.push(s); }

      /* ---------- 가까워지는 경계 ---------- */
      const quakes = [], lava = [];
      let volc;
      {
        const g = G.conv, slope = 0.7;
        const yS = (x) => 0.1 - slope * (x + 0.6);
        g.add(at(new THREE.Mesh(new THREE.BoxGeometry(9.4, 3.2, D - 0.08), mMantle), 0, -2.05, 0));
        g.add(poly([[-4.7, 0.1], [-0.6, 0.1], [3.5, yS(3.5)], [3.5, yS(3.5) - 0.55], [-0.6, -0.45], [-4.7, -0.45]], D, mOc));
        // 해구(오목한 바닥): 얇은 어두운 덩어리
        const cont = poly([[-0.6, 0.1], [0.3, 0.5], [1.0, 0.9], [1.7, 1.05], [4.7, 1.05], [4.7, -1.0], [0.97, -1.0]], D, mCont);
        g.add(cont); volc = cont;
        const sea = new THREE.Mesh(new THREE.BoxGeometry(4.3, 0.7, D), water()); sea.position.set(-2.55, 0.45, 0); sea.renderOrder = 3; g.add(sea);
        // 화산 꼭대기 분화구 불빛
        const cone = new THREE.Mesh(new THREE.ConeGeometry(1.0, 1.25, 40, 1, false), mat(0x55402a, { roughness: 0.95 })); cone.position.set(2.7, 1.65, 0); cone.castShadow = true; g.add(cone);
        const crater = new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 12), new THREE.MeshBasicMaterial({ color: 0xff6a2a })); crater.position.set(2.7, 2.3, 0); g.add(crater);
        for (let i = 0; i < 8; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), new THREE.MeshBasicMaterial({ color: 0xff8a3a })); s.userData = { u: i / 8 }; g.add(s); lava.push(s); }
        // 진원(지진이 시작된 곳): 섭입대를 따라 늘어선 빨간 공
        for (let i = 0; i < 8; i++) {
          const x = -0.2 + i * 0.5, s = new THREE.Mesh(new THREE.SphereGeometry(0.12, 14, 10), new THREE.MeshBasicMaterial({ color: 0xff3b3b, transparent: true, opacity: 0.9 }));
          s.position.set(x, yS(x) - 0.27, D / 2 + 0.05); s.userData.ph = i * 0.8; g.add(s); quakes.push(s);
        }
        // 마그마 올라오는 길 (섭입대 → 화산)
        const mg = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new V3(1.7, yS(1.7) - 0.3, 0), new V3(1.9, -0.4, 0), new V3(2.4, 0.7, 0), new V3(2.7, 2.2, 0)]), 30, 0.07, 8), new THREE.MeshBasicMaterial({ color: 0xff6a2a, transparent: true, opacity: 0.75 }));
        g.add(mg);
        arrow(g, [-4.2, 0.6, D / 2 + 0.2], [-1.6, 0.6, D / 2 + 0.2]);
        arrow(g, [1.3, yS(1.3) + 0.25, D / 2 + 0.25], [2.1, yS(2.1) - 0.2, D / 2 + 0.25], 0xff7a7a);
        L('해구', g, [-0.6, -0.5, D / 2]); L('화산', crater, [0, 0.5, 0]); L('지진 발생', quakes[3], [0.2, -0.45, 0]); L('바다 판', g, [-3.4, -1.0, D / 2]); L('대륙 판', g, [3.5, 0.2, D / 2]); L('맨틀', g, [3.2, -2.6, D / 2]);
      }

      /* ---------- 어긋나는 경계 ---------- */
      const tL = new THREE.Group(), tR = new THREE.Group();
      {
        const g = G.trans, DD = 5.4;
        g.add(at(new THREE.Mesh(new THREE.BoxGeometry(9.4, 2.0, DD - 0.1), mMantle), 0, -2.35, 0));
        [[tL, -2.3], [tR, 2.3]].forEach(([t, x]) => {
          const b = new THREE.Mesh(new THREE.BoxGeometry(4.5, 1.5, DD), mCont); b.position.set(x, -0.9, 0); b.castShadow = b.receiveShadow = true;
          const top = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.12, DD), mat(0x7ba05b, { roughness: 0.95 })); top.position.set(x, -0.1, 0); top.receiveShadow = true;
          t.add(b, top);
          // 길 (판이 어긋나면 길도 끊어져요)
          const road = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.05, 0.42), mat(0x3b3f4a, { roughness: 0.7 })); road.position.set(x, -0.02, 0); t.add(road);
          for (let i = 0; i < 4; i++) { const d = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.055, 0.06), mat(0xffd34d)); d.position.set(x + (i - 1.5) * 1.05, -0.015, 0); t.add(d); }
          g.add(t);
        });
        const fault = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.7, DD + 0.05), mat(0xff5a5a, { emissive: 0xff3030, emissiveIntensity: 0.6 })); fault.position.set(0, -0.8, 0); g.add(fault);
        arrow(g, [-2.3, 0.35, -1.3], [-2.3, 0.35, 1.4]);
        arrow(g, [2.3, 0.35, 1.3], [2.3, 0.35, -1.4]);
        L('단층', fault, [0, 0.85, 0]); L('끊어진 길', g, [0, 0.55, 0]); L('판', tL, [-1.5, 0.3, -2.1]); L('맨틀', g, [3.3, -2.6, 2.4]);
      }

      /* ---------- 상태 · 조작 ---------- */
      let kind = 'conv', labsOn = true, play = true, T = 0, shake = 0;
      function setKind(k) {
        kind = k; KINDS.forEach((q) => { G[q].visible = q === k; });
        info(`<b>${TXT[k][0]}</b><br>${TXT[k][1]}`);
        applyLabs();
      }
      function applyLabs() {
        // 각 경계의 이름표 일부만 켜기
        const owner = { div: [0, 4], conv: [4, 10], trans: [10, 14] }[kind];
        labs.forEach((l, i) => l.show(labsOn && i >= owner[0] && i < owner[1]));
      }
      const seg = controls.segment('경계', [{ label: '멀어지는', value: 'div' }, { label: '가까워지는', value: 'conv' }, { label: '어긋나는', value: 'trans' }], kind, (v) => setKind(v));
      controls.button('이름표', () => { labsOn = !labsOn; applyLabs(); });
      controls.button('⏯ 멈춤/재생', () => { play = !play; });
      setKind(kind);
      let lastI = null;
      return {
        sync() {
          const s = window.__sim && window.__sim.S, ik = s && s.pl && s.pl.inset && s.pl.inset.kind;
          if (ik && KINDS.includes(ik) && ik !== lastI) { lastI = ik; setKind(ik); seg.set(ik); }
        },
        update(dt, t) {
          const s = window.__sim && window.__sim.S, ik = s && s.pl && s.pl.inset && s.pl.inset.kind;
          if (ik && KINDS.includes(ik) && ik !== lastI) { lastI = ik; setKind(ik); seg.set(ik); }
          if (play) T += dt;
          if (kind === 'div') {
            stripes.forEach((b) => {
              const u = (b.userData.u + T * 0.06) % 1, x = 0.45 + u * 3.9;
              b.position.set(b.userData.s * x, -0.33 - 0.03 * (1 - u) + 0.0, 0); b.position.y = -0.31;
              const c = new THREE.Color().setHSL(0.05 + 0.55 * u, 0.45, 0.42 + 0.1 * (b.userData.u % 0.17 > 0.08 ? 1 : 0)); b.material.color.copy(c);
              b.scale.y = 1; b.visible = true; b.material.emissive = b.material.emissive || new THREE.Color(); b.material.emissive.setRGB(0.7 * (1 - u) * (1 - u), 0.22 * (1 - u) * (1 - u), 0);
            });
            magSpheres.forEach((m, i) => { const u = (T * 0.5 + i / magSpheres.length) % 1; m.position.set(0.12 * Math.sin(i * 3 + T * 3), -1.7 + u * 2.0, 0.6 * Math.sin(i * 2.3) ); });
          } else if (kind === 'conv') {
            quakes.forEach((q) => { const p = 0.5 + 0.5 * Math.sin(T * 3 + q.userData.ph); q.scale.setScalar(0.7 + 0.8 * p); q.material.opacity = 0.45 + 0.55 * p; });
            lava.forEach((l) => {
              const u = (T * 0.4 + l.userData.u) % 1, a = Math.PI * (0.2 + 0.6 * ((l.userData.u * 7) % 1)); const r = u * 1.6;
              l.position.set(2.7 + Math.cos(a) * r * 0.6, 2.3 + Math.sin(a) * r * 0.9 - 1.6 * u * u + 0.3, 0.5 * Math.sin(l.userData.u * 40));
              l.visible = u < 0.9; l.scale.setScalar(1 - u * 0.6);
            });
          } else {
            // 천천히 힘이 쌓이며 어긋나다가 '툭' 움직이며 지진
            const c = (T * 0.35) % 1, slip = c < 0.8 ? c / 0.8 * 0.5 : 0.5 + (c - 0.8) / 0.2 * 0.8; // 쌓이는 동안 느리게
            const off = Math.min(1.4, slip) * 0.9;
            tL.position.z = off * 0.5 - 0.45; tR.position.z = -off * 0.5 + 0.45;
            const sh = c > 0.8 && c < 0.95 ? Math.sin(T * 60) * 0.03 : 0; tL.position.y = sh; tR.position.y = -sh;
          }
        },
      };
    },
  });
})();
