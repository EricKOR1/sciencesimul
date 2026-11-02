/* h1-geologic-time · 3D 지층 기둥과 화석
   아래 지층일수록 오래되었고(지층 누중), 지질시대마다 대표 화석이 달라요.
   시대 이름과 연대는 2D 실험(ERAS)과 같아요. 크기와 두께는 보기 좋게 줄인 모형이에요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHN = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);

  window.SciSim3D.attach({
    title: '3D 지층과 화석',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: PHN ? 16 : 11.5, theta: 0.45, phi: 1.2, target: [0, 3, 0], min: 7, max: 30 },
    autoRotate: 0.18,
    levels: [0, 1],
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const mat = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.85, metalness: 0.02 }, o || {}));
      const W = 6.4, D = 4.2;
      const ERA = [
        { key: 'pre', name: '선캄브리아시대', yr: '46억~5.4억 년 전', h: 1.7, bands: [0x6c5d4c, 0x7a6a55, 0x5f5242, 0x84735c], col: '#8a7a64' },
        { key: 'pal', name: '고생대', yr: '5.4억~2.5억 년 전', h: 1.5, bands: [0x3f8a63, 0x56a07a, 0x34765a, 0x62ad84], col: '#2fa56b' },
        { key: 'mes', name: '중생대', yr: '2.5억~6600만 년 전', h: 1.5, bands: [0xc9803a, 0xdc9550, 0xb86f2f, 0xe3a566], col: '#e08a2e' },
        { key: 'cen', name: '신생대', yr: '6600만 년 전~현재', h: 1.3, bands: [0x4f86d6, 0x6a9be0, 0x4377c4, 0x7ba9e6], col: '#3b82f6' },
      ];
      const fossilMat = (c) => mat(c, { roughness: 0.55, metalness: 0.05 });

      /* ---------- 화석 모형 ---------- */
      function stromatolite() {
        const g = new THREE.Group();
        [[0, 0.5, 0.28], [0.02, 0.38, 0.4], [0.0, 0.26, 0.52]].forEach((p, i) => {
          const m = new THREE.Mesh(new THREE.SphereGeometry(p[2], 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), fossilMat(i % 2 ? 0xb9a57b : 0x9d8a62));
          m.position.y = -0.3 + i * 0.1; m.scale.set(1.5, 0.8, 0.5); g.add(m);
        });
        return g;
      }
      function trilobite() {
        const g = new THREE.Group(), m = fossilMat(0x4a3d34);
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.34, 24, 14), m); head.scale.set(1.15, 0.55, 0.3); head.position.x = -0.62; g.add(head);
        for (let i = 0; i < 7; i++) {
          const s = new THREE.Mesh(new THREE.SphereGeometry(0.3 - i * 0.022, 20, 12), m);
          s.scale.set(0.34, 0.95 - i * 0.04, 0.3); s.position.x = -0.28 + i * 0.17; g.add(s);
        }
        const tail = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 10), m); tail.scale.set(0.9, 0.9, 0.3); tail.position.x = 0.98; g.add(tail);
        const rib = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.7, 8), fossilMat(0x6a594c)); rib.rotation.z = Math.PI / 2; rib.position.set(0.16, 0, 0.1); g.add(rib);
        g.scale.setScalar(0.85); return g;
      }
      function fern() {
        const g = new THREE.Group(), m = fossilMat(0x24462f);
        const pts = []; for (let i = 0; i <= 12; i++) pts.push(new THREE.Vector3(Math.sin(i * 0.2) * 0.08, -0.45 + i * 0.085, 0));
        g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.025, 6, false), m));
        for (let i = 1; i < 12; i++) for (const s of [-1, 1]) {
          const l = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), m); const len = 0.34 * (1 - i / 14);
          l.scale.set(len / 0.1, 0.35, 0.25); l.position.set(pts[i].x + s * len * 0.55, pts[i].y + 0.04, 0); l.rotation.z = s * 0.45; g.add(l);
        }
        return g;
      }
      function ammonite() {
        const g = new THREE.Group(), m = fossilMat(0x8a5a2b), n = 90;
        for (let i = 0; i < n; i++) {
          const t = i / (n - 1), a = t * Math.PI * 5.2, r = 0.05 + t * 0.52 * (0.45 + 0.55 * t);
          const rr = 0.028 + t * 0.12;
          const s = new THREE.Mesh(new THREE.SphereGeometry(rr, 10, 8), i % 6 < 3 ? m : fossilMat(0xa97339));
          s.position.set(Math.cos(a) * r, Math.sin(a) * r, 0); s.scale.z = 0.7; g.add(s);
        }
        g.scale.setScalar(0.95); return g;
      }
      function bone() {
        const g = new THREE.Group(), m = fossilMat(0xece3cf);
        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.1, 14), m); shaft.rotation.z = Math.PI / 2 - 0.35; g.add(shaft);
        [[-1, 1], [1, -1]].forEach(([sx, sy]) => {
          const dx = Math.cos(0.35) * 0.55 * sx, dy = Math.sin(0.35) * 0.55 * sx;
          [-0.09, 0.09].forEach((o) => { const k = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 10), m); k.position.set(dx - Math.sin(0.35) * o, dy + Math.cos(0.35) * o, 0); g.add(k); });
        });
        return g;
      }
      function tusk() {
        const g = new THREE.Group(), m = fossilMat(0xf1e6c9), n = 40;
        for (let i = 0; i < n; i++) {
          const t = i / (n - 1), a = -0.3 + t * 1.9;
          const s = new THREE.Mesh(new THREE.SphereGeometry(0.15 * (1 - t * 0.85) + 0.02, 12, 8), m);
          s.position.set(Math.sin(a) * 0.8 - 0.4, -Math.cos(a) * 0.8 + 0.4, 0); g.add(s);
        }
        return g;
      }
      function nummulite() {
        const g = new THREE.Group();
        [[0, 0, 0.3], [0.55, 0.25, 0.22], [-0.45, 0.35, 0.18]].forEach((p, i) => {
          const m = new THREE.Mesh(new THREE.CylinderGeometry(p[2], p[2], 0.1, 24), fossilMat(i ? 0xe4d6a8 : 0xd8c88e)); m.rotation.x = Math.PI / 2; m.position.set(p[0], p[1], 0);
          g.add(m);
          const r = new THREE.Mesh(new THREE.TorusGeometry(p[2] * 0.6, 0.012, 6, 24), fossilMat(0x8d7c45)); r.position.set(p[0], p[1], 0.055); g.add(r);
        });
        return g;
      }

      /* ---------- 지층 기둥 ---------- */
      const eras = []; // { group, mats, fossils[] }
      let y0 = 0;
      const frontZ = D / 2;
      ERA.forEach((e, ei) => {
        const grp = new THREE.Group(); grp.position.y = y0; root.add(grp);
        const inner = new THREE.Group(); grp.add(inner); // inner.scale.y 로 쌓이는 모양
        const mats = [];
        const bh = e.h / e.bands.length;
        e.bands.forEach((c, bi) => {
          const m = mat(c, { transparent: true, opacity: 1 }); mats.push(m);
          const wob = 0.04 * ((bi + ei) % 3);
          const b = new THREE.Mesh(new THREE.BoxGeometry(W - wob * 2, bh - 0.012, D - wob * 2), m);
          b.position.y = bi * bh + bh / 2; b.castShadow = true; b.receiveShadow = true; inner.add(b);
          // 지층 사이의 얇은 구분선
          const ln = new THREE.Mesh(new THREE.BoxGeometry(W + 0.004, 0.018, D + 0.004), mat(0x2a2f3a, { transparent: true, opacity: 0.5 })); ln.position.y = bi * bh; inner.add(ln); mats.push(ln.material);
        });
        eras.push({ grp, inner, mats, fossils: [], y0, h: e.h, p: 1 });
        y0 += e.h;
      });
      const topY = y0;
      // 맨 위 흙 + 풀
      const soil = new THREE.Mesh(new THREE.BoxGeometry(W + 0.02, 0.16, D + 0.02), mat(0x5a8f3c)); soil.position.y = topY + 0.08; soil.receiveShadow = true; root.add(soil);

      function put(era, obj, x, y, key, text, rotZ, size) {
        obj.position.set(x, eras[era].y0 + y, frontZ + 0.02); obj.rotation.z = rotZ || 0;
        if (size) obj.scale.multiplyScalar(size);
        obj.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.material.transparent = true; eras[era].mats.push(o.material); } });
        root.add(obj); eras[era].fossils.push({ obj, label: null, text });
      }
      put(0, stromatolite(), -1.4, 0.55, 'st', '스트로마톨라이트', 0, 1.0);
      put(0, stromatolite(), 1.6, 1.1, 'st2', '', 0, 0.7);
      put(1, trilobite(), -1.5, 0.7, 'tr', '삼엽충', 0.15);
      put(1, fern(), 1.7, 0.75, 'fe', '고사리 화석', 0, 1.2);
      put(2, ammonite(), -1.6, 0.85, 'am', '암모나이트', 0, 1.0);
      put(2, bone(), 1.5, 0.75, 'bo', '공룡 뼈', 0, 1.2);
      put(3, tusk(), -1.4, 0.75, 'tu', '매머드 상아', 0, 0.95);
      put(3, nummulite(), 1.6, 0.6, 'nu', '화폐석', 0, 1.0);
      // 화석 이름표 (켜고 끌 수 있어요)
      const fosLabs = [];
      eras.forEach((e) => e.fossils.forEach((f) => { if (f.text) { f.label = label(f.text, f.obj, { size: 12, offset: [0, 0.62, 0.4] }); fosLabs.push(f.label); } }));
      // 시대 이름표 (오른쪽 옆면)
      const eraLabs = ERA.map((e, i) => label(e.name + '<br><span style="font-weight:700;font-size:.88em">' + e.yr + '</span>', [W / 2 + 0.2, eras[i].y0 + eras[i].h / 2, 0.5], { size: 12, color: e.col, offset: [0.9, 0, 0] }));

      // 시간 화살표 (왼쪽)
      const arrM = mat(0xe8eefc, { roughness: 0.4 });
      const aShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, topY - 0.6, 12), arrM); aShaft.position.set(-W / 2 - 0.55, topY / 2, 0.3); root.add(aShaft);
      const aHead = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.42, 16), arrM); aHead.position.set(-W / 2 - 0.55, topY - 0.1, 0.3); root.add(aHead);
      label('오래됨 ↓', [-W / 2 - 0.55, 0.15, 0.3], { size: 12, offset: [-0.2, 0, 0] });
      label('↑ 새로움', [-W / 2 - 0.55, topY + 0.35, 0.3], { size: 12, offset: [-0.2, 0, 0] });

      // 바닥 판
      const base = new THREE.Mesh(new THREE.CylinderGeometry(5.2, 5.4, 0.3, 48), mat(0x2d3547, { roughness: 0.9 })); base.position.y = -0.17; base.receiveShadow = true; root.add(base);

      /* ---------- 상태 · 조작 ---------- */
      const st = { sel: 'all', labels: true, play: false, pt: 0 };
      function apply() {
        const si = ERA.findIndex((e) => e.key === st.sel);
        eras.forEach((e, i) => {
          const dim = si >= 0 && si !== i, op = dim ? 0.18 : 1;
          e.mats.forEach((m) => { m.opacity = op; m.depthWrite = !dim; });
          e.fossils.forEach((f) => { f.obj.visible = e.p > 0.98; if (f.label) f.label.show(st.labels && !dim && e.p > 0.98); });
        });
        eraLabs.forEach((l, i) => { l.show(si < 0 || si === i); });
        const e = ERA[si];
        if (e) info('<b>' + e.name + '</b> (' + e.yr + ')<br>이 시대의 지층에서 나오는 화석으로 그때의 생물과 환경을 알 수 있어요.');
        else info('<b>아래 지층이 더 오래된 지층</b>이에요.<br>지질시대마다 대표 화석이 달라서, 화석으로 지층의 시대를 알 수 있어요.');
      }
      controls.segment('시대', [{ value: 'all', label: '전체' }, { value: 'pre', label: '선캄브리아' }, { value: 'pal', label: '고생대' }, { value: 'mes', label: '중생대' }, { value: 'cen', label: '신생대' }], 'all', (v) => { st.sel = v; apply(); });
      const playB = controls.button('▶ 지층이 쌓이는 순서', () => {
        if (st.play) return; st.play = true; st.pt = 0; eras.forEach((e) => { e.p = 0; e.inner.scale.y = 0.001; e.grp.visible = false; });
        soil.visible = false; apply();
      });
      controls.button('🏷 화석 이름', () => { st.labels = !st.labels; apply(); });
      apply();

      const ease = (x) => x * x * (3 - 2 * x);
      return {
        update(dt) {
          if (!st.play) return;
          st.pt += dt; const per = 1.3;
          eras.forEach((e, i) => {
            const p = Math.max(0, Math.min(1, (st.pt - i * per) / per));
            e.p = p; e.grp.visible = p > 0; e.inner.scale.y = Math.max(0.001, ease(p));
          });
          const done = st.pt > per * eras.length;
          if (done) { st.play = false; eras.forEach((e) => { e.p = 1; e.inner.scale.y = 1; }); soil.visible = true; }
          apply();
        },
        sync() {},
      };
    },
  });
})();
