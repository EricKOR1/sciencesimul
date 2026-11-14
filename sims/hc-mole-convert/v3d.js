/* hc-mole-convert · 3D 기체 1몰 상자
   같은 온도·압력에서 기체 1 mol은 종류와 관계없이 같은 부피(0 °C, 1기압: 22.4 L)를 차지해요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
    /* ---- 공용 도우미: 분자 모형 · 유리 상자 · 화살표 ---- */
  function makeLib(THREE) {
    const COL = { H: 0xf3f6fb, C: 0x8a93a3, N: 0x4f7cff, O: 0xf0524f, F: 0x9be36b, Cl: 0x34c759, Na: 0xb07cf5, B: 0xf4a6a6, S: 0xf5c518, Cu: 0xe08a3c, Ca: 0x6fd0c4, e: 0xffd34d };
    const RAD = { H: 0.26, C: 0.38, N: 0.37, O: 0.36, F: 0.32, Cl: 0.48, Na: 0.5, B: 0.36, S: 0.48, Cu: 0.5, Ca: 0.55 };
    const mats = {};
    const mat = (k) => mats[k] || (mats[k] = new THREE.MeshStandardMaterial({ color: COL[k] !== undefined ? COL[k] : k, roughness: 0.26, metalness: 0, envMapIntensity: 1.2 }));
    const SG = new THREE.SphereGeometry(1, 28, 20);
    const CG = new THREE.CylinderGeometry(1, 1, 1, 16);
    const stickMat = new THREE.MeshStandardMaterial({ color: 0xc3ccdd, roughness: 0.3, metalness: 0.25, envMapIntensity: 1.2 });
    const V = (x, y, z) => new THREE.Vector3(x, y, z);
    function atom(k, s, pal) { const m = new THREE.Mesh(SG, mat(pal && pal[k] !== undefined ? pal[k] : k)); m.scale.setScalar((RAD[k] || 0.4) * (s || 1)); return m; }
    function stick(a, b, r, m) {
      const d = b.clone().sub(a), len = d.length(); const s = new THREE.Mesh(CG, m || stickMat);
      s.scale.set(r, Math.max(len, 1e-4), r); s.position.copy(a).add(b).multiplyScalar(0.5);
      s.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); return s;
    }
    const T = [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]];
    const MOLS = {
      H2: { f: 'H₂', a: [['H', -0.45, 0, 0], ['H', 0.45, 0, 0]], b: [[0, 1, 1]] },
      O2: { f: 'O₂', a: [['O', -0.72, 0, 0], ['O', 0.72, 0, 0]], b: [[0, 1, 2]] },
      N2: { f: 'N₂', a: [['N', -0.66, 0, 0], ['N', 0.66, 0, 0]], b: [[0, 1, 3]] },
      H2O: { f: 'H₂O', a: [['O', 0, 0.2, 0], ['H', 0.91, -0.5, 0], ['H', -0.91, -0.5, 0]], b: [[0, 1, 1], [0, 2, 1]] },
      CO2: { f: 'CO₂', a: [['C', 0, 0, 0], ['O', 1.4, 0, 0], ['O', -1.4, 0, 0]], b: [[0, 1, 2], [0, 2, 2]] },
      CH4: { f: 'CH₄', a: [['C', 0, 0, 0]].concat(T.map((t) => ['H', t[0] * 0.75, t[1] * 0.75, t[2] * 0.75])), b: [[0, 1, 1], [0, 2, 1], [0, 3, 1], [0, 4, 1]] },
      NH3: { f: 'NH₃', a: [['N', 0, 0.3, 0], ['H', 1.1, -0.15, 0], ['H', -0.55, -0.15, 0.953], ['H', -0.55, -0.15, -0.953]], b: [[0, 1, 1], [0, 2, 1], [0, 3, 1]] },
      HCl: { f: 'HCl', a: [['Cl', 0.6, 0, 0], ['H', -0.9, 0, 0]], b: [[0, 1, 1]] },
      HF: { f: 'HF', a: [['F', 0.4, 0, 0], ['H', -0.7, 0, 0]], b: [[0, 1, 1]] },
      NO2: { f: 'NO₂', a: [['N', 0, 0.28, 0], ['O', 1.33, -0.28, 0], ['O', -1.33, -0.28, 0]], b: [[0, 1, 1], [0, 2, 1]] },
      N2O4: { f: 'N₂O₄', a: [['N', 0.95, 0, 0], ['N', -0.95, 0, 0], ['O', 1.7, 1, 0], ['O', 1.7, -1, 0], ['O', -1.7, 1, 0], ['O', -1.7, -1, 0]], b: [[0, 1, 1], [0, 2, 1], [0, 3, 1], [1, 4, 1], [1, 5, 1]] },
      BF3: { f: 'BF₃', a: [['B', 0, 0, 0], ['F', 1.55, 0, 0], ['F', -0.775, 0, 1.342], ['F', -0.775, 0, -1.342]], b: [[0, 1, 1], [0, 2, 1], [0, 3, 1]] },
      CCl4: { f: 'CCl₄', a: [['C', 0, 0, 0]].concat(T.map((t) => ['Cl', t[0] * 1.2, t[1] * 1.2, t[2] * 1.2])), b: [[0, 1, 1], [0, 2, 1], [0, 3, 1], [0, 4, 1]] },
      H3O: { f: 'H₃O⁺', a: [['O', 0, 0.3, 0], ['H', 1.0, -0.1, 0], ['H', -0.5, -0.1, 0.866], ['H', -0.5, -0.1, -0.866]], b: [[0, 1, 1], [0, 2, 1], [0, 3, 1]] },
      OH: { f: 'OH⁻', a: [['O', -0.2, 0, 0], ['H', 0.75, 0, 0]], b: [[0, 1, 1]] },
    };
    /* 분자 만들기: k는 크기 배율. 이중·삼중 결합은 막대 여러 개 */
    function mol(M, k, pal) {
      k = k || 1; const g = new THREE.Group(); const P = M.a.map((x) => V(x[1] * k, x[2] * k, x[3] * k));
      M.a.forEach((x, i) => { const m = atom(x[0], k, pal); m.position.copy(P[i]); g.add(m); });
      M.b.forEach((b) => {
        const A = P[b[0]], B = P[b[1]], d = B.clone().sub(A).normalize();
        let perp = d.clone().cross(V(0, 0, 1)); if (perp.lengthSq() < 0.01) perp = d.clone().cross(V(0, 1, 0)); perp.normalize().multiplyScalar(0.11 * k);
        const offs = b[2] === 1 ? [0] : b[2] === 2 ? [-1, 1] : [-1.7, 0, 1.7];
        const r = (b[2] === 1 ? 0.085 : b[2] === 2 ? 0.06 : 0.05) * k;
        offs.forEach((o) => g.add(stick(A.clone().addScaledVector(perp, o), B.clone().addScaledVector(perp, o), r)));
      });
      return g;
    }
    /* 반투명 유리 상자 (가장자리 선 포함). 크기는 scale로 조절 */
    function glassBox(w, h, d, color, op) {
      const g = new THREE.Group();
      const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshPhysicalMaterial({ color: color || 0xcfe4ff, transparent: true, opacity: op === undefined ? 0.13 : op, roughness: 0.05, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 2, side: THREE.DoubleSide, depthWrite: false }));
      const e = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)), new THREE.LineBasicMaterial({ color: 0xcfe0ff, transparent: true, opacity: 0.75 }));
      g.add(m, e); g.scale.set(w, h, d); g.userData.fill = m; return g;
    }
    function tube(pts, r, color, seg) {
      const c = new THREE.CatmullRomCurve3(pts.map((p) => (p.isVector3 ? p : V(p[0], p[1], p[2]))));
      return new THREE.Mesh(new THREE.TubeGeometry(c, seg || 40, r, 10, false), new THREE.MeshPhysicalMaterial({ color, roughness: 0.32, metalness: 0.15, clearcoat: 0.4, clearcoatRoughness: 0.25 }));
    }
    /* 화살표: from → to */
    function arrow(from, to, color, r, headLen) {
      const g = new THREE.Group(); const a = V(from[0], from[1], from[2]), b = V(to[0], to[1], to[2]); const d = b.clone().sub(a), len = d.length();
      if (len < 1e-3) return g; const hl = Math.min(headLen || 0.4, len * 0.6); const m = new THREE.MeshPhysicalMaterial({ color, roughness: 0.3, metalness: 0, clearcoat: 0.5, clearcoatRoughness: 0.2 });
      const dir = d.clone().normalize(); const tip = b.clone();
      const sh = new THREE.Mesh(CG, m); sh.scale.set(r, len - hl, r); sh.position.copy(a).addScaledVector(dir, (len - hl) / 2); sh.quaternion.setFromUnitVectors(V(0, 1, 0), dir);
      const hd = new THREE.Mesh(new THREE.ConeGeometry(r * 2.6, hl, 20), m); hd.position.copy(tip).addScaledVector(dir, -hl / 2); hd.quaternion.setFromUnitVectors(V(0, 1, 0), dir);
      g.add(sh, hd); return g;
    }
    function clear(g) { while (g.children.length) g.remove(g.children[0]); }
    const rnd = (a, b) => a + Math.random() * (b - a);
    const sstep = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
    return { COL, RAD, mat, atom, stick, mol, MOLS, glassBox, tube, arrow, clear, rnd, sstep, V, SG, CG, stickMat };
  }

  const phone = window.matchMedia && window.matchMedia('(max-width: 599px)').matches;
  window.SciSim3D.attach({
    title: '몰 환산과 기체 부피 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: phone ? 15 : 12, theta: 0.35, phi: 1.12, min: 6, max: 40, target: [0, 1.5, 0] },
    autoRotate: 0.08,
    levels: [0, 3],   // 기체 1몰 · 종합 도전(드라이아이스 · 밀도). 환산 허브(화살표 이름표 누르기)와 환산 연습은 2D
    build(ctx) {
      const { THREE, root, label, info, controls, mats } = ctx;
      const L = makeLib(THREE);
      const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
      const sm = L.sstep, NA = 6.02e23, V0 = 22.4;
      const KEY = { h2: 'H2', o2: 'O2', co2: 'CO2', n2: 'N2', ch4: 'CH4' };
      const COLN = { h2: 0x60a5fa, o2: 0xf87171, co2: 0xa78bfa, n2: 0x34d399, ch4: 0xfbbf24 };
      const floor = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), mats.stone(0x0f131c, { repeat: 4, bump: 0.01, extra: { roughness: 0.85, envMapIntensity: 0.35 } })); floor.receiveShadow = true;   // 실험대 상판
      floor.scale.set(15, 0.1, 12); floor.position.set(0, -0.06, 0); root.add(floor); floor.userData.v3bg = true;

      /* 풍선(투명 공) + 안에서 움직이는 분자 */
      function makeBall(max, k) {
        const g = new THREE.Group(); root.add(g);
        const mat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.22, roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.8, side: THREE.DoubleSide, depthWrite: false });   // 얇은 고무 풍선
        const sph = new THREE.Mesh(L.SG, mat); sph.renderOrder = 3; g.add(sph);
        const knot = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.16, 16), mat); knot.rotation.x = Math.PI; g.add(knot);   // 풍선 매듭
        const B = { g, sph, mat, mols: [], r: 1, cnt: 0, key: '', k, max, lab: label('', [0, 0, 0], { size: 12.5 }) };
        B.setKey = (key) => {
          if (B.key === key) return; B.key = key;
          B.mols.forEach((m) => g.remove(m)); B.mols = [];
          for (let i = 0; i < max; i++) {
            const m = L.mol(L.MOLS[key], k); m.userData = { p: new THREE.Vector3(L.rnd(-1, 1), L.rnd(-1, 1), L.rnd(-1, 1)).multiplyScalar(0.62), v: new THREE.Vector3(L.rnd(-1, 1), L.rnd(-1, 1), L.rnd(-1, 1)).normalize(), w: new THREE.Vector3(L.rnd(-1, 1), L.rnd(-1, 1), L.rnd(-1, 1)) };
            g.add(m); B.mols.push(m);
          }
        };
        B.set = (r, cnt, col) => { B.r = r; B.cnt = cnt; sph.scale.setScalar(r); knot.position.y = -r - 0.05; mat.color.setHex(col); B.mols.forEach((m, i) => { m.visible = i < cnt; }); };
        B.step = (dt, speed) => {
          const lim = Math.max(0.1, B.r - 0.42 * B.k / 0.4);
          B.mols.forEach((m) => {
            if (!m.visible) return; const u = m.userData;
            u.p.addScaledVector(u.v, speed * dt / lim);
            const d = u.p.length(); if (d > 1) { u.p.multiplyScalar(1 / d); u.v.reflect(u.p.clone().normalize()); }
            m.position.copy(u.p).multiplyScalar(lim); m.rotation.x += u.w.x * dt; m.rotation.y += u.w.y * dt; m.rotation.z += u.w.z * dt;
          });
        };
        B.place = (x, y, z) => { g.position.set(x, y, z); B.lab.obj = [x, y + B.r + 0.45, z]; };
        B.show = (v) => { g.visible = v; B.lab.show(v); };
        return B;
      }
      const rOf = (v, a, cap) => Math.min(cap || 9, a * Math.cbrt(Math.max(v, 0.05)));

      /* ① 풍선 3개 (같은 부피 = 같은 분자 수) */
      const BK = ['h2', 'o2', 'co2'], bal = BK.map((k) => { const b = makeBall(26, 0.36); b.setKey(KEY[k]); return b; });
      const balPos = (i) => (phone ? [0, 0, (i - 1) * 3.8] : [(i - 1) * 4.7, 0, 0]);
      function balScene(Z, dt) {
        const bw = Z.S.bw, eq = Math.abs(bw.v.o2 - bw.v.h2) <= 0.05 && Math.abs(bw.v.co2 - bw.v.h2) <= 0.05;
        let lines = '';
        BK.forEach((k, i) => {
          const g = Z.GAS[k], vd = bw.vd[k], r = rOf(vd, 0.62, 1.9), cnt = Math.min(26, Math.round(vd / 1.12));
          const b = bal[i]; b.show(true); b.set(r, cnt, COLN[k]); const p = balPos(i); b.place(p[0], r + 0.25, p[2]); b.step(dt, 1.4);
          b.lab.set(g.name + ' ' + g.f + '<br><b>' + vd.toFixed(1) + ' L</b>');
          const v = bw.v[k]; lines += '<br>' + g.f + ' ' + v.toFixed(1) + ' L → n = ' + Z.fm(v / V0, 3) + ' mol · N = ' + Z.sci(v / V0 * NA, 4) + '개';
        });
        info('<b>같은 온도·같은 압력(0 °C, 1기압)의 풍선</b>' + lines + '<br>' + (eq ? '✅ 부피가 같으면 기체의 종류와 관계없이 분자 수가 같아요!' : '부피가 다르면 분자 수도 달라요. 부피를 맞춰 보세요.') + '<br>대표 입자 한 개 = 0.05 mol');
      }

      /* ② 온도와 1 mol의 부피 */
      const tb = makeBall(19, 0.36); tb.setKey('O2');
      const ghost = new THREE.Mesh(L.SG, new THREE.MeshBasicMaterial({ color: 0x394258, wireframe: true, transparent: true, opacity: 0.35 })); root.add(ghost);
      const therm = new THREE.Group(); root.add(therm);
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 3.4, 12), mats.glass({ opacity: 0.3 })); tube.position.y = 1.9; therm.add(tube);
      const bulb = new THREE.Mesh(L.SG, mats.plastic(0xd13a3f, { roughness: 0.15 })); bulb.scale.setScalar(0.3); bulb.position.y = 0.2; therm.add(bulb);
      const mer = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1, 10), mats.plastic(0xd13a3f, { roughness: 0.15 })); therm.add(mer);
      { const cap = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), mats.glass({ opacity: 0.3 })); cap.position.y = 3.6; therm.add(cap);
        const tm = new THREE.MeshBasicMaterial({ color: 0x7a8296 }); for (let i = 0; i <= 10; i++) { const tk = new THREE.Mesh(new THREE.BoxGeometry(i % 5 ? 0.12 : 0.22, 0.02, 0.02), tm); tk.position.set(0.18 + (i % 5 ? 0.06 : 0.11), 0.2 + 3.0 * i / 10, 0); therm.add(tk); }
        const base = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.5, 0.12, 28), mats.metal('steel', { brushed: true })); base.position.y = 0.06; therm.add(base); }   // 눈금 · 받침
      const thLab = label('0 °C', [0, 0, 0], { size: 12.5, color: '#b4231f' });
      function tempScene(Z, dt, Td) {
        const vm = Math.round(V0 * (273 + Td) / 273 * 10) / 10, r = rOf(vm, 0.68, 2.6), r0 = 0.68 * Math.cbrt(V0);
        tb.show(true); tb.set(r, 19, 0xf87171); tb.place(phone ? 0.5 : 1.0, r + 0.3, 0); tb.step(dt, 1.0 * Math.sqrt((273 + Td) / 273));
        tb.lab.set('1 mol 기체: 분자 6.02×10²³개<br><b>' + vm.toFixed(1) + ' L</b>');
        ghost.visible = true; ghost.scale.setScalar(r0); ghost.position.copy(tb.g.position);
        therm.visible = true; therm.position.set(phone ? -3.3 : -4.2, 0, 0);
        const h = 0.2 + 3.0 * (Td / 50); mer.scale.y = h; mer.position.y = 0.2 + h / 2;
        thLab.show(true); thLab.obj = [therm.position.x, 4.0, 0]; thLab.set(Math.round(Td) + ' °C');
        info('<b>1 mol의 부피: 0 °C → 22.4 L, 25 °C → 24.5 L</b><br>지금 ' + Math.round(Td) + ' °C → <b>' + vm.toFixed(1) + ' L</b> (점선은 0 °C 크기)<br>온도가 높아지면 분자가 더 빨리 움직여 분자 사이가 멀어져 부피가 커져요. 분자 수는 그대로예요.');
      }

      /* ③ 환산 허브: 질량 → 몰 → 부피 · 입자 수 */
      const hb = makeBall(30, 0.34), hbBlock = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), mats.plastic(0xcfd6e4, { roughness: 0.3 })), hbPad = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 0.2, 48), mats.metal('steel', { brushed: true }));   // 저울 접시
      root.add(hbBlock, hbPad); const hbLab = label('', [0, 0, 0], { size: 12.5 });
      function hubScene(Z, dt, f) {
        const h = Z.S.hb, g = Z.GAS[h.gas], m = h.m * f, n = m / g.M, V = n * V0, N = n * NA;
        hb.show(true); hb.setKey(KEY[h.gas]);
        const r = clamp(0.5 * Math.cbrt(Math.max(V, 0.05)), 0.25, 3.3), cnt = clamp(Math.round(n / 0.05), n > 0 ? 1 : 0, 30);
        hb.set(r, cnt, COLN[h.gas]); const x0 = phone ? 1.0 : 1.8; hb.place(x0, r + 0.3, 0); hb.step(dt, 1.3);
        hb.lab.set(g.name + ' ' + g.f + '<br><b>' + V.toFixed(V < 10 ? 2 : 1) + ' L</b> (0 °C, 1기압)');
        const s = 0.45 + 0.28 * Math.cbrt(m / 11 + 0.001); hbBlock.visible = hbPad.visible = hbLab.visible = true; hbLab.show(true);
        const px = phone ? -2.6 : -3.6; hbPad.position.set(px, 0.1, 0); hbBlock.scale.set(s, s, s); hbBlock.position.set(px, 0.2 + s / 2, 0); hbBlock.material.color.setHex(COLN[h.gas]);
        hbLab.obj = [px, 0.4 + s + 0.5, 0]; hbLab.set('질량 <b>' + (m < 10 ? m.toFixed(1) : Math.round(m)) + ' g</b>');
        info('<b>' + g.name + ' ' + g.f + ' ' + h.m + ' g</b> (몰질량 ' + g.M + ' g/mol)<br>질량 ÷ ' + g.M + ' = <b>' + Z.fm(h.m / g.M, 3) + ' mol</b><br>부피 = 몰수 × 22.4 L/mol = <b>' + Z.fm(h.m / g.M * V0, 3) + ' L</b> · 입자 수 = 몰수 × 6.02×10²³ = <b>' + Z.sci(h.m / g.M * NA, 4) + '개</b><br>몰(mol)을 가운데에 두고 바꿔요. 대표 입자 한 개 = 0.05 mol');
      }

      /* ④ 종합 도전 · 드라이아이스 */
      const dry = makeBall(10, 0.36); dry.setKey('CO2');
      const iceB = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1, 3, 3, 3), new THREE.MeshPhysicalMaterial({ color: 0xe9eef5, roughness: 0.62, metalness: 0, clearcoat: 0.25, clearcoatRoughness: 0.6, bumpMap: mats.tex('noise'), bumpScale: 0.03, sheen: 0.4, sheenColor: 0xffffff })); iceB.castShadow = true; root.add(iceB);   // 서리 낀 드라이아이스
      ctx.halo(iceB, 0xdfeaff, 2.2, 0.22);   // 흰 승화 김
      const dPad = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.05, 0.2, 56), mats.ceramic(0x5a6273)); dPad.position.set(0, 0.1, 0); root.add(dPad);
      const iceLab = label('드라이아이스 22 g (CO₂)', [0, 1.4, 0], { size: 12.5 });
      function dryScene(Z, dt, p) {
        const fn = Z.S.fn, T = fn.T, vt = Z.iceV(T), left = 1 - clamp(p, 0, 1), s = 0.95 * Math.cbrt(Math.max(left, 0.0001));
        iceB.visible = dPad.visible = iceLab.visible = true; iceB.scale.set(s, s, s); iceB.position.set(0, 0.2 + s / 2, 0); iceB.visible = left > 0.01; iceLab.show(true); iceLab.obj = [0, 0.4 + Math.max(s, 0.3) + 0.4, 0];
        const V = vt * p, r = rOf(V, 0.55, 2.6);
        dry.show(V > 0.3); dry.set(r, Math.round(10 * p), 0xf9a8d4); dry.place(0, 2.7 + r * 0.9, 0); dry.step(dt, 1.2);
        dry.lab.set(fn.okT[T] ? '<b>' + Z.fm(vt, 2) + ' L</b>' : '<b>? L</b>');
        info('<b>드라이아이스 22 g (CO₂)</b> · 몰질량 44 g/mol · ' + T + ' °C, 1기압<br>1 mol의 부피: 0 °C → 22.4 L, 25 °C → ' + Z.VM25 + ' L<br>승화 <b>' + Math.round(p * 100) + ' %</b> · 기체의 부피는 얼마일까요? 계산해서 오른쪽 칸에 써 보세요.<br>온도가 높을수록 1 mol의 부피가 커서 풍선도 더 커져요.');
      }

      /* ④ 종합 도전 · 이산화 탄소의 밀도 (촛불) */
      const tank = L.glassBox(4.6, 3.2, 2.2, 0xcfe0ff, 0.1); tank.position.set(0, 1.6, 0); root.add(tank);
      const layer = new THREE.Mesh(new THREE.BoxGeometry(4.5, 1, 2.1), new THREE.MeshStandardMaterial({ color: 0x8c7ae0, transparent: true, opacity: 0.55, depthWrite: false })); root.add(layer);
      const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.9, 32), mats.plastic(0xefe4c8, { roughness: 0.55, extra: { clearcoat: 0.1 } })); candle.position.set(0, 0.5, 0); root.add(candle);   // 양초 (밀랍)
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.5, 20), mats.emissive(0xffa726, 1.8)); root.add(flame); ctx.halo(flame, 0xffb04a, 1.6, 0.75);
      const densLab = label('', [0, 0, 0], { size: 12.5 });
      let flameV = 1;
      function densScene(Z, dt, lv) {
        const fn = Z.S.fn, th = 3.2; lv = clamp(lv, 0, 1);
        tank.visible = layer.visible = candle.visible = flame.visible = true;
        layer.visible = lv > 0.003; layer.scale.y = Math.max(0.01, th * lv); layer.position.set(0, th * lv / 2 + 0.02, 0);
        const covered = th * lv >= 0.42 * th; flameV = covered ? Math.max(0, flameV - dt * 3) : Math.min(1, flameV + dt * 4);
        flame.visible = flameV > 0.05; flame.scale.setScalar(Math.max(0.05, flameV)); flame.position.set(0, 0.95 + 0.25 * flameV, 0);
        densLab.show(true); densLab.obj = [0, 3.7, 0]; densLab.set('CO₂ ' + Z.dens(44).toFixed(2) + ' g/L · 공기 ' + Z.dens(29).toFixed(2) + ' g/L');
        info('<b>이산화 탄소는 아래로 깔려요</b><br>밀도 = M ÷ 22.4: CO₂ ' + Z.dens(44).toFixed(2) + ' g/L, 공기 ' + Z.dens(29).toFixed(2) + ' g/L<br>CO₂ 층 높이 ' + Math.round(lv * 100) + ' % · 촛불 ' + (flameV > 0.5 ? '켜져 있어요' : '꺼졌어요') + '<br>몰질량이 클수록 같은 부피의 질량(밀도)이 커요.');
      }

      /* ---- 재생기 ---- */
      let own = null, sig = '', pT = 0, pH = 0, pD = 0, pS = 0;
      const rowOf = () => { const r = document.querySelectorAll('.v3-player'); return r[r.length - 1]; };
      const mkP = (kind, o, set) => { const o2 = Object.assign({ loop: true }, o, { onFrame(p) { set(p); own = p > 0 ? kind : (own === kind ? null : own); } }); const pl = controls.player(o2); return { pl, row: rowOf() }; };
      const PT = mkP('temp', { duration: 10, label: '온도 올리기', phases: [[0, '0 °C'], [0.25, '25 °C'], [0.5, '50 °C'], [0.75, '식히는 중']] }, (p) => { pT = p; });
      const PH = mkP('hub', { duration: 8, label: '기체 모으기', phases: [[0, '질량 0 g'], [0.05, '모으는 중'], [0.85, '다 모았어요'], [0.93, '비우기']] }, (p) => { pH = p; });
      const PS = mkP('dry', { duration: 8, label: '승화시키기', phases: [[0, '고체'], [0.04, '승화하는 중'], [0.8, '모두 기체'], [0.92, '다시 얼리기']] }, (p) => { pS = p; });
      const PD = mkP('dens', { duration: 9, label: 'CO₂ 붓기', phases: [[0, '빈 수조'], [0.05, '붓는 중'], [0.7, '촛불이 꺼져요'], [0.9, '비우기']] }, (p) => { pD = p; });
      const PL = { temp: PT, hub: PH, dry: PS, dens: PD };
      let lastKind = '';
      const DIST = phone ? { bal: 21, temp: 14, hub: 14, dry: 14, dens: 14 } : { bal: 15, temp: 11, hub: 11.5, dry: 11, dens: 11 };

      return {
        update(dt, t) {
          const Z = ctx.lesson(); if (!Z) return; dt = Math.min(dt, 0.05);
          const S = Z.S, fn = S.fn, bw = S.bw, hbs = S.hb;
          const kind = S.mode === 'balloon' ? (S.sub.balloon === 'bal' ? 'bal' : 'temp') : S.mode === 'final' ? (S.sub.final === 'dry' ? 'dry' : 'dens') : 'hub';
          const s = [kind, bw.T, hbs.gas, hbs.m, fn.T, fn.run, fn.levelT].join('|');
          if (s !== sig) { sig = s; if (own) { const k = own; own = null; PL[k].pl.pause(); PL[k].pl.set(0); } }
          if (kind !== lastKind) { lastKind = kind; ctx.orbit.dist = DIST[kind]; if (phone) ctx.orbit.phi = kind === 'bal' ? 0.8 : 1.12; ctx.refit(0.3); }   // 휴대폰: 풍선 세 개가 앞뒤로 겹치지 않게 조금 위에서 봐요
          Object.keys(PL).forEach((k) => { PL[k].row.style.display = k === kind ? '' : 'none'; if (k !== kind && PL[k].pl.playing) PL[k].pl.pause(); });
          [bal[0], bal[1], bal[2], tb, hb, dry].forEach((b) => b.show(false));
          ghost.visible = therm.visible = thLab.visible = false; thLab.show(false);
          hbBlock.visible = hbPad.visible = false; hbLab.show(false);
          iceB.visible = dPad.visible = false; iceLab.show(false);
          tank.visible = layer.visible = candle.visible = flame.visible = false; densLab.show(false);
          const o = own === kind;
          if (kind === 'bal') balScene(Z, dt);
          else if (kind === 'temp') tempScene(Z, dt, o ? 50 * (0.5 - 0.5 * Math.cos(2 * Math.PI * pT)) : bw.Td);
          else if (kind === 'hub') hubScene(Z, dt, o ? (pH < 0.93 ? sm(pH / 0.85) : 1 - sm((pH - 0.93) / 0.07)) : 1);
          else if (kind === 'dry') dryScene(Z, dt, o ? (pS < 0.92 ? sm(pS / 0.8) : 1 - sm((pS - 0.92) / 0.08)) : fn.p);
          else densScene(Z, dt, o ? 0.9 * (pD < 0.9 ? sm(pD / 0.7) : 1 - sm((pD - 0.9) / 0.1)) : fn.level);
        },
      };
    },
  });
})();
