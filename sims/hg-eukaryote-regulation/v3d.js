/* hg-eukaryote-regulation · 3D 진핵생물의 전사 조절 (염색질 · 전사 인자 · 인핸서)
   DNA는 히스톤에 감긴 뉴클레오솜(염주 모양 염색질)으로 닫혀 있어요. 전사 인자가 인핸서에 붙으면 염색질이 풀리고,
   DNA가 고리처럼 휘어 인핸서와 프로모터가 가까워지고(매개 단백질), RNA 중합 효소가 전사를 시작해요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const narrow = window.innerWidth < 600 || window.innerHeight > window.innerWidth * 1.1;
  const X0 = -6, X1 = 6, E = -3.0, P = 2.2, GEND = 5.6, NUC_N = 13, NUC_DX = 0.95;

  window.SciSim3D.attach({
    title: '진핵생물의 유전자 발현 조절 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: narrow ? 13 : 11.5, theta: 0.2, phi: 1.28, target: narrow ? [-0.8, 0, 0] : [0, 0.8, 0], min: 6, max: 24 },
    autoRotate: 0,
    levels: [1],   // 1단계(원핵 · 진핵 비교)와 3 · 4단계(단계별 슬라이더 · 단계–사례 · 설명 자료)는 2D 화면에서, 전사 인자 단계에서 3D로 시작
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const V = THREE.Vector3, M4 = new THREE.Matrix4();
      if (narrow) root.rotation.z = Math.PI / 2;      // 휴대폰(세로 화면)에서는 눕혀 둔 모형을 세워서 보여 줘요
      /* 재질: 모형(DNA·인자)은 매끈한 플라스틱, 단백질 덩어리는 촉촉한 생체 조직 느낌 + 울퉁불퉁한 표면 */
      const std = (c, o) => ctx.mats.plastic(c, { roughness: 0.32, extra: o });
      const bio = (c, op, o) => ctx.mats.organic(c, { opacity: op, extra: o });
      const lumpy = (geo, amp, f) => {
        const p = geo.attributes.position, v = new V(), n = new V();
        for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); n.copy(v).normalize(); v.multiplyScalar(1 + amp * (Math.sin(n.x * f + 1.3) * Math.cos(n.y * f * 1.3 + 0.4) + 0.6 * Math.sin(n.z * f * 1.7 + n.x * 2.1))); p.setXYZ(i, v.x, v.y, v.z); }
        geo.computeVertexNormals(); return geo;
      };
      const ease = (k) => { k = Math.max(0, Math.min(1, k)); return k * k * (3 - 2 * k); };
      const lerp = (a, b, k) => a + (b - a) * k;
      const An = (x, y, z) => { const o = new THREE.Object3D(); o.position.set(x, y, z); root.add(o); return o; };
      let step = 0, loop = 0, open = 0, tfk = [0, 0, 0], polk = 0, ph = 0, cell = 'A', basalOn = false;
      const CELLS = { A: ['X', 'Y', 'Z'], B: ['X', 'Y'], C: ['Y', 'Z'] }, TFN = ['X', 'Y', 'Z'];   // 2D 전사 인자 · 세포와 같아요

      /* DNA 경로: 인핸서와 프로모터 사이 DNA가 (길이는 그대로) 둥근 고리로 말려 두 곳이 가까워져요 */
      function posAt(x, L, out) {
        const w = P - E, o = out || new V();
        if (L < 0.01 || (x <= E)) return o.set(x, 0, 0);
        const d = w * (1 - 0.82 * L), r = d / w;
        let lo = 0.0001, hi = Math.PI;
        for (let i = 0; i < 28; i++) { const m = (lo + hi) / 2; if (Math.sin(m) / m > r) lo = m; else hi = m; }
        const th = (lo + hi) / 2, R = w / (2 * th);
        if (x >= P) return o.set(x - (w - d), 0, 0);
        const ph = -th + 2 * th * ((x - E) / w);
        return o.set(E + d / 2 + R * Math.sin(ph), R * (Math.cos(ph) - Math.cos(th)), 0);
      }
      const dnaMat = std(0x60a5fa, { roughness: 0.35 });
      let dnaMesh = null;
      function buildDNA() {
        if (dnaMesh) { root.remove(dnaMesh); dnaMesh.geometry.dispose(); }
        const pts = []; for (let x = X0; x <= X1 + 1e-6; x += 0.2) pts.push(posAt(x, loop));
        dnaMesh = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 220, 0.09, 12, false), dnaMat); root.add(dnaMesh);
      }
      // 구간 표지
      const eBlock = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.3, 0.3), std(0xf97316, { emissive: 0x4a1e00 })), pBlock = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.3, 0.3), std(0x84cc16, { emissive: 0x1f3300 }));
      const gBlock = new THREE.Mesh(new THREE.BoxGeometry(GEND - 2.7, 0.2, 0.26), std(0x3b82f6, { emissive: 0x0a1e4a })); root.add(eBlock, pBlock, gBlock);

      /* 뉴클레오솜 */
      const nucs = [];
      for (let i = 0; i < NUC_N; i++) {
        const g = new THREE.Group(), x = X0 + 0.5 + i * NUC_DX;
        const core = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.5, 32, 1), bio(0x2dd4bf)); core.rotation.x = Math.PI / 2; g.add(core);
        [-0.1, 0.1].forEach((z) => { const t = new THREE.Mesh(new THREE.TorusGeometry(0.41, 0.06, 12, 36), dnaMat); t.position.z = z; g.add(t); });
        root.add(g); nucs.push({ g, x, away: (x > E - 1.3 && x < E + 1.0) || (x > P - 1.0 && x < P + 1.8) });
      }
      /* 전사 인자 · 매개 단백질 · RNA 중합 효소 */
      const tfs = [0xef4444, 0x2563eb, 0xf59e0b].map((c, i) => { const m = new THREE.Mesh(lumpy(new THREE.SphereGeometry(0.24, 28, 20), 0.06, 3.8), bio(c)); root.add(m); return m; });
      const med = new THREE.Mesh(lumpy(new THREE.SphereGeometry(0.55, 40, 28), 0.06, 3.4), bio(0xa855f7, 0.85)); root.add(med); med.scale.set(1.6, 0.8, 1);
      const pol = new THREE.Group(); root.add(pol);
      { const b = new THREE.Mesh(lumpy(new THREE.SphereGeometry(0.7, 44, 30), 0.07, 3.2), bio(0x14b8a6, 0.55)); b.scale.set(1.0, 0.9, 0.9); pol.add(b);
        const c = new THREE.Mesh(lumpy(new THREE.SphereGeometry(0.34, 28, 20), 0.08, 3.6), bio(0x0d9488)); c.position.set(0.1, 0.2, -0.2); pol.add(c); }
      const basal = [0, 1].map(() => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 12), std(0x8b5cf6)); root.add(m); return m; });
      const rnaMax = 50, rna = new THREE.InstancedMesh(new THREE.SphereGeometry(0.09, 12, 10), std(0xfb923c, { emissive: 0x3a1a00, roughness: 0.35 }), rnaMax); root.add(rna);

      const L = {
        enh: label('인핸서', eBlock, { color: '#9a3412', offset: [0, -0.55, 0] }), pro: label('프로모터', pBlock, { color: '#3f6212', offset: [0, -0.55, 0] }), gene: label('유전자', gBlock, { color: '#1e3a8a', offset: [0, -0.5, 0] }),
        nuc: label('뉴클레오솜 (히스톤 + DNA)', nucs[2].g, { color: '#0f766e', offset: [0, 0.85, 0] }), tf: label('전사 인자 X', tfs[0], { color: '#b91c1c', offset: [-0.25, 0.5, 0] }), tfY: label('Y', tfs[1], { color: '#1d4ed8', offset: [0, 0.5, 0] }), tfZ: label('Z', tfs[2], { color: '#b45309', offset: [0.25, 0.5, 0] }), basal: label('기본 전사 인자', basal[0], { color: '#6d28d9', offset: [0, 0.45, 0] }), med: label('매개 단백질', med, { color: '#6b21a8', offset: [0, 0.75, 0] }),
        pol: label('RNA 중합 효소', pol, { color: '#0f766e', offset: [0, 1.0, 0] }), mrna: label('mRNA', null, { color: '#9a3412' }),
      };
      const rnaAnchor = An(0, 0, 0); L.mrna.obj = rnaAnchor;
      const TXT = [
        '<b>① 염색질이 닫혀 있어요</b><br>DNA가 히스톤에 감긴 뉴클레오솜이라 RNA 중합 효소가 프로모터에 접근할 수 없어요. 전사가 꺼져 있어요.',
        '<b>② 전사 인자 결합</b><br>전사 인자가 인핸서에 붙고 염색질이 풀려요(뉴클레오솜이 밀려나요).',
        '<b>③ DNA 고리</b><br>DNA가 휘어 먼 곳의 인핸서가 프로모터와 가까워지고, 매개 단백질이 둘을 이어 줘요.',
        '<b>④ 전사 시작</b><br>RNA 중합 효소가 프로모터에 붙어 유전자를 전사해요. 인핸서가 전사 속도를 높여요.',
      ];
      const tfMode = () => { const L = ctx.lesson(); return !!(L && L.S && L.S.mode === 'tf' && L.TFS); };
      /* 지금 3D가 보여 줄 상태: 2D 전사 인자 화면이면 2D(TFS)를 그대로, 아니면 3D 단계(step)에서 계산 */
      function eff() {
        if (tfMode()) {
          const T = ctx.lesson().TFS, m = TFN.map((k) => !!T.bound[k]), any = m.some(Boolean), all = m.every(Boolean);
          return { cell: T.cell, mask: m, any, basal: !!T.basal, loop: all && !!T.basal, trans: all && !!T.basal, lesson: true };
        }
        const has = CELLS[cell], m = TFN.map((k) => step >= 1 && has.indexOf(k) >= 0), all = m.every(Boolean);
        return { cell, mask: m, any: step >= 1, basal: step >= 1, loop: step >= 2 && all, trans: step >= 3 && all, lesson: false };
      }
      let lastTxt = '';
      const missing = (c) => TFN.filter((k) => CELLS[c].indexOf(k) < 0).join(' · ');
      function refreshInfo() {
        const e = eff(); let h;
        const have = TFN.filter((k, i) => e.mask[i]).join(' · '), all = e.mask.every(Boolean);
        if (!e.any) h = TXT[0];
        else if (!e.loop) {
          h = e.lesson ? '<b>② 전사 인자 결합</b><br>전사 인자 ' + have + '가 인핸서에 붙고 염색질이 풀려요(뉴클레오솜이 밀려나요). ' + (all ? '이제 기본 전사 인자(B)가 모일 수 있어요.' : (e.cell !== 'A' ? '세포 ' + e.cell + '에는 전사 인자 ' + missing(e.cell) + '가 없어 X · Y · Z가 모두 모이지 못해요 → 전사가 꺼져 있어요.' : '')) : (all ? TXT[1] : '<b>② 전사 인자 결합</b><br>세포 ' + e.cell + '에는 전사 인자 ' + missing(e.cell) + '가 없어 X · Y · Z가 모두 모이지 못해요 → 전사가 꺼져 있어요.');
        } else h = e.trans ? TXT[3] : TXT[2];
        if (h !== lastTxt) { lastTxt = h; info(h + '<br><span style="color:#9fb0d4">세포 ' + e.cell + ': 전사 인자 ' + CELLS[e.cell].join(' · ') + '</span>'); }
      }
      /* 3D에서 고르면 2D 전사 인자 화면도 같은 상태로 (세포 · 전사 인자 붙이기 · 기본 전사 인자) */
      function applyToLesson(target) {
        const L = ctx.lesson(); if (!L || !L.S || L.S.mode !== 'tf' || !L.TFS) return false;
        const T = L.TFS;
        if (T.cell !== cell) L.tfCell(cell);
        if (target === 0) L.tfReset(true);
        else TFN.forEach((k) => { const w = CELLS[cell].indexOf(k) >= 0; if (T.bound[k] !== w) L.tfToggle(k); });
        if (target >= 2 && !T.basal && TFN.some((k) => T.bound[k])) L.tfToggle('B');
        if (target < 2 && T.basal) L.tfToggle('B');
        return true;
      }
      let plSet = false;
      function setStep(v) { step = v; if (player && player.playing && !plSet) player.pause(); applyToLesson(v); lastTxt = ''; refreshInfo(); }
      const segCell = controls.segment('세포', [{ value: 'A', label: '세포 A (X Y Z)' }, { value: 'B', label: '세포 B (X Y)' }, { value: 'C', label: '세포 C (Y Z)' }], cell, (v) => { cell = v; const L = ctx.lesson(); if (L && L.S && L.S.mode === 'tf' && L.tfCell) L.tfCell(v); lastTxt = ''; refreshInfo(); });
      const segStep = controls.segment('단계', [{ value: 0, label: '① 닫힘' }, { value: 1, label: '② 전사 인자' }, { value: 2, label: '③ DNA 고리' }, { value: 3, label: '④ 전사' }], 0, setStep);
      /* ▶ 닫힘 → 전사 인자 결합 → DNA 고리 → 전사 */
      const player = controls.player({
        duration: 12, loop: true, autoplay: false, label: '전사 시작까지',
        phases: [[0, '① 닫힘'], [0.25, '② 전사 인자 결합'], [0.5, '③ DNA 고리'], [0.75, '④ 전사']],
        onFrame(p) { const v = Math.min(3, Math.floor(p * 4)); if (v !== step) { plSet = true; step = v; segStep.set(v); lastTxt = ''; applyToLesson(v); plSet = false; } },
      });
      refreshInfo(); buildDNA();

      /* 2D 전사 인자 화면의 상태를 따라가요 */
      let lastKey = '';
      function poll() {
        const L = ctx.lesson(); if (!L || !L.S || L.S.mode !== 'tf' || !L.TFS) return;
        const T = L.TFS, key = T.cell + TFN.map((k) => (T.bound[k] ? 1 : 0)).join('') + (T.basal ? 'b' : '');
        if (key === lastKey) return; lastKey = key;
        if (T.cell !== cell) { cell = T.cell; segCell.set(cell); }
        const any = TFN.some((k) => T.bound[k]), all = TFN.every((k) => T.bound[k]);
        step = !any ? 0 : (all && T.basal) ? 3 : 1; segStep.set(step); lastTxt = '';
      }

      const V1 = new V(), V2 = new V(), Qt = new THREE.Quaternion();
      let lastLoop = -1, lastSim = null, rnaN = 0;
      return {
        update(dt, t) {
          dt = Math.min(dt, 0.05) * (window.__v3dTS || 1);
          poll();
          const ap = (cur, tg, r) => cur + (tg - cur) * Math.min(1, dt * r), E0 = eff();
          open = ap(open, E0.any ? 1 : 0, 2.2); loop = ap(loop, E0.loop ? 1 : 0, 1.5); polk = ap(polk, E0.trans ? 1 : 0, 1.8);
          for (let i = 0; i < 3; i++) tfk[i] = ap(tfk[i], E0.mask[i] ? 1 : 0, 1.8);
          refreshInfo();
          if (Math.abs(loop - lastLoop) > 0.002) { lastLoop = loop; buildDNA(); }
          // 구간 표지
          posAt(E, loop, V1); eBlock.position.set(V1.x, V1.y + 0.0, 0.0);
          posAt(P, loop, V1); pBlock.position.set(V1.x, V1.y, 0);
          posAt((P + GEND) / 2 + 0.3, loop, V1); gBlock.position.set(V1.x, V1.y, 0);
          // 뉴클레오솜 (염색질이 풀리면 인핸서·프로모터 근처 뉴클레오솜이 아래로 밀려나요)
          nucs.forEach((n) => {
            const k = n.away ? ease(open) : 0; posAt(n.x, loop, V1);
            n.g.position.set(V1.x + (n.x < 0 ? -1 : 1) * k * 0.15, V1.y - k * 1.9, k * 0.5); n.g.scale.setScalar(1 - 0.25 * k);
          });
          // 전사 인자: 인핸서 위에 모여요
          posAt(E, loop, V1);
          tfs.forEach((m, i) => { const k = ease(tfk[i] * 1.2); m.position.set(V1.x + (i - 1) * 0.28, V1.y + lerp(2.6, 0.38 + (i === 1 ? 0.2 : 0), k), (i - 1) * 0.15); m.visible = tfk[i] > 0.01; });
          // 기본 전사 인자(프로모터) · 매개 단백질
          posAt(P, loop, V1); V2.copy(V1);
          basal.forEach((m, i) => { m.position.set(V2.x + (i - 0.5) * 0.35, V2.y + 0.3, 0); m.visible = E0.basal && open > 0.5; });
          posAt(E, loop, V1);
          med.visible = loop > 0.55; med.position.set((V1.x + V2.x) / 2, 0.55, 0.0); med.scale.set(Math.max(0.01, (Math.abs(V1.x - V2.x) + 0.8) * 0.75), 0.8, 1); med.scale.x = Math.max(0.01, med.scale.x * ease((loop - 0.55) / 0.45));
          // RNA 중합 효소 (프로모터에서 시작해 유전자를 따라 움직여요)
          const trans = polk > 0.97, run = trans ? ((t * 0.12) % 1) : 0;
          const pxd = trans ? lerp(P, GEND - 0.3, run) : P;
          posAt(pxd, loop, V1);
          pol.position.set(V1.x, lerp(3.2, V1.y + 0.55, ease(polk)), lerp(1.0, 0, ease(polk))); pol.visible = polk > 0.01;
          rnaN = trans ? Math.min(rnaMax, Math.floor((pxd - P) / 0.1) + 1) : 0;
          for (let i = 0; i < rnaMax; i++) {
            if (i >= rnaN) { M4.makeScale(0, 0, 0); rna.setMatrixAt(i, M4); continue; }
            const s2 = i * 0.1; M4.makeTranslation(V1.x - 0.1 - s2 * 0.9, V1.y - 0.55 - Math.min(s2, 1.8) * 0.45 + 0.1 * Math.sin(s2 * 4), 0.35); rna.setMatrixAt(i, M4);
          }
          rna.instanceMatrix.needsUpdate = true;
          rnaAnchor.position.set(V1.x - 1.2, V1.y - 1.5, 0.35);
          // 이름표
          L.enh.show(true); L.pro.show(true); L.gene.show(true); L.nuc.show(open < 0.5); L.tf.show(tfk[0] > 0.8); L.tfY.show(tfk[1] > 0.8); L.tfZ.show(tfk[2] > 0.8); L.basal.show(E0.basal && open > 0.8); L.med.show(loop > 0.9); L.pol.show(polk > 0.8); L.mrna.show(rnaN > 8);
        },
        sync() { poll(); },
      };
    },
  });
})();
