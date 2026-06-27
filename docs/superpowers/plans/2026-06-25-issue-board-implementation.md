# Issue Board MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a clean local React MVP for the research issue board, centered on an A-style category home dashboard, separate subtopic detail pages, date-based history rows, existing issue group selection, grouped timelines, and related issue discovery.

**Architecture:** Create a Vite + React + TypeScript single-page app with focused domain modules for issue data, selectors, persistence, and export. The UI is componentized around the approved product structure: A-style home category cards, separate subtopic detail workspace, B-style document detail panel, and add-history flow. MVP data persists in `localStorage` with JSON import/export paths so the app remains useful before a real backend exists.

**Tech Stack:** React, TypeScript, Vite, Vitest, CSS modules via plain CSS files, `localStorage`, no charting library for MVP graphs.

---

## File Structure

- `package.json`: scripts and dependencies for Vite, React, TypeScript, Vitest.
- `index.html`: Vite root document.
- `tsconfig.json`, `vite.config.ts`: TypeScript and test/build configuration.
- `src/main.tsx`: React entry point.
- `src/App.tsx`: app shell and screen composition.
- `src/styles.css`: global tokens, layout, cards, issue rows, forms, responsive behavior.
- `src/domain/types.ts`: shared domain types and status constants.
- `src/domain/seedData.ts`: editable seed data for categories, subtopics, issue groups, detail issues, and history entries.
- `src/domain/selectors.ts`: pure derived data functions for summaries, issue lists, long-running issues, recommendations, grouping, and related issues.
- `src/domain/selectors.test.ts`: Vitest coverage for core domain behavior.
- `src/domain/persistence.ts`: localStorage load/save/reset helpers and import/export serialization.
- `src/domain/persistence.test.ts`: Vitest coverage for persistence helpers.
- `src/components/HomeDashboard.tsx`: category cards, subtopic cards, long-running section, simple graph.
- `src/components/SubtopicDetailPage.tsx`: separate large workspace opened after selecting a subtopic.
- `src/components/HistoryList.tsx`: left-side dated history list for the selected subtopic.
- `src/components/HistoryDetail.tsx`: right-side selected dated history detail, same-issue history, and compact related issues.
- `src/components/AddHistoryPanel.tsx`: issue group selection, existing detail issue recommendation first, then dated history entry creation.
- `src/components/AdminDataPanel.tsx`: simple master data editor for subtopics and JSON import/export.
- `src/components/icons.tsx`: small inline icon components if needed.
- `src/App.test.tsx`: component smoke tests using React Testing Library if installed in Task 1. If package install is constrained, this file is skipped and domain tests remain required.

## Implementation Notes

- UI copy should be Korean.
- Store category/subtopic names as Korean labels in data, with stable English-like IDs.
- Default navigation is category/subtopic first.
- Default subtopic-page reading starts from dated history rows on the left; selecting a row opens that dated history detail on the right.
- Default writing is adding a dated history entry under an existing issue group.
- Do not implement authentication in MVP.
- Do not use external network calls in app runtime.
- Do not auto-merge related issues; show them as references.
- Follow `docs/mockups/issue-board-hybrid-home-subtopic-detail-v1.png` for the overall flow: A-style home and separate STS detail page.
- Follow `docs/mockups/issue-detail-date-ledger-v5-home-button.png` for the actual subtopic detail composition: no global sidebar, top summary strip, left dated history list, and right selected history detail. Inside the right detail, show the issue group metadata, selected dated entry detail, same-issue history, and compact related issues.
- Subtopic detail pages must include both `홈으로` and current-list navigation such as `STS 목록으로`.

---

### Task 1: Scaffold React/Vite Project

**Files:**
- Create: `package.json`
- Create: `index.html`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/styles.css`

- [x] **Step 1: Create `package.json`**

```json
{
  "name": "research-issue-board",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@vitejs/plugin-react": "latest",
    "vite": "latest",
    "typescript": "latest",
    "react": "latest",
    "react-dom": "latest",
    "lucide-react": "latest"
  },
  "devDependencies": {
    "vitest": "latest",
    "@testing-library/react": "latest",
    "@testing-library/jest-dom": "latest",
    "jsdom": "latest"
  }
}
```

- [x] **Step 2: Install dependencies**

Run:

```bash
pnpm install
```

Expected: `node_modules/` and `pnpm-lock.yaml` are created. If network access is blocked, rerun with approved network access.

- [x] **Step 3: Create Vite config**

Create `vite.config.ts`:

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
  },
});
```

- [x] **Step 4: Create TypeScript configs**

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["DOM", "DOM.Iterable", "ES2020"],
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "Node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx"
  },
  "include": ["src", "vite.config.ts"]
}
```

- [x] **Step 5: Create root HTML and smoke app**

Create `index.html`:

```html
<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>연구원 이슈 보드</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

Create `src/main.tsx`:

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

Create `src/App.tsx`:

```tsx
export function App() {
  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Research Issue Board</p>
          <h1>연구원 이슈 보드</h1>
        </div>
      </header>
      <section className="empty-state">앱 초기 구성이 준비되었습니다.</section>
    </main>
  );
}
```

Create `src/styles.css`:

```css
:root {
  color-scheme: light;
  --bg: #f6f8fb;
  --surface: #ffffff;
  --surface-muted: #eef3f8;
  --text: #172033;
  --muted: #637083;
  --line: #dbe3ec;
  --accent: #2563eb;
  --accent-soft: #dbeafe;
  --ok: #0f8a5f;
  --warn: #b7791f;
  --danger: #b42318;
  --radius: 8px;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
}

button,
input,
textarea,
select {
  font: inherit;
}

.app-shell {
  min-height: 100vh;
  padding: 28px;
}

.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.eyebrow {
  margin: 0 0 4px;
  color: var(--muted);
  font-size: 13px;
  font-weight: 700;
}

h1 {
  margin: 0;
  font-size: 28px;
  line-height: 1.2;
}

.empty-state {
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: var(--surface);
  padding: 24px;
}
```

- [x] **Step 6: Run scaffold checks**

Run:

```bash
pnpm build
```

Expected: TypeScript and Vite build pass.

- [x] **Step 7: Commit scaffold**

```bash
git add package.json pnpm-lock.yaml index.html tsconfig.json vite.config.ts src/main.tsx src/App.tsx src/styles.css
git commit -m "chore: scaffold issue board app"
```

If the directory is not yet a git repository, initialize it first:

```bash
git init
git add .gitignore docs/superpowers/specs/2026-06-25-issue-board-design.md docs/superpowers/plans/2026-06-25-issue-board-implementation.md
git commit -m "docs: define issue board MVP"
```

---

### Task 2: Domain Types And Seed Data

**Files:**
- Create: `src/domain/types.ts`
- Create: `src/domain/seedData.ts`
- Create: `src/domain/selectors.test.ts`

- [x] **Step 1: Create domain types**

Create `src/domain/types.ts`:

```ts
export type IssueStatus = 'occurred' | 'cause_review' | 'actioning' | 'verification' | 'resolved' | 'on_hold';

export const STATUS_LABELS: Record<IssueStatus, string> = {
  occurred: '발생',
  cause_review: '원인검토',
  actioning: '조치중',
  verification: '검증',
  resolved: '해결',
  on_hold: '보류',
};

export type IssueGroupDisplayStatus = IssueStatus | 'resolution_candidate';

export type Category = {
  id: string;
  label: string;
  description: string;
  order: number;
};

export type Subtopic = {
  id: string;
  categoryId: string;
  label: string;
  order: number;
  hidden?: boolean;
};

export type IssueGroup = {
  id: string;
  title: string;
  categoryId: string;
  subtopicId: string;
  status: IssueStatus;
  statusSource: 'auto' | 'manual';
  firstOccurredAt: string;
  latestUpdatedAt: string;
  currentSummary: string;
  tags: string[];
  groupLabel: string;
  groupColorTone: 'teal' | 'neutral' | 'green';
  ownerName?: string;
  relatedEquipment?: string;
  relatedCustomer?: string;
  priorityLabel?: string;
  sensitive: boolean;
  archived: boolean;
};

export type DetailIssue = {
  id: string;
  issueGroupId: string;
  title: string;
  status: IssueStatus;
  firstOccurredAt: string;
  latestUpdatedAt: string;
  currentSummary: string;
  tags: string[];
  relatedEquipment?: string;
  relatedCustomer?: string;
  priorityLabel?: string;
  ownerName?: string;
  completedAt?: string;
  completionNote?: string;
  needsReview?: boolean;
  archived: boolean;
};

export type HistoryEntry = {
  id: string;
  issueGroupId: string;
  detailIssueId: string;
  date: string;
  status: IssueStatus;
  changesDetailIssueStatus: boolean;
  summary: string;
  details: string;
  remainingRisk: string;
  nextCheckDate?: string;
  blockName?: string;
  referenceLinks: string[];
  authorName?: string;
  attachmentName?: string;
  attachmentSizeLabel?: string;
  createdAt: string;
  updatedAt: string;
};

export type IssueBoardData = {
  categories: Category[];
  subtopics: Subtopic[];
  issueGroups: IssueGroup[];
  detailIssues: DetailIssue[];
  historyEntries: HistoryEntry[];
};
```

- [x] **Step 2: Create seed data**

Create `src/domain/seedData.ts` with Korean sample data:

