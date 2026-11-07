/* hb-nervous-system · 3D 사람의 신경계 (대뇌의 엽 · 뇌 줄기와 소뇌 · 말초 신경)
   2D 차시와 같은 내용·색: 대뇌의 네 엽(2D에서 고른 엽의 기능), 뇌 줄기(간뇌·중간뇌·뇌교·연수)·소뇌·척수(2D에서 고른 부위의 기능),
   말초 신경은 평상시·교감·부교감 신경에 따른 동공·심장·기관지·위·소장·방광의 반응(2D와 같은 값)을 보여 줘요. 2D 화면과 서로 따라가요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const narrow = window.innerWidth < 600 || window.innerHeight > window.innerWidth * 1.1;
  const LOBE = { f: 0xef6c6c, p: 0xf2c14e, t: 0x5aa9e6, o: 0xa98bf0 };   // 2D 차시와 같은 엽 색 (전두엽 빨강 · 두정엽 노랑 · 측두엽 파랑 · 후두엽 보라)
  const L2 = () => window.__sim || null;

  window.SciSim3D.attach({
    title: '사람의 신경계 3D',
    hint: '드래그: 돌리기 · 모드를 눌러 부위와 신경을 살펴봐요',
    camera: { dist: narrow ? 13 : 9.5, theta: -0.15, phi: 1.3, min: 5, max: 20, target: [0, 0.8, 0] },
    autoRotate: 0.15,
    levels: [3],   // 3단계(말초 신경): 자율 신경 단추와 비교표 카드 단추로 해요. 분류 트리 · 대뇌(2D 화면도 돌려 보는 단면 모형) · 부위 카드 단계는 2D
    build(ctx) {
      const { THREE, root, label, info, controls, orbit } = ctx;
      const V = THREE.Vector3, V3 = (x, y, z) => new V(x, y, z || 0);
      const std = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.5, metalness: 0.02 }, o || {}));
      const ghost = (c, op, o) => std(c, Object.assign({ transparent: true, opacity: op, depthWrite: false, roughness: 0.25 }, o || {}));
      const tube = (pts, r, m, seg) => new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), seg || 40, r, 10), m);
      const G = new THREE.Group(); root.add(G);                 // 몸 전체 (모드에 따라 크기·위치 바뀜)
      const brain = new THREE.Group(); G.add(brain);
      const anch = (x, y, z, p) => { const o = new THREE.Object3D(); o.position.set(x, y, z); (p || brain).add(o); return o; };

      /* 대뇌 */
      const A = 2.15, B = 1.5, C = 1.6;
      const cg = new THREE.SphereGeometry(1, 128, 88), pos = cg.attributes.position, col = new Float32Array(pos.count * 3), c3 = new THREE.Color();
      const sm = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
      for (let i = 0; i < pos.count; i++) {
        let x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
        const ux = x, uy = y, uz = z;
        const n = Math.sin(9 * x + 2 * y) * Math.sin(8 * z - 3 * x) * 0.5 + Math.sin(13 * y + 5 * z) * Math.sin(10 * x + 1) * 0.35 + Math.sin(7 * z + 4 * y) * 0.2;
        let k = 1 + 0.032 * n; if (uy > 0.2) k *= 1 - 0.1 * Math.exp(-Math.pow(uz / 0.07, 2)) * sm(0.2, 0.55, uy);
        x *= k; y *= k; z *= k; y = y < -0.45 ? -0.45 - (-0.45 - y) * 0.55 : y;
        pos.setXYZ(i, x * A, y * B, z * C);
        // 엽 구분 (앞: 전두엽 · 위 가운데: 두정엽 · 뒤: 후두엽 · 옆 아래: 측두엽)
        const cs = ux + 0.18 * uy, lat = uy - (-0.02 - 0.22 * ux);
        const wf = sm(0.2, 0.3, cs), wo = 1 - sm(-0.62, -0.5, ux), wt = (1 - sm(-0.02, 0.1, lat + 0.02)) * (1 - wf) * (1 - wo) * sm(-0.7, -0.5, ux + 0.25);
        let r = LOBE.p, g = 0, b = 0;
        c3.set(LOBE.p); const cp = c3.clone();
        c3.set(LOBE.f); const cf = c3.clone(); c3.set(LOBE.o); const co = c3.clone(); c3.set(LOBE.t); const ct = c3.clone();
        const cc = cp.clone().lerp(ct, wt).lerp(co, wo).lerp(cf, wf);
        col[i * 3] = cc.r; col[i * 3 + 1] = cc.g; col[i * 3 + 2] = cc.b;
      }
      cg.setAttribute('color', new THREE.BufferAttribute(col, 3)); cg.computeVertexNormals();
      const lobeM = std(0xffffff, { vertexColors: true, roughness: 0.55 }), shellM = ghost(0xf0a0b4, 0.22, { roughness: 0.3, side: THREE.DoubleSide });
      const cerebrum = new THREE.Mesh(cg, lobeM); cerebrum.position.set(0.15, 0.7, 0); brain.add(cerebrum);
      /* 소뇌 (가로 주름) */
      const cbg = new THREE.SphereGeometry(1, 64, 44), cp2 = cbg.attributes.position;
      for (let i = 0; i < cp2.count; i++) { const x = cp2.getX(i), y = cp2.getY(i), z = cp2.getZ(i), k = 1 + 0.045 * Math.sin(y * 34); cp2.setXYZ(i, x * k * 0.95, y * k * 0.58, z * k * 1.05); }
      cbg.computeVertexNormals();
      const cb = new THREE.Mesh(cbg, std(0x6fc76a, { roughness: 0.6 })); cb.position.set(-1.15, -0.95, 0); brain.add(cb);
      /* 뇌 줄기 : 간뇌 · 중간뇌 · 뇌교 · 연수 · 척수 */
      const mDien = std(0xf5a65b, { roughness: 0.4 }), mMid = std(0x2bb5a0, { roughness: 0.4 }), mPons = std(0xe0b34a, { roughness: 0.4 }), mMed = std(0x9a7fe0, { roughness: 0.4 }), mCord = std(0x6aa0dd, { roughness: 0.4 });
      const dien = new THREE.Mesh(new THREE.SphereGeometry(0.62, 32, 22), mDien); dien.scale.set(1.2, 0.85, 1.0); dien.position.set(0.2, -0.05, 0); brain.add(dien);
      const mid = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.3, 0.55, 24), mMid); mid.position.set(0.05, -0.7, 0); mid.rotation.z = 0.2; brain.add(mid);
      const pons = new THREE.Mesh(new THREE.SphereGeometry(0.5, 28, 20), mPons); pons.scale.set(1, 0.85, 1.05); pons.position.set(-0.08, -1.2, 0.05); brain.add(pons);
      const med = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.3, 0.9, 24), mMed); med.position.set(-0.22, -1.85, 0); med.rotation.z = 0.12; brain.add(med);
      const cord = tube([V3(-0.28, -2.3), V3(-0.3, -4.0), V3(-0.3, -6.2), V3(-0.3, -7.2)], 0.2, mCord, 40); brain.add(cord);
      const cordS = tube([V3(-0.28, -2.3), V3(-0.3, -3.2), V3(-0.3, -3.9)], 0.2, mCord, 16); brain.add(cordS);

      /* 말초 신경 (몸 전체) */
      const body = new THREE.Group(); G.add(body);
      const silM = ghost(0x9fc4ff, 0.1, { side: THREE.DoubleSide, roughness: 0.2 });
      const head = new THREE.Mesh(new THREE.SphereGeometry(1, 36, 24), silM); head.scale.set(2.7, 2.5, 2.2); head.position.set(0.1, 0.5, 0); body.add(head);
      const torso = new THREE.Mesh(new THREE.CapsuleGeometry(2.5, 5.0, 8, 24), silM); torso.scale.z = 0.55; torso.position.set(-0.3, -6.2, 0); body.add(torso);
      [[-1, 'a'], [1, 'a']].forEach(([s]) => { const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.55, 4.8, 6, 16), silM); arm.position.set(s * 3.55 - 0.3, -6.2, 0); body.add(arm); const lg = new THREE.Mesh(new THREE.CapsuleGeometry(0.85, 6.2, 6, 16), silM); lg.position.set(s * 1.0 - 0.3, -12.3, 0); body.add(lg); });
      const nerveM = std(0xffd34d, { emissive: 0x6a4a00, emissiveIntensity: 0.4, roughness: 0.4 }), autoM = std(0x2bb5a0, { emissive: 0x0b4a40, emissiveIntensity: 0.4 });
      const curves = [];
      [-1, 1].forEach((s) => {
        const arm = new THREE.CatmullRomCurve3([V3(-0.3, -3.6), V3(s * 1.6 - 0.3, -3.55, 0.1), V3(s * 3.2 - 0.3, -4.6, 0.1), V3(s * 3.5 - 0.3, -6.6), V3(s * 3.55 - 0.3, -8.8)]);
        const leg = new THREE.CatmullRomCurve3([V3(-0.3, -7.1), V3(s * 0.9 - 0.3, -8.2, 0.05), V3(s * 1.1 - 0.3, -10.8), V3(s * 1.0 - 0.3, -13.6), V3(s * 1.0 - 0.3, -15.0)]);
        [arm, leg].forEach((c) => { body.add(new THREE.Mesh(new THREE.TubeGeometry(c, 60, 0.07, 8), nerveM)); curves.push(c); });
      });
      for (let k = 0; k < 8; k++) { const y = -3.1 - k * 0.5; [-1, 1].forEach((s) => body.add(tube([V3(-0.3, y), V3(-0.3 + s * 0.6, y - 0.1, 0.1), V3(-0.3 + s * 1.3, y - 0.25, 0.15)], 0.035, nerveM, 12))); }
      // 자율 신경 : 심장 · 위
      const heart = new THREE.Mesh(new THREE.SphereGeometry(0.42, 24, 16), std(0xd7263d, { roughness: 0.4 })); heart.position.set(0.4, -4.2, 0.45); body.add(heart);
      const stom = new THREE.Mesh(new THREE.SphereGeometry(0.5, 24, 16), std(0xe8918a, { roughness: 0.4 })); stom.scale.set(1.3, 0.8, 0.9); stom.position.set(0.6, -6.0, 0.4); body.add(stom);
      const eyes = [-1, 1].map((s) => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.34, 20, 14), std(0xffffff, { roughness: 0.3 })); e.position.set(0.1 + s * 0.85, 0.75, 2.05); body.add(e); const pu = new THREE.Mesh(new THREE.CircleGeometry(1, 24), std(0x1a1a2a, { roughness: 0.2 })); pu.position.set(0, 0, 0.345); e.add(pu); return pu; });
      const bronchM = std(0x9fd6e8, { roughness: 0.4 });
      const bronch = new THREE.Group(); bronch.position.set(-0.3, -3.8, 0.35); body.add(bronch);
      bronch.add(tube([V3(0, 0.6), V3(0, 0.1)], 0.08, bronchM, 6), tube([V3(0, 0.1), V3(-0.3, -0.2, 0), V3(-0.7, -0.6)], 0.06, bronchM, 10), tube([V3(0, 0.1), V3(0.3, -0.2, 0), V3(0.7, -0.6)], 0.06, bronchM, 10));
      const gut = new THREE.Mesh(new THREE.TorusKnotGeometry(0.34, 0.1, 80, 10, 2, 3), std(0xf2b79a, { roughness: 0.45 })); gut.position.set(-0.3, -7.2, 0.35); body.add(gut);
      const bladder = new THREE.Mesh(new THREE.SphereGeometry(0.34, 20, 14), std(0xf0dc8a, { roughness: 0.4 })); bladder.position.set(-0.3, -8.5, 0.3); body.add(bladder);
      body.add(tube([V3(-0.3, -3.7), V3(0.0, -3.9, 0.3), V3(0.35, -4.0, 0.42)], 0.05, autoM, 16), tube([V3(-0.3, -4.5), V3(0.1, -5.2, 0.3), V3(0.5, -5.8, 0.4)], 0.05, autoM, 20));
      const NPT = 16, pulseI = new THREE.InstancedMesh(new THREE.SphereGeometry(0.11, 12, 9), new THREE.MeshBasicMaterial({ color: 0xffffff }), NPT * 2);
      body.add(pulseI);
      const pm = new THREE.Color();

      /* 이름표 */
      const Lb = {
        f: label('전두엽', anch(1.7, 1.0, 0.5), {}), p: label('두정엽', anch(-0.2, 2.15, 0.4)), o: label('후두엽', anch(-1.9, 0.5, 0.4)), t: label('측두엽', anch(0.5, -0.1, 1.55)),
        cb: label('소뇌', cb, { offset: [0, -0.2, 0.9] }),
        di: label('간뇌', dien, { offset: [0.5, 0.2, 0.6] }), mi: label('중간뇌', mid, { offset: [0.5, 0, 0.4] }), po: label('뇌교', pons, { offset: [0.8, -0.05, 0.4] }), me: label('연수', med, { offset: [0.7, 0, 0.3] }), ce: label('대뇌', anch(0.4, 2.1, 0), {}),
        br: label('뇌', anch(0.1, 2.0, 0), {}), co: label('척수', anch(-0.3, -5.2, 0.2), {}), so: label('체성 신경', null, {}), au: label('자율 신경', null, {}), he: label('심장', heart, { offset: [0.7, 0, 0] }), pu: label('동공', eyes[1], { offset: [0.7, 0.2, 0] }), bro: label('기관지', bronch, { offset: [0.9, 0, 0] }), gu: label('소장', gut, { offset: [0.8, 0, 0] }), bl: label('방광', bladder, { offset: [0.7, 0, 0] }), st: label('위', stom, { offset: [0.9, 0, 0] }),
      };
      Lb.so.obj = null;
      const bodyAn = anch(3.9, -6.6, 0.3, body), autoAn = anch(1.3, -5.0, 0.5, body);
      Lb.so.obj = bodyAn; Lb.au.obj = autoAn;
      const SETS = { lobe: ['f', 'p', 'o', 't', 'cb'], stem: ['ce', 'di', 'mi', 'po', 'me', 'cb', 'co'], body: ['br', 'co', 'so', 'au', 'he', 'st', 'pu', 'bro', 'gu', 'bl'] };
      const INFO = {
        lobe: '대뇌 겉질은 <b>전두엽·두정엽·측두엽·후두엽</b>으로 나뉘고 엽마다 맡은 일이 달라요.',
        stem: '<b>뇌 줄기</b>(간뇌·중간뇌·뇌교·연수)와 <b>소뇌</b>는 대뇌 아래에서 몸의 기본 기능과 균형을 조절해요.',
        body: '<b>중추 신경</b>(뇌·척수)과 온몸으로 퍼진 <b>말초 신경</b>이 신호를 주고받아요.<br>파랑: 감각 신호 ↑ · 주황: 운동 신호 ↓',
      };
      let mode = 'lobe', ph = 0, infoKey = '', sz = { s: 1, y: 0, k: 0 }, tgt = { s: 1, y: 0 }, seen2D = '';
      function setMode(m) {
        mode = m; cerebrum.material = m === 'stem' ? shellM : lobeM; cerebrum.renderOrder = m === 'stem' ? 3 : 0;
        Object.keys(Lb).forEach((k) => Lb[k].show(SETS[m].indexOf(k) >= 0));
        body.visible = m === 'body'; cord.visible = m === 'body'; cordS.visible = m !== 'body';
        tgt = m === 'body' ? { s: 0.42, y: 2.65 } : { s: 1, y: 0.4 };
        if (m === 'body') { orbit.dist = narrow ? 15.5 : 12; orbit.ty = 0.5; } else { orbit.dist = narrow ? 13 : 9.5; orbit.ty = 0.8; }
        subCtl.forEach((e) => { e.style.display = m === 'body' ? '' : 'none'; });
        infoKey = '';
      }
      const SC = { lobe: 'cer', stem: 'stem', body: 'per' };
      const segMode = controls.segment('', [{ label: '대뇌의 엽', value: 'lobe' }, { label: '뇌 줄기·소뇌', value: 'stem' }, { label: '말초 신경(몸 전체)', value: 'body' }], 'lobe', (m) => { const L = L2(); if (L) { L.setScene(SC[m]); seen2D = L.S.mode; } setMode(m); });
      const subCtl = [];
      const sg = controls.segment('자율 신경', [{ label: '평상시', value: 'rest' }, { label: '교감', value: 'sym' }, { label: '부교감', value: 'par' }], 'rest', (v) => { const L = L2(); if (L) L.setAuto(v); infoKey = ''; });
      // 자율 신경 조작 요소는 마지막에 추가된 4개 요소(라벨 + 버튼 3개)
      const ctlEl = document.querySelector('.v3-ctl'); if (ctlEl) { const kids = [...ctlEl.children].slice(-4); kids.forEach((e) => subCtl.push(e)); }
      const pl = controls.player({ duration: 6, loop: true, autoplay: true, label: '신경 신호', phases: [[0, '감각 신호 ↑ · 운동 신호 ↓']], onFrame(p) { ph = p; } });
      // 3D 단계(말초 신경)에서는 다른 장면으로 가는 화면 단추를 숨겨요 (화면 위 장면 탭 #modeSeg도 only2d)
      if (ctlEl) [...ctlEl.children].forEach((e) => { if (['대뇌의 엽', '뇌 줄기·소뇌', '말초 신경(몸 전체)'].indexOf(e.textContent) >= 0) e.style.display = 'none'; });
      /* 비교표: 카드를 ◀ ▶로 고르고 칸 단추를 눌러 놓아요 (2D 비교표의 카드 놓기 S.tab.pl과 같아서 미션 진행이 같아요) */
      const tabEls = [], nT0 = ctlEl ? ctlEl.children.length : 0;
      let cardI = 0, tabKey = '';
      const tabPl = () => { const L = L2(); return L && L.S && L.S.mode === 'per' && L.S.subs && L.S.subs.per === 'table' && L.S.tab ? L.S.tab.pl : null; };
      const cardTxt = controls.text('');
      const pick = (d) => { const P = tabPl(); if (!P) return; const n = P.chips.length; cardI = (cardI + d + n) % n; tabKey = ''; };
      controls.button('◀', () => pick(-1)); controls.button('▶', () => pick(1));
      const ROWN = ['의식의 관여', '효과기', '대표 사례'], COLN = ['체성', '자율'];
      for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) controls.button(COLN[c] + ' · ' + ROWN[r], () => {
        const P = tabPl(); if (!P) return; const ids = P.chips.map((q) => q.id).sort(), ch = P.chips.find((q) => q.id === ids[cardI % ids.length]), t = P.targets.find((q) => q.id === 't' + r + c);
        if (ch && t) { P.place(ch, t); const nx = ids.findIndex((id, k) => k > cardI && !P.chips.find((q) => q.id === id).zone); if (nx >= 0) cardI = nx; } tabKey = '';
      });
      if (ctlEl) tabEls.push(...[].slice.call(ctlEl.children, nT0));
      function syncTab() {
        const P = tabPl(); tabEls.forEach((e) => { e.style.display = P ? '' : 'none'; });
        subCtl.forEach((e) => { e.style.display = mode === 'body' && !P ? '' : 'none'; });   // 비교표에서는 자율 신경 단추를 숨겨요
        if (!P) return;
        const L = L2(), ids = P.chips.map((q) => q.id).sort(), cur = P.chips.find((q) => q.id === ids[cardI % ids.length]);
        const key = 'tab|' + cardI + '|' + P.chips.map((q) => q.id + ':' + q.zone).join(','); if (key === tabKey) return; tabKey = key;
        cardTxt.innerHTML = '카드: <b style="color:#ffd34d">' + (cur ? cur.label : '') + '</b>' + (cur && cur.zone ? ' ✓' : '');
        const cell = (r, c) => { const q = P.chips.find((x) => x.zone === 't' + r + c); return q ? q.label : '<span style="color:#7f8aa3">빈칸</span>'; };
        let h = '<b>체성 신경계 vs 자율 신경계</b> (카드 ' + P.placed + ' / 6)<table style="border-collapse:collapse;margin-top:4px;font-size:12px">';
        h += '<tr><td></td><td style="padding:2px 6px;color:#fbbf24"><b>체성</b></td><td style="padding:2px 6px;color:#93c5fd"><b>자율</b></td></tr>';
        for (let r = 0; r < 3; r++) h += '<tr><td style="padding:2px 6px;color:#cbd5e1">' + ROWN[r] + '</td><td style="padding:2px 6px">' + cell(r, 0) + '</td><td style="padding:2px 6px">' + cell(r, 1) + '</td></tr>';
        info(h + '</table>' + (P.placed < 6 ? '◀ ▶로 카드를 고르고 아래 칸 단추를 눌러 놓아요.' : '모두 놓았어요! <b>✔ 확인하기</b>를 눌러요.'));
        infoKey = 'tab';
      }
      G.scale.setScalar(1); G.position.y = 0.4;
      setMode('lobe');
      const D = new THREE.Object3D();
      return {
        update(dt, t) {
          const L = L2();
          syncTab();
          if (L) { // 2D 화면을 따라가요
            const m2 = L.S.mode;
            if (m2 !== seen2D) { seen2D = m2; const m = m2 === 'cer' ? 'lobe' : m2 === 'stem' ? 'stem' : m2 === 'per' ? 'body' : null; if (m && m !== mode) { segMode.set(m); setMode(m); } }
            const key = mode + '|' + (L.S.cer ? L.S.cer.sel : '') + '|' + (L.S.stem ? L.S.stem.sel : '') + '|' + (L.S.per ? L.S.per.mode : '');
            if (key !== infoKey && !tabPl()) {
              infoKey = key; let h = INFO[mode];
              if (mode === 'lobe' && L.S.cer.sel) { const l = L.S.cer.sel, I = L.LOBE_INFO[l]; h = '<b>' + L.LOBE[l].name + '</b>: ' + I.fn.join(' · ') + '<br>' + I.ex + ' → ' + I.act; }
              else if (mode === 'stem' && L.S.stem.sel) { const P = L.PARTS[L.S.stem.sel]; h = '<b>' + P.name + '</b>: ' + P.fn.join(' · ') + '<br>손상되면: ' + P.dmg; }
              else if (mode === 'body' && L.S.per) { const md = L.S.per.mode; h += '<br>' + (md === 'sym' ? '<b>교감 신경</b>: 동공 확대 · 심장 박동 촉진 · 기관지 확장 · 소화 운동 억제' : md === 'par' ? '<b>부교감 신경</b>: 동공 축소 · 심장 박동 억제 · 기관지 수축 · 소화 운동 촉진 (교감과 길항 작용)' : '평상시: 동공·심장·기관지·위·소장·방광이 보통 상태예요.'); sg.set(md); }
              info(h);
              Object.keys(Lb).forEach((k) => { Lb[k].el.style.outline = ''; });
              if (mode === 'lobe' && L.S.cer.sel) { const kk = { fro: 'f', par: 'p', tem: 't', occ: 'o' }[L.S.cer.sel]; if (Lb[kk]) Lb[kk].el.style.outline = '3px solid #ffd34d'; }
            }
          }
          sz.s += (tgt.s - sz.s) * Math.min(1, dt * 4); sz.y += (tgt.y - sz.y) * Math.min(1, dt * 4);
          G.scale.setScalar(sz.s); G.position.y = sz.y;
          if (mode === 'body') {
            const P = (L && L.S.per) || { pupil: 12, bpm: 70, bronch: 10, gut: 1, bladder: 1, mode: 'rest' };
            const nb = Math.max(1, Math.round(P.bpm / 60 * 6)), beat = Math.pow(Math.max(0, Math.sin(Math.PI * 2 * nb * ph)), 5);
            heart.scale.setScalar(1 + beat * 0.25);
            const w = Math.sin(Math.PI * 2 * 5 * ph) * 0.1 * P.gut;
            stom.scale.set(1.3 + w, 0.8 - w * 0.8, 0.9); gut.scale.setScalar(1 + w * 0.8);
            stom.material.emissive.set(P.gut > 1.2 ? 0xff8a4d : 0x000000); stom.material.emissiveIntensity = P.gut > 1.2 ? 0.35 : 0;
            heart.material.emissive.set(0xff2020); heart.material.emissiveIntensity = (P.mode === 'sym' ? 0.3 : 0) + beat * 0.5;
            eyes.forEach((pu) => pu.scale.setScalar(0.07 + (P.pupil - 6.5) / 12.5 * 0.15));
            bronch.scale.set(P.bronch / 10, 1, P.bronch / 10); bladder.scale.setScalar(Math.pow(P.bladder, 1.3));
            curves.forEach((c, ci) => {
              for (let k = 0; k < 4; k++) {
                const i = ci * 4 + k, up = ((ph + k / 4 + ci * 0.13) % 1), dn = ((ph + k / 4 + ci * 0.13 + 0.5) % 1);
                c.getPointAt(1 - up, D.position); D.position.z += 0.1; D.scale.setScalar(1); D.updateMatrix(); pulseI.setMatrixAt(i, D.matrix); pm.set(0x66c2ff); pulseI.setColorAt(i, pm);
                c.getPointAt(dn, D.position); D.position.z -= 0.1; D.updateMatrix(); pulseI.setMatrixAt(NPT + i, D.matrix); pm.set(0xff9a3d); pulseI.setColorAt(NPT + i, pm);
              }
            });
            pulseI.instanceMatrix.needsUpdate = true; if (pulseI.instanceColor) pulseI.instanceColor.needsUpdate = true;
          }
        },
        sync() { infoKey = ''; },
      };
    },
  });
})();
