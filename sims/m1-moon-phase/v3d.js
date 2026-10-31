/* m1-moon-phase · 3D 태양-지구-달 모형
   달은 언제나 태양 쪽 절반이 밝아요. 달이 지구 둘레를 도는 위치(θ)에 따라 그 밝은 면이 지구에서 얼마나 보이는지를
   입체 모형과 '지구에서 본 달' 창으로 함께 봐요. (크기·거리는 실제와 달라요. θ = 0° 가 태양 쪽, 북극 위에서 볼 때 시계 반대 방향으로 공전)
   2D 실험의 위상 구분(phaseKey)과 음력 날짜 식(lunarDay)을 그대로 써요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const DEG = Math.PI / 180, RM = 3.7, SUNX = 9.5;
  const norm = (a) => ((a % 360) + 360) % 360;
  const PH = { new: '삭', wxc: '초승달', fq: '상현달', wxg: '볼록한 달', full: '보름달 (망)', wng: '볼록한 달', lq: '하현달', wnc: '그믐달' };
  function phaseKey(th) {
    th = norm(th);
    if (th < 12 || th >= 348) return 'new'; if (th < 75) return 'wxc'; if (th <= 105) return 'fq'; if (th < 165) return 'wxg';
    if (th <= 195) return 'full'; if (th < 255) return 'wng'; if (th <= 285) return 'lq'; return 'wnc';
  }
  const lunarDay = (th) => Math.floor(norm(th) / 360 * 29.5) + 1;
  const wide = (window.innerWidth || 1000) >= 600;
  const CRATERS = [[-0.36, -0.3, 0.17], [0.28, 0.36, 0.13], [0.42, -0.22, 0.1], [-0.08, 0.52, 0.09], [-0.52, 0.22, 0.12], [0.06, -0.06, 0.08], [0.2, -0.55, 0.07]];

  window.SciSim3D.attach({
    host: '.stage-card',
    title: '3D 태양·지구·달 모형',
    hint: ' ',
    camera: wide ? { dist: 19, theta: 0.2, phi: 0.95, fov: 45, target: [2.5, 0, 0], min: 4, max: 40 } : { dist: 25, theta: -Math.PI / 2 + 0.06, phi: 0.7, fov: 45, target: [2.8, 0, 0], min: 4, max: 45 },
    autoRotate: 0,
    build(ctx) {
      const { THREE, scene, root, label, info, controls, renderer } = ctx;
      const st = { th: 0, target: null, play: false };
      try { const s = window.__sim && window.__sim.S; if (s && typeof s.theta === 'number') st.th = norm(s.theta); } catch (e) {}
      const ringP = (a, r, y) => [r * Math.cos(a * DEG), y || 0, -r * Math.sin(a * DEG)];

      /* 빛: 태양 쪽(+x)에서 오는 평행한 햇빛 */
      scene.traverse((o) => { if (o.isDirectionalLight) { o.position.set(60, 0, 0); o.intensity = 2.5; } if (o.isHemisphereLight) o.intensity = 0.3; });

      /* 배경 별 */
      { let seed = 5; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }; const pos = [];
        for (let i = 0; i < 300; i++) { const u = rnd() * 2 - 1, a = rnd() * Math.PI * 2, r = Math.sqrt(1 - u * u); pos.push(Math.cos(a) * r * 60, u * 60, Math.sin(a) * r * 60); }
        const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        root.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0x9fb4e8, size: 1.5, sizeAttenuation: false, transparent: true, opacity: 0.55 }))); }

      /* 태양 */
      const glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,230,140,1)'); gr.addColorStop(0.25, 'rgba(255,190,60,.55)'); gr.addColorStop(1, 'rgba(255,160,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();
      const sun = new THREE.Mesh(new THREE.SphereGeometry(1.1, 32, 20), new THREE.MeshBasicMaterial({ color: 0xffd23f })); sun.position.set(SUNX, 0, 0); root.add(sun);
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); glow.scale.set(6, 6, 1); glow.position.copy(sun.position); root.add(glow);
      label('☀ 태양', [SUNX, 1.7, 0], { size: 13, color: 'rgba(120,70,0,.85)' });
      // 햇빛 화살표 (평행)
      [-2.2, -0.9, 0.9, 2.2].forEach((z) => {
        const x0 = SUNX - 1.8, x1 = RM + 1.7;
        root.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x0, 0, z), new THREE.Vector3(x1, 0, z)]), new THREE.LineBasicMaterial({ color: 0xffd34d, transparent: true, opacity: 0.75 })));
        const c = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.3, 10), new THREE.MeshBasicMaterial({ color: 0xffd34d })); c.position.set(x1, 0, z); c.rotation.z = Math.PI / 2; root.add(c);
      });
      label('햇빛 (나란히 와요)', [SUNX - 3.4, 0, 2.2], { size: 11.5, offset: [0, 0, 0.5] });

      /* 지구 */
      const earthTex = (() => { const c = document.createElement('canvas'); c.width = 256; c.height = 128; const g = c.getContext('2d'); g.fillStyle = '#2f7fd8'; g.fillRect(0, 0, 256, 128); g.fillStyle = '#4caf6a';
        let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
        for (let i = 0; i < 16; i++) { const x = rnd() * 256, y = 20 + rnd() * 88; for (let j = 0; j < 7; j++) { g.beginPath(); g.ellipse(x + (rnd() - 0.5) * 30, y + (rnd() - 0.5) * 18, 6 + rnd() * 16, 4 + rnd() * 9, rnd() * 3, 0, 7); g.fill(); } }
        g.fillStyle = '#f2f6fa'; g.fillRect(0, 0, 256, 7); g.fillRect(0, 121, 256, 7); return new THREE.CanvasTexture(c); })();
      const earth = new THREE.Mesh(new THREE.SphereGeometry(0.7, 32, 20), new THREE.MeshStandardMaterial({ map: earthTex, roughness: 0.75 })); root.add(earth);
      earth.rotation.y = 2.2;
      label('지구', [0, 1.15, 0], { size: 13 });

      /* 달 궤도, 8개 위치 */
      { const pts = []; for (let i = 0; i <= 120; i++) pts.push(new THREE.Vector3(...ringP(i * 3, RM))); root.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x8fb4ff, transparent: true, opacity: 0.6 }))); }
      [0, 45, 90, 135, 180, 225, 270, 315].forEach((a) => {
        const tk = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), new THREE.MeshBasicMaterial({ color: 0xcfe0ff })); tk.position.set(...ringP(a, RM)); root.add(tk);
        label(PH[phaseKey(a)], ringP(a, RM + 1.15), { size: 11 });
      });
      [60, 165, 255, 345].forEach((a) => { // 공전 방향 화살촉
        const cone = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.32, 12), new THREE.MeshBasicMaterial({ color: 0x8fb4ff })); cone.position.set(...ringP(a, RM)); cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(-Math.sin(a * DEG), 0, -Math.cos(a * DEG))); root.add(cone); });
      label('공전 방향 ⟲', ringP(205, 2.75), { size: 11.5, color: 'rgba(30,50,110,.8)' });

      /* 달 */
      const moonTex = (() => { const c = document.createElement('canvas'); c.width = 256; c.height = 128; const g = c.getContext('2d'); g.fillStyle = '#cfcbc0'; g.fillRect(0, 0, 256, 128); g.fillStyle = 'rgba(95,95,105,.55)';
        [[118, 50, 22, 14], [140, 66, 18, 12], [105, 78, 13, 9], [150, 44, 12, 8], [128, 92, 10, 6], [96, 56, 9, 7], [168, 70, 10, 8]].forEach((b) => { g.beginPath(); g.ellipse(b[0], b[1], b[2], b[3], 0.3, 0, 7); g.fill(); });
        g.fillStyle = 'rgba(120,120,125,.45)'; let seed = 3; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
        for (let i = 0; i < 40; i++) { g.beginPath(); g.arc(rnd() * 256, 10 + rnd() * 108, 1.5 + rnd() * 3, 0, 7); g.fill(); } return new THREE.CanvasTexture(c); })();
      const moon = new THREE.Mesh(new THREE.SphereGeometry(0.4, 32, 20), new THREE.MeshStandardMaterial({ map: moonTex, roughness: 0.95 })); root.add(moon);
      const moonLab = label('달', moon, { size: 13, offset: [0, 0.78, 0] });

      /* 지구-달 선, 각 θ 호 */
      const eml = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(RM, 0, 0)]), new THREE.LineDashedMaterial({ color: 0xffffff, dashSize: 0.15, gapSize: 0.12, transparent: true, opacity: 0.7 })); root.add(eml);
      root.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(2.2, 0, 0)]), new THREE.LineDashedMaterial({ color: 0xffd34d, dashSize: 0.15, gapSize: 0.12 })));
      const AN = 90, arcPos = new Float32Array((AN + 1) * 3), arcGeo = new THREE.BufferGeometry(); arcGeo.setAttribute('position', new THREE.BufferAttribute(arcPos, 3));
      const arc = new THREE.Line(arcGeo, new THREE.LineBasicMaterial({ color: 0xffd34d })); arc.frustumCulled = false; root.add(arc);
      const thLab = label('θ', [0, 0, 0], { size: 12.5, color: 'rgba(255,211,77,.95)' }); thLab.el.style.color = '#1b2333';

      /* '지구에서 본 달' 창 (2D) */
      const view = renderer.domElement.parentElement;
      const box = document.createElement('div');
      box.style.cssText = 'position:absolute;right:10px;bottom:10px;z-index:3;padding:6px 8px 7px;border-radius:14px;background:rgba(8,12,24,.78);border:1px solid rgba(255,255,255,.22);text-align:center;pointer-events:none;color:#e8eefc;font-size:12px;font-weight:800;line-height:1.3';
      const SZ = wide ? 112 : 82, cvs = document.createElement('canvas'); cvs.width = cvs.height = SZ * 2; cvs.style.cssText = 'display:block;width:' + SZ + 'px;height:' + SZ + 'px;margin:3px auto 3px';
      const cap = document.createElement('div'); box.append(Object.assign(document.createElement('div'), { textContent: '👁 지구에서 본 달' }), cvs, cap); view.appendChild(box);
      const g2 = cvs.getContext('2d');
      function drawMoon2D(th) {
        const S = cvs.width, r = S / 2 - 8, cx = S / 2, cy = S / 2; g2.clearRect(0, 0, S, S);
        const paint = (lit) => { // 달 표면 무늬
          const gr = g2.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.1, cx, cy, r); gr.addColorStop(0, lit ? '#f6f1de' : '#26304d'); gr.addColorStop(1, lit ? '#cfcbbb' : '#161c33');
          g2.fillStyle = gr; g2.beginPath(); g2.arc(cx, cy, r, 0, 7); g2.fill();
          g2.fillStyle = lit ? 'rgba(110,110,120,.42)' : 'rgba(0,0,0,.28)'; CRATERS.forEach((c) => { g2.beginPath(); g2.arc(cx + c[0] * r, cy + c[1] * r, c[2] * r, 0, 7); g2.fill(); });
        };
        paint(false);
        const t = norm(th), wax = t <= 180, c = wax ? Math.cos(t * DEG) : Math.cos((360 - t) * DEG);
        g2.save(); g2.beginPath();
        const N = 48, sgn = wax ? 1 : -1;
        for (let i = 0; i <= N; i++) { const a = -Math.PI / 2 + Math.PI * i / N, x = cx + sgn * r * Math.cos(a), y = cy + r * Math.sin(a); i ? g2.lineTo(x, y) : g2.moveTo(x, y); }
        for (let i = N; i >= 0; i--) { const a = -Math.PI / 2 + Math.PI * i / N, x = cx + sgn * c * r * Math.cos(a), y = cy + r * Math.sin(a); g2.lineTo(x, y); }
        g2.closePath(); g2.clip(); paint(true); g2.restore();
        g2.strokeStyle = 'rgba(255,255,255,.25)'; g2.lineWidth = 2; g2.beginPath(); g2.arc(cx, cy, r, 0, 7); g2.stroke();
      }

      function refresh() {
        const th = st.th, p = ringP(th, RM);
        moon.position.set(...p); moon.rotation.y = (th + 180) * DEG; // 항상 같은 면이 지구를 향해요
        const lp = eml.geometry.attributes.position; lp.setXYZ(1, ...p); lp.needsUpdate = true; eml.computeLineDistances();
        const n = Math.max(1, Math.round(AN * Math.min(th, 359.9) / 360));
        for (let i = 0; i <= AN; i++) { const a = th * Math.min(i, n) / n; arcPos.set(ringP(a, 2.2), i * 3); }
        arcGeo.attributes.position.needsUpdate = true; arcGeo.setDrawRange(0, th < 0.5 ? 0 : AN + 1);
        thLab.obj = ringP(th / 2, 2.2); thLab.set('θ = ' + Math.round(th) + '°'); thLab.show(th >= 3);
        drawMoon2D(th);
        const key = phaseKey(th), k = Math.round((1 - Math.cos(th * DEG)) / 2 * 100);
        cap.innerHTML = PH[key] + '<br><span style="font-weight:700;color:#b9c6e4">음력 약 ' + lunarDay(th) + '일</span>';
        moonLab.set('달 · ' + PH[key]);
        info('달은 <b>항상 태양 쪽 절반</b>이 밝아요. 지금 지구에서는 그 밝은 면의 <b>약 ' + k + '%</b>가 보여요.<br>' +
          '<b>' + PH[key] + '</b> · 음력 약 ' + lunarDay(th) + '일 · θ = ' + Math.round(th) + '°<br>달의 위치가 바뀌면 지구에서 보이는 밝은 면이 달라져요.');
      }

      /* 조작 */
      const probe = controls.text(''); probe.style.display = 'none'; const ctlEl = probe.parentElement;
      const fixLab = (em) => { const k = ctlEl.children, inp = k[k.length - 1], l = k[k.length - 2]; l.style.minWidth = em + 'em'; l.style.display = 'inline-block'; const g = document.createElement('span'); g.style.cssText = 'display:inline-flex;align-items:center;gap:8px;flex-wrap:nowrap'; ctlEl.insertBefore(g, l); g.append(l, inp); };
      const rng = controls.range('🌙', 0, 359, 1, Math.round(st.th), (v) => { st.target = null; st.play = false; playB.textContent = '▶ 공전 재생'; st.th = v; refresh(); }, (v) => '음력 약 ' + lunarDay(v) + '일 (θ=' + v + '°)');
      fixLab(15);
      const playB = controls.button('▶ 공전 재생', () => { st.play = !st.play; st.target = null; playB.textContent = st.play ? '⏸ 멈춤' : '▶ 공전 재생'; });
      controls.text('').style.cssText = 'flex-basis:100%;height:0;padding:0;margin:-3px 0';
      controls.segment('바로 이동', [{ value: 0, label: '삭' }, { value: 90, label: '상현달' }, { value: 180, label: '보름달' }, { value: 270, label: '하현달' }], -1, (v) => { st.play = false; playB.textContent = '▶ 공전 재생'; st.target = v; });
      refresh();

      return {
        update(dt) {
          if (st.play) { st.th = norm(st.th + 30 * dt); rng.set(Math.round(st.th) % 360); refresh(); }
          else if (st.target != null) {
            let d = ((st.target - st.th + 540) % 360) - 180; const step = Math.sign(d) * Math.min(Math.abs(d), Math.max(0.5, Math.abs(d) * 6 * dt));
            st.th = norm(st.th + step); if (Math.abs(d) < 0.4) { st.th = st.target; st.target = null; } rng.set(Math.round(st.th) % 360); refresh();
          }
        },
        sync() { try { const s = window.__sim && window.__sim.S; if (s && typeof s.theta === 'number') { st.th = norm(s.theta); st.target = null; rng.set(Math.round(st.th) % 360); refresh(); } } catch (e) {} },
      };
    },
  });
})();
