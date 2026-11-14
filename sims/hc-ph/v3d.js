/* hc-ph · 3D pH와 이온 수
   pH가 1 작아질 때마다 H⁺는 10배로 늘어요. 입자를 직접 세어 보며 '지수 눈금'이 왜 필요한지 느껴 봐요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
    /* ---- 공용 도우미: 분자 모형 · 유리 상자 · 화살표 ---- */
  function makeLib(THREE) {
    const COL = { H: 0xf3f6fb, C: 0x8a93a3, N: 0x4f7cff, O: 0xf0524f, F: 0x9be36b, Cl: 0x34c759, Na: 0xb07cf5, B: 0xf4a6a6, S: 0xf5c518, Cu: 0xe08a3c, Ca: 0x6fd0c4, e: 0xffd34d };
    const RAD = { H: 0.26, C: 0.38, N: 0.37, O: 0.36, F: 0.32, Cl: 0.48, Na: 0.5, B: 0.36, S: 0.48, Cu: 0.5, Ca: 0.55 };
    const mats = {};
    const mat = (k) => mats[k] || (mats[k] = new THREE.MeshStandardMaterial({ color: COL[k] !== undefined ? COL[k] : k, roughness: 0.26, metalness: 0, envMapIntensity: 1.2 }));
    const SG = new THREE.SphereGeometry(1, 28, 20);
    const CG = new THREE.CylinderGeometry(1, 1, 1, 16);
    const stickMat = new THREE.MeshStandardMaterial({ color: 0xc3ccdd, roughness: 0.3, metalness: 0.25, envMapIntensity: 1.2 });
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
      const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshPhysicalMaterial({ color: color || 0xcfe4ff, transparent: true, opacity: op === undefined ? 0.13 : op, roughness: 0.05, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 2, side: THREE.DoubleSide, depthWrite: false }));
      const e = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)), new THREE.LineBasicMaterial({ color: 0xcfe0ff, transparent: true, opacity: 0.75 }));
      g.add(m, e); g.scale.set(w, h, d); g.userData.fill = m; return g;
    }
    function tube(pts, r, color, seg) {
      const c = new THREE.CatmullRomCurve3(pts.map((p) => (p.isVector3 ? p : V(p[0], p[1], p[2]))));
      return new THREE.Mesh(new THREE.TubeGeometry(c, seg || 40, r, 10, false), new THREE.MeshPhysicalMaterial({ color, roughness: 0.32, metalness: 0.15, clearcoat: 0.4, clearcoatRoughness: 0.25 }));
    }
    /* 화살표: from → to */
    function arrow(from, to, color, r, headLen) {
      const g = new THREE.Group(); const a = V(from[0], from[1], from[2]), b = V(to[0], to[1], to[2]); const d = b.clone().sub(a), len = d.length();
      if (len < 1e-3) return g; const hl = Math.min(headLen || 0.4, len * 0.6); const m = new THREE.MeshPhysicalMaterial({ color, roughness: 0.3, metalness: 0, clearcoat: 0.5, clearcoatRoughness: 0.2 });
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
    title: 'pH와 이온 수 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: phone ? 17 : 12.5, theta: 0.35, phi: 1.2, min: 5, max: 24, target: [1.6, 2.6, 0] },
    autoRotate: 0.12,
    levels: [1],   // pH 계산(시료 단추 · 답 칸 · 맞히면 pH 측정기와 입자가 바뀌어요). 로그 눈금 · 기록 그래프 · 물질 끌기 단계는 2D
    build(ctx) {
      const { THREE, root, label, info, controls, mats } = ctx;
      const L = makeLib(THREE);
      const R = 2.4, HGT = 4.4;
      /* 실험대 */
      const wood = (function () {
        const c = document.createElement('canvas'); c.width = 512; c.height = 512; const x = c.getContext('2d');
        x.fillStyle = '#7d5a3c'; x.fillRect(0, 0, 512, 512);
        for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? 'rgba(60,35,15,.12)' : 'rgba(255,220,170,.06)'; x.fillRect(0, i * 64, 512, 64); x.fillStyle = 'rgba(30,16,6,.6)'; x.fillRect(0, i * 64, 512, 2); }
        for (let i = 0; i < 240; i++) { x.strokeStyle = 'rgba(40,22,8,' + (0.05 + Math.random() * 0.1) + ')'; x.lineWidth = 0.6 + Math.random(); const y = Math.random() * 512; x.beginPath(); x.moveTo(0, y); x.bezierCurveTo(150, y + Math.random() * 6 - 3, 350, y + Math.random() * 6 - 3, 512, y + Math.random() * 4 - 2); x.stroke(); }
        const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2.2, 1.4); return t;
      })();
      const bench = new THREE.Mesh(new THREE.BoxGeometry(16, 0.5, 10), new THREE.MeshStandardMaterial({ map: wood, color: 0x9a7d62, roughness: 0.6 })); bench.position.y = -0.3; root.add(bench); bench.userData.v3bg = true;
      const glass = new THREE.MeshPhysicalMaterial({ color: 0xd8e8ff, transparent: true, opacity: 0.16, roughness: 0.04, clearcoat: 1, clearcoatRoughness: 0.05, side: THREE.DoubleSide, depthWrite: false });
      const beaker = new THREE.Mesh(new THREE.CylinderGeometry(R, R, HGT, 64, 1, true), glass); beaker.position.y = HGT / 2; root.add(beaker);
      const bot = new THREE.Mesh(new THREE.CylinderGeometry(R, R * 0.98, 0.2, 64), new THREE.MeshPhysicalMaterial({ color: 0xd8e8ff, transparent: true, opacity: 0.4, roughness: 0.05, clearcoat: 1, depthWrite: false })); bot.position.y = 0.1; root.add(bot);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(R, 0.07, 12, 72), new THREE.MeshPhysicalMaterial({ color: 0xeaf2ff, roughness: 0.15, clearcoat: 1, transparent: true, opacity: 0.85 })); rim.rotation.x = Math.PI / 2; rim.position.y = HGT; root.add(rim);
      const spout = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.5, 14, 1, true), glass); spout.rotation.set(0, 0, Math.PI / 2 + 0.2); spout.position.set(R + 0.1, HGT - 0.12, 0); spout.rotation.z = -Math.PI / 2; root.add(spout);
      (function () { // 눈금
        const c = document.createElement('canvas'); c.width = 256; c.height = 512; const x = c.getContext('2d');
        x.strokeStyle = 'rgba(255,255,255,.9)'; x.fillStyle = 'rgba(255,255,255,.95)'; x.font = 'bold 20px sans-serif'; x.textAlign = 'right';
        for (let i = 1; i <= 8; i++) { const y = 512 - 30 - i * 56 * 0.95; x.lineWidth = i % 2 ? 2 : 3; x.beginPath(); x.moveTo(150, y); x.lineTo(i % 2 ? 190 : 220, y); x.stroke(); if (i % 2 === 0) x.fillText(String(i * 100), 140, y + 7); }
        const m = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.012, R + 0.012, HGT, 64, 1, true), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false })); m.position.y = HGT / 2; m.rotation.y = 0.5; root.add(m);
      })();
      const LV = 3.5;
      const liq = new THREE.Mesh(new THREE.CylinderGeometry(R - 0.04, R - 0.04, LV, 64), new THREE.MeshPhysicalMaterial({ color: 0x66cc66, transparent: true, opacity: 0.34, roughness: 0.1, clearcoat: 0.6, depthWrite: false })); liq.position.y = LV / 2 + 0.2; root.add(liq);
      const top = new THREE.Mesh(new THREE.CircleGeometry(R - 0.04, 64), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.3, roughness: 0.03, metalness: 0.2, depthWrite: false })); top.rotation.x = -Math.PI / 2; top.position.y = LV + 0.2; root.add(top);
      const menis = new THREE.Mesh(new THREE.TorusGeometry(R - 0.06, 0.035, 8, 72), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 })); menis.rotation.x = Math.PI / 2; menis.position.y = LV + 0.2; root.add(menis);
      /* pH 측정기: 스탠드 + 전극 + 화면 */
      const metal = mats.metal('steel', { brushed: true });
      const stBase = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.2, 1.6), mats.metal('iron', { roughness: 0.45 })); stBase.position.set(4.6, 0.0, -1.2); root.add(stBase);
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 6.4, 14), metal); rod.position.set(4.6, 3.2, -1.2); root.add(rod);
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 3.7, 12), metal); arm.rotation.z = Math.PI / 2; arm.position.set(2.75, 5.9, -1.2); root.add(arm);
      const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.2, 8), mats.rubber(0x222831)); wire.position.set(0.9, 6.5, -1.2); root.add(wire);
      const probe = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 3.6, 18), new THREE.MeshPhysicalMaterial({ color: 0x2b3340, roughness: 0.35, clearcoat: 0.6 })); probe.position.set(0.9, 4.2, -0.1); probe.rotation.x = 0; root.add(probe);
      const clampM = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.35, 0.4), metal); clampM.position.set(0.9, 5.9, -1.2); root.add(clampM);
      const arm2 = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.2, 10), metal); arm2.rotation.x = Math.PI / 2; arm2.position.set(0.9, 5.9, -0.65); root.add(arm2);
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.2, 18, 14), new THREE.MeshPhysicalMaterial({ color: 0xcfe0ff, transparent: true, opacity: 0.8, roughness: 0.05, clearcoat: 1 })); tip.position.set(0.9, 2.3, -0.1); root.add(tip);
      probe.position.y = 4.1; probe.scale.y = 1;
      const dc = document.createElement('canvas'); dc.width = 256; dc.height = 128; const dx = dc.getContext('2d'); const dtex = new THREE.CanvasTexture(dc);
      function drawMeter(ph) { dx.fillStyle = '#10201a'; dx.fillRect(0, 0, 256, 128); dx.fillStyle = '#8affb0'; dx.font = 'bold 30px monospace'; dx.textAlign = 'left'; dx.fillText('pH', 14, 48); dx.font = 'bold 66px monospace'; dx.textAlign = 'right'; dx.fillText(ph.toFixed(1), 244, 100); dtex.needsUpdate = true; }
      const meter = new THREE.Group(); meter.position.set(4.6, 0.8, 1.0); meter.rotation.y = -0.5;
      meter.add(new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.2, 0.9), mats.plastic(0xe6e9ef, { roughness: 0.32 })));
      const scr = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.85), new THREE.MeshBasicMaterial({ map: dtex })); scr.position.set(0, 0.05, 0.46); meter.add(scr); root.add(meter);
      const cable = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0.9, 6.6, -1.2), new THREE.Vector3(2.5, 6.9, -1.2), new THREE.Vector3(4.4, 6.4, -1.0), new THREE.Vector3(4.6, 3, 0), new THREE.Vector3(4.6, 1.4, 0.6)]), 40, 0.03, 6), new THREE.MeshStandardMaterial({ color: 0x222831 })); root.add(cable);
      drawMeter(7);
      const NMAX = 1500;
      const mk = (col, em) => { const m = new THREE.InstancedMesh(L.SG, new THREE.MeshStandardMaterial({ color: col, emissive: em, emissiveIntensity: 0.45, roughness: 0.35 }), NMAX); m.frustumCulled = false; m.count = 0; root.add(m); return m; };
      const mH = mk(0xff2b4a, 0x9a0020), mO = mk(0x4d8dff, 0x00287a);
      const pts = { h: [], o: [] };
      const rp = () => { const r = Math.sqrt(Math.random()) * (R - 0.25), a = Math.random() * 6.283; return { x: Math.cos(a) * r, y: 0.35 + Math.random() * (LV - 0.35), z: Math.sin(a) * r, ph: Math.random() * 6.28, sp: 0.4 + Math.random() * 0.6 }; };
      for (let i = 0; i < NMAX; i++) { pts.h.push(rp()); pts.o.push(rp()); }
      const dum = new THREE.Object3D();
      const INDI = [0xe53935, 0xf4511e, 0xfb8c00, 0xfdd835, 0x7cb342, 0x43a047, 0x00897b, 0x1e88e5, 0x3949ab, 0x5e35b1, 0x6a1b9a, 0x7b1fa2, 0x8e24aa];
      let pH = 7, info0 = '', own = null, sig = '', pE = 0, pD = 0, lastTxt = '';
      const lblN = label('', [0, LV + 0.6, 0], { size: 12.5 });
      const clamp = (x, a, b) => Math.max(a, Math.min(b, x)), sm = L.sstep;
      function counts() { return [Math.min(NMAX, Math.round(Math.pow(10, 7 - pH))), Math.min(NMAX, Math.round(Math.pow(10, pH - 7)))]; }
      function fmt(x) { return x >= 1e6 ? '아주 많아요' : x >= 0.7 ? Math.round(x) + '개' : '거의 없어요'; }
      let hideNum = '';
      function drawMeterQ() { dx.fillStyle = '#10201a'; dx.fillRect(0, 0, 256, 128); dx.fillStyle = '#8affb0'; dx.font = 'bold 30px monospace'; dx.textAlign = 'left'; dx.fillText('pH', 14, 48); dx.font = 'bold 66px monospace'; dx.textAlign = 'right'; dx.fillText('?', 244, 100); dtex.needsUpdate = true; }
      function show(extra) {
        const col = pH >= 6.5 && pH <= 7.5 ? 0x4cc36b : INDI[Math.max(0, Math.min(12, Math.round(pH) - 1))];
        liq.material.color.setHex(col);
        const [nh, no] = counts(); mH.count = nh; mO.count = no;
        const trueH = Math.pow(10, 7 - pH), trueO = Math.pow(10, pH - 7);
        const sat = trueH > NMAX || trueO > NMAX;
        const ph = Math.round(pH * 10) / 10;
        const kind = pH < 6.95 ? ' 산성' : pH > 7.05 ? ' 염기성' : ' 중성';
        if (hideNum) {   // pH 계산 단계: 답을 맞히기 전에는 pH 값을 가려요
          drawMeterQ(); lblN.set('pH ?' + kind);
          const tq = '<b>' + hideNum + '</b> · pH = ?<br><span style="color:#ff6b6b">●</span> H⁺가 <span style="color:#6ba5ff">●</span> OH⁻보다 ' + (pH < 7 ? '훨씬 많아요' : '훨씬 적어요') + kind.replace(' ', ' (') + ')<br>' + (extra || '');
          if (tq !== lastTxt) { lastTxt = tq; info(tq); }
          return;
        }
        drawMeter(Math.round(pH * 10) / 10); lblN.set('pH ' + ph.toFixed(1).replace(/\.0$/, '') + kind);
        const txt = '<b>[H⁺] = 10<sup>' + (-ph).toString().replace('-', '−') + '</sup> mol/L</b> · pH = −log[H⁺] = ' + ph.toFixed(1).replace(/\.0$/, '') + '<br><span style="color:#ff6b6b">●</span> H⁺ <b>' + fmt(trueH) + '</b> · <span style="color:#6ba5ff">●</span> OH⁻ <b>' + fmt(trueO) + '</b> (pH 7일 때 각 1개 기준)<br>' + (extra || '') + (sat ? '너무 많아 다 못 그려요. 그래서 로그(pH) 눈금을 써요!' : 'pH가 1 내려가면 H⁺ 수는 10배예요.');
        if (txt !== lastTxt) { lastTxt = txt; info(txt); }
      }
      const rowOf = () => { const r = document.querySelectorAll('.v3-player'); return r[r.length - 1]; };
      const plE = controls.player({ duration: 10, loop: true, label: 'pH 바꾸기', phases: [[0, 'pH 1 · 강산'], [0.25, 'pH 7 · 중성'], [0.5, 'pH 13 · 강염기'], [0.75, 'pH 7 · 중성']], onFrame(p) { pE = p; own = p > 0 ? 'e' : (own === 'e' ? null : own); } });
      const rowE = rowOf();
      const plD = controls.player({ duration: 9, loop: true, label: '10배씩 묽히기', phases: [[0, '처음 용액'], [0.1, '묽히는 중'], [0.75, '7번 묽힘'], [0.88, '처음으로']], onFrame(p) { pD = p; own = p > 0 ? 'd' : (own === 'd' ? null : own); } });
      const rowD = rowOf();
      const dilPHc = (sub, s) => { const c = Math.pow(10, -(s + 1)), x = (c + Math.sqrt(c * c + 4e-14)) / 2, p = -Math.log10(x); return sub === 'hcl' ? p : 14 - p; };
      show();
      return {
        update(dt, t) {
          const Z = ctx.lesson();
          if (Z) {
            const S = Z.S, mode = S.mode;
            rowE.style.display = mode === 'exp' ? '' : 'none'; rowD.style.display = mode === 'dil' ? '' : 'none';
            if (mode !== 'exp' && plE.playing) plE.pause(); if (mode !== 'dil' && plD.playing) plD.pause();
            const sg = [mode, S.ex.pH, S.dp.sub, S.dp.step.hcl, S.dp.step.naoh].join('|'); if (sg !== sig) { sig = sg; if (own) { own = null; plE.pause(); plE.set(0); plD.pause(); plD.set(0); } }
            let np = pH, extra = '';
            if (mode === 'exp') { np = own === 'e' ? 7 - 6 * Math.cos(2 * Math.PI * pE) : S.ex.pH; }
            else if (mode === 'calc') { const q = Z.PS && Z.PS.find((x) => x.k === S.pc.k), ok = !!(q && Z.pcDone && Z.pcDone(q.k)); np = q ? q.pH : S.pc.pH; const hn = q && !ok ? q.name : ''; if (hn !== hideNum) { hideNum = hn; info0 = null; } if (q) extra = ok ? '<b>' + q.name + '</b> · 계산이 맞았어요! pH 측정기를 확인해요. ' : '오른쪽 칸에 계산한 pH를 쓰면 측정기에 값이 나타나요. '; }
            if (mode !== 'calc' && hideNum) { hideNum = ''; info0 = null; }
            else if (mode === 'dil') {
              const sub = S.dp.sub; np = own === 'd' ? dilPHc(sub, 7 * (pD < 0.1 ? 0 : pD < 0.75 ? sm((pD - 0.1) / 0.65) : pD < 0.88 ? 1 : 1 - sm((pD - 0.88) / 0.12))) : S.dp.meter;
              extra = (sub === 'hcl' ? '염산(HCl)' : '수산화 나트륨(NaOH)') + ' 10배 희석 · ';
            }
            if (Math.abs(np - pH) > 1e-4 || extra !== info0) { pH = np; info0 = extra; show(extra); }
          }
          const [nh, no] = counts();
          [[mH, pts.h, nh], [mO, pts.o, no]].forEach(([m, arr, n]) => {
            for (let i = 0; i < n; i++) { const p = arr[i]; dum.position.set(p.x + Math.sin(t * p.sp + p.ph) * 0.12, p.y + Math.cos(t * p.sp * 1.3 + p.ph) * 0.12, p.z + Math.sin(t * p.sp * 0.8 + p.ph * 2) * 0.12); dum.scale.setScalar(n > 300 ? 0.075 : n > 40 ? 0.1 : 0.15); dum.updateMatrix(); m.setMatrixAt(i, dum.matrix); }
            m.instanceMatrix.needsUpdate = true;
          });
        },
      };
    },
  });
})();
