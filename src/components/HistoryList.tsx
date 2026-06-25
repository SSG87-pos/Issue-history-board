import { Filter, Search } from 'lucide-react';
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
  const [openOnly, setOpenOnly] = useState(false);
  const issueById = useMemo(() => new Map(issues.map((issue) => [issue.id, issue])), [issues]);
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
