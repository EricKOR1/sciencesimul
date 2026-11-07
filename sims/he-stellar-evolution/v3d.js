/* he-stellar-evolution · 3D 별의 일생
   [원시별] 가스 구름이 중력으로 수축하며 별이 될 준비를 해요. [태양 정도의 별] 주계열 → 적색 거성 → 행성상 성운 → 백색 왜성 (크기는 로그 눈금으로 줄여서 그렸어요).
   [큰 별] 주계열 → 초거성(양파 껍질 구조) → 초신성 폭발 → 중성자별 또는 블랙홀(처음 질량에 따라 달라요).
   '속 보기'는 별의 1/4을 잘라 안쪽 층을 보여 줘요. 2D와 같은 값: 수축 정도(S.p1) · 단계(S.s2) · 처음 질량(S.M3) · 큰 별의 진행(S.u3)을 서로 같이 움직이고, 2D의 장면(원시별·주계열 이후·큰 별의 최후)을 따라가요.
   ▶ 재생은 2D 슬라이더를 대신 움직여 줘요(수축 0→100 %, 단계 0→7, 큰 별 주계열 → 초거성 → 초신성 → 남은 천체). */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const rv = (R) => 0.12 + 1.9 * (Math.log10(Math.max(R, 0.01)) + 2) / 4.2;
  function kelvin(K) { const t = clamp(K, 1500, 40000) / 100; const r = t <= 66 ? 255 : 329.7 * Math.pow(t - 60, -0.1332), g = t <= 66 ? 99.47 * Math.log(t) - 161.1 : 288.1 * Math.pow(t - 60, -0.0755), b = t >= 66 ? 255 : t <= 19 ? 0 : 138.5 * Math.log(t - 10) - 305; return [clamp(r, 0, 255) / 255, clamp(g, 0, 255) / 255, clamp(b, 0, 255) / 255]; }
  const SUN = [[0, 5772, 1, '주계열(현재)'], [1, 5900, 1.6, '주계열 끝'], [2, 4600, 15, '적색 거성'], [3, 4900, 10, '수평 가지'], [4, 3500, 180, '점근거성가지'], [5, 70000, 0.05, '행성상 성운 중심별'], [6, 25000, 0.012, '백색 왜성'], [7, 9000, 0.011, '식어 가는 백색 왜성']];
  const LAYC = [0xfb923c, 0xfde047, 0x60a5fa, 0xa78bfa, 0x94a3b8];

  window.SciSim3D.attach({
    title: '별의 일생 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    levels: [0, 1, 2],
    camera: { dist: PHONE ? 12 : 8.5, theta: 0.5, phi: 1.2, min: 3.5, max: 20 },
    autoRotate: 0,
    build(ctx) {
      if (ctx.THREE.ColorManagement) ctx.THREE.ColorManagement.legacyMode = false;     // 색을 보이는 그대로(sRGB) 쓰도록 맞춰요
      const { THREE, scene, root, label, info, controls, renderer, orbit } = ctx;
      renderer.localClippingEnabled = true;
      const planes = [new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0), new THREE.Plane(new THREE.Vector3(0, 0, -1), 0)];
      scene.traverse((o) => { if (o.isHemisphereLight) o.intensity = 0.5; });
      { let s = 3; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; }, pos = []; for (let i = 0; i < 360; i++) { const u = r() * 2 - 1, a = r() * 6.283, q = Math.sqrt(1 - u * u); pos.push(Math.cos(a) * q * 45, u * 45, Math.sin(a) * q * 45); } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); root.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xaab8e8, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0.6 }))); }
      const gl = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();
      const noise = (() => { const W = 256, H = 128, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'), im = g.createImageData(W, H); const h3 = (x, y) => { let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }; const vn = (x, y) => { const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy); const a = h3(ix, iy), b = h3(ix + 1, iy), cc = h3(ix, iy + 1), d = h3(ix + 1, iy + 1); return (a + (b - a) * sx) + ((cc + (d - cc) * sx) - (a + (b - a) * sx)) * sy; };
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const v = 0.55 * vn(x / 6, y / 6) + 0.3 * vn(x / 3, y / 3) + 0.15 * vn(x / 1.5, y / 1.5), o = (y * W + x) * 4, k = Math.round(150 + v * 105); im.data[o] = im.data[o + 1] = im.data[o + 2] = k; im.data[o + 3] = 255; } g.putImageData(im, 0, 0); return new THREE.CanvasTexture(c); })();
      const sm = (c) => new THREE.MeshStandardMaterial({ color: 0x000000, emissive: c, emissiveIntensity: 1.1, emissiveMap: noise, roughness: 1 });
      const star = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 40), sm(0xffd23f)); root.add(star);
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: gl, color: 0xffd23f, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); root.add(halo);
      const layers = LAYC.map((c) => { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 28), new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.55, roughness: 0.7 })); root.add(m); return m; });
      const neb = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), new THREE.MeshBasicMaterial({ color: 0x5fe0c8, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide })); root.add(neb);
      const nebR = new THREE.Mesh(new THREE.TorusGeometry(1, 0.06, 10, 80), new THREE.MeshBasicMaterial({ color: 0xff7ab8, transparent: true, opacity: 0.8 })); root.add(nebR);
      const disc = new THREE.Mesh(new THREE.RingGeometry(0.45, 1.6, 80, 1), new THREE.MeshBasicMaterial({ color: 0xffa24a, side: THREE.DoubleSide, transparent: true, opacity: 0.85 })); disc.rotation.x = Math.PI / 2.3; root.add(disc);
      const jets = [1, -1].map((s) => { const m = new THREE.Mesh(new THREE.ConeGeometry(0.1, 2.6, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0x9fd4ff, transparent: true, opacity: 0.45, depthWrite: false, side: THREE.DoubleSide })); m.position.y = s * 1.5; if (s < 0) m.rotation.x = Math.PI; root.add(m); return m; });
      const NE = 160, ej = new THREE.InstancedMesh(new THREE.SphereGeometry(0.05, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffd9a0 }), NE); root.add(ej);
      const ejd = []; for (let i = 0; i < NE; i++) { const u = Math.random() * 2 - 1, a = Math.random() * 6.283, q = Math.sqrt(1 - u * u); ejd.push([Math.cos(a) * q, u, Math.sin(a) * q, 0.5 + Math.random() * 0.8]); }
      const NCL = 900, cloudP = new THREE.InstancedMesh(new THREE.SphereGeometry(0.036, 6, 5), new THREE.MeshBasicMaterial({ color: 0xffb98a, transparent: true, opacity: 0.85 }), NCL); root.add(cloudP);
      const cd = []; { let q = 9; const r = () => { q = (q * 16807) % 2147483647; return q / 2147483647; }; for (let i = 0; i < NCL; i++) { const u = r() * 2 - 1, a = r() * 6.283, w = Math.sqrt(1 - u * u); cd.push([Math.cos(a) * w, u, Math.sin(a) * w, Math.cbrt(r()) * 0.9 + 0.1, r() * 6.283]); } }
      const LB = label('', star, { size: 13.5, offset: [0, 0, 0] });
      const LC = [0, 1, 2, 3, 4].map((i) => label(['수소 층', '헬륨 층', '탄소·산소 층', '더 무거운 원소 층', '철 핵'][i], [0, 0, 0], { size: 11.5 }));

      /* 상태 */
      let mode = 'sun', s = 0, sT = 0, mass = 15, stg = 0, cut = true, clk = 0, burst = 0, pp = 0.3, ppT = 0.3, lastP1 = null;
      const rdSim = () => { try { return window.__sim; } catch (e) { return null; } };
      const sim0 = rdSim(); let lastS2 = null, lastM3 = null, lastU3 = null;
      if (sim0 && sim0.S) { s = sT = clamp(sim0.S.s2 || 0, 0, 7); mass = sim0.S.M3 || 15; if (sim0.S.view === 'v3') mode = 'big'; else if (sim0.S.view === 'v1') mode = 'proto'; if (typeof sim0.S.p1 === 'number') { pp = ppT = clamp(sim0.S.p1, 0, 1); lastP1 = sim0.S.p1; } lastS2 = sim0.S.s2; lastM3 = sim0.S.M3; }
      const sunAt = (x) => { const i = Math.min(SUN.length - 2, Math.floor(x)), u = x - i, a = SUN[i], b = SUN[i + 1]; return { T: Math.exp(lerp(Math.log(a[1]), Math.log(b[1]), u)), R: Math.exp(lerp(Math.log(a[2]), Math.log(b[2]), u)) }; };
      const fate = (M) => (M < 8 ? 'wd' : M < 25 ? 'ns' : 'bh');
      const FN = { wd: '백색 왜성', ns: '중성자별', bh: '블랙홀' };
      const STN = ['주계열', '초거성', '초신성', '남은 천체'];

      const segM = { set() {} };
      const ctlEl = controls.text('').parentElement; ctlEl.removeChild(ctlEl.lastChild);
      const nP = ctlEl.children.length;
      const rPp = controls.range('수축 정도', 0, 100, 1, Math.round(pp * 100), (v) => { ppT = pp = v / 100; if (plP) plP.pause(); const l = rdSim(); if (l && l.setP1) { l.S.play1 = false; l.setP1(pp); lastP1 = l.S.p1; } upd(); }, (v) => v + '%');
      const protoEls = [].slice.call(ctlEl.children, nP);
      const n0 = ctlEl.children.length;
      const rS = controls.range('단계', 0, 7, 0.1, s, (v) => { sT = v; if (plS) plS.pause(); const l = rdSim(); if (l && l.setS2) { l.setS2(v); lastS2 = l.S.s2; } upd(); }, (v) => SUN[Math.round(v)][3]);
      const sunEls = [].slice.call(ctlEl.children, n0); const n1 = ctlEl.children.length;
      /* 큰 별의 최후: 학생이 2D 조작판에서 최후를 예측하고 ▶ 결과 보기를 누르기 전에는 3D가 최후를 미리 보여 주지 않아요 (주계열에 머물러요) */
      const fateLocked = () => { const l = rdSim(), S = l && l.S; if (!S) return false; return !(S.ordOn || (S.fateOk && S.fateOk[S.M3]) || S.play3 || (S.runM === S.M3 && S.u3 >= 0.97)); };
      const bigBusy = () => { const l = rdSim(), S = l && l.S; return !!(S && S.play3); };
      const segS = controls.segment('단계', STN.map((n, i) => ({ value: i, label: n })), stg, (v) => { if (fateLocked() || bigBusy()) { segS.set(stg); return; } stg = v; burst = 0; if (plB) plB.pause(); const l = rdSim(); if (l && l.setU3) l.setU3([0.15, 0.5, 0.75, 0.95][v]); upd(true); });
      const segEls = [].slice.call(ctlEl.children, n1);
      const rM = controls.range('처음 질량', 1, 40, 1, Math.round(mass), (v) => { mass = v; const l = rdSim(); if (l && l.setM3) { l.setM3(v); lastM3 = l.S.M3; } upd(true); }, (v) => v + ' M☉');
      const bigEls = [].slice.call(ctlEl.children, n1);
      let plP = null, plS = null, plB = null, ready = false;
      const gp = (fn) => { const n = ctlEl.children.length; const r = fn(); return { r, els: [].slice.call(ctlEl.children, n) }; };
      const gP1 = gp(() => controls.player({ duration: 8, loop: true, autoplay: false, label: '수축 시작', phases: [[0, '성간 구름'], [0.3, '원시별'], [0.9, '주계열 시작']], onFrame(p) { if (!ready) return; ppT = pp = p; rPp.set(Math.round(p * 100)); const l = rdSim(); if (l && l.setP1) { l.S.play1 = false; l.setP1(p); lastP1 = l.S.p1; } upd(); } }));
      const gP2 = gp(() => controls.player({ duration: 14, loop: true, autoplay: false, label: '일생 재생', phases: SUN.map((x, i) => [i / 7, x[3]]).filter((x, i) => i < 8), onFrame(p) { if (!ready) return; sT = s = 7 * p; rS.set(sT); const l = rdSim(); if (l && l.setS2) { l.setS2(sT); lastS2 = l.S.s2; } upd(); } }));
      const gP3 = gp(() => controls.player({ duration: 10, loop: true, autoplay: false, label: '큰 별의 일생', phases: [[0, '주계열'], [0.35, '초거성'], [0.7, '초신성'], [0.85, '남은 천체']], onFrame(p) { if (!ready || fateLocked() || bigBusy()) return; stg = p < 0.35 ? 0 : p < 0.7 ? 1 : p < 0.85 ? 2 : 3; segS.set(stg); const l = rdSim(); if (l && l.setU3) l.setU3(p); upd(true); } }));
      plP = gP1.r; plS = gP2.r; plB = gP3.r; [plP, plS, plB].forEach((q) => q.pause()); ready = true;
      const stageEls = segEls.concat(gP3.els); let lastLk = null;
      function syncLock() {   // 예측 전 · 결과 보기 중에는 단계 단추와 ▶ 재생을 숨겨요
        const lk = mode === 'big' && fateLocked(), hide = mode === 'big' && (lk || bigBusy());
        if (lk && stg !== 0) { stg = 0; segS.set(0); burst = 0; upd(true); }
        const key = mode + '|' + lk + '|' + hide; if (key === lastLk) return; lastLk = key;
        if (mode === 'big') { stageEls.forEach((e) => (e.style.display = hide ? 'none' : '')); if (hide && plB.playing) plB.pause(); }
        upd(true);
      }
      protoEls.push.apply(protoEls, gP1.els); sunEls.push.apply(sunEls, gP2.els); bigEls.push.apply(bigEls, gP3.els);
      const bC = controls.button('속 보기 ✓', () => { cut = !cut; bC.classList.toggle('on', cut); bC.textContent = '속 보기 ' + (cut ? '✓' : '✕'); upd(true); }); bC.classList.add('on');
      function setCtl() { orbit.dist = mode === 'proto' ? (PHONE ? 15 : 10.5) : mode === 'sun' ? (PHONE ? 12 : 8.5) : (PHONE ? 13 : 9.5); protoEls.forEach((e) => (e.style.display = mode === 'proto' ? '' : 'none')); sunEls.forEach((e) => (e.style.display = mode === 'sun' ? '' : 'none')); bigEls.forEach((e) => (e.style.display = mode === 'big' ? '' : 'none')); segM.set(mode); if (mode === 'sun') { rS.set(sT); } else if (mode === 'big') { segS.set(stg); } lastLk = null; }
      const clipMat = (m) => { m.clippingPlanes = cut ? planes : []; m.clipIntersection = true; m.needsUpdate = true; };

      function upd() {
        const show = { star: false, layers: false, neb: false, disc: false, jets: false, ej: false };
        let txt = '', name = '', R = 1, T = 5772, lcol = null;
        if (mode === 'proto') {
          const k = clamp((pp - 0.5) / 0.4, 0, 1), ign = pp >= 0.9; R = 0.1 + 0.5 * k * k * (3 - 2 * k); T = lerp(2200, 5600, k * k); show.star = pp > 0.4;
          name = pp < 0.3 ? '성간 구름' : ign ? '주계열 시작' : '원시별'; LB.set(name);
          txt = pp < 0.3 ? '<b>성간 구름</b>: 가스와 먼지가 중력으로 서서히 뭉치기 시작해요.' : !ign ? '<b>원시별</b>: 수축하며 <b>온도가 올라가고</b> 회전하면서 납작한 원반이 돼요.' : '중심 온도가 약 <b>1000만 K</b>에 이르면 수소 핵융합이 시작돼요 → <b>주계열성</b>의 탄생!';
          layers.forEach((l) => (l.visible = false)); neb.visible = nebR.visible = false; disc.visible = false; jets.forEach((j) => (j.visible = false)); ej.visible = false; LC.forEach((l) => l.show(false));
          try { const l = rdSim(), S = l && l.S; if (S && l.D1 && l.fmtYears && l.D1[S.m1] && S.p1 > 0) { const p = clamp(S.p1 || 0, 0, 1); txt += '<br>질량 <b>' + S.m1 + ' M☉</b> · 경과 시간 <b>' + l.fmtYears(p >= 1 ? l.D1[S.m1] : Math.max(1, l.D1[S.m1] * Math.pow(p, 1.5))) + '</b>' + (p >= 1 ? ' (전주계열 기간)' : ''); } } catch (e) { /* 무시 */ }   // 2D와 같은 경과 시간
        } else if (mode === 'sun') {
          const st = sunAt(s); T = st.T; R = rv(st.R); show.star = s < 5.5 || true; const k = Math.round(s);
          name = SUN[k][3]; txt = ['', '', '', '', ''];
          const nebT = clamp((s - 4) / 3, 0, 1);
          if (s >= 4.6) { show.neb = true; }
          const core = s >= 5; if (core) R = Math.max(0.1, rv(st.R) * 0.7);
          show.layers = s <= 4.6 && cut && s >= 1.5;
          if (show.layers) lcol = [0.0, 0.26, 0.12, 0, 0].map((f, i) => f);
          txt = s < 1.5 ? '<b>주계열</b>: 중심에서 <b>수소</b>를 헬륨으로 바꾸며 안정하게 빛나요. (크기·밝기가 거의 일정)' : s < 4.6 ? '<b>' + name + '</b>: 중심의 수소가 떨어져 <b>겉이 크게 부풀고 식어서 붉어져요</b>. 안쪽에는 헬륨 핵이 있어요.' : s < 6 ? '<b>행성상 성운</b>: 바깥층이 우주 공간으로 날아가 껍질이 되고, 뜨거운 중심핵만 남아요.' : '<b>백색 왜성</b>: 지구만 한 크기에 아주 밀도가 높고, 핵융합 없이 서서히 식어요.';
          LB.set(name);
          neb.visible = show.neb; nebR.visible = show.neb; if (show.neb) { const nr = lerp(1.3, 3.8, nebT); neb.scale.setScalar(nr); nebR.scale.setScalar(nr * 0.92); neb.material.opacity = 0.3 * (1 - clamp((s - 6) / 1.4, 0, 0.8)); nebR.material.opacity = 0.8 * (1 - clamp((s - 6) / 1.4, 0, 0.9)); }
          layers.forEach((l, i) => { l.visible = show.layers && i < 3; });
          if (show.layers) { const rr = [1, 0.7, 0.38, 0.0]; const f = [0, 0, 0]; layers[0].scale.setScalar(R * 0.74); layers[1].scale.setScalar(R * (s > 3.5 ? 0.12 : 0.3)); layers[2].scale.setScalar(R * (s > 3.5 ? 0.06 : 0.001)); }
          disc.visible = false; jets.forEach((j) => (j.visible = false)); ej.visible = false;
          LC.forEach((l, i) => l.show(show.layers && i < 2)); if (show.layers) { LC[0].obj = [R * 0.55, R * 0.45, 0.0]; LC[1].obj = [R * 0.15, -R * 0.1, R * 0.1]; LC[0].set('수소 층'); LC[1].set('헬륨 핵'); }
        } else {
          const fa = fate(mass), Mr = Math.pow(mass / 15, 0.3);
          if (stg === 0) { T = 28000; R = 0.85 * Mr; name = '주계열 (청백색)'; txt = '<b>주계열</b>: 질량이 클수록 <b>뜨겁고 밝고</b> 수명이 짧아요. 중심에서 수소를 태워요.'; }
          else if (fa === 'wd' && stg === 1) { T = 3500; R = 2.2; name = '적색 거성'; txt = '<b>적색 거성</b>: 질량이 8 M☉ 미만인 별은 초신성이 되지 않고 부풀어 올라 <b>적색 거성</b>이 돼요.'; }
          else if (fa === 'wd' && stg === 2) { T = 80000; R = 0.2; name = '행성상 성운'; txt = '<b>행성상 성운</b>: 바깥층이 천천히 날아가 껍질을 이루고, 뜨거운 중심핵이 남아요.'; }
          else if (stg === 1) { T = 3500; R = 2.2 * Mr; name = '초거성 (붉음)'; txt = '<b>초거성</b>: 중심에서 점점 무거운 원소를 태워 <b>양파 껍질</b>처럼 층이 생겨요. 마지막은 <b>철 핵</b>이에요.'; }
          else if (stg === 2) { T = 40000; R = 0.5; name = '초신성 폭발'; txt = '<b>초신성</b>: 철 핵이 무너졌다가 반동으로 폭발해 바깥층이 <b>엄청난 속도로 날아가요</b>.<br>이때 철보다 무거운 원소도 만들어져요.'; }
          else { name = FN[fa]; T = fa === 'bh' ? 1 : 80000; R = fa === 'bh' ? 0.35 : 0.14; txt = '처음 질량 <b>' + mass + ' M☉</b> → <b>' + FN[fa] + '</b><br>' + (fa === 'wd' ? '(8 M☉ 미만: 행성상 성운 뒤 백색 왜성)' : fa === 'ns' ? '(8~25 M☉: 중성자별 — 아주 작고 빠르게 돌아요)' : '(25 M☉ 이상: 블랙홀 — 빛도 빠져나오지 못해요)'); }
          show.star = (stg !== 2 || fa === 'wd') && !(stg === 3 && fa === 'bh');
          show.layers = stg === 1 && cut && fa !== 'wd'; layers.forEach((l, i) => { l.visible = show.layers; if (show.layers) l.scale.setScalar(R * [0.76, 0.58, 0.4, 0.25, 0.11][i]); });
          LC.forEach((l, i) => { l.show(show.layers); if (show.layers) l.obj = [R * [0.8, 0.62, 0.43, 0.27, 0.12][i] * 0.8 + 0.05, R * (0.55 - i * 0.08) * 0.4, R * 0.0]; });
          const nebOn = stg === 3 || (fa === 'wd' && stg === 2); neb.visible = nebR.visible = nebOn; if (nebOn) { neb.scale.setScalar(3.4); nebR.scale.setScalar(3.1); neb.material.opacity = 0.18; nebR.material.opacity = 0.45; if (fa === 'wd') { neb.material.color.set(0x5fe0c8); } else neb.material.color.set(0xff8a6a); }
          disc.visible = stg === 3 && fa === 'bh'; jets.forEach((j) => (j.visible = stg === 3 && fa !== 'wd')); ej.visible = stg === 2 && fa !== 'wd';
          if (stg === 0 && fateLocked()) txt += '<br>이 별은 마지막에 어떻게 될까요? 먼저 조작판에서 <b>최후를 예측</b>하고 <b>▶ 결과 보기</b>를 눌러요.';
          LB.set(name);
        }
        const c = kelvin(T); star.material.emissive.setRGB(c[0], c[1], c[2]); halo.material.color.setRGB(c[0], c[1], c[2]);
        star.scale.setScalar(R); star.visible = show.star; clipMat(star.material); layers.forEach((l) => clipMat(l.material));
        halo.visible = show.star; halo.scale.setScalar(R * (mode === 'sun' && s > 5 ? 5 : 3.6) + (mode === 'big' && stg === 2 ? 4 : 0));
        if (mode === 'big' && stg === 3 && fate(mass) === 'ns') { star.material.emissive.setRGB(0.7, 0.85, 1); }
        cloudP.visible = mode === 'proto'; if (mode === 'proto') { halo.visible = pp > 0.4; halo.scale.setScalar(R * 6 + (pp >= 0.9 ? 1.5 : 0)); }
        info(txt); LB.obj = star; LB.off = [0, Math.max(R, 0.3) + 0.5, 0]; LB.el.style.display = '';
        upd.R = R;
      }
      setCtl(); syncLock(); upd();
      const dm = new THREE.Object3D();
      return {
        update(dt, t) {
          clk += dt;
          const sm0 = rdSim(); if (sm0 && sm0.S) {
            { const v = sm0.S.view, m = v === 'v1' ? 'proto' : v === 'v2' ? 'sun' : v === 'v3' ? 'big' : null; if (m && m !== mode) { mode = m; lastP1 = lastS2 = lastM3 = lastU3 = null; setCtl(); upd(true); } }
            if (mode === 'big' && sm0.S.u3 !== lastU3) { lastU3 = sm0.S.u3; const u = sm0.S.u3 || 0; if (u > 0.001) { const st = u < 0.35 ? 0 : u < 0.7 ? 1 : u < 0.8 ? 2 : 3; if (st !== stg) { stg = st; segS.set(stg); burst = 0; upd(true); } } if (!plB.playing) { ready = false; plB.set(Math.min(1, u)); ready = true; } }
            if (mode === 'sun' && !plS.playing) { ready = false; plS.set(clamp(sm0.S.s2 || 0, 0, 7) / 7); ready = true; }
            if (mode === 'proto' && !plP.playing && typeof sm0.S.p1 === 'number') { ready = false; plP.set(clamp(sm0.S.p1, 0, 1)); ready = true; }
            if (sm0.S.s2 !== lastS2) { lastS2 = sm0.S.s2; if (mode === 'sun') { sT = clamp(sm0.S.s2, 0, 7); rS.set(sT); } }
            if (sm0.S.M3 !== lastM3) { lastM3 = sm0.S.M3; mass = sm0.S.M3; if (mode === 'big') rM.set(Math.round(mass)); upd(); }
            syncLock();
          }
          if (sm0 && sm0.S && typeof sm0.S.p1 === 'number' && sm0.S.p1 !== lastP1) { lastP1 = sm0.S.p1; ppT = pp = clamp(sm0.S.p1, 0, 1); rPp.set(Math.round(pp * 100)); upd(); }
          if (mode === 'proto') { const Rc = lerp(3.6, 0.6, Math.pow(pp, 0.8)), fl = lerp(1, 0.22, pp), om = 0.25 + 2.4 * pp; for (let i = 0; i < NCL; i++) { const c = cd[i], a = c[4] + clk * om / (c[3] + 0.25), rr = c[3] * Rc, x = c[0] * rr, z = c[2] * rr; dm.position.set(x * Math.cos(a - c[4]) - z * Math.sin(a - c[4]), c[1] * rr * fl, x * Math.sin(a - c[4]) + z * Math.cos(a - c[4])); dm.scale.setScalar(1); dm.updateMatrix(); cloudP.setMatrixAt(i, dm.matrix); } cloudP.instanceMatrix.needsUpdate = true; cloudP.material.color.setRGB(1, lerp(0.62, 0.9, pp), lerp(0.45, 0.8, pp)); }
          if (Math.abs(s - sT) > 0.002) { s += (sT - s) * Math.min(1, dt * 5); upd(); }
          star.rotation.y += dt * 0.2; neb.rotation.y += dt * 0.05;
          if (mode === 'big' && stg === 2 && fate(mass) !== 'wd') {
            burst += dt; const u = (burst % 4) / 4, r = 0.4 + u * 5.2, fade = 1 - u;
            for (let i = 0; i < NE; i++) { const d = ejd[i], rr = r * d[3]; dm.position.set(d[0] * rr, d[1] * rr, d[2] * rr); dm.scale.setScalar(Math.max(0.05, 1.4 * fade)); dm.updateMatrix(); ej.setMatrixAt(i, dm.matrix); }
            ej.instanceMatrix.needsUpdate = true; ej.material.color.setRGB(1, 0.75 + 0.25 * fade, 0.45 + 0.4 * fade);
            halo.visible = true; halo.material.color.setRGB(1, 0.9, 0.7); halo.scale.setScalar(2 + 5 * Math.max(0, 1 - u * 3)); halo.material.opacity = 1; star.visible = u < 0.15; star.scale.setScalar(0.5 + u * 8);
          } else if (mode === 'big' && stg === 3 && fate(mass) !== 'wd') { jets.forEach((j) => { j.rotation.y = t * 6; }); disc.rotation.z += dt * 1.5; }
          else halo.scale.setScalar(halo.scale.x);
          if (mode === 'big' && stg === 0) halo.material.opacity = 0.85 + 0.1 * Math.sin(t * 3);
        },
        sync() {},
      };
    },
  });
})();
