/* hm-ideal-gas · 3D 기체 분자 모형과 이상 기체 법칙
   2D 실험(window.__sim)의 장면을 그대로 입체로 보여 줘요: 🔬 기체 모형(부피 V · 온도 T → 압력 P) · 📟 센서 실험(등온 · 정압 · 정적) · 🧮 PV = nRT.
   분자가 벽(피스톤)에 부딪히는 힘이 압력이에요. 온도는 분자의 평균 운동 에너지에 비례해요. 값은 옆 조작판이 정하고 3D는 따라가요. (🛞 타이어 · 🤿 잠수 · 🎈 열기구는 2D 화면에서 해요) */
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
  const f1 = (v) => (Math.round(v * 10) / 10).toFixed(1);
  window.SciSim3D.attach({
    title: '기체 분자와 압력 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대 · 값은 옆 조작판에서 바꿔요',
    camera: { dist: 12.5 * KD, theta: 0.65, phi: 1.1, min: 5, max: 28, target: [0, 0, 0] },
    autoRotate: 0,
    levels: [0, 1, 2],
    build(ctx) {
      const { THREE, root, label, info, controls, orbit } = ctx;
      const { V3, M } = tools(THREE);
      const sim = () => ctx.lesson();
      const NMAX = 200, LX = 6, LY = 3.4, LZ = 3.4;
      const pos = new Float32Array(NMAX * 3), vel = new Float32Array(NMAX * 3);
      const im = new THREE.InstancedMesh(new THREE.SphereGeometry(0.1, 14, 10), M(0xffffff, { roughness: 0.3 }), NMAX); im.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(NMAX * 3), 3); im.frustumCulled = false; root.add(im);
      const box = new THREE.Mesh(new THREE.BoxGeometry(1, LY, LZ), new THREE.MeshStandardMaterial({ color: 0x9ec5ff, transparent: true, opacity: 0.1, roughness: 0.1, side: THREE.DoubleSide, depthWrite: false })); root.add(box);
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1, LY, LZ)), new THREE.LineBasicMaterial({ color: 0xbcd4ff, transparent: true, opacity: 0.6 })); root.add(edges);
      const pis = new THREE.Mesh(new THREE.BoxGeometry(0.22, LY + 0.1, LZ + 0.1), M(0x64748b, { metalness: 0.6 })); root.add(pis);
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 3, 16), M(0x94a3b8, { metalness: 0.7 })); rod.rotation.z = Math.PI / 2; root.add(rod);
      const handle = new THREE.Mesh(new THREE.BoxGeometry(0.25, 1.1, 1.1), M(0xe2464b)); root.add(handle);
      const gauge = new THREE.Group(); root.add(gauge);
      const gb = new THREE.Mesh(new THREE.BoxGeometry(0.5, 3, 0.3), M(0x334155)); gb.position.y = 1.5; gauge.add(gb);
      const gf = new THREE.Mesh(new THREE.BoxGeometry(0.34, 1, 0.34), M(0xff6b6b, { emissive: 0x7f1d1d })); gauge.add(gf); gauge.position.set(-3.2, -LY / 2, 1.5);
      const lP = label('압력 P', gb, { color: '#e2464b', size: 13 }), lPis = label('피스톤(부피)', pis, { color: '#475569', size: 12 }); lP.off = [0, 1.9, 0]; lPis.off = [0, LY / 2 + 0.4, 0];
      const colS = new THREE.Color(0x60a5fa), colF = new THREE.Color(0xff7b54), tc = new THREE.Color(), m4 = new THREE.Matrix4();
      for (let i = 0; i < NMAX; i++) { pos[i * 3] = (Math.random() - 0.5) * LX * 0.9; pos[i * 3 + 1] = (Math.random() - 0.5) * LY * 0.9; pos[i * 3 + 2] = (Math.random() - 0.5) * LZ * 0.9; const a = Math.random() * 6.283, b = Math.acos(2 * Math.random() - 1); vel[i * 3] = Math.sin(b) * Math.cos(a); vel[i * 3 + 1] = Math.cos(b); vel[i * 3 + 2] = Math.sin(b) * Math.sin(a); }
      let acc = 0, hits = 0, Ps = 0, Pshown = 0, last = '';
      const NOTE = '🛞 타이어 · 🤿 잠수와 풍선 · 🎈 열기구 설계는 2D 화면에서 해요. 위의 [▦ 2D]를 눌러 보세요.';
      return {
        update(dt) {
          const A = sim(); if (!A || !A.S) return; const S = A.S;
          let vf, TK, n, P, txt;
          if (S.mode === 'model') { const m = S.m; vf = m.V / 40; TK = m.T; n = 100; P = 100 * 20 / 300 * m.T / m.V; txt = '<b>🔬 기체 모형: 충돌이 만드는 압력</b><br>부피 V = ' + m.V + ' mL · 온도 T = ' + m.T + ' K (' + (m.T - 273) + ' °C) → 압력 P = <b>' + f1(P) + ' kPa</b><br>부피를 줄이면 벽에 부딪히는 횟수가 늘고, 온도를 높이면 분자가 빨라져 횟수와 세기가 커져요.'; }
          else if (S.mode === 'sensor') { const ex = S.sx.exp, rd = A.sxRead(ex, S.sx.x[ex]); vf = rd.V / 40; TK = rd.TK; n = 100; P = rd.P; txt = '<b>📟 센서 실험 · ' + A.EXPS[ex].name + '</b> (' + (ex === 'iso' ? '온도 일정' : ex === 'isob' ? '압력 일정' : '부피 일정') + ')<br>V = ' + f1(rd.V) + ' mL · P = ' + f1(rd.P) + ' kPa · t = ' + Math.round(rd.t) + ' °C (' + Math.round(rd.TK) + ' K)<br>' + (ex === 'iso' ? 'P와 V는 반비례 (PV 일정).' : ex === 'isob' ? 'V–t 직선을 낮은 온도로 연장하면 V = 0이 되는 온도가 있어요 (절대 영도).' : 'P–t 직선을 낮은 온도로 연장하면 P = 0이 되는 온도가 있어요 (절대 영도).'); }
          else if (S.mode === 'eq') { const o = A.igSolve(); const VL = o.syr ? o.V : o.V; vf = clamp(VL / 50, 0.15, 1); TK = o.T; n = clamp(o.n * 100, 20, 200); P = o.P; txt = '<b>🧮 PV = nRT</b> (R = 8.31 J/(mol·K))<br>P = ' + f1(o.P) + ' kPa · V = ' + (o.V < 1 ? f1(o.V * 1000) + ' mL' : f1(o.V) + ' L') + ' · T = ' + f1(o.T) + ' K · n = ' + (o.n < 0.01 ? f1(o.n * 1e4) + ' × 10⁻⁴ mol' : o.n.toFixed(2) + ' mol') + '<br>세 값을 정하면 나머지 하나가 계산돼요 (분자가 많을수록 · 온도가 높을수록 · 부피가 작을수록 압력이 커요).'; }
          else { info(NOTE); im.visible = box.visible = edges.visible = pis.visible = rod.visible = handle.visible = gauge.visible = false; lP.show(false); lPis.show(false); return; }
          im.visible = box.visible = edges.visible = pis.visible = rod.visible = handle.visible = gauge.visible = true; lP.show(true); lPis.show(true);
          vf = clamp(vf, 0.2, 1); if (txt !== last) { last = txt; info(txt); }
          const s = Math.sqrt(TK / 300) * 3.2, VL = LX * vf, x0 = -LX / 2, x1 = x0 + VL, hy = LY / 2, hz = LZ / 2; let imp = 0; const nn = Math.round(clamp(n, 20, NMAX));
          for (let i = 0; i < NMAX; i++) {
            const k = i * 3;
            if (i < nn) {
              pos[k] += vel[k] * s * dt; pos[k + 1] += vel[k + 1] * s * dt; pos[k + 2] += vel[k + 2] * s * dt;
              if (pos[k] > x1 - 0.1) { pos[k] = x1 - 0.1; vel[k] = -Math.abs(vel[k]); imp += 2 * Math.abs(vel[k]) * s; } else if (pos[k] < x0 + 0.1) { pos[k] = x0 + 0.1; vel[k] = Math.abs(vel[k]); imp += 2 * Math.abs(vel[k]) * s; }
              if (pos[k + 1] > hy - 0.1) { pos[k + 1] = hy - 0.1; vel[k + 1] = -Math.abs(vel[k + 1]); } else if (pos[k + 1] < -hy + 0.1) { pos[k + 1] = -hy + 0.1; vel[k + 1] = Math.abs(vel[k + 1]); }
              if (pos[k + 2] > hz - 0.1) { pos[k + 2] = hz - 0.1; vel[k + 2] = -Math.abs(vel[k + 2]); } else if (pos[k + 2] < -hz + 0.1) { pos[k + 2] = -hz + 0.1; vel[k + 2] = Math.abs(vel[k + 2]); }
              tc.copy(colS).lerp(colF, clamp((TK - 250) / 300, 0, 1)); m4.makeTranslation(pos[k], pos[k + 1], pos[k + 2]); im.setMatrixAt(i, m4); im.setColorAt(i, tc);
            } else { m4.makeScale(0, 0, 0); im.setMatrixAt(i, m4); }
          }
          im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true;
          box.scale.x = VL; box.position.x = x0 + VL / 2; edges.scale.x = VL; edges.position.x = x0 + VL / 2; pis.position.x = x1 + 0.11; rod.position.x = x1 + 1.5; handle.position.x = x1 + 3.1;
          const h = clamp(P / 300 * 2.8, 0.05, 2.9); gf.scale.y = h; gf.position.y = h / 2 + 0.05; void acc; void hits; void Ps; void Pshown;
        },
        sync() {},
      };
    },
  });
})();
