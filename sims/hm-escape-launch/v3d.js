/* hm-escape-launch · 3D 탈출 속도와 로켓
   2D 실험(window.__sim)의 장면을 그대로 입체로 보여 줘요: 📈 탈출 조건(연직으로 쏘아 올리기 · 총 에너지 E = ½mv² − GMm/r) · 🧑‍🚀 우주인과 공(운동량 보존) · 🔥 로켓 분출(작용 반작용).
   값(발사 속력 · 공 · 분출 속력 · 분출량)은 옆 조작판이 정하고 3D는 따라가요. 로켓 방정식과 공기 저항은 다루지 않아요.
   🪐 행성 비교(대기 분자) · 🛰️ 궤도 진입 · 🎯 다단 로켓도 입체로 보여 줘요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHN = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches), KD = PHN ? 1.3 : 1;
  const LV = () => (typeof window.SciSimLevel === 'number' ? window.SciSimLevel : 0);
  const TAU = Math.PI * 2, clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  function tools(THREE) {
    const V3 = THREE.Vector3, Y = new V3(0, 1, 0);
    const M = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.5, metalness: 0.1 }, o || {}));
    const glass = (c, op) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.2, metalness: 0, transparent: true, opacity: op == null ? 0.25 : op, depthWrite: false });
    function mkArrow(col, rad) {
      const g = new THREE.Group(), m = M(col, { roughness: 0.4 });
      const sh = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, 1, 12), m), hd = new THREE.Mesh(new THREE.ConeGeometry(rad * 2.6, rad * 6, 16), m);
      g.add(sh, hd); g.userData = { sh, hd, rad }; return g;
    }
    function setArrow(g, a, b) {
      const d = new V3().subVectors(b, a), len = d.length(), { sh, hd, rad } = g.userData;
      if (len < 1e-3) { g.visible = false; return; }
      g.visible = true; const hl = Math.min(len * 0.5, rad * 6);
      sh.scale.y = Math.max(0.001, len - hl); sh.position.y = (len - hl) / 2;
      hd.scale.y = hl / (rad * 6); hd.position.y = len - hl / 2;
      g.position.copy(a); g.quaternion.setFromUnitVectors(Y, d.normalize());
    }
    function tube(pts, r, col, o, closed) {
      const c = new THREE.CatmullRomCurve3(pts, !!closed);
      return new THREE.Mesh(new THREE.TubeGeometry(c, Math.max(24, pts.length * 3), r, 8, !!closed), (o && o.basic) ? new THREE.MeshBasicMaterial({ color: col, transparent: !!o.op, opacity: o.op || 1 }) : M(col, o));
    }
    function disc(r, col, y, op) { const m = new THREE.Mesh(new THREE.CircleGeometry(r, 64), new THREE.MeshStandardMaterial({ color: col, roughness: 0.9, transparent: op != null, opacity: op == null ? 1 : op })); m.rotation.x = -Math.PI / 2; m.position.y = y || 0; m.receiveShadow = true; return m; }
    function grid(w, d, step, col, y, op) {
      const pts = []; for (let x = -w / 2; x <= w / 2 + 1e-6; x += step) pts.push(x, 0, -d / 2, x, 0, d / 2); for (let z = -d / 2; z <= d / 2 + 1e-6; z += step) pts.push(-w / 2, 0, z, w / 2, 0, z);
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
      const l = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: op == null ? 0.3 : op })); l.position.y = y || 0; return l;
    }
    function arc(r, a0, a1, rad, col, n) { // xz 평면 위의 호
      const pts = []; n = n || 40; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; pts.push(new V3(r * Math.cos(a), 0, r * Math.sin(a))); }
      return tube(pts, rad, col);
    }
    return { V3, Y, M, glass, mkArrow, setArrow, tube, disc, grid, arc };
  }
  const f1 = (v) => (Math.round(v * 10) / 10).toFixed(1), f2 = (v) => (Math.round(v * 100) / 100).toFixed(2);
  const sup = (s) => String(s).replace(/[-0-9]/g, (c) => ({ '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' }[c]));
  function sci(x, d) { if (x === 0) return '0'; const e = Math.floor(Math.log10(Math.abs(x))); let m = x / Math.pow(10, e); if (+m.toFixed(d) >= 10) { m /= 10; return m.toFixed(d) + ' × 10' + sup(e + 1); } return m.toFixed(d) + ' × 10' + sup(e); }
  window.SciSim3D.attach({
    title: '탈출 속도와 로켓 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대 · 값은 옆 조작판에서 바꿔요',
    camera: { dist: 16 * KD, theta: 0.5, phi: 1.3, min: 5, max: 40, target: [0, 3.5, 0] },
    autoRotate: 0,
    levels: [0, 2, 3],
    build(ctx) {
      const { THREE, root, label, info, controls, orbit } = ctx;
      const { V3, M, tube, mkArrow, setArrow } = tools(THREE);
      const sim = () => ctx.lesson();
      const G = {}; ['well', 'astro', 'rocket'].forEach((k) => { G[k] = new THREE.Group(); root.add(G[k]); });
      const LAB = {}; const reg = (k, l) => { (LAB[k] = LAB[k] || []).push(l); return l; };
      /* ================= 📈 연직으로 쏘아 올리기 (로그 눈금: 지표 R → 100 R) ================= */
      const RE3 = 1.7, HH = 7.0;
      const c = document.createElement('canvas'); c.width = 512; c.height = 256; const g = c.getContext('2d');
      g.fillStyle = '#1f6fb5'; g.fillRect(0, 0, 512, 256); let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      for (let i = 0; i < 70; i++) { const x = rnd() * 512, y = 30 + rnd() * 196, r = 8 + rnd() * 34; g.fillStyle = rnd() > 0.2 ? '#4a9d5c' : '#c9b873'; g.beginPath(); g.ellipse(x, y, r, r * 0.6, rnd() * 3, 0, 7); g.fill(); }
      g.fillStyle = '#f1f5f9'; g.fillRect(0, 0, 512, 14); g.fillRect(0, 242, 512, 14);
      const earth = new THREE.Mesh(new THREE.SphereGeometry(RE3, 64, 48), M(0xffffff, { map: new THREE.CanvasTexture(c), roughness: 0.75 })); earth.position.y = -RE3; G.well.add(earth);
      const rock = new THREE.Group(); { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.7, 16), M(0xf1f5f9, { roughness: 0.4 })); b.position.y = 0.35; rock.add(b); const n = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.3, 16), M(0xe2464b)); n.position.y = 0.85; rock.add(n); [0, 2.1, 4.2].forEach((a) => { const f = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.28, 0.16), M(0xe2464b)); f.position.set(Math.cos(a) * 0.2, 0.12, Math.sin(a) * 0.2); f.rotation.y = -a; rock.add(f); }); } G.well.add(rock);
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.6, 12), new THREE.MeshBasicMaterial({ color: 0xffa94d })); flame.rotation.x = Math.PI; flame.position.y = -0.3; rock.add(flame);
      const axisW = new THREE.Mesh(new THREE.BoxGeometry(0.03, HH, 0.03), M(0x8a95a8)); axisW.position.y = HH / 2; G.well.add(axisW);
      [1, 2, 5, 10, 20, 50, 100].forEach((k) => { const y = HH * Math.log(k) / Math.log(100); const t = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.03, 0.03), M(0xdbe4f5)); t.position.set(0.2, y, 0); G.well.add(t); reg('well', label(k === 1 ? '지표 (R)' : k + ' R', [0.9, y, 0], { color: '#475569', size: 11 })); });
      const wTrail = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ color: 0xffd34d })); void wTrail;
      let wtr = null, wtKey = ''; const wV = mkArrow(0x22c55e, 0.05), wGr = mkArrow(0xef4444, 0.05); G.well.add(wV, wGr);
      const lwv = reg('well', label('속도 v', wV, { color: '#15803d', size: 12, offset: [-1.2, 0.55, 0] })), lwg = reg('well', label('중력', wGr, { color: '#b91c1c', size: 12, offset: [-1.1, -0.25, 0] })), lwr = reg('well', label('', rock, { color: '#26324a', size: 12 })), lwa = reg('well', label('최고점', [0.6, 0, 0], { color: '#7c3aed', size: 12 }));
      function wellScene(A, S) {
        const w = S.w, E = A.etot(w.v0), yOf = (r) => HH * Math.log(Math.max(r, A.RE_) / A.RE_) / Math.log(100);
        const y = yOf(w.r); rock.position.set(0, y, 0); flame.visible = w.st === 'run' && w.v > 0;
        const key = w.trail.length + '|' + (w.trail[w.trail.length - 1] || 0); if (key !== wtKey) { wtKey = key; if (wtr) { G.well.remove(wtr); wtr.geometry.dispose(); wtr = null; } if (w.trail.length > 2) { const mx = Math.max.apply(null, w.trail); const pts = [new V3(-0.25, 0, 0), new V3(-0.25, yOf(mx), 0)]; wtr = tube(pts, 0.03, 0xffd34d, { basic: true, op: 0.8 }); G.well.add(wtr); } }
        setArrow(wV, new V3(0.4, y + 0.5, 0), new V3(0.4, y + 0.5 + (w.v >= 0 ? 1 : -1) * Math.min(1.8, 0.3 + Math.abs(w.v) / 1000 * 0.12), 0)); setArrow(wGr, new V3(-0.4, y + 0.5, 0), new V3(-0.4, y + 0.5 - 0.6, 0)); lwv.off = [0.5, 0.2, 0]; lwg.off = [-0.6, -0.2, 0];
        lwr.set(w.st === 'ready' ? '우주선 (발사 대기)' : '우주선'); lwr.off = [0.9, 0.8, 0];
        lwa.show(!!w.apex); if (w.apex) lwa.obj = [0.6, yOf(w.apex), 0];
        info('<b>📈 연직으로 쏘아 올리기</b> · 발사 속력 v₀ = <b>' + w.v0.toFixed(1) + ' km/s</b> · 지금 속도 ' + f1(w.v / 1000) + ' km/s · 높이 ' + sci(Math.max(0, (w.r - A.RE_) / 1000), 1) + ' km<br>총 에너지 E = ½mv² − GMm/r (1 kg당 ' + (E >= 0 ? '+' : '−') + Math.abs(E).toFixed(1) + ' MJ) ' + (E >= 0 ? '≥ 0 → <b>탈출</b>해요 (되돌아오지 않아요)' : '< 0 → 최고점에서 멈추고 <b>되돌아와요</b>') + '<br>' + (w.msg || '발사해서 최고 고도를 기록해요 (세로 눈금은 로그 눈금이에요).') + (w.rec && w.rec.length ? '<br>📋 최고 고도 기록: ' + w.rec.slice(-4).map((q) => q.v0.toFixed(1) + ' km/s → ' + sci(q.h, 1) + ' km').join(' · ') : '') + '<br><span style="opacity:.8">발사 속력은 옆 조작판에서 정해요.</span>');
      }
      /* ================= 🧑‍🚀 우주인과 공 (우주 공간에 정지한 눈금 기준) ================= */
      const rulerA = new THREE.Mesh(new THREE.BoxGeometry(18, 0.06, 0.4), M(0x334155)); rulerA.position.set(0, -1.6, 0); G.astro.add(rulerA);
      for (let i = -9; i <= 9; i++) { const t = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.3, 0.1), M(0xffffff)); t.position.set(i, -1.4, 0); G.astro.add(t); }
      const man = new THREE.Group(); { const b = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.1, 0.5), M(0xf2f5fb)); b.position.y = 0.2; man.add(b); const h = new THREE.Mesh(new THREE.SphereGeometry(0.36, 20, 14), M(0xf4f6fb)); h.position.y = 1.1; man.add(h); const v = new THREE.Mesh(new THREE.SphereGeometry(0.26, 14, 10), M(0x2f4a8a)); v.position.set(0.12, 1.12, 0.2); man.add(v); } G.astro.add(man);
      const ballA = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 18), M(0xf59e0b, { roughness: 0.3 })); G.astro.add(ballA);
      const aMan = mkArrow(0x22c55e, 0.05), aBall = mkArrow(0xef4444, 0.05); G.astro.add(aMan, aBall);
      const laM = reg('astro', label('우주인', man, { color: '#1d4ed8', size: 12 })), laB = reg('astro', label('', ballA, { color: '#c2410c', size: 12 })), laR = reg('astro', label('정지한 눈금 (기준)', [-6.5, -1.9, 0], { color: '#475569', size: 11 }));
      const PXU = 0.03;
      function astroScene(A, S) {
        const a = S.as, cm = a.cm != null ? a.cm : a.m, cv = a.cv != null ? a.cv : a.v;
        const mx = a.x * PXU, bx = (a.st === 'ready' ? 0.9 : a.bx * PXU + 0.9) ;
        man.position.set(mx, 0, 0); const rr = 0.18 + Math.min(0.16, (cm * 1.0 + 6) * 0.012); ballA.scale.setScalar(rr * 2); ballA.position.set(bx, 0.6, 0.1);
        const va = cm * cv / A.M_ASTRO;
        if (a.st !== 'ready') { setArrow(aMan, new V3(mx, 1.9, 0), new V3(mx - Math.min(2.2, va * 1.1 + 0.2), 1.9, 0)); setArrow(aBall, new V3(bx, 1.4, 0), new V3(bx + Math.min(3.0, cv * 0.12 + 0.2), 1.4, 0)); } else { aMan.visible = aBall.visible = false; }
        laM.off = [0, 1.9, 0]; laB.set('공 ' + cm + ' kg'); laB.off = [0, 0.7, 0];
        info('<b>🧑‍🚀 우주인과 공 (운동량 보존)</b> · 우주인 ' + A.M_ASTRO + ' kg · 공 ' + cm + ' kg · 던지는 속력 ' + cv + ' m/s<br>처음 총 운동량은 0 → 공을 던지면 우주인은 <b>반대 방향</b>으로 밀려나요.<br>' + (a.st === 'ready' ? '공을 던져 보세요 (옆 조작판).' : '공의 운동량 ' + (cm * cv) + ' kg·m/s = 우주인의 운동량 → 우주인의 속력 = ' + f2(va) + ' m/s') + '<br><span style="opacity:.8">공의 질량과 던지는 속력은 옆 조작판에서 바꿔요.</span>');
      }
      /* ================= 🔥 로켓 분출 ================= */
      const rk = new THREE.Group(); { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.5, 2.2, 24), M(0xe5e7eb, { roughness: 0.35 })); rk.add(b); const n = new THREE.Mesh(new THREE.ConeGeometry(0.45, 0.9, 24), M(0xe2464b)); n.position.y = 1.55; rk.add(n); [0, 2.1, 4.2].forEach((a) => { const f = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.7, 0.5), M(0xe2464b)); f.position.set(Math.cos(a) * 0.62, -0.8, Math.sin(a) * 0.62); f.rotation.y = -a; rk.add(f); }); const w = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 10), M(0x6cb4ff)); w.position.set(0, 0.5, 0.45); rk.add(w); } G.rocket.add(rk);
      const rFlame = new THREE.Mesh(new THREE.ConeGeometry(0.4, 1, 16), new THREE.MeshBasicMaterial({ color: 0xffa040, transparent: true, opacity: 0.85 })); rFlame.rotation.x = Math.PI; G.rocket.add(rFlame);
      const padM = new THREE.Mesh(new THREE.BoxGeometry(5, 0.3, 3), M(0x64748b)); padM.position.y = -1.7; G.rocket.add(padM);
      const stars = new THREE.Points((() => { const g2 = new THREE.BufferGeometry(); const p = new Float32Array(150 * 3); for (let i = 0; i < 150; i++) { p[i * 3] = (rnd() - 0.5) * 24; p[i * 3 + 1] = (rnd() - 0.5) * 14; p[i * 3 + 2] = -3 - rnd() * 3; } g2.setAttribute('position', new THREE.BufferAttribute(p, 3)); return g2; })(), new THREE.PointsMaterial({ color: 0xffffff, size: 0.07 })); G.rocket.add(stars);
      const gasA = mkArrow(0xffb36b, 0.07), rkA = mkArrow(0x14a058, 0.07), wtA = mkArrow(0xe2464b, 0.06); G.rocket.add(gasA, rkA, wtA);
      const lrG = reg('rocket', label('가스가 받는 힘 (뒤로)', gasA, { color: '#9a3412', size: 12 })), lrR = reg('rocket', label('로켓이 받는 힘 (앞으로)', rkA, { color: '#0b6b39', size: 12 })), lrW = reg('rocket', label('무게', wtA, { color: '#b91c1c', size: 12 })), lrV = reg('rocket', label('진공 (밀어낼 공기가 없어요)', [0, 3.3, 0], { color: '#1e293b', size: 12 }));
      const gasP = []; for (let i = 0; i < 40; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffb347, transparent: true })); m.visible = false; G.rocket.add(m); gasP.push({ m, t: i / 40 }); }
      function rocketScene(A, S, dt, tm) {
        const r = S.rk, th = A.rkThrust(), pad = r.env === 'pad';
        padM.visible = pad; stars.visible = !pad; lrV.show(!pad);
        const y = pad ? clamp(r.y / 700 * 5, 0, 5) : 0; rk.position.set(0, y, 0); rk.rotation.z = 0;
        const fl = r.firing ? 0.8 + th / 25 : 0; rFlame.visible = fl > 0; rFlame.scale.set(1, fl, 1); rFlame.position.set(0, y - 1.1 - fl / 2, 0);
        gasP.forEach((q, i) => { q.t = (q.t + dt * (0.8 + r.u * 0.15)) % 1; q.m.visible = !!r.firing; if (r.firing) { q.m.position.set((((i * 37) % 10) - 5) * 0.06, y - 1.2 - q.t * (2 + r.u * 0.7), (((i * 53) % 10) - 5) * 0.06); q.m.material.opacity = 1 - q.t; } });
        if (r.firing) { const L = clamp(th * 0.2, 0.7, 2.6); setArrow(gasA, new V3(1.0, y - 0.6, 0), new V3(1.0, y - 0.6 - L, 0)); setArrow(rkA, new V3(1.0, y + 0.2, 0), new V3(1.0, y + 0.2 + L, 0)); } else { gasA.visible = rkA.visible = false; }
        lrG.off = [0.8, 0, 0]; lrR.off = [0.8, 0, 0]; lrG.show(!!r.firing); lrR.show(!!r.firing);
        if (pad) { setArrow(wtA, new V3(-1.0, y + 0.2, 0), new V3(-1.0, y + 0.2 - 1.4, 0)); lrW.show(true); lrW.off = [-0.7, 0, 0]; } else { wtA.visible = false; lrW.show(false); }
        info('<b>🔥 로켓 분출 · ' + (pad ? '발사대 (대기 중)' : '우주 공간 (진공)') + '</b><br>가스를 뒤로 밀어내면 가스가 로켓을 앞으로 미는 <b>반작용</b>이 생겨요 (작용 반작용 · 운동량 보존).<br>분출 속력 u = ' + r.u + ' · 분출량 f = ' + r.f + ' → 추력 ∝ u × f = ' + th + (pad ? ' (로켓 무게 ' + A.WEIGHT + ')' : '') + '<br>' + (pad ? (r.lifted || th > A.WEIGHT ? '추력이 무게보다 크면 떠올라요.' : '추력이 무게보다 작으면 뜨지 못해요.') : '밀어낼 공기가 없어도 가스를 밀어내는 반작용으로 가속돼요. 속도 ' + f1(r.vel)) + '<br><span style="opacity:.8">환경 · 분출 속력 · 분출량은 옆 조작판에서 바꿔요.</span>');
      }
      const STG = [0, 1, 2];
      /* ================= 🪐 행성 비교: 대기 분자가 빠져나가는 상자 ================= */
      ['planet', 'launch', 'stage'].forEach((k) => { G[k] = new THREE.Group(); root.add(G[k]); });
      const AW = 8, AH = 3.6, AD = 1.8, KX = AW / 438, KY = AH / 198, NMOL = 27;
      const boxP = new THREE.Mesh(new THREE.BoxGeometry(AW, AH, AD), new THREE.MeshStandardMaterial({ color: 0x4f7fd0, transparent: true, opacity: 0.16, roughness: 0.2, depthWrite: false })); boxP.position.set(0, AH / 2, 0); G.planet.add(boxP);
      const edgeP = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(AW, AH, AD)), new THREE.LineBasicMaterial({ color: 0xcfe0ff, transparent: true, opacity: 0.5 })); edgeP.position.copy(boxP.position); G.planet.add(edgeP);
      const gndP = new THREE.Mesh(new THREE.BoxGeometry(AW + 0.4, 0.5, AD + 0.4), M(0x3b82f6)); gndP.position.set(0, -0.25, 0); G.planet.add(gndP);
      const lidL = new THREE.Mesh(new THREE.BoxGeometry(1, 0.14, AD), M(0x94a3b8, { metalness: 0.5 })), lidR = lidL.clone(); lidL.position.y = lidR.position.y = AH; G.planet.add(lidL, lidR);
      const molP = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 14, 10), M(0xffffff, { roughness: 0.3 }), NMOL); molP.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(NMOL * 3), 3); molP.frustumCulled = false; G.planet.add(molP);
      const bodyBall = new THREE.Mesh(new THREE.SphereGeometry(1.6, 40, 28), M(0x888888)); bodyBall.position.set(0, 1.6, -0.5); G.planet.add(bodyBall);
      const lPg = [0, 1, 2].map((i) => reg('planet', label('', [-2.6 + i * 2.6, AH + 0.9, 0], { color: ['#0284c7', '#15803d', '#c2410c'][i], size: 12 })));
      const lPt = reg('planet', label('', [0, AH + 1.7, 0], { color: '#334155', size: 13 })), lPs = reg('planet', label('', gndP, { color: '#475569', size: 12 })), lPl = reg('planet', label('', [0, AH + 0.35, 0], { color: '#7c2d12', size: 12 })), lPo = reg('planet', label('빠져나간 분자', [AW / 2 - 1.2, AH + 1.0, 0], { color: '#b45309', size: 12 }));
      const gC3 = [new THREE.Color(0x38bdf8), new THREE.Color(0x22c55e), new THREE.Color(0xf97316)], mm4 = new THREE.Matrix4(), qI = new THREE.Quaternion(), vP = new V3(), vS = new V3(), tc = new THREE.Color();
      function planetScene(A, S) {
        const p = S.pl, b = A.BODIES[p.i], can = b.can;
        bodyBall.visible = !can; boxP.visible = edgeP.visible = can; lidL.visible = lidR.visible = can; molP.visible = can; gndP.visible = can; lPg.forEach((l) => l.show(can)); lPo.show(can && p.lid < 0.35 && p.gone.some((n) => n > 0)); lPl.show(can && p.lid > 0.8);
        if (can) { gndP.material.color.set(b.col); lPs.set(b.n + ' 표면'); lPs.off = [0, 0, 1.4]; } else { bodyBall.material.color.set(b.col); bodyBall.scale.setScalar(b.n === '태양' ? 1.3 : 1); lPs.set(b.n); lPs.obj = bodyBall; lPs.off = [0, 2.0, 0]; }
        const hw = AW / 2 * p.lid; lidL.scale.x = Math.max(0.001, hw); lidL.position.x = -AW / 2 + hw / 2; lidR.scale.x = Math.max(0.001, hw); lidR.position.x = AW / 2 - hw / 2; lidL.visible = lidR.visible = can && p.lid > 0.02;
        lPl.set('🔒 예측 중: 뚜껑이 닫혀 있어요');
        A.GASES.forEach((g, i) => lPg[i].set(g.n + ' ' + A.vrmsOf(g, b.Tk).toFixed(2) + ' km/s'));
        for (let i = 0; i < NMOL; i++) {
          const m = p.mol[i]; if (!m || !can || !m.alive) { vS.setScalar(0); vP.set(0, -9, 0); mm4.compose(vP, qI, vS); molP.setMatrixAt(i, mm4); continue; }
          const g = A.GASES[m.g], a = m.a * (m.out ? clamp(1 - m.out / 1.4, 0, 1) : 1), z = (((i * 37) % 10) - 4.5) / 4.5 * (AD / 2 - 0.2);
          vP.set(m.x * KX - AW / 2, AH - m.y * KY, z); vS.setScalar(g.r * 0.03 * Math.max(0.01, a)); mm4.compose(vP, qI, vS); molP.setMatrixAt(i, mm4); molP.setColorAt(i, gC3[m.g]);
        }
        molP.instanceMatrix.needsUpdate = true; molP.instanceColor.needsUpdate = true;
        const orb = b.vesc / Math.SQRT2;
        lPt.set(b.n + ' · 탈출 속도 ' + b.vesc.toFixed(1) + ' km/s' + (can ? ' · 표면 약 ' + b.Tk + ' K' : '')); if (!can) { lPt.obj = bodyBall; lPt.off = [0, 2.6, 0]; } else { lPt.obj = [0, -1.0, 0]; lPt.off = [0, 0, 0]; }
        info('<b>🪐 행성 비교</b> · ' + b.n + ' 탈출 속도 √(2GM/R) = <b>' + b.vesc.toFixed(1) + ' km/s</b> (표면 원 궤도 속력 ' + orb.toFixed(1) + ' km/s의 √2배)<br>' + (can ? '분자의 평균 속력(v_rms)이 탈출 속도의 1/6보다 빠르면 오래 못 붙잡아요: 가벼운 H₂가 먼저 빠져나가요.' + (p.gone.some((n) => n > 0) ? '<br>빠져나간 분자: ' + A.GASES.map((g, gi) => g.n + ' ' + p.gone[gi] + '/9').join(' · ') : '') : b.note));
      }
      /* ================= 🛰️ 궤도 진입: 북극 위에서 본 지구 ================= */
      const gL = G.launch, KL = 0.025;
      const earthL = new THREE.Mesh(new THREE.SphereGeometry(92 * KL, 48, 32), M(0xffffff, { map: earth.material.map, roughness: 0.75 })); gL.add(earthL);
      const ringL = new THREE.Mesh(new THREE.TorusGeometry(142 * KL, 0.025, 6, 96), new THREE.MeshBasicMaterial({ color: 0xffe58a, transparent: true, opacity: 0.55 })); ringL.rotation.x = Math.PI / 2; gL.add(ringL);
      const padL = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffd447 })); padL.position.set(0, 0.1, -92 * KL); gL.add(padL);
      const rkL = new THREE.Group(); { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.5, 14), M(0xf1f5f9)); b.position.y = 0; rkL.add(b); const n = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.22, 14), M(0xe2464b)); n.position.y = 0.36; rkL.add(n); } rkL.scale.setScalar(1.8); gL.add(rkL);
      const flL = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.5, 10), new THREE.MeshBasicMaterial({ color: 0xffa94d })); flL.rotation.x = Math.PI; flL.position.y = -0.5; rkL.add(flL);
      const marksL = STG.map((q, i) => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), new THREE.MeshBasicMaterial({ color: i === 2 ? 0x22c55e : 0xffffff })); m.visible = false; gL.add(m); return m; });
      let trL = null, trKey = '';
      const spinA = mkArrow(0xffd447, 0.05); gL.add(spinA);
      const lLe = reg('launch', label('지구 (북극 위에서 본 모습)', [0, 0, 92 * KL * 0.45], { color: '#1e40af', size: 12 })), lLp = reg('launch', label('발사 지점 (적도)', padL, { color: '#a16207', size: 12, offset: [0, 0.4, 0] })), lLr = reg('launch', label('원 궤도 (약 7.7 km/s)', [142 * KL * 0.75, 0, -142 * KL * 0.75], { color: '#a16207', size: 11 })), lLv = reg('launch', label('', rkL, { color: '#1d4ed8', size: 12, offset: [0, 0.5, 0] })), lLs = reg('launch', label('', [0, 0, 92 * KL * 0.2], { color: '#14a058', size: 12 })), lLd = reg('launch', label('동', [-92 * KL - 0.9, 0, -92 * KL - 0.5], { color: '#a16207', size: 12 })), lLw = reg('launch', label('서', [92 * KL + 0.9, 0, -92 * KL - 0.5], { color: '#a16207', size: 12 }));
      const lnBtn = controls.button('▶ 발사 보기', () => { const A = sim(); if (A) A.lnPlay(); });
      const LPH = [['① 수직 상승', 0, 0.12], ['② 서서히 기울이기', 0.12, 0.3], ['③ 수평 가속', 0.3, 0.85], ['④ 엔진 정지: 자유 낙하하는 원 궤도', 0.85, 2]];
      function launchScene(A, S) {
        const l = S.ln, K = KL / (PHN ? 1 : 1) * (PHN ? 92 / 70 : 1), orbExtra = l.done && l.path === 'orbit' ? l.orb : 0;
        const P = (s, o) => { const q = A.lnPos(s, o || 0); return new V3(q.x * K, 0.05, q.y * K); };
        earthL.scale.setScalar(A.EARTH_R * K / (92 * KL)); ringL.scale.setScalar(A.RING_R * K / (142 * KL)); padL.position.set(0, 0.1, -A.EARTH_R * K);
        earthL.rotation.y = S.clock * 0.05;
        const key = l.p.toFixed(3) + '|' + orbExtra.toFixed(2) + l.path + l.dir;
        if (key !== trKey) {
          trKey = key; if (trL) { gL.remove(trL); trL.geometry.dispose(); trL = null; }
          if (l.p > 0.01) { const n = Math.max(3, Math.floor(l.p * 100)), pts = []; for (let i = 0; i <= n; i++) pts.push(P(l.p * i / n, 0)); if (orbExtra > 0) for (let a = 0.05; a <= orbExtra; a += 0.06) pts.push(P(1, a)); trL = tube(pts, 0.05, 0xffc85a, { basic: true }); gL.add(trL); }
        }
        const q = P(l.p, orbExtra), q2 = P(Math.min(1, l.p + 0.01), orbExtra + (l.p >= 1 ? 0.02 : 0)), q1 = P(Math.max(0, l.p - 0.01), Math.max(0, orbExtra - (l.p >= 1 ? 0.02 : 0)));
        let dir = new V3().subVectors(q2, q1); if (l.p <= 0.001) dir.set(0, 0, -1); if (l.path === 'vert' && l.p > 0.5) dir = new V3(0, 0, 1) ; if (dir.length() < 1e-5) dir.set(0, 0, -1); dir.normalize();
        rkL.position.copy(q).add(new V3(0, 0.2, 0)); rkL.quaternion.setFromUnitVectors(new V3(0, 1, 0), dir);
        const eng = (l.playing && l.path === 'orbit' && l.p < 0.85) || (l.playing && l.path === 'vert' && l.p < 0.5); flL.visible = eng; flL.scale.y = 0.7 + 0.3 * Math.sin(S.clock * 40);
        A.STAGE_PTS.forEach((sp, i) => { const on = l.path === 'orbit' && l.p >= sp.s; marksL[i].visible = on; if (on) marksL[i].position.copy(P(sp.s, 0)).setY(0.1); });
        const sg = l.dir === 'E' ? 1 : -1; setArrow(spinA, new V3(0.0, 0.2, -A.EARTH_R * K - 0.15), new V3(-1.2, 0.2, -A.EARTH_R * K - 0.15)); spinA.visible = true;
        const sp = l.path === 'orbit' ? A.lnSpeed(l.p) : 0, E = l.dir === 'E', need = E ? A.V_ORB - A.V_ROT : A.V_ORB + A.V_ROT;
        lLv.set('수평 속력 ' + sp.toFixed(1) + ' km/s'); lLv.show(l.p > 0.001);
        lLs.set(l.path === 'vert' && l.p >= 1 ? '수평 속력이 없으면 그대로 떨어져요 ❌' : l.path === 'vert' && l.p > 0.45 ? '올라간 만큼 다시 떨어져요' : l.path === 'orbit' && l.done ? '엔진 정지: 자유 낙하하며 원 궤도를 돌아요 ✅' : '');
        lLs.show(lLs.el.textContent !== '' );
        const ph = LPH.filter((q3) => l.p >= q3[1] && l.p < q3[2]); const phn = l.path === 'vert' ? '위로만 쏘기 (수평 속력 0)' : (l.p > 0 ? (ph[0] ? ph[0][0] : '④ 엔진 정지') : '발사 대기');
        info('<b>🛰️ 궤도 진입</b> · ' + (E ? '동쪽' : '서쪽') + ' 발사 · ' + phn + '<br>궤도 속력 ' + A.V_ORB + ' km/s, 자전 속력 ' + A.V_ROT + ' km/s (적도) → 로켓이 낼 몫 = ' + A.V_ORB + (E ? ' − ' : ' + ') + A.V_ROT + ' = <b>' + need.toFixed(2) + ' km/s</b><br>지구가 자전하는 방향(동쪽)으로 쏘면 이득이에요. (축척 아님)');
      }
      /* ================= 🎯 다단 로켓 ================= */
      const gS = G.stage, KS = 0.03;
      const gndS = new THREE.Mesh(new THREE.BoxGeometry(8, 0.5, 4), M(0x64748b)); gndS.position.y = -0.25; gS.add(gndS);
      const pad2 = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.15, 1.8), M(0x94a3b8)); pad2.position.y = 0.075; gS.add(pad2); gndS.add(pad2); pad2.position.y = 0.325;
      const starsS = new THREE.Points((() => { const g2 = new THREE.BufferGeometry(), p = new Float32Array(120 * 3); for (let i = 0; i < 120; i++) { p[i * 3] = (rnd() - 0.5) * 22; p[i * 3 + 1] = rnd() * 12 - 2; p[i * 3 + 2] = -4 - rnd() * 3; } g2.setAttribute('position', new THREE.BufferAttribute(p, 3)); return g2; })(), new THREE.PointsMaterial({ color: 0xffffff, size: 0.08 })); gS.add(starsS);
      const stg = [0, 1, 2].map((i) => { const g3 = new THREE.Group(); const body = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 28), M([0xe1e8f5, 0xe8eef9, 0xf2f5fb][i], { roughness: 0.35 })); const fuel = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 24), M(0xffa733, { emissive: 0x7c3a00, transparent: true, opacity: 0.9 })); const fl = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1, 14), new THREE.MeshBasicMaterial({ color: 0xffa94d, transparent: true, opacity: 0.85 })); fl.rotation.x = Math.PI; g3.add(body, fuel, fl); g3.userData = { body, fuel, fl }; gS.add(g3); return g3; });
      const satS = new THREE.Group(); { const c1 = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.0, 20), M(0xe2464b)); c1.position.y = 0.5; satS.add(c1); const s1 = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 10), M(0xffd447, { emissive: 0x7c5a00 })); s1.position.y = 0.3; satS.add(s1); } gS.add(satS);
      const okRing = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.04, 8, 40), new THREE.MeshBasicMaterial({ color: 0x22c55e })); gS.add(okRing);
      const lSt = [0, 1, 2].map((i) => reg('stage', label((i + 1) + '단', stg[i], { color: '#334155', size: 12 })));
      const lSs = reg('stage', label('위성', satS, { color: '#b45309', size: 12, offset: [0, 1.4, 0] })), lSa = reg('stage', label('', [2.6, 3.3, 0], { color: '#9a3412', size: 13 })), lSr = reg('stage', label('', [2.6, 5.0, 0], { color: '#14a058', size: 13 }));
      const dropM = [0, 1].map(() => { const m = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 24), new THREE.MeshStandardMaterial({ color: 0xcbd5e6, transparent: true, roughness: 0.5 })); m.visible = false; gS.add(m); return m; });
      const stBtn = controls.button('🚀 발사 보기', () => { const A = sim(); if (A) A.sgLaunch(); });
      function stageScene(A, S) {
        const g = S.sg, plan = A.sgPlan(), model = g.model && g.st !== 'ready' ? g.model : A.sgModel(plan), now = A.sgNow(), n = plan.length, k = g.st === 'ready' ? 0 : clamp(g.v / A.SG_REQ, 0, 1);
        const shift = (clamp(k * 520, 0, 260) * (g.st === 'ready' ? 0 : 1)) * KS; gndS.position.y = -0.25 - shift; starsS.visible = k > 0.2;
        const hs = plan.map((p) => (22 + p.fuel * 0.9) * KS), ws = plan.map((p, i) => (48 - 7 * i) * KS * 0.5);
        const base = g.st === 'ready' ? 0 : Math.min(60 * KS, shift * 0.2);
        let y = base + 0.0; const tNow = g.t;
        for (let i = 0; i < 3; i++) {
          const gr = stg[i], u = gr.userData; if (i >= n) { gr.visible = false; lSt[i].show(false); continue; }
          const seg = model.segs[i], gone = g.st !== 'ready' && tNow >= seg.t1 - 1e-9 && i < n - 1; gr.visible = !gone; lSt[i].show(!gone);
          if (gone) continue;
          const h = hs[i], w = ws[i], bf = g.st === 'ready' ? 0 : clamp((tNow - seg.t0) / (seg.t1 - seg.t0), 0, 1);
          u.body.scale.set(w, h, w); u.body.position.y = y + h / 2; u.fuel.scale.set(w * 0.82, Math.max(0.001, (h - 0.2) * (1 - bf)), w * 0.82); u.fuel.position.y = y + 0.1 + (h - 0.2) * (1 - bf) / 2; u.fuel.visible = bf < 1;
          const burning = g.st === 'run' && tNow < seg.t1 && tNow >= seg.t0; u.fl.visible = burning; const fh = (0.6 + 0.6 * (w / 0.72)) * (1 + 0.1 * Math.sin(S.clock * 40)); u.fl.scale.set(w * 1.1, fh, w * 1.1); u.fl.position.y = y - fh / 2;
          lSt[i].obj = u.body; lSt[i].off = [w + 0.7, 0, 0];
          y += h;
        }
        satS.position.y = y; lSs.off = [0, 1.4, 0];
        okRing.visible = g.st === 'done' && g.ok; okRing.position.y = y + 0.5; okRing.rotation.x = Math.PI / 2;
        const yb = (i) => { let yy = base; for (let j = 0; j < i; j++) { const gone2 = g.st !== 'ready' && tNow >= model.segs[j].t1 - 1e-9 && j < n - 1; if (!gone2) yy += hs[j]; } return yy; };
        dropM.forEach((m, di) => { const d = g.drops[di]; if (!d) { m.visible = false; return; } m.visible = true; m.material.opacity = d.a; m.scale.set(ws[d.i], hs[d.i], ws[d.i]); m.position.set(d.x * KS * 1.0, yb(d.i) - d.y * KS + hs[d.i] / 2, 0); m.rotation.z = d.rot; });
        lSa.set('가속도 a = 추력/질량 = ' + now.a.toFixed(3) + ' (질량 ' + Math.round(now.m) + ')'); lSa.show(g.st !== 'ready');
        const live = g.st === 'ready' || g.st === 'done' ? model.score : g.v / A.SG_REQ * 100;
        lSr.set(g.st === 'done' ? (g.ok ? '궤도 속력에 도달! 위성을 올렸어요 ✅' : '속력이 모자라요: 위성이 궤도에 못 올라요 ❌') : ''); lSr.show(g.st === 'done');
        info('<b>🎯 다단 로켓</b> · ' + n + '단 로켓 (연료 ' + plan.map((p) => Math.round(p.fuel) + '%').join(' · ') + ')<br>궤도 속력 달성도: <b>' + Math.round(live) + ' %</b> (단일 로켓 ' + Math.round(A.SG_BASE) + ' %, 100 % = 궤도 속력)<br>단을 버리면 질량이 줄어 같은 추력으로도 가속도가 껑충 커져요. 점수는 비교용 상대값이에요.');
      }
      let cur = '';
      function setMode(S) {
        const mode = S.mode; if (mode === cur) return; cur = mode;
        Object.keys(G).forEach((k) => (G[k].visible = k === mode)); Object.keys(LAB).forEach((k) => LAB[k].forEach((l) => l.show(k === mode)));
        const cams = { planet: { tx: 0, ty: 1.8, tz: 0, phi: 1.25, theta: 0.25, dist: 13 }, launch: { tx: 0, ty: 0, tz: 0, phi: 0.45, theta: 0, dist: 12 }, stage: { tx: 0, ty: 2.8, tz: 0, phi: 1.35, theta: 0.3, dist: 13 }, well: { tx: 0, ty: 3.3, tz: 0, phi: 1.3, theta: 0.5, dist: 12 }, astro: { tx: 0, ty: 0.3, tz: 0, phi: 1.3, theta: 0.2, dist: 7 }, rocket: { tx: 0, ty: 1.5, tz: 0, phi: 1.3, theta: 0.35, dist: 12 } };
        const c2 = cams[mode]; if (c2) Object.assign(orbit, c2, { dist: c2.dist * KD });
      }
      return {
        update(dt, tm) {
          const A = sim(); if (!A || !A.S) return; const S = A.S;
          setMode(S);
          if (S.mode === 'well') wellScene(A, S); else if (S.mode === 'astro') astroScene(A, S); else if (S.mode === 'rocket') rocketScene(A, S, Math.min(dt, 0.05), tm);
          else if (S.mode === 'planet') planetScene(A, S); else if (S.mode === 'launch') launchScene(A, S); else stageScene(A, S);
          lnBtn.style.display = S.mode === 'launch' ? '' : 'none'; stBtn.style.display = S.mode === 'stage' ? '' : 'none';
        },
        sync() {},
      };
    },
  });
})();
