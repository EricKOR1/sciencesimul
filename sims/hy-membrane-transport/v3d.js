/* hy-membrane-transport · 3D 세포막 수송 (단순 확산 · 촉진 확산 · 능동 수송)
   인지질 이중층 단면과 입자를 보며 어떤 물질이 어떻게 막을 지나는지 알아봐요.
   - 단순 확산: 작은 비극성 분자(O₂)는 인지질 사이로 직접 통과, 이온 · 포도당은 통과 못 해요.
   - 촉진 확산: 통로 단백질(이온) · 운반 단백질(포도당)이 도와 줘요. 에너지는 쓰지 않고 농도가 높은 쪽 → 낮은 쪽.
   - 능동 수송: ATP를 써서 농도가 낮은 쪽 → 높은 쪽으로 이온을 옮겨요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const narrow = window.innerWidth < 600 || window.innerHeight > window.innerWidth * 1.1;
  const COL = { head: 0x60a5fa, tail: 0xfbbf24, o2: 0xfb7185, ion: 0xa78bfa, glu: 0xfb923c, pion: 0x34d399, ch: 0x8b5cf6, ca: 0x14b8a6, pump: 0xd946ef, atp: 0xfacc15 };
  const XB = 4.0, ZB = 2.4, YB = 3.7, BAND = 0.6;
  const MODE_OF = { diff: 'diff', carrier: 'chan', pump: 'pump', cyan: 'pump', root: 'pump' };

  window.SciSim3D.attach({
    title: '세포막 수송 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: narrow ? 12.5 : 9.5, theta: 0.3, phi: 1.36, target: [0, 0, 0], min: 5, max: 20 },
    autoRotate: 0,
    levels: [0, 1, 2],
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const V = THREE.Vector3;
      let mode = 'diff', atpOn = true;
      const std = (color, o) => new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.45, metalness: 0.05 }, o || {}));

      /* ---------- 인지질 이중층 (모드마다 단백질 자리를 비워요) ---------- */
      const SX = 0.5, NX = 17, NZ = 11;
      const headGeo = new THREE.SphereGeometry(0.2, 18, 14), tailGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.4, 8);
      const maxN = NX * NZ * 2;
      const heads = new THREE.InstancedMesh(headGeo, std(COL.head, { roughness: 0.35 }), maxN);
      const tails = new THREE.InstancedMesh(tailGeo, std(COL.tail, { roughness: 0.5 }), maxN * 2);
      root.add(heads, tails);
      const holes = { diff: [], chan: [[-1.8, 0, 0.62], [1.8, 0, 0.75]], pump: [[0, 0, 0.95]] };
      const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), S1 = new V(1, 1, 1), Pp = new V();
      function buildLipids() {
        let h = 0, t = 0;
        for (let i = 0; i < NX; i++) for (let k = 0; k < NZ; k++) {
          const x = (i - (NX - 1) / 2) * SX + ((k % 2) ? SX / 2 : 0), z = (k - (NZ - 1) / 2) * 0.46;
          if (Math.abs(x) > XB + 0.2) continue;
          if (holes[mode].some((o) => Math.hypot(x - o[0], z - o[1]) < o[2])) continue;
          for (let s = -1; s <= 1; s += 2) {
            const jx = Math.sin(i * 7.3 + k * 3.1 + s) * 0.04, jz = Math.cos(i * 5.1 + k * 2.3) * 0.04;
            M4.compose(Pp.set(x + jx, s * 0.44, z + jz), Q.identity(), S1); heads.setMatrixAt(h++, M4);
            for (const dx of [-0.07, 0.07]) { M4.compose(Pp.set(x + jx + dx, s * 0.2, z + jz), Q.identity(), S1); tails.setMatrixAt(t++, M4); }
          }
        }
        heads.count = h; tails.count = t;
        heads.instanceMatrix.needsUpdate = true; tails.instanceMatrix.needsUpdate = true;
      }

      /* ---------- 단백질 ---------- */
      function ring(r0, r1, h, mat) {
        const pts = [[r0, -h], [r1, -h], [r1, h], [r0, h], [r0, -h]].map((p) => new THREE.Vector2(p[0], p[1]));
        const m = new THREE.Mesh(new THREE.LatheGeometry(pts, 40), mat); m.material.side = THREE.DoubleSide; return m;
      }
      const chan = new THREE.Group(); chan.position.set(-1.8, 0, 0);
      const chMat = std(COL.ch, { roughness: 0.4 });
      chan.add(ring(0.2, 0.55, 0.62, chMat));
      [-1, 1].forEach((s) => { const c = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.13, 14, 40), chMat); c.rotation.x = Math.PI / 2; c.position.y = s * 0.62; chan.add(c); });
      root.add(chan);

      function twoLobe(color, sx, sy, sz, gap) {
        const g = new THREE.Group(), mat = std(color, { roughness: 0.38 });
        const L = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 20), mat), R = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 20), mat);
        [L, R].forEach((m) => { m.scale.set(sx, sy, sz); g.add(m); });
        g.userData = { L, R, gap, mat }; return g;
      }
      const car = twoLobe(COL.ca, 0.34, 0.68, 0.5, 0.3); car.position.set(1.8, 0, 0); root.add(car);
      const pump = twoLobe(COL.pump, 0.45, 0.78, 0.62, 0.36); pump.position.set(0, 0, 0); root.add(pump);
      function setLobes(g, open) {      // open: +1 바깥으로 열림, -1 안쪽으로 열림
        const u = g.userData, a = 0.34 * open;
        u.L.position.set(-u.gap, 0, 0); u.R.position.set(u.gap, 0, 0);
        u.L.rotation.z = a; u.R.rotation.z = -a;
        // 열린 쪽 틈을 넓히기 위해 위/아래로 살짝 벌려요
        u.L.position.x = -u.gap - 0.08 * open * 0; u.R.position.x = u.gap + 0 * open;
      }
      const pocketMat = std(0xffffff, { emissive: 0x334155, roughness: 0.5, transparent: true, opacity: 0.0 });

      /* ---------- 입자 ---------- */
      const gO2 = new THREE.SphereGeometry(0.16, 16, 12), gBig = new THREE.SphereGeometry(0.21, 18, 14);
      const parts = [];
      const matO2 = std(COL.o2, { roughness: 0.3, emissive: 0x331018 }), matIon = std(COL.ion, { emissive: 0x1a1230 }), matGlu = std(COL.glu, { emissive: 0x2a1405 }), matPion = std(COL.pion, { emissive: 0x08301f });
      const kindInfo = { o2: { geo: gO2, mat: matO2, free: true }, ion: { geo: gBig, mat: matIon }, glu: { geo: gBig, mat: matGlu }, pion: { geo: gBig, mat: matPion } };
      const pgrp = new THREE.Group(); root.add(pgrp);
      function addP(kind, up) {
        const k = kindInfo[kind], m = new THREE.Mesh(k.geo, k.mat), p = { kind, mesh: m, v: new V(), cap: false };
        const ang = Math.random() * 6.283;
        p.v.set(Math.cos(ang), (Math.random() - 0.5) * 2, Math.sin(ang)).setLength(0.9 + Math.random() * 0.5);
        m.position.set((Math.random() * 2 - 1) * (XB - 0.3), (up ? 1 : -1) * (BAND + 0.3 + Math.random() * (YB - BAND - 0.6)), (Math.random() * 2 - 1) * (ZB - 0.3));
        pgrp.add(m); parts.push(p); return p;
      }
      function clearP() { parts.forEach((p) => pgrp.remove(p.mesh)); parts.length = 0; }
      const car_ = { st: 'out', t: 0, cargo: null, idle: 2, open: 1 };
      const pm_ = { st: 'in', t: 0, cargo: null, open: -1, atp: null, pi: null };

      /* ATP · ADP · Pi 표시 */
      const atpMat = std(COL.atp, { emissive: 0x7a5a00, roughness: 0.35 }), adpMat = std(0xfb923c, { emissive: 0x3a1a00 }), piMat = std(0xf472b6, { emissive: 0x4a0f2a });
      const atpMesh = new THREE.Group();
      { const a = new THREE.Mesh(new THREE.SphereGeometry(0.2, 18, 14), atpMat); atpMesh.add(a);
        for (let i = 0; i < 3; i++) { const q = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10), piMat); q.position.set(0.28 + i * 0.2, 0, 0); atpMesh.add(q); } }
      atpMesh.userData.tailParts = atpMesh.children.slice(1);
      root.add(atpMesh);
      const piMesh = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 10), piMat); root.add(piMesh);

      /* ---------- 이름표 ---------- */
      const out = new THREE.Object3D(); out.position.set(-XB + 0.2, 3.1, 0); root.add(out);
      const inn = new THREE.Object3D(); inn.position.set(-XB + 0.2, -3.1, 0); root.add(inn);
      const L_out = label('세포 밖', out, { color: '#7c5a10' }), L_in = label('세포 안', inn, { color: '#7c5a10' });
      const lp1 = new THREE.Object3D(), lp2 = new THREE.Object3D(); root.add(lp1, lp2);
      const L_ch = label('통로 단백질', lp1, { color: '#5b3bb0' }), L_ca = label('운반 단백질', lp2, { color: '#0f766e' });
      const L_pump = label('펌프', lp1, { color: '#a21caf' }), L_lip = label('인지질 이중층', lp2, { color: '#1d4ed8' });

      function reset() {
        clearP(); heads.visible = tails.visible = true;
        const n = (kind, up, c) => { for (let i = 0; i < c; i++) addP(kind, up); };
        chan.visible = car.visible = mode === 'chan'; pump.visible = mode === 'pump';
        L_ch.show(mode === 'chan'); L_ca.show(mode === 'chan'); L_pump.show(mode === 'pump'); L_lip.show(mode === 'diff');
        lp1.position.set(mode === 'pump' ? 0 : -1.8, 1.0, 0); lp2.position.set(mode === 'chan' ? 1.8 : -2.4, mode === 'chan' ? 1.0 : 0.62, mode === 'chan' ? 0 : 1.5);
        car_.st = 'out'; car_.cargo = null; car_.idle = 2; pm_.st = 'in'; pm_.cargo = null; pm_.t = 0;
        if (mode === 'diff') { n('o2', true, 22); n('o2', false, 4); n('ion', true, 5); n('ion', false, 5); }
        else if (mode === 'chan') { n('ion', true, 14); n('ion', false, 3); n('glu', true, 12); n('glu', false, 3); }
        else { n('pion', false, 16); n('pion', true, 4); }
        setLobes(car, 1); setLobes(pump, -1); buildLipids(); text(); if (atpB) atpB.style.display = mode === 'pump' ? '' : 'none';
      }

      let infoT = 0;
      function count(kinds) { let a = 0, b = 0; parts.forEach((p) => { if (kinds.indexOf(p.kind) >= 0) { if (p.mesh.position.y > 0) a++; else b++; } }); return [a, b]; }
      function text() {
        let h;
        if (mode === 'diff') { const c = count(['o2']); h = '<b>단순 확산</b> · 작은 분자(<span style="color:#fb7185">●O₂</span>)는 인지질 사이로 통과해요. 이온·포도당(<span style="color:#a78bfa">●</span>)은 못 지나요.<br>O₂ 바깥 ' + c[0] + ' · 안 ' + c[1]; }
        else if (mode === 'chan') { const a = count(['ion']), b = count(['glu']); h = '<b>촉진 확산</b> · 통로(<span style="color:#a78bfa">●이온</span>), 운반 단백질(<span style="color:#fb923c">●포도당</span>)이 도와요. 에너지 없이 높은 쪽 → 낮은 쪽.<br>이온 ' + a[0] + ':' + a[1] + ' · 포도당 ' + b[0] + ':' + b[1] + ' (밖:안)'; }
        else { const c = count(['pion']); h = '<b>능동 수송</b> · 펌프가 <b>ATP</b>를 써서 이온(<span style="color:#34d399">●</span>)을 농도가 낮은 밖으로 밀어내요.<br>바깥 ' + c[0] + ' · 안 ' + c[1] + (atpOn ? '' : ' · ATP 없음 → 멈춤'); }
        info(h);
      }

      /* ---------- 움직임 ---------- */
      const chanAx = new V(-1.8, 0, 0);
      function step(p, dt) {
        const m = p.mesh, pos = m.position;
        if (p.cap) return;
        p.v.x += (Math.random() - 0.5) * 7 * dt; p.v.y += (Math.random() - 0.5) * 7 * dt; p.v.z += (Math.random() - 0.5) * 7 * dt;
        p.v.setLength(Math.max(0.7, Math.min(1.5, p.v.length())));
        const nx = pos.x + p.v.x * dt, ny = pos.y + p.v.y * dt, nz = pos.z + p.v.z * dt;
        let x = nx, y = ny, z = nz;
        if (x > XB) { x = XB; p.v.x *= -1; } else if (x < -XB) { x = -XB; p.v.x *= -1; }
        if (z > ZB) { z = ZB; p.v.z *= -1; } else if (z < -ZB) { z = -ZB; p.v.z *= -1; }
        if (y > YB) { y = YB; p.v.y *= -1; } else if (y < -YB) { y = -YB; p.v.y *= -1; }
        if (!kindInfo[p.kind].free) {
          const inBand = Math.abs(pos.y) < BAND;
          if (!inBand && Math.abs(y) < BAND) {
            let ok = false;
            if (mode === 'chan' && p.kind === 'ion' && Math.hypot(x - chanAx.x, z) < 0.22) ok = true;
            if (!ok) { y = pos.y; p.v.y *= -1; }
          } else if (inBand) {           // 통로 안에서는 가운데로 모아요
            x = chanAx.x + Math.max(-0.18, Math.min(0.18, x - chanAx.x)); z = Math.max(-0.18, Math.min(0.18, z));
            p.v.x *= 0.5; p.v.z *= 0.5;
          }
        }
        pos.set(x, y, z);
      }
      const tmp = new V();
      function toward(p, tx, ty, tz, k) { p.mesh.position.lerp(tmp.set(tx, ty, tz), k); }

      function carrierStep(dt) {
        const c = car_, cx = car.position.x;
        c.t += dt;
        if (c.st === 'out' || c.st === 'in') {
          const up = c.st === 'out'; c.open = up ? 1 : -1;
          if (!c.cargo) {
            for (const p of parts) {
              if (p.kind !== 'glu' || p.cap) continue;
              const pp = p.mesh.position;
              if ((up ? pp.y > 0.45 && pp.y < 1.4 : pp.y < -0.45 && pp.y > -1.4) && Math.hypot(pp.x - cx, pp.z) < 0.55) { c.cargo = p; p.cap = true; c.st = up ? 'grab-out' : 'grab-in'; c.t = 0; break; }
            }
            c.idle -= dt;
            if (!c.cargo && c.idle <= 0) { c.st = up ? 'flip-in' : 'flip-out'; c.t = 0; c.idle = 2 + Math.random() * 2; }
          }
        } else if (c.st === 'grab-out' || c.st === 'grab-in') {
          const up = c.st === 'grab-out', k = Math.min(1, c.t / 0.35);
          toward(c.cargo, cx, up ? 0.3 : -0.3, 0, 0.25);
          if (k >= 1) { c.st = up ? 'flip-in-load' : 'flip-out-load'; c.t = 0; }
        } else if (c.st === 'flip-in-load' || c.st === 'flip-out-load' || c.st === 'flip-in' || c.st === 'flip-out') {
          const toIn = c.st.indexOf('in') >= 0, k = Math.min(1, c.t / 0.9), e = k * k * (3 - 2 * k);
          c.open = toIn ? 1 - 2 * e : -1 + 2 * e;
          if (c.cargo) c.cargo.mesh.position.set(cx, 0.3 * c.open, 0);
          if (k >= 1) {
            if (c.cargo) { c.cargo.cap = false; c.cargo.v.set((Math.random() - 0.5) * 0.4, (toIn ? -1 : 1) * 1.3, (Math.random() - 0.5) * 0.4); c.cargo.mesh.position.y += (toIn ? -1 : 1) * 0.35; c.cargo = null; }
            c.st = toIn ? 'in' : 'out'; c.idle = 1.5 + Math.random() * 1.5;
          }
        }
        setLobes(car, c.open);
      }

      function pumpStep(dt) {
        const c = pm_, px = pump.position.x;
        c.t += dt;
        atpMesh.visible = atpOn && (c.st === 'in' || c.st === 'grab' || c.st === 'phos');
        atpMesh.position.set(px + 0.55, -1.05, 0.2);
        atpMesh.userData.tailParts.forEach((q, i) => { q.visible = c.st !== 'phos' || c.t < 0.4 + i * 0.05; });
        atpMat.color.setHex(c.st === 'phos' && c.t > 0.4 ? 0xfb923c : COL.atp);
        piMesh.visible = c.st === 'phos' && c.t > 0.4;
        if (piMesh.visible) piMesh.position.set(px + 1.1 + (c.t - 0.4) * 1.2, -1.1 - (c.t - 0.4) * 0.6, 0.2);
        if (c.st === 'in') {
          c.open = -1;
          if (atpOn && !c.cargo) for (const p of parts) {
            const pp = p.mesh.position;
            if (p.kind === 'pion' && !p.cap && pp.y < -0.45 && pp.y > -1.8 && Math.hypot(pp.x - px, pp.z) < 0.9) { c.cargo = p; p.cap = true; c.st = 'grab'; c.t = 0; break; }
          }
        } else if (c.st === 'grab') {
          toward(c.cargo, px, -0.32, 0, 0.2);
          if (c.t > 0.4) { c.st = 'phos'; c.t = 0; }
        } else if (c.st === 'phos') {
          c.cargo.mesh.position.set(px, -0.32, 0);
          if (c.t > 1.1) { c.st = 'flip-out'; c.t = 0; }
        } else if (c.st === 'flip-out') {
          const k = Math.min(1, c.t / 1.0), e = k * k * (3 - 2 * k);
          c.open = -1 + 2 * e; c.cargo.mesh.position.set(px, -0.32 + 0.64 * e, 0);
          if (k >= 1) { c.cargo.cap = false; c.cargo.v.set((Math.random() - 0.5) * 0.4, 1.4, (Math.random() - 0.5) * 0.4); c.cargo.mesh.position.y = 0.8; c.cargo = null; c.st = 'back'; c.t = 0; }
        } else if (c.st === 'back') {
          const k = Math.min(1, c.t / 0.9), e = k * k * (3 - 2 * k);
          c.open = 1 - 2 * e;
          if (k >= 1) { c.st = 'in'; c.t = 0; }
        }
        setLobes(pump, c.open);
      }

      let atpB = null;
      reset();
      const seg = controls.segment('수송', [{ value: 'diff', label: '단순 확산' }, { value: 'chan', label: '촉진 확산' }, { value: 'pump', label: '능동 수송' }], mode, (v) => { mode = v; reset(); });
      atpB = controls.button('ATP 공급: 켜짐', () => { atpOn = !atpOn; atpB.textContent = 'ATP 공급: ' + (atpOn ? '켜짐' : '꺼짐'); atpB.classList.toggle('on', atpOn); text(); });
      atpB.classList.add('on'); atpB.style.display = mode === 'pump' ? '' : 'none';

      let lastSim = null;
      return {
        update(dt, t) {
          dt = Math.min(dt, 0.05);
          const sm = window.__sim && window.__sim.S && window.__sim.S.mode;
          if (sm && sm !== lastSim) { lastSim = sm; const m2 = MODE_OF[sm]; if (m2 && m2 !== mode) { mode = m2; seg.set(mode); reset(); } }
          parts.forEach((p) => step(p, dt));
          if (mode === 'chan') carrierStep(dt);
          if (mode === 'pump') pumpStep(dt);
          infoT += dt; if (infoT > 0.5) { infoT = 0; text(); }
        },
        sync() { text(); },
      };
    },
  });
})();
