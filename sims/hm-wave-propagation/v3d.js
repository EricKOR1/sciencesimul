/* hm-wave-propagation · 3D 탄성파의 진행
   2D 실험(window.__sim)의 질량–용수철 사슬을 그대로 입체로 보여 줘요: 🧩 연결 모형(펄스 · 표시점) · ↕↔ 종파·횡파 · 〰 v = fλ · 🧵 줄의 속력.
   알갱이(질량)는 제자리에서 진동하고 <b>파동(펄스)만 진행</b>해요. 값(k · m · 진동수 · 장력)은 옆 조작판이 정하고 3D는 따라가요. 파동 방정식은 쓰지 않아요. 🔊 소리의 속력(공기 · 물 · 강철 경주)도 입체로 보여 줘요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHN = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches), KD = PHN ? 1.3 : 1;
  const LV = () => (typeof window.SciSimLevel === 'number' ? window.SciSimLevel : 0);
  const TAU = Math.PI * 2, clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  function tools(THREE) {
    const V3 = THREE.Vector3, Y = new V3(0, 1, 0);
    const M = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.5, metalness: 0.1 }, o || {}));
    const glass = (c, op) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.2, metalness: 0, transparent: true, opacity: op == null ? 0.25 : op, depthWrite: false });
    function mkArrow(col, rad) {
      const g = new THREE.Group(), m = M(col, { roughness: 0.4 });
      const sh = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, 1, 12), m), hd = new THREE.Mesh(new THREE.ConeGeometry(rad * 2.6, rad * 6, 16), m);
      g.add(sh, hd); g.userData = { sh, hd, rad }; return g;
    }
    function setArrow(g, a, b) {
      const d = new V3().subVectors(b, a), len = d.length(), { sh, hd, rad } = g.userData;
      if (len < 1e-3) { g.visible = false; return; }
      g.visible = true; const hl = Math.min(len * 0.5, rad * 6);
      sh.scale.y = Math.max(0.001, len - hl); sh.position.y = (len - hl) / 2;
      hd.scale.y = hl / (rad * 6); hd.position.y = len - hl / 2;
      g.position.copy(a); g.quaternion.setFromUnitVectors(Y, d.normalize());
    }
    function tube(pts, r, col, o, closed) {
      const c = new THREE.CatmullRomCurve3(pts, !!closed);
      return new THREE.Mesh(new THREE.TubeGeometry(c, Math.max(24, pts.length * 3), r, 8, !!closed), (o && o.basic) ? new THREE.MeshBasicMaterial({ color: col, transparent: !!o.op, opacity: o.op || 1 }) : M(col, o));
    }
    function disc(r, col, y, op) { const m = new THREE.Mesh(new THREE.CircleGeometry(r, 64), new THREE.MeshStandardMaterial({ color: col, roughness: 0.9, transparent: op != null, opacity: op == null ? 1 : op })); m.rotation.x = -Math.PI / 2; m.position.y = y || 0; m.receiveShadow = true; return m; }
    function grid(w, d, step, col, y, op) {
      const pts = []; for (let x = -w / 2; x <= w / 2 + 1e-6; x += step) pts.push(x, 0, -d / 2, x, 0, d / 2); for (let z = -d / 2; z <= d / 2 + 1e-6; z += step) pts.push(-w / 2, 0, z, w / 2, 0, z);
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
      const l = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: op == null ? 0.3 : op })); l.position.y = y || 0; return l;
    }
    function arc(r, a0, a1, rad, col, n) { // xz 평면 위의 호
      const pts = []; n = n || 40; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; pts.push(new V3(r * Math.cos(a), 0, r * Math.sin(a))); }
      return tube(pts, rad, col);
    }
    return { V3, Y, M, glass, mkArrow, setArrow, tube, disc, grid, arc };
  }
  const KDX = PHN ? 1.6 : 1;
  window.SciSim3D.attach({
    title: '탄성파의 진행 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대 · 값은 옆 조작판에서 바꿔요',
    camera: { dist: 10.5 * KDX, theta: 0.25, phi: 1.2, min: 4, max: 30, target: [0, 0, 0] },
    autoRotate: 0,
    levels: [0, 1, 3],   // ③ v = fλ는 캔버스의 주황색 자 · 위치와 시간 그래프를 읽어야 해서 2D예요
    build(ctx) {
      const { THREE, root, label, info, controls, orbit } = ctx;
      const { V3, M } = tools(THREE);
      const sim = () => ctx.lesson();
      const NMAX = 130, ps = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 14, 10), M(0x7dd3fc, { roughness: 0.35 }), NMAX); ps.frustumCulled = false; ps.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(NMAX * 3), 3); root.add(ps);
      const m4 = new THREE.Matrix4(), c0 = new THREE.Color(0x7dd3fc), cg = new THREE.Color(0xff5a5f), cnum = [0xff5a5f, 0xffd34d, 0x34d399].map((h) => new THREE.Color(h)), q = new THREE.Quaternion(), sc3 = new THREE.Vector3(), pp = new THREE.Vector3();
      const ctex = (w, h, draw, rx, ry) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; if (rx) t.repeat.set(rx, ry || rx); if ('encoding' in t) t.encoding = THREE.sRGBEncoding; t.anisotropy = 4; return t; };
      const rnd = (() => { let s = 9; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
      { const woodTex = ctex(256, 128, (g, w, h) => { g.fillStyle = '#9a6a38'; g.fillRect(0, 0, w, h); for (let i = 0; i < 70; i++) { g.strokeStyle = 'rgba(60,30,10,' + (0.2 + rnd() * 0.35) + ')'; g.lineWidth = 1 + rnd() * 2; g.beginPath(); const y = rnd() * h; g.moveTo(0, y); g.bezierCurveTo(w * 0.3, y + (rnd() - 0.5) * 8, w * 0.6, y + (rnd() - 0.5) * 8, w, y + (rnd() - 0.5) * 6); g.stroke(); } }, 3, 1);
        const bench = new THREE.Mesh(new THREE.BoxGeometry(18, 0.5, 11), M(0xffffff, { map: woodTex, roughness: 0.65, metalness: 0 })); bench.position.set(0, -3.4, 0); bench.receiveShadow = true; root.add(bench);
        const edge = new THREE.Mesh(new THREE.BoxGeometry(18.1, 0.08, 11.1), ctx.mats.wood(0x5b3a1c)); edge.position.set(0, -3.14, 0); root.add(edge);
        const boardTex = ctex(512, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#3b5185'); gr.addColorStop(1, '#2a3c68'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(180,200,240,.16)'; g.lineWidth = 1; for (let x = 0; x <= w; x += w / 18) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } for (let y = 0; y <= h; y += h / 9) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); } }, 1, 1);
        const board = new THREE.Mesh(new THREE.BoxGeometry(18, 8.6, 0.12), M(0xffffff, { map: boardTex, roughness: 0.7, metalness: 0.05 })); board.position.set(0, 1.0, -5); root.add(board);
        const fr = new THREE.Mesh(new THREE.BoxGeometry(18.3, 8.9, 0.1), ctx.mats.metal('aluminium', { brushed: true })); fr.position.set(0, 1.0, -5.08); root.add(fr); }
      const src = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.6, 2.4), ctx.mats.plastic(0x3a4556, { roughness: 0.3 })); root.add(src); { const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.5, 14), ctx.mats.metal('chrome', { roughness: 0.2 })); arm.rotation.z = Math.PI / 2; arm.position.x = 0.45; src.add(arm); const pl = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.1, 1.8), M(0x94a3b8, { metalness: 0.7 })); pl.position.set(-0.28, 0, 0); src.add(pl); const led = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), new THREE.MeshBasicMaterial({ color: 0x4ade80 })); led.position.set(0.1, 0.65, 1.22); src.add(led); }
      const sprG = new THREE.BufferGeometry(); sprG.setAttribute('position', new THREE.BufferAttribute(new Float32Array(NMAX * 3), 3)); const spr = new THREE.Line(sprG, new THREE.LineBasicMaterial({ color: 0xb6c4d8, transparent: true, opacity: 0.85 })); spr.frustumCulled = false; root.add(spr);
      const base = new THREE.Mesh(new THREE.BoxGeometry(1, 0.05, 0.05), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3 })); root.add(base);
      const gl = [0, 1, 2].map((i) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.03, 3.4, 0.03), new THREE.MeshBasicMaterial({ color: cnum[i], transparent: true, opacity: 0.5 })); root.add(m); return m; });
      const gLab = [0, 1, 2].map((i) => label(['①', '②', '③'][i], gl[i], { color: '#26324a', size: 13 }));
      /* 출발선 · 도착선: 2D처럼 통과 시간을 재는 두 선 (② 종파·횡파 4.0 m, ④ 줄의 속력 8.0 m) */
      const fin = [0x16a34a, 0xdc2626].map((c) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.05, 3.0, 0.05), new THREE.MeshBasicMaterial({ color: c })); m.visible = false; root.add(m); return m; });
      const finLab = [label('출발선', fin[0], { color: '#16a34a', size: 12, offset: [0, -1.85, 0] }), label('도착선', fin[1], { color: '#dc2626', size: 12, offset: [0, -1.85, 0] })];
      finLab.forEach((l) => l.show(false));
      const lSrc = label('진동 장치', src, { color: '#475569', size: 12 }), lDir = label('진행 방향 →', [0, -2.4, 0], { color: '#0f766e', size: 12 });
      const demo = { p: 0, on: false }; let pl = null, last = '';
      pl = controls.player({ duration: 8, loop: true, autoplay: false, label: '펄스 보내기', phases: [[0, '펄스가 출발해요'], [0.3, '알갱이는 제자리 · 파동만 진행'], [0.85, '끝에서 흡수']], onFrame(p) { demo.p = p; demo.on = p > 0 || !!(pl && pl.playing); } });
      pl.row = ctx.renderer.domElement.parentNode.parentNode.querySelector('.v3-player');
      const U = 1.6, FS = [1.0, 1.5, 2.0, 2.5, 3.0];
      /* ================= 🔊 소리의 속력: 공기 · 물 · 강철에서 100 m 경주 (S.snd) ================= */
      const gSn = new THREE.Group(); gSn.visible = false; root.add(gSn);
      const LANES = [['공기', 0, 0x0ea5e9, 40], ['물', 1500, 0x2563eb, 60], ['강철', 5900, 0x64748b, 80]], SX = 10;
      const laneObj = LANES.map((ln, i) => {
        const z = (i - 1) * 2.5, box = new THREE.Mesh(new THREE.BoxGeometry(SX + 0.6, 0.9, 1.3), new THREE.MeshStandardMaterial({ color: ln[2], transparent: true, opacity: 0.16, roughness: 0.3, depthWrite: false })); box.position.set(0, 0, z); gSn.add(box);
        const edge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(SX + 0.6, 0.9, 1.3)), new THREE.LineBasicMaterial({ color: ln[2], transparent: true, opacity: 0.6 })); edge.position.copy(box.position); gSn.add(edge);
        const st = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.5, 1.5), new THREE.MeshBasicMaterial({ color: 0x16a34a })); st.position.set(-SX / 2, 0, z); gSn.add(st);
        const en = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.5, 1.5), new THREE.MeshBasicMaterial({ color: 0xdc2626 })); en.position.set(SX / 2, 0, z); gSn.add(en);
        const nn = ln[3] * 3, beads = new THREE.InstancedMesh(new THREE.SphereGeometry(0.07, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }), nn); beads.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(nn * 3), 3); beads.frustumCulled = false; gSn.add(beads);
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 18, 12), M(ln[2], { emissive: ln[2], emissiveIntensity: 0.3 })); gSn.add(head);
        const lb = label(ln[0], [-SX / 2 - 1.1, 0, z], { color: '#26324a', size: 13 }), lv = label('', head, { color: '#' + ln[2].toString(16).padStart(6, '0'), size: 12 });
        return { z, beads, head, lb, lv, nn, n: ln[3] };
      });
      const lStart = label('출발', [-SX / 2, 1.2, -2.5], { color: '#16a34a', size: 12 }), lEnd = label('100 m', [SX / 2, 1.2, -2.5], { color: '#dc2626', size: 12 }), lSlow = label('영상은 실제 시간의 1/20로 느리게 보여 줘요', [0, -1.4, 3.8], { color: '#475569', size: 12 });
      const raceBtn = controls.button('▶ 소리 경주', () => { const b = document.getElementById('bRace'); if (b) b.click(); });
      const cW = new THREE.Color(0xf8fafc), cR = new THREE.Color(0xff5a5f), cB = new THREE.Color(0x60a5fa), tcS = new THREE.Color();
      let sndOn = false;
      function sndScene(A, S) {
        const sn = S.snd, r = sn.race, vAir = 331 + 0.6 * sn.temp;
        LANES.forEach((ln, i) => {
          const o = laneObj[i], v = ln[1] || vAir, p = r ? clamp(r.t / 20 * v / 100, 0, 1) : 0, xc = -SX / 2 + p * SX, tt = 100 / v;
          o.head.position.set(xc, 0, o.z);
          for (let k = 0; k < o.nn; k++) {
            const gx = k % o.n, gy = Math.floor(k / o.n), x0 = -SX / 2 + SX * (gx + 0.5) / o.n, yy = ((gy % 3) - 1) * 0.22, zz = o.z + (Math.floor(gy / 1) % 3 - 1) * 0.2;
            const u = (x0 - xc) / 0.7, g = r && p > 0 && p < 1 ? Math.exp(-u * u) : 0, d = 0.3 * g;
            m4.makeTranslation(x0 + d, yy, zz); o.beads.setMatrixAt(k, m4);
            tcS.copy(cW); if (g > 0.05) tcS.lerp(cR, g); o.beads.setColorAt(k, tcS);
          }
          o.beads.instanceMatrix.needsUpdate = true; o.beads.instanceColor.needsUpdate = true;
          o.lv.set('v = ' + Math.round(v) + ' m/s' + (r && p >= 1 ? ' · 도착! ' + tt.toFixed(tt < 0.1 ? 3 : 2) + ' s' : '')); o.lv.off = [0, 0.7, 0];
        });
        info('<b>🔊 소리의 속력: 매질마다 달라요</b> · 지금 기온 ' + sn.temp + ' °C → 공기 중 v ≈ 331 + 0.6 × ' + sn.temp + ' = <b>' + vAir.toFixed(1) + ' m/s</b><br>물 약 1500 m/s · 강철 약 5900 m/s · 100 m를 가는 데 공기 ' + (100 / vAir).toFixed(2) + ' s, 물 ' + (100 / 1500).toFixed(3) + ' s, 강철 ' + (100 / 5900).toFixed(3) + ' s<br>소리는 종파라서 알갱이가 진행 방향으로 모였다 퍼지며 전해져요. 물과 강철은 탄성이 커서 빨라요.');
      }
      return {
        update() {
          const A = sim(); if (!A || !A.S) return; const S = A.S, sc = A.sc;
          if (!pl.playing && pl.p === 0) demo.on = false;
          if (S.mode === 'snd') { fin.forEach((m) => (m.visible = false)); finLab.forEach((l) => l.show(false)); }
          if (S.mode === 'snd') { if (!sndOn) { sndOn = true; Object.assign(orbit, { tx: 0, ty: 0, tz: 0, phi: 1.0, theta: 0.15, dist: 15 * KDX }); } ps.visible = src.visible = base.visible = spr.visible = false; gl.forEach((g) => (g.visible = false)); gLab.forEach((l) => l.show(false)); lSrc.show(false); lDir.show(false); pl.row.style.display = 'none'; gSn.visible = true; laneObj.forEach((o) => { o.lb.show(true); o.lv.show(true); }); [lStart, lEnd, lSlow].forEach((l) => l.show(true)); raceBtn.style.display = ''; sndScene(A, S); return; }
          if (sndOn) { sndOn = false; Object.assign(orbit, { tx: 0, ty: 0, tz: 0, phi: 1.2, theta: 0.25, dist: 10.5 * KDX }); }
          gSn.visible = false; laneObj.forEach((o) => { o.lb.show(false); o.lv.show(false); }); [lStart, lEnd, lSlow].forEach((l) => l.show(false)); raceBtn.style.display = 'none';
          fin.forEach((m) => (m.visible = false)); finLab.forEach((l) => l.show(false));
          if (!sc || !sc.ch) { ps.visible = src.visible = base.visible = spr.visible = false; gl.forEach((g) => (g.visible = false)); gLab.forEach((l) => l.show(false)); lSrc.show(false); lDir.show(false); pl.row.style.display = 'none'; return; }
          pl.row.style.display = ''; ps.visible = src.visible = base.visible = true; lSrc.show(true); lDir.show(true);
          const ch = sc.ch, n = Math.min(NMAX, ch.n), a = ch.a, long = sc.kind === 'L', len = (n - 1) * a, sx = len * U / 2;
          const sc2 = S.mode === 'sp' ? 1 : 1;
          const usedDemo = demo.on && sc.drv.kind === 'none';
          let yv = ch.y;
          if (usedDemo) { const v = sc.v0, w = Math.max(0.15, sc.tau * v * 0.8), t = demo.p * (len + 6 * w) / v - 3 * w / v; yv = new Float32Array(n); for (let i = 0; i < n; i++) { const z = (i * a - v * t) / w; yv[i] = sc.A * Math.exp(-z * z); } }
          const ar = Math.min(1, 2.2 / Math.max(0.2, sc.A * 4)), rr = Math.max(0.05, Math.min(0.14, a * U * 0.45));
          let maxd = 0;
          for (let i = 0; i < NMAX; i++) {
            if (i >= n) { m4.makeScale(0, 0, 0); ps.setMatrixAt(i, m4); continue; }
            const d = yv[i] * U * (long ? 1.6 : 1.6); maxd = Math.max(maxd, Math.abs(d)); const x = i * a * U - sx + (long ? d : 0), y = long ? 0 : d;
            const gi = sc.gates.indexOf(i), r = gi >= 0 ? rr * 1.9 : rr; pp.set(x, y, 0); sc3.set(r, r, r); m4.compose(pp, q, sc3); ps.setMatrixAt(i, m4);
            const col = gi >= 0 ? cnum[gi % 3] : (long ? (c0.clone().lerp(cg, Math.min(1, Math.max(0, -(yv[Math.min(n - 1, i + 1)] - yv[Math.max(0, i - 1)]) * 6)))) : c0); ps.setColorAt(i, col);
          }
          { const sa = sprG.attributes.position.array; for (let i = 0; i < n; i++) { sa[i * 3] = i * a * U - sx + (long ? yv[i] * U * 1.6 : 0); sa[i * 3 + 1] = long ? 0 : yv[i] * U * 1.6; sa[i * 3 + 2] = 0; } sprG.setDrawRange(0, n); sprG.attributes.position.needsUpdate = true; spr.visible = true; }
          ps.count = n; ps.instanceMatrix.needsUpdate = true; ps.instanceColor.needsUpdate = true;
          src.position.set(-sx - 0.4, long ? 0 : (yv[0] * U * 1.6), 0); base.scale.x = len * U; base.position.set(0, 0, 0);
          { const fx = S.mode === 'lt' ? [1.0, 5.0] : S.mode === 'sp' ? [1.0, 9.0] : null;
            fin.forEach((m, i) => { const on = !!fx && fx[i] <= len + 1e-6; m.visible = on; finLab[i].show(on); if (on) m.position.set(fx[i] * U - sx, 0, 0.05); }); }
          [0, 1, 2].forEach((i) => { const g = sc.gates[i], ok = g != null && g < n; gl[i].visible = ok; gLab[i].show(ok); if (ok) { gl[i].position.set(g * a * U - sx, 0, 0); gLab[i].off = [0, 1.9, 0]; } });
          lSrc.off = [0, 1.1, 0]; lDir.obj = [0, -2.4, 0];
          void sc2; void maxd; void FS;
          let t2;
          if (S.mode === 'model') t2 = '<b>🧩 연결 모형: 무엇이 이동할까?</b> · 질량 알갱이를 용수철이 이어 놓았어요 (k = ' + A.KS[S.kv] + ' N/m · m = ' + A.MS[S.mv] + ' kg)<br>펄스가 지나갈 때 표시점 ①②③이 <b>어느 방향으로</b> 움직이는지, 펄스와 함께 옆으로 가는지 살펴봐요.' + (S.meas.v != null ? '<br>측정한 펄스 속력: ' + S.meas.v.toFixed(1) + ' m/s' : '');
          else if (S.mode === 'lt') t2 = '<b>' + (S.lt.dir === 'T' ? '↕ 횡파' : '↔ 종파') + '</b> · 파동 용수철 4.0 m<br>' + (S.lt.dir === 'T' ? '알갱이가 진행 방향과 <b>수직</b>으로 흔들려요.' : '알갱이가 진행 방향과 <b>나란하게</b> 흔들려요. 몰린 곳(밀, 빨강)과 흩어진 곳(소)이 번갈아 나타나요.') + '<br>기록한 통과 시간: 횡파 ' + (S.lt.time.T != null ? S.lt.time.T.toFixed(2) + ' s' : '—') + ' · 종파 ' + (S.lt.time.L != null ? S.lt.time.L.toFixed(2) + ' s' : '—');
          else if (S.mode === 'fl') t2 = '<b>〰 v = fλ</b> · 진동수 f = ' + FS[S.fl.fi].toFixed(1) + ' Hz<br>진동수를 바꿔 파장 λ를 재고 f × λ를 비교해요. 같은 매질에서는 f가 커지면 λ가 짧아지고 속력 v = fλ는 일정해요.';
          else t2 = '<b>🧵 줄의 속력</b> · 장력 ' + A.TS[S.sp.Tv] + ' N · 단위 길이당 질량 μ = ' + A.MUS[S.sp.mv] + '<br>장력이 클수록 · 줄이 가벼울수록 펄스가 빨리 지나가요 (측정한 관계로 정리해요).' + (S.sp.rec && S.sp.rec.length ? '<br>📋 측정 기록: ' + S.sp.rec.slice(-4).map((r) => 'T ' + r.T + ' N · μ ' + r.mu + ' → ' + r.t + ' s, v ' + r.v + ' m/s').join(' / ') : '');
          if (usedDemo && S.mode !== 'model') t2 += '<br><span style="color:#ffd34d">▶ 펄스가 오른쪽으로 진행하는 동안 알갱이는 제자리에서 진동해요.</span>';
          if (t2 !== last) { last = t2; info(t2); }
        },
        sync() {},
      };
      // eslint-disable-next-line no-unreachable
    },
  });
})();
