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
    camera: { dist: narrow ? 14.5 : 11.5, theta: 0.35, phi: 0.95, min: 6, max: 22 },
    levels: [1, 2],
    autoRotate: 0.08,
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const V3 = (x, y, z) => new THREE.Vector3(x, y, z || 0);
      const std = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.42, metalness: 0.03 }, o || {}));
      const sm = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
      const kf = (arr, s) => { const i = Math.min(7, Math.floor(s)), f = sm(s - i); return arr[i] + (arr[i + 1] - arr[i]) * f; };
      const kv = (arr, s) => { const i = Math.min(7, Math.floor(s)), f = sm(s - i), a = arr[i], b = arr[i + 1]; return a.map((v, k) => v + (b[k] - v) * f); };

      /* 세포 4개 + 핵 */
      const cellM = std(0x9ec7ff, { transparent: true, opacity: 0.16, depthWrite: false, roughness: 0.15, side: THREE.DoubleSide });
      const cells = CELL.map(() => { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), cellM); m.renderOrder = 1; root.add(m); return m; });
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
      const rng = controls.range('시기', 0, 8, 0.01, 0, (v) => { tgt = v; pl.pause(); }, (v) => STAGES[Math.round(v)].n);
      controls.button('◀', () => { tgt = Math.max(0, Math.round(tgt) - 1); pl.pause(); rng.set(tgt); });
      controls.button('▶', () => { tgt = Math.min(8, Math.round(tgt) + 1); pl.pause(); rng.set(tgt); });
      const pl = controls.player({ duration: 12, loop: true, autoplay: false, label: '감수 분열',
        phases: [[0, '복제 전'], [1 / 9, '복제 후'], [2 / 9, '전기 Ⅰ'], [3 / 9, '중기 Ⅰ'], [4 / 9, '후기 Ⅰ'], [5 / 9, '세포 2개'], [6 / 9, '중기 Ⅱ'], [7 / 9, '후기 Ⅱ'], [8 / 9, '생식세포 4개']],
        onFrame(p) { if (plGuard) return; tgt = Math.min(8, p * 9); rng.set(tgt); auto = true; } });

      return {
        update(dt, t) {
          if (pl.playing) { tgt = Math.min(8, pl.p * 9); rng.set(tgt); } else { auto = false; }
          { const L = L2(); if (L && L.S.proc === 'mei' && !pl.playing && L.S.f !== seen2D) { seen2D = L.S.f; tgt = L.S.f; rng.set(tgt); } }
          s += (tgt - s) * Math.min(1, dt * (auto ? 6 : 4)); if (Math.abs(tgt - s) < 0.001) s = tgt;
          const ss = Math.min(8, Math.max(0, s));
          // 세포
          cells.forEach((m, i) => { const k = kv(CELL[i], ss); m.position.set(k[0], k[1], k[2]); m.scale.set(Math.max(0.001, k[3]), Math.max(0.001, k[4]), Math.max(0.001, k[5])); m.visible = k[3] > 0.05; });
          const ns = 1 - sm((ss - 1.9) / 0.7); nuc.visible = ns > 0.02; nuc.scale.setScalar(Math.max(0.01, 2.2 * ns));
          // 염색체와 염색 분체
          const phi = kf(PHI, ss), off = kf(OFF, ss), tk = kf(TILTK, ss), repl = sm(ss - 0.0), pos = [], wk = [];
          const baseTilt = (c) => { const w = 1 - sm((ss - 2.4) / 1.0); return TILT0[c] * w; };
          chrs.forEach((C, c) => {
            const p = kv(POS[c], ss); C.outer.position.set(p[0], p[1], p[2]); C.outer.rotation.z = baseTilt(c); C.mid.rotation.y = phi;
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
          const v2 = ss > 2.0 && ss < 3.7; lab2.show(v2); if (v2) { lab2.obj = [-0.0, 2.2, 0]; lab2.off = [0, 0, 0]; }
          labS.show(wI > 0.6 || wII > 0.6); labS.obj = wI > 0.6 ? [2.6, 0.2, 0] : [2.5, 0.2, 1.6]; labS.off = [0, 0, 0];
          labN.show(ss > 0.3 && ss < 1.8); labN.obj = [0, 2.3, 0]; labN.off = [0, 0, 0];
          const vh = ss < 2.0; labH.show(vh && ss > 1.0); labH.obj = [0.1, 1.9, 0.0]; labH.off = [0, 0, 0];
          const key = Math.round(ss);
          if (key !== lastKey) { lastKey = key; const S = STAGES[key]; info('<b>' + S.n + '</b>: ' + S.t + '<br>' + S.c); }
        },
        sync() {},
      };
    },
  });
})();
