/* hb-chromosome · 3D DNA → 뉴클레오솜 → 염색사 → 염색체, 그리고 핵형 분석
   DNA가 히스톤을 감고 겹겹이 응축해 염색체가 되는 과정을 입체로 보고, 사람의 핵형(상염색체 22쌍 + 성염색체 1쌍)을 살펴봐요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const narrow = window.innerWidth < 600 || window.innerHeight > window.innerWidth * 1.1;
  function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  const STAGES = [
    { k: 'DNA', info: '<b>DNA</b>: 두 가닥이 꼬인 이중 나선이에요.<br>염기(A·T, G·C)가 짝을 이뤄요.' },
    { k: '뉴클레오솜', info: '<b>뉴클레오솜</b>: DNA가 히스톤 단백질을 감아 구슬처럼 이어져요.' },
    { k: '염색사', info: '<b>염색사(염색질)</b>: 뉴클레오솜이 다시 꼬여 굵은 실이 돼요. (세포 분열 전 핵 속)' },
    { k: '염색체', info: '<b>염색체</b>: 세포 분열 때 염색사가 응축해 막대 모양으로 뭉쳐요.' },
    { k: '핵형', info: '<b>핵형 분석</b>: 염색체를 크기·모양별로 짝지어 늘어놓아요.<br>상동 염색체 22쌍 + 성염색체 1쌍 = 46개' },
  ];

  window.SciSim3D.attach({
    title: '염색체와 핵형 3D',
    hint: '단계를 눌러 응축 과정을 보세요 · 드래그: 돌리기',
    camera: { dist: narrow ? 13 : 10, theta: 0.3, phi: 1.2, min: 5, max: 22 },
    autoRotate: 0.18,
    levels: [0, 1, 3],
    build(ctx) {
      const { THREE, root, label, info, controls, orbit } = ctx;
      const V3 = (x, y, z) => new THREE.Vector3(x, y, z || 0);
      const std = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.42, metalness: 0.03 }, o || {}));
      const R = rng(41), D = new THREE.Object3D(), AR = (x, y, z) => { const o = new THREE.Object3D(); o.position.set(x, y, z || 0); curG.add(o); return o; };
      let curG = root;
      const groups = [], labs = [];
      const mk = (i) => { const g = new THREE.Group(); g.visible = false; root.add(g); groups[i] = g; labs[i] = []; curG = g; return g; };
      const lab = (i, t, o, off, opt) => { const l = label(t, o, Object.assign({ offset: off || [0, 0, 0] }, opt || {})); l.show(false); labs[i].push(l); return l; };
      const tubeOf = (pts, r, seg, m) => new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), seg, r, 8, false), m);
      const goldM = std(0xf0b400, { roughness: 0.35, emissive: 0x5a3c00, emissiveIntensity: 0.35 }), histM = std(0x7a4fd0, { roughness: 0.4 });

      /* 0 DNA 이중 나선 */
      { const g = mk(0), L = 8, TURNS = 3.2, r = 0.62, x0 = -L / 2;
        const p1 = [], p2 = [];
        for (let i = 0; i <= 160; i++) { const u = i / 160, a = u * TURNS * 2 * Math.PI; p1.push(V3(x0 + u * L, Math.cos(a) * r, Math.sin(a) * r)); p2.push(V3(x0 + u * L, Math.cos(a + Math.PI) * r, Math.sin(a + Math.PI) * r)); }
        g.add(tubeOf(p1, 0.11, 200, std(0x3b82f0, { roughness: 0.35 })), tubeOf(p2, 0.11, 200, std(0x2fbf71, { roughness: 0.35 })));
        const NR = 26, half = new THREE.CylinderGeometry(0.06, 0.06, 1, 8);
        const hA = new THREE.InstancedMesh(half, std(0xffffff, { roughness: 0.4 }), NR), hB = new THREE.InstancedMesh(half, std(0xffffff, { roughness: 0.4 }), NR);
        const BASE = [[0xff6a5c, 0x4aa8ff], [0xffd34d, 0x6ee0a0]]; // A-T / G-C
        for (let i = 0; i < NR; i++) {
          const u = (i + 0.5) / NR, a = u * TURNS * 2 * Math.PI, A = V3(x0 + u * L, Math.cos(a) * r, Math.sin(a) * r), B = V3(x0 + u * L, Math.cos(a + Math.PI) * r, Math.sin(a + Math.PI) * r), dir = B.clone().sub(A), len = dir.length() / 2 - 0.05, n = dir.normalize(), pr = BASE[R() < 0.5 ? 0 : 1], flip = R() < 0.5;
          [[hA, A.clone().addScaledVector(n, len / 2 + 0.1), flip ? pr[0] : pr[1]], [hB, B.clone().addScaledVector(n, -(len / 2 + 0.1)), flip ? pr[1] : pr[0]]].forEach(([m, p, c]) => { D.position.copy(p); D.quaternion.setFromUnitVectors(V3(0, 1, 0), n); D.scale.set(1, len, 1); D.updateMatrix(); m.setMatrixAt(i, D.matrix); m.setColorAt(i, new THREE.Color(c)); });
        }
        g.add(hA, hB);
        lab(0, '당·인산 뼈대', null, [0, 0, 0]).obj = AR(-2.4, 1.1, 0); lab(0, '염기쌍', null, [0, 0, 0]).obj = AR(1.0, -0.15, 0.5); lab(0, 'DNA 이중 나선', null, [0, 0, 0], { color: 'rgba(49,130,246,.92)' }).obj = AR(0, 2.2, 0); }
      /* 1 뉴클레오솜 */
      { const g = mk(1), N = 5, SP = 1.85, pts = [], x0 = -SP * (N - 1) / 2;
        for (let k = 0; k < N; k++) {
          const cx = x0 + k * SP;
          const core = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.55, 28), histM); core.rotation.x = Math.PI / 2; core.position.set(cx, 0, 0); g.add(core);
          const wrap = 1.75, n = 36;
          for (let i = 0; i <= n; i++) { const u = i / n, a = u * wrap * Math.PI * 2 + Math.PI, z = (u - 0.5) * 0.4; pts.push(V3(cx + Math.cos(a) * 0.68 * 1, Math.sin(a) * 0.68, z)); }
        }
        // 구슬 사이는 곧은 연결 DNA, 시작과 끝은 약간 길게
        const first = pts[0].clone().add(V3(-0.8, -0.2, 0)), last = pts[pts.length - 1].clone().add(V3(0.8, 0.2, 0));
        g.add(tubeOf([first].concat(pts, [last]), 0.075, 600, goldM));
        lab(1, '히스톤 단백질', null).obj = AR(x0 + SP, 1.1, 0.4); lab(1, 'DNA', null).obj = AR(x0 + SP * 1.5, -0.95, 0.3); lab(1, '뉴클레오솜', null, [0, 0, 0], { color: 'rgba(49,130,246,.92)' }).obj = AR(x0 + SP * 3, 1.5, 0); }
      /* 2 염색사 (뉴클레오솜이 꼬인 굵은 섬유) */
      { const g = mk(2), L = 8, TURNS = 7, r = 0.95, N = 96, pts = [], bead = new THREE.InstancedMesh(new THREE.SphereGeometry(0.25, 16, 12), histM, N);
        for (let i = 0; i <= 360; i++) { const u = i / 360, a = u * TURNS * 2 * Math.PI; pts.push(V3(-L / 2 + u * L, Math.cos(a) * r, Math.sin(a) * r)); }
        g.add(tubeOf(pts, 0.07, 700, goldM));
        for (let i = 0; i < N; i++) { const u = (i + 0.5) / N, a = u * TURNS * 2 * Math.PI; D.position.set(-L / 2 + u * L, Math.cos(a) * r, Math.sin(a) * r); D.quaternion.identity(); D.scale.setScalar(1); D.updateMatrix(); bead.setMatrixAt(i, D.matrix); }
        g.add(bead);
        lab(2, '염색사', null, [0, 0, 0], { color: 'rgba(49,130,246,.92)' }).obj = AR(0, 2.3, 0); lab(2, '뉴클레오솜', null).obj = AR(-2.7, 1.25, 0.3); lab(2, '연결 DNA', null).obj = AR(1.6, -1.35, 0.3); }
      /* 3 염색체 */
      let chroA, chroB, kin;
      { const g = mk(3), chrom = new THREE.Group(); g.add(chrom);
        function chromatid(col) {
          const pts = [], L = 5.4, r0 = 0.4, TURNS = 26;
          for (let i = 0; i <= 780; i++) { const u = i / 780, ax = (u - 0.5) * L, pinch = 1 - 0.5 * Math.exp(-Math.pow((u - 0.5) / 0.05, 2)), cap = Math.sqrt(Math.max(0.02, 1 - Math.pow(Math.pow(2 * u - 1, 8), 1))), rr = r0 * pinch * Math.min(1, cap * 1.25), a = u * TURNS * 2 * Math.PI; pts.push(V3(Math.cos(a) * rr, ax, Math.sin(a) * rr * 0.9 + 0)); }
          return new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 780, 0.17, 8, false), std(col, { roughness: 0.4 }));
        }
        chroA = new THREE.Group(); chroA.add(chromatid(0x3b82f0)); chroB = new THREE.Group(); chroB.add(chromatid(0x3b82f0));
        chrom.add(chroA, chroB);
        kin = new THREE.Mesh(new THREE.SphereGeometry(0.22, 18, 14), std(0xffd34d, { emissive: 0x7a5a00, emissiveIntensity: 0.4 })); chrom.add(kin);
        g.userData.chrom = chrom;
        lab(3, '염색체', null, [0, 0, 0], { color: 'rgba(49,130,246,.92)' }).obj = AR(0, 3.5, 0);
        const lc = lab(3, '동원체', null); lc.obj = AR(1.0, 0, 0.3); const ls = lab(3, '염색 분체', null); ls.obj = AR(-0.9, 1.7, 0.2); g.userData.ls = ls; }
      /* 4 핵형 */
      { const g = mk(4), karyo = new THREE.Group(); g.add(karyo);
        const CEN = [0.5, 0.35, 0.45, 0.28, 0.3, 0.36, 0.3, 0.38, 0.3, 0.34, 0.4, 0.28, 0.12, 0.1, 0.1, 0.4, 0.32, 0.3, 0.45, 0.45, 0.14, 0.14, 0.35, 0.5];
        function chromGeo(len, c, seed) {
          const prof = [], N = 40, cols = [], r0 = 0.15;
          for (let j = 0; j <= N; j++) { const s = j / N, pin = 1 - 0.5 * Math.exp(-Math.pow((s - c) / 0.045, 2)), cap = Math.sqrt(Math.max(0, 1 - Math.pow(1 - Math.min(1, s / 0.1), 2))) * Math.sqrt(Math.max(0, 1 - Math.pow(1 - Math.min(1, (1 - s) / 0.1), 2))); prof.push(new THREE.Vector2(Math.max(0.001, r0 * pin * cap), (s - 0.5) * len)); }
          const geo = new THREE.LatheGeometry(prof, 14), n = prof.length, col = new Float32Array(geo.attributes.position.count * 3);
          for (let i = 0; i < geo.attributes.position.count; i++) { const j = i % n, band = 0.62 + 0.38 * Math.sin(j * 1.9 + seed * 3.1) * Math.sin(j * 0.7 + seed); col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = Math.max(0.35, band); }
          geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); return geo;
        }
        const matM = std(0xff7aa6, { vertexColors: true, roughness: 0.45 }), patM = std(0x4a98ff, { vertexColors: true, roughness: 0.45 });
        const lens = (i) => 2.5 - i * 0.075, COLS = 8, GX = 1.55, GY = 3.0;
        const members = [];
        function chromObj(len, c, seed, mat) { const m = new THREE.Group(); [-0.085, 0.085].forEach((o, k) => { const ch = new THREE.Mesh(chromGeo(len, c, seed), mat); ch.position.x = o; ch.rotation.z = (k ? -1 : 1) * 0.03; m.add(ch); }); karyo.add(m); return m; }
        for (let i = 0; i < 22; i++) members.push([chromObj(lens(i), CEN[i], i, matM), chromObj(lens(i), CEN[i], i + 0.5, patM)]);
        const sexA = chromObj(2.0, CEN[22], 22, matM), sexY = chromObj(1.3, 0.4, 22.5, patM), sexX2 = chromObj(2.0, CEN[22], 22.8, patM);
        const extra = chromObj(lens(20), CEN[20], 20.9, patM); extra.visible = false; sexX2.visible = false;
        const pos = (i) => { const col = i % COLS, row = Math.floor(i / COLS); return [(col - (COLS - 1) / 2) * GX, -row * GY + GY]; };
        members.forEach(([a, b], i) => { const [x, y] = pos(i); a.position.set(x - 0.32, y, 0); b.position.set(x + 0.32, y, 0); });
        { const [x, y] = pos(22); sexA.position.set(x - 0.32, y, 0); sexY.position.set(x + 0.32, y - 0.35, 0); sexX2.position.set(x + 0.32, y, 0); }
        { const [x, y] = pos(20); extra.position.set(x + 0.82, y, 0); }
        g.userData = { karyo, extra, sexY, sexX2 };
        const l21 = lab(4, '21번', null); l21.obj = AR(pos(20)[0], pos(20)[1] - 1.7, 0); l21.off = [0, 0, 0];
        const lsex = lab(4, '성염색체', null); lsex.obj = AR(pos(22)[0], pos(22)[1] - 1.7, 0); lsex.off = [0, 0, 0];
        const l1 = lab(4, '1번', null); l1.obj = AR(pos(0)[0], pos(0)[1] - 1.7, 0); l1.off = [0, 0, 0];
        g.userData.l21 = l21; g.userData.lsex = lsex;
        lab(4, '어머니 쪽', null, [0, 0, 0], { color: 'rgba(255,122,166,.92)' }).obj = AR(-5.3, 3.9, 0); lab(4, '아버지 쪽', null, [0, 0, 0], { color: 'rgba(74,152,255,.92)' }).obj = AR(-3.4, 3.9, 0);
        }

      let cur = -1, repl = true, male = true, down = false, grow = 1;
      const kg = groups[4].userData;
      function setStage(i) {
        if (i === cur) return; cur = i;
        groups.forEach((g, k) => { g.visible = k === i; labs[k].forEach((l) => l.show(k === i)); });
        grow = 0; seg.set(i);
        subA.forEach((e) => { e.style.display = i === 3 ? '' : 'none'; }); subB.forEach((e) => { e.style.display = i === 4 ? '' : 'none'; });
        refresh();
        if (i === 4) { orbit.dist = narrow ? 20 : 13.5; orbit.phi = 1.38; orbit.ty = 0.2; } else { orbit.dist = narrow ? 13 : 10; orbit.phi = 1.2; orbit.ty = 0; }
      }
      function refresh() {
        let txt = STAGES[cur].info;
        if (cur === 3) { chroB.visible = repl; kin.visible = true; txt += '<br>' + (repl ? '복제 후: 같은 유전 정보를 가진 두 <b>염색 분체</b>가 붙어 있어요.' : '복제 전: 염색 분체가 하나예요.'); groups[3].userData.ls.show(repl); }
        if (cur === 4) { txt = STAGES[4].info + (down ? '<br>21번이 3개: 다운 증후군(염색체 47개)' : ''); kg.extra.visible = down; kg.l21.set(down ? '21번 (3개)' : '21번'); }
        info(txt);
      }
      const seg = controls.segment('', STAGES.map((s, i) => ({ label: s.k, value: i })), 0, setStage);
      const subA = [], subB = [], mark = () => document.querySelector('.v3-ctl');
      let n0 = mark() ? mark().children.length : 0;
      controls.segment('복제', [{ label: '복제 후(X)', value: true }, { label: '복제 전', value: false }], true, (v) => { repl = v; refresh(); });
      let n1 = mark() ? mark().children.length : 0;
      controls.segment('성별', [{ label: '남자 XY', value: true }, { label: '여자 XX', value: false }], true, (v) => { male = v; setSex(); refresh(); });
      controls.button('21번 염색체 +1', () => { down = !down; refresh(); });
      const ctlEl = mark(); if (ctlEl) { [...ctlEl.children].slice(n0, n1).forEach((e) => subA.push(e)); [...ctlEl.children].slice(n1).forEach((e) => subB.push(e)); }
      function setSex() { kg.sexY.visible = male; kg.sexX2.visible = !male; }
      setStage(0);
      return {
        update(dt, t) {
          grow = Math.min(1, grow + dt * 2.2); const e = 1 - Math.pow(1 - grow, 3);
          groups.forEach((g, k) => { if (g.visible) g.scale.setScalar(k === 4 ? 0.86 + 0.04 * e : 0.8 + 0.2 * e); });
          if (cur === 3) {
            const ch = groups[3].userData.chrom, sp = repl ? 0.24 : 0;
            chroA.rotation.z = sp; chroB.rotation.z = -sp; chroA.position.x = 0; chroB.position.x = 0; chroB.visible = repl;
            kin.position.set(0, 0, 0); kin.scale.setScalar(repl ? 1 : 0.7);
            ch.rotation.y = t * 0.0;
          }
          if (cur === 4) groups[4].rotation.y = orbit.theta;
          else groups[4].rotation.y = 0;
        },
        sync() {},
      };
    },
  });
})();
