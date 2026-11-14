/* hg-gene-editing · 3D CRISPR-Cas9 유전자 가위
   가이드 RNA(주황)가 표적 DNA와 상보적으로 짝을 지으면 Cas9(가위 단백질)가 PAM(NGG) 옆 DNA 두 가닥을 모두 잘라요.
   잘린 DNA는 세포가 고쳐요: NHEJ(끝을 이어 붙이다 염기가 빠지거나 끼어 유전자가 망가짐) / HDR(주형 DNA를 본보기로 정확히 교정). */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const narrow = window.innerWidth < 600 || window.innerHeight > window.innerWidth * 1.1;
  const DB = 0.12, RAD = 0.3, PITCH = 2.4, X0 = -5.8, X1 = 5.0, N = Math.floor((X1 - X0) / DB);
  const T0 = -2.7, T1 = -0.3, PAM1 = 0.06, CUT = -0.66;        // 표적 20nt, PAM 3nt, 절단 위치
  const MODE_OF = { target: 0, calc: 0, repair: 1 };

  window.SciSim3D.attach({
    title: 'CRISPR 유전자 가위 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: narrow ? 12 : 10.5, theta: 0.22, phi: 1.28, target: narrow ? [-0.4, -0.6, 0] : [-0.6, 0.4, 0], min: 5, max: 20 },
    autoRotate: 0,
    levels: [1],   // 절단과 수리 단계만 3D. 표적 찾기(위치 슬라이더 · 일치 횟수 입력) · 치료 사례 · 한계와 전망은 캔버스에서 해요
    build(ctx) {
      const { THREE, root, label, info, controls, renderer } = ctx;
      const V = THREE.Vector3, M4 = new THREE.Matrix4(), cc = new THREE.Color();
      if (narrow) root.rotation.z = Math.PI / 2;      // 휴대폰(세로 화면)에서는 눕혀 둔 모형을 세워서 보여 줘요
      /* 재질: 구슬 모형은 매끈한 광택(std), 단백질(Cas9)은 촉촉한 생체 조직 느낌 + 울퉁불퉁한 표면(bio, lumpy) */
      const std = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.28, metalness: 0.04, envMapIntensity: 1.1 }, o || {}));
      const bio = (c, op, o) => ctx.mats.organic(c, { opacity: op, extra: o });
      const lumpy = (geo, amp, f) => {
        const p = geo.attributes.position, v = new V(), n = new V();
        for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); n.copy(v).normalize(); v.multiplyScalar(1 + amp * (Math.sin(n.x * f + 1.3) * Math.cos(n.y * f * 1.3 + 0.4) + 0.6 * Math.sin(n.z * f * 1.7 + n.x * 2.1))); p.setXYZ(i, v.x, v.y, v.z); }
        geo.computeVertexNormals(); return geo;
      };
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
      { const m = bio(0x7dd3fc, 0.4);
        const a = new THREE.Mesh(lumpy(new THREE.SphereGeometry(1, 56, 40), 0.05, 3.4), m); a.scale.set(1.75, 1.3, 1.1); a.position.set(-1.25, 0.15, 0); cas.add(a);
        const b = new THREE.Mesh(lumpy(new THREE.SphereGeometry(1, 48, 32), 0.06, 3.8), bio(0x38bdf8, 0.5)); b.scale.set(0.9, 0.95, 0.9); b.position.set(-0.1, 0.55, 0.3); cas.add(b);
        const c = new THREE.Mesh(lumpy(new THREE.SphereGeometry(0.5, 32, 22), 0.08, 3.6), bio(0x0ea5e9)); c.position.set(-2.2, 0.85, 0.3); cas.add(c); }
      const hnh = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.6, 16), std(0xdc2626, { emissive: 0x5a0000, roughness: 0.35 })), ruvc = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.6, 16), std(0xdc2626, { emissive: 0x5a0000, roughness: 0.35 }));
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

      /* ---------- 주형 DNA ---------- */
      const donor = new THREE.InstancedMesh(new THREE.SphereGeometry(0.1, 12, 10), std(0x4ade80, { emissive: 0x052e16, roughness: 0.35 }), 80); root.add(donor); donor.visible = false;
      const fixMat = std(0xef4444, { emissive: 0x440000 }), fix = new THREE.Group(); fix.visible = false; root.add(fix);
      [0, 1].forEach(() => { fix.add(new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 12), fixMat)); });

      /* ---------- 상태 ---------- */
      let step = 0, t = 0, casX = -3.6, bubble = 0, gap = 0, donorK = 0, casA = 1;
      function setStep(s) {
        step = s; t = 0;
        casX = s === 0 ? -3.6 : 0; bubble = s === 0 ? 0 : 1; gap = s >= 2 ? 1.0 : 0; donorK = 0; casA = 1;
        cas.visible = true; fix.visible = false; donor.visible = false; text();
        L.donor.show(s === 3);
      }
      function text() {
        const h = [
          '<b>① 표적 찾기</b> · 가이드 RNA가 DNA 위를 훑다가, <b>PAM(NGG)</b> 옆에서 표적 서열과 <b>상보적으로 결합</b>해요.',
          '<b>② 절단</b> · Cas9의 두 가위 날이 PAM에서 3염기 떨어진 곳의 <b>두 가닥을 모두</b> 잘라요(이중 가닥 절단).',
          '<b>③ 수리: 끝 연결(NHEJ)</b> · 끝을 그대로 이어 붙이다 <b>염기가 빠지거나 끼어</b> 유전자가 망가질 수 있어요(유전자 기능 상실).',
          '<b>④ 수리: 주형 DNA를 함께 넣기(HDR)</b> · 정상 서열의 <b>주형 DNA</b>를 본보기로 삼아 정확히 고쳐요.',
        ];
        info(h[step]);
      }
      // 시작 지점에서 막 바뀐 단계에서는 DNA 가 어디에 있든 보이도록 Cas9 위치를 맞춰요
      const L = {
        cas: label('Cas9', cas, { color: '#075985', offset: [0, 1.6, 0] }), g: label('가이드 RNA', An(T0 - 0.9, 1.9, 0), { color: '#9a3412' }), dna: label('표적 DNA', An(3.4, 0.9, 0), { color: '#1e3a8a' }),
        pam: label('PAM (NGG)', An((T1 + PAM1) / 2 + 0.1, -1.35, 0), { color: '#86198f' }), cut: label('절단 위치', An(CUT, -1.9, 0), { color: '#991b1b' }), donor: label('주형 DNA (정상 서열)', An(CUT, 3.0, 0), { color: '#166534' }),
        tgt: label('표적 서열 (20염기)', An((T0 + T1) / 2, -1.35, 0), { color: '#854d0e' }),
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
        // 주형 DNA: 절단 틈(폭 1.0)을 메우는 이중 가닥(초록)
        let n = 0;
        for (let s2 = 0; s2 < 2; s2++) for (let i = 0; i < 9; i++) {
          const x = CUT - 0.48 + i * DB * 1.0, a = 2 * Math.PI * x / PITCH + s2 * Math.PI;
          dm.makeTranslation(x, lerp(3.0, 0, k) + RAD * Math.cos(a), RAD * Math.sin(a) + lerp(0.6, 0, k)); donor.setMatrixAt(n++, dm);
        }
        donor.count = n; donor.instanceMatrix.needsUpdate = true;
      }

      /* 한 과정 16초: ① 표적 찾기 (0~5.5) → ② 절단 (5.5~9) → ③/④ 수리 (9~16; 수리 방식은 단계 버튼 · 2D 선택을 따라가요) */
      const DUR = 16, TS = [0, 5.5, 9.0], repairMode = { v: 2 };
      let curStep = -1;
      function toLesson(s2) {      // 3D에서 단계를 고르면 2D 절단과 수리 화면도 같은 단계로
        const L = ctx.lesson(); if (!L || !L.S || L.S.mode !== 'repair' || !L.RP) return;
        const RPs = L.RP;
        if (s2 === 0) { if (RPs.stage !== 0) L.rpReset(true); return; }
        if (RPs.stage >= 2 || (RPs.stage === 1 && s2 === 1 && false)) L.rpReset(true);
        if (RPs.stage === 0) L.rpCut();
        if (s2 >= 2) { RPs.mode = s2 === 3 ? 'hdr' : 'nhej'; L.updateCtl(); L.rpRepair(); }
      }
      const segB = controls.segment('단계', [{ value: 0, label: '① 표적 찾기' }, { value: 1, label: '② 절단' }, { value: 2, label: '③ 끝 연결 (NHEJ)' }, { value: 3, label: '④ 주형 DNA (HDR)' }], 0, (v) => { if (v >= 2) repairMode.v = v; player.set((v >= 2 ? TS[2] + 0.01 : TS[v]) / DUR); toLesson(v); setStep(v); curStep = v; });
      const player = controls.player({
        duration: DUR, loop: true, autoplay: true, label: '유전자 가위',
        phases: [[0, '① 표적 찾기'], [TS[1] / DUR, '② 절단'], [TS[2] / DUR, '③ 수리 (선택한 방식)']],
        onFrame() {},
      });
      setStep(0); curStep = 0;
      let lastSim = null, lastKey = '', once = false;
      /* 2D에서 어느 화면인지 · 절단과 수리의 진행(절단 전 · 절단 · 끝 연결 · 주형 DNA)을 따라가요 */
      function pollLesson() {
        const L = ctx.lesson(); if (!L || !L.S) return;
        const sm = L.S.mode;
        if (sm !== lastSim) { lastSim = sm; if (sm === 'target' || sm === 'calc') { player.set(0); repairMode.v = 2; } }
        if (sm === 'repair' && L.RP) {
          const R = L.RP, key = R.stage + ':' + R.mode;
          if (key !== lastKey) {
            lastKey = key;
            const s2 = R.stage === 0 ? 0 : R.stage === 1 ? 1 : (R.mode === 'hdr' ? 3 : 2);
            if (R.mode) repairMode.v = R.mode === 'hdr' ? 3 : 2;
            /* 2D와 같은 장면에서 멈춰요: 결합 · 절단 상태는 그대로, 수리는 한 번 끝까지 보여 줘요 */
            player.pause(); player.set((s2 === 0 ? 5.3 : s2 === 1 ? TS[1] + 2.4 : TS[2] + 0.01) / DUR);
            once = s2 >= 2; if (once) player.play();
          }
        }
      }
      /* 단백질 띠: 수리 결과로 바뀐 코돈 · 아미노산과 정지 코돈을 3D 화면에도 보여 줘요 (2D 캔버스의 읽기틀과 같은 내용) */
      const AAN = { M: 'Met', A: 'Ala', H: 'His', L: 'Leu', T: 'Thr', P: 'Pro', V: 'Val', K: 'Lys', W: 'Trp', R: 'Arg', E: 'Glu', S: 'Ser', D: 'Asp', G: 'Gly', F: 'Phe', Y: 'Tyr', Q: 'Gln' };
      const NA = 14, CW = narrow ? 12 : 15;
      const protEl = document.createElement('div');
      protEl.style.cssText = 'position:absolute;' + (narrow ? 'left:8px;bottom:30px;' : 'right:10px;top:10px;') + 'padding:6px 8px;border-radius:12px;background:rgba(8,12,24,.8);color:#fff;font-size:' + (narrow ? 10.5 : 12) + 'px;font-weight:800;pointer-events:none;display:none;max-width:' + (NA * (CW + 2) + 18) + 'px';
      renderer.domElement.parentElement.appendChild(protEl);
      let protSig = null;
      function drawProt() {
        const L = ctx.lesson(), on = !!(L && L.S && L.S.mode === 'repair' && L.RP && L.translate);
        const R = on ? L.RP : null, sig = on ? R.stage + R.seq : '';
        if (sig === protSig) return; protSig = sig; protEl.style.display = on ? '' : 'none'; if (!on) return;
        const pr = L.translate(R.seq), st = pr.indexOf('*'), c7 = R.seq.slice(18, 21);
        const chips = pr.slice(0, NA).map((a, i) => {
          const stop = a === '*', after = st >= 0 && i > st, hi = i === 6;
          const bg = stop ? '#dc2626' : after ? 'rgba(255,255,255,.08)' : hi ? '#16a34a' : 'rgba(255,255,255,.18)';
          return '<span title="' + (i + 1) + '" style="display:inline-block;width:' + CW + 'px;margin:0 1px;text-align:center;border-radius:4px;background:' + bg + ';color:' + (after ? '#64748b' : '#fff') + '">' + (stop ? '■' : a) + '</span>';
        }).join('');
        let res = '자르기 전: 원래 유전자예요.';
        if (R.stage === 1) res = '잘렸어요. 수리 방식을 골라 수리해요.';
        if (R.stage === 2 && R.res) res = R.res.mode === 'hdr' ? '주형 DNA로 정확히 교정했어요' : R.res.t + ' → ' + (R.res.frame ? '읽기틀이 밀려요' + (st >= 0 ? ' · ' + (st + 1) + '번째에 <span style="color:#fca5a5">정지 코돈 ■</span>' : '') : '읽기틀은 그대로예요');
        protEl.innerHTML = '<div>🧬 단백질 (아미노산 순서)</div><div style="margin:4px 0 3px;white-space:nowrap">' + chips + '</div><div style="color:#cbd5e1">7번째: ' + c7 + ' (' + (AAN[pr[6]] || pr[6]) + ') · ' + res + '</div>';
      }
      return {
        update(dt) {
          dt = Math.min(dt, 0.05) * (window.__v3dTS || 1);
          pollLesson(); drawProt();
          if (once && player.p > 0.985) { once = false; player.pause(); player.set(0.985); }
          // 진행 막대(player)의 위치로 단계와 단계 안의 시간(t)을 정해요
          { const T = player.p * DUR, ns = T < TS[1] ? 0 : T < TS[2] ? 1 : repairMode.v; t = T < TS[1] ? T : T < TS[2] ? T - TS[1] : T - TS[2];
            if (ns !== curStep) { const tt = t; setStep(ns); t = tt; curStep = ns; segB.set(ns); } }
          if (step === 0) {
            casA = 1; gap = 0; fix.visible = false; donor.visible = false;
            const k = Math.min(1, t / 4.2);
            casX = lerp(-3.6, 0, ease(k)) + (k < 1 ? Math.sin(t * 9) * 0.07 : 0);
            bubble = k >= 1 ? ease((t - 4.2) / 1.0) : 0;
          } else if (step === 1) {
            casX = 0; bubble = 1; casA = 1; fix.visible = false; donor.visible = false; gap = ease((t - 0.8) / 1.2);
            const f = t > 0.8 && t < 1.3; cas.userData.cut.forEach((m) => { m.material.emissive.setHex(f ? 0xff2222 : 0x330000); });
          } else if (step === 2) {                       // NHEJ: 끝을 그냥 이어 붙여요 (염기가 끼어들어요)
            donor.visible = false; bubble = lerp(1, 0, ease(t / 1.2)); casA = 1 - ease((t - 0.8) / 1.0);
            gap = lerp(1.0, 0.36, ease((t - 2.0) / 1.4));
            fix.visible = gap < 0.5;
            if (fix.visible) { dnaPos(0, CUT, P0); dnaPos(1, CUT, P1); fix.children[0].position.copy(P0); fix.children[1].position.copy(P1); }
          } else {                                        // HDR: 주형 DNA 가 틈을 메워요
            bubble = lerp(1, 0, ease(t / 1.2)); casA = 1 - ease((t - 0.8) / 1.0);
            fix.visible = false; gap = 1.0; donorK = ease((t - 1.8) / 1.8); donor.visible = donorK > 0.001; placeDonor(donorK);
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
