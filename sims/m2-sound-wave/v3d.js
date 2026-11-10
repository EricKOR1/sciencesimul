/* m2-sound-wave · 3D 소리의 전달 (스피커에서 퍼지는 파동)
   공기 입자는 제자리에서 앞뒤로 떨리기만 하고, 촘촘한 곳(빨강)과 성긴 곳(파랑)이 퍼져 나가요.
   공기를 빼면 소리가 전달되지 않아요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHN = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const NX = 30, NY = 9, NZ = 5, SP = 0.5;
  const VOLN = ['아주 작게', '작게', '보통', '크게', '아주 크게'];

  window.SciSim3D.attach({
    host: (window.matchMedia && window.matchMedia('(max-width: 599px)').matches) ? '.sc-tall' : '.sc-wide',
    title: '소리 전달 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: PHN ? 16.5 : 16, theta: PHN ? 0.85 : 0.5, phi: 1.15, min: 6, max: 34, target: [PHN ? 0.4 : 1.3, 0, 0] },   // 휴대폰: 줄이 화면 안쪽으로 비스듬히 놓여 더 크게 보여요
    autoRotate: 0,
    levels: [0],                     // 1단계(줄 · 공기 · 진공 종): 공기 입자의 움직임을 입체로. 2~4단계는 소리 화면(오실로스코프)의 눈금과 점선 파형을 읽는 미션이라 2D
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const V3 = THREE.Vector3;
      const mat = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.5, metalness: 0.1 }, o || {}));
      const sm = () => window.__sim;
      const SX = -6.2;

      // 스피커
      const spk = new THREE.Group(); root.add(spk);
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.2, 1.4), mat(0x2f3850, { roughness: 0.6 })); body.castShadow = true; spk.add(body);
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.62, 0.45, 32, 1, true), mat(0xd7deee, { side: THREE.DoubleSide, roughness: 0.4 })); cone.rotation.z = Math.PI / 2; cone.position.set(0.62, 0, 0); spk.add(cone);
      const dome = new THREE.Mesh(new THREE.SphereGeometry(0.2, 20, 12), mat(0x8fa0c8)); dome.position.set(0.7, 0, 0); spk.add(dome);
      { const ring = new THREE.Mesh(new THREE.TorusGeometry(0.66, 0.05, 10, 36), mat(0x9aa7c2, { metalness: 0.8, roughness: 0.3 })); ring.rotation.y = Math.PI / 2; ring.position.set(0.71, 0, 0); spk.add(ring);
        const tw = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.03, 8, 24), mat(0x9aa7c2, { metalness: 0.8 })); tw.rotation.y = Math.PI / 2; tw.position.set(0.71, 0.78, 0); spk.add(tw);
        const twc = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat(0x8fa0c8, { metalness: 0.5 })); twc.rotation.z = -Math.PI / 2; twc.position.set(0.71, 0.78, 0); spk.add(twc);
        const fr = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.3, 1.5), mat(0x1c2233, { roughness: 0.7 })); fr.position.set(0.63, 0, 0); spk.add(fr);
        for (const sz of [-1, 1]) { const ft = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.12, 12), mat(0x111623)); ft.position.set(0, -1.16, sz * 0.5); spk.add(ft); } }
      spk.position.set(SX - 0.8, 0, 0);
      // 귀
      const ear = new THREE.Group(); root.add(ear);
      const earM = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.14, 12, 28, Math.PI * 1.5), mat(0xf2c9a0, { roughness: 0.7 })); earM.rotation.y = Math.PI / 2; ear.add(earM);
      const earGlow = new THREE.Mesh(new THREE.SphereGeometry(0.9, 20, 14), new THREE.MeshBasicMaterial({ color: 0xffd34d, transparent: true, opacity: 0, depthWrite: false })); ear.add(earGlow);
      { const head = new THREE.Mesh(new THREE.SphereGeometry(0.55, 28, 20), mat(0xf2c9a0, { roughness: 0.75 })); head.position.set(0.6, 0, 0); head.scale.set(0.95, 1.1, 0.9); ear.add(head);
        const nose = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.25, 10), mat(0xe8b88a, { roughness: 0.8 })); nose.rotation.x = Math.PI / 2; nose.position.set(0.6, -0.05, 0.55); ear.add(nose);
        for (const sz of [-1, 1]) { const ey = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), mat(0x1c2233)); ey.position.set(0.4, 0.15, sz * 0.3); ear.add(ey); } }
      ear.position.set(SX + NX * SP + 0.3, 0, 0);

      // 공기 입자
      const N = NX * NY * NZ;
      const inst = new THREE.InstancedMesh(new THREE.SphereGeometry(0.075, 8, 6), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.45, metalness: 0 }), N);
      inst.frustumCulled = false; root.add(inst);
      const home = new Float32Array(N * 3); let q = 0;
      for (let i = 0; i < NX; i++) for (let j = 0; j < NY; j++) for (let k = 0; k < NZ; k++) { home[q++] = SX + (i + 0.5) * SP; home[q++] = (j - (NY - 1) / 2) * SP; home[q++] = (k - (NZ - 1) / 2) * SP * 1.2; }
      // 눈에 띄는 한 입자 (제자리 진동)
      const mark = new THREE.Mesh(new THREE.SphereGeometry(0.17, 20, 14), mat(0xffd34d, { emissive: 0xffa800, emissiveIntensity: 0.6, roughness: 0.3 })); root.add(mark);
      const mHome = new V3(SX + 10.25 * SP, 0, 0); // 가운데 줄의 한 입자
      const mrk = label('이 입자를 지켜봐요', mark, { offset: [0, 0.55, 0], color: 'rgba(255,211,77,.92)' }); mrk.el.style.color = '#1b2333';
      // 퍼지는 파면
      const shells = [];
      for (let i = 0; i < 6; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24, 0, Math.PI * 2, 0, Math.PI), new THREE.MeshBasicMaterial({ color: 0x6fb4ff, transparent: true, opacity: 0.1, depthWrite: false, side: THREE.DoubleSide, wireframe: false })); s.renderOrder = 1; root.add(s); shells.push(s); }
      const labSp = label('스피커', spk, { offset: [0, 1.45, 0] }), labEar = label('귀', ear, { offset: [0, 0.9, 0] }), labAir = label('공기 입자', [SX + 6 * SP, -2.4, 0]);
      const box = new THREE.Mesh(new THREE.BoxGeometry(NX * SP, NY * SP, NZ * SP * 1.2), new THREE.MeshBasicMaterial({ color: 0x6f8fd0, wireframe: true, transparent: true, opacity: 0.08 }));
      box.position.set(SX + NX * SP / 2, 0, 0); root.add(box);

      let vol = 3, pitch = 400, air = true, aAir = 1, phase = 0, pl = null, pushedAt = -9, now = 0;
      const lamOf = (f) => Math.max(0.9, Math.min(5, 2.6 * Math.pow(400 / f, 0.85)));
      let lastS = '';
      /* 2D 실험의 소리 크기 · 진동수 · (진공 종에서) 공기의 양을 그대로 따라가요 */
      function readS() {
        const s = sm() && sm().S; if (!s) return;
        const a2 = !(s.scene === 'bell' && s.air != null && s.air < 0.5); if (a2 !== air) { air = a2; text(); }
        if (now - pushedAt < 0.8) return;
        const key = s.vol + ':' + s.pitch;
        if (key === lastS) return; lastS = key;
        vol = Math.max(1, Math.min(5, s.vol || 3)); pitch = s.pitch || 400; volR.set(vol); pitchR.set(pitch); text();
      }
      function text() {
        info(air ? `<b>소리는 파동</b>이에요. 스피커가 떨리면 공기 입자도 떨려요.<br>노란 입자 하나를 지켜보세요. 공기 입자는 어떻게 움직이나요?<br>빨강: 입자가 촘촘한 곳 · 파랑: 성긴 곳` : `<b>공기가 없어요!</b> 소리를 전달해 줄 입자가 없어서 <b>소리가 들리지 않아요</b>.`);
      }
      // 3D에서 바꾸면 2D 실험의 값도 같이 바뀌어요
      const barA = ctx.renderer.domElement.closest('.v3-wrap').querySelector('.v3-ctl'), nA = barA.children.length;
      const volR = controls.range('소리 크기', 1, 5, 1, vol, (v) => { vol = v; pushedAt = now; const s = sm(); if (s && s.setVol) s.setVol(v); text(); }, (v) => VOLN[v - 1]);
      const pitchR = controls.range('진동수', 150, 900, 10, pitch, (v) => { pitch = v; pushedAt = now; const s = sm(); if (s && s.setPitch) s.setPitch(v); text(); }, (v) => v + ' Hz');
      // ▶ 재생: 한 주기 동안 공기 입자가 한 번 앞뒤로 떨리고, 파동은 한 파장만큼 나아가요 (멈춰서 촘촘한 곳 · 성긴 곳을 살펴봐요)
      pl = controls.player({
        duration: 3, loop: true, autoplay: true, label: '파동 재생',
        phases: [[0, '한 주기 시작'], [0.25, '1/4 주기'], [0.5, '반 주기'], [0.75, '3/4 주기']],
        onFrame(p) { phase = p * Math.PI * 2; },
      });
      const airCtl = [...barA.children].slice(nA);   // 소리 크기 · 진동수 · 파동 재생: 공기 장면에서만 보여요 (줄 장면에서는 바뀌는 것이 없어요)
      controls.button('이름표', () => { const v = labSp.visible === false; labSp.show(v); labEar.show(v); labAir.show(v); });
      text();
      /* ===== 장면 rope(줄 파동) · 파형(소리굽쇠 · 피리 · 기타): 2D와 같은 줄 · 같은 파형 ===== */
      const airObjs = root.children.slice();
      const airLabs = [labSp, labEar, labAir];

      /* 배경: 책상 + 벽 (모든 장면에서 보여요) */
      { const cTex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); if (THREE.sRGBEncoding) t.encoding = THREE.sRGBEncoding; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; };
        const woodT = cTex(512, 256, (c, w, h) => { c.fillStyle = '#3d2a1b'; c.fillRect(0, 0, w, h); for (let i = 0; i < 60; i++) { c.strokeStyle = 'rgba(' + (20 + (i * 23) % 30) + ',12,4,' + (0.15 + (i % 4) * 0.05) + ')'; c.lineWidth = 1 + (i % 3); c.beginPath(); const y = i / 60 * h; c.moveTo(0, y); for (let x = 0; x <= w; x += 32) c.lineTo(x, y + Math.sin(x * 0.04 + i) * 2.5); c.stroke(); } }); woodT.repeat.set(4, 1);
        const tb = new THREE.Mesh(new THREE.BoxGeometry(26, 0.3, 8), mat(0xffffff, { map: woodT, roughness: 0.55 })); tb.position.set(0.5, -2.95, 0); tb.receiveShadow = true; root.add(tb);
        const wallT = cTex(8, 256, (c, w, h) => { const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#27375a'); g.addColorStop(1, '#0e1830'); c.fillStyle = g; c.fillRect(0, 0, w, h); });
        const wl = new THREE.Mesh(new THREE.PlaneGeometry(100, 50), new THREE.MeshBasicMaterial({ map: wallT })); wl.position.set(0, 8, -16); root.add(wl); tb.userData.v3bg = wl.userData.v3bg = true; }
      const RNn = 120, RX0 = -5.2, RX1 = 5.6;
      const gR = new THREE.Group(); gR.visible = false; root.add(gR);
      const beads = new THREE.InstancedMesh(new THREE.SphereGeometry(0.15, 12, 10), mat(0xc58a4b, { roughness: 0.7 }), RNn); beads.frustumCulled = false; gR.add(beads);
      const handle = new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 12), mat(0xffd34d, { emissive: 0xa87a00, emissiveIntensity: 0.4 })); gR.add(handle);
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 5.4, 14), mat(0x8793a6, { metalness: 0.7, roughness: 0.3 })); post.position.set(RX1 + 0.1, -0.1, 0); gR.add(post);
      { const ft = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.8, 0.16, 24), mat(0x8793a6, { metalness: 0.7, roughness: 0.3 })); ft.position.set(RX1 + 0.1, -2.72, 0); gR.add(ft); const cl = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.05, 8, 18), mat(0x8793a6, { metalness: 0.7 })); cl.rotation.y = Math.PI / 2; cl.position.set(RX1, 0, 0); gR.add(cl); }
      const mkCol = [0xef4444, 0x3b82f6, 0x22c55e];
      const mks = mkCol.map((c) => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), mat(c, { emissive: c, emissiveIntensity: 0.35 })); gR.add(m); return m; });
      const mkLabs = mks.map((m, i) => label('표시점 ' + (i + 1), m, { size: 11.5, offset: [0, 0.55, 0] }));
      const guide = new THREE.Mesh(new THREE.BoxGeometry(RX1 - RX0, 0.015, 0.015), mat(0x94a3b8)); guide.position.set((RX0 + RX1) / 2, 0, 0); gR.add(guide);
      const rLab = [label('손잡이 (위아래로 흔들어요)', handle, { size: 11.5, offset: [-0.5, 0.65, 0] }), label('파동이 나아가는 방향 →', [0.2, -1.8, 0], { size: 12 })];
      const arrAuto = controls.button('🔁 자동으로 흔들기', () => { const b = document.getElementById('tgAuto'); if (b) b.click(); });
      // 파형: 악기 + 파형 곡선 (같은 높이 · 크기라도 파형이 달라요)
      const gT = new THREE.Group(); gT.visible = false; root.add(gT);
      const NWB = 200, wbeads = new THREE.InstancedMesh(new THREE.SphereGeometry(0.07, 10, 8), mat(0x34d399, { emissive: 0x0b6e4f, emissiveIntensity: 0.5, roughness: 0.4 }), NWB); wbeads.frustumCulled = false; gT.add(wbeads);
      const axisT = new THREE.Mesh(new THREE.BoxGeometry(9, 0.015, 0.015), mat(0x94a3b8)); axisT.position.set(1.6, 0, 0); gT.add(axisT);
      const inst3 = { fork: new THREE.Group(), flute: new THREE.Group(), guitar: new THREE.Group() };
      { const f = inst3.fork; const hd = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.9, 12), mat(0xc9d2e0, { metalness: 0.8, roughness: 0.3 })); hd.position.y = -0.9; f.add(hd);
        [-0.22, 0.22].forEach((x) => { const p = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.8, 0.2), mat(0xdbe3ef, { metalness: 0.85, roughness: 0.25 })); p.position.set(x, 0.45, 0); f.add(p); });
        const b = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.06, 8, 20, Math.PI), mat(0xdbe3ef, { metalness: 0.85, roughness: 0.25 })); b.rotation.z = Math.PI; b.position.y = -0.45; f.add(b); }
      { const f = inst3.flute; const tb = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 3.4, 20), mat(0xe6c27a, { roughness: 0.5 })); tb.rotation.z = Math.PI / 2; f.add(tb);
        for (let i = 0; i < 5; i++) { const h = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.05, 12), mat(0x3b2a14)); h.position.set(-0.5 + i * 0.5, 0.2, 0); f.add(h); } }
      { const f = inst3.guitar; const b1 = new THREE.Mesh(new THREE.SphereGeometry(0.75, 24, 16), mat(0xb4682a, { roughness: 0.5 })); b1.scale.set(1, 1, 0.35); b1.position.y = -0.55; f.add(b1);
        const b2 = new THREE.Mesh(new THREE.SphereGeometry(0.55, 24, 16), mat(0xb4682a, { roughness: 0.5 })); b2.scale.set(1, 1, 0.35); b2.position.y = 0.25; f.add(b2);
        const hole = new THREE.Mesh(new THREE.CircleGeometry(0.2, 20), mat(0x20120a)); hole.position.set(0, -0.15, 0.27); f.add(hole);
        const nk = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.7, 0.1), mat(0x5b3a1a)); nk.position.y = 1.35; f.add(nk); }
      Object.keys(inst3).forEach((k) => { inst3[k].position.set(-5.6, 0, 0); inst3[k].visible = false; gT.add(inst3[k]); });
      const iLab = label('', [-5.6, 1.8, 0], { size: 12.5, color: 'rgba(15,100,70,.92)' }), wLab = label('같은 소리의 높이 · 크기, 다른 파형 → 다른 음색', [1.6, 2.0, 0], { size: 12, color: 'rgba(15,100,70,.92)' });
      const SHP = { fork: { a: [1, 0, 0, 0, 0, 0], th: [0, 0, 0, 0, 0, 0] }, flute: { a: [1, 0.55, 0.28, 0.12, 0, 0], th: [0, 2.2, 0.4, 2.6, 0, 0] }, guitar: { a: [1, 0.62, 0.5, 0.36, 0.22, 0.12], th: [0, 0.5, 1.2, 1.8, 2.4, 3.0] } };
      const dm2 = new THREE.Object3D();
      let lastMode = '';
      function setSceneMode(m) {
        if (m === lastMode) return; lastMode = m;
        const isAir = m === 'wave';
        airObjs.forEach((o) => { o.visible = isAir; }); airLabs.forEach((l) => l.show(isAir)); if (!isAir) mrk.show(false);
        gR.visible = m === 'rope'; gT.visible = m === 'timbre'; mkLabs.forEach((l) => l.show(m === 'rope')); rLab.forEach((l) => l.show(m === 'rope')); arrAuto.style.display = m === 'rope' ? '' : 'none';
        iLab.show(m === 'timbre'); wLab.show(m === 'timbre');
        airCtl.forEach((e) => { e.style.display = isAir ? '' : 'none'; });
        lastS = ''; if (isAir) text();
      }
      function updRope(S) {
        const Rr = sm() && sm().R; if (!Rr) return;
        const p = new V3();
        for (let i = 0; i < RNn; i++) { const x = RX0 + (RX1 - RX0) * i / (RNn - 1), y = (Rr.u[Math.min(i, Rr.u.length - 1)] || 0) * 0.02; dm2.position.set(x, y, 0); dm2.updateMatrix(); beads.setMatrixAt(i, dm2.matrix); }
        beads.instanceMatrix.needsUpdate = true;
        handle.position.set(RX0 - 0.05, Rr.hand * 0.02, 0);
        (Rr.MKI || [30, 60, 90]).forEach((idx, k) => { mks[k].position.set(RX0 + (RX1 - RX0) * idx / (RNn - 1), (Rr.u[idx] || 0) * 0.02, 0); });
        const ph = document.querySelector('.v3-player .v3-ph'); if (ph) ph.textContent = '';
        info('<b>줄 파동</b>: 손잡이를 흔들면 파동이 줄을 따라 나아가요.<br>🔴🔵🟢 <b>표시점</b>은 어떻게 움직이는지 살펴보세요.' + (S && S.auto ? '' : '<br>🔁 자동으로 흔들기를 눌러 보세요.'));
      }
      function updTimbre(S, t) {
        const k = S && SHP[S.timbre] ? S.timbre : 'fork', a = SHP[k].a, th = SHP[k].th, vv = Math.max(1, Math.min(5, (S && S.vol) || 3)), amp = 0.35 * vv / 3 * 1.0;
        let pk = 0; for (let i = 0; i < 128; i++) { const q = (i / 128) * Math.PI * 2; let v = 0; for (let n = 0; n < 6; n++) v += a[n] * Math.sin((n + 1) * q + th[n]); pk = Math.max(pk, Math.abs(v)); }
        const lam = lamOf(Math.max(150, (S && S.pitch) || 300)) * 1.15, ph0 = phase;
        for (let i = 0; i < NWB; i++) { const x = -3 + 9 * i / (NWB - 1), q = (x / lam) * Math.PI * 2 - ph0; let v = 0; for (let n = 0; n < 6; n++) v += a[n] * Math.sin((n + 1) * q + th[n]); dm2.position.set(x, 0.9 * v / pk * amp * 2.2 + 0, 0); dm2.updateMatrix(); wbeads.setMatrixAt(i, dm2.matrix); }
        wbeads.instanceMatrix.needsUpdate = true;
        Object.keys(inst3).forEach((kk) => { inst3[kk].visible = kk === k; });
        const nm = { fork: '소리굽쇠', flute: '피리', guitar: '기타' }[k];
        iLab.set(nm); iLab.obj = [-5.6, 1.9, 0]; wLab.obj = [1.6, 2.1, 0];
        inst3[k].rotation.z = 0; if (k === 'fork') inst3[k].children[1].position.x = -0.22 + 0.02 * Math.sin(phase * 3);
        const ph = document.querySelector('.v3-player .v3-ph'); if (ph && !ph.textContent) ph.textContent = nm;
        info('<b>' + nm + '</b>의 파형: ' + (k === 'fork' ? '부드러운 <b>사인 곡선</b>이에요.' : '마루와 골의 모양이 <b>복잡해요</b>.') + '<br>같은 높이(진동수)와 크기(진폭)여도 악기마다 <b>파형이 달라서</b> 소리의 맵시, <b>음색</b>이 달라요.'); 
      }
      const c1 = new THREE.Color(0x4a7bff), c2 = new THREE.Color(0xf2f4fa), c3 = new THREE.Color(0xff4a4a), tc = new THREE.Color();
      const dm = new THREE.Object3D(); let k0 = 0;
      return {
        update(dt, t) {
          now = t;
          { const S0 = sm() && sm().S, sc0 = S0 ? S0.scene : 'air', tm0 = sc0 === 'rope' ? 'rope' : (sc0 === 'scope' && (() => { const g0 = sm() && sm().game; return !!(g0 && !g0.free && g0.level === 3); })()) ? 'timbre' : 'wave'; setSceneMode(tm0);
            if (tm0 === 'rope') { updRope(S0); return; }
            if (tm0 === 'timbre') { updTimbre(S0, t); return; } }
          if ((k0++ % 8) === 0) readS();
          { const s2 = sm() && sm().S; const tgt = s2 && s2.scene === 'bell' && s2.air != null ? s2.air : 1; aAir += (tgt - aAir) * Math.min(1, dt * 6); }   // 진공 종에서는 2D의 공기 양을 따라가요
          const lam = lamOf(pitch), kk = Math.PI * 2 / lam;
          const A = 0.05 * vol * 1.0 * Math.min(1, aAir * 1.2);
          const R0 = SX - 0.4;
          let n = 0;
          for (let i = 0; i < N; i++) {
            const hx = home[n], hy = home[n + 1], hz = home[n + 2]; n += 3;
            const dx = hx - R0, rr = Math.sqrt(dx * dx + hy * hy + hz * hz), ph = kk * rr - phase;
            const xi = A * Math.sin(ph) * (aAir > 0.02 ? 1 : 0);
            // 구면파: 반지름 방향으로 변위 (진폭은 거리에 따라 약해져요)
            const att = 1 / (1 + 0.04 * rr), ux = dx / rr, uy = hy / rr, uz = hz / rr;
            dm.position.set(hx + ux * xi * att * 2.2, hy + uy * xi * att * 2.2, hz + uz * xi * att * 2.2);
            dm.scale.setScalar(0.35 + 0.65 * aAir); dm.updateMatrix(); inst.setMatrixAt(i, dm.matrix);
            // 밀도(촘촘함) ~ -∂ξ/∂r ~ -cos(ph)
            const dens = -Math.cos(ph) * Math.min(1, vol / 3) * att;
            tc.copy(c2); if (dens > 0) tc.lerp(c3, Math.min(1, dens * 1.1)); else tc.lerp(c1, Math.min(1, -dens * 1.1));
            inst.setColorAt(i, tc);
          }
          inst.instanceMatrix.needsUpdate = true; if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
          // 표시 입자
          const rr = mHome.x - R0, ph = kk * rr - phase; mark.position.set(mHome.x + A * Math.sin(ph) * 2.2 / (1 + 0.04 * rr), 0, 0); mark.visible = aAir > 0.3; mrk.show(aAir > 0.3);
          // 파면 (골 → 마루가 지나가는 위치)
          shells.forEach((s, i) => {
            const L = ((i * lam + phase / kk) % (lam * 6)); const r = Math.max(0.01, L);
            s.position.set(R0, 0, 0); s.scale.setScalar(r); s.visible = aAir > 0.1 && r < NX * SP + 1.2;
            s.material.opacity = 0.11 * aAir * Math.max(0, 1 - r / (NX * SP + 1.2)) * Math.min(1, vol / 2.5);
          });
          // 스피커 떨림 · 귀 반응
          spk.position.x = SX - 0.8 + 0.03 * Math.sin(phase) * vol / 3; cone.position.x = 0.62 + 0.07 * Math.sin(phase) * vol / 3;
          earGlow.material.opacity = 0.16 * aAir * (vol / 5) * (0.6 + 0.4 * Math.sin(phase));
        },
      };
    },
  });
})();
