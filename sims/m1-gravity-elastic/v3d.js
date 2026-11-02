/* m1-gravity-elastic · 3D 중력의 방향 · 용수철의 탄성력 · 질량과 무게
   중력은 지구 어디에서나 지구 중심 쪽으로 작용해요 (사과가 지구 중심 쪽으로 떨어져요).
   용수철에 물체를 매달면 중력(무게)과 용수철의 탄성력이 같아져 멈춰요. 무게 = 질량 × 중력 (지구 9.8 N/kg, 달은 지구의 약 1/6). 질량은 어디서나 같아요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHN0 = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  window.SciSim3D.attach({
    title: '중력과 탄성력 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    levels: [0, 1, 2],
    camera: { dist: 17 * (PHN0 ? 1.05 : 1), theta: 0.4, phi: 1.2, fov: 45, target: [0, 0, 0], min: 6, max: 30 },
    autoRotate: 0.08,
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

      const st = { scene: 'dir', mass: 5, fall: false, ft: 0 };
      const GE = 9.8, GM = 9.8 / 6;

      /* ===== A) 중력의 방향: 지구 둘레의 사과 ===== */
      const A = new THREE.Group(); root.add(A);
      const RE = 2.6;
      const tex = canvasTex(512, 256, (c, w, h) => { c.fillStyle = '#2f7fd8'; c.fillRect(0, 0, w, h); c.fillStyle = '#4caf6a'; let s = 7; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
        for (let i = 0; i < 26; i++) { const x = r() * w, y = 35 + r() * (h - 70); for (let j = 0; j < 9; j++) { c.beginPath(); c.ellipse(x + (r() - 0.5) * 60, y + (r() - 0.5) * 34, 10 + r() * 30, 6 + r() * 16, r() * 3, 0, 7); c.fill(); } }
        c.fillStyle = '#f2f6fa'; c.fillRect(0, 0, w, 14); c.fillRect(0, h - 14, w, 14); });
      const earth = new THREE.Mesh(new THREE.SphereGeometry(RE, 64, 48), mat(0xffffff, { map: tex, roughness: 0.75 })); A.add(earth);
      const core = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10), mat(0xffd23f, { emissive: 0x886600 })); A.add(core);
      const SPOTS = [{ n: '북극', d: [0, 1, 0] }, { n: '남극', d: [0, -1, 0] }, { n: '동쪽 (적도)', d: [1, 0, 0] }, { n: '서쪽 (적도)', d: [-1, 0, 0] }];
      const HO = 1.6, apples = [];
      SPOTS.forEach((s, i) => {
        const d = new V3(...s.d), g = new THREE.Group();
        const ap = new THREE.Mesh(new THREE.SphereGeometry(0.3, 24, 18), mat(0xe53935, { roughness: 0.35 })); g.add(ap);
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.2, 8), mat(0x6b4a2b)); stem.position.y = 0.3; g.add(stem);
        const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), mat(0x43a047)); leaf.scale.set(1.6, 0.4, 0.9); leaf.position.set(0.12, 0.38, 0); g.add(leaf);
        A.add(g);
        const ar = mkArrow(0xffb020, 0.045); A.add(ar);
        const lab = label(s.n, g, { size: 11.5, offset: [d.x * 0.7, d.y * 0.7 + 0.1, 0] });
        apples.push({ g, d, ar, h: HO, lab });
      });
      const gLab = label('지구 중심', core, { size: 11.5, offset: [0.2, -0.45, 0.2] });
      const dirText = label('화살표 = 중력 (모두 지구 중심 쪽)', [0, -RE - 1.4, 0], { size: 12, color: 'rgba(180,110,0,.92)' });

      /* ===== B) 용수철 저울: 지구와 달 ===== */
      const B = new THREE.Group(); root.add(B);
      function makeSpring(R, turns) { const pts = []; const n = turns * 14; for (let i = 0; i <= n; i++) { const a = i / 14 * 6.2832, y = -i / n; pts.push(new V3(Math.cos(a) * R, y, Math.sin(a) * R)); }
        const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), n * 2, 0.045, 8, false); return new THREE.Mesh(geo, mat(0xcbd5e1, { metalness: 0.8, roughness: 0.25 })); }
      const rigs = [];
      [{ n: '지구', x: -3.2, g: GE, col: 0x2f7fd8, gr: 0x6b4a36 }, { n: '달', x: 3.2, g: GM, col: 0xbdb6a8, gr: 0x8b8578 }].forEach((w) => {
        const g = new THREE.Group(); g.position.x = w.x; B.add(g);
        const top = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.2, 0.6), mat(0x64748b, { metalness: 0.5, roughness: 0.4 })); top.position.y = 3.4; g.add(top);
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 6.6, 12), mat(0x64748b, { metalness: 0.5 })); post.position.set(-1.1, 0.2, -0.2); g.add(post);
        const floor = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 2, 0.25, 40), mat(w.gr, { roughness: 0.9 })); floor.position.y = -3.2; g.add(floor);
        const sp = makeSpring(0.28, 9); sp.position.y = 3.3; g.add(sp);
        const hook = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.025, 8, 16), mat(0xcbd5e1, { metalness: 0.8 })); g.add(hook);
        const blk = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), mat(0x7c8aa0, { metalness: 0.5, roughness: 0.4 })); g.add(blk);
        const wA = mkArrow(0xe5484d, 0.07), eA = mkArrow(0x2f6df6, 0.07); g.add(wA, eA);
        const nl = label(w.n + '에서', [w.x, -3.2, 0], { size: 13, color: w.n === '지구' ? 'rgba(30,80,170,.92)' : 'rgba(90,85,70,.92)', offset: [0, -0.5, 0] });
        const bl = label('', blk, { size: 12, offset: [0.9, 0, 0] });
        rigs.push({ g, sp, hook, blk, wA, eA, bl, nl, w });
      });
      const eqLab = label('중력(무게)과 탄성력이 같아서 멈춰요', [0, 3.9, 0], { size: 12, color: 'rgba(60,60,60,.9)' });
      function layoutB() {
        rigs.forEach((r) => {
          const W = st.mass * r.w.g, ext = 0.14 * W / 4 + 0.6 * 0 ; const len = 0.9 + Math.min(3.9, W * 0.045);
          r.sp.scale.y = len; r.hook.position.y = 3.3 - len - 0.05; r.hook.rotation.x = Math.PI / 2;
          const by = 3.3 - len - 0.55; r.blk.position.y = by; const s = 0.7 + st.mass * 0.05; r.blk.scale.setScalar(s);
          const fl = 0.04 * W;
          setArrow(r.wA, new V3(0.7 + 0.2, by, 0), new V3(0.9, by - fl - 0.3, 0));
          setArrow(r.eA, new V3(-0.9, by, 0), new V3(-0.9, by + fl + 0.3, 0));
          r.bl.set(st.mass + ' kg · 무게 <b>' + (Math.round(W * 10) / 10) + ' N</b>');
        });
      }
      function text() {
        if (st.scene === 'dir') info('중력은 지구 어디에서나 <b>지구 중심 쪽</b>으로 작용해요.<br>그래서 북극·남극·적도의 사과가 모두 <b>지구 중심 쪽(아래)</b>으로 떨어져요.<br>아래 = 지구 중심 방향이에요.');
        else info('<b>무게</b> = 질량 × 중력이에요. 지구 ' + (Math.round(st.mass * GE * 10) / 10) + ' N, 달 ' + (Math.round(st.mass * GM * 10) / 10) + ' N (지구의 약 1/6).<br>용수철은 늘어난 만큼 <b>탄성력</b>이 생겨 무게와 같아질 때 멈춰요.<br><b>질량</b>은 달에서도 ' + st.mass + ' kg 그대로예요.');
      }
      function setScene(v) {
        st.scene = v; A.visible = v === 'dir'; B.visible = v === 'sp';
        apples.forEach((a) => { a.lab.show(v === 'dir'); }); gLab.show(v === 'dir'); dirText.show(v === 'dir');
        rigs.forEach((r) => { r.bl.show(v === 'sp'); r.nl.show(v === 'sp'); }); eqLab.show(v === 'sp'); massWrap.forEach((e) => { e.style.display = v === 'sp' ? '' : 'none'; }); dropB.style.display = v === 'dir' ? '' : 'none';
        root.rotation.y = 0; text();
      }
      const seg = controls.segment('', [{ value: 'dir', label: '🍎 중력의 방향' }, { value: 'sp', label: '⚖ 용수철과 무게' }], 'dir', (v) => setScene(v));
      const dropB = controls.button('🍎 사과 떨어뜨리기', () => { st.fall = true; st.ft = 0; });
      const mr = controls.range('질량', 1, 10, 1, st.mass, (v) => { st.mass = v; layoutB(); text(); }, (v) => v + ' kg');
      const massWrap = Array.from(dropB.parentElement.children).slice(-2);
      layoutB(); setScene('dir');

      return {
        update(dt, t) {
          if (st.scene === 'dir') {
            if (st.fall) { st.ft += dt; if (st.ft > 2.2) { st.fall = false; } }
            const k = st.fall ? Math.min(1, st.ft / 1.0) : 0, hh = HO * (1 - k * k), bounce = st.fall && st.ft > 1.0 ? Math.max(0, 1 - (st.ft - 1.0) * 0.9) : 1;
            apples.forEach((a) => {
              const h = st.fall ? Math.max(0.3, hh) : HO + 0.08 * Math.sin(t * 2 + a.d.x * 3 + a.d.y);
              const p = a.d.clone().multiplyScalar(RE + h); a.g.position.copy(p); a.g.quaternion.setFromUnitVectors(new V3(0, 1, 0), a.d);
              const al = 1.15; setArrow(a.ar, p.clone().add(a.d.clone().multiplyScalar(-0.35)), p.clone().add(a.d.clone().multiplyScalar(-0.35 - al)));
              a.ar.visible = true;
            });
            core.scale.setScalar(1 + 0.15 * Math.sin(t * 3));
          } else { rigs.forEach((r) => { r.blk.rotation.y += dt * 0.3; }); }
        },
        sync() {},
      };
    },
  });
})();
