import {
  DEFAULT_STATUS_BY_PHASE,
  PHASE_LABELS,
  RECORD_TYPE_LABELS,
  STATUS_LABELS,
  type Category,
  type DetailIssue,
  type HistoryEntry,
  type IssueBoardData,
  type IssueGroup,
  type IssueRecordType,
  type IssueStatus,
  type Subtopic,
} from './types';
import { getRecordTypeLabels, getStatusLabels, getStatusPhase } from './options';

const EXCEL_COLUMNS = [
  '대분류',
  '하위 주제',
  '이슈',
  '세부 항목',
  '업무 라벨',
  '상태',
  '세부 단계',
  '유형',
  '날짜',
  '요약',
  '상세 내용',
  '향후 계획',
  '이슈 상태 반영',
  '담당자',
  '담당부서',
  '유관부서',
  '첨부 URL',
  '이력ID',
] as const;

type ExcelColumn = (typeof EXCEL_COLUMNS)[number];
type SheetRow = Record<ExcelColumn, string>;

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const phaseByLabel = invertRecord(PHASE_LABELS);

export function exportBoardDataAsXlsx(data: IssueBoardData): Uint8Array {
  const rows = boardDataToRows(data);
  return createXlsxPackage(rows);
}

export function importBoardDataFromXlsx(current: IssueBoardData, file: ArrayBuffer): IssueBoardData {
  const sheetXml = readSheetXml(file);
  const rows = parseSheetXml(sheetXml);
  if (rows.length < 2) return current;

  const header = rows[0].map((cell) => cell.trim());
  const dataRows = rows.slice(1).map((cells) => rowFromCells(header, cells)).filter(Boolean) as SheetRow[];
  if (dataRows.length === 0) return current;

  return importRows(current, dataRows);
}

function boardDataToRows(data: IssueBoardData): string[][] {
  const statusLabels = getStatusLabels(data);
  const recordTypeLabels = getRecordTypeLabels(data);
  const rows = data.historyEntries
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((entry) => {
      const issue = data.issueGroups.find((item) => item.id === entry.issueGroupId);
      const detail = data.detailIssues.find((item) => item.id === entry.detailIssueId);
      const category = data.categories.find((item) => item.id === issue?.categoryId);
      const subtopic = data.subtopics.find((item) => item.id === issue?.subtopicId);
      const phase = getStatusPhase(data, entry.status);

      return EXCEL_COLUMNS.map((column) =>
        ({
          대분류: category?.label ?? '',
          '하위 주제': subtopic?.label ?? '',
          이슈: issue?.title ?? '',
          '세부 항목': detail?.title ?? '',
          '업무 라벨': issue?.groupLabel ?? '',
          상태: PHASE_LABELS[phase],
          '세부 단계': statusLabels[entry.status],
          유형: recordTypeLabels[entry.recordType ?? 'other'],
          날짜: entry.date,
          요약: entry.summary,
          '상세 내용': entry.details,
          '향후 계획': entry.remainingRisk,
          '이슈 상태 반영': entry.changesDetailIssueStatus ? '예' : '아니오',
          담당자: detail?.ownerName ?? issue?.ownerName ?? entry.authorName ?? '',
          담당부서: detail?.ownerResearchGroup ?? issue?.ownerResearchGroup ?? '',
          유관부서: detail?.relatedDepartment ?? issue?.relatedDepartment ?? '',
          '첨부 URL': entry.referenceLinks.join('\n'),
          이력ID: entry.id,
        })[column],
      );
    });

  return [[...EXCEL_COLUMNS], ...rows];
}

