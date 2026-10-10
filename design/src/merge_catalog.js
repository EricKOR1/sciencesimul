// node design/src/merge_catalog.js design/src/plans_all.json → rewrites assets/js/catalog.js
// - refreshes planned entries from the designs (keeps prereq)
// - adds planned sims as `soon: true`; existing entries keep their soon/ready state (see mark_ready.js)
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
    // keep the current ready/soon state; new entries start as soon (mark_ready.js flips them after review)
    if (prev ? prev.soon : true) entry.soon = true;
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
