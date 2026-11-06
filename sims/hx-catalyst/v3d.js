/* hx-catalyst · 3D 촉매 표면에서 일어나는 H₂O₂ 분해: 2 H₂O₂ → 2 H₂O + O₂  (2D 실험과 같은 반응)
   ① 반응물이 촉매 표면에 달라붙고(흡착) ② O–O 결합이 끊어지고 ③ H가 옮겨 가며 새 결합이 만들어지고 ④ 생성물이 떨어져 나가요.
   촉매는 활성화 에너지(Eₐ)가 더 낮은 다른 길을 열어 줘서 반응 속도를 높여요. ΔH = −196 kJ 는 그대로이고 촉매는 소모되지 않아요.
   위쪽 곡선(에너지 도표): 회색 = 촉매 없이 Eₐ 75 kJ, 주황 = 촉매 있을 때 Eₐ 50 kJ (2D '에너지 도표'의 값, 모형 스케치예요).
   촉매 있음 · 없음은 2D에서 골라요: 1단계는 고른 촉매(촉매 없음 · KI · MnO₂ · 간 조각), 2단계는 '촉매' 단추. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const sstep = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
  const SX = 1.3, OY = 7.4, KS = 0.012;                 // 에너지 1 kJ → 높이 0.012
  const E0 = 75, E1 = 50, DH = -196;                      // 2D의 ENS 값 (kJ)
  const STAGES = ['반응물 접근', '표면에 흡착', 'O–O 결합이 끊어짐', 'H가 옮겨 가며 새 결합 형성', '생성물이 떨어져 나감'];
  const curveE = (x, ea) => { const s = sstep((x + 3) / 6); return (DH * s + (ea - DH / 2) * Math.exp(-x * x / 0.8)) * KS; };
  // 원자: 0 H1, 1 O1, 2 O2, 3 H2 (H₂O₂ 첫째) / 4 H3, 5 O3, 6 O4, 7 H4 (둘째)
  const KF = [
    [[-3.7, 3.1, 0.3], [-3.0, 3.5, 0.3], [-1.8, 3.5, 0.3], [-1.1, 3.1, 0.3], [1.1, 3.3, -0.3], [1.8, 3.7, -0.3], [3.0, 3.7, -0.3], [3.7, 3.3, -0.3]],
    [[-3.5, 0.75, 0.5], [-2.8, 0.55, 0.5], [-1.6, 0.55, 0.5], [-0.9, 0.75, 0.5], [0.9, 0.75, -0.5], [1.6, 0.55, -0.5], [2.8, 0.55, -0.5], [3.5, 0.75, -0.5]],
    [[-3.6, 0.8, 0.7], [-2.9, 0.5, 0.7], [-1.0, 0.5, 0.4], [-0.3, 0.85, 0.4], [0.3, 0.85, -0.4], [1.0, 0.5, -0.4], [2.9, 0.5, -0.7], [3.6, 0.8, -0.7]],
    [[-3.4, 0.9, 0.8], [-2.7, 0.5, 0.7], [-0.6, 0.5, 0.25], [-2.0, 0.95, 1.1], [2.0, 0.95, -1.1], [2.7, 0.5, -0.7], [0.6, 0.5, -0.25], [3.4, 0.9, -0.8]],
    [[-3.9, 3.9, 0.8], [-3.2, 3.5, 0.7], [-0.6, 3.6, 0.25], [-2.5, 3.9, 1.1], [2.5, 3.9, -1.1], [3.2, 3.5, -0.7], [0.6, 3.6, -0.25], [3.9, 3.9, -0.8]],
  ];
  // 단계별 결합 (원자 번호 쌍)
  const BONDS = [
    [[0, 1], [1, 2], [2, 3], [4, 5], [5, 6], [6, 7]],
    [[0, 1], [1, 2], [2, 3], [4, 5], [5, 6], [6, 7]],
    [[0, 1], [2, 3], [4, 5], [6, 7]],
    [[0, 1], [3, 1], [4, 5], [7, 5]],
    [[0, 1], [3, 1], [4, 5], [7, 5], [2, 6]],
  ];
  const OXY = [1, 2, 5, 6];

  window.SciSim3D.attach({
    title: '촉매 표면 반응 3D · H₂O₂ 분해',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: PHONE ? 22 : 16.5, theta: 0.3, phi: 1.3, min: 8, max: 36, target: [-1.2, 3.9, 0] },
    autoRotate: 0.08,
    levels: [1],   // 2단계(에너지 도표 · 평형)만 3D예요. 1단계(촉매 실험 장치·그래프·저울)와 3~5단계는 2D 화면이에요
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const V3 = THREE.Vector3, UP = new V3(0, 1, 0);
      const mat = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.38, metalness: 0.05 }, o || {}));
      const W = () => window.__sim || null;
      let cat = false, catName = '촉매 없음', prog = 0, demo = false, txt = '';
      /* 촉매 표면 */
      const surf = new THREE.Group(); root.add(surf);
      const sg = new THREE.SphereGeometry(0.48, 24, 18), sm = mat(0xa5afc2, { metalness: 0.8, roughness: 0.28 });
      const inst = new THREE.InstancedMesh(sg, sm, 12 * 4 * 2); let n = 0; const M = new THREE.Matrix4();
      for (let L = 0; L < 2; L++) for (let i = 0; i < 12; i++) for (let j = 0; j < 4; j++) { M.makeTranslation((i - 5.5 + (j % 2) * 0.5) * 1.0 + (L ? 0.5 : 0), -0.2 - L * 0.8, (j - 1.5) * 0.95 + (L ? 0.47 : 0)); inst.setMatrixAt(n++, M); }
      surf.add(inst);
      label('촉매 표면', [-4.6, -0.2, 1.8], { color: 'rgba(100,116,139,.92)' });
      /* 원자 · 결합 */
      const at = Array.from({ length: 8 }, (_, i) => { const isH = i === 0 || i === 3 || i === 4 || i === 7; const m = new THREE.Mesh(new THREE.SphereGeometry(isH ? 0.3 : 0.5, 32, 24), mat(isH ? 0xf1f5f9 : 0xe23b3b)); root.add(m); return m; });
      const bd = Array.from({ length: 6 }, () => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1, 12), mat(0xb4bfd2)); root.add(m); return m; });
      const faint = OXY.map(() => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1, 10), mat(0xffd34d, { transparent: true, opacity: 0.55, emissive: 0xaa8800, emissiveIntensity: 0.4 })); root.add(m); return m; });
      const lA = label('H₂O₂', at[1], { offset: [0, 0.8, 0] }), lB = label('H₂O₂', at[5], { offset: [0, 0.8, 0] }), lO = label('O₂', [0, 4.4, 0], { color: 'rgba(14,116,144,.92)' });
      lO.show(false);
      /* 에너지 도표 (위) */
      const mk = (ea, col) => { const p = []; for (let i = 0; i <= 90; i++) { const x = -3 + 6 * i / 90; p.push(new V3(x * SX, OY + curveE(x, ea), 0)); } return new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(p), 180, 0.07, 10, false), mat(col, { transparent: true, emissive: col, emissiveIntensity: 0.5 })); };
      const cNo = mk(E0, 0x8a94a8), cCat = mk(E1, 0xff9a3c); root.add(cNo, cCat);
      const bead = new THREE.Mesh(new THREE.SphereGeometry(0.27, 24, 18), mat(0xffd34d, { emissive: 0xffa500, emissiveIntensity: 0.6 })); root.add(bead);
      const baseLine = new THREE.Mesh(new THREE.BoxGeometry(2.6 * SX, 0.03, 0.03), mat(0x5c6b8a, { transparent: true, opacity: 0.6 })); baseLine.position.set(-3 * SX + 1.3 * SX - 0.2, OY, 0); root.add(baseLine);
      const eaArrow = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1, 10), mat(0xffd34d, { emissive: 0xaa8800, emissiveIntensity: 0.5 })); root.add(eaArrow);
      const dhArrow = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, Math.abs(DH) * KS, 10), mat(0x34d399, { emissive: 0x0b6e4f, emissiveIntensity: 0.5 })); dhArrow.position.set(3.35 * SX, OY + DH * KS / 2, 0); root.add(dhArrow);
      const dhCone = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.34, 14), mat(0x34d399, { emissive: 0x0b6e4f, emissiveIntensity: 0.5 })); dhCone.position.set(3.35 * SX, OY + DH * KS + 0.17, 0); dhCone.rotation.x = Math.PI; root.add(dhCone);
      const lEa = label('', [0, 0, 0], { color: 'rgba(180,120,0,.92)' });
      label('ΔH = −196 kJ', [3.35 * SX + 0.2, OY + DH * KS / 2, 0], { color: 'rgba(5,150,105,.92)' });
      { const o = new THREE.Object3D(); o.position.set(-3 * SX, OY + 0.45, 0); root.add(o); label('반응물 2H₂O₂', o, { color: 'rgba(30,41,59,.9)' }); }   // 에너지 도표의 반응물 수준 (고정)
      label('생성물 2H₂O + O₂', [2.6 * SX, OY + DH * KS - 0.55, 0], { color: 'rgba(30,41,59,.9)' });
      const lNo = label('촉매 없이 75 kJ', [-1.9 * SX, OY + 0.2 + 0.55, 0], { color: 'rgba(100,116,139,.92)' });
      const lCat = label('촉매 있을 때 50 kJ', [1.6 * SX, OY - 0.3, 0], { color: 'rgba(230,120,20,.92)' });

      const pos = Array.from({ length: 8 }, () => new V3());
      function setBond(m, p, q, vis) { m.visible = vis; if (!vis) return; const d = q.clone().sub(p), L = d.length(); m.scale.set(1, L, 1); m.position.copy(p).add(q).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(UP, d.normalize()); }
      function apply(pr, t) {
        const k = Math.min(3.999, pr), a = Math.floor(k), f = sstep(k - a);
        for (let i = 0; i < 8; i++) {
          const p0 = KF[a][i], p1 = KF[a + 1][i];
          if (cat) pos[i].set(p0[0] + (p1[0] - p0[0]) * f, p0[1] + (p1[1] - p0[1]) * f, p0[2] + (p1[2] - p0[2]) * f);
          else { pos[i].set(...KF[0][i]); pos[i].y += Math.sin(t * 2 + i) * 0.15; pos[i].x += Math.sin(t * 1.5 + i * 2) * 0.2; }
          at[i].position.copy(pos[i]);
        }
        const list = cat ? BONDS[f < 0.5 ? a : a + 1] : BONDS[0];
        bd.forEach((m, idx) => { const b = list[idx]; if (b) setBond(m, pos[b[0]], pos[b[1]], true); else m.visible = false; });
        faint.forEach((m, idx) => { const on = cat && ((a === 1 && f > 0.2) || a === 2 || (a === 3 && f < 0.6)); if (!on) { m.visible = false; return; } const i = OXY[idx]; setBond(m, pos[i], new V3(pos[i].x, -0.1, pos[i].z), true); });
        const st = cat ? Math.min(4, Math.round(pr)) : 0, late = cat && pr >= 2.5;
        lA.set(late ? 'H₂O' : 'H₂O₂'); lB.set(late ? 'H₂O' : 'H₂O₂');
        lO.show(cat && pr >= 3.6); lO.obj = [(pos[2].x + pos[6].x) / 2, pos[2].y + 0.8, 0];
        // 에너지 도표: 현재 경로 강조, 공은 도표를 따라 움직여요
        const ea = cat ? E1 : E0;
        cNo.material.opacity = cat ? 0.35 : 1; cCat.material.opacity = cat ? 1 : 0.35;
        const u = cat ? -3 + 6 * (pr / 4) : -3 + 1.6 * (0.5 - 0.5 * Math.cos(t * 1.6)) * 0.7;
        bead.position.set(u * SX, OY + curveE(u, ea) + 0.3, 0);
        bead.material.color.setHex(cat ? 0xffd34d : 0xcbd5e1);
        eaArrow.scale.set(1, Math.max(0.01, curveE(0, ea)), 1); eaArrow.position.set(-0.45 * SX, OY + curveE(0, ea) / 2, 0);
        lEa.obj = [-0.45 * SX - 0.1, OY + curveE(0, ea) / 2 + 0.05, 0]; lEa.set('Eₐ = ' + ea + ' kJ');
        lNo.show(true); lCat.show(true);
        return st;
      }

      const pl = controls.player({
        duration: 10, loop: true, autoplay: false, label: '재생',
        phases: [[0, STAGES[0]], [0.125, STAGES[1]], [0.375, STAGES[2]], [0.625, STAGES[3]], [0.875, STAGES[4]]],
        onFrame(p) { prog = p * 4; demo = true; },
      });
      controls.text('촉매 있음 · 없음은 오른쪽 조작판에서 골라요.');

      /* 평형 화면: 2D와 같은 농도–시간 그래프를 오른쪽 아래 작은 창에 그려요 (보라 = 촉매 없음, 청록 = 촉매 있음 · 실선 [A], 점선 [B]) */
      const view = ctx.renderer.domElement.parentElement;
      const box = document.createElement('div');
      box.style.cssText = 'position:absolute;right:10px;bottom:30px;z-index:3;padding:6px 8px;border-radius:14px;background:rgba(8,12,24,.8);border:1px solid rgba(255,255,255,.22);text-align:center;pointer-events:none;color:#e8eefc;font-size:12px;font-weight:800;display:none';
      const CW = PHONE ? 170 : 230, CH = PHONE ? 100 : 130, cvs = document.createElement('canvas'); cvs.width = CW * 2; cvs.height = CH * 2; cvs.style.cssText = 'display:block;width:' + CW + 'px;height:' + CH + 'px;margin:3px auto 0';
      const cap = document.createElement('div'); cap.textContent = 'A ⇌ B 농도–시간 (실선 [A] · 점선 [B])';
      box.append(cap, cvs); view.appendChild(box);
      const g2 = cvs.getContext('2d');
      function drawEq() {
        const w = W(), S = w && w.S, Q = S && S.eq; if (!Q || !w.aAt) return;
        const Wd = cvs.width, H = cvs.height, L = 40, B = 30, T = 10, R = 10, TM = w.EQ_T || 40;
        const X = (t) => L + t / TM * (Wd - L - R), Y = (v) => T + (1 - v) * (H - T - B);
        g2.clearRect(0, 0, Wd, H);
        g2.strokeStyle = 'rgba(255,255,255,.3)'; g2.lineWidth = 2; g2.beginPath(); g2.moveTo(L, T); g2.lineTo(L, H - B); g2.lineTo(Wd - R, H - B); g2.stroke();
        g2.fillStyle = 'rgba(232,238,252,.85)'; g2.font = '700 20px sans-serif'; g2.textAlign = 'center'; g2.fillText('시간 (s) →', (L + Wd - R) / 2, H - 4);
        g2.textAlign = 'right'; g2.fillText('1.0', L - 5, Y(1) + 7); g2.fillText('0', L - 5, Y(0) + 4);
        g2.setLineDash([6, 6]); g2.strokeStyle = 'rgba(203,213,225,.55)'; g2.lineWidth = 2; [w.A_EQ, 1 - w.A_EQ].forEach((v) => { g2.beginPath(); g2.moveTo(L, Y(v)); g2.lineTo(Wd - R, Y(v)); g2.stroke(); }); g2.setLineDash([]);
        g2.textAlign = 'right'; g2.fillStyle = 'rgba(203,213,225,.9)'; g2.font = '700 17px sans-serif'; g2.fillText('평형 [A] 0.40', Wd - R - 2, Y(w.A_EQ) + 18); g2.fillText('평형 [B] 0.60', Wd - R - 2, Y(1 - w.A_EQ) - 6);
        const show = Q.mode === 2 ? [0, 1] : [Q.mode], tc = Q.ph === 'idle' ? 0 : Q.tc;
        show.forEach((m) => { const col = m ? '#2dd4bf' : '#a78bfa';
          [false, true].forEach((isB) => { g2.strokeStyle = col; g2.lineWidth = isB ? 3 : 5; g2.setLineDash(isB ? [7, 6] : []); g2.beginPath();
            for (let t = 0; t <= tc + 1e-6; t += 0.25) { const a = w.aAt(m, t), x = X(t), y = Y(isB ? 1 - a : a); t === 0 ? g2.moveTo(x, y) : g2.lineTo(x, y); } g2.stroke(); g2.setLineDash([]); });
          const te = w.tEq ? w.tEq(m) : 99; if (tc >= te) { g2.strokeStyle = col; g2.lineWidth = 2; g2.beginPath(); g2.moveTo(X(te), T); g2.lineTo(X(te), H - B); g2.stroke(); g2.textAlign = 'left'; g2.fillStyle = col; g2.fillText('평형 약 ' + Math.round(te) + ' s', X(te) + 5, T + 18 + (m ? 22 : 0)); }
        });
      }

      /* 지금 2D 화면의 촉매 */
      function read() {
        const w = W(), S = w && w.S; if (!S) return;
        if (S.mode === 'en') { cat = !!S.en.cat; catName = cat ? '촉매 있음' : '촉매 없음'; }
        else if (S.mode === 'eq') { cat = S.eq.mode !== 0; catName = S.eq.mode === 2 ? '촉매 있음 · 없음 비교' : cat ? '촉매 있음' : '촉매 없음'; }
        else if (S.mode === 'exp' && w.CATS) { const c = w.CATS[S.ex.sel]; cat = S.ex.sel > 0; catName = c ? c.name : '촉매 없음'; }
      }
      return {
        update(dt, t) {
          read();
          { const S = W() && W().S, on = !!(S && S.mode === 'eq'); box.style.display = on ? '' : 'none'; if (on) drawEq(); }
          if (!pl.playing && pl.p === 0) prog = 0;
          const st = apply(Math.min(4, prog), t);
          const body = !cat ? '촉매가 없으면 H₂O₂ 분자끼리 Eₐ(75 kJ) 이상의 에너지로 부딪혀야 해서 반응이 거의 일어나지 않아요.' : [
            'H₂O₂ 두 분자가 촉매 표면 가까이 와요.', '표면에 달라붙어요(흡착). 분자 안의 결합이 약해져요.', 'O–O 결합이 끊어져요.', 'H가 옮겨 가 H₂O가 되고, O 원자 둘이 만나 O₂가 돼요.', '생성물 2H₂O와 O₂가 떨어져 나가요. 촉매는 그대로 남아요.'][st];
          const tx = '<b>2 H₂O₂ → 2 H₂O + O₂</b> · ' + catName + '<br><b>' + (cat ? (st + 1) + '단계 · ' + STAGES[st] : '촉매 없음') + '</b><br>' + body + '<br>' + (cat ? '촉매 Eₐ 50 kJ (없을 때 75 kJ) · ΔH −196 kJ 그대로' : 'Eₐ 75 kJ · ΔH −196 kJ');
          if (tx !== txt) { txt = tx; info(tx); }
        },
      };
    },
  });
})();