function importRows(current: IssueBoardData, rows: SheetRow[]): IssueBoardData {
  const next: IssueBoardData = {
    categories: current.categories.map((item) => ({ ...item })),
    subtopics: current.subtopics.map((item) => ({ ...item })),
    issueGroups: current.issueGroups.map((item) => ({ ...item, tags: [...item.tags] })),
    detailIssues: current.detailIssues.map((item) => ({ ...item, tags: [...item.tags] })),
    historyEntries: current.historyEntries.map((item) => ({ ...item, referenceLinks: [...item.referenceLinks] })),
    settings: current.settings
      ? {
          ...current.settings,
          labelOptions: current.settings.labelOptions ? [...current.settings.labelOptions] : undefined,
          statusLabels: current.settings.statusLabels ? { ...current.settings.statusLabels } : undefined,
          statusOrder: current.settings.statusOrder ? [...current.settings.statusOrder] : undefined,
          hiddenStatuses: current.settings.hiddenStatuses ? [...current.settings.hiddenStatuses] : undefined,
          customStatuses: current.settings.customStatuses ? current.settings.customStatuses.map((item) => ({ ...item })) : undefined,
          recordTypeLabels: current.settings.recordTypeLabels ? { ...current.settings.recordTypeLabels } : undefined,
          recordTypeOrder: current.settings.recordTypeOrder ? [...current.settings.recordTypeOrder] : undefined,
          hiddenRecordTypes: current.settings.hiddenRecordTypes ? [...current.settings.hiddenRecordTypes] : undefined,
          customRecordTypes: current.settings.customRecordTypes ? current.settings.customRecordTypes.map((item) => ({ ...item })) : undefined,
        }
      : undefined,
  };
  let sequence = 0;
  const now = new Date().toISOString();
  const statusByLabel = labelMapFromRecords(STATUS_LABELS, getStatusLabels(next));
  const recordTypeByLabel = labelMapFromRecords(RECORD_TYPE_LABELS, getRecordTypeLabels(next));
  const statusLabels = getStatusLabels(next);

  for (const row of rows) {
    const categoryLabel = row.대분류.trim();
    const subtopicLabel = row['하위 주제'].trim();
    const issueTitle = row.이슈.trim();
    const detailTitle = row['세부 항목'].trim();
    const summary = row.요약.trim();

    if (!categoryLabel || !subtopicLabel || !issueTitle || !detailTitle || !summary) continue;

    const status = readStatus(row, statusByLabel);
    const category = findOrCreateCategory(next, categoryLabel, () => nextId('category', sequence++));
    const subtopic = findOrCreateSubtopic(next, category, subtopicLabel, () => nextId('subtopic', sequence++));
    const issue = findOrCreateIssueGroup(next, category, subtopic, row, status, () => nextId('issue', sequence++));
    const detail = findOrCreateDetailIssue(next, issue, row, status, () => nextId('detail', sequence++));
    const importedEntry = buildHistoryEntry(
      row,
      issue,
      detail,
      status,
      now,
      () => nextId('history', sequence++),
      recordTypeByLabel,
      statusLabels,
    );

    const existingIndex = importedEntry.id
      ? next.historyEntries.findIndex((entry) => entry.id === importedEntry.id)
      : -1;

    if (existingIndex >= 0) {
      next.historyEntries[existingIndex] = {
        ...next.historyEntries[existingIndex],
        ...importedEntry,
        createdAt: next.historyEntries[existingIndex].createdAt,
        updatedAt: now,
      };
    } else {
      next.historyEntries.push(importedEntry);
    }

    issue.latestUpdatedAt = maxDate(issue.latestUpdatedAt, importedEntry.date);
    issue.currentSummary = importedEntry.summary;
    if (importedEntry.changesDetailIssueStatus) issue.status = importedEntry.status;
    issue.statusSource = importedEntry.changesDetailIssueStatus ? 'auto' : issue.statusSource;

    detail.latestUpdatedAt = maxDate(detail.latestUpdatedAt, importedEntry.date);
    detail.currentSummary = importedEntry.summary;
    if (importedEntry.changesDetailIssueStatus) detail.status = importedEntry.status;
    if (importedEntry.status === 'resolved') detail.completedAt = importedEntry.date;
  }

  return next;
}

