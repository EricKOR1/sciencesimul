/* hb-neuro-endocrine · 3D 신경 신호와 호르몬 신호
   2D 차시와 같은 두 장면: ⚡ 신경 신호(가시에 찔림 → 감각 뉴런 → 연합 뉴런(척수) → 운동 뉴런 → 팔 근육, 약 0.05초, 연결된 한 곳에만)
   🩸 호르몬 신호(호르몬 분비 → 혈액이 도는 고리 혈관 → 표적 세포 ②·④만 수용체에 결합해 반응, ① ③ ⑤는 반응 없음)
   2D의 🌵 가시에 찔리기 · 🧪 호르몬 분비 · 🔬 수용체 보기 단추를 3D에서도 쓸 수 있고, ▶ 재생은 한 번의 신호 전체를 반복해서 보여 줘요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const narrow = window.innerWidth < 600 || window.innerHeight > window.innerWidth * 1.1;
  const L2 = () => window.__sim || null;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const lerp = (a, b, t) => a + (b - a) * t;

  const v3 = window.SciSim3D.attach({
    title: '신경 신호의 전달 3D',
    hint: '🌵 가시에 찔리기를 누르면 신호가 전달돼요 · 드래그: 돌리기',
    camera: { dist: narrow ? 20 : 13, theta: 0.0, phi: 1.0, min: 6, max: 26, target: [0, 0, 0] },
    autoRotate: 0,
    levels: [0],
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const V3 = (x, y, z) => new THREE.Vector3(x, y, z || 0);
      const std = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.45, metalness: 0.03 }, o || {}));
      const ghost = (c, op, o) => std(c, Object.assign({ transparent: true, opacity: op, depthWrite: false, roughness: 0.25 }, o || {}));
      const tube = (pts, r, m, seg, closed) => new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, !!closed), seg || 40, r, 10, !!closed), m);
      const LS = L2(); if (!LS) return {};
      const click = (sel) => { const b = document.querySelector(sel); if (b) b.click(); };

      /* ---------- ⚡ 신경 신호 ---------- */
      const NG = new THREE.Group(); root.add(NG);
      const X = (u) => (u - 385) / 62;
      const spinal = new THREE.Mesh(new THREE.BoxGeometry(X(432) - X(296), 1.5, 1.8), ghost(0x94a3b8, 0.22)); spinal.position.set((X(296) + X(432)) / 2, 0, 0); NG.add(spinal);
      const neuron = (u0, u1, col, sx, sCol) => { const g = new THREE.Group(); g.add(tube([V3(X(u0), 0, 0), V3(X(u1), 0, 0)], 0.1, ctx.mats.organic(col), 20)); const so = new THREE.Mesh(new THREE.SphereGeometry(0.28, 28, 20), ctx.mats.organic(sCol)); so.position.set(X(sx), 0.5, 0); g.add(so); g.add(tube([V3(X(sx), 0.25, 0), V3(X(sx), 0, 0)], 0.05, std(col), 6)); NG.add(g); return so; };
      const sen = neuron(100, 300, 0x2563eb, 230, 0x3b82f6), asn = neuron(324, 408, 0x7c3aed, 366, 0x8b5cf6), mot = neuron(440, 646, 0xea580c, 490, 0xf97316);
      const syn = [316, 432].map((u) => { const s = new THREE.Mesh(new THREE.SphereGeometry(0.17, 18, 12), std(0xffffff)); s.position.set(X(u), 0, 0); NG.add(s); return s; });
      const finger = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.7, 8, 20), ctx.mats.organic(0xe8b890, { extra: { roughness: 0.55 } })); finger.rotation.z = Math.PI / 2; finger.position.set(X(52), 0.1, 0); NG.add(finger);
      const thorn = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.7, 20), ctx.mats.plastic(0x2f7a38, { roughness: 0.35 })); thorn.position.set(X(52), -0.95, 0); NG.add(thorn);
      const muscle = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 24), ctx.mats.organic(0xc83a3a, { extra: { bumpMap: ctx.mats.tex('fabric'), bumpScale: 0.02 } })); muscle.position.set(X(718), 0, 0); NG.add(muscle);
      const pulse = new THREE.Mesh(new THREE.SphereGeometry(0.2, 18, 12), new THREE.MeshBasicMaterial({ color: 0xffe27a })); NG.add(pulse); ctx.halo(pulse, 0xffe27a, 1.1, 0.7);   // 신호 빛
      const others = [['심장', 0xd7263d, -3.8], ['위', 0xe8918a, 0], ['다리 근육', 0xc77a5a, 3.8]].map(([n, c, x]) => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.42, 20, 14), ghost(c, 0.55)); m.position.set(x, -1.0, 2.4); NG.add(m); const l = label(n + ' · 연결 없음 → 반응 없음', m, { offset: [0, -0.7, 0], size: 12 }); return { m, l }; });
      const NL = [label('감각 뉴런', sen, { offset: [0, 0.6, 0], color: 'rgba(37,99,235,.92)' }), label('연합 뉴런', asn, { offset: [0, 0.6, 0], color: 'rgba(124,58,237,.92)' }), label('운동 뉴런', mot, { offset: [0, 0.6, 0], color: 'rgba(234,88,12,.92)' }),
        label('척수 (중추)', spinal, { offset: [0, -1.0, 0.5] }), label('시냅스', syn[0], { offset: [0, -0.5, 0] }), label('가시', thorn, { offset: [0.4, -0.5, 0] }), label('', muscle, { offset: [0, -1.5, 0] }), label('', NG, { offset: [0, 2.6, 0], color: 'rgba(40,50,80,.92)', size: 14 })];

      /* ---------- 🩸 호르몬 신호 ---------- */
      const HG = new THREE.Group(); root.add(HG);
      const HL = LS.HL, S2 = 62;
      const loopPt = (phi, off) => { const p = LS.LOOP ? LS.LOOP.at(phi) : { x: HL.cx, y: HL.cy, nx: 0, ny: -1 }; return V3((p.x - HL.cx) / S2 + (off ? p.nx * off : 0), 0, (p.y - HL.cy) / S2 + (off ? p.ny * off : 0)); };
      const lp = []; for (let k = 0; k < 96; k++) lp.push(loopPt(k / 96));
      const vessel = tube(lp, 0.42, ghost(0xff8a80, 0.32, { side: THREE.DoubleSide }), 220, true); vessel.renderOrder = 2; HG.add(vessel);
      const gp = loopPt(0, -1.7), gland = new THREE.Mesh(new THREE.SphereGeometry(0.62, 32, 24), ctx.mats.organic(0xa04cb4)); gland.position.copy(gp); HG.add(gland);
      const cells = LS.HCELLS.map((c, i) => {
        const p = LS.LOOP.at(c.phi), pos = V3((p.x - HL.cx) / S2 + p.nx * HL.off / S2 * 1.0, 0, (p.y - HL.cy) / S2 + p.ny * HL.off / S2 * 1.0);
        const m = std(0x8fb4e8, { roughness: 0.4, emissive: 0x000000 }), g = new THREE.Group(); g.position.copy(pos); g.add(new THREE.Mesh(new THREE.SphereGeometry(0.5, 28, 18), m)); const nu = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 10), std(0x3a5a96)); nu.position.set(0.05, 0.12, 0.05); g.add(nu);
        const dir = V3(-p.nx, 0, -p.ny).normalize();
        const geo = c.shape === 'cup' ? new THREE.ConeGeometry(0.2, 0.36, 18, 1, true) : c.shape === 'sq' ? new THREE.BoxGeometry(0.3, 0.3, 0.3) : c.shape === 'tri' ? new THREE.TetrahedronGeometry(0.25) : new THREE.OctahedronGeometry(0.22);
        const rm = std(c.target ? 0x33c46e : 0x8a8f9c, { side: THREE.DoubleSide }); const r = new THREE.Mesh(geo, rm); if (c.shape === 'cup') r.quaternion.setFromUnitVectors(V3(0, 1, 0), dir); r.position.copy(dir.clone().multiplyScalar(0.62)); r.visible = false; g.add(r);
        HG.add(g); return { g, m, r, pos, dir, c, lab: label(c.name, g, { offset: [0, 0.85, 0], size: 14 }) };
      });
      const NP = 20, hI = new THREE.InstancedMesh(new THREE.ConeGeometry(0.1, 0.24, 12), std(0xff8a3d, { emissive: 0x7a3000, emissiveIntensity: 0.5 }), NP); HG.add(hI);
      const NR = 16, rI = new THREE.InstancedMesh(new THREE.SphereGeometry(0.11, 10, 8), std(0xe5483f, { roughness: 0.4 }), NR); HG.add(rI);
      const D = new THREE.Object3D();
      const HLab = [label('내분비샘 (호르몬 분비)', gland, { offset: [0, 1.0, 0], color: 'rgba(130,60,170,.92)' }), label('혈관 (혈액이 돌아요)', HG, { offset: [0, -0.8, 3.0], size: 12 }), label('', HG, { offset: [0, 0.2, 0], size: 15, color: 'rgba(40,50,80,.92)' })];

      /* 가짜 상태: ▶ 재생(2D와 같은 규칙의 한 번의 신호) */
      let pp = 0, scene = '', lastInfo = '';
      const T_NEU = 2.2, TH = 130;
      const sceneOf = () => { const m = L2().S.mode; return m === 'neu' ? 'neu' : 'hor'; };
      const pl = controls.player({ duration: 8, loop: true, autoplay: false, label: '신호 재생', phases: [[0, '신호 출발'], [0.35, '전달 중'], [0.8, '반응']], onFrame(p) { pp = p; } });
      const active = () => pl.playing || pl.p > 0;
      function synthHor(t) { // t: 모형 초 (0 ~ TH)
        const parts = [], cells = LS.HCELLS.map(() => ({ act: 0, nope: 0 })); let first = null; const bound = LS.HCELLS.map(() => 0), reacted = LS.HCELLS.map(() => null);
        for (let k = 0; k < 14; k++) {
          let phi = -k * 0.0045 + t / LS.HLOOP_SEC, state = 'flow', cell = -1, f = 0;
          for (let n = 0; n < 3 && state === 'flow'; n++) LS.HCELLS.forEach((c, i) => { const q = c.phi + n; if (state === 'flow' && c.target && -k * 0.0045 < q && phi >= q && bound[i] < 4) { state = 'dock'; cell = i; f = 1; bound[i]++; const rt = (q + k * 0.0045) * LS.HLOOP_SEC; if (reacted[i] == null || rt < reacted[i]) reacted[i] = rt; } });
          parts.push({ phi, state, cell, f });
        }
        reacted.forEach((rt, i) => { if (rt != null && t >= rt) { cells[i].act = 1; if (first == null || rt < first) first = rt; } });
        const rbc = Array.from({ length: NR }, (_, i) => ({ phi: (i / NR + t / LS.HLOOP_SEC * 0.9) % 1 }));
        return { run: true, t, particles: parts, cells, first, rbc, showR: L2().S.hor.showR };
      }
      function setScene(sc) { scene = sc; NG.visible = sc === 'neu'; HG.visible = sc === 'hor'; NL.forEach((l) => l.show(sc === 'neu')); others.forEach((o) => o.l.show(sc === 'neu')); HLab.forEach((l) => l.show(sc === 'hor')); cells.forEach((c) => c.lab.show(sc === 'hor')); lastInfo = ''; }
      const setI = (h) => { if (h !== lastInfo) { lastInfo = h; info(h); } };
      // 3D 단계는 ⚡ 신경 신호(1단계)예요. 호르몬 신호 단계는 2D라서 호르몬 단추는 두지 않아요.
      controls.button('🌵 가시에 찔리기', () => { const L = L2(); if (L && L.S.mode !== 'neu') L.setScene('neu'); click('#bPoke'); });

      return {
        update(dt, t) {
          const L = L2(); if (!L) return; const sc = sceneOf(); if (sc !== scene) setScene(sc);
          if (sc === 'neu') {
            const n = L.S.neu, ap = active(), p = ap ? clamp(pp / 0.7, 0, 1) : n.p, run = ap ? pp < 0.7 : n.run, done = ap ? pp >= 0.7 : n.done;
            const musc = ap ? (pp >= 0.68 ? 1 : 0) : n.musc;
            const u = L.neuU(p); pulse.visible = ap ? pp > 0 && pp < 0.7 : n.run; pulse.position.set(X(u), 0, 0); pulse.scale.setScalar(1 + 0.2 * Math.sin(t * 30));
            muscle.scale.set(lerp(60, 42, musc) / 62, lerp(26, 38, musc) / 62 * 1.4, 0.7 + 0.2 * musc); muscle.material.color.setHex(musc > 0.5 ? 0xdc2626 : 0xc43d3d);
            finger.position.x = X(52) - musc * 0.25; NL[6].set(musc > 0.5 ? '팔 근육 수축!' : '팔 근육');
            NL[7].set('⏱ 반응 시간 ' + (0.05 * p).toFixed(3) + ' s (목표 0.050 s, 천천히 보여 줘요)'); NL[7].show(true);
            [sen, asn, mot].forEach((s, i) => { const on = run && p > [0.0, 0.36, 0.62][i] && p < [0.36, 0.62, 1][i]; s.material.emissive.setHex(on ? 0x886600 : 0); s.material.emissiveIntensity = on ? 0.8 : 0; });
            setI('<b>⚡ 신경 신호</b>: 연결된 한 곳에만, 아주 빠르게 전달돼요.<br>가시 → 감각 뉴런 → 연합 뉴런(척수) → 운동 뉴런 → 팔 근육 (약 0.05초)<br>' + (done ? '✅ 신경 신호가 약 0.05초 만에 팔 근육 한 곳에만 전달됐어요. 심장·위·다리 근육은 연결이 없어 반응이 없어요.' : '🌵 가시에 찔리기를 눌러 신호를 따라가 봐요. (▶ 신호 재생은 미리 보기예요)'));
          } else {
            const h = active() ? synthHor(pp * TH) : L.S.hor;
            const hp = h.particles, vis = L.S.hor.showR || active() && L.S.hor.showR;
            cells.forEach((c, i) => { const cs = h.cells[i]; c.r.visible = !!L.S.hor.showR; c.m.emissive.setHex(cs.act > 0.05 ? 0x33e07a : cs.nope > 0.05 ? 0xcc3333 : 0); c.m.emissiveIntensity = cs.act > 0.05 ? 0.6 * cs.act : cs.nope > 0.05 ? 0.4 * cs.nope : 0; c.g.scale.setScalar(1 + 0.08 * (cs.act || 0)); c.lab.set(c.c.name + (cs.act > 0.5 ? ' 반응!' : '') + (L.S.hor.showR ? (c.c.target ? ' (표적)' : '') : '')); });
            for (let i = 0; i < NP; i++) {
              const q = hp[i];
              if (!q) { D.position.set(0, -50, 0); D.scale.setScalar(0.001); }
              else if (q.state === 'dock' && q.cell >= 0) { const c = cells[q.cell]; D.position.copy(c.pos).addScaledVector(c.dir, 0.95 - 0.3 * q.f).add(V3((i % 3 - 1) * 0.09, 0, (i % 2) * 0.09)); D.scale.setScalar(1); D.rotation.set(0, 0, 0); }
              else { const p = loopPt(q.phi); D.position.set(p.x, (i % 3 - 1) * 0.08, p.z + (i % 4 - 1.5) * 0.06); D.scale.setScalar(q.phi < 0 ? 0.001 : 1); D.rotation.set(0, 0, -Math.PI / 2); }
              D.updateMatrix(); hI.setMatrixAt(i, D.matrix);
            }
            hI.instanceMatrix.needsUpdate = true;
            for (let i = 0; i < NR; i++) { const b = h.rbc[i]; if (!b) continue; const p = loopPt(b.phi); D.position.set(p.x, 0.05, p.z + ((i % 3) - 1) * 0.1); D.rotation.set(0, 0, 0); D.scale.set(1, 0.6, 1); D.updateMatrix(); rI.setMatrixAt(i, D.matrix); }
            rI.instanceMatrix.needsUpdate = true;
            HLab[2].set(h.run || h.t > 0 ? '⏱ 호르몬 분비 후 ' + h.t.toFixed(0) + ' 초(모형 시간)' + (h.first != null ? ' · 첫 반응 ' + h.first.toFixed(0) + ' 초' : '') : '🧪 호르몬 분비를 눌러요');
            setI('<b>🩸 호르몬 신호</b>: 호르몬이 혈액을 타고 온몸을 돌다가 <b>수용체가 맞는 표적 세포(②·④)</b>에만 결합해 반응해요. 반응은 느리지만 넓고 오래 가요.<br>🔬 수용체 보기로 수용체 모양을 확인해 봐요 (초록 컵 = 호르몬 X의 수용체).');
          }
        },
        sync() { scene = ''; },
      };
    },
  });
})();
