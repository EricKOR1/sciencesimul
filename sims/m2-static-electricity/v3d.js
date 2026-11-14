/* m2-static-electricity · 3D 마찰 전기와 정전기 유도
   ① 마찰 전기(전자의 이동) ② 전기력 ③ 정전기 유도 ④ 검전기를 입체로 살펴봐요.
   2D 실험 상태(window.__sim.S)를 그대로 따라가요: 장면 · 막대의 위치 · 전자의 이동 · 막대의 (−)/(+) · 금속박의 벌어짐.
   파랑 (−) = 전자(음전하), 빨강 (+) = 양전하. 움직이는 것은 전자뿐이에요.
   막대를 움직이거나 (−)/(+)를 바꾸는 것은 2D 화면의 조작을 쓰고, ▶ 재생은 마찰 전기에서 전자가 옮겨 가는 과정을 보여 줘요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHN = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const NEG = 0x3f78ff, POS = 0xff4a55;
  const SCN = ['rub', 'force', 'induce', 'scope'];
  const NMAX = 6;                       // 2D에서 한 번에 이동하는 전자 수의 최댓값
  const CAPC = { 가: 0xf26b3a, 나: 0x16a34a, 다: 0x2563eb };
  const FUR = { x: 40, w: 236 }, CONTACT_Y = 287, PIV = { x: 330, y: 44 }, TH_L = 195;     // 2D 화면의 치수(px)
  const BAR = { x: 270, y: 190, w: 360, h: 76 }, BC = { x: 450, y: 228 };

  window.SciSim3D.attach({
    title: '정전기 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: PHN ? 13 : 10.5, theta: PHN ? -0.6 : 0.3, phi: 1.25, min: 5, max: 22, target: [1.0, -0.4, 0] },   // 휴대폰: 털가죽과 막대가 비스듬히 놓여 화면에 다 들어와요
    autoRotate: 0,
    levels: [0],                     // 1단계(마찰 전기): ▶ 문지르기로 막대를 문질러요. 2~4단계는 막대를 끌어 가까이 대고 막대를 눌러 고르는 미션이라 2D
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const V3 = THREE.Vector3;
      const MT = ctx.mats, lc = (h) => new THREE.Color(h).convertSRGBToLinear();   // 화면에서 색이 바래지 않게 ((−) 파랑 · (+) 빨강이 또렷하게)
      const mat = (c, o) => { const q = Object.assign({ color: lc(c), roughness: 0.5, metalness: 0.05 }, o || {}); if (typeof q.emissive === 'number') q.emissive = lc(q.emissive); return new THREE.MeshStandardMaterial(q); };
      const sm = () => window.__sim;
      const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
      // ± 표시 (스프라이트)
      const texC = {};
      function tex(sign) {
        if (texC[sign]) return texC[sign];
        const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
        g.fillStyle = sign > 0 ? '#e2464b' : '#2f6df6'; g.beginPath(); g.arc(32, 32, 29, 0, 7); g.fill();
        g.strokeStyle = '#fff'; g.lineWidth = 8; g.lineCap = 'round'; g.beginPath(); g.moveTo(18, 32); g.lineTo(46, 32); if (sign > 0) { g.moveTo(32, 18); g.lineTo(32, 46); } g.stroke();
        const t = new THREE.CanvasTexture(c); return (texC[sign] = t);
      }
      function mark(sign, s) { const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex(sign), transparent: true, depthTest: false })); m.scale.setScalar(s || 0.34); m.renderOrder = 10; return m; }
      function setMark(m, sign, a) { if (!sign) a = 0; if (sign) m.material.map = tex(sign); m.material.opacity = a; m.visible = a > 0.03; m.material.needsUpdate = true; }
      function arrow(col) {
        const g = new THREE.Group(), m = new THREE.MeshStandardMaterial({ color: lc(col), emissive: lc(col), emissiveIntensity: 0.4, roughness: 0.4 });
        const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1, 10), m), hd = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.4, 14), m); g.add(sh, hd); g.userData = { sh, hd }; return g;
      }
      function setArrowX(g, x0, x1, y, z, on, w) { // 가로 화살표
        const L = Math.abs(x1 - x0), dir = Math.sign(x1 - x0) || 1; g.visible = !!on && L > 0.05; if (!g.visible) return;
        const { sh, hd } = g.userData, sl = Math.max(0.01, L - 0.4);
        g.position.set(x0, y, z); g.rotation.set(0, 0, -dir * Math.PI / 2); sh.scale.set(w || 1, sl, w || 1); sh.position.y = sl / 2; hd.position.y = sl + 0.2;
      }
      const cTex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); if (THREE.sRGBEncoding) t.encoding = THREE.sRGBEncoding; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; };
      const woodT = cTex(512, 256, (c, w, h) => { c.fillStyle = '#5a3a20'; c.fillRect(0, 0, w, h); for (let i = 0; i < 70; i++) { c.strokeStyle = 'rgba(' + (30 + (i * 23) % 40) + ',16,6,' + (0.12 + (i % 4) * 0.05) + ')'; c.lineWidth = 1 + (i % 3); c.beginPath(); const y = i / 70 * h; c.moveTo(0, y); for (let x = 0; x <= w; x += 32) c.lineTo(x, y + Math.sin(x * 0.04 + i) * 2.5); c.stroke(); } });
      woodT.repeat.set(2, 1);
      const floor = new THREE.Mesh(new THREE.BoxGeometry(16, 0.3, 7), mat(0xffffff, { map: woodT, roughness: 0.5 })); floor.position.set(0, -2.45, 0); floor.receiveShadow = true; floor.userData.v3bg = true; root.add(floor);
      const wallT = cTex(8, 256, (c, w, h) => { const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#27375a'); g.addColorStop(1, '#0e1830'); c.fillStyle = g; c.fillRect(0, 0, w, h); });
      const wallM = new THREE.Mesh(new THREE.PlaneGeometry(90, 40), new THREE.MeshBasicMaterial({ map: wallT })); wallM.position.set(0, 8, -14); root.add(wallM);
      // 막대 양 끝을 둥글게 (같은 재질을 써서 색이 함께 바뀌어요)
      function caps(cyl, len, r) { [-1, 1].forEach((sg) => { const c = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), cyl.material); c.position.y = sg * len / 2; cyl.add(c); }); }
      const rodMat = (q) => (q > 0 ? 0x9fd8ee : 0x8a6fd1);      // 2D처럼 (+)는 유리 막대, (−)는 플라스틱 막대

      let scene = 'rub';
      const G = {}; SCN.forEach((s) => { G[s] = new THREE.Group(); G[s].visible = false; root.add(G[s]); });
      const labsBy = {};
      const lb = (sc, t, o, off, col) => { const l = label(t, o, { offset: off, color: col }); (labsBy[sc] = labsBy[sc] || []).push(l); l.show(false); return l; };

      /* ===== A. 마찰 전기 ===== */
      const A = {};
      {
        const g = G.rub;
        const cloth = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.35, 2.8), MT.fabric(lc(0xcfa98a), { repeat: 8 })); cloth.position.set(0, -1.9, 0); cloth.receiveShadow = true; g.add(cloth);
        { const N = 900, fg = new THREE.ConeGeometry(0.035, 0.26, 5); fg.translate(0, 0.13, 0); const fur = new THREE.InstancedMesh(fg, mat(0xffffff, { roughness: 0.95 }), N), mm = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), cc = new THREE.Color(); let sd = 7; const rr = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
          for (let i = 0; i < N; i++) { e.set((rr() - 0.5) * 0.7, 0, (rr() - 0.5) * 0.7); q.setFromEuler(e); mm.compose(new V3((rr() - 0.5) * 4.3, -1.72, (rr() - 0.5) * 2.7), q, new V3(1, 0.8 + rr() * 0.7, 1)); fur.setMatrixAt(i, mm); fur.setColorAt(i, cc.setHSL(0.07 + rr() * 0.03, 0.4, 0.55 + rr() * 0.18)); }
          fur.receiveShadow = true; g.add(fur); }
        A.rod = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 3.9, 28), MT.plastic(lc(0x8a6fd1), { roughness: 0.16 })); A.rod.rotation.z = Math.PI / 2; A.rod.castShadow = true; A.rod.material.roughness = 0.15; caps(A.rod, 3.9, 0.3); g.add(A.rod);
        A.pm = []; A.nm = []; A.el = [];
        for (let i = 0; i < NMAX; i++) {
          const p = mark(1, 0.34), n = mark(-1, 0.34); g.add(p, n); A.pm.push(p); A.nm.push(n);
          const e = new THREE.Mesh(new THREE.SphereGeometry(0.12, 14, 10), mat(NEG, { emissive: 0x1a3ab0, emissiveIntensity: 0.7, roughness: 0.25 })); ctx.halo(e, 0x6f9dff, 0.55, 0.5); g.add(e); A.el.push(e);
        }
        lb('rub', '털가죽', cloth, [-2.0, 0.45, 0]); lb('rub', '플라스틱 막대', A.rod, [0, 0.8, 0]);
        A.t = 0; A.dist = 0; A.lastMove = -9; A.n = 0;
      }
      /* ===== B. 전기력 ===== */
      const B = {}, U = 1 / 62, PIVY = 3.2;
      {
        const g = G.force;
        const bar = new THREE.Mesh(new THREE.BoxGeometry(6.5, 0.14, 0.2), MT.metal('steel', { roughness: 0.3 })); bar.position.set(-0.2, PIVY, 0); g.add(bar);
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.2, 7.6, 0.2), MT.metal('steel', { roughness: 0.3 })); post.position.set(-3.4, PIVY - 3.6, 0); g.add(post);
        function rodObj() {
          const o = new THREE.Group(), m = MT.plastic(lc(0x8a6fd1), { roughness: 0.16 });
          const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 2.42, 24), m); cyl.castShadow = true; caps(cyl, 2.42, 0.21); o.add(cyl);
          const ms = []; for (let i = 0; i < 5; i++) { const k = mark(-1, 0.34); k.position.set(0, (i - 2) * 0.46, 0.3); o.add(k); ms.push(k); }
          o.userData = { cyl, ms }; return o;
        }
        B.hang = new THREE.Group(); B.hang.position.set(0, PIVY, 0); g.add(B.hang);
        const thread = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 122 * U, 6), new THREE.MeshBasicMaterial({ color: 0xd0d6e4 })); thread.position.y = -61 * U; B.hang.add(thread);
        B.hr = rodObj(); B.hr.position.y = -(TH_L - 2) * U; B.hang.add(B.hr);
        B.held = rodObj(); g.add(B.held);
        B.ar = [arrow(0xf26b3a), arrow(0xf26b3a)]; B.ar.forEach((a) => g.add(a));
        B.lf = lb('force', '전기력', B.ar[0], [0, 0.6, 0], 'rgba(242,107,58,.95)'); B.lf.el.style.color = '#fff';
        lb('force', '매달린 막대', B.hr, [0, 1.6, 0.2]); lb('force', '손에 든 막대', B.held, [0, 1.6, 0.2]);
      }
      /* ===== C. 정전기 유도 ===== */
      const Cc = {};
      {
        const g = G.induce, K = 4.4 / BAR.w;
        Cc.K = K;
        Cc.rod = new THREE.Group(); const rm = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 3.0, 28), MT.plastic(lc(0x8a6fd1), { roughness: 0.16 })); rm.rotation.z = Math.PI / 2; caps(rm, 3.0, 0.34); Cc.rod.add(rm); Cc.rmat = rm.material;
        Cc.rm = []; for (let i = 0; i < 4; i++) { const m = mark(-1, 0.32); Cc.rod.add(m); Cc.rm.push(m); } g.add(Cc.rod);
        Cc.cond = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 4.4, 36), MT.metal('aluminium', { roughness: 0.22, extra: { transparent: true, opacity: 0.45, depthWrite: false } })); Cc.cond.rotation.z = Math.PI / 2; Cc.cond.position.set(1.8, 0, 0); Cc.cond.renderOrder = 2; g.add(Cc.cond);
        Cc.els = []; Cc.ex = []; Cc.ions = [];
        for (let i = 0; i < 18; i++) {
          const x = -1.9 + (i % 6) * 0.76, y = (Math.floor(i / 6) - 1) * 0.45, z = (i % 2 ? 0.2 : -0.2);
          const ion = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8), mat(POS, { emissive: 0x7a1010, emissiveIntensity: 0.5 })); ion.position.set(1.8 + x, y, z); g.add(ion); Cc.ions.push(ion);
          const el = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8), mat(NEG, { emissive: 0x1a3ab0, emissiveIntensity: 0.7 })); el.position.set(1.8 + x + 0.2, y + 0.1, z + 0.1); g.add(el); Cc.els.push(el); Cc.ex.push(el.position.clone());
        }
        Cc.nm = mark(-1, 0.55); Cc.fm = mark(1, 0.55); g.add(Cc.nm, Cc.fm);
        // 종잇조각 (2D의 '종잇조각' 고르기)
        Cc.bench = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.2, 2.2), MT.wood(0xe6d2b4)); Cc.bench.position.set(1.8, -1.55, 0); g.add(Cc.bench);
        Cc.bits = [0, 1, 2].map((j) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.03, 0.34), mat(0xffffff, { roughness: 0.9 })); g.add(m); return m; });
        Cc.l1 = lb('induce', '가까운 쪽', Cc.cond, [-1.7, 1.2, 0]); Cc.l2 = lb('induce', '먼 쪽', Cc.cond, [2.1, 1.2, 0]);
        lb('induce', '대전체(막대)', Cc.rod, [0, 0.9, 0]);
      }
      /* ===== D. 검전기 ===== */
      const Dd = {};
      {
        const g = G.scope;
        const jar = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 3.4, 40, 1, true), MT.glass({ opacity: 0.2 })); jar.position.y = -0.5; jar.renderOrder = 2; g.add(jar);
        const base = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.7, 0.2, 40), MT.plastic(lc(0x2a3040), { roughness: 0.45 })); base.position.y = -2.25; g.add(base);
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.6, 12), MT.metal('brass', { roughness: 0.25 })); stem.position.y = 0.2; g.add(stem);
        Dd.knob = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.16, 36), MT.metal('brass', { roughness: 0.2 })); Dd.knob.position.y = 1.5; Dd.knob.castShadow = true; g.add(Dd.knob);
        Dd.lv = [-1, 1].map((s) => { const p = new THREE.Group(); p.position.set(0, -1.0, 0); const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.3, 0.8), MT.metal('gold', { roughness: 0.2 })); leaf.position.y = -0.65; p.add(leaf); g.add(p); return p; });
        Dd.rod = new THREE.Group(); const rm = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 3, 28), MT.plastic(lc(0x8a6fd1), { roughness: 0.16 })); rm.rotation.z = Math.PI / 2; caps(rm, 3, 0.3); Dd.rod.add(rm); Dd.rmat = rm.material; g.add(Dd.rod);
        Dd.km = mark(1, 0.4); Dd.lm = [mark(1, 0.34), mark(1, 0.34)]; g.add(Dd.km, ...Dd.lm);
        Dd.lbRod = lb('scope', '막대', Dd.rod, [0, 0.8, 0]); lb('scope', '금속 박', Dd.lv[1], [0.9, -0.7, 0]); lb('scope', '금속판', Dd.knob, [1.3, 0.3, 0]);
      }

      /* ===== 정보 글 (2D 차시와 같은 말) ===== */
      const sgn = (q) => (q > 0 ? '(+)' : '(−)');
      function textRub(n) {
        return `<b>마찰 전기</b>: 플라스틱 막대로 털가죽을 문질러요. <b>▶ 문지르기</b>를 눌러 보세요.<br>파란 <b>전자</b>가 어디에서 어디로 옮겨 가는지 지켜보세요.<br>옮겨 간 전자 <b>${n}개</b>${n >= 4 ? ' → 막대가 (−)로 대전됐어요!' : ''}`;
      }
      function textForce(f) {
        return (f.same ? '<b>같은 종류</b>의 전기끼리는 서로 <b>밀어요</b>.' : '<b>다른 종류</b>의 전기끼리는 서로 <b>끌어당겨요</b>.') + `<br>매달린 막대 ${sgn(f.hq)} · 손에 든 막대 ${sgn(f.hq2)} — 가까이 갈수록 전기력(화살표)이 커져요.`;
      }
      function textInd(I) {
        if (I.obj === 'paper') return '전기를 띠지 않은 <b>종잇조각</b>도 대전체를 가까이 하면 끌려와요.<br>종이 속 전자가 조금 움직여 가까운 쪽에 <b>다른 종류</b>의 전기가 나타나기 때문이에요.';
        return `${sgn(I.q)} 막대를 가까이 하면 금속 막대 속 <b>전자</b>가 ${I.q < 0 ? '<b>밀려서</b> 먼 쪽으로' : '<b>끌려서</b> 가까운 쪽으로'} 움직여요.<br>가까운 쪽엔 <b>다른 종류</b>, 먼 쪽엔 <b>같은 종류</b>의 전기가 나타나요. (정전기 유도)`;
      }
      let lastInfo = '';
      const say = (h) => { if (h !== lastInfo) { lastInfo = h; info(h); } };

      /* ===== 조작: 2D 상태를 따라가요 ===== */
      let labOn = true, now = 0, pl = null, internal = false, lastN = -1;
      function setScene(s) {
        if (!G[s]) return;
        scene = s; SCN.forEach((q) => { G[q].visible = q === s; });
        Object.keys(labsBy).forEach((k) => labsBy[k].forEach((l) => l.show(labOn && k === s)));
        playerRow(s === 'rub'); lastInfo = '';
      }
      // ▶ 재생: 문지르는 동안 털가죽의 전자가 막대로 한 개씩 옮겨 가요 (2D 실험도 같은 상태가 돼요)
      pl = controls.player({
        duration: 9, loop: true, autoplay: false, label: '문지르기',
        phases: [[0, '문지르기 시작'], [0.2, '전자가 털가죽 → 막대'], [0.85, '(−)로 대전된 막대']],
        onFrame(p) {
          if (internal || !pl) return;
          const n = Math.round(clamp(p / 0.85, 0, 1) * NMAX), s = sm();
          A.t += 0.4; A.lastMove = now;
          if (n !== lastN) { lastN = n; if (s && s.presetRub && s.S && s.S.scene === 'rub') s.presetRub(n); }
        },
      });
      let ctlEl = null;
      function playerRow(on) { if (!ctlEl) ctlEl = ctx.renderer.domElement.closest('.v3-wrap').querySelector('.v3-ctl'); const r = ctlEl && ctlEl.querySelector('.v3-player'); if (r) r.style.display = on ? '' : 'none'; }
      controls.button('이름표', () => { labOn = !labOn; Object.keys(labsBy).forEach((k) => labsBy[k].forEach((l) => l.show(labOn && k === scene))); });
      setScene('rub');
      function fromScene() { const s = sm() && sm().S && sm().S.scene; if (s && s !== scene && G[s]) setScene(s); }
      let k0 = 0;
      return {
        sync() { fromScene(); },
        update(dt, t) {
          now = t;
          if ((k0++ % 10) === 0) fromScene();
          const S = sm() && sm().S; if (!S) return;
          if (scene === 'rub') {
            const r = S.rub, R = S.rod, n = Math.min(NMAX, r.arrived || 0);
            if (r.dist !== A.dist) { A.dist = r.dist; A.lastMove = t; }
            const rubbing = t - A.lastMove < 0.35;
            A.rod.position.set((R.x - (FUR.x + FUR.w / 2)) * (4.4 / FUR.w), -1.3 + clamp((CONTACT_Y - R.y) * 0.0186, -1.2, 0.9), 0);
            A.rod.rotation.z = Math.PI / 2;
            for (let i = 0; i < NMAX; i++) {
              const ex = -1.7 + i * 0.68, ez = (i % 2 ? 0.6 : -0.6);
              const cl = new V3(ex, -1.66, ez), rd = new V3(A.rod.position.x + (i - 2.5) * 0.5, A.rod.position.y + 0.32, ez * 0.4);
              const moved = i < n, wob = rubbing ? Math.sin(t * 8 + i) * 0.08 : 0;
              A.el[i].position.copy(moved ? rd : cl); A.el[i].position.y += 0.05 * Math.sin(t * 3 + i) + wob;
              A.nm[i].position.set(rd.x, rd.y, ez > 0 ? 0.36 : -0.36); setMark(A.nm[i], -1, moved ? 0.95 : 0);
              A.pm[i].position.set(cl.x, -1.58, ez); setMark(A.pm[i], 1, moved ? 0.95 : 0);
            }
            say(textRub(n));
          } else if (scene === 'force') {
            const f = S.force, h = f.held, th = f.th.value;
            B.hang.rotation.z = th;
            B.hr.userData.cyl.material.color.copy(lc(rodMat(f.hq))); B.held.userData.cyl.material.color.copy(lc(rodMat(f.hq2)));
            B.hr.userData.ms.forEach((m, i) => { m.position.x = 0; setMark(m, f.hq, 1); });
            B.held.userData.ms.forEach((m) => setMark(m, f.hq2, 1));
            const hx = (f.hx != null ? f.hx : PIV.x + Math.sin(th) * TH_L), hy = (f.hy != null ? f.hy : PIV.y + Math.cos(th) * TH_L);
            B.held.position.set((h.x - PIV.x) * U, PIVY - (h.y - PIV.y) * U, 0);
            const s = f.strength || 0, dirF = (f.same ? -1 : 1) * Math.sign(h.x - hx || 1), L = (16 + 76 * s) * U * 1.3;
            const X0 = (hx - PIV.x) * U, Y0 = PIVY - (hy - PIV.y) * U, on = s > 0.06;
            setArrowX(B.ar[0], X0, X0 + dirF * L, Y0, 0.45, on, 1 + 0.6 * s);
            setArrowX(B.ar[1], B.held.position.x, B.held.position.x - dirF * L, B.held.position.y, 0.45, on, 1 + 0.6 * s);
            B.lf.show(labOn && s > 0.25);
            say(textForce(f));
          } else if (scene === 'induce') {
            const I = S.ind, K = Cc.K, paper = I.obj === 'paper', s = I.s || 0;
            Cc.cond.visible = !paper; Cc.ions.forEach((m) => { m.visible = !paper; }); Cc.els.forEach((m) => { m.visible = !paper; });
            Cc.bench.visible = paper; Cc.bits.forEach((m) => { m.visible = paper; });
            Cc.l1.show(labOn && !paper); Cc.l2.show(labOn && !paper);
            const tip = I.tip || { x: BC.x - 220, y: BC.y }, side = (I.ux >= 0 ? 1 : -1);
            const tx = 1.8 + (tip.x - BC.x) * K, ty = (BC.y - tip.y) * K;
            const dirR = tip.x < BC.x - 60 ? 1 : tip.x > BC.x + 60 ? -1 : (I.rod && I.rod.x < tip.x ? 1 : -1);   // 막대가 어느 쪽에서 오는지
            Cc.rod.position.set(tx - dirR * 1.5, ty, 0.1);
            Cc.rmat.color.copy(lc(rodMat(I.q)));
            Cc.rm.forEach((m, i) => { m.position.set(-0.9 + i * 0.6, 0.55, 0.1); setMark(m, I.q, 1); });
            if (!paper) {
              const shift = -dirR * I.q * s;                     // (−) 막대에서는 전자가 멀어지고, (+) 막대 쪽으로는 끌려와요
              Cc.els.forEach((e, i) => { e.position.set(Cc.ex[i].x + shift, Cc.ex[i].y + Math.sin(t * 2 + i) * 0.02, Cc.ex[i].z); });
              const nearX = dirR > 0 ? -0.55 : 4.1, farX = dirR > 0 ? 4.1 : -0.55, a = Math.min(1, s * 1.4);
              Cc.nm.position.set(nearX, 0, 0.9); setMark(Cc.nm, -I.q, a); Cc.fm.position.set(farX, 0, 0.9); setMark(Cc.fm, I.q, a);
            } else {
              Cc.nm.visible = Cc.fm.visible = false;
              (I.bits || []).forEach((b, j) => { const m = Cc.bits[j]; if (m) m.position.set(1.8 + (b.x - 450) * K * 1.0, -1.35 + (418 - b.y) * K, (j - 1) * 0.4); });
            }
            say(textInd(I));
          } else {
            const sc = S.scope, rods = sc.rods || [];
            let best = null; rods.forEach((r) => { if (!best || (r.s || 0) > (best.s || 0)) best = r; });
            const s = best ? (best.s || 0) : 0, vis = !!best && s > 0.02 || (best && best.grab);
            Dd.rod.visible = !!best && (s > 0.02 || best.grab); Dd.lbRod.show(labOn && Dd.rod.visible);
            if (best) { Dd.rodCap = best.name; Dd.rmat.color.copy(lc(CAPC[best.name] || 0x8a6fd1)); Dd.lbRod.set('막대 ' + best.name); }
            Dd.rod.position.set(0.5 + (1 - s) * 2.8, 2.7 - (1 - s) * 0.8, 0); Dd.rod.rotation.z = 0.3;
            const phi = sc.phi && typeof sc.phi.value === 'number' ? sc.phi.value : 0.06, k = sc.k || 0, a = Math.min(1, Math.abs(k) * 1.5);
            Dd.lv[0].rotation.z = phi; Dd.lv[1].rotation.z = -phi;
            // 막대의 전기 종류는 비밀(2D에서 알아내는 미션) — 금속박이 벌어지는 정도와 금속판 · 금속박의 유도 전하만 보여 줘요
            Dd.km.position.set(0.0, 1.7, 0.7); setMark(Dd.km, k > 0 ? 1 : -1, k ? a : 0);
            Dd.lv.forEach((p, i) => { const sd = i ? 1 : -1; Dd.lm[i].position.set(-sd * Math.sin(phi) * 1.0, -1.0 - Math.cos(phi) * 1.0, 0.45); setMark(Dd.lm[i], k > 0 ? -1 : 1, k ? a : 0); });
            say(`<b>검전기</b>: 대전체를 금속판에 가까이 하면 금속박이 <b>벌어져요</b>.<br>${Math.abs(k) > 0.15 ? '금속박에 <b>같은 종류의 전기</b>가 생겨 서로 밀어내기 때문이에요.' : '대전체를 가까이 가져와 보세요.'}`);
          }
        },
      };
    },
  });
})();