function createXlsxPackage(rows: string[][]): Uint8Array {
  return createZip([
    {
      name: '[Content_Types].xml',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`,
    },
    {
      name: '_rels/.rels',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`,
    },
    {
      name: 'xl/workbook.xml',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="이력 목록" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`,
    },
    {
      name: 'xl/_rels/workbook.xml.rels',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`,
    },
    {
      name: 'xl/styles.xml',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="1"><font><sz val="11"/><name val="Arial"/></font></fonts>
  <fills count="1"><fill><patternFill patternType="none"/></fill></fills>
  <borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs>
</styleSheet>`,
    },
    {
      name: 'xl/worksheets/sheet1.xml',
      content: sheetXml(rows),
    },
  ]);
}

function sheetXml(rows: string[][]): string {
  const rowXml = rows
    .map((row, rowIndex) => {
      const rowNumber = rowIndex + 1;
      const cells = row
        .map((value, columnIndex) => {
          const ref = `${columnName(columnIndex)}${rowNumber}`;
          const space = /^\s|\s$|\n/.test(value) ? ' xml:space="preserve"' : '';
          return `<c r="${ref}" t="inlineStr"><is><t${space}>${escapeXml(value)}</t></is></c>`;
        })
        .join('');
      return `<row r="${rowNumber}">${cells}</row>`;
    })
    .join('');

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetViews><sheetView workbookViewId="0"/></sheetViews>
  <sheetFormatPr defaultRowHeight="18"/>
  <cols>${EXCEL_COLUMNS.map((_, index) => `<col min="${index + 1}" max="${index + 1}" width="18" customWidth="1"/>`).join('')}</cols>
  <sheetData>${rowXml}</sheetData>
</worksheet>`;
}

function readSheetXml(file: ArrayBuffer): string {
  const entries = readZipEntries(new Uint8Array(file));
  const sheet = entries.get('xl/worksheets/sheet1.xml');
  if (!sheet) throw new Error('Invalid xlsx file');
  return decoder.decode(sheet);
}

function parseSheetXml(xml: string): string[][] {
  const rows: string[][] = [];
  const rowMatches = xml.match(/<row\b[\s\S]*?<\/row>/g) ?? [];

  for (const rowXml of rowMatches) {
    const cells: string[] = [];
    const cellMatches = rowXml.match(/<c\b[\s\S]*?<\/c>/g) ?? [];
    for (const cellXml of cellMatches) {
      const ref = /r="([A-Z]+)\d+"/.exec(cellXml)?.[1];
      const columnIndex = ref ? columnIndexFromName(ref) : cells.length;
      const value = /<t\b[^>]*>([\s\S]*?)<\/t>/.exec(cellXml)?.[1] ?? '';
      cells[columnIndex] = unescapeXml(value);
    }
    rows.push(cells.map((cell) => cell ?? ''));
  }

  return rows;
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

function readZipEntries(bytes: Uint8Array): Map<string, Uint8Array> {
  const entries = new Map<string, Uint8Array>();
  let offset = 0;

  while (offset + 30 <= bytes.length) {
    const view = new DataView(bytes.buffer, bytes.byteOffset + offset);
    const signature = view.getUint32(0, true);
    if (signature !== 0x04034b50) break;

    const compression = view.getUint16(8, true);
    const compressedSize = view.getUint32(18, true);
    const fileNameLength = view.getUint16(26, true);
    const extraLength = view.getUint16(28, true);
    const nameStart = offset + 30;
    const dataStart = nameStart + fileNameLength + extraLength;
    const name = decoder.decode(bytes.slice(nameStart, nameStart + fileNameLength));

    if (compression !== 0) throw new Error('Unsupported xlsx compression');
    entries.set(name, bytes.slice(dataStart, dataStart + compressedSize));
    offset = dataStart + compressedSize;
  }

  return entries;
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

function findOrCreateCategory(data: IssueBoardData, label: string, createId: () => string): Category {
  const found = data.categories.find((item) => sameLabel(item.label, label));
  if (found) return found;

  const category: Category = {
    id: createId(),
    label,
    description: `${label} 관련 이슈`,
    order: data.categories.length + 1,
    icon: '📌',
  };
  data.categories.push(category);
  return category;
}

function findOrCreateSubtopic(
  data: IssueBoardData,
  category: Category,
  label: string,
  createId: () => string,
): Subtopic {
  const found = data.subtopics.find((item) => item.categoryId === category.id && sameLabel(item.label, label));
  if (found) return found;

  const subtopic: Subtopic = {
    id: createId(),
    categoryId: category.id,
    label,
    order: data.subtopics.filter((item) => item.categoryId === category.id).length + 1,
  };
  data.subtopics.push(subtopic);
  return subtopic;
}

function findOrCreateIssueGroup(
  data: IssueBoardData,
  category: Category,
  subtopic: Subtopic,
  row: SheetRow,
  status: IssueStatus,
  createId: () => string,
): IssueGroup {
  const found = data.issueGroups.find(
    (item) => item.categoryId === category.id && item.subtopicId === subtopic.id && sameLabel(item.title, row.이슈),
  );
  if (found) {
    found.groupLabel = row['업무 라벨'].trim() || found.groupLabel;
    found.ownerName = row.담당자.trim() || found.ownerName;
    found.ownerResearchGroup = row.담당부서.trim() || found.ownerResearchGroup;
    found.relatedDepartment = row.유관부서.trim() || found.relatedDepartment;
    return found;
  }

  const issue = {
    id: createId(),
    title: row.이슈.trim(),
    categoryId: category.id,
    subtopicId: subtopic.id,
    status,
    statusSource: 'auto' as const,
    firstOccurredAt: row.날짜.trim() || today(),
    latestUpdatedAt: row.날짜.trim() || today(),
    currentSummary: row.요약.trim(),
    tags: [subtopic.label, row['업무 라벨'].trim()].filter(Boolean),
    groupLabel: row['업무 라벨'].trim() || subtopic.label,
    groupColorTone: 'neutral' as const,
    ownerName: row.담당자.trim() || undefined,
    ownerResearchGroup: row.담당부서.trim() || undefined,
    relatedDepartment: row.유관부서.trim() || undefined,
    sensitive: false,
    archived: false,
  };
  data.issueGroups.push(issue);
  return issue;
}

function findOrCreateDetailIssue(
  data: IssueBoardData,
  issue: IssueGroup,
  row: SheetRow,
  status: IssueStatus,
  createId: () => string,
): DetailIssue {
  const found = data.detailIssues.find(
    (item) => item.issueGroupId === issue.id && sameLabel(item.title, row['세부 항목']),
  );
  if (found) {
    found.ownerName = row.담당자.trim() || found.ownerName;
    found.ownerResearchGroup = row.담당부서.trim() || found.ownerResearchGroup;
    found.relatedDepartment = row.유관부서.trim() || found.relatedDepartment;
    return found;
  }

  const detail = {
    id: createId(),
    issueGroupId: issue.id,
    title: row['세부 항목'].trim(),
    status,
    firstOccurredAt: row.날짜.trim() || today(),
    latestUpdatedAt: row.날짜.trim() || today(),
    currentSummary: row.요약.trim(),
    tags: issue.tags.slice(0, 2),
    ownerName: row.담당자.trim() || issue.ownerName,
    ownerResearchGroup: row.담당부서.trim() || issue.ownerResearchGroup,
    relatedDepartment: row.유관부서.trim() || issue.relatedDepartment,
    needsReview: false,
    archived: false,
  };
  data.detailIssues.push(detail);
  return detail;
}

function buildHistoryEntry(
  row: SheetRow,
  issue: IssueGroup,
  detail: DetailIssue,
  status: IssueStatus,
  now: string,
  createId: () => string,
  recordTypeByLabel: Map<string, IssueRecordType>,
  statusLabels: Record<IssueStatus, string>,
): HistoryEntry {
  const id = row.이력ID.trim() || createId();
  const date = row.날짜.trim() || today();

  return {
    id,
    issueGroupId: issue.id,
    detailIssueId: detail.id,
    date,
    status,
    changesDetailIssueStatus: readBoolean(row['이슈 상태 반영']),
    recordType: readRecordType(row.유형, recordTypeByLabel),
    summary: row.요약.trim(),
    details: row['상세 내용'].trim() || row.요약.trim(),
    remainingRisk: row['향후 계획'].trim(),
    blockName: statusLabels[status],
    referenceLinks: splitList(row['첨부 URL']),
    authorName: row.담당자.trim() || undefined,
    createdAt: now,
    updatedAt: now,
  };
}

function readStatus(row: SheetRow, statusByLabel: Map<string, IssueStatus>): IssueStatus {
  const detailStatus = statusByLabel.get(normalize(row['세부 단계']));
  if (detailStatus) return detailStatus;

  const phase = phaseByLabel.get(normalize(row.상태));
  if (phase) return DEFAULT_STATUS_BY_PHASE[phase];

  return 'cause_review';
}

function readRecordType(value: string, recordTypeByLabel: Map<string, IssueRecordType>): IssueRecordType {
  return recordTypeByLabel.get(normalize(value)) ?? 'other';
}

function rowFromCells(header: string[], cells: string[]): SheetRow | undefined {
  const row = Object.fromEntries(EXCEL_COLUMNS.map((column) => [column, ''])) as SheetRow;
  header.forEach((column, index) => {
    const normalizedColumn = column === '담당연구그룹' ? '담당부서' : column;
    if (EXCEL_COLUMNS.includes(normalizedColumn as ExcelColumn)) {
      row[normalizedColumn as ExcelColumn] = cells[index] ?? '';
    }
  });

  return EXCEL_COLUMNS.some((column) => row[column].trim()) ? row : undefined;
}

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

function unescapeXml(value: string): string {
  return value
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&');
}

function invertRecord<T extends string>(record: Record<T, string>) {
  return new Map(Object.entries(record).map(([key, value]) => [normalize(value as string), key as T]));
}

function labelMapFromRecords<T extends string>(...records: Record<T, string>[]): Map<string, T> {
  const labels = new Map<string, T>();
  for (const record of records) {
    for (const [key, value] of Object.entries(record) as [T, string][]) {
      labels.set(normalize(value), key);
    }
  }
  return labels;
}

function normalize(value: string): string {
  return value.trim().replace(/\s+/g, '').toLowerCase();
}

function sameLabel(a: string, b: string): boolean {
  return normalize(a) === normalize(b);
}

function readBoolean(value: string): boolean {
  return ['1', 'true', 'y', 'yes', '예', '반영'].includes(normalize(value));
}

function splitList(value: string): string[] {
  return value
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function maxDate(a: string, b: string): string {
  return a.localeCompare(b) >= 0 ? a : b;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function nextId(prefix: string, sequence: number): string {
  return `${prefix}-${Date.now()}-${sequence}`;
}

function columnName(index: number): string {
  let name = '';
  let cursor = index + 1;
  while (cursor > 0) {
    const remainder = (cursor - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    cursor = Math.floor((cursor - 1) / 26);
  }
  return name;
}

function columnIndexFromName(name: string): number {
  return name.split('').reduce((sum, char) => sum * 26 + char.charCodeAt(0) - 64, 0) - 1;
}
