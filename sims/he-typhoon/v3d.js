/* he-typhoon · 3D 태풍의 구조
   눈(맑음) · 눈벽(가장 높고 센 구름) · 나선 구름 띠를 입체로 보고, 공기의 흐름(아래 반시계 방향 수렴 → 눈벽에서 상승 → 위 시계 방향 발산)을 따라가요.
   '단면'은 태풍을 반으로 잘라 풍속 곡선(눈벽에서 최대)을 보여 주고, '위험 반원'은 진행 방향의 오른쪽(바람이 더 센 쪽)을 표시해요.
   2D와 같은 수치(예시): 최대 풍속 40 m/s, 눈의 반지름 40 km, 최대 풍속 반지름 100 km, 이동 속도 30 km/h(8 m/s), 기압 1 hPa 하강 ≈ 해수면 1 cm 상승.
   중심 기압은 2D의 슬라이더(S.pres)와 서로 같이 움직이고, ▶ 재생은 관측점 위로 태풍이 지나가는 -10 ~ +10시간이에요(2D '시간'과 같아요). */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

  window.SciSim3D.attach({
    title: '태풍의 구조 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    levels: [3],                 // 영향권 날씨(위험·안전 반원) 단계만 3D예요
    camera: { dist: PHONE ? 19 : 15, theta: 0.55, phi: 1.08, min: 6, max: 30, target: [0, 1.3, 0] },
    autoRotate: 0,
    build(ctx) {
      if (ctx.THREE.ColorManagement) ctx.THREE.ColorManagement.legacyMode = false;     // 색을 보이는 그대로(sRGB) 쓰도록 맞춰요
      const { THREE, root, label, info, controls, renderer } = ctx;
      renderer.localClippingEnabled = true;
      const cutPlane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0);       // z>0 쪽을 잘라 내요
      let cut = false;
      const cloudTex = ctx.mats.tex('noise');
      const cloudMat = (o) => { const m = new THREE.MeshStandardMaterial(Object.assign({ color: 0xf6f8fc, roughness: 0.97, metalness: 0, bumpMap: cloudTex, bumpScale: 0.012, emissive: 0x1c2532, envMapIntensity: 0.35 }, o || {})); m.clippingPlanes = []; return m; };
      const clouds = [];

      /* 바다 */
      const SEA = 14, sg = new THREE.PlaneGeometry(SEA, SEA, 70, 70); sg.rotateX(-Math.PI / 2);
      const sea = new THREE.Mesh(sg, ctx.mats.plastic(0x0a3a70, { roughness: 0.34, extra: { clearcoat: 0.6, clearcoatRoughness: 0.32, envMapIntensity: 0.6 } })); root.add(sea);   // 반짝이는 바닷물 (구름 그림자가 드리워요)
      const sp = sg.attributes.position, sx0 = Float32Array.from(sp.array);
      const base = new THREE.Mesh(new THREE.BoxGeometry(SEA, 0.5, SEA), ctx.mats.liquid(0x08294f, { opacity: 0.9, extra: { roughness: 0.3, depthWrite: true } })); base.position.y = -0.27; root.add(base);   // 바닷물의 두께

      /* 눈벽 · 눈 */
      const wall = new THREE.Mesh(new THREE.BufferGeometry(), cloudMat({ side: THREE.DoubleSide, transparent: true, opacity: 0.96 })); root.add(wall); clouds.push(wall);
      const canopy = new THREE.Mesh(new THREE.CircleGeometry(4.6, 72), (() => {
        const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'), gr = g.createRadialGradient(128, 128, 20, 128, 128, 128);
        gr.addColorStop(0, 'rgba(255,255,255,.95)'); gr.addColorStop(0.5, 'rgba(240,246,255,.55)'); gr.addColorStop(1, 'rgba(240,246,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
        const m = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, side: THREE.DoubleSide }); m.clippingPlanes = []; return m; })());
      canopy.rotation.x = -Math.PI / 2; root.add(canopy); clouds.push(canopy);
      /* 나선 구름 띠 */
      const puffGeo = new THREE.IcosahedronGeometry(1, 3);                     // 뭉게구름 한 덩이 (가볍게)
      const NA = 4, NPA = 26, NSUB = 3, puffs = new THREE.InstancedMesh(puffGeo, cloudMat(), NA * NPA * NSUB); clouds.push(puffs);
      const spin = new THREE.Group(); spin.add(puffs); root.add(spin);
      /* 눈벽 겉면과 꼭대기의 뭉게구름 (적란운처럼 울퉁불퉁하게) */
      const NW = 84, wpuffs = new THREE.InstancedMesh(puffGeo, cloudMat(), NW); wall.add(wpuffs); clouds.push(wpuffs);
      /* 풍속 곡선 (잘린 면) */
      const prof = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ color: 0xffd34d })); root.add(prof);
      const profBase = new THREE.Mesh(new THREE.PlaneGeometry(SEA - 1, 2.0), new THREE.MeshBasicMaterial({ color: 0x0b1a33, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false })); profBase.position.set(0, 1.05, 0); root.add(profBase);
      /* 위험 · 안전 반원, 진행 방향 */
      const half = (th, col) => { const m = new THREE.Mesh(new THREE.CircleGeometry(5.6, 64, th, Math.PI), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide })); m.rotation.x = -Math.PI / 2; m.position.y = 0.06; root.add(m); return m; };
      const danger = half(-Math.PI / 2, 0xe03a3a), safe = half(Math.PI / 2, 0x3b82f6);
      const trk = new THREE.Group(); { const m = new THREE.MeshStandardMaterial({ color: 0xffd34d, emissive: 0xffa500, emissiveIntensity: 0.4 }), s = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.6, 12), m), h = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.5, 16), m); s.rotation.x = Math.PI / 2; h.rotation.x = -Math.PI / 2; h.position.z = -0.95; trk.add(s, h); trk.position.set(0, 0.2, -4.9); root.add(trk); }
      /* 공기 흐름 입자 */
      const NP = 70, flow = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.075, 2), new THREE.MeshBasicMaterial({ color: 0xffffff }), NP); root.add(flow);
      const fc = [new THREE.Color(0x8be9ff), new THREE.Color(0xff9d6c), new THREE.Color(0xc9b8ff)];

      const LB = {
        eye: label('눈 (맑고 바람 약함)', [0, 0.1, 0], { size: 12 }), wall: label('눈벽 (바람 최대·가장 높은 구름)', [0, 0, 0], { size: 12, color: 'rgba(120,40,10,.92)' }),
        band: label('나선 구름 띠', [0, 0, 0], { size: 12 }), up: label('상승 기류', [0, 0, 0], { size: 11.5, color: 'rgba(160,60,20,.9)' }),
        inn: label('아래: 반시계 방향으로 모여요', [-3.6, 0.5, 2.2], { size: 11.5, color: 'rgba(20,90,140,.9)' }), out: label('위: 시계 방향으로 퍼져요', [3.2, 3.9, 0], { size: 11.5, color: 'rgba(90,60,170,.9)' }),
        dg: label('위험 반원 (오른쪽) 48 m/s', [3.4, 0.1, 1.8], { size: 12, color: 'rgba(170,30,30,.92)' }), sf: label('안전 반원 (왼쪽) 32 m/s', [-3.4, 0.1, 1.8], { size: 12, color: 'rgba(30,70,160,.92)' }),
        mv: label('진행 방향', trk, { size: 11.5, offset: [0.7, 0.3, 0] }), vp: label('풍속 곡선', [3.0, 1.6, 0], { size: 11.5, color: 'rgba(120,90,0,.92)' }),
      };

      /* 상태 */
      const L2 = () => ctx.lesson();
      let pres = 1010, showFlow = true, showDg = false, P = { rE: 0.7, top: 3.4, v: 40 };
      let sync0 = pres;
      /* 2D와 같은 풍속 곡선: 눈(40 km)에서 약하고 100 km에서 최대 40 m/s. 3D 1칸 = 40/0.7 km */
      const KMU = 40 / 0.7, VMAX = 40, R_E = 40, R_M = 100;
      const sm = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
      const gProf = (rk) => (rk < R_E ? 0.2 * rk / R_E : rk <= R_M ? 0.2 + 0.8 * sm((rk - R_E) / (R_M - R_E)) : Math.pow(R_M / rk, 0.8));
      const vRot = (rk) => { const l = L2(); return l && l.vRot ? l.vRot(rk) : VMAX * gProf(rk); };
      const wprof = (r) => VMAX * gProf(r * KMU);
      const rWall = (y) => P.rE + 1.1 * Math.pow(y / P.top, 1.35);

      function rebuild() {
        /* 눈의 크기·최대 풍속은 2D와 같이 고정(40 km · 40 m/s). 중심 기압은 해수면 상승(폭풍 해일)만 바꿔요 */
        /* 눈벽: 두꺼운 쐐기 단면을 돌려서 만든 면 */
        const prof2 = [], N = 16; for (let i = 0; i <= N; i++) { const y = P.top * i / N; prof2.push(new THREE.Vector2(rWall(y), y)); }
        for (let i = N; i >= 0; i--) { const y = P.top * i / N, th = 0.35 + 0.45 * (1 - i / N) + 0.15; prof2.push(new THREE.Vector2(rWall(y) + th, y)); }
        wall.geometry.dispose(); wall.geometry = new THREE.LatheGeometry(prof2, 72);
        canopy.position.y = P.top + 0.05;
        /* 구름 띠 */
        const dm = new THREE.Object3D(); let k = 0; let sd = 7; const rnd = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
        for (let a = 0; a < NA; a++) for (let i = 0; i < NPA; i++) {
          const f = i / (NPA - 1), r = lerp(P.rE + 1.5, 5.8, Math.pow(f, 0.9)), th = a * Math.PI / 2 - 2.5 * Math.log(r / (P.rE + 1.0)) * 1.0 + (rnd() - 0.5) * 0.18, hgt = lerp(1.0, 0.25, f) * (0.8 + rnd() * 0.5);
          const px = Math.cos(th) * r, pz = -Math.sin(th) * r;
          dm.position.set(px, hgt * 0.5 + 0.05, pz); const sz = lerp(0.42, 0.24, f) * (0.8 + rnd() * 0.5); dm.scale.set(sz * 1.3, hgt * 0.55 + 0.1, sz * 1.3); dm.updateMatrix(); puffs.setMatrixAt(k++, dm.matrix);
          for (let j = 1; j < NSUB; j++) {          // 큰 덩이 옆에 붙은 작은 덩이들
            const a2 = rnd() * 6.283, d2 = sz * (0.75 + rnd() * 0.5), s2 = sz * (0.5 + rnd() * 0.35), h2 = hgt * (0.3 + rnd() * 0.5);
            dm.position.set(px + Math.cos(a2) * d2, h2 * 0.5 + 0.04, pz + Math.sin(a2) * d2); dm.scale.set(s2 * 1.25, h2 * 0.5 + 0.08, s2 * 1.25); dm.updateMatrix(); puffs.setMatrixAt(k++, dm.matrix);
          }
        }
        puffs.instanceMatrix.needsUpdate = true;
        for (let i = 0; i < NW; i++) {
          const top = i >= NW - 26, f = top ? 1 : (i + 0.5) / (NW - 26), y = top ? P.top - 0.12 : P.top * (0.05 + 0.9 * f), th = i * 2.399963;
          const tk = 0.35 + 0.45 * (1 - y / P.top) + 0.15, r = top ? rWall(y) + tk * (0.3 + 0.5 * rnd()) : rWall(y) + tk - 0.2, sz = (top ? 0.3 : 0.4) + 0.2 * rnd();
          dm.position.set(Math.cos(th) * r, y, Math.sin(th) * r); dm.scale.set(sz, sz * (top ? 0.7 : 1.05), sz); dm.updateMatrix(); wpuffs.setMatrixAt(i, dm.matrix);
        }
        wpuffs.instanceMatrix.needsUpdate = true;
        /* 풍속 곡선 */
        const pts = []; for (let i = -40; i <= 40; i++) { const x = i / 40 * 6.2, v = wprof(Math.abs(x)); pts.push(new THREE.Vector3(x, 0.15 + v / P.v * 1.7, 0)); }
        prof.geometry.dispose(); prof.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 100, 0.04, 6, false);
        LB.eye.obj = [0, 0.1, 0]; LB.wall.obj = [rWall(P.top * 0.9) + 0.4, P.top * 0.9, 0]; LB.up.obj = [rWall(P.top * 0.5) + 0.7, P.top * 0.5, 0]; LB.band.obj = [Math.cos(-2.5 * Math.log(1.6 / (P.rE + 1.0))) * 3.6, 0.5, 2.6];
        LB.vp.obj = [3.0, 0.2 + wprof(3.0) / P.v * 1.7 + 0.3, 0];
        seaH = (1010 - pres) / 80 * 0.9; txt();
      }
      let seaH = 0;
      /* 3단계: 판정 미션을 마치기 전에는 위험·안전 반원(답)을 보여 주지 않아요 (2D와 같게) */
      const rv3 = () => { try { const l = L2(); return !!(l && l.S && l.S.reveal); } catch (e) { return false; } };
      let rvLast = null;
      function txt() {
        if (ctx.level === 3 && !rv3()) info('태풍은 <b>북쪽</b>으로 30 km/h(약 8 m/s)로 움직여요. A는 경로의 동쪽, B는 서쪽이에요.<br>▶ 로 태풍을 지나가게 하며 A·B 지점의 풍속과 풍향(화살표)을 비교해 보세요.');
        else if (ctx.level === 3) info('<b>위험 반원</b>(진행 방향 오른쪽): 풍속 = 회전 풍속 + 이동 속도 = 40 + 8 = <b>48 m/s</b><br><b>안전 반원</b>(왼쪽): 40 − 8 = <b>32 m/s</b> (이동 속도 30 km/h ≈ 8 m/s). ▶ 로 A·B 지점의 풍속과 풍향(화살표)을 비교해 보세요.');
        else info('중심 기압 <b>' + pres + ' hPa</b> (주변 1010 hPa) → 해수면 상승 약 <b>' + (1010 - pres) + ' cm</b><br><b>눈</b>(하강 기류, 바람 약함) – <b>눈벽</b>(풍속·강수 최대 40 m/s) – 나선 구름 띠. ▶ 로 태풍이 관측점 위를 지나갈 때를 봐요.');
      }
      { const l = L2(); if (l && l.S && typeof l.S.pres === 'number') pres = clamp(l.S.pres, 930, 1010); }
      sync0 = pres; rebuild();
      const rP = controls.range('중심 기압', 930, 1010, 1, pres, (v) => { pres = v; rebuild(); try { const l = L2(); if (l && l.setPres) { l.setPres(v); sync0 = v; } } catch (e) {} }, (v) => v + ' hPa');
      const bCut = controls.button('단면 보기', () => { cut = !cut; bCut.classList.toggle('on', cut); apply(); });
      const bFlow = controls.button('공기 흐름 ✓', () => { showFlow = !showFlow; bFlow.classList.toggle('on', showFlow); bFlow.textContent = '공기 흐름 ' + (showFlow ? '✓' : '✕'); apply(); }); bFlow.classList.add('on');
      const bDg = controls.button('위험 반원', () => { showDg = !showDg; bDg.classList.toggle('on', showDg); apply(); });
      function apply() {
        clouds.forEach((m) => { m.material.clippingPlanes = cut ? [cutPlane] : []; m.material.needsUpdate = true; });
        flow.visible = showFlow; danger.visible = safe.visible = showDg; prof.visible = profBase.visible = cut; LB.vp.show(cut); LB.dg.show(showDg); LB.sf.show(showDg); LB.mv.show(showDg); trk.visible = showDg;
        LB.inn.show(showFlow); LB.out.show(showFlow); LB.up.show(false); LB.band.show(!cut);
        if (ctx.level === 3) { const rv = rv3(); rvLast = rv; danger.visible = safe.visible = rv; LB.dg.show(rv); LB.sf.show(rv); LB.mv.show(true); trk.visible = true; bDg.style.display = 'none'; } else bDg.style.display = '';
        txt();
      }
      /* 관측점: 태풍은 가운데에 두고 관측점이 -10 ~ +10시간 동안 지나가요(태풍이 북쪽으로 30 km/h로 가는 것과 같은 상대 운동). 1단계는 중심 바로 위, 3단계는 A(동쪽 100 km)·B(서쪽 100 km) */
      const KMH = 30, ZU = KMH / KMU;
      const OBS = [{ id: 'O', x: 0, name: '관측점', lv: 1 }, { id: 'A', x: 100 / KMU, name: 'A', lv: 3 }, { id: 'B', x: -100 / KMU, name: 'B', lv: 3 }];
      const obsStd = (c) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.5, roughness: 0.5 });
      OBS.forEach((o) => {
        o.g = new THREE.Group(); root.add(o.g);
        const col = o.id === 'A' ? 0xff5a4a : o.id === 'B' ? 0x4aa8ff : 0xb78bff;
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.0, 8), ctx.mats.metal('steel')); pole.position.y = 0.5; o.g.add(pole);
        const buoy = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.14, 20), ctx.mats.plastic(0xd9dde4)); buoy.position.y = 0.03; o.g.add(buoy);      // 관측 부표
        const ball = new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 12), obsStd(col)); ball.position.y = 1.05; o.g.add(ball); ctx.halo(ball, col, 0.9, 0.5);
        const ln = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.02, 2 * 10 * ZU), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.5 })); ln.position.set(o.x, 0.12, 0); root.add(ln); o.ln = ln;
        o.lab = label('', o.g, { size: 12, color: 'rgba(30,20,70,.92)', offset: [0, 2.3, 0] });
        /* 풍향 화살표: 바람이 불어 가는 쪽을 가리켜요 (북 = −z, 동 = +x) */
        o.arr = new THREE.Group(); o.arr.position.y = 1.45; o.g.add(o.arr);
        { const am = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: col, emissiveIntensity: 0.6 }), sh = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.7, 10), am), hd = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.32, 14), am);
          sh.rotation.x = Math.PI / 2; hd.rotation.x = Math.PI / 2; hd.position.z = 0.5; o.arr.add(sh, hd); }
      });
      const rOf = (o, tt) => Math.hypot(o.x, ZU * tt) * KMU;
      const CMP = ['북', '북북동', '북동', '동북동', '동', '동남동', '남동', '남남동', '남', '남남서', '남서', '서남서', '서', '서북서', '북서', '북북서'];
      const dirNow = (o, tt) => { const l = L2(); return l && l.dirOf && o.id !== 'O' ? l.dirOf(o.id, tt) : null; };
      const spdNow = (o, tt) => { const l = L2(); if (o.id !== 'O' && l && l.spdOf) return l.spdOf(o.id, tt); const v = vRot(rOf(o, tt)); return o.id === 'A' ? v + 8 : o.id === 'B' ? v - 8 : v; };
      let syncing = false, tNow = -10;
      function place(tt) {
        tNow = tt; const lv = ctx.level;
        OBS.forEach((o) => {
          const on = o.lv === lv; o.g.visible = on; o.ln.visible = on; o.lab.show(on);
          o.g.position.set(o.x, 0.1, ZU * tt);
          const r = rOf(o, tt), v = spdNow(o, tt), zone = r < R_E ? '눈' : r <= 150 ? '눈벽 부근' : '구름 띠';
          const d = dirNow(o, tt); o.arr.visible = on && d != null;
          if (d != null) o.arr.rotation.y = Math.atan2(Math.sin((d + 180) * Math.PI / 180), -Math.cos((d + 180) * Math.PI / 180));
          const dTxt = d == null ? '' : '<br>풍향 ' + CMP[Math.round((((d % 360) + 360) % 360) / 22.5) % 16] + '풍 (' + Math.round((((d % 360) + 360) % 360)) + '°)';
          o.lab.set(o.name + ' · ' + (tt > 0 ? '+' : tt < 0 ? '−' : '') + Math.abs(Math.round(tt * 10) / 10) + '시간<br>' + (lv === 3 ? '' : '중심까지 ' + Math.round(r) + ' km · ') + '풍속 ' + Math.round(v) + ' m/s' + (lv === 3 ? '' : ' (' + zone + ')') + dTxt);
        });
      }
      const pl = controls.player({
        duration: 16, loop: true, autoplay: false, label: '태풍 지나가기',
        phases: [[0, '접근'], [0.25, '눈벽 ①'], [0.4333, '눈'], [0.5667, '눈벽 ②'], [0.75, '멀어짐']],
        onFrame(p) {
          const tt = -10 + 20 * p; place(tt);
          const l = L2(); if (!syncing && ctx.level === 3 && l && l.setTi) l.setTi(Math.round(tt * 10) / 10);
        },
      });
      { const l = L2(); syncing = true; pl.set(ctx.level === 3 && l && l.S && typeof l.S.ti === 'number' ? (l.S.ti + 10) / 20 : 0.25); syncing = false; }
      ctx.onLevel(() => { txt(); apply(); const l = L2(); syncing = true; pl.set(ctx.level === 3 && l && l.S && typeof l.S.ti === 'number' ? (l.S.ti + 10) / 20 : pl.p); syncing = false; });
      apply();

      const dm2 = new THREE.Object3D(), pos = new THREE.Vector3();
      return {
        update(dt, t) {
          this.sync();
          if (ctx.level === 3 && rv3() !== rvLast) apply();
          { const l = L2(); if (ctx.level === 3 && l && l.S && typeof l.S.ti === 'number' && !pl.playing && Math.abs(l.S.ti - tNow) > 0.05) { syncing = true; pl.set((l.S.ti + 10) / 20); syncing = false; } }
          /* 바다 물결 + 낮은 기압으로 해수면 상승 */
          for (let i = 0; i < sp.count; i++) {
            const x = sx0[i * 3], z = sx0[i * 3 + 2], r = Math.hypot(x, z);
            sp.setY(i, 0.05 * Math.sin(x * 1.3 + t * 1.6) * Math.cos(z * 1.1 + t * 1.2) + seaH * Math.exp(-Math.pow(r / 2.2, 2)) + (r < 6 ? 0 : 0));
          }
          sp.needsUpdate = true; sg.computeVertexNormals();
          spin.rotation.y += dt * 0.35; wall.rotation.y += dt * 0.5;
          if (showFlow) {
            for (let i = 0; i < NP; i++) {
              const ph = (i / NP + t * 0.07 + ((i * 7) % 5) * 0.013) % 1, ang0 = (i * 2.399963) % (Math.PI * 2);
              let r, y, th, col;
              if (ph < 0.45) { const f = ph / 0.45; r = lerp(5.8, rWall(0.2) + 0.2, f); y = 0.25 + 0.15 * Math.sin(f * 3); th = ang0 + f * 3.4; col = 0; }
              else if (ph < 0.72) { const f = (ph - 0.45) / 0.27; y = 0.3 + f * (P.top - 0.2); r = rWall(y) + 0.45; th = ang0 + 3.4 + f * 5.5; col = 1; }
              else { const f = (ph - 0.72) / 0.28; r = lerp(rWall(P.top) + 0.45, 5.4, f); y = P.top + 0.05 + 0.2 * f; th = ang0 + 3.4 + 5.5 - f * 2.6; col = 2; }
              dm2.position.set(Math.cos(th) * r, y, -Math.sin(th) * r); dm2.scale.setScalar(1); dm2.updateMatrix(); flow.setMatrixAt(i, dm2.matrix); flow.setColorAt(i, fc[col]);
            }
            flow.instanceMatrix.needsUpdate = true; if (flow.instanceColor) flow.instanceColor.needsUpdate = true;
          }
          trk.position.z = -4.9 - 0.12 * Math.sin(t * 3);
        },
        sync() { try { const s = window.__sim && window.__sim.S; if (s && typeof s.pres === 'number' && s.pres !== sync0) { sync0 = s.pres; pres = clamp(s.pres, 930, 1010); rP.set(pres); rebuild(); } } catch (e) {} },
      };
    },
  });
})();
