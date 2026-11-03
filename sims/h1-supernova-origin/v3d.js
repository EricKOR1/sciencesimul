/* h1-supernova-origin · 3D 초신성: 별의 폭발과 새로운 시작
   2D 실험의 시간(0~1)과 같은 5장면: ① 폭발 직전 → ② 초신성 폭발 → ③ 성운으로 흩어짐 → ④ 다시 모이는 가스 구름 → ⑤ 태양계 탄생
   2D의 시간 슬라이더·①~⑤ 버튼과 3D의 ▶ 재생은 같은 시간을 써서 서로 맞춰져요. 금·은·우라늄 알갱이는 눌러 볼 수 있어요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHN = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const SR = 2.4;                 // 별의 반지름
  const LAY = [                   // 2D와 같은 층: [반지름 비율, 색, 이름]
    [1.0, 0x5b7fd6, '수소·헬륨'], [0.8, 0xe8b33e, '헬륨→탄소'], [0.62, 0x49b88d, '탄소·산소'], [0.46, 0x8e6bd8, '네온·마그네슘'], [0.32, 0xe8793f, '규소'], [0.18, 0xd4d8de, '철 핵'],
  ];
  const STAGES = [
    { n: '① 폭발 직전', t0: 0, cap: '질량이 큰 별 속에는 양파 껍질처럼 층이 쌓이고, 중심에 철 핵이 만들어져요. 철은 핵융합으로 에너지를 내지 못해요.' },
    { n: '② 초신성 폭발', t0: 0.18, cap: '철 핵이 붕괴하며 별이 폭발해요! 이 순간 철보다 무거운 금·은·우라늄이 만들어져요.' },
    { n: '③ 성운으로 흩어짐', t0: 0.40, cap: '별의 물질이 우주 공간으로 퍼져 성운이 돼요. 지금까지 만든 모든 원소가 섞여 있어요.' },
    { n: '④ 다시 모이는 가스 구름', t0: 0.62, cap: '성운의 물질이 중력으로 다시 모여 회전하는 원반이 돼요.' },
    { n: '⑤ 태양계 탄생', t0: 0.84, cap: '약 46억 년 전, 중심에 태양이, 둘레에 지구를 비롯한 행성이 생겼어요.' },
  ];
  const stageOf = (t) => { let k = 0; STAGES.forEach((s, i) => { if (t >= s.t0) k = i; }); return k; };
  const EL = { Au: { n: '금', c: 0xf5b301 }, Ag: { n: '은', c: 0xcbd5e1 }, U: { n: '우라늄', c: 0x84cc16 } };
  const TOK = [['Au', 0.34, 1.2], ['Ag', 0.52, 2.6], ['U', 0.7, 4.0], ['Au', 0.62, 5.1], ['Ag', 0.4, 0.2], ['U', 0.46, 3.3], ['Au', 0.78, 2.1], ['Ag', 0.7, 5.8], ['U', 0.36, 0.7]]
    .map((d, i) => ({ el: d[0], k: d[1], a0: d[2], rd: 0.18 + (i % 4) * 0.17, r0: 0.2, id: i }));
  const RN = 6.6, RD = 6.2;       // 성운이 퍼지는 최대 반지름 · 원반 반지름

  window.SciSim3D.attach({
    title: '초신성 폭발 3D',
    camera: { dist: PHN ? 12 : 9, theta: -2.35, phi: 1.2, min: 5, max: 36 },
    levels: [0],
    autoRotate: 0,
    build(ctx) {
      const { THREE, root, label, info, controls, orbit, camera, renderer } = ctx;
      const lesson = () => window.__sim || null;
      const std = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.5 }, o || {}));
      const sm = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
      const V = THREE.Vector3;
      const rnd = (() => { let a = 777; return () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; }; })();
      let T = 0, tgl = true, lastStage = -1, clock = 0, lastInfoKey = '', syncing = false;

      /* ---- 흩어지는 물질 알갱이 ---- */
      const N = 1100, inst = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ roughness: 0.4, metalness: 0.1, emissive: 0x222222, emissiveIntensity: 0.5 }), N);
      root.add(inst);
      const P = [], col = new THREE.Color(), dummy = new THREE.Object3D();
      const HV = [0xf5b301, 0xcbd5e1, 0x84cc16];
      for (let i = 0; i < N; i++) {
        const u = rnd(), r = SR * Math.pow(u, 0.62) / SR;
        let li = LAY.length - 1; for (let j = LAY.length - 1; j >= 0; j--) if (r <= LAY[j][0]) { li = j; break; }
        li = Math.max(0, Math.min(LAY.length - 1, li));
        const v = new V(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize();
        const heavy = rnd() < 0.13;
        P.push({ v, r, k: 0.3 + 0.7 * rnd(), rd: 0.12 + 0.86 * rnd(), a: Math.atan2(v.z, v.x), heavy, sz: 0.06 + rnd() * 0.05 });
        col.setHex(heavy ? HV[i % 3] : LAY[li][1]); inst.setColorAt(i, col);
      }
      inst.instanceColor.needsUpdate = true;

      /* ---- 폭발 전: 양파 껍질 모양의 별 (한 쪽을 잘라 속을 보여 줘요) ---- */
      const onion = new THREE.Group(); root.add(onion);
      const wedge = 3 * Math.PI / 2;
      LAY.forEach((L, i) => {
        const rr = L[0] * SR, mt = () => std(L[1], { emissive: L[1], emissiveIntensity: 0.35, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -i, polygonOffsetUnits: -i });
        onion.add(new THREE.Mesh(new THREE.SphereGeometry(rr, 56, 36, 0, wedge), mt()));
        [Math.PI / 2, Math.PI].forEach((rot) => { const d = new THREE.Mesh(new THREE.CircleGeometry(rr, 64, -Math.PI / 2, Math.PI), mt()); d.rotation.y = rot; onion.add(d); });
      });
      const add = (c, op) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: op, depthWrite: false, blending: THREE.AdditiveBlending });
      const shock = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), add(0xfff0b8, 0)); root.add(shock);
      const core = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 24), add(0xffffff, 0)); root.add(core);
      const nebula = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 28), new THREE.MeshStandardMaterial({ color: 0xff7ab0, transparent: true, opacity: 0, depthWrite: false, roughness: 1, emissive: 0xa02a5a, emissiveIntensity: 0.4 })); root.add(nebula);

      /* ---- 태양과 행성 ---- */
      const sun = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 28), new THREE.MeshBasicMaterial({ color: 0xffcf3d })); root.add(sun);
      const sunGlow = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 20), add(0xffd76a, 0)); root.add(sunGlow);
      const PL = [{ r: 0.3, c: 0xc9b7a1, sz: 0.14, sp: 1.3 }, { r: 0.5, c: 0xe8c07a, sz: 0.2, sp: 0.95 }, { r: 0.72, c: 0x3b82f6, sz: 0.26, sp: 0.7, earth: true }, { r: 0.92, c: 0xe07b54, sz: 0.2, sp: 0.5 }];
      const planets = PL.map((p, i) => {
        const m = new THREE.Mesh(new THREE.SphereGeometry(p.sz, 24, 16), std(p.c, { roughness: 0.6 }));
        const pts = []; for (let k = 0; k <= 64; k++) { const a = k / 64 * Math.PI * 2; pts.push(new V(Math.cos(a) * p.r * RD, 0, Math.sin(a) * p.r * RD)); }
        const orbit1 = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x9fb4ff, transparent: true, opacity: 0 }));
        root.add(m, orbit1); return { m, o: orbit1, p, a0: i * 1.7 };
      });
      const earthLab = label('지구', planets[2].m, { size: 12, offset: [0, 0.55, 0] });

      /* ---- 무거운 원소 알갱이 (눌러 보기) ---- */
      const tokMesh = TOK.map((k) => {
        const m = new THREE.Mesh(new THREE.SphereGeometry(0.3, 24, 16), std(EL[k.el].c, { emissive: EL[k.el].c, emissiveIntensity: 0.5, roughness: 0.3 }));
        m.userData.tok = k; k.dir = new V(Math.cos(k.a0), (rnd() - 0.5) * 0.7, Math.sin(k.a0)).normalize(); root.add(m); return m;
      });
      const tokLab = tokMesh.map((m) => label('', m, { size: 12, offset: [0, 0.55, 0] }));
      const heavySeen = () => { const L = lesson(); return L && L.S ? L.S.heavy : new Set(); };
      const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
      let down = null;
      renderer.domElement.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY }; });
      renderer.domElement.addEventListener('pointerup', (e) => {
        if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) { down = null; return; } down = null;
        const r = renderer.domElement.getBoundingClientRect();
        ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
        ray.setFromCamera(ndc, camera);
        const hit = ray.intersectObjects(tokMesh.filter((m) => m.visible), false)[0];
        if (hit) { const L = lesson(), el = hit.object.userData.tok.el; if (L && L.S) { L.S.heavy.add(el); } const m = hit.object; m.scale.setScalar(1.6); }
      });

      const labs = LAY.map((L) => label(L[2], [0, 0, 0], { size: 12 }));
      const lHeavy = label('금·은·우라늄 (철보다 무거운 원소)', [0, 0, 0], { color: 'rgba(180,120,0,.92)', size: 12 });

      /* ---- 시간 T에 맞춰 장면 그리기 (2D의 nebPos와 같은 흐름) ---- */
      function paint(t) {
        const pre = t < 0.18, stage = stageOf(t);
        const collapse = sm(0.13, 0.178, t);
        onion.visible = pre; inst.visible = !pre;
        const os = (1 - 0.62 * collapse) * (1 + 0.012 * Math.sin(clock * 5)); onion.scale.setScalar(os);
        const e = 1 - Math.pow(1 - Math.max(0, Math.min(1, (t - 0.18) / 0.34)), 3), s = sm(0.62, 0.84, t), fadeP = 1 - 0.92 * sm(0.86, 0.99, t);
        const rot = 5.2 * Math.max(0, t - 0.3);
        if (!pre) {
          for (let i = 0; i < N; i++) {
            const q = P[i];
            let R = q.r * SR * 0.9 * 0.2 * (1 - e) + q.k * RN * e;
            R = R * (1 - s) + q.rd * RD * s;
            const rn = R / RN, ang = q.a + rot / (0.25 + rn) + clock * 0.18 * s / (0.25 + rn);
            const y = q.v.y * R * (1 - 0.9 * s), x = Math.cos(ang) * R * Math.sqrt(Math.max(0, 1 - q.v.y * q.v.y)), z = Math.sin(ang) * R * Math.sqrt(Math.max(0, 1 - q.v.y * q.v.y));
            dummy.position.set(x, y, z);
            let sc = q.sz * (1 - 0.3 * e) * fadeP;
            if (q.heavy) sc *= t >= 0.19 ? 1.5 : 0.0001;
            dummy.scale.setScalar(Math.max(0.0001, sc)); dummy.updateMatrix(); inst.setMatrixAt(i, dummy.matrix);
          }
          inst.instanceMatrix.needsUpdate = true;
        }
        // 폭발 섬광 · 충격파
        const fl = t >= 0.165 && t < 0.24 ? Math.max(0, 1 - Math.abs(t - 0.19) / 0.04) : 0;
        core.material.opacity = fl * 0.9; core.visible = fl > 0; core.scale.setScalar(0.6 + fl * 3);
        const u = Math.max(0, Math.min(1, (t - 0.18) / 0.24)); shock.visible = t >= 0.18 && t < 0.42; shock.scale.setScalar(SR * 0.5 + u * 9); shock.material.opacity = 0.14 * (1 - u);
        nebula.scale.setScalar(2 + e * (RN - 1.5) * (1 - s * 0.85)); nebula.material.opacity = 0.1 * sm(0.3, 0.5, t) * (1 - sm(0.62, 0.84, t));
        // 태양 · 행성
        const sunA = sm(0.68, 0.88, t), sunR = (0.25 + 0.55 * sm(0.72, 0.92, t)) * Math.min(1, sunA * 1.5);
        sun.visible = sunA > 0; sun.scale.setScalar(Math.max(0.001, sunR)); sunGlow.visible = sunA > 0; sunGlow.scale.setScalar(0.5 + 0.9 * sunA); sunGlow.material.opacity = 0.28 * sunA;
        const pa = sm(0.86, 0.96, t);
        planets.forEach((o) => { o.m.visible = pa > 0; o.o.visible = pa > 0; o.o.material.opacity = 0.35 * pa; const a = clock * o.p.sp * 0.8 + o.a0; o.m.position.set(Math.cos(a) * o.p.r * RD, 0, Math.sin(a) * o.p.r * RD); o.m.scale.setScalar(Math.max(0.01, pa)); });
        earthLab.show(pa > 0.5);
        // 무거운 원소 알갱이
        const pop = sm(0.19, 0.24, t), dF = 1 - sm(0.8, 0.93, t), seen = heavySeen();
        tokMesh.forEach((m, i) => {
          const k = m.userData.tok;
          let R = k.r0 * SR * 0.9 * (1 - e) + k.k * RN * e; R = R * (1 - s) + k.rd * RD * s;
          const rn = R / RN, ang = k.a0 + rot / (0.25 + rn) + clock * 0.18 * s / (0.25 + rn), cy = k.dir.y * R * (1 - 0.9 * s), cr = Math.sqrt(Math.max(0, 1 - k.dir.y * k.dir.y));
          m.position.set(Math.cos(ang) * R * cr, cy, Math.sin(ang) * R * cr);
          const on = seen.has(k.el); m.visible = t >= 0.19 && dF > 0.05;
          const tgtS = (0.9 + 0.1 * Math.sin(clock * 4 + k.id)) * pop * dF * (on ? 1.15 : 1); m.scale.setScalar(Math.max(0.01, m.scale.x + (tgtS - m.scale.x) * 0.2));
          tokLab[i].show(m.visible && tgl); const lt = on ? '✓ ' + EL[k.el].n + '(' + k.el + ')' : k.el; if (tokLab[i].txt2 !== lt) { tokLab[i].txt2 = lt; tokLab[i].set(lt); }
        });
        lHeavy.show(t > 0.3 && t < 0.62 && tgl); lHeavy.obj = [RN * 0.55, 3.2, 0];
        // 층 이름 (폭발 직전)
        labs.forEach((l, i) => { const rm = ((i < LAY.length - 1 ? LAY[i + 1][0] : 0) + LAY[i][0]) / 2 * SR * os; l.show(pre && t < 0.12 && tgl); l.obj = [-rm, (i % 2 ? 1 : -1) * 0.18, 0.06]; });
        // 설명 · 카메라 거리 (장면이 바뀔 때만)
        if (stage !== lastStage) {
          lastStage = stage;
          orbit.dist = stage === 0 ? (PHN ? 12 : 9) : stage === 1 ? (PHN ? 20 : 15) : (PHN ? 24 : 18);
        }
        const n = seen.size;
        const html = '<b>' + STAGES[stage].n + '</b><br>' + STAGES[stage].cap + (t >= 0.19 && t < 0.84 ? '<br>무거운 원소 알갱이를 눌러 보세요 (' + n + '/3)' : '');
        if (html !== lastInfoKey) { lastInfoKey = html; info(html); }
      }
      const pl = controls.player({
        duration: 14, loop: true, autoplay: false, label: '폭발시키기',
        phases: STAGES.map((s) => [s.t0, s.n]),
        onFrame(p) { if (syncing) return; const L = lesson(); if (L && L.playTo) L.playTo(Math.min(p, 0.999)); else { T = p; } },
      });
      const bL = controls.button('이름표 ✓', () => { tgl = !tgl; bL.classList.toggle('on', tgl); bL.textContent = '이름표 ' + (tgl ? '✓' : '✕'); }); bL.classList.add('on');
      T = (() => { const L = lesson(); return L && L.S ? (L.S.tShown || 0) : 0; })();
      paint(T);
      return {
        update(dt, t) {
          clock += dt;
          const L = lesson(), S = L && L.S;
          if (S) {
            T = S.tShown;
            // 2D에서 시간을 바꿨으면 진행 막대도 따라가요
            if (!pl.playing && Math.abs(pl.p - T) > 0.004) { syncing = true; pl.set(T); syncing = false; }
          }
          paint(T);
        },
        sync() {},
      };
    },
  });
})();
