# TODO

## Now

- [ ] Browser QA: `http://127.0.0.1:5173/`에서 홈, STS 상세, 이력 목록, 이슈별 모음, 이력 추가/수정 drawer를 다시 훑는다.
- [ ] Pages QA: `gh-pages` 브랜치 배포 후 `https://ssg87-pos.github.io/Issue-history-board/`에서 fallback 시연 데이터가 바로 보이는지 확인한다.
- [ ] Design guardrail QA: 새 디자인 수정 전 `docs/design-readability-refresh.md`의 `Do Not Revert` 항목을 먼저 확인한다.
- [ ] Detail QA: `향후 계획`은 보이고 독립 `다음 확인일` 블록은 없는지 확인한다.
- [ ] Timeline QA: 같은 이슈의 `이력 목록`에서 선택 행 배경, 점, 날짜가 상태색을 따르는지 확인한다.
- [ ] Selection QA: 사이드바와 하위 주제 카드 선택 상태가 왼쪽 세로줄이나 딱딱한 파란 박스로 보이지 않는지 확인한다.
- [ ] Mobile QA: 430px 폭에서 상단 영역, 요약 카드, 날짜별 이력 탭, 상세 이동/닫기가 과하게 늘어나지 않는지 확인한다.
- [ ] Drawer QA: 모바일에서 `이력 추가` drawer의 이슈 카드 선택, 세부 항목 카드 선택, 상태 버튼, 하단 저장 버튼이 겹치지 않는지 확인한다.

## Next

- [ ] `src/styles.css`의 반복 override 블록을 안전하게 정리할 수 있는지 검토한다. 단, 사용자가 보는 최신 디자인을 먼저 스크린샷으로 확인한 뒤 진행한다.
- [x] `AddHistoryPanel`의 visible label도 `향후 계획` 기준으로 완전히 맞는지 확인한다.
- [ ] 날짜별 이력과 이슈별 모음의 스티커 태그가 너무 튀거나 사라지지 않는지 추가 샘플 데이터로 점검한다.

## Later

- [ ] 로컬 MVP 이후 DB/로그인/권한 모델을 붙일 경우 `remainingRisk` 필드명을 유지할지 `nextPlan` 계열로 마이그레이션할지 결정한다.
- [ ] 관련 이슈 추천은 현재 제외 상태를 유지한다. 다시 도입하려면 명시적 링크나 충분한 기준이 설계된 뒤 진행한다.
- [ ] 디자인 변경이 안정되면 `docs/research-history-board-summary.md`의 초기 설명 중 현재 구조와 달라진 부분을 별도로 정리한다.
