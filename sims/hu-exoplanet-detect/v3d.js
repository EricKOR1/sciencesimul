/* hu-exoplanet-detect · 3D 외계 행성 찾기 (시선 속도법 · 통과법)
   별과 행성은 공통 질량 중심을 돌아요. ① 시선 속도법: 별이 지구 쪽으로 다가오면 파란색 쪽(청색 이동), 멀어지면 붉은색 쪽(적색 이동)으로 빛이 치우쳐요.
   ② 통과법: 행성이 별 앞을 지나면 별빛이 조금 줄어들어요 (밝기 감소 ≈ (Rp/R*)²). 궤도 기울기 i가 90°에 가까워야 통과를 볼 수 있어요.
   별의 흔들림·행성 크기는 보기 좋게 키웠어요. 2D 실험의 장면(시선 속도 · 통과 관측)과 기울기를 읽어 시작해요(읽기 전용). */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const TAU = Math.PI * 2, DEG = Math.PI / 180;
  const RS = 0.85, AO = 3.4;                           // 별 반지름 · 궤도 반지름(장면)
  const PER = 9;                                       // 공전 주기(초)

  function overlap(d, R, r) {                          // 두 원이 겹친 넓이 / 별 넓이
    if (d >= R + r) return 0;
    if (d <= Math.abs(R - r)) return (r < R ? r * r : R * R) / (R * R);
    const a = Math.acos((d * d + R * R - r * r) / (2 * d * R)), b = Math.acos((d * d + r * r - R * R) / (2 * d * r));
    const A = R * R * (a - Math.sin(2 * a) / 2) + r * r * (b - Math.sin(2 * b) / 2);
    return A / (Math.PI * R * R);
  }

  window.SciSim3D.attach({
    title: '외계 행성 찾기 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    levels: [0, 1],
    camera: { dist: PHONE ? 17 : 13.5, theta: 0.85, phi: 1.12, min: 6, max: 26, target: [0, 0, 1.6] },
    autoRotate: 0,
    build(ctx) {
      const { THREE, scene, root, label, info, controls, orbit } = ctx;
      const st = { mode: 'rv', inc: 90, rp: 0.0275, q: 0.22, th: 3.6, th0: 3.6, P: 0, key: '', pl: 3, view: 'rv', depth: 0 };
      const PLN = ['지구', '해왕성', '토성', '목성'], KOF = [29.8e3 * 3.0e-6, 5.4e3 * 5.15e-5, 9.7e3 * 2.86e-4, 13.1e3 / 1047], TRA = [0.05, 0.4, 1, 5.2];
      const sr = () => { try { return window.__sim && window.__sim.S; } catch (e) { return null; } };

      scene.add(new THREE.AmbientLight(0x8fa0d8, 0.5));
      const starLight = new THREE.PointLight(0xfff0cc, 2.0, 0, 0); scene.add(starLight);
      { let seed = 9; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }; const pos = [];
        for (let i = 0; i < 380; i++) { const u = rnd() * 2 - 1, a = rnd() * TAU, r = Math.sqrt(1 - u * u); pos.push(Math.cos(a) * r * 60, u * 60, Math.sin(a) * r * 60); }
        const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        root.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xaec3ff, size: 1.5, sizeAttenuation: false, transparent: true, opacity: 0.55 }))); }

      /* 별 · 행성 */
      const starMat = new THREE.MeshBasicMaterial({ color: 0xffd98a });
      const star = new THREE.Mesh(new THREE.SphereGeometry(RS, 48, 32), starMat); root.add(star);
      const glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,240,200,.9)'); gr.addColorStop(0.35, 'rgba(255,200,100,.35)'); gr.addColorStop(1, 'rgba(255,170,60,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();
      const glowMat = new THREE.SpriteMaterial({ map: glowTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
      const glow = new THREE.Sprite(glowMat); glow.scale.set(RS * 4.2, RS * 4.2, 1); root.add(glow);
      const planet = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 28), new THREE.MeshStandardMaterial({ color: 0x3f78c8, roughness: 0.6 })); root.add(planet);
      const bary = new THREE.Mesh(new THREE.OctahedronGeometry(0.1), new THREE.MeshBasicMaterial({ color: 0xffffff })); root.add(bary);
      const labBary = label('질량 중심', bary, { offset: [0.5, -0.45, 0], size: 11.5, color: 'rgba(60,70,100,.9)' });
      const labStar = label('별', star, { offset: [0, RS + 0.35, 0], size: 12.5 });
      const labPl = label('행성', planet, { offset: [0, 0.6, 0], size: 12.5, color: 'rgba(14,60,140,.9)' });

      /* 지구(관측자) 쪽: +z 방향 */
      const earthG = new THREE.Group(); earthG.position.set(0, 0, 6.2); root.add(earthG);
      earthG.add(new THREE.Mesh(new THREE.SphereGeometry(0.3, 32, 22), new THREE.MeshStandardMaterial({ color: 0x2f7fd8, roughness: 0.6, emissive: 0x0a2a55, emissiveIntensity: 0.5 })));
      label('지구(관측)', [0, 0.55, 6.2], { size: 12, color: 'rgba(20,70,140,.92)' });
      const los = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 5.4, 6), new THREE.MeshBasicMaterial({ color: 0x9fb4e8, transparent: true, opacity: 0.4 })); los.rotation.x = Math.PI / 2; los.position.set(0, 0, 3.0); root.add(los);

      /* 궤도 */
      const orbG = new THREE.Group(); root.add(orbG);
      let basis = null;
      function orbitPos(th, out) {
        const i = st.inc * DEG, si = Math.sin(i), ci = Math.cos(i);
        const c = Math.cos(th), s = Math.sin(th);              // e1 = (1,0,0), e2 = (0, cos i, -sin i)
        return out.set(AO * c, AO * s * ci, -AO * s * si);
      }
      const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
      function rebuildOrbit() {
        while (orbG.children.length) { const o = orbG.children.pop(); o.geometry.dispose(); }
        const pts = []; for (let k = 0; k < 160; k++) pts.push(orbitPos(k / 160 * TAU, new THREE.Vector3()));
        orbG.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 240, 0.018, 6, true), new THREE.MeshBasicMaterial({ color: 0x8fb4ff, transparent: true, opacity: 0.7 })));
        const sp = []; for (let k = 0; k < 120; k++) { const v = orbitPos(k / 120 * TAU, new THREE.Vector3()); sp.push(v.multiplyScalar(-st.q)); }
        orbG.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(sp, true), 160, 0.02, 6, true), new THREE.MeshBasicMaterial({ color: 0xffd98a, transparent: true, opacity: 0.8 })));
        curve = null;
      }

      /* 곡선 상자 (오른쪽 아래) */
      const view = ctx.renderer.domElement.parentElement;
      const box = document.createElement('div');
      box.style.cssText = 'position:absolute;right:10px;bottom:30px;z-index:3;padding:6px 8px 6px;border-radius:14px;background:rgba(8,12,24,.78);border:1px solid rgba(255,255,255,.22);text-align:center;pointer-events:none;color:#e8eefc;font-size:12px;font-weight:800;line-height:1.3';
      const CW = PHONE ? 130 : 180, CH = PHONE ? 70 : 92, cvs = document.createElement('canvas'); cvs.width = CW * 2; cvs.height = CH * 2; cvs.style.cssText = 'display:block;width:' + CW + 'px;height:' + CH + 'px;margin:3px auto 0';
      const cap = document.createElement('div'); box.append(cap, cvs); view.appendChild(box);
      const g2 = cvs.getContext('2d');
      let curve = null;
      function buildCurve() {
        const n = 240, ys = [];
        for (let k = 0; k < n; k++) {
          const th = k / n * TAU;
          if (st.mode === 'rv') ys.push(Math.cos(th) * Math.sin(st.inc * DEG));                      // 별의 시선 속도(+ : 다가옴)
          else {
            orbitPos(th, tmp); const sx = -st.q * tmp.x, sy = -st.q * tmp.y;
            const d = Math.hypot(tmp.x - sx, tmp.y - sy);
            ys.push(tmp.z > 0 ? 1 - overlap(d, RS, st.rp * RS) : 1);
          }
        }
        curve = ys;
      }
      function drawCurve() {
        if (!curve) buildCurve();
        const S = cvs.width, H = cvs.height, L = 12, B = 18, T = 8, R = 8; g2.clearRect(0, 0, S, H);
        const rv = st.mode === 'rv';
        const lo = rv ? -1.05 : Math.min(...curve) - 0.004, hi = rv ? 1.05 : 1.004;
        const X = (th) => L + (th / TAU) * (S - L - R), Y = (v) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
        g2.strokeStyle = 'rgba(255,255,255,.25)'; g2.lineWidth = 2; g2.beginPath(); g2.moveTo(L, T); g2.lineTo(L, H - B); g2.lineTo(S - R, H - B); g2.stroke();
        if (rv) { g2.setLineDash([6, 6]); g2.beginPath(); g2.moveTo(L, Y(0)); g2.lineTo(S - R, Y(0)); g2.stroke(); g2.setLineDash([]); }
        g2.strokeStyle = rv ? '#7ab8ff' : '#ffd98a'; g2.lineWidth = 3.5; g2.beginPath();
        curve.forEach((v, k) => { const x = X(k / curve.length * TAU), y = Y(v); k ? g2.lineTo(x, y) : g2.moveTo(x, y); }); g2.stroke();
        const th = ((st.th % TAU) + TAU) % TAU, ci = Math.min(curve.length - 1, Math.floor(th / TAU * curve.length));
        g2.fillStyle = '#ff6b6b'; g2.beginPath(); g2.arc(X(th), Y(curve[ci]), 7, 0, 7); g2.fill();
        g2.fillStyle = 'rgba(232,238,252,.8)'; g2.font = '700 20px sans-serif'; g2.textAlign = 'center'; g2.fillText('시간 →', S / 2, H - 2);
      }

      /* 색 */
      const cN = new THREE.Color(0xffd98a), cB = new THREE.Color(0x7fb2ff), cR = new THREE.Color(0xff6a4a), cc = new THREE.Color();

      function setCap() { cap.textContent = st.mode === 'rv' ? '별의 시선 속도 (파랑 ↑ 다가옴)' : '별의 밝기'; }
      function text(v) {
        if (st.mode === 'rv') info('<b>시선 속도법</b> · 행성: ' + (st.view === 'peg' ? '51 Peg b' : PLN[st.pl]) + '<br>별은 질량 중심을 작게 돌아요. 다가올 땐 <span style="color:#9ccaff">파란색</span>, 멀어질 땐 <span style="color:#ffab94">붉은색</span> 쪽으로 빛이 치우쳐요.<br>행성이 무거울수록 별이 더 크게 흔들려요.');
        else info('<b>통과법</b><br>행성이 별 앞을 지날 때만 밝기가 줄어요. 지금 밝기 <b>' + (v * 100).toFixed(2) + '%</b>' + (st.depth > 0.00001 ? ' · 깊이 ' + (st.depth * 100).toFixed(2) + '%' : '<br>이 기울기에서는 행성이 별을 비켜 가요.'));
      }
      function setMode(m) { st.mode = m; curve = null; setCap(); }
      controls.button('👁 지구에서 보기', () => { orbit.theta = 0; orbit.phi = Math.PI / 2; orbit.dist = PHONE ? 16 : 13; });
      /* ▶ 재생: 별과 행성이 질량 중심을 한 바퀴 돌아요 (9초). 곡선 위 빨간 점이 지금 위치예요 */
      const player = controls.player({
        duration: PER, loop: true, autoplay: true, label: '재생',
        phases: [[0, '한 바퀴'], [0.5, '반 바퀴']],
        onFrame(p) { st.P = p; },
      });

      /* 2D → 3D: 장면(시선 속도 · 51 Peg b · 통과)과 2D의 행성 · 행성 반지름 · 궤도 기울기를 그대로 읽어요 */
      const mkInc = (S) => {                                          // 2D의 충격 변수 b = (a/R*)·cos i 를 장면의 궤도 기울기로 옮겨요
        const aRs = TRA[S.tr.ai] * 215.03, b = aRs * Math.cos(S.tr.inc * DEG);
        return Math.acos(Math.min(0.97, Math.abs(b) * RS / AO)) / DEG;
      };
      function follow() {
        const S = sr(); if (!S) return;
        const key = [S.view, S.rv && S.rv.pl, S.tr && S.tr.rp, S.tr && S.tr.ai, S.tr && S.tr.inc].join('|');
        if (key === st.key) return; st.key = key;
        st.view = S.view;
        if (S.view === 'rv' || S.view === 'peg') {
          st.mode = 'rv'; st.inc = 90; st.pl = S.rv.pl; planet.scale.setScalar(0.2);
          st.q = S.view === 'peg' ? 0.22 : 0.22 * Math.sqrt(KOF[S.rv.pl] / KOF[3]);
        } else if (S.tr && (S.view === 'transit' || S.view === 'density' || S.view === 'lens' || S.view === 'match')) {
          if (S.view !== 'transit' && st.mode === 'rv' && S.view !== 'density') { return; }
          st.mode = 'tr'; st.q = 0.04; st.rp = S.tr.rp / 109.1; st.inc = mkInc(S); planet.scale.setScalar(Math.max(0.05, st.rp * RS));
        } else return;
        rebuildOrbit(); curve = null; setCap(); text(1);
      }
      planet.scale.setScalar(0.2);
      follow(); rebuildOrbit(); setCap();
      let acc = 0;
      return {
        update(dt) {
          follow();
          st.th = st.th0 + TAU * st.P;
          orbitPos(st.th, tmp);                                         // 행성(질량 중심 기준)
          const sx = -st.q * tmp.x, sy = -st.q * tmp.y, sz = -st.q * tmp.z;
          star.position.set(sx, sy, sz); glow.position.copy(star.position); starLight.position.copy(star.position);
          planet.position.copy(tmp).add(tmp2.set(0, 0, 0)); planet.position.set(tmp.x, tmp.y, tmp.z);
          /* 시선 속도 → 별 색 */
          const vz = Math.cos(st.th) * Math.sin(st.inc * DEG);
          if (st.mode === 'rv') { cc.copy(cN).lerp(vz > 0 ? cB : cR, Math.min(1, Math.abs(vz) * 1.1)); } else cc.copy(cN);
          starMat.color.copy(cc); glowMat.color.copy(cc);
          /* 통과 밝기 */
          const d = Math.hypot(tmp.x - sx, tmp.y - sy), flux = tmp.z > 0 ? 1 - overlap(d, RS, st.rp * RS) : 1;
          if (st.mode === 'tr') { if (!curve) buildCurve(); st.depth = 1 - Math.min(...curve); }
          acc += dt; if (acc > 0.12) { acc = 0; text(flux); }
          drawCurve();
        },
        sync() { st.key = ''; follow(); },
      };
    },
  });
})();
