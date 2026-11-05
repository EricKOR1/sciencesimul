/* h1-protein · 3D 아미노산 사슬의 접힘(열쇠–자물쇠) / 낫 모양 적혈구
   2D 실험의 단계와 같은 장면을 보여 줘요 (구슬 색·이름·서열·열쇠도 2D와 같아요).
   · 모양과 기능(3단계): 서열 → 접힘 → 열쇠(산소·병원체)가 맞는지. 2D 옆의 단백질 버튼과 구슬 바꾸기가 3D에도 그대로 나타나요.
   · 낫 모양 적혈구(4단계): 2D 옆의 정상/변이 버튼에 따라 적혈구가 좁은 혈관을 지나는 모습을 3D로 봐요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHN = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const AAD = [['글리신', 'G'], ['알라닌', 'A'], ['발린', 'V'], ['류신', 'L'], ['아이소류신', 'I'], ['프롤린', 'P'], ['페닐알라닌', 'F'], ['트립토판', 'W'], ['메싸이오닌', 'M'], ['세린', 'S'],
    ['트레오닌', 'T'], ['시스테인', 'C'], ['타이로신', 'Y'], ['아스파라진', 'N'], ['글루타민', 'Q'], ['아스파트산', 'D'], ['글루탐산', 'E'], ['라이신', 'K'], ['아르지닌', 'R'], ['히스티딘', 'H']];
  const HB = [2, 19, 3, 10, 5, 16, 16, 17];            // 헤모글로빈 β사슬 앞부분 V H L T P E E K (2D와 같은 번호)
  const PROT = [{ name: '산소 운반 단백질', key: 'o2', keyName: '산소(O₂)', col: 0xef4444 }, { name: '항체', key: 'pathogen', keyName: '병원체', col: 0x16a34a }];
  const Pv = (t) => ((7 * t) % 20 - 9.5) * 2.4;

  window.SciSim3D.attach({
    title: '단백질 모양과 기능 3D',
    camera: { dist: PHN ? 12.5 : 9.2, theta: 0.5, phi: 1.2, min: 4, max: 26 },
    levels: [3],
    autoRotate: 0,
    build(ctx) {
      const { THREE, root, label, info, controls, orbit, camera, renderer } = ctx;
      const std = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.35, metalness: 0.05 }, o || {}));
      const lesson = () => window.__sim || null;
      const sm = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
      const hslc = (i) => { const h = ((i * 7) % 20) * 18, l = [47, 58, 69][i % 3]; return new THREE.Color().setHSL(h / 360, 0.7, l / 100); };
      const AAC = AAD.map((_, i) => hslc(i));
      const sceneOf = (lv) => (lv === 3 ? 'sick' : 'fold');
      let scene = sceneOf(ctx.level);
      const gF = new THREE.Group(), gS = new THREE.Group(); root.add(gF, gS);
      const ctlEl = document.querySelector('.v3-ctl'); const foldCtl = [];

      /* ============ 접힘과 기능 ============ */
      const MAXB = 12, beads = [], links = [], bl = [];
      for (let i = 0; i < MAXB; i++) {
        const m = new THREE.Mesh(new THREE.SphereGeometry(0.34, 28, 20), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.25, metalness: 0.05, clearcoat: 0.8, clearcoatRoughness: 0.15 })); m.userData.i = i; gF.add(m); beads.push(m);
        { const sh = new THREE.Mesh(new THREE.SphereGeometry(0.52, 20, 14), new THREE.MeshBasicMaterial({ color: 0xbfd7ff, transparent: true, opacity: 0.1, depthWrite: false })); m.add(sh); }
        bl.push(label('', m, { offset: [0, 0.62, 0], size: 12 }));
        if (i) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1, 10), std(0xcbd5e1, { roughness: 0.25, metalness: 0.6 })); gF.add(c); links.push(c); }
      }
      const selRing = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.04, 8, 32), new THREE.MeshBasicMaterial({ color: 0x3b82f6 })); gF.add(selRing);
      const keyG = new THREE.Group(); gF.add(keyG);
      const o2M = new THREE.Group(); [-0.16, 0.16].forEach((x) => { const s = new THREE.Mesh(new THREE.SphereGeometry(0.2, 20, 14), std(0xef4444, { emissive: 0x7a1010, emissiveIntensity: 0.5 })); s.position.x = x; o2M.add(s); });
      const pathM = new THREE.Group(); pathM.add(new THREE.Mesh(new THREE.SphereGeometry(0.3, 24, 16), std(0x16a34a)));
      for (let k = 0; k < 10; k++) { const d = new THREE.Vector3(Math.sin(k * 2.4) , Math.cos(k * 1.7), Math.sin(k * 0.9 + 1)).normalize(); const sp = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.22, 8), std(0x16a34a)); sp.position.copy(d).multiplyScalar(0.38); sp.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d); pathM.add(sp); }
      keyG.add(o2M, pathM);
      const keyLab = label('', keyG, { offset: [0, 0.65, 0], size: 12 });
      const cupAnchor = new THREE.Object3D(); gF.add(cupAnchor);
      const cupLab = label('홈', cupAnchor, { offset: [0, 0.2, 0], size: 12, color: 'rgba(40,60,100,.9)' });
      let demoP = 0, lastKey = '', foldFrame = null;
      const strPos = (i, n) => new THREE.Vector3((i - (n - 1) / 2) * 0.9, 0.3 * (i % 2 ? 1 : -1) * 0.5, 0);
      function seqNow() {
        const L = lesson(); if (!L || !L.S) return { seq: PROT[0] && [2, 19, 3, 10, 5, 16, 16], prot: 0, ph: 'done', t: 9, fit: true, sel: -1, key: null, mirror: false };
        if (ctx.level === 2 && L.S.fold && L.S.fold.seq.length) { const F = L.S.fold; return { seq: F.seq, prot: F.prot, ph: F.ph, t: F.t, fit: F.fit, sel: F.sel, key: F.key, mirror: true }; }
        if (ctx.level === 1 && L.CH && L.CH.beads.length >= 2) return { seq: L.CH.beads.map((b) => b.t).slice(0, MAXB), prot: -1, ph: 'done', t: 9, fit: true, sel: -1, key: null, mirror: false };
        return { seq: L.PROT ? L.PROT[0].seq : [2, 19, 3, 10, 5, 16, 16], prot: 0, ph: 'done', t: 9, fit: true, sel: -1, key: null, mirror: false };
      }
      function paintFold(st, foldAmt, keyMode) {   // keyMode: {x,y,s,show}
        const n = Math.min(MAXB, st.seq.length), g = (lesson() && lesson().foldGeo) ? lesson().foldGeo() : { cx: 330, cy: 268, R0: 104 };
        const f = foldAmt * foldAmt * (3 - 2 * foldAmt);
        for (let i = 0; i < MAXB; i++) {
          const on = i < n; beads[i].visible = on; bl[i].show(on && n <= 8);
          if (i) links[i - 1].visible = on;
          if (!on) continue;
          const t = st.seq[i], phi = Math.PI - (n > 1 ? i * Math.PI / (n - 1) : 0), r = g.R0 - Pv(t);
          const bowl = new THREE.Vector3(r * Math.cos(phi) / 40, -r * Math.sin(phi) / 40 + 1.3, 0.22 * Math.sin(i * 2.1));
          beads[i].position.copy(strPos(i, n)).lerp(bowl, f);
          beads[i].material.color.copy(AAC[t]); beads[i].material.emissive.copy(AAC[t]).multiplyScalar(0.15);
          { const tx = AAD[t][0] + ' (' + AAD[t][1] + ')'; if (bl[i].tx !== tx) { bl[i].tx = tx; bl[i].set(tx); } }
          if (i) { const a = beads[i - 1].position, b = beads[i].position, d = b.clone().sub(a); links[i - 1].position.copy(a).add(b).multiplyScalar(0.5); links[i - 1].scale.set(1, Math.max(0.01, d.length()), 1); links[i - 1].quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); }
        }
        selRing.visible = st.sel >= 0 && st.sel < n && st.mirror; if (selRing.visible) { selRing.position.copy(beads[st.sel].position); selRing.quaternion.copy(camera.quaternion); }
        const showKey = st.prot >= 0 && ctx.level === 2 && keyMode && keyMode.show;
        keyG.visible = showKey; keyLab.show(showKey); cupLab.show(showKey && f > 0.9);
        if (showKey) {
          keyG.position.set(keyMode.x, keyMode.y, 0); keyG.scale.setScalar(keyMode.s); o2M.visible = st.prot === 0; pathM.visible = st.prot === 1;
          if (keyLab.tx !== PROT[st.prot].keyName) { keyLab.tx = PROT[st.prot].keyName; keyLab.set(keyLab.tx); } { let cx = 0, cy = 0; for (let i = 0; i < n; i++) { cx += beads[i].position.x; cy += beads[i].position.y; } cupAnchor.position.set(cx / n, cy / n - 0.4, 0); }
        }
        const key = st.seq.join(',') + '|' + st.prot + '|' + st.ph + '|' + (f > 0.5) + '|' + ctx.level;
        if (key !== lastKey) {
          lastKey = key;
          let h;
          if (ctx.level === 2 && st.prot >= 0) {
            const miss = (lesson() && lesson().S) ? st.seq.filter((t, i) => t !== (lesson().PROT ? lesson().PROT[st.prot].seq[i] : t)).length : 0;
            h = '<b>' + PROT[st.prot].name + '</b> · 아미노산 ' + n + '개가 접혀 <b>홈</b>이 생겨요.<br>' + (f < 0.5 ? '사슬이 접히는 중…' : miss === 0 ? '홈에 <b>' + PROT[st.prot].keyName + '</b>가 꼭 맞아요 (기능을 해요).' : '구슬 ' + miss + '개가 달라 모양이 변했어요. <b>' + PROT[st.prot].keyName + '</b>가 맞물리지 못해요.');
          } else h = '<b>아미노산 사슬</b>이 접혀 입체 구조가 돼요. 구슬 하나가 아미노산 한 개예요.<br>' + (ctx.level === 1 ? '이은 구슬 ' + n + '개' : '아미노산의 배열이 접히는 모양을 정해요.');
          info(h);
        }
      }
      function mirrorFold(t) {
        const st = seqNow(), L = lesson();
        let foldAmt = 1, km = null;
        if (st.mirror) {
          foldAmt = st.ph === 'fold' ? Math.min(1, st.t / 2.0) : 1;
          const g = L.foldGeo(); const k = st.key;
          if (k) km = { x: (k.x - g.cx) / 40, y: -(k.y - g.cy) / 40 + 1.3, s: k.s * 1.0, show: true };
        } else km = { x: 3.4, y: 1.8, s: 0.7, show: ctx.level === 2 };
        paintFold(st, foldAmt, km);
      }
      function demoFold(p) {
        const st = seqNow(), n = st.seq.length, L = lesson();
        const miss = L && L.PROT && st.prot >= 0 ? st.seq.some((t, i) => t !== L.PROT[st.prot].seq[i]) : false;
        const foldAmt = sm(0, 0.4, p), tryT = sm(0.4, 0.7, p), back = sm(0.78, 0.95, p);
        let x = 3.4, y = 1.8, s = 0.7;
        if (!miss) { x = 3.4 * (1 - tryT); y = 1.8 * (1 - tryT) + (-0.0) * tryT + 0.0; s = 0.7 + 0.3 * tryT; y = 1.8 + (0.15 - 1.8) * tryT; x = 3.4 + (0 - 3.4) * tryT; }
        else { x = 3.4 * (1 - tryT); y = 1.8 + (2.7 - 1.8) * tryT; s = 0.7 + 0.25 * tryT; x += Math.sin(p * 60) * 0.06 * sm(0.7, 0.75, p) * (1 - back); x = x * (1 - back) + 3.4 * back; y = y * (1 - back) + 1.8 * back; }
        st.ph = p < 0.4 ? 'fold' : 'try'; st.sel = -1; st.mirror = false;
        paintFold(st, foldAmt, { x, y, s, show: ctx.level === 2 });
      }

      /* 구슬 눌러 고르기 · 아래 구슬로 바꾸기 (2D와 같은 동작) */
      let repT = 3;
      const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(); let down = null;
      renderer.domElement.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY }; });
      renderer.domElement.addEventListener('pointerup', (e) => {
        if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) { down = null; return; } down = null;
        const L = lesson(); if (scene !== 'fold' || ctx.level !== 2 || !L || !L.S) return;
        const r = renderer.domElement.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
        ray.setFromCamera(ndc, camera);
        const hit = ray.intersectObjects(beads.filter((m) => m.visible), false)[0];
        if (hit) { L.S.fold.sel = L.S.fold.sel === hit.object.userData.i ? -1 : hit.object.userData.i; }
      });
      const n0 = ctlEl ? ctlEl.children.length : 0;
      const rep = controls.range('바꿀 구슬', 0, 19, 1, repT, (v) => { repT = v; }, (v) => AAD[v][0] + '(' + AAD[v][1] + ')');
      const repB = controls.button('선택한 구슬을 바꾸기', () => { const L = lesson(); if (L && L.S && L.S.fold.sel >= 0 && L.foldReplace) L.foldReplace(L.S.fold.sel, repT); });
      const nRep = ctlEl ? ctlEl.children.length : 0;
      const plF = controls.player({
        duration: 6, loop: true, autoplay: false, label: '접어 보기',
        phases: [[0, '사슬이 접혀요'], [0.4, '열쇠가 다가와요'], [0.7, '맞는지 확인'], [0.78, '처음으로']],
        onFrame(p) { demoP = p; if (p > 0) demoFold(p); },
      });
      const repCtl = []; if (ctlEl) for (let i = n0; i < nRep; i++) repCtl.push(ctlEl.children[i]);
      if (ctlEl) for (let i = n0; i < ctlEl.children.length; i++) foldCtl.push(ctlEl.children[i]);


      // ---- 환경: 세포 속 바닥판 · 떠다니는 알갱이 (접힘 장면)
      { const fl = new THREE.Mesh(new THREE.CylinderGeometry(4.6, 4.8, 0.22, 72), std(0x13213b, { roughness: 0.7, metalness: 0.1 })); fl.position.set(0, -3.3, 0); gF.add(fl);
        [4.5, 3.1, 1.7].forEach((r, k) => { const t = new THREE.Mesh(new THREE.TorusGeometry(r, 0.025, 8, 96), new THREE.MeshBasicMaterial({ color: k % 2 ? 0x3b6ea8 : 0x4fd1c5 })); t.rotation.x = Math.PI / 2; t.position.set(0, -3.17, 0); gF.add(t); }); }
      const NPD = 120, dustF = new THREE.InstancedMesh(new THREE.SphereGeometry(0.05, 8, 6), new THREE.MeshBasicMaterial({ color: 0x9fd8ff, transparent: true, opacity: 0.5 }), NPD); gF.add(dustF);
      const ddF = []; for (let i = 0; i < NPD; i++) ddF.push({ x: (Math.random() - 0.5) * 12, y: -2 + Math.random() * 6.5, z: (Math.random() - 0.5) * 6, s: 0.4 + Math.random() * 1.2, p: Math.random() * 6.28 });
      const dmF = new THREE.Object3D();

      /* ============ 낫 모양 적혈구 ============ */
      const SX = 14 / (PHN ? 520 : 800);
      const vesselProf = () => { const L = lesson(), G = L && L.S ? (L.vesselGeo ? L.vesselGeo() : null) : null; return G; };
      const VWv = PHN ? 520 : 800;
      const G0 = PHN ? { y: 430, h0: 50, nx: VWv * 0.54, tissue: { x: VWv - 84, w: 74 } } : { y: 346, h0: 48, nx: VWv * 0.56, tissue: { x: VWv - 88, w: 76 } };
      const vh = (x) => G0.h0 - (G0.h0 - 17) * Math.exp(-Math.pow((x - G0.nx) / 64, 2));
      const X3 = (x) => (x - VWv / 2) * SX;
      const vpts = []; for (let k = 0; k <= 80; k++) { const x = -40 + (VWv + 80) * k / 80; vpts.push(new THREE.Vector2(Math.max(0.05, vh(x) * SX * 1.0), X3(x))); }
      const vessel = new THREE.Mesh(new THREE.LatheGeometry(vpts, 40), new THREE.MeshStandardMaterial({ color: 0xff8a80, transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false, roughness: 0.3 }));
      vessel.rotation.z = -Math.PI / 2; gS.add(vessel);
      const tissue = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.3, 2.3), std(0xc98672, { roughness: 0.85, emissive: 0x1f7a58, emissiveIntensity: 0.3 })); tissue.position.x = X3(G0.tissue.x + G0.tissue.w / 2); gS.add(tissue);
      const tLab = label('조직', tissue, { offset: [0, 1.5, 0], size: 12 });
      function disc() {
        const pts = []; const z = (r) => 0.58 * Math.sqrt(Math.max(0, 1 - r * r)) * (0.0518 + 2.0026 * r * r - 4.491 * r * r * r * r) * 3.2;
        for (let k = 0; k <= 24; k++) { const r = k / 24; pts.push(new THREE.Vector2(r, -Math.max(0, z(r)))); }
        for (let k = 24; k >= 0; k--) { const r = k / 24; pts.push(new THREE.Vector2(r, Math.max(0, z(r)))); }
        const g = new THREE.LatheGeometry(pts.map((p) => new THREE.Vector2(Math.max(0.001, p.x), p.y)), 40); g.computeVertexNormals(); return g;
      }
      function sickle() {
        const g = new THREE.SphereGeometry(1, 40, 24), pos = g.attributes.position;
        for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), th = 0.42 * (1 - 0.15 * x * x); pos.setXYZ(i, x * 1.75, y * th * 0.9 - 0.55 * x * x + 0.2, z * th * 1.1); }
        g.computeVertexNormals(); return g;
      }
      const dGeo = disc(), sGeo = sickle(), cMat = std(0xe53935, { roughness: 0.4 }), cMatS = std(0xb71c1c, { roughness: 0.45 });
      const cells = []; for (let i = 0; i < 10; i++) { const m = new THREE.Mesh(dGeo, cMat); m.visible = false; gS.add(m); cells.push(m); }

      // ---- 혈관 주변 환경: 조직 배경판 · 혈관 안쪽 벽 고리 · 혈장 알갱이 · (적혈구가 없을 때) 흐르는 모형 적혈구
      { const cv = document.createElement('canvas'); cv.width = 256; cv.height = 128; const g = cv.getContext('2d'); const gr = g.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, '#6b2f3c'); gr.addColorStop(1, '#3a1824'); g.fillStyle = gr; g.fillRect(0, 0, 256, 128);
        for (let i = 0; i < 160; i++) { g.strokeStyle = 'rgba(255,170,160,' + (0.05 + Math.random() * 0.12) + ')'; g.lineWidth = 1 + Math.random() * 2; g.beginPath(); g.arc(Math.random() * 256, Math.random() * 128, 4 + Math.random() * 10, 0, 6.283); g.stroke(); }
        const tx = new THREE.CanvasTexture(cv); const bg = new THREE.Mesh(new THREE.PlaneGeometry(17, 7), new THREE.MeshStandardMaterial({ map: tx, roughness: 0.9, color: 0x9a8a8a })); bg.position.set(0, 0, -2.2); gS.add(bg);
        const fl2 = new THREE.Mesh(new THREE.BoxGeometry(17, 0.2, 4.4), std(0x120a10, { roughness: 0.9 })); fl2.position.set(0, -2.6, -0.1); gS.add(fl2); }
      for (let k = 0; k < 16; k++) { const x = -6.6 + k * 0.88, r = vh(VWv / 2 + x / SX) * SX; const rg = new THREE.Mesh(new THREE.TorusGeometry(r + 0.01, 0.018, 8, 40), new THREE.MeshBasicMaterial({ color: 0xffa8a0, transparent: true, opacity: 0.35 })); rg.rotation.y = Math.PI / 2; rg.position.x = x; gS.add(rg); }
      const NPS = 90, dustS = new THREE.InstancedMesh(new THREE.SphereGeometry(0.04, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffd9c9, transparent: true, opacity: 0.55 }), NPS); gS.add(dustS);
      const ddS = []; for (let i = 0; i < NPS; i++) ddS.push({ x: Math.random() * 14 - 7, y: (Math.random() - 0.5) * 0.7, z: (Math.random() - 0.5) * 0.7, s: 0.3 + Math.random() * 0.8 });
      const dmS = new THREE.Object3D();
      const ghosts = []; for (let i = 0; i < 6; i++) { const m = new THREE.Mesh(dGeo, new THREE.MeshStandardMaterial({ color: 0xe53935, roughness: 0.4, transparent: true, opacity: 0.55 })); m.scale.setScalar(0.4); gS.add(m); ghosts.push(m); }
      // 헤모글로빈 사슬 앞부분 (6번째 아미노산이 달라져요)
      const hb = HB.map((t, i) => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.22, 20, 14), std(AAC[t])); m.position.set(-3.5 + i * 0.6, 2.6, 0); gS.add(m); return m; });
      const hbLab = label('', hb[5], { offset: [0, -0.5, 0], size: 12 });
      const sickLab = label('', [0, 1.6, 0], { size: 12, color: 'rgba(8,12,24,.85)' });
      let lastMut = -1, lastStuck = -1;
      function paintSick(t) {
        for (let i = 0; i < NPS; i++) { const d = ddS[i]; dmS.position.set(((d.x + 7 + t * d.s * 1.1) % 14) - 7, d.y * (Math.abs(((d.x + 7 + t * d.s * 1.1) % 14) - 7 - (X3(G0.nx))) < 1.2 ? 0.3 : 1), d.z); dmS.updateMatrix(); dustS.setMatrixAt(i, dmS.matrix); } dustS.instanceMatrix.needsUpdate = true;
        const L = lesson(), K = L && L.S ? L.S.sick : null;
        { const any = !!(K && K.cells && K.cells.some((c) => c)); ghosts.forEach((m, i) => { m.visible = !any; if (any) return; const x = ((i * 2.4 + t * 1.2) % 14) - 7, hh = vh(VWv / 2 + x / SX) * SX; m.position.set(x, Math.sin(i * 2.3) * 0.12, Math.cos(i * 1.7) * 0.1); m.scale.setScalar(Math.min(0.4, hh * 0.9)); m.rotation.set(Math.PI / 2 + Math.sin(t + i) * 0.3, 0, 0); }); }
        if (!K) return;
        const mut = K.mut === 1;
        if (mut !== (lastMut === 1)) { lastMut = mut ? 1 : 0; }
        hb[5].material.color.copy(AAC[mut ? 2 : 16]); { const tx = '6번째: ' + (mut ? '발린 (V)' : '글루탐산 (E)'); if (hbLab.tx !== tx) { hbLab.tx = tx; hbLab.set(tx); } }
        cells.forEach((m, i) => {
          const c = K.cells[i]; m.visible = !!c; if (!c) return;
          const hh = vh(c.x), sy = Math.min(1, (hh - 4) / 23);
          m.geometry = mut ? sGeo : dGeo; m.material = mut ? cMatS : cMat;
          m.position.set(X3(c.x), (c.y - G0.y) * SX * 0.6 + (c.stuck ? Math.sin(t * 14 + c.ph) * 0.02 : 0), Math.sin(c.ph * 0.7) * 0.12);
          m.scale.setScalar(mut ? 0.42 : 0.4 * Math.max(0.5, sy));
          if (mut) m.rotation.set(0, Math.sin(c.ph * 0.4) * 0.3, Math.sin(c.ph) * 0.4); else m.rotation.set(Math.PI / 2 + Math.sin(c.ph * 0.5) * 0.3, 0, 0);
        });
        tissue.material.emissiveIntensity = 0.1 + 0.6 * (K.o2 == null ? 1 : K.o2);
        { const tx = '조직 · 산소 ' + Math.round((K.o2 == null ? 1 : K.o2) * 100) + '%'; if (tLab.tx !== tx) { tLab.tx = tx; tLab.set(tx); } } tLab.show(true);
        sickLab.show(false);
        const key = mut + '|' + (K.stuck || 0);
        if (key !== lastKey) {
          lastKey = key;
          info(mut ? '<b>변이 헤모글로빈</b>: 6번째 아미노산이 글루탐산 → <b>발린</b>으로 바뀌면 서로 달라붙어 적혈구가 낫 모양이 돼요.<br>좁은 혈관에 걸려 쌓이고(막힌 적혈구 ' + (K.stuck || 0) + '개) 조직에 산소가 덜 가요.' : '<b>정상 헤모글로빈</b>: 6번째가 글루탐산이에요. 적혈구는 둥글고 유연해 좁은 혈관을 지나가요.<br>옆의 <b>변이 발린</b> 버튼을 눌러 비교해 보세요.');
        }
      }

      function showScene(sc) {
        scene = sc; gF.visible = sc === 'fold'; gS.visible = sc === 'sick';
        foldCtl.forEach((e) => { e.style.display = sc === 'fold' ? '' : 'none'; });
        repCtl.forEach((e) => { e.style.display = sc === 'fold' && ctx.level === 2 ? '' : 'none'; });
        // 구슬 바꾸기 줄은 3단계에서만
        if (sc === 'fold') plF.pause();
        bl.forEach((l) => l.show(false)); keyLab.show(false); cupLab.show(false); tLab.show(false); hbLab.show(sc === 'sick');
        lastKey = '';
        orbit.dist = sc === 'fold' ? (PHN ? 12 : 8.8) : (PHN ? 20 : 14);
        if (sc === 'sick') { orbit.theta = 0.0; orbit.phi = 1.35; }
      }
      ctx.onLevel((li) => { setTimeout(() => showScene(sceneOf(li)), 0); });
      showScene(scene);
      return {
        update(dt, t) {
          if (scene === 'fold') { for (let i = 0; i < NPD; i++) { const d = ddF[i]; dmF.position.set(d.x + Math.sin(t * 0.3 * d.s + d.p) * 0.4, ((d.y + t * 0.15 * d.s + 2) % 6.5) - 2, d.z + Math.cos(t * 0.25 * d.s + d.p) * 0.3); dmF.scale.setScalar(0.6 + 0.4 * Math.sin(t + d.p)); dmF.updateMatrix(); dustF.setMatrixAt(i, dmF.matrix); } dustF.instanceMatrix.needsUpdate = true; }
          if (scene === 'fold') { if (demoP === 0 && !plF.playing) mirrorFold(t); }
          else paintSick(t);
        },
        sync() { lastKey = ''; },
      };
    },
  });
})();
