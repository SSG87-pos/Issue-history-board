import { Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { getRecordTypeLabels, getStatusPhase } from '../domain/options';
import type { DetailIssue, HistoryEntry, IssueBoardData, IssueGroup } from '../domain/types';
import { PHASE_LABELS } from '../domain/types';

const PAGE_SIZE = 10;

type HistoryListProps = {
  activeDashboardFilterLabel?: string;
  data: Pick<IssueBoardData, 'settings'>;
  detailIssues: DetailIssue[];
  entries: HistoryEntry[];
  issues: IssueGroup[];
  selectedEntryId?: string;
  onClearDashboardFilter?: () => void;
  onSelectEntry: (entryId: string) => void;
};

export function HistoryList({
  activeDashboardFilterLabel,
  data,
  detailIssues,
  entries,
  issues,
  selectedEntryId,
  onClearDashboardFilter,
  onSelectEntry,
}: HistoryListProps) {
  const [query, setQuery] = useState('');
  const [openOnly, setOpenOnly] = useState(false);
  const [viewMode, setViewMode] = useState<'date' | 'issue'>('date');
  const [pageIndex, setPageIndex] = useState(0);
  const recordTypeLabels = useMemo(() => getRecordTypeLabels(data), [data]);
  const issueById = useMemo(() => new Map(issues.map((issue) => [issue.id, issue])), [issues]);
  const detailIssueById = useMemo(() => new Map(detailIssues.map((detailIssue) => [detailIssue.id, detailIssue])), [detailIssues]);
  const entriesByIssueId = useMemo(() => {
    const map = new Map<string, HistoryEntry[]>();
    for (const entry of entries) {
      const issueEntries = map.get(entry.issueGroupId) ?? [];
      issueEntries.push(entry);
      map.set(entry.issueGroupId, issueEntries);
    }

    for (const issueEntries of map.values()) {
      issueEntries.sort((a, b) => b.date.localeCompare(a.date));
    }

    return map;
  }, [entries]);
  const filteredEntries = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return entries.filter((entry) => {
      const issue = issueById.get(entry.issueGroupId);
      const detailIssue = detailIssueById.get(entry.detailIssueId);
      if (openOnly && issue?.status === 'resolved') return false;
      if (!normalizedQuery) return true;
      const searchableText = [
        entry.date,
        entry.summary,
        entry.details,
        entry.remainingRisk,
        entry.status,
        entry.recordType ? recordTypeLabels[entry.recordType] : '',
        entry.blockName,
        entry.authorName,
        ...entry.referenceLinks,
        issue?.title,
        issue?.currentSummary,
        issue?.groupLabel,
        issue?.ownerName,
        issue?.ownerResearchGroup,
        issue?.relatedDepartment,
        issue?.relatedEquipment,
        issue?.relatedCustomer,
        issue?.priorityLabel,
        ...(issue?.tags ?? []),
        detailIssue?.title,
        detailIssue?.currentSummary,
        detailIssue?.ownerName,
        detailIssue?.ownerResearchGroup,
        detailIssue?.relatedDepartment,
        detailIssue?.relatedEquipment,
        detailIssue?.relatedCustomer,
        detailIssue?.priorityLabel,
        ...(detailIssue?.tags ?? []),
      ]
        .join(' ')
        .toLowerCase();
      return searchableText.includes(normalizedQuery);
    });
  }, [detailIssueById, entries, issueById, openOnly, query]);
  const filteredIssues = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return issues
      .map((issue) => ({
        issue,
        issueEntries: entriesByIssueId.get(issue.id) ?? [],
      }))
      .filter(({ issue, issueEntries }) => {
        if (openOnly && issue.status === 'resolved') return false;
        if (!normalizedQuery) return true;
        const issueDetailIssues = detailIssues.filter((detailIssue) => detailIssue.issueGroupId === issue.id);
        const searchableText = [
          issue.title,
          issue.currentSummary,
          issue.groupLabel,
          issue.status,
          issue.ownerName,
          issue.ownerResearchGroup,
          issue.relatedDepartment,
          issue.relatedEquipment,
          issue.relatedCustomer,
          issue.priorityLabel,
          ...issue.tags,
          ...issueDetailIssues.flatMap((detailIssue) => [
            detailIssue.title,
            detailIssue.currentSummary,
            detailIssue.ownerName,
            detailIssue.ownerResearchGroup,
            detailIssue.relatedDepartment,
            detailIssue.relatedEquipment,
            detailIssue.relatedCustomer,
            detailIssue.priorityLabel,
            ...detailIssue.tags,
          ]),
          ...issueEntries.flatMap((entry) => [
            entry.summary,
            entry.details,
            entry.remainingRisk,
            entry.date,
            entry.status,
            entry.blockName,
            entry.authorName,
            entry.recordType ? recordTypeLabels[entry.recordType] : '',
            ...entry.referenceLinks,
          ]),
        ]
          .join(' ')
          .toLowerCase();
        return searchableText.includes(normalizedQuery);
      })
      .sort((a, b) => {
        const aLatest = a.issueEntries[0]?.date ?? a.issue.latestUpdatedAt;
        const bLatest = b.issueEntries[0]?.date ?? b.issue.latestUpdatedAt;
        return bLatest.localeCompare(aLatest);
      });
  }, [detailIssues, entriesByIssueId, issues, openOnly, query]);
  const datePageCount = Math.max(1, Math.ceil(filteredEntries.length / PAGE_SIZE));
  const visibleEntries = filteredEntries.slice(pageIndex * PAGE_SIZE, pageIndex * PAGE_SIZE + PAGE_SIZE);
  const pageStart = filteredEntries.length === 0 ? 0 : pageIndex * PAGE_SIZE + 1;
  const pageEnd = Math.min(filteredEntries.length, pageIndex * PAGE_SIZE + PAGE_SIZE);
  const hasActiveFilters = Boolean(activeDashboardFilterLabel || query.trim() || openOnly);

  useEffect(() => {
    setPageIndex(0);
  }, [openOnly, query, viewMode]);

  useEffect(() => {
    if (pageIndex > datePageCount - 1) setPageIndex(datePageCount - 1);
  }, [datePageCount, pageIndex]);

  function clearAllFilters() {
    setQuery('');
    setOpenOnly(false);
    setPageIndex(0);
    onClearDashboardFilter?.();
  }

  return (
    <section className="history-list-panel" aria-label="날짜별 이력 목록">
      <div className="section-header">
        <div>
          <h2>{viewMode === 'date' ? '날짜별 이력' : '이슈별 모음'}</h2>
          <p>{viewMode === 'date' ? '최근 기록부터 이어 읽는 운영 로그입니다.' : '큰 이슈 단위로 진행 상태를 확인합니다.'}</p>
        </div>
      </div>
      <div className="history-view-tabs" aria-label="이력 보기 방식">
        <button className={viewMode === 'date' ? 'is-active' : ''} type="button" onClick={() => setViewMode('date')}>
          날짜별 이력
        </button>
        <button className={viewMode === 'issue' ? 'is-active' : ''} type="button" onClick={() => setViewMode('issue')}>
          이슈별 모음
        </button>
      </div>
      <div className="history-tools" aria-label="이력 검색과 필터">
        <label className="search-box">
          <Search size={16} />
          <input
            type="search"
            value={query}
            placeholder="검색"
            aria-label="통합 검색"
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
      </div>
      {hasActiveFilters && (
        <div className="history-filter-bar" aria-live="polite">
          <div>
            {activeDashboardFilterLabel && <span>대시보드: {activeDashboardFilterLabel}</span>}
            {query.trim() && <span>검색: {query.trim()}</span>}
            {openOnly && <span>미완료</span>}
          </div>
          <button type="button" onClick={clearAllFilters}>
            전체 보기
          </button>
        </div>
      )}
      {viewMode === 'date' ? (
        <>
          <div className="history-list">
            {visibleEntries.map((entry) => {
              const issue = issueById.get(entry.issueGroupId);
              const entryPhase = getStatusPhase(data, entry.status);
              return (
                <button
                  className={`history-row ${selectedEntryId === entry.id ? 'is-selected' : ''}`}
                  key={entry.id}
                  type="button"
                  onClick={() => onSelectEntry(entry.id)}
                >
                  <div className="row-meta">
                    <time>{entry.date}</time>
                    {issue && <span className="issue-chip">{issue.groupLabel}</span>}
                    {entry.recordType && <span className="record-type-chip">{recordTypeLabels[entry.recordType]}</span>}
                    <span className={`status-dot-label phase-${entryPhase}`}>
                      {PHASE_LABELS[entryPhase]}
                    </span>
                  </div>
                  <strong>{entry.summary}</strong>
                </button>
              );
            })}
            {filteredEntries.length === 0 && <p className="empty-list">검색 결과가 없습니다.</p>}
          </div>
          {filteredEntries.length > PAGE_SIZE && (
            <div className="history-pagination" aria-label="날짜별 이력 페이지 이동">
              <span>
                {pageStart}-{pageEnd} / {filteredEntries.length}
              </span>
              <div>
                <button type="button" disabled={pageIndex === 0} onClick={() => setPageIndex((value) => Math.max(0, value - 1))}>
                  이전
                </button>
                <button
                  type="button"
                  disabled={pageIndex >= datePageCount - 1}
                  onClick={() => setPageIndex((value) => Math.min(datePageCount - 1, value + 1))}
                >
                  다음
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="issue-group-list" aria-label="이슈별 모음">
          {filteredIssues.map(({ issue, issueEntries }) => {
            const latestEntry = issueEntries[0];
            const latestDetailIssue = latestEntry ? detailIssueById.get(latestEntry.detailIssueId) : undefined;
            const ownerName = latestDetailIssue?.ownerName ?? issue.ownerName ?? latestEntry?.authorName ?? '담당자 미정';
            const ownerDepartment = latestDetailIssue?.ownerResearchGroup ?? issue.ownerResearchGroup ?? getFallbackResearchGroup(issue.categoryId);
            const isSelected = issueEntries.some((entry) => entry.id === selectedEntryId);
            const issuePhase = getStatusPhase(data, issue.status);
            return (
              <button
                className={`issue-group-row ${isSelected ? 'is-selected' : ''}`}
                disabled={!latestEntry}
                key={issue.id}
                type="button"
                onClick={() => {
                  if (latestEntry) onSelectEntry(latestEntry.id);
                }}
              >
                <div className="row-meta">
                  <span className="issue-chip">{issue.groupLabel}</span>
                  <span className={`status-dot-label phase-${issuePhase}`}>
                    {PHASE_LABELS[issuePhase]}
                  </span>
                  <small>{issueEntries.length}건</small>
                </div>
                <strong>{issue.title}</strong>
                <p>{issue.currentSummary}</p>
                <div className="issue-group-row__footer">
                  <span>최근 {latestEntry?.date ?? issue.latestUpdatedAt}</span>
                  <span>{ownerName} · {ownerDepartment}</span>
                </div>
              </button>
            );
          })}
          {filteredIssues.length === 0 && <p className="empty-list">검색 결과가 없습니다.</p>}
        </div>
      )}
    </section>
  );
}

function getFallbackResearchGroup(categoryId: string) {
  if (categoryId === 'equipment-test') return '시험분석연구그룹';
  if (categoryId === 'investment-project') return '투자과제기획그룹';
  if (categoryId === 'system-operation') return '연구운영기획그룹';
  return '강종솔루션연구그룹';
}
