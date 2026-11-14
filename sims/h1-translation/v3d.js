/* h1-translation · 3D 번역 (리보솜 · mRNA · tRNA · 아미노산 사슬)
   리보솜이 mRNA의 코돈을 3염기씩 읽고, 안티코돈이 맞는 tRNA가 아미노산을 가져와 사슬을 늘려 가요.
   종결 코돈(UAA)을 만나면 완성된 사슬이 떨어져 나가요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHN = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  /* 2D '단백질 합성'과 같은 mRNA: AUG GAA CCA UGG UAA (아미노산 4개 + 종결 코돈) */
  const SEQ = ['AUG', 'GAA', 'CCA', 'UGG', 'UAA'];
  const AA = ['Met', 'Glu', 'Pro', 'Trp', null];
  const AACOL = { Met: 0xffb347, Glu: 0xf0556a, Val: 0x6fd36b, Pro: 0x4aa3ff, Trp: 0xb26bff };
  const BASE = { A: 0x6fd36b, U: 0xf0556a, G: 0xffd34d, C: 0x4aa3ff };
  const COMP = { A: 'U', U: 'A', G: 'C', C: 'G' };
  const D = 4.4, NCY = 3, W = 1.25;

  window.SciSim3D.attach({
    title: '번역: 리보솜과 tRNA 3D',
    camera: { dist: PHN ? 12 : 10.5, theta: 0.1, phi: 1.4, target: [0, 1.1, 0], min: 6, max: 24 },
    levels: [2],   // 2단계(단백질 합성): 화면 아래 tRNA 단추로 2D의 tRNA 놓기(syAttempt)를 해요. 리보솜 장착 · 코돈표 · 변이 카드는 2D
    autoRotate: 0,
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const std = (c, o) => new THREE.MeshPhysicalMaterial(Object.assign({ color: c, roughness: 0.32, metalness: 0, clearcoat: 0.7, clearcoatRoughness: 0.15 }, o || {}));   // 매끈하고 윤기 나는 분자 모형
      let T = 0, play = true, names = true;
      const sm = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
      // 리보솜
      const big = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), ctx.mats.organic(0x9a6ae0, { opacity: 0.34, extra: { depthWrite: false } })); big.scale.set(2.9, 1.35, 1.5); big.position.set(0, 1.55, 0);
      const small = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), ctx.mats.organic(0xe87098, { opacity: 0.4, extra: { depthWrite: false } })); small.scale.set(2.5, 0.72, 1.35); small.position.set(0, -0.55, 0);
      root.add(big, small);
      label('리보솜 큰 단위체', big, { offset: [-1.6, 1.15, 0.8], size: 12 }); label('작은 단위체', small, { offset: [1.9, -0.7, 0.7], size: 12 });
      // mRNA
      const NM = 24, back = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 18, 8), std(0xe7ebf5)); back.rotation.z = Math.PI / 2; back.position.set(0, 0, 0); root.add(back);
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
      const bN = controls.button('이름표 ✓', () => { names = !names; bN.classList.toggle('on', names); bN.textContent = '이름표 ' + (names ? '✓' : '✕'); }); bN.classList.add('on');
      const total = NCY * D, endLen = 5.5;
      function paint() { if (T < total) { const c = Math.floor(T / D), ph = T - c * D; setPos(c, ph); } else setEnd(T - total); }
      let demoP = 0;
      const ctlEl = bN.parentElement, nPl = ctlEl.children.length;
      const pl = controls.player({
        duration: total + endLen, loop: true, autoplay: false, label: '번역',
        phases: [[0, 'GAA 코돈 · Glu'], [D / (total + endLen), 'CCA 코돈 · Pro'], [2 * D / (total + endLen), 'UGG 코돈 · Trp'], [total / (total + endLen), 'UAA 종결 코돈']],
        onFrame(p) { demoP = p; T = p * (total + endLen); },
      });
      const plEls = [].slice.call(ctlEl.children, nPl);

      /* 단백질 합성 단계: 2D의 합성 상태(S.sy)를 그대로 보여 주고, tRNA 단추로 2D와 같은 tRNA 놓기를 해요 (미션 진행이 같아요) */
      const L2 = () => window.__sim || null;
      const synY = () => { const L = L2(); return L && L.S && L.S.mode === 'synth' && L.S.sy ? L.S.sy : null; };
      const AAKO = { Met: '메싸이오닌', Glu: '글루탐산', Pro: '프롤린', Trp: '트립토판', Val: '발린', Phe: '페닐알라닌', Lys: '라이신', Gly: '글라이신' };
      const tTxt = controls.text('<b>tRNA</b>');
      const tBtns = [0, 1, 2].map((i) => controls.button('', () => {
        const L = L2(), Y = synY(); if (!Y || !L.syAttempt) return;
        if (Y.ph !== 'read' || !Y.tok[i]) return;
        let fx = 0, fy = 0; try { fx = L.syCx(Y.c); fy = L.SYG().trayY; } catch (e) { /* 무시 */ }
        L.syAttempt(Y.tok[i], fx, fy);
      }));
      let lastN = -1, animC = 0, animT = 9, relT = 0, wrongT = 0, lastWrong = 0, tokKey = '', lastY = null;
      const v3 = new THREE.Vector3();
      function retube() {
        if (chainTube) { root.remove(chainTube); chainTube.geometry.dispose(); chainTube = null; }
        const q = beads.filter((b) => b.visible).map((b) => b.position.clone());
        if (q.length >= 2) { chainTube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(q), 40, 0.07, 8), tubeMat); root.add(chainTube); }
      }
      function paintSyn(Y, dt) {
        const n = Y.chain.length, ph = Y.ph;
        if (Y !== lastY || n < lastN) { lastY = Y; lastN = n; animT = 9; relT = 0; lastWrong = Y.wrong; }
        if (n > lastN) { animC = n - 2; animT = 0; lastN = n; }
        if (Y.wrong !== lastWrong) { lastWrong = Y.wrong; wrongT = 0.6; }
        if (wrongT > 0) wrongT -= dt;
        const after = ph === 'release' || ph === 'released' || ph === 'fold' || ph === 'folded';
        relT = after ? Math.min(1, relT + dt / 1.0) : 0;
        if (animT < 4.4) {   // 맞는 tRNA가 들어와 결합하고 리보솜이 한 칸 옮겨 가요
          animT = Math.min(4.4, animT + dt * 2.2); setPos(animC, animT);
        } else if (n === 0) {
          setPos(-1, 0); tr[0].visible = false; beads[0].visible = false; retube();
        } else setPos(Math.min(n, NCY + 1) - 2, 4.4);
        const resting = animT >= 4.4;
        if (resting && after) {   // 종결: 마지막 tRNA가 떠나고 사슬이 떨어져 나와 접혀요
          const r = sm(0, 1, relT), last = tr[Math.min(n, NCY + 1) - 1];
          if (last) { last.position.y += r * 3.0; last.position.x -= r * 1.5; last.scale.setScalar(Math.max(0.001, 1 - r)); last.visible = r < 0.98; }
          beads.forEach((b) => { if (b.visible) { b.position.y += r * 0.8; b.position.x -= r * 2.6; } });
          const f = Math.max(0, Math.min(1.1, Y.fv || 0));
          if (f > 0.001) {
            const vis = beads.filter((b) => b.visible), cen = new THREE.Vector3(); vis.forEach((b) => cen.add(b.position)); if (vis.length) cen.multiplyScalar(1 / vis.length);
            vis.forEach((b, i) => { const a = i * 2.2, tgt = v3.set(cen.x + Math.cos(a) * 0.42, cen.y + (i - (vis.length - 1) / 2) * 0.22, cen.z + Math.sin(a) * 0.42); b.position.lerp(tgt, Math.min(1, f)); });
          }
          retube();
        }
        if (!resting) return;
        // 이름표 · 설명
        const ko = (a) => AAKO[a] || a, chainTxt = Y.chain.map((b) => ko(b.aa)).join('–');
        lStop.show(false); lCod.show(false);
        if (ph === 'read') {
          const cod = SYN3[Y.c] || '';
          lCod.set('A 자리 코돈 ' + cod + ' · 맞는 tRNA는?'); lCod.show(true);
          info('<b>단백질 합성</b> (' + n + ' / 4)<br>A 자리의 코돈 <b>' + cod + '</b>과 안티코돈이 짝이 맞는 <b>tRNA</b>를 아래 단추에서 골라요.' + (n ? '<br>사슬: ' + chainTxt : '') + (wrongT > 0 || (Y.msgT > 0 && Y.msg) ? '<br><span style="color:' + (Y.msg.indexOf('아니에요') >= 0 ? '#fca5a5' : '#86efac') + '">' + Y.msg + '</span>' : ''));
        } else if (ph === 'stop') {
          lStop.set('종결 코돈 UAA: 맞는 tRNA가 없어요'); lStop.show(true);
          info('<b>종결 코돈 UAA</b><br>맞는 tRNA가 없어요. <b>🛑 합성 끝내기</b>를 눌러 사슬을 떼어 내요.<br>사슬: ' + chainTxt);
        } else if (ph === 'release' || ph === 'released') {
          lStop.set('사슬이 떨어져 나와요'); lStop.show(true);
          info('<b>④ 종결</b><br>아미노산 사슬이 리보솜에서 떨어져 나왔어요.' + (ph === 'released' ? ' <b>🧶 사슬 접기</b>를 눌러 단백질로 만들어요.' : ''));
        } else {
          lChain.set(ph === 'folded' ? '단백질 (입체 구조)' : '사슬이 접히는 중…');
          info('<b>⑤ 접힘</b><br>' + (ph === 'folded' ? '사슬이 접혀 입체 구조의 <b>단백질</b>이 되었어요: ' + chainTxt : '아미노산 사슬이 접히고 있어요…'));
        }
        if (ph !== 'fold' && ph !== 'folded') lChain.set('아미노산 사슬');
        lChain.show(n >= 1); { const b = beads.filter((q) => q.visible); if (b.length) { const top = b[b.length - 1].position; lChain.obj = [top.x - 0.5, top.y + 0.6, top.z]; } }
      }
      const SYN3 = SEQ;
      paint();
      return {
        update(dt) {
          const Y = synY();
          const showT = !!(Y && Y.ph === 'read');
          [tTxt].concat(tBtns).forEach((e) => { e.style.display = showT ? '' : 'none'; });
          plEls.forEach((e) => { e.style.display = Y ? 'none' : ''; });   // 합성 단계에서는 정답을 미리 보여 주는 ▶ 번역 재생을 숨겨요
          if (Y) {
            if (pl.playing) pl.pause();
            const key = Y.ph + '|' + Y.c + '|' + Y.tok.map((t) => t.anti).join(',');
            if (key !== tokKey) { tokKey = key; Y.tok.forEach((t, i) => { if (tBtns[i]) tBtns[i].textContent = 'tRNA ' + t.anti + ' · ' + (AAKO[t.aa] || t.aa); }); }
            paintSyn(Y, dt); return;
          }
          lastY = null;
          if (!pl.playing && demoP === 0) { T += dt; if (T > total + endLen) T = 0; } paint();
        },
        sync() {},
      };
    },
  });
})();
