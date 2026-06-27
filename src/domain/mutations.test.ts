import { describe, expect, it } from 'vitest';
import { deleteHistoryEntry } from './mutations';
import { seedData } from './seedData';

describe('board mutations', () => {
  it('deletes a history entry and recalculates issue/detail state from remaining rows', () => {
    const targetIssueId = 'issue-sts-430-surface';
    const rows = seedData.historyEntries
      .filter((entry) => entry.issueGroupId === targetIssueId)
      .sort((a, b) => b.date.localeCompare(a.date));
    const latest = rows[0];
    const previous = rows[1];

    const next = deleteHistoryEntry(seedData, latest.id);
    const nextIssue = next.issueGroups.find((issue) => issue.id === targetIssueId);
    const nextDetail = next.detailIssues.find((detailIssue) => detailIssue.id === previous.detailIssueId);

    expect(next.historyEntries.some((entry) => entry.id === latest.id)).toBe(false);
    expect(nextIssue?.latestUpdatedAt).toBe(previous.date);
    expect(nextIssue?.currentSummary).toBe(previous.summary);
    expect(nextIssue?.status).toBe(previous.status);
    expect(nextDetail?.latestUpdatedAt).toBe(previous.date);
  });

  it('leaves board data unchanged when the entry does not exist', () => {
    expect(deleteHistoryEntry(seedData, 'missing-entry')).toBe(seedData);
  });
});
