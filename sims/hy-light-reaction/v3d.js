/* hy-light-reaction · 3D 틸라코이드 막의 명반응
   빛 → 광계 Ⅱ(물 분해 · O₂ · e⁻) → 플라스토퀴논(PQ) → 시토크롬 b₆f(H⁺ 펌프) → 플라스토사이아닌(PC) → 광계 Ⅰ(빛) → 페레독신(Fd) → NADP⁺ 환원 효소 → NADPH
   막 안쪽(루멘)에 쌓인 H⁺가 ATP 합성 효소를 지나 스트로마로 흐르면서 ATP가 만들어져요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const narrow = window.innerWidth < 600 || window.innerHeight > window.innerWidth * 1.1;
  const X = { II: -4.0, b6f: -1.6, I: 0.6, fnr: 1.9, syn: 4.0 };

  window.SciSim3D.attach({
    title: '틸라코이드 막 명반응 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: narrow ? 12.8 : 10.4, theta: 0.18, phi: 1.36, target: narrow ? [-0.3, 0, 0] : [0, 0.3, 0], min: 6, max: 22 },
    autoRotate: 0,
    levels: [1, 2, 3],   // 1단계(빛 흡수 · 파장)는 2D 화면, 물 분해 · ATP 생성 · 조건 변화 단계에서 3D로 시작
    build(ctx) {
      /* 3D 화면 위 작은 판(기록표 · 카드 등): 2D 캔버스에만 그려지던 것을 3D 단계에서도 보이게 해요 */
      function v3pan(cls) {
        if (!document.getElementById('v3pan-css')) { const s = document.createElement('style'); s.id = 'v3pan-css'; s.textContent =
          '.v3pan{position:absolute;z-index:2;padding:6px 9px;border-radius:12px;background:rgba(8,12,24,.8);border:1px solid rgba(255,255,255,.16);color:#fff;font-size:12px;font-weight:700;line-height:1.35;pointer-events:none;max-width:48%}' +
          '.v3pan:empty{display:none}.v3pan.tr{right:10px;top:10px}.v3pan.bl{left:10px;bottom:10px}.v3pan .h{font-weight:900;margin-bottom:3px;font-size:12.5px}.v3pan .chip{display:inline-block;margin:1px 2px;padding:0 6px;border-radius:7px;background:rgba(255,255,255,.16);color:#eef3ff}.v3pan .chip.sel{background:#ffd34d;color:#1b2333}.v3pan.card{background:#fffdf7;color:#1b2333;border-top:5px solid var(--kc,#ffd34d);white-space:normal;max-width:min(260px,46%)}.v3pan.card .s{font-size:11.5px;font-weight:600;color:#475569}' +
          '.v3pan table{border-collapse:collapse}.v3pan th,.v3pan td{padding:1px 5px;text-align:center;white-space:nowrap}.v3pan th{color:#b9c6e4;text-align:left;font-weight:800}.v3pan td.e{color:#56658a}.v3pan .ok{color:#7ee2a8}.v3pan .hi{color:#ffd34d}' +
          '@media (max-width:599px){.v3pan{font-size:10.5px;padding:4px 6px;max-width:58%}.v3pan.tr{top:auto;bottom:30px;right:8px}.v3pan.bl{left:8px;bottom:8px;max-width:42%}.v3pan th,.v3pan td{padding:0 3px}.v3pan .h{font-size:11px}}';
          document.head.appendChild(s); }
        const el = document.createElement('div'); el.className = 'v3pan ' + (cls || 'tr'); ctx.renderer.domElement.parentElement.appendChild(el);
        let last = ''; el.put = (html) => { if (html !== last) { last = html; el.innerHTML = html; } }; return el;
      }
      const { THREE, root, label, info, controls } = ctx;
      const V = THREE.Vector3;
      if (narrow) root.rotation.z = Math.PI / 2;      // 휴대폰(세로 화면)에서는 눕혀 둔 모형을 세워서 보여 줘요
      let light = 0.7, minor = false, treat = 'none', cyc = false, pulseAuto = true;
      const std = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.42, metalness: 0.04 }, o || {}));
      const A = (p) => { const o = new THREE.Object3D(); o.position.set(p[0], p[1], p[2]); root.add(o); return o; };

      /* ---------- 틸라코이드 막 ---------- */
      {
        const NX = 22, NZ = 4, SX = 0.5, maxN = NX * NZ * 2;
        const heads = new THREE.InstancedMesh(new THREE.SphereGeometry(0.19, 16, 12), std(0x4ade80, { roughness: 0.35 }), maxN);
        const tails = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.045, 0.045, 0.4, 8), std(0xfbbf24, { roughness: 0.5 }), maxN * 2);
        const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), S1 = new V(1, 1, 1), P = new V();
        const holes = [[X.II, 0, 0.95], [X.b6f, 0, 0.7], [X.I, 0, 0.95], [X.fnr, 0, 0.0], [X.syn, 0, 0.75]];
        let h = 0, t = 0;
        for (let i = 0; i < NX; i++) for (let k = 0; k < NZ; k++) {
          const x = (i - (NX - 1) / 2) * SX + ((k % 2) ? SX / 2 : 0), z = -0.5 - k * 0.46;
          if (Math.abs(x) > 5.6) continue;
          if (holes.some((o) => Math.hypot(x - o[0], z - o[1]) < o[2])) continue;
          for (let s = -1; s <= 1; s += 2) {
            M4.compose(P.set(x, s * 0.44, z), Q, S1); heads.setMatrixAt(h++, M4);
            for (const dx of [-0.07, 0.07]) { M4.compose(P.set(x + dx, s * 0.2, z), Q, S1); tails.setMatrixAt(t++, M4); }
          }
        }
        heads.count = h; tails.count = t; root.add(heads, tails);
      }
      const ell = (x, y, sx, sy, sz, color, extra) => {
        const m = new THREE.Mesh(new THREE.SphereGeometry(1, 36, 24), std(color, Object.assign({ roughness: 0.35 }, extra || {}))); m.scale.set(sx, sy, sz); m.position.set(x, y, 0); root.add(m); return m;
      };
      // 광계 Ⅱ (물 분해 효소가 루멘 쪽에 붙어 있어요)
      const psII = ell(X.II, 0, 0.8, 0.85, 0.75, 0x10b981, { emissive: 0x000000 });
      const oec = ell(X.II + 0.1, 0.9, 0.38, 0.3, 0.35, 0x047857);
      [-1, 1].forEach((s) => ell(X.II + s * 0.95, 0.05, 0.38, 0.62, 0.5, 0x6ee7b7));
      const b6f = ell(X.b6f, 0, 0.55, 0.75, 0.6, 0xf59e0b, { emissive: 0x000000 });
      const psI = ell(X.I, 0, 0.8, 0.8, 0.75, 0x84cc16, { emissive: 0x000000 });
      [-1, 1].forEach((s) => ell(X.I + s * 1.0, 0.05, 0.38, 0.6, 0.5, 0xbef264));
      const fnr = ell(X.fnr, -0.95, 0.45, 0.42, 0.45, 0x38bdf8);
      // ATP 합성 효소
      const synth = new THREE.Group(); synth.position.set(X.syn, 0, 0); root.add(synth);
      const rotor = new THREE.Group(); synth.add(rotor);
      const rotMat = std(0xa78bfa);
      for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2, c = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.55, 8, 14), rotMat); c.position.set(Math.cos(a) * 0.4, 0, Math.sin(a) * 0.4); rotor.add(c); }
      const gam = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.6, 14), std(0xfacc15, { emissive: 0x3a2a00 })); gam.position.y = -0.9; rotor.add(gam);
      const aSub = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.9, 0.5), std(0x7c3aed)); aSub.position.set(0.72, 0, 0); synth.add(aSub);
      const F1 = new THREE.Group(); F1.position.y = -1.5; synth.add(F1);
      const bMats = [0, 1, 2].map(() => std(0x34d399)), aMat = std(0x7dd3fc), betas = [];
      for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2, isB = i % 2 === 0, m = new THREE.Mesh(new THREE.SphereGeometry(0.36, 26, 18), isB ? bMats[i / 2] : aMat); m.scale.set(1, 1.3, 1); m.position.set(Math.cos(a) * 0.42, 0, Math.sin(a) * 0.42); F1.add(m); if (isB) betas.push({ a }); }
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.3, 10), std(0x94a3b8)); arm.position.set(0.82, -0.7, 0); synth.add(arm);

      /* ---------- 입자 ---------- */
      const eCore = std(0xfef08c, { emissive: 0xa16207, roughness: 0.25 }), eGeo = new THREE.SphereGeometry(0.13, 14, 10);
      const shellGeo = new THREE.SphereGeometry(0.3, 18, 14);
      const shellMats = { pq: std(0xfb923c, { transparent: true, opacity: 0.55, depthWrite: false }), pc: std(0x60a5fa, { transparent: true, opacity: 0.55, depthWrite: false }), fd: std(0xf87171, { transparent: true, opacity: 0.55, depthWrite: false }) };
      const path = new THREE.CatmullRomCurve3([
        [X.II, 0.25, 0], [X.II + 0.8, -0.1, 0.2], [X.II + 1.6, 0.0, 0], [X.b6f, 0, 0], [X.b6f + 0.5, 0.75, 0], [-0.6, 1.2, 0], [X.I - 0.2, 0.7, 0], [X.I, 0.1, 0],
        [X.I + 0.4, -0.6, 0], [X.I + 0.85, -1.1, 0.1], [X.fnr, -1.0, 0],
      ].map((p) => new V(p[0], p[1], p[2])));
      const pathLen = path.getLength();
      const eps = [], photons = [], bits = [];
      const hMat = std(0xfde047, { emissive: 0x7a5a00 }), hGeo = new THREE.SphereGeometry(0.16, 12, 10);
      const phMat = std(0xffffff, { emissive: 0xfff3a0, emissiveIntensity: 1.2, roughness: 0.2 });
      const o2Mat = std(0xef4444), o2Geo = new THREE.SphereGeometry(0.18, 14, 10), nadphMat = std(0x22d3ee, { emissive: 0x064e5a }), atpMat = std(0xfacc15, { emissive: 0x7a5a00 });
      const lumenH = [];
      let nATP = 0, nNADPH = 0, nO2 = 0, nPack = 0;

      function rndLumen() { return new V((Math.random() * 2 - 1) * 5, 0.8 + Math.random() * 1.3, (Math.random() * 2 - 1) * 2); }
      function addLumenH(p) { const m = new THREE.Mesh(hGeo, hMat); m.position.copy(p || rndLumen()); root.add(m); const o = { m, v: new V(Math.random() - .5, Math.random() - .5, Math.random() - .5).setLength(0.9), s: 0 }; lumenH.push(o); return o; }
      function bit(m, from, vel, life, grow) { m.position.copy(from); root.add(m); bits.push({ m, v: vel, t: 0, life, grow, base: m.scale.x }); }
      function photon(from, to, arriveCb) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.14, 14, 10), phMat); m.position.copy(from); root.add(m); photons.push({ m, from: from.clone(), to: to.clone(), t: 0, dur: 0.8, cb: arriveCb }); }
      function flash(mesh) { mesh.material.emissive.setHex(0x9a8a00); setTimeout(() => mesh.material.emissive.setHex(0x000000), 220); }
      function launch() {
        if (treat === 'dry') return;          // 물이 모자라 광계 Ⅱ에 전자를 줄 수 없어요
        nPack++;
        photon(new V(-6.5, 4.6, 0.4), new V(X.II, 1.2, 0.2), () => {
          flash(psII);
          if (treat === 'dcmu') return;       // 억제제: 광계 Ⅱ 뒤의 전자 전달이 막혀요
          // 물 분해: O₂ 와 H⁺
          const w = new THREE.Group(); { const o = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 10), std(0xef4444)); w.add(o); [-1, 1].forEach((s) => { const h = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10), std(0xf1f5f9)); h.position.set(s * 0.2, 0.14, 0); w.add(h); }); }
          bit(w, new V(X.II - 1.4, 1.5, 0.3), new V(0.9, -0.15, 0), 0.9, -1);
          for (let i = 0; i < 2; i++) addLumenH(new V(X.II + 0.1 + i * 0.3, 1.5, 0.3)).s = 0;
          if (nPack % 2 === 0) { const o2 = new THREE.Mesh(o2Geo, o2Mat); bit(o2, new V(X.II - 0.4, 1.4, -0.2), new V(-0.6, 1.0, -0.2), 2.2, -1); nO2++; }
          // 전자 출발
          const g = new THREE.Group(); const c = new THREE.Mesh(eGeo, eCore); g.add(c); const sh = new THREE.Mesh(shellGeo, shellMats.pq); g.add(sh); g.userData = { sh, core: c };
          g.position.copy(path.getPoint(0)); root.add(g); eps.push({ g, u: 0, p2: false, pumped: false });
        });
      }
      function spawnATP(a) {
        const g = new THREE.Group(); g.add(new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), atpMat));
        for (let i = 0; i < 3; i++) { const p = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10), std(0xf472b6)); p.position.set(0.26 + i * 0.19, 0, 0); g.add(p); }
        bit(g, new V(X.syn + Math.cos(a) * 0.9, -1.5, Math.sin(a) * 0.9), new V(Math.cos(a), -0.5, Math.sin(a)).setLength(1.0), 2.2, -1); nATP++;
      }

      const L = {
        lum: label('루멘 (H⁺ 많음)', A([-5.2, 2.3, 0]), { color: '#7c5a10' }),
        str: label('스트로마 (H⁺ 적음)', A([-5.2, -2.1, 0]), { color: '#7c5a10' }),
        ps2: label('광계 Ⅱ', A([X.II, -0.95, 0.4]), { color: '#047857' }),
        bf: label('시토크롬 b₆f', A([X.b6f, -0.95, 0.4]), { color: '#92400e' }),
        ps1: label('광계 Ⅰ', A([X.I, -0.95, 0.4]), { color: '#4d7c0f' }),
        syn: label('ATP 합성 효소', A([X.syn + 0.2, 0.95, 0]), { color: '#5b21b6' }),
        h2o: label('물 분해 → O₂', A([X.II - 1.6, 2.1, 0]), { color: '#991b1b' }),
        nad: label('NADPH', A([X.fnr + 0.3, -2.3, 0]), { color: '#0e7490' }),
        pq: label('PQ', A([X.II + 1.5, 0.55, 0.4]), { color: '#9a3412' }), pc: label('PC', A([-0.6, 1.75, 0]), { color: '#1d4ed8' }), fd: label('Fd', A([X.I + 0.6, -1.6, 0.4]), { color: '#b91c1c' }),
        fn: label('NADP⁺ 환원 효소', A([X.fnr + 0.2, -0.45, 0.4]), { color: '#075985' }),
      };
      function applyLabels() { ['pq', 'pc', 'fd', 'fn'].forEach((k) => L[k].show(minor)); }
      applyLabels();
      /* 2D(S.th)와 같은 값: 빛 세기 0~10 · 처리(없음 · 물 부족 · 억제제) · 순환적 전자 흐름. 3D에서 바꾸면 2D도 같이 바뀌어요 */
      const ctlEl = document.querySelector('.v3-ctl');
      const grp = (fn) => { const n0 = ctlEl ? ctlEl.children.length : 0; fn(); return ctlEl ? Array.prototype.slice.call(ctlEl.children, n0) : []; };
      const showG = (arr, on) => arr.forEach((e) => { e.style.display = on ? '' : 'none'; });
      let rngL, segT, segC, pulseB, tracer = null, player;
      const lesson = () => { const L = ctx.lesson(); return L && L.S && L.S.th ? L : null; };
      const gLight = grp(() => {
        rngL = controls.range('빛 세기', 0, 10, 1, 7, (v) => { light = v / 10; const L = lesson(); if (L) { L.S.th.I = v; L.S.thKeep.I = v; const e = document.getElementById(L.S.mode === 'cond' ? 'sL4' : 'sL3'); if (e) e.value = v; L.updateCtl(); } });
      });
      const gCond = grp(() => {
        segT = controls.segment('처리', [{ value: 'none', label: '없음' }, { value: 'dry', label: '💧 물 부족' }, { value: 'dcmu', label: '🧪 억제제' }], 'none', (v) => { treat = v; const L = lesson(); if (L) { L.S.th.treat = v; L.S.thKeep.treat = v; L.updateCtl(); } text(); });
        segC = controls.segment('순환적 전자 흐름', [{ value: 'off', label: '끔' }, { value: 'on', label: '켬' }], 'off', (v) => { cyc = v === 'on'; const L = lesson(); if (L) { L.S.th.cyc = cyc; L.S.thKeep.cyc = cyc; L.updateCtl(); } text(); });
      });
      const gWater = grp(() => { pulseB = controls.button('☀ 빛 펄스 보내기', () => { const L = lesson(); if (L && L.S.mode === 'water') L.thPulse(); else { launch(); } }); });
      const mb = controls.button('전달체 이름표 보기', () => { minor = !minor; mb.classList.toggle('on', minor); mb.textContent = minor ? '전달체 이름표 가리기' : '전달체 이름표 보기'; applyLabels(); });
      /* ▶ 전자 한 개의 여행: 물 분해 → PQ → 시토크롬 b₆f(H⁺ 펌프) → PC → 광계 Ⅰ → Fd → NADPH */
      tracer = new THREE.Group();
      { const c = new THREE.Mesh(new THREE.SphereGeometry(0.2, 18, 14), std(0xfff3a0, { emissive: 0xfde047, emissiveIntensity: 1.1 })); const sh = new THREE.Mesh(new THREE.SphereGeometry(0.42, 20, 16), std(0xfb923c, { transparent: true, opacity: 0.4, depthWrite: false })); tracer.add(c, sh); tracer.userData.sh = sh; tracer.visible = false; root.add(tracer); }
      const gPlay = grp(() => {
        player = controls.player({
          duration: 9, loop: true, autoplay: false, label: '전자의 여행',
          phases: [[0, '광계 Ⅱ · 물 분해'], [0.12, 'PQ'], [0.3, 'b₆f · H⁺ 펌프'], [0.42, 'PC'], [0.55, '광계 Ⅰ'], [0.7, 'Fd → NADPH']],
          onFrame(p) {
            const on = p > 0 || !!(player && player.playing); tracer.visible = on;
            if (!on) return;
            tracer.position.copy(path.getPoint(Math.min(0.999, p)));
            const sh = tracer.userData.sh, u = p;
            sh.material.color.setHex(u < 0.3 ? 0xfb923c : u < 0.66 ? 0x60a5fa : 0xf87171);
          },
        });
      });
      function modeCtl() {
        const L = lesson(), m = L ? L.S.mode : 'cond';
        showG(gLight, m === 'atp' || m === 'cond' || m === 'abs'); showG(gCond, m === 'cond'); showG(gWater, m === 'water');
      }
      let lastM = '', lastP = 0, lastTreat = null;
      function poll() {
        const L = lesson(); if (!L) return;
        const m = L.S.mode, th = L.S.th;
        if (m !== lastM) { lastM = m; modeCtl(); }
        if (m === 'water') { light = 0; if (th.pulses !== lastP) { lastP = th.pulses; launch(); } }
        else { light = m === 'abs' ? light : th.I / 10; rngL.set(th.I); lastP = th.pulses; }
        if (th.treat !== treat) { treat = th.treat; segT.set(treat); text(); }
        if (th.cyc !== cyc) { cyc = th.cyc; segC.set(cyc ? 'on' : 'off'); text(); }
        if (m === 'cond') { segT.set(th.treat); segC.set(th.cyc ? 'on' : 'off'); }
        const cv = m === 'atp' && L.S.at && L.S.at.view === 'cmp';
        if (cv !== cmpOn) { cmpOn = cv; text(); }
      }
      /* 2D 실험판의 값(물에서 보충한 전자 칸 · 내부 pH · 생성 속도)을 3D 화면 오른쪽 위에 보여 줘요 */
      const panR = v3pan('tr');
      function drawPan() {
        const L = lesson(); if (!L) { panR.put(''); return; }
        const m = L.S.mode, th = L.S.th, f1 = (v) => (Math.round(v * 10) / 10).toFixed(1);
        const bar = (t, v, mx, col, tx) => '<tr><th>' + t + '</th><td style="text-align:left"><span style="display:inline-block;height:9px;border-radius:5px;vertical-align:middle;background:' + col + ';width:' + Math.round(70 * Math.max(0, Math.min(1, v / mx))) + 'px"></span></td><td>' + tx + '</td></tr>';
        if (m === 'water') {
          let dots = ''; for (let i = 0; i < 4; i++) dots += '<span style="display:inline-block;width:14px;height:14px;margin:0 2px;border-radius:50%;vertical-align:middle;background:' + (i < th.wq ? '#fde047' : 'rgba(255,255,255,.18)') + '"></span>';
          panR.put('<div class="h">물에서 보충한 전자</div>' + dots + ' ' + th.wq + ' / 4<div style="margin-top:3px">빛 펄스 ' + th.pulses + '회 · 분해된 물 ' + th.o2 * 2 + ' · O₂ ' + th.o2 + '</div>');
        } else if (m === 'atp') {
          const ph = 8 - 3 * Math.max(0, Math.min(1, th.H / 60));
          panR.put('<table>' + bar('내부 pH', 8 - ph, 3, '#f97316', f1(ph)) + '</table><div>ATP ' + th.atp + '개 · NADPH ' + th.nadph + '개 · O₂ ' + th.o2 + '분자</div>');
        } else if (m === 'cond' && th.rate) {
          const r = th.rate, mx = Math.max(3, r.atp, r.np, r.o2);
          panR.put('<div class="h">생성 속도 (/초)</div><table>' + bar('ATP', r.atp, mx, '#f59e0b', f1(r.atp)) + bar('NADPH', r.np, mx, '#0ea5e9', f1(r.np)) + bar('O₂', r.o2, mx, '#ef4444', f1(r.o2)) + '</table>');
        } else panR.put('');
      }
      let cmpOn = false;   // 🔁 미토콘드리아와 비교: 안내 창에 H⁺ 방향 비교를 덧붙여요
      modeCtl();
      function text() {
        const note = treat === 'dry' ? '<br><span style="color:#fca5a5">💧 물이 모자라 광계 Ⅱ에 전자를 줄 수 없어요.</span>' : treat === 'dcmu' ? '<br><span style="color:#fca5a5">🧪 억제제가 광계 Ⅱ 뒤의 전자 전달을 막아요.</span>' : cyc ? '<br><span style="color:#a7f3d0">🔁 광계 Ⅰ의 전자가 전달계로 되돌아와요.</span>' : '';
        const cmp = cmpOn ? '<br><b>🔁 미토콘드리아와 비교</b> · H⁺를 퍼 올리는 방향<br>엽록체: 스트로마 → <b>틸라코이드 내부</b>(H⁺ 쌓임) · 미토콘드리아: 기질 → <b>막 사이 공간</b>(H⁺ 쌓임). 두 곳 모두 H⁺가 ATP 합성 효소를 지나 돌아오며 ATP를 만들어요.' : '';
        info('빛으로 <b>물이 분해</b>되고 전자가 이동해요. H⁺ 기울기로 <b>ATP</b>, 마지막에 <b>NADPH</b>가 만들어져요.' + note + cmp);
      }

      for (let i = 0; i < 10; i++) addLumenH().s = 1;
      let cycAcc = 0, spawnAcc = 1, ang = 0, stepAcc = 0, cnt = 0, infoT = 0, w = 0;
      return {
        update(dt) {
          dt = Math.min(dt, 0.05) * (window.__v3dTS || 1);
          poll(); drawPan();
          if (cyc && treat === 'dry' && light > 0) { cycAcc += light * 1.0 * dt; if (cycAcc >= 1) { cycAcc = 0; photon(new V(-3.0, 4.8, -0.3), new V(X.I, 1.1, 0.2), () => { flash(psI); flash(b6f); for (let k = 0; k < 2; k++) { const o = addLumenH(new V(X.b6f + (k - 0.5) * 0.4, -0.9, 0)); o.s = 1; o.rise = 0; } }); } }
          spawnAcc += light * 1.2 * dt; if (spawnAcc >= 1 && eps.length < 7) { spawnAcc -= 1; launch(); } else if (spawnAcc >= 1) spawnAcc = 1;
          // 빛 알갱이
          for (let i = photons.length - 1; i >= 0; i--) { const p = photons[i]; p.t += dt; p.m.position.lerpVectors(p.from, p.to, Math.min(1, p.t / p.dur)); if (p.t >= p.dur) { root.remove(p.m); photons.splice(i, 1); p.cb(); } }
          // 전자
          for (let i = eps.length - 1; i >= 0; i--) {
            const e = eps[i]; e.u += dt * 2.0 / pathLen; const u = Math.min(1, e.u);
            e.g.position.copy(path.getPoint(u));
            const sh = e.g.userData.sh;
            if (u < 0.3) { sh.material = shellMats.pq; sh.visible = true; } else if (u < 0.36) sh.visible = false; else if (u < 0.66) { sh.material = shellMats.pc; sh.visible = true; } else if (u < 0.74) sh.visible = false; else { sh.material = shellMats.fd; sh.visible = true; }
            if (u > 0.34 && !e.pumped) { e.pumped = true; flash(b6f); for (let k = 0; k < 2; k++) { const m = new THREE.Mesh(hGeo, hMat); const o = addLumenH(new V(X.b6f + (k - 0.5) * 0.4, -0.9, 0)); o.s = 1; o.m.position.set(X.b6f + (k - 0.5) * 0.4, -0.9, 0); o.rise = 0; } }
            if (u > 0.55 && !e.p2) { e.p2 = true; photon(new V(-3.0, 4.8, -0.3), new V(X.I, 1.1, 0.2), () => flash(psI)); }
            if (u >= 1) { eps.splice(i, 1); root.remove(e.g); if (cyc) { for (let k = 0; k < 2; k++) { const o = addLumenH(new V(X.b6f + (k - 0.5) * 0.4, -0.9, 0)); o.s = 1; o.rise = 0; } flash(b6f); continue; } nNADPH++; const m = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), nadphMat); bit(m, new V(X.fnr + 0.1, -1.4, 0), new V(0.5, -0.9, 0.2), 2.0, -1); flash(fnr); }
          }
          // ATP 합성 효소 · 루멘 H⁺
          const target = Math.round(3 + light * 18), lumenN = lumenH.length;
          w = light * 3.0; ang += w * dt; rotor.rotation.y = -ang;
          const stp = Math.floor(ang / (Math.PI * 2 / 3));
          bMats.forEach((m, i) => { const s = (stp + i) % 3; m.color.setHex(s === 0 ? 0x86efac : s === 1 ? 0x22c55e : 0x15803d); });
          if (stp !== cnt) { cnt = stp; if (light > 0.02) spawnATP(betas[stp % 3].a + 0.2); }
          stepAcc += w * dt / (Math.PI * 2 / 10);
          while (stepAcc >= 1 && lumenH.length > 3) {
            stepAcc -= 1;
            let bi = 0, bd = 1e9; lumenH.forEach((o, i) => { const d = Math.hypot(o.m.position.x - X.syn, o.m.position.y - 1); if (d < bd) { bd = d; bi = i; } });
            const o = lumenH.splice(bi, 1)[0];
            bit(o.m, o.m.position.clone(), new V(0, -1, 0), 1.0, -1); bits[bits.length - 1].path = [o.m.position.clone(), new V(X.syn + 0.7, 0.8, 0), new V(X.syn + 0.7, -0.4, 0), new V(X.syn + 0.9, -1.4, 0)];
          }
          if (stepAcc > 1) stepAcc = 1;
          while (lumenH.length < Math.max(3, target * 0.7) && Math.random() < 0.03) addLumenH();
          while (lumenH.length > target + 4) { const o = lumenH.pop(); root.remove(o.m); }
          lumenH.forEach((o) => {
            o.v.x += (Math.random() - 0.5) * 6 * dt; o.v.y += (Math.random() - 0.5) * 6 * dt; o.v.z += (Math.random() - 0.5) * 6 * dt; o.v.setLength(Math.max(0.6, Math.min(1.3, o.v.length())));
            const p = o.m.position; p.addScaledVector(o.v, dt);
            if (o.rise !== undefined) { p.y += 1.6 * dt; if (p.y > 0.9) delete o.rise; return; }
            if (Math.abs(p.x) > 5.3) { p.x = Math.sign(p.x) * 5.3; o.v.x *= -1; } if (Math.abs(p.z) > 2) { p.z = Math.sign(p.z) * 2; o.v.z *= -1; }
            if (p.y > 2.3) { p.y = 2.3; o.v.y *= -1; } if (p.y < 0.75) { p.y = 0.75; o.v.y = Math.abs(o.v.y); }
            if (o.s < 1) { o.s = Math.min(1, o.s + dt * 3); o.m.scale.setScalar(o.s); }
          });
          // 날아가는 조각들
          for (let i = bits.length - 1; i >= 0; i--) {
            const b = bits[i]; b.t += dt;
            if (b.path) { const n = b.path.length - 1, f = Math.min(1, b.t / 0.8) * n, j = Math.min(n - 1, Math.floor(f)); b.m.position.lerpVectors(b.path[j], b.path[j + 1], f - j); }
            else b.m.position.addScaledVector(b.v, dt);
            if (b.grow < 0) { const k = b.t / b.life; b.m.scale.setScalar(Math.max(0.01, k > 0.6 ? 1 - (k - 0.6) / 0.4 : 1)); }
            if (b.t >= (b.path ? 0.8 : b.life)) { root.remove(b.m); bits.splice(i, 1); }
          }
          infoT += dt; if (infoT > 0.4) { infoT = 0; text(); }
        },
        sync() { poll(); text(); },
      };
    },
  });
})();
