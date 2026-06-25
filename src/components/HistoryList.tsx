import { Filter, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { HistoryEntry, IssueGroup } from '../domain/types';
import { PHASE_LABELS, STATUS_PHASES } from '../domain/types';

const PAGE_SIZE = 10;

type HistoryListProps = {
  activeDashboardFilterLabel?: string;
  entries: HistoryEntry[];
  issues: IssueGroup[];
  selectedEntryId?: string;
  onClearDashboardFilter?: () => void;
  onSelectEntry: (entryId: string) => void;
};

export function HistoryList({
  activeDashboardFilterLabel,
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
  const issueById = useMemo(() => new Map(issues.map((issue) => [issue.id, issue])), [issues]);
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
      if (openOnly && issue?.status === 'resolved') return false;
      if (!normalizedQuery) return true;
      const searchableText = [
        entry.date,
        entry.summary,
        entry.details,
        entry.status,
        issue?.title,
        issue?.groupLabel,
        ...(issue?.tags ?? []),
      ]
        .join(' ')
        .toLowerCase();
      return searchableText.includes(normalizedQuery);
    });
  }, [entries, issueById, openOnly, query]);
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
        const searchableText = [
          issue.title,
          issue.currentSummary,
          issue.groupLabel,
          issue.status,
          ...issue.tags,
          ...issueEntries.flatMap((entry) => [entry.summary, entry.details, entry.date]),
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
  }, [entriesByIssueId, issues, openOnly, query]);
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
            placeholder="이슈 제목, 스티커, 요약 검색..."
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <button
          className={`filter-button ${openOnly ? 'is-active' : ''}`}
          type="button"
          onClick={() => setOpenOnly((value) => !value)}
        >
          <Filter size={15} />
          미완료
        </button>
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
                    <span className={`status-dot-label phase-${STATUS_PHASES[entry.status]}`}>
                      {PHASE_LABELS[STATUS_PHASES[entry.status]]}
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
            const isSelected = issueEntries.some((entry) => entry.id === selectedEntryId);
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
                  <span className={`group-sticker tone-${issue.groupColorTone}`}>{issue.groupLabel}</span>
                  <span className={`status-dot-label phase-${STATUS_PHASES[issue.status]}`}>
                    {PHASE_LABELS[STATUS_PHASES[issue.status]]}
                  </span>
                  <small>{issueEntries.length}건</small>
                </div>
                <strong>{issue.title}</strong>
                <p>{issue.currentSummary}</p>
                <div className="issue-group-row__footer">
                  <span>최근 {latestEntry?.date ?? issue.latestUpdatedAt}</span>
                  <span>{issue.ownerName ?? '담당자 미정'}</span>
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
