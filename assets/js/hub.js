/* 메인(목록) 페이지 */
(function () {
  'use strict';
  const { el, Store, starsHTML } = SciSim;
  const CAT = window.SCI_CATALOG;
  const tabsEl = document.getElementById('gradeTabs');
  const listEl = document.getElementById('unitList');
  const searchEl = document.getElementById('search');
  const onlyReadyEl = document.getElementById('onlyReady');
  const statsEl = document.getElementById('heroStats');

  let current = (location.hash || '').replace('#', '') || Store.get('hubGrade', 'g1');
  if (!CAT.grades.some((g) => g.id === current)) current = 'g1';
  onlyReadyEl.checked = !!Store.get('hubOnlyReady', false);

  function simsOf(grade) { return grade.units.flatMap((u) => u.sims); }
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

  function renderTabs() {
    tabsEl.innerHTML = '';
    CAT.grades.forEach((g, i) => {
      const sims = simsOf(g);
      const b = el('button', { class: 'grade-tab' + (g.id === current ? ' on' : ''), role: 'tab', 'aria-selected': g.id === current ? 'true' : 'false' }, [
        el('span', { class: 'gnum', text: String(i + 1) }),
        el('span', { class: 'gtext' }, [el('b', { text: g.name }), el('span', { text: g.book + ' · ' + g.units.length + '개 단원' })]),
        el('span', { class: 'gprog', html: '실험 ' + sims.length + '개<br><span class="st">★</span> ' + starsOf(sims) + '/' + sims.length * 3 }),
      ]);
      b.addEventListener('click', () => {
        current = g.id;
        Store.set('hubGrade', current);
        history.replaceState(null, '', '#' + current);
        searchEl.value = '';
        renderTabs();
        renderList();
      });
      tabsEl.appendChild(b);
    });
  }

  function simCard(sim, unit, grade) {
    const rec = Store.allSims()[sim.id] || {};
    const subj = CAT.subjects[unit.subject];
    return el('a', { class: 'sim-card', href: sim.path, 'data-subject': unit.subject, 'aria-label': sim.title + ' 시작하기' }, [
      el('div', { class: 'sim-icon', text: sim.icon }),
      el('div', { class: 'sim-info' }, [
        el('h4', {}, [el('span', { text: sim.title }), rec.cleared ? el('span', { class: 'done-badge', text: '완료' }) : null]),
        el('p', { text: sim.desc }),
        el('div', { class: 'sim-tags' }, sim.tags.map((t) => el('span', { class: 'chip', text: t }))),
        el('div', { class: 'sim-meta' }, [
          el('span', { class: 'sim-stars', html: starsHTML(rec.stars || 0), title: '획득한 별 ' + (rec.stars || 0) + '개' }),
          el('span', { class: 'play', text: rec.cursor > 0 && !rec.cleared ? '▶ 이어하기' : '▶ 시작' }),
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
        el('span', { class: 'unit-count', text: unit.sims.length ? '실험 ' + unit.sims.length + '개' : '' }),
      ]),
    ]);
    const list = sims || unit.sims;
    if (list.length) {
      box.appendChild(el('div', { class: 'unit-sims' }, list.map((s) => simCard(s, unit, grade))));
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
    let i = 0;
    g.units.forEach((u) => {
      if (onlyReadyEl.checked && !u.sims.length) return;
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
