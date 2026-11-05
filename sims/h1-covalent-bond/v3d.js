/* h1-covalent-bond · 3D 공유 결합 모형
   공유 전자쌍(황색)과 비공유 전자쌍(보라)을 입체로 돌려 보고, 각 원자 둘레의 전자 수가 8개(H는 2개)인지 세어 봐요.
   원자 공 아래에서 막대 하나가 '공유 전자쌍 1개'예요: 1쌍 = 단일, 2쌍 = 2중, 3쌍 = 3중 결합. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const COL = { H: 0xf1f5f9, C: 0x4b5563, N: 0x3867f4, O: 0xe23b3b, Cl: 0x22b14c };
  const RB = { H: 0.3, C: 0.42, N: 0.4, O: 0.4, Cl: 0.5 };
  const RV = { H: 0.78, C: 1.05, N: 0.98, O: 0.95, Cl: 1.1 };
  const SHARE = 0xf59e0b, LONE = 0x8b5cf6;
  const D2R = Math.PI / 180;
  const alpha3 = (deg) => Math.acos(Math.sqrt((Math.cos(deg * D2R) + 0.5) / 1.5));
  const a3 = alpha3(107), T4 = 1.09 / Math.sqrt(3);
  // 좌표 단위: Å. bonds: [원자a, 원자b, 공유 전자쌍 수]
  const MOLS = {
    H2:  { f: 'H₂', n: '수소', atoms: [['H', -0.37, 0, 0], ['H', 0.37, 0, 0]], bonds: [[0, 1, 1]], lp: [0, 0], kind: '단일 결합' },
    Cl2: { f: 'Cl₂', n: '염소', atoms: [['Cl', -0.995, 0, 0], ['Cl', 0.995, 0, 0]], bonds: [[0, 1, 1]], lp: [3, 3], kind: '단일 결합' },
    O2:  { f: 'O₂', n: '산소', atoms: [['O', -0.605, 0, 0], ['O', 0.605, 0, 0]], bonds: [[0, 1, 2]], lp: [2, 2], kind: '2중 결합' },
    N2:  { f: 'N₂', n: '질소', atoms: [['N', -0.55, 0, 0], ['N', 0.55, 0, 0]], bonds: [[0, 1, 3]], lp: [1, 1], kind: '3중 결합' },
    H2O: { f: 'H₂O', n: '물', atoms: [['O', 0, 0.2, 0], ['H', -0.76, -0.39, 0], ['H', 0.76, -0.39, 0]], bonds: [[0, 1, 1], [0, 2, 1]], lp: [2, 0, 0], kind: '단일 결합 2개' },
    CO2: { f: 'CO₂', n: '이산화 탄소', atoms: [['O', -1.16, 0, 0], ['C', 0, 0, 0], ['O', 1.16, 0, 0]], bonds: [[0, 1, 2], [1, 2, 2]], lp: [2, 0, 2], kind: '2중 결합 2개' },
    NH3: { f: 'NH₃', n: '암모니아', atoms: [['N', 0, -0.12, 0], ...[0, 1, 2].map((i) => { const p = Math.PI / 2 + i * 2 * Math.PI / 3, s = 1.01 * Math.sin(a3), c = 1.01 * Math.cos(a3); return ['H', s * Math.cos(p), -0.12 + c, s * Math.sin(p)]; })], bonds: [[0, 1, 1], [0, 2, 1], [0, 3, 1]], lp: [1, 0, 0, 0], kind: '단일 결합 3개' },
    CH4: { f: 'CH₄', n: '메테인', atoms: [['C', 0, 0, 0], ['H', T4, T4, T4], ['H', T4, -T4, -T4], ['H', -T4, T4, -T4], ['H', -T4, -T4, T4]], bonds: [[0, 1, 1], [0, 2, 1], [0, 3, 1], [0, 4, 1]], lp: [0, 0, 0, 0, 0], kind: '단일 결합 4개' },
  };
  const KEYS = ['H2', 'Cl2', 'O2', 'N2', 'H2O', 'CO2', 'NH3', 'CH4'];

  window.SciSim3D.attach({
    title: '공유 결합 3D 모형',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: 6.2, theta: 0.5, phi: 1.2, min: 3, max: 14 },
    levels: [0],
    autoRotate: 0.3,
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      let dustP = null, ghosts = [];
      let key = 'H2O', style = 'pair', showLP = true, showCnt = false;
      const g = new THREE.Group(); g.scale.setScalar(1.9); root.add(g);        // Å → 장면 단위(보기 좋게 확대)
      const fit = () => { const v = ctx.renderer.domElement, asp = Math.max(0.3, v.clientWidth / Math.max(1, v.clientHeight)); ctx.orbit.dist = (key === 'CO2' || key === 'Cl2' ? 7.5 : 6.2) * (asp < 1 ? Math.min(2, Math.pow(1 / asp, 0.75)) : 1); };
      const labs = [];
      const UP = new THREE.Vector3(0, 1, 0);
      const V = (a) => new THREE.Vector3(a[0], a[1], a[2]);
      const stickMat = new THREE.MeshStandardMaterial({ color: 0xc3ccdc, roughness: 0.3, metalness: 0.5 });
      /* 받침대: 빛나는 원판 + 눈금 고리, 떠다니는 먼지 */
      { const cv = document.createElement('canvas'); cv.width = cv.height = 512; const x = cv.getContext('2d'); const gr = x.createRadialGradient(256, 256, 10, 256, 256, 256); gr.addColorStop(0, '#2a4066'); gr.addColorStop(0.7, '#141f35'); gr.addColorStop(1, '#0a1020'); x.fillStyle = gr; x.fillRect(0, 0, 512, 512);
        x.strokeStyle = 'rgba(125,175,255,.35)'; x.lineWidth = 2; for (let r = 50; r < 256; r += 50) { x.beginPath(); x.arc(256, 256, r, 0, 7); x.stroke(); } x.lineWidth = 1; for (let a = 0; a < 16; a++) { x.beginPath(); x.moveTo(256, 256); x.lineTo(256 + Math.cos(a / 16 * 6.283) * 256, 256 + Math.sin(a / 16 * 6.283) * 256); x.stroke(); }
        const fl = new THREE.Mesh(new THREE.CircleGeometry(5.5, 64), new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(cv), roughness: 0.95, metalness: 0 })); fl.rotation.x = -Math.PI / 2; fl.position.y = -2.6; fl.receiveShadow = true; root.add(fl);
        const rim = new THREE.Mesh(new THREE.TorusGeometry(5.5, 0.04, 8, 80), new THREE.MeshBasicMaterial({ color: 0x60a5fa })); rim.rotation.x = Math.PI / 2; rim.position.y = -2.6; root.add(rim);
        const N = 80, pos = new Float32Array(N * 3); for (let i = 0; i < N; i++) { pos[i * 3] = (Math.random() - 0.5) * 16; pos[i * 3 + 1] = -2 + Math.random() * 8; pos[i * 3 + 2] = (Math.random() - 0.5) * 16; }
        const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); dustP = new THREE.Points(pg, new THREE.PointsMaterial({ color: 0xa5c8ff, size: 0.06, transparent: true, opacity: 0.5, depthWrite: false })); root.add(dustP); }
      function sphere(r, col, opa, tag) {
        return new THREE.Mesh(new THREE.SphereGeometry(r, 36, 24), new THREE.MeshPhysicalMaterial({ color: col, roughness: 0.28, clearcoat: 0.7, clearcoatRoughness: 0.2, transparent: opa < 1, opacity: opa, depthWrite: opa >= 1 }));
      }
      function orient(m, from, dir) { m.position.copy(from); m.quaternion.setFromUnitVectors(UP, dir.clone().normalize()); }
      // 전자쌍 하나: 반투명 물방울 + 전자 2개
      function pairLobe(center, dir, col, long, thick) {
        const grp = new THREE.Group();
        const body = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), new THREE.MeshStandardMaterial({ color: col, transparent: true, opacity: 0.5, roughness: 0.3, depthWrite: false, emissive: col, emissiveIntensity: 0.35 }));
        body.scale.set(thick, long, thick);
        grp.add(body);
        const side = new THREE.Vector3(1, 0, 0); if (Math.abs(dir.x) > 0.9) side.set(0, 0, 1);
        side.cross(dir).normalize().multiplyScalar(thick * 0.5);
        [1, -1].forEach((s) => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.075, 14, 10), new THREE.MeshBasicMaterial({ color: col === SHARE ? 0xffffff : 0xf3e8ff })); e.position.copy(side).multiplyScalar(s); grp.add(e); });
        orient(grp, center, dir);
        return grp;
      }
      function lpDirs(M, i) {
        const n = M.lp[i]; if (!n) return [];
        const P = V(M.atoms[i].slice(1));
        const bd = [];
        M.bonds.forEach(([a, b]) => { if (a === i) bd.push(V(M.atoms[b].slice(1)).sub(P).normalize()); else if (b === i) bd.push(V(M.atoms[a].slice(1)).sub(P).normalize()); });
        const out = [];
        if (bd.length === 1) {                       // 끝에 있는 원자: 결합 반대쪽 원뿔
          const back = bd[0].clone().negate(), ref = Math.abs(back.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(0, 0, 1);
          const u = ref.clone().cross(back).normalize(), w = back.clone().cross(u).normalize();
          const beta = n === 1 ? 0 : n === 2 ? 60 * D2R : 70.5 * D2R;
          for (let k = 0; k < n; k++) { const az = (n === 2 ? k * Math.PI : k * 2 * Math.PI / 3) + (n === 2 ? Math.PI / 2 : 0); out.push(back.clone().multiplyScalar(Math.cos(beta)).add(u.clone().multiplyScalar(Math.sin(beta) * Math.cos(az))).add(w.clone().multiplyScalar(Math.sin(beta) * Math.sin(az)))); }
        } else if (bd.length === 2) {                // 굽은 O: 결합 평면에 수직인 두 방향
          const base = bd[0].clone().add(bd[1]).negate().normalize(), nrm = bd[0].clone().cross(bd[1]).normalize(), gm = 54.75 * D2R;
          out.push(base.clone().multiplyScalar(Math.cos(gm)).add(nrm.clone().multiplyScalar(Math.sin(gm))));
          out.push(base.clone().multiplyScalar(Math.cos(gm)).sub(nrm.clone().multiplyScalar(Math.sin(gm))));
        } else {                                      // 삼각뿔 N: 결합 반대쪽
          out.push(bd.reduce((s, v) => s.add(v), new THREE.Vector3()).negate().normalize());
        }
        return out.slice(0, n);
      }
      function clearAll() { while (g.children.length) g.remove(g.children[0]); labs.forEach((l) => l.show(false)); }
      function stick(a, b, r) {
        const d = b.clone().sub(a), len = d.length();
        const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 14), stickMat);
        m.position.copy(a).add(b).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(UP, d.normalize()); return m;
      }
      let atomObjs = [], bondObjs = [];
      function build() {
        clearAll(); atomObjs = []; bondObjs = []; ghosts = [];
        const M = MOLS[key];
        const space = style === 'cloud';
        M.atoms.forEach((a, i) => {
          const s = a[0], rr = space ? RV[s] * 0.6 : RB[s] * 0.8, ag = new THREE.Group();
          ag.position.set(a[1], a[2], a[3]); ag.userData.base = ag.position.clone(); g.add(ag); atomObjs.push(ag);
          ag.add(sphere(rr, COL[s], space ? 0.45 : 1));
          const gh = new THREE.Mesh(new THREE.SphereGeometry(rr, 20, 14), new THREE.MeshBasicMaterial({ color: COL[s], transparent: true, opacity: 0.16, wireframe: true, depthWrite: false })); gh.position.copy(ag.position); g.add(gh); ghosts.push(gh);
          if (!space) { const rg = new THREE.Group(); [0, 1].forEach((k) => { const t = new THREE.Mesh(new THREE.TorusGeometry(rr + 0.14, 0.008, 6, 40), new THREE.MeshBasicMaterial({ color: 0x93c5fd, transparent: true, opacity: 0.5 })); t.rotation.x = k ? Math.PI / 2 : 0; t.rotation.y = k ? 0.6 : 0; rg.add(t); }); ag.add(rg); ag.userData.rg = rg; }
          if (!labs[i]) labs[i] = label('', ag, { color: 'rgba(245,158,11,.95)' });
          labs[i].obj = ag; labs[i].el.style.color = '#1b2333';
          labs[i].set(s); labs[i].show(true); labs[i].off = [0, rr + 0.28, 0];
          // 비공유 전자쌍은 원자를 따라다녀요
          if (showLP) lpDirs(M, i).forEach((d) => { ag.add(pairLobe(d.clone().multiplyScalar(rr + 0.28), d, LONE, 0.3, 0.16)); });
        });
        // 공유 전자쌍: 결합 가운데에 쌍마다 하나씩 (2중·3중이면 나란히)
        M.bonds.forEach(([i, j, o]) => {
          const A = V(M.atoms[i].slice(1)), B = V(M.atoms[j].slice(1)), dir = B.clone().sub(A), len = dir.length(), nd = dir.clone().normalize();
          const side = new THREE.Vector3(0, 0, 1); if (Math.abs(nd.z) > 0.9) side.set(0, 1, 0);
          side.cross(nd).normalize();
          const side2 = nd.clone().cross(side).normalize();
          const offs = o === 1 ? [[0, 0]] : o === 2 ? [[0.17, 0], [-0.17, 0]] : [[0, 0.2], [0.18, -0.12], [-0.18, -0.12]];
          const cB = A.clone().add(B).multiplyScalar(0.5), bg = new THREE.Group(), lg = new THREE.Group();
          bg.position.copy(cB); bg.userData.base = cB.clone(); g.add(bg); bg.add(lg);
          offs.forEach(([x, y]) => {
            const c = side.clone().multiplyScalar(x).add(side2.clone().multiplyScalar(y));
            lg.add(pairLobe(c, nd, SHARE, Math.min(len * 0.34, 0.62), 0.15 + (o === 1 ? 0.04 : 0)));
          });
          let st = null; if (!space) { st = stick(A.clone().sub(cB), B.clone().sub(cB), 0.035); bg.add(st); }
          bondObjs.push({ g: bg, lg, st });
        });
        form(0, 1);
        text();
        counts();
      }
      // 원자 사이 거리(s: 0이면 결합 거리)와 공유 전자쌍(a: 0~1)을 맞춰요
      function form(s, a) {
        const aa = Math.max(0.0001, Math.min(1, a));
        atomObjs.forEach((ag) => ag.position.copy(ag.userData.base).multiplyScalar(1 + s));
        ghosts.forEach((gh) => { gh.visible = s > 0.06; });
        bondObjs.forEach((b) => { b.g.position.copy(b.g.userData.base).multiplyScalar(1 + s); b.lg.scale.setScalar(aa); b.lg.visible = a > 0.02; if (b.st) { b.st.scale.set(aa, 1 + s, aa); b.st.visible = a > 0.02; } });
      }
      function perAtom(M, i) {
        let n = 0; M.bonds.forEach(([a, b, o]) => { if (a === i || b === i) n += o * 2; });
        return n + M.lp[i] * 2;
      }
      let cLabs = [];
      function counts() {
        cLabs.forEach((l) => l.show(false));
        if (!showCnt) return;
        const M = MOLS[key];
        M.atoms.forEach((a, i) => {
          if (!cLabs[i]) cLabs[i] = label('', labs[i].obj, { color: 'rgba(124,58,237,.95)' });
          cLabs[i].obj = labs[i].obj; cLabs[i].set('바깥 전자 ' + perAtom(M, i) + '개'); cLabs[i].show(true); cLabs[i].off = [0, -0.75, 0];
        });
      }
      function text() {
        const M = MOLS[key];
        const sh = M.bonds.reduce((s, b) => s + b[2], 0), lp = M.lp.reduce((s, x) => s + x, 0);
        info('<b>' + M.n + ' (' + M.f + ')</b> · ' + M.kind + '<br><span style="color:#fbbf24">황색</span> 공유 전자쌍 <b>' + sh + '쌍</b>' + (lp ? ' · <span style="color:#c4b5fd">보라</span> 비공유 전자쌍 <b>' + lp + '쌍</b>' : '') +
          '<br>' + (showCnt ? '각 원자의 바깥 전자: 수소 2개, 나머지 8개 → 비활성 기체와 같은 배치' : '공유 전자쌍 1쌍 = 결합 1개'));
      }
      const segMol = controls.segment('분자', KEYS.map((k) => ({ value: k, label: MOLS[k].f })), key, (v) => { key = v; fit(); build(); const L = window.__sim; if (L && L.S && L.S.scene === 'share' && (v === 'H2' || v === 'Cl2') && L.resetShare) { L.resetShare(v); lastSh = v; } });
      controls.segment('모형', [{ value: 'pair', label: '전자쌍' }, { value: 'cloud', label: '원자 크기' }], style, (v) => { style = v; build(); });
      const lpB = controls.button('비공유 전자쌍 ✓', () => { showLP = !showLP; lpB.classList.toggle('on', showLP); lpB.textContent = '비공유 전자쌍 ' + (showLP ? '✓' : '✕'); build(); }); lpB.classList.add('on');
      const cB = controls.button('바깥 전자 세기 ✕', () => { showCnt = !showCnt; cB.classList.toggle('on', showCnt); cB.textContent = '바깥 전자 세기 ' + (showCnt ? '✓' : '✕'); build(); });
      let demoP = 0, lastSh = null, lastMade = 0;
      const ease = (x) => x * x * (3 - 2 * x);
      const pl = controls.player({
        duration: 7, loop: true, autoplay: false, label: '결합 만들기',
        phases: [[0, '떨어진 원자'], [0.3, '가까워져요'], [0.5, '전자쌍 공유'], [0.8, '결합 완성']],
        onFrame(p) { demoP = p; if (p > 0) form(1.8 * (1 - ease(Math.min(1, p / 0.5))), ease(Math.max(0, Math.min(1, (p - 0.5) / 0.25)))); },
      });
      const KMAP = { H2O1: 'H2O', O2: 'O2', N2: 'N2', C1O2: 'CO2', H3N1: 'NH3', C1H4: 'CH4' };
      const api = {
        sync() {},
        update(dt, t) {
          if (dustP) dustP.rotation.y = t * 0.03;
          atomObjs.forEach((ag, i) => { if (ag.userData.rg) { ag.userData.rg.rotation.y = t * 0.6 + i; ag.userData.rg.rotation.x = t * 0.4; } });
          const L = window.__sim; if (!L || !L.S) return;
          // 2D → 3D: 전자쌍 공유 장면에서 고른 분자, 분자 만들기에서 완성한 분자
          if (L.S.scene === 'share' && L.SH && MOLS[L.SH.mol] && L.SH.mol !== lastSh) { lastSh = L.SH.mol; if (key !== lastSh) { key = lastSh; segMol.set(key); fit(); build(); } }
          if (L.BU && L.BU.made) { const ks = Object.keys(L.BU.made).filter((k) => L.BU.made[k]); if (ks.length !== lastMade) { const newest = ks[ks.length - 1]; lastMade = ks.length; if (L.S.scene === 'build' && KMAP[newest] && key !== KMAP[newest]) { key = KMAP[newest]; segMol.set(key); fit(); build(); } } }
          if (demoP === 0 && !pl.playing) {
            if (L.S.scene === 'share' && L.SH.mol === key) form(1.8 * (1 - L.SH.slider), L.SH.bonded ? L.SH.bondA : 0); else form(0, 1);
          }
        },
      };
      fit();
      build();
      return api;
    },
  });
})();
