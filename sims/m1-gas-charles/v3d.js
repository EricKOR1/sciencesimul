/* m1-gas-charles · 3D 추를 올린 피스톤 (압력이 일정할 때 온도와 부피)
   피스톤 위의 추 때문에 압력은 일정해요. 가열하면 입자가 더 빠르고 세게 움직여 피스톤을 밀어 올리고 → 부피가 커져요.
   부피는 2D 실험과 같은 식 V = 60 × (T+273)/273 (mL)를 써요. 2D 온도 슬라이더가 바뀌면 3D도 따라가요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHN0 = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  window.SciSim3D.attach({
    title: '가열하는 기체 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    levels: [0, 1, 2],
    camera: { dist: PHN0 ? 17 : 13, theta: 0.5, phi: 1.2, fov: 45, target: [0.9, 0.6, 0], min: 6, max: 32 },
    autoRotate: 0.12,
    build(ctx) {
      const { THREE, root, label, info, controls, orbit } = ctx;
      /* ---------- 공통 도구 ---------- */
      const PHN = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
      const V3 = THREE.Vector3, Yax = new V3(0, 1, 0);
      const mat = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.5, metalness: 0.05 }, o || {}));
      const glass = (c, op, o) => mat(c || 0xbfe3ff, Object.assign({ transparent: true, opacity: op || 0.16, roughness: 0.12, metalness: 0, depthWrite: false, side: THREE.DoubleSide }, o || {}));
      const rnd = (() => { let s = 12345; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; })();
      const _m = new THREE.Matrix4(), _c = new THREE.Color();
      function spheres(N, r, color, seg) {
        const m = new THREE.InstancedMesh(new THREE.SphereGeometry(r, seg || 16, Math.round((seg || 16) * 0.75)), mat(color, { roughness: 0.35 }), N);
        m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.frustumCulled = false; m.castShadow = true;
        for (let i = 0; i < N; i++) m.setColorAt(i, _c.set(0xffffff));
        root.add(m); return m;
      }
      function put(m, i, x, y, z, s) { s = s === undefined ? 1 : s; _m.makeScale(s, s, s); _m.setPosition(x, y, z); m.setMatrixAt(i, _m); }
      function tint(m, i, hex) { m.setColorAt(i, _c.set(hex)); }
      function flush(m) { m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; }
      function tubeMesh(pts, r, color, o) {
        const curve = new THREE.CatmullRomCurve3(pts.map((p) => new V3(p[0], p[1], p[2])));
        return new THREE.Mesh(new THREE.TubeGeometry(curve, Math.max(8, pts.length * 10), r, 10, false), mat(color, o));
      }
      function mkArrow(col, rad) {
        const g = new THREE.Group(), m = mat(col, { roughness: 0.4 });
        const sh = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, 1, 12), m), hd = new THREE.Mesh(new THREE.ConeGeometry(rad * 2.4, rad * 6, 16), m);
        g.add(sh, hd); g.userData = { sh, hd, rad }; return g;
      }
      function setArrow(g, a, b) {
        const d = new V3().subVectors(b, a), len = d.length(); const { sh, hd, rad } = g.userData;
        if (len < 1e-3) { g.visible = false; return; }
        g.visible = true; const hl = Math.min(len * 0.5, rad * 6);
        sh.scale.y = Math.max(0.001, len - hl); sh.position.y = (len - hl) / 2;
        hd.scale.y = hl / (rad * 6); hd.position.y = len - hl / 2;
        g.position.copy(a); g.quaternion.setFromUnitVectors(Yax, d.normalize());
      }
      function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); if (THREE.sRGBEncoding) t.encoding = THREE.sRGBEncoding; return t; }
      /* 눈금이 있는 둥근 계기판 (0 ~ max, 270도) */
      function makeDial(R, max, unit, tickStep, labStep) {
        const g = new THREE.Group();
        const body = new THREE.Mesh(new THREE.CylinderGeometry(R, R, 0.34, 48), mat(0x8b95a7, { metalness: 0.6, roughness: 0.3 })); body.rotation.x = Math.PI / 2; g.add(body);
        const tex = canvasTex(256, 256, (c, w) => {
          c.fillStyle = '#f7f9fc'; c.beginPath(); c.arc(128, 128, 126, 0, 7); c.fill();
          c.strokeStyle = '#334155'; c.fillStyle = '#1f2937'; c.textAlign = 'center'; c.textBaseline = 'middle';
          for (let v = 0; v <= max + 1e-6; v += tickStep) {
            const a = (-225 + 270 * v / max) * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a), big = Math.abs(v / labStep - Math.round(v / labStep)) < 1e-6;
            c.lineWidth = big ? 5 : 2.5; c.beginPath(); c.moveTo(128 + ca * 104, 128 - sa * 104); c.lineTo(128 + ca * (big ? 84 : 92), 128 - sa * (big ? 84 : 92)); c.stroke();
            if (big) { c.font = '800 26px sans-serif'; c.fillText(String(Math.round(v * 10) / 10), 128 + ca * 62, 128 - sa * 62); }
          }
          c.font = '800 24px sans-serif'; c.fillStyle = '#2563eb'; c.fillText(unit, 128, 190);
        });
        const face = new THREE.Mesh(new THREE.CircleGeometry(R * 0.93, 48), new THREE.MeshBasicMaterial({ map: tex })); face.position.z = 0.18; g.add(face);
        const needle = new THREE.Group(); needle.position.z = 0.24;
        const nb = new THREE.Mesh(new THREE.BoxGeometry(R * 0.7, 0.07, 0.04), mat(0xe11d48, { roughness: 0.4 })); nb.position.x = R * 0.3; needle.add(nb);
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.06, 16), mat(0x475569, { metalness: 0.5 })); cap.rotation.x = Math.PI / 2; needle.add(cap);
        g.add(needle);
        g.userData.set = (v) => { needle.rotation.z = (-225 + 270 * Math.max(0, Math.min(max, v)) / max) * Math.PI / 180; };
        g.userData.set(0); return g;
      }

      const RC = 1.45, Y0 = -2.6, PR = 0.12, NP = 36;
      const Vof = (T) => 60 * (T + 273) / 273, hOf = (V) => V * 0.056;
      const S0 = (window.__sim && window.__sim.S) || null;
      const st = { T: S0 && typeof S0.Tset === 'number' ? S0.Tset : 20, Tg: 20, last: S0 ? S0.Tset : null, hits: 0, rate: 0, tm: 0, mark: true };
      st.Tg = st.T;
      const speedOf = (T) => 2.3 * Math.sqrt((T + 273) / 293);

      /* 용기 + 가열판 */
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(RC + 0.08, RC + 0.08, 6.4, 56, 1, true), glass(0xcfe6ff, 0.2)); barrel.position.y = Y0 + 3.2; root.add(barrel);
      const base = new THREE.Mesh(new THREE.CylinderGeometry(RC + 0.12, RC + 0.12, 0.3, 56), mat(0xb7c2d4, { metalness: 0.3, roughness: 0.35 })); base.position.y = Y0 - 0.15; root.add(base);
      const plate = new THREE.Mesh(new THREE.CylinderGeometry(RC + 0.5, RC + 0.5, 0.36, 56), mat(0x64748b, { metalness: 0.5, roughness: 0.4, emissive: 0x000000 })); plate.position.y = Y0 - 0.48; root.add(plate);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(RC + 0.08, 0.06, 10, 64), mat(0xb7c2d4, { metalness: 0.3 })); rim.rotation.x = Math.PI / 2; rim.position.y = Y0 + 6.4; root.add(rim);
      label('가열·냉각 장치', plate, { size: 11.5, offset: [0, -0.55, 1.3] });

      /* 피스톤 + 추 */
      const piston = new THREE.Group();
      const pd = new THREE.Mesh(new THREE.CylinderGeometry(RC, RC, 0.34, 56), mat(0x5b6577, { roughness: 0.8 })); pd.position.y = 0.17; piston.add(pd);
      const wt = new THREE.Mesh(new THREE.CylinderGeometry(RC * 0.78, RC * 0.78, 0.7, 40), mat(0x475569, { metalness: 0.6, roughness: 0.35 })); wt.position.y = 0.69; piston.add(wt);
      const wt2 = new THREE.Mesh(new THREE.CylinderGeometry(RC * 0.5, RC * 0.5, 0.45, 40), mat(0x64748b, { metalness: 0.6, roughness: 0.35 })); wt2.position.y = 1.27; piston.add(wt2);
      const kn = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), mat(0xf59e0b)); kn.position.y = 1.62; piston.add(kn);
      root.add(piston);
      const arrow = mkArrow(0xf59e0b, 0.07); root.add(arrow);
      label('추 (압력 일정)', piston, { size: 12, offset: [0, 1.3, 0] });

      /* 기체 */
      const gas = new THREE.Mesh(new THREE.CylinderGeometry(RC, RC, 1, 56), glass(0x6aa9ff, 0.12)); root.add(gas);
      const ps = spheres(NP, PR, 0x3d6df2, 14);
      const P = [];
      const v0 = speedOf(st.Tg);
      for (let i = 0; i < NP; i++) { const a = rnd() * 6.283, r = Math.sqrt(rnd()) * (RC - PR), b = rnd() * 6.283, c = rnd() * 2 - 1, u = Math.sqrt(1 - c * c);
        P.push({ x: Math.cos(a) * r, y: Y0 + PR + rnd() * (hOf(Vof(st.Tg)) - 2 * PR), z: Math.sin(a) * r, vx: Math.cos(b) * u, vy: c, vz: Math.sin(b) * u, k: 0.7 + 0.6 * rnd(), hot: 0 }); }

      /* 온도계 */
      const TX = 4.0;
      const tg = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 6, 24), glass(0xe8f1ff, 0.28)); tg.position.set(TX, Y0 + 2.5, 0); root.add(tg);
      const tb = new THREE.Mesh(new THREE.SphereGeometry(0.5, 24, 16), mat(0xef4444, { roughness: 0.3 })); tb.position.set(TX, Y0 - 0.55, 0); root.add(tb);
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 1, 16), mat(0xef4444, { roughness: 0.3 })); root.add(col);
      for (let T = -50; T <= 150; T += 50) { const y = Y0 + 0.1 + (T + 50) / 200 * 4.8; const tk = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.04, 0.04), mat(0x334155)); tk.position.set(TX + 0.45, y, 0); root.add(tk);
        label(T + '°', [TX + 0.45, y, 0], { size: 10, offset: [0.5, 0, 0] }); }
      const tLab = label('', [TX, Y0 + 5.7, 0], { size: 12.5, color: 'rgba(239,68,68,.92)' });

      const cold = new THREE.Color(0x3d6df2), hotc = new THREE.Color(0xff5a3d), cc = new THREE.Color();
      function refresh() {
        const V = Vof(st.Tg), h = hOf(V), top = Y0 + h;
        piston.position.y = top; gas.scale.y = h; gas.position.y = Y0 + h / 2;
        const ty = Y0 + 0.1 + (Math.max(-50, Math.min(150, st.Tg)) + 50) / 200 * 4.8;
        col.scale.y = ty - (Y0 - 0.5); col.position.set(TX, (ty + Y0 - 0.5) / 2, 0);
        tLab.set(Math.round(st.Tg) + ' °C');
        const f = Math.max(-1, Math.min(1, (st.Tg - 20) / 130));
        plate.material.color.setHex(f > 0.05 ? 0xd9553a : f < -0.05 ? 0x5a8fd0 : 0x64748b); plate.material.emissive.setHex(f > 0.05 ? 0x6a1a08 : f < -0.05 ? 0x0a2a55 : 0x000000);
        plate.material.emissiveIntensity = Math.abs(f);
        setArrow(arrow, new V3(0, top + 1.9, 0), new V3(0, top + 1.9 + 0.5 + h * 0.15, 0)); arrow.visible = false;
      }
      refresh();
      function text() {
        info('온도 <b>' + Math.round(st.Tg) + ' °C</b> → 부피 <b>' + Math.round(Vof(st.Tg)) + ' mL</b> (압력은 그대로)<br>피스톤에 부딪히는 입자: <b>초당 약 ' + Math.round(st.rate) + '번</b><br>온도가 높으면 입자가 빠르고 세게 부딪혀 피스톤이 올라가요.');
      }

      const rng = controls.range('온도', -50, 150, 5, st.T, (v) => { st.T = v; }, (v) => v + ' °C');
      controls.segment('', [{ value: -50, label: '❄ 차갑게' }, { value: 20, label: '실온' }, { value: 150, label: '🔥 뜨겁게' }], -999, (v) => { st.T = v; rng.set(v); });
      const markB = controls.button('💥 충돌 표시', () => { st.mark = !st.mark; markB.classList.toggle('on', st.mark); }); markB.classList.add('on');
      text();

      return {
        update(dt, t) {
          const sim = window.__sim && window.__sim.S;
          if (sim && typeof sim.Tset === 'number' && sim.Tset !== st.last) { st.last = sim.Tset; st.T = sim.Tset; rng.set(sim.Tset); }
          st.Tg += (st.T - st.Tg) * Math.min(1, dt * 2.2);
          const top = Y0 + hOf(Vof(st.Tg)) - PR, bot = Y0 + PR, rmax = RC - PR, sp = speedOf(st.Tg);
          const sub = 2, h = Math.min(dt, 0.05) / sub, fT = Math.max(0, Math.min(1, (st.Tg + 50) / 200));
          for (let k = 0; k < sub; k++) for (let i = 0; i < NP; i++) {
            const p = P[i], s = sp * p.k * h; p.x += p.vx * s; p.y += p.vy * s; p.z += p.vz * s;
            if (p.y > top) { p.y = top - (p.y - top); p.vy = -Math.abs(p.vy); p.hot = 0.25; st.hits++; }
            if (p.y < bot) { p.y = bot + (bot - p.y); p.vy = Math.abs(p.vy); }
            const d = Math.hypot(p.x, p.z);
            if (d > rmax) { const nx = p.x / d, nz = p.z / d, dot = p.vx * nx + p.vz * nz; p.vx -= 2 * dot * nx; p.vz -= 2 * dot * nz; p.x = nx * (2 * rmax - d); p.z = nz * (2 * rmax - d); }
            if (p.y > top) p.y = top;
          }
          cc.copy(cold).lerp(hotc, fT);
          for (let i = 0; i < NP; i++) { const p = P[i]; p.hot = Math.max(0, p.hot - dt); put(ps, i, p.x, p.y, p.z, 1 + p.hot * 1.4); ps.setColorAt(i, st.mark && p.hot > 0 ? _c.set(0xffd23f) : _c.copy(cc)); }
          flush(ps);
          st.tm += dt; if (st.tm >= 0.6) { st.rate = st.rate * 0.4 + 0.6 * (st.hits / st.tm); st.hits = 0; st.tm = 0; text(); }
          refresh();
        },
        sync() { const sim = window.__sim && window.__sim.S; if (sim && typeof sim.Tset === 'number') { st.last = sim.Tset; st.T = sim.Tset; rng.set(sim.Tset); } },
      };
    },
  });
})();
