/* h1-translation · 3D 번역 (리보솜 · mRNA · tRNA · 아미노산 사슬)
   리보솜이 mRNA의 코돈을 3염기씩 읽고, 안티코돈이 맞는 tRNA가 아미노산을 가져와 사슬을 늘려 가요.
   종결 코돈(UAA)을 만나면 완성된 사슬이 떨어져 나가요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHN = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const SEQ = ['AUG', 'GAA', 'GUG', 'CCA', 'UGG', 'UAA'];
  const AA = ['Met', 'Glu', 'Val', 'Pro', 'Trp', null];
  const AACOL = { Met: 0xffb347, Glu: 0xf0556a, Val: 0x6fd36b, Pro: 0x4aa3ff, Trp: 0xb26bff };
  const BASE = { A: 0x6fd36b, U: 0xf0556a, G: 0xffd34d, C: 0x4aa3ff };
  const COMP = { A: 'U', U: 'A', G: 'C', C: 'G' };
  const D = 4.4, NCY = 4, W = 1.25;

  window.SciSim3D.attach({
    title: '번역: 리보솜과 tRNA 3D',
    camera: { dist: PHN ? 17 : 12.5, theta: 0.28, phi: 1.3, target: [0, 1.0, 0], min: 6, max: 24 },
    autoRotate: 0,
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const std = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.4, metalness: 0.05 }, o || {}));
      let T = 0, play = true, names = true;
      const sm = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
      // 리보솜
      const big = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), std(0xc9a0ff, { transparent: true, opacity: 0.32, depthWrite: false, roughness: 0.3 })); big.scale.set(2.9, 1.35, 1.5); big.position.set(0, 1.55, 0);
      const small = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), std(0xff9fc0, { transparent: true, opacity: 0.38, depthWrite: false, roughness: 0.3 })); small.scale.set(2.5, 0.72, 1.35); small.position.set(0, -0.55, 0);
      root.add(big, small);
      label('리보솜 큰 단위체', big, { offset: [-1.6, 1.15, 0.8], size: 12 }); label('작은 단위체', small, { offset: [1.9, -0.7, 0.7], size: 12 });
      // mRNA
      const NM = 24, back = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 30, 8), std(0xe7ebf5)); back.rotation.z = Math.PI / 2; back.position.set(0, 0, 0); root.add(back);
      const bases = []; const bg = new THREE.SphereGeometry(0.17, 20, 14);
      SEQ.forEach((cd, k) => cd.split('').forEach((b, j) => { const m = new THREE.Mesh(bg, std(BASE[b], { roughness: 0.3 })); root.add(m); bases.push({ m, k, j }); }));
      // 앞뒤 가짜 염기(5′ UTR / 3′ 꼬리)로 mRNA가 계속 이어진 느낌
      const pad = []; for (let i = 0; i < 8; i++) { const m = new THREE.Mesh(bg, std(0x8a93aa, { roughness: 0.5 })); root.add(m); pad.push(m); }
      label('mRNA', [-5.6, 0.0, 0], { size: 12 });
      // tRNA
      function mkT(k) {
        const g = new THREE.Group(); const cd = SEQ[k];
        cd.split('').forEach((b, j) => { const s = new THREE.Mesh(bg, std(BASE[COMP[b]], { roughness: 0.3 })); s.scale.setScalar(0.92); s.position.set((j - 1) * 0.34, 0.44, 0); g.add(s); });
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.25, 10), std(0x35c9b5)); stem.position.set(0, 1.12, 0); g.add(stem);
        const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.8, 10), std(0x35c9b5)); bar.rotation.z = Math.PI / 2; bar.position.set(0, 1.55, 0); g.add(bar);
        [-0.4, 0.4].forEach((x) => { const s = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 12), std(0x35c9b5)); s.position.set(x, 1.55, 0); g.add(s); });
        const aa = new THREE.Mesh(new THREE.SphereGeometry(0.3, 28, 20), std(AACOL[AA[k]], { roughness: 0.25 })); aa.position.set(0, 1.95, 0); g.add(aa); g.userData.aa = aa;
        root.add(g); return g;
      }
      const tr = SEQ.slice(0, NCY + 1).map((_, k) => mkT(k));
      const beads = AA.slice(0, NCY + 1).map((a) => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.3, 28, 20), std(AACOL[a], { roughness: 0.25 })); root.add(m); return m; });
      let chainTube = null; const tubeMat = std(0xdfe6f5, { roughness: 0.5 });
      const lP = label('P 자리', [-0.6, -1.5, 0], { size: 12, color: 'rgba(60,110,200,.9)' }), lA = label('A 자리', [0.6, -1.5, 0], { size: 12, color: 'rgba(60,110,200,.9)' });
      const lCod = label('', [0.6, -2.2, 0], { color: 'rgba(255,211,77,.92)' }); lCod.el.style.color = '#1b2333';
      const lChain = label('아미노산 사슬', [-2.8, 3.4, 0], { color: 'rgba(40,120,60,.92)' });
      const lStop = label('종결 코돈 UAA: 사슬이 떨어져요', [0.6, -2.2, 0], { color: 'rgba(220,60,60,.92)' });
      function xk(k, c, s) { return -0.6 + (k - c) * W - W * s; }
      function setPos(c, ph, endP) {
        const s = sm(2.0, 3.4, ph), arr = sm(0.0, 1.2, ph), exitP = sm(3.4, 4.4, ph);
        // mRNA 염기
        bases.forEach((b) => { b.m.position.set(xk(b.k, c, s) + (b.j - 1) * 0.34, 0.27 - 0.0, 0); });
        pad.forEach((m, i) => { const left = i < 4; const kk = left ? -(i + 1) : SEQ.length + (i - 4); m.position.set(xk(kk, c, s) + 0.0, 0.27, 0); m.visible = true; m.position.x += (i % 2) * 0.17 - 0.3 + (left ? 0 : 0); });
        // tRNA
        tr.forEach((g, k) => {
          let vis = k === c || k === c + 1, x = xk(k, c, s), y = 0, sc = 1;
          if (k === c + 1) { const e = 1 - arr; x += e * 3.2; y = e * 3.6; }
          if (k === c) { y = exitP * 3.0; x -= exitP * 1.5; sc = 1 - exitP; }
          g.visible = vis && sc > 0.02; g.scale.setScalar(Math.max(0.001, sc)); g.position.set(x, y, 0);
          g.userData.aa.visible = false;
        });
        g2();
        function g2() {
          // 아미노산 사슬: 가장 새로 붙은 구슬(앵커)에서 왼쪽 위로 이어져요
          const bond = sm(1.2, 2.0, ph), mNew = ph >= 1.2 ? c + 1 : c, mOld = c;
          const anchorOf = (m) => { const x = xk(m, c, s) , y = 1.95; return new THREE.Vector3(x, y, 0); };
          const pts = [];
          for (let j = 0; j <= Math.min(c + 1, NCY); j++) {
            const inChain = j <= c || (j === c + 1 && ph >= 1.2);
            if (!inChain) { beads[j].position.copy(anchorOf(j)); beads[j].position.x += (j === c + 1) ? (1 - arr) * 3.2 : 0; beads[j].position.y += (j === c + 1) ? (1 - arr) * 3.6 : 0; beads[j].visible = true; continue; }
            const off = (m) => { const d = m - j; return new THREE.Vector3(-0.62 * d, 0.1 * d + Math.sin(d * 1.1) * 0.22, Math.cos(d * 1.1) * 0.35); };
            const aOld = anchorOf(mOld).add(off(mOld)), aNew = anchorOf(mNew).add(off(mNew));
            beads[j].position.copy(aOld.lerp(aNew, ph >= 1.2 ? bond : 0)); beads[j].visible = true;
            if (j === c + 1) beads[j].position.copy(anchorOf(c + 1).add(new THREE.Vector3(0, 0, 0)).lerp(anchorOf(mNew).add(off(mNew)), bond));
            pts.push(beads[j].position.clone());
          }
          for (let j = c + 2; j <= NCY; j++) beads[j].visible = false;
          if (chainTube) { root.remove(chainTube); chainTube.geometry.dispose(); chainTube = null; }
          const q = [];
          for (let j = 0; j <= Math.min(c + 1, NCY); j++) if (beads[j].visible && (j <= c || ph >= 1.2)) q.push(beads[j].position.clone());
          if (q.length >= 2) { chainTube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(q), 40, 0.07, 8), tubeMat); root.add(chainTube); }
        }
        lP.obj = [-0.6, -1.3, 0]; lA.obj = [0.6, -1.3, 0];
        lCod.set(ph < 1.2 ? SEQ[c + 1] + ' 코돈에 맞는 tRNA가 와요' : AA[c + 1] ? '코돈 ' + SEQ[c + 1] + ' → 아미노산 ' + AA[c + 1] : '');
        lCod.show(true); lStop.show(false); lChain.show(c >= 1 || ph > 1.5); lChain.obj = [-2.4 - 0.2 * c, 2.9 + 0.2 * c, 0];
        names ? (lP.show(true), lA.show(true)) : (lP.show(false), lA.show(false));
        info(ph < 1.2 ? '<b>① tRNA 도착</b><br>코돈 <b>' + SEQ[c + 1] + '</b>과 안티코돈이 맞는 tRNA가 A 자리로 들어와요.' : ph < 2.0 ? '<b>② 결합</b><br>아미노산이 사슬에 펩타이드 결합으로 이어져요.' : '<b>③ 이동</b><br>리보솜이 코돈 한 칸을 건너가고, 빈 tRNA는 떠나요.');
      }
      function setEnd(te) {
        // 마지막: 종결 코돈 → 사슬 방출
        const c = NCY, s = 1, ph = 4.4;
        setPos(c, 4.0, true);
        const rel = sm(0.6, 3.0, te);
        for (let j = 0; j <= NCY; j++) { beads[j].position.y += rel * 2.4; beads[j].position.x -= rel * 1.4; }
        if (chainTube) { chainTube.position.set(-rel * 1.4, rel * 2.4, 0); }
        lCod.show(false); lStop.show(true); lChain.obj = [-3.2 - rel * 1.4, 3.2 + rel * 2.4, 0];
        info('<b>④ 종결</b><br>종결 코돈 <b>UAA</b>에는 맞는 tRNA가 없어요. 사슬이 떨어져 나가 접히면 <b>단백질</b>이 돼요.');
      }
      const bP = controls.button('❚❚ 멈춤', () => { play = !play; bP.textContent = play ? '❚❚ 멈춤' : '▶ 재생'; });
      controls.button('↺ 처음부터', () => { T = 0; });
      const bN = controls.button('이름표 ✓', () => { names = !names; bN.classList.toggle('on', names); bN.textContent = '이름표 ' + (names ? '✓' : '✕'); }); bN.classList.add('on');
      const total = NCY * D, endLen = 5.5;
      function paint() { if (T < total) { const c = Math.floor(T / D), ph = T - c * D; setPos(c, ph); } else setEnd(T - total); }
      paint();
      return {
        update(dt) { if (play) { T += dt; if (T > total + endLen) T = 0; } paint(); },
        sync() {},
      };
    },
  });
})();
