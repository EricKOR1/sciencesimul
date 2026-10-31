/* m1-eclipse · 3D 달 궤도면과 그림자
   달의 공전 궤도면은 지구의 공전 궤도면에 대해 약 5° 기울어져 있어요. 옆에서 보면 대부분의 삭·망 때
   달(또는 달 그림자)이 지구 공전 궤도면의 위·아래로 비껴가는 것을 볼 수 있어요.
   (천체의 크기·거리, 기울기는 보기 쉽게 과장했어요. 실제 기울기는 약 5°예요.)
   θ = 0° 가 태양 쪽(삭), 180° 가 망이에요. 북극 위에서 볼 때 달은 시계 반대 방향으로 돌아요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const DEG = Math.PI / 180, RM = 4, RE = 0.55, RMOON = 0.2, SD = 9, RS = 0.65, TILT = 22, PLANE = 6.2;
  const norm = (a) => ((a % 360) + 360) % 360;
  const wide = (window.innerWidth || 1000) >= 600;
  const phaseName = (th) => { th = norm(th); return th < 8 || th >= 352 ? '삭' : Math.abs(th - 180) <= 8 ? '망' : Math.abs(th - 90) <= 8 ? '상현' : Math.abs(th - 270) <= 8 ? '하현' : th < 180 ? '차오르는 달' : '기우는 달'; };
  const VIEWS = wide ? { top: { dist: 20, theta: 0, phi: 0.3 }, obl: { dist: 19, theta: 0.3, phi: 0.95 }, side: { dist: 18, theta: 0, phi: Math.PI / 2 } }
    : { top: { dist: 26, theta: -Math.PI / 2, phi: 0.3 }, obl: { dist: 27, theta: -0.5, phi: 0.95 }, side: { dist: 28, theta: 0, phi: Math.PI / 2, tx: 1.0 } };

  window.SciSim3D.attach({
    host: '.stage-card',
    title: '3D 달 궤도와 그림자',
    hint: ' ',
    camera: Object.assign({ fov: 45, target: [2.2, 0, 0], min: 4, max: 45 }, VIEWS.obl),
    autoRotate: 0,
    build(ctx) {
      const { THREE, scene, root, label, info, controls, orbit } = ctx;
      const st = { th: 150, target: null, play: false, tilt: true, tiltA: 1, nu: 90, nuA: 90, view: 'obl' };
      try { const s = window.__sim && window.__sim.S; if (s) { if (typeof s.theta === 'number') st.th = norm(s.theta); } } catch (e) {}

      scene.traverse((o) => { if (o.isDirectionalLight) { o.position.set(60, 0, 0); o.intensity = 2.5; } if (o.isHemisphereLight) o.intensity = 0.32; });
      { let seed = 11; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }; const pos = [];
        for (let i = 0; i < 300; i++) { const u = rnd() * 2 - 1, a = rnd() * Math.PI * 2, r = Math.sqrt(1 - u * u); pos.push(Math.cos(a) * r * 60, u * 60, Math.sin(a) * r * 60); }
        const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        root.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0x9fb4e8, size: 1.5, sizeAttenuation: false, transparent: true, opacity: 0.5 }))); }

      /* 태양 */
      const glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,230,140,1)'); gr.addColorStop(0.25, 'rgba(255,190,60,.55)'); gr.addColorStop(1, 'rgba(255,160,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();
      const sun = new THREE.Mesh(new THREE.SphereGeometry(RS, 32, 20), new THREE.MeshBasicMaterial({ color: 0xffd23f })); sun.position.set(SD, 0, 0); root.add(sun);
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); glow.scale.set(5, 5, 1); glow.position.copy(sun.position); root.add(glow);
      label('☀ 태양', [SD, 1.2, 0], { size: 13, color: 'rgba(120,70,0,.85)' });

      /* 지구 · 달 */
      const earthTex = (() => { const c = document.createElement('canvas'); c.width = 256; c.height = 128; const g = c.getContext('2d'); g.fillStyle = '#2f7fd8'; g.fillRect(0, 0, 256, 128); g.fillStyle = '#4caf6a';
        let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
        for (let i = 0; i < 16; i++) { const x = rnd() * 256, y = 20 + rnd() * 88; for (let j = 0; j < 7; j++) { g.beginPath(); g.ellipse(x + (rnd() - 0.5) * 30, y + (rnd() - 0.5) * 18, 6 + rnd() * 16, 4 + rnd() * 9, rnd() * 3, 0, 7); g.fill(); } }
        g.fillStyle = '#f2f6fa'; g.fillRect(0, 0, 256, 7); g.fillRect(0, 121, 256, 7); return new THREE.CanvasTexture(c); })();
      const earth = new THREE.Mesh(new THREE.SphereGeometry(RE, 32, 20), new THREE.MeshStandardMaterial({ map: earthTex, roughness: 0.75 })); earth.rotation.y = 2.2; root.add(earth);
      label('지구', [0, 0.95, 0], { size: 13 });
      const moonTex = (() => { const c = document.createElement('canvas'); c.width = 256; c.height = 128; const g = c.getContext('2d'); g.fillStyle = '#cfcbc0'; g.fillRect(0, 0, 256, 128); g.fillStyle = 'rgba(95,95,105,.55)';
        [[118, 50, 22, 14], [140, 66, 18, 12], [105, 78, 13, 9], [150, 44, 12, 8], [128, 92, 10, 6]].forEach((b) => { g.beginPath(); g.ellipse(b[0], b[1], b[2], b[3], 0.3, 0, 7); g.fill(); }); return new THREE.CanvasTexture(c); })();
      const moon = new THREE.Mesh(new THREE.SphereGeometry(RMOON, 24, 16), new THREE.MeshStandardMaterial({ map: moonTex, roughness: 0.95 })); root.add(moon);

      /* 두 궤도면 */
      const ecl = new THREE.Mesh(new THREE.CircleGeometry(PLANE, 72), new THREE.MeshBasicMaterial({ color: 0x4aa3ff, transparent: true, opacity: 0.15, side: THREE.DoubleSide, depthWrite: false })); ecl.rotation.x = -Math.PI / 2; root.add(ecl);
      const eclRing = (() => { const pts = []; for (let i = 0; i <= 96; i++) { const a = i / 96 * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a) * PLANE, 0, Math.sin(a) * PLANE)); } return new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x7dc0ff, transparent: true, opacity: 0.9 })); })(); root.add(eclRing);
      const eclLab = label('지구 공전 궤도면', [0, 0, 0], { size: 12, color: 'rgba(20,60,120,.88)' });
      const mpl = new THREE.Mesh(new THREE.CircleGeometry(RM + 0.9, 72), new THREE.MeshBasicMaterial({ color: 0xf5a3c7, transparent: true, opacity: 0.13, side: THREE.DoubleSide, depthWrite: false })); mpl.matrixAutoUpdate = false; root.add(mpl);
      const mLab = label('달 공전 궤도면', [0, 0, 0], { size: 12, color: 'rgba(120,30,80,.88)' });
      const OP = 120, opPos = new Float32Array((OP + 1) * 3), opCol = new Float32Array((OP + 1) * 3), opGeo = new THREE.BufferGeometry();
      opGeo.setAttribute('position', new THREE.BufferAttribute(opPos, 3)); opGeo.setAttribute('color', new THREE.BufferAttribute(opCol, 3));
      const oline = new THREE.Line(opGeo, new THREE.LineBasicMaterial({ vertexColors: true })); oline.frustumCulled = false; root.add(oline);
      const nodeGeo = new THREE.BufferGeometry(); nodeGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
      const nodeLine = new THREE.Line(nodeGeo, new THREE.LineDashedMaterial({ color: 0xffd34d, dashSize: 0.22, gapSize: 0.16 })); nodeLine.frustumCulled = false; root.add(nodeLine);
      const nodeLab = label('두 궤도면이 만나는 선', [0, 0, 0], { size: 11.5, color: 'rgba(110,80,0,.9)' });
      const drop = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 1, 0)]), new THREE.LineBasicMaterial({ color: 0x7dd3fc })); drop.frustumCulled = false; root.add(drop);
      const foot = new THREE.Mesh(new THREE.CircleGeometry(0.22, 20), new THREE.MeshBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.5, side: THREE.DoubleSide })); foot.rotation.x = -Math.PI / 2; root.add(foot);

      /* 그림자 원뿔: 본그림자(진한 색)와 반그림자(옅은 색), 태양의 반대쪽(−x)으로 */
      const LU = SD * RMOON / (RS - RMOON), LP = 7, LE = 7.5;
      const cone = (r0, r1, len, col, op) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, len, 28, 1, true), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: op, side: THREE.DoubleSide, depthWrite: false })); m.rotation.z = Math.PI / 2; m.position.x = -len / 2; return m; };
      const moonSh = new THREE.Group(); moonSh.add(cone(RMOON, 0.001, LU, 0x05070f, 0.6), cone(RMOON, RMOON + LP * (RS + RMOON) / SD, LP, 0x1b2540, 0.26)); root.add(moonSh);
      const earthSh = new THREE.Group(); earthSh.add(cone(RE, RE - LE * (RS - RE) / SD, LE, 0x05070f, 0.55), cone(RE, RE + LE * (RS + RE) / SD, LE, 0x1b2540, 0.26)); root.add(earthSh);
      const msLab = label('달 그림자', [0, 0, 0], { size: 11.5 }), esLab = label('지구 그림자', [-LE * 0.8, 0, 0], { size: 11.5 });
      const moonLab = label('달', moon, { size: 13, offset: [0, 0.5, 0] });

      const basis = (nu, tiltDeg) => { const n = nu * DEG, i = tiltDeg * DEG; const e1 = new THREE.Vector3(Math.cos(n), 0, -Math.sin(n)), e2 = new THREE.Vector3(Math.cos(n + Math.PI / 2) * Math.cos(i), Math.sin(i), -Math.sin(n + Math.PI / 2) * Math.cos(i)); return { e1, e2, nrm: new THREE.Vector3().crossVectors(e1, e2) }; };
      const V = new THREE.Vector3();
      let lastHtml = '';
      function refresh() {
        const tl = TILT * st.tiltA, B = basis(st.nuA, tl), u = (st.th - st.nuA) * DEG;
        const p = new THREE.Vector3().addScaledVector(B.e1, RM * Math.cos(u)).addScaledVector(B.e2, RM * Math.sin(u));
        moon.position.copy(p); moon.rotation.y = (st.th + 180) * DEG;
        mpl.matrix.makeBasis(B.e1, B.e2, B.nrm); mpl.matrixWorldNeedsUpdate = true;
        for (let k = 0; k <= OP; k++) { const a = k / OP * Math.PI * 2; V.set(0, 0, 0).addScaledVector(B.e1, RM * Math.cos(a)).addScaledVector(B.e2, RM * Math.sin(a)); opPos.set([V.x, V.y, V.z], k * 3); const up = V.y >= -1e-4; opCol.set(up ? [0.49, 0.83, 0.99] : [0.98, 0.75, 0.14], k * 3); }
        opGeo.attributes.position.needsUpdate = true; opGeo.attributes.color.needsUpdate = true;
        const na = nodeGeo.attributes.position; na.setXYZ(0, -B.e1.x * (RM + 1.3), 0, -B.e1.z * (RM + 1.3)); na.setXYZ(1, B.e1.x * (RM + 1.3), 0, B.e1.z * (RM + 1.3)); na.needsUpdate = true; nodeLine.computeLineDistances();
        nodeLab.obj = [B.e1.x * (RM + 1.3), -0.75, B.e1.z * (RM + 1.3)]; nodeLab.show(st.tiltA > 0.5);
        eclLab.obj = [Math.cos(305 * DEG) * PLANE, 0, -Math.sin(305 * DEG) * PLANE];
        mLab.obj = [B.e2.x * 4.3, B.e2.y * 4.3, B.e2.z * 4.3]; mLab.show(st.tiltA > 0.5);
        const above = p.y >= 0, dcol = above ? 0x7dd3fc : 0xfbbf24;
        const dp = drop.geometry.attributes.position; dp.setXYZ(0, p.x, p.y, p.z); dp.setXYZ(1, p.x, 0, p.z); dp.needsUpdate = true; drop.material.color.setHex(dcol); foot.position.set(p.x, 0.001, p.z); foot.material.color.setHex(dcol);
        drop.visible = foot.visible = Math.abs(p.y) > 0.03;
        moonSh.position.copy(p); msLab.obj = [p.x - Math.min(LU, 3.3), p.y, p.z]; msLab.show(p.x > 0.3);
        esLab.obj = [-6.4, -0.9, 0]; esLab.show(true);
        // 식 판정 (그림 속 크기 기준)
        const d = Math.hypot(p.y, p.z); let state = 'none', txt = '';
        if (p.x > 2.2) { const s = p.x, rpen = RMOON + s * (RS + RMOON) / SD; state = d < RE ? 'total' : d < RE + rpen ? 'partial' : 'none'; }
        else if (p.x < -2.2) { const s = -p.x, ru = RE - s * (RS - RE) / SD, rp = RE + s * (RS + RE) / SD; state = d + RMOON <= ru ? 'ltotal' : d - RMOON < ru ? 'lpartial' : d - RMOON < rp ? 'lpen' : 'none'; }
        const near = p.x > 2.2 ? 'new' : p.x < -2.2 ? 'full' : '';
        const heightTxt = Math.abs(p.y) < 0.03 ? '' : (above ? '지구 공전 궤도면보다 <b>위</b>' : '지구 공전 궤도면보다 <b>아래</b>');
        let head, body;
        if (near === 'new') {
          head = '<b>삭</b> 무렵 (θ=' + Math.round(st.th) + '°)';
          body = state === 'none' ? '달 그림자가 지구 ' + (above ? '위' : '아래') + '로 <b>비껴가요</b> → 일식이 없어요.' : state === 'total' ? '달의 본그림자가 지구에 닿아요 → 그 곳에서는 <b>개기 일식</b>이에요.' : '달의 반그림자가 지구에 닿아요 → <b>부분 일식</b>이에요.';
        } else if (near === 'full') {
          head = '<b>망</b> 무렵 (θ=' + Math.round(st.th) + '°)';
          body = state === 'none' ? '달이 지구 그림자의 ' + (above ? '위' : '아래') + '로 <b>비껴가요</b> → 월식이 없어요.' : state === 'ltotal' ? '달이 지구 본그림자에 완전히 들어가요 → <b>개기 월식</b>이에요.' : state === 'lpartial' ? '달 일부가 지구 본그림자에 들어가요 → <b>부분 월식</b>이에요.' : '달이 반그림자만 지나가요 (반영 월식).';
        } else { head = '<b>' + phaseName(st.th) + '</b> (θ=' + Math.round(st.th) + '°)'; body = '삭·망이 아니라서 태양·지구·달이 일직선이 아니에요. 식이 일어나지 않아요.'; }
        const html = head + (heightTxt && near ? ' · 달은 ' + heightTxt : '') + '<br>' + body + '<br><span style="color:#b9c6e4">달 궤도면은 지구 궤도면에 실제로 약 5° 기울어요 (그림은 과장).</span>';
        if (html !== lastHtml) { lastHtml = html; info(html); }
        moonLab.set(state === 'total' ? '달 · 개기 일식' : state === 'partial' ? '달 · 부분 일식' : state === 'ltotal' ? '달 · 개기 월식' : state === 'lpartial' ? '달 · 부분 월식' : state === 'lpen' ? '달 · 반영 월식' : '달');
      }

      /* 조작 */
      const probe = controls.text(''); probe.style.display = 'none'; const ctlEl = probe.parentElement;
      const fixLab = (em) => { const k = ctlEl.children, inp = k[k.length - 1], l = k[k.length - 2]; l.style.minWidth = em + 'em'; l.style.display = 'inline-block'; const g = document.createElement('span'); g.style.cssText = 'display:inline-flex;align-items:center;gap:8px;flex-wrap:nowrap'; ctlEl.insertBefore(g, l); g.append(l, inp); };
      const rng = controls.range('🌙', 0, 359, 1, Math.round(st.th), (v) => { st.target = null; st.play = false; playB.textContent = '▶ 공전'; st.th = v; refresh(); }, (v) => 'θ=' + v + '° ' + phaseName(v));
      fixLab(9.5);
      const playB = controls.button('▶ 공전', () => { st.play = !st.play; st.target = null; playB.textContent = st.play ? '⏸ 멈춤' : '▶ 공전'; });
      controls.segment('', [{ value: 0, label: '🌑 삭' }, { value: 180, label: '🌕 망' }], -1, (v) => { st.play = false; playB.textContent = '▶ 공전'; st.target = v; });
      const tB = controls.button('궤도 기울기 ✓', () => { st.tilt = !st.tilt; tB.classList.toggle('on', st.tilt); tB.textContent = '궤도 기울기 ' + (st.tilt ? '✓' : '✕'); }); tB.classList.toggle('on', st.tilt); tB.textContent = '궤도 기울기 ' + (st.tilt ? '✓' : '✕');
      const nB = controls.button('📍 식 없는 때', () => { st.nu = st.nu === 90 ? 0 : 90; nB.textContent = st.nu === 90 ? '📍 식 없는 때' : '📍 식이 일어나는 때'; nB.classList.toggle('on', st.nu === 0); });
      controls.text('').style.cssText = 'flex-basis:100%;height:0;padding:0;margin:-3px 0';
      controls.segment('시점', [{ value: 'top', label: '위에서' }, { value: 'obl', label: '비스듬히' }, { value: 'side', label: '옆에서' }], 'obl', (v) => { Object.assign(orbit, { tx: 2.2, ty: 0, tz: 0 }, VIEWS[v]); });
      refresh();

      return {
        update(dt) {
          let ch = false;
          if (st.play) { st.th = norm(st.th + 30 * dt); rng.set(Math.round(st.th) % 360); ch = true; }
          else if (st.target != null) { const d = ((st.target - st.th + 540) % 360) - 180; st.th = norm(st.th + Math.sign(d) * Math.min(Math.abs(d), Math.max(0.5, Math.abs(d) * 6 * dt))); if (Math.abs(d) < 0.4) { st.th = st.target; st.target = null; } rng.set(Math.round(st.th) % 360); ch = true; }
          const ta = st.tilt ? 1 : 0; if (Math.abs(st.tiltA - ta) > 1e-3) { st.tiltA += (ta - st.tiltA) * Math.min(1, dt * 6); ch = true; } else st.tiltA = ta;
          const dn = ((st.nu - st.nuA + 540) % 360) - 180; if (Math.abs(dn) > 0.05) { st.nuA += dn * Math.min(1, dt * 5); ch = true; } else st.nuA = st.nu;
          if (ch) refresh();
        },
        sync() { try { const s = window.__sim && window.__sim.S; if (s) { if (typeof s.theta === 'number') { st.th = norm(s.theta); st.target = null; rng.set(Math.round(st.th) % 360); } refresh(); } } catch (e) {} },
      };
    },
  });
})();
