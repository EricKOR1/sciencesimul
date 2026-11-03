/* m2-circulation · 3D 심장과 혈액의 순환
   네 개의 방(심방·심실)과 판막, 폐순환(심장→폐→심장)과 체순환(심장→온몸→심장)을 입체로 따라가 봐요.
   파란색 = 산소가 적은 혈액(정맥혈), 빨간색 = 산소가 많은 혈액(동맥혈). */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHN = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const BLUE = 0x4a78ff, RED = 0xff4a4a;

  window.SciSim3D.attach({
    title: '심장과 혈액 순환 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: PHN ? 9 : 7, theta: 0.15, phi: 1.4, min: 3.5, max: 24, target: [0, 0.2, 0] },
    autoRotate: 0,
    levels: [],                      // 1~4단계 미션은 2D 화면(이름표 · 카드 · 혈액 방울 끌기)에서 해요
    build(ctx) {
      const { THREE, root, label, info, controls, orbit } = ctx;
      const V3 = THREE.Vector3;
      const mat = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.55, metalness: 0.02 }, o || {}));
      const sm = () => window.__sim;

      /* ---------- 심장 (네 개의 방) ---------- */
      const heart = new THREE.Group(); root.add(heart);
      const walls = [], bloods = [];
      function chamber(name, pos, sc, blood, wallTh) {
        const g = new THREE.Group(); g.position.set(...pos);
        const inner = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 28), mat(blood, { emissive: blood, emissiveIntensity: 0.25, roughness: 0.3 }));
        inner.scale.set(...sc);
        const wall = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), mat(0xc4504a, { transparent: true, opacity: 0.5, roughness: 0.6, depthWrite: false }));
        wall.scale.set(sc[0] + wallTh, sc[1] + wallTh, sc[2] + wallTh); wall.renderOrder = 2;
        g.add(inner, wall); heart.add(g); walls.push(wall); bloods.push(inner); g.userData = { sc: new V3(...sc) };
        return g;
      }
      const RA = chamber('RA', [-0.9, 0.7, 0.15], [0.52, 0.62, 0.5], BLUE, 0.1);
      const RV = chamber('RV', [-0.55, -0.55, 0.3], [0.58, 0.9, 0.5], BLUE, 0.12);
      const LA = chamber('LA', [0.75, 0.75, -0.35], [0.5, 0.55, 0.5], RED, 0.1);
      const LV = chamber('LV', [0.45, -0.5, -0.05], [0.66, 1.1, 0.62], RED, 0.28);   // 벽이 가장 두꺼워요
      // 판막
      const valves = [[-0.8, 0.0, 0.2], [0.6, 0.1, -0.15], [-0.3, 0.45, 0.2], [0.8, 0.5, 0.0]].map((p, i) => {
        const v = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.045, 10, 24), mat(0xffd34d, { metalness: 0.5, roughness: 0.3, emissive: 0x6b4d00, emissiveIntensity: 0.4 })); v.position.set(...p); v.rotation.set(Math.PI / 2 + (i < 2 ? 0.3 : 0), 0, i < 2 ? 0.2 : 0); heart.add(v); return v;
      });

      /* ---------- 순환 경로 (닫힌 곡선 두 개) ---------- */
      // [x,y,z,색(0 파랑/1 빨강), 순환(0 폐순환/1 체순환)]  — 점이 시작하는 구간의 성질
      const A = [
        [-0.9, 0.7, 0.15, 0, 1], [-0.7, -0.1, 0.25, 0, 1], [-0.55, -0.7, 0.3, 0, 0], [-0.4, 0.2, 0.1, 0, 0], [-0.4, 1.2, -0.2, 0, 0],
        [-1.2, 1.9, -0.4, 0, 0], [-2.3, 2.1, -0.4, 0, 0], [-3.0, 1.7, -0.2, 1, 0], [-2.5, 1.1, -0.3, 1, 0], [-1.4, 0.9, -0.5, 1, 0],
        [0.75, 0.75, -0.35, 1, 1], [0.6, 0.0, -0.15, 1, 1], [0.45, -0.7, -0.05, 1, 1], [0.7, 0.6, 0.1, 1, 1], [0.95, 1.9, 0.3, 1, 1],
        [1.5, 2.5, 0.3, 1, 1], [1.95, 1.8, 0.2, 1, 1], [1.9, 0.0, 0.1, 1, 1], [1.5, -2.0, 0.1, 1, 1], [0.9, -3.3, 0, 0, 1],
        [0.0, -3.7, 0, 0, 1], [-0.8, -3.1, 0, 0, 1], [-1.1, -1.5, 0.1, 0, 1], [-1.05, -0.3, 0.12, 0, 1],
      ];
      const B = [
        [-0.9, 0.7, 0.15, 0, 1], [-0.7, -0.1, 0.25, 0, 1], [-0.55, -0.7, 0.3, 0, 0], [-0.3, 0.2, 0.1, 0, 0], [-0.1, 1.3, -0.25, 0, 0],
        [0.7, 2.0, -0.4, 0, 0], [2.3, 2.1, -0.4, 0, 0], [3.0, 1.7, -0.2, 1, 0], [2.5, 1.1, -0.3, 1, 0], [1.6, 0.9, -0.5, 1, 0],
        [0.75, 0.75, -0.35, 1, 1], [0.6, 0.0, -0.15, 1, 1], [0.45, -0.7, -0.05, 1, 1], [0.6, 0.7, 0.1, 1, 1], [0.7, 1.9, 0.25, 1, 1],
        [0.35, 2.8, 0.2, 1, 1], [0.0, 3.5, 0.15, 0, 1], [-0.7, 3.0, 0.1, 0, 1], [-1.1, 2.2, 0.1, 0, 1], [-1.1, 1.3, 0.12, 0, 1],
      ];
      function loopOf(pts) {
        const curve = new THREE.CatmullRomCurve3(pts.map((p) => new V3(p[0], p[1], p[2])), true, 'catmullrom', 0.5);
        const n = pts.length, groups = { 0: [], 1: [] };
        // 같은 색·순환이 이어지는 구간마다 관을 만들어요
        let i = 0, runs = [];
        while (i < n) { let j = i; while (j + 1 < n && pts[j + 1][3] === pts[i][3] && pts[j + 1][4] === pts[i][4]) j++; runs.push([i, j + 1, pts[i][3], pts[i][4]]); i = j + 1; }
        const mats = [];
        runs.forEach((r) => {
          const ps = []; const t0 = r[0] / n, t1 = r[1] / n, K = (r[1] - r[0]) * 12;
          for (let k = 0; k <= K; k++) ps.push(curve.getPoint(t0 + (t1 - t0) * k / K));
          const m = new THREE.MeshStandardMaterial({ color: r[2] ? RED : BLUE, roughness: 0.35, transparent: true, opacity: 0.55, depthWrite: false, emissive: r[2] ? RED : BLUE, emissiveIntensity: 0.25 });
          const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ps), K * 2, 0.11, 12, false), m); tube.renderOrder = 1; root.add(tube);
          groups[r[3]].push(m);
        });
        return { curve, pts, n, groups };
      }
      const loops = [loopOf(A), loopOf(B)];
      // 폐 · 온몸 (모세 혈관이 있는 곳)
      const pink = (c, o) => mat(c, Object.assign({ transparent: true, opacity: 0.4, roughness: 0.5, depthWrite: false }, o || {}));
      const lungL = new THREE.Mesh(new THREE.SphereGeometry(1, 36, 24), pink(0xf2a7b8)); lungL.scale.set(0.9, 1.4, 0.7); lungL.position.set(-3.0, 1.55, -0.25);
      const lungR = lungL.clone(); lungR.position.x = 3.0;
      const body = new THREE.Mesh(new THREE.SphereGeometry(1, 36, 24), pink(0xf6c9a8)); body.scale.set(1.9, 0.6, 0.8); body.position.set(0.0, -3.5, 0);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.55, 28, 20), pink(0xf6c9a8)); head.position.set(0.0, 3.5, 0.1);
      const far = new THREE.Group(); far.add(lungL, lungR, body, head); root.add(far);
      // 모세 혈관 느낌의 잔줄기
      function capill(p, rx, ry, col) {
        for (let i = 0; i < 6; i++) {
          const a = i / 6 * Math.PI * 2, pts = []; for (let k = 0; k <= 8; k++) { const u = k / 8; pts.push(new V3(p[0] + Math.cos(a + u * 2) * rx * (0.2 + 0.8 * u), p[1] + Math.sin(a * 2 + u * 3) * ry * (1 - u * 0.4), p[2] + Math.sin(a + u) * 0.3)); }
          far.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.025, 6, false), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.6 })));
        }
      }
      capill([-3.0, 1.55, -0.25], 0.7, 1.0, 0xd36b8a); capill([3.0, 1.55, -0.25], 0.7, 1.0, 0xd36b8a); capill([0, -3.5, 0], 1.5, 0.4, 0xd7885a); capill([0, 3.5, 0.1], 0.4, 0.4, 0xd7885a);

      // 흐르는 혈구 알갱이
      const NP = 38;
      const inst = new THREE.InstancedMesh(new THREE.SphereGeometry(0.075, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }), NP * 2);
      inst.frustumCulled = false; root.add(inst);
      const dm = new THREE.Object3D(), cb = new THREE.Color(BLUE), cr = new THREE.Color(RED);

      /* ---------- 이름표 ---------- */
      const L = {};
      const lab = (k, t, obj, off) => { L[k] = label(t, obj, { offset: off }); return L[k]; };
      lab('ra', '우심방', RA, [-0.1, 0.0, 0.75]); lab('rv', '우심실', RV, [-0.3, -0.3, 0.8]); lab('la', '좌심방', LA, [0.3, 0.2, -0.2]); lab('lv', '좌심실', LV, [0.6, -0.6, 0.7]);
      lab('aorta', '대동맥', [1.2, 2.4, 0.3]); lab('pa', '폐동맥', [-1.3, 1.9, -0.4]); lab('pv', '폐정맥', [1.5, 0.9, -0.5]); lab('vc', '대정맥', [-1.1, -1.6, 0.1]);
      lab('valve', '판막', valves[0], [-0.3, 0.3, 0.3]);
      lab('lung', '폐 (산소를 받아요)', lungL, [0, 1.6, 0.2]); lab('bodyL', '온몸 (산소를 내줘요)', body, [0, 0.9, 0.2]); lab('headL', '머리·팔', head, [0.2, 0.8, 0.2]);
      lab('pcirc', '폐순환', [-1.9, 2.55, -0.4]); lab('scirc', '체순환', [2.3, -1.2, 0.1]);
      let showL = true;
      const HEARTL = ['ra', 'rv', 'la', 'lv', 'aorta', 'pa', 'pv', 'vc', 'valve'], ALLL = ['lung', 'bodyL', 'headL', 'pcirc', 'scirc', 'aorta', 'pa', 'vc'];

      /* ---------- 조작 ---------- */
      let mode = 'heart', hl = 'all', rate = 0.8, cut = false, flowP = 0, pl = null, lastRate = -1, pushedAt = -9, now = 0;
      let tgt = { dist: PHN ? 17 : 12.5, ty: 0 }, T = 0, pulse = 0, sys = 0;
      const fmtRate = (v) => (v < 0.6 ? '🐢 천천히 보기' : '분당 ' + Math.round(v * 80) + '회');   // 2D 박동 속도와 같은 표시
      function applyMode() {
        tgt = mode === 'heart' ? { dist: PHN ? 9 : 6.8, ty: 0.15 } : { dist: PHN ? 21 : 14.5, ty: 0 };
        Object.keys(L).forEach((k) => L[k].show(showL && (mode === 'heart' ? HEARTL.includes(k) : ALLL.includes(k))));
        texts();
      }
      function texts() {
        const m = { all: '', pulm: '', sys: '' };
        if (mode === 'heart') info('심장은 <b>네 개의 방</b>으로 나뉘어요. 심방은 피를 받고, <b>심실</b>은 피를 내보내요. <b>판막</b>이 피가 거꾸로 흐르는 것을 막아요.<br>그림은 마주 본 모습이라 몸의 오른쪽이 화면의 왼쪽이에요.');
        else if (hl === 'pulm') info('<b>폐순환</b>: 우심실 → 폐동맥 → <b>폐</b> → 폐정맥 → 좌심방<br>폐에서 산소를 받아 <b style="color:#ff8f8f">동맥혈</b>(빨강)이 돼요.');
        else if (hl === 'sys') info('<b>체순환</b>: 좌심실 → 대동맥 → <b>온몸</b> → 대정맥 → 우심방<br>온몸에 산소를 주고 <b style="color:#8fb0ff">정맥혈</b>(파랑)이 돼요.');
        else info('혈액은 <b>폐순환</b>과 <b>체순환</b>, 두 길을 돌아요.<br><b style="color:#8fb0ff">파랑</b>: 산소가 적은 혈액 · <b style="color:#ff8f8f">빨강</b>: 산소가 많은 혈액');
      }
      const segM = controls.segment('보기', [{ label: '심장 확대', value: 'heart' }, { label: '순환 전체', value: 'all' }], mode, (v) => { mode = v; applyMode(); });
      controls.segment('강조', [{ label: '전체', value: 'all' }, { label: '폐순환', value: 'pulm' }, { label: '체순환', value: 'sys' }], hl, (v) => { hl = v; texts(); });
      const rateR = controls.range('심장 박동', 0.25, 1.6, 0.05, rate, (v) => {
        rate = v; lastRate = v; pushedAt = now;
        const i = document.getElementById('sRate'); if (i) { i.value = v; i.dispatchEvent(new Event('input')); }   // 2D 박동 속도도 같이 바뀌어요
      }, fmtRate);
      // ▶ 재생: 혈액 방울(크게 보이는 알갱이)이 폐순환 · 체순환을 따라 한 바퀴 돌아요
      pl = controls.player({
        duration: 14, loop: true, autoplay: true, label: '혈액 순환',
        phases: [[0, '우심방 → 우심실'], [0.08, '폐동맥 → 폐'], [0.3, '폐정맥 → 좌심방'], [0.42, '좌심방 → 좌심실'], [0.54, '대동맥 → 온몸'], [0.8, '대정맥 → 우심방']],
        onFrame(p) { flowP = p; },
      });
      controls.button('단면 보기', () => { cut = !cut; });
      controls.button('이름표', () => { showL = !showL; applyMode(); });
      applyMode();
      function syncScene() { const s = sm() && sm().S; if (!s) return; const m = s.scene === 'heart' || s.scene === 'vessel' || s.scene === 'blood' ? 'heart' : 'all'; if (m !== lastM) { lastM = m; mode = m; segM.set(m); applyMode(); } }
      let lastM = null, k0 = 0;
      const tv = new V3();
      return {
        sync() { lastM = null; syncScene(); },
        update(dt, t) {
          if ((k0++ % 15) === 0) syncScene();
          now = t;
          const H2 = sm() && sm().HT;                       // 2D의 박동 속도 · 멈춤을 그대로 따라가요
          if (H2 && typeof H2.rate === 'number' && now - pushedAt > 0.5 && Math.abs(H2.rate - lastRate) > 1e-6) { rate = H2.rate; lastRate = rate; rateR.set(rate); }
          if (!(H2 && H2.paused)) T += dt * rate * (80 / 60);
          const ph = T % 1;
          const atr = ph < 0.14 ? Math.sin(ph / 0.14 * Math.PI) : 0, vent = ph >= 0.14 && ph < 0.5 ? Math.sin((ph - 0.14) / 0.36 * Math.PI) : 0;
          sys = vent;
          [[RA, atr], [LA, atr], [RV, vent], [LV, vent]].forEach(([g, p]) => { const sc = g.userData.sc; g.scale.setScalar(1 - 0.16 * p); });
          heart.position.y = 0; heart.scale.setScalar(1 + 0.012 * vent);
          walls.forEach((w) => { w.material.opacity += ((cut ? 0.16 : 0.5) - w.material.opacity) * Math.min(1, dt * 5); });
          valves.forEach((v, i) => { v.scale.setScalar(i < 2 ? 1 - 0.5 * (vent > 0.3 ? 1 : 0) : 1 - 0.5 * (vent > 0.3 ? 0 : 1)); });
          // 카메라 이동
          const k = Math.min(1, dt * 3); if (Math.abs(orbit.dist - tgt.dist) > 0.02) orbit.dist += (tgt.dist - orbit.dist) * k; orbit.ty += (tgt.ty - orbit.ty) * k;
          far.visible = true;
          // 강조: 선택하지 않은 순환은 흐리게
          loops.forEach((lp) => { [0, 1].forEach((g) => { lp.groups[g].forEach((m) => { const on = hl === 'all' || (hl === 'pulm' ? g === 0 : g === 1); m.opacity += ((on ? 0.6 : 0.12) - m.opacity) * Math.min(1, dt * 6); }); }); });
          // 혈구
          let idx = 0;
          loops.forEach((lp, li) => {
            for (let i = 0; i < NP; i++) {
              const u = ((flowP + i / NP) % 1);
              const pos = lp.curve.getPoint(u); const ti = Math.floor(u * lp.n) % lp.n, p = lp.pts[ti];
              const on = hl === 'all' || (hl === 'pulm' ? p[4] === 0 : p[4] === 1);
              dm.position.copy(pos); dm.scale.setScalar(on ? (i === 0 ? 2.4 : 1) : 0.01); dm.updateMatrix(); inst.setMatrixAt(idx, dm.matrix);
              inst.setColorAt(idx, p[3] ? cr : cb); idx++;
            }
          });
          inst.instanceMatrix.needsUpdate = true; if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
        },
      };
    },
  });
})();
