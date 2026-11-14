/* m1-gas-boyle · 3D 주사기 속 기체 (온도가 일정할 때 부피와 압력)
   피스톤을 눌러 부피를 줄이면 같은 수의 입자가 더 좁은 곳에서 움직여 피스톤에 더 자주 부딪혀요 → 압력이 커져요.
   압력은 2D 실험과 같은 식 P = 40 mL ÷ V (기압)를 써요. 2D에서 피스톤 위치가 바뀌면 3D도 따라가요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHN0 = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  window.SciSim3D.attach({
    title: '주사기 속 기체 3D',
    levels: [0, 2, 3],   // 관찰 · 입자 모형 · 생활 퀴즈는 3D, 표와 그래프를 읽는 2단계(측정 기록)는 2D
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: 13 * (PHN0 ? 1.05 : 1), theta: 0.55, phi: 1.2, fov: 45, target: [PHN0 ? 1.7 : -0.1, 0.7, 0], min: 6, max: 32 },
    autoRotate: 0.12,
    build(ctx) {
      const { THREE, root, label, info, controls, orbit } = ctx;
      /* ---------- 공통 도구 ---------- */
      const PHN = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
      const V3 = THREE.Vector3, Yax = new V3(0, 1, 0);
      const mat = (c, o) => { o = o || {}; if (o.metalness >= 0.5 && !o.transparent) { const q = Object.assign({}, o), r = q.roughness; delete q.metalness; delete q.roughness; return ctx.mats.metal(c, { roughness: r == null ? 0.3 : r, extra: q }); } return new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.5, metalness: 0.05 }, o)); };   // 금속 부품은 실제 금속 재질(환경 반사)
      const glass = (c, op, o) => ctx.mats.glass({ tint: c || 0xeaf6ff, opacity: op || 0.16, extra: o || {} });   // 유리: 맑고 또렷한 반사
      const rnd = (() => { let s = 12345; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; })();
      const _m = new THREE.Matrix4(), _c = new THREE.Color();
      function spheres(N, r, color, seg) {
        const m = new THREE.InstancedMesh(new THREE.SphereGeometry(r, seg || 16, Math.round((seg || 16) * 0.75)), mat(color, { roughness: 0.55, metalness: 0 }), N);
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
          c.font = '800 20px sans-serif'; c.fillStyle = '#2563eb'; c.fillText(unit, 128, 200);
        });
        const face = new THREE.Mesh(new THREE.CircleGeometry(R * 0.93, 48), new THREE.MeshBasicMaterial({ map: tex })); face.position.z = 0.18; g.add(face);
        const needle = new THREE.Group(); needle.position.z = 0.24;
        const nb = new THREE.Mesh(new THREE.BoxGeometry(R * 0.7, 0.07, 0.04), mat(0xe11d48, { roughness: 0.4 })); nb.position.x = R * 0.3; needle.add(nb);
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.06, 16), mat(0x475569, { metalness: 0.5 })); cap.rotation.x = Math.PI / 2; needle.add(cap);
        g.add(needle);
        g.userData.set = (v) => { needle.rotation.z = (-225 + 270 * Math.max(0, Math.min(max, v)) / max) * Math.PI / 180; };
        g.userData.set(0); return g;
      }
      /* 사방으로 빛나는 별 모양 빛 번짐 */
      function glowSprite(size, inner, mid) { const tex = canvasTex(128, 128, (c) => { const g = c.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, inner || 'rgba(255,235,160,1)'); g.addColorStop(0.25, mid || 'rgba(255,190,60,.55)'); g.addColorStop(1, 'rgba(255,160,0,0)'); c.fillStyle = g; c.fillRect(0, 0, 128, 128); });
        const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); s.scale.set(size, size, 1); return s; }
      function starField(n, R) { const pos = []; for (let i = 0; i < n; i++) { const u = rnd() * 2 - 1, a = rnd() * 6.283, r = Math.sqrt(1 - u * u); pos.push(Math.cos(a) * r * R, u * R, Math.sin(a) * r * R); }
        const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); return new THREE.Points(g, new THREE.PointsMaterial({ color: 0x9fb4e8, size: 1.5, sizeAttenuation: false, transparent: true, opacity: 0.55 })); }
      /* 행성 겉면 무늬 (가로 줄무늬 / 점무늬) */
      function bandTex(cols, seed) { return canvasTex(256, 128, (c, w, h) => { let s = seed || 3; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
        const n = cols.length; for (let i = 0; i < 16; i++) { c.fillStyle = cols[Math.floor(r() * n)]; c.fillRect(0, i * h / 16, w, h / 16 + 1); }
        c.globalAlpha = 0.25; for (let i = 0; i < 60; i++) { c.fillStyle = cols[Math.floor(r() * n)]; c.beginPath(); c.ellipse(r() * w, r() * h, 8 + r() * 25, 2 + r() * 4, 0, 0, 7); c.fill(); } c.globalAlpha = 1; }); }

      const RC = 1.45, Y0 = -2.6, SPD = 2.6, PR = 0.12, NP = 36;
      const S0 = (window.__sim && window.__sim.S) || null;
      const st = { V: S0 && typeof S0.V === 'number' ? S0.V : 40, Vs: 0, last: S0 ? S0.V : null, hits: 0, rate: 0, tm: 0, auto: false, ad: -1, show: true, mark: true };
      st.Vs = st.V; st.rate = NP * SPD * 0.5 / (2 * (st.V / 10));
      const hOf = (V) => V / 10;

      /* 주사기 몸통 (유리) + 눈금 */
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(RC + 0.08, RC + 0.08, 5.6, 56, 1, true), glass(0xcfe6ff, 0.2));
      barrel.position.y = Y0 + 2.8; root.add(barrel);
      const base = new THREE.Mesh(new THREE.CylinderGeometry(RC + 0.12, RC + 0.12, 0.3, 56), mat(0xb7c2d4, { metalness: 0.9, roughness: 0.35 })); base.position.y = Y0 - 0.15; root.add(base);
      const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.5, 20), mat(0xb7c2d4, { metalness: 0.9 })); nozzle.position.y = Y0 - 0.5; root.add(nozzle);
      for (let v = 10; v <= 50; v += 10) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(RC + 0.09, 0.015, 8, 64), mat(0x2f6df6, { roughness: 0.5, transparent: true, opacity: 0.55 })); ring.rotation.x = Math.PI / 2; ring.position.y = Y0 + hOf(v); root.add(ring);
        if (v % 20 === 10 || v === 50) label(v + ' mL', [RC + 0.1, Y0 + hOf(v), 0], { size: 10.5, offset: [0.55, 0, 0] });
      }
      const topRim = new THREE.Mesh(new THREE.TorusGeometry(RC + 0.08, 0.06, 10, 64), mat(0xb7c2d4, { metalness: 0.9 })); topRim.rotation.x = Math.PI / 2; topRim.position.y = Y0 + 5.6; root.add(topRim);

      /* 피스톤 */
      const piston = new THREE.Group();
      const pd = new THREE.Mesh(new THREE.CylinderGeometry(RC, RC, 0.34, 56), ctx.mats.rubber(0x23272e)); pd.position.y = 0.17; piston.add(pd);
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 2.6, 16), mat(0xcfd6e2, { metalness: 0.7, roughness: 0.25 })); rod.position.y = 1.6; piston.add(rod);
      const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.22, 36), ctx.mats.plastic(0xe08a00)); knob.position.y = 2.9; piston.add(knob);
      root.add(piston);

      /* 기체: 푸른 반투명 부피 + 입자 */
      const gas = new THREE.Mesh(new THREE.CylinderGeometry(RC, RC, 1, 56), glass(0x6aa9ff, 0.12)); root.add(gas);
      const ps = spheres(NP, PR, 0x3d6df2, 14);
      const P = [];
      for (let i = 0; i < NP; i++) { const a = rnd() * 6.283, r = Math.sqrt(rnd()) * (RC - PR), b = rnd() * 6.283, c = (rnd() * 2 - 1);
        P.push({ x: Math.cos(a) * r, y: Y0 + PR + rnd() * (st.V / 10 - 2 * PR), z: Math.sin(a) * r, vx: 0, vy: 0, vz: 0, hot: 0 });
        const s = SPD * (0.7 + 0.6 * rnd()), u = Math.sqrt(1 - c * c); P[i].vx = Math.cos(b) * u * s; P[i].vy = c * s; P[i].vz = Math.sin(b) * u * s; }

      /* 압력계 + 연결 호스 */
      const GX = 4.5, GY = -1.6;
      const gauge = makeDial(1.15, 5, '기압', 0.25, 1); gauge.position.set(GX, GY, 0); root.add(gauge);
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 0.9, 20), mat(0x8b95a7, { metalness: 0.5 })); stem.position.set(GX, GY - 1.45, 0); root.add(stem);
      root.add(tubeMesh([[0, Y0 - 0.7, 0], [0, Y0 - 1.1, 0], [1.2, Y0 - 1.15, 0], [GX - 1.2, Y0 - 1.15, 0], [GX, Y0 - 1.05, 0]], 0.09, 0x64748b, { roughness: 0.5 }));
      label('압력계', [GX, GY + 1.55, 0], { size: 12.5 });
      const pLab = label('', piston, { size: 12.5, color: 'rgba(245,158,11,.92)', offset: [0, 3.5, 0] });
      /* 2D의 초록 목표 선(미션 ①②)과 같은 자리 */
      const tgRing = new THREE.Mesh(new THREE.TorusGeometry(RC + 0.14, 0.05, 10, 64), mat(0x22c55e, { emissive: 0x16a34a, emissiveIntensity: 0.6 })); tgRing.rotation.x = Math.PI / 2; tgRing.visible = false; root.add(tgRing);
      const tgLab = label('', [-(RC + 0.2), 0, 0], { size: 12, color: 'rgba(20,160,88,.95)', offset: [-0.9, 0, 0] }); tgLab.show(false);
      let lastSH = null;

      function refresh() {
        const h = hOf(st.Vs), top = Y0 + h;
        piston.position.y = top; gas.scale.y = h; gas.position.y = Y0 + h / 2;
        const pr = 40 / st.Vs;
        gauge.userData.set(pr);
        pLab.set(Math.round(st.Vs) + ' mL · ' + (Math.round(pr * 100) / 100) + '기압');
      }
      refresh();
      function text() {
        const pr = 40 / st.Vs;
        info('부피 <b>' + Math.round(st.Vs) + ' mL</b> → 압력 <b>' + (Math.round(pr * 100) / 100) + '기압</b><br>피스톤에 부딪히는 입자: <b>초당 약 ' + Math.round(st.rate) + '번</b><br>부피를 바꿔 가며 부딪히는 횟수와 압력계 바늘을 비교해 봐요.');   // 퀴즈의 답(까닭)은 미리 알려 주지 않아요
      }

      /* 조작 */
      /* 부피는 2D와 같은 값 (10~50 mL): 3D에서 바꾸면 2D 피스톤도 같이 움직여요 */
      let pmode = false, built = false, pP = 0;
      const sm = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
      const pl = controls.player({
        duration: 8, loop: true, autoplay: false, label: '눌렀다 당기기',
        phases: [[0, '눌러요'], [0.35, '꾹 눌렀어요'], [0.5, '당겨요'], [0.85, '처음으로']],
        onFrame(p) { if (!built) return; pmode = true; pP = p; },
      });
      built = true;
      const vOf = (p) => (p < 0.35 ? 40 - 28 * sm(p / 0.35) : p < 0.5 ? 12 : p < 0.85 ? 12 + 36 * sm((p - 0.5) / 0.35) : 48 - 8 * sm((p - 0.85) / 0.15));
      const rng = controls.range('부피', 10, 50, 1, Math.round(st.V), (v) => { pmode = false; pl.pause(); st.V = v; const l = window.__sim; if (l && l.setV) l.setV(v); else if (l && l.S) l.S.V = v; st.last = v; }, (v) => v + ' mL');
      const markB = controls.button('💥 충돌 표시', () => { st.mark = !st.mark; markB.classList.toggle('on', st.mark); const l = window.__sim, cb = document.getElementById('showHits'); if (cb) cb.checked = st.mark; if (l && l.S) { l.S.showHits = st.mark; lastSH = st.mark; } });
      markB.classList.add('on');
      text();

      return {
        update(dt, t) {
          const sim = window.__sim && window.__sim.S;
          if (sim) {   // 2D의 목표 선 · 입자 모형 · 충돌 표시를 따라가요
            const tg = sim.target; tgRing.visible = !!tg; tgLab.show(!!tg);
            if (tg) { tgRing.position.y = Y0 + hOf(tg.V); tgLab.obj = [-(RC + 0.2), Y0 + hOf(tg.V), 0]; tgLab.set(tg.label); }
            ps.visible = sim.showParticles !== false;
            if (sim.showHits !== lastSH) { lastSH = sim.showHits; st.mark = !!sim.showHits; markB.classList.toggle('on', st.mark); }
          }
          if (sim && typeof sim.V === 'number' && sim.V !== st.last) { st.last = sim.V; st.V = sim.V; rng.set(Math.round(sim.V)); pmode = false; pl.pause(); }
          if (pmode) { st.V = vOf(pP); rng.set(Math.round(st.V)); }
          st.Vs += (st.V - st.Vs) * Math.min(1, dt * 10);
          const top = Y0 + hOf(st.Vs) - PR, bot = Y0 + PR, rmax = RC - PR;
          const sub = 2, h = Math.min(dt, 0.05) / sub;
          for (let k = 0; k < sub; k++) for (let i = 0; i < NP; i++) {
            const p = P[i]; p.x += p.vx * h; p.y += p.vy * h; p.z += p.vz * h;
            if (p.y > top) { p.y = top - (p.y - top); p.vy = -Math.abs(p.vy); p.hot = 0.25; st.hits++; }
            if (p.y < bot) { p.y = bot + (bot - p.y); p.vy = Math.abs(p.vy); }
            const d = Math.hypot(p.x, p.z);
            if (d > rmax) { const nx = p.x / d, nz = p.z / d, dot = p.vx * nx + p.vz * nz; p.vx -= 2 * dot * nx; p.vz -= 2 * dot * nz; p.x = nx * (2 * rmax - d); p.z = nz * (2 * rmax - d); }
            if (p.y > top) p.y = top;
          }
          for (let i = 0; i < NP; i++) { const p = P[i]; p.hot = Math.max(0, p.hot - dt); put(ps, i, p.x, p.y, p.z, 1 + p.hot * 1.4); tint(ps, i, st.mark && p.hot > 0 ? 0xff9a1f : 0x3d6df2); }
          flush(ps);
          st.tm += dt; if (st.tm >= 0.6) { st.rate = st.rate * 0.4 + 0.6 * (st.hits / st.tm); st.hits = 0; st.tm = 0; text(); }
          refresh();
          gauge.rotation.y = orbit.theta * 0.6;
        },
        sync() { const sim = window.__sim && window.__sim.S; if (sim && typeof sim.V === 'number') { st.last = sim.V; st.V = sim.V; rng.set(Math.round(sim.V)); } },
      };
    },
  });
})();
