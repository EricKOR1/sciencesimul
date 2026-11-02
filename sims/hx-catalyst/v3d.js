/* hx-catalyst · 3D 금속 표면 촉매: H₂ + Cl₂ → 2 HCl (모형)
   ① 반응물이 촉매 표면에 달라붙고(흡착) ② 결합이 약해져 원자로 나뉘고 ③ 새 결합이 만들어지고 ④ 생성물이 떨어져 나가요.
   촉매는 활성화 에너지가 더 낮은 다른 길을 열어 줘서 반응 속도를 높여요 (반응 엔탈피는 그대로, 촉매는 소모되지 않아요).
   위쪽 곡선: 회색 = 촉매 없이, 주황 = 촉매 있을 때 (모형 스케치예요). */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const sstep = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
  const SX = 1.3, OY = 4.9;
  const hill = (x, h) => -0.45 * (1 + Math.tanh(1.3 * x)) + h * Math.exp(-x * x / 0.9);  // x: -3..3
  const STAGES = ['반응물 접근', '표면에 흡착', '결합이 끊어짐', '새 결합 형성', '생성물이 떨어져 나감'];
  // 원자 키프레임 [x, y, z] — H1, H2, Cl1, Cl2
  const KF = [
    [[-3.2, 3.0, 0.3], [-2.4, 3.0, 0.3], [2.3, 3.2, -0.3], [3.5, 3.2, -0.3]],
    [[-2.2, 0.55, 0.4], [-1.45, 0.55, 0.4], [1.4, 0.55, -0.4], [2.6, 0.55, -0.4]],
    [[-2.6, 0.45, 0.9], [-0.9, 0.45, -0.1], [0.9, 0.45, 0.1], [2.6, 0.45, -0.9]],
    [[-1.5, 0.45, 0.9], [-0.3, 0.45, -0.7], [0.5, 0.45, 0.9], [1.4, 0.45, -0.7]],
    [[-1.6, 3.6, 0.9], [-0.5, 3.6, -0.7], [-0.45, 3.2, 0.9], [0.6, 3.2, -0.7]],
  ];
  // 단계별 결합 [i, j]
  const BONDS = [[[0, 1], [2, 3]], [[0, 1], [2, 3]], [], [[0, 2], [1, 3]], [[0, 2], [1, 3]]];

  window.SciSim3D.attach({
    title: '촉매 표면 반응 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: PHONE ? 19 : 14, theta: 0.35, phi: 1.2, min: 8, max: 30, target: [0, 2.3, 0] },
    autoRotate: 0.08,
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const V3 = THREE.Vector3, UP = new V3(0, 1, 0);
      const mat = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.38, metalness: 0.05 }, o || {}));
      const S0 = window.__sim && window.__sim.S && window.__sim.S.en;
      let cat = S0 ? !!S0.cat : true, stage = 0, playing = false, prog = 0;   // prog: 0 ~ 4 (키프레임 사이를 부드럽게)
      /* 금속 표면 */
      const surf = new THREE.Group(); root.add(surf);
      const sg = new THREE.SphereGeometry(0.62, 24, 18), sm = mat(0xa5afc2, { metalness: 0.8, roughness: 0.28 });
      const inst = new THREE.InstancedMesh(sg, sm, 11 * 4 * 2); let n = 0, M = new THREE.Matrix4();
      for (let L = 0; L < 2; L++) for (let i = 0; i < 11; i++) for (let j = 0; j < 4; j++) { M.makeTranslation((i - 5 + (j % 2) * 0.5) * 1.25 + (L ? 0.6 : 0), -0.2 - L * 0.9, (j - 1.5) * 1.1 + (L ? 0.55 : 0)); inst.setMatrixAt(n++, M); }
      surf.add(inst);
      const lSurf = label('금속 촉매 표면', [-4.2, -0.2, 1.8], { color: 'rgba(100,116,139,.92)' });
      /* 원자 */
      const spec = [[0xf1f5f9, 0.32], [0xf1f5f9, 0.32], [0x22b14c, 0.52], [0x22b14c, 0.52]];
      const at = spec.map(([c, r]) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 24), mat(c)); root.add(m); return m; });
      const bd = Array.from({ length: 2 }, () => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1, 12), mat(0xb4bfd2)); root.add(m); return m; });
      const faint = Array.from({ length: 2 }, () => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1, 10), mat(0xffd34d, { transparent: true, opacity: 0.55, emissive: 0xaa8800, emissiveIntensity: 0.4 })); root.add(m); return m; });
      const lH = label('H', at[0], { offset: [0, 0.6, 0] }), lC = label('Cl', at[2], { offset: [0, 0.8, 0] });
      /* 반응 경로 곡선 */
      const mk = (h, col) => { const p = []; for (let i = 0; i <= 90; i++) { const x = -3 + 6 * i / 90; p.push(new V3(x * SX, OY + hill(x, h), 0)); } return new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(p), 180, 0.07, 10, false), mat(col, { emissive: col, emissiveIntensity: 0.35 })); };
      const cNo = mk(2.2, 0x8a94a8), cCat = mk(1.0, 0xff9a3c); root.add(cNo, cCat);
      const bead = new THREE.Mesh(new THREE.SphereGeometry(0.27, 24, 18), mat(0xffd34d, { emissive: 0xffa500, emissiveIntensity: 0.6 })); root.add(bead);
      const lNo = label('촉매 없이 (Eₐ 큼)', [-0.4 * SX, OY + 2.2 + 0.25, 0], { color: 'rgba(100,116,139,.92)' });
      const lCat = label('촉매 있을 때 (Eₐ 작음)', [0.9 * SX, OY + 1.0 - 0.2, 0], { color: 'rgba(230,120,20,.92)' });
      const lE = label('에너지', [-3.2 * SX, OY + 1.5, 0], { color: 'rgba(30,41,59,.85)' });

      const pos = [0, 1, 2, 3].map(() => new V3());
      function setBond(m, p, q, vis) { m.visible = vis; if (!vis) return; const d = q.clone().sub(p), L = d.length(); m.scale.set(1, L, 1); m.position.copy(p).add(q).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(UP, d.normalize()); }
      function apply(pr, t) {
        const k = Math.min(3.999, pr), a = Math.floor(k), f = sstep(k - a);
        const effA = cat ? a : 0, tot = cat ? 1 : 0;
        for (let i = 0; i < 4; i++) {
          const p0 = KF[a][i], p1 = KF[a + 1][i]; pos[i].set(p0[0] + (p1[0] - p0[0]) * f, p0[1] + (p1[1] - p0[1]) * f, p0[2] + (p1[2] - p0[2]) * f);
          if (!cat) { pos[i].copy(new V3(...KF[0][i])); pos[i].y += Math.sin(t * 2 + i) * 0.15; pos[i].x += Math.sin(t * 1.5 + i * 2) * 0.2; }
          at[i].position.copy(pos[i]);
        }
        // 결합: 현재 키프레임 a → a+1 사이에서 앞 단계 결합은 f<0.5 동안, 뒤 단계 결합은 f>=0.5부터
        const cur = BONDS[f < 0.5 || !cat ? a : a + 1];
        const list = cat ? cur : BONDS[0];
        const mkB = (arr, idx) => { const b = arr[idx]; if (!b) { setBond(bd[idx], pos[0], pos[1], false); return; } };
        bd.forEach((m, idx) => { const b = list[idx]; if (b) setBond(m, pos[b[0]], pos[b[1]], true); else m.visible = false; void mkB; });
        // 흡착 단계에서 금속 표면과 점선 (약한 결합)
        faint.forEach((m, idx) => { const on = cat && ((a === 1 && f > 0.2) || a === 2 || (a === 3 && f < 0.6)); if (!on) { m.visible = false; return; } const i = idx ? 3 : 0; setBond(m, pos[i], new V3(pos[i].x, -0.1, pos[i].z), true); });
        void effA; void tot;
        // 곡선 위의 공
        const u = cat ? -3 + 6 * (pr / 4) : -3 + 1.1 * (0.5 - 0.5 * Math.cos(t * 1.6)) * 0.7;
        const h = cat ? 1.0 : 2.2; bead.position.set(u * SX, OY + hill(u, h) + 0.3, 0);
        bead.material.color.setHex(cat ? 0xffd34d : 0xcbd5e1);
      }
      const seg = controls.segment('단계', STAGES.map((s, i) => ({ value: i, label: (i + 1) + '' })), 0, (v) => { stage = v; playing = false; prog = v; playBtn.textContent = '▶ 자동 재생'; });
      const catSeg = controls.segment('촉매', [{ value: 1, label: '있음' }, { value: 0, label: '없음' }], cat ? 1 : 0, (v) => { cat = !!v; });
      const playBtn = controls.button('▶ 자동 재생', () => { playing = !playing; playBtn.textContent = playing ? '⏸ 멈춤' : '▶ 자동 재생'; if (playing && prog >= 3.98) prog = 0; });
      let txt = '';
      return {
        update(dt, t) {
          dt = Math.min(dt, 0.05);
          const s = window.__sim && window.__sim.S && window.__sim.S.en;
          if (s && !!s.cat !== cat && s.__seen !== undefined) { /* 무시 */ }
          if (playing && cat) { prog += dt * 0.5; if (prog >= 4) { prog = 4; playing = false; playBtn.textContent = '▶ 자동 재생'; } seg.set(Math.min(4, Math.round(prog))); }
          apply(Math.min(4, prog), t);
          const st = Math.min(4, Math.round(prog));
          const body = !cat ? '촉매가 없으면 H₂와 Cl₂가 그냥 부딪혀야 해서 Eₐ가 커요. 거의 반응하지 않아요.' : ['H₂와 Cl₂가 표면 가까이 와요.', '표면에 달라붙어요(흡착). 분자 안의 결합이 약해져요.', '결합이 끊어져 원자가 표면 위를 움직여요.', 'H와 Cl이 새 결합(H–Cl)을 만들어요.', 'HCl이 떨어져 나가요. 촉매는 그대로 남아요!'][st];
          const tx = '<b>' + (cat ? (st + 1) + '단계 · ' + STAGES[st] : '촉매 없음') + '</b><br>' + body;
          if (tx !== txt) { txt = tx; info(tx); lH.show(true); }
        },
      };
    },
  });
})();
