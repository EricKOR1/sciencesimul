/* h1-conductor · 3D 자유전자 모형 (구리 · 유리 · 규소 / 규소 반도체)
   2D 실험의 상태(물질 · 전압 · 자유전자 수 · 불순물 · 온도 · 빛)를 그대로 읽어 같은 값을 3D로 보여 줘요. (옆의 조작 도구가 3D에도 적용돼요)
   도체는 자유전자가 많아 전압을 걸면 전류가 잘 흐르고, 부도체는 전자가 묶여 있어요. 반도체는 자유전자가 아주 적지만 불순물·온도·빛으로 늘어나요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHN = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const NX = 6, NY = 3, NZ = 3, SP = 1.4;
  const MATS = { cu: { kind: 'metal', name: '구리 (도체)', atom: 0xe39a45 }, gl: { kind: 'insul', name: '유리 (부도체)', atom: 0xc9d4ea }, si: { kind: 'semi', name: '규소 (반도체)', atom: 0x9aa9c9 } };
  const DNAME = ['없음 (순수한 규소)', '100억 개 중 1개', '10억 개 중 1개', '1억 개 중 1개', '천만 개 중 1개'];
  const DLV = [0, 1e-10, 1e-9, 1e-8, 1e-7];
  const sceneOf = (lv) => (lv === 2 ? 'semi' : 'model');

  window.SciSim3D.attach({
    title: '자유전자 모형 3D',
    camera: { dist: PHN ? 15 : 11, theta: 0.55, phi: 1.2, min: 6, max: 26 },
    levels: [1, 2],
    autoRotate: 0.12,
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const std = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.4, metalness: 0.1 }, o || {}));
      const lesson = () => window.__sim || null;
      const W = (NX - 1) * SP, H = (NY - 1) * SP, Dp = (NZ - 1) * SP;
      /* 원자 격자 */
      const A = NX * NY * NZ, aGeo = new THREE.IcosahedronGeometry(0.27, 2);
      const atoms = new THREE.InstancedMesh(aGeo, std(MATS.cu.atom, { roughness: 0.3, metalness: 0.5 }), A); root.add(atoms);
      const home = [];
      for (let i = 0; i < NX; i++) for (let j = 0; j < NY; j++) for (let k = 0; k < NZ; k++) home.push(new THREE.Vector3(i * SP - W / 2, j * SP - H / 2, k * SP - Dp / 2));
      /* 전극 판 */
      const plate = (x, c) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.22, H + 1.6, Dp + 1.6), std(c, { roughness: 0.35, metalness: 0.6 })); m.position.x = x; root.add(m); return m; };
      const pL = plate(-W / 2 - 1.1, 0x2f6df6), pR = plate(W / 2 + 1.1, 0xe2464b);
      label('−', pL, { offset: [0, (H + 1.6) / 2 + 0.5, 0], size: 17 }); label('+', pR, { offset: [0, (H + 1.6) / 2 + 0.5, 0], size: 17 });
      const curLab = label('', [0, -H / 2 - 1.4, 0], { color: 'rgba(255,211,77,.92)' }); curLab.el.style.color = '#1b2333';
      const nLab = label('', [0, H / 2 + 1.4, 0], { size: 13 });
      /* 자유전자: 파랑 = 원래 있던 · 열/빛으로 생긴 전자, 초록 = 불순물이 내놓은 전자 (2D와 같은 색) */
      const NE = 60, eGeo = new THREE.IcosahedronGeometry(0.16, 1);
      const eMesh = new THREE.InstancedMesh(eGeo, std(0xffffff, { emissive: 0x1a5fb0, emissiveIntensity: 0.7, roughness: 0.2 }), NE); root.add(eMesh);
      const cB = new THREE.Color(0x62b4ff), cG = new THREE.Color(0x34d399);
      for (let i = 0; i < NE; i++) eMesh.setColorAt(i, cB); eMesh.instanceColor.needsUpdate = true;
      const eB = new THREE.InstancedMesh(eGeo, std(0x62b4ff, { emissive: 0x1a5fb0, emissiveIntensity: 0.6, roughness: 0.3 }), A); root.add(eB); // 원자에 묶인 전자
      const E = []; for (let i = 0; i < NE; i++) E.push({ p: new THREE.Vector3((Math.random() - 0.5) * W, (Math.random() - 0.5) * H, (Math.random() - 0.5) * Dp), v: new THREE.Vector3() });
      const dummy = new THREE.Object3D();
      let scene = sceneOf(ctx.level), demoP = 0;
      let cur = { kind: 'metal', n: 36, green: 0, volt: 0, T: 0, label: '', key: '' };

      /* 2D 상태 읽기 (demoP > 0이면 ▶ 재생의 한 사이클을 대신 보여 줘요) */
      function readState() {
        const L = lesson(), S = L && L.S; if (!S) return cur;
        if (scene === 'semi') {
          const E2 = S.semi; let d = E2.d, Tt = E2.T, Ll = E2.L;
          if (demoP > 0) { const u = demoP < 0.5 ? demoP * 2 : (1 - demoP) * 2; Tt = 20 + 100 * u; Ll = 0; d = 0; }
          const ni = Math.pow(2, (Tt - 20) / 10), nd = DLV[d] * 5e22 / 1.5e10, np = Ll / 100 * 300, rel = ni + nd + np;
          const total = Math.max(1, Math.min(36, Math.round(1 + 3 * Math.log10(rel)))), green = nd > 0 ? Math.max(1, Math.min(total, Math.round(total * nd / rel))) : 0;
          return { kind: 'semi', n: total, green, volt: 0.6, rel, d, T: Tt, L: Ll };
        }
        const M = S.model; let volt = M.volt ? 0.78 : 0;
        if (demoP > 0) volt = demoP > 0.4 ? 0.78 : 0;
        return { kind: MATS[M.mat].kind, mat: M.mat, n: M.n, green: 0, volt, rel: 0 };
      }
      function textOf(s) {
        if (scene === 'semi') {
          const rel = s.rel >= 100 ? Math.round(s.rel).toLocaleString('ko-KR') : s.rel >= 10 ? Math.round(s.rel) : s.rel.toFixed(1);
          return '<b>규소 반도체</b> · 불순물(인) <b>' + DNAME[s.d] + '</b> · 온도 <b>' + Math.round(s.T) + ' °C</b> · 빛 <b>' + Math.round(s.L) + ' %</b><br>자유전자 ' + s.n + '개 (<span style="color:#34d399">초록</span>: 불순물이 내놓은 전자, <span style="color:#62b4ff">파랑</span>: 열·빛으로 생긴 전자)<br>전류는 순수한 규소(20 °C)의 약 <b>' + rel + '배</b>';
        }
        const S2 = lesson() && lesson().S, hideKind = !!(S2 && S2.sub === 'cls' && !S2.model.clsOK);   // 구분하기 미션의 답을 미리 알려 주지 않아요
        const nm = hideKind ? MATS[s.mat].name.replace(/ \(.*\)$/, '') : MATS[s.mat].name;
        const base = s.kind === 'metal' ? '원자 사이를 자유롭게 돌아다니는 <b>자유전자</b>가 많아요.' : s.kind === 'insul' ? '전자가 원자에 단단히 묶여 <b>자유전자가 없어요</b>.' : '자유전자가 <b>아주 적어요</b>.';
        return '<b>' + nm + '</b> · 자유전자 <b>' + s.n + '개</b><br>' + base + '<br>' + (S2 && S2.sub === 'cls' ? '화면의 <b>세 물질 비교</b>표에서 자유전자 수와 전류를 보고 종류를 골라요.' : s.volt ? '⚡ 전압을 걸어 자유전자가 + 극 쪽으로 이동해요.' : '전압을 걸지 않으면 전자는 제멋대로 움직여요. (옆의 <b>⚡ 전압 걸기</b>)');
      }
      function applyKind(s) {
        const kind = s.kind, atomC = scene === 'semi' ? MATS.si.atom : MATS[s.mat].atom;
        atoms.material.color.setHex(atomC); atoms.material.metalness = kind === 'metal' ? 0.6 : 0.15;
        eB.visible = kind !== 'metal';
        for (let i = 0; i < NE; i++) eMesh.setColorAt(i, i < s.green ? cG : cB); eMesh.instanceColor.needsUpdate = true;
        const c = s.n * (s.volt || 0);
        const S4 = lesson() && lesson().S; curLab.set(S4 && S4.sub === 'cls' && scene !== 'semi' ? '구리 (자유전자 많음)' : scene === 'semi' ? (s.rel < 10 ? '전류 약함' : s.rel < 100 ? '전류 커져요' : '전류 매우 커져요') : (!s.volt ? '전압을 걸어 보세요' : kind === 'insul' ? '전류 거의 없음' : kind === 'metal' ? '전류 잘 흘러요' : c < 4 ? '전류 조금 흘러요' : '전류 흘러요'));
        nLab.set('자유전자 ' + s.n + '개');
        info(textOf(s));
      }

      /* 구분하기(cls): 2D처럼 세 물질의 자유전자 수 · 전류 비교표를 3D 화면에도 보여 줘요. 종류(도체 등)는 맞힌 뒤에만 보여요 */
      if (!document.getElementById('cd3d-cls')) { const st2 = document.createElement('style'); st2.id = 'cd3d-cls'; st2.textContent =
        '.cd-cls{position:absolute;right:10px;top:10px;padding:7px 9px;border-radius:12px;background:rgba(8,12,24,.76);color:#fff;font-size:12px;font-weight:700;pointer-events:none}.cd-cls .h{font-weight:900;margin-bottom:4px}.cd-cls table{border-collapse:collapse}.cd-cls td,.cd-cls th{padding:2px 6px;text-align:center}.cd-cls th{color:#c9d3e6;font-weight:800}.cd-cls td:first-child{text-align:left;font-weight:900}.cd-cls .k{color:#86efac}' +
        '@media (max-width:599px){.cd-cls{top:auto;bottom:30px;right:8px;font-size:10.5px;padding:4px 6px}.cd-cls td,.cd-cls th{padding:1px 4px}}';
        document.head.appendChild(st2); }
      const clsEl = document.createElement('div'); clsEl.className = 'cd-cls'; clsEl.style.display = 'none'; ctx.renderer.domElement.parentElement.appendChild(clsEl);
      let clsSig = '';
      function drawCls() {
        const L = lesson(), S = L && L.S, on = !!(S && S.mode === 'model' && S.sub === 'cls' && L.DEFN);
        const sig = on ? 'on' + (S.model.clsOK ? 1 : 0) : ''; if (sig === clsSig) return; clsSig = sig; clsEl.style.display = on ? '' : 'none'; if (!on) return;
        const cur = (n) => (n > 20 ? '많이 흘러요' : n === 0 ? '흐르지 않아요' : '아주 조금');
        clsEl.innerHTML = '<div class="h">🗂️ 세 물질 비교 (모형)</div><table><tr><th></th><th>자유전자</th><th>전류</th>' + (S.model.clsOK ? '<th>종류</th>' : '') + '</tr>' +
          ['cu', 'gl', 'si'].map((id) => '<tr><td>' + L.MATNAME[id] + '</td><td>' + L.DEFN[id] + '개</td><td>' + cur(L.DEFN[id]) + '</td>' + (S.model.clsOK ? '<td class="k">' + L.KIND[id] + '</td>' : '') + '</tr>').join('') + '</table>';
      }
      const pl = controls.player({
        duration: 8, loop: true, autoplay: false, label: '전류 흐름',
        phases: [[0, '자유전자 움직임'], [0.4, '전압을 걸면']],
        onFrame(p) { demoP = p; },
      });
      function setPlayer() { /* 장면에 맞는 안내는 info로 */ }
      ctx.onLevel((li) => { scene = sceneOf(li); pl.pause(); pl.set(0); cur.key = ''; });
      let lastKey = '', hold = 0;
      return {
        update(dt, t) {
          drawCls();
          const s = readState(); cur = s;
          const S3 = lesson() && lesson().S, key = (S3 && S3.sub === 'cls' && !S3.model.clsOK ? 'h|' : '') + scene + '|' + (s.mat || '') + '|' + s.kind + '|' + s.n + '|' + s.green + '|' + (s.volt ? 1 : 0) + '|' + (s.d == null ? '' : s.d + ',' + Math.round(s.T) + ',' + Math.round(s.L));
          if (key !== lastKey) { lastKey = key; applyKind(s); }
          const Tm = scene === 'semi' ? Math.min(1, (s.T - 20) / 100) : 0.3, amp = 0.04 + Tm * 0.09;
          for (let a = 0; a < A; a++) {
            const h = home[a]; dummy.position.set(h.x + Math.sin(t * 9 + a * 1.7) * amp, h.y + Math.sin(t * 8 + a * 2.3) * amp, h.z + Math.cos(t * 7 + a) * amp);
            dummy.scale.setScalar(1); dummy.updateMatrix(); atoms.setMatrixAt(a, dummy.matrix);
            if (s.kind !== 'metal') {
              const ang = t * 3 + a, r = 0.42;
              dummy.position.set(h.x + Math.cos(ang) * r, h.y + Math.sin(ang * 0.8) * 0.18, h.z + Math.sin(ang) * r);
              dummy.scale.setScalar(s.kind === 'semi' && a % 5 < 1 && a < s.n * 0.9 ? 0.0001 : 1); dummy.updateMatrix(); eB.setMatrixAt(a, dummy.matrix);
            }
          }
          atoms.instanceMatrix.needsUpdate = true; if (s.kind !== 'metal') eB.instanceMatrix.needsUpdate = true;
          const drift = s.volt * 3.0;
          for (let i = 0; i < NE; i++) {
            const e = E[i];
            if (i < s.n) {
              e.v.x += (Math.random() - 0.5) * 0.9 + (drift - e.v.x) * 0.06; e.v.y += (Math.random() - 0.5) * 0.9 - e.v.y * 0.1; e.v.z += (Math.random() - 0.5) * 0.9 - e.v.z * 0.1;
              e.p.addScaledVector(e.v, dt * (0.5 + Tm * 0.6));
              const bx = W / 2 + 0.7, by = H / 2 + 0.5, bz = Dp / 2 + 0.5;
              if (e.p.x > bx) e.p.x = -bx; if (e.p.x < -bx) e.p.x = bx;
              if (Math.abs(e.p.y) > by) { e.p.y = Math.sign(e.p.y) * by; e.v.y *= -1; } if (Math.abs(e.p.z) > bz) { e.p.z = Math.sign(e.p.z) * bz; e.v.z *= -1; }
              dummy.position.copy(e.p); dummy.scale.setScalar(1);
            } else { dummy.position.set(0, 0, 0); dummy.scale.setScalar(0.0001); }
            dummy.updateMatrix(); eMesh.setMatrixAt(i, dummy.matrix);
          }
          eMesh.instanceMatrix.needsUpdate = true;
        },
        sync() { lastKey = ''; },
      };
    },
  });
})();