```ts
import type { IssueBoardData } from './types';

export const seedData: IssueBoardData = {
  categories: [
    { id: 'grade-product', label: '강종/제품', description: '강종, 제품, 적용 조건 관련 이슈', order: 1 },
    { id: 'investment-project', label: '투자/과제', description: '투자, 과제, 예산, 일정 관련 이슈', order: 2 },
    { id: 'equipment-test', label: '설비/시험', description: '시험 장비, 분석, Pilot, 점검 관련 이슈', order: 3 },
    { id: 'customer-quality', label: '고객/품질', description: '고객 클레임, 품질 편차, 인증 관련 이슈', order: 4 }
  ],
  subtopics: [
    { id: 'hpf', categoryId: 'grade-product', label: 'HPF', order: 1 },
    { id: 'sts', categoryId: 'grade-product', label: 'STS', order: 2 },
    { id: 'electrical-steel', categoryId: 'grade-product', label: '전기강판', order: 3 },
    { id: 'plate', categoryId: 'grade-product', label: '후판', order: 4 },
    { id: 'new-investment', categoryId: 'investment-project', label: '신규 투자', order: 1 },
    { id: 'government-project', categoryId: 'investment-project', label: '국책 과제', order: 2 },
    { id: 'joint-research', categoryId: 'investment-project', label: '공동 연구', order: 3 },
    { id: 'budget-schedule', categoryId: 'investment-project', label: '예산/일정', order: 4 },
    { id: 'test-equipment', categoryId: 'equipment-test', label: '시험 장비', order: 1 },
    { id: 'analysis-request', categoryId: 'equipment-test', label: '분석 의뢰', order: 2 },
    { id: 'pilot', categoryId: 'equipment-test', label: 'Pilot', order: 3 },
    { id: 'safety-inspection', categoryId: 'equipment-test', label: '안전/점검', order: 4 },
    { id: 'customer-claim', categoryId: 'customer-quality', label: '고객 클레임', order: 1 },
    { id: 'quality-deviation', categoryId: 'customer-quality', label: '품질 편차', order: 2 },
    { id: 'certification-standard', categoryId: 'customer-quality', label: '인증/규격', order: 3 },
    { id: 'mass-production', categoryId: 'customer-quality', label: '양산 적용', order: 4 }
  ],
  issueGroups: [
    {
      id: 'issue-sts-430-surface',
      title: 'STS-430 표면 결함 재발',
      categoryId: 'grade-product',
      subtopicId: 'sts',
      status: 'resolved',
      statusSource: 'manual',
      firstOccurredAt: '2026-01-01',
      latestUpdatedAt: '2026-02-04',
      currentSummary: '공정 조건 조정 후 2차 샘플에서 재발 없음',
      tags: ['STS-430', '표면결함', '열처리', '고객A'],
      groupLabel: '표면결함개선',
      groupColorTone: 'teal',
      sensitive: true,
      archived: false
    },
    {
      id: 'issue-sts-corrosion-test',
      title: 'STS 내식성 시험 조건 이슈',
      categoryId: 'grade-product',
      subtopicId: 'sts',
      status: 'cause_review',
      statusSource: 'auto',
      firstOccurredAt: '2026-06-11',
      latestUpdatedAt: '2026-06-20',
      currentSummary: '시험 조건 편차 원인 검토 중',
      tags: ['STS', '내식성', '시험조건'],
      groupLabel: '시험조건',
      groupColorTone: 'neutral',
      sensitive: false,
      archived: false
    },
    {
      id: 'issue-hpf-forming-delay',
      title: 'HPF 성형 조건 검증 지연',
      categoryId: 'grade-product',
      subtopicId: 'hpf',
      status: 'actioning',
      statusSource: 'auto',
      firstOccurredAt: '2026-06-03',
      latestUpdatedAt: '2026-06-24',
      currentSummary: '추가 샘플 확보 후 재검증 예정',
      tags: ['HPF', '성형', '검증'],
      groupLabel: '성형조건',
      groupColorTone: 'green',
      sensitive: false,
      archived: false
    }
  ],
  detailIssues: [
    {
      id: 'detail-sts-430-rolling-recur',
      issueGroupId: 'issue-sts-430-surface',
      title: '압연 조건 변경 후 재발 확인',
      status: 'resolved',
      firstOccurredAt: '2026-01-01',
      latestUpdatedAt: '2026-02-04',
      currentSummary: '조건 조정 후 2차 샘플에서 재발 없음',
      tags: ['압연조건', '재발확인'],
      relatedEquipment: '열연 #2',
      relatedCustomer: '고객A',
      priorityLabel: '보통',
      ownerName: '김연구',
      completedAt: '2026-02-04',
      completionNote: '최종 조건 조정 후 재발 없음 확인',
      archived: false
    },
    {
      id: 'detail-sts-corrosion-test-condition',
      issueGroupId: 'issue-sts-corrosion-test',
      title: '염수 분무 조건 편차 확인',
      status: 'cause_review',
      firstOccurredAt: '2026-06-20',
      latestUpdatedAt: '2026-06-20',
      currentSummary: '시편 준비 조건과 장비 설정값 비교 중',
      tags: ['시험조건', '내식성'],
      ownerName: '박연구',
      needsReview: false,
      archived: false
    }
  ],
  historyEntries: [
    {
      id: 'hist-sts-430-occurred',
      issueGroupId: 'issue-sts-430-surface',
      detailIssueId: 'detail-sts-430-rolling-recur',
      date: '2026-01-01',
      status: 'occurred',
      changesDetailIssueStatus: true,
      summary: '고객 클레임 접수',
      details: 'STS-430 적용 제품에서 표면 결함 재발 클레임이 접수되었다.',
      remainingRisk: '발생 범위와 재현 조건 확인 필요',
      nextCheckDate: '2026-01-10',
      blockName: '발생 및 접수',
      referenceLinks: [],
      createdAt: '2026-01-01T09:00:00+09:00',
      updatedAt: '2026-01-01T09:00:00+09:00'
    },
    {
      id: 'hist-sts-430-cause',
      issueGroupId: 'issue-sts-430-surface',
      detailIssueId: 'detail-sts-430-rolling-recur',
      date: '2026-01-10',
      status: 'cause_review',
      changesDetailIssueStatus: true,
      summary: '열처리 이력 및 과거 사례 확인',
      details: '동일 강종 과거 사례와 열처리 조건 이력을 대조했다.',
      remainingRisk: '압연 조건 영향 여부 추가 확인 필요',
      nextCheckDate: '2026-01-22',
      blockName: '원인검토',
      referenceLinks: [],
      createdAt: '2026-01-10T10:00:00+09:00',
      updatedAt: '2026-01-10T10:00:00+09:00'
    },
    {
      id: 'hist-sts-430-action',
      issueGroupId: 'issue-sts-430-surface',
      detailIssueId: 'detail-sts-430-rolling-recur',
      date: '2026-01-22',
      status: 'actioning',
      changesDetailIssueStatus: true,
      summary: '임시 조건 조정, 2차 샘플 대기',
      details: '공정 조건을 임시 조정하고 2차 샘플 결과를 기다린다.',
      remainingRisk: '2차 샘플에서 재발 시 추가 조건 변경 필요',
      nextCheckDate: '2026-02-04',
      blockName: '조치 및 검증',
      referenceLinks: [],
      createdAt: '2026-01-22T14:00:00+09:00',
      updatedAt: '2026-01-22T14:00:00+09:00'
    },
    {
      id: 'hist-sts-430-resolved',
      issueGroupId: 'issue-sts-430-surface',
      detailIssueId: 'detail-sts-430-rolling-recur',
      date: '2026-02-04',
      status: 'resolved',
      changesDetailIssueStatus: true,
      summary: '최종 조건 조정 후 재발 없음',
      details: '최종 조건 조정 후 2차 샘플에서 표면 결함 재발이 확인되지 않았다.',
      remainingRisk: '양산 적용 초기 모니터링 필요',
      blockName: '조치 및 검증',
      referenceLinks: [],
      createdAt: '2026-02-04T16:00:00+09:00',
      updatedAt: '2026-02-04T16:00:00+09:00'
    },
    {
      id: 'hist-sts-corrosion-review',
      issueGroupId: 'issue-sts-corrosion-test',
      detailIssueId: 'detail-sts-corrosion-test-condition',
      date: '2026-06-20',
      status: 'cause_review',
      changesDetailIssueStatus: true,
      summary: '시험 조건 편차 원인 검토',
      details: '시편 준비 조건과 시험 장비 설정값을 비교하고 있다.',
      remainingRisk: '동일 조건 반복 시험 필요',
      nextCheckDate: '2026-06-28',
      blockName: '원인검토',
      referenceLinks: [],
      createdAt: '2026-06-20T11:00:00+09:00',
      updatedAt: '2026-06-20T11:00:00+09:00'
    }
  ]
};
```

- [x] **Step 3: Add first domain test shell**

Create `src/domain/selectors.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { seedData } from './seedData';

describe('seedData', () => {
  it('contains editable category and subtopic master data', () => {
    expect(seedData.categories.map((category) => category.label)).toContain('강종/제품');
    expect(seedData.subtopics.filter((subtopic) => subtopic.categoryId === 'grade-product').map((subtopic) => subtopic.label)).toContain('STS');
  });

  it('stores one issue group with multiple dated history entries', () => {
    const entries = seedData.historyEntries.filter((entry) => entry.issueGroupId === 'issue-sts-430-surface');

    expect(entries).toHaveLength(4);
    expect(entries.map((entry) => entry.date)).toEqual(['2026-01-01', '2026-01-10', '2026-01-22', '2026-02-04']);
  });
});
```

- [x] **Step 4: Run domain seed tests**

Run:

```bash
pnpm test src/domain/selectors.test.ts
```

Expected: two tests pass.

- [x] **Step 5: Commit domain model**

```bash
git add src/domain/types.ts src/domain/seedData.ts src/domain/selectors.test.ts
git commit -m "feat: define issue board domain model"
```

---

### Task 3: Pure Selectors For Summaries And Ledgers

**Files:**
- Create: `src/domain/selectors.ts`
- Modify: `src/domain/selectors.test.ts`

- [x] **Step 1: Add failing selector tests**

Append to `src/domain/selectors.test.ts`:

