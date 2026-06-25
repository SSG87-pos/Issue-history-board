import type { Category, HistoryEntry, IssueBoardData, IssueGroup, Subtopic } from '../domain/types';
import { HistoryDetail } from './HistoryDetail';
import { HistoryList } from './HistoryList';

type SubtopicDetailPageProps = {
  data: IssueBoardData;
  category?: Category;
  subtopic?: Subtopic;
  issues: IssueGroup[];
  entries: HistoryEntry[];
  selectedEntryId?: string;
  onSelectEntry: (entryId: string) => void;
  onBackHome: () => void;
  onOpenAdd: () => void;
};

export function SubtopicDetailPage({
  data,
  category,
  subtopic,
  issues,
  entries,
  selectedEntryId,
  onSelectEntry,
  onBackHome,
  onOpenAdd,
}: SubtopicDetailPageProps) {
  const selectedEntry = entries.find((entry) => entry.id === selectedEntryId) ?? entries[0];
  const selectedIssue = selectedEntry ? issues.find((issue) => issue.id === selectedEntry.issueGroupId) : undefined;
  const unresolvedCount = issues.filter((issue) => issue.status !== 'resolved').length;
  const oldestOpen = issues
    .filter((issue) => issue.status !== 'resolved')
    .sort((a, b) => a.firstOccurredAt.localeCompare(b.firstOccurredAt))[0];

  return (
    <section className="subtopic-page" aria-label="하위 주제 상세">
      <div className="page-actions">
        <button className="text-button" type="button" onClick={onBackHome}>
          홈으로
        </button>
        <button className="text-button" type="button" onClick={onBackHome}>
          {subtopic?.label ?? '목록'} 목록으로
        </button>
        <button className="primary-button page-actions__add" type="button" onClick={onOpenAdd}>
          이력 추가
        </button>
      </div>

      <div className="subtopic-page__header">
        <div>
          <p className="breadcrumb">{category?.label ?? '대분류'} &gt; {subtopic?.label ?? '하위 주제'}</p>
          <h2>{subtopic?.label ?? '이슈'} 날짜별 이력</h2>
        </div>
      </div>

      <div className="summary-strip" aria-label="하위 주제 요약">
        <div>
          <span>최근 기록</span>
          <strong>{entries[0]?.date ?? '-'}</strong>
        </div>
        <div>
          <span>전체 이력</span>
          <strong>{entries.length}건</strong>
        </div>
        <div>
          <span>미해결 이슈</span>
          <strong>{unresolvedCount}건</strong>
        </div>
        <div>
          <span>오래 열린 건</span>
          <strong>{oldestOpen?.firstOccurredAt ?? '-'}</strong>
        </div>
      </div>

      <div className="subtopic-page__content">
        <HistoryList entries={entries} issues={issues} selectedEntryId={selectedEntry?.id} onSelectEntry={onSelectEntry} />
        <HistoryDetail data={data} selectedEntry={selectedEntry} selectedIssue={selectedIssue} onSelectEntry={onSelectEntry} />
      </div>
    </section>
  );
}
