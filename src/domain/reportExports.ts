import {
  PHASE_LABELS,
  type HistoryEntry,
  type IssueBoardData,
  type IssueGroup,
} from './types';
import { LONG_RUNNING_DELAY_DAYS } from './selectors';
import { getRecordTypeLabels, getStatusLabels, getStatusPhase } from './options';
import { exportBoardDataAsXlsx } from './xlsxExchange';

export type ReportTemplate = 'history' | 'weekly' | 'issue_summary' | 'delayed';

export const REPORT_TEMPLATE_LABELS: Record<ReportTemplate, string> = {
  history: '이력 보고서',
  weekly: '주간 보고',
  issue_summary: '이슈 요약',
  delayed: '처리 지연 이슈',
};

export type ReportFilters = {
  categoryId?: string;
  subtopicId?: string;
  issueGroupId?: string;
  detailIssueId?: string;
  dateFrom?: string;
  dateTo?: string;
  template?: ReportTemplate;
};

export type ReportExportOptions = ReportFilters & {
  title?: string;
};

export type ReportRow = {
  categoryLabel: string;
  subtopicLabel: string;
  issueTitle: string;
  detailTitle: string;
  ownerLabel: string;
  entry: HistoryEntry;
  issue: IssueGroup;
};

const encoder = new TextEncoder();

export function filterReportData(data: IssueBoardData, filters: ReportFilters): IssueBoardData {
  const issueById = new Map(data.issueGroups.map((issue) => [issue.id, issue]));
  const detailById = new Map(data.detailIssues.map((detail) => [detail.id, detail]));

  const historyEntries = data.historyEntries.filter((entry) => {
    const issue = issueById.get(entry.issueGroupId);
    const detail = detailById.get(entry.detailIssueId);
    if (!issue || !detail || issue.archived || detail.archived) return false;
    if (filters.categoryId && issue.categoryId !== filters.categoryId) return false;
    if (filters.subtopicId && issue.subtopicId !== filters.subtopicId) return false;
    if (filters.issueGroupId && issue.id !== filters.issueGroupId) return false;
    if (filters.detailIssueId && detail.id !== filters.detailIssueId) return false;
    if (filters.dateFrom && entry.date < filters.dateFrom) return false;
    if (filters.dateTo && entry.date > filters.dateTo) return false;
    if (filters.template === 'delayed' && !isLongRunningIssue(data, issue)) return false;
    return true;
  });

  const issueIds = new Set(historyEntries.map((entry) => entry.issueGroupId));
  const detailIds = new Set(historyEntries.map((entry) => entry.detailIssueId));
  const issueGroups = data.issueGroups.filter((issue) => issueIds.has(issue.id));
  const categoryIds = new Set(issueGroups.map((issue) => issue.categoryId));
  const subtopicIds = new Set(issueGroups.map((issue) => issue.subtopicId));

  return {
    settings: data.settings,
    categories: data.categories.filter((category) => categoryIds.has(category.id)),
    subtopics: data.subtopics.filter((subtopic) => subtopicIds.has(subtopic.id)),
    issueGroups,
    detailIssues: data.detailIssues.filter((detail) => detailIds.has(detail.id)),
    historyEntries,
  };
}

export function getReportRows(data: IssueBoardData): ReportRow[] {
  const issueById = new Map(data.issueGroups.map((issue) => [issue.id, issue]));
  const detailById = new Map(data.detailIssues.map((detail) => [detail.id, detail]));
  const categoryById = new Map(data.categories.map((category) => [category.id, category]));
  const subtopicById = new Map(data.subtopics.map((subtopic) => [subtopic.id, subtopic]));

  return data.historyEntries
    .map((entry) => {
      const issue = issueById.get(entry.issueGroupId);
      const detail = detailById.get(entry.detailIssueId);
      if (!issue || !detail) return undefined;

      return {
        categoryLabel: categoryById.get(issue.categoryId)?.label ?? '',
        subtopicLabel: subtopicById.get(issue.subtopicId)?.label ?? '',
        issueTitle: issue.title,
        detailTitle: detail.title,
        ownerLabel: detail.ownerName ?? issue.ownerName ?? entry.authorName ?? '',
        entry,
        issue,
      };
    })
    .filter((row): row is ReportRow => Boolean(row))
    .sort((a, b) => b.entry.date.localeCompare(a.entry.date));
}