```ts
import {
  getHistoryRowsForSubtopic,
  getLongRunningUnresolvedIssues,
  getSubtopicSummaries,
} from './selectors';

describe('selectors', () => {
  it('summarizes latest update and unresolved count for each subtopic', () => {
    const summaries = getSubtopicSummaries(seedData);
    const sts = summaries.find((summary) => summary.subtopic.id === 'sts');

    expect(sts?.latestDate).toBe('2026-06-20');
    expect(sts?.unresolvedCount).toBe(1);
  });

  it('returns date-based history rows for a subtopic newest first', () => {
    const rows = getHistoryRowsForSubtopic(seedData, 'sts');

    expect(rows.map((row) => row.entry.date)).toEqual(['2026-06-20', '2026-02-04', '2026-01-22', '2026-01-10', '2026-01-01']);
    expect(rows[0].issue.title).toBe('STS 내식성 시험 조건 이슈');
  });

  it('returns long-running unresolved issues oldest first', () => {
    const issues = getLongRunningUnresolvedIssues(seedData);

    expect(issues[0].id).toBe('issue-hpf-forming-delay');
    expect(issues.every((issue) => issue.status !== 'resolved')).toBe(true);
  });
});
```

- [x] **Step 2: Run tests and confirm selector failures**

Run:

```bash
pnpm test src/domain/selectors.test.ts
```

Expected: fails because `src/domain/selectors.ts` does not exist.

- [x] **Step 3: Implement selectors**

Create `src/domain/selectors.ts`:

```ts
import type { HistoryEntry, IssueBoardData, IssueGroup, Subtopic } from './types';

const unresolvedStatuses = new Set<IssueGroup['status']>(['occurred', 'cause_review', 'actioning', 'verification', 'on_hold']);

export type SubtopicSummary = {
  subtopic: Subtopic;
  latestDate?: string;
  unresolvedCount: number;
};

export type HistoryRow = {
  entry: HistoryEntry;
  issue: IssueGroup;
};

export function getSubtopicSummaries(data: IssueBoardData): SubtopicSummary[] {
  return data.subtopics
    .filter((subtopic) => !subtopic.hidden)
    .sort((a, b) => a.order - b.order)
    .map((subtopic) => {
      const issueGroups = data.issueGroups.filter((issue) => issue.subtopicId === subtopic.id && !issue.archived);
      const dates = issueGroups.flatMap((issue) =>
        data.historyEntries.filter((entry) => entry.issueGroupId === issue.id).map((entry) => entry.date),
      );

      return {
        subtopic,
        latestDate: dates.sort((a, b) => b.localeCompare(a))[0],
        unresolvedCount: issueGroups.filter((issue) => unresolvedStatuses.has(issue.status)).length,
      };
    });
}

export function getHistoryRowsForSubtopic(data: IssueBoardData, subtopicId: string): HistoryRow[] {
  const issueById = new Map(data.issueGroups.map((issue) => [issue.id, issue]));

  return data.historyEntries
    .map((entry) => {
      const issue = issueById.get(entry.issueGroupId);
      return issue ? { entry, issue } : undefined;
    })
    .filter((row): row is HistoryRow => Boolean(row && row.issue.subtopicId === subtopicId && !row.issue.archived))
    .sort((a, b) => b.entry.date.localeCompare(a.entry.date));
}

export function getLongRunningUnresolvedIssues(data: IssueBoardData): IssueGroup[] {
  return data.issueGroups
    .filter((issue) => !issue.archived && unresolvedStatuses.has(issue.status))
    .sort((a, b) => a.firstOccurredAt.localeCompare(b.firstOccurredAt));
}

export function getDetailIssuesForGroup(data: IssueBoardData, issueGroupId: string) {
  return data.detailIssues
    .filter((detailIssue) => detailIssue.issueGroupId === issueGroupId && !detailIssue.archived)
    .sort((a, b) => b.latestUpdatedAt.localeCompare(a.latestUpdatedAt));
}

export function getHistoryEntriesForDetailIssue(data: IssueBoardData, detailIssueId: string) {
  return data.historyEntries
    .filter((entry) => entry.detailIssueId === detailIssueId)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function deriveIssueGroupStatus(data: IssueBoardData, issueGroupId: string): IssueGroupDisplayStatus {
  const detailIssues = getDetailIssuesForGroup(data, issueGroupId);
  if (detailIssues.length === 0) return 'occurred';
  if (detailIssues.some((detailIssue) => detailIssue.status !== 'resolved' && detailIssue.status !== 'on_hold')) {
    return 'actioning';
  }
  if (detailIssues.every((detailIssue) => detailIssue.status === 'resolved')) {
    return 'resolution_candidate';
  }
  return 'on_hold';
}
```

- [x] **Step 4: Run tests**

Run:

```bash
pnpm test src/domain/selectors.test.ts
```

Expected: all tests pass.

- [x] **Step 5: Commit selectors**

```bash
git add src/domain/selectors.ts src/domain/selectors.test.ts
git commit -m "feat: derive issue board summaries"
```

---

### Task 4: Timeline Grouping, Recommendations, And Related Issues

**Files:**
- Modify: `src/domain/selectors.ts`
- Modify: `src/domain/selectors.test.ts`

- [x] **Step 1: Add failing tests for grouping and recommendations**

Append to `src/domain/selectors.test.ts`:

```ts
import {
  getGroupedTimeline,
  getRecommendedIssueGroups,
  getRelatedIssueGroups,
} from './selectors';

describe('timeline grouping and recommendations', () => {
  it('groups timeline entries by block name while preserving date order', () => {
    const groups = getGroupedTimeline(seedData, 'issue-sts-430-surface');

    expect(groups.map((group) => group.name)).toEqual(['발생 및 접수', '원인검토', '조치 및 검증']);
    expect(groups[2].entries.map((entry) => entry.date)).toEqual(['2026-01-22', '2026-02-04']);
  });

  it('recommends existing issue groups before creating a new issue', () => {
    const recommendations = getRecommendedIssueGroups(seedData, {
      categoryId: 'grade-product',
      subtopicId: 'sts',
      query: '430 표면',
    });

    expect(recommendations[0].id).toBe('issue-sts-430-surface');
  });

  it('finds related issues without merging them', () => {
    const related = getRelatedIssueGroups(seedData, 'issue-sts-430-surface');

    expect(related.map((issue) => issue.id)).toContain('issue-sts-corrosion-test');
    expect(related.map((issue) => issue.id)).not.toContain('issue-sts-430-surface');
  });
});
```

- [x] **Step 2: Run tests and confirm failures**

Run:

```bash
pnpm test src/domain/selectors.test.ts
```

Expected: fails because the three selector functions are not exported.

- [x] **Step 3: Implement grouping and recommendation selectors**

Append to `src/domain/selectors.ts`:

```ts
export type TimelineGroup = {
  name: string;
  entries: HistoryEntry[];
};

export type RecommendationInput = {
  categoryId: string;
  subtopicId: string;
  query: string;
};

function normalizeText(value: string): string {
  return value.replace(/\s+/g, '').toLowerCase();
}

function scoreIssue(issue: IssueGroup, query: string): number {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return 0;

  const haystack = normalizeText([issue.title, issue.currentSummary, ...issue.tags].join(' '));
  let score = 0;
  for (const token of normalizedQuery.match(/.{1,2}/g) ?? []) {
    if (haystack.includes(token)) score += 1;
  }
  if (haystack.includes(normalizedQuery)) score += 10;
  return score;
}

export function getGroupedTimeline(data: IssueBoardData, issueGroupId: string): TimelineGroup[] {
  const entries = data.historyEntries
    .filter((entry) => entry.issueGroupId === issueGroupId)
    .sort((a, b) => a.date.localeCompare(b.date));

  const groups: TimelineGroup[] = [];
  for (const entry of entries) {
    const name = entry.blockName || '기타';
    const lastGroup = groups[groups.length - 1];
    if (lastGroup?.name === name) {
      lastGroup.entries.push(entry);
    } else {
      groups.push({ name, entries: [entry] });
    }
  }
  return groups;
}

export function getRecommendedIssueGroups(data: IssueBoardData, input: RecommendationInput): IssueGroup[] {
  return data.issueGroups
    .filter((issue) => issue.categoryId === input.categoryId && issue.subtopicId === input.subtopicId && !issue.archived)
    .map((issue) => ({ issue, score: scoreIssue(issue, input.query) }))
    .sort((a, b) => b.score - a.score || b.issue.latestUpdatedAt.localeCompare(a.issue.latestUpdatedAt))
    .map(({ issue }) => issue);
}

export function getRelatedIssueGroups(data: IssueBoardData, issueGroupId: string): IssueGroup[] {
  const current = data.issueGroups.find((issue) => issue.id === issueGroupId);
  if (!current) return [];

  const currentTags = new Set(current.tags);
  return data.issueGroups
    .filter((issue) => issue.id !== issueGroupId && !issue.archived)
    .map((issue) => {
      let score = 0;
      if (issue.categoryId === current.categoryId) score += 2;
      if (issue.subtopicId === current.subtopicId) score += 3;
      score += issue.tags.filter((tag) => currentTags.has(tag)).length * 2;
      return { issue, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || b.issue.latestUpdatedAt.localeCompare(a.issue.latestUpdatedAt))
    .map((item) => item.issue);
}
```

- [x] **Step 4: Run tests**

Run:

```bash
pnpm test src/domain/selectors.test.ts
```

Expected: all selector tests pass.

- [x] **Step 5: Commit grouping logic**

```bash
git add src/domain/selectors.ts src/domain/selectors.test.ts
git commit -m "feat: add grouped timelines and issue recommendations"
```

---

### Task 5: Persistence And Export Helpers

**Files:**
- Create: `src/domain/persistence.ts`
- Create: `src/domain/persistence.test.ts`

- [x] **Step 1: Create failing persistence tests**

