import { Star } from 'lucide-react';
import {
  getGroupedTimeline,
  getHistoryEntriesForDetailIssue,
} from '../domain/selectors';
import type { HistoryEntry, IssueBoardData, IssueGroup } from '../domain/types';
import { PHASE_LABELS, RECORD_TYPE_LABELS, STATUS_LABELS, STATUS_PHASES } from '../domain/types';

type HistoryDetailProps = {
  data: IssueBoardData;
  selectedEntry?: HistoryEntry;
  selectedIssue?: IssueGroup;
  onCloseDetail?: () => void;
  onEditEntry: (entry: HistoryEntry) => void;
  onSelectEntry: (entryId: string) => void;
};

export function HistoryDetail({ data, selectedEntry, selectedIssue, onCloseDetail, onEditEntry, onSelectEntry }: HistoryDetailProps) {
  if (!selectedEntry || !selectedIssue) {
    return (
      <section className="history-detail empty-detail" aria-label="이력 상세">
        <h2>선택된 이력이 없습니다.</h2>
        <p>왼쪽 날짜별 이력에서 확인할 기록을 선택하세요.</p>
      </section>
    );
  }

  const detailIssue = data.detailIssues.find((issue) => issue.id === selectedEntry.detailIssueId);
  const sameIssueEntries = getHistoryEntriesForDetailIssue(data, selectedEntry.detailIssueId).slice().reverse();
  const groupedTimeline = getGroupedTimeline(data, selectedIssue.id);
  const phase = STATUS_PHASES[selectedIssue.status];
  const ownerName = detailIssue?.ownerName ?? selectedIssue.ownerName ?? selectedEntry.authorName ?? '-';
  const ownerResearchGroup = detailIssue?.ownerResearchGroup ?? selectedIssue.ownerResearchGroup ?? getFallbackResearchGroup(selectedIssue.categoryId);
  const relatedDepartment = detailIssue?.relatedDepartment ?? selectedIssue.relatedDepartment ?? getFallbackDepartment(selectedIssue.categoryId);
  const priorityLabel = detailIssue?.priorityLabel ?? selectedIssue.priorityLabel ?? '보통';
  const detailLines = toReadableLines(selectedEntry.details);
  const referenceLinks = selectedEntry.referenceLinks.length ? selectedEntry.referenceLinks : [];
  const entryPhase = STATUS_PHASES[selectedEntry.status];
  const recordTypeLabel = selectedEntry.recordType ? RECORD_TYPE_LABELS[selectedEntry.recordType] : '일반';

  return (
    <section className="history-detail" aria-label="선택한 날짜 이력 상세">
      <div className="detail-summary">
        <div>
          <div className="issue-title-row">
            <h2>{selectedIssue.title}</h2>
            <button className="icon-button ghost" type="button" aria-label="중요 표시">
              <Star size={21} />
            </button>
          </div>
        </div>
        <div className="detail-actions">
          <ol className={`phase-track phase-${phase}`} aria-label={`현재 단계 ${PHASE_LABELS[phase]}`}>
            {(['received', 'in_progress', 'closed'] as const).map((item) => (
              <li className={item === phase ? 'is-current' : ''} key={item}>
                {PHASE_LABELS[item]}
              </li>
            ))}
          </ol>
          {onCloseDetail && (
            <button className="text-button detail-close-button" type="button" onClick={onCloseDetail}>
              상세 닫기
            </button>
          )}
          <button className="text-button" type="button" onClick={() => onEditEntry(selectedEntry)}>
            이력 수정
          </button>
        </div>
      </div>

      <div className="issue-meta-strip">
        <div>
          <span>최초 보고일</span>
          <strong>{detailIssue?.firstOccurredAt ?? selectedIssue.firstOccurredAt}</strong>
        </div>
        <div>
          <span>우선순위</span>
          <strong>{priorityLabel}</strong>
        </div>
        <div>
          <span>담당자</span>
          <strong>{ownerName}</strong>
        </div>
        <div>
          <span>담당연구그룹</span>
          <strong>{ownerResearchGroup}</strong>
        </div>
        <div>
          <span>유관부서</span>
          <strong>{relatedDepartment}</strong>
        </div>
      </div>

      <div className="detail-body">
        <aside className="timeline-panel" aria-label="같은 이슈의 이력 목록">
          <div className="timeline-panel__header">
            <h3>이력 목록</h3>
            <div className="timeline-legend" aria-label="이력 점 색상 의미">
              <span className="phase-received">접수</span>
              <span className="phase-in_progress">진행</span>
              <span className="phase-closed">종료</span>
            </div>
          </div>
          {sameIssueEntries.map((entry) => (
            <button
              className={`timeline-row status-${entry.status} ${entry.id === selectedEntry.id ? 'is-selected' : ''}`}
              key={entry.id}
              type="button"
              onClick={() => onSelectEntry(entry.id)}
            >
              <span>{entry.date}</span>
              <strong>{entry.summary}</strong>
            </button>
          ))}
          <div className="grouped-timeline" aria-label="묶음 타임라인">
            {groupedTimeline.map((group) => (
              <div key={group.name}>
                <span>{group.name}</span>
                <strong>{group.entries.length}건</strong>
              </div>
            ))}
          </div>
        </aside>

        <article className="selected-entry">
          <div className="selected-entry__heading">
            <div className="selected-entry__kicker">
              <time>{selectedEntry.date}</time>
              <div className="entry-meta-chips" aria-label="이력 메타 정보">
                <span className={`entry-meta-chip phase-${entryPhase}`}>{PHASE_LABELS[entryPhase]}</span>
                <span className={`entry-meta-chip status-${selectedEntry.status}`}>{STATUS_LABELS[selectedEntry.status]}</span>
                <span className="entry-meta-chip">{recordTypeLabel}</span>
                {selectedEntry.changesDetailIssueStatus && <span className="entry-meta-chip is-sync">이슈 반영</span>}
              </div>
            </div>
            <h3>{selectedEntry.summary}</h3>
          </div>

          <h4>상세 내용</h4>
          <ul className="entry-bullet-list">
            {detailLines.length > 0 ? detailLines.map((line) => <li key={line}>{line}</li>) : <li>등록된 상세 내용이 없습니다.</li>}
          </ul>

          <div className="risk-check-grid">
            <div>
              <h4>향후 계획</h4>
              <p>{selectedEntry.remainingRisk || '등록된 잔여 리스크가 없습니다.'}</p>
            </div>
          </div>

          <h4>첨부 URL</h4>
          <div className="attachment-list">
            {referenceLinks.length > 0 ? (
              referenceLinks.map((url) => (
                <a href={url} key={url} rel="noreferrer" target="_blank">
                  {url}
                </a>
              ))
            ) : (
              <span>첨부 URL 없음</span>
            )}
          </div>
        </article>
      </div>
    </section>
  );
}

function getFallbackResearchGroup(categoryId: string) {
  if (categoryId === 'equipment-test') return '시험분석연구그룹';
  if (categoryId === 'investment-project') return '투자과제기획그룹';
  if (categoryId === 'system-operation') return '연구운영기획그룹';
  return '강종솔루션연구그룹';
}

function getFallbackDepartment(categoryId: string) {
  if (categoryId === 'equipment-test') return '설비기술센터';
  if (categoryId === 'investment-project') return '기술기획실';
  if (categoryId === 'system-operation') return '제도운영지원섹션';
  return '제품기술섹션';
}

function toReadableLines(text: string) {
  return text
    .split(/\n|(?<=\.)\s+|(?<=다\.)\s*/)
    .map((line) =>
      line
        .trim()
        .replace(/^[-*•]\s+/, '')
        .replace(/^\d+[.)]\s+/, '')
        .trim(),
    )
    .filter(Boolean);
}
