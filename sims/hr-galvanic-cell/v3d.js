/* hr-galvanic-cell · 3D 갈바니 전지 (다니엘 전지 Zn–Cu, 전극 조합 Cu–Ag · Zn–Ag)
   (−)극: 전자를 내놓기 쉬운 금속판이 산화돼요 (Zn > Cu > Ag). 전자는 도선을 따라 (+)극으로 가요.
   (+)극: 용액의 금속 양이온이 전자를 받아 환원돼 금속판에 석출돼요. 염다리의 이온이 이동해 양쪽 용액의 전하 균형을 맞춰 줘요.
   1단계 '한 비커 반응': Zn판을 CuSO₄ 용액에 담그면 Cu가 석출되고 온도가 올라요 (입자 확대 창 포함). 염다리 없이 두 비커만 이은 장면도 2D와 같아요.
   2단계 '전지 조립': 2D에서 끌어 놓은 부품이 3D 전지에 나타나요.
   3단계 '변화 분석'(이동한 전자의 양 n)과 4단계 '전극 조합'(왼쪽 · 오른쪽 금속판)은 2D와 같은 값을 따라가요. 입자 수와 속도는 모형 스케치예요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const MET = {
    Zn: { col: 0x9aa4b2, ion: 'Zn²⁺', sol: 'ZnSO₄(aq)', solc: 0xd9dfe8, sola: 0.22, E: -0.76, ox: 'Zn → Zn²⁺ + 2e⁻', red: 'Zn²⁺ + 2e⁻ → Zn', icol: 0x8fa0b8 },
    Cu: { col: 0xd9824c, ion: 'Cu²⁺', sol: 'CuSO₄(aq)', solc: 0x4aa8ff, sola: 0.42, E: 0.34, ox: 'Cu → Cu²⁺ + 2e⁻', red: 'Cu²⁺ + 2e⁻ → Cu', icol: 0x1e6fe0 },
    Ag: { col: 0xe4e9f1, ion: 'Ag⁺', sol: 'AgNO₃(aq)', solc: 0xe8eef7, sola: 0.18, E: 0.80, ox: 'Ag → Ag⁺ + e⁻', red: '2Ag⁺ + 2e⁻ → 2Ag', icol: 0xb8c4d8 },
  };
  const BX = 3.0, BR = 2.0, BH = 3.4, FY = -2.2, PY = FY + BH + 1.0;

  window.SciSim3D.attach({
    title: '갈바니 전지 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: PHONE ? 20 : 14.5, theta: 0.3, phi: 1.25, min: 8, max: 30, target: [0, 1.0, 0] },
    autoRotate: 0.06,
    levels: [0, 2, 3],   // 1단계(한 비커 반응) · 3단계(변화 분석) · 4단계(전극 조합). 2단계(전지 조립)는 2D에서 부품을 끌어 놓아요
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const V3 = THREE.Vector3;
      const mat = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.4, metalness: 0.05 }, o || {}));
      let on = true, showLab = true, wear = 0, bridgeOut = false, negLeft = true, A = 'Zn', B = 'Cu', cfgSig = '', demo = false, nMol = null;

      /* 비커와 용액 */
      const liqs = [];
      [[-BX, 0xd9dfe8, 0.5], [BX, 0x4aa8ff, 0.7]].forEach(([x, c, o], i) => {
        const gl = new THREE.Mesh(new THREE.CylinderGeometry(BR, BR, BH, 48, 1, true), new THREE.MeshStandardMaterial({ color: 0xcfe8ff, transparent: true, opacity: 0.16, roughness: 0.08, side: THREE.DoubleSide, depthWrite: false }));
        gl.position.set(x, FY + BH / 2, 0); root.add(gl);
        const bt = new THREE.Mesh(new THREE.CylinderGeometry(BR, BR, 0.12, 48), mat(0xbcd0e6, { transparent: true, opacity: 0.5 })); bt.position.set(x, FY, 0); root.add(bt);
        const li = new THREE.Mesh(new THREE.CylinderGeometry(BR - 0.04, BR - 0.04, BH * 0.78, 48), mat(c, { transparent: true, opacity: i ? 0.42 : 0.22, roughness: 0.15, depthWrite: false }));
        li.position.set(x, FY + BH * 0.39, 0); root.add(li); liqs.push(li);
      });
      /* 금속판 */
      const zn = new THREE.Mesh(new THREE.BoxGeometry(0.3, 4.4, 1.6), mat(0x9aa4b2, { metalness: 0.85, roughness: 0.32 })); zn.position.set(-BX - 0.3, FY + 1.6, 0); root.add(zn);
      const cu = new THREE.Mesh(new THREE.BoxGeometry(0.3, 4.4, 1.6), mat(0xd9824c, { metalness: 0.85, roughness: 0.3 })); cu.position.set(BX + 0.3, FY + 1.6, 0); root.add(cu);
      const znTop = FY + 1.6 + 2.2, cuTop = znTop;
      /* 염다리 (U자 관) */
      const sbPts = [new V3(-BX + 0.7, FY + 1.0, 0.0), new V3(-BX + 0.9, PY - 0.6, 0.0), new V3(-BX * 0.45, PY + 0.1, 0.0), new V3(BX * 0.45, PY + 0.1, 0.0), new V3(BX - 0.9, PY - 0.6, 0.0), new V3(BX - 0.7, FY + 1.0, 0.0)];
      const sbCurve = new THREE.CatmullRomCurve3(sbPts, false, 'catmullrom', 0.3);
      const sb = new THREE.Mesh(new THREE.TubeGeometry(sbCurve, 80, 0.42, 20, false), new THREE.MeshStandardMaterial({ color: 0xfff1b8, transparent: true, opacity: 0.42, roughness: 0.2, depthWrite: false })); root.add(sb);
      const sbIn = new THREE.Mesh(new THREE.TubeGeometry(sbCurve, 80, 0.32, 16, false), mat(0xfde68a, { transparent: true, opacity: 0.7, roughness: 0.6 })); root.add(sbIn);
      /* 도선 (Zn → 전구/전압계 → Cu) */
      const WY = PY + 1.6;
      const wp = [new V3(-BX - 0.3, znTop, 0), new V3(-BX - 0.3, WY, 0), new V3(-1.1, WY, 0), new V3(1.1, WY, 0), new V3(BX + 0.3, WY, 0), new V3(BX + 0.3, cuTop, 0)];
      const wcurve = new THREE.CatmullRomCurve3(wp, false, 'catmullrom', 0.02);
      const wire = new THREE.Mesh(new THREE.TubeGeometry(wcurve, 100, 0.07, 10, false), mat(0xd18a3a, { metalness: 0.7, roughness: 0.35 })); root.add(wire);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.55, 28, 22), mat(0xfff3c4, { transparent: true, opacity: 0.8, emissive: 0xffc83d, emissiveIntensity: 0.9, roughness: 0.2 })); bulb.position.set(0, WY + 0.55, 0); root.add(bulb);
      const sock = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.35, 20), mat(0x64748b, { metalness: 0.6, roughness: 0.4 })); sock.position.set(0, WY + 0.05, 0); root.add(sock);
      const bulbL = new THREE.PointLight(0xffc83d, 0.9, 7); bulbL.position.copy(bulb.position); root.add(bulbL);
      const swb = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.18, 0.5), mat(0xef6a5b)); swb.position.set(-2.0, WY + 0.09, 0); root.add(swb);

      /* 전자 */
      const NE = 14, em = new THREE.InstancedMesh(new THREE.SphereGeometry(0.15, 14, 10), mat(0x42e8ff, { emissive: 0x00a9c0, emissiveIntensity: 0.9 }), NE); em.frustumCulled = false; root.add(em);
      /* 이온: Zn²⁺(왼쪽), Cu²⁺(오른쪽), 염다리의 음이온·양이온 */
      const mkIon = (n, r, c) => { const m = new THREE.InstancedMesh(new THREE.SphereGeometry(r, 18, 14), mat(c, { roughness: 0.3, emissive: c, emissiveIntensity: 0.18 }), n); m.frustumCulled = false; root.add(m); return m; };
      const NZ = 12, NC = 12, NB = 8;
      const zi = mkIon(NZ, 0.2, 0x8fa0b8), ci = mkIon(NC, 0.2, 0x1e6fe0), an = mkIon(NB, 0.17, 0xffb020), ca = mkIon(NB, 0.17, 0xc084fc);
      const zs = Array.from({ length: NZ }, (_, i) => ({ t: i / NZ, a: Math.random() * 6.28, r: Math.random() })), cs = Array.from({ length: NC }, (_, i) => ({ t: i / NC, a: Math.random() * 6.28, r: Math.random() }));
      const M = new THREE.Matrix4(), hide = (m, i) => { M.makeScale(0.0001, 0.0001, 0.0001); m.setMatrixAt(i, M); };
      const labs = [
        label('(−)극 Zn판 · 산화', zn, { color: 'rgba(100,116,139,.95)', offset: [-0.2, 2.9, 0] }),
        label('(+)극 Cu판 · 환원', cu, { color: 'rgba(217,119,6,.95)', offset: [0.2, 2.9, 0] }),
        label('염다리', [0, PY + 0.5, 0], { color: 'rgba(161,98,7,.92)' }),
        label('e⁻ →', [-2.1, WY + 0.65, 0], { color: 'rgba(8,145,178,.92)' }),
        label('ZnSO₄(aq)', [-BX, FY + 0.2, BR], { color: 'rgba(30,41,59,.85)' }),
        label('CuSO₄(aq)', [BX, FY + 0.2, BR], { color: 'rgba(30,41,59,.85)' }),
      ];
      const labA = label('Zn²⁺', [-BX - 1.1, FY + 2.0, 0], { color: 'rgba(100,116,139,.95)' }), labB = label('Cu²⁺', [BX + 1.3, FY + 2.0, 0], { color: 'rgba(30,111,224,.95)' });
      const labSolA = labs[4], labSolB = labs[5];
      const showL = (v) => { labs.forEach((l) => l.show(v)); labA.show(v); labB.show(v); };
      const swBtn = controls.button('🌉 염다리 꽂힘 ✓', () => {
        const w = window.__sim, bb = document.getElementById('bBridge');
        if (w && w.S && w.S.mode === 'cell' && bb && !bb.disabled) { bb.click(); return; }   // 2D '염다리 빼기'와 같은 단추
        bridgeOut = !bridgeOut; sync();
      }); swBtn.classList.add('on');
      function sync() { on = !bridgeOut; swBtn.classList.toggle('on', on); swBtn.textContent = on ? '🌉 염다리 꽂힘 ✓' : '🌉 염다리 뺌 ✕'; }
      const lb = controls.button('이름표 ✓', () => { showLab = !showLab; lb.classList.toggle('on', showLab); lb.textContent = '이름표 ' + (showLab ? '✓' : '✕'); showL(showLab); }); lb.classList.add('on');
      controls.button('↺ 판 새로 갈기', () => { wear = 0; });
      let demoN = 0;
      const pl = controls.player({
        duration: 10, loop: true, autoplay: false, label: '전자 이동 재생',
        phases: [[0, '전자 0 mol'], [0.5, '전자 0.20 mol'], [0.99, '다시 처음부터']],
        onFrame(p) { demoN = 0.4 * Math.min(1, p / 0.99); },
      });
      const demoOn = () => pl.playing || pl.p > 0.0005;

      /* ================= 1단계 '한 비커 반응'(2D의 beaker · one): Zn판을 CuSO₄ 용액에 담그면 ================= */
      const gMain = new THREE.Group(); while (root.children.length) gMain.add(root.children[0]); root.add(gMain);
      const gB = new THREE.Group(); root.add(gB); gB.visible = false;
      const probe = controls.text(''); probe.style.display = 'none'; const ctlEl = probe.parentElement;
      const mainEls = Array.prototype.filter.call(ctlEl.children, (e) => e !== probe);
      const oneBtn = controls.button('⬇ Zn판 담그기', () => { const w = window.__sim; if (w && w.bkGo) w.bkGo(); });
      const oneRst = controls.button('↺ 다시 하기', () => { const w = window.__sim; if (w && w.bkReset) w.bkReset(); });
      const oneEls = [oneBtn, oneRst];
      const B1X = -4.6, B1R = 1.9, B1H = 3.8, B1Y = -2.3, LV1 = 0.64;
      { const gl = new THREE.Mesh(new THREE.CylinderGeometry(B1R, B1R, B1H, 48, 1, true), new THREE.MeshStandardMaterial({ color: 0xcfe8ff, transparent: true, opacity: 0.16, roughness: 0.08, side: THREE.DoubleSide, depthWrite: false })); gl.position.set(B1X, B1Y + B1H / 2, 0); gB.add(gl);
        const bt = new THREE.Mesh(new THREE.CylinderGeometry(B1R, B1R, 0.12, 48), mat(0xbcd0e6, { transparent: true, opacity: 0.5 })); bt.position.set(B1X, B1Y, 0); gB.add(bt); }
      const sol1 = new THREE.Mesh(new THREE.CylinderGeometry(B1R - 0.04, B1R - 0.04, B1H * LV1, 48), mat(0x3b9be0, { transparent: true, opacity: 0.6, roughness: 0.15, depthWrite: false })); sol1.position.set(B1X, B1Y + B1H * LV1 / 2, 0); gB.add(sol1);
      const surf1 = B1Y + B1H * LV1;
      const rod = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.12, 0.12), mat(0x94a3b8, { metalness: 0.6 })); rod.position.set(B1X, B1Y + B1H + 1.0, 0); gB.add(rod);
      const PLH = 3.0, plate1 = new THREE.Group(); gB.add(plate1);
      const znP = new THREE.Mesh(new THREE.BoxGeometry(0.36, PLH, 1.3), mat(0xaab4c2, { metalness: 0.85, roughness: 0.32 })); znP.position.y = -PLH / 2; plate1.add(znP);
      const cuC = new THREE.Mesh(new THREE.BoxGeometry(0.5, PLH, 1.42), mat(0xb45f2a, { metalness: 0.5, roughness: 0.55, transparent: true, opacity: 0 })); cuC.position.y = -PLH / 2; plate1.add(cuC);
      const wire1 = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1, 6), mat(0x64748b)); gB.add(wire1);
      /* 온도계 */
      const TX1 = -1.5, TH1 = 4.2;
      const thT = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, TH1, 16), new THREE.MeshStandardMaterial({ color: 0xdbe7ff, transparent: true, opacity: 0.3, roughness: 0.15, depthWrite: false })); thT.position.set(TX1, B1Y + TH1 / 2, 0); gB.add(thT);
      const thB = new THREE.Mesh(new THREE.SphereGeometry(0.3, 18, 14), mat(0xe2464b)); thB.position.set(TX1, B1Y - 0.1, 0); gB.add(thB);
      const thF = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1, 12), mat(0xe2464b, { emissive: 0x7a1010, emissiveIntensity: 0.5 })); gB.add(thF);
      for (let v = 20; v <= 40; v += 5) { const tk = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.03, 0.03), mat(0x94a3b8)); tk.position.set(TX1 + 0.3, B1Y + (v - 20) / 20 * (TH1 - 0.5) + 0.2, 0); gB.add(tk); }
      const lT1 = label('', [TX1, B1Y + TH1 + 0.5, 0], { color: 'rgba(30,41,59,.92)' }); lT1.show(false);
      const lSol1 = label('0.20 M CuSO₄ 용액 50 mL', [B1X, B1Y - 0.55, 0], { color: 'rgba(30,41,59,.92)' }); lSol1.show(false);
      const lZn1 = label('Zn판', [B1X, B1Y + B1H + 1.55, 0], { color: 'rgba(100,116,139,.95)' }); lZn1.show(false);
      /* 입자 확대 창: 2D의 b.ev(5줄)와 같은 순서로 전자 · 자리 바꿈을 보여 줘요 */
      const IXC = 4.3, IW = 5.4, IHt = 4.6, IY0 = 0.4, SLX = IXC - IW / 2 + 1.0;
      { const pn = new THREE.Mesh(new THREE.BoxGeometry(IW, IHt, 0.08), new THREE.MeshStandardMaterial({ color: 0xb6c8ea, transparent: true, opacity: 0.12, roughness: 0.4, depthWrite: false })); pn.position.set(IXC, IY0, -0.35); gB.add(pn);
        const fr = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(IW, IHt, 0.08)), new THREE.LineBasicMaterial({ color: 0xa78bfa })); fr.position.copy(pn.position); gB.add(fr);
        const sl = new THREE.Mesh(new THREE.BoxGeometry(1.2, IHt - 0.1, 0.6), mat(0xaab4c2, { metalness: 0.7, roughness: 0.4 })); sl.position.set(IXC - IW / 2 + 0.65, IY0, -0.1); gB.add(sl); }
      const lIn = label('🔍 입자 모형으로 보기 (Zn판 표면)', [IXC, IY0 + IHt / 2 + 0.5, 0], { color: 'rgba(91,33,182,.92)' }), lInZ = label('Zn판', [IXC - IW / 2 + 0.65, IY0 - IHt / 2 - 0.45, 0], { color: 'rgba(100,116,139,.92)' }), lInS = label('CuSO₄ 용액', [IXC + IW / 2 - 0.9, IY0 - IHt / 2 - 0.45, 0], { color: 'rgba(30,100,170,.92)' });
      const lInD = label('', [IXC, IY0 + IHt / 2 - 0.35, 0.6], { color: 'rgba(122,74,0,.95)' });
      [lIn, lInZ, lInS, lInD].forEach((l) => l.show(false));
      const EVN = 5, evZn = [], evCu = [], evE = [];
      for (let j = 0; j < EVN; j++) {
        const a = new THREE.Mesh(new THREE.SphereGeometry(0.3, 22, 16), mat(0x94a3b8)); const c2 = new THREE.Mesh(new THREE.SphereGeometry(0.3, 22, 16), mat(0x3b82c4)); const e = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 8), mat(0xfbbf24, { emissive: 0xfbbf24, emissiveIntensity: 0.9 }));
        gB.add(a); gB.add(c2); gB.add(e); evZn.push(a); evCu.push(c2); evE.push(e);
      }
      const smo = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
      const Cb0 = new THREE.Color(0x3b9be0), Cb1 = new THREE.Color(0xcfe4f3);
      function updOne(w, t) {
        const b = w.S.bk, p = b.p, dip = smo(b.dip);
        const top = B1Y + B1H + 1.0 - 0.1, bot = B1Y + 0.5 + PLH;      // 판 윗부분 높이: 처음에는 위에 걸려 있다가 용액에 잠겨요
        const yTop = top + 0.6 - (top + 0.6 - (B1Y + 0.25 + PLH)) * dip;
        plate1.position.set(B1X, yTop, 0); wire1.scale.set(1, Math.max(0.01, B1Y + B1H + 1.0 - yTop), 1); wire1.position.set(B1X, (B1Y + B1H + 1.0 + yTop) / 2, 0);
        const subm = Math.max(0, Math.min(PLH, surf1 - (yTop - PLH)));
        cuC.material.opacity = Math.min(0.95, p * 1.1); cuC.scale.set(1 + 0.2 * p, subm / PLH, 1); cuC.position.y = -PLH + subm / 2;
        znP.scale.x = 1 - 0.1 * p;
        sol1.material.color.copy(Cb0).lerp(Cb1, smo(p)); sol1.material.opacity = 0.6 - 0.34 * smo(p);
        const Tn = b.T, hk = Math.max(0.05, Math.min(1, (Tn - 20) / 20)); thF.scale.set(1, hk * (TH1 - 0.5), 1); thF.position.set(TX1, B1Y + hk * (TH1 - 0.5) / 2, 0);
        lT1.set(Tn.toFixed(1) + ' °C');
        const YR = (j) => IY0 + IHt / 2 - 0.95 - j * 0.78, XS = SLX + 0.4, XC = XS + 3.2;
        b.ev.forEach((e, j) => {
          const sw = smo(e.s), gone = e.e >= 1, y = YR(j), lift = Math.sin(Math.PI * sw) * 0.4;
          evZn[j].position.set(XS + (XC - XS) * 0.85 * sw, y + lift, 0); evCu[j].position.set(XC - (XC - XS) * 0.85 * sw, y - lift, 0);
          evZn[j].material.color.setHex(gone ? 0xcfd8e4 : 0x94a3b8); evZn[j].material.emissive.setHex(gone ? 0x2a5fb0 : 0x000000);
          evCu[j].material.color.setHex(gone ? 0xd97706 : 0x3b82c4);
          const k = e.e; evE[j].visible = k >= 0 && k < 1;
          if (evE[j].visible) evE[j].position.set(XS + (XC - XS) * k, y + 0.7 * Math.sin(Math.PI * k), 0.3);
        });
        [lIn, lInZ, lInS, lInD].forEach((l) => l.show(true)); lT1.show(true); lSol1.show(true); lZn1.show(true);
        lInD.set(p > 0.05 ? '전자가 Zn → Cu²⁺ 로 바로 이동' : '전자가 곧 이동할 거예요');
        oneBtn.disabled = b.go; oneBtn.classList.toggle('on', b.go);
        return '<b>Zn + Cu²⁺ → Zn²⁺ + Cu</b> (Zn은 전자를 잃고, Cu²⁺는 전자를 얻어요)<br>' + (b.dip > 0.99 ? '✅ Zn판 표면에 붉은 Cu가 석출되고 푸른색이 옅어져요.' : '⬜ <b>Zn판 담그기</b>를 눌러요.') + '<br>' + (b.seen ? '✅ 전자가 표면에서 바로 이동해서 에너지가 모두 열로 나가요. (온도 ' + b.T.toFixed(1) + ' °C)' : '반응 ' + Math.round(p * 100) + ' % · 온도 ' + Tn.toFixed(1) + ' °C');
      }
      let sceneNow = '';
      function applyScene(k) {
        if (k === sceneNow) return; sceneNow = k; txt = '';
        const one = k === 'one';
        gMain.visible = !one; gB.visible = one;
        mainEls.forEach((e) => { e.style.display = one ? 'none' : ''; }); oneEls.forEach((e) => { e.style.display = one ? '' : 'none'; });
        if (one) { showL(false); labs.forEach((l) => l.show(false)); }
        else { showL(showLab); [lIn, lInZ, lInS, lInD, lT1, lSol1, lZn1].forEach((l) => l.show(false)); }
        const o = ctx.orbit; if (one) { o.dist = PHONE ? 23 : 15.5; o.tx = 0.6; o.ty = 0.3; o.theta = 0.15; o.phi = 1.35; } else { o.dist = PHONE ? 20 : 14.5; o.tx = 0; o.ty = 1.0; o.theta = 0.3; o.phi = 1.25; }
      }
      let flow = 0, txt = '', lastMd = '';
      return {
        update(dt, t) {
          dt = Math.min(dt, 0.05);
          /* 2D 상태 읽기 */
          const w2 = window.__sim, S2 = w2 && w2.S, md = S2 ? S2.mode : '';
          const bsub = S2 && S2.sub ? S2.sub.beaker : 'one', one = md === 'beaker' && bsub === 'one', two = md === 'beaker' && bsub === 'two';
          applyScene(one ? 'one' : 'main');
          if (one) { const h1 = updOne(w2, t); if (h1 !== txt) { txt = h1; info(h1); } return; }
          let nTarget = null;
          if (md === 'combo' && S2.cb) { A = MET[S2.cb.A] ? S2.cb.A : 'Zn'; B = MET[S2.cb.B] ? S2.cb.B : 'Cu'; if (A === B) B = A === 'Cu' ? 'Zn' : 'Cu'; }
          else { A = 'Zn'; B = 'Cu'; }
          if (md === 'cell' && S2.cl) { bridgeOut = !S2.cl.bridgeOn; }
          else if (md === 'beaker') bridgeOut = true;
          else if (md !== lastMd) bridgeOut = false;
          if (md === 'analysis' && S2.an) nTarget = S2.an.n;
          lastMd = md;
          if (demoOn()) nTarget = demoN;
          else if (nMol != null && md !== 'analysis') nMol = null;
          sync();
          negLeft = MET[A].E < MET[B].E;
          const sig = A + B;
          if (sig !== cfgSig) {
            cfgSig = sig;
            [[0, A, zn], [1, B, cu]].forEach(([i, k, pl]) => { pl.material.color.setHex(MET[k].col); liqs[i].material.color.setHex(MET[k].solc); liqs[i].material.opacity = MET[k].sola; });
            zi.material.color.setHex(MET[A].icol); zi.material.emissive.setHex(MET[A].icol); ci.material.color.setHex(MET[B].icol); ci.material.emissive.setHex(MET[B].icol);
            labA.set(MET[A].ion); labB.set(MET[B].ion); labSolA.set(MET[A].sol); labSolB.set(MET[B].sol);
          }
          const asm = md === 'cell' && S2.cl ? S2.cl.parts : null, vis = (id) => !asm || asm[id].k > 0.05;
          let flowT = on ? 1 : 0; if (md === 'cell' && S2.cl) flowT = S2.cl.lit; else if (two) flowT = S2.bk.sep.lit;
          zn.visible = vis('zn'); cu.visible = vis('cu'); [wire, bulb, sock, swb, bulbL].forEach((o) => { o.visible = vis('wire'); });
          const brV = vis('bridge') && !two && !(md === 'cell' && !S2.cl.bridgeOn); sb.visible = sbIn.visible = brV;
          if (asm) { liqs[0].visible = S2.cl.solK[0] > 0.03; liqs[1].visible = S2.cl.solK[1] > 0.03; } else { liqs[0].visible = liqs[1].visible = true; }
          flow += (flowT - flow) * Math.min(1, dt * 4);
          if (nTarget != null) wear = Math.min(1, nTarget / 0.4);
          else if (on) wear = Math.min(1, wear + dt * 0.01);
          const negPl = negLeft ? zn : cu, posPl = negLeft ? cu : zn;
          negPl.scale.x = 1 - 0.55 * wear; posPl.scale.x = 1 + 0.9 * wear;
          bulb.material.emissiveIntensity = 0.1 + 0.9 * flow; bulbL.intensity = 0.9 * flow; bulb.material.opacity = 0.5 + 0.3 * flow;
          swb.position.y = WY + (on ? 0.09 : 0.45); swb.rotation.z = on ? 0 : 0.5;
          labs[0].set(A + (negLeft ? '판 (−)극 · 산화' : '판 (+)극 · 환원'));
          labs[1].set(B + (negLeft ? '판 (+)극 · 환원' : '판 (−)극 · 산화'));
          /* 전자: 도선을 (−)극 → 전구 → (+)극 방향으로 */
          for (let i = 0; i < NE; i++) { let u = ((i / NE) + t * 0.12 * flow) % 1; if (!negLeft) u = 1 - u; const p = wcurve.getPointAt(u); if (flow < 0.05) { hide(em, i); continue; } M.makeTranslation(p.x, p.y, p.z); em.setMatrixAt(i, M); }
          em.instanceMatrix.needsUpdate = true;
          /* Zn²⁺: Zn판에서 나와 용액으로 퍼지다 사라짐 / Cu²⁺: 용액에서 Cu판으로 모여 석출 */
          const sp = 0.16 * (0.35 + flow);
          const ionSide = (inst, arr, sg, neg) => arr.forEach((q, i) => {
            q.t = (q.t + dt * sp) % 1;
            const rr = neg ? 0.3 + q.t * 0.9 + q.r * 0.2 : 1.3 - q.t * 1.0 + q.r * 0.15, y = FY + 0.6 + q.r * 2.2;
            const sc = Math.max(0.001, Math.sin(Math.PI * Math.min(1, q.t * (neg ? 1.3 : 1.15))));
            M.makeScale(sc, sc, sc); M.setPosition(sg * (BX + 0.5 + rr * Math.abs(Math.cos(q.a)) * (neg ? 0.8 : 1)), y, Math.sin(q.a) * rr * 0.9); inst.setMatrixAt(i, M);
          });
          ionSide(zi, zs, -1, negLeft); ionSide(ci, cs, 1, !negLeft);
          zi.instanceMatrix.needsUpdate = true; ci.instanceMatrix.needsUpdate = true;
          /* 염다리: 음이온은 Zn쪽으로, 양이온은 Cu쪽으로 */
          for (let i = 0; i < NB; i++) {
            let ua = (1 - ((i / NB + t * 0.05 * flow) % 1)), uc = (i / NB + t * 0.05 * flow) % 1; if (!negLeft) { ua = 1 - ua; uc = 1 - uc; }
            const pa = sbCurve.getPointAt(ua), pc = sbCurve.getPointAt(uc);
            if (flow < 0.05 || !brV) { hide(an, i); hide(ca, i); continue; }
            M.makeTranslation(pa.x, pa.y, pa.z + 0.1); an.setMatrixAt(i, M); M.makeTranslation(pc.x, pc.y, pc.z - 0.1); ca.setMatrixAt(i, M);
          }
          an.instanceMatrix.needsUpdate = true; ca.instanceMatrix.needsUpdate = true;
          const N = negLeft ? A : B, Pp = negLeft ? B : A, volt = Math.abs(MET[A].E - MET[B].E);
          const head = md === 'combo' ? '<b>' + A + '–' + B + ' 전지 · ' + volt.toFixed(2) + ' V</b> ((−)극 ' + N + ')<br>' : '<b>다니엘 전지 (Zn–Cu) · 1.10 V</b><br>';
          let tx;
          if (md === 'cell' && S2.cl && !(vis('zn') && vis('cu') && S2.cl.solK[0] > 0.9 && S2.cl.solK[1] > 0.9 && vis('wire'))) tx = '<b>🧩 다니엘 전지 조립</b><br>2D에서 끌어 놓은 부품이 여기에 나타나요. (' + Object.keys(S2.cl.parts).filter((k) => S2.cl.parts[k].on).length + ' / 6)<br>Zn판 · ZnSO₄ · Cu판 · CuSO₄ · 염다리 · 도선과 전구를 모두 놓아요.';
          else if (md === 'cell' && S2.cl && !S2.cl.parts.bridge.on) tx = '<b>염다리가 아직 없어요</b><br>두 용액이 이어지지 않아 전하가 쌓여요. 전압이 0 V로 떨어지고 전구가 꺼져요.<br>염다리를 놓아 두 용액을 이어 줘요. (▦ 2D에서 끌어 놓아요)';
          else if (two) tx = '<b>두 비커를 도선으로만 이었어요</b><br>전압계 ' + S2.bk.sep.V.toFixed(2) + ' V · 전구 ' + (S2.bk.sep.lit > 0.5 ? '켜짐' : S2.bk.sep.lit > 0.1 ? '희미함' : '꺼짐') + '<br>' + (S2.bk.sep.imb > 0.9 ? '두 용액이 이어지지 않아 전하가 쌓여 전류가 멈췄어요. 이 문제를 풀어 주는 장치가 염다리예요.' : '곧 전압이 떨어져요.');
          else if (!on) tx = head + '<b>염다리를 뺐어요</b>: 용액의 전하 균형이 깨져 전류가 거의 흐르지 못하고 전압이 0 V로 떨어져요.';
          else {
            tx = head + '(−)극 ' + N + ': ' + MET[N].ox + ' (산화)<br>(+)극 ' + Pp + ': ' + MET[Pp].red + ' (환원)<br>전자: ' + N + '판 → 도선 → ' + Pp + '판 (전류는 반대)';
            if (nTarget != null) { const mz = w2 && w2.mZn ? w2.mZn(nTarget) : null, mc = w2 && w2.mCu ? w2.mCu(nTarget) : null; tx += '<br>전자 <b>' + nTarget.toFixed(2) + ' mol</b> 이동 → Zn판 ' + (mz != null ? mz.toFixed(1) + ' g' : '') + '(↓) · Cu판 ' + (mc != null ? mc.toFixed(1) + ' g' : '') + '(↑)'; }
          }
          if (tx !== txt) { txt = tx; info(tx); }
        },
      };
    },
  });
})();
