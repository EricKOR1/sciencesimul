/* he-structures-cycle · 3D 지질 구조 블록 다이어그램
   지층(여러 색 줄무늬)에 힘이 작용하면 습곡, 정단층, 역단층, 주향 이동 단층이 생겨요. 힘의 정도(슬라이더)를 올려 지층이 변하는 모습을 입체로 봐요.
   그 밖에 용암이 식으며 생기는 주상 절리, 마그마가 지층을 뚫고 들어간 관입(암맥·암상)도 볼 수 있어요.
   2D와 같은 구조·같은 값: 힘의 종류(압축·인장·전단)와 암석의 성질(연성·취성)에 따라 습곡·역단층·정단층·주향 이동 단층이 만들어지고, 힘의 정도(%)는 2D 슬라이더와 서로 같이 움직여요.
   관입(A 암상·B 암맥)과 주상 절리(식는 속도)는 2D의 ▶ 버튼과 같은 장면이에요. ▶ 재생은 힘을 서서히 가해 구조가 만들어지는 모습이에요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const lerp = (a, b, t) => a + (b - a) * t;
  const XW = 3.5, ZD = 1.9, HT = 3.0, NL = 5, DIP = 55 * Math.PI / 180;
  const COLS = [0xb98a5a, 0xd9c590, 0x8d6e63, 0xe0b97a, 0x7f9a6a];
  const TYPES = [['fold', '습곡'], ['normal', '정단층'], ['reverse', '역단층'], ['strike', '주향 이동'], ['column', '주상 절리'], ['intr', '관입'], ['sheet', '판상 절리']];
  const STEP0 = ['column', 'intr', 'sheet'];   // 0단계(화성암 구조)에서 고를 수 있는 장면

  window.SciSim3D.attach({
    title: '지질 구조 3D 블록',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    levels: [0],             // 0단계(관입 · 주상절리 · 판상절리)만 3D예요. 1단계(지표 번호 ①②③과 지층 띠 읽기) · 2~3단계(카드 놓기 · 순환도 누르기)는 2D 화면에서 해요
    camera: { dist: PHONE ? 15.5 : 11, theta: 0.65, phi: 1.1, min: 5, max: 24, target: [0, 1.2, 0] },
    autoRotate: 0,
    build(ctx) {
      if (ctx.THREE.ColorManagement) ctx.THREE.ColorManagement.legacyMode = false;     // 색을 보이는 그대로(sRGB) 쓰도록 맞춰요
      const { THREE, root, label, info, controls } = ctx;
      const std = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.85, metalness: 0.0 }, o || {}));
      const grp = new THREE.Group(); root.add(grp);
      const floor = new THREE.Mesh(new THREE.CylinderGeometry(6.2, 6.2, 0.2, 64), std(0x2a3550, { roughness: 0.9 })); floor.position.y = -0.12; root.add(floor); floor.userData.v3bg = true;   // 바닥은 화면 맞춤에서 빼요
      const ext = (poly, col, d, x0) => {
        const sh = new THREE.Shape(); poly.forEach((p, i) => (i ? sh.lineTo(p[0], p[1]) : sh.moveTo(p[0], p[1]))); sh.closePath();
        const g = new THREE.ExtrudeGeometry(sh, { depth: d, bevelEnabled: false, curveSegments: 3 }); g.translate(0, 0, -d / 2);
        const m = new THREE.Mesh(g, std(col)); m.castShadow = m.receiveShadow = true; return m;
      };
      const clip = (poly, a, b, c) => { const out = []; for (let i = 0; i < poly.length; i++) { const p = poly[i], q = poly[(i + 1) % poly.length], fp = a * p[0] + b * p[1] + c, fq = a * q[0] + b * q[1] + c; if (fp >= 0) out.push(p); if ((fp >= 0) !== (fq >= 0)) { const t = fp / (fp - fq); out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]); } } return out; };
      const band = (j) => { const y0 = HT * j / NL, y1 = HT * (j + 1) / NL; return [[-XW, y0], [XW, y0], [XW, y1], [-XW, y1]]; };
      const arrow = (col, rot) => { const g = new THREE.Group(), m = std(col, { emissive: col, emissiveIntensity: 0.4, roughness: 0.4 }), s = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.1, 14), m), h = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.5, 18), m); s.position.y = 0.55; h.position.y = 1.35; g.add(s, h); g.rotation.z = rot || 0; root.add(g); return g; };
      const FA = [arrow(0xffd34d), arrow(0xffd34d), arrow(0xffd34d), arrow(0xffd34d)];

      const LB = {
        a: label('배사', [1.15, 3.6, 0], { size: 12.5 }), s: label('향사', [-1.15, 2.4, 0], { size: 12.5 }),
        fp: label('단층면', [0, 1.5, ZD], { size: 12.5, color: 'rgba(160,30,30,.92)' }), hw: label('상반', [2.0, 2.6, ZD], { size: 12 }), fw: label('하반', [-2.0, 1.2, ZD], { size: 12 }),
        gr: label('화강암체', [0, 0.9, 1.5], { size: 12, color: 'rgba(110,40,40,.92)' }), sj: label('판상절리 (지표와 나란한 틈)', [1.6, 2.3, 0], { size: 12, color: 'rgba(30,10,10,.88)' }), sf: label('', [-3.2, 3.6, ZD], { size: 12 }),
        // 암상·암맥 이름은 관찰 기록 미션의 답이라 A · B로만 표시해요
        dk: label('B', [0, 3.5, 0], { size: 12 }), sl: label('A', [-2.4, 1.6, ZD], { size: 12 }), sr: label('어긋난 길', [0, 3.2, 0], { size: 12 }), ct: label('주상 절리', [0, 3.4, 0], { size: 12 }),
      };
      Object.values(LB).forEach((l) => l.show(false));

      let type = 'fold', f = 0, fT = 0, play = false, cur = null, curF = -1;
      let hwG = null, fwG = null, halfA = null, halfB = null, foldMeshes = [], cols = [], dikeM = null, sillM = null, colSpeed = 2;
      const clear = () => { while (grp.children.length) { const c = grp.children.pop(); c.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); } hwG = fwG = halfA = halfB = dikeM = null; foldMeshes = []; cols = []; grp.position.set(0, 0, 0); };

      function buildType(tp) {
        clear(); type = tp; cur = tp;
        if (tp === 'normal' || tp === 'reverse') {
          const a = Math.sin(DIP), b = Math.cos(DIP), c = -(a * 0 + 0) , nx = Math.sin(DIP), ny = Math.cos(DIP);
          // 단층면: 지름 (0, HT/2)을 지나고 오른쪽 아래로 DIP만큼 기운 면.  g = ny*(y - HT/2) + nx*x > 0 → 상반(오른쪽 위)
          hwG = new THREE.Group(); fwG = new THREE.Group(); grp.add(fwG, hwG);
          for (let j = 0; j < NL; j++) { const bnd = band(j), cA = -ny * HT / 2; const hw = clip(bnd, nx, ny, cA), fw = clip(bnd, -nx, -ny, -cA); if (hw.length > 2) hwG.add(ext(hw, COLS[j], ZD * 2)); if (fw.length > 2) fwG.add(ext(fw, COLS[j], ZD * 2)); }
          const pl = new THREE.Mesh(new THREE.PlaneGeometry(HT / Math.sin(DIP) + 0.4, ZD * 2 + 0.02), new THREE.MeshBasicMaterial({ color: 0xff6666, transparent: true, opacity: 0.0, side: THREE.DoubleSide })); grp.add(pl);
        } else if (tp === 'strike') {
          halfA = new THREE.Group(); halfB = new THREE.Group(); grp.add(halfA, halfB);
          for (let j = 0; j < NL; j++) [[halfA, 1], [halfB, -1]].forEach(([g, s]) => { const m = new THREE.Mesh(new THREE.BoxGeometry(XW * 2, HT / NL, ZD), std(COLS[j])); m.position.set(0, HT * (j + 0.5) / NL, s * ZD / 2); g.add(m); });
          [[halfA, 1], [halfB, -1]].forEach(([g, s]) => { const r = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.03, ZD), std(0xffe066, { emissive: 0xaa8800, emissiveIntensity: 0.4 })); r.position.set(0, HT + 0.02, s * ZD / 2); g.add(r); });
        } else if (tp === 'column') {
          let sd = 4; const rnd = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
          const rr = [0.55, 0.4, 0.28][colSpeed - 1], dx = rr * 1.732, dz = rr * 1.5;
          for (let iz = -4; iz <= 4; iz++) for (let ix = -4; ix <= 4; ix++) {
            const x = ix * dx + (iz % 2 ? dx / 2 : 0), z = iz * dz; if (Math.hypot(x, z) > 3.0) continue;
            const h = 2.3 + rnd() * 0.5 + (1 - Math.hypot(x, z) / 3) * 0.35, m = new THREE.Mesh(new THREE.CylinderGeometry(rr, rr, h, 6), std(0x5b6575, { roughness: 0.75, metalness: 0.08 })); m.rotation.y = Math.PI / 6; m.position.set(x, h / 2, z); m.castShadow = m.receiveShadow = true; grp.add(m); cols.push(m);
          }
        } else if (tp === 'sheet') {
          /* 판상절리: 화강암체(반쪽을 잘라 단면이 보여요) 위를 덮은 지층이 깎일수록 압력이 줄어 지표와 나란하게 갈라져요 (2D와 같은 깎인 두께 S.sheet.e) */
          const gm = std(0xd9a6a0, { roughness: 0.75, side: THREE.DoubleSide });
          shShells = [0, 1, 2, 3, 4].map((i) => { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 16, 0, Math.PI, 0, Math.PI / 2), gm); m.userData.s = 1 - i * 0.13; grp.add(m); return m; });
          shLines = [1, 2, 3, 4].map((i) => { const s = 1 - i * 0.13 + 0.004, pts = []; for (let k = 0; k <= 40; k++) { const a = Math.PI * k / 40; pts.push(new THREE.Vector3(Math.cos(a) * SHR[0] * s, Math.sin(a) * SHR[1] * s, -0.02)); } const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.03, 6, false), new THREE.MeshBasicMaterial({ color: 0x2a0d0d, transparent: true, opacity: 0 })); grp.add(m); return m; });
          shSlabs = [0, 1, 2, 3, 4, 5, 6].map((j) => { const m = new THREE.Mesh(new THREE.BoxGeometry(XW * 2, 1, ZD * 2), std(COLS[j % NL], { transparent: true, opacity: 0.42, depthWrite: false })); m.userData.y0 = j * SHK * 5 / 7 * 1.4; grp.add(m); return m; });
          shGrass = new THREE.Mesh(new THREE.BoxGeometry(XW * 2, 0.06, ZD * 2), std(0x5b8f4a)); grp.add(shGrass);
        } else if (tp === 'intr') {
          for (let j = 0; j < NL; j++) { const m = new THREE.Mesh(new THREE.BoxGeometry(XW * 2, HT / NL, ZD * 2), std(COLS[j])); m.position.y = HT * (j + 0.5) / NL; grp.add(m); }
          const mg = std(0xb23a3a, { roughness: 0.6, emissive: 0x4a0f0f, emissiveIntensity: 0.4 });
          dikeM = new THREE.Mesh(new THREE.BoxGeometry(0.42, HT + 0.02, ZD * 2 + 0.02), mg); dikeM.position.set(1.4, HT / 2, 0); grp.add(dikeM);
          sillM = new THREE.Mesh(new THREE.BoxGeometry(XW + 1.4 - 0.2, 0.22, ZD * 2 + 0.02), mg); sillM.position.set(-XW / 2 - 0.1 + 0.5, HT * 2 / NL + 0.0, 0); grp.add(sillM);
        }
        applyF(true);
      }
      /* 습곡: 지층 경계를 사인 곡선으로 휘어요 */
      function buildFold(fv) {
        foldMeshes.forEach((m) => { grp.remove(m); m.geometry.dispose(); }); foldMeshes = [];
        const A = 0.62 * fv, K = (2 * Math.PI) / 4.6, sh = 1 - 0.13 * fv, N = 56;
        const yb = (x, y0) => y0 + A * Math.sin(K * x) * (0.6 + 0.4 * y0 / HT);
        for (let j = 0; j < NL; j++) {
          const y0 = HT * j / NL, y1 = HT * (j + 1) / NL, poly = [];
          for (let i = 0; i <= N; i++) { const x = -XW + 2 * XW * i / N; poly.push([x * sh, yb(x, y1)]); }
          for (let i = N; i >= 0; i--) { const x = -XW + 2 * XW * i / N; poly.push([x * sh, j === 0 ? 0 : yb(x, y0)]); }
          const m = ext(poly, COLS[j], ZD * 2); grp.add(m); foldMeshes.push(m);
        }
        const xa = 1.15 * sh, xs = -1.15 * sh; LB.a.obj = [xa, yb(1.15, HT) + 0.45, 0]; LB.s.obj = [xs, yb(-1.15, HT) + 0.45, 0];
      }
      /* 판상절리 장면 크기: 화강암체 반지름(가로 · 높이) · 1 km당 높이 */
      const SHR = [2.4, 2.0], SHK = 0.3, SH_TOP0 = SHR[1] + 5 * SHK;
      let shShells = [], shLines = [], shSlabs = [], shGrass = null;
      function applySheet(e) {
        Object.values(LB).forEach((l) => l.show(false));
        const surf = SH_TOP0 - e * SHK, open = Math.max(0, Math.min(1, (e - 3.6) / 2.4)), op = open * open * (3 - 2 * open);
        shShells.forEach((m, i) => { const s = m.userData.s * (1 + op * 0.02 * i); m.scale.set(SHR[0] * s, SHR[1] * s, 1.5 * s); m.position.y = op * 0.05 * (4 - i); m.rotation.y = Math.PI; m.visible = i === 0 || op > 0.02; });   // 잘린 단면이 앞쪽(보는 쪽)을 향해요
        shLines.forEach((m, i) => { m.material.opacity = Math.max(0, Math.min(1, op * 1.3 - i * 0.13)); m.visible = m.material.opacity > 0.02; m.position.y = op * 0.05 * (3 - i); m.rotation.y = Math.PI; });
        const slabH = SH_TOP0 / 7; shSlabs.forEach((m, j) => { const y0 = j * slabH, h = Math.max(0, Math.min(slabH, surf - y0)); m.visible = h > 0.005; if (m.visible) { m.scale.y = h; m.position.y = y0 + h / 2; } });
        if (shGrass) { shGrass.visible = e < 5; shGrass.position.y = surf + 0.03; }
        LB.gr.show(true); LB.sj.show(op > 0.3); LB.sf.show(true); LB.sf.obj = [-XW - 0.2, surf + 0.25, ZD]; LB.sf.set('지금 지표 · 깎인 두께 ' + e.toFixed(1) + ' km');
        info('<b>판상절리</b>: 땅속 깊은 곳에서 식은 <b>화강암체</b> 위를 지층이 덮고 있어요.<br>깎여 나간 위 지층 <b>' + e.toFixed(1) + ' km</b> · 화강암 위에 남은 지층 <b>' + Math.max(0, 5 - e).toFixed(1) + ' km</b>' + (op > 0.3 ? '<br>화강암 속에 <b>지표와 나란한 틈</b>이 생겼어요.' : ''));
      }
      function applyF(force) {
        if (type === 'sheet') { applySheet(f); return; }
        const v = f, off = v * 1.15;
        if (type === 'fold') { if (force || Math.abs(v - curF) > 0.003) { buildFold(v); curF = v; } }
        else if (type === 'normal' || type === 'reverse') { const s = type === 'normal' ? 1 : -1; hwG.position.set(Math.cos(DIP) * off * s, -Math.sin(DIP) * off * s, 0); }
        else if (type === 'strike') { halfA.position.x = -off * 0.5; halfB.position.x = off * 0.5; }
        else if (type === 'column') { cols.forEach((m) => { m.scale.set(1 - 0.06 * (1 - v), 1, 1 - 0.06 * (1 - v)); m.material.emissive.setHex(0xff5a14); m.material.emissiveIntensity = (1 - v) * 0.9; }); }
        else if (type === 'intr') { const I = (ctx.lesson() && ctx.lesson().S && ctx.lesson().S.ign) || { pA: 1, pB: 1 }; dikeM.scale.set(1, Math.max(0.001, I.pB), 1); dikeM.position.y = HT * I.pB / 2; dikeM.visible = I.pB > 0.01; sillM.scale.set(Math.max(0.001, I.pA), 1, 1); sillM.position.x = -3.7 + 4.7 * I.pA / 2; sillM.visible = I.pA > 0.01; }
        /* 힘 화살표 */
        const comp = type === 'fold' || type === 'reverse', tens = type === 'normal', shear = type === 'strike';
        FA.forEach((a, i) => { a.visible = (comp || tens || shear) && (i < 2 || shear); });
        if (comp) { const g = 0.4 + 0.5 * (1 - v); FA[0].position.set(-XW - 0.45 - g * 0.5, 1.5, 0); FA[0].rotation.z = -Math.PI / 2; FA[1].position.set(XW + 0.45 + g * 0.5, 1.5, 0); FA[1].rotation.z = Math.PI / 2; }
        if (tens) { FA[0].position.set(-XW - 1.7, 1.5, 0); FA[0].rotation.z = Math.PI / 2; FA[1].position.set(XW + 1.7, 1.5, 0); FA[1].rotation.z = -Math.PI / 2; }
        if (shear) { FA[0].position.set(-XW - 1.0, 1.5, ZD * 0.55); FA[0].rotation.z = -Math.PI / 2; FA[1].position.set(XW + 1.0, 1.5, ZD * 0.55); FA[1].rotation.z = Math.PI / 2; FA[2].position.set(-XW - 1.0, 1.5, -ZD * 0.55); FA[2].rotation.z = -Math.PI / 2; FA[3].position.set(XW + 1.0, 1.5, -ZD * 0.55); FA[3].rotation.z = Math.PI / 2; FA[0].rotation.z = Math.PI / 2; FA[1].rotation.z = -Math.PI / 2; FA[2].rotation.z = -Math.PI / 2; FA[3].rotation.z = Math.PI / 2; FA[0].position.x = -XW - 0.9 + 0; FA[1].position.x = XW + 0.9; }
        if (!shear) { FA[2].visible = FA[3].visible = false; }
        Object.values(LB).forEach((l) => l.show(false));
        if (type === 'fold') { LB.a.show(v > 0.25); LB.s.show(v > 0.25); }
        if (type === 'normal' || type === 'reverse') { LB.fp.show(true); LB.hw.show(true); LB.fw.show(true); LB.hw.obj = [2.1 + Math.cos(DIP) * off * (type === 'normal' ? 1 : -1), 2.4 - Math.sin(DIP) * off * (type === 'normal' ? 1 : -1), ZD]; LB.fp.obj = [0, HT / 2, ZD]; }
        if (type === 'strike') { LB.sr.show(true); LB.sr.obj = [0, HT + 0.45, 0]; }
        if (type === 'column') { LB.ct.show(true); LB.ct.obj = [0, 3.15, 0]; }
        if (type === 'intr') { const I = (ctx.lesson() && ctx.lesson().S && ctx.lesson().S.ign) || { pA: 1, pB: 1 }; LB.dk.show(I.pB > 0.6); LB.sl.show(I.pA > 0.6); LB.dk.obj = [1.4, HT + 0.3, 0]; LB.sl.obj = [-2.4, HT * 2 / NL + 0.35, ZD]; }
      }
      const TXT = {
        fold: '<b>습곡</b>: 옆에서 미는 힘(횡압력)을 받아 지층이 휘어요.<br>위로 볼록한 곳은 <b>배사</b>, 아래로 볼록한 곳은 <b>향사</b>예요.',
        normal: '<b>정단층</b>: 양쪽으로 당기는 힘(장력)을 받아요.<br>단층면 위쪽 <b>상반</b>이 아래로 내려가요.',
        reverse: '<b>역단층</b>: 양쪽에서 미는 힘(횡압력)을 받아요.<br>단층면 위쪽 <b>상반</b>이 위로 올라가요.',
        strike: '<b>주향 이동 단층</b>: 서로 엇갈리는 힘으로 지층이 <b>수평</b>으로 어긋나요.<br>길이 끊겨 보여요.',
        column: '<b>주상 절리</b>: 뜨거운 용암이 빠르게 식으며 줄어들어 <b>육각 기둥</b> 모양으로 갈라져요.',
        intr: '<b>관입</b>: 마그마가 지층을 뚫고 들어가 식은 암체예요.<br>지층을 가로지르는 것이 <b>암맥</b>, 층 사이에 낀 것이 <b>암상</b>이에요.',
      };
      /* 조작은 2D와 같아요: 구조를 고르면 2D 장면·힘의 종류·암석의 성질이 같이 바뀌고, 힘의 정도(%)는 2D 슬라이더와 연결돼요 */
      const L2 = () => ctx.lesson(), $q = (q) => document.querySelector(q);
      const gcEl = controls.text('').parentElement; gcEl.removeChild(gcEl.lastChild);
      const grab = (fn) => { const n = gcEl.children.length; const r = fn(); return { r, els: [].slice.call(gcEl.children, n) }; };
      const setRange = (q, v) => { const e = $q(q); if (e && +e.value !== v) { e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); } };
      const clickK = (q, k) => { const b = $q(q + ' .opt[data-k="' + k + '"]'); if (b) b.click(); };
      const FOLDY = ['fold', 'reverse', 'normal', 'strike'];
      const combo = { fold: ['comp', 'duct'], reverse: ['comp', 'brit'], normal: ['tens', 'brit'], strike: ['shear', null] };
      function to2D(v) {
        const l = L2(); if (!l || !l.setView) return;
        if (v === 'column') { l.setView('col'); return; }
        if (v === 'intr') { l.setView('ign'); return; }
        if (v === 'sheet') { l.setView('sheet'); return; }
        l.setView('fold'); clickK('#modeSeg2', combo[v][0]); if (combo[v][1]) clickK('#behSeg', combo[v][1]);
      }
      let pl = null, ready = false;
      const gS = grab(() => controls.segment('구조', TYPES.map((t) => ({ value: t[0], label: t[1] })), type, (v) => { if (pl) pl.pause(); f = fT = 0; to2D(v); setType(v); }));
      const segT = gS.r;
      const gF = grab(() => controls.range('힘의 정도', 0, 100, 1, 0, (v) => { if (pl) pl.pause(); if (FOLDY.indexOf(type) >= 0) setRange('#sF', v); }, (v) => v + '%'));
      const rngF = gF.r;
      const gP = grab(() => controls.player({
        duration: 8, loop: true, autoplay: false, label: '힘을 가해요',
        phases: [[0, '힘이 작아요'], [0.34, '구조가 자라요'], [0.67, '뚜렷해져요']],
        onFrame(p) { if (FOLDY.indexOf(type) >= 0 && ready) setRange('#sF', Math.round(p * 100)); },
      }));
      pl = gP.r; ready = true; pl.pause();
      const gB = grab(() => ({
        col: controls.button('▶ 용암 식히기', () => { const l = L2(); if (l && l.colRun) l.colRun(); }),
        a: controls.button('▶ A 관입', () => { const l = L2(); if (l && l.igRun) l.igRun('A'); }),
        b: controls.button('▶ B 관입', () => { const l = L2(); if (l && l.igRun) l.igRun('B'); }),
      }));
      function showCtl() {
        const fy = FOLDY.indexOf(type) >= 0;
        gF.els.concat(gP.els).forEach((e) => (e.style.display = fy ? '' : 'none'));
        gB.r.col.style.display = type === 'column' ? '' : 'none'; gB.r.a.style.display = gB.r.b.style.display = type === 'intr' ? '' : 'none';
      }
      function setType(v) { type = v; segT.set(v); buildType(v); showInfo(); showCtl(); }
      function showInfo() { if (type === 'sheet') { applySheet(f); return; } info(TXT[type]); }
      /* 0단계에서는 화성암 구조(주상 절리 · 관입 · 판상 절리)만 골라요 */
      function segForLevel() { gS.els.forEach((e) => { if (e.tagName !== 'BUTTON') return; const t = TYPES.find((x) => x[1] === e.textContent); if (t) e.style.display = ctx.level === 0 && STEP0.indexOf(t[0]) < 0 ? 'none' : ''; }); }
      segForLevel(); ctx.onLevel(segForLevel);

      /* 2D 장면에서 구조 읽기 */
      const rd = () => { try { const s = window.__sim; if (!s) return null; const S = s.S; if (S.view === 'col') return ['column', S.col.c, S.col.speed]; if (S.view === 'ign') return ['intr', 1, 0]; if (S.view === 'sheet') return ['sheet', S.sheet.eS != null ? S.sheet.eS : S.sheet.e, 0]; if (S.view === 'fold') { const n = s.foldName(), fs = S.fold.fS; const t = n === '습곡' ? 'fold' : n === '역단층' ? 'reverse' : n === '정단층' ? 'normal' : n === '주향 이동 단층' ? 'strike' : null; return t ? [t, fs, 0] : ['fold', 0, 0]; } } catch (e) {} return null; };
      let lastKey = null;
      const r0 = rd(); if (r0) { type = r0[0]; f = fT = r0[1]; if (r0[0] === 'column') colSpeed = r0[2] || 2; rngF.set(Math.round(f * 100)); lastKey = r0[0]; }
      setType(type);
      return {
        update(dt) {
          const r = rd();
          if (r) {
            if (r[0] === 'column' && r[2] && r[2] !== colSpeed) { colSpeed = r[2]; buildType('column'); }
            if (r[0] !== type) { lastKey = r[0]; if (r[0] === 'column') colSpeed = r[2] || colSpeed; f = fT = r[1]; setType(r[0]); }
            else if (Math.abs(r[1] - f) > 0.002 || type === 'intr') {
              f = r[1]; if (FOLDY.indexOf(type) >= 0 && !pl.playing) rngF.set(Math.round(f * 100)); if (FOLDY.indexOf(type) >= 0 && pl && !pl.playing) { ready = false; pl.set(Math.min(1, f)); ready = true; } applyF();
            }
          }
          if (type === 'intr') { dikeM.material.emissiveIntensity = 0.35 + 0.15 * Math.sin(performance.now() / 400); }
        },
        sync() {},
      };
    },
  });
})();
