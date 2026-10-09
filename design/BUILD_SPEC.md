# BUILD SPEC — 중학 과학 시뮬레이션 차시 제작 규칙

All paths are relative to the repo root (`/home/user/sciencesimul`). This file replaces the older SPEC_v3/SPEC_v4.

## 0. Goal (the teacher's requests)
- 2022 개정 교육과정 (교육부 고시 제2022-33호 [별책 9] 과학과) exactly: **1 simulation = 1 성취기준** (or one clearly
  separated part of it). "지금은 여러 가지 내용이 혼합되어 있어서 너무 복잡해" → small, focused, curriculum-exact.
- Concept hierarchy: content is added **step by step**, each step building on the previous one.
- **Tablet-first** layout. More intuitive than PhET for learning the principle.
- **High-quality animation** (see §4) — this is the current upgrade request.
- Your unit design file `design/units/uNN.md` holds the curriculum text (성취기준, 해설, 고려 사항 — obey every scope
  note: what is NOT covered, qualitative vs quantitative), the concept hierarchy, the lesson order, and a design per lesson.
  When a lesson lists **상세 설계 파일**, read it first and follow it (this spec wins on script order/anim/testing).

## 1. Structure
- Hub → 학년 → 단원 → 차시 (= one simulation) → STEP.
- `assets/js/catalog.js` is the single source of truth (id, path, title, icon, std, stdText, unit order). The engine reads it
  and automatically shows the 성취기준 box + 단원 학습 순서 in STEP 1's intro and in 📘 배운 내용, and a "다음 차시 →"
  button on the completion screen. Use exactly the id/title from catalog.js. Lessons not built yet carry `soon: true`
  (shown as 🚧 준비 중); "다음 차시" skips them. **Do not edit catalog.js** — the lead flips `soon` after review.
- Files per lesson: `sims/<id>/index.html` + `sims/<id>/sim.js` (+ optional small extra files in the same folder).

## 2. Page template
Copy the `<head>` and header of an existing sim (e.g. `sims/m1-gas-boyle/index.html`): meta viewport-fit,
apple-mobile-web-app-capable, mobile-web-app-capable, emoji favicon, Jua font link, `../../assets/css/common.css`.
- `theme-color` and `<body class="sim-page" data-subject="…">` by subject: phy `#f26b3a`, chem `#8b5cf6`, bio `#16a34a`,
  earth `#0ea5e9`, sci `#64748b`.
- Header: back link `../../index.html#g1|g2|g3`, `.sim-unit` = "중N · Ⅹ. 단원명" (given in the unit file), `<h1>` = catalog
  title, `#starMeter`, `#soundBtn`. `<title>` = "제목 | 중학 과학 시뮬레이션".
- Body layout: `main.sim-main` > `.stage-col` (`section.card.stage-card` > `.stage-toolbar` + `.stage-canvas` > canvas,
  then `.readouts`) + `aside.side-col` (`section.card.card-pad#ctrlCard` controls, `section.card#game`).
- Script order (exactly):
```html
<script src="../../assets/js/common.js"></script>
<script src="../../assets/js/anim.js"></script>
<script src="../../assets/js/catalog.js"></script>
<script src="sim.js"></script>
```
- Reference implementations: `sims/m1-gas-boyle/` (compact 4-step lesson, record table + graph),
  `sims/m1-moon-phase/` (two canvases: wide 800×600 for tablets / tall 520×846 for phones, inline-SVG quiz figures),
  `sims/m3-energy-coaster/` (phone layout pattern), `sims/m2-ion/` (particle model). Reuse their patterns and code.

## 3. Lesson design (game engine `SciSim.game` in `assets/js/common.js` — read the API comment there)
- **4 STEPs** following inquiry: e.g. ① 관찰 → ② 실험/탐구 → ③ 설명/모형 → ④ 적용 (as in the unit design).
  Each level: `title`, `short` (≤ 6 chars, = the catalog `steps` name or a shorter form), `icon`, `phase` (one of
  관찰 실험 탐구 모형 설명 확인 예측 기록 분석 적용), `intro`, `features`, `setup`, `recap` (one sentence),
  `summary` (concise notebook HTML), `missions`.
- **2–3 missions per step, 8–11 in total.** Goal ≤ 2 short sentences. Every mission has `explain`.
  Tasks: `check` + `hold` + live `status()` (✅/⬜ chips) + `hint`. Manual tasks: `manual: true`, `check()` returns true or
  a feedback string. Quizzes: `choices`, `answer`, per-choice `feedback` (target misconceptions), optional `figure` (inline SVG).
- STEP 1 intro starts with `<p class="si-q">❓ 탐구 질문: …</p>`. Later intros start with
  `<div class="si-link">🔗 <b>앞 단계에서</b> …</div>`.
- Progressive reveal: `features` + `data-feature="name"` on HTML elements (hidden until unlocked); draw canvas parts only
  when `game.has(name)`. `featureLabels` names each tool. Free exploration after completion (all features on) must work.
