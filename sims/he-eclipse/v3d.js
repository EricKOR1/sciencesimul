/* he-eclipse · 3D 달 궤도의 기울기와 교점, 식 계절
   지구를 가운데 두고(지구 중심 모형) 황도면, 5.1° 기울어진 달 궤도, 교점(승교점·강교점), 태양의 방향을 입체로 봐요.
   날짜를 흘려 보내면 교점선은 거의 제자리인데 태양이 황도를 따라 1년에 한 바퀴 돌아, 태양이 교점선 근처에 올 때(식 계절)
   삭·망이 일어나면 달이 황도면 가까이(황위 약 ±1.5° 이내)에 있어서 일식·월식이 일어나요.
   2D의 모형 날짜(S.day)·궤도 기울기(S.tilt)와 서로 같이 움직여요(3D에서 바꾸면 2D 슬라이더도 바뀌고, 2D에서 바꾸면 3D도 따라가요).
   2단계(달 그림자 원뿔) · 3단계(태양 쪽에서 본 지구 위의 달 그림자) · 4단계(지구 그림자 속을 지나는 달)도 2D의 값을 그대로 따라가요.
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
  const LU_ = { r: 384400, dS: KM.dS, vmin: 3670 / 60 }; LU_.rU = KM.Re - LU_.r * (KM.Rs - KM.Re) / LU_.dS; LU_.rP = KM.Re + LU_.r * (KM.Rs + KM.Re) / LU_.dS;
  const VIEWS = wide ? { top: { dist: 17, theta: 0, phi: 0.3 }, obl: { dist: 16, theta: 0.5, phi: 0.95 }, side: { dist: 15, theta: 0.4, phi: 1.42 } }
    : { top: { dist: 24, theta: 0, phi: 0.3 }, obl: { dist: 24, theta: 0.5, phi: 0.95 }, side: { dist: 22, theta: 0.4, phi: 1.42 } };

  window.SciSim3D.attach({
    host: '.stage-canvas',
    button: wide ? undefined : null,
    levels: [0],            // 1단계(궤도 모형)만 3D예요. 일식 종류(눈금 그래프) · 그림자 궤적(정보 판 읽기) · 월식(시각 표 읽기)은 2D 화면에서 해요
    title: '3D 달 궤도·교점·식 계절',
    hint: ' ',
    camera: Object.assign({ fov: 45, target: [0, 0, 0], min: 4, max: 40 }, VIEWS.obl),
    autoRotate: 0.08,
    build(ctx) {
      const { THREE, scene, root, info, controls, orbit } = ctx;
      const oldLabs = []; let capLab = true; const label = (...a) => { const l = ctx.label(...a); if (capLab) oldLabs.push(l); return l; };
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
      const w2D = (q, v) => { const e = document.querySelector(q); if (e && +e.value !== v) { e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); } };
      const dayR = controls.range('📅', 0, DAYMAX, 0.1, st.day, (v) => { st.goal = null; if (pl) pl.pause(); st.day = v; refresh(); w2D('#sDay', v); }, (v) => '모형 날짜 ' + v.toFixed(1) + '일');
      fixLab(10);
      let pl = null, ready = false;
      pl = controls.player({
        duration: 20, loop: true, autoplay: false, label: '날짜 흐르기',
        onFrame(p) { if (!ready) return; st.goal = null; st.day = DAYMAX * p; dayR.set(st.day); refresh(); w2D('#sDay', Math.round(st.day * 10) / 10); },
      });
      pl.pause(); ready = true;
      br();
      controls.button('◀ 이전 삭·망', () => { if (pl) pl.pause(); const l = ctx.lesson(); if (l && l.stepSyz) { l.stepSyz(-1); return; } const p = SYZ.filter((q) => q.d < st.day - 0.2).pop(); if (p) st.goal = p.d; });
      controls.button('다음 삭·망 ▶', () => { if (pl) pl.pause(); const l = ctx.lesson(); if (l && l.stepSyz) { l.stepSyz(1); return; } const p = SYZ.find((q) => q.d > st.day + 0.2); if (p) st.goal = p.d; });
      const tiltR = controls.range('궤도 기울기', 0, 10, 0.1, st.tilt, (v) => { st.tilt = v; SYZ = syzygies(v); refresh(); w2D('#sTilt', v); }, (v) => v.toFixed(1) + '°');
      fixLab(9);
      br();
      const bandB = controls.button('식 범위 ✓', () => { st.band = !st.band; bandB.classList.toggle('on', st.band); bandB.textContent = '식 범위 ' + (st.band ? '✓' : '✕'); refresh(); }); bandB.classList.add('on');
      const seaB = controls.button('식 계절 ✓', () => { st.season = !st.season; seaB.classList.toggle('on', st.season); seaB.textContent = '식 계절 ' + (st.season ? '✓' : '✕'); refresh(); }); seaB.classList.add('on');
      controls.segment('시점', [{ value: 'top', label: '위에서' }, { value: 'obl', label: '비스듬히' }, { value: 'side', label: '옆에서' }], 'obl', (v) => { Object.assign(orbit, VIEWS[v]); if (v === 'side') { const Om = nodeLon(st.day) * DEG, sg = Math.cos(Om) * Math.cos(sunLon(st.day) * DEG) + Math.sin(Om) * Math.sin(sunLon(st.day) * DEG) >= 0 ? -1 : 1; orbit.theta = Math.atan2(sg * Math.cos(Om), -sg * Math.sin(Om)) + 1.15; orbit.phi = Math.PI / 2 - 0.1; orbit.dist = wide ? 12 : 21; } });
      refresh();


      /* ================= 2단계 그림자 원뿔(cone) · 3단계 지구 위의 그림자(globe) · 4단계 월식(lunar) ================= */
      capLab = false;
      const gOrb = new THREE.Group(); while (root.children.length) gOrb.add(root.children[0]); root.add(gOrb);
      const gCn = new THREE.Group(), gGl = new THREE.Group(), gLn = new THREE.Group(); root.add(gCn, gGl, gLn); gCn.visible = gGl.visible = gLn.visible = false;
      const probe2 = controls.text(''); probe2.style.display = 'none'; const ctlEl2 = probe2.parentElement;
      const orbEls = Array.prototype.filter.call(ctlEl2.children, (e) => e !== probe2);
      const grab = (fn) => { const n0 = ctlEl2.children.length; const r = fn(); return { r, els: Array.prototype.slice.call(ctlEl2.children, n0) }; };
      const shw = (g2, on) => g2.els.forEach((e) => { e.style.display = on ? '' : 'none'; });
      const SM = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.6 }, o || {}));
      const BM = (c, o) => new THREE.MeshBasicMaterial(Object.assign({ color: c, transparent: true, depthWrite: false, side: THREE.DoubleSide }, o || {}));
      const setIn2 = (id, v) => { const e = document.getElementById(id); if (e) { e.value = v; e.dispatchEvent(new Event('input')); } };
      const clickB = (id) => { const e = document.getElementById(id); if (e) e.click(); };
      /* --- cone: 달 그림자(본영 · 반영 · 반본영)와 지구 (2D처럼 세로로 늘려 그려요) --- */
      const CKX = 1 / 40000, CKY = 0.0003, X0C = -9.4;                                  // 가로 1칸 = 4만 km, 세로는 지구가 보이도록 늘려요
      const cMoon = new THREE.Mesh(new THREE.SphereGeometry(KM.Rm * CKY, 28, 20), SM(0xd8d2bc)); gCn.add(cMoon); cMoon.position.set(X0C, 0, 0);
      const cPen = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 48, 1, true), BM(0x475569, { opacity: 0.3 })); gCn.add(cPen);
      const cUmb = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 48, 1, true), BM(0x0f172a, { opacity: 0.72 })); gCn.add(cUmb);
      const cAnt = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 48, 1, true), BM(0x64748b, { opacity: 0.2 })); gCn.add(cAnt);
      const cEarth = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 28), SM(0x2f7de1)); gCn.add(cEarth);
      const cHit = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), SM(0xfde047, { emissive: 0xfde047, emissiveIntensity: 0.7 })); gCn.add(cHit);
      const cTip = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 10), SM(0xffffff, { emissive: 0xffffff, emissiveIntensity: 0.6 })); gCn.add(cTip);
      const cRays = []; for (let i = -4; i <= 4; i++) { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 22, 6), new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.35 })); m.rotation.z = Math.PI / 2; m.position.set(0, i * 0.85, -0.2); gCn.add(m); cRays.push(m); }
      const lcM = label('달', [X0C, -0.9, 0], { color: 'rgba(51,65,85,.9)' }), lcE = label('지구', [0, 0, 0], { color: 'rgba(30,58,138,.92)' }), lcT = label('본영의 끝', [0, 0.55, 0], { color: 'rgba(15,23,42,.9)' }), lcP = label('반영: 일부만 가려요', [0, 0, 0], { color: 'rgba(71,85,105,.92)' }), lcG = label('', [0, 0, 0], { color: 'rgba(180,83,9,.95)' }), lcSun = label('햇빛 →', [X0C - 0.4, 3.2, 0], { color: 'rgba(180,120,0,.9)' });
      [lcM, lcE, lcT, lcP, lcG, lcSun].forEach((l) => l.show(false));
      const cDist = grab(() => controls.range('달까지 거리', 363000, 406000, 1000, 384400, (v) => setIn2('sDist', v), (v) => (v / 10000).toFixed(1) + '만 km'));
      const cEy = grab(() => controls.range('지구 위치(위아래)', -10400, 10400, 100, 0, (v) => { const w = window.__sim; if (w) { w.S.sweep = false; w.S.eY = v; w.updateCtl(); } }, (v) => (v / 1000).toFixed(1) + '천 km'));
      const cSweep = grab(() => controls.button('▶ 그림자 지나가기', () => clickB('bSweep')));
      const cCen = grab(() => controls.button('⊙ 중심에 맞추기', () => clickB('bCenter')));
      function updCone(w) {
        const S = w.S, r = S.coneRv, dS = KM.dS, dSM = dS - r, Lu = luOf(r, dS), kp = (KM.Rs + KM.Rm) / dSM, eY = S.eYv, xE = r * CKX + X0C, XEND = 9.6;
        const lenAll = XEND - X0C, penR = (x) => CKY * (KM.Rm + ((x - X0C) / CKX) * kp);
        cPen.scale.set(penR(XEND), lenAll, penR(XEND)); cPen.geometry.dispose(); cPen.geometry = new THREE.CylinderGeometry(penR(XEND), CKY * KM.Rm, lenAll, 48, 1, true); cPen.scale.set(1, 1, 1); cPen.rotation.z = -Math.PI / 2; cPen.position.set((X0C + XEND) / 2, 0, 0);
        const lu = Lu * CKX; cUmb.geometry.dispose(); cUmb.geometry = new THREE.ConeGeometry(CKY * KM.Rm, lu, 48, 1, true); cUmb.rotation.z = -Math.PI / 2; cUmb.position.set(X0C + lu / 2, 0, 0);
        const la = XEND - (X0C + lu), ra = CKY * KM.Rm * ((XEND - X0C) / CKX / Lu - 1); cAnt.geometry.dispose(); cAnt.geometry = new THREE.ConeGeometry(Math.max(0.01, ra), la, 48, 1, true); cAnt.rotation.z = Math.PI / 2; cAnt.position.set(X0C + lu + la / 2, 0, 0);
        cEarth.scale.set(KM.Re * CKX, KM.Re * CKY, KM.Re * CKY); cEarth.position.set(xE, eY * CKY, 0);
        const lt = w.localType(r, eY), inEarth = Math.abs(eY) < KM.Re;
        cHit.visible = inEarth; if (inEarth) { const hx = xE - KM.Re * CKX * Math.sqrt(1 - (eY / KM.Re) ** 2); cHit.position.set(hx, 0, 0); cHit.material.color.setHex(lt.type === '개기' ? 0x0f172a : 0xfde047); cHit.material.emissive.setHex(lt.type === '개기' ? 0xf97316 : 0xfde047); lcG.show(true); lcG.obj = [(hx + X0C + lu) / 2, -1.6, 0]; lcG.set(lt.gap > 0 ? '본영이 ' + (Math.round(lt.gap / 100) * 100).toLocaleString() + ' km 모자라요' : '본영이 지표에 닿아요'); } else lcG.show(false);
        cTip.position.set(X0C + lu, 0, 0);
        lcM.show(true); lcE.show(true); lcE.obj = [xE, eY * CKY + KM.Re * CKY + 0.5, 0]; lcT.show(true); lcT.obj = [X0C + lu, 0.55, 0]; lcP.show(true); lcP.obj = [X0C + 0.34 * (xE - X0C), penR(X0C + 0.34 * (xE - X0C)) + 0.5, 0]; lcSun.show(true);
        const sweepOn = S.sweep; cSweep.els.forEach((e) => { e.textContent = sweepOn ? '⏸ 멈춤' : '▶ 그림자 지나가기'; });
        cDist.r.set(S.coneR); cEy.r.set(Math.max(-10400, Math.min(10400, S.eY)));
        const typ = lt.type;
        return '<b>달 그림자 원뿔 · 달까지 ' + (r / 10000).toFixed(1) + '만 km</b><br>지구에서 본 일식: <b>' + (typ === '없음' ? '일식이 없어요' : typ + ' 일식') + '</b><br>' + (r < Lu ? '달이 가까워 본영의 끝이 지구를 넘어가요 → 개기 일식이 가능해요.' : '달이 멀어 본영이 지구에 닿지 못해요 → 금환 일식(반본영)이 보여요.') + '<br>본영 길이 ' + (Math.round(Lu / 100) * 100).toLocaleString() + ' km · 달까지 ' + (Math.round(r / 100) * 100).toLocaleString() + ' km<br><span style="color:#9fb0d4">세로로 늘려 그렸어요 (축척 아님).</span>';
      }
      /* --- globe: 태양 쪽에서 본 지구와 달 그림자 --- */
      const GR = 3.4, GK = GR / KM.Re;
      const ct = document.createElement('canvas'); ct.width = 1024; ct.height = 512; { const c2 = ct.getContext('2d'); c2.fillStyle = '#2f7de1'; c2.fillRect(0, 0, 1024, 512); c2.fillStyle = 'rgba(90,170,100,1)'; c2.strokeStyle = 'rgba(40,110,60,1)'; c2.lineWidth = 1; }
      let earthTexBuilt = false;
      const earthG = new THREE.Mesh(new THREE.SphereGeometry(GR, 64, 48), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(ct) })); gGl.add(earthG);
      const penG = new THREE.Mesh(new THREE.BufferGeometry(), BM(0x040a1c, { opacity: 0.4 })); penG.frustumCulled = false; gGl.add(penG);
      const umbG = new THREE.Mesh(new THREE.BufferGeometry(), BM(0x050810, { opacity: 0.95 })); umbG.frustumCulled = false; gGl.add(umbG);
      const siteM = ['A', 'B', 'C', 'P'].map((k) => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.1, 14, 10), SM(0xfde047, { emissive: 0xfde047, emissiveIntensity: 0.8 })); gGl.add(m); const l = label(k === 'P' ? '내 지점' : k, [0, 0, 0], { color: 'rgba(15,23,42,.9)' }); l.show(false); return { k, m, l }; });
      const lGl = label('태양 쪽에서 본 지구', [0, GR + 0.5, 0], { color: 'rgba(30,41,59,.9)' }); lGl.show(false);
      const surfPt = (x, y) => { const rr2 = x * x + y * y, z = rr2 < KM.Re * KM.Re ? Math.sqrt(KM.Re * KM.Re - rr2) : 0, n = Math.hypot(x, y, z) || 1; return [x / n * GR * 1.006, y / n * GR * 1.006, z / n * GR * 1.006]; };
      function fanGeo(geo, cen, ring) { const pos = new Float32Array((ring.length + 1) * 3), idx = []; pos.set(cen, 0); ring.forEach((q, i) => pos.set(q, (i + 1) * 3)); for (let i = 0; i < ring.length; i++) idx.push(0, 1 + i, 1 + (i + 1) % ring.length); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeBoundingSphere(); }
      const gTime = grab(() => controls.range('시각', -9000, 9000, 60, -9000, (v) => setIn2('sT', v), (v) => { const w = window.__sim; return w ? w.clockStr(v) : v; }));
      const gPlay = grab(() => controls.button('▶ 재생', () => clickB('bPlay3')));
      const gSite = grab(() => controls.segment('지점', [{ value: 'A', label: 'A' }, { value: 'B', label: 'B' }, { value: 'C', label: 'C' }], 'A', (v) => { const w = window.__sim; if (w && w.selectSite) w.selectSite(v); }));
      function buildEarthTex(w) {
        const c2 = ct.getContext('2d'), Wc = 1024, Hc = 512; c2.fillStyle = '#2f7de1'; c2.fillRect(0, 0, Wc, Hc); c2.fillStyle = 'rgba(90,170,100,1)';
        w.CONT.forEach((poly) => { c2.beginPath(); poly.forEach((ll2, i) => { const u = (((0.25 + ll2[1] / 360) % 1) + 1) % 1, x = u * Wc, y = (90 - ll2[0]) / 180 * Hc; i ? c2.lineTo(x, y) : c2.moveTo(x, y); }); c2.closePath(); c2.fill(); });
        c2.strokeStyle = 'rgba(255,255,255,.3)'; c2.lineWidth = 1; for (let lat = -60; lat <= 60; lat += 30) { const y = (90 - lat) / 180 * Hc; c2.beginPath(); c2.moveTo(0, y); c2.lineTo(Wc, y); c2.stroke(); } for (let lon = -180; lon < 180; lon += 30) { const x = ((0.25 + lon / 360) % 1 + 1) % 1 * Wc; c2.beginPath(); c2.moveTo(x, 0); c2.lineTo(x, Hc); c2.stroke(); }
        earthG.material.map.needsUpdate = true; earthTexBuilt = true;
      }
      function updGlobe(w) {
        if (!earthTexBuilt) buildEarthTex(w);
        const S = w.S, tt = S.t, m = w.axisAt(tt), Gg = w.G; earthG.rotation.y = Gg.w * tt;
        const ring = []; for (let a = 0; a < 48; a++) { const ang = a / 48 * Math.PI * 2; let s = KM.Rm + Gg.r * Gg.kp; for (let it = 0; it < 4; it++) { const px = m.x + s * Math.cos(ang), py = m.y + s * Math.sin(ang), rr2 = px * px + py * py, z = rr2 < KM.Re * KM.Re ? Math.sqrt(KM.Re * KM.Re - rr2) : 0; s = KM.Rm + (Gg.r - z) * Gg.kp; } ring.push(surfPt(m.x + s * Math.cos(ang), m.y + s * Math.sin(ang))); }
        fanGeo(penG.geometry, surfPt(m.x, m.y), ring);
        const inDisc = m.x * m.x + m.y * m.y < KM.Re * KM.Re; umbG.visible = inDisc; let ru = 0;
        if (inDisc) { const zz = Math.sqrt(KM.Re * KM.Re - m.x * m.x - m.y * m.y), dh = Gg.r - zz; ru = KM.Rm * (1 - dh / Gg.Lu); const rad = Math.max(Math.abs(ru), 140), r2 = []; for (let a = 0; a < 28; a++) { const ang = a / 28 * Math.PI * 2; r2.push(surfPt(m.x + rad * Math.cos(ang), m.y + rad * Math.sin(ang))); } fanGeo(umbG.geometry, surfPt(m.x, m.y), r2); umbG.material.color.setHex(ru > 0 ? 0x050810 : 0xfacc15); umbG.material.opacity = ru > 0 ? 0.95 : 0.85; }
        const cs = w.curSite();
        siteM.forEach((q) => { const site = q.k === 'P' ? S.custom : w.SITES[q.k]; if (!site) { q.m.visible = false; q.l.show(false); return; } const p = w.groundPt(site.lat, site.lon, tt), vis = p.z > 20; q.m.visible = vis; q.l.show(vis); if (vis) { q.m.position.set(p.x * GK * 1.01, p.y * GK * 1.01, p.z * GK * 1.01); q.l.obj = [p.x * GK * 1.1, p.y * GK * 1.1 + 0.2, p.z * GK * 1.1]; q.m.scale.setScalar(site === cs ? 1.8 : 1); q.m.material.color.setHex(site === cs ? 0xf97316 : 0xfde047); } });
        lGl.show(true); gTime.r.set(S.t); gPlay.els.forEach((e) => { e.textContent = S.play3 ? '⏸ 멈춤' : '▶ 재생'; }); gSite.r.set(S.site);
        const st = cs ? w.siteState(cs, tt) : null;
        return '<b>태양 쪽에서 본 지구와 달 그림자</b> · ' + w.clockStr(tt) + '<br>검은 점 = 본영, 어두운 영역 = 반영. 그림자가 지나가는 곳에서 일식이 보여요.' + (st ? '<br>지점 ' + S.site + ': <b>' + (st.night ? '밤이라 볼 수 없어요' : st.type === '없음' ? '일식이 보이지 않아요' : st.type + ' 일식 (가려진 정도 ' + Math.round(st.obsc * 100) + ' %)') + '</b>' : '') + '<br><span style="color:#9fb0d4">지속 시간 계산 · 기록은 ▦ 2D에서 해요.</span>';
      }
      /* --- lunar: 지구 그림자 속을 지나는 달 --- */
      const LKU = 0.00045;
      const lPenD = new THREE.Mesh(new THREE.CircleGeometry(LU_.rP * LKU, 64), BM(0x8794b2, { opacity: 0.3 })); gLn.add(lPenD);
      const lUmbD = new THREE.Mesh(new THREE.CircleGeometry(LU_.rU * LKU, 64), BM(0x020410, { opacity: 0.85 })); lUmbD.position.z = 0.01; gLn.add(lUmbD);
      const lRing1 = new THREE.Mesh(new THREE.RingGeometry(LU_.rP * LKU - 0.02, LU_.rP * LKU, 64), BM(0xcbd5e1, { opacity: 0.8 })), lRing2 = new THREE.Mesh(new THREE.RingGeometry(LU_.rU * LKU - 0.02, LU_.rU * LKU, 64), BM(0xf87171, { opacity: 0.9 })); lRing1.position.z = 0.02; lRing2.position.z = 0.02; gLn.add(lRing1, lRing2);
      const lMoon = new THREE.Mesh(new THREE.SphereGeometry(KM.Rm * LKU, 32, 24), SM(0xd9d3bd, { roughness: 0.9, emissive: 0x000000 })); lMoon.position.z = 0.4; gLn.add(lMoon);
      const lLine = new THREE.Mesh(new THREE.BoxGeometry(1, 0.025, 0.02), BM(0xfacc15, { opacity: 0.6 })); gLn.add(lLine);
      const lUm = label('본영', [0, 0, 0.1], { color: 'rgba(127,29,29,.9)' }), lPe = label('반영', [LU_.rP * LKU * 0.74, LU_.rP * LKU * 0.74, 0.1], { color: 'rgba(71,85,105,.9)' }), lMn = label('달', [0, 0, 0], { color: 'rgba(30,41,59,.9)' }), lSt = label('', [0, -LU_.rP * LKU - 0.7, 0], { color: 'rgba(30,41,59,.92)' }), lEW = label('동 ← 달의 공전 방향 ← 서', [0, LU_.rP * LKU + 0.6, 0], { color: 'rgba(30,58,138,.9)' });
      [lUm, lPe, lMn, lSt, lEW].forEach((l) => l.show(false));
      const lPath = grab(() => controls.segment('달이 지나는 길', [{ value: 'up', label: '① 위' }, { value: 'mid', label: '② 가운데' }, { value: 'low', label: '③ 아래' }], 'mid', (v) => { const b = document.querySelector('#pathSeg .opt[data-k="' + v + '"]'); if (b) b.click(); }));
      const lTime = grab(() => controls.range('시각', -180, 180, 1, -180, (v) => setIn2('sL', v), (v) => (v < 0 ? '−' : '+') + Math.abs(Math.round(v)) + '분'));
      const lPlay = grab(() => controls.button('▶ 재생', () => clickB('bPlay4')));
      function updLunar(w) {
        const S = w.S, pa = w.PATHS[S.path], cn = w.lunarContacts(pa.off), tm = S.lp, mx = -tm * LU_.vmin * LKU, my = pa.off * LKU;
        lMoon.position.set(mx, my, 0.4); lLine.scale.set(2 * w.LT_MAX * LU_.vmin * LKU, 1, 1); lLine.position.set(0, my, 0.05);
        const d = Math.hypot(mx / LKU, my / LKU), inU = Math.max(0, Math.min(1, (LU_.rU + KM.Rm - d) / (2 * KM.Rm))), inP = Math.max(0, Math.min(1, (LU_.rP + KM.Rm - d) / (2 * KM.Rm)));
        lMoon.material.color.set(new THREE.Color(0xd9d3bd).lerp(new THREE.Color(0xb2432a), Math.min(1, inU * 1.1))).lerp(new THREE.Color(0x8a8576), 0.35 * inP * (1 - inU));
        lUm.show(true); lPe.show(true); lMn.show(true); lMn.obj = [mx, my + KM.Rm * LKU + 0.35, 0.4]; lEW.show(true); lSt.show(true);
        const st = w.lunarStateAt ? w.lunarStateAt(cn, tm) : null;
        lSt.set(st ? st.text : '');
        lPath.r.set(S.path); lTime.r.set(Math.max(-180, Math.min(180, Math.round(tm)))); lPlay.els.forEach((e) => { e.textContent = S.play4 ? '⏸ 멈춤' : '▶ 재생'; });
        return '<b>지구 그림자 속을 지나는 달 · ' + pa.name + '</b><br>이 길에서는 <b>' + (cn.type === '반영' ? '반영식' : cn.type === '없음' ? '월식 없음' : cn.type + ' 월식') + '</b>이 일어나요.<br>' + (st ? st.text + '<br>' : '') + '달이 본영에 들어가면 붉게 보여요. 접촉 시각 표 · 식분 계산은 ▦ 2D에서 해요.';
      }
      let scnE = '';
      const lastE = { v: '' };
      function applyScn(v) {
        if (v === scnE) return; const prevV = scnE; scnE = v; lastE.v = '';
        const orb = v === 'orbit';
        gOrb.visible = orb; gCn.visible = v === 'cone'; gGl.visible = v === 'globe'; gLn.visible = v === 'lunar';
        orbEls.forEach((e) => { e.style.display = orb ? '' : 'none'; });
        if (orb) oldLabs.forEach((l) => l.show(l.keep !== false)); else oldLabs.forEach((l) => { if (prevV === 'orbit' || prevV === '') l.keep = l.visible; l.show(false); });
        [cDist, cEy, cSweep, cCen].forEach((c2) => shw(c2, v === 'cone')); [gTime, gPlay, gSite].forEach((c2) => shw(c2, v === 'globe')); [lPath, lTime, lPlay].forEach((c2) => shw(c2, v === 'lunar'));
        [lcM, lcE, lcT, lcP, lcG, lcSun].forEach((l) => l.show(false)); [lGl].forEach((l) => l.show(false)); siteM.forEach((q) => q.l.show(false)); [lUm, lPe, lMn, lSt, lEW].forEach((l) => l.show(false));
        if (!orb) { lcM.show(v === 'cone'); lUm.show(v === 'lunar'); lPe.show(v === 'lunar'); }
        const o = ctx.orbit;
        if (v === 'cone') { o.theta = 0; o.phi = Math.PI / 2; o.tx = 0; o.ty = 0; o.tz = 0; o.dist = wide ? 21 : 30; }
        else if (v === 'globe') { o.theta = 0; o.phi = Math.PI / 2; o.tx = 0; o.ty = 0; o.tz = 0; o.dist = wide ? 12 : 15; }
        else if (v === 'lunar') { o.theta = 0; o.phi = Math.PI / 2; o.tx = 0; o.ty = 0; o.tz = 0; o.dist = wide ? 13 : 17; }
        else { Object.assign(o, VIEWS[st.view || 'obl']); try { refresh(); } catch (e) { /* 궤도 모형 안내 글을 다시 써요 */ } }
      }
      return {
        update(dt) {
          const l = ctx.lesson(), S = l && l.S, vw = S && S.view ? S.view : 'orbit';
          applyScn(vw);
          if (vw !== 'orbit') {
            const h = vw === 'cone' ? updCone(l) : vw === 'globe' ? updGlobe(l) : updLunar(l);
            if (h !== lastE.v) { lastE.v = h; info(h); }
            ctx.orbit.theta = 0; ctx.orbit.phi = Math.PI / 2; return;
          }
          // (궤도 모형) 2D 상태 읽기
          if (S && !pl.playing) {
            const dN = Math.min(DAYMAX, Math.max(0, S.day)), tN = typeof S.tiltV === 'number' ? S.tiltV : S.tilt;
            let ch = false;
            if (typeof tN === 'number' && Math.abs(tN - st.tilt) > 0.005) { st.tilt = tN; SYZ = syzygies(st.tilt); tiltR.set(st.tilt); ch = true; }
            if (typeof dN === 'number' && Math.abs(dN - st.day) > 0.02) { st.day = dN; dayR.set(st.day); ch = true; }
            if (ch) { st.goal = null; refresh(); ready = false; pl.set(st.day / DAYMAX); ready = true; }
          }
          if (st.goal != null) { const dd = st.goal - st.day; st.day += Math.sign(dd) * Math.min(Math.abs(dd), Math.max(0.15, Math.abs(dd) * 6 * dt)); if (Math.abs(st.goal - st.day) < 0.02) { st.day = st.goal; st.goal = null; } dayR.set(st.day); refresh(); }
        },
        sync() { try { const s = window.__sim && window.__sim.S; if (s) { if (typeof s.day === 'number') { st.day = Math.min(DAYMAX, Math.max(0, s.day)); dayR.set(st.day); } if (typeof s.tilt === 'number') { st.tilt = s.tilt; SYZ = syzygies(st.tilt); tiltR.set(st.tilt); } st.goal = null; refresh(); } } catch (e) {} },
      };
    },
  });
})();
