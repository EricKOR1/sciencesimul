// node design/src/merge_catalog.js design/src/plans_all.json → rewrites assets/js/catalog.js
// - keeps existing sim entries untouched (incl. prereq)
// - adds planned sims; `soon: true` when sims/<id>/index.html does not exist yet
// - orders each unit by plan.order
const fs = require('fs'), vm = require('vm'), path = require('path');
const REPO = path.resolve(__dirname, '..', '..') + '/';
const CAT_PATH = REPO + 'assets/js/catalog.js';
const plans = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const ctx = { window: {} };
vm.runInNewContext(fs.readFileSync(CAT_PATH, 'utf8'), ctx);
const CAT = ctx.window.SCI_CATALOG;

const unitMap = {};
let n = 0;
CAT.grades.forEach((g, gi) => g.units.forEach((u, ui) => { n++; unitMap[n] = [gi, ui]; }));

const built = (id) => fs.existsSync(path.join(REPO, 'sims', id, 'index.html'));
const report = [];
for (const plan of plans) {
  const [gi, ui] = unitMap[plan.unit];
  const unit = CAT.grades[gi].units[ui];
  const byId = {};
  unit.sims.forEach((s) => { byId[s.id] = s; });
  plan.sims.forEach((s) => {
    const prev = byId[s.id];
    const entry = {
      id: s.id, path: 'sims/' + s.id + '/index.html', icon: s.icon, title: s.title,
      std: s.std, stdText: s.stdText, desc: s.desc, tags: s.tags, steps: s.steps,
    };
    if (prev && prev.prereq) entry.prereq = prev.prereq;
    if (!built(s.id)) entry.soon = true;
    // an already-built sim keeps its existing catalog entry unless it was a planned (soon) entry
    if (prev && !prev.soon && built(s.id)) return;
    byId[s.id] = entry;
  });
  const order = (plan.order || []).filter((id) => byId[id]);
  Object.keys(byId).forEach((id) => { if (!order.includes(id)) order.push(id); });
  unit.sims = order.map((id) => byId[id]);
  report.push(`unit ${plan.unit} ${unit.title}: ` + unit.sims.map((s) => s.id + (s.soon ? '(soon)' : '')).join(', '));
}

const header = fs.readFileSync(CAT_PATH, 'utf8').split('window.SCI_CATALOG')[0];
fs.writeFileSync(CAT_PATH, header + 'window.SCI_CATALOG = ' + JSON.stringify(CAT, null, 2) + ';\n');
console.log(report.join('\n'));
