/* hq-atom-model · 3D 원자 모형 (보어 궤도 ↔ 확률 구름)
   · 보어 모형: 궤도 반지름 rₙ = 0.053 n² nm, 에너지 Eₙ = −13.6/n² eV, 전이할 때 hf = ΔE 인 광자 (2D 차시와 같은 값).
   · 확률 구름: 수소 바닥 상태에서 전자의 위치를 '측정'한 결과를 점으로 모은 것. 점 하나 = 한 번의 측정 결과이고,
     거리 분포는 P(r) ∝ r² e^(−2r/a₀) (2D 차시의 표본 추출과 같은 식). 궤도(길)가 아니라 발견될 확률의 분포예요.
   슈뢰딩거 방정식·오비탈(s, p …)·양자수 l, m은 이 차시에서 다루지 않으므로 보여 주지 않아요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHN = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches), KD = PHN ? 1.45 : 1;
  const A0NM = 0.0529;
  const HL = { '3-2': { ni: 3, nf: 2, name: 'Hα' }, '4-2': { ni: 4, nf: 2, name: 'Hβ' }, '5-2': { ni: 5, nf: 2, name: 'Hγ' }, '2-1': { ni: 2, nf: 1, name: '자외선' } };
  const trE = (k) => 13.6 * (1 / (HL[k].nf * HL[k].nf) - 1 / (HL[k].ni * HL[k].ni));
  const lamOf = (k) => 1240 / trE(k);
  function lamColor(nm) { // 가시광 근사 색
    let r = 0, g = 0, b = 0;
    if (nm < 380) return [0.75, 0.55, 1.0];
    if (nm < 440) { r = -(nm - 440) / 60; b = 1; } else if (nm < 490) { g = (nm - 440) / 50; b = 1; } else if (nm < 510) { g = 1; b = -(nm - 510) / 20; } else if (nm < 580) { r = (nm - 510) / 70; g = 1; } else if (nm < 645) { r = 1; g = -(nm - 645) / 65; } else { r = 1; }
    return [r, g, b];
  }
  const cdf = (x) => 1 - Math.exp(-2 * x) * (1 + 2 * x + 2 * x * x);

  window.SciSim3D.attach({
    title: '원자 모형 3D — 보어 궤도와 확률 구름',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: 16 * KD, theta: 0.6, phi: 1.15, min: 4, max: 40 },
    autoRotate: 0.12,
    build(ctx) {
      const { THREE, root, renderer, label, info, controls } = ctx;
      const V3 = THREE.Vector3;
      renderer.localClippingEnabled = true;
      const lessonS = () => (window.__sim && window.__sim.S) || null;
      const st = { mode: 'cloud', n: 1, N: 800, cut: false, shell: true, tr: null, trT: 0 };
      const S0 = lessonS();
      if (S0) { if (S0.mode === 'bohr' || S0.mode === 'cloud' || S0.mode === 'cmp') st.mode = S0.mode; else if (S0.mode === 'unc') st.mode = 'cloud'; if (S0.cl && S0.cl.n > 0) st.N = Math.max(100, Math.min(4000, Math.round(S0.cl.n / 50) * 50)); }

      const mat = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.45, metalness: 0.05 }, o || {}));
      const basic = (c, o) => new THREE.MeshBasicMaterial(Object.assign({ color: c }, o || {}));
      function ringMesh(r, col, op, rad) { const m = new THREE.Mesh(new THREE.TorusGeometry(r, rad || 0.03, 8, 96), basic(col, { transparent: true, opacity: op })); m.rotation.x = Math.PI / 2; return m; }

      /* ---------- 고정 표본 (측정 결과): 앞에서부터 N개를 쓰므로 N을 늘리면 점이 쌓여요 ---------- */
      let seed = 20260901; const rnd = () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
      const MAXN = 6000, SMP = new Float32Array(MAXN * 3), RS = new Float32Array(MAXN);
      for (let i = 0; i < MAXN; i++) {
        const r = 0.5 * (-Math.log(1 - rnd()) - Math.log(1 - rnd()) - Math.log(1 - rnd())), z = 2 * rnd() - 1, ph = 2 * Math.PI * rnd(), s = Math.sqrt(1 - z * z);
        RS[i] = r; SMP[i * 3] = r * s * Math.cos(ph); SMP[i * 3 + 1] = r * z; SMP[i * 3 + 2] = r * s * Math.sin(ph);
      }
      function dotTex() { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,.7)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); }
      const tex = dotTex();

      const gBohr = new THREE.Group(), gCloud = new THREE.Group();
      root.add(gBohr, gCloud);

      /* ---------- 핵 ---------- */
      const nucleus = new THREE.Mesh(new THREE.SphereGeometry(0.22, 24, 16), mat(0xe2464b, { emissive: 0x661b1b }));
      root.add(nucleus);
      const labNuc = label('핵(양성자)', nucleus, { color: 'rgba(8,12,24,.78)', size: 12, offset: [0, -0.8, 0] });

      /* ---------- 보어 모형 ---------- */
      const ringsG = new THREE.Group(); gBohr.add(ringsG);
      const SB = 0.5;                                                    // 보어 장면: 1 a₀ = 0.5 화면 단위 (n=5 → 12.5)
      const ringCols = [0xff7a7a, 0xffb86b, 0xffe27a, 0x8be28b, 0x7ab8ff];
      const rLabs = [];
      for (let n = 1; n <= 5; n++) {
        const r = n * n * SB; ringsG.add(ringMesh(r, ringCols[n - 1], 0.75, 0.035));
        const la = [4.4, 1.0, 2.3, 3.6, 5.3][n - 1]; const ob = new THREE.Object3D(); ob.position.set(r * Math.cos(la), 0, r * Math.sin(la)); ringsG.add(ob);
        rLabs.push(label('n=' + n + (n < 4 ? ' · ' + (A0NM * n * n).toFixed(3).replace(/0+$/, '') + ' nm' : ' · ' + (A0NM * n * n).toFixed(2) + ' nm'), ob, { color: 'rgba(8,12,24,.75)', size: 11.5 }));
      }
      const elec = new THREE.Mesh(new THREE.SphereGeometry(0.2, 20, 14), mat(0x6aa7ff, { emissive: 0x1b3a8a })); gBohr.add(elec);
      const labE = label('전자', elec, { color: '#2f6df6', size: 12, offset: [0, 0.55, 0] });
      const photon = new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 12), basic(0xff4040, { transparent: true, opacity: 0 })); gBohr.add(photon);
      const labPh = label('', photon, { color: 'rgba(8,12,24,.85)', size: 12.5, offset: [0, 0.65, 0] }); labPh.show(false);
      let ang = 0, nCur = 1, rCur = SB, phDir = new V3(1, 0, 0), phT = -1;

      /* ---------- 확률 구름 ---------- */
      const SC = 1.25;                                                   // 구름 장면: 1 a₀ = 1.25 화면 단위
      const ptsGeo = new THREE.BufferGeometry(); ptsGeo.setAttribute('position', new THREE.BufferAttribute(SMP.map((v) => v * SC), 3));
      const clip = new THREE.Plane(new V3(0, 0, -1), 0);
      const ptsMat = new THREE.PointsMaterial({ color: 0x7fb4ff, size: 0.34, map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true, opacity: 0.85 });
      const pts = new THREE.Points(ptsGeo, ptsMat); pts.frustumCulled = false; gCloud.add(pts);
      const shell = new THREE.Mesh(new THREE.SphereGeometry(SC, 32, 20), basic(0xff7a7a, { transparent: true, opacity: 0.12, wireframe: true })); gCloud.add(shell);
      const shellRing = ringMesh(SC, 0xff7a7a, 0.9, 0.025); gCloud.add(shellRing);
      const sOb = new THREE.Object3D(); sOb.position.set(SC * Math.cos(0.6), 0, SC * Math.sin(0.6)); gCloud.add(sOb);
      const labShell = label('r = 0.053 nm (거리별로 세면 가장 많이 발견돼요)', sOb, { color: '#c0392b', size: 11.5, offset: [0, 0.45, 0] });
      const labBadge = label('☁️ 확률 분포 — 전자가 돌아다니는 길이 아니에요', [0, -5.2, 0], { color: 'rgba(8,12,24,.8)', size: 13 });
      const orbitCmp = ringMesh(SC, 0xffd34d, 0.95, 0.04); orbitCmp.visible = false; gCloud.add(orbitCmp);
      const labOrb = label('보어: 전자는 항상 이 궤도 위', [0, 0, 0], { color: '#a16207', size: 11.5 });

      /* ---------- 장면 전환 ---------- */
      const ctlNodes = {}, vis = {};
      function show() {
        const m = st.mode;
        gBohr.visible = m === 'bohr'; gCloud.visible = m !== 'bohr';
        pts.visible = m !== 'bohr'; ptsGeo.setDrawRange(0, st.N);
        orbitCmp.visible = m === 'cmp'; labOrb.show(m === 'cmp'); shell.visible = shellRing.visible = st.shell && m === 'cloud'; labShell.show(st.shell && m === 'cloud');
        labBadge.show(m !== 'bohr'); labOrb.obj = [SC * Math.cos(2.3), 0, SC * Math.sin(2.3)]; labOrb.off = [0, 0.0, 0];
        ptsMat.clippingPlanes = st.cut ? [clip] : []; ptsMat.needsUpdate = true;
        ringsG.children.forEach((c) => (c.visible = true)); rLabs.forEach((l) => l.show(m === 'bohr'));
        elec.visible = m === 'bohr'; labE.show(m === 'bohr'); labPh.show(false); photon.material.opacity = 0;
        labNuc.show(m !== 'bohr'); nucleus.scale.setScalar(m === 'bohr' ? 1 : 0.55);
        if (m === 'bohr') placeElec(st.n);
        text();
        Object.keys(ctlNodes).forEach((k) => ctlNodes[k].forEach((n) => { n.style.display = vis[k]() ? '' : 'none'; }));
      }
      function placeElec(n) { nCur = n; rCur = n * n * SB; }
      function text() {
        const m = st.mode;
        if (m === 'bohr') {
          const n = st.n, tr = st.tr;
          let h = '<b>보어 모형</b> · 전자는 정해진 궤도만 돌아요.<br>n = <b>' + n + '</b> · 반지름 rₙ = 0.053 n² = <b>' + (A0NM * n * n).toFixed(3) + ' nm</b> · 에너지 Eₙ = −13.6/n² = <b>' + (-13.6 / (n * n)).toFixed(2) + ' eV</b>';
          if (tr) h += '<br>전이 ' + tr.ni + '→' + tr.nf + ' (' + tr.name + '): ΔE = <b>' + trE(tr.key).toFixed(2) + ' eV</b> → hf = ΔE, 파장 λ = 1240/ΔE ≈ <b>' + Math.round(lamOf(tr.key)) + ' nm</b>' + (tr.key === '2-1' ? ' (자외선)' : '');
          else h += '<br>높은 궤도 → 낮은 궤도로 전이하면 hf = ΔE 인 빛이 나와요. 아래 버튼을 눌러 보세요.';
          info(h);
        } else {
          const N = st.N; let inA = 0, in3 = 0; for (let i = 0; i < N; i++) { if (RS[i] <= 1) inA++; if (RS[i] <= 3) in3++; }
          let h = '<b>확률 구름 (수소 바닥 상태)</b><br>점 하나 = 전자의 위치를 <b>한 번 측정</b>한 결과. <b>' + N + '</b>번 모았더니 구름 모양이 됐어요.<br>';
          h += '점이 촘촘한 곳 = 발견될 확률이 큰 곳. 0.053 nm 안에서 발견된 비율 <b>' + Math.round(100 * inA / N) + '%</b> (이론 ' + Math.round(100 * cdf(1)) + '%), 0.16 nm 안 <b>' + Math.round(100 * in3 / N) + '%</b>.';
          if (m === 'cmp') h += '<br><span style="color:#ffd34d">노란 고리</span> = 보어 궤도: 보어 모형은 전자가 늘 이 고리 위에 있다고 했지만, 현대 모형에서는 이 거리가 <b>가장 많이 발견되는 거리</b>일 뿐이에요.';
          else h += '<br>궤도와 달리 <b>어디서든 발견될 수 있어요</b>(핵에서 멀어질수록 확률은 작아져요).';
          info(h);
        }
      }

      /* ---------- 조작 ---------- */
      const bar = ctx.renderer.domElement.parentNode.parentNode.querySelector('.v3-ctl');
      function grab(k, v, fn) { const before = bar.children.length; const r = fn(); ctlNodes[k] = [...bar.children].slice(before); vis[k] = v; return r; }
      const isB = () => st.mode === 'bohr', isC = () => st.mode !== 'bohr';
      const segM = grab('mode', () => true, () => controls.segment('모형', [{ value: 'bohr', label: '🪐 보어 궤도' }, { value: 'cloud', label: '☁️ 확률 구름' }, { value: 'cmp', label: '⚖️ 겹쳐 보기' }], st.mode, (v) => { st.mode = v; reorient(); show(); }));
      const segN = grab('n', isB, () => controls.segment('전자 궤도 n', [1, 2, 3, 4, 5].map((n) => ({ value: n, label: String(n) })), st.n, (v) => { st.n = v; st.tr = null; show(); }));
      Object.keys(HL).forEach((k) => grab('tr' + k, isB, () => controls.button(HL[k].ni + '→' + HL[k].nf + ' ' + HL[k].name, () => startTr(k))));
      const rN = grab('N', isC, () => controls.range('측정 횟수', 50, 6000, 50, st.N, (v) => { st.N = v; ptsGeo.setDrawRange(0, st.N); text(); }, (v) => v + '번'));
      const cutB = grab('cut', isC, () => controls.button('단면 보기 ✕', () => { st.cut = !st.cut; cutB.classList.toggle('on', st.cut); cutB.textContent = '단면 보기 ' + (st.cut ? '✓' : '✕'); show(); }));
      const shB = grab('shell', () => st.mode === 'cloud', () => controls.button('0.053 nm 껍질 ✓', () => { st.shell = !st.shell; shB.classList.toggle('on', st.shell); shB.textContent = '0.053 nm 껍질 ' + (st.shell ? '✓' : '✕'); show(); }));
      shB.classList.add('on');
      function reorient() { const o = ctx.orbit; o.dist = (st.mode === 'bohr' ? 27 : 15) * KD; if (st.mode === 'bohr') o.phi = 0.95; o.ty = 0; }
      function startTr(k) {
        const h = HL[k]; st.n = h.ni; segN.set(h.ni); placeElec(h.ni); st.tr = { key: k, ni: h.ni, nf: h.nf, name: h.name }; st.trT = 0; phT = -1; text();
      }
      reorient(); show();

      return {
        update(dt, t) {
          if (st.mode === 'bohr') {
            // 궤도를 도는 전자 (바깥일수록 느려요: ω ∝ 1/n³)
            ang += dt * 2.2 / Math.pow(nCur, 1.5);
            const tr = st.tr;
            if (tr) {
              st.trT += dt;
              if (st.trT > 1.3 && nCur === tr.ni) { // 전이: 낮은 궤도로 이동 + 광자 방출
                nCur = tr.nf; rCur = tr.nf * tr.nf * SB; st.n = tr.nf; segN.set(tr.nf); phT = 0; phDir.set(Math.cos(ang), 0, Math.sin(ang));
                const lam = lamOf(tr.key), c = lamColor(lam); photon.material.color.setRGB(c[0], c[1], c[2]); labPh.set('hf = ' + trE(tr.key).toFixed(2) + ' eV · ' + Math.round(lam) + ' nm'); text();
              }
            }
            elec.position.set(rCur * Math.cos(ang), 0, rCur * Math.sin(ang));
            if (phT >= 0) {
              phT += dt; const d = 1 + phT * 4.5; photon.position.copy(phDir).multiplyScalar((tr ? tr.ni * tr.ni * SB : 1) + d);
              photon.material.opacity = Math.max(0, 1 - phT / 3.2); labPh.show(phT < 3.2); if (phT > 3.2) phT = -1;
            } else { photon.material.opacity = 0; labPh.show(false); }
          } else if (st.mode === 'cmp') {
            // 겹쳐 보기: 보어 궤도를 도는 전자 한 개 (노란 점)
          }
        },
        sync() {
          const S = lessonS(); if (!S) return;
          if (S.mode === 'bohr' || S.mode === 'cloud' || S.mode === 'cmp') { st.mode = S.mode; segM.set(st.mode); reorient(); }
          if (S.cl && S.cl.n > 0) { st.N = Math.max(50, Math.min(6000, Math.round(S.cl.n / 50) * 50)); rN.set(st.N); }
          show();
        },
      };
    },
  });
})();
