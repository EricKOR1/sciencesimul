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
     const view = SciSim.stage(canvas, { width: 800, height: 520, background: '#fff' });
     view.ctx 로 그리기 (좌표는 0~800, 0~520)
     캔버스는 부모 .stage-canvas 상자(없으면 자동 생성) 안에 비율을 유지하며 꽉 차게 배치됩니다. */
  function stage(canvas, opts) {
    opts = opts || {};
    const vw = opts.width || 800, vh = opts.height || 500;
    const ctx = canvas.getContext('2d');
    const view = { canvas, ctx, vw, vh, w: vw, h: vh, scale: 1, dpr: 1 };
    let wrap = canvas.parentElement;
    if (!wrap || !wrap.classList.contains('stage-canvas')) {
      wrap = el('div', { class: 'stage-canvas' });
      canvas.parentNode.insertBefore(wrap, canvas);
      wrap.appendChild(canvas);
    }
    view.wrap = wrap;
    wrap.style.setProperty('--stage-ar', vw + ' / ' + vh);
    wrap.style.setProperty('--stage-hr', (vh / vw).toFixed(4));
    if (opts.background) wrap.style.setProperty('--stage-bg', opts.background);
    canvas.style.touchAction = 'none';
    function resize() {
      if (!canvas.isConnected) return;
      let W = wrap.clientWidth, H = wrap.clientHeight;
      if (W < 2) return;
      if (H < 2) { H = W * vh / vw; wrap.style.height = H + 'px'; }
      const s = Math.min(W / vw, H / vh);
      const cw = Math.max(1, Math.floor(vw * s)), ch = Math.max(1, Math.floor(vh * s));
      const dpr = Math.min(global.devicePixelRatio || 1, 2);
      canvas.style.width = cw + 'px';
      canvas.style.height = ch + 'px';
      view.dpr = dpr;
      view.scale = cw / vw;
      canvas.width = Math.round(cw * dpr);
      canvas.height = Math.round(ch * dpr);
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
    view.resize = resize;
    if (global.ResizeObserver) new ResizeObserver(resize).observe(wrap);
    global.addEventListener('resize', resize);
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
      // 첫 프레임의 t가 last보다 앞설 수 있어 음수가 되지 않도록 0~0.05초로 제한
      const dt = Math.max(0, Math.min(0.05, (t - last) / 1000));
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

  /* ---------------- 헤더 (효과음, 전체 화면, 별) ---------------- */
  function wireHeader(simId) {
    const sb = $('#soundBtn');
    if (sb) {
      const upd = () => { sb.textContent = Sound.muted ? '🔇' : '🔊'; sb.title = Sound.muted ? '효과음 켜기' : '효과음 끄기'; sb.setAttribute('aria-label', sb.title); };
      upd();
      sb.addEventListener('click', () => { Sound.setMuted(!Sound.muted); upd(); Sound.click(); });
    }
    // 전체 화면 버튼 (지원하는 기기에서만)
    const root = document.documentElement;
    const canFs = root.requestFullscreen || root.webkitRequestFullscreen;
    const right = $('.sim-header-right');
    if (canFs && right && !$('#fsBtn')) {
      const fb = el('button', { class: 'icon-btn', id: 'fsBtn', type: 'button', title: '전체 화면', 'aria-label': '전체 화면', text: '⛶' });
      fb.addEventListener('click', () => {
        Sound.click();
        const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
        try {
          if (fsEl) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
          else (root.requestFullscreen || root.webkitRequestFullscreen).call(root);
        } catch (e) { /* 무시 */ }
      });
      right.insertBefore(fb, sb || null);
    }
    const sm = $('#starMeter');
    if (sm && simId) sm.innerHTML = starsHTML(Store.sim(simId).stars);
  }

  /* =========================================================
     미션(게임) 엔진 - 단계별 학습
     개념의 위계에 따라 '단계(STEP)'를 차례로 진행합니다.
     각 단계는 앞 단계와 연결되는 소개 → 미션 → 정리 순서로 진행되고,
     단계마다 새 도구(feature)가 하나씩 열립니다.

     SciSim.game({
       simId: 'm1-gas-law', mount: '#game', badge: '기체 박사', homeHref: '../../index.html#g1',
       featureLabels: { gauge: '🧭 압력계', ... },    // 단계 소개에 보여 줄 새 도구 이름
       onFeatures(set, added) {},                   // 열린 도구가 바뀔 때 (set: Set)
       levels: [
         {
           title: '압력: 입자의 충돌', short: '압력', icon: '🧭',
           intro: '<p>앞 단계와의 연결 + 이번 단계 목표</p>',
           features: ['gauge', 'hits'],             // 이 단계에서 새로 여는 도구
           setup() {},                               // 단계 시작 시 실험 상태 준비 (선택)
           recap: '한 줄 정리',                        // 단계 완료 창에 표시
           summary: '<p>배운 내용 공책에 쌓이는 정리</p>',
           missions: [
             // 실행형: check()가 hold초 동안 true면 성공
             { title, goal, hint, check: () => bool, hold: 0.8, status: () => '...', setup(){}, explain },
             // 확인 버튼형: manual: true, check()가 true면 성공 / 문자열이면 피드백
             { title, goal, manual: true, check: () => true | '피드백', explain },
             // 퀴즈형
             { type: 'quiz', title, goal: '질문', choices: [...], answer: 1, feedback: [...], explain },
           ],
         },
       ],
       onMissionStart(m) {}, onComplete(score) {}
     })
     반환값: game.has(name), game.isNew(name), game.level, game.free ...
     HTML 요소에 data-feature="이름"을 달면 그 도구가 열릴 때까지 자동으로 숨겨집니다.
     ========================================================= */
  /* 목록(catalog.js)에서 이 실험의 학년·단원·성취기준·차시 순서를 찾기 */
  function catalogInfo(simId) {
    const CAT = global.SCI_CATALOG;
    if (!CAT) return null;
    for (const g of CAT.grades) {
      for (let ui = 0; ui < g.units.length; ui++) {
        const u = g.units[ui];
        const i = u.sims.findIndex((x) => x.id === simId);
        if (i >= 0) {
          // 아직 만들지 않은(준비 중) 차시는 '다음 차시'에서 건너뜀
          const next = u.sims.slice(i + 1).find((x) => !x.soon) || null;
          return { grade: g, unit: u, sim: u.sims[i], index: i, next, prev: u.sims[i - 1] || null };
        }
      }
    }
    return null;
  }
  const PHASE_ICON = { '관찰': '👀', '실험': '🧪', '탐구': '🔎', '모형': '🧩', '설명': '💡', '확인': '✅', '적용': '🏠', '예측': '🎯', '기록': '📋', '분석': '📊', '복습': '🔁', '정리': '📝' };

  function game(opts) {
    const mount = typeof opts.mount === 'string' ? $(opts.mount) : opts.mount;
    const simId = opts.simId;
    const levels = opts.levels;
    const labels = opts.featureLabels || {};
    const hasNotes = levels.some((lv) => lv.summary);
    const flat = [];
    levels.forEach((lv, li) => lv.missions.forEach((m, mi) => {
      m._level = li; m._index = mi; m._flat = flat.length;
      if (!m.type) m.type = m.choices ? 'quiz' : 'task';
      flat.push(m);
    }));
    const firstOf = (li) => flat.findIndex((m) => m._level === li);
    const info = catalogInfo(opts.simId);
    const std = opts.standard || (info && info.sim.std ? { code: info.sim.std, text: info.sim.stdText } : null);
    function stdBox() {
      if (!std) return null;
      return el('div', { class: 'std-box' }, [
        el('div', { class: 'std-k', html: '📜 성취기준 <b>[' + std.code + ']</b>' }),
        el('div', { class: 'std-t', text: std.text || '' }),
      ]);
    }
    function unitSeq() {
      if (!info || info.unit.sims.length < 2) return null;
      return el('div', { class: 'unit-seq' }, [
        el('div', { class: 'us-k', text: '🧭 ' + info.unit.title + ' 단원 학습 순서' }),
        el('ol', {}, info.unit.sims.map((x, i) => el('li', { class: i === info.index ? 'now' : x.soon ? 'soon' : '', title: x.soon ? '준비 중' : '' }, [
          el('span', { class: 'n', text: String(i + 1) }), el('span', { text: x.icon + ' ' + x.title }),
        ]))),
      ]);
    }
    const phaseOf = (lv) => (lv.phase ? (PHASE_ICON[lv.phase] ? PHASE_ICON[lv.phase] + ' ' : '') + lv.phase : '');
    const allFeatures = new Set();
    levels.forEach((lv) => (lv.features || []).forEach((f) => allFeatures.add(f)));

    let rec = Store.sim(simId);
    if (rec.cursor >= flat.length || rec.cursor < 0) { rec.cursor = 0; rec.score = 0; }
    if (rec.levelsDone == null) rec.levelsDone = rec.cleared ? levels.length : Math.max(0, flat[rec.cursor]._level);
    let idx = rec.cursor;
    let score = rec.score || 0;
    let phase = 'intro';        // intro | active | success | complete
    let free = false;           // 자유 탐구 모드(모든 도구 열림)
    let wrong = 0, hintUsed = false, holdStart = 0, lastStatus = null, finalScore = 0;
    const unlocked = new Set();
    const newAt = {};
    let notesFresh = -1;

    wireHeader(simId);
    mount.classList.add('game');
    mount.innerHTML = '';

    const tabs = el('div', { class: 'game-tabs', role: 'tablist' });
    const tabMission = el('button', { class: 'on', role: 'tab', html: '🎯 미션' });
    const tabConcept = el('button', { role: 'tab', html: hasNotes ? '📘 배운 내용' : '📘 핵심 원리' });
    tabs.append(tabMission, tabConcept);
    const bodyMission = el('div', { class: 'game-body' });
    const bodyConcept = el('div', { class: 'game-body concept', hidden: true });
    mount.append(tabs, bodyMission, bodyConcept);
    function showTab(which) {
      tabMission.classList.toggle('on', which === 'mission');
      tabConcept.classList.toggle('on', which === 'concept');
      bodyMission.hidden = which !== 'mission';
      bodyConcept.hidden = which !== 'concept';
      if (which === 'concept') { renderNotes(); tabConcept.innerHTML = hasNotes ? '📘 배운 내용' : '📘 핵심 원리'; }
      const sc = mount.closest('.side-col');
      if (sc && sc.scrollTop > mount.offsetTop) sc.scrollTop = mount.offsetTop - 8;
    }
    // 새 단계·미션을 시작할 때 오른쪽 패널을 맨 위로 (이전 미션에서 내려간 스크롤 때문에 조작 도구가 가려지지 않게)
    function resetPanelScroll() {
      const sc = mount.closest('.side-col');
      if (sc && sc.scrollTop) sc.scrollTop = 0;
      if (mount.scrollTop) mount.scrollTop = 0;
    }
    tabMission.addEventListener('click', () => { Sound.click(); showTab('mission'); });
    tabConcept.addEventListener('click', () => { Sound.click(); showTab('concept'); });

    let refs = {};

    /* ---- 도구(feature) 열기 ---- */
    function featuresUpTo(li) {
      const s = new Set();
      for (let i = 0; i <= li && i < levels.length; i++) (levels[i].features || []).forEach((f) => s.add(f));
      return s;
    }
    function applyFeatures(set, highlight) {
      const added = [];
      set.forEach((f) => { if (!unlocked.has(f)) added.push(f); });
      unlocked.clear();
      set.forEach((f) => unlocked.add(f));
      const now = performance.now();
      if (highlight) added.forEach((f) => { newAt[f] = now; });
      $$('[data-feature]').forEach((node) => {
        const names = node.getAttribute('data-feature').split(/\s+/).filter(Boolean);
        const on = names.every((n) => unlocked.has(n));
        const wasHidden = node.hidden;
        node.hidden = !on;
        if (on && wasHidden && highlight && names.some((n) => added.indexOf(n) >= 0)) {
          node.classList.remove('feature-new'); void node.offsetWidth; node.classList.add('feature-new');
          setTimeout(() => node.classList.remove('feature-new'), 4600);
        }
      });
      if (opts.onFeatures) { try { opts.onFeatures(unlocked, added); } catch (e) { console.error(e); } }
    }
    const has = (name) => free || unlocked.has(name);
    const isNew = (name) => newAt[name] != null && performance.now() - newAt[name] < 6000;

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
    function levelStars(li) { return Math.floor(((li + 1) / levels.length) * 3 + 1e-9); }
    const stepLabel = (li) => (levels[li].short || levels[li].title);

    /* ---- 학습 단계 표시줄 ---- */
    function stepper(cur) {
      const box = el('div', { class: 'stepper', role: 'list', 'aria-label': '학습 단계' });
      levels.forEach((lv, i) => {
        const done = free || i < rec.levelsDone;
        const open = (free || i <= rec.levelsDone) && i !== cur && phase !== 'complete' || (phase === 'complete');
        const cls = 'st' + (i === cur && phase !== 'complete' ? ' now' : done ? ' done' : '') + (open ? ' open' : '');
        const b = el('button', { class: cls, type: 'button', role: 'listitem', title: (i + 1) + '단계 · ' + lv.title + (open ? '' : ' (잠김)') }, [
          el('span', { class: 'c', text: done && i !== cur ? '✓' : String(i + 1) }),
          el('span', { class: 'l', text: stepLabel(i) }),
        ]);
        if (open) b.addEventListener('click', () => { Sound.click(); free = false; idx = firstOf(i); renderIntro(i, false); });
        else b.disabled = i !== cur;
        box.appendChild(b);
      });
      return box;
    }

    function footer() {
      return el('div', { class: 'game-foot' }, [
        el('span', { text: 'STEP ' + (flat[idx]._level + 1) + ' / ' + levels.length + ' · 미션 ' + (idx + 1) + ' / ' + flat.length }),
        el('button', { type: 'button', text: '↺ 처음부터', onclick: restartConfirm }),
      ]);
    }

    /* ---- 단계 소개 ---- */
    function renderIntro(li, highlight) {
      phase = 'intro';
      idx = firstOf(li);
      const lv = levels[li];
      applyFeatures(featuresUpTo(li), highlight !== false);
      if (lv.setup) { try { lv.setup(); } catch (e) { console.error(e); } }
      bodyMission.innerHTML = '';
      resetPanelScroll();
      const card = el('div', { class: 'step-intro' });
      card.appendChild(el('div', { class: 'si-top' }, [
        el('div', { class: 'si-icon', text: lv.icon || '🔬' }),
        el('div', {}, [
          el('div', { class: 'si-kicker', text: 'STEP ' + (li + 1) + ' / ' + levels.length + (lv.phase ? ' · ' + phaseOf(lv) : '') }),
          el('h3', { html: lv.title }),
        ]),
      ]));
      if (li === 0) { const sb = stdBox(); if (sb) card.appendChild(sb); }
      if (lv.intro) card.appendChild(el('div', { class: 'si-body', html: lv.intro }));
      if (li === 0 && levels.length > 1) {
        const rm = el('ol', { class: 'roadmap' });
        levels.forEach((l, i) => rm.appendChild(el('li', { class: i === 0 ? 'now' : '', text: (l.phase ? '[' + l.phase + '] ' : '') + l.title })));
        card.appendChild(el('div', { class: 'si-link' }, [el('b', { text: '🗺️ 이렇게 차근차근 배워요' }), rm]));
      }
      if (li === 0) { const us = unitSeq(); if (us) card.appendChild(us); }
      const tools = (lv.features || []).filter((f) => labels[f]);
      if (tools.length) {
        card.appendChild(el('div', { class: 'si-tools' }, [
          el('div', { class: 't-label', text: li === 0 ? '🧰 사용할 도구' : '🔓 새로 열린 도구' }),
          el('div', {}, tools.map((f) => el('span', { class: 'tool-chip', html: labels[f] }))),
        ]));
      }
      const go = el('button', { class: 'btn btn-subject btn-block', type: 'button', html: '▶ ' + (li + 1) + '단계 시작하기' });
      go.addEventListener('click', () => { Sound.click(); renderMission(); });
      card.appendChild(go);
      bodyMission.append(stepper(li), card, footer());
      persist();
      if (!bodyConcept.hidden) renderNotes();
    }

    /* ---- 미션 ---- */
    function renderMission() {
      const m = flat[idx];
      const lv = levels[m._level];
      if (!free) applyFeatures(featuresUpTo(m._level), false);
      wrong = 0; hintUsed = false; holdStart = 0; lastStatus = null; phase = 'active';
      bodyMission.innerHTML = '';
      resetPanelScroll();

      const head = el('div', { class: 'level-head' }, [
        el('span', { class: 'level-badge', text: 'STEP ' + (m._level + 1) + (lv.phase ? ' · ' + lv.phase : '') }),
        el('span', { class: 'level-name', html: lv.title }),
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
          const b = el('button', { class: 'choice', type: 'button' }, [el('span', { class: 'key', text: String(i + 1) }), el('span', { html: c })]);
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
        refs.hintBtn = el('button', { class: 'btn btn-sm', type: 'button', html: '💡 힌트' });
        refs.hintBtn.addEventListener('click', () => {
          Sound.click();
          hintUsed = true;
          refs.feedback.className = 'mission-feedback hint';
          refs.feedback.innerHTML = '💡 ' + m.hint;
          if (opts.onHint) { try { opts.onHint(m); } catch (e) { console.error(e); } }
        });
        actions.appendChild(refs.hintBtn);
      }
      actions.appendChild(el('span', { class: 'grow' }));
      if (m.type === 'task' && m.manual) {
        refs.checkBtn = el('button', { class: 'btn btn-primary btn-sm', type: 'button', html: '✔ 확인하기' });
        refs.checkBtn.addEventListener('click', manualCheck);
        actions.appendChild(refs.checkBtn);
      }
      refs.nextBtn = el('button', { class: 'btn btn-good btn-sm', type: 'button', html: '다음 미션 →', hidden: true });
      refs.nextBtn.addEventListener('click', next);
      actions.appendChild(refs.nextBtn);
      card.appendChild(actions);

      bodyMission.append(stepper(m._level), head, dots, card, footer());

      opts.onMissionStart && opts.onMissionStart(m);
      if (m.setup) { try { m.setup(); } catch (e) { console.error(e); } }
      persist();
    }

    function points() { return Math.max(40, 100 - wrong * 25 - (hintUsed ? 20 : 0)); }

    function succeed() {
      if (phase !== 'active') return;
      phase = 'success';
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
      refs.nextBtn.innerHTML = isLast ? '🏆 결과 보기' : levelEnd ? '✔ ' + (m._level + 1) + '단계 완료!' : '다음 미션 →';
      refs.nextBtn.hidden = false;
      const sp = bodyMission.querySelector('.score-pill');
      if (sp) sp.textContent = '점수 ' + score;
      const r = refs.card.getBoundingClientRect();
      confetti({ count: 50, x: r.left + r.width / 2, y: r.top + 40 });
      // 진행 상황 즉시 저장 (새로고침해도 다음 미션부터 이어서)
      if (levelEnd) {
        setStars(levelStars(m._level));
        if (m._level + 1 > rec.levelsDone) { rec.levelsDone = m._level + 1; notesFresh = m._level; }
        if (hasNotes) tabConcept.innerHTML = '📘 배운 내용 <span style="color:var(--good)">●</span>';
      }
      if (isLast) {
        finalScore = score;
        rec.best = Math.max(rec.best || 0, score);
        rec.cleared = true;
        rec.cursor = 0; rec.score = 0;
      } else {
        rec.cursor = idx + 1; rec.score = score;
      }
      Store.saveSim(simId, rec);
      setTimeout(() => { if (refs.nextBtn) { refs.nextBtn.focus({ preventScroll: true }); refs.nextBtn.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } }, 80);
    }

    function fail(msg) {
      wrong++;
      Sound.fail();
      refs.card.classList.remove('shake'); void refs.card.offsetWidth; refs.card.classList.add('shake');
      refs.feedback.className = 'mission-feedback bad';
      refs.feedback.innerHTML = '🤔 ' + (msg || '아직 아니에요. 다시 생각해 보세요!');
    }

    function answer(i, btn) {
      if (phase !== 'active') return;
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
      if (phase !== 'active') return;
      Sound.click();
      const m = flat[idx];
      let r;
      try { r = m.check(); } catch (e) { console.error(e); r = false; }
      if (r === true) succeed(); else fail(typeof r === 'string' ? r : null);
    }

    function next() {
      Sound.click();
      const m = flat[idx];
      const li = m._level;
      const isLast = idx === flat.length - 1;
      const levelEnd = isLast || flat[idx + 1]._level !== li;
      if (!levelEnd) { idx++; renderMission(); return; }
      if (isLast) { complete(); return; }
      idx++;
      persist();
      Sound.level();
      confetti({ count: 140 });
      const lv = levels[li], nx = levels[li + 1];
      const tools = (nx.features || []).filter((f) => labels[f]);
      modal({
        icon: lv.icon || '🎊',
        stars: rec.stars,
        title: (li + 1) + '단계 완료!',
        html: '<b>' + lv.title + '</b>을(를) 마쳤어요. 현재 점수 <b>' + score + '점</b>' +
          (lv.recap ? '<div class="learned"><b class="k">✏️ 이번 단계에서 배운 것</b>' + lv.recap + '</div>' : '') +
          '<div class="next-step">➡️ <b>다음: ' + (li + 2) + '단계 · ' + nx.title + '</b>' +
          (tools.length ? '<div style="margin-top:6px">' + tools.map((f) => '<span class="tool-chip">' + labels[f] + '</span>').join('') + '</div>' : '') + '</div>',
        buttons: [{ label: '다음 단계로 →', primary: true, onClick: () => renderIntro(li + 1, true) }],
        dismissible: false,
      });
    }

    function complete() {
      phase = 'complete';
      free = true;
      applyFeatures(allFeatures, false);
      idx = 0; score = 0;
      Sound.level();
      confetti({ count: 200 });
      const max = flat.length * 100;
      bodyMission.innerHTML = '';
      bodyMission.appendChild(stepper(-1));
      bodyMission.appendChild(el('div', { class: 'game-complete' }, [
        el('div', { class: 'big', text: '🏆' }),
        el('div', { class: 'modal-stars star-meter', style: 'font-size:34px;justify-content:center;display:flex', html: starsHTML(3) }),
        el('h3', { text: '모든 단계 완료!' }),
        el('p', { html: '최종 점수 <b>' + finalScore + '</b> / ' + max + '점 · 최고 기록 <b>' + rec.best + '점</b>' + (opts.badge ? '<br>획득한 칭호: <b>🏅 ' + opts.badge + '</b>' : '') + '<br><br>🔓 이제 <b>모든 도구</b>가 열렸어요. 자유롭게 탐구해 보세요!<br>위 단계 번호를 누르면 원하는 단계를 다시 할 수 있어요.' }),
        el('div', { class: 'mission-actions', style: 'justify-content:center' }, [
          el('button', { class: 'btn', type: 'button', html: '📘 배운 내용', onclick: () => { Sound.click(); showTab('concept'); } }),
          el('button', { class: 'btn', type: 'button', html: '↺ 처음부터', onclick: () => { Sound.click(); free = false; score = 0; renderIntro(0, false); } }),
          info && info.next
            ? el('a', { class: 'btn btn-primary', href: '../../' + info.next.path, html: '다음 차시: ' + info.next.icon + ' ' + info.next.title + ' →' })
            : el('a', { class: 'btn btn-primary', href: opts.homeHref || '../../index.html', html: '다른 실험 하러 가기' }),
        ]),
      ]));
      modal({
        icon: '🏆', stars: 3, title: '모든 단계 완료!',
        html: '최종 점수 <b>' + finalScore + '점</b>' + (opts.badge ? '<br>칭호 <b>🏅 ' + opts.badge + '</b> 획득!' : '') + '<br><br>📘 <b>배운 내용</b>에 단계별 정리가 모두 모였어요.',
        buttons: info && info.next
          ? [{ label: '배운 내용 보기', onClick: () => showTab('concept') }, { label: '자유 탐구하기' }, { label: '다음 차시 →', primary: true, onClick: () => { location.href = '../../' + info.next.path; } }]
          : [{ label: '배운 내용 보기', onClick: () => showTab('concept') }, { label: '자유 탐구하기', primary: true }],
      });
      opts.onComplete && opts.onComplete(finalScore);
    }

    function restartConfirm() {
      modal({
        icon: '↺', title: '처음부터 다시 할까요?', html: '현재 진행 중인 점수가 초기화됩니다.<br>(획득한 별과 열린 단계는 그대로 남아요)',
        buttons: [{ label: '취소' }, { label: '처음부터', primary: true, onClick: () => { free = false; score = 0; renderIntro(0, false); } }],
      });
    }

    /* ---- 배운 내용(공책) ---- */
    function renderNotes() {
      if (!hasNotes) { bodyConcept.innerHTML = opts.concept || ''; return; }
      bodyConcept.innerHTML = '';
      { const sb = stdBox(); if (sb) bodyConcept.appendChild(sb); }
      const cur = phase === 'complete' ? -1 : flat[idx]._level;
      levels.forEach((lv, i) => {
        const done = free || i < rec.levelsDone;
        if (done) {
          bodyConcept.appendChild(el('div', { class: 'note-step' + (i === notesFresh ? ' fresh' : '') }, [
            el('div', { class: 'ns-head' }, [el('span', { class: 'n', text: String(i + 1) }), el('span', { html: lv.title })]),
            el('div', { html: lv.summary || '' }),
          ]));
        } else if (i === cur) {
          bodyConcept.appendChild(el('div', { class: 'note-step current' }, [
            el('div', { class: 'ns-head' }, [el('span', { class: 'n', text: String(i + 1) }), el('span', { html: lv.title })]),
            el('div', { class: 'ns-sub', text: '✏️ 지금 공부 중이에요. 이 단계를 마치면 정리가 여기에 적혀요.' }),
          ]));
        } else {
          bodyConcept.appendChild(el('div', { class: 'note-step locked' }, [
            el('div', { class: 'ns-head' }, [el('span', { class: 'n', text: String(i + 1) }), el('span', { text: '🔒 ' + lv.title })]),
          ]));
        }
      });
      if (opts.concept && (free || rec.cleared)) bodyConcept.appendChild(el('div', { html: opts.concept }));
      notesFresh = -1;
    }

    // 실행형 미션 자동 확인 루프
    loop(() => {
      if (phase !== 'active') return;
      const m = flat[idx];
      if (!m) return;
      if (m.status) {
        let s = '';
        try { s = m.status() || ''; } catch (e) { s = ''; }
        if (s !== lastStatus) { refs.status.innerHTML = s; lastStatus = s; }
      }
      // 확인 버튼형: 틀렸다는 표시가 남아 있는데 학생이 고쳐서 이제 맞으면 안내로 바꿔 줌
      if (m.type === 'task' && m.manual && m.check && refs.feedback && refs.feedback.classList.contains('bad')) {
        const nowT = performance.now();
        if (!refs._lastPoll || nowT - refs._lastPoll > 300) {
          refs._lastPoll = nowT;
          let r = false;
          try { r = m.check(); } catch (e) { r = false; }
          if (r === true) { refs.feedback.className = 'mission-feedback hint'; refs.feedback.innerHTML = '✨ 좋아요! 이제 <b>✔ 확인하기</b>를 눌러 보세요.'; }
        }
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

    const api = {
      has, isNew,
      current: () => flat[idx],
      isActive: (m) => phase === 'active' && flat[idx] === m,
      showTab,
      get index() { return idx; },
      get level() { return flat[idx] ? flat[idx]._level : 0; },
      get phase() { return phase; },
      get free() { return free; },
    };

    // 시작: 단계의 첫 미션이면 단계 소개부터, 중간이면 이어서
    if (flat[idx]._index === 0) renderIntro(flat[idx]._level, false);
    else { applyFeatures(featuresUpTo(flat[idx]._level), false); renderMission(); }

    return api;
  }

  global.SciSim = {
    catalogInfo, Store, Sound, el, $, $$, toast, modal, confetti, stage, pointer, loop, bindRange,
    clamp, lerp, fmt, starsHTML, game, wireHeader,
  };
})(window);
