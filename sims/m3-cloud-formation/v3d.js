/* m3-cloud-formation · 3D 공기 덩어리 상승과 구름
   공기 덩어리가 올라가면 기압이 낮아져 부피가 커지고(단열 팽창) 기온이 내려가요. 이슬점까지 내려가면 수증기가 물방울로 변해 구름이 생겨요.
   2D 실험의 모형값: 지면 25 °C · 이슬점 15 °C · 구름 밑면 1000 m */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHN = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const LCL = 1000, TG = 25, TD = 15, HM = 2000, PK = 3.2;
  const tAt = (h) => (h <= LCL ? TG - 10 * (h / 1000) : TD - 6 * ((h - LCL) / 1000));
  window.SciSim3D.attach({
    host: '.stage-card',
    title: '구름의 생성 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: PHN ? 17 : 13.5, theta: 0.15, phi: 1.3, min: 6, max: 28, target: [0, 1.6, 0] },
    autoRotate: 0,
    levels: [2],               // 단계 3(구름이 생기는 산비탈)에서 3D로 시작해요. 병 실험·강수 과정은 2D 화면에서 해요
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const V3 = THREE.Vector3, C = THREE.Color;
      let mode = 'mtn', h = 0, rain = true;
      const lift = (v) => { const L = ctx.lesson(); if (L && L.setLift) L.setLift(v); else { h = v; refresh(); } };
      const sm = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.6, metalness: 0 }, o || {}));
      /* 지형 */
      const s3 = (u) => { u = Math.max(0, Math.min(1, u)); return u * u * (3 - 2 * u); };
      const hill = (x) => (x < -4 ? 0 : x < 1 ? PK * s3((x + 4) / 5) : PK * Math.exp(-Math.pow((x - 1) / 2.4, 2)));
      const ground = (x, z) => (mode === 'mtn' ? hill(x) * Math.exp(-z * z / 14) + 0.02 * Math.sin(x * 2 + z) : 0.03 * Math.sin(x * 1.7 + z * 1.3));
      const GW = 15, GD = 9, nx = 90, nz = 36;
      const tg = new THREE.PlaneGeometry(GW, GD, nx, nz); tg.rotateX(-Math.PI / 2);
      tg.setAttribute('color', new THREE.BufferAttribute(new Float32Array(tg.attributes.position.count * 3), 3));
      const terrain = new THREE.Mesh(tg, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, flatShading: false })); root.add(terrain);
      function shape() {
        const p = tg.attributes.position, c = tg.attributes.color, col = new C();
        for (let i = 0; i < p.count; i++) {
          const x = p.getX(i), z = p.getZ(i), y = ground(x, z); p.setY(i, y);
          const t = y / PK; if (t > 0.86) col.set(0xdfe7ee); else if (t > 0.45) col.set(0x7a6350).lerp(new C(0x9a8671), (t - 0.45) / 0.41); else col.set(0x4d8f48).lerp(new C(0x7a6350), Math.max(0, (t - 0.12) / 0.33));
          if (mode === 'conv' && Math.hypot(x + 0.5, z) < 1.7) col.set(0xc2693a).lerp(new C(0x5fa05a), Math.hypot(x + 0.5, z) / 1.7 * 0.6);
          col.convertSRGBToLinear(); c.setXYZ(i, col.r, col.g, col.b);
        }
        p.needsUpdate = true; c.needsUpdate = true; tg.computeVertexNormals();
      }
      /* 공기 덩어리의 길 */
      function pathAt(hh) {
        const y = hh / HM * PK;
        if (mode === 'conv') return new V3(-0.5, 0.35 + y * 0.95, 0);
        let lo = -4, hi = 1; for (let i = 0; i < 24; i++) { const m = (lo + hi) / 2; if (hill(m) < y) lo = m; else hi = m; }
        const x = hh <= 0 ? -4.6 + hh * 0 : (lo + hi) / 2; return new V3(x, ground(x, 0) + 0.2 + (hh <= 0 ? 0.35 : 0.2) , 0);
      }
      const air = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), sm(0xff9a3c, { transparent: true, opacity: 0.55, roughness: 0.2, depthWrite: false })); root.add(air);
      const airIn = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), sm(0xfff3d6, { transparent: true, opacity: 0.25, depthWrite: false })); air.add(airIn);
      const dots = new THREE.InstancedMesh(new THREE.SphereGeometry(0.05, 10, 8), new THREE.MeshBasicMaterial({ color: 0xbdefff }), 36); air.add(dots);
      const dseed = []; for (let i = 0; i < 36; i++) { const v = new V3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(0.25 + Math.random() * 0.55); dseed.push({ v, ph: Math.random() * 6.28 }); }
      const dm = new THREE.Object3D();
      /* 구름 밑면 */
      const base = new THREE.Mesh(new THREE.PlaneGeometry(GW - 1, 6), new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false })); base.rotation.x = -Math.PI / 2; base.position.y = LCL / HM * PK + 0.25; root.add(base);
      const baseL = label('구름 밑면 1000 m', [-GW / 2 + 1.7, base.position.y, 2.5], { color: 'rgba(3,105,161,.92)', size: 13 });
      /* 구름 방울들 (길을 따라 생겨요) */
      const NP = 56, puffG = new THREE.SphereGeometry(1, 20, 14), puffs = [];
      const cloudM = sm(0xffffff, { roughness: 0.95, transparent: true, opacity: 0.93 });
      for (let i = 0; i < NP; i++) { const m = new THREE.Mesh(puffG, cloudM); root.add(m); puffs.push({ m, k: Math.random(), o: new V3((Math.random() - 0.5) * 0.9, 0.15 + Math.random() * 0.8, -0.2 - Math.random() * 1.6), r: 0.28 + Math.random() * 0.3 }); }
      /* 비 */
      const rainI = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.012, 0.012, 0.25, 5), new THREE.MeshBasicMaterial({ color: 0x9bd4ff, transparent: true, opacity: 0.8 }), 60); root.add(rainI);
      const rseed = []; for (let i = 0; i < 60; i++) rseed.push({ k: Math.random(), z: (Math.random() - 0.5) * 2.2, x: Math.random() - 0.5 });
      /* 해, 바람 */
      const sun = new THREE.Mesh(new THREE.SphereGeometry(0.6, 28, 20), new THREE.MeshBasicMaterial({ color: 0xffd34d })); sun.position.set(-3.8, 5.6, -1.5); root.add(sun);
      const winds = []; for (let i = 0; i < 5; i++) { const m = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.4, 10), new THREE.MeshBasicMaterial({ color: 0xcbd5e1, transparent: true, opacity: 0.8 })); m.rotation.z = -Math.PI / 2; root.add(m); winds.push(m); }
      const airLab = label('', air, { color: 'rgba(15,23,42,.9)', size: 13, offset: [0, 1.2, 0] });
      function setMode(m) { mode = m; shape(); sun.visible = m === 'conv'; winds.forEach((w) => { w.visible = m === 'mtn'; }); lift(0); h = 0; refresh(); }
      function refresh() {
        const T = tAt(h), cl = h > LCL + 40, P = pathAt(h);
        const r = 0.62 * (1 + 0.5 * h / HM) * (1 + (TG - T) * 0.004);
        air.position.copy(P); air.position.y += r * 0.2; air.scale.setScalar(r);
        const f = Math.max(0, Math.min(1, (TG - T) / 20)); air.material.color.setRGB(1 - 0.55 * f, 0.6 + 0.2 * f, 0.24 + 0.76 * f);
        dots.visible = cl; airLab.set('공기 덩어리 ' + Math.round(h) + ' m · <b>' + Math.round(T) + '°C</b>');
        const parts = [];
        parts.push('<b>' + Math.round(h) + ' m</b>에서 기온 <b>' + Math.round(T) + '°C</b>, 부피 <b>' + (1 + 0.5 * h / HM).toFixed(2) + '배</b>');
        parts.push(h < LCL - 40 ? '아직 이슬점(15°C)보다 높아서 구름이 없어요.' : h < LCL + 40 ? '이슬점에 도달! 수증기가 응결하기 시작해요.' : '<span style="color:#7dd3fc">수증기가 물방울이 되어 구름이 생겨요.</span>');
        info(parts.join('<br>'));
      }
      controls.segment('공기가 올라가는 까닭', [{ value: 'mtn', label: '산을 타고 오를 때' }, { value: 'conv', label: '지표가 가열될 때' }], mode, setMode);
      /* ▶ 공기 덩어리가 올라갔다 내려와요 (2D 슬라이더의 높이도 같이 움직여요) */
      controls.player({
        duration: 10, loop: true, label: '공기 덩어리 상승',
        phases: [[0, '올라가요 · 부피↑ 기온↓'], [0.25, '이슬점 도달 · 구름 밑면'], [0.33, '구름이 생겨요'], [0.5, '내려와요']],
        onFrame(p) { const tri = p < 0.5 ? p * 2 : 2 - p * 2; lift(HM * tri); },
      });
      const rb = controls.button('비 ✓', () => { rain = !rain; rb.textContent = '비 ' + (rain ? '✓' : '✕'); }); rb.classList.add('on');
      shape(); refresh(); sun.visible = false; let lastH = -1;
      return {
        update(dt, t) {
          const L = ctx.lesson(); if (L && L.MT && Math.abs(L.MT.Hv - lastH) > 0.5) { lastH = L.MT.Hv; h = Math.max(0, Math.min(HM, L.MT.Hv)); refresh(); }
          /* 구름 방울 */
          const hLCL = LCL + 20, cur = Math.max(0, h - hLCL);
          puffs.forEach((q, i) => {
            const hh = hLCL + q.k * (HM - hLCL), P = pathAt(hh), s = Math.max(0, Math.min(1, (h - hh) / 260 + 0.0)) * (h > hLCL ? 1 : 0);
            q.m.position.copy(P).add(q.o); q.m.position.y += 0.35; if (mode === 'conv') { q.m.position.x += q.o.x * 1.3; q.m.position.y += (hh - hLCL) / HM * 0.2; }
            q.m.scale.setScalar(q.r * s * (1 + 0.06 * Math.sin(t * 1.5 + i))); q.m.visible = s > 0.02;
          });
          /* 방울 점 */
          for (let i = 0; i < dseed.length; i++) { const d = dseed[i]; dm.position.copy(d.v); dm.position.y += Math.sin(t * 2 + d.ph) * 0.03; dm.scale.setScalar(1); dm.updateMatrix(); dots.setMatrixAt(i, dm.matrix); } dots.instanceMatrix.needsUpdate = true;
          /* 비: 구름이 충분히 두꺼울 때 */
          const heavy = rain && h > LCL + 700;
          for (let i = 0; i < rseed.length; i++) {
            const q = rseed[i], hh = hLCL + 0.5 * (HM - hLCL), P = pathAt(h), u = (q.k + t * 0.8) % 1;
            dm.position.set(P.x + q.x * 1.4, P.y + 0.3 - u * (P.y - ground(P.x, 0)), q.z); dm.scale.setScalar(heavy ? 1 : 0.001); dm.updateMatrix(); rainI.setMatrixAt(i, dm.matrix);
          } rainI.instanceMatrix.needsUpdate = true;
          winds.forEach((w, i) => { const u = (t * 0.5 + i / winds.length) % 1; w.position.set(-7 + u * 4, 0.6 + i * 0.5 + Math.sin(t + i) * 0.1, -2.6 + (i % 3) * 2.6); });
          if (mode === 'conv') sun.rotation.y = t * 0.2;
        },
      };
    },
  });
})();
