import { type CSSProperties, useEffect, useMemo, useRef, useState } from 'react';
import type { Category, HistoryEntry, IssueBoardData, IssueGroup, IssuePhase, Subtopic } from '../domain/types';
import { PHASE_LABELS, STATUS_PHASES } from '../domain/types';
import { LONG_RUNNING_DELAY_DAYS } from '../domain/selectors';
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
  onDeleteEntry: (entry: HistoryEntry) => void;
  onOpenEdit: (entry: HistoryEntry) => void;
  onToggleReview: (detailIssueId: string) => void;
  canEditEntries?: boolean;
  initialDashboardFilter?: DashboardFilter;
};

type DashboardFilter = 'all' | 'delayed' | 'recent' | IssuePhase;

const PHASE_ORDER: IssuePhase[] = ['received', 'in_progress', 'closed'];

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
  onDeleteEntry,
  onOpenEdit,
  onToggleReview,
  canEditEntries = true,
  initialDashboardFilter = 'all',
}: SubtopicDetailPageProps) {
  const listAnchorRef = useRef<HTMLDivElement>(null);
  const detailAnchorRef = useRef<HTMLDivElement>(null);
  const [isMobileDetailOpen, setIsMobileDetailOpen] = useState(false);
  const [dashboardFilter, setDashboardFilter] = useState<DashboardFilter>(initialDashboardFilter);
  const issuePhaseCounts = useMemo(
    () =>
      issues.reduce(
        (counts, issue) => {
          counts[STATUS_PHASES[issue.status]] += 1;
          return counts;
        },
        { received: 0, in_progress: 0, closed: 0 } as Record<IssuePhase, number>,
      ),
    [issues],
  );
  const issueTotal = issues.length;
  const delayedIssues = useMemo(() => {
    const nowTime = Date.now();
    return issues.filter(
      (issue) =>
        STATUS_PHASES[issue.status] !== 'closed' &&
        getElapsedDays(issue.firstOccurredAt, nowTime) >= LONG_RUNNING_DELAY_DAYS,
    );
  }, [issues]);
  const latestEntryDate = entries[0]?.date;
  const recentCutoff = getDateOffset(latestEntryDate ?? new Date().toISOString().slice(0, 10), -7);
  const recentIssues = issues.filter((issue) => issue.latestUpdatedAt >= recentCutoff);
  const visibleIssues = useMemo(() => {
    if (dashboardFilter === 'all') return issues;
    if (dashboardFilter === 'delayed') return delayedIssues;
    if (dashboardFilter === 'recent') return issues.filter((issue) => issue.latestUpdatedAt >= recentCutoff);
    return issues.filter((issue) => STATUS_PHASES[issue.status] === dashboardFilter);
  }, [dashboardFilter, delayedIssues, issues, recentCutoff]);
  const visibleIssueIds = useMemo(() => new Set(visibleIssues.map((issue) => issue.id)), [visibleIssues]);
  const visibleEntries = useMemo(() => entries.filter((entry) => visibleIssueIds.has(entry.issueGroupId)), [entries, visibleIssueIds]);
  const selectedEntry = visibleEntries.find((entry) => entry.id === selectedEntryId) ?? visibleEntries[0];
  const selectedIssue = selectedEntry ? visibleIssues.find((issue) => issue.id === selectedEntry.issueGroupId) : undefined;
  const isStackedDetailViewport = () => typeof window !== 'undefined' && window.matchMedia('(max-width: 1320px)').matches;

  useEffect(() => {
    setDashboardFilter(initialDashboardFilter);
  }, [initialDashboardFilter, subtopic?.id]);

  function handleSelectEntry(entryId: string) {
    onSelectEntry(entryId);

    if (!isStackedDetailViewport()) return;

    setIsMobileDetailOpen(true);
    window.requestAnimationFrame(() => {
      detailAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  function handleCloseDetail() {
    setIsMobileDetailOpen(false);

    window.requestAnimationFrame(() => {
      listAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  return (
    <section className="subtopic-page" aria-label="하위 주제 상세">
      <div className="subtopic-hero">
        <div>
          <p className="breadcrumb">{category?.label ?? '대분류'} &gt; {subtopic?.label ?? '하위 주제'}</p>
          <h2>{subtopic?.label ?? '이슈'} 이슈</h2>
        </div>
        <div className="page-actions">
          <button className="text-button" type="button" onClick={onBackHome}>
            홈으로
          </button>
          {canEditEntries && (
            <button className="primary-button page-actions__add" type="button" onClick={onOpenAdd}>
              이력 추가
            </button>
          )}
        </div>
      </div>

      <div className="summary-strip issue-dashboard" aria-label="이슈 상태 대시보드">
        <section className={`dashboard-card dashboard-card--status ${dashboardFilter === 'all' ? 'is-active' : ''}`}>
          <button className="dashboard-card__main" type="button" onClick={() => setDashboardFilter('all')}>
            <span>이슈 현황</span>
            <strong>총 {issueTotal}건</strong>
          </button>
          <div className="phase-breakdown" aria-label="접수 진행 종료 점유율">
            {PHASE_ORDER.map((phase) => {
              const phaseCount = issuePhaseCounts[phase];

              return (
                <button
                  aria-label={`${PHASE_LABELS[phase]} ${phaseCount}건`}
                  className={`status-dot-label phase-${phase} ${phaseCount === 0 ? 'is-empty' : ''} ${
                    dashboardFilter === phase ? 'is-active' : ''
                  }`}
                  key={phase}
                  type="button"
                  onClick={() => setDashboardFilter(phase)}
                  style={{ '--phase-flex': phaseCount || 0 } as CSSProperties}
                >
                  <span>{PHASE_LABELS[phase]}</span>
                  {phaseCount > 0 && <strong>{phaseCount}건</strong>}
                </button>
              );
            })}
          </div>
        </section>

        <button
          className={`dashboard-card dashboard-card--metric ${dashboardFilter === 'delayed' ? 'is-active' : ''}`}
          type="button"
          onClick={() => setDashboardFilter('delayed')}
        >
          <span>처리 지연 이슈</span>
          <strong>{delayedIssues.length}건</strong>
          <small>{LONG_RUNNING_DELAY_DAYS}일 이상 열린 미해결</small>
        </button>

        <button
          className={`dashboard-card dashboard-card--metric ${dashboardFilter === 'recent' ? 'is-active' : ''}`}
          type="button"
          onClick={() => setDashboardFilter('recent')}
        >
          <span>최근 7일 갱신</span>
          <strong>{recentIssues.length}건</strong>
        </button>
      </div>

      <div className={`subtopic-page__content ${isMobileDetailOpen ? 'is-mobile-detail-open' : ''}`}>
        <div className="history-list-anchor" ref={listAnchorRef}>
          <HistoryList
            activeDashboardFilterLabel={dashboardFilter === 'all' ? undefined : getDashboardFilterLabel(dashboardFilter)}
            data={data}
            detailIssues={data.detailIssues}
            entries={visibleEntries}
            issues={visibleIssues}
            selectedEntryId={selectedEntry?.id}
            onClearDashboardFilter={() => setDashboardFilter('all')}
            onSelectEntry={handleSelectEntry}
          />
        </div>
        <div className="history-detail-anchor" ref={detailAnchorRef}>
          <HistoryDetail
            data={data}
            selectedEntry={selectedEntry}
            selectedIssue={selectedIssue}
            onCloseDetail={handleCloseDetail}
            onDeleteEntry={onDeleteEntry}
            onEditEntry={onOpenEdit}
            onSelectEntry={handleSelectEntry}
            onToggleReview={onToggleReview}
            canEditEntries={canEditEntries}
          />
        </div>
      </div>
    </section>
  );
}

function getDateOffset(date: string, offsetDays: number) {
  const parsed = new Date(`${date}T00:00:00+09:00`);
  parsed.setDate(parsed.getDate() + offsetDays);
  return parsed.toISOString().slice(0, 10);
}

function getElapsedDays(date: string, nowTime: number) {
  const startedAt = new Date(`${date}T00:00:00+09:00`).getTime();
  return Math.max(0, Math.floor((nowTime - startedAt) / 86_400_000));
}

function getDashboardFilterLabel(filter: DashboardFilter) {
  if (filter === 'delayed') return '처리 지연 이슈';
  if (filter === 'recent') return '최근 7일 갱신';
  if (filter === 'all') return '전체 이슈';
  return PHASE_LABELS[filter];
}
