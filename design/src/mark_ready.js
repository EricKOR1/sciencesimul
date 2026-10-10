// node design/src/mark_ready.js <id> [<id>...]  → 검수를 마친 차시의 soon(준비 중) 표시를 지운다
const fs = require('fs'), vm = require('vm'), path = require('path');
const CAT_PATH = path.resolve(__dirname, '..', '..', 'assets/js/catalog.js');
const ids = process.argv.slice(2);
const ctx = { window: {} };
vm.runInNewContext(fs.readFileSync(CAT_PATH, 'utf8'), ctx);
const CAT = ctx.window.SCI_CATALOG;
const done = [];
CAT.grades.forEach((g) => g.units.forEach((u) => u.sims.forEach((s) => {
  if (ids.includes(s.id)) {
    if (!fs.existsSync(path.resolve(__dirname, '..', '..', s.path))) throw new Error('missing ' + s.path);
    delete s.soon; done.push(s.id);
  }
})));
const missing = ids.filter((i) => !done.includes(i));
if (missing.length) throw new Error('unknown ids: ' + missing.join(', '));
const header = fs.readFileSync(CAT_PATH, 'utf8').split('window.SCI_CATALOG')[0];
fs.writeFileSync(CAT_PATH, header + 'window.SCI_CATALOG = ' + JSON.stringify(CAT, null, 2) + ';\n');
console.log('ready:', done.join(', '));