export function exportReportDataAsXlsx(data: IssueBoardData, filters: ReportFilters): Uint8Array {
  return exportBoardDataAsXlsx(filterReportData(data, filters));
}

export function exportReportAsHtml(data: IssueBoardData, options: ReportExportOptions = {}): Uint8Array {
  const filtered = filterReportData(data, options);
  const rows = getReportRows(filtered);
  const title = options.title?.trim() || '이슈 이력 보고서';
  const generatedAt = new Date().toISOString().slice(0, 10);
  const statusLabels = getStatusLabels(filtered);
  const recordTypeLabels = getRecordTypeLabels(filtered);
  const issueCount = new Set(rows.map((row) => row.issue.id)).size;
  const detailCount = new Set(rows.map((row) => row.entry.detailIssueId)).size;
  const issueBlocks = groupRowsByIssue(rows)
    .map(([issue, issueRows]) => {
      const phase = getStatusPhase(filtered, issue.status);
      return `<section class="issue-card">
        <div class="issue-card__head">
          <div>
            <p>${escapeHtml(getScopeLabel(issueRows[0]))}</p>
            <h2>${escapeHtml(issue.title)}</h2>
          </div>
          <span class="status-pill status-pill--${phase}">${escapeHtml(statusLabels[issue.status])}</span>
        </div>
        <div class="issue-card__summary">
          <span>최근 갱신 <strong>${escapeHtml(issue.latestUpdatedAt)}</strong></span>
          <span>담당 <strong>${escapeHtml(issue.ownerName || issueRows[0]?.ownerLabel || '-')}</strong></span>
          <span>이력 <strong>${issueRows.length}건</strong></span>
        </div>
        <p class="issue-card__description">${escapeHtml(issue.currentSummary)}</p>
        <ol class="timeline">
          ${issueRows
            .map((row) => {
              const entryPhase = getStatusPhase(filtered, row.entry.status);
              return `<li>
                <div class="timeline__meta">
                  <time>${escapeHtml(row.entry.date)}</time>
                  <span>${escapeHtml(row.detailTitle)}</span>
                  <small>${escapeHtml(recordTypeLabels[row.entry.recordType ?? 'other'])}</small>
                </div>
                <div class="timeline__body">
                  <div>
                    <strong>${escapeHtml(row.entry.summary)}</strong>
                    <p>${escapeHtml(row.entry.details)}</p>
                    ${
                      row.entry.remainingRisk
                        ? `<p class="timeline__risk">향후 계획: ${escapeHtml(row.entry.remainingRisk)}</p>`
                        : ''
                    }
                  </div>
                  <span class="status-pill status-pill--${entryPhase}">${escapeHtml(statusLabels[row.entry.status])}</span>
                </div>
              </li>`;
            })
            .join('')}
        </ol>
      </section>`;
    })
    .join('');
  const emptyBlock = '<div class="empty">선택한 조건에 해당하는 이력이 없습니다.</div>';
  const issueContent = rows.length > 0 ? issueBlocks : emptyBlock;
  const summaryCards = [
    ['이력', rows.length],
    ['이슈', issueCount],
    ['세부 항목', detailCount],
  ]
    .map(([label, value]) => `<div class="stat"><span>${escapeHtml(String(label))}</span><strong>${value}</strong></div>`)
    .join('');
  const historyRows = rows
    .map(
      (row) => `<tr>
        <td>${escapeHtml(row.entry.date)}</td>
        <td>${escapeHtml(row.categoryLabel)} / ${escapeHtml(row.subtopicLabel)}</td>
        <td>${escapeHtml(row.issueTitle)}</td>
        <td>${escapeHtml(row.detailTitle)}</td>
        <td>${escapeHtml(statusLabels[row.entry.status])}</td>
        <td>${escapeHtml(row.entry.summary)}</td>
      </tr>`,
    )
    .join('');
  const templateSource = filtered.settings?.reportHtmlTemplate?.trim();
  if (templateSource) {
    return encoder.encode(
      renderUploadedHtmlTemplate(templateSource, {
        detailCount,
        filterText: getFilterText(options),
        generatedAt,
        historyCount: rows.length,
        historyRows,
        issueCards: issueContent,
        issueCount,
        reportTitle: title,
        summaryCards,
        templateLabel: REPORT_TEMPLATE_LABELS[options.template ?? 'history'],
      }),
    );
  }

  const html = `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    :root {
      color-scheme: light;
      --ink: #172033;
      --muted: #65758a;
      --line: #dce5f1;
      --paper: #ffffff;
      --wash: #f4f7fb;
      --blue: #2f67d8;
      --blue-soft: #edf4ff;
      --green: #257451;
      --orange: #9a4f17;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: linear-gradient(180deg, #f8fbff 0%, #eef5fb 100%);
      color: var(--ink);
      font-family: "Pretendard", "Apple SD Gothic Neo", "Malgun Gothic", system-ui, sans-serif;
      line-height: 1.58;
    }
    .report {
      width: min(1080px, calc(100% - 40px));
      margin: 0 auto;
      padding: 42px 0 56px;
    }
    .hero {
      display: grid;
      gap: 22px;
      border: 1px solid var(--line);
      border-radius: 14px;
      background: var(--paper);
      padding: 30px;
      box-shadow: 0 18px 46px rgba(38, 55, 79, 0.08);
    }
    .hero__eyebrow {
      margin: 0 0 8px;
      color: var(--blue);
      font-size: 13px;
      font-weight: 900;
    }
    h1 {
      margin: 0;
      font-size: clamp(30px, 5vw, 54px);
      letter-spacing: 0;
      line-height: 1.05;
    }
    .hero__meta {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .hero__meta li,
    .stat {
      border: 1px solid var(--line);
      border-radius: 999px;
      background: var(--wash);
      color: var(--muted);
      font-size: 13px;
      font-weight: 800;
      padding: 7px 11px;
    }
    .stats {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 10px;
    }
    .stat {
      display: grid;
      gap: 4px;
      border-radius: 10px;
      padding: 14px;
    }
    .stat strong {
      color: var(--ink);
      font-size: 24px;
      line-height: 1;
    }
    .issue-list {
      display: grid;
      gap: 16px;
      margin-top: 18px;
    }
    .issue-card {
      border: 1px solid var(--line);
      border-radius: 12px;
      background: var(--paper);
      padding: 22px;
      box-shadow: 0 12px 30px rgba(38, 55, 79, 0.055);
      break-inside: avoid;
    }
    .issue-card__head,
    .timeline__body {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
    }
    .issue-card__head p {
      margin: 0 0 5px;
      color: var(--muted);
      font-size: 12px;
      font-weight: 900;
    }
    .issue-card h2 {
      margin: 0;
      font-size: 22px;
      line-height: 1.25;
    }
    .issue-card__summary {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 14px;
    }
    .issue-card__summary span {
      border-radius: 999px;
      background: var(--wash);
      color: var(--muted);
      font-size: 12px;
      font-weight: 850;
      padding: 6px 10px;
    }
    .issue-card__summary strong { color: var(--ink); }
    .issue-card__description {
      margin: 14px 0 0;
      color: #334258;
      font-weight: 760;
    }
    .status-pill {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 72px;
      border: 1px solid #cfe0ff;
      border-radius: 999px;
      background: var(--blue-soft);
      color: var(--blue);
      font-size: 12px;
      font-weight: 950;
      padding: 6px 10px;
      white-space: nowrap;
    }
    .status-pill--received {
      border-color: #f4d5bf;
      background: #fff7ef;
      color: var(--orange);
    }
    .status-pill--closed {
      border-color: #cde9dc;
      background: #f1fbf6;
      color: var(--green);
    }
    .timeline {
      display: grid;
      gap: 10px;
      margin: 18px 0 0;
      padding: 0;
      list-style: none;
    }
    .timeline li {
      display: grid;
      gap: 8px;
      border-top: 1px solid var(--line);
      padding-top: 12px;
    }
    .timeline__meta {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      color: var(--muted);
      font-size: 12px;
      font-weight: 850;
    }
    .timeline__meta time {
      color: var(--blue);
      font-weight: 950;
    }
    .timeline__body strong {
      display: block;
      margin-bottom: 4px;
      font-size: 15px;
    }
    .timeline__body p {
      margin: 0;
      color: #44546a;
      font-size: 13px;
    }
    .timeline__risk {
      margin-top: 6px !important;
      color: #7b4d19 !important;
      font-weight: 850;
    }
    .empty {
      margin-top: 18px;
      border: 1px dashed var(--line);
      border-radius: 12px;
      background: var(--paper);
      color: var(--muted);
      padding: 28px;
      text-align: center;
      font-weight: 850;
    }
    @media print {
      body { background: #fff; }
      .report { width: 100%; padding: 0; }
      .hero, .issue-card { box-shadow: none; }
    }
    @media (max-width: 720px) {
      .report { width: min(100% - 24px, 1080px); padding-top: 22px; }
      .hero, .issue-card { padding: 18px; }
      .stats { grid-template-columns: 1fr; }
      .issue-card__head, .timeline__body { display: grid; }
    }
  </style>
</head>
<body>
  <main class="report">
    <section class="hero">
      <div>
        <p class="hero__eyebrow">PosLAB 이력관리 센터</p>
        <h1>${escapeHtml(title)}</h1>
      </div>
      <ul class="hero__meta">
        <li>생성일 ${escapeHtml(generatedAt)}</li>
        <li>${escapeHtml(REPORT_TEMPLATE_LABELS[options.template ?? 'history'])}</li>
        <li>${escapeHtml(getFilterText(options))}</li>
      </ul>
      <div class="stats">
        ${summaryCards}
      </div>
    </section>
    <section class="issue-list">
      ${issueContent}
    </section>
  </main>
</body>
</html>`;

  return encoder.encode(html);
}

