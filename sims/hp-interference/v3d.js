/* hp-interference · 3D 빛의 간섭
   2D 실험(window.__sim)의 장면을 그대로 입체로 보여 줘요: 🌊 파동의 중첩(수면 파문의 보강·상쇄선 · 줄 위 두 펄스) · 🔦 이중 슬릿 · 📏 간섭 조건(경로차 · 무늬 간격 Δx = λL/d).
   파장·간격·거리 같은 값은 옆 조작판이 정하고 3D는 따라가요. 🛠️ 간섭 기술(무반사 코팅 · 비눗방울 · 소음 제거 헤드폰 · 간섭계)도 입체로 봐요. */
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
    levels: [0, 1, 2, 3],
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

      /* ================= 🛠️ 간섭 기술: 🔍 무반사 코팅 · 🫧 비눗방울 · 🎧 소음 제거 헤드폰 · 🛰️ 간섭계 ================= */
      const gC = new THREE.Group(), gB = new THREE.Group(), gH = new THREE.Group(), gL = new THREE.Group(); root.add(gC, gB, gH, gL); gC.visible = gB.visible = gH.visible = gL.visible = false;
      const { mkArrow, setArrow } = tools(THREE);
      const TAU = Math.PI * 2, clampT = (x, a, b) => Math.max(a, Math.min(b, x));
      const labC = [], labB = [], labH = [], labL = [];
      let LAMN = null;
      const specRGB = (A, fn) => { if (!LAMN) LAMN = [0, 1, 2].map((c) => 255 / A.LAMS.reduce((s2, l) => s2 + A.wlRGB(l)[c], 0)); let r = 0, g = 0, b = 0; A.LAMS.forEach((l) => { const I = fn(l), c = A.wlRGB(l); r += I * c[0] * LAMN[0]; g += I * c[1] * LAMN[1]; b += I * c[2] * LAMN[2]; }); return [r, g, b].map((v) => Math.round(255 * Math.pow(Math.min(255, v) / 255, 0.8))); };
      const rgbCol = (c) => new THREE.Color(c[0] / 255, c[1] / 255, c[2] / 255);
      function waveTube(mesh, fn, x0, x1, y, col, r, n) {
        const pts = []; n = n || 70; for (let i = 0; i <= n; i++) { const u = i / n; pts.push(new V3(x0 + (x1 - x0) * u, y + fn(u), 0)); }
        const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), n, r, 5, false); if (mesh.geometry) mesh.geometry.dispose(); mesh.geometry = g;
      }
      const waveMesh = (col, par) => { const m = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ color: col })); par.add(m); return m; };
      /* --- 🔍 무반사 코팅 (단면, 빛은 20°로 비스듬히) --- */
      const glassC = new THREE.Mesh(new THREE.BoxGeometry(6.4, 2.2, 2), M(0x5f8fb0, { roughness: 0.2, transparent: true, opacity: 0.85 })); glassC.position.set(-0.8, -1.1, 0); gC.add(glassC);
      const filmC = new THREE.Mesh(new THREE.BoxGeometry(6.4, 1, 2.02), M(0xffc44d, { roughness: 0.3, transparent: true, opacity: 0.85 })); gC.add(filmC);
      const aIn = mkArrow(0xffffff, 0.04), aR1 = mkArrow(0xff7a45, 0.04), aR2 = mkArrow(0x3a8dff, 0.04), aF1 = mkArrow(0xffffff, 0.03), aF2 = mkArrow(0xffffff, 0.03), aTr = mkArrow(0xffffff, 0.03); gC.add(aIn, aR1, aR2, aF1, aF2, aTr);
      const glowC = new THREE.Mesh(new THREE.SphereGeometry(0.5, 20, 16), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6, depthWrite: false })); gC.add(glowC);
      const wC = [waveMesh(0xff7a45, gC), waveMesh(0x3a8dff, gC), waveMesh(0x1b2333, gC)];
      const lC = { air: label('공기', [-3.6, 1.2, 0], { color: '#5d6879', size: 12 }), film: label('코팅 막', [2.6, 0, 0], { color: '#a16207', size: 12 }), glass: label('유리 렌즈', [2.6, -1.5, 0], { color: '#36556f', size: 12 }), refl: label('', glowC, { color: '#26324a', size: 13 }), n1: label('①', aR1, { color: '#ff7a45', size: 13 }), n2: label('②', aR2, { color: '#3a8dff', size: 13 }),
        w1: label('① 윗면 반사파', [3.3, 3.1, 0], { color: '#ff7a45', size: 11 }), w2: label('② 아랫면 반사파 (더 먼 길)', [3.3, 1.7, 0], { color: '#3a8dff', size: 11 }), w3: label('①+② 겹친 파동', [3.3, 0.3, 0], { color: '#1b2333', size: 11 }) };
      labC.push(...Object.values(lC));
      const demoC = { p: 0, on: false };
      function coat(A, S, t) {
        const tc = S.tc, th = demoC.on ? 250 * demoC.p : tc.th, white = tc.cw === 'white', sc = 0.011, thp = Math.max(0.0, th * sc);
        filmC.visible = thp > 0.01; filmC.scale.y = Math.max(0.001, thp); filmC.position.set(-0.8, thp / 2, 0);
        const ti = 20 * Math.PI / 180, tr = Math.asin(Math.sin(ti) / A.N_FILM), tg = Math.asin(Math.sin(ti) / 1.5), R = 2.4;
        const ax = -1.2, Ap = new V3(ax, thp, 0), Bp = new V3(ax + thp * Math.tan(tr), 0, 0), Cp = new V3(ax + 2 * thp * Math.tan(tr), thp, 0);
        const col = white ? 0xffffff : 0x32d36b;
        [aIn, aF1, aF2, aTr].forEach((a) => a.children.forEach((c) => c.material.color.setHex(col)));
        setArrow(aIn, new V3(Ap.x - Math.sin(ti) * R, Ap.y + Math.cos(ti) * R, 0), Ap);
        const ex = new V3(Ap.x + Math.sin(ti) * R, Ap.y + Math.cos(ti) * R, 0);
        setArrow(aR1, Ap, ex);
        if (thp > 0.04) { setArrow(aF1, Ap, Bp); setArrow(aF2, Bp, Cp); setArrow(aR2, Cp, new V3(Cp.x + Math.sin(ti) * R * 0.95, Cp.y + Math.cos(ti) * R * 0.95, 0)); setArrow(aTr, Bp, new V3(Bp.x + Math.sin(tg) * 1.6, -Math.cos(tg) * 1.6, 0)); aTr.children.forEach((c) => { c.material.transparent = true; c.material.opacity = 0.45; }); }
        else { aF1.visible = aF2.visible = aR2.visible = false; setArrow(aTr, Ap, new V3(Ap.x + Math.sin(tg) * 1.6, -Math.cos(tg) * 1.6, 0)); }
        const rPct = (tc.cw === 'green' ? A.coatR(th, A.LAM_GREEN) : A.LAMS.reduce((s2, l) => s2 + A.coatR(th, l), 0) / A.LAMS.length) * 100;
        const rc = white ? rgbCol(specRGB(A, (l) => A.coatR(th, l))) : new THREE.Color(0x32d36b);
        glowC.position.set(ex.x + (Cp.x - Ap.x) * 0.5 + 0.4, ex.y, 0); glowC.scale.setScalar(0.3 + 1.1 * clampT(rPct / 100, 0, 1)); glowC.material.color.copy(rc); glowC.material.opacity = 0.2 + 0.75 * clampT(rPct / 100, 0, 1);
        lC.refl.set('반사광 ' + Math.round(rPct) + ' %'); lC.refl.el.style.background = rPct <= 2 ? '#14a058' : '#26324a'; lC.refl.off = [0.5, 0.75, 0];
        lC.n1.obj = [Ap.x + 0.9, Ap.y + 1.3, 0]; lC.n2.obj = [Cp.x + 1.5, Cp.y + 1.6, 0]; lC.n2.show(thp > 0.04); lC.film.show(thp > 0.35); lC.film.obj = [2.7, thp / 2, 0];
        const phi = TAU * A.N_FILM * th / A.LAM_GREEN * 2, ky = TAU * 2, ph0 = t * 5, X0 = 3.3, X1 = 7.3;
        waveTube(wC[0], (u) => 0.36 * Math.cos(ky * u - ph0), X0, X1, 2.6, 0, 0.045); waveTube(wC[1], (u) => 0.36 * Math.cos(ky * u - ph0 + phi), X0, X1, 1.2, 0, 0.045); waveTube(wC[2], (u) => 0.36 * (Math.cos(ky * u - ph0) + Math.cos(ky * u - ph0 + phi)) / 2, X0, X1, -0.2, 0, 0.07);
        lC.w1.obj = [X0 + 1.4, 3.35, 0]; lC.w2.obj = [X0 + 1.4, 1.95, 0]; lC.w3.obj = [X0 + 1.4, 0.55, 0];
        const msg = white ? (th === 0 ? '코팅이 없으면 모든 색이 같은 비율로 반사돼요.' : '코팅 두께에 따라 줄어드는 색이 달라서, 반사광은 약간 푸르거나 보랏빛으로 보여요.') : (rPct <= 2 ? '두 반사파가 반대 위상으로 만나 <b>상쇄</b>돼요! 막 속 파장(약 400 nm)의 1/4쯤 되는 두께예요.' : '두 반사파의 위상 차이가 ' + Math.round(((phi * 180 / Math.PI) % 360 + 360) % 360) + '°예요. 180°에 가까울수록 상쇄돼요.');
        info('<b>🔍 무반사 코팅</b> · 두께 <b>' + Math.round(th) + ' nm</b> · ' + (white ? '흰빛' : '초록빛 550 nm') + ' · 반사광 <b>' + Math.round(rPct) + ' %</b><br>' + msg + '<br><span style="opacity:.8">막을 두껍게 그렸어요 (실제는 수십~백 nm). 색 그래프는 2D에서 봐요.</span>');
      }
      /* --- 🫧 비눗방울 (세워 둔 비눗물 막) --- */
      const FWs = 2.8, FHs = 4.0;
      const cvB = document.createElement('canvas'); cvB.width = 1; cvB.height = 300; const cxB = cvB.getContext('2d'), imgB = cxB.createImageData(1, 300);
      const texB = new THREE.CanvasTexture(cvB); texB.minFilter = THREE.LinearFilter; texB.magFilter = THREE.LinearFilter;
      const filmB = new THREE.Mesh(new THREE.PlaneGeometry(FWs, FHs), new THREE.MeshBasicMaterial({ map: texB })); filmB.position.set(0, FHs / 2 + 0.2, 0); gB.add(filmB);
      { const fm = M(0x10141f, { roughness: 0.6 }); [[0, FHs + 0.35, FWs + 0.5, 0.3], [0, 0.05, FWs + 0.5, 0.3]].forEach(([x, y, w, h]) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.3), fm); b.position.set(x, y, 0); gB.add(b); }); [-1, 1].forEach((sg) => { const b = new THREE.Mesh(new THREE.BoxGeometry(0.3, FHs + 0.6, 0.3), fm); b.position.set(sg * (FWs / 2 + 0.1), FHs / 2 + 0.2, 0); gB.add(b); }); const st = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 1.2), fm); st.position.set(0, -0.2, 0); gB.add(st); }
      const probeB = new THREE.Mesh(new THREE.BoxGeometry(FWs + 0.6, 0.05, 0.12), new THREE.MeshBasicMaterial({ color: 0xffb400 })), probeBall = new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 12), M(0xffb400, { emissive: 0x7a5200 })); gB.add(probeB, probeBall);
      const swatch = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.5, 0.2), new THREE.MeshBasicMaterial({ color: 0xffffff })); gB.add(swatch);
      const lB = { probe: label('', probeBall, { color: '#b57a00', size: 12 }), sw: label('보이는 색', swatch, { color: '#26324a', size: 12 }), top: label('얇아요 → 검게 보여요', [-2.6, FHs + 0.2, 0], { color: '#475569', size: 11 }), bot: label('', [-2.6, 0.45, 0], { color: '#475569', size: 11 }) };
      labB.push(...Object.values(lB));
      const demoB = { p: 0, on: false };
      function soap(A, S) {
        const tc = S.tc, tb = tc.soap, probe = demoB.on ? 0.03 + 0.94 * demoB.p : tc.probe;
        for (let j = 0; j < 300; j++) { const yf = (j + 0.5) / 300, tt = A.soapT(yf, tb), c = specRGB(A, (l) => A.soapR(tt, l)), o = j * 4; imgB.data[o] = c[0]; imgB.data[o + 1] = c[1]; imgB.data[o + 2] = c[2]; imgB.data[o + 3] = 255; }
        cxB.putImageData(imgB, 0, 0); texB.needsUpdate = true;
        const py = FHs + 0.2 - probe * FHs, pt = A.soapT(probe, tb);
        probeB.position.set(0, py, 0.12); probeBall.position.set(FWs / 2 + 0.55, py, 0.12); swatch.position.set(FWs / 2 + 1.5, py, 0.1);
        const c = specRGB(A, (l) => A.soapR(pt, l)); swatch.material.color.copy(rgbCol(c));
        lB.probe.set('탐침 ' + Math.round(pt) + ' nm'); lB.probe.off = [0, 0.4, 0]; lB.sw.off = [0, -0.55, 0]; lB.bot.set('아래 ' + Math.round(tb) + ' nm → 두꺼워요');
        const msg = pt < 25 ? '아주 얇은 곳은 위·아래 반사광이 서로 상쇄돼서 검게 보여요.' : '두께가 달라지면 보강되는 빛의 파장(색)이 달라져서 색 띠가 생겨요. 막이 흘러내리면 띠도 움직여요.';
        info('<b>🫧 세워 둔 비눗물 막</b> · 위쪽은 얇고 아래쪽은 두꺼워요<br>탐침 위치의 두께 <b>' + Math.round(pt) + ' nm</b> · 막 아래쪽 두께 ' + Math.round(tb) + ' nm<br>' + msg + '<br><span style="opacity:.8">비눗방울과 기름막의 무지개색도 같은 원리예요. 탐침은 ▶ 재생이나 2D에서 움직여요.</span>');
      }
      /* --- 🎧 소음 제거 헤드폰 --- */
      const wH = [waveMesh(0xe2464b, gH), waveMesh(0x2f6df6, gH), waveMesh(0x14a058, gH)];
      const hpG = new THREE.Group(); gH.add(hpG);
      { const band = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.1, 10, 36, Math.PI), M(0x394258, { metalness: 0.4 })); band.position.y = 0.1; hpG.add(band);
        [-1.5, 1.5].forEach((x) => { const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.5, 28), M(0x4b5878, { metalness: 0.3 })); cup.rotation.z = Math.PI / 2; cup.position.set(x, 0.1, 0); hpG.add(cup); const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.12, 24), M(0xe8edf6)); pad.rotation.z = Math.PI / 2; pad.position.set(x * 0.8, 0.1, 0); hpG.add(pad); });
        const mic = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10), M(0xe2464b, { emissive: 0x7a1d1d })); mic.position.set(-1.78, 0.5, 0.2); hpG.add(mic);
        const ear = new THREE.Mesh(new THREE.SphereGeometry(0.28, 14, 10), M(0xf3cfa8)); ear.scale.set(0.4, 1, 0.8); ear.position.set(0, 0.1, 0); hpG.add(ear); }
      hpG.position.set(5.2, -0.2, 0);
      const barH = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1, 0.7), M(0xe2464b)); gH.add(barH);
      const barBack = new THREE.Mesh(new THREE.BoxGeometry(0.75, 3.2, 0.75), new THREE.MeshBasicMaterial({ color: 0xe8edf6, transparent: true, opacity: 0.25, depthWrite: false })); gH.add(barBack);
      const lH = { w1: label('🔊 바깥 소음', [-4.2, 3.1, 0], { color: '#e2464b', size: 12 }), w2: label('', [-3.2, 1.8, 0], { color: '#2f6df6', size: 12 }), w3: label('👂 귀에 들리는 소리 (합)', [-3.2, 0.4, 0], { color: '#14a058', size: 12 }), hp: label('🎧 헤드폰 (마이크로 소음을 듣고 반대 위상을 내요)', hpG, { color: '#394258', size: 11 }), bar: label('', barH, { color: '#26324a', size: 13 }) };
      labH.push(...Object.values(lH));
      const demoH = { p: 0, on: false };
      function phone(A, S, t) {
        const tc = S.tc, phd = demoH.on ? 360 * demoH.p : tc.ph, phs = phd * Math.PI / 180, k = TAU * 3, ph0 = t * 6, X0 = -5.6, X1 = 1.8;
        waveTube(wH[0], (u) => 0.4 * Math.cos(k * u - ph0), X0, X1, 3.0, 0, 0.05); waveTube(wH[1], (u) => 0.4 * Math.cos(k * u - ph0 + phs), X0, X1, 1.6, 0, 0.05); waveTube(wH[2], (u) => 0.4 * (Math.cos(k * u - ph0) + Math.cos(k * u - ph0 + phs)) / 2, X0, X1, 0.2, 0, 0.075);
        const left = Math.abs(Math.cos(phs / 2));
        lH.w2.set('🎧 헤드폰이 낸 소리 (위상 ' + Math.round(phd) + '°)'); lH.w1.obj = [-4.0, 3.6, 0]; lH.w2.obj = [-3.4, 2.2, 0]; lH.w3.obj = [-3.4, 0.8, 0]; lH.hp.off = [0, 1.9, 0];
        const h = Math.max(0.02, 3.2 * left); barH.scale.set(1, h, 1); barH.position.set(7.8, h / 2 - 0.0, 0); barBack.position.set(7.8, 1.6, 0); barH.material.color.setHex(left < 0.03 ? 0x14a058 : 0xe2464b);
        lH.bar.set('남은 소음 ' + Math.round(left * 100) + ' %'); lH.bar.off = [0, 0.5, 0];
        const msg = left < 0.03 ? '반대 위상(180°)의 소리가 마루와 골이 만나게 해서 소리가 상쇄돼요. 헤드폰은 마이크로 소음을 듣고 반대 위상의 소리를 내요.' : '위상이 180°에서 멀어질수록 상쇄가 덜 되어 소음이 남아요. 0°이면 오히려 소리가 커져요(보강).';
        info('<b>🎧 소음 제거 헤드폰</b> · 소음 + 헤드폰이 낸 반대 소리 = 귀에 들리는 소리<br>반대 소리의 위상 <b>' + Math.round(phd) + '°</b> · 귀에 남은 소음 <b>' + Math.round(left * 100) + ' %</b> (소음만 있을 때 = 100 %)<br>' + msg);
      }
      /* --- 🛰️ 간섭계 (위에서 본 모습, 광학 테이블) --- */
      const tblL = new THREE.Mesh(new THREE.BoxGeometry(10, 0.2, 7), M(0x0d1224, { roughness: 0.9 })); tblL.position.set(0.5, -0.12, 0.2); tblL.receiveShadow = true; gL.add(tblL);
      const laserB = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.5, 0.6), M(0x4b5878, { metalness: 0.4 })); laserB.position.set(-3.6, 0.25, 0); gL.add(laserB);
      const splitB = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 1.1), new THREE.MeshStandardMaterial({ color: 0x9cc8ff, transparent: true, opacity: 0.6, roughness: 0.1 })); splitB.rotation.y = Math.PI / 4; splitB.position.set(0, 0.25, 0); gL.add(splitB);
      const mir1 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.6, 1.0), M(0xaab3c4, { metalness: 0.9, roughness: 0.2 })), mir2 = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.6, 0.12), M(0xaab3c4, { metalness: 0.9, roughness: 0.2 })); gL.add(mir1, mir2);
      const detD = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.25, 28), M(0x2a1215, { roughness: 0.4 })); detD.position.set(0, 0.12, 3.0); gL.add(detD);
      const bm = (col, r) => new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1, 8), new THREE.MeshBasicMaterial({ color: col, transparent: true }));
      const beams = { in: bm(0xe2464b, 0.04), a1: bm(0xe2464b, 0.04), a1b: bm(0xff9a3c, 0.04), a2: bm(0xe2464b, 0.04), a2b: bm(0xff9a3c, 0.04), out: bm(0xff6a6a, 0.07) };
      Object.values(beams).forEach((b) => { b.y0 = 0.28; gL.add(b); });
      const setBeam = (b, p, q, y) => { const d = new V3().subVectors(q, p), len = d.length(); b.position.copy(p).addScaledVector(d, 0.5); b.position.y = y; b.scale.set(1, Math.max(0.001, len), 1); b.quaternion.setFromUnitVectors(new V3(0, 1, 0), d.normalize()); };
      const dlM = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1, 6), new THREE.MeshBasicMaterial({ color: 0x14a058 })); gL.add(dlM);
      const lL = { laser: label('레이저', laserB, { color: '#4b5878', size: 12 }), sp: label('빛 가르개', splitB, { color: '#36556f', size: 12 }), m1: label('거울 1', mir1, { color: '#475569', size: 12 }), m2: label('거울 2', mir2, { color: '#475569', size: 12 }), det: label('', detD, { color: '#26324a', size: 12 }), dl: label('', [0, 0, 0], { color: '#14a058', size: 12 }), a1: label('팔 1', [0, 0, 0], { color: '#5d6879', size: 11 }) };
      labL.push(...Object.values(lL));
      const photons = [0, 1, 2, 3].map(() => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), new THREE.MeshBasicMaterial({ color: 0xfff1a0 })); gL.add(m); return m; });
      const demoG = { p: 0, on: false };
      function ligo(A, S, t) {
        const tc = S.tc, arm = demoG.on ? 600 * demoG.p : tc.arm, dx = arm * 0.0025, L0 = 3.2, L1 = 2.5;
        const I = A.ligoI(arm), mx = L0 + dx;
        mir1.position.set(mx + 0.05, 0.3, 0); mir2.position.set(0, 0.3, -L1 - 0.05);
        setBeam(beams.in, new V3(-3.1, 0, 0), new V3(0, 0, 0), 0.28);
        setBeam(beams.a1, new V3(0, 0, -0.07), new V3(mx, 0, -0.07), 0.28); setBeam(beams.a1b, new V3(mx, 0, 0.07), new V3(0, 0, 0.07), 0.28);
        setBeam(beams.a2, new V3(-0.07, 0, 0), new V3(-0.07, 0, -L1), 0.28); setBeam(beams.a2b, new V3(0.07, 0, -L1), new V3(0.07, 0, 0), 0.28);
        setBeam(beams.out, new V3(0, 0, 0), new V3(0, 0, 2.5), 0.28); beams.out.material.opacity = 0.3 + 0.7 * I;
        detD.material.color.copy(new THREE.Color(0x2a1215).lerp(new THREE.Color(0xff6a6a), I)); detD.material.emissive.copy(new THREE.Color(0xff3a3a)).multiplyScalar(0.8 * I);
        lL.det.set('검출기 ' + Math.round(I * 100) + ' %'); lL.det.off = [0.9, 0.6, 0];
        dlM.visible = arm > 1; if (arm > 1) { dlM.position.set(L0 + dx / 2, 0.3, 0.9); dlM.scale.set(1, 1, 1); dlM.rotation.set(0, 0, Math.PI / 2); dlM.scale.y = Math.max(0.01, dx); } lL.dl.show(arm > 1); lL.dl.obj = [mx, 0.4, 1.2]; lL.dl.set('ΔL = ' + Math.round(demoG.on ? arm : tc.armT) + ' nm');
        lL.a1.obj = [L0 / 2, 0.2, 0.7];
        photons.forEach((m, i) => { const u = ((t * 0.5 + i / 4) % 1); if (u < 0.5) m.position.set(-3.1 + 3.1 * (u / 0.5), 0.28, 0); else { const q = (u - 0.5) / 0.5; m.position.set(0, 0.28, q * 2.5); } m.visible = true; m.scale.setScalar(0.5 + 0.8 * (u < 0.5 ? 1 : I)); });
        info('<b>🛰️ 마이컬슨 간섭계</b> (위에서 본 모습 · 거울 이동은 크게 과장했어요)<br>한쪽 팔 길이 변화 <b>' + Math.round(arm) + ' nm</b> · 왕복 경로차 ' + Math.round(2 * arm) + ' nm · 검출기 밝기 <b>' + Math.round(I * 100) + ' %</b><br>팔이 ΔL 늘어나면 왕복 경로차가 2ΔL! 레이저 파장 ' + A.LAM_LIGO + ' nm의 1/4인 266 nm만 늘어나도 반 파장이 되어 상쇄(어두움)돼요.<br><span style="opacity:.8">LIGO는 팔 길이가 4 km예요. 밝기 변화로 양성자보다 작은 길이 변화를 알아냈어요.</span>');
      }
      const TECHS = { coat: [gC, labC], soap: [gB, labB], phone: [gH, labH], ligo: [gL, labL] };
      let tPl = {};
      tPl.coat = controls.player({ duration: 8, loop: true, autoplay: false, label: '코팅 두껍게', phases: [[0, '코팅 없음'], [0.35, '약 100 nm → 상쇄'], [0.6, '더 두꺼워져요']], onFrame(p) { demoC.p = p; demoC.on = p > 0 || !!(tPl.coat && tPl.coat.playing); } });
      tPl.soap = controls.player({ duration: 8, loop: true, autoplay: false, label: '탐침 내리기', phases: [[0, '위쪽 (얇아요)'], [0.5, '가운데'], [0.85, '아래쪽 (두꺼워요)']], onFrame(p) { demoB.p = p; demoB.on = p > 0 || !!(tPl.soap && tPl.soap.playing); } });
      tPl.phone = controls.player({ duration: 8, loop: true, autoplay: false, label: '위상 돌리기', phases: [[0, '0° 보강'], [0.5, '180° 상쇄'], [0.9, '360°']], onFrame(p) { demoH.p = p; demoH.on = p > 0 || !!(tPl.phone && tPl.phone.playing); } });
      tPl.ligo = controls.player({ duration: 9, loop: true, autoplay: false, label: '팔 늘이기', phases: [[0, '밝음'], [0.22, '어두움 (266 nm)'], [0.44, '밝음 (532 nm)'], [0.55, '다시 어두워져요']], onFrame(p) { demoG.p = p; demoG.on = p > 0 || !!(tPl.ligo && tPl.ligo.playing); } });
      /* ================= 장면 · ▶ 재생 ================= */
      let plP = null;
      plP = controls.player({ duration: 10, loop: true, autoplay: false, label: '두 펄스 재생', phases: [[0, '다가와요'], [0.3, '겹쳐요'], [0.45, '지나가요']], onFrame(p) { demoP.p = p; demoP.on = p > 0 || !!(plP && plP.playing); } });
      { const rr = [...ctx.renderer.domElement.parentNode.parentNode.querySelectorAll('.v3-player')]; ['coat', 'soap', 'phone', 'ligo'].forEach((k, i) => { tPl[k].row = rr[i]; }); plP.row = rr[4]; }
      let cur = '';
      function setMode(S) {
        const mode = S.mode === 'wave' ? 'wave-' + S.wsub : S.mode === 'cond' ? 'slit' : S.mode === 'tech' ? 'tech-' + S.tc.sub : S.mode;
        if (mode === cur) return; cur = mode;
        Object.keys(TECHS).forEach((k) => { const on = mode === 'tech-' + k; TECHS[k][0].visible = on; TECHS[k][1].forEach((l) => l.show(on)); tPl[k].row.style.display = on ? '' : 'none'; if (!on) { tPl[k].pause(); tPl[k].set(0); } });
        gR.visible = mode === 'wave-ripple'; gP.visible = mode === 'wave-pulse'; gS.visible = mode === 'slit';
        [lSA, lSB, lDw, lDk, lBr].forEach((l) => l.show(mode === 'wave-ripple')); lSA.show(mode === 'wave-ripple'); lSB.show(mode === 'wave-ripple'); lDw.show(false); lDk.show(false); lBr.show(false);
        [lPA, lPB, lPS, lOv].forEach((l) => l.show(mode === 'wave-pulse'));
        [lLas, lPl, lScr, lP, lDx, lMA, lMB].forEach((l) => l.show(mode === 'slit'));
        plP.row.style.display = mode === 'wave-pulse' ? '' : 'none'; if (mode !== 'wave-pulse') { plP.pause(); plP.set(0); }
        if (mode === 'wave-ripple') Object.assign(orbit, { tx: 6, ty: 0, tz: 3.1, phi: 0.95, theta: 0.0, dist: 12 * KDX });
        else if (mode === 'wave-pulse') Object.assign(orbit, { tx: 6, ty: 0.2, tz: 0, phi: 1.1, theta: 0.0, dist: 12 * KDX });
        else if (mode === 'slit') Object.assign(orbit, { tx: 1.6, ty: 0.3, tz: 0, phi: 1.0, theta: -0.8, dist: 12 * KDX });
        else if (mode === 'tech-coat') Object.assign(orbit, { tx: 1.6, ty: 1.6, tz: 0, phi: 1.5, theta: 0.0, dist: 13 * KDX });
        else if (mode === 'tech-soap') Object.assign(orbit, { tx: 0.8, ty: 2.3, tz: 0, phi: 1.45, theta: 0.0, dist: 11 * KDX });
        else if (mode === 'tech-phone') Object.assign(orbit, { tx: 1.2, ty: 1.9, tz: 0, phi: 1.5, theta: 0.0, dist: 14 * KDX });
        else if (mode === 'tech-ligo') Object.assign(orbit, { tx: 0, ty: 0, tz: 0.4, phi: 0.65, theta: 0.0, dist: 11 * KDX });
      }
      return {
        update(dt) {
          const A = sim(); if (!A || !A.S) return; const S = A.S;
          setMode(S);
          if (S.mode === 'tech') { const k = S.tc.sub, pl = tPl[k], dd = { coat: demoC, soap: demoB, phone: demoH, ligo: demoG }[k]; if (!pl.playing && pl.p === 0) dd.on = false; if (k === 'coat') coat(A, S, S.t); else if (k === 'soap') soap(A, S); else if (k === 'phone') phone(A, S, S.t); else ligo(A, S, S.t); return; }
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
