/* hy-membrane-structure · 3D 유동 모자이크 모형
   인지질 이중층 조각(머리 파랑 · 꼬리 주황, 머리는 바깥 · 꼬리는 안쪽), 통합 단백질 · 말초 단백질, 콜레스테롤, 당 사슬(바깥쪽에만).
   인지질이 옆으로 움직이는 모습과 단면(잘라낸 모습)을 볼 수 있어요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHONE = window.innerWidth < 600;
  const GX = 12, GZ = 10, SX = 0.42, SZ = 0.4, YH = 0.8;
  const PCOL = { ch: 0x7c3aed, ca: 0x0d9488, re: 0xea580c, en: 0x0284c7, gp: 0xdb2777 };   // 2D 차시와 같은 단백질 색
  const HEADC = 0x3b82f6, TAILC = 0xf59e0b, SUGC = 0xfbbf24, CHOLC = 0xfacc15;

  function fluidLocal(T, u, ch) { const Tm = 22 - 0.18 * u, sg = (s) => 1 / (1 + Math.exp(-(T - Tm) / s)); return ch ? 0.3 + 0.5 * sg(8) : sg(3); }
  function fluidOf(T, u, ch) { try { if (window.__sim && window.__sim.fluidM) return window.__sim.fluidM(T, u, ch); } catch (e) {} return fluidLocal(T, u, ch); }
  function mulberry(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  window.SciSim3D.attach({
    title: '세포막 3D 모형',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: PHONE ? 15.5 : 8.4, theta: 0.2, phi: 1.3, fov: 40, min: 4, max: 20, target: [PHONE ? 0 : -0.5, PHONE ? 0.3 : 0, 0] },
    autoRotate: 0,
    build(ctx) {
      const { THREE, root, label, info, controls, orbit, renderer } = ctx;
      renderer.localClippingEnabled = true;
      const rnd = mulberry(11);
      const plane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0);
      const allMats = [];
      const M = (c, ex) => { const m = new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.45, metalness: 0.05, side: THREE.DoubleSide }, ex || {})); allMats.push(m); return m; };

      /* ----- 단백질 ----- */
      const prots = [
        { type: 'ch', name: '통로 단백질', x: -1.55, z: 0.0, r: 0.52, integral: true },
        { type: 'ca', name: '운반체 단백질', x: -0.2, z: 0.0, r: 0.55, integral: true },
        { type: 're', name: '수용체', x: 1.2, z: 0.0, r: 0.52, integral: true },
        { type: 'gp', name: '인식 당단백질', x: -0.7, z: -1.45, r: 0.42, integral: true },
        { type: 'en', name: '효소', x: 1.45, z: -1.2, r: 0.5, integral: false },
      ];
      const pg = new THREE.Group(); root.add(pg);
      const hexGeo = new THREE.CylinderGeometry(0.085, 0.085, 0.06, 6);
      const sugMat = M(SUGC, { roughness: 0.4 });
      function hexBead(parent, x, y, z) { const m = new THREE.Mesh(hexGeo, sugMat); m.position.set(x, y, z); m.rotation.x = 0.5; m.rotation.z = 0.4; parent.add(m); return m; }
      const ions = [], cargo = {};
      prots.forEach((P) => {
        const g = new THREE.Group(); P.g = g; pg.add(g);
        const m = M(PCOL[P.type], { roughness: 0.4 });
        if (P.type === 'ch') {
          for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3, c = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 1.8, 14), m); c.position.set(0.36 * Math.cos(a), 0, 0.36 * Math.sin(a)); g.add(c); const t = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 8), m); t.position.set(c.position.x, 0.9, c.position.z); g.add(t); const b = t.clone(); b.position.y = -0.9; g.add(b); }
          const pore = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 1.85, 16, 1, true), M(0xbfe3ff, { transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false })); g.add(pore);
          [[0xef4444, 0], [0x3b82f6, 0.5], [0xef4444, 0.25], [0x3b82f6, 0.75]].forEach((c) => { const s = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 8), M(c[0], { roughness: 0.3 })); g.add(s); ions.push({ m: s, ph: c[1] }); });
        } else if (P.type === 'ca') {
          const b = new THREE.Mesh(new THREE.SphereGeometry(0.5, 28, 18), m); b.scale.set(1, 1.8, 0.85); g.add(b);
          const pk = new THREE.Mesh(new THREE.SphereGeometry(0.22, 18, 12), M(0x115e59)); pk.position.set(0, 0.55, 0.28); g.add(pk);
          const cg = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 10), M(0x22c55e, { roughness: 0.3 })); g.add(cg); cargo.m = cg;
        } else if (P.type === 're') {
          const b = new THREE.Mesh(new THREE.SphereGeometry(0.5, 28, 18), m); b.scale.set(0.85, 1.6, 0.75); g.add(b);
          const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.55, 8), m); stem.position.y = 1.15; g.add(stem);
          [-1, 1].forEach((s) => { const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.45, 8), m); arm.position.set(s * 0.17, 1.55, 0); arm.rotation.z = -s * 0.5; g.add(arm); const tip = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), m); tip.position.set(s * 0.3, 1.76, 0); g.add(tip); });
          const sig = new THREE.Mesh(new THREE.OctahedronGeometry(0.13), M(0xef4444, { emissive: 0x7f1d1d, emissiveIntensity: 0.6 })); sig.position.set(0, 1.95, 0); g.add(sig); P.sig = sig;
        } else if (P.type === 'gp') {
          const b = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 1.7, 18), m); g.add(b);
          const t = new THREE.Mesh(new THREE.SphereGeometry(0.24, 18, 10), m); t.position.y = 0.85; g.add(t); const bt = t.clone(); bt.position.y = -0.85; g.add(bt);
          const st = M(0xa21caf);
          [[-0.15, 0, 0.08], [0.12, 0.05, -0.1], [0.02, 0.02, 0.16]].forEach((o, i) => {
            const bx = o[0] * 1.2, bz = o[2] * 1.2; let px = bx, py = 1.1, pz = bz;
            for (let k = 0; k < 3 + (i % 2); k++) { hexBead(g, px, py, pz); px += (i - 1) * 0.1 + Math.sin(k * 2 + i) * 0.04; py += 0.17; pz += Math.cos(k + i) * 0.06; }
          });
          P.top = 1.5;
        } else { // 효소: 말초 단백질 (안쪽 표면에 붙음)
          const b = new THREE.Mesh(new THREE.SphereGeometry(0.45, 24, 16), m); b.scale.set(1.15, 0.72, 0.95); g.add(b);
          const pk = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 10), M(0x075985)); pk.position.set(0, -0.2, 0.3); g.add(pk);
        }
        g.position.set(P.x, P.type === 'en' ? -1.37 : 0, P.z);
      });

      /* ----- 인지질 ----- */
      const lip = [[], []];
      for (let L = 0; L < 2; L++) for (let iz = 0; iz < GZ; iz++) for (let ix = 0; ix < GX; ix++) {
        const x = (ix - (GX - 1) / 2) * SX + ((iz + L) % 2 ? SX / 2 : 0) - SX / 4, z = (iz - (GZ - 1) / 2) * SZ + (L ? 0.01 : 0);
        const o = { L, x, z, hx: x, hz: z, ph: [rnd() * 6.28, rnd() * 6.28, rnd() * 6.28, rnd() * 6.28], w: [0.8 + rnd() * 1.2, 1.5 + rnd() * 1.6], kink: rnd(), hidden: false, site: false, cx: x, cz: z };
        prots.forEach((P) => { if (P.integral && Math.hypot(x - P.x, z - P.z) < P.r + 0.12) o.hidden = true; });
        lip[L].push(o);
      }
      const all = lip[0].concat(lip[1]), NL = all.length;
      /* 콜레스테롤 자리 */
      const chol = [];
      for (let L = 0; L < 2; L++) {
        const cand = lip[L].filter((o) => !o.hidden).sort(() => rnd() - 0.5), got = [];
        cand.forEach((o) => { if (got.length < 10 && got.every((q) => Math.hypot(q.x - o.x, q.z - o.z) > 0.8)) { got.push(o); o.site = true; } });
        got.forEach((o) => { const g = new THREE.Group(); const dir = L ? -1 : 1; const cap = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.5, 4, 10), M(CHOLC, { roughness: 0.35 })); cap.position.y = dir * (YH - 0.42); g.add(cap); const hd = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8), M(0xf97316)); hd.position.y = dir * (YH - 0.06); g.add(hd); g.visible = false; root.add(g); chol.push({ o, g }); });
      }
      /* 당지질 (바깥쪽 인지질에 붙은 당 사슬) */
      const glyco = [];
      lip[0].filter((o) => !o.hidden && !o.site && o.z < 0.1).sort(() => rnd() - 0.5).slice(0, 5).forEach((o) => { const g = new THREE.Group(); root.add(g); hexBead(g, 0, 0.3, 0); hexBead(g, 0.1, 0.45, 0.03); hexBead(g, 0.03, 0.6, -0.02); glyco.push({ o, g }); });

      /* 인스턴스: 머리 · 꼬리 */
      const headMat = M(HEADC, { roughness: 0.35 }), tailMat = M(TAILC, { roughness: 0.55 });
      const heads = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 14, 10), headMat, NL);
      const tg = new THREE.CylinderGeometry(0.036, 0.03, 0.3, 6); tg.translate(0, -0.15, 0);
      const tails = new THREE.InstancedMesh(tg, tailMat, NL * 4);
      heads.frustumCulled = false; tails.frustumCulled = false; root.add(heads, tails);
      const dm = new THREE.Matrix4(), m1 = new THREE.Matrix4(), m2 = new THREE.Matrix4(), q = new THREE.Quaternion(), qe = new THREE.Euler(), vp = new THREE.Vector3(), vs = new THREE.Vector3(1, 1, 1), zero = new THREE.Matrix4().makeScale(0, 0, 0);
      const flipQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI);

      /* ----- 상태 ----- */
      let Tc = 37, U = 40, hasChol = false, cut = true, names = true, M01 = 1, camGo = 1.3, swapAcc = 0, uMax = 0.4;
      const curKinkMax = () => U / 100;
      function syncM() { M01 = fluidOf(Tc, U, hasChol); }
      function swapOne() {
        const L = rnd() < 0.5 ? 0 : 1, arr = lip[L].filter((o) => !o.hidden && !o.site);
        for (let tries = 0; tries < 8; tries++) {
          const a = arr[(rnd() * arr.length) | 0], cand = arr.filter((b) => b !== a && Math.hypot(b.x - a.x, b.z - a.z) < 0.5 && (b.z > 0) === (a.z > 0));
          if (!cand.length) continue; const b = cand[(rnd() * cand.length) | 0];
          const ax = a.x, az = a.z; a.x = b.x; a.z = b.z; b.x = ax; b.z = az; return;
        }
      }

      /* ----- 이름표 ----- */
      const A = (x, y, z) => { const o = new THREE.Object3D(); o.position.set(x, y, z); root.add(o); return o; };
      const labs = [];
      const L = (t, a, c, off) => { const l = label(t, a, { color: c, size: PHONE ? 11.5 : 12.5, offset: off || [0, 0, 0] }); labs.push(l); return l; };
      const aOut = A(2.2, 2.0, 0), aIn = A(-2.1, -1.8, 0);
      const outL = L('세포 밖 (바깥쪽)', aOut, 'rgba(29,78,216,.93)'), inL = L('세포 안 (세포질)', aIn, 'rgba(146,64,14,.93)');
      const aHead = A(2.0, YH + 0.18, -0.2), aTail = A(2.0, 0.42, -0.2);
      const headL = L('인지질 머리 (친수성)', aHead, 'rgba(37,99,235,.93)', [0, 0.18, 0]), tailL = L('꼬리 (소수성)', aTail, 'rgba(180,83,9,.93)');
      const pL = {};
      prots.forEach((P) => { pL[P.type] = L(P.name + (P.type === 'en' ? ' (말초)' : ''), P.g, 'rgba(' + [(PCOL[P.type] >> 16) & 255, (PCOL[P.type] >> 8) & 255, PCOL[P.type] & 255].join(',') + ',.93)', [0, P.type === 'en' ? -0.75 : P.type === 'ca' ? -1.35 : (P.type === 're' ? 2.25 : P.type === 'gp' ? 1.15 : 1.3), 0]); });
      const sugL = L('당 사슬 (바깥쪽에만)', A(-0.7, 2.35, -1.45), 'rgba(161,98,7,.93)');
      const cholL = L('콜레스테롤', chol.length ? chol[0].g : root, 'rgba(161,98,7,.93)', [0.35, 0.1, 0.25]);

      /* ----- 정보 · 조작 ----- */
      function refresh() {
        syncM(); const pct = Math.round(M01 * 100);
        info('<div style="max-width:' + (PHONE ? 205 : 235) + 'px"><b>유동 모자이크</b> · 유동성 <b>' + pct + ' %</b><br>머리(파랑, 친수성)는 바깥쪽, 꼬리(주황, 소수성)는 안쪽에 모인 <b>이중층</b><br>통합 단백질은 박혀 있고, 말초 단백질은 표면에 붙어 있어요.</div>');
        labs.forEach((l) => l.show(names)); cholL.show(names && hasChol && chol.length > 0);
      }
      const tR = controls.range('온도', 1, 37, 1, Tc, (v) => { Tc = v; refresh(); }, (v) => v + ' °C');
      const uR = controls.range('불포화', 0, 100, 10, U, (v) => { U = v; refresh(); }, (v) => v + ' %');
      const cB = controls.button('🧈 콜레스테롤', () => { hasChol = !hasChol; cB.classList.toggle('on', hasChol); chol.forEach((c) => { c.g.visible = hasChol; }); refresh(); });
      const xB = controls.button('✂ 단면', () => { cut = !cut; xB.classList.toggle('on', cut); allMats.forEach((m) => { m.clippingPlanes = cut ? [plane] : null; m.needsUpdate = true; }); if (cut) camGo = 1.3; refresh(); }); xB.classList.toggle('on', cut);
      const nB = controls.button('🏷 이름표', () => { names = !names; nB.classList.toggle('on', names); refresh(); }); nB.classList.toggle('on', names);
      allMats.forEach((m) => { m.clippingPlanes = [plane]; });
      function lessonFx() { try { const f = window.__sim && window.__sim.S && window.__sim.S.fx; if (f && typeof f.T === 'number') return f; } catch (e) {} return null; }
      function fromLesson() {
        const f = lessonFx(); if (!f) return;
        Tc = Math.max(1, Math.min(37, f.T)); U = Math.max(0, Math.min(100, f.u)); tR.set(Tc); uR.set(U);
        if (!!f.chol !== hasChol) cB.click();
      }
      cB.classList.toggle('on', hasChol);
      fromLesson(); refresh();

      const ap = (a, b, dt, r) => a + (b - a) * (1 - Math.exp(-r * dt));
      let tPrev = 0;
      return {
        update(dt, t) {
          if (camGo > 0 && cut) { camGo -= dt; orbit.theta += (0.18 - orbit.theta) * Math.min(1, dt * 3); orbit.phi += (1.3 - orbit.phi) * Math.min(1, dt * 3); }
          syncM(); const m = M01;
          // 옆으로 자리 바꾸기
          swapAcc += dt * (0.4 + 7 * m); while (swapAcc > 1) { swapAcc -= 1; swapOne(); }
          const ax = 0.012 + 0.055 * m, az = 0.01 + 0.03 * m, sw = 0.02 + 0.085 * m;
          prots.forEach((P, i) => { // 단백질도 천천히 떠다녀요 (자르는 면 위에서 옆으로만)
            P.g.position.x = P.x + Math.sin(t * 0.5 + i * 1.7) * 0.1 * (0.15 + m); if (P.type !== 'en') P.g.position.z = P.z;
            P.g.position.z = P.z + (P.type === 'en' || P.type === 'gp' ? Math.cos(t * 0.4 + i) * 0.08 * (0.15 + m) : 0);
          });
          ions.forEach((s) => { const p = (t * 0.22 + s.ph) % 1; s.m.position.set(Math.sin(p * 9 + s.ph * 6) * 0.05, 1.5 - 3.0 * p, Math.cos(p * 7 + s.ph * 5) * 0.05); });
          if (cargo.m) { const p = (t * 0.2) % 1, e = Math.min(1, p / 0.8); cargo.m.position.set(0.0, 1.4 - 2.8 * e + (p > 0.8 ? 0 : 0), 0.3); cargo.m.visible = p < 0.8; }
          prots.forEach((P) => { if (P.sig) { P.sig.position.y = 1.95 + Math.sin(t * 2) * 0.06; P.sig.rotation.y = t; } });
          // 인지질
          const kmax = curKinkMax(), px = prots.filter((P) => P.integral).map((P) => [P.g.position.x, P.g.position.z, P.r + 0.2]);
          all.forEach((o, i) => {
            const dir = o.L ? -1 : 1;
            o.hx = ap(o.hx, o.x, dt, 5); o.hz = ap(o.hz, o.z, dt, 5);
            const hid = o.hidden || (hasChol && o.site);
            if (hid) { heads.setMatrixAt(i, zero); for (let k = 0; k < 4; k++) tails.setMatrixAt(i * 4 + k, zero); o.cx = o.hx; o.cz = o.hz; return; }
            let x = o.hx + ax * (Math.sin(t * o.w[0] + o.ph[0]) + 0.5 * Math.sin(t * o.w[1] + o.ph[1])), z = o.hz + az * (Math.sin(t * o.w[1] + o.ph[2]) + 0.5 * Math.sin(t * o.w[0] + o.ph[3]));
            for (let k = 0; k < px.length; k++) { const dx = x - px[k][0], dz = z - px[k][1], d = Math.hypot(dx, dz); if (d < px[k][2]) { const s = px[k][2] / (d || 0.01); x = px[k][0] + dx * s; z = px[k][1] + dz * s; } }
            o.cx = x; o.cz = z;
            const y = dir * YH + Math.sin(t * 1.3 + o.ph[0]) * 0.012 * dir;
            dm.compose(vp.set(x, y, z), q.identity(), vs.set(0.17, 0.17, 0.17)); heads.setMatrixAt(i, dm);
            vs.set(1, 1, 1);
            for (let k = 0; k < 2; k++) {
              const side = k ? 1 : -1, kinked = k === 1 && o.kink < kmax;
              const rx = sw * Math.sin(t * o.w[0] * 1.3 + o.ph[k] + k) , rz = sw * Math.cos(t * o.w[1] * 1.1 + o.ph[k + 1]);
              q.setFromEuler(qe.set(rx, 0, rz)); if (dir < 0) q.premultiply(flipQ);
              m1.compose(vp.set(x + side * 0.075, y - dir * 0.12, z), q, vs);
              tails.setMatrixAt(i * 4 + k * 2, m1);
              const kk = kinked ? 0.6 : 0.03 * Math.sin(t * 2 + o.ph[2]);
              q.setFromEuler(qe.set(kinked ? 0.25 : 0, 0, kk));
              m2.compose(vp.set(0, -0.3, 0), q, vs); m2.premultiply(m1);
              tails.setMatrixAt(i * 4 + k * 2 + 1, m2);
            }
          });
          heads.instanceMatrix.needsUpdate = true; tails.instanceMatrix.needsUpdate = true;
          chol.forEach((c) => { if (c.g.visible) c.g.position.set(c.o.cx, 0, c.o.cz); });
          glyco.forEach((c) => c.g.position.set(c.o.cx, YH + 0.1, c.o.cz));
        },
        sync() { fromLesson(); refresh(); },
      };
    },
  });
})();
