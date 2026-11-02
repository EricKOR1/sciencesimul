/* hg-dna-replication · 3D DNA 복제 분기점 (복제 포크)
   부모 DNA(파랑) → 헬리케이스가 풀면 → 두 딸 DNA: 기존 가닥(파랑) + 새 가닥(빨강) = 반보존적 복제.
   새 가닥은 5′→3′ 방향으로만 만들어져요: 리딩 가닥은 연속, 지연 가닥은 프라이머(보라)에서 시작하는 오카자키 절편 → 연결 효소가 이어요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const narrow = window.innerWidth < 600 || window.innerHeight > window.innerWidth * 1.1;
  const PAR = 5, DAU = 6, SL = 0.6, PITCH = 2.6, RAD = 0.5, DB = 0.13;
  const COL = { old: 0x60a5fa, nw: 0xfb7185, prim: 0xd946ef };

  window.SciSim3D.attach({
    title: 'DNA 복제 분기점 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: narrow ? 14.5 : 12.5, theta: 0.3, phi: 1.2, target: [0.5, 0, 0], min: 6, max: 24 },
    autoRotate: 0,
    levels: [2],
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const V = THREE.Vector3;
      if (narrow) root.rotation.z = Math.PI / 2;
      const std = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.4, metalness: 0.04 }, o || {}));

      /* ---------- 축과 나선 ---------- */
      // side 0: 부모, +1: 위쪽 딸, -1: 아래쪽 딸.  q: 부모는 왼쪽 끝에서, 딸은 분기점에서 잰 거리
      function frame(side, q) {
        if (side === 0) return { c: new V(-PAR + q, 0, 0), n: new V(0, 1, 0), b: new V(0, 0, 1) };
        const e = Math.exp(-q), d = new V(1, side * SL * (1 - e), 0).normalize();
        return { c: new V(q, side * SL * (q - 1 + e), 0), n: new V(-d.y, d.x, 0), b: new V(0, 0, 1) };
      }
      function strandPos(side, q, phase, out) {
        const g = side === 0 ? q : PAR + q, f = frame(side, q), a = 2 * Math.PI * g / PITCH + phase;
        return (out || new V()).copy(f.c).addScaledVector(f.n, RAD * Math.cos(a)).addScaledVector(f.b, RAD * Math.sin(a));
      }
      // 한 가닥의 구슬 위치 목록: 부모 구간 + 딸 구간
      const beads = [];     // {p, c(color), s(scale)}
      function addStrand(parts, phase) { parts.forEach((pt) => { for (let q = pt.q0; q <= pt.q1 + 1e-6; q += DB) { beads.push({ p: strandPos(pt.side, q, phase), c: pt.col ? pt.col(q) : COL.old, s: 1 }); } }); }
      const sideU = 1, sideL = -1;
      addStrand([{ side: 0, q0: 0, q1: PAR }, { side: sideU, q0: DB, q1: DAU }], 0);               // 기존 가닥 A (위로)
      addStrand([{ side: 0, q0: 0, q1: PAR }, { side: sideL, q0: DB, q1: DAU }], Math.PI);         // 기존 가닥 B (아래로)
      // 새 가닥 A' (리딩): 연속
      const A0 = 1.7;
      addStrand([{ side: sideU, q0: A0, q1: DAU, col: () => COL.nw }], Math.PI);
      // 새 가닥 B' (지연): 오카자키 절편 (앞쪽 2개는 아직 틈, 뒤쪽은 연결 효소가 이어 붙임)
      const FRAG = 1.45, GAP = 0.34, FST = 1.9, frags = [];
      for (let n = 0; n < 3; n++) {
        const s0 = FST + n * FRAG, last = n === 2, e0 = s0 + FRAG - (n < 1 ? GAP : 0);
        frags.push({ s0, e0 });
        addStrand([{ side: sideL, q0: s0, q1: Math.min(e0, DAU), col: (q) => (q < s0 + 0.3 ? COL.prim : COL.nw) }], 0);
      }
      // 오카자키 절편 3개 이후는 이미 이어진 가닥
      { const s0 = FST + 3 * FRAG; if (s0 < DAU) addStrand([{ side: sideL, q0: s0 - 0.0, q1: DAU, col: () => COL.nw }], 0); }
      const bGeo = new THREE.SphereGeometry(0.1, 14, 10);
      const bm = new THREE.InstancedMesh(bGeo, std(0xffffff, { roughness: 0.3 }), beads.length);
      const M4 = new THREE.Matrix4(), cc = new THREE.Color();
      beads.forEach((b, i) => { M4.makeTranslation(b.p.x, b.p.y, b.p.z); bm.setMatrixAt(i, M4); bm.setColorAt(i, cc.setHex(b.c)); });
      bm.instanceMatrix.needsUpdate = true; bm.instanceColor.needsUpdate = true; root.add(bm);

      /* 염기쌍 (두 가닥을 잇는 계단) */
      const rungs = [];
      for (let q = 0.1; q <= PAR; q += 0.3) rungs.push({ a: strandPos(0, q, 0), b: strandPos(0, q, Math.PI), ca: 0xbfdbfe, cb: 0xbfdbfe });
      const rA = []; for (let q = A0; q <= DAU; q += 0.3) rA.push({ a: strandPos(sideU, q, 0), b: strandPos(sideU, q, Math.PI), ca: 0xbfdbfe, cb: 0xfecdd3 });
      const rB = []; frags.forEach((f, n) => { for (let q = f.s0 + 0.05; q <= Math.min(f.e0, DAU); q += 0.3) rB.push({ a: strandPos(sideL, q, Math.PI), b: strandPos(sideL, q, 0), ca: 0xbfdbfe, cb: 0xfecdd3 }); });
      { const s0 = FST + 3 * FRAG; for (let q = s0; q <= DAU; q += 0.3) rB.push({ a: strandPos(sideL, q, Math.PI), b: strandPos(sideL, q, 0), ca: 0xbfdbfe, cb: 0xfecdd3 }); }
      const all = rungs.concat(rA, rB);
      const rGeo = new THREE.CylinderGeometry(0.035, 0.035, 1, 8);
      const rm = new THREE.InstancedMesh(rGeo, std(0xffffff, { roughness: 0.35 }), all.length * 2);
      const Y = new V(0, 1, 0), Qt = new THREE.Quaternion(), mid = new V(), dv = new V(), S3 = new V();
      all.forEach((r, i) => {
        mid.addVectors(r.a, r.b).multiplyScalar(0.5);
        [[r.a, mid, r.ca], [mid, r.b, r.cb]].forEach((h, k) => {
          const p0 = h[0], p1 = h[1]; dv.subVectors(p1, p0); const L = dv.length();
          const c = new V().addVectors(p0, p1).multiplyScalar(0.5);
          Qt.setFromUnitVectors(Y, dv.clone().normalize()); M4.compose(c, Qt, S3.set(1, L, 1)); rm.setMatrixAt(i * 2 + k, M4); rm.setColorAt(i * 2 + k, cc.setHex(h[2]));
        });
      });
      rm.instanceMatrix.needsUpdate = true; rm.instanceColor.needsUpdate = true; root.add(rm);

      /* ---------- 효소 ---------- */
      const enzG = new THREE.Group(); root.add(enzG);
      const helix = new THREE.Mesh(new THREE.TorusGeometry(0.82, 0.27, 24, 56), std(0xf97316, { roughness: 0.35 })); helix.rotation.y = Math.PI / 2; helix.position.set(-0.45, 0, 0); enzG.add(helix);
      const wedge = new THREE.Mesh(new THREE.SphereGeometry(0.28, 20, 14), std(0xea580c)); wedge.position.set(0.3, 0, 0); enzG.add(wedge);
      function polAt(side, q, scale) {
        const f = frame(side, q), g = new THREE.Group(); g.position.copy(f.c);
        const d = new V().crossVectors(f.n, f.b); g.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(d, f.n, f.b));
        const body = new THREE.Mesh(new THREE.SphereGeometry(1, 36, 24), std(0x14b8a6, { transparent: true, opacity: 0.42, depthWrite: false, roughness: 0.3 })); body.scale.set(0.85 * scale, 0.95 * scale, 0.9 * scale); g.add(body);
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.78, 0.13, 16, 40), std(0x0d9488)); ring.rotation.y = Math.PI / 2; ring.position.x = -0.3 * scale; g.add(ring);
        enzG.add(g); return g;
      }
      const polA = polAt(sideU, 2.55, 1.0);
      const polB = polAt(sideL, frags[0].s0 + 0.75, 0.9);
      const prim = new THREE.Mesh(new THREE.SphereGeometry(0.26, 18, 14), std(0xa21caf, { roughness: 0.35 })); { const p = strandPos(sideL, frags[0].s0 - 0.15, 0, new V()); const f = frame(sideL, frags[0].s0 - 0.15); prim.position.copy(p).addScaledVector(f.n, -0.35); enzG.add(prim); }
      const lig = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.15, 16, 40), std(0xfacc15, { emissive: 0x4a3600 }));
      { const q = frags[1].e0 + 0.9, f = frame(sideL, q), d = new V().crossVectors(f.n, f.b); lig.position.copy(f.c); lig.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(d, f.n, f.b)); lig.rotateY(Math.PI / 2); enzG.add(lig); }

      /* ---------- 방향 화살표 · 합성 표시 ---------- */
      const dirG = new THREE.Group(); root.add(dirG); dirG.visible = false;
      const aMat = std(0xfde047, { emissive: 0x6b5300, roughness: 0.3 });
      function arrow(side, q, phase, dir) {   // dir: +1 이면 q 증가 방향
        const p = strandPos(side, q, phase), f = frame(side, q), dd = new V().crossVectors(f.n, f.b).multiplyScalar(dir);
        const c = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.5, 18), aMat); c.position.copy(p).addScaledVector(new V(p.x - f.c.x, p.y - f.c.y, p.z - f.c.z).normalize(), 0.3);
        c.quaternion.setFromUnitVectors(Y, dd.normalize()); dirG.add(c); return c;
      }
      arrow(sideU, 3.4, Math.PI, -1); arrow(sideU, 5.2, Math.PI, -1);        // 리딩 가닥: 분기점 쪽으로
      frags.forEach((f) => { arrow(sideL, f.s0 + 0.8, 0, +1); });             // 지연 가닥: 분기점에서 멀어지는 쪽
      arrow(0, 1.6, 0, +1); arrow(0, 3.4, Math.PI, +1);
      const glow = [0, 1, 2].map(() => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), std(0xffffff, { emissive: 0xfff3a0, emissiveIntensity: 1.2 })); root.add(m); return m; });
      const free = [];     // 떠다니는 뉴클레오타이드
      for (let i = 0; i < 10; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), std(0xfda4af, { roughness: 0.35 })); root.add(m); free.push({ m, ph: Math.random() * 6.28, base: new V() }); }

      /* ---------- 이름표 ---------- */
      const An = (x, y, z) => { const o = new THREE.Object3D(); o.position.set(x, y, z); root.add(o); return o; };
      const fU = frame(sideU, 3.6), fL = frame(sideL, 3.6);
      const L = {
        hel: label('헬리케이스', An(-0.45, 1.3, 0), { color: '#9a3412' }),
        pol: label('DNA 중합 효소', An(polA.position.x, polA.position.y + 1.25, 0), { color: '#0f766e' }),
        lead: label('리딩 가닥 (연속)', An(5.2, frame(sideU, 5.2).c.y + 1.0, 0), { color: '#be123c' }),
        lag: label('지연 가닥 (불연속)', An(5.2, frame(sideL, 5.2).c.y - 1.0, 0), { color: '#be123c' }),
        old: label('부모 DNA', An(-PAR + 1.5, 1.1, 0), { color: '#1d4ed8' }),
        pri: label('프라이머', An(prim.position.x - 0.1, prim.position.y - 0.75, 0), { color: '#86198f' }),
        ok: label('오카자키 절편', An(frags[1].s0 + 0.7, frame(sideL, frags[1].s0 + 0.7).c.y - 1.0, 0), { color: '#be123c' }),
        lig: label('연결 효소', An(lig.position.x + 0.2, lig.position.y - 0.95, 0), { color: '#854d0e' }),
        d1: label('5′→3′', An(3.5, frame(sideU, 3.5).c.y + 0.95, 0), { color: '#713f12' }),
        d2: label('5′→3′', An(frags[1].s0 + 0.9, frame(sideL, frags[1].s0 + 0.9).c.y + 0.95, 0), { color: '#713f12' }),
      };
      let showEnz = true, showDir = false;
      function applyShow() {
        enzG.visible = showEnz; dirG.visible = showDir;
        ['hel', 'pol', 'pri', 'lig'].forEach((k) => L[k].show(showEnz)); ['d1', 'd2'].forEach((k) => L[k].show(showDir));
        L.ok.show(showEnz); L.lead.show(true); L.lag.show(true); L.old.show(true);
      }
      applyShow();
      info('<b style="color:#60a5fa">파랑</b>은 기존 가닥, <b style="color:#fb7185">빨강</b>은 새 가닥이에요. 딸 DNA마다 기존 가닥 1개 + 새 가닥 1개 → <b>반보존적 복제</b>!<br>새 가닥은 5′→3′ 방향으로만 만들어져요.');
      const b1 = controls.button('효소 보기', () => { showEnz = !showEnz; b1.classList.toggle('on', showEnz); applyShow(); }); b1.classList.add('on');
      const b2 = controls.button('5′→3′ 방향 보기', () => { showDir = !showDir; b2.classList.toggle('on', showDir); applyShow(); });

      return {
        update(dt, t) {
          helix.rotation.x += dt * 2.2;
          // 합성 신호: 리딩은 분기점 쪽으로, 지연은 분기점에서 멀어지는 쪽으로 번져요
          const w = (t * 0.45) % 1;
          strandPos(sideU, DAU - w * (DAU - A0 - 0.1), Math.PI, glow[0].position);
          frags.slice(0, 2).forEach((f, i) => { strandPos(sideL, f.s0 + 0.3 + ((w + i * 0.4) % 1) * (f.e0 - f.s0 - 0.3), 0, glow[i + 1].position); });
          free.forEach((o, i) => {
            const side = i % 2 ? sideU : sideL, q0 = side === sideU ? A0 + 0.5 : frags[0].s0 + 0.4;
            const k = (t * 0.35 + i * 0.37) % 1, fr = frame(side, q0 + 0.4);
            const tgt = strandPos(side, q0 + 0.2, side === sideU ? Math.PI : 0, new V());
            const startP = tgt.clone().addScaledVector(fr.n, side === sideU ? 1.6 : -1.6).add(new V(Math.sin(o.ph + t) * 0.3, 0, 1.2));
            o.m.position.lerpVectors(startP, tgt, k * k); o.m.scale.setScalar(k > 0.95 ? 0.01 : 1);
          });
          polA.position.y = frame(sideU, 2.55).c.y + Math.sin(t * 2) * 0.01;
        },
        sync() {},
      };
    },
  });
})();
