/* h1-redox-oxygen · 3D 산소의 이동과 산화·환원
   산화 = 산소를 얻는 반응, 환원 = 산소를 잃는 반응. 원자 모형으로 산소 원자(빨강)가 어디에서 어디로 옮겨 가는지 따라가 봐요.
   ① 2Mg + O₂ → 2MgO (산화)  ② CuO + H₂ → Cu + H₂O  ③ 2CuO + C → 2Cu + CO₂ (산화 구리의 환원)  ④ CH₄ + 2O₂ → CO₂ + 2H₂O (연소)
   원자의 배치와 크기는 보기 좋게 단순하게 그린 모형이에요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHN = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const EL = { C: [0x4d5566, 0.5], H: [0xf4f6fb, 0.3], O: [0xe2464b, 0.46], Cu: [0xd9822b, 0.58], Mg: [0xc9d2de, 0.58] };

  // atoms: [원소, 처음 위치, 나중 위치]  bonds: [i, j, 'b'(처음에만) | 'a'(나중에만)]
  const RX = {
    mg: {
      eq: '2Mg + O₂ → 2MgO',
      atoms: [['Mg', [-3.4, 0.9], [-3.4, 0.9]], ['Mg', [-3.4, -0.9], [-3.4, -0.9]], ['O', [1.6, 0.45], [-2.0, 0.9]], ['O', [2.8, 0.45], [-2.0, -0.9]]],
      bonds: [[2, 3, 'b'], [0, 2, 'a'], [1, 3, 'a']],
      tags: [['산화 (산소를 얻음)', 0, '#e2464b'], ['산화 (산소를 얻음)', 1, '#e2464b']],
      names: [['Mg 마그네슘', 0], ['O₂ 산소', 2]], after: [['MgO', 0], ['MgO', 1]],
      txt: '마그네슘이 <b>산소를 얻어</b> 산화 마그네슘이 돼요. <b>산소를 얻는 반응 = 산화</b>',
    },
    h2: {
      eq: 'CuO + H₂ → Cu + H₂O',
      atoms: [['Cu', [-3.3, 0.5], [-3.3, 0.5]], ['O', [-2.1, 0.5], [2.4, 0.5]], ['H', [1.5, -1.4], [1.7, -0.25]], ['H', [2.7, -1.4], [3.1, -0.25]]],
      bonds: [[0, 1, 'b'], [2, 3, 'b'], [1, 2, 'a'], [1, 3, 'a']],
      tags: [['환원 (산소를 잃음)', 0, '#3b6ff0'], ['산화 (산소를 얻음)', 2, '#e2464b']],
      names: [['CuO 산화 구리(Ⅱ)', 0], ['H₂ 수소', 2]], after: [['Cu 구리', 0], ['H₂O 물', 1]],
      txt: '산화 구리(Ⅱ)는 <b>산소를 잃어</b> 구리가 되고(환원), 수소는 <b>산소를 얻어</b> 물이 돼요(산화).<br>산화와 환원은 <b>동시에</b> 일어나요.',
    },
    c: {
      eq: '2CuO + C → 2Cu + CO₂',
      atoms: [['Cu', [-4.0, 1.3], [-4.0, 1.3]], ['O', [-2.8, 1.3], [1.4, 0.0]], ['Cu', [-4.0, -1.3], [-4.0, -1.3]], ['O', [-2.8, -1.3], [3.6, 0.0]], ['C', [0.4, 0.0], [2.5, 0.0]]],
      bonds: [[0, 1, 'b'], [2, 3, 'b'], [4, 1, 'a'], [4, 3, 'a']],
      tags: [['환원 (산소를 잃음)', 0, '#3b6ff0'], ['환원 (산소를 잃음)', 2, '#3b6ff0'], ['산화 (산소를 얻음)', 4, '#e2464b']],
      names: [['CuO ×2', 0], ['C 탄소', 4]], after: [['Cu ×2', 0], ['CO₂', 4]],
      txt: '탄소가 산화 구리(Ⅱ)의 <b>산소를 가져가서</b> 이산화 탄소가 돼요(산화).<br>산소를 잃은 산화 구리(Ⅱ)는 <b>구리</b>가 돼요(환원).',
    },
    ch4: {
      eq: 'CH₄ + 2O₂ → CO₂ + 2H₂O',
      atoms: [['C', [-3.2, 0.0], [-3.0, 1.5]], ['H', [-4.1, 0.9], [0.8, 0.7]], ['H', [-2.3, 0.9], [2.1, 0.7]], ['H', [-4.1, -0.9], [0.8, -1.7]], ['H', [-2.3, -0.9], [2.1, -1.7]],
        ['O', [1.7, 1.3], [-4.2, 1.5]], ['O', [2.9, 1.3], [1.45, 1.3]], ['O', [1.7, -1.3], [-1.8, 1.5]], ['O', [2.9, -1.3], [1.45, -1.0]]],
      bonds: [[0, 1, 'b'], [0, 2, 'b'], [0, 3, 'b'], [0, 4, 'b'], [5, 6, 'b'], [7, 8, 'b'], [0, 5, 'a'], [0, 7, 'a'], [6, 1, 'a'], [6, 2, 'a'], [8, 3, 'a'], [8, 4, 'a']],
      tags: [['산화 (산소를 얻음)', 0, '#e2464b']],
      names: [['CH₄ 메테인', 0], ['O₂ ×2', 5]], after: [['CO₂', 0], ['H₂O ×2', 6]],
      txt: '메테인이 산소와 결합해 이산화 탄소와 물이 돼요. 연소는 <b>빠르게 일어나는 산화</b>예요.',
    },
  };

  window.SciSim3D.attach({
    title: '3D 산소의 이동 (원자 모형)',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: PHN ? 15 : 10.5, theta: 0.2, phi: 1.28, min: 5, max: 24 },
    autoRotate: 0,
    levels: [0, 1, 2, 3],
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const V3 = THREE.Vector3, Y = new V3(0, 1, 0);
      const mat = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.35, metalness: 0.05 }, o || {}));
      const st = { rx: 'mg', p: 0, play: false, t: 0 };
      const floor = new THREE.Mesh(new THREE.CylinderGeometry(6.4, 6.6, 0.25, 56), mat(0x2d3547, { roughness: 0.95, metalness: 0 })); floor.position.y = -2.4; floor.receiveShadow = true; root.add(floor);
      const grp = new THREE.Group(); root.add(grp);
      let cur = null;
      const ease = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };

      function build(key) {
        if (cur) { grp.remove(cur.g); cur.labs.forEach((l) => l.show(false)); }
        const R = RX[key], g = new THREE.Group(); grp.add(g);
        const C = { R, g, atoms: [], bonds: [], labs: [], trails: [] };
        R.atoms.forEach((a, i) => {
          const [col, rad] = EL[a[0]];
          const m = new THREE.Mesh(new THREE.SphereGeometry(rad, 32, 24), mat(col, { metalness: a[0] === 'Cu' || a[0] === 'Mg' ? 0.55 : 0.05, roughness: a[0] === 'Cu' || a[0] === 'Mg' ? 0.3 : 0.4 })); m.castShadow = true; m.position.set(a[1][0], a[1][1], 0); g.add(m);
          C.atoms.push({ m, a, p0: new V3(a[1][0], a[1][1], 0), p1: new V3(a[2][0], a[2][1], 0) });
          if (a[0] === 'O' && new V3(a[1][0], a[1][1], 0).distanceTo(new V3(a[2][0], a[2][1], 0)) > 2.2) {
            // 산소가 지나갈 길 (희미한 곡선)
            const p0 = new V3(a[1][0], a[1][1], 0), p1 = new V3(a[2][0], a[2][1], 0), mid = p0.clone().lerp(p1, 0.5); mid.y += 1.6; mid.z += 0.8;
            const t = new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(p0, mid, p1), 40, 0.025, 6, false), new THREE.MeshBasicMaterial({ color: 0xff8a8a, transparent: true, opacity: 0.0 })); g.add(t); C.trails.push(t);
          }
        });
        R.bonds.forEach(([i, j, k]) => {
          const m = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1, 12), new THREE.MeshStandardMaterial({ color: 0xdfe5f0, roughness: 0.4, transparent: true })); g.add(m); C.bonds.push({ m, i, j, k });
        });
        C.names = R.names.map(([t, i]) => label(t, C.atoms[i].m, { size: 12.5, offset: [0, EL[R.atoms[i][0]][1] + 0.75, 0] }));
        C.tags = R.tags.map(([t, i, col]) => label(t, C.atoms[i].m, { size: 12.5, color: col, offset: [0, -(EL[R.atoms[i][0]][1] + 0.75), 0] }));
        C.afters = R.after.map(([t, i]) => label(t, C.atoms[i].m, { size: 12.5, offset: [0, EL[R.atoms[i][0]][1] + 0.75, 0] }));
        C.labs = [...C.names, ...C.tags, ...C.afters]; cur = C;
        C.afters.forEach((l) => l.show(false)); C.tags.forEach((l) => l.show(false));
      }
      let lastInfo = '';
      const setInfo = (h) => { if (h !== lastInfo) { lastInfo = h; info(h); } };
      const tmpA = new V3(), tmpB = new V3(), tmpD = new V3();
      function apply() {
        const C = cur, p = st.p, u = ease((p - 0.18) / 0.62);
        C.atoms.forEach((a, i) => { a.m.position.lerpVectors(a.p0, a.p1, u); const hop = Math.sin(u * Math.PI) * (a.a[0] === 'O' && a.p0.distanceTo(a.p1) > 2.2 ? 1.3 : 0.0); a.m.position.y += hop; a.m.position.z = Math.sin(u * Math.PI) * (hop ? 0.7 : 0); });
        C.bonds.forEach((b) => {
          const A = C.atoms[b.i].m.position, B = C.atoms[b.j].m.position; tmpD.subVectors(B, A); const L = tmpD.length();
          const op = b.k === 'b' ? 1 - ease((p - 0.3) / 0.22) : ease((p - 0.58) / 0.22);
          b.m.visible = op > 0.03; b.m.material.opacity = op;
          const ra = EL[C.R.atoms[b.i][0]][1], rb = EL[C.R.atoms[b.j][0]][1];
          b.m.scale.set(1, Math.max(0.01, L - 0.2), 1); tmpA.copy(A).lerp(B, 0.5); b.m.position.copy(tmpA); b.m.quaternion.setFromUnitVectors(Y, tmpD.normalize());
        });
        C.trails.forEach((t) => { t.material.opacity = (p > 0.04 && p < 0.97) ? 0.55 : 0.0; });
        const end = p >= 0.97;
        C.names.forEach((l) => l.show(p < 0.5)); C.afters.forEach((l) => l.show(p >= 0.5)); C.tags.forEach((l) => l.show(end));
        if (p < 0.03) setInfo('<b>' + C.R.eq.split(' → ')[0] + '</b><br>▶ 반응 시작을 눌러 <b>산소 원자(빨강)</b>가 어디로 가는지 따라가 봐요.');
        else if (!end) setInfo('산소 원자가 <b>이동</b>하고 있어요. 결합이 끊어지고 새로 만들어져요.');
        else setInfo(C.R.txt + '<br><b>' + C.R.eq + '</b>');
      }
      const seg = controls.segment('반응', [{ value: 'mg', label: 'Mg + O₂' }, { value: 'h2', label: 'CuO + H₂' }, { value: 'c', label: 'CuO + C' }, { value: 'ch4', label: 'CH₄ 연소' }], st.rx, (v) => { st.rx = v; st.p = 0; st.play = false; playB.textContent = '▶ 반응 시작'; rng.set(0); build(v); apply(); });
      const playB = controls.button('▶ 반응 시작', () => { if (st.p >= 0.999) st.p = 0; st.play = !st.play; playB.textContent = st.play ? '⏸ 멈춤' : '▶ 반응 시작'; });
      const rng = controls.range('진행', 0, 100, 1, 0, (v) => { st.play = false; playB.textContent = '▶ 반응 시작'; st.p = v / 100; }, (v) => v + '%');
      build(st.rx); apply();

      return {
        update(dt, t) {
          st.t += dt;
          if (st.play) { st.p = Math.min(1, st.p + dt / 6); rng.set(Math.round(st.p * 100)); if (st.p >= 1) { st.play = false; playB.textContent = '↺ 다시 보기'; } }
          apply();
          cur.atoms.forEach((a, i) => { if (st.p < 0.03 || st.p > 0.97) { a.m.position.y += Math.sin(t * 1.5 + i) * 0.0015; } });
        },
        sync() {},
      };
    },
  });
})();
