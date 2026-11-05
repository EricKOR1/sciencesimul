/* hb-immunity · 3D 면역 세포의 작용 (식균 작용 · 항체(체액성 면역) · 세포독성 T 림프구(세포성 면역))
   선천적 면역은 식세포가 병원체를 삼켜 분해하고, 후천적 면역은 특정 항원에 맞춰 항체나 T 림프구가 작용해요.
   2D 차시의 장면(선천적 방어의 식균 작용 / 림프구의 🩸 혈액 속 세균 → 체액성 면역 · 🦠 세포 안 바이러스 → 세포성 면역)을 따라가고, 단계 이름도 2D와 같이 보여 줘요. 각 방식마다 ▶ 재생이 있어요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const narrow = window.innerWidth < 600 || window.innerHeight > window.innerWidth * 1.1;
  function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  const MODES = {
    phago: { name: '식균 작용 (선천적)', info: '<b>식균 작용</b>: 식세포가 병원체를 삼켜 분해해요.<br>병원체의 종류와 상관없이 빠르게 일어나는 선천적 면역이에요.', T: 9 },
    ab: { name: '항체 (체액성 면역)', info: '<b>체액성 면역</b>: 형질 세포가 만든 <b>항체</b>가 항원에만 결합해 병원체를 무력화해요.<br>(항원-항체 반응의 특이성)', T: 13 },
    tc: { name: '세포독성 T 림프구 (세포성 면역)', info: '<b>세포성 면역</b>: 세포독성 T 림프구가 병원체에 감염된 세포를 직접 찾아 제거해요.', T: 11 },
  };

  window.SciSim3D.attach({
    title: '면역 세포의 작용 3D',
    hint: '방식을 골라 보세요 · 드래그: 돌리기',
    camera: { dist: narrow ? 12.5 : 8.8, theta: 0.3, phi: 1.2, min: 5, max: 20 },
    autoRotate: 0.08,
    levels: [0, 1],
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const V = THREE.Vector3, V3 = (x, y, z) => new V(x, y, z || 0);
      const std = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.45, metalness: 0.03 }, o || {}));
      const ghost = (c, op, o) => std(c, Object.assign({ transparent: true, opacity: op, depthWrite: false, roughness: 0.2 }, o || {}));
      const sph = (r, m, x, y, z, sx, sy, sz) => { const o = new THREE.Mesh(new THREE.SphereGeometry(r, 28, 20), m); o.position.set(x || 0, y || 0, z || 0); if (sx) o.scale.set(sx, sy, sz); return o; };
      const R = rng(33), D = new THREE.Object3D(), ease = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
      const lerpV = (a, b, t) => a.clone().lerp(b, t);
      const bumpy = (geo, amp, f) => { const p = geo.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), n = 1 + amp * (Math.sin(f * x + 1) * Math.sin(f * y + 2) * Math.sin(f * z + 3)); p.setXYZ(i, x * n, y * n, z * n); } geo.computeVertexNormals(); return geo; };
      /* 병합 도우미 (Y 항체 한 덩어리) */
      function merged(parts) {
        const pos = [], nor = [], col = [], idx = []; let off = 0;
        parts.forEach(([geo, mat, color]) => { const g = geo.clone().applyMatrix4(mat); const c = new THREE.Color(color), p = g.attributes.position, n = g.attributes.normal; for (let i = 0; i < p.count; i++) { pos.push(p.getX(i), p.getY(i), p.getZ(i)); nor.push(n.getX(i), n.getY(i), n.getZ(i)); col.push(c.r, c.g, c.b); } g.index.array.forEach((k) => idx.push(k + off)); off += p.count; });
        const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); return g;
      }
      function yGeo(s) {
        const M = (x, y, z, rx, ry, rz) => new THREE.Matrix4().compose(V3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx || 0, ry || 0, rz || 0)), V3(1, 1, 1));
        const cyl = (r, h) => new THREE.CylinderGeometry(r, r, h, 10), tip = new THREE.SphereGeometry(0.1 * s, 10, 8);
        const L1 = 0.5 * s, L2 = 0.55 * s, ang = 0.62;
        const parts = [[cyl(0.065 * s, L1), M(0, L1 / 2, 0), 0x3ec6ff]];
        [-1, 1].forEach((sd) => { const dx = Math.sin(ang) * L2, dy = Math.cos(ang) * L2; parts.push([cyl(0.065 * s, L2), M(sd * dx / 2, L1 + dy / 2, 0, 0, 0, -sd * ang), 0x3ec6ff]); parts.push([tip, M(sd * dx, L1 + dy, 0), 0xffd34d]); });
        parts.push([new THREE.SphereGeometry(0.075 * s, 10, 8), M(0, 0, 0), 0x3ec6ff]);
        return merged(parts);
      }
      const yG = yGeo(1.0);
      const yMat = std(0xffffff, { vertexColors: true, roughness: 0.35 });

      const groups = {}, labs = {};
      const mkG = (k) => { const g = new THREE.Group(); g.visible = false; root.add(g); groups[k] = g; labs[k] = []; return g; };
      const lab = (k, text, obj, o) => { const l = label(text, obj, o); l.show(false); labs[k].push(l); return l; };
      const upd = {};
      /* ---------- 혈관 속 환경: 혈관 벽 + 흐르는 적혈구 ---------- */
      const rbcFlow = (function () {
        const c = document.createElement('canvas'); c.width = 512; c.height = 256; const x = c.getContext('2d');
        x.fillStyle = '#5a2a3c'; x.fillRect(0, 0, 512, 256);
        const r = rng(5); for (let i = 0; i < 70; i++) { const px = r() * 512, py = r() * 256, rx = 28 + r() * 22, ry = 14 + r() * 10; const gr = x.createRadialGradient(px, py, 2, px, py, rx); gr.addColorStop(0, 'rgba(150,70,95,.55)'); gr.addColorStop(1, 'rgba(60,24,40,0)'); x.fillStyle = gr; x.beginPath(); x.ellipse(px, py, rx, ry, 0, 0, 7); x.fill(); x.strokeStyle = 'rgba(30,10,20,.35)'; x.lineWidth = 1.5; x.stroke(); }
        const tex = new THREE.CanvasTexture(c); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(7, 3);
        const wall = new THREE.Mesh(new THREE.CylinderGeometry(24, 24, 90, 48, 1, true), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7, side: THREE.BackSide, color: 0x8f6275 })); wall.rotation.z = Math.PI / 2; root.add(wall);
        const lathe = new THREE.LatheGeometry([[0.0, 0.14], [0.35, 0.2], [0.7, 0.16], [0.95, 0.1], [1.0, 0.0], [0.95, -0.1], [0.7, -0.16], [0.35, -0.2], [0.0, -0.14]].map((q) => new THREE.Vector2(q[0], q[1])), 22);
        const N = 46, im = new THREE.InstancedMesh(lathe, std(0xd33d3d, { roughness: 0.45, side: THREE.DoubleSide }), N); im.frustumCulled = false; root.add(im);
        const P = Array.from({ length: N }, () => { const a = R() * 6.283, rr = 6 + R() * 14; return { x: (R() - 0.5) * 44, y: Math.cos(a) * rr, z: Math.sin(a) * rr, rx: R() * 6, ry: R() * 6, sp: 0.5 + R() * 0.5, tx: (R() - 0.5), ty: (R() - 0.5) }; });
        const dm = new THREE.Object3D();
        return (dt, t) => { P.forEach((q, i) => { q.x += dt * q.sp; if (q.x > 22) q.x -= 44; dm.position.set(q.x, q.y + Math.sin(t * 0.6 + i) * 0.15, q.z); dm.rotation.set(q.rx + t * q.tx, q.ry + t * q.ty, 0); dm.scale.setScalar(0.75); dm.updateMatrix(); im.setMatrixAt(i, dm.matrix); }); im.instanceMatrix.needsUpdate = true; };
      })();

      /* ---------- 식균 작용 ---------- */
      { const g = mkG('phago');
        const mac = new THREE.Mesh(bumpy(new THREE.SphereGeometry(1.7, 72, 52), 0.07, 2.6), ghost(0xffae3d, 0.62, { roughness: 0.3 })); g.add(mac);
        const nuc = sph(0.55, std(0x8a5cc0), 0.9, 0.7, -0.3, 1.3, 0.8, 0.9); nuc.rotation.z = 0.5; g.add(nuc);
        const lyM = std(0xff8a3d, { emissive: 0x7a3000, emissiveIntensity: 0.4 }), lys = [];
        for (let i = 0; i < 7; i++) { const a = i * 0.9, l = sph(0.17, lyM, Math.cos(a) * 1.0 + 0.3, Math.sin(a * 1.7) * 0.9 - 0.2, Math.sin(a) * 0.9); l.userData.home = l.position.clone(); g.add(l); lys.push(l); }
        const bm = std(0x4bb86a, { roughness: 0.4 });
        const mkB = () => { const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.5, 6, 14), bm); b.rotation.z = Math.PI / 2; const w = new THREE.Group(); w.add(b); g.add(w); return w; };
        const B0 = mkB(), others = [mkB(), mkB(), mkB()]; others[0].position.set(3.0, 1.4, 0.6); others[1].position.set(3.4, -1.2, -0.5); others[2].position.set(2.2, -2.2, 0.8);
        const pg = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 20), ghost(0xffffff, 0.3, { roughness: 0.1 })); pg.visible = false; g.add(pg);
        lab('phago', '식세포', mac, { offset: [0.6, 1.9, 0] }); const lB = lab('phago', '세균', B0, { offset: [0, 0.6, 0] }); lab('phago', '리소좀', lys[0], { offset: [0, 0.4, 0] });
        const S = V3(-1.5, 0.35, 0.3), IN = V3(-0.3, -0.1, 0.1), START = V3(-4.3, 0.9, 0.9);
        upd.phago = (c, dt, t) => {
          let p, sc = 1, pgS = 0, shrink = 1;
          if (c < 2.2) p = lerpV(START, S, ease(c / 2.2));
          else if (c < 3.4) { p = lerpV(S, IN, ease((c - 2.2) / 1.2)); pgS = ease((c - 2.4) / 1.0) * 0.62; }
          else { p = IN.clone(); pgS = 0.62; if (c > 5.2) { const k = ease((c - 5.2) / 1.8); shrink = 1 - k; pgS = 0.62 * (1 - k * 0.6); } }
          B0.position.copy(p); B0.scale.setScalar(Math.max(0.01, shrink)); B0.rotation.z = c < 2.2 ? 0.4 : 0; B0.visible = shrink > 0.05;
          pg.visible = pgS > 0.01; pg.position.copy(IN).add(V3(0, 0, 0)); pg.position.copy(p); pg.scale.set(pgS * 1.5, pgS, pgS);
          lys.forEach((l, i) => { const k = c > 3.4 && i < 5 ? ease((c - 3.4 - i * 0.15) / 1.2) : 0; l.position.copy(lerpV(l.userData.home, p.clone().add(V3((i - 2) * 0.05, 0.1, 0)), k)); l.scale.setScalar(1 + (k > 0.95 ? 0.25 : 0)); l.visible = !(k >= 1 && c > 5.5); });
          mac.scale.setScalar(1 + (c > 2.2 && c < 3.6 ? 0.04 * Math.sin((c - 2.2) * 5) : 0));
          others.forEach((o, i) => { o.position.y += Math.sin(t * 0.9 + i * 2) * 0.002; o.rotation.z = Math.sin(t * 0.5 + i) * 0.4; });
          lB.set(c > 5.2 ? '분해되는 세균' : '세균');
        };
      }
      /* ---------- 항체 ---------- */
      { const g = mkG('ab'), PC = V3(-3.4, 0, 0), PA = V3(2.8, 0, 0);
        const cell = new THREE.Mesh(bumpy(new THREE.SphereGeometry(1.35, 56, 40), 0.04, 3), ghost(0xa68ae8, 0.45)); cell.position.copy(PC); g.add(cell);
        g.add(sph(0.5, std(0x5b3aa8), PC.x + 0.35, 0.25, 0.2));
        const erM = std(0xd8c9f7, { roughness: 0.5, side: THREE.DoubleSide }); for (let i = 0; i < 5; i++) { const t = new THREE.Mesh(new THREE.TorusGeometry(0.55 + i * 0.1, 0.05, 8, 30, Math.PI * 1.5), erM); t.position.set(PC.x - 0.35, -0.1, 0); t.rotation.set(1.2 + i * 0.5, 0.5 + i, i); g.add(t); }
        const path = sph(0.95, std(0xe5483f, { roughness: 0.4 }), PA.x, PA.y, PA.z); g.add(path);
        const dirs = []; for (let i = 0; i < 12; i++) { const y = 1 - (i + 0.5) * 2 / 12, r = Math.sqrt(1 - y * y), a = i * 2.39996; dirs.push(V3(Math.cos(a) * r, y, Math.sin(a) * r)); }
        const spM = std(0xffd34d, { roughness: 0.4 });
        dirs.forEach((d) => { const s = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.3, 4), spM); s.position.copy(PA).add(d.clone().multiplyScalar(1.1)); s.quaternion.setFromUnitVectors(V3(0, 1, 0), d); g.add(s); });
        const NA = 12, ab = new THREE.InstancedMesh(yG, yMat, NA); g.add(ab);
        const tmpQ = new THREE.Quaternion(), upV = V3(0, 1, 0);
        lab('ab', '형질 세포', cell, { offset: [0, 1.7, 0] }); lab('ab', '항체', cell, { offset: [2.6, 0.9, 0] }); const lPa = lab('ab', '병원체(항원 있음)', path, { offset: [0, -1.55, 0] });
        upd.ab = (c, dt, t) => {
          for (let i = 0; i < NA; i++) {
            const t0 = 0.6 + i * 0.35, k = (c - t0) / 3.2, d = dirs[i];
            const target = PA.clone().add(d.clone().multiplyScalar(1.4 + 0.1));
            const start = PC.clone().add(V3(1.3, (i % 3 - 1) * 0.35, (i % 4 - 1.5) * 0.3));
            if (k <= 0) { D.position.copy(PC); D.scale.setScalar(0.001); D.updateMatrix(); ab.setMatrixAt(i, D.matrix); continue; }
            const u = ease(k), pos = lerpV(start, target, u); pos.y += Math.sin(u * Math.PI) * (i % 2 ? 0.7 : -0.7);
            D.position.copy(pos); D.scale.setScalar(Math.min(1, k * 4));
            const q = tmpQ.setFromUnitVectors(upV, d.clone().multiplyScalar(-1)); const spin = new THREE.Quaternion().setFromAxisAngle(V3(0.3, 1, 0.5).normalize(), (1 - u) * (3 + i));
            D.quaternion.copy(spin).slerp(q, u); if (u >= 1) D.quaternion.copy(q);
            D.updateMatrix(); ab.setMatrixAt(i, D.matrix); D.quaternion.identity();
          }
          ab.instanceMatrix.needsUpdate = true;
          const done = c > 0.6 + 11 * 0.35 + 3.2;
          path.material.color.set(done ? 0x9a5a5a : 0xe5483f); path.scale.setScalar(done ? 0.92 : 1);
          lPa.set(done ? '항체가 결합한 병원체 (무력화)' : '병원체(항원 있음)');
        };
      }
      /* ---------- 세포독성 T 림프구 ---------- */
      { const g = mkG('tc'), IC = V3(1.5, 0, 0);
        const inf = new THREE.Mesh(bumpy(new THREE.SphereGeometry(1.55, 64, 46), 0.03, 3), ghost(0xf08aa6, 0.5)); inf.position.copy(IC); g.add(inf);
        const nuc = sph(0.55, std(0x9a4a72), IC.x + 0.3, 0.2, -0.3); g.add(nuc);
        const vm = std(0xe5483f, { emissive: 0x5a0a0a, emissiveIntensity: 0.4 }); for (let i = 0; i < 9; i++) { const a = i * 1.3; g.add(sph(0.11, vm, IC.x + Math.cos(a) * 0.7 - 0.1, Math.sin(a * 1.9) * 0.8, Math.sin(a) * 0.6 + 0.2)); }
        const agM = std(0xffd34d, { roughness: 0.4 });
        for (let i = 0; i < 14; i++) { const y = 1 - (i + 0.5) * 2 / 14, r = Math.sqrt(1 - y * y), a = i * 2.39996, d = V3(Math.cos(a) * r, y, Math.sin(a) * r); const s = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.22, 4), agM); s.position.copy(IC).add(d.clone().multiplyScalar(1.6)); s.quaternion.setFromUnitVectors(V3(0, 1, 0), d); g.add(s); }
        const T = new THREE.Group(); const tm = new THREE.Mesh(bumpy(new THREE.SphereGeometry(0.95, 48, 36), 0.04, 3), ghost(0x4dc2c2, 0.55)); T.add(tm); T.add(sph(0.52, std(0x1a7a85), 0.1, 0.05, 0));
        const grM = std(0xffb02e, { emissive: 0x7a4a00, emissiveIntensity: 0.5 }); for (let i = 0; i < 6; i++) { const a = i * 1.1; T.add(sph(0.1, grM, Math.cos(a) * 0.55 + 0.25, Math.sin(a * 1.5) * 0.4, Math.sin(a) * 0.55)); }
        g.add(T);
        const NG = 14, gr = new THREE.InstancedMesh(new THREE.SphereGeometry(0.07, 10, 8), grM, NG); g.add(gr);
        const bl = new THREE.InstancedMesh(new THREE.SphereGeometry(0.18, 12, 8), std(0xf08aa6, { transparent: true, opacity: 0.8 }), 16); g.add(bl);
        lab('tc', '세포독성 T 림프구', T, { offset: [0, 1.4, 0] }); const lI = lab('tc', '감염된 세포', inf, { offset: [0, 2.0, 0] });
        const T0 = V3(-4.4, 0.4, 0.2), T1 = V3(-0.6, 0.0, 0);
        upd.tc = (c, dt, t) => {
          const p = c < 2.4 ? lerpV(T0, T1, ease(c / 2.4)) : T1.clone(); T.position.copy(p); T.rotation.y = c * 0.2;
          // 과립 분비 (3.0 ~ 5.0)
          for (let i = 0; i < NG; i++) { const u = (c - 3.0 - i * 0.07) / 0.9, on = u > 0 && u < 1; D.position.copy(lerpV(T1.clone().add(V3(0.85, 0.05 * (i % 3 - 1), 0.15 * (i % 4 - 1.5))), IC.clone().add(V3(-1.3, (i % 5 - 2) * 0.12, (i % 3 - 1) * 0.15)), ease(u))); D.scale.setScalar(on ? 1 : 0.001); D.updateMatrix(); gr.setMatrixAt(i, D.matrix); }
          gr.instanceMatrix.needsUpdate = true;
          const die = ease((c - 5.2) / 2.2);
          inf.scale.setScalar(1 - die * 0.35); inf.material.opacity = 0.5 - die * 0.25; inf.material.color.set(die > 0.1 ? 0x9a9aa8 : 0xf08aa6); nuc.scale.setScalar(1 - die * 0.5);
          for (let i = 0; i < 16; i++) { const a = i * 2.4, k = die, rr = 1.3 * (1 - die * 0.3) + k * 1.2; D.position.set(IC.x + Math.cos(a) * rr * 0.8, Math.sin(a * 1.7) * rr * 0.7, Math.sin(a) * rr * 0.6); D.scale.setScalar(die > 0.15 ? 0.6 + 0.4 * Math.sin(i) * (1 - die * 0.6) : 0.001); D.updateMatrix(); bl.setMatrixAt(i, D.matrix); }
          bl.instanceMatrix.needsUpdate = true;
          lI.set(die > 0.5 ? '제거되는 감염 세포' : '감염된 세포');
        };
      }

      let mode = 'phago', clk = 0, seen2D = '', stageTxt = '';
      const show = (m) => { mode = m; clk = 0; if (typeof pls !== 'undefined') { Object.keys(pls).forEach((k) => { pls[k].row.style.display = k === m ? '' : 'none'; if (k === m) pls[k].pl.set(0); }); } Object.keys(groups).forEach((k) => { groups[k].visible = k === m; labs[k].forEach((l) => l.show(k === m)); }); info(MODES[m].info); };
      const seg = controls.segment('', Object.keys(MODES).map((k) => ({ label: MODES[k].name.replace(' (선천적)', '').replace(' (체액성 면역)', '').replace(' (세포성 면역)', ''), value: k })), 'phago', (m) => {
        const L = window.__sim; if (L) { if (m === 'phago') L.setScene('inn'); else { L.setScene('lym'); L.makeLym(m === 'tc' ? 'cell' : 'hum'); } seen2D = L.S.mode + (L.S.L ? L.S.L.kind : ''); }
        show(m);
      });
      const PH = { phago: [[0, '세균 접근'], [0.35, '삼킴'], [0.65, '분해']], ab: [[0, '항체 분비'], [0.3, '항원에 결합'], [0.59, '병원체 무력화']], tc: [[0, 'T 림프구 접근'], [0.4, '감염 세포에 결합'], [0.7, '감염 세포 제거']] };
      const pls = {};
      Object.keys(MODES).forEach((k) => { const pl = controls.player({ duration: MODES[k].T, loop: true, autoplay: true, label: '재생', phases: PH[k], onFrame(p) { if (k === mode) clk = p * MODES[k].T; } }); const ctlEl = document.querySelector('.v3-ctl'); pls[k] = { pl, row: ctlEl.lastElementChild }; pls[k].row.style.display = k === mode ? '' : 'none'; });
      show('phago');
      return {
        update(dt, t) {
          const L = window.__sim;
          if (L && L.S) {
            const key = L.S.mode + (L.S.L ? L.S.L.kind : '') + (L.S.L && L.S.mode === 'lym' ? L.S.L.stage : '');
            if (key !== seen2D) {
              const kmode = L.S.mode + (L.S.L ? L.S.L.kind : ''); const prev = seen2D.replace(/\d+$/, ''); seen2D = key;
              if (L.S.mode === 'inn' || L.S.mode === 'lym') { const m = L.S.mode === 'inn' ? 'phago' : (L.S.L && L.S.L.kind === 'cell' ? 'tc' : 'ab'); if (m !== mode) { seg.set(m); show(m); } }
              if (L.S.mode === 'lym' && L.S.L) { const st = L.STG[L.S.L.kind]; stageTxt = '<br>2D 단계 ' + (L.S.L.stage + 1) + ' / ' + st.st.length + ' · <b>' + st.st[Math.min(L.S.L.stage, st.st.length - 1)].t + '</b>: ' + st.st[Math.min(L.S.L.stage, st.st.length - 1)].c; } else stageTxt = '';
              info(MODES[mode].info + stageTxt);
            }
          }
          rbcFlow(Math.min(dt, 0.05), t); upd[mode](clk, dt, t);
        },
        sync() {},
      };
    },
  });
})();
