/* hp-field-potential · 3D 전기장과 전위차
   2D 실험(window.__sim)의 장면을 그대로 입체로 보여 줘요: ⚡ 전기력(두 점전하) · 🧭 전기장 지도(화살표 · 시험 전하) · 🔋 평행판 전위차(전하·전자).
   전하량·거리·전압 같은 값은 옆 조작판이 정하고 3D는 따라가요. (🏠 적용 장면은 2D 화면에서 해요) */
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
  const r1 = (v) => Math.round(v * 10) / 10, fmt = (v, d) => (Math.round(v * Math.pow(10, d)) / Math.pow(10, d)).toFixed(d);
  const trim = (s) => String(s).replace(/\.0$/, '');
  const POS = 0xe2464b, NEG = 0x2f6df6;
  window.SciSim3D.attach({
    title: '전기장과 전위차 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대 · 값은 옆 조작판에서 바꿔요',
    camera: { dist: 9 * KD, theta: 0.2, phi: 0.95, min: 3, max: 30, target: [0, 0, 0] },
    autoRotate: 0,
    levels: [0, 1, 2],
    build(ctx) {
      const { THREE, root, label, info, controls, orbit } = ctx;
      const { V3, M, mkArrow, setArrow, tube } = tools(THREE);
      const sim = () => ctx.lesson();
      const chargeMat = (s) => M(s > 0 ? POS : NEG, { roughness: 0.3, emissive: s > 0 ? 0x7f1d1d : 0x1e3a8a });
      const mkCharge = (txt) => { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 24), chargeMat(1)); m.castShadow = true; root.add(m); return m; };
      const gF = new THREE.Group(), gM = new THREE.Group(), gP = new THREE.Group(); root.add(gF, gM, gP);
      /* ================= ⚡ 전기력 ================= */
      const floorF = new THREE.Mesh(new THREE.BoxGeometry(10, 0.1, 6), M(0x2a3550, { roughness: 1 })); floorF.position.set(2.5, -0.1, 0); gF.add(floorF);
      const cA = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 24), chargeMat(1)), cB = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 24), chargeMat(1)); cA.castShadow = cB.castShadow = true; gF.add(cA, cB);
      const aFA = mkArrow(0xf26b3a, 0.09), aFB = mkArrow(0xf26b3a, 0.09); gF.add(aFA, aFB);
      const lA = label('', cA, { color: '#c0392b', size: 14 }), lB = label('', cB, { color: '#c0392b', size: 14 });
      const lFA = label('A가 받는 힘', aFA, { color: '#9a3412', size: 13 }), lFB = label('B가 받는 힘', aFB, { color: '#9a3412', size: 13 });
      const lD = label('', [0, 0, 0], { color: '#516079', size: 13 });
      const ruler = new THREE.Mesh(new THREE.BoxGeometry(1, 0.04, 0.05), M(0x9fb0d4)); gF.add(ruler);
      const ticks = []; for (let i = 0; i <= 5; i++) { const t = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.05, 0.3), M(0x9fb0d4)); gF.add(t); ticks.push(t); }
      const guideA = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1, 6), M(0xf6b08a)); guideA.rotation.x = Math.PI / 2; gF.add(guideA);
      function force(S) {
        const f = S.f, same = f.sb > 0, FMAX = 9 / 4, F = (f.qa * f.qb) / (f.d * f.d), pct = Math.round(100 * F / FMAX);
        const ra = f.ra / 40, rb = f.rb / 40;
        cA.scale.setScalar(ra); cA.material.color.setHex(POS); cA.position.set(0, ra, 0);
        cB.scale.setScalar(rb); cB.material.color.setHex(same ? POS : NEG); cB.material.emissive.setHex(same ? 0x7f1d1d : 0x1e3a8a); cB.position.set(f.d, rb, 0);
        lA.set('A  +' + f.qa); lB.set('B  ' + (same ? '+' : '−') + f.qb); lA.off = [0, ra + 0.5, 0]; lB.off = [0, rb + 0.5, 0];
        const sc = 2.2 / 140, yA = 0.3;
        setArrow(aFB, new V3(f.d, yA, -1.5), new V3(f.d + f.lB * sc * (140 / 140), yA, -1.5)); setArrow(aFA, new V3(0, yA, 1.5), new V3(f.lA * sc, yA, 1.5));
        lFB.obj = [f.d + f.lB * sc / 2, yA, -1.5]; lFA.obj = [f.lA * sc / 2, yA, 1.5]; lFB.off = [0, 0.4, 0]; lFA.off = [0, 0.4, 0];
        ruler.scale.x = f.d; ruler.position.set(f.d / 2, 0.03, 2.9); ticks.forEach((t, i) => { t.visible = i <= f.d + 0.001; t.position.set(i, 0.05, 2.9); });
        lD.obj = [f.d / 2, 0.05, 2.9]; lD.off = [0, 0.1, 0.55]; lD.set('거리 ' + f.d.toFixed(1) + '칸');
        guideA.visible = false;
        info('<b>⚡ 두 전하 사이에 작용하는 전기력</b><br>힘의 세기 ' + pct + ' % (가장 센 배치 = 100 %)<br>A가 받는 힘 ' + pct + ' % · B가 받는 힘 ' + pct + ' % → 크기는 같고 방향은 반대예요 (작용·반작용)<br>두 전하는 서로 ' + (same ? '<b>밀어내요</b> (같은 부호)' : '<b>끌어당겨요</b> (다른 부호)') + ' · 거리 ' + f.d.toFixed(1) + '칸 · A ' + f.qa + ' · B ' + f.qb + '<br><span style="opacity:.8">전하량·부호·거리는 옆 조작판에서 바꿔요.</span>');
      }
      /* ================= 🧭 전기장 지도 (위에서 본 모습, 1칸 = 52px) ================= */
      const gridPlane = new THREE.Mesh(new THREE.BoxGeometry(1, 0.06, 1), M(0x1b2540, { roughness: 1 })); gM.add(gridPlane);
      const cellA = []; for (let i = 0; i < 80; i++) { const a = mkArrow(0xdbe7ff, 0.04); a.visible = false; gM.add(a); cellA.push(a); }
      const chM = [mkCharge(), mkCharge()]; chM.forEach((c) => gM.add(c));
      const flowPts = (() => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(90 * 3), 3)); const p = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffd34d, size: 0.1 })); p.frustumCulled = false; gM.add(p); return p; })();
      const tokM = new THREE.Mesh(new THREE.SphereGeometry(0.2, 20, 16), M(0xff5a5f, { emissive: 0x7f1d1d, roughness: 0.3 })); gM.add(tokM); const lTok = label('(+) 시험 전하', tokM, { color: '#e2464b', size: 12 });
      const trail = tube([new V3(0, 0.15, 0), new V3(0.1, 0.15, 0)], 0.04, 0xffd34d, { emissive: 0x6b5200 }); gM.add(trail); trail.visible = false;
      const lCh = [label('', chM[0], { color: '#c0392b', size: 13 }), label('', chM[1], { color: '#c0392b', size: 13 })];
      const demoM = { p: 0, on: false }; let path = [], pathKey = '';
      let G = 52, cxm = 400, cym = 190;
      const toU = (x, y) => [(x - cxm) / G, (y - cym) / G];
      function mkPath(S, A) {
        const fl = S.fl, ch = fl.ch, key = fl.preset + '|' + A.VW; if (key === pathKey) return; pathKey = key;
        const sx = { p1: [0.9, -0.6], n1: [-2.4, 0.9], pn: [-1.0, -1.1], pp: [-0.3, -1.3] }[fl.preset] || [0.9, -0.6];
        let x = cxm + sx[0] * G, y = cym + sx[1] * G; const pts = [[x, y]];
        for (let i = 0; i < 4000; i++) {
          const f = A.fieldAt(x, y); if (f.e < 0.03) break;
          const sp = clamp(20 + 60 * Math.sqrt(f.e), 30, 190), h = 0.02; x += f.ux * sp * h; y += f.uy * sp * h;
          if (i % 3 === 0) pts.push([x, y]);
          if (ch.some((c) => c.s < 0 && Math.hypot(x - c.x, y - c.y) < 24)) break;
          if (x < A.MX0 || x > A.MX1 || y < A.MY0 || y > A.MY1) break;
        }
        path = pts;
      }
      const strengthTxt = (e) => (e >= 1.5 ? '강함' : e >= 0.4 ? '보통' : '약함');
      const dirTxt = (f) => { if (f.e < 0.03) return '없음 (힘이 0)'; const a = Math.atan2(f.uy, f.ux), n = ['→ 오른쪽', '↘ 오른쪽 아래', '↓ 아래', '↙ 왼쪽 아래', '← 왼쪽', '↖ 왼쪽 위', '↑ 위', '↗ 오른쪽 위']; return n[((Math.round(a / (Math.PI / 4)) % 8) + 8) % 8]; };
      const PRESET = { p1: '(+) 전하 한 개', n1: '(−) 전하 한 개', pn: '(+)와 (−) 한 쌍', pp: '(+)와 (+) 한 쌍' };
      function field(S, A) {
        const fl = S.fl; G = A.VW === 480 ? 48 : 52; cxm = A.VW / 2; cym = (A.MY0 + A.MY1) / 2;
        const W = (A.MX1 - A.MX0) / G, H = (A.MY1 - A.MY0) / G;
        gridPlane.scale.set(W, 1, H); gridPlane.position.set(0, -0.03, 0);
        chM.forEach((c, i) => { const q = fl.ch[i]; c.visible = !!q; lCh[i].show(!!q); if (!q) return; const u = toU(q.x, q.y); c.scale.setScalar(0.38); c.position.set(u[0], 0.4, u[1]); c.material.color.setHex(q.s > 0 ? POS : NEG); c.material.emissive.setHex(q.s > 0 ? 0x7f1d1d : 0x1e3a8a); lCh[i].set(q.s > 0 ? '(+)' : '(−)'); lCh[i].off = [0, 0.6, 0]; });
        cellA.forEach((a, i) => { const c = fl.cells[i]; if (!c) { a.visible = false; return; } const len = Math.hypot(c.vx, c.vy); if (len < 2.5) { a.visible = false; return; } const u = toU(c.x, c.y), L = len / G, dx = c.vx / len, dy = c.vy / len; setArrow(a, new V3(u[0] - dx * L / 2, 0.08, u[1] - dy * L / 2), new V3(u[0] + dx * L / 2, 0.08, u[1] + dy * L / 2)); });
        const pos = flowPts.geometry.attributes.position; for (let i = 0; i < 90; i++) { const p = fl.flow[i]; if (p) { const u = toU(p.x, p.y); pos.array[i * 3] = u[0]; pos.array[i * 3 + 1] = 0.12; pos.array[i * 3 + 2] = u[1]; } else pos.array[i * 3 + 1] = -5; } pos.needsUpdate = true;
        const t = fl.tok; let on = t.st === 'placed' || t.st === 'moving' || t.st === 'held' || t.st === 'absorbed' || t.st === 'returning';
        let tx = t.x, ty = t.y, f = null, trl = t.trail;
        mkPath(S, A);
        if (demoM.on && (t.st === 'tray')) {   // ▶ 재생: 시험 전하를 놓아 주는 모습을 되풀이
          const n = path.length - 1, q = clamp((demoM.p - 0.12) / 0.7, 0, 1), k = q * n, i0 = Math.floor(k), i1 = Math.min(n, i0 + 1);
          tx = path[i0][0] + (path[i1][0] - path[i0][0]) * (k - i0); ty = path[i0][1] + (path[i1][1] - path[i0][1]) * (k - i0); on = demoM.p < 0.95; trl = path.slice(0, i0 + 1).map((p) => ({ x: p[0], y: p[1] })); trl.push({ x: tx, y: ty });
        }
        const upd = (S.fl.tok.st === 'tray' && !demoM.on);
        tokM.visible = on && !upd; lTok.show(tokM.visible);
        if (tokM.visible) { const u = toU(tx, ty); tokM.position.set(u[0], 0.25, u[1]); lTok.off = [0, 0.45, 0]; f = (tx > A.MX0 && tx < A.MX1 && ty > A.MY0 && ty < A.MY1) ? A.fieldAt(tx, ty) : null; }
        if (tokM.visible && trl && trl.length > 2) { const pts = trl.filter((_, i) => i % Math.ceil(trl.length / 60) === 0).map((p) => { const u = toU(p.x, p.y); return new V3(u[0], 0.15, u[1]); }); if (pts.length > 2) { trail.geometry.dispose(); trail.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), Math.max(8, pts.length * 2), 0.04, 6, false); trail.visible = true; } else trail.visible = false; } else trail.visible = false;
        info('<b>🧭 전기장 지도 · ' + PRESET[fl.preset] + '</b><br>화살표는 (+)1 시험 전하가 받는 힘의 방향이에요. (+)에서 나가고 (−)로 들어가요.<br>' + (f ? '시험 전하가 받는 힘의 방향: <b>' + dirTxt(f) + '</b> · 힘의 세기: <b>' + (f.e >= 0.03 ? strengthTxt(f.e) : '—') + '</b>' : '시험 전하를 놓아 보세요 (▶ 아래 재생 또는 옆 조작판의 ▶ 놓아 주기).') + '<br><span style="opacity:.8">전하 배치는 옆 조작판에서 골라요.</span>');
      }
      /* ================= 🔋 평행판 전위차 (1 cm = 1칸) ================= */
      const VMAX = 12, DCM = 6;
      const potCol = (t) => { const c = new THREE.Color(); c.setRGB(0.25 + 0.7 * t, 0.45 - 0.12 * t, 1.0 - 0.75 * t); return c; };
      const plMinus = new THREE.Mesh(new THREE.BoxGeometry(0.2, 3.2, 3.2), M(0x3b63c4, { metalness: 0.3 })), plPlus = new THREE.Mesh(new THREE.BoxGeometry(0.2, 3.2, 3.2), M(0xc0392b, { metalness: 0.3 })); plMinus.position.set(-0.35, 1.6, 0); plPlus.position.set(DCM + 0.35, 1.6, 0); gP.add(plMinus, plPlus);
      const slabs = []; for (let i = 0; i < 12; i++) { const s = new THREE.Mesh(new THREE.BoxGeometry(DCM / 12, 3.2, 3.2), new THREE.MeshBasicMaterial({ color: 0x4488ff, transparent: true, opacity: 0.28, depthWrite: false })); s.position.set((i + 0.5) * DCM / 12, 1.6, 0); gP.add(s); slabs.push(s); }
      const eAr = [0.7, 1.4, 2.1, 2.7].map((y) => { const a = mkArrow(0x1f2a44, 0.05); a.userData.y = y; gP.add(a); return a; });
      const lE = label('전기장 방향 (+1이 받는 힘)', [3, 3.4, 0], { color: '#1f2a44', size: 12 });
      const lMi = label('(−)판 0 V', plMinus, { color: '#3b63c4', size: 13 }), lPl = label('', plPlus, { color: '#c0392b', size: 13 });
      lMi.off = [0, 1.9, 0]; lPl.off = [0, 1.9, 0];
      for (let i = 0; i <= DCM; i++) { const t = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.3), M(0x9fb0d4)); t.position.set(i, 0.02, 1.8); gP.add(t); }
      const floorP = new THREE.Mesh(new THREE.BoxGeometry(9, 0.06, 4.4), M(0x2a3550, { roughness: 1 })); floorP.position.set(3, -0.03, 0); gP.add(floorP);
      const rulerL = [0, 3, 6].map((m) => label(m + (m === 0 || m === 6 ? ' cm' : ''), [m, 0, 1.8], { color: '#475569', size: 11 }));
      const qBall = new THREE.Mesh(new THREE.SphereGeometry(0.28, 24, 16), chargeMat(1)); qBall.position.y = 1.4; qBall.castShadow = true; gP.add(qBall);
      const lQ = label('', qBall, { color: '#26324a', size: 12 });
      const trailE = []; for (let i = 0; i < 14; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), new THREE.MeshBasicMaterial({ color: 0x4c8dff, transparent: true, opacity: 0.4 })); s.visible = false; gP.add(s); trailE.push(s); }
      const demoP = { p: 0, on: false };
      function plates(S, A) {
        const s = S.pl, V = s.V, el = s.kind === 'electron';
        slabs.forEach((sl, i) => { sl.material.color.copy(potCol(V / VMAX * (i + 0.5) / 12)); sl.material.opacity = V > 0 ? 0.3 : 0.1; });
        eAr.forEach((a) => { if (V > 0) { const len = (DCM - 0.6) * V / VMAX; setArrow(a, new V3(DCM / 2 + len / 2, a.userData.y, 0), new V3(DCM / 2 - len / 2, a.userData.y, 0)); } else a.visible = false; });
        lE.show(V > 0); lPl.set('(+)판 ' + V + ' V');
        let x = el ? s.ex : s.x, kind = s.kind, st = el ? s.eSt : s.st, ke = 0;
        const act = demoP.on && (el ? s.eSt === 'rest' : s.st === 'held' && s.x === 0 && s.v === 0);
        let Ud = null, Kd = null;
        if (act && V > 0) {
          const p = demoP.p;
          if (el) { const q = clamp((p - 0.1) / 0.6, 0, 1); x = DCM * q * q; Kd = r1(V * x / DCM); Ud = r1(V - Kd); st = q > 0 ? 'fly' : 'rest'; }
          else if (p < 0.5) { x = DCM * ez(p / 0.5); Ud = s.q * r1(V * x / DCM); Kd = 0; }
          else if (p < 0.6) { x = DCM; Ud = s.q * r1(V); Kd = 0; }
          else { const q = (p - 0.6) / 0.4; x = DCM * (1 - q * q); Ud = s.q * r1(V * x / DCM); Kd = r1(s.q * V - Ud); }
        }
        qBall.material.color.setHex(el ? NEG : POS); qBall.material.emissive.setHex(el ? 0x1e3a8a : 0x7f1d1d);
        qBall.visible = !(el && s.eSt === 'hit' && !act); qBall.position.set(x, 1.4, 0);
        if (el) { qBall.scale.setScalar(0.8); lQ.set('전자 e⁻'); } else { qBall.scale.setScalar(1); lQ.set('q = ' + s.q + ' C'); } lQ.off = [0, 0.55, 0];
        // 전자 꼬리
        trailE.forEach((t, i) => { const on = el && (st === 'fly' || (act && x > 0.1)) && V > 0; t.visible = on; if (on) { const xx = Math.max(0, x - (i + 1) * 0.28 * Math.min(1, x)); t.position.set(xx, 1.4, 0); t.material.opacity = 0.4 * (1 - i / 14); } });
        const vv = V * x / DCM, U = Ud != null ? Ud : (el ? r1(V - r1(S.pl.ev * S.pl.ev / (12 * 0.694))) : S.pl.q * r1(vv)), K = Kd != null ? Kd : (el ? r1(S.pl.ev * S.pl.ev / (12 * 0.694)) : r1(0.5 * 0.24 * s.v * s.v));
        let t2;
        if (!el) t2 = '전하 q가 전위차 V를 지나면 <b>에너지 변화 = q × V</b><br>' + s.q + ' C × ' + trim(fmt(vv, 1)) + ' V = <b>' + trim(fmt(s.q * r1(vv), 1)) + ' J</b> (1 V = 1 J/C)<br>전기 위치 에너지 U ' + trim(fmt(U, 1)) + ' J · 운동 에너지 K ' + trim(fmt(K, 1)) + ' J';
        else t2 = '전자가 전위차 V를 지나면 <b>운동 에너지 = V (eV)</b><br>지금 ' + trim(fmt(K, 1)) + ' eV · 전기 위치 에너지 ' + trim(fmt(U, 1)) + ' eV (1 eV = 1.6 × 10⁻¹⁹ J)';
        info('<b>🔋 평행판 사이의 전위차 · 판 사이 전압 ' + V + ' V</b><br>이 위치(' + trim(fmt(x, 1)) + ' cm)의 전위 ' + trim(fmt(vv, 1)) + ' V ((−)판이 0 V)<br>' + t2 + '<br><span style="opacity:.8">전압·전하 종류는 옆 조작판에서 바꿔요.</span>');
      }
      function ez(x) { return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; }
      /* ▶ 재생 줄: 장면마다 하나씩 */
      let plM = null, plC = null, plE = null;
      plM = controls.player({ duration: 7, loop: true, autoplay: false, label: '시험 전하 놓기', phases: [[0, '정지'], [0.12, '전기장 방향으로 움직여요']], onFrame(p) { demoM.p = p; demoM.on = p > 0 || !!(plM && plM.playing); } });
      plC = controls.player({ duration: 9, loop: true, autoplay: false, label: '옮기고 놓기', phases: [[0, '(+)판까지 옮기기 · U = qV 쌓임'], [0.5, '(+)판'], [0.6, '놓기 · U → K']], onFrame(p) { demoP.p = p; demoP.on = p > 0 || !!(plC && plC.playing) || !!(plE && plE.playing) ; } });
      plE = controls.player({ duration: 6, loop: true, autoplay: false, label: '전자 놓기', phases: [[0, '(−)판'], [0.1, '가속 · 운동 에너지 = V (eV)'], [0.7, '(+)판 도착']], onFrame(p) { demoP.p = p; demoP.on = p > 0 || !!(plE && plE.playing) || !!(plC && plC.playing); } });
      const allRows = [...ctx.renderer.domElement.parentNode.parentNode.querySelectorAll('.v3-player')]; [plM, plC, plE].forEach((p, i) => (p.row = allRows[i]));
      let cur = '';
      function setMode(mode, kind) {
        const key = mode + (mode === 'plates' ? kind : ''); if (key === cur) return; cur = key;
        gF.visible = mode === 'force'; gM.visible = mode === 'field'; gP.visible = mode === 'plates';
        [lA, lB, lFA, lFB, lD].forEach((l) => l.show(mode === 'force')); lTok.show(false); lCh.forEach((l) => l.show(false));
        [lE, lMi, lPl, lQ].concat(rulerL).forEach((l) => l.show(mode === 'plates'));
        plM.row.style.display = mode === 'field' ? '' : 'none'; plC.row.style.display = mode === 'plates' && kind !== 'electron' ? '' : 'none'; plE.row.style.display = mode === 'plates' && kind === 'electron' ? '' : 'none';
        if (mode !== 'field') { plM.pause(); plM.set(0); } if (!(mode === 'plates' && kind !== 'electron')) { plC.pause(); plC.set(0); } if (!(mode === 'plates' && kind === 'electron')) { plE.pause(); plE.set(0); }
        if (mode === 'force') Object.assign(orbit, { tx: 1.5, ty: 0, tz: 0, phi: 0.85, theta: 0.1, dist: 10 * KD });
        else if (mode === 'field') Object.assign(orbit, { tx: 0, ty: 0, tz: 0, phi: 0.7, theta: 0.0, dist: 14.5 * KD });
        else if (mode === 'plates') Object.assign(orbit, { tx: 3, ty: 1.2, tz: 0, phi: 1.2, theta: 0.15, dist: 10 * KD });
      }
      const NOTE = '🏠 적용 장면(회로의 전위 · 전기 집진기 · 번개와 피뢰침)은 2D 화면에서 해요. 위의 [▦ 2D]를 눌러 보세요.';
      return {
        update(dt) {
          const A = sim(); if (!A || !A.S) return; const S = A.S;
          setMode(S.mode, S.pl && S.pl.kind);
          if (S.mode === 'field') { if (S.fl.tok.st !== 'tray' && plM.playing) plM.pause(); }
          if (S.mode === 'plates') { const el = S.pl.kind === 'electron'; if ((el ? S.pl.eSt !== 'rest' : S.pl.st !== 'held') && (plC.playing || plE.playing)) { plC.pause(); plE.pause(); } }
          if (S.mode === 'force') force(S); else if (S.mode === 'field') field(S, A); else if (S.mode === 'plates') plates(S, A); else info(NOTE);
        },
        sync() {},
      };
    },
  });
})();
