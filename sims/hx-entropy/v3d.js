/* hx-entropy · 3D 기체의 확산과 엔트로피
   1단계 '저절로 일어나는 변화'(기체가 양쪽으로 퍼짐)와 2단계 '배열의 수와 엔트로피'(두 칸 용기, 입자 4 · 10 · 20개)에서 열려요.
   - 1단계: 2D에서 '기체가 양쪽으로 퍼짐' 장면을 재생하면 칸막이가 열리고 입자가 퍼져요. 3D 단추로도 열고 닫을 수 있어요.
   - 2단계: 2D의 입자 수 N · '한 번 섞기'로 만든 배열(보라 = 왼쪽 칸, 주황 = 오른쪽 칸)을 그대로 입체로 보여 줘요.
   입자가 양쪽에 고르게 있는 배열이 훨씬 많아서(경우의 수↑) 엔트로피가 커지는 방향으로 일이 일어나요.
   1단계의 다른 장면(잉크 · 방 · 뜨거운 물과 찬물)과 3단계(증가 조건 5가지)도 2D와 같은 값으로 따라가요. 4단계(부호 분류 카드)는 2D에서 해요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const LX = 3.4, LY = 1.7, LZ = 1.7, MAXN = 120, RAD = 0.17;

  window.SciSim3D.attach({
    title: '확산과 엔트로피 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: PHONE ? 14 : 10, theta: 0.45, phi: 1.15, min: 6, max: 24 },
    autoRotate: 0.12,
    levels: [0, 1, 2],
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const V3 = THREE.Vector3;
      let N = 20, open = false, plate = 0, wasPlay = false, lastMode = '';      // plate: 0(닫힘) → 1(완전히 열림)
      const box = new THREE.Mesh(new THREE.BoxGeometry(LX * 2, LY * 2, LZ * 2), new THREE.MeshStandardMaterial({ color: 0xbfe3ff, transparent: true, opacity: 0.12, roughness: 0.1, side: THREE.DoubleSide, depthWrite: false })); root.add(box);
      root.add(new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(LX * 2, LY * 2, LZ * 2)), new THREE.LineBasicMaterial({ color: 0x9fc8ee, transparent: true, opacity: 0.8 })));
      const base = new THREE.Mesh(new THREE.BoxGeometry(LX * 2 + 0.5, 0.25, LZ * 2 + 0.5), new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.5, metalness: 0.4 })); base.position.y = -LY - 0.125; root.add(base);
      const wall = new THREE.Mesh(new THREE.BoxGeometry(0.1, LY * 2, LZ * 2), new THREE.MeshStandardMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.7, roughness: 0.3, depthWrite: false })); root.add(wall);
      const glow = new THREE.Mesh(new THREE.BoxGeometry(LX, LY * 2 - 0.05, LZ * 2 - 0.05), new THREE.MeshBasicMaterial({ color: 0xff9a2e, transparent: true, opacity: 0.07, depthWrite: false })); glow.position.x = -LX / 2; root.add(glow);
      const m = new THREE.InstancedMesh(new THREE.SphereGeometry(RAD, 18, 14), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3, metalness: 0.05, emissive: 0x552200, emissiveIntensity: 0.25 }), MAXN);
      m.frustumCulled = false; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); root.add(m);
      const P = [];
      function reset() {
        P.length = 0;
        for (let i = 0; i < MAXN; i++) P.push({ p: new V3(-0.3 - Math.random() * (LX - 0.6), (Math.random() * 2 - 1) * (LY - 0.3), (Math.random() * 2 - 1) * (LZ - 0.3)), d: new V3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize(), f: 0.7 + Math.random() * 0.6 });
        open = false; plate = 0; if (seg2) seg2.set('closed');
      }
      const labL = label('', [-LX / 2, LY + 0.3, 0], { color: 'rgba(30,41,59,.9)' }), labR = label('', [LX / 2, LY + 0.3, 0], { color: 'rgba(30,41,59,.9)' });
      const M = new THREE.Matrix4(), mtx = M;
      let txt = '', seg2 = null; const ORANGE = new THREE.Color(0xffa94d), PURPLE = new THREE.Color(0x8b5cf6), ORG2 = new THREE.Color(0xf59e0b), zz = Array.from({ length: MAXN }, () => (Math.random() * 2 - 1) * (LZ - 0.35));
      const sim2 = () => { try { return window.__sim; } catch (e) { return null; } };
      const binom = (n, k) => { let r = 1; for (let i = 1; i <= k; i++) r = r * (n - k + i) / i; return Math.round(r); };
      seg2 = controls.segment('칸막이', [{ value: 'closed', label: '닫기' }, { value: 'open', label: '열기' }], 'closed', (v) => { open = v === 'open'; });
      controls.button('↺ 다시 왼쪽에 모으기', () => reset());
      const note = controls.text('입자 수와 배열은 2D 화면의 조작판에서 바꿔요.');
      reset();
      /* ================= 2D의 다른 장면: 잉크 · 방 · 뜨거운 물과 찬물(관찰), 증가 조건(탐구), 상태 순서(예측) ================= */
      const probe = controls.text(''); probe.style.display = 'none'; const ctlEl = probe.parentElement;
      const oldEls = Array.prototype.filter.call(ctlEl.children, (e) => e !== probe);
      const grab = (fn) => { const n0 = ctlEl.children.length; const r = fn(); return { r, els: Array.prototype.slice.call(ctlEl.children, n0) }; };
      const gN = new THREE.Group(); root.add(gN);
      const stdMat = () => new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3, metalness: 0.05 });
      const m2 = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 18, 14), stdMat(), 96); m2.frustumCulled = false; m2.instanceMatrix.setUsage(THREE.DynamicDrawUsage); gN.add(m2);
      const bx2 = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 0.3), stdMat(), 16); bx2.frustumCulled = false; bx2.instanceMatrix.setUsage(THREE.DynamicDrawUsage); gN.add(bx2);
      const water = new THREE.Mesh(new THREE.BoxGeometry(LX * 2 - 0.06, LY * 2 - 0.06, LZ * 2 - 0.06), new THREE.MeshBasicMaterial({ color: 0x5aa8ff, transparent: true, opacity: 0.14, depthWrite: false })); gN.add(water);
      const shelf = new THREE.Mesh(new THREE.BoxGeometry(LX * 2 - 0.1, 0.1, LZ * 2 - 0.2), new THREE.MeshStandardMaterial({ color: 0xb98f5c, roughness: 0.6 })); gN.add(shelf);
      const floorB = new THREE.Mesh(new THREE.BoxGeometry(LX * 2 - 0.1, 1, 0.06), new THREE.MeshStandardMaterial({ color: 0xe8d8bc, roughness: 0.8 })); gN.add(floorB);
      const labC = label('', [0, LY + 0.35, 0], { color: 'rgba(30,41,59,.9)' }), labA = label('', [-LX / 2, -LY - 0.45, 0], { color: 'rgba(30,41,59,.9)' }), labB = label('', [LX / 2, -LY - 0.45, 0], { color: 'rgba(30,41,59,.9)' });
      const cSp = new THREE.Color(), BLUE = new THREE.Color(0x3b82f6), RED = new THREE.Color(0xef4444), mixC = (a, b, t) => cSp.copy(a).lerp(b, Math.max(0, Math.min(1, t)));
      const ITEMC = [0xe2553b, 0x3867f4, 0x14a058, 0xd97706], PUR2 = new THREE.Color(0x8b5cf6), PUR3 = new THREE.Color(0x5b2a86), GRN = new THREE.Color(0x14a058);
      const smooth = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
      let nSph = 0; const Mm = new THREE.Matrix4(), Qq = new THREE.Quaternion(), Ee = new THREE.Euler(), Pp = new V3(), Ss = new V3();
      const sph = (x, y, z, r, col) => { if (nSph >= 96) return; Mm.makeScale(r, r, r); Mm.setPosition(x, y, z); m2.setMatrixAt(nSph, Mm); m2.setColorAt(nSph, col); nSph++; };
      const flushSph = () => { for (let i = nSph; i < 96; i++) { Mm.makeScale(0.0001, 0.0001, 0.0001); m2.setMatrixAt(i, Mm); } m2.count = 96; m2.instanceMatrix.needsUpdate = true; if (m2.instanceColor) m2.instanceColor.needsUpdate = true; nSph = 0; };
      const UX = LX - 0.3, UY = LY - 0.3, KW = 0.016;
      const gx = (u) => (u * 2 - 1) * UX, gy = (v) => (1 - v * 2) * UY;
      const wobt = (i, amp, fr, t) => [Math.sin(t * fr + i * 2.3) * amp * KW, Math.cos(t * fr * 1.13 + i * 1.7) * amp * KW];
      /* 분자 (증가 조건 5: 2H₂O₂ → 2H₂O + O₂) */
      const mkMol = (atoms, bnds) => {
        const g = new THREE.Group();
        atoms.forEach((a) => { const s = new THREE.Mesh(new THREE.SphereGeometry(a[3], 20, 14), new THREE.MeshStandardMaterial({ color: a[4], roughness: 0.35 })); s.position.set(a[0], a[1], a[2] || 0); g.add(s); });
        bnds.forEach((b) => { const p = new V3(atoms[b[0]][0], atoms[b[0]][1], 0), q = new V3(atoms[b[1]][0], atoms[b[1]][1], 0), d = q.clone().sub(p), c = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, d.length(), 8), new THREE.MeshStandardMaterial({ color: 0xb4bfd2 })); c.position.copy(p).add(q).multiplyScalar(0.5); c.quaternion.setFromUnitVectors(new V3(0, 1, 0), d.normalize()); g.add(c); });
        g.visible = false; gN.add(g); return g;
      };
      const OC = 0xe23b3b, HC = 0xf4f6fa;
      const h2o2 = () => mkMol([[-0.3, 0, 0, 0.24, OC], [0.3, 0, 0, 0.24, OC], [-0.52, 0.36, 0, 0.14, HC], [0.52, -0.36, 0, 0.14, HC]], [[0, 1], [0, 2], [1, 3]]);
      const h2o = () => mkMol([[0, 0.05, 0, 0.26, OC], [-0.4, -0.32, 0, 0.14, HC], [0.4, -0.32, 0, 0.14, HC]], [[0, 1], [0, 2]]);
      const o2m = () => mkMol([[-0.3, 0, 0, 0.24, OC], [0.3, 0, 0, 0.24, OC]], [[0, 1]]);
      const MA = [h2o2(), h2o2()], MB = [h2o(), h2o()], MO = o2m();
      const lO2 = label('O₂ (기체)', [0, 0, 0], { color: 'rgba(30,41,59,.9)' }); lO2.show(false);
      function hideNew() { m2.visible = false; bx2.visible = false; water.visible = false; shelf.visible = false; floorB.visible = false; [labC, labA, labB, lO2].forEach((l) => l.show(false)); MA.concat(MB, [MO]).forEach((g) => { g.visible = false; }); }
      /* 관찰: 2D가 미리 계산한 장면(getSnap)을 같은 진행 O.p 로 보여 줘요 (거꾸로 재생도 그대로) */
      function obsScene(w, S2) {
        const O = S2.ob, k = O.sel, sn = w.getSnap(k), f = Math.max(0, Math.min(w.NS, O.p)), i0 = Math.floor(f), i1 = Math.min(w.NS, i0 + 1), fr = f - i0, a0 = sn[i0], a1 = sn[i1];
        hideNew(); m.visible = false; glow.visible = false;
        const SX = (x) => (x / 1.6 * 2 - 1) * (LX - 0.15), SY = (y) => (1 - 2 * y) * (LY - 0.1);
        water.visible = k === 0 || k === 3; water.material.color.setHex(k === 3 ? 0xbfd9ff : 0x5aa8ff);
        wall.visible = false; wall.position.set(0, 0, 0);
        if (k === 2) { m2.visible = false; bx2.visible = true; shelf.visible = true; floorB.visible = true; shelf.position.set(0, SY(0.2), 0); const y26 = SY(0.26); floorB.scale.y = y26 + LY; floorB.position.set(0, (y26 - LY) / 2, -LZ + 0.15); }
        else { m2.visible = true; }
        for (let j = 0; j < a0.length; j++) {
          const a = a0[j], b = a1[j], x = a[0] + (b[0] - a[0]) * fr, y = a[1] + (b[1] - a[1]) * fr, z = zz[j % MAXN] * (k === 2 ? 0.8 : 1);
          if (k === 2) {
            const ang = a[2] + (b[2] - a[2]) * fr; Ee.set(0, 0, -ang); Qq.setFromEuler(Ee); Pp.set(SX(x), SY(y), z); Ss.set(0.32, 0.5, 1); Mm.compose(Pp, Qq, Ss); bx2.setMatrixAt(j, Mm); bx2.setColorAt(j, cSp.setHex(ITEMC[j % 4]));
          } else if (k === 0) sph(SX(x), SY(y), z, 0.095, PUR3);
          else if (k === 1) sph(SX(x), SY(y), z, 0.14, PUR2);
          else { const sp = a[2] + (b[2] - a[2]) * fr; sph(SX(x), SY(y), z, 0.14, mixC(BLUE, RED, (sp - 0.2) / 0.9)); }
        }
        if (k === 2) { bx2.instanceMatrix.needsUpdate = true; if (bx2.instanceColor) bx2.instanceColor.needsUpdate = true; } else flushSph();
        if (k === 1 || k === 3) { const up = Math.max(0, Math.min(1, (f - 15 + 8) / 8)); wall.visible = up < 1; wall.position.set(0, up * (LY * 2 + 0.2), 0); }
        labC.show(false); labA.show(k === 1 || k === 3); labB.show(k === 1 || k === 3);
        labA.set(k === 3 ? '처음의 뜨거운 물' : '처음에 기체가 든 칸'); labB.set(k === 3 ? '처음의 찬물' : '처음에 빈 칸');
        const sc = w.SC[k];
        return '<b>' + sc.icon + ' ' + sc.name + '</b>' + (O.dir === -1 ? ' · ⏪ 거꾸로 재생' : O.dir === 1 ? ' · ▶ 재생 중' : '') + '<br>' + (O.dir === -1 || (f >= w.NS - 0.5 && O.rev[k]) ? sc.bwd : sc.fwd) + '<br>' + (O.played[k] ? '끝까지 봤어요. ⏪로 거꾸로 재생해 봐요.' : '▶ 재생해서 끝까지 봐요.');
      }
      /* 탐구: 2D의 조건(C0.sel)과 슬라이더 값(pd)을 그대로 */
      let tNow = 0;
      function condScene(w, S2, pOverride, kOverride) {
        const C0 = S2.cd, k = kOverride != null ? kOverride : C0.sel, p = pOverride != null ? pOverride : C0.pd[k], t = tNow, CP = w.CP;
        hideNew(); m.visible = false; glow.visible = false; wall.visible = false; wall.position.set(0, 0, 0);
        m2.visible = k !== 4; water.visible = k === 3;
        water.material.color.setHex(0x5aa8ff);
        let lab = '';
        if (k === 0 || k === 1) {
          const a1 = k === 0 ? 0 : 1 + 9 * p, col = k === 1 ? mixC(BLUE, RED, p) : PUR2;
          for (let i = 0; i < 20; i++) {
            const r = Math.floor(i / 5), c = i % 5, lat = [0.5 + (c - 2) * 0.13, 0.52 + (r - 1.5) * 0.16]; let u, v, ww;
            if (k === 1) { ww = wobt(i, a1 * 0.9, 9 + (i % 3), t); u = lat[0]; v = lat[1]; }
            else {
              const q = p < 0.5 ? smooth(p * 2) : 1, g = p < 0.5 ? 0 : smooth((p - 0.5) * 2);
              u = lat[0] + (CP.liq[i][0] - lat[0]) * q; v = lat[1] + (CP.liq[i][1] - lat[1]) * q; u = u + (CP.gas[i][0] - u) * g; v = v + (CP.gas[i][1] - v) * g;
              ww = wobt(i, p < 0.5 ? 1.5 + 4 * smooth(p * 2) : 5.5 + 9 * smooth((p - 0.5) * 2), 5 + (i % 4), t);
            }
            sph(Math.max(-LX + 0.2, Math.min(LX - 0.2, gx(u) + ww[0])), Math.max(-LY + 0.2, Math.min(LY - 0.2, gy(v) + ww[1])), zz[i] * 0.8, 0.17, k === 1 ? col.clone() : col);
          }
          lab = k === 0 ? (p < 0.25 ? '고체' : p < 0.75 ? '액체' : '기체') : (p < 0.3 ? '낮은 온도: 제자리 진동이 작아요' : '높은 온도: 진동이 커졌어요');
        } else if (k === 2) {
          const wu = 0.5 + 0.5 * p, wx = gx(wu) + 0.1; wall.visible = true; wall.position.set(wx, 0, 0);
          for (let i = 0; i < 16; i++) { const ww = wobt(i, 6, 3 + (i % 3), t); sph(Math.max(-LX + 0.2, Math.min(wx - 0.25, -LX + 0.25 + CP.vol[i][0] * (wx + LX - 0.5) + ww[0])), gy(CP.vol[i][1]) + ww[1], zz[i] * 0.8, 0.17, PUR2); }
          lab = '부피 ' + (1 + p).toFixed(1) + '배';
        } else if (k === 3) {
          const q = smooth(p);
          for (let i = 0; i < 12; i++) {
            const r = Math.floor(i / 4), c = i % 4, lat = [0.12 + c * 0.08, 0.62 + r * 0.1], rd = CP.diss[i], na = (r + c) % 2 === 0, ww = wobt(i, 1 + 5 * q, 5 + (i % 3), t);
            sph(Math.max(-LX + 0.2, Math.min(LX - 0.2, gx(lat[0] + (rd[0] - lat[0]) * q) + ww[0])), Math.max(-LY + 0.2, Math.min(LY - 0.2, gy(lat[1] + (rd[1] - lat[1]) * q) + ww[1])), zz[i] * 0.8, na ? 0.2 : 0.26, na ? PUR2 : GRN);
          }
          lab = '보라: Na⁺ · 초록: Cl⁻ (물속에서 퍼져요)';
        } else {
          const q = smooth(Math.max(0, Math.min(1, p * 1.3))), q2 = smooth(Math.max(0, Math.min(1, (p - 0.35) / 0.65)));
          const wb = (i, fr) => wobt(i, 3, fr, t), W2x = 2 * UX, W2y = 2 * UY;
          [[-0.2, -0.05], [0.2, 0.06]].forEach((o, i) => { const g = MA[i], ww = wb(i, 4); g.visible = q < 0.98; g.scale.setScalar(Math.max(0.01, 1 - q)); g.position.set(o[0] * W2x + ww[0], -o[1] * W2y + ww[1], 0); g.rotation.z = t * 0.5 + i; });
          [[-0.3, -0.12], [0.02, 0.13]].forEach((o, i) => { const g = MB[i], ww = wb(i + 3, 4); g.visible = q2 > 0.02; g.scale.setScalar(Math.max(0.01, q2)); g.position.set((o[0] - 0.05 * q2) * W2x + ww[0], -o[1] * W2y + ww[1], 0); g.rotation.z = -t * 0.4 + i; });
          const w3 = wb(7, 5), ox = (0.12 + 0.2 * q2) * W2x + w3[0], oy = (0.05 + 0.16 * q2) * W2y + w3[1];
          MO.visible = q2 > 0.02; MO.scale.setScalar(Math.max(0.01, q2)); MO.position.set(ox, oy, 0); MO.rotation.z = t * 0.9;
          lO2.show(q2 > 0.6); lO2.obj = [ox, oy + 0.6, 0];
          lab = p < 0.5 ? '분자 2개 (H₂O₂ 2개)' : '분자 3개 (H₂O 2개 + O₂ 1개)';
        }
        flushSph();
        labC.show(true); labC.set(lab);
        return k;
      }
      let sceneNow = '';
      const cdSegC = grab(() => controls.segment('조건', [0, 1, 2, 3, 4].map((i) => ({ value: i, label: ['상태', '온도', '부피', '용해', '분자 수'][i] })), 0, (v) => { const w = sim2(); if (w) w.cdPick(v); }));
      const cdRngC = grab(() => controls.range('변화', 0, 100, 1, 0, (v) => { const w = sim2(); if (w) w.cdSet(v); }, (v) => v + ' %'));
      const obSegC = grab(() => controls.segment('장면', [0, 1, 2, 3].map((i) => ({ value: i, label: ['🖋️ 잉크', '💨 기체', '🧺 방', '🌡️ 물'][i] })), 0, (v) => { const w = sim2(); if (w) w.setOb(v); }));
      const obPlayC = grab(() => controls.button('▶ 재생', () => { const w = sim2(); if (w) w.obPlay(); }));
      const obRevC = grab(() => controls.button('⏪ 거꾸로', () => { const w = sim2(); if (w) w.obRev(); }));
      const showEls = (g, on) => g.els.forEach((e) => { e.style.display = on ? '' : 'none'; });
      const showOld = (on) => oldEls.forEach((e) => { e.style.display = on ? '' : 'none'; });
      function applyMode(md, sel) {
        const tag = md + (md === 'obs' ? sel : '');
        if (tag === sceneNow) return; sceneNow = tag; txt = '';
        const newObs = md === 'obs' && sel !== 1, gas = md === 'obs' && sel === 1;
        showEls(obSegC, md === 'obs'); showEls(obPlayC, md === 'obs'); showEls(obRevC, md === 'obs'); showEls(cdSegC, md === 'cond'); showEls(cdRngC, md === 'cond');
        showOld(gas || md === 'model');
        if (gas || md === 'model') { hideNew(); m.visible = true; m2.visible = false; bx2.visible = false; }
        [labL, labR].forEach((l) => l.show(gas || md === 'model'));
        if (!(gas || md === 'model')) { wall.visible = false; glow.visible = false; }
      }
      /* 2단계: 2D의 배열(M.pts)을 그대로 */
      function model(dt, M) {
        const n = Math.min(MAXN, M.pts.length), tgt = 1 - (M.divider != null ? M.divider : 1);
        plate += (tgt - plate) * Math.min(1, dt * 6);
        wall.position.set(0, plate * (LY * 2 + 0.2), 0); wall.visible = plate < 0.98; glow.visible = false;
        let nl = 0;
        for (let i = 0; i < MAXN; i++) {
          if (i >= n) { mtx.makeScale(0.0001, 0.0001, 0.0001); m.setMatrixAt(i, mtx); continue; }
          const q = M.pts[i], left = q.side === 0; if (left) nl++;
          const x = (q.x - 0.5) * 2 * (LX - 0.25), y = (0.5 - q.y) * 2 * (LY - 0.25);
          mtx.makeTranslation(x + Math.sin(performance.now() / 400 + i) * 0.05, y + Math.cos(performance.now() / 330 + i * 1.7) * 0.05, zz[i]); m.setMatrixAt(i, mtx);
          m.setColorAt(i, left ? PURPLE : ORG2);
        }
        m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true;
        const k = M.last >= 0 ? M.last : n, tr = M.trials[M.k] || 0, one = M.one[M.k] || 0;
        const arr = binom(n, k), tot = Math.pow(2, n);
        const t = '<b>입자 ' + n + '개 · 두 칸 용기</b> (보라 = 왼쪽 칸, 주황 = 오른쪽 칸)<br>' + (M.last >= 0 ? '이번 배열: 왼쪽 ' + k + '개 · 오른쪽 ' + (n - k) + '개' : '처음에는 모두 왼쪽 칸에 있어요.') + '<br>이런 배열의 수: <b>' + arr + '</b>가지 (전체 ' + tot + '가지)<br>섞은 횟수 ' + tr + '번 · 모두 한쪽에 모인 횟수 ' + one + '번';
        if (t !== txt) { txt = t; info(t); labL.set('왼쪽 ' + k); labR.set('오른쪽 ' + (n - k)); }
      }
      return {
        update(dt) {
          dt = Math.min(dt, 0.05);
          const w2 = sim2(), S2 = w2 && w2.S, md = S2 ? S2.mode : '';
          if (md !== lastMode) { lastMode = md; txt = ''; if (md === 'model') seg2.set('open'); }
          tNow += dt; applyMode(md, md === 'obs' && S2.ob ? S2.ob.sel : 0);
          const setI = (h) => { if (h !== txt) { txt = h; info(h); } };
          if (md === 'obs' && S2.ob && S2.ob.sel !== 1) { setI(obsScene(w2, S2)); obSegC.r.set(S2.ob.sel); obPlayC.els.forEach((b) => { b.disabled = S2.ob.dir === 1; }); return; }
          if (md === 'obs' && S2.ob) obSegC.r.set(1);
          if (md === 'cond' && S2.cd) {
            const k = condScene(w2, S2), C0 = S2.cd, d = w2.sLevel(k, C0.pd[k]) - w2.sLevel(k, 0), sg = Math.abs(d) < 0.015 ? '처음과 같아요' : d > 0 ? '늘었어요 ▲' : '줄었어요 ▼';
            cdSegC.r.set(k); cdRngC.r.set(Math.round(C0.p[k] * 100));
            setI('<b>🔬 ' + w2.CD[k].name + '</b><br>' + w2.CD[k].note + '<br>입자가 놓일 수 있는 배열의 수: <b>' + sg + '</b>'); return;
          }
          if (md === 'pred') {
            condScene(w2, S2, (Math.sin(tNow * 0.6 - 1.57) + 1) / 2, 0);
            setI('<b>🎯 ΔS 부호 예측</b><br>카드 분류는 ▦ 2D에서 해요.<br>3D에서는 판단 기준 하나를 보여 줘요. <b>고체 &lt; 액체 &lt; 기체</b> 순으로 입자가 놓일 배열이 많아져요.'); return;
          }
          if (md === 'model' && S2.md && S2.md.pts && S2.md.pts.length) { model(dt, S2.md); return; }
          if (md === 'obs' && S2.ob) {            // 2D '기체가 양쪽으로 퍼짐' 재생에 맞춰 칸막이를 열고 닫아요
            const playing = S2.ob.sel === 1 && S2.ob.p > 0.02;
            if (playing !== wasPlay) { wasPlay = playing; if (playing) { open = true; seg2.set('open'); } else { reset(); } }
          }
          N = 20;
          plate += ((open ? 1 : 0) - plate) * Math.min(1, dt * 3.5); if (open && plate > 0.995) plate = 1;
          wall.position.set(0, plate * (LY * 2 + 0.2), 0); wall.visible = plate < 0.98;
          const gapY = -LY + plate * LY * 2 + 0.0;   // 칸막이 아래 끝 높이
          let nl = 0, nr = 0;
          for (let i = 0; i < MAXN; i++) {
            const q = P[i];
            if (i >= N) { M.makeScale(0.0001, 0.0001, 0.0001); m.setMatrixAt(i, M); continue; }
            const x0 = q.p.x;
            q.p.addScaledVector(q.d, 2.2 * q.f * dt);
            if (q.p.x > LX - RAD) { q.p.x = LX - RAD; q.d.x *= -1; } else if (q.p.x < -LX + RAD) { q.p.x = -LX + RAD; q.d.x *= -1; }
            if (q.p.y > LY - RAD) { q.p.y = LY - RAD; q.d.y *= -1; } else if (q.p.y < -LY + RAD) { q.p.y = -LY + RAD; q.d.y *= -1; }
            if (q.p.z > LZ - RAD) { q.p.z = LZ - RAD; q.d.z *= -1; } else if (q.p.z < -LZ + RAD) { q.p.z = -LZ + RAD; q.d.z *= -1; }
            // 칸막이: 아래쪽 틈(y < gapY)에서는 지나갈 수 있어요
            if (plate < 0.98 && ((x0 < 0) !== (q.p.x < 0)) && q.p.y + RAD > gapY) { q.p.x = x0; q.d.x *= -1; }
            if (q.p.x < 0) nl++; else nr++;
            M.makeTranslation(q.p.x, q.p.y, q.p.z); m.setMatrixAt(i, M); m.setColorAt(i, ORANGE);
          }
          m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true;
          glow.visible = plate < 0.5;
          const W = Math.pow(0.5, N);
          const pLeftAll = N <= 30 ? '모두 왼쪽에 있을 확률 (½)<sup>' + N + '</sup> ≈ ' + (W >= 0.001 ? (W * 100).toFixed(W > 0.1 ? 0 : 2) + ' %' : '거의 0') : '모두 왼쪽에 있을 확률은 거의 0이에요';
          const t = open ? '<b>칸막이를 열었어요</b><br>왼쪽 ' + nl + '개 · 오른쪽 ' + nr + '개<br>' + pLeftAll : '<b>칸막이가 닫혀 있어요</b><br>입자 ' + N + '개가 모두 왼쪽에 있어요.<br>칸막이를 열어 보세요.';
          if (t !== txt) { txt = t; info(t); labL.set('왼쪽 ' + nl); labR.set('오른쪽 ' + nr); }
        },
      };
    },
  });
})();
