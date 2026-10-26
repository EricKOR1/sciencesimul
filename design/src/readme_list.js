/* README.md의 '수록된 시뮬레이션' 표를 catalog.js에서 다시 만듭니다.  node design/src/readme_list.js */
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..', '..');
global.window = {};
require(path.join(root, 'assets/js/catalog.js'));
const C = window.SCI_CATALOG;
const ready = (u) => u.sims.filter((s) => !s.soon);
let total = 0, out = '';
const head = (g) => (g.group || 'ms') === 'ms' ? g.name + ' (' + g.book + ')' : g.group === 'hcommon' ? g.name + ' (' + g.book + ')' : g.name + ' (' + g.book + ')';
const GROUP = { ms: '중학교', hcommon: '고등학교 공통 과목', hgeneral: '고등학교 일반선택', hcareer: '고등학교 진로선택' };
let lastGroup = '';
C.grades.forEach((g) => {
  const n = g.units.reduce((a, u) => a + ready(u).length, 0);
  if (!n) return;
  total += n;
  const grp = g.group || 'ms';
  if (grp !== lastGroup) { out += '\n### ' + GROUP[grp] + '\n'; lastGroup = grp; }
  out += '\n#### ' + head(g) + ' · ' + n + '차시\n\n| 단원 | 차시 · 성취기준 |\n| --- | --- |\n';
  g.units.forEach((u) => {
    const r = ready(u); if (!r.length) return;
    out += '| ' + u.no + '. ' + u.title + ' | ' + r.map((s, i) => (i + 1) + ' ' + s.icon + ' ' + s.title + (s.std ? ' [' + s.std + ']' : '')).join('<br>') + ' |\n';
  });
});
const p = path.join(root, 'README.md');
let md = fs.readFileSync(p, 'utf8');
const a = md.indexOf('## 수록된 시뮬레이션'), b = md.indexOf('성취기준 해설의 범위를 따랐습니다.');
if (a < 0 || b < 0) throw new Error('README markers not found');
md = md.slice(0, a) + '## 수록된 시뮬레이션 (' + total + '차시)\n' + out + '\n' + md.slice(b);
fs.writeFileSync(p, md);
console.log('README: ' + total + '차시');
