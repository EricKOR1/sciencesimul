/* hc-dynamic-eq · 3D 동적 평형
   닫힌 용기에서 N₂O₄ ⇌ 2NO₂ 가 계속 일어나요. 2D 실험의 입자(분자 세기 · 속도 그래프 · 표지 원자)와 농도 변화(농도 일정)를 그대로 따라가요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const phone = window.matchMedia && window.matchMedia('(max-width: 599px)').matches;
  window.SciSim3D.attach({
    title: '동적 평형 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대 · 반응 시작과 뚜껑은 2D와 똑같이 이어져요',
    camera: { dist: phone ? 15 : 12, theta: 0.5, phi: 1.1, min: 5, max: 24, target: [0, 1.5, 0] },
    autoRotate: 0.1,
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const clamp = (x, a, b) => Math.max(a, Math.min(b, x)), sm = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
      const PU = 0.0003;
      const SG = new THREE.SphereGeometry(1, 16, 12);
      const MAT = {
        D: new THREE.MeshStandardMaterial({ color: 0xeaf1ff, roughness: 0.35, transparent: true, opacity: 0.92 }),
        M: new THREE.MeshStandardMaterial({ color: 0xa65a2a, roughness: 0.45 }),
        Dt: new THREE.MeshStandardMaterial({ color: 0xff3b3b, emissive: 0x991111, emissiveIntensity: 0.5, roughness: 0.35 }),
        Mt: new THREE.MeshStandardMaterial({ color: 0xff3b3b, emissive: 0x991111, emissiveIntensity: 0.5, roughness: 0.45 }),
      };
      const floor = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0x050b18 })); floor.scale.set(15, 0.1, 11); floor.position.y = -0.06; root.add(floor);
      const dum = new THREE.Object3D();
      function makeBox() {
        const g = new THREE.Group(); root.add(g);
        const glass = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0x9ec5ff, transparent: true, opacity: 0.1, roughness: 0.15, depthWrite: false }));
        const edge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)), new THREE.LineBasicMaterial({ color: 0xcfe0ff, transparent: true, opacity: 0.75 }));
        const lid = new THREE.Mesh(new THREE.BoxGeometry(1, 0.14, 1), new THREE.MeshStandardMaterial({ color: 0x8a95a8, roughness: 0.5, transparent: true, opacity: 0.45 }));
        g.add(glass, edge, lid);
        const mk = (key, n, rx, ry) => { const m = new THREE.InstancedMesh(SG, MAT[key], n); m.frustumCulled = false; m.userData = { rx, ry }; g.add(m); return m; };
        const B = { g, glass, edge, lid, D: mk('D', 130, 0.2, 0.13), M: mk('M', 230, 0.12, 0.12), Dt: mk('Dt', 130, 0.2, 0.13), Mt: mk('Mt', 130, 0.12, 0.12), W: 4, H: 3, Dp: 3, w: [] };
        for (let i = 0; i < 480; i++) B.w.push({ u: Math.random(), v: Math.random(), y: Math.random(), du: Math.random() * 2 - 1, dv: Math.random() * 2 - 1, dy: Math.random() * 2 - 1 });
        B.label = label('', [0, 0, 0], { size: 12.5 });
        return B;
      }
      const boxes = [makeBox(), makeBox()];
      function layout(B, x, z, W, H, D) {
        B.W = W; B.H = H; B.Dp = D; B.g.position.set(x, 0, z);
        B.glass.scale.set(W, H, D); B.glass.position.y = H / 2; B.edge.scale.copy(B.glass.scale); B.edge.position.y = H / 2;
        B.lid.scale.set(W * 0.9, 1, D * 0.9);
      }
      const setInst = (B, key, list, tNow) => {
        const m = B[key]; let i = 0;
        list.forEach((o) => { if (i >= m.count) return; dum.position.set((o.u - 0.5) * (B.W - 0.5), 0.25 + o.y * (B.H - 0.5) + Math.sin(tNow * 1.3 + i) * 0.05, (o.v - 0.5) * (B.Dp - 0.5)); dum.scale.set(m.userData.rx * (o.s == null ? 1 : o.s), m.userData.ry * (o.s == null ? 1 : o.s), m.userData.ry * (o.s == null ? 1 : o.s)); dum.rotation.set(o.a || 0, o.a || 0, 0); dum.updateMatrix(); m.setMatrixAt(i++, dum.matrix); });
        m.userData.n = i; dum.scale.set(0, 0, 0); dum.updateMatrix(); for (let k = i; k < m.count; k++) m.setMatrixAt(k, dum.matrix); m.instanceMatrix.needsUpdate = true;
      };
      const yOf = (id) => { const x = Math.sin(id * 12.9898) * 43758.5453; return x - Math.floor(x); };
      const lblT = label('N₂O₄ ⇌ 2NO₂', [0, 4.2, 0], { size: 13.5 });
      function walk(B, n, speed, dt) {
        for (let i = 0; i < n; i++) {
          const q = B.w[i]; q.du += (Math.random() - 0.5) * dt * 8; q.dv += (Math.random() - 0.5) * dt * 8; q.dy += (Math.random() - 0.5) * dt * 8;
          const l = Math.hypot(q.du, q.dv, q.dy) || 1; q.du /= l; q.dv /= l; q.dy /= l;
          q.u += q.du * speed * dt; q.v += q.dv * speed * dt; q.y += q.dy * speed * dt;
          ['u', 'v', 'y'].forEach((c, ci) => { const d = ['du', 'dv', 'dy'][ci]; if (q[c] < 0.05) { q[c] = 0.05; q[d] = Math.abs(q[d]); } else if (q[c] > 0.95) { q[c] = 0.95; q[d] = -Math.abs(q[d]); } });
        }
      }
      /* ▶ 재생: 농도 일정 단계에서 시간이 흘러요 */
      let own = false, sig = '', pC = 0;
      const rowOf = () => { const r = document.querySelectorAll('.v3-player'); return r[r.length - 1]; };
      const pl = controls.player({ duration: 10, loop: true, label: '시간 흐르기', phases: [[0, '0초'], [0.2, '10초'], [0.4, '20초'], [0.6, '40초'], [0.85, '60초 · 평형'], [0.93, '처음으로']], onFrame(p) { pC = p; own = p > 0; } });
      const rowP = rowOf();
      const tOf = (p) => 60 * clamp(p / 0.85, 0, 1);

      return {
        update(dt, t) {
          const Z = ctx.lesson(); if (!Z) return; dt = Math.min(dt, 0.05);
          const S = Z.S, mode = S.mode, BX = Z.BX;
          const conc = mode === 'conc';
          rowP.style.display = conc ? '' : 'none'; if (!conc && pl.playing) pl.pause();
          const sg = [mode, S.cc.A.run, S.cc.B.run, S.cc.A.ts, S.cc.B.ts].join('|'); if (sg !== sig) { sig = sg; if (own) { own = false; pl.pause(); pl.set(0); } }
          const fade = own ? (pC < 0.93 ? sm(pC / 0.04) : 1 - sm((pC - 0.93) / 0.07)) : 1;
          if (conc) {
            const lay = phone ? [[0, -2.6], [0, 2.4]] : [[-3.4, 0], [3.4, 0]], W = phone ? 4.4 : 4.4;
            const names = ['㉠ N₂O₄만 넣고 시작', '㉡ NO₂만 넣고 시작'];
            const tA = own ? tOf(pC) : S.cc.A.ts, tB = own ? tOf(pC) : S.cc.B.ts;
            let txt = '';
            boxes.forEach((B, bi) => {
              B.g.visible = true; B.lid.visible = true; layout(B, lay[bi][0], lay[bi][1], W, 3.0, phone ? 3.0 : 3.4); B.lid.position.y = B.H + 0.07;
              const tt = bi ? tB : tA, v = Z.valAt ? Z.valAt(bi ? 'B' : 'A', tt) : null;
              const nN = Math.round((bi ? Z.cBN(tt) : Z.cAN(tt)) / PU * fade), nM = Math.round((bi ? Z.cBM(tt) : Z.cAM(tt)) / PU * fade);
              walk(B, 400, 0.6, dt);
              setInst(B, 'D', B.w.slice(0, Math.min(nN, 130)), t); setInst(B, 'M', B.w.slice(200, 200 + Math.min(nM, 230)), t); setInst(B, 'Dt', [], t); setInst(B, 'Mt', [], t);
              B.label.obj = [lay[bi][0], B.H + 0.5, lay[bi][1]]; B.label.set(names[bi] + '<br>N₂O₄ ' + nN + '개 · NO₂ ' + nM + '개'); B.label.show(true);
              txt += '<br>' + names[bi] + ' · ' + Math.round(tt) + '초: N₂O₄ ' + nN + '개, NO₂ ' + nM + '개';
            });
            lblT.show(false);
            info('<b>같은 온도의 밀봉 플라스크 두 개</b> (N₂O₄(무색) ⇌ 2NO₂(갈색))' + txt + '<br>출발이 달라도 시간이 지나면 두 플라스크의 입자 수가 일정해져요.');
            return;
          }
          // 분자 세기 · 속도 그래프 · 동적 평형: 2D의 입자를 그대로 보여 줘요
          const B0 = boxes[0], B1 = boxes[1]; B1.g.visible = false; B1.label.show(false); B0.label.show(false); setInst(B1, 'D', [], t); setInst(B1, 'M', [], t);
          layout(B0, 0, 0, 5.4, 3.4, 4.2); B0.g.visible = true; B0.lid.visible = !!BX.lid; B0.lid.position.set(BX.lidOpen ? 1.6 : 0, B0.H + (BX.lidOpen ? 0.5 : 0.07), 0); B0.lid.rotation.z = BX.lidOpen ? 0.25 : 0;
          const Ds = [], Ms = [], Dt = [], Mt = [];
          BX.mols.forEach((o) => {
            const rec = { u: o.u, v: o.v, y: yOf(o.id), s: o.k === 'D' ? o.grow : 1, a: o.ang };
            if (o.k === 'D') (o.tags && (o.tags[0] || o.tags[1]) && mode === 'tag' ? Dt : Ds).push(rec); else (o.tag && mode === 'tag' ? Mt : Ms).push(rec);
          });
          setInst(B0, 'D', Ds, t); setInst(B0, 'M', Ms, t); setInst(B0, 'Dt', Dt, t); setInst(B0, 'Mt', Mt, t);
          const r = BX.rates(), nD = Ds.length + Dt.length, nM = Ms.length + Mt.length, eq = Math.abs(r.Rf - r.Rr) < 0.6;
          lblT.show(true); lblT.obj = [0, B0.H + 0.55, 0];
          let extra = '';
          if (mode === 'tag') { const tc = BX.tagCount(); extra = '<br><span style="color:#ff6b6b">빨간 원자</span>는 N₂O₄와 NO₂를 오가며 계속 움직여요 (N₂O₄ 안 ' + tc.inD + '개 · NO₂ 안 ' + tc.inM + '개).'; }
          if (mode === 'rate' && BX.lid) extra = '<br>뚜껑이 ' + (BX.lidOpen ? '<b>열려</b> NO₂가 새어 나가요 (닫힌 계가 아니에요).' : '닫혀 있어요 (밀봉 용기).');
          info('N₂O₄(무색) <b>' + nD + '개</b> · NO₂(갈색) <b>' + nM + '개</b><br>정반응 <b style="color:#ffaa33">' + r.Rf.toFixed(1) + '회/초</b> · 역반응 <b style="color:#5de2ff">' + r.Rr.toFixed(1) + '회/초</b><br>' + (eq ? '<b>정반응 속도 = 역반응 속도 → 동적 평형</b> (입자 수는 일정, 반응은 계속)' : '정반응이 더 빨라 N₂O₄가 줄고 NO₂가 늘어요.') + extra);
        },
      };
    },
  });
})();
