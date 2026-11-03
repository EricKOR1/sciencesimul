/* hr-practical-cell · 3D 실용 전지의 구조 (2D '구조 비교'의 세 전지 + '전지 분류'의 방전 · 충전)
   2D에서 고른 전지(망가니즈 건전지 · 납 축전지 · 리튬 이온 전지)와 방전/충전을 그대로 따라가요.
   '전지 분류' 단계에서는 학생이 2D에서 전자 방향을 고르기 전까지 전자의 흐름을 멈춰 두고, ▶ 재생을 누르면 방전 ↔ 충전을 번갈아 보여 줘요.
   ① 망가니즈 건전지(1차 전지): 아연 통(−극) · 전해질 풀 · MnO₂+탄소(+극 물질) · 탄소 막대(+극 단자). 반쪽을 잘라 단면을 보여 줘요.
   ② 리튬 이온 전지(2차 전지): 흑연(−) | 분리막 | 리튬 코발트 산화물(+). 방전·충전할 때 Li⁺와 전자의 이동 방향이 반대로 바뀌어요.
   크기와 입자 수는 모형 스케치예요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);

  window.SciSim3D.attach({
    title: '실용 전지의 구조 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: PHONE ? 17 : 12.5, theta: 0.35, phi: 1.2, min: 6, max: 26, target: [0, 0.6, 0] },
    autoRotate: 0.07,
    levels: [3],   // 4단계 '전지 분류'. 1·2·3단계는 카드 · 색칠 · 기록이 2D 화면에서 필요해요
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const V3 = THREE.Vector3;
      const mat = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.45, metalness: 0.05 }, o || {}));
      const A = new THREE.Group(), B = new THREE.Group(), C = new THREE.Group(); root.add(A, B, C);
      let kind = 'mn', mode = 'dis', showLab = true;
      const M = new THREE.Matrix4(), hide = (m, i) => { M.makeScale(0.0001, 0.0001, 0.0001); m.setMatrixAt(i, M); };
      const hideLab = [];

      /* ---------- ① 망가니즈 건전지 단면 ---------- */
      const H = 5, Y0 = -2.6;
      const layers = [[1.6, 1.7, 0xb6bfcc, '아연 통 (−극)', -1.0], [1.5, 1.6, 0xf1f5f9, '분리막', 0], [1.2, 1.5, 0xe9d8a6, '전해질 풀 NH₄Cl', 0.9], [0.36, 1.2, 0x6b5f57, 'MnO₂ + 탄소 가루', 0.5], [0, 0.36, 0x9aa3b5, '탄소 막대 (+극)', 0]];
      layers.forEach(([ri, ro, col, name]) => {
        const half = (r, open) => new THREE.Mesh(new THREE.CylinderGeometry(r, r, H, 48, 1, open, Math.PI / 2, Math.PI), mat(col, { side: THREE.DoubleSide, metalness: col === 0xb6bfcc ? 0.8 : 0.05, roughness: col === 0xb6bfcc ? 0.3 : 0.7 }));
        const o = half(ro, true), i = ri > 0 ? half(ri, true) : null; o.position.y = Y0 + H / 2; A.add(o); if (i) { i.position.y = Y0 + H / 2; A.add(i); }
        // 단면(앞쪽 평면): 오른쪽 · 왼쪽 띠
        [1, -1].forEach((s) => { const w = ro - ri; const p = new THREE.Mesh(new THREE.PlaneGeometry(w, H), mat(col, { roughness: 0.8, side: THREE.DoubleSide })); p.position.set(s * (ri + w / 2), Y0 + H / 2, 0.0); A.add(p); });
        // 위·아래 덮개 (반원 고리)
        [Y0, Y0 + H].forEach((y) => { const c = new THREE.Mesh(new THREE.RingGeometry(ri, ro, 48, 1, Math.PI, Math.PI), mat(col, { side: THREE.DoubleSide })); c.rotation.x = -Math.PI / 2; c.rotation.z = 0; c.position.y = y; A.add(c); });
      });
      const capT = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.42, 32), mat(0xe8c15a, { metalness: 0.85, roughness: 0.28 })); capT.position.y = Y0 + H + 0.18; A.add(capT);
      const capB = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.35, 0.16, 40), mat(0xc4ccd8, { metalness: 0.85, roughness: 0.3 })); capB.position.y = Y0 - 0.08; A.add(capB);
      // 외부 회로 + 전구
      const WX = 3.7, WTop = Y0 + H + 1.6, WBot = Y0 - 0.9;
      const wpts = [new V3(0, Y0 + H + 0.4, 0), new V3(0, WTop, 0), new V3(WX, WTop, 0), new V3(WX, WBot, 0), new V3(0, WBot, 0), new V3(0, Y0 - 0.16, 0)];
      const wcur = new THREE.CatmullRomCurve3(wpts, false, 'catmullrom', 0.02);
      const wire = new THREE.Mesh(new THREE.TubeGeometry(wcur, 80, 0.06, 10, false), mat(0xd18a3a, { metalness: 0.7, roughness: 0.35 })); A.add(wire);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.55, 28, 22), mat(0xfff3c4, { transparent: true, opacity: 0.85, emissive: 0xffc83d, emissiveIntensity: 0.9, roughness: 0.2 })); bulb.position.set(WX, (WTop + WBot) / 2, 0); A.add(bulb);
      const bl = new THREE.PointLight(0xffc83d, 0.8, 6); bl.position.copy(bulb.position); A.add(bl);
      const NE = 10, em = new THREE.InstancedMesh(new THREE.SphereGeometry(0.13, 12, 10), mat(0x42e8ff, { emissive: 0x00a9c0, emissiveIntensity: 0.9 }), NE); em.frustumCulled = false; A.add(em);
      const labsA = [
        label('+극 (탄소 막대)', capT, { color: 'rgba(220,38,38,.92)', offset: [0, 0.7, 0] }), label('아연 통 (−극)', [-1.7, Y0 + 1.2, 0], { color: 'rgba(37,99,235,.92)' }),
        label('전해질 풀', [1.35, Y0 + 3.9, 0.0], { color: 'rgba(30,41,59,.9)' }), label('MnO₂ + 탄소', [0.8, Y0 + 2.1, 0.0], { color: 'rgba(30,41,59,.9)' }),
      ];

      /* ---------- ② 리튬 이온 전지 ---------- */
      const SX = 2.6, SH = 4.2, SZ = 3.0;
      const slab = (x, col, n) => {
        const g = new THREE.Group(); g.position.x = x;
        for (let i = 0; i < n; i++) { const p = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.2, SZ), mat(col, { metalness: 0.2, roughness: 0.5 })); p.position.y = -SH / 2 + 0.35 + i * (SH - 0.7) / (n - 1); g.add(p); }
        const foil = new THREE.Mesh(new THREE.BoxGeometry(0.1, SH, SZ), mat(x < 0 ? 0xd9824c : 0xcbd5e1, { metalness: 0.85, roughness: 0.3 })); foil.position.x = (x < 0 ? -1 : 1) * 0.95; g.add(foil);
        return g;
      };
      const anode = slab(-SX, 0x78839a, 9), cathode = slab(SX, 0x4f7cff, 9); B.add(anode, cathode);
      const sep = new THREE.Mesh(new THREE.BoxGeometry(0.1, SH, SZ), mat(0xf1f5f9, { transparent: true, opacity: 0.55, depthWrite: false })); B.add(sep);
      const liq = new THREE.Mesh(new THREE.BoxGeometry(SX * 2 + 1.7, SH, SZ), mat(0xffe9a8, { transparent: true, opacity: 0.1, depthWrite: false })); B.add(liq);
      const ctop = SH / 2 + 1.3;
      const wB = new THREE.CatmullRomCurve3([new V3(-SX - 0.95, SH / 2, 0), new V3(-SX - 0.95, ctop, 0), new V3(-1.0, ctop, 0), new V3(1.0, ctop, 0), new V3(SX + 0.95, ctop, 0), new V3(SX + 0.95, SH / 2, 0)], false, 'catmullrom', 0.02);
      B.add(new THREE.Mesh(new THREE.TubeGeometry(wB, 80, 0.06, 10, false), mat(0xd18a3a, { metalness: 0.7, roughness: 0.35 })));
      const dev = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.7, 0.8), mat(0x64748b, { metalness: 0.3 })); dev.position.set(0, ctop, 0); B.add(dev);
      const devL = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), mat(0xffc83d, { emissive: 0xffc83d, emissiveIntensity: 0.9 })); devL.position.set(0, ctop + 0.45, 0); B.add(devL);
      const NL = 16, lm = new THREE.InstancedMesh(new THREE.SphereGeometry(0.17, 18, 14), mat(0xc084fc, { emissive: 0x7c3aed, emissiveIntensity: 0.45, roughness: 0.3 }), NL); lm.frustumCulled = false; B.add(lm);
      const eB = new THREE.InstancedMesh(new THREE.SphereGeometry(0.13, 12, 10), mat(0x42e8ff, { emissive: 0x00a9c0, emissiveIntensity: 0.9 }), NE); eB.frustumCulled = false; B.add(eB);
      const LP = Array.from({ length: NL }, (_, i) => ({ u: i / NL, y: -SH / 2 + 0.4 + Math.random() * (SH - 0.8), z: (Math.random() - 0.5) * (SZ - 0.6) }));
      const labsB = [
        label('흑연 (−극 물질)', [-SX, -SH / 2 - 0.45, 0], { color: 'rgba(100,116,139,.95)' }), label('리튬 코발트 산화물 (+극)', [SX, -SH / 2 - 0.45, 0], { color: 'rgba(37,99,235,.95)' }),
        label('분리막 · 전해질', [0, -SH / 2 - 0.45, 0], { color: 'rgba(30,41,59,.9)' }), label('Li⁺', [0, 0.3, SZ / 2], { color: 'rgba(124,58,237,.95)' }), label('e⁻', [-2, ctop + 0.55, 0], { color: 'rgba(8,145,178,.92)' }),
      ];
      /* ---------- ③ 납 축전지 (Pb | 묽은 황산 | PbO₂) ---------- */
      const acid = new THREE.Mesh(new THREE.BoxGeometry(SX * 2 + 1.7, SH, SZ), mat(0xf7e08a, { transparent: true, opacity: 0.2, depthWrite: false })); C.add(acid);
      const mkPlates = (x, col, n) => { const g = new THREE.Group(); g.position.x = x; for (let i = 0; i < 3; i++) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.35, SH - 0.7, SZ - 0.5), mat(col, { metalness: 0.35, roughness: 0.6 })); p.position.set((i - 1) * 0.55, -0.05, 0); g.add(p); } const bar = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.18, 0.5), mat(0x94a3b8, { metalness: 0.85, roughness: 0.3 })); bar.position.set(0, SH / 2 - 0.2, 0); g.add(bar); return g; };
      C.add(mkPlates(-SX, 0x8b95a7), mkPlates(SX, 0x6b4a3a));
      const sepC = new THREE.Mesh(new THREE.BoxGeometry(0.1, SH - 0.4, SZ - 0.3), mat(0xf1f5f9, { transparent: true, opacity: 0.55, depthWrite: false })); C.add(sepC);
      C.add(new THREE.Mesh(new THREE.TubeGeometry(wB, 80, 0.06, 10, false), mat(0xd18a3a, { metalness: 0.7, roughness: 0.35 })));
      const devC = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.7, 0.8), mat(0x64748b, { metalness: 0.3 })); devC.position.set(0, ctop, 0); C.add(devC);
      const devLC = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), mat(0xffc83d, { emissive: 0xffc83d, emissiveIntensity: 0.9 })); devLC.position.set(0, ctop + 0.45, 0); C.add(devLC);
      const eC = new THREE.InstancedMesh(new THREE.SphereGeometry(0.13, 12, 10), mat(0x42e8ff, { emissive: 0x00a9c0, emissiveIntensity: 0.9 }), NE); eC.frustumCulled = false; C.add(eC);
      const NI = 14, hI = new THREE.InstancedMesh(new THREE.SphereGeometry(0.13, 14, 10), mat(0xf8fafc, { emissive: 0x94a3b8, emissiveIntensity: 0.4 }), NI), sI = new THREE.InstancedMesh(new THREE.SphereGeometry(0.2, 16, 12), mat(0xfbbf24, { emissive: 0xb45309, emissiveIntensity: 0.35 }), NI);
      hI.frustumCulled = false; sI.frustumCulled = false; C.add(hI, sI);
      const IP = Array.from({ length: NI }, (_, i) => ({ u: i / NI, y: -SH / 2 + 0.5 + Math.random() * (SH - 1), z: (Math.random() - 0.5) * (SZ - 0.8) }));
      const labsC = [
        label('Pb판 (−극 물질)', [-SX, -SH / 2 - 0.45, 0], { color: 'rgba(100,116,139,.95)' }), label('PbO₂판 (+극 물질)', [SX, -SH / 2 - 0.45, 0], { color: 'rgba(120,70,40,.95)' }),
        label('분리막 · 묽은 황산(전해질)', [0, -SH / 2 - 0.45, 0], { color: 'rgba(30,41,59,.9)' }), label('e⁻', [-2, ctop + 0.55, 0], { color: 'rgba(8,145,178,.92)' }),
      ];
      function setKind(k) { kind = k; A.visible = k === 'mn'; B.visible = k === 'li'; C.visible = k === 'pb'; showL(); }
      function showL() { labsA.forEach((l) => l.show(showLab && kind === 'mn')); labsB.forEach((l) => l.show(showLab && kind === 'li')); labsC.forEach((l) => l.show(showLab && kind === 'pb')); }
      const lb = controls.button('이름표 ✓', () => { showLab = !showLab; lb.classList.toggle('on', showLab); lb.textContent = '이름표 ' + (showLab ? '✓' : '✕'); showL(); }); lb.classList.add('on');
      setKind('mn');
      let txt = '', demoMode = null;
      const pl = controls.player({
        duration: 8, loop: true, autoplay: false, label: '방전 ↔ 충전 재생',
        phases: [[0, '방전 (사용)'], [0.5, '충전']],
        onFrame(p) { demoMode = p < 0.5 ? 'dis' : 'chg'; },
      });
      const demoOn = () => pl.playing || pl.p > 0.0005;
      const KMAP = { mn: 'mn', alk: 'mn', pb: 'pb', lead: 'pb', li: 'li' };
      const NAME = { mn: '망가니즈 건전지', pb: '납 축전지', li: '리튬 이온 전지' };
      function read2D() {
        const w = window.__sim, S2 = w && w.S; const r = { md: '', k: kind, mode: 'dis', chosen: true, alk: false };
        if (!S2) return r;
        r.md = S2.mode;
        if (S2.mode === 'compare' && S2.cm) { r.k = KMAP[S2.cm.cell] || kind; }
        else if (S2.mode === 'classify' && S2.cf && S2.cf.sub === 'cycle') {
          const c = S2.cf; r.k = KMAP[c.bat] || kind; r.mode = c.mode === 'chg' ? 'chg' : 'dis'; r.alk = c.bat === 'alk';
          r.chosen = !!(c.dir && c.dir[c.bat] && c.dir[c.bat][c.mode]);
        }
        return r;
      }
      const ionLoop = (inst, arr, dir, fn) => arr.forEach((q, i) => { q.u = ((q.u + dir * 0.0016) % 1 + 1) % 1; fn(q, i, inst); });
      return {
        update(dt, t) {
          dt = Math.min(dt, 0.05);
          const r = read2D();
          if (r.k !== kind) { setKind(r.k); }
          let mode = r.mode, active = r.chosen;
          if (demoOn() && demoMode) { mode = demoMode; active = true; }
          const primary = kind === 'mn';
          if (primary && mode === 'chg') active = false;          // 1차 전지는 충전할 수 없어요
          const dir = mode === 'dis' ? 1 : -1;
          if (kind === 'mn') {
            for (let i = 0; i < NE; i++) { if (!active) { hide(em, i); continue; } const u = ((((i / NE) - t * 0.12) % 1) + 1) % 1; const p = wcur.getPointAt(Math.min(1, 1 - u)); M.makeTranslation(p.x, p.y, p.z); em.setMatrixAt(i, M); }
            em.instanceMatrix.needsUpdate = true;
            bulb.material.emissiveIntensity = active ? 0.8 + 0.2 * Math.sin(t * 6) : 0.08;
          } else if (kind === 'li') {
            for (let i = 0; i < NE; i++) { if (!active) { hide(eB, i); continue; } const u = ((((i / NE) + dir * t * 0.14) % 1) + 1) % 1; const p = wB.getPointAt(u); M.makeTranslation(p.x, p.y, p.z); eB.setMatrixAt(i, M); }
            eB.instanceMatrix.needsUpdate = true;
            LP.forEach((q, i) => { if (active) q.u = ((q.u + dir * dt * 0.1) % 1 + 1) % 1; const x = -SX + 0.95 + (SX * 2 - 1.9) * q.u; M.makeTranslation(x, q.y + Math.sin(t * 2 + i) * 0.1, q.z); lm.setMatrixAt(i, M); });
            lm.instanceMatrix.needsUpdate = true;
            devL.material.emissiveIntensity = active ? (mode === 'dis' ? 0.9 : 0.1) : 0.05; devL.material.color.setHex(mode === 'dis' ? 0xffc83d : 0x5de08a);
          } else {
            for (let i = 0; i < NE; i++) { if (!active) { hide(eC, i); continue; } const u = ((((i / NE) + dir * t * 0.14) % 1) + 1) % 1; const p = wB.getPointAt(u); M.makeTranslation(p.x, p.y, p.z); eC.setMatrixAt(i, M); }
            eC.instanceMatrix.needsUpdate = true;
            IP.forEach((q, i) => {
              if (active) q.u = ((q.u + dir * dt * 0.1) % 1 + 1) % 1;
              const xh = -SX + 0.95 + (SX * 2 - 1.9) * q.u, xs = SX - 0.95 - (SX * 2 - 1.9) * q.u;      // H⁺: (−) → (+), SO₄²⁻: (+) → (−) (방전)
              M.makeTranslation(xh, q.y + Math.sin(t * 2 + i) * 0.1, q.z); hI.setMatrixAt(i, M);
              M.makeTranslation(xs, q.y + 0.2 + Math.cos(t * 2 + i) * 0.1, -q.z); sI.setMatrixAt(i, M);
            });
            hI.instanceMatrix.needsUpdate = true; sI.instanceMatrix.needsUpdate = true;
            devLC.material.emissiveIntensity = active ? (mode === 'dis' ? 0.9 : 0.1) : 0.05; devLC.material.color.setHex(mode === 'dis' ? 0xffc83d : 0x5de08a);
          }
          let tx;
          if (kind === 'mn') tx = '<b>망가니즈 건전지 (1차 전지)</b><br>(−)극 아연 통이 산화돼 전자를 내보내고, (+)극 MnO₂ + 탄소 막대 쪽에서 전자를 받아요.<br>한 번 쓰면 충전할 수 없어요.' + (r.alk ? '<br>알칼리 건전지도 Zn–MnO₂ 1차 전지예요.' : '') + (mode === 'chg' ? '<br><b style="color:#fca5a5">1차 전지는 충전할 수 없어요. 충전하면 위험해요.</b>' : '');
          else if (kind === 'pb') tx = mode === 'dis' ? '<b>납 축전지 · 방전 (2차 전지)</b><br>(−)극 Pb, (+)극 PbO₂, 전해질 묽은 황산<br>전자: (−)극 → 외부 회로 → (+)극' : '<b>납 축전지 · 충전</b><br>충전기가 전자를 거꾸로 밀어 줘요.<br>전자와 이온이 모두 방전 때와 반대로 움직여요.';
          else tx = mode === 'dis' ? '<b>리튬 이온 전지 · 방전 (2차 전지)</b><br>Li⁺: 흑연 → 리튬 코발트 산화물 (분리막 통과)<br>전자: (−)극 → 외부 회로 → (+)극' : '<b>리튬 이온 전지 · 충전</b><br>충전기가 전자를 거꾸로 밀어 줘요.<br>Li⁺와 전자 모두 방전 때와 반대로 움직여요 (2차 전지).';
          if (r.md === 'classify' && !r.chosen && !demoOn()) tx += '<br><span style="color:#ffd34d">2D에서 전자의 이동 방향을 고르면 전자 흐름을 보여 줘요.</span>';
          else if (r.md !== 'classify' && r.md !== 'compare') tx += '<br><span style="color:#9fb0d4">이 단계의 활동은 2D 화면에서 해요.</span>';
          if (tx !== txt) { txt = tx; info(tx); }
        },
      };
    },
  });
})();
