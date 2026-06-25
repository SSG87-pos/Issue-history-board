import type { HistoryEntry, IssueBoardData, IssueGroup, Subtopic } from './types';

const unresolvedStatuses = new Set<IssueGroup['status']>([
  'occurred',
  'cause_review',
  'actioning',
  'verification',
  'on_hold',
]);

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
    .filter((issue) => !issue.archived && unresolvedStatuses.has(issue.status))
    .sort((a, b) => a.firstOccurredAt.localeCompare(b.firstOccurredAt));
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

  const haystack = normalizeText([issue.title, issue.currentSummary, ...issue.tags].join(' '));
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

export function getRelatedIssueGroups(data: IssueBoardData, issueGroupId: string): IssueGroup[] {
  const current = data.issueGroups.find((issue) => issue.id === issueGroupId);
  if (!current) return [];

  const currentTags = new Set(current.tags);
  return data.issueGroups
    .filter((issue) => issue.id !== issueGroupId && !issue.archived)
    .map((issue) => {
      let score = 0;
      if (issue.categoryId === current.categoryId) score += 2;
      if (issue.subtopicId === current.subtopicId) score += 3;
      score += issue.tags.filter((tag) => currentTags.has(tag)).length * 2;
      return { issue, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || b.issue.latestUpdatedAt.localeCompare(a.issue.latestUpdatedAt))
    .map((item) => item.issue);
}
