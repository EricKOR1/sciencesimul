/* hx-intermolecular · 3D 분자 간 힘 (2단계 '세 가지 분자 간 힘'의 분자 돋보기와 같은 장면)
   ① 분산력: He · Ar · Xe — 크기(전자 수)에 따라 전자 구름이 쏠리며 이웃에 반대 전하를 유발해요.
   ② 쌍극자–쌍극자 힘: HCl 6개 — δ+(H)와 이웃의 δ−(Cl)가 마주 보도록 정렬돼요.
   ③ 수소 결합: H₂O · HF · NH₃ — N·O·F에 결합한 H와 이웃 분자의 비공유 전자쌍(••) 사이의 힘이에요.
   2D의 힘 단추 · 원자/분자 단추가 이 화면을 조절해요 (window.__sim.S.forces).
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
    camera: { dist: PHONE ? 17 : 13.5, theta: 0.5, phi: 1.2, min: 5, max: 26 },
    autoRotate: 0.15,
    levels: [1],   // 2단계 '세 가지 분자 간 힘'. (1·3·4단계는 2D 화면의 열운동 · 그래프 · 예측이에요)
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const V3 = THREE.Vector3, UP = new V3(0, 1, 0);
      const F = () => { try { return window.__sim.S.forces; } catch (e) { return null; } };
      const sub = () => { try { return window.__sim.S.sub.forces; } catch (e) { return 'look'; } };
      const g = new THREE.Group(); root.add(g);
      const mat = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.4, metalness: 0.05 }, o || {}));
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
          g.add(grp); return { grp, nuc, cloud, es, tag };
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
          d.grp.position.set(x, 0, 0); d.cloud.position.x = off; d.cloud.scale.setScalar(r);
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
        dLab.aP.obj = dLab.aM.obj = [-xc + r * 0.62, up, 0]; dLab.bP.obj = dLab.bM.obj = [xc - r * 0.62, up, 0];
        dLab.nA.obj = [-xc, -r - 0.5, 0]; dLab.nB.obj = [xc, -r - 0.5, 0];
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
          def.H.forEach((hv) => {
            const hp = hv.clone().multiplyScalar(BL), h = new THREE.Mesh(new THREE.SphereGeometry(0.3, 24, 16), mat(0xf1f5f9)); h.position.copy(hp); w.add(h);
            stick(w, new V3(), hp, 0.1);
          });
          def.LP.forEach((lv) => {
            const base = lv.clone().multiplyScalar(def.R + 0.35), side = new V3().crossVectors(lv, UP); if (side.lengthSq() < 0.01) side.set(1, 0, 0); side.normalize().multiplyScalar(0.13);
            [1, -1].forEach((sg) => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8), mat(0x1e293b)); e.position.copy(base).addScaledVector(side, sg); w.add(e); });
          });
          g.add(w); w.userData = { next, prev }; hbMols.push(w);
        }
        g.updateMatrixWorld(true);
        // 수소 결합 점선: 주는 분자의 H → 다음 분자의 N·O·F
        for (let k = 0; k < 2; k++) {
          const w = hbMols[k], hp = def.H[0].clone().multiplyScalar(BL).applyQuaternion(w.quaternion).add(w.position), tg = HBP[k + 1];
          const d = tg.clone().sub(hp), u = d.clone().normalize();
          g.add(dashed(hp.clone().addScaledVector(u, 0.35), tg.clone().addScaledVector(u, -(def.R + 0.45)), 0xff5a5f, 0.075));
          plabel('δ+', hp.clone().add(new V3(0, 0.55, 0)), 'rgba(226,70,75,.95)');
        }
        plabel('δ−', hbMols[1], 'rgba(56,103,244,.95)', [0, -1.0, 0]); plabel('δ−', hbMols[2], 'rgba(56,103,244,.95)', [0, -1.0, 0]);
        plabel(def.nm, hbMols[0], null, [0, -1.5, 0]);
      }
      function updHB(t) {
        hbMols.forEach((w, k) => { w.position.copy(HBP[k]); w.position.z += Math.sin(t * 1.3 + k) * 0.05; });
        setInfo(FINFO.hb + '<br>' + HBNOTE[hbKey]);
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
      from2D(); build();
      return {
        update(dt, t) {
          dt = Math.min(dt, 0.05);
          const before = kind + hbKey;
          from2D();
          if (kind + hbKey !== before) { pl.pause(); pl.set(0); demo = null; }
          if (demo != null && !pl.playing && pl.p === 0) demo = null;
          refreshNote();
          if (kind === 'disp') updDisp(t); else if (kind === 'dip') updDip(t, dt); else updHB(t);
          if (sub() === 'sort') setInfo('<b>분류하기</b>는 2D 화면에서 해요<br>분자 카드 8장을 알맞은 힘의 상자로 끌어 놓아요. (위 [▦ 2D] 단추)');
        },
        sync() { lastInfo = ''; },
      };
    },
  });
})();
