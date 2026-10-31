/* hq-polarization · 3D 빛의 편광 (횡파의 진동 방향 · 편광판의 투과축 · 두 장/세 장 겹침)
   빛은 +x 방향으로 나아가는 횡파이고, 전기장 E는 x에 수직한 y–z 면에서 진동해요. 투과축 각도 a: 0° = 세로(y), 위에서 앞(z)쪽으로 돌려요.
   편광판은 투과축 방향의 E 성분만 통과시켜요(진폭 = 앞 판에 대한 성분). 밝기는 2D 차시와 같이 정성적(말 단계)으로만 나타내요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHN = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches), KD = PHN ? 1.45 : 1;
  const D2R = Math.PI / 180;

  window.SciSim3D.attach({
    title: '편광 3D — 빛의 진동 방향',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: PHN ? 25 : 15.5, theta: PHN ? 0.8 : 0.48, phi: 1.2, min: 8, max: 40, target: [0, 0, 0] },
    autoRotate: 0,
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const V3 = THREE.Vector3, Yax = new V3(0, 1, 0);
      const lessonS = () => (window.__sim && window.__sim.S) || null;
      const L = window.__sim || {};
      const cos2 = (a) => Math.pow(Math.cos(a * D2R), 2), sin2 = (a) => Math.pow(Math.sin(a * D2R), 2);
      const polT = L.polT || ((n, a) => (n === 1 ? 1 : n === 2 ? cos2(a) : cos2(a) * sin2(a)));
      const levelWord = L.levelWord || ((T) => (T >= 0.9 ? '아주 밝음' : T >= 0.6 ? '밝음' : T >= 0.3 ? '중간' : T >= 0.1 ? '약함' : T >= 0.03 ? '아주 약함' : '거의 없음'));
      const st = { n: 2, ang: 0 };
      const S0 = lessonS(); if (S0 && S0.pol) { st.n = S0.pol.n; st.ang = S0.pol.ang; }

      const mat = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.5, metalness: 0.1 }, o || {}));
      const basic = (c, o) => new THREE.MeshBasicMaterial(Object.assign({ color: c }, o || {}));
      function mkArrow(col, rad) {
        const g = new THREE.Group(); const m = mat(col, { roughness: 0.4 });
        const sh = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, 1, 10), m), hd = new THREE.Mesh(new THREE.ConeGeometry(rad * 2.6, rad * 6, 14), m);
        g.add(sh, hd); g.userData = { sh, hd, rad }; return g;
      }
      function setArrow(g, a, b) {
        const d = new V3().subVectors(b, a), len = d.length(); const { sh, hd, rad } = g.userData;
        if (len < 1e-3) { g.visible = false; return; }
        g.visible = true; const hl = Math.min(len * 0.5, rad * 6);
        sh.scale.y = Math.max(0.001, len - hl); sh.position.y = (len - hl) / 2; hd.scale.y = hl / (rad * 6); hd.position.y = len - hl / 2;
        g.position.copy(a); g.quaternion.setFromUnitVectors(Yax, d.normalize());
      }

      const LAMP = PHN ? -5 : -7, SCR = PHN ? 5 : 7, RAD = 1.75, KW = 2 * Math.PI / 2.4, OM = 2.8, AMP = 1.15;
      /* ---------- 전구 · 화면 · 빛의 진행 화살표 ---------- */
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.45, 20, 14), mat(0xffe27a, { emissive: 0xffc83a, emissiveIntensity: 0.9 })); bulb.position.x = LAMP; root.add(bulb);
      label('💡 자연광', bulb, { color: 'rgba(8,12,24,.78)', size: 13, offset: [0, 0.9, 0] });
      const travel = mkArrow(0xffffff, 0.03); setArrow(travel, new V3(LAMP + 0.8, -RAD - 0.5, 0), new V3(SCR - 1.0, -RAD - 0.5, 0)); root.add(travel); travel.children.forEach((c) => (c.material = mat(0xaab4cf, { transparent: true, opacity: 0.55 })));
      label('빛의 진행 방향 →', [0, -RAD - 0.5, 0], { color: 'rgba(8,12,24,.7)', size: 12, offset: [0, -0.35, 0] });
      const screen = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 3.2), new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide })); screen.rotation.y = Math.PI / 2; screen.position.x = SCR; root.add(screen);
      const scrFrame = new THREE.Mesh(new THREE.BoxGeometry(0.12, 3.4, 3.4), mat(0x2a3350)); scrFrame.position.x = SCR + 0.1; root.add(scrFrame);
      const labScr = label('화면', screen, { color: 'rgba(8,12,24,.78)', size: 13, offset: [0, 2.05, 0] });
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1, 0.3), basic(0xffd34d)); bar.position.set(SCR, 0, 2.4); root.add(bar);
      const barFrame = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(0.34, 3.2, 0.34)), new THREE.LineBasicMaterial({ color: 0x8a96b8 })); barFrame.position.set(SCR, 0, 2.4); root.add(barFrame);
      const labLevel = label('', bar, { color: 'rgba(8,12,24,.82)', size: 13, offset: [0, 0, 0.0] });
      const labLevelTip = new THREE.Object3D(); root.add(labLevelTip); labLevel.obj = labLevelTip;

      /* ---------- 편광판 3개 (필요한 만큼 보여요) ---------- */
      const sheets = [0, 1, 2].map(() => {
        const g = new THREE.Group();
        const disc = new THREE.Mesh(new THREE.CircleGeometry(RAD, 48), basic(0x4a74ff, { transparent: true, opacity: 0.16, side: THREE.DoubleSide })); disc.rotation.y = Math.PI / 2; g.add(disc);
        const ring = new THREE.Mesh(new THREE.TorusGeometry(RAD, 0.05, 8, 64), mat(0x4a74ff)); ring.rotation.y = Math.PI / 2; g.add(ring);
        const grate = new THREE.Group(); g.add(grate);
        const slits = [];
        for (let k = -7; k <= 7; k++) { const z = k * RAD / 7.5, h = 2 * Math.sqrt(Math.max(0.01, RAD * RAD - z * z)); const b = new THREE.Mesh(new THREE.BoxGeometry(0.03, h, 0.025), basic(0x9fb6ff, { transparent: true, opacity: 0.7 })); b.position.set(0, 0, z); grate.add(b); slits.push(b); }
        const arrow = mkArrow(0xf26b3a, 0.045); g.add(arrow);
        const tip = new THREE.Object3D(); g.add(tip);
        const lab = label('', ring, { color: 'rgba(8,12,24,.8)', size: 13, offset: [0, RAD + 0.55, 0] });
        const labAx = label('', tip, { color: 'rgba(8,12,24,.8)', size: 12, offset: [0, 0, 0] });
        root.add(g); return { g, disc, ring, grate, arrow, tip, lab, labAx, slits };
      });

      /* ---------- 빛(전기장 E)의 파동: 기준선에서 위아래로 오르내리는 띠 + 끝점 선 ---------- */
      const NPTS = 70;
      function mkWave(color, nRib) {
        const ribs = [];
        for (let j = 0; j < nRib; j++) {
          const pos = new Float32Array(NPTS * 2 * 3), idx = [];
          for (let i = 0; i < NPTS - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
          const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setIndex(idx);
          const mesh = new THREE.Mesh(geo, basic(color, { transparent: true, opacity: nRib > 1 ? 0.18 : 0.35, side: THREE.DoubleSide, depthWrite: false }));
          const lpos = new Float32Array(NPTS * 3), lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.BufferAttribute(lpos, 3));
          const line = new THREE.Line(lg, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.95 }));
          mesh.frustumCulled = false; line.frustumCulled = false; root.add(mesh, line); ribs.push({ pos, geo, mesh, lpos, lg, line });
        }
        return ribs;
      }
      const waves = [mkWave(0xfff3b0, 4), mkWave(0xffb347, 1), mkWave(0xffb347, 1), mkWave(0xffb347, 1)];
      function drawWave(rib, x0, x1, alpha, amp, ph, t) {
        const ca = Math.cos(alpha * D2R), sa = Math.sin(alpha * D2R);
        for (let i = 0; i < NPTS; i++) {
          const x = x0 + (x1 - x0) * i / (NPTS - 1), s = amp * Math.sin(KW * x - OM * t + ph), a = i * 6, b = i * 3;
          rib.pos[a] = x; rib.pos[a + 1] = 0; rib.pos[a + 2] = 0; rib.pos[a + 3] = x; rib.pos[a + 4] = s * ca; rib.pos[a + 5] = s * sa;
          rib.lpos[b] = x; rib.lpos[b + 1] = s * ca; rib.lpos[b + 2] = s * sa;
        }
        rib.geo.attributes.position.needsUpdate = true; rib.lg.attributes.position.needsUpdate = true;
      }

      /* ---------- 상태 → 배치 ---------- */
      let axes = [0, 0, 0], xs = [], amps = [], T = 1;
      function layout() {
        const n = st.n; xs = []; for (let i = 0; i < n; i++) xs.push(LAMP + (SCR - LAMP) * (i + 1) / (n + 1));
        axes = n === 1 ? [st.ang] : n === 2 ? [0, st.ang] : [0, st.ang, 90];
        amps = [1];                                                          // 판을 지날 때 진폭 = 앞 편광 방향의 성분 (n=1: 자연광 → 전부 한 방향)
        for (let i = 1; i < n; i++) amps.push(amps[i - 1] * Math.abs(Math.cos((axes[i] - axes[i - 1]) * D2R)));
        T = polT(n, st.ang);
        sheets.forEach((s, i) => {
          const on = i < n; s.g.visible = on; s.lab.show(on); s.labAx.show(on);
          if (!on) return;
          const rot = (n === 1 && i === 0) || (n === 2 && i === 1) || (n === 3 && i === 1);
          const col = rot ? 0xf26b3a : 0x4a74ff;
          s.g.position.x = xs[i]; s.grate.rotation.x = axes[i] * D2R;
          s.ring.material.color.setHex(col); s.disc.material.color.setHex(col); s.slits.forEach((b) => b.material.color.setHex(rot ? 0xffc29f : 0x9fb6ff));
          const u = new V3(0, Math.cos(axes[i] * D2R), Math.sin(axes[i] * D2R));
          setArrow(s.arrow, u.clone().multiplyScalar(-RAD * 0.95), u.clone().multiplyScalar(RAD * 0.95)); s.arrow.children.forEach((c) => (c.material = mat(col, { emissive: col, emissiveIntensity: 0.35 })));
          s.tip.position.copy(u.clone().multiplyScalar(RAD * 1.08)); s.labAx.set('투과축 ' + Math.round(axes[i]) + '°'); s.labAx.el.style.background = rot ? '#f26b3a' : '#2f55d4';
          s.lab.set(n === 1 ? '편광판' : n === 2 ? (i === 0 ? 'P₁' : 'P₂') : (i === 0 ? 'P₁' : i === 1 ? '가운데 판' : 'P₃'));
        });
        // 화면 밝기 (2D와 같은 정성적 단계) + 막대
        const lvl = Math.pow(T, 0.6);
        screen.material.color.setRGB(0.1 + 0.9 * lvl, 0.1 + 0.9 * lvl, 0.1 + 0.85 * lvl);
        bar.scale.y = Math.max(0.02, 3.2 * lvl); bar.position.y = -1.6 + bar.scale.y / 2; labLevelTip.position.set(SCR, -1.6 + bar.scale.y + 0.3, 2.4);
        labLevel.set(levelWord(T));
        textInfo();
      }
      function textInfo() {
        const n = st.n, a = Math.round(st.ang);
        let h = '<b>자연광</b>은 E가 모든 방향으로 진동해요. ';
        if (n === 1) h += '편광판 한 장을 지나면 <b>투과축 방향</b> 진동만 남아요(편광). 한 장만 돌리면 화면 밝기는 그대로예요.';
        else if (n === 2) h += 'P₁ 통과 후 E는 투과축 <b>0°</b> 방향 한 방향뿐. P₂(<b>' + a + '°</b>)는 그 방향과 이루는 각에 따라 <b>투과축 방향 성분</b>만 통과해요. ' + (a % 180 === 90 ? '각이 90°이면 성분이 0이라 <b>빛이 막혀요</b>.' : a % 180 === 0 ? '두 판이 나란하면 그대로 통과해요.' : '각이 클수록 통과하는 진폭이 줄어요.');
        else h += '두 판(0°, 90°)만 있으면 막히지만, <b>가운데 판(' + a + '°)</b>이 있으면 E가 가운데 판 방향으로 한 번 더 <b>돌려져</b> 성분이 생겨 일부가 통과해요. ' + (a % 90 === 0 ? '가운데 판이 0° 또는 90°이면 여전히 어두워요.' : '');
        h += '<br>화면 밝기: <b>' + levelWord(T) + '</b>';
        info(h);
      }

      /* ---------- 조작 ---------- */
      const segN = controls.segment('편광판', [{ value: 1, label: '1장' }, { value: 2, label: '2장' }, { value: 3, label: '3장' }], st.n, (v) => { st.n = v; layout(); });
      const rA = controls.range('돌리는 판의 투과축', 0, 180, 5, st.ang, (v) => { st.ang = v; layout(); }, (v) => v + '°');
      controls.button('90° (직교)', () => { st.ang = 90; rA.set(90); layout(); });
      controls.button('0°', () => { st.ang = 0; rA.set(0); layout(); });
      layout();

      return {
        update(dt, t) {
          const n = st.n; const edges = [LAMP + 0.7].concat(xs).concat([SCR - 0.05]);
          waves.forEach((w, k) => w.forEach((r) => { r.mesh.visible = r.line.visible = k <= n; }));
          // ① 자연광: 방향이 계속 바뀌는 여러 장의 띠
          waves[0].forEach((r, j) => drawWave(r, edges[0], xs[0] - 0.12, j * 45 + 35 * Math.sin(0.9 * t + j * 1.7), AMP * 0.75, j * 1.9, t));
          // ② 편광판 뒤: 한 방향으로만 진동하는 평면 편광
          for (let i = 0; i < n; i++) {
            const x0 = xs[i] + 0.12, x1 = i + 1 < n ? xs[i + 1] - 0.12 : edges[edges.length - 1];
            const A = AMP * amps[i], r = waves[i + 1][0];
            r.mesh.visible = r.line.visible = A > 0.015 || true;
            drawWave(r, x0, x1, axes[i], A, 0.5 * i, t);
            r.mesh.material.opacity = Math.min(0.45, 0.05 + A * 0.3); r.line.material.opacity = A < 0.02 ? 0.25 : 0.95;
          }
        },
        sync() { const S = lessonS(); if (!S || !S.pol) return; st.n = S.pol.n; st.ang = S.pol.ang; segN.set(st.n); rA.set(st.ang); layout(); },
      };
    },
  });
})();
