import { X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { getDetailIssuesForGroup, getRecommendedIssueGroups } from '../domain/selectors';
import type { DetailIssue, HistoryEntry, IssueBoardData, IssueGroup, IssueStatus } from '../domain/types';
import { STATUS_LABELS } from '../domain/types';

type AddHistoryPanelProps = {
  data: IssueBoardData;
  categoryId: string;
  subtopicId: string;
  initialIssueGroupId?: string;
  initialDetailIssueId?: string;
  onAddEntry: (issueGroup: IssueGroup, detailIssue: DetailIssue, entry: HistoryEntry, isNewDetailIssue: boolean) => void;
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
  const recommendations = useMemo(
    () => getRecommendedIssueGroups(data, { categoryId, subtopicId, query }),
    [categoryId, data, query, subtopicId],
  );
  const issueGroups = recommendations.length
    ? recommendations
    : data.issueGroups.filter((issue) => issue.categoryId === categoryId && issue.subtopicId === subtopicId && !issue.archived);
  const [selectedIssueGroupId, setSelectedIssueGroupId] = useState<string>(initialIssueGroupId ?? issueGroups[0]?.id ?? '');
  const selectedIssueGroup = data.issueGroups.find((issue) => issue.id === selectedIssueGroupId) ?? issueGroups[0];
  const recommendedDetailIssues = useMemo(() => {
    if (!selectedIssueGroup) return [];
    const candidates = getDetailIssuesForGroup(data, selectedIssueGroup.id);
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return candidates;
    const groupSearchableText = [
      selectedIssueGroup.title,
      selectedIssueGroup.currentSummary,
      selectedIssueGroup.groupLabel,
      ...selectedIssueGroup.tags,
    ]
      .join(' ')
      .toLowerCase();
    if (groupSearchableText.includes(normalizedQuery)) return candidates;
    return candidates.filter((detailIssue) =>
      [detailIssue.title, detailIssue.currentSummary, ...detailIssue.tags].join(' ').toLowerCase().includes(normalizedQuery),
    );
  }, [data, query, selectedIssueGroup]);
  const [selectedDetailIssueId, setSelectedDetailIssueId] = useState<string>(initialDetailIssueId ?? '');
  const [useNewDetailIssue, setUseNewDetailIssue] = useState(false);
  const selectedDetailIssue =
    !useNewDetailIssue && selectedDetailIssueId
      ? data.detailIssues.find((detailIssue) => detailIssue.id === selectedDetailIssueId)
      : recommendedDetailIssues[0];
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState<IssueStatus>('actioning');
  const [changesStatus, setChangesStatus] = useState(true);
  const [summary, setSummary] = useState('');
  const [details, setDetails] = useState('');
  const [remainingRisk, setRemainingRisk] = useState('');

  function submit() {
    if (!selectedIssueGroup || !summary.trim()) return;
    const now = new Date().toISOString();
    const detailIssue: DetailIssue = useNewDetailIssue || !selectedDetailIssue
      ? {
          id: `detail-${Date.now()}`,
          issueGroupId: selectedIssueGroup.id,
          title: summary.trim(),
          status,
          firstOccurredAt: date,
          latestUpdatedAt: date,
          currentSummary: summary.trim(),
          tags: selectedIssueGroup.tags.slice(0, 2),
          ownerName: '관리자',
          needsReview: false,
          archived: false,
        }
      : selectedDetailIssue;

    onAddEntry(
      selectedIssueGroup,
      detailIssue,
      {
        id: `hist-${Date.now()}`,
        issueGroupId: selectedIssueGroup.id,
        detailIssueId: detailIssue.id,
        date,
        status,
        changesDetailIssueStatus: changesStatus,
        summary: summary.trim(),
        details: details.trim() || summary.trim(),
        remainingRisk: remainingRisk.trim(),
        blockName: STATUS_LABELS[status],
        referenceLinks: [],
        authorName: '관리자',
        createdAt: now,
        updatedAt: now,
      },
      useNewDetailIssue || !selectedDetailIssue,
    );
  }

  return (
    <aside className="drawer" aria-label="이력 추가">
      <div className="drawer__header">
        <div>
          <h2>이력 추가</h2>
          <p>기존 세부 항목을 먼저 연결합니다.</p>
        </div>
        <button className="icon-button" type="button" onClick={onClose} aria-label="닫기">
          <X size={18} />
        </button>
      </div>

      <label className="field">
        <span>기존 이슈 검색</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="예: STS, 430, 표면, 시험조건"
        />
      </label>

      <label className="field">
        <span>큰 구분/스티커</span>
        <select value={selectedIssueGroup?.id ?? ''} onChange={(event) => setSelectedIssueGroupId(event.target.value)}>
          {issueGroups.map((issue) => (
            <option key={issue.id} value={issue.id}>
              {issue.groupLabel} · {issue.title}
            </option>
          ))}
        </select>
      </label>

      <div className="recommendation-list">
        {recommendedDetailIssues.map((detailIssue) => (
          <button
            className={`recommendation-card ${selectedDetailIssue?.id === detailIssue.id && !useNewDetailIssue ? 'is-selected' : ''}`}
            key={detailIssue.id}
            type="button"
            onClick={() => {
              setUseNewDetailIssue(false);
              setSelectedDetailIssueId(detailIssue.id);
            }}
          >
            <strong>{detailIssue.title}</strong>
            <span>최근 {detailIssue.latestUpdatedAt} · {STATUS_LABELS[detailIssue.status]}</span>
          </button>
        ))}
        <button
          className={`recommendation-card ${useNewDetailIssue ? 'is-selected' : ''}`}
          type="button"
          onClick={() => setUseNewDetailIssue(true)}
        >
          + 새 세부 항목 만들기
        </button>
      </div>

      <div className="form-grid">
        <label className="field">
          <span>날짜</span>
          <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </label>
        <label className="field">
          <span>세부 항목 상태</span>
          <select value={status} onChange={(event) => setStatus(event.target.value as IssueStatus)}>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="checkbox-field">
        <input type="checkbox" checked={changesStatus} onChange={(event) => setChangesStatus(event.target.checked)} />
        <span>이 날짜별 이력으로 세부 항목 상태를 변경합니다.</span>
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

      <button className="primary-button full-width" type="button" onClick={submit}>
        선택한 세부 항목에 이력 추가
      </button>
    </aside>
  );
}