export function exportReportAsDocx(data: IssueBoardData, options: ReportExportOptions = {}): Uint8Array {
  const filtered = filterReportData(data, options);
  const rows = getReportRows(filtered);
  const title = options.title?.trim() || '이슈 이력 보고서';
  const generatedAt = new Date().toISOString().slice(0, 10);

  return createZip([
    {
      name: '[Content_Types].xml',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
</Types>`,
    },
    {
      name: '_rels/.rels',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
</Relationships>`,
    },
    {
      name: 'docProps/core.xml',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>${escapeXml(title)}</dc:title>
  <dc:creator>PosLAB 이력관리 센터</dc:creator>
  <dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString()}</dcterms:created>
</cp:coreProperties>`,
    },
    {
      name: 'word/document.xml',
      content: documentXml(title, generatedAt, options, rows, filtered),
    },
  ]);
}

function documentXml(title: string, generatedAt: string, filters: ReportFilters, rows: ReportRow[], data: Pick<IssueBoardData, 'settings'>): string {
  const issueCount = new Set(rows.map((row) => row.issue.id)).size;
  const detailCount = new Set(rows.map((row) => row.entry.detailIssueId)).size;
  const statusLabels = getStatusLabels(data);
  const recordTypeLabels = getRecordTypeLabels(data);
  const summaryLines = [
    `생성일: ${generatedAt}`,
    `보고서 양식: ${REPORT_TEMPLATE_LABELS[filters.template ?? 'history']}`,
    `이력: ${rows.length}건`,
    `이슈: ${issueCount}건`,
    `세부 항목: ${detailCount}건`,
    getFilterText(filters),
  ].filter(Boolean);

  const issueBlocks = groupRowsByIssue(rows)
    .map(([issue, issueRows]) =>
      [
        paragraph(issue.title, 'Heading2'),
        paragraph(`현재 상태: ${statusLabels[issue.status]} / 최근 갱신: ${issue.latestUpdatedAt}`),
        paragraph(`현재 요약: ${issue.currentSummary}`),
        ...issueRows.flatMap((row) => [
          paragraph(
            `${row.entry.date} | ${row.detailTitle} | 담당: ${row.ownerLabel || '-'} | ${statusLabels[row.entry.status]} | ${
              recordTypeLabels[row.entry.recordType ?? 'other']
            }`,
          ),
          paragraph(row.entry.summary),
          paragraph(row.entry.details),
          row.entry.remainingRisk ? paragraph(`향후 계획: ${row.entry.remainingRisk}`) : '',
        ]),
      ].join(''),
    )
    .join('');

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${paragraph(title, 'Title')}
    ${summaryLines.map((line) => paragraph(line)).join('')}
    ${rows.length > 0 ? issueBlocks : paragraph('선택한 조건에 해당하는 이력이 없습니다.')}
    <w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1080" w:bottom="1440" w:left="1080"/></w:sectPr>
  </w:body>
</w:document>`;
}

function getFilterText(filters: ReportFilters): string {
  const parts = [
    filters.template ? `양식 ${REPORT_TEMPLATE_LABELS[filters.template]}` : '',
    filters.categoryId ? `대분류 ${filters.categoryId}` : '',
    filters.subtopicId ? `하위 주제 ${filters.subtopicId}` : '',
    filters.issueGroupId ? `이슈 ${filters.issueGroupId}` : '',
    filters.detailIssueId ? `세부 항목 ${filters.detailIssueId}` : '',
    filters.dateFrom || filters.dateTo ? `기간 ${filters.dateFrom || '처음'} ~ ${filters.dateTo || '현재'}` : '',
  ].filter(Boolean);

  return parts.length > 0 ? `선택 조건: ${parts.join(', ')}` : '선택 조건: 전체';
}

function isLongRunningIssue(data: Pick<IssueBoardData, 'settings'>, issue: IssueGroup): boolean {
  if (getStatusPhase(data, issue.status) === 'closed') return false;
  const startedAt = new Date(`${issue.firstOccurredAt}T00:00:00+09:00`).getTime();
  const elapsedDays = Math.max(1, Math.ceil((Date.now() - startedAt) / 86_400_000));
  return elapsedDays >= LONG_RUNNING_DELAY_DAYS;
}

function groupRowsByIssue(rows: ReportRow[]): [IssueGroup, ReportRow[]][] {
  const groups = new Map<string, [IssueGroup, ReportRow[]]>();
  for (const row of rows) {
    const group = groups.get(row.issue.id);
    if (group) {
      group[1].push(row);
    } else {
      groups.set(row.issue.id, [row.issue, [row]]);
    }
  }
  return [...groups.values()];
}

function getScopeLabel(row: ReportRow | undefined): string {
  if (!row) return '전체';
  return [row.categoryLabel, row.subtopicLabel, row.detailTitle].filter(Boolean).join(' / ');
}

type HtmlTemplateTokens = {
  reportTitle: string;
  generatedAt: string;
  templateLabel: string;
  filterText: string;
  historyCount: number;
  issueCount: number;
  detailCount: number;
  summaryCards: string;
  issueCards: string;
  historyRows: string;
};

function renderUploadedHtmlTemplate(template: string, tokens: HtmlTemplateTokens): string {
  const safeTemplate = sanitizeUploadedTemplate(template);
  const replacements: Record<string, string> = {
    detailCount: String(tokens.detailCount),
    filterText: escapeHtml(tokens.filterText),
    generatedAt: escapeHtml(tokens.generatedAt),
    historyCount: String(tokens.historyCount),
    historyRows: tokens.historyRows,
    issueCards: tokens.issueCards,
    issueCount: String(tokens.issueCount),
    reportTitle: escapeHtml(tokens.reportTitle),
    summaryCards: tokens.summaryCards,
    templateLabel: escapeHtml(tokens.templateLabel),
  };
  const rendered = safeTemplate.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key: string) => replacements[key] ?? match);
  const hasContentToken = /\{\{\s*(issueCards|historyRows)\s*\}\}/.test(safeTemplate);
  return hasContentToken ? rendered : `${rendered}\n${tokens.issueCards}`;
}

