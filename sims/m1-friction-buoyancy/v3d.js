/* m1-friction-buoyancy · 3D 물속에서 부력 측정 (2D와 같은 장면)
   비치볼을 물속으로 누르면 위로 떠올라요(부력의 방향). 용수철저울에 매단 금속 원기둥(공기 중 5.0 N)을 물에 담그면 눈금이 줄어요: 부력 = 공기 중 무게 − 물속 무게.
   잠긴 부피가 클수록 부력이 커요(완전히 잠기면 더 깊이 넣어도 같아요). 2D의 공·원기둥·저울 상태를 그대로 보여 주고, ▶ 재생은 실험을 한 번 반복해요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHN0 = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  window.SciSim3D.attach({
    title: '마찰력과 부력 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    levels: [1],   // 2단계(마찰력 재기: 접촉면 칩 · 도막 쌓기 · ✊ 당기기 · 표)만 3D. 도막 튕기기 · 공 누르기 · 원기둥 손잡이 · 카드 끌기는 2D
    camera: { dist: PHN0 ? 5.4 : 9.5, theta: 0.3, phi: 1.38, fov: 45, target: PHN0 ? [-0.5, 2.1, 0] : [-1.3, 2.8, 0], min: 4, max: 34 },
    autofit: false,   // 3D는 한 단계(마찰력의 크기)뿐: 도막 · 용수철저울 · 눈금판이 크게 보이도록 시점을 직접 맞춰 두었어요 (긴 접촉면은 오른쪽으로 이어져요)
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

      /* 2D '물속에서 부력 측정'과 같은 장면: 비치볼(부력의 방향) → 금속 원기둥 + 용수철저울(부력의 크기, 공기 중 5.0 N)
         2D의 공·원기둥·저울 눈금(window.__sim)을 그대로 따라가요. ▶ 재생은 지금 단계의 실험을 한 번 반복해요. */
      const WL = 0.6, TB = -2.2, TW = 3.0, TD = 1.7, PXU = 50;          // 수면 · 수조 바닥 · 수조 반폭 · 반깊이 · 2D 픽셀→그림 단위
      const HC = 98 / PXU, RC = 27 / PXU, RB = 38 / PXU;                // 원기둥 높이·반지름, 공 반지름
      const CYW = 5.0, CYFB = 1.96, BW = 1.0, BFB = 4.0;                // 2D와 같은 값 (N)
      /* 실험실 배경: 뒷벽 + 바닥 + 나뭇결 책상 (모든 장면 공통) */
      const woodT = canvasTex(512, 256, (c, w, h) => { c.fillStyle = '#a86a35'; c.fillRect(0, 0, w, h); for (let i = 0; i < 60; i++) { c.strokeStyle = 'rgba(' + (70 + (i * 29) % 50) + ',35,10,' + (0.1 + (i % 4) * 0.05) + ')'; c.lineWidth = 1 + (i % 3); c.beginPath(); const y = i / 60 * h; c.moveTo(0, y); for (let x = 0; x <= w; x += 32) c.lineTo(x, y + Math.sin(x * 0.04 + i) * 2.5); c.stroke(); } });
      woodT.wrapS = woodT.wrapT = THREE.RepeatWrapping; woodT.repeat.set(2, 1);
      const wallT = canvasTex(8, 256, (c, w, h) => { const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#26364f'); g.addColorStop(1, '#0f1a2c'); c.fillStyle = g; c.fillRect(0, 0, w, h); });
      const wall = new THREE.Mesh(new THREE.PlaneGeometry(90, 40), new THREE.MeshBasicMaterial({ map: wallT })); wall.position.set(0, 8, -14); root.add(wall);
      const flr = new THREE.Mesh(new THREE.PlaneGeometry(90, 40), mat(0x1a2538, { roughness: 0.9 })); flr.rotation.x = -Math.PI / 2; flr.position.set(0, TB - 0.3, -2); flr.receiveShadow = true; root.add(flr);
      const bStart = root.children.length;
      const tank = new THREE.Mesh(new THREE.BoxGeometry(2 * TW, 5.6, 2 * TD), glass(0xcfe6ff, 0.12)); tank.position.y = TB + 2.8; root.add(tank);
      { const te = new THREE.LineSegments(new THREE.EdgesGeometry(tank.geometry), new THREE.LineBasicMaterial({ color: 0x9cc3ff })); te.position.copy(tank.position); root.add(te); }
      const water = new THREE.Mesh(new THREE.BoxGeometry(2 * TW - 0.06, 1, 2 * TD - 0.06), glass(0x3d9cff, 0.3, { side: THREE.FrontSide })); root.add(water);
      const surf = new THREE.Mesh(new THREE.PlaneGeometry(2 * TW - 0.06, 2 * TD - 0.06), new THREE.MeshBasicMaterial({ color: 0x9fd0ff, transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide })); surf.rotation.x = -Math.PI / 2; root.add(surf);
      const table = new THREE.Mesh(new THREE.BoxGeometry(2 * TW + 1.2, 0.25, 2 * TD + 1.2), mat(0xffffff, { map: woodT, roughness: 0.65 })); table.position.y = TB - 0.12; root.add(table);
      { const tm = mat(0xcbd5e1, { metalness: 0.7, roughness: 0.3 }); const fr = new THREE.Mesh(new THREE.BoxGeometry(2 * TW + 0.2, 0.12, 2 * TD + 0.2), tm); fr.position.y = TB + 0.02; root.add(fr);
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const pl = new THREE.Mesh(new THREE.BoxGeometry(0.12, 5.6, 0.12), tm); pl.position.set(sx * TW, TB + 2.8, sz * TD); root.add(pl); }
        const gradT = canvasTex(64, 256, (c, w, h) => { c.strokeStyle = 'rgba(40,70,120,.8)'; c.fillStyle = 'rgba(40,70,120,.9)'; c.font = '700 14px sans-serif'; for (let i = 0; i <= 10; i++) { const y = h - 10 - i * (h - 20) / 10; c.lineWidth = i % 5 === 0 ? 3 : 1.5; c.beginPath(); c.moveTo(0, y); c.lineTo(i % 5 === 0 ? 34 : 20, y); c.stroke(); } });
        const gr = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 3.4), new THREE.MeshBasicMaterial({ map: gradT, transparent: true, opacity: 0.8, depthWrite: false })); gr.position.set(TW - 0.4, TB + 2.0, TD + 0.03); root.add(gr); }
      function setWater(y) { water.scale.y = y - TB; water.position.y = (y + TB) / 2; surf.position.y = y; }

      /* 비치볼 */
      const ballTex = canvasTex(256, 128, (c, w, h) => { const cols = ['#ef4444', '#ffffff', '#3b82f6', '#ffffff', '#facc15', '#ffffff']; for (let i = 0; i < 6; i++) { c.fillStyle = cols[i]; c.fillRect(i * w / 6, 0, w / 6 + 1, h); } });
      const ball = new THREE.Mesh(new THREE.SphereGeometry(RB, 32, 24), mat(0xffffff, { map: ballTex, roughness: 0.4 })); root.add(ball);
      /* 금속 원기둥 + 용수철저울 */
      const cyl = new THREE.Mesh(new THREE.CylinderGeometry(RC, RC, HC, 32), mat(0x9aa7b8, { metalness: 0.7, roughness: 0.3 })); root.add(cyl);
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
      const dpLab = label('', [TW, WL, 0], { size: 12, color: 'rgba(30,64,175,.92)', offset: [0.2, 0.5, 0] });

      /* ===== 마찰력 장면 F(관찰) · L(저울로 재기) · C(생활): 2D와 같은 도막 · 접촉면 · 힘 화살표 (2D 1 px = 0.01 그림 단위) ===== */
      const bObjs = root.children.slice(bStart);
      const bLabs = [hand, wLab, bLab, tLab, rdLab, dpLab];
      const gF = new THREE.Group(); gF.visible = false; root.add(gF);
      const GS = PHN0 ? 0.7 : 1.75; gF.scale.setScalar(GS); gF.position.set(0, 1.4, 0);
      const FW = 8, BWD = 1.12, BHT = 0.6, BDP = 0.9, NPXF = 24, SURFS = { glass: { name: '유리', f: 1.2 }, wood: { name: '나무', f: 2.0 }, sand: { name: '사포', f: 3.5 } };
      const gx = (px) => (px - 400) * 0.01;
      const surfTex = {
        wood: canvasTex(256, 64, (c, w, h) => { c.fillStyle = '#e6bf8a'; c.fillRect(0, 0, w, h); c.strokeStyle = 'rgba(120,70,30,.35)'; c.lineWidth = 2; for (let k = 0; k < 6; k++) { c.beginPath(); c.moveTo(0, 6 + k * 10); for (let x = 0; x <= w; x += 16) c.lineTo(x, 6 + k * 10 + Math.sin(x * 0.07 + k) * 2); c.stroke(); } }),
        sand: canvasTex(256, 64, (c, w, h) => { c.fillStyle = '#d9954f'; c.fillRect(0, 0, w, h); for (let i = 0; i < 900; i++) { c.fillStyle = Math.random() < 0.5 ? 'rgba(110,60,15,.6)' : 'rgba(255,230,180,.7)'; c.fillRect(Math.random() * w, Math.random() * h, 1.6, 1.6); } }),
      };
      const stripF = {
        wood: new THREE.Mesh(new THREE.BoxGeometry(FW, 0.44, 2.2), mat(0xffffff, { map: surfTex.wood, roughness: 0.75 })),
        sand: new THREE.Mesh(new THREE.BoxGeometry(FW, 0.44, 2.2), mat(0xffffff, { map: surfTex.sand, roughness: 1 })),
        glass: new THREE.Mesh(new THREE.BoxGeometry(FW, 0.44, 2.2), mat(0xa8d8f2, { roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.85 })),
      };
      Object.keys(stripF).forEach((k) => { stripF[k].position.y = -0.22; stripF[k].receiveShadow = true; gF.add(stripF[k]); });
      { const bench = new THREE.Mesh(new THREE.BoxGeometry(FW + 0.4, 0.9, 2.5), mat(0xffffff, { map: woodT, roughness: 0.7 })); bench.position.y = -0.89; gF.add(bench); const lm = mat(0x475569, { metalness: 0.5, roughness: 0.5 }); for (const sx of [-1, 1]) { const lg = new THREE.Mesh(new THREE.BoxGeometry(0.3, 2.6, 2.2), lm); lg.position.set(sx * (FW / 2 - 0.4), -2.6, 0); gF.add(lg); } }
      const woodMat = mat(0xb9733a, { roughness: 0.7 });
      const blocksF = [0, 1].map((k) => { const b = new THREE.Mesh(new THREE.BoxGeometry(BWD, BHT, BDP), woodMat); b.castShadow = true; b.position.y = BHT / 2 + k * BHT; gF.add(b); return b; });
      const hookF = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.025, 8, 16), mat(0x475569, { metalness: 0.6 })); gF.add(hookF);
      const segF = [0, 1].map(() => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1, 8), mat(0xa16207, { roughness: 0.8 })); gF.add(m); return m; });
      const handleF = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), mat(0xe9b86a, { roughness: 0.5 })); gF.add(handleF);
      const faF = mkArrow(0xb45309, 0.07), paF = mkArrow(0xf97316, 0.07), mvF = mkArrow(0x64748b, 0.07); gF.add(faF, paF, mvF); [faF, paF, mvF].forEach((g) => g.children.forEach((c) => { c.material.depthTest = false; c.renderOrder = 8; }));
      const faLab = label('', [0, 0, 0], { size: 12.5, color: 'rgba(160,80,10,.95)' }), paLab = label('', [0, 0, 0], { size: 12.5, color: 'rgba(200,90,10,.95)' }), mvLab = label('운동 방향', [0, 0, 0], { size: 11.5, color: 'rgba(80,95,115,.95)' });
      const wtLab = label('', [0, 0, 0], { size: 12, color: 'rgba(120,70,30,.95)' });
      // 용수철저울 (장면 L): 유리관 + 늘어나는 막대 + 눈금판
      const sclF = new THREE.Group(); gF.add(sclF);
      const sBody = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 1.28, 20), glass(0xe8f1ff, 0.4)); sBody.rotation.z = Math.PI / 2; sclF.add(sBody);
      const sSpr = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1, 14, 1, true), mat(0xcbd5e1, { metalness: 0.7, wireframe: true })); sSpr.rotation.z = Math.PI / 2; sclF.add(sSpr);
      const sRod = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1, 10), mat(0x64748b, { metalness: 0.5 })); sRod.rotation.z = Math.PI / 2; sclF.add(sRod);
      const sRing = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.022, 8, 16), mat(0x334155)); sclF.add(sRing);
      const sStem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.8, 8), mat(0x94a3b8)); sStem.position.set(0.64, 0.42, 0); sclF.add(sStem);
      const dialF = makeDial(0.62, 10, 'N', 1, 2); dialF.position.set(0.64, 1.1, 0); sclF.add(dialF);
      const mxNeedle = new THREE.Group(); mxNeedle.position.z = 0.21; { const nb = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.045, 0.03), mat(0x64748b)); nb.position.x = 0.2; mxNeedle.add(nb); } dialF.add(mxNeedle);
      const rdF = label('', [0, 0, 0], { size: 13, color: 'rgba(15,23,42,.92)' }), mxF = label('', [0, 0, 0], { size: 11.5, color: 'rgba(80,95,115,.95)' });
      // 장면 C: 거친 면과 매끄러운 면 비교는 같은 도막 · 접촉면을 한 쌍씩 놓아요
      const gC = new THREE.Group(); gC.visible = false; root.add(gC); gC.scale.setScalar(PHN0 ? 0.7 : 1.5); gC.position.set(0, 1.5, 0);
      const cPair = ['sand', 'glass'].map((k, i) => {
        const x = i === 0 ? -2.1 : 2.1, g = new THREE.Group(); g.position.x = x; gC.add(g);
        const st = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.4, 2.0), k === 'sand' ? mat(0xffffff, { map: surfTex.sand, roughness: 1 }) : mat(0xa8d8f2, { roughness: 0.05, transparent: true, opacity: 0.85 })); st.position.y = -0.2; g.add(st);
        const b = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.55, 0.85), woodMat); b.position.y = 0.275; b.castShadow = true; g.add(b);
        const ar = mkArrow(0xb45309, 0.07); ar.children.forEach((c) => { c.material.depthTest = false; c.renderOrder = 8; }); g.add(ar);
        return { g, k, b, ar, lab: label('', [x * gC.scale.x, 0, 0], { size: 12.5, color: 'rgba(160,80,10,.95)' }), cap: label('', [x * gC.scale.x, 0, 0], { size: 12, color: 'rgba(30,64,175,.92)' }) };
      });
      const SURFN = { glass: '유리', wood: '나무', sand: '사포' };
      let fPh = '';
      function ropePose(ex, dxPx) {      // 도막 고리 → 손잡이: 팽팽하면 곧게, 느슨하면 처져요
        const hx = gx(FR_.x + 59), hy = BHT / 2, sag = Math.max(0, 52 - dxPx) * 0.0055 + (dxPx < 52 ? 0.04 : 0), mx = (hx + ex) / 2;
        hookF.position.set(hx, hy, 0); handleF.position.set(ex, hy, 0);
        [[hx, hy, mx, hy - sag], [mx, hy - sag, ex, hy]].forEach((s, i) => {
          const a = new V3(s[0], s[1], 0), b = new V3(s[2], s[3], 0), d = b.clone().sub(a);
          segF[i].visible = true; segF[i].scale.y = Math.max(0.01, d.length()); segF[i].position.copy(a).add(b).multiplyScalar(0.5); segF[i].quaternion.setFromUnitVectors(Yax, d.normalize());
        });
      }
      let FR_ = { x: 380 };
      // 재생용 상태 계산
      function playF(p) {      // 장면 F: 줄을 당기고 → 2 N에서 움직이기 시작 → 놓으면 미끄러져 멈춰요
        const T = p * 18; let x = 380, dx = 38, st = 'idle', fr = 0, pa = 0, v = 0, ph = '살짝 당겨 보아요';
        const NP = 24;
        if (T < 4) { const q = Math.min(1, T / 2.5), Nn = 1.6 * q; dx = 52 + NP * Nn; pa = Nn; fr = -Nn; ph = '살짝 당겨도 도막은 가만히 있어요 (마찰력 = 당기는 힘)'; }
        else if (T < 5.5) { const q = (T - 4) / 1.5, Nn = 1.6 + 0.4 * q; dx = 52 + NP * Nn; pa = Nn; fr = -Nn; ph = '2 N까지 당겨요'; }
        else if (T < 9) { const tau = T - 5.5; v = 70; x = 380 + v * tau; dx = 52 + NP * 2; pa = 2; fr = -2; ph = '2 N을 넘기면 움직이기 시작해요'; st = 'pdrag'; }
        else if (T < 12) { const tau = T - 9, v0 = 150, tstop = v0 / 300, t2 = Math.min(tau, tstop); x = 380 + 70 * 3.5 + v0 * t2 - 150 * t2 * t2; v = tau < tstop ? v0 - 300 * tau : 0; fr = v > 0 ? -2 : 0; dx = 38; ph = '놓으면 미끄러지다가 마찰력 때문에 멈춰요'; st = 'slide'; }
        else { const q = Math.min(1, (T - 12) / 4), e = q * q * (3 - 2 * q); x = (380 + 70 * 3.5 + 150 * 150 / 300 / 2) + (380 - (380 + 70 * 3.5 + 150 * 150 / 300 / 2)) * e; ph = '처음 자리로 돌아가요'; dx = 38; }
        return { x, dx, fr, pa, v, st, ph, surf: 'wood', blocks: 1 };
      }
      const TRIALS = [['glass', 1], ['wood', 1], ['sand', 1], ['wood', 2]];
      function playL(p) {      // 장면 L: 접촉면과 도막 수를 바꿔 가며 움직이기 시작할 때의 눈금을 재요
        const T = p * 18, k = Math.min(3, Math.floor(T / 4.5)), tt = T - k * 4.5, [surf, blocks] = TRIALS[k], fs = SURFS[surf].f * blocks;
        const tRamp = 0.5 + fs / 1.5; let F = 0, maxF = 0, x = 232, hold = false;
        if (tt < 0.5) F = 0; else if (tt < tRamp) { F = 1.5 * (tt - 0.5); maxF = F; hold = true; } else if (tt < tRamp + 1.3) { const s = tt - tRamp; F = fs; maxF = fs; x = 232 + 46 * (1 - Math.exp(-7 * s) * (Math.cos(16 * s) + 0.44 * Math.sin(16 * s))); hold = true; } else { F = fs; maxF = fs; x = 232 + 46 * (1 - Math.exp(-7 * 1.3) * 0); }
        return { x, F, maxF, surf, blocks, hold, ph: SURFN[surf] + ' · 도막 ' + blocks + '개: ' + (maxF >= fs - 1e-6 ? '움직이기 시작! 마찰력 ' + fs.toFixed(1) + ' N' : '서서히 당겨요') };
      }
      function updFL(dt, l, sc, tt) {
        const f = l && l.FR; const surfTop = 0;
        let S;
        if (sc === 'F') {
          if (pmode) S = playF(pP); else S = f ? { x: f.x, dx: f.pull.dx, fr: f.fr.dx * f.fr.k / NPXF, pa: f.pa.dx * f.pa.k / NPXF, v: f.st === 'slide' ? f.v : f.st === 'pdrag' ? f.pull.sv : 0, st: f.st, surf: 'wood', blocks: 1, ph: '' } : playF(0);
        } else {
          if (pmode) S = playL(pP); else S = f ? { x: f.x, F: Math.max(0, f.gauge.value), maxF: f.maxNeedle, surf: f.surf, blocks: f.blocks, hold: f.hold, ph: '' } : { x: 232, F: 0, maxF: 0, surf: 'wood', blocks: 1, ph: '' };
        }
        FR_ = S; Object.keys(stripF).forEach((k) => { stripF[k].visible = k === S.surf; });
        const bx = gx(S.x); blocksF.forEach((b, k) => { b.position.x = bx; b.visible = k < S.blocks; });
        wtLab.obj = [bx * GS, (BHT * S.blocks * 0.5 + 1.4) * GS + 0.05, 0]; wtLab.set('도막 ' + (S.blocks * 5) + ' N · ' + SURFN[S.surf]); wtLab.show(true); wtLab.off = [0, 0.7, 0];
        let fr = 0, pa = 0, v = 0;
        if (sc === 'F') {
          const ex = gx(S.x + 59 + 8 + S.dx); ropePose(ex, S.dx); fr = S.fr; pa = S.pa; v = S.v;
          sclF.visible = false; rdF.show(false); mxF.show(false);
        } else {
          segF.forEach((s) => { s.visible = false; }); handleF.visible = false;
          const hx = gx(S.x + 59), hy = BHT * 0.5, ext = Math.max(0, S.F) * 0.12;
          hookF.position.set(hx, hy, 0); sclF.visible = true; sclF.position.set(hx + 0.12, hy, 0);
          sBody.position.x = 0.7; sSpr.position.x = 0.7; sSpr.scale.y = 1.2 + ext * 0.5; sRod.scale.y = 0.4 + ext + 0.1; sRod.position.x = 1.34 + ext / 2; sRing.position.x = 1.38 + ext; sRing.rotation.y = Math.PI / 2;
          sStem.position.x = 0.7; dialF.position.set(0.7, 1.15, 0);
          dialF.userData.set(S.F); mxNeedle.rotation.z = (-225 + 270 * Math.min(10, S.maxF) / 10) * Math.PI / 180; mxNeedle.visible = S.maxF > 0.02;
          rdF.obj = [(hx + 0.82) * GS, 1.4 * GS + 0.05, 0.9 * GS]; rdF.set('<b>' + S.F.toFixed(1) + ' N</b>'); rdF.show(true); rdF.off = [0.9, 0.55, 0];
          mxF.obj = [(hx + 0.82) * GS, 1.4 * GS + 0.05, 0.9 * GS]; mxF.set('최대 ' + S.maxF.toFixed(1) + ' N'); mxF.show(S.maxF > 0.02); mxF.off = [0.9, 0.0, 0];
          hookF.visible = true; fr = -S.F; pa = S.F;
        }
        // 화살표: 당기는 힘(주황) · 마찰력(갈색) · 운동 방향(회색), 1 N = 0.3
        const K = 0.3, hy2 = BHT * 0.5, ay = -0.12;
        const hxA = gx(S.x + 59) + 0.1;
        if (Math.abs(pa) > 0.05) { const o = new V3(hxA, hy2 + 0.55, 0.65); setArrow(paF, o, o.clone().add(new V3(pa * K, 0, 0))); paLab.obj = [(o.x + pa * K / 2) * GS, (o.y + 1.4) * GS + 0.1, 0.65 * GS]; paLab.off = [0, 0.35, 0]; paLab.set('당기는 힘 ' + Math.abs(pa).toFixed(1) + ' N'); paLab.show(true); } else { paF.visible = false; paLab.show(false); }
        if (Math.abs(fr) > 0.05) { const o = new V3(bx, ay, 1.2); setArrow(faF, o, o.clone().add(new V3(fr * K, 0, 0))); faLab.obj = [(o.x + fr * K / 2) * GS, (o.y + 1.4) * GS, 1.2 * GS]; faLab.off = [0, -0.45, 0]; faLab.set('마찰력 ' + Math.abs(fr).toFixed(1) + ' N (반대 방향)'); faLab.show(true); } else { faF.visible = false; faLab.show(false); }
        if (Math.abs(v) > 18) { const dir = Math.sign(v), o = new V3(bx - dir * 0.4, BHT * S.blocks + 0.45, 0); setArrow(mvF, o, o.clone().add(new V3(dir * Math.min(1.2, Math.abs(v) * 0.005 + 0.3), 0, 0))); mvLab.obj = [(o.x + dir * 0.4) * GS, (o.y + 1.4) * GS, 0]; mvLab.off = [0, 0.35, 0]; mvLab.show(true); } else { mvF.visible = false; mvLab.show(false); }
        const ph = phEl(); if (ph) ph.textContent = pmode ? S.ph : '';
        let txt;
        if (sc === 'F') txt = '<b>마찰력</b>: 접촉면에서 물체의 운동을 방해하는 힘이에요. 방향은 물체가 <b>운동하려는(운동하는) 방향과 반대</b>예요.<br>' + (Math.abs(pa) > 0.05 && Math.abs(v) < 18 ? '당기는 힘 ' + Math.abs(pa).toFixed(1) + ' N인데 도막이 가만히 있어요: 마찰력도 ' + Math.abs(fr).toFixed(1) + ' N이에요.' : Math.abs(v) >= 18 ? '운동 방향과 <b>반대</b>쪽으로 마찰력(2.0 N)이 작용해서 점점 느려져요.' : '▶ 재생을 눌러 도막이 미끄러지는 모습을 보세요.');
        else txt = '<b>마찰력의 크기</b>: 도막이 <b>움직이기 시작할 때의 눈금</b>이에요. 접촉면과 도막 수를 바꿔 가며 재어 보고, 아래 기록표에서 비교해요 (도막 1개 = 5 N).<br>' + (S.maxF > 0.02 ? '지금 눈금 <b>' + S.F.toFixed(1) + ' N</b> · 최대 <b>' + S.maxF.toFixed(1) + ' N</b>' : '옆의 ✊ 당기기를 꾹 누르거나 ▶ 재생을 눌러 보세요.');
        setInfo(txt);
      }
      function updC(dt, l) {
        const ph = phEl(); if (ph) ph.textContent = '';
        cPair.forEach((c, i) => {
          const f = c.k === 'sand' ? 3.5 : 1.2, K = 0.3, hy = 0.275;
          setArrow(c.ar, new V3(0.1, -0.12 - 0, 1.12), new V3(0.1 - f * K, -0.12, 1.12));
          c.lab.obj = [(c.g.position.x - f * K / 2) * gC.scale.x, 1.5 * gC.scale.x - 0.12 * gC.scale.x, 1.12 * gC.scale.x]; c.lab.off = [0, -0.4, 0]; c.lab.set('마찰력 ' + f.toFixed(1) + ' N'); c.lab.show(true);
          c.cap.obj = [c.g.position.x * gC.scale.x, 1.5 * gC.scale.x + 0.9, 0]; c.cap.set(c.k === 'sand' ? '거친 면 → 마찰력 크게' : '매끄러운 면(기름 · 왁스) → 마찰력 작게'); c.cap.show(true);
        });
        setInfo('<b>생활 속 마찰력</b>: 미끄러지지 않게 하려면 접촉면을 <b>거칠게</b>(등산화 밑창 · 눈길 체인 · 미끄럼 방지 매트), 잘 미끄러지게 하려면 <b>매끄럽게</b>(기름칠 · 스키 왁스) 해요.');
      }

      const L2 = () => (ctx.lesson && ctx.lesson()) || null;
      const cl = (v, a, b) => Math.max(a, Math.min(b, v)), sm = (x) => { x = cl(x, 0, 1); return x * x * (3 - 2 * x); };
      let pmode = false, built = false, pP = 0, sig = '', lastTxt = '', curSc = 'B';
      const pl = controls.player({
        duration: 18, loop: true, autoplay: false, label: '재생', phases: [[0, '']],
        onFrame(p) { if (!built) return; pmode = true; pP = p; },
      });
      built = true;
      const setInfo = (h) => { if (h !== lastTxt) { lastTxt = h; info(h); } };
      const phEl = () => document.querySelector('.v3-player .v3-ph');

      /* 구형 공이 d(0~1)만큼 잠기면 잠긴 부피 비율 */
      const capFrac = (d) => d * d * (3 - 2 * d);
      function showBall(cy, vy) {      // cy: 공 중심 높이
        const d = cl((WL + RB - (cy - RB) - RB) / (2 * RB), 0, 1);   // (수면 아래로 잠긴 깊이) / 지름
        const dd = cl((WL - (cy - RB)) / (2 * RB), 0, 1), fr = capFrac(dd), Fb = fr * BFB;
        ball.visible = true; ball.position.set(0, cy, 0); ball.rotation.y += 0.01;
        cyl.visible = sc.visible = thread.visible = false; tA.visible = false; hand.show(false); tLab.show(false); rdLab.show(false);
        setArrow(wA, new V3(-1.3, cy, 0), new V3(-1.3, cy - 0.35 * BW - 0.05, 0)); wLab.obj = [-1.3, cy - 0.2, 0]; wLab.off = [-0.6, 0, 0]; wLab.set('무게 ' + BW.toFixed(1) + ' N'); wLab.show(true);
        if (Fb > 0.02) { setArrow(bA, new V3(1.3, cy, 0), new V3(1.3, cy + 0.35 * Fb + 0.05, 0)); bA.visible = true; bLab.obj = [1.3, cy + 0.35 * Fb / 2 + 0.2, 0]; bLab.set('부력 ' + Fb.toFixed(1) + ' N'); bLab.show(true); } else { bA.visible = false; bLab.show(false); }
        dpLab.set('잠긴 깊이 ' + Math.round(dd * 100) + ' %'); dpLab.show(true);
        setWater(WL);
        return { dd, Fb };
      }
      function showCyl(bot, read) {   // bot: 원기둥 바닥 높이, read: 저울 눈금(N)
        const frac = cl((WL - bot) / HC, 0, 1), cy = bot + HC / 2, top = bot + HC;
        const Fb = CYW - read;
        ball.visible = false; cyl.visible = sc.visible = thread.visible = true;
        cyl.position.set(0, cy, 0);
        const ext = 0.25 + 0.2 * read, bodyBottom = top + 0.7 + ext;
        thread.scale.y = 0.7; thread.position.set(0, top + 0.35, 0);
        rod.scale.y = Math.max(0.01, ext); rod.position.y = top + 0.7 + ext / 2;
        body.position.y = bodyBottom + 0.85; spr.position.y = bodyBottom + 0.7; spr.scale.y = 0.9; cap.position.y = bodyBottom + 1.72; ring.position.y = bodyBottom + 2.05;
        setArrow(tA, new V3(0.95, top, 0), new V3(0.95, top + 0.2 * read + 0.05, 0)); tA.visible = read > 0.05; tLab.obj = [0.95, top + 0.2 * read / 2 + 0.2, 0]; tLab.show(true);
        rdLab.obj = [0, bodyBottom + 0.85, 0]; rdLab.set('눈금 <b>' + read.toFixed(1) + ' N</b>'); rdLab.show(true); hand.obj = [0, bodyBottom + 2.05, 0]; hand.show(true);
        setArrow(wA, new V3(-0.95, cy, 0), new V3(-0.95, cy - 0.2 * CYW - 0.05, 0)); wLab.obj = [-0.95, cy - 0.2 * CYW / 2 - 0.1, 0]; wLab.off = [-0.6, 0, 0]; wLab.set('무게 ' + CYW.toFixed(1) + ' N'); wLab.show(true);
        if (Fb > 0.05) { setArrow(bA, new V3(0.5, cy, 0), new V3(0.5, cy + 0.2 * Fb * 1.4 + 0.05, 0)); bA.visible = true; bLab.obj = [0.5, cy + 0.2 * Fb * 1.4 / 2 + 0.3, 0]; bLab.set('부력 ' + Fb.toFixed(1) + ' N'); bLab.show(true); } else { bA.visible = false; bLab.show(false); }
        dpLab.set('잠긴 정도 ' + Math.round(frac * 100) + ' %'); dpLab.show(true);
        setWater(WL + 0.5 * frac);          // 완전히 잠기면 물이 조금 올라와요 (2D와 같게)
        return { frac, Fb };
      }

      const DEQ = 0.33;                       // 비치볼이 뜰 때의 잠긴 깊이 (무게 = 부력)
      const yEq = WL - 2 * RB * DEQ + RB;
      return {
        update(dt, t) {
          const l = L2(), BB = l && l.BB;
          const sc2 = l ? l.scene : 'B';
          if (sc2 !== curSc) { curSc = sc2; if (pmode) { pmode = false; pl.pause(); } }
          const isB = sc2 === 'B';
          bObjs.forEach((o) => { o.visible = isB; }); gF.visible = sc2 === 'F' || sc2 === 'L'; gC.visible = sc2 === 'C';
          if (!isB) bLabs.forEach((x) => x.show(false));
          if (sc2 !== 'F' && sc2 !== 'L') { [faLab, paLab, mvLab, wtLab, rdF, mxF].forEach((x) => x.show(false)); }
          if (sc2 !== 'C') cPair.forEach((c) => { c.lab.show(false); c.cap.show(false); });
          if (sc2 === 'F' || sc2 === 'L') { updFL(dt, l, sc2, t); return; }
          if (sc2 === 'C') { updC(dt, l); return; }
          const stage = BB ? BB.stage : 1;
          const key = [stage, BB && BB.ball.drag, BB && BB.ball.released, BB && BB.grab].join();
          if (key !== sig) { sig = key; if (pmode) { pmode = false; pl.pause(); } }
          const ph = phEl();
          let r, txt;
          if (stage === 1) {
            let cy;
            if (pmode) {
              const p = pP;
              if (p < 0.12) cy = yEq + 0.03 * Math.sin(t * 3);
              else if (p < 0.45) { const q = sm((p - 0.12) / 0.3); cy = yEq + (WL - 2 * RB * 0.92 + RB - yEq) * q; }
              else if (p < 0.5) cy = WL - 2 * RB * 0.92 + RB;
              else { const tau = (p - 0.5) * 11; cy = yEq + (WL - 2 * RB * 0.92 + RB - yEq) * Math.exp(-0.9 * tau) * Math.cos(5.2 * tau); cy = Math.min(cy, WL + 1.8); }
              if (ph) ph.textContent = p < 0.12 ? '물 위에 떠 있어요' : p < 0.5 ? '물속으로 눌러요' : '놓았더니 떠올라요';
            } else { cy = BB ? WL - (BB.ball.y - l.TK.wl0) / PXU : yEq; if (ph) ph.textContent = ''; }
            r = showBall(cy);
            txt = '<b>부력의 방향</b>: 물속의 비치볼을 놓으면 <b>위쪽</b>으로 떠올라요. 물이 물체를 <b>위로</b> 밀어 올리는 힘이 <b>부력</b>이에요 (방향은 중력과 반대인 위쪽).<br>깊이 누를수록(잠긴 부피가 클수록) 부력이 커요 · 지금 잠긴 깊이 <b>' + Math.round(r.dd * 100) + ' %</b>, 부력 <b>' + r.Fb.toFixed(1) + ' N</b> (무게 ' + BW.toFixed(1) + ' N).';
          } else {
            let bot, read;
            if (pmode) {
              const p = pP;
              // 0 % → 50 % → 100 % → 더 깊이 → 다시 올려요
              const a = p < 0.08 ? 0 : p < 0.7 ? sm((p - 0.08) / 0.62) : 1 - sm((p - 0.78) / 0.2);
              bot = WL + 0.35 - a * (HC + 0.35 + 0.9);
              bot = Math.max(TB + 0.02, bot);
              const fr = cl((WL - bot) / HC, 0, 1); read = CYW - CYFB * fr;
              if (ph) ph.textContent = p < 0.08 ? '공기 중' : p < 0.4 ? '반쯤 잠겨요' : p < 0.7 ? '완전히 잠겨요' : p < 0.78 ? '더 깊이' : '올려요';
            } else {
              const g = BB ? l.bGeo() : null; read = BB ? BB.read : CYW;
              // 2D 원기둥 위치를 그대로: 바닥 높이 = 수면 − (바닥 px − 처음 수면 px) / PXU
              bot = g ? WL - (g.cylBot - l.TK.wl0) / PXU : WL + 0.35;
              if (ph) ph.textContent = '';
            }
            r = showCyl(bot, read);
            txt = '<b>부력의 크기</b> = 공기 중 무게 <b>' + CYW.toFixed(1) + ' N</b> − 물속 무게(저울 눈금 <b>' + read.toFixed(1) + ' N</b>) = <b>' + r.Fb.toFixed(1) + ' N</b><br>잠긴 부피가 클수록 부력이 커요(0 → 약 1.0 → 약 2.0 N). <b>완전히 잠긴 뒤</b>에는 더 깊이 넣어도 <b>일정</b>해요.';
          }
          setInfo(txt);
        },
        sync() {},
      };
    },
  });
})();