Create `src/domain/persistence.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { seedData } from './seedData';
import { deserializeBoardData, serializeBoardData } from './persistence';

describe('persistence serialization', () => {
  it('round-trips board data as formatted JSON', () => {
    const json = serializeBoardData(seedData);
    const parsed = deserializeBoardData(json);

    expect(json).toContain('\n  "categories"');
    expect(parsed.issueGroups[0].title).toBe('STS-430 표면 결함 재발');
  });

  it('rejects data that does not contain required arrays', () => {
    expect(() => deserializeBoardData('{"categories":[]}')).toThrow('Invalid issue board data');
  });
});
```

- [x] **Step 2: Run tests and confirm failures**

Run:

```bash
pnpm test src/domain/persistence.test.ts
```

Expected: fails because `src/domain/persistence.ts` does not exist.

- [x] **Step 3: Implement persistence helpers**

Create `src/domain/persistence.ts`:

```ts
import { seedData } from './seedData';
import type { IssueBoardData } from './types';

export const STORAGE_KEY = 'research-issue-board-data';

export function serializeBoardData(data: IssueBoardData): string {
  return JSON.stringify(data, null, 2);
}

export function deserializeBoardData(json: string): IssueBoardData {
  const parsed = JSON.parse(json) as Partial<IssueBoardData>;
  if (
    !Array.isArray(parsed.categories) ||
    !Array.isArray(parsed.subtopics) ||
    !Array.isArray(parsed.issueGroups) ||
    !Array.isArray(parsed.historyEntries)
  ) {
    throw new Error('Invalid issue board data');
  }
  return parsed as IssueBoardData;
}

export function loadBoardData(storage: Storage = window.localStorage): IssueBoardData {
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) return seedData;

  try {
    return deserializeBoardData(raw);
  } catch {
    return seedData;
  }
}

export function saveBoardData(data: IssueBoardData, storage: Storage = window.localStorage): void {
  storage.setItem(STORAGE_KEY, serializeBoardData(data));
}

export function resetBoardData(storage: Storage = window.localStorage): IssueBoardData {
  storage.removeItem(STORAGE_KEY);
  return seedData;
}
```

- [x] **Step 4: Run persistence tests**

Run:

```bash
pnpm test src/domain/persistence.test.ts
```

Expected: all persistence tests pass.

- [x] **Step 5: Commit persistence helpers**

```bash
git add src/domain/persistence.ts src/domain/persistence.test.ts
git commit -m "feat: add local issue board persistence"
```

---

### Task 6: Home Dashboard UI

**Files:**
- Create: `src/components/HomeDashboard.tsx`
- Modify: `src/App.tsx`
- Modify: `src/styles.css`

- [x] **Step 1: Create home dashboard component**

Create `src/components/HomeDashboard.tsx`:

```tsx
import type { Category, IssueGroup, Subtopic } from '../domain/types';
import type { SubtopicSummary } from '../domain/selectors';

type HomeDashboardProps = {
  categories: Category[];
  subtopics: Subtopic[];
  summaries: SubtopicSummary[];
  longRunningIssues: IssueGroup[];
  selectedSubtopicId?: string;
  onSelectSubtopic: (subtopicId: string) => void;
};

export function HomeDashboard({
  categories,
  subtopics,
  summaries,
  longRunningIssues,
  selectedSubtopicId,
  onSelectSubtopic,
}: HomeDashboardProps) {
  const summaryBySubtopic = new Map(summaries.map((summary) => [summary.subtopic.id, summary]));
  const unresolvedByCategory = categories.map((category) => {
    const categorySubtopicIds = new Set(subtopics.filter((subtopic) => subtopic.categoryId === category.id).map((subtopic) => subtopic.id));
    const count = summaries
      .filter((summary) => categorySubtopicIds.has(summary.subtopic.id))
      .reduce((total, summary) => total + summary.unresolvedCount, 0);
    return { category, count };
  });
  const maxUnresolved = Math.max(1, ...unresolvedByCategory.map((item) => item.count));

  return (
    <section className="home-grid" aria-label="이슈 종류 선택">
      <div className="category-grid">
        {categories
          .slice()
          .sort((a, b) => a.order - b.order)
          .map((category) => (
            <article className="category-card" key={category.id}>
              <div className="category-card__header">
                <div>
                  <h2>{category.label}</h2>
                  <p>{category.description}</p>
                </div>
              </div>
              <div className="subtopic-grid">
                {subtopics
                  .filter((subtopic) => subtopic.categoryId === category.id && !subtopic.hidden)
                  .sort((a, b) => a.order - b.order)
                  .map((subtopic) => {
                    const summary = summaryBySubtopic.get(subtopic.id);
                    return (
                      <button
                        className={`subtopic-card ${selectedSubtopicId === subtopic.id ? 'is-selected' : ''}`}
                        key={subtopic.id}
                        type="button"
                        onClick={() => onSelectSubtopic(subtopic.id)}
                      >
                        <span className="subtopic-card__label">{subtopic.label}</span>
                        <span>최근 {summary?.latestDate ?? '-'}</span>
                        <strong>미해결 {summary?.unresolvedCount ?? 0}</strong>
                      </button>
                    );
                  })}
              </div>
            </article>
          ))}
      </div>

      <aside className="side-panel" aria-label="장기 미해결 이슈">
        <h2>오래 열린 미해결</h2>
        <div className="long-running-list">
          {longRunningIssues.slice(0, 5).map((issue) => (
            <div className="long-running-card" key={issue.id}>
              <strong>{issue.title}</strong>
              <span>최초 {issue.firstOccurredAt}</span>
              <p>{issue.currentSummary}</p>
            </div>
          ))}
        </div>

        <div className="mini-chart" aria-label="대분류별 미해결 현황">
          <h3>대분류별 미해결</h3>
          {unresolvedByCategory.map(({ category, count }) => (
            <div className="mini-chart__row" key={category.id}>
              <span>{category.label}</span>
              <div className="mini-chart__track">
                <i style={{ width: `${(count / maxUnresolved) * 100}%` }} />
              </div>
              <strong>{count}</strong>
            </div>
          ))}
        </div>
      </aside>
    </section>
  );
}
```

- [x] **Step 2: Wire home dashboard into app**

Replace `src/App.tsx` with:

```tsx
import { useMemo, useState } from 'react';
import { HomeDashboard } from './components/HomeDashboard';
import { seedData } from './domain/seedData';
import { getLongRunningUnresolvedIssues, getSubtopicSummaries } from './domain/selectors';

export function App() {
  const [selectedSubtopicId, setSelectedSubtopicId] = useState(seedData.subtopics.find((subtopic) => subtopic.id === 'sts')?.id);
  const summaries = useMemo(() => getSubtopicSummaries(seedData), []);
  const longRunningIssues = useMemo(() => getLongRunningUnresolvedIssues(seedData), []);

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Research Issue Board</p>
          <h1>연구원 이슈 보드</h1>
        </div>
        <button className="primary-button" type="button">이력 추가</button>
      </header>

      <HomeDashboard
        categories={seedData.categories}
        subtopics={seedData.subtopics}
        summaries={summaries}
        longRunningIssues={longRunningIssues}
        selectedSubtopicId={selectedSubtopicId}
        onSelectSubtopic={setSelectedSubtopicId}
      />
    </main>
  );
}
```

- [x] **Step 3: Add dashboard CSS**

Append to `src/styles.css`:

```css
.primary-button {
  border: 0;
  border-radius: 7px;
  background: var(--accent);
  color: white;
  padding: 10px 14px;
  font-weight: 700;
  cursor: pointer;
}

.home-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 18px;
  align-items: start;
}

.category-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.category-card,
.side-panel {
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: var(--surface);
  padding: 16px;
}

.category-card h2,
.side-panel h2 {
  margin: 0 0 6px;
  font-size: 18px;
}

.category-card p {
  margin: 0;
  color: var(--muted);
  font-size: 13px;
}

.category-card__header {
  margin-bottom: 14px;
}

.subtopic-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.subtopic-card {
  display: grid;
  gap: 4px;
  min-height: 82px;
  border: 1px solid var(--line);
  border-radius: 7px;
  background: var(--surface-muted);
  color: var(--text);
  padding: 10px;
  text-align: left;
  cursor: pointer;
}

.subtopic-card.is-selected {
  border-color: var(--accent);
  background: var(--accent-soft);
}

.subtopic-card__label {
  font-weight: 800;
}

.subtopic-card span {
  color: var(--muted);
  font-size: 12px;
}

.subtopic-card strong {
  font-size: 14px;
}

.long-running-list {
  display: grid;
  gap: 10px;
}

.long-running-card {
  border: 1px solid var(--line);
  border-radius: 7px;
  padding: 10px;
}

.long-running-card strong,
.long-running-card span {
  display: block;
}

.long-running-card span,
.long-running-card p {
  color: var(--muted);
  font-size: 12px;
}

.long-running-card p {
  margin: 6px 0 0;
}

.mini-chart {
  margin-top: 18px;
  border-top: 1px solid var(--line);
  padding-top: 14px;
}

.mini-chart h3 {
  margin: 0 0 10px;
  font-size: 15px;
}

.mini-chart__row {
  display: grid;
  grid-template-columns: 78px minmax(0, 1fr) 28px;
  gap: 8px;
  align-items: center;
  margin-bottom: 8px;
  color: var(--muted);
  font-size: 12px;
}

.mini-chart__track {
  height: 8px;
  overflow: hidden;
  border-radius: 999px;
  background: var(--surface-muted);
}

.mini-chart__track i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--accent);
}

.mini-chart__row strong {
  color: var(--text);
  text-align: right;
}

@media (max-width: 980px) {
  .home-grid {
    grid-template-columns: 1fr;
  }

  .category-grid {
    grid-template-columns: 1fr;
  }
}
```

- [x] **Step 4: Run build**

Run:

```bash
pnpm build
```

Expected: build passes and home dashboard renders.

- [x] **Step 5: Commit dashboard**

