import { MoreHorizontal, Star } from 'lucide-react';
import {
  getGroupedTimeline,
  getHistoryEntriesForDetailIssue,
  getRelatedIssueGroups,
} from '../domain/selectors';
import type { HistoryEntry, IssueBoardData, IssueGroup } from '../domain/types';
import { STATUS_LABELS } from '../domain/types';

type HistoryDetailProps = {
  data: IssueBoardData;
  selectedEntry?: HistoryEntry;
  selectedIssue?: IssueGroup;
  onSelectEntry: (entryId: string) => void;
};

export function HistoryDetail({ data, selectedEntry, selectedIssue, onSelectEntry }: HistoryDetailProps) {
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
  const relatedIssues = getRelatedIssueGroups(data, selectedIssue.id).slice(0, 4);

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
          <div className="tag-row">
            <span className={`group-sticker tone-${selectedIssue.groupColorTone}`}>{selectedIssue.groupLabel}</span>
            {selectedIssue.tags.map((tag) => (
              <span className="tag" key={tag}>
                {tag}
              </span>
            ))}
          </div>
        </div>
        <div className="detail-actions">
          <span className="status-select">{STATUS_LABELS[selectedIssue.status]}</span>
          <button className="icon-button" type="button" aria-label="추가 작업">
            <MoreHorizontal size={18} />
          </button>
        </div>
      </div>

      <div className="issue-meta-strip">
        <div>
          <span>최초 보고일</span>
          <strong>{detailIssue?.firstOccurredAt ?? selectedIssue.firstOccurredAt}</strong>
        </div>
        <div>
          <span>작성자</span>
          <strong>{detailIssue?.ownerName ?? selectedEntry.authorName ?? '-'}</strong>
        </div>
        <div>
          <span>관련 설비</span>
          <strong>{detailIssue?.relatedEquipment ?? selectedIssue.relatedEquipment ?? '-'}</strong>
        </div>
        <div>
          <span>관련 고객</span>
          <strong>{detailIssue?.relatedCustomer ?? selectedIssue.relatedCustomer ?? '-'}</strong>
        </div>
        <div>
          <span>우선순위</span>
          <strong>{detailIssue?.priorityLabel ?? selectedIssue.priorityLabel ?? '보통'}</strong>
        </div>
      </div>

      <div className="detail-body">
        <aside className="timeline-panel" aria-label="같은 이슈의 이력 목록">
          <h3>이력 목록</h3>
          {sameIssueEntries.map((entry) => (
            <button
              className={`timeline-row ${entry.id === selectedEntry.id ? 'is-selected' : ''}`}
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
          <p className="entry-kicker">{selectedEntry.date} · {STATUS_LABELS[selectedEntry.status]}</p>
          <h3>{selectedEntry.summary}</h3>
          <p className="muted">{selectedEntry.authorName ?? detailIssue?.ownerName ?? '관리자'} · {selectedEntry.updatedAt}</p>

          <h4>내용</h4>
          <p>{selectedEntry.details}</p>

          <h4>조치 사항</h4>
          <ul>
            <li>세부 이슈 상태 변경 여부: {selectedEntry.changesDetailIssueStatus ? '반영' : '미반영'}</li>
            <li>현재 상태: {STATUS_LABELS[selectedEntry.status]}</li>
            {selectedEntry.nextCheckDate && <li>다음 확인일: {selectedEntry.nextCheckDate}</li>}
          </ul>

          <h4>남은 리스크</h4>
          <p>{selectedEntry.remainingRisk || '등록된 잔여 리스크가 없습니다.'}</p>

          <h4>첨부 파일</h4>
          <div className="attachment-row">
            <span>{selectedEntry.attachmentName ?? '첨부 파일 없음'}</span>
            <strong>{selectedEntry.attachmentSizeLabel ?? '-'}</strong>
          </div>
        </article>

        <aside className="related-box" aria-label="관련 항목">
          <h3>관련 이슈</h3>
          <div className="related-list">
            {relatedIssues.map((issue) => (
              <div className="related-card" key={issue.id}>
                <strong>{issue.title}</strong>
                <span>{issue.latestUpdatedAt} · {STATUS_LABELS[issue.status]}</span>
              </div>
            ))}
            {relatedIssues.length === 0 && <p className="muted">관련 항목이 없습니다.</p>}
          </div>
        </aside>
      </div>
    </section>
  );
}
