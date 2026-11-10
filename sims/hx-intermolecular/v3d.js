/* hx-intermolecular · 3D 분자 간 힘 (2단계 '세 가지 분자 간 힘'의 분자 돋보기와 같은 장면)
   ① 분산력: He · Ar · Xe — 크기(전자 수)에 따라 전자 구름이 쏠리며 이웃에 반대 전하를 유발해요.
   ② 쌍극자–쌍극자 힘: HCl 6개 — δ+(H)와 이웃의 δ−(Cl)가 마주 보도록 정렬돼요.
   ③ 수소 결합: H₂O · HF · NH₃ — N·O·F에 결합한 H와 이웃 분자의 비공유 전자쌍(••) 사이의 힘이에요.
   2D의 힘 단추 · 원자/분자 단추가 이 화면을 조절해요 (window.__sim.S.forces).
   분류하기(카드 8장)에서는 카드마다 분자 모형을 입체로 보여 줘요 (바닥 색 = 놓은 상자). 3D 막대의 ◀ ▶ · 상자 단추가 2D의 placeCard를 불러요.
   ※ 결합 길이·각은 실제 값에 가깝게 그린 모형 스케치예요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const KEYS = { disp: 1, dip: 1, hb: 1 };
  const SZ = { he: { nm: 'He', r: 34, e: 2, bp: -269, dots: 2 }, ar: { nm: 'Ar', r: 52, e: 18, bp: -186, dots: 7 }, xe: { nm: 'Xe', r: 72, e: 54, bp: -108, dots: 12 } };
  const FINFO = {
    disp: '<b>분산력 (런던 힘)</b> · 모든 분자 사이<br>전자 구름이 순간적으로 한쪽으로 쏠리면 이웃에도 반대 전하가 생겨서 서로 끌어당겨요. 전자가 많은(분자량이 큰) 분자일수록 커요.',
    dip: '<b>쌍극자–쌍극자 힘</b> · 극성 분자 사이<br>극성 분자는 한쪽이 δ+, 다른 쪽이 δ−예요. 이웃 분자의 δ+와 δ−가 마주 보도록 방향을 맞추어 끌어당겨요.',
    hb: '<b>수소 결합</b> · N·O·F에 결합한 H<br>H가 이웃 분자의 N·O·F 비공유 전자쌍을 끌어당겨요. 분자 안의 공유 결합이 아니라 분자 사이의 힘이고, 분자 간 힘 중 가장 강해요.',
  };
  const HBNOTE = {
    h2o: 'H₂O: 분자 하나가 수소 결합을 최대 2개까지 만들 수 있어요',
    hf: 'HF: 분자 하나가 수소 결합 1개 (H가 1개뿐이에요)',
    nh3: 'NH₃: 비공유 전자쌍이 1개뿐이라 분자당 수소 결합은 1개 정도예요',
  };
  const K = 1.35 / 52;      // 2D 화면 픽셀 → 3D 단위 (Ar 전자 구름 반지름 52 → 1.35)

  window.SciSim3D.attach({
    title: '분자 간 힘 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: PHONE ? 12.5 : 12, theta: 0.5, phi: 1.2, min: 5, max: 26, target: [0, 0.1, 0] },
    autoRotate: 0.15,
    levels: [1],   // 2단계 '세 가지 분자 간 힘' (분류하기는 3D 막대의 단추로). 1·3·4단계는 2D 화면의 열운동 · 그래프 · 예측이에요
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      /* ---- 장면 꾸미기 도우미: 나무 · 암석 무늬, 하늘 · 우주 배경, 빛 번짐 (모양만 꾸며요) ---- */
      const FX = (() => {
        const scn = ctx.scene; let sd = 7; const rnd = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
        const mk = (w, h, draw, rep) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; if (rep) t.repeat.set(rep[0], rep[1]); if ('encoding' in t) t.encoding = THREE.sRGBEncoding; t.anisotropy = 4; return t; };
        const wood = (rep) => mk(256, 256, (g, w, h) => { g.fillStyle = '#b98a58'; g.fillRect(0, 0, w, h); for (let i = 0; i < 80; i++) { const y = rnd() * h; g.strokeStyle = 'rgba(' + (70 + rnd() * 40 | 0) + ',38,12,' + (0.07 + rnd() * 0.15) + ')'; g.lineWidth = 0.6 + rnd() * 2.2; g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= w; x += 32) g.lineTo(x, y + Math.sin(x * 0.03 + i) * 3 * rnd()); g.stroke(); } g.fillStyle = 'rgba(60,30,10,.18)'; for (let k = 1; k < 4; k++) g.fillRect(0, k * 64, w, 2); }, rep);
        const grain = (rep, amt) => mk(128, 128, (g, w, h) => { g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); for (let i = 0; i < 1100; i++) { const v = 150 + rnd() * 80 | 0; g.fillStyle = 'rgba(' + v + ',' + v + ',' + v + ',' + (amt || 0.35) + ')'; g.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 3, 1 + rnd() * 2.2); } }, rep);
        const dome = (top, mid, bot, stars) => {
          const t = mk(8, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, top); gr.addColorStop(0.5, mid); gr.addColorStop(1, bot); g.fillStyle = gr; g.fillRect(0, 0, w, h); }); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
          const m = new THREE.Mesh(new THREE.SphereGeometry(90, 32, 16), new THREE.MeshBasicMaterial({ map: t, side: THREE.BackSide, depthWrite: false })); m.renderOrder = -10; m.raycast = () => {}; scn.add(m);
          if (stars) { const pos = []; for (let i = 0; i < stars; i++) { const u = rnd() * 2 - 1, a = rnd() * 6.283, q = Math.sqrt(1 - u * u); pos.push(Math.cos(a) * q * 85, u * 85, Math.sin(a) * q * 85); } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); const p = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xcfdcff, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0.8, depthWrite: false })); p.renderOrder = -9; p.raycast = () => {}; m.add(p); }
          return m;
        };
        const glowTex = (rgb) => mk(128, 128, (g, w, h) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(' + rgb + ',1)'); gr.addColorStop(0.35, 'rgba(' + rgb + ',.35)'); gr.addColorStop(1, 'rgba(' + rgb + ',0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
        const glow = (rgb, size, op) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(rgb), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: op == null ? 0.8 : op })); s.scale.setScalar(size); s.raycast = () => {}; return s; };
        const spiral = (rgb) => mk(256, 256, (g, w, h) => { g.clearRect(0, 0, w, h); const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128); gr.addColorStop(0, 'rgba(255,248,230,1)'); gr.addColorStop(0.12, 'rgba(' + rgb + ',.75)'); gr.addColorStop(0.5, 'rgba(' + rgb + ',.2)'); gr.addColorStop(1, 'rgba(' + rgb + ',0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); for (let arm = 0; arm < 2; arm++) for (let i = 0; i < 260; i++) { const f = i / 260, a = f * 5.2 + arm * Math.PI, r = 14 + f * 108, x = 128 + Math.cos(a) * r + (rnd() - 0.5) * 12 * f, y = 128 + Math.sin(a) * r + (rnd() - 0.5) * 12 * f; g.fillStyle = 'rgba(255,255,255,' + (0.5 * (1 - f) + 0.06) + ')'; g.beginPath(); g.arc(x, y, 1 + rnd() * 2.4 * (1 - f * 0.5), 0, 6.283); g.fill(); } });
        return { rnd, mk, wood, grain, dome, glow, glowTex, spiral };
      })();
      const V3 = THREE.Vector3, UP = new V3(0, 1, 0);
      const F = () => { try { return window.__sim.S.forces; } catch (e) { return null; } };
      const sub = () => { try { return window.__sim.S.sub.forces; } catch (e) { return 'look'; } };
      const g = new THREE.Group(); root.add(g);
      const mat = (c, o) => (o && (o.transparent || o.emissive) ? new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.4, metalness: 0.05 }, o)) : new THREE.MeshPhysicalMaterial(Object.assign({ color: c, roughness: 0.28, metalness: 0.05, clearcoat: 0.6, clearcoatRoughness: 0.2 }, o || {})));
      /* 분자 돋보기 무대: 어두운 유리 원판 · 동심원 눈금 · 빛나는 테두리, 배경 */
      FX.dome('#070d1c', '#10203d', '#1b3556', 160);
      { const gt = FX.mk(256, 256, (c, w, h) => { c.fillStyle = '#0f1b33'; c.fillRect(0, 0, w, h); c.strokeStyle = 'rgba(120,170,255,.28)'; c.lineWidth = 1.4; for (let r = 24; r <= 128; r += 24) { c.beginPath(); c.arc(128, 128, r, 0, 6.283); c.stroke(); } for (let a = 0; a < 12; a++) { c.beginPath(); c.moveTo(128, 128); c.lineTo(128 + Math.cos(a * 0.5236) * 128, 128 + Math.sin(a * 0.5236) * 128); c.stroke(); } });
        const stage = new THREE.Mesh(new THREE.CylinderGeometry(5.6, 5.8, 0.3, 72), [new THREE.MeshStandardMaterial({ color: 0x1c2a47, roughness: 0.4, metalness: 0.6 }), new THREE.MeshStandardMaterial({ map: gt, roughness: 0.35, metalness: 0.4 }), new THREE.MeshStandardMaterial({ color: 0x1c2a47, roughness: 0.4, metalness: 0.6 })]); stage.position.y = -3.3; stage.receiveShadow = true; root.add(stage);
        const rim = new THREE.Mesh(new THREE.TorusGeometry(5.65, 0.06, 10, 96), new THREE.MeshStandardMaterial({ color: 0x66b8ff, emissive: 0x3b8bff, emissiveIntensity: 0.9, roughness: 0.3 })); rim.rotation.x = Math.PI / 2; rim.position.y = -3.15; root.add(rim); stage.userData.v3bg = rim.userData.v3bg = true; }
      const labs = [];
      let kind = 'disp', hbKey = 'h2o', sizeKey = 'ar', lastInfo = '', demo = null;

      function clear() {
        while (g.children.length) g.remove(g.children[0]);
        labs.forEach((l) => l.show(false)); labs.length = 0;
      }
      const plabel = (txt, obj, col, off) => { const l = label(txt, obj, { color: col || 'rgba(30,41,59,.88)', offset: off || [0, 0, 0] }); labs.push(l); return l; };
      function stick(parent, a, b, r) {
        const d = b.clone().sub(a), m = new THREE.Mesh(new THREE.CylinderGeometry(r || 0.1, r || 0.1, d.length(), 16), mat(0xa9b4c8));
        m.position.copy(a).add(b).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(UP, d.normalize()); parent.add(m); return m;
      }
      function dashed(a, b, col, r) {
        const grp = new THREE.Group(), d = b.clone().sub(a), L = d.length(), n = Math.max(3, Math.round(L / 0.28)), u = d.clone().normalize();
        const mt = mat(col, { emissive: col, emissiveIntensity: 0.5 });
        for (let i = 0; i < n; i++) {
          const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, L / n * 0.55, 10), mt);
          m.position.copy(a).addScaledVector(u, (i + 0.5) * L / n); m.quaternion.setFromUnitVectors(UP, u); grp.add(m);
        }
        return grp;
      }
      const setInfo = (t) => { if (t !== lastInfo) { lastInfo = t; info(t); } };

      /* ---- ① 분산력: He · Ar · Xe 두 원자 ---- */
      let dA, dB, dLink, dLab;
      function sceneDisp() {
        const mk = (tag) => {
          const grp = new THREE.Group();
          const nuc = new THREE.Mesh(new THREE.SphereGeometry(0.24, 24, 16), mat(0x475569, { emissive: 0x222b3a, emissiveIntensity: 0.4 })); grp.add(nuc);
          const cloud = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 28), mat(0x66b8ff, { transparent: true, opacity: 0.32, roughness: 0.2, depthWrite: false }));
          grp.add(cloud);
          const es = [];
          for (let i = 0; i < 12; i++) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 8), mat(0x9db4ff, { emissive: 0x6c86ff, emissiveIntensity: 0.5 })); grp.add(e); es.push(e); }
          const halo = FX.glow('110,170,255', 4, 0.3); grp.add(halo); g.add(grp); return { grp, nuc, cloud, es, tag, halo };
        };
        dA = mk(0); dB = mk(1);
        dLink = new THREE.Group(); g.add(dLink);
        dLab = {
          aP: plabel('δ+', dA.grp, 'rgba(226,70,75,.95)'), aM: plabel('δ−', dA.grp, 'rgba(56,103,244,.95)'),
          bP: plabel('δ+', dB.grp, 'rgba(226,70,75,.95)'), bM: plabel('δ−', dB.grp, 'rgba(56,103,244,.95)'),
          nA: plabel('', dA.grp, null, [0, -1.9, 0]), nB: plabel('', dB.grp, null, [0, -1.9, 0]),
        };
      }
      function updDisp(t) {
        const f = F(); const rd = f ? f.rd : SZ[sizeKey].r, z = SZ[sizeKey];
        const r = rd * K, xc = (rd + 20) * K, amp = r * 0.3;
        let o1 = Math.sin(t * 2.3) * amp;
        if (demo != null) o1 = Math.sin(demo * Math.PI * 4) * amp;
        const o2 = o1 * 0.85;
        [[dA, -xc, o1], [dB, xc, o2]].forEach(([d, x, off]) => {
          d.grp.position.set(x, 0, 0); d.cloud.position.x = off; d.cloud.scale.setScalar(r); d.halo.position.x = off; d.halo.scale.setScalar(r * 2.5);
          const left = d.tag === 0;
          d.cloud.material.color.setHex((left ? off > 0 : off > 0) ? 0x7fb2ff : 0x7fb2ff);
          d.nuc.position.set(0, 0, 0);
          d.es.forEach((e, i) => {
            e.visible = i < z.dots;
            const a = t * (1.4 + (i % 3) * 0.5) + i * 2.4 + d.tag, rr = r * (0.35 + 0.5 * ((i * 37) % 10) / 10);
            e.position.set(off + Math.cos(a) * rr, Math.sin(a) * rr * 0.8, Math.cos(a * 0.7 + i) * rr * 0.6);
          });
        });
        // 부분 전하 이름표 (2D와 같은 규칙: A는 오른쪽 면, B는 왼쪽 면)
        const big = Math.abs(o1) > amp * 0.35, up = r + 0.45;
        const s1 = o1 > 0 ? '−' : '+', s2 = o2 > 0 ? '+' : '−';
        dLab.aP.show(big && s1 === '+'); dLab.aM.show(big && s1 === '−');
        dLab.bP.show(big && s2 === '+'); dLab.bM.show(big && s2 === '−');
        dLab.aP.obj = dLab.aM.obj = dA.cloud; dLab.bP.obj = dLab.bM.obj = dB.cloud;
        dLab.aP.off = dLab.aM.off = [r * 0.62, up, 0]; dLab.bP.off = dLab.bM.off = [-r * 0.62, up, 0];
        dLab.nA.obj = dA.grp; dLab.nB.obj = dB.grp; dLab.nA.off = dLab.nB.off = [0, -r - 0.5, 0];
        dLab.nA.set(z.nm); dLab.nB.set(z.nm);
        // 인력 (점선 · 두께 = 쏠린 정도)
        const act = Math.abs(o1) / amp;
        while (dLink.children.length) dLink.remove(dLink.children[0]);
        dLink.add(dashed(new V3(-xc + r * 0.9 + o1 * 0.5, 0, 0), new V3(xc - r * 0.9 + o2 * 0.5, 0, 0), 0xffd34d, 0.04 + act * 0.05));
        setInfo(FINFO.disp + '<br>' + z.nm + ' · 전자 ' + z.e + '개 · 끓는점 ' + z.bp + ' °C');
      }

      /* ---- ② 쌍극자–쌍극자: HCl 6개 (2D와 같은 배치 · 방향) ---- */
      let dipM = [], dipT = 0;
      const DIP_T = [0, 0, 0, Math.PI, Math.PI, Math.PI];
      const HX = [-3.4, 0, 3.4], HY = [1.5, -1.5];
      function hcl(pos) {                    // +x 쪽이 H(δ+), −x 쪽이 Cl(δ−)
        const w = new THREE.Group(); w.position.copy(pos);
        const cl = new THREE.Mesh(new THREE.SphereGeometry(0.62, 32, 24), mat(0x22b14c)); cl.position.set(-0.8, 0, 0);
        const h = new THREE.Mesh(new THREE.SphereGeometry(0.3, 24, 16), mat(0xf1f5f9)); h.position.set(0.95, 0, 0);
        w.add(cl, h); stick(w, cl.position, h.position, 0.1);
        const mk = (x, c) => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.9, 24, 16), mat(c, { transparent: true, opacity: 0.2, depthWrite: false })); m.position.set(x, 0, 0); m.scale.set(1.0, 1.2, 1.2); w.add(m); };
        mk(-0.8, 0xff6a6a); mk(0.95, 0x6aa8ff);
        g.add(w); return w;
      }
      function sceneDip() {
        dipM = [];
        for (let i = 0; i < 6; i++) { const m = hcl(new V3(HX[i % 3], HY[Math.floor(i / 3)], 0)); m.userData = { i, ph: i * 1.3 }; dipM.push(m); }
        plabel('δ+', dipM[0].children[1], 'rgba(226,70,75,.95)', [0, 0.85, 0]);
        plabel('δ−', dipM[0].children[0], 'rgba(56,103,244,.95)', [0, 0.95, 0]);
        plabel('HCl', dipM[4], null, [0, -1.3, 0]);
      }
      const dAng = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
      function updDip(t, dt) {
        const f = F(); let ang;
        if (demo != null) {                       // ▶ 재생: 제각각 → 정렬
          const k = Math.min(1, Math.max(0, (demo - 0.12) / 0.5)), e = k * k * (3 - 2 * k);
          ang = DIP_T.map((a, i) => a + (1 - e) * (((i * 2.399) % 6.28) - 3.14));
        } else ang = f && f.dipA && f.dipA.length === 6 ? f.dipA : DIP_T;
        const err = ang.map((a, i) => Math.abs(dAng(a, DIP_T[i])));
        dipM.forEach((m, i) => {
          m.rotation.z = Math.PI - (ang[i] + Math.sin(t * 2.1 + i * 1.3) * 0.07);   // 2D 각도 → 3D 각도
          m.position.z = Math.sin(t + m.userData.ph) * 0.06;
        });
        dipT += dt;
        if (dipT > 0.1) {
          dipT = 0; while (dLink.children.length) dLink.remove(dLink.children[0]); g.updateMatrixWorld(true);
          const P = dipM.map((m) => ({ h: new V3(0.95, 0, 0).applyMatrix4(m.matrixWorld), c: new V3(-0.8, 0, 0).applyMatrix4(m.matrixWorld) }));
          for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) {
            if (i === j) continue;
            const a = P[i].c, b = P[j].h, d = a.distanceTo(b);
            if (d > 2.4) continue;
            const al = Math.max(0, Math.min(1, 1 - (err[i] + err[j]) / 1.4));
            if (al < 0.25) continue;
            dLink.add(dashed(a, b, 0xffd34d, 0.03 + 0.04 * al));
          }
        }
        const aligned = err.every((e) => e < 0.25);
        setInfo(FINFO.dip + '<br>' + (aligned ? '이웃의 δ+와 δ−가 마주 보도록 정렬되어 서로 끌어당겨요.' : '방향이 제각각이면 인력이 약해요. 곧 정렬돼요.'));
      }

      /* ---- ③ 수소 결합: 분자 3개 사슬 (H₂O · HF · NH₃) ---- */
      const SQ = Math.sin(109.47 * Math.PI / 180), CQ = Math.cos(109.47 * Math.PI / 180);
      const tet = (n) => Array.from({ length: n }, (_, i) => new V3(SQ * Math.cos(i * 2.0944), CQ, SQ * Math.sin(i * 2.0944)));
      const HBM = {
        h2o: { nm: 'H₂O', heavy: 'O', col: 0xe23b3b, R: 0.5, H: [new V3(Math.sin(0.912), Math.cos(0.912), 0), new V3(-Math.sin(0.912), Math.cos(0.912), 0)], LP: [new V3(0, -0.58, 0.82), new V3(0, -0.58, -0.82)] },
        hf: { nm: 'HF', heavy: 'F', col: 0x5fbf6a, R: 0.46, H: [new V3(0, 1, 0)], LP: tet(3) },
        nh3: { nm: 'NH₃', heavy: 'N', col: 0x3867f4, R: 0.5, H: tet(3), LP: [new V3(0, 1, 0)] },
      };
      const HBP = [new V3(-3.7, -1.1, 0), new V3(0, 1.1, 0), new V3(3.7, -1.1, 0)];
      let hbMols = [];
      const BL = 1.3;
      function sceneHB() {
        const def = HBM[hbKey]; hbMols = [];
        const tmp = new V3();
        for (let k = 0; k < 3; k++) {
          const w = new THREE.Group(); w.position.copy(HBP[k]);
          const next = k < 2 ? HBP[k + 1].clone().sub(HBP[k]).normalize() : null, prev = k > 0 ? HBP[k - 1].clone().sub(HBP[k]).normalize() : null;
          // 방향 정하기: 주는 H가 다음 분자를, 받는 비공유 전자쌍이 앞 분자를 향하게
          const q0 = new THREE.Quaternion();
          if (next) q0.setFromUnitVectors(def.H[0], next);
          else if (prev) q0.setFromUnitVectors(def.LP[0], prev);
          let best = q0, bs = -9;
          for (let s = 0; s < 36; s++) {
            const ax = next || prev || UP, q = new THREE.Quaternion().setFromAxisAngle(ax, s * Math.PI / 18).multiply(q0);
            let sc = 0;
            if (prev) def.LP.forEach((v) => { sc = Math.max(sc, tmp.copy(v).applyQuaternion(q).dot(prev)); });
            if (sc > bs + 1e-6) { bs = sc; best = q; }
          }
          w.quaternion.copy(best);
          const heavy = new THREE.Mesh(new THREE.SphereGeometry(def.R, 32, 24), mat(def.col)); w.add(heavy);
          def.H.forEach((hv, hi) => {
            const hp = hv.clone().multiplyScalar(BL), h = new THREE.Mesh(new THREE.SphereGeometry(0.3, 24, 16), mat(0xf1f5f9)); h.position.copy(hp); w.add(h); if (hi === 0) w.userData.h0 = h;
            stick(w, new V3(), hp, 0.1);
          });
          def.LP.forEach((lv) => {
            const base = lv.clone().multiplyScalar(def.R + 0.35), side = new V3().crossVectors(lv, UP); if (side.lengthSq() < 0.01) side.set(1, 0, 0); side.normalize().multiplyScalar(0.13);
            [1, -1].forEach((sg) => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8), mat(0x1e293b)); e.position.copy(base).addScaledVector(side, sg); w.add(e); });
          });
          g.add(w); Object.assign(w.userData, { next, prev }); hbMols.push(w);
        }
        g.updateMatrixWorld(true);
        // 수소 결합 점선: 주는 분자의 H → 다음 분자의 N·O·F
        for (let k = 0; k < 2; k++) {
          const w = hbMols[k], hp = def.H[0].clone().multiplyScalar(BL).applyQuaternion(w.quaternion).add(w.position), tg = HBP[k + 1];
          const d = tg.clone().sub(hp), u = d.clone().normalize();
          g.add(dashed(hp.clone().addScaledVector(u, 0.35), tg.clone().addScaledVector(u, -(def.R + 0.45)), 0xff5a5f, 0.075));
          plabel('δ+', w.userData.h0, 'rgba(226,70,75,.95)', [0, 0.55, 0]);
        }
        plabel('δ−', hbMols[1], 'rgba(56,103,244,.95)', [0, -1.0, 0]); plabel('δ−', hbMols[2], 'rgba(56,103,244,.95)', [0, -1.0, 0]);
        plabel(def.nm, hbMols[0], null, [0, -1.5, 0]);
      }
      function updHB(t) {
        hbMols.forEach((w, k) => { w.position.copy(HBP[k]); w.position.z += Math.sin(t * 1.3 + k) * 0.05; });
        setInfo(FINFO.hb + '<br>' + HBNOTE[hbKey]);
      }


      /* ---- ④ 분류하기(2D의 카드 8장): 카드마다 분자 모형을 입체로 보여 줘요 (상자 색 = 2D에서 놓은 상자) ---- */
      const gS = new THREE.Group(); root.add(gS); gS.visible = false;
      const BINC = [0x0ea5a4, 0xf59e0b, 0xe2464b], BINN = ['분산력', '쌍극자–쌍극자 힘', '수소 결합'];
      const AT = { H: [0xf1f5f9, 0.28], C: [0x5b6472, 0.46], N: [0x3867f4, 0.46], O: [0xe23b3b, 0.46], F: [0x5fbf6a, 0.42], Cl: [0x22b14c, 0.6], Br: [0x9b2d20, 0.68], Ar: [0x7fd0d4, 0.7] };
      const T4 = 1 / Math.sqrt(3);
      const MOLS = {
        h2o: { a: [['O', 0, 0, 0], ['H', 0.79, -0.61, 0], ['H', -0.79, -0.61, 0]], b: [[0, 1], [0, 2]] },
        ar: { a: [['Ar', 0, 0, 0]], b: [] },
        hcl: { a: [['Cl', -0.55, 0, 0], ['H', 0.8, 0, 0]], b: [[0, 1]] },
        co2: { a: [['C', 0, 0, 0], ['O', 1.2, 0, 0], ['O', -1.2, 0, 0]], b: [[0, 1], [0, 2]] },
        nh3: { a: [['N', 0, 0.25, 0], ['H', 0.94, -0.2, 0], ['H', -0.47, -0.2, 0.81], ['H', -0.47, -0.2, -0.81]], b: [[0, 1], [0, 2], [0, 3]] },
        ch4: { a: [['C', 0, 0, 0], ['H', T4 * 1.0, T4 * 1.0, T4 * 1.0], ['H', -T4, -T4, T4], ['H', -T4, T4, -T4], ['H', T4, -T4, -T4]], b: [[0, 1], [0, 2], [0, 3], [0, 4]] },
        hf: { a: [['F', -0.45, 0, 0], ['H', 0.6, 0, 0]], b: [[0, 1]] },
        hbr: { a: [['Br', -0.6, 0, 0], ['H', 0.95, 0, 0]], b: [[0, 1]] },
      };
      const SORT_ID = ['h2o', 'ar', 'hcl', 'co2', 'nh3', 'ch4', 'hf', 'hbr'], SORT_F = ['H₂O', 'Ar', 'HCl', 'CO₂', 'NH₃', 'CH₄', 'HF', 'HBr'];
      const SX = [-4.3, -1.45, 1.45, 4.3], SY = [1.6, -1.9], SK = 0.72;
      const sortM = SORT_ID.map((id, i) => {
        const def = MOLS[id], grp = new THREE.Group(), spin = new THREE.Group(); grp.add(spin);
        grp.position.set(SX[i % 4], SY[Math.floor(i / 4)], 0);
        def.a.forEach((a) => { const m = new THREE.Mesh(new THREE.SphereGeometry(AT[a[0]][1], 28, 20), mat(AT[a[0]][0])); m.position.set(a[1], a[2], a[3]); spin.add(m); });
        def.b.forEach((b) => { const p0 = new V3(def.a[b[0]][1], def.a[b[0]][2], def.a[b[0]][3]), p1 = new V3(def.a[b[1]][1], def.a[b[1]][2], def.a[b[1]][3]); stick(spin, p0, p1, 0.09); });
        const disc = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.35, 0.06, 40), mat(0x64748b, { transparent: true, opacity: 0.5, roughness: 0.6 })); disc.position.y = -1.05; grp.add(disc);
        const ring = new THREE.Mesh(new THREE.TorusGeometry(1.35, 0.06, 10, 48), mat(0xffffff, { emissive: 0xffffff, emissiveIntensity: 0.4 })); ring.rotation.x = Math.PI / 2; ring.position.y = -1.0; grp.add(ring);
        gS.add(grp);
        const lab = label(SORT_F[i], grp, { color: 'rgba(30,41,59,.9)', offset: [0, -1.55, 0] }); lab.show(false);
        return { grp, spin, disc, ring, lab };
      });
      let sortOn = false;
      function setSort(on) {
        if (on === sortOn) return; sortOn = on; gS.visible = on; g.visible = !on;
        sortM.forEach((s) => s.lab.show(on)); labs.forEach((l) => l.show(!on && true));
        ctlEls.forEach((e) => { e.style.display = on ? 'none' : ''; }); sortEls.forEach((e) => { e.style.display = on ? '' : 'none'; });
        const o = ctx.orbit; if (on) { o.dist = PHONE ? 18 : 16; o.ty = 0; } else { o.dist = PHONE ? 12.5 : 12; o.ty = 0.1; }
        lastInfo = '';
        if (!on) { build(); }
      }
      function updSort(t) {
        const f = F(); if (!f || !f.cards) return;
        const cards = f.cards; let placed = 0, sel = null;
        sortM.forEach((s, i) => {
          const c = cards.find((q) => q.id === SORT_ID[i]); if (!c) return;
          const isSel = f.sel === c.id || c.drag; if (isSel) sel = c;
          s.spin.rotation.y = t * 0.5 + i; s.spin.rotation.x = 0.3;
          s.grp.scale.setScalar(SK * (isSel ? 1.2 : 1));
          const b = c.bin; if (b !== null && b !== undefined) placed++;
          s.disc.material.color.setHex(b !== null && b !== undefined ? BINC[b] : 0x64748b); s.disc.material.opacity = b !== null && b !== undefined ? 0.85 : 0.5;
          s.ring.visible = !!isSel || !!c.flag; s.ring.material.color.setHex(c.flag ? 0xe2464b : 0xffd34d); s.ring.material.emissive.setHex(c.flag ? 0xe2464b : 0xffd34d);
          s.lab.set(SORT_F[i] + (b !== null && b !== undefined ? ' · ' + BINN[b] : ''));
        });
        const hint = sel ? window.__sim.CARDS.find((x) => x.id === sel.id) : null;
        setInfo('<b>분자 카드 8장 · 분류하기</b><br>' + (hint ? '고른 카드: <b>' + hint.f + '</b> (' + hint.hint + ')<br>' : '분자의 모양과 극성을 살펴봐요.<br>') + '상자에 놓은 카드 ' + placed + ' / 8 (바닥 색 = 놓은 상자)<br>순서: ① N·O·F에 직접 결합한 H → 수소 결합 ② 극성 분자 → 쌍극자 ③ 무극성 → 분산력<br>아래 <b>◀ ▶</b>로 분자를 고르고 상자 단추를 눌러요.');
      }

      function build() {
        clear(); dLink = null; lastInfo = ''; demo = null;
        if (kind === 'disp') sceneDisp(); else if (kind === 'dip') { dLink = new THREE.Group(); g.add(dLink); sceneDip(); } else sceneHB();
      }
      function from2D() {
        const f = F(); if (!f) return;
        const nk = KEYS[f.f] ? f.f : 'disp';
        if (nk !== kind || (nk === 'hb' && f.hb !== hbKey)) { kind = nk; hbKey = f.hb; build(); }
        sizeKey = f.size;
      }

      const pl = controls.player({
        duration: 8, loop: true, autoplay: false, label: '재생',
        onFrame(p) {
          demo = p;
        },
      });
      const noteEl = controls.text('');
      function refreshNote() {
        const t = kind === 'disp' ? '▶ 재생: 전자 구름이 쏠렸다 돌아오는 모습을 반복해요.' : kind === 'dip' ? '▶ 재생: 제각각인 방향이 정렬되는 모습을 반복해요.' : '▶ 재생: 수소 결합 점선이 깜박여요.';
        if (noteEl.textContent !== t) noteEl.textContent = t;
      }
      const probe = controls.text(''); probe.style.display = 'none'; const ctlEls = Array.prototype.filter.call(probe.parentElement.children, (e) => e !== probe);
      /* 분류하기 단추: 2D의 카드 고르기 · 상자에 놓기(placeCard)와 같아요 */
      const ctlBox = probe.parentElement, nS0 = ctlBox.children.length;
      const sortCards = () => { const f = F(); return f && f.cards ? SORT_ID.map((id) => f.cards.find((c) => c.id === id)).filter(Boolean) : []; };
      function pickCard(d) {
        const f = F(), cs = sortCards(); if (!cs.length) return;
        let i = cs.findIndex((c) => c.id === f.sel); i = i < 0 ? (d > 0 ? 0 : cs.length - 1) : (i + d + cs.length) % cs.length;
        f.sel = cs[i].id; lastInfo = '';
      }
      function putCard(b) {
        const L = window.__sim, f = F(), cs = sortCards(); if (!L || !L.placeCard || !cs.length) return;
        let c = cs.find((q) => q.id === f.sel) || cs.find((q) => q.bin === null); if (!c) return;
        L.placeCard(c, b);
        const k = cs.indexOf(c), nx = cs.slice(k + 1).concat(cs.slice(0, k)).find((q) => q.bin === null);
        f.sel = nx ? nx.id : null; lastInfo = '';
      }
      controls.text('<b>분자</b>');
      controls.button('◀', () => pickCard(-1));
      controls.button('▶', () => pickCard(1));
      controls.text('<b>상자</b>');
      BINN.forEach((nm, b) => controls.button(nm, () => putCard(b)));
      const sortEls = Array.prototype.slice.call(ctlBox.children, nS0); sortEls.forEach((e) => { e.style.display = 'none'; });
      from2D(); build();
      return {
        update(dt, t) {
          dt = Math.min(dt, 0.05);
          const isSort = sub() === 'sort'; setSort(isSort);
          if (isSort) { updSort(t); return; }
          const before = kind + hbKey;
          from2D();
          if (kind + hbKey !== before) { pl.pause(); pl.set(0); demo = null; }
          if (demo != null && !pl.playing && pl.p === 0) demo = null;
          refreshNote();
          if (kind === 'disp') updDisp(t); else if (kind === 'dip') updDip(t, dt); else updHB(t);
        },
        sync() { lastInfo = ''; },
      };
    },
  });
})();
