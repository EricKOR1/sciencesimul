/* hx-collision · 3D 유효 충돌: CO + NO₂ → CO₂ + NO  (2단계 '유효 충돌'과 같은 실험)
   CO · NO₂의 앞쪽 원자와 속력 단계(1 ~ 5)는 2D의 조작판과 같은 값이에요 (양쪽이 서로 바꿔 줘요). 충돌 에너지 = (속력 단계)², 문턱 Eₐ = 2.5².
   3D 단계: 1단계(창 속 분자 · 10 s 측정) · 2단계(유효 충돌). 3단계(도표 읽기) · 4단계(사례 카드)는 2D 단계예요. 다른 장면을 고르면 그 장면도 2D 값 그대로 보여 줘요.
   분자가 충돌한다고 모두 반응하지는 않아요. ① 알맞은 방향(CO의 C가 NO₂의 O에 닿기)과
   ② 활성화 에너지(Eₐ) 이상의 운동 에너지가 모두 있어야 O 원자가 옮겨 가며 새 물질이 돼요.
   위쪽 곡선은 반응 경로의 에너지예요 (공이 언덕을 넘어야 반응). 길이·각은 실제에 가깝게 그린 모형 스케치예요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const CPK = { C: 0x5b6472, O: 0xe23b3b, N: 0x3867f4 }, RAD = { C: 0.55, O: 0.5, N: 0.5 };
  const LV_EA = 6.25, V_NEED = 3.5;                                 // 충돌 에너지 = (속력 단계)², 문턱 = 2.5²
  const vOf = (lv) => 1.2 + 0.8 * lv;                              // 속력 단계 → 3D 속력
  const sstep = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
  const prof = (x) => -0.35 * (1 + Math.tanh(1.4 * x)) + 1.9 * Math.exp(-x * x / 0.9);   // 반응 경로 에너지 (x: -3 ~ 3)

  window.SciSim3D.attach({
    title: '유효 충돌 3D · CO + NO₂',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: PHONE ? 19 : 14.5, theta: 0.25, phi: 1.3, min: 8, max: 30, target: [PHONE ? -2.2 : -0.5, 2.0, 0] },
    autoRotate: 0,
    levels: [0, 1],
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const V3 = THREE.Vector3, UP = new V3(0, 1, 0);
      const S0 = window.__sim && window.__sim.S && window.__sim.S.lb;
      const opt = { co: S0 && S0.co === 'O' ? 'O' : 'C', no: S0 && S0.no === 'N' ? 'N' : 'O', lv: S0 && S0.lv ? S0.lv : 3 };
      const W2 = () => window.__sim || null, lb2 = () => { const w = W2(); return w && w.S ? w.S.lb : null; };
      const mat = (c, o) => { o = o || {}; if (o.metalness >= 0.7) return ctx.mats.metal(c, { roughness: o.roughness }); if (!o.transparent) return ctx.mats.plastic(c, { roughness: 0.3, extra: o }); return new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.38, metalness: 0.05 }, o)); };   // 분자 모형은 매끈한 플라스틱, 금속 촉매는 금속 재질
      const gLab = new THREE.Group(); root.add(gLab);
      const A = {};
      [['C', 'C'], ['Oc', 'O'], ['N', 'N'], ['Oa', 'O'], ['Ob', 'O']].forEach(([k, el]) => { A[k] = new THREE.Mesh(new THREE.SphereGeometry(RAD[el], 36, 26), mat(CPK[el])); gLab.add(A[k]); });
      const bonds = {};
      ['CO', 'NOa', 'NOb', 'COa'].forEach((k) => { bonds[k] = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 1, 14), mat(0xb4bfd2)); gLab.add(bonds[k]); });
      function setBond(b, p, q, vis) {
        b.visible = vis; if (!vis) return;
        const d = q.clone().sub(p), L = d.length(); b.scale.set(1, L, 1); b.position.copy(p).add(q).multiplyScalar(0.5); b.quaternion.setFromUnitVectors(UP, d.normalize());
      }
      /* 반응 경로 에너지 곡선 (위) */
      const OY = 5.3, SX = 1.25;
      const pts = []; for (let i = 0; i <= 90; i++) { const x = -3 + 6 * i / 90; pts.push(new V3(x * SX, OY + prof(x), 0)); }
      const curve = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 180, 0.07, 10, false), mat(0x8fa3c7, { emissive: 0x3b4a6b, emissiveIntensity: 0.6 })); gLab.add(curve);
      const baseline = new THREE.Mesh(new THREE.BoxGeometry(2.4 * SX * 3, 0.03, 0.03), mat(0x5c6b8a, { transparent: true, opacity: 0.6 })); baseline.position.set(-3 * SX * 0.2 - 1.5, OY, 0); gLab.add(baseline);
      const peakY = OY + prof(-0.05);
      const eaArrow = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, peakY - OY, 10), mat(0xffd34d, { emissive: 0xaa8800, emissiveIntensity: 0.5 })); eaArrow.position.set(-0.05 * SX - 0.35, (peakY + OY) / 2, 0); gLab.add(eaArrow);
      const bead = new THREE.Mesh(new THREE.SphereGeometry(0.28, 24, 18), mat(0xffd34d, { emissive: 0xffa500, emissiveIntensity: 0.6 })); gLab.add(bead);
      const lEa = label('활성화 에너지 Eₐ', [-0.05 * SX - 0.4, (peakY + OY) / 2, 0], { color: 'rgba(180,120,0,.92)' });
      const lR = label('반응물', [-3 * SX, OY + 0.2, 0], { color: 'rgba(30,41,59,.9)' }), lP = label('생성물', [3 * SX, OY - 0.7 + 0.2, 0], { color: 'rgba(30,41,59,.9)' });
      const lMsg = label('', [0, 0, 0], { color: 'rgba(30,41,59,.9)' }); lMsg.show(false);

      /* 상태 */
      const st = { phase: 'idle', xc: -8, nx: 0, tm: 0, v: vOf(3), react: false, vb: 0, rp: 0, drift: 0, beadU: -3, msg: '' };
      let xcContact = 0, climbU = -1;
      const lead = () => 0;                                   // NO₂의 맨 앞 원자(O_a 또는 N)가 x = 0에 있어요
      const base = () => {                                    // NO₂ 정지 위치 (nx 만큼 밀림)
        if (opt.no === 'O') return { N: new V3(0.70, 1.66, 0), Oa: new V3(0, 0, 0), Ob: new V3(0, 3.32, 0) };
        return { N: new V3(0, 0, 0), Oa: new V3(0.70, 1.66, 0), Ob: new V3(0.70, -1.66, 0) };
      };
      function launch() {
        st.phase = 'approach'; st.v = vOf(opt.lv); st.xc = -7.5; st.nx = 0; st.tm = 0; st.rp = 0; st.drift = 0; st.vb = 0;
        st.react = opt.co === 'C' && opt.no === 'O' && opt.lv >= 3; st.msg = '';
        xcContact = lead() - 1.9;
        // 곡선 위 공이 오르는 높이: 알맞은 방향이면 속력에 비례, 틀리면 낮게
        const e = Math.min(1, opt.lv * opt.lv / LV_EA * (opt.lv >= 3 ? 1 : 0.8)), frac = opt.co === 'C' && opt.no === 'O' ? e : Math.min(0.35, e * 0.35);
        const tgt = frac * 1.5 - 0.05; climbU = -3; for (let x = -3; x < 0; x += 0.01) { if (prof(x) >= tgt) { climbU = x; break; } climbU = x; }
        if (frac >= 1) climbU = 0;
        lMsg.show(false);
      }

      function place(dt) {
        const B = base(); const s = opt.co === 'C' ? 1 : -1;
        let C = new V3(st.xc + s * 0.85, 0, 0), Oc = new V3(st.xc - s * 0.85, 0, 0);
        let N = B.N.clone(), Oa = B.Oa.clone(), Ob = B.Ob.clone();
        N.x += st.nx; Oa.x += st.nx; Ob.x += st.nx;
        const vib = st.phase === 'idle' || st.phase === 'approach' ? 1 : 0; const t = performance.now() / 1000;
        if (vib) { N.y += Math.sin(t * 9) * 0.04; Oa.y += Math.sin(t * 8 + 1) * 0.05; Ob.y += Math.sin(t * 10 + 2) * 0.05; }
        let showNOa = true, showCOa = false, showNOb = true, showCO = true;
        if (st.phase === 'react' || st.phase === 'after') {
          const p = st.phase === 'after' ? 1 : sstep(st.rp);
          const Cc = new V3(lead() - 1.05, 0, 0).add(new V3(st.nx, 0, 0));
          const Oc0 = Cc.clone().add(new V3(-1.7, 0, 0));
          const Oa1 = Cc.clone().add(new V3(1.75, 0, 0));
          const N1 = new V3(Oa1.x + 1.6, 1.4, 0), Ob1 = new V3(Oa1.x + 2.9, 2.5, 0);
          const dco = -1.2 * st.drift, dno = 2.2 * st.drift;
          C = Cc.clone(); C.x += dco; Oc = Oc0.clone(); Oc.x += dco;
          Oa = Oa.clone().lerp(Oa1, p); Oa.x += dco * p;
          N = N.clone().lerp(N1, p); N.x += dno * p; Ob = Ob.clone().lerp(Ob1, p); Ob.x += dno * p;
          showNOa = p < 0.5; showCOa = p >= 0.5;
        }
        A.C.position.copy(C); A.Oc.position.copy(Oc); A.N.position.copy(N); A.Oa.position.copy(Oa); A.Ob.position.copy(Ob);
        setBond(bonds.CO, C, Oc, showCO); setBond(bonds.NOa, N, Oa, showNOa); setBond(bonds.NOb, N, Ob, showNOb); setBond(bonds.COa, C, Oa, showCOa);
        lMsg.obj = [(C.x + Oc.x) / 2, -0.9, 0];
        // 곡선 위의 공
        const u = st.beadU; bead.position.set(u * SX, OY + prof(u) + 0.3, 0);
      }
      function step(dt) {
        const done = (m) => { st.phase = 'done'; st.msg = m; };
        if (st.phase === 'idle') { st.beadU = -3; }
        else if (st.phase === 'approach') {
          st.xc += st.v * dt;
          const k = Math.max(0, Math.min(1, (st.xc + 7.5) / (xcContact + 7.5))); st.beadU = -3 + (climbU + 3) * sstep(k);
          if (st.xc >= xcContact) {
            st.xc = xcContact;
            if (st.react) { st.phase = 'react'; st.rp = 0; } else { st.phase = 'bounce'; st.vb = -st.v * 0.6; st.tm = 0; }
          }
        } else if (st.phase === 'react') {
          st.rp += dt / 1.6; st.beadU = climbU + (3 - climbU) * sstep(st.rp);
          if (st.rp >= 1) { st.phase = 'after'; st.drift = 0; st.tm = 0; }
        } else if (st.phase === 'after') {
          st.drift += dt; st.beadU = 3; if (st.drift > 2.6) done('유효 충돌! O가 옮겨 가서 CO₂와 NO가 생겼어요.');
        } else if (st.phase === 'bounce') {
          st.tm += dt; st.xc += st.vb * dt; st.nx += (st.tm < 0.5 ? 1.0 : 0.2) * dt;
          st.beadU = Math.max(-3, st.beadU - dt * 1.8);
          if (st.xc < -9 || st.tm > 3.2) {
            const why = !(opt.co === 'C' && opt.no === 'O') ? '방향이 맞지 않아 튕겨 나갔어요. (CO의 C가 NO₂의 O에 닿아야 해요)' : '방향은 맞지만 에너지가 Eₐ보다 작아 튕겨 나갔어요.';
            done(why);
          }
        }
        place(dt);
      }

      const setCo = controls.segment('CO 앞쪽', [{ value: 'C', label: 'C 쪽이 앞' }, { value: 'O', label: 'O 쪽이 앞' }], opt.co, (v) => { const w = W2(); if (w && w.lbSet && lb2() && lb2().ph === 'idle') w.lbSet('co', v); opt.co = v; reset(); });
      const setNo = controls.segment('NO₂ 앞쪽', [{ value: 'O', label: 'O 쪽이 앞' }, { value: 'N', label: 'N 쪽이 앞' }], opt.no, (v) => { const w = W2(); if (w && w.lbSet && lb2() && lb2().ph === 'idle') w.lbSet('no', v); opt.no = v; reset(); });
      const setLv = controls.range('속력', 1, 5, 1, opt.lv, (v) => { const w = W2(); if (w && w.lbSet && lb2() && lb2().ph === 'idle') w.lbSet('lv', v); opt.lv = v; reset(); }, (v) => '단계 ' + v);
      const go = controls.button('▶ 충돌시키기', () => { const w = W2(), z = lb2(); if (z && z.ph !== 'idle') return; if (w && w.lbRun) w.lbRun(); launch(); }); go.classList.add('on');
      /* ================= 2D의 다른 장면: 창 속 분자(box) · 에너지 장벽(en) · Eₐ 비교(eas · card) ================= */
      const ctlProbe = controls.text(''); ctlProbe.style.display = 'none'; const ctlEl = ctlProbe.parentElement; const labCtl = [{ els: Array.prototype.filter.call(ctlEl.children, (e) => e !== ctlProbe) }];
      const grab = (fn) => { const n0 = ctlEl.children.length; const r = fn(); return { r, els: Array.prototype.slice.call(ctlEl.children, n0) }; };
      const gBox = new THREE.Group(), gEn = new THREE.Group(); root.add(gBox); root.add(gEn);
      const TYPE_MAT = { C: mat(CPK.C), O: mat(CPK.O), N: mat(CPK.N) };
      const PU = 0x7c3aed;
      /* --- box: 반응기 속 분자 (2D의 S.bx.mols 를 그대로 따라가요) --- */
      const BW = 8, BH = 4.4, BD = 3.2, BY = 2.3;
      const glass = new THREE.Mesh(new THREE.BoxGeometry(BW, BH, BD), ctx.mats.glass({ tint: 0x9fb4d6, opacity: 0.12 }));
      glass.position.set(0, BY, 0); gBox.add(glass);
      const frame = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(BW, BH, BD)), new THREE.LineBasicMaterial({ color: 0x8aa0c8 })); frame.position.set(0, BY, 0); gBox.add(frame);
      { const fit = new THREE.Mesh(new THREE.BoxGeometry(BW, BH, BD), new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false })); fit.position.set(0, BY, 0); gBox.add(fit); }   // 자동 맞춤용 보이지 않는 상자: 반응기 전체가 잘리지 않게
      const floor = new THREE.Mesh(new THREE.BoxGeometry(BW + 0.6, 0.2, BD + 0.6), ctx.mats.metal(0x4a5368, { brushed: true, roughness: 0.45 })); floor.position.set(0, BY - BH / 2 - 0.1, 0); gBox.add(floor);
      const SL = 16, slots = [];
      for (let i = 0; i < SL; i++) {
        const g = new THREE.Group(), at = [], bd = [];
        for (let k = 0; k < 3; k++) { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), TYPE_MAT.C); g.add(m); at.push(m); }
        for (let k = 0; k < 3; k++) { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1, 8), mat(0xb4bfd2)); g.add(m); bd.push(m); }
        g.visible = false; gBox.add(g); slots.push({ g, at, bd });
      }
      const rings = []; for (let i = 0; i < 6; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), new THREE.MeshBasicMaterial({ color: 0x14a058, transparent: true, opacity: 0.3, depthWrite: false })); m.visible = false; gBox.add(m); rings.push(m); }
      const lRx = label('반응!', [0, 0, 0], { color: 'rgba(20,130,70,.92)' }); lRx.show(false);
      const lBox = label('반응기 속 분자 (확대 창)', [0, BY + BH / 2 + 0.5, 0], { color: 'rgba(30,41,59,.9)' });
      const ex = (c) => ({ c: TYPE_MAT[c] });
      function atomsOf(kind, th) {
        const c = Math.cos(th), s = Math.sin(th);
        if (kind === 'A') return [{ dx: -c * 8, dy: -s * 8, r: 7, t: 'O' }, { dx: c * 8, dy: s * 8, r: 7, t: 'C' }];
        if (kind === 'B') { const L = 11, nx = -c * 3.2, ny = -s * 3.2, a = 1.17; return [{ dx: nx, dy: ny, r: 7.4, t: 'N' }, { dx: nx + L * Math.cos(th - a), dy: ny + L * Math.sin(th - a), r: 6.4, t: 'O' }, { dx: nx + L * Math.cos(th + a), dy: ny + L * Math.sin(th + a), r: 6.4, t: 'O' }]; }
        if (kind === 'PA') return [{ dx: -c * 10.5, dy: -s * 10.5, r: 6, t: 'O' }, { dx: 0, dy: 0, r: 6.6, t: 'C' }, { dx: c * 10.5, dy: s * 10.5, r: 6, t: 'O' }];
        return [{ dx: -c * 7, dy: -s * 7, r: 7, t: 'N' }, { dx: c * 7, dy: s * 7, r: 6.4, t: 'O' }];
      }
      function placeBox() {
        const w = W2(); if (!w || !w.S) return; const B = w.S.bx, L = w.RC.L, bx = L.x + 16, by = L.y + 56, bw = L.w - 32, bh = 236, K = BW / bw, S3 = K * 2.3;
        slots.forEach((sl, i) => {
          const m = B.mols[i]; if (!m || m.al < 0.02) { sl.g.visible = false; return; }
          sl.g.visible = true; sl.g.scale.setScalar(Math.min(1, m.al + 0.05));
          const X = (m.x - bx - bw / 2) * K, Y = -(m.y - by - bh / 2) * (BH / bh), Z = Math.sin(i * 12.9 + 1.3) * (BD / 2 - 0.55);
          sl.g.position.set(X, BY + Y, Z);
          const at = atomsOf(m.kind, m.th), P = at.map((a) => new V3(a.dx * S3, -a.dy * S3, 0));
          at.forEach((a, k) => { sl.at[k].visible = true; sl.at[k].material = TYPE_MAT[a.t]; sl.at[k].scale.setScalar(a.r * S3); sl.at[k].position.copy(P[k]); });
          for (let k = at.length; k < 3; k++) sl.at[k].visible = false;
          let bi = 0;
          for (let a = 0; a < at.length; a++) for (let b = a + 1; b < at.length; b++) {
            if (Math.hypot(at[a].dx - at[b].dx, at[a].dy - at[b].dy) < (at[a].r + at[b].r) * 1.7 && bi < 3) { setBond(sl.bd[bi], P[a], P[b], true); sl.bd[bi].scale.x = sl.bd[bi].scale.z = S3 * 8; bi++; }
          }
          for (; bi < 3; bi++) sl.bd[bi].visible = false;
        });
        rings.forEach((r, i) => {
          const f = B.fx[i]; if (!f) { r.visible = false; return; }
          const k = f.t / (f.type === 'react' ? 1.5 : 0.7); r.visible = true;
          r.position.set((f.x - bx - bw / 2) * K, BY - (f.y - by - bh / 2) * (BH / bh), 0);
          r.scale.setScalar((f.type === 'react' ? 0.8 + k * 1.6 : 0.5 + k * 0.9));
          r.material.color.setHex(f.type === 'react' ? 0x14a058 : 0x8a95a8); r.material.opacity = 0.32 * (1 - k);
        });
        const rf = B.fx.filter((f) => f.type === 'react').pop();
        if (rf) { lRx.show(sceneNow === 'box'); lRx.obj = [(rf.x - bx - bw / 2) * K, BY - (rf.y - by - bh / 2) * (BH / bh) + 0.9, 0]; } else lRx.show(false);
        return B;
      }
      const boxCtl = grab(() => controls.button('▶ 10 s 측정 (2배속)', () => { const w = W2(); if (w && w.boxRun) w.boxRun(); }));
      /* --- en: 에너지 장벽 위로 공 굴리기 (2D의 EN 상태를 따라가요) --- */
      const EXW = 9, EKY = 0.034, EY0 = 1.6;                    // 가로 폭 · 1 kJ 당 높이 · 반응물 수준 높이
      let enDs = -1, enTube = null;
      const enMat = mat(PU, { emissive: 0x3a1b82, emissiveIntensity: 0.4 });
      const lvlL = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.08, 0.35), mat(0x4b5d7e)), lvlR = lvlL.clone(); gEn.add(lvlL); gEn.add(lvlR);
      const axis = new THREE.Mesh(new THREE.BoxGeometry(0.05, 140 * EKY, 0.05), mat(0x8a95a8)); axis.position.set(-EXW / 2 - 0.5, EY0 + 30 * EKY, 0); gEn.add(axis);
      for (let k = -40; k <= 100; k += 10) { const t = new THREE.Mesh(new THREE.BoxGeometry(k % 50 === 0 ? 0.3 : 0.16, 0.025, 0.05), mat(0x8a95a8)); t.position.set(-EXW / 2 - 0.5, EY0 + k * EKY, 0); gEn.add(t); }
      const eLine = new THREE.Mesh(new THREE.BoxGeometry(EXW + 1, 0.035, 0.035), mat(0x14a058, { emissive: 0x0a6a35, emissiveIntensity: 0.5 })); gEn.add(eLine);
      const eBall = new THREE.Mesh(new THREE.SphereGeometry(0.3, 24, 18), mat(0xffd34d, { emissive: 0xffa500, emissiveIntensity: 0.6 })); gEn.add(eBall);
      const eaA = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1, 8), mat(PU)), dhA = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1, 8), mat(0xe0692f)); gEn.add(eaA); gEn.add(dhA);
      const lEn = label('', [0, 0, 0], { color: 'rgba(20,130,70,.92)' }), lEaE = label('Eₐ(정)', [0, 0, 0], { color: 'rgba(100,50,200,.92)' }), lDH = label('ΔH', [0, 0, 0], { color: 'rgba(200,90,30,.92)' });
      const lRe = label('반응물', [-EXW / 2 + 0.6, EY0 - 0.5, 0], { color: 'rgba(30,41,59,.9)' }), lPr = label('생성물', [EXW / 2 - 0.6, EY0 - 0.5, 0], { color: 'rgba(30,41,59,.9)' });
      const lAx = label('에너지 · 눈금 한 칸 = 10 kJ', [-EXW / 2 + 1.6, EY0 + 104 * EKY, 0], { color: 'rgba(30,41,59,.9)' });
      const enPos = (c, s) => new V3((s - 0.5) * EXW, EY0 + c.at(s) * EKY, 0);
      function buildEn(ds, w) {
        const c = w.CV[ds], d = w.DG[ds], pts = []; for (let i = 0; i <= 120; i++) pts.push(enPos(c, i / 120));
        if (enTube) { gEn.remove(enTube); enTube.geometry.dispose(); }
        enTube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 160, 0.07, 10, false), enMat); gEn.add(enTube);
        lvlL.position.set(-EXW / 2 - 0.6 + 0.8, EY0, 0); lvlR.position.set(EXW / 2 + 0.6 - 0.8, EY0 + d.dh * EKY, 0);
        const pk = enPos(c, c.sp), x = pk.x - 0.7;
        eaA.scale.set(1, d.ea * EKY, 1); eaA.position.set(x, EY0 + d.ea * EKY / 2, 0.25); lEaE.obj = [x - 0.2, EY0 + d.ea * EKY / 2, 0.25];
        const ya = Math.min(0, d.dh) * EKY, yb = Math.max(0, d.dh) * EKY; dhA.scale.set(1, Math.max(0.05, yb - ya), 1); dhA.position.set(EXW / 2 - 0.5, EY0 + (ya + yb) / 2, 0.25); lDH.obj = [EXW / 2 - 0.5 + 0.3, EY0 + (ya + yb) / 2, 0.25];
        lPr.obj = [EXW / 2 - 0.6, EY0 + d.dh * EKY + (d.dh > 0 ? 0.5 : -0.5), 0];
        enDs = ds;
      }
      const dsSeg = grab(() => controls.segment('도표', [{ value: 0, label: '발열 반응' }, { value: 1, label: '흡열 반응' }], 0, (v) => { const w = W2(); if (w && w.enSetDs) w.enSetDs(v); }));
      const eRange = grab(() => controls.range('충돌 에너지 E', 10, 110, 5, 40, (v) => { const w = W2(); if (w && w.S.en.ph !== 'go') { w.S.en.E = v; w.enReset(); w.updateCtl(); } }, (v) => v + ' kJ'));
      const eRoll = grab(() => controls.button('▶ 공 굴리기', () => { const w = W2(); if (w && w.S.en.ph !== 'go') w.enRoll(); }));
      function stepEnScene(w) {
        const E = w.S.en;
        if (enDs !== E.ds) { buildEn(E.ds, w); dsSeg.r.set(E.ds); }
        const c = w.CV[E.ds], d = w.DG[E.ds];
        if (eRange.r.value !== E.E) eRange.r.set(E.E);
        eLine.position.set(0, EY0 + E.E * EKY, -0.2); lEn.obj = [EXW / 2 + 0.4, EY0 + E.E * EKY + 0.35, 0]; lEn.set('E = ' + E.E + ' kJ');
        const p = enPos(c, E.s); p.y += 0.3; eBall.position.copy(p);
        eRoll.els.forEach((b) => { b.disabled = E.ph === 'go'; });
        const msg = E.res === 'pass' ? '공이 장벽을 넘었어요. E ≥ Eₐ 라서 <b>반응</b>이 일어났어요.' : E.res === 'bounce' ? '공이 되돌아왔어요. E &lt; Eₐ 라서 <b>튕겼어요</b>.' : E.ph === 'go' ? '굴러가는 중…' : 'E 를 바꾸고 <b>▶ 공 굴리기</b>를 눌러요.';
        return '<b>' + d.name + ' · 에너지 도표</b><br>' + msg + '<br>꼭대기 높이 = Eₐ, 생성물 − 반응물 = ΔH 예요. 눈금 한 칸은 10 kJ 예요.';
      }
      /* --- eas · card: Eₐ 장벽이 높을수록 넘는 충돌이 드물어요 --- */
      const gEa = new THREE.Group(); root.add(gEa);
      const eaMat = mat(PU, { emissive: 0x3a1b82, emissiveIntensity: 0.4 });
      let eaTube = null, eaShown = -1;
      const EAK = 0.034, EAW = 9;
      const eaBand = new THREE.Mesh(new THREE.BoxGeometry(EAW + 1, 2.5 * EAK, 0.5), new THREE.MeshStandardMaterial({ color: 0xffd34d, transparent: true, opacity: 0.35, emissive: 0xaa8800, emissiveIntensity: 0.3 })); eaBand.position.set(0, EY0 + 1.25 * EAK, 0); gEa.add(eaBand);
      const eaBall = new THREE.Mesh(new THREE.SphereGeometry(0.28, 24, 18), mat(0xffd34d, { emissive: 0xffa500, emissiveIntensity: 0.6 })); gEa.add(eaBall);
      const eaArr = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1, 8), mat(PU)); gEa.add(eaArr);
      const lEa2 = label('', [0, 0, 0], { color: 'rgba(100,50,200,.92)' }), lBand = label('보통 충돌 에너지 (약 2.5 kJ/mol)', [EAW / 2 - 0.6, EY0 - 0.55, 0], { color: 'rgba(160,110,0,.92)' }), lCnt = label('', [0, EY0 + 135 * EAK, 0], { color: 'rgba(30,41,59,.92)' });
      const eaSgl = (ea) => { const N = 160, U = (s, B) => -50 * (s * s * (3 - 2 * s)) + B * Math.pow(Math.sin(Math.PI * s), 2); let lo = 0, hi = 400; for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; let m = -1e9; for (let k = 0; k <= N; k++) m = Math.max(m, U(k / N, mid)); if (m < ea) lo = mid; else hi = mid; } return (s) => U(s, (lo + hi) / 2); };
      function buildEa(ea) {
        const f = eaSgl(ea), pts = []; let sp = 0, mp = -1e9;
        for (let i = 0; i <= 120; i++) { const s = i / 120, v = f(s); pts.push(new V3((s - 0.5) * EAW, EY0 + v * EAK, 0)); if (v > mp) { mp = v; sp = s; } }
        if (eaTube) { gEa.remove(eaTube); eaTube.geometry.dispose(); }
        eaTube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 140, 0.07, 10, false), eaMat); gEa.add(eaTube);
        const x = (sp - 0.5) * EAW - 0.7; eaArr.scale.set(1, ea * EAK, 1); eaArr.position.set(x, EY0 + ea * EAK / 2, 0.25); lEa2.obj = [x - 0.2, EY0 + ea * EAK / 2, 0.25];
        eaShown = ea; return f;
      }
      let eaF = null, eaCyc = 0;
      const eaRng = grab(() => controls.range('활성화 에너지 Eₐ', 20, 120, 10, 60, (v) => { const w = W2(); if (w && w.setEa) w.setEa(v); }, (v) => v + ' kJ/mol'));
      const EA_E = [3, 5, 2.5, 7, 4, 2];
      function stepEaScene(w, t, isCard) {
        const Q = w.S.ea, ea = Q.disp == null ? Q.ea : Q.disp;
        if (Math.abs(eaShown - ea) > 0.05 || !eaF) eaF = buildEa(ea);
        if (eaRng.r.value !== Q.ea) eaRng.r.set(Q.ea);
        const T = 2.4, k = (t % T) / T, cyc = Math.floor(t / T) % EA_E.length, e = Math.min(EA_E[cyc], ea * 0.95);
        // 공: 왼쪽에서 올라가다 에너지가 모자라 되돌아와요
        const sUp = ((u) => { let s = 0; for (let i = 0; i <= 200; i++) { s = i / 200 * 0.5; if (eaF(s) >= u) break; } return s; })(e);
        const sS = k < 0.5 ? sUp * (1 - Math.pow(1 - k / 0.5, 2)) : sUp * (1 - Math.pow((k - 0.5) / 0.5, 2));
        eaBall.position.set((sS - 0.5) * EAW, EY0 + eaF(sS) * EAK + 0.28, 0);
        lEa2.set('Eₐ = ' + Math.round(ea) + ' kJ/mol');
        lCnt.set('상온 충돌 10²⁰회 중 반응 ' + w.cntTxt(w.eaCount(Q.ea)) + '회');
        return isCard ? '<b>반응이 일어나는 조건</b><br>반응하려면 <b>Eₐ 장벽</b>을 넘을 에너지가 필요해요. 점화 · 마찰 · 빛이 공에 Eₐ 이상의 에너지를 줘요.' :
          '<b>Eₐ 가 클수록 반응은 드물어요</b><br>보통 충돌은 에너지가 작아 장벽 아래에서 되돌아와요. Eₐ 를 바꿔 장벽 높이와 반응 횟수를 비교해요.<br>(숫자는 예시 값)';
      }
      let sceneNow = '';
      function applyScene(sc) {
        sceneNow = sc;
        gLab.visible = sc === 'lab'; gBox.visible = sc === 'box'; gEn.visible = sc === 'en'; gEa.visible = sc === 'eas' || sc === 'card';
        [lEa, lR, lP].forEach((l) => l.show(sc === 'lab')); if (sc !== 'lab') lMsg.show(false);
        [lBox].forEach((l) => l.show(sc === 'box')); if (sc !== 'box') lRx.show(false);
        [lEn, lEaE, lDH, lRe, lPr, lAx].forEach((l) => l.show(sc === 'en'));
        [lEa2, lBand, lCnt].forEach((l) => l.show(sc === 'eas' || sc === 'card'));
        const vis = (g, on) => g.els.forEach((e) => { e.style.display = on ? '' : 'none'; });
        labCtl.forEach((g) => vis(g, sc === 'lab'));
        vis(boxCtl, sc === 'box'); vis(dsSeg, sc === 'en'); vis(eRange, sc === 'en'); vis(eRoll, sc === 'en'); vis(eaRng, sc === 'eas');
        const o = ctx.orbit;
        if (sc === 'lab') { o.theta = 0.25; o.phi = 1.3; o.ty = 2.0; o.tx = PHONE ? -2.2 : -0.5; o.dist = PHONE ? 19 : 14.5; }
        else if (sc === 'box') { o.theta = 0.3; o.phi = 1.3; o.tx = 0; o.ty = BY; o.dist = PHONE ? 17 : 12.5; }
        else { o.theta = 0.1; o.phi = 1.5; o.tx = 0; o.ty = EY0 + 1.6; o.dist = PHONE ? 16 : 13; }
        shown = '';
      }
      function reset() { st.phase = 'idle'; st.xc = -7.5; st.nx = 0; st.beadU = -3; st.drift = 0; st.rp = 0; st.msg = ''; lMsg.show(false); }
      reset(); place(0);
      let shown = '', zPrev = '';
      /* 결과 표 (2D 오른쪽의 '방향 × 속력' 표와 같아요): 충돌시킨 조합의 칸이 채워져요 */
      const tblEl = document.createElement('div'); tblEl.className = 'hxc-tbl'; ctx.renderer.domElement.parentElement.appendChild(tblEl);
      if (!document.getElementById('hxc-tbl-css')) { const cs = document.createElement('style'); cs.id = 'hxc-tbl-css'; cs.textContent =
        '.hxc-tbl{position:absolute;right:10px;bottom:36px;padding:6px 8px;border-radius:12px;background:rgba(8,12,24,.78);color:#e5e7eb;font-size:12px;font-weight:800;pointer-events:none;z-index:3}' +
        '.hxc-tbl table{border-collapse:collapse}.hxc-tbl th,.hxc-tbl td{padding:3px 7px;text-align:center;border:1px solid rgba(255,255,255,.18)}.hxc-tbl th{color:#cbd5e1;font-weight:800}' +
        '.hxc-tbl td.r{background:#15803d;color:#fff}.hxc-tbl td.b{background:rgba(220,38,38,.55);color:#fff}.hxc-tbl td.q{color:#94a3b8}.hxc-tbl .h{margin-bottom:3px}' +
        '@media (max-width:599px){.hxc-tbl{font-size:10.5px;padding:4px 5px;right:6px;bottom:30px}.hxc-tbl th,.hxc-tbl td{padding:2px 4px}}';
        document.head.appendChild(cs); }
      let tblSig = null;
      function drawTbl(sc) {
        const z = lb2(), tr = (z && z.tried) || {}, sig = sc === 'lab' ? JSON.stringify(tr) : '';
        if (sig === tblSig) return; tblSig = sig;
        if (sc !== 'lab') { tblEl.style.display = 'none'; return; }
        tblEl.style.display = '';
        const cell = (k) => tr[k] === 'react' ? '<td class="r">반응 ✓</td>' : tr[k] === 'bounce' ? '<td class="b">튕김</td>' : '<td class="q">?</td>';
        const n = ['ok-fast', 'ok-slow', 'bad-fast', 'bad-slow'].filter((k) => tr[k]).length;
        tblEl.innerHTML = '<div class="h">📋 결과 표 ' + n + ' / 4</div><table><tr><th></th><th>빠름</th><th>느림</th></tr><tr><th>방향 맞음</th>' + cell('ok-fast') + cell('ok-slow') + '</tr><tr><th>방향 틀림</th>' + cell('bad-fast') + cell('bad-slow') + '</tr></table>';
      }
      return {
        update(dt, tt) {
          dt = Math.min(dt, 0.05);
          const w0 = W2(), sc = (w0 && w0.S && w0.S.mode) || 'lab';
          if (sc !== sceneNow) applyScene(sc);
          drawTbl(sc);
          if (sc !== 'lab') {
            let html = '';
            if (sc === 'box') {
              const B = placeBox();
              html = '<b>CO + NO₂ → CO₂ + NO</b><br>창 속 집계: 충돌 ' + B.nCol + '회 · 튕김 ' + B.nBounce + '회 · 반응 <b>' + B.nRx + '회</b>' +
                (B.run || B.done ? '<br>반응기 전체 ' + (B.tm | 0) + ' s: 충돌 ' + B.cTot.toLocaleString() + '회 · 반응한 충돌 ' + B.cRx + '회' : '<br><b>▶ 10 s 측정</b>을 누르면 반응기 전체를 세요.') +
                '<br>회색 C · 빨강 O · 파랑 N · 대부분의 충돌은 튕겨요.';
              boxCtl.els.forEach((b) => { b.disabled = B.run; });
            } else if (sc === 'en') html = stepEnScene(w0);
            else html = stepEaScene(w0, tt, sc === 'card');
            if (html !== shown) { shown = html; info(html); }
            return;
          }
          const z = lb2();
          if (z) {
            if (z.co !== opt.co || z.no !== opt.no || z.lv !== opt.lv) { opt.co = z.co; opt.no = z.no; opt.lv = z.lv; setCo.set(opt.co); setNo.set(opt.no); setLv.set(opt.lv); if (st.phase === 'idle' || st.phase === 'done') reset(); }
            if (z.ph === 'run' && zPrev !== 'run' && (st.phase === 'idle' || st.phase === 'done')) launch();
            zPrev = z.ph;           // 2D에서 충돌시키면 3D도 함께 충돌해요
          }
          step(dt);
          const msg = st.phase === 'done' ? st.msg : (st.phase === 'idle' ? '방향과 속력을 고른 뒤 <b>▶ 충돌시키기</b>를 눌러요.' : '충돌 중…');
          const t = '<b>CO + NO₂ → CO₂ + NO</b><br>' + msg + '<br>속력 단계 ' + opt.lv + ' → 충돌 에너지 ' + (opt.lv * opt.lv) + ' ' + (opt.lv * opt.lv >= LV_EA ? '≥' : '<') + ' Eₐ(' + LV_EA + ')<br>조건: ① 알맞은 방향(CO의 C가 NO₂의 O에 닿기) ② 에너지 ≥ Eₐ';
          if (t !== shown) { shown = t; info(t); }
        },
      };
    },
  });
})();
