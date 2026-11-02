/* hx-collision · 3D 유효 충돌: CO + NO₂ → CO₂ + NO
   분자가 충돌한다고 모두 반응하지는 않아요. ① 알맞은 방향(CO의 C가 NO₂의 O에 닿기)과
   ② 활성화 에너지(Eₐ) 이상의 운동 에너지가 모두 있어야 O 원자가 옮겨 가며 새 물질이 돼요.
   위쪽 곡선은 반응 경로의 에너지예요 (공이 언덕을 넘어야 반응). 길이·각은 실제에 가깝게 그린 모형 스케치예요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const CPK = { C: 0x5b6472, O: 0xe23b3b, N: 0x3867f4 }, RAD = { C: 0.55, O: 0.5, N: 0.5 };
  const EA = 1.0, VSLOW = 2.4, VFAST = 4.6, V_NEED = 3.5;         // 속력 ∝ √(운동 에너지)
  const sstep = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
  const prof = (x) => -0.35 * (1 + Math.tanh(1.4 * x)) + 1.9 * Math.exp(-x * x / 0.9);   // 반응 경로 에너지 (x: -3 ~ 3)

  window.SciSim3D.attach({
    title: '유효 충돌 3D · CO + NO₂',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: PHONE ? 19 : 14.5, theta: 0.25, phi: 1.3, min: 8, max: 30, target: [-0.5, 2.0, 0] },
    autoRotate: 0,
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const V3 = THREE.Vector3, UP = new V3(0, 1, 0);
      const S0 = window.__sim && window.__sim.S && window.__sim.S.lb;
      const opt = { co: S0 && S0.co === 'O' ? 'O' : 'C', no: S0 && S0.no === 'N' ? 'N' : 'O', speed: 'fast' };
      const mat = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.38, metalness: 0.05 }, o || {}));
      const A = {};
      [['C', 'C'], ['Oc', 'O'], ['N', 'N'], ['Oa', 'O'], ['Ob', 'O']].forEach(([k, el]) => { A[k] = new THREE.Mesh(new THREE.SphereGeometry(RAD[el], 36, 26), mat(CPK[el])); root.add(A[k]); });
      const bonds = {};
      ['CO', 'NOa', 'NOb', 'COa'].forEach((k) => { bonds[k] = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 1, 14), mat(0xb4bfd2)); root.add(bonds[k]); });
      function setBond(b, p, q, vis) {
        b.visible = vis; if (!vis) return;
        const d = q.clone().sub(p), L = d.length(); b.scale.set(1, L, 1); b.position.copy(p).add(q).multiplyScalar(0.5); b.quaternion.setFromUnitVectors(UP, d.normalize());
      }
      /* 바닥 격자(눈금) */
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(26, 7), mat(0x1c2740, { roughness: 0.9, transparent: true, opacity: 0.85 })); floor.rotation.x = -Math.PI / 2; floor.position.set(-1, -1.3, 0); root.add(floor);
      /* 반응 경로 에너지 곡선 (위) */
      const OY = 5.3, SX = 1.25;
      const pts = []; for (let i = 0; i <= 90; i++) { const x = -3 + 6 * i / 90; pts.push(new V3(x * SX, OY + prof(x), 0)); }
      const curve = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 180, 0.07, 10, false), mat(0x8fa3c7, { emissive: 0x3b4a6b, emissiveIntensity: 0.6 })); root.add(curve);
      const baseline = new THREE.Mesh(new THREE.BoxGeometry(2.4 * SX * 3, 0.03, 0.03), mat(0x5c6b8a, { transparent: true, opacity: 0.6 })); baseline.position.set(-3 * SX * 0.2 - 1.5, OY, 0); root.add(baseline);
      const peakY = OY + prof(-0.05);
      const eaArrow = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, peakY - OY, 10), mat(0xffd34d, { emissive: 0xaa8800, emissiveIntensity: 0.5 })); eaArrow.position.set(-0.05 * SX - 0.35, (peakY + OY) / 2, 0); root.add(eaArrow);
      const bead = new THREE.Mesh(new THREE.SphereGeometry(0.28, 24, 18), mat(0xffd34d, { emissive: 0xffa500, emissiveIntensity: 0.6 })); root.add(bead);
      const lEa = label('활성화 에너지 Eₐ', [-0.05 * SX - 0.4, (peakY + OY) / 2, 0], { color: 'rgba(180,120,0,.92)' });
      const lR = label('반응물', [-3 * SX, OY + 0.2, 0], { color: 'rgba(30,41,59,.9)' }), lP = label('생성물', [3 * SX, OY - 0.7 + 0.2, 0], { color: 'rgba(30,41,59,.9)' });
      const lMsg = label('', [0, 0, 0], { color: 'rgba(30,41,59,.9)' }); lMsg.show(false);

      /* 상태 */
      const st = { phase: 'idle', xc: -8, nx: 0, tm: 0, v: VFAST, react: false, vb: 0, rp: 0, drift: 0, beadU: -3, msg: '' };
      let xcContact = 0, climbU = -1;
      const lead = () => (opt.no === 'O' ? 0 : 0.70);         // NO₂의 맨 앞 원자 x (N이 앞이면 N=0, O가 앞이면 O_a=0)
      const base = () => {                                    // NO₂ 정지 위치 (nx 만큼 밀림)
        if (opt.no === 'O') return { N: new V3(0.70, 1.66, 0), Oa: new V3(0, 0, 0), Ob: new V3(0, 3.32, 0) };
        return { N: new V3(0, 0, 0), Oa: new V3(0.70, 1.66, 0), Ob: new V3(0.70, -1.66, 0) };
      };
      function launch() {
        st.phase = 'approach'; st.v = opt.speed === 'fast' ? VFAST : VSLOW; st.xc = -7.5; st.nx = 0; st.tm = 0; st.rp = 0; st.drift = 0; st.vb = 0;
        st.react = opt.co === 'C' && opt.no === 'O' && st.v >= V_NEED; st.msg = '';
        xcContact = lead() - 1.9;
        // 곡선 위 공이 오르는 높이: 알맞은 방향이면 속력에 비례, 틀리면 낮게
        const frac = opt.co === 'C' && opt.no === 'O' ? Math.min(1, (st.v * st.v) / (V_NEED * V_NEED)) : Math.min(0.35, (st.v * st.v) / (V_NEED * V_NEED) * 0.35);
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

      controls.segment('CO 앞쪽', [{ value: 'C', label: 'C 쪽' }, { value: 'O', label: 'O 쪽' }], opt.co, (v) => { opt.co = v; reset(); });
      controls.segment('NO₂ 앞쪽', [{ value: 'O', label: 'O 쪽' }, { value: 'N', label: 'N 쪽' }], opt.no, (v) => { opt.no = v; reset(); });
      controls.segment('속력', [{ value: 'slow', label: '느림' }, { value: 'fast', label: '빠름' }], opt.speed, (v) => { opt.speed = v; reset(); });
      const go = controls.button('▶ 충돌시키기', () => launch()); go.classList.add('on');
      function reset() { st.phase = 'idle'; st.xc = -7.5; st.nx = 0; st.beadU = -3; st.drift = 0; st.rp = 0; st.msg = ''; lMsg.show(false); }
      reset(); place(0);
      let shown = '';
      return {
        update(dt) {
          dt = Math.min(dt, 0.05); step(dt);
          const msg = st.phase === 'done' ? st.msg : (st.phase === 'idle' ? '방향과 속력을 고른 뒤 <b>▶ 충돌시키기</b>를 눌러요.' : '충돌 중…');
          const t = '<b>CO + NO₂ → CO₂ + NO</b><br>' + msg + '<br>조건: ① C가 O에 닿는 방향 ② 에너지 ≥ Eₐ';
          if (t !== shown) { shown = t; info(t); }
        },
      };
    },
  });
})();
