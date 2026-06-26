export type IssueStatus = 'occurred' | 'cause_review' | 'actioning' | 'verification' | 'resolved' | 'on_hold';

export const STATUS_LABELS: Record<IssueStatus, string> = {
  occurred: '발생',
  cause_review: '원인검토',
  actioning: '조치중',
  verification: '검증',
  resolved: '해결',
  on_hold: '보류',
};

export type IssuePhase = 'received' | 'in_progress' | 'closed';

export const PHASE_LABELS: Record<IssuePhase, string> = {
  received: '접수',
  in_progress: '진행',
  closed: '종료',
};

export const STATUS_PHASES: Record<IssueStatus, IssuePhase> = {
  occurred: 'received',
  cause_review: 'in_progress',
  actioning: 'in_progress',
  verification: 'in_progress',
  resolved: 'closed',
  on_hold: 'in_progress',
};

export const PHASE_STATUS_OPTIONS: Record<IssuePhase, IssueStatus[]> = {
  received: ['occurred'],
  in_progress: ['cause_review', 'actioning', 'verification', 'on_hold'],
  closed: ['resolved'],
};

export const DEFAULT_STATUS_BY_PHASE: Record<IssuePhase, IssueStatus> = {
  received: 'occurred',
  in_progress: 'cause_review',
  closed: 'resolved',
};

export type IssueRecordType = 'meeting' | 'test' | 'analysis' | 'report' | 'action' | 'approval' | 'customer' | 'other';

export const RECORD_TYPE_LABELS: Record<IssueRecordType, string> = {
  meeting: '회의',
  test: '시험',
  analysis: '분석',
  report: '보고',
  action: '조치',
  approval: '승인',
  customer: '고객대응',
  other: '기타',
};

export type IssueGroupDisplayStatus = IssueStatus | 'resolution_candidate';

export type Category = {
  id: string;
  label: string;
  description: string;
  order: number;
  icon?: string;
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
  ownerResearchGroup?: string;
  relatedDepartment?: string;
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
  ownerResearchGroup?: string;
  relatedDepartment?: string;
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
  recordType?: IssueRecordType;
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
