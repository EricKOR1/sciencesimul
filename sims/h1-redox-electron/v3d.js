/* h1-redox-electron · 3D 전자의 이동과 산화·환원
   산화 = 전자를 잃는 반응, 환원 = 전자를 얻는 반응. 전자(노란 구슬)가 어디에서 어디로 가는지, 입자의 전하가 어떻게 바뀌는지 보여 줘요.
   ① Zn + Cu²⁺ → Zn²⁺ + Cu   ② Cu + 2Ag⁺ → Cu²⁺ + 2Ag   ③ 2Mg + O₂ → 2MgO (Mg → Mg²⁺ + 2e⁻, O + 2e⁻ → O²⁻)
   2D와 같아요: 어떤 반응을 보여 줄지는 2D에서 고른 실험(금속과 이온 · 전자의 이동 · 규칙성)을 따라가고, 2D의 진행(가열 · 전자 옮기기)과 3D가 함께 움직여요.
   2D의 [🔍 전자 보기]를 켜면(금속과 이온 단계) 3D에도 전자가 보여요.
   입자 크기와 거리는 실제와 달라요. 이온이 물속에서 어떻게 있는지(물 분자 감싸기)는 그리지 않았어요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHN = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);

  /* 반응 정의: 주는 쪽(donor)과 받는 쪽(acc), 둘 사이의 전자 이동(pairs) */
  const RX = {
    zn: {
      name: 'Zn + Cu²⁺', eq: 'Zn + Cu²⁺ → Zn²⁺ + Cu',
      don: [{ pos: [-2.6, 0, 0], el: 'Zn', n: 2, col: 0x7f90a8, rad: 0.95 }],
      acc: [{ pos: [2.6, 0, 0], el: 'Cu', n: 2, col: 0xd9822b, ionCol: 0x3b82f6, rad: 0.85 }],
      pairs: [[0, 0, 2]],
      before: ['Zn', 'Cu²⁺'], after: ['Zn²⁺', 'Cu'],
    },
    ag: {
      name: 'Cu + 2Ag⁺', eq: 'Cu + 2Ag⁺ → Cu²⁺ + 2Ag',
      don: [{ pos: [-2.8, 0, 0], el: 'Cu', n: 2, col: 0xd9822b, rad: 0.95 }],
      acc: [{ pos: [2.4, 1.5, 0], el: 'Ag', n: 1, col: 0xdde3ee, ionCol: 0x8ec5ff, rad: 0.8 }, { pos: [2.4, -1.5, 0], el: 'Ag', n: 1, col: 0xdde3ee, ionCol: 0x8ec5ff, rad: 0.8 }],
      pairs: [[0, 0, 1], [0, 1, 1]],
      before: ['Cu', 'Ag⁺'], after: ['Cu²⁺', 'Ag'],
    },
    mg: {
      name: '2Mg + O₂', eq: '2Mg + O₂ → 2MgO',
      don: [{ pos: [-2.6, 1.5, 0], el: 'Mg', n: 2, col: 0xc9d2de, rad: 0.95 }, { pos: [-2.6, -1.5, 0], el: 'Mg', n: 2, col: 0xc9d2de, rad: 0.95 }],
      acc: [{ pos: [2.5, 0.85, 0], el: 'O', n: 2, col: 0xe2464b, ionCol: 0xe2464b, rad: 0.8, neutral: true }, { pos: [2.5, -0.85, 0], el: 'O', n: 2, col: 0xe2464b, ionCol: 0xe2464b, rad: 0.8, neutral: true }],
      pairs: [[0, 0, 2], [1, 1, 2]],
      before: ['Mg', 'O'], after: ['Mg²⁺', 'O²⁻'],
    },
  };
  const SUP = { 2: '²', 1: '' };

  window.SciSim3D.attach({
    title: '3D 전자의 이동',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { target: [0, -0.3, 0], dist: PHN ? 16 : 11.8, theta: 0.25, phi: 1.3, min: 5, max: 22 },
    autoRotate: 0,
    levels: [],
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const V3 = THREE.Vector3;
      const mat = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ envMapIntensity: 0.6, color: c, roughness: 0.38, metalness: 0.15 }, o || {}));
      const st = { rx: null, t: 0 };
      const cache = {};
      const eMat = new THREE.MeshStandardMaterial({ color: 0xffd23f, emissive: 0xffb800, emissiveIntensity: 0.7, roughness: 0.25, metalness: 0 });
      const eGeo = new THREE.SphereGeometry(0.15, 18, 14);

      const slotTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); g.strokeStyle = '#ffe48a'; g.lineWidth = 5; g.setLineDash([8, 7]); g.beginPath(); g.arc(32, 32, 24, 0, 7); g.stroke(); return new THREE.CanvasTexture(c); })();
      const woodTex = (() => { const c = document.createElement('canvas'); c.width = 512; c.height = 256; const g = c.getContext('2d'); g.fillStyle = '#7a5230'; g.fillRect(0, 0, 512, 256);
        for (let i = 0; i < 90; i++) { g.strokeStyle = 'rgba(' + (40 + Math.random() * 50 | 0) + ',' + (20 + Math.random() * 30 | 0) + ',10,' + (0.1 + Math.random() * 0.25) + ')'; g.lineWidth = 1 + Math.random() * 3; g.beginPath(); const y = Math.random() * 256; g.moveTo(0, y); g.bezierCurveTo(150, y + Math.random() * 14 - 7, 350, y + Math.random() * 14 - 7, 512, y + Math.random() * 10 - 5); g.stroke(); }
        const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; })();
      const floor = new THREE.Mesh(new THREE.CylinderGeometry(5.8, 6.0, 0.3, 64), new THREE.MeshStandardMaterial({ map: woodTex, color: 0xb8977a, roughness: 0.7, metalness: 0.05 })); floor.position.y = -2.75; floor.receiveShadow = true; root.add(floor);
      // 전해질 용액 (투명한 물 + 수면) · 떠다니는 물 분자 알갱이
      const water = new THREE.Mesh(new THREE.CylinderGeometry(5.1, 5.1, 4.8, 64, 1, true), new THREE.MeshPhysicalMaterial({ color: 0x9fd6ff, transparent: true, opacity: 0.1, roughness: 0.05, side: THREE.DoubleSide, depthWrite: false })); water.position.y = -0.2; root.add(water);
      const wsurf = new THREE.Mesh(new THREE.CircleGeometry(5.1, 64), new THREE.MeshPhysicalMaterial({ color: 0xbfe4ff, transparent: true, opacity: 0.2, roughness: 0.05, depthWrite: false, side: THREE.DoubleSide })); wsurf.rotation.x = -Math.PI / 2; wsurf.position.y = 2.2; root.add(wsurf);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(5.1, 0.05, 10, 72), new THREE.MeshStandardMaterial({ color: 0xdfeaf5, roughness: 0.1, transparent: true, opacity: 0.7 })); rim.rotation.x = Math.PI / 2; rim.position.y = 2.2; root.add(rim);
      const NPW = 150, dustW = new THREE.InstancedMesh(new THREE.SphereGeometry(0.045, 8, 6), new THREE.MeshBasicMaterial({ color: 0xcfeaff, transparent: true, opacity: 0.5 }), NPW); root.add(dustW);
      const ddW = []; for (let i = 0; i < NPW; i++) { const a = Math.random() * 6.28, r = Math.sqrt(Math.random()) * 4.6; ddW.push({ x: Math.cos(a) * r, z: Math.sin(a) * r * 0.7, y: -2.5 + Math.random() * 4.8, s: 0.3 + Math.random(), p: Math.random() * 6.28 }); }
      const dmW = new THREE.Object3D();
      const glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,225,120,.9)'); r.addColorStop(1, 'rgba(255,200,60,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
      const glowMat = new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
      const grp = new THREE.Group(); root.add(grp);
      let parts = null;

      function ringTex() { return null; }
      function build(key) {
        if (parts) { parts.g.visible = false; parts.labs.forEach((l) => l.show(false)); }
        if (cache[key]) { parts = cache[key]; parts.g.visible = true; return; }
        const R = RX[key], g = new THREE.Group(); grp.add(g);
        const P = { g, R, don: [], acc: [], es: [], labs: [], flash: [] };
        R.don.forEach((d, i) => {
          const a = new THREE.Group(); a.position.set(...d.pos); g.add(a);
          const body = new THREE.Mesh(new THREE.SphereGeometry(d.rad, 40, 28), mat(d.col, { metalness: 0.55, roughness: 0.3 })); body.castShadow = true; a.add(body);
          const cloud = new THREE.Mesh(new THREE.SphereGeometry(d.rad + 0.5, 32, 22), new THREE.MeshBasicMaterial({ color: 0xffe48a, transparent: true, opacity: 0.1, depthWrite: false })); a.add(cloud);
          const lb = label(R.before[0], a, { size: 14, offset: [0, d.rad + 0.85, 0] });
          P.don.push({ a, body, cloud, lb, d, ox: 0 });
        });
        R.acc.forEach((c, i) => {
          const a = new THREE.Group(); a.position.set(...c.pos); g.add(a);
          const body = new THREE.Mesh(new THREE.SphereGeometry(c.rad, 40, 28), mat(c.ionCol, { metalness: c.neutral ? 0.1 : 0.2, roughness: c.neutral ? 0.4 : 0.25, transparent: !c.neutral, opacity: c.neutral ? 1 : 0.88 })); body.castShadow = true; a.add(body);
          const slots = [];
          for (let k = 0; k < c.n; k++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: slotTex, transparent: true, opacity: 0.9, depthWrite: false })); s.scale.set(0.5, 0.5, 1); s.position.set(Math.cos(k / c.n * 6.28 + 0.5) * (c.rad + 0.55), Math.sin(k / c.n * 6.28 + 0.5) * (c.rad + 0.55), 0); a.add(s); slots.push(s); }
          const lb = label(R.before[1], a, { size: 14, offset: [0, c.rad + 0.85, 0] });
          P.acc.push({ a, body, slots, lb, c });
        });
        // 전자 구슬: 주는 쪽 둘레를 돌다가 받는 쪽으로 가요
        let ei = 0;
        R.pairs.forEach(([di, ai, n], pi) => { for (let k = 0; k < n; k++) { const m = new THREE.Mesh(eGeo, eMat); { const gs = new THREE.Sprite(glowMat); gs.scale.set(0.7, 0.7, 1); m.add(gs); } g.add(m); P.es.push({ m, di, ai, k, n, pi, idx: ei++, slot: k }); } });
        const nDon = R.don.length;
        // 주는 쪽의 전자 수를 나눠서 둘레에 배치
        R.don.forEach((d, di) => { const mine = P.es.filter((e) => e.di === di); mine.forEach((e, k) => { e.orbit = k; e.nOrb = mine.length; }); });
        // 산화·환원 이름표
        const ox = label('산화 (전자를 잃음)', P.don[0].a, { size: 12.5, color: '#e2464b', offset: [0, -(R.don[0].rad + 0.95), 0] }), rd = label('환원 (전자를 얻음)', P.acc[0].a, { size: 12.5, color: '#3b6ff0', offset: [0, -(R.acc[0].rad + 0.95), 0] });
        P.ox = ox; P.rd = rd; P.labs = [...P.don.map((d) => d.lb), ...P.acc.map((a) => a.lb), ox, rd];
        ox.show(false); rd.show(false);
        // 전자 이동 화살표 (점선 느낌의 얇은 관)
        const a0 = new V3(...R.don[0].pos), b0 = new V3(...R.acc[0].pos);
        const mid = a0.clone().lerp(b0, 0.5); mid.y += 0.0;
        const arrow = new THREE.Group(); const L = a0.distanceTo(b0) - 3.2;
        const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, L, 8), new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.5 })); sh.rotation.z = Math.PI / 2; const hd = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.3, 12), sh.material); hd.rotation.z = -Math.PI / 2; hd.position.x = L / 2 + 0.1; arrow.add(sh, hd); arrow.position.set(mid.x, 0, 0); g.add(arrow);
        const eLab = label('전자(e⁻)의 이동', arrow, { size: 12.5, offset: [0, 0.55, 0] }); P.labs.push(eLab); P.eLab = eLab;
        parts = P; cache[key] = P;
      }

      let lastInfo = '';
      const setInfo = (h) => { if (h !== lastInfo) { lastInfo = h; info(h); } };
      const setLab = (l, t) => { if (l.txt !== t) { l.txt = t; l.set(t); } };
      const ease = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
      function apply() {
        const P = parts, R = P.R, p = pl.p, nE = P.es.length;
        // 전자별 진행도: 순서대로 출발
        P.es.forEach((e) => {
          const start = (e.idx / nE) * 0.55, u = ease((p - start) / 0.4);
          const d = P.don[e.di], c = P.acc[e.ai], da = new V3(...R.don[e.di].pos), ca = new V3(...R.acc[e.ai].pos);
          const th = e.orbit / e.nOrb * Math.PI * 2 + st.t * 2.2 + e.idx;
          const from = da.clone().add(new V3(Math.cos(th) * (R.don[e.di].rad + 0.35), Math.sin(th) * (R.don[e.di].rad + 0.35), Math.sin(th * 1.0) * 0.0));
          const sl = c.slots[e.slot]; const to = ca.clone().add(sl.position);
          const pos = new V3().lerpVectors(from, to, u); pos.y += Math.sin(u * Math.PI) * 0.9; pos.z += Math.sin(u * Math.PI) * 0.4;
          if (u >= 1) { const th2 = th + e.slot * Math.PI; pos.copy(ca).add(new V3(Math.cos(th2) * (R.acc[e.ai].rad + 0.55), Math.sin(th2) * (R.acc[e.ai].rad + 0.55), 0)); }
          e.m.position.copy(pos); e.e = u;
        });
        // 이온/원자 전환
        P.don.forEach((d, di) => {
          const out = P.es.filter((e) => e.di === di), done = out.filter((e) => e.e >= 1).length, lost = out.filter((e) => e.e > 0.5).length, ion = lost >= out.length;
          const k = lost / Math.max(1, out.length);
          d.body.scale.setScalar(1 - 0.22 * k); d.body.material.color.setHex(d.d.col).lerp(new THREE.Color(0xe9eef7), 0.55 * k); d.body.material.opacity = 1;
          d.cloud.scale.setScalar(1 - 0.3 * k); d.cloud.material.opacity = 0.1 * (1 - k);
          setLab(d.lb, ion ? R.after[0] : R.before[0]);
        });
        P.acc.forEach((a, ai) => {
          const into = P.es.filter((e) => e.ai === ai), got = into.filter((e) => e.e >= 1).length, full = got >= into.length, k = got / Math.max(1, into.length);
          a.slots.forEach((s, i) => { s.visible = i >= got; });
          const c = a.c; const col = new THREE.Color(c.ionCol).lerp(new THREE.Color(c.col), k);
          a.body.material.color.copy(col); a.body.material.transparent = !(c.neutral || full); a.body.material.opacity = c.neutral || full ? 1 : 0.88;
          a.body.material.metalness = c.neutral ? 0.1 : 0.2 + 0.4 * k; a.body.scale.setScalar(c.neutral ? 1 + 0.2 * k : 1 + 0.1 * k);
          setLab(a.lb, full ? R.after[1] : R.before[1]);
        });
        const S2 = L2(), showE = !(S2 && S2.MODE === 'bench' && S2.BENCH) || S2.BENCH.showE;
        P.es.forEach((e) => { e.m.visible = showE; }); P.acc.forEach((a) => { if (!showE) a.slots.forEach((s) => { s.visible = false; }); });
        const mid = p > 0.04 && p < 0.96, end = p >= 0.96;
        P.ox.show(end); P.rd.show(end); P.eLab.show(showE && (mid || end));
        const donName = R.after[0], accName = R.after[1];
        if (p < 0.04) setInfo('<b>' + R.eq.split(' → ')[0] + '</b> 이 만났어요.<br>▶ 반응 시작이나 ▶ 전자 이동을 눌러 <b>전자(노란 구슬)</b>가 어디로 가는지 봐요.');
        else if (!end) setInfo('전자가 <b>' + R.before[0] + ' → ' + R.before[1] + '</b> 쪽으로 옮겨 가고 있어요.<br>전자를 잃는 쪽은 + 전하가 늘고, 얻는 쪽은 줄어요.');
        else setInfo('<b>' + R.before[0] + '</b>은 전자를 잃어 <b>' + donName + '</b>(산화), <b>' + R.before[1] + '</b>은 전자를 얻어 <b>' + accName + '</b>(환원)이 됐어요.<br><b>' + R.eq + '</b>');
      }

      const L2 = () => (ctx.lesson && ctx.lesson()) || null;
      const pl = controls.player({
        duration: 6, loop: true, label: '전자 이동',
        phases: [[0, '반응 전'], [0.05, '전자가 이동'], [0.96, '반응 후']],
        onFrame() { if (parts) apply(); },
      });
      // 2D에서 고른 실험을 따라가요: 금속과 이온 = 고른 실험, 전자의 이동 = Zn + Cu²⁺, 규칙성 = Mg + O₂(산소의 눈/전자의 눈) · Cu + Ag⁺(전자 장부)
      let last = 'zn';
      const keyOf = () => {
        const S = L2(); if (!S) return last;
        const m = S.MODE;
        if (m === 'bench' && S.BENCH) last = S.BENCH.k; else if (m === 'move') last = 'zn'; else if (m === 'rule') last = S.SUB === 'dual' ? 'mg' : 'ag';
        return last;
      };
      const progOf = (k) => {
        const S = L2(); if (!S) return -1;
        if (S.MODE === 'move' && S.MV) return Math.min(1, S.MV.zn.reduce((n, z) => n + z.e.filter((e) => e.st === 'gone').length, 0) / 4);
        return S.SIMS && S.SIMS[k] ? S.SIMS[k].prog : -1;
      };
      let lastProg = -2;
      function pick(k) {
        st.rx = k; build(k);
        lastProg = progOf(k); pl.pause(); pl.set(lastProg > 0 ? lastProg : 0);
      }
      pick(keyOf());

      return {
        update(dt, t) {
          st.t += dt;
          for (let i = 0; i < NPW; i++) { const d = ddW[i]; dmW.position.set(d.x + Math.sin(t * 0.3 * d.s + d.p) * 0.3, ((d.y + t * 0.12 * d.s + 2.5) % 4.8) - 2.5, d.z + Math.cos(t * 0.25 * d.s + d.p) * 0.3); dmW.updateMatrix(); dustW.setMatrixAt(i, dmW.matrix); } dustW.instanceMatrix.needsUpdate = true;
          const k = keyOf();
          if (k !== st.rx) pick(k);
          else { const q = progOf(k); if (q !== lastProg) { lastProg = q; if (q >= 0) pl.set(q); } }
          apply();
          parts.g.rotation.y = 0;
          parts.don.forEach((d) => { d.a.rotation.z = t * 0.2; });
        },
        sync() {},
      };
    },
  });
})();
