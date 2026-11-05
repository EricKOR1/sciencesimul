/* h1-transcription · 3D 전사 (DNA 이중 나선 → mRNA)
   RNA 중합효소가 DNA 이중 나선을 풀며 지나가고, DNA 한 가닥(주형)과 짝이 맞는 염기(A-U, T-A, G-C, C-G)를 이어
   mRNA를 만들어요. 지나간 DNA는 다시 이중 나선으로 감겨요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHN = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  /* 2D 전사 실험과 같은 서열: 6개(TACGGT) · 12개(TAC CTT GGT ACT) */
  const TEMPL = { 6: { tmpl: 'TACGGT', coding: 'ATGCCA' }, 12: { tmpl: 'TACCTTGGTACT', coding: 'ATGGAACCATGA' } };
  const MAXN = 12;
  let N = 12, DX = 0.55, CODING = TEMPL[12].coding;
  const COMP = { A: 'T', T: 'A', G: 'C', C: 'G' }, RNA = { A: 'U', T: 'A', G: 'C', C: 'G' };
  const COL = { A: 0x6fd36b, T: 0xf0556a, U: 0xff8a5c, G: 0xffd34d, C: 0x4aa3ff };
  let TEMPLATE = TEMPL[12].tmpl.split(''), MRNA = TEMPLATE.map((b) => RNA[b]);

  window.SciSim3D.attach({
    title: '전사: DNA에서 mRNA로 3D',
    camera: { dist: PHN ? 17 : 12.5, theta: 0.25, phi: 1.2, target: [0, 0.4, 0], min: 6, max: 24 },
    levels: [1],
    autoRotate: 0,
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const std = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.4, metalness: 0.05 }, o || {}));
      let p = -2, names = true, demoP = 0, lastN = 0;
      const R = 0.85, TW = 0.62; // 나선 반지름, 염기쌍당 회전각
      const xo = (i) => (i - (N - 1) / 2) * DX;
      const bGeo = new THREE.SphereGeometry(0.18, 20, 14), rGeo = new THREE.CylinderGeometry(0.05, 0.05, 1, 8);
      const cod = [], tmp = [], rung = [], rn = [];
      for (let i = 0; i < MAXN; i++) {
        cod.push(new THREE.Mesh(bGeo, std(0xffffff, { roughness: 0.3 }))); tmp.push(new THREE.Mesh(bGeo, std(0xffffff, { roughness: 0.3 })));
        rn.push(new THREE.Mesh(bGeo, std(0xffffff, { roughness: 0.3, emissive: 0xffffff, emissiveIntensity: 0.2 })));
        const a = new THREE.Mesh(rGeo, std(0xdfe6f5, { roughness: 0.5 })), b = new THREE.Mesh(rGeo, std(0xdfe6f5, { roughness: 0.5 }));
        rung.push([a, b]); root.add(cod[i], tmp[i], rn[i], a, b);
      }
      const tubeMat = std(0x9fb4e8, { roughness: 0.5 }), rTubeMat = std(0xff8a5c, { roughness: 0.5 });
      let tCod = null, tTmp = null, tRna = null;
      // 중합효소
      const pol = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), std(0xc9a0ff, { transparent: true, opacity: 0.42, depthWrite: false, roughness: 0.3 })); pol.scale.set(0.95, 1.35, 1.1); root.add(pol);
      const lPol = label('RNA 중합효소', pol, { offset: [0, 1.8, 0], color: 'rgba(110,60,220,.92)' });
      const lDir = label('전사 방향 →', [3.5, -2.0, 0], { size: 12 });
      const lT = label('주형 가닥', [-5.2, -1.7, 0], { size: 12 }), lC = label('DNA 다른 가닥', [-5.2, 1.7, 0], { size: 12 }), lM = label('mRNA', [4.5, 2.9, 0], { color: 'rgba(200,90,30,.92)' });
      const lDNA = label('DNA 이중 나선', [-5.0, 0.0, 0], { size: 12 });
      function setSeq(n) {
        const o = TEMPL[n] || TEMPL[12]; N = o.tmpl.length; DX = N === 6 ? 0.95 : 0.55; CODING = o.coding; TEMPLATE = o.tmpl.split(''); MRNA = TEMPLATE.map((b) => RNA[b]); lastN = N;
        for (let i = 0; i < MAXN; i++) {
          const on = i < N; cod[i].visible = tmp[i].visible = on; rung[i][0].visible = rung[i][1].visible = on; if (!on) { rn[i].visible = false; continue; }
          cod[i].material.color.setHex(COL[CODING[i]]); tmp[i].material.color.setHex(COL[TEMPLATE[i]]);
          rn[i].material.color.setHex(COL[MRNA[i]]); rn[i].material.emissive.setHex(COL[MRNA[i]]);
        }
      }
      setSeq(12);
      const sm = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
      const V = THREE.Vector3;
      const tTop = (i) => new V(xo(i), 1.35, 0.0), tBot = (i) => new V(xo(i), -1.35, 0.0);
      // 염기쌍 i의 위치: 이중 나선(닫힘) ↔ 풀린 모양(열림)
      function posOf(i) {
        const a = i * TW, hx = new V(xo(i), Math.cos(a) * R, Math.sin(a) * R), hy = new V(xo(i), -Math.cos(a) * R, -Math.sin(a) * R);
        const w = 1 - sm(0.0, 1.6, Math.abs(i - p) - 0.8); // 효소 근처(약 ±1.5쌍)는 풀림
        return { a: hx.lerp(tTop(i).setZ(0.0), w), b: hy.lerp(tBot(i), w), w };
      }
      function paint() {
        const Pa = [], Pb = [], Pr = [];
        for (let i = 0; i < N; i++) {
          const q = posOf(i); Pa.push(q.a); Pb.push(q.b);
          cod[i].position.copy(q.a); tmp[i].position.copy(q.b);
          // 염기쌍 연결 막대: 닫혀 있을 때만
          const open = q.w > 0.55;
          rung[i].forEach((r, k) => {
            const A = q.a, B = q.b, mid = A.clone().lerp(B, 0.5); const half = k ? mid.clone().lerp(B, 0) : mid; r.visible = !open;
            const from = k ? B : A, d = mid.clone().sub(from), len = d.length();
            r.position.copy(from).add(mid).multiplyScalar(0.5); r.scale.set(1, Math.max(0.001, len), 1); r.quaternion.setFromUnitVectors(new V(0, 1, 0), d.normalize());
          });
          // mRNA: 효소 뒤쪽에서 주형에 붙었다가 위로 떨어져 나가요
          const made = p - i; // 효소가 지나간 정도
          const vis = made > -0.2; rn[i].visible = vis; if (vis) {
            const att = q.b.clone().add(new V(0, 0.55, 0.0)), free = new V(xo(i) + 0.0, 2.5 + Math.sin(i * 0.5) * 0.12, 0.5 + Math.sin(i * 0.7) * 0.25);
            const e = sm(1.0, 4.5, made), pop = sm(-0.2, 0.5, made);
            rn[i].position.copy(att.lerp(free, e)); rn[i].scale.setScalar(0.35 + 0.65 * pop); if (e < 1) { const w = new V(0, 0, 0); }
            Pr.push(rn[i].position.clone());
          }
        }
        [tCod, tTmp, tRna].forEach((t) => { if (t) { root.remove(t); t.geometry.dispose(); } });
        tCod = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(Pa), 120, 0.05, 6), tubeMat); tTmp = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(Pb), 120, 0.05, 6), tubeMat); root.add(tCod, tTmp);
        if (Pr.length >= 2) { tRna = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(Pr), 100, 0.05, 6), rTubeMat); root.add(tRna); } else tRna = null;
        pol.position.set(xo(Math.max(0, Math.min(N - 1, p))) , 0, 0); pol.visible = p > -1.5 && p < N + 1;
        lPol.show(pol.visible);
        const made = Math.max(0, Math.min(N, Math.floor(p + 1.2)));
        lM.show(made >= 2); lM.obj = [xo(Math.max(0, Math.min(N - 1, p - 3))) + 0.0, 2.9, 0.4];
        lDir.show(true); lT.show(names); lC.show(names); lDNA.show(false);
        info(msgT > 0 ? msg : nextNote ? nextNote : p < 0.5 ? '<b>전사 시작</b>: RNA 중합효소가 DNA에 붙어 이중 나선을 풀어요.' : p < N - 1.5 ? '<b>mRNA 합성</b>: 주형 가닥의 염기와 짝이 맞는 RNA 염기를 이어요. (A→U, T→A, G→C, C→G)' : '<b>전사 끝</b>: mRNA가 떨어져 나가 핵 밖으로 나가고, DNA는 다시 이중 나선이 돼요.');
      }
      const bN = controls.button('이름표 ✓', () => { names = !names; bN.classList.toggle('on', names); bN.textContent = '이름표 ' + (names ? '✓' : '✕'); paint(); }); bN.classList.add('on');
      controls.text('<span style="color:#6fd36b">●A</span> <span style="color:#f0556a">●T</span> <span style="color:#ff8a5c">●U(RNA)</span> <span style="color:#ffd34d">●G</span> <span style="color:#4aa3ff">●C</span>');
      // RNA 염기 단추: 2D의 염기 놓기와 같아요 (주형 가닥의 다음 염기와 짝이 맞는 RNA 염기를 골라요)
      let msg = '', msgT = 0, nextNote = '';
      const bTxt = controls.text('<b>RNA 염기</b>');
      const bBtns = ['A', 'U', 'G', 'C'].map((b) => {
        const btn = controls.button(b, () => {
          const L = window.__sim, T = L && L.S && L.S.tr; if (!T || !L.trAttempt) return;
          if (T.ph !== 'synth') { msg = T.ph === 'idle' ? '먼저 <b>▶ 전사 시작</b>을 눌러 DNA를 풀어요.' : T.ph === 'opening' ? 'DNA가 다 풀릴 때까지 잠깐 기다려요.' : '전사가 끝났어요. <b>↺ 다시 하기</b>로 한 번 더 해 봐요.'; msgT = 2.5; return; }
          const k0 = T.mr.length, tb = T.tmpl[k0]; L.trAttempt(b, 0, 0);
          msg = T.mr.length > k0 ? '주형 <b>' + tb + '</b> – RNA <b>' + b + '</b> 짝이 맞아요!' : 'RNA 염기 <b>' + b + '</b>는 주형 염기 <b>' + tb + '</b>와 짝이 맞지 않아요. 다시 골라 봐요.'; msgT = 2.2;
        });
        btn.style.color = '#' + COL[b].toString(16).padStart(6, '0'); btn.style.minWidth = '44px'; return btn;
      });
      const showBases = (on) => { [bTxt].concat(bBtns).forEach((e) => { e.style.display = on ? '' : 'none'; }); };
      const pl = controls.player({
        duration: 14, loop: true, autoplay: false, label: '전사',
        phases: [[0, 'DNA가 풀려요'], [0.2, 'mRNA 합성'], [0.8, 'mRNA가 떨어져 나가요']],
        onFrame(q) { demoP = q; p = -2 + q * (N + 5); },
      });
      p = 4; paint();
      return {
        update(dt) {
          const L = window.__sim, S = L && L.S, T = S && S.tr;
          const mirror = !!(T && (S.mode === 'tr' || S.mode === 'cells'));
          const want = mirror ? T.n : 12; if (want !== lastN) setSeq(want);
          if (msgT > 0) msgT -= dt;
          showBases(!!(T && S.mode === 'tr' && T.ph === 'synth'));
          nextNote = '';
          if (T && S.mode === 'tr' && !pl.playing) {
            if (T.ph === 'idle') nextNote = '<b>▶ 전사 시작</b>을 누르면 RNA 중합효소가 DNA 이중 나선을 풀어요.';
            else if (T.ph === 'synth') nextNote = '<b>mRNA 합성</b>: 주형 가닥 ' + (T.mr.length + 1) + '번째 염기 <b>' + T.tmpl[T.mr.length] + '</b>와 짝이 맞는 <b>RNA 염기</b>를 아래 단추에서 골라요. (' + T.mr.length + ' / ' + T.n + ')';
          }
          if (demoP > 0 || pl.playing) { /* ▶ 재생: p는 진행 막대가 정해요 */ }
          else if (mirror) {
            // 2D 상태를 그대로: 풀리기 → 염기 하나씩 → 떨어져 나가기
            const ph = T.ph, k = T.mr.length;
            if (ph === 'idle') p = -2; else if (ph === 'opening') p = -2 + 2.2 * Math.min(1, T.pt / (0.6 + (T.n - 1) * 0.1 + 0.15)); else if (ph === 'synth') p = k - 0.6; else p = N + 1.5;
          } else { p += dt * 0.95; if (p > N + 3) p = -2; }   // 2D 전사 장면이 아닌 단계: 한 번 돌아가며 보여 줘요
          paint();
        },
        sync() { paint(); },
      };
    },
  });
})();
