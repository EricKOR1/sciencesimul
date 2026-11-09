/* hs-ekman-transport · 3D 에크만 나선과 에크만 수송
   바람이 부는 바다의 물기둥(깊이 0~100 m)에서 층마다 해류 화살표를 입체로 봐요.
   북반구: 표면 해류는 바람의 오른쪽 45°, 깊어질수록 오른쪽으로 더 돌고(25 m 90°, 50 m 135°, 100 m 225°) 속력이 줄어요(20.0 → 0.9 cm/s).
   모든 층을 더한 평균 수송은 바람의 오른쪽 90°(남반구는 왼쪽 90°). 수업의 바람 방향과 반구를 읽어 시작해요(읽기 전용).
   방위: 북 = 화면 안쪽(-z), 동 = +x. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const V0 = 20, DZ = 100;
  const spTh = (z) => 45 + (180 * z) / DZ;                       // 바람 기준 오른쪽으로 돈 각 (도)
  const spV = (z) => V0 * Math.exp((-Math.PI * z) / DZ);         // cm/s
  const LAYS = [0, 25, 50, 100];
  const ZS = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
  const CH = Array.from({ length: 10 }, (_, k) => 5 + (k * DZ) / 10);
  const YS = 0.05, LS = 0.115, DEG = Math.PI / 180;               // 1 m = 0.05 단위, 1 cm/s = 0.115 단위
  const bearing = (b) => new Array(3).fill(0).map((_, i) => (i === 0 ? Math.sin(b * DEG) : i === 2 ? -Math.cos(b * DEG) : 0));
  const compass = (h) => ['북', '동', '남', '서'][Math.round((((h % 360) + 360) % 360) / 90) % 4];
  const mix = (a, b, t) => a.map((x, i) => Math.round(x + (b[i] - x) * t));
  const layCol = (z) => { const c = mix([56, 189, 248], [30, 58, 138], z / DZ); return (c[0] << 16) | (c[1] << 8) | c[2]; };

  window.SciSim3D.attach({
    title: '에크만 나선 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    levels: [1],
    camera: { dist: PHONE ? 15 : 12, theta: 0.55, phi: 1.1, target: [0, -2.2, 0], min: 5, max: 30 },
    autoRotate: 0,
    build(ctx) {
      const { THREE, root, label, info, controls, orbit } = ctx;
      const V = (x, y, z) => new THREE.Vector3(x, y, z);
      /* 바다 물기둥 */
      const W = 6.6, H = ZS[ZS.length - 1] * YS + 0.4;
      const top = new THREE.Mesh(new THREE.PlaneGeometry(W, W), new THREE.MeshBasicMaterial({ color: 0x3b9be0, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false }));
      top.rotation.x = -Math.PI / 2; root.add(top);
      const box = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(W, H, W)), new THREE.LineBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.7 })); box.position.y = -H / 2; root.add(box);
      LAYS.slice(1).forEach((z) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(W, W), new THREE.MeshBasicMaterial({ color: layCol(z), transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false })); p.rotation.x = -Math.PI / 2; p.position.y = -z * YS; root.add(p); });
      const axis = new THREE.Line(new THREE.BufferGeometry().setFromPoints([V(0, 1.2, 0), V(0, -H, 0)]), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 })); root.add(axis);
      /* 방위 */
      const cLab = [['북 N', 0, -1], ['동 E', 1, 0], ['남 S', 0, 1], ['서 W', -1, 0]].map(([t, x, z]) => label(t, [x * (W / 2 + 0.45), 0.05, z * (W / 2 + 0.45)], { color: t[0] === '북' ? 'rgba(220,38,38,.92)' : 'rgba(30,41,59,.88)' }));
      const nA = new THREE.ArrowHelper(V(0, 0, -1), V(0, 0.02, W / 2 - 0.2), 1.0, 0xef4444, 0.3, 0.2); root.add(nA);
      /* 깊이 눈금 */
      LAYS.forEach((z) => label(z === 0 ? '수면' : z + ' m', [-W / 2 - 0.15, -z * YS, W / 2 + 0.15], { color: 'rgba(8,47,73,.88)', size: 11.5 }));
      /* 바람 */
      const windG = new THREE.Group(); root.add(windG);
      const windA = [];
      [-1.9, 0, 1.9].forEach((k) => { const a = new THREE.ArrowHelper(V(0, 0, -1), V(0, 0.8, 0), 1.9, 0xffffff, 0.4, 0.26); windG.add(a); windA.push([a, k]); });
      const windT = new THREE.Object3D(); root.add(windT);
      const windLab = label('바람', windT, { color: 'rgba(29,78,216,.92)' });
      /* 층별 해류 화살표 */
      const arr = ZS.map((z) => { const a = new THREE.ArrowHelper(V(1, 0, 0), V(0, -z * YS, 0), 1, layCol(z), 0.3, 0.2); root.add(a); const dot = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff })); root.add(dot); return { z, a, dot }; });
      const tipLabs = LAYS.map((z) => ({ z, lab: label('', [0, 0, 0], { color: 'rgba(8,47,73,.9)', size: 11.5 }) }));
      /* 나선(화살표 끝을 잇는 선)과 위에서 본 그림자 */
      const spiral = new THREE.Group(); root.add(spiral);
      const spiralShadow = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineDashedMaterial({ color: 0xfde047, dashSize: 0.14, gapSize: 0.1, transparent: true, opacity: 0.75 })); root.add(spiralShadow);
      /* 평균 수송 */
      const netA = new THREE.ArrowHelper(V(1, 0, 0), V(0, 0.2, 0), 2, 0x8b5cf6, 0.5, 0.34); root.add(netA);
      const netT = new THREE.Object3D(); root.add(netT);
      const netLab = label('', netT, { color: 'rgba(91,33,182,.94)' });

      /* 상태 (2D 에크만 나선 단계: 바람 방향 · 층 측정 · 모두 더하기를 그대로 따라가요) */
      let wind = 0, wV = 0, sgn = 1, P = 1, tgtPhi = null, sumOk = false, allM = false, free = false, meas = {};
      const RW = () => window.__sim || {};
      const rd = () => { try { const q = RW(), S = q.S; if (S) return { w: [0, 90, 180, 270].includes(S.wind) ? S.wind : null, hem: S.mode === 'balance' && S.hem === 'S' ? -1 : 1, meas: S.meas || {}, sum: S.sumT >= 0.99, free: !!(q.game && q.game.free) }; } catch (e) {} return {}; };
      const side = () => (sgn > 0 ? '오른쪽' : '왼쪽');
      function dirAt(z, b) { return bearing(b + sgn * spTh(z)); }
      function netVec(b) { let x = 0, zz = 0; CH.forEach((z) => { const d = dirAt(z, b), v = spV(z); x += d[0] * v; zz += d[2] * v; }); return [x, zz]; }
      function netRel() { const [x, zz] = netVec(0), rel = Math.atan2(x, -zz) / DEG; const n = Math.round(((sgn * rel) % 360 + 360) % 360); return Math.abs(n - 90) <= 4 ? 90 : n; }
      const isM = (z) => !!(free || meas[z]);
      function fmtInfo() {
        const w = compass(wind);
        const rows = LAYS.map((z) => '<b>' + z + ' m</b> ' + (isM(z) ? side() + ' ' + spTh(z) + '° · ' + spV(z).toFixed(1) + ' cm/s' : '— (아직 측정 안 했어요)')).join('<br>');
        let h = '<b>' + (sgn > 0 ? '북반구' : '남반구') + '</b> · 바람 ' + w + '쪽으로<br>' + rows;
        h += sumOk ? '<br>모든 층의 합(<span style="color:#c4b5fd">보라 화살표</span>)은 바람의 <b>' + side() + ' ' + netRel() + '°</b> = 평균 수송' : (allM ? '<br>‘모두 더하기’를 눌러 화살표를 이어 붙여 봐요.' : '<br>옆의 표에서 깊이를 눌러 층마다 측정해요.');
        info(h);
      }
      function place(b) {
        // 층별 화살표와 나선
        const pts = [], sp = [];
        ZS.forEach((z, i) => {
          const d = dirAt(z, b), L = spV(z) * LS, o = arr[i];
          o.a.position.set(0, -z * YS, 0); o.a.setDirection(V(d[0], 0, d[2]));
          o.d = d; o.L = L;
        });
        for (let z = 0; z <= DZ; z += 2.5) { const d = dirAt(z, b), L = spV(z) * LS; pts.push(V(d[0] * L, -z * YS, d[2] * L)); sp.push(V(d[0] * L, -(DZ * YS + 0.38), d[2] * L)); }
        while (spiral.children.length) { const c = spiral.children[0]; spiral.remove(c); c.geometry.dispose(); }
        spiral.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 80, 0.03, 6, false), new THREE.MeshBasicMaterial({ color: 0xfde047 })));
        spiralShadow.geometry.dispose(); spiralShadow.geometry = new THREE.BufferGeometry().setFromPoints(sp); spiralShadow.computeLineDistances();
        tipLabs.forEach(({ z, lab }) => { const d = dirAt(z, b), L = spV(z) * LS; lab.obj = [d[0] * (L + 0.1), -z * YS + (z === 0 ? -0.32 : 0.2), d[2] * (L + 0.1)]; lab.set(z + ' m · ' + spTh(z) + '°'); });
        // 평균 수송
        const [nx, nz] = netVec(b), mag = Math.hypot(nx, nz), NL = Math.max(0.5, mag * 0.045), nd = V(nx / mag, 0, nz / mag);
        netA.setDirection(nd); netA.setLength(NL, 0.5, 0.34);
        netT.position.set(nd.x * (NL + 0.45), 0.7, nd.z * (NL + 0.45)); netLab.set('평균 수송 · 바람의 ' + side() + ' ' + netRel() + '°');
        // 바람
        const wd = bearing(b);
        windA.forEach(([a, k]) => { a.setDirection(V(wd[0], 0, wd[2])); a.position.set(-wd[0] * 3.0 - wd[2] * k, 0.8, -wd[2] * 3.0 + wd[0] * k); });
        windT.position.set(-wd[0] * 3.0 + wd[2] * 2.6, 1.15, -wd[2] * 3.0 - wd[0] * 2.6); windLab.set('바람 → ' + compass(wind) + '쪽');
      }
      function apply() { fmtInfo(); }
      const wSeg = controls.segment('바람', [{ value: 0, label: '↑ 북' }, { value: 90, label: '→ 동' }, { value: 180, label: '↓ 남' }, { value: 270, label: '← 서' }], wind, (v) => { wind = v; try { RW().setWind(v); } catch (e) {} apply(); });
      const vb = controls.button('🛰️ 위에서 보기', () => { const top_ = orbit.phi > 0.5; vb.textContent = top_ ? '🎥 비스듬히 보기' : '🛰️ 위에서 보기'; tgtPhi = top_ ? 0.12 : 1.1; if (top_) { orbit.theta = 0; } });
      /* ▶ 재생: 바람이 표면을 끌면 아래 층이 차례로 끌려 움직이며 오른쪽으로 돌아요 (표면 → 100 m) */
      const player = controls.player({
        duration: 8, loop: true, autoplay: false, label: '재생',
        phases: [[0, '표면 (바람이 끌어요)'], [0.3, '25 m'], [0.55, '50 m'], [0.8, '100 m']],
        onFrame(p) { P = p; },
      });
      player.set(1);
      const l0 = rd(); if (l0.w != null) { wind = l0.w; wSeg.set(wind); } sgn = l0.hem || 1; meas = Object.assign({}, l0.meas || {}); free = !!l0.free;   // 복사해 둬야 2D에서 층을 잴 때마다 3D도 바뀌어요
      wV = wind; place(wV); apply();

      function follow() {
        const l = rd(); let ch = false;
        if (l.w != null && l.w !== wind) { wind = l.w; wSeg.set(wind); ch = true; }
        if (l.hem && l.hem !== sgn) { sgn = l.hem; wV = wind; place(wV); ch = true; }
        const m = l.meas || {}, f = !!l.free, sm = !!l.sum;
        if (f !== free || sm !== sumOk || LAYS.some((z) => !!m[z] !== !!meas[z])) { free = f; sumOk = sm; meas = Object.assign({}, m); ch = true; }
        allM = LAYS.every((z) => isM(z));
        if (ch) apply();
      }
      return {
        update(dt) {
          follow();
          // 바람 방향이 바뀔 때 부드럽게 돌려요
          let d = wind - wV; d = ((d + 540) % 360) - 180;
          if (Math.abs(d) > 0.2) { wV += d * Math.min(1, dt * 6); place(wV); } else if (wV !== wind) { wV = wind; place(wV); }
          const play = P < 0.999;
          arr.forEach((o, i) => {
            const isLay = LAYS.indexOf(o.z) >= 0, vis = isLay ? isM(o.z) : allM;
            const g = Math.max(0, Math.min(1, (P * 1.25 - (o.z / DZ) * 0.8) / 0.25)), L = o.L * g;
            o.a.visible = vis && L > 0.01; o.dot.visible = vis && g > 0.5;
            if (o.a.visible) o.a.setLength(Math.max(0.12, L), Math.min(0.3, Math.max(0.1, L * 0.4)), Math.min(0.2, Math.max(0.07, L * 0.28)));
            const f = (P * 3 + i * 0.09) % 1; o.dot.position.set(o.d[0] * o.L * f, -o.z * YS + 0.04, o.d[2] * o.L * f);
          });
          tipLabs.forEach(({ z, lab }) => lab.show(isM(z) && P > (z / DZ) * 0.8 + 0.05));
          spiral.visible = spiralShadow.visible = allM && P > 0.98;
          const nv = (sumOk || free) && P > 0.98; netA.visible = nv; netLab.show(nv);
          if (tgtPhi != null) { const e = tgtPhi - orbit.phi; orbit.phi += e * Math.min(1, dt * 4); if (Math.abs(e) < 0.01) tgtPhi = null; }
        },
        sync() { follow(); },
      };
    },
  });
})();
