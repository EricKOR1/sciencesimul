/* hc-bond-polarity · 3D 결합의 극성과 쌍극자
   결합마다 전자가 치우쳐 쌍극자(δ+ → δ−)가 생겨요. 모양에 따라 합이 0이면 무극성 분자예요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
    /* ---- 공용 도우미: 분자 모형 · 유리 상자 · 화살표 ---- */
  function makeLib(THREE) {
    const COL = { H: 0xf3f6fb, C: 0x8a93a3, N: 0x4f7cff, O: 0xf0524f, F: 0x9be36b, Cl: 0x34c759, Na: 0xb07cf5, B: 0xf4a6a6, S: 0xf5c518, Cu: 0xe08a3c, Ca: 0x6fd0c4, e: 0xffd34d };
    const RAD = { H: 0.26, C: 0.38, N: 0.37, O: 0.36, F: 0.32, Cl: 0.48, Na: 0.5, B: 0.36, S: 0.48, Cu: 0.5, Ca: 0.55 };
    const mats = {};
    const mat = (k) => mats[k] || (mats[k] = new THREE.MeshStandardMaterial({ color: COL[k] !== undefined ? COL[k] : k, roughness: 0.36, metalness: 0.06 }));
    const SG = new THREE.SphereGeometry(1, 28, 20);
    const CG = new THREE.CylinderGeometry(1, 1, 1, 16);
    const stickMat = new THREE.MeshStandardMaterial({ color: 0xc3ccdd, roughness: 0.45, metalness: 0.1 });
    const V = (x, y, z) => new THREE.Vector3(x, y, z);
    function atom(k, s, pal) { const m = new THREE.Mesh(SG, mat(pal && pal[k] !== undefined ? pal[k] : k)); m.scale.setScalar((RAD[k] || 0.4) * (s || 1)); return m; }
    function stick(a, b, r, m) {
      const d = b.clone().sub(a), len = d.length(); const s = new THREE.Mesh(CG, m || stickMat);
      s.scale.set(r, Math.max(len, 1e-4), r); s.position.copy(a).add(b).multiplyScalar(0.5);
      s.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); return s;
    }
    const T = [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]];
    const MOLS = {
      H2: { f: 'H₂', a: [['H', -0.45, 0, 0], ['H', 0.45, 0, 0]], b: [[0, 1, 1]] },
      O2: { f: 'O₂', a: [['O', -0.72, 0, 0], ['O', 0.72, 0, 0]], b: [[0, 1, 2]] },
      N2: { f: 'N₂', a: [['N', -0.66, 0, 0], ['N', 0.66, 0, 0]], b: [[0, 1, 3]] },
      H2O: { f: 'H₂O', a: [['O', 0, 0.2, 0], ['H', 0.91, -0.5, 0], ['H', -0.91, -0.5, 0]], b: [[0, 1, 1], [0, 2, 1]] },
      CO2: { f: 'CO₂', a: [['C', 0, 0, 0], ['O', 1.4, 0, 0], ['O', -1.4, 0, 0]], b: [[0, 1, 2], [0, 2, 2]] },
      CH4: { f: 'CH₄', a: [['C', 0, 0, 0]].concat(T.map((t) => ['H', t[0] * 0.75, t[1] * 0.75, t[2] * 0.75])), b: [[0, 1, 1], [0, 2, 1], [0, 3, 1], [0, 4, 1]] },
      NH3: { f: 'NH₃', a: [['N', 0, 0.3, 0], ['H', 1.1, -0.15, 0], ['H', -0.55, -0.15, 0.953], ['H', -0.55, -0.15, -0.953]], b: [[0, 1, 1], [0, 2, 1], [0, 3, 1]] },
      HCl: { f: 'HCl', a: [['Cl', 0.6, 0, 0], ['H', -0.9, 0, 0]], b: [[0, 1, 1]] },
      HF: { f: 'HF', a: [['F', 0.4, 0, 0], ['H', -0.7, 0, 0]], b: [[0, 1, 1]] },
      NO2: { f: 'NO₂', a: [['N', 0, 0.28, 0], ['O', 1.33, -0.28, 0], ['O', -1.33, -0.28, 0]], b: [[0, 1, 1], [0, 2, 1]] },
      N2O4: { f: 'N₂O₄', a: [['N', 0.95, 0, 0], ['N', -0.95, 0, 0], ['O', 1.7, 1, 0], ['O', 1.7, -1, 0], ['O', -1.7, 1, 0], ['O', -1.7, -1, 0]], b: [[0, 1, 1], [0, 2, 1], [0, 3, 1], [1, 4, 1], [1, 5, 1]] },
      BF3: { f: 'BF₃', a: [['B', 0, 0, 0], ['F', 1.55, 0, 0], ['F', -0.775, 0, 1.342], ['F', -0.775, 0, -1.342]], b: [[0, 1, 1], [0, 2, 1], [0, 3, 1]] },
      CCl4: { f: 'CCl₄', a: [['C', 0, 0, 0]].concat(T.map((t) => ['Cl', t[0] * 1.2, t[1] * 1.2, t[2] * 1.2])), b: [[0, 1, 1], [0, 2, 1], [0, 3, 1], [0, 4, 1]] },
      H3O: { f: 'H₃O⁺', a: [['O', 0, 0.3, 0], ['H', 1.0, -0.1, 0], ['H', -0.5, -0.1, 0.866], ['H', -0.5, -0.1, -0.866]], b: [[0, 1, 1], [0, 2, 1], [0, 3, 1]] },
      OH: { f: 'OH⁻', a: [['O', -0.2, 0, 0], ['H', 0.75, 0, 0]], b: [[0, 1, 1]] },
    };
    /* 분자 만들기: k는 크기 배율. 이중·삼중 결합은 막대 여러 개 */
    function mol(M, k, pal) {
      k = k || 1; const g = new THREE.Group(); const P = M.a.map((x) => V(x[1] * k, x[2] * k, x[3] * k));
      M.a.forEach((x, i) => { const m = atom(x[0], k, pal); m.position.copy(P[i]); g.add(m); });
      M.b.forEach((b) => {
        const A = P[b[0]], B = P[b[1]], d = B.clone().sub(A).normalize();
        let perp = d.clone().cross(V(0, 0, 1)); if (perp.lengthSq() < 0.01) perp = d.clone().cross(V(0, 1, 0)); perp.normalize().multiplyScalar(0.11 * k);
        const offs = b[2] === 1 ? [0] : b[2] === 2 ? [-1, 1] : [-1.7, 0, 1.7];
        const r = (b[2] === 1 ? 0.085 : b[2] === 2 ? 0.06 : 0.05) * k;
        offs.forEach((o) => g.add(stick(A.clone().addScaledVector(perp, o), B.clone().addScaledVector(perp, o), r)));
      });
      return g;
    }
    /* 반투명 유리 상자 (가장자리 선 포함). 크기는 scale로 조절 */
    function glassBox(w, h, d, color, op) {
      const g = new THREE.Group();
      const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: color || 0x9ec5ff, transparent: true, opacity: op === undefined ? 0.13 : op, roughness: 0.15, metalness: 0, depthWrite: false }));
      const e = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)), new THREE.LineBasicMaterial({ color: 0xcfe0ff, transparent: true, opacity: 0.75 }));
      g.add(m, e); g.scale.set(w, h, d); g.userData.fill = m; return g;
    }
    function tube(pts, r, color, seg) {
      const c = new THREE.CatmullRomCurve3(pts.map((p) => (p.isVector3 ? p : V(p[0], p[1], p[2]))));
      return new THREE.Mesh(new THREE.TubeGeometry(c, seg || 40, r, 10, false), new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.2 }));
    }
    /* 화살표: from → to */
    function arrow(from, to, color, r, headLen) {
      const g = new THREE.Group(); const a = V(from[0], from[1], from[2]), b = V(to[0], to[1], to[2]); const d = b.clone().sub(a), len = d.length();
      if (len < 1e-3) return g; const hl = Math.min(headLen || 0.4, len * 0.6); const m = new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.1 });
      const dir = d.clone().normalize(); const tip = b.clone();
      const sh = new THREE.Mesh(CG, m); sh.scale.set(r, len - hl, r); sh.position.copy(a).addScaledVector(dir, (len - hl) / 2); sh.quaternion.setFromUnitVectors(V(0, 1, 0), dir);
      const hd = new THREE.Mesh(new THREE.ConeGeometry(r * 2.6, hl, 20), m); hd.position.copy(tip).addScaledVector(dir, -hl / 2); hd.quaternion.setFromUnitVectors(V(0, 1, 0), dir);
      g.add(sh, hd); return g;
    }
    function clear(g) { while (g.children.length) g.remove(g.children[0]); }
    const rnd = (a, b) => a + Math.random() * (b - a);
    const sstep = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
    return { COL, RAD, mat, atom, stick, mol, MOLS, glassBox, tube, arrow, clear, rnd, sstep, V, SG, CG, stickMat };
  }

  const phone = window.matchMedia && window.matchMedia('(max-width: 599px)').matches;
  window.SciSim3D.attach({
    title: '결합의 극성 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대 · 전기 음성도 슬라이더는 2D와 똑같이 이어져요',
    camera: { dist: phone ? 9.6 : 8.4, theta: 0.45, phi: 1.2, min: 4, max: 20, target: [0, 0.3, 0] },
    autoRotate: 0.1,
    levels: [0],
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const L = makeLib(THREE);
      const clamp = (x, a, b) => Math.max(a, Math.min(b, x)), sm = L.sstep;
      const enCol = (e10) => { const t = Math.pow(clamp((e10 - 8) / 32, 0, 1), 0.85); return new THREE.Color(0xf1ebfd).lerp(new THREE.Color(0x5b21b6), t); };
      const f1 = (v) => (v / 10).toFixed(1);
      const XA = -1.9, XB = 1.9, RA = 0.62;
      const grp = new THREE.Group(); root.add(grp);
      const matA = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35 }), matB = matA.clone();
      const atA = new THREE.Mesh(L.SG, matA), atB = new THREE.Mesh(L.SG, matB); atA.scale.setScalar(RA); atB.scale.setScalar(RA); atA.position.x = XA; atB.position.x = XB; grp.add(atA, atB);
      const shMat = (c) => new THREE.MeshStandardMaterial({ color: c, transparent: true, opacity: 0.12, roughness: 0.2, depthWrite: false });
      const shA = new THREE.Mesh(L.SG, shMat(0xdde6f5)), shB = new THREE.Mesh(L.SG, shMat(0xdde6f5)); shA.position.x = XA; shB.position.x = XB; grp.add(shA, shB);
      const ND = 460;
      const dots = new THREE.InstancedMesh(L.SG, new THREE.MeshStandardMaterial({ color: 0xffd34d, emissive: 0xffb300, emissiveIntensity: 0.9, roughness: 0.4, transparent: true, opacity: 0.85 }), ND);
      dots.frustumCulled = false; grp.add(dots);
      const dd = []; for (let i = 0; i < ND; i++) dd.push({ p: new THREE.Vector3(), c: 0.5 + Math.random() * 0.7 });
      const dum = new THREE.Object3D();
      const lA = label('', [XA, 0, 0], { size: 13.5 }), lB = label('', [XB, 0, 0], { size: 13.5 });
      lA.off = [0, -1.25, 0]; lB.off = [0, -1.25, 0]; lA.el.style.color = lB.el.style.color = '#fff';
      const dA = label('', [XA, 0, 0], { size: 13 }), dB = label('', [XB, 0, 0], { size: 13 }); dA.off = [0, 1.05, 0]; dB.off = [0, 1.05, 0];
      const arrowG = new THREE.Group(); grp.add(arrowG);
      const dipL = label('쌍극자 모멘트', [0, 1.75, 0], { size: 12, color: 'rgba(255,200,40,.95)' }); dipL.el.style.color = '#1b2333';
      let pos = 0.5;
      function resample(i) {
        const d = dd[i], atB2 = Math.random() < pos, cx = atB2 ? XB : XA, spread = 0.55 + RA * 0.9;
        let x = cx + (Math.random() + Math.random() + Math.random() - 1.5) * spread * 1.6;
        if (atB2) x = Math.max(x, XA + (XB - XA) * 0.25); else x = Math.min(x, XB - (XB - XA) * 0.25);
        const r = (Math.random() + Math.random() + Math.random() - 1.5) * 1.1, th = Math.random() * Math.PI * 2, fall = Math.max(0.35, 1 - Math.abs(x - cx) / (spread * 1.6) * 0.5);
        d.p.set(x, r * Math.cos(th) * fall * 0.7, r * Math.sin(th) * fall * 0.7);
      }
      const clClass = (d) => d === 0 ? ['무극성 공유 결합', '두 원자의 전기 음성도가 같아 전자쌍이 가운데에 있고 부분 전하가 없어요.'] : d < 5 ? ['극성이 약한 공유 결합', 'Δχ가 작아 전자쌍이 조금 치우쳐서 부분 전하(δ⁺, δ⁻)가 작게 생겨요.'] : d < 20 ? ['극성 공유 결합', 'Δχ가 클수록 전자쌍이 더 많이 치우치고 δ⁺, δ⁻가 커져요.'] : ['극성이 매우 큰 결합', '전자쌍이 거의 한쪽에 가 있어요. 실제 물질에서는 금속 + 비금속이면 이온 결합이에요.'];

      /* ▶ 재생: 오른쪽 원자의 전기 음성도를 올려 가며 전자 구름이 쏠리는 모습 */
      let own = false, sig = '', pB = 0;
      const rowOf = () => { const r = document.querySelectorAll('.v3-player'); return r[r.length - 1]; };
      const pl = controls.player({ duration: 9, loop: true, label: 'χ(B) 올리기', phases: [[0, 'Δχ = 0'], [0.1, 'χ(B) 커지는 중'], [0.55, '최대'], [0.7, '내리는 중']], onFrame(p) { pB = p; own = p > 0; } });
      const rowP = rowOf();
      const bAnim = (p) => (p < 0.1 ? 0 : p < 0.55 ? sm((p - 0.1) / 0.45) : p < 0.7 ? 1 : 1 - sm((p - 0.7) / 0.3));
      const qOf = (d10) => sm(d10 / 10 / 2.4);
      let accT = 0, lastKey = '', shown = { pos: 0.5 };

      function setAtoms(sA, sB, eA, eB) {
        matA.color.copy(enCol(eA)); matB.color.copy(enCol(eB));
      }
      return {
        update(dt, t) {
          const Z = ctx.lesson(); if (!Z) return; dt = Math.min(dt, 0.05);
          const S = Z.S, sc = S.scene;
          let sA = 'A', sB = 'B', eA = S.cl.a, eB = S.cl.b, nmA = '왼쪽 A 원자', nmB = '오른쪽 B 원자', cposT = null, arr = S.cl.arr || 0, showAll = true, note = '';
          const cloudScene = sc === 'cloud' || !sc;
          if (cloudScene) { const sg = [S.cl.a, S.cl.b].join('|'); if (sg !== sig) { sig = sg; if (own) { own = false; pl.pause(); pl.set(0); } } }
          rowP.style.display = cloudScene ? '' : 'none'; if (!cloudScene && pl.playing) pl.pause();
          let d, q, posT;
          if (cloudScene) {
            if (own) { eB = Math.round(eA + (40 - eA) * bAnim(pB)); }
            d = Math.abs(eA - eB); posT = own ? 0.5 + 0.5 * Math.sign(eB - eA) * qOf(d) : S.cl.pos;
            if (own) arr = d > 0 ? 1 : 0;
          } else {
            let b = null;
            if (sc === 'arrows') b = Z.CARDS[S.ar.sel]; else if (sc === 'scale' && S.sc.sel != null) b = Z.SCB[S.sc.sel];
            if (!b) { b = Z.CARDS[S.ar.sel] || Z.CARDS[3]; }
            sA = b.a; sB = b.b; eA = b.ea; eB = b.eb; nmA = sA + ' 원자'; nmB = sB + ' 원자';
            d = b.d10; const done = sc === 'arrows' ? !!S.ar.done[b.id] : true;
            posT = done ? 0.5 + 0.5 * Math.sign(eB - eA) * qOf(d) : 0.5; arr = done && d > 0 ? 1 : 0; showAll = done;
            if (!done) note = '2D에서 Δχ와 화살표 방향을 정하면 전자 구름이 쏠려요.';
          }
          q = qOf(d); pos += (posT - pos) * (1 - Math.pow(0.003, dt));
          setAtoms(sA, sB, eA, eB);
          lA.set((cloudScene ? 'A' : sA) + '<br><small>χ = ' + f1(eA) + '</small>'); lB.set((cloudScene ? 'B' : sB) + '<br><small>χ = ' + f1(eB) + '</small>');
          const lowA = eA < eB, show = showAll && d > 0 && q > 0.04;
          const chg = (isDelta, big) => (isDelta ? 'δ⁺' : 'δ⁻');
          dA.show(show); dB.show(show);
          if (show) { dA.set(lowA ? 'δ⁺' : 'δ⁻'); dB.set(lowA ? 'δ⁻' : 'δ⁺'); dA.el.style.background = lowA ? 'rgba(235,70,70,.88)' : 'rgba(60,110,255,.88)'; dB.el.style.background = lowA ? 'rgba(60,110,255,.88)' : 'rgba(235,70,70,.88)'; }
          const cs = (side) => { const lo = side === 'A' ? lowA : !lowA; return lo ? 0xff3b3b : 0x3b6bff; };
          shA.material.color.setHex(d > 0 ? cs('A') : 0xdde6f5); shB.material.color.setHex(d > 0 ? cs('B') : 0xdde6f5);
          const sz = 1.7 + 0.9 * q; shA.scale.setScalar(sz * (lowA ? 0.85 : 1.1)); shB.scale.setScalar(sz * (lowA ? 1.1 : 0.85));
          shA.material.opacity = shB.material.opacity = 0.1 + 0.3 * q;
          accT += dt; if (accT > 0.06) { accT = 0; for (let k = 0; k < 55; k++) resample((Math.random() * ND) | 0); }
          for (let i = 0; i < ND; i++) { const dd2 = dd[i]; dum.position.copy(dd2.p); dum.scale.setScalar(0.06 * dd2.c); dum.updateMatrix(); dots.setMatrixAt(i, dum.matrix); }
          dots.instanceMatrix.needsUpdate = true;
          // 쌍극자 화살표 (δ⁺ → δ⁻, 길이 = Δχ에 비례)
          L.clear(arrowG);
          const showArr = arr > 0.05 && d > 0 && showAll;
          dipL.show(showArr);
          if (showArr) {
            const len = Math.min(3.6, 0.35 + d / 10 * 1.15) * arr, from = lowA ? -1 : 1, x0 = from * (-len / 2 + (lowA ? 0 : 0)), a0 = [from > 0 ? len / 2 : -len / 2, 1.55, 0], a1 = [from > 0 ? -len / 2 : len / 2, 1.55, 0];
            const A0 = lowA ? [-len / 2, 1.55, 0] : [len / 2, 1.55, 0], A1 = lowA ? [len / 2, 1.55, 0] : [-len / 2, 1.55, 0];
            if (len > 0.3) arrowG.add(L.arrow(A0, A1, 0xffd34d, 0.09, 0.4));
            dipL.obj = [0, 1.55, 0]; dipL.off = [0, 0.55, 0];
          }
          const cls = clClass(d), head = cloudScene ? 'Δχ = |χ(B) − χ(A)| = |' + f1(eB) + ' − ' + f1(eA) + '| = <b>' + f1(d) + '</b>' : '<b>' + sA + '–' + sB + '</b> · χ ' + f1(eA) + ', ' + f1(eB) + (showAll ? ' · Δχ = <b>' + f1(d) + '</b>' : '');
          info(head + '<br>' + (showAll ? '<b>' + cls[0] + '</b> — ' + cls[1] : note) + (showArr ? '<br>화살표(+→)는 결합의 쌍극자 모멘트예요. δ⁺ 쪽에서 δ⁻ 쪽으로 향해요.' : ''));
        },
      };
    },
  });
})();
