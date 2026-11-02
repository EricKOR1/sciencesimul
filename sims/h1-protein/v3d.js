/* h1-protein · 3D 아미노산 사슬과 단백질 접힘 / 낫 모양 적혈구
   아미노산이 펩타이드 결합으로 이어진 사슬이 접혀 입체 모양이 되고, 서열이 달라지면 모양과 기능이 달라져요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHN = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  // 헤모글로빈 β사슬 앞부분: V H L T P E E K S A V T A L W G K  (정상) / 6번째 E → V (낫 모양)
  const SEQ = 'VHLTPEEKSAVTALWGK'.split('');
  const NAME = { V: '발린', H: '히스티딘', L: '류신', T: '트레오닌', P: '프롤린', E: '글루탐산', K: '라이신', S: '세린', A: '알라닌', W: '트립토판', G: '글라이신' };
  const TYPE = { V: 'h', L: 'h', A: 'h', W: 'h', P: 'h', G: 'n', T: 'n', S: 'n', H: '+', K: '+', E: '-' };
  const COL = { h: 0xff9f43, n: 0x7bd88f, '+': 0x4aa3ff, '-': 0xf0556a };
  const N = SEQ.length;

  window.SciSim3D.attach({
    title: '단백질 사슬 3D',
    camera: { dist: PHN ? 16 : 11.5, theta: 0.6, phi: 1.15, min: 5, max: 26 },
    autoRotate: 0.22,
    build(ctx) {
      const { THREE, root, label, info, controls, orbit } = ctx;
      const std = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.35, metalness: 0.05 }, o || {}));
      let view = 'chain', mut = false, fold = 0, anim = false;
      const gC = new THREE.Group(), gB = new THREE.Group(); root.add(gC, gB);

      /* ---------- 사슬 ---------- */
      const ext = [], fol = [], folM = [];
      for (let i = 0; i < N; i++) {
        ext.push(new THREE.Vector3((i - (N - 1) / 2) * 0.52, (i % 2 ? 0.2 : -0.2), 0));
        const s = i / (N - 1) * Math.PI * 2;
        // 접힌 모양: 위아래로 감긴 둥근 덩어리 (정상)
        fol.push(new THREE.Vector3(1.9 * Math.cos(s * 1.5 + 0.3) , 1.6 * Math.sin(s * 2.0), 1.9 * Math.sin(s * 1.5 + 0.3) * Math.cos(s * 0.5)));
        // 변이(발린): 소수성 6번째 자리가 바깥으로 튀어나와 모양이 달라짐
        const q = fol[i].clone();
        if (i >= 3 && i <= 8) { const w = Math.sin((i - 3) / 5 * Math.PI); q.x += 0.9 * w; q.y += 0.55 * w; q.z -= 0.6 * w; }
        folM.push(q);
      }
      const beads = [], blabs = [];
      for (let i = 0; i < N; i++) {
        const m = new THREE.Mesh(new THREE.SphereGeometry(0.3, 28, 20), std(COL[TYPE[SEQ[i]]])); gC.add(m); beads.push(m);
      }
      let tube = null; const tubeMat = std(0xcfd8ee, { roughness: 0.5 });
      const bead6lab = label('', beads[5], { offset: [0, 0.75, 0], color: 'rgba(240,85,106,.92)' });
      const nlab = label('N 끝', beads[0], { offset: [0, -0.6, 0], size: 12 }), clab = label('C 끝', beads[N - 1], { offset: [0, -0.6, 0], size: 12 });
      function posOf() {
        const f = fold * fold * (3 - 2 * fold), tgt = mut ? folM : fol;
        return ext.map((e, i) => e.clone().lerp(tgt[i], f));
      }
      function paintChain() {
        const P = posOf();
        beads.forEach((m, i) => {
          m.position.copy(P[i]);
          const a = i === 5 ? (mut ? 'V' : 'E') : SEQ[i];
          m.material.color.setHex(COL[TYPE[a]]);
        });
        if (tube) { gC.remove(tube); tube.geometry.dispose(); }
        tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(P), 140, 0.085, 12), tubeMat); gC.add(tube);
        bead6lab.set(mut ? '6번째: 발린 (소수성)' : '6번째: 글루탐산 (−전하)');
        bead6lab.el.style.background = mut ? 'rgba(255,159,67,.95)' : 'rgba(240,85,106,.92)'; bead6lab.el.style.color = mut ? '#1b2333' : '#fff';
        const sc = fold > 0.5 ? 1 : 1; nlab.show(fold < 0.6); clab.show(fold < 0.6);
        if (view === 'chain') {
          info(fold < 0.3 ? '<b>아미노산이 줄줄이 이어진 사슬</b>이에요. 구슬 하나가 아미노산 한 개예요.<br>색: 주황 소수성 · 초록 중성 · 파랑 + · 빨강 −' : '<b>사슬이 접혀 입체 모양</b>이 돼요. 모양이 곧 단백질의 기능을 정해요.' + (mut ? '<br>6번째 구슬이 바뀌어 접힌 모양이 달라졌어요.' : ''));
        }
      }

      /* ---------- 적혈구 ---------- */
      const vessel = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.7, 12, 40, 1, true), new THREE.MeshStandardMaterial({ color: 0xff8a80, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false, roughness: 0.3 }));
      vessel.rotation.z = Math.PI / 2; gB.add(vessel);
      function disc() {
        const pts = []; const z = (r) => 0.58 * Math.sqrt(Math.max(0, 1 - r * r)) * (0.0518 + 2.0026 * r * r - 4.491 * r * r * r * r) * 3.2;
        for (let k = 0; k <= 24; k++) { const r = k / 24; pts.push(new THREE.Vector2(r * 1.0, -Math.max(0.0, z(r)) - 0.0)); }
        for (let k = 24; k >= 0; k--) { const r = k / 24; pts.push(new THREE.Vector2(r * 1.0, Math.max(0.0, z(r)))); }
        const g = new THREE.LatheGeometry(pts.map((p) => new THREE.Vector2(Math.max(0.001, p.x), p.y)), 48); g.computeVertexNormals(); return g;
      }
      function sickle() {
        const g = new THREE.SphereGeometry(1, 48, 28), pos = g.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), tx = x * 1.75, th = 0.42 * (1 - 0.15 * x * x);
          pos.setXYZ(i, tx, y * th * 0.9 - 0.55 * (x * x) + 0.2, z * th * 1.1);
        }
        g.computeVertexNormals(); return g;
      }
      const dGeo = disc(), sGeo = sickle();
      const cellMat = std(0xe53935, { roughness: 0.4 }), cellMatS = std(0xb71c1c, { roughness: 0.45 });
      const cells = [];
      for (let i = 0; i < 6; i++) { const m = new THREE.Mesh(dGeo, cellMat); gB.add(m); cells.push({ m, x: -4.5 + i * 1.8, ph: i * 1.1, jit: Math.random() }); }
      const cLab = label('', [0, 1.5, 0], { color: 'rgba(8,12,24,.85)' });
      function paintCells() {
        cells.forEach((c) => { c.m.geometry = mut ? sGeo : dGeo; c.m.material = mut ? cellMatS : cellMat; c.m.scale.setScalar(mut ? 0.95 : 0.78); });
        cLab.set(mut ? '낫 모양 적혈구 (좁은 곳에 걸려요)' : '둥글고 납작한 정상 적혈구'); cLab.obj = [0, 2.3, 0];
        info(mut ? '<b>변이 헤모글로빈</b>은 서로 달라붙어 적혈구가 낫 모양으로 굳어요. 좁은 혈관이 막혀 산소 공급이 줄어요.' : '<b>정상 적혈구</b>는 가운데가 오목한 원반이라 유연하게 좁은 혈관도 지나가요.');
      }

      function setView(v) {
        view = v; gC.visible = v === 'chain'; gB.visible = v === 'cell';
        [...fCtl].forEach((e) => { e.style.display = v === 'chain' ? '' : 'none'; });
        bead6lab.show(v === 'chain'); cLab.show(v === 'cell'); nlab.show(v === 'chain'); clab.show(v === 'chain');
        orbit.dist = v === 'chain' ? (PHN ? 16 : 11.5) : (PHN ? 18 : 13);
        if (v === 'chain') paintChain(); else paintCells();
        segV.set(v);
      }
      const segV = controls.segment('보기', [{ value: 'chain', label: '아미노산 사슬' }, { value: 'cell', label: '적혈구 모양' }], view, setView);
      const segM = controls.segment('6번째 아미노산', [{ value: false, label: '글루탐산(정상)' }, { value: true, label: '발린(변이)' }], mut, (v) => { mut = v; if (view === 'chain') paintChain(); else paintCells(); });
      const nBefore = document.querySelector('.v3-ctl').children.length;
      const rg = controls.range('접힘', 0, 100, 1, 0, (v) => { fold = v / 100; anim = false; paintChain(); }, (v) => v + '%');
      const bB = controls.button('▶ 접히기', () => { fold = 0; anim = true; rg.set(0); });
      const fCtl = [...document.querySelector('.v3-ctl').children].slice(nBefore);
      setView('chain');
      return {
        update(dt, t) {
          if (view === 'chain') {
            if (anim) { fold = Math.min(1, fold + dt * 0.28); rg.set(Math.round(fold * 100)); paintChain(); if (fold >= 1) anim = false; }
            else if (fold > 0.7) { /* 접힌 사슬은 살짝 숨 쉬듯 */ gC.rotation.y = Math.sin(t * 0.5) * 0.08; }
          } else {
            cells.forEach((c, i) => {
              const sp = mut ? 0.25 : 0.9; c.x += dt * sp; if (c.x > 5.8) c.x = -5.8;
              const squeeze = Math.abs(c.x) < 0.5 ? 1 : 0;
              if (mut) { // 좁은 곳(x≈1.5)에 쌓임: 낫 모양은 구불구불 서서히 멈춤
                const stop = 1.5 + (i % 3) * 0.25; if (c.x > stop - 0.1 && c.x < stop + 0.9) c.x -= dt * sp * 0.9;
              }
              c.m.position.set(c.x, Math.sin(t * 1.3 + c.ph) * 0.22, Math.cos(t * 0.9 + c.ph) * 0.18);
              c.m.rotation.set(Math.PI / 2 * (mut ? 0 : 1) + Math.sin(t + c.ph) * 0.35, Math.sin(t * 0.7 + c.ph) * 0.3, mut ? Math.sin(t * 0.8 + c.ph) * 0.6 + i : t * 0.5 + c.ph);
              if (!mut) { c.m.rotation.set(0, Math.PI / 2 + Math.sin(t * 0.8 + c.ph) * 0.4, 0); c.m.rotation.z = Math.sin(t + c.ph) * 0.3; c.m.rotation.x = t * 0.6 + c.ph; }
            });
          }
        },
        sync() {},
      };
    },
  });
})();
