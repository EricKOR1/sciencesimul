/* m3-energy-coaster · 3D 롤러코스터와 역학적 에너지 보존
   마찰이 없으면 위치 에너지와 운동 에너지의 합(역학적 에너지)이 늘 같아요. 처음 높이보다 높은 언덕은 넘을 수 없어요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHN = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const K = 0.46, G = 9.8;          // 1 m = 0.46 (그림 속 길이)
  window.SciSim3D.attach({
    host: '.stage-card',
    title: '롤러코스터 에너지 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: PHN ? 21 : 16, theta: 0.35, phi: 1.3, min: 7, max: 34, target: [0.3, 2.4, 0] },
    autoRotate: 0,
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const V3 = THREE.Vector3;
      let H = 10, h2 = 6, fric = false, run = false, u = 0.006, vs = 0, E0 = 0, track = null, curve = null, len = 1, ymax = 0;
      const sm = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.45, metalness: 0.3 }, o || {}));
      const gnd = new THREE.Mesh(new THREE.BoxGeometry(17, 0.3, 5), sm(0x3d6f3a, { roughness: 0.95, metalness: 0 })); gnd.position.set(0.3, -0.15, 0); root.add(gnd);
      const trackG = new THREE.Group(); root.add(trackG);
      const cart = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.34, 0.6), sm(0xef4444, { metalness: 0.2 })); body.position.y = 0.32; cart.add(body);
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.5), sm(0xfde68a, { roughness: 0.8, metalness: 0 })); seat.position.set(-0.1, 0.62, 0); cart.add(seat);
      [[-0.32, 0.3], [0.32, 0.3], [-0.32, -0.3], [0.32, -0.3]].forEach((q) => { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.08, 16), sm(0x1f2937)); w.rotation.x = Math.PI / 2; w.position.set(q[0], 0.14, q[1]); cart.add(w); });
      root.add(cart);
      /* 에너지 막대 */
      const bars = {}; const BX = 6.4;
      [['pe', 0x38bdf8, '위치 에너지', 0], ['ke', 0xf59e0b, '운동 에너지', 1.1], ['me', 0xa3e635, '역학적 에너지', 2.2]].forEach(([k, c, t, dx]) => {
        const m = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1, 0.7), sm(c, { roughness: 0.35, metalness: 0.05 })); m.position.set(BX + dx, 0, -1.4); root.add(m); bars[k] = m;
        label(t, [BX + dx, -0.45, -1.4 + 0.45], { size: 12, color: 'rgba(15,23,42,.88)' });
      });
      const base = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.08, 1.1), sm(0x64748b)); base.position.set(BX + 1.1, -0.04, -1.4); root.add(base);
      const topLine = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.02, 0.02), new THREE.MeshBasicMaterial({ color: 0xa3e635, transparent: true, opacity: 0.6 })); topLine.position.set(BX + 1.1, 0, -1.4); root.add(topLine);
      const hRef = new THREE.Mesh(new THREE.BoxGeometry(15.5, 0.012, 0.012), new THREE.MeshBasicMaterial({ color: 0xa3e635, transparent: true, opacity: 0.5 })); hRef.position.set(-0.3, 0, 1.6); root.add(hRef);
      const hLab = label('처음 높이', [-7.5, 0, 1.6], { size: 12, color: 'rgba(77,124,15,.92)' });
      const cLab = label('', cart, { size: 12, color: 'rgba(15,23,42,.9)', offset: [0, 1.4, 0] });
      function build() {
        while (trackG.children.length) trackG.remove(trackG.children[0]);
        const pts = [[-6.6, H], [-5.6, H - 0.35], [-4.4, H * 0.45], [-3.2, 0.5], [-2.2, 0.0], [-1.0, 0.3], [0.2, h2 * 0.6], [1.5, h2], [2.8, h2 * 0.55], [4.0, 0.2], [5.0, 0.0], [5.8, 0.6]].map((q) => new V3(q[0], q[1] * K + 0.02, 0));
        curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.5); len = curve.getLength();
        const NS = 240, mats = sm(0x94a3b8, { metalness: 0.7, roughness: 0.3 });
        [-0.27, 0.27].forEach((z) => { const cp = []; for (let i = 0; i <= NS; i++) { const p = curve.getPointAt(i / NS); cp.push(new V3(p.x, p.y, z)); } trackG.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(cp), NS, 0.045, 8, false), mats)); });
        const woodM = sm(0x8b5e34, { roughness: 0.9, metalness: 0 }), supM = sm(0x64748b, { roughness: 0.6 });
        for (let i = 0; i <= 90; i++) { const p = curve.getPointAt(i / 90), t = curve.getTangentAt(i / 90); const s = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.05, 0.7), woodM); s.position.copy(p); s.position.y -= 0.05; s.rotation.z = Math.atan2(t.y, t.x); trackG.add(s); }
        for (let i = 0; i <= 30; i++) { const p = curve.getPointAt(i / 30); if (p.y < 0.2) continue; const s = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, p.y - 0.08, 8), supM); s.position.set(p.x, (p.y - 0.08) / 2, -0.32); trackG.add(s); const s2 = s.clone(); s2.position.z = 0.32; trackG.add(s2); }
        hRef.position.y = (H) * K + 0.02; hLab.obj = [-7.4, H * K + 0.1, 1.6]; hLab.set('처음 높이 ' + H + ' m');
        reset();
      }
      function reset() { u = 0.004; vs = 0; run = false; pb.textContent = '▶ 출발'; E0 = G * ((curve.getPointAt(u).y - 0.02) / K); place(); }
      function place() {
        const p = curve.getPointAt(u), t = curve.getTangentAt(u);
        cart.position.copy(p); cart.rotation.z = Math.atan2(t.y, t.x);
        const y = (p.y - 0.02) / K, v = vs / K, pe = G * y, ke = 0.5 * v * v, me = pe + ke;
        const sc = 0.55 / Math.max(1, G * H / 1.0) * 1; // 막대 높이: 에너지(단위 질량당) → 길이
        const S = (H * K) / (G * H);               // 처음 위치 에너지가 처음 높이 선과 같도록
        bars.pe.scale.y = Math.max(0.001, pe * S); bars.pe.position.y = pe * S / 2;
        bars.ke.scale.y = Math.max(0.001, ke * S); bars.ke.position.y = ke * S / 2;
        bars.me.scale.y = Math.max(0.001, me * S); bars.me.position.y = me * S / 2;
        topLine.position.y = E0 * S; topLine.visible = true;
        cLab.set('높이 ' + y.toFixed(1) + ' m · 속력 ' + Math.abs(v).toFixed(1) + ' m/s');
        const blocked = !run && u > 0.006 && vs === 0;
        info('위치 에너지 + 운동 에너지 = <b>역학적 에너지</b><br>' + (fric ? '<span style="color:#fca5a5">마찰이 있어 역학적 에너지가 조금씩 줄어요.</span>' : '<span style="color:#bef264">마찰이 없으면 합이 처음 값과 늘 같아요.</span>') + '<br>' + (h2 > H ? '두 번째 언덕이 처음 높이보다 높아서 넘을 수 없어요.' : '낮은 곳에서 속력이 가장 빨라요.'));
      }
      const hr = controls.range('처음 높이', 4, 12, 1, H, (v) => { H = v; build(); }, (v) => v + ' m');
      controls.range('언덕 높이', 2, 12, 1, h2, (v) => { h2 = v; build(); }, (v) => v + ' m');
      const fb = controls.button('마찰 ✕', () => { fric = !fric; fb.textContent = '마찰 ' + (fric ? '✓' : '✕'); fb.classList.toggle('on', fric); });
      const pb = controls.button('▶ 출발', () => { if (run) { run = false; pb.textContent = '▶ 출발'; } else { if (vs === 0 && u > 0.01) reset(); run = true; pb.textContent = '❚❚ 멈춤'; } });
      build();
      return {
        update(dt, t) {
          if (run) {
            const n = 6, h = Math.min(dt, 0.05) / n;
            for (let i = 0; i < n; i++) {
              const t0 = curve.getTangentAt(u), s_ = vs; // 경사: dy/ds
              vs += -G * K * t0.y * h * 1; if (fric) vs *= 1 - 0.18 * h;
              u += vs * h / len; if (u < 0.003) { u = 0.003; vs = Math.abs(vs) * 0.0; vs = 0; } if (u > 0.997) { u = 0.997; vs = -Math.abs(vs) * 0.4; }
            }
            place();
          }
        },
      };
    },
  });
})();
