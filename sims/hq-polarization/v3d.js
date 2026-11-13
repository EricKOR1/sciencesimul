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
    levels: [0, 1, 3],
    autoRotate: 0,
    build(ctx) {
      const { THREE, info, controls } = ctx;
      /* ---- 여러 장면 도우미: 장면마다 그룹 · 이름표 · 재생 줄을 따로 두고 2D 장면(S.mode)에 맞춰 바꿔요 ---- */
      const root = new THREE.Group(); ctx.root.add(root);
      const G = { pol: root }, K = { cur: '', labs: [], pls: [] };
      const label = (text, obj, o, sc) => {
        const L = ctx.label(text, obj, o), sh = L.show; L._own = true; L._sc = sc || 'pol';
        L._ap = () => sh(L._own && K.cur === L._sc); L.show = (v) => { L._own = v; L._ap(); }; K.labs.push(L); L._ap(); return L;
      };
      const mkPlayer = (sc, o) => {
        const p = controls.player(o), rs = document.querySelectorAll('.v3-player'), row = rs[rs.length - 1];
        K.pls.push({ sc, p, row }); row.style.display = sc === K.cur ? '' : 'none'; return p;
      };
      const newScene = (k) => { const g = new THREE.Group(); g.visible = false; ctx.root.add(g); G[k] = g; return g; };
      const CAMS = {};
      function setScene(k) {
        if (k === K.cur) return; K.cur = k;
        Object.keys(G).forEach((n) => (G[n].visible = n === k));
        K.labs.forEach((L) => L._ap());
        K.pls.forEach((x) => { const on = x.sc === k; x.row.style.display = on ? '' : 'none'; if (!on) x.p.pause(); });
        const c = CAMS[k]; if (c) Object.assign(ctx.orbit, c, { tx: c.tx || 0, ty: c.ty || 0, tz: c.tz || 0 });
        if (k === 'pol') layout();
      }
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
      const MT = ctx.mats;
      const rbox = (w, h, d, r) => { r = Math.min(r, w / 2 - 1e-3, h / 2 - 1e-3, d / 2 - 1e-3); const s = new THREE.Shape(), x = w / 2 - r, y = h / 2 - r; s.absarc(x, y, r, 0, Math.PI / 2); s.absarc(-x, y, r, Math.PI / 2, Math.PI); s.absarc(-x, -y, r, Math.PI, 1.5 * Math.PI); s.absarc(x, -y, r, 1.5 * Math.PI, 2 * Math.PI); const g = new THREE.ExtrudeGeometry(s, { depth: d - 2 * r, bevelEnabled: true, bevelThickness: r, bevelSize: r, bevelOffset: -r, bevelSegments: 3, curveSegments: 6 }); g.translate(0, 0, -(d - 2 * r) / 2); return g; };   // 모서리가 둥근 상자
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
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.45, 36, 24), MT.emissive(0xffdc6a, 1.3, { extra: { roughness: 0.25 } })); bulb.position.x = LAMP; root.add(bulb); ctx.halo(bulb, 0xffd98a, 3.6, 0.8);
      /* 광학대: 레일 · 받침 기둥 · 전구 소켓 (실험실의 광학 실험 장치처럼) */
      const RY = -RAD - 1.05, railM = MT.metal(0x8f98a8, { brushed: true }), postM = MT.metal('steel'), carM = MT.plastic(0x1c2233);
      const rail = new THREE.Mesh(rbox(SCR - LAMP + 1.8, 0.16, 0.62, 0.05), railM); rail.rotation.x = 0; rail.position.set((LAMP + SCR) / 2, RY - 0.08, 0); root.add(rail);
      [-1, 1].forEach((sg) => { const ft = new THREE.Mesh(rbox(0.5, 0.14, 1.3, 0.05), carM); ft.position.set((LAMP + SCR) / 2 + sg * ((SCR - LAMP) / 2 + 0.5), RY - 0.22, 0); root.add(ft); });
      const mkPost = (g, x, yTop) => { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, yTop - RY, 16), postM); p.position.set(x, (yTop + RY) / 2, 0); g.add(p); const c = new THREE.Mesh(rbox(0.46, 0.2, 0.78, 0.05), carM); c.position.set(x, RY + 0.1, 0); g.add(c); };
      mkPost(root, LAMP, -0.62);
      { const sock = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.25, 0.36, 28), MT.metal('brass')); sock.position.set(LAMP, -0.56, 0); root.add(sock); }
      label('💡 자연광', bulb, { color: 'rgba(8,12,24,.78)', size: 13, offset: [0, 0.9, 0] });
      const travel = mkArrow(0xffffff, 0.03); setArrow(travel, new V3(LAMP + 0.8, -RAD - 0.5, 0), new V3(SCR - 1.0, -RAD - 0.5, 0)); root.add(travel); travel.children.forEach((c) => (c.material = mat(0xaab4cf, { transparent: true, opacity: 0.55 })));
      label('빛의 진행 방향 →', [0, -RAD - 0.5, 0], { color: 'rgba(8,12,24,.7)', size: 12, offset: [0, -0.35, 0] });
      const screen = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 3.2), new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide })); screen.rotation.y = Math.PI / 2; screen.position.x = SCR; root.add(screen);
      const scrFrame = new THREE.Mesh(rbox(3.46, 3.46, 0.14, 0.05), MT.plastic(0x1c2233)); scrFrame.rotation.y = Math.PI / 2; scrFrame.position.x = SCR + 0.1; root.add(scrFrame); mkPost(root, SCR + 0.1, -1.7);
      const labScr = label('화면', screen, { color: 'rgba(8,12,24,.78)', size: 13, offset: [0, 2.05, 0] });
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1, 0.3), basic(0xffd34d)); bar.position.set(SCR, 0, 2.4); root.add(bar);
      const barFrame = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(0.34, 3.2, 0.34)), new THREE.LineBasicMaterial({ color: 0x8a96b8 })); barFrame.position.set(SCR, 0, 2.4); root.add(barFrame);
      const labLevel = label('', bar, { color: 'rgba(8,12,24,.82)', size: 13, offset: [0, 0, 0.0] });
      const labLevelTip = new THREE.Object3D(); root.add(labLevelTip); labLevel.obj = labLevelTip;

      /* ---------- 편광판 3개 (필요한 만큼 보여요) ---------- */
      const sheets = [0, 1, 2].map(() => {
        const g = new THREE.Group();
        const disc = new THREE.Mesh(new THREE.CircleGeometry(RAD, 64), MT.glass({ tint: 0x4a74ff, opacity: 0.24 })); disc.rotation.y = Math.PI / 2; g.add(disc);
        const ring = new THREE.Mesh(new THREE.TorusGeometry(RAD, 0.075, 16, 96), MT.plastic(0x4a74ff)); ring.rotation.y = Math.PI / 2; g.add(ring); mkPost(g, 0, -RAD - 0.05);
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
        if (K.cur !== 'pol') return;
        const n = st.n, a = Math.round(st.ang);
        let h = '<b>자연광</b>은 E가 모든 방향으로 진동해요. ';
        if (n === 1) h += '편광판 한 장을 지나면 <b>투과축 방향</b> 진동만 남아요(편광). 한 장만 돌리면 화면 밝기는 그대로예요.';
        else if (n === 2) h += 'P₁ 통과 후 E는 투과축 <b>0°</b> 방향 한 방향뿐. P₂(<b>' + a + '°</b>)는 그 방향과 이루는 각에 따라 <b>투과축 방향 성분</b>만 통과해요. ' + (a % 180 === 90 ? '각이 90°이면 성분이 0이라 <b>빛이 막혀요</b>.' : a % 180 === 0 ? '두 판이 나란하면 그대로 통과해요.' : '각이 클수록 통과하는 진폭이 줄어요.');
        else h += '두 판(0°, 90°)만 있으면 막히지만, <b>가운데 판(' + a + '°)</b>이 있으면 E가 가운데 판 방향으로 한 번 더 <b>돌려져</b> 성분이 생겨 일부가 통과해요. ' + (a % 90 === 0 ? '가운데 판이 0° 또는 90°이면 여전히 어두워요.' : '');
        h += '<br>화면 밝기: <b>' + levelWord(T) + '</b>';
        info(h);
      }

      /* =====================================================================
         새 장면들: 반사(refl) · 하늘(sky) · 디스플레이 조사(survey) · LCD(lcd) · 3D 극장(cine) · 광통신(fiber)
         ===================================================================== */
      const glareShare = (a) => L.glareShare(a), glareOf = (a, g) => L.glareOf(a, g), skyP = (g) => L.skyP(g), skyB = (g, f) => L.skyB(g, f);
      const sceneKey = () => { const S = lessonS(); if (!S) return 'pol'; if (S.mode === 'make') return S.mk.sub === 'sky' ? 'sky' : 'refl'; if (S.mode === 'survey') return 'survey'; if (S.mode === 'tech') return S.te.sub || 'lcd'; return 'pol'; };
      const dirv = (deg) => new V3(0, Math.cos(deg * D2R), Math.sin(deg * D2R));          // 투과축/진동 각도 → 방향 (0° = 세로 y, 위에서 앞(z)쪽으로)
      const tubeG = (a, b, r, m) => { const mm = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1, 10), m); const d = new V3().subVectors(b, a); mm.scale.y = d.length(); mm.position.copy(a).addScaledVector(d, 0.5); mm.quaternion.setFromUnitVectors(Yax, d.normalize()); return mm; };
      function setSeg(m, a, b) { const d = new V3().subVectors(b, a), l = d.length(); if (l < 1e-3) { m.visible = false; return; } m.visible = true; m.scale.y = l; m.position.copy(a).addScaledVector(d, 0.5); m.quaternion.setFromUnitVectors(Yax, d.normalize()); }
      const segM = (col, r, op) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1, 8), basic(col, { transparent: true, opacity: op == null ? 1 : op, depthWrite: false })); m.frustumCulled = false; return m; };
      /* 방향이 자유로운 파동 띠 */
      function mkRib(grp, color, op) {
        const pos = new Float32Array(NPTS * 2 * 3), idx = [];
        for (let i = 0; i < NPTS - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
        const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setIndex(idx);
        const mesh = new THREE.Mesh(geo, basic(color, { transparent: true, opacity: op == null ? 0.3 : op, side: THREE.DoubleSide, depthWrite: false }));
        const lpos = new Float32Array(NPTS * 3), lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.BufferAttribute(lpos, 3));
        const line = new THREE.Line(lg, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.95 }));
        mesh.frustumCulled = line.frustumCulled = false; grp.add(mesh, line);
        const R = { mesh, line, show(v) { mesh.visible = line.visible = v; },
          /* A→B 선 위에서 d 방향(단위벡터)으로 amp×sin 만큼 흔들려요. angFn/ampFn(u)이 있으면 위치마다 달라져요 */
          draw(A, B, d, amp, ph, t, angFn, ampFn) {
            const len = A.distanceTo(B), kk = 2 * Math.PI / 2.4;
            for (let i = 0; i < NPTS; i++) {
              const u = i / (NPTS - 1), px = A.x + (B.x - A.x) * u, py = A.y + (B.y - A.y) * u, pz = A.z + (B.z - A.z) * u;
              const am = (ampFn ? ampFn(u) : amp), dd = angFn ? dirv(angFn(u)) : d;
              const s = am * Math.sin(kk * len * u - OM * t + ph), a = i * 6, b = i * 3;
              pos[a] = px; pos[a + 1] = py; pos[a + 2] = pz; pos[a + 3] = px + dd.x * s; pos[a + 4] = py + dd.y * s; pos[a + 5] = pz + dd.z * s;
              lpos[b] = pos[a + 3]; lpos[b + 1] = pos[a + 4]; lpos[b + 2] = pos[a + 5];
            }
            geo.attributes.position.needsUpdate = true; lg.attributes.position.needsUpdate = true;
          } };
        return R;
      }
      /* 자연광 띠 묶음 (방향이 계속 바뀌는 4장) — d1, d2: 진행 방향에 수직인 두 축 */
      function natDraw(ribs, A, B, d1, d2, amp, t) {
        ribs.forEach((r, j) => { const a = (j * 45 + 35 * Math.sin(0.9 * t + j * 1.7)) * D2R; r.draw(A, B, d1.clone().multiplyScalar(Math.cos(a)).addScaledVector(d2, Math.sin(a)).normalize(), amp * 0.75, j * 1.9, t); });
      }
      const mkNat = (g) => [0, 1, 2, 3].map(() => mkRib(g, 0xfff3b0, 0.18));
      /* 편광판(네모) — 투과축 줄무늬. axis: 0° 세로 */
      function mkPlate(g, size, col) {
        const pl = new THREE.Group();
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.08, size, size), basic(col, { transparent: true, opacity: 0.16, depthWrite: false })); pl.add(body);
        const fr = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(0.1, size, size)), new THREE.LineBasicMaterial({ color: col })); pl.add(fr);
        const gr = new THREE.Group(); pl.add(gr);
        for (let k = -6; k <= 6; k++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.03, size * 0.96, 0.025), basic(0x9fb6ff, { transparent: true, opacity: 0.75 })); b.position.z = k * size / 13.4; gr.add(b); }
        pl.userData.gr = gr; g.add(pl); return pl;
      }
      /* 양쪽 화살표 (진동 방향 표시) */
      function mkDbl(g, col, rad) { const a = mkArrow(col, rad || 0.04), b = mkArrow(col, rad || 0.04); const gg = new THREE.Group(); gg.add(a, b); g.add(gg); gg.userData = { a, b }; return gg; }
      function setDbl(gg, c, d, len) { setArrow(gg.userData.a, c, c.clone().addScaledVector(d, len)); setArrow(gg.userData.b, c, c.clone().addScaledVector(d, -len)); }
      const sphereM = (r, c, o) => new THREE.Mesh(new THREE.SphereGeometry(r, 32, 20), mat(c, o));
      const boxM = (w, h, d, c, o) => new THREE.Mesh(o ? new THREE.BoxGeometry(w, h, d) : rbox(w, h, d, Math.min(w, h, d) * 0.18), o ? mat(c, o) : MT.plastic(c));   // 기기 몸체: 모서리가 둥근 플라스틱
      const bar3 = (g, col) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.34, 1, 0.34), basic(col)); g.add(m); return m; };

      /* ============ ① 반사: 젖은 도로에서 반사한 햇빛 ============ */
      const gR = newScene('refl'); CAMS.refl = { dist: PHN ? 19 : 12, theta: 0.55, phi: 1.22, min: 7, max: 36, ty: 0.2 };
      const rO = new V3(0, -1.7, 0), RR = 4.3;
      const road = new THREE.Mesh(rbox(11, 6, 0.25, 0.04), MT.stone(0x12151b, { repeat: 1.3, bump: 0.012, extra: { roughness: 0.34, metalness: 0.1, envMapIntensity: 0.7 } })); road.rotation.x = Math.PI / 2; road.position.set(0, -1.83, 0); gR.add(road);   // 물에 젖은 아스팔트
      for (let k = -3; k <= 3; k++) { const dsh = boxM(0.9, 0.02, 0.16, 0xe8ecf4, { roughness: 0.6 }); dsh.position.set(k * 1.5, -1.69, 2.2); gR.add(dsh); }
      const normal = segM(0x9aa6b8, 0.015, 0.8); setSeg(normal, rO, rO.clone().add(new V3(0, RR * 0.95, 0))); gR.add(normal);
      const sunR = new THREE.Mesh(new THREE.SphereGeometry(0.42, 32, 24), MT.emissive(0xffcb45, 1.3)); gR.add(sunR); ctx.halo(sunR, 0xffd27a, 3.6, 0.6);
      const hrR = segM(0xffb400, 0.03), hrR2 = segM(0xf26b3a, 0.03); gR.add(hrR, hrR2);
      const headR = new THREE.Mesh(new THREE.SphereGeometry(0.38, 32, 24), MT.organic(0xe2b48a)); gR.add(headR);
      const eyeDot = sphereM(0.07, 0x26324a); gR.add(eyeDot);
      const lensR = new THREE.Group(); gR.add(lensR);
      const lensDisc = new THREE.Mesh(new THREE.CircleGeometry(0.62, 48), MT.glass({ tint: 0x2a3142, opacity: 0.5 })); lensR.add(lensDisc);
      const lensRing = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.04, 12, 64), MT.plastic(0x1a1f2b)); lensR.add(lensRing);
      const lensGr = new THREE.Group(); lensR.add(lensGr);
      for (let k = -4; k <= 4; k++) { const hh = 2 * Math.sqrt(Math.max(0.01, 0.62 * 0.62 - Math.pow(k * 0.13, 2))); const b = new THREE.Mesh(new THREE.BoxGeometry(0.02, hh, 0.012), basic(0x1b2233)); b.position.x = k * 0.13; lensGr.add(b); }
      const natR = mkNat(gR), ribS = mkRib(gR, 0xf26b3a, 0.28), ribP = mkRib(gR, 0x2f6bff, 0.28);
      let rSig = ''; const rPl = { on: false, th: 30 }; const arcG = new THREE.Group(); gR.add(arcG); let arcTh = -1;
      const labSunR = label('☀️ 햇빛 (자연광)', sunR, { color: 'rgba(8,12,24,.78)', size: 12, offset: [0, 0.75, 0] }, 'refl');
      const labDrv = label('운전자', headR, { color: 'rgba(8,12,24,.78)', size: 12, offset: [0, 0.75, 0] }, 'refl');
      const labRoad = label('물 젖은 도로', [-3.6, -1.7, 1.9], { color: 'rgba(8,12,24,.7)', size: 12 }, 'refl');
      const labAng = label('', [0, -1.7 + RR * 0.5, 0], { color: 'rgba(196,80,27,.92)', size: 13 }, 'refl');
      const labLens = label('', lensR, { color: 'rgba(8,12,24,.82)', size: 12, offset: [0, -0.95, 0] }, 'refl');
      const gBar = bar3(gR, 0xe2464b), gFr = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(0.38, 2.6, 0.38)), new THREE.LineBasicMaterial({ color: 0x8a96b8 })); gR.add(gFr);
      gBar.position.set(5.0, -1.7, 0); gFr.position.set(5.0, -0.4, 0);
      const labGl = label('', [5.0, 1.2, 0], { color: 'rgba(8,12,24,.82)', size: 12 }, 'refl');
      const labGl0 = label('눈부심', [5.0, -2.25, 0], { color: 'rgba(8,12,24,.7)', size: 12 }, 'refl');
      function arcUpdate(th) {
        if (Math.abs(th - arcTh) < 0.05) return; arcTh = th;
        while (arcG.children.length) { const c = arcG.children.pop(); c.geometry.dispose(); }
        const pts = []; const n = 16; for (let i = 0; i <= n; i++) { const a = (-th + 2 * th * i / n) * D2R; pts.push(new V3(Math.sin(a) * 1.15, Math.cos(a) * 1.15, 0).add(rO)); }
        if (th > 1) arcG.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.03, 6), mat(0xc4501b, { emissive: 0xc4501b, emissiveIntensity: 0.4 })));
      }
      function updRefl(dt, t) {
        const S = lessonS(); if (!S) return; const M = S.mk, rsig = M.th + '|' + M.gl; if (rsig !== rSig) { rSig = rsig; if (rPl.on) { rPl.on = false; plR.pause(); } }
        const th = rPl.on ? rPl.th : M.thD, thT = rPl.on ? Math.round(rPl.th) : M.th, tr = th * D2R;
        const sunP = rO.clone().add(new V3(-Math.sin(tr), Math.cos(tr), 0).multiplyScalar(RR)), eyeP = rO.clone().add(new V3(Math.sin(tr), Math.cos(tr), 0).multiplyScalar(RR));
        sunR.position.copy(sunP); setSeg(hrR, sunP, rO); setSeg(hrR2, rO, eyeP);
        const rdir = new V3().subVectors(eyeP, rO).normalize(), idir = new V3().subVectors(rO, sunP).normalize();
        headR.position.copy(eyeP).addScaledVector(rdir, 0.35); eyeDot.position.copy(eyeP).addScaledVector(rdir, 0.0).add(new V3(0, 0, 0.14));
        eyeDot.position.copy(eyeP).add(new V3(0, 0, 0.2));
        const lensP = eyeP.clone().addScaledVector(rdir, -0.5);
        lensR.position.copy(lensP); lensR.visible = M.gl !== 'n'; lensR.quaternion.setFromUnitVectors(new V3(0, 0, 1), rdir.clone().multiplyScalar(-1));
        // 렌즈 면 안에서의 투과축: 'v'(세로) = 반사면 안의 수직 진동(p), 'h'(가로) = 반사면에 수직(s, z축)
        const pHat = new V3(0, 0, 1).cross(rdir).normalize();
        lensGr.rotation.z = M.gl === 'h' ? Math.PI / 2 : 0; if (M.gl === 'v') lensGr.rotation.z = 0;
        const gs = glareShare(th), aS = Math.sqrt(gs.s), aP = Math.sqrt(gs.p);
        const sHat = new V3(0, 0, 1), q = new V3(Math.cos(tr), Math.sin(tr), 0);
        natDraw(natR, sunP.clone().addScaledVector(idir, 0.5), rO.clone().addScaledVector(idir, -0.05), sHat, q, 0.9, t);
        const endS = M.gl === 'v' ? lensP : eyeP, endP = M.gl === 'h' ? lensP : eyeP;
        ribS.draw(rO.clone().addScaledVector(rdir, 0.05), endS.clone(), sHat, 0.95 * aS, 0.6, t); ribP.draw(rO.clone().addScaledVector(rdir, 0.05), endP.clone(), pHat, 0.95 * aP, 1.7, t);
        ribS.show(M.gl !== 'v' || true); ribP.show(true);
        ribS.line.material.opacity = ribS.mesh.material.opacity = 0.9 * (M.gl === 'v' ? 0.45 : 1) * (aS > 0.05 ? 1 : 0.3) * 0.4 + 0.1;
        arcUpdate(th);
        const gl = glareOf(thT, M.gl), gp = Math.round(gl * 100);
        gBar.scale.y = Math.max(0.03, 2.6 * gl); gBar.position.y = -1.7 + gBar.scale.y / 2; gBar.material.color.setHex(gp <= 10 ? 0x16a05a : 0xe2464b);
        labGl.set('눈부심 ' + gp); labGl.obj = [5.0, -1.7 + gBar.scale.y + 0.35, 0];
        labAng.set('입사각 = 반사각 = ' + thT + '°'); labAng.obj = [0, -1.7 + 1.5, 0];
        labLens.set(M.gl === 'v' ? '선글라스: 세로 투과' : M.gl === 'h' ? '선글라스: 가로 투과' : '');
        labLens.show(M.gl !== 'n');
        const sp = Math.round(gs.s * 100);
        info('<b>반사광</b>은 <b style="color:#ff9a6b">수평 진동 ' + sp + '%</b> · <b style="color:#7fa6ff">수직 진동 ' + (100 - sp) + '%</b> (부분 편광).<br>' + (M.gl === 'n' ? '안경 없이 보면 눈부심 <b>100</b>이에요.' : M.gl === 'v' ? '세로 투과 안경은 수평 진동을 막아 눈부심이 <b>' + gp + '</b>로 줄어요.' : '가로 투과 안경은 수직 진동을 막고 수평 진동만 통과시켜 눈부심이 <b>' + gp + '</b>이에요.'));
      }

      /* ============ ② 맑은 하늘의 빛(산란) ============ */
      const gK = newScene('sky'); CAMS.sky = { dist: PHN ? 19 : 11.5, theta: 0.0, phi: 0.95, min: 6, max: 34, tx: 0.3, ty: 0.5, tz: 0.4 };
      const camP = new V3(0.8, 0, 2.7), sunPos = new V3(-3.4, 0.4, -2.2);
      const us = Math.atan2(sunPos.z - camP.z, sunPos.x - camP.x), sdir = new V3(Math.cos(us), 0, Math.sin(us));
      const ground = new THREE.Mesh(rbox(10.5, 7.2, 0.16, 0.05), MT.stone(0x2c5338, { repeat: 1.2, bump: 0.02 })); ground.rotation.x = Math.PI / 2; ground.position.set(0, -0.14, 0); gK.add(ground);   // 풀밭
      const sunK = new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 24), MT.emissive(0xffcb45, 1.3)); sunK.position.copy(sunPos); gK.add(sunK); ctx.halo(sunK, 0xffd27a, 4.2, 0.6);
      const camBody = new THREE.Mesh(rbox(0.9, 0.6, 0.6, 0.07), MT.plastic(0x232a3a)); camBody.position.copy(camP).add(new V3(0, 0.35, 0)); gK.add(camBody);
      { const tri = MT.metal('aluminium', { brushed: true }); [[0, 0], [2.1, 0], [4.2, 0]].forEach(([a]) => { const lg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.98, 10), tri); lg.position.set(camP.x + Math.cos(a) * 0.2, 0.33, camP.z + Math.sin(a) * 0.2); lg.rotation.set(Math.sin(a) * 0.42, 0, -Math.cos(a) * 0.42); gK.add(lg); }); }
      const camLens = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.4, 28), MT.metal(0x3a4150, { roughness: 0.35 })); gK.add(camLens);
      const molK = new THREE.Mesh(new THREE.SphereGeometry(0.16, 24, 16), MT.emissive(0xffffff, 1.0)); gK.add(molK); ctx.halo(molK, 0xcfe4ff, 1.3, 0.55);
      const sightK = segM(0x9aa6b8, 0.012, 0.8); gK.add(sightK);
      const natK = mkNat(gK), scDom = mkRib(gK, 0xf26b3a, 0.28), scOth = mkRib(gK, 0x2f6bff, 0.22), scPass = mkRib(gK, 0xffffff, 0.3);
      const filK = mkPlate(gK, 1.2, 0x4a74ff);
      const arcK = new THREE.Group(); gK.add(arcK); let arcKg = -99;
      const boardK = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 1.8), new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide })); boardK.position.set(4.0, 1.2, 2.9); boardK.rotation.y = -0.55; gK.add(boardK);
      const boardFr = new THREE.Mesh(rbox(3.0, 2.0, 0.1, 0.04), MT.plastic(0x1c2233)); boardFr.position.copy(boardK.position).add(new V3(0.02, 0, -0.06)); boardFr.rotation.y = -0.55; gK.add(boardFr);
      const cv = document.createElement('canvas'); cv.width = 168; cv.height = 108; const cx2 = cv.getContext('2d'); const tex = new THREE.CanvasTexture(cv); boardK.material.map = tex; let lastKK = -1, kSig = ''; const kPl = { on: false, fa: 0 };
      function paintSky(kk) {
        if (Math.abs(kk - lastKK) < 0.004) return; lastKK = kk;
        const mc = (c, f) => 'rgb(' + c.map((v) => Math.round(Math.min(255, v * f))).join(',') + ')';
        const g = cx2.createLinearGradient(0, 0, 0, 108); g.addColorStop(0, mc([70, 140, 230], kk * 1.05)); g.addColorStop(1, mc([150, 200, 250], kk)); cx2.fillStyle = g; cx2.fillRect(0, 0, 168, 108);
        cx2.fillStyle = 'rgba(255,255,255,.95)'; [[50, 66, 1], [122, 40, 0.8]].forEach(([cx, cy, s]) => [[0, 0, 22], [22, -8, 18], [-22, 4, 16], [10, 8, 20]].forEach(([dx, dy, r]) => { cx2.beginPath(); cx2.arc(cx + dx * s, cy + dy * s, r * s, 0, 6.3); cx2.fill(); }));
        tex.needsUpdate = true;
      }
      const labSunK = label('☀️ 태양', sunK, { color: 'rgba(8,12,24,.78)', size: 12, offset: [0, 0.8, 0] }, 'sky');
      const labMol = label('공기 분자', molK, { color: 'rgba(8,12,24,.78)', size: 12, offset: [0, 0.5, 0] }, 'sky');
      const labCam = label('📷 카메라 + 편광 필터', camBody, { color: 'rgba(8,12,24,.78)', size: 12, offset: [0, 0.85, 0] }, 'sky');
      const labGam = label('', camP, { color: 'rgba(196,80,27,.92)', size: 13, offset: [0, 0.3, 0] }, 'sky');
      const labPhoto = label('', boardK, { color: 'rgba(8,12,24,.82)', size: 12, offset: [0, 1.3, 0] }, 'sky');
      const labSc = label('산란한 빛', molK, { color: 'rgba(8,12,24,.7)', size: 12, offset: [0, -0.5, 0] }, 'sky');
      function updSky(dt, t) {
        const S = lessonS(); if (!S) return; const M = S.mk, gam = +M.dir, ksig = M.dir + '|' + M.fil; if (ksig !== kSig) { kSig = ksig; if (kPl.on) { kPl.on = false; plK.pause(); } }
        const dv = us + gam * D2R, fa = kPl.on ? kPl.fa : M.filD;
        const dirP = new V3(Math.cos(dv), 0, Math.sin(dv)), D0 = 4.4;
        const P = camP.clone().addScaledVector(dirP, D0); P.y = 0.9;
        molK.position.copy(P); camBody.position.copy(camP).add(new V3(0, 0.9, 0));
        const toP = new V3().subVectors(P, camBody.position).normalize();
        camLens.position.copy(camBody.position).addScaledVector(toP, 0.45); camLens.quaternion.setFromUnitVectors(Yax, toP);
        const fp = camBody.position.clone().addScaledVector(toP, 1.0); filK.position.copy(fp); filK.quaternion.setFromUnitVectors(new V3(1, 0, 0), toP);
        // 필터 줄무늬: 투과축 = 세로(y)에서 fa°만큼, 화면(시선에 수직) 면 안에서 회전
        filK.userData.gr.rotation.x = fa * D2R;
        const sunStart = P.clone().addScaledVector(sdir, 4.6);
        const tHat = new V3(0, 1, 0).cross(toP).normalize();      // 시선에 수직인 수평 방향
        natDraw(natK, sunStart, P, new V3(0, 1, 0), new V3().crossVectors(sdir, new V3(0, 1, 0)).normalize(), 0.6, t);
        const p = skyP(gam), Ad = Math.sqrt((1 + p) / 2), Ao = Math.sqrt((1 - p) / 2), A0 = camBody.position.clone().addScaledVector(toP, 0.05);
        scDom.draw(P.clone().sub(toP.clone().multiplyScalar(0)), fp.clone().addScaledVector(toP, -0.05), new V3(0, 1, 0), 0.55 * Ad, 0.4, t);
        scOth.draw(P.clone(), fp.clone().addScaledVector(toP, -0.05), tHat, 0.55 * Ao, 1.3, t);
        // 필터 뒤: 투과축 방향 한 가지 진동
        const ax = new V3(0, Math.cos(fa * D2R), 0).addScaledVector(tHat, Math.sin(fa * D2R)).normalize();
        const bv = skyB(gam, fa);
        scPass.draw(fp.clone().addScaledVector(toP, 0.05), camBody.position.clone().addScaledVector(toP, 0.1), ax, 0.55 * Math.sqrt(bv), 0.7, t);
        setSeg(sightK, camBody.position, camBody.position.clone().add(new V3(sdir.x, 0, sdir.z).multiplyScalar(4.2)));
        // 각도 호
        if (Math.abs(gam - arcKg) > 0.01) {
          arcKg = gam; while (arcK.children.length) { const c = arcK.children.pop(); c.geometry.dispose(); }
          if (gam > 1) { const pts = []; for (let i = 0; i <= 14; i++) { const a = us + gam * D2R * i / 14; pts.push(new V3(Math.cos(a) * 1.5, 0, Math.sin(a) * 1.5)); } arcK.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.03, 6), mat(0xc4501b, { emissive: 0xc4501b, emissiveIntensity: 0.4 }))); }
        }
        arcK.position.copy(camBody.position); arcK.position.y = 0.05;
        labGam.set('태양과 ' + gam + '°'); labGam.obj = [camBody.position.x + Math.cos(us + gam * D2R / 2) * 2.1, 0.2, camBody.position.z + Math.sin(us + gam * D2R / 2) * 2.1];
        paintSky(0.35 + 0.65 * skyB(gam, fa) / 0.875);
        labPhoto.set('📷 사진: 하늘 밝기 ' + Math.round(bv * 100));
        const pc = Math.round(p * 100);
        info('태양과 <b>' + gam + '°</b> 방향 하늘빛: 편광이 <b>' + (pc >= 55 ? '뚜렷해요' : pc >= 20 ? '조금 있어요' : '거의 없어요') + '</b>. 필터 ' + Math.round(fa) + '°로 보면 하늘 밝기 <b>' + Math.round(bv * 100) + '</b> (필터 없음 = 100).<br>구름은 편광되지 않아 필터를 돌려도 그대로예요.');
      }

      /* ============ ③ 디스플레이 조사: 기기 + 편광판 + 광센서 ============ */
      const gV = newScene('survey'); CAMS.survey = { dist: PHN ? 22 : 13.5, theta: 0.45, phi: 1.2, min: 8, max: 40 };
      const DX = -4.8, PX = 0, SX = 4.4;
      const devGrp = {}, devRot = new THREE.Group(); devRot.position.x = DX; gV.add(devRot);
      const screenM = (c) => mat(c, { emissive: c, emissiveIntensity: 0.45, roughness: 0.4 });
      function upArrow(g, x, y) { const a = mkArrow(0x26324a, 0.035); setArrow(a, new V3(x, y - 0.3, 0.55), new V3(x, y + 0.3, 0.55)); g.add(a); }
      { // A 모니터
        const g = new THREE.Group(); const b = boxM(0.2, 1.7, 2.6, 0x26324a); g.add(b); const s = boxM(0.04, 1.5, 2.4, 0x9fd0ff); s.position.x = 0.11; s.material = screenM(0x6fb2ff); g.add(s);
        const st = boxM(0.2, 0.5, 0.2, 0x7b8798); st.position.y = -1.05; g.add(st); const bs = boxM(0.7, 0.08, 1.0, 0x7b8798); bs.position.y = -1.32; g.add(bs); upArrow(g, 0.2, 0.2); g.children[g.children.length - 1].position.x = 0.13 - 0.0; devGrp.A = g;
      }
      { // B 노트북
        const g = new THREE.Group(); const base = boxM(1.3, 0.1, 2.3, 0x9aa6b8); base.position.set(0, -0.8, 0); g.add(base);
        const scr = new THREE.Group(); scr.position.set(-0.55, -0.75, 0); scr.rotation.z = -0.12; g.add(scr);
        const sb = boxM(0.1, 1.45, 2.3, 0x26324a); sb.position.set(0, 0.7, 0); scr.add(sb); const sc = boxM(0.04, 1.3, 2.1, 0x9fd0ff); sc.material = screenM(0x7fb4ee); sc.position.set(0.06, 0.7, 0); scr.add(sc);
        const a = mkArrow(0x26324a, 0.035); setArrow(a, new V3(0.1, 0.5, 0), new V3(0.1, 1.1, 0)); scr.add(a); devGrp.B = g;
      }
      { // C 스마트폰
        const g = new THREE.Group(); const b = boxM(0.14, 2.3, 1.2, 0x26324a); g.add(b); const s = boxM(0.04, 2.1, 1.0, 0xf58aa6); s.material = screenM(0xf58aa6); s.position.x = 0.08; g.add(s); upArrow(g, 0.1, 0); g.children[g.children.length - 1].position.x = -0.42; devGrp.C = g;
      }
      { // D 백열등
        const g = new THREE.Group(); const bl = new THREE.Mesh(new THREE.SphereGeometry(0.7, 36, 24), MT.emissive(0xffdc6a, 1.3, { extra: { roughness: 0.25 } })); g.add(bl); ctx.halo(bl, 0xffd98a, 4.2, 0.5); const nk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.5, 28), MT.metal('brass')); nk.position.y = -0.95; g.add(nk); devGrp.D = g;
      }
      { // E 맑은 하늘
        const g = new THREE.Group(); const b = boxM(0.16, 2.2, 2.2, 0x5d9bf0, { emissive: 0x5d9bf0, emissiveIntensity: 0.35 }); g.add(b);
        const sn = sphereM(0.28, 0xffd34d, { emissive: 0xffb400, emissiveIntensity: 0.9 }); sn.position.set(0.15, 0.6, -0.5); g.add(sn);
        [[0.15, -0.3, 0.3, 0.3], [0.15, -0.45, -0.1, 0.25], [0.15, -0.2, 0.7, 0.22]].forEach(([x, y, z, r]) => { const c = sphereM(r, 0xffffff); c.position.set(x, y, z); c.scale.x = 0.4; g.add(c); }); devGrp.E = g;
      }
      Object.keys(devGrp).forEach((k) => { devGrp[k].visible = false; devRot.add(devGrp[k]); });
      const eArr = mkDbl(gV, 0xffb347, 0.045);
      const polV = mkPlate(gV, 2.8, 0xf26b3a); polV.position.x = PX; const polRing = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.06, 14, 80), MT.plastic(0xf26b3a)); polRing.rotation.y = Math.PI / 2; polRing.position.x = PX; gV.add(polRing);
      const polArrow = mkArrow(0xf26b3a, 0.05); gV.add(polArrow);
      const sensor = boxM(0.9, 1.5, 1.3, 0x3d4658); sensor.position.set(SX + 0.4, 0, 0); gV.add(sensor);
      const sensScr = boxM(0.04, 0.55, 1.0, 0x10151f); sensScr.position.set(SX - 0.07, 0.3, 0); gV.add(sensScr);
      const sensLed = sphereM(0.07, 0xffd34d, { emissive: 0xffd34d, emissiveIntensity: 1 }); sensLed.position.set(SX - 0.07, -0.35, 0.3); gV.add(sensLed);
      const natV = mkNat(gV), ribPol = mkRib(gV, 0xffb347, 0.3), ribOut = mkRib(gV, 0xffb347, 0.3);
      const beam1 = segM(0xfff3b0, 0.4, 0.1), beam2 = segM(0xfff3b0, 0.4, 0.1); gV.add(beam1, beam2);
      const labDev = label('', devRot, { color: 'rgba(8,12,24,.8)', size: 13, offset: [0, -1.95, 0] }, 'survey');
      const labPolV = label('', polRing, { color: 'rgba(8,12,24,.8)', size: 13, offset: [0, 1.95, 0] }, 'survey');
      const labSens = label('광센서', sensor, { color: 'rgba(8,12,24,.78)', size: 12, offset: [0, 1.2, 0] }, 'survey');
      const labVal = label('', sensScr, { color: 'rgba(16,21,31,.92)', size: 14, offset: [0, 0.0, 0] }, 'survey'); labVal.el.style.color = '#7dff9b';
      const labEv = label('', [DX + 1.2, 1.7, 0], { color: 'rgba(8,12,24,.7)', size: 12 }, 'survey');
      const svPl = { on: false, ang: 0 };
      let svSig = '';
      function updSurvey(dt, t) {
        const S = lessonS(); if (!S) return; const V = S.sv; const DV = window.__sim.DEVS.find((x) => x.id === V.dev);
        const sig = V.dev + '|' + V.lying + '|' + Math.round(V.ang); if (sig !== svSig) { svSig = sig; if (svPl.on) { svPl.on = false; plSv.pause(); } }
        const ang = svPl.on ? svPl.ang : V.angD, lying = V.lying && DV.id !== 'D' && DV.id !== 'E';
        Object.keys(devGrp).forEach((k) => (devGrp[k].visible = k === DV.id)); devRot.rotation.x = lying ? Math.PI / 2 : 0;
                const val = window.__sim.sensorAt(DV, V.lying, ang), da = (DV.max === DV.min) ? 0 : (DV.ang + (V.lying ? 90 : 0)) % 180;
        const diff = (DV.max - DV.min) / 100, nat = DV.min / 100;
        const A = new V3(DX + 1.5, 0, 0), B = new V3(PX - 0.25, 0, 0), B2 = new V3(PX + 0.25, 0, 0), C = new V3(SX - 0.3, 0, 0);
        natDraw(natV, A, B, new V3(0, 1, 0), new V3(0, 0, 1), Math.sqrt(Math.max(0.0001, nat)) * 1.1, t);
        natV.forEach((r) => r.show(nat > 0.04));
        ribPol.draw(A, B, dirv(da), 1.05 * Math.sqrt(diff), 0.5, t); ribPol.show(diff > 0.03);
        ribOut.draw(B2, C, dirv(ang), 1.05 * Math.sqrt(Math.max(0.0004, val / 100)), 0.5, t);
        setSeg(beam1, A, B); setSeg(beam2, B2, C); beam1.material.opacity = 0.05 + 0.1 * (nat + diff * 0.5); beam2.material.opacity = 0.04 + 0.16 * val / 100;
        polV.userData.gr.rotation.x = ang * D2R; polV.visible = true;
        const u = dirv(ang); setArrow(polArrow, u.clone().multiplyScalar(-1.5).add(new V3(PX, 0, 0)), u.clone().multiplyScalar(1.5).add(new V3(PX, 0, 0)));
        setDbl(eArr, new V3(DX + 0.3, 1.9, 0), dirv(da), diff > 0.03 ? 0.6 : 0); eArr.visible = diff > 0.03;
        labDev.set(DV.name + (lying ? ' (눕힘)' : '')); labPolV.set('편광판 ' + Math.round(ang) + '°');
        labVal.set(Math.round(val) + '%');
        labEv.set(diff > 0.03 ? '진동 방향 ' + Math.round(da) + '° ↕' : (nat > 0 ? '모든 방향' : ''));
        labEv.show(true); labEv.obj = [DX + 0.3, 2.45, 0];
        info('<b>' + DV.name + '</b>의 빛을 편광판으로 거른 뒤 광센서로 재요. ' + (diff > 0.5 ? '편광판을 돌리면 센서 값이 <b>크게 변해요</b> → 편광된 빛이에요.' : diff > 0.05 ? '편광판을 돌리면 센서 값이 <b>조금 변해요</b> → 일부만 편광됐어요.' : '편광판을 돌려도 센서 값이 <b>그대로</b>예요 → 편광되지 않은 빛이에요.') + '<br>센서 투과량 <b>' + Math.round(val) + '%</b>');
      }

      /* ============ ④-1 LCD 한 픽셀 ============ */
      const gL = newScene('lcd'); CAMS.lcd = { dist: PHN ? 24 : 15, theta: 0.55, phi: 1.2, min: 8, max: 40 };
      const lx = { B: -5.4, P1: -3.7, L0: -2.4, L1: 1.4, P2: 3.0, Px: 5.2 };
      const back = boxM(0.3, 3.2, 3.2, 0xfff6c8, { emissive: 0xffe27a, emissiveIntensity: 0.6 }); back.position.x = lx.B; gL.add(back);
      const p1 = mkPlate(gL, 3.2, 0x2f6bff); p1.position.x = lx.P1; p1.userData.gr.rotation.x = 0;
      const p2 = mkPlate(gL, 3.2, 0x2f6bff); p2.position.x = lx.P2; p2.userData.gr.rotation.x = Math.PI / 2;
      const lcBox = new THREE.Mesh(new THREE.BoxGeometry(lx.L1 - lx.L0, 3.2, 3.2), basic(0x7fd3c0, { transparent: true, opacity: 0.1, depthWrite: false })); lcBox.position.x = (lx.L0 + lx.L1) / 2; gL.add(lcBox);
      const lcEdge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(lx.L1 - lx.L0, 3.2, 3.2)), new THREE.LineBasicMaterial({ color: 0x46968a })); lcEdge.position.copy(lcBox.position); gL.add(lcEdge);
      [lx.L0, lx.L1].forEach((x) => { const e = new THREE.Mesh(new THREE.BoxGeometry(0.05, 3.2, 3.2), MT.glass({ tint: 0xc8d0de, opacity: 0.3 })); e.position.x = x; gL.add(e); });
      const NJ = 7, rods = [];
      for (let j = 0; j < NJ; j++) for (let yy = -1; yy <= 1; yy++) for (let zz = -1; zz <= 1; zz++) {
        const m = new THREE.Mesh(new THREE.CapsuleGeometry ? new THREE.CapsuleGeometry(0.09, 0.62, 6, 14) : new THREE.CylinderGeometry(0.09, 0.09, 0.8, 14), mat(0x2a9d8f, { roughness: 0.3, metalness: 0 })); m.position.set(lx.L0 + (lx.L1 - lx.L0) * (j + 0.5) / NJ, yy * 1.0, zz * 1.0); gL.add(m); rods.push({ m, j });
      }
      const pxBox = boxM(0.3, 2.6, 2.4, 0x26324a); pxBox.position.x = lx.Px; gL.add(pxBox);
      const subs = [0xff5a4d, 0x2fd66b, 0x4a7dff].map((c, i) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.2, 0.62), basic(c)); m.position.set(lx.Px - 0.18, 0, (i - 1) * 0.72); gL.add(m); return m; });
      const natL = mkNat(gL), ribL1 = mkRib(gL, 0xffb347, 0.3), ribL2 = mkRib(gL, 0xffb347, 0.3);
      const eDbl = [0, 1, 2, 3, 4].map(() => mkDbl(gL, 0xf26b3a, 0.035));
      const lbl = (t, x, y, sc) => label(t, [x, y, 0], { color: 'rgba(8,12,24,.78)', size: 12 }, 'lcd');
      lbl('백라이트 (편광 아님)', lx.B, -2.15); lbl('아래 편광판 · 세로 투과', lx.P1, 2.15); lbl('위 편광판 · 가로 투과', lx.P2, 2.15); lbl('액정층', (lx.L0 + lx.L1) / 2, 2.15);
      const labTw = label('', [(lx.L0 + lx.L1) / 2, -2.15, 0], { color: 'rgba(8,12,24,.82)', size: 12 }, 'lcd');
      const labPx = label('', [lx.Px, 1.75, 0], { color: 'rgba(8,12,24,.85)', size: 13 }, 'lcd');
      label('전극 (+ 전압)', lx.L0, -1.9, 'lcd');
      const lcdPl = { on: false, V: 0 }; let lcdSig = '';
      function updLCD(dt, t) {
        const S = lessonS(); if (!S) return; const E = S.te, sig = E.V.toFixed(2); if (sig !== lcdSig) { lcdSig = sig; if (lcdPl.on) { lcdPl.on = false; plLcd.pause(); } }
        const V = lcdPl.on ? lcdPl.V : E.VD, tw = window.__sim.twistOf(V), Bv = window.__sim.lcdB(V), lev = window.__sim.lcdLevel(V);
        rods.forEach((r) => { const a = tw * r.j / (NJ - 1) * D2R; r.m.quaternion.setFromUnitVectors(Yax, dirv(tw * r.j / (NJ - 1))); });
        const Pa = new V3(lx.B + 0.3, 0, 0), Pb = new V3(lx.P1 - 0.1, 0, 0), Pc = new V3(lx.P1 + 0.1, 0, 0), Pd = new V3(lx.P2 - 0.1, 0, 0), Pe = new V3(lx.P2 + 0.1, 0, 0), Pf = new V3(lx.Px - 0.3, 0, 0);
        natDraw(natL, Pa, Pb, new V3(0, 1, 0), new V3(0, 0, 1), 1.0, t);
        const xl = (u) => Pc.x + (Pd.x - Pc.x) * u, f = (x) => Math.min(1, Math.max(0, (x - lx.L0) / (lx.L1 - lx.L0)));
        ribL1.draw(Pc, Pd, null, 1, 0.3, t, (u) => tw * f(xl(u)), () => 1.0);
        ribL2.draw(Pe, Pf, dirv(90), 1.0 * Math.sqrt(Bv), 0.3, t); ribL2.line.material.opacity = Bv < 0.02 ? 0.2 : 0.95;
        eDbl.forEach((e, i) => { const x = lx.L0 + (lx.L1 - lx.L0) * (i + 0.5) / 5; setDbl(e, new V3(x, 1.95, 0), dirv(tw * f(x)), 0.34); });
        subs.forEach((m, i) => { const c = [0xff5a4d, 0x2fd66b, 0x4a7dff][i], base = 0x1a1f2b; m.material.color.setHex(base).lerp(new THREE.Color(c), 0.12 + 0.88 * Bv); });
        labTw.set('비틂 ' + Math.round(tw) + '° · ' + (E.V < 0.05 ? '전압 꺼짐' : E.V >= 4.95 ? '전압 최대' : '전압 ' + E.V.toFixed(2) + ' V')); labPx.set('픽셀 밝기 ' + lev + ' / 255');
        info(E.V < 0.05 ? '전압이 꺼지면 액정이 <b>90° 비틀려</b> 있어요. 빛의 진동 방향도 따라 돌아 위 편광판을 통과해 <b>밝아요</b>.' : E.V >= 4.95 ? '전압이 최대면 액정이 <b>똑바로 서서</b> 진동 방향을 돌리지 못해요. 위 편광판에 막혀 <b>어두워요</b>.' : '전압 <b>' + E.V.toFixed(2) + ' V</b>: 비틂 <b>' + Math.round(tw) + '°</b>. 위 편광판을 지나는 양이 줄어 밝기 <b>' + lev + '</b>이에요.');
      }

      /* ============ ④-2 3D 극장 ============ */
      const gC = newScene('cine'); CAMS.cine = { dist: PHN ? 23 : 15, theta: 0.5, phi: 1.15, min: 8, max: 40 };
      const cyL = 1.7, cyR = -1.7, cxP = -5.4, cxS = -0.6, cxG = 2.6, cxE = 5.6;
      [[cyL, 0xe2464b, '왼눈 영상', 0], [cyR, 0x1f6fe0, '오른눈 영상', 90]].forEach(([y, col, name, ax]) => {
        const body = boxM(1.0, 0.8, 1.0, 0x3d4658); body.position.set(cxP, y, 0); gC.add(body);
        const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.3, 28), mat(col, { emissive: col, emissiveIntensity: 0.75, roughness: 0.2 })); lens.rotation.z = Math.PI / 2; lens.position.set(cxP + 0.65, y, 0); gC.add(lens);
        const pp = mkPlate(gC, 1.5, col); pp.position.set(cxP + 1.2, y, 0); pp.userData.gr.rotation.x = ax * D2R;
        label(name + ' · ' + (ax === 0 ? '세로(↕) 편광' : '가로(↔) 편광'), [cxP + 0.6, y + 1.05, 0], { color: 'rgba(8,12,24,.78)', size: 12 }, 'cine');
      });
      const screenC = new THREE.Mesh(new THREE.BoxGeometry(0.12, 6.0, 3.6), MT.fabric(0xf5f7fb)); screenC.position.set(cxS, 0, 0); gC.add(screenC); label('스크린', [cxS, -3.3, 0], { color: 'rgba(8,12,24,.78)', size: 12 }, 'cine');
      const spotR = sphereM(0.22, 0xe2464b, { emissive: 0xe2464b, emissiveIntensity: 0.8 }); spotR.position.set(cxS + 0.2, 0.35, 0); gC.add(spotR);
      const spotB = sphereM(0.22, 0x3b82f6, { emissive: 0x3b82f6, emissiveIntensity: 0.8 }); spotB.position.set(cxS + 0.2, -0.35, 0); gC.add(spotB);
      const lensC = [cyL, cyR].map((y) => { const pl = mkPlate(gC, 1.6, 0x3d4658); pl.position.set(cxG, y, 0); const dash = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.02, 6, 40), basic(0x9aa6b8)); dash.rotation.y = Math.PI / 2; dash.position.set(cxG, y, 0); gC.add(dash); return { pl, dash }; });
      const labLn = [label('', [cxG, cyL + 1.15, 0], { color: 'rgba(8,12,24,.8)', size: 12 }, 'cine'), label('', [cxG, cyR + 1.15, 0], { color: 'rgba(8,12,24,.8)', size: 12 }, 'cine')];
      const projRay = [cyL, cyR].map((y, i) => { const m = segM(i ? 0x1f6fe0 : 0xe2464b, 0.06, 0.85); gC.add(m); setSeg(m, new V3(cxP + 1.4, y, 0), new V3(cxS - 0.05, i ? -0.35 : 0.35, 0)); return m; });
      const toLens = [], afterLens = [];
      [0, 1].forEach((i) => [0, 1].forEach((j) => {
        const col = j ? 0x3b82f6 : 0xe2464b, y = i ? cyR : cyL, off = (j ? -1 : 1) * 0.12;
        const a = segM(col, 0.04, 0.8), b = segM(col, 0.05, 0.9); gC.add(a, b);
        setSeg(a, new V3(cxS + 0.1, j ? -0.35 : 0.35, 0), new V3(cxG - 0.15, y + off, 0)); toLens.push(a);
        setSeg(b, new V3(cxG + 0.15, y + off, 0), new V3(cxE - 0.75, y + off, 0)); afterLens.push({ b, i, j });
      }));
      const eyeBoxes = [cyL, cyR].map((y, i) => {
        const b = boxM(0.12, 1.5, 1.8, 0x10151f); b.position.set(cxE, y, 0); gC.add(b);
        const r = sphereM(0.3, 0xe2464b, { emissive: 0xe2464b, emissiveIntensity: 0.6 }), bl = sphereM(0.3, 0x3b82f6, { emissive: 0x3b82f6, emissiveIntensity: 0.6 });
        r.position.set(cxE - 0.2, y, -0.4); bl.position.set(cxE - 0.2, y, 0.4); gC.add(r, bl);
        const lab = label('', [cxE, y - 1.2, 0], { color: 'rgba(8,12,24,.82)', size: 12 }, 'cine');
        label(i ? '오른눈에 보이는 장면' : '왼눈에 보이는 장면', [cxE, y + 1.1, 0], { color: 'rgba(8,12,24,.78)', size: 12 }, 'cine');
        return { r, bl, lab };
      });
      let cSig = ''; const cPl = { on: false, ci: { on: false, axL: 0, axR: 0 } };
      const labOK = label('✨ 두 눈의 영상 차이로 뇌가 입체감을 느껴요', [0.5, 3.5, 0], { color: 'rgba(28,122,74,.92)', size: 13 }, 'cine');
      function updCine(dt, t) {
        const S = lessonS(); if (!S) return; const ci0 = S.te.ci, csig = ci0.on + '|' + ci0.axL + '|' + ci0.axR; if (csig !== cSig) { cSig = csig; if (cPl.on) { cPl.on = false; plC.pause(); } }
        const ci = cPl.on ? cPl.ci : ci0, tr = (ax, pol) => Math.pow(Math.cos((ax - pol) * D2R), 2);
        const T = [[ci.on ? tr(ci.axL, 0) : 1, ci.on ? tr(ci.axL, 90) : 1], [ci.on ? tr(ci.axR, 0) : 1, ci.on ? tr(ci.axR, 90) : 1]];
        lensC.forEach((l, i) => { l.pl.visible = ci.on; l.dash.visible = !ci.on; if (ci.on) l.pl.userData.gr.rotation.x = (i ? ci.axR : ci.axL) * D2R; labLn[i].set(ci.on ? (i ? '오른쪽 렌즈 ' : '왼쪽 렌즈 ') + ((i ? ci.axR : ci.axL) === 0 ? '↕' : '↔') : '(안경 없음)'); });
        afterLens.forEach(({ b, i, j }) => { const a = T[i][j]; b.visible = a > 0.01; b.material.opacity = 0.9 * a; });
        eyeBoxes.forEach((e, i) => {
          const sL = T[i][0] > 0.9 && T[i][1] < 0.1, sR = T[i][1] > 0.9 && T[i][0] < 0.1, none = T[i][0] < 0.1 && T[i][1] < 0.1, want = i === 0 ? sL : sR;
          e.r.visible = T[i][0] > 0.01; e.bl.visible = T[i][1] > 0.01; e.r.scale.setScalar(0.4 + 0.6 * T[i][0]); e.bl.scale.setScalar(0.4 + 0.6 * T[i][1]);
          e.lab.set(want ? '✅ 내 눈 영상만 보여요' : none ? '❌ 아무것도 안 보여요' : sL || sR ? '❌ 반대쪽 영상만 보여요' : '❌ 두 영상이 겹쳐요'); e.lab.el.style.background = want ? 'rgba(28,122,74,.9)' : 'rgba(150,40,50,.88)';
        });
        const ok = ci.on && ci.axL === 0 && ci.axR === 90; labOK.show(ok);
        info('3D 영화는 왼눈용(↕)·오른눈용(↔) 영상을 <b>직교한 편광</b>으로 겹쳐 투사해요. 렌즈는 <b>같은 방향</b> 편광만 통과시켜요.' + (ci.on ? '' : '<br>안경이 없으면 두 영상이 겹쳐 흐릿해요.'));
      }

      /* ============ ④-3 광통신: 편광 다중화 ============ */
      const gF = newScene('fiber'); CAMS.fiber = { dist: PHN ? 21 : 12.5, theta: 0.4, phi: 1.2, min: 8, max: 40 };
      const FA = [new V3(-4.4, 1.7, 0), new V3(-2.4, 0, 0), new V3(2.4, 0, 0), new V3(4.4, 1.7, 0)], FB = FA.map((p) => new V3(p.x, -p.y, 0));
      [FA, FB].forEach((P, k) => { const g = new THREE.CatmullRomCurve3(P, false, 'catmullrom', 0.0); for (let i = 0; i < 3; i++) gF.add(tubeG(P[i], P[i + 1], 0.2, MT.glass({ tint: 0xc7d0e0, opacity: 0.3 }))); });
      const trunk = tubeG(FA[1], FA[2], 0.26, MT.glass({ tint: 0xdde4f2, opacity: 0.34 })); gF.add(trunk);
      [[FA[0], 0xf26b3a, '레이저 ①', 0], [FB[0], 0x2f6bff, '레이저 ②', 90]].forEach(([p, col, name, ang]) => {
        const b = boxM(1.2, 0.9, 1.0, 0x3d4658); b.position.copy(p).add(new V3(-0.8, 0, 0)); gF.add(b); const d = mkDbl(gF, col, 0.04); setDbl(d, p.clone().add(new V3(-0.8, p.y > 0 ? 1.0 : -1.0, 0)), dirv(ang), 0.45);
        label(name, b, { color: 'rgba(8,12,24,.8)', size: 12, offset: [0, p.y > 0 ? 0.0 : 0.0, 0.0] }, 'fiber');
        label(ang === 0 ? '세로(↕) 편광' : '가로(↔) 편광', [p.x - 0.8, p.y + (p.y > 0 ? 1.5 : -1.5), 0], { color: 'rgba(8,12,24,.7)', size: 11 }, 'fiber');
      });
      const rxL = [FA[3], FB[3]].map((p, i) => { const b = boxM(1.2, 0.9, 1.0, 0x3d4658); b.position.copy(p).add(new V3(0.8, 0, 0)); gF.add(b); const lab = label('', [p.x + 0.8, p.y + (p.y > 0 ? 0.85 : -0.85), 0], { color: 'rgba(8,12,24,.85)', size: 12 }, 'fiber'); lab.el.style.color = i ? '#9fbcff' : '#ffb089'; label(i ? '수신기 ②' : '수신기 ①', b, { color: 'rgba(8,12,24,.8)', size: 12 }, 'fiber'); return lab; });
      label('합치기', [-2.4, 0.9, 0], { color: 'rgba(8,12,24,.7)', size: 11 }, 'fiber'); label('한 가닥의 광섬유', [0, 0.8, 0], { color: 'rgba(8,12,24,.85)', size: 12 }, 'fiber'); label('편광으로 나누기', [2.4, 0.9, 0], { color: 'rgba(8,12,24,.7)', size: 11 }, 'fiber');
      const BITS = ['10110010111001010110', '01101001000111011001'], GAP = 0.9, NPUL = 18;
      const fibs = [FA, FB].map((P, k) => {
        const segs = [], tot = P.reduce((s, p, i) => (i ? s + p.distanceTo(P[i - 1]) : 0), 0);
        const im = new THREE.InstancedMesh(new THREE.SphereGeometry(0.17, 14, 10), basic(0xffffff), NPUL); im.frustumCulled = false; gF.add(im);
        return { P, tot, im };
      });
      const colF = [new THREE.Color(0xf26b3a), new THREE.Color(0x2f6bff)], dimC = new THREE.Color(0x3a4258), M4 = new THREE.Matrix4();
      function pointAt(P, s) { let rem = s; for (let i = 0; i < P.length - 1; i++) { const l = P[i].distanceTo(P[i + 1]); if (rem <= l) return P[i].clone().lerp(P[i + 1], rem / l); rem -= l; } return null; }
      function updFiber(dt, t) {
        const tt = t * 2.4, n0 = Math.floor(tt / GAP);
        fibs.forEach((f, k) => {
          for (let i = 0; i < NPUL; i++) {
            const n = n0 - i, s = tt - n * GAP, p = s >= 0 && s <= f.tot ? pointAt(f.P, s) : null;
            if (!p) { M4.makeScale(0, 0, 0); f.im.setMatrixAt(i, M4); continue; }
            const bit = BITS[k][((n % 20) + 20) % 20] === '1';
            M4.makeScale(bit ? 1 : 0.4, bit ? 1 : 0.4, bit ? 1 : 0.4); M4.setPosition(p); f.im.setMatrixAt(i, M4); f.im.setColorAt(i, bit ? colF[k] : dimC);
          }
          f.im.instanceMatrix.needsUpdate = true; if (f.im.instanceColor) f.im.instanceColor.needsUpdate = true;
          const nArr = Math.floor((tt - f.tot) / GAP); let str = ''; for (let i = 7; i >= 0; i--) str += BITS[k][(((nArr - i) % 20) + 20) % 20];
          rxL[k].set(str.split('').join(' '));
        });
        info('서로 <b>직교한 두 편광</b>은 한 광섬유 속에서도 섞이지 않아요. 각각 다른 신호(켜짐 <b>1</b> · 꺼짐 <b>0</b>)를 실으면 전송량이 <b>2배</b>가 돼요.');
      }

      /* ---------- 2D 실험의 값을 그대로 따라가요 (값은 왼쪽 조작판에서 바꿔요) ---------- */
      let built = false, plUser = false, lastSig = '';
      const pl = mkPlayer('pol', { duration: 8, loop: true, autoplay: false, label: '편광판 돌리기', phases: [[0, '투과축 0° (나란히)'], [0.25, '45°'], [0.5, '90° (직교)'], [0.75, '135°']], onFrame(p) { if (!built) return; plUser = true; st.ang = p * 180; layout(); } });
      built = true;
      layout();
      const plR = mkPlayer('refl', { duration: 8, loop: true, autoplay: false, label: '입사각 바꾸기', phases: [[0, '입사각 0° (수직)'], [0.3, '30°'], [0.65, '53° (가장 뚜렷)'], [0.9, '80°']], onFrame(p) { if (!built) return; rPl.on = true; rPl.th = p * 80; } });
      const plK = mkPlayer('sky', { duration: 8, loop: true, autoplay: false, label: '필터 돌리기', phases: [[0, '필터 0° (세로)'], [0.5, '90° (가로)']], onFrame(p) { if (!built) return; kPl.on = true; kPl.fa = p * 180; } });
      const plSv = mkPlayer('survey', { duration: 9, loop: true, autoplay: false, label: '편광판 돌리기', phases: [[0, '0°'], [0.25, '45°'], [0.5, '90°'], [0.75, '135°']], onFrame(p) { if (!built) return; svPl.on = true; svPl.ang = p * 180; } });
      const plLcd = mkPlayer('lcd', { duration: 8, loop: true, autoplay: false, label: '전압 올리기', phases: [[0, '전압 0 V (밝음)'], [0.5, '2.5 V'], [0.99, '5 V (어두움)']], onFrame(p) { if (!built) return; lcdPl.on = true; lcdPl.V = p * 5; } });
      const plC = mkPlayer('cine', { duration: 9, loop: true, autoplay: false, label: '안경 바꾸기', phases: [[0, '안경 없음'], [0.34, '두 렌즈 ↕ (틀림)'], [0.67, '왼 ↕ · 오른 ↔ (맞음)']], onFrame(p) { if (!built) return; cPl.on = true; cPl.ci = p < 0.34 ? { on: false, axL: 0, axR: 0 } : p < 0.67 ? { on: true, axL: 0, axR: 0 } : { on: true, axL: 0, axR: 90 }; } });
      setScene(sceneKey());
      const updMap = { refl: updRefl, sky: updSky, survey: updSurvey, lcd: updLCD, cine: updCine, fiber: updFiber };
      return {
        update(dt, t) {
          { const k = sceneKey(); if (k !== K.cur) setScene(k); if (k !== 'pol') { updMap[k](dt, t); return; } }
          { const S = lessonS(); if (S && S.pol) { const sig = S.mode + '|' + S.pol.n + '|' + S.pol.ang; if (sig !== lastSig) { lastSig = sig; if (plUser) { plUser = false; pl.pause(); } if (S.mode === 'pol' || true) { st.n = S.pol.n; st.ang = S.pol.ang; layout(); } } } }
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
        sync() { lastSig = ''; },
      };
    },
  });
})();
