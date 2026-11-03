/* hm-air-column · 3D 관 속의 정상파와 소리의 속력
   2D 실험(window.__sim)의 장면을 그대로 입체로 보여 줘요: 〓 관 속 정상파(열린 끝 · 닫힌 끝) · 🔔 공명 실험(소리굽쇠 · 공기 기둥) · 📏 음속 측정.
   열린 끝은 변위의 배, 닫힌 끝은 변위의 마디예요. 관의 종류 · 배음 · 공기 기둥 길이 · 소리굽쇠는 옆 조작판이 정하고 3D는 따라가요.
   (🎷 관악기 · 병 불기는 2D 화면에서 해요) */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHN = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches), KD = PHN ? 1.3 : 1;
  const LV = () => (typeof window.SciSimLevel === 'number' ? window.SciSimLevel : 0);
  const TAU = Math.PI * 2, clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  function tools(THREE) {
    const V3 = THREE.Vector3, Y = new V3(0, 1, 0);
    const M = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.5, metalness: 0.1 }, o || {}));
    const glass = (c, op) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.2, metalness: 0, transparent: true, opacity: op == null ? 0.25 : op, depthWrite: false });
    function mkArrow(col, rad) {
      const g = new THREE.Group(), m = M(col, { roughness: 0.4 });
      const sh = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, 1, 12), m), hd = new THREE.Mesh(new THREE.ConeGeometry(rad * 2.6, rad * 6, 16), m);
      g.add(sh, hd); g.userData = { sh, hd, rad }; return g;
    }
    function setArrow(g, a, b) {
      const d = new V3().subVectors(b, a), len = d.length(), { sh, hd, rad } = g.userData;
      if (len < 1e-3) { g.visible = false; return; }
      g.visible = true; const hl = Math.min(len * 0.5, rad * 6);
      sh.scale.y = Math.max(0.001, len - hl); sh.position.y = (len - hl) / 2;
      hd.scale.y = hl / (rad * 6); hd.position.y = len - hl / 2;
      g.position.copy(a); g.quaternion.setFromUnitVectors(Y, d.normalize());
    }
    function tube(pts, r, col, o, closed) {
      const c = new THREE.CatmullRomCurve3(pts, !!closed);
      return new THREE.Mesh(new THREE.TubeGeometry(c, Math.max(24, pts.length * 3), r, 8, !!closed), (o && o.basic) ? new THREE.MeshBasicMaterial({ color: col, transparent: !!o.op, opacity: o.op || 1 }) : M(col, o));
    }
    function disc(r, col, y, op) { const m = new THREE.Mesh(new THREE.CircleGeometry(r, 64), new THREE.MeshStandardMaterial({ color: col, roughness: 0.9, transparent: op != null, opacity: op == null ? 1 : op })); m.rotation.x = -Math.PI / 2; m.position.y = y || 0; m.receiveShadow = true; return m; }
    function grid(w, d, step, col, y, op) {
      const pts = []; for (let x = -w / 2; x <= w / 2 + 1e-6; x += step) pts.push(x, 0, -d / 2, x, 0, d / 2); for (let z = -d / 2; z <= d / 2 + 1e-6; z += step) pts.push(-w / 2, 0, z, w / 2, 0, z);
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
      const l = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: op == null ? 0.3 : op })); l.position.y = y || 0; return l;
    }
    function arc(r, a0, a1, rad, col, n) { // xz 평면 위의 호
      const pts = []; n = n || 40; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; pts.push(new V3(r * Math.cos(a), 0, r * Math.sin(a))); }
      return tube(pts, rad, col);
    }
    return { V3, Y, M, glass, mkArrow, setArrow, tube, disc, grid, arc };
  }
  window.SciSim3D.attach({
    title: '관 속 정상파 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: 11 * KD, theta: 0.5, phi: 1.15, min: 4, max: 26 },
    autoRotate: 0.15,
    levels: [0, 1],
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const { V3, M, glass } = tools(THREE);
      const st = { type: 'open', n: 1, t: 0, L: 1, sp: true, mode: 'tube', amp: 0.55 };
      const LEN = 8, R = 0.8, NS = 56, NR = 7;
      const tubeM = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.12, R + 0.12, LEN, 40, 1, true), new THREE.MeshStandardMaterial({ color: 0x9ec5ff, roughness: 0.1, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false }));
      tubeM.rotation.z = Math.PI / 2; root.add(tubeM);
      const wall = new THREE.Mesh(new THREE.CircleGeometry(R + 0.12, 40), M(0x94a3b8, { side: THREE.DoubleSide, metalness: 0.4 })); wall.rotation.y = Math.PI / 2; root.add(wall);
      const ringsG = new THREE.Group(); root.add(ringsG);
      [-LEN / 2, LEN / 2].forEach((x) => { const r = new THREE.Mesh(new THREE.TorusGeometry(R + 0.12, 0.05, 10, 40), M(0xdbeafe, { roughness: 0.3 })); r.rotation.y = Math.PI / 2; r.position.x = x; ringsG.add(r); });
      const cnt = NS * NR, parts = new THREE.InstancedMesh(new THREE.SphereGeometry(0.075, 10, 8), M(0xffffff, { roughness: 0.4 }), cnt);
      parts.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(cnt * 3), 3); root.add(parts);
      const base = []; for (let i = 0; i < NS; i++) { const x = -LEN / 2 + LEN * (i + 0.5) / NS; for (let j = 0; j < NR; j++) { const r = j === 0 ? 0 : R * 0.8, a = j * TAU / 6; base.push([x, r * Math.cos(a), r * Math.sin(a)]); } }
      const spk = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.6, 24, 1, true), M(0x334155, { side: THREE.DoubleSide })); spk.rotation.z = -Math.PI / 2; spk.position.x = -LEN / 2 - 0.9; root.add(spk);
      const fork = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), M(0x64748b)); fork.position.x = -LEN / 2 - 1.3; root.add(fork);
      // 마디·배 표지
      const marks = []; for (let i = 0; i < 10; i++) { const mk = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffffff })); root.add(mk); marks.push(mk); }
      const lN = label('변위의 마디', marks[0], { color: '#dc2626', size: 12, offset: [0, 1.05, 0] }), lA = label('변위의 배', marks[0], { color: '#15803d', size: 12, offset: [0, 1.05, 0] });
      const lO1 = label('열린 끝', [-LEN / 2, -1.25, 0], { color: '#475569', size: 12 }), lO2 = label('열린 끝', [LEN / 2, -1.25, 0], { color: '#475569', size: 12 }), lC = label('닫힌 끝', [LEN / 2, -1.25, 0], { color: '#475569', size: 12 });
      const colA = new THREE.Color(0x3b82f6), colB = new THREE.Color(0xf8fafc), colC = new THREE.Color(0xef4444), tmpC = new THREE.Color();
      const m4 = new THREE.Matrix4();
      const kk = () => (st.type === 'open' ? st.n * Math.PI / LEN : st.n * Math.PI / (2 * LEN));
      const lam = () => (st.type === 'open' ? 2 * LEN / st.n : 4 * LEN / st.n);
      function disp(x, t) { // x in [-LEN/2, LEN/2] -> 관 왼쪽 끝에서 xx
        const xx = x + LEN / 2, k = kk();
        return st.type === 'open' ? Math.cos(k * xx) * Math.cos(t) : Math.cos(k * xx) * Math.cos(t); // 열린 관: 양 끝 배, 닫힌 관: 오른쪽 끝(마디) cos(nπ/2)=0 (n 홀수)
      }
      function setup() {
        wall.visible = st.type === 'closed'; wall.position.x = LEN / 2 + 0.05; ringsG.children[1].visible = st.type === 'open';
        lO2.show(st.type === 'open'); lC.show(st.type === 'closed'); 
        const k = kk(); let c = 0;
        const nodes = [], ants = [];
        for (let i = 0; i <= 10; i++) { const xx = i * Math.PI / k / 2 * 1; /* 마디/배: cos(kx)=0 -> kx=π/2+mπ ; 배: kx=mπ */ }
        for (let m = 0; m < 12; m++) { const xn = (Math.PI / 2 + m * Math.PI) / k, xa = m * Math.PI / k; if (xn <= LEN + 1e-6) nodes.push(xn); if (xa <= LEN + 1e-6) ants.push(xa); }
        marks.forEach((mk, i) => { mk.visible = false; });
        nodes.forEach((x) => { if (c < 10) { const mk = marks[c++]; mk.visible = st.sp; mk.material.color.setHex(0xef4444); mk.position.set(x - LEN / 2, -R - 0.35, 0); mk.userData.t = 'n'; } });
        ants.forEach((x) => { if (c < 10) { const mk = marks[c++]; mk.visible = st.sp; mk.material.color.setHex(0x22c55e); mk.position.set(x - LEN / 2, -R - 0.35, 0); mk.userData.t = 'a'; } });
        const nm = marks.find((q) => q.visible && q.userData.t === 'n'), am = marks.find((q) => q.visible && q.userData.t === 'a');
        lN.obj = nm || [0, -9, 0]; lA.obj = am || [0, -9, 0]; lN.off = lA.off = [0, -0.45, 0]; lN.show(!!nm && st.sp); lA.show(!!am && st.sp);
        const lamv = lam();
        if (st.mode === 'tube') info('<b>' + (st.type === 'open' ? '양쪽이 열린 관' : '한쪽이 닫힌 관') + ' · ' + st.n + '번째 정상파</b><br>λ = ' + (st.type === 'open' ? '2L/' + st.n : '4L/' + st.n) + ' = L의 ' + (lamv / LEN).toFixed(2) + '배<br>v = f·λ : 같은 관에서 파장이 짧을수록 진동수가 커요.');
      }
      let lastInfo = '';
      setup();
      return {
        update(dt) {
          const A = ctx.lesson(); if (!A || !A.S) return; const S = A.S;
          const isTube = S.mode === 'tube', isRes = S.mode === 'res' || S.mode === 'meas', other = !isTube && !isRes;
          parts.visible = tubeM.visible = spk.visible = fork.visible = !other; if (other) { marks.forEach((m) => (m.visible = false)); [lN, lA, lO1, lO2, lC].forEach((l) => l.show(false)); info('🎷 관악기(구멍 열기 · 배음 구성)와 병 불기는 2D 화면에서 해요. 위의 [▦ 2D]를 눌러 보세요.'); return; }
          let ty, nn, amp = 0.55;
          if (isTube) { ty = S.tb.type; nn = S.tb.n; } else {
            const r = S.mode === 'res' ? S.rs : S.ms, Lcm = S.mode === 'res' ? S.rs.L : (S.ms.run ? S.ms.run.L || 0 : 0), lam = A.lamOf(r.f, r.t) * 100; ty = 'closed';
            const ratio = (Lcm + A.E_CM) / (lam / 4); nn = Math.max(1, Math.round((ratio + 1) / 2) * 2 - 1); amp = 0.55 * (S.mode === 'res' ? A.loud(Lcm, r.f, r.t) : 1);
            const key = 'r' + nn + '|' + Math.round(Lcm) + '|' + r.f + '|' + r.t; if (key !== lastInfo) { lastInfo = key; info(S.mode === 'res' ? '<b>🔔 공명 실험</b> · 소리굽쇠 ' + r.f + ' Hz · 기온 ' + r.t + ' °C · 공기 기둥 길이 L = <b>' + Math.round(Lcm) + ' cm</b><br>소리의 세기 ' + Math.round(100 * A.loud(Lcm, r.f, r.t)) + ' % → ' + (A.loud(Lcm, r.f, r.t) > 0.9 ? '<b>공명! 소리가 가장 커요</b> (닫힌 끝은 마디, 열린 끝 쪽은 배)' : 'L을 바꿔 소리가 가장 커지는 위치를 찾아요.') + '<br>공명할 때 공기 기둥의 진동과 소리굽쇠의 진동수가 같아져 정상파가 생겨요.' : '<b>📏 음속 측정</b> · 소리굽쇠 ' + r.f + ' Hz · 기온 ' + r.t + ' °C<br>이웃한 공명 위치의 차 ΔL = λ/2 이므로 λ = 2ΔL, 소리의 속력 v = fλ 로 구해요 (측정은 2D 화면에서 해요).'); }
          }
          st.amp = amp;
          if (st.type !== ty || st.n !== nn) { st.type = ty; st.n = nn; setup(); }
          const k = kk();
          for (let i = 0; i < NS; i++) {
            const x0 = base[i * NR][0], s = disp(x0, st.t) * amp, ds = -k * Math.sin(k * (x0 + LEN / 2)) * Math.cos(st.t); // 밀도 ~ -∂s/∂x
            const dens = -(-k * Math.sin(k * (x0 + LEN / 2))) * Math.cos(st.t) * 0 + (k * Math.sin(k * (x0 + LEN / 2)) * Math.cos(st.t)); // ∂s/∂x 의 부호 반전 = 밀한 정도
            const d = clamp(dens / k * 1.0, -1, 1);
            tmpC.copy(colB); if (d > 0) tmpC.lerp(colC, d); else tmpC.lerp(colA, -d);
            for (let j = 0; j < NR; j++) { const b = base[i * NR + j]; m4.makeTranslation(b[0] + s, b[1], b[2]); parts.setMatrixAt(i * NR + j, m4); parts.setColorAt(i * NR + j, tmpC); }
          }
          parts.instanceMatrix.needsUpdate = true; parts.instanceColor.needsUpdate = true;
          spk.position.x = -LEN / 2 - 0.9 + 0.06 * Math.cos(st.t); fork.position.x = spk.position.x - 0.45;
        },
        sync() {},
      };
    },
  });
})();
