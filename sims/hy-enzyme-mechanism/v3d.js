/* hy-enzyme-mechanism · 3D 효소–기질 복합체
   효소의 활성 부위에 기질이 결합해 효소–기질 복합체(ES)가 되고, 생성물이 되어 떨어져 나가요.
   열쇠–자물쇠 모형(모양이 처음부터 꼭 맞음)과 유도 적합 모형(결합하면서 활성 부위가 기질에 맞게 변함)을 비교해요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const narrow = window.innerWidth < 600 || window.innerHeight > window.innerWidth * 1.1;
  const COL = { enz: 0x3b9ae8, site: 0x0c4a6e, subA: 0xfb7185, subB: 0xfacc15, near: 0xa78bfa, far: 0x34d399 };

  window.SciSim3D.attach({
    title: '효소–기질 복합체 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: narrow ? 14 : 11.5, theta: 0.25, phi: 1.05, target: [0, 0.6, 0], min: 6, max: 20 },
    autoRotate: 0,
    levels: [0, 1],
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const V = THREE.Vector3;
      let model = 'induced', sub = 'S';
      const std = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.4, metalness: 0.03 }, o || {}));

      /* ---------- 효소: 몸통 + 두 턱 (사이 홈이 활성 부위) ---------- */
      const enz = new THREE.Group(); root.add(enz);
      const enzMat = std(COL.enz, { roughness: 0.34 });
      const body = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), enzMat); body.scale.set(2.5, 1.35, 1.7); body.position.y = -0.9; enz.add(body);
      const jawL = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), enzMat), jawR = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), enzMat);
      [jawL, jawR].forEach((j) => { j.scale.set(0.95, 1.25, 1.45); enz.add(j); });
      // 군데군데 작은 혹 (단백질 표면 느낌)
      const bumpMat = std(0x7dd3fc, { roughness: 0.4 });
      [[-1.9, -0.5, 0.9, 0.45], [1.8, -0.8, 1.0, 0.5], [0.4, -1.8, 1.0, 0.5], [-0.9, -1.7, -1.0, 0.55], [1.5, -0.3, -1.1, 0.45], [-2.2, -1.1, -0.2, 0.4]].forEach((b) => {
        const m = new THREE.Mesh(new THREE.SphereGeometry(b[3], 24, 18), bumpMat); m.position.set(b[0], b[1], b[2]); enz.add(m);
      });
      // 활성 부위 바닥: 어두운 홈 + 기질 모양 틀(유령)
      const siteMat = std(COL.site, { roughness: 0.6, emissive: 0x082f49 });
      const pocket = new THREE.Mesh(new THREE.SphereGeometry(0.62, 28, 20), siteMat); pocket.scale.set(1.0, 0.45, 1.0); pocket.position.set(0, 0.0, 0); enz.add(pocket);
      const ghostMat = std(0xffffff, { transparent: true, opacity: 0.18, emissive: 0x7dd3fc, emissiveIntensity: 0.6, depthWrite: false });
      const ghost = new THREE.Group(); ghost.position.set(0, 0.46, 0); enz.add(ghost);
      [[-0.3, 0], [0.3, 0]].forEach((p) => { const g = new THREE.Mesh(new THREE.SphereGeometry(0.36, 20, 16), ghostMat); g.position.set(p[0], 0, 0); ghost.add(g); });
      const waterMat = std(0xe0f2fe, { transparent: true, opacity: 0.0 });
      let gap = 0.78, gapT = 0.78;                          // 두 턱 사이 절반 간격
      function placeJaws() {
        jawL.position.set(-(gap + 0.95 * 0.85), 0.6, 0); jawR.position.set(gap + 0.95 * 0.85, 0.6, 0);
        const lean = (gap - 0.5) * 0.25; jawL.rotation.z = lean; jawR.rotation.z = -lean;
      }
      placeJaws();

      /* ---------- 기질 · 생성물 ---------- */
      function makeSub(kind) {
        const g = new THREE.Group();
        if (kind === 'far') {
          const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.62, 1), std(COL.far, { roughness: 0.35 })); g.add(m);
          g.userData.parts = [m];
        } else {
          const ra = kind === 'near' ? 0.45 : 0.36, rb = kind === 'near' ? 0.27 : 0.36;
          const a = new THREE.Mesh(new THREE.SphereGeometry(ra, 28, 20), std(kind === 'near' ? 0xc4b5fd : COL.subA, { roughness: 0.3 }));
          const b = new THREE.Mesh(new THREE.SphereGeometry(rb, 28, 20), std(kind === 'near' ? 0x93c5fd : COL.subB, { roughness: 0.3 }));
          a.position.x = -0.3; b.position.x = 0.3; g.add(a, b);
          const bond = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.4, 14), std(0xe2e8f0)); bond.rotation.z = Math.PI / 2; g.add(bond);
          g.userData.parts = [a, b]; g.userData.bond = bond; g.userData.a = a; g.userData.b = b;
        }
        return g;
      }
      let subG = null, ph = 'in', t = 0, count = 0, msg = '';
      const L_enz = label('효소', body, { color: '#075985', offset: [0, -1.3, 0] });
      const L_site = label('활성 부위', ghost, { color: '#0f3b57', offset: [0, 0.25, 0] });
      const L_sub = label('기질', new THREE.Object3D(), { color: '#9f1239' });
      const L_prod = label('생성물', new THREE.Object3D(), { color: '#92400e' });
      const holder = new THREE.Object3D(); root.add(holder);
      L_sub.obj = holder; L_prod.obj = holder;

      function restart() {
        if (subG) root.remove(subG);
        subG = makeSub(sub); subG.position.set(0.8, 3.7, 0.4); root.add(subG);
        ph = 'in'; t = 0; gap = gapT = model === 'induced' ? 1.15 : 0.78; placeJaws();
        L_sub.show(true); L_prod.show(false); text();
      }
      function text() {
        const fit = sub === 'S', near = sub === 'near';
        const ok = fit || (near && model === 'induced');
        const h = [
          model === 'lock' ? '<b>열쇠–자물쇠 모형</b> · 활성 부위 모양이 처음부터 기질과 꼭 맞아요.' : '<b>유도 적합 모형</b> · 기질이 결합하면 활성 부위가 기질에 맞게 변해요.',
          ok ? (ph === 'in' ? '기질이 활성 부위로 다가와요.' : ph === 'bind' ? '결합해서 효소–기질 복합체(ES)가 돼요.' : ph === 'react' ? '반응이 일어나요.' : ph === 'out' ? '생성물이 떨어져 나가고, 효소는 그대로 남아 다시 써요.' : '') : (ph === 'jam' ? '모양이 맞지 않아 결합하지 못해요. 효소는 특정한 기질에만 작용해요(기질 특이성).' : '모양이 달라 보이지만 어떻게 될까요?'),
          '<span style="color:#9fb0d4">반응 ' + count + '회</span>',
        ];
        info(h.join('<br>'));
      }

      const sIn = new V(), sTarget = new V(0, 0.55, 0);
      let infoPh = '';
      function step(dt) {
        t += dt;
        const ok = sub === 'S' || (sub === 'near' && model === 'induced');
        const u = subG.userData;
        const ease = (k) => { k = Math.max(0, Math.min(1, k)); return k * k * (3 - 2 * k); };
        if (ph === 'in') {
          const k = ease(t / 1.9);
          const target = ok ? sTarget : new V(0, 1.7, 0);
          subG.position.lerpVectors(new V(0.8, 3.7, 0.4), target, k);
          subG.rotation.z = (1 - k) * 1.6 * (sub === 'far' ? 1 : 1); subG.rotation.y = (1 - k) * 0.8;
          if (model === 'induced') gapT = 1.15;
          if (t > 1.9) { ph = ok ? 'bind' : 'jam'; t = 0; L_sub.show(true); if (ok) { gapT = sub === 'near' ? 0.7 : 0.62; } }
        } else if (ph === 'bind') {
          subG.rotation.set(0, 0, 0);
          ghostMat.opacity = 0.18 * (1 - ease(t / 0.6));
          if (t > 1.1) { ph = 'react'; t = 0; }
        } else if (ph === 'react') {
          // 결합이 늘어나다가 끊어져요
          const k = ease(t / 1.2);
          if (u.a) { u.a.position.x = -0.3 - 0.22 * k; u.b.position.x = 0.3 + 0.22 * k; u.bond.scale.set(1, 1 - k * 0.9, 1 - k * 0.9); u.bond.visible = k < 0.9; u.bond.scale.y = 1 + k * 1.2; }
          subG.position.y = 0.55 + 0.04 * Math.sin(t * 40) * k;
          if (t > 1.2) { ph = 'out'; t = 0; L_sub.show(false); L_prod.show(true); gapT = model === 'induced' ? 1.15 : 0.78; }
        } else if (ph === 'out') {
          const k = ease(t / 1.6);
          if (u.a) { u.a.position.set(-0.52 - 1.6 * k, 0.9 * k, 0.5 * k); u.b.position.set(0.52 + 1.6 * k, 0.9 * k, -0.5 * k); }
          ghostMat.opacity = 0.18 * k;
          if (t > 2.2) { count++; restart(); }
        } else if (ph === 'jam') {
          const k = t / 1.6;
          subG.position.y = 1.7 + (k < 0.5 ? 0 : 1) * (k - 0.5) * 4; subG.rotation.z = Math.sin(t * 22) * 0.18 * (1 - k);
          if (t > 2.4) { count++; restart(); }
        }
        if (ph !== infoPh) { infoPh = ph; text(); }
        gap += (gapT - gap) * Math.min(1, dt * 6); placeJaws();
        // 활성 부위 틀 모양 (유도 적합에서는 결합 후 기질과 같아져요)
        ghost.visible = ph !== 'react';
        holder.position.copy(subG.position).add(new V(0, 0.95, 0));
        if (ph === 'out') holder.position.set(0, 2.1, 0);
      }

      const segM = controls.segment('모형', [{ value: 'lock', label: '🔑 열쇠–자물쇠' }, { value: 'induced', label: '🤝 유도 적합' }], model, (v) => { model = v; restart(); });
      const segS = controls.segment('기질', [{ value: 'S', label: '맞는 S' }, { value: 'near', label: '비슷한 S′' }, { value: 'far', label: '다른 S″' }], sub, (v) => { sub = v; restart(); });
      restart();
      let lastM = null, lastS = null;
      return {
        update(dt) {
          dt = Math.min(dt, 0.05);
          const c = window.__sim && window.__sim.S && window.__sim.S.cx;
          if (c && (c.model !== lastM || c.sub !== lastS)) { lastM = c.model; lastS = c.sub; if (c.model !== model || c.sub !== sub) { model = c.model; sub = c.sub; segM.set(model); segS.set(sub); restart(); } }
          step(dt);
          enz.position.y = 0.04 * Math.sin(performance.now() / 700);
        },
        sync() {},
      };
    },
  });
})();
