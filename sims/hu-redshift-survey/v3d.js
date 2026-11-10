/* hu-redshift-survey · 3D 은하의 3차원 지도 (적색 편이로 거리를 구해 쐐기 도표를 입체로)
   하늘 사진은 방향(θ)만 알려 줘요. 스펙트럼선의 적색 이동 z로 후퇴 속도 v = cz, 거리 d = v / H₀ (H₀ = 70 km/s/Mpc)를 구하면
   은하를 3차원 공간에 놓을 수 있어요. 2D 쐐기 도표에서 찍은 은하를 그대로 입체로 보여 줘요.
   분광 z(오차 약 10⁻⁴)로 잰 지도는 은하단과 빈 곳이 선명하고, 측광 z(오차 약 0.03)로 잰 지도는 거리가 번져 흐려져요.
   (높이 방향의 두께는 보기 좋게 나타냈어요.) 2D 실험의 은하 자료(GAL, WD)를 그대로 읽어요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const TAU = Math.PI * 2, DEG = Math.PI / 180, UNIT = 5 / 320, RMAX = 320, THMAX = 20, EL = 6 * DEG;   // 장면 길이 / Mpc

  window.SciSim3D.attach({
    title: '은하의 3차원 지도 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    levels: [2],
    camera: { dist: PHONE ? 11.5 : 8.6, theta: Math.PI, phi: 0.62, min: 3, max: 22, target: [0, 0, 2.3] },
    autoRotate: 0,
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const W = () => window.__sim || {};
      const st = { blur: 0, key: '', P: 0 };
      let seed = 77; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
      { const pos = []; for (let i = 0; i < 400; i++) { const u = rnd() * 2 - 1, a = rnd() * TAU, r = Math.sqrt(1 - u * u); pos.push(Math.cos(a) * r * 60, u * 60, Math.sin(a) * r * 60); }
        const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        root.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xaec3ff, size: 1.4, sizeAttenuation: false, transparent: true, opacity: 0.45 }))); }

      /* 쐐기 (방향 θ ±20°, 거리 0~320 Mpc) · 거리 눈금 */
      const lineMat = (op) => new THREE.LineBasicMaterial({ color: 0x94a3b8, transparent: true, opacity: op });
      const dir = (th, d, el) => new THREE.Vector3(d * UNIT * Math.cos(el) * Math.sin(th * DEG), d * UNIT * Math.sin(el), d * UNIT * Math.cos(el) * Math.cos(th * DEG));
      [-THMAX, THMAX].forEach((th) => root.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([dir(th, 0, 0), dir(th, RMAX, 0)]), lineMat(0.7))));
      [100, 200, 300].forEach((d) => {
        const p = []; for (let i = 0; i <= 40; i++) p.push(dir(-THMAX + (2 * THMAX * i) / 40, d, 0));
        root.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(p), lineMat(0.5)));
        label(d + ' Mpc', dir(THMAX + 1.5, d, 0).toArray(), { size: 11, color: 'rgba(40,60,120,.85)' });
      });
      const wedgeFill = (() => { const sh = new THREE.Shape(); sh.moveTo(0, 0); for (let i = 0; i <= 40; i++) { const th = (-THMAX + (2 * THMAX * i) / 40) * DEG; sh.lineTo(RMAX * UNIT * Math.sin(th), RMAX * UNIT * Math.cos(th)); } sh.lineTo(0, 0);
        const m = new THREE.Mesh(new THREE.ShapeGeometry(sh), new THREE.MeshBasicMaterial({ color: 0x6366f1, transparent: true, opacity: 0.1, side: THREE.DoubleSide, depthWrite: false })); m.rotation.x = Math.PI / 2; root.add(m); return m; })();
      const obs = new THREE.Mesh(new THREE.SphereGeometry(0.1, 20, 14), new THREE.MeshBasicMaterial({ color: 0x60a5fa })); root.add(obs);
      { const fit = new THREE.Mesh(new THREE.BoxGeometry(2 * RMAX * UNIT * Math.sin(THMAX * DEG) + 0.6, 0.8, RMAX * UNIT + 0.3), new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false })); fit.position.set(0, 0, RMAX * UNIT / 2); root.add(fit); }   // 자동 맞춤용 보이지 않는 상자: 쐐기 전체가 화면에 크게 들어오게
      label('우리 (관측자)', obs, { offset: [0, 0.4, 0], color: 'rgba(30,64,140,.92)' });

      /* 은하 400개 (2D의 GAL) */
      const w0 = W(), GAL = w0.GAL || [], N = Math.min(400, GAL.length || 0);
      const gm = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 9), new THREE.MeshBasicMaterial({ color: 0xffffff }), Math.max(1, N)); gm.frustumCulled = false; root.add(gm);
      const col = new THREE.Color(), dm = new THREE.Object3D();
      for (let i = 0; i < N; i++) { const tg = i < 6; gm.setColorAt(i, col.setHex(tg ? 0xfbbf24 : (GAL[i].kind && GAL[i].kind.indexOf('cl') === 0 ? 0xc7d2fe : 0xe0e7ff))); }
      if (gm.instanceColor) gm.instanceColor.needsUpdate = true;
      const tgLab = []; for (let i = 0; i < 6; i++) tgLab.push(label('G' + (i + 1), [0, 0, 0], { size: 11, color: 'rgba(120,80,0,.92)' }));
      const selRing = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.015, 8, 32), new THREE.MeshBasicMaterial({ color: 0x4ade80 })); selRing.visible = false; root.add(selRing);
      const smooth = (t) => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };
      const reflect = (d) => { let v = Math.abs(d); if (v > RMAX) v = 2 * RMAX - v; return Math.max(0, Math.min(RMAX, v)); };
      let shown = 0;
      function layout() {
        const w = W(), S = w.S || {}, WD = S.wd || { list: [], set: new Set() }, free = !!(w.game && w.game.free);
        const sig = (w.SIG_SPEC || 0.43) + ((w.SIG_PHOT || 129) - (w.SIG_SPEC || 0.43)) * smooth(st.blur);
        const idxs = [];
        if (S.view === 'wedge') WD.list.forEach((e) => idxs.push(e.i));
        else for (let i = 0; i < 6; i++) if (free || (S.dOK && S.dOK[i])) idxs.push(i);
        shown = 0; tgLab.forEach((l) => l.show(false));
        idxs.forEach((i) => {
          const g = GAL[i]; if (!g || shown >= N) return;
          const dd = reflect(g.d + g.eps * sig), p = dir(g.th, dd, g.u * EL), tg = i < 6;
          dm.position.copy(p); dm.scale.setScalar(tg ? 0.08 : 0.045); dm.quaternion.identity(); dm.updateMatrix(); gm.setMatrixAt(shown++, dm.matrix);
          if (tg) { tgLab[i].obj = p.toArray(); tgLab[i].off = [0, 0.22, 0]; tgLab[i].show(true); }
        });
        gm.count = shown; gm.instanceMatrix.needsUpdate = true;
        const sel = S.sel; if (S.view !== 'wedge' && sel >= 0 && sel < 6 && GAL[sel] && (free || (S.dOK && S.dOK[sel]))) { selRing.visible = true; selRing.position.copy(dir(GAL[sel].th, GAL[sel].d, GAL[sel].u * EL)); selRing.lookAt(ctx.camera.position); } else selRing.visible = false;
        const mode = WD.mode || 'spec', errK = !!(WD.errOK && WD.errOK[0] && WD.errOK[1]) || free;
        let h;
        if (S.view === 'wedge') {
          h = '<b>은하의 3차원 지도</b> · 찍은 은하 ' + shown + '개<br>방향 θ와 거리 d(= cz / H₀)로 놓았어요. 거리는 <b>' + (mode === 'spec' ? '분광 z' : '측광 z') + '</b>로 쟀어요.<br>' +
            (st.blur < 0.5 ? '분광 z로 재면 은하단과 빈 곳이 <b>선명</b>해요.' : '측광 z로 재면 거리가 <b>번져서</b> 구조가 흐려져요.') + (errK ? '' : '');
        } else h = '<b>스펙트럼으로 거리를 구한 은하</b> · ' + shown + '개<br>z → v = cz → d = v / H₀ 로 거리를 구하면 은하를 3차원에 놓을 수 있어요. 옆에서 은하마다 계산해 봐요.';
        info(h);
      }
      /* ▶ 재생: 분광 z → 측광 z → 분광 z 로 바꿔 가며 같은 은하들의 지도가 어떻게 선명해지고 흐려지는지 봐요 (2D '거리 측정' 선택도 함께 바뀌어요) */
      let ready = false, lastMode = '';
      const player = controls.player({
        duration: 10, loop: true, autoplay: false, label: '재생',
        phases: [[0, '분광 z (선명)'], [0.45, '측광 z (흐림)']],
        onFrame(p) {
          st.P = p; if (!ready) return;
          const m = (p >= 0.45 && p < 0.95) ? 'phot' : 'spec';
          const w = W(), S = w.S;
          if (S && S.view === 'wedge' && S.wd && m !== lastMode) { lastMode = m; S.wd.mode = m; S.wd.seen[m] = true; try { w.updateCtl(); } catch (e) { /* 무시 */ } }
        },
      });
      ready = true;
      function follow(dt) {
        const w = W(), S = w.S; if (!S || !S.wd) return;
        const tgt = S.wd.mode === 'phot' ? 1 : 0;
        const nb = st.blur + (tgt - st.blur) * Math.min(1, dt * 2.4);
        const key = [S.view, S.wd.list.length, S.wd.mode, S.sel, S.dOK && S.dOK.join(''), w.game && w.game.free].join('|');
        if (Math.abs(nb - st.blur) > 0.002 || key !== st.key) { st.blur = Math.abs(tgt - nb) < 0.002 ? tgt : nb; st.key = key; layout(); }
      }
      layout();
      return {
        update(dt) { follow(dt); selRing.lookAt(ctx.camera.position); },
        sync() { st.key = ''; layout(); },
      };
    },
  });
})();
