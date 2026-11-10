/* hb-meiosis · 3D 감수 분열 (염색체 2n=4)
   복제 → 2가 염색체 → 상동 염색체 분리(감수 1분열) → 염색 분체 분리(감수 2분열)로 염색체 수가 반으로 줄어든 생식세포 4개가 만들어져요.
   2D 차시와 같은 감수 분열 9단계(복제 전 → 복제 → 감수 1분열 전기·중기·후기 → 세포 2개 → 감수 2분열 중기·후기 → 생식세포 4개)와 DNA 상대량 값이고,
   2D에서 감수 분열을 진행하면 3D도 같은 시기로 따라가요. ▶ 재생은 한 번의 감수 분열 전체를 반복해서 보여 줘요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const narrow = window.innerWidth < 600 || window.innerHeight > window.innerWidth * 1.1;
  const STAGES = [
    { n: '복제 전', t: 'G₁기: 염색체마다 염색 분체가 하나예요.', c: '2n=4 · DNA 상대량 2' },
    { n: '복제 후', t: 'S기: DNA가 복제되어 염색체마다 염색 분체 2개가 붙어 있어요.', c: '2n=4 · DNA 상대량 4' },
    { n: '전기 Ⅰ', t: '상동 염색체끼리 접합해 <b>2가 염색체</b>를 만들고, 핵막이 사라져요.', c: '2n=4 · DNA 상대량 4' },
    { n: '중기 Ⅰ', t: '2가 염색체가 적도면에 배열되고 방추사가 붙어요.', c: '2n=4 · DNA 상대량 4' },
    { n: '후기 Ⅰ', t: '<b>상동 염색체</b>가 분리되어 양극으로 이동해요.', c: '2n=4 · DNA 상대량 4' },
    { n: '말기 Ⅰ', t: '세포질이 나뉘어 염색체 수가 절반(n=2)인 세포 2개가 돼요.', c: 'n=2 · DNA 상대량 2 (세포당)' },
    { n: '중기 Ⅱ', t: '염색체가 적도면에 배열돼요. (복제 없이 2분열 진행)', c: 'n=2 · DNA 상대량 2' },
    { n: '후기 Ⅱ', t: '<b>염색 분체</b>가 분리되어 양극으로 이동해요.', c: 'n=2 · DNA 상대량 2' },
    { n: '생식세포 4개', t: '염색체 수가 절반(n=2)이고 DNA 상대량이 1인 세포 4개가 만들어져요.', c: 'n=2 · DNA 상대량 1 (세포당)' },
  ];
  const ST = (a, b, c, d, e, f, g, h, i) => [a, b, c, d, e, f, g, h, i];
  const P = (x, y, z) => [x, y, z];
  // 염색체 4개의 시기별 중심 위치 (0: 긴 붉은, 1: 긴 푸른, 2: 짧은 붉은, 3: 짧은 푸른)
  const POS = [
    ST(P(-1.2, 0.9, 0.6), P(-1.2, 0.9, 0.6), P(-0.5, 0.9, -0.17), P(-0.3, 1.0, 0), P(-2.0, 1.0, 0), P(-2.5, 0.9, 0), P(-2.5, 0.9, 0), P(-2.5, 0.9, 0), P(-2.5, 0.9, 0)),
    ST(P(0.9, -0.7, 1.0), P(0.9, -0.7, 1.0), P(-0.5, 0.9, 0.17), P(0.3, 1.0, 0), P(2.0, 1.0, 0), P(2.5, 0.9, 0), P(2.5, 0.9, 0), P(2.5, 0.9, 0), P(2.5, 0.9, 0)),
    ST(P(0.6, 1.2, -0.9), P(0.6, 1.2, -0.9), P(0.6, -0.9, -0.17), P(0.3, -1.0, 0), P(2.0, -1.0, 0), P(2.5, -0.9, 0), P(2.5, -0.9, 0), P(2.5, -0.9, 0), P(2.5, -0.9, 0)),
    ST(P(-0.8, -1.0, -1.1), P(-0.8, -1.0, -1.1), P(0.6, -0.9, 0.17), P(-0.3, -1.0, 0), P(-2.0, -1.0, 0), P(-2.5, -0.9, 0), P(-2.5, -0.9, 0), P(-2.5, -0.9, 0), P(-2.5, -0.9, 0)),
  ];
  const TILT0 = [0.6, -0.8, 1.2, -1.1, 0.4, -0.5, 0.9, -0.7];   // 시기 0~2 의 염색체 기울기
  const PHI = [0, 0, 0, 0, 0, 0, Math.PI / 2, Math.PI / 2, Math.PI / 2];
  const OFF = [0, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 1.15, 1.8];     // 염색 분체 사이 거리의 절반
  const TILTK = [0, 0.13, 0.13, 0.13, 0.13, 0.13, 0.13, 0.0, 0.0];
  const CELL = [ // 세포 4개의 [중심, 크기]
    [[0, 0, 0, 3.5, 3.3, 3.3], [0, 0, 0, 3.5, 3.3, 3.3], [0, 0, 0, 3.5, 3.3, 3.3], [0, 0, 0, 3.5, 3.3, 3.3], [0, 0, 0, 4.4, 3.2, 3.2], [-2.5, 0, 0, 2.5, 2.5, 2.5], [-2.5, 0, 0, 2.5, 2.5, 2.5], [-2.5, 0, 0.0, 2.5, 2.5, 3.2], [-2.5, 0, 1.8, 1.75, 1.75, 1.75]],
    [[0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0], [2.5, 0, 0, 2.5, 2.5, 2.5], [2.5, 0, 0, 2.5, 2.5, 2.5], [2.5, 0, 0.0, 2.5, 2.5, 3.2], [2.5, 0, 1.8, 1.75, 1.75, 1.75]],
    [[-2.5, 0, 0, 0, 0, 0], [-2.5, 0, 0, 0, 0, 0], [-2.5, 0, 0, 0, 0, 0], [-2.5, 0, 0, 0, 0, 0], [-2.5, 0, 0, 0, 0, 0], [-2.5, 0, 0, 0, 0, 0], [-2.5, 0, 0, 0, 0, 0], [-2.5, 0, 0, 0, 0, 0], [-2.5, 0, -1.8, 1.75, 1.75, 1.75]],
    [[2.5, 0, 0, 0, 0, 0], [2.5, 0, 0, 0, 0, 0], [2.5, 0, 0, 0, 0, 0], [2.5, 0, 0, 0, 0, 0], [2.5, 0, 0, 0, 0, 0], [2.5, 0, 0, 0, 0, 0], [2.5, 0, 0, 0, 0, 0], [2.5, 0, 0, 0, 0, 0], [2.5, 0, -1.8, 1.75, 1.75, 1.75]],
  ];

  window.SciSim3D.attach({
    title: '감수 분열 3D (염색체 4개)',
    hint: '슬라이더로 시기를 옮겨 보세요 · 붉은색=어머니, 푸른색=아버지 쪽 염색체',
    camera: { dist: narrow ? 17 : 10.5, theta: 0.35, phi: 0.95, min: 6, max: 22 },
    levels: [2],
    autoRotate: 0.08,
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const V3 = (x, y, z) => new THREE.Vector3(x, y, z || 0);
      const std = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.42, metalness: 0.03 }, o || {}));
      const sm = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
      const kf = (arr, s) => { const i = Math.min(7, Math.floor(s)), f = sm(s - i); return arr[i] + (arr[i + 1] - arr[i]) * f; };
      const kv = (arr, s) => { const i = Math.min(7, Math.floor(s)), f = sm(s - i), a = arr[i], b = arr[i + 1]; return a.map((v, k) => v + (b[k] - v) * f); };

      let envUpd = () => {};
      /* 세포 4개 + 핵 */
      const cellM = new THREE.MeshPhysicalMaterial({ color: 0x9ec7ff, transparent: true, opacity: 0.17, depthWrite: false, roughness: 0.1, clearcoat: 1, clearcoatRoughness: 0.1, side: THREE.DoubleSide });
      const mitoM = std(0xf59e4b, { roughness: 0.4, transparent: true, opacity: 0.9 }), erM2 = std(0xc9b6f2, { roughness: 0.5 });
      const cells = CELL.map((_, ci) => { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), cellM); m.renderOrder = 1; root.add(m);
        for (let k = 0; k < 7; k++) { const a = k * 2.399 + ci, y = 1 - (k + 0.5) * 2 / 7, rr = Math.sqrt(1 - y * y), d = 0.78 + 0.06 * (k % 2); const o = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), k % 3 ? mitoM : erM2); o.scale.set(0.11, 0.055, 0.055); o.position.set(Math.cos(a) * rr * d, y * d * 0.9, Math.sin(a) * rr * d); o.rotation.set(a, a * 1.3, a * 0.7); m.add(o); }
        return m; });
      /* 배양 접시 + 떠다니는 알갱이 (현미경 시야) */
      (function () {
        const glass = new THREE.MeshPhysicalMaterial({ color: 0xcfe6ff, transparent: true, opacity: 0.16, roughness: 0.05, clearcoat: 1, depthWrite: false });
        const dish = new THREE.Mesh(new THREE.CylinderGeometry(6.8, 6.8, 0.3, 72), glass); dish.position.y = -5.6; root.add(dish);
        const med = new THREE.Mesh(new THREE.CylinderGeometry(6.6, 6.6, 0.5, 72), new THREE.MeshPhysicalMaterial({ color: 0x5fb3a0, transparent: true, opacity: 0.18, roughness: 0.1, depthWrite: false })); med.position.y = -5.3; root.add(med);
        const rim = new THREE.Mesh(new THREE.TorusGeometry(6.8, 0.1, 10, 90), new THREE.MeshPhysicalMaterial({ color: 0xe8f1ff, roughness: 0.15, clearcoat: 1, transparent: true, opacity: 0.8 })); rim.rotation.x = Math.PI / 2; rim.position.y = -5.45; root.add(rim);
        const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'); const gr = x.createRadialGradient(128, 128, 4, 128, 128, 126); gr.addColorStop(0, 'rgba(160,215,255,.38)'); gr.addColorStop(1, 'rgba(40,70,140,0)'); x.fillStyle = gr; x.fillRect(0, 0, 256, 256);
        const gl = new THREE.Mesh(new THREE.CircleGeometry(6.4, 64), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false })); gl.rotation.x = -Math.PI / 2; gl.position.y = -5.0; root.add(gl);
        [dish, med, rim, gl].forEach((o) => { o.userData.v3bg = true; });   // 배양 접시는 배경: 자동 맞춤이 세포에 맞춰요
        const N = 70, dots = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshBasicMaterial({ color: 0xb8dcff, transparent: true, opacity: 0.3 }), N), dm = new THREE.Object3D();
        const P0 = Array.from({ length: N }, (_, i) => { const r = (k) => { const v = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return v - Math.floor(v); }; return { x: (r(1) - 0.5) * 16, y: -3.5 + r(2) * 9, z: (r(3) - 0.5) * 16, s: 0.03 + r(4) * 0.06, ph: r(5) * 6.28, sp: 0.15 + r(6) * 0.3 }; });
        dots.frustumCulled = false; root.add(dots); dots.userData.v3bg = true;   // 떠다니는 알갱이는 배경
        envUpd = (t) => { P0.forEach((q, i) => { dm.position.set(q.x + Math.sin(t * q.sp + q.ph) * 0.5, q.y + Math.cos(t * q.sp * 1.3 + q.ph) * 0.4, q.z); dm.scale.setScalar(q.s); dm.updateMatrix(); dots.setMatrixAt(i, dm.matrix); }); dots.instanceMatrix.needsUpdate = true; };
      })();
      const nuc = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 28), std(0xd6b6ff, { transparent: true, opacity: 0.2, depthWrite: false, roughness: 0.2 })); nuc.renderOrder = 1; root.add(nuc);

      /* 염색 분체 (가운데가 잘록한 막대) */
      function bar(len) {
        const prof = [], N = 36;
        for (let j = 0; j <= N; j++) { const s = j / N, pin = 1 - 0.6 * Math.exp(-Math.pow((s - 0.5) / 0.045, 2)), cap = Math.sqrt(Math.max(0, 1 - Math.pow(1 - Math.min(1, s / 0.12), 2))) * Math.sqrt(Math.max(0, 1 - Math.pow(1 - Math.min(1, (1 - s) / 0.12), 2))); prof.push(new THREE.Vector2(Math.max(0.001, 0.15 * pin * cap), (s - 0.5) * len)); }
        return new THREE.LatheGeometry(prof, 22);
      }
      const LEN = [2.2, 2.2, 1.5, 1.5], RED = std(0xe5485f, { roughness: 0.4 }), BLUE = std(0x3b82f0, { roughness: 0.4 });
      const chrs = [0, 1, 2, 3].map((c) => {
        const outer = new THREE.Group(), mid = new THREE.Group(); outer.add(mid); root.add(outer);
        const ks = [0, 1].map((k) => { const m = new THREE.Mesh(bar(LEN[c]), c % 2 ? BLUE : RED); mid.add(m); return m; });
        return { outer, mid, ks };
      });
      const kin = chrs.map(() => null);
      /* ===== 체세포분열 (2n=4): 염색체가 짝짓지 않고 각자 적도면에 늘어서요 — 2D '체세포분열' 5단계와 같아요 ===== */
      const MITN = [['복제 전 (G1기)', 'G₁기: 염색체마다 염색 분체가 하나예요.', '2n=4 · DNA 상대량 2'], ['복제 (S기)', 'S기: DNA가 복제되어 염색체마다 염색 분체 2개가 붙어 있어요.', '2n=4 · DNA 상대량 4'], ['중기: 적도면에 배열', '염색체가 <b>각자</b> 적도면에 늘어서요. 상동 염색체끼리 짝짓지 않아요!', '2n=4 · DNA 상대량 4'], ['후기: 염색 분체 분리', '<b>염색 분체</b>가 분리되어 양극으로 이동해요. (염색체가 일시적으로 8개)', '염색체 8개 · DNA 상대량 4'], ['체세포분열 완료: 딸세포 2개', '딸세포 2개! 염색체 수가 모세포와 같은 2n=4예요.', '2n=4 · DNA 상대량 2 (세포당)']];
      const mitG = new THREE.Group(); root.add(mitG); mitG.visible = false;
      const mchr = [0, 1, 2, 3].map((c) => { const outer = new THREE.Group(); const ks = [0, 1].map(() => { const m = new THREE.Mesh(bar(LEN[c]), c % 2 ? BLUE : RED); outer.add(m); return m; }); mitG.add(outer); return { outer, ks }; });
      const ZM = [-1.5, -0.5, 0.5, 1.5], MOFF = [0.07, 0.1, 0.1, 1.7, 2.5];
      const CELLM = [[[0, 0, 0, 3.5, 3.3, 3.3], [0, 0, 0, 3.5, 3.3, 3.3], [0, 0, 0, 3.5, 3.3, 3.3], [0, 0, 0, 4.4, 3.2, 3.2], [-2.5, 0, 0, 2.5, 2.5, 2.5]], [[0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0], [2.5, 0, 0, 2.5, 2.5, 2.5]]];
      const kvM = (arr, s2) => { const i = Math.min(3, Math.floor(s2)), f = sm(s2 - i), a = arr[i], b = arr[i + 1]; return a.map((v, k) => v + (b[k] - v) * f); };
      const kfM = (arr, s2) => { const i = Math.min(3, Math.floor(s2)), f = sm(s2 - i); return arr[i] + (arr[i + 1] - arr[i]) * f; };
      const tmpV = new THREE.Vector3();
      function mitFrame(ss) {
        cells.forEach((m, i) => { if (i < 2) { const k = kvM(CELLM[i], ss); m.position.set(k[0], k[1], k[2]); m.scale.set(Math.max(0.001, k[3]), Math.max(0.001, k[4]), Math.max(0.001, k[5])); m.visible = k[3] > 0.05; } else m.visible = false; });
        const ns2 = 1 - sm((ss - 1.1) / 0.8); nuc.visible = ns2 > 0.02; nuc.position.set(0, 0, 0); nuc.scale.setScalar(Math.max(0.01, 2.2 * ns2));
        const wM = sm((ss - 1.5) / 0.5) * (1 - sm((ss - 3.7) / 0.3)); let si = 0; const chrom = [];
        mchr.forEach((C, c) => {
          const p0 = POS[c][0], cx = kfM([p0[0], p0[0], 0, 0, 0], ss), cy = kfM([p0[1], p0[1], 0, 0, 0], ss), cz = kfM([p0[2], p0[2], ZM[c], ZM[c], ZM[c] * 0.55], ss);
          const tilt = TILT0[c] * (1 - sm((ss - 1.0) / 0.8)), off = kfM(MOFF, ss);
          C.outer.position.set(cx, cy, cz); C.outer.rotation.z = tilt;
          C.ks.forEach((m, k) => { const sg = k ? 1 : -1, v = k === 0 ? 1 : sm(ss); m.position.x = sg * off; m.rotation.z = sg * -0.13 * sm(ss) * (1 - sm((ss - 2.6) / 0.6)); m.scale.setScalar(Math.max(0.001, v * (ss > 3.5 ? 1 - 0.1 * sm(ss - 3.5) : 1))); m.visible = v > 0.02; if (wM > 0.03 && v > 0.5) { m.getWorldPosition(tmpV); chrom.push([sg, tmpV.clone()]); } });
        });
        const poles = []; if (wM > 0.03) { const px = 3.9; [-1, 1].forEach((sg) => poles.push(V3(sg * px, 0, 0))); chrom.forEach(([sg, p]) => { if (si < NSP) spoke(si++, poles[sg > 0 ? 1 : 0], p, wM); }); }
        for (; si < NSP; si++) spokes[si].visible = false;
        const dm = new THREE.Object3D(); for (let i = 0; i < 6; i++) { if (i < poles.length) { dm.position.copy(poles[i]); dm.scale.setScalar(1); } else { dm.position.set(0, -99, 0); dm.scale.setScalar(0.001); } dm.updateMatrix(); poleI.setMatrixAt(i, dm.matrix); } poleI.instanceMatrix.needsUpdate = true;
        lab2.show(false); labH.show(false); labS.show(wM > 0.6); labS.obj = [2.6, 0.2, 0]; labS.off = [0, 0, 0]; labN.show(ss < 1.2); labN.obj = [0, 2.3, 0]; labN.off = [0, 0, 0];
        const key = 'm' + Math.round(ss) + nd; if (key !== lastKey) { lastKey = key; const S2 = MITN[Math.round(ss)]; info('<b>체세포분열 · ' + S2[0] + '</b><br>' + S2[1] + '<br>' + S2[2]); }
      }
      let proc = 'mei', cmpProc = 'mit', nd = '';

      /* 방추사 : 극과 염색 분체를 잇는 가는 막대 */
      const NSP = 24, spokes = [];
      for (let i = 0; i < NSP; i++) { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 1, 6), std(0xd9d9d9, { transparent: true, opacity: 0.0, depthWrite: false })); m.visible = false; root.add(m); spokes.push(m); }
      // 방추사 한 가닥: 극(a)에서 염색체(b)까지 가는 막대, w = 보이는 정도(0~1)
      const _up = new THREE.Vector3(0, 1, 0), _d = new THREE.Vector3();
      function spoke(i, a, b, w) {
        const m = spokes[i]; if (!m) return;
        if (!(w > 0.02)) { m.visible = false; return; }
        _d.subVectors(b, a); const len = _d.length(); if (len < 1e-4) { m.visible = false; return; }
        m.visible = true; m.position.copy(a).addScaledVector(_d, 0.5);
        m.scale.set(1, len, 1); m.quaternion.setFromUnitVectors(_up, _d.normalize());
        m.material.opacity = 0.75 * w;
      }
      const poleM = std(0xffd34d, { emissive: 0x7a5a00, emissiveIntensity: 0.5 }), poleI = new THREE.InstancedMesh(new THREE.SphereGeometry(0.14, 12, 8), poleM, 6); root.add(poleI);

      const lab2 = label('2가 염색체', null, { color: 'rgba(255,122,70,.92)' }), labS = label('방추사', null, {}), labN = label('핵막', null, {}), labH = label('상동 염색체', null, {});
      let s = 0, tgt = 0, auto = false, hold = 0, lastKey = '', playing = false, seen2D = -1, plGuard = false;
      const L2 = () => window.__sim || null;
      const maxS = () => (proc === 'mit' ? 4 : 8);
      function push2D() { const L = L2(); if (!L || !L.setFrame || !L.S || L.S.mode === 'cmp') return; const k = Math.round(tgt); if (L.S.f !== k) { const act = proc === 'mit' ? pm : pl; L.setFrame(k); if (L.S.f !== k) { tgt = L.S.f; rng.set(tgt); if (act.playing) { act.pause(); } } } seen2D = L.S.f; }
      const rng = controls.range('시기', 0, 8, 0.01, 0, (v) => { tgt = Math.min(maxS(), v); pl.pause(); pm.pause(); push2D(); }, (v) => (proc === 'mit' ? MITN : STAGES.map((q) => [q.n]))[Math.min(maxS(), Math.round(v))][0]);
      controls.button('◀', () => { tgt = Math.max(0, Math.round(tgt) - 1); pl.pause(); pm.pause(); rng.set(tgt); push2D(); });
      controls.button('▶', () => { tgt = Math.min(maxS(), Math.round(tgt) + 1); pl.pause(); pm.pause(); rng.set(tgt); push2D(); });
      const pl = controls.player({ duration: 12, loop: true, autoplay: false, label: '감수 분열',
        phases: [[0, '복제 전'], [1 / 9, '복제 후'], [2 / 9, '전기 Ⅰ'], [3 / 9, '중기 Ⅰ'], [4 / 9, '후기 Ⅰ'], [5 / 9, '세포 2개'], [6 / 9, '중기 Ⅱ'], [7 / 9, '후기 Ⅱ'], [8 / 9, '생식세포 4개']],
        onFrame(p) { if (plGuard) return; tgt = Math.min(8, p * 9); rng.set(tgt); auto = true; } });

      const pm = controls.player({ duration: 9, loop: true, autoplay: false, label: '체세포분열', phases: [[0, '복제 전'], [1 / 5, '복제 후'], [2 / 5, '중기'], [3 / 5, '후기'], [4 / 5, '딸세포 2개']], onFrame(p) { if (plGuard) return; tgt = Math.min(4, p * 5); rng.set(tgt); auto = true; } });
      const hostM = ctx.controls.text('').parentNode, rowsM = Array.from(hostM.querySelectorAll('.v3-player')), rowMei = rowsM[0], rowMit = rowsM[1], inpR = hostM.querySelector('input[type=range]');
      const cmpSeg = controls.segment('보기', [{ value: 'mit', label: '체세포분열' }, { value: 'mei', label: '감수 분열' }], 'mit', (v) => { cmpProc = v; });
      const cmpEls = Array.from(hostM.children).slice(-3);
      function switchProc(p) {
        proc = p; chrs.forEach((C) => { C.outer.visible = p === 'mei'; }); mitG.visible = p === 'mit'; rowMei.style.display = p === 'mei' ? '' : 'none'; rowMit.style.display = p === 'mit' ? '' : 'none';
        if (inpR) inpR.max = p === 'mit' ? 4 : 8; tgt = Math.min(tgt, maxS()); rng.set(tgt); lastKey = ''; seen2D = -1; for (let i = 0; i < NSP; i++) spokes[i].visible = false; pl.pause(); pm.pause();
        cells.forEach((m, i) => { m.visible = true; });
      }
      switchProc('mei');
      return {
        update(dt, t) {
          const L0 = L2(), S0 = L0 && L0.S;
          const pn = !S0 ? 'mei' : S0.mode === 'cmp' ? cmpProc : (S0.proc === 'mit' ? 'mit' : 'mei');
          if (pn !== proc) switchProc(pn);
          { const isC = !!(S0 && S0.mode === 'cmp'); cmpEls.forEach((e) => { e.style.display = isC ? '' : 'none'; }); if (isC) cmpSeg.set(cmpProc); }
          nd = S0 && S0.mode === 'nondis' ? 'N' : '';
          const pa = proc === 'mit' ? pm : pl, NS2 = proc === 'mit' ? 5 : 9;
          if (pa.playing) { tgt = Math.min(NS2 - 1, pa.p * NS2); rng.set(tgt); push2D(); } else { auto = false; }
          { const L = L2(); if (L && L.S.mode !== 'cmp' && !pa.playing && L.S.f !== seen2D) { seen2D = L.S.f; tgt = Math.min(maxS(), L.S.f); rng.set(tgt); } }
          envUpd(t);
          s += (tgt - s) * Math.min(1, dt * (auto ? 6 : 4)); if (Math.abs(tgt - s) < 0.001) s = tgt;
          const ss = Math.min(maxS(), Math.max(0, s));
          if (proc === 'mit') { mitFrame(ss); return; }
          // 세포
          cells.forEach((m, i) => { const k = kv(CELL[i], ss); m.position.set(k[0], k[1], k[2]); m.scale.set(Math.max(0.001, k[3]), Math.max(0.001, k[4]), Math.max(0.001, k[5])); m.visible = k[3] > 0.05; });
          const ns = 1 - sm((ss - 1.9) / 0.7); nuc.visible = ns > 0.02; nuc.scale.setScalar(Math.max(0.01, 2.2 * ns));
          // 염색체와 염색 분체
          const phi = kf(PHI, ss), off = kf(OFF, ss), tk = kf(TILTK, ss), repl = sm(ss - 0.0), pos = [], wk = [];
          const baseTilt = (c) => { const w = 1 - sm((ss - 2.4) / 1.0); return TILT0[c] * w; };
          chrs.forEach((C, c) => {
            let p = kv(POS[c], ss); if (nd && c === 1) { const q0 = kv(POS[0], ss), w = sm((ss - 3.4) / 1.0); p = [p[0] + (q0[0] + 0.5 - p[0]) * w, p[1] + (0.0 - p[1]) * w, p[2] + (0.0 - p[2]) * w]; } C.outer.position.set(p[0], p[1], p[2]); C.outer.rotation.z = baseTilt(c); C.mid.rotation.y = phi;
            C.ks.forEach((m, k) => { m.position.x = (k ? 1 : -1) * off; m.rotation.z = (k ? -1 : 1) * tk; const v = k === 0 ? 1 : sm(ss); m.scale.setScalar(Math.max(0.001, v)); m.visible = v > 0.02; });
            pos.push(V3(p[0], p[1], p[2]));
          });
          // 방추사
          const wI = sm((ss - 2.7) / 0.5) * (1 - sm((ss - 4.4) / 0.5)), wII = sm((ss - 5.6) / 0.5) * (1 - sm((ss - 7.3) / 0.6));
          let si = 0, pi = 0; const poles = [];
          if (wI > 0.03) { const px = 3.9 + (ss - 3) * 0.2; [-1, 1].forEach((sg) => { poles.push(V3(sg * px, 0, 0)); }); chrs.forEach((C, c) => { [-1, 1].forEach((sg) => { const x = pos[c].x, w = Math.max(0, Math.min(1, 0.5 + sg * x / 1.8)) * wI; spoke(si++, V3(sg * px, 0, 0), pos[c], w); }); }); }
          if (wII > 0.03) { [-2.5, 2.5].forEach((cx) => [-1, 1].forEach((sg) => poles.push(V3(cx, 0, sg * 2.9)))); chrs.forEach((C, c) => { const cx = pos[c].x; C.ks.forEach((m, k) => { m.getWorldPosition(tmp); const wp = tmp.clone(); [-1, 1].forEach((sg) => { if (si < NSP) spoke(si++, V3(cx, 0, sg * 2.9), wp, Math.max(0, Math.min(1, 0.5 + sg * (wp.z / 1.0))) * wII * (m.visible ? 1 : 0)); }); }); }); }
          for (; si < NSP; si++) spokes[si].visible = false;
          const dm = new THREE.Object3D(); for (let i = 0; i < 6; i++) { if (i < poles.length) { dm.position.copy(poles[i]); dm.scale.setScalar(1); } else { dm.position.set(0, -99, 0); dm.scale.setScalar(0.001); } dm.updateMatrix(); poleI.setMatrixAt(i, dm.matrix); }
          poleI.instanceMatrix.needsUpdate = true;
          // 이름표
          const v2 = ss > 2.0 && ss < 3.7; lab2.show(v2); if (v2) { lab2.obj = chrs[0].outer; lab2.off = [0, 1.45, 0.2]; }
          labS.show(wI > 0.6 || wII > 0.6); labS.obj = wI > 0.6 ? [2.6, 0.2, 0] : [2.5, 0.2, 1.6]; labS.off = [0, 0, 0];
          labN.show(ss > 0.3 && ss < 1.8); labN.obj = [0, 2.3, 0]; labN.off = [0, 0, 0];
          const vh = ss < 2.0; labH.show(vh && ss > 1.0); labH.obj = chrs[1].outer; labH.off = [0, 1.45, 0.2];
          const key = Math.round(ss) + nd;
          if (key !== lastKey) { lastKey = key; const S = STAGES[Math.round(ss)]; info('<b>' + S.n + '</b>: ' + S.t + '<br>' + S.c + (nd && ss > 3.4 ? '<br><span style="color:#fcd34d">염색체 비분리: 상동 염색체가 같은 쪽으로 이동해 생식세포의 염색체 수가 n+1(3개) / n−1(1개)이 돼요.</span>' : '') + (S0 && S0.mode === 'cmp' ? '<br><small>위에서 두 분열을 번갈아 봐요.</small>' : '')); }
        },
        sync() {},
      };
    },
  });
})();
