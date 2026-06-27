import { FileSpreadsheet, FileText } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  exportReportAsDocx,
  exportReportDataAsXlsx,
  filterReportData,
  getReportRows,
  REPORT_TEMPLATE_LABELS,
  type ReportFilters,
  type ReportTemplate,
} from '../domain/reportExports';
import type { DetailIssue, IssueBoardData, IssueGroup } from '../domain/types';
import { AdminDataPanel } from './AdminDataPanel';

type ReportPageProps = {
  data: IssueBoardData;
  onImportJson: (json: string) => void;
  onImportXlsx: (file: ArrayBuffer) => void;
  onReset: () => void;
  canManageData: boolean;
  filterPreset?: ReportFilterPreset;
};

export type ReportFilterPreset = Partial<ReportFilters> & {
  nonce: number;
};

export function ReportPage({ data, onImportJson, onImportXlsx, onReset, canManageData, filterPreset }: ReportPageProps) {
  const [categoryId, setCategoryId] = useState('');
  const [subtopicId, setSubtopicId] = useState('');
  const [issueGroupId, setIssueGroupId] = useState('');
  const [detailIssueId, setDetailIssueId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [template, setTemplate] = useState<ReportTemplate>('history');

  useEffect(() => {
    if (!filterPreset) return;
    setCategoryId(filterPreset.categoryId ?? '');
    setSubtopicId(filterPreset.subtopicId ?? '');
    setIssueGroupId(filterPreset.issueGroupId ?? '');
    setDetailIssueId(filterPreset.detailIssueId ?? '');
    setDateFrom(filterPreset.dateFrom ?? '');
    setDateTo(filterPreset.dateTo ?? '');
    setTemplate(filterPreset.template ?? 'history');
  }, [filterPreset]);

  const categories = useMemo(() => data.categories.slice().sort((a, b) => a.order - b.order), [data.categories]);
  const subtopics = useMemo(
    () =>
      data.subtopics
        .filter((subtopic) => !categoryId || subtopic.categoryId === categoryId)
        .filter((subtopic) => !subtopic.hidden)
        .sort((a, b) => a.order - b.order),
    [categoryId, data.subtopics],
  );
  const issueGroups = useMemo(
    () =>
      data.issueGroups
        .filter((issue) => !issue.archived)
        .filter((issue) => !categoryId || issue.categoryId === categoryId)
        .filter((issue) => !subtopicId || issue.subtopicId === subtopicId)
        .sort((a, b) => b.latestUpdatedAt.localeCompare(a.latestUpdatedAt)),
    [categoryId, data.issueGroups, subtopicId],
  );
  const detailIssues = useMemo(() => getDetailOptions(data.detailIssues, issueGroups, issueGroupId), [
    data.detailIssues,
    issueGroups,
    issueGroupId,
  ]);
  const filters = useMemo<ReportFilters>(
    () => ({
      categoryId: categoryId || undefined,
      subtopicId: subtopicId || undefined,
      issueGroupId: issueGroupId || undefined,
      detailIssueId: detailIssueId || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      template,
    }),
    [categoryId, dateFrom, dateTo, detailIssueId, issueGroupId, subtopicId, template],
  );
  const reportRows = useMemo(() => getReportRows(filterReportData(data, filters)), [data, filters]);
  const reportTitle = useMemo(() => buildReportTitle(data, filters), [data, filters]);

  function selectCategory(nextCategoryId: string) {
    setCategoryId(nextCategoryId);
    setSubtopicId('');
    setIssueGroupId('');
    setDetailIssueId('');
  }

  function selectSubtopic(nextSubtopicId: string) {
    setSubtopicId(nextSubtopicId);
    setIssueGroupId('');
    setDetailIssueId('');
  }

  function selectIssue(nextIssueGroupId: string) {
    setIssueGroupId(nextIssueGroupId);
    setDetailIssueId('');
  }

  function downloadXlsx() {
    const bytes = exportReportDataAsXlsx(data, filters);
    downloadBytes(bytes, `${fileSafeName(reportTitle)}-${today()}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  }

  function downloadDocx() {
    const bytes = exportReportAsDocx(data, { ...filters, title: reportTitle });
    downloadBytes(bytes, `${fileSafeName(reportTitle)}-${today()}.docx`, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  }

  return (
    <section className="report-page" aria-label="보고서">
      <div className="report-page__heading">
        <div>
          <p className="breadcrumb">보고서</p>
          <h2>이력 보고서 만들기</h2>
        </div>
        <div className="report-page__actions">
          <button className="text-button" type="button" onClick={downloadXlsx}>
            <FileSpreadsheet size={16} />
            Excel 다운로드
          </button>
          <button className="primary-button" type="button" onClick={downloadDocx}>
            <FileText size={16} />
            Word 보고서
          </button>
        </div>
      </div>

      <div className="report-layout">
        <details className="report-panel report-panel--filters" aria-label="보고서 조건" open>
          <summary className="report-panel__header">
            <h3>선택 조건</h3>
            <span>{reportRows.length}건</span>
          </summary>
          <div className="report-filter-grid">
            <label className="field report-template-field">
              <span>보고서 양식</span>
              <select value={template} onChange={(event) => setTemplate(event.target.value as ReportTemplate)}>
                {REPORT_TEMPLATE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {REPORT_TEMPLATE_LABELS[option]}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>대분류</span>
              <select value={categoryId} onChange={(event) => selectCategory(event.target.value)}>
                <option value="">전체</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>하위 주제</span>
              <select value={subtopicId} onChange={(event) => selectSubtopic(event.target.value)}>
                <option value="">전체</option>
                {subtopics.map((subtopic) => (
                  <option key={subtopic.id} value={subtopic.id}>
                    {subtopic.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>이슈</span>
              <select value={issueGroupId} onChange={(event) => selectIssue(event.target.value)}>
                <option value="">전체</option>
                {issueGroups.map((issue) => (
                  <option key={issue.id} value={issue.id}>
                    {issue.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>세부 항목</span>
              <select value={detailIssueId} onChange={(event) => setDetailIssueId(event.target.value)}>
                <option value="">전체</option>
                {detailIssues.map((detail) => (
                  <option key={detail.id} value={detail.id}>
                    {detail.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>시작일</span>
              <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
            </label>
            <label className="field">
              <span>종료일</span>
              <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
            </label>
          </div>
        </details>

      </div>

      {canManageData && (
        <div className="report-data-panel">
          <AdminDataPanel data={data} onImportJson={onImportJson} onImportXlsx={onImportXlsx} onReset={onReset} />
        </div>
      )}
    </section>
  );
}

function getDetailOptions(details: DetailIssue[], issues: IssueGroup[], selectedIssueGroupId: string): DetailIssue[] {
  const issueIds = new Set(issues.map((issue) => issue.id));
  return details
    .filter((detail) => !detail.archived)
    .filter((detail) => (selectedIssueGroupId ? detail.issueGroupId === selectedIssueGroupId : issueIds.has(detail.issueGroupId)))
    .sort((a, b) => b.latestUpdatedAt.localeCompare(a.latestUpdatedAt));
}

const REPORT_TEMPLATE_OPTIONS: ReportTemplate[] = ['history', 'weekly', 'issue_summary', 'delayed'];

function buildReportTitle(data: IssueBoardData, filters: ReportFilters): string {
  const issue = data.issueGroups.find((item) => item.id === filters.issueGroupId);
  const detail = data.detailIssues.find((item) => item.id === filters.detailIssueId);
  const subtopic = data.subtopics.find((item) => item.id === filters.subtopicId);
  const category = data.categories.find((item) => item.id === filters.categoryId);
  const scope = detail?.title ?? issue?.title ?? subtopic?.label ?? category?.label ?? '전체';
  if (filters.template === 'weekly') return `${scope} 주간 보고`;
  if (filters.template === 'issue_summary') return `${scope} 이슈 요약 보고서`;
  if (filters.template === 'delayed') return `${scope} 처리 지연 이슈 보고서`;
  return `${scope} 이력 보고서`;
}

function downloadBytes(bytes: Uint8Array, filename: string, type: string) {
  const fileBody = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const blob = new Blob([fileBody], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function fileSafeName(value: string): string {
  return value.replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, '_');
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}
