#!/usr/bin/env node
/* 실력 문제 파일(sims/<id>/quiz.js) 형식 검사
   사용: node tools/check_quiz.js            → 모든 차시
         node tools/check_quiz.js id1 id2    → 고른 차시
   형식이 틀리면 줄마다 이유를 적고, 끝에 "bad N"을 보여요. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..', 'sims');
const norm = (s) => String(s == null ? '' : s).toLowerCase().replace(/[−–]/g, '-').replace(/[\s.,·ㆍ!?'"‘’“”()\[\]~]/g, '');
const TYPES = ['choice', 'ox', 'multi', 'short', 'num', 'essay'];
function load(id) {
  const f = path.join(ROOT, id, 'quiz.js');
  if (!fs.existsSync(f)) return null;
  let got = null;
  const ctx = { SciSim: { quiz: (i, list) => { got = { id: i, list }; } } };
  vm.runInNewContext(fs.readFileSync(f, 'utf8'), ctx, { filename: f });
  return got;
}
function check(id) {
  const errs = [], warn = [];
  let got;
  try { got = load(id); } catch (e) { return { errs: ['실행 오류: ' + e.message], warn }; }
  if (!got) return null;
  if (got.id !== id) errs.push('등록 이름이 폴더 이름과 달라요: ' + got.id);
  const L = got.list;
  if (!Array.isArray(L)) return { errs: ['목록이 배열이 아니에요'], warn };
  const html = fs.existsSync(path.join(ROOT, id, 'index.html')) ? fs.readFileSync(path.join(ROOT, id, 'index.html'), 'utf8') : '';
  if (html.indexOf('src="quiz.js"') < 0) errs.push('index.html에 <script src="quiz.js"></script>가 없어요');
  const seen = new Set(), tier = { 1: 0, 2: 0, 3: 0 };
  let subj = 0, sim = 0, essay = 0;
  L.forEach((q, i) => {
    const at = (q && q.id ? q.id : '#' + (i + 1)) + ': ';
    const E = (m) => errs.push(at + m);
    if (!q || typeof q !== 'object') { E('문제가 객체가 아니에요'); return; }
    if (!q.id || seen.has(q.id)) E('id가 없거나 겹쳐요'); seen.add(q.id);
    if ([1, 2, 3].indexOf(q.lv) < 0) E('lv는 1·2·3 중 하나'); else tier[q.lv]++;
    if (!Number.isInteger(q.step) || q.step < 1) E('step은 1 이상의 정수');
    if (TYPES.indexOf(q.type) < 0) { E('type이 없거나 틀려요: ' + q.type); return; }
    if (!q.q || typeof q.q !== 'string') E('q(질문)가 없어요');
    if (!q.explain) E('explain(풀이)이 없어요');
    if (q.do) sim++;
    if (q.type === 'choice' || q.type === 'multi') {
      if (!Array.isArray(q.choices) || q.choices.length < 3 || q.choices.length > 5) E('choices는 3~5개');
      else {
        if (new Set(q.choices.map((c) => String(c).replace(/\s/g, ''))).size !== q.choices.length) E('같은 보기가 있어요');
        if (q.type === 'choice') {
          if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= q.choices.length) E('answer가 보기 범위를 벗어나요');
          if (q.feedback) { if (!Array.isArray(q.feedback) || q.feedback.length !== q.choices.length) E('feedback 개수가 보기 개수와 달라요'); else if (q.feedback[q.answer]) E('정답 보기에 feedback이 있어요'); }
        } else {
          if (!Array.isArray(q.answer) || q.answer.length < 2 || q.answer.length >= q.choices.length) E('multi의 answer는 2개 이상, 보기 전체보다 적게');
          else if (q.answer.some((a) => !Number.isInteger(a) || a < 0 || a >= q.choices.length) || new Set(q.answer).size !== q.answer.length) E('multi의 answer가 범위를 벗어나거나 겹쳐요');
        }
      }
    } else if (q.type === 'ox') { if (typeof q.answer !== 'boolean') E('ox의 answer는 true/false'); }
    else if (q.type === 'short') {
      subj++;
      const a = Array.isArray(q.answer) ? q.answer : [q.answer];
      if (!a.length || a.some((x) => typeof x !== 'string' || !norm(x))) E('short의 answer는 글자 목록');
      else if (!q.cs && a.some((x) => /^[A-Za-z]{2,6}$/.test(x) && /[a-z]/.test(x) && /[A-Z]/.test(x) && new Set(x.toLowerCase()).size < x.length)) E('유전자형처럼 대소문자가 뜻을 가르는 답이에요: cs: true를 넣어요');
      else if (a.some((x) => norm(x).length > 14)) warn.push(at + '단답형 정답이 길어요(14자 초과): 서술형이 더 맞을 수 있어요');
    } else if (q.type === 'num') {
      subj++;
      if (typeof q.answer !== 'number' || !isFinite(q.answer)) E('num의 answer는 숫자');
      if (q.tol != null && !(q.tol >= 0)) E('tol은 0 이상');
    } else if (q.type === 'essay') {
      subj++; essay++;
      if (!q.model) E('essay에는 model(모범 답안)이 필요해요');
      if (!Array.isArray(q.keys) || q.keys.length < 2 || q.keys.some((k) => !k || !k.t || !Array.isArray(k.k) || !k.k.length)) E('essay의 keys는 2개 이상, 각각 { t, k: [낱말] }');
      else if (q.model) { const v = norm(q.model.replace(/<[^>]*>/g, '')); q.keys.forEach((k, j) => { if (!k.k.some((w) => v.indexOf(norm(w)) >= 0)) E('모범 답안이 채점 기준 ' + (j + 1) + '의 낱말을 하나도 담지 않아요'); }); }
    }
  });
  if (L.length < 12) errs.push('문제가 12개보다 적어요: ' + L.length);
  [1, 2, 3].forEach((t) => { if (tier[t] < 4) errs.push('난이도 ' + t + ' 문제가 4개보다 적어요: ' + tier[t]); });
  if (subj < 4) errs.push('주관식(단답·수치·서술)이 4개보다 적어요: ' + subj);
  if (essay < 1) errs.push('서술형이 없어요');
  if (sim < 4) errs.push('실험과 이어진 문제(do)가 4개보다 적어요: ' + sim);
  return { errs, warn, n: L.length };
}
const ids = process.argv.slice(2).length ? process.argv.slice(2) : fs.readdirSync(ROOT).filter((d) => fs.existsSync(path.join(ROOT, d, 'quiz.js')));
let bad = 0, total = 0;
ids.forEach((id) => {
  const r = check(id);
  if (!r) { console.log('MISSING ' + id); bad++; return; }
  total += r.n || 0;
  r.warn.forEach((w) => console.log('warn ' + id + ' ' + w));
  if (r.errs.length) { bad++; r.errs.forEach((e) => console.log('BAD ' + id + ' ' + e)); }
});
console.log('checked ' + ids.length + ' lessons, ' + total + ' questions, bad ' + bad);
process.exit(bad ? 1 : 0);
