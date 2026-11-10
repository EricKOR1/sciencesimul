/* hp-field-potential · 3D 전기장과 전위차
   2D 실험(window.__sim)의 장면을 그대로 입체로 보여 줘요: ⚡ 전기력(두 점전하) · 🧭 전기장 지도(화살표 · 시험 전하) · 🔋 평행판 전위차(전하·전자).
   전하량·거리·전압 같은 값은 옆 조작판이 정하고 3D는 따라가요. 🏠 적용(회로의 전위 · 전기 집진기 · 번개와 피뢰침)도 입체로 봐요. */
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
    levels: [0, 2],   // 2단계는 시험 전하를 캔버스에서 끌어 놓아야 하고, 4단계는 캔버스의 전위 그래프를 읽어야 해서 2D
    build(ctx) {
      const { THREE, root, label, info, controls, orbit } = ctx;
      const { V3, M, mkArrow, setArrow, tube } = tools(THREE);
      const sim = () => ctx.lesson();
      const chargeMat = (s) => M(s > 0 ? POS : NEG, { roughness: 0.3, emissive: s > 0 ? 0x7f1d1d : 0x1e3a8a });
      const mkCharge = (txt) => { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 28), chargeMat(1)); m.castShadow = true; root.add(m); decoList.push(chargeDeco(m)); return m; };
      /* ----- 재질 · 장식 도우미 ----- */
      const ctex = (w, h, draw, rx, ry) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; if (rx) t.repeat.set(rx, ry || rx); if ('encoding' in t) t.encoding = THREE.sRGBEncoding; t.anisotropy = 4; return t; };
      const rnd0 = (() => { let q = 3; return () => ((q = (q * 16807) % 2147483647) / 2147483647); })();
      const woodTex = (rx, ry) => ctex(256, 128, (g, w, h) => { g.fillStyle = '#8f6236'; g.fillRect(0, 0, w, h); for (let i = 0; i < 70; i++) { g.strokeStyle = 'rgba(55,28,10,' + (0.2 + rnd0() * 0.35) + ')'; g.lineWidth = 1 + rnd0() * 2; g.beginPath(); const y = rnd0() * h; g.moveTo(0, y); g.bezierCurveTo(w * 0.3, y + (rnd0() - 0.5) * 8, w * 0.6, y + (rnd0() - 0.5) * 8, w, y + (rnd0() - 0.5) * 6); g.stroke(); } }, rx, ry);
      const woodM = (rx, ry) => M(0xffffff, { map: woodTex(rx, ry), roughness: 0.6, metalness: 0 });
      const haloTex = ctex(128, 128, (g, w, h) => { const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); gr.addColorStop(0, 'rgba(255,255,255,.95)'); gr.addColorStop(0.35, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
      const signTex = (pl) => ctex(64, 64, (g, w, h) => { g.strokeStyle = '#fff'; g.lineWidth = 9; g.lineCap = 'round'; g.shadowColor = 'rgba(0,0,0,.5)'; g.shadowBlur = 4; g.beginPath(); g.moveTo(16, 32); g.lineTo(48, 32); if (pl) { g.moveTo(32, 16); g.lineTo(32, 48); } g.stroke(); }, 1, 1);
      const sgP = signTex(true), sgN = signTex(false);
      const chargeDeco = (m) => { const h = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.8 })); h.scale.setScalar(3.3); const sg = new THREE.Sprite(new THREE.SpriteMaterial({ map: sgP, transparent: true, depthTest: false })); sg.scale.setScalar(1.0); sg.renderOrder = 5; sg.position.z = 0; m.add(h, sg); m.userData.h = h; m.userData.sg = sg; m.userData.pos = null; return m; };
      const decoList = [];
      const paintDeco = () => { decoList.forEach((m) => { const pos = m.material.color.getHex() === POS; if (m.userData.pos === pos) return; m.userData.pos = pos; m.userData.h.material.color.setHex(pos ? 0xff6a5a : 0x5a8cff); m.userData.sg.material.map = pos ? sgP : sgN; m.userData.sg.material.needsUpdate = true; }); };
      const gF = new THREE.Group(), gM = new THREE.Group(), gP = new THREE.Group(); root.add(gF, gM, gP);
      /* ================= ⚡ 전기력 ================= */
      const floorF = new THREE.Mesh(new THREE.BoxGeometry(10.6, 0.4, 6.6), woodM(3, 1)); floorF.position.set(2.5, -0.2, 0); floorF.receiveShadow = true; gF.add(floorF); { const e = new THREE.Mesh(new THREE.BoxGeometry(10.7, 0.06, 6.7), M(0x4a2f15, { roughness: 0.7 })); e.position.set(2.5, -0.02, 0); gF.add(e); const mat = new THREE.Mesh(new THREE.BoxGeometry(9.6, 0.02, 5.6), M(0x2c3b5e, { roughness: 0.9 })); mat.position.set(2.5, 0.005, 0); mat.receiveShadow = true; gF.add(mat); [floorF, e, mat].forEach((o) => { o.userData.v3bg = true; }); }   // 탁자는 배경: 자동 맞춤은 두 전하 · 힘 화살표 · 자에 맞춰요
      const cA = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 24), chargeMat(1)), cB = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 24), chargeMat(1)); cA.castShadow = cB.castShadow = true; gF.add(cA, cB); decoList.push(chargeDeco(cA), chargeDeco(cB));
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
      const gridTex = ctex(64, 64, (g, w, h) => { g.fillStyle = '#243459'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(160,190,240,.45)'; g.lineWidth = 2; g.strokeRect(0, 0, w, h); }, 1, 1);
      const gridPlane = new THREE.Mesh(new THREE.BoxGeometry(1, 0.06, 1), M(0xffffff, { map: gridTex, roughness: 0.8 })); gridPlane.receiveShadow = true; gM.add(gridPlane); { const fr = new THREE.Mesh(new THREE.BoxGeometry(1, 0.1, 1), M(0x64748b, { metalness: 0.7, roughness: 0.35 })); fr.position.y = -0.1; gM.add(fr); gridPlane.userData.fr = fr; }
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
        gridPlane.scale.set(W, 1, H); gridPlane.position.set(0, -0.03, 0); gridTex.repeat.set(W, H); gridPlane.userData.fr.scale.set(W + 0.3, 1, H + 0.3);
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
      const plMinus = new THREE.Mesh(new THREE.BoxGeometry(0.2, 3.2, 3.2), M(0x6f8fdc, { metalness: 0.75, roughness: 0.28 })), plPlus = new THREE.Mesh(new THREE.BoxGeometry(0.2, 3.2, 3.2), M(0xe0665c, { metalness: 0.75, roughness: 0.28 })); plMinus.castShadow = plPlus.castShadow = true; plMinus.position.set(-0.35, 1.6, 0); plPlus.position.set(DCM + 0.35, 1.6, 0); gP.add(plMinus, plPlus);
      const slabs = []; for (let i = 0; i < 12; i++) { const s = new THREE.Mesh(new THREE.BoxGeometry(DCM / 12, 3.2, 3.2), new THREE.MeshBasicMaterial({ color: 0x4488ff, transparent: true, opacity: 0.28, depthWrite: false })); s.position.set((i + 0.5) * DCM / 12, 1.6, 0); gP.add(s); slabs.push(s); }
      const eAr = [0.7, 1.4, 2.1, 2.7].map((y) => { const a = mkArrow(0x1f2a44, 0.05); a.userData.y = y; gP.add(a); return a; });
      const lE = label('전기장 방향 (+1이 받는 힘)', [3, 3.4, 0], { color: '#1f2a44', size: 12 });
      const lMi = label('(−)판 0 V', plMinus, { color: '#3b63c4', size: 13 }), lPl = label('', plPlus, { color: '#c0392b', size: 13 });
      lMi.off = [0, 1.9, 0]; lPl.off = [0, 1.9, 0];
      for (let i = 0; i <= DCM; i++) { const t = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.3), M(0x9fb0d4)); t.position.set(i, 0.02, 1.8); gP.add(t); }
      const floorP = new THREE.Mesh(new THREE.BoxGeometry(10.4, 0.4, 6.6), woodM(3, 1)); floorP.position.set(3, -0.2, -0.3); floorP.receiveShadow = true; gP.add(floorP);
      { const e = new THREE.Mesh(new THREE.BoxGeometry(10.5, 0.06, 6.7), M(0x4a2f15, { roughness: 0.7 })); e.position.set(3, -0.02, -0.3); gP.add(e);
        const bm = M(0x1f2937, { roughness: 0.5, metalness: 0.3 }); [-0.35, DCM + 0.35].forEach((x) => { const b = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.14, 3.6), bm); b.position.set(x, 0.07, 0); b.castShadow = true; gP.add(b); });
        const bat = new THREE.Group(); const bb = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.9, 1.0), M(0x2b3447, { roughness: 0.45, metalness: 0.4 })); bb.position.y = 0.45; bb.castShadow = true; bat.add(bb); const st = new THREE.Mesh(new THREE.BoxGeometry(2.42, 0.18, 1.02), M(0xfacc15, { roughness: 0.5 })); st.position.y = 0.5; bat.add(st);
        const tpM = M(0xe0665c, { metalness: 0.8, roughness: 0.3 }), tnM = M(0x6f8fdc, { metalness: 0.8, roughness: 0.3 }); const tp = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.2, 16), tpM), tn = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.2, 16), tnM); tp.position.set(0.8, 1.0, 0); tn.position.set(-0.8, 1.0, 0); bat.add(tp, tn);
        bat.position.set(DCM / 2, 0, -2.5); gP.add(bat);
        const wire = (pts, c) => { const w = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((q) => new V3(q[0], q[1], q[2]))), 40, 0.045, 8, false), M(c, { roughness: 0.4 })); w.castShadow = true; gP.add(w); };
        wire([[DCM / 2 + 0.8, 1.05, -2.5], [DCM / 2 + 1.0, 1.6, -2.5], [DCM + 0.35, 1.9, -2.3], [DCM + 0.35, 2.6, -1.6]], 0xd9453a);
        wire([[DCM / 2 - 0.8, 1.05, -2.5], [DCM / 2 - 1.0, 1.6, -2.5], [-0.35, 1.9, -2.3], [-0.35, 2.6, -1.6]], 0x3a62c9); }
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
        /* 2D 캔버스의 기록 칸(옮긴 전하의 에너지 · 도착한 전자의 속력)을 3D에도 보여 줘요 */
        { const P = S.pl; if (!el) { const rs = (P.recs || []).slice(-4); t2 += '<br>📋 기록 (끝까지 옮겼을 때): ' + (rs.length ? rs.map((r) => r.q + ' C · ' + r.V + ' V → <b>' + r.E + ' J</b>').join(' / ') : '— (+)판까지 옮겨 보세요'); }
          else { const ks = Object.keys(P.erecs || {}).map(Number).sort((a, b) => a - b).slice(-4); t2 += '<br>📋 기록 (도착했을 때): ' + (ks.length ? ks.map((k) => k + ' V → ' + k + ' eV · <b>' + P.erecs[k].v.toFixed(2) + ' × 10⁶ m/s</b>').join(' / ') : '— 전자를 놓아 보세요'); } }
        info('<b>🔋 평행판 사이의 전위차 · 판 사이 전압 ' + V + ' V</b><br>이 위치(' + trim(fmt(x, 1)) + ' cm)의 전위 ' + trim(fmt(vv, 1)) + ' V ((−)판이 0 V)<br>' + t2 + '<br><span style="opacity:.8">전압·전하 종류는 옆 조작판에서 바꿔요.</span>');
      }
      function ez(x) { return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; }

      /* ================= 🏠 적용: 🔌 회로의 전위 · 🌫️ 전기 집진기 · ⛈️ 번개와 피뢰침 ================= */
      const gAc = new THREE.Group(), gAd = new THREE.Group(), gAl = new THREE.Group(); root.add(gAc, gAd, gAl); gAc.visible = gAd.visible = gAl.visible = false;
      const cm = (a, b, f) => new THREE.Color(a).lerp(new THREE.Color(b), f);
      const potC = (f) => { f = clamp(f, 0, 1); return f < 0.5 ? cm('#4a7be0', '#f6f2ea', f * 2) : cm('#f6f2ea', '#e2574c', (f - 0.5) * 2); };
      const labAc = [], labAd = [], labAl = [];
      /* --- 🔌 회로: 전위 = 전기적 높이 (도선이 전위만큼 올라가요) --- */
      let cirBuilt = '', cirData = null, cirScale = 0.02;
      const cirWire = new THREE.Group(); gAc.add(cirWire);
      const pcbTex = ctex(64, 64, (g, w, h) => { g.fillStyle = '#1e5a46'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(214,186,110,.75)'; for (let x = 8; x < w; x += 16) for (let y = 8; y < h; y += 16) { g.beginPath(); g.arc(x, y, 2.2, 0, 6.3); g.fill(); } g.strokeStyle = 'rgba(0,0,0,.25)'; g.strokeRect(0, 0, w, h); }, 1, 1);
      const cirGround = new THREE.Mesh(new THREE.BoxGeometry(1, 0.06, 1), M(0xffffff, { map: pcbTex, roughness: 0.6, metalness: 0.1 })); cirGround.receiveShadow = true; gAc.add(cirGround);
      const bulbM = [0, 1].map(() => { const b = new THREE.Mesh(new THREE.SphereGeometry(0.32, 24, 18), M(0xe8e2c8, { emissive: 0x000000, roughness: 0.3 })); gAc.add(b); return b; });
      const batM = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 1, 20), M(0x394258, { metalness: 0.4, roughness: 0.4 })); gAc.add(batM);
      const qDots = []; for (let i = 0; i < 9; i++) { const d = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10), M(0xffffff, { roughness: 0.4 })); gAc.add(d); qDots.push(d); }
      const qBig = new THREE.Mesh(new THREE.SphereGeometry(0.2, 20, 16), M(0xffffff, { roughness: 0.3 })); gAc.add(qBig);
      const lQc = label('', qBig, { color: '#26324a', size: 12 }), lBat = label('', batM, { color: '#394258', size: 13 }), lBu = [label('전구 1', bulbM[0], { color: '#7a6a2a', size: 12 }), label('전구 2', bulbM[1], { color: '#7a6a2a', size: 12 })];
      const lABC = ['A', 'B', 'C'].map((t) => label(t, [0, 0, 0], { color: '#5a4fcf', size: 13 }));
      const lGnd = label('전위 0 V (땅 높이)', [0, 0, 0], { color: '#475569', size: 11 });
      labAc.push(lQc, lBat, lGnd, ...lBu, ...lABC);
      function buildCircuit(A) {
        const C = A.CIR, key = C.L + '|' + C.R + '|' + C.BOT; if (key === cirBuilt) return; cirBuilt = key;
        while (cirWire.children.length) { const c = cirWire.children[0]; cirWire.remove(c); if (c.geometry) c.geometry.dispose(); }
        const s = 7 / (C.R - C.L); cirScale = s; const HV = 0.9, cx = (C.L + C.R) / 2, cz = (C.TOP + C.BOT) / 2;
        const P = (px, py, pot) => new V3((px - cx) * s, 0.12 + pot * HV, (py - cz) * s);
        cirData = { P, s, cx, cz, HV };
        const N = 260, pts = [], cols = [], top = [], bot = [];
        const at = (sv) => { sv = ((sv % C.tot) + C.tot) % C.tot; let i = 0; while (i < C.verts.length - 1 && C.cum[i + 1] <= sv) i++; const a = C.verts[i], b = C.verts[(i + 1) % C.verts.length], f = (sv - C.cum[i]) / Math.max(1e-6, C.cum[i + 1] - C.cum[i]); return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f]; };
        const pos = [], col = [], idx = [];
        for (let i = 0; i <= N; i++) { const q = at(Math.min(i / N * C.tot, C.tot - 0.001)), w = P(q[0], q[1], q[2]); pts.push(w); const c = potC(q[2] / A.BAT); pos.push(w.x, w.y, w.z, w.x, 0.03, w.z); col.push(c.r, c.g, c.b, c.r, c.g, c.b); if (i < N) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); } }
        const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); rg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); rg.setIndex(idx);
        cirWire.add(new THREE.Mesh(rg, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.32, side: THREE.DoubleSide, depthWrite: false })));
        pts.pop(); pts.push(pts[0].clone());
        cirWire.add(tube(pts, 0.07, 0x9aa6bb, { metalness: 0.5, roughness: 0.35 }, false));
        const w = (C.R - C.L) * s, d = (C.BOT - C.TOP) * s + 1.2; cirGround.scale.set(w + 1.6, 1, d + 0.4); pcbTex.repeat.set((w + 1.6) * 1.2, (d + 0.4) * 1.2); cirGround.position.set(0, 0, 0);
        // 전지 (비탈을 따라 놓인 원통), 전구 (낮아지는 구간 한가운데)
        const b0 = P(C.verts[0][0], C.verts[0][1], 0), b1 = P(C.verts[1][0], C.verts[1][1], A.BAT), mid = b0.clone().add(b1).multiplyScalar(0.5), dir = b1.clone().sub(b0);
        batM.position.copy(mid); batM.scale.set(1, dir.length(), 1); batM.quaternion.setFromUnitVectors(new V3(0, 1, 0), dir.clone().normalize());
        const m1 = P(C.b1x, C.TOP, A.BAT - A.U1 / 2), m2 = P(C.R, C.by, (A.BAT - A.U1) / 2); bulbM[0].position.copy(m1); bulbM[1].position.copy(m2);
        lBat.obj = [mid.x - 0.7, mid.y, mid.z]; lBat.set('전지 ' + A.BAT + ' V<br>0 → ' + A.BAT + ' V');
        [[2, 0], [5, 1], [8, 2]].forEach(([ci, k]) => { const v = C.verts[ci]; const q = P(v[0], v[1], v[2]); lABC[k].obj = [q.x, q.y + 0.35, q.z]; });
        lGnd.obj = [-(w / 2) - 0.2, 0.05, (C.BOT - C.TOP) * s / 2 + 0.3];
        void dir;
      }
      function circuit(A) {
        const S = A.S, a = S.ap, C = A.CIR; buildCircuit(A); const D = cirData;
        const at = (sv) => { sv = ((sv % C.tot) + C.tot) % C.tot; let i = 0; while (i < C.verts.length - 1 && C.cum[i + 1] <= sv) i++; const p = C.verts[i], q = C.verts[(i + 1) % C.verts.length], f = (sv - C.cum[i]) / Math.max(1e-6, C.cum[i + 1] - C.cum[i]); return [p[0] + (q[0] - p[0]) * f, p[1] + (q[1] - p[1]) * f, p[2] + (q[2] - p[2]) * f]; };
        const N = 10;
        qDots.forEach((d, i) => { const q = at(((a.ph % 1) + (i + 1) / N) * C.tot), w = D.P(q[0], q[1], q[2]); d.position.copy(w); d.material.color.copy(potC(q[2] / A.BAT)); });
        const tk = at((a.ph % 1) * C.tot), tw = D.P(tk[0], tk[1], tk[2]); qBig.position.copy(tw); qBig.material.color.copy(potC(tk[2] / A.BAT)); qBig.material.emissive.copy(potC(tk[2] / A.BAT)).multiplyScalar(0.25);
        lQc.obj = [tw.x, tw.y + 0.45, tw.z]; lQc.set('1 C · 전위 ' + fmt(tk[2], 1) + ' V');
        bulbM[0].material.emissive.setHex(0xffd447).multiplyScalar(0.2 + 0.8 * clamp(A.U1 / A.BAT, 0, 1)); bulbM[1].material.emissive.setHex(0xffd447).multiplyScalar(0.2 + 0.8 * clamp(A.U2 / A.BAT, 0, 1));
        bulbM[0].material.color.setHex(0xffe58a); bulbM[1].material.color.setHex(0xffe58a);
        lBu[0].obj = [bulbM[0].position.x, bulbM[0].position.y + 0.5, bulbM[0].position.z]; lBu[1].obj = [bulbM[1].position.x + 0.7, bulbM[1].position.y, bulbM[1].position.z];
        lBu[0].set('전구 1 · ' + A.R1 + ' Ω<br>' + trim(fmt(A.BAT, 1)) + ' → ' + trim(fmt(A.BAT - A.U1, 1)) + ' V'); lBu[1].set('전구 2 · ' + A.R2 + ' Ω<br>' + trim(fmt(A.BAT - A.U1, 1)) + ' → 0 V');
        const s1 = (a.ph % 1) * C.tot, seg = (i, from, to) => clamp((s1 - C.cum[i]) / (C.cum[i + 1] - C.cum[i]), 0, 1) * Math.abs(to - from);
        const g = seg(0, 0, A.BAT), l1 = seg(3, A.BAT, A.BAT - A.U1), l2 = seg(6, A.BAT - A.U1, 0);
        info('<b>🔌 회로에서 전하의 전위 변화</b> · 도선의 높이가 전위예요<br>지금 1 C 전하의 전위 <b>' + fmt(tk[2], 1) + ' V</b> · 전류 ' + fmt(A.I_C, 2) + ' A (어디서나 같아요)<br>이번 바퀴: 전지 <b>+' + fmt(g, 1) + ' J</b> · 전구 1 <b>−' + fmt(l1, 1) + ' J</b> · 전구 2 <b>−' + fmt(l2, 1) + ' J</b><br><span style="opacity:.8">한 바퀴를 돌면 전위는 처음 값으로 돌아와요.</span>');
      }
      /* --- 🌫️ 전기 집진기 --- */
      let dKey = '', dS = 44;
      { const steel = ctex(128, 128, (g, w, h) => { g.fillStyle = '#7b8697'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(30,40,60,.4)'; g.lineWidth = 2; for (let i = 0; i <= w; i += 16) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, h); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(w, i); g.stroke(); } }, 8, 4);
        const fl = new THREE.Mesh(new THREE.BoxGeometry(14, 0.3, 7), M(0xffffff, { map: steel, metalness: 0.5, roughness: 0.5 })); fl.position.set(0, -0.2, 0); fl.receiveShadow = true; gAd.add(fl);
        const bw = new THREE.Mesh(new THREE.BoxGeometry(14, 9, 0.2), M(0x2a3550, { roughness: 0.8, metalness: 0.2 })); bw.position.set(0, 4.3, -2.2); gAd.add(bw);
        for (let i = -3; i <= 3; i++) { const rb = new THREE.Mesh(new THREE.BoxGeometry(0.12, 9, 0.12), M(0x64748b, { metalness: 0.7, roughness: 0.4 })); rb.position.set(i * 2, 4.3, -2.05); gAd.add(rb); }
        const ch = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, 7, 20), M(0xb8bfcc, { roughness: 0.7, metalness: 0.2 })); ch.position.set(6.6, 3.5, -1.9); ch.castShadow = true; gAd.add(ch);
        [5.2, 6.2].forEach((y) => { const st = new THREE.Mesh(new THREE.CylinderGeometry(0.4 - (y - 5.2) * 0.04, 0.42 - (y - 5.2) * 0.04, 0.45, 20), M(0xc03a30, { roughness: 0.6 })); st.position.set(6.6, y, -1.9); gAd.add(st); });
        const sm = M(0x9aa3b2, { roughness: 1 }); sm.transparent = true; sm.opacity = 0.55; [[6.6, 7.6, -1.9, 0.5], [6.9, 8.3, -1.9, 0.65], [7.4, 9.1, -1.9, 0.8]].forEach((q) => { const c = new THREE.Mesh(new THREE.SphereGeometry(q[3], 14, 10), sm); c.position.set(q[0], q[1], q[2]); gAd.add(c); }); }
            const gPlate = [0, 1].map((i) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.22, 6, 3.2), M(0x9aa6bb, { metalness: 0.5, roughness: 0.35 })); gAd.add(m); return m; });
      const bandM = new THREE.Mesh(new THREE.BoxGeometry(5, 0.05, 3.2), new THREE.MeshBasicMaterial({ color: 0xf26b3a, transparent: true, opacity: 0.28, depthWrite: false })); gAd.add(bandM);
      const chanM = new THREE.Mesh(new THREE.BoxGeometry(5, 6, 3.2), new THREE.MeshBasicMaterial({ color: 0x7c5cff, transparent: true, opacity: 0.0, depthWrite: false })); gAd.add(chanM);
      const dustI = new THREE.InstancedMesh(new THREE.SphereGeometry(0.075, 8, 6), new THREE.MeshStandardMaterial({ roughness: 0.6 }), 110), stuckI = new THREE.InstancedMesh(new THREE.SphereGeometry(0.075, 8, 6), M(0x6b5d4f, { roughness: 0.9 }), 300);
      dustI.frustumCulled = stuckI.frustumCulled = false; gAd.add(dustI, stuckI);
      const eArr = [0, 1, 2].map(() => { const a = mkArrow(0x7c5cff, 0.045); gAd.add(a); return a; });
      const lPp = label('(+)판 · 집진판', [0, 0, 0], { color: '#e2574c', size: 12 }), lPm = label('(−)판', [0, 0, 0], { color: '#4a7be0', size: 12 }), lBd = label('대전 구역', [0, 0, 0], { color: '#9a3412', size: 12 }), lDirty = label('↑ 더러운 공기', [0, 0, 0], { color: '#5a6679', size: 12 }), lClean = label('깨끗한 공기 ↑', [0, 0, 0], { color: '#14803f', size: 12 });
      labAd.push(lPp, lPm, lBd, lDirty, lClean);
      const zOf = new WeakMap(); const zFor = (o) => { let z = zOf.get(o); if (z == null) { z = (Math.random() - 0.5) * 2.8; zOf.set(o, z); } return z; };
      const dm = new THREE.Object3D(), cDust = new THREE.Color(0x8a7a6a), cChg = new THREE.Color(0x4a6fd0);
      function precip(A) {
        const S = A.S, a = S.ap, p = A.PC, s = p.w / 5, H = (p.bot - p.top) / s; dS = s;
        const key = p.w + '|' + H.toFixed(2); if (key !== dKey) { dKey = key; gPlate.forEach((m, i) => { m.geometry.dispose(); m.geometry = new THREE.BoxGeometry(0.22, H + 0.3, 3.2); m.position.set(i ? 2.6 : -2.6, H / 2, 0); }); chanM.geometry.dispose(); chanM.geometry = new THREE.BoxGeometry(5, H, 3.2); chanM.position.set(0, H / 2, 0); }
        gPlate[0].material.color.setHex(a.lv ? 0xe2877f : 0x9aa6bb); gPlate[1].material.color.setHex(a.lv ? 0x7f9be0 : 0x9aa6bb);
        chanM.material.opacity = a.lv ? 0.07 : 0; bandM.position.set(0, (p.bot - p.band) / s, 0);
        const X = (px) => (px - (p.x0 + p.w / 2)) / s, Y = (py) => (p.bot - py) / s;
        let n = 0; a.dust.forEach((d) => { if (n >= 110) return; dm.position.set(X(d.x), Y(d.y), zFor(d)); dm.scale.setScalar(d.r / 2.8); dm.updateMatrix(); dustI.setMatrixAt(n, dm.matrix); dustI.setColorAt(n, d.ch ? cChg : cDust); n++; });
        dustI.count = n; dustI.instanceMatrix.needsUpdate = true; if (dustI.instanceColor) dustI.instanceColor.needsUpdate = true;
        let m = 0; a.stuck.forEach((q) => { if (m >= 300) return; dm.position.set(-2.5 + (q.r + q.o * 0.35) / s, Y(q.y), zFor(q)); dm.scale.setScalar(q.r / 2.8); dm.updateMatrix(); stuckI.setMatrixAt(m, dm.matrix); m++; });
        stuckI.count = m; stuckI.instanceMatrix.needsUpdate = true;
        eArr.forEach((ar, i) => { if (!a.lv) { ar.visible = false; return; } const y = H * (0.25 + 0.25 * i + 0.1), len = (5 - 0.6) * a.lv / 2; setArrow(ar, new V3(-2.2, y, 0), new V3(-2.2 + len, y, 0)); });
        lPp.obj = [-2.6, H + 0.4, 0]; lPm.obj = [2.6, H + 0.4, 0]; lBd.obj = [2.9, (p.bot - p.band) / s, 1.6]; lDirty.obj = [0, -0.3, 1.6]; lClean.obj = [0, H + 0.3, 0];
        const tot = a.caught + a.passed, pct = tot ? Math.round(100 * a.caught / tot) : 0;
        info('<b>🌫️ 전기 집진기</b> · 먼지에 전하를 띠게 해서 전기장으로 걸러 내요<br>① 먼지가 대전 구역에서 (−)전하를 띠어요(파란 점).<br>② (+)판과 (−)판 사이에 전기장이 생겨요.<br>③ (−) 먼지는 전기장 반대쪽 힘을 받아 (+)판에 붙어요.<br>전압: <b>' + (a.lv ? (a.lv === 1 ? '약하게' : '강하게') : '끔') + '</b> · 붙은 먼지 ' + a.caught + ' / 지나간 먼지 ' + a.passed + ' → 걸러진 비율 <b>' + pct + ' %</b>');
      }
      /* --- ⛈️ 번개와 피뢰침 --- */
      const LS = 60, bolt3 = { key: null, main: null, brs: [] };
      const stormTex = ctex(8, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#0d1424'); gr.addColorStop(0.5, '#2b3550'); gr.addColorStop(0.85, '#55607a'); gr.addColorStop(1, '#6f7a8c'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }, 1, 1); stormTex.wrapS = stormTex.wrapT = THREE.ClampToEdgeWrapping;
      { const dome = new THREE.Mesh(new THREE.SphereGeometry(120, 24, 16), new THREE.MeshBasicMaterial({ map: stormTex, side: THREE.BackSide, depthWrite: false, fog: false })); dome.position.y = 0; dome.renderOrder = -10; gAl.add(dome); }
      const grassTex = ctex(128, 128, (g, w, h) => { g.fillStyle = '#4b6b3a'; g.fillRect(0, 0, w, h); for (let i = 0; i < 900; i++) { g.fillStyle = 'hsla(' + (85 + rnd0() * 35) + ',35%,' + (22 + rnd0() * 20) + '%,.6)'; g.fillRect(rnd0() * w, rnd0() * h, 1.5, 3); } }, 10, 5);
      const sky = new THREE.Mesh(new THREE.BoxGeometry(34, 0.1, 16), M(0xffffff, { map: grassTex, roughness: 1 })); sky.position.set(0, -0.05, 0); sky.receiveShadow = true; gAl.add(sky);
      const cloudG = new THREE.Group(); gAl.add(cloudG);
      [[-0.28, 0.1, 0.9], [0, -0.1, 1.05], [0.28, 0.13, 0.95], [-0.1, 0.25, 0.8], [0.12, 0.25, 0.8]].forEach((c) => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.62 * c[2], 20, 14), M(0x6f7b96, { roughness: 1 })); m.position.set(c[0] * 4.2, c[1], 0); m.scale.set(1.1, 0.8, 1.1); cloudG.add(m); });
      const minusI = new THREE.InstancedMesh(new THREE.SphereGeometry(0.1, 8, 6), new THREE.MeshBasicMaterial({ color: 0xa9c4ff, transparent: true }), 8), plusI = new THREE.InstancedMesh(new THREE.SphereGeometry(0.1, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffb4ae, transparent: true }), 30);
      gAl.add(minusI, plusI);
      const houseG = new THREE.Group(); gAl.add(houseG);
      const hw = 2.0, hh = 1.5;
      { const wall = new THREE.Mesh(new THREE.BoxGeometry(hw, hh, 1.6), M(0xe8d9b8, { roughness: 0.8 })); wall.position.y = hh / 2; wall.castShadow = true; houseG.add(wall);
        const roof = new THREE.Mesh(new THREE.ConeGeometry(1.55, 0.9, 4), M(0xb4573b, { roughness: 0.7 })); roof.rotation.y = Math.PI / 4; roof.position.y = hh + 0.45; roof.scale.z = 0.85; roof.castShadow = true; houseG.add(roof);
        const door = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.7, 0.05), M(0x8a6a44)); door.position.set(0, 0.35, 0.83); houseG.add(door);
        [-0.6, 0.6].forEach((x) => { const w = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.36, 0.05), M(0xcfe6fb, { emissive: 0x405060 })); w.position.set(x, 0.95, 0.83); houseG.add(w); }); }
      const ROOF_TOP = hh + 0.9, ROD_TOP = ROOF_TOP + 0.85;
      const rodG = new THREE.Group(); houseG.add(rodG);
      { const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, ROD_TOP - hh - 0.3, 8), M(0xc9d2e0, { metalness: 0.8, roughness: 0.3 })); rod.position.y = (ROD_TOP + hh + 0.3) / 2; rodG.add(rod);
        const tip = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.25, 10), M(0xe8edf5, { metalness: 0.8, roughness: 0.3 })); tip.position.y = ROD_TOP + 0.1; rodG.add(tip);
        const wire = tube([new V3(0, hh + 0.4, 0), new V3(hw / 2 + 0.05, hh + 0.2, 0.2), new V3(hw / 2 + 0.4, hh * 0.6, 0.2), new V3(hw / 2 + 0.4, -0.2, 0.2)], 0.035, 0x8791a5, { metalness: 0.6 }); rodG.add(wire);
        const gnd = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.04, 0.3), M(0x8791a5, { metalness: 0.5 })); gnd.position.set(hw / 2 + 0.4, -0.02, 0.2); rodG.add(gnd); }
      const fire = [0, 1, 2].map((i) => { const f = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.6, 8), new THREE.MeshBasicMaterial({ color: 0xff7a1a, transparent: true, opacity: 0.85 })); f.position.set(-0.4 + i * 0.4, ROOF_TOP - 0.15, 0); houseG.add(f); return f; });
      const curDots = [0, 1, 2, 3, 4, 5].map(() => { const d = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), new THREE.MeshBasicMaterial({ color: 0xfff1a0 })); houseG.add(d); return d; });
      const flashL = new THREE.PointLight(0xfff6c2, 0, 40); flashL.position.set(0, 5, 3); gAl.add(flashL);
      const lRod = label('피뢰침 · 뾰족한 끝에 전하가 모여요', [0, 0, 0], { color: '#26324a', size: 12 }), lBurn = label('지붕이 불타요!', [0, 0, 0], { color: '#e2464b', size: 14 }), lHouse = label('', [0, 0, 0], { color: '#26324a', size: 12 }), lCloud = label('구름 (−)', [0, 0, 0], { color: '#3a4766', size: 12 }), lGrd = label('땅 (+) 유도 전하', [0, 0, 0], { color: '#7a3a36', size: 12 });
      labAl.push(lRod, lBurn, lHouse, lCloud, lGrd);
      const demoL = { p: 0, on: false };
      const rnd = ((seed) => () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; })(7);
      function mkBoltGeo(pts, r) { const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.1), pts.length * 4, r, 5, false); return g; }
      function setBolt(ptsPx, brPx, A) {
        const L = A.LG, W = (q) => new V3((q[0] - L.cx) / LS, (L.gy - q[1]) / LS, 0);
        if (bolt3.main) { bolt3.main.geometry.dispose(); gAl.remove(bolt3.main); } bolt3.brs.forEach((b) => { b.geometry.dispose(); gAl.remove(b); }); bolt3.brs = [];
        const mat = new THREE.MeshBasicMaterial({ color: 0xfffbd0, transparent: true }); bolt3.mat = mat;
        bolt3.main = new THREE.Mesh(mkBoltGeo(ptsPx.map(W), 0.07), mat); gAl.add(bolt3.main);
        brPx.forEach((bp) => { const m = new THREE.Mesh(mkBoltGeo(bp.map(W), 0.03), mat); gAl.add(m); bolt3.brs.push(m); });
      }
      function demoBoltPts(A) {
        const L = A.LG, tx = L.hx, ty = A.S.ap.rod ? L.tipY : L.roofY, x0 = L.cx + 6, y0 = L.cy + 22, pts = [[x0, y0]], n = 9;
        for (let i = 1; i < n; i++) { const f = i / n; pts.push([x0 + (tx - x0) * f + (((i * 37) % 11) - 5) * 4, y0 + (ty - y0) * f]); } pts.push([tx, ty]);
        const br = [3, 6].map((k, j) => { const q = pts[k], dir = j ? 1 : -1, bp = [[q[0], q[1]]]; for (let i = 1; i <= 4; i++) bp.push([bp[i - 1][0] + dir * (8 + ((i * 5) % 7)), bp[i - 1][1] + 12 + (i % 3) * 3]); return bp; });
        return { pts, br };
      }
      function lightning(A) {
        const S = A.S, a = S.ap, L = A.LG, LH = (L.gy - L.roofY) / LS;
        // 집 위치: 2D의 집 x 위치(오른쪽)
        cloudG.position.set(0, (L.gy - L.cy) / LS, 0); const hxw = (L.hx - L.cx) / LS; houseG.position.set(hxw, 0, 0); houseG.scale.setScalar(1);
        rodG.visible = !!a.rod;
        let charged = a.charged, prog = 0, fade = 0, struck = !!a.struck, flash = a.flash, hitT = a.hitT || 0, dmg = a.dmg, bolting = !!a.bolt, key = null;
        if (a.bolt) { const b = a.bolt; prog = clamp(b.t / 0.28, 0, 1); fade = b.t > 0.4 ? clamp(1 - (b.t - 0.4) / 1.0, 0, 1) : 1; key = b; if (bolt3.key !== b) { bolt3.key = b; setBolt(b.pts, b.br, A); } }
        else if (demoL.on) {
          const p = demoL.p; bolting = p >= 0.3 && p < 0.9; struck = p >= 0.42; charged = p < 0.3 ? 0.2 + 0.8 * p / 0.3 : p < 0.42 ? 1 : Math.max(0, 1 - (p - 0.42) * 3);
          prog = clamp((p - 0.3) / 0.12, 0, 1); fade = p > 0.5 ? clamp(1 - (p - 0.5) / 0.3, 0, 1) : 1; flash = p >= 0.42 && p < 0.55 ? 1 - (p - 0.42) / 0.13 : 0; hitT = Math.max(0, (p - 0.42) * 6); dmg = !a.rod && p >= 0.42 ? 1 : 0;
          const dk = 'demo' + (a.rod ? 'r' : 'h'); if (bolt3.key !== dk) { bolt3.key = dk; const d = demoBoltPts(A); setBolt(d.pts, d.br, A); }
        } else { bolt3.key = null; }
        const show = bolting && bolt3.main; [bolt3.main].concat(bolt3.brs).forEach((m, i) => { if (!m) return; m.visible = !!show && (i === 0 || prog > 0.5); });
        if (show) { const idx = bolt3.main.geometry.index.count; bolt3.main.geometry.setDrawRange(0, Math.max(6, Math.floor(prog * idx / 3) * 3)); bolt3.mat.opacity = fade; }
        flashL.intensity = flash * 2.5;
        // 전하 표시
        const d3 = new THREE.Object3D();
        for (let i = 0; i < 8; i++) { d3.position.set((-0.34 + 0.68 * i / 7) * 4.2, (L.gy - L.cy - 40 / 1) / LS - 0.1 + 0.0, 0.0); d3.position.y = (L.gy - (L.cy + 40)) / LS; d3.scale.setScalar(1); d3.updateMatrix(); minusI.setMatrixAt(i, d3.matrix); }
        minusI.instanceMatrix.needsUpdate = true; minusI.material.opacity = 0.25 + 0.75 * charged; plusI.material.opacity = 0.25 + 0.75 * charged;
        let k = 0;
        for (let x = -4.6; x <= 4.6 && k < 30; x += 0.9) { if (Math.abs(x - hxw) < 1.7) continue; d3.position.set(x, 0.12, 1.4); d3.updateMatrix(); plusI.setMatrixAt(k++, d3.matrix); }
        if (a.rod) { for (let i = 0; i < 6 && k < 30; i++) { const t = i / 5; d3.position.set(hxw + 0.12, ROD_TOP - 0.05 - (ROD_TOP - hh - 0.5) * t * t * t, 0); d3.updateMatrix(); plusI.setMatrixAt(k++, d3.matrix); } }
        else { for (let i = 0; i < 5 && k < 30; i++) { d3.position.set(hxw - 0.6 + i * 0.3, ROOF_TOP - 0.05 - Math.abs(i - 2) * 0.22, 0.4); d3.updateMatrix(); plusI.setMatrixAt(k++, d3.matrix); } }
        plusI.count = k; plusI.instanceMatrix.needsUpdate = true;
        // 피뢰침 전류 · 불
        curDots.forEach((dd, i) => { const on = struck && a.rod && !(bolting && prog < 1) ? true : struck && a.rod; dd.visible = !!(on && fade > 0.02 && (a.bolt ? a.struck : demoL.on)); if (!dd.visible) return; const q = ((hitT * 2.2 + i / 6) % 1); if (q < 0.5) dd.position.set(0.0, ROD_TOP - (ROD_TOP - hh - 0.4) * (q / 0.5), 0); else { const u = (q - 0.5) / 0.5; dd.position.set(hw / 2 + 0.4 * Math.min(1, u * 2), hh + 0.2 - (hh + 0.4) * u, 0.2); } });
        const burning = dmg > 0.02; fire.forEach((f, i) => { f.visible = burning; f.scale.y = 0.7 + 0.5 * Math.abs(Math.sin(S.t * 9 + i * 2)); f.material.opacity = Math.min(1, dmg); });
        lBurn.show(burning); lBurn.obj = [hxw, ROOF_TOP + 0.9, 0]; lRod.show(!!a.rod); lRod.obj = [hxw - 2.4, ROD_TOP, 0.3];
        lHouse.obj = [hxw, -0.1, 1.2]; lHouse.set(a.rod ? '피뢰침이 있는 집' : '피뢰침이 없는 집'); lCloud.obj = [-0.2, (L.gy - L.cy) / LS + 1.0, 0]; lGrd.obj = [-3.4, 0.0, 1.6];
        const E = A.LE / 1e9;
        info('<b>⛈️ ' + (a.rod ? '피뢰침이 있는 집에 번개가 치면?' : '피뢰침이 없는 집에 번개가 치면?') + '</b><br>구름–지면 전위차 약 10<sup>' + A.LVEXP + '</sup> V · 이동하는 전하 약 ' + A.LQ + ' C<br>에너지 = ' + A.LQ + ' C × 10<sup>' + A.LVEXP + '</sup> V = <b>' + fmt(E, 1) + ' × 10⁹ J</b><br>' + (a.rod ? '뾰족한 도체 끝에는 전하가 모여요. 번개는 피뢰침 끝으로 떨어지고 전하는 도선을 따라 땅으로 흘러가요 → 집은 안전해요.' : '피뢰침이 없으면 번개가 지붕에 직접 떨어져 위험해요.') + '<br><span style="opacity:.8">번개 치기와 피뢰침 여부는 옆 조작판에서 해요.</span>');
      }
      /* ▶ 재생 줄: 장면마다 하나씩 */
      let plM = null, plC = null, plE = null;
      plM = controls.player({ duration: 7, loop: true, autoplay: false, label: '시험 전하 놓기', phases: [[0, '정지'], [0.12, '전기장 방향으로 움직여요']], onFrame(p) { demoM.p = p; demoM.on = p > 0 || !!(plM && plM.playing); } });
      plC = controls.player({ duration: 9, loop: true, autoplay: false, label: '옮기고 놓기', phases: [[0, '(+)판까지 옮기기 · U = qV 쌓임'], [0.5, '(+)판'], [0.6, '놓기 · U → K']], onFrame(p) { demoP.p = p; demoP.on = p > 0 || !!(plC && plC.playing) || !!(plE && plE.playing) ; } });
      plE = controls.player({ duration: 6, loop: true, autoplay: false, label: '전자 놓기', phases: [[0, '(−)판'], [0.1, '가속 · 운동 에너지 = V (eV)'], [0.7, '(+)판 도착']], onFrame(p) { demoP.p = p; demoP.on = p > 0 || !!(plE && plE.playing) || !!(plC && plC.playing); } });
      let plL = null;
      plL = controls.player({ duration: 8, loop: true, autoplay: false, label: '번개 치기', phases: [[0, '전하가 쌓여요'], [0.3, '번개가 내려와요'], [0.42, '번개 치는 순간'], [0.55, '전하가 땅으로']], onFrame(p) { demoL.p = p; demoL.on = p > 0 || !!(plL && plL.playing); } });
      const allRows = [...ctx.renderer.domElement.parentNode.parentNode.querySelectorAll('.v3-player')]; [plM, plC, plE, plL].forEach((p, i) => (p.row = allRows[i]));
      let cur = '';
      function setMode(mode, kind) {
        const key = mode + (mode === 'plates' || mode === 'apply' ? kind : ''); if (key === cur) return; cur = key;
        gF.visible = mode === 'force'; gM.visible = mode === 'field'; gP.visible = mode === 'plates';
        gAc.visible = mode === 'apply' && kind === 'circuit'; gAd.visible = mode === 'apply' && kind === 'precip'; gAl.visible = mode === 'apply' && kind === 'light';
        labAc.forEach((l) => l.show(gAc.visible)); labAd.forEach((l) => l.show(gAd.visible)); labAl.forEach((l) => l.show(gAl.visible));
        plL.row.style.display = gAl.visible ? '' : 'none'; if (!gAl.visible) { plL.pause(); plL.set(0); }
        [lA, lB, lFA, lFB, lD].forEach((l) => l.show(mode === 'force')); lTok.show(false); lCh.forEach((l) => l.show(false));
        [lE, lMi, lPl, lQ].concat(rulerL).forEach((l) => l.show(mode === 'plates'));
        plM.row.style.display = mode === 'field' ? '' : 'none'; plC.row.style.display = mode === 'plates' && kind !== 'electron' ? '' : 'none'; plE.row.style.display = mode === 'plates' && kind === 'electron' ? '' : 'none';
        if (mode !== 'field') { plM.pause(); plM.set(0); } if (!(mode === 'plates' && kind !== 'electron')) { plC.pause(); plC.set(0); } if (!(mode === 'plates' && kind === 'electron')) { plE.pause(); plE.set(0); }
        if (mode === 'force') Object.assign(orbit, PHN ? { tx: 1.5, ty: 0, tz: 0, phi: 0.85, theta: 0.1, dist: 10 * KD } : { tx: 1.5, ty: 1.0, tz: 0, phi: 0.85, theta: 0.1, dist: 6.6 });   // PC: 처음부터 크게, 두 전하가 설명 상자 아래로 오게
        else if (mode === 'field') Object.assign(orbit, { tx: 0, ty: 0, tz: 0, phi: 0.7, theta: 0.0, dist: 14.5 * KD });
        else if (mode === 'plates') Object.assign(orbit, { tx: 3, ty: 1.2, tz: 0, phi: 1.2, theta: 0.15, dist: 10 * KD });
        else if (gAc.visible) Object.assign(orbit, { tx: 0, ty: 0.8, tz: 0, phi: 1.0, theta: 0.2, dist: 12 * KD * (PHN ? 1.15 : 1) });
        else if (gAd.visible) Object.assign(orbit, { tx: 0, ty: 2.8, tz: 0, phi: 1.25, theta: 0.3, dist: 12 * KD });
        else if (gAl.visible) Object.assign(orbit, { tx: 0, ty: 2.2, tz: 0, phi: 1.3, theta: 0.15, dist: 12 * KD * (PHN ? 1.1 : 1) });
      }
      return {
        update(dt) {
          const A = sim(); if (!A || !A.S) return; const S = A.S;
          setMode(S.mode, S.mode === 'apply' ? S.ap.sub : S.pl && S.pl.kind);
          if (S.mode === 'apply' && S.ap.sub === 'light' && S.ap.bolt && plL.playing) plL.pause();
          if (!plL.playing && plL.p === 0) demoL.on = false; if (S.ap.bolt) demoL.on = false;
          if (S.mode === 'field') { if (S.fl.tok.st !== 'tray' && plM.playing) plM.pause(); }
          if (S.mode === 'plates') { const el = S.pl.kind === 'electron'; if ((el ? S.pl.eSt !== 'rest' : S.pl.st !== 'held') && (plC.playing || plE.playing)) { plC.pause(); plE.pause(); } }
          paintDeco();
          if (S.mode === 'force') force(S); else if (S.mode === 'field') field(S, A); else if (S.mode === 'plates') plates(S, A); else if (S.ap.sub === 'circuit') circuit(A); else if (S.ap.sub === 'precip') precip(A); else lightning(A);
        },
        sync() {},
      };
    },
  });
})();
