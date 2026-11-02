/* hg-central-dogma · 3D 전사와 번역
   전사: RNA 중합 효소가 DNA 이중 가닥을 풀고 주형 가닥을 읽으며 상보적인 mRNA(주황)를 만들어요 (T 대신 U).
   번역: 리보솜(대단위체 + 소단위체)이 mRNA의 코돈을 3염기씩 읽고, 안티코돈을 가진 tRNA가 아미노산을 날라 와 폴리펩타이드로 이어요.
   (mRNA 코돈 → 아미노산 색이 같아요. 시작 코돈 AUG, 종결 코돈 → 폴리펩타이드 방출) */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const narrow = window.innerWidth < 600 || window.innerHeight > window.innerWidth * 1.1;
  const MODE_OF = { flow: 'tx', tx: 'tx', proc: 'tx', tl: 'tl', poly: 'tl' };
  const AAC = [0xf87171, 0xfbbf24, 0x34d399, 0x38bdf8, 0xa78bfa, 0xf472b6, 0xa3e635, 0xfb923c];

  window.SciSim3D.attach({
    title: '전사 · 번역 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: narrow ? 13 : 10.5, theta: 0.28, phi: 1.32, target: [0, 0.4, 0], min: 5, max: 20 },
    autoRotate: 0,
    levels: [1, 2],
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const V = THREE.Vector3, M4 = new THREE.Matrix4(), cc = new THREE.Color();
      let mode = 'tx';
      const std = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.4, metalness: 0.04 }, o || {}));
      const txG = new THREE.Group(), tlG = new THREE.Group(); root.add(txG, tlG);
      const An = (g, x, y, z) => { const o = new THREE.Object3D(); o.position.set(x, y, z); g.add(o); return o; };

      /* ===================== 전사 ===================== */
      const TL = 11, X0 = -5.5, DBS = 0.13, TRAD = 0.5, TPITCH = 2.6;
      const dnaN = Math.floor(TL / DBS);
      const dna = new THREE.InstancedMesh(new THREE.SphereGeometry(0.095, 12, 10), std(0xffffff, { roughness: 0.3 }), dnaN * 2);
      for (let k = 0; k < 2; k++) for (let i = 0; i < dnaN; i++) dna.setColorAt(k * dnaN + i, cc.setHex(k === 0 ? 0x3b82f6 : 0x93c5fd));
      dna.instanceColor.needsUpdate = true; txG.add(dna);
      const rungN = Math.floor(TL / 0.3);
      const rungs = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.03, 0.03, 1, 6), std(0xe2e8f0, { roughness: 0.4 }), rungN);
      txG.add(rungs);
      const rnaMax = 70, rna = new THREE.InstancedMesh(new THREE.SphereGeometry(0.1, 12, 10), std(0xfb923c, { roughness: 0.35, emissive: 0x3a1a00 }), rnaMax);
      txG.add(rna);
      const pol = new THREE.Group(); txG.add(pol);
      { const b = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 28), std(0x14b8a6, { transparent: true, opacity: 0.45, depthWrite: false, roughness: 0.3 })); b.scale.set(1.15, 1.1, 1.0); pol.add(b);
        const c1 = new THREE.Mesh(new THREE.SphereGeometry(0.55, 24, 18), std(0x0d9488, { roughness: 0.35 })); c1.position.set(0.35, 0.35, -0.2); pol.add(c1); }
      const Yv = new V(0, 1, 0), Q = new THREE.Quaternion(), S3 = new V(), PT = new V(), PB = new V();
      function dnaPos(strand, x, px, out) {
        const a = 2 * Math.PI * x / TPITCH + (strand ? Math.PI : 0), bump = Math.exp(-Math.pow((x - px) / 0.65, 2));
        const r = TRAD + (strand ? 1.0 * bump : 0), yy = (strand ? 0.0 : 0) ;
        return out.set(x, r * Math.cos(a) + (strand ? 0.0 : -0.0), r * Math.sin(a));
      }
      let progress = 0, nNT = 0, txN = 28;
      const NTP = []; for (let i = 0; i < 6; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), std(0xfdba74)); txG.add(m); NTP.push({ m, ph: i / 6 }); }
      function updTx(t) {
        const px = X0 + 1.2 + progress * (TL - 3.2);
        for (let k = 0; k < 2; k++) for (let i = 0; i < dnaN; i++) {
          const x = X0 + i * DBS; dnaPos(k, x, px, PT);
          M4.makeTranslation(PT.x, PT.y, PT.z); dna.setMatrixAt(k * dnaN + i, M4);
        }
        dna.instanceMatrix.needsUpdate = true;
        let n = 0;
        for (let i = 0; i < rungN; i++) {
          const x = X0 + i * 0.3, bub = Math.abs(x - px) < 0.8;
          dnaPos(0, x, px, PT); dnaPos(1, x, px, PB);
          if (bub) { M4.makeScale(0, 0, 0); rungs.setMatrixAt(i, M4); continue; }
          S3.subVectors(PB, PT); const L = S3.length(); Q.setFromUnitVectors(Yv, S3.normalize());
          M4.compose(PT.clone().add(PB).multiplyScalar(0.5), Q, new V(1, L, 1)); rungs.setMatrixAt(i, M4);
        }
        rungs.instanceMatrix.needsUpdate = true;
        // mRNA: 중합 효소에서 시작해 뒤쪽 아래로 길게 늘어나요
        nNT = Math.min(rnaMax, Math.floor((px - (X0 + 1.2)) / 0.14) + 2);
        for (let i = 0; i < rnaMax; i++) {
          if (i >= nNT) { M4.makeScale(0, 0, 0); rna.setMatrixAt(i, M4); continue; }
          const s = i * 0.14;                      // 중합 효소에서 뒤로 거리
          const x = px - 0.15 - s * 0.95, y = -0.55 - Math.min(s, 3.0) * 0.38 - Math.max(0, s - 3.0) * 0.0, z = 0.35 + 0.35 * Math.sin(s * 1.4);
          M4.makeTranslation(x, y + 0.0, z); rna.setMatrixAt(i, M4);
        }
        rna.instanceMatrix.needsUpdate = true; rna.count = rnaMax;
        pol.position.set(px, 0.25, -0.1);
        NTP.forEach((o, i) => { const k = (t * 0.4 + o.ph) % 1; o.m.position.set(px + 1.8 - k * 1.7, 1.9 - k * 1.5, 0.9 - k * 0.7); o.m.scale.setScalar(k > 0.92 ? 0.01 : 1); });
      }
      const Ltx = {
        pol: label('RNA 중합 효소', An(txG, 0, 1.55, 0), { color: '#0f766e' }), dna: label('DNA', An(txG, -4.7, 1.0, 0), { color: '#1d4ed8' }),
        tpl: label('주형 가닥', An(txG, 3.6, -0.75, 0.2), { color: '#1e3a8a' }), mrna: label('mRNA', An(txG, 0, -2.0, 0.4), { color: '#9a3412' }), ntp: label('RNA 뉴클레오타이드', An(txG, 0, 2.5, 0.9), { color: '#92400e' }),
      };

      /* ===================== 번역 ===================== */
      const SP = 0.65, DB2 = SP / 3, NCOD = 16, KC0 = -3;       // 코돈 간격, 구슬 간격, 코돈 개수, 첫 코돈 번호
      const STOP = 8;
      const codCol = (k) => (k < 0 || k > STOP ? 0x94a3b8 : k === 0 ? 0x22c55e : k === STOP ? 0xef4444 : AAC[(k * 3) % 8]);
      const aaCol = (k) => (k === 0 ? 0x22c55e : AAC[(k * 3) % 8]);
      const mr = new THREE.InstancedMesh(new THREE.SphereGeometry(0.1, 12, 10), std(0xffffff, { roughness: 0.35 }), NCOD * 3);
      for (let k = 0; k < NCOD; k++) for (let j = 0; j < 3; j++) mr.setColorAt(k * 3 + j, cc.setHex(codCol(KC0 + k)));
      mr.instanceColor.needsUpdate = true; tlG.add(mr);
      const MY = -0.78;
      // 리보솜
      const big = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), std(0xa78bfa, { transparent: true, opacity: 0.4, depthWrite: false, roughness: 0.35 })); big.scale.set(2.2, 1.2, 1.4); big.position.set(0.1, 0.6, 0); tlG.add(big); big.renderOrder = 2;
      const small = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), std(0xf9a8d4, { transparent: true, opacity: 0.5, depthWrite: false, roughness: 0.35 })); small.scale.set(1.8, 0.62, 1.15); small.position.set(0.1, -1.18, 0); tlG.add(small); small.renderOrder = 2;
      // tRNA 풀
      function makeT() {
        const g = new THREE.Group();
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.0, 12), std(0x2dd4bf, { roughness: 0.4 })); stem.position.y = -0.1; g.add(stem);
        const arm = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.14, 0.2), std(0x14b8a6)); arm.position.set(0.0, 0.32, 0); g.add(arm);
        const aa = new THREE.Mesh(new THREE.SphereGeometry(0.17, 20, 14), std(0xffffff, { roughness: 0.3 })); aa.position.set(0, 0.55, 0); g.add(aa);
        const ac = []; for (let j = 0; j < 3; j++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10), std(0xffffff)); b.position.set((j - 1) * DB2, -0.62, 0); g.add(b); ac.push(b); }
        g.userData = { aa, ac, stem }; tlG.add(g); return g;
      }
      const pool = [0, 1, 2, 3].map(makeT);
      function paint(g, k) { g.userData.aa.material.color.setHex(aaCol(k)); g.userData.aa.material.emissive.setHex(0x000000); g.userData.ac.forEach((b) => b.material.color.setHex(codCol(k))); }
      const chainM = new THREE.InstancedMesh(new THREE.SphereGeometry(0.17, 18, 14), std(0xffffff, { roughness: 0.3 }), 12); tlG.add(chainM);
      const bondM = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.04, 8, 24), std(0xfacc15, { emissive: 0xfacc15, emissiveIntensity: 0.8, transparent: true, opacity: 0 })); tlG.add(bondM);
      const rf = new THREE.Mesh(new THREE.SphereGeometry(0.35, 22, 16), std(0xef4444, { roughness: 0.4 })); rf.visible = false; tlG.add(rf);
      const XA = SP, XP = 0, XE = -SP, TY = 0.55;      // 슬롯 위치 (tRNA 몸통 가운데)
      let cyc = 0, cf = 0, rel = -1, slot = { A: null, P: null, E: null };
      const ease = (k) => { k = Math.max(0, Math.min(1, k)); return k * k * (3 - 2 * k); };
      const lerp = (a, b, k) => a + (b - a) * k;
      function resetTl() {
        pool.forEach((g) => { g.visible = false; g.position.set(0, 0, 0); });
        cyc = 0; cf = 0; rel = -1; rf.visible = false; bondM.material.opacity = 0;
        const t0 = pool[0]; paint(t0, 0); t0.visible = true; slot = { A: null, P: t0, E: null };
      }
      const chainPts = [new V(), new V(), new V(), new V(), new V(), new V()];
      const chainCurve = new THREE.CatmullRomCurve3(chainPts);
      let lastMsg = '';
      function updTl(dt) {
        if (rel >= 0) {
          rel += dt; if (rel > 4.8) { resetTl(); return; }
        } else {
          cf += dt / 3.4;
          if (cf >= 1) { cf -= 1; cyc++; if (slot.E) slot.E.visible = false; slot.E = slot.P; slot.P = slot.A; slot.A = null; }
        }
        const c = cf, kA = cyc + 1, stopNow = kA === STOP;
        if (rel < 0 && !slot.A && !stopNow) { const g = pool.find((q) => !q.visible); if (g) { g.visible = true; paint(g, kA); slot.A = g; } }
        if (stopNow && !rf.visible) rf.visible = true;
        const arrive = ease(c / 0.35), trans = ease((c - 0.55) / 0.35);
        if (slot.A) { if (c < 0.55) slot.A.position.set(lerp(XA + 2.8, XA, arrive), lerp(TY - 2.0, TY, arrive), 0); else slot.A.position.set(lerp(XA, XP, trans), TY, 0); }
        if (stopNow) { const a = rel >= 0 ? 1 : ease(c / 0.5); rf.position.set(lerp(XA + 2.8, XA, a), lerp(TY - 2.0, TY - 0.05, a), 0); if (rel < 0 && c >= 0.55) { rel = 0; } }
        const noTrans = stopNow;
        if (slot.P) slot.P.position.set(noTrans ? XP : lerp(XP, XE, trans), TY, 0);
        if (slot.E) slot.E.position.set(noTrans ? XE : lerp(XE, XE - 2.6, trans), TY - (noTrans ? 0 : trans * 2.2), 0);
        if (slot.A && c >= 0.35 && c < 0.55) { bondM.material.opacity = 1 - Math.abs((c - 0.45) / 0.1); bondM.position.set((XP + XA) / 2, TY + 0.55, 0); bondM.rotation.y = Math.PI / 2; } else bondM.material.opacity = 0;
        const mshift = cyc + (noTrans ? 0 : trans);
        for (let k = 0; k < NCOD; k++) for (let j = 0; j < 3; j++) { const kk = KC0 + k; M4.makeTranslation(SP * (kk - mshift) + (j - 1) * DB2, MY, 0); mr.setMatrixAt(k * 3 + j, M4); }
        mr.instanceMatrix.needsUpdate = true;
        // 폴리펩타이드 사슬 (가장 새로 붙은 아미노산이 맨 앞)
        const bonded = !!slot.A && c >= 0.45;
        const joined = bonded ? cyc + 2 : cyc + 1;
        const head = bonded ? slot.A : slot.P;
        const hx = head.position.x, hy = head.position.y + 0.55, rl = rel >= 0 ? ease(rel / 2.2) : 0;
        chainPts[0].set(hx, hy, 0); chainPts[1].set(hx - 0.35 - rl * 0.2, hy + 0.35, 0.05); chainPts[2].set(-1.05 - rl * 0.6, 1.25 + rl * 0.5, 0.1);
        chainPts[3].set(-1.7 - rl * 1.2, 1.75 + rl * 0.9, 0.1); chainPts[4].set(-2.1 - rl * 1.6, 2.35 + rl * 1.2, 0.1); chainPts[5].set(-1.9 - rl * 1.8, 3.0 + rl * 1.4, 0.1);
        chainCurve.points = chainPts; chainCurve.needsUpdate = true;
        const n = Math.min(12, joined), tot = chainCurve.getLength(), p = new V();
        for (let i = 0; i < 12; i++) {
          if (i >= n) { M4.makeScale(0, 0, 0); chainM.setMatrixAt(i, M4); continue; }
          chainCurve.getPointAt(Math.min(1, (i * 0.34) / tot), p);
          M4.makeTranslation(p.x, p.y, p.z); chainM.setMatrixAt(i, M4); chainM.setColorAt(i, cc.setHex(aaCol(joined - 1 - i)));
        }
        chainM.instanceMatrix.needsUpdate = true; if (chainM.instanceColor) chainM.instanceColor.needsUpdate = true;
        let m2;
        if (rel >= 0) m2 = '<b>종결</b> · 종결 코돈을 만나면 <b>방출 인자</b>가 들어와 폴리펩타이드가 떨어져 나가요.';
        else if (c < 0.35) m2 = '<b>①</b> 코돈에 맞는 <b>안티코돈</b>의 tRNA가 아미노산을 싣고 A 자리로 들어와요.';
        else if (c < 0.55) m2 = '<b>②</b> 펩타이드 결합: 사슬이 새 아미노산에 이어져요.';
        else m2 = '<b>③</b> 리보솜이 mRNA를 따라 <b>3염기(코돈 1개)</b> 이동해요. 빈 tRNA는 떠나요.';
        if (m2 !== lastMsg) { lastMsg = m2; info(m2 + '<br><span style="color:#9fb0d4">mRNA 코돈 색 = 아미노산 색 · 초록 AUG 시작, 빨강 종결</span>'); }
      }
      const Ltl = {
        rib: label('리보솜 (대단위체)', An(tlG, 0.9, 1.7, 0.3), { color: '#6d28d9' }), sub: label('소단위체', An(tlG, 1.4, -1.7, 0.4), { color: '#be185d' }),
        mrna: label('mRNA (5′ → 3′)', An(tlG, -2.6, MY - 0.15, 0.2), { color: '#9a3412' }), trna: label('tRNA', An(tlG, XA + 0.15, TY - 1.15, 0.3), { color: '#0f766e' }),
        pep: label('폴리펩타이드', An(tlG, -2.2, 3.3, 0.2), { color: '#1e293b' }), cod: label('코돈 ↔ 안티코돈', An(tlG, XP + 0.0, MY - 0.55, 0.3), { color: '#334155' }),
      };

      function setMode(m) {
        mode = m; txG.visible = m === 'tx'; tlG.visible = m === 'tl';
        Object.values(Ltx).forEach((l) => l.show(m === 'tx')); Object.values(Ltl).forEach((l) => l.show(m === 'tl'));
        if (m === 'tx') { lastMsg = ''; infoTx(); } else { lastMsg = ''; }
      }
      function infoTx() { info('<b>전사</b> · RNA 중합 효소가 DNA를 풀며 <b>주형 가닥</b>을 읽어 mRNA를 만들어요.<br>염기쌍: A–U · T–A · G–C · C–G'); }
      const seg = controls.segment('과정', [{ value: 'tx', label: '전사 (DNA → RNA)' }, { value: 'tl', label: '번역 (RNA → 단백질)' }], mode, (v) => setMode(v));
      const sb = controls.button('⏸ 멈추기', () => { paused = !paused; sb.textContent = paused ? '▶ 이어서' : '⏸ 멈추기'; sb.classList.toggle('on', paused); });
      let paused = false;
      resetTl(); setMode('tx');

      let lastSim = null;
      return {
        update(dt, t) {
          dt = Math.min(dt, 0.05);
          const sm = window.__sim && window.__sim.S && window.__sim.S.mode;
          if (sm && sm !== lastSim) { lastSim = sm; const m2 = MODE_OF[sm]; if (m2 && m2 !== mode) { seg.set(m2); setMode(m2); } }
          if (paused) { return; }
          if (mode === 'tx') { progress += dt * 0.07; if (progress > 1) progress = 0; updTx(t); }
          else updTl(dt);
        },
        sync() {},
      };
    },
  });
})();
