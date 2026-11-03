/* m3-pressure-wind · 3D 바람의 순환 (해륙풍 · 계절풍)
   더워진 쪽 공기는 팽창해 위로 올라가 저기압, 차가운 쪽은 공기가 가라앉아 고기압이 돼요. 바람은 고기압 → 저기압으로 불어요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHN = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const TAU = Math.PI * 2, cl01 = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
  /* 2D 차시와 같은 식 (해륙풍: 하루 시각에 따른 땅·바다 온도) */
  const tLand = (h) => 21 + 9 * Math.sin(TAU * (h - 8) / 24);
  const tSea = (h) => 21 + 0.8 * Math.sin(TAU * (h - 11) / 24);
  const sstep = (a0, b0, x) => { const t = cl01((x - a0) / (b0 - a0), 0, 1); return t * t * (3 - 2 * t); };
  const bright = (h) => sstep(5.5, 8.5, h) * (1 - sstep(17, 20, h));
  const hourLabel = (h) => { h = Math.round(h) % 24; return h === 0 ? '밤 12시' : h < 12 ? '오전 ' + h + '시' : h === 12 ? '낮 12시' : h < 18 ? '오후 ' + (h - 12) + '시' : h < 21 ? '저녁 ' + (h - 12) + '시' : '밤 ' + (h - 12) + '시'; };
  window.SciSim3D.attach({
    host: '.stage-card',
    title: '바람의 순환 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: PHN ? 19 : 14.5, theta: 0.3, phi: 1.28, min: 7, max: 30, target: [0, 1.4, 0] },
    autoRotate: 0,
    levels: [2, 3],            // 수조 모형(단계 3) · 해륙풍과 계절풍(단계 4)에서 3D로 시작해요. 앞 단계 실험은 2D 화면에서 해요
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const V3 = THREE.Vector3, C = THREE.Color;
      let age = 0, tp = 0, sig = '', c = null, run = false;
      const sm = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.7, metalness: 0 }, o || {}));
      const D = 5;
      /* 바다 · 육지 */
      const seaM = sm(0x1d5f9f, { roughness: 0.25, transparent: true, opacity: 0.92 });
      const sea = new THREE.Mesh(new THREE.BoxGeometry(D, 1.2, 4.2, 40, 1, 12), seaM); sea.position.set(-D / 2, -0.6, 0); root.add(sea);
      const seaTop = sea.geometry.attributes.position; const seaY0 = []; for (let i = 0; i < seaTop.count; i++) seaY0.push(seaTop.getY(i));
      const landM = sm(0xb98d45, { roughness: 0.95 }); const land = new THREE.Mesh(new THREE.BoxGeometry(D, 1.2, 4.2), landM); land.position.set(D / 2, -0.6, 0); root.add(land);
      const hills = new THREE.Group(); [[1.5, 1.0, 0.8], [2.4, 0.6, -0.9], [3.4, 1.3, 0.2], [4.2, 0.7, -0.4]].forEach((q) => { const m = new THREE.Mesh(new THREE.ConeGeometry(q[1] * 0.9, q[1] * 1.1, 24), sm(0x3f7d3a, { roughness: 0.9 })); m.position.set(q[0], q[1] * 0.55, q[2]); hills.add(m); }); root.add(hills);
      const snow = new THREE.Mesh(new THREE.BoxGeometry(D - 0.1, 0.08, 4.1), sm(0xf1f5f9, { roughness: 0.9 })); snow.position.set(D / 2, 0.04, 0); root.add(snow);
      /* 열기 · 냉기 표시 (땅 위 반투명 판) */
      const heatM = new THREE.MeshBasicMaterial({ color: 0xff3a1a, transparent: true, opacity: 0.0, depthWrite: false }); const heat = new THREE.Mesh(new THREE.BoxGeometry(D, 0.06, 4.2), heatM); heat.position.set(D / 2, 0.06, 0); root.add(heat);
      const heat2 = new THREE.Mesh(new THREE.BoxGeometry(D, 0.06, 4.2), new THREE.MeshBasicMaterial({ color: 0xff5a2a, transparent: true, opacity: 0, depthWrite: false })); heat2.position.set(-D / 2, 0.07, 0); root.add(heat2);
      /* 해 · 달 */
      const sun = new THREE.Mesh(new THREE.SphereGeometry(0.7, 28, 20), new THREE.MeshBasicMaterial({ color: 0xffd34d })); sun.position.set(2.6, 5.4, -2); root.add(sun);
      const moon = new THREE.Mesh(new THREE.SphereGeometry(0.55, 28, 20), sm(0xe2e8f0, { emissive: 0x94a3b8, emissiveIntensity: 0.5 })); moon.position.set(2.6, 5.4, -2); root.add(moon);
      /* 순환 고리 */
      const RX = 4.2, CY = 2.3, RY = 1.5;
      const loopAt = (a) => new V3(RX * Math.cos(a) * 0.95, CY + RY * Math.sin(a), 0.0);
      const loopPts = []; for (let i = 0; i <= 96; i++) loopPts.push(loopAt(i / 96 * Math.PI * 2));
      const ring = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(loopPts, true), 160, 0.035, 8, true), new THREE.MeshBasicMaterial({ color: 0x94a3b8, transparent: true, opacity: 0.35 })); root.add(ring);
      const N = 46, parts = new THREE.InstancedMesh(new THREE.SphereGeometry(0.1, 14, 10), new THREE.MeshStandardMaterial({ roughness: 0.4, emissiveIntensity: 0.3 }), N); root.add(parts);
      for (let i = 0; i < N; i++) parts.setColorAt(i, new C(0xffffff));
      const arrows = []; for (let i = 0; i < 4; i++) { const m = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.6, 14), sm(0xffd34d, { emissive: 0x6b4a00, emissiveIntensity: 0.5, roughness: 0.4 })); root.add(m); arrows.push(m); }
      const dm = new THREE.Object3D(), cw = new C(), cc = new C(0x7dd3fc), ch = new C(0xff8a4a);
      const labH = label('', [0, 0, 0], { size: 14 }), labL = label('', [0, 0, 0], { size: 14 });
      const labTs = label('', [-D / 2, 0.3, 2.3], { color: 'rgba(14,116,144,.92)', size: 13 }), labTl = label('', [D / 2, 0.3, 2.3], { color: 'rgba(180,83,9,.92)', size: 13 });
      const labW = label('', [0, 0.45, 2.4], { color: 'rgba(30,41,59,.92)', size: 14 });
      /* 지금 2D 장면에서 상황을 읽어요 */
      function read() {
        const S = (ctx.lesson() || {}).S || {}, sc = S.scene;
        if (sc === 'coast' && S.co) {
          const h = S.co.hourS, tl = tLand(h), ts = tSea(h), w = cl01((tl - ts) / 8, -1, 1);
          const hide = !!S.co.guessActive && Math.abs(w) > 0.2 && (Math.round(h) % 24 >= 22 || Math.round(h) % 24 <= 5);
          return { k: 'coast', L: '육지', Sn: '바다', Tl: tl, Ts: ts, warm: w >= 0, str: Math.abs(w) > 0.2 ? Math.abs(w) : 0, hide, day: bright(h) > 0.4, big: false,
            t: hourLabel(h), wind: w > 0.2 ? '해풍 (바다 → 육지)' : w < -0.2 ? '육풍 (육지 → 바다)' : '바람이 거의 없어요', note: '낮에는 육지가 바다보다 빨리 데워지고, 밤에는 빨리 식어요.' };
        }
        if (sc === 'monsoon' && S.mo) {
          const sum = S.mo.sum !== false;
          return { k: 'monsoon', L: '대륙', Sn: '해양', Tl: sum ? 30 : -8, Ts: sum ? 22 : 6, warm: sum, str: 1, hide: false, day: sum, big: true, snow: !sum,
            t: sum ? '여름' : '겨울', wind: sum ? '남동 계절풍' : '북서 계절풍', note: sum ? '여름: 뜨거운 대륙은 저기압, 바다는 고기압이에요.' : '겨울: 차가운 대륙은 고기압, 바다는 저기압이에요.' };
        }
        const k = (S.tk) || { Ts: 25, Tw: 25, lamp: false }, dT = k.Ts - k.Tw;
        return { k: 'tank', L: '모래', Sn: '물', Tl: k.Ts, Ts: k.Tw, warm: true, str: cl01((dT - 0.5) / 6, 0, 1), hide: false, day: !!k.lamp, big: false, lamp: !!k.lamp,
          t: k.lamp ? '전등 켬' : '전등 끔', wind: '연기가 물 → 모래 쪽으로 흘러요', note: '수조 모형: 전등을 켜면 모래가 물보다 빨리 데워져요.' };
      }
      function apply() {
        const dir = c.warm ? 1 : -1, calm = c.str <= 0 || c.hide;
        landM.color.set(c.warm ? (c.big ? 0xa9803d : 0xb98d45) : 0x6f8396); snow.visible = !!c.snow; if (c.k === 'tank') landM.color.set(0xd9b36a);
        hills.visible = c.k !== 'tank'; heatM.opacity = c.warm && !calm ? 0.16 : 0; heat2.material.opacity = 0;
        sun.visible = c.day || c.lamp; moon.visible = !c.day && c.k === 'coast';
        const hi = c.warm ? -D / 2 : D / 2, lo = c.warm ? D / 2 : -D / 2;
        labH.obj = [hi, 4.3, 0]; labL.obj = [lo, 4.3, 0];
        labH.set('고기압 (공기가 내려와요)'); labL.set('저기압 (공기가 올라가요)'); labH.show(!calm); labL.show(!calm);
        labH.el.style.background = 'rgba(37,99,235,.92)'; labL.el.style.background = 'rgba(220,38,38,.92)';
        labTl.set(c.L + ' ' + Math.round(c.Tl) + '°C'); labTs.set(c.Sn + ' ' + Math.round(c.Ts) + '°C');
        labW.set(c.hide ? '바람이 어느 쪽으로 불까요?' : calm ? '바람이 거의 없어요' : c.wind + ' (지표: ' + (c.warm ? c.Sn + ' → ' + c.L : c.L + ' → ' + c.Sn) + ')');
        let h = '<b>' + c.t + '</b> · ' + c.note + '<br>';
        if (c.hide) h += '<span style="color:#fcd34d">밤에는 바람이 어느 쪽으로 불지 맞혀 보세요.</span>';
        else if (calm) h += c.L + '와 ' + c.Sn + '의 온도 차가 작아서 바람이 거의 불지 않아요.';
        else h += '따뜻한 ' + (c.warm ? c.L : c.Sn) + ': 공기가 올라가 <b>저기압</b>, ' + (c.warm ? c.Sn : c.L) + ': 공기가 내려와 <b>고기압</b>.<br>지표에서는 고기압 → 저기압으로 <b>' + c.wind + '</b>이 불어요.';
        info(h);
        ring.visible = !calm; arrows.forEach((m) => { m.visible = !calm; });
      }
      const sb = controls.button('입자 ✓', () => { parts.visible = !parts.visible; sb.textContent = '입자 ' + (parts.visible ? '✓' : '✕'); }); sb.classList.add('on');
      /* ▶ 공기의 순환: 따뜻한 쪽에서 올라가 높은 곳에서 차가운 쪽으로 → 내려와 → 지표에서 따뜻한 쪽으로 */
      controls.player({
        duration: 14, loop: true, autoplay: true, label: '공기 순환',
        phases: [[0, '따뜻한 쪽에서 상승'], [0.12, '높은 곳에서 이동'], [0.37, '차가운 쪽에서 하강'], [0.62, '지표에서 바람이 불어요'], [0.87, '다시 상승']],
        onFrame(p) { tp = p; },
      });
      c = read(); apply();
      return {
        update(dt, t) {
          const n = read(), ns = [n.k, n.warm, Math.round(n.Tl), Math.round(n.Ts), n.str > 0, n.hide, n.day, n.snow].join('|');
          if (ns !== sig) { sig = ns; c = n; apply(); } else c.str = n.str;
          const dir = c.warm ? 1 : -1, calm = c.str <= 0 || c.hide, base = c.warm ? 0 : Math.PI;
          for (let i = 0; i < N; i++) {
            const a = base + i / N * Math.PI * 2 + (calm ? 0 : dir * Math.PI * 2 * tp), p = loopAt(a); p.z = Math.sin(i * 7.1) * 1.4; p.y += Math.sin(i * 3.3) * 0.18;
            dm.position.copy(p); dm.scale.setScalar(calm ? 0.6 : 1); dm.updateMatrix(); parts.setMatrixAt(i, dm.matrix);
            const wl = c.warm ? Math.cos(a) : -Math.cos(a);
            cw.copy(cc).lerp(ch, calm ? 0.5 : Math.max(0, Math.min(1, 0.5 + 0.5 * wl))); parts.setColorAt(i, cw);
          }
          parts.instanceMatrix.needsUpdate = true; if (parts.instanceColor) parts.instanceColor.needsUpdate = true;
          arrows.forEach((m, i) => { const a = base + i / 4 * Math.PI * 2 + dir * Math.PI * 2 * tp, p = loopAt(a), q = loopAt(a + 0.05 * dir); m.position.copy(p); const d = q.sub(p).normalize(); m.quaternion.setFromUnitVectors(new V3(0, 1, 0), d); });
          for (let i = 0; i < seaTop.count; i++) { if (seaY0[i] > 0) seaTop.setY(i, 0.6 + Math.sin(seaTop.getX(i) * 2.2 + t * 1.6) * 0.04 + Math.sin(seaTop.getZ(i) * 3 + t) * 0.03); }
          seaTop.needsUpdate = true;
          sun.position.y = 5.2 + Math.sin(t * 0.8) * 0.08;
        },
      };
    },
  });
})();
