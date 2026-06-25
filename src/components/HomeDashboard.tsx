import { AlertCircle, Layers3 } from 'lucide-react';
import type { SubtopicSummary } from '../domain/selectors';
import type { Category, IssueGroup, Subtopic } from '../domain/types';

type HomeDashboardProps = {
  categories: Category[];
  subtopics: Subtopic[];
  summaries: SubtopicSummary[];
  longRunningIssues: IssueGroup[];
  selectedSubtopicId?: string;
  onSelectSubtopic: (subtopicId: string) => void;
};

export function HomeDashboard({
  categories,
  subtopics,
  summaries,
  longRunningIssues,
  selectedSubtopicId,
  onSelectSubtopic,
}: HomeDashboardProps) {
  const summaryBySubtopic = new Map(summaries.map((summary) => [summary.subtopic.id, summary]));
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
      <div className="category-grid">
        {categories
          .slice()
          .sort((a, b) => a.order - b.order)
          .map((category) => (
            <article className="category-card" key={category.id}>
              <div className="category-card__header">
                <div className="card-icon" aria-hidden="true">
                  <Layers3 size={18} />
                </div>
                <div>
                  <h2>{category.label}</h2>
                  <p>{category.description}</p>
                </div>
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
                        <strong>미해결 {summary?.unresolvedCount ?? 0}건</strong>
                      </button>
                    );
                  })}
              </div>
            </article>
          ))}
      </div>

      <aside className="side-panel" aria-label="장기 미해결 이슈">
        <div className="side-panel__title">
          <AlertCircle size={18} />
          <h2>오래 열린 미해결</h2>
        </div>
        <div className="long-running-list">
          {longRunningIssues.slice(0, 5).map((issue) => (
            <div className="long-running-card" key={issue.id}>
              <strong>{issue.title}</strong>
              <span>최초 {issue.firstOccurredAt}</span>
              <p>{issue.currentSummary}</p>
            </div>
          ))}
        </div>

        <div className="mini-chart" aria-label="대분류별 미해결 현황">
          <h3>대분류별 미해결</h3>
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