```bash
git add src/App.tsx src/components/HomeDashboard.tsx src/styles.css
git commit -m "feat: add category home dashboard"
```

---

### Task 7: Subtopic Date History Page

**Files:**
- Create: `src/components/SubtopicDetailPage.tsx`
- Create: `src/components/HistoryList.tsx`
- Modify: `src/App.tsx`
- Modify: `src/styles.css`

- [x] **Step 1: Create left-side dated history list component**

Create `src/components/HistoryList.tsx`:

```tsx
import { useMemo, useState } from 'react';
import type { HistoryEntry, IssueGroup } from '../domain/types';
import { STATUS_LABELS } from '../domain/types';

type HistoryListProps = {
  entries: HistoryEntry[];
  issues: IssueGroup[];
  selectedEntryId?: string;
  onSelectEntry: (entryId: string) => void;
};

export function HistoryList({ entries, issues, selectedEntryId, onSelectEntry }: HistoryListProps) {
  const [query, setQuery] = useState('');
  const issueById = useMemo(() => new Map(issues.map((issue) => [issue.id, issue])), [issues]);
  const filteredEntries = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return entries;

    return entries.filter((entry) => {
      const issue = issueById.get(entry.issueGroupId);
      const searchableText = [
        entry.date,
        entry.summary,
        entry.details,
        entry.status,
        issue?.title,
        issue?.groupLabel,
        ...(issue?.tags ?? []),
      ].join(' ').toLowerCase();

      return searchableText.includes(normalizedQuery);
    });
  }, [entries, issueById, query]);

  return (
    <section className="history-list-panel" aria-label="날짜별 이력 목록">
      <div className="section-header">
        <div>
          <h2>날짜별 이력</h2>
          <p>최근 기록부터 이어 읽는 운영 로그입니다.</p>
        </div>
      </div>
      <div className="history-tools" aria-label="이력 검색과 필터">
        <label className="search-box">
          <span>⌕</span>
          <input
            type="search"
            value={query}
            placeholder="이슈 제목, 스티커, 요약 검색..."
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <button className="filter-button" type="button">⌯ 필터</button>
      </div>
      <div className="history-list">
        {filteredEntries.map((entry) => {
          const issue = issueById.get(entry.issueGroupId);
          return (
          <button
            className={`history-row ${selectedEntryId === entry.id ? 'is-selected' : ''}`}
            key={entry.id}
            type="button"
            onClick={() => onSelectEntry(entry.id)}
          >
            <div className="row-meta">
              <time>{entry.date}</time>
              {issue && <span className={`group-sticker tone-${issue.groupColorTone}`}>{issue.groupLabel}</span>}
              <span className="status-pill">{STATUS_LABELS[entry.status]}</span>
            </div>
            <strong>{entry.summary}</strong>
            <p>{entry.details}</p>
            {entry.nextCheckDate && <small>다음 확인 {entry.nextCheckDate}</small>}
          </button>
          );
        })}
        {filteredEntries.length === 0 && <p className="empty-list">검색 결과가 없습니다.</p>}
      </div>
    </section>
  );
}
```

- [x] **Step 2: Create separate subtopic detail page**

Create `src/components/SubtopicDetailPage.tsx`:

```tsx
import type { Category, HistoryEntry, IssueGroup, Subtopic } from '../domain/types';
import { HistoryList } from './HistoryList';

type SubtopicDetailPageProps = {
  category?: Category;
  subtopic?: Subtopic;
  issues: IssueGroup[];
  entries: HistoryEntry[];
  selectedEntryId?: string;
  onSelectEntry: (entryId: string) => void;
  onBackHome: () => void;
};

export function SubtopicDetailPage({
  category,
  subtopic,
  issues,
  entries,
  selectedEntryId,
  onSelectEntry,
  onBackHome,
}: SubtopicDetailPageProps) {
  return (
    <section className="subtopic-page" aria-label="하위 주제 상세">
      <div className="subtopic-page__header">
        <button className="text-button" type="button" onClick={onBackHome}>홈으로</button>
        <div>
          <p className="breadcrumb">{category?.label ?? '대분류'} &gt; {subtopic?.label ?? '하위 주제'}</p>
          <h2>{subtopic?.label ?? '이슈'} 이슈 이력</h2>
        </div>
        <div className="subtopic-page__stats">
          <span>최근 {entries[0]?.date ?? '-'}</span>
          <strong>전체 이력 {entries.length}건</strong>
        </div>
      </div>

      <HistoryList
        entries={entries}
        issues={issues}
        selectedEntryId={selectedEntryId}
        onSelectEntry={onSelectEntry}
      />
    </section>
  );
}
```

- [x] **Step 3: Wire separate page into `App.tsx`**

Update `src/App.tsx` to compute rows, selected entry, and current page:

```tsx
import { useMemo, useState } from 'react';
import { HomeDashboard } from './components/HomeDashboard';
import { SubtopicDetailPage } from './components/SubtopicDetailPage';
import { seedData } from './domain/seedData';
import { getLongRunningUnresolvedIssues, getSubtopicSummaries } from './domain/selectors';

export function App() {
  const [selectedSubtopicId, setSelectedSubtopicId] = useState('sts');
  const [selectedEntryId, setSelectedEntryId] = useState<string | undefined>('hist-sts-430-resolved');
  const [page, setPage] = useState<'home' | 'subtopic'>('home');
  const summaries = useMemo(() => getSubtopicSummaries(seedData), []);
  const longRunningIssues = useMemo(() => getLongRunningUnresolvedIssues(seedData), []);
  const issues = useMemo(
    () => seedData.issueGroups.filter((issue) => issue.subtopicId === selectedSubtopicId && !issue.archived),
    [selectedSubtopicId],
  );
  const entries = useMemo(
    () =>
      seedData.historyEntries
        .filter((entry) => issues.some((issue) => issue.id === entry.issueGroupId))
        .sort((a, b) => b.date.localeCompare(a.date)),
    [issues],
  );
  const selectedSubtopic = seedData.subtopics.find((subtopic) => subtopic.id === selectedSubtopicId);
  const selectedCategory = seedData.categories.find((category) => category.id === selectedSubtopic?.categoryId);

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Research Issue Board</p>
          <h1>연구원 이슈 보드</h1>
        </div>
        <button className="primary-button" type="button">이력 추가</button>
      </header>

      {page === 'home' ? (
        <HomeDashboard
          categories={seedData.categories}
          subtopics={seedData.subtopics}
          summaries={summaries}
          longRunningIssues={longRunningIssues}
          selectedSubtopicId={selectedSubtopicId}
          onSelectSubtopic={(subtopicId) => {
            setSelectedSubtopicId(subtopicId);
            const nextIssue = seedData.issueGroups.find((issue) => issue.subtopicId === subtopicId && !issue.archived);
            const nextEntry = nextIssue
              ? seedData.historyEntries
                  .filter((entry) => entry.issueGroupId === nextIssue.id)
                  .sort((a, b) => b.date.localeCompare(a.date))[0]
              : undefined;
            setSelectedEntryId(nextEntry?.id);
            setPage('subtopic');
          }}
        />
      ) : (
        <SubtopicDetailPage
          category={selectedCategory}
          subtopic={selectedSubtopic}
          issues={issues}
          entries={entries}
          selectedEntryId={selectedEntryId}
          onSelectEntry={setSelectedEntryId}
          onBackHome={() => setPage('home')}
        />
      )}
    </main>
  );
}
```

- [x] **Step 4: Add subtopic page and dated history list CSS**

Append to `src/styles.css`:

```css
.subtopic-page {
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: var(--surface);
  padding: 16px;
}

.subtopic-page__header {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 14px;
  align-items: center;
  border-bottom: 1px solid var(--line);
  padding-bottom: 14px;
}

.subtopic-page__header h2 {
  margin: 4px 0 0;
  font-size: 24px;
}

.breadcrumb {
  margin: 0;
  color: var(--muted);
  font-size: 13px;
  font-weight: 700;
}

.text-button {
  border: 1px solid var(--line);
  border-radius: 7px;
  background: var(--surface-muted);
  color: var(--text);
  padding: 9px 12px;
  font-weight: 700;
  cursor: pointer;
}

.subtopic-page__stats {
  display: grid;
  gap: 4px;
  color: var(--muted);
  font-size: 13px;
  text-align: right;
}

.subtopic-page__stats strong {
  color: var(--text);
}

.history-list-panel {
  margin-top: 18px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: var(--surface);
  padding: 16px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.section-header h2 {
  margin: 0 0 4px;
  font-size: 18px;
}

.section-header p {
  margin: 0;
  color: var(--muted);
  font-size: 13px;
}

.history-tools {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  margin-bottom: 12px;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  border: 1px solid var(--line);
  border-radius: 7px;
  background: #fff;
  color: var(--muted);
  padding: 9px 10px;
}

.search-box input {
  min-width: 0;
  width: 100%;
  border: 0;
  outline: 0;
  color: var(--text);
  background: transparent;
}

.filter-button {
  border: 1px solid var(--line);
  border-radius: 7px;
  background: #fff;
  color: var(--text);
  padding: 9px 11px;
  font-weight: 800;
}

.history-list {
  display: grid;
  gap: 8px;
}

.history-row {
  display: grid;
  gap: 7px;
  border: 1px solid var(--line);
  border-radius: 7px;
  background: #fff;
  color: var(--text);
  padding: 11px;
  text-align: left;
  cursor: pointer;
}

.history-row.is-selected {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft);
}

.history-row time {
  color: var(--accent);
  font-size: 12px;
  font-weight: 900;
}

.row-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.row-meta .status-pill {
  margin-left: auto;
}

.history-row span,
.history-row p {
  color: var(--muted);
}

.history-row .group-sticker {
  color: #1f6f78;
}

.history-row .group-sticker.tone-neutral {
  color: #586779;
}

.history-row .group-sticker.tone-green {
  color: #256f52;
}

.history-row p {
  margin: 0;
  font-size: 13px;
}

.history-row small,
.status-pill,
.unresolved-dot {
  display: inline-flex;
  width: fit-content;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  padding: 4px 8px;
  font-size: 12px;
  font-weight: 800;
}

.status-pill {
  background: var(--surface-muted);
}

.unresolved-dot {
  background: #fff7ed;
  color: var(--warn);
}

@media (max-width: 760px) {
  .app-shell {
    padding: 16px;
  }

  .subtopic-page__header {
    grid-template-columns: 1fr;
  }

  .subtopic-page__stats {
    text-align: left;
  }
}
```

