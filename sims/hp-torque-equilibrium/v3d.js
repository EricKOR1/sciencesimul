/* hp-torque-equilibrium · 3D 돌림힘과 평형
   2D 실험(window.__sim)의 장면을 그대로 입체로 보여 줘요: 🔧 스패너(τ = F × ℓ) · ⚖️ 시소(회전 평형) · 📦 기울기 · 📚 책장(안정성).
   값은 2D 옆 조작판이 정하고 3D는 따라가요. (우력·널빤지·크레인은 2D 화면에서 해요) */
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
    levels: [0, 1],
    build(ctx) {
      const { THREE, root, label, info, controls, orbit } = ctx;
      const { V3, M, mkArrow, setArrow, tube, disc } = tools(THREE);
      const sim = () => ctx.lesson();
      const gSp = new THREE.Group(), gSs = new THREE.Group(), gTp = new THREE.Group(); root.add(gSp, gSs, gTp);
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
      const wHead = new THREE.Mesh(new THREE.CylinderGeometry(0.49, 0.49, 0.2, 40), wMat); wHead.castShadow = true; wr.add(wHead);
      const wHole = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.22, 6), M(0x4b5566, { metalness: 0.6 })); wr.add(wHole);
      const tickAnchors = [];
      [0.1, 0.2, 0.3, 0.4].forEach((m) => {
        const t = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.22, 0.2), M(0x2b3445)); t.position.set(m * U, 0, 0.12); wr.add(t);
        const a = new THREE.Object3D(); a.position.set(m * U, 0, 0.55); wr.add(a); tickAnchors.push([m, a, label(m.toFixed(1), a, { color: '#475569', size: 11 })]);
      });
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.2, 20, 16), M(0xf3cfa8, { roughness: 0.6 })); hand.position.y = 0.9; gSp.add(hand);
      const fA = mkArrow(0xe2464b, 0.07); gSp.add(fA);
      const lineAct = rod(new V3(), new V3(), 0.025, 0x7c5cff, 0.7), lineEll = rod(new V3(), new V3(), 0.05, 0x7c5cff); gSp.add(lineAct, lineEll);
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
      /* ================= 장면 고르기 ================= */
      let shown = '', pl = null;
      function showMode(mode) {
        if (mode === shown) return; shown = mode;
        gSp.visible = mode === 'spanner'; gSs.visible = mode === 'seesaw'; gTp.visible = mode === 'tilt' || mode === 'load';
        const spl = mode === 'spanner';
        [lF, lEll, lTau, lRef].forEach((l) => l.show(spl)); tickAnchors.forEach((a) => a[2].show(spl));
        [lbA, lbB, ldA, ldB, lLev, lSup].concat(numL).forEach((l) => l.show(mode === 'seesaw'));
        [lW, lAx, lSupW, lTq, lAng].forEach((l) => l.show(gTp.visible)); lBook.show(false);
        if (pl && pl.row) pl.row.style.display = spl ? '' : 'none';
        if (mode === 'spanner') { Object.assign(orbit, { tx: 2.3, ty: 0.3, tz: 0, phi: 0.7, theta: 0.0, dist: 9 * KD }); }
        else if (mode === 'seesaw') { Object.assign(orbit, { tx: 0, ty: 1.3, tz: 0, phi: 1.3, theta: 0.3, dist: 7.6 * KD }); }
        else if (mode === 'tilt') { Object.assign(orbit, { tx: -0.6, ty: 0.7, tz: 0, phi: 1.25, theta: 0.2, dist: 4.6 * KD }); bodyKey = ''; }
        else if (mode === 'load') { Object.assign(orbit, { tx: -0.4, ty: 1.0, tz: 0, phi: 1.3, theta: 0.25, dist: 7 * KD }); bodyKey = ''; }
        else { orbit.dist = 9 * KD; }
      }
      const NOTE = { couple: '🌀 우력(얼음 위 막대)은 힘을 가하는 실험이라 2D 화면에서 해요. 위의 [▦ 2D]를 눌러 보세요.', plank: '🌉 널빤지 다리(받침 힘 N_A, N_B 예측)는 2D 화면에서 해요. 위의 [▦ 2D]를 눌러 보세요.', crane: '🏗️ 크레인(평형추)은 2D 화면에서 해요. 위의 [▦ 2D]를 눌러 보세요.' };
      /* ▶ 재생: 스패너로 지금 값 그대로 '힘 주기 → 돌리기 → 결과 → 되돌리기'를 되풀이해요 */
      pl = controls.player({ duration: 7, loop: true, autoplay: false, label: '돌려 보기',
        phases: [[0, '힘 주기'], [0.2, '돌리는 중'], [0.65, '결과'], [0.82, '되돌리기']],
        onFrame(p) { demo.p = p; demo.on = p > 0 || !!(pl && pl.playing); } });
      pl.row = ctx.renderer.domElement.parentNode.parentNode.querySelector('.v3-player');
      return {
        update(dt) {
          const S = sim() && sim().S; if (!S) return;
          showMode(S.mode);
          if (S.sp && S.sp.st !== 'idle' && pl.playing) pl.pause();
          if (!pl.playing && pl.p === 0) demo.on = false;
          if (S.mode === 'spanner') spanner(dt);
          else if (S.mode === 'seesaw') seesaw();
          else if (S.mode === 'tilt' || S.mode === 'load') topple(S.mode);
          else info(NOTE[S.mode] || '');
        },
        sync() {},
      };
    },
  });
})();
