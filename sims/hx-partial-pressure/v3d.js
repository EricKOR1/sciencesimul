/* hx-partial-pressure · 3D 혼합 기체와 분압
   He · N₂ · O₂ 입자를 한 용기에 넣고 개수를 바꿔 보면, 전체 압력이 각 기체 분압의 합이라는 것을 쌓아 올린 기둥으로 볼 수 있어요.
   (같은 부피·온도에서 분압 ∝ 입자 수 = 몰수. 모형 스케치예요.) */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const HW = 2, H = 4.4, FLOOR = -2.2, MAXG = 20, UNIT = 0.1, PART = 0.05;       // 입자 1개 = 0.05 mol = 0.10 atm (12.3 L, 300 K)
  const G = [
    { k: 'he', name: 'He', col: 0xffd34d, r: 0.17, v: 1.9, ko: 'He' },
    { k: 'n2', name: 'N₂', col: 0x5b8cff, r: 0.21, v: 1.1, ko: 'N₂' },
    { k: 'o2', name: 'O₂', col: 0xff5a5f, r: 0.21, v: 1.0, ko: 'O₂' },
  ];

  window.SciSim3D.attach({
    title: '혼합 기체와 분압 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: PHONE ? 15 : 11.3, theta: 0.5, phi: 1.2, min: 7, max: 28, target: [1.8, 0, 0] },
    autoRotate: 0.12,
    levels: [0, 1],   // 3·4단계(연결 용기·물 위 포집·잠수 설계)는 2D 화면이에요. 1단계의 합 입력칸(#inSum)은 data-v3="keep"
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      /* ---- 장면 꾸미기 도우미: 나무 · 암석 무늬, 하늘 · 우주 배경, 빛 번짐 (모양만 꾸며요) ---- */
      const FX = (() => {
        const scn = ctx.scene; let sd = 7; const rnd = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
        const mk = (w, h, draw, rep) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; if (rep) t.repeat.set(rep[0], rep[1]); if ('encoding' in t) t.encoding = THREE.sRGBEncoding; t.anisotropy = 4; return t; };
        const wood = (rep) => mk(256, 256, (g, w, h) => { g.fillStyle = '#b98a58'; g.fillRect(0, 0, w, h); for (let i = 0; i < 80; i++) { const y = rnd() * h; g.strokeStyle = 'rgba(' + (70 + rnd() * 40 | 0) + ',38,12,' + (0.07 + rnd() * 0.15) + ')'; g.lineWidth = 0.6 + rnd() * 2.2; g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= w; x += 32) g.lineTo(x, y + Math.sin(x * 0.03 + i) * 3 * rnd()); g.stroke(); } g.fillStyle = 'rgba(60,30,10,.18)'; for (let k = 1; k < 4; k++) g.fillRect(0, k * 64, w, 2); }, rep);
        const grain = (rep, amt) => mk(128, 128, (g, w, h) => { g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); for (let i = 0; i < 1100; i++) { const v = 150 + rnd() * 80 | 0; g.fillStyle = 'rgba(' + v + ',' + v + ',' + v + ',' + (amt || 0.35) + ')'; g.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 3, 1 + rnd() * 2.2); } }, rep);
        const dome = (top, mid, bot, stars) => {
          const t = mk(8, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, top); gr.addColorStop(0.5, mid); gr.addColorStop(1, bot); g.fillStyle = gr; g.fillRect(0, 0, w, h); }); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
          const m = new THREE.Mesh(new THREE.SphereGeometry(90, 32, 16), new THREE.MeshBasicMaterial({ map: t, side: THREE.BackSide, depthWrite: false })); m.renderOrder = -10; m.raycast = () => {}; scn.add(m);
          if (stars) { const pos = []; for (let i = 0; i < stars; i++) { const u = rnd() * 2 - 1, a = rnd() * 6.283, q = Math.sqrt(1 - u * u); pos.push(Math.cos(a) * q * 85, u * 85, Math.sin(a) * q * 85); } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); const p = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xcfdcff, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0.8, depthWrite: false })); p.renderOrder = -9; p.raycast = () => {}; m.add(p); }
          return m;
        };
        const glowTex = (rgb) => mk(128, 128, (g, w, h) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(' + rgb + ',1)'); gr.addColorStop(0.35, 'rgba(' + rgb + ',.35)'); gr.addColorStop(1, 'rgba(' + rgb + ',0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
        const glow = (rgb, size, op) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(rgb), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: op == null ? 0.8 : op })); s.scale.setScalar(size); s.raycast = () => {}; return s; };
        const spiral = (rgb) => mk(256, 256, (g, w, h) => { g.clearRect(0, 0, w, h); const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128); gr.addColorStop(0, 'rgba(255,248,230,1)'); gr.addColorStop(0.12, 'rgba(' + rgb + ',.75)'); gr.addColorStop(0.5, 'rgba(' + rgb + ',.2)'); gr.addColorStop(1, 'rgba(' + rgb + ',0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); for (let arm = 0; arm < 2; arm++) for (let i = 0; i < 260; i++) { const f = i / 260, a = f * 5.2 + arm * Math.PI, r = 14 + f * 108, x = 128 + Math.cos(a) * r + (rnd() - 0.5) * 12 * f, y = 128 + Math.sin(a) * r + (rnd() - 0.5) * 12 * f; g.fillStyle = 'rgba(255,255,255,' + (0.5 * (1 - f) + 0.06) + ')'; g.beginPath(); g.arc(x, y, 1 + rnd() * 2.4 * (1 - f * 0.5), 0, 6.283); g.fill(); } });
        return { rnd, mk, wood, grain, dome, glow, glowTex, spiral };
      })();
      const V3 = THREE.Vector3;
      const cnt = { he: 0, n2: 0, o2: 0 };
      let demo = null, sig = '', note = '';
      const fracCounts = (nO) => { const r = 20 - nO, he = Math.round(0.4 * r); return { he, n2: r - he, o2: nO }; };
      let only = 'all';
      const X0 = -1.6;                       // 용기 중심 x
      const box = new THREE.Mesh(new THREE.BoxGeometry(HW * 2, H, HW * 2), new THREE.MeshStandardMaterial({ color: 0xbfe3ff, transparent: true, opacity: 0.15, roughness: 0.1, depthWrite: false, side: THREE.DoubleSide }));
      box.position.set(X0, FLOOR + H / 2, 0); root.add(box);
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(HW * 2, H, HW * 2)), new THREE.LineBasicMaterial({ color: 0x9fc8ee, transparent: true, opacity: 0.8 }));
      edges.position.copy(box.position); root.add(edges);
      const base = new THREE.Mesh(new THREE.BoxGeometry(HW * 2 + 0.4, 0.25, HW * 2 + 0.4), new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.5, metalness: 0.4 }));
      base.position.set(X0, FLOOR - 0.125, 0); root.add(base);
      /* 실험실 벽 · 나무 실험대 · 유리 용기의 금속 기둥 · 기체 실린더 */
      FX.dome('#1b2a48', '#2b3e63', '#40557c', 0);
      const bench = new THREE.Mesh(new THREE.BoxGeometry(14.5, 0.4, 9), new THREE.MeshStandardMaterial({ map: FX.wood([3.2, 1.5]), roughness: 0.55 })); bench.position.set(1.0, FLOOR - 0.45, 0.4); bench.receiveShadow = true; root.add(bench);
      const benchEdge = new THREE.Mesh(new THREE.BoxGeometry(14.54, 0.08, 9.04), new THREE.MeshStandardMaterial({ color: 0x6b4a2b, roughness: 0.6 })); benchEdge.position.set(1.0, FLOOR - 0.3, 0.4); root.add(benchEdge);
      const chrome = new THREE.MeshStandardMaterial({ color: 0xdfe6ee, roughness: 0.22, metalness: 0.85 });
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach((c) => { const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, H + 0.1, 12), chrome); post.position.set(X0 + c[0] * HW, FLOOR + H / 2, c[1] * HW); post.castShadow = true; root.add(post); const cap = new THREE.Mesh(new THREE.SphereGeometry(0.1, 14, 10), chrome); cap.position.set(X0 + c[0] * HW, FLOOR + H + 0.05, c[1] * HW); root.add(cap); });
      [[0, HW], [0, -HW]].forEach((r) => { const b = new THREE.Mesh(new THREE.BoxGeometry(HW * 2, 0.07, 0.07), chrome); b.position.set(X0, FLOOR + H, r[1]); root.add(b); });
      [-HW, HW].forEach((x) => { const b = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, HW * 2), chrome); b.position.set(X0 + x, FLOOR + H, 0); root.add(b); });
      G.forEach((g, i) => {
        const cx = X0 - 1.6 + i * 1.6, cz = -3.5, bodyH = 3.0, tank = new THREE.Group();
        const bm = new THREE.MeshStandardMaterial({ color: g.col, roughness: 0.4, metalness: 0.15 });
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, bodyH, 28), bm); body.position.y = bodyH / 2; tank.add(body);
        const dome = new THREE.Mesh(new THREE.SphereGeometry(0.46, 28, 14, 0, 6.283, 0, 1.2), bm); dome.position.y = bodyH; tank.add(dome);
        const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.22, 12), chrome); neck.position.y = bodyH + 0.42; tank.add(neck);
        const valve = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.14, 0.16), chrome); valve.position.y = bodyH + 0.6; tank.add(valve);
        const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.12, 10), new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 })); knob.position.y = bodyH + 0.72; tank.add(knob);
        const band = new THREE.Mesh(new THREE.CylinderGeometry(0.47, 0.47, 0.22, 28), new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5 })); band.position.y = bodyH * 0.62; tank.add(band);
        const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.08, 28), new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 })); foot.position.y = 0.04; tank.add(foot);
        tank.position.set(cx, FLOOR, cz); tank.traverse((o) => { if (o.isMesh) o.castShadow = true; }); root.add(tank);
        const a = new THREE.Vector3(cx, FLOOR + bodyH + 0.7, cz), b = new THREE.Vector3(X0 + (i - 1) * 1.0, FLOOR + H + 0.35, -HW * 0.55);
        const hose = new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(a, new THREE.Vector3((a.x + b.x) / 2, a.y + 1.1, (a.z + b.z) / 2), b), 30, 0.045, 8), new THREE.MeshStandardMaterial({ color: g.col, roughness: 0.5 })); root.add(hose);
        const nz = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.2, 10), chrome); nz.position.copy(b).add(new THREE.Vector3(0, -0.05, 0)); root.add(nz);
      });

      /* 입자 */
      const meshes = G.map((g) => {
        const m = new THREE.InstancedMesh(new THREE.SphereGeometry(g.r, 20, 16), new THREE.MeshStandardMaterial({ color: g.col, roughness: 0.25, metalness: 0.05, emissive: g.col, emissiveIntensity: 0.22 }), MAXG);
        m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.frustumCulled = false; root.add(m); return m;
      });
      const P = G.map(() => Array.from({ length: MAXG }, () => ({
        p: new V3((Math.random() * 2 - 1) * (HW - 0.4), FLOOR + 0.4 + Math.random() * (H - 0.8), (Math.random() * 2 - 1) * (HW - 0.4)),
        d: new V3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize(), f: 0.7 + Math.random() * 0.6,
      })));
      const M = new THREE.Matrix4(), S0 = new V3(1, 1, 1);

      /* 쌓은 기둥 (전체 압력 = 분압의 합) */
      const BX = 4.1, BW = 1.3;
      const cols = G.map((g) => {
        const m = new THREE.Mesh(new THREE.BoxGeometry(BW, 1, BW), new THREE.MeshPhysicalMaterial({ color: g.col, roughness: 0.3, metalness: 0.1, clearcoat: 0.7, clearcoatRoughness: 0.2, emissive: g.col, emissiveIntensity: 0.12 }));
        m.castShadow = true; root.add(m); return m;
      });
      const rail = new THREE.Mesh(new THREE.BoxGeometry(BW + 0.5, 0.12, BW + 0.5), new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.5, metalness: 0.4 }));
      rail.position.set(BX, FLOOR - 0.06, 0); root.add(rail);
      { const pl = new THREE.Mesh(new THREE.BoxGeometry(BW + 0.9, 0.1, BW + 0.9), new THREE.MeshStandardMaterial({ map: FX.wood([0.6, 0.6]), roughness: 0.5 })); pl.position.set(BX, FLOOR - 0.17, 0); root.add(pl); }
      const labs = G.map((g, i) => label('', cols[i], { color: 'rgba(30,41,59,.88)', offset: [0, 0, BW / 2 + 0.05] }));
      const bridge = new THREE.Mesh(new THREE.BoxGeometry(BW + 0.3, 0.06, 0.06), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.4 }));
      root.add(bridge);
      const labT = label('', bridge, { color: 'rgba(239,106,91,.92)', offset: [0, 0.5, 0] });
      labT.el.style.color = '#fff';

      function layoutBars() {
        let y = FLOOR; let tot = 0;
        const sumN = G.reduce((a, g) => a + (only === 'all' || only === g.k ? cnt[g.k] : 0), 0), kS = Math.min(0.3, 5.4 / Math.max(1, sumN));
        G.forEach((g, i) => {
          const n = only === 'all' || only === g.k ? cnt[g.k] : 0;
          const hh = Math.max(0.001, n * kS); const sh = n > 0;
          cols[i].visible = sh; cols[i].scale.set(1, hh, 1); cols[i].position.set(BX, y + hh / 2, 0);
          labs[i].show(sh);
          labs[i].set(g.ko + ' ' + (n * UNIT).toFixed(1));
          y += n > 0 ? hh : 0; tot += n;
        });
        bridge.position.set(BX, y, 0);
        labT.set('전체 ' + (tot * UNIT).toFixed(1) + ' atm');
        const all = cnt.he + cnt.n2 + cnt.o2;
        const mf = (n) => all ? (n / all).toFixed(2) : '0.00';
        const md = mode();
        let t = (demo ? '▶ ' + note : '') + '<b>P(전체) = P(He) + P(N₂) + P(O₂)</b><br>12.3 L · 300 K · 입자 1개 = 0.05 mol = 0.10 atm<br>';
        if (md === 'frac') t = (demo ? '▶ ' + note : '') + '<b>P(A) = X(A) × P(전체)</b><br>전체 1.0 mol · X(O₂) = ' + mf(cnt.o2) + ' · P(O₂) = ' + (cnt.o2 * UNIT).toFixed(2) + ' atm<br>';
        else if (md !== 'sum') t = '<b>P(전체) = P(He) + P(N₂) + P(O₂)</b><br>각 기체의 분압은 몰 분율 × 전체 압력이에요.<br>';
        info(t + '몰 분율: He ' + mf(cnt.he) + ' · N₂ ' + mf(cnt.n2) + ' · O₂ ' + mf(cnt.o2));
      }
      const mode = () => { try { return window.__sim.S.mode; } catch (e) { return 'sum'; } };
      function from2D() {
        let S; try { S = window.__sim.S; } catch (e) { return false; }
        const m = S.mode; let c;
        if (m === 'sum') c = { he: S.sum.inj.he / PART, n2: S.sum.inj.n2 / PART, o2: S.sum.inj.o2 / PART };
        else if (m === 'frac') c = fracCounts(S.frac.nO);
        else c = null;
        const sg = m + (c ? c.he + ',' + c.n2 + ',' + c.o2 : '');
        if (sg !== sig) { sig = sg; demo = null; note = ''; if (c) { cnt.he = Math.round(c.he); cnt.n2 = Math.round(c.n2); cnt.o2 = Math.round(c.o2); } return true; }
        return false;
      }
      controls.player({
        duration: 10, loop: true, autoplay: false, label: '재생',
        onFrame(p) {
          const k = (a, b, n) => Math.round(Math.max(0, Math.min(1, (p - a) / (b - a))) * n);
          if (mode() === 'frac') { const c = fracCounts(Math.min(20, Math.round(p * 20))); cnt.he = c.he; cnt.n2 = c.n2; cnt.o2 = c.o2; }   // X(O₂) 0 → 1
          else { cnt.he = k(0.08, 0.2, 4); cnt.n2 = k(0.3, 0.42, 6); cnt.o2 = k(0.52, 0.64, 10); }
          note = mode() === 'frac' ? 'X(O₂) 0 → 1 · ' : p < 0.08 ? '빈 용기 · ' : p < 0.3 ? 'He 넣는 중 · ' : p < 0.52 ? 'N₂ 넣는 중 · ' : p < 0.76 ? 'O₂ 넣는 중 · ' : '분압의 합 · ';
          demo = true; layoutBars();
        },
      });
      controls.segment('보기', [{ value: 'all', label: '모두' }, { value: 'he', label: 'He만' }, { value: 'n2', label: 'N₂만' }, { value: 'o2', label: 'O₂만' }], 'all', (v) => { only = v; layoutBars(); });
      from2D(); layoutBars();

      return {
        sync() { sig = ''; },
        update(dt) {
          dt = Math.min(dt, 0.05);
          if (from2D()) layoutBars();
          const w = HW;
          G.forEach((g, gi) => {
            const vis = only === 'all' || only === g.k, n = vis ? cnt[g.k] : 0, m = meshes[gi];
            for (let i = 0; i < MAXG; i++) {
              const q = P[gi][i];
              if (i >= n) { M.makeScale(0.0001, 0.0001, 0.0001); m.setMatrixAt(i, M); continue; }
              q.p.addScaledVector(q.d, g.v * q.f * 1.3 * dt);
              const lo = -w + g.r, hi = w - g.r;
              if (q.p.x > hi) { q.p.x = hi; q.d.x *= -1; } else if (q.p.x < lo) { q.p.x = lo; q.d.x *= -1; }
              if (q.p.z > hi) { q.p.z = hi; q.d.z *= -1; } else if (q.p.z < lo) { q.p.z = lo; q.d.z *= -1; }
              if (q.p.y > FLOOR + H - g.r) { q.p.y = FLOOR + H - g.r; q.d.y *= -1; } else if (q.p.y < FLOOR + g.r) { q.p.y = FLOOR + g.r; q.d.y *= -1; }
              M.makeTranslation(q.p.x + X0, q.p.y, q.p.z); m.setMatrixAt(i, M);
            }
            m.instanceMatrix.needsUpdate = true;
          });
        },
      };
    },
  });
})();
