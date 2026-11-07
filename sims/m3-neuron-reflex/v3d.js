/* m3-neuron-reflex · 3D 뉴런과 반사궁
   뉴런: 가지 돌기 → 신경 세포체 → 축삭 돌기 → 축삭 말단 방향으로 자극이 전달돼요.
   반사: 자극 → 감각 뉴런 → 연합 뉴런(척수) → 운동 뉴런 → 반응. 뇌를 거치지 않아 더 빨라요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHN = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  window.SciSim3D.attach({
    host: '.stage-card',
    title: '뉴런과 반사 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: PHN ? 21 : 16, theta: 0.0, phi: 1.3, min: 6, max: 32, target: [2.5, 1.2, 0] },
    autoRotate: 0,
    levels: [0],              // 1단계(뉴런: 자극은 ▶ 신호 전달, 세 뉴런 읽기는 3D 막대의 뉴런 단추)만 3D. 뇌 부분 짝짓기 · 자 잡기 · 반사 막대 그래프 · 경로 카드는 화면을 눌러야 해서 2D
    build(ctx) {
      const { THREE, root, label, info, controls, orbit } = ctx;
      const V3 = THREE.Vector3;
      let mode = 'neuron', myelin = true, names = true, rpath = 'reflex';
      const sm = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.45, metalness: 0 }, o || {}));
      const nG = new THREE.Group(), rG = new THREE.Group(); root.add(nG, rG);
      const labs = { n: [], r: [] };
      const L = (g, text, pos, col) => { const l = label(text, pos, { size: 12, color: col || 'rgba(15,23,42,.9)' }); labs[g].push(l); return l; };
      const tube = (pts, r, c, o) => { const cu = new THREE.CatmullRomCurve3(pts.map((p) => new V3(p[0], p[1], p[2]))); return { cu, mesh: new THREE.Mesh(new THREE.TubeGeometry(cu, Math.max(8, pts.length * 14), r, 10, false), sm(c, o)) }; };
      const glowM = new THREE.MeshBasicMaterial({ color: 0xfff176 });
      const pulse = new THREE.Mesh(new THREE.SphereGeometry(0.2, 20, 14), glowM); const halo = new THREE.Mesh(new THREE.SphereGeometry(0.42, 20, 14), new THREE.MeshBasicMaterial({ color: 0xfde047, transparent: true, opacity: 0.35, depthWrite: false })); pulse.add(halo); root.add(pulse); pulse.visible = false;
      /* ============ 뉴런 ============ */
      const NC = 0xf59e0b;
      const soma = new THREE.Mesh(new THREE.SphereGeometry(0.85, 40, 28), sm(NC, { roughness: 0.35 })); soma.position.set(0, 0, 0); nG.add(soma);
      const nuc = new THREE.Mesh(new THREE.SphereGeometry(0.38, 24, 18), sm(0x7c2d12)); nuc.position.set(0.05, 0.05, 0.28); nG.add(nuc);
      const dends = [];
      [[-1, 0.9, 0.2], [-1.2, 0.3, -0.5], [-1, -0.6, 0.4], [-0.7, -1.2, -0.2], [-0.3, 1.4, -0.3], [-0.6, 1.1, 0.6]].forEach((d, i) => {
        const dir = new V3(d[0], d[1], d[2]).normalize(), base = dir.clone().multiplyScalar(0.8), mid = dir.clone().multiplyScalar(1.9).add(new V3(0, 0.15 * (i % 2 ? 1 : -1), 0)), tip = dir.clone().multiplyScalar(3.2).add(new V3(-0.2, 0.3 * (i % 3 - 1), 0.2));
        const t = tube([base.toArray(), mid.toArray(), tip.toArray()], 0.075, NC, { roughness: 0.4 }); nG.add(t.mesh); dends.push(t);
        [-1, 1].forEach((s) => { const e = tip.clone().add(new V3(-0.9, s * 0.55, (i % 2 ? 0.3 : -0.3))); const t2 = tube([mid.clone().lerp(tip, 0.6).toArray(), tip.toArray(), e.toArray()], 0.045, NC, { roughness: 0.4 }); nG.add(t2.mesh); });
      });
      const AX = [[0.7, 0, 0], [2, 0.15, 0], [4, -0.2, 0], [6, 0.2, 0], [8, -0.1, 0], [9.6, 0, 0]];
      const axon = tube(AX, 0.11, 0xfbbf24, { roughness: 0.4 }); nG.add(axon.mesh);
      const sheath = new THREE.Group(); nG.add(sheath);
      const NS = 7; for (let i = 0; i < NS; i++) { const a = 0.07 + i * 0.125, b = a + 0.095; const pa = axon.cu.getPointAt(a), pb = axon.cu.getPointAt(b), mid = pa.clone().add(pb).multiplyScalar(0.5), d = pb.clone().sub(pa); const m = new THREE.Mesh(new THREE.CapsuleGeometry(0.27, d.length() - 0.5, 8, 24), sm(0xf8fafc, { roughness: 0.3 })); m.position.copy(mid); m.quaternion.setFromUnitVectors(new V3(0, 1, 0), d.clone().normalize()); sheath.add(m); }
      const endP = axon.cu.getPointAt(1);
      [[0.6, 0.7, 0.2], [1.1, 0.25, -0.2], [1.3, -0.3, 0.3], [0.9, -0.8, -0.2]].forEach((e) => { const p = endP.clone().add(new V3(e[0], e[1], e[2])); const t = tube([endP.toArray(), endP.clone().lerp(p, 0.6).toArray(), p.toArray()], 0.05, NC); nG.add(t.mesh); const b = new THREE.Mesh(new THREE.SphereGeometry(0.17, 18, 12), sm(0xf97316)); b.position.copy(p); nG.add(b); });
      L('n', '가지 돌기', [-2.9, 1.6, 0]); L('n', '신경 세포체', [0, -1.15, 0.2]); L('n', '핵', [0.1, 0.45, 0.5]); L('n', '축삭 돌기', [8.0, 0.55, 0]); L('n', '말이집', [3.6, 0.6, 0.2]); L('n', '랑비에 결절', [4.7, -0.7, 0], 'rgba(120,53,15,.9)'); L('n', '축삭 말단', [10.4, 1.3, 0]);
      /* 자극 이동 경로: 가지 돌기 끝 → 세포체 → 축삭 */
      const nPath = (() => { const d = dends[0].cu; const pts = []; for (let i = 0; i <= 12; i++) pts.push(d.getPoint(1 - i / 12)); for (let i = 1; i <= 40; i++) pts.push(axon.cu.getPointAt(i / 40)); return new THREE.CatmullRomCurve3(pts); })();
      /* ============ 반사궁 ============ */
      const cord = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.7, 1.2, 48), sm(0xe5e7eb, { roughness: 0.5 })); cord.rotation.x = Math.PI / 2; cord.position.set(0, 0, 0); rG.add(cord);
      const grey = sm(0x9ca3af, { roughness: 0.6 });
      [[-0.45, 0.62, 0.38, 0.55], [0.45, 0.62, 0.38, 0.55], [-0.45, -0.62, 0.38, 0.55], [0.45, -0.62, 0.38, 0.55], [0, 0, 0.55, 0.45]].forEach((q) => { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), grey); m.scale.set(q[2], q[3], 0.62); m.position.set(q[0], q[1], 0.0); rG.add(m); });
      const cdisc = new THREE.Mesh(new THREE.CircleGeometry(1.69, 48), sm(0xf3f4f6, { roughness: 0.6 })); cdisc.position.z = 0.61; rG.add(cdisc);
      const gdisc = [[-0.45, 0.62, 0.38, 0.55], [0.45, 0.62, 0.38, 0.55], [-0.45, -0.62, 0.38, 0.55], [0.45, -0.62, 0.38, 0.55], [0, 0, 0.55, 0.45]].map((q) => { const m = new THREE.Mesh(new THREE.CircleGeometry(1, 28), sm(0x9ca3af, { roughness: 0.7 })); m.scale.set(q[2], q[3], 1); m.position.set(q[0], q[1], 0.615); rG.add(m); return m; });
      const SENSO = 0x38bdf8, ASSOC = 0xa78bfa, MOTOR = 0xfb923c;
      const finger = new THREE.Group(); const fm = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 1.2, 8, 16), sm(0xf3b79a, { roughness: 0.7 })); fm.rotation.z = Math.PI / 2; finger.add(fm); finger.position.set(5.6, 3.6, 0); rG.add(finger);
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.4, 1.0, 20), new THREE.MeshBasicMaterial({ color: 0xff7a1a })); flame.position.set(7.2, 3.0, 0); rG.add(flame); const flame2 = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.6, 16), new THREE.MeshBasicMaterial({ color: 0xffd34d })); flame2.position.set(7.2, 2.85, 0.02); rG.add(flame2);
      const muscle = new THREE.Mesh(new THREE.CapsuleGeometry(0.4, 2.2, 8, 20), sm(0xdc2626, { roughness: 0.5 })); muscle.rotation.z = Math.PI / 2 - 0.5; muscle.position.set(5.2, -2.6, 0); rG.add(muscle);
      const sens = tube([[5.0, 3.5, 0.15], [3.6, 3.3, 0.2], [2.4, 2.6, 0.2], [1.4, 1.6, 0.4], [0.7, 0.95, 0.62]], 0.075, SENSO, { emissive: SENSO, emissiveIntensity: 0.25 }); rG.add(sens.mesh);
      const gang = new THREE.Mesh(new THREE.SphereGeometry(0.26, 18, 14), sm(SENSO)); gang.position.set(2.4, 2.6, 0.2); rG.add(gang);
      const assoc = tube([[0.7, 0.95, 0.63], [0.55, 0.3, 0.64], [0.55, -0.3, 0.64], [0.7, -0.95, 0.63]], 0.085, ASSOC, { emissive: ASSOC, emissiveIntensity: 0.25 }); rG.add(assoc.mesh);
      const motor = tube([[0.7, -0.95, 0.63], [1.3, -1.7, 0.5], [2.4, -2.3, 0.3], [3.6, -2.4, 0.2], [4.4, -2.5, 0.15]], 0.085, MOTOR, { emissive: MOTOR, emissiveIntensity: 0.25 }); rG.add(motor.mesh);
      const brain = new THREE.Mesh(new THREE.SphereGeometry(1.6, 40, 28), sm(0xf9a8d4, { roughness: 0.6 })); brain.scale.set(1.15, 0.85, 0.8); brain.position.set(-0.9, 6.0, 0); rG.add(brain);
      const upC = tube([[0.2, 0.95, 0.64], [-0.2, 2.0, 0.5], [-0.5, 3.4, 0.3], [-0.7, 4.8, 0.1]], 0.07, ASSOC, { emissive: ASSOC, emissiveIntensity: 0.25 }); rG.add(upC.mesh);
      const dnC = tube([[-1.3, 4.8, 0.1], [-1.2, 3.4, 0.3], [-1.1, 2.0, 0.5], [-0.2, -0.6, 0.64], [0.7, -0.95, 0.63]], 0.07, ASSOC, { emissive: ASSOC, emissiveIntensity: 0.25 }); rG.add(dnC.mesh);
      L('r', '피부 (자극)', [5.7, 4.5, 0]); L('r', '감각 뉴런', [3.4, 3.7, 0.2], 'rgba(3,105,161,.92)'); L('r', '척수', [-0.2, -2.1, 0.6]); L('r', '연합 뉴런', [-1.5, 0.2, 0.7], 'rgba(109,40,217,.92)'); L('r', '운동 뉴런', [2.5, -1.6, 0.3], 'rgba(194,65,12,.92)'); L('r', '근육 (반응)', [5.3, -3.6, 0]); L('r', '뇌', [-0.9, 7.4, 0]);
      const stepLab = label('', pulse, { size: 13, color: 'rgba(15,23,42,.92)', offset: [0, 0.6, 0] });
      function curveSeg(c, rev) { const pts = c.getPoints(24); return rev ? pts.reverse() : pts; }
      function makePath() {
        const segs = rpath === 'reflex' ? [['① 감각 뉴런', SENSO, sens.cu], ['② 연합 뉴런', ASSOC, assoc.cu], ['③ 운동 뉴런', MOTOR, motor.cu]] : [['① 감각 뉴런', SENSO, sens.cu], ['② 연합 뉴런 → 뇌', ASSOC, upC.cu], ['③ 뇌 → 척수', ASSOC, dnC.cu], ['④ 운동 뉴런', MOTOR, motor.cu]];
        return segs;
      }
      let segs = makePath(), tPath = -1, seg = 0, segT = 0, hold = 0, done = false, react = 0;
      function play() { segs = makePath(); tPath = 0; seg = 0; segT = 0; hold = 0; done = false; react = 0; pulse.visible = true; }
      function rinfo() {
        const names2 = segs.map((s, i) => (i === seg && tPath >= 0 && !done ? '<b>' + s[0] + '</b>' : s[0]));
        info('<b>' + (rpath === 'reflex' ? '반사' : '의식적 반응') + '</b> (' + (rpath === 'reflex' ? '뇌를 거치지 않아요 → 더 빨라요' : '뇌가 판단해서 → 더 느려요') + ')<br>자극 → ' + names2.join(' → ') + ' → 반응');
      }

      /* ============ 신경계 (뇌의 부분 · 척수 · 말초 신경) — 2D '신경계' 장면과 같은 모양 ============ */
      const bG = new THREE.Group(); root.add(bG); bG.visible = false;
      const bX = (x) => (x - 150) * 0.03, bY = (y) => -(y - 150) * 0.03;
      const REG = {};
      const REGD = [['cerebrum', 1.7], ['cerebellum', 1.3], ['diencephalon', 0.9], ['midbrain', 0.8], ['medulla', 0.8], ['cord', 0.6]];
      const R_LAB = {};
      function regionShape(poly) { const cu = new THREE.CatmullRomCurve3(poly.map((p) => new V3(bX(p[0]), bY(p[1]), 0)), true, 'catmullrom', 0.5); return new THREE.Shape(cu.getPoints(90).map((q) => new THREE.Vector2(q.x, q.y))); }
      let brainReady = false;
      function initBrain(L) {
        const RG = L.REGIONS; if (!RG) return false;
        REGD.forEach(([id, dep]) => {
          const R = RG[id], g = new THREE.ExtrudeGeometry(regionShape(R.poly), { depth: dep, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.09, bevelSegments: 3, curveSegments: 6 });
          g.translate(0, 0, -dep / 2);
          const m = new THREE.Mesh(g, sm(new THREE.Color(R.col), { roughness: 0.5, emissive: new THREE.Color(R.deep), emissiveIntensity: 0 })); bG.add(m);
          const cx = R.lab ? R.lab[0] : 150, cy = R.lab ? R.lab[1] : 90;
          const lb = label(R.name, [bX(id === 'cerebrum' ? 92 : cx), bY(id === 'cerebrum' ? 62 : cy), dep / 2 + 0.25], { size: 12, color: 'rgba(15,23,42,.88)' }); lb.show(false);
          REG[id] = { m, R, lb, col: new THREE.Color(R.col), deep: new THREE.Color(R.deep) };
        });
        /* 말초 신경: 척수에서 갈라져 나와 온몸으로 (파랑: 감각 신경 · 주황: 운동 신경 신호가 오가요) */
        [[[150, 300], [100, 330], [66, 372]], [[150, 300], [200, 330], [234, 372]], [[150, 312], [128, 350], [118, 395]], [[150, 312], [172, 350], [182, 395]]].forEach((pts) => {
          const cu = new THREE.CatmullRomCurve3(pts.map((p) => new V3(bX(p[0]), bY(p[1]), 0.5)));
          const t = new THREE.Mesh(new THREE.TubeGeometry(cu, 24, 0.07, 8), sm(0x14a39a, { emissive: 0x14a39a, emissiveIntensity: 0.15 })); bG.add(t); periph.push({ cu, t });
        });
        brainReady = true; return true;
      }
      const periph = [], pulsesB = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 8), new THREE.MeshBasicMaterial({ color: i % 2 ? 0xffab4a : 0x5aa2ff })); m.visible = false; bG.add(m); return m; });
      const bLab = label('말초 신경계', [bX(100), bY(345), 0.7], { size: 12, color: 'rgba(15,118,110,.92)' }); bLab.show(false);
      const cnsLab = label('중추 신경계 (뇌 + 척수)', [bX(150), bY(2), -0.2], { size: 12, color: 'rgba(194,65,12,.92)' }); cnsLab.show(false);
      const hostN = ctx.controls.text('').parentNode, tailN = (fn) => { const n0 = hostN.children.length; fn(); return Array.from(hostN.children).slice(n0); };
      const BRIDS = ['cerebrum', 'cerebellum', 'diencephalon', 'midbrain', 'medulla', 'cord', 'periph'];
      const BRN = { cerebrum: '대뇌', cerebellum: '소뇌', diencephalon: '간뇌', midbrain: '중간뇌', medulla: '연수', cord: '척수', periph: '말초 신경' };
      let brSeg = null; const hostN0 = hostN;
      const brRow = tailN(() => { brSeg = controls.segment('신경계', BRIDS.map((id) => ({ value: id, label: BRN[id] })), '', (v) => { const L2 = ctx.lesson(); if (!L2 || !L2.NS || L2.NS.match.on) return; const N2 = L2.NS; if (v === 'periph') N2.sel = 'periph'; else { N2.sel = N2.sel === v ? null : v; if (N2.sel) N2.seen.add(N2.sel); } }); });
      brRow.forEach((e) => { e.style.display = 'none'; });
      let brSig = '';
      function nervFrame(L, t) {
        if (!brainReady && !initBrain(L)) return;
        const N2 = L.NS, sel = N2.sel, mt = N2.match.on;
        BRIDS.forEach((id) => { if (id !== 'periph') { const q = REG[id], h = (N2.hl && N2.hl[id]) || 0; q.m.material.emissiveIntensity = 0.55 * h; q.m.material.color.copy(q.col).lerp(q.deep, h * 0.75); q.lb.show(names); } });
        periph.forEach((q) => { q.t.material.emissiveIntensity = 0.15 + 0.7 * N2.periph; q.t.scale.set(1 + N2.periph * 0.5, 1 + N2.periph * 0.5, 1 + N2.periph * 0.5); });
        pulsesB.forEach((p, i) => { const q = periph[i >> 1], u = ((t * 0.45 + i * 0.37) % 1), f = (i % 2 ? u : 1 - u); p.visible = true; p.position.copy(q.cu.getPointAt(f)); });
        bLab.show(names); cnsLab.show(names);
        const key = (sel || '') + '|' + N2.seen.size + '|' + mt;
        if (key !== brSig) {
          brSig = key; if (brSeg) brSeg.set(sel || '');
          if (mt) info('<b>뇌의 부분 짝짓기</b>: 상황에 맞는 뇌의 부분을 골라요. 뇌의 각 부분의 모양과 위치를 살펴봐요.');
          else if (sel === 'periph') info('<b>말초 신경계</b>: 감각 신경과 운동 신경이 온몸에 퍼져 중추 신경계와 몸 곳곳을 이어 줘요. (심장·소화 기관을 조절하는 자율 신경도 있어요.)');
          else if (sel) { const R = L.REGIONS[sel]; info('<b>' + R.name + '</b> · ' + R.ex + '<br>' + R.info); }
          else info('<b>뇌의 부분과 척수</b>를 골라 보세요. (찾은 곳 ' + N2.seen.size + ' / 6)<br>대뇌 · 소뇌 · 간뇌 · 중간뇌 · 연수 · 척수');
        }
        bG.rotation.y = Math.sin(t * 0.35) * 0.35;
      }
      function sw() { if (typeof mb !== 'undefined') mb.style.display = mode === 'neuron' ? '' : 'none'; }
      function setMode(m) { mode = m; nG.visible = m === 'neuron'; rG.visible = m === 'reflex'; bG.visible = m === 'nervous'; if (typeof brRow !== 'undefined') { brRow.forEach((e) => { e.style.display = m === 'nervous' ? '' : 'none'; }); const pr = hostN0 && hostN0.querySelector('.v3-player'); if (pr) pr.style.display = m === 'nervous' ? 'none' : ''; }
        if (m === 'nervous') { orbit.tx = 0; orbit.ty = -0.6; orbit.dist = PHN ? 24 : 19; labs.n.forEach((l) => l.show(false)); labs.r.forEach((l) => l.show(false)); stepLab.show(false); cnsLab.show(names); bLab.show(names); mb.style.display = 'none'; info('<b>신경계</b>'); return; }
        if (typeof cnsLab !== 'undefined') { cnsLab.show(false); bLab.show(false); Object.keys(REG).forEach((id) => REG[id].lb.show(false)); } pulse.visible = false; tPath = -1; done = false; react = 0; labelsShow(); orbit.tx = m === 'neuron' ? 4.8 : 2.4; orbit.ty = m === 'neuron' ? 0 : 1.3; orbit.dist = m === 'neuron' ? (PHN ? 24 : 15.5) : (PHN ? 21 : 16); if (m === 'neuron') info('<b>뉴런(신경 세포)</b>: 자극은 <b>가지 돌기 → 신경 세포체 → 축삭 돌기 → 축삭 돌기 끝</b> 방향으로만 전달돼요.<br>말이집이 있으면 자극이 랑비에 결절을 건너뛰며 빨리 전달돼요.'); else { segs = makePath(); rinfo(); } sw(); }
      function labelsShow() { labs.n.forEach((l) => l.show(names && mode === 'neuron')); labs.r.forEach((l) => l.show(names && mode === 'reflex')); stepLab.show(false); }
      const mb = controls.button('말이집 ✓', () => { myelin = !myelin; mb.textContent = '말이집 ' + (myelin ? '✓' : '✕'); sheath.visible = myelin; }); mb.classList.add('on');
      const nb = controls.button('이름 ✓', () => { names = !names; nb.textContent = '이름 ' + (names ? '✓' : '✕'); labelsShow(); }); nb.classList.add('on');
      /* ▶ 신호 전달: 2D 화면과 같은 장면 (뉴런 · 뉴런 연결 · 자 잡기 · 반사). p로만 움직여서 진행 막대로 골라 볼 수 있어요 */
      let first = true, p3 = 0, reflexRF = null;
      const pl = controls.player({
        duration: 6, loop: true, label: '신호 전달',
        phases: [[0, '자극'], [0.08, '① 가지 돌기 → 축삭 돌기'], [0.85, '반응']],
        onFrame(p) {
          p3 = p; if (first) return;
          const L = ctx.lesson(); if (!L || !L.S || p > 0.05) return;
          if (L.S.scene === 'neuron' && L.fireStim) L.fireStim();            // 뉴런 1개 · 뉴런 연결: 2D의 ⚡ 자극 주기와 같아요
          else if (L.S.scene === 'reflex' && L.S.scene && L.RF && L.RF.t < 0 && L.runReflex) L.runReflex();
        },
      });
      first = false;
      /* 뉴런 연결: 세 뉴런 읽기 (2D에서 뉴런을 누르는 것과 같아요 → readNeuron) */
      const nvRow = tailN(() => { controls.text('<b>뉴런</b>'); [['sens', '감각 뉴런'], ['assoc', '연합 뉴런'], ['motor', '운동 뉴런']].forEach(([k, nm]) => controls.button(nm, () => { const L2 = ctx.lesson(); const r = L2 && L2.readNeuron && L2.readNeuron(k); if (r) { info('<b>' + r[0] + '</b> · ' + r[1]); } })); });
      function sceneOf(L) {
        const S = L && L.S ? L.S.scene : 'neuron';
        if (S === 'neuron') return (L.NV && L.NV.view === 'chain') ? ['reflex', 'reflex'] : ['neuron', 'reflex'];
        if (S === 'ruler') return ['reflex', 'brain'];
        if (S === 'nervous') return ['nervous', 'reflex'];
        return ['reflex', 'reflex'];
      }
      let key = '';
      setMode('neuron');
      return {
        update(dt, t) {
          const L = ctx.lesson(), sc = sceneOf(L), k = sc.join('|') + '|' + (L && L.RF ? L.RF.mode : '') + '|' + (L && L.S ? L.S.scene : '');
          const chainOn = !!(L && L.S && L.S.scene === 'neuron' && L.NV && L.NV.view === 'chain');
          nvRow.forEach((e) => { e.style.display = chainOn ? '' : 'none'; });
          if (k !== key) {
            key = k;
            if (sc[0] !== mode) setMode(sc[0]);
            if (sc[1] !== rpath) { rpath = sc[1]; }
            segs = makePath(); done = false; react = 0; tPath = -1; pulse.visible = false; mb.style.display = mode === 'neuron' ? '' : 'none';
            const M = L && L.RFM && L.S && L.S.scene === 'reflex' ? L.RFM[L.RF.mode] : null;
            flame.visible = flame2.visible = mode === 'reflex' && (!M || L.RF.mode === 'hot');
            if (mode === 'reflex') { rinfo(); if (M) info('<b>' + M.name + '</b> (' + M.center + '이 중추 · 뇌를 거치지 않아요 → 더 빨라요)<br>자극 → 감각 신경 → <b>' + M.center + '</b> → 운동 신경 → 반응<br><span style="opacity:.85">' + M.note + '</span>'); }
          }
          if (mode === 'nervous') { if (L) nervFrame(L, t); return; }
          flame.scale.y = 1 + Math.sin(t * 9) * 0.08; flame2.scale.y = 1 + Math.sin(t * 12) * 0.12;
          if (mode === 'neuron') {
            const f = Math.max(0, Math.min(1, (p3 - 0.08) / 0.77)); pulse.visible = p3 > 0.08 && p3 < 0.9; const pp = nPath.getPointAt(Math.min(0.999, f)); pulse.position.copy(pp); pulse.scale.setScalar(1 + 0.25 * Math.sin(t * 14));
          } else {
            const u = Math.max(0, Math.min(1, (p3 - 0.08) / 0.72)) * segs.length, sg = Math.min(segs.length - 1, Math.floor(u)), st = Math.min(0.999, u - sg);
            const moving = p3 > 0.08 && p3 < 0.8;
            pulse.visible = moving; if (moving) { pulse.position.copy(segs[sg][2].getPointAt(st)); pulse.scale.setScalar(1 + 0.2 * Math.sin(t * 14)); stepLab.set(segs[sg][0]); stepLab.show(names); } else stepLab.show(false);
            if (moving && sg !== seg) { seg = sg; rinfo(); }
            const kk = p3 < 0.8 ? 0 : p3 < 0.9 ? (p3 - 0.8) / 0.1 : 1 - (p3 - 0.9) / 0.1;
            muscle.scale.y = 1 - 0.25 * kk; finger.position.x = 5.6 - 1.6 * kk; finger.position.y = 3.6 + 0.9 * kk; finger.rotation.z = 0.5 * kk;
          }
        },
      };
    },
  });
})();
