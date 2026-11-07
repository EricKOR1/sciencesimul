/* m2-expanding-universe · 3D 팽창하는 우주 (풍선 모형 · 은하 격자 모형)
   스티커(은하) 자체는 커지지 않고 사이 거리만 늘어나요. 기준(3단계)을 바꾸면 3단계 미션처럼 풍선이 다시 부풀어요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHN = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const ST = [
    { id: 'A', lon: 0, lat: 0, col: '#facc15' }, { id: 'B', lon: 17, lat: 10, col: '#fb7185' }, { id: 'C', lon: -30, lat: 14, col: '#4ade80' },
    { id: 'D', lon: 40, lat: -33, col: '#c084fc' }, { id: 'E', lon: -52, lat: -40, col: '#fb923c' },
  ];

  window.SciSim3D.attach({
    title: '팽창하는 우주 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: PHN ? 9 : 9, theta: 0.2, phi: 1.3, min: 4, max: 22 },
    autoRotate: 0.08,
    levels: [0, 2, 3],               // 2단계(스티커를 눌러 거리 재기 · 표 해석)만 2D
    build(ctx) {
      const { THREE, root, label, info, controls, orbit } = ctx;
      let autoD = null;   // 풍선이 커지면 카메라도 물러서요 (학생이 직접 확대·축소하면 그대로 둬요)
      const V3 = THREE.Vector3, DEG = Math.PI / 180;
      const sm = () => window.__sim;
      const mat = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.5, metalness: 0.05 }, o || {}));
      const R0 = 2.4;
      const balloon = new THREE.Group(), lattice = new THREE.Group(); root.add(balloon, lattice);

      /* ---------- 풍선 ---------- */
      const bal = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 40), new THREE.MeshStandardMaterial({ color: 0x7fb7ff, transparent: true, opacity: 0.45, roughness: 0.12, metalness: 0, depthWrite: false })); bal.renderOrder = 1; balloon.add(bal);
      const knot = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.3, 16), mat(0x5c93d8, { roughness: 0.4 })); knot.position.y = -1.02; knot.rotation.x = Math.PI; balloon.add(knot);
      // 은하 스티커: 소용돌이 그림 (크기는 늘 일정)
      function galTex(col) {
        const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
        const gr = g.createRadialGradient(64, 64, 2, 64, 64, 62); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.18, col); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
        g.strokeStyle = col; g.lineWidth = 7; g.lineCap = 'round'; g.globalAlpha = 0.85;
        for (let a = 0; a < 2; a++) { g.beginPath(); for (let t = 0; t < 4.2; t += 0.1) { const r = 6 + t * 12, an = t + a * Math.PI; const x = 64 + Math.cos(an) * r, y = 64 + Math.sin(an) * r * 0.92; t === 0 ? g.moveTo(x, y) : g.lineTo(x, y); } g.stroke(); }
        return new THREE.CanvasTexture(c);
      }
      const stk = ST.map((s) => {
        const lo = s.lon * DEG, la = s.lat * DEG; s.v = new V3(Math.cos(la) * Math.sin(lo), Math.sin(la), Math.cos(la) * Math.cos(lo));
        const m = new THREE.Mesh(new THREE.CircleGeometry(0.34, 32), new THREE.MeshBasicMaterial({ map: galTex(s.col), transparent: true, depthWrite: false, side: THREE.DoubleSide, depthTest: false })); m.renderOrder = 6; balloon.add(m); return m;
      });
      // 기준 스티커에서 다른 스티커까지 줄자 (큰 원의 호)
      const arcs = ST.map(() => { const m = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, depthTest: false })); m.renderOrder = 5; balloon.add(m); return m; });
      const dLab = ST.map((s) => { const l = label('', [0, 0, 0], { color: 'rgba(20,30,60,.9)' }); return l; });
      const refLab = label('기준', [0, 0, 0], { color: 'rgba(255,211,77,.95)' }); refLab.el.style.color = '#1b2333';

      /* ---------- 은하 격자 ---------- */
      const G = 5, NG = G * G * G, SPC = 0.78;
      const gInst = new THREE.InstancedMesh(new THREE.SphereGeometry(0.085, 14, 10), new THREE.MeshStandardMaterial({ color: 0xcfe0ff, emissive: 0x8fb0ff, emissiveIntensity: 0.6, roughness: 0.3 }), NG); gInst.frustumCulled = false; lattice.add(gInst);
      const home = []; for (let i = 0; i < G; i++) for (let j = 0; j < G; j++) for (let k = 0; k < G; k++) home.push(new V3(i - 2, j - 2, k - 2).multiplyScalar(SPC));
      const trail = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xffd34d, transparent: true, opacity: 0.8 })); trail.frustumCulled = false; lattice.add(trail);
      trail.geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(NG * 6), 3));
      const refM = new THREE.Mesh(new THREE.SphereGeometry(0.22, 20, 14), new THREE.MeshBasicMaterial({ color: 0xffd34d })); lattice.add(refM);
      const ghost = new THREE.InstancedMesh(new THREE.SphereGeometry(0.06, 8, 6), new THREE.MeshBasicMaterial({ color: 0x8fa0c8, transparent: true, opacity: 0.4 }), NG); ghost.frustumCulled = false; lattice.add(ghost);
      const lRef = label('나 (기준 은하)', refM, { offset: [0, 0.5, 0] });
      lattice.visible = false;

      /* ---------- 상태 · 조작 ---------- */
      let mode = 'balloon', s = 1, ref = 0, labs = true, lastInfo = '', pl = null;
      let latRef = 62;   // 격자에서의 기준 은하 번호
      const dm = new THREE.Object3D(), tmpA = new V3(), tmpB = new V3();
      const pastOK = () => { try { const g = sm() && sm().game && sm().game(); return !g || g.free || g.level === 3; } catch (e) { return true; } };
      function setS(v) { s = Math.max(0.1, Math.min(2, v)); const q = sm(); if (q && q.setSize) q.setSize(s, true); sizeR.set(s); }
      const sg = controls.segment('모형', [{ label: '풍선', value: 'balloon' }, { label: '은하 격자', value: 'lat' }], mode, (v) => { mode = v; balloon.visible = v === 'balloon'; lattice.visible = v === 'lat'; lastInfo = ''; });
      const sizeR = controls.range('풍선 크기(팽창)', 0.1, 2, 0.02, s, (v) => { if (pl) pl.pause(); if (v < 1 && !pastOK()) { v = 1; sizeR.set(1); } s = v; const q = sm(); if (q && q.setSize) q.setSize(v, true); }, (v) => (v < 0.95 ? '과거 ' : v > 1.05 ? '' : '') + '×' + v.toFixed(2));
      const sgRef = controls.segment('기준', ST.map((q, i) => ({ label: q.id, value: i })), 0, (i) => { ref = i; const q = sm(); if (q && q.setRef) { let play = false; try { const g = q.game && q.game(); play = !g || g.free || g.level === 2; } catch (e) { /* 무시 */ } q.setRef(i, play); } latRef = [62, 0, 124, 20, 100][i]; });
      // ▶ 재생: 풍선이 1배 → 2배로 부풀고(스티커 사이가 모두 멀어져요), 다시 거꾸로 되감겨요. 실험의 풍선 크기도 같이 바뀌어요.
      const smooth = (x) => x * x * (3 - 2 * x);
      pl = controls.player({
        duration: 10, loop: true, autoplay: false, label: '풍선 부풀리기',
        phases: [[0, '부풀리기 (1배 → 2배)'], [0.42, '멈춤'], [0.5, '되감기 (시간을 거꾸로)']],
        onFrame(p) {
          if (!pl) return;
          const v = p < 0.42 ? 1 + smooth(p / 0.42) : p < 0.5 ? 2 : 2 - smooth((p - 0.5) / 0.5);
          s = v; sizeR.set(v); const q = sm(); if (q && q.setSize) q.setSize(v, true);
        },
      });
      controls.button('이름표', () => { labs = !labs; });
      let k0 = 0;
      function arcGeom(a, b, R) {
        const ang = a.angleTo(b), pts = [];
        for (let i = 0; i <= 28; i++) { const t = i / 28, sinA = Math.sin(ang); const p = ang < 1e-4 ? a.clone() : a.clone().multiplyScalar(Math.sin((1 - t) * ang) / sinA).add(b.clone().multiplyScalar(Math.sin(t * ang) / sinA)); pts.push(p.multiplyScalar(R)); }
        return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 28, 0.03, 6, false);
      }
      return {
        sync() { const q = sm() && sm().S; if (q) { s = q.s; sizeR.set(s); } },
        update(dt, t) {
          const q = sm() && sm().S;
          if (!pl.playing && q && Math.abs(q.s - s) > 0.004) { s = q.s; sizeR.set(s); }
          if (s < 1 && !pastOK()) { s = 1; sizeR.set(1); if (sm() && sm().setSize) sm().setSize(1, true); }
          if (q && q.ref !== ref && q.ref != null) { ref = q.ref; sgRef.set(ref); latRef = [62, 0, 124, 20, 100][ref]; }
          const sz = Math.max(0.12, s);
          if (mode === 'balloon') {
            const R = R0 * sz; bal.scale.setScalar(R); knot.position.y = -R - 0.02; knot.scale.setScalar(0.7 + 0.3 * sz);
            if (orbit && autoD !== false) { if (autoD != null && Math.abs(orbit.dist - autoD) > 0.6) autoD = false; else { const want = 6.5 + R * 1.5; autoD = orbit.dist + (want - orbit.dist) * Math.min(1, dt * 3); orbit.dist = autoD; } }
            stk.forEach((m, i) => { const p = ST[i].v.clone().multiplyScalar(R * 1.012); m.position.copy(p); m.lookAt(p.clone().multiplyScalar(2)); });
            // 줄자
            if ((k0++ % 2) === 0 || true) ST.forEach((st, i) => {
              if (i === ref) { arcs[i].visible = false; dLab[i].show(false); return; }
              arcs[i].geometry.dispose(); arcs[i].geometry = arcGeom(ST[ref].v, st.v, R * 1.02); arcs[i].material.color.set(st.col); arcs[i].visible = true;
              const mid = ST[ref].v.clone().add(st.v).normalize().multiplyScalar(R * 1.1);
              dLab[i].obj = [mid.x, mid.y, mid.z]; const cm = 6 * s * ST[ref].v.angleTo(st.v);
              dLab[i].set(ST[ref].id + '→' + st.id + ' ' + cm.toFixed(1) + ' cm'); dLab[i].show(labs);
            });
            const rp = ST[ref].v.clone().multiplyScalar(R * 1.1); refLab.obj = [rp.x, rp.y + 0.45, rp.z]; refLab.show(labs);
            lRef.show(false);
            const key = 'b' + ref + (s < 0.95 ? 'p' : s > 1.05 ? 'f' : 'n');
            if (key !== lastInfo) { lastInfo = key; info(s < 0.95 ? '<b>우주의 과거</b>: 풍선이 작을수록 스티커들이 서로 가까웠어요. 더 거슬러 가면 <b>한 점</b>에 모여요.' : '풍선을 부풀리며 스티커(은하)의 <b>크기</b>와 스티커 사이의 <b>거리</b>가 어떻게 달라지는지 보세요.<br>숫자는 기준 스티커에서 잰 거리예요.'); }
          } else {
            // 격자: 기준 은하를 중심에 두고 모두 s배로 멀어져요
            const hr = home[latRef]; let n = 0; const pa = trail.geometry.attributes.position;
            for (let i = 0; i < NG; i++) {
              tmpA.copy(home[i]).sub(hr);                                  // 처음(s=1)의 상대 위치
              tmpB.copy(tmpA).multiplyScalar(sz);
              dm.position.copy(tmpB); dm.scale.setScalar(i === latRef ? 0.01 : 1); dm.updateMatrix(); gInst.setMatrixAt(i, dm.matrix);
              dm.position.copy(tmpA); dm.scale.setScalar(i === latRef ? 0.01 : 1); dm.updateMatrix(); ghost.setMatrixAt(i, dm.matrix);
              pa.setXYZ(n++, tmpA.x, tmpA.y, tmpA.z); pa.setXYZ(n++, tmpB.x, tmpB.y, tmpB.z);
            }
            gInst.instanceMatrix.needsUpdate = ghost.instanceMatrix.needsUpdate = pa.needsUpdate = true; refM.position.set(0, 0, 0); refM.scale.setScalar(1 + 0.08 * Math.sin(t * 4));
            lRef.show(labs);
            const key = 'l' + latRef + (s < 0.95 ? 'p' : s > 1.05 ? 'f' : 'n');
            if (key !== lastInfo) { lastInfo = key; info('노란 공이 <b>기준 은하</b>예요. 노란 선은 은하가 움직인 길이에요.<br>기준을 바꿔 가며 은하들이 어떻게 움직이는지 비교해 보세요.'); }
            refLab.show(false); dLab.forEach((l) => l.show(false));
          }
        },
      };
    },
  });
})();
