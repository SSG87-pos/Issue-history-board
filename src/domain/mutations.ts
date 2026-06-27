import type { DetailIssue, HistoryEntry, IssueBoardData, IssueGroup } from './types';

export function deleteHistoryEntry(data: IssueBoardData, entryId: string): IssueBoardData {
  const entryToDelete = data.historyEntries.find((entry) => entry.id === entryId);
  if (!entryToDelete) return data;

  const historyEntries = data.historyEntries.filter((entry) => entry.id !== entryId);
  const issueGroups = data.issueGroups.map((issue) =>
    issue.id === entryToDelete.issueGroupId ? recalculateIssueGroup(issue, historyEntries) : issue,
  );
  const detailIssues = data.detailIssues.map((detailIssue) =>
    detailIssue.id === entryToDelete.detailIssueId ? recalculateDetailIssue(detailIssue, historyEntries) : detailIssue,
  );

  return {
    ...data,
    issueGroups,
    detailIssues,
    historyEntries,
  };
}

function recalculateIssueGroup(issue: IssueGroup, entries: HistoryEntry[]): IssueGroup {
  const latest = getLatestEntry(entries.filter((entry) => entry.issueGroupId === issue.id));
  if (!latest) {
    return {
      ...issue,
      archived: true,
    };
  }

  return {
    ...issue,
    latestUpdatedAt: latest.date,
    currentSummary: latest.summary,
    status: latest.changesDetailIssueStatus ? latest.status : issue.status,
    statusSource: latest.changesDetailIssueStatus ? 'auto' : issue.statusSource,
  };
}

function recalculateDetailIssue(detailIssue: DetailIssue, entries: HistoryEntry[]): DetailIssue {
  const latest = getLatestEntry(entries.filter((entry) => entry.detailIssueId === detailIssue.id));
  if (!latest) {
    return {
      ...detailIssue,
      archived: true,
    };
  }

  return {
    ...detailIssue,
    latestUpdatedAt: latest.date,
    currentSummary: latest.summary,
    status: latest.changesDetailIssueStatus ? latest.status : detailIssue.status,
    completedAt: latest.status === 'resolved' ? latest.date : detailIssue.completedAt,
  };
}

function getLatestEntry(entries: HistoryEntry[]): HistoryEntry | undefined {
  return entries.slice().sort((a, b) => b.date.localeCompare(a.date))[0];
}
