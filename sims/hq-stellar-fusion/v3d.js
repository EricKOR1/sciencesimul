/* hq-stellar-fusion · 3D 별의 핵융합 (양성자 4개 → 헬륨 · 태양의 층 구조)
   양성자는 서로 밀어내서(쿨롱 장벽) 아주 뜨거울 때(약 1500만 K)만 가까이 다가가 융합해요 (터널 효과도 도와요). 4H → He로 바뀔 때 질량이 약 0.7 % 줄고, 그만큼이 E = mc² 에너지로 나와요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  /* ---------- 공통 도우미 (모형 만들기) ---------- */
  const PHN = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches), KD = PHN ? 1.45 : 1;
  function H3(ctx) {
    const { THREE, root } = ctx;
    const V3 = THREE.Vector3, Yax = new V3(0, 1, 0);
    const mat = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.5, metalness: 0.1 }, o || {}));
    const basic = (c, o) => new THREE.MeshBasicMaterial(Object.assign({ color: c }, o || {}));
    const glass = (c, op, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.25, metalness: 0.0, transparent: true, opacity: op, depthWrite: false, side: THREE.DoubleSide }, o || {}));
    /* 화살표 하나: setArrow(g, 시작점, 끝점) */
    function mkArrow(col, rad, o) {
      const g = new THREE.Group(); const m = (o && o.basic) ? basic(col) : mat(col, { roughness: 0.4, emissive: col, emissiveIntensity: 0.12 });
      const sh = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, 1, 12), m);
      const hd = new THREE.Mesh(new THREE.ConeGeometry(rad * 2.6, rad * 6, 18), m);
      g.add(sh, hd); g.userData = { sh, hd, rad, m }; return g;
    }
    function setArrow(g, a, b) {
      const d = new V3().subVectors(b, a), len = d.length(); const { sh, hd, rad } = g.userData;
      if (len < 1e-3) { g.visible = false; return g; }
      g.visible = true; const hl = Math.min(len * 0.5, rad * 6);
      sh.scale.y = Math.max(0.001, len - hl); sh.position.y = (len - hl) / 2;
      hd.scale.y = hl / (rad * 6); hd.position.y = len - hl / 2;
      g.position.copy(a); g.quaternion.setFromUnitVectors(Yax, d.normalize()); return g;
    }
    /* 많은 화살표 (InstancedMesh): set(i, 위치, 방향, 길이, 색) 뒤에 flush() */
    function arrowSet(n, rad, o) {
      o = o || {};
      const sg = new THREE.CylinderGeometry(1, 1, 1, 8); sg.translate(0, 0.5, 0);
      const hg = new THREE.ConeGeometry(1, 1, 14); hg.translate(0, 0.5, 0);
      const m = mat(0xffffff, { roughness: 0.45, emissive: 0xffffff, emissiveIntensity: 0.18 });
      const sh = new THREE.InstancedMesh(sg, m, n), hd = new THREE.InstancedMesh(hg, m, n);
      const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), P = new V3(), S = new V3(), C = new THREE.Color();
      const zero = new THREE.Matrix4().makeScale(0, 0, 0);
      for (let i = 0; i < n; i++) { sh.setMatrixAt(i, zero); hd.setMatrixAt(i, zero); sh.setColorAt(i, C.set(0xffffff)); hd.setColorAt(i, C); }
      const grp = new THREE.Group(); grp.add(sh, hd);
      return {
        group: grp, n,
        set(i, p, dir, len, col) {
          if (len < 0.02) { sh.setMatrixAt(i, zero); hd.setMatrixAt(i, zero); return; }
          const hl = Math.min(len * 0.55, rad * 6.5), hr = Math.min(rad * 2.7, hl * 0.5);
          Q.setFromUnitVectors(Yax, dir);
          S.set(rad, Math.max(0.001, len - hl), rad); M.compose(p, Q, S); sh.setMatrixAt(i, M);
          P.copy(dir).multiplyScalar(len - hl).add(p); S.set(hr, hl, hr); M.compose(P, Q, S); hd.setMatrixAt(i, M);
          if (col != null) { C.set(col); sh.setColorAt(i, C); hd.setColorAt(i, C); }
        },
        hide(i) { sh.setMatrixAt(i, zero); hd.setMatrixAt(i, zero); },
        flush() { sh.instanceMatrix.needsUpdate = hd.instanceMatrix.needsUpdate = true; if (sh.instanceColor) sh.instanceColor.needsUpdate = hd.instanceColor.needsUpdate = true; },
      };
    }
    /* 가는 막대(선분): setSeg(m, a, b) */
    function mkSeg(col, rad, o) { return new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, 1, 8), (o && o.basic) ? basic(col, o.mo) : mat(col, o && o.mo)); }
    function setSeg(m, a, b) { const d = new V3().subVectors(b, a), l = d.length(); if (l < 1e-3) { m.visible = false; return m; } m.visible = true; m.scale.y = l; m.position.copy(a).addScaledVector(d, 0.5); m.quaternion.setFromUnitVectors(Yax, d.normalize()); return m; }
    function anchor(g, x, y, z) { const o = new THREE.Object3D(); o.position.set(x || 0, y || 0, z || 0); g.add(o); return o; }
    function sphere(r, c, o) { return new THREE.Mesh(new THREE.SphereGeometry(r, r < 0.35 ? 22 : 36, r < 0.35 ? 14 : 24), mat(c, o)); }
    function tube(pts, r, c, o) {
      const curve = Array.isArray(pts) ? new THREE.CatmullRomCurve3(pts) : pts;
      return new THREE.Mesh(new THREE.TubeGeometry(curve, (o && o.seg) || 80, r, (o && o.rs) || 8, !!(o && o.closed)), (o && o.basic) ? basic(c, o.mo) : mat(c, o && o.mo));
    }
    function box(w, h, d, c, o) { return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c, o)); }
    function cyl(rt, rb, h, c, o, seg) { return new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg || 32), mat(c, o)); }
    function fib(n) { // 구 위에 고르게 퍼진 방향
      const out = [], ga = Math.PI * (3 - Math.sqrt(5));
      for (let i = 0; i < n; i++) { const y = 1 - (i + 0.5) / n * 2, r = Math.sqrt(1 - y * y), a = ga * i; out.push(new V3(Math.cos(a) * r, y, Math.sin(a) * r)); }
      return out;
    }
    /* 장면별 조작 줄: grab(장면, 만들기) → 나중에 showCtl(장면) */
    const bar = ctx.renderer.domElement.parentNode.parentNode.querySelector('.v3-ctl');
    const ctlBy = {};
    function grab(sc, fn) { const b = bar.children.length; const r = fn(); (ctlBy[sc] = ctlBy[sc] || []).push.apply(ctlBy[sc], [].slice.call(bar.children, b)); return r; }
    function showCtl(sc) { Object.keys(ctlBy).forEach((k) => ctlBy[k].forEach((n) => { n.style.display = (k === sc || k === '*') ? '' : 'none'; })); }
    function toggleBtn(sc, text, on, fn) {
      const b = grab(sc, () => ctx.controls.button('', () => { on = !on; draw(); fn(on); }));
      const draw = () => { b.textContent = text + (on ? ' ✓' : ' ✕'); b.classList.toggle('on', on); };
      draw(); return { set(v) { on = v; draw(); }, get on() { return on; } };
    }
    return { V3, Yax, mat, basic, glass, mkArrow, setArrow, arrowSet, mkSeg, setSeg, anchor, sphere, tube, box, cyl, fib, grab, showCtl, toggleBtn };
  }
  const MODE2SC = { cond: 'fuse', mass: 'fuse', sun: 'sun', light: 'sun' };
  window.SciSim3D.attach({
    title: '별의 핵융합 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: 13.5 * KD, theta: 0.5, phi: 1.2, min: 5, max: 26, target: [0, -1.3, 0] },
    autoRotate: 0,
    levels: [0],
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const h = H3(ctx); const { V3, mat, glass, anchor, sphere, grab, showCtl, toggleBtn } = h;
      const lessonS = () => (window.__sim && window.__sim.S) || null;
      const S0 = lessonS();
      const st = { sc: S0 ? (MODE2SC[S0.mode] || 'fuse') : 'fuse', T: 16, tun: true, flow: true, eff: true, lg: 0 };
      const gF = new THREE.Group(), gS = new THREE.Group(); root.add(gF, gS);
      /* ----- 우주 배경 · 빛 번짐 · 질감 도우미 ----- */
      const TAU2 = Math.PI * 2;
      const ctex = (w, hh, draw, rx, ry) => { const c = document.createElement('canvas'); c.width = w; c.height = hh; draw(c.getContext('2d'), w, hh); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; if (rx) t.repeat.set(rx, ry || rx); if ('encoding' in t) t.encoding = THREE.sRGBEncoding; t.anisotropy = 4; return t; };
      const rnd = (() => { let q = 21; return () => ((q = (q * 16807) % 2147483647) / 2147483647); })();
      const haloTex = ctex(128, 128, (g, w, hh) => { const gr = g.createRadialGradient(w / 2, hh / 2, 0, w / 2, hh / 2, w / 2); gr.addColorStop(0, 'rgba(255,255,255,.95)'); gr.addColorStop(0.3, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, hh); });
      const mkHalo = (col, sc, op) => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex, color: col, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: op == null ? 0.7 : op })); sp.scale.setScalar(sc); return sp; };
      { const N = 1200, pa = new Float32Array(N * 3), ca = new Float32Array(N * 3); for (let i = 0; i < N; i++) { const u = rnd() * 2 - 1, a = rnd() * TAU2, rr = Math.sqrt(1 - u * u), Rr = 70 + rnd() * 20; pa[i * 3] = rr * Math.cos(a) * Rr; pa[i * 3 + 1] = u * Rr; pa[i * 3 + 2] = rr * Math.sin(a) * Rr; const b = 0.5 + rnd() * 0.5; ca[i * 3] = b; ca[i * 3 + 1] = b * 0.93; ca[i * 3 + 2] = b * (0.8 + rnd() * 0.2); }
        const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(pa, 3)); sg.setAttribute('color', new THREE.BufferAttribute(ca, 3)); const stars = new THREE.Points(sg, new THREE.PointsMaterial({ size: 2, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: 0.85, depthWrite: false })); stars.frustumCulled = false; root.add(stars); }

      /* ================= ① 핵융합: 양성자 4개 → 헬륨-4 ================= */
      const DIRS = [new V3(1, 1, 1), new V3(1, -1, -1), new V3(-1, 1, -1), new V3(-1, -1, 1)].map((v) => v.normalize());
      const pr = DIRS.map(() => { const m = sphere(0.36, 0xff5a5f, { roughness: 0.3, emissive: 0xff3b3b, emissiveIntensity: 0.5 }); gF.add(m); return m; });
      pr.forEach((m) => { const hl = mkHalo(0xff6a5a, 3.0, 0.55); m.add(hl); });
      const barrier = new THREE.Mesh(new THREE.SphereGeometry(1.8, 48, 32), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.FrontSide, blending: THREE.AdditiveBlending, uniforms: { op: { value: 0.1 } }, vertexShader: 'varying vec3 vN; varying vec3 vP; void main(){ vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position,1.0); vP = mv.xyz; gl_Position = projectionMatrix * mv; }', fragmentShader: 'uniform float op; varying vec3 vN; varying vec3 vP; void main(){ float f = 1.0 - abs(dot(vN, normalize(-vP))); gl_FragColor = vec4(1.0, 0.35, 0.3, 1.0) * (0.08 + pow(f, 2.5) * 0.9) * (0.6 + op * 4.0); }' })); gF.add(barrier);
      /* 뜨거운 플라스마 (주변에서 마구 움직이는 입자) */
      const NPL = 90, plasma = new THREE.InstancedMesh(new THREE.SphereGeometry(0.035, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }), NPL); plasma.frustumCulled = false; gF.add(plasma);
      const pls = []; for (let i = 0; i < NPL; i++) { const u = rnd() * 2 - 1, a = rnd() * TAU2, rr = Math.sqrt(1 - u * u), R0 = 3.2 + rnd() * 3.2; pls.push({ d: new V3(rr * Math.cos(a), u, rr * Math.sin(a)), R0, ph: rnd() * TAU2, w: 0.6 + rnd() * 1.4, k: rnd() }); }
      const Mpl = new THREE.Matrix4(), Cpl = new THREE.Color(), Qpl = new THREE.Quaternion(), Spl = new V3(), Ppl = new V3();
      /* 쿨롱 에너지 언덕: 가까울수록 높아져요 (양성자 사이 거리 r 에 따른 위치 에너지) */
      const hillY = (r) => -4.3 + 2.3 / (1 + r * r * 0.42);
      { const pts = []; for (let i = 0; i <= 40; i++) { const r = i / 40 * 4.0; pts.push(new THREE.Vector2(r, hillY(r) + 4.3)); }
        const lg = new THREE.LatheGeometry(pts, 56); const hill = new THREE.Mesh(lg, new THREE.MeshStandardMaterial({ color: 0xff6b6b, transparent: true, opacity: 0.22, roughness: 0.4, side: THREE.DoubleSide, depthWrite: false, emissive: 0x7f1d1d, emissiveIntensity: 0.4 })); hill.position.y = -4.3; gF.add(hill);
        const wf = new THREE.Mesh(lg, new THREE.MeshBasicMaterial({ color: 0xffb4a8, wireframe: true, transparent: true, opacity: 0.28 })); wf.position.y = -4.3; gF.add(wf); }
      const hillBall = sphere(0.2, 0xffe08a, { emissive: 0xffc43d, emissiveIntensity: 1.1 }); hillBall.add(mkHalo(0xffc43d, 1.8, 0.7)); gF.add(hillBall);
      const nu = DIRS.map((d) => { const m = sphere(0.2, 0x7cc2ff, { roughness: 0.3, emissive: 0x3b82f6, emissiveIntensity: 0.6 }); m.visible = false; gF.add(m); return m; });
      const he = new THREE.Group(); [[0.28, 0.28, 0.28, 0xff5a5f], [-0.28, -0.28, 0.28, 0xff5a5f], [0.28, -0.28, -0.28, 0x9aa7bd], [-0.28, 0.28, -0.28, 0x9aa7bd]].forEach((a) => { const s = sphere(0.36, a[3], { roughness: 0.35, emissive: a[3], emissiveIntensity: 0.3 }); s.position.set(a[0], a[1], a[2]); he.add(s); }); he.add(mkHalo(0xffd36b, 3.4, 0.7)); he.visible = false; gF.add(he);
      const ep = [0, 1].map((i) => { const m = sphere(0.17, 0x4ade80, { emissive: 0x22c55e, emissiveIntensity: 0.9 }); m.visible = false; gF.add(m); return m; });
      const rings = [0, 1, 2].map(() => { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 20), new THREE.MeshBasicMaterial({ color: 0xffe066, transparent: true, opacity: 0, depthWrite: false, side: THREE.BackSide })); m.visible = false; gF.add(m); return m; });
      const aP = anchor(gF, 0, 0, 0), lBar = label('쿨롱 장벽 (같은 전하끼리 밀어내요)', anchor(gF, 0, 2.2, 0), { color: '#b91c1c', size: 12 }), lHe = label('헬륨-4', he, { color: '#a16207', size: 13, offset: [0, 1.0, 0] });
      const lP = label('양성자 ×4', pr[0], { color: '#c0392b', size: 12, offset: [0, 0.6, 0] }), lEp = label('양전자·중성미자', anchor(gF, 2.6, 1.8, 0), { color: '#15803d', size: 12 }), lG = label('감마선 에너지', anchor(gF, -2.2, 1.6, 0), { color: '#a16207', size: 12 });
      const lC = label('', anchor(gF, 0, -5.3, 0), { color: '#475569', size: 12 }), lHill = label('쿨롱 에너지 언덕 (가까울수록 높아요)', anchor(gF, 3.4, -3.0, 0), { color: '#b91c1c', size: 11 });
      let cyc = { t: 0, fuse: false, tries: 0, hits: 0, started: false };
      const Tc = 12;                                                     // 이 온도(백만 K) 이상이면 장벽 앞까지 와서 융합
      function startCycle() {
        const eff = st.eff;
        let fuse = eff; if (!eff && st.tun) fuse = Math.random() < 0.3 + 0.03 * st.T;
        cyc = { t: 0, fuse, tun: !eff && fuse, tries: cyc.tries + 1, hits: cyc.hits + (fuse ? 1 : 0), started: true };
      }
      function fuseInfo() {
        const eff = st.eff;
        info('<b>온도 ' + (st.T >= 100 ? Math.round(st.T) : st.T.toFixed(1)) + '백만 K</b> — ' + (eff ? '양성자가 빨라 장벽 가까이 다가가 융합해요.' : (st.tun ? '속도가 부족해 장벽 앞에서 튕기지만, 가끔 <b>터널 효과</b>로 장벽을 지나 융합해요 (실제 확률은 아주 작아서, 그림에서는 크게 그렸어요).' : '속도가 부족해 장벽 앞에서 튕겨 나와요. 융합이 일어나지 않아요.')) + '<br>4H → He-4 : 질량이 약 <b>0.7 %</b> 줄고, 그만큼 E = mc²의 에너지(감마선·운동 에너지)가 나와요.');
      }
      function fuseUpdate(dt) {
        if (!cyc.started) startCycle();
        cyc.t += dt;
        const t = cyc.t, eff = st.eff, appr = 2.6 / (0.55 + 0.045 * st.T), rMin = cyc.fuse ? 0.5 : 1.95;
        const r0 = 3.6; let r, phase = 'in';
        if (t < appr) { const u = t / appr; r = r0 + (rMin - r0) * (u * u * (3 - 2 * u) * 0.5 + u * 0.5); phase = 'in'; }
        else if (cyc.fuse) { r = rMin; phase = 'fused'; }
        else { const u = Math.min(1, (t - appr) / appr); r = rMin + (r0 - rMin) * (u * u * (3 - 2 * u) * 0.5 + u * 0.5); phase = 'out'; }
        const tf = t - appr;
        const showHe = cyc.fuse && phase === 'fused' && tf > 0.35;
        pr.forEach((m, i) => { m.visible = !showHe; m.position.copy(DIRS[i]).multiplyScalar(r); m.scale.setScalar(1 + (phase === 'out' && t - appr < 0.3 ? 0.2 * (1 - (t - appr) / 0.3) : 0)); });
        he.visible = showHe; he.scale.setScalar(showHe ? Math.min(1, (tf - 0.35) * 5) * (1 + 0.07 * Math.sin(tf * 12)) : 0.01);
        // 부산물
        nu.forEach((m, i) => { m.visible = showHe && tf < 3.3; if (m.visible) { const k = tf - 0.35, d = DIRS[i].clone().multiplyScalar(-1).add(new V3(0.3 * i, 0.4, 0)).normalize(); m.position.copy(d).multiplyScalar(0.6 + k * 3.2); m.scale.setScalar(0.7); } });
        ep.forEach((m, i) => { m.visible = showHe && tf < 2.6; if (m.visible) { const k = tf - 0.35, d = new V3(i ? 1 : -1, 0.5, i ? 0.3 : -0.4).normalize(); m.position.copy(d).multiplyScalar(0.7 + k * 1.8); } });
        rings.forEach((m, i) => { const k = tf - 0.35 - i * 0.28; m.visible = showHe && k > 0 && k < 1.6; if (m.visible) { m.scale.setScalar(0.5 + k * 3.2); m.material.opacity = 0.35 * (1 - k / 1.6); } });
        barrier.material.uniforms.op.value = 0.1 + 0.06 * Math.sin(t * 4); barrier.visible = !showHe;
        { const rb = showHe ? 0.5 : r; hillBall.position.set(rb, hillY(rb) + 0.25, 0); hillBall.visible = !showHe; lHill.show(true);
          const sp = 0.4 + st.T * 0.06, hot = Math.min(1, st.T / 20), tt = cyc.t;
          for (let i = 0; i < NPL; i++) { const q = pls[i]; const a = tt * q.w * sp + q.ph, rr = q.R0 * (1 + 0.12 * Math.sin(a * 1.3)); Ppl.copy(q.d).multiplyScalar(rr); Ppl.x += 0.5 * Math.sin(a); Ppl.y += 0.5 * Math.cos(a * 0.9); Spl.setScalar(0.6 + 0.9 * q.k); Mpl.compose(Ppl, Qpl, Spl); plasma.setMatrixAt(i, Mpl); plasma.setColorAt(i, Cpl.setRGB(1, 0.45 + 0.5 * hot * q.k, 0.15 + 0.6 * hot * hot)); }
          plasma.instanceMatrix.needsUpdate = true; plasma.instanceColor.needsUpdate = true; }
        const endT = cyc.fuse ? appr + 4.2 : appr * 2 + 0.6;
        lHe.show(showHe); lP.show(!showHe); lEp.show(showHe && tf < 2.6); lG.show(showHe && tf < 1.8); lBar.show(!showHe);
        lC.set('융합 ' + cyc.hits + '회 / 접근 ' + cyc.tries + '회' + (cyc.tun ? ' (이번엔 터널 효과!)' : ''));
        if (t > endT) startCycle();
      }

      /* ================= ② 태양의 층 구조 ================= */
      const R = 3.3;
      const granTex = ctex(512, 256, (g, w, hh) => { g.fillStyle = '#ff9a2e'; g.fillRect(0, 0, w, hh); for (let i = 0; i < 2600; i++) { const x = rnd() * w, y = rnd() * hh, r = 2 + rnd() * 6; g.fillStyle = 'hsla(' + (28 + rnd() * 14) + ',100%,' + (50 + rnd() * 18) + '%,.55)'; g.beginPath(); g.arc(x, y, r, 0, TAU2); g.fill(); g.strokeStyle = 'rgba(150,50,0,.35)'; g.lineWidth = 1; g.stroke(); } for (let i = 0; i < 5; i++) { const x = rnd() * w, y = hh * (0.35 + rnd() * 0.3); const gr = g.createRadialGradient(x, y, 0, x, y, 9); gr.addColorStop(0, 'rgba(60,15,0,.9)'); gr.addColorStop(1, 'rgba(60,15,0,0)'); g.fillStyle = gr; g.fillRect(x - 10, y - 10, 20, 20); } }, 1, 1);
      const sunSurf = new THREE.Mesh(new THREE.SphereGeometry(R, 72, 54, Math.PI / 2, Math.PI * 1.5), new THREE.MeshStandardMaterial({ color: 0xffffff, map: granTex, roughness: 0.6, emissive: 0xff8a1c, emissiveMap: granTex, emissiveIntensity: 0.75, side: THREE.DoubleSide })); gS.add(sunSurf);
      { gS.add(mkHalo(0xff8a2a, R * 3.6, 0.3)); const pm = new THREE.MeshBasicMaterial({ color: 0xff9a3a, transparent: true, opacity: 0.85 });
 }
      const layers = [[R, 0xff8a2b], [R * 0.7, 0xffc247], [R * 0.25, 0xfff6c8]];
      layers.forEach(([r, c], i) => {
        const m = new THREE.MeshStandardMaterial({ color: c, roughness: 0.7, emissive: c, emissiveIntensity: i === 2 ? 1.0 : 0.45, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1 - i, polygonOffsetUnits: -1 - i });
        const a = new THREE.Mesh(new THREE.CircleGeometry(r, 64, Math.PI / 2, Math.PI), m); a.position.z = 0.001 * i; gS.add(a);
        const b = new THREE.Mesh(new THREE.CircleGeometry(r, 64, Math.PI / 2, Math.PI), m); b.rotation.y = Math.PI / 2; b.position.x = 0.001 * i; gS.add(b);
      });
      const coreSph = new THREE.Mesh(new THREE.SphereGeometry(R * 0.25, 32, 24, Math.PI / 2, Math.PI * 1.5), new THREE.MeshStandardMaterial({ color: 0xfff6c8, emissive: 0xffe9a0, emissiveIntensity: 1.2, side: THREE.DoubleSide })); gS.add(coreSph);
      const radSph = new THREE.Mesh(new THREE.SphereGeometry(R * 0.7, 40, 30, Math.PI / 2, Math.PI * 1.5), new THREE.MeshStandardMaterial({ color: 0xffc247, emissive: 0xffa800, emissiveIntensity: 0.35, transparent: true, opacity: 0.0, side: THREE.DoubleSide })); gS.add(radSph);
      const halo = new THREE.Mesh(new THREE.SphereGeometry(R * 1.28, 40, 28), new THREE.MeshBasicMaterial({ color: 0xffc46b, transparent: true, opacity: 0.1, side: THREE.BackSide, depthWrite: false })); gS.add(halo);
      const lCore = label('핵: 약 1500만 K · 핵융합이 일어나요', anchor(gS, -R * 0.12, R * 0.0, 0.05), { color: '#b45309', size: 12 });
      const lRad = label('복사층: 빛이 아주 오래 걸려 나가요', anchor(gS, -R * 0.5, -R * 0.12, 0.05), { color: '#a16207', size: 12 });
      const lCnv = label('대류층: 뜨거운 가스가 올라와요', anchor(gS, -R * 0.84, R * 0.35, 0.05), { color: '#c2410c', size: 12 });
      const lSur = label('광구: 약 5800 K (우리가 보는 표면)', anchor(gS, R * 0.35, R * 0.97, R * 0.35), { color: '#9a3412', size: 12 });
      const NCV = 36, cells = new THREE.InstancedMesh(new THREE.SphereGeometry(0.12, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }), NCV); gS.add(cells);
      const cs = []; for (let i = 0; i < NCV; i++) cs.push({ a: Math.PI * 0.5 + Math.random() * Math.PI, ph: Math.random(), lane: Math.random() });
      const Mx = new THREE.Matrix4(), Cc = new THREE.Color(), Qi = new THREE.Quaternion(), Sc = new V3();
      const NPH = 40, phot = new THREE.InstancedMesh(new THREE.SphereGeometry(0.06, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }), NPH); gS.add(phot);
      const pw = []; for (let i = 0; i < NPH; i++) pw.push({ x: (Math.random() - 0.5) * 0.4, y: (Math.random() - 0.5) * 0.4, s: 0.1 + Math.random() * 0.6 });
      const sunInfo = () => info('<b>태양의 속</b>: 핵에서 4H → He 핵융합으로 에너지가 만들어져요.<br>빛은 복사층에서 수없이 부딪히며 천천히 나가고, 대류층에서는 가스가 뜨겁게 올라오고 식어 내려가요.<br>광구에서 우리 눈에 보이는 빛이 나와요.');
      function sunUpdate(dt, t) {
        halo.material.opacity = 0.09 + 0.02 * Math.sin(t * 1.2);
        coreSph.material.emissiveIntensity = 1.1 + 0.25 * Math.sin(t * 3);
        for (let i = 0; i < NCV; i++) {
          const c = cs[i]; c.ph = (c.ph + dt * (0.1 + 0.08 * c.lane)) % 1;
          const up = c.ph < 0.5, u = up ? c.ph * 2 : (1 - (c.ph - 0.5) * 2), rr = R * (0.72 + 0.24 * u) + (up ? 0 : 0.05), a = c.a + (up ? 0 : 0.17);
          const x = rr * Math.cos(a), y = rr * Math.sin(a);
          Sc.setScalar(1); Mx.compose(new V3(x, y, 0.02), Qi, Sc); cells.setMatrixAt(i, Mx); cells.setColorAt(i, Cc.set(up ? 0xfff0c0 : 0xff6a1a));
        }
        cells.instanceMatrix.needsUpdate = true; cells.instanceColor.needsUpdate = true;
        for (let i = 0; i < NPH; i++) {
          const p = pw[i]; const ang = Math.random() * 6.283, stp = 0.09; p.x += Math.cos(ang) * stp * (0.3 + p.s) + 0.01; p.y += Math.sin(ang) * stp * (0.3 + p.s);
          if (Math.hypot(p.x, p.y) > R * 0.69 || p.x > 0.4 && Math.hypot(p.x, p.y) < R * 0.25 && false) { p.x = (Math.random() - 0.5) * 0.5; p.y = (Math.random() - 0.5) * 0.5; }
          Mx.makeTranslation(p.x, p.y, 0.03); phot.setMatrixAt(i, Mx);
        }
        phot.instanceMatrix.needsUpdate = true;
      }

      /* ================= 조작 ================= */
      const seg = { set() {} };
      function go(sc) {
        st.sc = sc; seg.set(sc); showCtl(sc);
        gF.visible = sc === 'fuse'; gS.visible = sc === 'sun';
        [lBar, lHe, lP, lEp, lG, lC, lHill].forEach((l) => l.show(sc === 'fuse'));
        [lCore, lRad, lCnv, lSur].forEach((l) => l.show(sc === 'sun'));
        const o = ctx.orbit;
        if (sc === 'fuse') { fuseInfo(); cyc.started = false; o.dist = 13.5 * KD; o.phi = 1.2; o.theta = 0.5; o.ty = -1.3; } else { sunInfo(); o.dist = 12 * KD; o.phi = 1.3; o.theta = -0.7; o.ty = 0; }
      }
      go(st.sc);
      let lastMode = S0 ? S0.mode : '';
      return {
        update(dt, t) {
          dt = Math.min(dt, 0.05);
          const S = lessonS();
          if (S && S.mode !== lastMode) { lastMode = S.mode; const sc = MODE2SC[S.mode]; if (sc && sc !== st.sc) go(sc); }
          if (S && S.cd && window.__sim.cdPhys) { const P = window.__sim.cdPhys(), tun = S.cd.tn === 'on', k = Math.round(P.T / 1e5) + '|' + P.contact + '|' + tun; if (k !== st.fk) { st.fk = k; st.T = P.T / 1e6; st.eff = P.contact; st.tun = tun; fuseInfo(); cyc.started = false; } }
          if (st.sc === 'fuse') fuseUpdate(dt); else sunUpdate(dt, t);
        },
        sync() { st.fk = ''; },
      };
    },
  });
})();
