# TODO

## Now

- [x] Browser QA: `http://127.0.0.1:5173/`에서 홈, STS 상세, 이력 목록, 이슈별 모음, 이력 추가/수정 drawer를 다시 훑는다.
- [x] Pages QA: `https://ssg87-pos.github.io/Issue-history-board/`에서 fallback 시연 데이터가 바로 보이는지 확인한다.
- [x] Pages Deploy QA: `main`에 반영되면 GitHub Pages Actions 워크플로가 `pnpm build:pages`, `pnpm test:e2e:pages`, `actions/deploy-pages`, `pnpm test:e2e:pages:live:current`로 공개 데모를 빌드/검증/배포/최신 asset 확인까지 수행하도록 구성한다.
- [ ] Pages Latest Deploy QA: 변경사항을 `main`에 병합/푸시해 Pages 워크플로를 실행한 뒤 실제 공개 URL의 asset 해시 일치 job이 통과하는지 확인한다. 현재 공개 Pages는 렌더링은 통과하지만 live asset이 `index-B0VKNy4R.js` / `index-SzPiKn5c.css`라서 로컬 최신 빌드의 `index-D-X9jBU9.js` / `index-DqqD1h8a.css`와 다르다.
- [x] Pages Preview QA: `vite --mode github-pages` 정적 빌드를 `/Issue-history-board/` base path로 띄웠을 때 fallback 시연 데이터가 보이는지 확인한다.
- [x] Company Run QA: Node/pnpm 없이 Docker만 있는 Ubuntu 서버에서도 `./scripts/company-run.sh check|up|status|health|logs|backup|down`으로 운영할 수 있게 스크립트와 문서를 연결한다.
- [x] Design guardrail QA: 새 디자인 수정 전 루트 `DESIGN.md`와 `docs/design-readability-refresh.md`의 `Do Not Revert` 항목을 먼저 확인한다.
- [x] Agent Governance QA: 루트 `AGENTS.md`, `src/AGENTS.md`, `backend/AGENTS.md`와 각 `CLAUDE.md` 링크를 만들어 다음 에이전트가 디자인/UX/검증 기준을 먼저 읽도록 한다.
- [x] Docs QA: 다음 작업 전 `docs/current-ui-decisions.md`, `docs/design-readability-refresh.md`, `docs/research-history-board-summary.md`, `HANDOFF.md`의 역할이 겹치거나 충돌하지 않는지 확인한다.
- [x] Detail QA: `향후 계획`은 보이고 독립 `다음 확인일` 블록은 없는지 확인한다.
- [x] Timeline QA: 같은 이슈의 `이력 목록`에서 선택 행 배경, 점, 날짜가 상태색을 따르는지 확인한다.
- [x] Selection QA: 사이드바와 하위 주제 카드 선택 상태가 왼쪽 세로줄이나 딱딱한 파란 박스로 보이지 않는지 확인한다.
- [x] Mobile QA: 430px 폭에서 상단 영역, 요약 카드, 날짜별 이력 탭, 상세 이동/닫기가 과하게 늘어나지 않는지 확인한다.
- [x] Mobile Navigation QA: 430px 폭에서 상단 메뉴 5개가 가로 스크롤 없이 모두 보이는지 확인한다.
- [x] Drawer QA: 모바일에서 `이력 추가` drawer의 `대분류 > 하위 주제 > 이슈 > 세부 항목` 선택, 새 항목 입력, 상태/세부 단계/유형 버튼, 여러 첨부 URL 입력, 하단 저장 버튼이 겹치지 않는지 확인한다.
- [x] Data QA: 관리자 `데이터 관리` 모듈에서 JSON/Excel `.xlsx` 내보내기와 가져오기가 데스크톱/모바일 모두에서 열리고 동작하는지 확인한다.
- [x] Admin Balance QA: 관리자 6개 모듈이 데스크톱/태블릿/모바일 폭에서 잘리지 않고, 카드/메뉴/패널 제목 글자 크기가 같은 중요도 기준으로 일관적인지 Playwright로 검증한다.
- [x] Admin Connection QA: 관리자 담당 정보에서 바꾼 이슈명/세부 항목명/대표 단계/담당 정보가 홈, 상세, 보고서 다운로드와 서버 저장 데이터에 이어지는지 검증한다.
- [x] Playwright Port QA: 로컬/Pages/서버 E2E가 고정 `5173`, `5175`, `8010` 포트 대신 실행 시점의 빈 포트를 선택하고, 좁은 포트 대역이 막혀도 넓은 loopback 범위로 재시도해 다른 Codex 스레드와 충돌하지 않도록 한다.
- [x] Login QA: `SSG87-pos/poslab-login-page`의 POSLAB entry 형식을 반영해 `로그인 / 회원가입` 탭을 제공하고, 회원가입이 `이름/이메일/비밀번호`만 받아 FastAPI에 저장되며 관리자 승인 후 제출한 이메일/비밀번호로 로그인되는지 `1440x900`, `1024x768`, `768x1024`, `390x844`, `360x740` Playwright로 검증한다.
- [x] Detail Density QA: 노트북 L 100%에서도 75% 줌에서 보던 세부 이슈의 본문 중심 구성이 유지되도록 데스크톱 상세 화면의 날짜 목록/타임라인 폭과 패딩을 조정하고 브라우저 실측 및 서버 E2E로 확인한다.
- [x] Report Simplification QA: 보고서 화면의 큰 전체 미리보기 카드/목록을 제거하고, 선택 조건과 Excel/Word 다운로드 중심으로 동작하는지 서버 E2E 다운로드 검증으로 확인한다.
- [x] Login Copy QA: 로그인 첫 화면의 설명 문구, 부서/이모지 표기, `이메일 또는 아이디` 라벨을 제거하고 `이메일` 라벨과 primary 회원가입 버튼으로 정리한다.

