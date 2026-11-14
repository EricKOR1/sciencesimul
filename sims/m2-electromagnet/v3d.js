/* m2-electromagnet · 3D 전자석 (코일의 자기장 · 막대자석 · 도선 그네 · 전동기)
   2D 실험의 장면 · 전류의 세기 · 전류 방향 · 자석의 극 · 자기력선 보기를 그대로 따라가요 (3D에서 바꾸면 2D도 바뀌어요).
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
    levels: [1, 2, 3],               // 2~4단계(코일 · 도선 그네 · 전동기). 1단계는 나침반을 끌어 놓는 미션이라 2D
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const V3 = THREE.Vector3, Yax = new V3(0, 1, 0);
      const L = 4, R = 0.85, NT = 10;                       // 코일 길이 · 반지름 · 감은 수
      const lessonS = () => (window.__sim && window.__sim.S) || null;
      const S0 = lessonS();
      const st = {
        scene: S0 && ['force', 'magnet', 'motor', 'coil'].includes(S0.scene) ? S0.scene : 'coil', lines: true, w: 0, phi: 0.4,
        I: S0 ? Math.max(0, Math.min(3, S0.I || 0)) : 0, dir: S0 && S0.dir ? S0.dir : 1, pole: S0 && S0.pole ? S0.pole : 1,
        core: true, comp: true, flip: 1, th: 0, thV: 0,
      };
      if (st.scene === 'coil' && st.I === 0) st.I = 2;
      if (st.scene === 'force' && st.I === 0) st.I = 2;

      /* ---------- 재료 · 도구 ---------- */
      const MT = ctx.mats, lc = (h) => new THREE.Color(h).convertSRGBToLinear();   // 화면에서 색이 바래지 않게 (N극 빨강 · S극 파랑이 또렷하게)
      const mat = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: lc(c), roughness: 0.5, metalness: 0.1 }, o || {}));
      const mag = (c, o) => MT.plastic(lc(c), { roughness: 0.3, extra: o });   // 색칠한 자석: 매끈한 광택
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
      function box(w, h, d, c, o, mk) { return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), (mk || mat)(c, o)); }

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
      const gCoil = new THREE.Group(), gMag = new THREE.Group(), gSwing = new THREE.Group(), gLines = new THREE.Group(), gMotor = new THREE.Group();
      root.add(gCoil, gMag, gSwing, gLines, gMotor);

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
      gCoil.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(helixPts), 520, 0.055, 12, false), MT.metal('copper', { roughness: 0.28 })));
      const leadPts = [pathPts[0], pathPts[1], pathPts[2], pathPts[3]];
      const leadR = [pathPts[pathPts.length - 4], pathPts[pathPts.length - 3], pathPts[pathPts.length - 2], pathPts[pathPts.length - 1]];
      [leadPts, leadR].forEach((pp) => { const g = new THREE.BufferGeometry().setFromPoints(pp); gCoil.add(new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0xb7791f }))); gCoil.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pp, false, 'catmullrom', 0), 20, 0.035, 10, false), MT.metal('copper', { roughness: 0.28 }))); });
      const core = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.62, R * 0.62, L + 0.3, 40), MT.metal('iron', { roughness: 0.4, extra: { transparent: true, opacity: 0.6 } }));
      core.rotation.z = Math.PI / 2; gCoil.add(core);
      const batt = new THREE.Group();
      batt.add(box(1.8, 0.55, 0.55, 0x2a303b, null, mag), (() => { const m = box(0.5, 0.55, 0.58, 0xe2464b, null, mag); m.position.x = -0.65; return m; })(), (() => { const m = box(0.5, 0.55, 0.58, 0x2f6df6, null, mag); m.position.x = 0.65; return m; })());
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
      const barN = box(2, 1.3, 1.3, NC, { transparent: true, opacity: 0.5 }, mag), barS = box(2, 1.3, 1.3, SCOL, { transparent: true, opacity: 0.55 }, mag);
      gMag.add(barN, barS);
      const mN = label('N', barN, { color: '#e2464b', size: 15 }), mS = label('S', barS, { color: '#2f6df6', size: 15 });
      function placeBar() { barN.position.x = 1 * st.flip; barS.position.x = -1 * st.flip; }

      /* ---------- ③ 도선 그네 ---------- */
      const MY = 1.55;
      const magT = box(5, 1.0, 2.1, NC, null, mag), magB = box(5, 1.0, 2.1, SCOL, null, mag);
      magT.position.y = MY + 0.5; magB.position.y = -MY - 0.5; gSwing.add(magT, magB);
      const swN = label('N극', magT, { color: '#e2464b', offset: [-1.9, 0.0, 1.2] }), swS = label('S극', magB, { color: '#2f6df6', offset: [-1.9, 0, 1.2] });
      const fieldArrows = [];
      for (let ix = -1; ix <= 1; ix++) for (let iz = -1; iz <= 1; iz += 2) { const a = mkArrow(0xb79bff, 0.035); gSwing.add(a); fieldArrows.push([a, ix * 1.0, iz * 0.55]); }
      const PIV = 3.9, STR = PIV;                                      // 줄 길이 = 도선이 놓인 높이(0)까지
      const rail = box(0.12, 0.12, 3.0, 0x7b8798, { metalness: 0.85, roughness: 0.3 }); rail.position.y = PIV; gSwing.add(rail);
      const supportL = box(0.12, PIV + 1, 0.12, 0x7b8798), supportR = supportL.clone(); supportL.position.set(0, PIV / 2 - 0.5, -1.55); supportR.position.set(0, PIV / 2 - 0.5, 1.55);
      supportL.visible = supportR.visible = false;
      const swing = new THREE.Group(); swing.position.y = PIV; gSwing.add(swing);
      const strL = box(0.03, STR, 0.03, 0x4b5563), strR = strL.clone(); strL.position.set(0, -STR / 2, -1.25); strR.position.set(0, -STR / 2, 1.25); swing.add(strL, strR);
      const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 2.6, 16), MT.metal('copper', { roughness: 0.28 })); wire.rotation.x = Math.PI / 2; wire.position.y = -STR; swing.add(wire);
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
        magT.material.color.copy(lc(st.pole > 0 ? NC : SCOL)); magB.material.color.copy(lc(st.pole > 0 ? SCOL : NC));
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

      /* ---------- ④ 전동기 (자기장 속에서 전류가 흐르는 코일이 회전) ---------- */
      const mgN = box(1.6, 3.4, 2.6, NC, { transparent: true, opacity: 0.92 }, mag), mgS = box(1.6, 3.4, 2.6, SCOL, { transparent: true, opacity: 0.92 }, mag);
      mgN.position.x = -3.3; mgS.position.x = 3.3; gMotor.add(mgN, mgS);
      const rotor = new THREE.Group(); gMotor.add(rotor);
      const RR = 1.1, ZL = 1.15, cmat = MT.metal('copper', { roughness: 0.28 });
      [[RR, 0], [-RR, 0]].forEach(([x, y]) => { const t = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, ZL * 2, 12), cmat); t.rotation.x = Math.PI / 2; t.position.set(x, y, 0); rotor.add(t); });
      [ZL, -ZL].forEach((z) => { const t = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, RR * 2, 12), cmat); t.rotation.z = Math.PI / 2; t.position.set(0, 0, z); rotor.add(t); });
      const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3.4, 16), MT.metal('steel', { roughness: 0.25 })); axle.rotation.x = Math.PI / 2; gMotor.add(axle);
      const mF = [mkArrow(0xf26b3a, 0.07), mkArrow(0xf26b3a, 0.07)]; mF.forEach((a) => gMotor.add(a));
      const bArr = mkArrow(0xb79bff, 0.035); gMotor.add(bArr); setArrow(bArr, new V3(-2.3, -1.9, 1.2), new V3(2.3, -1.9, 1.2));
      const lmN = label('N극', mgN, { color: '#e2464b', offset: [0, 1.95, 0] }), lmS = label('S극', mgS, { color: '#2f6df6', offset: [0, 1.95, 0] });
      const lmC = label('코일', rotor, { color: '#a16207', offset: [0, 1.5, 0] }), lmF = label('힘', mF[0], { color: '#f26b3a', size: 14, offset: [0, 0.4, 0] }), lmB = label('자기장 B', bArr, { color: '#6d28d9', size: 13, offset: [0, -0.4, 0] });
      const mT = new V3();
      function updateMotor() {
        rotor.rotation.z = st.phi;
        const wa = Math.abs(st.w), sg = Math.sign(st.w) || 1, ls = 0.5 + Math.min(1.4, wa * 0.25);
        [0, 1].forEach((k) => {
          const side = k ? -1 : 1, a = st.phi + (k ? Math.PI : 0);
          const px = Math.cos(a) * RR, py = Math.sin(a) * RR;
          mT.set(-Math.sin(a) * sg, Math.cos(a) * sg, 0);
          setArrow(mF[k], new V3(px, py, ZL + 0.15), new V3(px + mT.x * ls, py + mT.y * ls, ZL + 0.15)); mF[k].visible = wa > 0.3;
        });
        lmF.show(wa > 0.3);
      }

      /* ---------- 실험대 · 받침 · 배경 (보기 좋게 꾸미기) ---------- */
      const cTex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); if (THREE.sRGBEncoding) t.encoding = THREE.sRGBEncoding; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; };
      const TY = -2.75;
      const woodT = cTex(512, 512, (c, w, h) => { c.fillStyle = '#47301a'; c.fillRect(0, 0, w, h); for (let i = 0; i < 90; i++) { c.strokeStyle = 'rgba(' + (30 + (i * 17) % 40) + ',16,6,' + (0.12 + (i % 4) * 0.05) + ')'; c.lineWidth = 1 + (i % 3); c.beginPath(); const y = i / 90 * h; c.moveTo(0, y); for (let x = 0; x <= w; x += 32) c.lineTo(x, y + Math.sin(x * 0.04 + i) * 3); c.stroke(); } }); woodT.repeat.set(2, 2);
      const metalT = cTex(128, 128, (c, w, h) => { c.fillStyle = '#8b94a5'; c.fillRect(0, 0, w, h); for (let i = 0; i < 40; i++) { c.fillStyle = 'rgba(255,255,255,' + Math.random() * 0.12 + ')'; c.fillRect(0, Math.random() * h, w, 1 + Math.random() * 2); } });
      const wallT = cTex(8, 256, (c, w, h) => { const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#27375a'); g.addColorStop(1, '#0e1830'); c.fillStyle = g; c.fillRect(0, 0, w, h); });
      const wallM = new THREE.Mesh(new THREE.PlaneGeometry(90, 40), new THREE.MeshBasicMaterial({ map: wallT })); wallM.position.set(0, 8, -16); root.add(wallM);
      const bench = new THREE.Mesh(new THREE.CylinderGeometry(7, 7, 0.3, 64), mat(0xffffff, { map: woodT, roughness: 0.55 })); bench.position.y = TY - 0.15; bench.receiveShadow = true; root.add(bench);
      const mRing = new THREE.Mesh(new THREE.TorusGeometry(7, 0.05, 8, 96), MT.metal('brass', { roughness: 0.3 })); mRing.rotation.x = Math.PI / 2; mRing.position.y = TY; root.add(mRing);
      [bench, mRing, wallM].forEach((m) => { m.userData.v3bg = true; });   // 실험대 · 테두리 · 벽은 배경: 자동 맞춤이 실험 장치에 맞춰요
      const metalM = MT.metal(0xaab2c0, { brushed: true, roughness: 0.22 });
      const envCoil = new THREE.Group(), envMag = new THREE.Group(), envSwing = new THREE.Group(), envMotor = new THREE.Group(); root.add(envCoil, envMag, envSwing, envMotor);
      const post = (g, x, z, y0, y1, r) => { const p = new THREE.Mesh(new THREE.CylinderGeometry(r || 0.09, r || 0.09, y1 - y0, 14), metalM); p.position.set(x, (y0 + y1) / 2, z); g.add(p); const b = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.45, 0.14, 24), metalM); b.position.set(x, y0 + 0.07, z); g.add(b); };
      // 코일: 도선을 받치는 기둥 + 단자
      [-1, 1].forEach((sx) => { post(envCoil, sx * (L / 2 + 0.6), -0.45, TY, R + 0.15, 0.07); const cl = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.03, 8, 16), metalM); cl.position.set(sx * (L / 2 + 0.6), R + 0.1, -0.45); envCoil.add(cl); });
      // 막대자석: 나무 받침대
      [-1, 1].forEach((sx) => { const c = new THREE.Mesh(new THREE.BoxGeometry(0.45, 2.0, 1.6), mat(0xffffff, { map: woodT, roughness: 0.6 })); c.position.set(sx * 1.4, TY + 1.0, 0); envMag.add(c); const t = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.15, 1.7), metalM); t.position.set(sx * 1.4, TY + 2.05, 0); envMag.add(t); });
      // 도선 그네: 철 틀(요크)과 받침판
      { const yk = new THREE.Mesh(new THREE.BoxGeometry(5.2, 5.6, 0.3), metalM); yk.position.set(0, TY + 2.8, -1.35); envSwing.add(yk);
        const bp = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.2, 2.5), metalM); bp.position.set(0, TY + 0.1, -0.1); envSwing.add(bp);
        for (const sz of [-1, 1]) post(envSwing, 0, sz * 1.55, TY, PIV + 0.05, 0.06); }
      // 전동기: 받침대 + 정류자(갈라진 고리) + 솔
      { [-1, 1].forEach((sx) => { const pd = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.05, 2.8), metalM); pd.position.set(sx * 3.3, TY + 0.52, 0); envMotor.add(pd); });
        const cm = MT.metal('copper', { roughness: 0.28 });
        for (const k of [0, 1]) { const h = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.4, 20, 1, false, k * Math.PI + 0.1, Math.PI - 0.2), cm); h.rotation.x = Math.PI / 2; h.position.z = 1.9; rotor.add(h); }
        for (const sy of [-1, 1]) { const br = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.5, 0.3), mat(0x222831, { roughness: 0.8 })); br.position.set(0, sy * 0.55, 1.9); gMotor.add(br); } }
      /* ---------- 나침반 ---------- */
      const comps = [];
      const CPOS = [[3.3, 0, 0.3], [-3.3, 0, 0.3], [0, 1.9, 0.3], [2.1, 1.6, 0.3], [-2.1, 1.6, 0.3], [0, -1.0, 1.5]];
      CPOS.forEach((p) => {
        const g = new THREE.Group(); g.position.set(p[0], p[1], p[2]);
        const shell = new THREE.Mesh(new THREE.SphereGeometry(0.34, 28, 20), MT.glass({ opacity: 0.2, extra: { side: THREE.FrontSide } }));
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
        envCoil.visible = sc === 'coil'; envMag.visible = sc === 'magnet'; envSwing.visible = sc === 'force'; envMotor.visible = sc === 'motor'; gCoil.visible = sc === 'coil'; gMag.visible = sc === 'coil' || sc === 'magnet'; gSwing.visible = sc === 'force'; gMotor.visible = sc === 'motor'; gLines.visible = sc === 'coil' || sc === 'magnet';
        [lmN, lmS, lmC, lmB].forEach((l) => l.show(sc === 'motor'));
        barN.visible = barS.visible = sc === 'magnet'; mN.show(sc === 'magnet'); mS.show(sc === 'magnet');
        comps.forEach((c) => (c.g.visible = st.comp && (sc === 'coil' || sc === 'magnet')));
        core.visible = st.core;
        [swN, swS, labB].forEach((l) => l.show(sc === 'force')); if (sc !== 'force') { labF.show(false); labI.show(false); } if (sc !== 'motor') lmF.show(false);
        const f = effStrength(), coilOn = sc === 'coil' && st.I > 0;
        [labN, labS, labPlus, labMinus].forEach((l) => l.show(sc === 'coil'));
        capN.visible = capS.visible = sc === 'coil' && coilOn;
        labN.show(sc === 'coil' && coilOn); labS.show(sc === 'coil' && coilOn);
        const nx = st.dir > 0 ? 1 : -1;
        capN.position.x = nx * (L / 2 + 0.2); capS.position.x = -nx * (L / 2 + 0.2);
        batt.children[1].material.color.copy(lc(st.dir > 0 ? 0xe2464b : 0x2f6df6)); batt.children[2].material.color.copy(lc(st.dir > 0 ? 0x2f6df6 : 0xe2464b));
        labPlus.obj = batt; labPlus.off = [st.dir > 0 ? -0.65 : 0.65, 0.55, 0]; labMinus.off = [st.dir > 0 ? 0.65 : -0.65, 0.55, 0];
        labPlus.el.style.background = '#e2464b'; labMinus.el.style.background = '#2f6df6';
        const lineOn = (sc === 'coil' && coilOn) || (sc === 'magnet' && st.lines);
        gLines.visible = lineOn;
        if (lineOn) setLines(sc === 'magnet' ? st.flip : st.dir, 0.25 + 0.6 * Math.min(1, f / 2.4));
        placeBar();
        // 설명
        if (sc === 'coil') {
          const w = st.I < 0.05 ? '' : st.I < 1 ? '약함' : st.I < 2.5 ? '보통' : '강함';
          info(st.I < 0.05 ? '<b>전류가 0이에요.</b><br>전류가 흐르지 않으면 코일은 자석이 아니에요. 나침반은 지구 자기장(뒤쪽)만 가리켜요.'
            : '<b>전자석</b> · 자기장 세기 <b>' + w + '</b><br>🖐 오른손 네 손가락을 <b>전류가 도는 방향</b>으로 감아쥐면 <b>엄지</b>가 가리키는 끝이 <b style="color:#ff8a8f">N극</b>이에요.<br>지금은 <b>' + (st.dir > 0 ? '오른쪽' : '왼쪽') + '</b> 끝이 N극이에요.');
        } else if (sc === 'magnet') {
          info('<b>막대자석</b><br>자기력선은 <b style="color:#ff8a8f">N극</b>에서 나와 <b style="color:#8fb0ff">S극</b>으로 들어가고, 자석 안에서는 S극→N극으로 이어진 <b>닫힌 곡선</b>이에요. 나침반의 붉은 바늘이 그 방향을 가리켜요.<br>전자석(코일)의 자기장과 모양이 같아요.');
        } else if (sc === 'motor') {
          const wa = Math.abs(st.w);
          info('<b>전동기 (모터)</b><br>자석(N극·S극) 사이에 코일이 있어요. 코일에 전류를 흘려 보세요.<br>' + (st.I < 0.05 ? '전류가 0이라 코일이 돌지 않아요.' : '전류 <b>' + st.I.toFixed(1) + ' A</b>' + (wa > 0.3 ? ' · 코일이 ' + (st.w > 0 ? '시계 반대 방향' : '시계 방향') + '으로 돌아요' : '')));
        } else {
          const fl = st.I * st.dir * st.pole;
          info('<b>도선 그네</b><br>' + (st.I < 0.05 ? '전류가 흐르지 않아 힘이 없어요.' : '전류(' + (st.dir > 0 ? '⊙ 앞쪽' : '⊗ 뒤쪽') + ')와 자기장(' + (st.pole > 0 ? '위→아래' : '아래→위') + ')에 모두 수직인 <b>' + (fl > 0 ? '오른쪽' : '왼쪽') + '</b>으로 힘을 받아요.'));
        }
        Object.keys(ctlNodes).forEach((k) => ctlNodes[k].forEach((n) => { const vis = ctlVis[k](); n.style.display = vis ? '' : 'none'; }));
      }
      const ctlVis = { I: () => st.scene !== 'magnet', dir: () => st.scene !== 'magnet', core: () => st.scene === 'coil', pole: () => st.scene === 'force', comp: () => st.scene === 'coil' || st.scene === 'magnet' };
      const bar = ctx.renderer.domElement.parentNode.parentNode.querySelector('.v3-ctl');
      function grab(k, fn) { const before = bar.children.length; const r = fn(); ctlNodes[k] = [...bar.children].slice(before); return r; }

      let segCtl, rngCtl;
      // 2D 실험의 조작을 그대로 불러서 3D에서 바꿔도 2D가 같이 바뀌어요
      const L2 = () => window.__sim || null, click2 = (id) => { const b = document.getElementById(id); if (b) b.click(); };
      rngCtl = grab('I', () => controls.range('전류', 0, 3, 0.5, st.I, (v) => { st.I = v; const l = L2(); if (l && l.setCurrent) l.setCurrent(v); show(); }, (v) => v.toFixed(1) + ' A'));
      grab('dir', () => controls.button('🔁 전류 방향 바꾸기', () => { click2('dirBtn'); from2D(); }));
      grab('pole', () => controls.button('🔁 자석 극 바꾸기', () => { click2('poleBtn'); from2D(); }));
      const coreB = grab('core', () => controls.button('철심 ✓', () => { st.core = !st.core; coreB.classList.toggle('on', st.core); coreB.textContent = '철심 ' + (st.core ? '✓' : '✕'); show(); }));
      const cB = grab('comp', () => controls.button('나침반 ✓', () => { st.comp = !st.comp; cB.classList.toggle('on', st.comp); cB.textContent = '나침반 ' + (st.comp ? '✓' : '✕'); show(); }));
      coreB.classList.add('on'); cB.classList.add('on');
      function fitCam() { }
      show();

      let lastScene = '', k0 = 0;
      function from2D() {
        const S = lessonS(); if (!S) return;
        let ch = false;
        if (S.scene && S.scene !== st.scene && ['coil', 'magnet', 'force', 'motor'].includes(S.scene)) { st.scene = S.scene; ch = true; }
        if (S.dir && S.dir !== st.dir) { st.dir = S.dir; ch = true; }
        if (S.pole && S.pole !== st.pole) { st.pole = S.pole; ch = true; }
        if (S.I != null && Math.abs(S.I - st.I) > 1e-6) { st.I = Math.max(0, Math.min(3, S.I)); rngCtl.set(st.I); ch = true; }
        const ln = !!(S.lines || S.fill); if (ln !== st.lines) { st.lines = ln; ch = true; }
        if (typeof S.w === 'number') st.w = S.w; if (typeof S.phi === 'number') st.phi = S.phi;
        if (ch) show();
      }
      return {
        update(dt) {
          if ((k0++ % 4) === 0) from2D();
          const sc = st.scene;
          if (sc === 'motor') { updateMotor(); if ((k0 % 12) === 0) show(); }
          if (sc === 'coil') updateFlow(dt);
          else flow.forEach((c) => (c.visible = false));
          if (sc === 'force') { updateSwing(dt); fixFArrow(); }
          updateCompass(dt);
          if (lastScene !== sc) { lastScene = sc; ctx.orbit.tx = 0; ctx.orbit.ty = sc === 'force' ? 0.6 : sc === 'motor' ? 0 : -0.3; ctx.orbit.dist = (sc === 'force' ? 13 : sc === 'motor' ? 14 : sc === 'magnet' ? 9.5 : 12.5) * KD; }
        },
        sync() { from2D(); show(); },
      };
    },
  });
})();
