/* hm-string-wave · 3D 현의 정상파
   2D 실험(window.__sim)의 줄을 그대로 입체로 보여 줘요: 〰 정상파(진동수를 올리며 공명 찾기 · 입사파 + 반사파) · 📏 파장 조건(L = nλ/2) · 🎵 진동수(길이 · 장력 · 굵기) · 🎸 현악기(프렛 · 자연 배음).
   구동되는 줄은 2D와 같은 식으로 계산해요 (세로 눈금은 확대했어요). 값은 옆 조작판이 정하고 3D는 따라가요. */
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
  window.SciSim3D.attach({
    title: '현의 정상파 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대 · 값은 옆 조작판에서 바꿔요',
    camera: { dist: 11 * KD, theta: 0.35, phi: 1.2, min: 5, max: 28, target: [0, 0, 0] },
    autoRotate: 0,
    levels: [0, 1, 2, 3],
    build(ctx) {
      const { THREE, root, label, info, controls, orbit } = ctx;
      const { V3, M, tube } = tools(THREE);
      const sim = () => ctx.lesson();
      const LU = 8, NP = 100, YU = 0.12, m4 = new THREE.Matrix4();
      const mkStr = (col, r) => { const im = new THREE.InstancedMesh(new THREE.SphereGeometry(r || 0.075, 12, 8), M(col, { roughness: 0.35, emissive: col, emissiveIntensity: 0.3 }), NP + 1); im.frustumCulled = false; root.add(im); return im; };
      const sTot = mkStr(0xffd34d, 0.08), sInc = mkStr(0xff8a65, 0.055), sRef = mkStr(0x6ab0ff, 0.055);
      const ctex = (w, h, draw, rx, ry) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; if (rx) t.repeat.set(rx, ry || rx); if ('encoding' in t) t.encoding = THREE.sRGBEncoding; t.anisotropy = 4; return t; };
      const rnd = (() => { let s = 5; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
      /* 실험대 · 뒤판(눈금) */
      const woodTex = ctex(256, 128, (g, w, h) => { g.fillStyle = '#9a6a38'; g.fillRect(0, 0, w, h); for (let i = 0; i < 70; i++) { g.strokeStyle = 'rgba(60,30,10,' + (0.2 + rnd() * 0.35) + ')'; g.lineWidth = 1 + rnd() * 2; g.beginPath(); const y = rnd() * h; g.moveTo(0, y); g.bezierCurveTo(w * 0.3, y + (rnd() - 0.5) * 8, w * 0.6, y + (rnd() - 0.5) * 8, w, y + (rnd() - 0.5) * 6); g.stroke(); } }, 3, 1);
      const bench = new THREE.Mesh(new THREE.BoxGeometry(15, 0.5, 5), M(0xffffff, { map: woodTex, roughness: 0.65, metalness: 0 })); bench.position.set(0, -1.12, 0.9); bench.receiveShadow = true; root.add(bench);
      const benchEdge = new THREE.Mesh(new THREE.BoxGeometry(15.1, 0.08, 5.1), M(0x5b3a1c, { roughness: 0.7 })); benchEdge.position.set(0, -0.9, 0.9); root.add(benchEdge);
      const boardTex = ctex(512, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#3b5185'); gr.addColorStop(1, '#2a3c68'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(180,200,240,.16)'; g.lineWidth = 1; for (let x = 0; x <= w; x += w / 14) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } for (let y = 0; y <= h; y += h / 7) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); } g.strokeStyle = 'rgba(255,255,255,.35)'; g.setLineDash([6, 6]); g.beginPath(); g.moveTo(0, h / 2); g.lineTo(w, h / 2); g.stroke(); }, 1, 1);
      const board = new THREE.Mesh(new THREE.BoxGeometry(13, 6.6, 0.12), M(0xffffff, { map: boardTex, roughness: 0.7, metalness: 0.05 })); board.position.set(0, 0.4, -1.6); board.receiveShadow = true; root.add(board);
      const frame = new THREE.Mesh(new THREE.BoxGeometry(13.3, 6.9, 0.1), M(0x6b7280, { metalness: 0.7, roughness: 0.35 })); frame.position.set(0, 0.4, -1.68); root.add(frame);
      const neck = new THREE.Group(); neck.visible = false; root.add(neck);
      { const nb = new THREE.Mesh(new THREE.BoxGeometry(LU, 0.6, 0.18), M(0xffffff, { map: woodTex, roughness: 0.5 })); nb.position.set(0, -0.55, -0.35); neck.add(nb); for (let i = 1; i <= 12; i++) { const x = -LU / 2 + LU * (1 - Math.pow(2, -i / 12)); const fr = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.62, 0.2), M(0xe5e7eb, { metalness: 0.9, roughness: 0.25 })); fr.position.set(x, -0.55, -0.34); neck.add(fr); } [3, 5, 7, 9].forEach((i) => { const x = -LU / 2 + LU * (1 - Math.pow(2, -(i - 0.5) / 12)); const d = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.02, 14), M(0xf8fafc)); d.rotation.x = Math.PI / 2; d.position.set(x, -0.55, -0.24); neck.add(d); }); }
      const post = (x) => { const g = new THREE.Group(); const st = M(0xcbd5e1, { metalness: 0.85, roughness: 0.28 }); const bs = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.08, 0.9), M(0x334155, { metalness: 0.6, roughness: 0.4 })); bs.position.y = -0.76; const rd = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 1.5, 16), st); rd.position.y = -0.02; const cl = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.22, 0.34), M(0x1e293b, { metalness: 0.6, roughness: 0.4 })); cl.position.y = 0.1; const kn = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.14, 14), M(0xef4444, { roughness: 0.4 })); kn.rotation.x = Math.PI / 2; kn.position.set(0, 0.1, 0.22); g.add(bs, rd, cl, kn); [bs, rd, cl].forEach((m) => (m.castShadow = true)); g.position.set(x, 0, 0); root.add(g); return g; };
      const pL = post(-LU / 2 - 0.1), pR = post(LU / 2 + 0.1);
      const gen = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.9, 0.9), M(0x374151, { metalness: 0.6, roughness: 0.4 })); root.add(gen); { const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.12, 0.12, 24), M(0x0f172a, { roughness: 0.8 })); cone.rotation.z = Math.PI / 2; cone.position.x = -0.34; gen.add(cone); const rim = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.03, 8, 28), M(0xcbd5e1, { metalness: 0.9 })); rim.rotation.y = Math.PI / 2; rim.position.x = -0.4; gen.add(rim); const led = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), new THREE.MeshBasicMaterial({ color: 0x4ade80 })); led.position.set(0.2, 0.36, 0.46); gen.add(led); }
      const nodeM = [], antiM = [];
      for (let i = 0; i < 7; i++) { const nd = new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 12), M(0xef4444, { emissive: 0x7f1d1d })); root.add(nd); nodeM.push(nd); const an = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 12), new THREE.MeshBasicMaterial({ color: 0x4ade80, transparent: true, opacity: 0.7 })); root.add(an); antiM.push(an); }
      const fret = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.2, 0.5), M(0xffe58a, { emissive: 0x7a6200 })); root.add(fret);
      const lN = label('마디', nodeM[1], { color: '#dc2626', size: 12 }), lA = label('배', antiM[0], { color: '#15803d', size: 12 }), lGen = label('진동 발생기', gen, { color: '#475569', size: 12 }), lFr = label('프렛(줄을 누른 곳)', fret, { color: '#a16207', size: 12 }), lTop = label('', [0, 2.6, 0], { color: '#26324a', size: 13 });
      const lI = label('→ 입사파', [-2.6, 2.4, 0], { color: '#e8590c', size: 12 }), lR = label('← 반사파', [2.6, -2.4, 0], { color: '#2563eb', size: 12 });
      const demo = { p: 0, on: false }; let pl = null, last = '';
      function stand(n, Lw, x0, A, fq) { // 정상파 모양 y = A sin(nπx/L) cos(wt)
        const w = fq * 6.283; return (xx, t) => A * Math.sin(n * Math.PI * (xx - x0) / Lw) * Math.cos(w * t);
      }
      function nodes(n, x0, Lw, show) { for (let i = 0; i < 7; i++) { nodeM[i].visible = show && i <= n; antiM[i].visible = show && i < n; if (i <= n) nodeM[i].position.set(x0 + Lw * i / n, 0, 0); if (i < n) antiM[i].position.set(x0 + Lw * (i + 0.5) / n, 0, 0); } lN.show(show && n >= 1); lA.show(show && n >= 1); lN.obj = nodeM[Math.min(1, n)]; lA.obj = antiM[0]; lN.off = [0, -0.45, 0]; lA.off = [0, 0.4, 0]; }
      const NOTE = '';
      const FS = { f: 0 };
      function scene(A, S, tm) {
        const mode = S.mode; let txt = '';
        neck.visible = false; fret.visible = false; lFr.show(false); lI.show(false); lR.show(false); lGen.show(false); gen.visible = false; sInc.visible = sRef.visible = false;
        pL.position.x = -LU / 2 - 0.1; pR.position.x = LU / 2 + 0.1; pR.visible = true;
        const set = (im, fn) => { for (let i = 0; i <= NP; i++) { const xx = -LU / 2 + LU * i / NP, y = fn(xx, i / NP); m4.makeTranslation(xx, y, 0); im.setMatrixAt(i, m4); } im.instanceMatrix.needsUpdate = true; };
        if (mode === 'drive') {
          const d = S.dr; let f = d.fe || d.f; if (demo.on && !d.sweep) f = demo.p * 700; const F = A.strField_(Math.max(0.5, f)), wt = tm * 6.283 * A.WVIS;
          // 줄의 끝(x=0)에 발생기, x = L0 쪽이 고정 끝 (2D와 같은 식: s = L0 − x)
          set(sTot, (xx) => A.strAt(F, A.L0 - (xx + LU / 2) / LU * A.L0, wt).tot * YU * 1.0);
          const parts = d.parts; sInc.visible = sRef.visible = parts; if (parts) { set(sInc, (xx) => A.strAt(F, A.L0 - (xx + LU / 2) / LU * A.L0, wt).inc * YU * 1.0 + 2.6); set(sRef, (xx) => A.strAt(F, A.L0 - (xx + LU / 2) / LU * A.L0, wt).ref * YU * 1.0 - 2.6); lI.show(true); lR.show(true); lI.obj = [-2.6, 3.0, 0]; lR.obj = [2.6, -3.0, 0]; }
          gen.visible = true; gen.position.set(LU / 2 + 0.45, (A.strAt(F, 0, wt).tot) * YU, 0); pR.position.x = 100; pR.visible = false; lGen.show(true); lGen.off = [0, 0.8, 0];
          const nn = Math.round(f / A.FNR(1)), res = Math.abs(f - A.FNR(nn)) < 6 && nn >= 1; nodes(res ? nn : 0, -LU / 2, LU, res);
          txt = '<b>〰 정상파: 고정된 줄의 공명</b> · 구동 진동수 f = <b>' + Math.round(f) + ' Hz</b><br>' + (res ? '줄이 크게 떨려요 (공명): 배 ' + nn + '개 · 마디 ' + (nn + 1) + '개 (양 끝 포함).' : '이 진동수에서는 줄이 조금만 떨려요. 진동수를 천천히 올리며 크게 떨리는 진동수를 찾아요.') + '<br>정상파 = 입사파(주황) + 반사파(파랑)의 합(노랑). 마디에서는 두 파동이 늘 상쇄돼요.<br><span style="opacity:.8">진동수는 옆 조작판에서 올려요 (▶ 아래 재생도 가능).</span>';
        } else if (mode === 'lam') {
          const l = S.lam, Lw = LU * l.L / 500, x0 = -Lw / 2; pL.position.x = x0 - 0.1; pR.position.x = x0 + Lw + 0.1;
          const fn = stand(l.n, Lw, x0, 1.2, 0.5), t = tm; set(sTot, (xx) => (xx < x0 || xx > x0 + Lw ? 0 : fn(xx, t)) );
          nodes(l.n, x0, Lw, true); lTop.show(false);
          txt = '<b>📏 파장 조건: L = nλ/2</b> · 줄의 길이 L = ' + (l.L / 1000).toFixed(3) + ' m · n = ' + l.n + ' (마디 ' + (l.n + 1) + '개)<br>마디와 마디 사이는 반 파장(λ/2)이므로 L = n × λ/2 이고, 파장은 λ = 2L/n 이에요.' + (l.show ? '<br>지금 파장 λ = ' + (2 * l.L / l.n).toFixed(0) + ' mm' : '') + '<br><span style="opacity:.8">n과 길이는 옆 조작판에서 바꿔요.</span>';
        } else if (mode === 'freq') {
          const q = S.fq, Lw = LU * q.L / 500, x0 = -Lw / 2; pL.position.x = x0 - 0.1; pR.position.x = x0 + Lw + 0.1;
          const f1 = A.f1Of(q.L / 1000, q.T, q.mu), fn = stand(1, Lw, x0, 1.3, 0.35 + 0.5 * Math.log2(Math.max(1, f1 / 100)) * 0.6), t = tm; set(sTot, (xx) => (xx < x0 || xx > x0 + Lw ? 0 : fn(xx, t))); nodes(1, x0, Lw, true);
          txt = '<b>🎵 진동수: f = nv/2L</b> · 길이 L = ' + (q.L / 1000).toFixed(3) + ' m · 장력 T = ' + q.T + ' N · 단위 길이당 질량 μ = ' + q.mu + ' g/m<br>줄이 짧을수록 · 장력이 클수록 · 가늘수록(μ 작을수록) 진동수(음의 높이)가 커져요. 하나씩만 바꿔 비교해요 (진동 속도는 느리게 보여요).' + (q.hide ? '' : '<br>기본 진동수 f₁ = ' + f1.toFixed(0) + ' Hz');
        } else {
          const s = S.ins, ratio = A.insF1open() / (A.insF() / (s.harm ? 2 : 1)) , Lw = LU, x0 = -LU / 2; const leff = Math.max(0.15, Math.min(1, 1 / (A.insF() / (s.harm ? 2 : 1) / A.insF1open())));
          const n = s.harm ? 2 : 1, x1 = x0 + Lw * (1 - leff); neck.visible = true; fret.visible = leff < 0.999; fret.position.set(x1, 0, 0.1); lFr.show(fret.visible); lFr.off = [0, 0.9, 0];
          const fn = stand(n, Lw * leff, x1, 1.2, 0.8), t = tm; set(sTot, (xx) => (xx < x1 ? 0 : fn(xx, t))); nodes(n, x1, Lw * leff, true); void ratio;
          txt = '<b>🎸 기타 1번 줄 (E4)</b> · 장력과 프렛 위치 · ' + (s.harm ? '자연 배음 (줄 가운데를 살짝 건드려요)' : '프렛으로 줄을 짧게 눌러요') + '<br>진동하는 줄의 길이가 짧을수록 높은 음이 나요: 진동수 ' + A.insF().toFixed(0) + ' Hz' + (s.harm ? ' (기본음의 2배, 한 옥타브 위)' : '') + '<br><span style="opacity:.8">장력 · 프렛 · 배음은 옆 조작판에서 바꿔요.</span>';
        }
        if (txt !== last) { last = txt; info(txt); }
      }
      pl = controls.player({ duration: 12, loop: true, autoplay: false, label: '진동수 올리기', phases: [[0, '0 Hz에서 천천히 올려요'], [0.28, '첫 공명 근처 (200 Hz)'], [0.57, '둘째 공명 근처 (400 Hz)'], [0.86, '셋째 공명 근처 (600 Hz)']], onFrame(p) { demo.p = p; demo.on = p > 0 || !!(pl && pl.playing); } });
      pl.row = ctx.renderer.domElement.parentNode.parentNode.querySelector('.v3-player');
      let cur = '';
      return {
        update(dt, tm) {
          const A = sim(); if (!A || !A.S) return; const S = A.S;
          if (S.mode !== cur) { cur = S.mode; pl.row.style.display = cur === 'drive' ? '' : 'none'; if (cur !== 'drive') { pl.pause(); pl.set(0); } last = ''; lTop.show(false); Object.assign(orbit, { tx: 0, ty: 0, tz: 0, phi: 1.2, theta: 0.35, dist: (cur === 'drive' ? 12 : 11) * KD }); }
          if (!pl.playing && pl.p === 0) demo.on = false;
          scene(A, S, tm);
        },
        sync() {},
      };
    },
  });
})();
