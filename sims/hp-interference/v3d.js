/* hp-interference · 3D 빛의 간섭
   2D 실험(window.__sim)의 장면을 그대로 입체로 보여 줘요: 🌊 파동의 중첩(수면 파문의 보강·상쇄선 · 줄 위 두 펄스) · 🔦 이중 슬릿 · 📏 간섭 조건(경로차 · 무늬 간격 Δx = λL/d).
   파장·간격·거리 같은 값은 옆 조작판이 정하고 3D는 따라가요. (🛠️ 간섭 기술 장면은 2D 화면에서 해요) */
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
  const KDX = PHN ? 1.35 : 1;
  const f1 = (v) => (Math.round(v * 10) / 10).toFixed(1);
  window.SciSim3D.attach({
    title: '빛의 간섭 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대 · 값은 옆 조작판에서 바꿔요',
    camera: { dist: 13 * KDX, theta: 0.0, phi: 0.95, min: 4, max: 30, target: [5, 0, 0] },
    autoRotate: 0,
    levels: [0, 1, 2],
    build(ctx) {
      const { THREE, root, label, info, controls, orbit } = ctx;
      const { V3, M, tube } = tools(THREE);
      const sim = () => ctx.lesson();
      const gR = new THREE.Group(), gP = new THREE.Group(), gS = new THREE.Group(); root.add(gR, gP, gS);
      /* ================= 🌊 수면 파문 (1칸 = 4 cm, x는 오른쪽, 두 파원이 앞뒤(z)에 있어요) ================= */
      const UC = 0.25, NXc = 96, NZc = 50;
      let FW = 12, FH = 6.2, geoR = null, surf = null, colR = null, posR = null, rKey = '';
      const lnG = new THREE.Group(); gR.add(lnG);
      const sA = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.5, 16), M(0xffb020, { emissive: 0x7a4a00 })), sB = sA.clone(); gR.add(sA, sB);
      const lSA = label('파원 S₁', sA, { color: '#b45309', size: 12 }), lSB = label('파원 S₂', sB, { color: '#b45309', size: 12 });
      lSA.off = [0, 0.6, 0]; lSB.off = [0, 0.6, 0];
      const lDw = label('', [0, 0, 0], { color: '#475569', size: 12 }), lDk = label('상쇄선(잔잔한 선)', [0, 0, 0], { color: '#dc2626', size: 12 }), lBr = label('보강선', [0, 0, 0], { color: '#15803d', size: 12 });
      const cLo = new THREE.Color(0x0a2a55), cMid = new THREE.Color(0x1a62b0), cHi = new THREE.Color(0xd6f0ff), tc = new THREE.Color();
      function buildRipple(A) {
        FW = A.FIELD_CM * UC; FH = A.RF.h / A.RPX * UC;
        const key = A.FIELD_CM; if (key === rKey) return; rKey = key;
        if (surf) { gR.remove(surf); geoR.dispose(); }
        geoR = new THREE.PlaneGeometry(FW, FH, NXc, NZc); geoR.rotateX(-Math.PI / 2); geoR.translate(FW / 2, 0, FH / 2);
        posR = geoR.attributes.position; colR = new Float32Array(posR.count * 3); geoR.setAttribute('color', new THREE.BufferAttribute(colR, 3));
        surf = new THREE.Mesh(geoR, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.28, metalness: 0.15, side: THREE.DoubleSide })); surf.receiveShadow = true; gR.add(surf);
      }
      let lnKey = '';
      function hyp(s, d, col) {   // 경로차 s(cm)인 곡선 (두 파원 사이 간격 d, 파원은 x = SRC_X, z = 가운데 ± d/2)
        const a = Math.abs(s) / 2, c = d / 2, pts = [], sg = s >= 0 ? 1 : -1;
        const b = Math.sqrt(Math.max(0, c * c - a * a));
        for (let u = -3; u <= 3.001; u += 0.1) { const zz = a < 1e-9 ? 0 : sg * a * Math.cosh(u); const xx = a < 1e-9 ? u * 6 : b * Math.sinh(u); pts.push([xx, zz]); }
        return pts;
      }
      function rippleLines(A, S) {
        const r = S.rp, key = [r.lines, r.dT, r.fT].join('|'); if (key === lnKey) return; lnKey = key;
        while (lnG.children.length) { const c = lnG.children[0]; lnG.remove(c); c.geometry.dispose(); }
        if (!r.lines) return;
        const lam = A.WV / r.fT, d = r.dT, cx = A.SRC_X, cz = FH / UC / 2;
        for (let m = -30; m <= 30; m++) for (const [s, col] of [[m * lam, 0x4ade80], [(m + 0.5) * lam, 0xf87171]]) {
          if (Math.abs(s) >= d - 1e-6) continue;
          const pts = hyp(s, d).map(([xx, zz]) => new V3((cx + xx) * UC, 0.4, (cz + zz) * UC)).filter((p) => p.x >= 0 && p.x <= FW && p.z >= 0 && p.z <= FH);
          if (pts.length < 2) continue;
          const g = new THREE.BufferGeometry().setFromPoints(pts); lnG.add(new THREE.Line(g, new THREE.LineBasicMaterial({ color: col })));
        }
      }
      function ripple(A, S) {
        buildRipple(A); const r = S.rp, k = TAU / (A.WV / r.f), cx = A.SRC_X, cz = FH / UC / 2, y1 = cz - r.d / 2, y2 = cz + r.d / 2;
        for (let i = 0; i < posR.count; i++) {
          const x = posR.array[i * 3] / UC - cx, z = posR.array[i * 3 + 2] / UC;
          const r1 = Math.hypot(x, z - y1), r2 = Math.hypot(x, z - y2), v = (Math.cos(k * r1 - r.ph) + Math.cos(k * r2 - r.ph)) * 0.5;
          posR.array[i * 3 + 1] = v * 0.22; const c = v * 0.5 + 0.5;
          if (c < 0.5) tc.copy(cLo).lerp(cMid, c * 2); else tc.copy(cMid).lerp(cHi, (c - 0.5) * 2);
          colR[i * 3] = tc.r; colR[i * 3 + 1] = tc.g; colR[i * 3 + 2] = tc.b;
        }
        posR.needsUpdate = true; geoR.attributes.color.needsUpdate = true; geoR.computeVertexNormals();
        sA.position.set(cx * UC, 0.25, y1 * UC); sB.position.set(cx * UC, 0.25, y2 * UC);
        rippleLines(A, S);
        const lam = A.WV / r.fT;
        info('<b>🌊 두 파원의 물결이 겹쳐요</b> · 파원 간격 d = ' + Math.round(r.dT) + ' cm · 파장 λ = ' + lam.toFixed(1) + ' cm (진동수 ' + r.fT.toFixed(1) + ' Hz)<br>마루와 마루(골과 골)가 만나면 <b style="color:#4ade80">보강</b>, 마루와 골이 만나면 <b style="color:#f87171">상쇄</b> → 잔잔한 선이 생겨요.<br>오른쪽의 선의 수: 보강 ' + r.nB + ' · 상쇄 ' + r.nD + (r.lines ? ' (선 표시 켜짐)' : '') + '<br><span style="opacity:.8">파원 간격과 진동수는 옆 조작판에서 바꿔요.</span>');
      }
      /* ================= 🌊 줄 위의 두 펄스 (1 m = 3칸, 1 cm = 0.3칸) ================= */
      const PU = 3, CU = 0.3, NP = 160;
      const mkLine = (col, half) => {   // 두께가 있는 선(띠): 앞에서 볼 때 색이 잘 보이도록
        const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array((NP + 1) * 2 * 3), 3));
        const idx = []; for (let i = 0; i < NP; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } g.setIndex(idx);
        const l = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: col, side: THREE.DoubleSide })); l.frustumCulled = false; l.userData.half = half; gP.add(l); return l;
      };
      const lnA = mkLine(0x2f6df6, 0.045), lnB = mkLine(0xe2464b, 0.045), lnS = mkLine(0xf5f7ff, 0.07);
      const base = new THREE.Mesh(new THREE.BoxGeometry(4 * PU + 0.6, 0.05, 1.2), M(0x1d2a4a, { roughness: 1 })); base.position.set(2 * PU, -0.1, 0); gP.add(base);
      [0, 4 * PU].forEach((x) => { const p = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.8, 0.5), M(0x7a8599)); p.position.set(x + (x ? 0.15 : -0.15), 0, 0); gP.add(p); });
      const zl = new THREE.Mesh(new THREE.BoxGeometry(4 * PU, 0.02, 0.04), M(0x9aa6bb)); zl.position.set(2 * PU, 0, 0); gP.add(zl);
      const dotsA = [], dotsB = [], dotsS = [];
      for (let i = 0; i < 5; i++) { [[dotsA, 0x2f6df6, 0.1], [dotsB, 0xe2464b, 0.1], [dotsS, 0xffb400, 0.17]].forEach(([arr, col, rr]) => { const m = new THREE.Mesh(new THREE.SphereGeometry(rr, 14, 10), M(col, { emissive: col, emissiveIntensity: 0.3 })); gP.add(m); arr.push(m); }); }
      const lPA = label('왼쪽 펄스 (+4 cm)', [0, 0, 0], { color: '#2f6df6', size: 12 }), lPB = label('', [0, 0, 0], { color: '#e2464b', size: 12 }), lPS = label('실제 줄의 모양 = 합', [0, 0, 0], { color: '#475569', size: 12 }), lOv = label('', [2 * PU, 2.4, 0], { color: '#14a058', size: 13 });
      const demoP = { p: 0, on: false };
      function pulse(A, S) {
        const p = S.pl, cfg = p.cfg, P = A.PULSE || { LEN: 4.0, V: 0.8, SIG: 0.25, AA: 4, AB: 3, T0: 2.44, TEND: 6.2, XA: -0.2, XB: 4.2 };
        const t = demoP.on && !p.draw ? demoP.p * P.TEND : p.t;
        const pa = (x) => P.AA * Math.exp(-0.5 * Math.pow((x - (P.XA + P.V * t)) / P.SIG, 2)), pb = (x) => (cfg === 'same' ? 1 : -1) * P.AB * Math.exp(-0.5 * Math.pow((x - (P.XB - P.V * t)) / P.SIG, 2));
        const showSum = !p.draw || p.solved[cfg];
        [[lnA, pa, -0.1], [lnB, pb, 0.0], [lnS, (x) => pa(x) + pb(x), 0.1]].forEach(([l, fn, z]) => {
          const arr = l.geometry.attributes.position.array, hf = l.userData.half;
          for (let i = 0; i <= NP; i++) { const x = P.LEN * i / NP, y = fn(x) * CU; arr[i * 6] = x * PU; arr[i * 6 + 1] = y + hf; arr[i * 6 + 2] = z; arr[i * 6 + 3] = x * PU; arr[i * 6 + 4] = y - hf; arr[i * 6 + 5] = z; }
          l.geometry.attributes.position.needsUpdate = true;
        });
        lnS.visible = showSum;
        const X = [1.5, 1.75, 2.0, 2.25, 2.5], dots = A.dotsOf ? A.dotsOf(cfg) : [];
        X.forEach((x, i) => { const d = dots[i]; dotsA[i].visible = dotsB[i].visible = dotsS[i].visible = p.draw; if (!p.draw || !d) return; dotsA[i].position.set(x * PU, pa(x) * CU, 0); dotsB[i].position.set(x * PU, pb(x) * CU, 0); dotsS[i].position.set(x * PU, d.y * CU, 0); dotsS[i].material.color.setHex(d.ok ? 0x22c55e : 0xffb400); });
        lPA.obj = [0.2 * PU, 1.5, 0]; lPB.obj = [3.6 * PU, 1.5, 0]; lPB.set('오른쪽 펄스 (' + (cfg === 'same' ? '+' : '−') + P.AB + ' cm)'); lPS.obj = [2 * PU, -1.0, 0]; lPS.show(showSum);
        const ov = Math.min(1, Math.max(0, 1 - Math.abs((P.XB - P.V * t) - (P.XA + P.V * t)) / (3 * P.SIG)));
        lOv.show(!p.draw && ov > 0.15); lOv.set(cfg === 'same' ? '겹친 곳: 변위가 더해져 커져요 (보강)' : '겹친 곳: 변위가 더해져 작아져요 (상쇄)'); lOv.el.style.background = cfg === 'same' ? '#14a058' : '#e2464b';
        const ya = pa(2.0), yb = pb(2.0);
        info('<b>🌊 줄 위의 두 펄스</b> · 시간 ' + t.toFixed(1) + ' 초 · 오른쪽 펄스: ' + (cfg === 'same' ? '같은 방향' : '반대 방향') + '<br>' + (p.draw ? '파란 펄스 + 빨간 펄스 = ? (옆 2D 화면에서 점 5개를 합친 높이로 끌어 놓아요)' : '가운데(2.0 m)의 높이: 파란 펄스 ' + ya.toFixed(1) + ' cm + 빨간 펄스 ' + yb.toFixed(1) + ' cm = <b>' + (ya + yb).toFixed(1) + ' cm</b>') + '<br>두 펄스는 겹쳐도 서로 부딪치지 않고 각자의 모양을 그대로 지나가요 (중첩 원리).');
      }
      /* ================= 🔦 이중 슬릿 · 📏 간섭 조건 (빛은 +x 방향, 1 m = 2.2칸, 스크린 ±30 mm = ±3칸) ================= */
      const ZU = 2.2, MMU = 3 / 30;
      const table = new THREE.Mesh(new THREE.BoxGeometry(16, 0.1, 7), M(0x0d1530, { roughness: 1 })); table.position.set(2, -0.06, 0); gS.add(table);
      const laser = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.5, 0.6), M(0x4b5878, { metalness: 0.5 })); laser.position.set(-4.6, 0.3, 0); gS.add(laser);
      const lLas = label('레이저', laser, { color: '#4b5878', size: 12 }); lLas.off = [0, 0.6, 0];
      const beam = new THREE.Mesh(new THREE.BoxGeometry(1, 0.14, 0.14), new THREE.MeshBasicMaterial({ color: 0xff4040, transparent: true, opacity: 0.6, depthWrite: false })); gS.add(beam);
      const plate = new THREE.Group(); gS.add(plate);
      const wallM = M(0x64748b, { metalness: 0.3 });
      const wallParts = [0, 1, 2].map(() => { const w = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.4, 1), wallM); w.position.y = 0.6; plate.add(w); return w; });
      const lPl = label('가림판 (슬릿)', plate, { color: '#64748b', size: 12 }); lPl.off = [0, 1.6, 0];
      const screen = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.6, 6.2), M(0x1a1f33, { roughness: 1 })); gS.add(screen);
      const cv = document.createElement('canvas'); cv.width = 600; cv.height = 4; const cx2 = cv.getContext('2d'), img = cx2.createImageData(600, 4);
      const tex = new THREE.CanvasTexture(cv); tex.minFilter = THREE.LinearFilter;
      const face = new THREE.Mesh(new THREE.PlaneGeometry(6, 1.5), new THREE.MeshBasicMaterial({ map: tex })); face.rotation.y = -Math.PI / 2; gS.add(face);
      const lScr = label('스크린', screen, { color: '#475569', size: 12 }); lScr.off = [0, 1.1, -2.8];
      // 슬릿에서 퍼지는 파면 (열린 슬릿마다 원호 여러 개)
      const NARC = 14, arcs = [];
      const arcGeo = (() => { const pts = []; for (let i = 0; i <= 28; i++) { const a = -1.25 + 2.5 * i / 28; pts.push(new V3(Math.cos(a), 0, Math.sin(a))); } return new THREE.BufferGeometry().setFromPoints(pts); })();
      for (let s = 0; s < 2; s++) for (let k = 0; k < NARC; k++) { const l = new THREE.Line(arcGeo, new THREE.LineBasicMaterial({ color: 0xff6060, transparent: true, opacity: 0.45 })); l.position.y = 0.3; gS.add(l); arcs.push(l); }
      const pMk = new THREE.Mesh(new THREE.SphereGeometry(0.17, 18, 14), M(0xff8a30, { emissive: 0xaa4400 })); gS.add(pMk);
      const rA = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1, 6), new THREE.MeshBasicMaterial({ color: 0xffd34d })), rB = rA.clone(); gS.add(rA, rB);
      const lP = label('P', pMk, { color: '#e2671a', size: 14 }), lDx = label('', [0, 0, 0], { color: '#0f766e', size: 13 });
      const mkA = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.3, 0.05), M(0x22d3ee, { emissive: 0x0e7490 })), mkB = mkA.clone(); gS.add(mkA, mkB);
      const lMA = label('A', mkA, { color: '#0e7490', size: 13 }), lMB = label('B', mkB, { color: '#0e7490', size: 13 });
      const bCol = new THREE.Color();
      const rotZ = (v) => v;
      function slit(A, S) {
        const sm = S.sm, cond = S.mode === 'cond', unk = cond && S.cs === 'unk', white = S.sl.light === 'white' && !unk, slits = cond ? 2 : S.sl.slits;
        const zs = sm.L * ZU, dd = 0.4 + 4 * sm.d, y1 = -dd / 2, y2 = dd / 2;
        // 스크린 무늬 (2D와 같은 식: inten)
        const pat = [];
        const base = A.wlRGB(sm.lam), mx = Math.max(base[0], base[1], base[2]) || 1;
        for (let i = 0; i < 600; i++) {
          const y = (i + 0.5 - 300) / 600 * 2 * A.HALF_MM;
          let r, g, b;
          if (white) {
            r = g = b = 0;
            A.LAMS.forEach((l, k) => { const I = A.inten(y, l, sm.d, sm.L, slits), c = A.wlRGB(l); r += I * c[0]; g += I * c[1]; b += I * c[2]; });
            const n = A.LAMS.length; const norm = [0, 1, 2].map((q) => 255 / A.LAMS.reduce((s2, l) => s2 + A.wlRGB(l)[q], 0));
            r = Math.min(255, r * norm[0]); g = Math.min(255, g * norm[1]); b = Math.min(255, b * norm[2]); const gm = 0.75; r = 255 * Math.pow(r / 255, gm); g = 255 * Math.pow(g / 255, gm); b = 255 * Math.pow(b / 255, gm); void n;
          } else { const I = A.inten(y, sm.lam, sm.d, sm.L, slits), k = Math.pow(I, 0.6); r = base[0] / mx * 255 * k; g = base[1] / mx * 255 * k; b = base[2] / mx * 255 * k; }
          pat.push([r, g, b]);
        }
        const key = [sm.lam.toFixed(1), sm.d.toFixed(3), sm.L.toFixed(2), slits, white].join('|');
        if (key !== slit._key) { slit._key = key; for (let row = 0; row < 4; row++) for (let i = 0; i < 600; i++) { const o = (row * 600 + i) * 4; img.data[o] = pat[i][0]; img.data[o + 1] = pat[i][1]; img.data[o + 2] = pat[i][2]; img.data[o + 3] = 255; } cx2.putImageData(img, 0, 0); tex.needsUpdate = true; }
        screen.position.set(zs + 0.05, 0.8, 0); face.position.set(zs - 0.01, 0.8, 0);
        const col = white ? 0xffffff : (() => { const c = A.wlRGB(sm.lam); return (Math.round(c[0]) << 16) | (Math.round(c[1]) << 8) | Math.round(c[2]); })();
        beam.material.color.setHex(col); beam.scale.x = 4.5 - 0.1; beam.position.set(-4.6 + 0.6 + (4.5 - 0.1) / 2, 0.3, 0);
        const hs = 0.07, setW = (w, z0, z1) => { w.visible = z1 - z0 > 0.02; w.scale.z = Math.max(0.01, z1 - z0); w.position.z = (z0 + z1) / 2; };
        setW(wallParts[0], -3.5, y1 - hs);
        if (slits === 2) { setW(wallParts[1], y1 + hs, y2 - hs); setW(wallParts[2], y2 + hs, 3.5); }
        else { setW(wallParts[1], y1 + hs, 3.5); wallParts[2].visible = false; }
        const ph = ((S.t * 0.9) % 1), lamD = Math.max(0.3, sm.lam / 400 * 0.4);
        arcs.forEach((l, idx) => { const s = Math.floor(idx / NARC), k = idx % NARC; const open = s === 0 ? true : slits === 2; const r = ((ph + k) * lamD); const maxR = zs - 0.15; l.visible = open && r < maxR && r > 0.05; if (l.visible) { l.position.set(0.1, 0.3, s === 0 ? y1 : y2); l.rotation.y = 0; l.scale.set(r, 1, r); l.material.color.setHex(col); } });
        void rotZ; void bCol;
        const dx = A.nBright ? sm.lam * sm.L / sm.d * 1e-3 : 0;
        lDx.show(false);
        // 경로차 (P)
        const showP = cond && S.cs === 'path';
        pMk.visible = showP; lP.show(showP); rA.visible = rB.visible = showP;
        if (showP) {
          const yP = S.cd.yP * MMU; pMk.position.set(zs - 0.05, 0.8, yP); lP.off = [0, 0.4, 0];
          const seg = (m, y0) => { const a = new V3(0.1, 0.3, y0), b = new V3(zs - 0.05, 0.8, yP), d = b.clone().sub(a); m.scale.set(1, d.length(), 1); m.position.copy(a).addScaledVector(d, 0.5); m.quaternion.setFromUnitVectors(new V3(0, 1, 0), d.normalize()); };
          seg(rA, y1); seg(rB, y2);
        }
        const showM = cond && S.cs === 'unk';
        mkA.visible = mkB.visible = showM; lMA.show(showM); lMB.show(showM);
        if (showM) { mkA.position.set(zs - 0.02, 0.8, S.cd.A * MMU); mkB.position.set(zs - 0.02, 0.8, S.cd.B * MMU); lMA.off = [0, 0.9, 0]; lMB.off = [0, 0.9, 0]; }
        // 설명
        let txt;
        const par = { lam: sm.lam, d: sm.d, L: sm.L };
        if (S.mode === 'slit') {
          txt = '<b>🔦 ' + (S.sl.light === 'white' ? '흰빛' : '레이저 ' + S.sl.lamT + ' nm') + ' · 슬릿 ' + S.sl.slits + '개</b><br>슬릿 간격 d = ' + S.sl.dT.toFixed(2) + ' mm · 스크린까지 L = ' + S.sl.LT.toFixed(1) + ' m (슬릿 간격은 그림에서 과장했어요)<br>' + (S.sl.slits === 1 ? '슬릿이 1개면 무늬 없이 한 줄로 퍼져요.' : S.sl.light === 'white' ? '색마다 무늬 간격이 달라서 가운데는 흰색, 가장자리는 색 띠가 생겨요.' : '밝은 줄 사이 간격 <b>Δx = λL/d = ' + (sm.lam * sm.L / sm.d * 1e-3).toFixed(1) + ' mm</b>');
        } else if (S.cs === 'path') {
          const r = Math.abs(A.pathRatio(sm));
          txt = '<b>📏 경로차와 밝기</b> · 레이저 ' + S.sl.lamT + ' nm · d ' + S.sl.dT.toFixed(2) + ' mm · L ' + S.sl.LT.toFixed(1) + ' m<br>P의 위치 ' + (S.cd.yP >= 0 ? '+' : '−') + Math.abs(S.cd.yP).toFixed(1) + ' mm · 경로차 = <b>' + r.toFixed(2) + ' λ</b> → <b>' + A.brightWord(r) + '</b><br>경로차가 λ의 정수배이면 밝고(보강), 0.5λ · 1.5λ …이면 어두워요(상쇄).';
        } else if (S.cs === 'unk') {
          txt = '<b>📏 미지의 레이저 파장 구하기</b> · d = 0.20 mm · L = 3.0 m<br>표지 A·B를 밝은 줄에 맞춰 무늬 간격 Δx를 재고, 파장 λ = d·Δx / L 로 구해요. (파장은 2D 화면에서 측정해요)<br>A–B 거리 ' + Math.abs(S.cd.B - S.cd.A).toFixed(1) + ' mm';
        } else {
          txt = '<b>📏 무늬 간격에 영향을 주는 요인</b> · 지금 조건: ' + S.sl.lamT + ' nm · ' + S.sl.dT.toFixed(2) + ' mm · ' + S.sl.LT.toFixed(1) + ' m<br>밝은 줄 사이 간격 <b>Δx = λL/d = ' + (sm.lam * sm.L / sm.d * 1e-3).toFixed(1) + ' mm</b><br>λ가 크고 L이 클수록, d가 작을수록 무늬 간격이 넓어져요. 하나씩만 바꾸어 비교해요.';
        }
        void dx; void par;
        info(txt + '<br><span style="opacity:.8">파장 · 슬릿 간격 · 거리는 옆 조작판에서 바꿔요.</span>');
      }
      /* ================= 장면 · ▶ 재생 ================= */
      let plP = null;
      plP = controls.player({ duration: 10, loop: true, autoplay: false, label: '두 펄스 재생', phases: [[0, '다가와요'], [0.3, '겹쳐요'], [0.45, '지나가요']], onFrame(p) { demoP.p = p; demoP.on = p > 0 || !!(plP && plP.playing); } });
      plP.row = ctx.renderer.domElement.parentNode.parentNode.querySelector('.v3-player');
      let cur = '';
      function setMode(S) {
        const mode = S.mode === 'wave' ? 'wave-' + S.wsub : S.mode === 'cond' ? 'slit' : S.mode;
        if (mode === cur) return; cur = mode;
        gR.visible = mode === 'wave-ripple'; gP.visible = mode === 'wave-pulse'; gS.visible = mode === 'slit';
        [lSA, lSB, lDw, lDk, lBr].forEach((l) => l.show(mode === 'wave-ripple')); lSA.show(mode === 'wave-ripple'); lSB.show(mode === 'wave-ripple'); lDw.show(false); lDk.show(false); lBr.show(false);
        [lPA, lPB, lPS, lOv].forEach((l) => l.show(mode === 'wave-pulse'));
        [lLas, lPl, lScr, lP, lDx, lMA, lMB].forEach((l) => l.show(mode === 'slit'));
        plP.row.style.display = mode === 'wave-pulse' ? '' : 'none'; if (mode !== 'wave-pulse') { plP.pause(); plP.set(0); }
        if (mode === 'wave-ripple') Object.assign(orbit, { tx: 6, ty: 0, tz: 3.1, phi: 0.95, theta: 0.0, dist: 12 * KDX });
        else if (mode === 'wave-pulse') Object.assign(orbit, { tx: 6, ty: 0.2, tz: 0, phi: 1.1, theta: 0.0, dist: 12 * KDX });
        else if (mode === 'slit') Object.assign(orbit, { tx: 1.6, ty: 0.3, tz: 0, phi: 1.0, theta: -0.8, dist: 12 * KDX });
      }
      const NOTE = '🛠️ 간섭 기술(무반사 코팅 · 비눗방울 · 소음 제거 · 간섭계)은 2D 화면에서 해요. 위의 [▦ 2D]를 눌러 보세요.';
      return {
        update(dt) {
          const A = sim(); if (!A || !A.S) return; const S = A.S;
          if (S.mode === 'tech') { if (cur !== 'tech') { cur = 'tech'; gR.visible = gP.visible = gS.visible = false; [lSA, lSB, lDw, lDk, lBr, lPA, lPB, lPS, lOv, lLas, lPl, lScr, lP, lDx, lMA, lMB].forEach((l) => l.show(false)); plP.row.style.display = 'none'; } info(NOTE); return; }
          setMode(S);
          if (cur === 'wave-pulse') { if (S.pl.draw && plP.playing) plP.pause(); if (!plP.playing && plP.p === 0) demoP.on = false; pulse(A, S); }
          else if (cur === 'wave-ripple') ripple(A, S);
          else slit(A, S);
        },
        sync() {},
      };
    },
  });
})();
