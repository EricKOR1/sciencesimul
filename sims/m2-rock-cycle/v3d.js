/* m2-rock-cycle · 3D 암석의 순환 (화산 · 풍화와 퇴적 · 땅속 변성 · 마그마)
   작은 빛 알갱이가 암석의 순환 경로를 따라 한 바퀴 돌며 각 과정을 보여 줘요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHN = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const D = 4.6;
  // 순환 단계 (경로 위의 구간 [시작u, 끝u])
  const STAGES = [
    { id: 'cool', name: '냉각', u: [0.0, 0.17], t: '마그마가 <b>냉각</b>되어 굳으면 <b>화성암</b>이 돼요.' },
    { id: 'weather', name: '풍화·침식', u: [0.17, 0.4], t: '화성암이 부서지고(<b>풍화</b>) 깎여서(<b>침식</b>) <b>퇴적물</b>이 돼요.' },
    { id: 'sed', name: '퇴적·굳음', u: [0.4, 0.62], t: '퇴적물이 쌓이고 <b>다져져 굳으면</b> <b>퇴적암</b>이 돼요.' },
    { id: 'meta', name: '열과 압력', u: [0.62, 0.84], t: '퇴적암이 땅속에서 <b>열과 압력</b>을 받으면 <b>변성암</b>이 돼요.' },
    { id: 'melt', name: '녹음', u: [0.84, 1.0], t: '변성암이 아주 뜨거워지면 <b>녹아서 마그마</b>가 돼요.' },
  ];

  window.SciSim3D.attach({
    title: '암석의 순환 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: PHN ? 19 : 15, theta: 0.3, phi: 1.2, min: 6, max: 26, target: [0, -0.4, 0] },
    autoRotate: 0,
    levels: [3],                     // 4단계(암석의 순환): 과정 카드는 아래 단추로 붙여요. 1~3단계는 핀 · 판을 끌어 암석을 만드는 실험이라 2D
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const V3 = THREE.Vector3;
      const mat = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.85, metalness: 0.02 }, o || {}));
      function poly(pts, depth, m, z0) {
        const sh = new THREE.Shape(); pts.forEach((p, i) => i ? sh.lineTo(p[0], p[1]) : sh.moveTo(p[0], p[1]));
        const g = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: false }); g.translate(0, 0, -depth / 2 + (z0 || 0));
        const me = new THREE.Mesh(g, m); me.castShadow = true; me.receiveShadow = true; return me;
      }
      // 지형 높이 (단면): 화산(왼쪽) · 산비탈 · 바다 분지(오른쪽)
      const h = (x) => {
        const vol = 2.1 * Math.exp(-Math.pow((x + 3.1) / 0.9, 2)) + 0.5 * Math.exp(-Math.pow((x + 3.1) / 2.2, 2));
        const mt = 1.0 / (1 + Math.exp((x - 0.2) * 1.8));        // 산에서 분지로 내려가는 경사
        return Math.max(-0.45, -0.45 + vol + mt * 1.1 - Math.max(0, x - 3.2) * 0.0);
      };
      const XS = []; for (let x = -5; x <= 5.001; x += 0.2) XS.push(+x.toFixed(3));
      const top = XS.map((x) => [x, h(x)]);
      const B = -3.3;
      // 바탕 (화성암 바위층)
      root.add(poly([[-5, B], ...top, [5, B]], D, mat(0x4d4857, { roughness: 0.9 })));
      // 분지의 퇴적층 (모래 · 진흙 · 자갈) : 오른쪽
      const sedCols = [0xd9c27a, 0xa77c58, 0x8d8277];
      sedCols.forEach((c, i) => {
        const y0 = -0.45 - i * 0.38, y1 = y0 - 0.38;
        root.add(poly([[1.4, y0], [5, y0], [5, y1], [1.4, y1]], D + 0.03, mat(c, { roughness: 0.9 })));
      });
      // 변성암 영역: 줄무늬(엽리)
      const metaBand = [0x7a6e94, 0xb7aac9, 0x6a5f86, 0xa89ac0, 0x7a6e94, 0xb7aac9];
      metaBand.forEach((c, i) => {
        const y0 = -1.65 - i * 0.2, y1 = y0 - 0.2;
        root.add(poly([[1.2, y0 + 0.0], [5, y0], [5, y1], [1.2, y1]], D + 0.03, mat(c, { roughness: 0.6 })));
      });
      // 마그마방
      const chamber = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 24), mat(0xff6a1f, { emissive: 0xff4a10, emissiveIntensity: 1.1, roughness: 0.3 }));
      chamber.scale.set(2.2, 0.75, 0.7); chamber.position.set(-1.4, -2.55, D / 2 - 0.2); root.add(chamber);
      // 마그마 관 (굴뚝)
      const conduit = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new V3(-1.9, -2.2, D / 2 - 0.15), new V3(-2.5, -0.6, D / 2 - 0.15), new V3(-3.0, 1.0, D / 2 - 0.15), new V3(-3.1, 2.25, 0)]), 40, 0.22, 10), mat(0xff7a2a, { emissive: 0xff4a10, emissiveIntensity: 1.0 }));
      root.add(conduit);
      // 바다
      const sea = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.5, D), new THREE.MeshStandardMaterial({ color: 0x2f8fd8, transparent: true, opacity: 0.4, roughness: 0.1, depthWrite: false }));
      sea.position.set(3.2, -0.2, 0); sea.renderOrder = 3; root.add(sea);
      // 앞면 레이어가 보이도록 앞쪽 투명 안내 (생략)

      // 알갱이 (풍화된 조각이 비탈을 구름)
      const grains = [];
      const gG = new THREE.IcosahedronGeometry(0.1, 0);
      for (let i = 0; i < 16; i++) { const m = new THREE.Mesh(gG, mat(0xb7a58a)); m.userData = { u: i / 16, z: (Math.random() - 0.5) * D * 0.7, s: 0.6 + Math.random() * 0.8 }; m.castShadow = true; root.add(m); grains.push(m); }

      // 순환 경로 (앞면 앞쪽을 따라 한 바퀴)
      const Z = D / 2 + 0.18;
      const pts = [
        new V3(-1.4, -2.55, Z), new V3(-2.3, -1.0, Z), new V3(-3.0, 0.8, Z), new V3(-3.1, 2.4, Z),        // 냉각 구간: 마그마 → 화산
        new V3(-2.4, 1.3, Z), new V3(-1.0, 0.5, Z), new V3(0.2, 0.35, Z), new V3(1.6, -0.2, Z),            // 풍화 · 침식 · 운반
        new V3(3.0, -0.5, Z), new V3(3.4, -0.9, Z), new V3(3.4, -1.4, Z),                                   // 퇴적 · 굳음
        new V3(3.2, -2.0, Z), new V3(2.2, -2.6, Z), new V3(1.0, -2.9, Z),                                   // 열과 압력 (변성)
        new V3(-0.2, -2.8, Z), new V3(-1.0, -2.65, Z),                                                      // 녹음
      ];
      const curve = new THREE.CatmullRomCurve3(pts, true, 'catmullrom', 0.5);
      const tubePts = curve.getPoints(160);
      // 방향 화살표가 있는 순환 띠
      const loopTube = new THREE.Mesh(new THREE.TubeGeometry(curve, 240, 0.035, 8, true), new THREE.MeshBasicMaterial({ color: 0xffd34d, transparent: true, opacity: 0.55 }));
      root.add(loopTube);
      const heads = [];
      for (let i = 0; i < 8; i++) { const c = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.3, 14), new THREE.MeshBasicMaterial({ color: 0xffd34d })); const u = i / 8; c.position.copy(curve.getPointAt(u)); c.quaternion.setFromUnitVectors(new V3(0, 1, 0), curve.getTangentAt(u)); root.add(c); heads.push(c); }
      const token = new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 16), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      const glow = new THREE.Mesh(new THREE.SphereGeometry(0.42, 24, 16), new THREE.MeshBasicMaterial({ color: 0xffe08a, transparent: true, opacity: 0.35, depthWrite: false }));
      token.add(glow); root.add(token);
      // 단계 구간 표시 (굵은 띠)
      const segTubes = STAGES.map((st) => {
        const pp = []; for (let i = 0; i <= 30; i++) pp.push(curve.getPointAt(Math.min(0.9999, st.u[0] + (st.u[1] - st.u[0]) * i / 30)));
        const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pp), 40, 0.1, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.0 }));
        root.add(m); return m;
      });
      const labRock = [label('화성암', [-2.2, 1.0, Z]), label('퇴적물', [0.9, 0.95, Z]), label('퇴적암', [4.0, -0.9, Z]), label('변성암', [4.0, -2.2, Z]), label('마그마', chamber, { offset: [-0.6, 0.0, 0.7] })];
      const labStage = label('', token, { offset: [0, 0.55, 0], color: 'rgba(255,211,77,.95)' }); labStage.el.style.color = '#1b2333';
      const labW = label('풍화·침식', [-0.3, h(-0.3) + 0.85, 0]); const labV = label('화산', [-3.1, 2.9, 0]);   // 풍화·침식: 구르는 알갱이보다 조금 위
      // 다른 길(점선): 순환을 완성한 뒤 [➕ 다른 길도 보기]를 누르면 보여요 — 어떤 암석이든 풍화·침식되고, 열과 압력을 받고, 녹을 수 있어요
      const NODEP = { magma: [-1.3, -2.45], igneous: [-2.2, 1.0], sediment: [0.9, 0.7], sedrock: [3.7, -0.95], meta: [3.5, -2.3] };
      const PROC = { weather: [0x7dd3fc, '풍화·침식'], heatp: [0xf472b6, '열과 압력'], melt: [0xfb923c, '녹음'] };
      const EXTRA = [['sedrock', 'sediment', 'weather'], ['meta', 'sediment', 'weather'], ['igneous', 'meta', 'heatp'], ['igneous', 'magma', 'melt'], ['sedrock', 'magma', 'melt']];
      const extraG = new THREE.Group(); extraG.visible = false; root.add(extraG);
      const extraLabs = EXTRA.map(([f, t2, pr], i) => {
        const A = new V3(NODEP[f][0], NODEP[f][1], Z + 0.3), B = new V3(NODEP[t2][0], NODEP[t2][1], Z + 0.3);
        const mid = A.clone().add(B).multiplyScalar(0.5); mid.z += 0.9 + 0.25 * i;
        const cv = new THREE.QuadraticBezierCurve3(A, mid, B), m = new THREE.MeshBasicMaterial({ color: PROC[pr][0], transparent: true, opacity: 0.9 });
        for (let k = 0; k < 12; k++) { const pp = []; for (let j = 0; j <= 4; j++) pp.push(cv.getPoint(Math.min(0.94, (k + j * 0.13) / 12))); extraG.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pp), 6, 0.03, 6), m)); }
        const hd = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.24, 12), m); hd.position.copy(cv.getPoint(0.95)); hd.quaternion.setFromUnitVectors(new V3(0, 1, 0), cv.getTangent(0.95)); extraG.add(hd);
        const L = label(PROC[pr][1], cv.getPoint(0.5).toArray(), { color: 'rgba(30,41,59,.85)', size: 11 }); L.show(false); return L;
      });
      let extraOn = false;

      let u = 0, labsOn = true, pl = null;
      const bar = ctx.renderer.domElement.closest('.v3-wrap').querySelector('.v3-ctl'), n0 = bar.children.length;
      const segCtl = controls.segment('과정', STAGES.map((s, i) => ({ label: s.name, value: i })), 0, (i) => { pl.pause(); pl.set((STAGES[i].u[0] + STAGES[i].u[1]) / 2); });
      pl = controls.player({
        duration: 20, loop: true, autoplay: true, label: '순환 재생',
        phases: STAGES.map((st) => [st.u[0], st.name]),
        onFrame(p) { u = Math.min(0.9999, p); },
      });
      const stageEls = [...bar.children].slice(n0);   // 과정 이름 단추 · 재생 막대 (순환도 카드 미션 중에는 감춰요: 정답이 보이니까요)
      controls.button('이름표', () => { labsOn = !labsOn; labRock.concat([labV]).forEach((l) => l.show(labsOn)); labW.show(labsOn && !cardMode); extraLabs.forEach((l) => l.show(labsOn && extraOn)); });
      /* 순환도 완성하기(카드 미션): 과정 카드를 고른 뒤, 붙일 화살표(○○ → ○○) 단추를 눌러요 → 실험의 순환도와 같은 상태 */
      const hk = () => window.__sim && window.__sim.cyc;
      let cSel = 0, cardMode = null, cardKey = '';
      const cardEls = [];
      { const n1 = bar.children.length, h = hk();
        if (h && h.procs && h.place) {
          controls.segment('과정 카드', h.procs.map((q, i) => ({ label: q.name, value: i })), 0, (v) => { cSel = v; });
          h.arrows.forEach((a) => controls.button(h.nodeName(a.from) + ' → ' + h.nodeName(a.to), () => { const q = hk(); if (q) { q.place(q.procs[cSel].id, a.id); cardKey = ''; } }));
        }
        cardEls.push(...[...bar.children].slice(n1)); }
      function cardFrame() {
        const s = window.__sim && window.__sim.S, h = hk(), on = !!(s && s.scene === 'cycle' && s.cyc && !s.cyc.unlocked && h && h.place);
        if (on !== cardMode) {
          cardMode = on; cardKey = ''; lastS = -1;
          stageEls.forEach((e) => { e.style.display = on ? 'none' : ''; }); cardEls.forEach((e) => { e.style.display = on ? '' : 'none'; });
          labStage.show(!on); labW.show(labsOn && !on); segTubes.forEach((m) => { m.visible = !on; });
        }
        if (!on) return false;
        const C = s.cyc, key = h.arrows.map((a) => a.id + ':' + (C.slots[a.id] || '') + (C.wrong && C.wrong[a.id] ? '!' : '')).join();
        if (key !== cardKey) {
          cardKey = key; const nm = {}; h.procs.forEach((q) => { nm[q.id] = q.name; });
          info('<b>순환도 완성하기</b>: 과정 카드를 고른 뒤, 붙일 화살표 단추를 눌러요.<br>' + h.arrows.map((a) => h.nodeName(a.from) + ' → ' + h.nodeName(a.to) + ': ' + (C.slots[a.id] ? '<b' + (C.wrong && C.wrong[a.id] ? ' style="color:#fca5a5"' : '') + '>' + nm[C.slots[a.id]] + '</b>' : '?')).reduce((o, x, i) => o + (i ? (i % 2 ? ' · ' : '<br>') : '') + x, ''));   // 두 개씩 한 줄로 (상자가 길어져 3D 이름표 '화산'을 덮지 않게)
        }
        return true;
      }
      let lastS = -1;
      return {
        update(dt, t) {
          let s = STAGES.findIndex((q) => u >= q.u[0] && u < q.u[1]); if (s < 0) s = 0;
          const cm = cardFrame();
          { const S2 = window.__sim && window.__sim.S, ex = !!(S2 && S2.scene === 'cycle' && S2.cyc && S2.cyc.extra && !cm);
            if (ex !== extraOn) { extraOn = ex; extraG.visible = ex; extraLabs.forEach((l) => l.show(ex && labsOn)); lastS = -1; } }
          if (s !== lastS && !cm) { lastS = s; segCtl.set(s); info(`<b>${STAGES[s].name}</b><br>${STAGES[s].t}<br>화성암 → 퇴적물 → 퇴적암 → 변성암 → 마그마 …` + (extraOn ? '<br><span style="color:#ffd34d">점선은 다른 길이에요. 암석은 한 가지 길로만 바뀌지 않아요.</span>' : '')); labStage.set(STAGES[s].name); }
          segTubes.forEach((m, i) => { m.material.opacity = i === s && !cm ? 0.5 : 0; });
          token.position.copy(curve.getPointAt(u));
          glow.scale.setScalar(1 + 0.2 * Math.sin(t * 6));
          chamber.material.emissiveIntensity = 0.9 + 0.3 * Math.sin(t * 2);
          // 알갱이: 풍화 구간에서 비탈을 따라 굴러요
          grains.forEach((g) => {
            const k = (g.userData.u + t * 0.05 * g.userData.s) % 1, x = -2.3 + k * 4.6, y = h(x) + 0.08;
            g.position.set(x, y, g.userData.z); g.rotation.x = t * 3 * g.userData.s; g.visible = x < 3.4;
            g.material.color.setHex(x < 1 ? 0xa6968a : 0xd9c27a);
          });
        },
      };
    },
  });
})();