## Next

- [x] `src/styles.css`의 반복 override 블록은 검토했으며, 현재 디자인 고정 전에는 대규모 정리보다 새 회귀 테스트와 작은 보정 중심으로 유지한다.
- [x] `AddHistoryPanel`의 visible label도 `향후 계획` 기준으로 완전히 맞는지 확인한다.
- [x] 날짜별 이력과 이슈별 모음의 업무 라벨 태그가 너무 튀거나 사라지지 않는지 추가 샘플 데이터로 점검한다.
- [x] 관리자 모드에서 대분류/하위 주제/이슈/세부 항목 마스터 데이터를 수정 관리하는 화면을 설계한다.
- [x] 관리자 모드에서 세부 단계/유형 표시명과 업무 라벨 후보를 저장하고 이력 추가/상세/보고서/Excel에 반영한다.
- [x] 관리자 모드에서 업무 라벨 후보를 추가/삭제/정렬하고 새 이슈 입력 후보 순서에 반영한다.
- [x] 관리자 옵션 표시명이 반영된 앱 생성 `.xlsx`를 다시 가져와도 세부 단계/유형 canonical 값이 유지되는지 검증한다.
- [x] 관리자 모드에서 세부 단계/유형 후보 순서와 숨김을 저장하고 이력 추가 후보에 반영한다.
- [x] 관리자 담당 정보와 이력 추가/수정 drawer에서 바꾼 담당자/담당부서/유관부서가 세부 항목과 부모 이슈 대표 정보에 함께 저장되는지 검증한다.
- [x] 서버 로그인 오류 상태가 데스크톱/모바일에서 읽기 쉽게 유지되고 레이아웃 오버플로가 없는지 검증한다.
- [x] 서버 로그인 후 홈/보고서/관리자 권한 화면이 데스크톱/태블릿/모바일 폭에서 잘리지 않고, 같은 중요도 제목 글자 크기가 일관적인지 Playwright로 검증한다.
- [x] 서버 권한관리에서 마지막 활성 관리자 계정은 강등되지 않고 API 상태도 유지되는지 검증한다.
- [x] 서버 모드에서 관리자 보고서 바로가기가 필터된 보고서 화면으로 이동하고 Excel/Word 다운로드 내용까지 이어지는지 검증한다.
- [x] 서버 모드에서 관리자 분류/담당 마스터 수정이 FastAPI 보드 데이터에 저장되고 재로그인 후에도 유지되는지 검증한다.
- [x] 관리자 모드에서 세부 항목 상태 옵션은 표시명/순서/숨김으로 운영하고, 추가/삭제형 전환은 상태색/단계/DB 호환성 설계 후 진행하기로 정리한다.
- [x] 관리자 모드에서 업무 라벨은 추가/삭제/정렬을 제공하고, 유형 옵션은 표시명/순서/숨김으로 운영하기로 정리한다.
- [x] Excel 가져오기는 현재 앱에서 생성한 `.xlsx` 구조를 기준으로 처리한다. 외부 복합 서식 파일은 현재 범위에서 제외하고, 필요 시 전용 Excel 라이브러리 도입으로 별도 설계한다.
- [x] 보고서 메뉴에서 대분류/하위 주제/이슈/기간을 선택하고 주간 보고, 이슈 요약, 처리 지연 이슈 템플릿으로 미리보기/내보내기하는 화면을 설계한다.

## Later

- [x] DB/로그인/권한 모델에서도 `remainingRisk` 필드명은 저장 호환을 위해 유지하고, 사용자 표시 라벨은 `향후 계획`으로 운영한다.
- [ ] 세부 단계와 유형을 완전한 추가/삭제형 마스터 데이터로 전환하려면 상태색, 단계 매핑, 보고서/Excel canonical 값, DB 마이그레이션을 함께 설계한다.
- [ ] 관련 이슈 추천은 현재 제외 상태를 유지한다. 다시 도입하려면 명시적 링크나 충분한 기준이 설계된 뒤 진행한다.
- [ ] 디자인 변경이 안정되면 `docs/research-history-board-summary.md`의 초기 설명 중 현재 구조와 달라진 부분을 별도로 정리한다.
