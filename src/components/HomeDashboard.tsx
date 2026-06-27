import { Info } from 'lucide-react';
import { LONG_RUNNING_DELAY_DAYS, type SubtopicSummary } from '../domain/selectors';
import type { Category, IssueGroup, Subtopic } from '../domain/types';

type HomeDashboardProps = {
  categories: Category[];
  subtopics: Subtopic[];
  summaries: SubtopicSummary[];
  longRunningIssues: IssueGroup[];
  selectedSubtopicId?: string;
  onSelectSubtopic: (subtopicId: string) => void;
  onSelectLongRunningIssue: (issue: IssueGroup) => void;
  onViewLongRunningIssues: () => void;
};

export function HomeDashboard({
  categories,
  subtopics,
  summaries,
  longRunningIssues,
  selectedSubtopicId,
  onSelectSubtopic,
  onSelectLongRunningIssue,
  onViewLongRunningIssues,
}: HomeDashboardProps) {
  const summaryBySubtopic = new Map(summaries.map((summary) => [summary.subtopic.id, summary]));
  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const subtopicById = new Map(subtopics.map((subtopic) => [subtopic.id, subtopic]));
  const categoryIconById = new Map([
    ['grade-product', '🧵'],
    ['investment-project', '📁'],
    ['equipment-test', '🧪'],
    ['system-operation', '🤝'],
  ]);
  const unresolvedByCategory = categories.map((category) => {
    const categorySubtopicIds = new Set(
      subtopics.filter((subtopic) => subtopic.categoryId === category.id).map((subtopic) => subtopic.id),
    );
    const count = summaries
      .filter((summary) => categorySubtopicIds.has(summary.subtopic.id))
      .reduce((total, summary) => total + summary.unresolvedCount, 0);
    return { category, count };
  });
  const maxUnresolved = Math.max(1, ...unresolvedByCategory.map((item) => item.count));

  return (
    <section className="home-grid" aria-label="이슈 종류 선택">
      <div className="home-main-panel">
        <div className="home-section-heading">
          <h2>카테고리별 현황</h2>
        </div>
        <div className="category-grid">
          {categories
            .slice()
            .sort((a, b) => a.order - b.order)
            .map((category) => {
              const categoryIcon = category.icon ?? categoryIconById.get(category.id) ?? '📌';

              return (
                <article className="category-card" key={category.id}>
                  <div className="category-card__header">
                    <div className="card-icon" aria-hidden="true">
                      <CategoryIcon icon={categoryIcon} />
                    </div>
                    <h2>{category.label}</h2>
                  </div>
                  <div className="subtopic-grid">
                    {subtopics
                      .filter((subtopic) => subtopic.categoryId === category.id && !subtopic.hidden)
                      .sort((a, b) => a.order - b.order)
                      .map((subtopic) => {
                        const summary = summaryBySubtopic.get(subtopic.id);
                        return (
                          <button
                            className={`subtopic-card ${selectedSubtopicId === subtopic.id ? 'is-selected' : ''}`}
                            key={subtopic.id}
                            type="button"
                            onClick={() => onSelectSubtopic(subtopic.id)}
                          >
                            <span className="subtopic-card__label">{subtopic.label}</span>
                            <span>최근 {summary?.latestDate ?? '-'}</span>
                            <strong aria-label={`미해결 ${summary?.unresolvedCount ?? 0}건`}>
                              미해결 <b>{summary?.unresolvedCount ?? 0}건</b>
                            </strong>
                          </button>
                        );
                      })}
                  </div>
                </article>
              );
            })}
        </div>
      </div>

      <aside className="side-panel" aria-label="장기 미해결 이슈">
        <div className="side-panel__title">
          <div>
            <h2>
              처리 지연 이슈
              <Info size={14} />
              <span className="side-panel__caption">{LONG_RUNNING_DELAY_DAYS}일 이상 미해결</span>
            </h2>
          </div>
          <button type="button" disabled={longRunningIssues.length === 0} onClick={onViewLongRunningIssues}>
            전체 보기
          </button>
        </div>
        <div className="long-running-list">
          {longRunningIssues.slice(0, 5).map((issue) => (
            <button
              className="long-running-card"
              key={issue.id}
              type="button"
              onClick={() => onSelectLongRunningIssue(issue)}
            >
              <strong>{getElapsedDays(issue.firstOccurredAt)}일</strong>
              <div>
                <b>{issue.title}</b>
                <span>{categoryById.get(issue.categoryId)?.label ?? '대분류'} &gt; {subtopicById.get(issue.subtopicId)?.label ?? issue.subtopicId}</span>
              </div>
              <p>
                발생일
                <time>{issue.firstOccurredAt}</time>
              </p>
            </button>
          ))}
          {longRunningIssues.length === 0 && <p className="empty-list">30일 이상 지연 중인 이슈가 없습니다.</p>}
        </div>

        <div className="mini-chart" aria-label="대분류별 미해결 현황">
          <div className="mini-chart__title">
            <h3>대분류별 미해결</h3>
            <span>단위: 건</span>
          </div>
          {unresolvedByCategory.map(({ category, count }) => (
            <div className="mini-chart__row" key={category.id}>
              <span>{category.label}</span>
              <div className="mini-chart__track">
                <i style={{ width: `${(count / maxUnresolved) * 100}%` }} />
              </div>
              <strong>{count}</strong>
            </div>
          ))}
        </div>
      </aside>
    </section>
  );
}

function CategoryIcon({ icon }: { icon: string }) {
  return <span>{icon}</span>;
}

function getElapsedDays(date: string) {
  const startedAt = new Date(`${date}T00:00:00+09:00`).getTime();
  const now = Date.now();
  return Math.max(1, Math.ceil((now - startedAt) / 86_400_000));
}
