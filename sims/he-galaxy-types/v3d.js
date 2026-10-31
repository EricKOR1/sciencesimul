/* he-galaxy-types · 3D 은하 모형
   같은 은하도 보는 각도(기울기 i)에 따라 달라 보여요. 타원 은하는 3차원 타원체, 나선·막대 나선·렌즈형은 원반+팽대부, 불규칙은 덩어리로 보며
   정면(face-on)과 옆(edge-on)에서 어떻게 보이는지, 타원 은하의 E 값(n = 10(1 − b/a))이 어떻게 달라지는지 확인해요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const TAU = Math.PI * 2, DEG = Math.PI / 180;
  const RD = 10;                                  // 원반 반지름 (임의 단위)
  function rng(seed) {
    return function () {
      seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const gauss = (R) => { let u = 0; while (u < 1e-9) u = R(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * R()); };
  const TYPES = [
    { k: 'E', f: 'E', nm: '타원 은하 E' }, { k: 'S0', f: 'S0', nm: '렌즈형 은하 S0' },
    { k: 'Sa', f: 'Sa', nm: '나선 은하 Sa' }, { k: 'Sb', f: 'Sb', nm: '나선 은하 Sb' }, { k: 'Sc', f: 'Sc', nm: '나선 은하 Sc' },
    { k: 'SBa', f: 'SBa', nm: '막대 나선 은하 SBa' }, { k: 'SBb', f: 'SBb', nm: '막대 나선 은하 SBb' }, { k: 'SBc', f: 'SBc', nm: '막대 나선 은하 SBc' },
    { k: 'Irr', f: 'Irr', nm: '불규칙 은하 Irr' },
  ];
  // 나선 은하의 팽대부 크기 · 팔이 감긴 정도(감김각) · 팔의 푸른 정도
  const SP = { S0: { rb: 3.6, pitch: 0, blue: 0 }, a: { rb: 3.4, pitch: 9, blue: 0.2 }, b: { rb: 2.4, pitch: 15, blue: 0.55 }, c: { rb: 1.4, pitch: 23, blue: 0.95 } };
  const NOTE = {
    E: '늙은 붉은 별이 대부분이고 새 별이 거의 안 태어나요. 매끈한 타원체예요.',
    S0: '원반은 있지만 나선팔이 없어요. 성간 물질이 적어요(예시 값 1 %).',
    Sa: '팽대부가 크고 나선팔이 촘촘히 감겨 있어요. 노란빛, 성간 물질 약 5 %(예시 값).',
    Sb: '팽대부와 팔이 중간 정도예요. 노란색~푸른색.',
    Sc: '팽대부가 작고 팔이 느슨하게 풀려 있어요. 푸른 별이 많고 성간 물질 약 15 %(예시 값).',
    Irr: '일정한 모양이 없어요. 젊은 푸른 별이 많고 성간 물질이 많아요(예시 값 25 %).',
  };

  const narrow = window.innerWidth < 600;
  const asp = narrow ? window.innerWidth / Math.max(300, window.innerHeight - 190) : 1.4;
  const FIT = Math.max(1, 1.0 / asp);

  window.SciSim3D.attach({
    title: '은하 모양 3D · 기울기에 따라 달라져요',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: 25 * FIT, theta: 0.4, phi: 1.2, fov: 42, min: 12, max: 90 },
    autoRotate: 0.18,
    build(ctx) {
      const { THREE, root, camera, label, info, controls, orbit, renderer } = ctx;
      const sim = window.__sim || null;
      const ctlEl = renderer.domElement.parentNode.parentNode.querySelector('.v3-ctl');
      const grp = (fn) => { const n0 = ctlEl.children.length; fn(); return Array.prototype.slice.call(ctlEl.children, n0); };

      const cv = document.createElement('canvas'); cv.width = cv.height = 64;
      const c2 = cv.getContext('2d'); const g2 = c2.createRadialGradient(32, 32, 0, 32, 32, 32);
      g2.addColorStop(0, 'rgba(255,255,255,1)'); g2.addColorStop(0.35, 'rgba(255,255,255,.55)'); g2.addColorStop(1, 'rgba(255,255,255,0)');
      c2.fillStyle = g2; c2.fillRect(0, 0, 64, 64);
      const dot = new THREE.CanvasTexture(cv);

      const model = new THREE.Group(); root.add(model);
      function clear() { while (model.children.length) { const o = model.children.pop(); if (o.geometry) o.geometry.dispose(); if (o.material && o.material.dispose) o.material.dispose(); } }
      function cloud(list, size, bright) { // list: [x, y, z, r, g, b]
        const n = list.length, pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
        for (let i = 0; i < n; i++) { const p = list[i]; pos.set([p[0], p[1], p[2]], i * 3); col.set([p[3] * bright, p[4] * bright, p[5] * bright], i * 3); }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
        const m = new THREE.Points(geo, new THREE.PointsMaterial({ size, map: dot, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: false }));
        m.frustumCulled = false; return m;
      }
      const C = (hex) => new THREE.Color(hex);
      const mixC = (a, b, t) => a.clone().lerp(b, t);
      const push = (arr, x, y, z, c, k) => { arr.push([x, y, z, c.r * k, c.g * k, c.b * k]); };

      /* ---- 상태 ---- */
      let type = 'Sb', nTrue = 4, prolate = false, showAxis = true, ell = null, axisLine = null;
      const labs = { bulge: label('팽대부', [0, 0, 0], { size: narrow ? 11 : 12.5 }), arm: label('나선팔', [0, 0, 0], { size: narrow ? 11 : 12.5 }), bar: label('막대', [0, 0, 0], { size: narrow ? 11 : 12.5 }), disc: label('원반', [0, 0, 0], { size: narrow ? 11 : 12.5 }) };
      const hideLabs = () => Object.keys(labs).forEach((k) => labs[k].show(false));

      /* ---- 모형 만들기 ---- */
      function buildEllipsoid() {
        const R = rng(11), pts = [], base = C('#ff9a3c'), core = C('#ffe0b0');
        for (let i = 0; i < 16000; i++) {
          const u = gauss(R), v = gauss(R), w = gauss(R), L = Math.hypot(u, v, w) || 1, r = 5.6 * Math.pow(R(), 0.8);
          const t = Math.min(1, r / 5.6); push(pts, u / L * r, v / L * r, w / L * r, mixC(core, base, t), 0.55 + 0.4 * R());
        }
        const cl = cloud(pts, 2.4, 0.6); model.add(cl); ell = { cl, pts };
        const sh = new THREE.Mesh(new THREE.SphereGeometry(1, 36, 24), new THREE.MeshBasicMaterial({ color: 0xffa94d, transparent: true, opacity: 0.08, depthWrite: false }));
        const wf = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), new THREE.MeshBasicMaterial({ color: 0xffd9a8, wireframe: true, transparent: true, opacity: 0.12 }));
        model.add(sh, wf); ell.sh = sh; ell.wf = wf;
        applyEllipsoid();
      }
      function axes() { const q = 1 - nTrue / 10, m = 5.8; return prolate ? { a: m * q, c: m } : { a: m, c: m * q }; } // a: 대칭축에 수직인 반지름, c: 대칭축 방향 반지름
      function applyEllipsoid() {
        if (!ell) return;
        const { a, c } = axes(), s = a / 5.6; // 점은 반지름 5.6 기준
        // 축(y)을 따라 늘이고 줄여요: 모든 점이 (a, c, a)에 맞춰져요 (a: 대칭축에 수직인 반지름, c: 대칭축 반지름)
        ell.cl.scale.set(s, c / 5.6, s); ell.sh.scale.set(a, c, a); ell.wf.scale.set(a, c, a);
        if (axisLine) axisLine.scale.y = Math.max(a, c) * 1.55 / 8;
      }
      function buildDisc(kind) {
        const bar = kind[0] === 'S' && kind[1] === 'B', arm = kind.slice(-1), P = kind === 'S0' ? SP.S0 : SP[arm];
        const R = rng(100 + kind.length * 7 + kind.charCodeAt(kind.length - 1)), pts = [], pb = [];
        const old = C('#ffd9a0'), yel = C('#ffc94d'), blu = C('#3f77ff'), pink = C('#ff6fa0'), core = C('#fff1d0');
        const rb = P.rb, Lb = bar ? Math.max(3.8, rb * 1.5 + 2) : 0, r0 = bar ? Lb : rb * 1.15;
        // 팽대부
        const nb = 3600;
        for (let i = 0; i < nb; i++) { const u = gauss(R), v = gauss(R), w = gauss(R), L = Math.hypot(u, v, w) || 1, r = rb * Math.pow(R(), 0.9) * 1.1; push(pts, u / L * r, v / L * r * 0.8, w / L * r, mixC(core, old, Math.min(1, r / (rb * 1.1))), 0.55 + 0.4 * R()); }
        // 막대
        if (bar) for (let i = 0; i < 2200; i++) { const x = (R() * 2 - 1) * Lb; push(pb, x, gauss(R) * 0.18, gauss(R) * 0.55 + x * 0.0, mixC(old, core, 0.35), 0.5 + 0.4 * R()); }
        // 원반: 안쪽이 더 촘촘한 부드러운 원반
        const nd = kind === 'S0' ? 9000 : 5500, discCol = kind === 'S0' ? C('#ffc89a') : mixC(yel, blu, P.blue * 0.35);
        for (let i = 0; i < nd; i++) { const r = Math.min(RD, rb * 0.6 + -Math.log(1 - R() * 0.96) * RD * 0.32), a = R() * TAU; push(pts, r * Math.cos(a), gauss(R) * 0.2, r * Math.sin(a), discCol, (kind === 'S0' ? 0.34 : 0.3) * (0.6 + 0.8 * R())); }
        // 나선팔 2개
        if (kind !== 'S0') {
          const k = Math.tan(P.pitch * DEG), TH = Math.log(RD / r0) / k, armCol = mixC(yel, blu, P.blue);
          for (let a = 0; a < 2; a++) for (let i = 0; i < 3300; i++) {
            const th = Math.pow(R(), 0.85) * TH, r = r0 * Math.exp(k * th), ang = th + a * Math.PI, sc = 0.18 + 0.05 * r;
            const x = r * Math.cos(ang) + gauss(R) * sc, z = r * Math.sin(ang) + gauss(R) * sc;
            const hot = R() < 0.07;
            push(pts, x, gauss(R) * 0.15, z, hot ? pink : mixC(armCol, C('#ffffff'), 0.25 * R()), hot ? 1.0 : 0.62 + 0.4 * R());
          }
        }
        model.add(cloud(pts, 2.0, 0.62)); if (pb.length) model.add(cloud(pb, 2.3, 0.6));
        // 이름표 자리
        labs.bulge.obj = [0, rb * 0.95 + 0.4, 0]; labs.bulge.off = [0, 0, 0];
        labs.disc.obj = [RD * 0.82, 0.2, RD * 0.2]; labs.disc.off = [0, 0, 0];
        if (kind !== 'S0') { const k = Math.tan(P.pitch * DEG), th = Math.log(RD * 0.7 / r0) / k, r = r0 * Math.exp(k * th); labs.arm.obj = [r * Math.cos(th), 0.3, r * Math.sin(th)]; }
        if (bar) labs.bar.obj = [-Lb * 0.9, 0.3, 0];
      }
      function buildIrr() {
        const R = rng(46), pts = [], clumps = [];
        for (let i = 0; i < 11; i++) clumps.push([gauss(R) * 3.6, gauss(R) * 1.4, gauss(R) * 3.2, 0.5 + R() * 1.4, R()]);
        const blu = C('#8db8ff'), wht = C('#dfe9ff'), pink = C('#ff86b0');
        for (let i = 0; i < 7000; i++) {
          const c = clumps[Math.floor(R() * clumps.length)], hot = c[4] > 0.7 || R() < 0.05;
          push(pts, c[0] + gauss(R) * c[3], c[1] + gauss(R) * c[3] * 0.6, c[2] + gauss(R) * c[3], hot ? pink : mixC(blu, wht, R() * 0.6), 0.5 + 0.5 * R());
        }
        for (let i = 0; i < 1500; i++) push(pts, gauss(R) * 4.5, gauss(R) * 1.8, gauss(R) * 4.2, C('#c4d4ff'), 0.25 + 0.2 * R());
        model.add(cloud(pts, 2.2, 0.75));
      }
      function rebuild() {
        clear(); ell = null; hideLabs();
        if (type === 'E') buildEllipsoid(); else if (type === 'Irr') buildIrr(); else buildDisc(type);
        if (axisLine) { axisLine.visible = showAxis && type !== 'Irr'; applyEllipsoid(); if (type !== 'E') axisLine.scale.y = 1.35 * RD / 8 * 0.6; }
        const L = labs;
        if (type === 'E' || type === 'Irr') { /* 이름표 없음 */ }
        else if (type === 'S0') { L.bulge.show(true); L.disc.show(true); }
        else { L.bulge.show(true); L.disc.show(true); L.arm.show(true); if (type[1] === 'B') L.bar.show(true); }
        eRange.forEach((n) => { n.style.display = type === 'E' ? '' : 'none'; });
        text(true);
      }

      /* ---- 대칭축 (시선과 이루는 각이 기울기 i) ---- */
      axisLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, -8, 0), new THREE.Vector3(0, 8, 0)]), new THREE.LineBasicMaterial({ color: 0x5eead4, transparent: true, opacity: 0.9 }));
      root.add(axisLine);
      const axTip = label('대칭축', [0, 0, 0], { color: 'rgba(15,100,90,.9)', size: narrow ? 11 : 12.5 });

      /* ---- 조작 ---- */
      let iRange = null, nRange = null, typeSeg = null;
      typeSeg = controls.segment('유형', TYPES.map((t) => ({ value: t.k, label: t.f })), type, (v) => { type = v; rebuild(); });
      iRange = controls.range('기울기 i', 3, 90, 1, 70, (v) => { orbit.phi = Math.max(0.05, v * DEG); }, (v) => v + '°' + (v <= 15 ? ' (정면)' : v >= 80 ? ' (옆)' : ''));
      const eRange = grp(() => {
        nRange = controls.range('실제 납작함 n', 0, 7, 1, nTrue, (v) => { nTrue = v; applyEllipsoid(); text(); }, (v) => 'E' + v);
        controls.segment('모양', [{ value: 0, label: '납작한 공' }, { value: 1, label: '길쭉한 공' }], 0, (v) => { prolate = !!v; applyEllipsoid(); text(); });
      });
      const axB = controls.button('대칭축 ✓', () => { showAxis = !showAxis; axB.classList.toggle('on', showAxis); axB.textContent = '대칭축 ' + (showAxis ? '✓' : '✕'); axisLine.visible = showAxis && type !== 'Irr'; }); axB.classList.add('on');

      /* ---- 안내 글 ---- */
      let lastTxt = '';
      function incl() { const p = Math.max(0.0, Math.min(Math.PI, orbit.phi)); return Math.min(p, Math.PI - p) / DEG; }
      function text(force) {
        const i = incl(), ci = Math.cos(i * DEG), si = Math.sin(i * DEG);
        let h;
        if (type === 'E') {
          const q = 1 - nTrue / 10, a = 1, c = prolate ? 1 / q : q;
          const L = Math.sqrt(ci * ci * a * a + si * si * c * c), lo = Math.min(a, L), hi = Math.max(a, L), ba = lo / hi, nApp = Math.round(10 * (1 - ba));
          h = '<b>' + (prolate ? '길쭉한' : '납작한') + ' 타원체 (실제 E' + nTrue + ')</b><br>보이는 모양: b/a ≈ <b>' + ba.toFixed(2) + '</b> → n = 10 × (1 − b/a) ≈ <b>E' + nApp + '</b><br>' +
            (nApp === nTrue ? '지금은 실제 모양과 같은 E' + nTrue + '로 보여요.' : '같은 은하도 기울기 i가 ' + (prolate ? '작을수록(끝쪽에서 볼수록)' : '작을수록(위에서 볼수록)') + ' 더 둥글게(E0에 가깝게) 보여요.');
        } else if (type === 'Irr') h = '<b>' + TYPES[8].nm + '</b><br>' + NOTE.Irr;
        else {
          const T = TYPES.find((t) => t.k === type), key = type === 'S0' ? 'S0' : type.slice(-1) === 'a' ? 'Sa' : type.slice(-1) === 'b' ? 'Sb' : 'Sc';
          h = '<b>' + T.nm + '</b><br>' + (NOTE[key] || '') + (type[1] === 'B' ? ' 중심에 <b>막대</b>가 있고 팔이 막대 끝에서 시작해요.' : '') +
            '<br>기울기 i = ' + Math.round(i) + '° → 보이는 b/a ≈ <b>' + ci.toFixed(2) + '</b>' + (i < 20 ? ' (정면: 팔이 잘 보여요)' : i > 75 ? ' (옆: 납작한 원반과 팽대부)' : '');
        }
        if (h !== lastTxt || force) { lastTxt = h; info(h); }
      }

      /* ---- 수업과 맞추기 (읽기만) ---- */
      let seenV = null, seenG = null;
      function readLesson() {
        try {
          const S = sim && sim.S; if (!S) return;
          if (S.view === seenV && S.gi === seenG) return;
          seenV = S.view; seenG = S.gi;
          if (S.view === 'v2' && sim.ELL && sim.ELL[S.gi]) { // 지금 재고 있는 타원 은하: 옆에서 본 납작한 타원체
            type = 'E'; nTrue = sim.ELL[S.gi].n; prolate = false; orbit.phi = 88 * DEG;
            if (nRange) nRange.set(nTrue); rebuild();
          } else if (S.view === 'v2f' && !/^S/.test(type)) { type = 'SBb'; orbit.phi = 60 * DEG; rebuild(); }
          typeSeg && typeSeg.set(type);
        } catch (e) { /* 수업 상태를 못 읽어도 괜찮아요 */ }
      }
      rebuild(); readLesson();

      return {
        update() {
          const i = incl(); if (iRange && Math.abs(iRange.value - i) > 0.7 && !document.activeElement.matches('input[type=range]')) iRange.set(Math.max(3, Math.min(90, Math.round(i))));
          axTip.obj = [0, (type === 'E' ? Math.max(axes().a, axes().c) : RD * 0.62) * 1.0 + 1.2, 0];
          axTip.show(showAxis && type !== 'Irr' && i > 28);
          text();
        },
        sync() { readLesson(); },
      };
    },
  });
})();
