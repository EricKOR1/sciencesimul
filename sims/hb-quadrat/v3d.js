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
    hint: '드래그: 돌리기 · 방형구를 확대해 식물을 세어 봐요',
    camera: { dist: narrow ? 44 : 27, theta: 0.15, phi: 0.95, min: 2.5, max: 48, target: [0, 0, 0] },
    autoRotate: 0,
    levels: [0],   // 방형구 설치와 식물 세기(던지기 · 확대 · ➕ 세기 · 📐 면적 읽기 단추). 기록표 · 곡선 · 층 이름표 단계는 2D
    build(ctx) {
      const { THREE, root, label, info, controls, orbit } = ctx;
      const V3 = (x, y, z) => new THREE.Vector3(x, y, z || 0);
      const std = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.7, metalness: 0.0 }, o || {}));
      // 색은 화면에서 옅게 나오므로 풀·흙 색을 진하게 잡아요
      const deep = (c, k) => { const a = new THREE.Color(c); return a.lerp(a.clone().convertSRGBToLinear(), k == null ? 0.85 : k); };
      const R = rng(77), D = new THREE.Object3D(), L2 = () => window.__sim || null;
      const LS = L2(); if (!LS) return {};
      const hgt = (x, z) => 0.22 * Math.sin(x * 0.55) * Math.cos(z * 0.5) + 0.12 * Math.sin(x * 1.1 + z * 0.8);

      /* 땅 */
      const gg = new THREE.PlaneGeometry(W, H, 50, 30); gg.rotateX(-Math.PI / 2);
      const p = gg.attributes.position, col = new Float32Array(p.count * 3);
      for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setY(i, hgt(x, z)); const n = 0.5 + 0.5 * Math.sin(x * 2.3) * Math.sin(z * 2.1 + 1) + 0.15 * Math.sin(x * 7 + z * 5); const c = new THREE.Color().setHSL(0.26 + 0.04 * n, 0.5, 0.3 + 0.07 * n).convertSRGBToLinear(); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
      gg.setAttribute('color', new THREE.BufferAttribute(col, 3)); gg.computeVertexNormals();
      const ground = new THREE.Mesh(gg, ctx.mats.stone(0xffffff, { repeat: 8, bump: 0.025, extra: { vertexColors: true } })); ground.receiveShadow = true; root.add(ground);
      const soil = new THREE.Mesh(new THREE.BoxGeometry(W + 0.02, 0.9, H + 0.02), ctx.mats.stone(deep(0x6b4526), { cracks: true, repeat: 3, bump: 0.05 })); soil.position.y = -0.75; root.add(soil);
      { const sub = new THREE.Mesh(new THREE.BoxGeometry(W + 0.04, 0.35, H + 0.04), ctx.mats.stone(deep(0x4a3a2c), { repeat: 3, bump: 0.05 })); sub.position.y = -1.37; root.add(sub); }   // 아래 흙층

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
        const m = std(deep(color, 0.7), Object.assign({ roughness: 0.6 }, o || {})); mats.push([sp, m]);
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
        const g = new THREE.Group(), fm = ctx.mats.plastic(c, { extra: { emissive: c, emissiveIntensity: 0.25 } }), sm = std(0xffffff, { roughness: 0.5, transparent: true, opacity: 0.8 });
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
        if (!placed) { info('<b>🎲 방형구 던지기</b>를 눌러 초지(20 m × 12 m)에 1 m × 1 m 방형구를 놓아 보세요. (10개 = 10 m²)<br>' + (mode === 'free' ? '눈에 띄는 곳만 고르면 결과가 치우쳐요(편향).' : '무작위 좌표에 놓아야 치우침이 줄어요.')); return; }
        // 밀도·빈도는 다음 단계(기록표)에서 학생이 직접 구해요 → 여기서는 값을 미리 알려 주지 않아요
        info('방형구 <b>' + placed + '개</b>(' + placed + ' m²)를 설치했어요.' + (placed < 10 ? ' 10개까지 던져 보세요.' : '<br>이제 <b>🔍 방형구 확대</b>로 방형구 하나를 열어 식물을 세어 봐요.') + '<br>노랗게 빛나는 식물이 고른 종(<b>' + SP[sel].n + '</b>)이에요.');
      }

      controls.segment('식물', SP.map((s, i) => ({ label: s.n, value: i })), 3, (v) => { sel = v; mats.forEach(([sp, m]) => { m.emissive.set(sp === v ? 0xffe14d : 0x000000); m.emissiveIntensity = sp === v ? 0.45 : 0; }); lastKey = ''; });
      /* 🎲 무작위 좌표면 던지기, 👆 내가 고르기 방식이면 '눈에 띄는(식물이 빽빽한) 곳'을 골라 보는 단추가 돼요 (2D에서 초지를 누르는 것과 같아요) */
      const tb = controls.button('🎲 방형구 던지기', () => {
        const L = L2(); if (!L) return;
        if (L.S.fld.mode !== 'free') { L.throwQuad(); return; }
        if (!L.fieldDown || !L.FD) return;
        const m2p = L.FD.w / 20; let best = null;
        for (let k = 0; k < 40; k++) { const u = 0.5 + Math.random() * 19, v = 0.5 + Math.random() * 11; const n = L.FIELD_PLANTS.filter((p) => Math.abs(p.u - u) <= 0.5 && Math.abs(p.v - v) <= 0.5).length; if (!best || n > best.n) best = { u, v, n }; }
        L.fieldDown({ x: L.FD.x + best.u * m2p, y: L.FD.y + best.v * m2p });
      });
      const zb = controls.button('🔍 방형구 확대', () => {
        const L = L2(), last = L ? L.S.fld.placed - 1 : -1;
        // 2D에서 방형구를 눌러 여는 것과 같아요 (세기 미션이 함께 진행돼요)
        if (L && !zoomed && last >= 0 && L.S.mode !== 'zoom' && L.openZoom) L.openZoom(last); else if (L && zoomed && L.S.mode === 'zoom' && L.setMode) L.setMode('field');
        zoomed = !zoomed; zb.classList.toggle('on', zoomed); zb.textContent = zoomed ? '🔍 초지 전체' : '🔍 방형구 확대';
        if (zoomed && last >= 0) { const q = quads[last]; orbit.tx = q.x; orbit.tz = q.z; orbit.ty = 0.1; orbit.dist = 3.2; orbit.phi = 0.9; }
        else { zoomed = false; orbit.tx = 0; orbit.tz = 0; orbit.ty = 0; orbit.dist = narrow ? 44 : 27; orbit.phi = 0.95; zb.textContent = '🔍 방형구 확대'; zb.classList.remove('on'); }
        ctx.refit(0.3);
      });
      /* 방형구 세기: 고른 식물을 한 포기씩 세고(✓), 그 종이 덮은 면적을 읽어요 */
      let cMsg = '', cMsgT = 0;
      const cTxt = controls.text('');
      const cB1 = controls.button('➕ 한 포기 세기', () => { const L = L2(); if (!L || L.S.mode !== 'zoom') return; if (!L.zoomMark(sel)) { cMsg = '이 방형구의 ' + SP[sel].n + '은(는) 모두 셌어요.'; cMsgT = 2.5; } lastKey = ''; });
      const cB2 = controls.button('📐 덮은 면적 읽기', () => { const L = L2(); if (!L || L.S.mode !== 'zoom') return; const v = L.zoomCover(sel); cMsg = SP[sel].n + '이(가) 덮은 면적: <b>' + (v / 100).toFixed(2) + ' m²</b>'; cMsgT = 4; lastKey = ''; });
      mats.forEach(([sp, m]) => { m.emissive.set(sp === 3 ? 0xffe14d : 0x000000); m.emissiveIntensity = sp === 3 ? 0.45 : 0; });
      label('초지 (20 m × 12 m)', [0, 0.2, -H / 2 - 0.4], { color: 'rgba(30,110,50,.9)' });
      return {
        update(dt) {
          const L = L2(); if (!L) return; const f = L.S.fld; if (!f) return;
          quads.forEach((q, i) => {
            const on = i < f.placed; q.g.visible = on; q.lab.show(on);
            if (on) { const k = f.drop[i].k; q.g.position.y = k < 1 ? (1 - k) * 2.5 : 0; q.lab.set((i + 1) + '번'); }
          });
          const key = f.placed + '|' + sel + '|' + f.mode;
          { const tt = f.mode === 'free' ? '👆 눈에 띄는 곳 고르기' : '🎲 방형구 던지기'; if (tb.textContent !== tt) tb.textContent = tt; }
          const zm = L.S.mode === 'zoom', Z = L.S.zoom;
          [cTxt, cB1, cB2].forEach((e) => { e.style.display = zm ? '' : 'none'; });
          if (cMsgT > 0) { cMsgT -= dt; if (cMsgT <= 0) { cMsg = ''; lastKey = ''; } }
          if (zm && Z) {
            const q = Z.q, c = L.zCounts(q), done = !!Z.done['q' + q];
            const ct = '<b>' + (q + 1) + '번 방형구</b> · 센 식물 ' + SP.map((p, i) => p.n + ' ' + c[i]).join(' · ') + (done ? ' · ✅ 모두 읽었어요' : '');
            if (cTxt.innerHTML !== ct) cTxt.innerHTML = ct;
            quads.forEach((qq, i) => { if (i < f.placed) qq.lab.set((i + 1) + '번'); });
            const k2 = 'z|' + q + '|' + sel + '|' + cMsg + '|' + done; if (k2 !== lastKey) { lastKey = k2; info('<b>' + (q + 1) + '번 방형구</b>를 크게 보고 있어요. 식물을 고르고 <b>➕ 한 포기 세기</b>로 그 종을 한 포기씩 세어요. <b>📐 덮은 면적 읽기</b>로 그 종이 덮은 면적도 읽어요.' + (cMsg ? '<br>' + cMsg : '')); }
          } else if (key !== lastKey) { lastKey = key; refreshInfo(f.placed, f.mode); }
        },
        sync() { lastKey = ''; },
      };
    },
  });
})();
