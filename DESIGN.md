# PosLAB Design System

This document is the canonical design guardrail for PosLAB Issue History Board.
Read this before changing UI, layout, copy, colors, density, or responsive behavior.

The product is an internal research-history tool. It should feel calm, readable, operational, and trustworthy. It should not feel like a marketing landing page, a generic AI dashboard, or a heavy approval system.

## Design North Star

PosLAB is for researchers and admins who need to record, find, and review issue history quickly.

Every screen should answer one of these jobs:

- Where should I go next?
- What issue is open, delayed, or recently updated?
- What happened on this date?
- What should I record or change?
- What operational setting am I managing?

If a visual element does not help one of those jobs, remove it or make it quieter.

## Information Architecture

Keep this hierarchy stable:

```text
Category
  Subtopic
    Issue group
      Detail issue
        Dated history entry
```

Korean screen language:

```text
대분류
하위 주제
이슈
세부 항목
날짜별 이력
```

The visible stage language is always:

```text
접수 / 진행 / 종료
```

Detailed internal statuses may exist, but do not show duplicate status pairs such as `진행 / 조치중` in compact lists unless the view is explicitly about detailed configuration.

## Visual Tone

Use:

- Light surfaces, subtle blue-gray borders, and soft shadows.
- A restrained blue and mint atmosphere.
- Clear orange, blue, and green status colors.
- Dense but breathable rows and panels.
- Real controls: tabs, segmented controls, toggles, inputs, buttons, tables, and compact lists.

Avoid:

- Large empty metric cards.
- Thick blue outlines or hard filled selection states.
- Decorative blobs, orbs, generic gradients, and hero-style marketing layouts.
- Emoji-like floating icons when a precise line icon works.
- One-note dark navy, purple, beige, or brown palettes.
- Explanatory in-app text that describes how the UI works instead of making it obvious.

## Color Tokens

The source of truth is `src/styles.css`. Keep new colors close to the existing tokens:

```css
--bg: #f7f9fc;
--surface: #ffffff;
--surface-soft: #f9fbfe;
--selected: #f8fbff;
--selected-strong: #eef4ff;
--selected-border: #cfdcf2;
--text: #172033;
--muted: #6b7789;
--line: #d9e2ef;
--blue: #2d65d8;
--orange: #f28a32;
--green: #26a878;
```

Status mapping:

```text
접수: orange
진행: blue
종료: green
```

Rules:

- Status color carries meaning. Do not recolor every selected item blue.
- Use pale backgrounds and stronger text/dot colors.
- Borders should be visible but quiet.
- Shadows should separate surfaces, not decorate them.

## Layout Rules

Use compact operational layouts:

- Cards are for repeated items, framed tools, and panels.
- Do not nest cards inside cards.
- Page sections should feel like full-width working areas, not floating marketing blocks.
- Keep headings proportionate to their container.
- Keep fixed-format controls stable with predictable dimensions.
- Text must not overflow or overlap at mobile or desktop widths.

Recommended radii:

```text
Cards and panels: 8px or less unless an existing component uses a larger soft shell.
Inputs and compact controls: 7px to 8px.
Pill status chips: full radius is allowed.
```

## Navigation

### Sidebar

Desktop sidebar:

- Light blue/mint tone is preferred for the current product direction.
- Active state uses soft surface, subtle border, and shadow.
- Do not use a thick left rail as the primary active indicator.
- Use line icons with text.

Mobile sidebar:

- Navigation becomes a compact top area.
- Admin and logout positions must remain predictable.
- Do not leave large unused blank space below the nav rows.

## Home

Home is an entry screen, not a KPI wall.

Keep:

- Category and subtopic selection as the main task.
- Recent date and unresolved count on subtopic buttons.
- Delayed issue summary as a supporting panel.
- Clear navigation to `이력 추가`.

Avoid:

- Oversized summary cards.
- Hero sections.
- Decorative graphics that do not show real product state.

## Subtopic Detail

Example: `강종/제품 > STS`.

Primary structure:

```text
Header: breadcrumb, title, main actions
Summary: compact operational status cards
Main: history list and selected detail
```

The summary cards should be useful filters, not passive decoration:

```text
이슈 현황
처리 지연 이슈
최근 7일 갱신
```

Mobile:

- Summary cards must wrap instead of requiring horizontal scroll.
- Two metric cards may move to a second row.
- Card height should be compressed on narrow screens.
- Detail content must get full width when reading is the main task.

