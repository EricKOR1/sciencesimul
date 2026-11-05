/* hb-quadrat · 3D 초지와 방형구법 조사
   입체 초지(10 m × 6 m)에 방형구(1 m × 1 m)를 무작위로 던져 식물의 개체 수를 세고, 밀도와 빈도를 구해 봐요.
   눈에 띄는 곳만 골라 조사하면 결과가 치우치는(편향) 까닭도 비교해요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const narrow = window.innerWidth < 600 || window.innerHeight > window.innerWidth * 1.1;
  function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  const W = 20, H = 12;     // 초지 크기 (1 = 1 m)
  const SP = [{ n: '토끼풀', tag: '#22a04a' }, { n: '질경이', tag: '#d97706' }, { n: '쑥', tag: '#7c3aed' }, { n: '강아지풀', tag: '#0ea5e9' }];
  const QCOL = [0xff5a5a, 0x3b82f6, 0xf59e0b, 0xa855f7, 0x14b8a6, 0xec4899];

  window.SciSim3D.attach({
    title: '초지와 방형구 조사 3D',
    hint: '드래그: 돌리기 · 식물을 골라 밀도와 빈도를 봐요',
    camera: { dist: narrow ? 30 : 22, theta: 0.15, phi: 0.95, min: 2.5, max: 48, target: [0, 0, 0] },
    autoRotate: 0,
    levels: [],   // 모든 단계에 캔버스 조작이 필요해요(방형구·식물 누르기 · 기록표 읽기 · 곡선 읽기 · 층 이름표). 그래서 2D로 해요
    build(ctx) {
      const { THREE, root, label, info, controls, orbit } = ctx;
      const V3 = (x, y, z) => new THREE.Vector3(x, y, z || 0);
      const std = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.7, metalness: 0.0 }, o || {}));
      const R = rng(77), D = new THREE.Object3D(), L2 = () => window.__sim || null;
      const LS = L2(); if (!LS) return {};
      const hgt = (x, z) => 0.22 * Math.sin(x * 0.55) * Math.cos(z * 0.5) + 0.12 * Math.sin(x * 1.1 + z * 0.8);

      /* 땅 */
      const gg = new THREE.PlaneGeometry(W, H, 50, 30); gg.rotateX(-Math.PI / 2);
      const p = gg.attributes.position, col = new Float32Array(p.count * 3);
      for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setY(i, hgt(x, z)); const n = 0.5 + 0.5 * Math.sin(x * 2.3) * Math.sin(z * 2.1 + 1) + 0.15 * Math.sin(x * 7 + z * 5); const c = new THREE.Color().setHSL(0.27 + 0.03 * n, 0.5, 0.26 + 0.05 * n); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
      gg.setAttribute('color', new THREE.BufferAttribute(col, 3)); gg.computeVertexNormals();
      const ground = new THREE.Mesh(gg, std(0xffffff, { vertexColors: true, roughness: 0.95 })); ground.receiveShadow = true; root.add(ground);
      const soil = new THREE.Mesh(new THREE.BoxGeometry(W + 0.02, 0.9, H + 0.02), std(0x5a3b22, { roughness: 1 })); soil.position.y = -0.75; root.add(soil);

      /* 식물 : 2D 차시의 초지 자료(FIELD_PLANTS · QPLANTS)를 그대로 써요 */
      const SPEC = SP.map(() => 0);
      const plants = SP.map(() => []);
      const addP = (s, x, z, ph) => plants[s].push({ x: x - W / 2, z: z - H / 2, s: 1.5 * (0.85 + 0.3 * ((ph || 0) % 1)), r: ph || 0 });
      LS.FIELD_PLANTS.forEach((p) => addP(p.s, p.u, p.v, p.ph));
      LS.QPLANTS.forEach((arr, q) => arr.forEach((p) => addP(p.s, LS.QPOS[q][0] + p.u, LS.QPOS[q][1] + p.v, p.ph)));
      /* 식물 모양 (부품마다 InstancedMesh 한 개) */
      const mats = []; const partsBySp = SPEC.map(() => []);
      function part(sp, geo, color, local, o) {
        if (partsBySp[sp].length >= (sp === 3 ? 2 : 1)) return null;   // 식물이 많아서(2D와 같은 수) 부품 수를 줄여 가볍게
        const m = std(color, Object.assign({ roughness: 0.6 }, o || {})); mats.push([sp, m]);
        const im = new THREE.InstancedMesh(geo, m, plants[sp].length); im.castShadow = false;
        plants[sp].forEach((pl, i) => { D.position.set(pl.x, hgt(pl.x, pl.z), pl.z); D.rotation.set(0, pl.r, 0); D.scale.setScalar(pl.s); D.updateMatrix(); const base = D.matrix.clone(); const lm = new THREE.Matrix4().compose(local.p, new THREE.Quaternion().setFromEuler(new THREE.Euler(local.r ? local.r[0] : 0, local.r ? local.r[1] : 0, local.r ? local.r[2] : 0)), local.s || V3(1, 1, 1)); im.setMatrixAt(i, base.multiply(lm)); });
        root.add(im); partsBySp[sp].push(im); return im;
      }
      const sphere = new THREE.SphereGeometry(1, 7, 5), cyl = new THREE.CylinderGeometry(1, 1, 1, 4), cone = new THREE.ConeGeometry(1, 1, 4);
      // 토끼풀: 잎 + 줄기 + 흰 꽃
      part(0, sphere, 0x2fae4a, { p: V3(0, 0.06, 0), s: V3(0.13, 0.035, 0.13) }); part(0, sphere, 0x2fae4a, { p: V3(0.08, 0.1, 0.04), s: V3(0.08, 0.03, 0.08) }); part(0, sphere, 0xfff4f8, { p: V3(0, 0.2, 0), s: V3(0.055, 0.055, 0.055) });
      // 질경이: 로제트 잎 두 장 + 이삭
      part(1, sphere, 0x6f9a2c, { p: V3(0.06, 0.04, 0), s: V3(0.2, 0.03, 0.08) }); part(1, sphere, 0x6f9a2c, { p: V3(0, 0.04, 0.06), s: V3(0.08, 0.03, 0.2) }); part(1, cyl, 0x8a5a2a, { p: V3(0, 0.2, 0), s: V3(0.012, 0.4, 0.012) });
      // 쑥: 회녹색 덤불
      part(2, sphere, 0x7a9f72, { p: V3(0, 0.2, 0), s: V3(0.17, 0.22, 0.17) }); part(2, sphere, 0x9ab88f, { p: V3(0.06, 0.34, 0.03), s: V3(0.09, 0.1, 0.09) });
      // 강아지풀: 잎 세 장 + 이삭
      part(3, cone, 0x6bb04a, { p: V3(0.03, 0.14, 0), s: V3(0.04, 0.3, 0.04), r: [0, 0, -0.25] }); part(3, cone, 0x6bb04a, { p: V3(-0.03, 0.14, 0.02), s: V3(0.04, 0.3, 0.04), r: [0.2, 0, 0.25] }); part(3, cyl, 0xc6cc55, { p: V3(0, 0.3, 0), s: V3(0.03, 0.18, 0.03), r: [0.15, 0, 0.2] });

      /* 방형구 : 2D의 방형구 10개 좌표(QPOS)에 놓여요 */
      const NQ = LS.QPOS.length, quads = [], qgroup = new THREE.Group(); root.add(qgroup);
      const labPool = Array.from({ length: NQ }, () => { const l = label('', null, { size: 12 }); l.show(false); return l; });
      for (let idx = 0; idx < NQ; idx++) {
        const x = LS.QPOS[idx][0] + 0.5 - W / 2, z = LS.QPOS[idx][1] + 0.5 - H / 2, c = QCOL[idx % QCOL.length];
        const g = new THREE.Group(), fm = std(c, { roughness: 0.4, emissive: c, emissiveIntensity: 0.25 }), sm = std(0xffffff, { roughness: 0.5, transparent: true, opacity: 0.8 });
        const hs = [[-.5, -.5], [.5, -.5], [.5, .5], [-.5, .5]].map(([a, b]) => hgt(x + a, z + b)), top = Math.max(hgt(x, z), ...hs) + 0.14;
        [[0, -0.5, 1], [0, 0.5, 1], [-0.5, 0, 0], [0.5, 0, 0]].forEach(([a, b, h]) => { const e = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.05, 8), fm); e.position.set(a, top, b); if (h) e.rotation.z = Math.PI / 2; else e.rotation.x = Math.PI / 2; g.add(e); });
        [-0.25, 0, 0.25].forEach((o) => { [0, 1].forEach((d) => { const s = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 1, 5), sm); s.position.set(d ? o : 0, top, d ? 0 : o); if (d) s.rotation.x = Math.PI / 2; else s.rotation.z = Math.PI / 2; g.add(s); }); });
        [[-.5, -.5], [.5, -.5], [.5, .5], [-.5, .5]].forEach(([a, b], k) => { const st = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.025, top - hs[k] + 0.05, 6), fm); st.position.set(a, (top + hs[k]) / 2, b); g.add(st); });
        g.position.set(x, 0, z); g.visible = false; qgroup.add(g);
        const lab = labPool[idx]; lab.obj = g; lab.off = [0, top + 0.6, 0]; lab.el.style.background = 'rgba(' + [(c >> 16) & 255, (c >> 8) & 255, c & 255].join(',') + ',.92)';
        quads.push({ x, z, g, c, lab, top });
      }
      let sel = 3, zoomed = false, lastKey = '';
      const DEN = LS.DENS;
      function refreshInfo(placed, mode) {
        const s = SP[sel];
        if (!placed) { info('<b>🎲 방형구 던지기</b>를 눌러 초지(20 m × 12 m)에 1 m × 1 m 방형구를 놓아 보세요. (10개 = 10 m²)<br>' + (mode === 'free' ? '눈에 띄는 곳만 고르면 결과가 치우쳐요(편향).' : '무작위 좌표에 놓아야 치우침이 줄어요.')); return; }
        const cnt = LS.CNT[sel].slice(0, placed), tot = cnt.reduce((a, b) => a + b, 0), occ = cnt.filter((v) => v > 0).length;
        info('<b>' + s.n + '</b>: 방형구 ' + placed + '개(' + placed + ' m²)에서 ' + tot + '개체 → 밀도 <b>' + (tot / placed).toFixed(1) + '</b>개체/m²<br>출현한 방형구 ' + occ + '/' + placed + ' → 빈도 <b>' + Math.round(occ / placed * 100) + '%</b><br>방형구를 10개까지 설치하면 초지 전체 밀도에 가까워져요 (10개 기준 ' + LS.DENS[sel].toFixed(1) + '개체/m²)');
      }
      controls.segment('식물', SP.map((s, i) => ({ label: s.n, value: i })), 3, (v) => { sel = v; mats.forEach(([sp, m]) => { m.emissive.set(sp === v ? 0xffe14d : 0x000000); m.emissiveIntensity = sp === v ? 0.45 : 0; }); lastKey = ''; });
      controls.button('🎲 방형구 던지기', () => { const L = L2(); if (!L) return; if (L.S.fld.mode === 'free') { info('지금은 <b>눈에 띄는 곳 고르기</b> 방식이에요. 무작위 좌표 방식에서 던질 수 있어요.'); return; } L.throwQuad(); });
      const zb = controls.button('🔍 방형구 확대', () => {
        const L = L2(), last = L ? L.S.fld.placed - 1 : -1;
        zoomed = !zoomed; zb.classList.toggle('on', zoomed); zb.textContent = zoomed ? '🔍 초지 전체' : '🔍 방형구 확대';
        if (zoomed && last >= 0) { const q = quads[last]; orbit.tx = q.x; orbit.tz = q.z; orbit.ty = 0.1; orbit.dist = 3.2; orbit.phi = 0.9; }
        else { zoomed = false; orbit.tx = 0; orbit.tz = 0; orbit.ty = 0; orbit.dist = narrow ? 30 : 22; orbit.phi = 0.95; zb.textContent = '🔍 방형구 확대'; zb.classList.remove('on'); }
      });
      mats.forEach(([sp, m]) => { m.emissive.set(sp === 3 ? 0xffe14d : 0x000000); m.emissiveIntensity = sp === 3 ? 0.45 : 0; });
      label('초지 (20 m × 12 m)', [0, 0.2, -H / 2 - 0.4], { color: 'rgba(30,110,50,.9)' });
      return {
        update(dt) {
          const L = L2(); if (!L) return; const f = L.S.fld; if (!f) return;
          quads.forEach((q, i) => {
            const on = i < f.placed; q.g.visible = on; q.lab.show(on);
            if (on) { const k = f.drop[i].k; q.g.position.y = k < 1 ? (1 - k) * 2.5 : 0; q.lab.set((i + 1) + '번 · ' + SP[sel].n + ' ' + LS.CNT[sel][i] + '개체'); }
          });
          const key = f.placed + '|' + sel + '|' + f.mode; if (key !== lastKey) { lastKey = key; refreshInfo(f.placed, f.mode); }
        },
        sync() { lastKey = ''; },
      };
    },
  });
})();
