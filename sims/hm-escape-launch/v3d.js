/* hm-escape-launch · 3D 탈출 속도와 로켓
   2D 실험(window.__sim)의 장면을 그대로 입체로 보여 줘요: 📈 탈출 조건(연직으로 쏘아 올리기 · 총 에너지 E = ½mv² − GMm/r) · 🧑‍🚀 우주인과 공(운동량 보존) · 🔥 로켓 분출(작용 반작용).
   값(발사 속력 · 공 · 분출 속력 · 분출량)은 옆 조작판이 정하고 3D는 따라가요. 로켓 방정식과 공기 저항은 다루지 않아요.
   (🪐 행성 비교 · 🛰️ 궤도 진입 · 다단 로켓은 2D 화면에서 해요) */
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
    levels: [0, 2],
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
      const lwv = reg('well', label('속도 v', wV, { color: '#15803d', size: 12 })), lwg = reg('well', label('중력', wGr, { color: '#b91c1c', size: 12 })), lwr = reg('well', label('', rock, { color: '#26324a', size: 12 })), lwa = reg('well', label('최고점', [0.6, 0, 0], { color: '#7c3aed', size: 12 }));
      function wellScene(A, S) {
        const w = S.w, E = A.etot(w.v0), yOf = (r) => HH * Math.log(Math.max(r, A.RE_) / A.RE_) / Math.log(100);
        const y = yOf(w.r); rock.position.set(0, y, 0); flame.visible = w.st === 'run' && w.v > 0;
        const key = w.trail.length + '|' + (w.trail[w.trail.length - 1] || 0); if (key !== wtKey) { wtKey = key; if (wtr) { G.well.remove(wtr); wtr.geometry.dispose(); wtr = null; } if (w.trail.length > 2) { const mx = Math.max.apply(null, w.trail); const pts = [new V3(-0.25, 0, 0), new V3(-0.25, yOf(mx), 0)]; wtr = tube(pts, 0.03, 0xffd34d, { basic: true, op: 0.8 }); G.well.add(wtr); } }
        setArrow(wV, new V3(0.4, y + 0.5, 0), new V3(0.4, y + 0.5 + (w.v >= 0 ? 1 : -1) * Math.min(1.8, 0.3 + Math.abs(w.v) / 1000 * 0.12), 0)); setArrow(wGr, new V3(-0.4, y + 0.5, 0), new V3(-0.4, y + 0.5 - 0.6, 0)); lwv.off = [0.5, 0.2, 0]; lwg.off = [-0.6, -0.2, 0];
        lwr.set(w.st === 'ready' ? '우주선 (발사 대기)' : '우주선'); lwr.off = [0.9, 0.8, 0];
        lwa.show(!!w.apex); if (w.apex) lwa.obj = [0.6, yOf(w.apex), 0];
        info('<b>📈 연직으로 쏘아 올리기</b> · 발사 속력 v₀ = <b>' + w.v0.toFixed(1) + ' km/s</b> · 지금 속도 ' + f1(w.v / 1000) + ' km/s · 높이 ' + sci(Math.max(0, (w.r - A.RE_) / 1000), 1) + ' km<br>총 에너지 E = ½mv² − GMm/r (1 kg당 ' + (E >= 0 ? '+' : '−') + Math.abs(E).toFixed(1) + ' MJ) ' + (E >= 0 ? '≥ 0 → <b>탈출</b>해요 (되돌아오지 않아요)' : '< 0 → 최고점에서 멈추고 <b>되돌아와요</b>') + '<br>' + (w.msg || '발사해서 최고 고도를 기록해요 (세로 눈금은 로그 눈금이에요).') + '<br><span style="opacity:.8">발사 속력은 옆 조작판에서 정해요.</span>');
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
      let cur = '';
      const NOTE = { planet: '🪐 행성 비교(탈출 속도와 대기 기체)는 2D 화면에서 해요. 위의 [▦ 2D]를 눌러 보세요.', launch: '🛰️ 궤도 진입과 다단 로켓은 2D 화면에서 해요. 위의 [▦ 2D]를 눌러 보세요.' };
      function setMode(S) {
        const mode = S.mode; if (mode === cur) return; cur = mode;
        Object.keys(G).forEach((k) => (G[k].visible = k === mode)); Object.keys(LAB).forEach((k) => LAB[k].forEach((l) => l.show(k === mode)));
        const cams = { well: { tx: 0, ty: 3.3, tz: 0, phi: 1.3, theta: 0.5, dist: 12 }, astro: { tx: 0, ty: 0.3, tz: 0, phi: 1.3, theta: 0.2, dist: 11 }, rocket: { tx: 0, ty: 1.5, tz: 0, phi: 1.3, theta: 0.35, dist: 12 } };
        const c2 = cams[mode]; if (c2) Object.assign(orbit, c2, { dist: c2.dist * KD });
      }
      return {
        update(dt, tm) {
          const A = sim(); if (!A || !A.S) return; const S = A.S;
          setMode(S);
          if (S.mode === 'well') wellScene(A, S); else if (S.mode === 'astro') astroScene(A, S); else if (S.mode === 'rocket') rocketScene(A, S, Math.min(dt, 0.05), tm);
          else info(NOTE[S.mode] || NOTE.launch);
        },
        sync() {},
      };
    },
  });
})();
