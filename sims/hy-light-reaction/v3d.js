/* hy-light-reaction · 3D 틸라코이드 막의 명반응
   빛 → 광계 Ⅱ(물 분해 · O₂ · e⁻) → 플라스토퀴논(PQ) → 시토크롬 b₆f(H⁺ 펌프) → 플라스토사이아닌(PC) → 광계 Ⅰ(빛) → 페레독신(Fd) → NADP⁺ 환원 효소 → NADPH
   막 안쪽(루멘)에 쌓인 H⁺가 ATP 합성 효소를 지나 스트로마로 흐르면서 ATP가 만들어져요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const narrow = window.innerWidth < 600 || window.innerHeight > window.innerWidth * 1.1;
  const X = { II: -4.0, b6f: -1.6, I: 0.6, fnr: 1.9, syn: 4.0 };

  window.SciSim3D.attach({
    title: '틸라코이드 막 명반응 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: narrow ? 15 : 12, theta: 0.18, phi: 1.36, target: [0, 0.3, 0], min: 6, max: 22 },
    autoRotate: 0,
    levels: [0, 1, 2, 3],
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const V = THREE.Vector3;
      let light = 0.7, minor = false;
      const std = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.42, metalness: 0.04 }, o || {}));

      /* ---------- 틸라코이드 막 ---------- */
      {
        const NX = 22, NZ = 4, SX = 0.5, maxN = NX * NZ * 2;
        const heads = new THREE.InstancedMesh(new THREE.SphereGeometry(0.19, 16, 12), std(0x4ade80, { roughness: 0.35 }), maxN);
        const tails = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.045, 0.045, 0.4, 8), std(0xfbbf24, { roughness: 0.5 }), maxN * 2);
        const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), S1 = new V(1, 1, 1), P = new V();
        const holes = [[X.II, 0, 0.95], [X.b6f, 0, 0.7], [X.I, 0, 0.95], [X.fnr, 0, 0.0], [X.syn, 0, 0.75]];
        let h = 0, t = 0;
        for (let i = 0; i < NX; i++) for (let k = 0; k < NZ; k++) {
          const x = (i - (NX - 1) / 2) * SX + ((k % 2) ? SX / 2 : 0), z = -0.5 - k * 0.46;
          if (Math.abs(x) > 5.6) continue;
          if (holes.some((o) => Math.hypot(x - o[0], z - o[1]) < o[2])) continue;
          for (let s = -1; s <= 1; s += 2) {
            M4.compose(P.set(x, s * 0.44, z), Q, S1); heads.setMatrixAt(h++, M4);
            for (const dx of [-0.07, 0.07]) { M4.compose(P.set(x + dx, s * 0.2, z), Q, S1); tails.setMatrixAt(t++, M4); }
          }
        }
        heads.count = h; tails.count = t; root.add(heads, tails);
      }
      const ell = (x, y, sx, sy, sz, color, extra) => {
        const m = new THREE.Mesh(new THREE.SphereGeometry(1, 36, 24), std(color, Object.assign({ roughness: 0.35 }, extra || {}))); m.scale.set(sx, sy, sz); m.position.set(x, y, 0); root.add(m); return m;
      };
      // 광계 Ⅱ (물 분해 효소가 루멘 쪽에 붙어 있어요)
      const psII = ell(X.II, 0, 0.8, 0.85, 0.75, 0x10b981, { emissive: 0x000000 });
      const oec = ell(X.II + 0.1, 0.9, 0.38, 0.3, 0.35, 0x047857);
      [-1, 1].forEach((s) => ell(X.II + s * 0.95, 0.05, 0.38, 0.62, 0.5, 0x6ee7b7));
      const b6f = ell(X.b6f, 0, 0.55, 0.75, 0.6, 0xf59e0b, { emissive: 0x000000 });
      const psI = ell(X.I, 0, 0.8, 0.8, 0.75, 0x84cc16, { emissive: 0x000000 });
      [-1, 1].forEach((s) => ell(X.I + s * 1.0, 0.05, 0.38, 0.6, 0.5, 0xbef264));
      const fnr = ell(X.fnr, -0.95, 0.45, 0.42, 0.45, 0x38bdf8);
      // ATP 합성 효소
      const synth = new THREE.Group(); synth.position.set(X.syn, 0, 0); root.add(synth);
      const rotor = new THREE.Group(); synth.add(rotor);
      const rotMat = std(0xa78bfa);
      for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2, c = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.55, 8, 14), rotMat); c.position.set(Math.cos(a) * 0.4, 0, Math.sin(a) * 0.4); rotor.add(c); }
      const gam = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.6, 14), std(0xfacc15, { emissive: 0x3a2a00 })); gam.position.y = -0.9; rotor.add(gam);
      const aSub = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.9, 0.5), std(0x7c3aed)); aSub.position.set(0.72, 0, 0); synth.add(aSub);
      const F1 = new THREE.Group(); F1.position.y = -1.5; synth.add(F1);
      const bMats = [0, 1, 2].map(() => std(0x34d399)), aMat = std(0x7dd3fc), betas = [];
      for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2, isB = i % 2 === 0, m = new THREE.Mesh(new THREE.SphereGeometry(0.36, 26, 18), isB ? bMats[i / 2] : aMat); m.scale.set(1, 1.3, 1); m.position.set(Math.cos(a) * 0.42, 0, Math.sin(a) * 0.42); F1.add(m); if (isB) betas.push({ a }); }
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.3, 10), std(0x94a3b8)); arm.position.set(0.82, -0.7, 0); synth.add(arm);

      /* ---------- 입자 ---------- */
      const eCore = std(0xfef08c, { emissive: 0xa16207, roughness: 0.25 }), eGeo = new THREE.SphereGeometry(0.09, 14, 10);
      const shellGeo = new THREE.SphereGeometry(0.24, 18, 14);
      const shellMats = { pq: std(0xfb923c, { transparent: true, opacity: 0.55, depthWrite: false }), pc: std(0x60a5fa, { transparent: true, opacity: 0.55, depthWrite: false }), fd: std(0xf87171, { transparent: true, opacity: 0.55, depthWrite: false }) };
      const path = new THREE.CatmullRomCurve3([
        [X.II, 0.25, 0], [X.II + 0.8, -0.1, 0.2], [X.II + 1.6, 0.0, 0], [X.b6f, 0, 0], [X.b6f + 0.5, 0.75, 0], [-0.6, 1.2, 0], [X.I - 0.2, 0.7, 0], [X.I, 0.1, 0],
        [X.I + 0.4, -0.6, 0], [X.I + 0.85, -1.1, 0.1], [X.fnr, -1.0, 0],
      ].map((p) => new V(p[0], p[1], p[2])));
      const pathLen = path.getLength();
      const eps = [], photons = [], bits = [];
      const hMat = std(0xfde047, { emissive: 0x7a5a00 }), hGeo = new THREE.SphereGeometry(0.13, 12, 10);
      const phMat = std(0xffffff, { emissive: 0xfff3a0, emissiveIntensity: 1.2, roughness: 0.2 });
      const o2Mat = std(0xef4444), o2Geo = new THREE.SphereGeometry(0.18, 14, 10), nadphMat = std(0x22d3ee, { emissive: 0x064e5a }), atpMat = std(0xfacc15, { emissive: 0x7a5a00 });
      const lumenH = [];
      let nATP = 0, nNADPH = 0, nO2 = 0, nPack = 0;

      function rndLumen() { return new V((Math.random() * 2 - 1) * 5, 0.8 + Math.random() * 1.3, (Math.random() * 2 - 1) * 2); }
      function addLumenH(p) { const m = new THREE.Mesh(hGeo, hMat); m.position.copy(p || rndLumen()); root.add(m); const o = { m, v: new V(Math.random() - .5, Math.random() - .5, Math.random() - .5).setLength(0.9), s: 0 }; lumenH.push(o); return o; }
      function bit(m, from, vel, life, grow) { m.position.copy(from); root.add(m); bits.push({ m, v: vel, t: 0, life, grow, base: m.scale.x }); }
      function photon(from, to, arriveCb) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.14, 14, 10), phMat); m.position.copy(from); root.add(m); photons.push({ m, from: from.clone(), to: to.clone(), t: 0, dur: 0.8, cb: arriveCb }); }
      function flash(mesh) { mesh.material.emissive.setHex(0x9a8a00); setTimeout(() => mesh.material.emissive.setHex(0x000000), 220); }
      function launch() {
        nPack++;
        photon(new V(-6.5, 4.6, 0.4), new V(X.II, 1.2, 0.2), () => {
          flash(psII);
          // 물 분해: O₂ 와 H⁺
          const w = new THREE.Group(); { const o = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 10), std(0xef4444)); w.add(o); [-1, 1].forEach((s) => { const h = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10), std(0xf1f5f9)); h.position.set(s * 0.2, 0.14, 0); w.add(h); }); }
          bit(w, new V(X.II - 1.4, 1.5, 0.3), new V(0.9, -0.15, 0), 0.9, -1);
          for (let i = 0; i < 2; i++) addLumenH(new V(X.II + 0.1 + i * 0.3, 1.5, 0.3)).s = 0;
          if (nPack % 2 === 0) { const o2 = new THREE.Mesh(o2Geo, o2Mat); bit(o2, new V(X.II - 0.4, 1.4, -0.2), new V(-0.6, 1.0, -0.2), 2.2, -1); nO2++; }
          // 전자 출발
          const g = new THREE.Group(); const c = new THREE.Mesh(eGeo, eCore); g.add(c); const sh = new THREE.Mesh(shellGeo, shellMats.pq); g.add(sh); g.userData = { sh, core: c };
          g.position.copy(path.getPoint(0)); root.add(g); eps.push({ g, u: 0, p2: false, pumped: false });
        });
      }
      function spawnATP(a) {
        const g = new THREE.Group(); g.add(new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), atpMat));
        for (let i = 0; i < 3; i++) { const p = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10), std(0xf472b6)); p.position.set(0.26 + i * 0.19, 0, 0); g.add(p); }
        bit(g, new V(X.syn + Math.cos(a) * 0.9, -1.5, Math.sin(a) * 0.9), new V(Math.cos(a), -0.5, Math.sin(a)).setLength(1.0), 2.2, -1); nATP++;
      }

      const L = {
        lum: label('루멘 (H⁺ 많음)', [-5.2, 2.3, 0], { color: '#7c5a10' }),
        str: label('스트로마 (H⁺ 적음)', [-5.2, -2.1, 0], { color: '#7c5a10' }),
        ps2: label('광계 Ⅱ', [X.II, -0.95, 0.4], { color: '#047857' }),
        bf: label('시토크롬 b₆f', [X.b6f, -0.95, 0.4], { color: '#92400e' }),
        ps1: label('광계 Ⅰ', [X.I, -0.95, 0.4], { color: '#4d7c0f' }),
        syn: label('ATP 합성 효소', [X.syn + 0.2, 0.95, 0], { color: '#5b21b6' }),
        h2o: label('물 분해 → O₂', [X.II - 1.6, 2.1, 0], { color: '#991b1b' }),
        nad: label('NADPH', [X.fnr + 0.3, -2.3, 0], { color: '#0e7490' }),
        pq: label('PQ', [X.II + 1.5, 0.55, 0.4], { color: '#9a3412' }), pc: label('PC', [-0.6, 1.75, 0], { color: '#1d4ed8' }), fd: label('Fd', [X.I + 0.6, -1.6, 0.4], { color: '#b91c1c' }),
        fn: label('NADP⁺ 환원 효소', [X.fnr + 0.2, -0.45, 0.4], { color: '#075985' }),
      };
      function applyLabels() { ['pq', 'pc', 'fd', 'fn'].forEach((k) => L[k].show(minor)); }
      applyLabels();
      function text() {
        info('빛으로 <b>물이 분해</b>되고 전자가 이동해요. H⁺ 기울기로 <b>ATP</b>, 마지막에 <b>NADPH</b>가 만들어져요.<br><span style="color:#fde68a">ATP ' + nATP + ' · NADPH ' + nNADPH + ' · O₂ ' + nO2 + '</span>');
      }
      controls.range('빛의 세기', 0, 100, 5, 70, (v) => { light = v / 100; }, (v) => v + '%');
      const mb = controls.button('전달체 이름표 보기', () => { minor = !minor; mb.classList.toggle('on', minor); mb.textContent = minor ? '전달체 이름표 가리기' : '전달체 이름표 보기'; applyLabels(); });

      let spawnAcc = 0.5, ang = 0, stepAcc = 0, cnt = 0, infoT = 0, w = 0;
      return {
        update(dt) {
          dt = Math.min(dt, 0.05);
          spawnAcc += light * 1.2 * dt; if (spawnAcc >= 1 && eps.length < 7) { spawnAcc -= 1; launch(); } else if (spawnAcc >= 1) spawnAcc = 1;
          // 빛 알갱이
          for (let i = photons.length - 1; i >= 0; i--) { const p = photons[i]; p.t += dt; p.m.position.lerpVectors(p.from, p.to, Math.min(1, p.t / p.dur)); if (p.t >= p.dur) { root.remove(p.m); photons.splice(i, 1); p.cb(); } }
          // 전자
          for (let i = eps.length - 1; i >= 0; i--) {
            const e = eps[i]; e.u += dt * 2.0 / pathLen; const u = Math.min(1, e.u);
            e.g.position.copy(path.getPoint(u));
            const sh = e.g.userData.sh;
            if (u < 0.3) { sh.material = shellMats.pq; sh.visible = true; } else if (u < 0.36) sh.visible = false; else if (u < 0.66) { sh.material = shellMats.pc; sh.visible = true; } else if (u < 0.74) sh.visible = false; else { sh.material = shellMats.fd; sh.visible = true; }
            if (u > 0.34 && !e.pumped) { e.pumped = true; flash(b6f); for (let k = 0; k < 2; k++) { const m = new THREE.Mesh(hGeo, hMat); const o = addLumenH(new V(X.b6f + (k - 0.5) * 0.4, -0.9, 0)); o.s = 1; o.m.position.set(X.b6f + (k - 0.5) * 0.4, -0.9, 0); o.rise = 0; } }
            if (u > 0.55 && !e.p2) { e.p2 = true; photon(new V(-3.0, 4.8, -0.3), new V(X.I, 1.1, 0.2), () => flash(psI)); }
            if (u >= 1) { eps.splice(i, 1); root.remove(e.g); nNADPH++; const m = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), nadphMat); bit(m, new V(X.fnr + 0.1, -1.4, 0), new V(0.5, -0.9, 0.2), 2.0, -1); flash(fnr); }
          }
          // ATP 합성 효소 · 루멘 H⁺
          const target = Math.round(3 + light * 18), lumenN = lumenH.length;
          w = light * 3.0; ang += w * dt; rotor.rotation.y = -ang;
          const stp = Math.floor(ang / (Math.PI * 2 / 3));
          bMats.forEach((m, i) => { const s = (stp + i) % 3; m.color.setHex(s === 0 ? 0x86efac : s === 1 ? 0x22c55e : 0x15803d); });
          if (stp !== cnt) { cnt = stp; if (light > 0.02) spawnATP(betas[stp % 3].a + 0.2); }
          stepAcc += w * dt / (Math.PI * 2 / 10);
          while (stepAcc >= 1 && lumenH.length > 3) {
            stepAcc -= 1;
            let bi = 0, bd = 1e9; lumenH.forEach((o, i) => { const d = Math.hypot(o.m.position.x - X.syn, o.m.position.y - 1); if (d < bd) { bd = d; bi = i; } });
            const o = lumenH.splice(bi, 1)[0];
            bit(o.m, o.m.position.clone(), new V(0, -1, 0), 1.0, -1); bits[bits.length - 1].path = [o.m.position.clone(), new V(X.syn + 0.7, 0.8, 0), new V(X.syn + 0.7, -0.4, 0), new V(X.syn + 0.9, -1.4, 0)];
          }
          if (stepAcc > 1) stepAcc = 1;
          while (lumenH.length < Math.max(3, target * 0.7) && Math.random() < 0.03) addLumenH();
          while (lumenH.length > target + 4) { const o = lumenH.pop(); root.remove(o.m); }
          lumenH.forEach((o) => {
            o.v.x += (Math.random() - 0.5) * 6 * dt; o.v.y += (Math.random() - 0.5) * 6 * dt; o.v.z += (Math.random() - 0.5) * 6 * dt; o.v.setLength(Math.max(0.6, Math.min(1.3, o.v.length())));
            const p = o.m.position; p.addScaledVector(o.v, dt);
            if (o.rise !== undefined) { p.y += 1.6 * dt; if (p.y > 0.9) delete o.rise; return; }
            if (Math.abs(p.x) > 5.3) { p.x = Math.sign(p.x) * 5.3; o.v.x *= -1; } if (Math.abs(p.z) > 2) { p.z = Math.sign(p.z) * 2; o.v.z *= -1; }
            if (p.y > 2.3) { p.y = 2.3; o.v.y *= -1; } if (p.y < 0.75) { p.y = 0.75; o.v.y = Math.abs(o.v.y); }
            if (o.s < 1) { o.s = Math.min(1, o.s + dt * 3); o.m.scale.setScalar(o.s); }
          });
          // 날아가는 조각들
          for (let i = bits.length - 1; i >= 0; i--) {
            const b = bits[i]; b.t += dt;
            if (b.path) { const n = b.path.length - 1, f = Math.min(1, b.t / 0.8) * n, j = Math.min(n - 1, Math.floor(f)); b.m.position.lerpVectors(b.path[j], b.path[j + 1], f - j); }
            else b.m.position.addScaledVector(b.v, dt);
            if (b.grow < 0) { const k = b.t / b.life; b.m.scale.setScalar(Math.max(0.01, k > 0.6 ? 1 - (k - 0.6) / 0.4 : 1)); }
            if (b.t >= (b.path ? 0.8 : b.life)) { root.remove(b.m); bits.splice(i, 1); }
          }
          infoT += dt; if (infoT > 0.4) { infoT = 0; text(); }
        },
        sync() { text(); },
      };
    },
  });
})();
