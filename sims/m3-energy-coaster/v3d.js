/* m3-energy-coaster · 3D 진자와 롤러코스터 (역학적 에너지 보존)
   2D 차시와 같은 장면: 진자(길이 5 m, 처음 높이 · 질량) · 롤러코스터(레일 모양 · 출발 높이 · 질량) · 위치 에너지(파랑) · 운동 에너지(주황) · 역학적 에너지(보라).
   2D 실험 상태(window.__sim)를 읽어 같은 값을 보여 주고, ▶ 놓기/출발·⏸ 일시정지는 2D 버튼과 같이 움직여요. (공기 저항과 마찰은 무시)
   마찰이 없으면 위치 에너지와 운동 에너지의 합(역학적 에너지)이 늘 같아요. 처음 높이보다 높은 언덕은 넘을 수 없어요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHN = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const KP = 0.8, KC = 0.6;              // 1 m = 0.8 (진자) · 0.6 (롤러코스터)
  const EC = { ep: 0x3b82f6, ek: 0xf97316, me: 0x8b5cf6 };      // 2D 차시와 같은 색
  window.SciSim3D.attach({
    host: '.stage-card',
    title: '진자 · 롤러코스터 에너지 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: PHN ? 21 : 15.5, theta: 0.3, phi: 1.3, min: 7, max: 34, target: [1.2, 2.5, 0] },
    autoRotate: 0,
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const V3 = THREE.Vector3;
      const sm = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.45, metalness: 0.3 }, o || {}));
      const gnd = new THREE.Mesh(new THREE.BoxGeometry(17, 0.3, 5), sm(0x3d6f3a, { roughness: 0.95, metalness: 0 })); gnd.position.set(1.0, -0.15, 0); root.add(gnd);
      const pendG = new THREE.Group(), coasterG = new THREE.Group(); root.add(pendG, coasterG);
      /* ---------- 진자 ---------- */
      const beam = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.14, 0.5), sm(0x64748b)); beam.position.set(0, 4.3 + 0.1, 0); pendG.add(beam);
      [-1.3, 1.3].forEach((x) => { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 4.4, 10), sm(0x94a3b8, { metalness: 0.6 })); l.position.set(x, 2.2, -0.2); pendG.add(l); });
      const str = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 1, 6), new THREE.MeshBasicMaterial({ color: 0xe2e8f0 })); pendG.add(str);
      const bob = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 22), sm(0xf26b3a, { metalness: 0.4, roughness: 0.3 })); pendG.add(bob);
      const hP = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.014, 0.014), new THREE.MeshBasicMaterial({ color: 0x3b82f6, transparent: true, opacity: 0.6 })); hP.position.z = 0.6; pendG.add(hP);
      const hPL = label('', [-2.9, 0, 0.6], { size: 12, color: 'rgba(29,78,216,.92)' });
      const low = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.014, 0.014), new THREE.MeshBasicMaterial({ color: 0x16a34a, transparent: true, opacity: 0.6 })); low.position.set(0, 0.02, 0.6); pendG.add(low);
      label('가장 낮은 곳 (기준면)', [-2.6, 0.02, 0.6], { size: 11, color: 'rgba(22,101,52,.9)' });
      /* ---------- 롤러코스터 ---------- */
      const trackG = new THREE.Group(); coasterG.add(trackG);
      const cart = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.28, 0.5), sm(0xf26b3a, { metalness: 0.2 })); body.position.y = 0.3; cart.add(body);
      [[-0.26, 0.25], [0.26, 0.25], [-0.26, -0.25], [0.26, -0.25]].forEach((q) => { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.07, 16), sm(0x1f2937)); w.rotation.x = Math.PI / 2; w.position.set(q[0], 0.12, q[1]); cart.add(w); });
      coasterG.add(cart);
      const flagM = new THREE.Group(); const fp = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.9, 6), sm(0xe2e8f0)); fp.position.y = 0.45; const fc = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.02), sm(0xef4444, { metalness: 0 })); fc.position.set(0.25, 0.75, 0); flagM.add(fp, fc); coasterG.add(flagM);
      const hS = new THREE.Mesh(new THREE.BoxGeometry(9, 0.014, 0.014), new THREE.MeshBasicMaterial({ color: 0x3b82f6, transparent: true, opacity: 0.55 })); hS.position.z = 0.6; coasterG.add(hS);
      const hSL = label('', [-4.2, 0, 0.6], { size: 12, color: 'rgba(29,78,216,.92)' });
      let railKey = '', X0c = 0, rails = [];
      const heightAt = (L, x) => L.heightAt(x);
      function buildRail(L) {
        while (trackG.children.length) trackG.remove(trackG.children[0]);
        const XE = L.XEND, NS = 120, pts = [];
        X0c = -XE * KC / 2;
        for (let i = 0; i <= NS; i++) { const x = XE * i / NS; pts.push(new V3(X0c + x * KC, heightAt(L, x) * KC + 0.03, 0)); }
        const curve = new THREE.CatmullRomCurve3(pts);
        const mats = sm(0x94a3b8, { metalness: 0.7, roughness: 0.3 });
        [-0.25, 0.25].forEach((z) => { const cp = pts.map((p) => new V3(p.x, p.y, z)); trackG.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(cp), NS, 0.04, 8, false), mats)); });
        const woodM = sm(0x8b5e34, { roughness: 0.9, metalness: 0 }), supM = sm(0x64748b, { roughness: 0.6 });
        for (let i = 0; i <= 60; i++) { const p = curve.getPointAt(i / 60), t = curve.getTangentAt(i / 60); const s = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.04, 0.62), woodM); s.position.copy(p); s.position.y -= 0.05; s.rotation.z = Math.atan2(t.y, t.x); trackG.add(s); }
        for (let i = 0; i <= 24; i++) { const p = curve.getPointAt(i / 24); if (p.y < 0.2) continue; [-0.28, 0.28].forEach((z) => { const s = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, p.y - 0.08, 8), supM); s.position.set(p.x, (p.y - 0.08) / 2, z); trackG.add(s); }); }
        // 도착 게이트
        const gt = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.9, 0.7), sm(0x16a34a, { transparent: true, opacity: 0.5, metalness: 0 })); gt.position.set(X0c + XE * KC, heightAt(L, XE) * KC + 0.5, 0); trackG.add(gt);
      }
      /* ---------- 에너지 막대 ---------- */
      const bars = {}; const BX = 5.8;
      [['ep', '위치 에너지', 0], ['ek', '운동 에너지', 1.1], ['me', '역학적 에너지', 2.2]].forEach(([k, t, dx]) => {
        const m = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1, 0.7), sm(EC[k], { roughness: 0.35, metalness: 0.05 })); m.position.set(BX + dx, 0, -1.4); root.add(m); bars[k] = { m, L: label('', [BX + dx, -0.45, -1.4 + 0.45], { size: 12, color: 'rgba(15,23,42,.88)' }), t };
      });
      const base = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.08, 1.1), sm(0x64748b)); base.position.set(BX + 1.1, -0.04, -1.4); root.add(base);
      const topLine = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.02, 0.02), new THREE.MeshBasicMaterial({ color: 0xa78bfa, transparent: true, opacity: 0.7 })); topLine.position.set(BX + 1.1, 0, -1.4); root.add(topLine);
      const cLab = label('', cart, { size: 12, color: 'rgba(15,23,42,.9)', offset: [0, 1.0, 0] });
      const bLab = label('', bob, { size: 12, color: 'rgba(15,23,42,.9)', offset: [0, 0.9, 0] });
      let scene = '', infoK = '';
      function setScene(sc) {
        scene = sc; pendG.visible = sc === 'pend'; coasterG.visible = sc === 'coaster';
        cLab.show(sc === 'coaster'); bLab.show(sc === 'pend'); hPL.show(sc === 'pend'); hSL.show(sc === 'coaster'); railKey = '';
      }
      /* ▶ 놓기 / 출발 (2D 화면의 버튼과 같이 움직여요) */
      let prevP = false, prevR = false;
      const pl = controls.player({
        duration: 6, loop: true, label: '놓기 · 출발',
        phases: [[0, '출발'], [0.25, '내려가며 빨라져요'], [0.5, '올라가며 느려져요']],
        onFrame() { /* 2D의 움직임을 따라가요 (아래 update) */ },
      });
      const runBtn = () => document.getElementById('runBtn');
      return {
        update(dt, t) {
          const L = ctx.lesson(); if (!L || !L.S) return;
          const S = L.S, sc = S.scene === 'coaster' ? 'coaster' : 'pend';
          if (sc !== scene) setScene(sc);
          const E = L.energies(), SC = L.SCALE[sc], run = S.state === 'running';
          /* ▶ 버튼 ↔ 2D 버튼 */
          if (pl.playing !== prevP) { if (pl.playing !== run && (pl.playing || run)) { const b = runBtn(); if (b) b.click(); } }
          else if (run !== prevR) { if (run && !pl.playing) pl.play(); else if (!run && pl.playing) pl.pause(); }
          prevP = pl.playing; prevR = S.state === 'running';
          let ph;
          if (sc === 'pend') {
            const thMax = Math.acos(Math.max(-1, Math.min(1, 1 - S.hp0 / L.LP))) || 1, th = S.thd != null ? S.thd : S.th, om = S.omd != null ? S.omd : S.om;
            const a = Math.acos(Math.max(-1, Math.min(1, S.side * th / thMax))) / (2 * Math.PI);
            ph = S.side * om <= 0 ? a : 1 - a;
          } else ph = Math.min(1, (S.xd != null ? S.xd : S.x) / L.XEND);
          if (S.state === 'ready') { if (pl.p > 0.003) pl.set(0); } else if (Math.abs(ph - pl.p) > 0.003) pl.set(ph);
          /* 장면 그리기 */
          if (sc === 'pend') {
            const th = S.thd != null ? S.thd : S.th, Lp = L.LP * KP, piv = new V3(0, 4.3, 0);
            const bx = Math.sin(th) * Lp, by = piv.y - Math.cos(th) * Lp, r = 0.18 + 0.05 * S.m;
            bob.scale.setScalar(r); bob.position.set(bx, by, 0);
            str.position.set(bx / 2, (piv.y + by) / 2, 0); str.scale.y = Math.max(0.01, Math.hypot(bx, piv.y - by)); str.rotation.z = Math.atan2(bx, piv.y - by);
            const y0 = piv.y - Lp;                                     // 가장 낮은 곳 (기준면)
            low.position.y = y0; hP.position.y = y0 + S.hp0 * KP; hPL.obj = [-2.9, y0 + S.hp0 * KP, 0.6]; hPL.set('처음 높이 ' + S.hp0.toFixed(1) + ' m');
            bLab.set('높이 ' + E.h.toFixed(2) + ' m · 속력 ' + E.v.toFixed(1) + ' m/s');
          } else {
            const key = S.H.join(',') + '|' + S.d.join(',');
            if (key !== railKey) { railKey = key; buildRail(L); }
            const x = S.xd != null ? S.xd : S.x, h = L.heightAt(x), p = new V3(X0c + x * KC, h * KC + 0.03, 0), sl = L.slopeAt(x);
            cart.position.copy(p); cart.rotation.z = Math.atan(sl);
            hS.position.y = S.H[0] * KC + 0.03; hSL.obj = [-4.2, S.H[0] * KC + 0.03, 0.6]; hSL.set('출발 높이 ' + S.H[0].toFixed(1) + ' m');
            const fo = S.flag && S.flag.preset === S.preset ? S.flag : null; flagM.visible = !!fo;
            if (fo) { const fx = fo.idx * L.DX; flagM.position.set(X0c + fx * KC, L.heightAt(fx) * KC + 0.03, 0); }
            cLab.set('높이 ' + E.h.toFixed(1) + ' m · 속력 ' + E.v.toFixed(1) + ' m/s');
          }
          /* 에너지 막대 (J) */
          const sc2 = 3.6 / SC.E;
          const vals = { ep: E.Ep, ek: E.Ek, me: E.mech };
          Object.keys(bars).forEach((k) => { const v = Math.max(0.0005, vals[k] * sc2); bars[k].m.scale.y = v; bars[k].m.position.y = v / 2; bars[k].L.set(bars[k].t + '<br><b>' + Math.round(vals[k]) + ' J</b>'); });
          topLine.position.y = (S.m * L.G * (sc === 'pend' ? S.hp0 : S.H[0])) * sc2;
          const ik = [sc, Math.round(E.Ep), Math.round(E.Ek), S.m, S.state].join('|');
          if (ik !== infoK) { infoK = ik; info('<b>' + (sc === 'pend' ? '진자' : '롤러코스터') + '</b> · 질량 <b>' + S.m + ' kg</b><br><span style="color:#93c5fd">위치 에너지 ' + Math.round(E.Ep) + ' J</span> + <span style="color:#fdba74">운동 에너지 ' + Math.round(E.Ek) + ' J</span> = <b style="color:#c4b5fd">역학적 에너지 ' + Math.round(E.mech) + ' J</b><br>마찰이 없으면 합이 처음 값과 늘 같아요. 처음 높이보다 높은 곳은 올라갈 수 없어요.'); }
        },
      };
    },
  });
})();
