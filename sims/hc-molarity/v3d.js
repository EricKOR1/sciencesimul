/* hc-molarity · 3D 몰 농도
   몰 농도 M = 용질의 몰수 ÷ 용액의 부피(L). 같은 부피에 입자가 촘촘할수록 진해요. 물을 더하면 입자 수는 그대로, 부피만 커져서 묽어져요. */
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
    title: '몰 농도 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대 · 용액 고르기와 부피는 2D와 똑같이 이어져요',
    camera: { dist: phone ? 14 : 11, theta: 0.5, phi: 1.2, min: 5, max: 26, target: [0, 1.8, 0] },
    autoRotate: 0.1,
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const L = makeLib(THREE);
      const clamp = (x, a, b) => Math.max(a, Math.min(b, x)), sm = L.sstep;
      const wood = (function () {
        const c = document.createElement('canvas'); c.width = 512; c.height = 512; const x = c.getContext('2d');
        x.fillStyle = '#7d5a3c'; x.fillRect(0, 0, 512, 512);
        for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? 'rgba(60,35,15,.12)' : 'rgba(255,220,170,.06)'; x.fillRect(0, i * 64, 512, 64); x.fillStyle = 'rgba(30,16,6,.6)'; x.fillRect(0, i * 64, 512, 2); }
        for (let i = 0; i < 240; i++) { x.strokeStyle = 'rgba(40,22,8,' + (0.05 + Math.random() * 0.1) + ')'; x.lineWidth = 0.6 + Math.random(); const y = Math.random() * 512; x.beginPath(); x.moveTo(0, y); x.bezierCurveTo(150, y + Math.random() * 6 - 3, 350, y + Math.random() * 6 - 3, 512, y + Math.random() * 4 - 2); x.stroke(); }
        const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2.4, 1.4); return t;
      })();
      const bench = new THREE.Mesh(new THREE.BoxGeometry(18, 0.5, 10), new THREE.MeshStandardMaterial({ map: wood, color: 0x9a7d62, roughness: 0.6 })); bench.position.y = -0.31; root.add(bench);
      const gradTex = (function () {
        const c = document.createElement('canvas'); c.width = 256; c.height = 512; const x = c.getContext('2d');
        x.strokeStyle = 'rgba(255,255,255,.9)';
        for (let i = 1; i < 10; i++) { const y = 512 - 20 - i * 46; x.lineWidth = i % 2 ? 2 : 3; x.beginPath(); x.moveTo(150, y); x.lineTo(i % 2 ? 190 : 225, y); x.stroke(); }
        return new THREE.CanvasTexture(c);
      })();
      const dum = new THREE.Object3D();
      const hex = (s) => parseInt(String(s).replace('#', ''), 16);
      function makeBeaker() {
        const g = new THREE.Group(); root.add(g);
        const wall = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 56, 1, true), new THREE.MeshPhysicalMaterial({ color: 0xd8e8ff, transparent: true, opacity: 0.16, roughness: 0.04, clearcoat: 1, clearcoatRoughness: 0.05, side: THREE.DoubleSide, depthWrite: false }));
        const grad = new THREE.Mesh(new THREE.CylinderGeometry(1.01, 1.01, 1, 56, 1, true), new THREE.MeshBasicMaterial({ map: gradTex, transparent: true, depthWrite: false })); grad.rotation.y = 0.6;
        const rim = new THREE.Mesh(new THREE.TorusGeometry(1, 0.045, 10, 56), new THREE.MeshPhysicalMaterial({ color: 0xeaf2ff, roughness: 0.15, clearcoat: 1, transparent: true, opacity: 0.85 })); rim.rotation.x = Math.PI / 2;
        const men = new THREE.Mesh(new THREE.TorusGeometry(1, 0.03, 8, 56), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 })); men.rotation.x = Math.PI / 2;
        const bot = new THREE.Mesh(new THREE.CylinderGeometry(1, 0.98, 0.1, 56), new THREE.MeshPhysicalMaterial({ color: 0xd8e8ff, transparent: true, opacity: 0.4, roughness: 0.05, clearcoat: 1, depthWrite: false }));
        const liqM = new THREE.MeshPhysicalMaterial({ color: 0xa7d3ff, transparent: true, opacity: 0.3, roughness: 0.1, clearcoat: 0.6, depthWrite: false });
        const liq = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 40), liqM);
        const mk = (n) => { const m = new THREE.InstancedMesh(L.SG, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35, emissiveIntensity: 0.2 }), n); m.frustumCulled = false; return m; };
        const B = { g, wall, grad, rim, men, bot, liq, liqM, ticks: [], sets: { a: mk(40), b: mk(40), c: mk(40) }, p: [], R: 1, Hc: 3, lab: label('', [0, 0, 0], { size: 12.5 }), lab2: label('', [0, 0, 0], { size: 12 }) };
        g.add(wall, grad, rim, men, bot, liq, B.sets.a, B.sets.b, B.sets.c);
        for (let i = 0; i < 40; i++) B.p.push({ u: Math.sqrt(Math.random()), a: Math.random() * 6.283, y: Math.random(), ph: Math.random() * 6.28, sp: 0.5 + Math.random() });
        return B;
      }
      const bk = [makeBeaker(), makeBeaker(), makeBeaker()];
      function shape(B, R, Hc, x, z, level, color, alpha) {
        B.R = R; B.Hc = Hc; B.g.position.set(x, 0, z);
        B.wall.scale.set(R, Hc, R); B.wall.position.y = Hc / 2; B.grad.scale.set(R, Hc, R); B.grad.position.y = Hc / 2; B.rim.scale.setScalar(R); B.rim.position.y = Hc; B.bot.scale.set(R, 1, R); B.bot.position.y = 0.05;
        const hh = Math.max(0.02, level * Hc); B.hh = hh; B.liq.scale.set(R - 0.04, hh, R - 0.04); B.liq.position.y = hh / 2 + 0.05; B.men.scale.setScalar(R - 0.06); B.men.position.y = hh + 0.05;
        B.liqM.color.setHex(hex(color)); B.liqM.opacity = alpha;
      }
      function balls(B, key, n, r, color, off, t, lay) {
        const m = B.sets[key]; m.material.color.setHex(hex(color)); m.material.emissive.setHex(hex(color));
        const cnt = Math.min(n, 40); m.count = cnt;
        for (let i = 0; i < cnt; i++) {
          const q = B.p[(i + off) % 40], rr = q.u * (B.R - 0.3 - r);
          let x = Math.cos(q.a) * rr + Math.sin(t * q.sp + q.ph) * 0.07, y = 0.2 + r + q.y * Math.max(0.05, B.hh - 0.3 - r * 2) + Math.cos(t * q.sp * 1.2 + q.ph) * 0.05, z = Math.sin(q.a) * rr + Math.cos(t * q.sp + q.ph) * 0.07;
          if (lay) { const p = lay(i); x = p[0]; y = p[1]; z = p[2]; }
          dum.position.set(x, y, z); dum.scale.setScalar(r); dum.updateMatrix(); m.setMatrixAt(i, dum.matrix);
        }
        m.instanceMatrix.needsUpdate = true; m.visible = cnt > 0;
      }
      const hide = (B, keys) => { keys.forEach((k) => { B.sets[k].count = 0; B.sets[k].visible = false; }); };
      const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';

      /* ▶ 재생기: 희석(부피 늘리기) · 이온으로 나뉘기 */
      let own = null, sig = '', pD = 0, pI = 0, lastMode = '';
      const rowOf = () => { const r = document.querySelectorAll('.v3-player'); return r[r.length - 1]; };
      const plD = controls.player({ duration: 9, loop: true, label: '물 더하기', phases: [[0, '1.0 M · 100 mL'], [0.1, '물을 더하는 중'], [0.7, '1200 mL'], [0.85, '다시 처음으로']], onFrame(p) { pD = p; own = p > 0 ? 'dil' : (own === 'dil' ? null : own); } });
      const rowD = rowOf();
      const plI = controls.player({ duration: 7, loop: true, label: '이온으로 나누기', phases: [[0, '화학식 단위'], [0.15, '이온으로 나뉘어요'], [0.6, '이온 농도'], [0.85, '다시 모여요']], onFrame(p) { pI = p; own = p > 0 ? 'ion' : (own === 'ion' ? null : own); } });
      const rowI = rowOf();
      const vOf = (p) => 100 + 1100 * (p < 0.1 ? 0 : p < 0.7 ? sm((p - 0.1) / 0.6) : p < 0.85 ? 1 : 1 - sm((p - 0.85) / 0.15));
      const sOf = (p) => (p < 0.15 ? 0 : p < 0.6 ? sm((p - 0.15) / 0.45) : p < 0.85 ? 1 : 1 - sm((p - 0.85) / 0.15));

      return {
        update(dt, t) {
          const Z = ctx.lesson(); if (!Z) return;
          const S = Z.S, mode = S.mode;
          if (mode !== lastMode) { lastMode = mode; ctx.orbit.dist = mode === 'cmp' ? (phone ? 15 : 11.5) : (phone ? 12 : 10); }
          const sg = [mode, S.sub.cmp, S.calc.k, S.dil.V, S.ion.k].join('|'); if (sg !== sig) { sig = sg; if (own) { const k = own === 'dil' ? plD : plI; own = null; k.pause(); k.set(0); } }
          rowD.style.display = mode === 'dil' ? '' : 'none'; rowI.style.display = mode === 'ion' ? '' : 'none';
          if (mode !== 'dil' && plD.playing) plD.pause(); if (mode !== 'ion' && plI.playing) plI.pause();
          bk.forEach((B) => { B.g.visible = false; B.lab.show(false); B.lab2.show(false); });
          if (mode === 'cmp') {
            const set = Z.SETS[S.sub.cmp], names = ['A', 'B', 'C'];
            set.forEach((s, i) => {
              const B = bk[i]; B.g.visible = true; B.lab.show(true); B.lab2.show(true);
              shape(B, 0.95, 3.2, (i - 1) * 3.0, 0, S.cmp.lv[i], s.c, 0.3); hide(B, ['b', 'c']);
              balls(B, 'a', s.n, 0.15, '#8b5cf6', i * 17, t);
              B.lab.obj = [(i - 1) * 3.0, 3.2 + 0.4, 0]; B.lab.set(names[i] + ' · 용질 ' + (s.n * 0.1).toFixed(1) + ' mol');
              const per = S.cmp.perT > 0.5; B.lab2.obj = [(i - 1) * 3.0, B.hh + 0.1, 0]; B.lab2.off = [0, 0.55, 0]; B.lab2.set('용액 ' + s.V.toFixed(2) + ' L' + (per ? '<br>1 L당 ' + Math.round(s.n / s.V) + '개 = ' + (s.n * 0.1 / s.V).toFixed(1) + ' M' : ''));
            });
            info('<b>' + (S.sub.cmp === 'same' ? '부피가 같은 비커 3개' : '부피가 다른 비커 3개') + '</b> · ● = 용질 0.1 mol<br>몰 농도 M = 용질의 몰수 n(mol) ÷ 용액의 부피 V(L)<br>진한 비커부터 차례로 눌러 순서를 정해 보세요. 비커 속 입자 수와 용액의 부피를 함께 봐요.');
            return;
          }
          if (mode === 'calc') {
            const s = Z.CS.find((q) => q.k === S.calc.k), rows = Z.calcRows[s.k], B = bk[0]; B.g.visible = true; B.lab.show(true); B.lab2.show(true);
            shape(B, 1.3, 3.8, 0, 0, 0.62, s.k === 'hcl' ? '#fca5a5' : '#a7d3ff', 0.3); hide(B, ['b', 'c']);
            balls(B, 'a', s.rev ? 8 : Math.max(2, Math.round(s.n / 0.025)), 0.16, s.k === 'hcl' ? '#ef4444' : '#8b5cf6', 0, t);
            B.lab.obj = [0, 3.8 + 0.4, 0]; B.lab.set(s.label);
            B.lab2.obj = [0, B.hh, 0]; B.lab2.off = [0, 0.5, 0]; B.lab2.set('용액 전체 ' + s.V + ' mL = ' + s.Vl.toFixed(3) + ' L');
            let txt;
            if (!s.rev) txt = '용질의 질량 ' + s.mass.toFixed(1) + ' g (몰질량 ' + s.MM + ' g/mol) → 몰수 n = ' + (rows[0].ok ? (+s.n.toFixed(3)) + ' mol' : '? mol') + ' → 몰 농도 M = ' + (rows[2].ok ? (+s.M.toFixed(3)) + ' mol/L' : '? mol/L');
            else txt = '몰 농도 ' + s.Mc.toFixed(1) + ' mol/L, 부피 ' + s.Vl.toFixed(3) + ' L → 몰수 n = ' + (rows[0].ok ? (+s.n.toFixed(2)) + ' mol' : '? mol') + ' → 질량 = ' + (rows[1].ok ? (+s.mass.toFixed(2)) + ' g' : '? g');
            info('<b>' + s.name + ' 수용액</b><br>' + txt + '<br>부피는 mL가 아니라 L로 바꿔 계산해요.');
            return;
          }
          if (mode === 'dil') {
            const o = own === 'dil', V = o ? vOf(pD) : S.dil.V, Vd = o ? V : S.dil.Vd, M = Z.dilM(Math.max(V, 1)), Md = Z.dilM(Math.max(Vd, 1));
            const B = bk[0]; B.g.visible = true; B.lab.show(true); B.lab2.show(true);
            shape(B, 1.4, 4.4, 0, 0, clamp(Vd / 1200, 0.02, 1), '#8b5cf6', 0.18 + 0.5 * clamp(Md, 0, 1) * 0.5); hide(B, ['b', 'c']);
            balls(B, 'a', 10, 0.17, '#6d28d9', 0, t);
            B.lab.obj = [0, 4.4 + 0.4, 0]; B.lab.set('용질 ● 10개 = 0.10 mol (그대로)');
            B.lab2.obj = [0, B.hh, 0]; B.lab2.off = [0, 0.5, 0]; B.lab2.set('V′ = ' + Math.round(Vd) + ' mL');
            info('<b>물을 더해 묽히기</b> (1.0 M 100 mL에서 시작)<br>전체 부피 V′ = <b>' + Math.round(V) + ' mL</b> · 넣은 물 ' + Math.round(V - 100) + ' mL<br>M × V = M′ × V′ → M′ = <b>' + M.toFixed(3) + ' M</b><br>물을 더해도 용질의 몰수는 그대로예요. 부피만 늘어 농도가 낮아져요.');
            return;
          }
          // 이온 농도
          const q = Z.IONS.find((x) => x.k === S.ion.k), o = own === 'ion', sp = o ? sOf(pI) : sm(S.ion.split);
          const B = bk[0]; B.g.visible = true; B.lab.show(true); B.lab2.show(true);
          shape(B, 1.8, 3.4, 0, 0, 0.7, '#a7d3ff', 0.28); hide(B, ['c']);
          const slots = [[-0.8, -0.7], [0.8, -0.7], [-0.8, 0.7], [0.8, 0.7]], cr = q.cat[3] / 62, ar = q.an[3] / 62, d = (cr + ar) * 1.0 + sp * 0.55 + 0.06;
          const cen = q.cat[1] === 1 ? 'cat' : 'an', nS = cen === 'cat' ? q.an[1] : q.cat[1];
          const cenR = cen === 'cat' ? cr : ar, satR = cen === 'cat' ? ar : cr;
          const place = (isCat) => (i) => {
            const u = Math.floor(i / (isCat === (cen === 'cat') ? 1 : nS)), sl = slots[u % 4], wob = Math.sin(t * 1.2 + u * 1.7) * 0.05 * sp, baseY = B.hh * 0.5, baseP = [sl[0], baseY + (u < 2 ? 0.25 : -0.25), sl[1]];
            if (isCat === (cen === 'cat')) return [baseP[0] + (nS === 1 ? -d / 2 : 0) + wob, baseP[1] + (nS === 1 ? 0 : 0), baseP[2]];
            const k = i % nS; return nS === 1 ? [baseP[0] + d / 2 + wob, baseP[1], baseP[2]] : [baseP[0] + (k ? d : -d) + wob, baseP[1] + 0.25, baseP[2]];
          };
          balls(B, 'a', 4 * q.cat[1], cr, q.cat[2], 0, t, place(true)); balls(B, 'b', 4 * q.an[1], ar, q.an[2], 0, t, place(false));
          B.lab.obj = [0, 3.4 + 0.4, 0]; B.lab.set(q.cs + ' M ' + q.f + ' 수용액 1 L');
          B.lab2.obj = [0, B.hh, 0]; B.lab2.off = [0, 0.5, 0]; B.lab2.set(sp > 0.5 ? '양이온 ' + 4 * q.cat[1] + '개 : 음이온 ' + 4 * q.an[1] + '개 = ' + q.cat[1] + ' : ' + q.an[1] : '화학식 단위 4개');
          const fmtC = (c) => (c >= 0.1 ? c.toFixed(2) : c.toPrecision(2));
          info('<b>' + q.f + '</b> ' + q.cs + ' M 수용액<br>화학식 단위 1개 → <span style="color:' + q.cat[2] + '">●</span> ' + q.cat[0] + ' ' + q.cat[1] + '개 + <span style="color:' + q.an[2] + '">●</span> ' + q.an[0] + ' ' + q.an[1] + '개<br>[' + q.cat[0] + '] = ' + q.cs + ' × ' + q.cat[1] + ' = <b>' + fmtC(q.c * q.cat[1]) + ' M</b> · [' + q.an[0] + '] = ' + q.cs + ' × ' + q.an[1] + ' = <b>' + fmtC(q.c * q.an[1]) + ' M</b>');
        },
      };
    },
  });
})();
