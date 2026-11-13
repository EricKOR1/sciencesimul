/* m2-breathing · 3D 호흡 기관 · 호흡 운동 · 폐포의 기체 교환
   들숨: 갈비뼈가 올라가고 가로막이 내려가요 → 가슴 속 부피↑ 압력↓ → 공기가 들어와요. 날숨은 반대예요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHN = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);

  window.SciSim3D.attach({
    title: '호흡계 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: PHN ? 14 : 10.5, theta: 0.35, phi: 1.3, min: 4, max: 24, target: [0, 0.4, 0] },
    autoRotate: 0,
    levels: [2, 3],                  // 3단계(들숨과 날숨: 막대 단추로 갈비뼈·가로막 움직이기) · 4단계(폐포의 기체 교환)는 3D
                                     // 1단계(이름표 끌어 놓기) · 2단계(페트병 호흡 모형)는 2D
    build(ctx) {
      const { THREE, root, label, info, controls, orbit } = ctx;
      const V3 = THREE.Vector3;
      const mat = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.55, metalness: 0.02 }, o || {}));
      const sm = () => window.__sim;
      const MT = ctx.mats, lin = (h) => new THREE.Color(h).convertSRGBToLinear();   // 화면에서 색이 바래지 않게 (진한 색)
      const organ = new THREE.Group(), alv = new THREE.Group(); root.add(organ, alv);

      /* ================= 호흡 기관 ================= */
      // 폐 (오른쪽 · 왼쪽)
      const lungM = MT.organic(lin(0xe9788f), { opacity: 0.56 });
      const lungR = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 28), lungM), lungL = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 28), lungM);
      lungR.position.set(-1.45, 0.2, 0); lungL.position.set(1.45, 0.2, 0); lungR.renderOrder = lungL.renderOrder = 2;
      organ.add(lungR, lungL);
      // 기관 · 기관지 · 세기관지 (가지 뻗기)
      const airM = MT.organic(lin(0xa9c4f5), { extra: { roughness: 0.38, emissive: lin(0x23407a), emissiveIntensity: 0.3 } });
      const paths = [];
      function tube(pts, r, m) { const c = new THREE.CatmullRomCurve3(pts); const me = new THREE.Mesh(new THREE.TubeGeometry(c, 28, r, 14, false), m || airM); me.castShadow = true; organ.add(me); return c; }
      const nose = new THREE.Mesh(new THREE.SphereGeometry(0.4, 32, 22), MT.organic(lin(0xeab88f))); nose.scale.set(0.8, 0.9, 1.3); nose.position.set(0, 3.55, 0.7); organ.add(nose);
      const trachea = tube([new V3(0, 3.5, 0.6), new V3(0, 3.0, 0.15), new V3(0, 2.0, 0), new V3(0, 1.4, 0)], 0.17);
      // 기관의 연골 고리 (C자 모양 연골이 기관을 받쳐요)
      { const ringM = MT.organic(lin(0xe6eefc), { extra: { roughness: 0.42 } }), Zax = new V3(0, 0, 1);
        for (let i = 0; i < 8; i++) { const t = 0.36 + i * 0.08, rg = new THREE.Mesh(new THREE.TorusGeometry(0.185, 0.03, 10, 28), ringM); rg.position.copy(trachea.getPointAt(t)); rg.quaternion.setFromUnitVectors(Zax, trachea.getTangentAt(t).normalize()); rg.userData.v3bg = true; organ.add(rg); } }
      // 가는 가지(재귀)
      const tips = [];
      function branch(p, dir, len, r, depth, side) {
        const q = p.clone().addScaledVector(dir, len);
        const mid = p.clone().lerp(q, 0.5); mid.add(new V3(0.05 * side, -0.05, 0.05));
        tube([p, mid, q], r);
        if (depth <= 0) { tips.push(q); return; }
        const rot = (a, b) => { const d = dir.clone(); d.applyAxisAngle(new V3(0, 0, 1), a); d.applyAxisAngle(new V3(0, 1, 0), b); return d.normalize(); };
        branch(q, rot(0.55 * side + 0.3, 0.5), len * 0.72, r * 0.72, depth - 1, side);
        branch(q, rot(-0.35 * side + 0.3, -0.55), len * 0.7, r * 0.72, depth - 1, side);
      }
      [-1, 1].forEach((sd) => {
        const p0 = new V3(0, 1.4, 0), pe = new V3(sd * 0.7, 0.85, 0);
        tube([p0, new V3(sd * 0.3, 1.2, 0), pe], 0.12);
        branch(pe, new V3(sd * 0.55, -0.8, 0).normalize(), 0.75, 0.085, 3, sd);
      });
      // 끝에 폐포 송이
      const alvTipM = MT.organic(lin(0xf08aa0));
      tips.forEach((t) => { for (let i = 0; i < 3; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.09, 14, 10), alvTipM); s.position.copy(t).add(new V3((i - 1) * 0.06, (i % 2) * 0.05, (i - 1) * 0.05)); organ.add(s); } });
      // 갈비뼈
      const ribs = new THREE.Group(); organ.add(ribs);
      const boneM = MT.ceramic(lin(0xece2c8), { extra: { roughness: 0.48, clearcoat: 0.25, clearcoatRoughness: 0.5 } });
      for (let i = 0; i < 5; i++) {
        const y = 1.6 - i * 0.62, w = 2.4 - Math.abs(i - 1.5) * 0.12, d = 1.2;
        const pts = []; for (let k = 0; k <= 24; k++) { const a = -Math.PI * 0.78 + k / 24 * Math.PI * 1.56; pts.push(new V3(Math.sin(a) * w, y - 0.55 * (1 + Math.cos(a)) / 2, Math.cos(a) * d - 0.05)); }
        const rb = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 72, 0.065, 12, false), boneM); rb.castShadow = true; ribs.add(rb);
      }
      const ster = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 2.2, 6, 16), boneM); ster.scale.z = 0.5; ster.position.set(0, 0.55, 1.12); organ.add(ster);
      // 등뼈 (갈비뼈가 뒤에서 이어지는 곳): 꾸밈
      for (let i = 0; i < 9; i++) { const vb = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.3, 18), boneM); vb.position.set(0, 1.95 - i * 0.4, -1.05); vb.userData.v3bg = true; organ.add(vb); }
      // 가로막 (돔)
      const dia = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 16, 0, Math.PI * 2, 0, Math.PI / 2), MT.organic(lin(0xb5453f), { opacity: 0.92, extra: { side: THREE.DoubleSide, depthWrite: true, roughness: 0.55 } }));
      dia.scale.set(2.5, 1, 1.25); organ.add(dia);
      // 공기 알갱이
      const NA = 70;
      const airI = new THREE.InstancedMesh(new THREE.SphereGeometry(0.08, 8, 6), new THREE.MeshBasicMaterial({ color: 0x9fe8ff }), NA); airI.frustumCulled = false; organ.add(airI);
      const flows = [];
      [[-1, 0], [1, 0]].forEach(([sd]) => { const pts = [new V3(0, 3.5, 0.6), new V3(0, 3.0, 0.15), new V3(0, 1.4, 0), new V3(sd * 0.7, 0.85, 0), new V3(sd * 1.1, 0.3, 0), new V3(sd * 1.5, -0.4, 0)]; flows.push(new THREE.CatmullRomCurve3(pts)); });
      const lOrg = [label('코', nose, { offset: [0, 0.5, 0] }), label('기관', [0, 2.4, 0.2]), label('기관지', [0.75, 1.15, 0.3]), label('폐', lungL, { offset: [0.2, 0.9, 0.9] }), label('가로막', dia, { offset: [0, -0.2, 1.1] }), label('갈비뼈', [-2.5, 0.9, 0.5])];

      /* ================= 폐포 ================= */
      const wallM = MT.organic(lin(0xf58aa2), { opacity: 0.44, extra: { emissive: lin(0x6a2030), emissiveIntensity: 0.2, roughness: 0.3, side: THREE.DoubleSide } });
      const AP = [[0, 0.2, 0], [1.3, -0.5, 0.5], [-1.2, -0.6, 0.6], [0.2, -1.3, -0.9], [-0.1, 1.2, -0.9], [1.1, 0.9, -0.5]].map((q) => q.map((v) => v * 1.35));
      const caps = [], alvS = [];
      alv.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new V3(0, 4.2, 0), new V3(0, 2.8, 0), new V3(0, 1.2, 0)]), 20, 0.2, 12), airM));
      AP.forEach((p, i) => {
        const s = new THREE.Mesh(new THREE.SphereGeometry(0.72, 36, 24), wallM); s.position.set(...p); s.renderOrder = 2; alv.add(s); alvS.push(s);
        const k1 = new THREE.Mesh(new THREE.TorusKnotGeometry(0.76, 0.032, 140, 6, 3, 4), MT.plastic(lin(0xe5383b), { roughness: 0.3, extra: { emissive: lin(0xaa1010), emissiveIntensity: 0.2 } }));
        const k2 = new THREE.Mesh(new THREE.TorusKnotGeometry(0.76, 0.032, 140, 6, 4, 3), MT.plastic(lin(0x3f6ff0), { roughness: 0.3, extra: { emissive: lin(0x1a3ab0), emissiveIntensity: 0.2 } }));
        [k1, k2].forEach((k) => { k.position.set(...p); k.rotation.set(i, i * 2, i * 0.5); alv.add(k); });
      });
      // 모세 혈관 가지 (폐동맥쪽 파랑, 폐정맥쪽 빨강)
      alv.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new V3(-3.9, -2.5, 0.5), new V3(-2.6, -1.7, 0.7), new V3(-1.6, -0.8, 0.8)]), 20, 0.1, 8), MT.plastic(lin(0x3f6ff0), { roughness: 0.3, extra: { emissive: lin(0x1a3ab0), emissiveIntensity: 0.2 } })));
      alv.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new V3(1.75, -0.7, 0.7), new V3(2.9, -1.5, 0.4), new V3(3.9, -2.5, 0.2)]), 20, 0.1, 8), MT.plastic(lin(0xe5383b), { roughness: 0.3, extra: { emissive: lin(0xaa1010), emissiveIntensity: 0.2 } })));
      // 기체 알갱이: 산소(→ 혈액), 이산화 탄소(→ 폐포)
      const NG = AP.length * 5;
      const gO = new THREE.InstancedMesh(new THREE.SphereGeometry(0.075, 10, 8), new THREE.MeshBasicMaterial({ color: 0xbff4ff }), NG);
      const gC = new THREE.InstancedMesh(new THREE.SphereGeometry(0.075, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffa24a }), NG);
      gO.frustumCulled = gC.frustumCulled = false; alv.add(gO, gC);
      const lAlv = [label('폐포', alvS[1], { offset: [0, 0.95, 0] }), label('모세 혈관', alvS[2], { offset: [-0.2, -1.0, 0.2] }), label('산소 (O₂)', [2.7, 1.4, 0.3], { color: 'rgba(30,140,170,.95)' }), label('이산화 탄소 (CO₂)', [-2.9, 1.4, 0.3], { color: 'rgba(190,100,20,.95)' }), label('기관지', [0.9, 3.0, 0])];
      alv.visible = false;

      /* ================= 조작 ================= */
      let mode = 'organ', vol = 0, ext = null, labs = true, pl = null, gp = 0, ctlEl = null, extPrev = -1;
      let lastTxt = '';
      const say = (h) => { if (h !== lastTxt) { lastTxt = h; info(h); } };
      function txt() {
        if (mode === 'alv') say('폐포 속 <b>산소</b>는 폐포 → <b>모세 혈관</b>으로, 혈액 속 <b>이산화 탄소</b>는 모세 혈관 → 폐포로 <b>확산</b>돼요.<br><b>운동 강도</b>를 높이면 숨도 혈액도 빨라져요.');
        else if (vol > 0.5) say('<b>들숨</b>: 갈비뼈가 올라가고 가로막이 내려가요 → 가슴 속 <b>부피↑ 압력↓</b> → 공기가 폐로 들어와요.');
        else say('<b>날숨</b>: 갈비뼈가 내려가고 가로막이 올라가요 → 가슴 속 <b>부피↓ 압력↑</b> → 공기가 폐에서 나가요.');
      }
      function playerRow(on) {
        if (!ctlEl) ctlEl = ctx.renderer.domElement.closest('.v3-wrap').querySelector('.v3-ctl');
        const r = ctlEl.querySelector('.v3-player'); if (r) r.style.display = on ? '' : 'none';
        [...ctlEl.querySelectorAll('button')].forEach((b) => { const t = b.textContent.trim(); if (t === '들숨 끝' || t === '날숨 끝') b.style.display = on ? '' : 'none'; });
      }
      function apply() {
        organ.visible = mode === 'organ'; alv.visible = mode === 'alv';
        lOrg.forEach((l) => l.show(labs && mode === 'organ')); lAlv.forEach((l) => l.show(labs && mode === 'alv'));
        orbit.tx = 0; orbit.ty = mode === 'organ' ? 0.4 : -0.3; orbit.dist = mode === 'organ' ? (PHN ? 14 : 10.5) : (PHN ? 14 : 10.5);
        txt(); playerRow(mode === 'organ' && ext == null);
      }
      const sg = controls.segment('보기', [{ label: '호흡 기관', value: 'organ' }, { label: '폐포 확대', value: 'alv' }], mode, (v) => { mode = v; apply(); });
      // ▶ 재생: 들숨 → 날숨 한 번 (2D의 '숨 쉬기'와 같은 순서). 2D가 호흡을 보여 주는 장면에서는 2D의 값을 그대로 따라가요.
      pl = controls.player({
        duration: 4.4, loop: true, autoplay: true, label: '숨 쉬기',
        phases: [[0, '들숨 (부피↑ 압력↓)'], [0.5, '날숨 (부피↓ 압력↑)']],
        onFrame(p) { if (ext == null) vol = 0.5 - 0.5 * Math.cos(p * Math.PI * 2); },
      });
      controls.button('들숨 끝', () => { pl.pause(); pl.set(0.5); });
      controls.button('날숨 끝', () => { pl.pause(); pl.set(0); });
      controls.button('이름표', () => { labs = !labs; apply(); });
      // 갈비뼈 · 가로막 단추: 2D의 손잡이를 끄는 것과 같아요 (3단계 '들숨과 날숨'에서만 보여요)
      const chB = [['갈비뼈 ↑ 올리기', 'rib', 1], ['갈비뼈 ↓ 내리기', 'rib', 0], ['가로막 ↓ 내리기', 'dia', 1], ['가로막 ↑ 올리기', 'dia', 0]].map(([t, k, v]) => controls.button(t, () => {
        const s2 = sm(), CH = s2 && s2.CH; if (!CH) return;
        CH.auto = false; CH.touched = true; const b = document.getElementById('btnAutoBreath'); if (b) b.innerHTML = '🔁 자동으로 숨 쉬기';
        if (window.SciSim && SciSim.tween) SciSim.tween(CH, { [k]: v }, { duration: 0.8, ease: 'outCubic' }); else CH[k] = v;
      }));
      let chOn = null;
      function chestBar(on) { if (on === chOn) return; chOn = on; chB.forEach((b) => { b.style.display = on ? '' : 'none'; }); }
      chestBar(false);
      apply();
      /* 3D 화면 오른쪽 위의 작은 판 (휴대폰에서는 오른쪽 아래): 2D 화면의 표 · 기록을 3D에서도 보여 줘요 */
      function v3xPan(cls) { const vEl = ctx.renderer.domElement.parentElement;
        if (!document.getElementById('v3x-css')) { const c = document.createElement('style'); c.id = 'v3x-css'; c.textContent =
          '.v3x-pan{position:absolute;right:10px;top:10px;max-width:52%;padding:6px 9px;border-radius:12px;background:rgba(8,12,24,.76);color:#fff;font-size:12px;line-height:1.35;pointer-events:none;z-index:2}' +
          '.v3x-pan .h{font-weight:800;margin-bottom:3px}.v3x-pan table{border-collapse:collapse}.v3x-pan th,.v3x-pan td{padding:1px 5px;text-align:left;white-space:nowrap}.v3x-pan th{color:#9fb0cc;font-weight:700;font-size:11px}.v3x-pan .q{color:#7d8aa3}.v3x-pan .now td{background:rgba(255,255,255,.1)}' +
          '.v3x-pan .c{display:inline-block;margin:1px 2px;padding:1px 6px;border-radius:8px;background:rgba(255,255,255,.14)}.v3x-pan .ok{color:#86efac}.v3x-pan .bad{color:#fca5a5}' +
          '@media (max-width:599px){.v3x-pan{top:auto;bottom:28px;right:6px;font-size:10.5px;max-width:64%;padding:4px 6px}.v3x-pan th{font-size:9.5px}.v3x-pan th,.v3x-pan td{padding:0 3px}}';
          document.head.appendChild(c); }
        const el = document.createElement('div'); el.className = 'v3x-pan' + (cls ? ' ' + cls : ''); el.style.display = 'none'; vEl.appendChild(el);
        let sig = null; return { set(h) { if (h === sig) return; sig = h; el.style.display = h ? '' : 'none'; if (h) el.innerHTML = h; }, el }; }
      /* 🫧 기체 교환 세기: 2D 폐포 장면에서 이동한 O₂ · CO₂ 수를 3D 화면에도 보여 줘요 */
      const gasPan = v3xPan();
      function drawGas() {
        const s2 = sm(), AL = s2 && s2.S && s2.S.scene === 'alveoli' ? s2.AL : null;
        if (!AL || mode !== 'alv') { gasPan.set(''); return; }
        const ex = AL.ex || 0, run = ex >= 0.7;
        gasPan.set('<div class="h">🫧 이동한 기체 · ' + (run ? '🏃 달리는 중' : ex < 0.25 ? '😌 쉬는 중' : '🚶 걷는 중') + '</div>' +
          '<div>쉴 때: <b style="color:#bff4ff">O₂ ' + AL.restO2 + '</b> · <b style="color:#ffb46b">CO₂ ' + AL.restCO2 + '</b></div>' +
          '<div>운동할 때: <b style="color:#bff4ff">O₂ ' + AL.exO2 + '</b> · <b style="color:#ffb46b">CO₂ ' + AL.exCO2 + '</b></div>');
      }
      const dm = new THREE.Object3D(); let k0 = 0, lastSc = '';
      function readScene() { const s = sm() && sm().S && sm().S.scene; if (!s || s === lastSc) return; lastSc = s; const m = s === 'alveoli' ? 'alv' : 'organ'; if (m !== mode) { mode = m; sg.set(m); apply(); } }
      return {
        sync() { lastSc = ''; readScene(); },
        update(dt, t) {
          if ((k0++ % 15) === 0) readScene();
          { // 2D가 호흡을 보여 주는 장면이면 그 값을 따라가요: 가슴 모형(CH.L) · 기도의 숨 쉬기(AW.b) · 폐포(AL.b)
            const s2 = sm(), sc = s2 && s2.S && s2.S.scene; let e = null;
            chestBar(sc === 'chest');
            if (sc === 'chest' && s2.CH) e = s2.CH.L;
            else if (sc === 'airway' && s2.AW && s2.AW.on) e = s2.AW.b;
            else if (sc === 'alveoli' && s2.AL) e = s2.AL.b;
            if ((e == null) !== (ext == null)) { ext = e; playerRow(e == null && mode === 'organ'); }
            ext = e;
            if (e != null) vol = Math.max(0, Math.min(1, e));
            const ex = s2 && s2.AL ? s2.AL.exv || 0 : 0; gp += dt * (0.35 + 0.6 * ex);
          }
          if (((k0 + 1) % 10) === 0) txt();
          if ((k0 % 6) === 0) drawGas();
          if (mode === 'organ') {
            const s = 1 + 0.16 * vol;
            lungR.scale.set(1.05 * s, 1.85 * (1 + 0.12 * vol), 1.0 * s); lungL.scale.set(1.0 * s, 1.75 * (1 + 0.12 * vol), 0.95 * s);
            // 가슴 모형 장면: 갈비뼈와 가로막을 2D 손잡이 값대로 따로 움직여요 (폐는 흉강 부피를 따라가요)
            const s2c = sm(), CHc = s2c && s2c.S && s2c.S.scene === 'chest' ? s2c.CH : null;
            const rv = CHc ? CHc.rib : vol, dv = CHc ? CHc.dia : vol;
            ribs.scale.set(1 + 0.07 * rv, 1, 1 + 0.07 * rv); ribs.position.y = 0.16 * rv; ster.position.z = 1.12 + 0.1 * rv; ster.position.y = 0.5 + 0.12 * rv;
            dia.scale.set(2.45, 1.05 - 0.75 * dv, 1.25); dia.position.y = -1.55 - 0.45 * dv;
            lungR.position.y = lungL.position.y = 0.2 - 0.05 * vol;
            // 공기 알갱이: 부피가 커질 때 들어가요
            for (let i = 0; i < NA; i++) {
              const br = i % 2, off = (i / NA * 2 + (i * 0.37) % 0.3) % 1, u = (off + 0.9 * vol) % 1;
              flows[br].getPoint(u * 0.98, dm.position); dm.position.x += Math.sin(i * 12.3) * 0.05; dm.position.z += Math.cos(i * 7.7) * 0.05;
              dm.scale.setScalar(0.9 + 0.2 * Math.sin(i)); dm.updateMatrix(); airI.setMatrixAt(i, dm.matrix);
            }
            airI.instanceMatrix.needsUpdate = true;
          } else {
            alvS.forEach((s, i) => s.scale.setScalar(0.95 + 0.1 * vol));
            // 확산: 산소는 폐포 가운데 → 모세 혈관, 이산화 탄소는 반대로
            for (let i = 0; i < NG; i++) {
              const a = i % AP.length, c = AP[a], ph = ((gp + i * 0.173) % 1);
              const ang = i * 2.399 + a, dir = new V3(Math.sin(ang * 1.3) * Math.cos(ang), Math.sin(ang * 0.9 + 1), Math.sin(ang * 1.3) * Math.sin(ang)).normalize();
              const inOut = ph < 0.5 ? ph / 0.5 : 1 - (ph - 0.5) / 0.5;           // 0(가운데) → 1(벽 바깥) → 0
              const r = 0.1 + 0.7 * ph;
              dm.position.set(c[0] + dir.x * r * 0.9, c[1] + dir.y * r * 0.9, c[2] + dir.z * r * 0.9); dm.scale.setScalar(1); dm.updateMatrix(); gO.setMatrixAt(i, dm.matrix);
              const r2 = 0.95 - 0.8 * ph; const d2 = dir.clone().multiplyScalar(-1).applyAxisAngle(new V3(0, 1, 0), 1.1);
              dm.position.set(c[0] + d2.x * r2, c[1] + d2.y * r2, c[2] + d2.z * r2); dm.updateMatrix(); gC.setMatrixAt(i, dm.matrix);
            }
            gO.instanceMatrix.needsUpdate = gC.instanceMatrix.needsUpdate = true;
          }
        },
      };
    },
  });
})();
