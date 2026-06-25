import { Info } from 'lucide-react';
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
  const categoryEmojiById = new Map([
    ['grade-product', '🧱'],
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
          <p>대분류 &gt; 하위 주제 별 최근 이슈 및 미해결 현황</p>
        </div>
        <div className="category-grid">
          {categories
            .slice()
            .sort((a, b) => a.order - b.order)
            .map((category) => {
              const categoryEmoji = categoryEmojiById.get(category.id) ?? '📌';

              return (
                <article className="category-card" key={category.id}>
                  <div className="category-card__header">
                    <div className="card-icon" aria-hidden="true">
                      <span>{categoryEmoji}</span>
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
          <h2>
            오래 열린 미해결
            <Info size={14} />
          </h2>
          <button type="button">전체 보기</button>
        </div>
        <div className="long-running-list">
          {longRunningIssues.slice(0, 5).map((issue) => (
            <div className="long-running-card" key={issue.id}>
              <strong>{getElapsedDays(issue.firstOccurredAt)}일</strong>
              <div>
                <b>{issue.title}</b>
                <span>{issue.categoryId === 'grade-product' ? '강종/제품' : '대분류'} &gt; {issue.subtopicId.toUpperCase()}</span>
              </div>
              <p>
                발생일
                <time>{issue.firstOccurredAt}</time>
              </p>
            </div>
          ))}
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

function getElapsedDays(date: string) {
  const startedAt = new Date(`${date}T00:00:00+09:00`).getTime();
  const now = Date.now();
  return Math.max(1, Math.ceil((now - startedAt) / 86_400_000));
}
