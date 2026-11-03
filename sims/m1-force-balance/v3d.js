/* m1-force-balance · 3D 얼음판 위 상자: 나란한 두 힘의 합력과 힘의 평형
   2D '얼음판' 장면과 같아요(힘 F₁·F₂ N, 오른쪽 고리의 작용점 위/가운데/아래, 핀). 힘은 2D 조작판에서 정하고, ▶ 재생은 네 가지 장면을 차례로 보여 줘요.
   같은 방향은 합력 = 두 힘의 합, 반대 방향은 큰 힘 − 작은 힘. 크기가 같고 방향이 반대이며 같은 작용선이면 평형이에요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHN0 = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  window.SciSim3D.attach({
    title: '합력과 힘의 평형 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    levels: [1, 2],
    camera: { dist: 10.5 * (PHN0 ? 1.12 : 1), theta: 0.25, phi: 0.95, fov: 45, target: [0, -0.2, 0], min: 6, max: 28 },
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

      /* 2D '얼음판' 장면과 같은 구성(위에서 본 얼음판 위의 상자, 왼쪽 고리 · 오른쪽 고리 + 작용점 위/가운데/아래, 핀).
         힘 F(+ 오른쪽 / − 왼쪽, N)과 작용점은 2D의 값을 그대로 읽어 와요. 조작은 옆의 2D 조작판에서 해요. */
      const PX = 44.4, SLOTS = [-26 / 44.4, 0, 26 / 44.4], HOOK = 48 / 44.4, KN = 0.4, LIM = 3.4;
      const ice = new THREE.Mesh(new THREE.BoxGeometry(2 * LIM + 3.4, 0.2, 4.6), mat(0xcfe8ff, { roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.92 })); ice.position.y = -0.7; root.add(ice);
      for (let i = -3; i <= 3; i++) { const tk = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.02, 4.6), mat(0xb6d4ef)); tk.position.set(i * 1.1, -0.59, 0); root.add(tk); }
      const cart = new THREE.Group(); root.add(cart);
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.9, 1.8), mat(0xf59e0b, { roughness: 0.45 })); cart.add(body);
      const hk1 = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 10), mat(0xcbd5e1, { metalness: 0.8 })); hk1.position.set(-HOOK, 0, 0); cart.add(hk1);
      const hk2 = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 10), mat(0xcbd5e1, { metalness: 0.8 })); cart.add(hk2);
      const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.6, 12), mat(0xef4444)); pin.position.set(0, 0.7, 0); cart.add(pin);
      const a1 = mkArrow(0x2f6df6, 0.07), a2 = mkArrow(0xe5484d, 0.07), an = mkArrow(0x16a34a, 0.09); root.add(a1, a2, an);
      const l1 = label('', a1, { size: 12.5, color: 'rgba(40,90,230,.92)' }), l2 = label('', a2, { size: 12.5, color: 'rgba(200,40,50,.92)' }), ln = label('', an, { size: 12.5, color: 'rgba(20,130,60,.92)' });
      const mkLine = (c, o) => new THREE.Line(new THREE.BufferGeometry().setFromPoints([new V3(-5.5, 0, 0), new V3(5.5, 0, 0)]), new THREE.LineDashedMaterial({ color: c, dashSize: 0.18, gapSize: 0.12, transparent: true, opacity: o }));
      const line = mkLine(0xffffff, 0.7), line2 = mkLine(0xff8a8a, 0.9); line.computeLineDistances(); line2.computeLineDistances(); root.add(line, line2);
      label('작용선', [5.0, -0.5, 0], { size: 11, offset: [0, 0.3, 0] });
      const yAx = new V3(0, 1, 0), tmpP = new V3();

      /* ▶ 재생: 2D 실험과 같은 네 장면을 차례로 (핀을 꽂은 채 힘 정하기 → 핀 빼기 → 운동) */
      const SC = [
        { F: [2, 3], slot: 1, name: '같은 방향 2 N · 3 N' },
        { F: [-2, 5], slot: 1, name: '반대 방향 2 N · 5 N' },
        { F: [-4, 4], slot: 1, name: '크기 같고 반대 · 같은 작용선' },
        { F: [-3, 3], slot: 0, name: '크기 같고 반대 · 작용선 다름' },
      ];
      let pmode = false, built = false, playP = 0, sig = '', lastTxt = '';
      const pl = controls.player({
        duration: 14, loop: true, autoplay: false, label: '재생',
        phases: SC.map((s, i) => [i / SC.length, s.name]),
        onFrame(p) { if (!built) return; pmode = true; playP = p; },
      });
      built = true;
      const L0 = () => (ctx.lesson && ctx.lesson()) || null;
      const setInfo = (h) => { if (h !== lastTxt) { lastTxt = h; info(h); } };
      const fN = (f) => (f === 0 ? '0 N' : (f > 0 ? '→ ' : '← ') + Math.abs(f) + ' N');
      function formula(f1, f2) {
        const a = Math.abs(f1), b = Math.abs(f2), n = Math.abs(f1 + f2);
        if (!a && !b) return '합력 = 0';
        if (!a || !b) return '합력 = ' + (a || b) + ' N';
        if (Math.sign(f1) === Math.sign(f2)) return '합력 = ' + a + ' N + ' + b + ' N = ' + n + ' N';
        return '합력 = ' + Math.max(a, b) + ' N − ' + Math.min(a, b) + ' N = ' + (n ? n + ' N' : '0');
      }

      return {
        update(dt) {
          const l = L0(), B = l && l.B, sc = l ? l.scene : 'B';
          let F0 = 0, F1 = 0, slot = 1, x = 0, z = 0, th = 0, pinned = true;
          if (pmode) {
            const n = SC.length, k = Math.min(n - 1, Math.floor(playP * n)), q = playP * n - k, tau = q * 4.2;  // 한 장면 = 4.2초 분량
            const s = SC[k]; F0 = s.F[0]; F1 = s.F[1]; slot = s.slot;
            const run = Math.max(0, tau - 0.9), netv = F0 + F1, fade = q > 0.88 ? 1 - (q - 0.88) / 0.12 : 1;
            pinned = tau < 0.9;
            x = Math.max(-LIM, Math.min(LIM, 0.5 * 0.17 * netv * run * run));
            const tq = F1 * SLOTS[slot] * 0.9; th = slot !== 1 ? Math.max(-3.1, Math.min(3.1, 0.5 * 0.45 * tq * run * run)) : 0;
            z = 0; cart.scale.setScalar(0.4 + 0.6 * Math.min(1, fade * 1.0 + 0.0));
            cart.scale.setScalar(1);
          } else if (B) {
            F0 = B.F[0]; F1 = B.F[1]; slot = B.slot; pinned = B.st === 'pinned' || B.st === 'pinIn';
            x = (B.x - l.BC.cx) / PX; z = (B.y - l.BC.cy) / PX; th = B.th;
          }
          const net = F0 + F1, hz2 = SLOTS[slot];
          if (pmode || !B) { /* 재생 중에는 핀을 뺀 직후부터 */ }
          cart.position.set(x, 0, z); cart.rotation.y = -th; pin.visible = pinned;
          hk2.position.set(HOOK, 0, hz2);
          const c = Math.cos(th), s = Math.sin(th);
          const wp = (lx, lz) => tmpP.set(x + lx * c - lz * s, 0, z + lx * s + lz * c).clone();
          const p1 = wp(-HOOK, 0), p2 = wp(HOOK, hz2);
          // 힘 화살표 (왼쪽 고리, 오른쪽 고리): 힘의 방향으로 길이 = 크기 × 0.4
          const drawF = (g, lab, p, f, dz, txt) => { if (f === 0) { g.visible = false; lab.show(false); return; } setArrow(g, p.clone().add(new V3(0, 0.05, dz)), p.clone().add(new V3(f * KN, 0.05, dz))); g.visible = true; lab.obj = [p.x + f * KN / 2, 0.45, p.z + dz]; lab.set(txt + ' ' + fN(f)); lab.show(true); };
          drawF(a1, l1, p1, F0, 0, 'F₁'); drawF(a2, l2, p2, F1, 0, 'F₂');
          // 합력 화살표 (상자 아래)
          const ny = -0.2, nz = 1.9;
          if (net !== 0) { setArrow(an, new V3(x, ny, nz), new V3(x + net * KN, ny, nz)); an.visible = true; ln.obj = [x + net * KN / 2, ny + 0.1, nz]; ln.set('합력 ' + fN(net)); }
          else { an.visible = false; ln.obj = [x, ny + 0.1, nz]; ln.set('합력 0 N'); }
          ln.show(F0 !== 0 || F1 !== 0);
          line.position.z = 0; line2.position.z = hz2; line2.visible = slot !== 1; line.visible = true;
          // 안내
          let txt;
          if (sc && sc !== 'B') txt = '<b>힘의 합력과 평형</b>은 얼음판 장면에서 알아봐요. (이 장면은 2D 화면에서 해 보세요)';
          else {
            const bal = net === 0 && slot === 1, spin = net === 0 && slot !== 1 && F1 !== 0;
            txt = (pmode ? '<b>▶ ' + SC[Math.min(SC.length - 1, Math.floor(playP * SC.length))].name + '</b><br>' : '') + '<b>' + formula(F0, F1) + '</b>' + (net !== 0 ? ' (' + (net > 0 ? '오른쪽' : '왼쪽') + ')' : '') + '<br>';
            if (F0 === 0 && F1 === 0) txt += '핀을 꽂은 채 옆의 2D 조작판에서 두 힘을 정하고 ▶ 핀 빼기를 눌러 보세요.';
            else if (F0 !== 0 && F1 !== 0 && Math.sign(F0) === Math.sign(F1)) txt += '두 힘의 방향이 같으면 합력은 <b>두 힘의 합</b>이고 방향은 두 힘과 같아요.';
            else if (net !== 0) txt += '두 힘의 방향이 반대이면 합력은 <b>큰 힘 − 작은 힘</b>이고 방향은 <b>큰 힘 쪽</b>이에요.';
            else if (bal) txt += '<b>힘의 평형</b>: 크기가 같고, 방향이 반대이며, <b>같은 작용선</b> 위에 있어 합력이 0이에요. 멈춰 있던 물체는 계속 멈춰 있어요.';
            else if (spin) txt += '크기가 같고 방향이 반대여도 <b>작용선이 다르면</b> 상자가 제자리에서 돌아요.';
          }
          setInfo(txt);
        },
        sync() {},
      };
    },
  });
})();
