/* hp-motor-speaker · 3D 직류 전동기 (자기장 속 코일 · 변이 받는 힘의 짝힘 · 정류자와 솔)
   약속(2D 실험과 같아요): N극이 왼쪽, S극이 오른쪽 → B는 N→S, 즉 오른쪽(+x). 축은 앞(+z)쪽으로 나와 있고, 앞에서 보면 오른쪽 변의 전류가 안쪽(⊗)으로 흘러 힘이 아래로 → 시계 방향.
   F = I L × B : 전류 방향(±z)과 B(±x)에 모두 수직인 위/아래(±y). 두 변의 전류가 반대라 힘이 반대 → 코일을 돌리는 짝힘. 정류자가 반 바퀴마다 전류를 바꿔요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHN = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches), KD = PHN ? 1.45 : 1;
  const NC = 0xe2464b, SCOL = 0x2f6df6, COPPER = 0xe39a45;

  window.SciSim3D.attach({
    title: '전동기 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: 14 * KD, theta: 0.55, phi: 1.15, min: 6, max: 26, target: [0, -0.6, 0.4] },
    autoRotate: 0,
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const V3 = THREE.Vector3, Yax = new V3(0, 1, 0);
      const lessonS = () => (window.__sim) || null;
      const L2 = lessonS(); const V_SUP = (L2 && L2.V_SUP) || 24, R_COIL = (L2 && L2.R_COIL) || 1.5, K_M = (L2 && L2.K_M) || 0.5;
      const st = { on: true, pol: 1, mag: 1, comm: true, phi: 0.5, w: 0, I: 0, t: 0 };

      const mat = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.5, metalness: 0.15 }, o || {}));
      const basic = (c, o) => new THREE.MeshBasicMaterial(Object.assign({ color: c }, o || {}));
      function mkArrow(col, rad) {
        const g = new THREE.Group(); const m = mat(col, { roughness: 0.4 });
        const sh = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, 1, 10), m), hd = new THREE.Mesh(new THREE.ConeGeometry(rad * 2.6, rad * 6, 14), m);
        g.add(sh, hd); g.userData = { sh, hd, rad }; return g;
      }
      function setArrow(g, a, b) {
        const d = new V3().subVectors(b, a), len = d.length(); const { sh, hd, rad } = g.userData;
        if (len < 1e-3) { g.visible = false; return; }
        g.visible = true; const hl = Math.min(len * 0.5, rad * 6);
        sh.scale.y = Math.max(0.001, len - hl); sh.position.y = (len - hl) / 2; hd.scale.y = hl / (rad * 6); hd.position.y = len - hl / 2;
        g.position.copy(a); g.quaternion.setFromUnitVectors(Yax, d.normalize());
      }
      function rod(a, b, r, m) { // 두 점을 잇는 막대
        const d = new V3().subVectors(b, a); const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, d.length(), 10), m);
        mesh.position.copy(a).add(b).multiplyScalar(0.5); mesh.quaternion.setFromUnitVectors(Yax, d.normalize()); return mesh;
      }
      const W = 1.15, LEN = 2.8, ZF = LEN / 2, ZC = ZF + 0.55;        // 코일 반폭 · 변 길이 · 앞끝 · 정류자 위치
      const cuMat = mat(COPPER, { metalness: 0.4, roughness: 0.4 });

      /* ---------- 자석 (N 왼쪽 / S 오른쪽) ---------- */
      const magL = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.6, 2.8), mat(NC)), magR = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.6, 2.8), mat(SCOL));
      magL.position.x = -3.0; magR.position.x = 3.0; root.add(magL, magR);
      const labL = label('N극', magL, { color: '#e2464b', size: 15, offset: [0, 1.7, 0] }), labR = label('S극', magR, { color: '#2f6df6', size: 15, offset: [0, 1.7, 0] });
      const bArrows = [];
      [-1, 0, 1].forEach((y) => [-1.95, 1.95].forEach((z) => { const a = mkArrow(0xb79bff, 0.03); root.add(a); bArrows.push([a, y * 0.85, z]); }));
      const labB = label('자기장 B', [0, 1.85, 1.95], { color: '#6d28d9', size: 13 });
      const gapN = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.01, 0.01), basic(0xffffff)); void gapN;

      /* ---------- 회전하는 코일 + 정류자 ---------- */
      const spin = new THREE.Group(); root.add(spin);
      const sideA = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, LEN, 14), cuMat), sideB = sideA.clone();
      sideA.rotation.x = sideB.rotation.x = Math.PI / 2; sideA.position.set(W, 0, 0); sideB.position.set(-W, 0, 0); spin.add(sideA, sideB);
      spin.add(rod(new V3(-W, 0, -ZF), new V3(W, 0, -ZF), 0.07, cuMat));                       // 뒤쪽 연결
      spin.add(rod(new V3(W, 0, ZF), new V3(0.28, 0.28, ZF), 0.07, cuMat), rod(new V3(-W, 0, ZF), new V3(-0.28, -0.28, ZF), 0.07, cuMat));
      spin.add(rod(new V3(0.28, 0.28, ZF), new V3(0.28, 0.28, ZC), 0.06, cuMat), rod(new V3(-0.28, -0.28, ZF), new V3(-0.28, -0.28, ZC + 0.4), 0.06, cuMat));
      const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, LEN + 2.4, 12), mat(0x9aa3b2, { metalness: 0.6 })); axle.rotation.x = Math.PI / 2; axle.position.z = 0.25; spin.add(axle);
      // 정류자 반원 두 개 (갈라진 틈이 코일 면과 나란해요): H1(+y쪽, A와 연결, 붉은색) / H2(−y쪽, B와 연결, 파란색)
      function half(a0, col) { const g = new THREE.CylinderGeometry(0.5, 0.5, 0.5, 20, 1, false, 0, Math.PI); const m = new THREE.Mesh(g, mat(col, { metalness: 0.5 })); m.rotation.set(Math.PI / 2, 0, 0); const h = new THREE.Group(); h.add(m); h.rotation.z = a0; h.position.z = ZC; return h; }
      // CylinderGeometry의 thetaStart=0 은 +z 방향에서 시작 → x축 둘레 회전 후 xy 평면의 +x에서 y>0 쪽 반원이 되도록 맞춰요
      const cyl1 = new THREE.CylinderGeometry(0.5, 0.5, 0.5, 24, 1, false, Math.PI / 2, Math.PI), cyl2 = new THREE.CylinderGeometry(0.5, 0.5, 0.5, 24, 1, false, Math.PI * 1.5, Math.PI);
      const H1 = new THREE.Mesh(cyl1, mat(0xc0392b, { metalness: 0.5 })), H2 = new THREE.Mesh(cyl2, mat(0x2b5fd9, { metalness: 0.5 })); void half;
      [H1, H2].forEach((h) => { h.rotation.x = Math.PI / 2; h.position.z = ZC; spin.add(h); });
      // 정류자가 없을 때: 고리 두 개(슬립링) – 변 A는 항상 위쪽 솔, 변 B는 항상 아래쪽 솔과 이어져요
      const ringA = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.3, 24), mat(0xc0392b, { metalness: 0.5 })), ringB = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.3, 24), mat(0x2b5fd9, { metalness: 0.5 }));
      ringA.rotation.x = ringB.rotation.x = Math.PI / 2; ringA.position.z = ZC; ringB.position.z = ZC + 0.4; spin.add(ringA, ringB); ringA.visible = ringB.visible = false;

      /* ---------- 솔(고정) · 전원 ---------- */
      const brushT = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.45, 0.5), mat(0x374151)), brushB = brushT.clone();
      brushT.position.set(0, 0.72, ZC); brushB.position.set(0, -0.72, ZC); root.add(brushT, brushB);
      const batt = new THREE.Group(); const bBody = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.6, 0.6), mat(0x374151));
      const bR = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.62, 0.62), mat(0xe2464b)), bL = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.62, 0.62), mat(0x2f6df6)); bR.position.x = 0.65; bL.position.x = -0.65;
      batt.add(bBody, bR, bL); batt.position.set(0, -3.3, ZC + 0.4); root.add(batt);
      const wMat = mat(0xb7791f, { metalness: 0.3 });
      const wp1 = [new V3(0, 0.95, ZC), new V3(1.6, 0.95, ZC), new V3(1.6, -3.3, ZC + 0.4), new V3(0.9, -3.3, ZC + 0.4)];
      const wp2 = [new V3(0, -0.95, ZC), new V3(-1.6, -0.95, ZC), new V3(-1.6, -3.3, ZC + 0.4), new V3(-0.9, -3.3, ZC + 0.4)];
      [wp1, wp2].forEach((pp) => { for (let i = 0; i < pp.length - 1; i++) root.add(rod(pp[i], pp[i + 1], 0.035, wMat)); });
      const labPlus = label('+', batt, { color: '#e2464b', offset: [0.65, 0.6, 0], size: 14 }), labMinus = label('−', batt, { color: '#2f6df6', offset: [-0.65, 0.6, 0], size: 14 });
      const labBrush = label('솔(고정)', brushT, { color: 'rgba(55,65,81,.92)', size: 12, offset: [0.9, 0.25, 0] });
      const labComm = label('정류자', H1, { color: 'rgba(55,65,81,.92)', size: 12, offset: [-0.2, -1.05, 0] });

      /* ---------- 전류 · 힘 화살표 ---------- */
      const fA = mkArrow(0xf26b3a, 0.07), fB = mkArrow(0xf26b3a, 0.07); root.add(fA, fB);
      const tipA = new THREE.Object3D(), tipB = new THREE.Object3D(); root.add(tipA, tipB);
      const labFA = label('F', tipA, { color: '#f26b3a', size: 14, offset: [0, 0.0, 0] }), labFB = label('F', tipB, { color: '#f26b3a', size: 14, offset: [0, 0, 0] });
      const cones = []; for (let i = 0; i < 14; i++) { const c = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.36, 10), basic(0xffe14d)); root.add(c); cones.push(c); }
      // 코일 변 위의 전류 방향 기호 (⊗ / ⊙)
      const torqueBar = { n: 0 };

      /* ---------- 조작 ---------- */
      const bar = ctx.renderer.domElement.parentNode.parentNode.querySelector('.v3-ctl');
      const onB = controls.button('⏻ 전원 끄기', () => { st.on = !st.on; refresh(); });
      controls.button('🔁 전원 극 바꾸기', () => { st.pol = -st.pol; refresh(); });
      controls.button('🔁 자석 극 바꾸기', () => { st.mag = -st.mag; refresh(); });
      const cmB = controls.button('정류자 ✓', () => { st.comm = !st.comm; cmB.classList.toggle('on', st.comm); cmB.textContent = '정류자 ' + (st.comm ? '✓' : '✕'); setComm(); refresh(); });
      cmB.classList.add('on'); void bar;
      function refresh() {
        onB.textContent = st.on ? '⏻ 전원 끄기' : '⏻ 전원 켜기'; onB.classList.toggle('on', !st.on);
        magL.material.color.setHex(st.mag > 0 ? NC : SCOL); magR.material.color.setHex(st.mag > 0 ? SCOL : NC);
        labL.set(st.mag > 0 ? 'N극' : 'S극'); labR.set(st.mag > 0 ? 'S극' : 'N극');
        labL.el.style.background = st.mag > 0 ? '#e2464b' : '#2f6df6'; labR.el.style.background = st.mag > 0 ? '#2f6df6' : '#e2464b';
        bR.material.color.setHex(st.pol > 0 ? 0xe2464b : 0x2f6df6); bL.material.color.setHex(st.pol > 0 ? 0x2f6df6 : 0xe2464b);
        labPlus.set(st.pol > 0 ? '+' : '−'); labMinus.set(st.pol > 0 ? '−' : '+');
        labPlus.el.style.background = st.pol > 0 ? '#e2464b' : '#2f6df6'; labMinus.el.style.background = st.pol > 0 ? '#2f6df6' : '#e2464b';
        bArrows.forEach((x) => { const [a, y, z] = x; const d = st.mag; setArrow(a, new V3(-2.1 * d, y, z), new V3(2.1 * d, y, z)); a.children.forEach((c) => { c.material = mat(0xb79bff, { transparent: true, opacity: 0.55 }); }); });
      }
      refresh();
      function setComm() {
        H1.visible = H2.visible = st.comm; ringA.visible = ringB.visible = !st.comm;
        brushB.position.z = st.comm ? ZC : ZC + 0.4; labComm.set(st.comm ? '정류자(반원 두 개)' : '고리(전류 방향 그대로)');
      }
      setComm();

      const tmp = new V3(), pa = new V3(), pb = new V3();
      let lastTxt = '';
      return {
        update(dt) {
          dt = Math.min(dt, 0.05); st.t += dt;
          const s = st.pol * st.mag, cs = Math.cos(st.phi);
          // 전류 (유도 기전력 때문에 빨리 돌수록 줄어요: I = (V − Kω)/R, 화면은 1/8로 느리게)
          const wReal = Math.abs(st.w) * 8;
          st.I = st.on ? Math.max(0, (V_SUP - K_M * wReal) / R_COIL) : 0;
          const In = st.I / 16;
          const g = st.comm ? Math.abs(cs) : cs;                                // 정류자가 있으면 항상 같은 방향, 없으면 반 바퀴 뒤엔 반대
          const tau = -s * 24 * In * g;                                         // + 는 시계 반대 방향 (앞에서 볼 때)
          st.w += (tau - 1.6 * st.w - (st.comm ? 0 : 0.0)) * dt; st.phi += st.w * dt;
          spin.rotation.z = st.phi;
          // 변 위치 (월드): A는 코일의 +x 쪽 변
          pa.set(W * Math.cos(st.phi), W * Math.sin(st.phi), 0); pb.set(-pa.x, -pa.y, 0);
          // 전류: 정류자가 있으면 '오른쪽(월드 x>0)에 있는 변'은 항상 안쪽(−z), 없으면 A는 항상 −z
          const aOnRight = cs >= 0;
          const iA = st.comm ? (aOnRight ? -1 : 1) * st.pol : -1 * st.pol;      // A의 전류 방향(z 성분 부호)
          const iB = -iA;
          const live = st.I > 0.2;
          // 힘 F = I L × B,  B = (st.mag, 0, 0) :  (iz ẑ) × (b x̂) = iz b ŷ
          const fy = (iz) => iz * st.mag;
          const fl = live ? 0.8 + 1.0 * Math.min(1, st.I / 12) : 0;
          if (live) { setArrow(fA, pa.clone(), pa.clone().add(new V3(0, fy(iA) * fl, 0))); setArrow(fB, pb.clone(), pb.clone().add(new V3(0, fy(iB) * fl, 0))); } else { fA.visible = fB.visible = false; }
          tipA.position.copy(pa).add(new V3(0, fy(iA) * (fl + 0.35), 0)); tipB.position.copy(pb).add(new V3(0, fy(iB) * (fl + 0.35), 0));
          labFA.show(live); labFB.show(live);
          // 전류 화살촉: 변 A, 뒤 연결, 변 B 를 따라 흐르는 노란 알갱이 (A → 뒤 → B 방향이 iA 의 부호와 같은 쪽)
          cones.forEach((c, i) => {
            c.visible = live;
            if (!live) return;
            const u = ((st.t * 0.35 * (0.3 + st.I / 14) + i / cones.length) % 1) * 3;
            // 경로: 앞끝(+z)에서 뒤끝(−z)으로 가는 변 → 뒤 연결 → 돌아오는 변. iA = −1 이면 A가 '앞→뒤'
            const downSide = iA < 0 ? pa : pb, upSide = iA < 0 ? pb : pa;
            if (u < 1) { tmp.set(downSide.x, downSide.y, ZF - u * LEN); c.position.copy(tmp); c.quaternion.setFromUnitVectors(Yax, new V3(0, 0, -1)); }
            else if (u < 2) { const k = u - 1; c.position.set(downSide.x * (1 - 2 * k), downSide.y * (1 - 2 * k), -ZF); c.quaternion.setFromUnitVectors(Yax, new V3(upSide.x - downSide.x, upSide.y - downSide.y, 0).normalize()); }
            else { const k = u - 2; c.position.set(upSide.x, upSide.y, -ZF + k * LEN); c.quaternion.setFromUnitVectors(Yax, new V3(0, 0, 1)); }
          });
          // 설명 (바뀔 때만)
          const rot = Math.abs(st.w) < 0.15 ? '멈춰 있어요' : st.w < 0 ? '앞에서 볼 때 시계 방향 ↻' : '앞에서 볼 때 시계 반대 방향 ↺';
          const near = Math.abs(cs) < 0.18;
          const ph = !st.on ? '전원이 꺼져 전류가 없으니 힘도 없어요.' : near ? (st.comm ? '코일 면이 B에 <b>수직</b>이라 짝힘의 회전 효과가 0 → 관성으로 지나가는 순간, <b>정류자</b>가 솔을 바꿔 전류 방향을 뒤집어요.' : '코일 면이 B에 <b>수직</b>이면 두 힘이 같은 직선 위에서 코일을 늘이기만 해요 → 회전 효과 0 (평형).') : Math.abs(cs) > 0.85 ? '코일 면이 B와 <b>나란해서</b> 짝힘의 회전 효과가 가장 커요.' : '두 변이 받는 <b>반대 방향의 힘</b>이 코일을 돌려요.';
          const txt = '<b>직류 전동기</b> · ' + rot + '<br>전류 <b>' + st.I.toFixed(1) + ' A</b> · 두 변의 전류는 반대 방향이라 힘 F = BIL 도 위·아래로 반대 (짝힘).<br>' + ph + (st.comm ? '' : '<br><span style="color:#ffd34d">정류자가 없으면</span> 반 바퀴 뒤에는 힘이 코일을 되돌려 놓아 흔들리다 멈춰요.');
          if (txt !== lastTxt) { lastTxt = txt; info(txt); }
          torqueBar.n = g;
        },
        sync() { /* 2D 차시와 독립적으로 동작 (전원 상태만 따로 관리) */ },
      };
    },
  });
})();
