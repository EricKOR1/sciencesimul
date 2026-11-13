/* h1-geologic-time · 3D 지층 기둥과 화석
   2D 실험과 같아요: 절벽 단면의 지층 6겹(위 = 새로움, 아래 = 오래됨)을 위에서부터 차례로 파면 층마다 다른 화석이 나오고,
   화석이 크게 바뀌는 경계가 3곳 있어요. 지질시대 이름과 연대는 2D의 ERAS와 같아요. (▶ 재생: 아래 지층부터 쌓이는 순서)
   2D에서 파낸 지층(ST.dug)과 3D가 서로 맞춰져요.
   2단계 지구 시계(46억 년 = 24시간 · 경계 표시), 3단계 환경 변화(대륙 · 산소 · 오존층 · 생물 · 기온 · 시간 띠), 4단계 생물 변화 예측(환경 장면 + 생물의 종류 수 막대)도 2D와 같은 값으로 보여 줘요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHN = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);

  window.SciSim3D.attach({
    title: '3D 지층과 화석',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: PHN ? 18 : 15, theta: 0.45, phi: 1.2, target: [0, 3.4, 0], min: 7, max: 30 },
    autoRotate: 0.12,
    levels: [0],
    build(ctx) {
      const { THREE, root, info, controls } = ctx;
      const oldLabs = []; let capLab = true; const label = (...a) => { const l = ctx.label(...a); if (capLab) oldLabs.push(l); return l; };
      const mat = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ envMapIntensity: 0.6, color: c, roughness: 0.85, metalness: 0.02 }, o || {}));
      const W = 6.4, D = 3.6, H = 1.05, N = 6;
      /* 2D의 LAYERS (위 → 아래) 와 ERAS */
      const LAY = [
        { name: '매머드', col: 0xcdaa72, era: 3, note: '코끼리와 닮은 털북숭이 큰 포유류' },
        { name: '화폐석', col: 0xc29c62, era: 3, note: '동전처럼 생긴 바다 생물' },
        { name: '공룡 뼈', col: 0xab824f, era: 2, note: '땅 위를 걷던 거대한 파충류' },
        { name: '암모나이트', col: 0x9c7449, era: 2, note: '소라처럼 감긴 껍데기의 바다 동물' },
        { name: '삼엽충·필석', col: 0x826c58, era: 1, note: '아주 오래된 바다 생물' },
        { name: '화석 거의 없음', col: 0x625d55, era: 0, note: '눈에 띄는 화석이 거의 없어요' },
      ];
      const ERA = [
        { key: 'pre', name: '선캄브리아시대', yr: '46억 ~ 5.4억 년 전', col: '#8a7a64', dur: '약 21시간 11분 (약 88 %)' },
        { key: 'pal', name: '고생대', yr: '5.4억 ~ 2.5억 년 전', col: '#2fa56b', dur: '약 1시간 30분 (약 6 %)' },
        { key: 'mes', name: '중생대', yr: '2.5억 ~ 6600만 년 전', col: '#e08a2e', dur: '약 58분 (약 4 %)' },
        { key: 'cen', name: '신생대', yr: '6600만 년 전 ~ 현재', col: '#3b82f6', dur: '약 21분 (약 1.4 %)' },
      ];
      const BOUNDS = [2, 4, 5], BCOL = [0xef4444, 0x8b5cf6, 0x0ea5e9], BCSS = ['#ef4444', '#8b5cf6', '#0ea5e9'];
      const fossilMat = (c) => ctx.mats.ceramic(c, { extra: { roughness: 0.5, clearcoat: 0.25, clearcoatRoughness: 0.5, envMapIntensity: 0.6 } });   // 뼈·껍데기 화석: 매끈하고 은은한 광택

      /* ---------- 화석 모형 ---------- */
      function stromatolite() {
        const g = new THREE.Group();
        [[0, 0.5, 0.28], [0.02, 0.38, 0.4], [0.0, 0.26, 0.52]].forEach((p, i) => {
          const m = new THREE.Mesh(new THREE.SphereGeometry(p[2], 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), fossilMat(i % 2 ? 0xb9a57b : 0x9d8a62));
          m.position.y = -0.3 + i * 0.1; m.scale.set(1.5, 0.8, 0.5); g.add(m);
        });
        return g;
      }
      function trilobite() {
        const g = new THREE.Group(), m = fossilMat(0x4a3d34);
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.34, 24, 14), m); head.scale.set(1.15, 0.55, 0.3); head.position.x = -0.62; g.add(head);
        for (let i = 0; i < 7; i++) {
          const s = new THREE.Mesh(new THREE.SphereGeometry(0.3 - i * 0.022, 20, 12), m);
          s.scale.set(0.34, 0.95 - i * 0.04, 0.3); s.position.x = -0.28 + i * 0.17; g.add(s);
        }
        const tail = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 10), m); tail.scale.set(0.9, 0.9, 0.3); tail.position.x = 0.98; g.add(tail);
        const rib = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.7, 8), fossilMat(0x6a594c)); rib.rotation.z = Math.PI / 2; rib.position.set(0.16, 0, 0.1); g.add(rib);
        g.scale.setScalar(0.85); return g;
      }
      function fern() {
        const g = new THREE.Group(), m = fossilMat(0x24462f);
        const pts = []; for (let i = 0; i <= 12; i++) pts.push(new THREE.Vector3(Math.sin(i * 0.2) * 0.08, -0.45 + i * 0.085, 0));
        g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.025, 6, false), m));
        for (let i = 1; i < 12; i++) for (const s of [-1, 1]) {
          const l = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), m); const len = 0.34 * (1 - i / 14);
          l.scale.set(len / 0.1, 0.35, 0.25); l.position.set(pts[i].x + s * len * 0.55, pts[i].y + 0.04, 0); l.rotation.z = s * 0.45; g.add(l);
        }
        return g;
      }
      function ammonite() {
        const g = new THREE.Group(), m = fossilMat(0x8a5a2b), m2 = fossilMat(0xa97339), n = 46;
        for (let i = 0; i < n; i++) {
          const t = i / (n - 1), a = t * Math.PI * 4.6, r = 0.05 + t * 0.52 * (0.45 + 0.55 * t);
          const rr = 0.04 + t * 0.15;
          const s = new THREE.Mesh(new THREE.SphereGeometry(rr, 8, 6), i % 6 < 3 ? m : m2);
          s.position.set(Math.cos(a) * r, Math.sin(a) * r, 0); s.scale.z = 0.7; g.add(s);
        }
        g.scale.setScalar(0.95); return g;
      }
      function bone() {
        const g = new THREE.Group(), m = fossilMat(0xece3cf);
        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.1, 14), m); shaft.rotation.z = Math.PI / 2 - 0.35; g.add(shaft);
        [[-1, 1], [1, -1]].forEach(([sx, sy]) => {
          const dx = Math.cos(0.35) * 0.55 * sx, dy = Math.sin(0.35) * 0.55 * sx;
          [-0.09, 0.09].forEach((o) => { const k = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 10), m); k.position.set(dx - Math.sin(0.35) * o, dy + Math.cos(0.35) * o, 0); g.add(k); });
        });
        return g;
      }
      function tusk() {
        const g = new THREE.Group(), m = fossilMat(0xf1e6c9), n = 22;
        for (let i = 0; i < n; i++) {
          const t = i / (n - 1), a = -0.3 + t * 1.9;
          const s = new THREE.Mesh(new THREE.SphereGeometry(0.2 * (1 - t * 0.85) + 0.03, 10, 8), m);
          s.position.set(Math.sin(a) * 0.8 - 0.4, -Math.cos(a) * 0.8 + 0.4, 0); g.add(s);
        }
        return g;
      }
      function nummulite() {
        const g = new THREE.Group();
        [[0, 0, 0.3], [0.55, 0.25, 0.22], [-0.45, 0.35, 0.18]].forEach((p, i) => {
          const m = new THREE.Mesh(new THREE.CylinderGeometry(p[2], p[2], 0.1, 24), fossilMat(i ? 0xe4d6a8 : 0xd8c88e)); m.rotation.x = Math.PI / 2; m.position.set(p[0], p[1], 0);
          g.add(m);
          const r = new THREE.Mesh(new THREE.TorusGeometry(p[2] * 0.6, 0.012, 6, 24), fossilMat(0x8d7c45)); r.position.set(p[0], p[1], 0.055); g.add(r);
        });
        return g;
      }

      function graptolite() {
        const g = new THREE.Group(), m = fossilMat(0x3a3330);
        const stem = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.05, 0.08), m); stem.rotation.z = 0.25; g.add(stem);
        for (let i = 0; i < 7; i++) { const t = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.3, 0.07), m); t.position.set(-0.55 + i * 0.18, -0.14 + i * 0.045, 0); t.rotation.z = 0.5; g.add(t); }
        return g;
      }

      /* ---------- 지층 기둥 (지층 1이 맨 위) ---------- */
      const topY = N * H, frontZ = D / 2;
      const yBot = (i) => (N - 1 - i) * H;
      const lay = LAY.map((L, i) => {
        const grp = new THREE.Group(); grp.position.y = yBot(i); root.add(grp);
        const m = ctx.mats.stone(new THREE.Color(L.col).multiplyScalar(0.8), { cracks: i >= 3, repeat: 2 + (i % 3), bump: 0.05 + 0.012 * i });   // 퇴적암: 층마다 결이 조금씩 달라요
        const b = new THREE.Mesh(new THREE.BoxGeometry(W, H - 0.014, D), m); b.position.y = H / 2; b.castShadow = true; b.receiveShadow = true; grp.add(b);
        const ln = new THREE.Mesh(new THREE.BoxGeometry(W + 0.004, 0.02, D + 0.004), mat(0x2a2620, { roughness: 1 })); grp.add(ln);
        return { grp, mats: [m, ln.material], fos: null, nameLab: null, num: null };
      });
      // 파낸 굴 (2D의 굴과 같아요)
      const shaftM = ctx.mats.stone(0x2a1f16, { cracks: true, repeat: 2, bump: 0.08 });
      const shaft = new THREE.Mesh(new THREE.BoxGeometry(2.7, 1, 0.1), shaftM); shaft.visible = false; root.add(shaft);
      // 맨 위 흙 + 풀
      const soil = new THREE.Mesh(new THREE.BoxGeometry(W + 0.02, 0.14, D + 0.02), [0, 1, 2, 3, 4, 5].map((q) => (q === 2 ? ctx.mats.stone(0x4a8a34, { repeat: 6, bump: 0.07 }) : ctx.mats.stone(0x5a4630, { repeat: 4, bump: 0.05 })))); soil.position.y = topY + 0.07; soil.receiveShadow = true; root.add(soil);   // 겉흙(갈색) + 풀밭(위)
      { const NT = 520, tuft = new THREE.InstancedMesh(new THREE.ConeGeometry(0.03, 0.16, 4, 1), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 }), NT), o = new THREE.Object3D(), c = new THREE.Color(); let sd = 17; const rn = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
        for (let q = 0; q < NT; q++) { o.position.set((rn() - 0.5) * (W - 0.1), 0.12, (rn() - 0.5) * (D - 0.1)); o.rotation.set((rn() - 0.5) * 0.5, rn() * 6.3, (rn() - 0.5) * 0.5); o.scale.set(1, 0.6 + rn(), 1); o.updateMatrix(); tuft.setMatrixAt(q, o.matrix); tuft.setColorAt(q, c.setHSL(0.26 + rn() * 0.07, 0.5, 0.25 + rn() * 0.14)); }
        tuft.userData.v3bg = true; soil.add(tuft); }   // 풀잎

      function addFossil(i, objs) {
        const g = new THREE.Group(); g.position.set(0, yBot(i) + H / 2, frontZ + 0.18);
        objs.forEach((o) => { o.obj.position.x += o.x; o.obj.scale.multiplyScalar(o.s); g.add(o.obj); });
        g.traverse((o) => { if (o.isMesh) o.castShadow = false; });
        g.visible = false; root.add(g); lay[i].fos = g;
      }
      addFossil(0, [{ obj: tusk(), x: 0.15, s: 0.72 }]);
      addFossil(1, [{ obj: nummulite(), x: 0, s: 0.8 }]);
      addFossil(2, [{ obj: bone(), x: 0, s: 0.95 }]);
      addFossil(3, [{ obj: ammonite(), x: 0, s: 0.95 }]);
      addFossil(4, [{ obj: trilobite(), x: -0.5, s: 0.5 }, { obj: graptolite(), x: 0.75, s: 0.55 }]);
      addFossil(5, [{ obj: stromatolite(), x: 0, s: 0.5 }]);
      lay.forEach((l, i) => {
        l.num = label('지층 ' + (i + 1), [-W / 2, yBot(i) + H / 2, frontZ], { size: 12, offset: [-0.55, 0, 0], tap: () => { const S = ctx.lesson && ctx.lesson(); if (S && S.digLayer && S.MODE === 'strata') S.digLayer(i); } });   // 이름표를 눌러 그 지층을 파요 (2D에서 지층을 누르는 것과 같아요)
        l.nameLab = label(LAY[i].name, l.fos, { size: 12.5, offset: [1.55, 0, 0.1] }); l.nameLab.show(false);
      });
      // 화석이 크게 바뀌는 경계 ①②③
      const bLines = BOUNDS.map((bi, k) => {
        const m = new THREE.Mesh(new THREE.BoxGeometry(W + 0.12, 0.05, D + 0.12), new THREE.MeshBasicMaterial({ color: BCOL[k] }));
        m.position.y = yBot(bi) + H; m.visible = false; root.add(m);
        const lb = label('경계 ' + '①②③'[k], [W / 2, yBot(bi) + H, frontZ], { size: 12.5, color: BCSS[k], offset: [0.55, 0, 0] }); lb.show(false);
        return { m, lb };
      });
      // 시대 이름표 (오른쪽, 2단계 이후)
      const eraSpan = [[4, 5], [4, 4], [2, 3], [0, 1]]; // era index → 지층 범위 (위=0)
      const eraLabs = ERA.map((e, ei) => {
        const sp = LAY.map((L, i) => (L.era === ei ? i : -1)).filter((i) => i >= 0);
        const yc = (yBot(sp[0]) + yBot(sp[sp.length - 1]) + H) / 2;
        const lb = label(e.name + '<br><span style="font-weight:700;font-size:.88em">' + e.yr + '</span>', [W / 2, yc, 0.4], { size: 12, color: e.col, offset: [1.25, 0, 0] });
        lb.show(false); return lb;
      });
      // 시대 색 띠 (옆면)
      ERA.forEach((e, ei) => {
        const sp = LAY.map((L, i) => (L.era === ei ? i : -1)).filter((i) => i >= 0);
        const h = sp.length * H, yc = (yBot(sp[0]) + yBot(sp[sp.length - 1]) + H) / 2;
        const bar = new THREE.Mesh(new THREE.BoxGeometry(0.1, h - 0.04, D * 0.96), new THREE.MeshStandardMaterial({ color: e.col, roughness: 0.6 }));
        bar.position.set(W / 2 + 0.07, yc, 0); bar.userData.era = ei; root.add(bar); e.bar = bar;
      });
      // 시간 화살표 (왼쪽)
      const arrM = mat(0xe8eefc, { roughness: 0.4 });
      const aShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, topY - 0.6, 12), arrM); aShaft.position.set(-W / 2 - 0.55, topY / 2, 0.3); root.add(aShaft);
      const aHead = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.42, 16), arrM); aHead.position.set(-W / 2 - 0.55, topY - 0.1, 0.3); root.add(aHead);
      const arrL1 = label('오래됨 ↓', [-W / 2 - 0.55, 0.15, 0.3], { size: 12, offset: [-0.2, 0, 0] });
      const arrL2 = label('↑ 새로움', [-W / 2 - 0.55, topY + 0.35, 0.3], { size: 12, offset: [-0.2, 0, 0] });
      const base = new THREE.Mesh(new THREE.CylinderGeometry(5.2, 5.4, 0.3, 96), ctx.mats.stone(0x2b303c, { repeat: 6, bump: 0.03, extra: { roughness: 0.8 } })); base.position.y = -0.17; base.receiveShadow = true; root.add(base);

      /* ---------- 상태 · 조작 ---------- */
      const st = { sel: 'all', labels: true };
      const L2 = () => (ctx.lesson && ctx.lesson()) || null;
      const clamp01 = (x) => Math.max(0, Math.min(1, x)), ease = (x) => x * x * (3 - 2 * x);
      const segE = controls.segment('시대', [{ value: 'all', label: '전체' }].concat(ERA.map((e) => ({ value: e.key, label: e.name }))), 'all', (v) => { st.sel = v; lastInfo = ''; });
      const digB = controls.button('⛏ 다음 지층 파기', () => { const S = L2(); if (S && S.digLayer && S.ST && S.MODE === 'strata') S.digLayer(S.ST.dug); });
      controls.button('🏷 이름표', () => { st.labels = !st.labels; });
      const pl = controls.player({
        duration: 12, loop: true, label: '지층이 쌓이는 순서',
        phases: [[0, '선캄브리아시대'], [1 / 6, '고생대'], [2 / 6, '중생대'], [4 / 6, '신생대']],
        onFrame() {},
      });
      pl.set(1);
      let lastInfo = '';
      function setInfo(h) { if (h !== lastInfo) { lastInfo = h; info(h); } }


      /* ================= 2~4단계: 지구 시계(clock) · 환경 변화(env) · 생물 변화 예측(predict) ================= */
      capLab = false;
      const gStr = new THREE.Group(); while (root.children.length) gStr.add(root.children[0]); root.add(gStr);
      const gCk = new THREE.Group(), gEn = new THREE.Group(); root.add(gCk, gEn); gCk.visible = gEn.visible = false;
      const probe = controls.text(''); probe.style.display = 'none'; const ctlEl = probe.parentElement;
      const strEls = Array.prototype.filter.call(ctlEl.children, (e) => e !== probe);
      const grab = (fn) => { const n0 = ctlEl.children.length; const r = fn(); return { r, els: Array.prototype.slice.call(ctlEl.children, n0) }; };
      const shw = (g2, on) => g2.els.forEach((e) => { e.style.display = on ? '' : 'none'; });
      const V3 = THREE.Vector3, sm3 = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
      const stdM = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.5, metalness: 0.03 }, o || {}));
      const agoT = (a) => (a <= 0.5 ? '현재' : a >= 100 ? (Math.round(a / 10) / 10).toString().replace(/\.0$/, '') + '억 년 전' : (Math.round(a) * 100).toLocaleString('ko-KR') + '만 년 전');
      const hmT = (h) => { const m = Math.round(h * 60); return Math.floor(m / 60) + '시 ' + (m % 60 < 10 ? '0' : '') + (m % 60) + '분'; };
      /* ---- clock: 46억 년 = 24시간 ---- */
      const CR = 3.6, ckAng = (hr) => hr / 24 * Math.PI * 2;                       // 위에서 시계 방향
      const ckPt = (hr, r) => new V3(Math.sin(ckAng(hr)) * r, Math.cos(ckAng(hr)) * r, 0);
      const arcs = ERA.map((e, i) => { const m = new THREE.Mesh(new THREE.RingGeometry(CR - 0.55, CR, 72, 1, 0, 0.01), stdM(new THREE.Color(e.col), { side: THREE.DoubleSide })); gCk.add(m); return m; });
      const hrOf0 = (ago) => (4600 - ago) / 4600 * 24;
      [[0, 540], [540, 250], [250, 66], [66, 0]].forEach((a, i) => { const h0 = hrOf0(a[0] === 0 ? 4600 : [4600, 540, 250, 66][i]), h1 = hrOf0([540, 250, 66, 0][i]); const a0 = ckAng(h0), a1 = ckAng(h1); arcs[i].geometry.dispose(); arcs[i].geometry = new THREE.RingGeometry(CR - 0.55, CR, Math.max(4, Math.ceil((a1 - a0) / 0.1)), 1, Math.PI / 2 - a1, a1 - a0); });
      const face = new THREE.Mesh(new THREE.CircleGeometry(CR - 0.55, 64), stdM(0x16213a, { side: THREE.DoubleSide })); face.position.z = -0.02; gCk.add(face);
      for (let h = 0; h < 24; h++) { const tk = new THREE.Mesh(new THREE.BoxGeometry(h % 6 === 0 ? 0.09 : 0.04, h % 6 === 0 ? 0.4 : 0.22, 0.04), stdM(0xcbd5e1)); const p = ckPt(h, CR - 0.85); tk.position.copy(p); tk.rotation.z = -ckAng(h); gCk.add(tk); }
      const ckLab = [0, 6, 12, 18].map((h) => { const l = label(h + '시', ckPt(h, CR + 0.55).toArray(), { color: 'rgba(30,41,59,.85)' }); l.show(false); return l; });
      const hand = new THREE.Mesh(new THREE.BoxGeometry(0.1, CR - 0.7, 0.06), stdM(0xf8fafc, { emissive: 0xffffff, emissiveIntensity: 0.3 })); gCk.add(hand);
      const hub = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), stdM(0xf8fafc)); gCk.add(hub);
      const hum = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.9, 0.06), stdM(0xdc2626, { emissive: 0xdc2626, emissiveIntensity: 0.6 })); { const p = ckPt(23.9985, CR - 0.1); hum.position.copy(p); hum.rotation.z = -ckAng(23.9985); gCk.add(hum); }
      const lHum = label('현생 인류 ≈ 마지막 5~6초', ckPt(23.9985, CR + 1.0).toArray(), { color: 'rgba(220,38,38,.95)', offset: [0.2, 0.4, 0] }); lHum.show(false);
      const tokM = [0, 1, 2].map((k) => { const m = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.55, 16), stdM(new THREE.Color(ERA[k + 1].col), { emissive: new THREE.Color(ERA[k + 1].col), emissiveIntensity: 0.4 })); const p = ckPt(hrOf0([540, 250, 66][k]), CR + 0.15); m.position.copy(p); m.rotation.z = -ckAng(hrOf0([540, 250, 66][k])) + Math.PI; m.visible = false; gCk.add(m); return m; });
      const tokL = [0, 1, 2].map((k) => { const l = label('①②③'[k] + ' ' + ['5.4억 년 전', '2.5억 년 전', '6600만 년 전'][k], ckPt(hrOf0([540, 250, 66][k]), CR + 1.15).toArray(), { color: 'rgba(30,41,59,.9)' }); l.show(false); return l; });
      const eraLab = ERA.map((e, i) => { const mid = (hrOf0([4600, 540, 250, 66][i]) + hrOf0([540, 250, 66, 0][i])) / 2; const l = label(e.name, ckPt(mid, CR - 1.25).toArray(), { color: e.col }); l.show(false); return l; });
      const ctrL = label('46억 년 = 24시간', [0, -0.15, 0.1], { color: 'rgba(3,105,161,.9)' }); ctrL.show(false);
      function updClock(w, t) {
        const C = w.CK, done = C.placed.every(Boolean), hr = C.sweeping || C.sweep >= 0 ? C.hand : -1;
        const BH = [[4600, 540], [540, 250], [250, 66], [66, 0]];
        arcs.forEach((a, i) => { const known = done || (i === 0 ? C.placed[0] : i === 3 ? C.placed[2] : C.placed[i - 1] && C.placed[i]); a.material.opacity = known ? 1 : 0.18; a.material.transparent = !known; });
        tokM.forEach((m, k) => { m.visible = !!C.placed[k]; tokL[k].show(!!C.placed[k]); });
        hand.visible = hub.visible = hr >= 0; if (hr >= 0) { const p = ckPt(hr, (CR - 0.7) / 2); hand.position.copy(p); hand.rotation.z = -ckAng(hr); }
        ckLab.forEach((l) => l.show(true)); lHum.show(done); eraLab.forEach((l, i) => l.show(done)); ctrL.show(true);
        const lines = ERA.map((e, i) => { const known = done || (i === 0 ? C.placed[0] : i === 3 ? C.placed[2] : C.placed[i - 1] && C.placed[i]); return '<span style="color:' + e.col + '">●</span> ' + e.name + ' ' + (known ? e.dur : '길이는? (시계를 완성하면 알려 줘요)'); });
        return '<b>⏰ 지구 시계: 46억 년 = 24시간</b><br>' + lines.join('<br>') + '<br>' + (done ? '현생 인류는 하루의 마지막 약 5~6초예요.' : '경계 카드 3개를 알맞은 시각에 놓아 시대를 나눠요. (놓은 경계 ' + C.placed.filter(Boolean).length + ' / 3)') + (hr >= 0 ? '<br>지금 ' + hmT(hr) + ' · ' + agoT(4600 - hr / 24 * 4600) : '');
      }
      /* ---- env: 대륙 위치(모식도) · 장면(산소 · 오존층 · 생물) · 산소 / 기온 막대 · 시간 띠 ---- */
      const PW = 7.4, PH = 4.4, MX = -4.2, DX = 4.2, PY = 2.5;
      const sea = new THREE.Mesh(new THREE.PlaneGeometry(PW, PH), stdM(0x7ebfe6, { roughness: 0.5 })); sea.position.set(MX, PY, -0.05); gEn.add(sea);
      { const fr = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(PW, PH, 0.05)), new THREE.LineBasicMaterial({ color: 0x8aa0c8 })); fr.position.set(MX, PY, -0.05); gEn.add(fr); const fr2 = fr.clone(); fr2.position.x = DX; gEn.add(fr2); }
      const contM = [];
      const mkCont = (c) => { const sh = new THREE.Shape(); const sc = PH * 1.18; for (let i = 0; i < c.pts.length; i += 2) { const px = c.pts[i] * sc, py = -c.pts[i + 1] * sc; i ? sh.lineTo(px, py) : sh.moveTo(px, py); } sh.closePath(); const m = new THREE.Mesh(new THREE.ShapeGeometry(sh), stdM(0x9ccf7a, { side: THREE.DoubleSide })); m.position.z = 0.0; gEn.add(m); return m; };
      const lMap = label('🌍 대륙의 위치 (모식도)', [MX, PY + PH / 2 + 0.4, 0], { color: 'rgba(12,74,110,.9)' }), lMapNo = label('5.4억 년 전보다 이전의 대륙 배치는 단순화를 위해 그리지 않아요', [MX, PY, 0.1], { color: 'rgba(12,74,110,.85)' }), lPg = label('판게아 (초대륙)', [MX, PY - PH / 2 + 0.35, 0.1], { color: 'rgba(124,45,18,.92)' });
      [lMap, lMapNo, lPg].forEach((l) => l.show(false));
      /* 장면 */
      const sky = new THREE.Mesh(new THREE.PlaneGeometry(PW, PH), stdM(0xa9785a, { roughness: 0.9 })); sky.position.set(DX, PY, -0.1); gEn.add(sky);
      const sun = new THREE.Mesh(new THREE.SphereGeometry(0.28, 20, 14), stdM(0xfde047, { emissive: 0xfde047, emissiveIntensity: 0.9 })); sun.position.set(DX + PW * 0.36, PY + 0.2, 0.1); gEn.add(sun);
      const DV = (v) => PY + (0.5 - v) * PH, DU = (u) => DX + (u - 0.5) * PW;
      const seaTop = 0.58, landTop = 0.68, shore = 0.55;
      const seaB = new THREE.Mesh(new THREE.BoxGeometry(PW * shore, PH * (1 - seaTop), 0.6), stdM(0x38bdf8, { transparent: true, opacity: 0.85, roughness: 0.2, depthWrite: false })); seaB.position.set(DU(shore / 2), DV((seaTop + 1) / 2), 0.0); gEn.add(seaB);
      const landB = new THREE.Mesh(new THREE.BoxGeometry(PW * (1 - shore), PH * (1 - landTop), 0.6), stdM(0xc9b99a, { roughness: 0.9 })); landB.position.set(DU((shore + 1) / 2), DV((landTop + 1) / 2), 0.0); gEn.add(landB);
      const floorB = new THREE.Mesh(new THREE.BoxGeometry(PW * shore, PH * 0.09, 0.6), stdM(0x7a6a52)); floorB.position.set(DU(shore / 2), DV(0.955), 0.05); gEn.add(floorB);
      const ironB = [0, 1, 2, 3].map((q) => { const m = new THREE.Mesh(new THREE.BoxGeometry(PW * shore - 0.1, 0.04, 0.62), stdM(q % 2 ? 0x7c2d12 : 0xb91c1c)); m.position.set(DU(shore / 2), DV(0.92) - q * 0.06, 0.06); m.visible = false; gEn.add(m); return m; });
      const ozone = new THREE.Mesh(new THREE.BoxGeometry(PW, 0.1, 0.6), new THREE.MeshBasicMaterial({ color: 0x8b5cf6, transparent: true, opacity: 0, depthWrite: false })); ozone.position.set(DX, DV(0.36), 0.1); gEn.add(ozone);
      const uvA = [0, 1, 2, 3].map((i) => { const m = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.4, 8), new THREE.MeshBasicMaterial({ color: 0x7c3aed })); m.rotation.z = Math.PI; gEn.add(m); return m; });
      const bub = Array.from({ length: 9 }, () => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 })); gEn.add(m); return m; });
      const lO2b = label('O₂ 방울', [DU(0.2), DV(0.62), 0.2], { color: 'rgba(3,105,161,.9)' }), lUv = label('자외선', [DU(0.58), DV(0.4), 0.2], { color: 'rgba(109,40,217,.9)' }), lDioEra = label('', [DX - PW / 2 + 1.0, PY + PH / 2 - 0.25, 0.2], { color: 'rgba(60,60,60,.9)' }), lCap = label('', [0, -4.2, 0.2], { color: 'rgba(30,41,59,.88)' }); [lO2b, lUv, lDioEra, lCap].forEach((l) => l.show(false));
      /* 생물 (2D의 ORGS와 같은 시기 · 위치 · 크기) */
      const ORGS3 = [
        ['cyano', 3600, 0, 'sea', 0.1, 0.68, 20, 0x10b981], ['cyano', 3600, 0, 'sea', 0.3, 0.62, 16, 0x10b981], ['stroma', 3000, 540, 'floor', 0.14, 0, 34, 0x8a7a64], ['stroma', 3000, 540, 'floor', 0.4, 0, 28, 0x8a7a64],
        ['ediacara', 600, 540, 'sea', 0.24, 0.82, 40, 0xa78bfa], ['trilobite', 520, 252, 'floor', 0.28, 0, 34, 0x6b7280], ['coral', 500, 0, 'floor', 0.08, 0, 40, 0xf472b6], ['ammonite', 400, 66, 'sea', 0.2, 0.76, 36, 0xd97706],
        ['fish', 480, 0, 'sea', 0.42, 0.68, 38, 0x2563eb], ['nummulite', 56, 34, 'floor', 0.5, 0, 26, 0xa8a29e], ['fern', 470, 0, 'land', 0.62, 0, 40, 0x16a34a], ['tree', 360, 280, 'land', 0.74, 0, 92, 0x15803d],
        ['tree', 360, 280, 'land', 0.9, 0, 80, 0x166534], ['conifer', 250, 66, 'land', 0.9, 0, 66, 0x166534], ['dino', 230, 66, 'land', 0.76, 0, 78, 0x3f6212], ['shrew', 66, 0, 'land', 0.6, 0.04, 34, 0x78350f], ['mammoth', 5, 0, 'land', 0.8, 0, 78, 0x6b4423],
      ].map((q) => ({ k: q[0], from: q[1], to: q[2], zone: q[3], x: q[4], y: q[5], s: q[6], c: q[7] }));
      function mkOrg(k, c) {
        const g = new THREE.Group(), mm = stdM(c), add = (geo, m2, x, y, z, sx, sy, sz) => { const o = new THREE.Mesh(geo, m2 || mm); o.position.set(x || 0, y || 0, z || 0); o.scale.set(sx || 1, sy || 1, sz || 1); g.add(o); return o; };
        const S1 = new THREE.SphereGeometry(0.5, 16, 12), C1 = new THREE.ConeGeometry(0.5, 1, 14), Y1 = new THREE.CylinderGeometry(0.5, 0.5, 1, 12);
        if (k === 'cyano') { add(S1, null, 0, 0, 0, 0.5, 0.5, 0.5); add(S1, null, 0.5, 0.2, 0, 0.4, 0.4, 0.4); add(S1, null, -0.4, -0.2, 0, 0.35, 0.35, 0.35); }
        else if (k === 'stroma') add(new THREE.SphereGeometry(0.5, 16, 10, 0, 6.283, 0, 1.571), null, 0, -0.3, 0, 1.2, 0.8, 0.7);
        else if (k === 'ediacara') { add(Y1, null, 0, 0, 0, 1, 0.12, 0.7); add(Y1, stdM(0xc4b5fd), 0, 0.1, 0, 0.6, 0.1, 0.4); }
        else if (k === 'trilobite') { add(S1, null, 0, 0, 0, 1.0, 0.35, 0.7); add(S1, stdM(0x4b5563), -0.45, 0, 0, 0.45, 0.4, 0.7); }
        else if (k === 'coral') { for (let i = -1; i <= 1; i++) add(C1, null, i * 0.3, 0, 0, 0.3, 0.8 + 0.2 * (i + 1), 0.3); }
        else if (k === 'ammonite') { const t = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.14, 8, 18), mm); g.add(t); add(S1, stdM(0xf59e0b), 0, 0, 0, 0.3, 0.3, 0.3); }
        else if (k === 'fish') { add(S1, null, 0, 0, 0, 1.0, 0.5, 0.35); add(C1, null, -0.7, 0, 0, 0.45, 0.6, 0.15).rotation.z = -1.57; }
        else if (k === 'nummulite') add(Y1, null, 0, 0, 0, 0.8, 0.12, 0.8).rotation.x = 1.57;
        else if (k === 'fern') { for (let i = -1; i <= 1; i++) { const l = add(C1, null, i * 0.18, 0, 0, 0.12, 0.9, 0.05); l.rotation.z = -i * 0.5; } }
        else if (k === 'tree') { add(Y1, stdM(0x5b4a2a), 0, -0.2, 0, 0.2, 1.0, 0.2); add(S1, null, 0, 0.55, 0, 0.9, 0.8, 0.9); }
        else if (k === 'conifer') { add(Y1, stdM(0x5b4a2a), 0, -0.4, 0, 0.14, 0.4, 0.14); add(C1, null, 0, 0.1, 0, 0.7, 1.1, 0.7); }
        else if (k === 'dino') { add(S1, null, 0, 0, 0, 1.2, 0.7, 0.6); add(Y1, null, 0.6, 0.45, 0, 0.15, 0.7, 0.15).rotation.z = -0.5; add(S1, null, 0.85, 0.8, 0, 0.35, 0.25, 0.25); add(C1, null, -0.8, -0.05, 0, 0.3, 0.9, 0.2).rotation.z = 1.7; }
        else if (k === 'shrew') { add(S1, null, 0, 0, 0, 0.9, 0.5, 0.45); add(C1, null, 0.5, 0, 0, 0.2, 0.4, 0.2).rotation.z = -1.57; }
        else { add(S1, null, 0, 0, 0, 1.3, 0.9, 0.7); add(S1, null, 0.7, 0.1, 0, 0.55, 0.55, 0.5); add(Y1, null, 1.0, -0.2, 0, 0.12, 0.7, 0.12); add(C1, stdM(0xf1e6c9), 0.9, -0.15, 0.2, 0.08, 0.5, 0.08).rotation.z = 0.5; }
        gEn.add(g); g.visible = false; return g;
      }
      ORGS3.forEach((o) => { o.g = mkOrg(o.k, o.c); });
      /* 막대 · 시간 띠 */
      const BWD = 15.6, BX0 = -BWD / 2, BXC = 0;
      const bar = (y, col) => { const t = new THREE.Mesh(new THREE.BoxGeometry(BWD, 0.26, 0.26), stdM(0x243049, { roughness: 0.7 })); t.position.set(0, y, 0); gEn.add(t); return t; };
      const o2Y = -0.55, tpY = -1.5, tmY = -2.55;
      bar(o2Y); const o2Fill = new THREE.Mesh(new THREE.BoxGeometry(1, 0.3, 0.3), stdM(0x38bdf8, { emissive: 0x0b6aa0, emissiveIntensity: 0.4 })); gEn.add(o2Fill);
      const o2Ref = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.5, 0.32), stdM(0x94a3b8)); o2Ref.position.set(BX0 + BWD * 21 / 35, o2Y, 0); gEn.add(o2Ref);
      const lO2 = label('', [0, o2Y + 0.5, 0], { color: 'rgba(3,105,161,.92)' }), lO2r = label('현재 21 %', [BX0 + BWD * 21 / 35, o2Y - 0.5, 0], { color: 'rgba(100,116,139,.92)' }), lO2t = label('대기 중 산소 농도 (%)', [BX0 + 1.6, o2Y + 0.5, 0], { color: 'rgba(30,41,59,.88)' });
      const tcv = document.createElement('canvas'); tcv.width = 256; tcv.height = 4; { const c2 = tcv.getContext('2d'), gr = c2.createLinearGradient(0, 0, 256, 0); gr.addColorStop(0, '#3b82f6'); gr.addColorStop(1, '#ef4444'); c2.fillStyle = gr; c2.fillRect(0, 0, 256, 4); }
      const tpTrack = new THREE.Mesh(new THREE.BoxGeometry(BWD, 0.26, 0.26), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(tcv) })); tpTrack.position.set(0, tpY, 0); gEn.add(tpTrack);
      const tpMark = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 12), stdM(0xffffff, { emissive: 0xffffff, emissiveIntensity: 0.6 })); gEn.add(tpMark);
      const lTp = label('', [0, tpY + 0.55, 0], { color: 'rgba(30,41,59,.92)' }), lTpt = label('지구 평균 기온의 경향 (낮음 ↔ 높음)', [BX0 + 2.4, tpY - 0.5, 0], { color: 'rgba(30,41,59,.88)' });
      const eraBands = ERA.map((e, i) => { const f0 = [0, 0.4 * 0 + 0, 0, 0][i]; return null; });
      const FS = 0.42, fOf = (ago) => (ago >= 540 ? FS * (4600 - ago) / 4060 : FS + (1 - FS) * (540 - ago) / 540);
      const eraSeg = ERA.map((e, i) => { const a0 = [4600, 540, 250, 66][i], a1 = [540, 250, 66, 0][i], x0 = BX0 + BWD * fOf(a0), x1 = BX0 + BWD * fOf(a1); const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, 0.3, 0.3), stdM(new THREE.Color(e.col))); m.position.set((x0 + x1) / 2, tmY, 0); gEn.add(m); const l = label(e.name, [(x0 + x1) / 2, tmY - 0.5, 0], { color: e.col, size: 11.5 }); l.show(false); return { m, l }; });
      const tMark = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.5, 16), stdM(0xef4444, { emissive: 0xef4444, emissiveIntensity: 0.5 })); tMark.rotation.z = Math.PI; gEn.add(tMark);
      const lTm = label('', [0, tmY + 0.8, 0], { color: 'rgba(15,23,42,.92)' });
      [lO2, lO2r, lO2t, lTp, lTpt, lTm].forEach((l) => l.show(false));
      /* 생물 종류 수 막대 (예측 단계) */
      const prBars = PRDS().map((c, i) => { const m = new THREE.Mesh(new THREE.BoxGeometry(1, 0.34, 0.3), stdM(new THREE.Color(c.col), { emissive: new THREE.Color(c.col), emissiveIntensity: 0.25 })); gEn.add(m); const l = label('', [0, 0, 0], { color: c.col }); l.show(false); return { m, l, c }; });
      const prRef = new THREE.Mesh(new THREE.BoxGeometry(0.05, 4.2, 0.2), stdM(0x94a3b8)); gEn.add(prRef); const lPr100 = label('환경 변화 전 = 100', [0, 0, 0], { color: 'rgba(100,116,139,.92)' }); lPr100.show(false);
      function PRDS() { return (window.__sim && window.__sim.PRD) || [{ col: '#dc4a2a' }, { col: '#16a34a' }, { col: '#d98e0b' }, { col: '#2f6fd1' }]; }
      const lastEn = { ago: -1, key: '' };
      function sceneAt(ago, t) {
        const w = window.__sim, o2 = w.o2At(ago), k = sm3(o2 / 18), tv = w.tAt(ago), ei = w.eraAt(ago);
        // 대륙
        const nm = ago > 560; lMapNo.show(nm);
        if (!contM.length) w.CONT.forEach((c) => contM.push(mkCont(c)));
        w.CONT.forEach((c, i) => { const [fx, fy] = w.contPos(c, ago); contM[i].visible = !nm; contM[i].position.set(MX + (fx - 0.5) * PW, PY + (0.5 - fy) * PH, 0.02); });
        const pg = Math.max(0, Math.min(1, 1 - Math.abs(ago - 290) / 70)) * (ago < 330 && ago > 230 ? 1 : 0); lPg.show(pg > 0.02);
        // 장면
        sky.material.color.set(new THREE.Color(0xa9785a).lerp(new THREE.Color(0x74bff0), k));
        const green = sm3((470 - ago) / 60) * (ago <= 470 ? 1 : 0); landB.material.color.set(new THREE.Color(0xc9b99a).lerp(new THREE.Color(0x7bc96f), green));
        const oz = sm3((o2 - 5) / 7), uvOn = ago < 3500; ozone.material.opacity = 0.55 * oz;
        uvA.forEach((m, i) => { m.visible = uvOn; const ph = (t * 0.5 + i * 0.25) % 1, y0 = DV(0.42), y1 = DV(0.66), stop = oz > 0.5 ? y0 - 0.1 : y1; m.position.set(DU(0.6 + i * 0.1), y0 + (stop - y0) * ph, 0.2); });
        lUv.show(uvOn);
        const bif = Math.max(0, Math.min(1, (2900 - ago) / 150)) * Math.max(0, Math.min(1, (ago - 1800) / 250)); ironB.forEach((m) => { m.visible = bif > 0.05; m.material.opacity = bif; });
        const bb = Math.max(0, Math.min(1, (3000 - ago) / 200)) * Math.max(0, Math.min(1, (ago - 1500) / 400));
        bub.forEach((m, q) => { m.visible = bb > 0.02; const ph = (t * 0.28 + q * 0.11) % 1; m.position.set(DU(0.05 + 0.05 * q), DV(0.92) + ph * (DV(seaTop) - DV(0.92) + 0.4), 0.25); });
        lO2b.show(bb > 0.3);
        ORGS3.forEach((o) => {
          const aIn = o.to === 0 ? 1 : Math.max(0, Math.min(1, (ago - o.to) / (0.04 * o.to + 4))), aOut = Math.max(0, Math.min(1, (o.from - ago) / (0.04 * o.from + 5))), al = aIn * aOut * (o.k === 'mammoth' ? Math.max(0, Math.min(1, (ago - 0.3) / 0.6)) : 1);
          o.g.visible = al > 0.03; if (!o.g.visible) return;
          const sz = o.s / 224 * PH * 0.9, x = DU(o.x);
          let v = o.zone === 'sea' ? o.y : o.zone === 'floor' ? 0.9 - sz / PH * 0.3 : landTop - sz / PH * 0.35 - o.y;
          o.g.position.set(x, DV(v), 0.3); o.g.scale.setScalar(sz * Math.min(1, al + 0.2));
        });
        lDioEra.show(true); lDioEra.set(ERA[ei].name); lDioEra.el.style.background = ERA[ei].col;
        lCap.show(true); lCap.set(captionAt(ago));
        return { o2, tv };
      }
      const captionAt = (a) => (a > 2900 ? '산소가 거의 없는 대기예요. 바닷물에는 철 이온이 녹아 있어요.' : a > 1800 ? '광합성 생물이 산소를 내놓아요. 산소는 철과 결합해 붉은 산화 철로 가라앉아요.' : a > 630 ? '산소가 바다와 대기에 서서히 쌓여 가요.' : a > 470 ? '산소 농도가 10 %를 넘고 오존층이 만들어지기 시작해요.' : a > 360 ? '오존층이 자외선을 막아 주어 생물이 육지로 올라와요.' : a >= 300 ? '석탄기: 거대한 숲이 생기고 산소 농도가 약 30 %까지 올라가요.' : a > 250 ? '산소가 줄고 대륙이 한데 모여 판게아가 만들어져요.' : a > 66 ? '판게아가 갈라지고 온난 습윤한 기후가 이어져요. 공룡이 번성해요.' : '포유류가 번성하고, 후기에는 빙하기와 간빙기가 반복돼요.');
      function updEnv(w, t) {
        const ago = w.agoOfFrac(w.EV.disp), { o2, tv } = sceneAt(ago, t);
        o2Fill.visible = true; const wd = Math.max(0.02, BWD * Math.min(1, o2 / 35)); o2Fill.scale.set(wd, 1, 1); o2Fill.position.set(BX0 + wd / 2, o2Y, 0);
        lO2.show(true); lO2.obj = [BX0 + wd, o2Y + 0.5, 0]; lO2.set('산소 ' + (o2 < 1 ? '1 % 미만' : o2.toFixed(0) + ' %')); lO2r.show(true); lO2t.show(true);
        lTpt.show(true); lTp.show(true);
        if (tv == null) { tpMark.visible = false; lTp.set('기온 자료는 5.4억 년 전부터 표시해요'); lTp.obj = [0, tpY + 0.55, 0]; }
        else { tpMark.visible = true; const x = BX0 + BWD * (tv + 2) / 4.6; tpMark.position.set(x, tpY, 0.2); lTp.obj = [x, tpY + 0.55, 0]; lTp.set(tv > 1.2 ? '기온 높음' : tv < -0.5 ? '기온 낮음 (빙하기 무렵)' : '기온 보통'); }
        eraSeg.forEach((e) => { e.m.visible = true; e.l.show(true); });
        const x = BX0 + BWD * w.fracOf(ago); tMark.visible = true; tMark.position.set(x, tmY + 0.5, 0); lTm.show(true); lTm.obj = [x, tmY + 0.95, 0]; lTm.set(agoT(ago));
        prBars.forEach((b) => { b.m.visible = false; b.l.show(false); }); prRef.visible = false; lPr100.show(false);
        const E = w.EV, extra = (E.pin1 || E.pin2) ? ' · 표시한 때 ' + (E.pin1 ? '① ' : '') + (E.pin2 ? '②' : '') : '';
        return '<b>🌍 ' + agoT(ago) + ' · ' + ERA[w.eraAt(ago)].name + '</b><br>' + captionAt(ago) + '<br>산소 ' + (o2 < 1 ? '1 % 미만' : '약 ' + o2.toFixed(0) + ' %') + extra + '<br><span style="color:#9fb0d4">아래 슬라이더로 시간을 바꿔요.</span>';
      }
      function updPredict(w, t) {
        const PR = w.PR, PRD = w.PRD, i = PR.sel, PAGO = [290, 480, 120, 20];
        const { o2 } = sceneAt(PAGO[i], t);
        [o2Fill, tpTrack, tpMark, tMark].forEach((m) => { m.visible = false; }); eraSeg.forEach((e) => { e.m.visible = false; e.l.show(false); });
        [lO2, lO2r, lO2t, lTp, lTpt, lTm].forEach((l) => l.show(false));
        prRef.visible = true; const sc = BWD / 170, x100 = BX0 + 100 * sc; prRef.position.set(x100, -1.65, 0); lPr100.show(true); lPr100.obj = [x100, -3.45, 0];
        PRD.forEach((c, k) => {
          const shown = PR.shown[k], v = PR.pred[k] ? 100 + (c.end - 100) * sm3(shown) : 100, wd = Math.max(0.05, v * sc), y = -0.5 - k * 0.85, b = prBars[k];
          b.m.visible = true; b.m.scale.set(wd, 1, 1); b.m.position.set(BX0 + wd / 2, y, 0); b.m.material.emissiveIntensity = k === i ? 0.7 : 0.15; b.l.show(true); b.l.obj = [BX0 + wd + 0.1, y, 0]; b.l.el.style.transform = ''; b.l.set(c.tip + (PR.pred[k] ? ' ' + Math.round(v) : '')); b.l.off = [1.1, 0, 0];
        });
        const c = PRD[i], known = PR.pred[i] != null && PR.shown[i] > 0.995;
        return '<b>🎯 ' + c.title + '</b> (' + c.sub + ')<br>' + (known ? c.mid + '<br>→ ' + c.out : '서식지와 먹이가 늘어날지 줄어들지 먼저 예측해 봐요.<br>? (예측하면 알려 줘요)') + '<br>생물의 종류 수: 환경 변화 전 = 100 (막대)<br><span style="color:#9fb0d4">장면은 이 환경 변화가 뚜렷했던 때예요.</span>';
      }
      const timeCtl = grab(() => controls.range('시간', 0, 1000, 1, 0, (v) => { const w = window.__sim; if (w) w.setU(v / 1000); }, (v) => { const w = window.__sim; return w ? agoT(w.agoOfFrac(v / 1000)) : v; }));
      const prSel = grab(() => controls.segment('환경 변화', [{ value: 0, label: '대륙이 모임' }, { value: 1, label: '산소 증가' }, { value: 2, label: '온난·습윤' }, { value: 3, label: '빙하기' }], 0, (v) => { const w = window.__sim; if (w) w.prSelect(v); }));
      const prUp = grab(() => controls.button('▲ 늘어날 거예요', () => { const w = window.__sim; if (w) w.prPredict('up'); }));
      const prDn = grab(() => controls.button('▼ 줄어들 거예요', () => { const w = window.__sim; if (w) w.prPredict('down'); }));
      let scn = '';
      function applyScn(md) {
        if (md === scn) return; scn = md; lastInfo = '';
        const ck = md === 'clock', en = md === 'env' || md === 'predict';
        gStr.visible = !(ck || en); gCk.visible = ck; gEn.visible = en;
        strEls.forEach((e) => { e.style.display = ck || en ? 'none' : ''; });
        shw(timeCtl, md === 'env'); shw(prSel, md === 'predict'); shw(prUp, md === 'predict'); shw(prDn, md === 'predict');
        if (ck || en) oldLabs.forEach((l) => l.show(false)); else { arrL1.show(true); arrL2.show(true); }
        if (!ck) { ckLab.forEach((l) => l.show(false)); lHum.show(false); eraLab.forEach((l) => l.show(false)); tokL.forEach((l) => l.show(false)); ctrL.show(false); }
        if (!en) { [lMap, lMapNo, lPg, lO2b, lUv, lDioEra, lCap, lO2, lO2r, lO2t, lTp, lTpt, lTm, lPr100].forEach((l) => l.show(false)); eraSeg.forEach((e) => e.l.show(false)); prBars.forEach((b) => b.l.show(false)); }
        else { lMap.show(true); }
        const o = ctx.orbit;
        if (ck) { o.theta = 0; o.phi = 1.5; o.tx = 0; o.ty = 0; o.tz = 0; o.dist = PHN ? 14 : 12; }
        else if (en) { o.theta = 0; o.phi = 1.5; o.tx = 0; o.ty = -0.2; o.tz = 0; o.dist = PHN ? 28 : 18.5; }
        else { o.theta = 0.45; o.phi = 1.2; o.tx = 0; o.ty = 3.4; o.tz = 0; o.dist = PHN ? 18 : 15; }   // PC: 지층 맨 위가 설명 상자에 가리지 않게 조금 물러서요
      }

      return {
        update(dt, t) {
          const S = L2(), ST = S && S.ST;
          const mdN = S && S.MODE ? S.MODE : 'strata';
          applyScn(mdN === 'clock' || mdN === 'env' || mdN === 'predict' ? mdN : 'strata');
          if (mdN === 'clock' || mdN === 'env' || mdN === 'predict') {
            const h = mdN === 'clock' ? updClock(S, t) : mdN === 'env' ? updEnv(S, t) : updPredict(S, t);
            if (mdN === 'env') timeCtl.r.set(Math.round(S.EV.disp * 1000));
            if (mdN === 'predict') prSel.r.set(S.PR.sel);
            if (mdN === 'predict') { const c = S.PR.pred[S.PR.sel] != null; prUp.els.concat(prDn.els).forEach((e) => { e.disabled = c; }); }
            ctx.orbit.theta = 0.04; ctx.orbit.phi = 1.5; setInfo(h); return;
          }
          const dug = ST ? ST.dug : 0, A = ST && ST.anim;
          const lv = ctx.level, eraMode = lv >= 1;
          const dep = pl.playing || pl.p < 0.999;
          const si = ERA.findIndex((e) => e.key === st.sel);
          const bd = ST && !dep ? ST.bd : 0;
          let depth = 0;
          lay.forEach((l, i) => {
            const k = N - 1 - i;
            const pr = dep ? clamp01(pl.p * N - k) : 1;
            l.grp.visible = pr > 0; l.grp.scale.y = Math.max(0.001, ease(pr));
            const dim = si >= 0 && LAY[i].era !== si;
            l.mats.forEach((m) => { m.transparent = dim; m.opacity = dim ? 0.2 : 1; m.depthWrite = !dim; });
            const rv = dep ? (pr >= 1 ? 1 : 0) : (ST && i < dug ? ST.reveal[i] : 0);
            const showF = rv > 0.01 && !dim;
            l.fos.visible = showF; l.fos.scale.setScalar(Math.max(0.2, rv));
            l.nameLab.show(st.labels && showF && rv > 0.5);
            l.num.show(!dim);
          });
          if (!dep && ST) depth = dug + (A ? ease(clamp01(A.t)) : 0);
          shaft.visible = depth > 0.01 && si < 0;
          if (shaft.visible) { shaft.scale.y = depth * H; shaft.position.set(0, topY - depth * H / 2, frontZ + 0.06); }
          bLines.forEach((b, k) => { const on = bd > 0.95; b.m.visible = on; b.lb.show(on); });
          ERA.forEach((e, ei) => { e.bar.visible = eraMode && !dep; eraLabs[ei].show(eraMode && !dep && (si < 0 || si === ei)); });
          soil.visible = !dep || pl.p > 0.999;
          if (digB) { const can = !!(S && S.MODE === 'strata' && !A && dug < N && !dep); digB.disabled = !can; digB.style.opacity = can ? '' : '0.45'; digB.textContent = dug >= N ? '✔ 모두 파냈어요' : A ? '⛏ 파는 중…' : '⛏ 다음 지층 파기'; }
          // 안내 글
          if (dep) {
            const ph = Math.min(N - 1, Math.floor(pl.p * N)), li = N - 1 - ph;
            setInfo('<b>지층은 아래에서 위로 쌓여요.</b><br>지금 쌓이는 지층: <b>지층 ' + (li + 1) + '</b> (' + ERA[LAY[li].era].name + ')<br>아래 지층일수록 오래된 지층이에요.');
          } else if (si >= 0) {
            const e = ERA[si];
            setInfo('<b>' + e.name + '</b> (' + e.yr + ')<br>46억 년을 24시간으로 줄이면 ' + e.dur + '이에요.<br>이 시대의 지층에서 나오는 화석으로 그때의 생물과 환경을 알 수 있어요.');
          } else if (lv === 0) {
            setInfo('<b>아래 지층일수록 오래된 지층</b>이에요.<br>파낸 지층 <b>' + dug + ' / 6</b>' + (dug ? ' · 가장 최근 화석: <b>' + LAY[dug - 1].name + '</b>' : '') + '<br>' + (dug >= N ? '화석이 크게 바뀌는 경계가 <b>3곳</b> 있어요.' : '<b>지층 ' + (dug + 1) + '</b> 이름표나 ⛏ 버튼을 눌러 위에서부터 차례로 파 보세요.'));
          } else if (lv === 1) {
            setInfo('<b>지질시대</b>: 화석이 크게 바뀌는 경계로 나눠요.<br>46억 년 = 24시간이면<br>' + ERA.map((e) => e.name + ' ' + e.dur).join('<br>'));
          } else {
            setInfo('지질시대마다 대표 화석이 달라요. 산소·기온·대륙이 바뀌어 서식지와 먹이가 달라졌기 때문이에요.');
          }
        },
        sync() {},
      };
    },
  });
})();
