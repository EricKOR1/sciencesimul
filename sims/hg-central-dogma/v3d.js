/* hg-central-dogma · 3D 전사와 번역
   전사: RNA 중합 효소가 DNA 이중 가닥을 풀고 주형 가닥을 읽으며 상보적인 mRNA(주황)를 만들어요 (T 대신 U).
   번역: 리보솜(대단위체 + 소단위체)이 mRNA의 코돈을 3염기씩 읽고, 안티코돈을 가진 tRNA가 아미노산을 날라 와 폴리펩타이드로 이어요.
   (mRNA 코돈 → 아미노산 색이 같아요. 시작 코돈 AUG, 종결 코돈 → 폴리펩타이드 방출) */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const narrow = window.innerWidth < 600 || window.innerHeight > window.innerWidth * 1.1;
  const MODE_OF = { flow: 'tx', tx: 'tx', proc: 'tx', tl: 'tl', poly: 'tl' };
  /* 2D 차시와 같은 유전자: mRNA 5′-AUG GAA CCA UGG UUU AAA UAA-3′ → Met · Glu · Pro · Trp · Phe · Lys (종결) */
  const CODONS = ['AUG', 'GAA', 'CCA', 'UGG', 'UUU', 'AAA', 'UAA'], AA3 = ['Met', 'Glu', 'Pro', 'Trp', 'Phe', 'Lys'];
  const AAC = [0xf87171, 0xfbbf24, 0x34d399, 0x38bdf8, 0xa78bfa, 0xf472b6, 0xa3e635, 0xfb923c];

  window.SciSim3D.attach({
    title: '전사 · 번역 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: narrow ? 12 : 8.8, theta: 0.22, phi: 1.3, target: narrow ? [-0.7, 0, 0] : [0, 0.7, 0], min: 5, max: 20 },
    autoRotate: 0,
    levels: [2],   // 번역 단계만 3D(tRNA 고르기 · 사슬 방출은 3D 조작 줄의 단추로). 화살표 이름 · 주형 가닥 서열 · RNA 가공 · 모의실험은 캔버스에서 해요
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const V = THREE.Vector3, M4 = new THREE.Matrix4(), cc = new THREE.Color();
      if (narrow) root.rotation.z = Math.PI / 2;      // 휴대폰(세로 화면)에서는 눕혀 둔 모형을 세워서 보여 줘요
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
      function updTx(t) {          // t: 0~1 (한 주기 안의 위치). 전사 진행(progress)은 전역 변수
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
        pol.position.set(px, 0.25, -0.1); mrnaAnch.position.set(px - 1.6, -1.55, 0.4);
        NTP.forEach((o, i) => { const k = (t * 6 + o.ph) % 1; o.m.position.set(px + 1.8 - k * 1.7, 1.9 - k * 1.5, 0.9 - k * 0.7); o.m.scale.setScalar(k > 0.92 ? 0.01 : 1); });
      }
      const mrnaAnch = An(txG, 0, -2.0, 0.4);
      const Ltx = {
        pol: label('RNA 중합 효소', An(txG, 0, 1.55, 0), { color: '#0f766e' }), dna: label('DNA', An(txG, -4.7, 1.0, 0), { color: '#1d4ed8' }),
        pro: label('프로모터', An(txG, -4.75, -1.0, 0.1), { color: '#0369a1' }), ter: label('종결 서열', An(txG, 4.75, -1.0, 0.1), { color: '#b91c1c' }), tpl: label('주형 가닥', An(txG, 3.6, -0.75, 0.2), { color: '#1e3a8a' }), mrna: label('mRNA', mrnaAnch, { color: '#9a3412' }), ntp: label('RNA 뉴클레오타이드', An(txG, 0, 2.5, 0.9), { color: '#92400e' }),
      };

      /* ===================== 번역 ===================== */
      const SP = 0.65, DB2 = SP / 3, NCOD = 16, KC0 = -3;       // 코돈 간격, 구슬 간격, 코돈 개수, 첫 코돈 번호
      const STOP = 6;
      const codCol = (k) => (k < 0 || k > STOP ? 0x94a3b8 : k === 0 ? 0x22c55e : k === STOP ? 0xef4444 : AAC[(k * 3) % 8]);
      const aaCol = (k) => (k === 0 ? 0x22c55e : AAC[(k * 3) % 8]);
      const mr = new THREE.InstancedMesh(new THREE.SphereGeometry(0.115, 12, 10), std(0xffffff, { roughness: 0.35 }), NCOD * 3);
      for (let k = 0; k < NCOD; k++) for (let j = 0; j < 3; j++) mr.setColorAt(k * 3 + j, cc.setHex(codCol(KC0 + k)));
      mr.instanceColor.needsUpdate = true; mr.userData.v3bg = true; tlG.add(mr);   // 긴 mRNA 가닥은 화면 밖까지 이어져요: 자동 맞춤은 리보솜 쪽을 크게
      const MY = -0.62;
      // 리보솜
      const big = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), std(0xa78bfa, { transparent: true, opacity: 0.4, depthWrite: false, roughness: 0.35 })); big.scale.set(2.2, 1.2, 1.4); big.position.set(0.1, 0.6, 0); tlG.add(big); big.renderOrder = 2;
      const small = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), std(0xf9a8d4, { transparent: true, opacity: 0.5, depthWrite: false, roughness: 0.35 })); small.scale.set(1.8, 0.62, 1.15); small.position.set(0.1, -1.17, 0); tlG.add(small); small.renderOrder = 2;
      // tRNA 풀
      function makeT() {
        const g = new THREE.Group();
        const stem = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.62, 8, 16), std(0x2dd4bf, { roughness: 0.4 })); stem.position.y = -0.05; g.add(stem);
        const lobe = new THREE.Mesh(new THREE.SphereGeometry(0.22, 18, 14), std(0x14b8a6)); lobe.position.set(0.17, 0.2, 0); g.add(lobe);
        const aa = new THREE.Mesh(new THREE.SphereGeometry(0.22, 22, 16), std(0xffffff, { roughness: 0.3 })); aa.position.set(0, 0.62, 0); g.add(aa);
        const ac = []; for (let j = 0; j < 3; j++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.115, 14, 10), std(0xffffff)); b.position.set((j - 1) * DB2, -0.52, 0); g.add(b); ac.push(b); }
        g.userData = { aa, ac, stem }; tlG.add(g); g.userData.lab = label('', aa, { color: 'rgba(15,23,42,.85)', size: 12, offset: [0.38, 0.0, 0] }); return g;
      }
      const pool = [0, 1, 2, 3].map(makeT);
      function paint(g, k) { if (g.userData.k === k) return; g.userData.k = k; g.userData.lab.set(AA3[k] || ''); g.userData.aa.material.color.setHex(aaCol(k)); g.userData.aa.material.emissive.setHex(0x000000); g.userData.ac.forEach((b) => b.material.color.setHex(codCol(k))); }
      const chainM = new THREE.InstancedMesh(new THREE.SphereGeometry(0.17, 18, 14), std(0xffffff, { roughness: 0.3 }), 12); tlG.add(chainM);
      const bondM = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.04, 8, 24), std(0xfacc15, { emissive: 0xfacc15, emissiveIntensity: 0.8, transparent: true, opacity: 0 })); tlG.add(bondM);
      const rf = new THREE.Mesh(new THREE.SphereGeometry(0.35, 22, 16), std(0xef4444, { roughness: 0.4 })); rf.visible = false; tlG.add(rf);
      const XA = SP, XP = 0, XE = -SP, TY = -0.1;      // 슬롯 위치 (tRNA 몸통 가운데)
            const ease = (k) => { k = Math.max(0, Math.min(1, k)); return k * k * (3 - 2 * k); };
      const lerp = (a, b, k) => a + (b - a) * k;
      const chainPts = [new V(), new V(), new V(), new V(), new V(), new V()];
      const chainCurve = new THREE.CatmullRomCurve3(chainPts);
      let lastMsg = '';
      const CL = 2.6, T_INI = 3.0, T_REL0 = T_INI + (STOP - 1) * CL + 0.55 * CL, T_END = T_REL0 + 4.8, TL_DUR = 23;
      // 코돈 글자 (mRNA 위, 눈에 보이는 코돈만)
      const codLabs = CODONS.map((cd, i) => { const a = An(tlG, 0, MY - 0.38, 0); const l = label(cd, a, { color: 'rgba(30,41,59,.9)', size: 12 }); l.a = a; l.k = i; return l; });
      function updTl(T) {
        const ini = T < T_INI, rel = T >= T_REL0 ? Math.min(4.8, T - T_REL0) : -1;
        const te = Math.max(0, T - T_INI);
        let cyc = Math.floor(te / CL), c = (te - cyc * CL) / CL;
        if (rel >= 0) { cyc = STOP - 1; c = 0.55; }
        const stopNow = cyc + 1 === STOP;
        pool.forEach((g) => { g.visible = false; });
        const gOf = (k) => pool[k % 4];
        const arrive = ease(c / 0.35), trans = ease((c - 0.55) / 0.35);
        const noTrans = stopNow;
        let A = null, P = gOf(cyc), E = cyc >= 1 ? gOf(cyc - 1) : null;
        if (!stopNow && !ini) A = gOf(cyc + 1);
        paint(P, cyc); P.visible = !ini || T > 2.0;
        if (E) { paint(E, cyc - 1); E.visible = true; }
        if (A) { paint(A, cyc + 1); A.visible = true; }
        rf.visible = stopNow && !ini;
        if (A) { if (c < 0.55) A.position.set(lerp(XA + 2.8, XA, arrive), lerp(TY - 2.0, TY, arrive), 0); else A.position.set(lerp(XA, XP, trans), TY, 0); }
        if (stopNow) { const a = rel >= 0 ? 1 : ease(c / 0.5); rf.position.set(lerp(XA + 2.8, XA, a), lerp(TY - 2.0, TY - 0.05, a), 0); }
        P.position.set(noTrans ? XP : lerp(XP, XE, trans), TY, 0);
        if (E) E.position.set(noTrans ? XE : lerp(XE, XE - 2.6, trans), TY - (noTrans ? 0 : trans * 2.2), 0);
        // 개시: 소단위체가 mRNA를 따라 AUG까지 → 개시 tRNA(Met) → 대단위체 결합
        const scan = ini ? ease(T / 2.0) : 1, bigK = ini ? ease((T - 2.0) / 1.0) : 1;
        small.position.set(lerp(-3.3, 0.1, scan), -1.17, 0); big.position.set(0.1, lerp(3.2, 0.6, bigK), 0); big.visible = !(ini && T < 2.0);
        P.scale.setScalar(ini ? Math.max(0.01, ease((T - 2.0) / 1.0)) : 1);
        if (ini) P.position.set(XP, lerp(TY - 1.0, TY, ease((T - 2.0) / 1.0)), 0);
        bondM.material.opacity = (A && c >= 0.35 && c < 0.55) ? 1 - Math.abs((c - 0.45) / 0.1) : 0; bondM.position.set((XP + XA) / 2, TY + 0.55, 0); bondM.rotation.y = Math.PI / 2;
        const mshift = cyc + (noTrans ? 0 : trans);
        for (let k = 0; k < NCOD; k++) for (let j = 0; j < 3; j++) { const kk = KC0 + k; M4.makeTranslation(SP * (kk - mshift) + (j - 1) * DB2, MY, 0); mr.setMatrixAt(k * 3 + j, M4); }
        mr.instanceMatrix.needsUpdate = true;
        codLabs.forEach((l) => { const x = SP * (l.k - mshift); l.a.position.set(x, MY - 0.38, 0); l.show(mode === 'tl' && x > -3.6 && x < 3.9); });
        // 폴리펩타이드 사슬
        const bonded = !!A && c >= 0.45, joined = ini ? 0 : bonded ? cyc + 2 : cyc + 1;
        const head = bonded ? A : P, rl = rel >= 0 ? ease(rel / 2.2) : 0;
        const hx = head.position.x, hy = head.position.y + 0.55;
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
        if (ini) m2 = T < 2.0 ? '<b>개시</b> · 소단위체가 mRNA를 따라 이동하며 시작 코돈 <b>AUG</b>를 찾아요.' : '<b>개시</b> · 개시 tRNA(Met)가 AUG에 짝지어지고 <b>대단위체</b>가 붙어요.';
        else if (rel >= 0) m2 = '<b>종결</b> · 종결 코돈 <b>UAA</b>를 만나면 방출 인자가 들어와 폴리펩타이드(Met–Glu–Pro–Trp–Phe–Lys)가 떨어져 나가요.';
        else if (c < 0.35) m2 = '<b>신장 ①</b> · A 자리의 코돈 <b>' + CODONS[cyc + 1] + '</b>에 맞는 안티코돈의 tRNA(' + AA3[cyc + 1] + ')가 들어와요.';
        else if (c < 0.55) m2 = '<b>신장 ②</b> · 펩타이드 결합: 사슬이 새 아미노산(' + AA3[cyc + 1] + ')에 이어져요.';
        else m2 = '<b>신장 ③</b> · 리보솜이 mRNA를 따라 <b>3염기(코돈 1개)</b> 이동해요. 빈 tRNA는 E 자리를 거쳐 떠나요.';
        if (m2 !== lastMsg) { lastMsg = m2; info(m2 + '<br><span style="color:#9fb0d4">mRNA 5′-AUG GAA CCA UGG UUU AAA UAA-3′ · 시작 코돈 AUG(초록) · 종결 코돈 UAA(빨강)</span>'); }
      }
      const Ltl = {
        rib: label('리보솜 (대단위체)', An(tlG, 0.9, 1.7, 0.3), { color: '#6d28d9' }), sub: label('소단위체', An(tlG, 1.4, -1.7, 0.4), { color: '#be185d' }),
        mrna: label('mRNA (5′ → 3′)', An(tlG, -2.6, MY - 0.15, 0.2), { color: '#9a3412' }), trna: label('tRNA', An(tlG, XA + 0.15, TY - 1.15, 0.3), { color: '#0f766e' }),
        pep: label('폴리펩타이드', An(tlG, -2.2, 3.3, 0.2), { color: '#1e293b' }), cod: label('코돈 ↔ 안티코돈', An(tlG, XP + 0.0, MY - 0.55, 0.3), { color: '#334155' }),
      };

      const ctlEl = document.querySelector('.v3-ctl');
      const grp = (fn) => { const n0 = ctlEl ? ctlEl.children.length : 0; fn(); return ctlEl ? Array.prototype.slice.call(ctlEl.children, n0) : []; };
      const showG = (arr, on) => arr.forEach((e) => { e.style.display = on ? '' : 'none'; });
      let plTx, plTl, other = '';
      const gTx = grp(() => {
        plTx = controls.player({
          duration: 14, loop: true, autoplay: true, label: '전사',
          phases: [[0, '개시: 프로모터에 결합'], [0.1, '신장: mRNA 합성'], [0.9, '종결: 종결 서열']],
          onFrame(p) { progress = Math.max(0, Math.min(1, (p - 0.1) / 0.8)); if (mode === 'tx') updTx(p); },
        });
      });
      const gTl = grp(() => {
        plTl = controls.player({
          duration: TL_DUR, loop: true, autoplay: true, label: '번역',
          phases: [[0, '개시'], [T_INI / TL_DUR, '신장: Glu'], [(T_INI + CL) / TL_DUR, 'Pro'], [(T_INI + 2 * CL) / TL_DUR, 'Trp'], [(T_INI + 3 * CL) / TL_DUR, 'Phe'], [(T_INI + 4 * CL) / TL_DUR, 'Lys'], [(T_INI + 5 * CL) / TL_DUR, '종결: UAA']],
          onFrame(p) { if (mode === 'tl') updTl(Math.min(p * TL_DUR, T_END)); },
        });
      });
      /* 2D와 같은 번역 미션: A 자리에 들어올 tRNA 고르기 · 사슬 방출 (2D의 tlPick · tlRelease를 불러요) */
      let pickB = [], relB = null;
      const gPick = grp(() => {
        pickB = [0, 1, 2].map((i) => controls.button('tRNA', () => { const L = ctx.lesson(); if (L && L.tlPick) L.tlPick(i); }));
        relB = controls.button('✂ 사슬 방출', () => { const L = ctx.lesson(); if (L && L.tlRelease) L.tlRelease(); });
      });
      let pickKey = '';
      function updPick() {
        const L = ctx.lesson(), T2 = L && L.TL, on = mode === 'tl' && lastSim === 'tl' && T2;
        const st = on ? T2.state : '', key = st + '|' + (on ? T2.cand.map((c) => c.anti).join(',') : '');
        if (key === pickKey) return; pickKey = key;
        pickB.forEach((b, i) => { const c = on && st === 'wait' && T2.cand[i]; b.style.display = c ? '' : 'none'; if (c) b.textContent = 'tRNA 3′-' + c.anti + '-5′'; });
        if (relB) relB.style.display = on && st === 'stopwait' ? '' : 'none';
      }
      /* 폴리리보솜: 같은 mRNA에 리보솜이 여러 개 붙어 있어요 */
      const polyG = new THREE.Group(); polyG.visible = false; tlG.add(polyG);
      [-4.6, 4.6].forEach((x) => { const b2 = new THREE.Mesh(big.geometry, big.material.clone()), s2 = new THREE.Mesh(small.geometry, small.material.clone()); b2.material.opacity = 0.28; s2.material.opacity = 0.32; b2.scale.copy(big.scale); s2.scale.copy(small.scale); b2.position.set(big.position.x + x, big.position.y, 0); s2.position.set(small.position.x + x, small.position.y, 0); polyG.add(b2, s2); });
      const lPoly = label('리보솜 여러 개 (폴리리보솜)', An(tlG, 4.7, 2.3, 0), { color: '#6d28d9' }); lPoly.show(false);
      function setMode(m) {
        mode = m; txG.visible = m === 'tx'; tlG.visible = m === 'tl';
        Object.values(Ltx).forEach((l) => l.show(m === 'tx')); Object.values(Ltl).forEach((l) => l.show(m === 'tl'));
        showG(gTx, m === 'tx'); showG(gTl, m === 'tl');
        lastMsg = ''; if (m === 'tx') { infoTx(); updTx(plTx.p); } else updTl(Math.min(plTl.p * TL_DUR, T_END));
      }
      function infoTx() {
        const p = plTx.p, ph = p < 0.1 ? '<b>① 개시</b> · RNA 중합 효소가 <b>프로모터</b>에 결합하고 DNA 이중 가닥이 풀려요.' : p < 0.9 ? '<b>② 신장</b> · <b>주형 가닥</b>을 3′→5′로 읽으며 상보적인 mRNA를 5′→3′로 만들어요. (염기쌍: A–U · T–A · G–C · C–G)' : '<b>③ 종결</b> · <b>종결 서열</b>에 도착하면 RNA 중합 효소와 mRNA가 DNA에서 떨어져요.';
        const key = ph + other; if (key !== lastMsg) { lastMsg = key; info(ph + (other ? '<br><span style="color:#fcd34d">' + other + '</span>' : '')); }
      }
      setMode('tx');

      /* 2D에서 어느 화면인지 · 진행 정도를 따라가요 */
      let lastSim = null, lastTx = -1, lastTl = '', tlTo = null;
      function poll() {
        const L = ctx.lesson(); if (!L || !L.S) return;
        const sm = L.S.mode;
        if (sm !== lastSim) {
          lastSim = sm; const m2 = MODE_OF[sm];
          other = sm === 'proc' ? 'RNA 가공: 5′ 캡과 폴리 A 꼬리를 붙이고, 인트론을 잘라 내요(스플라이싱).' : sm === 'poly' ? '폴리리보솜: 리보솜 여러 개가 mRNA 하나를 동시에 번역해요.' : '';
          if (m2 && m2 !== mode) setMode(m2); else { lastMsg = ''; }
        }
        if (sm === 'tx' && L.TX && L.TX.state !== 'idle' && !plTx.playing) {
          const q = L.TX.q; if (q !== lastTx) { lastTx = q; const pr = Math.max(0, Math.min(1, (q - 4) / 21)); plTx.set(0.1 + 0.8 * pr); }
        }
        polyG.visible = sm === 'poly'; lPoly.show(sm === 'poly' && mode === 'tl');
        if (sm === 'tl' && L.TL) {     // 2D 번역의 상태와 같은 장면: 움직이는 상태는 그 구간만 재생하고 멈춰요
          const TLs = L.TL, key = TLs.state + TLs.rk + (TLs.released ? 'r' : ''), c0 = T_INI + Math.min(STOP - 1, TLs.rk) * CL;
          if (key !== lastTl) {
            lastTl = key; const st = TLs.state;
            const span = { idle: [0, 0], scan: [0, 2.4], dock: [2.4, T_INI - 0.05], wait: [c0 + 0.02, c0 + 0.02], enter: [c0 + 0.02, c0 + 0.4 * CL], bond: [c0 + 0.4 * CL, c0 + 0.55 * CL], trans: [c0 + 0.55 * CL, c0 + 0.97 * CL], stopwait: [T_REL0 - 0.02, T_REL0 - 0.02], release: [T_REL0, T_END], done: [T_END, T_END] }[st] || [c0, c0];
            tlTo = span[1]; plTl.set(Math.min(1, span[0] / TL_DUR)); if (span[1] > span[0]) plTl.play(); else plTl.pause();
          }
          if (tlTo != null && plTl.playing && plTl.p * TL_DUR >= tlTo) { plTl.pause(); plTl.set(Math.min(1, tlTo / TL_DUR)); tlTo = null; }
        }
        updPick();
      }
      return {
        update(dt) {
          poll();
          if (mode === 'tx') infoTx();
          else updTl(Math.min(plTl.p * TL_DUR, T_END));
        },
        sync() { poll(); },
      };
    },
  });
})();
