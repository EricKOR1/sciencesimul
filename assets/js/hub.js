/* 메인(목록) 페이지 */
(function () {
  'use strict';
  const { el, Store, starsHTML } = SciSim;
  const CAT = window.SCI_CATALOG;
  const levelEl = document.getElementById('levelRow');
  const gradeEl = document.getElementById('gradeRow');
  const unitEl = document.getElementById('unitRow');
  const listEl = document.getElementById('unitList');
  const searchEl = document.getElementById('search');
  const onlyReadyEl = document.getElementById('onlyReady');
  const statsEl = document.getElementById('heroStats');

  let current = (location.hash || '').replace('#', '') || Store.get('hubGrade', 'g1');
  if (!CAT.grades.some((g) => g.id === current)) current = 'g1';
  // 학교급: 중학교(ms) / 고등학교(그 밖의 모든 묶음)
  const LEVELS = [
    { id: 'ms', icon: '🏫', name: '중학생', sub: '중1 · 중2 · 중3' },
    { id: 'hs', icon: '🎓', name: '고등학생', sub: '통합과학 · 일반선택 · 진로선택' },
  ];
  const levelOf = (g) => ((g.group || 'ms') === 'ms' ? 'ms' : 'hs');
  const gradeById = (id) => CAT.grades.find((g) => g.id === id);
  // 학년(과목)마다 마지막으로 고른 단원 번호(없으면 전체)
  const unitPick = () => Store.get('hubUnit', {}) || {};
  const curUnit = () => { const v = unitPick()[current]; return typeof v === 'number' && v < gradeById(current).units.length ? v : -1; };
  onlyReadyEl.checked = !!Store.get('hubOnlyReady', false);

  function simsOf(grade) { return grade.units.flatMap((u) => u.sims).filter((s) => !s.soon); }
  const readyOf = (unit) => unit.sims.filter((s) => !s.soon);
  function starsOf(sims) {
    const all = Store.allSims();
    return sims.reduce((sum, s) => sum + ((all[s.id] && all[s.id].stars) || 0), 0);
  }

  function renderStats() {
    const sims = CAT.grades.flatMap(simsOf);
    const all = Store.allSims();
    const stars = starsOf(sims);
    const cleared = sims.filter((s) => all[s.id] && all[s.id].cleared).length;
    statsEl.innerHTML = '';
    statsEl.append(
      el('div', { class: 'stat' }, [el('div', { class: 'k', text: '⭐ 모은 별' }), el('div', { class: 'v', html: stars + ' <small>/ ' + sims.length * 3 + '</small>' })]),
      el('div', { class: 'stat' }, [el('div', { class: 'k', text: '🏅 완료한 실험' }), el('div', { class: 'v', html: cleared + ' <small>/ ' + sims.length + '</small>' })]),
    );
  }

  // 화면을 내리면 위에 나타나는 얇은 메뉴 바 (지금 선택 + 바꾸기)
  const crumbEl = el('div', { class: 'crumb-bar', 'aria-hidden': 'true' });
  document.body.appendChild(crumbEl);
  function renderCrumb() {
    const g = gradeById(current), cu = curUnit();
    const L = LEVELS.find((x) => x.id === levelOf(g));
    crumbEl.innerHTML = '';
    const parts = [L.icon + ' ' + L.name, g.group === 'ms' ? g.short : g.name];
    if (cu >= 0) parts.push(g.units[cu].no + '. ' + g.units[cu].title);
    crumbEl.append(
      el('span', { class: 'crumb-path', text: parts.join('  ›  ') }),
      el('button', { class: 'crumb-btn', text: '바꾸기 ▲', onclick: () => window.scrollTo({ top: Math.max(0, document.getElementById('picker').getBoundingClientRect().top + window.scrollY - 12), behavior: 'smooth' }) }),
    );
  }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((es) => es.forEach((e) => {
      const show = !e.isIntersecting && e.boundingClientRect.top < 0;
      crumbEl.classList.toggle('show', show); crumbEl.setAttribute('aria-hidden', show ? 'false' : 'true');
    }), { threshold: 0 }).observe(document.getElementById('picker'));
  }

  function pickGrade(id) {
    current = id;
    Store.set('hubGrade', current);
    Store.set('hubGrade_' + levelOf(gradeById(id)), current);
    Store.set('hubGrade_g_' + (gradeById(id).group || 'ms'), current);
    history.replaceState(null, '', '#' + current);
    searchEl.value = '';
    renderTabs();
    renderList();
  }

  function renderTabs() {
    const g = gradeById(current), lv = levelOf(g);
    // ① 학교급
    levelEl.innerHTML = '';
    LEVELS.forEach((L) => {
      const grades = CAT.grades.filter((x) => levelOf(x) === L.id);
      const n = grades.reduce((k, x) => k + simsOf(x).length, 0);
      const b = el('button', { class: 'lv-btn' + (L.id === lv ? ' on' : ''), role: 'tab', 'aria-selected': L.id === lv ? 'true' : 'false' }, [
        el('span', { class: 'lv-icon', text: L.icon }),
        el('span', { class: 'lv-text' }, [el('b', { text: L.name }), el('span', { text: L.sub })]),
        el('span', { class: 'lv-count', text: n + '차시' }),
      ]);
      b.addEventListener('click', () => {
        if (L.id === lv) return;
        const last = Store.get('hubGrade_' + L.id, null);
        pickGrade(last && gradeById(last) && levelOf(gradeById(last)) === L.id ? last : grades[0].id);
      });
      levelEl.appendChild(b);
    });
    // ② 학년(중학교) / 과목 구분 → 과목(고등학교)
    gradeEl.innerHTML = '';
    const GROUP_LABEL = { ms: '학년', hcommon: '공통 과목', hgeneral: '일반선택', hcareer: '진로선택', hfusion: '융합선택' };
    const GROUP_SUB = { hcommon: '고1 통합과학', hgeneral: '고2 물리·화학·생명·지구', hcareer: '고2–3 심화 과목', hfusion: '융합 과목' };
    const progTxt = (x) => { const r = simsOf(x).length, t = x.units.reduce((k, u) => k + u.sims.length, 0); return (r < t ? r + '/' + t : r) + '차시'; };
    const chip = (x, label) => {
      const sims = simsOf(x), on = x.id === current;
      const b = el('button', { class: 'gr-chip' + (on ? ' on' : ''), role: 'tab', 'aria-selected': on ? 'true' : 'false', title: x.name }, [
        el('b', { text: label }),
        el('span', { class: 'gr-meta', html: progTxt(x) + ' · <span class="st">★</span>' + starsOf(sims) }),
      ]);
      b.addEventListener('click', () => { if (!on) pickGrade(x.id); });
      return b;
    };
    const curGroup = g.group || 'ms';
    if (lv === 'ms') {
      gradeEl.appendChild(el('div', { class: 'gr-group' }, [el('span', { class: 'gr-label', text: '학년' }),
        el('div', { class: 'gr-chips' }, CAT.grades.filter((x) => levelOf(x) === 'ms').map((x) => chip(x, x.short)))]));
    } else {
      const keys = [];
      CAT.grades.forEach((x) => { const k = x.group || 'ms'; if (k !== 'ms' && !keys.includes(k)) keys.push(k); });
      gradeEl.appendChild(el('div', { class: 'gr-group' }, [el('span', { class: 'gr-label', text: '과목 구분' }),
        el('div', { class: 'gr-chips' }, keys.map((k) => {
          const on = k === curGroup, list = CAT.grades.filter((x) => (x.group || 'ms') === k);
          const b = el('button', { class: 'cat-chip' + (on ? ' on' : ''), role: 'tab', 'aria-selected': on ? 'true' : 'false' }, [
            el('b', { text: GROUP_LABEL[k] }), el('span', { text: GROUP_SUB[k] + ' · ' + list.length + '과목' }),
          ]);
          b.addEventListener('click', () => {
            if (on) return;
            const last = Store.get('hubGrade_g_' + k, null);
            pickGrade(last && gradeById(last) && gradeById(last).group === k ? last : list[0].id);
          });
          return b;
        }))]));
      gradeEl.appendChild(el('div', { class: 'gr-group' }, [el('span', { class: 'gr-label', text: '과목' }),
        el('div', { class: 'gr-chips' }, CAT.grades.filter((x) => (x.group || 'ms') === curGroup).map((x) => chip(x, x.name)))]));
    }
    renderCrumb();
    // ③ 단원
    unitEl.innerHTML = '';
    const cu = curUnit();
    const unitBtn = (idx, label, title) => {
      const on = idx === cu;
      const b = el('button', { class: 'un-chip' + (on ? ' on' : ''), role: 'tab', 'aria-selected': on ? 'true' : 'false', title: title || label }, label);
      b.addEventListener('click', () => {
        const m = Object.assign({}, unitPick()); m[current] = idx; Store.set('hubUnit', m);
        searchEl.value = '';
        renderTabs(); renderList();
      });
      return b;
    };
    unitEl.appendChild(el('span', { class: 'gr-label', text: '단원' }));
    unitEl.appendChild(unitBtn(-1, [el('b', { text: '전체' })], '모든 단원 보기'));
    g.units.forEach((u, i) => {
      const ready = readyOf(u).length;
      unitEl.appendChild(unitBtn(i, [el('span', { class: 'un-no', text: u.no }), el('span', { class: 'un-title', text: u.title }), el('span', { class: 'un-n', text: ready + (ready < u.sims.length ? '/' + u.sims.length : '') })], u.no + '. ' + u.title));
    });
  }

  function findSim(id) {
    for (const g of CAT.grades) for (const u of g.units) for (const s of u.sims) if (s.id === id) return { sim: s, grade: g };
    return null;
  }

  function soonCard(sim, unit, order) {
    return el('div', { class: 'sim-card soon', 'data-subject': unit.subject, 'aria-disabled': 'true', title: '준비 중이에요' }, [
      el('div', { class: 'sim-side' }, [
        el('span', { class: 'lesson-no', text: (order + 1) + '차시' }),
        el('div', { class: 'sim-icon', text: sim.icon }),
      ]),
      el('div', { class: 'sim-info' }, [
        sim.std ? el('span', { class: 'std-chip', text: '[' + sim.std + ']', title: sim.stdText || '' }) : null,
        el('h4', {}, [el('span', { text: sim.title }), el('span', { class: 'soon-badge', text: '🚧 준비 중' })]),
        el('p', { text: sim.desc }),
      ]),
    ]);
  }

  function simCard(sim, unit, grade, order) {
    if (sim.soon) return soonCard(sim, unit, order);
    const rec = Store.allSims()[sim.id] || {};
    const steps = sim.steps || [];
    const done = rec.cleared ? steps.length : Math.min(steps.length, rec.levelsDone || 0);
    const started = rec.cursor > 0 || done > 0;
    const path = steps.length ? el('ol', { class: 'path', 'aria-label': '학습 단계' }, steps.map((t, i) =>
      el('li', { class: i < done ? 'done' : i === done && started && !rec.cleared ? 'now' : '' }, [
        el('span', { class: 'pn', text: i < done ? '✓' : String(i + 1) }), el('span', { text: t }),
      ]))) : null;
    let prereq = null;
    if (sim.prereq) {
      const p = findSim(sim.prereq.id);
      if (p) prereq = el('div', { class: 'prereq', html: '🔗 먼저 하면 좋아요: <b>' + p.sim.icon + ' ' + p.sim.title + '</b> (' + sim.prereq.why + ')' });
    }
    const label = rec.cleared ? '↺ 다시 하기' : started ? '▶ 이어하기' : '▶ 시작';
    return el('a', { class: 'sim-card', href: sim.path, 'data-subject': unit.subject, 'aria-label': sim.title + ' 시작하기' }, [
      el('div', { class: 'sim-side' }, [
        el('span', { class: 'lesson-no', text: (order + 1) + '차시' }),
        el('div', { class: 'sim-icon', text: sim.icon }),
      ]),
      el('div', { class: 'sim-info' }, [
        sim.std ? el('span', { class: 'std-chip', text: '[' + sim.std + ']', title: sim.stdText || '' }) : null,
        el('h4', {}, [el('span', { text: sim.title }), rec.cleared ? el('span', { class: 'done-badge', text: '완료' }) : null]),
        el('p', { text: sim.desc }),
        path,
        prereq,
        el('div', { class: 'sim-meta' }, [
          el('span', { class: 'sim-stars', html: starsHTML(rec.stars || 0), title: '획득한 별 ' + (rec.stars || 0) + '개' }),
          steps.length ? el('span', { class: 'step-count', text: done + ' / ' + steps.length + '단계' }) : null,
          el('span', { class: 'play', text: label }),
        ]),
      ]),
    ]);
  }

  function unitBlock(unit, grade, sims, delay) {
    const subj = CAT.subjects[unit.subject];
    const box = el('article', { class: 'unit' + (unit.sims.length ? '' : ' empty'), 'data-subject': unit.subject, style: 'animation-delay:' + delay + 'ms' }, [
      el('div', { class: 'unit-head' }, [
        el('span', { class: 'unit-no', text: unit.no }),
        el('div', { class: 'unit-name' }, [
          el('h3', { text: unit.title }),
          el('span', { class: 'chip chip-subject', text: subj.name }),
        ]),
        el('span', { class: 'unit-count', text: unit.sims.length ? (readyOf(unit).length < unit.sims.length ? readyOf(unit).length + ' / ' + unit.sims.length + '차시 완성' : unit.sims.length + '차시') : '' }),
      ]),
    ]);
    const list = sims || unit.sims;
    if (list.length) {
      box.appendChild(el('div', { class: 'unit-sims' }, list.map((s) => simCard(s, unit, grade, unit.sims.indexOf(s)))));
    } else {
      box.appendChild(el('div', { class: 'unit-empty', text: '🚧 시뮬레이션 준비 중이에요' }));
    }
    return box;
  }

  function renderList() {
    const q = searchEl.value.trim().toLowerCase();
    listEl.innerHTML = '';
    if (q) {
      let n = 0;
      CAT.grades.forEach((g) => {
        const blocks = [];
        g.units.forEach((u) => {
          const unitHit = u.title.toLowerCase().includes(q);
          const hits = u.sims.filter((s) => unitHit || [s.title, s.desc].concat(s.tags).join(' ').toLowerCase().includes(q));
          if (hits.length || (unitHit && !onlyReadyEl.checked)) blocks.push(unitBlock(u, g, hits, blocks.length * 40));
          n += hits.length;
        });
        if (blocks.length) {
          listEl.appendChild(el('div', { class: 'search-head', text: g.name + ' (' + g.book + ')' }));
          blocks.forEach((b) => listEl.appendChild(b));
        }
      });
      if (!listEl.children.length) listEl.appendChild(el('div', { class: 'no-result', text: '‘' + searchEl.value + '’에 맞는 실험이 아직 없어요.' }));
      return;
    }
    const g = CAT.grades.find((x) => x.id === current);
    const cu = curUnit();
    let i = 0;
    g.units.forEach((u, ui) => {
      if (cu >= 0 && ui !== cu) return;
      if (onlyReadyEl.checked && !readyOf(u).length) return;
      listEl.appendChild(unitBlock(u, g, null, i++ * 40));
    });
  }

  searchEl.addEventListener('input', renderList);
  onlyReadyEl.addEventListener('change', () => { Store.set('hubOnlyReady', onlyReadyEl.checked); renderList(); });
  window.addEventListener('hashchange', () => {
    const h = location.hash.replace('#', '');
    if (CAT.grades.some((g) => g.id === h)) { current = h; renderTabs(); renderList(); }
  });
  // 실험 페이지에서 돌아왔을 때(뒤로 가기 캐시) 진행도 새로고침
  window.addEventListener('pageshow', () => { renderStats(); renderTabs(); renderList(); });

  document.getElementById('resetAll').addEventListener('click', () => {
    SciSim.modal({
      icon: '🗑️', title: '진행 기록을 지울까요?', html: '이 기기에 저장된 모든 별과 점수가 사라져요.',
      buttons: [{ label: '취소' }, {
        label: '모두 지우기', primary: true, onClick: () => {
          try { localStorage.removeItem('sciencesimul:v1'); } catch (e) { /* 무시 */ }
          renderStats(); renderTabs(); renderList();
          SciSim.toast('진행 기록을 지웠어요.');
        },
      }],
    });
  });
})();
