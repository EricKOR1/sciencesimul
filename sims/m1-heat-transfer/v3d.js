/* m1-heat-transfer · 3D 열의 이동 (전도 · 대류 · 복사)
   전도: 고체에서 입자의 진동이 이웃 입자에게 차례로 전달돼요 (입자는 제자리). 대류: 액체·기체에서 입자가 직접 움직여 열을 날라요 (따뜻한 물은 위로, 찬물은 아래로).
   복사: 물질 없이도 열이 빛처럼 전해져요 (태양 → 지구). 2D 실험의 장면(전도·대류·복사)을 따라 바뀌어요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHN0 = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  window.SciSim3D.attach({
    title: '열의 이동 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    levels: [0, 1, 2],
    camera: { dist: 9.5 * (PHN0 ? 1.05 : 1), theta: 0.45, phi: 1.2, fov: 45, target: [0, 0, 0], min: 5, max: 26 },
    autoRotate: 0.08,
    build(ctx) {
      const { THREE, root, label, info, controls, orbit } = ctx;
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

      const LG = { cond: [], conv: [], rad: [] };
      const st = { mode: 'cond', heat: true, mat: 'cu', pos: 'bottom', vac: false, foil: false };
      const cCold = new THREE.Color(0x5b8def), cHot = new THREE.Color(0xff4a2a), cc = new THREE.Color();
      const flameMat = () => new THREE.MeshBasicMaterial({ color: 0xff8a2a, transparent: true, opacity: 0.9 });
      function mkFlame(s) { const g = new THREE.Group(); const a = new THREE.Mesh(new THREE.ConeGeometry(0.32 * s, 0.9 * s, 20), flameMat()); a.position.y = 0.45 * s; const b = new THREE.Mesh(new THREE.ConeGeometry(0.17 * s, 0.55 * s, 16), new THREE.MeshBasicMaterial({ color: 0xffe082 })); b.position.y = 0.28 * s; g.add(a, b); g.userData = { a, b }; return g; }

      /* ===== 1) 전도: 금속 막대 ===== */
      const cond = new THREE.Group(); root.add(cond);
      const NC = 14, GAP = 0.5, RR = 0.17, X0 = -(NC - 1) * GAP / 2;
      const rodMesh = spheres(NC * 9, RR, 0xffffff, 14);
      const T = new Array(NC).fill(0), D = { cu: 7, fe: 2.2, gl: 0.45 };
      const MATC = { cu: 0xe39a45, fe: 0x8b95a7, gl: 0x7fd6e8 };
      const shell = new THREE.Mesh(new THREE.BoxGeometry(NC * GAP + 0.1, 1.5, 1.5), glass(0xcfe6ff, 0.1)); cond.add(shell);
      const shellE = new THREE.LineSegments(new THREE.EdgesGeometry(shell.geometry), new THREE.LineBasicMaterial({ color: MATC.cu })); cond.add(shellE);
      cond.add(rodMesh);
      const flame1 = mkFlame(1.1); flame1.position.set(X0 - 0.5, -2.35, 0); cond.add(flame1);
      const burner1 = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.55, 0.5, 20), mat(0x475569, { metalness: 0.6, roughness: 0.4 })); burner1.position.set(X0 - 0.5, -2.75, 0); cond.add(burner1);
      cond.add(Object.assign(tubeMesh([[X0 - 0.5, -1.9, 0], [X0 - 0.5, -1.2, 0], [X0 - 0.25, -0.6, 0]], 0.04, 0xff8a2a), {}));
      const arrC = mkArrow(0xffb020, 0.07); setArrow(arrC, new V3(X0 + 0.5, 1.5, 0), new V3(-X0 - 0.3, 1.5, 0)); cond.add(arrC);
      LG.cond.push(label('열이 이동해요', [0, 1.5, 0], { size: 12, offset: [0, 0.4, 0] }));
      const hotLab = label('뜨거운 쪽', [X0, -0.6, 0], { size: 11.5, offset: [0, -1.1, 0] }); LG.cond.push(hotLab);
      const coldLab = label('차가운 쪽', [-X0, -0.6, 0], { size: 11.5, offset: [0, -1.1, 0] }); LG.cond.push(coldLab);
      const baseV = []; for (let c = 0; c < NC; c++) for (let j = 0; j < 3; j++) for (let k = 0; k < 3; k++) baseV.push([X0 + c * GAP, (j - 1) * 0.45, (k - 1) * 0.45, c, rnd() * 6.28, rnd() * 6.28, rnd() * 6.28]);

      /* ===== 2) 대류: 비커 속 물 ===== */
      const conv = new THREE.Group(); root.add(conv);
      const BR = 2.1, BH = 2.2, NP = 170;
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(BR, BR * 0.96, 2 * BH, 56, 1, true), glass(0xcfe6ff, 0.2)); conv.add(cup);
      const wat = new THREE.Mesh(new THREE.CylinderGeometry(BR - 0.03, BR * 0.96 - 0.03, 2 * BH - 0.3, 56), glass(0x4aa8ff, 0.14, { side: THREE.FrontSide })); wat.position.y = -0.15; conv.add(wat);
      const bot = new THREE.Mesh(new THREE.CylinderGeometry(BR * 0.96, BR * 0.96, 0.12, 56), mat(0xb7c2d4, { metalness: 0.3 })); bot.position.y = -BH - 0.06; conv.add(bot);
      const flame2 = mkFlame(1.3); conv.add(flame2);
      const burner2 = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 0.5, 20), mat(0x475569, { metalness: 0.6, roughness: 0.4 })); conv.add(burner2);
      const cp = spheres(NP, 0.11, 0xffffff, 10), CP = [];
      for (let i = 0; i < NP; i++) CP.push({ al: rnd() * 6.283, ph: rnd() * 6.283, s: 0.25 + 0.75 * rnd(), jit: rnd() });
      const hotLab2 = LG.conv[LG.conv.push(label('따뜻한 물은 위로', [0, BH * 0.7, 0], { size: 11.5, offset: [-0.8, 0.2, 0] })) - 1];
      const coldLab2 = LG.conv[LG.conv.push(label('찬물은 아래로', [BR * 0.85, -BH * 0.4, 0], { size: 11.5, offset: [0.2, 0, 0] })) - 1];
      const heatLab2 = label('가열', flame2, { size: 11.5, offset: [0, -1.3, 0] }); LG.conv.push(heatLab2);

      /* ===== 3) 복사: 전등(태양) → 물체 ===== */
      const rad = new THREE.Group(); root.add(rad);
      const sun = new THREE.Mesh(new THREE.SphereGeometry(0.9, 36, 24), new THREE.MeshBasicMaterial({ color: 0xffd23f })); sun.position.set(-4.2, 0, 0); rad.add(sun);
      const glowTex = canvasTex(128, 128, (c) => { const g = c.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,230,140,1)'); g.addColorStop(0.25, 'rgba(255,190,60,.55)'); g.addColorStop(1, 'rgba(255,160,0,0)'); c.fillStyle = g; c.fillRect(0, 0, 128, 128); });
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); glow.scale.set(5, 5, 1); glow.position.copy(sun.position); rad.add(glow);
      const obj = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.6, 1.6), mat(0x7ba7e0, { roughness: 0.5, emissive: 0x000000 })); obj.position.set(3.6, 0, 0); rad.add(obj);
      const chamber = new THREE.Mesh(new THREE.BoxGeometry(5.4, 2.4, 2.4), glass(0xbfe0ff, 0.08)); chamber.position.set(-0.1, 0, 0); rad.add(chamber);
      { const ce = new THREE.LineSegments(new THREE.EdgesGeometry(chamber.geometry), new THREE.LineBasicMaterial({ color: 0x9cc3ff })); ce.position.copy(chamber.position); rad.add(ce); }
      const foil = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.2, 2.2), mat(0xe5e7eb, { metalness: 1, roughness: 0.12 })); foil.position.set(1.2, 0, 0); rad.add(foil);
      const airP = spheres(60, 0.07, 0x9db6d8, 8), AP = [];
      for (let i = 0; i < 60; i++) { AP.push({ x: -2.7 + rnd() * 5.2, y: (rnd() * 2 - 1) * 1.1, z: (rnd() * 2 - 1) * 1.1, vx: rnd() - 0.5, vy: rnd() - 0.5, vz: rnd() - 0.5 }); }
      const NR = 14, rays = [];
      for (let i = 0; i < NR; i++) { const c = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffd34d, transparent: true, opacity: 0.9 })); rad.add(c); rays.push({ m: c, u: i / NR, y: (rnd() * 2 - 1) * 0.8, z: (rnd() * 2 - 1) * 0.8, rf: false }); }
      let Tobj = 0;
      LG.rad.push(label('태양(열원)', sun, { size: 12, offset: [0, 1.4, 0] }));
      const objLab = label('물체', obj, { size: 12, offset: [0, 1.2, 0] }); LG.rad.push(objLab);
      const foilLab = label('은박지', foil, { size: 11.5, offset: [0, 1.5, 0] }); LG.rad.push(foilLab);
      const vacLab = label('', [0, 1.6, 0], { size: 11.5 }); LG.rad.push(vacLab);

      /* 조작 */
      const modeSeg = controls.segment('', [{ value: 'cond', label: '전도' }, { value: 'conv', label: '대류' }, { value: 'rad', label: '복사' }], 'cond', (v) => setMode(v));
      const sep = controls.text(''); sep.style.cssText = 'flex-basis:100%;height:0;padding:0;margin:-3px 0';
      const c1 = [], c2 = [], c3 = [];
      c1.push(controls.segment('막대', [{ value: 'cu', label: '구리' }, { value: 'fe', label: '철' }, { value: 'gl', label: '유리' }], 'cu', (v) => { st.mat = v; shellE.material.color.setHex(MATC[v]); text(); }));
      c1.push(controls.button('🔥 가열 끄기', () => { st.heat = !st.heat; hB.textContent = st.heat ? '🔥 가열 끄기' : '🔥 가열하기'; }));
      const hB = c1[1];
      c1.push(controls.button('↺ 식히기', () => { T.fill(0); }));
      c2.push(controls.segment('가열 위치', [{ value: 'bottom', label: '아래에서' }, { value: 'top', label: '위에서' }], 'bottom', (v) => { st.pos = v; text(); }));
      c3.push(controls.button('🫧 공기 빼기', () => { st.vac = !st.vac; vB.classList.toggle('on', st.vac); text(); })); const vB = c3[0];
      c3.push(controls.button('🪞 은박지 놓기', () => { st.foil = !st.foil; fB.classList.toggle('on', st.foil); text(); })); const fB = c3[1];
      c3.push(controls.button('↺ 식히기', () => { Tobj = 0; }));
      /* 막대 컨트롤 줄을 장면별로 보이게: controls 요소는 부모의 마지막 자식들이라 부모를 통해 처리 */
      const ctlEl = sep.parentElement, kids = Array.from(ctlEl.children), iSep = kids.indexOf(sep), rest = kids.slice(iSep + 1);
      const nC1 = kids.indexOf(hB.nextSibling) + 1 - (iSep + 1);
      const grp = { cond: [], conv: [], rad: [] };
      /* 요소 분류: 막대 라벨+버튼(5개) → cond, 가열 위치(라벨+2버튼 3개) → conv, 나머지 3개 → rad */
      const nCond = 1 + 3 + 2, nConv = 1 + 2;
      rest.forEach((el, i) => { (i < nCond ? grp.cond : i < nCond + nConv ? grp.conv : grp.rad).push(el); });

      function setMode(v) {
        st.mode = v; modeSeg.set(v); orbit.dist = (PHN0 ? 1.05 : 1) * { cond: 9.5, conv: 10.5, rad: 10 }[v];
        cond.visible = v === 'cond'; conv.visible = v === 'conv'; rad.visible = v === 'rad';
        Object.keys(grp).forEach((k) => grp[k].forEach((el) => { el.style.display = k === v ? '' : 'none'; }));
        Object.keys(LG).forEach((k) => LG[k].forEach((L) => L.show(k === v)));
        if (v === 'rad') foilLab.show(st.foil);
        sep.style.display = ''; text();
      }
      function text() {
        if (st.mode === 'cond') info('<b>전도</b>: 입자는 <b>제자리에서 진동</b>하며 이웃 입자에게 열을 차례로 전달해요.<br>' + (st.mat === 'cu' ? '구리는 열이 빨리 전달돼요.' : st.mat === 'fe' ? '철은 구리보다 천천히 전달돼요.' : '유리는 열이 아주 느리게 전달돼요.') + '<br>뜨거운 쪽 입자일수록 세게 진동해요 (빨간색).');
        else if (st.mode === 'conv') info('<b>대류</b>: 입자가 <b>직접 이동</b>하며 열을 날라요.<br>' + (st.pos === 'bottom' ? '아래를 가열하면 따뜻한 물은 위로, 찬물은 아래로 내려와 계속 순환해요.' : '위를 가열하면 따뜻한 물이 위에 그대로 머물러 순환하지 않아요.') + '<br>그래서 난방기는 아래에, 에어컨은 위에 두면 좋아요.');
        else info('<b>복사</b>: 열이 <b>물질 없이도</b> 빛처럼 전해져요.<br>' + (st.vac ? '공기를 빼도(진공) 열이 전달돼요.' : '공기가 있어도 복사로 열이 전달돼요.') + (st.foil ? ' 은박지가 복사열을 <b>반사</b>해요.' : '') + '<br>태양의 열이 지구에 오는 방식이에요.');
      }

      setMode('cond');
      let tt = 0;
      return {
        update(dt, t) {
          /* 2D 실험의 장면을 따라가요 */
          const sc = window.__sim && window.__sim.S && window.__sim.S.scene;
          if (sc && sc !== tt) { tt = sc; const m = sc === 'cond' ? 'cond' : sc === 'rad' ? 'rad' : sc === 'beaker' || sc === 'room' ? 'conv' : null; if (m && m !== st.mode) setMode(m); }
          if (st.mode === 'cond') {
            const sub = 2, h = Math.min(dt, 0.05) / sub, d = D[st.mat];
            for (let s = 0; s < sub; s++) { const n = T.slice(); for (let i = 0; i < NC; i++) { const l = i > 0 ? T[i - 1] : (st.heat ? 1 : T[0]), r = i < NC - 1 ? T[i + 1] : T[i]; n[i] = T[i] + d * h * (l - 2 * T[i] + r); if (i === 0 && st.heat) n[i] = 1; n[i] = Math.max(0, Math.min(1, n[i] - 0.02 * h * T[i])); } for (let i = 0; i < NC; i++) T[i] = n[i]; }
            baseV.forEach((b, i) => { const Tc = T[b[3]], a = 0.015 + 0.13 * Tc, w = 14 + 22 * Tc; put(rodMesh, i, b[0] + Math.sin(t * w + b[4]) * a, b[1] + Math.sin(t * w * 1.1 + b[5]) * a, b[2] + Math.sin(t * w * 0.9 + b[6]) * a, 1); rodMesh.setColorAt(i, cc.copy(cCold).lerp(cHot, Math.min(1, Tc * 1.1))); });
            flush(rodMesh);
            flame1.visible = st.heat; flame1.scale.set(1, 0.9 + 0.12 * Math.sin(t * 25), 1);
          } else if (st.mode === 'conv') {
            const sp = st.pos === 'bottom' ? 0.8 : 0.05;
            for (let i = 0; i < NP; i++) {
              const p = CP[i]; p.ph += dt * sp * (0.6 + 0.8 * p.s) * (st.pos === 'bottom' ? 1 : 0.4 * Math.sin(t + i));
              const rm = BR * 0.5, a = rm * (0.2 + 0.7 * p.s) * 0.95, r = rm + a * Math.cos(p.ph) * 1.0, y = -(BH * 0.78) * (0.5 + 0.5 * p.s) * Math.sin(p.ph) * 1.0 + (st.pos === 'bottom' ? 0 : 0);
              const rr = Math.max(0.05, Math.min(BR - 0.15, r));
              put(cp, i, rr * Math.cos(p.al), y, rr * Math.sin(p.al), 1);
              const hot = st.pos === 'bottom' ? Math.max(0, Math.min(1, 0.5 - 0.5 * Math.cos(p.ph))) : Math.max(0, Math.min(1, 0.5 + y / BH * 0.6));
              cp.setColorAt(i, cc.copy(cCold).lerp(cHot, hot));
            }
            flush(cp);
            const fy = st.pos === 'bottom' ? -BH - 0.12 : BH + 0.8;
            flame2.position.set(0, st.pos === 'bottom' ? -BH - 0.35 : BH + 0.6, 0); flame2.rotation.x = st.pos === 'bottom' ? 0 : Math.PI; burner2.position.set(0, st.pos === 'bottom' ? -BH - 0.65 : BH + 1.15, 0);
            flame2.scale.set(1, 0.9 + 0.12 * Math.sin(t * 25), 1);
            heatLab2.obj = [0, st.pos === 'bottom' ? -BH - 1.2 : BH + 1.75, 0];
            hotLab2.show(st.pos === 'bottom'); coldLab2.show(st.pos === 'bottom');
          } else {
            const open = st.vac ? 0 : 1;
            airP.visible = !st.vac; foil.visible = st.foil; foilLab.show(st.foil);
            for (let i = 0; i < 60; i++) { const p = AP[i]; if (!st.vac) { p.x += p.vx * dt * 1.2; p.y += p.vy * dt * 1.2; p.z += p.vz * dt * 1.2; if (p.x > 2.55 || p.x < -2.8) p.vx = -p.vx; if (Math.abs(p.y) > 1.1) p.vy = -p.vy; if (Math.abs(p.z) > 1.1) p.vz = -p.vz; } put(airP, i, p.x, p.y, p.z, 1); }
            flush(airP);
            let hit = 0;
            for (let i = 0; i < NR; i++) {
              const r = rays[i]; r.u += dt * 0.35; if (r.u > 1) { r.u = 0; r.rf = false; }
              const x0 = -3.3, x1 = 2.85, fx = 1.2; let x = x0 + (x1 - x0) * r.u;
              if (st.foil && x >= fx - 0.05 && !r.rf && r.u < 0.8) r.rf = true;
              if (r.rf) { const xf = fx - 0.05, back = (x - xf); x = xf - Math.max(0, back); if (x < x0) { r.u = 0; r.rf = false; } r.m.material.color.setHex(0xffffff); }
              else { r.m.material.color.setHex(0xffd34d); if (r.u > 0.97) hit++; }
              r.m.position.set(x, r.y, r.z);
              r.m.visible = !(st.foil && !r.rf && x > fx);
            }
            const rate = st.foil ? 0.0 : 1.0; Tobj += ((rate) - Tobj) * Math.min(1, dt * 0.35);
            obj.material.color.copy(new THREE.Color(0x7ba7e0)).lerp(new THREE.Color(0xff6a3d), Tobj); obj.material.emissive.setRGB(Tobj * 0.5, Tobj * 0.1, 0);
            vacLab.set(st.vac ? '진공 (공기 없음)' : '공기 있음');
            sun.scale.setScalar(1 + 0.02 * Math.sin(t * 3));
          }
        },
        sync() {},
      };
    },
  });
})();
