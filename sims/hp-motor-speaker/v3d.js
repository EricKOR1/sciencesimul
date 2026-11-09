/* hp-motor-speaker · 3D 자기장 속 전류 · 전동기 · 스피커
   2D 실험(window.__sim)의 장면을 그대로 입체로 보여 줘요: ⚡ 자기장 속 도선이 받는 힘 F = BIL · ⚙️ 직류 전동기(코일 · 정류자 · 전력) · 🔊 스피커의 원리(보이스 코일 · 진동판).
   값(B · I · L · 부하 · 진폭 · 진동수)은 옆 조작판이 정하고 3D는 따라가요. 🛠️ 스피커 설계는 내가 고른 값으로 만든 스피커 단면과 주파수 시험을 입체로 보여 주고, 시험 곡선 그래프는 2D에서 봐요.
   전동기 약속: N극이 왼쪽, S극이 오른쪽 → B는 N→S(+x). 앞에서 보면 오른쪽 변의 전류가 안쪽(⊗), 왼쪽 변이 바깥쪽(⊙)이에요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHN = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches), KD = PHN ? 1.45 : 1;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x)), TAU = Math.PI * 2;
  const f1 = (v) => (Math.round(v * 10) / 10).toFixed(1), f2 = (v) => (Math.round(v * 100) / 100).toFixed(2);
  const NC = 0xe2464b, SCOL = 0x2f6df6, COPPER = 0xe39a45;

  window.SciSim3D.attach({
    title: '전동기와 스피커 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대 · 값은 옆 조작판에서 바꿔요',
    levels: [0, 1, 2],   // 4단계(설계)는 캔버스의 시험 곡선 그래프를 읽어야 해서 2D
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

      const motorG = new THREE.Group(); root.add(motorG);
      /* ---------- 자석 (N 왼쪽 / S 오른쪽) ---------- */
      const magL = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.6, 2.8), mat(NC)), magR = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.6, 2.8), mat(SCOL));
      magL.position.x = -3.0; magR.position.x = 3.0; motorG.add(magL, magR);
      const labL = label('N극', magL, { color: '#e2464b', size: 15, offset: [0, 1.7, 0] }), labR = label('S극', magR, { color: '#2f6df6', size: 15, offset: [0, 1.7, 0] });
      const bArrows = [];
      [-1, 0, 1].forEach((y) => [-1.95, 1.95].forEach((z) => { const a = mkArrow(0xb79bff, 0.03); motorG.add(a); bArrows.push([a, y * 0.85, z]); }));
      const labB = label('자기장 B', [0, 1.85, 1.95], { color: '#6d28d9', size: 13 });
      const gapN = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.01, 0.01), basic(0xffffff)); void gapN;

      /* ---------- 회전하는 코일 + 정류자 ---------- */
      const spin = new THREE.Group(); motorG.add(spin);
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
      brushT.position.set(0, 0.72, ZC); brushB.position.set(0, -0.72, ZC); motorG.add(brushT, brushB);
      const batt = new THREE.Group(); const bBody = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.6, 0.6), mat(0x374151));
      const bR = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.62, 0.62), mat(0xe2464b)), bL = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.62, 0.62), mat(0x2f6df6)); bR.position.x = 0.65; bL.position.x = -0.65;
      batt.add(bBody, bR, bL); batt.position.set(0, -3.3, ZC + 0.4); motorG.add(batt);
      const wMat = mat(0xb7791f, { metalness: 0.3 });
      const wp1 = [new V3(0, 0.95, ZC), new V3(1.6, 0.95, ZC), new V3(1.6, -3.3, ZC + 0.4), new V3(0.9, -3.3, ZC + 0.4)];
      const wp2 = [new V3(0, -0.95, ZC), new V3(-1.6, -0.95, ZC), new V3(-1.6, -3.3, ZC + 0.4), new V3(-0.9, -3.3, ZC + 0.4)];
      [wp1, wp2].forEach((pp) => { for (let i = 0; i < pp.length - 1; i++) motorG.add(rod(pp[i], pp[i + 1], 0.035, wMat)); });
      const labPlus = label('+', batt, { color: '#e2464b', offset: [0.65, 0.6, 0], size: 14 }), labMinus = label('−', batt, { color: '#2f6df6', offset: [-0.65, 0.6, 0], size: 14 });
      const labBrush = label('솔(고정)', brushT, { color: 'rgba(55,65,81,.92)', size: 12, offset: [0.9, 0.25, 0] });
      const labComm = label('정류자', H1, { color: 'rgba(55,65,81,.92)', size: 12, offset: [-0.2, -1.05, 0] });

      /* ---------- 전류 · 힘 화살표 ---------- */
      const fA = mkArrow(0xf26b3a, 0.07), fB = mkArrow(0xf26b3a, 0.07); motorG.add(fA, fB);
      const tipA = new THREE.Object3D(), tipB = new THREE.Object3D(); motorG.add(tipA, tipB);
      const labFA = label('F', tipA, { color: '#f26b3a', size: 14, offset: [0, 0.0, 0] }), labFB = label('F', tipB, { color: '#f26b3a', size: 14, offset: [0, 0, 0] });
      const cones = []; for (let i = 0; i < 14; i++) { const c = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.36, 10), basic(0xffe14d)); motorG.add(c); cones.push(c); }
      // 코일 변 위의 전류 방향 기호 (⊗ / ⊙)
      const torqueBar = { n: 0 };

      /* ---------- 조작 ---------- */
      function refresh() {
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
      const demo = { p: 0, on: false };
      function motor(dt, S) {
        dt = Math.min(dt, 0.05); st.t += dt;
        const Mt = S.mt, demoOn = demo.on && !Mt.on && !Mt.burnt && Mt.w < 0.5;
        st.on = demoOn || (Mt.on && !Mt.burnt);
        st.I = demoOn ? 2.0 : Mt.I; st.phi = demoOn ? -TAU * demo.p : -Mt.phi; st.w = demoOn ? -1 : -Mt.w;
        const s = 1, cs = Math.cos(st.phi);
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
        const ph = Mt.burnt ? '코일이 타 버렸어요 (소손). 수리하기를 눌러요.' : !st.on ? '전원이 꺼져 전류가 없으니 힘도 없어요.' : near ? '코일 면이 B에 <b>수직</b>이라 짝힘의 회전 효과가 0 → 관성으로 지나가는 순간, <b>정류자</b>가 솔을 바꿔 전류 방향을 뒤집어요.' : Math.abs(cs) > 0.85 ? '코일 면이 B와 <b>나란해서</b> 짝힘의 회전 효과가 가장 커요.' : '두 변이 받는 <b>반대 방향의 힘</b>이 코일을 돌려요.';
        const Fside = 50 * 0.4 * st.I * 0.25, pin = demoOn ? 24 * st.I : Mt.pin, heat = demoOn ? st.I * st.I * 1.5 : Mt.heat, pout = demoOn ? Math.max(0, pin - heat) : Mt.pout;
        const txt = '<b>⚙️ 직류 전동기</b> · ' + rot + (Mt.stall ? ' (🛑 회전 막음)' : '') + '<br>전류 I = <b>' + f1(st.I) + ' A</b> · 각 변이 받는 힘 F = ' + f1(Fside) + ' N (코일 50회 · B 0.40 T · 변 길이 0.25 m) · 두 변은 반대 방향 (짝힘)<br>입력 P = V × I = ' + f1(pin) + ' W · 열 I²R = ' + f1(heat) + ' W · 출력(운동) = ' + f1(pout) + ' W<br>부하 토크 ' + f1(Mt.load) + ' N·m · 코일 온도 ' + Math.round(Mt.T) + ' ℃<br>' + ph + '<br><span style="opacity:.8">전원·부하·회전 막기는 옆 조작판에서 해요.</span>';
        if (txt !== lastTxt) { lastTxt = txt; info(txt); }
      }

      /* ================= ⚡ 자기장 속 도선이 받는 힘 (위에서 본 모습, 1 m = 6칸) ================= */
      const fG = new THREE.Group(); root.add(fG);
      const UF = 6, LPX = 600;
      const floorF = new THREE.Mesh(new THREE.BoxGeometry(8, 0.1, 5.2), mat(0x2a3550, { roughness: 1 })); floorF.position.set(-0.4, -0.08, 0); fG.add(floorF);
      [-1.2, 1.2].forEach((z) => { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 4.6, 10), mat(0x8a95a8, { metalness: 0.6 })); r.rotation.z = Math.PI / 2; r.position.set(0.1, 0.05, z); fG.add(r); });
      const fieldBox = new THREE.Mesh(new THREE.BoxGeometry(1, 0.06, 1), new THREE.MeshBasicMaterial({ color: 0x7c5cff, transparent: true, opacity: 0.22, depthWrite: false })); fG.add(fieldBox);
      const fieldArr = []; for (let i = 0; i < 40; i++) { const a = mkArrow(0xb79bff, 0.03); fG.add(a); fieldArr.push(a); }
      const posts = [-1.3, 1.3].map((x) => { const p = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.5, 0.5), mat(0x6b7488)); p.position.set(x, 0.25, 0); fG.add(p); return p; });
      const springs = [0, 1].map(() => { const m = new THREE.Mesh(new THREE.BufferGeometry(), mat(0x9aa3b2, { metalness: 0.7 })); fG.add(m); return m; });
      const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 2.4 + 0.5, 16), mat(0xb9c2d0, { metalness: 0.7, roughness: 0.3 })); wire.rotation.x = Math.PI / 2; wire.position.y = 0.12; wire.castShadow = true; fG.add(wire);
      const hot = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 1, 16), new THREE.MeshBasicMaterial({ color: 0xffb400, transparent: true, opacity: 0.55 })); hot.rotation.x = Math.PI / 2; hot.position.y = 0.12; fG.add(hot);
      const supply = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 1.9), mat(0x394258)); supply.position.set(-3.3, 0.4, 0); fG.add(supply);
      const aI = mkArrow(0xe2552a, 0.05), aFw = mkArrow(0x14a058, 0.09); fG.add(aI, aFw);
      const lSup = label('', supply, { color: '#394258', size: 13 }), lL = label('', [0, 0, 0], { color: '#26324a', size: 13 }), lB = label('', [0, 0.4, 0], { color: '#5b3fd0', size: 13 }), lFo = label('F', aFw, { color: '#0f7a43', size: 14 }), lIo = label('I', aI, { color: '#c2410c', size: 13 });
      const dots = []; for (let i = 0; i < 6; i++) { const d = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), new THREE.MeshBasicMaterial({ color: 0xe2552a })); fG.add(d); dots.push(d); }
      let springKey = '';
      function helix(x1, x2, n) { const pts = []; const L = x2 - x1, N = 90; for (let i = 0; i <= N; i++) { const t = i / N, a = t * n * TAU; pts.push(new V3(x1 + t * L, 0.12 + 0.13 * Math.sin(a), 0.13 * Math.cos(a))); } return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 140, 0.018, 5, false); }
      const BLV = [0.2, 0.4, 0.6];
      function forceScene(dt, S) {
        const f = S.f; const dmv = dm.F.on ? demoEnv(dm.F.p) : 1; const demoF = dm.F;
        const I = f.I * dmv, par = f.par, Fs0 = f.dir * f.B * f.I * f.L * (par ? 0 : 1), Fs = Fs0 * dmv;
        const xr = clamp(f.x.value / LPX * UF, -1.2, 1.2);
        const xd = demoF.on ? clamp(Fs0 * 60 / LPX * UF * dmv, -1.2, 1.2) : xr;
        const x = xd;
        const fw = 224 / LPX * UF, fh = f.L * UF;
        fieldBox.scale.set(fw, 1, fh); fieldBox.position.set(0, 0.03, 0);
        let k = 0; const nx = 4, nz = Math.max(1, Math.round(fh / 0.55));
        for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) { const a = fieldArr[k++]; if (!a) continue; const px = -fw / 2 + (i + 0.5) * fw / nx, pz = -fh / 2 + (j + 0.5) * fh / nz; if (!par) setArrow(a, new V3(px, 0.05, pz), new V3(px, 0.75, pz)); else setArrow(a, new V3(px, 0.2, pz + 0.25), new V3(px, 0.2, pz - 0.25)); }
        for (; k < fieldArr.length; k++) fieldArr[k].visible = false;
        wire.position.x = x; hot.position.x = x; hot.scale.set(1, Math.min(f.L, 0.4) * UF, 1); hot.visible = I > 0.01;
        const key = Math.round(x * 100);
        if (key !== springKey) { springKey = key; springs[0].geometry.dispose(); springs[1].geometry.dispose(); springs[0].geometry = helix(-1.2, x - 0.12, 7); springs[1].geometry = helix(x + 0.12, 1.2, 7); }
        const dir = f.dir, up = new V3(0, 0, -dir);
        if (I > 0.01) { setArrow(aI, new V3(x + 0.35, 0.3, dir > 0 ? 0.9 : -0.9).addScaledVector(up, 0), new V3(x + 0.35, 0.3, (dir > 0 ? 0.9 : -0.9) + up.z * 1.2)); lIo.obj = [x + 0.35, 0.3, (dir > 0 ? 0.9 : -0.9) + up.z * 0.6]; lIo.off = [0.3, 0.25, 0]; lIo.show(true); } else { aI.visible = false; lIo.show(false); }
        dots.forEach((d, i) => { d.visible = I > 0.01; if (d.visible) { const q = (((tmpT() * (0.4 + I * 0.18) * dir + i / dots.length) % 1) + 1) % 1; d.position.set(x, 0.12, 1.2 - q * 2.4); } });
        const al = Math.abs(Fs) * 2.6;
        if (al > 0.15) { setArrow(aFw, new V3(x, 0.3, 0), new V3(x + Math.sign(Fs) * al, 0.3, 0)); lFo.obj = [x + Math.sign(Fs) * (al + 0.2), 0.3, 0]; lFo.off = [0, 0.3, 0]; lFo.show(true); } else { aFw.visible = false; lFo.show(false); }
        lSup.set(f1(f.I) + ' A ' + (f.I > 0 ? (f.dir > 0 ? '↑' : '↓') : '(꺼짐)')); lSup.off = [0, 0.7, 0];
        lL.obj = [fw / 2 + 0.15, 0.1, -fh / 2 + 0.2]; lL.set('L = ' + f2(f.L) + ' m'); lL.off = [0.6, 0, 0];
        lB.obj = [-fw / 2, 0.8, -fh / 2 - 0.2]; lB.set(par ? '자기장 B ↑ (도선과 나란한 방향)' : '자기장 B ⊙ (위쪽, 화면 밖으로)'); lB.off = [0.6, 0.3, 0];
        const Fn = f.B * f.I * f.L * (par ? 0 : 1);
        /* 2D처럼: 힘 센서 값과 측정 기록표를 보여 주고, 식(F = BIL)은 2D에서 식이 공개된 뒤에만 보여 줘요 */
        const LS0 = lessonS(), showF = !!(f.showF || (LS0 && LS0.game && LS0.game.free)), rows = (f.rows || []).slice(-4);
        const txt = '<b>⚡ 자기장 속 전류가 받는 힘</b> · 도선(막대)이 레일 위에 놓여 있어요 (위에서 본 모습)<br>' + (par ? '자기장이 도선과 <b>나란할 때</b> 힘 센서: <b>F = 0 N</b>' : '힘 센서: <b>F = ' + f2(Fn) + ' N</b>' + (showF ? ' (F = B × I × L = ' + f2(f.B) + ' × ' + f1(f.I) + ' × ' + f2(f.L) + ')' : '') + (f.I > 0 ? ' · 힘은 ' + (Fs0 > 0 ? '오른쪽 →' : '왼쪽 ←') : ' · 전류가 0이라 힘도 0')) +
          '<br>📋 측정 기록표 (B · I · L → F): ' + (rows.length ? rows.map((r) => f2(r.B) + ' T · ' + f1(r.I) + ' A · ' + f2(r.L) + ' m → <b>' + f2(r.F) + ' N ' + (r.dir > 0 ? '→' : '←') + '</b>').join(' / ') : '📏 기록하기를 눌러 값을 모아요') + '<br><span style="opacity:.8">B · I · L · 방향은 옆 조작판에서 바꿔요.</span>';
        if (txt !== lastTxtF) { lastTxtF = txt; info(txt); }
      }
      let lastTxtF = '', tmT = 0; const tmpT = () => tmT;
      const demoEnv = (p) => (p < 0.15 ? 0 : p < 0.5 ? ez((p - 0.15) / 0.35) : p < 0.8 ? 1 : 1 - ez((p - 0.8) / 0.2));
      function ez(x) { x = clamp(x, 0, 1); return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; }
      /* ================= 🔊 스피커의 단면 ================= */
      const spG = new THREE.Group(); root.add(spG);
      const lathe = (pts, col, o) => { const m = new THREE.Mesh(new THREE.LatheGeometry(pts.map((p) => new THREE.Vector2(p[0], p[1])), 48), mat(col, Object.assign({ side: THREE.DoubleSide }, o || {}))); return m; };
      const ringMag = lathe([[1.7, 0], [2.6, 0], [2.6, 1.1], [1.7, 1.1], [1.7, 0]], 0xe2464b, { metalness: 0.3 }); spG.add(ringMag);
      const poleMag = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 1.5, 36), mat(0x2f6df6, { metalness: 0.3 })); poleMag.position.y = 0.75; spG.add(poleMag);
      const baseMag = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 0.3, 48), mat(0x6b7488, { metalness: 0.6 })); baseMag.position.y = -0.15; spG.add(baseMag);
      const diaph = new THREE.Group(); diaph.position.y = 0; spG.add(diaph);
      const coilRings = []; for (let i = 0; i < 6; i++) { const t = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.07, 8, 40), mat(0xe39a45, { metalness: 0.4 })); t.rotation.x = Math.PI / 2; t.position.y = 0.4 + i * 0.16; diaph.add(t); }
      const coilCyl = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 1.0, 36, 1, true), new THREE.MeshStandardMaterial({ color: 0xf4f0e6, side: THREE.DoubleSide, roughness: 0.7 })); coilCyl.position.y = 0.7; diaph.add(coilCyl);
      const cone = lathe([[1.2, 1.2], [4.2, 2.3], [4.35, 2.3], [4.35, 2.2], [1.25, 1.1]], 0xdfe6f2, { transparent: true, opacity: 0.8, roughness: 0.5 }); diaph.add(cone);
      const susp = new THREE.Mesh(new THREE.TorusGeometry(4.35, 0.1, 8, 48), mat(0x6b7488)); susp.rotation.x = Math.PI / 2; susp.position.y = 2.25; spG.add(susp);
      const sBarr = []; [0.35, 0.8].forEach((y) => [0, 1.57, 3.14, 4.71].forEach((a) => { const ar = mkArrow(0xb79bff, 0.03); spG.add(ar); setArrow(ar, new V3(2.1 * Math.cos(a), y, 2.1 * Math.sin(a)), new V3(1.1 * Math.cos(a), y, 1.1 * Math.sin(a))); sBarr.push(ar); }));
      const aFs = mkArrow(0x14a058, 0.08); spG.add(aFs);
      const waves = []; for (let i = 0; i < 12; i++) { const w = new THREE.Mesh(new THREE.TorusGeometry(1, 0.025, 6, 48), new THREE.MeshBasicMaterial({ color: 0x6aa0ff, transparent: true, opacity: 0.5, depthWrite: false })); w.rotation.x = Math.PI / 2; w.visible = false; spG.add(w); waves.push(w); }
      const lNm = label('N극', ringMag, { color: '#e2464b', size: 13 }), lSm = label('S극', poleMag, { color: '#2f6df6', size: 13 }), lCo = label('보이스 코일 (50회)', [1.2, 0.7, 0], { color: '#a65d22', size: 12 }), lDi = label('진동판', [3.6, 2.0, 0], { color: '#475569', size: 12 }), lWv = label('공기 파동 (소리)', [0, 5.2, 0], { color: '#2f56d6', size: 12 }), lFs = label('코일이 받는 힘 F', aFs, { color: '#0f7a43', size: 12 });
      lNm.off = [2.3, 0.4, 0]; lSm.off = [0, 1.1, 0];
      let lastTxtS = '';
      function speaker(dt, S) {
        const s = S.sp, xm = s.x * 0.9; diaph.position.y = xm;
        const ang = s.i / 0.2, Fn = 50 * 0.4 * s.i * (TAU * 0.015);
        if (Math.abs(s.i) > 0.004) { setArrow(aFs, new V3(1.2, 0.7 + xm, 0), new V3(1.2, 0.7 + xm + clamp(ang, -1, 1) * 1.6, 0)); lFs.obj = [1.2, 0.7 + xm + clamp(ang, -1, 1) * 1.8, 0]; lFs.off = [0.6, 0, 0]; lFs.show(true); } else { aFs.visible = false; lFs.show(false); }
        waves.forEach((w, i) => { const r = s.rings[i]; if (!r) { w.visible = false; return; } w.visible = true; const q = r.r / 300; w.position.y = 2.6 + q * 6; w.scale.setScalar(2 + q * 4); w.material.opacity = 0.5 * r.a * (1 - q); });
        lCo.obj = [1.2, 0.7 + xm, 0]; lDi.obj = [3.6, 2.0 + xm, 0]; lCo.off = [1.3, 0, 0]; lDi.off = [0.9, 0.2, 0];
        const dc = s.kind === 'dc';
        const txt = '<b>🔊 스피커의 단면</b> · 신호 ' + (dc ? '<b>직류</b>' : '<b>교류</b>') + '<br>신호 전류 i = ' + (s.i >= 0 ? '+' : '−') + f2(Math.abs(s.i)) + ' A (진폭 ' + f2(s.A) + ' A' + (dc ? '' : ' · 진동수 ' + s.f + ' Hz') + ') · 진동판 위치 x = ' + (s.x >= 0 ? '+' : '−') + f2(Math.abs(s.x)) + ' mm<br>' + (dc ? '직류는 방향이 일정해서 진동판이 한쪽으로 밀려 <b>고정</b>돼요 → 소리가 나지 않아요.' : '전류 방향이 바뀌면 힘의 방향도 바뀌어 진동판이 <b>앞뒤로 떨려요</b> → 공기가 떨려 소리가 돼요. 진폭이 크면 큰 소리, 진동수가 높으면 높은 소리예요.') + '<br><span style="opacity:.8">화면은 실제보다 500배 느려요 · 신호 종류 · 진폭 · 진동수는 옆 조작판에서 바꿔요.</span>';
        if (txt !== lastTxtS) { lastTxtS = txt; info(txt); }
      }

      /* ================= 🛠️ 스피커 설계 (내가 고른 값으로 만든 스피커 단면 · 주파수 시험) ================= */
      const dG = new THREE.Group(); root.add(dG); dG.visible = false;
      const dMv = new THREE.Group(), dFix = new THREE.Group(); dG.add(dFix, dMv);
      let dKey = '', dN = 4;
      const mixc = (a, b, f) => new THREE.Color(a).lerp(new THREE.Color(b), f);
      const dWaves = []; for (let i = 0; i < 6; i++) { const w = new THREE.Mesh(new THREE.TorusGeometry(1, 0.025, 6, 48), new THREE.MeshBasicMaterial({ color: 0x6aa0ff, transparent: true, opacity: 0.5, depthWrite: false })); w.rotation.x = Math.PI / 2; w.visible = false; dG.add(w); dWaves.push(w); }
      const gapRings = [-1, 1].map(() => { const r = new THREE.Mesh(new THREE.TorusGeometry(1.9, 0.03, 6, 48), new THREE.MeshBasicMaterial({ color: 0x14a058, transparent: true, opacity: 0.8 })); r.rotation.x = Math.PI / 2; dG.add(r); return r; });
      const lDm = label('진동판', dMv, { color: '#475569', size: 12 }), lDc = label('', dMv, { color: '#a65d22', size: 12 }), lDg = label('자석 틈 한계 ±1.5 mm', [0, 0, 0], { color: '#14a058', size: 11 }), lDmag = label('', [0, 0, 0], { color: '#394258', size: 12 }), lDst = label('', [0, 0, 0], { color: '#14a058', size: 14 });
      const dLabs = [lDm, lDc, lDg, lDmag, lDst];
      function buildDesign(d) {
        [dFix, dMv].forEach((g) => { while (g.children.length) { const c = g.children[0]; g.remove(c); if (c.geometry) c.geometry.dispose(); } });
        const R = d.cup === 'large' ? 4.5 : 2.9, thick = d.mat === 'thick', bc = clamp((d.B - 0.2) / 0.4, 0, 1), th = thick ? 0.16 : 0.07;
        const ring = lathe([[1.7, 0], [2.6, 0], [2.6, 1.1], [1.7, 1.1], [1.7, 0]], 0xe2464b, { metalness: 0.3 }); ring.material.color.copy(mixc(0xf2a0a3, 0xe2464b, bc)); dFix.add(ring);
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 1.5, 36), mat(0x2f6df6, { metalness: 0.3 })); pole.material.color.copy(mixc(0x8aa7f2, 0x2f6df6, bc)); pole.position.y = 0.75; dFix.add(pole);
        const base = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 0.3, 48), mat(0x6b7488, { metalness: 0.6 })); base.position.y = -0.15; dFix.add(base);
        for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; dFix.add(rod(new V3(2.6 * Math.cos(a), 1.1, 2.6 * Math.sin(a)), new V3(R * Math.cos(a), 2.15, R * Math.sin(a)), 0.05, mat(0x8a95a8, { metalness: 0.6 }))); }
        const sus = new THREE.Mesh(new THREE.TorusGeometry(R, 0.1, 8, 48), mat(0x6b7488)); sus.rotation.x = Math.PI / 2; sus.position.y = 2.25; dFix.add(sus);
        for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2, ar = mkArrow(0xb79bff, 0.03); dFix.add(ar); setArrow(ar, new V3(2.1 * Math.cos(a), 0.55, 2.1 * Math.sin(a)), new V3(1.1 * Math.cos(a), 0.55, 1.1 * Math.sin(a))); ar.children.forEach((c) => { c.material = mat(0xb79bff, { transparent: true, opacity: 0.25 + 0.7 * bc }); }); }
        const n = clamp(Math.round(d.N / 10), 2, 7), wr = d.wire === 'thin' ? 0.05 : 0.1, step = 0.14;
        const tube0 = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 1.0, 36, 1, true), new THREE.MeshStandardMaterial({ color: 0xf4f0e6, side: THREE.DoubleSide, roughness: 0.7 })); tube0.position.y = 0.7; dMv.add(tube0);
        for (let i = 0; i < n; i++) { const t = new THREE.Mesh(new THREE.TorusGeometry(1.2, wr, 8, 40), mat(0xe39a45, { metalness: 0.4 })); t.rotation.x = Math.PI / 2; t.position.y = 0.3 + i * step * (d.wire === 'thin' ? 1 : 1.35); dMv.add(t); }
        const cone = lathe([[1.2, 1.2], [R, 2.3], [R + 0.1, 2.3], [R + 0.1, 2.3 - th], [1.25, 1.2 - th]], thick ? 0xb88a4a : 0xf1e7d0, { roughness: 0.6 }); dMv.add(cone);
        dKey = [d.N, d.B, d.cup, d.mat, d.wire].join('|'); dN = n;
        lDm.off = [R * 0.8, 1.5, 0.8]; lDc.off = [-2.0, 1.0, 0.6]; lDmag.obj = [0, -0.7, 2.7];
        gapRings.forEach((g) => g.scale.setScalar(1));
        dG.userData.R = R;
      }
      const dm2 = { p: 0, on: false };
      let pD = null;
      let lastTxtD = '';
      function designScene(dt, S, A) {
        const d = S.ds, ev = A.designOf(d), key = [d.N, d.B, d.cup, d.mat, d.wire].join('|'); if (key !== dKey) buildDesign(d);
        const R = dG.userData.R || 3, GAP = A.SPEC.gap, F_LO = 200, F_HI = 4000;
        const sweeping2D = d.sweep >= 0, demo = dm2.on && !sweeping2D;
        const f = sweeping2D ? d.sweepF : demo ? F_LO + (F_HI - F_LO) * dm2.p : 1000;
        const x = clamp(ev.X(f) * Math.sin(d.ph), -GAP * 1.4, GAP * 1.4), xm = x * 0.9;
        dMv.position.y = xm;
        const ok = ev.xmax <= GAP;
        gapRings.forEach((g, i) => { g.position.y = 0.3 + (i ? 1 : -1) * GAP * 0.9; g.scale.setScalar(1.45); g.material.color.setHex(ok ? 0x14a058 : 0xe2464b); });
        const loud = clamp(ev.L(f) / 12, 0, 1), tt = d.ph / (Math.PI * 2);
        dWaves.forEach((w, i) => { const q = ((tt * 0.5 + i / dWaves.length) % 1 + 1) % 1; w.visible = loud > 0.02; w.position.y = 2.7 + q * 5; w.scale.setScalar(R * 0.55 + q * 2.2); w.material.opacity = 0.65 * loud * (1 - q); });
        lDm.obj = dMv; lDc.set('보이스 코일 ' + d.N + '회 · ' + (d.wire === 'thin' ? '얇은 선' : '굵은 선')); lDc.obj = dMv;
        lDg.obj = [2.7, 0.3 + GAP * 0.9, 0]; lDg.off = [1.2, 0.2, 0]; lDmag.set('자석 ' + (Math.round(d.B * 100) / 100).toFixed(2) + ' T'); lDmag.obj = [0, -0.5, 2.8];
        const checks = A.specChecks(ev), tested = d.tested === A.sigOf(d), allOk = checks.every((c) => c.ok);
        lDst.show(allOk && tested); lDst.set('설계 완료 ✔'); lDst.obj = [0, 8.2, 0];
        const sweepTxt = sweeping2D || demo ? '시험 중 <b>' + Math.round(f) + ' Hz</b> · 소리 크기 <b>' + f2(ev.L(f)) + '</b> · 진폭 ' + f2(ev.X(f)) + ' mm' + (ev.X(f) > GAP ? ' <span style="color:#ff9b9b">(틈 밖 → 찌그러져요)</span>' : '') : '화면은 느리게 보여 줘요 (1 kHz 기준) · 아래 ▶ 시험하기로 200 Hz → 4 kHz를 훑어요';
        const txt = '<b>🛠️ 내 스피커 설계</b> · 진동판 m = <b>' + f1(ev.m) + ' g</b> · 코일 저항 ' + f1(ev.R) + ' Ω · 소비 전력 ' + f1(ev.P) + ' mW · 비용 ' + Math.round(ev.cost) + '<br>' +
          checks.map((c) => (c.ok ? '✅ ' : '⬜ ') + c.text).join('<br>') + '<br>' + sweepTxt;
        if (txt !== lastTxtD || sweeping2D || demo) { lastTxtD = txt; info(txt); }
      }
      pD = controls.player({ duration: 9, loop: true, autoplay: false, label: '시험하기', phases: [[0, '낮은 음'], [0.3, '1 kHz'], [0.6, '3 kHz'], [0.9, '높은 음']], onFrame(p) { dm2.p = p; dm2.on = p > 0 || !!(pD && pD.playing); } });
      /* ================= 장면 · ▶ 재생 ================= */
      const motorLabs = [labB, labL, labR, labPlus, labMinus, labBrush, labComm, labFA, labFB], fLabs = [lSup, lL, lB, lFo, lIo], sLabs = [lNm, lSm, lCo, lDi, lWv, lFs];
      const dm = { F: { p: 0, on: false }, M: { p: 0, on: false } };
      let pF = null, pM = null;
      pF = controls.player({ duration: 7, loop: true, autoplay: false, label: '전류 흘리기', phases: [[0, '전류 없음'], [0.15, '전류가 흐르면 힘을 받아요'], [0.5, '힘이 일정해요'], [0.8, '전류를 끊어요']], onFrame(p) { dm.F.p = p; dm.F.on = p > 0 || !!(pF && pF.playing); } });
      pM = controls.player({ duration: 8, loop: true, autoplay: false, label: '코일 한 바퀴', phases: [[0, '짝힘으로 회전'], [0.2, '정류자가 전류 방향을 바꿔요'], [0.3, '짝힘으로 회전'], [0.7, '정류자가 전류 방향을 바꿔요'], [0.8, '짝힘으로 회전']], onFrame(p) { dm.M.p = p; dm.M.on = p > 0 || !!(pM && pM.playing); } });
      const rows = [...ctx.renderer.domElement.parentNode.parentNode.querySelectorAll('.v3-player')]; pD.row = rows[0]; pF.row = rows[1]; pM.row = rows[2];
      // 2D 캔버스의 '🧲 자기장 나란하게' 단추와 같은 일: 도선과 자기장을 나란하게(힘 0) ↔ 수직으로
      const bPar = controls.button('🧲 자기장 나란하게', () => { const A = lessonS(); if (!A || !A.S || A.S.mode !== 'force') return; A.S.f.par = !A.S.f.par; if (A.updateCtl) A.updateCtl(); });
      let cur = '';
      function setMode(mode) {
        if (mode === cur) return; cur = mode;
        motorG.visible = mode === 'motor'; fG.visible = mode === 'force'; spG.visible = mode === 'speaker'; dG.visible = mode === 'design'; dLabs.forEach((l) => l.show(mode === 'design'));
        pD.row.style.display = mode === 'design' ? '' : 'none'; if (mode !== 'design') { pD.pause(); pD.set(0); }
        motorLabs.forEach((l) => l.show(false)); fLabs.forEach((l) => l.show(false)); sLabs.forEach((l) => l.show(mode === 'speaker'));
        if (mode !== 'motor') { motorG.visible = false; } 
        bPar.style.display = mode === 'force' ? '' : 'none';
        pF.row.style.display = mode === 'force' ? '' : 'none'; pM.row.style.display = mode === 'motor' ? '' : 'none';
        if (mode !== 'force') { pF.pause(); pF.set(0); } if (mode !== 'motor') { pM.pause(); pM.set(0); }
        if (mode === 'force') { Object.assign(ctx.orbit, { tx: -0.4, ty: 0, tz: 0, phi: 0.8, theta: 0.0, dist: 7 * KD }); lSup.show(true); lL.show(true); lB.show(true); }
        else if (mode === 'motor') { Object.assign(ctx.orbit, { tx: 0, ty: -0.6, tz: 0.4, phi: 1.15, theta: 0.55, dist: 14 * KD }); labB.show(true); labL.show(true); labR.show(true); labPlus.show(true); labMinus.show(true); labBrush.show(true); labComm.show(true); }
        else if (mode === 'speaker') { Object.assign(ctx.orbit, { tx: 0, ty: 2.5, tz: 0, phi: 1.25, theta: 0.5, dist: 15 * KD }); }
        else if (mode === 'design') { Object.assign(ctx.orbit, { tx: 0, ty: 3.2, tz: 0, phi: 1.2, theta: 0.5, dist: 17 * KD }); }
        lastTxt = ''; lastTxtF = ''; lastTxtS = '';
      }
      return {
        update(dt, tm) {
          const A = lessonS(); if (!A || !A.S) return; const S = A.S; dt = Math.min(dt, 0.05); tmT += dt;
          setMode(S.mode);
          if (S.mode === 'force') { if (!pF.playing && pF.p === 0) dm.F.on = false; forceScene(dt, S); const pt = S.f.par ? '🧲 자기장 수직으로' : '🧲 자기장 나란하게'; if (bPar.textContent !== pt) bPar.textContent = pt; bPar.classList.toggle('on', !!S.f.par); }
          else if (S.mode === 'motor') { if (S.mt.on && pM.playing) pM.pause(); if (!pM.playing && pM.p === 0) dm.M.on = false; demo.p = dm.M.p; demo.on = dm.M.on; motor(dt, S); }
          else if (S.mode === 'speaker') speaker(dt, S);
          else if (S.mode === 'design') { if (S.ds.sweep >= 0 && pD.playing) pD.pause(); if (!pD.playing && pD.p === 0) dm2.on = false; designScene(dt, S, A); }
        },
        sync() {},
      };
    },
  });
})();
