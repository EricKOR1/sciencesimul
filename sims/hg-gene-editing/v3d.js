/* hg-gene-editing · 3D CRISPR-Cas9 유전자 가위
   가이드 RNA(주황)가 표적 DNA와 상보적으로 짝을 지으면 Cas9(가위 단백질)가 PAM(NGG) 옆 DNA 두 가닥을 모두 잘라요.
   잘린 DNA는 세포가 고쳐요: NHEJ(끝을 이어 붙이다 염기가 빠지거나 끼어 유전자가 망가짐) / HDR(공여 DNA를 본보기로 정확히 교정). */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const narrow = window.innerWidth < 600 || window.innerHeight > window.innerWidth * 1.1;
  const DB = 0.12, RAD = 0.3, PITCH = 2.4, X0 = -5.8, X1 = 5.0, N = Math.floor((X1 - X0) / DB);
  const T0 = -2.7, T1 = -0.3, PAM1 = 0.06, CUT = -0.66;        // 표적 20nt, PAM 3nt, 절단 위치
  const MODE_OF = { target: 0, calc: 0, repair: 1, flow: 3, cases: 3 };

  window.SciSim3D.attach({
    title: 'CRISPR 유전자 가위 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: narrow ? 13 : 10.5, theta: 0.22, phi: 1.28, target: [-0.6, 0.4, 0], min: 5, max: 20 },
    autoRotate: 0,
    levels: [0, 1],
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const V = THREE.Vector3, M4 = new THREE.Matrix4(), cc = new THREE.Color();
      const std = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.4, metalness: 0.04 }, o || {}));
      const An = (x, y, z) => { const o = new THREE.Object3D(); o.position.set(x, y, z); root.add(o); return o; };
      const ease = (k) => { k = Math.max(0, Math.min(1, k)); return k * k * (3 - 2 * k); };
      const lerp = (a, b, k) => a + (b - a) * k;

      /* ---------- DNA (구슬 2줄) ---------- */
      const dna = new THREE.InstancedMesh(new THREE.SphereGeometry(0.1, 12, 10), std(0xffffff, { roughness: 0.3 }), N * 2);
      const dcol = (x) => (x >= T0 && x < T1 ? 0xfacc15 : x >= T1 && x < PAM1 ? 0xe879f9 : 0x60a5fa);
      for (let k = 0; k < 2; k++) for (let i = 0; i < N; i++) dna.setColorAt(k * N + i, cc.setHex(dcol(X0 + i * DB)));
      dna.instanceColor.needsUpdate = true; root.add(dna);
      const rungN = Math.floor((X1 - X0) / 0.3);
      const rungs = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.03, 0.03, 1, 6), std(0xe2e8f0), rungN); root.add(rungs);

      /* ---------- Cas9 · 가이드 RNA ---------- */
      const cas = new THREE.Group(); root.add(cas);
      { const m = std(0x7dd3fc, { transparent: true, opacity: 0.4, depthWrite: false, roughness: 0.3 });
        const a = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 28), m); a.scale.set(1.5, 1.35, 1.15); a.position.set(-0.2, 0.15, 0); cas.add(a);
        const b = new THREE.Mesh(new THREE.SphereGeometry(1, 36, 24), std(0x38bdf8, { transparent: true, opacity: 0.5, depthWrite: false, roughness: 0.3 })); b.scale.set(1.0, 1.0, 0.95); b.position.set(1.1, 0.5, 0.3); cas.add(b);
        const c = new THREE.Mesh(new THREE.SphereGeometry(0.5, 24, 18), std(0x0ea5e9, { roughness: 0.35 })); c.position.set(-1.0, 0.9, 0.3); cas.add(c); }
      const hnh = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.6, 16), std(0xef4444, { emissive: 0x330000, roughness: 0.35 })), ruvc = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.6, 16), std(0xef4444, { emissive: 0x330000, roughness: 0.35 }));
      hnh.rotation.z = Math.PI; ruvc.position.set(CUT, -0.75, 0); hnh.position.set(CUT, 0.75, 0); cas.add(hnh, ruvc);   // 두 가위 날
      cas.userData.cut = [hnh, ruvc];
      const gN = 20, gb = new THREE.InstancedMesh(new THREE.SphereGeometry(0.1, 12, 10), std(0xfb923c, { emissive: 0x3a1a00, roughness: 0.35 }), gN + 22); cas.add(gb);
      const scaf = [new V(T0 - 0.1, 0.55, 0), new V(T0 - 0.55, 0.9, 0.1), new V(T0 - 0.8, 1.35, 0.2), new V(T0 - 0.45, 1.7, 0.1), new V(T0 + 0.1, 1.55, 0.0), new V(T0 + 0.2, 1.15, 0.0), new V(T0 - 0.2, 0.95, 0.0)];
      const scafC = new THREE.CatmullRomCurve3(scaf), scafN = 22;
      const gpos = new V();
      function placeG(bubble) {
        for (let i = 0; i < gN; i++) { const x = T0 + 0.06 + i * ((T1 - T0 - 0.1) / (gN - 1)); M4.makeTranslation(x, lerp(0.95, 0.5, bubble), 0); gb.setMatrixAt(i, M4); }
        for (let i = 0; i < scafN; i++) { scafC.getPoint(i / (scafN - 1), gpos); gpos.y += lerp(0.4, 0, bubble); M4.makeTranslation(gpos.x, gpos.y, gpos.z); gb.setMatrixAt(gN + i, M4); }
        gb.instanceMatrix.needsUpdate = true;
      }

      /* ---------- 공여 DNA ---------- */
      const donor = new THREE.InstancedMesh(new THREE.SphereGeometry(0.1, 12, 10), std(0x4ade80, { emissive: 0x052e16, roughness: 0.35 }), 80); root.add(donor); donor.visible = false;
      const fixMat = std(0xef4444, { emissive: 0x440000 }), fix = new THREE.Group(); fix.visible = false; root.add(fix);
      [0, 1].forEach(() => { fix.add(new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 12), fixMat)); });

      /* ---------- 상태 ---------- */
      let step = 0, t = 0, casX = -5.2, bubble = 0, gap = 0, donorK = 0, casA = 1;
      function setStep(s) {
        step = s; t = 0;
        casX = s === 0 ? -5.2 : 0; bubble = s === 0 ? 0 : 1; gap = s >= 2 ? 1.0 : 0; donorK = 0; casA = 1;
        cas.visible = true; fix.visible = false; donor.visible = false; text();
        L.donor.show(s === 3);
      }
      function text() {
        const h = [
          '<b>① 표적 찾기</b> · 가이드 RNA가 DNA 위를 훑다가, <b>PAM(NGG)</b> 옆에서 표적 서열과 <b>상보적으로 결합</b>해요.',
          '<b>② 절단</b> · Cas9의 두 가위 날이 PAM에서 3염기 떨어진 곳의 <b>두 가닥을 모두</b> 잘라요(이중 가닥 절단).',
          '<b>③ 수리: NHEJ</b> · 끝을 그냥 이어 붙이다 <b>염기가 빠지거나 끼어</b> 유전자가 망가질 수 있어요(유전자 기능 상실).',
          '<b>④ 수리: HDR</b> · 정상 서열의 <b>공여 DNA</b>를 본보기로 삼아 정확히 고쳐요.',
        ];
        info(h[step]);
      }
      // 시작 지점에서 막 바뀐 단계에서는 DNA 가 어디에 있든 보이도록 Cas9 위치를 맞춰요
      const L = {
        cas: label('Cas9', cas, { color: '#075985', offset: [0, 1.6, 0] }), g: label('가이드 RNA', An(T0 - 0.9, 1.9, 0), { color: '#9a3412' }), dna: label('표적 DNA', An(3.4, 0.9, 0), { color: '#1e3a8a' }),
        pam: label('PAM (NGG)', An((T1 + PAM1) / 2 + 0.1, -1.35, 0), { color: '#86198f' }), cut: label('절단 위치', An(CUT, -1.9, 0), { color: '#991b1b' }), donor: label('공여 DNA (정상 서열)', An(CUT, 3.0, 0), { color: '#166534' }),
        tgt: label('표적 서열 20nt', An((T0 + T1) / 2, -1.35, 0), { color: '#854d0e' }),
      };
      L.donor.show(false);

      function dnaPos(strand, x, out) {
        const a = 2 * Math.PI * x / PITCH + strand * Math.PI;
        let y = RAD * Math.cos(a), z = RAD * Math.sin(a), xx = x;
        // 절단 틈 (두 가닥 모두 잘려 양쪽이 벌어져요)
        xx = x + (x > CUT ? 1 : -1) * gap * 0.5;
        // R-루프: 표적 구간에서 표적 가닥은 가이드 RNA 쪽으로, 반대 가닥은 아래로 밀려나요
        const w = bubble * Math.max(0, Math.min(1, (x - (T0 - 0.2)) / 0.3)) * Math.max(0, Math.min(1, ((T1 + 0.1) - x) / 0.3));
        if (w > 0) {
          if (strand === 0) { y = lerp(y, 0.28, w); z = lerp(z, 0, w); }
          else { y = lerp(y, -0.75 - 0.15 * Math.sin((x - T0) * 2.0), w); z = lerp(z, 0.25, w); }
        }
        return out.set(xx, y, z);
      }
      const P0 = new V(), P1 = new V(), Yv = new V(0, 1, 0), Qt = new THREE.Quaternion(), S3 = new V(), mid = new V();
      function updDNA() {
        for (let k = 0; k < 2; k++) for (let i = 0; i < N; i++) {
          const x = X0 + i * DB;
          dnaPos(k, x, P0);
          M4.makeTranslation(P0.x, P0.y, P0.z);
          dna.setMatrixAt(k * N + i, M4);
        }
        dna.instanceMatrix.needsUpdate = true;
        for (let i = 0; i < rungN; i++) {
          const x = X0 + i * 0.3;
          const open = bubble * (x > T0 - 0.2 && x < T1 + 0.1 ? 1 : 0) || (Math.abs(x - CUT) < 0.4 && gap > 0.05);
          if (open || (gap > 0.05 && Math.abs(x - CUT) < 0.4 + gap * 0.5)) { M4.makeScale(0, 0, 0); rungs.setMatrixAt(i, M4); continue; }
          dnaPos(0, x, P0); dnaPos(1, x, P1);
          S3.subVectors(P1, P0); const L2 = S3.length(); Qt.setFromUnitVectors(Yv, S3.normalize());
          mid.addVectors(P0, P1).multiplyScalar(0.5); M4.compose(mid, Qt, new V(1, Math.max(0.001, L2), 1)); rungs.setMatrixAt(i, M4);
        }
        rungs.instanceMatrix.needsUpdate = true;
      }
      const dm = new THREE.Matrix4();
      function placeDonor(k) {
        // 공여 DNA: 절단 틈(폭 1.0)을 메우는 이중 가닥(초록)
        let n = 0;
        for (let s2 = 0; s2 < 2; s2++) for (let i = 0; i < 9; i++) {
          const x = CUT - 0.48 + i * DB * 1.0, a = 2 * Math.PI * x / PITCH + s2 * Math.PI;
          dm.makeTranslation(x, lerp(3.0, 0, k) + RAD * Math.cos(a), RAD * Math.sin(a) + lerp(0.6, 0, k)); donor.setMatrixAt(n++, dm);
        }
        donor.count = n; donor.instanceMatrix.needsUpdate = true;
      }

      const segB = controls.segment('단계', [{ value: 0, label: '① 표적 찾기' }, { value: 1, label: '② 절단' }, { value: 2, label: '③ NHEJ' }, { value: 3, label: '④ HDR' }], 0, (v) => setStep(v));
      controls.button('↻ 다시 보기', () => setStep(step));
      setStep(0);
      let lastSim = null;
      return {
        update(dt) {
          dt = Math.min(dt, 0.05); t += dt;
          const sm = window.__sim && window.__sim.S && window.__sim.S.mode;
          if (sm && sm !== lastSim) { lastSim = sm; const s2 = MODE_OF[sm]; if (s2 !== undefined && s2 !== step) { segB.set(s2); setStep(s2); } }
          if (step === 0) {
            const k = Math.min(1, t / 4.2);
            casX = lerp(-5.2, 0, ease(k)) + (k < 1 ? Math.sin(t * 9) * 0.07 : 0);
            bubble = k >= 1 ? ease((t - 4.2) / 1.0) : 0;
            if (t > 9) t = 0;                   // 반복해서 훑어요
          } else if (step === 1) {
            casX = 0; bubble = 1; gap = ease((t - 1.0) / 1.2);
            const f = t > 1.0 && t < 1.5; cas.userData.cut.forEach((m) => { m.material.emissive.setHex(f ? 0xff2222 : 0x330000); });
          } else if (step === 2) {                       // NHEJ: 끝을 그냥 이어 붙여요 (염기가 끼어들어요)
            bubble = lerp(1, 0, ease(t / 1.2)); casA = 1 - ease((t - 0.8) / 1.0);
            gap = lerp(1.0, 0.36, ease((t - 2.0) / 1.4));
            fix.visible = gap < 0.5;
            if (fix.visible) { dnaPos(0, CUT, P0); dnaPos(1, CUT, P1); fix.children[0].position.copy(P0); fix.children[1].position.copy(P1); }
          } else {                                        // HDR: 공여 DNA 가 틈을 메워요
            bubble = lerp(1, 0, ease(t / 1.2)); casA = 1 - ease((t - 0.8) / 1.0);
            gap = 1.0; donorK = ease((t - 1.8) / 1.8); donor.visible = donorK > 0.001; placeDonor(donorK);
          }
          cas.position.set(casX, 0, 0);
          cas.visible = casA > 0.02; cas.scale.setScalar(Math.max(0.01, casA));
          cas.userData.cut.forEach((m) => { m.visible = step === 1 || (step === 0 && bubble > 0.9); });
          placeG(bubble);
          updDNA();
          L.cas.show(cas.visible); L.g.obj.position.x = casX + T0 - 0.9; L.g.show(cas.visible && step < 2);
          L.pam.show(step < 2); L.tgt.show(step === 0); L.cut.show(step === 1 && gap > 0.3);
          L.dna.show(true);
        },
        sync() { text(); },
      };
    },
  });
})();
