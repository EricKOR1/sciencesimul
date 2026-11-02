/* he-hr-diagram · 3D H-R도 별밭
   가로는 표면 온도(왼쪽이 뜨거워요), 세로는 광도예요. 별 하나하나를 반지름에 비례한 크기와 온도에 맞는 색으로 세웠어요.
   '지름 같은 선'은 L ∝ R²T⁴ 에서 반지름이 같은 별들을 이은 선이에요. '개수 막대'로 바꾸면 우리 둘레에 어떤 별이 많은지 막대 높이로 볼 수 있어요.
   (표본은 가까운 별의 분포를 본뜬 예시 자료예요.) */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  function kelvin(K) { const t = clamp(K, 1500, 40000) / 100; const r = t <= 66 ? 255 : 329.7 * Math.pow(t - 60, -0.1332), g = t <= 66 ? 99.47 * Math.log(t) - 161.1 : 288.1 * Math.pow(t - 60, -0.0755), b = t >= 66 ? 255 : t <= 19 ? 0 : 138.5 * Math.log(t - 10) - 305; return [clamp(r, 0, 255) / 255, clamp(g, 0, 255) / 255, clamp(b, 0, 255) / 255]; }
  const LT0 = 4.7, LT1 = 3.4, LL0 = -4.6, LL1 = 6.4, BW = 8.4, BH = 5.4;
  const bx = (lt) => (LT0 - lt) / (LT0 - LT1) * BW - BW / 2, by = (ll) => (ll - LL0) / (LL1 - LL0) * BH;
  const GRP = { ms: '주계열성', gi: '거성', sg: '초거성', wd: '백색 왜성' };

  window.SciSim3D.attach({
    title: 'H-R도 별밭 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    levels: [0, 1, 2],
    camera: { dist: PHONE ? 15 : 11.5, theta: 0.35, phi: 1.3, min: 5, max: 26, target: [0, 2.6, 0] },
    autoRotate: 0,
    build(ctx) {
      if (ctx.THREE.ColorManagement) ctx.THREE.ColorManagement.legacyMode = false;     // 색을 보이는 그대로(sRGB) 쓰도록 맞춰요
      const { THREE, root, label, info, controls } = ctx;
      const std = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.6, metalness: 0 }, o || {}));
      let sd = 31; const rnd = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; }, gau = () => { let s = 0; for (let i = 0; i < 6; i++) s += rnd(); return (s - 3) / 1.0; };
      /* 예시 별 표본 */
      const ST = [];
      for (let i = 0; i < 560; i++) { const m = Math.min(22, 0.1 * Math.pow(1 - rnd() * (1 - Math.pow(220, -1.35)), -1 / 1.35)); const L = m < 0.43 ? 0.23 * Math.pow(m, 2.3) : m < 2 ? Math.pow(m, 4) : m < 20 ? 1.4 * Math.pow(m, 3.5) : 32000 * m / 20, R = m < 1 ? Math.pow(m, 0.8) : Math.pow(m, 0.57), T = 5772 * Math.pow(L / (R * R), 0.25) * (1 + gau() * 0.012); ST.push({ T, L: L * Math.pow(10, gau() * 0.03), g: 'ms', m }); }
      for (let i = 0; i < 52; i++) { const T = 5500 + rnd() * 28000, L = Math.pow(10, -3.3 + rnd() * 2.3 + (T - 5500) / 28000 * 1.0); ST.push({ T, L, g: 'wd' }); }
      for (let i = 0; i < 22; i++) { const T = 3600 + rnd() * 1700, L = Math.pow(10, 1.4 + rnd() * 1.8 + (rnd() < 0.3 ? 0 : 0)); ST.push({ T, L, g: 'gi' }); }
      for (let i = 0; i < 8; i++) { const T = 3500 + rnd() * rnd() * 18000, L = Math.pow(10, 4.4 + rnd() * 1.6); ST.push({ T, L, g: 'sg' }); }
      ST.forEach((s) => { s.lt = Math.log10(s.T); s.ll = Math.log10(s.L); s.R = Math.sqrt(s.L) / Math.pow(s.T / 5772, 2); s.x = bx(s.lt); s.y = by(s.ll); s.z = (rnd() - 0.5) * 0.9; });
      const N = ST.length, sph = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 14, 10), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.0, roughness: 0.4 }), N); root.add(sph);
      const sz = (R) => 0.045 + 0.09 * clamp((Math.log10(R) + 2.2) / 5.2, 0, 1) * 1.8;
      /* 판 (H-R도 바탕) */
      const board = new THREE.Mesh(new THREE.BoxGeometry(BW + 0.9, BH + 0.9, 0.08), std(0x0d1630, { roughness: 0.9, transparent: true, opacity: 0.9 })); board.position.set(0, BH / 2, -0.62); root.add(board);
      const grid = []; for (let lt = 3.5; lt <= 4.6; lt += 0.5) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.012, BH, 0.012), new THREE.MeshBasicMaterial({ color: 0x4a5a86 })); m.position.set(bx(lt), BH / 2, -0.56); root.add(m); }
      for (let ll = -4; ll <= 6; ll += 2) { const m = new THREE.Mesh(new THREE.BoxGeometry(BW, 0.012, 0.012), new THREE.MeshBasicMaterial({ color: 0x4a5a86 })); m.position.set(0, by(ll), -0.56); root.add(m); }
      const axl = { x: label('← 뜨거워요   표면 온도   차가워요 →', [0, -0.35, 0], { size: 12 }), y: label('광도 (태양 = 1)', [-BW / 2 - 0.4, BH + 0.3, 0], { size: 12 }), hot: label('4만 K', [bx(4.6), -0.1, 0], { size: 11 }), mid: label('6000 K', [bx(Math.log10(6000)), -0.1, 0], { size: 11 }), cool: label('3000 K', [bx(Math.log10(3000)), -0.1, 0], { size: 11 }),
        l2: label('10⁶', [BW / 2 + 0.5, by(6), 0], { size: 11 }), l0: label('1', [BW / 2 + 0.5, by(0), 0], { size: 11 }), lm: label('10⁻⁴', [BW / 2 + 0.5, by(-4), 0], { size: 11 }) };
      /* 지름 같은 선 */
      const rLines = [[0.01, '0.01 R☉ (지구만 해요)'], [1, '1 R☉'], [100, '100 R☉'], [1000, '1000 R☉']].map(([R, nm]) => {
        const pts = []; for (let lt = 4.65; lt >= 3.45; lt -= 0.02) { const ll = 2 * Math.log10(R) + 4 * (lt - Math.log10(5772)); if (ll > LL0 && ll < LL1) pts.push(new THREE.Vector3(bx(lt), by(ll), -0.5)); }
        const m = pts.length > 3 ? new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.014, 6, false), new THREE.MeshBasicMaterial({ color: 0x8fa5d6, transparent: true, opacity: 0.8 })) : null; if (m) root.add(m);
        const L = label(nm, pts.length ? pts[Math.min(pts.length - 1, 1)].toArray() : [0, 0, 0], { size: 11, color: 'rgba(40,60,120,.9)' }); return { m, L };
      });
      const sunM = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.025, 8, 36), new THREE.MeshBasicMaterial({ color: 0xffd34d })); sunM.position.set(bx(Math.log10(5772)), by(0), 0); root.add(sunM);
      const gl = { sun: label('태양', sunM, { size: 12, offset: [0, 0.4, 0], color: 'rgba(130,90,0,.92)' }), ms: label('주계열성', [bx(4.2), by(3.2), 0.2], { size: 12 }), gi: label('거성', [bx(3.62), by(2.2), 0.2], { size: 12 }), sg: label('초거성', [bx(3.9), by(5.6), 0.2], { size: 12 }), wd: label('백색 왜성', [bx(4.1), by(-2.6), 0.2], { size: 12 }) };
      /* 개수 막대 */
      const CX = 16, CY = 11, cnt = new Array(CX * CY).fill(0);
      ST.forEach((s) => { const cx = Math.floor((LT0 - s.lt) / (LT0 - LT1) * CX), cy = Math.floor((s.ll - LL0) / (LL1 - LL0) * CY); if (cx >= 0 && cx < CX && cy >= 0 && cy < CY) cnt[cy * CX + cx]++; });
      const bars = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), std(0xffffff, { roughness: 0.5 }), CX * CY); root.add(bars);
      const dm = new THREE.Object3D(), cc = new THREE.Color();
      let mode = 'star', grpSel = 'all', showR = true;
      const COLR = ST.map((s) => kelvin(s.T));
      function apply() {
        const stars = mode === 'star';
        sph.visible = stars; bars.visible = !stars;
        for (let i = 0; i < N; i++) { const s = ST[i], on = grpSel === 'all' || s.g === grpSel, k = on ? 1 : 0.14; dm.position.set(s.x, s.y, s.z); dm.scale.setScalar(sz(s.R) * (on ? 1 : 0.5)); dm.updateMatrix(); sph.setMatrixAt(i, dm.matrix); cc.setRGB(COLR[i][0] * k + 0.02, COLR[i][1] * k + 0.02, COLR[i][2] * k + 0.04); sph.setColorAt(i, cc); }
        sph.instanceMatrix.needsUpdate = true; sph.instanceColor.needsUpdate = true; sph.material.emissive.setRGB(1, 1, 1); sph.material.emissiveIntensity = 0.0; sph.material.color.setRGB(1, 1, 1);
        sph.material.emissiveMap = null; sph.material.roughness = 0.35;
        let k = 0, mx = Math.max.apply(null, cnt);
        for (let cy = 0; cy < CY; cy++) for (let cx = 0; cx < CX; cx++) {
          const n = cnt[cy * CX + cx], w = BW / CX, h = BH / CY, lt = LT0 - (cx + 0.5) / CX * (LT0 - LT1), hh = n ? 0.12 + Math.sqrt(n) * 0.2 : 0.0001;
          dm.position.set(-BW / 2 + (cx + 0.5) * w, (cy + 0.5) * h, -0.55 + hh / 2); dm.scale.set(w * 0.82, h * 0.82, hh); dm.updateMatrix(); bars.setMatrixAt(k, dm.matrix); const c = kelvin(Math.pow(10, lt)); cc.setRGB(c[0], c[1], c[2]); bars.setColorAt(k, cc); k++;
        }
        bars.instanceMatrix.needsUpdate = true; bars.instanceColor.needsUpdate = true;
        rLines.forEach((r) => { if (r.m) r.m.visible = showR && stars; r.L.show(showR && stars); });
        gl.ms.show(grpSel === 'all' || grpSel === 'ms'); gl.gi.show(grpSel === 'all' || grpSel === 'gi'); gl.sg.show(grpSel === 'all' || grpSel === 'sg'); gl.wd.show(grpSel === 'all' || grpSel === 'wd');
        const T = { all: '별 하나하나가 점이에요. 크기는 <b>반지름</b>, 색은 <b>표면 온도</b>예요.<br>대부분의 별은 왼쪽 위에서 오른쪽 아래로 이어진 <b>주계열</b>에 있어요.', ms: '<b>주계열성</b>: 수소를 태우는 별로, 가장 많아요(이 표본의 대부분). 질량이 클수록 위쪽 왼쪽에 있어요.', gi: '<b>거성</b>: 차갑지만(붉음) <b>반지름이 커서</b> 밝아요. 오른쪽 위에 있고 수가 적어요.', sg: '<b>초거성</b>: 아주 크고 밝아요. 맨 위쪽에 있고 아주 드물어요.', wd: '<b>백색 왜성</b>: 뜨겁지만 지구만큼 <b>작아서</b> 어두워요. 왼쪽 아래에 있어요.' };
        info(stars ? T[grpSel] : '막대 높이는 그 칸에 있는 별의 <b>개수</b>예요.<br>주계열 아래쪽(어둡고 붉은 별)에 가장 많아요. 밝은 별일수록 드물어요.');
      }
      controls.segment('보기', [{ value: 'star', label: '⭐ 별' }, { value: 'bar', label: '📊 개수 막대' }], mode, (v) => { mode = v; apply(); });
      controls.segment('집단', [{ value: 'all', label: '전체' }, { value: 'ms', label: '주계열' }, { value: 'gi', label: '거성' }, { value: 'sg', label: '초거성' }, { value: 'wd', label: '백색 왜성' }], grpSel, (v) => { grpSel = v; apply(); });
      const bR = controls.button('지름 같은 선 ✓', () => { showR = !showR; bR.classList.toggle('on', showR); bR.textContent = '지름 같은 선 ' + (showR ? '✓' : '✕'); apply(); }); bR.classList.add('on');
      apply();
      return { update(dt, t) { sunM.scale.setScalar(1 + 0.12 * Math.sin(t * 3)); }, sync() {} };
    },
  });
})();
