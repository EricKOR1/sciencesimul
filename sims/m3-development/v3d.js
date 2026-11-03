/* m3-development · 3D 수정과 난할
   정자와 난자가 만나 수정란이 되고, 수정란은 빠르게 세포분열(난할)해요. 세포 수는 늘어나지만 세포 하나의 크기는 작아져서 배 전체 크기는 거의 그대로예요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHN = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  /* 2D 차시와 같은 내용: 수정(정자와 난자의 만남) → 난할(1 → 2 → 4 → 8 → 16 → 32세포, 전체 크기는 그대로) */
  const ST = [
    ['정자와 난자의 만남', '정자가 난자를 향해 헤엄쳐요. 정자 한 개의 핵과 난자의 핵이 합쳐져요.', 0],
    ['수정란', '정자의 핵과 난자의 핵이 합쳐져 수정란(세포 1개)이 돼요.', 1],
    ['2세포', '난할: 수정란이 둘로 나뉘어요.', 2],
    ['4세포', '세포 수는 2배씩 늘지만 각 세포는 자랄 틈 없이 다시 나뉘어요.', 4],
    ['8세포', '세포 하나의 크기는 점점 작아져요.', 8],
    ['16세포', '세포 수는 늘어도 전체 크기는 그대로예요.', 16],
    ['32세포', '세포 32개! 세포 하나의 부피는 수정란의 1/32이고, 전체 부피는 그대로예요.', 32],
  ];
  window.SciSim3D.attach({
    host: '.stage-card',
    title: '수정과 난할 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: PHN ? 12.5 : 9.5, theta: 0.3, phi: 1.3, min: 4, max: 20, target: [0.4, 0, 0] },
    autoRotate: 0.18,
    levels: [0, 1],           // 수정 · 난할 단계에서 3D로 시작해요. 그래프 읽기·점토 모형 순서 놓기는 2D 화면에서 해요
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const V3 = THREE.Vector3;
      const R = 2.1;
      let st = 0, names = true, cur = 1, tnow = 0, act = -9, lastAct = -9, ign = false;
      const sm = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.4, metalness: 0 }, o || {}));
      /* 껍질 */
      const zona = new THREE.Mesh(new THREE.SphereGeometry(R * 1.2, 56, 40), sm(0xfde68a, { transparent: true, opacity: 0.16, roughness: 0.2, depthWrite: false })); root.add(zona);
      /* 세포 풀 */
      const POOL = 64, cellG = new THREE.SphereGeometry(1, 28, 20), nucG = new THREE.SphereGeometry(1, 16, 12);
      const cm = [], cells = [];
      for (let i = 0; i < POOL; i++) {
        const body = new THREE.Mesh(cellG, sm(0xfcd9a8, { transparent: true, opacity: 0.82, roughness: 0.35 })); const nuc = new THREE.Mesh(nucG, sm(0xb45309, { roughness: 0.5 })); body.add(nuc); root.add(body);
        cells.push({ m: body, nuc, p: new V3(), tp: new V3(), r: 0.01, tr: 0.01, par: -1 });
      }
      /* 배치 계산: 반지름 r인 구 n개를 큰 구 안에 서로 겹치지 않게 (반발 계산) */
      function layout(n, seed) {
        const r = n === 1 ? R : Math.min(R, R * 0.93 / Math.cbrt(n) * (n <= 2 ? 1.18 : 1.1));
        const pts = [];
        if (n === 1) pts.push(new V3());
        else if (n === 2) pts.push(new V3(-r, 0, 0), new V3(r, 0, 0));
        else if (n === 4) pts.push(new V3(-r * 0.6, r * 0.6, 0), new V3(r * 0.6, r * 0.6, 0), new V3(0, -r * 0.5, r * 0.6), new V3(0, -r * 0.5, -r * 0.6));
        else if (n === 8) for (let i = 0; i < 8; i++) pts.push(new V3(i & 1 ? 0.66 * r : -0.66 * r, i & 2 ? 0.66 * r : -0.66 * r, i & 4 ? 0.66 * r : -0.66 * r));
        else if (false) {
          const rr = R * 0.86, ring = 52; for (let i = 0; i < ring; i++) { const y = 1 - (i + 0.5) / ring * 2, a = i * 2.39996; const q = Math.sqrt(1 - y * y); pts.push(new V3(Math.cos(a) * q, y, Math.sin(a) * q).multiplyScalar(rr)); }
          for (let i = 0; i < 12; i++) { const y = 1 - (i + 0.5) / 12 * 2, a = i * 2.39996, q = Math.sqrt(1 - y * y); pts.push(new V3(Math.cos(a) * q * 0.55 - 0.2, 0.9 + y * 0.45 - 0.2, Math.sin(a) * q * 0.55).multiplyScalar(1.0).setX(Math.cos(a) * q * 0.62).setZ(Math.sin(a) * q * 0.62).add(new V3(0, 0.8, 0)).multiplyScalar(0.95)); }
          return { pts, r: 0.5 };
        } else { // 16, 32: 구 안에서 서로 밀어내기
          let s = seed * 9301 + 49297; const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
          for (let i = 0; i < n; i++) pts.push(new V3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize().multiplyScalar(R * 0.8 * Math.cbrt(rnd())));
          for (let it = 0; it < 220; it++) { for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { const d = pts[i].clone().sub(pts[j]), l = d.length() || 1e-3; if (l < 2 * r) { d.multiplyScalar((2 * r - l) / l * 0.25); pts[i].add(d); pts[j].sub(d); } } pts.forEach((p) => { const l = p.length(); if (l > R - r) p.multiplyScalar((R - r) / l); }); }
        }
        return { pts, r };
      }
      const LAY = {}; [1, 2, 4, 8, 16, 32].forEach((n, i) => { LAY[n] = layout(n, i + 1); });
      function apply() {
        const n = ST[st][2] || 1, key = st === 0 ? 1 : n, L = LAY[key];
        const prevN = cur; cur = key;
        cells.forEach((c, i) => {
          if (i < L.pts.length) {
            if (c.r < 0.03 && i > 0) { c.p.copy(cells[Math.floor(i * prevN / L.pts.length)].p); c.r = 0.05; }
            c.tp.copy(L.pts[i]); c.tr = L.r * 0.98;
          } else c.tr = 0.0;
        });
        const nn = ST[st][2];
        info('<b>' + ST[st][0] + '</b><br>' + ST[st][1] + (st >= 2 ? '<br>세포 수 <b>' + nn + '개</b> · 세포 하나의 부피 <b>수정란의 1/' + nn + '</b> · 전체 부피는 <b>그대로</b>(수정란 = 1)' : ''));
        labEgg.set(st === 0 ? '난자' : st === 1 ? '수정란' : nn + '세포'); labZ.show(names);
      }
      /* 정자 */
      const NSP = 7, tails = new THREE.InstancedMesh(new THREE.SphereGeometry(0.045, 8, 6), sm(0xe2e8f0, { roughness: 0.5 }), NSP * 12), heads = new THREE.InstancedMesh(new THREE.SphereGeometry(0.14, 14, 10), sm(0x93c5fd, { roughness: 0.3 }), NSP);
      root.add(tails, heads); heads.visible = tails.visible = true;
      const sp = []; for (let i = 0; i < NSP; i++) { const a = (i - 3) * 0.28; sp.push({ a, ph: i * 1.3, sp: 0.9 + (i % 3) * 0.15, off: i * 0.13 }); }
      const dm = new THREE.Object3D();
      const labEgg = label('', [R * 1.05, R * 0.95, 0], { size: 13, color: 'rgba(120,53,15,.92)' }), labZ = label('', [-R * 1.1, -R * 1.0, 0], { size: 12, color: 'rgba(113,63,18,.85)' }), labS = label('정자', [-5.0, 0.9, 0], { size: 12, color: 'rgba(30,64,175,.9)' }), labZ0 = null;
      const nb = controls.button('이름 ✓', () => { names = !names; nb.textContent = '이름 ' + (names ? '✓' : '✕'); apply(); }); nb.classList.add('on');
      /* ▶ 재생: 수정(정자 출발) · 난할(분열시키기) — 2D 화면의 버튼과 같이 움직여요 */
      const pF = controls.player({ duration: 8, loop: true, label: '수정', phases: [[0, '정자 출발'], [0.3, '난자에 다가가요'], [0.6, '핵이 다가가요'], [0.85, '수정란']], onFrame() { if (!ign) act = tnow; } });
      const pC = controls.player({ duration: 14, loop: true, label: '난할', phases: [[0, '수정란'], [1 / 6, '2세포'], [2 / 6, '4세포'], [3 / 6, '8세포'], [4 / 6, '16세포'], [5 / 6, '32세포']], onFrame() { if (!ign) act = tnow; } });
      const rows = Array.from(nb.parentNode.querySelectorAll('.v3-player')), rowF = rows[0], rowC = rows[1];
      let mode = 'fert'; rowC.style.display = 'none';
      const click2 = (q) => { const b = document.querySelector(q); if (b) b.click(); };
      const click = (id) => { const b = document.getElementById(id); if (b && !b.disabled) b.click(); };
      const FTP = { idle: 0, swim: 0.12, enter: 0.3, zoom: 0.45, approach: 0.62, fuse: 0.8, done: 0.98 };
      cells[0].p.set(0, 0, 0); apply();
      cells.forEach((c) => { c.r = c.tr; c.p.copy(c.tp); });
      return {
        update(dt, t) {
          tnow += dt;
          const L = ctx.lesson();
          if (L) {
            const sc = L.scene, fert = sc === 'fert';
            if (fert !== (mode === 'fert')) { mode = fert ? 'fert' : 'cleave'; rowF.style.display = fert ? '' : 'none'; rowC.style.display = fert ? 'none' : ''; }
            const driving = tnow - act < 1.2;
            if (fert) {
              const ph = L.FT.ph || 'idle', p2 = FTP[ph] != null ? FTP[ph] : 0;
              if (driving && pF.playing && tnow - lastAct > 0.8) {
                if (ph === 'idle') { lastAct = tnow; click('goBtn'); } else if (ph === 'done' && pF.p < 0.05) { lastAct = tnow; click('resetBtn'); }
              } else if (!driving && !pF.playing && Math.abs(pF.p - p2) > 0.02) { ign = true; pF.set(p2); ign = false; }
              if (ph === 'done' && pF.playing && pF.p < 0.9) { /* 끝나면 진행 막대도 끝으로 */ }
              const ns = ph === 'fuse' || ph === 'done' ? 1 : 0; if (ns !== st) { st = ns; apply(); }
            } else {
              const g = sc === 'graph' ? L.G.n : L.CL.g, N = 6;
              const want = Math.min(5, Math.floor(pC.p * N + 1e-6));
              if (driving && want !== g && tnow - lastAct > 0.9) {
                lastAct = tnow;
                if (sc === 'graph') click2('#nSeg button[data-n="' + want + '"]'); else if (want > g) { if (!L.CL.busy) click('divBtn'); } else if (want === 0) click('resetBtn');
              } else if (!driving && !pC.playing && Math.floor(pC.p * N + 1e-6) !== g) { ign = true; pC.set((g + 0.5) / N); ign = false; }
              const ns = 1 + g; if (ns !== st) { st = ns; apply(); }
            }
          }
          const k = 1 - Math.exp(-dt * 5);
          cells.forEach((c, i) => {
            c.p.lerp(c.tp, k); c.r += (c.tr - c.r) * k; c.m.position.copy(c.p); c.m.scale.setScalar(Math.max(0.0001, c.r)); c.m.visible = c.r > 0.02;
            c.nuc.scale.setScalar(st === 0 ? 0.42 : st === 1 ? 0.3 : Math.max(0.2, 0.35 * (st === 7 ? 0.9 : 1))); c.nuc.position.set(0.0, 0.0, 0.0);
            c.m.material.color.set(i < 52 || st < 7 ? 0xfcd9a8 : 0xf9a8d4);
          });
          zona.scale.setScalar(st === 0 ? 1 : 0.97 + Math.sin(t) * 0.004);
          /* 정자 */
          const show = st === 0; heads.visible = tails.visible = show; labS.show(show && names);
          if (show) {
            sp.forEach((s, i) => {
              const u = Math.min(1, ((t * 0.16 * s.sp + s.off) % 1.25) / 1.0), tx = -R * 1.28, dir = new V3(Math.cos(s.a), Math.sin(s.a) * 0.6, Math.sin(s.a * 2) * 0.5);
              const start = new V3(-6.2, s.a * 3.2, Math.sin(s.ph) * 1.4), end = new V3(-R * 1.22, s.a * 1.7, Math.sin(s.ph) * 0.9), pos = start.clone().lerp(end, Math.min(1, u)); pos.y += Math.sin(t * 5 + s.ph) * 0.06;
              dm.position.copy(pos); dm.scale.set(1.5, 0.9, 0.9); dm.rotation.set(0, 0, 0); dm.updateMatrix(); heads.setMatrixAt(i, dm.matrix);
              for (let j = 0; j < 12; j++) { dm.position.set(pos.x - 0.16 - j * 0.1, pos.y + Math.sin(t * 9 - j * 0.7 + s.ph) * 0.06 * (j * 0.12 + 0.3), pos.z); dm.scale.setScalar(1 - j * 0.05); dm.rotation.set(0, 0, 0); dm.updateMatrix(); tails.setMatrixAt(i * 12 + j, dm.matrix); }
              if (i === 0) labS.obj = [pos.x, pos.y + 0.5, pos.z];
            });
            heads.instanceMatrix.needsUpdate = tails.instanceMatrix.needsUpdate = true;
          }
        },
      };
    },
  });
})();
