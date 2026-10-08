/* =========================================================
   중학 과학 시뮬레이션 - 공통 엔진 (SciSim)
   - 저장(진행도/별), 효과음, 토스트, 모달, 축하 효과
   - 캔버스/포인터 도우미
   - 미션(게임) 엔진
   ========================================================= */
(function (global) {
  'use strict';

  const STORE_KEY = 'sciencesimul:v1';

  /* ---------------- 저장소 ---------------- */
  function readAll() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      const d = raw ? JSON.parse(raw) : null;
      if (d && typeof d === 'object') {
        d.sims = d.sims || {};
        d.settings = d.settings || {};
        return d;
      }
    } catch (e) { /* 저장소를 쓸 수 없는 환경 */ }
    return { sims: {}, settings: {} };
  }
  function writeAll(d) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(d)); } catch (e) { /* 무시 */ }
  }
  const Store = {
    sim(id) {
      return Object.assign({ stars: 0, best: 0, score: 0, cursor: 0, cleared: false }, readAll().sims[id] || {});
    },
    saveSim(id, rec) { const d = readAll(); d.sims[id] = rec; writeAll(d); },
    allSims() { return readAll().sims; },
    get(key, def) { const v = readAll().settings[key]; return v === undefined ? def : v; },
    set(key, val) { const d = readAll(); d.settings[key] = val; writeAll(d); },
  };

  /* ---------------- 효과음 (WebAudio) ---------------- */
  const Sound = {
    ctx: null,
    muted: Store.get('muted', false),
    _ensure() {
      if (this.muted) return null;
      if (!this.ctx) {
        const AC = global.AudioContext || global.webkitAudioContext;
        if (!AC) return null;
        try { this.ctx = new AC(); } catch (e) { return null; }
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return this.ctx;
    },
    tone(freq, dur, type, vol, delay) {
      const ctx = this._ensure();
      if (!ctx) return;
      const t = ctx.currentTime + (delay || 0);
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol || 0.12, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(ctx.destination);
      o.start(t);
      o.stop(t + dur + 0.02);
    },
    click() { this.tone(700, 0.05, 'triangle', 0.06); },
    tick() { this.tone(1200, 0.03, 'square', 0.025); },
    success() { [523, 659, 784].forEach((f, i) => this.tone(f, 0.16, 'triangle', 0.13, i * 0.09)); },
    fail() { this.tone(240, 0.16, 'sawtooth', 0.05); this.tone(190, 0.22, 'sawtooth', 0.05, 0.12); },
    level() { [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.22, 'triangle', 0.12, i * 0.1)); },
    setMuted(m) { this.muted = m; Store.set('muted', m); },
  };

  /* ---------------- DOM 도우미 ---------------- */
  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    if (attrs) {
      for (const k in attrs) {
        const v = attrs[k];
        if (v == null || v === false) continue;
        if (k === 'class') node.className = v;
        else if (k === 'html') node.innerHTML = v;
        else if (k === 'text') node.textContent = v;
        else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
        else node.setAttribute(k, v === true ? '' : v);
      }
    }
    (Array.isArray(children) ? children : children != null ? [children] : []).forEach((c) => {
      if (c == null || c === false) return;
      node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return node;
  }
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  function starsHTML(n, total) {
    total = total || 3;
    let s = '';
    for (let i = 0; i < total; i++) s += '<span class="s' + (i < n ? ' on' : '') + '">★</span>';
    return s;
  }

  /* ---------------- 토스트 ---------------- */
  let toastWrap = null;
  function toast(msg, kind, ms) {
    if (!toastWrap) { toastWrap = el('div', { class: 'toast-wrap', 'aria-live': 'polite' }); document.body.appendChild(toastWrap); }
    const t = el('div', { class: 'toast' + (kind ? ' ' + kind : ''), html: msg });
    toastWrap.appendChild(t);
    setTimeout(() => { t.style.transition = 'opacity .3s'; t.style.opacity = '0'; setTimeout(() => t.remove(), 320); }, ms || 1800);
  }

  /* ---------------- 모달 ---------------- */
  function modal(opts) {
    const back = el('div', { class: 'modal-backdrop', role: 'dialog', 'aria-modal': 'true' });
    const box = el('div', { class: 'modal' });
    if (opts.icon) box.appendChild(el('div', { style: 'font-size:52px;line-height:1;margin-bottom:6px', html: opts.icon }));
    if (opts.stars != null) box.appendChild(el('div', { class: 'modal-stars', html: starsHTML(opts.stars, opts.starTotal || 3) }));
    box.appendChild(el('h2', { html: opts.title || '' }));
    if (opts.html) box.appendChild(el('div', { class: 'modal-body', html: opts.html }));
    const actions = el('div', { class: 'modal-actions' });
    const close = () => back.remove();
    (opts.buttons || [{ label: '확인', primary: true }]).forEach((b) => {
      const btn = el('button', { class: 'btn ' + (b.primary ? 'btn-primary' : ''), html: b.label });
      btn.addEventListener('click', () => { Sound.click(); close(); b.onClick && b.onClick(); });
      actions.appendChild(btn);
    });
    box.appendChild(actions);
    back.appendChild(box);
    if (opts.dismissible !== false) back.addEventListener('click', (e) => { if (e.target === back) close(); });
    document.body.appendChild(back);
    const first = actions.querySelector('.btn-primary') || actions.querySelector('button');
    if (first) setTimeout(() => first.focus({ preventScroll: true }), 50);
    return { close };
  }

  /* ---------------- 축하 효과 (색종이) ---------------- */
  function confetti(opts) {
    opts = opts || {};
    if (global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const cv = el('canvas', { class: 'confetti-canvas' });
    document.body.appendChild(cv);
    const dpr = Math.min(global.devicePixelRatio || 1, 2);
    const W = global.innerWidth, H = global.innerHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    const ctx = cv.getContext('2d');
    ctx.scale(dpr, dpr);
    const colors = ['#ffb400', '#3867f4', '#14a058', '#e2464b', '#8b5cf6', '#0ea5e9', '#f26b3a'];
    const n = opts.count || 120;
    const ox = opts.x != null ? opts.x : W / 2, oy = opts.y != null ? opts.y : H * 0.35;
    const parts = [];
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = 4 + Math.random() * 9;
      parts.push({ x: ox, y: oy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 6, r: 4 + Math.random() * 5, c: colors[i % colors.length], rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, life: 0 });
    }
    const t0 = performance.now();
    (function frame(t) {
      const el2 = t - t0;
      ctx.clearRect(0, 0, W, H);
      parts.forEach((p) => {
        p.vy += 0.28; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.rot += p.vr;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.globalAlpha = Math.max(0, 1 - el2 / 2600);
        ctx.fillStyle = p.c; ctx.fillRect(-p.r, -p.r * 0.5, p.r * 2, p.r);
        ctx.restore();
      });
      if (el2 < 2600) requestAnimationFrame(frame); else cv.remove();
    })(t0);
  }

  /* ---------------- 캔버스 도우미 ----------------
     가상 좌표(width x height)로 그림을 그리면 화면 크기에 맞게 자동 확대/축소됩니다.
     const view = SciSim.stage(canvas, { width: 800, height: 500 });
     view.ctx 로 그리기 (좌표는 0~800, 0~500) */
  function stage(canvas, opts) {
    opts = opts || {};
    const vw = opts.width || 800, vh = opts.height || 500;
    const ctx = canvas.getContext('2d');
    const view = { canvas, ctx, vw, vh, w: vw, h: vh, scale: 1, dpr: 1 };
    canvas.style.aspectRatio = vw + ' / ' + vh;
    // 화면 높이에 맞춰 캔버스 크기 제한 (reserve: 캔버스 외 다른 요소들이 차지하는 높이 px)
    const reserve = opts.reserve != null ? opts.reserve : 250;
    canvas.style.width = 'min(100%, max(320px, calc((100vh - ' + reserve + 'px) * ' + (vw / vh).toFixed(4) + ')))';
    canvas.style.touchAction = 'none';
    function resize() {
      const r = canvas.getBoundingClientRect();
      if (r.width < 2) return;
      const dpr = Math.min(global.devicePixelRatio || 1, 2);
      view.dpr = dpr;
      view.scale = r.width / vw;
      canvas.width = Math.round(r.width * dpr);
      canvas.height = Math.round(r.width * (vh / vw) * dpr);
      view.apply();
      opts.onResize && opts.onResize(view);
    }
    view.apply = function () { ctx.setTransform(view.scale * view.dpr, 0, 0, view.scale * view.dpr, 0, 0); };
    view.clear = function (color) {
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
      if (color) { ctx.fillStyle = color; ctx.fillRect(0, 0, canvas.width, canvas.height); }
      else ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
    };
    view.toLocal = function (e) {
      const r = canvas.getBoundingClientRect();
      return { x: (e.clientX - r.left) * vw / r.width, y: (e.clientY - r.top) * vh / r.height };
    };
    if (global.ResizeObserver) new ResizeObserver(resize).observe(canvas);
    else global.addEventListener('resize', resize);
    resize();
    return view;
  }

  /* 포인터(마우스/터치) 드래그 도우미
     SciSim.pointer(view, { down(p){ return true면 드래그 시작 }, move(p), up(p), hover(p){ return 커서문자열 } }) */
  function pointer(view, h) {
    const c = view.canvas;
    let active = false;
    c.addEventListener('pointerdown', (e) => {
      const p = view.toLocal(e);
      if (h.down && h.down(p, e)) {
        active = true;
        try { c.setPointerCapture(e.pointerId); } catch (err) { /* 무시 */ }
        e.preventDefault();
      }
    });
    c.addEventListener('pointermove', (e) => {
      const p = view.toLocal(e);
      if (active) { h.move && h.move(p, e); e.preventDefault(); }
      else if (h.hover) { const cur = h.hover(p, e); c.style.cursor = cur || 'default'; }
    });
    const end = (e) => { if (!active) return; active = false; h.up && h.up(view.toLocal(e), e); };
    c.addEventListener('pointerup', end);
    c.addEventListener('pointercancel', end);
    c.addEventListener('pointerleave', (e) => { if (!active && h.hover) c.style.cursor = 'default'; });
  }

  /* 애니메이션 루프: SciSim.loop((dt, t) => {...}) dt는 초 단위 (최대 0.05) */
  function loop(fn) {
    let last = performance.now();
    let running = true;
    function frame(t) {
      if (!running) return;
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      fn(dt, t / 1000);
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    return { stop() { running = false; } };
  }

  /* 슬라이더 연결 도우미: 값 표시 + 진행 색 */
  function bindRange(input, output, format, onInput) {
    const upd = () => {
      const min = +input.min || 0, max = +input.max || 100, v = +input.value;
      input.style.setProperty('--pct', ((v - min) / (max - min)) * 100 + '%');
      if (output) output.textContent = format ? format(v) : v;
    };
    input.addEventListener('input', () => { upd(); onInput && onInput(+input.value); });
    upd();
    return { set(v) { input.value = v; upd(); }, refresh: upd };
  }

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  function fmt(n, d) {
    if (!isFinite(n)) return '-';
    return Number(n).toLocaleString('ko-KR', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 });
  }

  /* ---------------- 헤더 (효과음 버튼, 별) ---------------- */
  function wireHeader(simId) {
    const sb = $('#soundBtn');
    if (sb) {
      const upd = () => { sb.textContent = Sound.muted ? '🔇' : '🔊'; sb.title = Sound.muted ? '효과음 켜기' : '효과음 끄기'; sb.setAttribute('aria-label', sb.title); };
      upd();
      sb.addEventListener('click', () => { Sound.setMuted(!Sound.muted); upd(); Sound.click(); });
    }
    const sm = $('#starMeter');
    if (sm && simId) sm.innerHTML = starsHTML(Store.sim(simId).stars);
  }

  /* =========================================================
     미션(게임) 엔진
     SciSim.game({
       simId: 'm1-gas',
       mount: '#game',
       concept: '<h3>...</h3>',      // 📘 핵심 원리 탭 내용
       badge: '기체 박사',              // 모두 완료 시 칭호
       levels: [
         { title: '보일 법칙 관찰', missions: [
            // 실행형 미션: check()가 hold초 동안 true면 성공
            { title, goal, hint, check: () => bool, hold: 0.8, status: () => '현재 ...', setup(){}, explain },
            // 확인 버튼형: manual: true, check()가 true면 성공 / 문자열이면 피드백 표시
            { title, goal, manual: true, check: () => true | '오답 피드백', explain },
            // 퀴즈형
            { type: 'quiz', title, goal: '질문', choices: ['a','b'], answer: 1, feedback: ['보기별 피드백'], explain },
         ]},
       ],
       onMissionStart(m) {}, onComplete() {}
     })
     ========================================================= */
  function game(opts) {
    const mount = typeof opts.mount === 'string' ? $(opts.mount) : opts.mount;
    const simId = opts.simId;
    const levels = opts.levels;
    const flat = [];
    levels.forEach((lv, li) => lv.missions.forEach((m, mi) => {
      m._level = li; m._index = mi; m._flat = flat.length;
      if (!m.type) m.type = m.choices ? 'quiz' : 'task';
      flat.push(m);
    }));

    let rec = Store.sim(simId);
    if (rec.cursor >= flat.length || rec.cursor < 0) { rec.cursor = 0; rec.score = 0; }
    let idx = rec.cursor;
    let score = rec.score || 0;
    let state = 'active';       // active | success | complete
    let wrong = 0, hintUsed = false, holdStart = 0, lastStatus = null, finalScore = 0;

    wireHeader(simId);
    mount.classList.add('game');
    mount.innerHTML = '';

    const tabs = el('div', { class: 'game-tabs', role: 'tablist' });
    const tabMission = el('button', { class: 'on', role: 'tab', html: '🎯 미션' });
    const tabConcept = el('button', { role: 'tab', html: '📘 핵심 원리' });
    tabs.append(tabMission, tabConcept);
    const bodyMission = el('div', { class: 'game-body' });
    const bodyConcept = el('div', { class: 'game-body concept', hidden: true, html: opts.concept || '' });
    mount.append(tabs, bodyMission, bodyConcept);
    function showTab(which) {
      tabMission.classList.toggle('on', which === 'mission');
      tabConcept.classList.toggle('on', which === 'concept');
      bodyMission.hidden = which !== 'mission';
      bodyConcept.hidden = which !== 'concept';
    }
    tabMission.addEventListener('click', () => { Sound.click(); showTab('mission'); });
    tabConcept.addEventListener('click', () => { Sound.click(); showTab('concept'); });

    let refs = {};

    function persist() {
      rec.cursor = idx; rec.score = score;
      Store.saveSim(simId, rec);
    }
    function setStars(n) {
      if (n > rec.stars) {
        rec.stars = n;
        const sm = $('#starMeter');
        if (sm) {
          sm.innerHTML = starsHTML(n);
          const s = sm.querySelectorAll('.s')[n - 1];
          if (s) s.classList.add('pop');
        }
      }
    }
    function levelStars(li) { return Math.round(((li + 1) / levels.length) * 3); }

    function render() {
      const m = flat[idx];
      const lv = levels[m._level];
      wrong = 0; hintUsed = false; holdStart = 0; lastStatus = null; state = 'active';
      bodyMission.innerHTML = '';

      const head = el('div', { class: 'level-head' }, [
        el('span', { class: 'level-badge', text: 'LEVEL ' + (m._level + 1) }),
        el('span', { class: 'level-name', text: lv.title }),
        el('span', { class: 'score-pill', text: '점수 ' + score }),
      ]);
      const dots = el('div', { class: 'mission-dots', 'aria-hidden': 'true' });
      lv.missions.forEach((_, i) => dots.appendChild(el('i', { class: i < m._index ? 'done' : i === m._index ? 'now' : '' })));

      const card = el('div', { class: 'mission-card' });
      const typeLabel = m.type === 'quiz' ? '퀴즈' : m.manual ? '실험 후 확인' : '실험 미션';
      card.appendChild(el('div', { class: 'mission-num' }, [
        el('span', { text: '미션 ' + (m._index + 1) + ' / ' + lv.missions.length }),
        el('span', { class: 'mission-type', text: typeLabel }),
      ]));
      card.appendChild(el('h3', { class: 'mission-title', html: m.title }));
      if (m.goal) card.appendChild(el('div', { class: 'mission-goal', html: m.goal }));
      if (m.figure) card.appendChild(el('div', { class: 'mission-figure', html: m.figure }));

      refs = { card };
      if (m.type === 'quiz') {
        const ch = el('div', { class: 'choices' });
        refs.choices = m.choices.map((c, i) => {
          const b = el('button', { class: 'choice' }, [el('span', { class: 'key', text: String(i + 1) }), el('span', { html: c })]);
          b.addEventListener('click', () => answer(i, b));
          ch.appendChild(b);
          return b;
        });
        card.appendChild(ch);
      }
      refs.status = el('div', { class: 'mission-status' });
      refs.hold = el('div', { class: 'hold-bar' }, [el('i')]);
      refs.feedback = el('div', { class: 'mission-feedback' });
      card.append(refs.status, refs.hold, refs.feedback);

      const actions = el('div', { class: 'mission-actions' });
      if (m.hint) {
        refs.hintBtn = el('button', { class: 'btn btn-sm', html: '💡 힌트' });
        refs.hintBtn.addEventListener('click', () => {
          Sound.click();
          if (!hintUsed) { hintUsed = true; }
          refs.feedback.className = 'mission-feedback hint';
          refs.feedback.innerHTML = '💡 ' + m.hint;
        });
        actions.appendChild(refs.hintBtn);
      }
      actions.appendChild(el('span', { class: 'grow' }));
      if (m.type === 'task' && m.manual) {
        refs.checkBtn = el('button', { class: 'btn btn-primary btn-sm', html: '✔ 확인하기' });
        refs.checkBtn.addEventListener('click', manualCheck);
        actions.appendChild(refs.checkBtn);
      }
      refs.nextBtn = el('button', { class: 'btn btn-good btn-sm', html: '다음 미션 →', hidden: true });
      refs.nextBtn.addEventListener('click', next);
      actions.appendChild(refs.nextBtn);
      card.appendChild(actions);

      const foot = el('div', { class: 'game-foot' }, [
        el('span', { text: '전체 ' + (idx + 1) + ' / ' + flat.length }),
        el('button', { text: '↺ 처음부터', onclick: restartConfirm }),
      ]);
      bodyMission.append(head, dots, card, foot);

      opts.onMissionStart && opts.onMissionStart(m);
      if (m.setup) { try { m.setup(); } catch (e) { console.error(e); } }
      persist();
    }

    function points() { return Math.max(40, 100 - wrong * 25 - (hintUsed ? 20 : 0)); }

    function succeed() {
      if (state !== 'active') return;
      state = 'success';
      const m = flat[idx];
      const pts = points();
      score += pts;
      Sound.success();
      refs.card.classList.add('success');
      refs.hold.classList.remove('show');
      refs.feedback.className = 'mission-feedback good';
      refs.feedback.innerHTML = '🎉 성공! <b>+' + pts + '점</b>' + (wrong === 0 && !hintUsed ? ' (한 번에 성공!)' : '');
      if (m.explain) refs.card.insertBefore(el('div', { class: 'mission-explain', html: '<h4>🔍 왜 그럴까?</h4>' + m.explain }), refs.card.querySelector('.mission-actions'));
      if (refs.checkBtn) refs.checkBtn.hidden = true;
      if (refs.hintBtn) refs.hintBtn.hidden = true;
      const isLast = idx === flat.length - 1;
      const levelEnd = isLast || flat[idx + 1]._level !== m._level;
      refs.nextBtn.innerHTML = isLast ? '🏆 결과 보기' : levelEnd ? '레벨 완료! →' : '다음 미션 →';
      refs.nextBtn.hidden = false;
      const sp = bodyMission.querySelector('.score-pill');
      if (sp) sp.textContent = '점수 ' + score;
      const r = refs.card.getBoundingClientRect();
      confetti({ count: 50, x: r.left + r.width / 2, y: r.top + 40 });
      // 진행 상황 즉시 저장 (새로고침해도 다음 미션부터 이어서)
      if (levelEnd) setStars(levelStars(m._level));
      if (isLast) {
        finalScore = score;
        rec.best = Math.max(rec.best || 0, score);
        rec.cleared = true;
        rec.cursor = 0; rec.score = 0;
      } else {
        rec.cursor = idx + 1; rec.score = score;
      }
      Store.saveSim(simId, rec);
      setTimeout(() => refs.nextBtn && refs.nextBtn.focus({ preventScroll: true }), 50);
    }

    function fail(msg) {
      wrong++;
      Sound.fail();
      refs.card.classList.remove('shake'); void refs.card.offsetWidth; refs.card.classList.add('shake');
      refs.feedback.className = 'mission-feedback bad';
      refs.feedback.innerHTML = '🤔 ' + (msg || '아직 아니에요. 다시 생각해 보세요!');
    }

    function answer(i, btn) {
      if (state !== 'active') return;
      const m = flat[idx];
      if (i === m.answer) {
        btn.classList.add('right');
        refs.choices.forEach((b) => (b.disabled = true));
        succeed();
      } else {
        btn.classList.add('wrong');
        btn.disabled = true;
        fail(m.feedback && m.feedback[i]);
      }
    }

    function manualCheck() {
      if (state !== 'active') return;
      Sound.click();
      const m = flat[idx];
      let r;
      try { r = m.check(); } catch (e) { console.error(e); r = false; }
      if (r === true) succeed(); else fail(typeof r === 'string' ? r : null);
    }

    function next() {
      Sound.click();
      const m = flat[idx];
      const isLast = idx === flat.length - 1;
      const levelEnd = isLast || flat[idx + 1]._level !== m._level;
      if (levelEnd) {
        const stars = levelStars(m._level);
        if (isLast) { complete(); return; }
        idx++;
        persist();
        Sound.level();
        confetti({ count: 140 });
        modal({
          icon: '🎊',
          stars: stars,
          title: 'LEVEL ' + (m._level + 1) + ' 클리어!',
          html: '<b>' + levels[m._level].title + '</b> 완료!<br>현재 점수 <b>' + score + '점</b><br><br>다음: <b>LEVEL ' + (m._level + 2) + ' · ' + levels[m._level + 1].title + '</b>',
          buttons: [{ label: '다음 레벨 시작 →', primary: true, onClick: render }],
          dismissible: false,
        });
        return;
      }
      idx++;
      render();
    }

    function complete() {
      state = 'complete';
      idx = 0; score = 0;
      Sound.level();
      confetti({ count: 200 });
      const max = flat.length * 100;
      bodyMission.innerHTML = '';
      bodyMission.appendChild(el('div', { class: 'game-complete' }, [
        el('div', { class: 'big', text: '🏆' }),
        el('div', { class: 'modal-stars star-meter', style: 'font-size:34px;justify-content:center;display:flex', html: starsHTML(3) }),
        el('h3', { text: '모든 미션 완료!' }),
        el('p', { html: '최종 점수 <b>' + finalScore + '</b> / ' + max + '점<br>최고 기록 <b>' + rec.best + '점</b>' + (opts.badge ? '<br>획득한 칭호: <b>🏅 ' + opts.badge + '</b>' : '') }),
        el('div', { class: 'mission-actions', style: 'justify-content:center' }, [
          el('button', { class: 'btn', html: '↺ 다시 도전', onclick: () => { Sound.click(); render(); } }),
          el('a', { class: 'btn btn-primary', href: opts.homeHref || '../../index.html', html: '다른 실험 하러 가기' }),
        ]),
      ]));
      modal({
        icon: '🏆', stars: 3, title: '모든 미션 완료!',
        html: '최종 점수 <b>' + finalScore + '점</b>' + (opts.badge ? '<br>칭호 <b>🏅 ' + opts.badge + '</b> 획득!' : '') + '<br><br>📘 <b>핵심 원리</b> 탭에서 배운 내용을 정리해 보세요.',
        buttons: [{ label: '핵심 원리 보기', onClick: () => showTab('concept') }, { label: '확인', primary: true }],
      });
      opts.onComplete && opts.onComplete(finalScore);
    }

    function restartConfirm() {
      modal({
        icon: '↺', title: '처음부터 다시 할까요?', html: '현재 진행 중인 점수가 초기화됩니다.<br>(획득한 별은 그대로 남아요)',
        buttons: [{ label: '취소' }, { label: '처음부터', primary: true, onClick: () => { idx = 0; score = 0; render(); } }],
      });
    }

    // 실행형 미션 자동 확인 루프
    loop(() => {
      if (state !== 'active') return;
      const m = flat[idx];
      if (!m) return;
      if (m.status) {
        let s = '';
        try { s = m.status() || ''; } catch (e) { s = ''; }
        if (s !== lastStatus) { refs.status.innerHTML = s; lastStatus = s; }
      }
      if (m.type !== 'task' || m.manual || !m.check) return;
      let ok = false;
      try { ok = !!m.check(); } catch (e) { ok = false; }
      const hold = m.hold != null ? m.hold : 0.6;
      const now = performance.now();
      if (ok) {
        if (!holdStart) holdStart = now;
        const p = hold <= 0 ? 1 : Math.min(1, (now - holdStart) / (hold * 1000));
        if (hold > 0) { refs.hold.classList.add('show'); refs.hold.firstChild.style.width = (p * 100) + '%'; }
        if (p >= 1) succeed();
      } else {
        holdStart = 0;
        refs.hold.classList.remove('show');
      }
    });

    render();

    return {
      current: () => flat[idx],
      isActive: (m) => state === 'active' && flat[idx] === m,
      showTab,
      get index() { return idx; },
    };
  }

  global.SciSim = {
    Store, Sound, el, $, $$, toast, modal, confetti, stage, pointer, loop, bindRange,
    clamp, lerp, fmt, starsHTML, game, wireHeader,
  };
})(window);