## History List

There are two primary tabs:

```text
날짜별 이력
이슈별 모음
```

Date rows show:

- Date
- Work label
- Stage dot and label
- Entry summary

Issue rows show:

- Work label
- Stage dot and label
- Entry count
- Issue title
- Current summary
- Recent date
- Responsible person and department

Responsible person/department should follow the same fallback logic as detail:

```text
detail issue -> issue group -> latest entry author -> category fallback
```

Do not show `담당자 미정` or `담당부서 미정` when detail-level or fallback information exists.

## History Detail

Detail should read like a clean report page inside the app.

Top order:

```text
Issue title
Stage track
Action buttons
Meta strip
Timeline list
Selected entry content
```

Selected entry content order:

```text
상세 내용
향후 계획
첨부 URL
```

Rules:

- Section titles such as `향후 계획` must sit outside the content box.
- The selected entry card should become full-width at the lower part of the mobile detail flow.
- The timeline list should sit beside the meta strip on narrow layouts when that improves scanning.
- Do not repeat author and timestamp if they already appear in metadata.
- Do not reintroduce `다음 확인일` as a standalone block without a new UX decision.

## Admin

Admin is an operations console. It must be compact and task-led.

Top-level admin modules should be tabs or a tab-like bar near the top:

```text
분류 관리
옵션 관리
권한 관리
보고서 양식
```

Current exclusions:

- `담당 정보 관리` is not needed as a separate module.
- `데이터 관리` belongs with report/data operations and should not duplicate the main admin flow unless there is a clear operational reason.

Admin summary cards:

- Keep only necessary operational cues.
- Avoid large stat cards that push the real controls downward.
- Prefer compact counts, badges, and inline descriptions.

Classification management:

- Must support adding and editing categories/subtopics.
- Should show the hierarchy in the order users think: category -> subtopic -> issue/detail relation.

Option management:

- Should be organized into clear columns or grouped panels:

```text
세부단계 표시명
유형 표시명
업무 라벨
```

- Existing detail-stage labels must show their representative stage.
- Options need add, hide/show, and ordering controls.
- Hide/show should use a toggle pattern, not awkward table-only controls.

## Reports

Prefer modern HTML reports over Word-style report output for product experience.

HTML reports should be:

- Clean, printable, and readable in a browser.
- Sectioned like a short executive or technical issue report.
- Driven by real issue/history data.
- Exportable or shareable later without changing the core report model.

Future template upload should support HTML templates as controlled assets, with placeholders validated before use. Uploaded templates must not execute arbitrary scripts in normal report rendering.

## Data Modes

The app currently supports demo/local use and company/server use.

Design implication:

- Demo data may exist for introduction.
- Production start must allow an empty board state.
- Empty states should look intentional, not broken.
- Empty state copy should be short and operational.

Do not design screens that depend on fake data to look balanced.

## Responsive QA

Check these widths whenever layout changes:

```text
393px mobile
430px mobile
768px tablet
1024px compact desktop/tablet landscape
1170px desktop
1440px desktop
```

Required mobile checks:

- Sidebar/top nav has no large accidental blank area.
- Summary cards do not require horizontal scroll.
- History list remains readable.
- Detail content uses full width where reading matters.
- Buttons do not wrap awkwardly.
- Text does not overlap markers, chips, or neighboring sections.

## Implementation Rules

Before changing UI:

1. Read this file.
2. Check `docs/current-ui-decisions.md` for product and UX decisions.
3. Check the relevant component and existing CSS before inventing a new pattern.

When changing UI:

- Reuse existing CSS variables and component patterns.
- Add a new pattern only when it solves repeated complexity.
- Keep copy short and task-oriented.
- Preserve Korean labels already settled in this document.
- Verify in browser for visual changes, especially mobile.

Minimum checks before commit:

```bash
pnpm build
pnpm test
```

For design or responsive changes, also run a browser check on the affected screen.

## Do Not Revert Without Explicit Product Decision

- Light, calm operational tone.
- Compact admin tabs.
- HTML report direction.
- `접수 / 진행 / 종료` as the visible stage language.
- `상세 내용 / 향후 계획 / 첨부 URL` detail order.
- Soft selection surfaces instead of hard blue filled cards.
- Mobile wrapping for summary cards.
- Empty production-ready data state.
- Detail-level responsible person/department fallback in lists.

