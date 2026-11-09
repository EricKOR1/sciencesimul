/* hc-electronegativity · 3D 전자 줄다리기
   공유 전자쌍(노란 전자 구름)은 전기 음성도가 큰 원자 쪽으로 치우쳐요. 차이가 클수록 더 많이 치우쳐요. */
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
    title: '전기 음성도 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: phone ? 9.6 : 9, theta: 0.4, phi: 1.2, min: 4, max: 20 },
    autoRotate: 0.12,
    levels: [0, 2],
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const L = makeLib(THREE);
      const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
      L.COL.Li = 0xcc80ff; L.COL.Be = 0xc2ff00; L.COL.Mg = 0x8aff00; L.COL.Al = 0xbfa6a6; L.COL.Si = 0xf0c8a0; L.COL.P = 0xff8000; L.COL.K = 0x8f40d4; L.COL.Br = 0xa62929; L.COL.O = 0xf0524f;
      const gTug = new THREE.Group(), gAt = new THREE.Group(); root.add(gTug, gAt);

      /* ---------- ① 전자 줄다리기 (2D: H–H · H–F · Na–Cl) ---------- */
      const ND = 520;
      const dots = new THREE.InstancedMesh(L.SG, new THREE.MeshStandardMaterial({ color: 0xffd34d, emissive: 0xffb300, emissiveIntensity: 0.9, roughness: 0.4, transparent: true, opacity: 0.85 }), ND);
      dots.frustumCulled = false; gTug.add(dots);
      const dd = []; for (let i = 0; i < ND; i++) dd.push({ p: new THREE.Vector3(), c: 0.5 + Math.random() * 0.7, u: Math.random() });
      const dum = new THREE.Object3D();
      const lA = label('', [0, 0, 0], { size: 13.5 }), lB = label('', [0, 0, 0], { size: 13.5 });
      lA.el.style.color = lB.el.style.color = '#fff';
      const shellG = new THREE.Group(); gTug.add(shellG);
      let curId = '', xa = -1.4, xb = 1.4, wNow = 0.5;
      const CORE = (s, Z) => 0.3 + 0.06 * Z.E[s].p;
      function buildTug(Z, m) {
        curId = m.id; L.clear(shellG);
        const ra = CORE(m.a, Z), rb = CORE(m.b, Z), sep = (m.id === 'NaCl' ? 3.6 : 2.5 + (ra + rb) * 0.8);
        xa = -sep / 2; xb = sep / 2;
        [[m.a, xa, ra], [m.b, xb, rb]].forEach(([sym, x, r]) => {
          const g = new THREE.Group(); g.position.set(x, 0, 0);
          const core = L.atom(sym, 1); core.scale.setScalar(r); g.add(core);
          const sh = new THREE.Mesh(L.SG, new THREE.MeshStandardMaterial({ color: L.COL[sym] !== undefined ? L.COL[sym] : 0x9aa5b6, transparent: true, opacity: 0.16, roughness: 0.2, depthWrite: false })); sh.scale.setScalar(r * 2.5); g.add(sh);
          shellG.add(g);
        });
        lA.obj = [xa, 0, 0]; lB.obj = [xb, 0, 0]; lA.off = [0, -1.2, 0]; lB.off = [0, -1.2, 0];
      }
      function resample(i, ra, rb) {
        const d = dd[i], atB = Math.random() < wNow, cx = atB ? xb : xa, s = atB ? rb : ra, spread = 0.55 + s * 0.9;
        let x = cx + (Math.random() + Math.random() + Math.random() - 1.5) * spread * 1.6;
        if (atB) x = Math.max(x, xa + (xb - xa) * 0.25); else x = Math.min(x, xb - (xb - xa) * 0.25);
        const r = (Math.random() + Math.random() + Math.random() - 1.5) * 1.1, th = Math.random() * Math.PI * 2, fall = Math.max(0.35, 1 - Math.abs(x - cx) / (spread * 1.6) * 0.5);
        d.p.set(x, r * Math.cos(th) * fall * 0.75, r * Math.sin(th) * fall * 0.75);
      }

      /* ---------- ③ 경향의 까닭 (2D: 원자 모형 · 핵이 최외각 전자를 당기는 힘) ---------- */
      const shellCfg = (E, s) => { const z = E[s].Z; if (s === 'Br') return [2, 8, 18, 7]; if (z <= 10) return z <= 2 ? [z] : [2, z - 2]; return [2, 8, z - 10]; };
      const pullRaw = (E, s) => E[s].v / (E[s].p * E[s].p);
      const nuc = new THREE.Mesh(L.SG, L.mat(0xe8604c)); nuc.scale.setScalar(0.45); gAt.add(nuc);
      const atLab = label('', [0, 0, 0], { size: 13.5, color: 'rgba(91,33,182,.9)' }); const nucLab = label('', [0, 0, 0], { size: 12 });
      const ringG = new THREE.Group(), elG = new THREE.Group(); gAt.add(ringG, elG);
      let atKey = '', arrowM = null, outerE = null;
      const goldM = new THREE.MeshStandardMaterial({ color: 0xffc933, emissive: 0xffb300, emissiveIntensity: 0.6, roughness: 0.3 }), blueM = new THREE.MeshStandardMaterial({ color: 0x8fa8d8, roughness: 0.4 });
      let atEls = [], ringsA = [], ringsRadii = [];
      function buildAtom(Z, s) {
        L.clear(ringG); L.clear(elG); atEls = []; ringsA = [];
        const cfg = shellCfg(Z.E, s), n = cfg.length;
        cfg.forEach((c, k) => {
          const r = 0.85 + 0.62 * k, ring = new THREE.Mesh(new THREE.TorusGeometry(r, k === n - 1 ? 0.025 : 0.014, 8, 64), new THREE.MeshBasicMaterial({ color: k === n - 1 ? 0x9b6bff : 0x7887aa, transparent: true, opacity: 0.8 })); ring.rotation.x = Math.PI / 2; ringG.add(ring);
          for (let j = 0; j < c; j++) { const outer = k === n - 1, m = new THREE.Mesh(L.SG, outer ? goldM : blueM); m.scale.setScalar(outer ? 0.13 : 0.1); elG.add(m); atEls.push({ m, k, j, c, r, outer, first: outer && j === 0 }); }
        });
        outerR = 0.85 + 0.62 * (n - 1);
        if (arrowM) { gAt.remove(arrowM); }
      }
      let outerR = 1, arrowG = new THREE.Group(); gAt.add(arrowG);
      const arrMat = new THREE.MeshStandardMaterial({ color: 0x7c3aed, roughness: 0.4 });
      const arrShaft = new THREE.Mesh(L.CG, arrMat), arrHead = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 18), arrMat); arrowG.add(arrShaft, arrHead);

      /* ---------- ▶ 재생: 원자 번호를 따라 가기 ---------- */
      let own = false, sig = '', pA = 0;
      const rowOf = () => { const r = document.querySelectorAll('.v3-player'); return r[r.length - 1]; };
      const pl = controls.player({ duration: 8, loop: true, label: '원소 따라가기', onFrame(p) { pA = p; own = p > 0; } });
      const rowA = rowOf();

      return {
        update(dt, t) {
          const Z = ctx.lesson(); if (!Z) return; dt = Math.min(dt, 0.05);
          const S = Z.S, tugMode = S.scene === 'tug' || S.scene === 'tb' || S.scene === 'od';
          const atomMode = S.scene === 'atom';
          gTug.visible = !atomMode; gAt.visible = atomMode;
          rowA.style.display = atomMode ? '' : 'none'; if (!atomMode && pl.playing) pl.pause();
          lA.show(!atomMode); lB.show(!atomMode); atLab.show(atomMode); nucLab.show(atomMode);
          const sg = [S.scene, S.at.mode, S.at.i].join('|'); if (sg !== sig) { sig = sg; if (own) { own = false; pl.pause(); pl.set(0); } }
          if (!atomMode) {
            const m = Z.TUGS.find((q) => q.id === S.tug.cur) || Z.TUGS[0];
            if (m.id !== curId) buildTug(Z, m);
            wNow = clamp(S.tug.sp.value, 0.02, 0.98);
            const ra = CORE(m.a, Z), rb = CORE(m.b, Z), rev = S.tug.reveal > 0.5 || S.tug.done[m.id];
            for (let k = 0; k < 60; k++) resample((Math.random() * ND) | 0, ra, rb);
            for (let i = 0; i < ND; i++) { const d = dd[i]; dum.position.copy(d.p); dum.scale.setScalar(0.06 * d.c); dum.updateMatrix(); dots.setMatrixAt(i, dum.matrix); }
            dots.instanceMatrix.needsUpdate = true;
            const Ea = Z.E[m.a], Eb = Z.E[m.b];
            lA.set(m.a + '<br><small>최외각 전자 ' + Ea.v + '개' + (rev ? ' · χ ' + (Ea.e / 10).toFixed(1) : '') + '</small>'); lB.set(m.b + '<br><small>최외각 전자 ' + Eb.v + '개' + (rev ? ' · χ ' + (Eb.e / 10).toFixed(1) : '') + '</small>');
            const nm = m.a + '–' + m.b;
            let txt;
            if (rev) {
              const side = Math.abs(S.tug.sp.value - 0.5) < 0.03 ? '가운데' : (S.tug.sp.value > 0.5 ? m.b : m.a) + ' 쪽';
              txt = '전자쌍이 <b>' + side + '</b>으로 치우쳤어요 (전자 구름이 ' + (S.tug.sp.value > 0.5 ? m.b : m.a) + ' 쪽에 ' + Math.round(Math.max(S.tug.sp.value, 1 - S.tug.sp.value) * 100) + '%).<br>전기 음성도: ' + m.a + ' ' + (Ea.e / 10).toFixed(1) + ' · ' + m.b + ' ' + (Eb.e / 10).toFixed(1) + ' — 클수록 공유 전자쌍을 더 세게 끌어당겨요.';
            } else txt = '공유 전자쌍이 어느 쪽으로 쏠릴지 <b>예측</b>하고 줄다리기를 시작해 보세요.<br>전기 음성도: 공유 결합에서 원자가 공유 전자쌍을 끌어당기는 상대적인 세기';
            info('<b>' + nm + '</b> 전자 줄다리기<br>' + txt);
            lA.el.style.background = lB.el.style.background = '';
            return;
          }
          // ---- 원자 모형 ----
          const ser = Z.SERIES[S.at.mode], els = ser.els, nEl = els.length;
          const idx = own ? Math.min(nEl - 1, Math.floor(pA * nEl)) : S.at.i, s = els[idx], e = Z.E[s];
          if (s !== atKey) { atKey = s; buildAtom(Z, s); }
          const mx = Math.max.apply(null, els.map((q) => pullRaw(Z.E, q))), pn = pullRaw(Z.E, s) / mx;
          const spd = 0.9;
          let hiP = null;
          atEls.forEach((q) => {
            const a = t * spd / (q.k + 1) * (q.k % 2 ? -1 : 1) + (Math.PI * 2 * q.j) / q.c; q.m.position.set(Math.cos(a) * q.r, 0, Math.sin(a) * q.r);
            if (q.first) hiP = q.m.position.clone();
          });
          nucLab.obj = [0, 0.55, 0]; nucLab.set('+' + e.Z);
          atLab.obj = [0, 2.9, 0]; atLab.set(e.s + ' · ' + e.n + ' (' + e.p + '주기 ' + e.g + '족)');
          arrowG.visible = !!hiP;
          if (hiP) {
            const dir = hiP.clone().normalize().multiplyScalar(-1), len = Math.min(outerR - 0.5, 0.3 + 0.8 * outerR * pn), w = 0.035 + 0.07 * pn, start = hiP.clone().addScaledVector(dir, -dir.length() * 0 + 0.2).add(dir.clone().multiplyScalar(0));
            arrShaft.scale.set(w, Math.max(0.05, len - 0.25), w); const mid = hiP.clone().add(dir.clone().multiplyScalar(0.2 + (len - 0.25) / 2)); arrShaft.position.copy(mid); arrShaft.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
            arrHead.scale.set(w * 2.8, 0.25, w * 2.8); arrHead.position.copy(hiP).add(dir.clone().multiplyScalar(0.2 + len - 0.125)); arrHead.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
          }
          info('<b>' + e.s + ' (' + e.n + ')</b> · ' + ser.label + '<br>핵전하 +' + e.Z + ' · 전자껍질 ' + e.p + '개 · 최외각 전자 ' + e.v + '개 · 전기 음성도 χ = ' + (e.e == null ? '—' : (e.e / 10).toFixed(1)) + '<br>노란 점 = 최외각 전자, 보라 화살표 = 핵이 최외각 전자를 당기는 힘(모형)<br>' + ser.note + ' 보라 화살표(당기는 힘)가 어떻게 변하는지 비교해 보세요.');   // 규칙 문장의 답(커져요/작아져요)은 학생이 직접 찾아요
        },
      };
    },
  });
})();
