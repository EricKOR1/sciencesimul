/* hr-electroplating · 3D 구리 도금 (철 열쇠에 구리 입히기)
   (+)극 구리판: Cu → Cu²⁺ + 2e⁻ (산화, 녹아요) · (−)극 열쇠: Cu²⁺ + 2e⁻ → Cu (환원, 달라붙어요).
   1단계(도금 실험)는 3D 막대 단추로 부품을 놓고(2D의 plPlace · plRemove를 그대로 불러요) 연결 · 진행(%)을 보여 줘요.
   2단계(석출 분석)는 캔버스 그래프를 읽어야 해서 2D예요 (석출 분석 장면 코드는 남겨 두었어요). 3 · 4단계도 2D 화면이에요.
   전류가 셀수록 같은 시간에 더 많이 도금돼요 (석출량 ∝ 전하량). 시간은 빠르게 돌린 모형이에요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const BR = 3.4, BH = 3.8, FY = -2.5, AX = -2.0, KX = 1.9, WATER = 0.82;

  window.SciSim3D.attach({
    title: '구리 도금 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: PHONE ? 19 : 13.5, theta: 0.3, phi: 1.22, min: 8, max: 28, target: [0, 1.0, 0] },
    autoRotate: 0.06,
    levels: [0],
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const V3 = THREE.Vector3;
      const mat = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.4, metalness: 0.05 }, o || {}));
      let power = true, cur = 2, plated = 0;
      const gl = new THREE.Mesh(new THREE.CylinderGeometry(BR, BR, BH, 56, 1, true), new THREE.MeshStandardMaterial({ color: 0xcfe8ff, transparent: true, opacity: 0.16, roughness: 0.08, side: THREE.DoubleSide, depthWrite: false })); gl.position.y = FY + BH / 2; root.add(gl);
      const bt = new THREE.Mesh(new THREE.CylinderGeometry(BR, BR, 0.14, 56), mat(0xbcd0e6, { transparent: true, opacity: 0.5 })); bt.position.y = FY; root.add(bt);
      const top = FY + BH * WATER;
      const liq = new THREE.Mesh(new THREE.CylinderGeometry(BR - 0.04, BR - 0.04, BH * WATER, 56), mat(0x3b9bff, { transparent: true, opacity: 0.36, roughness: 0.15, depthWrite: false })); liq.position.y = FY + BH * WATER / 2; root.add(liq);
      /* 양극: 구리판 */
      const anode = new THREE.Mesh(new THREE.BoxGeometry(0.3, 4.2, 2.0), mat(0xd9824c, { metalness: 0.85, roughness: 0.3 })); anode.position.set(AX, FY + 2.2, 0); root.add(anode);
      const eTop = FY + 2.2 + 2.1;
      /* 음극: 열쇠 (머리 고리 + 몸통 + 이빨) — 한 그룹 */
      const keyMat = mat(0xaab4c4, { metalness: 0.85, roughness: 0.35 });
      const key = new THREE.Group(); key.position.set(KX, top - 0.5, 0); key.scale.setScalar(1.15); root.add(key);
      const head = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.2, 20, 48), keyMat); head.position.set(0, 0.45, 0); key.add(head);
      const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.34, 2.6, 0.26), keyMat); shaft.position.set(0, -1.4, 0); key.add(shaft);
      [[-2.55, 0.42], [-2.15, 0.3], [-1.75, 0.4]].forEach(([y, l]) => { const t = new THREE.Mesh(new THREE.BoxGeometry(l, 0.24, 0.26), keyMat); t.position.set(0.17 + l / 2, y, 0); key.add(t); });
      const clip = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.2, 10), mat(0xd18a3a, { metalness: 0.7, roughness: 0.35 })); clip.position.set(KX, top + 0.5, 0); root.add(clip);
      /* 전지 + 도선 */
      const BY = eTop + 1.7;
      const batt = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 2.4, 28), mat(0x3b82f6, { metalness: 0.4, roughness: 0.4 })); batt.rotation.z = Math.PI / 2; batt.position.set(0, BY, 0); root.add(batt);
      const capP = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.4, 20), mat(0xd1d5db, { metalness: 0.8, roughness: 0.3 })); capP.rotation.z = Math.PI / 2; capP.position.set(-1.4, BY, 0); root.add(capP);
      const wm = mat(0xd18a3a, { metalness: 0.7, roughness: 0.35 });
      const wA = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, BY - eTop, 10), wm); wA.position.set(AX, (BY + eTop) / 2, 0); root.add(wA);
      const wK = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, BY - (top + 1.1), 10), wm); wK.position.set(KX, (BY + top + 1.1) / 2, 0); root.add(wK);
      const hA = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, Math.abs(AX) - 1.2, 10), wm); hA.rotation.z = Math.PI / 2; hA.position.set(-(Math.abs(AX) + 1.2) / 2, BY, 0); root.add(hA);
      const hK = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, KX - 1.2, 10), wm); hK.rotation.z = Math.PI / 2; hK.position.set((KX + 1.2) / 2, BY, 0); root.add(hK);
      /* 전자 (양극 → 전지 → 음극) */
      const NE = 6, emat = mat(0x42e8ff, { emissive: 0x00a9c0, emissiveIntensity: 0.9 });
      const eA = new THREE.InstancedMesh(new THREE.SphereGeometry(0.13, 12, 10), emat, NE), eK = new THREE.InstancedMesh(new THREE.SphereGeometry(0.13, 12, 10), emat, NE); [eA, eK].forEach((m) => { m.frustumCulled = false; root.add(m); });
      /* Cu²⁺ 이온: 양극에서 나와 음극으로 */
      const NC = 18, cm = new THREE.InstancedMesh(new THREE.SphereGeometry(0.2, 18, 14), mat(0x1e6fe0, { roughness: 0.3, emissive: 0x1e6fe0, emissiveIntensity: 0.25 }), NC); cm.frustumCulled = false; root.add(cm);
      const rnd = (a, b) => a + Math.random() * (b - a);
      const CP = Array.from({ length: NC }, (_, i) => ({ u: i / NC, y: rnd(FY + 0.7, top - 0.6), z: rnd(-0.9, 0.9), ph: Math.random() * 6 }));
      const M = new THREE.Matrix4();
      const plateShade = new THREE.Color(0xaab4c4), cuC = new THREE.Color(0xd9824c);
      const L = {
        a: label('(+)극 구리판 · 녹아요', anode, { color: 'rgba(217,119,6,.95)', offset: [0, 2.6, 0] }),
        k: label('(−)극 철 열쇠 · 도금돼요', key, { color: 'rgba(37,99,235,.95)', offset: [0.6, 1.5, 0] }),
        s: label('CuSO₄ 수용액', [0, FY + 0.3, BR], { color: 'rgba(30,41,59,.85)' }),
        i: label('Cu²⁺ →', [0, top - 0.5, 0], { color: 'rgba(30,111,224,.92)' }),
      };
      let showLab = true, txt = '';
      /* 부품 놓기: 2D에서 카드를 끌어 놓던 일을 3D 막대 단추로 해요 (slot L = (−)극, R = (+)극) */
      const W = () => window.__sim || null;
      const putEl = (id, side) => { const w = W(); if (!w) return; const p = w.S.pl; if (p.run) { w.plPower(); }
        if (p.slot[side] === id) return; if (w.S.pl.on[id]) w.plRemove(id); if (p.slot[side]) w.plRemove(p.slot[side]); w.plPlace(id, side); };
      const putPart = (id) => { const w = W(); if (w && !w.S.pl.on[id]) w.plPlace(id); };
      const pcEls = [];
      const pc = (el) => { pcEls.push(el); return el; };
      pc(controls.text('<b>부품 놓기</b>'));
      const bSol = pc(controls.button('CuSO₄ 수용액', () => putPart('sol'))), bPwr = pc(controls.button('전원 · 전류계', () => putPart('pwr')));
      pc(controls.text('(−)극에')); const bKc = pc(controls.button('구리판', () => putEl('cu', 'L'))), bKk = pc(controls.button('철 열쇠', () => putEl('key', 'L')));
      pc(controls.text('(+)극에')); const bAc = pc(controls.button('구리판', () => putEl('cu', 'R'))), bAk = pc(controls.button('철 열쇠', () => putEl('key', 'R')));
      let pcSig = '';
      function updPc(on) {
        pcEls.forEach((e) => { e.style.display = on ? '' : 'none'; }); if (!on) return;
        const p = W().S.pl, sig = [p.on.sol, p.on.pwr, p.slot.L, p.slot.R].join(); if (sig === pcSig) return; pcSig = sig;
        bSol.classList.toggle('on', !!p.on.sol); bPwr.classList.toggle('on', !!p.on.pwr);
        bKc.classList.toggle('on', p.slot.L === 'cu'); bKk.classList.toggle('on', p.slot.L === 'key'); bAc.classList.toggle('on', p.slot.R === 'cu'); bAk.classList.toggle('on', p.slot.R === 'key');
      }
      const cuW = [], pwrObjs = [batt, capP, wA, wK, hA, hK];
      /* 놓인 자리에 따라 구리판 · 열쇠 · 용액 · 전원을 보여 줘요 (L = (−)극 = 오른쪽 KX, R = (+)극 = 왼쪽 AX) */
      function layout(p) {
        const xOf = (id) => (p.slot.L === id ? KX : p.slot.R === id ? AX : null);
        const xc = xOf('cu'), xk = xOf('key');
        anode.visible = xc != null; if (xc != null) anode.position.x = xc;
        key.visible = xk != null; clip.visible = xk != null; if (xk != null) { key.position.x = xk; clip.position.x = xk; }
        liq.visible = !!p.on.sol; pwrObjs.forEach((o) => { o.visible = !!p.on.pwr; });
        setT(L.a, xc === KX ? '(−)극 구리판 · 구리가 붙어요' : '(+)극 구리판 · 녹아요'); setT(L.k, xk === AX ? '(+)극 철 열쇠 · 녹아 버려요' : '(−)극 철 열쇠 · 도금돼요');
        L.a.show(showLab && xc != null); L.k.show(showLab && xk != null); L.s.show(showLab && !!p.on.sol); L.i.show(showLab && !!p.on.sol);
      }
      function fullLayout() { anode.visible = key.visible = clip.visible = liq.visible = true; anode.position.x = AX; key.position.x = KX; clip.position.x = KX; pwrObjs.forEach((o) => { o.visible = true; }); setT(L.a, '(+)극 구리판 · 녹아요'); setT(L.k, '(−)극 철 열쇠 · 도금돼요'); Object.values(L).forEach((l) => l.show(showLab)); }
      const setT = (l, t) => { if (l._t !== t) { l._t = t; l.set(t); } };
      const lb = controls.button('이름표 ✓', () => { showLab = !showLab; lb.classList.toggle('on', showLab); lb.textContent = '이름표 ' + (showLab ? '✓' : '✕'); Object.values(L).forEach((l) => l.show(showLab)); }); lb.classList.add('on');
      let pw = 0, info2 = '';
      return {
        update(dt, t) {
          dt = Math.min(dt, 0.05);
          const w = window.__sim, S2 = w && w.S, md = S2 ? S2.mode : '';
          info2 = '';
          updPc(md === 'plate' && !!(S2 && S2.pl));
          let bad = false; const ax = AX, kx = KX;
          if (md === 'plate' && S2.pl) { layout(S2.pl); bad = w.plMode() === 'bad'; } else fullLayout();
          if (md === 'analysis' && S2.an) { const a = S2.an; power = a.t > 0; cur = a.I >= 1 ? 3 : a.I >= 0.5 ? 2 : 1; plated = Math.min(1, w.anMass() / (w.massCu(1, 20) || 1)); info2 = '<br>전류 <b>' + a.I + ' A</b> · 시간 <b>' + Math.round(a.ts) + '분</b> → 석출한 Cu <b>' + w.anMass().toFixed(3) + ' g</b>'; }
          else if (md === 'plate' && S2.pl) { const p = S2.pl; power = !!p.flow && p.flow > 0.05 || (p.run && w.plMode() === 'good'); plated = p.pc; cur = 2; power = !!p.flow && p.flow > 0.05; info2 = bad ? '<br><b>열쇠가 (+)극</b>이라 열쇠의 철이 녹아 나가고, 구리는 (−)극 구리판에 붙어요.' : '<br>도금 진행 ' + Math.round(p.pc * 100) + ' %' + (w.plN() < 4 ? ' · 부품 ' + w.plN() + ' / 4개 (아래 단추로 놓아요)' : ''); }
          else { power = false; }
          pw += ((power ? 1 : 0) - pw) * Math.min(1, dt * 4);
          keyMat.color.copy(plateShade).lerp(cuC, Math.min(1, plated * 1.4)); keyMat.metalness = 0.85;
          const pd = md === 'plate' && S2.pl ? S2.pl.pd || 0 : 0;
          const k = 1.15 * (1 + plated * 0.06) * (1 - pd * 0.35); key.scale.set(k, k, k);
          anode.scale.set(bad ? 1 + pd * 0.4 : 1 - plated * 0.4, 1, 1);
          for (let i = 0; i < NE; i++) {
            const u = (i / NE + t * 0.22 * pw * (0.6 + cur * 0.25)) % 1;
            if (pw < 0.05) { M.makeScale(0.0001, 0.0001, 0.0001); eA.setMatrixAt(i, M); eK.setMatrixAt(i, M); continue; }
            M.makeTranslation(ax, eTop + u * (BY - eTop), 0); eA.setMatrixAt(i, M); M.makeTranslation(kx, BY - u * (BY - top - 1.1), 0); eK.setMatrixAt(i, M);
          }
          eA.instanceMatrix.needsUpdate = true; eK.instanceMatrix.needsUpdate = true;
          CP.forEach((q, i) => {
            if (pw < 0.05) { M.makeScale(0.0001, 0.0001, 0.0001); cm.setMatrixAt(i, M); return; }
            q.u = (q.u + dt * 0.14 * (0.5 + cur * 0.3) * pw) % 1;
            const s = Math.min(1, Math.sin(Math.PI * q.u) * 2.2) + 0.001;
            M.makeScale(s, s, s); M.setPosition(ax + Math.sign(kx - ax) * 0.4 + (kx - ax - Math.sign(kx - ax) * 0.8) * q.u, q.y + Math.sin(t * 2 + q.ph) * 0.12, q.z + Math.cos(t * 1.7 + q.ph) * 0.1); cm.setMatrixAt(i, M);
          });
          cm.instanceMatrix.needsUpdate = true;
          const tx = !power ? '<b>전류가 흐르지 않아요</b><br>회로를 연결하고 전원을 켜면 도금이 시작돼요.'+info2 : '<b>도금 ' + Math.round(plated * 100) + '%</b> · ' + ['약한', '보통', '센'][cur - 1] + ' 전류<br>(+)극: Cu → Cu²⁺ + 2e⁻ (산화)<br>(−)극: Cu²⁺ + 2e⁻ → Cu (환원) · 전류가 셀수록 빨리 입혀져요' + info2;
          if (tx !== txt) { txt = tx; info(tx); }
        },
      };
    },
  });
})();
