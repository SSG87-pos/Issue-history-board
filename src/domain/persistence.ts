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
  return parsed as IssueBoardData;
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
