/* h1-cell-membrane · 3D 세포막 (인지질 이중층 + 단백질 통로)
   작은 입자는 막을 직접 통과하고, 이온은 단백질 통로로만, 큰 입자는 통과하지 못해요.
   입자는 많은 쪽에서 적은 쪽으로 퍼져 나가요(확산). */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHN = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const XW = 5.2, ZW = 3.0, YH = 3.4, MT = 0.62; // 막 반너비, 막 깊이, 위아래 높이, 막 반두께
  /* 2D 실험과 같은 입자 5종 (이름 · 색 · 통과 방식) */
  const TYPES = {
    water: { n: '물 H₂O', c: 0x3b9eff, r: 0.13, pass: 'free' },
    oxygen: { n: '산소 O₂', c: 0xef4444, r: 0.15, pass: 'free' },
    ion: { n: '이온 Na⁺', c: 0xa855f7, r: 0.19, pass: 'channel' },
    starch: { n: '녹말', c: 0xeab308, r: 0.34, pass: 'none' },
    protein: { n: '단백질', c: 0xb45309, r: 0.4, pass: 'none' },
  };
  const TKEYS = ['water', 'oxygen', 'ion', 'starch', 'protein'];
  const CH = { x: -1.6, z: 0.4 };

  window.SciSim3D.attach({
    title: '세포막 입자 모형 3D',
    camera: { dist: PHN ? 17 : 12.5, theta: 0.45, phi: 1.28, target: [0, 0, 0], min: 6, max: 24 },
    levels: [1],
    autoRotate: 0.0,
    build(ctx) {
      const { THREE, root, label, info, controls, renderer, mats } = ctx;
      /* 입자 통과 시험 결과표: 2D 그림 오른쪽의 결과표를 3D 화면에도 보여 줘요 (2D 시험 결과 그대로) */
      const RES_TXT = { water: '막을 직접 통과', oxygen: '막을 직접 통과', ion: '통로로만 통과', starch: '통과 못함', protein: '통과 못함' };
      if (!document.getElementById('cm3d-tab')) { const st2 = document.createElement('style'); st2.id = 'cm3d-tab'; st2.textContent =
        '.cm-tab{position:absolute;right:10px;top:10px;padding:7px 9px;border-radius:12px;background:rgba(8,12,24,.74);color:#fff;font-size:12px;font-weight:700;pointer-events:none;min-width:170px}.cm-tab .h{font-weight:900;margin-bottom:4px}.cm-tab .r{display:flex;justify-content:space-between;gap:8px;padding:2px 5px;border-radius:7px}.cm-tab .r.cur{background:rgba(34,197,94,.28)}.cm-tab .v{color:#9aa6bd}.cm-tab .v.p{color:#86efac}.cm-tab .v.b{color:#fdba74}' +
        '@media (max-width:599px){.cm-tab{top:auto;bottom:30px;right:8px;font-size:10.5px;min-width:0;padding:4px 6px}.cm-tab .h{margin-bottom:2px}.cm-tab .r{padding:1px 3px}}';
        document.head.appendChild(st2); }
      const tabEl = document.createElement('div'); tabEl.className = 'cm-tab'; renderer.domElement.parentElement.appendChild(tabEl);
      let tabSig = '';
      function drawTab() {
        const m = window.__sim && window.__sim.S && window.__sim.S.md; if (!m) { tabEl.style.display = 'none'; return; }
        const sig = m.sel + TKEYS.map((k) => m.ts[k].res).join(','); if (sig === tabSig) return; tabSig = sig; tabEl.style.display = '';
        tabEl.innerHTML = '<div class="h">🧪 입자 통과 시험 결과</div>' + TKEYS.map((k) => { const r = m.ts[k].res; return '<div class="r' + (m.sel === k ? ' cur' : '') + '"><span>' + TYPES[k].n.split(' ')[0] + '</span><span class="v' + (r === 'pass' ? ' p' : r === 'block' ? ' b' : '') + '">' + (r === 'pass' ? '✅ ' + RES_TXT[k] : r === 'block' ? '⛔ ' + RES_TXT[k] : '? 시험해 보세요') + '</span></div>'; }).join('');
      }
      const std = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.45, metalness: 0.05 }, o || {}));
      const dm = new THREE.Object3D();
      /* 매끈한 공 (삼각형 수는 적게): 정이십면체를 나눈 뒤 법선을 둥글게 */
      const ball = (r, d) => { const g = new THREE.IcosahedronGeometry(r, d), p = g.attributes.position, n = g.attributes.normal, v = new THREE.Vector3(); for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).normalize(); n.setXYZ(i, v.x, v.y, v.z); } return g; };
      /* 인지질 꼬리: 살짝 구불구불한 가는 관 */
      const tailGeo = (() => { const h = MT * 0.94, c = new THREE.CatmullRomCurve3([[0, -h / 2], [0.03, -h / 4], [-0.03, 0], [0.025, h / 4], [0, h / 2]].map((q) => new THREE.Vector3(q[0], q[1], 0))); return new THREE.TubeGeometry(c, 6, 0.032, 5, false); })();
      
      /* ---------- 인지질 이중층 ---------- */
      const SP = 0.4, nx = Math.floor(XW * 2 / SP), nz = Math.floor(ZW * 2 / SP), lip = [];
      for (let i = 0; i < nx; i++) for (let k = 0; k < nz; k++) {
        const x = -XW + (i + 0.5) * SP + (k % 2 ? SP / 2 : 0) - SP / 4, z = -ZW + (k + 0.5) * SP;
        if (Math.hypot(x - CH.x, z - CH.z) < 0.85) continue;     // 단백질 통로 자리
        if (Math.abs(x) > XW - 0.1) continue;
        lip.push([x, z]);
      }
      const NL = lip.length * 2;
      const heads = new THREE.InstancedMesh(ball(0.175, 2), std(0xf2a516, { roughness: 0.26, metalness: 0, envMapIntensity: 1.1 }), NL), tails = new THREE.InstancedMesh(tailGeo, std(0xdcc27a, { roughness: 0.5, metalness: 0 }), NL * 2);
      heads.castShadow = true;
      root.add(heads, tails);
      const mem = new THREE.Group(); root.add(mem);
      const wob = lip.map(() => [Math.random() * 6, Math.random() * 6]);
      function layoutLipids(t) {
        let h = 0, tl = 0;
        for (let up = 0; up < 2; up++) {
          const sgn = up ? 1 : -1;
          lip.forEach((p, i) => {
            const w = wob[i], dx = Math.sin(t * 1.3 + w[0]) * 0.02, dz = Math.cos(t * 1.1 + w[1]) * 0.02, dy = Math.sin(t * 1.7 + w[0] * 2) * 0.02;
            dm.position.set(p[0] + dx, sgn * (MT + 0.02) + dy, p[1] + dz); dm.scale.setScalar(1); dm.rotation.set(0, 0, 0); dm.updateMatrix(); heads.setMatrixAt(h++, dm.matrix);
            for (let q = 0; q < 2; q++) { dm.position.set(p[0] + dx + (q ? 0.07 : -0.07), sgn * (MT / 2 + 0.0) + dy * 0.5, p[1] + dz); dm.rotation.set(0, w[q] * 3 + q * 1.7, 0); dm.updateMatrix(); tails.setMatrixAt(tl++, dm.matrix); }
          });
        }
        heads.instanceMatrix.needsUpdate = tails.instanceMatrix.needsUpdate = true;
      }
      /* ---------- 단백질 통로 ---------- */
      const prof = new THREE.SplineCurve([[0.27, -MT - 0.2], [0.42, -MT - 0.26], [0.56, -MT - 0.1], [0.64, -MT * 0.4], [0.62, MT * 0.4], [0.56, MT + 0.1], [0.42, MT + 0.26], [0.27, MT + 0.2], [0.33, MT * 0.5], [0.36, 0], [0.33, -MT * 0.5], [0.27, -MT - 0.2]].map((p) => new THREE.Vector2(p[0], p[1]))).getPoints(48);
      const chan = new THREE.Mesh(new THREE.LatheGeometry(prof, 48), mats.organic(0x5626d6, { extra: { side: THREE.DoubleSide, emissive: 0x2a1470, emissiveIntensity: 0.3, roughness: 0.38, sheen: 0.15 } })); chan.castShadow = true;
      { const pa = chan.geometry.attributes.position; for (let i = 0; i < pa.count; i++) { const x = pa.getX(i), y = pa.getY(i), z = pa.getZ(i), a = Math.atan2(z, x), k = 1 + 0.07 * Math.sin(a * 5 + y * 3.2); pa.setXYZ(i, x * k, y, z * k); } chan.geometry.computeVertexNormals(); }   // 단백질 소단위 5개가 둘러싼 울퉁불퉁한 겉면
      chan.position.set(CH.x, 0, CH.z); mem.add(chan);
      label('단백질 통로', chan, { offset: [0, MT + 0.7, 0], size: 12, color: 'rgba(110,60,220,.92)' });
      label('인지질 이중층', [XW - 1.2, 0, ZW], { size: 12, color: 'rgba(160,110,10,.92)' });
      label('세포 밖', [-XW + 1.2, YH - 0.4, 0], { size: 12 }); label('세포 안', [-XW + 0.9, -YH + 0.4, 0], { size: 12 });
      /* ---------- 입자: 2D에서 고른 입자 한 종류를 같은 개수로 ---------- */
      const MAXN = 90, pm = new THREE.InstancedMesh(ball(1, 3), std(0xffffff, { roughness: 0.22, metalness: 0, emissive: 0x444444, emissiveIntensity: 0.18, envMapIntensity: 1.2 }), MAXN); pm.castShadow = true; root.add(pm);
      const P = []; let sel = 'water', counts = [0, 0];
      const sdr = () => (Math.random() - 0.5);
      const cur = { out: 20, in: 0, key: '' };
      function reset() {
        P.length = 0; const T = TYPES[sel];
        pm.material.color.setHex(T.c); pm.material.emissive.setHex(T.c);
        const mk = (n, top) => { for (let i = 0; i < n && P.length < MAXN; i++) P.push({ x: (Math.random() * 2 - 1) * (XW - 0.3), y: (top ? 1 : -1) * (MT + 0.3 + Math.random() * (YH - MT - 0.6)), z: (Math.random() * 2 - 1) * (ZW - 0.3), vx: 0, vy: 0, vz: 0 }); };
        mk(cur.out, true); mk(cur.in, false);
      }
      function step(dt) {
        counts = [0, 0]; const T = TYPES[sel];
        for (const p of P) {
          const sp = T.pass === 'none' ? 1.3 : 2.2;
          p.vx = p.vx * 0.9 + sdr() * sp * 0.9; p.vy = p.vy * 0.9 + sdr() * sp * 0.9; p.vz = p.vz * 0.9 + sdr() * sp * 0.9;
          let nx2 = p.x + p.vx * dt, ny = p.y + p.vy * dt, nz = p.z + p.vz * dt;
          if (Math.abs(nx2) > XW - T.r) { nx2 = Math.sign(nx2) * (XW - T.r); p.vx *= -1; }
          if (Math.abs(nz) > ZW - T.r) { nz = Math.sign(nz) * (ZW - T.r); p.vz *= -1; }
          if (Math.abs(ny) > YH - T.r) { ny = Math.sign(ny) * (YH - T.r); p.vy *= -1; }
          const inM = (y) => Math.abs(y) < MT + 0.22 + T.r * 0.6;
          if (inM(ny) && !inM(p.y)) {
            const dch = Math.hypot(nx2 - CH.x, nz - CH.z);
            const ok = T.pass === 'free' || (T.pass === 'channel' && dch < 0.22);
            if (!ok) { ny = p.y; p.vy *= -1; }
          } else if (inM(ny) && inM(p.y)) {
            if (T.pass === 'channel') { const dch = Math.hypot(nx2 - CH.x, nz - CH.z); if (dch > 0.3) { const toX = CH.x - nx2, toZ = CH.z - nz; nx2 += toX * 0.2; nz += toZ * 0.2; } }
          }
          p.x = nx2; p.y = ny; p.z = nz;
          counts[p.y > 0 ? 0 : 1]++;
        }
      }
      function paint() {
        const T = TYPES[sel];
        for (let i = 0; i < MAXN; i++) { const p = P[i]; if (p) { dm.position.set(p.x, p.y, p.z); dm.scale.setScalar(T.r); } else { dm.position.set(0, -50, 0); dm.scale.setScalar(0.0001); } dm.rotation.set(0, 0, 0); dm.updateMatrix(); pm.setMatrixAt(i, dm.matrix); }
        pm.instanceMatrix.needsUpdate = true;
      }
      function updInfo() {
        const T = TYPES[sel], how = T.pass === 'free' ? '작은 입자라서 인지질 사이로 <b>바로 통과</b>해요.' : T.pass === 'channel' ? '전하를 띠어서 <b>단백질 통로</b>로만 지나가요.' : '너무 커서 막을 <b>통과하지 못해요</b>.';
        drawTab(); const tab = '';
        info('<b>' + T.n + '</b> (세포 밖 ' + counts[0] + '개 · 세포 안 ' + counts[1] + '개)<br>' + how + '<br>입자는 많은 쪽에서 적은 쪽으로 퍼져요 (확산).' + tab);
      }
      const segT = controls.segment('입자', TKEYS.map((k) => ({ value: k, label: TYPES[k].n.split(' ')[0] })), sel, (v) => { const L = window.__sim; if (L && L.selectType) L.selectType(v); sel = v; syncFrom2D(true); });
      function syncFrom2D(force) {
        const L = window.__sim, m = L && L.S && L.S.md; if (!m || !TYPES[m.sel]) return;
        const t = m.ts[m.sel], key = m.sel + '|' + t.out + '|' + t.in;
        if (!force && key === cur.key) return;
        cur.key = key; sel = m.sel; cur.out = t.out; cur.in = t.in; segT.set(sel); reset(); paint();
      }
      controls.button('↺ 다시 시작', () => { syncFrom2D(true); });
      syncFrom2D(true); layoutLipids(0); let acc = 0;
      return {
        update(dt, t) {
          syncFrom2D(false);
          step(dt); layoutLipids(t); paint();
          acc += dt; if (acc > 0.3) { acc = 0; updInfo(); }
        },
        sync() { syncFrom2D(true); },
      };
    },
  });
})();
