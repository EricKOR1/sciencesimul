# Ⅶ. 태양계 새 차시 공통 구현 규칙 (m1-solar-members, m1-planet-types, m1-sun-activity, m1-diurnal-motion, m1-constellation-change)

- 파일: `sims/<id>/index.html` + `sim.js`. `<head>`와 머리글은 `sims/m1-moon-phase/index.html`을 그대로 따름(meta viewport-fit, apple-mobile-web-app-capable, theme-color #0ea5e9, Jua 글꼴 링크, `body data-subject="earth"`, `.sim-unit` = "중1 · Ⅶ. 태양계", 뒤로 가기 `../../index.html#g1`, `#starMeter`, `#soundBtn`). 스크립트 순서 common.js → anim.js → catalog.js → sim.js (design/BUILD_SPEC.md). `.stage-card { background:#070d1f }`.
- 캔버스 두 벌(m1-moon-phase 패턴): `.sc-wide` 800×600(태블릿, 왼쪽 주 장면 + 오른쪽 보조 창) / `.sc-tall` 520×846(폭 599px 이하, 위아래로 쌓음). 레이아웃 객체 L에 좌표·글꼴 배율(fs)을 두고 같은 draw 함수로 그림. tall 캔버스는 `touch-action: pan-y` + 끌 수 있는 대상 위에서만 touchstart preventDefault.
- 시각 토큰: 우주 배경 방사 그라데이션 #17264f → #0e1838 → #070d1f, 씨앗 난수(rng) 별 80~120개 반짝임(0.45+0.4·sin), 패널 배경 #0c1636→#1b2d60 + 테두리 rgba(160,190,255,.35) 둥근 모서리 14, 강조 청록 #5eead4, 햇빛 #ffd36b, 성공 #34d399, 경고 #fb923c. 큰 제목은 Jua, 나머지는 Pretendard 계열, 캔버스 글자 ≥ 13px(가상 좌표). 이름표는 알약형(rgba(6,10,26,.78)).
- 입체감: 천체는 방사 그라데이션 + 태양 반대쪽 명암(태양 방향으로 매 프레임 회전) + 부드러운 대기 글로우 + 아래쪽 그림자(shadowBlur 12, rgba(0,0,0,.35)).
- 움직임: 모든 상태 변화는 보간 — 값 전환 easeInOutCubic 0.4~0.8초, 끌기 대상은 임계 감쇠 스프링(ω≈14)으로 손가락을 따라감, 놓으면 가벼운 관성 후 정지. 끌 수 있는 것은 처음에 점선 고리 맥동 + "👆 끌어 보세요" 알약. 끄는 동안 글로우·그림자 커짐(마이크로 인터랙션). 정답/스냅 순간: 대상 둘레 초록 링이 0.6초 동안 퍼지며 사라짐 + Sound.tone(880, .12, 'triangle', .08). 틀린 끌기: 0.35초 좌우 흔들림 + 원위치로 easeOutBack 복귀.
- 새 도구: `game.isNew(f)`이면 청록 NEW 링(m1-moon-phase newRing/newRingCircle 재사용). `data-feature`로 HTML 컨트롤 순차 공개, 한 화면에 컨트롤 ≤ 3개(단계별 '보기 모드'로 불필요한 컨트롤 숨김; 자유 탐구에서는 보기 세그먼트 제공).
- 퀴즈 그림은 인라인 SVG(FIG 객체, m1-moon-phase 방식). 모든 미션 status는 ✅/⬜ 칩 형식, task는 hint + explain, quiz는 choices별 feedback(정답 칸은 '').
- prefers-reduced-motion: 장식 애니메이션(반짝임·입자 수) 줄이고 핵심 움직임만 유지.
- 테스트: design/BUILD_SPEC.md의 Playwright 점검 전부(5개 뷰포트 문서 스크롤 없음, 390×844 동작, 터치 끌기, 전체 플레이로 🏆, '다음 차시' 링크가 catalog 순서와 일치, 📘 배운 내용).
