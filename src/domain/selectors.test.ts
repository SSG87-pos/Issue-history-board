import { describe, expect, it } from 'vitest';
import { seedData } from './seedData';
import {
  getHistoryRowsForSubtopic,
  getGroupedTimeline,
  getLongRunningUnresolvedIssues,
  getRecommendedIssueGroups,
  getSubtopicSummaries,
} from './selectors';

describe('seedData', () => {
  it('contains editable category and subtopic master data', () => {
    expect(seedData.categories.map((category) => category.label)).toContain('강종/제품');
    expect(
      seedData.subtopics.filter((subtopic) => subtopic.categoryId === 'grade-product').map((subtopic) => subtopic.label),
    ).toContain('STS');
  });

  it('stores one issue group with multiple dated history entries', () => {
    const entries = seedData.historyEntries.filter((entry) => entry.issueGroupId === 'issue-sts-430-surface');

    expect(entries).toHaveLength(4);
    expect(entries.map((entry) => entry.date)).toEqual(['2026-01-01', '2026-01-10', '2026-01-22', '2026-02-04']);
  });
});

describe('timeline grouping and recommendations', () => {
  it('groups timeline entries by block name while preserving date order', () => {
    const groups = getGroupedTimeline(seedData, 'issue-sts-430-surface');

    expect(groups.map((group) => group.name)).toEqual(['발생 및 접수', '원인검토', '조치 및 검증']);
    expect(groups[2].entries.map((entry) => entry.date)).toEqual(['2026-01-22', '2026-02-04']);
  });

  it('recommends existing issue groups before creating a new issue', () => {
    const recommendations = getRecommendedIssueGroups(seedData, {
      categoryId: 'grade-product',
      subtopicId: 'sts',
      query: '430 표면',
    });

    expect(recommendations[0].id).toBe('issue-sts-430-surface');
  });

});

describe('selectors', () => {
  it('summarizes latest update and unresolved count for each subtopic', () => {
    const summaries = getSubtopicSummaries(seedData);
    const sts = summaries.find((summary) => summary.subtopic.id === 'sts');

    expect(sts?.latestDate).toBe('2026-06-20');
    expect(sts?.unresolvedCount).toBe(1);
  });

  it('returns date-based history rows for a subtopic newest first', () => {
    const rows = getHistoryRowsForSubtopic(seedData, 'sts');

    expect(rows.map((row) => row.entry.date)).toEqual([
      '2026-06-20',
      '2026-02-04',
      '2026-01-22',
      '2026-01-10',
      '2026-01-01',
    ]);
    expect(rows[0].issue.title).toBe('STS 내식성 시험 조건 이슈');
  });

  it('returns long-running unresolved issues oldest first', () => {
    const issues = getLongRunningUnresolvedIssues(seedData);

    expect(issues[0].id).toBe('issue-hpf-forming-delay');
    expect(issues.every((issue) => issue.status !== 'resolved')).toBe(true);
  });
});
