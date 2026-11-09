/* hb-pathogens · 3D 병원체 5종 (바이러스 · 세균 · 곰팡이 · 원생생물 · 기생충)
   2D 차시의 가상 현미경 시료와 같은 5종: 병원체마다 세포 구조·핵(핵막)·몸 구성·크기·관찰 도구와 예(독감·홍역 / 결핵·식중독 / 무좀 / 말라리아 / 회충증)를 2D와 같은 값으로 보여 줘요.
   2D에서 고른 시료를 따라가고, 3D에서 고르면 2D 시료도 바뀌어요. 기생충은 몸이 움직이는 모습을 보여 줘요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const narrow = window.innerWidth < 600 || window.innerHeight > window.innerWidth * 1.1;
  function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  const KINDS = [
    { k: '바이러스', info: '<b>바이러스</b>(독감): 세포 구조가 없어요. 단백질 껍질과 유전 물질뿐이고, 살아 있는 숙주 세포 안에서만 증식해요.' },
    { k: '세균', info: '<b>세균</b>(식중독균·결핵균): 핵막이 없는 원핵생물이에요. 세포벽이 있고 스스로 분열해 증식해요.' },
    { k: '곰팡이', info: '<b>곰팡이</b>(무좀균): 핵이 있는 진핵생물이에요. 균사와 포자로 번식하고 다른 생물에서 양분을 얻어요.' },
    { k: '원생생물', info: '<b>원생생물</b>(말라리아 원충): 핵이 있는 단세포 진핵생물이에요. 적혈구 안에서 자라요.' },
    { k: '기생충', info: '<b>기생충</b>(회충): 소화관 등 기관이 있는 다세포 동물이에요. 알로 퍼지고 몸속에 살아요.' },
  ];

  window.SciSim3D.attach({
    title: '병원체 5종 3D 비교',
    hint: '병원체를 골라 돌려 보세요 · 구조와 크기가 달라요',
    camera: { dist: narrow ? 13 : 9.5, theta: 0.6, phi: 1.15, min: 4.5, max: 20 },
    autoRotate: 0.25,
    levels: [0],   // 병원체 비교(시료 단추 · 비교표 칸 단추). 카드 끌기가 있는 증식·전염, 질병 분류와 환자·마을 장면은 2D
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      /* 미션 보조 판: 미션이 말하는 표·기록·카드를 3D 화면 구석에 작게 보여 줘요 (2D 상태를 그대로 읽어요) */
      const mxBox = (pos) => {
        const v = ctx.renderer.domElement.parentElement;
        if (!document.getElementById('mx3d-css')) { const s = document.createElement('style'); s.id = 'mx3d-css'; s.textContent =
          '.mx3d{position:absolute;z-index:3;padding:6px 8px;border-radius:12px;background:rgba(8,12,24,.8);color:#fff;font-size:12px;line-height:1.35;pointer-events:none;max-width:48%;box-shadow:0 4px 14px rgba(0,0,0,.35)}.mx3d:empty{display:none}' +
          '.mx3d.tr{right:10px;top:10px}.mx3d.br{right:10px;bottom:34px}.mx3d.bl{left:10px;bottom:10px}.mx3d .h{font-weight:900;margin-bottom:3px}' +
          '.mx3d table{border-collapse:collapse}.mx3d th,.mx3d td{padding:1px 5px;text-align:center;white-space:nowrap}.mx3d th{color:#b9c6e4;font-weight:800}.mx3d td:first-child,.mx3d th:first-child{text-align:left}' +
          '.mx3d .on{color:#ffd34d;font-weight:800}.mx3d .ok{color:#7ee2a8;font-weight:800}.mx3d .no{color:#ff9a9a;font-weight:800}.mx3d .dim{color:#8d99b3}.mx3d tr.sel td{background:rgba(255,211,77,.16)}' +
          '@media (max-width:599px){.mx3d{font-size:10.5px;padding:4px 6px;max-width:60%}.mx3d.tr{top:auto;bottom:30px}.mx3d th,.mx3d td{padding:0 3px}}';
          document.head.appendChild(s); }
        const el = document.createElement('div'); el.className = 'mx3d ' + (pos || 'tr'); v.appendChild(el);
        let last = ''; el.put = (h) => { if (h !== last) { last = h; el.innerHTML = h; } }; return el;
      };
      const V3 = (x, y, z) => new THREE.Vector3(x, y, z || 0);
      const std = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.45, metalness: 0.03 }, o || {}));
      const ghost = (c, op, o) => std(c, Object.assign({ transparent: true, opacity: op, depthWrite: false, roughness: 0.2, side: THREE.DoubleSide }, o || {}));
      const sph = (r, m, x, y, z, sx, sy, sz) => { const o = new THREE.Mesh(new THREE.SphereGeometry(r, 28, 20), m); o.position.set(x || 0, y || 0, z || 0); if (sx) o.scale.set(sx, sy, sz); return o; };
      const tubeG = (pts, r, seg, closed) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, closed || false), seg || 60, r, 8, closed || false);
      const groups = [], labs = [], R = rng(21), D = new THREE.Object3D();
      const mk = (i) => { const g = new THREE.Group(); g.visible = false; root.add(g); groups[i] = g; labs[i] = []; return g; };
      const lab = (i, text, obj, o) => { const l = label(text, obj, o); l.show(false); labs[i].push(l); return l; };
      const fib = (n) => Array.from({ length: n }, (_, i) => { const y = 1 - (i + 0.5) * 2 / n, r = Math.sqrt(1 - y * y), a = i * 2.39996; return V3(Math.cos(a) * r, y, Math.sin(a) * r); });
      let anim = [];

      /* 0 바이러스 */
      { const g = mk(0);
        const cap = new THREE.Mesh(new THREE.IcosahedronGeometry(1.25, 1), std(0x4a8ae8, { roughness: 0.35, flatShading: true })); g.add(cap);
        g.add(sph(1.85, ghost(0xff9ec7, 0.3, { roughness: 0.15 }), 0, 0, 0));
        const rna = std(0xffd34d, { emissive: 0x7a5a00, emissiveIntensity: 0.4 });
        for (let k = 0; k < 6; k++) { const pts = []; const a0 = R() * 6, a1 = R() * 6; for (let i = 0; i < 12; i++) { const u = i / 11; pts.push(V3(Math.sin(u * 6 + a0) * 0.55 + (R() - 0.5) * 0.1, (u - 0.5) * 1.3, Math.cos(u * 5 + a1) * 0.55)); } const m = new THREE.Mesh(tubeG(pts, 0.05, 50), rna); m.rotation.set(k * 0.9, k * 1.3, k * 0.5); m.scale.setScalar(0.75); g.add(m); }
        const hM = std(0xff6a3d, { roughness: 0.4 }), nM = std(0x34c27a, { roughness: 0.4 });
        const sp = fib(42), spikes = [];
        sp.forEach((d, i) => { const m = i % 4 === 3 ? nM : hM, s = new THREE.Group(); const st = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.4, 8), m); st.position.y = 0.2; const tip = i % 4 === 3 ? new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 8), m) : new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.22, 12), m); tip.position.y = 0.5; if (i % 4 !== 3) tip.rotation.x = Math.PI; s.add(st, tip); s.position.copy(d.clone().multiplyScalar(1.82)); s.quaternion.setFromUnitVectors(V3(0, 1, 0), d); g.add(s); spikes.push(s); });
        g.userData.base = 1.3;
        lab(0, '돌기 단백질(항원)', spikes[0], { offset: [0.2, 0.4, 0] }); lab(0, '단백질 껍질', cap, { offset: [0.6, -0.5, 0.9] }); lab(0, '유전 물질', g, { offset: [0, 0.1, 0.4] });
        g.userData.spin = true; }
      /* 1 세균 */
      { const g = mk(1), bact = new THREE.Group(); g.add(bact);
        const wall = new THREE.Mesh(new THREE.CapsuleGeometry(0.95, 2.6, 12, 36), ghost(0x7bd88f, 0.3)); wall.rotation.z = Math.PI / 2; bact.add(wall);
        const wall2 = new THREE.Mesh(new THREE.CapsuleGeometry(0.82, 2.55, 12, 36), ghost(0x4bb86a, 0.25)); wall2.rotation.z = Math.PI / 2; bact.add(wall2);
        const pts = []; for (let i = 0; i <= 160; i++) { const a = i / 160 * Math.PI * 2; pts.push(V3(Math.cos(a * 3) * 0.9 + Math.cos(a) * 0.35, Math.sin(a * 2) * 0.35 + Math.sin(a * 5) * 0.12, Math.sin(a * 3) * 0.4 + Math.sin(a) * 0.15)); }
        const dna = new THREE.Mesh(tubeG(pts, 0.055, 240, true), std(0xffd34d, { emissive: 0x7a5a00, emissiveIntensity: 0.4 })); bact.add(dna);
        const plas = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.035, 8, 20), std(0xff7ac8)); plas.position.set(1.0, -0.35, 0.3); bact.add(plas);
        const rib = new THREE.InstancedMesh(new THREE.SphereGeometry(0.055, 8, 6), std(0xe6edf7), 70); for (let i = 0; i < 70; i++) { let x, y, z; do { x = (R() - 0.5) * 3.0; y = (R() - 0.5) * 1.4; z = (R() - 0.5) * 1.4; } while (y * y + z * z > 0.5 || Math.abs(x) > 1.25 + 0.0 || (Math.abs(x) < 0.9 && y * y + z * z < 0.12)); D.position.set(x, y, z); D.scale.setScalar(1); D.updateMatrix(); rib.setMatrixAt(i, D.matrix); } bact.add(rib);
        const fm = std(0x2f9e6c, { roughness: 0.5 }), fl = [];
        for (let k = 0; k < 6; k++) { const pts2 = []; const a = k * 1.05, off = (R() - 0.5) * 0.3; for (let i = 0; i < 24; i++) { const u = i / 23; pts2.push(V3(-1.35 - u * 2.4, Math.sin(u * 11 + k) * 0.17 * u + Math.sin(a) * 0.45 * (1 - u * 0.5), Math.cos(u * 11 + k) * 0.17 * u + Math.cos(a) * 0.45 * (1 - u * 0.5))); } const f = new THREE.Mesh(tubeG(pts2, 0.03, 60), fm); bact.add(f); fl.push(f); }
        for (let k = 0; k < 24; k++) { const d = V3(R() - 0.5, (R() - 0.5) * 1.6, (R() - 0.5) * 1.6).normalize(); if (Math.abs(d.x) > 0.7) continue; const pl = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.35, 5), fm); pl.position.set(d.x * 1.1 + (R() - 0.5) * 2, d.y * 0.9, d.z * 0.9); pl.quaternion.setFromUnitVectors(V3(0, 1, 0), V3(d.x * 0.3, d.y, d.z).normalize()); pl.position.y = d.y * 1.05; pl.position.z = d.z * 1.05; bact.add(pl); }
        bact.scale.setScalar(1.5);
        lab(1, '세포벽', bact, { offset: [0.3, 1.3, 0] }); lab(1, '원형 DNA (핵막 없음)', dna, { offset: [0, -1.4, 0.6] }); lab(1, '편모', fl[0], { offset: [-0.5, 0.7, 0.4] });
        g.userData.swim = bact; }
      /* 2 곰팡이 */
      let rootTube = null, firstSpore = null;
      { const g = mk(2), hm = std(0xe8dcb5, { roughness: 0.55 }), hg = ghost(0xe8dcb5, 0.5, { roughness: 0.3 }), nm = std(0x7a4fb0), ns = [];
        function branch(p, d, len, rad, depth) {
          const pts = [p.clone()]; let q = p.clone(), dir = d.clone();
          for (let i = 0; i < 5; i++) { dir.add(V3((R() - 0.5) * 0.5, (R() - 0.5) * 0.4, (R() - 0.5) * 0.5)).normalize(); q = q.clone().add(dir.clone().multiplyScalar(len / 5)); pts.push(q.clone()); }
          { const hm2 = new THREE.Mesh(tubeG(pts, rad, 30), hg); g.add(hm2); if (!rootTube) rootTube = hm2; }
          for (let i = 1; i < pts.length; i++) { const sp = new THREE.Mesh(new THREE.TorusGeometry(rad, rad * 0.18, 6, 14), hm); sp.position.copy(pts[i]); sp.lookAt(pts[i].clone().add(pts[i].clone().sub(pts[i - 1]))); g.add(sp); if (i % 2 === 1) { const n = sph(rad * 0.5, nm, pts[i].x, pts[i].y, pts[i].z); g.add(n); ns.push(n); } }
          if (depth > 0) { branch(pts[3], dir.clone().add(V3(0.7, 0.3, 0.4)).normalize(), len * 0.8, rad * 0.8, depth - 1); branch(pts[4], dir.clone().add(V3(-0.6, -0.2, -0.5)).normalize(), len * 0.75, rad * 0.8, depth - 1); }
          else { const sm = std(0xf0a34a, { roughness: 0.4 }); for (let k = 0; k < 4; k++) { const sp = sph(rad * 0.7, sm, pts[5].x + (k - 1.5) * rad * 0.9, pts[5].y + (k % 2) * rad, pts[5].z + (k % 3 - 1) * rad * 0.6); g.add(sp); if (!firstSpore) firstSpore = sp; } }
        }
        branch(V3(-3, -1.2, 0), V3(1, 0.4, 0.1).normalize(), 3.2, 0.27, 2);
        g.userData.spore = true;
        lab(2, '균사', rootTube, { offset: [-2.0, -0.1, 0.3] }); lab(2, '핵', ns[2], { offset: [0, 0.45, 0] }); lab(2, '포자', firstSpore, { offset: [0.3, 0.5, 0] });
        g.position.x = -0.3; g.userData.base = 1.25; g.position.y = -1.0;
      }
      /* 3 원생생물 : 적혈구 안의 말라리아 원충 */
      { const g = mk(3);
        function rbcGeo() { const pr = [], f = (p) => Math.sqrt(Math.max(0, 1 - p * p)) * (0.207 + 2.003 * p * p - 1.123 * p * p * p * p) * 0.52; for (let i = 0; i <= 40; i++) { const p = i / 40; pr.push(new THREE.Vector2(p * 1.0, f(p))); } for (let i = 40; i >= 0; i--) { const p = i / 40; pr.push(new THREE.Vector2(p * 1.0, -f(p))); } return new THREE.LatheGeometry(pr, 48); }
        const geo = rbcGeo();
        const big = new THREE.Mesh(geo, ghost(0xff6a5c, 0.5, { roughness: 0.3 })); big.scale.setScalar(2.3); big.rotation.x = 0.6; g.add(big);
        const pm = std(0x6a2fb0, { roughness: 0.35, emissive: 0x2a0a55, emissiveIntensity: 0.4 });
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.66, 0.2, 16, 40), pm); ring.rotation.x = Math.PI / 2 + 0.6; ring.position.set(0.25, 0, 0.1); g.add(ring);
        const chro = sph(0.2, std(0xffd34d, { emissive: 0x7a5a00, emissiveIntensity: 0.4 }), 0.2 + 0.62, 0.35, 0.1); g.add(chro);
        const nuc = sph(0.17, std(0xffd34d, { emissive: 0x7a5a00, emissiveIntensity: 0.5 }), 0.9, 0.42, 0.1); g.add(nuc); g.remove(chro);
                [[-3.5, -1.6, -1.2, 1.5, 0.4], [3.5, 1.4, -1.5, 1.3, -0.3], [-2.6, 2.4, -2.0, 1.1, 0.2], [3.1, -2.2, -0.4, 1.4, 0.8]].forEach((q) => { const r = new THREE.Mesh(geo, ghost(0xe5483f, 0.55, { roughness: 0.35 })); r.scale.setScalar(q[3] * 0.62); r.position.set(q[0], q[1], q[2]); r.rotation.set(q[4], q[4] * 2, q[4]); g.add(r); });
        lab(3, '적혈구', big, { offset: [-1.2, 1.5, 0.5] }); lab(3, '말라리아 원충 (핵 있음)', ring, { offset: [0.2, 0.8, 0.8] });
        g.userData.tilt = big; }
      /* 4 기생충 : 회충 */
      { const g = mk(4), N = 70;
        const wm = std(0xe8a08a, { roughness: 0.4 });
        const body = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 18, 12), wm, N); g.add(body);
        const egg = std(0xc9a56a, { roughness: 0.7 });
        [[-2.8, -1.8, 1.2], [-2.2, -2.1, 0.8], [-3.2, -2.1, 0.2]].forEach((q) => { const e = sph(0.3, egg, q[0], q[1], q[2], 1.35, 1, 1); e.rotation.z = q[0]; g.add(e); const sh = sph(0.14, std(0xe8d19a), q[0], q[1], q[2], 1.2, 1, 1); g.add(sh); });
        const mouth = sph(0.1, std(0x8a4a4a), 0, 0, 0); g.add(mouth);
        lab(4, '회충 (다세포 동물)', g, { offset: [0, 1.4, 0] }); lab(4, '알', [-2.8, -1.4, 0.8], {});
        g.userData.worm = { body, mouth, N };
        g.scale.setScalar(1.0); }

      const wk = (g, dt, t) => 0; let cur = -1, grow = 1;
      const KEYS = ['virus', 'bact', 'fungus', 'proto', 'worm'];
      function infoOf(i) {
        const L = window.__sim, P = L && L.PATH[KEYS[i]]; if (!P) return KINDS[i].info;
        return '<b>' + P.name + '</b> (' + P.ex + ')<br>세포 구조 <b>' + P.cell + '</b> · 핵(핵막) <b>' + P.nuc + '</b> · 몸 <b>' + P.body + '</b><br>크기 ' + P.size + ' · 관찰 ' + P.tool + '<br>' + P.note;
      }
      function show(i) {
        if (i === cur) return; cur = i; groups.forEach((g, k) => { g.visible = k === i; labs[k].forEach((l) => l.show(k === i)); });
        grow = 0; info(infoOf(i)); if (typeof seg !== 'undefined') seg.set(i);
      }
      const seg = controls.segment('', KINDS.map((k, i) => ({ label: k.k, value: i })), 0, (i) => { const L = window.__sim; if (L) L.pickSample(KEYS[i]); show(i); });
      show(0);

      /* ===== 증식: 세균의 이분법(배양 접시) · 바이러스의 증식(숙주 세포) — 2D '증식과 전염'과 같은 상태 ===== */
      const gG = new THREE.Group(), vG = new THREE.Group(); root.add(gG, vG); gG.visible = vG.visible = false;
      const gLabs = [], vLabs = [];
      const GL_ = (arr, t, o, op) => { const l = label(t, o, op || {}); l.show(false); arr.push(l); return l; };
      /* 세균 배양 접시 */
      const DR = 3.8;
      gG.add(new THREE.Mesh(new THREE.CylinderGeometry(DR + 0.15, DR + 0.15, 0.45, 64, 1, true), ghost(0xdbeafe, 0.3)));
      const agar = new THREE.Mesh(new THREE.CylinderGeometry(DR, DR, 0.2, 64), std(0xf5dd8d, { roughness: 0.55 })); agar.position.y = -0.1; gG.add(agar);
      const NBM = 130, bactI = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.15, 0.35, 4, 8).rotateZ(Math.PI / 2), std(0x16a34a, { roughness: 0.4, emissive: 0x064e1e, emissiveIntensity: 0.3 }), NBM); gG.add(bactI);
      const gL = [GL_(gLabs, '배양 접시 (현미경 시야)', [0, 0.7, DR + 0.4], { size: 12, color: 'rgba(38,50,74,.9)' }), GL_(gLabs, '', [0, 1.9, 0], { size: 14, color: 'rgba(22,101,52,.95)' })];
      const eo = (x) => 1 - Math.pow(1 - x, 3);
      const hostEls = []; let gSeg = null;
      let ignG = false, actG = -9, lastG = -9, tnow = 0;
      const gBtns = [];
      const gBtn1 = controls.button('▶ 1시간 배양', () => { const b = document.getElementById('bGrow'); if (b && !b.disabled) b.click(); }); const gBtn2 = controls.button('↺ 처음부터', () => { const b = document.getElementById('bGrowReset'); if (b) b.click(); });
      const pG = controls.player({ duration: 18, loop: false, label: '세균 증식', phases: [0, 1, 2, 3, 4, 5, 6].map((h) => [h / 7, h + '시간 · ' + Math.pow(2, 3 * h).toLocaleString('ko-KR') + '개']), onFrame() { if (!ignG) actG = tnow; } });
      /* 바이러스 증식 */
      const VW_ = 8.4, vBase = new THREE.Mesh(new THREE.BoxGeometry(VW_, 0.12, 6.4), std(0xe8e4f7, { roughness: 0.7 })); vBase.position.y = -0.1; vG.add(vBase);
      const hosts = [0, 1, 2, 3, 4].map(() => { const g = new THREE.Group(); const body = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 20), std(0xf9c9a8, { roughness: 0.4, transparent: true, opacity: 0.8 })); body.scale.set(1, 0.7, 1); g.add(body); const nuc = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 12), std(0x8b5cf6, { roughness: 0.4 })); nuc.position.set(-0.25, 0.25, -0.1); g.add(nuc); const bar = new THREE.Mesh(new THREE.BoxGeometry(1, 0.06, 0.12), std(0x8b5cf6)); bar.position.set(0, 0.0, 1.35); g.add(bar); vG.add(g); return { g, body, nuc, bar }; });
      const virI = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), std(0x7c3aed, { roughness: 0.35, flatShading: true, emissive: 0x2e1065, emissiveIntensity: 0.4 }), 80); vG.add(virI);
      const vL = [GL_(vLabs, '숙주 세포', [0, 0, 0], { size: 12, color: 'rgba(124,45,18,.9)' }), GL_(vLabs, '바이러스', [0, 0, 0], { size: 12, color: 'rgba(91,33,182,.92)' })];
      const vBtn1 = controls.button('▶ 시간 흐르기', () => { const b = document.getElementById('bVir'); if (b && !b.disabled) b.click(); }); const vBtn2 = controls.button('↺ 처음으로', () => { const b = document.getElementById('bVirReset'); if (b) b.click(); });
      const pV = controls.player({ duration: 12, loop: false, label: '바이러스 증식', phases: [[0, '바이러스가 숙주 세포에 붙어요'], [0.08, '세포 안으로 침입'], [0.3, '세포 속에서 증식'], [0.4, '세포가 터져요 · 새 바이러스'], [0.6, '또 다른 세포를 감염']], onFrame() { if (!ignG) actG = tnow; } });
      const hostC = ctx.controls.text('').parentNode, kidsC = Array.from(hostC.children);
      const gEls = [gBtn1, gBtn2, pG.row || null].filter(Boolean), vEls = [vBtn1, vBtn2];
      const rowsP = Array.from(hostC.querySelectorAll('.v3-player')); const rowG = rowsP[rowsP.length - 2], rowV = rowsP[rowsP.length - 1];
      const showE = (a, v) => a.forEach((e) => { if (e) e.style.display = v ? '' : 'none'; });
      let gm = 'obs', gSig = '', vSig = '', hmaxLast = -1, noteKey = '';
      function setGM(m) {
        gm = m; gG.visible = m === 'bact'; vG.visible = m === 'virus';
        const obs = m === 'obs'; groups.forEach((g) => { g.visible = false; }); labs.forEach((a) => a.forEach((l) => l.show(false))); if (obs) { cur = -1; show(Math.max(0, KEYS.indexOf((window.__sim && window.__sim.S.O && window.__sim.S.O.cur) || 'virus'))); }
        gLabs.forEach((l) => l.show(false)); vLabs.forEach((l) => l.show(false));
        showE([gBtn1, gBtn2], m === 'bact'); rowG.style.display = m === 'bact' ? '' : 'none'; showE(vEls, m === 'virus'); rowV.style.display = m === 'virus' ? '' : 'none'; if (seg && seg.el) 0;
        const segEls = Array.from(hostC.children).filter((e) => e.tagName === 'BUTTON' && /^(바이러스|세균|곰팡이|원생생물|기생충)$/.test(e.textContent)); segEls.forEach((e) => { e.style.display = obs ? '' : 'none'; });
        gSig = ''; vSig = '';
        if (m === 'obs') { info(infoOf(cur < 0 ? 0 : cur)); }
      }
      function bactFrame(L, t) {
        const G = L.S.G; if (!G) return;
        const Nn = Math.pow(2, Math.floor(3 * G.h + 1e-9)), k = DR / L.GL.dR, showN = Math.min(Nn, NBM);
        for (let i = 0; i < NBM; i++) {
          if (i >= showN) { D.position.set(0, -9, 0); D.scale.setScalar(0.0001); D.rotation.set(0, 0, 0); D.updateMatrix(); bactI.setMatrixAt(i, D.matrix); continue; }
          const q = G.pos[i]; let x = q.x, y = q.y, sq = 0;
          if (Nn <= 128 && i >= G.nPrev && G.split < 1) { const par = G.pos[i - G.nPrev] || G.pos[0], f = eo(G.split); x = par.x + (q.x - par.x) * f; y = par.y + (q.y - par.y) * f; sq = Math.sin(G.split * Math.PI * 0.6); }
          else if (Nn <= 128 && i < G.nPrev && G.split < 1) sq = Math.sin(G.split * Math.PI);
          D.position.set(x * k, 0.2, y * k); D.rotation.set(0, -q.rot, 0); D.scale.set(1 - 0.35 * sq, 1 + 0.15 * sq, 1 - 0.1 * sq); D.updateMatrix(); bactI.setMatrixAt(i, D.matrix);
        }
        bactI.instanceMatrix.needsUpdate = true;
        const hmax = G.pts.length ? G.pts[G.pts.length - 1].h : 0, hh = G.run ? G.h : hmax, nn = Math.floor(3 * hh + 1e-9);
        gL[1].set('<b>' + (Math.round(hh * 10) / 10) + '시간</b> · n = ' + nn + '회 · N = 2<sup>' + nn + '</sup> = <b>' + Nn.toLocaleString('ko-KR') + '개</b>'); gL[1].obj = [0, 2.2, 0]; gL.forEach((l) => l.show(true));
        const key = nn + '|' + (Nn > 130 ? 1 : 0) + '|' + G.run;
        if (key !== gSig) { gSig = key; info('<b>세균의 증식 (이분법)</b><br>세균은 한 마리가 둘로 나뉘는 이분법으로 늘어나요. <b>20분마다 2배</b> → 1시간 = 20분 × 3회 → 8배.<br>분열 횟수 n = 3 × 시간, 세균 수 N = 2<sup>n</sup> (개)' + (Nn > 130 ? '<br><span style="color:#fcd34d">접시 안에 다 그리지 못해 일부만 보여요.</span>' : '')); }
        const driving = tnow - actG < 1.2;
        if (driving && pG.playing) { const want = Math.min(6, Math.floor(pG.p * 7)); if (!G.run && G.pts.length - 1 < want && tnow - lastG > 1.0) { lastG = tnow; const b = document.getElementById('bGrow'); if (b && !b.disabled) b.click(); } else if (!G.run && want === 0 && G.pts.length > 1 && tnow - lastG > 1.0) { lastG = tnow; const b = document.getElementById('bGrowReset'); if (b) b.click(); } }
        else if (!driving && !pG.playing) { const want = Math.min(1, (hh + 0.5 / 3) / 7); if (Math.abs(pG.p - want) > 0.03) { ignG = true; pG.set(Math.min(0.999, hh / 7 + 0.02)); ignG = false; } }
      }
      function virusFrame(L, t) {
        const V = L.S.V; if (!V) return;
        const R = L.VL.R, kk = VW_ / R.w, cx = R.x + R.w / 2, cy = R.y + R.h / 2, PROD = 3.6, YIELD = 6;
        const P = (x, y) => [(x - cx) * kk, (y - cy) * kk];
        let nv = 0;
        hosts.forEach((h, i) => {
          const c = V.cells[i]; h.g.visible = !!c; if (!c) return; const [x, z] = P(c.x, c.y), r = V.cr * kk;
          h.g.position.set(x, r * 0.6, z); h.g.scale.setScalar(r);
          h.body.material.color.setHex(c.st === 'i' ? 0xfbb6c4 : 0xf9c9a8); h.body.material.opacity = c.st === 'd' ? 0.25 : 0.82; h.body.material.emissive.setHex(c.flash > 0 ? 0xa78bfa : 0x000000); h.body.material.emissiveIntensity = c.flash;
          h.nuc.visible = c.st !== 'd'; const p = c.st === 'i' ? Math.max(0, Math.min(1, (V.t - c.t0) / PROD)) : 0; h.bar.visible = c.st === 'i'; h.bar.scale.x = Math.max(0.01, 1.4 * p); h.bar.position.x = -0.7 + 0.7 * p;
          if (c.st === 'i') { const n = 1 + Math.floor((YIELD - 1) * p); for (let q = 0; q < YIELD; q++) { const a = q / YIELD * Math.PI * 2 + 0.6; D.position.set(x + (0.12 + Math.cos(a) * 0.5) * r, r * 0.65, z + (0.1 + Math.sin(a) * 0.5) * r); D.scale.setScalar(q < n ? r * 0.2 : 0.0001); D.rotation.set(a, a * 2, 0); D.updateMatrix(); virI.setMatrixAt(nv++, D.matrix); } }
        });
        V.free.forEach((v) => { if (nv >= 80) return; const [x, z] = P(v.x, v.y); D.position.set(x, 0.35 + Math.sin(t * 3 + x) * 0.04, z); D.scale.setScalar(0.16 * Math.max(0.2, v.a)); D.rotation.set(t * 0.7, t * 0.9, 0); D.updateMatrix(); virI.setMatrixAt(nv++, D.matrix); });
        for (let i = nv; i < 80; i++) { D.position.set(0, -9, 0); D.scale.setScalar(0.0001); D.updateMatrix(); virI.setMatrixAt(i, D.matrix); } virI.instanceMatrix.needsUpdate = true;
        const tot = V.free.length + V.cells.reduce((s2, c) => s2 + (c.st === 'i' ? 1 + Math.floor((YIELD - 1) * Math.max(0, Math.min(1, (V.t - c.t0) / PROD))) : 0), 0);
        const c0 = V.cells[0]; const [hx, hz] = P(c0.x, c0.y); vL[0].obj = [hx, 1.6, hz]; vL[1].obj = [P(V.free[0] ? V.free[0].x : cx, V.free[0] ? V.free[0].y : cy)[0], 0.8, P(0, V.free[0] ? V.free[0].y : cy)[1]]; vL.forEach((l) => l.show(true)); vL[1].show(V.free.length > 0);
        const key = V.cells.map((c) => c.st).join('') + '|' + Math.floor(V.t / 1.2) + '|' + V.run;
        if (key !== vSig) { vSig = key; info('<b>바이러스의 증식</b> · 지금 바이러스 <b>' + tot + '개</b> (감염된 세포 ' + V.cells.filter((c) => c.st === 'i').length + ' · 터진 세포 ' + V.cells.filter((c) => c.st === 'd').length + ')<br>' + (V.cells.some((c) => c.st === 'i') ? '바이러스는 <b>숙주 세포 안에서만</b> 증식해요. 새 바이러스가 충분히 만들어지면 세포가 터지고 밖으로 퍼져요.' : '바이러스는 스스로 증식하지 못해요. 숙주 세포에 침입해야 해요. ▶ 시간 흐르기를 눌러 보세요.')); }
        const driving = tnow - actG < 1.2;
        if (driving && pV.playing) { if (!V.run && !V.done && pV.p > 0.02 && tnow - lastG > 1.0) { lastG = tnow; const b = document.getElementById('bVir'); if (b) b.click(); } else if (V.done && pV.p < 0.04 && tnow - lastG > 1.0) { lastG = tnow; const b = document.getElementById('bVir'); if (b) b.click(); } }
        else if (!driving && !pV.playing) { const want = Math.min(1, V.t / 12); if (Math.abs(pV.p - want) > 0.03) { ignG = true; pV.set(want); ignG = false; } }
      }

      /* 비교표 칸 고르기: 2D 표의 칸을 누르는 것과 같아요 (위에서 고른 병원체의 줄을 채워요) */
      const tTxt = controls.text('');
      const tBtns = [0, 1, 2].map((c) => controls.button('', () => {
        const L = window.__sim, T = L && L.S.O && L.S.O.table; if (!T) return;
        const r = cur < 0 ? 0 : cur, n = T.o.cols[c].opts.length;
        T.val[r][c] = T.val[r][c] + 1 >= n ? 0 : T.val[r][c] + 1; T.bad[r][c] = false; if (T.o.onChange) T.o.onChange();
      }));
      const tabEl = mxBox('tr');   // 비교표 전체: 고른 칸이 바로 채워져요
      const tableUI = (S2) => {
        const on = !!(S2 && gm === 'obs' && S2.mode === 'obs' && S2.sub.obs === 'table' && S2.O && S2.O.table);
        showE([tTxt].concat(tBtns), on); if (!on) { tabEl.put(''); return; }
        const T = S2.O.table, r = cur < 0 ? 0 : cur;
        tabEl.put('<div class="h">📋 병원체 비교표 (' + T.filled + ' / ' + T.total + ')</div><table><tr><th></th>' + T.o.cols.map((c) => '<th>' + c.label.replace('\n', ' ') + '</th>').join('') + '</tr>' +
          T.o.rows.map((nm, i) => '<tr' + (i === r ? ' class="sel"' : '') + '><td>' + nm + '</td>' + T.o.cols.map((c, j) => { const v = T.val[i][j]; return '<td class="' + (T.bad[i][j] ? 'no' : v >= 0 ? 'on' : 'dim') + '">' + (v >= 0 ? c.opts[v] : '?') + (T.bad[i][j] ? ' ✕' : '') + '</td>'; }).join('') + '</tr>').join('') + '</table>');
        const tt = '<b>비교표 · ' + T.o.rows[r] + '</b> (' + T.filled + ' / ' + T.total + '칸)'; if (tTxt.innerHTML !== tt) tTxt.innerHTML = tt;
        tBtns.forEach((b, c) => { const v = T.val[r][c], txt = T.o.cols[c].label.replace('\n', ' ') + ': ' + (v >= 0 ? T.o.cols[c].opts[v] : '?') + (T.bad[r][c] ? ' ✕' : ''); if (b.textContent !== txt) b.textContent = txt; b.classList.toggle('on', v >= 0); });
      };
      setGM('obs');
      return {
        update(dt, t) {
          tnow += dt;
          { const L = window.__sim, S2 = L && L.S, want = S2 && S2.mode === 'grow' && S2.sub.grow === 'bact' ? 'bact' : S2 && S2.mode === 'grow' && S2.sub.grow === 'virus' ? 'virus' : 'obs';
            if (want !== gm) setGM(want);
            if (gm === 'obs' && S2) { const nk = S2.mode + '|' + (S2.sub && S2.sub[S2.mode]); if (nk !== noteKey) { noteKey = nk; info(infoOf(cur < 0 ? 0 : cur)); } }
            tableUI(S2);
            if (gm === 'bact') { bactFrame(L, t); return; }
            if (gm === 'virus') { virusFrame(L, t); return; } }
          { const L = window.__sim; if (L && L.S.O) { const k = KEYS.indexOf(L.S.O.cur); if (k >= 0 && k !== cur) show(k); } }
          grow = Math.min(1, grow + dt * 2.5); const e = 1 - Math.pow(1 - grow, 3);
          groups.forEach((g) => g.scale.setScalar((g.userData.base || 1) * (0.75 + 0.25 * e)));
          const g1 = groups[1]; if (g1.userData.swim) { g1.userData.swim.position.y = Math.sin(t * 1.2) * 0.12; g1.userData.swim.rotation.z = Math.sin(t * 0.9) * 0.06; }
          const g4 = groups[4].userData.worm, N = g4.N;
          for (let i = 0; i < N; i++) {
            const s = i / (N - 1), x = (s - 0.5) * 8.0, amp = 0.6 * (0.35 + 0.65 * s), ph = s * 7 - t * 3.0;
            const y = Math.sin(ph) * amp, z = Math.cos(ph * 0.8) * 0.15;
            const rad = 0.42 * Math.min(1, 0.35 + Math.sin(Math.min(1, s * 1.1) * Math.PI) * 0.9) * (s > 0.92 ? 0.7 : 1);
            D.position.set(x, y, z); D.scale.set(0.13 + rad * 0.2, rad, rad); D.rotation.set(0, 0, 0); D.updateMatrix(); g4.body.setMatrixAt(i, D.matrix);
          }
          g4.body.instanceMatrix.needsUpdate = true; g4.mouth.position.set(-4.05, Math.sin(-t * 3.0) * 0.5 * 0.35, 0);
        },
        sync() {},
      };
    },
  });
})();
