/* hy-phosphorylation · 3D 두 가지 인산화
   ① 산화적 인산화(화학 삼투): 전자 전달계가 H⁺를 막 사이 공간으로 퍼 올려 H⁺ 농도 기울기를 만들고,
      H⁺가 ATP 합성 효소(F₀의 회전자 → F₁)를 통해 기질로 흘러 들어오면서 ATP를 합성해요.
   ② 기질 수준 인산화: 효소가 인산기를 가진 기질에서 ADP로 인산기를 직접 옮겨 ATP를 만들어요. (막 · 산소 필요 없음) */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const narrow = window.innerWidth < 600 || window.innerHeight > window.innerWidth * 1.1;
  const AX = 2.1;                 // ATP 합성 효소 x 위치
  const CX = [-3.4, -2.1, -0.8];  // 전자 전달계 복합체 x 위치
  const MODE_OF = { sub: 'sub', grad: 'chemi', chemi: 'chemi' };

  window.SciSim3D.attach({
    title: '두 가지 인산화 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: narrow ? 11.5 : 10.5, theta: 0.2, phi: 1.36, target: narrow ? [0.2, 0, 0] : [0, -0.2, 0], min: 5, max: 20 },
    autoRotate: 0,
    levels: [0, 1, 2],
    build(ctx) {
      const { THREE, root, label, info, controls, orbit } = ctx;
      const V = THREE.Vector3;
      if (narrow) root.rotation.z = Math.PI / 2;      // 휴대폰(세로 화면)에서는 눕혀 둔 모형을 세워서 보여 줘요
      let mode = 'chemi';
      const std = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.42, metalness: 0.04 }, o || {}));
      const A = (p) => { const o = new THREE.Object3D(); o.position.set(p[0], p[1], p[2]); root.add(o); return o; };
      const chemi = new THREE.Group(), sub = new THREE.Group(); root.add(chemi, sub);

      /* ================= ① 화학 삼투 ================= */
      // 내막: 인지질 이중층 (복합체 · ATP 합성 효소 자리는 비워요)
      (function () {
        const NX = 19, NZ = 4, SX = 0.5, maxN = NX * NZ * 2;
        const heads = new THREE.InstancedMesh(new THREE.SphereGeometry(0.19, 16, 12), std(0xf472b6, { roughness: 0.35 }), maxN);
        const tails = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.045, 0.045, 0.4, 8), std(0xfcd34d, { roughness: 0.5 }), maxN * 2);
        const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), S1 = new V(1, 1, 1), P = new V();
        const holes = CX.map((x) => [x, 0, 0.62]).concat([[AX, 0, 0.75]]);
        let h = 0, t = 0;
        for (let i = 0; i < NX; i++) for (let k = 0; k < NZ; k++) {
          const x = (i - (NX - 1) / 2) * SX + ((k % 2) ? SX / 2 : 0), z = -0.5 - k * 0.46;
          if (Math.abs(x) > 4.7) continue;
          if (holes.some((o) => Math.hypot(x - o[0], z - o[1]) < o[2])) continue;
          for (let s = -1; s <= 1; s += 2) {
            M4.compose(P.set(x, s * 0.44, z), Q, S1); heads.setMatrixAt(h++, M4);
            for (const dx of [-0.07, 0.07]) { M4.compose(P.set(x + dx, s * 0.2, z), Q, S1); tails.setMatrixAt(t++, M4); }
          }
        }
        heads.count = h; tails.count = t; chemi.add(heads, tails);
      })();
      // 전자 전달계 복합체 3개
      const cxCols = [0xf59e0b, 0x22c55e, 0x3b82f6], cxMats = cxCols.map((c) => std(c, { roughness: 0.35, emissive: 0x000000 }));
      const cx = CX.map((x, i) => {
        const m = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 22), cxMats[i]); m.scale.set(0.5, 0.78, 0.55); m.position.set(x, 0, 0); chemi.add(m); return m;
      });
      // ATP 합성 효소
      const synth = new THREE.Group(); synth.position.set(AX, 0, 0); chemi.add(synth);
      const rotor = new THREE.Group(); synth.add(rotor);
      const rotMat = std(0xa78bfa, { roughness: 0.35 });
      for (let i = 0; i < 10; i++) {
        const a = i / 10 * Math.PI * 2, c = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.55, 8, 14), rotMat);
        c.position.set(Math.cos(a) * 0.4, 0, Math.sin(a) * 0.4); rotor.add(c);
      }
      const gamma = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.7, 14), std(0xfacc15, { roughness: 0.3, emissive: 0x3a2a00 })); gamma.position.y = -1.0; rotor.add(gamma);
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.17, 14, 12), std(0xfacc15)); knob.position.set(0.0, -1.75, 0); rotor.add(knob);
      const aSub = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.9, 0.5), std(0x7c3aed, { roughness: 0.4 })); aSub.position.set(0.72, 0, 0); synth.add(aSub);
      const F1 = new THREE.Group(); F1.position.y = -1.55; synth.add(F1);
      const betaMats = [0, 1, 2].map(() => std(0x34d399, { roughness: 0.35 })), alphaMat = std(0x7dd3fc, { roughness: 0.4 });
      const betas = [];
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * Math.PI * 2, isB = i % 2 === 0;
        const m = new THREE.Mesh(new THREE.SphereGeometry(0.36, 28, 20), isB ? betaMats[i / 2] : alphaMat); m.scale.set(1, 1.35, 1);
        m.position.set(Math.cos(a) * 0.42, 0, Math.sin(a) * 0.42); F1.add(m); if (isB) betas.push({ m, a });
      }
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.4, 20, 14), alphaMat); cap.scale.set(1, 0.4, 1); cap.position.y = 0.55; F1.add(cap);
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.4, 10), std(0x94a3b8)); arm.position.set(0.82, -0.7, 0); arm.rotation.z = -0.02; synth.add(arm);

      /* H⁺ 입자 */
      const hMat = std(0xfde047, { emissive: 0x7a5a00, roughness: 0.3 }), hGeo = new THREE.SphereGeometry(0.13, 14, 10);
      const hs = [];       // IMS 의 H⁺
      const trans = [];    // 막을 지나는 중인 H⁺
      const mat_ = [];     // 기질의 H⁺
      function rndIMS() { return new V((Math.random() * 2 - 1) * 4.2, 0.85 + Math.random() * 1.4, (Math.random() * 2 - 1) * 2); }
      function rndMat() { return new V((Math.random() * 2 - 1) * 4.2, -0.9 - Math.random() * 1.9, (Math.random() * 2 - 1) * 2); }
      function newH(p, arr) { const m = new THREE.Mesh(hGeo, hMat); m.position.copy(p); chemi.add(m); const o = { m, v: new V(Math.random() - .5, Math.random() - .5, Math.random() - .5).setLength(0.9), s: 0 }; arr.push(o); return o; }
      for (let i = 0; i < 4; i++) newH(rndMat(), mat_);
      function wander(o, dt, y0, y1) {
        o.v.x += (Math.random() - 0.5) * 6 * dt; o.v.y += (Math.random() - 0.5) * 6 * dt; o.v.z += (Math.random() - 0.5) * 6 * dt; o.v.setLength(Math.max(0.6, Math.min(1.3, o.v.length())));
        const p = o.m.position; p.addScaledVector(o.v, dt);
        if (Math.abs(p.x) > 4.3) { p.x = Math.sign(p.x) * 4.3; o.v.x *= -1; } if (Math.abs(p.z) > 2) { p.z = Math.sign(p.z) * 2; o.v.z *= -1; }
        if (p.y > y1) { p.y = y1; o.v.y *= -1; } if (p.y < y0) { p.y = y0; o.v.y *= -1; }
        if (o.s < 1) { o.s = Math.min(1, o.s + dt * 3); o.m.scale.setScalar(o.s); }
      }
      // 막 통과 경로
      function pathThrough(from, pts, dur, done) { trans.push({ pts: [from.clone()].concat(pts), t: 0, dur, done, m: null }); }
      const atps = [];
      const atpMat = std(0xfacc15, { emissive: 0x7a5a00 });
      function spawnATP(a) {
        const g = new THREE.Group();
        const s = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), atpMat); g.add(s);
        for (let i = 0; i < 3; i++) { const p = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10), std(0xf472b6)); p.position.set(0.26 + i * 0.19, 0, 0); g.add(p); }
        g.position.set(AX + Math.cos(a) * 0.9, -1.55, Math.sin(a) * 0.9); chemi.add(g);
        atps.push({ g, v: new V(Math.cos(a), -0.5, Math.sin(a)).setLength(1.0), t: 0 });
      }

      /* ================= ② 기질 수준 인산화 ================= */
      const enzS = new THREE.Group(); enzS.position.set(0, -1.2, 0); sub.add(enzS);
      { const m = std(0x38bdf8, { roughness: 0.3, metalness: 0.05 }); m.transparent = true; m.opacity = 0.9;
        const b = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), m); b.scale.set(2.3, 1.1, 1.5); enzS.add(b);
        [-1, 1].forEach((s) => { const j = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 28), m); j.scale.set(0.7, 1.0, 1.2); j.position.set(s * 1.55, 0.9, 0); enzS.add(j); });
        /* 표면 돌기(곁사슬) */
        const NB = 150, bm = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), std(0x7dd3fc, { roughness: 0.4 }), NB), dm = new THREE.Object3D();
        for (let i = 0; i < NB; i++) { const y = 1 - 2 * (i + 0.5) / NB, r = Math.sqrt(1 - y * y), th = i * 2.399963; const px = Math.cos(th) * r * 2.3, py = y * 1.1, pz = Math.sin(th) * r * 1.5; if (py > 0.55 && Math.abs(px) < 1.5) continue; dm.position.set(px, py, pz); dm.scale.setScalar(0.055 + 0.03 * ((i * 7) % 3)); dm.updateMatrix(); bm.setMatrixAt(i, dm.matrix); }
        enzS.add(bm);
        /* α 나선 리본 */
        [[-1.1, 0.1, 1.42, 0xf9a8d4], [0.5, 0.0, 1.48, 0xfde68a], [-0.2, 0.55, 1.2, 0xa7f3d0]].forEach((q, k) => {
          const pts = []; for (let i = 0; i <= 60; i++) { const u = i / 60, a2 = u * Math.PI * 2 * 3; pts.push(new V(q[0] - 0.6 + u * 1.2, q[1] + Math.cos(a2) * 0.16, q[2] + Math.sin(a2) * 0.16)); }
          const t = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 80, 0.05, 8), std(q[3], { roughness: 0.35 })); enzS.add(t);
        });
        /* 결합 자리(활성 부위): 기질 · ADP가 앉는 오목한 틈 */
        const pkM = std(0x0c4a6e, { emissive: 0x0a3d5e, emissiveIntensity: 0.6, roughness: 0.3 });
        [[-0.55, 0.92], [1.0, 0.92]].forEach((q) => { const pk = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 16), pkM); pk.scale.set(0.62, 0.17, 0.5); pk.position.set(q[0], q[1], 0); enzS.add(pk); });
      }
      /* 세포 속 환경: 받침 원판 + 떠다니는 작은 분자 */
      let envT = 0;
      const envUpd = (function () {
        const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
        const gr = x.createRadialGradient(128, 128, 6, 128, 128, 126); gr.addColorStop(0, 'rgba(120,190,255,.40)'); gr.addColorStop(0.6, 'rgba(70,110,200,.18)'); gr.addColorStop(1, 'rgba(20,30,70,0)');
        x.fillStyle = gr; x.fillRect(0, 0, 256, 256); x.strokeStyle = 'rgba(180,215,255,.3)'; x.lineWidth = 1.5; [50, 85, 115].forEach((r) => { x.beginPath(); x.arc(128, 128, r, 0, 7); x.stroke(); });
        const f = new THREE.Mesh(new THREE.CircleGeometry(5.2, 64), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false })); f.rotation.x = -Math.PI / 2; f.position.set(0, -2.3, 0); sub.add(f);
        const N = 90, dots = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshBasicMaterial({ color: 0x9cc8ff, transparent: true, opacity: 0.35 }), N), dm = new THREE.Object3D();
        const P0 = Array.from({ length: N }, (_, i) => { const r = (k) => { const v = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return v - Math.floor(v); }; return { x: (r(1) - 0.5) * 11, y: -2 + r(2) * 6.4, z: (r(3) - 0.5) * 5 - 1.5, s: 0.03 + r(4) * 0.06, ph: r(5) * 6.28, sp: 0.2 + r(6) * 0.4 }; });
        dots.frustumCulled = false; sub.add(dots);
        return (t) => { P0.forEach((q, i) => { dm.position.set(q.x + Math.sin(t * q.sp + q.ph) * 0.4, q.y + Math.cos(t * q.sp * 1.3 + q.ph) * 0.3, q.z); dm.scale.setScalar(q.s); dm.updateMatrix(); dots.setMatrixAt(i, dm.matrix); }); dots.instanceMatrix.needsUpdate = true; };
      })();
      const Pmat = std(0xf472b6, { emissive: 0x3a0a22 }), Cmat = std(0x94a3b8, { roughness: 0.35 }), Amat = std(0xfb923c, { roughness: 0.35 });
      function pBall(r) { return new THREE.Mesh(new THREE.SphereGeometry(r || 0.2, 16, 12), Pmat); }
      const substrate = new THREE.Group(), adp = new THREE.Group(), pyr = new THREE.Group(), atp = new THREE.Group(), pfly = pBall(0.2);
      sub.add(substrate, adp, pyr, atp, pfly);
      function chain(g, withP) { [-0.42, 0, 0.42].forEach((x, i) => { const c = new THREE.Mesh(new THREE.SphereGeometry(0.26, 20, 14), Cmat); c.position.set(x, i === 1 ? 0.12 : 0, 0); g.add(c); }); }
      chain(substrate); const sP = pBall(0.22); sP.position.set(0, 0.5, 0); substrate.add(sP);
      chain(pyr);
      { const a = new THREE.Mesh(new THREE.SphereGeometry(0.36, 22, 16), Amat); adp.add(a); [0.5, 0.78].forEach((x) => { const p = pBall(0.17); p.position.x = x; adp.add(p); });
        const a2 = new THREE.Mesh(new THREE.SphereGeometry(0.36, 22, 16), Amat); atp.add(a2); [0.5, 0.78, 1.06].forEach((x) => { const p = pBall(0.17); p.position.x = x; atp.add(p); }); }
      const ease = (k) => { k = Math.max(0, Math.min(1, k)); return k * k * (3 - 2 * k); };
      const lerp3 = (o, a, b, k) => o.position.set(a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k);
      let st = 0;
      function renderSub(tt) {
        st = tt;
        const sPos = [-0.55, -0.2, 0.0], aPos = [1.0, -0.2, 0.0];   // 결합 자리
        if (st < 2) {      // 들어오기
          const k = ease(st / 1.8);
          lerp3(substrate, [-4.2, 3, 0], sPos, k); lerp3(adp, [4.4, 2.8, 0], aPos, k);
          substrate.visible = adp.visible = true; pyr.visible = atp.visible = false; pfly.visible = false; sP.visible = true;
        } else if (st < 3.2) {     // 인산기 이동
          const k = ease((st - 2) / 1.0);
          substrate.position.set(...sPos); adp.position.set(...aPos);
          pfly.visible = true; sP.visible = k < 0.02;
          const a0 = new V(sPos[0], sPos[1] + 0.5, 0), a1 = new V(aPos[0] + 1.34, aPos[1], 0);
          pfly.position.lerpVectors(a0, a1, k); pfly.position.y += Math.sin(k * Math.PI) * 0.9;
        } else if (st < 4.2) {     // 결합 상태 (ATP 완성)
          pfly.visible = false; substrate.visible = false; adp.visible = false;
          pyr.visible = atp.visible = true; pyr.position.set(...sPos); atp.position.set(...aPos);
        } else if (st < 6.2) {     // 떠나기
          const k = ease((st - 4.2) / 1.8);
          lerp3(pyr, sPos, [-4.3, 3.2, 0.6], k); lerp3(atp, aPos, [3.2, 3.4, 0.6], k);
        } else { pyr.visible = atp.visible = false; }
      }

      /* ---------- 이름표 · 조작 ---------- */
      const L = {
        ims: label('막 사이 공간 (H⁺ 많음)', A([-2.4, 2.6, 0]), { color: '#7c5a10' }),
        mat: label('기질 (H⁺ 적음)', A([-2.4, -2.6, 0]), { color: '#7c5a10' }),
        etc: label('전자 전달계', A([-2.1, 0.95, 0]), { color: '#1e40af' }),
        syn: label('ATP 합성 효소', A([AX + 1.1, 0.8, 0]), { color: '#5b21b6' }),
        atp: label('ATP', A([AX - 0.5, -3.1, 0]), { color: '#92400e' }),
        sE: label('효소', enzS, { color: '#075985', offset: [0, -1.65, 0] }),
        sS: label('인산기를 가진 기질', substrate, { color: '#9d174d', offset: [0, 0.95, 0] }),
        sA: label('ADP', adp, { color: '#9a3412', offset: [0.4, 0.8, 0] }),
        sT: label('ATP', atp, { color: '#92400e', offset: [0.5, 0.8, 0] }),
      };
      function setMode(m) {
        mode = m; chemi.visible = m === 'chemi'; sub.visible = m === 'sub';
        orbit.dist = m === 'sub' ? (narrow ? 10 : 8.2) : (narrow ? 11.5 : 10.5); orbit.phi = m === 'sub' ? 1.15 : 1.36; { const ty = m === 'sub' ? 0.6 : -0.2; if (narrow) { orbit.tx = -ty; orbit.ty = 0; } else orbit.ty = ty; }
        ['ims', 'mat', 'etc', 'syn', 'atp'].forEach((k) => L[k].show(m === 'chemi')); ['sE', 'sS', 'sA', 'sT'].forEach((k) => L[k].show(m === 'sub'));
        st = 0; text();
      }
      /* 2D와 같은 값을 따라가요: 기질 수준(sub) · H⁺ 기울기(grad: NADH 공급 · 산소) · 화학 삼투(chemi: 처리). 3D에서 바꾸면 2D도 같이 바뀌어요 */
      let gcur = 0.8, pumpF = 1, rotF = 1, leakF = 0;
      function text() {
        const L = ctx.lesson(), v = L && L.S && L.S.sb ? (L.S.sb.view === 'tca' ? 'TCA 회로' : '해당 과정') : '';
        if (mode === 'sub') info('<b>기질 수준 인산화</b>' + (v ? ' · ' + v : '') + '<br>효소가 기질의 <b>인산기(Ⓟ)</b>를 ADP에 직접 옮겨 ATP를 만들어요. 막이 없어도, 산소가 없어도 일어나요.');
        else if (L && L.S && L.S.mode === 'chemi' && L.S.ch) {
          const tr = L.S.ch.tr, nm = { none: '처리 없음', un: '짝풀림제', ol: '올리고마이신', cn: '시안화물' }[tr];
          const ex = { none: 'H⁺가 ATP 합성 효소로 흘러 들어오며 ATP를 만들어요.', un: 'H⁺가 막으로 새어 기울기가 사라져요 → ATP는 줄고 열이 나요.', ol: 'ATP 합성 효소의 H⁺ 통로가 막혀 회전자가 멈춰요 → ATP 0, H⁺ 기울기는 커져요.', cn: '전자 전달이 막혀 H⁺를 퍼 올리지 못해요 → 기울기 · ATP 0.' }[tr];
          info('<b>화학 삼투</b> · 처리: <b>' + nm + '</b><br>' + ex + '<br>ΔpH <b>' + gcur.toFixed(2) + '</b> · 산소 소비 ' + Math.round(L.S.ch.o2.v) + ' · ATP 합성 ' + Math.round(L.S.ch.atp.v));
        } else if (L && L.S && L.S.mode === 'grad' && L.S.gr) info('<b>H⁺ 기울기</b> · 전자 전달계가 H⁺를 막 사이 공간으로 퍼 올려요.<br>NADH 공급 ' + L.S.gr.s + ' · 산소 ' + (L.S.gr.o2 ? '있음' : '없음') + '<br>ΔpH <b>' + gcur.toFixed(2) + '</b>' + (L.S.gr.o2 ? '' : ' · 전자가 흐르지 못해 기울기가 줄어요.'));
        else info('<b>산화적 인산화</b> · H⁺가 ATP 합성 효소를 지나 흐를 때 <b>회전자</b>가 돌며 ATP가 만들어져요.<br>ΔpH <b>' + gcur.toFixed(2) + '</b>');
      }
      const ctlEl = document.querySelector('.v3-ctl');
      const grp = (fn) => { const n0 = ctlEl ? ctlEl.children.length : 0; fn(); return ctlEl ? Array.prototype.slice.call(ctlEl.children, n0) : []; };
      let rngS, segO, segTr, player;
      const gGrad = grp(() => {
        rngS = controls.range('NADH 공급 속도', 0, 10, 1, 5, (v) => { const L = ctx.lesson(); if (L && L.S.gr) { L.S.gr.s = v; L.updateCtl(); } });
        segO = controls.segment('산소', [{ value: 'on', label: '💨 있음' }, { value: 'off', label: '🚫 없음' }], 'on', (v) => { const L = ctx.lesson(); if (L && L.S.gr) { L.S.gr.o2 = v === 'on'; L.updateCtl(); } });
      });
      const gChem = grp(() => {
        segTr = controls.segment('처리', [{ value: 'none', label: '처리 없음' }, { value: 'un', label: '🔥 짝풀림제' }, { value: 'ol', label: '🚧 올리고마이신' }, { value: 'cn', label: '🧪 시안화물' }], 'none', (v) => { const L = ctx.lesson(); if (L && L.chSet) L.chSet(v); });
      });
      const gSub = grp(() => {
        player = controls.player({
          duration: 7, loop: true, autoplay: true, label: '인산기 옮기기',
          phases: [[0, '기질 · ADP 접근'], [2 / 7, '인산기 이동'], [3.2 / 7, 'ATP 완성'], [4.2 / 7, '떠남']],
          onFrame(p) { renderSub(p * 7); },
        });
      });
      const showG = (arr, on) => arr.forEach((e) => { e.style.display = on ? '' : 'none'; });
      function applyCtl() { const L = ctx.lesson(), m = L && L.S ? L.S.mode : ''; showG(gSub, mode === 'sub'); showG(gGrad, mode === 'chemi' && m === 'grad'); showG(gChem, mode === 'chemi' && m !== 'grad'); }
      let lastKey = '';
      function poll() {
        const L = ctx.lesson(); if (!L || !L.S) return;
        const m = L.S.mode, m2 = MODE_OF[m] || mode;
        if (m2 !== mode) { setMode(m2); }
        if (m + mode !== lastKey) { lastKey = m + mode; applyCtl(); }
        if (m === 'grad' && L.S.gr) {
          const z = L.S.gr; gcur = z.g; pumpF = z.o2 ? z.s / 5 : 0; rotF = z.g; leakF = 0;
          rngS.set(z.s); segO.set(z.o2 ? 'on' : 'off');
        } else if (L.S.ch) {
          const c = L.S.ch; gcur = c.g; pumpF = c.o2.v / 100; rotF = c.atp.v / 100 * (c.tr === 'none' ? 1 : 1); leakF = c.tr === 'un' ? 1 : 0;
          if (m === 'chemi') segTr.set(c.tr);
        }
      }
      setMode('chemi'); applyCtl();

      let txtT = 0, ang = 0, stepAcc = 0, pumpAcc = 0, leakAcc = 0, lastMode = null, cnt = 0;
      return {
        update(dt) {
          dt = Math.min(dt, 0.05) * (window.__v3dTS || 1); envT += dt;
          poll(); txtT -= dt; if (txtT < 0) { txtT = 0.4; text(); }
          if (mode === 'sub') { envUpd(envT); return; }       // 기질 수준 인산화는 ▶ 재생 막대(player)가 그려요
          const w = rotF * 3.2, grad = gcur;
          ang += w * dt; rotor.rotation.y = -ang;
          // β 구조 변화 (열림 → 느슨 → 단단)
          const stp = Math.floor(ang / (Math.PI * 2 / 3));
          betas.forEach((b, i) => { const s = (stp + i) % 3; b.m.material.color.setHex(s === 0 ? 0x86efac : s === 1 ? 0x22c55e : 0x15803d); b.m.scale.set(1, 1.35 - (s === 2 ? 0.1 : 0), 1); });
          if (stp !== cnt) { cnt = stp; if (rotF > 0.02) spawnATP(betas[stp % 3].a + 0.2); }
          // H⁺ 흐름: 회전자가 36° 돌 때마다 하나
          stepAcc += w * dt / (Math.PI * 2 / 10);
          while (stepAcc >= 1) {
            stepAcc -= 1;
            if (hs.length) {
              let bi = 0, bd = 1e9; hs.forEach((o, i) => { const d = Math.hypot(o.m.position.x - AX, o.m.position.y - 1.0); if (d < bd) { bd = d; bi = i; } });
              const o = hs.splice(bi, 1)[0];
              trans.push({ m: o.m, pts: [o.m.position.clone(), new V(AX + 0.7, 0.9, 0), new V(AX + 0.72, 0.1, 0), new V(AX + 0.62, -0.5, 0), new V(AX + 0.9, -1.4, 0.1)], t: 0, dur: 0.7, end: 'mat' });
            }
          }
          // 전자 전달계가 H⁺를 퍼 올려요
          pumpAcc += pumpF * 3.2 * dt / (Math.PI * 2 / 10) / 3 * (0.6 + 0.4 * grad);
          leakAcc += leakF * 4 * dt;
          while (leakAcc >= 1) { leakAcc -= 1; if (hs.length) { const o = hs.splice((Math.random() * hs.length) | 0, 1)[0]; const lx = (Math.random() * 2 - 1) * 3.6; trans.push({ m: o.m, pts: [o.m.position.clone(), new V(lx, 0.5, -0.6), new V(lx, -0.5, -0.6), new V(lx, -1.3, -0.4)], t: 0, dur: 0.8, end: 'mat' }); } }
          const target = Math.round(3 + grad * 22);
          while (pumpAcc >= 1) {
            pumpAcc -= 1;
            const i = Math.floor(Math.random() * 3), x = CX[i];
            const m = new THREE.Mesh(hGeo, hMat); m.position.set(x, -0.9, 0.0); chemi.add(m);
            trans.push({ m, pts: [m.position.clone(), new V(x + 0.05, -0.2, 0.1), new V(x, 0.5, 0), new V(x + (Math.random() - 0.5) * 0.8, 1.2, (Math.random() - 0.5)), ], t: 0, dur: 0.8, end: 'ims' });
            cxMats[i].emissive.setHex(0x886600); setTimeout(() => cxMats[i].emissive.setHex(0x000000), 150);
          }
          // 이동 중인 H⁺
          for (let i = trans.length - 1; i >= 0; i--) {
            const tr = trans[i]; tr.t += dt; const k = Math.min(1, tr.t / tr.dur), n = tr.pts.length - 1, f = k * n, j = Math.min(n - 1, Math.floor(f));
            tr.m.position.lerpVectors(tr.pts[j], tr.pts[j + 1], f - j);
            if (k >= 1) {
              trans.splice(i, 1);
              if (tr.end === 'ims') hs.push({ m: tr.m, v: new V(Math.random() - .5, Math.random() - .5, Math.random() - .5).setLength(0.9), s: 1 });
              else { mat_.push({ m: tr.m, v: new V(Math.random() - .5, -0.5, Math.random() - .5).setLength(0.9), s: 1, die: 1.2 }); }
            }
          }
          while (hs.length < target) newH(rndIMS(), hs);
          while (hs.length > target) { const o = hs.pop(); chemi.remove(o.m); }
          hs.forEach((o) => wander(o, dt, 0.8, 2.4));
          for (let i = mat_.length - 1; i >= 0; i--) { const o = mat_[i]; wander(o, dt, -3.0, -0.8); if (o.die !== undefined) { o.die -= dt; o.m.scale.setScalar(Math.max(0.01, Math.min(1, o.die))); if (o.die <= 0) { chemi.remove(o.m); mat_.splice(i, 1); } } }
          while (mat_.length < 4) newH(rndMat(), mat_);
          for (let i = atps.length - 1; i >= 0; i--) { const a = atps[i]; a.t += dt; a.g.position.addScaledVector(a.v, dt); a.g.scale.setScalar(Math.max(0.01, 1 - a.t / 2.2)); if (a.t > 2.2) { chemi.remove(a.g); atps.splice(i, 1); } }
        },
        sync() { poll(); text(); },
      };
    },
  });
})();
