/* hg-lac-operon · 3D 젖당 오페론
   조절 유전자 · 프로모터 · 작동 부위 · 구조 유전자(lacZ · lacY · lacA)가 한 줄로 늘어선 DNA.
   젖당이 없으면 억제 단백질이 작동 부위에 붙어 RNA 중합 효소가 못 지나가요.
   젖당이 있으면 (알로)젖당이 억제 단백질에 붙어 모양이 변해 떨어져 나가고, 전사 → 번역으로 젖당 분해 효소가 만들어져요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const narrow = window.innerWidth < 600 || window.innerHeight > window.innerWidth * 1.1;
  const SEC = [
    { id: 'I', x0: -5.6, x1: -4.1, col: 0x94a3b8, name: '조절 유전자' },
    { id: 'P', x0: -3.9, x1: -2.9, col: 0x84cc16, name: '프로모터' },
    { id: 'O', x0: -2.8, x1: -1.8, col: 0xf97316, name: '작동 부위' },
    { id: 'Z', x0: -1.7, x1: 0.3, col: 0x3b82f6 }, { id: 'Y', x0: 0.4, x1: 1.9, col: 0xa855f7 }, { id: 'A', x0: 2.0, x1: 3.2, col: 0x10b981 },
  ];
  const secOf = (x) => SEC.find((s) => x >= s.x0 && x <= s.x1);
  const END = 3.5, PSTART = -3.3;

  window.SciSim3D.attach({
    title: '젖당 오페론 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: narrow ? 14 : 11.5, theta: 0.25, phi: 1.22, target: [-0.8, 0.7, 0], min: 5, max: 22 },
    autoRotate: 0,
    levels: [0, 1, 2],
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const V = THREE.Vector3, M4 = new THREE.Matrix4(), cc = new THREE.Color();
      let lac = false;
      const std = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.4, metalness: 0.04 }, o || {}));
      const An = (x, y, z) => { const o = new THREE.Object3D(); o.position.set(x, y, z); root.add(o); return o; };

      /* ---------- DNA ---------- */
      const DB = 0.12, RAD = 0.26, PITCH = 2.2, X0 = -5.8, X1 = 3.5, N = Math.floor((X1 - X0) / DB);
      const dna = new THREE.InstancedMesh(new THREE.SphereGeometry(0.1, 12, 10), std(0xffffff, { roughness: 0.3 }), N * 2);
      for (let k = 0; k < 2; k++) for (let i = 0; i < N; i++) {
        const x = X0 + i * DB, a = 2 * Math.PI * x / PITCH + k * Math.PI, s = secOf(x);
        M4.makeTranslation(x, RAD * Math.cos(a), RAD * Math.sin(a)); dna.setMatrixAt(k * N + i, M4);
        dna.setColorAt(k * N + i, cc.setHex(s ? s.col : 0x64748b));
      }
      dna.instanceMatrix.needsUpdate = true; dna.instanceColor.needsUpdate = true; root.add(dna);
      // 구간 표지 (DNA 위의 얇은 띠)
      SEC.forEach((s) => {
        const b = new THREE.Mesh(new THREE.BoxGeometry(s.x1 - s.x0, 0.07, 0.3), std(s.col, { roughness: 0.4, emissive: s.col, emissiveIntensity: 0.18 })); b.position.set((s.x0 + s.x1) / 2, -0.62, 0); root.add(b);
      });
      SEC.filter((s) => 'ZYA'.indexOf(s.id) >= 0).forEach((s) => { const t = An((s.x0 + s.x1) / 2, -0.95, 0); label('lac' + s.id, t, { color: '#' + s.col.toString(16).padStart(6, '0') }); });
      const L = {
        I: label('조절 유전자', An(-4.85, -1.45, 0), { color: '#475569' }), P: label('프로모터', An(-3.4, -1.45, 0), { color: '#3f6212' }),
        O: label('작동 부위', An(-2.3, -1.95, 0), { color: '#9a3412' }), S: label('구조 유전자', An(0.9, -1.45, 0), { color: '#1e3a8a' }),
        pol: label('RNA 중합 효소', null, { color: '#0f766e' }), rep: label('억제 단백질', null, { color: '#991b1b' }),
        lact: label('젖당', null, { color: '#92400e', offset: [0, 0.4, 0] }), mrna: label('mRNA', null, { color: '#9a3412' }), enz: label('젖당 분해 효소', null, { color: '#1e3a8a' }),
      };

      /* ---------- RNA 중합 효소 · 억제 단백질 ---------- */
      const pol = new THREE.Group(); root.add(pol);
      { const b = new THREE.Mesh(new THREE.SphereGeometry(1, 36, 24), std(0x14b8a6, { transparent: true, opacity: 0.45, depthWrite: false, roughness: 0.3 })); b.scale.set(0.95, 0.85, 0.85); pol.add(b);
        const c1 = new THREE.Mesh(new THREE.SphereGeometry(0.42, 20, 14), std(0x0d9488)); c1.position.set(0.2, 0.3, -0.25); pol.add(c1); }
      pol.position.set(PSTART, 0, 0);
      const rep = new THREE.Group(); root.add(rep);
      const repMat = std(0xef4444, { roughness: 0.35 });
      { [-0.34, 0.34].forEach((z) => { const s = new THREE.Mesh(new THREE.SphereGeometry(0.4, 24, 18), repMat); s.position.set(0, 0.62, z); rep.add(s); const f = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.5, 12), repMat); f.position.set(0, 0.3, z * 0.55); rep.add(f); });
        const top = new THREE.Mesh(new THREE.SphereGeometry(0.3, 20, 14), repMat); top.position.set(0, 0.95, 0); rep.add(top); }
      const OP = new V(-2.3, 0.1, 0); rep.position.copy(OP);
      // 젖당 (포도당 + 갈락토스)
      const gluM = std(0x38bdf8, { roughness: 0.3 }), galM = std(0xfacc15, { roughness: 0.3 });
      function dumb() { const g = new THREE.Group(); const a = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), gluM), b = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), galM); a.position.x = -0.18; b.position.x = 0.18; g.add(a, b); g.userData = { a, b }; return g; }
      const lacts = [];
      for (let i = 0; i < 8; i++) { const g = dumb(); g.visible = false; root.add(g); lacts.push({ g, v: new V(Math.random() - .5, Math.random() - .5, Math.random() - .5).setLength(0.8), state: 'free', slot: -1, t: 0 }); }
      const pieces = [];
      // mRNA
      const rnaMax = 90, rna = new THREE.InstancedMesh(new THREE.SphereGeometry(0.1, 12, 10), std(0xfb923c, { emissive: 0x3a1a00, roughness: 0.35 }), rnaMax); root.add(rna);
      // 효소
      const enzs = [];
      function addEnz(kind, x) {
        const col = kind === 'Z' ? 0x3b82f6 : kind === 'Y' ? 0xa855f7 : 0x10b981;
        const g = new THREE.Group(); const r = kind === 'Z' ? 0.34 : 0.26;
        for (let i = 0; i < 4; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 14), std(col, { roughness: 0.35 })); s.position.set((i % 2 - 0.5) * r * 1.1, (i >> 1 ? 0.5 : -0.5) * r * 1.0, 0); g.add(s); }
        g.position.set(x, 1.2, 0.4); root.add(g); enzs.push({ g, kind, v: new V(Math.random() - .5, Math.random() - .5, Math.random() - .5).setLength(0.6), t: 0 });
      }
      const ease = (k) => { k = Math.max(0, Math.min(1, k)); return k * k * (3 - 2 * k); };

      let ph = 'blocked', pt = 0, progress = 0, rnaFade = 1, repFly = 0, bound = 0, mrnaN = 0;
      function setLac(v) {
        lac = v; ph = v ? 'binding' : 'blocked'; pt = 0; progress = 0; bound = 0; repFly = 0;
        lacts.forEach((o, i) => { o.g.visible = v && i < 6; o.state = 'free'; o.slot = -1; o.t = 0; o.g.position.set((Math.random() * 2 - 1) * 3.5, 1.6 + Math.random() * 1.6, (Math.random() * 2 - 1) * 1.2); o.g.userData.a.position.x = -0.18; o.g.userData.b.position.x = 0.18; o.g.userData.a.visible = o.g.userData.b.visible = true; o.g.scale.setScalar(1); });
        if (!v) { repMat.color.setHex(0xef4444); rep.position.copy(OP); rep.rotation.set(0, 0, 0); }
        pol.position.set(PSTART, 0, 0); text();
      }
      function text() {
        if (!lac) info('<b>젖당이 없을 때</b> · <b>억제 단백질</b>이 작동 부위에 붙어 RNA 중합 효소가 지나가지 못해요. 구조 유전자가 전사되지 않아요(꺼짐).');
        else info('<b>젖당이 있을 때</b> · 젖당(알로젖당)이 억제 단백질에 붙으면 억제 단백질이 떨어져 나가요. RNA 중합 효소가 구조 유전자를 전사해 <b>젖당 분해 효소</b>가 만들어져요(켜짐).');
      }
      const seg = controls.segment('상태', [{ value: 'no', label: '젖당 없음' }, { value: 'yes', label: '젖당 있음' }], 'no', (v) => setLac(v === 'yes'));
      setLac(false);

      let lastSim = null;
      const tmp = new V();
      return {
        update(dt, t) {
          dt = Math.min(dt, 0.05);
          const sm = window.__sim && window.__sim.S && window.__sim.S.mode;
          if (sm && sm !== lastSim) { lastSim = sm; if (sm === 'lac' && !lac) { seg.set('yes'); setLac(true); } else if ((sm === 'nolac' || sm === 'struct') && lac) { seg.set('no'); setLac(false); } }
          pt += dt;
          // 중합 효소 · 억제 단백질
          if (!lac) {
            pol.position.x = PSTART + 0.28 * (0.5 - 0.5 * Math.cos(t * 2.0)) * 1.6;
            rep.position.copy(OP);
            if (enzs.length) enzs.forEach((e) => { e.t += dt; });
          } else if (ph === 'binding') {
            pol.position.x = PSTART + 0.2 * (0.5 - 0.5 * Math.cos(t * 2.0));
            if (bound >= 2) { ph = 'leaving'; pt = 0; }
          } else if (ph === 'leaving') {
            const k = ease(pt / 1.6); repMat.color.setHex(k > 0.2 ? 0xfca5a5 : 0xef4444);
            rep.position.set(OP.x + k * 0.8, OP.y + k * 2.4, k * 1.6); rep.rotation.z = k * 0.9;
            if (k >= 1) { ph = 'go'; pt = 0; progress = 0; }
          } else if (ph === 'go') {
            progress += dt * 0.12; pol.position.x = PSTART + 0.2 + progress * (END - PSTART - 0.2);
            if (progress >= 1) { ph = 'done'; pt = 0; addEnz('Z', 2.5); addEnz('Y', 3.0); addEnz('A', 3.4); if (enzs.length > 9) { const o = enzs.splice(0, 3); o.forEach((e) => root.remove(e.g)); } }
          } else if (ph === 'done') {
            pol.position.x = END + Math.min(1.2, pt * 1.2); pol.scale.setScalar(Math.max(0.01, 1 - pt / 1.4));
            if (pt > 1.5) { pol.scale.setScalar(1); pol.position.x = PSTART; ph = 'go'; pt = 0; progress = 0; }
          }
          if (ph !== 'done') pol.scale.setScalar(1);
          // mRNA
          const px = pol.position.x, show = lac && (ph === 'go' || ph === 'done');
          const n = show ? Math.min(rnaMax, Math.floor((Math.min(px, END) - (-1.7)) / 0.1) + 2) : 0;
          for (let i = 0; i < rnaMax; i++) {
            if (i >= n || px < -1.7) { M4.makeScale(0, 0, 0); rna.setMatrixAt(i, M4); continue; }
            const s = i * 0.1, x = Math.min(px, END) - 0.1 - s * 0.95, y = -1.1 - Math.min(s, 2.2) * 0.1 + 0.15 * Math.sin(s * 3), z = 0.4 + 0.2 * Math.sin(s * 2);
            const k = ph === 'done' ? Math.max(0.01, 1 - pt / 1.5) : 1;
            M4.compose(new V(x, y, z), new THREE.Quaternion(), new V(k, k, k)); rna.setMatrixAt(i, M4);
          }
          rna.instanceMatrix.needsUpdate = true;
          // 젖당
          lacts.forEach((o, i) => {
            if (!o.g.visible) return;
            if (o.state === 'free') {
              o.v.x += (Math.random() - .5) * 5 * dt; o.v.y += (Math.random() - .5) * 5 * dt; o.v.z += (Math.random() - .5) * 5 * dt; o.v.setLength(0.8);
              o.g.position.addScaledVector(o.v, dt); const p = o.g.position;
              if (Math.abs(p.x) > 4.2) o.v.x *= -1; if (p.y > 3.6 || p.y < 1.2) o.v.y *= -1; if (Math.abs(p.z) > 1.4) o.v.z *= -1;
              o.g.rotation.z += dt;
              if (ph === 'binding' && bound < 2 && i === bound && pt > 0.8 + bound * 1.3) { o.state = 'goto'; o.slot = bound; o.t = 0; bound++; }
              // 효소가 가까이 있으면 분해돼요
              if (enzs.length && ph !== 'binding') enzs.forEach((e) => { if (o.state === 'free' && e.kind === 'Z' && e.g.position.distanceTo(p) < 0.9) { o.state = 'split'; o.t = 0; } });
            } else if (o.state === 'goto') {
              o.t += dt; const slotZ = o.slot ? 0.55 : -0.55; tmp.set(rep.position.x, rep.position.y + 0.75, slotZ);
              o.g.position.lerp(tmp, Math.min(1, dt * 3)); o.g.rotation.z *= 0.9;
              if (o.t > 1.0) o.state = 'bound';
            } else if (o.state === 'bound') {
              const slotZ = o.slot ? 0.55 : -0.55; o.g.position.set(rep.position.x + (o.slot ? 0.2 : -0.2), rep.position.y + 0.95, slotZ * 0.8); o.g.rotation.set(0, 0, 0.4);
            } else if (o.state === 'split') {
              o.t += dt; o.g.userData.a.position.x = -0.18 - o.t * 0.6; o.g.userData.b.position.x = 0.18 + o.t * 0.6; o.g.scale.setScalar(Math.max(0.01, 1 - o.t / 1.4));
              if (o.t > 1.4) { o.state = 'free'; o.g.userData.a.position.x = -0.18; o.g.userData.b.position.x = 0.18; o.g.scale.setScalar(1); o.g.position.set((Math.random() * 2 - 1) * 3.5, 3.2, (Math.random() * 2 - 1) * 1.0); }
            }
          });
          // 효소: 떠다녀요
          enzs.forEach((e, i) => {
            e.v.x += (Math.random() - .5) * 4 * dt; e.v.y += (Math.random() - .5) * 4 * dt; e.v.setLength(0.5); e.g.position.addScaledVector(e.v, dt); const p = e.g.position;
            if (p.x > 4.2 || p.x < -1.5) e.v.x *= -1; if (p.y > 3.4 || p.y < 1.3) e.v.y *= -1; if (Math.abs(p.z) > 1.0) e.v.z *= -1;
            if (!lac) { e.t += dt; e.g.scale.setScalar(Math.max(0.01, 1 - e.t / 3)); if (e.t > 3) { root.remove(e.g); enzs.splice(i, 1); } }
          });
          // 이름표 위치
          L.pol.obj = pol; L.rep.obj = rep; L.pol.show(true); L.rep.show(!lac || ph === 'leaving' || ph === 'go' || ph === 'done' || ph === 'binding');
          L.rep.off = [0, 1.4, 0]; L.pol.off = [0, -0.95, 0];
          const fl = lacts.find((o) => o.g.visible && o.state === 'free'); L.lact.obj = fl ? fl.g : null; L.lact.show(!!fl);
          L.mrna.obj = An0(-0.8, -1.35, 0.4); L.mrna.show(show && px > -0.6);
          const e0 = enzs.find((e) => e.kind === 'Z'); L.enz.obj = e0 ? e0.g : null; L.enz.show(!!e0 && lac);
        },
        sync() { text(); },
      };
      function An0(x, y, z) { if (!An0.o) { An0.o = new THREE.Object3D(); root.add(An0.o); } An0.o.position.set(x, y, z); return An0.o; }
    },
  });
})();
