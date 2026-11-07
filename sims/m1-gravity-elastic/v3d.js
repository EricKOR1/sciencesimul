/* m1-gravity-elastic · 3D 중력의 방향 · 용수철의 탄성력 · 질량과 무게 (2D 장면과 같은 구성)
   중력: 북극·대한민국·남극·적도 반대편 어디서나 지구 중심 쪽. 탄성력: 1 N 추를 단 용수철, 늘어난 길이에 비례. 질량과 무게: 1 kg 물체는 지구 9.8 N, 달 1.6 N.
   2D의 사과·추·용수철저울 상태를 그대로 읽어 따라가요. ▶ 재생은 장면마다 한 번의 과정(떨어뜨리기 · 추 달기 · 지구에서 달로)을 반복해요.
   1단계(중력의 방향)만 3D예요: 아래 막대의 🍎 단추로 네 곳의 사과를 놓아요(2D 화면에서 아이를 누른 것과 같은 동작).
   용수철 끌기 · 추 달기 · 표와 그래프 · 저울에 추 끌어 놓기(2 · 3 · 4단계)는 2D 화면이에요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHN0 = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  window.SciSim3D.attach({
    title: '중력과 탄성력 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    levels: [0],   // 1단계(지구 둘레 네 곳의 사과)만 3D
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

      const GE = 9.8, GM = 1.6;       // 2D와 같은 값: 지구 9.8 N/kg, 달 1.6 N/kg (약 1/6)
      const L2 = () => (ctx.lesson && ctx.lesson()) || null;
      const cl = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
      const sm = (x) => { x = cl(x, 0, 1); return x * x * (3 - 2 * x); };
      const rf = (v) => Math.round(v * 10) / 10;

      /* ===== A) 중력의 방향: 지구 둘레의 사과 (2D의 네 곳: 북극 · 대한민국 · 남극 · 적도 반대편) ===== */
      const A = new THREE.Group(); root.add(A);
      const RE = 2.6;
      const tex = canvasTex(512, 256, (c, w, h) => { c.fillStyle = '#2f7fd8'; c.fillRect(0, 0, w, h); c.fillStyle = '#4caf6a'; let s = 7; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
        for (let i = 0; i < 26; i++) { const x = r() * w, y = 35 + r() * (h - 70); for (let j = 0; j < 9; j++) { c.beginPath(); c.ellipse(x + (r() - 0.5) * 60, y + (r() - 0.5) * 34, 10 + r() * 30, 6 + r() * 16, r() * 3, 0, 7); c.fill(); } }
        c.fillStyle = '#f2f6fa'; c.fillRect(0, 0, w, 14); c.fillRect(0, h - 14, w, 14); });
      const earth = new THREE.Mesh(new THREE.SphereGeometry(RE, 64, 48), mat(0xffffff, { map: tex, roughness: 0.75 })); A.add(earth);
      const core = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10), mat(0xffd23f, { emissive: 0x886600 })); A.add(core);
      const SPOTS = [{ n: '북극', deg: 0 }, { n: '대한민국 (북위 약 37°)', deg: 53 }, { n: '남극', deg: 180 }, { n: '적도 반대편', deg: 270 }];
      const HO = 1.6, apples = [];
      SPOTS.forEach((s) => {
        const r = s.deg * Math.PI / 180, d = new V3(Math.sin(r), Math.cos(r), 0), g = new THREE.Group();
        const ap = new THREE.Mesh(new THREE.SphereGeometry(0.3, 24, 18), mat(0xe53935, { roughness: 0.35 })); g.add(ap);
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.2, 8), mat(0x6b4a2b)); stem.position.y = 0.3; g.add(stem);
        const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), mat(0x43a047)); leaf.scale.set(1.6, 0.4, 0.9); leaf.position.set(0.12, 0.38, 0); g.add(leaf);
        A.add(g);
        const ar = mkArrow(0xffb020, 0.045); A.add(ar);
        const lab = label(s.n, g, { size: 11.5, offset: [d.x * 0.9, d.y * 0.7 + 0.1, 0] });
        apples.push({ g, d, ar, h: HO, lab });
      });
      const gLab = label('지구 중심', core, { size: 11.5, offset: [0.2, -0.45, 0.2] });
      const dirText = label('화살표 = 중력 (모두 지구 중심 쪽)', [0, -RE - 1.4, 0], { size: 12, color: 'rgba(180,110,0,.92)' });

      /* ===== B) 용수철: 1 N 추 · 지구와 달의 용수철저울 ===== */
      const B = new THREE.Group(); root.add(B);
      function makeSpring(R, turns) { const pts = []; const n = turns * 14; for (let i = 0; i <= n; i++) { const a = i / 14 * 6.2832, y = -i / n; pts.push(new V3(Math.cos(a) * R, y, Math.sin(a) * R)); }
        const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), n * 2, 0.045, 8, false); return new THREE.Mesh(geo, mat(0xcbd5e1, { metalness: 0.8, roughness: 0.25 })); }
      function makeRig(x, name, floorCol, nameCol) {
        const g = new THREE.Group(); g.position.x = x; B.add(g);
        const top = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.2, 0.6), mat(0x64748b, { metalness: 0.5, roughness: 0.4 })); top.position.y = 3.4; g.add(top);
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 6.6, 12), mat(0x64748b, { metalness: 0.5 })); post.position.set(-1.1, 0.2, -0.2); g.add(post);
        const floor = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 2, 0.25, 40), mat(floorCol, { roughness: 0.9 })); floor.position.y = -3.2; g.add(floor);
        const sp = makeSpring(0.28, 9); sp.position.y = 3.3; g.add(sp);
        const hook = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.025, 8, 16), mat(0xcbd5e1, { metalness: 0.8 })); hook.rotation.x = Math.PI / 2; g.add(hook);
        const wts = []; for (let i = 0; i < 5; i++) { const w = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.42, 0.62), mat(0xf59e0b, { metalness: 0.4, roughness: 0.4 })); w.visible = false; g.add(w); wts.push(w); }
        const obj = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), mat(0x7c8aa0, { metalness: 0.5, roughness: 0.4 })); obj.visible = false; g.add(obj);
        const wA = mkArrow(0xe5484d, 0.07), eA = mkArrow(0x2f6df6, 0.07); g.add(wA, eA);
        const nl = label(name, [x, -3.2, 0], { size: 13, color: nameCol, offset: [0, -0.5, 0] });
        const bl = label('', g, { size: 12, offset: [1.3, 0, 0] });
        return { g, sp, hook, wts, obj, wA, eA, bl, nl, floor };
      }
      const rigS = makeRig(0, '용수철', 0x6b4a36, 'rgba(30,80,170,.92)');
      const rigE = makeRig(-3.4, '지구', 0x6b4a36, 'rgba(30,80,170,.92)');
      const rigM = makeRig(3.4, '달', 0x8b8578, 'rgba(90,85,70,.92)');
      const eqLab = label('중력(무게)과 탄성력이 같아서 멈춰요', [0, 3.9, 0], { size: 12, color: 'rgba(60,60,60,.9)' });
      /* 용수철 하나를 그려요: ext = 늘어난 길이(그림 단위), n = 1 N 추 개수, kg = 물체(1 kg) 달기, W = 무게(N), eN = 탄성력 크기(N)·방향 */
      function setRig(r, o) {
        const len = cl(0.9 + o.ext, 0.45, 5.2);
        r.sp.scale.y = len; r.hook.position.y = 3.3 - len - 0.05;
        let by = 3.3 - len - 0.12;
        r.wts.forEach((w, i) => { const on = i < (o.n || 0); w.visible = on; if (on) { w.position.set(0, by - 0.21, 0); by -= 0.44; } });
        r.obj.visible = !!o.kg; if (o.kg) { r.obj.position.y = 3.3 - len - 0.62; by = r.obj.position.y - 0.45; }
        const ay = (o.kg ? 3.3 - len - 0.62 : by + 0.2);
        const W = o.W || 0, fl = 0.1 * W;
        if (W > 0.05) {
          setArrow(r.wA, new V3(0.75, ay, 0), new V3(0.75, ay - fl - 0.3, 0)); setArrow(r.eA, new V3(-0.75, ay, 0), new V3(-0.75, ay + o.eUp * (fl + 0.3), 0));
          r.eA.visible = Math.abs(o.eUp) > 0.05;
        } else { r.wA.visible = false; r.eA.visible = false; }
        r.bl.set(o.txt || ''); r.bl.show(!!o.txt);
      }

      /* ---- ▶ 재생: 장면에 맞게 한 번의 과정을 반복 ---- */
      let pmode = false, built = false, pP = 0, sig = '', lastTxt = '';
      const pl = controls.player({
        duration: 10, loop: true, autoplay: false, label: '재생', phases: [[0, '']],
        onFrame(p) { if (!built) return; pmode = true; pP = p; },
      });
      built = true;
      const phEl = () => document.querySelector('.v3-player .v3-ph');
      /* 🍎 단추: 2D 화면에서 아이를 누른 것과 같은 동작이에요 (들고 있으면 놓고, 떨어진 사과는 다시 주워요) → 미션 진행을 함께 써요 */
      const kidBs = ['북극', '대한민국', '남극', '적도 반대편'].map((n, i) => controls.button('🍎 ' + n, () => { const l = L2(); if (l && l.tapKid) l.tapKid(i); }));
      const setInfo = (h) => { if (h !== lastTxt) { lastTxt = h; info(h); } };
      let cur = '';
      function setView(v) {
        cur = v; A.visible = v === 'G'; B.visible = v !== 'G';
        const gv = v === 'G';
        apples.forEach((a) => a.lab.show(gv)); gLab.show(gv); dirText.show(gv);
        rigS.g.visible = v === 'S'; rigE.g.visible = rigM.g.visible = v === 'W';
        [rigS, rigE, rigM].forEach((r) => { r.nl.show(false); r.bl.show(false); });
        rigE.nl.show(v === 'W'); rigM.nl.show(v === 'W'); rigS.nl.show(v === 'S'); eqLab.show(v === 'S');
        orb.dist = (PHN0 ? 1.05 : 1) * (gv ? 17 : v === 'S' ? 14 : 17);
      }
      const orb = ctx.orbit;

      return {
        update(dt, t) {
          const l = L2(), sc0 = l ? l.scene : 'G';
          const sc = sc0 === 'G' ? 'G' : sc0 === 'S' ? 'S' : sc0 === 'W' ? 'W' : (cur || 'G');
          const SP = l && l.SP, K = l && l.G && l.G.kids;
          const key = [sc, K && K.map((k) => k.st).join(''), SP && SP.items.map((i) => i.att ? 1 : 0).join(''), SP && !!SP.hand].join();
          if (key !== sig) { sig = key; if (pmode) { pmode = false; pl.pause(); } }
          if (sc !== cur) setView(sc);
          const ph = phEl();
          if (sc === 'G') {
            apples.forEach((a, i) => {
              const k = K && K[i];
              let h;
              if (pmode) {
                // 들고 있어요(0~0.25) → 떨어져요(~0.5) → 땅에 닿아요 → 다시 들어 올려요(0.85~1)
                const q = pP; h = q < 0.25 ? HO : q < 0.5 ? HO - (HO - 0.3) * sm((q - 0.25) / 0.25) * 0 - (HO - 0.3) * Math.pow((q - 0.25) / 0.25, 2) : q < 0.85 ? 0.3 : 0.3 + (HO - 0.3) * sm((q - 0.85) / 0.15);
              } else if (k) {
                h = k.st === 'fall' ? HO - (HO - 0.3) * Math.pow(cl(k.t / 0.6, 0, 1), 2) : k.st === 'land' ? 0.3 : k.st === 'pick' ? 0.3 + (HO - 0.3) * sm(k.t / 0.42) : HO + 0.08 * Math.sin(t * 2 + i);
              } else h = HO;
              const p = a.d.clone().multiplyScalar(RE + h); a.g.position.copy(p); a.g.quaternion.setFromUnitVectors(new V3(0, 1, 0), a.d);
              const falling = pmode ? (pP >= 0.25 && pP < 0.85) : !!(k && (k.st === 'fall' || k.st === 'land'));
              setArrow(a.ar, p.clone().add(a.d.clone().multiplyScalar(-0.35)), p.clone().add(a.d.clone().multiplyScalar(-0.35 - 1.15)));
              a.ar.visible = pmode ? pP >= 0.25 : !!(k && (k.done || k.st !== 'held'));   // 화살표(중력)는 사과를 놓은 뒤에 보여요
            });
            core.scale.setScalar(1 + 0.15 * Math.sin(t * 3));
            if (ph) ph.textContent = pmode ? (pP < 0.25 ? '들고 있어요' : pP < 0.5 ? '떨어져요' : pP < 0.85 ? '땅에 닿아요' : '다시 들어 올려요') : '';
            const nDone = K ? K.filter((k) => k.done).length : 0;
            setInfo(pmode || nDone >= 4 ? '<b>중력</b>은 지구가 물체를 <b>지구 중심</b> 쪽으로 끌어당기는 힘이에요.<br>북극·대한민국·남극·적도 반대편 어디에서나 사과는 <b>지구 중심 쪽</b>(아래)으로 떨어져요.'
              : '지구의 네 곳에서 사과를 들고 있어요. 아래 <b>🍎 단추</b>를 눌러 사과를 놓아 보세요. 사과는 어느 쪽으로 떨어질까요?' + (nDone ? '<br>사과 ' + nDone + '개가 떨어졌어요.' : ''));
            dirText.show(pmode || nDone >= 4);
            kidBs.forEach((b, i) => { const k = K && K[i]; b.classList.toggle('on', !!(k && k.done)); });
          } else if (sc === 'S') {
            const N = SP ? SP.items.filter((i) => i.att).length : 0;
            let n, ext, hand = false;
            if (pmode) { const q = pP < 0.8 ? sm(pP / 0.8) : 1 - sm((pP - 0.8) / 0.2); n = Math.round(5 * q); ext = 0.7 * n; }
            else { n = SP ? l.loadN() : 0; ext = SP ? cl(SP.x / l.CMPX * 0.35, -0.8, 3.6) : 0; hand = !!(SP && SP.hand); }
            const dev = hand ? Math.sign(ext) : 0;
            setRig(rigS, { n, ext, W: n, eUp: hand ? -Math.sign(ext) : 1, txt: n ? '추 ' + n + '개 = ' + n + ' N' : '' });
            if (hand && Math.abs(ext) > 0.1) { setArrow(rigS.eA, new V3(-0.75, 1.0, 0), new V3(-0.75, 1.0 - Math.sign(ext) * 1.1, 0)); rigS.eA.visible = true; }
            if (ph) ph.textContent = pmode ? (pP < 0.8 ? '추를 하나씩 달아요' : '추를 내려요') : '';
            setInfo('<b>탄성력</b>은 변형된 용수철이 원래 모양으로 되돌아가려는 힘이에요. 방향은 변형된 방향과 <b>반대</b>이고, 크기는 <b>늘어난 길이에 비례</b>해요.<br>' + (n ? '1 N 추 <b>' + n + '개</b>를 달면 무게 ' + n + ' N = 탄성력 ' + n + ' N이 되어 멈춰요 (늘어난 길이 ' + rf(Math.max(0, pmode ? n * 2 : (SP ? SP.x / l.CMPX : 0))) + ' cm).' : ''));
          } else if (sc === 'W') {
            const loadE = pmode ? (pP < 0.45 ? sm(pP / 0.1) * (1 - sm((pP - 0.4) / 0.05)) : 0) : (l && l.SC && l.SC.E.item ? 1 : 0);
            const loadM = pmode ? (pP > 0.5 && pP < 0.95 ? sm((pP - 0.5) / 0.1) * (1 - sm((pP - 0.9) / 0.05)) : 0) : (l && l.SC && l.SC.M.item ? 1 : 0);
            setRig(rigE, { kg: loadE > 0.02, ext: 0.3 * GE * loadE * 0.55, W: GE * loadE, eUp: 1, txt: loadE > 0.02 ? '1 kg · 무게 ' + rf(GE) + ' N' : '' });
            setRig(rigM, { kg: loadM > 0.02, ext: 0.3 * GM * loadM * 0.55, W: GM * loadM, eUp: 1, txt: loadM > 0.02 ? '1 kg · 무게 ' + rf(GM) + ' N' : '' });
            rigE.obj.scale.setScalar(1); rigM.obj.scale.setScalar(1);
            if (ph) ph.textContent = pmode ? (pP < 0.45 ? '지구에서 재요' : pP < 0.5 ? '달로 옮겨요' : pP < 0.95 ? '달에서 재요' : '') : '';
            setInfo('<b>질량</b>은 물체의 고유한 양(1 kg)으로 장소가 바뀌어도 변하지 않아요. <b>무게</b>는 중력의 크기(N)로 장소에 따라 달라요.<br>1 kg 물체의 무게: 지구 <b>' + GE + ' N</b>, 달 <b>' + GM + ' N</b> (지구의 약 1/6).' + (pmode ? '' : ''));
          } else {
            setInfo('용수철저울은 탄성력이 늘어난 길이에 비례하는 성질로 무게를 재요.');
          }
        },
        sync() {},
      };
    },
  });
})();
