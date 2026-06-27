import { seedData } from './seedData';
import type { IssueBoardData } from './types';

export const STORAGE_KEY = 'research-issue-board-data';

export function serializeBoardData(data: IssueBoardData): string {
  return JSON.stringify(data, null, 2);
}

export function deserializeBoardData(json: string): IssueBoardData {
  const parsed = JSON.parse(json) as Partial<IssueBoardData>;
  if (
    !Array.isArray(parsed.categories) ||
    !Array.isArray(parsed.subtopics) ||
    !Array.isArray(parsed.issueGroups) ||
    !Array.isArray(parsed.detailIssues) ||
    !Array.isArray(parsed.historyEntries)
  ) {
    throw new Error('Invalid issue board data');
  }
  return normalizeBoardData(parsed as IssueBoardData);
}

function getDefaultStorage(): Storage | undefined {
  return typeof window === 'undefined' ? undefined : window.localStorage;
}

export function loadBoardData(storage: Storage | undefined = getDefaultStorage()): IssueBoardData {
  const raw = storage?.getItem(STORAGE_KEY);
  if (!raw) return seedData;

  try {
    return deserializeBoardData(raw);
  } catch {
    return seedData;
  }
}

export function saveBoardData(data: IssueBoardData, storage: Storage | undefined = getDefaultStorage()): void {
  storage?.setItem(STORAGE_KEY, serializeBoardData(data));
}

export function resetBoardData(storage: Storage | undefined = getDefaultStorage()): IssueBoardData {
  storage?.removeItem(STORAGE_KEY);
  return seedData;
}

function normalizeBoardData(data: IssueBoardData): IssueBoardData {
  const categoryIdMap = new Map([['customer-quality', 'system-operation']]);
  const subtopicIdMap = new Map([
    ['customer-claim', 'operation-standard'],
    ['quality-deviation', 'approval-review'],
    ['certification-standard', 'data-security'],
    ['mass-production', 'collaboration-process'],
  ]);

  const normalized: IssueBoardData = {
    categories: data.categories.map((category) =>
      categoryIdMap.has(category.id)
        ? {
            ...category,
            id: 'system-operation',
            label: '제도/운영',
            description: '운영 기준, 승인 체계, 협업 절차 관련 이슈',
          }
        : category,
    ),
    subtopics: data.subtopics.map((subtopic) => {
      const nextId = subtopicIdMap.get(subtopic.id);
      if (!nextId) return subtopic;
      const seedSubtopic = seedData.subtopics.find((item) => item.id === nextId);
      return {
        ...subtopic,
        id: nextId,
        categoryId: 'system-operation',
        label: seedSubtopic?.label ?? subtopic.label,
      };
    }),
    issueGroups: data.issueGroups.map((issue) => ({
      ...issue,
      categoryId: categoryIdMap.get(issue.categoryId) ?? issue.categoryId,
      subtopicId: subtopicIdMap.get(issue.subtopicId) ?? issue.subtopicId,
    })),
    detailIssues: data.detailIssues,
    historyEntries: data.historyEntries.map((entry) => ({
      ...entry,
      referenceLinks: Array.isArray(entry.referenceLinks) ? entry.referenceLinks : [],
    })),
    settings: data.settings
      ? {
          ...data.settings,
          labelOptions: Array.isArray(data.settings.labelOptions) ? [...data.settings.labelOptions] : undefined,
          recordTypeLabels: data.settings.recordTypeLabels ? { ...data.settings.recordTypeLabels } : undefined,
          recordTypeOrder: Array.isArray(data.settings.recordTypeOrder) ? [...data.settings.recordTypeOrder] : undefined,
          hiddenRecordTypes: Array.isArray(data.settings.hiddenRecordTypes) ? [...data.settings.hiddenRecordTypes] : undefined,
          statusLabels: data.settings.statusLabels ? { ...data.settings.statusLabels } : undefined,
          statusOrder: Array.isArray(data.settings.statusOrder) ? [...data.settings.statusOrder] : undefined,
          hiddenStatuses: Array.isArray(data.settings.hiddenStatuses) ? [...data.settings.hiddenStatuses] : undefined,
        }
      : undefined,
  };

  for (const seedCategory of seedData.categories) {
    if (!normalized.categories.some((category) => category.id === seedCategory.id)) {
      normalized.categories.push(seedCategory);
    }
  }

  for (const seedSubtopic of seedData.subtopics) {
    if (!normalized.subtopics.some((subtopic) => subtopic.id === seedSubtopic.id)) {
      normalized.subtopics.push(seedSubtopic);
    }
  }

  return normalized;
}