- [x] **Step 5: Run build**

Run:

```bash
pnpm build
```

Expected: build passes. Clicking `STS` from the home dashboard opens a separate large subtopic detail page with a left-side dated history list.

- [x] **Step 6: Commit dated history list and separate page**

```bash
git add src/App.tsx src/components/SubtopicDetailPage.tsx src/components/HistoryList.tsx src/styles.css
git commit -m "feat: add subtopic history list page"
```

---

### Task 8: History Detail With Same-Issue Context And Related Issues

**Files:**
- Create: `src/components/HistoryDetail.tsx`
- Modify: `src/components/SubtopicDetailPage.tsx`
- Modify: `src/App.tsx`
- Modify: `src/styles.css`

- [x] **Step 1: Create selected-date history detail component**

Create `src/components/HistoryDetail.tsx`:

```tsx
import type { HistoryEntry, IssueGroup } from '../domain/types';
import { STATUS_LABELS } from '../domain/types';

type HistoryDetailProps = {
  issue?: IssueGroup;
  entry?: HistoryEntry;
  sameIssueEntries: HistoryEntry[];
  relatedIssues: IssueGroup[];
  onSelectEntry: (entryId: string) => void;
};

export function HistoryDetail({ issue, entry, sameIssueEntries, relatedIssues, onSelectEntry }: HistoryDetailProps) {
  if (!issue || !entry) {
    return (
      <section className="detail-panel">
        <h2>상세 이력</h2>
        <p className="muted">왼쪽에서 날짜별 이력을 선택하면 상세가 표시됩니다.</p>
      </section>
    );
  }

  return (
    <section className="detail-panel" aria-label="상세 이력">
      <div className="detail-summary">
        <div>
          <div className="issue-title-row">
            <h2>{issue.title}</h2>
            <button className="star-button" type="button" aria-label="즐겨찾기">☆</button>
          </div>
          <div className="tag-row">
            {issue.tags.map((tag) => <span className="tag" key={tag}>{tag}</span>)}
          </div>
        </div>
        <div className="detail-actions">
          <button className="text-button" type="button">{STATUS_LABELS[issue.status]}⌄</button>
          <button className="text-button" type="button" aria-label="더보기">···</button>
        </div>
      </div>

      <div className="issue-meta-strip">
        <div><span>최초 보고일</span><strong>{issue.firstOccurredAt}</strong></div>
        <div><span>작성자</span><strong>{issue.ownerName ?? '-'}</strong></div>
        <div><span>관련 설비</span><strong>{issue.relatedEquipment ?? '-'}</strong></div>
        <div><span>관련 고객</span><strong>{issue.relatedCustomer ?? '-'}</strong></div>
        <div><span>우선순위</span><strong>{issue.priorityLabel ?? '보통'}</strong></div>
      </div>

      <div className="detail-body">
        <aside className="timeline-panel">
          <h3>이력 목록</h3>
          {sameIssueEntries.map((history) => (
            <button
              className={`timeline-row ${history.id === entry.id ? 'is-selected' : ''}`}
              key={history.id}
              type="button"
              onClick={() => onSelectEntry(history.id)}
            >
              <span>{history.date}</span>
              <strong>{history.summary}</strong>
            </button>
          ))}
          <button className="show-all-button" type="button">이력 전체 보기</button>
        </aside>

        <article className="selected-entry">
          <h3>{entry.date} {entry.summary}</h3>
          <p className="entry-byline">{entry.authorName ?? '관리자'} · {entry.createdAt}</p>
          <p>{entry.details}</p>
          <div className="detail-facts">
            <div>
              <span>남은 리스크</span>
              <p>{entry.remainingRisk || '없음'}</p>
            </div>
            <div>
              <span>다음 확인일</span>
              <p>{entry.nextCheckDate ?? '-'}</p>
            </div>
          </div>
          {entry.attachmentName && (
            <div className="file-row">
              <span>{entry.attachmentName}</span>
              <strong>{entry.attachmentSizeLabel ?? '-'}</strong>
            </div>
          )}
        </article>

        <aside className="related-box">
          <h3>관련 이슈</h3>
          <div className="related-list">
            {relatedIssues.length === 0 && <p className="muted">연관 이슈가 없습니다.</p>}
            {relatedIssues.map((related) => (
              <div className="related-card" key={related.id}>
                <strong>{related.title}</strong>
                <span>{related.latestUpdatedAt} · {STATUS_LABELS[related.status]}</span>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </section>
  );
}
```

- [x] **Step 2: Place detail panel to the right of the dated history list**

Modify `src/components/SubtopicDetailPage.tsx` to accept and render the selected dated history detail panel to the right of the history list:

```tsx
import type { Category, HistoryEntry, IssueGroup, Subtopic } from '../domain/types';
import { HistoryList } from './HistoryList';
import { HistoryDetail } from './HistoryDetail';

type SubtopicDetailPageProps = {
  category?: Category;
  subtopic?: Subtopic;
  issues: IssueGroup[];
  entries: HistoryEntry[];
  selectedEntryId?: string;
  selectedIssue?: IssueGroup;
  selectedEntry?: HistoryEntry;
  sameIssueEntries: HistoryEntry[];
  relatedIssues: IssueGroup[];
  onSelectEntry: (entryId: string) => void;
  onBackHome: () => void;
};

export function SubtopicDetailPage({
  category,
  subtopic,
  issues,
  entries,
  selectedEntryId,
  selectedIssue,
  selectedEntry,
  sameIssueEntries,
  relatedIssues,
  onSelectEntry,
  onBackHome,
}: SubtopicDetailPageProps) {
  return (
    <section className="subtopic-page" aria-label="하위 주제 상세">
      <div className="subtopic-page__header">
        <button className="text-button" type="button" onClick={onBackHome}>홈으로</button>
        <div>
          <p className="breadcrumb">{category?.label ?? '대분류'} &gt; {subtopic?.label ?? '하위 주제'}</p>
          <h2>{subtopic?.label ?? '이슈'} 이슈 이력</h2>
        </div>
        <div className="subtopic-page__stats">
          <span>최근 {entries[0]?.date ?? '-'}</span>
          <strong>전체 이력 {entries.length}건</strong>
        </div>
      </div>

      <div className="subtopic-page__content">
        <HistoryList
          entries={entries}
          issues={issues}
          selectedEntryId={selectedEntryId}
          onSelectEntry={onSelectEntry}
        />
        <HistoryDetail
          issue={selectedIssue}
          entry={selectedEntry}
          sameIssueEntries={sameIssueEntries}
          relatedIssues={relatedIssues}
          onSelectEntry={onSelectEntry}
        />
      </div>
    </section>
  );
}
```

- [x] **Step 3: Wire detail data in `App.tsx`**

Update imports and derived state:

```tsx
import {
  getLongRunningUnresolvedIssues,
  getRelatedIssueGroups,
  getSubtopicSummaries,
} from './domain/selectors';
```

Add before return:

```tsx
const entries = data.historyEntries
  .filter((entry) => issues.some((issue) => issue.id === entry.issueGroupId))
  .sort((a, b) => b.date.localeCompare(a.date));
const selectedEntry = entries.find((entry) => entry.id === selectedEntryId) ?? entries[0];
const selectedIssue = data.issueGroups.find((issue) => issue.id === selectedEntry?.issueGroupId);
const sameIssueEntries = data.historyEntries
  .filter((entry) => entry.issueGroupId === selectedIssue?.id)
  .sort((a, b) => b.date.localeCompare(a.date));
const relatedIssues = useMemo(
  () => (selectedIssue ? getRelatedIssueGroups(data, selectedIssue.id) : []),
  [data, selectedIssue],
);
```

Pass the detail props into `SubtopicDetailPage`:

```tsx
<SubtopicDetailPage
  category={selectedCategory}
  subtopic={selectedSubtopic}
  issues={issues}
  entries={entries}
  selectedEntryId={selectedEntryId}
  selectedIssue={selectedIssue}
  selectedEntry={selectedEntry}
  sameIssueEntries={sameIssueEntries}
  relatedIssues={relatedIssues}
  onSelectEntry={setSelectedEntryId}
  onBackHome={() => setPage('home')}
/>
```

- [x] **Step 4: Add detail CSS**

Append to `src/styles.css`:

