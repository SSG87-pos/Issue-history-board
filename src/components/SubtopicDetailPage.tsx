import { type CSSProperties, useMemo, useRef, useState } from 'react';
import type { Category, HistoryEntry, IssueBoardData, IssueGroup, IssuePhase, Subtopic } from '../domain/types';
import { PHASE_LABELS, STATUS_PHASES } from '../domain/types';
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
  onOpenEdit: (entry: HistoryEntry) => void;
};

type DashboardFilter = 'all' | 'open' | 'recent' | IssuePhase;

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
  onOpenEdit,
}: SubtopicDetailPageProps) {
  const listAnchorRef = useRef<HTMLDivElement>(null);
  const detailAnchorRef = useRef<HTMLDivElement>(null);
  const [isMobileDetailOpen, setIsMobileDetailOpen] = useState(false);
  const [dashboardFilter, setDashboardFilter] = useState<DashboardFilter>('all');
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
  const openIssues = issues.filter((issue) => STATUS_PHASES[issue.status] !== 'closed');
  const oldestOpenIssue = openIssues.slice().sort((a, b) => a.firstOccurredAt.localeCompare(b.firstOccurredAt))[0];
  const latestEntryDate = entries[0]?.date;
  const recentCutoff = getDateOffset(latestEntryDate ?? new Date().toISOString().slice(0, 10), -7);
  const recentIssues = issues.filter((issue) => issue.latestUpdatedAt >= recentCutoff);
  const nextCheckCount = entries.filter((entry) => entry.nextCheckDate && entry.nextCheckDate >= (latestEntryDate ?? '')).length;
  const visibleIssues = useMemo(() => {
    if (dashboardFilter === 'all') return issues;
    if (dashboardFilter === 'open') return issues.filter((issue) => STATUS_PHASES[issue.status] !== 'closed');
    if (dashboardFilter === 'recent') return issues.filter((issue) => issue.latestUpdatedAt >= recentCutoff);
    return issues.filter((issue) => STATUS_PHASES[issue.status] === dashboardFilter);
  }, [dashboardFilter, issues, recentCutoff]);
  const visibleIssueIds = useMemo(() => new Set(visibleIssues.map((issue) => issue.id)), [visibleIssues]);
  const visibleEntries = useMemo(() => entries.filter((entry) => visibleIssueIds.has(entry.issueGroupId)), [entries, visibleIssueIds]);
  const selectedEntry = visibleEntries.find((entry) => entry.id === selectedEntryId) ?? visibleEntries[0];
  const selectedIssue = selectedEntry ? visibleIssues.find((issue) => issue.id === selectedEntry.issueGroupId) : undefined;
  const isMobileViewport = () => typeof window !== 'undefined' && window.matchMedia('(max-width: 860px)').matches;
  const gaugeStyle = {
    '--gauge-fill': getGaugeGradient(issuePhaseCounts, issueTotal),
  } as CSSProperties;

  function handleSelectEntry(entryId: string) {
    onSelectEntry(entryId);

    if (!isMobileViewport()) return;

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
          <button className="primary-button page-actions__add" type="button" onClick={onOpenAdd}>
            이력 추가
          </button>
        </div>
      </div>

      <div className="summary-strip issue-dashboard" aria-label="이슈 상태 대시보드">
        <section className={`dashboard-card dashboard-card--status ${dashboardFilter === 'all' ? 'is-active' : ''}`}>
          <button className="dashboard-card__main" type="button" onClick={() => setDashboardFilter('all')}>
            <span>이슈 현황</span>
            <strong>총 {issueTotal}건</strong>
          </button>
          <div className="phase-gauge" style={gaugeStyle} aria-label="접수 진행 종료 점유율">
            <div className="phase-gauge__arc" />
            <b>{issueTotal}</b>
          </div>
          <div className="phase-breakdown">
            {(['received', 'in_progress', 'closed'] as IssuePhase[]).map((phase) => (
              <button
                className={`status-dot-label phase-${phase} ${dashboardFilter === phase ? 'is-active' : ''}`}
                key={phase}
                type="button"
                onClick={() => setDashboardFilter(phase)}
              >
                {PHASE_LABELS[phase]} {issuePhaseCounts[phase]}건
              </button>
            ))}
          </div>
        </section>

        <button
          className={`dashboard-card dashboard-card--metric ${dashboardFilter === 'open' ? 'is-active' : ''}`}
          type="button"
          onClick={() => setDashboardFilter('open')}
        >
          <span>미종료 관리</span>
          <strong>{openIssues.length}건</strong>
          <small>{oldestOpenIssue ? `최장 ${oldestOpenIssue.firstOccurredAt} · ${oldestOpenIssue.title}` : '열린 이슈 없음'}</small>
        </button>

        <button
          className={`dashboard-card dashboard-card--metric ${dashboardFilter === 'recent' ? 'is-active' : ''}`}
          type="button"
          onClick={() => setDashboardFilter('recent')}
        >
          <span>최근 변동</span>
          <strong>{recentIssues.length}건</strong>
          <small>최근 7일 기준 · 다음 확인 {nextCheckCount}건</small>
        </button>
      </div>

      <div className={`subtopic-page__content ${isMobileDetailOpen ? 'is-mobile-detail-open' : ''}`}>
        <div className="history-list-anchor" ref={listAnchorRef}>
          <HistoryList
            activeDashboardFilterLabel={dashboardFilter === 'all' ? undefined : getDashboardFilterLabel(dashboardFilter)}
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
            onEditEntry={onOpenEdit}
            onSelectEntry={handleSelectEntry}
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

function getGaugeGradient(counts: Record<IssuePhase, number>, total: number) {
  if (!total) return 'conic-gradient(from 270deg at 50% 100%, #e7edf6 0deg 180deg, transparent 180deg 360deg)';

  const received = (counts.received / total) * 180;
  const progress = received + (counts.in_progress / total) * 180;
  return `conic-gradient(from 270deg at 50% 100%, #f0802e 0deg ${received}deg, #1f66e5 ${received}deg ${progress}deg, #27915d ${progress}deg 180deg, transparent 180deg 360deg)`;
}

function getDashboardFilterLabel(filter: DashboardFilter) {
  if (filter === 'open') return '미종료 관리';
  if (filter === 'recent') return '최근 변동';
  if (filter === 'all') return '전체 이슈';
  return PHASE_LABELS[filter];
}
