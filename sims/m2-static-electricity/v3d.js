/* m2-static-electricity · 3D 마찰 전기와 정전기 유도
   ① 마찰 전기(전자의 이동) ② 전기력 ③ 정전기 유도 ④ 검전기를 입체로 살펴봐요.
   파랑 (−) = 전자(음전하), 빨강 (+) = 양전하. 움직이는 것은 전자뿐이에요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHN = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const NEG = 0x3f78ff, POS = 0xff4a55;
  const SC = [{ v: 'rub', l: '마찰 전기' }, { v: 'force', l: '전기력' }, { v: 'induce', l: '정전기 유도' }, { v: 'scope', l: '검전기' }];

  window.SciSim3D.attach({
    title: '정전기 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: PHN ? 13 : 9, theta: 0.3, phi: 1.3, min: 5, max: 22, target: [0, -0.3, 0] },
    autoRotate: 0,
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const V3 = THREE.Vector3;
      const mat = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.5, metalness: 0.05 }, o || {}));
      const sm = () => window.__sim;
      // ± 표시 (스프라이트)
      const texC = {};
      function tex(sign) {
        if (texC[sign]) return texC[sign];
        const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
        g.fillStyle = sign > 0 ? '#e2464b' : '#2f6df6'; g.beginPath(); g.arc(32, 32, 29, 0, 7); g.fill();
        g.strokeStyle = '#fff'; g.lineWidth = 8; g.lineCap = 'round'; g.beginPath(); g.moveTo(18, 32); g.lineTo(46, 32); if (sign > 0) { g.moveTo(32, 18); g.lineTo(32, 46); } g.stroke();
        const t = new THREE.CanvasTexture(c); return (texC[sign] = t);
      }
      function mark(sign, s) { const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex(sign), transparent: true, depthTest: false })); m.scale.setScalar(s || 0.34); m.renderOrder = 10; return m; }
      function setMark(m, sign, a) { m.material.map = tex(sign); m.material.opacity = a; m.visible = a > 0.03; m.material.needsUpdate = true; }
      function arrow(col) {
        const g = new THREE.Group(), m = new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.4, roughness: 0.4 });
        const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1, 10), m), hd = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.4, 14), m); g.add(sh, hd); g.userData = { sh, hd }; return g;
      }
      function setArrowX(g, x0, x1, y, z) { // 가로 화살표
        const L = Math.abs(x1 - x0), dir = Math.sign(x1 - x0) || 1; g.visible = L > 0.05; if (!g.visible) return;
        const { sh, hd } = g.userData, sl = Math.max(0.01, L - 0.4);
        g.position.set(x0, y, z); g.rotation.set(0, 0, -dir * Math.PI / 2);
        sh.scale.y = sl; sh.position.y = sl / 2; hd.position.y = sl + 0.2;
      }
      const floor = new THREE.Mesh(new THREE.BoxGeometry(14, 0.1, 6), mat(0x141b30, { roughness: 0.85, metalness: 0 })); floor.position.set(0, -2.3, 0); floor.receiveShadow = true; root.add(floor);

      let scene = 'rub', rodSign = -1, c = 0.5, signB = 1, signA = -1, rubbing = false, R = 0, obj = 'metal';
      const G = {}; SC.forEach((s) => { G[s.v] = new THREE.Group(); G[s.v].visible = false; root.add(G[s.v]); });
      const labsBy = {};
      const lb = (sc, t, o, off, col) => { const l = label(t, o, { offset: off, color: col }); (labsBy[sc] = labsBy[sc] || []).push(l); l.show(false); return l; };

      /* ===== A. 마찰 전기 ===== */
      const A = { rodType: 'plastic', t: 0 };
      {
        const g = G.rub;
        const cloth = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.35, 2.8), mat(0xd9b99b, { roughness: 0.95 })); cloth.position.set(0, -1.9, 0); cloth.receiveShadow = true; g.add(cloth);
        A.rod = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 4.2, 28), mat(0x8a6fd1, { roughness: 0.3 })); A.rod.rotation.z = Math.PI / 2; A.rod.castShadow = true; g.add(A.rod);
        A.pm = []; A.nm = []; A.el = [];
        for (let i = 0; i < 12; i++) {
          const p = mark(1, 0.3), n = mark(-1, 0.3); g.add(p, n); A.pm.push(p); A.nm.push(n);
          const e = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 10), mat(NEG, { emissive: 0x1a3ab0, emissiveIntensity: 0.6 })); g.add(e); A.el.push(e);
        }
        lb('rub', '털가죽(천)', cloth, [-2.0, 0.4, 0]); A.lr = lb('rub', '막대', A.rod, [0, 0.8, 0]);
      }
      /* ===== B. 전기력 ===== */
      const B = {};
      {
        const g = G.force; const Ls = 3.4, py = 2.2;
        const bar = new THREE.Mesh(new THREE.BoxGeometry(8, 0.14, 0.2), mat(0x56627e, { metalness: 0.5 })); bar.position.set(0, py, 0); g.add(bar);
        B.s = [0, 1].map((i) => {
          const grp = new THREE.Group(); const ball = new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 22), mat(0xe8eaf0, { roughness: 0.25, metalness: 0.3 })); ball.position.y = -Ls; ball.castShadow = true;
          const thread = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, Ls, 6), new THREE.MeshBasicMaterial({ color: 0xd0d6e4 })); thread.position.y = -Ls / 2;
          const mk = mark(1, 0.5); mk.position.set(0, -Ls, 0.52); grp.add(ball, thread, mk); g.add(grp); grp.userData = { ball, mk }; return grp;
        });
        B.ar = [arrow(0xffd34d), arrow(0xffd34d)]; B.ar.forEach((a) => g.add(a));
        lb('force', '전기력', B.s[1].userData.ball, [0.0, 0.9, 0], 'rgba(255,211,77,.95)').el.style.color = '#1b2333';
      }
      /* ===== C. 정전기 유도 ===== */
      const Cc = {};
      {
        const g = G.induce;
        Cc.rod = new THREE.Group(); const rm = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 2.6, 28), mat(0x8a6fd1, { roughness: 0.3 })); rm.rotation.z = Math.PI / 2; Cc.rod.add(rm);
        Cc.rm = []; for (let i = 0; i < 4; i++) { const m = mark(-1, 0.32); Cc.rod.add(m); Cc.rm.push(m); } g.add(Cc.rod);
        Cc.cond = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 4.4, 36), mat(0xc3cbd9, { metalness: 0.7, roughness: 0.25, transparent: true, opacity: 0.45, depthWrite: false })); Cc.cond.rotation.z = Math.PI / 2; Cc.cond.position.set(1.8, 0, 0); Cc.cond.renderOrder = 2; g.add(Cc.cond);
        Cc.ions = []; Cc.els = []; Cc.ex = [];
        for (let i = 0; i < 18; i++) {
          const x = -1.9 + (i % 6) * 0.76, y = (Math.floor(i / 6) - 1) * 0.45, z = (i % 2 ? 0.2 : -0.2);
          const ion = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8), mat(POS, { emissive: 0x7a1010, emissiveIntensity: 0.5 })); ion.position.set(1.8 + x, y, z); g.add(ion);
          const el = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8), mat(NEG, { emissive: 0x1a3ab0, emissiveIntensity: 0.7 })); el.position.set(1.8 + x + 0.2, y + 0.1, z + 0.1); g.add(el); Cc.els.push(el); Cc.ex.push(el.position.clone());
        }
        Cc.nm = mark(-1, 0.55); Cc.fm = mark(1, 0.55); g.add(Cc.nm, Cc.fm);
        Cc.l1 = lb('induce', '가까운 쪽', Cc.cond, [-1.7, 1.2, 0]); Cc.l2 = lb('induce', '먼 쪽', Cc.cond, [2.1, 1.2, 0]);
      }
      /* ===== D. 검전기 ===== */
      const Dd = {};
      {
        const g = G.scope;
        const jar = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 3.4, 40, 1, true), new THREE.MeshStandardMaterial({ color: 0xcfe6f8, transparent: true, opacity: 0.2, roughness: 0.05, side: THREE.DoubleSide, depthWrite: false })); jar.position.y = -0.5; jar.renderOrder = 2; g.add(jar);
        const base = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.7, 0.2, 40), mat(0x56627e, { metalness: 0.4 })); base.position.y = -2.25; g.add(base);
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.6, 12), mat(0xd7dde8, { metalness: 0.9, roughness: 0.2 })); stem.position.y = 0.2; g.add(stem);
        Dd.knob = new THREE.Mesh(new THREE.SphereGeometry(0.55, 32, 22), mat(0xd7dde8, { metalness: 0.9, roughness: 0.15 })); Dd.knob.position.y = 2.0; Dd.knob.castShadow = true; g.add(Dd.knob);
        Dd.lv = [-1, 1].map((s) => { const p = new THREE.Group(); p.position.set(0, -1.0, 0); const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.3, 0.8), mat(0xe6c35a, { metalness: 0.9, roughness: 0.2 })); leaf.position.y = -0.65; p.add(leaf); g.add(p); return p; });
        Dd.rod = new THREE.Group(); const rm = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 3, 28), mat(0x8a6fd1, { roughness: 0.3 })); rm.rotation.z = Math.PI / 2; Dd.rod.add(rm); Dd.rmk = mark(-1, 0.4); Dd.rod.add(Dd.rmk); g.add(Dd.rod);
        Dd.km = mark(1, 0.4); Dd.lm = [mark(1, 0.34), mark(1, 0.34)]; g.add(Dd.km, ...Dd.lm);
        lb('scope', '금속 박(잎)', Dd.lv[1], [0.9, -0.7, 0]); lb('scope', '금속 판(꼭지)', Dd.knob, [1.2, 0.5, 0]);
      }

      /* ===== 조작 ===== */
      const txtOf = {
        rub: () => `<b>마찰 전기</b>: 문지르면 <b>전자</b>가 이동해요.<br>${A.rodType === 'plastic' ? '털가죽의 전자가 막대로 → 막대는 <b style="color:#8fb0ff">(−)</b>, 털가죽은 <b style="color:#ff8f8f">(+)</b>' : '막대의 전자가 천으로 → 막대는 <b style="color:#ff8f8f">(+)</b>, 천은 <b style="color:#8fb0ff">(−)</b>'}<br>전자를 주고받아 대전된 물체가 돼요.`,
        force: () => (signA === signB ? '<b>같은 전하</b>끼리는 서로 <b>밀어요</b> (척력).' : '<b>다른 전하</b>끼리는 서로 <b>당겨요</b> (인력).') + '<br>거리가 가까울수록 전기력이 커요.',
        induce: () => `대전체를 가까이 하면 도체 속 <b>전자</b>가 ${rodSign < 0 ? '<b>밀려서</b> 먼 쪽으로' : '<b>끌려서</b> 가까운 쪽으로'} 움직여요.<br>가까운 쪽엔 <b>다른 종류</b>, 먼 쪽엔 <b>같은 종류</b>의 전하가 나타나요.`,
        scope: () => `${rodSign < 0 ? '(−)' : '(+)'}대전체를 꼭지에 가까이 하면 금속 박이 <b>벌어져요</b>.<br>금속 박에 <b>같은 종류의 전하</b>가 생겨 서로 밀어내기 때문이에요.`,
      };
      function setScene(s) {
        scene = s; SC.forEach((q) => { G[q.v].visible = q.v === s; });
        Object.keys(labsBy).forEach((k) => labsBy[k].forEach((l) => l.show(k === s)));
        ctlRub.forEach((b) => { b.style.display = s === 'rub' ? '' : 'none'; });
        ctlRod.forEach((b) => { b.style.display = s === 'induce' || s === 'scope' ? '' : 'none'; });
        info(txtOf[s]());
      }
      const sg = controls.segment('장면', SC.map((q) => ({ label: q.l, value: q.v })), scene, setScene);
      const ctlRub = [], ctlRod = [];
      const bRub = controls.button('🧣 문지르기', () => { rubbing = !rubbing; bRub.textContent = rubbing ? '⏸ 멈추기' : '🧣 문지르기'; }); ctlRub.push(bRub);
      ctlRub.push(controls.button('막대 바꾸기 (플라스틱/유리)', () => { A.rodType = A.rodType === 'plastic' ? 'glass' : 'plastic'; R = 0; A.rod.material.color.setHex(A.rodType === 'plastic' ? 0x8a6fd1 : 0x9fd8ee); info(txtOf.rub()); }));
      ctlRub.push(controls.button('처음으로', () => { R = 0; rubbing = false; bRub.textContent = '🧣 문지르기'; }));
      const bSign = controls.button('대전체 부호 바꾸기', () => { if (scene === 'force') { signB = -signB; } else { rodSign = -rodSign; } info(txtOf[scene]()); });
      const bSignA = controls.button('왼쪽 구 부호 바꾸기', () => { signA = -signA; info(txtOf.force()); });
      const cR = controls.range('거리 가까이', 0, 1, 0.01, c, (v) => { c = v; }, (v) => (v > 0.66 ? '아주 가까이' : v > 0.33 ? '가까이' : '멀리'));
      const upd = () => { bSign.textContent = scene === 'force' ? '오른쪽 구 부호 바꾸기' : '대전체 부호 바꾸기'; bSignA.style.display = scene === 'force' ? '' : 'none'; bSign.style.display = scene === 'rub' ? 'none' : ''; cR.set && 0; };
      controls.button('이름표', () => { labOn = !labOn; Object.keys(labsBy).forEach((k) => labsBy[k].forEach((l) => l.show(labOn && k === scene))); });
      let labOn = true;
      ctlRod.push(bSign);
      setScene('rub'); upd();
      function fromScene() { const s = sm() && sm().S && sm().S.scene; if (!s || s === lastSc) return; lastSc = s; const m = { rub: 'rub', force: 'force', induce: 'induce', scope: 'scope' }[s]; if (m && m !== scene) { setScene(m); sg.set(m); upd(); } }
      let lastSc = '', k0 = 0, T = 0;
      const dm = new V3();
      return {
        sync() { lastSc = ''; fromScene(); },
        update(dt, t) {
          if ((k0++ % 15) === 0) { fromScene(); upd(); }
          T += dt;
          if (scene === 'rub') {
            if (rubbing) { A.t += dt * 3; R = Math.min(1, R + dt * 0.22); }
            const px = rubbing ? Math.sin(A.t) * 0.9 : 0;
            A.rod.position.set(px, rubbing ? -1.3 : -0.9, 0); A.rod.rotation.z = Math.PI / 2; A.rod.rotation.y = rubbing ? 0 : 0;
            const sgn = A.rodType === 'plastic' ? 1 : -1;    // 1: 전자가 천 → 막대
            for (let i = 0; i < 12; i++) {
              const ex = -1.7 + (i % 6) * 0.68, ez = (i < 6 ? -0.6 : 0.6);
              const cl = new V3(ex, -1.68, ez), rd = new V3(A.rod.position.x + (i % 6 - 2.5) * 0.7, A.rod.position.y + 0.32 * (i < 6 ? 1 : 1), ez * 0.3);
              const k = R;   // 0이면 원래 자리 (플라스틱: 천, 유리: 막대)
              const from = sgn > 0 ? cl : rd, to = sgn > 0 ? rd : cl; const wob = rubbing ? Math.sin(t * 8 + i) * 0.08 : 0;
              A.el[i].position.lerpVectors(from, to, i / 12 < R ? 1 : 0); A.el[i].position.y += 0.05 * Math.sin(t * 3 + i) + wob;
              const moved = i / 12 < R;
              // 천 쪽 / 막대 쪽에 전하 표시
              const rodS = sgn > 0 ? -1 : 1, clS = -rodS;
              const pr = rd.clone(); pr.y += 0.0; pr.z = ez * 0.9;
              const a = moved ? 0.95 : 0;
              A.nm[i].position.copy(rd).add(new V3(0, 0.0, ez > 0 ? 0.36 : -0.36)); setMark(A.nm[i], rodS, a);
              A.pm[i].position.set(cl.x, -1.62, ez); setMark(A.pm[i], clS, a);
            }
            A.lr.set(A.rodType === 'plastic' ? '플라스틱 막대' : '유리 막대');
            if (R > 0.98 && (k0 % 30) === 0) info(txtOf.rub() + '<br>다 문질렀어요!');
          } else if (scene === 'force') {
            const sep = 2.2 + (1 - c) * 3.6, F = Math.min(0.75, 1.9 / (sep * sep) * 2.2), same = signA === signB;
            const dir = same ? 1 : -1;
            [[-1, signA], [1, signB]].forEach(([s, sg2], i) => {
              const p = B.s[i], th = Math.min(0.85, F) * dir * s;
              p.position.set(s * sep / 2, 2.2, 0); p.rotation.z = th;   // 같은 부호: 바깥으로
              setMark(p.userData.mk, sg2, 1); p.userData.ball.material.color.setHex(sg2 > 0 ? 0xffb3b8 : 0xb3c8ff);
            });
            // 화살표: 각 구에 작용하는 전기력
            const yA = 2.2 - 3.4 * Math.cos(Math.min(0.85, F)), len = 0.4 + 2.2 * F;
            const xl = -sep / 2 - 3.4 * Math.sin(Math.min(0.85, F)) * dir * 1 * -1 * -1, xr = sep / 2 + 3.4 * Math.sin(Math.min(0.85, F)) * dir;
            const bxL = -sep / 2 - dir * 3.4 * Math.sin(Math.min(0.85, F)), bxR = sep / 2 + dir * 3.4 * Math.sin(Math.min(0.85, F));
            setArrowX(B.ar[0], bxL, bxL - dir * len, yA, 0.0); setArrowX(B.ar[1], bxR, bxR + dir * len, yA, 0.0);
          } else if (scene === 'induce') {
            const rx = -2.4 + (1 - c) * -2.6 + 0.0; // 가까울수록 (x가 커짐)
            Cc.rod.position.set(-0.8 - (1 - c) * 3.2, 0, 0);
            Cc.rm.forEach((m, i) => { m.position.set(-0.9 + i * 0.6, 0.55, 0.1); setMark(m, rodSign, 1); });
            Cc.rod.children[0].material.color.setHex(rodSign < 0 ? 0x8a6fd1 : 0x9fd8ee);
            const shift = (rodSign < 0 ? 1 : -1) * 1.0 * c;      // 전자가 쏠리는 정도
            Cc.els.forEach((e, i) => { e.position.set(Cc.ex[i].x + shift, Cc.ex[i].y + Math.sin(t * 2 + i) * 0.02, Cc.ex[i].z); });
            // 끝 쪽 전하 표시
            const nearSign = -rodSign, farSign = rodSign;
            Cc.nm.position.set(-0.55, 0, 0.9); setMark(Cc.nm, nearSign, Math.min(1, c * 1.4)); Cc.fm.position.set(4.1, 0, 0.9); setMark(Cc.fm, farSign, Math.min(1, c * 1.4));
          } else {
            Dd.rod.position.set(0.5 + (1 - c) * 2.8, 2.9 - (1 - c) * 0.8, 0); Dd.rod.rotation.z = 0.3;
            Dd.rod.children[0].material.color.setHex(rodSign < 0 ? 0x8a6fd1 : 0x9fd8ee); setMark(Dd.rmk, rodSign, 1); Dd.rmk.position.set(-0.4, 0.4, 0.3);
            const phi = 0.06 + 0.85 * c;
            Dd.lv[0].rotation.z = phi; Dd.lv[1].rotation.z = -phi;
            setMark(Dd.km, -rodSign, Math.min(1, c * 1.5)); Dd.km.position.set(0.0, 2.0, 0.65);
            Dd.lv.forEach((p, i) => { const s = i ? 1 : -1; Dd.lm[i].position.set(-s * Math.sin(phi) * 1.0, -1.0 - Math.cos(phi) * 1.0, 0.45); setMark(Dd.lm[i], rodSign, Math.min(1, c * 1.5)); });
          }
        },
      };
    },
  });
})();
