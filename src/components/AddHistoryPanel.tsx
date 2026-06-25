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
  editingEntry?: HistoryEntry;
  onAddEntry: (issueGroup: IssueGroup, detailIssue: DetailIssue, entry: HistoryEntry, isNewDetailIssue: boolean) => void;
  onUpdateEntry?: (entry: HistoryEntry) => void;
  onClose: () => void;
};

export function AddHistoryPanel({
  data,
  categoryId,
  subtopicId,
  initialIssueGroupId,
  initialDetailIssueId,
  editingEntry,
  onAddEntry,
  onUpdateEntry,
  onClose,
}: AddHistoryPanelProps) {
  const isEditing = Boolean(editingEntry);
  const [query, setQuery] = useState('');
  const recommendations = useMemo(
    () => getRecommendedIssueGroups(data, { categoryId, subtopicId, query }),
    [categoryId, data, query, subtopicId],
  );
  const issueGroups = recommendations.length
    ? recommendations
    : data.issueGroups.filter((issue) => issue.categoryId === categoryId && issue.subtopicId === subtopicId && !issue.archived);
  const [selectedIssueGroupId, setSelectedIssueGroupId] = useState<string>(
    editingEntry?.issueGroupId ?? initialIssueGroupId ?? issueGroups[0]?.id ?? '',
  );
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
  const [selectedDetailIssueId, setSelectedDetailIssueId] = useState<string>(
    editingEntry?.detailIssueId ?? initialDetailIssueId ?? '',
  );
  const [useNewDetailIssue, setUseNewDetailIssue] = useState(false);
  const selectedDetailIssue =
    !useNewDetailIssue && selectedDetailIssueId
      ? data.detailIssues.find((detailIssue) => detailIssue.id === selectedDetailIssueId)
      : recommendedDetailIssues[0];
  const [date, setDate] = useState(() => editingEntry?.date ?? new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState<IssueStatus>(editingEntry?.status ?? 'actioning');
  const [changesStatus, setChangesStatus] = useState(editingEntry?.changesDetailIssueStatus ?? true);
  const [summary, setSummary] = useState(editingEntry?.summary ?? '');
  const [details, setDetails] = useState(editingEntry?.details ?? '');
  const [remainingRisk, setRemainingRisk] = useState(editingEntry?.remainingRisk ?? '');
  const [referenceUrlText, setReferenceUrlText] = useState(editingEntry?.referenceLinks.join('\n') ?? '');

  function submit() {
    if (!selectedIssueGroup || !summary.trim()) return;
    const now = new Date().toISOString();
    const referenceLinks = referenceUrlText
      .split(/\n|,/)
      .map((url) => url.trim())
      .filter(Boolean);

    if (editingEntry) {
      onUpdateEntry?.({
        ...editingEntry,
        date,
        status,
        changesDetailIssueStatus: changesStatus,
        summary: summary.trim(),
        details: details.trim() || summary.trim(),
        remainingRisk: remainingRisk.trim(),
        blockName: STATUS_LABELS[status],
        referenceLinks,
        updatedAt: now,
      });
      return;
    }

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
        referenceLinks,
        authorName: '관리자',
        createdAt: now,
        updatedAt: now,
      },
      useNewDetailIssue || !selectedDetailIssue,
    );
  }

  return (
    <aside className="drawer add-history-drawer" aria-label={isEditing ? '이력 수정' : '이력 추가'}>
      <div className="drawer__header add-history-drawer__header">
        <div>
          <h2>{isEditing ? '이력 수정' : '이력 추가'}</h2>
          <p>{isEditing ? '선택한 날짜 기록의 내용을 고칩니다.' : '대상 이슈를 고르고 이번 기록만 적습니다.'}</p>
        </div>
        <button className="icon-button" type="button" onClick={onClose} aria-label="닫기">
          <X size={18} />
        </button>
      </div>

      <div className="add-history-flow">
        <section className="add-history-section">
          <div className="add-history-section__title">
            <span>1</span>
            <strong>대상</strong>
          </div>
          {isEditing ? (
            <div className="target-summary-card">
              <span>{selectedIssueGroup?.groupLabel ?? '이슈'}</span>
              <strong>{selectedIssueGroup?.title ?? '-'}</strong>
              <small>{selectedDetailIssue?.title ?? '세부 항목'}</small>
            </div>
          ) : (
            <>
              <label className="field">
                <span>찾기</span>
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="예: STS, 430, 표면, 시험조건"
                />
              </label>

              <div className="form-grid">
                <label className="field">
                  <span>이슈</span>
                  <select value={selectedIssueGroup?.id ?? ''} onChange={(event) => setSelectedIssueGroupId(event.target.value)}>
                    {issueGroups.map((issue) => (
                      <option key={issue.id} value={issue.id}>
                        {issue.title}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>세부 항목</span>
                  <select
                    disabled={useNewDetailIssue || recommendedDetailIssues.length === 0}
                    value={selectedDetailIssue?.id ?? ''}
                    onChange={(event) => {
                      setUseNewDetailIssue(false);
                      setSelectedDetailIssueId(event.target.value);
                    }}
                  >
                    {recommendedDetailIssues.map((detailIssue) => (
                      <option key={detailIssue.id} value={detailIssue.id}>
                        {detailIssue.title}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="checkbox-field checkbox-field--quiet">
                <input
                  type="checkbox"
                  checked={useNewDetailIssue}
                  onChange={(event) => setUseNewDetailIssue(event.target.checked)}
                />
                <span>새 세부 항목으로 기록합니다.</span>
              </label>
            </>
          )}
        </section>

        <section className="add-history-section">
          <div className="add-history-section__title">
            <span>2</span>
            <strong>기록 내용</strong>
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
            <span>이 기록의 상태를 이슈 상태에도 반영합니다.</span>
          </label>

          <label className="field">
            <span>요약</span>
            <input value={summary} onChange={(event) => setSummary(event.target.value)} placeholder="예: 압연 조건 변경 후 재발 확인" />
          </label>
          <label className="field">
            <span>상세 내용</span>
            <textarea value={details} onChange={(event) => setDetails(event.target.value)} rows={4} />
          </label>
          <label className="field">
            <span>남은 리스크</span>
            <textarea value={remainingRisk} onChange={(event) => setRemainingRisk(event.target.value)} rows={3} />
          </label>
          <label className="field">
            <span>첨부 URL</span>
            <textarea
              value={referenceUrlText}
              onChange={(event) => setReferenceUrlText(event.target.value)}
              placeholder="https://..."
              rows={2}
            />
          </label>
        </section>
      </div>

      <div className="drawer-footer">
        <button className="primary-button full-width" type="button" onClick={submit}>
          {isEditing ? '이력 수정 저장' : '이력 추가'}
        </button>
      </div>
    </aside>
  );
}
