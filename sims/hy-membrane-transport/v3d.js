/* hy-membrane-transport · 3D 세포막 수송 (단순 확산 · 촉진 확산 · Na⁺–K⁺ 펌프)
   2D 차시와 같은 입자(O₂ · 포도당 · Na⁺ · K⁺)와 바깥 농도(1 · 2 · 4 · 8 · 16 · 32), 운반 단백질 수(2개 · 4개)를 써요.
   - 확산: O₂는 인지질 사이로 지나가고, 포도당 · Na⁺은 이중층만으로는 못 지나가요.
   - 운반 단백질: 포도당은 운반체(모양이 바뀌며 한 개씩), Na⁺은 통로 단백질의 구멍으로 지나가요. 에너지는 쓰지 않아요.
   - Na⁺–K⁺ 펌프: Na⁺ 3개 결합 → ATP 인산화 · 모양 변화 → Na⁺ 방출 → K⁺ 2개 결합 · 인산 떨어짐 → K⁺ 방출 (▶ 재생 한 바퀴 9.4초).
   화면(확산 · 운반 단백질 · 펌프)과 입자 · 농도 · 단백질 수는 2D에서 고른 값을 그대로 따라가고, 3D에서 바꾸면 2D에도 반영돼요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const narrow = window.innerWidth < 600 || window.innerHeight > window.innerWidth * 1.1;
  const COL = { head: 0x60a5fa, tail: 0xfbbf24, o2: 0xfb7185, glc: 0xfb923c, na: 0xa855f7, k: 0xec4899, ch: 0x8b5cf6, ca: 0x14b8a6, pump: 0x14b8a6, atp: 0xfacc15 };
  const XB = 4.0, ZB = 2.4, YB = 3.7, BAND = 0.6;
  const CONC = [1, 2, 4, 8, 16, 32];
  const SPN = { o2: 'O₂', glc: '포도당', na: 'Na⁺' };
  const MODE_OF = { diff: 'diff', carrier: 'chan', pump: 'pump', cyan: 'pump', root: 'pump' };
  const PT_B = [0, 1.6, 4.0, 5.2, 7.0, 9.4], PT_T = 9.4;
  const PSTEP = ['Na⁺ 3개가 세포 안쪽에서 펌프에 결합해요.', 'ATP가 결합해 인산이 펌프에 붙고(ADP + P) 펌프의 모양이 바뀌어요.', '펌프가 세포 바깥쪽으로 열리며 Na⁺ 3개를 내보내요.', '바깥쪽의 K⁺ 2개가 결합하면 인산이 떨어져 나가요.', '펌프가 원래 모양으로 돌아오며 K⁺ 2개를 세포 안으로 들여보내요.'];
  const lerp = (a, b, t) => a + (b - a) * t, clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const smooth = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };

  window.SciSim3D.attach({
    title: '세포막 수송 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: narrow ? 11.5 : 9.5, theta: 0.3, phi: 1.36, target: [0, 0, 0], min: 5, max: 20 },
    autoRotate: 0,
    levels: [0, 1, 2],   // 4단계(큰 물질 시연 · 사례 카드 분류)는 2D 화면이에요. 1단계의 속도 기록(#dfRec)은 data-v3="keep"
    build(ctx) {
      /* 3D 화면 위 작은 판(기록표 · 카드 등): 2D 캔버스에만 그려지던 것을 3D 단계에서도 보이게 해요 */
      function v3pan(cls) {
        if (!document.getElementById('v3pan-css')) { const s = document.createElement('style'); s.id = 'v3pan-css'; s.textContent =
          '.v3pan{position:absolute;z-index:2;padding:6px 9px;border-radius:12px;background:rgba(8,12,24,.8);border:1px solid rgba(255,255,255,.16);color:#fff;font-size:12px;font-weight:700;line-height:1.35;pointer-events:none;max-width:48%}' +
          '.v3pan:empty{display:none}.v3pan.tr{right:10px;top:10px}.v3pan.bl{left:10px;bottom:10px}.v3pan .h{font-weight:900;margin-bottom:3px;font-size:12.5px}.v3pan .chip{display:inline-block;margin:1px 2px;padding:0 6px;border-radius:7px;background:rgba(255,255,255,.16);color:#eef3ff}.v3pan .chip.sel{background:#ffd34d;color:#1b2333}.v3pan.card{background:#fffdf7;color:#1b2333;border-top:5px solid var(--kc,#ffd34d);white-space:normal;max-width:min(260px,46%)}.v3pan.card .s{font-size:11.5px;font-weight:600;color:#475569}' +
          '.v3pan table{border-collapse:collapse}.v3pan th,.v3pan td{padding:1px 5px;text-align:center;white-space:nowrap}.v3pan th{color:#b9c6e4;text-align:left;font-weight:800}.v3pan td.e{color:#56658a}.v3pan .ok{color:#7ee2a8}.v3pan .hi{color:#ffd34d}' +
          '@media (max-width:599px){.v3pan{font-size:10.5px;padding:4px 6px;max-width:58%}.v3pan.tr{top:auto;bottom:30px;right:8px}.v3pan.bl{left:8px;bottom:8px;max-width:42%}.v3pan th,.v3pan td{padding:0 3px}.v3pan .h{font-size:11px}}';
          document.head.appendChild(s); }
        const el = document.createElement('div'); el.className = 'v3pan ' + (cls || 'tr'); ctx.renderer.domElement.parentElement.appendChild(el);
        let last = ''; el.put = (html) => { if (html !== last) { last = html; el.innerHTML = html; } }; return el;
      }
      const { THREE, root, label, info, controls } = ctx;
      const V = THREE.Vector3;
      if (narrow) root.rotation.z = Math.PI / 2;      // 휴대폰(세로 화면)에서는 눕혀 둔 모형을 세워서 보여 줘요
      const std = (color, o) => new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.55, metalness: 0.0 }, o || {}));
      const lesson = () => { const L = ctx.lesson(); return L && L.S ? L : null; };

      /* ---------- 상태 (2D에서 읽어 와요) ---------- */
      const st = { mode: 'diff', sp: 'o2', ci: 3, n: 2, cn: false, other: '' };
      let built = { key: '' };

      /* ---------- 인지질 이중층 (단백질 자리를 비워요) ---------- */
      const SX = 0.5, NX = 17, NZ = 11;
      const heads = new THREE.InstancedMesh(new THREE.SphereGeometry(0.2, 18, 14), std(COL.head, { roughness: 0.35 }), NX * NZ * 2);
      const tails = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.045, 0.045, 0.4, 8), std(COL.tail, { roughness: 0.5 }), NX * NZ * 4);
      root.add(heads, tails);
      let holes = [];
      const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), S1 = new V(1, 1, 1), Pp = new V();
      function buildLipids() {
        let h = 0, t = 0;
        for (let i = 0; i < NX; i++) for (let k = 0; k < NZ; k++) {
          const x = (i - (NX - 1) / 2) * SX + ((k % 2) ? SX / 2 : 0), z = (k - (NZ - 1) / 2) * 0.46;
          if (Math.abs(x) > XB + 0.2) continue;
          if (st.mode !== 'diff' && z > -0.2) continue;       // 단백질이 보이도록 앞쪽을 잘라 단면을 보여 줘요
          if (holes.some((o) => Math.hypot(x - o[0], z - o[1]) < o[2])) continue;
          for (let s = -1; s <= 1; s += 2) {
            const jx = Math.sin(i * 7.3 + k * 3.1 + s) * 0.04, jz = Math.cos(i * 5.1 + k * 2.3) * 0.04;
            M4.compose(Pp.set(x + jx, s * 0.44, z + jz), Q.identity(), S1); heads.setMatrixAt(h++, M4);
            for (const dx of [-0.07, 0.07]) { M4.compose(Pp.set(x + jx + dx, s * 0.2, z + jz), Q.identity(), S1); tails.setMatrixAt(t++, M4); }
          }
        }
        heads.count = h; tails.count = t;
        heads.instanceMatrix.needsUpdate = true; tails.instanceMatrix.needsUpdate = true;
      }

      /* ---------- 단백질 (통로 4개 · 운반체 4개 · 펌프 1개를 미리 만들어 두고 필요한 만큼 보여 줘요) ---------- */
      function ring(r0, r1, h, mat) {
        const pts = [[r0, -h], [r1, -h], [r1, h], [r0, h], [r0, -h]].map((p) => new THREE.Vector2(p[0], p[1]));
        const m = new THREE.Mesh(new THREE.LatheGeometry(pts, 40), mat); m.material.side = THREE.DoubleSide; return m;
      }
      const chMat = std(COL.ch, { roughness: 0.4 });
      const chans = [0, 1, 2, 3].map(() => {
        const g = new THREE.Group(); g.add(ring(0.2, 0.55, 0.62, chMat));
        [-1, 1].forEach((s) => { const c = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.13, 14, 40), chMat); c.rotation.x = Math.PI / 2; c.position.y = s * 0.62; g.add(c); });
        g.visible = false; root.add(g); return g;
      });
      function twoLobe(color, sx, sy, sz, gap) {
        const g = new THREE.Group(), mat = std(color, { roughness: 0.38 });
        const L = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 20), mat), R = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 20), mat);
        [L, R].forEach((m) => { m.scale.set(sx, sy, sz); g.add(m); });
        g.userData = { L, R, gap }; g.visible = false; return g;
      }
      function setLobes(g, open) {      // open: +1 바깥으로 열림, -1 안쪽으로 열림
        const u = g.userData, a = 0.34 * open;
        u.L.position.set(-u.gap, 0, 0); u.R.position.set(u.gap, 0, 0);
        u.L.rotation.z = a; u.R.rotation.z = -a;
      }
      const cars = [0, 1, 2, 3].map(() => { const g = twoLobe(COL.ca, 0.34, 0.68, 0.5, 0.3); root.add(g); setLobes(g, 1); return { g, x: 0, st: 'out', t: 0, cargo: null, idle: 2, open: 1 }; });
      const pump = twoLobe(COL.pump, 0.45, 0.78, 0.62, 0.36); root.add(pump); setLobes(pump, -1);

      /* ---------- 입자 ---------- */
      const gO2 = new THREE.SphereGeometry(0.16, 16, 12), gBig = new THREE.SphereGeometry(0.21, 18, 14);
      const parts = [];
      const kindInfo = {
        o2: { geo: gO2, mat: std(COL.o2, { roughness: 0.3, emissive: 0x331018 }), free: true },
        glc: { geo: gBig, mat: std(COL.glc, { emissive: 0x2a1405 }) },
        na: { geo: gBig, mat: std(COL.na, { emissive: 0x1a1230 }) },
      };
      const pgrp = new THREE.Group(); root.add(pgrp);
      function addP(kind, up) {
        const k = kindInfo[kind], m = new THREE.Mesh(k.geo, k.mat), p = { kind, mesh: m, v: new V(), cap: false };
        const ang = Math.random() * 6.283;
        p.v.set(Math.cos(ang), (Math.random() - 0.5) * 2, Math.sin(ang)).setLength(0.9 + Math.random() * 0.5);
        m.position.set((Math.random() * 2 - 1) * (XB - 0.3), (up ? 1 : -1) * (BAND + 0.3 + Math.random() * (YB - BAND - 0.6)), (Math.random() * 2 - 1) * (ZB - 0.3));
        pgrp.add(m); parts.push(p); return p;
      }
      function clearP() { parts.forEach((p) => pgrp.remove(p.mesh)); parts.length = 0; }

      /* ---------- Na⁺–K⁺ 펌프: 입자 · ATP ---------- */
      const naM = [0, 1, 2].map(() => { const m = new THREE.Mesh(gBig, kindInfo.na.mat); m.visible = false; root.add(m); return m; });
      const kM = [0, 1].map(() => { const m = new THREE.Mesh(gBig, std(COL.k, { emissive: 0x3a0f26 })); m.visible = false; root.add(m); return m; });
      const atpMat = std(COL.atp, { emissive: 0x7a5a00, roughness: 0.35 }), adpMat = std(0xfb923c, { emissive: 0x3a1a00, transparent: true }), piMat = std(0xf472b6, { emissive: 0x4a0f2a, transparent: true });
      const atpG = new THREE.Group(); { atpG.add(new THREE.Mesh(new THREE.SphereGeometry(0.2, 18, 14), atpMat)); for (let i = 0; i < 3; i++) { const q = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10), std(0xf472b6, { emissive: 0x4a0f2a })); q.position.set(0.28 + i * 0.2, 0, 0); atpG.add(q); } }
      atpG.visible = false; root.add(atpG);
      const adpM = new THREE.Mesh(new THREE.SphereGeometry(0.2, 18, 14), adpMat), piM = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 10), piMat);
      adpM.visible = piM.visible = false; root.add(adpM, piM);
      function pumpAt(t) {
        const f = smooth((t - 2.8) / 1.2) - smooth((t - 7.0) / 1.2), o = -1 + 2 * f;
        setLobes(pump, o);
        naM.forEach((m, k) => {
          const sx = (k - 1) * 0.7, sy = -(1.55 + (k % 2) * 0.25), bx = (k - 1) * 0.16, by0 = -0.3, by1 = 0.3, ex = (k - 1) * 0.75, ey = 1.6 + (k % 2) * 0.25;
          let x, y;
          if (t < 4.0) { const pq = smooth((t - 0.15 * k) / 1.3); x = lerp(sx, bx, pq); y = t > 2.8 ? lerp(by0, by1, f) : lerp(sy, by0, pq); }
          else { const q = smooth((t - 4.0 - 0.1 * k) / 1.1); x = lerp(bx, ex, q); y = lerp(by1, ey, q); }
          m.position.set(x, y, 0.1); m.visible = true;
        });
        kM.forEach((m, k) => {
          const sx = (k - 0.5) * 0.9, sy = 1.65 + (k % 2) * 0.2, bx = (k - 0.5) * 0.16, bt = 0.3, bb = -0.3, ix = sx, iy = -(1.65 + (k % 2) * 0.2);
          let x, y;
          if (t < 5.2) { x = sx; y = sy; }
          else if (t < 7.0) { const q = smooth((t - 5.2 - 0.1 * k) / 1.0); x = lerp(sx, bx, q); y = lerp(sy, bt, q); }
          else if (t < 8.2) { x = bx; y = lerp(bb, bt, f); }
          else { const q = smooth((t - 8.2 - 0.1 * k) / 1.1); x = lerp(bx, ix, q); y = lerp(bb, iy, q); }
          m.position.set(x, y, 0.1); m.visible = true;
        });
        // ATP → ADP + P
        atpG.visible = t < 2.5; adpM.visible = t >= 2.5 && t < 3.6; piM.visible = t >= 2.6 && t < 7.4;
        if (t < 1.6) atpG.position.set(1.6, -1.35, 0.2);
        else if (t < 2.5) { const q = smooth((t - 1.6) / 0.8); atpG.position.set(lerp(1.6, 0.75, q), lerp(-1.35, -0.85, q), 0.2); }
        if (adpM.visible) { const q = smooth((t - 2.5) / 1.1); adpM.position.set(lerp(0.75, 1.6, q), lerp(-0.85, -1.5, q), 0.2); adpMat.opacity = 1 - smooth((t - 3.0) / 0.6); }
        if (piM.visible) {
          if (t < 6.2) { piM.position.set(0.4, -0.62, 0.45); piMat.opacity = 1; }
          else { const q = smooth((t - 6.2) / 1.0); piM.position.set(lerp(0.4, 1.2, q), lerp(-0.62, -1.5, q), 0.45); piMat.opacity = 1 - smooth((t - 6.8) / 0.6); }
        }
        return f;
      }
      const stepIdx = (t) => { let s = 0; for (let i = 0; i < 5; i++) if (t >= PT_B[i]) s = i; return s; };

      /* ---------- 이름표 ---------- */
      const out = new THREE.Object3D(); out.position.set(-XB + 0.2, 3.1, 0); root.add(out);
      const inn = new THREE.Object3D(); inn.position.set(-XB + 0.2, -3.1, 0); root.add(inn);
      label('세포 밖', out, { color: '#7c5a10' }); label('세포 안', inn, { color: '#7c5a10' });
      const lp1 = new THREE.Object3D(), lp2 = new THREE.Object3D(), lpA = new THREE.Object3D(); root.add(lp1, lp2, lpA);
      const L_ch = label('통로 단백질', lp1, { color: '#5b3bb0' }), L_ca = label('운반체 단백질', lp1, { color: '#0f766e' });
      const L_pump = label('Na⁺–K⁺ 펌프', lp1, { color: '#0f766e' }), L_lip = label('인지질 이중층', lp2, { color: '#1d4ed8' });
      const L_atp = label('ATP', atpG, { color: '#92400e', offset: [0, 0.4, 0] });
      const L_na = label('Na⁺ (3개)', naM[0], { color: '#7e22ce', offset: [-0.5, -0.1, 0] }), L_k = label('K⁺ (2개)', kM[0], { color: '#be185d', offset: [0.5, 0.1, 0] });

      /* ---------- 모드별 장면 ---------- */
      const XS = { 2: [-1.2, 1.2], 4: [-2.4, -0.8, 0.8, 2.4] };
      let chanXs = [], carXs = [];
      function reset() {
        const key = [st.mode, st.sp, st.ci, st.n].join('|'); built.key = key;
        clearP();
        const nP = CONC[st.ci];
        chanXs = []; carXs = [];
        chans.forEach((g) => { g.visible = false; }); cars.forEach((c) => { c.g.visible = false; c.cargo = null; });
        pump.visible = false; naM.forEach((m) => { m.visible = false; }); kM.forEach((m) => { m.visible = false; }); atpG.visible = adpM.visible = piM.visible = false;
        holes = [];
        if (st.mode === 'diff') { for (let i = 0; i < nP; i++) addP(st.sp, true); }
        else if (st.mode === 'chan') {
          const xs = XS[st.n] || XS[2];
          xs.forEach((x, i) => {
            holes.push([x, 0, 0.62]);
            if (st.sp === 'na') { chans[i].position.set(x, 0, 0); chans[i].visible = true; chanXs.push(x); }
            else { const c = cars[i]; c.x = x; c.g.position.set(x, 0, 0); c.g.visible = true; c.st = 'out'; c.t = 0; c.idle = 1 + i * 0.7; c.open = 1; setLobes(c.g, 1); carXs.push(x); }
          });
          for (let i = 0; i < nP; i++) addP(st.sp === 'na' ? 'na' : 'glc', true);
        } else { holes.push([0, 0, 0.95]); pump.visible = true; pumpAt(ptime); }
        lp1.position.set(st.mode === 'pump' ? 0 : (XS[st.n] || XS[2])[0], 1.0, 0);
        lp2.position.set(-2.4, 0.62, 1.5);
        L_ch.show(st.mode === 'chan' && st.sp === 'na'); L_ca.show(st.mode === 'chan' && st.sp === 'glc'); L_pump.show(st.mode === 'pump'); L_lip.show(st.mode === 'diff');
        L_atp.show(st.mode === 'pump'); L_na.show(st.mode === 'pump'); L_k.show(st.mode === 'pump');
        buildLipids(); showCtl(); text();
      }

      /* ---------- 정보 ---------- */
      let infoT = 0, ptime = 0;
      function count(kind) { let a = 0, b = 0; parts.forEach((p) => { if (p.kind === kind) { if (p.mesh.position.y > 0) a++; else b++; } }); return [a, b]; }
      function text() {
        const L = lesson(); let h;
        if (st.other) h = st.other;
        else if (st.mode === 'diff') {
          const c = count(st.sp), pass = st.sp === 'o2';
          h = '<b>확산</b> · 입자 <b>' + SPN[st.sp] + '</b> · 바깥 농도 <b>' + CONC[st.ci] + '</b><br>' + (pass ? 'O₂는 작은 비극성 분자라 인지질 사이로 직접 지나가요.' : SPN[st.sp] + '은(는) 이중층만으로는 막을 지나가지 못해요.') + '<br>바깥 ' + c[0] + ' · 안 ' + c[1];
        } else if (st.mode === 'chan') {
          const c = count(st.sp === 'na' ? 'na' : 'glc'), busy = cars.filter((q) => q.g.visible && q.st !== 'out' && q.st !== 'in').length;
          h = '<b>촉진 확산</b> · ' + (st.sp === 'na' ? 'Na⁺ · <b>통로 단백질</b> ' : '포도당 · <b>운반체 단백질</b> ') + st.n + '개 · 바깥 농도 <b>' + CONC[st.ci] + '</b><br>' + (st.sp === 'na' ? '이온은 통로 단백질의 구멍으로 지나가요.' : '포도당이 결합하면 운반체의 모양이 바뀌어 반대편으로 방출돼요. 사용 중 ' + busy + '개') + '<br>에너지(ATP)는 쓰지 않고, 농도가 높은 쪽 → 낮은 쪽이에요.<br>바깥 ' + c[0] + ' · 안 ' + c[1];
        } else {
          const i = stepIdx(ptime), cyc = L && L.S.pp ? L.S.pp.cycles : 0;
          h = '<b>Na⁺–K⁺ 펌프</b> · ' + (i + 1) + '/5 단계<br>' + PSTEP[i] + '<br><span style="color:#fde68a">Na⁺ 3개 ↔ K⁺ 2개 · ATP 1개 사용 · 능동 수송 (한 회전 ' + cyc + '회)</span>' + (st.cn ? '<br><span style="color:#fca5a5">🧪 시안화물: 세포호흡이 막혀 ATP가 만들어지지 않으면 펌프가 멈춰요.</span>' : '') + (L && L.S.mode === 'root' ? '<br>🌱 뿌리털 세포막에도 이런 펌프가 있어요. 공기 · 질소 용액에서 이온 흡수량을 재어 비교해요.' : '');
        }
        info(h);
      }

      /* ---------- 2D와 주고받기: 3D에서 고르면 2D 값을 바꾸고(2D 화면 조작과 같은 함수), 2D에서 바뀌면 3D가 따라와요 ---------- */
      function setDf(f) { const L = lesson(); if (!L || !L.S.df) return; f(L.S.df); L.dfRebuild(); }
      function setCr(f) { const L = lesson(); if (!L || !L.S.cr) return; f(L.S.cr); L.crBuild(); }
      const ctlEl = document.querySelector('.v3-ctl');
      const grp = (fn) => { const n0 = ctlEl ? ctlEl.children.length : 0; fn(); return ctlEl ? Array.prototype.slice.call(ctlEl.children, n0) : []; };
      const spDf = [], spCr = [], nSeg = [], cDf = [], cCr = [];
      let segDf, segCr, segN, rngDf, rngCr;
      const gDf = grp(() => {
        segDf = controls.segment('입자', [{ value: 'o2', label: 'O₂' }, { value: 'glc', label: '포도당' }, { value: 'na', label: 'Na⁺' }], 'o2', (v) => setDf((d) => { d.sp = v; }));
        rngDf = controls.range('바깥 농도', 0, 5, 1, 3, (v) => setDf((d) => { d.ci = v; }), (v) => CONC[v]);
      });
      const gCr = grp(() => {
        segCr = controls.segment('입자', [{ value: 'glc', label: '포도당 · 운반체' }, { value: 'na', label: 'Na⁺ · 통로' }], 'glc', (v) => setCr((c) => { c.sp = v; }));
        segN = controls.segment('단백질 수', [{ value: 2, label: '2개' }, { value: 4, label: '4개' }], 2, (v) => setCr((c) => { c.n = v; }));
        rngCr = controls.range('바깥 농도', 0, 5, 1, 3, (v) => setCr((c) => { c.ci = v; }), (v) => CONC[v]);
      });
      let writing = false;
      const player = (() => { let pl; const g = grp(() => {
        pl = controls.player({
          duration: PT_T, loop: true, autoplay: false, label: '펌프 한 회전',
          phases: PT_B.slice(0, 5).map((b, i) => [b / PT_T, ['Na⁺ 결합', 'ATP · 인산화', 'Na⁺ 방출', 'K⁺ 결합', 'K⁺ 방출'][i]]),
          onFrame(p) {
            ptime = p * PT_T;
            if (st.mode === 'pump') pumpAt(ptime);
            const L = lesson(); if (L && L.S.pp && !writing && !L.S.pp.run && st.mode === 'pump') L.S.pp.t = ptime;   // 2D 펌프도 같은 순간으로
          },
        }); }); pl.els = g; return pl; })();
      function showCtl() {
        const s = (arr, on) => arr.forEach((e) => { e.style.display = on ? '' : 'none'; });
        s(gDf, st.mode === 'diff' && !st.other); s(gCr, st.mode === 'chan' && !st.other); s(player.els, st.mode === 'pump' && !st.other);
      }

      function poll() {
        const L = lesson(); if (!L) return;
        const m = L.S.mode, m2 = MODE_OF[m];
        let other = '';
        if (!m2) other = m === 'bulk' ? '<b>🫧 큰 물질 수송</b><br>단백질처럼 큰 물질은 막 단백질 대신 소낭으로 옮겨요(식세포 작용 · 음세포 작용 · 세포 외 배출).' : '<b>🗂 수송 사례 분류</b><br>단순 확산 · 촉진 확산 · 능동 수송 · 소낭 수송의 차이(방향 · 단백질 · ATP)를 떠올려요.';
        const mode = m2 || st.mode;
        let ch = false;
        if (mode !== st.mode) { st.mode = mode; ch = true; }
        if (other !== st.other) { st.other = other; ch = true; }
        if (m === 'diff') { const d = L.S.df; if (d.sp !== st.sp || d.ci !== st.ci) { st.sp = d.sp; st.ci = d.ci; ch = true; } segDf.set(d.sp); rngDf.set(d.ci); }
        if (m === 'carrier') { const c = L.S.cr; if (c.sp !== st.sp || c.ci !== st.ci || c.n !== st.n) { st.sp = c.sp; st.ci = c.ci; st.n = c.n; ch = true; } segCr.set(c.sp); segN.set(c.n); rngCr.set(c.ci); }
        const cn = m === 'cyan' && !!(L.S.cy && L.S.cy.cn); if (cn !== st.cn) { st.cn = cn; ch = true; }
        if (m !== st.m2d) { st.m2d = m; text(); }
        if (m === 'cyan' || m === 'root') { /* 펌프 화면이지만 입자 설정은 그대로 */ }
        if (ch) { if (st.mode === 'diff' && !(m === 'diff')) st.sp = 'o2'; reset(); }
        if (st.mode === 'pump' && L.S.pp) {
          if (L.S.pp.run && player.playing) player.pause();
          if (!player.playing && Math.abs(L.S.pp.t / PT_T - player.p) > 1e-4 && (L.S.pp.run || L.S.pp.t === 0 || m === 'pump')) { writing = true; player.set(clamp(L.S.pp.t / PT_T, 0, 1)); writing = false; }
        }
        if (st.cn && player.playing) player.pause();
      }

      /* ---------- 움직임 ---------- */
      function step(p, dt) {
        const m = p.mesh, pos = m.position;
        if (p.cap) return;
        p.v.x += (Math.random() - 0.5) * 7 * dt; p.v.y += (Math.random() - 0.5) * 7 * dt; p.v.z += (Math.random() - 0.5) * 7 * dt;
        p.v.setLength(Math.max(0.7, Math.min(1.5, p.v.length())));
        let x = pos.x + p.v.x * dt, y = pos.y + p.v.y * dt, z = pos.z + p.v.z * dt;
        if (x > XB) { x = XB; p.v.x *= -1; } else if (x < -XB) { x = -XB; p.v.x *= -1; }
        if (z > ZB) { z = ZB; p.v.z *= -1; } else if (z < -ZB) { z = -ZB; p.v.z *= -1; }
        if (y > YB) { y = YB; p.v.y *= -1; } else if (y < -YB) { y = -YB; p.v.y *= -1; }
        if (!kindInfo[p.kind].free) {
          const inBand = Math.abs(pos.y) < BAND;
          let near = null; chanXs.forEach((cx) => { if (Math.hypot(x - cx, z) < 0.22 && (!near || Math.abs(x - cx) < Math.abs(x - near))) near = cx; });
          if (!inBand && Math.abs(y) < BAND) {
            if (!(st.mode === 'chan' && p.kind === 'na' && near != null)) { y = pos.y; p.v.y *= -1; }
          } else if (inBand) {           // 통로 안에서는 가운데로 모아요
            let cx = near; if (cx == null) { cx = chanXs[0]; chanXs.forEach((q) => { if (Math.abs(pos.x - q) < Math.abs(pos.x - cx)) cx = q; }); }
            if (cx == null) cx = 0;
            x = cx + clamp(x - cx, -0.18, 0.18); z = clamp(z, -0.18, 0.18);
            p.v.x *= 0.5; p.v.z *= 0.5;
          }
        }
        pos.set(x, y, z);
      }
      const tmp = new V();
      function toward(p, tx, ty, tz, k) { p.mesh.position.lerp(tmp.set(tx, ty, tz), k); }
      function carrierStep(c, dt) {
        const cx = c.x;
        c.t += dt;
        if (c.st === 'out' || c.st === 'in') {
          const up = c.st === 'out'; c.open = up ? 1 : -1;
          if (!c.cargo) {
            for (const p of parts) {
              if (p.kind !== 'glc' || p.cap) continue;
              const pp = p.mesh.position;
              if ((up ? pp.y > 0.45 && pp.y < 1.4 : pp.y < -0.45 && pp.y > -1.4) && Math.hypot(pp.x - cx, pp.z) < 0.55) { c.cargo = p; p.cap = true; c.st = up ? 'grab-out' : 'grab-in'; c.t = 0; break; }
            }
            c.idle -= dt;
            if (!c.cargo && c.idle <= 0) { c.st = up ? 'flip-in' : 'flip-out'; c.t = 0; c.idle = 2 + Math.random() * 2; }
          }
        } else if (c.st === 'grab-out' || c.st === 'grab-in') {
          const up = c.st === 'grab-out', k = Math.min(1, c.t / 0.35);
          toward(c.cargo, cx, up ? 0.3 : -0.3, 0, 0.25);
          if (k >= 1) { c.st = up ? 'flip-in-load' : 'flip-out-load'; c.t = 0; }
        } else {
          const toIn = c.st.indexOf('in') >= 0, k = Math.min(1, c.t / 0.9), e = k * k * (3 - 2 * k);
          c.open = toIn ? 1 - 2 * e : -1 + 2 * e;
          if (c.cargo) c.cargo.mesh.position.set(cx, 0.3 * c.open, 0);
          if (k >= 1) {
            if (c.cargo) { c.cargo.cap = false; c.cargo.v.set((Math.random() - 0.5) * 0.4, (toIn ? -1 : 1) * 1.3, (Math.random() - 0.5) * 0.4); c.cargo.mesh.position.y += (toIn ? -1 : 1) * 0.35; c.cargo = null; }
            c.st = toIn ? 'in' : 'out'; c.idle = 1.5 + Math.random() * 1.5;
          }
        }
        setLobes(c.g, c.open);
      }

      poll(); reset();
      /* 2D 실험판의 기록표 · 속도 막대 · 흡수량을 3D 화면 오른쪽 위에 보여 줘요 (2D와 같은 값) */
      const panR = v3pan('tr');
      function drawPan() {
        const L = ctx.lesson(); if (!L || !L.S) { panR.put(''); return; }
        const m = L.S.mode, CO = L.CONC || [1, 2, 4, 8, 16, 32];
        const bar = (t, v, mx, col, tx) => '<tr><th>' + t + '</th><td style="text-align:left"><span style="display:inline-block;height:9px;border-radius:5px;vertical-align:middle;background:' + col + ';width:' + Math.round(70 * Math.max(0, Math.min(1, v / mx))) + 'px"></span></td><td>' + tx + '</td></tr>';
        if (m === 'diff') {
          const r = L.S.df.rec; if (!r.length) { panR.put('<div class="h">📝 기록한 속도 (O₂)</div><div style="color:#b9c6e4">아직 없어요</div>'); return; }
          panR.put('<div class="h">📝 기록한 속도 (O₂) ' + r.length + '개</div><table><tr><th>바깥 농도</th>' + r.map((q) => '<td>' + q.c + '</td>').join('') + '</tr><tr><th>속도</th>' + r.map((q) => '<td class="hi">' + q.r + '</td>').join('') + '</tr></table>');
        } else if (m === 'carrier') {
          const C0 = L.S.cr, R = C0.rec[C0.sp], row = (n) => '<tr><th>' + (C0.sp === 'glc' ? '운반체' : '통로') + ' ' + n + '개</th>' + CO.map((c) => (R[n][c] != null ? '<td class="hi">' + R[n][c] + '</td>' : '<td class="e">·</td>')).join('') + '</tr>';
          panR.put('<div class="h">📝 기록한 속도 (' + (C0.sp === 'glc' ? '포도당' : 'Na⁺') + ')</div><table><tr><th>바깥 농도</th>' + CO.map((c) => '<td>' + c + '</td>').join('') + '</tr>' + row(2) + row(4) + '</table>');
        } else if (m === 'cyan' && L.cyRate) {
          const r = L.cyRate(), Y = L.S.cy;
          panR.put('<table>' + bar('촉진 확산 속도', r.fac, 26, '#14b8a6', r.fac) + bar('능동 수송 속도', r.act, 26, '#0f766e', r.act) + bar('ATP', Y.atp * 100, 100, Y.atp > 0.5 ? '#22c55e' : '#ef4444', Math.round(Y.atp * 100) + ' %') + '</table>');
        } else if (m === 'root') {
          const R = L.S.rt, V = L.RT_V || {}, mx = Math.max(1, V.air || 1, V.n2 || 1), cur = (c) => (R.run && R.cond === c ? (V[c] || 0) * R.prog : R.val[c]);
          panR.put('<div class="h">🌱 이온 흡수량 (' + (R.cond === 'air' ? '공기' : '질소') + ' 용액' + (R.run ? ' · 측정 중' : '') + ')</div><table>' + bar('공기', cur('air') || 0, mx, '#38bdf8', R.val.air != null ? Math.round(R.val.air) : (R.run && R.cond === 'air' ? '…' : '—')) + bar('질소', cur('n2') || 0, mx, '#a78bfa', R.val.n2 != null ? Math.round(R.val.n2) : (R.run && R.cond === 'n2' ? '…' : '—')) + '</table>');
        } else panR.put('');
      }
      return {
        update(dt) {
          dt = Math.min(dt, 0.05) * (window.__v3dTS || 1);
          poll(); drawPan();
          parts.forEach((p) => step(p, dt));
          if (st.mode === 'chan') cars.forEach((c) => { if (c.g.visible) carrierStep(c, dt); });
          infoT += dt; if (infoT > 0.5) { infoT = 0; text(); }
        },
        sync() { poll(); text(); },
      };
    },
  });
})();
