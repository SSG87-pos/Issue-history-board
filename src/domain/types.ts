export type IssueStatus = 'occurred' | 'cause_review' | 'actioning' | 'verification' | 'resolved' | 'on_hold';

export const STATUS_LABELS: Record<IssueStatus, string> = {
  occurred: '발생',
  cause_review: '원인검토',
  actioning: '조치중',
  verification: '검증',
  resolved: '해결',
  on_hold: '보류',
};

export type IssueGroupDisplayStatus = IssueStatus | 'resolution_candidate';

export type Category = {
  id: string;
  label: string;
  description: string;
  order: number;
};

export type Subtopic = {
  id: string;
  categoryId: string;
  label: string;
  order: number;
  hidden?: boolean;
};

export type IssueGroup = {
  id: string;
  title: string;
  categoryId: string;
  subtopicId: string;
  status: IssueStatus;
  statusSource: 'auto' | 'manual';
  firstOccurredAt: string;
  latestUpdatedAt: string;
  currentSummary: string;
  tags: string[];
  groupLabel: string;
  groupColorTone: 'teal' | 'neutral' | 'green';
  ownerName?: string;
  relatedEquipment?: string;
  relatedCustomer?: string;
  priorityLabel?: string;
  sensitive: boolean;
  archived: boolean;
};

export type DetailIssue = {
  id: string;
  issueGroupId: string;
  title: string;
  status: IssueStatus;
  firstOccurredAt: string;
  latestUpdatedAt: string;
  currentSummary: string;
  tags: string[];
  relatedEquipment?: string;
  relatedCustomer?: string;
  priorityLabel?: string;
  ownerName?: string;
  completedAt?: string;
  completionNote?: string;
  needsReview?: boolean;
  archived: boolean;
};

export type HistoryEntry = {
  id: string;
  issueGroupId: string;
  detailIssueId: string;
  date: string;
  status: IssueStatus;
  changesDetailIssueStatus: boolean;
  summary: string;
  details: string;
  remainingRisk: string;
  nextCheckDate?: string;
  blockName?: string;
  referenceLinks: string[];
  authorName?: string;
  attachmentName?: string;
  attachmentSizeLabel?: string;
  createdAt: string;
  updatedAt: string;
};

export type IssueBoardData = {
  categories: Category[];
  subtopics: Subtopic[];
  issueGroups: IssueGroup[];
  detailIssues: DetailIssue[];
  historyEntries: HistoryEntry[];
};
