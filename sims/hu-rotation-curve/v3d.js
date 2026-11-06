/* hu-rotation-curve · 3D 은하 회전 곡선과 암흑 물질
   보이는 별과 가스의 질량만으로 계산하면 은하 바깥쪽의 별은 케플러 법칙처럼 점점 느리게 돌아야 해요 (v ∝ 1/√r).
   그런데 실제 관측은 바깥에서도 속도가 거의 일정(평평한 회전 곡선) → 보이지 않는 질량(암흑 물질 헤일로)이 은하를 둘러싸고 있다고 봐요.
   우리은하 관측값(2D 실험의 MW 자료)과 M(<r) 식으로 별의 회전을 움직여요. 별 수와 크기는 보기 좋게 나타낸 모형이에요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const TAU = Math.PI * 2, G = 4.30e-6, SC = 0.17;                         // 1 kpc = 0.17 장면 길이
  const MWR = [2, 4, 6, 8, 12, 16, 20, 25, 30], MWV = [190, 205, 215, 220, 222, 220, 215, 210, 205];
  const Mlight = (r) => 5e10 * (1 - (1 + r / 3) * Math.exp(-r / 3));
  const vVis = (r) => Math.sqrt(G * Mlight(Math.max(r, 0.05)) / Math.max(r, 0.05));
  let curR = MWR, curV = MWV;                                                // 지금 보는 은하의 관측 자료 (2D의 GALS)
  function vObs(r) {
    const R = curR, V = curV;
    if (r <= R[0]) return V[0] * (r / R[0]);
    for (let i = 1; i < R.length; i++) if (r <= R[i]) { const f = (r - R[i - 1]) / (R[i] - R[i - 1]); return V[i - 1] + f * (V[i] - V[i - 1]); }
    return V[V.length - 1];
  }
  let mhNow = 0;
  const vModel = (r) => Math.sqrt(G * (Mlight(Math.max(r, 0.05)) + mhNow * 1e11 * r / 30) / Math.max(r, 0.05));

  window.SciSim3D.attach({
    title: '은하 회전 곡선 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    levels: [1, 3],
    camera: { dist: PHONE ? 14 : 10.5, theta: 0.5, phi: 0.8, min: 5, max: 26 },
    autoRotate: 0,
    build(ctx) {
      const { THREE, scene, root, label, info, controls } = ctx;
      const st = { mode: 'obs', halo: false, t: 0, key: '', view: 'mass', gal: 0, ri: 3, T: 0, mh: 0, free: false };
      const sr = () => { try { return window.__sim && window.__sim.S; } catch (e) { return null; } };
      scene.add(new THREE.AmbientLight(0x8090c0, 0.5));

      /* 별 (점) */
      const N = PHONE ? 4200 : 7000;
      let seed = 17; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
      const rr = new Float32Array(N), th0 = new Float32Array(N), yy = new Float32Array(N), pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
      for (let i = 0; i < N; i++) {
        let r; const u = rnd();
        if (u < 0.22) r = Math.abs((rnd() + rnd() + rnd() - 1.5)) * 5 + 0.1;                // 팽대부
        else r = -Math.log(1 - rnd() * 0.97) * 6.5 + 0.5;                                    // 원반 (지수 분포)
        r = Math.min(r, 30);
        const arm = 2, a = rnd() * TAU, spiral = Math.floor(rnd() * arm) * Math.PI + 0.22 * r + (rnd() - 0.5) * (u < 0.22 ? 6 : 1.1);
        rr[i] = r; th0[i] = u < 0.22 ? a : spiral;
        yy[i] = (rnd() - 0.5) * (u < 0.22 ? 1.2 : 0.35) * Math.exp(-r / 14) * SC * 3;
        const warm = Math.exp(-r / 5), c = [0.65 + 0.35 * warm, 0.72 + 0.1 * warm, 0.95 - 0.45 * warm]; col.set(c, i * 3);
      }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
      const dot = (() => { const c = document.createElement('canvas'); c.width = c.height = 32; const x = c.getContext('2d'), gr = x.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.4, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 32, 32); return new THREE.CanvasTexture(c); })();
      const pts = new THREE.Points(g, new THREE.PointsMaterial({ size: PHONE ? 0.11 : 0.1, map: dot, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true })); pts.frustumCulled = false; root.add(pts);
      /* 은하 중심 빛 */
      const gl = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'), gr = x.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,230,170,.95)'); gr.addColorStop(0.3, 'rgba(255,200,120,.35)'); gr.addColorStop(1, 'rgba(255,180,80,0)'); x.fillStyle = gr; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();
      const core = new THREE.Sprite(new THREE.SpriteMaterial({ map: gl, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); core.scale.set(3.2, 3.2, 1); root.add(core);

      /* 암흑 물질 헤일로: 반투명 구 + 흐릿한 입자 */
      const haloG = new THREE.Group(); root.add(haloG);
      haloG.add(new THREE.Mesh(new THREE.SphereGeometry(30 * SC * 1.05, 48, 32), new THREE.MeshBasicMaterial({ color: 0x8b5cf6, transparent: true, opacity: 0.1, side: THREE.BackSide, depthWrite: false })));
      haloG.add(new THREE.Mesh(new THREE.SphereGeometry(30 * SC * 1.05, 48, 32), new THREE.MeshBasicMaterial({ color: 0x8b5cf6, transparent: true, opacity: 0.05, depthWrite: false })));
      { const hp = new Float32Array(600 * 3); for (let i = 0; i < 600; i++) { const u = rnd() * 2 - 1, a = rnd() * TAU, s = Math.sqrt(1 - u * u), r = 30 * SC * Math.cbrt(rnd()) * 1.0; hp[i * 3] = Math.cos(a) * s * r; hp[i * 3 + 1] = u * r; hp[i * 3 + 2] = Math.sin(a) * s * r; }
        const hg = new THREE.BufferGeometry(); hg.setAttribute('position', new THREE.BufferAttribute(hp, 3));
        haloG.add(new THREE.Points(hg, new THREE.PointsMaterial({ color: 0xc4a8ff, size: 0.06, transparent: true, opacity: 0.55, depthWrite: false }))); }
      const labHalo = label('암흑 물질 헤일로', [30 * SC * 0.8, 30 * SC * 0.55, 0], { color: 'rgba(91,50,180,.92)' });

      /* 추적하는 별 3개 (2 · 8 · 16 kpc 근처) + 태양 */
      const TR = [{ r: 3, c: 0x7dd3fc, n: '안쪽' }, { r: 8.2, c: 0xffd23f, n: '태양' }, { r: 16, c: 0xff7a7a, n: '바깥쪽' }];
      const trs = TR.map((t) => {
        const m = new THREE.Mesh(new THREE.SphereGeometry(t.n === '태양' ? 0.13 : 0.1, 20, 14), new THREE.MeshBasicMaterial({ color: t.c })); root.add(m);
        const pl = []; for (let i = 0; i < 96; i++) { const a = i / 96 * TAU; pl.push(new THREE.Vector3(t.r * SC * Math.cos(a), 0, t.r * SC * Math.sin(a))); }
        root.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pl, true), 128, 0.012, 5, true), new THREE.MeshBasicMaterial({ color: t.c, transparent: true, opacity: 0.55 })));
        const lb = label(t.n, m, { offset: [0, 0.4, 0], size: 11.5, color: 'rgba(15,25,60,.9)' }); return { m, t, lb, th: t.r * 0.37 };
      });

      /* 속도 곡선 상자 */
      const view = ctx.renderer.domElement.parentElement;
      const box = document.createElement('div');
      box.style.cssText = 'position:absolute;right:10px;bottom:30px;z-index:3;padding:6px 8px 6px;border-radius:14px;background:rgba(8,12,24,.78);border:1px solid rgba(255,255,255,.22);text-align:center;pointer-events:none;color:#e8eefc;font-size:12px;font-weight:800;line-height:1.3';
      const CW = PHONE ? 140 : 190, CH = PHONE ? 84 : 112, cvs = document.createElement('canvas'); cvs.width = CW * 2; cvs.height = CH * 2; cvs.style.cssText = 'display:block;width:' + CW + 'px;height:' + CH + 'px;margin:3px auto 0';
      box.append(Object.assign(document.createElement('div'), { textContent: '회전 속도 v – 거리 r' }), cvs); view.appendChild(box);
      const g2 = cvs.getContext('2d');
      function drawChart() {
        const S = cvs.width, H = cvs.height, L = 34, B = 26, T = 10, R = 10; g2.clearRect(0, 0, S, H);
        const X = (r) => L + r / 30 * (S - L - R), Y = (v) => T + (1 - v / 260) * (H - T - B);
        g2.strokeStyle = 'rgba(255,255,255,.28)'; g2.lineWidth = 2; g2.beginPath(); g2.moveTo(L, T); g2.lineTo(L, H - B); g2.lineTo(S - R, H - B); g2.stroke();
        g2.fillStyle = 'rgba(232,238,252,.85)'; g2.font = '700 20px sans-serif'; g2.textAlign = 'center'; g2.fillText('r (kpc)', (L + S - R) / 2, H - 3); g2.textAlign = 'right'; g2.fillText('220', L - 4, Y(220) + 6);
        const draw = (f, color, dash, w) => { g2.strokeStyle = color; g2.lineWidth = w; g2.setLineDash(dash); g2.beginPath(); for (let r = 0.5; r <= 30; r += 0.5) { const x = X(r), y = Y(f(r)); r === 0.5 ? g2.moveTo(x, y) : g2.lineTo(x, y); } g2.stroke(); g2.setLineDash([]); };
        const gx = st.gal ? ((window.__sim || {}).GALS || [])[st.gal] : null;   // 다른 은하: 2D처럼 케플러 예상(빨간 점선)과 비교해요
        if (gx && gx.r0) { const v0 = gx.V[gx.R.indexOf(gx.r0)]; g2.strokeStyle = '#f87171'; g2.lineWidth = 3; g2.setLineDash([8, 7]); g2.beginPath(); for (let r = gx.r0; r <= 30; r += 0.5) { const x = X(r), y = Y(v0 * Math.sqrt(gx.r0 / r)); r === gx.r0 ? g2.moveTo(x, y) : g2.lineTo(x, y); } g2.stroke(); g2.setLineDash([]); }
        else draw(vVis, '#ffa94d', st.mode === 'vis' ? [] : [8, 7], st.mode === 'vis' ? 4.5 : 3);
        draw(vObs, '#7ab8ff', st.mode === 'vis' ? [8, 7] : [], st.mode === 'vis' ? 3 : 4.5);
        if (st.mode === 'model') draw(vModel, '#c4a8ff', [], 4);
        trs.forEach((q) => { const v = st.mode === 'vis' ? vVis(q.t.r) : st.mode === 'model' ? vModel(q.t.r) : vObs(q.t.r); g2.fillStyle = '#' + q.t.c.toString(16).padStart(6, '0'); g2.beginPath(); g2.arc(X(q.t.r), Y(v), 7, 0, 7); g2.fill(); });
        g2.textAlign = 'left'; g2.font = '700 18px sans-serif'; if (gx && gx.r0) { g2.fillStyle = '#f87171'; g2.fillText('케플러 예상', X(14), Y(gx.V[gx.R.indexOf(gx.r0)] * Math.sqrt(gx.r0 / 14)) + 30); } else { g2.fillStyle = '#ffa94d'; g2.fillText('보이는 질량만', X(14), Y(vVis(14)) - 26); } g2.fillStyle = '#7ab8ff'; g2.fillText('실제 관측', X(2), Y(vObs(24)) - 16);
      }

      /* 2D 단계에서 고른 r(안쪽 질량 단계) · 은하 · 헤일로 질량을 그대로 보여 줘요 */
      const rMark = new THREE.Mesh(new THREE.TorusGeometry(1, 0.012, 6, 96), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 })); rMark.rotation.x = Math.PI / 2; root.add(rMark);
      const labMark = label('', [0, 0, 0], { size: 11.5, color: 'rgba(15,25,60,.92)' });
      function text() {
        const w = window.__sim || {}, S = w.S || {};
        const gn = (w.GALS && w.GALS[st.gal]) ? w.GALS[st.gal].n : '우리은하';
        if (st.view === 'halo') info('<b>' + gn + '</b> · 관측(<b style="color:#7ab8ff">파랑</b>)은 바깥에서도 속도가 거의 <b>일정</b>해요.' + (st.gal === 0 ? '<br>헤일로 질량 ' + st.mh.toFixed(1) + '×10¹¹ M☉ (30 kpc 안쪽) → 모형 곡선(<b style="color:#c4a8ff">보라</b>)이 관측에 가까워져요.' : '<br>이 은하도 평평한 곡선이에요 → 보이지 않는 질량이 있어요.'));
        else if (st.view === 'mass') info('<b>안쪽 질량 M(&lt;r) = r v² / G</b><br>r = ' + curR[st.ri] + ' kpc에서 회전 속도 v = ' + curV[st.ri] + ' km/s<br>바깥에서도 v가 거의 일정해요 → r이 클수록 안쪽 질량이 커져요.');
        else if (st.mode === 'vis') info('<b>보이는 물질만</b>: 바깥으로 갈수록 케플러 법칙처럼 <b>느려져야</b> 해요.<br>실제 관측과 맞지 않아요.');
        else info('<b>실제 관측</b>: 바깥에서도 속도가 거의 <b>일정</b>해요 (평평한 회전 곡선).');
      }
      function layoutView() {
        const S = sr() || {};
        haloG.visible = st.view === 'halo' && st.gal === 0 && st.mh > 0.02; labHalo.show(haloG.visible);
        haloG.children.forEach((c, i) => { if (c.material) c.material.opacity = c.isPoints ? 0.55 * Math.min(1, st.mh / 2.4) : (i === 0 ? 0.1 : 0.05) * Math.min(1, st.mh / 2.4 + 0.15); });
        const mk = st.view === 'mass'; rMark.visible = mk; labMark.show(mk);
        if (mk) { const r = curR[st.ri]; rMark.scale.setScalar(r * SC); labMark.obj = [r * SC, 0.1, 0]; labMark.set('r = ' + r + ' kpc'); }
        text();
      }
      /* ▶ 재생: 은하가 돌아요 (태양 위치에서 한 바퀴 ≈ 12초). 안쪽 별이 더 빨리 돌아요 */
      const player = controls.player({
        duration: 24, loop: true, autoplay: true, label: '재생',
        phases: [[0, '회전 시작'], [0.5, '회전 중']],
        onFrame(p) { st.T = p * 24; },
      });

      function follow() {
        const w = window.__sim, S = sr(); if (!S) return;
        const gi = S.view === 'halo' ? (S.gal || 0) : 0, mh = S.view === 'halo' ? (S.mh || 0) : 0, free = !!(w && w.game && w.game.free);
        const key = [S.view, gi, S.ri, mh, free].join('|');
        if (key === st.key) return; st.key = key;
        st.view = S.view; st.gal = gi; st.ri = Math.max(0, Math.min(8, S.ri || 0)); st.mh = mh; mhNow = mh;
        const g = w && w.GALS && w.GALS[gi]; if (g) { curR = g.R; curV = g.V; } else { curR = MWR; curV = MWV; }
        st.mode = S.view === 'halo' ? (gi === 0 && mh > 0 ? 'model' : 'obs') : (S.view === 'solar' || S.view === 'light') ? 'vis' : 'obs';
        layoutView();
      }
      follow(); layoutView();

      const K = TAU / 12 / (220 / 8);                     // 태양 위치에서 한 바퀴 ≈ 12초
      return {
        update(dt) {
          follow(); st.t = st.T;
          const f = st.mode === 'vis' ? vVis : st.mode === 'model' ? vModel : vObs;
          for (let i = 0; i < N; i++) {
            const r = rr[i], th = th0[i] + (f(r) / Math.max(r, 0.3)) * K * st.t * (r < 0.3 ? 0 : 1);
            pos[i * 3] = r * SC * Math.cos(th); pos[i * 3 + 1] = yy[i]; pos[i * 3 + 2] = -r * SC * Math.sin(th);
          }
          g.attributes.position.needsUpdate = true;
          trs.forEach((q) => { const th = q.th + (f(q.t.r) / q.t.r) * K * st.t; q.m.position.set(q.t.r * SC * Math.cos(th), 0, -q.t.r * SC * Math.sin(th)); });
          drawChart();
        },
        sync() { st.key = ''; follow(); },
      };
    },
  });
})();