function sanitizeUploadedTemplate(template: string): string {
  return template
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/\son\w+\s*=\s*'[^']*'/gi, '')
    .replace(/\son\w+\s*=\s*[^\s>]+/gi, '')
    .replace(/javascript:/gi, '');
}

function paragraph(value: string, style?: 'Title' | 'Heading2'): string {
  const styleXml = style ? `<w:pPr><w:pStyle w:val="${style}"/></w:pPr>` : '';
  const text = escapeXml(value);
  return `<w:p>${styleXml}<w:r><w:t xml:space="preserve">${text}</w:t></w:r></w:p>`;
}

function createZip(files: { name: string; content: string }[]): Uint8Array {
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  for (const file of files) {
    const nameBytes = encoder.encode(file.name);
    const contentBytes = encoder.encode(file.content);
    const crc = crc32(contentBytes);
    const localHeader = new Uint8Array(30 + nameBytes.length);
    const localView = new DataView(localHeader.buffer);
    writeLocalHeader(localView, crc, contentBytes.length, nameBytes.length);
    localHeader.set(nameBytes, 30);
    localParts.push(localHeader, contentBytes);

    const centralHeader = new Uint8Array(46 + nameBytes.length);
    const centralView = new DataView(centralHeader.buffer);
    writeCentralHeader(centralView, crc, contentBytes.length, nameBytes.length, offset);
    centralHeader.set(nameBytes, 46);
    centralParts.push(centralHeader);

    offset += localHeader.length + contentBytes.length;
  }

  const centralOffset = offset;
  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(8, files.length, true);
  endView.setUint16(10, files.length, true);
  endView.setUint32(12, centralSize, true);
  endView.setUint32(16, centralOffset, true);

  return concatBytes([...localParts, ...centralParts, end]);
}

