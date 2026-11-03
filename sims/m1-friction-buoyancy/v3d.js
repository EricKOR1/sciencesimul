/* m1-friction-buoyancy · 3D 물속에서 부력 측정 (2D와 같은 장면)
   비치볼을 물속으로 누르면 위로 떠올라요(부력의 방향). 용수철저울에 매단 금속 원기둥(공기 중 5.0 N)을 물에 담그면 눈금이 줄어요: 부력 = 공기 중 무게 − 물속 무게.
   잠긴 부피가 클수록 부력이 커요(완전히 잠기면 더 깊이 넣어도 같아요). 2D의 공·원기둥·저울 상태를 그대로 보여 주고, ▶ 재생은 실험을 한 번 반복해요. */
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

      /* 2D '물속에서 부력 측정'과 같은 장면: 비치볼(부력의 방향) → 금속 원기둥 + 용수철저울(부력의 크기, 공기 중 5.0 N)
         2D의 공·원기둥·저울 눈금(window.__sim)을 그대로 따라가요. ▶ 재생은 지금 단계의 실험을 한 번 반복해요. */
      const WL = 0.6, TB = -2.2, TW = 3.0, TD = 1.7, PXU = 50;          // 수면 · 수조 바닥 · 수조 반폭 · 반깊이 · 2D 픽셀→그림 단위
      const HC = 98 / PXU, RC = 27 / PXU, RB = 38 / PXU;                // 원기둥 높이·반지름, 공 반지름
      const CYW = 5.0, CYFB = 1.96, BW = 1.0, BFB = 4.0;                // 2D와 같은 값 (N)
      const tank = new THREE.Mesh(new THREE.BoxGeometry(2 * TW, 5.6, 2 * TD), glass(0xcfe6ff, 0.12)); tank.position.y = TB + 2.8; root.add(tank);
      { const te = new THREE.LineSegments(new THREE.EdgesGeometry(tank.geometry), new THREE.LineBasicMaterial({ color: 0x9cc3ff })); te.position.copy(tank.position); root.add(te); }
      const water = new THREE.Mesh(new THREE.BoxGeometry(2 * TW - 0.06, 1, 2 * TD - 0.06), glass(0x3d9cff, 0.3, { side: THREE.FrontSide })); root.add(water);
      const surf = new THREE.Mesh(new THREE.PlaneGeometry(2 * TW - 0.06, 2 * TD - 0.06), new THREE.MeshBasicMaterial({ color: 0x9fd0ff, transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide })); surf.rotation.x = -Math.PI / 2; root.add(surf);
      const table = new THREE.Mesh(new THREE.BoxGeometry(2 * TW + 1.2, 0.25, 2 * TD + 1.2), mat(0x64748b, { roughness: 0.7 })); table.position.y = TB - 0.12; root.add(table);
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

      const L2 = () => (ctx.lesson && ctx.lesson()) || null;
      const cl = (v, a, b) => Math.max(a, Math.min(b, v)), sm = (x) => { x = cl(x, 0, 1); return x * x * (3 - 2 * x); };
      let pmode = false, built = false, pP = 0, sig = '', lastTxt = '';
      const pl = controls.player({
        duration: 11, loop: true, autoplay: false, label: '재생', phases: [[0, '']],
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
          if (l && l.scene !== 'B') txt = '<b>마찰력</b> 실험과 <b>생활 속 마찰력·부력</b>은 2D 화면에서 해 보세요. 3D는 물속의 부력(비치볼 · 금속 원기둥)을 보여 줘요.<br>' + txt;
          setInfo(txt);
        },
        sync() {},
      };
    },
  });
})();