- Korean text: friendly 해요체, short, scientifically exact. Numbers and terms exactly as in the unit design.
- Keep the screen SIMPLE: ≤ 3 controls visible at once; only what this 성취기준 needs.

## 4. Animation quality bar — use `assets/js/anim.js` (preview: `assets/demo/anim-kit.html`, API in the file header)
- Motion: `SciSim.tween(obj, {x: 100}, {duration, ease: 'outBack'|'outCubic'|'outBounce'|…, delay, onDone})`,
  `SciSim.approach(cur, target, dt, rate)`, `new SciSim.Spring(v, {stiffness, damping})`, `SciSim.ease.*`,
  `new SciSim.Particles()` (`emit`, `burst(x, y)`, `update(dt)`, `draw(ctx)`; shapes circle/square/star/bubble/smoke).
- Drawing: `const D = SciSim.draw(ctx)` → `D.roundRect, D.shadow(fn), D.sphere(x,y,r,color,{shadow,text}), D.glow,
  D.arrow(x1,y1,x2,y2,{label}), D.label(x,y,text,{bg}), D.text, D.beaker, D.flask, D.testTube, D.flame, D.thermometer,
  D.dial, D.sky, D.space, D.ground, D.wave, D.dashedLine, D.ring, D.check, D.spark`; colors `SciSim.color.rgba/shade/mix`.
1. **Smooth, time-based motion** — every visual quantity animates toward its new value (never jumps): approach/Spring/tween
   with `dt` from `SciSim.loop`. 60 fps, no per-frame allocation storms.
2. **Depth & polish** — soft shadows, gradients and highlights (glossy spheres for particles/atoms/planets), realistic
   glassware and liquids, light from the top-left, cohesive palette per subject.
3. **Show the mechanism** — cause → effect must be visible (particles speed up when heated, arrows grow with force,
   rays bend, current dots flow, molecules rearrange). A zoom/magnifier inset ("🔍 입자 모형으로 보기") wherever the
   curriculum talks about 입자/분자/모형.
4. **Micro-interactions** — draggables lift on press (shadow grows, slight scale), snap with `outBack`, targets pulse
   (`D.ring`), success = on-canvas `Particles.burst` + `D.check`, gentle shake on wrong.
5. **Clarity first** — never clutter; canvas labels ≥ 13px virtual; arrows/labels never cover key objects; respect
   `SciSim.reduceMotion` (skip decorative motion, keep essential motion).
6. **Scene transitions** — when a step unlocks a new tool or scene, animate it in (fade/slide/scale) and use
   `game.isNew(name)` for a NEW ring.

## 5. Layout (tablet-first; `assets/css/common.css`)
- Landscape tablet: full-height app, stage left, side panel right; **no document scroll** at 1180×820, 1280×800, 1024×768.
- Portrait tablet (820×1180, 800×1280): stage on top, controls and #game side by side below; no document scroll.
- Phone (390×844): stacked, page scroll allowed; everything usable.
- Touch targets ≥ 44px. `SciSim.stage(canvas, {width, height, background})` fits the virtual canvas into `.stage-canvas`.
  Pointer input via `SciSim.pointer` (touch + mouse); on canvases that can be dragged, prevent page scroll only while dragging.

## 6. Rules
- Only create/modify files inside your assigned `sims/<id>/` folders (and scratch files under your scratch dir).
  Do not touch `assets/`, `index.html`, `design/`, catalog.js or other sims. If the engine has a problem, work around it
  locally and report it.
- Do NOT git commit or push. Do NOT run `playwright install`.

## 7. Testing (mandatory, keep it efficient)
- Serve: `cd /home/user/sciencesimul && python3 -m http.server <YOUR_PORT>` in the background; kill it at the end.
- Playwright: write scripts in your scratch dir, run with `NODE_PATH=$(npm root -g) node script.js`;
  `chromium.launch()`; `browser.newContext({viewport, hasTouch: true})`; clear localStorage before runs.
- Per lesson:
  1. Full playthrough at 1180×820: every "단계 시작하기", every mission (perform the real interaction or set state via a
     small debug hook you expose, e.g. `window.__sim`), one wrong quiz answer, step modals, reaching 🏆. Zero console/page errors.
  2. "다음 차시" button href = the next lesson in catalog order that is NOT `soon` (none → no button). 📘 배운 내용 shows the
     성취기준 + 4 summaries.
  3. Layout: `document.scrollingElement.scrollHeight <= innerHeight` at the 5 tablet sizes; 390×844 usable; one touch
     drag/tap on the canvas.
  4. Smoothness: record rAF deltas for 3 s in the busiest scene; no frame > 50 ms (except the first second).
  5. LOOK at screenshots (Read tool) mid-step at 1180×820 and 820×1180 and polish what looks off (overlaps, tiny text,
     empty areas, cut-off labels).
- Final reply (concise): files created; per lesson the step list (phase · title · short · mission count); test results;
  anything unverified; engine issues.