function writeLocalHeader(view: DataView, crc: number, size: number, nameLength: number) {
  view.setUint32(0, 0x04034b50, true);
  view.setUint16(4, 20, true);
  view.setUint16(6, 0, true);
  view.setUint16(8, 0, true);
  view.setUint16(10, 0, true);
  view.setUint16(12, 0, true);
  view.setUint32(14, crc, true);
  view.setUint32(18, size, true);
  view.setUint32(22, size, true);
  view.setUint16(26, nameLength, true);
}

function writeCentralHeader(view: DataView, crc: number, size: number, nameLength: number, offset: number) {
  view.setUint32(0, 0x02014b50, true);
  view.setUint16(4, 20, true);
  view.setUint16(6, 20, true);
  view.setUint16(8, 0, true);
  view.setUint16(10, 0, true);
  view.setUint16(12, 0, true);
  view.setUint16(14, 0, true);
  view.setUint32(16, crc, true);
  view.setUint32(20, size, true);
  view.setUint32(24, size, true);
  view.setUint16(28, nameLength, true);
  view.setUint32(42, offset, true);
}

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

const CRC_TABLE = Array.from({ length: 256 }, (_, index) => {
  let crc = index;
  for (let bit = 0; bit < 8; bit += 1) {
    crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  }
  return crc >>> 0;
});

function concatBytes(parts: Uint8Array[]): Uint8Array {
  const output = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function escapeHtml(value: string): string {
  return escapeXml(value);
}
