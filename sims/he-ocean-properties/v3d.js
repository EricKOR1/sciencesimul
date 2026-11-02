/* he-ocean-properties · 3D 바닷물 기둥: 수온·용존 산소의 연직 구조
   네 해역(저위도·중위도 여름·중위도 겨울·고위도)의 바닷물을 깊이 2000 m까지 기둥으로 세워 비교해요(깊이는 위쪽을 크게 늘려 그렸어요).
   색은 수온 또는 용존 산소량이에요. 수심 슬라이더로 판을 내리면 깊이마다 값을 읽을 수 있어요.
   혼합층(바람이 섞어 수온이 일정) · 수온 약층(수온이 급히 내려감) · 심해층(차갑고 일정)의 경계를 눈으로 확인해요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const lerp = (a, b, t) => a + (b - a) * t;
  const ZMAX = 2000, HS = 5.6, NS = 56;
  const yOf = (z) => -HS * Math.pow(Math.max(0, z) / ZMAX, 0.5);
  /* 해역별 수온 곡선 (예시 값): 혼합층 아래에서 지수적으로 내려가요 */
  const REG = [
    { id: 'low', name: '저위도', Ts: 27, hm: 80, Td: 2.5, L: 300, DO: [[0, 4.6], [80, 4.6], [300, 2.8], [800, 0.9], [1200, 1.4], [2000, 3.2]] },
    { id: 'ms', name: '중위도 여름', Ts: 21, hm: 30, Td: 3.5, L: 250, DO: [[0, 5.4], [100, 5.4], [400, 3.5], [1000, 2.4], [1500, 3.6], [2000, 4.8]] },
    { id: 'mw', name: '중위도 겨울', Ts: 11, hm: 180, Td: 3.5, L: 400, DO: [[0, 6.4], [200, 6.4], [500, 4.5], [1000, 3.0], [1500, 3.8], [2000, 4.8]] },
    { id: 'high', name: '고위도', Ts: 0.8, hm: 400, Td: 2.0, L: 600, DO: [[0, 7.6], [400, 7.2], [1000, 6.8], [2000, 6.4]] },
  ];
  const temp = (r, z) => (z <= r.hm ? r.Ts : r.Td + (r.Ts - r.Td) * Math.exp(-(z - r.hm) / r.L));
  const doxy = (r, z) => { const p = r.DO; for (let i = 1; i < p.length; i++) if (z <= p[i][0]) { const t = (z - p[i - 1][0]) / (p[i][0] - p[i - 1][0]); return lerp(p[i - 1][1], p[i][1], t * t * (3 - 2 * t)); } return p[p.length - 1][1]; };
  const thBase = (r) => { const dT = r.Ts - r.Td; if (dT < 4) return r.hm; return r.hm - r.L * Math.log(0.12); };       // 수온 약층 아래 경계(수온 차이의 약 12%가 남는 깊이)

  window.SciSim3D.attach({
    title: '수온·용존 산소 3D 기둥',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: PHONE ? 17 : 12.5, theta: 0.35, phi: 1.28, min: 6, max: 26, target: [0, -2.5, 0] },
    autoRotate: 0,
    build(ctx) {
      if (ctx.THREE.ColorManagement) ctx.THREE.ColorManagement.legacyMode = false;     // 색을 보이는 그대로(sRGB) 쓰도록 맞춰요
      const { THREE, root, label, info, controls } = ctx;
      const std = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.5, metalness: 0.0 }, o || {}));
      const XS = [-3.6, -1.2, 1.2, 3.6], CW = 1.7;
      const slices = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), std(0xffffff, { roughness: 0.45 }), 4 * NS); root.add(slices);
      const dm = new THREE.Object3D(), cc = new THREE.Color();
      /* 수면 + 받침 */
      REG.forEach((r, i) => {
        const top = new THREE.Mesh(new THREE.BoxGeometry(CW, 0.06, CW), std(0x66c7ff, { transparent: true, opacity: 0.55, roughness: 0.2, metalness: 0.1 })); top.position.set(XS[i], 0.03, 0); root.add(top);
        label(r.name, [XS[i], 0.2, 0], { size: 12.5, offset: [0, 0.2, 0] });
      });
      const base = new THREE.Mesh(new THREE.BoxGeometry(9.2, 0.14, 2.6), std(0x2a3550, { roughness: 0.9 })); base.position.set(0, -HS - 0.1, 0); root.add(base);
      /* 수심 판 */
      const plane = new THREE.Mesh(new THREE.BoxGeometry(9.0, 0.05, 2.3), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.4, depthWrite: false })); root.add(plane);
      const rimM = new THREE.MeshBasicMaterial({ color: 0xffffff }), rim = new THREE.Mesh(new THREE.BoxGeometry(9.0, 0.03, 0.03), rimM); rim.position.z = 1.15; plane.add(rim);
      const vlab = REG.map((r, i) => label('', [XS[i], 0, CW / 2], { size: 12, offset: [0, 0, 0.6], color: 'rgba(15,23,42,.92)' }));
      /* 혼합층 안의 바람 알갱이 */
      const NP = 16, mix = REG.map((r, i) => { const m = new THREE.InstancedMesh(new THREE.SphereGeometry(0.06, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.75 }), NP); root.add(m); return m; });
      /* 층 이름표 (저위도 기둥 왼쪽) */
      const LY = { mix: label('혼합층', [XS[0] - 1.15, 0, 0], { size: 12 }), th: label('수온 약층', [XS[0] - 1.15, 0, 0], { size: 12, color: 'rgba(150,50,20,.92)' }), dp: label('심해층', [XS[0] - 1.15, 0, 0], { size: 12, color: 'rgba(20,50,140,.92)' }) };
      const bnd = REG.map((r, i) => { const m = new THREE.Mesh(new THREE.BoxGeometry(CW + 0.1, 0.025, CW + 0.1), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 })); m.position.set(XS[i], 0, 0); root.add(m); const m2 = m.clone(); root.add(m2); return [m, m2]; });

      /* 색 */
      const cT = (T) => { const t = Math.max(0, Math.min(1, T / 28)); const a = new THREE.Color(0x1d3a8a), b = new THREE.Color(0x2fb7a8), c = new THREE.Color(0xffd23f), d = new THREE.Color(0xff5a2e); return t < 0.33 ? a.lerp(b, t / 0.33) : t < 0.66 ? b.lerp(c, (t - 0.33) / 0.33) : c.lerp(d, (t - 0.66) / 0.34); };
      const cO = (v) => { const t = Math.max(0, Math.min(1, v / 8)); const a = new THREE.Color(0x4a1d6b), b = new THREE.Color(0xd14d72), c = new THREE.Color(0xfbd38d), d = new THREE.Color(0x4fd1c5); return t < 0.3 ? a.lerp(b, t / 0.3) : t < 0.55 ? b.lerp(c, (t - 0.3) / 0.25) : c.lerp(d, (t - 0.55) / 0.45); };
      let mode = 'T', z = 200;
      function recolor() {
        let n = 0;
        REG.forEach((r, i) => {
          for (let k = 0; k < NS; k++) {
            const u0 = k / NS, u1 = (k + 1) / NS, z0 = ZMAX * u0 * u0, z1 = ZMAX * u1 * u1, y0 = yOf(z0), y1 = yOf(z1), zm = (z0 + z1) / 2;
            dm.position.set(XS[i], (y0 + y1) / 2, 0); dm.scale.set(CW, Math.abs(y0 - y1) + 0.004, CW); dm.updateMatrix(); slices.setMatrixAt(n, dm.matrix);
            cc.copy(mode === 'T' ? cT(temp(r, zm)) : cO(doxy(r, zm))); slices.setColorAt(n, cc); n++;
          }
          const zb = Math.min(ZMAX, thBase(r)); bnd[i][0].position.y = yOf(r.hm); bnd[i][1].position.y = yOf(zb); bnd[i][0].visible = true; bnd[i][1].visible = r.Ts - r.Td >= 4;
          const mxH = Math.abs(yOf(r.hm)); mixH[i] = mxH;
        });
        slices.instanceMatrix.needsUpdate = true; slices.instanceColor.needsUpdate = true;
        const lo = REG[0]; LY.mix.obj = [XS[0] - 1.15, yOf(lo.hm / 2), 0]; LY.th.obj = [XS[0] - 1.15, yOf((lo.hm + thBase(lo)) / 2), 0]; LY.dp.obj = [XS[0] - 1.15, yOf(1500), 0];
        txt();
      }
      const mixH = [0, 0, 0, 0];
      function setZ(v) {
        z = v; const y = yOf(z); plane.position.set(0, y, 0);
        REG.forEach((r, i) => { vlab[i].obj = [XS[i], y, CW / 2]; vlab[i].set(mode === 'T' ? temp(r, z).toFixed(1) + ' °C' : doxy(r, z).toFixed(1) + ' mL/L'); });
        txt();
      }
      function txt() {
        info(mode === 'T' ? '<b>수온</b>: 혼합층은 수온이 일정하고, <b>수온 약층</b>에서 급히 내려가요.<br>고위도는 표층이 차가워 약층이 거의 없어요.' : '<b>용존 산소</b>: 표층은 대기와 광합성으로 많고, 깊은 곳에서 줄다가 극소가 나타나요.<br>찬 바다일수록 산소가 많이 녹아요.');
      }
      controls.segment('색', [{ value: 'T', label: '🌡️ 수온' }, { value: 'O', label: '🫧 용존 산소' }], mode, (v) => { mode = v; recolor(); setZ(z); });
      controls.range('수심', 0, 2000, 50, z, (v) => setZ(v), (v) => v + ' m');
      recolor(); setZ(z);
      const dm2 = new THREE.Object3D();
      return {
        update(dt, t) {
          mix.forEach((m, i) => { const h = mixH[i] || 0.3; for (let k = 0; k < NP; k++) { const a = k * 2.4 + t * (0.8 + (k % 3) * 0.3), rr = 0.55 * Math.sqrt((k + 1) / NP); dm2.position.set(XS[i] + Math.cos(a) * rr, -h * ((k * 0.37 + t * 0.12 * (1 + k % 2)) % 1) * 0.95 - 0.02, Math.sin(a) * rr); dm2.scale.setScalar(1); dm2.updateMatrix(); m.setMatrixAt(k, dm2.matrix); } m.instanceMatrix.needsUpdate = true; });
        },
        sync() {},
      };
    },
  });
})();
