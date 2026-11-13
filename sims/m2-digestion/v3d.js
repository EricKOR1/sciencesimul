/* m2-digestion · 3D 소화 기관과 소장 융털
   음식물이 입 → 식도 → 위 → 소장 → 대장 → 항문으로 지나가며 소화 효소로 분해되는 모습, 소장 융털에서 영양소가 흡수되는 모습을 입체로 봐요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHN = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  // 2D 차시(SITE_INFO)와 같은 설명 · 2D 슬라이더(SITE_P)와 같은 구간
  const ST = [
    { n: '입', u: [0, 0.1], p: [0, 0.1], t: '<b>입</b>: 이로 잘게 부수고, 침 속 <b>아밀레이스</b>가 <b>녹말</b>을 <b>엿당</b>으로 분해해요.' },
    { n: '식도', u: [0.1, 0.2], p: [0.1, 0.22], t: '<b>식도</b>: 소화액이 없어요. 연동 운동으로 음식물을 위까지 밀어 내려요.' },
    { n: '위', u: [0.2, 0.36], p: [0.22, 0.4], t: '<b>위</b>: 위액 속 <b>펩신</b>이 <b>단백질</b>을 분해해요.' },
    { n: '소장', u: [0.36, 0.72], p: [0.4, 0.78], t: '<b>소장</b>: 이자액의 <b>아밀레이스·트립신·라이페이스</b>와 소장의 효소가 일해요. 쓸개즙은 효소가 아니지만 지방 소화를 도와요.' },
    { n: '대장', u: [0.72, 1.0], p: [0.78, 1.0], t: '<b>대장</b>: 소화 효소가 없어요. 소화되지 않은 찌꺼기에서 물을 흡수해요.' },
  ];
  const lin = (x, a0, a1, b0, b1) => b0 + (b1 - b0) * (x - a0) / ((a1 - a0) || 1);
  const uOfP = (p) => { for (let i = 0; i < ST.length; i++) if (p <= ST[i].p[1] + 1e-9 || i === ST.length - 1) return lin(Math.max(ST[i].p[0], Math.min(ST[i].p[1], p)), ST[i].p[0], ST[i].p[1], ST[i].u[0], ST[i].u[1]); return 0; };
  const pOfU = (u) => { for (let i = 0; i < ST.length; i++) if (u <= ST[i].u[1] + 1e-9 || i === ST.length - 1) return lin(Math.max(ST[i].u[0], Math.min(ST[i].u[1], u)), ST[i].u[0], ST[i].u[1], ST[i].p[0], ST[i].p[1]); return 0; };

  window.SciSim3D.attach({
    title: '소화 기관 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: PHN ? 17 : 12.5, theta: 0.25, phi: 1.35, min: 5, max: 26, target: [0, 1.0, 0] },
    autoRotate: 0,
    levels: [2],                     // 3단계(소화 기관과 소화 효소): 효소 카드는 아래 버튼으로 놓아요
    build(ctx) {
      const { THREE, root, label, info, controls, orbit } = ctx;
      const V3 = THREE.Vector3;
      const mat = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.6, metalness: 0.02 }, o || {}));
      const sm = () => window.__sim;
      const MT = ctx.mats, lc = (h) => new THREE.Color(h).convertSRGBToLinear();   // 화면에서 색이 바래지 않게 (진한 색)
      const org = (c, o) => MT.organic(lc(c), { extra: o });   // 기관 · 조직: 부드럽고 촉촉한 겉면
      const tract = new THREE.Group(), vil = new THREE.Group(); root.add(tract, vil);

      /* ============ 소화 기관 ============ */
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(2.6, 5.2, 12, 32), MT.glass({ tint: 0xa9c0ee, opacity: 0.1, extra: { side: THREE.FrontSide, envMapIntensity: 1.4 } }));
      body.position.set(0, 0.6, 0); body.scale.set(1, 1, 0.5); body.renderOrder = 0; tract.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.9, 36, 24), MT.organic(lc(0xeab88f), { opacity: 0.38 })); head.position.set(0, 5.2, 0); tract.add(head);
      const mouth = new THREE.Mesh(new THREE.SphereGeometry(0.26, 24, 16), org(0xd24f4a)); mouth.scale.set(1.3, 0.55, 0.8); mouth.position.set(0, 4.9, 0.55); tract.add(mouth);
      function tube(pts, r, c, o) { const cu = new THREE.CatmullRomCurve3(pts); const m = new THREE.Mesh(new THREE.TubeGeometry(cu, Math.max(20, pts.length * 14), r, 16, false), org(c, o)); m.castShadow = true; tract.add(m); return m; }
      const eso = tube([new V3(0, 4.85, 0.45), new V3(0, 4.3, 0.1), new V3(0, 3.0, 0), new V3(0.15, 2.1, 0)], 0.14, 0xe0877a);
      const stom = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 28), org(0xe07f72, { roughness: 0.45 })); stom.scale.set(1.05, 0.75, 0.65); stom.position.set(0.75, 1.45, 0); stom.rotation.z = -0.55; stom.castShadow = true; tract.add(stom);
      // 소장: 구불구불
      const sp = []; const rows = 7;
      for (let r = 0; r < rows; r++) { const y = 0.55 - r * 0.28, dir = r % 2 ? -1 : 1; sp.push(new V3(-dir * 1.05, y, 0.12 * (r % 3 - 1)), new V3(-dir * 0.4, y - 0.05, 0.2), new V3(dir * 0.4, y - 0.1, -0.2), new V3(dir * 1.05, y - 0.14, 0.1 * (r % 2))); }
      const small = tube([new V3(-0.3, 1.05, 0.05), new V3(-0.7, 0.85, 0.1), ...sp], 0.13, 0xf0a897, { roughness: 0.45 });
      // 대장 (소장을 감싸요)
      const lp = [new V3(-1.55, -1.5, 0), new V3(-1.65, -0.6, 0), new V3(-1.6, 0.5, 0), new V3(-1.2, 0.95, 0), new V3(0, 1.0, 0), new V3(1.2, 0.95, 0), new V3(1.6, 0.4, 0), new V3(1.65, -0.7, 0), new V3(1.4, -1.5, 0), new V3(0.6, -1.85, 0), new V3(0.1, -2.2, 0), new V3(0.1, -2.8, 0.05)];
      const large = tube(lp, 0.24, 0xc8a46a, { roughness: 0.7 });
      const anus = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), org(0x8a5a3a)); anus.position.set(0.1, -2.85, 0.05); tract.add(anus);
      // 간 · 쓸개 · 이자
      const liver = new THREE.Mesh(new THREE.SphereGeometry(1, 36, 24), org(0x8c3b32, { roughness: 0.42, clearcoat: 0.35 })); liver.scale.set(1.25, 0.7, 0.7); liver.position.set(-1.05, 1.6, 0.15); liver.rotation.z = 0.15; liver.castShadow = true; tract.add(liver);
      const gall = new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 16), org(0x3f9a5c, { roughness: 0.3, clearcoat: 0.5 })); gall.scale.set(0.8, 1.2, 0.8); gall.position.set(-0.6, 1.1, 0.4); tract.add(gall);
      const panc = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 1.5, 6, 14), org(0xe3b85e, { roughness: 0.5 })); panc.rotation.z = Math.PI / 2; panc.position.set(0.25, 0.95, -0.3); tract.add(panc);
      // 음식물 경로
      const food = new THREE.CatmullRomCurve3([
        new V3(0, 4.9, 0.55), new V3(0, 4.3, 0.1), new V3(0, 3.0, 0), new V3(0.2, 2.1, 0), new V3(0.75, 1.45, 0), new V3(0.1, 1.05, 0.05), new V3(-0.7, 0.85, 0.1), ...sp.filter((_, i) => i % 2 === 0),
        new V3(-1.55, -1.5, 0), ...lp.slice(0), ]);
      const bolus = new THREE.Mesh(new THREE.SphereGeometry(0.26, 24, 16), mat(lc(0xffc93a), { emissive: lc(0xaa7a00), emissiveIntensity: 0.6, roughness: 0.35 })); tract.add(bolus); ctx.halo(bolus, 0xffd060, 1.5, 0.45);
      const bits = []; for (let i = 0; i < 10; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffe08a })); bolus.add(b); bits.push(b); }
      const lTr = [label('입', mouth, { offset: [0.0, 0.0, 0.35] }), label('식도', [0, 3.4, 0.1]), label('위', stom, { offset: [0.9, 0.25, 0.3] }), label('간', liver, { offset: [-0.3, 0.55, 0.4] }), label('쓸개', gall, { offset: [-0.1, -0.35, 0.3] }), label('이자', panc, { offset: [0.2, 0.3, -0.1] }), label('소장', [0, -0.95, 0.3]), label('대장', [-1.75, -0.2, 0.1]), label('항문', anus, { offset: [0.5, -0.1, 0] })];
      const enz = [label('아밀레이스', mouth, { offset: [1.0, 0.05, 0], color: 'rgba(200,120,20,.95)' }), label('펩신', stom, { offset: [1.8, -0.35, 0], color: 'rgba(160,50,140,.95)' }), label('아밀레이스 · 트립신 · 라이페이스', small, { offset: [2.3, 0.2, 0.4], color: 'rgba(30,130,150,.95)' })];

      /* ============ 소장 융털 ============ */
      const wallBase = new THREE.Mesh(new THREE.BoxGeometry(9, 0.8, 3.6), org(0xee9f93, { roughness: 0.55 })); wallBase.position.set(0, -2.2, 0); vil.add(wallBase);
      const lumen = new THREE.Mesh(new THREE.BoxGeometry(9, 4.6, 3.6), new THREE.MeshStandardMaterial({ color: 0xffe8a8, transparent: true, opacity: 0.06, depthWrite: false })); lumen.position.set(0, 0.5, 0); vil.add(lumen);
      const villi = [];
      const VX = [-3.4, -1.7, 0, 1.7, 3.4];
      VX.forEach((x, i) => {
        const big = i === 2, h = big ? 3.6 : 2.4, r = big ? 0.78 : 0.5;
        const g = new THREE.Group(); g.position.set(x, -1.8, big ? 0.3 : -0.9 + (i % 2) * 0.2);
        const sk = new THREE.Mesh(new THREE.CapsuleGeometry(r, h - 2 * r, 10, 24), MT.organic(lc(0xf08f86), { opacity: big ? 0.4 : 0.74 })); sk.position.y = h / 2; sk.renderOrder = 2; g.add(sk);
        if (big) {
          // 모세 혈관 (고리) · 암죽관 (가운데)
          const cc = new THREE.CatmullRomCurve3([new V3(-0.25, 0, 0), new V3(-0.4, 1.5, 0.05), new V3(-0.3, 2.8, 0), new V3(0, 3.15, 0), new V3(0.3, 2.8, 0), new V3(0.4, 1.5, 0.05), new V3(0.25, 0, 0)]);
          g.add(new THREE.Mesh(new THREE.TubeGeometry(cc, 60, 0.07, 12, false), MT.plastic(lc(0xe23b36), { roughness: 0.3, extra: { emissive: lc(0x7a1010), emissiveIntensity: 0.3 } })));
          const lac = new THREE.CatmullRomCurve3([new V3(0, 0, 0), new V3(0, 1.5, 0), new V3(0, 2.9, 0)]);
          g.add(new THREE.Mesh(new THREE.TubeGeometry(lac, 30, 0.12, 12, false), MT.plastic(lc(0xf5cf55), { roughness: 0.3, extra: { emissive: lc(0x9a7a10), emissiveIntensity: 0.3 } })));
          g.userData = { cap: cc, lac };
        }
        vil.add(g); villi.push(g);
      });
      const big = villi[2];
      const NN = 18;
      const gl = new THREE.InstancedMesh(new THREE.SphereGeometry(0.09, 10, 8), new THREE.MeshBasicMaterial({ color: 0x8fd0ff }), NN);
      const fa = new THREE.InstancedMesh(new THREE.SphereGeometry(0.09, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffb02e }), NN);
      gl.frustumCulled = fa.frustumCulled = false; vil.add(gl, fa);
      const lVil = [label('융털', big, { offset: [1.3, 3.2, 0.3] }), label('모세 혈관', big, { offset: [-1.5, 2.2, 0.3], color: 'rgba(210,50,50,.95)' }), label('암죽관', big, { offset: [1.6, 1.3, 0.3], color: 'rgba(170,130,10,.95)' }), label('포도당 · 아미노산', [-3.0, 1.6, 0.5], { color: 'rgba(40,120,190,.95)' }), label('지방산 · 모노글리세리드', [3.0, 1.9, 0.5], { color: 'rgba(190,120,10,.95)' })];
      vil.visible = false;

      let mode = 'tract', u = 0, labsOn = true, enzOn = true, lastS = -1, pl = null, internal = false, pushedAt = -9, now = 0;
      const dm = new THREE.Object3D(), tmp = new V3();

      /* ===== 실험 장면 tests(영양소 검출) · saliva(침의 소화 작용): 2D와 같은 시험관 · 점적병 · 색 변화 ===== */
      let lpl = null;
      const lab = new THREE.Group(); lab.visible = false; root.add(lab);
      const UX = 0.0095, X3 = (px) => (px - 400) * UX, Y3 = (py) => 2.6 + (228 - py) * UX;
      { const bench = new THREE.Mesh(new THREE.BoxGeometry(9.6, 0.24, 3.2), MT.stone(0x8f9a94, { repeat: 3, bump: 0.01 })); bench.position.y = -0.12; bench.receiveShadow = true; lab.add(bench);
        const rack = new THREE.Mesh(new THREE.BoxGeometry(9.0, 0.12, 0.9), MT.wood(0xe6d2b4)); rack.position.set(0, 0.06, 0); lab.add(rack); }
      const NUT = { starch: '녹말', sugar: '당', protein: '단백질', fat: '지방' };
      const LTUBE = [0, 1, 2, 3].map((i) => {
        const g = new THREE.Group(); lab.add(g);
        const gl = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 2.3, 28, 1, true), MT.glass({ opacity: 0.2 })); gl.position.y = 1.35; g.add(gl);
        const gb = new THREE.Mesh(new THREE.SphereGeometry(0.36, 24, 12, 0, 6.283, Math.PI / 2, Math.PI / 2), gl.material); gb.position.y = 0.36; g.add(gb);
        const liq = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.31, 1, 24), new THREE.MeshStandardMaterial({ color: 0xefe7d3, roughness: 0.25, transparent: true, opacity: 0.92 })); g.add(liq);
        const liqB = new THREE.Mesh(new THREE.SphereGeometry(0.31, 20, 10, 0, 6.283, Math.PI / 2, Math.PI / 2), liq.material); liqB.position.y = 0.36; g.add(liqB);
        const heat = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 1.5, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0xff8a2a, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide })); heat.position.y = 0.95; g.add(heat);
        const bub = [0, 1, 2, 3].map(() => { const b = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 })); g.add(b); return b; });
        const lb = label('', g, { size: 11.5, offset: [0, -0.35, 0.6] });
        return { g, gl, liq, liqB, heat, bub, lb };
      });
      const LDROP = [0, 1, 2, 3].map((i) => {
        const g = new THREE.Group(); lab.add(g);
        const bt = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.8, 20), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.25, transparent: true, opacity: 0.9 })); bt.position.y = 0.55; g.add(bt);
        const cap = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 10), mat(0x2a2f3a, { roughness: 0.5 })); cap.position.y = 1.05; g.add(cap);
        const tip = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.4, 12), new THREE.MeshStandardMaterial({ color: 0xeef7fc, transparent: true, opacity: 0.85 })); tip.rotation.x = Math.PI; tip.position.y = 0.0; g.add(tip);
        const dr = [0, 1, 2].map(() => { const d = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), new THREE.MeshStandardMaterial({ color: 0xffffff })); lab.add(d); return d; });
        return { g, bt, tip, dr, lb: label('', g, { size: 11.5, offset: [0, 0.7, 0] }) };
      });
      const bathBox = new THREE.Mesh(new THREE.BoxGeometry(4.6, 1.5, 1.6), new THREE.MeshStandardMaterial({ color: 0x7cc7ec, transparent: true, opacity: 0.28, roughness: 0.1, depthWrite: false })); bathBox.position.set(-1.7, 0.75, 0); bathBox.visible = false; lab.add(bathBox);
      const bathLab = label('', [0, 0, 0], { size: 12.5, color: 'rgba(30,100,170,.92)' });
      const RGC = { iodine: [0xefe7d3, 0x1e2670, 0xdcae52], benedict: [0xefe7d3, 0xd9531a, 0x3f86dd], biuret: [0xf6f3e4, 0x8a4cd1, 0x9cc3f2], sudan: [0xf1d36a, 0xff2d55, 0xf1d36a] };
      const RGN = { iodine: '아이오딘', benedict: '베네딕트', biuret: '뷰렛', sudan: '수단 Ⅲ' };
      const TST = [['iodine', '밥물 (녹말)', 'starch', '청람색'], ['benedict', '포도당 용액 (당)', 'sugar', '황적색'], ['biuret', '달걀 흰자 (단백질)', 'protein', '보라색'], ['sudan', '식용유 (지방)', 'fat', '선홍색']];
      const FOODC = [0xefe7d3, 0xf1ecc8, 0xf6f3e4, 0xf1d36a];
      const cc2 = new THREE.Color(), cc3 = new THREE.Color();
      const sm2 = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
      let labTxt = '', lpmode = false, lpP = 0;
      function setLabInfo(h) { if (h !== labTxt) { labTxt = h; info(h); } }
      // 2D 시험관 → 3D 값
      const tubeLive = (tb, name) => ({ x: tb.x, color: tb.color, lvl: tb.lvl, heat: tb.heat || 0, alpha: tb.alpha == null ? 1 : tb.alpha, label: name, ripple: tb.ripple || 0 });
      const dropLive = (dp, name) => ({ x: dp.x, y: dp.y, color: dp.color, label: name, job: dp.job ? dp.job.stage : null, armed: !!dp.armed });
      function labFrame(S, l, t, dt) {
        const sc = S.scene; let tubes = [], drops = [], head = '', extra = '', bath = null;
        if (lpmode) {
          const p = lpP, T = p * 24;
          if (sc === 'tests') {
            const k = Math.min(3, Math.floor(T / 6)), q = (T - k * 6) / 6, key = TST[k][0], rc = RGC[key];
            tubes = [0, 1, 2, 3].map((i) => { let col = FOODC[i], hot = 0; if (i === k) { cc2.setHex(rc[0]); cc3.setHex(rc[1]); col = '#' + cc2.lerp(cc3, sm2((q - 0.35) / 0.3)).getHexString(); hot = key === 'benedict' ? (q > 0.2 && q < 0.9 ? 1 : 0) : 0; } else { col = '#' + new THREE.Color(FOODC[i]).getHexString(); } return { x: 120 + i * 187, color: col, lvl: 0.58, heat: hot, alpha: 1, label: TST[i][1], ripple: 0 }; });
            drops = [{ x: 120 + k * 187, y: q < 0.1 ? 138 + (228 - 138 - 70) * sm2(q / 0.1) : q < 0.5 ? 228 - 70 : 228 - 70 - (q - 0.5) / 0.1 * 90, color: '#' + new THREE.Color(RGC[key][2]).getHexString(), label: RGN[key], job: q > 0.1 && q < 0.3 ? 'drip' : null, armed: false }];
            head = RGN[key] + ' → ' + TST[k][1].split(' ')[0] + (q > 0.7 ? ': ' + TST[k][3] + ' · ' + NUT[TST[k][2]] + ' 있음!' : '');
            extra = q > 0.7 ? '<b>' + RGN[key] + ' 용액</b>이 ' + TST[k][3] + '으로 변했어요 → <b>' + NUT[TST[k][2]] + '</b>이 들어 있어요!' + (key === 'benedict' ? ' (베네딕트 용액은 가열해야 해요)' : '') : '<b>' + RGN[key] + ' 용액</b>을 ' + TST[k][1].split(' ')[0] + '에 떨어뜨려요.';
          } else {
            const ph = T < 4 ? 'prep' : T < 12 ? 'bath' : 'test', dg = ph === 'prep' ? 0 : ph === 'bath' ? sm2((T - 4) / 8) : 1, milk = 0xf0e9d8;
            if (ph !== 'test') {
              const q = T / 4;
              tubes = [{ x: 140, color: '#f0e9d8', lvl: ph === 'prep' ? 0.35 + 0.15 * sm2(q * 2) : 0.5, heat: 0, alpha: 1, label: 'A · 증류수 + 녹말' }, { x: 300, color: '#f0e9d8', lvl: ph === 'prep' ? 0.35 + 0.15 * sm2(q * 2) : 0.5, heat: 0, alpha: 1, label: 'B · 침 + 녹말' }];
              if (ph === 'prep') drops = [{ x: 140, y: 150, color: '#9fdcf5', label: '증류수', job: q < 0.8 ? 'drip' : null }, { x: 300, y: 150, color: '#f5ecb0', label: '침', job: q < 0.8 ? 'drip' : null }];
              if (ph === 'bath') bath = { text: '37 °C 물중탕 ' + (dg * 10).toFixed(0) + '분 · 침 속 아밀레이스가 녹말을 엿당으로 분해해요', x0: -3.2, x1: 0.3 };
              head = ph === 'prep' ? '시험관 A에는 증류수, B에는 침을 넣어요' : '37 °C 물중탕 ' + (dg * 10).toFixed(0) + '분';
            } else {
              const q = (T - 12) / 12, col = (a, b, f) => { cc2.setHex(a); cc3.setHex(b); return '#' + cc2.lerp(cc3, f).getHexString(); };
              const fi = sm2((q - 0.1) / 0.2), fb = sm2((q - 0.55) / 0.2);
              tubes = [{ x: 110, color: col(milk, 0x1e2670, fi), lvl: 0.5, heat: 0, alpha: 1, label: 'A · 아이오딘' }, { x: 215, color: col(milk, 0xa6a8cf, fi), lvl: 0.5, heat: 0, alpha: 1, label: 'B · 아이오딘' }, { x: 365, color: col(milk, 0x3f86dd, fb), lvl: 0.5, heat: q > 0.55 && q < 0.95 ? 1 : 0, alpha: 1, label: 'A · 베네딕트' }, { x: 470, color: col(milk, 0xdb6a1c, fb), lvl: 0.5, heat: q > 0.55 && q < 0.95 ? 1 : 0, alpha: 1, label: 'B · 베네딕트' }];
              head = q < 0.5 ? '아이오딘 검사: A는 청람색, B는 연해요' : '베네딕트 검사: A는 변화 없고 B는 황적색이에요';
              extra = q < 0.5 ? '침을 넣지 않은 <b>A</b>는 녹말이 그대로라 <b>청람색</b>, 침을 넣은 <b>B</b>는 녹말이 줄어 색이 <b>연해요</b>.' : '침을 넣은 <b>B</b>에서만 <b>황적색</b>이 나타나요 → 녹말이 <b>당(엿당)</b>으로 분해되었어요.';
              drops = [{ x: q < 0.5 ? 162 : 417, y: 150, color: q < 0.5 ? '#d99a32' : '#3f86dd', label: q < 0.5 ? '아이오딘' : '베네딕트', job: q < 0.25 || (q > 0.55 && q < 0.7) ? 'drip' : null }];
            }
          }
        } else if (sc === 'tests') {
          const Tt = S.T || (l && l.T); if (!Tt) return;
          tubes = Tt.tubes.map((tb) => tubeLive(tb, tb.food ? tb.food.name + ' (' + NUT[tb.food.nut] + ')' : ''));
          drops = Object.keys(Tt.dp).map((k) => dropLive(Tt.dp[k], Tt.dp[k].label));
          const note = Tt.tubes.map((tb) => tb.note).filter(Boolean).sort((a, b) => b.t0 - a.t0)[0], found = Object.keys(Tt.found).map((k) => NUT[k]).join(' · ');
          extra = (note ? '<b>' + note.text + '</b><br>' : '') + '찾은 영양소: <b>' + (found || '아직 없어요') + '</b><br>아이오딘 → 녹말(청람색) · 베네딕트(가열) → 당(황적색) · 뷰렛 → 단백질(보라색) · 수단 Ⅲ → 지방(선홍색)<br>▶ 실험 보기를 누르면 검출 반응을 차례로 볼 수 있어요.';
          head = '';
        } else {
          const SL = l && l.SAL; if (!SL) return;
          const ph = SL.phase;
          if (ph === 'test') tubes = SL.split.map((q) => tubeLive(q, q.tag + ' · ' + (q.group === 1 ? '아이오딘' : '베네딕트'))); else tubes = [SL.A, SL.B].map((q, i) => tubeLive(q, (i ? 'B · 침' : 'A · 증류수') + ' + 녹말'));
          const keys = ph === 'prep' ? ['water', 'saliva'] : ph === 'test' ? ['iodine', 'benedict'] : [];
          drops = keys.map((k) => dropLive(SL.dp[k], SL.dp[k].label));
          if (ph === 'bath') bath = { text: '37 °C 물중탕 ' + Math.round(SL.time) + '분', x0: -3.2, x1: 0.3 };
          extra = ph === 'prep' ? '시험관 <b>A</b>에는 증류수, <b>B</b>에는 침을 넣어요.' : ph === 'bath' ? '<b>37 °C 물중탕</b>(몸 온도)에서 ' + Math.round(SL.time) + '분: 침 속 <b>아밀레이스</b>가 녹말을 <b>엿당</b>으로 분해해요.' : '아이오딘은 <b>녹말</b>이 있으면 청람색, 베네딕트는 가열했을 때 <b>당</b>이 있으면 황적색이 돼요. 침을 넣은 B에는 녹말이 줄고 당이 생겨요.';
        }
        // 시험관 그리기
        LTUBE.forEach((o, i) => {
          const tb = tubes[i]; o.g.visible = !!tb && tb.alpha > 0.05; o.lb.show(o.g.visible);
          if (!tb || !o.g.visible) return;
          o.g.position.set(X3(tb.x), 0.12, 0);
          cc2.set(tb.color); o.liq.material.color.copy(cc2);
          const h = Math.max(0.05, tb.lvl * 3.0 - 0.3); o.liq.scale.y = h; o.liq.position.y = 0.36 + h / 2;
          o.heat.material.opacity = Math.min(0.28, tb.heat * 0.28) * (0.8 + 0.2 * Math.sin(t * 6)); o.heat.visible = tb.heat > 0.05;
          o.bub.forEach((b, j) => { const u = ((t * 0.7 + j / 4) % 1); b.visible = tb.heat > 0.15; b.position.set(Math.sin(j * 2.1 + t) * 0.15, 0.5 + u * (h - 0.2), Math.cos(j * 1.7) * 0.12); });
          o.lb.set(tb.label || ''); o.lb.off = [0, -0.2, 0.55];
          o.g.rotation.z = Math.sin(t * 30) * 0.01 * (tb.ripple > 0.1 ? 1 : 0);
        });
        LDROP.forEach((o, i) => {
          const d = drops[i]; o.g.visible = !!d; o.lb.show(!!d); o.dr.forEach((x) => { x.visible = false; });
          if (!d) return;
          o.g.position.set(X3(d.x), Y3(d.y) + 0.0, 0); o.g.rotation.z = d.job ? 0 : 0.0;
          cc2.set(d.color); o.bt.material.color.copy(cc2); o.tip.material.color.copy(cc2.clone().lerp(new THREE.Color(0xffffff), 0.6));
          o.lb.set(d.label || ''); o.lb.show(true);
          if (d.job === 'drip' || d.job === 'pour') o.dr.forEach((x, j) => { const u = ((t * 1.6 + j / 3) % 1); x.visible = true; x.position.set(o.g.position.x, o.g.position.y - 0.25 - u * 1.2, 0); x.material.color.copy(cc2); });
        });
        bathBox.visible = !!bath; if (bath) { bathBox.position.x = (bath.x0 + bath.x1) / 2; bathBox.scale.x = (bath.x1 - bath.x0) / 4.6; bathLab.obj = [(bath.x0 + bath.x1) / 2, 1.8, 0.9]; bathLab.set('37 °C 물중탕'); } bathLab.show(!!bath);
        const phE = document.querySelector('.v3-player .v3-ph');
        setLabInfo((lpmode ? '<b>▶ ' + head + '</b><br>' : '') + extra + (sc === 'saliva' && !lpmode && S.scene ? '' : ''));
      }
      function apply() {
        tract.visible = mode === 'tract'; vil.visible = mode === 'vil'; lab.visible = mode === 'lab'; if (mode !== 'lab') { LTUBE.forEach((o) => o.lb.show(false)); LDROP.forEach((o) => o.lb.show(false)); bathLab.show(false); } lpmode = false;
        lTr.forEach((l) => l.show(labsOn && mode === 'tract')); enz.forEach((l) => l.show(enzOn && mode === 'tract' && !cardsShown)); lVil.forEach((l) => l.show(labsOn && mode === 'vil'));
        if (mode === 'lab') { orbit.dist = PHN ? 15.5 : 10.5; orbit.ty = 1.0; orbit.phi = 1.3; orbit.theta = 0.2; } else if (mode === 'tract') { orbit.dist = PHN ? 17 : 12.5; orbit.ty = 1.0; orbit.phi = 1.35; } else { orbit.dist = PHN ? 13 : 9.5; orbit.ty = 0.1; orbit.phi = 1.3; }
        lastS = -1;
        playerRow(mode === 'tract');
        if (mode === 'lab') labTxt = '';
        if (mode === 'vil') info('<b>소장 융털</b>이 영양소를 흡수해요.<br><b style="color:#8fd0ff">포도당·아미노산</b> → <b>모세 혈관</b><br><b style="color:#ffb02e">지방산·모노글리세리드</b> → <b>암죽관</b>');
      }
      const sg = controls.segment('보기', [{ label: '소화 기관', value: 'tract' }, { label: '소장 융털', value: 'vil' }], mode, (v) => { mode = v; apply(); });
      const stSeg = controls.segment('이동', ST.map((s, i) => ({ label: s.n, value: i })), 0, (i) => { pl.pause(); pl.set((ST[i].u[0] + ST[i].u[1]) / 2); });
      // ▶ 재생: 음식물이 입 → 식도 → 위 → 소장 → 대장으로 지나가요 (2D의 '음식물 위치'와 같은 값으로 움직여요)
      pl = controls.player({
        duration: 30, loop: true, autoplay: false, label: '음식물 따라가기',
        phases: ST.map((q) => [q.u[0], q.n]),
        onFrame(p, dt) {
          u = p;
          if (internal || !pl || mode !== 'tract') return;
          if (dt === 0) pushedAt = now;              // 진행 막대를 직접 움직였어요
          const T2 = sm() && sm().TR; if (T2) { T2.auto = null; T2.pt = pOfU(p); }
        },
      });
      lpl = controls.player({ duration: 24, loop: true, autoplay: false, label: '실험 보기', phases: [[0, '']], onFrame(p) { lpmode = true; lpP = p; } });
      let ctlEl = null;
      function playerRow(on) {
        if (!ctlEl) ctlEl = ctx.renderer.domElement.closest('.v3-wrap').querySelector('.v3-ctl');
        const rows = ctlEl.querySelectorAll('.v3-player'); if (rows[0]) rows[0].style.display = on ? '' : 'none'; if (rows[1]) rows[1].style.display = mode === 'lab' ? '' : 'none';
        [...ctlEl.children].forEach((c) => { if (c.classList.contains('lab') && c.textContent.trim() === '이동') c.style.display = on ? '' : 'none'; });
        [...ctlEl.querySelectorAll('button')].forEach((b) => { if (ST.some((q) => q.n === b.textContent.trim())) b.style.display = on ? '' : 'none'; });
      }
      controls.button('이름표', () => { labsOn = !labsOn; enzOn = labsOn; apply(); });
      /* 효소 카드 놓기(3단계 미션): 카드를 고른 뒤 놓을 곳 버튼을 눌러요 → 2D 카드와 같은 상태(window.__sim.placeCard) */
      const CN = ['아밀레이스', '펩신', '트립신', '라이페이스'], CS = [['mouth', '입'], ['stomach', '위'], ['small', '소장']];
      const ctlBar = ctx.renderer.domElement.closest('.v3-wrap').querySelector('.v3-ctl');
      const cardUI = []; let cardSel = 0, cardsShown = false, lastCardKey = '';
      { const c0 = ctlBar.children.length;
        const segC = controls.segment('효소 카드', CN.map((n, i) => ({ label: n, value: i })), 0, (v) => { cardSel = v; });
        CS.forEach(([k, n]) => controls.button(n + '에 놓기', () => {
          const s = sm(); if (!s || !s.placeCard) return; s.placeCard(cardSel, k);
          const nx = [1, 2, 3, 4].map((d) => (cardSel + d) % 4).find((i) => { const c = s.TR.cards.find((q) => q.idx === i); return c && !c.site; });
          if (nx != null) { cardSel = nx; segC.set(nx); }
        }));
        for (let i = c0; i < ctlBar.children.length; i++) cardUI.push(ctlBar.children[i]); }
      const siteLab = { mouth: label('', mouth, { offset: [1.0, 0.05, 0], color: 'rgba(22,130,70,.95)' }), stomach: label('', stom, { offset: [1.8, -0.35, 0], color: 'rgba(22,130,70,.95)' }), small: label('', small, { offset: [2.3, 0.2, 0.4], color: 'rgba(22,130,70,.95)' }) };
      function cardFrame() {
        const s = sm(), on = !!(s && s.cardsOn && s.cardsOn()) && mode === 'tract';
        if (on !== cardsShown) { cardsShown = on; cardUI.forEach((e) => { e.style.display = on ? '' : 'none'; }); enz.forEach((l) => l.show(enzOn && mode === 'tract' && !on)); lastS = -1; lastCardKey = ''; }
        if (!on) { Object.keys(siteLab).forEach((k) => siteLab[k].show(false)); return false; }
        const cards = s.TR.cards, key = cards.map((c) => c.idx + ':' + c.site).join(',');
        if (key !== lastCardKey) {
          lastCardKey = key;
          CS.forEach(([k, n]) => { const names = cards.filter((c) => c.site === k).sort((a, b) => a.idx - b.idx).map((c) => c.name); siteLab[k].set('🃏 ' + n + ': ' + (names.join(' · ') || '?')); siteLab[k].show(true); });
          const left = cards.filter((c) => !c.site).length;
          info('<b>효소 카드 놓기</b>: 아래에서 카드를 고른 뒤 <b>입 · 위 · 소장</b> 중 그 효소가 일하는 곳 버튼을 눌러요.<br>' + (left ? '남은 카드 <b>' + left + '장</b>' : '다 놓았으면 <b>✔ 확인하기</b>를 눌러요.'));
        }
        return true;
      }
      cardUI.forEach((e) => { e.style.display = 'none'; });
      apply();
      let lastSc = '', k0 = 0;
      function readScene() { const s = sm() && sm().S && sm().S.scene; if (!s || s === lastSc) return; lastSc = s; const m = s === 'villi' ? 'vil' : (s === 'tests' || s === 'saliva') ? 'lab' : 'tract'; if (m !== mode) { if (lpmode) { lpmode = false; if (lpl) lpl.pause(); } mode = m; sg.set(m); apply(); } }
      return {
        sync() { lastSc = ''; readScene(); },
        update(dt, t) {
          if ((k0++ % 15) === 0) readScene();
          if (mode !== 'tract') cardFrame();
          if (mode === 'lab') { const sm0 = sm(); if (sm0 && sm0.S) labFrame(sm0.S, sm0, t, dt); return; }
          if (mode === 'tract') {
            now = t;
            { // 2D에서 음식물을 옮기면(슬라이더 · 따라가기) 3D도 같은 위치로
              const T2 = sm() && sm().TR;
              if (T2 && (T2.auto || (!pl.playing && t - pushedAt > 1))) {
                if (T2.auto && pl.playing) pl.pause();
                const u2 = uOfP(T2.p);
                if (Math.abs(u2 - u) > 0.002) { internal = true; pl.set(Math.max(0, Math.min(1, u2))); internal = false; }
              }
            }
            bolus.position.copy(food.getPointAt(u));
            let s = ST.findIndex((q) => u >= q.u[0] && u < q.u[1]); if (s < 0) s = 0;
            const cards = cardFrame();
            if (s !== lastS) { lastS = s; if (!cards) info(ST[s].t + '<br>소화: 큰 영양소가 작은 영양소로 잘게 쪼개지는 과정이에요.'); stSeg.set(s); }
            // 분해: 단계가 지날수록 덩어리가 작아지고 조각이 흩어져요
            const brk = Math.min(1, Math.max(0, (u - 0.05) / 0.45));
            bolus.scale.setScalar(1 - 0.45 * brk); bits.forEach((b, i) => { const a = i * 2.4 + t * 1.5; b.position.set(Math.cos(a), Math.sin(a * 1.3), Math.sin(a)).multiplyScalar(0.3 + 0.6 * brk); b.scale.setScalar(0.6 + 0.5 * brk); });
            stom.scale.set(1.05 + 0.03 * Math.sin(t * 3), 0.75, 0.65);
          } else {
            const g = big.userData;
            for (let i = 0; i < NN; i++) {
              const ph = (t * 0.28 + i / NN) % 1, a = i * 2.39;
              // 포도당 · 아미노산: 소장 안 → 융털 → 모세 혈관을 따라 올라가요
              const x0 = -2.4 + Math.cos(a) * 0.6, y0 = -1.2 + (i % 5) * 0.6, bp = big.position;
              if (ph < 0.4) { const k = ph / 0.4; tmp.set(x0 + (bp.x - 0.3 - x0) * k, y0 + (-1.5 - y0) * k, 0.3 * (1 - k) + bp.z * k); }
              else { const q = g.cap.getPointAt(Math.min(0.999, (ph - 0.4) / 0.6)); tmp.set(q.x + bp.x, q.y + bp.y, q.z + bp.z); }
              dm.position.copy(tmp); dm.scale.setScalar(1); dm.updateMatrix(); gl.setMatrixAt(i, dm.matrix);
              // 지방산 · 모노글리세리드: → 암죽관(가운데)을 따라 올라가요
              const x1 = 2.5 + Math.cos(a * 1.7) * 0.6;
              if (ph < 0.4) { const k = ph / 0.4; tmp.set(x1 + (bp.x - x1) * k, y0 + (-1.4 - y0) * k, 0.3 * (1 - k) + bp.z * k); }
              else { const k = (ph - 0.4) / 0.6; tmp.set(bp.x, bp.y + 0.1 + k * 2.9, bp.z); }
              dm.position.copy(tmp); dm.updateMatrix(); fa.setMatrixAt(i, dm.matrix);
            }
            gl.instanceMatrix.needsUpdate = fa.instanceMatrix.needsUpdate = true;
          }
        },
      };
    },
  });
})();