```css
.detail-panel {
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: var(--surface);
  overflow: hidden;
}

.detail-summary {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: start;
  justify-content: space-between;
  gap: 12px;
  border-bottom: 1px solid var(--line);
  padding: 18px;
}

.detail-summary h2,
.selected-entry h3 {
  margin: 0 0 8px;
}

.issue-title-row,
.tag-row,
.detail-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.star-button {
  border: 0;
  background: transparent;
  color: var(--muted);
  font-size: 22px;
  cursor: pointer;
}

.tag {
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--surface);
  color: var(--muted);
  padding: 4px 9px;
  font-size: 12px;
  font-weight: 800;
}

.group-sticker {
  display: inline-flex;
  width: fit-content;
  align-items: center;
  border: 1px solid #bfd6d9;
  border-radius: 999px;
  background: #edf7f7;
  color: #1f6f78;
  padding: 3px 8px;
  font-size: 11px;
  font-weight: 900;
  line-height: 1.2;
}

.group-sticker.tone-neutral {
  border-color: #d4dce6;
  background: #f3f6f9;
  color: #586779;
}

.group-sticker.tone-green {
  border-color: #cce3d8;
  background: #eff8f3;
  color: #256f52;
}

.issue-meta-strip {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  border-bottom: 1px solid var(--line);
}

.issue-meta-strip div {
  border-right: 1px solid var(--line);
  padding: 12px 14px;
}

.issue-meta-strip div:last-child {
  border-right: 0;
}

.issue-meta-strip span {
  display: block;
  margin-bottom: 5px;
  color: var(--muted);
  font-size: 12px;
  font-weight: 800;
}

.selected-entry {
  min-width: 0;
}

.detail-body {
  display: grid;
  grid-template-columns: 240px minmax(0, 1fr) 280px;
  gap: 16px;
  padding: 18px;
}

.timeline-panel {
  position: relative;
  border: 1px solid var(--line);
  border-radius: 7px;
  padding: 14px;
}

.timeline-panel h3 {
  margin: 0 0 14px;
  font-size: 15px;
}

.timeline-row {
  position: relative;
  display: grid;
  gap: 4px;
  width: 100%;
  border: 0;
  border-left: 2px solid var(--line);
  background: transparent;
  color: var(--text);
  padding: 9px 8px 9px 14px;
  text-align: left;
  cursor: pointer;
}

.timeline-row::before {
  position: absolute;
  top: 13px;
  left: -6px;
  width: 9px;
  height: 9px;
  border: 2px solid #aebccc;
  border-radius: 999px;
  background: var(--surface);
  content: "";
}

.timeline-row.is-selected {
  border-left-color: var(--accent);
  background: var(--accent-soft);
}

.timeline-row.is-selected::before {
  border-color: var(--accent);
  background: var(--accent);
}

.timeline-row span {
  color: var(--muted);
  font-size: 12px;
}

.show-all-button {
  width: 100%;
  margin-top: 12px;
  border: 1px solid var(--line);
  border-radius: 7px;
  background: var(--surface);
  color: var(--accent);
  padding: 10px;
  font-weight: 800;
}

.detail-facts {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 12px;
}

.detail-facts div {
  border: 1px solid var(--line);
  border-radius: 7px;
  background: var(--surface);
  padding: 10px;
}

.detail-facts span {
  display: block;
  margin-bottom: 6px;
  color: var(--muted);
  font-size: 12px;
  font-weight: 800;
}

.detail-facts p {
  margin: 0;
}

.muted {
  color: var(--muted);
}

.related-box {
  border: 1px solid var(--line);
  border-radius: 7px;
  padding: 12px;
}

.related-box h3 {
  margin: 0 0 10px;
  font-size: 15px;
}

.related-list {
  display: grid;
  gap: 8px;
}

.related-card {
  border: 1px solid var(--line);
  border-radius: 7px;
  padding: 10px;
}

.related-card span {
  display: block;
  margin-top: 4px;
  color: var(--muted);
  font-size: 12px;
}

.subtopic-page__content {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(360px, 0.85fr);
  gap: 16px;
}

@media (max-width: 1100px) {
  .subtopic-page__content,
  .detail-body,
  .issue-meta-strip {
    grid-template-columns: 1fr;
  }
}
```

- [x] **Step 5: Run build and test selector coverage**

Run:

```bash
pnpm test src/domain/selectors.test.ts
pnpm build
```

Expected: tests and build pass.

- [x] **Step 6: Commit detail view**

```bash
git add src/App.tsx src/components/SubtopicDetailPage.tsx src/components/HistoryDetail.tsx src/styles.css
git commit -m "feat: show document-style history detail panel"
```

---

### Task 9: Add History Flow

**Files:**
- Create: `src/components/AddHistoryPanel.tsx`
- Modify: `src/App.tsx`
- Modify: `src/styles.css`

- [x] **Step 1: Create add history component**

Create `src/components/AddHistoryPanel.tsx`:

```tsx
import { useMemo, useState } from 'react';
import { getDetailIssuesForGroup } from '../domain/selectors';
import type { DetailIssue, HistoryEntry, IssueBoardData, IssueGroup, IssueStatus } from '../domain/types';
import { STATUS_LABELS } from '../domain/types';

type AddHistoryPanelProps = {
  data: IssueBoardData;
  categoryId: string;
  subtopicId: string;
  initialIssueGroupId?: string;
  initialDetailIssueId?: string;
  onAddEntry: (issueGroup: IssueGroup, detailIssue: DetailIssue, entry: HistoryEntry) => void;
  onClose: () => void;
};

export function AddHistoryPanel({
  data,
  categoryId,
  subtopicId,
  initialIssueGroupId,
  initialDetailIssueId,
  onAddEntry,
  onClose,
}: AddHistoryPanelProps) {
  const [query, setQuery] = useState('');
  const issueGroups = data.issueGroups.filter((issue) => issue.categoryId === categoryId && issue.subtopicId === subtopicId && !issue.archived);
  const [selectedIssueGroupId, setSelectedIssueGroupId] = useState<string>(initialIssueGroupId ?? issueGroups[0]?.id ?? '');
  const selectedIssueGroup = data.issueGroups.find((issue) => issue.id === selectedIssueGroupId);
  const recommendedDetailIssues = useMemo(() => {
    if (!selectedIssueGroup) return [];
    const candidates = getDetailIssuesForGroup(data, selectedIssueGroup.id);
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return candidates;
    return candidates.filter((detailIssue) =>
      [detailIssue.title, detailIssue.currentSummary, ...detailIssue.tags].join(' ').toLowerCase().includes(normalizedQuery),
    );
  }, [data, query, selectedIssueGroup]);
  const [selectedDetailIssueId, setSelectedDetailIssueId] = useState<string>(initialDetailIssueId ?? '');
  const selectedDetailIssue =
    data.detailIssues.find((detailIssue) => detailIssue.id === selectedDetailIssueId) ?? recommendedDetailIssues[0];
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState<IssueStatus>('actioning');
  const [changesStatus, setChangesStatus] = useState(true);
  const [summary, setSummary] = useState('');
  const [details, setDetails] = useState('');
  const [remainingRisk, setRemainingRisk] = useState('');

  function submit() {
    if (!selectedIssueGroup || !selectedDetailIssue || !summary.trim()) return;
    const now = new Date().toISOString();
    onAddEntry(selectedIssueGroup, selectedDetailIssue, {
      id: `hist-${Date.now()}`,
      issueGroupId: selectedIssueGroup.id,
      detailIssueId: selectedDetailIssue.id,
      date,
      status,
      changesDetailIssueStatus: changesStatus,
      summary: summary.trim(),
      details: details.trim(),
      remainingRisk: remainingRisk.trim(),
      blockName: STATUS_LABELS[status],
      referenceLinks: [],
      createdAt: now,
      updatedAt: now,
    });
  }

  return (
    <aside className="drawer" aria-label="이력 추가">
      <div className="drawer__header">
        <h2>이력 추가</h2>
        <button type="button" onClick={onClose}>닫기</button>
      </div>

      <label className="field">
        <span>큰 구분/스티커</span>
        <select value={selectedIssueGroupId} onChange={(event) => setSelectedIssueGroupId(event.target.value)}>
          {issueGroups.map((issue) => (
            <option key={issue.id} value={issue.id}>{issue.groupLabel} · {issue.title}</option>
          ))}
        </select>
      </label>

      <label className="field">
        <span>연결할 세부 이슈 검색</span>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="예: 압연 조건, 재발 확인, 검사 데이터" />
      </label>

      <div className="recommendation-list">
        {recommendedDetailIssues.map((detailIssue) => (
          <button
            className={`recommendation-card ${selectedDetailIssue?.id === detailIssue.id ? 'is-selected' : ''}`}
            key={detailIssue.id}
            type="button"
            onClick={() => setSelectedDetailIssueId(detailIssue.id)}
          >
            <strong>{detailIssue.title}</strong>
            <span>최근 {detailIssue.latestUpdatedAt} · {STATUS_LABELS[detailIssue.status]}</span>
          </button>
        ))}
        <button className="recommendation-card" type="button">
          + 새 세부 이슈 만들기
        </button>
      </div>

      <label className="field">
        <span>날짜</span>
        <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
      </label>
      <label className="field">
        <span>세부 이슈 상태</span>
        <select value={status} onChange={(event) => setStatus(event.target.value as IssueStatus)}>
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </label>
      <label className="checkbox-field">
        <input type="checkbox" checked={changesStatus} onChange={(event) => setChangesStatus(event.target.checked)} />
        <span>이 날짜별 이력으로 세부 이슈 상태를 변경합니다.</span>
      </label>
      <label className="field">
        <span>요약</span>
        <input value={summary} onChange={(event) => setSummary(event.target.value)} />
      </label>
      <label className="field">
        <span>상세 내용</span>
        <textarea value={details} onChange={(event) => setDetails(event.target.value)} rows={4} />
      </label>
      <label className="field">
        <span>남은 리스크</span>
        <textarea value={remainingRisk} onChange={(event) => setRemainingRisk(event.target.value)} rows={3} />
      </label>

      <button className="primary-button" type="button" onClick={submit}>선택한 세부 이슈에 이력 추가</button>
    </aside>
  );
}
```

- [x] **Step 2: Convert app from seed-only to editable state**

In `src/App.tsx`, replace direct `seedData` usage with:

```tsx
const [data, setData] = useState(seedData);
const [isAdding, setIsAdding] = useState(false);
```

Update all selector calls from `seedData` to `data`.

Add handler:

