/* hb-neuron-conduction · 3D 흥분의 전도
   2D 차시와 같은 두 장면을 입체로: ① 국소 전류 — 축삭 7구간(구간 1 = 가지 돌기 쪽, 구간 7 = 축삭 말단 쪽)이 분극 → 탈분극 → 재분극으로 차례로 흥분
   ② 말이집 전도 — 같은 길이의 무말이집 축삭(19곳)과 말이집 축삭(랑비에 결절 4곳)의 경주 (정상 · 일부 손상 · 심하게 손상)
   막전위 색(−70 mV 파랑 → +30 mV 빨강)과 시간(ms)은 2D의 활동 전위 곡선 AP(τ)를 그대로 써요. 2D의 자극·출발·말이집 상태 단추가 3D를 움직여요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const narrow = window.innerWidth < 600 || window.innerHeight > window.innerWidth * 1.1;
  const L2 = () => window.__sim || null;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

  window.SciSim3D.attach({
    title: '말이집 전도 3D',
    hint: '🏁 출발 · 말이집 상태 단추로 모형이 움직여요 · 드래그: 돌리기',
    camera: { dist: narrow ? 21 : 13.5, theta: narrow ? 0.8 : 0.2,   // 휴대폰: 긴 축삭을 비스듬히 봐서 크게
      phi: 1.15, min: 6, max: 28, target: [0, 0, 0] },
    autoRotate: 0,
    levels: [1],
    build(ctx) {
      const { THREE, root, label, info, controls, renderer } = ctx;
      /* 경주 기록 막대 그래프: 2D 아래쪽의 기록 막대를 3D 화면에도 보여 줘요 (2D 기록 그대로) */
      if (!document.getElementById('nc3d-rec')) { const st2 = document.createElement('style'); st2.id = 'nc3d-rec'; st2.textContent =
        '.nc-rec{position:absolute;right:10px;top:10px;width:min(250px,42%);padding:7px 9px;border-radius:12px;background:rgba(8,12,24,.76);color:#fff;font-size:12px;font-weight:700;pointer-events:none}.nc-rec .h{font-weight:900;margin-bottom:4px}.nc-rec .r{display:grid;grid-template-columns:76px 1fr auto;gap:5px;align-items:center;margin:3px 0}.nc-rec .b{height:9px;border-radius:5px;background:#2a3346;overflow:hidden}.nc-rec .b i{display:block;height:100%}.nc-rec .v{color:#c9d3e6;min-width:44px;text-align:right}' +
        '@media (max-width:599px){.nc-rec{top:auto;bottom:30px;right:8px;width:56%;font-size:10.5px;padding:4px 6px}.nc-rec .r{grid-template-columns:64px 1fr auto;margin:2px 0}}';
        document.head.appendChild(st2); }
      const recEl = document.createElement('div'); recEl.className = 'nc-rec'; recEl.style.display = 'none'; renderer.domElement.parentElement.appendChild(recEl);
      let recSig = null;
      function drawRec() {
        const L = window.__sim, S = L && L.S; if (!S || S.mode !== 'myelin' || !S.mc) { if (recSig !== null) { recSig = null; recEl.style.display = 'none'; } return; }
        const R = S.mc.rec || {}, sig = JSON.stringify(R); if (sig === recSig) return; recSig = sig; recEl.style.display = '';
        const rows = [['un', '무말이집', '#f59e0b'], ['my0', '말이집 정상', '#22c55e'], ['my1', '일부 손상', '#38bdf8'], ['my2', '심한 손상', '#f87171']];
        recEl.innerHTML = '<div class="h">📊 경주 기록 (같은 길이)</div>' + rows.map(([k, n, c]) => { const v = R[k], num = typeof v === 'number'; return '<div class="r"><span>' + n + '</span><span class="b"><i style="width:' + (num ? Math.min(100, v / 30 * 100) : v === 'block' ? 100 : 0) + '%;background:' + (v === 'block' ? 'repeating-linear-gradient(45deg,#f87171 0 4px,transparent 4px 8px)' : c) + '"></i></span><span class="v">' + (num ? v.toFixed(1) + ' ms' : v === 'block' ? '끊김' : '—') + '</span></div>'; }).join('');
      }
      const V3 = (x, y, z) => new THREE.Vector3(x, y, z || 0);
      const std = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.45, metalness: 0.03 }, o || {}));
      const tube = (pts, r, m, seg) => new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), seg || 40, r, 10), m);
      const cB = new THREE.Color(0x3b6fe0), cM = new THREE.Color(0xfff2c2), cR = new THREE.Color(0xe5483f), tmpC = new THREE.Color();
      const vCol = (v) => { const t = clamp((v + 80) / 110, 0, 1); return t < 0.45 ? tmpC.copy(cB).lerp(cM, t / 0.45) : tmpC.copy(cM).lerp(cR, (t - 0.45) / 0.55); };
      const LS = L2(); if (!LS) return {};
      const AP = LS.AP, NSEG = LS.NSEG, NS = LS.NS, NODES = LS.NODES, DELTA = LS.DELTA;

      /* 신경 세포 앞쪽(가지 돌기 · 세포체)과 뒤쪽(축삭 말단) */
      function ends(g, x0, x1, z) {
        const somaM = std(0x9a7fe0, { roughness: 0.4 });
        const soma = new THREE.Mesh(new THREE.SphereGeometry(0.62, 32, 22), somaM); soma.position.set(x0 - 1.0, 0, 0); g.add(soma);
        const nuc = new THREE.Mesh(new THREE.SphereGeometry(0.26, 20, 14), std(0x4b2a96)); nuc.position.set(x0 - 1.05, 0.05, 0.25); g.add(nuc);
        const dm = std(0xb59cf0, { roughness: 0.45 });
        [[-0.9, 0.7, 0.2], [-1.0, -0.2, 0.7], [-0.8, -0.8, -0.3], [-0.9, 0.3, -0.7]].forEach((q, i) => g.add(tube([V3(x0 - 1.3, 0.1 * i - 0.1, 0), V3(x0 - 1.7 + q[0] * 0.3, q[1] * 0.6, q[2] * 0.6), V3(x0 - 1.4 + q[0], q[1], q[2])], 0.07, dm, 16)));
        const hill = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.8, 20), somaM); hill.rotation.z = -Math.PI / 2; hill.position.x = x0 - 0.35; g.add(hill);
        const tm = std(0xf2b24a, { roughness: 0.4 }), tips = [];
        [[0.55, 0.65, 0.2], [0.75, 0.0, -0.1], [0.55, -0.65, 0.3]].forEach((q) => { g.add(tube([V3(x1, 0, 0), V3(x1 + 0.2, q[1] * 0.5, q[2] * 0.5), V3(x1 + q[0] + 0.2, q[1], q[2])], 0.07, tm, 12)); const b = new THREE.Mesh(new THREE.SphereGeometry(0.14, 14, 10), std(0xf2b24a)); b.position.set(x1 + q[0] + 0.2, q[1], q[2]); g.add(b); tips.push(b); });
        g.position.z = z || 0; return { soma, tips };
      }

      /* ① 국소 전류 : 축삭 7구간 */
      const LG = new THREE.Group(); root.add(LG);
      const SW = 1.3, X0 = -((NSEG - 1) * SW) / 2;
      const segMesh = [], segMat = [];
      for (let i = 0; i < NSEG; i++) {
        const m = std(0x3b6fe0, { roughness: 0.35 }); const c = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, SW - 0.06, 28), m); c.rotation.z = Math.PI / 2; c.position.x = X0 + i * SW; LG.add(c); segMesh.push(c); segMat.push(m);
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.02, 8, 28), std(0x24324f)); ring.rotation.y = Math.PI / 2; ring.position.x = X0 + (i + 0.5) * SW; if (i < NSEG - 1) LG.add(ring);
      }
      const cdEnds = ends(LG, X0 - SW / 2 + 0.2, X0 + (NSEG - 0.5) * SW, 0);
      const arrows = []; for (let i = 0; i < NSEG - 1; i++) { const a = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.3, 10), new THREE.MeshBasicMaterial({ color: 0xffb020 })); a.rotation.z = -Math.PI / 2; a.position.set(X0 + (i + 0.5) * SW, 0.62, 0); LG.add(a); arrows.push(a); }
      const rfx = []; for (let i = 0; i < NSEG; i++) { const x = new THREE.Mesh(new THREE.OctahedronGeometry(0.14, 0), new THREE.MeshBasicMaterial({ color: 0x24324f })); x.position.set(X0 + i * SW, 0.62, 0); LG.add(x); rfx.push(x); }
      const lg = { s: [], dend: label('가지 돌기 쪽 (구간 1)', LG, { offset: [X0 - 1.6, 1.3, 0] }), end: label('축삭 말단 쪽 (구간 7)', LG, { offset: [-X0 + 1.3, 1.3, 0] }), cur: label('국소 전류', arrows[2], { offset: [0, 0.5, 0], color: 'rgba(245,158,11,.95)' }) };
      for (let i = 0; i < NSEG; i++) { const l = label('구간 ' + (i + 1), segMesh[i], { offset: [0, -0.75, 0], size: 12 }); lg.s.push(l); }
      const lstate = label('', LG, { offset: [0, -1.9, 0], size: 14, color: 'rgba(124,58,237,.92)' });

      /* ② 말이집 경주 */
      const RG = new THREE.Group(); root.add(RG);
      const RX0 = -5.0, RX1 = 5.0, SP = (RX1 - RX0) / (NS - 1), ZU = 1.7, ZM = -1.7;
      const uMat = [], uMesh = [];
      for (let k = 0; k < NS; k++) { const m = std(0x3b6fe0, { roughness: 0.35 }); const c = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, SP - 0.02, 20), m); c.rotation.z = Math.PI / 2; c.position.set(RX0 + k * SP, 0, ZU); RG.add(c); uMat.push(m); uMesh.push(c); }
      const unE = ends(new THREE.Group(), RX0, RX1, 0); // 쓰지 않음 (이름표 위치용)
      const gU = new THREE.Group(); RG.add(gU); const eU = ends(gU, RX0 - SP / 2, RX1 + SP / 2, ZU); gU.position.z = 0;
      const mx = (k) => RX0 + k * SP;
      const axM = std(0x7fd0c8, { roughness: 0.4 }); const axon = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, RX1 - RX0 + SP, 18), axM); axon.rotation.z = Math.PI / 2; axon.position.set((RX0 + RX1) / 2, 0, ZM); RG.add(axon);
      const gM = new THREE.Group(); RG.add(gM); const eM = ends(gM, RX0 - SP / 2, RX1 + SP / 2, ZM);
      const sheaths = [], nodeMat = [];
      for (let j = 0; j < 3; j++) { const xa = mx(NODES[j]) + SP * 0.45, xb = mx(NODES[j + 1]) - SP * 0.45; const m = std(0xf6cf6b, { roughness: 0.35, transparent: true, opacity: 0.85 }); const s = new THREE.Mesh(new THREE.CapsuleGeometry(0.34, xb - xa - 0.68, 8, 24), m); s.rotation.z = Math.PI / 2; s.position.set((xa + xb) / 2, 0, ZM); RG.add(s); sheaths.push([s, m]); }
      for (let j = 0; j < 4; j++) { const m = std(0x3b6fe0, { roughness: 0.3, emissive: 0x000000 }); const n = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, SP * 0.9, 22), m); n.rotation.z = Math.PI / 2; n.position.set(mx(NODES[j]), 0, ZM); RG.add(n); nodeMat.push(m); }
      const glows = []; for (let k = 0; k < NS; k++) { const g = new THREE.Mesh(new THREE.SphereGeometry(0.34, 14, 10), new THREE.MeshBasicMaterial({ color: 0xffd447, transparent: true, opacity: 0, depthWrite: false })); g.position.set(mx(k), 0, ZU); RG.add(g); glows.push(g); }
      const ngl = []; for (let j = 0; j < 4; j++) { const g = new THREE.Mesh(new THREE.SphereGeometry(0.4, 14, 10), new THREE.MeshBasicMaterial({ color: 0xffd447, transparent: true, opacity: 0, depthWrite: false })); g.position.set(mx(NODES[j]), 0, ZM); RG.add(g); ngl.push(g); }
      const lr = {
        u: label('무말이집 축삭', gU, { offset: [-1.0, 1.1, ZU], color: 'rgba(49,130,246,.92)' }), m: label('말이집 축삭 (랑비에 결절 4곳)', gM, { offset: [-1.0, 1.1, ZM], color: 'rgba(49,130,246,.92)' }),
        sh: label('말이집', sheaths[0][0], { offset: [0, 0.65, 0.1] }), nd: label('랑비에 결절', nodeMat.length ? RG : RG, { offset: [mx(NODES[1]), -0.65, ZM] }),
        tu: label('', RG, { offset: [RX1 + 1.8, -0.7, ZU], color: 'rgba(30,150,80,.95)' }), tm: label('', RG, { offset: [RX1 + 1.8, -0.7, ZM], color: 'rgba(30,150,80,.95)' }),
      };

      /* 재생 (한 번의 신호 전체를 천천히 보여 줘요) */
      let pt = 0, scene = '', lastInfo = '';
      const T_LOCAL = 6 * DELTA + 6 + 1, T_RACE = 34;
      const pl = controls.player({
        duration: 9, loop: true, autoplay: false, label: '신호 전달',
        phases: [[0, '자극'], [0.15, '전달 중'], [0.8, '끝']],
        onFrame(p) { pt = p; },
      });
      const sceneOf = () => { const L = L2(); const m = L ? L.S.mode : 'local'; return m === 'myelin' ? 'race' : 'local'; };
      function setScene(sc) {
        scene = sc; LG.visible = sc === 'local'; RG.visible = sc === 'race'; lastInfo = '';
        lg.s.forEach((l) => l.show(sc === 'local')); [lg.dend, lg.end, lg.cur, lstate].forEach((l) => l.show(sc === 'local')); Object.values(lr).forEach((l) => l.show(sc === 'race')); lr.tu.show(false); lr.tm.show(false);
      }
      const setI = (h) => { if (h !== lastInfo) { lastInfo = h; info(h); } };
      /* 2D 단추 따라 하기 */
      const clickDom = (sel) => { const b = document.querySelector(sel); if (b) b.click(); };
      // 3D 단계는 말이집 전도(2단계) 경주예요: 🏁 출발 · 말이집 상태 (국소 전류 단계는 2D)
      controls.button('🏁 출발', () => { const L = L2(); if (!L) return; if (L.S.mode === 'myelin') clickDom('#bRace'); else clickDom('#bStimCd'); });
      controls.segment('말이집', [{ label: '정상', value: 0 }, { label: '일부 손상', value: 1 }, { label: '심하게 손상', value: 2 }], 0, (v) => clickDom('#dmgSeg button[data-d="' + v + '"]'));
      const playing = () => pl.playing || pl.p > 0;
      const NAMES = { pol: '분극', dep: '탈분극', rep: '재분극' };

      return {
        update(dt, t) {
          drawRec();
          const L = L2(); if (!L) return; const sc = sceneOf(); if (sc !== scene) setScene(sc);
          if (sc === 'local') {
            const cd = L.S.cd; let vs = [];
            if (playing()) { const tm = pt * T_LOCAL; for (let i = 0; i < NSEG; i++) { const tau = tm - i * DELTA; vs.push(tau > 0 && tau < 6 ? AP(tau) : -70); } }
            else for (let i = 0; i < NSEG; i++) { const s = cd.seg[i]; vs.push(s.tau == null ? -70 : AP(s.tau)); }
            const sts = vs.map((v, i) => { const tau = playing() ? pt * T_LOCAL - i * DELTA : cd.seg[i].tau; return tau == null || tau <= 0 ? 'pol' : tau < 1.5 ? 'pol' : tau < 2 ? 'dep' : tau < 6 ? 'rep' : 'pol'; });
            vs.forEach((v, i) => { segMat[i].color.copy(vCol(v)); const on = v > -60; segMat[i].emissive.setHex(on ? 0x663300 : 0); segMat[i].emissiveIntensity = on ? clamp((v + 60) / 90, 0, 1) : 0; const tauI = playing() ? pt * T_LOCAL - i * DELTA : cd.seg[i].tau; rfx[i].visible = tauI != null && tauI > 2 && tauI < 6; });
            arrows.forEach((a, i) => { const act = vs[i] > -40 || vs[i + 1] > -40; a.visible = act; });
            lstate.set(sts.map((s, i) => '구간 ' + (i + 1) + ' ' + NAMES[s]).filter((x, i) => sts[i] !== 'pol').join(' · ') || '막전위 −70 mV (분극) — ⚡ 자극을 줘요');
            setI('<b>국소 전류</b>: 흥분한 구간(탈분극)의 (+)전하가 이웃 구간으로 흘러 이웃이 역치에 닿으면 활동 전위가 차례로 생겨요.<br>색 = 막전위 (파랑 −70 mV 분극 → 빨강 +30 mV 탈분극) · ✕ = 불응기<br>구간 1 = 가지 돌기 쪽 → 구간 7 = 축삭 말단 쪽' + (cd.frozen ? '<br>⏸ 포착한 장면이에요' : ''));
          } else {
            const mc = L.S.mc, dmg = mc.dmg; const st = L.S.mc.starts || { un: [], my: [] };
            const starts = (mc.run || mc.starts) ? mc.starts : null;
            let tm = playing() ? pt * T_RACE : (mc.run || mc.starts ? mc.t : 0);
            const S0 = playing() ? (function () { const un = [], my = []; for (let k = 0; k < NS; k++) un.push(DELTA * k); for (let j = 0; j < 4; j++) my.push(dmg === 2 && j >= 2 ? Infinity : DELTA * j + (dmg === 1 && j >= 2 ? 3 : 0)); return { un, my }; })() : (starts || L.S.mc.starts || (function () { const un = [], my = []; for (let k = 0; k < NS; k++) un.push(DELTA * k); for (let j = 0; j < 4; j++) my.push(dmg === 2 && j >= 2 ? Infinity : DELTA * j + (dmg === 1 && j >= 2 ? 3 : 0)); return { un, my }; })());
            const sv = (s) => { const tau = tm - s; return tau > 0 && tau < 6 ? AP(tau) : -70; };
            for (let k = 0; k < NS; k++) { const v = sv(S0.un[k]); uMat[k].color.copy(vCol(v)); glows[k].material.opacity = v > -30 ? 0.5 * clamp((v + 30) / 60, 0, 1) : 0; }
            for (let j = 0; j < 4; j++) { const v = isFinite(S0.my[j]) ? sv(S0.my[j]) : -70; nodeMat[j].color.copy(vCol(v)); ngl[j].material.opacity = v > -30 ? 0.55 * clamp((v + 30) / 60, 0, 1) : 0; }
            sheaths.forEach(([s, m], j) => { const dm = dmg > 0 && j === 1; m.color.setHex(dm ? 0xd9c28a : 0xf6cf6b); m.opacity = dm ? 0.5 : 0.85; });
            const fU = S0.un[NS - 1] + DELTA, fM = S0.my[3] + DELTA, okM = isFinite(fM);
            const showT = tm > 0 && (mc.run || mc.starts || playing());
            lr.tu.show(showT && tm >= fU); lr.tu.set('도착 ' + fU.toFixed(1) + ' ms');
            lr.tm.show(showT && okM && tm >= fM); lr.tm.set(okM ? '도착 ' + fM.toFixed(1) + ' ms' : '');
            if (showT && !okM && tm > 16) { lr.tm.show(true); lr.tm.set('전도 차단 ✕'); }
            eU.tips.forEach((b) => { const on = tm >= fU && tm < fU + 1.5; b.material.emissive.setHex(on ? 0xffc933 : 0); b.material.emissiveIntensity = on ? 1 : 0; });
            eM.tips.forEach((b) => { const on = okM && tm >= fM && tm < fM + 1.5; b.material.emissive.setHex(on ? 0xffc933 : 0); b.material.emissiveIntensity = on ? 1 : 0; });
            setI('<b>말이집 상태: ' + ['정상', '일부 손상', '심하게 손상'][dmg] + '</b> · 경과 ' + Math.max(0, tm).toFixed(1) + ' ms<br>무말이집은 이웃으로 차례로, 말이집 축삭은 랑비에 결절에서 결절로 건너뛰며(도약 전도) 전도돼요.' + (dmg === 1 ? '<br>일부 손상: 손상된 구간 뒤로 신호가 늦어요.' : dmg === 2 ? '<br>심하게 손상: 신호가 손상 부위를 넘지 못하고 막혀요.' : '') + '<br>(1 ms를 느리게 보여 주고, 속도 차는 모형에서 줄여 보여 줘요)');
          }
        },
        sync() { scene = ''; },
      };
    },
  });
})();
