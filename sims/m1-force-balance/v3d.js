/* m1-force-balance · 3D 두 힘의 합력과 힘의 평형
   한 물체에 나란한 두 힘이 작용하면 같은 방향은 더하고, 반대 방향은 큰 힘 − 작은 힘이 합력이에요.
   두 힘이 <b>크기가 같고, 방향이 반대이고, 같은 작용선</b> 위에 있어야 물체가 그대로 있어요(힘의 평형). 작용선이 어긋나면 물체가 돌아요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHN0 = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  window.SciSim3D.attach({
    title: '합력과 힘의 평형 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    levels: [1, 2],
    camera: { dist: 9.5 * (PHN0 ? 1.05 : 1), theta: 0.3, phi: 1.12, fov: 45, target: [0, 0.2, 0], min: 6, max: 28 },
    autoRotate: 0,
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      /* ---------- 공통 도구 ---------- */
      const PHN = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
      const V3 = THREE.Vector3, Yax = new V3(0, 1, 0);
      const mat = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.5, metalness: 0.05 }, o || {}));
      const glass = (c, op, o) => mat(c || 0xbfe3ff, Object.assign({ transparent: true, opacity: op || 0.16, roughness: 0.12, metalness: 0, depthWrite: false, side: THREE.DoubleSide }, o || {}));
      const rnd = (() => { let s = 12345; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; })();
      const _m = new THREE.Matrix4(), _c = new THREE.Color();
      function spheres(N, r, color, seg) {
        const m = new THREE.InstancedMesh(new THREE.SphereGeometry(r, seg || 16, Math.round((seg || 16) * 0.75)), mat(color, { roughness: 0.55, metalness: 0 }), N);
        m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.frustumCulled = false; m.castShadow = true;
        for (let i = 0; i < N; i++) m.setColorAt(i, _c.set(0xffffff));
        root.add(m); return m;
      }
      function put(m, i, x, y, z, s) { s = s === undefined ? 1 : s; _m.makeScale(s, s, s); _m.setPosition(x, y, z); m.setMatrixAt(i, _m); }
      function tint(m, i, hex) { m.setColorAt(i, _c.set(hex)); }
      function flush(m) { m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; }
      function tubeMesh(pts, r, color, o) {
        const curve = new THREE.CatmullRomCurve3(pts.map((p) => new V3(p[0], p[1], p[2])));
        return new THREE.Mesh(new THREE.TubeGeometry(curve, Math.max(8, pts.length * 10), r, 10, false), mat(color, o));
      }
      function mkArrow(col, rad) {
        const g = new THREE.Group(), m = mat(col, { roughness: 0.4 });
        const sh = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, 1, 12), m), hd = new THREE.Mesh(new THREE.ConeGeometry(rad * 2.4, rad * 6, 16), m);
        g.add(sh, hd); g.userData = { sh, hd, rad }; return g;
      }
      function setArrow(g, a, b) {
        const d = new V3().subVectors(b, a), len = d.length(); const { sh, hd, rad } = g.userData;
        if (len < 1e-3) { g.visible = false; return; }
        g.visible = true; const hl = Math.min(len * 0.5, rad * 6);
        sh.scale.y = Math.max(0.001, len - hl); sh.position.y = (len - hl) / 2;
        hd.scale.y = hl / (rad * 6); hd.position.y = len - hl / 2;
        g.position.copy(a); g.quaternion.setFromUnitVectors(Yax, d.normalize());
      }
      function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); if (THREE.sRGBEncoding) t.encoding = THREE.sRGBEncoding; return t; }
      /* 눈금이 있는 둥근 계기판 (0 ~ max, 270도) */
      function makeDial(R, max, unit, tickStep, labStep) {
        const g = new THREE.Group();
        const body = new THREE.Mesh(new THREE.CylinderGeometry(R, R, 0.34, 48), mat(0x8b95a7, { metalness: 0.6, roughness: 0.3 })); body.rotation.x = Math.PI / 2; g.add(body);
        const tex = canvasTex(256, 256, (c, w) => {
          c.fillStyle = '#f7f9fc'; c.beginPath(); c.arc(128, 128, 126, 0, 7); c.fill();
          c.strokeStyle = '#334155'; c.fillStyle = '#1f2937'; c.textAlign = 'center'; c.textBaseline = 'middle';
          for (let v = 0; v <= max + 1e-6; v += tickStep) {
            const a = (-225 + 270 * v / max) * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a), big = Math.abs(v / labStep - Math.round(v / labStep)) < 1e-6;
            c.lineWidth = big ? 5 : 2.5; c.beginPath(); c.moveTo(128 + ca * 104, 128 - sa * 104); c.lineTo(128 + ca * (big ? 84 : 92), 128 - sa * (big ? 84 : 92)); c.stroke();
            if (big) { c.font = '800 26px sans-serif'; c.fillText(String(Math.round(v * 10) / 10), 128 + ca * 62, 128 - sa * 62); }
          }
          c.font = '800 20px sans-serif'; c.fillStyle = '#2563eb'; c.fillText(unit, 128, 200);
        });
        const face = new THREE.Mesh(new THREE.CircleGeometry(R * 0.93, 48), new THREE.MeshBasicMaterial({ map: tex })); face.position.z = 0.18; g.add(face);
        const needle = new THREE.Group(); needle.position.z = 0.24;
        const nb = new THREE.Mesh(new THREE.BoxGeometry(R * 0.7, 0.07, 0.04), mat(0xe11d48, { roughness: 0.4 })); nb.position.x = R * 0.3; needle.add(nb);
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.06, 16), mat(0x475569, { metalness: 0.5 })); cap.rotation.x = Math.PI / 2; needle.add(cap);
        g.add(needle);
        g.userData.set = (v) => { needle.rotation.z = (-225 + 270 * Math.max(0, Math.min(max, v)) / max) * Math.PI / 180; };
        g.userData.set(0); return g;
      }
      /* 사방으로 빛나는 별 모양 빛 번짐 */
      function glowSprite(size, inner, mid) { const tex = canvasTex(128, 128, (c) => { const g = c.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, inner || 'rgba(255,235,160,1)'); g.addColorStop(0.25, mid || 'rgba(255,190,60,.55)'); g.addColorStop(1, 'rgba(255,160,0,0)'); c.fillStyle = g; c.fillRect(0, 0, 128, 128); });
        const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); s.scale.set(size, size, 1); return s; }
      function starField(n, R) { const pos = []; for (let i = 0; i < n; i++) { const u = rnd() * 2 - 1, a = rnd() * 6.283, r = Math.sqrt(1 - u * u); pos.push(Math.cos(a) * r * R, u * R, Math.sin(a) * r * R); }
        const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); return new THREE.Points(g, new THREE.PointsMaterial({ color: 0x9fb4e8, size: 1.5, sizeAttenuation: false, transparent: true, opacity: 0.55 })); }
      /* 행성 겉면 무늬 (가로 줄무늬 / 점무늬) */
      function bandTex(cols, seed) { return canvasTex(256, 128, (c, w, h) => { let s = seed || 3; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
        const n = cols.length; for (let i = 0; i < 16; i++) { c.fillStyle = cols[Math.floor(r() * n)]; c.fillRect(0, i * h / 16, w, h / 16 + 1); }
        c.globalAlpha = 0.25; for (let i = 0; i < 60; i++) { c.fillStyle = cols[Math.floor(r() * n)]; c.beginPath(); c.ellipse(r() * w, r() * h, 8 + r() * 25, 2 + r() * 4, 0, 0, 7); c.fill(); } c.globalAlpha = 1; }); }

      const st = { same: false, f1: 5, f2: 5, d: 0, x: 0, v: 0, th: 0, w: 0, last: -1 };
      const K = 0.6, LIM = 3.2;
      /* 레일 + 수레 */
      const rail = new THREE.Mesh(new THREE.BoxGeometry(2 * LIM + 3.2, 0.2, 1.6), mat(0x64748b, { metalness: 0.4, roughness: 0.5 })); rail.position.y = -0.7; root.add(rail);
      for (let i = -3; i <= 3; i++) { const tk = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.02, 1.6), mat(0xcbd5e1)); tk.position.set(i * 1.1, -0.59, 0); root.add(tk); }
      const cart = new THREE.Group(); root.add(cart);
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.9, 1.1), mat(0xf59e0b, { roughness: 0.45 })); cart.add(body);
      [[-0.6, 0.55], [0.6, 0.55], [-0.6, -0.55], [0.6, -0.55]].forEach((p) => { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.12, 18), mat(0x334155)); w.rotation.x = Math.PI / 2; w.position.set(p[0], -0.5, p[1] * 1.0); cart.add(w); });
      const hk1 = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10), mat(0xcbd5e1, { metalness: 0.8 })); hk1.position.set(-0.95, 0, 0); cart.add(hk1);
      const hk2 = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10), mat(0xcbd5e1, { metalness: 0.8 })); cart.add(hk2);
      const a1 = mkArrow(0x2f6df6, 0.07), a2 = mkArrow(0xe5484d, 0.07), an = mkArrow(0x16a34a, 0.09); root.add(a1, a2, an);
      const l1 = label('', a1, { size: 12.5, color: 'rgba(40,90,230,.92)' }), l2 = label('', a2, { size: 12.5, color: 'rgba(200,40,50,.92)' }), ln = label('', an, { size: 12.5, color: 'rgba(20,130,60,.92)' });
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new V3(-5.5, 0, 0), new V3(5.5, 0, 0)]), new THREE.LineDashedMaterial({ color: 0xffffff, dashSize: 0.18, gapSize: 0.12, transparent: true, opacity: 0.55 })); line.computeLineDistances(); root.add(line);
      const line2 = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new V3(-5.5, 0, 0), new V3(5.5, 0, 0)]), new THREE.LineDashedMaterial({ color: 0xffb3b3, dashSize: 0.18, gapSize: 0.12, transparent: true, opacity: 0.7 })); line2.computeLineDistances(); root.add(line2);
      label('작용선', [5.0, 0, 0], { size: 11, offset: [0, 0.3, 0] });

      function text() {
        const net = st.same ? st.f1 + st.f2 : st.f2 - st.f1, bal = Math.abs(net) < 0.05 && st.d < 0.05;
        const dir = net > 0 ? '→ 오른쪽' : net < 0 ? '← 왼쪽' : '';
        info('합력 = <b>' + Math.abs(net).toFixed(0) + ' N</b> ' + dir + (st.same ? ' (같은 방향이면 더해요)' : net === 0 ? ' (0)' : ' (반대 방향이면 큰 힘 − 작은 힘)') + '<br>' + (bal ? '<b>힘의 평형</b>: 크기가 같고, 방향이 반대고, 같은 작용선 위예요 → 정지 (또는 등속).' : net !== 0 ? '합력이 있으면 물체의 운동 상태가 변해요 (합력 방향으로 빨라져요).' : '크기가 같고 방향이 반대여도 <b>작용선이 어긋나</b> 있어서 물체가 돌아요.'));
      }
      controls.segment('', [{ value: false, label: '반대 방향' }, { value: true, label: '같은 방향' }], false, (v) => { st.same = v; text(); });
      controls.range('왼쪽 힘 F₁', 0, 10, 1, st.f1, (v) => { st.f1 = v; text(); }, (v) => v + ' N');
      controls.range('오른쪽 힘 F₂', 0, 10, 1, st.f2, (v) => { st.f2 = v; text(); }, (v) => v + ' N');
      controls.range('작용선 어긋남', 0, 1, 0.1, st.d, (v) => { st.d = v; text(); }, (v) => (v < 0.05 ? '같은 선' : v.toFixed(1)));
      controls.button('■ 멈추고 처음으로', () => { st.x = 0; st.v = 0; st.th = 0; st.w = 0; });
      text();

      return {
        update(dt, t) {
          const h = Math.min(dt, 0.05), net = st.same ? st.f1 + st.f2 : st.f2 - st.f1;
          st.v += net * K * h * 0.5; st.v *= 1 - 0.1 * h; st.x += st.v * h;
          const torque = st.f2 * st.d * 0.9; st.w += torque * h * 0.8; st.w *= 1 - 0.5 * h; st.th += st.w * h;
          if (Math.abs(st.x) > LIM) { st.x = 0; st.v = 0; }
          cart.position.set(st.x, 0, 0); cart.rotation.z = st.th;
          hk2.position.set(0.95, st.d * 0.4, 0);
          const p1 = new V3(-0.95, 0, 0).applyAxisAngle(new V3(0, 0, 1), st.th).add(cart.position), p2 = new V3(0.95, st.d * 0.4, 0).applyAxisAngle(new V3(0, 0, 1), st.th).add(cart.position);
          const net2 = st.same ? st.f1 + st.f2 : st.f2 - st.f1, ny = -1.4, R = new V3(0, 0, 1);
          if (!st.same) {
            setArrow(a1, p1.clone().add(new V3(-0.12, 0, 0)), p1.clone().add(new V3(-0.12 - st.f1 * 0.38, 0, 0)));
            l1.obj = [p1.x - 0.12 - st.f1 * 0.19, p1.y + 0.4, 0];
          } else {
            const q = p2.clone().add(new V3(0.12, 0.42, 0));
            setArrow(a1, q, q.clone().add(new V3(st.f1 * 0.38, 0, 0)));
            l1.obj = [q.x + st.f1 * 0.19, q.y + 0.35, 0];
          }
          a1.visible = st.f1 > 0; l1.set('F₁ ' + st.f1 + ' N'); l1.show(st.f1 > 0);
          setArrow(a2, p2.clone().add(new V3(0.12, 0, 0)), p2.clone().add(new V3(0.12 + st.f2 * 0.38, 0, 0))); a2.visible = st.f2 > 0;
          l2.obj = [p2.x + 0.12 + st.f2 * 0.19, p2.y - 0.3, 0]; l2.set('F₂ ' + st.f2 + ' N'); l2.show(st.f2 > 0);
          if (Math.abs(net2) > 0) { setArrow(an, new V3(st.x, ny, 0.4), new V3(st.x + net2 * 0.38, ny, 0.4)); an.visible = true; ln.obj = [st.x + net2 * 0.19, ny - 0.1, 0.4]; ln.set('합력 ' + Math.abs(net2) + ' N'); ln.show(true); } else { an.visible = false; ln.set('합력 0 N'); ln.obj = [st.x, ny, 0.4]; ln.show(true); }
          line2.position.y = st.d * 0.4; line2.visible = st.d > 0.05;
        },
        sync() {},
      };
    },
  });
})();
