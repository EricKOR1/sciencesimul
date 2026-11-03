/* hm-wave-propagation · 3D 탄성파의 진행
   2D 실험(window.__sim)의 질량–용수철 사슬을 그대로 입체로 보여 줘요: 🧩 연결 모형(펄스 · 표시점) · ↕↔ 종파·횡파 · 〰 v = fλ · 🧵 줄의 속력.
   알갱이(질량)는 제자리에서 진동하고 <b>파동(펄스)만 진행</b>해요. 값(k · m · 진동수 · 장력)은 옆 조작판이 정하고 3D는 따라가요. 파동 방정식은 쓰지 않아요. (🔊 소리의 속력 장면은 2D 화면에서 해요) */
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
    camera: { dist: 12 * KDX, theta: 0.25, phi: 1.2, min: 4, max: 30, target: [0, 0, 0] },
    autoRotate: 0,
    levels: [0, 1, 2, 3],
    build(ctx) {
      const { THREE, root, label, info, controls, orbit } = ctx;
      const { V3, M } = tools(THREE);
      const sim = () => ctx.lesson();
      const NMAX = 130, ps = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 14, 10), M(0x7dd3fc, { roughness: 0.35 }), NMAX); ps.frustumCulled = false; ps.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(NMAX * 3), 3); root.add(ps);
      const m4 = new THREE.Matrix4(), c0 = new THREE.Color(0x7dd3fc), cg = new THREE.Color(0xff5a5f), cnum = [0xff5a5f, 0xffd34d, 0x34d399].map((h) => new THREE.Color(h)), q = new THREE.Quaternion(), sc3 = new THREE.Vector3(), pp = new THREE.Vector3();
      const src = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.6, 2.4), M(0x64748b, { metalness: 0.4 })); root.add(src);
      const base = new THREE.Mesh(new THREE.BoxGeometry(1, 0.05, 0.05), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3 })); root.add(base);
      const gl = [0, 1, 2].map((i) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.03, 3.4, 0.03), new THREE.MeshBasicMaterial({ color: cnum[i], transparent: true, opacity: 0.5 })); root.add(m); return m; });
      const gLab = [0, 1, 2].map((i) => label(['①', '②', '③'][i], gl[i], { color: '#26324a', size: 13 }));
      const lSrc = label('진동 장치', src, { color: '#475569', size: 12 }), lDir = label('진행 방향 →', [0, -2.4, 0], { color: '#0f766e', size: 12 });
      const demo = { p: 0, on: false }; let pl = null, last = '';
      pl = controls.player({ duration: 8, loop: true, autoplay: false, label: '펄스 보내기', phases: [[0, '펄스가 출발해요'], [0.3, '알갱이는 제자리 · 파동만 진행'], [0.85, '끝에서 흡수']], onFrame(p) { demo.p = p; demo.on = p > 0 || !!(pl && pl.playing); } });
      pl.row = ctx.renderer.domElement.parentNode.parentNode.querySelector('.v3-player');
      const U = 1.6, FS = [1.0, 1.5, 2.0, 2.5, 3.0];
      const NOTE = '🔊 소리의 속력(온도에 따른 소리 경주)은 2D 화면에서 해요. 위의 [▦ 2D]를 눌러 보세요.';
      return {
        update() {
          const A = sim(); if (!A || !A.S) return; const S = A.S, sc = A.sc;
          if (!pl.playing && pl.p === 0) demo.on = false;
          if (S.mode === 'snd' || !sc || !sc.ch) { ps.visible = src.visible = base.visible = false; gl.forEach((g) => (g.visible = false)); gLab.forEach((l) => l.show(false)); lSrc.show(false); lDir.show(false); pl.row.style.display = 'none'; info(NOTE); return; }
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
          ps.count = n; ps.instanceMatrix.needsUpdate = true; ps.instanceColor.needsUpdate = true;
          src.position.set(-sx - 0.4, long ? 0 : (yv[0] * U * 1.6), 0); base.scale.x = len * U; base.position.set(0, 0, 0);
          [0, 1, 2].forEach((i) => { const g = sc.gates[i], ok = g != null && g < n; gl[i].visible = ok; gLab[i].show(ok); if (ok) { gl[i].position.set(g * a * U - sx, 0, 0); gLab[i].off = [0, 1.9, 0]; } });
          lSrc.off = [0, 1.1, 0]; lDir.obj = [0, -2.4, 0];
          void sc2; void maxd; void FS;
          let t2;
          if (S.mode === 'model') t2 = '<b>🧩 연결 모형: 무엇이 이동할까?</b> · 질량 알갱이를 용수철이 이어 놓았어요 (k = ' + A.KS[S.kv] + ' N/m · m = ' + A.MS[S.mv] + ' kg)<br>펄스가 지나갈 때 표시점 ①②③은 <b>제자리에서 위아래로 진동</b>할 뿐 옆으로 이동하지 않아요. 이동하는 것은 <b>파동(에너지 · 모양)</b>이에요.' + (S.meas.v != null ? '<br>측정한 펄스 속력: ' + S.meas.v.toFixed(1) + ' m/s' : '');
          else if (S.mode === 'lt') t2 = '<b>' + (S.lt.dir === 'T' ? '↕ 횡파' : '↔ 종파') + '</b> · 파동 용수철 4.0 m<br>' + (S.lt.dir === 'T' ? '알갱이가 진행 방향과 <b>수직</b>으로 흔들려요.' : '알갱이가 진행 방향과 <b>나란하게</b> 흔들려요. 몰린 곳(밀, 빨강)과 흩어진 곳(소)이 번갈아 나타나요.') + '<br>기록한 통과 시간: 횡파 ' + (S.lt.time.T != null ? S.lt.time.T.toFixed(2) + ' s' : '—') + ' · 종파 ' + (S.lt.time.L != null ? S.lt.time.L.toFixed(2) + ' s' : '—');
          else if (S.mode === 'fl') t2 = '<b>〰 v = fλ</b> · 진동수 f = ' + FS[S.fl.fi].toFixed(1) + ' Hz<br>진동수를 바꿔 파장 λ를 재고 f × λ를 비교해요. 같은 매질에서는 f가 커지면 λ가 짧아지고 속력 v = fλ는 일정해요.';
          else t2 = '<b>🧵 줄의 속력</b> · 장력 ' + A.TS[S.sp.Tv] + ' N · 단위 길이당 질량 μ = ' + A.MUS[S.sp.mv] + '<br>장력이 클수록 · 줄이 가벼울수록 펄스가 빨리 지나가요 (측정한 관계로 정리해요).';
          if (usedDemo) t2 += '<br><span style="color:#ffd34d">▶ 펄스가 오른쪽으로 진행하는 동안 알갱이는 제자리에서 진동해요.</span>';
          if (t2 !== last) { last = t2; info(t2); }
        },
        sync() {},
      };
      // eslint-disable-next-line no-unreachable
    },
  });
})();
