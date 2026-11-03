/* h1-geologic-time · 3D 지층 기둥과 화석
   2D 실험과 같아요: 절벽 단면의 지층 6겹(위 = 새로움, 아래 = 오래됨)을 위에서부터 차례로 파면 층마다 다른 화석이 나오고,
   화석이 크게 바뀌는 경계가 3곳 있어요. 지질시대 이름과 연대는 2D의 ERAS와 같아요. (▶ 재생: 아래 지층부터 쌓이는 순서)
   2D에서 파낸 지층(ST.dug)과 3D가 서로 맞춰져요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHN = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);

  window.SciSim3D.attach({
    title: '3D 지층과 화석',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: PHN ? 16 : 11.5, theta: 0.45, phi: 1.2, target: [0, 3.1, 0], min: 7, max: 30 },
    autoRotate: 0.12,
    levels: [0],
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
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
      const fossilMat = (c) => mat(c, { roughness: 0.55, metalness: 0.05 });

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
        const m = mat(L.col);
        const b = new THREE.Mesh(new THREE.BoxGeometry(W, H - 0.014, D), m); b.position.y = H / 2; b.castShadow = true; b.receiveShadow = true; grp.add(b);
        const ln = new THREE.Mesh(new THREE.BoxGeometry(W + 0.004, 0.02, D + 0.004), mat(0x2f3440)); grp.add(ln);
        return { grp, mats: [m, ln.material], fos: null, nameLab: null, num: null };
      });
      // 파낸 굴 (2D의 굴과 같아요)
      const shaftM = mat(0x2d2218, { roughness: 1 });
      const shaft = new THREE.Mesh(new THREE.BoxGeometry(2.7, 1, 0.1), shaftM); shaft.visible = false; root.add(shaft);
      // 맨 위 흙 + 풀
      const soil = new THREE.Mesh(new THREE.BoxGeometry(W + 0.02, 0.14, D + 0.02), mat(0x5a8f3c)); soil.position.y = topY + 0.07; soil.receiveShadow = true; root.add(soil);

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
        l.num = label('지층 ' + (i + 1), [-W / 2, yBot(i) + H / 2, frontZ], { size: 12, offset: [-0.55, 0, 0] });
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
      label('오래됨 ↓', [-W / 2 - 0.55, 0.15, 0.3], { size: 12, offset: [-0.2, 0, 0] });
      label('↑ 새로움', [-W / 2 - 0.55, topY + 0.35, 0.3], { size: 12, offset: [-0.2, 0, 0] });
      const base = new THREE.Mesh(new THREE.CylinderGeometry(5.2, 5.4, 0.3, 48), new THREE.MeshLambertMaterial({ color: 0x2d3547 })); base.position.y = -0.17; base.receiveShadow = true; root.add(base);

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

      return {
        update() {
          const S = L2(), ST = S && S.ST;
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
            setInfo('<b>아래 지층일수록 오래된 지층</b>이에요.<br>파낸 지층 <b>' + dug + ' / 6</b>' + (dug ? ' · 가장 최근 화석: <b>' + LAY[dug - 1].name + '</b>' : '') + '<br>' + (dug >= N ? '화석이 크게 바뀌는 경계가 <b>3곳</b> 있어요.' : '⛏ 버튼이나 2D에서 위에서부터 차례로 파 보세요.'));
          } else if (lv === 1) {
            setInfo('<b>지질시대</b>: 화석이 크게 바뀌는 경계로 나눠요.<br>46억 년 = 24시간이면<br>' + ERA.map((e) => e.name + ' ' + e.dur).join('<br>'));
          } else {
            setInfo('지질시대마다 대표 화석이 달라요. 산소·기온·대륙이 바뀌어 서식지와 먹이가 달라졌기 때문이에요. (그래프와 예측은 2D에서 해요)');
          }
        },
        sync() {},
      };
    },
  });
})();
