/* m2-electromagnet · 3D 전자석 (코일의 자기장 · 막대자석 · 도선 그네)
   오른손 규칙: 감아쥔 네 손가락 = 전류가 도는 방향, 엄지 = 코일 안의 자기장 방향 = N극 쪽.
   방향 약속은 2D 실험과 같아요: 전류 방향 '정방향'이면 N극이 오른쪽(+x), 도선 그네에서는 전류 ⊙(앞쪽)일 때 힘이 오른쪽. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHN = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches), KD = PHN ? 1.45 : 1;
  const NC = 0xe2464b, SCOL = 0x2f6df6, COPPER = 0xe39a45;

  window.SciSim3D.attach({
    title: '전자석과 자기장 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: 12.5 * KD, theta: 0.5, phi: 1.2, min: 5, max: 30 },
    autoRotate: 0,
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const V3 = THREE.Vector3, Yax = new V3(0, 1, 0);
      const L = 4, R = 0.85, NT = 10;                       // 코일 길이 · 반지름 · 감은 수
      const lessonS = () => (window.__sim && window.__sim.S) || null;
      const S0 = lessonS();
      const st = {
        scene: S0 && S0.scene === 'force' ? 'force' : S0 && S0.scene === 'magnet' ? 'magnet' : 'coil',
        I: S0 ? Math.max(0, Math.min(3, S0.I || 0)) : 0, dir: S0 && S0.dir ? S0.dir : 1, pole: S0 && S0.pole ? S0.pole : 1,
        core: true, comp: true, flip: 1, th: 0, thV: 0,
      };
      if (st.scene === 'coil' && st.I === 0) st.I = 2;
      if (st.scene === 'force' && st.I === 0) st.I = 2;

      /* ---------- 재료 · 도구 ---------- */
      const mat = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.55, metalness: 0.1 }, o || {}));
      function mkArrow(col, rad) {
        const g = new THREE.Group(); const m = mat(col, { roughness: 0.4 });
        const sh = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, 1, 10), m);
        const hd = new THREE.Mesh(new THREE.ConeGeometry(rad * 2.6, rad * 6, 14), m);
        g.add(sh, hd); g.userData = { sh, hd, rad }; return g;
      }
      function setArrow(g, a, b) {
        const d = new V3().subVectors(b, a), len = d.length(); const { sh, hd, rad } = g.userData;
        if (len < 1e-3) { g.visible = false; return; }
        g.visible = true; const hl = Math.min(len * 0.5, rad * 6);
        sh.scale.y = Math.max(0.001, len - hl); sh.position.y = (len - hl) / 2;
        hd.scale.y = hl / (rad * 6); hd.position.y = len - hl / 2;
        g.position.copy(a); g.quaternion.setFromUnitVectors(Yax, d.normalize());
      }
      function box(w, h, d, c, o) { return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c, o)); }

      /* ---------- 코일의 자기장 (원형 전류 여러 개의 합: 비오-사바르 수치합) ---------- */
      const SRC = []; // [x,y,z, dlx,dly,dlz]
      const SEG = 28;
      for (let i = 0; i < 14; i++) {
        const x = -L / 2 + L * (i + 0.5) / 14;
        for (let k = 0; k < SEG; k++) {
          const a = (k + 0.5) / SEG * Math.PI * 2, da = Math.PI * 2 / SEG;
          // 위치 (x, R cos a, R sin a), a가 커지는 방향 = +x축 둘레 시계 반대 방향 → 내부 B는 +x
          SRC.push(x, R * Math.cos(a), R * Math.sin(a), 0, -R * Math.sin(a) * da, R * Math.cos(a) * da);
        }
      }
      function bAt(px, py, pz, out) {
        let bx = 0, by = 0, bz = 0;
        for (let i = 0; i < SRC.length; i += 6) {
          const rx = px - SRC[i], ry = py - SRC[i + 1], rz = pz - SRC[i + 2];
          const r2 = rx * rx + ry * ry + rz * rz + 0.012, inv = 1 / (r2 * Math.sqrt(r2));
          const dx = SRC[i + 3], dy = SRC[i + 4], dz = SRC[i + 5];
          bx += (dy * rz - dz * ry) * inv; by += (dz * rx - dx * rz) * inv; bz += (dx * ry - dy * rx) * inv;
        }
        out.set(bx, by, bz); return out;
      }
      const tmpB = new V3(); const B0 = bAt(0, 0, 0, new V3()).length();
      const unitB = (p, out) => bAt(p.x, p.y, p.z, out).multiplyScalar(1 / B0);

      /* ---------- 장면 묶음 ---------- */
      const gCoil = new THREE.Group(), gMag = new THREE.Group(), gSwing = new THREE.Group(), gLines = new THREE.Group();
      root.add(gCoil, gMag, gSwing, gLines);

      /* 자기력선 (축을 지나는 평면마다) */
      const lines = [];
      (function makeLines() {
        const seeds = [];
        [0.5, 0.92].forEach((f) => [0, 1, 2, 3].forEach((k) => seeds.push([f * R, k * Math.PI / 2 + 0.3]))); seeds.push([0, 0]);
        const p = new V3(), b = new V3();
        seeds.forEach((s) => {
          const x0 = -L * 0.45; const start = new V3(x0, s[0] * Math.cos(s[1]), s[0] * Math.sin(s[1]));
          p.copy(start); const pts = [p.clone()];
          for (let n = 0; n < 900; n++) {
            unitB(p, b); const h = 0.07; if (b.lengthSq() < 1e-12) break; b.normalize();
            const mid = p.clone().addScaledVector(b, h / 2); unitB(mid, b); b.normalize();
            const prevX = p.x; p.addScaledVector(b, h); pts.push(p.clone());
            if (n > 50 && prevX < x0 && p.x >= x0 && Math.hypot(p.y, p.z) < R * 1.1) break;
            if (p.length() > 6.2) break;
          }
          if (p.length() <= 6.2) pts.push(start.clone());
          const sub = pts.filter((_, i) => i % 3 === 0 || i === pts.length - 1);
          const curve = new THREE.CatmullRomCurve3(sub);
          const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, Math.min(300, sub.length * 2), 0.024, 5, false), new THREE.MeshBasicMaterial({ color: 0xb79bff, transparent: true, opacity: 0.8 }));
          gLines.add(tube);
          const cones = [];
          [0.12, 0.37, 0.62, 0.87].forEach((u) => {
            const t0 = curve.getPointAt(u), tg = curve.getTangentAt(u);
            const cn = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.24, 10), new THREE.MeshBasicMaterial({ color: 0xd8c7ff }));
            cn.position.copy(t0); cn.userData.tg = tg; gLines.add(cn); cones.push(cn);
          });
          lines.push({ tube, cones });
        });
      })();
      function setLines(sign, op) {
        lines.forEach((l) => {
          l.tube.material.opacity = op;
          l.cones.forEach((c) => { c.quaternion.setFromUnitVectors(Yax, c.userData.tg.clone().multiplyScalar(sign)); c.material.opacity = op; c.material.transparent = true; });
        });
      }

      /* ---------- ① 전자석 (코일 + 철심 + 전원) ---------- */
      const pathPts = [];
      const helixPts = [];
      for (let i = 0; i <= NT * 40; i++) { const s = i / 40; helixPts.push(new V3(-L / 2 + L * s / NT, R * Math.cos(s * Math.PI * 2), R * Math.sin(s * Math.PI * 2))); }
      const BY = -2.4;
      pathPts.push(new V3(-0.9, BY, 0), new V3(-L / 2 - 0.6, BY, 0), new V3(-L / 2 - 0.6, R, 0), ...helixPts, new V3(L / 2 + 0.6, R, 0), new V3(L / 2 + 0.6, BY, 0), new V3(0.9, BY, 0));
      const pathCurve = new THREE.CatmullRomCurve3(pathPts, false, 'catmullrom', 0);
      const lens = [0]; for (let i = 1; i < pathPts.length; i++) lens.push(lens[i - 1] + pathPts[i].distanceTo(pathPts[i - 1]));
      const PLEN = lens[lens.length - 1];
      function pathAt(u, outP, outT) { // 꺾은선 위의 점과 방향
        const d = u * PLEN; let i = 1; while (i < lens.length - 1 && lens[i] < d) i++;
        const t = (d - lens[i - 1]) / Math.max(1e-6, lens[i] - lens[i - 1]);
        outP.lerpVectors(pathPts[i - 1], pathPts[i], t); outT.subVectors(pathPts[i], pathPts[i - 1]).normalize();
      }
      gCoil.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(helixPts), 520, 0.055, 8, false), mat(COPPER, { metalness: 0.35, roughness: 0.4 })));
      const leadPts = [pathPts[0], pathPts[1], pathPts[2], pathPts[3]];
      const leadR = [pathPts[pathPts.length - 4], pathPts[pathPts.length - 3], pathPts[pathPts.length - 2], pathPts[pathPts.length - 1]];
      [leadPts, leadR].forEach((pp) => { const g = new THREE.BufferGeometry().setFromPoints(pp); gCoil.add(new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0xb7791f }))); gCoil.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pp, false, 'catmullrom', 0), 20, 0.035, 6, false), mat(COPPER))); });
      const core = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.62, R * 0.62, L + 0.3, 24), mat(0x9aa3b2, { transparent: true, opacity: 0.5, metalness: 0.5 }));
      core.rotation.z = Math.PI / 2; gCoil.add(core);
      const batt = new THREE.Group();
      batt.add(box(1.8, 0.55, 0.55, 0x374151), (() => { const m = box(0.5, 0.55, 0.58, 0xe2464b); m.position.x = -0.65; return m; })(), (() => { const m = box(0.5, 0.55, 0.58, 0x2f6df6); m.position.x = 0.65; return m; })());
      batt.position.set(0, BY, 0); gCoil.add(batt);
      const capN = new THREE.Mesh(new THREE.CircleGeometry(R * 1.12, 32), new THREE.MeshBasicMaterial({ color: NC, transparent: true, opacity: 0.4, side: THREE.DoubleSide }));
      const capS = new THREE.Mesh(new THREE.CircleGeometry(R * 1.12, 32), new THREE.MeshBasicMaterial({ color: SCOL, transparent: true, opacity: 0.4, side: THREE.DoubleSide }));
      capN.rotation.y = capS.rotation.y = Math.PI / 2; gCoil.add(capN, capS);
      const labPlus = label('+', batt, { color: '#e2464b', offset: [-0.65, 0.55, 0], size: 14 });
      const labMinus = label('−', batt, { color: '#2f6df6', offset: [0.65, 0.55, 0], size: 14 });
      const labN = label('N극', capN, { color: '#e2464b', offset: [0, 0.95, 0] });
      const labS = label('S극', capS, { color: '#2f6df6', offset: [0, 0.95, 0] });
      // 전류 알갱이 (움직이는 화살촉)
      const flow = [];
      for (let i = 0; i < 26; i++) { const c = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.34, 10), new THREE.MeshBasicMaterial({ color: 0xffe14d })); gCoil.add(c); flow.push(c); }
      let flowT = 0;
      const pp = new V3(), pt = new V3();
      function updateFlow(dt) {
        const f = effStrength() > 0.05;
        flow.forEach((c, i) => {
          c.visible = f && st.scene === 'coil';
          if (!c.visible) return;
          let u = (flowT + i / flow.length) % 1; if (st.dir < 0) u = 1 - u;
          pathAt(u, pp, pt); c.position.copy(pp); c.position.z += 0.0;
          c.quaternion.setFromUnitVectors(Yax, pt.clone().multiplyScalar(st.dir));
        });
        flowT = (flowT + dt * 0.12 * (0.3 + st.I / 3)) % 1;
      }

      /* ---------- ② 막대자석 ---------- */
      const barN = box(2, 1.3, 1.3, NC, { transparent: true, opacity: 0.45 }), barS = box(2, 1.3, 1.3, SCOL, { transparent: true, opacity: 0.5 });
      gMag.add(barN, barS);
      const mN = label('N', barN, { color: '#e2464b', size: 15 }), mS = label('S', barS, { color: '#2f6df6', size: 15 });
      function placeBar() { barN.position.x = 1 * st.flip; barS.position.x = -1 * st.flip; }

      /* ---------- ③ 도선 그네 ---------- */
      const MY = 1.55;
      const magT = box(5, 1.0, 2.1, NC), magB = box(5, 1.0, 2.1, SCOL);
      magT.position.y = MY + 0.5; magB.position.y = -MY - 0.5; gSwing.add(magT, magB);
      const swN = label('N극', magT, { color: '#e2464b', offset: [-1.9, 0.0, 1.2] }), swS = label('S극', magB, { color: '#2f6df6', offset: [-1.9, 0, 1.2] });
      const fieldArrows = [];
      for (let ix = -1; ix <= 1; ix++) for (let iz = -1; iz <= 1; iz += 2) { const a = mkArrow(0xb79bff, 0.035); gSwing.add(a); fieldArrows.push([a, ix * 1.0, iz * 0.55]); }
      const PIV = 3.9, STR = PIV;                                      // 줄 길이 = 도선이 놓인 높이(0)까지
      const rail = box(0.12, 0.12, 3.0, 0x7b8798); rail.position.y = PIV; gSwing.add(rail);
      const supportL = box(0.12, PIV + 1, 0.12, 0x7b8798), supportR = supportL.clone(); supportL.position.set(0, PIV / 2 - 0.5, -1.55); supportR.position.set(0, PIV / 2 - 0.5, 1.55);
      supportL.visible = supportR.visible = false;
      const swing = new THREE.Group(); swing.position.y = PIV; gSwing.add(swing);
      const strL = box(0.03, STR, 0.03, 0x4b5563), strR = strL.clone(); strL.position.set(0, -STR / 2, -1.25); strR.position.set(0, -STR / 2, 1.25); swing.add(strL, strR);
      const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 2.6, 16), mat(COPPER, { metalness: 0.4 })); wire.rotation.x = Math.PI / 2; wire.position.y = -STR; swing.add(wire);
            const fArrow = mkArrow(0xf26b3a, 0.075); swing.add(fArrow); const iArrow = mkArrow(0xffe14d, 0.05); swing.add(iArrow);
      const tipF = new THREE.Object3D(), tipI = new THREE.Object3D(); swing.add(tipF, tipI);
      const labF = label('힘 F', tipF, { color: '#f26b3a', size: 14, offset: [0, 0.4, 0] });
      const labI = label('전류 I', tipI, { color: '#a16207', size: 13, offset: [0, 0.4, 0] });
      const labB = label('자기장 B', magT, { color: '#6d28d9', offset: [2.0, -0.65, 0], size: 13 });
      const wp = new V3();
      function updateSwing(dt) {
        const f = st.I * st.dir * st.pole / 3;
        const target = Math.max(-0.62, Math.min(0.62, f * 0.6));
        st.thV += ((target - st.th) * 34 - st.thV * 3.2) * dt; st.th += st.thV * dt; swing.rotation.z = st.th; // 양수면 아래쪽 도선이 +x(오른쪽)로 흔들려요
        const down = st.pole > 0;                              // N극이 위면 B는 아래로(위→아래)
        fieldArrows.forEach((fa) => { const [a, x, z] = fa; const y0 = down ? MY - 0.15 : -MY + 0.15, y1 = down ? -MY + 0.3 : MY - 0.3; setArrow(a, new V3(x, y0, z), new V3(x, y1, z)); });
        magT.material.color.setHex(st.pole > 0 ? NC : SCOL); magB.material.color.setHex(st.pole > 0 ? SCOL : NC);
        swN.set(st.pole > 0 ? 'N극' : 'S극'); swS.set(st.pole > 0 ? 'S극' : 'N극');
        swN.el.style.background = st.pole > 0 ? '#e2464b' : '#2f6df6'; swS.el.style.background = st.pole > 0 ? '#2f6df6' : '#e2464b';
        // 전류(⊙ 앞쪽 = +z)와 힘(오른쪽 = +x) 화살표 – 도선(로컬 좌표) 기준
        const cur = st.I > 0.05;
        const zdir = st.dir;                                   // dir>0: 전류가 +z(앞쪽)
        setArrow(iArrow, new V3(0.0, -STR + 0.25, -zdir * 1.0), new V3(0.0, -STR + 0.25, zdir * 1.0));
        iArrow.visible = iArrow.visible && cur; tipI.position.set(0, -STR + 0.25, zdir * 1.0); labI.show(cur); labI.set(st.dir > 0 ? '전류 I ⊙(앞쪽)' : '전류 I ⊗(뒤쪽)');
        const fs = f; const fl = Math.abs(fs) * 2.2;
        if (Math.abs(fs) > 0.05) setArrow(fArrow, new V3(0, -STR, 0).add(new V3(0, 0, 0)), new V3(Math.sign(fs) * (0.5 + fl), -STR, 0)); else fArrow.visible = false;
        tipF.position.set(Math.sign(fs) * (0.5 + fl), -STR, 0); labF.show(Math.abs(fs) > 0.05);
        swing.updateMatrixWorld(true);
      }
      // 힘 화살표는 도선과 함께 회전하지 않도록 월드 기준으로 보정
      function fixFArrow() { fArrow.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(new V3(0, 0, 1), -st.th)); iArrow.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(new V3(0, 0, 1), -st.th)); }

      /* ---------- 나침반 ---------- */
      const comps = [];
      const CPOS = [[3.3, 0, 0.3], [-3.3, 0, 0.3], [0, 1.9, 0.3], [2.1, 1.6, 0.3], [-2.1, 1.6, 0.3], [0, -1.0, 1.5]];
      CPOS.forEach((p) => {
        const g = new THREE.Group(); g.position.set(p[0], p[1], p[2]);
        const shell = new THREE.Mesh(new THREE.SphereGeometry(0.34, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.16 }));
        const nd = new THREE.Group();
        const n = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.34, 12), mat(NC)); n.position.y = 0.17;
        const s = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.34, 12), mat(0xdfe6f5)); s.position.y = -0.17; s.rotation.x = Math.PI;
        nd.add(n, s); g.add(shell, nd); gMag.add(g); comps.push({ g, nd, p: new V3(p[0], p[1], p[2]) });
      });
      // 지구 자기장(약한 배경): −z 쪽을 가리켜요 (그림에서 뒤쪽)
      const EARTH = new V3(0, 0, -0.07);
      function updateCompass(dt) {
        const f = effStrength(); const sign = st.scene === 'magnet' ? st.flip : st.dir;
        comps.forEach((c) => {
          unitB(c.p, tmpB); tmpB.multiplyScalar(f * sign).add(EARTH);
          const tgt = new THREE.Quaternion().setFromUnitVectors(Yax, tmpB.clone().normalize());
          c.nd.quaternion.slerp(tgt, 1 - Math.exp(-dt * 7));
        });
      }
      function effStrength() { return st.scene === 'magnet' ? 1.6 : st.scene === 'coil' ? st.I * (st.core ? 1 : 0.35) * 0.9 : 0; }

      /* ---------- 상태에 맞게 보이기 ---------- */
      const ctlNodes = {};
      function show() {
        const sc = st.scene;
        gCoil.visible = sc === 'coil'; gMag.visible = sc !== 'swing' && sc !== 'force'; gSwing.visible = sc === 'force'; gLines.visible = sc !== 'force';
        barN.visible = barS.visible = sc === 'magnet'; mN.show(sc === 'magnet'); mS.show(sc === 'magnet');
        comps.forEach((c) => (c.g.visible = st.comp && sc !== 'force'));
        core.visible = st.core;
        [swN, swS, labB].forEach((l) => l.show(sc === 'force')); if (sc !== 'force') { labF.show(false); labI.show(false); }
        const f = effStrength(), coilOn = sc === 'coil' && st.I > 0;
        [labN, labS, labPlus, labMinus].forEach((l) => l.show(sc === 'coil'));
        capN.visible = capS.visible = sc === 'coil' && coilOn;
        labN.show(sc === 'coil' && coilOn); labS.show(sc === 'coil' && coilOn);
        const nx = st.dir > 0 ? 1 : -1;
        capN.position.x = nx * (L / 2 + 0.2); capS.position.x = -nx * (L / 2 + 0.2);
        batt.children[1].material.color.setHex(st.dir > 0 ? 0xe2464b : 0x2f6df6); batt.children[2].material.color.setHex(st.dir > 0 ? 0x2f6df6 : 0xe2464b);
        labPlus.obj = batt; labPlus.off = [st.dir > 0 ? -0.65 : 0.65, 0.55, 0]; labMinus.off = [st.dir > 0 ? 0.65 : -0.65, 0.55, 0];
        labPlus.el.style.background = '#e2464b'; labMinus.el.style.background = '#2f6df6';
        const lineOn = (sc === 'coil' && coilOn) || sc === 'magnet';
        gLines.visible = lineOn;
        if (lineOn) setLines(sc === 'magnet' ? st.flip : st.dir, 0.25 + 0.6 * Math.min(1, f / 2.4));
        placeBar();
        // 설명
        if (sc === 'coil') {
          const w = st.I < 0.05 ? '' : st.I < 1 ? '약함' : st.I < 2.5 ? '보통' : '강함';
          info(st.I < 0.05 ? '<b>전류가 0이에요.</b><br>전류가 흐르지 않으면 코일은 자석이 아니에요. 나침반은 지구 자기장(뒤쪽)만 가리켜요.'
            : '<b>전자석</b> · 자기장 세기 <b>' + w + '</b><br>🖐 오른손 네 손가락을 <b>전류가 도는 방향</b>으로 감아쥐면 <b>엄지</b>가 가리키는 끝이 <b style="color:#ff8a8f">N극</b>이에요.<br>지금은 <b>' + (st.dir > 0 ? '오른쪽' : '왼쪽') + '</b> 끝이 N극이에요. 전류 방향을 바꾸면 N극과 S극이 바뀌어요.');
        } else if (sc === 'magnet') {
          info('<b>막대자석</b><br>자기력선은 <b style="color:#ff8a8f">N극</b>에서 나와 <b style="color:#8fb0ff">S극</b>으로 들어가고, 자석 안에서는 S극→N극으로 이어진 <b>닫힌 곡선</b>이에요. 나침반의 붉은 바늘이 그 방향을 가리켜요.<br>전자석(코일)의 자기장과 모양이 같아요.');
        } else {
          const fl = st.I * st.dir * st.pole;
          info('<b>도선 그네</b><br>' + (st.I < 0.05 ? '전류가 흐르지 않아 힘이 없어요.' : '전류(' + (st.dir > 0 ? '⊙ 앞쪽' : '⊗ 뒤쪽') + ')와 자기장(' + (st.pole > 0 ? '위→아래' : '아래→위') + ')에 모두 수직인 <b>' + (fl > 0 ? '오른쪽' : '왼쪽') + '</b>으로 힘을 받아요.<br>전류나 자석의 극 중 <b>하나만</b> 바꾸면 힘이 반대, 둘 다 바꾸면 그대로예요.'));
        }
        Object.keys(ctlNodes).forEach((k) => ctlNodes[k].forEach((n) => { const vis = ctlVis[k](); n.style.display = vis ? '' : 'none'; }));
      }
      const ctlVis = { scene: () => true, I: () => st.scene !== 'magnet', dir: () => st.scene !== 'magnet', core: () => st.scene === 'coil', pole: () => st.scene === 'force', flip: () => st.scene === 'magnet', comp: () => st.scene !== 'force' };
      const bar = ctx.renderer.domElement.parentNode.parentNode.querySelector('.v3-ctl');
      function grab(k, fn) { const before = bar.children.length; const r = fn(); ctlNodes[k] = [...bar.children].slice(before); return r; }

      let segCtl, rngCtl;
      segCtl = grab('scene', () => controls.segment('실험', [{ value: 'coil', label: '🌀 전자석' }, { value: 'magnet', label: '🧲 막대자석' }, { value: 'force', label: '🏇 도선 그네' }], st.scene, (v) => { st.scene = v; if ((v === 'coil' || v === 'force') && st.I === 0) { st.I = 2; rngCtl.set(2); } fitCam(); show(); }));
      rngCtl = grab('I', () => controls.range('전류', 0, 3, 0.5, st.I, (v) => { st.I = v; show(); }, (v) => v.toFixed(1) + ' A'));
      grab('dir', () => controls.button('🔁 전류 방향 바꾸기', () => { st.dir = -st.dir; show(); }));
      grab('pole', () => controls.button('🔁 자석 극 바꾸기', () => { st.pole = -st.pole; show(); }));
      grab('flip', () => controls.button('🔁 자석 뒤집기', () => { st.flip = -st.flip; show(); }));
      const coreB = grab('core', () => controls.button('철심 ✓', () => { st.core = !st.core; coreB.classList.toggle('on', st.core); coreB.textContent = '철심 ' + (st.core ? '✓' : '✕'); show(); }));
      const cB = grab('comp', () => controls.button('나침반 ✓', () => { st.comp = !st.comp; cB.classList.toggle('on', st.comp); cB.textContent = '나침반 ' + (st.comp ? '✓' : '✕'); show(); }));
      coreB.classList.add('on'); cB.classList.add('on');
      function fitCam() { }
      show();

      let lastScene = '';
      return {
        update(dt) {
          const sc = st.scene;
          if (sc === 'coil') updateFlow(dt);
          else flow.forEach((c) => (c.visible = false));
          if (sc === 'force') { updateSwing(dt); fixFArrow(); }
          updateCompass(dt);
          if (lastScene !== sc) { lastScene = sc; ctx.orbit.tx = 0; ctx.orbit.ty = sc === 'force' ? 0.6 : -0.3; ctx.orbit.dist = (sc === 'force' ? 14 : 12.5) * KD; }
        },
        sync() {
          const S = lessonS(); if (!S) return;
          st.dir = S.dir || st.dir; st.pole = S.pole || st.pole; if (S.I != null) { st.I = Math.max(0, Math.min(3, S.I)); rngCtl.set(st.I); }
          if (S.scene === 'magnet' || S.scene === 'force' || S.scene === 'coil') { st.scene = S.scene; segCtl.set(st.scene); }
          show();
        },
      };
    },
  });
})();