```tsx
function handleAddEntry(issueGroup: IssueGroup, detailIssue: DetailIssue, entry: HistoryEntry) {
  setData((current) => ({
    ...current,
    detailIssues: current.detailIssues.map((item) =>
      item.id === detailIssue.id
        ? {
            ...item,
            status: entry.changesDetailIssueStatus ? entry.status : item.status,
            latestUpdatedAt: entry.date,
            currentSummary: entry.summary,
            completedAt: entry.status === 'resolved' ? entry.date : item.completedAt,
          }
        : item,
    ),
    issueGroups: current.issueGroups.map((item) =>
      item.id === issueGroup.id
        ? {
            ...item,
            latestUpdatedAt: entry.date,
            currentSummary: entry.summary,
            statusSource: 'auto',
          }
        : item,
    ),
    historyEntries: [...current.historyEntries, entry],
  }));
  setSelectedEntryId(entry.id);
  setIsAdding(false);
}
```

Add imports:

```tsx
import { AddHistoryPanel } from './components/AddHistoryPanel';
import type { DetailIssue, HistoryEntry, IssueGroup } from './domain/types';
```

Open button:

```tsx
<button className="primary-button" type="button" onClick={() => setIsAdding(true)}>이력 추가</button>
```

Render drawer:

```tsx
{isAdding && (
  <AddHistoryPanel
    data={data}
    categoryId={selectedRow?.issue.categoryId ?? 'grade-product'}
    subtopicId={selectedSubtopicId}
    onAddEntry={handleAddEntry}
    onClose={() => setIsAdding(false)}
  />
)}
```

- [x] **Step 3: Add drawer CSS**

Append to `src/styles.css`:

```css
.drawer {
  position: fixed;
  top: 0;
  right: 0;
  z-index: 10;
  width: min(440px, calc(100vw - 24px));
  height: 100vh;
  overflow: auto;
  border-left: 1px solid var(--line);
  background: var(--surface);
  box-shadow: -20px 0 40px rgba(23, 32, 51, 0.16);
  padding: 18px;
}

.drawer__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.drawer__header h2 {
  margin: 0;
}

.field {
  display: grid;
  gap: 6px;
  margin-bottom: 12px;
}

.field span {
  color: var(--muted);
  font-size: 12px;
  font-weight: 800;
}

.field input,
.field select,
.field textarea {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid var(--line);
  border-radius: 7px;
  padding: 10px;
}

.recommendation-list {
  display: grid;
  gap: 8px;
  margin-bottom: 12px;
}

.recommendation-card {
  border: 1px solid var(--line);
  border-radius: 7px;
  background: var(--surface-muted);
  padding: 10px;
  text-align: left;
  cursor: pointer;
}

.recommendation-card.is-selected {
  border-color: var(--accent);
  background: var(--accent-soft);
}

.recommendation-card span {
  display: block;
  margin-top: 4px;
  color: var(--muted);
  font-size: 12px;
}
```

- [x] **Step 4: Run build**

Run:

```bash
pnpm build
```

Expected: build passes and add-history drawer appears when clicking `이력 추가`.

- [x] **Step 5: Commit add flow**

```bash
git add src/App.tsx src/components/AddHistoryPanel.tsx src/styles.css
git commit -m "feat: add existing-issue history entry flow"
```

---

### Task 10: Local Persistence, Import/Export, And Master Data Panel

**Files:**
- Create: `src/components/AdminDataPanel.tsx`
- Modify: `src/App.tsx`
- Modify: `src/styles.css`

- [x] **Step 1: Create admin data panel**

Create `src/components/AdminDataPanel.tsx`:

```tsx
import { serializeBoardData } from '../domain/persistence';
import type { IssueBoardData } from '../domain/types';

type AdminDataPanelProps = {
  data: IssueBoardData;
  onImportJson: (json: string) => void;
  onReset: () => void;
};

export function AdminDataPanel({ data, onImportJson, onReset }: AdminDataPanelProps) {
  function exportJson() {
    const blob = new Blob([serializeBoardData(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `research-issue-board-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="admin-panel" aria-label="데이터 관리">
      <div>
        <h2>데이터 관리</h2>
        <p>로컬 MVP 데이터는 브라우저에 저장됩니다. 민감 정보 내보내기는 직접 실행할 때만 진행됩니다.</p>
      </div>
      <div className="admin-actions">
        <button type="button" onClick={exportJson}>JSON 내보내기</button>
        <label className="file-button">
          JSON 가져오기
          <input
            type="file"
            accept="application/json"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              onImportJson(await file.text());
            }}
          />
        </label>
        <button type="button" onClick={onReset}>초기 데이터로 되돌리기</button>
      </div>
    </section>
  );
}
```

- [x] **Step 2: Wire persistence into app**

In `src/App.tsx`, import:

```tsx
import { AdminDataPanel } from './components/AdminDataPanel';
import { deserializeBoardData, loadBoardData, resetBoardData, saveBoardData } from './domain/persistence';
```

Update the React import in `src/App.tsx`:

```tsx
import { useEffect, useMemo, useState } from 'react';
```

Replace initial state:

```tsx
const [data, setData] = useState(() => loadBoardData());
```

Add save effect:

```tsx
useEffect(() => {
  saveBoardData(data);
}, [data]);
```

Add import/reset handlers:

```tsx
function handleImportJson(json: string) {
  const imported = deserializeBoardData(json);
  setData(imported);
  const firstSubtopic = imported.subtopics.find((subtopic) => !subtopic.hidden);
  setSelectedSubtopicId(firstSubtopic?.id ?? 'sts');
  setSelectedEntryId(imported.historyEntries[0]?.id);
}

function handleReset() {
  const reset = resetBoardData();
  setData(reset);
  setSelectedSubtopicId('sts');
  setSelectedEntryId('hist-sts-430-resolved');
}
```

Add component near bottom:

```tsx
<AdminDataPanel data={data} onImportJson={handleImportJson} onReset={handleReset} />
```

- [x] **Step 3: Add admin CSS**

Append to `src/styles.css`:

```css
.admin-panel {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-top: 18px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: var(--surface);
  padding: 16px;
}

.admin-panel h2 {
  margin: 0 0 4px;
  font-size: 18px;
}

.admin-panel p {
  margin: 0;
  color: var(--muted);
  font-size: 13px;
}

.admin-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.admin-actions button,
.file-button {
  border: 1px solid var(--line);
  border-radius: 7px;
  background: var(--surface-muted);
  color: var(--text);
  padding: 9px 12px;
  font-weight: 700;
  cursor: pointer;
}

.file-button input {
  display: none;
}

@media (max-width: 760px) {
  .admin-panel {
    align-items: stretch;
    flex-direction: column;
  }
}
```

- [x] **Step 4: Run tests and build**

Run:

```bash
pnpm test
pnpm build
```

Expected: all tests and build pass.

- [x] **Step 5: Commit persistence UI**

```bash
git add src/App.tsx src/components/AdminDataPanel.tsx src/styles.css
git commit -m "feat: add local data import and export"
```

---

### Task 11: Visual Polish And Responsive QA

**Files:**
- Modify: `src/styles.css`
- Modify: component files only if QA finds text overflow or unclear hierarchy.

- [x] **Step 1: Start dev server**

Run:

```bash
pnpm dev --host 127.0.0.1
```

Expected: Vite reports a local URL on the open port it selected, such as `http://127.0.0.1:<port>/`.

- [x] **Step 2: Verify desktop primary flow**

Open the local URL and verify:

```text
Home shows four top-level category cards.
Each category card shows subtopic cards.
Subtopic cards show latest date and unresolved count.
Selecting STS opens the separate subtopic page.
The subtopic page shows a left-side dated history list.
Selecting an issue updates the right-side issue detail.
The right-side issue detail shows metadata, compact dated history, selected dated entry detail, and related issues.
Clicking 이력 추가 opens the drawer.
Typing STS or 430 shows existing issue recommendations.
Adding a history entry appends it to the same issue group.
JSON export downloads a file.
```

- [x] **Step 3: Verify mobile layout**

Use a mobile viewport around 390px wide and verify:

```text
Category cards stack vertically.
Subtopic cards remain readable.
Issue list rows do not overflow horizontally.
The right-side issue detail stacks cleanly under the issue list if needed.
Drawer fits inside viewport width.
Buttons and inputs have readable text.
```

- [x] **Step 4: Fix visual issues with concrete CSS changes**

If issue rows overflow on mobile, add this CSS:

```css
@media (max-width: 520px) {
  .subtopic-grid {
    grid-template-columns: 1fr;
  }

  .app-header {
    align-items: stretch;
    flex-direction: column;
    gap: 12px;
  }

  .primary-button {
    width: 100%;
  }
}
```

- [x] **Step 5: Run final verification**

Run:

```bash
pnpm test
pnpm build
```

Expected: tests and build pass after visual fixes.

- [x] **Step 6: Commit QA polish**

```bash
git add src/styles.css src/App.tsx src/components
git commit -m "style: polish issue board responsive layout"
```

---

## Self-Review

Spec coverage:

- Category/subtopic home screen: Task 6.
- Subtopic cards with latest date and unresolved count: Tasks 3 and 6.
- Date-based history rows as default reading pattern: Tasks 3 and 7.
- Existing issue group selection before adding history: Tasks 4 and 9.
- Issue group plus dated history data model: Task 2.
- Grouped timeline blocks: Tasks 4 and 8.
- Related issues: Tasks 4 and 8.
- Long-running unresolved section: Tasks 3 and 6.
- Simple graph: Task 6 adds a CSS-only mini bar chart for unresolved counts by top-level category.
- Local persistence and import/export: Tasks 5 and 10.
- Sensitive/restricted use: reflected in copy and export behavior; authentication remains out of scope.

Placeholder scan:

- No implementation step contains red-flag placeholders or vague unimplemented behavior.

Type consistency:

- `IssueBoardData`, `IssueGroup`, `HistoryEntry`, `IssueStatus`, `SubtopicSummary`, `HistoryRow`, and `TimelineGroup` are defined before use.
- Selector names used by UI tasks match Task 3 and Task 4 exports.
