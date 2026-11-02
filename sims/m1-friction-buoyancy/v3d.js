/* m1-friction-buoyancy · 3D 물속에서 부력 측정
   용수철저울에 매단 물체를 물에 담그면 부력(위쪽 힘)이 생겨 저울 눈금이 줄어요. 눈금 = 무게 − 부력.
   물체가 물에 잠긴 부피가 클수록 부력이 커요 (완전히 잠기면 더 깊이 넣어도 같아요). 나무토막은 무게 = 부력이 되는 높이에서 떠요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHN0 = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  window.SciSim3D.attach({
    title: '물속의 부력 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    levels: [2],
    camera: { dist: 15 * (PHN0 ? 1.05 : 1), theta: 0.3, phi: 1.38, fov: 45, target: [0.4, 1.9, 0], min: 6, max: 34 },
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

      const WL = 0.6, TB = -2.4, TW = 3.4, TD = 1.9;          // 수면 · 수조 바닥 · 수조 반폭 · 반깊이
      const st = { obj: 'big', pct: 0, t: 0, bob: 0 };
      const OBJ = { small: { n: '작은 추', W: 4, vol: 50, size: 0.95, col: 0x7c8aa0 }, big: { n: '큰 추', W: 4, vol: 100, size: 1.35, col: 0x7c8aa0 }, wood: { n: '나무토막', W: 3, vol: 100, size: 1.5, col: 0xc08a50 } };

      /* 수조 */
      const tank = new THREE.Mesh(new THREE.BoxGeometry(2 * TW, 4.2, 2 * TD), glass(0xcfe6ff, 0.12)); tank.position.y = TB + 2.1; root.add(tank);
      { const te = new THREE.LineSegments(new THREE.EdgesGeometry(tank.geometry), new THREE.LineBasicMaterial({ color: 0x9cc3ff })); te.position.copy(tank.position); root.add(te); }
      const water = new THREE.Mesh(new THREE.BoxGeometry(2 * TW - 0.06, WL - TB, 2 * TD - 0.06), glass(0x3d9cff, 0.3, { side: THREE.FrontSide })); water.position.y = (WL + TB) / 2; root.add(water);
      const surf = new THREE.Mesh(new THREE.PlaneGeometry(2 * TW - 0.06, 2 * TD - 0.06), new THREE.MeshBasicMaterial({ color: 0x9fd0ff, transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide })); surf.rotation.x = -Math.PI / 2; surf.position.y = WL; root.add(surf);
      const table = new THREE.Mesh(new THREE.BoxGeometry(2 * TW + 1.2, 0.25, 2 * TD + 1.2), mat(0x64748b, { roughness: 0.7 })); table.position.y = TB - 0.12; root.add(table);

      /* 물체 + 매다는 줄 + 용수철저울 */
      const obj = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), mat(0x7c8aa0, { metalness: 0.5, roughness: 0.4 })); root.add(obj);
      const thread = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1, 6), mat(0xe5e7eb)); root.add(thread);
      const sc = new THREE.Group(); root.add(sc);
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 1.7, 24), glass(0xe8f1ff, 0.35)); sc.add(body);
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.14, 24), mat(0x475569, { metalness: 0.5 })); cap.position.y = 0.88; sc.add(cap);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.035, 8, 20), mat(0xcbd5e1, { metalness: 0.8 })); ring.position.y = 1.15; sc.add(ring);
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1, 12), mat(0xe11d48, { roughness: 0.4 })); sc.add(rod);
      const spr = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 1, 16, 1, true), mat(0xcbd5e1, { metalness: 0.7, roughness: 0.3, wireframe: true })); sc.add(spr);
      for (let i = 0; i <= 8; i++) { const tk = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.012, 0.012), mat(0x1f2937)); tk.position.set(0.37, 0.7 - i * 0.18, 0); sc.add(tk); }
      const hand = label('손으로 들어요', ring, { size: 11.5, offset: [0, 0.55, 0] });
      const wA = mkArrow(0xe5484d, 0.07), bA = mkArrow(0x2f6df6, 0.07), tA = mkArrow(0x16a34a, 0.07); root.add(wA, bA, tA);
      const wLab = label('무게', wA, { size: 12, color: 'rgba(200,40,50,.92)' }), bLab = label('부력', bA, { size: 12, color: 'rgba(40,90,230,.92)' }), tLab = label('저울이 당기는 힘', tA, { size: 11.5, color: 'rgba(20,130,60,.92)' });
      const rdLab = label('', sc, { size: 13, color: 'rgba(30,64,175,.92)', offset: [1.0, 0.2, 0] });

      function calc(t) {
        const o = OBJ[st.obj], h = o.size, hang = st.obj !== 'wood', p = st.pct;
        let bottom, sub;
        if (hang) { bottom = p <= 100 ? WL + 0.35 - p / 100 * (h + 0.35) : WL - h - (p - 100) / 30 * 0.9; bottom = Math.max(TB + 0.02, bottom); sub = Math.max(0, Math.min(1, (WL - bottom) / h)); }
        else { sub = Math.min(1, o.W / (o.vol * 0.01)); bottom = WL - sub * h + 0.05 * Math.sin(t * 3) * st.bob; }
        const Fb = hang ? (o.vol * 0.01) * sub : o.W;
        return { o, h, hang, sub, Fb, W: o.W, read: hang ? o.W - Fb : 0, bottom };
      }
      function layout(t) {
        const c = calc(t), { o, h } = c, cy = c.bottom + h / 2;
        obj.scale.set(h, h, h); obj.material.color.setHex(o.col); obj.material.metalness = st.obj === 'wood' ? 0 : 0.5; obj.material.roughness = st.obj === 'wood' ? 0.8 : 0.4;
        obj.position.set(0, cy, 0);
        if (c.hang) {
          const ext = 0.25 + 0.28 * c.read, top = cy + h / 2, bodyBottom = top + 0.7 + ext;
          thread.visible = true; thread.scale.y = 0.7; thread.position.set(0, top + 0.35, 0);
          rod.scale.y = Math.max(0.01, ext); rod.position.y = top + 0.7 + ext / 2;
          body.position.y = bodyBottom + 0.85; spr.position.y = bodyBottom + 0.7; spr.scale.y = 0.9; cap.position.y = bodyBottom + 1.72; ring.position.y = bodyBottom + 2.05;
          sc.visible = true;
          setArrow(tA, new V3(0.9, top, 0), new V3(0.9, top + 0.35 * c.read + 0.05, 0)); tA.visible = c.read > 0.05;
          rdLab.obj = [0, bodyBottom + 0.85, 0]; rdLab.set('눈금 <b>' + c.read.toFixed(1) + ' N</b>'); rdLab.show(true); hand.obj = [0, bodyBottom + 2.05, 0]; hand.show(true);
          tLab.obj = [0.9, top + 0.35 * c.read / 2 + 0.2, 0]; tLab.show(c.read > 0.05);
        } else { thread.visible = false; sc.visible = false; tA.visible = false; hand.show(false); tLab.show(false); rdLab.show(false); }
        setArrow(wA, new V3(-0.9, cy, 0), new V3(-0.9, cy - 0.35 * c.W - 0.05, 0)); wLab.obj = [-0.9, cy - 0.35 * c.W / 2 - 0.1, 0]; wLab.off = [-0.55, 0, 0];
        if (c.Fb > 0.02) { setArrow(bA, new V3(0.55, cy, 0), new V3(0.55, cy + 0.35 * c.Fb + 0.05, 0)); bA.visible = true; bLab.obj = [0.55, cy + 0.35 * c.Fb / 2 + 0.2, 0]; bLab.show(true); } else { bA.visible = false; bLab.show(false); }
        return c;
      }
      function text(c) {
        if (!c.hang) info('나무토막은 <b>무게(' + c.W + ' N) = 부력</b>이 되는 높이까지만 잠겨서 떠요.<br>잠긴 부피는 약 <b>' + Math.round(c.sub * 100) + '%</b>예요.<br>(나무의 밀도가 물보다 작아요)');
        else info('저울 눈금 <b>' + c.read.toFixed(1) + ' N</b> = 무게 ' + c.W + ' N − 부력 <b>' + c.Fb.toFixed(1) + ' N</b><br>물에 잠긴 부피 <b>' + Math.round(c.sub * c.o.vol) + ' cm³</b>' + (c.sub >= 1 ? ' (완전히 잠겼어요)' : '') + '<br>잠긴 부피가 클수록 부력이 커요. 부력은 위쪽이에요.');
      }
      const seg = controls.segment('', [{ value: 'small', label: '작은 추' }, { value: 'big', label: '큰 추' }, { value: 'wood', label: '나무토막' }], 'big', (v) => { st.obj = v; st.bob = 1; });
      const sl = controls.range('물에 넣기', 0, 130, 5, 0, (v) => { st.pct = v; }, (v) => (v === 0 ? '공기 중' : v < 100 ? '내리는 중' : '완전히 잠김'));
      controls.button('↺ 처음으로', () => { st.pct = 0; sl.set(0); });
      layout(0);

      return {
        update(dt, t) {
          st.bob = Math.max(0, st.bob - dt * 0.4);
          const c = layout(t); st.t += dt; const k = (t * 4) | 0; if (k !== st.last) { st.last = k; text(c); }
        },
        sync() {},
      };
    },
  });
})();
