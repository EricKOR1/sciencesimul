/* hy-enzyme-mechanism · 3D 효소–기질 복합체
   효소의 활성 부위에 기질이 결합해 효소–기질 복합체(ES)가 되고, 생성물이 되어 떨어져 나가요.
   열쇠–자물쇠 모형(모양이 처음부터 꼭 맞음)과 유도 적합 모형(결합하면서 활성 부위가 기질에 맞게 변함)을 비교해요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const narrow = window.innerWidth < 600 || window.innerHeight > window.innerWidth * 1.1;
  const COL = { enz: 0x3b9ae8, site: 0x0c4a6e, subA: 0xfb7185, subB: 0xfacc15, near: 0xa78bfa, far: 0x34d399 };

  window.SciSim3D.attach({
    title: '효소–기질 복합체 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: narrow ? 14 : 11.5, theta: 0.25, phi: 1.05, target: [0, 0.6, 0], min: 6, max: 20 },
    autoRotate: 0,
    levels: [1],   // 1단계(활성화 에너지 그래프)는 2D 화면, 2단계 '복합체 형성'에서 3D로 시작
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const V = THREE.Vector3;
      let model = 'induced', sub = 'S';
      const std = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.4, metalness: 0.03 }, o || {}));

      /* ---------- 효소: 몸통 + 두 턱 (사이 홈이 활성 부위) ---------- */
      const enz = new THREE.Group(); root.add(enz);
      const enzMat = std(COL.enz, { roughness: 0.34 });
      const body = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), enzMat); body.scale.set(2.5, 1.35, 1.7); body.position.y = -0.9; enz.add(body);
      const jawL = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), enzMat), jawR = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), enzMat);
      [jawL, jawR].forEach((j) => { j.scale.set(0.95, 1.25, 1.45); enz.add(j); });
      // 군데군데 작은 혹 (단백질 표면 느낌)
      const bumpMat = std(0x7dd3fc, { roughness: 0.4 });
      [[-1.9, -0.5, 0.9, 0.45], [1.8, -0.8, 1.0, 0.5], [0.4, -1.8, 1.0, 0.5], [-0.9, -1.7, -1.0, 0.55], [1.5, -0.3, -1.1, 0.45], [-2.2, -1.1, -0.2, 0.4]].forEach((b) => {
        const m = new THREE.Mesh(new THREE.SphereGeometry(b[3], 24, 18), bumpMat); m.position.set(b[0], b[1], b[2]); enz.add(m);
      });
      // 활성 부위 바닥: 어두운 홈 + 기질 모양 틀(유령)
      const siteMat = std(COL.site, { roughness: 0.6, emissive: 0x082f49 });
      const pocket = new THREE.Mesh(new THREE.SphereGeometry(0.62, 28, 20), siteMat); pocket.scale.set(1.15, 0.12, 0.9); pocket.position.set(0, 0.43, 0); enz.add(pocket);
      const ghostMat = std(0xffffff, { transparent: true, opacity: 0.3, emissive: 0x7dd3fc, emissiveIntensity: 0.7, depthWrite: false });
      const ghost = new THREE.Group(); ghost.position.set(0, 0.7, 0); enz.add(ghost);
      [[-0.3, 0], [0.3, 0]].forEach((p) => { const g = new THREE.Mesh(new THREE.SphereGeometry(0.36, 20, 16), ghostMat); g.position.set(p[0], 0, 0); ghost.add(g); });
      const waterMat = std(0xe0f2fe, { transparent: true, opacity: 0.0 });
      let gap = 0.78, gapT = 0.78;                          // 두 턱 사이 절반 간격
      function placeJaws() {
        jawL.position.set(-(gap + 0.95 * 0.85), 0.6, 0); jawR.position.set(gap + 0.95 * 0.85, 0.6, 0);
        const lean = (gap - 0.5) * 0.25; jawL.rotation.z = lean; jawR.rotation.z = -lean;
      }
      placeJaws();

      /* ---------- 기질 · 생성물 ---------- */
      function makeSub(kind) {
        const g = new THREE.Group();
        if (kind === 'far') {
          const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.62, 1), std(COL.far, { roughness: 0.35 })); g.add(m);
          g.userData.parts = [m];
        } else {
          const ra = kind === 'near' ? 0.45 : 0.36, rb = kind === 'near' ? 0.27 : 0.36;
          const a = new THREE.Mesh(new THREE.SphereGeometry(ra, 28, 20), std(kind === 'near' ? 0xc4b5fd : COL.subA, { roughness: 0.3 }));
          const b = new THREE.Mesh(new THREE.SphereGeometry(rb, 28, 20), std(kind === 'near' ? 0x93c5fd : COL.subB, { roughness: 0.3 }));
          a.position.x = -0.3; b.position.x = 0.3; g.add(a, b);
          const bond = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.4, 14), std(0xe2e8f0)); bond.rotation.z = Math.PI / 2; g.add(bond);
          g.userData.parts = [a, b]; g.userData.bond = bond; g.userData.a = a; g.userData.b = b;
        }
        return g;
      }
      let subG = null, phName = '', lastTxt = '';
      const L_enz = label('효소', body, { color: '#075985', offset: [0, -1.3, 0] });
      const L_site = label('활성 부위', ghost, { color: '#0f3b57', offset: [0, 0.25, 0] });
      const L_sub = label('기질', new THREE.Object3D(), { color: '#9f1239' });
      const L_prod = label('생성물', new THREE.Object3D(), { color: '#92400e' });
      const holder = new THREE.Object3D(); root.add(holder);
      L_sub.obj = holder; L_prod.obj = holder;
      const isOk = () => sub === 'S' || (sub === 'near' && model === 'induced');
      const durOf = () => 6.4;
      const SUBN = { S: '맞는 기질 S', near: '비슷한 S′', far: '다른 S″' };

      function restart() {
        if (subG) root.remove(subG);
        subG = makeSub(sub); root.add(subG); phName = ''; lastTxt = '';
        if (player) player.set(0);
        render(0);
      }
      function text(ph) {
        const ok = isOk(), L = ctx.lesson(), c = L && L.S && L.S.cx;
        const h = [
          model === 'lock' ? '<b>열쇠–자물쇠 모형</b> · 활성 부위가 기질과 처음부터 꼭 맞아요.' : '<b>유도 적합 모형</b> · 기질이 결합하면 활성 부위의 모양이 기질에 맞게 변해요.',
          '넣은 기질: <b>' + SUBN[sub] + '</b>',
          ok ? (ph === 'in' ? '기질이 활성 부위로 다가와요.' : ph === 'bind' ? '결합해서 효소–기질 복합체(ES)가 돼요.' : ph === 'react' ? '반응이 일어나요.' : '생성물이 떨어져 나가고, 효소는 그대로 남아 다시 쓰여요.')
            : (ph === 'in' ? '기질이 활성 부위로 다가와요.' : sub === 'near' ? '모양이 조금 달라서 열쇠–자물쇠 모형에서는 맞지 않아요.' : '모양이 달라 활성 부위에 들어가지 못해요. 반응이 일어나지 않아요.'),
        ];
        if (c) h.push('<span style="color:#9fb0d4">이 효소의 반응 ' + c.n + '회</span>');
        info(h.join('<br>'));
      }

      const ease = (k) => { k = Math.max(0, Math.min(1, k)); return k * k * (3 - 2 * k); };
      const START = new V(0.8, 3.7, 0.4), sTarget = new V(0, 0.78, 0), tmpV = new V();
      /* 한 주기를 시간 tt(초)만으로 그려요: 기질 접근(in) → 결합(bind) → 반응(react) → 생성물 방출(out). 맞지 않는 기질은 접근 뒤 튕겨 나가요(jam). */
      function render(tt) {
        const ok = isOk(), u = subG.userData, base = model === 'induced' ? 1.15 : 0.78;
        const bound = sub === 'near' ? 0.7 : 0.62;
        let ph, k = 0;
        if (tt < 1.9) { ph = 'in'; k = ease(tt / 1.9); }
        else if (!ok) { ph = 'jam'; k = Math.min(1, (tt - 1.9) / 2.4); }
        else if (tt < 3.0) { ph = 'bind'; k = (tt - 1.9) / 1.1; }
        else if (tt < 4.2) { ph = 'react'; k = (tt - 3.0) / 1.2; }
        else { ph = 'out'; k = (tt - 4.2) / 2.2; }
        // 기질 · 생성물 기본 자세
        if (u.a) { u.a.position.set(-0.3, 0, 0); u.b.position.set(0.3, 0, 0); u.bond.visible = true; u.bond.scale.set(1, 1, 1); }
        subG.rotation.set(0, 0, 0); subG.visible = true;
        let g = base, ghostO = 0.3, gh = true;
        if (ph === 'in') {
          const target = ok ? sTarget : tmpV.set(0, 2.0, 0);
          subG.position.lerpVectors(START, target, k);
          subG.rotation.z = (1 - k) * 1.6; subG.rotation.y = (1 - k) * 0.8;
          g = base;
        } else if (ph === 'jam') {
          subG.position.set(0, 2.0 + (k < 0.5 ? 0 : (k - 0.5) * 4), 0); subG.rotation.z = Math.sin(tt * 22) * 0.18 * (1 - k);
          g = base;
        } else if (ph === 'bind') {
          subG.position.copy(sTarget); g = lerp(base, bound, ease(k / 0.4)); ghostO = 0.3 * (1 - ease(k / 0.55));
        } else if (ph === 'react') {
          subG.position.set(0, 0.78 + 0.04 * Math.sin(tt * 40) * ease(k), 0); g = bound; ghostO = 0; gh = false;
          if (u.a) { const e = ease(k); u.a.position.x = -0.3 - 0.22 * e; u.b.position.x = 0.3 + 0.22 * e; u.bond.visible = e < 0.9; u.bond.scale.set(1, 1 + e * 1.2, 1); }
        } else {
          subG.position.copy(sTarget); g = lerp(bound, base, ease(k / 0.3));
          const e = ease(k / 0.73);
          if (u.a) { u.a.position.set(-0.52 - 1.6 * e, 0.9 * e, 0.5 * e); u.b.position.set(0.52 + 1.6 * e, 0.9 * e, -0.5 * e); u.bond.visible = false; }
          ghostO = 0.3 * e;
        }
        gap = g; placeJaws(); ghostMat.opacity = ghostO; ghost.visible = gh;
        holder.position.copy(subG.position).add(new V(0, 0.95, 0));
        if (ph === 'out') holder.position.set(0, 2.1, 0);
        L_sub.show(ph !== 'out'); L_prod.show(ph === 'out');
        if (ph !== phName || lastTxt !== sub + model) { phName = ph; lastTxt = sub + model; text(ph); }
      }
      const lerp = (a, b, t) => a + (b - a) * t;

      /* 2D 화면과 같은 값 · 3D에서 고르면 2D도 같이 바뀌어요 */
      function toLesson(f) { const L = ctx.lesson(); if (L && L.S && L.S.cx && L.S.cx.ph === 'idle') { f(L); return true; } return false; }
      const segM = controls.segment('결합 모형', [{ value: 'lock', label: '🔑 열쇠–자물쇠' }, { value: 'induced', label: '🤝 유도 적합' }], model, (v) => { if (!toLesson((L) => L.cxSetModel(v))) { segM.set(model); return; } model = v; restart(); });
      const segS = controls.segment('넣을 기질', [{ value: 'S', label: '맞는 기질 S' }, { value: 'near', label: '비슷한 S′' }, { value: 'far', label: '다른 S″' }], sub, (v) => { if (!toLesson((L) => { L.S.cx.sub = v; L.updateCtl(); })) { segS.set(sub); return; } sub = v; restart(); });
      /* ▶ 기질 넣기: 2D의 ▶ 기질 넣기(cxGo)와 같아요 — 반응 횟수도 같이 세요. 오른쪽 단추로 넣어도 3D가 처음부터 보여 줘요 */
      let player = null, wasPlay = false, lastPh = 'idle';
      player = controls.player({
        duration: 6.4, loop: false, autoplay: false, label: '기질 넣기',
        phases: [[0, '접근'], [0.3, '결합(ES)'], [0.47, '반응'], [0.66, '생성물 방출']],
        onFrame(p) { if (subG) render(p * durOf()); },
      });
      /* 3D에서 ▶ 기질 넣기 → 2D에서도 기질을 넣어요 (반응 횟수를 같이 세요) */
      { const host = controls.text('').parentNode, pr = Array.from(host.querySelectorAll('.v3-player')).pop(), pb = pr && pr.querySelector('.v3-play');
        if (pb) pb.addEventListener('click', () => { const L = ctx.lesson(), c = L && L.S && L.S.cx; if (player.playing && c && c.ph === 'idle' && L.cxGo) { L.cxGo(); lastPh = c.ph; } }); }
      restart();
      let lastM = null, lastS = null, lastN = -1;
      function follow() {
        const c = window.__sim && window.__sim.S && window.__sim.S.cx;
        if (c && (c.model !== lastM || c.sub !== lastS)) { lastM = c.model; lastS = c.sub; if (c.model !== model || c.sub !== sub) { model = c.model; sub = c.sub; segM.set(model); segS.set(sub); restart(); } }
      }
      return {
        update(dt) {
          follow();
          const L = ctx.lesson(), c = L && L.S && L.S.cx;
          if (c) {
            if (c.ph !== 'idle' && lastPh === 'idle' && !player.playing) { player.set(0); player.play(); }   // 오른쪽 ▶ 기질 넣기 → 3D도 처음부터
            if (c.n !== lastN) { lastN = c.n; text(phName || 'in'); }
            lastPh = c.ph;
          }
          wasPlay = player.playing;
          enz.position.y = 0.04 * Math.sin(performance.now() / 700);
        },
        sync() { follow(); },
      };
    },
  });
})();
