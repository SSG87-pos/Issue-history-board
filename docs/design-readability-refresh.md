# PosLAB Design Readability Refresh

이 문서는 `codex/design-readability-refresh` 브랜치의 디자인 기준만 빠르게 확인하기 위한 문서다.

제품 구조와 UX 결정은 `docs/current-ui-decisions.md`를 우선하고, 시각 톤과 선택 효과는 이 문서를 우선한다.

## Design Intent

목표는 내부 연구 이력 도구가 딱딱한 행정 시스템처럼 보이지 않으면서도, 오래 읽어도 피로하지 않은 화면을 만드는 것이다.

현재 톤은 다음에 가깝다.

```text
soft internal operations dashboard
light blue / mint atmosphere
clear status colors
low-noise cards
gentle selected surfaces
```

피해야 하는 방향은 다음이다.

```text
generic AI dashboard
hard blue box selection
large empty decorative cards
random floating emoji
dark corporate sidebar
thick left rail selection
```

## Visual Principles

1. 색은 있어야 하지만 과하지 않게 쓴다.
2. 선택 상태는 명확해야 하지만 경고처럼 보이면 안 된다.
3. 정보 밀도는 유지하되 여백이 커서 빈 화면처럼 보이지 않게 한다.
4. 상태색은 의미와 계속 연결되어야 한다.
5. 아이콘은 장식이 아니라 분류와 동작을 빠르게 구분하는 용도다.
6. 글자는 큰데 안 읽히는 상태를 피한다. 제목은 줄이고, 본문과 상태는 또렷하게 한다.

## Color Language

대표 상태색은 고정한다.

```text
접수: orange
진행: blue
종료: green
```

권장 색감:

```text
blue text: #0f5ed7 / #1f66e5
green text: #137047 / #27915d
orange text: #b45309 / #f0802e
surface: #f8fbff / #eef5ff / #eaf8ef / #fff4e8
line: pale blue-gray
shadow: very soft, low opacity
```

색상 사용 규칙:

- 선택된 항목은 상태와 무관하게 모두 파랑으로 통일하지 않는다.
- 상태를 가진 선택 항목은 상태색을 따른다.
- 배경은 연하게, 텍스트와 점은 더 진하게 둔다.
- 그라데이션은 사이드바와 앱 타이틀 정도에만 제한적으로 사용한다.

## Selection Patterns

### Sidebar

사이드바는 밝은 블루/민트 계열의 은은한 배경을 유지한다.

선택 상태:

- 왼쪽 세로줄을 쓰지 않는다.
- 흰색에 가까운 밝은 표면을 사용한다.
- 얇은 경계와 약한 그림자로 선택을 표현한다.
- 아이콘과 텍스트는 정렬이 어긋나지 않아야 한다.

### Subtopic Cards

하위 주제 카드는 선택된 항목을 알아볼 수 있어야 한다.

선택 상태:

- `선택` 텍스트를 넣지 않는다.
- 진한 파란 채움으로 덮지 않는다.
- 얇은 파란 경계, 연한 블루 표면, 약한 그림자를 사용한다.
- 현재 카드가 선택됐다는 느낌은 나야 하지만, 주변 카드보다 과하게 튀지 않아야 한다.

### Phase Track

상세 우측 상단의 `접수 / 진행 / 종료` 트랙은 현재 단계가 가장 또렷해야 한다.

현재 단계:

- 접수: 연한 주황 배경 + 진한 주황 텍스트
- 진행: 연한 파랑 배경 + 진한 파랑 텍스트
- 종료: 연한 초록 배경 + 진한 초록 텍스트

비현재 단계:

- 회색 계열 텍스트
- 같은 크기 유지
- 지나치게 흐려서 안 보이면 안 된다.

### Timeline Rows

같은 이슈의 `이력 목록`은 선택된 행이 바로 보여야 한다.

선택 상태:

- 행 배경은 상태에 맞는 연한 색을 사용한다.
- 점과 날짜는 상태색을 따른다.
- 선택된 점이 파랑으로 고정되면 안 된다.
- 선택 행 내부에서 왼쪽 축선이 강하게 보이면 안 된다.

## Component Notes

### Home

- 홈은 KPI 대시보드가 아니라 진입 화면이다.
- 대분류 카드와 하위 주제 카드가 중심이다.
- 보조 패널 제목은 `처리 지연 이슈`처럼 자연스러운 표현을 쓴다.
- 대분류 아이콘은 둥둥 뜨는 이모지보다 작고 정렬된 아이콘 느낌을 우선한다.

### History List

- 날짜별 이력에는 스티커 태그가 있어야 한다.
- 태그는 기록의 맥락을 보여주기 위한 것이며 과하게 크면 안 된다.
- 검색창은 검색창답게 간단히 둔다.
- 불필요한 스티커식 박스나 큰 필터 버튼은 피한다.

### Detail Panel

- 상세는 문서처럼 읽혀야 한다.
- 본문 순서는 `내용 / 조치 사항 / 향후 계획 / 첨부 URL`이다.
- `다음 확인일` 독립 블록은 삭제 상태를 유지한다.
- `남은 리스크`라는 라벨은 사용자에게 보이지 않게 한다.
- 메타 정보는 작고 또렷하게 둔다.

### Mobile

- 모바일에서 상단 hero가 과하게 높아지지 않아야 한다.
- 버튼이 줄마다 떨어져 큰 빈 공간을 만들면 안 된다.
- 요약 카드 하단의 불필요한 선은 보이지 않아야 한다.
- 목록을 누르면 상세로 이동하고, 상세 닫기로 목록에 돌아올 수 있어야 한다.

## Do Not Revert

아래는 명시 요청이 없으면 되돌리지 않는다.

- 밝은 사이드바 톤
- 부드러운 선택 ring/surface
- `선택` 문구 제거
- 타임라인 선택 점의 상태색 적용
- `향후 계획` 라벨
- `다음 확인일` 상세 블록 삭제
- `처리 지연 이슈` 표현
- 날짜별 이력의 작은 스티커 태그

## Code Ownership

주요 디자인 구현 위치:

- `src/styles.css`
- `src/components/HomeDashboard.tsx`
- `src/components/HistoryList.tsx`
- `src/components/HistoryDetail.tsx`
- `src/components/SubtopicDetailPage.tsx`
- `src/components/AddHistoryPanel.tsx`

주의:

`src/styles.css`에는 여러 번의 디자인 패스가 누적되어 후반 override가 많다. 최신 디자인을 바꿀 때는 브라우저에서 확인한 뒤, 이 문서의 원칙을 기준으로 후반 override 영역을 조심스럽게 정리한다.

## QA Checklist

디자인을 수정한 뒤 최소한 확인한다.

```text
Home desktop
STS detail desktop
same-issue timeline selected row
date history selected row
issue-group tab
add/edit drawer
mobile 430px detail flow
```

검증 명령:

```bash
pnpm build
pnpm test
```
