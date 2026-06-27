import {
  PHASE_STATUS_OPTIONS,
  RECORD_TYPE_LABELS,
  STATUS_LABELS,
  STATUS_PHASES,
  type IssuePhase,
  type IssueBoardData,
  type IssueRecordType,
  type IssueStatus,
} from './types';

const ALL_STATUSES = Object.keys(STATUS_LABELS) as IssueStatus[];
const ALL_RECORD_TYPES = Object.keys(RECORD_TYPE_LABELS) as IssueRecordType[];

export function getStatusLabels(data?: Pick<IssueBoardData, 'settings'>): Record<IssueStatus, string> {
  return {
    ...STATUS_LABELS,
    ...Object.fromEntries(getCustomStatuses(data).map((status) => [status.id, status.label])),
    ...compactLabels(data?.settings?.statusLabels),
  } as Record<IssueStatus, string>;
}

export function getRecordTypeLabels(data?: Pick<IssueBoardData, 'settings'>): Record<IssueRecordType, string> {
  return {
    ...RECORD_TYPE_LABELS,
    ...Object.fromEntries(getCustomRecordTypes(data).map((type) => [type.id, type.label])),
    ...compactLabels(data?.settings?.recordTypeLabels),
  } as Record<IssueRecordType, string>;
}

export function getStatusLabel(data: Pick<IssueBoardData, 'settings'> | undefined, status: IssueStatus): string {
  return getStatusLabels(data)[status];
}

export function getRecordTypeLabel(data: Pick<IssueBoardData, 'settings'> | undefined, type: IssueRecordType): string {
  return getRecordTypeLabels(data)[type];
}

export function getOrderedStatuses(data?: Pick<IssueBoardData, 'settings'>): IssueStatus[] {
  return orderedValues([...ALL_STATUSES, ...getCustomStatuses(data).map((status) => status.id)], data?.settings?.statusOrder);
}

export function getStatusOptionsForPhase(
  data: Pick<IssueBoardData, 'settings'> | undefined,
  phase: IssuePhase,
  includeStatus?: IssueStatus,
): IssueStatus[] {
  const allowedStatuses = getOrderedStatuses(data);
  const hidden = new Set(validValues(allowedStatuses, data?.settings?.hiddenStatuses));
  const ordered = getOrderedStatuses(data).filter((status) => getStatusPhase(data, status) === phase);
  const visible = ordered.filter((status) => !hidden.has(status));
  if (includeStatus && getStatusPhase(data, includeStatus) === phase && !visible.includes(includeStatus)) {
    visible.push(includeStatus);
  }
  return visible.length > 0 ? visible : PHASE_STATUS_OPTIONS[phase];
}

export function getOrderedRecordTypes(data?: Pick<IssueBoardData, 'settings'>): IssueRecordType[] {
  return orderedValues([...ALL_RECORD_TYPES, ...getCustomRecordTypes(data).map((type) => type.id)], data?.settings?.recordTypeOrder);
}

export function getRecordTypeOptions(
  data?: Pick<IssueBoardData, 'settings'>,
  includeRecordType?: IssueRecordType,
): IssueRecordType[] {
  const allowedRecordTypes = getOrderedRecordTypes(data);
  const hidden = new Set(validValues(allowedRecordTypes, data?.settings?.hiddenRecordTypes));
  const visible = getOrderedRecordTypes(data).filter((recordType) => !hidden.has(recordType));
  if (includeRecordType && !visible.includes(includeRecordType)) visible.push(includeRecordType);
  return visible.length > 0 ? visible : ALL_RECORD_TYPES;
}

export function getCustomStatuses(data?: Pick<IssueBoardData, 'settings'>) {
  const seen = new Set<string>();
  return (data?.settings?.customStatuses ?? [])
    .map((status) => ({
      ...status,
      label: status.label.trim(),
      phase: status.phase,
    }))
    .filter((status) => {
      if (!status.label || seen.has(status.id)) return false;
      seen.add(status.id);
      return true;
    });
}

export function getCustomRecordTypes(data?: Pick<IssueBoardData, 'settings'>) {
  const seen = new Set<string>();
  return (data?.settings?.customRecordTypes ?? [])
    .map((type) => ({ ...type, label: type.label.trim() }))
    .filter((type) => {
      if (!type.label || seen.has(type.id)) return false;
      seen.add(type.id);
      return true;
    });
}

export function getStatusPhase(data: Pick<IssueBoardData, 'settings'> | undefined, status: IssueStatus): IssuePhase {
  if (status in STATUS_PHASES) return STATUS_PHASES[status as keyof typeof STATUS_PHASES];
  return getCustomStatuses(data).find((item) => item.id === status)?.phase ?? 'in_progress';
}

export function getIssueLabelOptions(data: IssueBoardData): string[] {
  const labels = new Set<string>();
  const configuredLabels: string[] = [];
  for (const label of data.settings?.labelOptions ?? []) {
    const trimmed = label.trim();
    if (!trimmed || labels.has(trimmed)) continue;
    labels.add(trimmed);
    configuredLabels.push(trimmed);
  }
  const issueLabels: string[] = [];
  for (const issue of data.issueGroups) {
    const trimmed = issue.groupLabel.trim();
    if (!trimmed || labels.has(trimmed)) continue;
    labels.add(trimmed);
    issueLabels.push(trimmed);
  }
  return [...configuredLabels, ...issueLabels.sort((a, b) => a.localeCompare(b, 'ko'))];
}

function compactLabels<T extends string>(labels: Partial<Record<T, string>> | undefined): Partial<Record<T, string>> {
  if (!labels) return {};
  return Object.fromEntries(
    Object.entries(labels)
      .map(([key, value]) => [key, typeof value === 'string' ? value.trim() : ''])
      .filter(([, value]) => value),
  ) as Partial<Record<T, string>>;
}

function orderedValues<T extends string>(defaults: T[], configured: T[] | undefined): T[] {
  const ordered = validValues(defaults, configured);
  for (const value of defaults) {
    if (!ordered.includes(value)) ordered.push(value);
  }
  return ordered;
}

function validValues<T extends string>(defaults: T[], values: T[] | undefined): T[] {
  if (!values) return [];
  return values.filter((value, index) => defaults.includes(value) && values.indexOf(value) === index);
}
