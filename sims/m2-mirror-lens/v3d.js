/* m2-mirror-lens · 3D 거울과 렌즈의 상 (광선 다발)
   물체 끝에서 나온 빛이 거울·렌즈를 지나 상의 끝으로 모이거나(실선), 퍼져 나가는 것처럼 보이는 곳(점선)을 입체로 봐요.
   곡면 거울·렌즈는 이상적인 모형(상의 위치는 공식으로 계산하되 숫자는 보여 주지 않음)이에요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHN = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const TYPES = [
    { v: 'plane', l: '평면거울' }, { v: 'convexM', l: '볼록 거울' }, { v: 'concaveM', l: '오목 거울' },
    { v: 'convexL', l: '볼록 렌즈' }, { v: 'concaveL', l: '오목 렌즈' },
  ];
  const F = 1.5, A = 1.45, HO = 0.9;

  window.SciSim3D.attach({
    title: '거울과 렌즈 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: PHN ? 16 : 12, theta: 0.42, phi: 1.2, min: 6, max: 26, target: [1.2, 0.2, 0] },
    autoRotate: 0,
    levels: [2, 3],                  // 3·4단계(곡면 거울 · 렌즈, 카드 분류는 아래 버튼으로). 1·2단계는 카드 · 광선을 끄는 미션이라 2D
    build(ctx) {
      const { THREE, root, label, info, controls, renderer } = ctx;
      const V3 = THREE.Vector3;
      const mat = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.5, metalness: 0.05 }, o || {}));
      const sm = () => window.__sim;
      const MT = ctx.mats, lc = (h) => new THREE.Color(h).convertSRGBToLinear();   // 화면에서 색이 바래지 않게 (진한 색)

      // 광학대 바닥과 광축
      const cTex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); if (THREE.sRGBEncoding) t.encoding = THREE.sRGBEncoding; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; };
      const woodT = cTex(512, 256, (c, w, h) => { c.fillStyle = '#3a2a1c'; c.fillRect(0, 0, w, h); for (let i = 0; i < 60; i++) { c.strokeStyle = 'rgba(' + (20 + (i * 23) % 30) + ',12,4,' + (0.15 + (i % 4) * 0.05) + ')'; c.lineWidth = 1 + (i % 3); c.beginPath(); const y = i / 60 * h; c.moveTo(0, y); for (let x = 0; x <= w; x += 32) c.lineTo(x, y + Math.sin(x * 0.04 + i) * 2.5); c.stroke(); } }); woodT.repeat.set(3, 1);
      const bench = new THREE.Mesh(new THREE.BoxGeometry(22, 0.3, 6), mat(0xffffff, { map: woodT, roughness: 0.55 })); bench.position.set(1, -2.1, 0); bench.receiveShadow = true; root.add(bench);
      // 광학대 레일 + 눈금자
      const railT = cTex(1024, 64, (c, w, h) => { c.fillStyle = '#aab4c4'; c.fillRect(0, 0, w, h); c.fillStyle = '#1f2937'; for (let i = 0; i <= 40; i++) { c.fillRect(i * w / 40 - 1, 0, 2, i % 5 === 0 ? h * 0.5 : h * 0.28); } });
      const rail = new THREE.Mesh(new THREE.BoxGeometry(20, 0.2, 0.9), [MT.metal(0x9aa5b8, { roughness: 0.28 }), MT.metal(0x9aa5b8, { roughness: 0.28 }), mat(0xffffff, { map: railT, metalness: 0.5, roughness: 0.35 }), mat(0x667286, { metalness: 0.8 }), MT.metal(0x9aa5b8, { roughness: 0.28 }), MT.metal(0x9aa5b8, { roughness: 0.28 })]); rail.position.set(1, -1.86, 0); rail.receiveShadow = true; root.add(rail);
      const wallT = cTex(8, 256, (c, w, h) => { const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#27375a'); g.addColorStop(1, '#0e1830'); c.fillStyle = g; c.fillRect(0, 0, w, h); });
      const wallM = new THREE.Mesh(new THREE.PlaneGeometry(90, 40), new THREE.MeshBasicMaterial({ map: wallT })); wallM.position.set(0, 8, -14); root.add(wallM);
      const metalM = MT.metal('steel', { brushed: true, roughness: 0.2 });
      // 받침 수레 (레일 위를 오가는 홀더)
      function carriage(h) { const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.22, 1.1), metalM); b.position.y = -1.65; const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.16, 20), MT.plastic(0x14171c)); knob.position.set(0.0, -1.72, 0.62); knob.rotation.x = Math.PI / 2; const p = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, h, 10), metalM); p.position.y = -1.54 + h / 2; g.add(b, knob, p); return g; }
      { const ax = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 20, 6), new THREE.MeshBasicMaterial({ color: 0x8aa0d0, transparent: true, opacity: 0.6 })); ax.rotation.z = Math.PI / 2; ax.position.set(1, 0, 0); ax.userData.v3bg = true; root.add(ax); }
      [bench, rail, wallM].forEach((m) => { m.userData.v3bg = true; });   // 자동 맞춤은 광학대 대신 물체·거울(렌즈)·상에 맞춰요

      // 물체 (화살표): 밑은 광축 위, 끝에서 빛이 나가요
      function arrowObj(col, op) {
        const g = new THREE.Group(); const m = mat(lc(col), { roughness: 0.3, metalness: 0, emissive: lc(col), emissiveIntensity: 0.4, transparent: op < 1, opacity: op, depthWrite: op >= 1 });
        const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1, 14), m), hd = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.32, 18), m);
        g.add(sh, hd); const base = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8), m); g.add(base);
        g.userData = { sh, hd };
        return g;
      }
      function setArrow(g, h) { // h: 부호 있는 높이
        const { sh, hd } = g.userData, s = h >= 0 ? 1 : -1, a = Math.abs(h), hl = Math.min(0.32, a * 0.5);
        sh.scale.y = Math.max(0.001, a - hl); sh.position.y = s * (a - hl) / 2;
        hd.position.y = s * (a - hl / 2); hd.scale.set(1, hl / 0.32, 1); hd.rotation.z = s > 0 ? 0 : Math.PI;
      }
      const obj = arrowObj(0xff5a5f, 1), img = arrowObj(0x7ee0ff, 1); root.add(obj, img);
      ctx.halo(obj.userData.hd, 0xffb070, 1.5, 0.5);   // 물체(촛불) 끝에서 빛이 나와요
      const fitBox = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false })); root.add(fitBox);
      obj.add(carriage(1.55)); { const gh = carriage(1.55); gh.traverse((m) => { if (m.material) { m.material = m.material.clone(); m.material.transparent = true; m.material.opacity = 0.4; } }); img.add(gh); }
      const lobj = label('물체 (촛불)', obj, { offset: [0, 1.25, 0] }), limg = label('상', img, { offset: [0, 1.3, 0], color: 'rgba(40,120,170,.9)' });

      // 거울 · 렌즈 부품
      const parts = { plane: new THREE.Group(), convexM: new THREE.Group(), concaveM: new THREE.Group(), convexL: new THREE.Group(), concaveL: new THREE.Group() };
      Object.values(parts).forEach((g) => { g.visible = false; root.add(g); });
      const silver = MT.metal('chrome', { roughness: 0.06, extra: { side: THREE.DoubleSide, envMapIntensity: 1.6 } });   // 거울: 주변이 비쳐요
      const back = MT.plastic(lc(0x2a3040), { roughness: 0.55, extra: { side: THREE.DoubleSide } });
      {
        const pm = new THREE.Mesh(new THREE.CylinderGeometry(A * 1.1, A * 1.1, 0.06, 64), silver); pm.rotation.z = Math.PI / 2; parts.plane.add(pm);
        const bk = new THREE.Mesh(new THREE.CylinderGeometry(A * 1.1, A * 1.1, 0.1, 64), back); bk.rotation.z = Math.PI / 2; bk.position.x = 0.07; parts.plane.add(bk);
      }
      function cap(R, concave) {
        const g = new THREE.Group(), th = Math.asin(Math.min(0.9, A * 1.1 / R));
        const geo = new THREE.SphereGeometry(R, 64, 24, 0, Math.PI * 2, 0, th);
        const m = new THREE.Mesh(geo, silver); m.castShadow = true;
        const m2 = new THREE.Mesh(new THREE.SphereGeometry(R + 0.07, 64, 24, 0, Math.PI * 2, 0, th), back);
        const h = new THREE.Group(); h.add(m, m2);
        if (concave) { h.rotation.z = -Math.PI / 2; h.position.x = -R; } // 오목: 곡률 중심이 앞(왼쪽), 정점은 x=0
        else { h.rotation.z = Math.PI / 2; h.position.x = R; }
        // 정점이 x=0이 되도록 보정 (구의 꼭대기가 +Y → 회전 후 ±x)
        g.add(h); return g;
      }
      parts.concaveM.add(cap(2 * F, true)); parts.convexM.add(cap(2 * F, false));
      function lens(concave) {
        const g = new THREE.Group(), pts = [], N = 24, t0 = concave ? 0.06 : 0.3, t1 = concave ? 0.34 : 0.04;
        const th = (r) => t0 + (t1 - t0) * Math.pow(r / (A * 1.1), 2);
        for (let i = 0; i <= N; i++) { const r = A * 1.1 * i / N; pts.push(new THREE.Vector2(r, -th(r))); }
        for (let i = N; i >= 0; i--) { const r = A * 1.1 * i / N; pts.push(new THREE.Vector2(r, th(r))); }
        const geo = new THREE.LatheGeometry(pts, 64); const m = new THREE.Mesh(geo, MT.glass({ tint: 0xbfe4ff, opacity: 0.34, extra: { envMapIntensity: 2.6 } }));
        m.rotation.z = Math.PI / 2; m.renderOrder = 2; g.add(m);
        const ring = new THREE.Mesh(new THREE.TorusGeometry(A * 1.1, 0.045, 12, 72), MT.metal('steel', { roughness: 0.25 })); ring.rotation.y = Math.PI / 2; g.add(ring);
        return g;
      }
      parts.convexL.add(lens(false)); parts.concaveL.add(lens(true));
      // 받침대
      const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.6, 12), metalM); stand.position.set(0.0, -1.1, 0); root.add(stand); { const cr = carriage(0.01); root.add(cr); }
      // 초점 표시
      const fm = [-1, 1].map(() => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.1, 20, 14), new THREE.MeshBasicMaterial({ color: lc(0xffd34d) })); ctx.halo(m, 0xffd34d, 0.8, 0.5); root.add(m); return m; });
      const lf = [label('초점', fm[0], { offset: [0, -0.35, 0] }), label('초점', fm[1], { offset: [0, -0.35, 0] })];

      // 광선 (가는 원기둥 인스턴스)
      const MAXI = 420;
      const cyl = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 1, 6), new THREE.MeshBasicMaterial({ color: 0xffe066 }), MAXI); cyl.frustumCulled = false; cyl.userData.v3bg = true; root.add(cyl);
      const dash = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 1, 6), new THREE.MeshBasicMaterial({ color: 0xbfe8ff, transparent: true, opacity: 0.75 }), MAXI); dash.frustumCulled = false; dash.userData.v3bg = true; root.add(dash);
      const dm = new THREE.Object3D(), up = new V3(0, 1, 0);
      let nC = 0, nD = 0;
      function seg(inst, p, q, r) {
        const d = new V3().subVectors(q, p), len = d.length(); if (len < 1e-4) return;
        const n = inst === cyl ? nC++ : nD++; if (n >= MAXI) return;
        dm.position.copy(p).addScaledVector(d, 0.5); dm.quaternion.setFromUnitVectors(up, d.normalize()); dm.scale.set(r, len, r); dm.updateMatrix(); inst.setMatrixAt(n, dm.matrix);
      }
      function dashed(p, q) { const d = new V3().subVectors(q, p), L = d.length(), k = Math.max(2, Math.floor(L / 0.28)); for (let i = 0; i < k; i += 2) seg(dash, p.clone().addScaledVector(d, i / k), p.clone().addScaledVector(d, Math.min(1, (i + 1) / k)), 0.012); }

      let type = 'convexL', r = 2.2, trueR = null, labsOn = true;
      let cacheTxt = '';
      const ND = 12;
      function compute() {
        const d = r * F, T = new V3(-d, HO, 0);
        let Q = null, real = true, m = 1, farAway = false;
        const isMirror = type === 'plane' || type === 'convexM' || type === 'concaveM';
        if (type === 'plane') { Q = new V3(d, HO, 0); real = false; m = 1; }
        else {
          const f = type === 'convexL' || type === 'concaveM' ? F : -F;   // 모으는 것: +f
          const inv = 1 / f - 1 / d;                                       // 1/v (실제 상은 +)
          if (Math.abs(inv) < 0.03) { farAway = true; }
          const v = farAway ? 99 * Math.sign(f) : 1 / inv;                 // v>0 : 실제로 모이는 쪽
          m = -v / d; real = v > 0;
          const vx = isMirror ? -v : v;                                    // 거울: 실제로 모이면 앞쪽(왼쪽)
          Q = new V3(vx, m * HO, 0);
          if (Math.abs(vx) > 9.5) farAway = true;
        }
        return { d, T, Q, real, m, farAway, isMirror };
      }
      function rebuild() {
        const c = compute(); nC = 0; nD = 0;
        const rays = [];
        for (let i = 0; i < ND; i++) {
          const a = i / ND * Math.PI * 2, P = new V3(0, A * Math.cos(a), A * Math.sin(a));
          seg(cyl, c.T, P, 0.017);
          // 지난 뒤의 방향
          let dir;
          if (c.farAway) { // 초점 근처: 거의 나란히 나가요
            dir = c.isMirror ? new V3(-c.d, -HO, 0).normalize() : new V3(c.d, -HO, 0).normalize();
            seg(cyl, P, P.clone().addScaledVector(dir, 6.5), 0.017); continue;
          }
          const Q = c.Q;
          if (c.real) { dir = new V3().subVectors(Q, P).normalize(); seg(cyl, P, Q.clone().addScaledVector(dir, 1.1), 0.017); }
          else { dir = new V3().subVectors(P, Q).normalize(); seg(cyl, P, P.clone().addScaledVector(dir, 3.6), 0.017); dashed(P, Q); }
        }
        cyl.count = nC; dash.count = nD; cyl.instanceMatrix.needsUpdate = true; dash.instanceMatrix.needsUpdate = true;
        // 물체 · 상 화살표
        obj.position.set(-c.d, 0, 0); setArrow(obj, HO); lobj.show(true);
        const show = !c.farAway;
        img.visible = show; limg.show(show && labsOn);
        if (show) {
          img.position.set(c.Q.x, 0, 0); setArrow(img, c.Q.y);
          img.children.forEach((q) => { if (q.material) { q.material.transparent = !c.real; q.material.opacity = c.real ? 1 : 0.5; q.material.depthWrite = c.real; q.material.needsUpdate = true; } });
        }
        { // 자동 맞춤용 보이지 않는 상자: 물체 · 거울(렌즈) · 상 · 초점을 한 덩어리로 재서 모두 화면 안에 크게
          const xs = [-c.d, 0, -F, F]; if (show) xs.push(c.Q.x);
          const x0 = Math.max(-12, Math.min.apply(null, xs)) - 0.7, x1 = Math.min(12, Math.max.apply(null, xs)) + 0.7;
          const qy = show ? Math.max(-6, Math.min(6, c.Q.y)) : 0, yT = Math.max(HO, qy, 1.4) + 0.9, yB = Math.min(-1.9, qy - 0.4);
          fitBox.scale.set(x1 - x0, yT - yB, Math.max(1.3, 0.14 * (x1 - x0))); fitBox.position.set((x0 + x1) / 2, (yT + yB) / 2, 0);   // (얇으면 바닥판으로 여겨 빠지니 두께를 줘요)
        }
        // 초점 점
        const mir = c.isMirror;
        const showF = type !== 'plane';
        fm[0].visible = fm[1].visible = showF; lf[0].show(showF && labsOn); lf[1].show(showF && labsOn);
        if (showF) {
          if (mir) { const fx = type === 'concaveM' ? -F : F; fm[0].position.set(fx, 0, 0); fm[1].visible = false; lf[1].show(false); }
          else { fm[0].position.set(-F, 0, 0); fm[1].position.set(F, 0, 0); }
        }
        // 설명
        const size = Math.abs(c.m) > 1.12 ? '물체보다 <b>커요</b>' : Math.abs(c.m) < 0.89 ? '물체보다 <b>작아요</b>' : '물체와 <b>크기가 같아요</b>';
        const dirw = c.m > 0 ? '<b>바로</b> 서 있어요' : '<b>거꾸로</b> 서 있어요';
        const how = c.real ? '빛이 <b>실제로 모이는 곳</b>(실선)에 상이 보여요.' : '빛이 <b>퍼져 나가서</b>, 거꾸로 연장한 점선이 만나는 곳에 상이 보여요.';
        const nm = TYPES.find((q) => q.v === type).l;
        const txt = sortNote + (c.farAway ? `<b>${nm}</b><br>물체가 초점 가까이에 있어서 빛이 거의 나란히 나가요.<br>상이 아주 멀리 생겨요.` : `<b>${nm}</b> · 상은 ${size}, ${dirw}<br>${how}`);
        if (txt !== cacheTxt) { cacheTxt = txt; info(txt); }
      }
      const cmOf = (v) => Math.round(v * 3.125 * 2) / 2;               // 평면거울: 물체 거리를 cm로 (실험의 2~10 cm)
      let pushedAt = -9, now = 0;
      /* 3D에서 바꾼 값을 실험에도 똑같이 반영해요 */
      function to2d() {
        const s = sm(); if (!s) return;
        pushedAt = now;
        try {
          if (type === 'plane') { if (s.scene === 'plane' && s.plGoCm) s.plGoCm(cmOf(r), true); return; }
          const mir = type === 'convexM' || type === 'concaveM';
          if (mir && s.scene === 'mirror') {
            const want = type === 'concaveM' ? 'concave' : 'convex';
            if (s.BN.mtype !== want) { s.BN.mtype = want; s.BN.fade = 0; s.syncUI(); }
            s.setBenchD('mirror', r * s.BG_.f, true);
          } else if (!mir && s.scene === 'lens') {
            const want = type === 'convexL' ? 'convex' : 'concave';
            if (s.LN.ltype !== want) { s.LN.ltype = want; s.LN.fade = 0; s.syncUI(); }
            s.setBenchD('lens', r * s.BG_.fl, true);
          }
        } catch (e) { /* 2D 상태를 읽을 수 없으면 3D만 바꿔요 */ }
      }
      let allowed = TYPES.map((q) => q.v), ctlEl = null;
      function showAllowed(list) {
        allowed = list;
        if (!ctlEl) ctlEl = renderer.domElement.closest('.v3-wrap').querySelector('.v3-ctl');
        const labs = {}; TYPES.forEach((q) => { labs[q.l] = q.v; });
        [...ctlEl.querySelectorAll('button')].forEach((b) => { const v = labs[b.textContent.trim()]; if (v) b.style.display = list.includes(v) ? '' : 'none'; });
      }
      const seg1 = controls.segment('종류', TYPES.map((q) => ({ label: q.l, value: q.v })), type, (v) => { type = v; show(); pl && pl.pause(); rebuild(); rng.set(r); to2d(); });
      const rng = controls.range('물체 거리', 0.5, 3.2, 0.02, r, (v) => { r = v; pl && pl.pause(); rebuild(); to2d(); }, (v) => (type === 'plane' ? '거울에서 ' + cmOf(v) + ' cm' : v < 1 ? '가까이' : v < 1.7 ? '조금 멀리' : '멀리'));
      /* ▶ 재생: 물체가 거울·렌즈에 가까이 갔다가 멀어지는 것을 반복해서 상의 변화를 봐요 */
      let pl = null, lastCm = -1;
      pl = controls.player({
        duration: 12, loop: true, autoplay: false, label: '물체 오가기',
        phases: [[0, '가까이'], [0.15, '점점 멀어져요'], [0.5, '멀리'], [0.65, '점점 가까워져요']],
        onFrame(p) {
          if (!pl) return;     // 만들어질 때 한 번 불리는 초기 호출은 무시해요
          r = 0.5 + 2.7 * (0.5 - 0.5 * Math.cos(p * Math.PI * 2)); rng.set(r); rebuild();
          if (type !== 'plane') to2d(); else if (cmOf(r) !== lastCm) { lastCm = cmOf(r); to2d(); }
        },
      });
      controls.button('이름표', () => { labsOn = !labsOn; limg.show(labsOn); lobj.show(labsOn); lf.forEach((l) => l.show(labsOn)); rebuild(); });
      let sortNote = '';
      /* 카드 분류(거울 쓰임 짝짓기 · 렌즈 사례 분류): 카드를 고른 뒤 상자 버튼을 눌러요 → 실험의 카드 상태와 같아요(window.__sim.sortPick) */
      const bar = renderer.domElement.closest('.v3-wrap').querySelector('.v3-ctl');
      const SG = {};
      ['sortM', 'sortL'].forEach((kind) => {
        const def = sm() && sm().SORTS && sm().SORTS[kind]; if (!def) return;
        const before = bar.children.length, g = { sel: 0 };
        g.seg = controls.segment('카드', def.cards.map((c, i) => ({ label: c.t, value: i })), 0, (v) => { g.sel = v; });
        def.bins.forEach((b) => controls.button(b.label + '에 넣기', () => { const s = sm(); if (s && s.sortPick && s.scene === kind && s.SORT.kind === kind) { s.sortPick(g.sel, b.id); sortTick(true); from2d(); } }));
        g.els = [...bar.children].slice(before);
        g.cardBtns = g.els.filter((e) => e.tagName === 'BUTTON').slice(0, def.cards.length);
        g.els.forEach((e) => { e.style.display = 'none'; });
        SG[kind] = g;
      });
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
      const binPan = v3xPan();   // 🗃️ 상자: 맞게 넣은 카드가 상자에 쌓여요 (2D 상자와 같아요)
      function drawBins(kind, cards) {
        const def = kind && sm().SORTS[kind]; if (!def) { binPan.set(''); return; }
        binPan.set('<div class="h">🗃️ 상자</div>' + def.bins.map((b) => { const got = cards.filter((c) => c.placed && def.cards[c.ci].bin === b.id).map((c) => '<span class="c">' + def.cards[c.ci].e + ' ' + def.cards[c.ci].t + '</span>');
          return '<div>' + b.label + ': ' + (got.join('') || '<span class="q">—</span>') + '</div>'; }).join(''));
      }
      let sortShown = '', sortKey = '';
      function sortTick(force) {
        const s = sm(), kind = s && SG[s.scene] && s.SORT && s.SORT.kind === s.scene ? s.scene : '';
        if (kind !== sortShown) { sortShown = kind; sortKey = ''; Object.keys(SG).forEach((k) => SG[k].els.forEach((e) => { e.style.display = k === kind ? '' : 'none'; })); }
        if (!kind) { binPan.set(''); return; }
        const g = SG[kind], cards = s.SORT.cards, key = cards.map((c) => c.ci + (c.placed ? 'p' : '')).join();
        if (key === sortKey && !force) return; sortKey = key;
        drawBins(kind, cards);
        const placed = new Set(cards.filter((c) => c.placed).map((c) => c.ci));
        g.cardBtns.forEach((b, i) => { b.style.display = placed.has(i) ? 'none' : ''; });
        if (placed.has(g.sel)) { const nx = g.cardBtns.findIndex((b, i) => !placed.has(i)); if (nx >= 0) { g.sel = nx; g.seg.set(nx); } }
      }
      function show() { Object.entries(parts).forEach(([k, g]) => { g.visible = k === type; }); }
      show(); rebuild();
      // 2D 실험의 종류 · 물체 거리를 따라가요 (2D가 바뀔 때만)
      let last2d = '';
      function from2d() {
        const s = sm(); if (!s) return;
        let t = null, rr = null, list = null;
        try {
          if (s.scene === 'plane') { t = 'plane'; rr = s.plCm() / 3.125; list = ['plane']; }
          else if (s.scene === 'mirror') { const c = s.calcMirror(); t = c.conc ? 'concaveM' : 'convexM'; rr = c.d / c.f; list = ['convexM', 'concaveM']; }
          else if (s.scene === 'lens') { const c = s.calcLens(); t = c.conv ? 'convexL' : 'concaveL'; rr = c.d / c.f; list = ['convexL', 'concaveL']; }
          else if (s.scene === 'rays' || s.scene === 'eye') { t = 'plane'; list = ['plane']; }
          else if (s.scene === 'sortM') { list = ['convexM', 'concaveM']; t = list.indexOf(type) >= 0 ? type : 'convexM'; rr = list.indexOf(type) >= 0 ? null : 2; }
          else if (s.scene === 'sortL') { list = ['convexL', 'concaveL']; t = list.indexOf(type) >= 0 ? type : 'convexL'; rr = list.indexOf(type) >= 0 ? null : 2; }
        } catch (e) { return; }
        const msg = (s.scene === 'sortM' || s.scene === 'sortL') && s.SORT && s.SORT.msg ? '<span style="color:' + (s.SORT.msg.good ? '#86efac' : '#fca5a5') + '">' + s.SORT.msg.text + '</span><br>' : '';
        const nn = s.scene === 'sortM' ? '<b>거울 쓰임 짝짓기</b>: 아래에서 카드를 고른 뒤 알맞은 거울 상자 버튼을 눌러요.<br>' + msg : s.scene === 'sortL' ? '<b>렌즈 사례 분류</b>: 아래에서 카드를 고른 뒤 알맞은 렌즈 상자 버튼을 눌러요.<br>' + msg : '';
        if (nn !== sortNote) { sortNote = nn; cacheTxt = ''; if (t === type) rebuild(); }
        if (!t) return;
        if (list.join() !== allowed.join()) showAllowed(list);
        if (now - pushedAt < 0.8 || (pl && pl.playing)) return;       // 방금 3D에서 바꿨거나 재생 중이면 2D 값으로 되돌리지 않아요
        const key = t + ':' + (rr == null ? '' : rr.toFixed(2));
        if (key === last2d) return; last2d = key;
        type = t; if (rr != null) r = Math.max(0.5, Math.min(3.2, rr)); seg1.set(type); rng.set(r); show(); rebuild();
      }
      let k0 = 0;
      return { sync() { from2d(); }, update(dt, t) { now = t; if ((k0++ % 10) === 0) { from2d(); sortTick(); } fm.forEach((f) => f.scale.setScalar(1 + 0.15 * Math.sin(t * 4))); } };
    },
  });
})();
