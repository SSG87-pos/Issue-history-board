import type { HistoryEntry, IssueBoardData, IssueGroup, Subtopic } from './types';

const unresolvedStatuses = new Set<IssueGroup['status']>([
  'occurred',
  'cause_review',
  'actioning',
  'verification',
  'on_hold',
]);
export const LONG_RUNNING_DELAY_DAYS = 30;

export type SubtopicSummary = {
  subtopic: Subtopic;
  latestDate?: string;
  unresolvedCount: number;
};

export type HistoryRow = {
  entry: HistoryEntry;
  issue: IssueGroup;
};

export function getSubtopicSummaries(data: IssueBoardData): SubtopicSummary[] {
  return data.subtopics
    .filter((subtopic) => !subtopic.hidden)
    .sort((a, b) => a.order - b.order)
    .map((subtopic) => {
      const issueGroups = data.issueGroups.filter((issue) => issue.subtopicId === subtopic.id && !issue.archived);
      const dates = issueGroups.flatMap((issue) =>
        data.historyEntries.filter((entry) => entry.issueGroupId === issue.id).map((entry) => entry.date),
      );

      return {
        subtopic,
        latestDate: dates.sort((a, b) => b.localeCompare(a))[0],
        unresolvedCount: issueGroups.filter((issue) => unresolvedStatuses.has(issue.status)).length,
      };
    });
}

export function getHistoryRowsForSubtopic(data: IssueBoardData, subtopicId: string): HistoryRow[] {
  const issueById = new Map(data.issueGroups.map((issue) => [issue.id, issue]));

  return data.historyEntries
    .map((entry) => {
      const issue = issueById.get(entry.issueGroupId);
      return issue ? { entry, issue } : undefined;
    })
    .filter((row): row is HistoryRow => Boolean(row && row.issue.subtopicId === subtopicId && !row.issue.archived))
    .sort((a, b) => b.entry.date.localeCompare(a.entry.date));
}

export function getLongRunningUnresolvedIssues(data: IssueBoardData): IssueGroup[] {
  return data.issueGroups
    .filter(
      (issue) =>
        !issue.archived &&
        unresolvedStatuses.has(issue.status) &&
        getElapsedDays(issue.firstOccurredAt) >= LONG_RUNNING_DELAY_DAYS,
    )
    .sort((a, b) => a.firstOccurredAt.localeCompare(b.firstOccurredAt));
}

function getElapsedDays(date: string) {
  const startedAt = new Date(`${date}T00:00:00+09:00`).getTime();
  const now = Date.now();
  return Math.max(1, Math.ceil((now - startedAt) / 86_400_000));
}

export function getDetailIssuesForGroup(data: IssueBoardData, issueGroupId: string) {
  return data.detailIssues
    .filter((detailIssue) => detailIssue.issueGroupId === issueGroupId && !detailIssue.archived)
    .sort((a, b) => b.latestUpdatedAt.localeCompare(a.latestUpdatedAt));
}

export function getHistoryEntriesForDetailIssue(data: IssueBoardData, detailIssueId: string) {
  return data.historyEntries
    .filter((entry) => entry.detailIssueId === detailIssueId)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export type TimelineGroup = {
  name: string;
  entries: HistoryEntry[];
};

export type RecommendationInput = {
  categoryId: string;
  subtopicId: string;
  query: string;
};

function normalizeText(value: string): string {
  return value.replace(/\s+/g, '').toLowerCase();
}

function scoreIssue(issue: IssueGroup, query: string): number {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return 0;

  const haystack = normalizeText([
    issue.title,
    issue.currentSummary,
    issue.groupLabel,
    issue.ownerName,
    issue.ownerResearchGroup,
    issue.relatedDepartment,
    issue.relatedEquipment,
    issue.relatedCustomer,
    issue.priorityLabel,
    ...issue.tags,
  ].join(' '));
  let score = 0;
  for (const token of normalizedQuery.match(/.{1,2}/g) ?? []) {
    if (haystack.includes(token)) score += 1;
  }
  if (haystack.includes(normalizedQuery)) score += 10;
  return score;
}

export function getGroupedTimeline(data: IssueBoardData, issueGroupId: string): TimelineGroup[] {
  const entries = data.historyEntries
    .filter((entry) => entry.issueGroupId === issueGroupId)
    .sort((a, b) => a.date.localeCompare(b.date));

  const groups: TimelineGroup[] = [];
  for (const entry of entries) {
    const name = entry.blockName || '기타';
    const lastGroup = groups[groups.length - 1];
    if (lastGroup?.name === name) {
      lastGroup.entries.push(entry);
    } else {
      groups.push({ name, entries: [entry] });
    }
  }
  return groups;
}

export function getRecommendedIssueGroups(data: IssueBoardData, input: RecommendationInput): IssueGroup[] {
  return data.issueGroups
    .filter((issue) => issue.categoryId === input.categoryId && issue.subtopicId === input.subtopicId && !issue.archived)
    .map((issue) => ({ issue, score: scoreIssue(issue, input.query) }))
    .sort((a, b) => b.score - a.score || b.issue.latestUpdatedAt.localeCompare(a.issue.latestUpdatedAt))
    .map(({ issue }) => issue);
}
