/* hp-torque-equilibrium · 3D 돌림힘과 평형
   2D 실험(window.__sim)의 장면을 그대로 입체로 보여 줘요: 🔧 스패너(τ = F × ℓ) · ⚖️ 시소(회전 평형) · 📦 기울기 · 📚 책장(안정성) · 🌀 우력 · 🌉 널빤지 · 🏗️ 크레인.
   값은 2D 옆 조작판이 정하고 3D는 따라가요. 우력 · 🌉 널빤지 다리 · 🏗️ 크레인도 입체로 봐요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHN = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches), KD = PHN ? 1.3 : 1;
  const LV = () => (typeof window.SciSimLevel === 'number' ? window.SciSimLevel : 0);
  const TAU = Math.PI * 2, clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  function tools(THREE) {
    const V3 = THREE.Vector3, Y = new V3(0, 1, 0);
    const M = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.5, metalness: 0.1 }, o || {}));
    const glass = (c, op) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.2, metalness: 0, transparent: true, opacity: op == null ? 0.25 : op, depthWrite: false });
    function mkArrow(col, rad) {
      const g = new THREE.Group(), m = M(col, { roughness: 0.4 });
      const sh = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, 1, 12), m), hd = new THREE.Mesh(new THREE.ConeGeometry(rad * 2.6, rad * 6, 16), m);
      g.add(sh, hd); g.userData = { sh, hd, rad }; return g;
    }
    function setArrow(g, a, b) {
      const d = new V3().subVectors(b, a), len = d.length(), { sh, hd, rad } = g.userData;
      if (len < 1e-3) { g.visible = false; return; }
      g.visible = true; const hl = Math.min(len * 0.5, rad * 6);
      sh.scale.y = Math.max(0.001, len - hl); sh.position.y = (len - hl) / 2;
      hd.scale.y = hl / (rad * 6); hd.position.y = len - hl / 2;
      g.position.copy(a); g.quaternion.setFromUnitVectors(Y, d.normalize());
    }
    function tube(pts, r, col, o, closed) {
      const c = new THREE.CatmullRomCurve3(pts, !!closed);
      return new THREE.Mesh(new THREE.TubeGeometry(c, Math.max(24, pts.length * 3), r, 8, !!closed), (o && o.basic) ? new THREE.MeshBasicMaterial({ color: col, transparent: !!o.op, opacity: o.op || 1 }) : M(col, o));
    }
    function disc(r, col, y, op) { const m = new THREE.Mesh(new THREE.CircleGeometry(r, 64), new THREE.MeshStandardMaterial({ color: col, roughness: 0.9, transparent: op != null, opacity: op == null ? 1 : op })); m.rotation.x = -Math.PI / 2; m.position.y = y || 0; m.receiveShadow = true; return m; }
    function grid(w, d, step, col, y, op) {
      const pts = []; for (let x = -w / 2; x <= w / 2 + 1e-6; x += step) pts.push(x, 0, -d / 2, x, 0, d / 2); for (let z = -d / 2; z <= d / 2 + 1e-6; z += step) pts.push(-w / 2, 0, z, w / 2, 0, z);
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
      const l = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: op == null ? 0.3 : op })); l.position.y = y || 0; return l;
    }
    function arc(r, a0, a1, rad, col, n) { // xz 평면 위의 호
      const pts = []; n = n || 40; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; pts.push(new V3(r * Math.cos(a), 0, r * Math.sin(a))); }
      return tube(pts, rad, col);
    }
    return { V3, Y, M, glass, mkArrow, setArrow, tube, disc, grid, arc };
  }
  const NEED = 12, BOLT_TURN = 1.05, SINT = { 0: 0, 30: 0.5, 90: 1 };
  const SHELF = { W: 0.8, H: 2.0, MS: 40, MB: 40, LV: { top: 1.75, mid: 1.0, bottom: 0.25 }, BOARD: { top: 1.55, mid: 0.8, bottom: 0.05 }, BOOK: 0.4, NAME: { top: '위칸', mid: '가운데 칸', bottom: '아래칸' } };
  const ldH = (pos) => (SHELF.MS * (SHELF.H / 2) + SHELF.MB * SHELF.LV[pos]) / (SHELF.MS + SHELF.MB);
  const nf = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  window.SciSim3D.attach({
    title: '돌림힘과 평형 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대 · 값은 옆 조작판에서 바꿔요',
    camera: { dist: 9 * KD, theta: 0.35, phi: 1.2, min: 3, max: 26, target: [0, 1.2, 0] },
    autoRotate: 0,
    levels: [0, 2, 3],   // 2단계(시소)는 추를 캔버스에서 끌어 거리를 바꿔야 해서 2D
    build(ctx) {
      const { THREE, root, label, info, controls, orbit } = ctx;
      const { V3, M, mkArrow, setArrow, tube, disc } = tools(THREE);
      const sim = () => ctx.lesson();
      const gSp = new THREE.Group(), gSs = new THREE.Group(), gTp = new THREE.Group(), gCp = new THREE.Group(), gPk = new THREE.Group(), gCr = new THREE.Group(); root.add(gSp, gSs, gTp, gCp, gPk, gCr);
      function rod(a, b, r, col, op) {   // a→b 가는 막대(점선 대신 가는 막대)
        const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1, 8), new THREE.MeshBasicMaterial({ color: col, transparent: op != null, opacity: op == null ? 1 : op }));
        m.userData = { a: new V3(), b: new V3() };
        m.setA = (p, q) => { const d = new V3().subVectors(q, p), L = d.length(); m.visible = L > 1e-3; if (!m.visible) return; m.scale.set(1, L, 1); m.position.copy(p).addScaledVector(d, 0.5); m.quaternion.setFromUnitVectors(new V3(0, 1, 0), d.normalize()); };
        return m;
      }
      /* ================= 🔧 스패너 (위에서 본 모습, 1 m = 10칸) ================= */
      const U = 10;
      const table = new THREE.Mesh(new THREE.BoxGeometry(10.5, 0.3, 6), M(0xdfe6f1, { roughness: 0.9, metalness: 0 })); table.position.set(2.4, -0.15, 0); table.receiveShadow = true; gSp.add(table);
      const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.26 * 1.0 + 0.0, 0.26, 0.5, 6), M(0xa0522d, { metalness: 0.5, roughness: 0.6 })); bolt.position.y = 0.25; gSp.add(bolt);
      const boltCap = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.12, 16), M(0x8f9bb0, { metalness: 0.7 })); boltCap.position.y = 0.55; bolt.add(boltCap); boltCap.position.y = 0.28;
      const wr = new THREE.Group(); wr.position.y = 0.62; gSp.add(wr);
      const wMat = M(0xaab3c4, { metalness: 0.75, roughness: 0.3 });
      const wHandle = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.2, 0.3), wMat); wHandle.position.x = 0.1 + 2.3; wHandle.castShadow = true; wr.add(wHandle);
      { const fitBox = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.7, 1.2), new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false })); fitBox.position.x = 2.1; wr.add(fitBox); }   // 보이지 않는 맞춤 상자: 길고 얇은 손잡이도 자동 맞춤이 스패너 전체로 재게 해요
      const wHead = new THREE.Mesh(new THREE.CylinderGeometry(0.49, 0.49, 0.2, 40), wMat); wHead.castShadow = true; wr.add(wHead);
      const wHole = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.22, 6), M(0x4b5566, { metalness: 0.6 })); wr.add(wHole);
      const tickAnchors = [];
      [0.1, 0.2, 0.3, 0.4].forEach((m) => {
        const t = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.22, 0.2), M(0x2b3445)); t.position.set(m * U, 0, 0.12); wr.add(t);
        const a = new THREE.Object3D(); a.position.set(m * U, 0, 0.55); wr.add(a); tickAnchors.push([m, a, label(m.toFixed(1), a, { color: '#475569', size: 11 })]);
      });
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.2, 20, 16), M(0xf3cfa8, { roughness: 0.6 })); hand.position.y = 0.9; gSp.add(hand);
      const fA = mkArrow(0xe2464b, 0.07); gSp.add(fA);
      const lineAct = rod(new V3(), new V3(), 0.025, 0x7c5cff, 0.7), lineEll = rod(new V3(), new V3(), 0.05, 0x7c5cff); lineAct.userData.v3bg = true; gSp.add(lineAct, lineEll);   // 긴 작용선은 자동 맞춤에서 빼요: 스패너 전체가 화면에 크게 들어오게
      const lF = label('', fA, { color: '#c0392b', size: 13 }), lEll = label('', [0, 0, 0], { color: '#6d4fe0', size: 13 }), lTau = label('', [0, 0, 0], { color: '#c2410c', size: 13 });
      const arcMat = M(0xf26b3a, { emissive: 0x7a2d12 }); let arcMesh = null, arcKey = '';
      const lRef = label('볼트 중심(회전축)', [0, 0.2, 1.0], { color: '#475569', size: 12 });
      const demo = { p: 0, on: false };
      const sp3 = new V3(), hp = new V3(), u3 = new V3(), Q = new V3(), O3 = new V3(0, 0.95, 0);
      function spanner(dtS) {
        const s = sim().S.sp; if (!s) return;
        const run = s.st === 'idle' ? null : s.run;
        let F = run ? run.F : s.F, r = run ? run.r : s.r, th = run ? run.th : s.th;
        const tau = Math.round(F * r * SINT[th] * 10) / 10, ell = Math.round(r * SINT[th] * 100) / 100;
        let ang = s.ang, bAng = s.bolt, lift = s.loose ? 1 : 0, showF = s.st === 'idle', phase = '';
        if (demo.on && s.st === 'idle') {   // ▶ 재생: 지금 값(F, r, θ)으로 돌려 보기를 되풀이
          const ok = tau >= NEED, p = demo.p, ez = (x) => x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
          if (p < 0.2) { ang = 0; bAng = 0; lift = 0; showF = true; phase = '힘 주기'; }
          else if (p < 0.65) { const q = (p - 0.2) / 0.45; showF = false; lift = ok && q > 0.9 ? (q - 0.9) * 10 : 0; ang = ok ? ez(q) * BOLT_TURN : Math.sin(Math.PI * q) * 0.07; bAng = ok ? ang : 0; }
          else if (p < 0.82) { showF = false; ang = ok ? BOLT_TURN : 0; bAng = ang; lift = ok ? 1 : 0; }
          else { const q = (p - 0.82) / 0.18; showF = false; ang = ok ? BOLT_TURN * (1 - ez(q)) : 0; bAng = ok ? BOLT_TURN * (1 - q) : 0; lift = ok ? 1 - q : 0; }
        }
        wr.rotation.y = ang; bolt.rotation.y = bAng; bolt.position.y = 0.25 + lift * 0.3;
        bolt.material.color.setHex(s.loose || lift > 0.5 ? 0xb9c2d0 : 0xa0522d);
        const rr = r * U;
        hand.position.set(rr, 0.9, 0); hand.visible = showF; hp.set(rr, 0.9, 0);
        tickAnchors.forEach(([m, a, L]) => { L.el.style.fontWeight = m === r ? 900 : 700; });
        const ra = th * Math.PI / 180; u3.set(Math.cos(ra), 0, -Math.sin(ra));
        fA.visible = showF; lF.show(showF);
        const len = 1.0 + F * 0.03;
        if (showF) {
          setArrow(fA, hp, hp.clone().addScaledVector(u3, len)); lF.set('힘 F = ' + F + ' N'); lF.off = [0, 0.45, 0];
          const foot = rr * u3.x; Q.set(rr, 0.9, 0).addScaledVector(u3, -foot);
          lineAct.setA(hp.clone().addScaledVector(u3, -foot - 2.4), hp.clone().addScaledVector(u3, len + 1.2));
          if (ell > 0) { lineEll.setA(new V3(0, 0.9, 0), Q); lEll.show(true); lEll.obj = [Q.x / 2, 0.9, Q.z / 2]; lEll.set('ℓ = ' + ell.toFixed(2) + ' m'); }
          else { lineEll.visible = false; lEll.show(true); lEll.obj = [0, 0.9, -1.2]; lEll.set('작용선이 볼트 중심을 지나요 → ℓ = 0'); }
        } else { lineAct.visible = false; lineEll.visible = false; lEll.show(false); }
        // 돌림힘 크기에 비례하는 반시계 방향 호
        const sweep = clamp(tau / 40 * 4.6, 0, 4.6), key = sweep.toFixed(2) + (tau >= NEED);
        if (key !== arcKey) {
          arcKey = key; if (arcMesh) { gSp.remove(arcMesh); arcMesh.geometry.dispose(); }
          arcMesh = null;
          if (sweep > 0.05) {
            const pts = []; for (let i = 0; i <= 28; i++) { const a = 0.45 + sweep * i / 28; pts.push(new V3(0.95 * Math.cos(a), 0.78, -0.95 * Math.sin(a))); }
            arcMesh = tube(pts, 0.05, tau >= NEED ? 0x14a058 : 0xf26b3a, { emissive: tau >= NEED ? 0x0a5a30 : 0x7a2d12 }); gSp.add(arcMesh);
          }
        }
        lTau.obj = [0, 1.4, -1.5]; lTau.set('τ = ' + tau.toFixed(1) + ' N·m'); lTau.show(true);
        const okNow = tau >= NEED;
        info('<b>🔧 τ = F × ℓ = ' + F + ' N × ' + ell.toFixed(2) + ' m = ' + tau.toFixed(1) + ' N·m</b><br>🔩 녹슨 볼트는 ' + NEED + ' N·m 이상이어야 풀려요 · ' +
          (s.loose && !demo.on ? '✅ 풀렸어요!' : (okNow ? 'τ ' + tau.toFixed(1) + ' ≥ ' + NEED + ' → 풀려요' : 'τ ' + tau.toFixed(1) + ' < ' + NEED + ' → 안 풀려요')) +
          '<br>' + (ell === 0 ? '힘의 작용선이 회전축을 지나면 ℓ = 0이라서 힘이 커도 돌림힘은 0이에요.' : '같은 힘이라도 축에서 수직 거리가 길수록 돌림힘이 커요.') + '<br><span style="opacity:.8">힘·위치·방향은 옆 조작판에서 바꾸고 🔧 돌려 보기를 눌러요.</span>');
        phaseName = phase;
      }
      let phaseName = '';
      /* ================= ⚖️ 시소 ================= */
      const SC = new V3(0, 1.7, 0), HB = 2.5;
      const ground = new THREE.Mesh(new THREE.BoxGeometry(9, 0.1, 4), M(0x8a96ab, { roughness: 1 })); ground.position.y = -0.05; ground.receiveShadow = true; gSs.add(ground);
      const stand = new THREE.Mesh(new THREE.ConeGeometry(0.8, SC.y, 4), M(0x6b7689, { metalness: 0.4 })); stand.position.y = SC.y / 2 - 0.1; stand.rotation.y = Math.PI / 4; stand.scale.set(1, 1, 0.6); gSs.add(stand);
      [-1, 1].forEach((sg) => { const post = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.9, 0.5), M(0x9aa5b8)); post.position.set(sg * (HB + 0.05), 0.45, 0); gSs.add(post); });
      const beamG = new THREE.Group(); beamG.position.copy(SC); gSs.add(beamG);
      const beam = new THREE.Mesh(new THREE.BoxGeometry(HB * 2, 0.16, 0.7), M(0xd6a15c, { roughness: 0.55 })); beam.castShadow = true; beamG.add(beam);
      for (let m = -2; m <= 2.001; m += 0.5) { const t = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.18, 0.72), M(m === 0 ? 0xe2464b : 0x7c5a2f)); t.position.x = m; beamG.add(t); }
      const piv = new THREE.Mesh(new THREE.SphereGeometry(0.14, 20, 16), M(0xe2464b)); piv.position.copy(SC); gSs.add(piv);
      const numL = [];
      [-2, -1, 1, 2].forEach((m) => { const a = new THREE.Object3D(); a.position.set(m, 0.2, 0.45); beamG.add(a); numL.push(label(Math.abs(m).toFixed(1), a, { color: '#5a3d1a', size: 11 })); });
      function blockMk(col) {
        const g = new THREE.Group(), b = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), M(col, { roughness: 0.4, metalness: 0.25 })); b.castShadow = true; g.add(b);
        const hk = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), M(0x5a6679)); g.add(hk);
        const rope = rod(new V3(), new V3(), 0.02, 0x5a6679); g.add(rope); g.userData = { b, hk, rope }; gSs.add(g); return g;
      }
      const bA = blockMk(0x3b82f6), bB = blockMk(0xf26b3a);
      const lbA = label('', bA, { color: '#2f6df6', size: 13 }), lbB = label('', bB, { color: '#d9561f', size: 13 });
      const ldA = label('', [0, 0, 0], { color: '#2f6df6', size: 12 }), ldB = label('', [0, 0, 0], { color: '#d9561f', size: 12 }), lLev = label('수평!', [0, 3.3, 0], { color: '#15803d', size: 15 });
      const supA = mkArrow(0x14a058, 0.06); gSs.add(supA); const lSup = label('', [0, 0.6, 0.6], { color: '#14a058', size: 12 });
      function seesaw() {
        const s = sim().S.ss; if (!s) return;
        const tA = s.mA * 10 * s.xA, tB = s.mB * 10 * s.xB, N = (s.mA + s.mB) * 10;
        beamG.rotation.z = -s.beta;
        const cs = Math.cos(s.beta), sn = Math.sin(s.beta);
        [[bA, -s.pA, s.mA, s.xA, lbA, ldA], [bB, s.pB, s.mB, s.xB, lbB, ldB]].forEach(([g, pos, m, x, lb, ld]) => {
          const sz = 0.42 + m * 0.0055, hx = SC.x + pos * cs;
          const hky = SC.y - pos * sn;   // 오른쪽(+)이 내려가면 beta>0
          g.position.set(hx, hky, 0.0); g.userData.b.scale.set(sz, sz, sz * 0.9); g.userData.b.position.set(0, -0.35 - sz / 2, 0);
          g.userData.rope.setA(new V3(0, 0, 0), new V3(0, -0.35 - sz / 2 + sz / 2, 0));
          lb.set(m + ' kg'); lb.off = [0, -0.35 - sz / 2, sz]; ld.obj = [hx, hky, 0]; ld.off = [0, 0.38, 0.4]; ld.set(x.toFixed(1) + ' m');
        });
        setArrow(supA, new V3(0, 0.1, 0.55), new V3(0, 0.1 + 0.4 + N / 1200 * 0.9, 0.55)); lSup.obj = [0, 0.05, 0.55]; lSup.set('받침 힘 ' + nf(N) + ' N');
        const lev = Math.abs(s.beta) < 0.01 && tA === tB; lLev.show(lev);
        const eq = tA === tB;
        info('<b>⚖️ 돌림힘 비교 (받침점 기준, N·m)</b><br>↺ 반시계 (왼쪽 추): ' + nf(s.mA * 10) + ' N × ' + s.xA.toFixed(1) + ' m = <b>' + nf(tA) + ' N·m</b><br>↻ 시계 (오른쪽 추): ' + nf(s.mB * 10) + ' N × ' + s.xB.toFixed(1) + ' m = <b>' + nf(tB) + ' N·m</b><br>' + (eq ? '두 돌림힘이 같아요 → 알짜 돌림힘 0 → 수평!' : (tB > tA ? '시계 방향이 더 커요 → 오른쪽이 내려가요' : '반시계 방향이 더 커요 → 왼쪽이 내려가요')) + '<br><span style="opacity:.8">알짜힘 0: 받침 힘 N = (' + s.mA + ' + ' + s.mB + ') kg × 10 = ' + nf(N) + ' N</span>');
      }
      /* ================= 📦 기울기 · 📚 책장 ================= */
      const floorT = new THREE.Mesh(new THREE.BoxGeometry(9, 0.1, 3), M(0x8a96ab, { roughness: 1 })); floorT.position.set(-1.2, -0.05, 0); floorT.receiveShadow = true; gTp.add(floorT);
      const supW = new THREE.Mesh(new THREE.BoxGeometry(1, 0.03, 0.9), M(0x14a058, { emissive: 0x0a5a30 })); supW.position.y = 0.015; gTp.add(supW);
      const edge = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.26, 3), M(0x26324a)); edge.rotation.x = Math.PI / 2; edge.position.set(0, -0.1, 0); gTp.add(edge);
      const body = new THREE.Group(); gTp.add(body);
      let bodyKey = '';
      const cgBall = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 12), M(0xffffff, { emissive: 0x883333 })); gTp.add(cgBall);
      const plumb = rod(new V3(), new V3(), 0.02, 0x14a058), wArrow = mkArrow(0xe2464b, 0.04); gTp.add(plumb, wArrow);
      const lW = label('무게 W', wArrow, { color: '#c0392b', size: 12 }), lAx = label('회전축(모서리)', [0, 0, 0.55], { color: '#26324a', size: 12 }), lSupW = label('', [0, 0, 0.6], { color: '#0b6b39', size: 12 }), lTq = label('', [0, 0, 0], { color: '#14a058', size: 13 }), lAng = label('', [0, 0, 0], { color: '#475569', size: 13 });
      function buildBody(kind, w, h, pos) {
        while (body.children.length) { const c = body.children[0]; body.remove(c); }
        if (kind === 'tilt') {
          const m = new THREE.Mesh(new THREE.BoxGeometry(w, 1.0, 0.7), M(0x6f93d8, { roughness: 0.45 })); m.position.set(-w / 2, 0.5, 0); m.castShadow = true; body.add(m);
          if (h < 0.5) { const wt = new THREE.Mesh(new THREE.BoxGeometry(w - 0.02, h, 0.72), M(0x4b5563)); wt.position.set(-w / 2, h / 2, 0); body.add(wt); }
          body.userData.fall = m;
        } else {
          const W = SHELF.W, H = SHELF.H;
          const fr = new THREE.Mesh(new THREE.BoxGeometry(W, H, 0.5), M(0xc99a62, { roughness: 0.6 })); fr.position.set(-W / 2, H / 2, -0.06); fr.castShadow = true; body.add(fr);
          const back = new THREE.Mesh(new THREE.BoxGeometry(W - 0.1, H - 0.1, 0.02), M(0xecd9b8)); back.position.set(-W / 2, H / 2, 0.21); body.add(back);
          ['bottom', 'mid', 'top'].forEach((k) => {
            const bd = new THREE.Mesh(new THREE.BoxGeometry(W - 0.08, 0.06, 0.46), M(0xa97c45)); bd.position.set(-W / 2, SHELF.BOARD[k], 0.12); body.add(bd);
            const by = SHELF.BOARD[k] + 0.03;
            if (k === pos) { const hb = new THREE.Mesh(new THREE.BoxGeometry(W - 0.16, SHELF.BOOK, 0.4), M(0x3b3f52)); hb.position.set(-W / 2, by + SHELF.BOOK / 2, 0.12); body.add(hb); const a = new THREE.Object3D(); a.position.set(-W / 2, by + SHELF.BOOK / 2, 0.36); body.add(a); body.userData.bookA = a; }
            else { const cols = [0xe07a5f, 0x81b29a, 0xf2cc8f, 0x6c8ebf]; for (let i = 0; i < 4; i++) { const bk = new THREE.Mesh(new THREE.BoxGeometry((W - 0.16) / 4 - 0.02, SHELF.BOOK * 0.7, 0.36), M(cols[i])); bk.position.set(-W / 2 + 0.08 - (W - 0.16) / 2 + (i + 0.5) * ((W - 0.16) / 4), by + SHELF.BOOK * 0.35, 0.12); body.add(bk); } }
          });
        }
      }
      const lBook = label('무거운 책', [0, 0, 0], { color: '#3b3f52', size: 12 });
      function topple(kind) {
        const S = sim().S, t = kind === 'tilt' ? S.tl : S.ld; if (!t) return;
        const w = kind === 'tilt' ? t.w : SHELF.W, h = kind === 'tilt' ? t.h : ldH(t.pos);
        const key = kind + w + '|' + h + (kind === 'load' ? t.pos : '');
        if (key !== bodyKey) { bodyKey = key; buildBody(kind, w, h, t.pos); supW.scale.x = w; supW.position.x = -w / 2; }
        body.rotation.z = -t.ang;
        const ca = Math.cos(t.ang), sa = Math.sin(t.ang);
        const cgx = (-w / 2) * ca + h * sa, cgy = (w / 2) * sa + h * ca;
        cgBall.position.set(cgx, cgy, 0.4); const inside = cgx <= 0.01;
        cgBall.material.emissive.setHex(0x883333);
        plumb.setA(new V3(cgx, cgy, 0.4), new V3(cgx, 0.02, 0.4)); plumb.material.color.setHex(inside ? 0x14a058 : 0xe2464b);
        setArrow(wArrow, new V3(cgx, cgy - 0.1, 0.4), new V3(cgx, Math.max(0.1, cgy - 0.1 - clamp(cgy - 0.25, 0.25, 0.7)), 0.4)); lW.off = [0.3, 0, 0];
        lAx.obj = [0, -0.25, 0.55]; lSupW.obj = [-w / 2, -0.2, 0.6]; lSupW.set('받침면 ' + w.toFixed(1) + ' m');
        lBook.show(kind === 'load' && !!body.userData.bookA); if (kind === 'load' && body.userData.bookA) { lBook.obj = body.userData.bookA; }
        const deg = t.ang * 180 / Math.PI, tc = Math.atan((w / 2) / h) * 180 / Math.PI;
        const idle = t.st === 'idle';
        lTq.show(idle && t.deg > 0); lTq.obj = [(cgx < 0 ? -w - 0.4 : 0.9), 0.9, 0.5]; lTq.set(inside ? '↺ 되돌리는 돌림힘' : '↻ 넘어뜨리는 돌림힘'); lTq.el.style.background = inside ? '#14a058' : '#e2464b';
        lAng.show(true); lAng.obj = [0.9, 0.2, 0.5]; lAng.set('📐 ' + deg.toFixed(1) + '°');
        const r1 = (v) => Math.round(v * 10) / 10;
        if (kind === 'tilt') info('<b>📦 직육면체를 기울이면 언제 넘어질까?</b><br>tan θ한계 = (w/2) / h = ' + (w / 2).toFixed(2) + ' / ' + h.toFixed(2) + ' = ' + (w / 2 / h).toFixed(2) + ' → <b>θ한계 = ' + r1(tc).toFixed(1) + '°</b><br>' + (idle ? (inside ? '무게중심의 수직선이 받침면 안 → 되돌려 놓아요.' : '수직선이 받침면 밖 → 넘어져요.') : '💥 넘어졌어요! 한계 각 ' + r1(tc).toFixed(1) + '°') + '<br><span style="opacity:.8">폭 w · 무게중심 높이 h · 기울이는 각 θ는 옆 조작판에서 바꿔요.</span>');
        else info('<b>📚 책장(' + SHELF.MS + ' kg) + 무거운 책(' + SHELF.MB + ' kg)의 무게중심</b><br>무거운 책을 ' + SHELF.NAME[t.pos] + '에 → h = ' + h.toFixed(3) + ' m<br>tan θ한계 = ' + (SHELF.W / 2).toFixed(2) + ' / ' + h.toFixed(3) + ' → <b>θ한계 = ' + r1(tc).toFixed(1) + '°</b>' + (idle ? '' : '<br>💥 쓰러졌어요!') + '<br><span style="opacity:.8">무거운 책의 칸 · 기울이는 각은 옆 조작판에서 바꿔요.</span>');
      }

      /* ================= 🌀 우력: 얼음 위의 막대 (위에서 본 모습, 1 m = 8칸, 위쪽 힘 = 화면 위 = −z) ================= */
      const CS = 8, CPX = [-0.2, 0, 0.2], CFS = 0.08, labCp = [];
      const ice = new THREE.Mesh(new THREE.BoxGeometry(9, 0.3, 5.6), M(0x5f93bb, { roughness: 0.25, metalness: 0.05 })); ice.position.y = -0.15; ice.receiveShadow = true; gCp.add(ice);
      const startBox = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(0.4 * CS, 0.3, 0.55)), new THREE.LineBasicMaterial({ color: 0x3c506e })); startBox.position.y = 0.17; gCp.add(startBox);
      const rodG = new THREE.Group(); gCp.add(rodG);
      const rodM = new THREE.Mesh(new THREE.BoxGeometry(0.4 * CS, 0.3, 0.55), M(0xa8742f, { roughness: 0.55 })); rodM.position.y = 0.15; rodM.castShadow = true; rodG.add(rodM);
      CPX.forEach((x) => { const d = new THREE.Mesh(new THREE.SphereGeometry(0.1, 14, 10), M(0x5a6679)); d.position.set(x * CS, 0.31, 0); rodG.add(d); });
      const cDot = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 12), M(0xe2464b)); cDot.position.set(0, 0.34, 0); rodG.add(cDot);
      const cpArr = [0, 1, 2].map((i) => { const a = mkArrow(i === 1 ? 0x6d4fe0 : 0xd22a30, 0.07); gCp.add(a); return a; });
      const cpLab = [0, 1, 2].map((i) => { const l = label('', [0, 0, 0], { color: i === 1 ? '#6d4fe0' : '#c0392b', size: 13 }); labCp.push(l); return l; });
      const cpName = [['−0.2 m', '#475569'], ['중심(기준점)', '#c0392b'], ['+0.2 m', '#475569']].map((q, i) => { const l = label(q[0], [CPX[i] * CS, 0.1, 0.95], { color: q[1], size: 12 }); labCp.push(l); return l; });
      const lCpRes = label('', [0, 0.4, -2.9], { color: '#26324a', size: 14 }); labCp.push(lCpRes);
      const dC = { p: 0, on: false };
      const cpKind = (f) => { const a = f[0] + f[1] + f[2], t = (f[2] - f[0]) / 5; if (f.every((v) => v === 0)) return '힘이 없어요'; if (a === 0 && t === 0) return '정지 (평형)'; if (a === 0) return '제자리에서 회전'; if (t === 0) return '이동만 (회전 없음)'; return '이동 + 회전'; };
      function couple() {
        const c = sim().S.cp; if (!c) return;
        const r = c.run, f = r ? r.f : c.f;
        let p = 0, done = false, running = false;
        if (r && r.st === 'run') { p = r.t; running = true; }
        else if (dC.on) { const pp = dC.p; p = pp < 0.15 ? 0 : pp < 0.85 ? (pp - 0.15) / 0.7 : 1; running = pp >= 0.15 && pp < 0.85; done = pp >= 0.85; }
        else if (r) { p = 1; done = true; }
        const a = f[0] + f[1] + f[2], t = (f[2] - f[0]) / 5, q = p * p;
        const z0 = -clamp(a / 20, -1, 1) * 1.3 * q, rot = clamp(-t / 4 * 1.6, -3.2, 3.2) * q;
        rodG.position.z = z0; rodG.rotation.y = -rot;
        const fresh = p === 0 && !done;
        cpName.forEach((l) => l.show(fresh));
        f.forEach((v, i) => {
          const px = CPX[i] * CS * Math.cos(rot), pz = z0 + CPX[i] * CS * Math.sin(rot), len = Math.abs(v) * CFS, sg = v > 0 ? -1 : 1;
          cpArr[i].visible = v !== 0; cpLab[i].show(v !== 0);
          if (v !== 0) {
            setArrow(cpArr[i], new V3(px, 0.4, pz + sg * -0.38), new V3(px, 0.4, pz + sg * -0.38 + sg * len));
            cpLab[i].obj = [px, 0.4, pz + sg * -0.38 + sg * (len + 0.45)]; cpLab[i].set((v > 0 ? '↑ ' : '↓ ') + Math.abs(v) + ' N');
          }
        });
        lCpRes.show(done); if (done) lCpRes.set('결과: ' + cpKind(f));
        lCpRes.el.style.background = done && a === 0 && t === 0 ? '#14a058' : '#26324a';
        const sT = (t > 0 ? '+' : '') + t.toFixed(1);
        info('<b>🌀 얼음 위의 막대 (위에서 본 모습, 마찰 없음)</b><br>① 알짜힘 ΣF = <b>' + (a > 0 ? '+' : '') + a + ' N</b>' + (a === 0 ? ' ✔' : '') + ' &nbsp; ② 돌림힘의 합 Στ = <b>' + sT + ' N·m</b>' + (t === 0 ? ' ✔' : '') +
          '<br>' + (f.every((v) => v === 0) ? '옆 조작판에서 힘을 정해 주세요.' : (running ? '🐌 슬로모션으로 움직이는 중…' : '결과: <b>' + cpKind(f) + '</b>')) +
          '<br><span style="opacity:.8">Στ = (−0.2)×F왼 + 0×F가운데 + 0.2×F오른 (반시계 +) · 힘은 옆 조작판에서 정해요.</span>');
      }
      /* ================= 🌉 널빤지 다리 (옆에서 본 모습, 1 m = 1칸) ================= */
      const PH = 1.8, PTH = 0.25, FSC3 = 0.0025, PLK = { SPAN: 4, LEN: 8, WP: 200, WL: 400, OVER: 2 }, labPk = [];
      const gnd = new THREE.Mesh(new THREE.BoxGeometry(13, 0.2, 3.4), M(0x56627a, { roughness: 1 })); gnd.position.set(2, -0.1, 0); gnd.receiveShadow = true; gPk.add(gnd);
      [0, PLK.SPAN].forEach((x) => { const pil = new THREE.Mesh(new THREE.BoxGeometry(0.34, PH, 0.9), M(0x8e9ab0, { metalness: 0.3 })); pil.position.set(x, PH / 2, 0); pil.castShadow = true; gPk.add(pil); const sen = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.5, 0.5), M(0x1f2937)); sen.position.set(x, 0.25, 1.05); gPk.add(sen); });
      const plankG = new THREE.Group(); plankG.position.set(PLK.SPAN, PH, 0); gPk.add(plankG);
      const plankM = new THREE.Mesh(new THREE.BoxGeometry(PLK.LEN, PTH, 0.8), M(0xa8742f, { roughness: 0.55 })); plankM.position.set((-PLK.OVER - PLK.SPAN + PLK.LEN / 2), PTH / 2, 0); plankM.castShadow = true; plankG.add(plankM);
      for (let m = 0; m <= 6; m++) { const tk = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.06, 0.82), M(0x5a3d1a)); tk.position.set(m - PLK.SPAN, PTH, 0); plankG.add(tk); const a = new THREE.Object3D(); a.position.set(m - PLK.SPAN, PTH, 0.55); plankG.add(a); labPk.push(label(String(m), a, { color: '#5a3d1a', size: 11 })); }
      const loadM = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.6), M(0xf2873a, { roughness: 0.4, metalness: 0.2 })); loadM.castShadow = true; plankG.add(loadM);
      const loadArr = mkArrow(0xe2464b, 0.05), plkArr = mkArrow(0xc0392b, 0.05), nArr = [mkArrow(0x14a058, 0.05), mkArrow(0x14a058, 0.05)]; gPk.add(loadArr, plkArr, nArr[0], nArr[1]);
      const lLoadW = label('짐 400 N', [0, 0, 0], { color: '#c0392b', size: 12 }), lPlkW = label('판 200 N', [0, 0, 0], { color: '#c0392b', size: 12 });
      const lNA = label('', [0, 0, 0], { color: '#14a058', size: 12 }), lNB = label('', [0, 0, 0], { color: '#14a058', size: 12 });
      const sA = label('', [0, 0.5, 1.4], { color: '#1f2937', size: 12 }), sB = label('', [PLK.SPAN, 0.5, 1.4], { color: '#1f2937', size: 12 });
      const pA = label('A 점', [0, 0.02, 1.45], { color: '#475569', size: 12 }), pB = label('B 점', [PLK.SPAN, 0.02, 1.45], { color: '#475569', size: 12 });
      const lWarn = label('', [3, PH + 2.2, 0], { color: '#e2464b', size: 14 }), lRefP = label('', [0, PH + 0.9, 0.5], { color: '#b45309', size: 12 });
      const refRing = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.05, 10, 32), M(0xf5b83d, { emissive: 0x7a5a00 })); gPk.add(refRing);
      labPk.push(lLoadW, lPlkW, lNA, lNB, sA, sB, pA, pB, lWarn, lRefP);
      const dP = { p: 0, on: false, px: 1, tip: 0 };
      const nfmt = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
      function plank(dt) {
        const S = sim(), pk = S.S.pl; if (!pk) return;
        const demo = dP.on; let x = pk.x, px = pk.px, tip = pk.tip;
        if (demo) { x = Math.round(6 * dP.p * 10) / 10; px = x; const tg = S.plNA(x) < 0 ? 0.13 : 0; dP.tip += (tg - dP.tip) * Math.min(1, dt * 7); tip = dP.tip; }
        const tp = S.plNA(x) < 0, NB = tp ? PLK.WP + PLK.WL : S.plNB(x), NA = tp ? 0 : S.plNA(x);
        plankG.rotation.z = -tip;
        const cs = Math.cos(tip), sn = Math.sin(tip), W = (lx, ly) => new V3(PLK.SPAN + lx * cs + ly * sn, PH - lx * sn + ly * cs, 0.0);
        const lx = px - PLK.SPAN; loadM.position.set(lx, PTH + 0.3, 0);
        const lt = W(lx, PTH + 0.6), ll = W(lx, PTH + 0.6 + PLK.WL * FSC3);
        setArrow(loadArr, ll, lt); lLoadW.obj = [ll.x, ll.y + 0.2, 0];
        const mc = W((PLK.LEN / 2 - PLK.OVER - PLK.SPAN), 0), me = mc.clone(); me.y -= PLK.WP * FSC3; setArrow(plkArr, mc, me); lPlkW.obj = [me.x, me.y - 0.2, 0];
        const bx = PLK.SPAN * 0 + 0;
        [[0, NA, nArr[0], lNA, sA, 'N_A'], [PLK.SPAN, NB, nArr[1], lNB, sB, 'N_B']].forEach(([xx, N, ar, lb, sl, nm]) => {
          if (N > 0) { setArrow(ar, new V3(xx + 0.35, PH - N * FSC3, 0.0), new V3(xx + 0.35, PH + (xx === PLK.SPAN ? 0 : 0), 0)); ar.visible = true; lb.show(true); lb.obj = [xx + 0.35, PH - N * FSC3 - 0.2, 0]; lb.set(nfmt(N) + ' N'); }
          else { ar.visible = false; lb.show(false); }
          sl.set(nm + '<br>' + nfmt(N) + ' N');
        });
        void bx;
        const ref = pk.ref; refRing.position.set(ref === 'A' ? 0 : PLK.SPAN, PH + 0.02, 0.5); lRefP.obj = [ref === 'A' ? 0 : PLK.SPAN, PH - 0.5, 0.6]; lRefP.set('기준점 ' + ref);
        lWarn.show(tp || NA === 0); lWarn.set(tp ? '⚠️ A 쪽이 들려요! N_A = 0' : '아슬아슬: N_A = 0'); lWarn.el.style.background = tp ? '#e2464b' : '#f59e0b';
        let eq;
        if (tp) eq = '짐이 B에서 너무 멀어요. A를 기준으로 하면<br>N_B × 4.0 = 200 × 2.0 + 400 × ' + x.toFixed(1) + ' → N_B = ' + nfmt(S.plNB(x)) + ' N<br>N_A = 600 − N_B &lt; 0 → 받침은 당길 수 없어요.<br>평형이 깨져 B를 축으로 돌아가요.';
        else if (ref === 'A') eq = 'N_B × 4.0 = 200 × 2.0 + 400 × ' + x.toFixed(1) + ' → <b>N_B = ' + nfmt(S.plNB(x)) + ' N</b><br>알짜힘 0: N_A + N_B = 200 + 400 → <b>N_A = ' + nfmt(S.plNA(x)) + ' N</b>';
        else eq = 'N_A × 4.0 = 200 × 2.0 + 400 × (4.0 − ' + x.toFixed(1) + ') → <b>N_A = ' + nfmt(S.plNA(x)) + ' N</b><br>알짜힘 0: N_A + N_B = 200 + 400 → <b>N_B = ' + nfmt(S.plNB(x)) + ' N</b>';
        info('<b>🌉 기준점 ' + ref + ' 점으로 돌림힘의 합 = 0</b> (짐 ' + x.toFixed(1) + ' m)<br>' + eq + '');
      }
      /* ================= 🏗️ 크레인 (옆에서 본 모습, 1 m = 0.45칸) ================= */
      const CSC = 0.45, TH = 5.2, JL = 6.8, JR = 8.6, WCW = 3000, labCr = [];
      const gnd2 = new THREE.Mesh(new THREE.BoxGeometry(12, 0.2, 3.4), M(0x56627a, { roughness: 1 })); gnd2.position.set(0, -0.1, 0); gnd2.receiveShadow = true; gCr.add(gnd2);
      const towerM = M(0xe0a82e, { roughness: 0.5, metalness: 0.2 });
      const tower = new THREE.Mesh(new THREE.BoxGeometry(0.5, TH, 0.5), towerM); tower.position.y = TH / 2; tower.castShadow = true; gCr.add(tower);
      for (let y = 0.6; y < TH - 0.3; y += 0.8) { const rg = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.07, 0.58), M(0xb07d0a)); rg.position.y = y; gCr.add(rg); }
      const base = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.3, 1.2), M(0x8e9ab0)); base.position.y = 0.15; gCr.add(base);
      const armG = new THREE.Group(); armG.position.y = TH; gCr.add(armG);
      const arm = new THREE.Mesh(new THREE.BoxGeometry((JL + JR) * CSC, 0.22, 0.32), M(0xf5b83d, { roughness: 0.45 })); arm.position.x = (JR - JL) / 2 * CSC; arm.castShadow = true; armG.add(arm);
      for (let m = -6; m <= 8; m++) { if (!m) continue; const tk = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.1, 0.34), M(0x3c2a00)); tk.position.set(m * CSC, 0.14, 0); armG.add(tk); if (m % 2 === 0) { const a = new THREE.Object3D(); a.position.set(m * CSC, 0.42, 0); armG.add(a); labCr.push(label(String(Math.abs(m)), a, { color: '#7a5a00', size: 11 })); } }
      const pivC = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), M(0xe2464b)); pivC.position.y = TH; gCr.add(pivC);
      const loadG = new THREE.Group(); gCr.add(loadG); const cwG = new THREE.Group(); gCr.add(cwG);
      const loadBox = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), M(0xf2873a, { roughness: 0.4, metalness: 0.2 })); loadBox.castShadow = true; loadG.add(loadBox);
      const cwBox = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.8, 0.9), M(0x6b7280, { roughness: 0.4, metalness: 0.5 })); cwBox.castShadow = true; cwG.add(cwBox); cwBox.position.y = -1.05;
      const cabL = rod(new V3(), new V3(), 0.02, 0x4b5563), cabC = rod(new V3(), new V3(), 0.02, 0x4b5563); gCr.add(cabL, cabC);
      const supArr = mkArrow(0x14a058, 0.06); gCr.add(supArr);
      const lLd = label('', loadG, { color: '#c2410c', size: 13 }), lCw = label('', cwG, { color: '#4b5563', size: 13 });
      const lSupC = label('', [0.7, TH - 0.8, 0.4], { color: '#14a058', size: 12 }), lCrSt = label('', [0, TH + 1.5, 0], { color: '#14a058', size: 15 });
      labCr.push(lLd, lCw, lSupC, lCrSt);
      const dR = { p: 0, on: false, beta: 0, dc: 3 };
      function crane(dt) {
        const S = sim(), c = S.S.cr; if (!c) return;
        const net0 = c.wl * c.dl - WCW * (dR.on ? dR.dc : c.dc);
        let beta = c.beta, dc = c.pdc;
        if (dR.on) {
          dR.dc = 0.5 + 5.5 * dR.p; const net = c.wl * c.dl - WCW * dR.dc;
          const tg = net === 0 ? 0 : Math.sign(net) * clamp(0.04 + Math.abs(net) / 24000 * 0.1, 0.04, 0.1);
          dR.beta += (tg - dR.beta) * Math.min(1, dt * 6); beta = dR.beta; dc = dR.dc;
        } else { dR.beta = c.beta; dR.dc = c.dc; }
        const dcx = dR.on ? dR.dc : c.dc, tL = c.wl * c.dl, tC = WCW * dcx, net = tL - tC;
        armG.rotation.z = -beta;
        const cb = Math.cos(beta), sb = Math.sin(beta);
        const hookL = new V3(c.dl * CSC * cb, TH - c.dl * CSC * sb, 0), hookC = new V3(-dc * CSC * cb, TH + dc * CSC * sb, 0);
        const lsz = 0.5 + c.wl / 1000 * 0.22;
        loadBox.scale.setScalar(lsz); loadG.position.set(hookL.x, hookL.y - 1.1 - lsz / 2, 0);
        cwG.position.set(hookC.x, hookC.y - 0.5, 0);
        cabL.setA(hookL, new V3(hookL.x, hookL.y - 1.1, 0)); cabC.setA(hookC, new V3(hookC.x, hookC.y - 0.5, 0));
        lLd.set('짐 ' + nfmt(c.wl) + ' N · ' + c.dl.toFixed(1) + ' m'); lLd.off = [0, -lsz / 2 - 0.2, 0.3]; lCw.set('평형추 ' + nfmt(WCW) + ' N · ' + dcx.toFixed(1) + ' m'); lCw.off = [0, -1.05 - 0.6, 0.3];
        const Nn = c.wl + WCW; setArrow(supArr, new V3(0.65, TH - 0.3 - Nn / 6000 * 1.6, 0.4), new V3(0.65, TH - 0.15, 0.4)); lSupC.set('떠받치는 힘 ' + nfmt(Nn) + ' N'); lSupC.obj = [1.7, TH - 1.1, 0.4];
        const lev = net === 0 && Math.abs(beta) < 0.01, tilt = Math.abs(beta) > 0.02;
        lCrSt.show(lev || tilt); lCrSt.set(lev ? '평형!' : net > 0 ? '짐 쪽이 내려가요' : '평형추 쪽이 내려가요'); lCrSt.el.style.background = lev ? '#14a058' : '#e2464b';
        info('<b>🏗️ 탑 꼭대기 기준 돌림힘 (N·m)</b><br>↻ 짐 쪽: ' + nfmt(c.wl) + ' N × ' + c.dl.toFixed(1) + ' m = <b>' + nfmt(tL) + ' N·m</b><br>↺ 평형추 쪽: ' + nfmt(WCW) + ' N × ' + dcx.toFixed(1) + ' m = <b>' + nfmt(tC) + ' N·m</b><br>' +
          (net === 0 ? '돌림힘이 같아요 → 크레인이 평형이에요' : (tL > tC ? '짐 쪽 돌림힘이 더 커요 → 평형추를 더 멀리' : '평형추 쪽 돌림힘이 더 커요 → 평형추를 더 가까이')) +
          '<br><span style="opacity:.8">알짜힘 0: 탑이 떠받치는 힘 = ' + nfmt(Nn) + ' N</span>');
        void net0;
      }
      /* ================= 장면 고르기 ================= */
      let shown = '', pl = null, plC = null, plP = null, plR = null;
      function showMode(mode) {
        if (mode === shown) return; shown = mode;
        gSp.visible = mode === 'spanner'; gSs.visible = mode === 'seesaw'; gTp.visible = mode === 'tilt' || mode === 'load'; gCp.visible = mode === 'couple'; gPk.visible = mode === 'plank'; gCr.visible = mode === 'crane';
        labCp.forEach((l) => l.show(mode === 'couple')); labPk.forEach((l) => l.show(mode === 'plank')); labCr.forEach((l) => l.show(mode === 'crane'));
        const spl = mode === 'spanner';
        [lF, lEll, lTau, lRef].forEach((l) => l.show(spl)); tickAnchors.forEach((a) => a[2].show(spl));
        [lbA, lbB, ldA, ldB, lLev, lSup].concat(numL).forEach((l) => l.show(mode === 'seesaw'));
        [lW, lAx, lSupW, lTq, lAng].forEach((l) => l.show(gTp.visible)); lBook.show(false);
        if (pl && pl.row) pl.row.style.display = spl ? '' : 'none';
        if (plC && plC.row) plC.row.style.display = mode === 'couple' ? '' : 'none'; if (plP && plP.row) plP.row.style.display = mode === 'plank' ? '' : 'none'; if (plR && plR.row) plR.row.style.display = mode === 'crane' ? '' : 'none';
        if (mode === 'spanner') { Object.assign(orbit, { tx: PHN ? 2.3 : 2.0, ty: PHN ? 0.3 : 0.75, tz: 0, phi: 0.7, theta: 0.0, dist: PHN ? 9 * KD : 6.2 }); }
        else if (mode === 'seesaw') { Object.assign(orbit, { tx: 0, ty: 1.3, tz: 0, phi: 1.3, theta: 0.3, dist: 7.6 * KD }); }
        else if (mode === 'tilt') { Object.assign(orbit, { tx: -0.6, ty: 0.7, tz: 0, phi: 1.25, theta: 0.2, dist: 4.6 * KD }); bodyKey = ''; }
        else if (mode === 'load') { Object.assign(orbit, { tx: -0.4, ty: 1.0, tz: 0, phi: 1.3, theta: 0.25, dist: 7 * KD }); bodyKey = ''; }
        else if (mode === 'couple') { Object.assign(orbit, { tx: 0, ty: 0, tz: 0, phi: 0.6, theta: 0.0, dist: 8.5 * KD }); }
        else if (mode === 'plank') { Object.assign(orbit, { tx: 2, ty: 1.2, tz: 0, phi: 1.3, theta: 0.2, dist: 10.5 * KD * (PHN ? 1.1 : 1) }); }
        else if (mode === 'crane') { Object.assign(orbit, { tx: -0.9, ty: 3.2, tz: 0, phi: 1.3, theta: 0.25, dist: 12 * KD * (PHN ? 1.25 : 1) }); }
        else { orbit.dist = 9 * KD; }
      }
      /* ▶ 재생: 스패너로 지금 값 그대로 '힘 주기 → 돌리기 → 결과 → 되돌리기'를 되풀이해요 */
      pl = controls.player({ duration: 7, loop: true, autoplay: false, label: '돌려 보기',
        phases: [[0, '힘 주기'], [0.2, '돌리는 중'], [0.65, '결과'], [0.82, '되돌리기']],
        onFrame(p) { demo.p = p; demo.on = p > 0 || !!(pl && pl.playing); } });
      plC = controls.player({ duration: 6, loop: true, autoplay: false, label: '힘 가하기',
        phases: [[0, '힘 주기'], [0.15, '움직이는 중'], [0.85, '결과']], onFrame(p) { dC.p = p; dC.on = p > 0 || !!(plC && plC.playing); } });
      plP = controls.player({ duration: 8, loop: true, autoplay: false, label: '짐 옮기기',
        phases: [[0, 'A 쪽'], [0.33, '가운데'], [0.66, 'B 너머'], [0.84, 'A가 들려요']], onFrame(p) { dP.p = p; dP.on = p > 0 || !!(plP && plP.playing); } });
      plR = controls.player({ duration: 8, loop: true, autoplay: false, label: '평형추 옮기기',
        phases: [[0, '가까이'], [0.5, '멀리']], onFrame(p) { dR.p = p; dR.on = p > 0 || !!(plR && plR.playing); } });
      { const rows = ctx.renderer.domElement.parentNode.parentNode.querySelectorAll('.v3-player'); pl.row = rows[0]; plC.row = rows[1]; plP.row = rows[2]; plR.row = rows[3]; }
      return {
        update(dt) {
          const S = sim() && sim().S; if (!S) return;
          showMode(S.mode);
          if (S.sp && S.sp.st !== 'idle' && pl.playing) pl.pause();
          if (!pl.playing && pl.p === 0) demo.on = false;
          if (S.cp && S.cp.run && S.cp.run.st === 'run' && plC.playing) plC.pause();
          if (!plC.playing && plC.p === 0) dC.on = false; if (!plP.playing && plP.p === 0) dP.on = false; if (!plR.playing && plR.p === 0) dR.on = false;
          if (S.mode === 'spanner') spanner(dt);
          else if (S.mode === 'seesaw') seesaw();
          else if (S.mode === 'tilt' || S.mode === 'load') topple(S.mode);
          else if (S.mode === 'couple') couple();
          else if (S.mode === 'plank') plank(dt);
          else if (S.mode === 'crane') crane(dt);
        },
        sync() {},
      };
    },
  });
})();
