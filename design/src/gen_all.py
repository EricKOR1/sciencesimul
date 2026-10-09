# -*- coding: utf-8 -*-
"""모든 단원 설계를 합쳐 (1) design/units/uNN.md 차시 설계서, (2) design/src/plans_all.json(카탈로그 병합용)을 만든다.
실행: python3 design/src/gen_all.py && node design/src/merge_catalog.js design/src/plans_all.json"""
import json, os, re

import sys
REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')) + '/'
D = REPO + 'design/'

STD = json.load(open(D + 'curriculum/standards.json', encoding='utf-8'))
UNIT_TXT = json.load(open(D + 'curriculum/units.json', encoding='utf-8'))

FIX = [('추 론', '추론'), ('표 현', '표현'), ('유 용성', '유용성'), ('주변 에서', '주변에서'), ('통합적 으로', '통합적으로'),
       ('모형 으로', '모형으로'), ('조사 하여', '조사하여'), ('설명 할', '설명할'), ('분석 할', '분석할'), ('밤 하늘', '밤하늘'),
       ('용 어로', '용어로'), ('⋅', '·')]


def clean(t):
    for a, b in FIX:
        t = t.replace(a, b)
    return re.sub(r'\s+', ' ', t).strip()


units = {}
for f in ['design_g1.py', 'design_g2.py', 'design_g3.py']:
    ns = {}
    exec(open(D + 'src/' + f, encoding='utf-8').read(), ns)
    units.update(ns['UNITS'])
for f in ['u01', 'u05', 'u11', 'u19']:
    p = json.load(open(D + 'src/plans/%s.json' % f, encoding='utf-8'))
    units[p['unit']] = dict(hierarchy=p['hierarchy'], order=p['order'], sims=p['sims'])

# 카탈로그(현재)에서 단원 이름·학년·기존 차시를 읽는다
import subprocess
cat = json.loads(subprocess.check_output(['node', '-e', '''
const vm=require('vm'),fs=require('fs');const c={window:{}};
vm.runInNewContext(fs.readFileSync('%sassets/js/catalog.js','utf8'),c);
process.stdout.write(JSON.stringify(c.window.SCI_CATALOG));''' % REPO]).decode())
unit_meta = {}
n = 0
for g in cat['grades']:
    for u in g['units']:
        n += 1
        unit_meta[n] = dict(grade=g['id'], gname=g['name'], no=u['no'], title=u['title'], subject=u['subject'],
                            existing={s['id']: s for s in u['sims']})

GRADE_KO = {'g1': '중1', 'g2': '중2', 'g3': '중3'}
plans_out = []
os.makedirs(D + 'units', exist_ok=True)
summary = []
for un in sorted(units):
    d = units[un]
    m = unit_meta[un]
    sims = []
    for s in d['sims']:
        std = s['std'].replace('[', '').replace(']', '')
        s = dict(s)
        s['std'] = std
        s['stdText'] = clean(STD[std])
        sims.append(s)
    plans_out.append(dict(unit=un, order=d['order'], sims=[{k: s[k] for k in ('id', 'title', 'icon', 'std', 'stdText', 'desc', 'tags', 'steps')} for s in sims]))

    # ---- brief ----
    L = []
    L.append('# 단원 %d · %s %s. %s (%s)\n' % (un, GRADE_KO[m['grade']], m['no'], m['title'], m['subject']))
    L.append('머리글 표기: `.sim-unit` = "%s · %s. %s", 뒤로 가기 `../../index.html#%s`, `body data-subject="%s"`.\n'
             % (GRADE_KO[m['grade']], m['no'], m['title'], m['grade'], m['subject']))
    L.append('## 교육과정 원문 (성취기준·탐구 활동·해설·고려 사항 — 범위를 반드시 지킬 것)\n```\n' + UNIT_TXT[str(un)]['text'].strip() + '\n```\n')
    L.append('## 개념 위계와 차시 흐름\n' + d['hierarchy'].strip() + '\n')
    L.append('## 단원 차시 순서 (catalog 순서 = 다음 차시 순서)')
    by = {s['id']: s for s in sims}
    for i, sid in enumerate(d['order'], 1):
        if sid in by:
            s = by[sid]
            L.append('%d. `%s` %s %s [%s] — **새로 만들 차시**' % (i, sid, s['icon'], s['title'], s['std']))
        else:
            ex = m['existing'].get(sid)
            L.append('%d. `%s` %s — 기존 차시(수정 금지, 참고용)' % (i, sid, (ex['icon'] + ' ' + ex['title']) if ex else '?'))
    L.append('')
    for s in sims:
        L.append('---\n## `%s` · %s %s' % (s['id'], s['icon'], s['title']))
        L.append('- 성취기준 [%s] %s' % (s['std'], s['stdText']))
        L.append('- 카드 설명(desc): %s' % s['desc'])
        L.append('- 태그: %s / 단계 이름(steps → 각 STEP의 short와 맞출 것): %s' % (', '.join(s['tags']), ' · '.join(s['steps'])))
        if s.get('ref'):
            L.append('- **상세 설계 파일(반드시 먼저 읽기)**: ' + ', '.join('`%s`' % r for r in s['ref']))
        L.append('\n### 설계\n' + s['spec'].strip() + '\n')
    open(D + 'units/u%02d.md' % un, 'w', encoding='utf-8').write('\n'.join(L))
    summary.append('u%02d %s: %d new / order %d' % (un, m['title'], len(sims), len(d['order'])))

json.dump(plans_out, open(D + 'src/plans_all.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('\n'.join(summary))
print('total new sims:', sum(len(p['sims']) for p in plans_out))
