/* h1-redox-oxygen · 3D 산소의 이동과 산화·환원
   산화 = 산소를 얻는 반응, 환원 = 산소를 잃는 반응. 원자 모형으로 산소 원자(빨강)가 어디에서 어디로 옮겨 가는지 따라가 봐요.
   2D 실험의 입자 모형과 같은 7가지 반응이에요: 2Cu + O₂ → 2CuO, 2Mg + O₂ → 2MgO (산화) · CuO + H₂ → Cu + H₂O, 2CuO + C → 2Cu + CO₂ (환원)
   · Fe₂O₃ + 3CO → 2Fe + 3CO₂ (철의 제련) · CH₄ + 2O₂ → CO₂ + 2H₂O (연소) · CO₂ + 2H₂O → CH₂O + O₂ + H₂O (광합성).
   어떤 반응을 보여 줄지는 2D에서 고른 것(가열 시료 · 환원 종류 · 용광로 · 비교 사례)을 따라가고, 2D에서 가열하면 3D도 함께 진행돼요.
   원자의 배치와 크기는 보기 좋게 단순하게 그린 모형이에요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHN = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const EL = { C: [0x39404e, 0.5], H: [0xf4f6fb, 0.3], O: [0xc91f2b, 0.46], Cu: [0xd9822b, 0.58], Mg: [0xc9d2de, 0.58] };

  // atoms: [원소, 처음 위치, 나중 위치]  bonds: [i, j, 'b'(처음에만) | 'a'(나중에만) | 'p'(늘 있음)]
  const FP = (fx, fy) => [Math.round((fx - 0.5) * 92) / 10, Math.round((0.58 - fy) * 60) / 10]; // 2D 입자 모형의 위치(비율)를 3D 좌표로
  const RX = {
    cu: {
      eq: '2Cu + O₂ → 2CuO',
      atoms: [['Cu', [-3.4, 0.9], [-3.4, 0.9]], ['Cu', [-3.4, -0.9], [-3.4, -0.9]], ['O', [1.6, 0.45], [-2.0, 0.9]], ['O', [2.8, 0.45], [-2.0, -0.9]]],
      bonds: [[2, 3, 'b'], [0, 2, 'a'], [1, 3, 'a']],
      tags: [['산화 (산소를 얻음)', 0, '#e2464b'], ['산화 (산소를 얻음)', 1, '#e2464b']],
      names: [['Cu 구리', 0], ['O₂ 산소', 2]], after: [['CuO', 0], ['CuO', 1]],
      txt: '구리가 <b>산소를 얻어</b> 산화 구리(Ⅱ)가 돼요. <b>산소를 얻는 반응 = 산화</b>',
    },
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
      tags: [['산화 (산소를 얻음)', 0, '#e2464b'], ['환원 (O₂)', 5, '#3b6ff0']],
      names: [['CH₄ 메테인', 0], ['O₂ ×2 산소', 5]], after: [['CO₂', 0], ['H₂O ×2', 6]],
      txt: '메테인이 산소를 얻어 이산화 탄소와 물이 돼요(산화). 산소는 짝으로 <b>환원</b>돼요.',
    },
    fe: {
      eq: 'Fe₂O₃ + 3CO → 2Fe + 3CO₂',
      atoms: [['Fe', FP(0.13, 0.46), FP(0.13, 0.46)], ['Fe', FP(0.13, 0.7), FP(0.13, 0.7)],
        ['O', FP(0.29, 0.34), FP(0.54, 0.3)], ['O', FP(0.29, 0.58), FP(0.54, 0.54)], ['O', FP(0.29, 0.8), FP(0.54, 0.78)],
        ['C', FP(0.69, 0.3), FP(0.69, 0.3)], ['O', FP(0.83, 0.3), FP(0.83, 0.3)], ['C', FP(0.69, 0.54), FP(0.69, 0.54)], ['O', FP(0.83, 0.54), FP(0.83, 0.54)], ['C', FP(0.69, 0.78), FP(0.69, 0.78)], ['O', FP(0.83, 0.78), FP(0.83, 0.78)]],
      bonds: [[0, 2, 'b'], [0, 3, 'b'], [1, 3, 'b'], [1, 4, 'b'], [5, 6, 'p'], [7, 8, 'p'], [9, 10, 'p'], [2, 5, 'a'], [3, 7, 'a'], [4, 9, 'a'], [0, 1, 'a']],
      tags: [['환원 (산소를 잃음)', 0, '#3b6ff0'], ['산화 (산소를 얻음)', 5, '#e2464b']],
      names: [['Fe₂O₃ 산화 철(Ⅲ)', 0], ['CO ×3 일산화 탄소', 5]], after: [['Fe 철', 0], ['CO₂ ×3', 5]],
      txt: '일산화 탄소(CO)가 철광석의 <b>산소를 가져가</b> 이산화 탄소가 돼요(산화). 산소를 잃은 산화 철(Ⅲ)은 <b>철</b>이 돼요(환원).',
    },
    ph: {
      eq: 'CO₂ + 2H₂O → CH₂O + O₂ + H₂O',
      atoms: [['C', FP(0.24, 0.42), FP(0.24, 0.42)], ['O', FP(0.1, 0.42), FP(0.28, 0.82)], ['O', FP(0.38, 0.42), FP(0.38, 0.42)],
        ['O', FP(0.66, 0.2), FP(0.74, 0.16)], ['H', FP(0.58, 0.31), FP(0.12, 0.28)], ['H', FP(0.74, 0.31), FP(0.12, 0.56)],
        ['O', FP(0.66, 0.66), FP(0.9, 0.16)], ['H', FP(0.58, 0.77), FP(0.18, 0.92)], ['H', FP(0.74, 0.77), FP(0.38, 0.92)]],
      bonds: [[1, 0, 'b'], [0, 2, 'p'], [3, 4, 'b'], [3, 5, 'b'], [6, 7, 'b'], [6, 8, 'b'], [3, 6, 'a'], [0, 4, 'a'], [0, 5, 'a'], [1, 7, 'a'], [1, 8, 'a']],
      tags: [['환원 (산소를 잃음)', 0, '#3b6ff0'], ['산화 (산소 기체가 나옴)', 3, '#e2464b']],
      names: [['CO₂ 이산화 탄소', 0], ['H₂O ×2 물', 3]], after: [['CH₂O (포도당의 ⅙)', 0], ['O₂ 산소 기체', 3]],
      txt: '이산화 탄소는 산소를 잃어 양분(CH₂O)이 되고(환원), 물에서 <b>산소 기체</b>가 나와요(산화). 산화와 환원은 짝이에요.',
    },
  };

  window.SciSim3D.attach({
    title: '3D 산소의 이동 (원자 모형)',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { target: [0, -0.5, 0], dist: PHN ? 17 : 12.5, theta: 0.2, phi: 1.28, min: 5, max: 24 },
    autoRotate: 0,
    levels: [3],
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const V3 = THREE.Vector3, Y = new V3(0, 1, 0);
      const mat = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ envMapIntensity: 0.6, color: c, roughness: 0.35, metalness: 0.05 }, o || {}));
      const st = { rx: null, t: 0 };
      const cache = {};
      const woodTex = (() => { const c = document.createElement('canvas'); c.width = 512; c.height = 256; const g = c.getContext('2d'); g.fillStyle = '#7a5230'; g.fillRect(0, 0, 512, 256);
        for (let i = 0; i < 90; i++) { g.strokeStyle = 'rgba(' + (40 + Math.random() * 50 | 0) + ',' + (20 + Math.random() * 30 | 0) + ',10,' + (0.1 + Math.random() * 0.25) + ')'; g.lineWidth = 1 + Math.random() * 3; g.beginPath(); const y = Math.random() * 256; g.moveTo(0, y); g.bezierCurveTo(150, y + Math.random() * 14 - 7, 350, y + Math.random() * 14 - 7, 512, y + Math.random() * 10 - 5); g.stroke(); }
        const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; })();
      const floor = new THREE.Mesh(new THREE.CylinderGeometry(6.6, 6.8, 0.3, 64), ctx.mats.wood(0x9a7450, { repeat: 3 })); floor.position.y = -2.55; floor.receiveShadow = true; root.add(floor);
      // 반응 용기: 유리 종 · 받침 고리 · 떠다니는 기체 알갱이
      const dome = new THREE.Mesh(new THREE.SphereGeometry(6.2, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2), ctx.mats.glass({ opacity: 0.11 })); dome.scale.y = 0.7; dome.position.y = -2.4; root.add(dome);
      const drim = new THREE.Mesh(new THREE.TorusGeometry(6.2, 0.07, 10, 72), ctx.mats.metal('chrome', { roughness: 0.15 })); drim.rotation.x = Math.PI / 2; drim.position.y = -2.4; root.add(drim);
      [floor, dome, drim].forEach((o) => { o.userData.v3bg = true; });   // 받침·유리 종은 배경: 자동 맞춤이 분자에 맞춰요
      const NPG = 130, dustG = new THREE.InstancedMesh(new THREE.SphereGeometry(0.045, 8, 6), new THREE.MeshBasicMaterial({ color: 0xd8ecff, transparent: true, opacity: 0.45 }), NPG); root.add(dustG); dustG.userData.v3bg = true;
      const ddG = []; for (let i = 0; i < NPG; i++) { const a = Math.random() * 6.28, r = Math.sqrt(Math.random()) * 5.4; ddG.push({ x: Math.cos(a) * r, z: Math.sin(a) * r * 0.6, y: -2.2 + Math.random() * 4.4, s: 0.3 + Math.random(), p: Math.random() * 6.28 }); }
      const dmG = new THREE.Object3D();
      const grp = new THREE.Group(); root.add(grp);
      let cur = null;
      const ease = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };

      function build(key) {
        if (cur) { cur.g.visible = false; cur.labs.forEach((l) => l.show(false)); }
        if (cache[key]) { cur = cache[key]; cur.g.visible = true; return; }
        const R = RX[key], g = new THREE.Group(); grp.add(g);
        const C = { R, g, atoms: [], bonds: [], labs: [], trails: [] };
        R.atoms.forEach((a, i) => {
          const [col, rad] = EL[a[0]];
          const isMet = a[0] === 'Cu' || a[0] === 'Mg' || a[0] === 'Fe';
          const m = new THREE.Mesh(new THREE.SphereGeometry(rad, 40, 28), isMet ? ctx.mats.metal(col, { roughness: 0.28, extra: { emissive: col, emissiveIntensity: 0.05 } }) : ctx.mats.plastic(col, { roughness: 0.24, extra: { clearcoat: 0.9, clearcoatRoughness: 0.1, emissive: col, emissiveIntensity: a[0] === 'O' ? 0.2 : 0.05 } })); m.castShadow = true; m.position.set(a[1][0], a[1][1], 0); g.add(m);   // 금속 원자는 금속 광택, 나머지는 매끈한 모형 공
          C.atoms.push({ m, a, p0: new V3(a[1][0], a[1][1], 0), p1: new V3(a[2][0], a[2][1], 0) });
          if (a[0] === 'O' && new V3(a[1][0], a[1][1], 0).distanceTo(new V3(a[2][0], a[2][1], 0)) > 2.2) {
            // 산소가 지나갈 길 (희미한 곡선)
            const p0 = new V3(a[1][0], a[1][1], 0), p1 = new V3(a[2][0], a[2][1], 0), mid = p0.clone().lerp(p1, 0.5); mid.y += 1.6; mid.z += 0.8;
            const t = new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(p0, mid, p1), 40, 0.025, 6, false), new THREE.MeshBasicMaterial({ color: 0xff8a8a, transparent: true, opacity: 0.0 })); g.add(t); C.trails.push(t);
          }
        });
        R.bonds.forEach(([i, j, k]) => {
          const m = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1, 12), new THREE.MeshStandardMaterial({ color: 0xdfe5f0, roughness: 0.25, metalness: 0.7, envMapIntensity: 1.2, transparent: true })); g.add(m); C.bonds.push({ m, i, j, k });
        });
        C.names = R.names.map(([t, i]) => label(t, C.atoms[i].m, { size: 12.5, offset: [0, EL[R.atoms[i][0]][1] + 0.75, 0] }));
        C.tags = R.tags.map(([t, i, col]) => label(t, C.atoms[i].m, { size: 12.5, color: col, offset: [0, -(EL[R.atoms[i][0]][1] + 0.75), 0] }));
        C.afters = R.after.map(([t, i]) => label(t, C.atoms[i].m, { size: 12.5, offset: [0, EL[R.atoms[i][0]][1] + 0.75, 0] }));
        C.labs = [...C.names, ...C.tags, ...C.afters]; cur = C;
        C.afters.forEach((l) => l.show(false)); C.tags.forEach((l) => l.show(false));
        cache[key] = C;
      }
      let lastInfo = '';
      const setInfo = (h) => { if (h !== lastInfo) { lastInfo = h; info(h); } };
      const tmpA = new V3(), tmpB = new V3(), tmpD = new V3();
      function apply() {
        const C = cur, p = pl.p, u = ease((p - 0.18) / 0.62);
        C.atoms.forEach((a, i) => { a.m.position.lerpVectors(a.p0, a.p1, u); const hop = Math.sin(u * Math.PI) * (a.a[0] === 'O' && a.p0.distanceTo(a.p1) > 2.2 ? 1.3 : 0.0); a.m.position.y += hop; a.m.position.z = Math.sin(u * Math.PI) * (hop ? 0.7 : 0); });
        C.bonds.forEach((b) => {
          const A = C.atoms[b.i].m.position, B = C.atoms[b.j].m.position; tmpD.subVectors(B, A); const L = tmpD.length();
          const op = b.k === 'p' ? 1 : b.k === 'b' ? 1 - ease((p - 0.3) / 0.22) : ease((p - 0.58) / 0.22);
          b.m.visible = op > 0.03; b.m.material.opacity = op;
          const ra = EL[C.R.atoms[b.i][0]][1], rb = EL[C.R.atoms[b.j][0]][1];
          b.m.scale.set(1, Math.max(0.01, L - 0.2), 1); tmpA.copy(A).lerp(B, 0.5); b.m.position.copy(tmpA); b.m.quaternion.setFromUnitVectors(Y, tmpD.normalize());
        });
        C.trails.forEach((t) => { t.material.opacity = (p > 0.04 && p < 0.97) ? 0.55 : 0.0; });
        const end = p >= 0.97;
        C.names.forEach((l) => l.show(p < 0.5)); C.afters.forEach((l) => l.show(p >= 0.5)); C.tags.forEach((l) => l.show(end));
        if (p < 0.03) setInfo('<b>' + C.R.eq.split(' → ')[0] + '</b><br>▶ 반응 보기를 눌러 <b>산소 원자(빨강)</b>가 어디로 가는지 따라가 봐요.');
        else if (!end) setInfo('산소 원자가 <b>이동</b>하고 있어요. 결합이 끊어지고 새로 만들어져요.');
        else setInfo(C.R.txt + '<br><b>' + C.R.eq + '</b>');
      }
      const pl = controls.player({
        duration: 7, loop: true, label: '산소 이동 미리 보기',   // 실험의 ▶ 반응 보기는 옆 조작판에서 해요
        phases: [[0, '반응 전'], [0.2, '산소 원자 이동'], [0.8, '반응 후']],
        onFrame() { if (cur) apply(); },
      });
      // 2D에서 고른 반응(시료 · 환원 종류 · 용광로 · 비교 사례)을 따라가요
      const L2 = () => (ctx.lesson && ctx.lesson()) || null;
      const keyOf = () => {
        const S = L2(); if (!S || !S.ST) return 'cu';
        const m = S.MODE;
        return m === 'oxid' ? S.ST.metal : m === 'reduc' ? S.ST.red : m === 'blast' ? 'fe' : S.ST.cmp;
      };
      const rsKey = (k) => (L2() && L2().MODE === 'compare' && k === 'fe' ? 'fe2' : k);
      let lastProg = -1;
      function pick(k) {
        st.rx = k; build(k);
        const S = L2(), r = S && S.RS && S.RS[rsKey(k)];
        lastProg = r ? r.prog : -1;
        pl.pause(); pl.set(r && (r.done || r.prog > 0) ? r.prog : 0);
      }
      pick(keyOf());
      return {
        update(dt, t) {
          st.t += dt;
          for (let i = 0; i < NPG; i++) { const d = ddG[i]; dmG.position.set(d.x + Math.sin(t * 0.3 * d.s + d.p) * 0.3, ((d.y + t * 0.1 * d.s + 2.2) % 4.4) - 2.2, d.z + Math.cos(t * 0.25 * d.s + d.p) * 0.3); dmG.updateMatrix(); dustG.setMatrixAt(i, dmG.matrix); } dustG.instanceMatrix.needsUpdate = true;
          const k = keyOf();
          if (k !== st.rx) pick(k);
          else {
            // 2D에서 가열 중이면(진행률이 바뀌면) 3D도 같은 진행으로 맞춰요
            const S = L2(), r = S && S.RS && S.RS[rsKey(k)];
            if (r && r.prog !== lastProg) { lastProg = r.prog; pl.set(r.prog); }
          }
          apply();
          cur.atoms.forEach((a, i) => { if (pl.p < 0.03 || pl.p > 0.97) { a.m.position.y += Math.sin(t * 1.5 + i) * 0.0015; } });
        },
        sync() {},
      };
    },
  });
})();
