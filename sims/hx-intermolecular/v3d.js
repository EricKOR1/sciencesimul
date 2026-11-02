/* hx-intermolecular · 3D 분자 간 힘
   ① 분산력: 전자 구름이 순간적으로 쏠리면 이웃 원자에 반대 전하가 유발돼 끌어당겨요.
   ② 쌍극자·쌍극자 힘: 극성 분자(HCl)의 δ+ 쪽과 이웃의 δ- 쪽이 마주 보도록 정렬돼요.
   ③ 수소 결합: F·O·N에 붙은 H가 이웃 분자의 F·O·N 비공유 전자쌍과 끌려요.
   ※ 결합 길이·각은 실제 값에 가깝게 그린 모형 스케치예요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const CPK = { H: 0xf1f5f9, O: 0xe23b3b, Cl: 0x22b14c, Ar: 0x7fd6e8, N: 0x3867f4 };
  const RAD = { H: 0.3, O: 0.5, Cl: 0.62, Ar: 1.0, N: 0.5 };
  const KEYS = { disp: 'disp', dip: 'dip', hb: 'hb' };

  window.SciSim3D.attach({
    title: '분자 간 힘 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: PHONE ? 15 : 11.5, theta: 0.5, phi: 1.2, min: 5, max: 26 },
    autoRotate: 0.15,
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const V3 = THREE.Vector3, UP = new V3(0, 1, 0);
      const sim = () => (window.__sim && window.__sim.S && window.__sim.S.forces) || null;
      const g = new THREE.Group(); root.add(g);
      let kind = sim() && KEYS[sim().f] ? sim().f : 'disp', temp = 25, lastF = kind;
      const mat = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.4, metalness: 0.05 }, o || {}));
      const mols = [], links = [], labs = [];

      function atom(el, parent, pos, op) {
        const m = new THREE.Mesh(new THREE.SphereGeometry(RAD[el], 32, 24), mat(CPK[el], op ? { transparent: true, opacity: op, depthWrite: false } : {}));
        m.position.copy(pos); parent.add(m); return m;
      }
      function stick(parent, a, b, r) {
        const d = b.clone().sub(a), m = new THREE.Mesh(new THREE.CylinderGeometry(r || 0.1, r || 0.1, d.length(), 16), mat(0xa9b4c8));
        m.position.copy(a).add(b).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(UP, d.normalize()); parent.add(m); return m;
      }
      function dashed(a, b, col, r) {         // 점선 튜브 (분자 사이 힘)
        const grp = new THREE.Group(), d = b.clone().sub(a), L = d.length(), n = Math.max(3, Math.round(L / 0.28)), u = d.clone().normalize();
        const mt = mat(col, { emissive: col, emissiveIntensity: 0.5 });
        for (let i = 0; i < n; i++) {
          const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, L / n * 0.55, 10), mt);
          m.position.copy(a).addScaledVector(u, (i + 0.5) * L / n); m.quaternion.setFromUnitVectors(UP, u); grp.add(m);
        }
        return grp;
      }
      function water(pos, rotY) {            // H₂O: O–H 0.96 Å, 104.5° (1 Å ≈ 1.45 단위)
        const w = new THREE.Group(); w.position.copy(pos); w.rotation.y = rotY || 0;
        const L = 1.4, a = 52.25 * Math.PI / 180;
        const o = atom('O', w, new V3(0, 0, 0));
        const h1 = new V3(Math.sin(a) * L, Math.cos(a) * L, 0), h2 = new V3(-Math.sin(a) * L, Math.cos(a) * L, 0);
        atom('H', w, h1); atom('H', w, h2); stick(w, new V3(), h1, 0.1); stick(w, new V3(), h2, 0.1);
        w.userData = { o, h1: h1, h2: h2 }; g.add(w); return w;
      }
      function hcl(pos, rotZ) {              // HCl: 1.27 Å. +x 쪽이 H(δ+), −x 쪽이 Cl(δ−)
        const w = new THREE.Group(); w.position.copy(pos); w.rotation.z = rotZ || 0;
        atom('Cl', w, new V3(-0.8, 0, 0)); atom('H', w, new V3(0.95, 0, 0)); stick(w, new V3(-0.8, 0, 0), new V3(0.95, 0, 0), 0.1);
        const mk = (x, c) => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.9, 24, 16), mat(c, { transparent: true, opacity: 0.2, depthWrite: false })); m.position.set(x, 0, 0); m.scale.set(1.0, 1.2, 1.2); w.add(m); };
        mk(-0.8, 0xff6a6a); mk(0.95, 0x6aa8ff);
        g.add(w); return w;
      }
      function clear() {
        while (g.children.length) g.remove(g.children[0]);
        mols.length = 0; links.length = 0; labs.forEach((l) => l.show(false)); labs.length = 0;
      }
      const plabel = (txt, obj, col, off) => { const l = label(txt, obj, { color: col || 'rgba(30,41,59,.88)', offset: off || [0, 0, 0] }); labs.push(l); return l; };

      /* ---- ① 분산력: 아르곤 두 원자 ---- */
      let dispA, dispB, cloudA, cloudB, dispLink;
      function sceneDisp() {
        const mk = (x) => {
          const grp = new THREE.Group(); grp.position.set(x, 0, 0);
          const nuc = new THREE.Mesh(new THREE.SphereGeometry(0.25, 24, 16), mat(0xffd34d, { emissive: 0xffa500, emissiveIntensity: 0.5 })); grp.add(nuc);
          const cloud = new THREE.Mesh(new THREE.SphereGeometry(1.35, 40, 28), mat(0x66b8ff, { transparent: true, opacity: 0.32, roughness: 0.2, depthWrite: false }));
          grp.add(cloud); g.add(grp); return { grp, nuc, cloud };
        };
        dispA = mk(-2.0); dispB = mk(2.0);
        dispLink = new THREE.Group(); g.add(dispLink);
        plabel('Ar', dispA.grp, null, [0, 1.8, 0]); plabel('Ar', dispB.grp, null, [0, 1.8, 0]);
        dispA.pl = plabel('순간 쌍극자', dispA.grp, 'rgba(226,59,59,.92)', [0, -1.9, 0]);
        dispB.pl = plabel('유발 쌍극자', dispB.grp, 'rgba(59,110,226,.92)', [0, -1.9, 0]);
        info('<b>분산력</b> · 모든 분자에 있어요<br>전자 구름이 순간적으로 한쪽으로 쏠리면 이웃 원자에도 반대 전하가 유발돼 끌려요.<br>전자가 많고 큰 분자일수록 강해요.');
      }
      /* ---- ② 쌍극자·쌍극자: HCl 4개 ---- */
      let dipM = [];
      function sceneDip() {
        const pos = [[-2.4, 1.3, 0], [2.4, 1.3, 0], [-2.4, -1.3, 0], [2.4, -1.3, 0]];
        dipM = pos.map((p, i) => { const m = hcl(new V3(...p), 0); m.userData = { base: p, i, ph: i * 1.7 }; return m; });
        plabel('δ+', dipM[0].children[1], 'rgba(59,110,226,.92)', [0, 0.9, 0]);
        plabel('δ−', dipM[0].children[0], 'rgba(226,59,59,.92)', [0, 0.9, 0]);
        plabel('HCl', dipM[3], null, [0, -1.2, 0]);
        info('<b>쌍극자·쌍극자 힘</b> · 극성 분자끼리<br>한 분자의 δ+(H)와 이웃 분자의 δ−(Cl)가 마주 보도록 정렬돼 끌어당겨요.');
      }
      /* ---- ③ 수소 결합: 물 분자 ---- */
      let hbW = [];
      function sceneHB() {
        // 한 분자의 H가 이웃의 O를 향하는 삼각 배치
        const P = [new V3(0, -0.2, 0), new V3(3.1, 1.2, 0.4), new V3(-1.9, 2.9, -0.4), new V3(-1.4, -2.9, 0.6)];
        hbW = P.map((p, i) => { const w = water(p, 0); w.userData.ph = i * 1.3; return w; });
        // 방향을 맞춤: 각 H가 이웃 O를 향하도록 회전 (대략)
        hbW[0].rotation.z = -0.55; hbW[1].rotation.z = 1.6; hbW[2].rotation.z = -2.2; hbW[3].rotation.z = 3.1;
        plabel('O−H···O', hbW[0], 'rgba(255,90,95,.92)', [0.4, 1.9, 0]);
        plabel('수소 결합', hbW[1], null, [0, 1.7, 0]);
        info('<b>수소 결합</b> · F, O, N에 붙은 H<br>H가 이웃 분자의 O 비공유 전자쌍과 끌려요. 분산력·쌍극자 힘보다 훨씬 강해서 끓는점이 높아요.');
      }
      function setBonds() {
        links.forEach((l) => g.remove(l)); links.length = 0;
        if (kind === 'hb') {
          g.updateMatrixWorld(true);
          const hs = [], os = [];
          hbW.forEach((w, i) => { const wp = (v) => v.clone().applyMatrix4(w.matrixWorld); os.push({ i, p: wp(new V3()) }); [w.userData.h1, w.userData.h2].forEach((h) => hs.push({ i, p: wp(h) })); });
          hs.forEach((h) => { let best = null; os.forEach((o) => { if (o.i !== h.i) { const d = o.p.distanceTo(h.p); if (!best || d < best.d) best = { d, o }; } }); if (best && best.d < 3.6) { const l = dashed(h.p, best.o.p.clone().sub(h.p).normalize().multiplyScalar(best.d - 0.55).add(h.p), 0xff5a5f, 0.07); l.userData.pair = [h, best.o]; links.push(l); g.add(l); } });
        }
      }
      function build() {
        clear(); dispLink = null;
        if (kind === 'disp') sceneDisp(); else if (kind === 'dip') sceneDip(); else sceneHB();
        setBonds(); update2();
      }
      function update2() { if (kind === 'hb') setBonds(); }
      const seg = controls.segment('힘', [{ value: 'disp', label: '분산력' }, { value: 'dip', label: '쌍극자 힘' }, { value: 'hb', label: '수소 결합' }], kind, (v) => { kind = v; lastF = v; build(); });
      controls.range('온도', 0, 100, 5, temp, (v) => { temp = v; }, (v) => v + ' °C');
      controls.text('온도가 높을수록 분자 운동이 활발해요.');
      build();
      let bondT = 0;
      return {
        update(dt, t) {
          const s = sim();
          if (s && s.f !== lastF && KEYS[s.f]) { lastF = s.f; kind = s.f; seg.set(kind); build(); }
          const jit = 0.05 + temp / 100 * 0.3;
          if (kind === 'disp') {
            const sw = Math.sin(t * (1.6 + temp / 40)) * 0.55;
            dispA.cloud.position.set(-sw * 0.9, 0, 0); dispB.cloud.position.set(sw * 0.45, 0, 0);
            dispA.cloud.material.color.setHex(sw > 0 ? 0xff9a9a : 0x9ac4ff); dispB.cloud.material.color.setHex(sw > 0 ? 0x9ac4ff : 0xff9a9a);
            dispA.pl.set(sw > 0 ? '순간 쌍극자' : '순간 쌍극자 ↔'); dispB.pl.set('유발 쌍극자');
            const k = Math.abs(sw) / 0.55;
            dispA.grp.position.x = -2.0 + 0.08 * Math.sin(t * 3) * (temp / 100); dispB.grp.position.x = 2.0 - 0.08 * Math.sin(t * 3) * (temp / 100);
            while (dispLink.children.length) dispLink.remove(dispLink.children[0]);
            dispLink.add(dashed(new V3(dispA.grp.position.x + 1.5, 0, 0), new V3(dispB.grp.position.x - 1.5, 0, 0), 0xffd34d, 0.05 + k * 0.05));
          } else if (kind === 'dip') {
            dipM.forEach((m) => {
              const b = m.userData; const wob = Math.sin(t * (1 + temp / 50) + b.ph) * (0.15 + temp / 100 * 0.5);
              // 이웃과 H(δ+)–Cl(δ−)이 마주 보도록: 위쪽 줄은 → , 아래 줄은 ←
              m.rotation.z = (b.i < 2 ? 0 : Math.PI) + wob;
              m.position.set(b.base[0] + Math.sin(t * 1.3 + b.ph) * 0.08 * (1 + temp / 40), b.base[1], b.base[2] + Math.cos(t + b.ph) * 0.08);
            });
            bondT += dt;
            if (!links.length || bondT > 0.25) {
              bondT = 0; links.forEach((l) => g.remove(l)); links.length = 0; g.updateMatrixWorld(true);
              const pts = dipM.map((m) => ({ h: new V3(0.95, 0, 0).applyMatrix4(m.matrixWorld), c: new V3(-0.8, 0, 0).applyMatrix4(m.matrixWorld) }));
              [[0, 1], [1, 3], [3, 2], [2, 0]].forEach(([i, j]) => { // 한 분자의 H → 이웃 분자의 Cl
                const a = pts[i].h, b = pts[j].c; const l = dashed(a, b, 0xffd34d, 0.06); links.push(l); g.add(l);
              });
            }
          } else {
            hbW.forEach((w) => { w.position.y += Math.sin(t * (1 + temp / 40) + w.userData.ph) * dt * (0.1 + temp / 100); });
            bondT += dt; if (bondT > 0.2) { bondT = 0; setBonds(); }
          }
        },
        sync() {},
      };
    },
  });
})();
