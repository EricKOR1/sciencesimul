/* he-typhoon · 3D 태풍의 구조
   눈(맑음) · 눈벽(가장 높고 센 구름) · 나선 구름 띠를 입체로 보고, 공기의 흐름(아래 반시계 방향 수렴 → 눈벽에서 상승 → 위 시계 방향 발산)을 따라가요.
   '단면'은 태풍을 반으로 잘라 풍속 곡선(눈벽에서 최대)을 보여 주고, '위험 반원'은 진행 방향의 오른쪽(바람이 더 센 쪽)을 표시해요.
   2D 실험의 중심 기압(S.pres)을 읽어 시작해요(읽기 전용). */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

  window.SciSim3D.attach({
    title: '태풍의 구조 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    levels: [0, 1, 3],
    camera: { dist: PHONE ? 19 : 15, theta: 0.55, phi: 1.08, min: 6, max: 30, target: [0, 1.3, 0] },
    autoRotate: 0.12,
    build(ctx) {
      const { THREE, root, label, info, controls, renderer } = ctx;
      renderer.localClippingEnabled = true;
      const cutPlane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0);       // z>0 쪽을 잘라 내요
      let cut = false;
      const cloudMat = (o) => { const m = new THREE.MeshStandardMaterial(Object.assign({ color: 0xf4f7fb, roughness: 0.95, metalness: 0 }, o || {})); m.clippingPlanes = []; return m; };
      const clouds = [];

      /* 바다 */
      const SEA = 14, sg = new THREE.PlaneGeometry(SEA, SEA, 70, 70); sg.rotateX(-Math.PI / 2);
      const sea = new THREE.Mesh(sg, new THREE.MeshStandardMaterial({ color: 0x0c3f78, roughness: 0.35, metalness: 0.15, transparent: true, opacity: 0.97 })); root.add(sea);
      const sp = sg.attributes.position, sx0 = Float32Array.from(sp.array);
      const base = new THREE.Mesh(new THREE.BoxGeometry(SEA, 0.12, SEA), new THREE.MeshStandardMaterial({ color: 0x1a2b4a, roughness: 0.9 })); base.position.y = -0.1; root.add(base);

      /* 눈벽 · 눈 */
      const wall = new THREE.Mesh(new THREE.BufferGeometry(), cloudMat({ side: THREE.DoubleSide, transparent: true, opacity: 0.96 })); root.add(wall); clouds.push(wall);
      const canopy = new THREE.Mesh(new THREE.CircleGeometry(4.6, 72), (() => {
        const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'), gr = g.createRadialGradient(128, 128, 20, 128, 128, 128);
        gr.addColorStop(0, 'rgba(255,255,255,.95)'); gr.addColorStop(0.5, 'rgba(240,246,255,.55)'); gr.addColorStop(1, 'rgba(240,246,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
        const m = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, side: THREE.DoubleSide }); m.clippingPlanes = []; return m; })());
      canopy.rotation.x = -Math.PI / 2; root.add(canopy); clouds.push(canopy);
      /* 나선 구름 띠 */
      const NA = 4, NPA = 26, puffs = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 16, 12), cloudMat({ roughness: 1 }), NA * NPA); clouds.push(puffs);
      const spin = new THREE.Group(); spin.add(puffs); root.add(spin);
      /* 풍속 곡선 (잘린 면) */
      const prof = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ color: 0xffd34d })); root.add(prof);
      const profBase = new THREE.Mesh(new THREE.PlaneGeometry(SEA - 1, 2.0), new THREE.MeshBasicMaterial({ color: 0x0b1a33, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false })); profBase.position.set(0, 1.05, 0); root.add(profBase);
      /* 위험 · 안전 반원, 진행 방향 */
      const half = (th, col) => { const m = new THREE.Mesh(new THREE.CircleGeometry(5.6, 64, th, Math.PI), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide })); m.rotation.x = -Math.PI / 2; m.position.y = 0.06; root.add(m); return m; };
      const danger = half(-Math.PI / 2, 0xe03a3a), safe = half(Math.PI / 2, 0x3b82f6);
      const trk = new THREE.Group(); { const m = new THREE.MeshStandardMaterial({ color: 0xffd34d, emissive: 0xffa500, emissiveIntensity: 0.4 }), s = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.6, 12), m), h = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.5, 16), m); s.rotation.x = Math.PI / 2; h.rotation.x = -Math.PI / 2; h.position.z = -0.95; trk.add(s, h); trk.position.set(0, 0.2, -4.9); root.add(trk); }
      /* 공기 흐름 입자 */
      const NP = 70, flow = new THREE.InstancedMesh(new THREE.SphereGeometry(0.075, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }), NP); root.add(flow);
      const fc = [new THREE.Color(0x8be9ff), new THREE.Color(0xff9d6c), new THREE.Color(0xc9b8ff)];

      const LB = {
        eye: label('눈 (맑고 바람 약함)', [0, 0.1, 0], { size: 12 }), wall: label('눈벽 (바람 최대·가장 높은 구름)', [0, 0, 0], { size: 12, color: 'rgba(120,40,10,.92)' }),
        band: label('나선 구름 띠', [0, 0, 0], { size: 12 }), up: label('상승 기류', [0, 0, 0], { size: 11.5, color: 'rgba(160,60,20,.9)' }),
        inn: label('아래: 반시계 방향으로 모여요', [-3.6, 0.5, 2.2], { size: 11.5, color: 'rgba(20,90,140,.9)' }), out: label('위: 시계 방향으로 퍼져요', [3.2, 3.9, 0], { size: 11.5, color: 'rgba(90,60,170,.9)' }),
        dg: label('위험 반원 (오른쪽)', [3.4, 0.1, 1.8], { size: 12, color: 'rgba(170,30,30,.92)' }), sf: label('안전 반원 (왼쪽)', [-3.4, 0.1, 1.8], { size: 12, color: 'rgba(30,70,160,.92)' }),
        mv: label('진행 방향', trk, { size: 11.5, offset: [0.7, 0.3, 0] }), vp: label('풍속 곡선', [3.0, 1.6, 0], { size: 11.5, color: 'rgba(120,90,0,.92)' }),
      };

      /* 상태 */
      let pres = 950, showFlow = true, showDg = false, P = { rE: 0.7, top: 3.2, v: 45 };
      let sync0 = null; try { const s = window.__sim && window.__sim.S; if (s && typeof s.pres === 'number') sync0 = s.pres; } catch (e) {}
      const wprof = (r) => { const x = r / P.rE; return x < 1 ? P.v * Math.pow(x, 1.2) * 0.9 : P.v * Math.pow(1 / x, 0.6); };
      const rWall = (y) => P.rE + 1.1 * Math.pow(y / P.top, 1.35);

      function rebuild() {
        const s = clamp((1010 - pres) / 90, 0.1, 1); P.rE = 0.95 - 0.45 * s; P.top = 2.9 + 0.7 * s; P.v = Math.round(18 + 52 * s);
        /* 눈벽: 두꺼운 쐐기 단면을 돌려서 만든 면 */
        const prof2 = [], N = 16; for (let i = 0; i <= N; i++) { const y = P.top * i / N; prof2.push(new THREE.Vector2(rWall(y), y)); }
        for (let i = N; i >= 0; i--) { const y = P.top * i / N, th = 0.35 + 0.45 * (1 - i / N) + 0.15; prof2.push(new THREE.Vector2(rWall(y) + th, y)); }
        wall.geometry.dispose(); wall.geometry = new THREE.LatheGeometry(prof2, 72);
        canopy.position.y = P.top + 0.05;
        /* 구름 띠 */
        const dm = new THREE.Object3D(); let k = 0; let sd = 7; const rnd = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
        for (let a = 0; a < NA; a++) for (let i = 0; i < NPA; i++) {
          const f = i / (NPA - 1), r = lerp(P.rE + 1.5, 5.8, Math.pow(f, 0.9)), th = a * Math.PI / 2 - 2.5 * Math.log(r / (P.rE + 1.0)) * 1.0 + (rnd() - 0.5) * 0.18, hgt = lerp(1.0, 0.25, f) * (0.8 + rnd() * 0.5);
          dm.position.set(Math.cos(th) * r, hgt * 0.5 + 0.05, -Math.sin(th) * r); const sz = lerp(0.42, 0.24, f) * (0.8 + rnd() * 0.5); dm.scale.set(sz * 1.3, hgt * 0.55 + 0.1, sz * 1.3); dm.updateMatrix(); puffs.setMatrixAt(k++, dm.matrix);
        }
        puffs.instanceMatrix.needsUpdate = true;
        /* 풍속 곡선 */
        const pts = []; for (let i = -40; i <= 40; i++) { const x = i / 40 * 6.2, v = wprof(Math.abs(x)); pts.push(new THREE.Vector3(x, 0.15 + v / P.v * 1.7, 0)); }
        prof.geometry.dispose(); prof.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 100, 0.04, 6, false);
        LB.eye.obj = [0, 0.1, 0]; LB.wall.obj = [rWall(P.top * 0.9) + 0.4, P.top * 0.9, 0]; LB.up.obj = [rWall(P.top * 0.5) + 0.7, P.top * 0.5, 0]; LB.band.obj = [Math.cos(-2.5 * Math.log(1.6 / (P.rE + 1.0))) * 3.6, 0.5, 2.6];
        LB.vp.obj = [3.0, 0.2 + wprof(3.0) / P.v * 1.7 + 0.3, 0];
        info('중심 기압 <b>' + pres + ' hPa</b> · 최대 풍속 약 <b>' + P.v + ' m/s</b><br>바람은 <b>눈벽</b>에서 가장 세고, <b>눈</b>에서는 약해요.<br>기압이 낮을수록 눈이 작고 바람이 세요.');
        seaH = (1010 - pres) / 100 * 0.9;
      }
      let seaH = 0; rebuild();
      const rP = controls.range('중심 기압', 920, 995, 5, pres, (v) => { pres = v; rebuild(); }, (v) => v + ' hPa');
      const bCut = controls.button('단면 보기', () => { cut = !cut; bCut.classList.toggle('on', cut); apply(); });
      const bFlow = controls.button('공기 흐름 ✓', () => { showFlow = !showFlow; bFlow.classList.toggle('on', showFlow); bFlow.textContent = '공기 흐름 ' + (showFlow ? '✓' : '✕'); apply(); }); bFlow.classList.add('on');
      const bDg = controls.button('위험 반원', () => { showDg = !showDg; bDg.classList.toggle('on', showDg); apply(); });
      function apply() {
        clouds.forEach((m) => { m.material.clippingPlanes = cut ? [cutPlane] : []; m.material.needsUpdate = true; });
        flow.visible = showFlow; danger.visible = safe.visible = showDg; prof.visible = profBase.visible = cut; LB.vp.show(cut); LB.dg.show(showDg); LB.sf.show(showDg); LB.mv.show(showDg); trk.visible = showDg;
        LB.inn.show(showFlow); LB.out.show(showFlow); LB.up.show(false); LB.band.show(!cut);
      }
      apply();

      const dm2 = new THREE.Object3D(), pos = new THREE.Vector3();
      return {
        update(dt, t) {
          this.sync();
          /* 바다 물결 + 낮은 기압으로 해수면 상승 */
          for (let i = 0; i < sp.count; i++) {
            const x = sx0[i * 3], z = sx0[i * 3 + 2], r = Math.hypot(x, z);
            sp.setY(i, 0.05 * Math.sin(x * 1.3 + t * 1.6) * Math.cos(z * 1.1 + t * 1.2) + seaH * Math.exp(-Math.pow(r / 2.2, 2)) + (r < 6 ? 0 : 0));
          }
          sp.needsUpdate = true; sg.computeVertexNormals();
          spin.rotation.y += dt * 0.35; wall.rotation.y += dt * 0.5;
          if (showFlow) {
            for (let i = 0; i < NP; i++) {
              const ph = (i / NP + t * 0.07 + ((i * 7) % 5) * 0.013) % 1, ang0 = (i * 2.399963) % (Math.PI * 2);
              let r, y, th, col;
              if (ph < 0.45) { const f = ph / 0.45; r = lerp(5.8, rWall(0.2) + 0.2, f); y = 0.25 + 0.15 * Math.sin(f * 3); th = ang0 + f * 3.4; col = 0; }
              else if (ph < 0.72) { const f = (ph - 0.45) / 0.27; y = 0.3 + f * (P.top - 0.2); r = rWall(y) + 0.45; th = ang0 + 3.4 + f * 5.5; col = 1; }
              else { const f = (ph - 0.72) / 0.28; r = lerp(rWall(P.top) + 0.45, 5.4, f); y = P.top + 0.05 + 0.2 * f; th = ang0 + 3.4 + 5.5 - f * 2.6; col = 2; }
              dm2.position.set(Math.cos(th) * r, y, -Math.sin(th) * r); dm2.scale.setScalar(1); dm2.updateMatrix(); flow.setMatrixAt(i, dm2.matrix); flow.setColorAt(i, fc[col]);
            }
            flow.instanceMatrix.needsUpdate = true; if (flow.instanceColor) flow.instanceColor.needsUpdate = true;
          }
          trk.position.z = -4.9 - 0.12 * Math.sin(t * 3);
        },
        sync() { try { const s = window.__sim && window.__sim.S; if (s && typeof s.pres === 'number' && s.pres !== sync0) { sync0 = s.pres; pres = clamp(Math.round(s.pres / 5) * 5, 920, 995); rP.set(pres); rebuild(); } } catch (e) {} },
      };
    },
  });
})();
