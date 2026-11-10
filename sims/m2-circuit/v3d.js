/* m2-circuit · 3D 전기 회로 (전지 · 스위치 · 전구 · 도선)
   스위치를 닫으면 도선 속 전자가 (−)극에서 (+)극 쪽으로 흐르고, 전류의 방향은 그 반대(+극에서 −극)로 약속해요.
   전지의 전압(V)이 클수록 전류가 세고 전구가 더 밝아요. 실험의 스위치·전압 값을 그대로 따라가요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHN = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);

  window.SciSim3D.attach({
    title: '전기 회로 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: PHN ? 15 : 12, theta: PHN ? 1.2 : 0.3, phi: PHN ? 0.9 : 1.0, min: 6, max: 24, target: PHN ? [0.3, 0, -0.6] : [0, 0, 0] },   // 휴대폰(세로 화면): 회로판의 긴 쪽이 화면 위아래로 놓이게 옆에서 봐요
    autoRotate: 0,
    levels: [0, 1, 2, 3],            // 모든 단계를 3D로: 전류계 ⓐⓑⓒ(3단계) · 물의 흐름 모형(4단계)
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const V3 = THREE.Vector3;
      const gCir = new THREE.Group(); root.add(gCir);
      const sm = () => window.__sim;
      const mat = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.5, metalness: 0.1 }, o || {}));
      const board = new THREE.Mesh(new THREE.BoxGeometry(11.6, 0.3, 7.4), mat(0x26324f, { roughness: 0.85, metalness: 0 })); board.position.y = -0.2; board.receiveShadow = true; gCir.add(board);

      /* ----- 도선 경로 (전류 방향: 전지 (+) → 전구 → 스위치 → 전지 (−)) ----- */
      const HX = 4.6, HZ = 2.5, Y = 0.55, RC = 0.7;
      const pts = [];
      function arc(cx, cz, a0) { for (let k = 0; k <= 5; k++) { const a = a0 + k / 5 * Math.PI / 2; pts.push(new V3(cx + Math.cos(a) * RC, Y, cz + Math.sin(a) * RC)); } }
      function line(x0, z0, x1, z1) { const n = Math.max(2, Math.ceil(Math.hypot(x1 - x0, z1 - z0) / 0.5)); for (let k = 1; k < n; k++) pts.push(new V3(x0 + (x1 - x0) * k / n, Y, z0 + (z1 - z0) * k / n)); }
      // 뒤쪽 줄(−z) 왼→오, 오른쪽 줄(+x) 뒤→앞, 앞쪽 줄(+z) 오→왼, 왼쪽 줄(−x) 앞→뒤
      pts.push(new V3(-HX + RC, Y, -HZ));
      line(-HX + RC, -HZ, HX - RC, -HZ);
      arc(HX - RC, -HZ + RC, -Math.PI / 2);
      line(HX, -HZ + RC, HX, HZ - RC);
      arc(HX - RC, HZ - RC, 0);
      line(HX - RC, HZ, -HX + RC, HZ);
      arc(-HX + RC, HZ - RC, Math.PI / 2);
      line(-HX, HZ - RC, -HX, -HZ + RC);
      arc(-HX + RC, -HZ + RC, Math.PI);
      const curve = new THREE.CatmullRomCurve3(pts, true, 'centripetal');
      const wire = new THREE.Mesh(new THREE.TubeGeometry(curve, 400, 0.07, 10, true), mat(0xe39a45, { metalness: 0.5, roughness: 0.35 })); wire.castShadow = true; gCir.add(wire);

      /* ----- 전지 (뒤쪽 줄 왼쪽) ----- */
      const batt = new THREE.Group(); batt.position.set(-2.6, 0.55, -HZ); gCir.add(batt);
      const cell = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 2.6, 36), mat(0x2f6df6, { roughness: 0.35, metalness: 0.3 })); cell.rotation.z = Math.PI / 2; cell.castShadow = true; batt.add(cell);
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.64, 0.64, 0.5, 36), mat(0xffd34d, { roughness: 0.3, metalness: 0.4 })); band.rotation.z = Math.PI / 2; band.position.x = -0.9; batt.add(band);
      const capP = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.3, 20), mat(0xdfe6f2, { metalness: 0.9, roughness: 0.2 })); capP.rotation.z = Math.PI / 2; capP.position.x = 1.4; batt.add(capP);
      const mkTxt = (t, col) => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); g.fillStyle = col; g.font = '900 54px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(t, 32, 36); const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthTest: false })); s.scale.setScalar(0.7); s.renderOrder = 10; return s; };
      const plus = mkTxt('+', '#ff6a6a'), minus = mkTxt('−', '#9fb8ff'); plus.position.set(1.0, 0.95, 0); minus.position.set(-1.0, 0.95, 0); batt.add(plus, minus);
      // 전지의 (+)는 오른쪽, (−)는 왼쪽: 전류는 (+)에서 시작 → 뒤쪽 줄을 따라 전구로

      /* ----- 전구 (오른쪽, 뒤쪽 줄) ----- */
      const bulb = new THREE.Group(); bulb.position.set(2.2, 0.55, -HZ); gCir.add(bulb);
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.45, 0.5, 24), mat(0xb7bcc7, { metalness: 0.9, roughness: 0.3 })); base.position.y = 0.2; bulb.add(base);
      const glass = new THREE.Mesh(new THREE.SphereGeometry(0.85, 36, 24), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.28, roughness: 0.05, metalness: 0, depthWrite: false, emissive: 0xffd34d, emissiveIntensity: 0 })); glass.position.y = 1.2; glass.renderOrder = 3; bulb.add(glass);
      const fil = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.03, 8, 20, Math.PI * 1.7), new THREE.MeshStandardMaterial({ color: 0xffb347, emissive: 0xff8a00, emissiveIntensity: 0.2 })); fil.position.y = 1.15; bulb.add(fil);
      const glow = new THREE.PointLight(0xffd980, 0, 9, 2); glow.position.set(0, 1.2, 0); bulb.add(glow);
      const halo = new THREE.Mesh(new THREE.SphereGeometry(1.6, 24, 16), new THREE.MeshBasicMaterial({ color: 0xffe08a, transparent: true, opacity: 0, depthWrite: false })); halo.position.y = 1.2; bulb.add(halo);

      /* ----- 스위치 (앞쪽 줄 가운데) ----- */
      const sw = new THREE.Group(); sw.position.set(0, Y, HZ); gCir.add(sw);
      const swBase = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.3, 0.9), mat(0x56627e, { roughness: 0.6 })); swBase.position.y = -0.2; sw.add(swBase);
      const hinge = new THREE.Group(); hinge.position.set(-0.8, 0.05, 0); sw.add(hinge);
      const lever = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.1, 0.22), mat(0xc9ced8, { metalness: 0.9, roughness: 0.25 })); lever.position.x = 0.85; hinge.add(lever);
      const knobS = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), mat(0xe2464b, { roughness: 0.4 })); knobS.position.set(1.7, 0.12, 0); hinge.add(knobS);
      [-0.8, 0.8].forEach((x) => { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.2, 16), mat(0xdfe6f2, { metalness: 0.9, roughness: 0.2 })); p.position.set(x, 0.0, 0); sw.add(p); });
      // 스위치가 열려 있을 때는 도선이 끊긴 것처럼 보이도록 가운데 구간을 가리는 판은 쓰지 않고 레버로만 표현

      /* ----- 전자 · 전류 화살표 ----- */
      const NE = 64;
      const eInst = new THREE.InstancedMesh(new THREE.SphereGeometry(0.1, 12, 8), new THREE.MeshStandardMaterial({ color: 0x3f78ff, emissive: 0x2a4fd0, emissiveIntensity: 0.9, roughness: 0.3 }), NE); eInst.frustumCulled = false; gCir.add(eInst);
      const NI = 12;
      const iInst = new THREE.InstancedMesh(new THREE.ConeGeometry(0.17, 0.46, 14), new THREE.MeshBasicMaterial({ color: 0xff7a6a }), NI); iInst.frustumCulled = false; gCir.add(iInst);
      const LB = [label('전지', batt, { offset: [0, 1.2, 0] }), label('전구', bulb, { offset: [0, 2.6, 0] }), label('스위치', sw, { offset: [0, 0.8, 0.2] })];
      const lE = label('전자의 이동 방향', [-HX, 0.8, 0], { color: 'rgba(40,80,200,.95)' }), lI = label('전류의 방향', [HX, 0.8, 0], { color: 'rgba(200,70,60,.95)' });


      /* ===== 3단계: 전류계 ⓐ ⓑ ⓒ (전류는 어디서나 같아요) · 물의 흐름 모형 (펌프 ↔ 전지, 높이 차 ↔ 전압, 물레방아 ↔ 전구, 밸브 ↔ 스위치) ===== */
      const canvasTex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); if (THREE.sRGBEncoding) t.encoding = THREE.sRGBEncoding; return t; };
      function makeDial(R, max, unit, tickStep, labStep) {
        const g = new THREE.Group();
        const body = new THREE.Mesh(new THREE.CylinderGeometry(R, R, 0.2, 40), mat(0x8b95a7, { metalness: 0.6, roughness: 0.3 })); body.rotation.x = Math.PI / 2; g.add(body);
        const tex = canvasTex(256, 256, (c) => {
          c.fillStyle = '#f7f9fc'; c.beginPath(); c.arc(128, 128, 126, 0, 7); c.fill();
          c.strokeStyle = '#334155'; c.fillStyle = '#1f2937'; c.textAlign = 'center'; c.textBaseline = 'middle';
          for (let v = 0; v <= max + 1e-6; v += tickStep) {
            const a = (-225 + 270 * v / max) * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a), big = Math.abs(v / labStep - Math.round(v / labStep)) < 1e-6;
            c.lineWidth = big ? 6 : 3; c.beginPath(); c.moveTo(128 + ca * 110, 128 - sa * 110); c.lineTo(128 + ca * (big ? 86 : 96), 128 - sa * (big ? 86 : 96)); c.stroke();
            if (big) { c.font = '800 28px sans-serif'; c.fillText(String(Math.round(v * 10) / 10), 128 + ca * 62, 128 - sa * 62); }
          }
          c.font = '800 34px sans-serif'; c.fillStyle = '#7c3aed'; c.fillText(unit, 128, 190);
        });
        const face = new THREE.Mesh(new THREE.CircleGeometry(R * 0.94, 40), new THREE.MeshBasicMaterial({ map: tex })); face.position.z = 0.11; g.add(face);
        const needle = new THREE.Group(); needle.position.z = 0.15;
        const nb = new THREE.Mesh(new THREE.BoxGeometry(R * 0.75, 0.05, 0.03), mat(0xe11d48, { roughness: 0.4 })); nb.position.x = R * 0.3; needle.add(nb); g.add(needle);
        g.userData.set = (v) => { needle.rotation.z = (-225 + 270 * Math.max(0, Math.min(max, v)) / max) * Math.PI / 180; };
        g.userData.set(0); return g;
      }
      const AMP = [{ k: 'a', tag: 'ⓐ', cap: '전구 앞', pos: [0.4, -HZ] }, { k: 'b', tag: 'ⓑ', cap: '전구 뒤', pos: [HX, 0] }, { k: 'c', tag: 'ⓒ', cap: '(−)극 앞', pos: [-HX, 0] }].map((o) => {
        const g = new THREE.Group(); g.position.set(o.pos[0], Y, o.pos[1]); gCir.add(g);
        const bx = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.5, 1.1), mat(0x5b3fb0, { roughness: 0.5, metalness: 0.2 })); bx.castShadow = true; g.add(bx);
        const dial = makeDial(0.46, 0.6, 'A', 0.05, 0.1); dial.rotation.x = -Math.PI / 2; dial.position.y = 0.3; g.add(dial);
        o.g = g; o.dial = dial; o.v = 0; o.lab = label('', g, { size: 12, color: 'rgba(100,60,200,.92)', offset: [0, 0.95, 0] }); o.lab.show(false);
        return o;
      });
      const ampBtns = AMP.map((o) => { const b = controls.button(o.tag + ' 읽기', () => { const s = sm(); if (s && s.S.closed) s.S.read[o.k] = true; }); b.style.display = 'none'; return b; });
      // 물의 흐름 모형
      const gW = new THREE.Group(); gW.visible = false; root.add(gW);
      const WL = -2.3, WR = 2.3, WB = 0, WCUT = 0.8;
      const wH = (V) => 1.4 + (V - 0.5) / 5.5 * 2.6;
      let pipeV = -1, pipeCurve = null, pipeMesh = null;
      const pipeMat = new THREE.MeshStandardMaterial({ color: 0x5cc0f3, transparent: true, opacity: 0.55, roughness: 0.15, metalness: 0.1 });
      function loopPts(top) { const r = 0.5, P = []; const rect = [[WL, WB], [WL, top], [WR, top], [WR, WB]]; // 펌프(왼쪽) → 위 → 오른쪽 → 아래 → 왼쪽
        const seg = (a, b, n) => { for (let i = 0; i < n; i++) P.push(new V3(a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n, 0)); };
        seg([WL, WB + r], [WL, top - r], 10); P.push(new V3(WL + r * 0.3, top - r * 0.3, 0)); seg([WL + r, top], [WR - r, top], 10); P.push(new V3(WR - r * 0.3, top - r * 0.3, 0)); seg([WR, top - r], [WR, WB + r], 10); P.push(new V3(WR - r * 0.3, WB + r * 0.3, 0)); seg([WR - r, WB], [WL + r, WB], 10); P.push(new V3(WL + r * 0.3, WB + r * 0.3, 0)); return P; }
      function rebuildPipe(V) {
        const top = wH(V); if (pipeMesh) { gW.remove(pipeMesh); pipeMesh.geometry.dispose(); }
        pipeCurve = new THREE.CatmullRomCurve3(loopPts(top), true, 'centripetal', 0.5);
        pipeMesh = new THREE.Mesh(new THREE.TubeGeometry(pipeCurve, 120, 0.17, 10, true), pipeMat); gW.add(pipeMesh);
        wheelG.position.set(WR, top * 0.5, 0); hAr.position.set(WL - 0.9, 0, 0); setArrow2(hAr, top); hLab.obj = [(WL - 0.9) * 0.0, 0, 0];
      }
      const wheelG = new THREE.Group(); gW.add(wheelG);
      { const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.5, 12), mat(0x7c5a2b)); hub.rotation.x = Math.PI / 2; wheelG.add(hub);
        for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2, pd = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.16, 0.42), mat(0xc0813a, { roughness: 0.7 })); pd.position.set(Math.cos(a) * 0.45, Math.sin(a) * 0.45, 0); pd.rotation.z = a; wheelG.add(pd); } }
      const pump = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.7, 24), mat(0x2f6df6, { metalness: 0.4, roughness: 0.35 })); pump.position.set(WL, 0.7, 0); gW.add(pump);
      const valve = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 0.5), mat(0xdc2626, { roughness: 0.5 })); valve.position.set(-0.4, WB, 0); gW.add(valve);
      const hAr = mkArrow2(0xc2410c, 0.05); gW.add(hAr);
      function mkArrow2(col, rad) { const g = new THREE.Group(), m = mat(col, { roughness: 0.4 }); const sh = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, 1, 10), m), h1 = new THREE.Mesh(new THREE.ConeGeometry(rad * 2.4, rad * 6, 12), m), h2 = new THREE.Mesh(new THREE.ConeGeometry(rad * 2.4, rad * 6, 12), m); h2.rotation.x = Math.PI; g.add(sh, h1, h2); g.userData = { sh, h1, h2, rad }; return g; }
      function setArrow2(g, len) { const { sh, h1, h2, rad } = g.userData; sh.scale.y = Math.max(0.01, len - rad * 12); sh.position.y = len / 2; h1.position.y = len - rad * 3; h2.position.y = rad * 3; g.position.y = 0; }
      const NDR = 26, drops = new THREE.InstancedMesh(new THREE.SphereGeometry(0.1, 10, 8), mat(0x1d9bf0, { roughness: 0.2 }), NDR); drops.frustumCulled = false; gW.add(drops);
      const dm2 = new THREE.Object3D(), pp = new V3();
      const wLab = [label('펌프', pump, { size: 11.5, offset: [-0.2, 0.7, 0] }), label('물레방아 = 전구', wheelG, { size: 11.5, offset: [0.4, 0.8, 0] }), label('밸브 = 스위치', valve, { size: 11.5, offset: [0, -0.5, 0] })];
      const hLab = label('', [0, 0, 0], { size: 12, color: 'rgba(194,65,12,.95)' });
      let wPh = 0, wLast = '';
      rebuildPipe(3);
      const ampTxt = { c: '' };
      function circuitInfo(closed, V, e, i, amm, wat) {
        const I = V / 10;
        if (amm && closed) return '<b>전류계 ⓐ ⓑ ⓒ</b>: 전구 앞 · 전구 뒤 · (−)극 앞에서 전류를 재요.<br>아래 <b>ⓐ 읽기 · ⓑ 읽기 · ⓒ 읽기</b> 버튼을 눌러 세 값을 비교해 보세요.';
        if (wat) return '<b>물의 흐름 모형</b>: 펌프가 물을 높이 올려 <b>높이 차</b>를 만들면 물이 흘러 물레방아를 돌려요. 지금 전압 <b>' + V.toFixed(1) + ' V</b><br>전압을 바꾸며 물의 빠르기, 전자의 빠르기, 전구의 밝기를 비교해 보세요.' + (closed ? '' : '<br><span style="color:#ffd34d">스위치가 열려 있어서 흐르지 않아요.</span>');
        return null;
      }
      let showE = false, showI = false, uPh = 0, lastInfo = '', glowV = 0, swA = 0, labs = true;
      function inf(closed, V, e, i) {
        const k = (closed ? 'c' : 'o') + V.toFixed(1) + (e ? 'e' : '') + (i ? 'i' : '');
        if (k === lastInfo) return; lastInfo = k;
        if (!closed) { info('<b>열린 회로</b>: 스위치가 열려 있어서 회로가 끊겼어요. <b>전류가 흐르지 않아</b> 전구도 꺼져 있어요.'); return; }
        let t = `<b>닫힌 회로</b>: 전지 → 전구 → 스위치가 도선으로 이어져 <b>전류가 흘러</b> 전구가 켜져요.<br>전지 ${V.toFixed(1)} V → 전구 ${V > 4.2 ? '아주 밝아요' : V > 2.4 ? '밝아요' : '어두워요'}`;
        if (e) t += '<br><b style="color:#8fb0ff">전자(파랑)</b>가 어느 극에서 어느 극으로 움직이는지 보세요.';
        if (i) t += '<br><b style="color:#ff9d90">전류(주황 화살표)</b>의 방향을 전자와 비교해 보세요.';
        if (!e && !i) t += '<br><span style="color:#ffd34d">[전자 흐름 보기] · [전류 방향 보기]를 켜 보세요.</span>';
        info(t);
      }
      // 2D 실험과 같은 스위치 · 전압 · 보기 설정을 써요 (3D에서 바꾸면 2D도 바뀌어요)
      controls.button('🔌 스위치 열기/닫기', () => { const s = sm(); if (s) { s.S.touched.sw = true; s.setClosed(!s.S.closed); } });
      const vr = controls.range('전지 전압', 0.5, 6, 0.5, 3, (v) => { const s = sm(); if (s) s.setV(v); }, (v) => v.toFixed(1) + ' V');
      const eB = controls.button('전자 흐름 보기', () => { const s = sm(); if (s) s.setShow(!s.S.showE, s.S.showI); });
      const iB = controls.button('전류 방향 보기', () => { const s = sm(); if (s) s.setShow(s.S.showE, !s.S.showI); });
      controls.button('이름표', () => { labs = !labs; LB.forEach((l) => l.show(labs)); lE.show(labs && showE); lI.show(labs && showI); });
      const dm = new THREE.Object3D(), p = new V3(), tg = new V3(), upv = new V3(0, 1, 0);
      let lastV = -1;
      return {
        update(dt, t) {
          const s = sm() && sm().S; const closed = s ? !!s.closed : false, V = s ? s.V : 3; showE = s ? !!s.showE : false; showI = s ? !!s.showI : false;
          eB.classList.toggle('on', showE); iB.classList.toggle('on', showI);
          if (V !== lastV) { lastV = V; vr.set(V); }
          const I = closed ? V / 10 : 0;
          swA += ((closed ? 0 : 0.8) - swA) * Math.min(1, dt * 10); hinge.rotation.z = swA;
          const target = closed ? Math.pow(V / 6, 1.2) : 0; glowV += (target - glowV) * Math.min(1, dt * 5);
          glass.material.emissiveIntensity = glowV * 1.6; fil.material.emissiveIntensity = 0.2 + glowV * 3; glow.intensity = glowV * 18; halo.material.opacity = glowV * 0.22;
          uPh = (uPh + dt * I * 0.55) % 1;
          // 전자는 전류의 반대 방향으로 이동 (곡선 매개변수가 전류 방향)
          for (let i = 0; i < NE; i++) {
            const u = ((i / NE - uPh) % 1 + 1) % 1; curve.getPointAt(u, p); p.y += Math.sin(i * 7) * 0.02;
            dm.position.copy(p); dm.scale.setScalar(closed && showE ? 1 : 0.001); dm.updateMatrix(); eInst.setMatrixAt(i, dm.matrix);
          }
          for (let i = 0; i < NI; i++) {
            const u = (i / NI + uPh) % 1; curve.getPointAt(u, p); curve.getTangentAt(u, tg); p.y += 0.28;
            dm.position.copy(p); dm.quaternion.setFromUnitVectors(upv, tg); dm.scale.setScalar(closed && showI ? 1 : 0.001); dm.updateMatrix(); iInst.setMatrixAt(i, dm.matrix);
          }
          eInst.instanceMatrix.needsUpdate = true; iInst.instanceMatrix.needsUpdate = true; dm.quaternion.identity();
          lE.show(labs && showE && closed); lI.show(labs && showI && closed);
          // 3단계 도구: 전류계 · 물의 흐름 모형
          const TT = sm() && sm().T, amOn = !!(TT && TT.am_a > 0.5), waOn = !!(TT && TT.water > 0.5), waK = TT ? Math.max(0, Math.min(1, TT.water)) : 0;
          AMP.forEach((o, i) => { o.g.visible = amOn; o.lab.show(amOn && labs); ampBtns[i].style.display = amOn && !(s && s.read && s.read[o.k]) ? '' : 'none'; if (amOn) { const rd = s && s.read && s.read[o.k], tg2 = rd ? I : 0; o.v += (tg2 - o.v) * Math.min(1, dt * 6); o.dial.userData.set(o.v); o.lab.set(o.tag + ' ' + o.cap + ' <b>' + (rd ? I.toFixed(2) + ' A' : '?') + '</b>'); } });
          const sc = 1 - 0.38 * waK; gCir.scale.setScalar(sc);
          gW.visible = waK > 0.02; gW.scale.setScalar(0.85);
          if (PHN) { gCir.position.set(1.6 * waK, -1.0 * waK, 0); gW.rotation.y = 1.2; gW.position.set(-2.4 * waK, 0.9 + 0.4 * waK, 0); }   // 휴대폰: 회로(앞 아래) · 물의 흐름 모형(뒤 위)을 위아래로
          else { gCir.position.set(-4.2 * waK, 0, 0); gW.position.set(3.4 * waK + 1.2 * (1 - waK), -0.4, 0); }
          wLab.forEach((l) => l.show(gW.visible && labs)); hLab.show(gW.visible && labs);
          if (gW.visible) {
            const Vd = s ? (s.Vd != null ? s.Vd : V) : V;
            if (Math.abs(Vd - pipeV) > 0.04) { pipeV = Vd; rebuildPipe(Vd); }
            const top = wH(pipeV), flow = closed ? Math.max(0.15, V / 6) : 0;
            wPh = (wPh + dt * 0.09 * flow * 2.2) % 1;
            for (let i = 0; i < NDR; i++) { const u = ((i / NDR - wPh) % 1 + 1) % 1; pipeCurve.getPointAt(u, pp); dm2.position.copy(pp); dm2.scale.setScalar(closed ? 1 : 0.0001); dm2.updateMatrix(); drops.setMatrixAt(i, dm2.matrix); }
            drops.instanceMatrix.needsUpdate = true;
            wheelG.rotation.z -= dt * flow * 5; wheelG.position.set(WR, top * 0.5, 0);
            valve.material.color.setHex(closed ? 0x16a34a : 0xdc2626);
            hAr.position.set(WL - 0.85, WB, 0); setArrow2(hAr, top);
            const wsc = gW.scale.x, wr = gW.rotation.y; hLab.obj = [gW.position.x + (WL - 1.0) * wsc * Math.cos(wr), gW.position.y + top * 0.5 * wsc, gW.position.z - (WL - 1.0) * wsc * Math.sin(wr)]; hLab.off = [-0.2, 0, 0]; hLab.set('높이 차 = 전압 ' + V.toFixed(1) + ' V');
          }
          const ci = circuitInfo(closed, V, showE, showI, amOn && !waOn, waOn);
          if (ci) { if (ci !== wLast) { wLast = ci; info(ci); lastInfo = ''; } } else { wLast = ''; inf(closed, V, showE, showI); }
        },
      };
    },
  });
})();
