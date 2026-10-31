/* he-eclipse · 3D 달 궤도의 기울기와 교점, 식 계절
   지구를 가운데 두고(지구 중심 모형) 황도면, 5.1° 기울어진 달 궤도, 교점(승교점·강교점), 태양의 방향을 입체로 봐요.
   날짜를 흘려 보내면 교점선은 거의 제자리인데 태양이 황도를 따라 1년에 한 바퀴 돌아, 태양이 교점선 근처에 올 때(식 계절)
   삭·망이 일어나면 달이 황도면 가까이(황위 약 ±1.5° 이내)에 있어서 일식·월식이 일어나요.
   천체력(황경·교점 이동·거리)과 일식·월식 판정 식은 2D 실험과 같아요. 지구·달 크기와 거리는 보기 좋게 그렸어요(축척 아님). */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const DEG = Math.PI / 180, TAU = Math.PI * 2;
  const KM = { Rs: 696000, Re: 6371, Rm: 1737.4, a: 384400, dS: 149.6e6 };
  const EP = { L0: 0, Om0: 15, D0: 130, A0: 160, perih: 287 };
  const M_SUN = 0.985647, M_MOON = 13.176396, M_NODE = -0.052954, M_ANOM = 13.064993, M_SYN = 12.190749, DAYMAX = 400;
  const norm = (a) => ((a % 360) + 360) % 360;
  const sunLon = (d) => EP.L0 + M_SUN * d, moonLon = (d) => EP.L0 + EP.D0 + M_MOON * d, nodeLon = (d) => EP.Om0 + M_NODE * d;
  const dSun = (d) => KM.dS * (1 - 0.0167 * Math.cos(TAU * (d - EP.perih) / 365.25));
  const rMoon = (d) => KM.a * (1 - 0.0549 * Math.cos((EP.A0 + M_ANOM * d) * DEG));
  const betaOf = (d, i) => Math.asin(Math.sin(i * DEG) * Math.sin((moonLon(d) - nodeLon(d)) * DEG)) / DEG;
  const luOf = (r, dS) => KM.Rm * (dS - r) / (KM.Rs - KM.Rm);
  const penOf = (r, dS, d) => KM.Rm + d * (KM.Rs + KM.Rm) / (dS - r);
  function solarType(r, dS, X) {
    if (X >= KM.Re + penOf(r, dS, r)) return '없음'; if (X >= KM.Re) return '부분';
    const Lu = luOf(r, dS); return r < Lu ? '개기' : r < Lu + KM.Re ? '혼성' : '금환';
  }
  function lunarType(r, dS, X) {
    const rU = KM.Re - r * (KM.Rs - KM.Re) / dS, rP = KM.Re + r * (KM.Rs + KM.Re) / dS;
    if (X + KM.Rm <= rU) return '개기'; if (X - KM.Rm < rU) return '부분'; if (X - KM.Rm < rP) return '반영'; return '없음';
  }
  function syzygies(tilt) {
    const out = [];
    for (let n = 1; n < 60; n++) {
      const d = (180 * n - EP.D0) / M_SYN; if (d < 0) continue; if (d > DAYMAX) break;
      const isNew = n % 2 === 0, r = rMoon(d), dS = dSun(d), X = r * Math.sin(Math.abs(betaOf(d, tilt)) * DEG);
      out.push({ d, n, kind: isNew ? 'new' : 'full', type: isNew ? solarType(r, dS, X) : lunarType(r, dS, X), beta: betaOf(d, tilt) });
    }
    return out;
  }
  const phaseName = (Dw) => (Dw < 6 || Dw > 354 ? '삭' : Math.abs(Dw - 180) <= 6 ? '망' : Math.abs(Dw - 90) <= 6 ? '상현' : Math.abs(Dw - 270) <= 6 ? '하현' : Dw < 180 ? '차오르는 달' : '기우는 달');
  const ecl = (name, kind) => (kind === 'new' ? name + ' 일식' : name === '반영' ? '반영식' : name + ' 월식');
  const wide = (window.innerWidth || 1000) >= 600;
  const RM = 4.3, RE = 0.45, SD = 9, PLANE = 6.4;
  const VIEWS = wide ? { top: { dist: 17, theta: 0, phi: 0.3 }, obl: { dist: 16, theta: 0.5, phi: 0.95 }, side: { dist: 15, theta: 0.4, phi: 1.42 } }
    : { top: { dist: 24, theta: 0, phi: 0.3 }, obl: { dist: 24, theta: 0.5, phi: 0.95 }, side: { dist: 22, theta: 0.4, phi: 1.42 } };

  window.SciSim3D.attach({
    host: '.stage-canvas',
    button: wide ? undefined : null,
    title: '3D 달 궤도·교점·식 계절',
    hint: ' ',
    camera: Object.assign({ fov: 45, target: [0, 0, 0], min: 4, max: 40 }, VIEWS.obl),
    autoRotate: 0.08,
    build(ctx) {
      const { THREE, scene, root, label, info, controls, orbit } = ctx;
      const st = { day: 8, tilt: 5.1, play: false, goal: null, band: true, season: true, view: 'obl' };
      try { const s = window.__sim && window.__sim.S; if (s) { if (typeof s.day === 'number') st.day = Math.min(DAYMAX, Math.max(0, s.day)); if (typeof s.tilt === 'number') st.tilt = s.tilt; } } catch (e) {}
      let SYZ = syzygies(st.tilt);

      let dirLight = null;
      scene.traverse((o) => { if (o.isDirectionalLight) dirLight = o; if (o.isHemisphereLight) o.intensity = 0.34; });
      if (dirLight) dirLight.intensity = 2.4;
      { let seed = 21; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }; const pos = [];
        for (let i = 0; i < 300; i++) { const u = rnd() * 2 - 1, a = rnd() * TAU, r = Math.sqrt(1 - u * u); pos.push(Math.cos(a) * r * 60, u * 60, Math.sin(a) * r * 60); }
        const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        root.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0x9fb4e8, size: 1.5, sizeAttenuation: false, transparent: true, opacity: 0.5 }))); }

      const ringP = (a, r, y) => [r * Math.cos(a * DEG), y || 0, -r * Math.sin(a * DEG)];
      const eclToW = (v) => [v[0], v[2], -v[1]]; // 황도 좌표(x,y,z 북) → 화면 좌표
      const glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,230,140,1)'); gr.addColorStop(0.25, 'rgba(255,190,60,.55)'); gr.addColorStop(1, 'rgba(255,160,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();

      /* 황도면, 눈금, 식 계절 부채꼴 */
      const planeMesh = new THREE.Mesh(new THREE.CircleGeometry(PLANE, 72), new THREE.MeshBasicMaterial({ color: 0x4aa3ff, transparent: true, opacity: 0.13, side: THREE.DoubleSide, depthWrite: false })); planeMesh.rotation.x = -Math.PI / 2; root.add(planeMesh);
      { const pts = []; for (let i = 0; i <= 96; i++) pts.push(new THREE.Vector3(...ringP(i * 3.75, PLANE))); root.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x7dc0ff, transparent: true, opacity: 0.9 })));
        for (let a = 0; a < 360; a += 30) { const t = [new THREE.Vector3(...ringP(a, PLANE - 0.15)), new THREE.Vector3(...ringP(a, PLANE + 0.15))]; root.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(t), new THREE.LineBasicMaterial({ color: 0x9cc9ff }))); } }
      const eclLab = label('황도면 (지구 공전 궤도면)', ringP(300, PLANE + 0.3), { size: 12, color: 'rgba(20,60,120,.88)' });
      const seasonGrp = new THREE.Group(); seasonGrp.rotation.x = -Math.PI / 2; root.add(seasonGrp);
      const wedgeMat = new THREE.MeshBasicMaterial({ color: 0xffd34d, transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false });
      const wedges = [new THREE.Mesh(new THREE.BufferGeometry(), wedgeMat), new THREE.Mesh(new THREE.BufferGeometry(), wedgeMat)]; wedges.forEach((w) => { w.position.z = 0.004; seasonGrp.add(w); });
      const seasonLab = label('식 계절 구간', [0, 0, 0], { size: 11.5, color: 'rgba(110,80,0,.9)' });
      let lastLim = -1;
      const limOf = (i) => (i < 0.05 ? 90 : Math.asin(Math.min(1, ((KM.Re + penOf(KM.a, KM.dS, KM.a)) / KM.a) / Math.sin(i * DEG))) / DEG);

      /* 지구, 태양 */
      const earthTex = (() => { const c = document.createElement('canvas'); c.width = 256; c.height = 128; const g = c.getContext('2d'); g.fillStyle = '#2f7fd8'; g.fillRect(0, 0, 256, 128); g.fillStyle = '#4caf6a';
        let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
        for (let i = 0; i < 16; i++) { const x = rnd() * 256, y = 20 + rnd() * 88; for (let j = 0; j < 7; j++) { g.beginPath(); g.ellipse(x + (rnd() - 0.5) * 30, y + (rnd() - 0.5) * 18, 6 + rnd() * 16, 4 + rnd() * 9, rnd() * 3, 0, 7); g.fill(); } }
        g.fillStyle = '#f2f6fa'; g.fillRect(0, 0, 256, 7); g.fillRect(0, 121, 256, 7); return new THREE.CanvasTexture(c); })();
      const earth = new THREE.Mesh(new THREE.SphereGeometry(RE, 32, 20), new THREE.MeshStandardMaterial({ map: earthTex, roughness: 0.75 })); root.add(earth);
      label('지구', [0, 0.85, 0], { size: 13 });
      const sun = new THREE.Mesh(new THREE.SphereGeometry(0.75, 28, 18), new THREE.MeshBasicMaterial({ color: 0xffd23f })); root.add(sun);
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); glow.scale.set(4.8, 4.8, 1); root.add(glow);
      const sunLab = label('☀ 태양', sun, { size: 13, color: 'rgba(120,70,0,.85)', offset: [0, 1.15, 0] });
      const sunLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(1, 0, 0)]), new THREE.LineDashedMaterial({ color: 0xfde047, dashSize: 0.2, gapSize: 0.15 })); root.add(sunLine);
      const shLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(-1, 0, 0)]), new THREE.LineDashedMaterial({ color: 0x94a3b8, dashSize: 0.1, gapSize: 0.15 })); root.add(shLine);

      /* 달 궤도 · 교점선 · 달 */
      const OP = 120, opPos = new Float32Array((OP + 1) * 3), opCol = new Float32Array((OP + 1) * 3), opGeo = new THREE.BufferGeometry();
      opGeo.setAttribute('position', new THREE.BufferAttribute(opPos, 3)); opGeo.setAttribute('color', new THREE.BufferAttribute(opCol, 3));
      const oline = new THREE.Line(opGeo, new THREE.LineBasicMaterial({ vertexColors: true })); oline.frustumCulled = false; root.add(oline);
      const mpl = new THREE.Mesh(new THREE.CircleGeometry(RM, 72), new THREE.MeshBasicMaterial({ color: 0xf5a3c7, transparent: true, opacity: 0.1, side: THREE.DoubleSide, depthWrite: false })); mpl.matrixAutoUpdate = false; root.add(mpl);
      const nodeGeo = new THREE.BufferGeometry(); nodeGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
      const nodeLine = new THREE.Line(nodeGeo, new THREE.LineDashedMaterial({ color: 0xffd34d, dashSize: 0.22, gapSize: 0.16 })); nodeLine.frustumCulled = false; root.add(nodeLine);
      const asc = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffd34d })), dsc = asc.clone(); root.add(asc, dsc);
      const ascLab = label('승교점 ☊', asc, { size: 11.5, offset: [0, -0.35, 0], color: 'rgba(110,80,0,.9)' }), dscLab = label('강교점 ☋', dsc, { size: 11.5, offset: [0, -0.35, 0], color: 'rgba(110,80,0,.9)' });
      const drop = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 1, 0)]), new THREE.LineBasicMaterial({ color: 0x7dd3fc })); drop.frustumCulled = false; root.add(drop);
      const foot = new THREE.Mesh(new THREE.CircleGeometry(0.18, 20), new THREE.MeshBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.5, side: THREE.DoubleSide })); foot.rotation.x = -Math.PI / 2; root.add(foot);
      const moonTex = (() => { const c = document.createElement('canvas'); c.width = 256; c.height = 128; const g = c.getContext('2d'); g.fillStyle = '#cfcbc0'; g.fillRect(0, 0, 256, 128); g.fillStyle = 'rgba(95,95,105,.55)';
        [[118, 50, 22, 14], [140, 66, 18, 12], [105, 78, 13, 9], [150, 44, 12, 8], [128, 92, 10, 6]].forEach((b) => { g.beginPath(); g.ellipse(b[0], b[1], b[2], b[3], 0.3, 0, 7); g.fill(); }); return new THREE.CanvasTexture(c); })();
      const moon = new THREE.Mesh(new THREE.SphereGeometry(0.17, 24, 16), new THREE.MeshStandardMaterial({ map: moonTex, roughness: 0.95 })); root.add(moon);
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, color: 0xf97316 })); halo.scale.set(1.6, 1.6, 1); halo.visible = false; root.add(halo);

      /* 식이 일어날 수 있는 범위: 황도면 위·아래 약 1.5° (달 거리에서 얇은 띠) */
      const BETA_LIM = Math.asin((KM.Re + penOf(KM.a, KM.dS, KM.a)) / KM.a) / DEG, HB = RM * Math.sin(BETA_LIM * DEG);
      const band = new THREE.Mesh(new THREE.CylinderGeometry(RM, RM, 2 * HB, 72, 1, true), new THREE.MeshBasicMaterial({ color: 0xffd34d, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false })); root.add(band);
      const bandLab = label('식이 일어날 수 있는 범위 (황위 약 ±1.5°)', ringP(100, RM, HB + 0.02), { size: 11, color: 'rgba(110,80,0,.9)' });
      const moonLab = label('달', moon, { size: 13, offset: [0, 0.5, 0] });

      const V = new THREE.Vector3(); let lastHtml = '';
      function refresh() {
        const d = st.day, i = st.tilt * DEG, Om = nodeLon(d) * DEG, sLon = sunLon(d);
        // 태양
        const sp = ringP(sLon, SD); sun.position.set(...sp); glow.position.set(...sp);
        const sl = sunLine.geometry.attributes.position; sl.setXYZ(1, ...sp); sl.needsUpdate = true; sunLine.computeLineDistances();
        const hl = shLine.geometry.attributes.position; hl.setXYZ(1, ...ringP(sLon + 180, 5.6)); hl.needsUpdate = true; shLine.computeLineDistances();
        if (dirLight) dirLight.position.set(sp[0] * 7, 0, sp[2] * 7);
        // 달 궤도(황도 좌표의 기울어진 원)
        const orbitPt = (u) => [Math.cos(Om) * Math.cos(u) - Math.sin(Om) * Math.cos(i) * Math.sin(u), Math.sin(Om) * Math.cos(u) + Math.cos(Om) * Math.cos(i) * Math.sin(u), Math.sin(i) * Math.sin(u)];
        for (let k = 0; k <= OP; k++) { const u = k / OP * TAU, v = orbitPt(u), w = eclToW(v); opPos.set([w[0] * RM, w[1] * RM, w[2] * RM], k * 3); opCol.set(v[2] >= -1e-6 ? [0.49, 0.83, 0.99] : [0.98, 0.75, 0.14], k * 3); }
        opGeo.attributes.position.needsUpdate = true; opGeo.attributes.color.needsUpdate = true;
        const e1 = new THREE.Vector3(...eclToW(orbitPt(0))), e2 = new THREE.Vector3(...eclToW(orbitPt(Math.PI / 2))), nrm = new THREE.Vector3().crossVectors(e1, e2);
        mpl.matrix.makeBasis(e1, e2, nrm); mpl.matrixWorldNeedsUpdate = true;
        asc.position.copy(e1).multiplyScalar(RM); dsc.position.copy(e1).multiplyScalar(-RM);
        const na = nodeGeo.attributes.position; na.setXYZ(0, -e1.x * (RM + 0.9), 0, -e1.z * (RM + 0.9)); na.setXYZ(1, e1.x * (RM + 0.9), 0, e1.z * (RM + 0.9)); na.needsUpdate = true; nodeLine.computeLineDistances();
        // 달
        const dl = (moonLon(d) - nodeLon(d)) * DEG, u = Math.atan2(Math.sin(dl), Math.cos(dl) * Math.cos(i)), mv = orbitPt(u), mw = eclToW(mv);
        moon.position.set(mw[0] * RM, mw[1] * RM, mw[2] * RM);
        const Dw = norm(moonLon(d) - sunLon(d)); moon.rotation.y = (moonLon(d) + 180) * DEG;
        const beta = betaOf(d, st.tilt), above = mv[2] >= 0;
        const dp = drop.geometry.attributes.position; dp.setXYZ(0, moon.position.x, moon.position.y, moon.position.z); dp.setXYZ(1, moon.position.x, 0, moon.position.z); dp.needsUpdate = true;
        drop.material.color.setHex(above ? 0x7dd3fc : 0xfbbf24); foot.material.color.setHex(above ? 0x7dd3fc : 0xfbbf24); foot.position.set(moon.position.x, 0.002, moon.position.z); drop.visible = foot.visible = Math.abs(moon.position.y) > 0.02;
        band.visible = st.band; bandLab.show(st.band);
        // 식 계절 부채꼴 (교점선 ± 한계각)
        const lim = limOf(st.tilt); if (Math.abs(lim - lastLim) > 0.01) {
          lastLim = lim; wedges.forEach((w) => { w.geometry.dispose(); w.geometry = new THREE.CircleGeometry(PLANE, 28, -lim * DEG, 2 * lim * DEG); });
        }
        wedges[0].rotation.z = Om; wedges[1].rotation.z = Om + Math.PI; seasonGrp.visible = st.season; seasonLab.show(st.season && lim < 89);
        seasonLab.obj = ringP(nodeLon(d) + Math.min(lim, 40) * 0.5, PLANE * 0.97);
        let xi = ((sLon - nodeLon(d)) % 180 + 180) % 180; if (xi > 90) xi -= 180; const inSeason = st.tilt < 0.05 || Math.abs(xi) < lim, nxi = Math.abs(xi);
        // 가장 가까운 삭·망
        const n = Math.round((EP.D0 + M_SYN * d) / 180), ds = (180 * n - EP.D0) / M_SYN, hit = SYZ.find((q) => q.n === n), near = Math.abs(d - ds) < 0.7 && hit;
        if (near) { const c = hit.type === '없음' ? 0x64748b : 0xf97316; halo.material.color.setHex(c); halo.position.copy(moon.position); halo.visible = hit.type !== '없음'; } else halo.visible = false;
        let l2;
        if (near) l2 = '<b>' + (hit.kind === 'new' ? '삭' : '망') + '</b> 무렵 · 달의 황위 β = <b>' + (hit.beta >= 0 ? '+' : '') + hit.beta.toFixed(1) + '°</b> → ' + (hit.type === '없음' ? '황도면에서 멀어 <b>' + (hit.kind === 'new' ? '일식' : '월식') + ' 없음</b>' : '<b>' + ecl(hit.type, hit.kind) + '</b>');
        else l2 = '삭·망 때 달의 황위가 약 ±1.5° 안이어야 식이 일어나요.';
        const html = '<b>모형 날짜 ' + d.toFixed(1) + '일</b> · 달 ' + phaseName(Dw) + ' · β = ' + (beta >= 0 ? '+' : '') + beta.toFixed(1) + '° (황도면 ' + (above ? '위' : '아래') + ')<br>' + l2 +
          '<br>' + (st.tilt < 0.05 ? '기울기가 0°이면 교점이 없어서 <b>삭·망마다 식</b>이 일어나요.' : inSeason ? '<span style="color:#ffd34d">식 계절</span>: 태양이 교점선에서 ' + nxi.toFixed(0) + '° 이내예요.' : '태양이 교점선에서 ' + nxi.toFixed(0) + '° 떨어져 있어 <b>식 계절이 아니에요</b>.');
        if (html !== lastHtml) { lastHtml = html; info(html); }
        moonLab.set('달 · ' + phaseName(Dw));
      }

      /* 조작 */
      const probe = controls.text(''); probe.style.display = 'none'; const ctlEl = probe.parentElement;
      const fixLab = (em) => { const k = ctlEl.children, inp = k[k.length - 1], l = k[k.length - 2]; l.style.minWidth = em + 'em'; l.style.display = 'inline-block'; const g = document.createElement('span'); g.style.cssText = 'display:inline-flex;align-items:center;gap:8px;flex-wrap:nowrap'; ctlEl.insertBefore(g, l); g.append(l, inp); };
      const br = () => { const e = controls.text(''); e.style.cssText = 'flex-basis:100%;height:0;padding:0;margin:-3px 0'; };
      const dayR = controls.range('📅', 0, DAYMAX, 0.1, st.day, (v) => { st.goal = null; st.play = false; playB.textContent = '▶ 재생'; st.day = v; refresh(); }, (v) => '모형 날짜 ' + v.toFixed(1) + '일');
      fixLab(10);
      const playB = controls.button('▶ 재생', () => { st.play = !st.play; st.goal = null; playB.textContent = st.play ? '⏸ 멈춤' : '▶ 재생'; });
      br();
      controls.button('◀ 이전 삭·망', () => { const p = SYZ.filter((q) => q.d < st.day - 0.2).pop(); st.play = false; playB.textContent = '▶ 재생'; if (p) st.goal = p.d; });
      controls.button('다음 삭·망 ▶', () => { const p = SYZ.find((q) => q.d > st.day + 0.2); st.play = false; playB.textContent = '▶ 재생'; if (p) st.goal = p.d; });
      const tiltR = controls.range('궤도 기울기', 0, 10, 0.1, st.tilt, (v) => { st.tilt = v; SYZ = syzygies(v); refresh(); }, (v) => v.toFixed(1) + '°');
      fixLab(9);
      br();
      const bandB = controls.button('식 범위 ✓', () => { st.band = !st.band; bandB.classList.toggle('on', st.band); bandB.textContent = '식 범위 ' + (st.band ? '✓' : '✕'); refresh(); }); bandB.classList.add('on');
      const seaB = controls.button('식 계절 ✓', () => { st.season = !st.season; seaB.classList.toggle('on', st.season); seaB.textContent = '식 계절 ' + (st.season ? '✓' : '✕'); refresh(); }); seaB.classList.add('on');
      controls.segment('시점', [{ value: 'top', label: '위에서' }, { value: 'obl', label: '비스듬히' }, { value: 'side', label: '옆에서' }], 'obl', (v) => { Object.assign(orbit, VIEWS[v]); if (v === 'side') { const Om = nodeLon(st.day) * DEG, sg = Math.cos(Om) * Math.cos(sunLon(st.day) * DEG) + Math.sin(Om) * Math.sin(sunLon(st.day) * DEG) >= 0 ? -1 : 1; orbit.theta = Math.atan2(sg * Math.cos(Om), -sg * Math.sin(Om)) + 1.15; orbit.phi = Math.PI / 2 - 0.1; orbit.dist = wide ? 12 : 21; } });
      refresh();

      return {
        update(dt) {
          if (st.play) { st.day += dt * 22; if (st.day >= DAYMAX) { st.day = DAYMAX; st.play = false; playB.textContent = '▶ 재생'; } dayR.set(st.day); refresh(); }
          else if (st.goal != null) { const dd = st.goal - st.day; st.day += Math.sign(dd) * Math.min(Math.abs(dd), Math.max(0.15, Math.abs(dd) * 6 * dt)); if (Math.abs(st.goal - st.day) < 0.02) { st.day = st.goal; st.goal = null; } dayR.set(st.day); refresh(); }
        },
        sync() { try { const s = window.__sim && window.__sim.S; if (s) { if (typeof s.day === 'number') { st.day = Math.min(DAYMAX, Math.max(0, s.day)); dayR.set(st.day); } if (typeof s.tilt === 'number') { st.tilt = s.tilt; SYZ = syzygies(st.tilt); tiltR.set(st.tilt); } st.goal = null; refresh(); } } catch (e) {} },
      };
    },
  });
})();
